import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from '../lib/shared-db.js';
import { createToken, setSSOCookie, clearSSOCookie } from '../lib/shared-auth.js';
import { logger } from '../middleware/requestLogger.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import { initUser } from '../config/database.js';

// CSRF nonce cookie for OAuth state — short TTL, signed-cookie-free
// (we just compare values), httpOnly so JS can't exfiltrate, sameSite=lax
// so it survives the Google round-trip back to our callback.
const OAUTH_STATE_COOKIE = 'cariara_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 min — covers slow user

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
router.get('/google/login', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  // Cap and sanitize returnTo — only relative paths starting with /
  let returnTo = String(req.query.redirect || '/').slice(0, 200);
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) returnTo = '/';

  // Generate CSRF nonce + bind to cookie
  const nonce = randomBytes(24).toString('base64url');
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: '/',
  });

  const state = `${nonce}:${returnTo}`;
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

  // CSRF check — state must be `<nonce>:<returnTo>` and nonce must match
  // the value we set in the cookie at /login. Backwards-compatible: legacy
  // logins where state was just the returnTo path (no colon) get a 400 so
  // they re-enter the login flow with the new nonce.
  let nonce = '';
  let returnToFromState = '/';
  if (typeof state === 'string' && state.includes(':')) {
    const idx = state.indexOf(':');
    nonce = state.slice(0, idx);
    returnToFromState = state.slice(idx + 1);
  } else if (typeof state === 'string' && state.startsWith('/')) {
    // Legacy flow — fail closed.
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    return res.redirect(`${FRONTEND_URL}?error=oauth_state_legacy`);
  }
  const cookieNonce = req.cookies?.[OAUTH_STATE_COOKIE];
  if (!nonce || !cookieNonce || !safeEq(nonce, cookieNonce)) {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    logger.warn({ ip: req.ip }, '[oauth] state nonce mismatch — possible CSRF attempt');
    return res.redirect(`${FRONTEND_URL}?error=oauth_state_invalid`);
  }
  // One-time use: clear cookie now that we've validated it
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

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
        'INSERT INTO users (email, name, avatar, provider, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
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

    // Update last login time
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);

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

        // Try ip-api.com first (HTTP only for free tier)
        let loc = null;
        try {
          const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country`);
          const geo = await r.json();
          console.log('[GeoIP] ip-api response:', JSON.stringify(geo));
          if (geo.status === 'success' && (geo.city || geo.country)) {
            loc = [geo.city, geo.regionName, geo.country].filter(Boolean).join(', ');
          }
        } catch (e) {
          console.log('[GeoIP] ip-api failed:', e.message);
        }

        // Fallback to ipapi.co (HTTPS)
        if (!loc) {
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

    // Issue JWT via shared-auth
    const accessToken = createToken(
      { sub: userId, email: gUser.email, name: gUser.name || '', picture: gUser.picture || '', type: 'access' },
      '30d'
    );

    // Set SSO cookie for cross-subdomain auth (Lumora reads this)
    setSSOCookie(res, accessToken);

    // Redirect to frontend with token in URL hash
    // IMPORTANT: param names must match what AuthContext.parseAuthFromHash() expects
    res.redirect(`${FRONTEND_URL}${returnTo}#access_token=${accessToken}&user_id=${userId}&user_email=${encodeURIComponent(gUser.email)}&user_name=${encodeURIComponent(gUser.name || '')}&user_avatar=${encodeURIComponent(gUser.picture || '')}&user_role=user&onboarding_completed=${onboardingCompleted}`);
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
      'SELECT id, email, name, picture, is_active FROM users WHERE id = $1',
      [parseInt(payload.sub, 10)],
    );
    const user = userCheck.rows[0];
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }

    // Issue fresh token with re-queried claims
    const newToken = createToken(
      {
        sub: String(user.id),
        email: user.email,
        name: user.name || '',
        picture: user.picture || '',
        type: 'access',
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
  // Mint a fresh short-lived bearer so the SPA can keep calling APIs after a
  // hard refresh without a second /refresh roundtrip. The cookie is httpOnly
  // so JS can't read it; we hand the token back in the body.
  const accessToken = createToken(
    {
      sub: String(req.user.id),
      email: req.user.email,
      name: req.user.name || '',
      picture: req.user.picture || '',
      type: 'access',
    },
    '30d'
  );

  try {
    const result = await query(
      'SELECT onboarding_completed, job_roles FROM users WHERE id = $1',
      [req.user.id]
    );
    const dbUser = result.rows[0] || {};
    res.json({
      authenticated: true,
      access_token: accessToken,
      user: {
        ...req.user,
        onboarding_completed: dbUser.onboarding_completed || false,
        job_roles: dbUser.job_roles || [],
      },
    });
  } catch (error) {
    res.json({
      authenticated: true,
      access_token: accessToken,
      user: req.user,
    });
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

export default router;
