import { stripe, STRIPE_PRICES } from '../config/stripe.js';
import { query } from '../lib/shared-db.js';
import { logger } from '../middleware/requestLogger.js';

// Pack metadata — mirrors the /api/v1/billing/prices output. Single source
// of truth for what each topup_* SKU buys, so the gate doesn't have to
// re-discover it from Stripe each time.
const TOPUP_PACKS = {
  topup_1h: { hours: 1, amount_cents: 1000, price_id_key: 'TOPUP_1H' },
  topup_5h: { hours: 5, amount_cents: 5000, price_id_key: 'TOPUP_5H' },
  topup_25h: { hours: 25, amount_cents: 25000, price_id_key: 'TOPUP_25H' },
};

/**
 * Try to auto-charge a top-up pack. Returns:
 *   { ok: true, hours, amount_cents }  — charge succeeded, hours credited
 *   { ok: false, reason: 'NOT_ENABLED' | 'CAP_EXCEEDED' | 'NO_PAYMENT_METHOD' |
 *                        'STRIPE_NOT_CONFIGURED' | 'CHARGE_FAILED' }
 *
 * Caller is the hourBudgetGate middleware. Failures here cause the gate
 * to fall through to its normal 429 — never silently allow free hours.
 *
 * Scope rules:
 *   - If the user is in a team and the team owner has auto-topup configured,
 *     charge the OWNER (the team is the billing subject).
 *   - Solo users use their own ascend_subscriptions auto-topup config.
 */
export async function tryAutoTopup({ userId, teamId = null }) {
  if (!stripe) return { ok: false, reason: 'STRIPE_NOT_CONFIGURED' };

  // Resolve who is being charged (owner of the team, or the user themselves)
  // and which auto-topup config applies.
  let billingUserId = userId;
  let pack = null;
  let monthlyCapCents = null;

  if (teamId) {
    const teamRow = await query(
      `SELECT owner_user_id, auto_topup_pack, auto_topup_monthly_cap_cents
         FROM teams WHERE id = $1`,
      [teamId],
    );
    if (!teamRow.rows[0]) return { ok: false, reason: 'NO_TEAM' };
    billingUserId = teamRow.rows[0].owner_user_id;
    pack = teamRow.rows[0].auto_topup_pack;
    monthlyCapCents = teamRow.rows[0].auto_topup_monthly_cap_cents;
  } else {
    const subRow = await query(
      `SELECT auto_topup_pack, auto_topup_monthly_cap_cents
         FROM ascend_subscriptions WHERE user_id = $1`,
      [userId],
    );
    pack = subRow.rows[0]?.auto_topup_pack || null;
    monthlyCapCents = subRow.rows[0]?.auto_topup_monthly_cap_cents || null;
  }

  if (!pack || !TOPUP_PACKS[pack]) return { ok: false, reason: 'NOT_ENABLED' };
  if (!monthlyCapCents) return { ok: false, reason: 'NOT_ENABLED' };

  const { hours, amount_cents } = TOPUP_PACKS[pack];

  // Monthly cap check — sum of auto-charged top-ups this calendar month.
  // Any prior charges + the candidate charge must stay under the cap.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usedRow = await query(
    `SELECT COALESCE(SUM(amount_cents), 0) AS used
       FROM ai_hour_topups
      WHERE ${teamId ? 'team_id = $1' : 'user_id = $1 AND team_id IS NULL'}
        AND auto_charged = true
        AND created_at >= $2`,
    [teamId || billingUserId, monthStart],
  );
  const monthUsedCents = Number(usedRow.rows[0]?.used || 0);
  if (monthUsedCents + amount_cents > monthlyCapCents) {
    return { ok: false, reason: 'CAP_EXCEEDED', month_used_cents: monthUsedCents, cap_cents: monthlyCapCents };
  }

  // Find Stripe customer + default payment method.
  const customerRow = await query(
    `SELECT stripe_customer_id FROM ascend_subscriptions WHERE user_id = $1`,
    [billingUserId],
  );
  const customerId = customerRow.rows[0]?.stripe_customer_id;
  if (!customerId) return { ok: false, reason: 'NO_PAYMENT_METHOD' };

  let customer;
  try {
    customer = await stripe.customers.retrieve(customerId);
  } catch (err) {
    logger.warn({ err: err.message, customerId }, '[autoTopup] customer retrieve failed');
    return { ok: false, reason: 'NO_PAYMENT_METHOD' };
  }
  const defaultPm = customer.invoice_settings?.default_payment_method
    || customer.default_source
    || null;
  if (!defaultPm) return { ok: false, reason: 'NO_PAYMENT_METHOD' };

  // Off-session charge. PaymentIntent is more flexible than re-using a
  // Checkout Session here — we already know the amount and customer,
  // and we don't want to redirect the user mid-LLM-call.
  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      customer: customerId,
      payment_method: typeof defaultPm === 'string' ? defaultPm : defaultPm.id,
      confirm: true,
      off_session: true,
      description: `Camora auto top-up — ${pack} (${hours} hrs)`,
      metadata: {
        user_id: String(billingUserId),
        ...(teamId ? { team_id: String(teamId) } : {}),
        pack,
        auto_charged: 'true',
      },
    });
  } catch (err) {
    logger.warn({ err: err.message, billingUserId, pack }, '[autoTopup] charge failed');
    return { ok: false, reason: 'CHARGE_FAILED', stripe_error: err.message };
  }

  if (pi.status !== 'succeeded') {
    return { ok: false, reason: 'CHARGE_FAILED', payment_status: pi.status };
  }

  // Credit the hours. 90-day expiry like manual top-ups.
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  try {
    await query(
      `INSERT INTO ai_hour_topups
         (user_id, team_id, hours, amount_cents, stripe_session_id, expires_at, auto_charged)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING`,
      [billingUserId, teamId, hours, amount_cents, pi.id, expiresAt],
    );
  } catch (err) {
    logger.error({ err: err.message, pi: pi.id }, '[autoTopup] insert failed after charge succeeded');
    // Money was taken; return ok so the user gets their hours. The insert
    // failure is logged for ops to reconcile.
  }

  logger.info({
    billingUserId, teamId, pack, hours, amount_cents, paymentIntent: pi.id,
  }, '[autoTopup] credited');

  return { ok: true, hours, amount_cents, payment_intent: pi.id };
}

