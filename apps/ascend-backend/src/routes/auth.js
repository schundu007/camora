import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
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
 * CSRF protection: generate a random nonce, set it as an httpOnly cookie,
 * include it in the state param (`<nonce>:<returnTo>`). On callback we
 * verify the cookie value matches the nonce in state — without this, an
 * attacker could craft a login URL that returns control to our callback
 * with their own Google identity (login CSRF).
 */
router.get('/google/login', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  // Cap and sanitize returnTo — only relative paths starting with /
  let returnTo = String(req.query.redirect || '/').slice(0, 200);
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) returnTo = '/';

  // Generate CSRF nonce — stored in Redis (primary) and cookie (fallback)
  const nonce = randomBytes(24).toString('base64url');

  // Redis-primary: survives browser cookie-blocking in OAuth bounce chains
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
  const issuedAt = Date.now();
  const state = `${nonce}:${issuedAt}:${returnTo}`;
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
 */
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

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
  if (typeof state === 'string' && state.includes(':')) {
    const parts = state.split(':');
    if (parts.length >= 3 && /^\d+$/.test(parts[1])) {
      // New shape — nonce:timestamp:returnTo (returnTo may itself contain ':')
      nonce = parts[0];
      issuedAt = Number(parts[1]);
      returnToFromState = parts.slice(2).join(':');
    } else {
      // Legacy two-segment shape — accept but record for telemetry
      const idx = state.indexOf(':');
      nonce = state.slice(0, idx);
      returnToFromState = state.slice(idx + 1);
      logger.info({ ip: req.ip }, '[oauth] legacy two-segment state accepted');
    }
  } else if (typeof state === 'string' && state.startsWith('/')) {
    // Legacy flow — fail closed.
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    return res.redirect(`${FRONTEND_URL}?error=oauth_state_legacy`);
  }
  // Validate nonce: Redis primary (browser-cookie-independent), cookie fallback
  let nonceValid = false;
  if (nonce) {
    try {
      const stored = await cacheGet(`oauth_nonce:${nonce}`);
      if (stored !== null) {
        await cacheDel(`oauth_nonce:${nonce}`); // one-time use
        nonceValid = true;
      }
    } catch { /* Redis unavailable — fall through to cookie */ }
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

    // Set SSO cookie for cross-subdomain auth (Lumora reads this)
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
 * Refresh access token
 * POST /api/auth/refresh
 * Accepts an expired access token and issues a fresh one with the same claims.
 */
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
  if (!expectedSecret || adminSecret !== expectedSecret) {
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
