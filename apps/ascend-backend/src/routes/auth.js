import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { query } from '../lib/shared-db.js';
import { createToken, setSSOCookie, clearSSOCookie } from '../lib/shared-auth.js';
import { logger } from '../middleware/requestLogger.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import { initUser } from '../config/database.js';
import { cacheGet, cacheSet, cacheDel } from '../services/redis.js';

// CSRF nonce: stored in Redis (primary) and cookie (fallback).
// Redis-primary avoids browsers dropping the cookie during OAuth bounces
// (Chrome Bounce Tracking Mitigation / Safari ITP treat the backend as a
// short-lived bounce domain and may block the cookie on the return leg).
const OAUTH_STATE_COOKIE = 'cariara_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 min — covers slow user
const OAUTH_STATE_MAX_AGE_SEC = 600;

// Desktop OAuth PKCE: exchange record TTL. 180s (was 60) so the poll fallback
// has a window to pick up the result even if the user is slow in the browser.
const DESKTOP_EXCHANGE_CODE_TTL_SEC = 180;
const DESKTOP_EXCHANGE_CODE_PREFIX = 'desktop_xchg:';
// Poll fallback: the same exchange record keyed by desktop state, so the app
// can retrieve the JWT by polling with {state, verifier} when the camora://
// deep link never fires (unreliable protocol handoff on some Windows setups).
const DESKTOP_EXCHANGE_STATE_PREFIX = 'desktop_xchg_state:';

function safeEq(a, b) {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
  || (process.env.NODE_ENV === 'production'
    ? 'https://capra-backend.up.railway.app/api/auth/google/callback'
    : 'http://localhost:3009/api/auth/google/callback');
const FRONTEND_URL = process.env.FRONTEND_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://capra.cariara.com'
    : 'http://localhost:5173');

/**
 * GET /api/auth/google/login — Redirect to Google OAuth
 *
 * Query params (browser flow):
 *   - redirect: returnTo path after login
 *
 * Query params (desktop flow via RFC 8252 PKCE):
 *   - dc: PKCE code challenge (base64url(sha256(verifier)))
 *   - ds: desktop state (opaque string Electron provides, returned in xchg code)
 *
 * For desktop flow, the state param embeds `ds` so the callback can route
 * to the desktop exchange flow instead of setting SSO cookie.
 */
