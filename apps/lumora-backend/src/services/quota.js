/**
 * Quota management service — daily free-tier limits and usage tracking.
 *
 * Ported from Python: lumora/backend/app/services/quota.py
 */
import { query } from '@camora/shared-db';

const FREE_DAILY_LIMIT = 10;

/**
 * Check whether a free-tier user has exceeded the daily request limit (10/day).
 *
 * Counts today's successful entries in the usage_logs table.
 *
 * @param {string} userId
 * @returns {Promise<{allowed: boolean, used: number, limit: number, remaining?: number, message?: string}>}
 */
export async function checkDailyFreeLimit(userId) {
  const result = await query(
    `SELECT COUNT(*) AS cnt
       FROM lumora_usage_logs
      WHERE user_id = $1
        AND created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
        AND success = true`,
    [userId],
  );

  const todayCount = parseInt(result.rows[0]?.cnt ?? '0', 10);

  if (todayCount >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      used: todayCount,
      limit: FREE_DAILY_LIMIT,
      message: `Free tier limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited.`,
    };
  }

  return {
    allowed: true,
    used: todayCount,
    limit: FREE_DAILY_LIMIT,
    remaining: FREE_DAILY_LIMIT - todayCount,
  };
}
