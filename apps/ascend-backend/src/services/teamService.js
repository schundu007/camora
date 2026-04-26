import crypto from 'node:crypto';
import { query } from '../lib/shared-db.js';
import { cacheGet, cacheSet, cacheDel } from './redis.js';
import { logger } from '../middleware/requestLogger.js';

// ── Configuration ──────────────────────────────────────────────────────────

// Seat limits per plan_type. Pro Max plans get 5 seats (owner + 4 mates).
// Business Starter pack and Business Desktop Lifetime both get 10 seats.
// Pro tier, individual Desktop Lifetime, and free are solo.
export const SEAT_LIMITS = {
  pro_monthly: 1,
  pro_yearly: 1,
  pro_max_monthly: 5,
  pro_max_yearly: 5,
  business_starter: 10,
  business_desktop_lifetime: 10,
};

// Hours pool defaults (used at team creation; updated when subscription renews).
// business_desktop_lifetime intentionally has 0 hours — it's a desktop-license
// pool only, not an AI-hour pool.
const HOURS_POOL_BY_PLAN = {
  pro_max_monthly: 8,
  pro_max_yearly: 96,
  business_starter: 75,
  business_desktop_lifetime: 0,
};

// PAYG rate after pool exhaustion, in cents per hour.
const PAYG_RATES_BY_PLAN = {
  pro_max_monthly: 900,    // $9/hr (10% loyalty discount)
  pro_max_yearly: 900,     // $9/hr
  business_starter: 800,   // $8/hr (business discount)
  business_desktop_lifetime: null, // desktop license, no AI hours
};

const TEAM_LOOKUP_CACHE_TTL_SEC = 300;   // 5 min
const TEAM_LOOKUP_PREFIX = 'team:user:v1:';
const INVITE_TTL_DAYS = 14;

// ── Plan-eligibility helpers ───────────────────────────────────────────────

export function getSeatLimitForPlan(planType) {
  return SEAT_LIMITS[planType] || 1;
}

export function planSupportsTeam(planType) {
  return getSeatLimitForPlan(planType) > 1;
}

// ── Read paths (cached) ────────────────────────────────────────────────────

/**
 * Returns the team_id for a user (as owner or member), or null. Cached in
 * Redis with a 5-min TTL so the hot path (PaywallGate, gating middleware,
 * read-side dashboards) stays fast. Cache invalidation happens on every
 * membership change via invalidateTeamCache().
 */
