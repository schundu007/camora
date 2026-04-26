import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { logger } from '../middleware/requestLogger.js';
import {
  createTeamForUser,
  getTeamIdForUser,
  getTeamWithMembers,
  getTeamUsageBreakdown,
  checkTeamHourBudget,
  checkPersonalHourBudget,
  createInvite,
  acceptInvite,
  cancelInvite,
  removeMember,
  setMemberCap,
  planSupportsTeam,
  maybeSendPoolReminder,
} from '../services/teamService.js';
import { sendTeamInviteEmail } from '../services/emailService.js';
import { validateAutoTopupConfig } from '../services/autoTopupService.js';
import { getSurfaceEstimate, SUPPORTED_SURFACES } from '../services/estimateService.js';

const router = Router();

// Public base URL used in invite links surfaced back to the owner.
function getInviteUrl(token) {
  const base = process.env.FRONTEND_URL || 'https://camora.cariara.com';
  return `${base.replace(/\/+$/, '')}/teams/join/${token}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/teams — create a team owned by the current user
// Eligibility: user must hold a Pro Max sub OR have purchased Business Starter.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body || {};

    // Resolve the user's effective plan_type. If they bought Business Starter
    // it lives in ascend_subscriptions.plan_type too (set on checkout).
    const subRow = await query(
      'SELECT plan_type FROM ascend_subscriptions WHERE user_id = $1',
      [userId],
    );
    const planType = subRow.rows[0]?.plan_type || 'free';

    if (!planSupportsTeam(planType)) {
      return res.status(403).json({
        error: 'Your plan does not support team sharing. Upgrade to Pro Max or buy a Business Starter pack.',
        code: 'PLAN_NOT_TEAM_ELIGIBLE',
        plan_type: planType,
      });
    }

    const team = await createTeamForUser({ userId, planType, name });
    return res.json({ team });
  } catch (err) {
    if (err.code === 'PLAN_NOT_TEAM_ELIGIBLE') {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    logger.error({ err: err.message, userId: req.user?.id }, '[teams] create failed');
    return res.status(500).json({ error: 'Failed to create team' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/teams/me — return the user's team (as owner OR member), or null
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', jwtAuth, async (req, res) => {
  try {
    const teamId = await getTeamIdForUser(req.user.id);
    if (!teamId) return res.json({ team: null });
    const team = await getTeamWithMembers(teamId);
    if (!team) return res.json({ team: null });

    const isOwner = team.owner_user_id === req.user.id;
    // Privacy: non-owners see the roster but not other members' caps or
    // pending invites (those are owner-only management info).
    const filteredMembers = isOwner ? team.members : team.members.map((m) => ({
      ...m,
      per_member_hour_cap: m.user_id === req.user.id ? m.per_member_hour_cap : undefined,
    }));
    return res.json({
      team: {
        ...team,
        members: filteredMembers,
        pending_invites: isOwner ? team.pending_invites : [],
        // Auto-topup is owner billing config — strip for members.
        auto_topup_pack: isOwner ? team.auto_topup_pack : undefined,
        auto_topup_monthly_cap_cents: isOwner ? team.auto_topup_monthly_cap_cents : undefined,
        payg_rate_cents: isOwner ? team.payg_rate_cents : undefined,
        viewer_is_owner: isOwner,
      },
    });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user?.id }, '[teams] /me failed');
    return res.status(500).json({ error: 'Failed to load team' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/teams/me/usage — usage metrics for the team + per-member breakdown
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me/usage', jwtAuth, async (req, res) => {
  try {
    const teamId = await getTeamIdForUser(req.user.id);
    if (!teamId) return res.json({ team: null, usage: null });
    const usage = await getTeamUsageBreakdown(teamId);
    if (!usage) return res.json({ team_id: teamId, usage: null });

    // Privacy: only the team owner sees every member's hours. Members see
    // total pool stats + their own row, never other members'.
    const owner = await query('SELECT owner_user_id FROM teams WHERE id = $1', [teamId]);
    const isOwner = owner.rows[0]?.owner_user_id === req.user.id;
    const filteredMembers = isOwner
      ? usage.members
      : usage.members.filter((m) => m.user_id === req.user.id);

    return res.json({
      team_id: teamId,
      is_owner: isOwner,
      usage: { ...usage, members: filteredMembers },
    });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user?.id }, '[teams] /me/usage failed');
    return res.status(500).json({ error: 'Failed to load usage' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/teams/me/budget — normalized hour-budget view for the
// current user. Always returns a single shape regardless of whether the
// user is in a team or solo, so the frontend renders one meter component.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me/budget', jwtAuth, async (req, res) => {
  try {
    const team = await checkTeamHourBudget(req.user.id);
    if (team.has_team) {
      // Lazy reminder fire (fire-and-forget, never blocks the response).
      // Looks up the team owner's email since the reminder is billing info,
      // and dedups via pool_reminder_*_sent_at columns.
      try {
        const ownerRow = await query(
          `SELECT u.email, u.name FROM teams t JOIN users u ON u.id = t.owner_user_id WHERE t.id = $1`,
          [team.team_id],
        );
        if (ownerRow.rows[0]) {
          maybeSendPoolReminder({
            scope: 'team',
            scopeId: team.team_id,
            ownerEmail: ownerRow.rows[0].email,
            ownerName: ownerRow.rows[0].name,
            poolHours: team.pool_hours,
            usedHours: team.used_hours,
          }).catch(() => {});
        }
      } catch { /* swallow */ }

      return res.json({
        source: 'team',
        team_id: team.team_id,
        pool_hours: team.pool_hours,
        used_hours: team.used_hours,
        remaining_hours: team.ok ? team.remaining_hours : 0,
        plan_pool_hours: team.plan_pool_hours,
        topup_hours: team.topup_hours,
        member_cap_hours: team.member_cap_hours,
        member_used_hours: team.member_used_hours,
        exhausted: !team.ok,
        reason: team.ok ? null : team.reason,
      });
    }
    const personal = await checkPersonalHourBudget(req.user.id);
    // Same lazy reminder for solo users — sent to themselves.
    try {
      if (personal.pool_hours > 0) {
        const userRow = await query('SELECT email, name FROM users WHERE id = $1', [req.user.id]);
        if (userRow.rows[0]) {
          maybeSendPoolReminder({
            scope: 'personal',
            scopeId: req.user.id,
            ownerEmail: userRow.rows[0].email,
            ownerName: userRow.rows[0].name,
            poolHours: personal.pool_hours,
            usedHours: personal.used_hours,
          }).catch(() => {});
        }
      }
    } catch { /* swallow */ }
    return res.json({
      source: 'personal',
      plan_type: personal.plan_type,
      pool_hours: personal.pool_hours,
      used_hours: personal.used_hours,
      remaining_hours: personal.ok ? personal.remaining_hours : 0,
      topup_hours: personal.topup_hours,
      period: personal.period,
      exhausted: !personal.ok,
      reason: personal.ok ? null : personal.reason,
    });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user?.id }, '[teams] /me/budget failed');
    return res.status(500).json({ error: 'Failed to load budget' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/teams/me/estimate?surface=capra_prep
// Pre-call estimate: how many seconds a call to this surface is expected
// to consume, plus whether it would push the user past their pool. Used by
// the frontend to surface "this will use ~Xm of your AI hours" before
// kicking off a long generation.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me/estimate', jwtAuth, async (req, res) => {
  try {
    const surface = String(req.query.surface || '');
    if (!SUPPORTED_SURFACES.includes(surface)) {
      return res.status(400).json({ error: 'Invalid surface', supported: SUPPORTED_SURFACES });
    }
    const est = await getSurfaceEstimate(surface, req.user.id);

    // Pair with current budget so the frontend can render "X of Y remaining"
    // without a second round-trip.
    const team = await checkTeamHourBudget(req.user.id);
    const remainingHours = team.has_team
      ? (team.ok ? team.remaining_hours : 0)
      : (await checkPersonalHourBudget(req.user.id)).remaining_hours;
    const remainingSeconds = (remainingHours || 0) * 3600;

    return res.json({
      surface,
      estimate_seconds: est.estimate_seconds,
      sample_size: est.sample_size,
      source: est.source,
      remaining_seconds: remainingSeconds,
      remaining_hours: remainingHours || 0,
      would_exceed: est.estimate_seconds > remainingSeconds,
    });
  } catch (err) {
    logger.error({ err: err.message }, '[teams] /me/estimate failed');
    return res.status(500).json({ error: 'Failed to compute estimate' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/teams/:teamId/invite — owner creates an invite, gets back a URL
// Body: { email }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:teamId/invite', jwtAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Owner-only
    const owner = await query(
      `SELECT owner_user_id FROM teams WHERE id = $1`,
      [teamId],
    );
    if (!owner.rows[0]) return res.status(404).json({ error: 'Team not found' });
    if (owner.rows[0].owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the team owner can invite members' });
    }

    const { token, expires_at } = await createInvite({
      teamId: Number(teamId),
      email,
      invitedBy: req.user.id,
    });
    const inviteUrl = getInviteUrl(token);

    // Fetch the team name + owner display info for a humane subject line.
    // Falls back gracefully if any of these reads fail — the invite still
    // succeeds even if the email step doesn't.
    let ownerName = req.user.name || null;
    let ownerEmail = req.user.email || null;
    let teamName = null;
    try {
      const ctx = await query(
        `SELECT t.name AS team_name, u.name AS owner_name, u.email AS owner_email
           FROM teams t JOIN users u ON u.id = t.owner_user_id
          WHERE t.id = $1`,
        [teamId],
      );
      if (ctx.rows[0]) {
        teamName = ctx.rows[0].team_name;
        ownerName = ctx.rows[0].owner_name || ownerName;
        ownerEmail = ctx.rows[0].owner_email || ownerEmail;
      }
    } catch { /* fall through to defaults */ }

    // Fire the email — non-blocking. If RESEND_API_KEY is unset, the helper
    // returns null and the response advertises 'manual' delivery so the
    // frontend keeps surfacing the copy-link UI.
    let delivery = 'manual';
    try {
      const sent = await sendTeamInviteEmail({
        to: email,
        ownerName,
        ownerEmail,
        teamName,
        inviteUrl,
        expiresAt: expires_at,
      });
      if (sent) delivery = 'email';
    } catch (err) {
      logger.warn({ err: err.message }, '[teams] email send failed; falling back to manual link');
    }

    return res.json({
      token,
      expires_at,
      invite_url: inviteUrl,
      delivery,
    });
  } catch (err) {
    if (err.code === 'SEAT_LIMIT') {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    logger.error({ err: err.message }, '[teams] invite failed');
    return res.status(500).json({ error: 'Failed to create invite' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/teams/invites/:token/accept — invitee joins the team
// ─────────────────────────────────────────────────────────────────────────────
router.post('/invites/:token/accept', jwtAuth, async (req, res) => {
  try {
    const result = await acceptInvite({ token: req.params.token, userId: req.user.id });
    return res.json({ ok: true, team_id: result.team_id });
  } catch (err) {
    const map = {
      INVITE_NOT_FOUND: 404,
      INVITE_USED: 410,
      INVITE_EXPIRED: 410,
      ALREADY_IN_TEAM: 409,
      SEAT_LIMIT: 409,
    };
    if (map[err.code]) return res.status(map[err.code]).json({ error: err.message, code: err.code });
    logger.error({ err: err.message }, '[teams] accept failed');
    return res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/teams/invites/:token — owner cancels an outstanding invite
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/invites/:token', jwtAuth, async (req, res) => {
  try {
    const ok = await cancelInvite({ token: req.params.token, ownerUserId: req.user.id });
    if (!ok) return res.status(404).json({ error: 'Invite not found or not yours to cancel' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message }, '[teams] cancel invite failed');
    return res.status(500).json({ error: 'Failed to cancel invite' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/teams/:teamId/auto-topup — team owner configures auto top-up
// Body: { pack: 'topup_5h' | null, monthly_cap_cents: number | null }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:teamId/auto-topup', jwtAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { pack, monthly_cap_cents } = req.body || {};

    const owner = await query('SELECT owner_user_id FROM teams WHERE id = $1', [teamId]);
    if (!owner.rows[0]) return res.status(404).json({ error: 'Team not found' });
    if (owner.rows[0].owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the team owner can configure auto top-up' });
    }

    const valid = validateAutoTopupConfig({ pack, monthlyCapCents: monthly_cap_cents });
    if (!valid.ok) return res.status(400).json(valid);

    await query(
      `UPDATE teams SET auto_topup_pack = $1, auto_topup_monthly_cap_cents = $2, updated_at = NOW()
        WHERE id = $3`,
      [valid.pack, valid.monthly_cap_cents, teamId],
    );
    return res.json({ ok: true, pack: valid.pack, monthly_cap_cents: valid.monthly_cap_cents });
  } catch (err) {
    logger.error({ err: err.message }, '[teams] auto-topup config failed');
    return res.status(500).json({ error: 'Failed to update auto top-up' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/teams/:teamId/members/:userId — owner sets per-member hour cap
// Body: { per_member_hour_cap: number | null }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:teamId/members/:userId', jwtAuth, async (req, res) => {
  try {
    const { per_member_hour_cap: cap } = req.body || {};
    const result = await setMemberCap({
      teamId: Number(req.params.teamId),
      targetUserId: Number(req.params.userId),
      requestingUserId: req.user.id,
      capHours: cap === null ? null : Number(cap),
    });
    if (!result.ok) {
      const map = { NO_TEAM: 404, NOT_OWNER: 403, INVALID_CAP: 400, NOT_A_MEMBER: 404 };
      return res.status(map[result.reason] || 400).json({ error: result.reason });
    }
    return res.json({ ok: true, member: result.member });
  } catch (err) {
    logger.error({ err: err.message }, '[teams] set cap failed');
    return res.status(500).json({ error: 'Failed to set cap' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/teams/:teamId/members/:userId — owner removes a member
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:teamId/members/:userId', jwtAuth, async (req, res) => {
  try {
    const result = await removeMember({
      teamId: Number(req.params.teamId),
      targetUserId: Number(req.params.userId),
      requestingUserId: req.user.id,
    });
    if (!result.ok) {
      const map = {
        NO_TEAM: 404,
        NOT_OWNER: 403,
        CANNOT_REMOVE_OWNER: 400,
      };
      return res.status(map[result.reason] || 400).json({ error: result.reason });
    }
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message }, '[teams] remove member failed');
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin endpoints — owner-emails-only. Used by /admin/teams ops dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'chundubabu@gmail.com,babuchundu@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

async function adminGate(req, res, next) {
  const email = (req.user?.email || '').toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  return next();
}

// GET /api/v1/teams/admin/all — every team with members + recent auto-charges
router.get('/admin/all', jwtAuth, adminGate, async (_req, res) => {
  try {
    const teams = await query(
      `SELECT t.id, t.owner_user_id, t.name, t.plan_type, t.seat_limit,
              t.hours_pool_total, t.auto_topup_pack, t.auto_topup_monthly_cap_cents,
              t.created_at,
              u.email AS owner_email, u.name AS owner_name,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
              COALESCE((SELECT SUM(seconds) FROM ai_hours_usage au
                          WHERE au.team_id = t.id
                            AND au.created_at >= t.hours_pool_period_start), 0) AS used_seconds_period,
              COALESCE((SELECT SUM(amount_cents) FROM ai_hour_topups ht
                          WHERE ht.team_id = t.id
                            AND ht.auto_charged = true
                            AND ht.created_at >= NOW() - INTERVAL '30 days'
                            AND ht.refunded_at IS NULL), 0) AS auto_charged_30d_cents
         FROM teams t
         JOIN users u ON u.id = t.owner_user_id
        ORDER BY t.created_at DESC`,
    );
    return res.json({ teams: teams.rows });
  } catch (err) {
    logger.error({ err: err.message }, '[admin] list teams failed');
    return res.status(500).json({ error: 'Failed to list teams' });
  }
});

// POST /api/v1/teams/admin/:teamId/disable-auto-topup — kill switch
router.post('/admin/:teamId/disable-auto-topup', jwtAuth, adminGate, async (req, res) => {
  try {
    await query(
      'UPDATE teams SET auto_topup_pack = NULL, updated_at = NOW() WHERE id = $1',
      [req.params.teamId],
    );
    logger.info({ teamId: req.params.teamId, admin: req.user.email }, '[admin] auto-topup force-disabled');
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message }, '[admin] force-disable failed');
    return res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/v1/teams/admin/:teamId/force-cap-member — set per_member cap admin-style
router.post('/admin/:teamId/force-cap-member', jwtAuth, adminGate, async (req, res) => {
  try {
    const { user_id, cap_hours } = req.body || {};
    const cap = cap_hours === null ? null : Number(cap_hours);
    if (!user_id || (cap !== null && (!Number.isFinite(cap) || cap < 0))) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    await query(
      'UPDATE team_members SET per_member_hour_cap = $1 WHERE team_id = $2 AND user_id = $3',
      [cap, req.params.teamId, user_id],
    );
    logger.info({ teamId: req.params.teamId, userId: user_id, cap, admin: req.user.email }, '[admin] member cap force-set');
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message }, '[admin] force-cap failed');
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
