import { query } from '../lib/shared-db.js';
import { logger } from '../middleware/requestLogger.js';

// Token → seconds conversion for one-shot LLM calls (no wall-clock available).
// Calibrated against typical Sonnet output speed (~50 tokens/s) so 1000 output
// tokens ≈ 20s of "AI time". Tunable via env without redeploy.
const SECONDS_PER_1K_OUTPUT_TOKENS = Number(process.env.AI_HOURS_SEC_PER_1K_OUT) || 20;
const SECONDS_PER_1K_INPUT_TOKENS = Number(process.env.AI_HOURS_SEC_PER_1K_IN) || 2;

// Legacy unlimited plans grandfathered from pre-2026-04 pricing. Heavy users on
// these plans cost more than they pay; cap at 60h/30d then downgrade model.
const LEGACY_UNLIMITED_PLANS = new Set([
  'monthly',
  'monthly_pro',
  'pro',
  'quarterly_pro',
]);
const LEGACY_FAIR_USE_HOURS = Number(process.env.LEGACY_FAIR_USE_HOURS) || 60;

export function tokensToSeconds(tokensIn = 0, tokensOut = 0) {
  return (
    (tokensIn / 1000) * SECONDS_PER_1K_INPUT_TOKENS
    + (tokensOut / 1000) * SECONDS_PER_1K_OUTPUT_TOKENS
  );
}

// Fire-and-forget. Never throws. Never blocks the LLM response.
export function recordUsage({
  userId,
  surface,
  seconds = 0,
  tokensIn = 0,
  tokensOut = 0,
  model = null,
  planAtCharge = null,
  startedAt = null,
}) {
  if (!userId || !surface) return;
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const start = startedAt || new Date(Date.now() - safeSeconds * 1000);
  const end = new Date();
  query(
    `INSERT INTO ai_hours_usage
       (user_id, surface, started_at, ended_at, seconds, tokens_in, tokens_out, model, plan_at_charge)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, surface, start, end, safeSeconds, tokensIn || 0, tokensOut || 0, model, planAtCharge],
  ).catch((err) => {
    logger.warn({ err: err.message, userId, surface }, '[aiHoursMeter] insert failed');
  });
}

// Convenience for token-priced calls (solve/analyze/prep/diagram).
export function recordTokens({ userId, surface, tokensIn, tokensOut, model, planAtCharge }) {
  recordUsage({
    userId,
    surface,
    seconds: tokensToSeconds(tokensIn, tokensOut),
    tokensIn,
    tokensOut,
    model,
    planAtCharge,
  });
}

// Used by legacy-Pro fair-use cap. Returns hours used in last `days` days.
export async function getRecentHours(userId, days = 30) {
  if (!userId) return 0;
  try {
    const r = await query(
      `SELECT COALESCE(SUM(seconds), 0) AS s
         FROM ai_hours_usage
        WHERE user_id = $1
          AND created_at > NOW() - ($2 || ' days')::INTERVAL`,
      [userId, String(days)],
    );
    return Number(r.rows[0]?.s || 0) / 3600;
  } catch (err) {
    logger.warn({ err: err.message, userId }, '[aiHoursMeter] getRecentHours failed');
    return 0;
  }
}

// Returns true if this user is on a grandfathered "unlimited" plan AND has
// burned past the fair-use ceiling. Caller switches to Haiku for the next
// request and surfaces an X-Fair-Use-Throttled header.
export async function shouldThrottleLegacyPro(userId, planType) {
  if (!planType || !LEGACY_UNLIMITED_PLANS.has(planType)) return false;
  const hours = await getRecentHours(userId, 30);
  return hours >= LEGACY_FAIR_USE_HOURS;
}
