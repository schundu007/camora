import { getPool, query, closePool } from '../lib/shared-db.js';
export { getPool, query, closePool };

/**
 * Initialize Ascend-specific data for a new user
 */
export async function initUser(userId) {
  try {
    await query('SELECT ascend_init_user($1)', [userId]);
  } catch (err) {
    // Function may not exist yet — create subscriptions/credits manually
    try {
      await query(`INSERT INTO ascend_subscriptions (user_id, plan_type, status) VALUES ($1, 'free', 'active') ON CONFLICT (user_id) DO NOTHING`, [userId]);
      await query(`INSERT INTO ascend_credits (user_id, balance, lifetime_earned, lifetime_used) VALUES ($1, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING`, [userId]);
      await query(`INSERT INTO ascend_free_usage (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
    } catch (e) {
      console.warn('initUser fallback failed:', e.message);
    }
  }
}
