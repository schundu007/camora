/**
 * Middleware that gates access to paid-only endpoints.
 *
 * Expects `req.user` to be set by the authenticate middleware.
 * Looks up the user's plan_type in the database and returns 403
 * if the plan is "free" (or missing).
 */
import { query } from '../lib/shared-db.js';

/**
 * Express middleware — rejects free-tier users with a 403.
 */
export async function requirePlan(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await query(
      'SELECT plan_type FROM users WHERE id = $1',
      [userId],
    );

    const plan = result.rows[0]?.plan_type || 'free';

    if (plan === 'free') {
      return res.status(403).json({
        error: 'Paid plan required',
        message: 'This feature requires a Pro or Lifetime plan. Please upgrade.',
      });
    }

    // Attach plan to request for downstream use
    req.plan = plan;
    next();
  } catch (err) {
    console.error('requirePlan middleware error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