export async function getTeamIdForUser(userId) {
  if (!userId) return null;
  const key = `${TEAM_LOOKUP_PREFIX}${userId}`;
  try {
    const cached = await cacheGet(key);
    if (cached !== null && cached !== undefined) {
      // Sentinel 0 = "looked up, no team". Any positive int = team_id.
      return cached === 0 ? null : Number(cached);
    }
  } catch { /* fall through to DB */ }
  try {
    const r = await query(
      'SELECT team_id FROM team_members WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const teamId = r.rows[0]?.team_id ? Number(r.rows[0].team_id) : null;
    cacheSet(key, teamId === null ? 0 : teamId, TEAM_LOOKUP_CACHE_TTL_SEC).catch(() => {});
    return teamId;
  } catch (err) {
    logger.warn({ err: err.message, userId }, '[teamService] getTeamIdForUser failed');
    return null;
  }
}

export async function invalidateTeamCache(userId) {
  if (!userId) return;
  try { await cacheDel(`${TEAM_LOOKUP_PREFIX}${userId}`); } catch { /* swallow */ }
}

/**
 * Full team record + members + invites for the team-settings UI. Not cached
 * (always reads fresh) since this is the management view.
 */
export async function getTeamWithMembers(teamId) {
  const teamRow = await query(
    `SELECT id, owner_user_id, name, plan_type, seat_limit,
            hours_pool_total, hours_pool_period_start, payg_rate_cents, created_at
       FROM teams WHERE id = $1`,
    [teamId],
  );
  if (!teamRow.rows[0]) return null;
  const team = teamRow.rows[0];

  const membersRow = await query(
    `SELECT tm.user_id, tm.role, tm.per_member_hour_cap, tm.joined_at,
            u.email, u.name, u.avatar
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = $1
      ORDER BY tm.role DESC, tm.joined_at ASC`,
    [teamId],
  );

  const invitesRow = await query(
    `SELECT id, email, invite_token, expires_at, created_at
       FROM team_invites
      WHERE team_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC`,
    [teamId],
  );

  return {
    ...team,
    members: membersRow.rows,
    pending_invites: invitesRow.rows,
  };
}

// ── Usage rollups (the metrics view) ───────────────────────────────────────

/**
 * Per-team total seconds in current period, plus per-member breakdown.
 * Used by GET /api/v1/teams/me/usage and the admin/owner dashboard.
 */
export async function getTeamUsageBreakdown(teamId) {
  const team = await query(
    `SELECT hours_pool_total, hours_pool_period_start
       FROM teams WHERE id = $1`,
    [teamId],
  );
  if (!team.rows[0]) return null;
  const periodStart = team.rows[0].hours_pool_period_start;
  const poolHours = Number(team.rows[0].hours_pool_total || 0);

  const totalRow = await query(
    `SELECT COALESCE(SUM(seconds), 0) AS s
       FROM ai_hours_usage
      WHERE team_id = $1 AND created_at >= $2`,
    [teamId, periodStart],
  );
  const totalSeconds = Number(totalRow.rows[0]?.s || 0);
  const totalHours = totalSeconds / 3600;

  const perMemberRow = await query(
    `SELECT u.id AS user_id, u.email, u.name,
            COALESCE(SUM(au.seconds), 0) AS seconds,
            COUNT(au.id) AS calls
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN ai_hours_usage au
              ON au.user_id = tm.user_id
             AND au.team_id = tm.team_id
             AND au.created_at >= $2
      WHERE tm.team_id = $1
      GROUP BY u.id, u.email, u.name
      ORDER BY seconds DESC`,
    [teamId, periodStart],
  );

  return {
    pool_hours: poolHours,
    used_hours: totalHours,
    remaining_hours: Math.max(0, poolHours - totalHours),
    period_start: periodStart,
    members: perMemberRow.rows.map((r) => ({
      user_id: r.user_id,
      email: r.email,
      name: r.name,
      hours_used: Number(r.seconds || 0) / 3600,
      calls: Number(r.calls || 0),
    })),
  };
}

// ── Pool exhaustion enforcement (Phase 2A) ─────────────────────────────────

/**
 * Check whether the user's team still has hours in their current period.
 * Returns:
 *   { has_team: false }                        — solo user (caller decides what to do)
 *   { has_team: true, ok: true, ... }          — pool has hours remaining
 *   { has_team: true, ok: false, reason: ... } — pool exhausted; caller should 429
 *
 * Cheap query — single round-trip joining teams + ai_hours_usage by team_id +
 * created_at >= period_start. Acceptable on every LLM call; if it ever shows up
 * as a hot-path concern, the result can be cached in Redis with a 30s TTL.
 */
export async function checkTeamHourBudget(userId) {
  const teamId = await getTeamIdForUser(userId);
  if (!teamId) return { has_team: false };

  try {
    const r = await query(
      `SELECT t.id, t.plan_type, t.hours_pool_total, t.hours_pool_period_start,
              COALESCE((
                SELECT SUM(seconds) FROM ai_hours_usage
                 WHERE team_id = t.id AND created_at >= t.hours_pool_period_start
              ), 0) AS used_seconds
         FROM teams t WHERE t.id = $1`,
      [teamId],
    );
    if (!r.rows[0]) return { has_team: false };
    const t = r.rows[0];
    const poolHours = Number(t.hours_pool_total || 0);
    if (poolHours <= 0) {
      // business_desktop_lifetime has no AI pool — let calls through (the
      // owner is expected to top up via packs or a Business Starter sub).
      return { has_team: true, ok: true, pool_hours: 0, used_hours: 0, remaining_hours: Infinity };
    }
    const usedHours = Number(t.used_seconds || 0) / 3600;
    const remaining = poolHours - usedHours;
    if (remaining <= 0) {
      return {
        has_team: true,
        ok: false,
        reason: 'TEAM_POOL_EXHAUSTED',
        team_id: teamId,
        pool_hours: poolHours,
        used_hours: usedHours,
        remaining_hours: 0,
      };
    }
    return {
      has_team: true,
      ok: true,
      team_id: teamId,
      pool_hours: poolHours,
      used_hours: usedHours,
      remaining_hours: remaining,
    };
  } catch (err) {
    logger.warn({ err: err.message, userId }, '[teamService] checkTeamHourBudget failed');
    // Fail open: an internal error checking the budget shouldn't block a paying
    // user from making a call. The metering record will still write.
    return { has_team: false };
  }
}

// ── Period rollover (Phase 2B) ─────────────────────────────────────────────

/**
 * Reset a team's hours_pool_period_start to NOW() so usage rolls forward.
 * Called from the Stripe invoice.paid webhook on subscription renewal.
 * One-time SKUs (business_starter, business_desktop_lifetime) are explicitly
 * not rolled over — those packs are spent until the owner buys another.
 */
export async function rollOverTeamPoolForUser(userId) {
  try {
    const r = await query(
      `UPDATE teams
          SET hours_pool_period_start = NOW(),
              updated_at = NOW()
        WHERE owner_user_id = $1
          AND plan_type IN ('pro_max_monthly', 'pro_max_yearly')
        RETURNING id, plan_type`,
      [userId],
    );
    return r.rows[0] || null;
  } catch (err) {
    logger.warn({ err: err.message, userId }, '[teamService] rollover failed');
    return null;
  }
}

// ── Team CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new team owned by `userId` based on their `planType`. Idempotent:
 * if the user already owns a team, returns it unchanged. Auto-adds the owner
 * as a team_members row so all rollups treat them like any other member.
 */
export async function createTeamForUser({ userId, planType, name }) {
  if (!planSupportsTeam(planType)) {
    throw Object.assign(new Error('Plan does not support team sharing'), { code: 'PLAN_NOT_TEAM_ELIGIBLE' });
  }

  // Idempotency: return existing team if owner already created one
  const existing = await query(
    'SELECT id FROM teams WHERE owner_user_id = $1 LIMIT 1',
    [userId],
  );
  if (existing.rows[0]) {
    return getTeamWithMembers(existing.rows[0].id);
  }

  const seatLimit = getSeatLimitForPlan(planType);
  const hoursPool = HOURS_POOL_BY_PLAN[planType] || null;
  const paygRate = PAYG_RATES_BY_PLAN[planType] || null;

  const created = await query(
    `INSERT INTO teams (owner_user_id, name, plan_type, seat_limit, hours_pool_total, payg_rate_cents)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, name || 'My team', planType, seatLimit, hoursPool, paygRate],
  );
  const teamId = created.rows[0].id;

  // Owner is also a team member (so usage rollups + caps work uniformly).
  await query(
    `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')
     ON CONFLICT (user_id) DO NOTHING`,
    [teamId, userId],
  );

  await invalidateTeamCache(userId);
  return getTeamWithMembers(teamId);
}

export async function canAddMember(teamId) {
  const r = await query(
    `SELECT t.seat_limit, COUNT(tm.id) AS active_members
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
      WHERE t.id = $1
      GROUP BY t.seat_limit`,
    [teamId],
  );
  if (!r.rows[0]) return { ok: false, reason: 'NO_TEAM' };
  const seats = Number(r.rows[0].seat_limit);
  const active = Number(r.rows[0].active_members);
  if (active >= seats) return { ok: false, reason: 'SEAT_LIMIT', seats, active };
  return { ok: true, seats, active };
}

// ── Invites ────────────────────────────────────────────────────────────────

export async function createInvite({ teamId, email, invitedBy }) {
  const seatCheck = await canAddMember(teamId);
  if (!seatCheck.ok && seatCheck.reason === 'SEAT_LIMIT') {
    throw Object.assign(new Error('Team is at seat limit'), { code: 'SEAT_LIMIT' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO team_invites (team_id, email, invite_token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [teamId, email.toLowerCase(), token, invitedBy, expiresAt.toISOString()],
  );

  return { token, expires_at: expiresAt.toISOString() };
}

export async function acceptInvite({ token, userId }) {
  const inv = await query(
    `SELECT id, team_id, email, expires_at, accepted_at
       FROM team_invites WHERE invite_token = $1`,
    [token],
  );
  if (!inv.rows[0]) {
    throw Object.assign(new Error('Invite not found'), { code: 'INVITE_NOT_FOUND' });
  }
  const row = inv.rows[0];
  if (row.accepted_at) {
    throw Object.assign(new Error('Invite already used'), { code: 'INVITE_USED' });
  }
  if (new Date(row.expires_at) < new Date()) {
    throw Object.assign(new Error('Invite expired'), { code: 'INVITE_EXPIRED' });
  }

  const seatCheck = await canAddMember(row.team_id);
  if (!seatCheck.ok && seatCheck.reason === 'SEAT_LIMIT') {
    throw Object.assign(new Error('Team is at seat limit'), { code: 'SEAT_LIMIT' });
  }

  // Move user into team. UNIQUE (user_id) on team_members enforces single
  // membership — if the user is already in another team, surface that error.
  try {
    await query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')`,
      [row.team_id, userId],
    );
  } catch (err) {
    if (err.code === '23505') {
      throw Object.assign(new Error('User is already in a team'), { code: 'ALREADY_IN_TEAM' });
    }
    throw err;
  }

  await query(
    `UPDATE team_invites SET accepted_at = NOW() WHERE id = $1`,
    [row.id],
  );

  await invalidateTeamCache(userId);
  return { team_id: row.team_id };
}