router.get('/google/login', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  const isDesktopFlow = !!req.query.dc; // PKCE challenge signals desktop
  const pkceChallenge = String(req.query.dc || '').slice(0, 100);
  const desktopState = String(req.query.ds || '').slice(0, 100);

  // Cap and sanitize returnTo — only relative paths starting with /
  let returnTo = String(req.query.redirect || '/').slice(0, 200);
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) returnTo = '/';

  // Generate CSRF nonce — stored in Redis (primary) and cookie (fallback)
  const nonce = randomBytes(24).toString('base64url');

  // For desktop flow, also store the PKCE challenge in Redis so the callback
  // can later validate the verifier against it. Redis key:
  // `oauth_desktop_challenge:<nonce>` → { challenge, state, issuedAt }
  const issuedAt = Date.now();

  if (isDesktopFlow && pkceChallenge) {
    try {
      const desktopMetadata = JSON.stringify({
        challenge: pkceChallenge,
        state: desktopState,
        issuedAt,
      });
      await cacheSet(
        `oauth_desktop_challenge:${nonce}`,
        desktopMetadata,
        OAUTH_STATE_MAX_AGE_SEC
      );
      logger.info(
        { ip: req.ip, hasChallenge: !!pkceChallenge },
        '[oauth-desktop] PKCE challenge stored'
      );
    } catch (err) {
      logger.warn(
        { error: err.message },
        '[oauth-desktop] Failed to store PKCE challenge in Redis (continuing with cookie-only fallback)'
      );
    }
  }

  // Redis-primary: survives browser cookie-blocking in OAuth bounces
  try {
    await cacheSet(`oauth_nonce:${nonce}`, '1', OAUTH_STATE_MAX_AGE_SEC);
  } catch { /* Redis unavailable — cookie-only fallback */ }

  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: '/',
  });

  // Embed an issued-at timestamp in state so the callback can reject
  // stale callbacks even if the browser somehow held onto the state
  // cookie past its maxAge (defense-in-depth on top of cookie expiry).
  // For desktop flow, append a "desktop:" prefix so callback routing works.
  const statePrefix = isDesktopFlow ? 'desktop:' : '';
  const state = `${statePrefix}${nonce}:${issuedAt}:${returnTo}`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * GET /api/auth/google/callback — Handle Google OAuth callback
 *
 * Routes to different flows based on state prefix:
 *   - Browser flow (default): state starts with `<nonce>:` → sets SSO cookie, redirects to frontend
 *   - Desktop flow: state starts with `desktop:` → returns one-time xchg code, renders interstitial HTML
 */
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

  // Detect desktop flow by state prefix
  const isDesktopFlow = typeof state === 'string' && state.startsWith('desktop:');
  const stateWithoutPrefix = isDesktopFlow ? state.slice('desktop:'.length) : state;

  // CSRF check — state shape is `<nonce>:<issuedAt>:<returnTo>`. Nonce must
  // match the cookie, and issuedAt must be within OAUTH_STATE_MAX_AGE_MS so
  // a replay attempt with an old (cookie-still-present) state fails closed.
  // Backwards-compatible:
  //   - legacy two-segment shape `<nonce>:<returnTo>` (no timestamp) is
  //     accepted but logged so we can spot stragglers
  //   - legacy bare-path state from the very old flow is rejected outright
  let nonce = '';
  let issuedAt = 0;
  let returnToFromState = '/';
  if (typeof stateWithoutPrefix === 'string' && stateWithoutPrefix.includes(':')) {
    const parts = stateWithoutPrefix.split(':');
    if (parts.length >= 3 && /^\d+$/.test(parts[1])) {
      // New shape — nonce:timestamp:returnTo (returnTo may itself contain ':')
      nonce = parts[0];
      issuedAt = Number(parts[1]);
      returnToFromState = parts.slice(2).join(':');
    } else {
      // Legacy two-segment shape — accept but record for telemetry
      const idx = stateWithoutPrefix.indexOf(':');
      nonce = stateWithoutPrefix.slice(0, idx);
      returnToFromState = stateWithoutPrefix.slice(idx + 1);
      logger.info({ ip: req.ip }, '[oauth] legacy two-segment state accepted');
    }
  } else if (typeof stateWithoutPrefix === 'string' && stateWithoutPrefix.startsWith('/')) {
    // Legacy flow — fail closed.
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    return res.redirect(`${FRONTEND_URL}?error=oauth_state_legacy`);
  }
  // Validate nonce: Redis primary (browser-cookie-independent), cookie fallback
  let nonceValid = false;
  let desktopMetadata = null;

  if (nonce) {
    try {
      const stored = await cacheGet(`oauth_nonce:${nonce}`);
      if (stored !== null) {
        await cacheDel(`oauth_nonce:${nonce}`); // one-time use
        nonceValid = true;
      }
    } catch { /* Redis unavailable — fall through to cookie */ }
  }

  // For desktop flow, also retrieve and validate PKCE challenge
  if (isDesktopFlow && nonce) {
    try {
      const metadataStr = await cacheGet(`oauth_desktop_challenge:${nonce}`);
      if (metadataStr) {
        desktopMetadata = JSON.parse(metadataStr);
        await cacheDel(`oauth_desktop_challenge:${nonce}`); // one-time use
      }
    } catch (err) {
      logger.warn(
        { error: err.message },
        '[oauth-desktop] Failed to retrieve PKCE challenge from Redis'
      );
    }
  }

  if (!nonceValid) {
    // Cookie fallback: used when Redis is down or nonce wasn't stored yet
    const cookieNonce = req.cookies?.[OAUTH_STATE_COOKIE];
    if (!nonce || !cookieNonce || !safeEq(nonce, cookieNonce)) {
      res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
      logger.warn({ ip: req.ip }, '[oauth] state nonce mismatch — possible CSRF attempt');
      return res.redirect(`${FRONTEND_URL}?error=oauth_state_invalid`);
    }
    nonceValid = true;
  }
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  // Reject states older than the cookie's stated max age. issuedAt=0
  // means we accepted a legacy two-segment state — skip the age check
  // for backwards compatibility.
  if (issuedAt > 0 && Date.now() - issuedAt > OAUTH_STATE_MAX_AGE_MS) {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    logger.warn({ ip: req.ip, ageMs: Date.now() - issuedAt }, '[oauth] state expired');
    return res.redirect(`${FRONTEND_URL}?error=oauth_state_expired`);
  }
  let returnTo = returnToFromState;
  // Prevent open redirect (e.g., //../evil.com or //evil.com)
  if (!returnTo.startsWith('/') || returnTo.includes('://') || returnTo.startsWith('//') || returnTo.includes('\\')) returnTo = '/';
  if (!code) return res.redirect(`${FRONTEND_URL}?error=no_code`);

  // SECURITY: Validate code parameter
  if (typeof code !== 'string' || code.length > 2048 || !/^[a-zA-Z0-9\/_\-\.]+$/.test(code)) {
    return res.redirect(`${FRONTEND_URL}?error=invalid_code`);
  }

  // SECURITY: Ensure Google OAuth is configured
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    logger.error('Google OAuth not configured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return res.redirect(`${FRONTEND_URL}?error=oauth_not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResp.json();
    if (!tokens.access_token) throw new Error('No access token');

    // Get user info
    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const gUser = await userResp.json();
    if (!gUser.email) throw new Error('No email from Google');

    // Find or create user in shared users table
    let userResult = await query('SELECT id, onboarding_completed FROM users WHERE email = $1', [gUser.email]);
    let userId;
    let onboardingCompleted = false;

    if (userResult.rows.length === 0) {
      // Create new user in shared users table
      const insertResult = await query(
        'INSERT INTO users (email, name, image, provider, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
        [gUser.email, gUser.name || gUser.email, gUser.picture || null, 'google']
      );
      userId = insertResult.rows[0].id;

      // Generate referral code for new user. Crypto-random because referral
      // codes grant the holder real value (free credits) — Math.random()
      // would have been predictable enough for an attacker who collects a
      // few codes to start guessing future ones.
      const refCode = randomBytes(6).toString('base64url').slice(0, 8);
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [refCode, userId]);
    } else {
      userId = userResult.rows[0].id;
      onboardingCompleted = userResult.rows[0].onboarding_completed || false;
    }

    // Update last login time and refresh Google profile picture on every login
    await query(
      'UPDATE users SET last_login_at = NOW(), image = COALESCE($2, image) WHERE id = $1',
      [userId, gUser.picture || null]
    );

    // Initialize Ascend data (subscription, credits, free usage)
    try {
      await initUser(userId);
    } catch (initErr) {
      // Non-fatal — user can still log in
      logger.warn({ error: initErr.message, userId }, 'Failed to init Ascend user data');
    }

    // Capture user location from IP (non-blocking)
    (async () => {
      try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || req.headers['x-real-ip']
          || req.headers['cf-connecting-ip']
          || req.ip;
        console.log(`[GeoIP] User ${gUser.email} login IP: ${ip}, headers: x-forwarded-for=${req.headers['x-forwarded-for']}, x-real-ip=${req.headers['x-real-ip']}`);

        if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')) {
          console.log('[GeoIP] Private/local IP, skipping');
          return;
        }

        // Privacy (AUTH-NEW-004): third-party IP geolocation sends the user's
        // real IP to ipapi.co on every login. Make it opt-in — default OFF so
        // we don't transmit PII to an external service without explicit
        // operator consent. Set ENABLE_LOGIN_GEOIP=true to re-enable.
        if (process.env.ENABLE_LOGIN_GEOIP !== 'true') {
          return;
        }

        // ipapi.co (HTTPS) — formerly ip-api.com first, but plaintext
        // HTTP transmits the user's real IP in cleartext on every login,
        // which is a privacy regression and a security audit flag.
        let loc = null;
        try {
          const r = await fetch(`https://ipapi.co/${ip}/json/`);
          const geo = await r.json();
          console.log('[GeoIP] ipapi.co response:', JSON.stringify(geo));
          if (geo.city || geo.country_name) {
            loc = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
          }
        } catch (e) {
          console.log('[GeoIP] ipapi.co failed:', e.message);
        }

        if (loc) {
          await query('UPDATE users SET location = $1 WHERE id = $2', [loc, userId]);
          console.log(`[GeoIP] Updated location for ${gUser.email}: ${loc}`);
        } else {
          console.log(`[GeoIP] Could not determine location for IP: ${ip}`);
        }
      } catch (e) {
        console.error('[GeoIP] Error:', e.message);
      }
    })();

    // Read user's current token generation so the JWT can be revoked later
    // by bumping the generation column (logout-all-sessions flow).
    const genResult = await query('SELECT token_generation FROM users WHERE id = $1', [userId]);
    const tokenGeneration = genResult.rows[0]?.token_generation || 1;

    // Issue JWT via shared-auth
    const accessToken = createToken(
      {
        sub: userId,
        email: gUser.email,
        name: gUser.name || '',
        picture: gUser.picture || '',
        type: 'access',
        gen: tokenGeneration,
      },
      '30d'
    );

    // ROUTE: Desktop flow vs. Browser flow
    if (isDesktopFlow) {
      // Desktop flow: generate one-time exchange code for Electron to use
      const exchangeCode = randomBytes(32).toString('base64url');
      const exchangeKey = `${DESKTOP_EXCHANGE_CODE_PREFIX}${exchangeCode}`;

      // Store: { jwt, email, picture } — everything Electron needs for the exchange
      // Bind the PKCE challenge (captured at login, retrieved above as
      // desktopMetadata) to the exchange record so /desktop/exchange can verify
      // sha256(verifier) against it. Empty when the login wasn't PKCE-initiated
      // or Redis was unavailable — the exchange endpoint fails closed in that case.
      const exchangeData = JSON.stringify({
        access_token: accessToken,
        email: gUser.email,
        picture: gUser.picture || '',
        name: gUser.name || '',
        pkce_challenge: desktopMetadata?.challenge || '',
      });

      try {
        await cacheSet(exchangeKey, exchangeData, DESKTOP_EXCHANGE_CODE_TTL_SEC);
        // Also key by desktop state so the app's poll fallback can retrieve the
        // result without the camora:// deep link. Best-effort — the deep-link
        // path still works if this write fails.
        if (desktopMetadata?.state) {
          await cacheSet(
            `${DESKTOP_EXCHANGE_STATE_PREFIX}${desktopMetadata.state}`,
            exchangeData,
            DESKTOP_EXCHANGE_CODE_TTL_SEC
          );
        }
      } catch (err) {
        logger.error({ error: err.message }, '[oauth-desktop] Failed to store exchange code');
        return res.status(500).send('Exchange code storage failed');
      }

      logger.info(
        { ip: req.ip, userId, email: gUser.email },
        '[oauth-desktop] Exchange code generated'
      );

      // Return interstitial HTML with deep link + fallback button.
      // Echo the desktop state (ds) captured at login so Electron can select
      // the EXACT PKCE verifier for this attempt. Without it, a user with more
      // than one login in flight (e.g. they clicked twice) forces the shell to
      // guess "newest verifier", which mismatches the completed attempt and the
      // exchange 401s (PKCE_MISMATCH). State makes the code→verifier map exact.
      const deepLink = `camora://exchange?code=${encodeURIComponent(exchangeCode)}`
        + (desktopMetadata?.state ? `&state=${encodeURIComponent(desktopMetadata.state)}` : '');
      const fallbackUrl = deepLink; // fallback to same deep link
      // Escape any value interpolated into the interstitial HTML. gUser.email is
      // provider-supplied but still untrusted for our sinks; escaping is cheap
      // defense-in-depth against HTML/attribute/script-context injection.
      const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));

      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Camora — Completing Sign In</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              padding: 40px;
              max-width: 400px;
              text-align: center;
            }
            h1 {
              margin: 0 0 10px;
              font-size: 24px;
              color: #333;
            }
            p {
              margin: 10px 0;
              color: #666;
              font-size: 16px;
            }
            .spinner {
              display: inline-block;
              width: 40px;
              height: 40px;
              margin: 20px 0;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              border: none;
              font-size: 16px;
            }
            .button:hover {
              background: #5568d3;
            }
            .info {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Almost there</h1>
            <p>Signed in as <strong>${esc(gUser.email)}</strong></p>
            <p>Click below to return to the Camora desktop app.</p>
            <!--
              MUST be a plain <a href>, not a <button onclick> or inline <script>.
              The backend sets a strict CSP (script-src 'self'; script-src-attr
              'none'), so ANY inline JS or inline event handler is blocked — that
              is exactly why the old button "couldn't be clicked" and the auto-
              redirect never fired. A normal anchor navigation needs no script, so
              CSP allows it and clicking reliably launches the camora:// handler.
            -->
            <a class="button" href="${esc(deepLink)}">Open Camora Desktop</a>
            <div class="info">
              When your browser asks “Open Camora?”, choose <strong>Open</strong>.
              Keep the Camora app running. You can close this tab afterward.
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Browser flow (default): Set SSO cookie and redirect to frontend
    setSSOCookie(res, accessToken);

    // Redirect to frontend with a `?login=success` flag — NO token in the URL.
    // Previously the 30-day JWT was placed in the URL hash, which left it in
    // browser history, autocomplete, and any referrer headers from the
    // first-page nav. The cookie above carries auth; the frontend's
    // AuthContext already calls /api/v1/auth/me with credentials:'include',
    // and /me returns a fresh access_token in its response body for the
    // Authorization header use case. So the URL hash is no longer needed.
    const sep = returnTo.includes('?') ? '&' : '?';
    res.redirect(`${FRONTEND_URL}${returnTo}${sep}login=success`);
  } catch (err) {
    logger.error({ error: err.message }, 'Google OAuth failed');
    res.redirect(`${FRONTEND_URL}/#error=oauth_failed`);
  }
});

