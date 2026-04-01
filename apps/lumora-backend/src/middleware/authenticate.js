/**
 * Lumora authentication middleware.
 *
 * Wraps the shared-auth authenticate middleware with email-based user lookup
 * and auto-provisioning so that Ascend SSO tokens work seamlessly.
 */
import { verifyToken } from '@camora/shared-auth';
import { query } from '@camora/shared-db';

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
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING *`,
        [email, name, image, providerId],
      );
      user = insertResult.rows[0];
    }

    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'User account inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('authenticate middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
}

export default authenticate;