export async function cancelInvite({ token, ownerUserId }) {
  const r = await query(
    `DELETE FROM team_invites
      WHERE invite_token = $1
        AND team_id IN (SELECT id FROM teams WHERE owner_user_id = $2)
      RETURNING id`,
    [token, ownerUserId],
  );
  return r.rows.length > 0;
}

export async function removeMember({ teamId, targetUserId, requestingUserId }) {
  // Only the owner can remove members. Owner cannot remove themselves
  // (delete the team instead — out of scope for this endpoint).
  const owner = await query(
    `SELECT owner_user_id FROM teams WHERE id = $1`,
    [teamId],
  );
  if (!owner.rows[0]) return { ok: false, reason: 'NO_TEAM' };
  if (owner.rows[0].owner_user_id !== requestingUserId) {
    return { ok: false, reason: 'NOT_OWNER' };
  }
  if (targetUserId === requestingUserId) {
    return { ok: false, reason: 'CANNOT_REMOVE_OWNER' };
  }

  const r = await query(
    `DELETE FROM team_members
      WHERE team_id = $1 AND user_id = $2 AND role = 'member'
      RETURNING id`,
    [teamId, targetUserId],
  );

  await invalidateTeamCache(targetUserId);
  return { ok: r.rows.length > 0 };
}
