/**
 * Quota management service — daily free-tier limits and usage tracking.
 *
 * Ported from Python: lumora/backend/app/services/quota.py
 */
import { query } from '../lib/shared-db.js';

const FREE_DAILY_LIMIT = 10;

/**
 * Atomically check the daily free-tier limit and reserve a slot.
 *
 * Uses a CTE that checks the count and inserts a placeholder row in one
 * query, eliminating the TOCTOU race where concurrent requests both pass
 * the SELECT-then-INSERT check before either records usage.
 *
 * Returns reservationId (the placeholder row's id) on success so the
 * caller can UPDATE it with real token/latency data when the request completes.
 */
export async function checkAndReserveInferenceSlot(userId) {
  const result = await query(
    `WITH daily AS (
       SELECT COUNT(*) AS cnt
         FROM lumora_usage_logs
        WHERE user_id = $1
          AND created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
          AND success = true
     ),
     ins AS (
       INSERT INTO lumora_usage_logs (user_id, endpoint, question_type, tokens_used, latency_ms, success)
       SELECT $1, 'stream', 'pending', 0, 0, true
         FROM daily WHERE cnt < $2
       RETURNING id
     )
     SELECT daily.cnt, (SELECT id FROM ins) AS reservation_id FROM daily`,
    [userId, FREE_DAILY_LIMIT],
  );

  const { cnt, reservation_id } = result.rows[0];
  const used = parseInt(cnt, 10);

  if (!reservation_id) {
    return {
      allowed: false,
      used,
      limit: FREE_DAILY_LIMIT,
      message: `Free tier limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited.`,
    };
  }

  return {
    allowed: true,
    used,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used - 1),
    reservationId: reservation_id,
  };
}
