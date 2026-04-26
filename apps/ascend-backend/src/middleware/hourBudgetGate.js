import { checkTeamHourBudget, checkPersonalHourBudget } from '../services/teamService.js';
import { tryAutoTopup } from '../services/autoTopupService.js';

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
 * Failures during the lookup fail-open (call goes through). The meter will
 * still record usage; the next call after stale state resolves will be
 * gated correctly.
 */
export async function hourBudgetGate(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(); // unauth requests handled elsewhere

  try {
    // ── Team check (pool + per-member cap) ─────────────────────
    const team = await checkTeamHourBudget(userId);
    if (team.has_team) {
      if (!team.ok) {
        // Per-member cap can NEVER be unblocked by an auto-topup — that
        // belongs to the individual member and the cap is owner policy.
        // Pool exhaustion CAN attempt auto-topup if the team owner enabled it.
        if (team.reason === 'TEAM_POOL_EXHAUSTED') {
          const charged = await tryAutoTopup({ userId, teamId: team.team_id });
          if (charged.ok) {
            res.setHeader('X-Auto-Topup-Charged', `${charged.hours}`);
            return next();
          }
        }
        return res.status(429).json({
          error: team.reason === 'MEMBER_CAP_EXCEEDED'
            ? `You've used your per-member cap (${team.cap_hours} hr) for this period.`
            : 'Your team has used all of its AI hours for this period.',
          code: team.reason,
          team_id: team.team_id,
          pool_hours: team.pool_hours,
          used_hours: team.used_hours,
          cap_hours: team.cap_hours,
          action: team.reason === 'MEMBER_CAP_EXCEEDED' ? 'ask_owner_to_raise_cap' : 'top_up_or_wait',
        });
      }
      res.setHeader('X-Team-Hours-Remaining', String(Math.floor((team.remaining_hours || 0) * 100) / 100));
      return next();
    }

    // ── Personal check (no team) ───────────────────────────────
    const personal = await checkPersonalHourBudget(userId);
    if (personal.fail_open) return next(); // internal error → don't block paying user
    if (!personal.ok) {
      // Same auto-topup escape hatch for solo users who opted in.
      const charged = await tryAutoTopup({ userId });
      if (charged.ok) {
        res.setHeader('X-Auto-Topup-Charged', `${charged.hours}`);
        return next();
      }
      return res.status(429).json({
        error: personal.plan_type === 'free'
          ? "You've used your 30 minutes of free AI time. Subscribe to Pro for 2 hrs/mo, or buy a top-up pack."
          : 'You\'ve used all of your AI hours for this period. Buy a top-up pack to continue.',
        code: 'PERSONAL_POOL_EXHAUSTED',
        plan_type: personal.plan_type,
        pool_hours: personal.pool_hours,
        used_hours: personal.used_hours,
        topup_hours: personal.topup_hours,
        action: personal.plan_type === 'free' ? 'upgrade_or_top_up' : 'top_up_or_wait',
      });
    }
    res.setHeader('X-Personal-Hours-Remaining', String(Math.floor((personal.remaining_hours || 0) * 100) / 100));
  } catch {
    // Fail open — never block on internal error.
  }
  return next();
}

export default hourBudgetGate;
