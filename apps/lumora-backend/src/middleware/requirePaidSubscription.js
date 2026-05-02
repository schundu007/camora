/**
 * Subscription gate for Lumora AI routes.
 *
 * Single source of truth = ascend-backend's `ascend_subscriptions` table.
 * Lumora-backend used to maintain a parallel `users.plan_type` column,
 * but that diverged from ascend whenever a checkout completed and led to
 * paid users being treated as free here. We now read directly from the
 * shared DB.
 *
 * Allowed:
 *   - Owner emails (founders / staff bypass — same as ascend's pattern)
 *   - Active paid subscribers (plan_type ∈ {pro_monthly, pro_yearly, team})
 *   - Users with an unexpired free trial (1 hr / 7 days from signup)
 *
 * Blocked: anyone else gets 402 Payment Required with a code the frontend
 * uses to render the paywall modal.
 *
 * Runs after `authenticate`, so req.user is always present.
 */
import { query } from '../lib/shared-db.js';

const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team']);

const OWNER_EMAILS = new Set(
  (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || 'chundubabu@gmail.com,babuchundu@gmail.com')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
);

function isOwnerEmail(email) {
  return !!email && OWNER_EMAILS.has(String(email).toLowerCase());
}

export async function requirePaidSubscription(req, res, next) {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Owner bypass — staff/founder access without paying.
    if (isOwnerEmail(user.email)) return next();

    // Read entitlement from ascend_subscriptions (the canonical billing table).
    // ascend_free_usage holds trial start/end so we can recognize active trials.
    const r = await query(
      `SELECT s.plan_type,
              s.status,
              s.trial_ends_at,
              fu.trial_started_at,
              fu.trial_expires_at
         FROM ascend_subscriptions s
    LEFT JOIN ascend_free_usage fu ON fu.user_id = s.user_id
        WHERE s.user_id = $1`,
      [user.id],
    );
    const sub = r.rows[0];
    const planType = sub?.plan_type || 'free';
    const status = sub?.status || 'none';

    // Active paid plan
    if (PAID_PLAN_TYPES.has(planType) && status === 'active') {
      return next();
    }

    // Active trial (handled either via subscriptions.trial_ends_at or
    // ascend_free_usage.trial_expires_at depending on which path provisioned it).
    const now = new Date();
    if (sub?.trial_ends_at && new Date(sub.trial_ends_at) > now) return next();
    if (sub?.trial_expires_at && new Date(sub.trial_expires_at) > now) return next();

    return res.status(402).json({
      error: 'Active subscription required for AI features.',
      code: 'SUBSCRIPTION_REQUIRED',
      plan_type: planType,
      status,
    });
  } catch (err) {
    // Fail closed on DB errors — better to send a paywall than free AI.
    // (Stripe webhooks are idempotent; transient DB issues recover quickly.)
    return res.status(503).json({
      error: 'Could not verify subscription. Please retry.',
      code: 'SUBSCRIPTION_CHECK_FAILED',
    });
  }
}