/**
 * POST /api/auth/desktop/exchange — Desktop PKCE code exchange
 *
 * Electron calls this after receiving the deep-link callback with the
 * one-time exchange code. Validates the PKCE verifier (sha256(verifier)
 * must match the stored challenge), retrieves the JWT, and returns it
 * for Electron to inject into the webContents cookies.
 *
 * Request body:
 *   {
 *     code: string,      // one-time exchange code from deep link
 *     verifier: string   // PKCE verifier (base64url(randomBytes(32)))
 *   }
 *
 * Response:
 *   Success: { access_token: string, email: string, picture: string, name: string }
 *   Error:   { error: string, code: string }
 */
router.post('/desktop/exchange', authLimiter, async (req, res) => {
  const { code, verifier } = req.body;

  // Validate inputs
  if (!code || typeof code !== 'string' || code.length > 200) {
    return res.status(400).json({ error: 'Invalid exchange code', code: 'INVALID_CODE' });
  }
  if (!verifier || typeof verifier !== 'string' || verifier.length < 30 || verifier.length > 200) {
    return res.status(400).json({ error: 'Invalid PKCE verifier', code: 'INVALID_VERIFIER' });
  }

  try {
    // Retrieve stored exchange data (access_token, email, etc.)
    const exchangeKey = `${DESKTOP_EXCHANGE_CODE_PREFIX}${code}`;
    const storedData = await cacheGet(exchangeKey);

    if (!storedData) {
      logger.warn(
        { ip: req.ip, code: code.slice(0, 10) },
        '[oauth-desktop] Exchange code not found or expired'
      );
      return res.status(401).json({
        error: 'Exchange code not found or expired',
        code: 'EXCHANGE_CODE_NOT_FOUND',
      });
    }

    // One-time use: delete immediately after retrieval
    try {
      await cacheDel(exchangeKey);
    } catch (err) {
      logger.warn({ error: err.message }, '[oauth-desktop] Failed to delete exchange code');
    }

    const exchangeData = JSON.parse(storedData);
    const { access_token: storedJwt, email, picture, name } = exchangeData;

    if (!storedJwt) {
      logger.error({ code: code.slice(0, 10) }, '[oauth-desktop] Exchange data missing JWT');
      return res.status(500).json({
        error: 'Exchange data corrupted',
        code: 'CORRUPTED_DATA',
      });
    }

    // ★ PKCE Verification ★
    // Compute sha256(verifier) and require it to equal the challenge captured at
    // login time (bound to this exchange record). Fail closed on mismatch OR a
    // missing challenge — without this comparison ANY verifier is accepted, which
    // defeats PKCE's protection against exchange-code interception.
    const computedChallenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');

    if (!exchangeData.pkce_challenge || !safeEq(computedChallenge, exchangeData.pkce_challenge)) {
      logger.warn(
        { ip: req.ip, email, hasChallenge: !!exchangeData.pkce_challenge },
        '[oauth-desktop] PKCE verification failed — rejecting exchange'
      );
      return res.status(401).json({ error: 'PKCE verification failed', code: 'PKCE_MISMATCH' });
    }

    logger.info(
      { ip: req.ip, email },
      '[oauth-desktop] PKCE verifier accepted'
    );

    // Return the JWT and user info to Electron
    res.json({
      access_token: storedJwt,
      email,
      picture,
      name,
    });

    logger.info(
      { ip: req.ip, email },
      '[oauth-desktop] Exchange completed successfully'
    );
  } catch (err) {
    logger.error(
      { error: err.message, code: code.slice(0, 10) },
      '[oauth-desktop] Exchange failed'
    );
    res.status(500).json({
      error: 'Exchange failed',
      code: 'EXCHANGE_FAILED',
    });
  }
});
/**
 * POST /api/auth/desktop/poll — protocol-free completion for desktop login.
 *
 * The camora:// deep link is unreliable on some Windows setups (the OS never
 * launches the handler, so the app never exchanges the code). Instead the app
 * polls this endpoint with the state + PKCE verifier it generated at login.
 * While the browser flow hasn't finished, we return { pending: true }. Once the
 * callback has stored the result under the state key, we verify the verifier
 * against the bound challenge (same PKCE guarantee as /exchange) and return the
 * JWT. One-time: the record is deleted on success.
 *
 * Request body: { state: string, verifier: string }
 * Response: { pending: true } | { access_token, email, picture, name } | 401
 */
