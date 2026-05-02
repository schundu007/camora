import { getPool, query, closePool } from '../lib/shared-db.js';
export { getPool, query, closePool };

/**
 * Initialize Ascend-specific data for a new user. Also grants the 1-hour
 * free trial (7-day expiry) — idempotent via the uq_topups_trial_per_user
 * partial unique index, so re-running this is safe.
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

  // Free trial: 1 AI hour, expires in 7 days. Idempotent — the partial
  // unique index on (user_id) WHERE source='trial' ensures a single grant
  // per user even if initUser fires multiple times.
  try {
    await query(
      `INSERT INTO ai_hour_topups
         (user_id, team_id, hours, amount_cents, expires_at, source)
       VALUES ($1, NULL, 1, 0, NOW() + INTERVAL '7 days', 'trial')
       ON CONFLICT DO NOTHING`,
      [userId],
    );
  } catch (e) {
    // ai_hour_topups table or unique index may not exist on the very first
    // boot before migrations. Don't block user provisioning on it.
    console.warn('initUser trial grant skipped:', e.message);
  }
}
