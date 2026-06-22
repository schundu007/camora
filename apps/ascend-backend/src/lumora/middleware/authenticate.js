/**
 * Lumora authentication middleware.
 *
 * Wraps the shared-auth authenticate middleware with email-based user lookup
 * and auto-provisioning so that Ascend SSO tokens work seamlessly.
 */
import { verifyToken } from '../lib/shared-auth.js';
import { query } from '../lib/shared-db.js';
import { initUser } from '../../config/database.js';
import { PAID_PLAN_TYPES } from '../../lib/plans.js';

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

    // Admin flag: env list (OWNER_EMAILS/ADMIN_EMAILS) takes precedence;
    // fall back to the users.is_admin DB column so admin panel grants
    // (POST /api/admin/users) also work without a Railway env redeploy.
    const ADMIN_EMAILS = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    user.is_admin = (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email?.toLowerCase()))
                  || (user.is_admin === true);

    // Enrich plan_type from ascend_subscriptions (canonical billing source).
    // users.plan_type is a legacy column not updated when trials or paid plans
    // are granted — so trial users always appeared as 'free' here, blocking
    // them from Lumora AI features even with an active trial.
    try {
      const subRes = await query(
        'SELECT plan_type, status, trial_ends_at FROM ascend_subscriptions WHERE user_id = $1',
        [user.id],
      );
      const sub = subRes.rows[0];
      if (sub) {
        if (PAID_PLAN_TYPES.has(sub.plan_type) && sub.status === 'active') {
          user.plan_type = sub.plan_type;
        } else if (sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) {
          // Active trial — treat as pro_monthly so free-tier daily limits are skipped.
          user.plan_type = 'pro_monthly';
        }
      }
    } catch (subErr) {
      // DB hiccup — fall through with users.plan_type as-is.
      console.warn('lumora authenticate: ascend_subscriptions lookup failed:', subErr?.message);
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('authenticate middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
}

export default authenticate;
