import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { stripe, STRIPE_PRICES, isStripeConfigured } from '../config/stripe.js';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { addCredits } from '../services/creditService.js';
import { validateAutoTopupConfig } from '../services/autoTopupService.js';
import { SOLO_INCLUDED_HOURS } from '../services/teamService.js';
import { logger } from '../middleware/requestLogger.js';

// Valid paid plan_type values — source of truth for v3.2 pricing.
// 'team' is the dynamic seat-priced team plan (5..50).
const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team']);

// Dynamic team pricing — single Stripe Product, ad-hoc Price per checkout.
// Avoids creating a SKU for every (5..50) seat count. Formula matches
// frontend: price = (seats × $20 − $1) / month.
const TEAM_SEATS_MIN = 5;
const TEAM_SEATS_MAX = 50;
function computeTeamPriceCents(seats) {
  const n = Math.max(TEAM_SEATS_MIN, Math.min(TEAM_SEATS_MAX, Math.floor(Number(seats) || 0)));
  return (n * 20 - 1) * 100;
}
function computeTeamIncludedHours(seats) {
  const n = Math.max(TEAM_SEATS_MIN, Math.min(TEAM_SEATS_MAX, Math.floor(Number(seats) || 0)));
  return Math.ceil(n * 0.7);
}

// Admin emails get full plan access without a Stripe subscription record.
// Read from env only — no in-source fallback. If ADMIN_EMAILS is unset,
// the list is empty and nobody gets the bypass (fail closed). Operator
// must explicitly opt in by setting OWNER_EMAILS / ADMIN_EMAILS on Railway.
const ADMIN_EMAILS = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
if (ADMIN_EMAILS.length === 0) {
  logger.warn('[billing] OWNER_EMAILS/ADMIN_EMAILS unset — no admin bypass active');
}