/**
 * Validation helper for the PATCH endpoint that updates auto-topup config.
 * Pack must be a known SKU (or null to disable). Monthly cap must cover
 * at least one of the chosen pack (otherwise enabling it can never charge).
 */
export function validateAutoTopupConfig({ pack, monthlyCapCents }) {
  if (pack === null || pack === undefined) {
    return { ok: true, pack: null, monthly_cap_cents: null };
  }
  if (!TOPUP_PACKS[pack]) {
    return { ok: false, reason: 'INVALID_PACK', valid: Object.keys(TOPUP_PACKS) };
  }
  const cap = Number(monthlyCapCents);
  if (!Number.isFinite(cap) || cap < TOPUP_PACKS[pack].amount_cents) {
    return {
      ok: false,
      reason: 'CAP_TOO_LOW',
      min_cap_cents: TOPUP_PACKS[pack].amount_cents,
      message: `Monthly cap must cover at least one ${pack} ($${TOPUP_PACKS[pack].amount_cents / 100}).`,
    };
  }
  // Also verify the configured price ID is set in env, else off-session
  // charges will fail at attempt time anyway.
  if (!STRIPE_PRICES[TOPUP_PACKS[pack].price_id_key]) {
    return { ok: false, reason: 'PACK_NOT_CONFIGURED', message: `STRIPE_PRICE_${TOPUP_PACKS[pack].price_id_key} is not set on this server.` };
  }
  return { ok: true, pack, monthly_cap_cents: cap };
}

export const TOPUP_PACK_INFO = TOPUP_PACKS;
