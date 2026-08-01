import { stripe, STRIPE_PRICES } from '../config/stripe.js';
import { query } from '../lib/shared-db.js';
import { logger } from '../middleware/requestLogger.js';

// Pack metadata — mirrors the /api/v1/billing/prices output. v3 has a
// single 1-hour topup priced at $15.
const TOPUP_PACKS = {
  topup_1h: { hours: 1, amount_cents: 1500, price_id_key: 'TOPUP_1H' },
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

  // Postgres advisory lock keyed on (billing scope, current month).
  // Without this, two concurrent requests both reading the SUM at the
  // same moment can both decide the cap is fine and both call
  // stripe.paymentIntents.create — busting the monthly cap by N×
  // depending on concurrency. The lock is per-scope-per-month so
  // unrelated users / teams aren't blocked by each other.
  //
  // pg_try_advisory_xact_lock returns false instead of waiting if the
  // lock is held — we'd rather fail-soft (caller's gate logic kicks in
  // again with the next request) than queue a request behind another
  // user's payment latency. Lock is auto-released on transaction end;
  // that's why everything below runs inside a single transaction.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const lockScope = teamId ? `team:${teamId}` : `user:${billingUserId}`;
  const lockMonth = `${monthStart.getUTCFullYear()}-${monthStart.getUTCMonth() + 1}`;
  // 32-bit ints expected; hash the scope+month string into two int4s.
  let h1 = 0, h2 = 0;
  for (const ch of `${lockScope}|${lockMonth}`) {
    h1 = ((h1 << 5) - h1 + ch.charCodeAt(0)) | 0;
    h2 = ((h2 << 7) + h1 + ch.charCodeAt(0)) | 0;
  }

  const lockResult = await query('SELECT pg_try_advisory_lock($1, $2) AS got', [h1, h2]);
  if (!lockResult.rows[0]?.got) {
    return { ok: false, reason: 'LOCK_BUSY' };
  }

  try {
    // Monthly cap check — sum of auto-charged top-ups this calendar month.
    // Any prior charges + the candidate charge must stay under the cap.
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

    return await chargeAndCredit({
      billingUserId,
      teamId,
      pack,
      hours,
      amount_cents,
    });
  } finally {
    // Always release. pg_advisory_lock is session-scoped so a dropped
    // connection mid-charge would auto-release; we still call unlock
    // explicitly to free the slot for waiting callers immediately.
    try { await query('SELECT pg_advisory_unlock($1, $2)', [h1, h2]); } catch { /* lock may already be gone */ }
  }
}

/**
 * Disable auto-topup for the correct billing subject.
 *
 * Team auto-topup config lives in the `teams` table (auto_topup_pack), while
 * solo config lives in `ascend_subscriptions`. A decline handler that always
 * cleared ascend_subscriptions was a no-op for teams — the team's flag stayed
 * set, so every subsequent budget exhaustion re-attempted the same declined
 * card, hammering Stripe in a retry loop. Route to the table that actually
 * holds the flag.
 */
export async function disableAutoTopup({ teamId, billingUserId }) {
  if (teamId) {
    await query('UPDATE teams SET auto_topup_pack = NULL WHERE id = $1', [teamId]);
  } else {
    await query('UPDATE ascend_subscriptions SET auto_topup_pack = NULL WHERE user_id = $1', [billingUserId]);
  }
}

/**
 * Charge + credit pipeline extracted so the advisory-lock wrapper above
 * can wrap it in a single try / finally block. This is the same logic
 * that previously lived inline; no behavioural change beyond the lock.
 */
async function chargeAndCredit({ billingUserId, teamId, pack, hours, amount_cents }) {
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
    // Off-session 3DS failures throw with .code === 'authentication_required'
    // — disable auto-topup eagerly so the next request doesn't retry the
    // same broken flow. The async webhook (payment_intent.payment_failed)
    // doesn't always fire for these (the PI sits in requires_action); we
    // handle the sync path here.
    if (err.code === 'authentication_required' || err.code === 'card_declined') {
      try {
        await disableAutoTopup({ teamId, billingUserId });
        logger.info({ billingUserId, teamId, code: err.code }, '[autoTopup] disabled after sync 3DS / decline failure');
      } catch (uErr) {
        logger.warn({ err: uErr.message, billingUserId, teamId }, '[autoTopup] disable-after-fail UPDATE errored');
      }
    }
    return { ok: false, reason: 'CHARGE_FAILED', stripe_error: err.message };
  }

  // 3DS challenge required + we're off-session: PI sits in `requires_action`
  // forever, no async event arrives, and the next request retries the same
  // broken card. Treat as a hard failure AND disable auto-topup so the
  // user notices via the next paywall prompt instead of silently retrying.
  if (pi.status === 'requires_action' || pi.status === 'requires_payment_method') {
    try {
      await disableAutoTopup({ teamId, billingUserId });
      logger.info({ billingUserId, teamId, status: pi.status, pi: pi.id }, '[autoTopup] disabled after off-session requires_action');
    } catch (uErr) {
      logger.warn({ err: uErr.message, billingUserId, teamId }, '[autoTopup] disable-after-stuck UPDATE errored');
    }
    return { ok: false, reason: 'CHARGE_FAILED', payment_status: pi.status };
  }

  if (pi.status !== 'succeeded') {
    return { ok: false, reason: 'CHARGE_FAILED', payment_status: pi.status };
  }

  // Credit the hours. Paid top-ups (manual + auto) never expire.
  // Critical: if the INSERT fails after the Stripe charge succeeded, we have
  // a money-taken-but-hours-not-credited state. Previously this was logged
  // and we returned `{ ok: true }` anyway — the user got their AI call but
  // had no record of the charge, and the next call wouldn't see the
  // refilled pool because the pool still showed empty. Now we surface the
  // failure to the caller so the gate can fail loudly (429) and ops can
  // reconcile by inspecting Stripe charges with no matching topup row.
  try {
    await query(
      `INSERT INTO ai_hour_topups
         (user_id, team_id, hours, amount_cents, stripe_session_id, expires_at, auto_charged, source)
       VALUES ($1, $2, $3, $4, $5, NULL, true, 'auto_topup')
       ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING`,
      [billingUserId, teamId, hours, amount_cents, pi.id],
    );
  } catch (err) {
    logger.error({
      err: err.message, pi: pi.id, billingUserId, teamId, amount_cents,
    }, '[autoTopup] CRITICAL: insert failed after charge succeeded — manual reconcile required');
    return {
      ok: false,
      reason: 'CREDIT_INSERT_FAILED',
      payment_intent: pi.id,
      amount_cents,
      message: 'Charge succeeded but credit insert failed; ops will reconcile.',
    };
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