router.post('/desktop/poll', authLimiter, async (req, res) => {
  const { state, verifier } = req.body;
  if (!state || typeof state !== 'string' || state.length > 100) {
    return res.status(400).json({ error: 'Invalid state', code: 'INVALID_STATE' });
  }
  if (!verifier || typeof verifier !== 'string' || verifier.length < 30 || verifier.length > 200) {
    return res.status(400).json({ error: 'Invalid PKCE verifier', code: 'INVALID_VERIFIER' });
  }

  try {
    const stateKey = `${DESKTOP_EXCHANGE_STATE_PREFIX}${state}`;
    const storedData = await cacheGet(stateKey);
    // Not done yet — the browser hasn't completed the callback. Keep polling.
    if (!storedData) {
      return res.json({ pending: true });
    }

    const exchangeData = JSON.parse(storedData);
    const { access_token: storedJwt, email, picture, name } = exchangeData;
    if (!storedJwt) {
      return res.status(500).json({ error: 'Exchange data corrupted', code: 'CORRUPTED_DATA' });
    }

    // Same PKCE check as /exchange: sha256(verifier) must equal the bound
    // challenge. Fail closed on mismatch OR a missing challenge.
    const computedChallenge = createHash('sha256').update(verifier).digest('base64url');
    if (!exchangeData.pkce_challenge || !safeEq(computedChallenge, exchangeData.pkce_challenge)) {
      logger.warn({ ip: req.ip, email }, '[oauth-desktop] poll PKCE verification failed');
      return res.status(401).json({ error: 'PKCE verification failed', code: 'PKCE_MISMATCH' });
    }

    // One-time use: delete only after PKCE passes so a wrong verifier can't
    // consume the record. The code-keyed record expires on its own TTL.
    try { await cacheDel(stateKey); } catch { /* best-effort */ }

    logger.info({ ip: req.ip, email }, '[oauth-desktop] poll completed successfully');
    return res.json({ access_token: storedJwt, email, picture, name });
  } catch (err) {
    logger.error({ error: err.message }, '[oauth-desktop] poll failed');
    return res.status(500).json({ error: 'Poll failed', code: 'POLL_FAILED' });
  }
});
router.post('/refresh', authLimiter, async (req, res) => {
  // Resolve token from Authorization header OR cariara_sso cookie so a SPA
  // can refresh using only the httpOnly cookie via credentials:'include'.
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token && req.cookies?.cariara_sso) {
    token = req.cookies.cariara_sso;
  }
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Auth not configured' });
  }

  try {
    // Verify token but allow expired ones
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: [process.env.JWT_ALGORITHM || 'HS256'],
      ignoreExpiration: true,
    });

    if (!payload.sub || payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Absolute refresh ceiling: we ignore expiration to allow refresh, but a
    // token whose issuance (iat) is older than 90 days can no longer be
    // refreshed — so a stolen-but-unrevoked token can't be renewed forever.
    // (Follow-up: propagate an auth_time claim to also bound tokens that ARE
    // being actively refreshed; iat resets on each mint.)
    const MAX_REFRESH_AGE_SEC = 90 * 24 * 60 * 60;
    if (!payload.iat || (Date.now() / 1000) - payload.iat > MAX_REFRESH_AGE_SEC) {
      return res.status(401).json({ error: 'Session too old; please sign in again.', code: 'REFRESH_EXPIRED' });
    }

    // Re-query identity on every refresh so the new token carries CURRENT
    // email/name/picture from the DB, not the values frozen in the expired
    // token. Critical for accounts that updated their Google profile or had
    // an admin email change — without this, stale claims could persist
    // indefinitely across renewals.
    const userCheck = await query(
      'SELECT id, email, name, picture, is_active, token_generation FROM users WHERE id = $1',
      [parseInt(payload.sub, 10)],
    );
    const user = userCheck.rows[0];
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }

    // Reject the refresh outright if the token's generation predates
    // the user's current generation — i.e. the user already revoked all
    // sessions. Without this, an attacker holding a stolen expired
    // token can refresh into a new live one indefinitely.
    const dbGen = Number(user.token_generation || 0);
    const tokenGen = Number(payload.gen || 0);
    if (dbGen > 0 && tokenGen !== dbGen) {
      return res.status(401).json({ error: 'Session revoked' });
    }

    // Issue fresh token with re-queried claims AND the current gen so
    // the next /me check enforces revocation.
    const newToken = createToken(
      {
        sub: String(user.id),
        email: user.email,
        name: user.name || '',
        picture: user.picture || '',
        type: 'access',
        gen: dbGen,
      },
      '30d',
    );

    setSSOCookie(res, newToken);

    res.json({ access_token: newToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * Logout — clear SSO cookie
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  clearSSOCookie(res);
  res.json({ success: true });
});

