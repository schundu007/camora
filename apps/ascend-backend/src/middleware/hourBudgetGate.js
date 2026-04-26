import { checkTeamHourBudget } from '../services/teamService.js';

/**
 * Pool exhaustion gate for AI-hour-using routes.
 *
 * Mounted alongside aiLimiter. For users in a team, blocks the request with
 * 429 TEAM_POOL_EXHAUSTED once the team has consumed its pool for the period.
 * Solo users (no team) bypass — Phase 3 will add personal-plan budgets.
 *
 * Failures during the lookup fail-open (call goes through). The meter will
 * still record usage; the next call after stale state resolves will be
 * gated correctly.
 */
export async function hourBudgetGate(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(); // unauth requests handled elsewhere

  try {
    const status = await checkTeamHourBudget(userId);
    if (status.has_team && !status.ok) {
      return res.status(429).json({
        error: 'Your team has used all of its AI hours for this period.',
        code: 'TEAM_POOL_EXHAUSTED',
        team_id: status.team_id,
        pool_hours: status.pool_hours,
        used_hours: status.used_hours,
        // Frontend can route to /account/team or surface a top-up prompt.
        action: 'top_up_or_wait',
      });
    }
    // Optionally surface remaining hours so the frontend can show a meter.
    if (status.has_team) {
      res.setHeader('X-Team-Hours-Remaining', String(Math.floor(status.remaining_hours * 100) / 100));
    }
  } catch {
    // Fail open — never block on internal error.
  }
  return next();
}

export default hourBudgetGate;
