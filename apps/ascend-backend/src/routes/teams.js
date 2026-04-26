import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { logger } from '../middleware/requestLogger.js';
import {
  createTeamForUser,
  getTeamIdForUser,
  getTeamWithMembers,
  getTeamUsageBreakdown,
  createInvite,
  acceptInvite,
  cancelInvite,
  removeMember,
  setMemberCap,
  planSupportsTeam,
} from '../services/teamService.js';
import { sendTeamInviteEmail } from '../services/emailService.js';

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
    return res.json({ team });
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
    return res.json({ team_id: teamId, usage });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user?.id }, '[teams] /me/usage failed');
    return res.status(500).json({ error: 'Failed to load usage' });
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

export default router;