/**
 * Verify token / Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // Validate JWT generation against current DB value. If the user has
    // revoked all sessions (token_generation incremented), the inbound
    // token's `gen` claim will be stale and we reject. Tokens issued before
    // gen tracking was added will have no `gen` claim — those still pass
    // (one-time backwards-compat — gone after the next round of issuances).
    const result = await query(
      'SELECT onboarding_completed, job_roles, token_generation, is_admin FROM users WHERE id = $1',
      [req.user.id],
    );
    const dbUser = result.rows[0] || {};
    const tokenGen = req.user.gen;
    const dbGen = dbUser.token_generation || 1;
    if (tokenGen !== undefined && tokenGen !== dbGen) {
      logger.info({ userId: req.user.id, tokenGen, dbGen }, '[auth] token generation stale — revoked');
      return res.status(401).json({
        error: 'Session revoked. Please sign in again.',
        code: 'TOKEN_GENERATION_STALE',
      });
    }

    // Mint a fresh short-lived bearer so the SPA can keep calling APIs after
    // a hard refresh without a second /refresh roundtrip. The cookie is
    // httpOnly so JS can't read it; we hand the token back in the body.
    const accessToken = createToken(
      {
        sub: String(req.user.id),
        email: req.user.email,
        name: req.user.name || '',
        picture: req.user.picture || '',
        type: 'access',
        gen: dbGen,
      },
      '30d',
    );

    res.json({
      authenticated: true,
      access_token: accessToken,
      user: {
        ...req.user,
        onboarding_completed: dbUser.onboarding_completed || false,
        job_roles: dbUser.job_roles || [],
        is_admin: dbUser.is_admin === true,
      },
    });
  } catch {
    // DB error — issue a token but keep the gen claim from the
    // already-verified incoming token. The previous behaviour
    // dropped gen entirely, which silently bypassed the
    // revoke-all-sessions mechanism for any session that touched /me
    // during a DB hiccup. Carrying the existing gen forward keeps
    // revocation honest: a revoked token still presents the *old*
    // gen, and the next successful DB-backed /me will reject it.
    const accessToken = createToken(
      {
        sub: String(req.user.id),
        email: req.user.email,
        name: req.user.name || '',
        picture: req.user.picture || '',
        type: 'access',
        ...(req.user.gen !== undefined ? { gen: req.user.gen } : {}),
      },
      '30d',
    );
    res.json({
      authenticated: true,
      access_token: accessToken,
      user: req.user,
    });
  }
});

/**
 * Revoke all outstanding sessions for the calling user.
 * POST /api/auth/revoke-all-sessions
 *
 * Increments users.token_generation, which invalidates every JWT carrying
 * the old `gen` claim. The user's current session is also invalidated
 * (their next /me call will return 401 TOKEN_GENERATION_STALE), so the SPA
 * should immediately redirect to /login. Useful for: stolen-token recovery,
 * "log out all devices" UI, password-change-style flows.
 */
