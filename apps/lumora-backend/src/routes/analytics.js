/**
 * Analytics API routes — user-facing usage stats and quota.
 *
 * Migrated from Python FastAPI → Node.js Express.
 * Only user-facing endpoints; admin analytics are not included.
 */
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /usage — Usage statistics for the authenticated user.
 *
 * Returns questions asked today, this week, and this month,
 * plus total tokens consumed and daily breakdown.
 *
 * Query params:
 *   days — look-back window (default 30, min 1, max 365)
 */
router.get('/usage', async (req, res, next) => {
  try {
    const userId = req.user.id;

    let days = parseInt(req.query.days, 10) || 30;
    if (days < 1) days = 1;
    if (days > 365) days = 365;

    // Aggregate stats over the requested period
    const aggResult = await query(
      `SELECT
         COUNT(*)                              AS total_requests,
         COALESCE(SUM(tokens_used), 0)         AS total_tokens,
         COALESCE(AVG(latency_ms), 0)          AS avg_latency_ms
       FROM lumora_usage_logs
       WHERE user_id = $1
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
         AND success = true`,
      [userId, String(days)],
    );

    const agg = aggResult.rows[0];

    // Daily breakdown
    const dailyResult = await query(
      `SELECT
         DATE_TRUNC('day', created_at)         AS date,
         COUNT(*)                              AS requests,
         COALESCE(SUM(tokens_used), 0)         AS tokens,
         COALESCE(AVG(latency_ms), 0)          AS avg_latency_ms
       FROM lumora_usage_logs
       WHERE user_id = $1
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
         AND success = true
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY DATE_TRUNC('day', created_at)`,
      [userId, String(days)],
    );

    // Convenience counters: today / this week / this month
    const countersResult = await query(
      `SELECT
         COUNT(*) FILTER (
           WHERE created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
         ) AS today,
         COUNT(*) FILTER (
           WHERE created_at >= DATE_TRUNC('week', NOW())
         ) AS this_week,
         COUNT(*) FILTER (
           WHERE created_at >= DATE_TRUNC('month', NOW())
         ) AS this_month
       FROM lumora_usage_logs
       WHERE user_id = $1
         AND success = true`,
      [userId],
    );

    const counters = countersResult.rows[0];

    res.json({
      total_requests: parseInt(agg.total_requests, 10),
      total_tokens: parseInt(agg.total_tokens, 10),
      avg_latency_ms: parseFloat(agg.avg_latency_ms),
      questions_today: parseInt(counters.today, 10),
      questions_this_week: parseInt(counters.this_week, 10),
      questions_this_month: parseInt(counters.this_month, 10),
      daily_usage: dailyResult.rows.map((r) => ({
        date: r.date,
        requests: parseInt(r.requests, 10),
        tokens: parseInt(r.tokens, 10),
        avg_latency_ms: parseFloat(r.avg_latency_ms),
      })),
      period_days: days,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /quota — Remaining quota for the authenticated user.
 *
 * If a quota row exists, returns limits and usage.
 * If not, returns default free-tier info based on daily usage_logs count.
 */
router.get('/quota', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Try the quotas table first
    const quotaResult = await query(
      'SELECT * FROM lumora_quotas WHERE user_id = $1 LIMIT 1',
      [userId],
    );

    if (quotaResult.rows.length > 0) {
      const q = quotaResult.rows[0];

      const tokensRemaining = Math.max(
        0,
        (q.monthly_tokens_limit || 0) - (q.monthly_tokens_used || 0),
      );
      const requestsRemaining = Math.max(
        0,
        (q.monthly_requests_limit || 0) - (q.monthly_requests_used || 0),
      );

      return res.json({
        id: q.id,
        monthly_tokens_limit: q.monthly_tokens_limit,
        monthly_tokens_used: q.monthly_tokens_used,
        monthly_requests_limit: q.monthly_requests_limit,
        monthly_requests_used: q.monthly_requests_used,
        tokens_remaining: tokensRemaining,
        requests_remaining: requestsRemaining,
        is_quota_exceeded: tokensRemaining <= 0 || requestsRemaining <= 0,
        reset_date: q.reset_date,
      });
    }

    // Fallback: free-tier daily limit (matches quota.js service)
    const FREE_DAILY_LIMIT = 10;
    const dailyResult = await query(
      `SELECT COUNT(*) AS cnt
       FROM lumora_usage_logs
       WHERE user_id = $1
         AND created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
         AND success = true`,
      [userId],
    );

    const todayUsed = parseInt(dailyResult.rows[0]?.cnt ?? '0', 10);

    res.json({
      id: null,
      monthly_tokens_limit: null,
      monthly_tokens_used: null,
      monthly_requests_limit: null,
      monthly_requests_used: null,
      tokens_remaining: null,
      requests_remaining: null,
      is_quota_exceeded: todayUsed >= FREE_DAILY_LIMIT,
      reset_date: null,
      free_tier: {
        daily_limit: FREE_DAILY_LIMIT,
        daily_used: todayUsed,
        daily_remaining: Math.max(0, FREE_DAILY_LIMIT - todayUsed),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