function safeCompareApiKey(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const router = Router();

// SECURITY: Allowed redirect domains for Stripe checkout/portal callbacks
const ALLOWED_REDIRECT_DOMAINS = [
  'capra.cariara.com',
  'www.capra.cariara.com',
  'camora.cariara.com',
  'cariara.com',
  'www.cariara.com',
  'localhost',
  '127.0.0.1',
];

function isAllowedRedirectUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Get pricing information
 * GET /api/billing/prices
 */
router.get('/prices', (req, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  res.json({
    // ── Solo plans ───────────────────────────────────────────────
    pro_monthly: {
      priceId: STRIPE_PRICES.PRO_MONTHLY,
      amount: 1900,
      currency: 'usd',
      interval: 'month',
      seats: 1,
      included_hours: 2,
      popular: true,
    },
    pro_yearly: {
      priceId: STRIPE_PRICES.PRO_YEARLY,
      amount: 9900,
      currency: 'usd',
      interval: 'year',
      seats: 1,
      included_hours: 5,
      best_value: true,
    },
    // ── Team plan (dynamic, 5..50 seats) ─────────────────────────
    // Single Stripe Product; price computed per checkout via price_data.
    // Frontend POSTs { seats: N } to /checkout (no priceId for team).
    team: {
      dynamic: true,
      currency: 'usd',
      interval: 'month',
      seats_min: TEAM_SEATS_MIN,
      seats_max: TEAM_SEATS_MAX,
      price_per_seat_cents: 2000,
      flat_discount_cents: 100,
      // Helper formula: amount_cents = seats * 2000 - 100
      // Helper formula: included_hours = ceil(seats * 0.7)
      productId: process.env.STRIPE_PRODUCT_TEAM || null,
      team: true,
    },
    // ── Hour top-up ──────────────────────────────────────────────
    // Frontend passes quantity:N to checkout for multi-hour buys.
    // Stripe charges $15 × quantity; webhook credits N hours.
    // Hours never expire (paid).
    topup_1h: {
      priceId: STRIPE_PRICES.TOPUP_1H,
      amount: 1500,
      currency: 'usd',
      interval: null,
      ai_hours: 1,
      supports_quantity: true,
      never_expires: true,
    },
    // ── Free trial ───────────────────────────────────────────────
    trial: {
      ai_hours: 1,
      expires_days: 7,
    },
  });
});

/**
 * Stripe configuration health check (owner-only).
 * GET /api/v1/billing/_health
 *
 * Probes each Stripe ID required by v3.2 pricing and reports green/red so
 * the operator doesn't have to grep Railway logs for "[stripe] Missing IDs".
 * Each price/product is round-tripped to Stripe so we catch ID typos and
 * ID-from-wrong-mode (test vs live) issues, not just env-var presence.
 */
router.get('/_health', jwtAuth, async (req, res) => {
  // Owner-only — exposes which Stripe IDs are missing/wrong, useful for
  // an attacker enumerating mode (test/live) so we lock it down.
  const ownerEmails = new Set(
    (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || 'chundubabu@gmail.com')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  if (!ownerEmails.has(String(req.user?.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const checks = [];
  const addCheck = (name, ok, detail) => checks.push({ name, ok, ...detail });

  // Env presence first (cheap)
  const requireEnv = (name, expected) => addCheck(name, !!expected, expected ? {} : { error: 'Missing on Railway' });
  requireEnv('STRIPE_SECRET_KEY', !!process.env.STRIPE_SECRET_KEY);
  requireEnv('STRIPE_WEBHOOK_SECRET', !!process.env.STRIPE_WEBHOOK_SECRET);
  requireEnv('STRIPE_PRICE_PRO_MONTHLY', STRIPE_PRICES.PRO_MONTHLY);
  requireEnv('STRIPE_PRICE_PRO_YEARLY', STRIPE_PRICES.PRO_YEARLY);
  requireEnv('STRIPE_PRICE_TOPUP_1H', STRIPE_PRICES.TOPUP_1H);
  requireEnv('STRIPE_PRODUCT_TEAM', process.env.STRIPE_PRODUCT_TEAM);

  // Round-trip each Stripe ID — catches typos and test/live mode mismatch
  if (stripe) {
    const probePrice = async (label, id, expected) => {
      if (!id) return; // already flagged by env check above
      try {
        const price = await stripe.prices.retrieve(id);
        const issues = [];
        if (!price.active) issues.push('price is archived');
        if (expected.unit_amount && price.unit_amount !== expected.unit_amount) {
          issues.push(`unit_amount=${price.unit_amount} expected ${expected.unit_amount}`);
        }
        if (expected.recurring === false && price.recurring) issues.push('expected one-time, got recurring');
        if (expected.recurring && !price.recurring) issues.push('expected recurring, got one-time');
        if (expected.interval && price.recurring?.interval !== expected.interval) {
          issues.push(`interval=${price.recurring?.interval} expected ${expected.interval}`);
        }
        addCheck(label, issues.length === 0, issues.length ? { warnings: issues, id } : { id });
      } catch (err) {
        addCheck(label, false, { error: err.message, id });
      }
    };

    await probePrice('price.pro_monthly', STRIPE_PRICES.PRO_MONTHLY, { unit_amount: 1900, recurring: true, interval: 'month' });
    await probePrice('price.pro_yearly', STRIPE_PRICES.PRO_YEARLY, { unit_amount: 9900, recurring: true, interval: 'year' });
    await probePrice('price.topup_1h', STRIPE_PRICES.TOPUP_1H, { unit_amount: 1500, recurring: false });

    // Team product — must exist as a product, must NOT have a fixed price
    if (process.env.STRIPE_PRODUCT_TEAM) {
      try {
        const product = await stripe.products.retrieve(process.env.STRIPE_PRODUCT_TEAM);
        const issues = [];
        if (!product.active) issues.push('product is archived');
        // Warn if a default price is set — team uses dynamic price_data per checkout
        if (product.default_price) issues.push('has default_price; team uses ad-hoc price_data, this should be cleared');
        addCheck('product.team', issues.length === 0, issues.length ? { warnings: issues, id: product.id } : { id: product.id });
      } catch (err) {
        addCheck('product.team', false, { error: err.message, id: process.env.STRIPE_PRODUCT_TEAM });
      }
    }

    // Webhook endpoint — verify one exists pointing at our route
    try {
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const expectedSuffix = '/api/billing/webhook';
      const matching = endpoints.data.filter((ep) => ep.url?.endsWith(expectedSuffix));
      const required = [
        'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed',
        'customer.subscription.updated', 'customer.subscription.deleted', 'payment_intent.payment_failed',
      ];
      if (matching.length === 0) {
        addCheck('webhook.endpoint', false, { error: `No endpoint registered ending in ${expectedSuffix}` });
      } else {
        const ep = matching[0];
        const enabled = new Set(ep.enabled_events || []);
        const missingEvents = ep.enabled_events?.includes('*') ? [] : required.filter((e) => !enabled.has(e));
        addCheck(
          'webhook.endpoint',
          ep.status === 'enabled' && missingEvents.length === 0,
          {
            url: ep.url,
            status: ep.status,
            ...(missingEvents.length ? { missing_events: missingEvents } : {}),
            ...(matching.length > 1 ? { warning: `${matching.length} endpoints match — leaves duplicates` } : {}),
          },
        );
      }
    } catch (err) {
      addCheck('webhook.endpoint', false, { error: err.message });
    }
  }

  const ok = checks.every((c) => c.ok);
  const summary = {
    ok,
    mode: stripe ? (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test') : 'not configured',
    checks,
  };
  res.status(ok ? 200 : 503).json(summary);
});

/**
 * Create checkout session for subscription
 * POST /api/billing/checkout
 */
router.post('/checkout', jwtAuth, async (req, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  try {
    // Two checkout shapes:
    //   (a) Fixed-SKU: { priceId, successUrl, cancelUrl, quantity? }  — solo plans + topup
    //   (b) Dynamic team: { plan: 'team', seats, successUrl, cancelUrl } — single Stripe product, price_data computed live
    // Snake-case aliases (price_id / success_url / cancel_url) accepted for compat.
    const body = req.body || {};
    const priceId = body.priceId || body.price_id;
    const successUrl = body.successUrl || body.success_url;
    const cancelUrl = body.cancelUrl || body.cancel_url;
    const rawQuantity = body.quantity;
    const planParam = body.plan;
    const rawSeats = body.seats;
    const userId = req.user.id;
    const email = req.user.email;
    const isTeamCheckout = planParam === 'team';

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!isTeamCheckout && !priceId) {
      return res.status(400).json({ error: 'Missing priceId' });
    }

    // SECURITY: Validate redirect URLs against allowed domains
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return res.status(400).json({ error: 'Invalid redirect URL domain' });
    }

    // Validate fixed-SKU price IDs against the active list.
    if (!isTeamCheckout) {
      const validPrices = [
        STRIPE_PRICES.PRO_MONTHLY,
        STRIPE_PRICES.PRO_YEARLY,
        STRIPE_PRICES.TOPUP_1H,
      ].filter(Boolean);
      if (!validPrices.includes(priceId)) {
        return res.status(400).json({ error: 'Invalid price ID' });
      }
    }

    // Team checkout: validate seats and require STRIPE_PRODUCT_TEAM env var.
    let teamSeats = 0;
    if (isTeamCheckout) {
      const n = Math.floor(Number(rawSeats) || 0);
      if (n < TEAM_SEATS_MIN || n > TEAM_SEATS_MAX) {
        return res.status(400).json({ error: `Seats must be ${TEAM_SEATS_MIN}..${TEAM_SEATS_MAX}` });
      }
      teamSeats = n;
      if (!process.env.STRIPE_PRODUCT_TEAM) {
        return res.status(503).json({ error: 'Team checkout not configured (STRIPE_PRODUCT_TEAM missing)' });
      }
    }

    // Quantity is only honored for the hour top-up (single price ID,
    // multiplier × N hours via Stripe `quantity` field). For
    // subscriptions / team plans we ignore any client-supplied
    // quantity to prevent abuse — line item is always quantity:1.
    let quantity = 1;
    if (priceId === STRIPE_PRICES.TOPUP_1H) {
      const q = Number(rawQuantity);
      if (Number.isFinite(q) && q >= 1 && q <= 50) {
        quantity = Math.floor(q);
      }
    }

    // Get or create Stripe customer
    const subResult = await query(
      'SELECT stripe_customer_id FROM ascend_subscriptions WHERE user_id = $1',
      [userId]
    );

    let customerId = subResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email,
        metadata: {
          user_id: userId.toString(),
        },
      });
      customerId = customer.id;

      // Save customer ID (upsert — row may not exist for new users)
      await query(
        `INSERT INTO ascend_subscriptions (user_id, stripe_customer_id, plan_type, status)
         VALUES ($1, $2, 'free', 'active')
         ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2`,
        [userId, customerId]
      );
    }

    // Determine purchase type for metadata.
    let purchaseType = 'subscription';
    if (isTeamCheckout) purchaseType = 'team';
    else if (priceId === STRIPE_PRICES.PRO_MONTHLY) purchaseType = 'pro_monthly';
    else if (priceId === STRIPE_PRICES.PRO_YEARLY) purchaseType = 'pro_yearly';
    else if (priceId === STRIPE_PRICES.TOPUP_1H) purchaseType = 'topup_1h';

    // Hour top-ups are gated to active paid subscribers — free users
    // first need a Monthly/Yearly/Team subscription. This prevents
    // hour top-ups from becoming an alternative free path that
    // bypasses the subscription requirement entirely.
    if (purchaseType === 'topup_1h') {
      const userPlanRow = await query(
        'SELECT plan_type, status FROM ascend_subscriptions WHERE user_id = $1',
        [userId]
      );
      const userPlan = userPlanRow.rows[0];
      const isActiveSubscriber = userPlan?.status === 'active'
        && PAID_PLAN_TYPES.has(userPlan.plan_type);
      if (!isActiveSubscriber) {
        return res.status(403).json({
          error: 'Hour top-ups require an active subscription. Subscribe to Monthly, Yearly, or a Team plan first.',
          code: 'SUBSCRIPTION_REQUIRED_FOR_TOPUP',
          upgradeUrl: '/pricing',
        });
      }
    }

    // One-time purchases (Stripe `mode: 'payment'` instead of subscription).
    const isOneTime = purchaseType === 'topup_1h';

    // For subscriptions, don't allow if already subscribed
    if (!isOneTime) {
      const existingSubResult = await query(
        'SELECT plan_type, status FROM ascend_subscriptions WHERE user_id = $1',
        [userId]
      );

      const existingSub = existingSubResult.rows[0];
      if (existingSub?.plan_type !== 'free' && existingSub?.status === 'active') {
        return res.status(400).json({
          error: 'Already have active subscription. Use portal to manage.',
          code: 'ALREADY_SUBSCRIBED',
        });
      }
    }

    // Build the line item — fixed price for solo/topup, ad-hoc price_data for team.
    // tax_behavior MUST be set on price_data when STRIPE_AUTOMATIC_TAX=1, otherwise
    // Stripe rejects checkout with "price_data must include tax_behavior". The
    // static prices have it set in Dashboard; dynamic price_data needs it inline.
    const lineItem = isTeamCheckout
      ? {
          price_data: {
            currency: 'usd',
            product: process.env.STRIPE_PRODUCT_TEAM,
            unit_amount: computeTeamPriceCents(teamSeats),
            recurring: { interval: 'month' },
            tax_behavior: 'exclusive',
          },
          quantity: 1,
        }
      : { price: priceId, quantity };

    // Create checkout session.
    //
    // International billing notes:
    // - payment_method_types omitted → Stripe auto-shows the right methods per
    //   buyer country (UPI for India, BACS for UK, SEPA for EU, etc.) based on
    //   what's enabled in Settings → Payments.
    // - billing_address_collection always 'required' so we know the buyer's
    //   country for invoice / future tax calculation, even before Stripe Tax
    //   is turned on.
    // - tax_id_collection lets EU/UK/India businesses enter VAT/GSTIN for
    //   reverse-charge invoices.
    // - automatic_tax is opt-in via STRIPE_AUTOMATIC_TAX=1 because turning
    //   it on requires every Price to have tax_behavior set in the Dashboard;
    //   leaving it off keeps checkout working until that's done.
    const sessionConfig = {
      customer: customerId,
      line_items: [lineItem],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      ...(process.env.STRIPE_AUTOMATIC_TAX === '1' ? { automatic_tax: { enabled: true } } : {}),
      ...(isOneTime ? {} : {
        subscription_data: {
          metadata: { user_id: userId.toString(), type: purchaseType },
        },
      }),
      metadata: {
        user_id: userId.toString(),
        type: purchaseType,
        // Carry quantity through metadata so the webhook can credit
        // the right number of hours without re-fetching line items.
        // Always set; default 1 for non-topup paths.
        quantity: String(quantity),
        // Team checkout carries seat count instead of a price_id.
        ...(isTeamCheckout ? { seats: String(teamSeats) } : { price_id: priceId }),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Checkout session creation failed');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Create customer portal session
 * POST /api/billing/portal
 */
router.post('/portal', jwtAuth, async (req, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  try {
    const { returnUrl } = req.body;
    const userId = req.user.id;

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing return URL' });
    }

    // SECURITY: Validate returnUrl against allowed domains
    if (!isAllowedRedirectUrl(returnUrl)) {
      return res.status(400).json({ error: 'Invalid return URL domain' });
    }

    // Get Stripe customer ID
    const result = await query(
      'SELECT stripe_customer_id FROM ascend_subscriptions WHERE user_id = $1',
      [userId]
    );

    const customerId = result.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error({ error: error.message }, 'Portal session creation failed');
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * Auto-topup config for solo users (team owners use the per-team endpoint).
 * GET /api/billing/auto-topup → current config
 * PATCH /api/billing/auto-topup → { pack, monthly_cap_cents }
 */
router.get('/auto-topup', jwtAuth, async (req, res) => {
  try {
    const r = await query(
      'SELECT auto_topup_pack, auto_topup_monthly_cap_cents FROM ascend_subscriptions WHERE user_id = $1',
      [req.user.id],
    );
    return res.json({
      pack: r.rows[0]?.auto_topup_pack || null,
      monthly_cap_cents: r.rows[0]?.auto_topup_monthly_cap_cents || null,
    });
  } catch (err) {
    logger.error({ err: err.message }, '[billing] auto-topup get failed');
    return res.status(500).json({ error: 'Failed to load auto top-up config' });
  }
});

router.patch('/auto-topup', jwtAuth, async (req, res) => {
  try {
    const { pack, monthly_cap_cents } = req.body || {};
    const valid = validateAutoTopupConfig({ pack, monthlyCapCents: monthly_cap_cents });
    if (!valid.ok) return res.status(400).json(valid);
    await query(
      `INSERT INTO ascend_subscriptions (user_id, plan_type, status, auto_topup_pack, auto_topup_monthly_cap_cents)
       VALUES ($1, 'free', 'active', $2, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET auto_topup_pack = $2,
             auto_topup_monthly_cap_cents = $3,
             updated_at = NOW()`,
      [req.user.id, valid.pack, valid.monthly_cap_cents],
    );
    return res.json({ ok: true, pack: valid.pack, monthly_cap_cents: valid.monthly_cap_cents });
  } catch (err) {
    logger.error({ err: err.message }, '[billing] auto-topup patch failed');
    return res.status(500).json({ error: 'Failed to update auto top-up' });
  }
});

/**
 * Cancel subscription at period end. Self-serve cancellation — sets
 * cancel_at_period_end on Stripe + locally so the user keeps access until
 * their billing period ends, then drops to free.
 * POST /api/billing/cancel-subscription
 */
router.post('/cancel-subscription', jwtAuth, async (req, res) => {
  if (!isStripeConfigured()) return res.status(503).json({ error: 'Billing not configured' });
  try {
    const subRow = await query(
      'SELECT stripe_subscription_id, plan_type, status, current_period_end FROM ascend_subscriptions WHERE user_id = $1',
      [req.user.id],
    );
    const sub = subRow.rows[0];
    if (!sub?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription to cancel', code: 'NO_SUBSCRIPTION' });
    }
    if (!PAID_PLAN_TYPES.has(sub.plan_type)) {
      return res.status(400).json({ error: 'Subscription is already free', code: 'ALREADY_FREE' });
    }
    // Stripe canonical state — DB tracks the same flag for fast reads.
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    await query(
      'UPDATE ascend_subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE user_id = $1',
      [req.user.id],
    );
    logger.info({ userId: req.user.id, planType: sub.plan_type }, 'Subscription scheduled for cancellation');
    return res.json({
      ok: true,
      cancel_at_period_end: true,
      access_until: sub.current_period_end,
    });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user.id }, '[billing] cancel failed');
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Resume a cancellation — undo cancel_at_period_end before the period ends.
 * POST /api/billing/resume-subscription
 */
router.post('/resume-subscription', jwtAuth, async (req, res) => {
  if (!isStripeConfigured()) return res.status(503).json({ error: 'Billing not configured' });
  try {
    const subRow = await query(
      'SELECT stripe_subscription_id, cancel_at_period_end FROM ascend_subscriptions WHERE user_id = $1',
      [req.user.id],
    );
    const sub = subRow.rows[0];
    if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'No subscription' });
    if (!sub.cancel_at_period_end) return res.json({ ok: true, cancel_at_period_end: false });
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false });
    await query(
      'UPDATE ascend_subscriptions SET cancel_at_period_end = false, updated_at = NOW() WHERE user_id = $1',
      [req.user.id],
    );
    return res.json({ ok: true, cancel_at_period_end: false });
  } catch (err) {
    logger.error({ err: err.message }, '[billing] resume failed');
    return res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

/**
 * Request a refund for a top-up. The actual Stripe refund is NOT issued
 * here — an admin reviews and approves via /api/v1/teams/admin/refund-
 * requests/:id/approve. Returns the request row so the UI can show a
 * "pending review" badge on the top-up.
 * POST /api/billing/refund-topup/:topupId
 * Body: { reason?: string }
 */
router.post('/refund-topup/:topupId', jwtAuth, async (req, res) => {
  try {
    const topupId = Number(req.params.topupId);
    const r = await query(
      `SELECT id, user_id, refunded_at FROM ai_hour_topups WHERE id = $1`,
      [topupId],
    );
    const topup = r.rows[0];
    if (!topup) return res.status(404).json({ error: 'Top-up not found' });
    if (topup.refunded_at) return res.status(400).json({ error: 'Already refunded', code: 'ALREADY_REFUNDED' });
    if (topup.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the buyer can request a refund' });
    }

    try {
      const inserted = await query(
        `INSERT INTO topup_refund_requests (topup_id, user_id, reason)
         VALUES ($1, $2, $3) RETURNING id, status, requested_at`,
        [topupId, req.user.id, (req.body?.reason || '').slice(0, 1000) || null],
      );
      logger.info({ topupId, userId: req.user.id, requestId: inserted.rows[0].id }, 'Refund requested');
      return res.json({
        ok: true,
        request: inserted.rows[0],
        message: 'Refund request submitted. An admin will review and process it within 1-2 business days.',
      });
    } catch (err) {
      // 23505 = unique violation — pending request already exists for this topup.
      if (err.code === '23505') {
        return res.status(409).json({ error: 'A refund request for this top-up is already pending', code: 'ALREADY_PENDING' });
      }
      throw err;
    }
  } catch (err) {
    logger.error({ err: err.message }, '[billing] refund request failed');
    return res.status(500).json({ error: 'Failed to submit refund request' });
  }
});

/**
 * List the user's recent top-ups so the frontend can offer refund.
 * GET /api/billing/topups
 */
router.get('/topups', jwtAuth, async (req, res) => {
  try {
    const r = await query(
      `SELECT t.id, t.hours, t.amount_cents, t.expires_at, t.auto_charged,
              t.refunded_at, t.created_at, t.source,
              (t.refunded_at IS NULL AND (t.expires_at IS NULL OR t.expires_at > NOW())) AS active,
              rr.status AS refund_status,
              rr.requested_at AS refund_requested_at,
              rr.processed_note AS refund_note
         FROM ai_hour_topups t
         LEFT JOIN topup_refund_requests rr
           ON rr.topup_id = t.id
          AND rr.status IN ('pending', 'approved', 'denied')
         WHERE t.user_id = $1
         ORDER BY t.created_at DESC
         LIMIT 50`,
      [req.user.id],
    );
    return res.json({ topups: r.rows });
  } catch (err) {
    logger.error({ err: err.message }, '[billing] list topups failed');
    return res.status(500).json({ error: 'Failed to load top-ups' });
  }
});

/**
 * Get subscription status
 * GET /api/billing/subscription
 */
router.get('/subscription', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || '').toLowerCase();
    const isAdmin = email && ADMIN_EMAILS.includes(email);

    const result = await query(
      'SELECT * FROM ascend_subscriptions WHERE user_id = $1',
      [userId]
    );

    const sub = result.rows[0] || { plan_type: 'free', status: 'active' };

    // Admin override: grant full plan access regardless of Stripe state.
    if (isAdmin && !PAID_PLAN_TYPES.has(sub.plan_type)) {
      sub.plan_type = 'pro_yearly';
      sub.status = 'active';
    }

    // Return both nested (legacy) and flat (frontend AuthContext) shapes so
    // either reader works.
    res.json({
      subscription: sub,
      plan: sub.plan_type,
      plan_type: sub.plan_type,
      status: sub.status,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get subscription');
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

/**
 * Verify subscription status (for cross-service verification).
 * Used by jobs.cariara.com to check if a user holds any active paid plan
 * (pricing v3: pro_monthly / pro_yearly).
 * GET /api/billing/verify-subscription/:userId
 */
router.get('/verify-subscription/:userId', async (req, res) => {
  const { userId } = req.params;
  const apiKey = req.headers['x-api-key'];

  // Verify internal API key for cross-service auth (constant-time compare
  // so we don't leak the key byte-by-byte via response timing).
  if (!process.env.INTERNAL_API_KEY || !safeCompareApiKey(apiKey, process.env.INTERNAL_API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await query(
      'SELECT plan_type, status, current_period_end, trial_ends_at FROM ascend_subscriptions WHERE user_id = $1',
      [userId]
    );

    const subscription = result.rows[0];

    // Check if user has active paid subscription OR active trial. PAID_PLAN_TYPES
    // is the source of truth — keep it in sync with /prices to avoid the
    // unreachable-branch bug where production plan_type values silently fail.
    const isPaidActive = PAID_PLAN_TYPES.has(subscription?.plan_type) &&
                         subscription?.status === 'active';
    const hasActiveTrial = subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date();
    const hasAccess = isPaidActive || hasActiveTrial;

    res.json({
      hasAccess,
      planType: subscription?.plan_type || 'free',
      status: subscription?.status || 'none',
      currentPeriodEnd: subscription?.current_period_end || null,
    });
  } catch (error) {
    logger.error({ error: error.message, userId }, 'Subscription verification failed');
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
});

/**
 * Stripe webhook handler
 * POST /api/billing/webhook
 */
router.post('/webhook', async (req, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature (required in production)
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // Atomic idempotency check — INSERT OR SKIP if already processed
    const idempotencyResult = await query(
      'INSERT INTO ascend_stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id',
      [event.id, event.type]
    );
    if (idempotencyResult.rows.length === 0) {
      logger.info({ eventId: event.id }, 'Duplicate webhook event, skipping');
      return res.json({ received: true });
    }

    // Handle event — wrapped in try/catch to clean up idempotency row on failure
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await handleCheckoutComplete(session);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          await handleInvoicePaid(invoice);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          await handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          // Find user by stripe_customer_id
          const userResult = await query(
            'SELECT user_id FROM ascend_subscriptions WHERE stripe_customer_id = $1',
            [customerId]
          );
          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].user_id;
            await query(
              "UPDATE ascend_subscriptions SET status = 'past_due' WHERE user_id = $1",
              [userId]
            );
            logger.info({ userId, customerId }, 'Subscription marked past_due due to failed payment');
          }
          break;
        }

        // Phase 8: async failure of an off-session auto-topup charge.
        // Synchronous failures already fall through to 429 inside hourBudgetGate,
        // but Stripe can also fire this event later (3DS challenge that times
        // out, bank decline that resolves async). When this happens, disable
        // auto-topup for the customer + email them so they can update their
        // payment method before their next exhaustion.
        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          // Only act on auto-topup charges we initiated — they're tagged in
          // metadata. Manual checkout failures take a different path.
          if (pi.metadata?.auto_charged !== 'true') break;

          const billingUserId = pi.metadata?.user_id ? parseInt(pi.metadata.user_id, 10) : null;
          const teamIdStr = pi.metadata?.team_id;
          if (!billingUserId) break;

          // Disable auto-topup at the right scope so we don't keep retrying
          // a broken card.
          if (teamIdStr) {
            await query(
              'UPDATE teams SET auto_topup_pack = NULL WHERE id = $1',
              [parseInt(teamIdStr, 10)],
            );
          } else {
            await query(
              'UPDATE ascend_subscriptions SET auto_topup_pack = NULL WHERE user_id = $1',
              [billingUserId],
            );
          }

          // Email the user so they know to update their card.
          try {
            const userRow = await query('SELECT email, name FROM users WHERE id = $1', [billingUserId]);
            const user = userRow.rows[0];
            if (user?.email) {
              const { sendPoolReminderEmail } = await import('../services/emailService.js');
              // Reuse the pool-low template with a synthetic critical state —
              // visually it conveys urgency and routes to /account/team where
              // the user can fix the card and re-enable auto-topup.
              await sendPoolReminderEmail({
                to: user.email,
                name: user.name,
                level: 'critical',
                isTeam: !!teamIdStr,
                poolHours: 0,
                usedHours: 0,
                remainingHours: 0,
                accountUrl: `${process.env.FRONTEND_URL || 'https://camora.cariara.com'}/account/team?auto_topup_failed=1`,
              });
            }
          } catch (err) {
            logger.warn({ err: err.message, billingUserId }, '[autoTopup] failure email skipped');
          }

          logger.info({ billingUserId, teamId: teamIdStr, paymentIntent: pi.id }, 'Auto-topup async failure — disabled, user notified');
          break;
        }

        default:
          logger.info({ type: event.type }, 'Unhandled webhook event');
      }
    } catch (handlerError) {
      // Delete idempotency row so Stripe can retry this event
      await query('DELETE FROM ascend_stripe_events WHERE id = $1', [event.id]);
      logger.error({ error: handlerError.message, eventId: event.id }, 'Webhook handler failed, idempotency row removed for retry');
      return res.status(500).json({ error: 'Webhook handler failed' });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error({ error: error.message }, 'Webhook processing failed');
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle completed checkout
 */
async function handleCheckoutComplete(session) {
  const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id, 10) : null;
  const priceId = session.metadata?.price_id;
  const type = session.metadata?.type;

  if (!userId) {
    logger.error({ session: session.id }, 'No user ID in checkout metadata');
    return;
  }

  logger.info({ userId, priceId, type }, 'Processing checkout completion');

  // Hour top-up: $15 × quantity from Stripe checkout. Quantity was
  // stored in session metadata at checkout creation (Stripe doesn't
  // expand line_items on checkout.session.completed by default).
  // Paid top-ups never expire (NULL expires_at). ON CONFLICT guards
  // against duplicate processing.
  if (type === 'topup_1h') {
    const metaQty = parseInt(session.metadata?.quantity || '1', 10);
    const hours = Number.isFinite(metaQty) && metaQty >= 1 ? metaQty : 1;
    const amountTotal = session.amount_total || (1500 * hours);
    await query(
      `INSERT INTO ai_hour_topups (user_id, team_id, hours, amount_cents, stripe_session_id, expires_at, source)
       VALUES ($1, NULL, $2, $3, $4, NULL, 'topup')
       ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING`,
      [userId, hours, amountTotal, session.id],
    );
    logger.info({ userId, hours, sessionId: session.id }, 'Top-up credited (no expiry)');
    return; // top-ups don't change subscription state
  }

  // Subscription plan — activate with the type as plan_type.
  const validTypes = ['pro_monthly', 'pro_yearly', 'team'];
  const planType = validTypes.includes(type) ? type : 'pro_monthly';
  await query(
    `UPDATE ascend_subscriptions SET plan_type = $1, status = 'active' WHERE user_id = $2`,
    [planType, userId]
  );

  // Team plan: auto-create the team using seats from session metadata.
  // Failures are logged but don't block plan activation.
  if (planType === 'team') {
    try {
      const { createTeamForUser } = await import('../services/teamService.js');
      const seats = parseInt(session.metadata?.seats || '0', 10);
      const team = await createTeamForUser({ userId, planType, seats });
      // Set the team's hours pool from the per-cycle included hours so the
      // gate has something to check against.
      const includedHours = computeTeamIncludedHours(seats);
      await query(
        `UPDATE teams SET hours_pool_total = $1, hours_pool_period_start = NOW() WHERE id = $2`,
        [includedHours, team.id],
      );
      logger.info({ userId, planType, seats, includedHours }, 'Team auto-created + pool set');
    } catch (err) {
      logger.warn({ err: err.message, userId, planType }, '[teams] auto-create skipped');
    }
  }

  logger.info({ userId, planType, sessionId: session.id }, 'Plan activated on checkout');
}

/**
 * Handle paid invoice — both initial activation and recurring renewals.
 *
 * Critical: every renewal must re-grant the plan's included AI hours
 * (2 for Monthly, 5 for Yearly, ⌈seats × 0.7⌉ for Team). Without this,
 * paying users hit 429 the moment the new period starts.
 *
 * Idempotency: ai_hour_topups.stripe_invoice_id has a UNIQUE partial
 * index, so re-deliveries of the same invoice never double-credit.
 *
 * Initial-invoice skip: handleCheckoutComplete already grants the first
 * period's hours. Stripe sets `billing_reason='subscription_create'` for
 * the activation invoice — we skip granting on that one to avoid
 * double-counting period 1.
 */
async function handleInvoicePaid(invoice) {
  const customerId = invoice.customer;

  // Find user by customer ID
  const result = await query(
    'SELECT user_id, plan_type FROM ascend_subscriptions WHERE stripe_customer_id = $1',
    [customerId]
  );

  const subscription = result.rows[0];
  if (!subscription) {
    logger.warn({ customerId }, 'No subscription found for customer');
    return;
  }

  const planType = subscription.plan_type;
  const isInitialInvoice = invoice.billing_reason === 'subscription_create';

  // Update subscription period first (read once, use for grant expiry too).
  let periodEnd = null;
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    periodEnd = new Date(stripeSubscription.current_period_end * 1000);

    await query(
      `UPDATE ascend_subscriptions SET
        status = 'active',
        current_period_start = $1,
        current_period_end = $2,
        cancel_at_period_end = $3
       WHERE stripe_customer_id = $4`,
      [
        new Date(stripeSubscription.current_period_start * 1000),
        periodEnd,
        stripeSubscription.cancel_at_period_end,
        customerId,
      ]
    );
  }

  // Grant included AI hours for renewals (skip initial — already granted at checkout).
  // Solo plans: insert into ai_hour_topups with source='subscription' and the
  // invoice id as idempotency key. Team plans: refilled via rollOverTeamPoolForUser
  // below (it recomputes hours_pool_total from current seat_limit).
  if (!isInitialInvoice) {
    const includedHours = SOLO_INCLUDED_HOURS[planType];
    if (includedHours && planType !== 'team') {
      try {
        await query(
          `INSERT INTO ai_hour_topups
            (user_id, team_id, hours, amount_cents, stripe_invoice_id, expires_at, source)
           VALUES ($1, NULL, $2, 0, $3, $4, 'subscription')
           ON CONFLICT (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING`,
          [subscription.user_id, includedHours, invoice.id, periodEnd],
        );
        logger.info(
          { userId: subscription.user_id, planType, includedHours, invoiceId: invoice.id },
          'Renewal hours granted',
        );
      } catch (err) {
        logger.error({ err: err.message, userId: subscription.user_id, invoiceId: invoice.id },
          'Renewal hours grant failed');
      }
    }
  }

  // Phase 7: clear personal pool-low reminder flags so the user gets fresh
  // warnings in the new period. Cheap update; runs for every paid plan.
  // Also roll over the team pool — refills hours_pool_total from current seats.
  try {
    const { rollOverPersonalRemindersForUser, rollOverTeamPoolForUser } = await import('../services/teamService.js');
    await rollOverPersonalRemindersForUser(subscription.user_id);
    await rollOverTeamPoolForUser(subscription.user_id);
  } catch { /* swallow */ }

  logger.info({ userId: subscription.user_id, planType, isInitialInvoice }, 'Invoice paid');
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  // Determine plan type from price ID
  let planType = 'free';
  const priceId = subscription.items.data[0]?.price?.id;

  if (priceId === STRIPE_PRICES.PRO_MONTHLY) planType = 'pro_monthly';
  else if (priceId === STRIPE_PRICES.PRO_YEARLY) planType = 'pro_yearly';
  // Dynamic team: ad-hoc price_data, detected by product ID.
  else if (
    process.env.STRIPE_PRODUCT_TEAM &&
    subscription.items.data[0]?.price?.product === process.env.STRIPE_PRODUCT_TEAM
  ) {
    planType = 'team';
  }

  // Map Stripe status to our status
  let status = subscription.status;
  if (status === 'incomplete' || status === 'incomplete_expired') {
    status = 'past_due';
  }

  await query(
    `UPDATE ascend_subscriptions SET
      stripe_subscription_id = $1,
      plan_type = $2,
      status = $3,
      current_period_start = $4,
      current_period_end = $5,
      cancel_at_period_end = $6
     WHERE stripe_customer_id = $7`,
    [
      subscription.id,
      planType,
      status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      customerId,
    ]
  );

  logger.info({ customerId, planType, status }, 'Subscription updated');
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  await query(
    `UPDATE ascend_subscriptions SET
      plan_type = 'free',
      status = 'canceled',
      stripe_subscription_id = NULL
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  logger.info({ customerId }, 'Subscription canceled');
}

export default router;