router.post('/revoke-all-sessions', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE users SET token_generation = token_generation + 1 WHERE id = $1',
      [req.user.id],
    );
    logger.info({ userId: req.user.id }, '[auth] all sessions revoked');
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user.id }, '[auth] revoke-all-sessions failed');
    return res.status(500).json({ error: 'Could not revoke sessions' });
  }
});

/**
 * Grant admin subscription to a user (admin secret required)
 * POST /api/auth/admin/grant-subscription
 */
router.post('/admin/grant-subscription', authLimiter, async (req, res) => {
  const { email, adminSecret } = req.body;

  // Require admin secret from environment (no default — must be explicitly configured)
  const expectedSecret = process.env.ADMIN_SECRET;
  // Constant-time compare (safeEq) so an attacker can't recover ADMIN_SECRET
  // byte-by-byte from response-timing differences of `!==`.
  if (!expectedSecret || !safeEq(adminSecret, expectedSecret)) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find user by email
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: `User not found: ${email}` });
    }

    const userId = userResult.rows[0].id;

    // Upsert subscription
    await query(
      `INSERT INTO ascend_subscriptions (user_id, plan_type, status, created_at, updated_at)
       VALUES ($1, 'pro_yearly', 'active', NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         plan_type = 'pro_yearly', status = 'active', updated_at = NOW()`,
      [userId]
    );

    // Reset free usage counters (paid plan bypasses limits, so keep defaults)
    await query(
      `INSERT INTO ascend_free_usage (user_id, coding_used, coding_limit, design_used, design_limit, company_prep_used, company_prep_limit)
       VALUES ($1, 0, 3, 0, 2, 0, 2)
       ON CONFLICT (user_id) DO UPDATE SET
         coding_used = 0, coding_limit = 3,
         design_used = 0, design_limit = 2,
         company_prep_used = 0, company_prep_limit = 2`,
      [userId]
    );

    // Add 10000 credits
    await query(
      `INSERT INTO ascend_credits (user_id, balance, lifetime_earned)
       VALUES ($1, 10000, 10000)
       ON CONFLICT (user_id) DO UPDATE SET
         balance = ascend_credits.balance + 10000,
         lifetime_earned = ascend_credits.lifetime_earned + 10000`,
      [userId]
    );

    logger.info({ email, userId }, 'Admin granted subscription');
    res.json({
      success: true,
      message: `Subscription granted to ${email}`,
      userId,
      subscription: 'pro_yearly',
      creditsAdded: 10000,
    });
  } catch (error) {
    logger.error({ error: error.message, email }, 'Grant subscription failed');
    res.status(500).json({ error: 'Failed to grant subscription' });
  }
});

