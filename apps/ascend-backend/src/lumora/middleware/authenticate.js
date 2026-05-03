/**
 * Lumora authentication middleware.
 *
 * Wraps the shared-auth authenticate middleware with email-based user lookup
 * and auto-provisioning so that Ascend SSO tokens work seamlessly.
 */
import { verifyToken } from '../lib/shared-auth.js';
import { query } from '../lib/shared-db.js';
import { initUser } from '../../config/database.js';

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

    // --- Auto-provision from Ascend SSO ----------------------------------
    if (!user) {
      const name = payload.name || email.split('@')[0];
      const image = payload.picture || null;
      const providerId = String(payload.sub);

      const insertResult = await query(
        `INSERT INTO users (email, name, image, provider, provider_id, is_active)
         VALUES ($1, $2, $3, 'ascend_sso', $4, true)
         ON CONFLICT (email) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, users.name),
           image = COALESCE(EXCLUDED.image, users.image)
         RETURNING *`,
        [email, name, image, providerId],
      );
      user = insertResult.rows[0];
    }

    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'User account inactive' });
    }

    // Provision ascend_subscriptions / ascend_credits / trial top-up
    // rows the first time a user enters via the lumora surface — the
    // ascend authenticate path already does this (via jwtAuth's
    // initUser call) so a user who first hits lumora was previously
    // left with no subscription row and treated as free forever, even
    // if they paid through the ascend checkout.
    try {
      await initUser(user.id);
    } catch (initErr) {
      // Don't fail the whole request — surface in logs and let the
      // handler decide. initUser is idempotent so the next request
      // tries again.
      console.warn('initUser failed in lumora authenticate:', initErr?.message || initErr);
    }

    // Set admin flag for usage bypass. Env-only — no source fallback
    // (matches billing.js + ascendPrep.js so the bypass list stays
    // consistent and a hardcoded address can't outlive a real change).
    const ADMIN_EMAILS = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    user.is_admin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email?.toLowerCase());

    req.user = user;
    next();
  } catch (err) {
    console.error('authenticate middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
}

export default authenticate;
