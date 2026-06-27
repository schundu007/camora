/**
 * Lumora authentication middleware.
 *
 * Wraps the shared-auth authenticate middleware with email-based user lookup
 * and auto-provisioning so that Ascend SSO tokens work seamlessly.
 */
import { verifyToken } from '../lib/shared-auth.js';
import { query } from '../lib/shared-db.js';

/**
 * Authenticate request via Bearer token (or cariara_sso cookie).
 *
 * Flow:
 *  1. Extract & verify JWT
 *  2. Look up user by email in the Lumora DB
 *  3. If not found, auto-create with provider='ascend_sso'
 *  4. Attach full DB user row to req.user
 */
export async function authenticate(req, res, next) {
  // Idempotency guard. Routes are mounted with `authenticate` at the
  // mount point (index.js) AND many routers also call `router.use(
  // authenticate)` / per-handler `authenticate` for defense-in-depth.
  // Without this guard each request would run JWT verify + the users
  // DB lookup twice on every hot path. Now: if a previous middleware
  // already populated req.user, skip the second pass.
  if (req.user?.id) return next();

  try {
    // --- Extract token ---------------------------------------------------
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    if (!token && req.cookies?.cariara_sso) {
      token = req.cookies.cariara_sso;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // --- Verify JWT ------------------------------------------------------
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Reject non-access tokens (e.g., a future refresh-type token must NOT
    // pass the access-route gate). Ascend's jwtAuth enforces this — lumora
    // wasn't, so a parallel token-type with a valid signature would have
    // been accepted here. The previous condition `payload?.type && payload.type !== 'access'`
    // also let tokens with NO type claim through; matching Ascend's strict
    // shape now (token without an explicit `type: 'access'` is rejected).
    if (!payload?.type || payload.type !== 'access') {
      return res.status(401).json({ error: 'Wrong token type' });
    }

    const email = payload.email;
    if (!email) {
      return res.status(401).json({ error: 'Token missing email claim' });
    }

    // --- Lookup user by email --------------------------------------------
    let userResult = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    let user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Account not found' });
    }

    if (user.is_active === false) {
      return res.status(401).json({ error: 'User account inactive' });
    }

    // is_admin: DB column takes precedence (set via admin UI toggleAdmin).
    // Env-var list is an additional bypass so Railway-configured emails always work.
    const ADMIN_EMAILS = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    user.is_admin = !!user.is_admin || (!!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

    req.user = user;
    next();
  } catch (err) {
    console.error('authenticate middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
}

export default authenticate;