/**
 * Get cookies for a specific platform (internal use)
 * SECURITY: Requires request context to get user-scoped cookies
 */
function getPlatformAuthKey(req, platform) {
  if (req.user?.id) {
    return `user-${req.user.id}:${platform}`;
  }
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'anonymous';
  return `ip-${clientIP}:${platform}`;
}

// In-memory storage for platform auth tokens
const platformAuth = new Map();
const TOKEN_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Store platform authentication
 * POST /api/auth/platform
 */
router.post('/platform', authenticate, (req, res) => {
  try {
    const { platform, cookies, timestamp } = req.body;

    if (!platform || !cookies) {
      return res.status(400).json({
        error: 'Platform and cookies are required',
      });
    }

    const validPlatforms = ['glider', 'lark', 'hackerrank', 'leetcode', 'codesignal', 'codility', 'coderpad'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Supported: ${validPlatforms.join(', ')}`,
      });
    }

    const storageKey = getPlatformAuthKey(req, platform);
    if (!storageKey) {
      return res.status(401).json({
        error: 'User identification required to store platform auth',
        code: 'AUTH_REQUIRED',
      });
    }

    platformAuth.set(storageKey, {
      cookies,
      timestamp: timestamp || Date.now(),
      expiresAt: Date.now() + TOKEN_EXPIRY,
    });

    logger.info({ platform, storageKey: storageKey.split(':')[0] }, 'Platform auth stored');

    res.json({
      success: true,
      platform,
      expiresAt: platformAuth.get(storageKey).expiresAt,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to store platform auth');
    res.status(500).json({
      error: 'Failed to store authentication',
    });
  }
});

/**
 * Get authentication status for all platforms
 * GET /api/auth/status
 */
router.get('/status', authenticate, (req, res) => {
  const status = {};
  const now = Date.now();
  const validPlatforms = ['glider', 'lark', 'hackerrank', 'leetcode', 'codesignal', 'codility', 'coderpad'];

  for (const platform of validPlatforms) {
    const storageKey = getPlatformAuthKey(req, platform);
    if (!storageKey) continue;

    const auth = platformAuth.get(storageKey);
    if (auth) {
      const isExpired = auth.expiresAt < now;
      status[platform] = {
        authenticated: !isExpired,
        expiresAt: auth.expiresAt,
        expired: isExpired,
      };
    }
  }

  res.json(status);
});

/**
 * Get cookies for a specific platform (internal use)
 */
export function getPlatformCookies(platform, req = null) {
  if (!req) return null;

  const storageKey = getPlatformAuthKey(req, platform);
  if (!storageKey) return null;

  const auth = platformAuth.get(storageKey);
  if (!auth) return null;

  if (auth.expiresAt < Date.now()) {
    platformAuth.delete(storageKey);
    return null;
  }

  return auth.cookies;
}

/**
 * Clear authentication for a platform
 * DELETE /api/auth/platform/:platform
 */
router.delete('/platform/:platform', authenticate, (req, res) => {
  const { platform } = req.params;
  const storageKey = getPlatformAuthKey(req, platform);

  if (!storageKey) {
    return res.status(401).json({ error: 'User identification required' });
  }

  if (platformAuth.has(storageKey)) {
    platformAuth.delete(storageKey);
    logger.info({ platform }, 'Platform auth cleared');
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Platform auth not found' });
  }
});

/**
 * Clear all authentication for this user
 * DELETE /api/auth/all
 */
router.delete('/all', authenticate, (req, res) => {
  const validPlatforms = ['glider', 'lark', 'hackerrank', 'leetcode', 'codesignal', 'codility', 'coderpad'];
  let cleared = 0;

  for (const platform of validPlatforms) {
    const storageKey = getPlatformAuthKey(req, platform);
    if (storageKey && platformAuth.has(storageKey)) {
      platformAuth.delete(storageKey);
      cleared++;
    }
  }

  logger.info({ cleared }, 'Platform auth cleared for user');
  res.json({ success: true, cleared });
});

/**
 * DELETE /account — user-initiated account deletion.
 *
 * Removes the caller's row from the shared `users` table. ON DELETE
 * CASCADE on the FKs in ascend_subscriptions / ascend_credits /
 * ascend_free_usage / etc. takes care of dependent rows. The caller's
 * SSO cookie is cleared so the next page load logs them out cleanly.
 *
 * Frontend caller: apps/camora/src/pages/ProfilePage.tsx — was hitting
 * a route that didn't exist, so the "Delete account" button silently
 * failed (the response error was swallowed).
 */
router.delete('/account', authenticate, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // GDPR Article 17 / CCPA right to deletion. Voice embeddings live
    // outside Postgres on ai-services' /data/embeddings/{userId}.npy.
    // Delete those FIRST so we don't leave orphaned biometric data
    // (resemblyzer 256-dim embedding = "sensitive personal information"
    // under both regimes). Best-effort: failures here log but don't
    // block account deletion — the user's primary intent is removing
    // their data; we surface ai-services issues to ops separately.
    try {
      const aiUrl = process.env.AI_SERVICES_URL || 'http://localhost:8001';
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.AI_SERVICES_API_KEY) headers['X-API-Key'] = process.env.AI_SERVICES_API_KEY;
      await fetch(`${aiUrl}/speaker/enroll`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ user_id: String(userId) }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (aiErr) {
      logger.warn({ aiErr: aiErr.message, userId }, 'Voice embedding cleanup failed during account deletion');
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.clearCookie('cariara_sso', {
      domain: process.env.COOKIE_DOMAIN || '.cariara.com',
      path: '/',
    });
    logger.info({ userId }, 'User account deleted');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Account delete failed');
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
