import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../lib/shared-db.js';
import { createToken, setSSOCookie, clearSSOCookie } from '../lib/shared-auth.js';
import { logger } from '../middleware/requestLogger.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import { initUser } from '../config/database.js';

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
 */
router.get('/google/login', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  // Preserve the redirect URL through OAuth flow via state param
  const returnTo = req.query.redirect || '/';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: returnTo,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * GET /api/auth/google/callback — Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  let returnTo = (typeof state === 'string' && state.startsWith('/')) ? state : '/';
  // Prevent open redirect (e.g., //../evil.com or //evil.com)
  if (returnTo.includes('://') || returnTo.startsWith('//') || returnTo.includes('\\')) returnTo = '/';
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

      // Generate referral code for new user
      const refCode = Math.random().toString(36).substring(2, 10);
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
router.post('/refresh', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
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

    // Issue fresh token via shared-auth
    const newToken = createToken(
      { sub: payload.sub, email: payload.email, name: payload.name || '', picture: payload.picture || '', type: 'access' },
      '30d'
    );

    setSSOCookie(res, newToken);

    res.json({ accessToken: newToken });
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
    // Fetch onboarding data from DB
    const result = await query(
      'SELECT onboarding_completed, job_roles FROM users WHERE id = $1',
      [req.user.id]
    );
    const dbUser = result.rows[0] || {};
    res.json({
      authenticated: true,
      user: {
        ...req.user,
        onboarding_completed: dbUser.onboarding_completed || false,
        job_roles: dbUser.job_roles || [],
      },
    });
  } catch (error) {
    // Fallback: return user without onboarding data if DB query fails
    res.json({
      authenticated: true,
      user: req.user,
    });
  }
});

/**
 * Grant admin subscription to a user (admin secret required)
 * POST /api/auth/admin/grant-subscription
 */
router.post('/admin/grant-subscription', async (req, res) => {
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
       VALUES ($1, 'quarterly_pro', 'active', NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         plan_type = 'quarterly_pro', status = 'active', updated_at = NOW()`,
      [userId]
    );

    // Reset free usage limits to max
    await query(
      `INSERT INTO ascend_free_usage (user_id, coding_used, coding_limit, design_used, design_limit, company_prep_used, company_prep_limit)
       VALUES ($1, 0, 9999, 0, 9999, 0, 9999)
       ON CONFLICT (user_id) DO UPDATE SET
         coding_used = 0, coding_limit = 9999,
         design_used = 0, design_limit = 9999,
         company_prep_used = 0, company_prep_limit = 9999`,
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
      subscription: 'quarterly_pro',
      freeLimit: 9999,
      creditsAdded: 10000,
    });
  } catch (error) {
    logger.error({ error: error.message, email }, 'Grant subscription failed');
    res.status(500).json({ error: error.message });
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
