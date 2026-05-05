import { query } from '../lib/shared-db.js';
import { logger } from '../middleware/requestLogger.js';

// Token → seconds conversion for one-shot LLM calls (no wall-clock available).
// Calibrated against typical Sonnet output speed (~50 tokens/s) so 1000 output
// tokens ≈ 20s of "AI time". Tunable via env without redeploy.
const SECONDS_PER_1K_OUTPUT_TOKENS = Number(process.env.AI_HOURS_SEC_PER_1K_OUT) || 20;
const SECONDS_PER_1K_INPUT_TOKENS = Number(process.env.AI_HOURS_SEC_PER_1K_IN) || 2;

export function tokensToSeconds(tokensIn = 0, tokensOut = 0) {
  return (
    (tokensIn / 1000) * SECONDS_PER_1K_INPUT_TOKENS
    + (tokensOut / 1000) * SECONDS_PER_1K_OUTPUT_TOKENS
  );
}

// Track in-flight inserts so the SIGTERM handler can drain them
// before closePool(). Without this, the ~50–500 ms gap between an
// answer's onComplete and the INSERT actually landing in Postgres
// drops every row Railway happens to redeploy on top of (15-second
// graceful shutdown). The promises self-remove on settle so the Set
// can't grow unbounded under steady-state traffic.
const _pendingInserts = new Set();

function _track(p) {
  _pendingInserts.add(p);
  const cleanup = () => _pendingInserts.delete(p);
  p.then(cleanup, cleanup);
}

/**
 * Drain pending recordUsage inserts before the process exits.
 * Called from the SIGTERM handler in index.js. Non-throwing — a stuck
 * insert can't block shutdown indefinitely (the pool's own close is
 * gated on Railway's 15s timer regardless).
 */
export async function drainPendingUsage(timeoutMs = 5000) {
  if (_pendingInserts.size === 0) return;
  logger.info({ pending: _pendingInserts.size }, '[aiHoursMeter] draining pending inserts');
  const all = Promise.allSettled([..._pendingInserts]);
  const timer = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([all, timer]);
  if (_pendingInserts.size > 0) {
    logger.warn({ left: _pendingInserts.size }, '[aiHoursMeter] drain timeout — some inserts may be lost');
  }
}

// Fire-and-forget. Never throws. Never blocks the LLM response. The
// returned promise is also tracked so drainPendingUsage() can flush
// pending writes on shutdown.
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
  const p = query(
    `INSERT INTO ai_hours_usage
       (user_id, surface, started_at, ended_at, seconds, tokens_in, tokens_out, model, plan_at_charge)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, surface, start, end, safeSeconds, tokensIn || 0, tokensOut || 0, model, planAtCharge],
  ).catch((err) => {
    logger.warn({ err: err.message, userId, surface }, '[aiHoursMeter] insert failed');
  });
  _track(p);
}

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

