import { checkTeamHourBudget, checkPersonalHourBudget } from '../services/teamService.js';
import { tryAutoTopup } from '../services/autoTopupService.js';

const GATE_DEADLINE_MS = 3000;
const AUTO_TOPUP_DEADLINE_MS = 4000;

/** Promise.race against a deadline. Resolves with `defaultValue` on timeout. */
function withDeadline(promise, ms, defaultValue) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(defaultValue), ms)),
  ]);
}

/**
 * Pool exhaustion gate for AI-hour-using routes.
 *
 * Mounted alongside aiLimiter. Runs in this order:
 *   1. If the user is in a team, check the team pool + per-member cap.
 *      → 429 TEAM_POOL_EXHAUSTED or MEMBER_CAP_EXCEEDED if over.
 *   2. Else, check the user's personal plan budget (free / pro / pro max).
 *      → 429 PERSONAL_POOL_EXHAUSTED if over.
 *
 * Top-up packs (90-day expiry) extend the pool in both branches.
 *
 * **Hard 3-second deadline on the entire gate.** Slow Stripe / Redis / DB
 * never blocks an AI route past 3s — fail open and let the call proceed.
 * The meter still records on success, so no money is lost. This is the
 * safety net that prevents a slow downstream from cascading 502s across
 * every AI tool.
 *
 * Auto-topup is also bounded — 4s budget for the Stripe charge attempt,
 * inside the gate's overall 3s. Whichever fires first wins; either way
 * the request is freed within ~3s.
 */
export async function hourBudgetGate(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(); // unauth requests handled elsewhere

  // Wrap the whole gate in a deadline. If any branch hangs, this resolves
  // to { _timedOut: true } and we fail open at the bottom.
  const result = await withDeadline(
    runGate(userId).catch(() => ({ _failed: true })),
    GATE_DEADLINE_MS,
    { _timedOut: true },
  );

  if (result._timedOut || result._failed) return next(); // fail open

  if (result.action === 'block') {
    return res.status(result.status || 429).json(result.body);
  }
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, String(value));
    }
  }
  return next();
}

async function runGate(userId) {
  // ── Team check (pool + per-member cap) ─────────────────────
  const team = await checkTeamHourBudget(userId);
  if (team.has_team) {
    if (!team.ok) {
      // Per-member cap can NEVER be unblocked by an auto-topup.
      if (team.reason === 'TEAM_POOL_EXHAUSTED') {
        const charged = await withDeadline(
          tryAutoTopup({ userId, teamId: team.team_id }).catch(() => ({ ok: false })),
          AUTO_TOPUP_DEADLINE_MS,
          { ok: false, reason: 'TIMEOUT' },
        );
        if (charged.ok) {
          return { action: 'pass', headers: { 'X-Auto-Topup-Charged': String(charged.hours) } };
        }
      }
      return {
        action: 'block',
        status: 429,
        body: {
          error: team.reason === 'MEMBER_CAP_EXCEEDED'
            ? `You've used your per-member cap (${team.cap_hours} hr) for this period.`
            : 'Your team has used all of its AI hours for this period.',
          code: team.reason,
          team_id: team.team_id,
          pool_hours: team.pool_hours,
          used_hours: team.used_hours,
          cap_hours: team.cap_hours,
          action: team.reason === 'MEMBER_CAP_EXCEEDED' ? 'ask_owner_to_raise_cap' : 'top_up_or_wait',
        },
      };
    }
    return {
      action: 'pass',
      headers: { 'X-Team-Hours-Remaining': String(Math.floor((team.remaining_hours || 0) * 100) / 100) },
    };
  }

  // ── Personal check (no team) ───────────────────────────────
  const personal = await checkPersonalHourBudget(userId);
  if (personal.fail_open) return { action: 'pass' };
  if (!personal.ok) {
    const charged = await withDeadline(
      tryAutoTopup({ userId }).catch(() => ({ ok: false })),
      AUTO_TOPUP_DEADLINE_MS,
      { ok: false, reason: 'TIMEOUT' },
    );
    if (charged.ok) {
      return { action: 'pass', headers: { 'X-Auto-Topup-Charged': String(charged.hours) } };
    }
    return {
      action: 'block',
      status: 429,
      body: {
        error: personal.plan_type === 'free'
          ? "You've used your 30 minutes of free AI time. Subscribe to Pro for 2 hrs/mo, or buy a top-up pack."
          : 'You\'ve used all of your AI hours for this period. Buy a top-up pack to continue.',
        code: 'PERSONAL_POOL_EXHAUSTED',
        plan_type: personal.plan_type,
        pool_hours: personal.pool_hours,
        used_hours: personal.used_hours,
        topup_hours: personal.topup_hours,
        action: personal.plan_type === 'free' ? 'upgrade_or_top_up' : 'top_up_or_wait',
      },
    };
  }
  return {
    action: 'pass',
    headers: { 'X-Personal-Hours-Remaining': String(Math.floor((personal.remaining_hours || 0) * 100) / 100) },
  };
}

export default hourBudgetGate;
