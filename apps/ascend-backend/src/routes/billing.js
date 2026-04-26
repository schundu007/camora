import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { stripe, STRIPE_PRICES, isStripeConfigured } from '../config/stripe.js';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { addCredits } from '../services/creditService.js';
import { validateAutoTopupConfig } from '../services/autoTopupService.js';
import { logger } from '../middleware/requestLogger.js';

// Valid paid plan_type values — source of truth; add any new Stripe SKU here
// so subscription-verify recognises it.
const PAID_PLAN_TYPES = new Set([
  'pro_monthly',
  'pro_yearly',
  'pro_max_monthly',
  'pro_max_yearly',
]);

// Admin emails get full plan access without a Stripe subscription record.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'chundubabu@gmail.com,babuchundu@gmail.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

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
    // ── 3-plan structure ($10/hr ceiling, Pro Max gets 10% loyalty discount,
    //    yearly saves 17% vs monthly × 12) ──
    pro_monthly: {
      priceId: STRIPE_PRICES.PRO_MONTHLY,
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 2,
      overage_per_hour: 1000,
      hour_discount_pct: 0,
      popular: true,
    },
    pro_yearly: {
      priceId: STRIPE_PRICES.PRO_YEARLY,
      amount: 29000,
      currency: 'usd',
      interval: 'year',
      ai_hours_included: 24,
      overage_per_hour: 1000,
      hour_discount_pct: 0,
      yearly_savings_pct: 17,
    },
    pro_max_monthly: {
      priceId: STRIPE_PRICES.PRO_MAX_MONTHLY,
      amount: 7900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 8,
      overage_per_hour: 900,
      hour_discount_pct: 10,
      includes_desktop: true,
      voice_filtering: true,
    },
    pro_max_yearly: {
      priceId: STRIPE_PRICES.PRO_MAX_YEARLY,
      amount: 79000,
      currency: 'usd',
      interval: 'year',
      ai_hours_included: 96,
      overage_per_hour: 900,
      hour_discount_pct: 10,
      includes_desktop: true,
      voice_filtering: true,
      yearly_savings_pct: 17,
      best_value: true,
    },
    desktop_lifetime: {
      priceId: STRIPE_PRICES.DESKTOP_LIFETIME,
      amount: 9900,
      currency: 'usd',
      interval: null,
      seat_limit: 1,
      desktop_only: true,
      web_content: false,
    },
    business_desktop_lifetime: {
      priceId: STRIPE_PRICES.BUSINESS_DESKTOP_LIFETIME,
      amount: 99900,
      currency: 'usd',
      interval: null,
      seat_limit: 10,
      desktop_only: true,
      web_content: false,
      business: true,
    },

    // ── Camora for Business — one-time starter pack ──────────
    // $499 buys 75 AI hours + 10 team seats. PAYG kicks in at $8/hr
    // after the pack (20% off the consumer $10/hr ceiling) once the
    // auto-topup flow lands in Phase 2; today, business teams that
    // exhaust the pack buy another pack or fall back to top-ups.
    business_starter: {
      priceId: STRIPE_PRICES.BUSINESS_STARTER,
      amount: 49900,
      currency: 'usd',
      interval: null,
      ai_hours: 75,
      seat_limit: 10,
      payg_rate_per_hour: 800,
      best_value: false,
    },

    // ── Top-up hour packs (small/medium/large, flat $10/hr) ──
    topup_1h: {
      priceId: STRIPE_PRICES.TOPUP_1H,
      amount: 1000,
      currency: 'usd',
      interval: null,
      ai_hours: 1,
    },
    topup_5h: {
      priceId: STRIPE_PRICES.TOPUP_5H,
      amount: 5000,
      currency: 'usd',
      interval: null,
      ai_hours: 5,
    },
    topup_25h: {
      priceId: STRIPE_PRICES.TOPUP_25H,
      amount: 25000,
      currency: 'usd',
      interval: null,
      ai_hours: 25,
    },

  });
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
    const { priceId, successUrl, cancelUrl } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Validate redirect URLs against allowed domains
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return res.status(400).json({ error: 'Invalid redirect URL domain' });
    }

    // Validate price ID against the active SKU list.
    const validPrices = [
      STRIPE_PRICES.PRO_MONTHLY,
      STRIPE_PRICES.PRO_YEARLY,
      STRIPE_PRICES.PRO_MAX_MONTHLY,
      STRIPE_PRICES.PRO_MAX_YEARLY,
      STRIPE_PRICES.DESKTOP_LIFETIME,
      STRIPE_PRICES.BUSINESS_DESKTOP_LIFETIME,
      STRIPE_PRICES.TOPUP_1H,
      STRIPE_PRICES.TOPUP_5H,
      STRIPE_PRICES.TOPUP_25H,
      STRIPE_PRICES.BUSINESS_STARTER,
    ].filter(Boolean);

    if (!validPrices.includes(priceId)) {
      return res.status(400).json({ error: 'Invalid price ID' });
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
    if (priceId === STRIPE_PRICES.DESKTOP_LIFETIME) purchaseType = 'desktop_lifetime';
    else if (priceId === STRIPE_PRICES.BUSINESS_DESKTOP_LIFETIME) purchaseType = 'business_desktop_lifetime';
    else if (priceId === STRIPE_PRICES.PRO_MONTHLY) purchaseType = 'pro_monthly';
    else if (priceId === STRIPE_PRICES.PRO_YEARLY) purchaseType = 'pro_yearly';
    else if (priceId === STRIPE_PRICES.PRO_MAX_MONTHLY) purchaseType = 'pro_max_monthly';
    else if (priceId === STRIPE_PRICES.PRO_MAX_YEARLY) purchaseType = 'pro_max_yearly';
    else if (priceId === STRIPE_PRICES.TOPUP_1H) purchaseType = 'topup_1h';
    else if (priceId === STRIPE_PRICES.TOPUP_5H) purchaseType = 'topup_5h';
    else if (priceId === STRIPE_PRICES.TOPUP_25H) purchaseType = 'topup_25h';
    else if (priceId === STRIPE_PRICES.BUSINESS_STARTER) purchaseType = 'business_starter';

    // One-time purchases (Stripe `mode: 'payment'` instead of subscription).
    const isOneTime = purchaseType === 'desktop_lifetime'
      || purchaseType === 'business_desktop_lifetime'
      || purchaseType === 'topup_1h'
      || purchaseType === 'topup_5h'
      || purchaseType === 'topup_25h'
      || purchaseType === 'business_starter';

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

    // Create checkout session
    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId.toString(),
        price_id: priceId,
        type: purchaseType,
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
      sub.plan_type = 'pro_max_yearly';
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
 * Check desktop app download access
 * GET /api/billing/download-access
 */
router.get('/download-access', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has purchased any desktop plan
    const result = await query(
      `SELECT created_at FROM ascend_credit_transactions
       WHERE user_id = $1 AND type IN ('desktop_lifetime', 'desktop_annual', 'desktop_monthly')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasAccess: false });
    }

    // Get download links from environment or use defaults
    const version = process.env.DESKTOP_VERSION || '1.0.0';
    const baseUrl = process.env.DESKTOP_DOWNLOAD_URL ||
      'https://github.com/schundu007/camora/releases/download';

    res.json({
      hasAccess: true,
      purchaseDate: result.rows[0].created_at,
      version,
      downloads: {
        mac: {
          arm64: {
            url: `${baseUrl}/v${version}/Camora-${version}-arm64.dmg`,
            label: 'Mac (Apple Silicon)',
            size: '~102 MB'
          },
          x64: {
            url: `${baseUrl}/v${version}/Camora-${version}-x64.dmg`,
            label: 'Mac (Intel)',
            size: '~107 MB'
          }
        },
        windows: {
          x64: {
            url: `${baseUrl}/v${version}/Camora-${version}-Setup.exe`,
            label: 'Windows (64-bit)',
            size: '~83 MB'
          }
        }
      }
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to check download access');
    res.status(500).json({ error: 'Failed to check download access' });
  }
});

/**
 * Verify subscription status (for cross-service verification).
 * Used by jobs.cariara.com to check if a user holds any active paid plan
 * (pricing v2: pro_monthly / pro_yearly / pro_max_monthly / pro_max_yearly).
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

  // Top-up packs (Phase 3B): record an ai_hour_topups row that extends
  // either the user's personal budget OR their team pool (if they're in
  // one) for the next 90 days. The hourBudgetGate sums unexpired topups
  // into the pool when checking exhaustion.
  const TOPUP_HOURS = { topup_1h: 1, topup_5h: 5, topup_25h: 25 };
  if (TOPUP_HOURS[type]) {
    const hours = TOPUP_HOURS[type];
    const amount = invoice ? null : (session.amount_total || hours * 1000);
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    let teamIdForTopup = null;
    try {
      const r = await query('SELECT team_id FROM team_members WHERE user_id = $1 LIMIT 1', [userId]);
      teamIdForTopup = r.rows[0]?.team_id || null;
    } catch { /* swallow */ }
    // ON CONFLICT guards against duplicate processing if the same checkout
    // session is delivered twice. The unique partial index on
    // stripe_session_id makes this a no-op on retry.
    await query(
      `INSERT INTO ai_hour_topups (user_id, team_id, hours, amount_cents, stripe_session_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING`,
      [userId, teamIdForTopup, hours, amount || hours * 1000, session.id, expiresAt],
    );
    logger.info({ userId, hours, teamId: teamIdForTopup, sessionId: session.id }, 'Top-up credited');
    return; // top-ups don't change subscription state
  }

  if (type === 'desktop_lifetime') {
    await query(
      `INSERT INTO ascend_credit_transactions (user_id, type, amount, description)
       VALUES ($1, $2, 0, $3)`,
      [userId, type, 'Desktop Lifetime ($99 one-time)']
    );
    logger.info({ userId, type, sessionId: session.id }, 'Desktop lifetime activated');
  } else if (type === 'business_desktop_lifetime') {
    // 10-seat desktop license. Auto-create the team so the buyer can
    // immediately invite up to 9 mates without a separate API call.
    await query(
      `INSERT INTO ascend_credit_transactions (user_id, type, amount, description)
       VALUES ($1, $2, 0, $3)`,
      [userId, type, 'Business Desktop Lifetime ($999, 10 seats)']
    );
    await ensureTeamForBusinessPurchase(userId, 'business_desktop_lifetime');
    logger.info({ userId, type, sessionId: session.id }, 'Business desktop lifetime activated + team ready');
  } else if (type === 'business_starter') {
    // One-time pack: 75 hrs + 10 seats. Auto-create team so the buyer can
    // start inviting members without a manual POST /api/v1/teams call.
    await query(
      `UPDATE ascend_subscriptions SET plan_type = 'business_starter', status = 'active' WHERE user_id = $1`,
      [userId]
    );
    await ensureTeamForBusinessPurchase(userId, 'business_starter');
    logger.info({ userId, sessionId: session.id }, 'Business starter pack activated + team ready');
  } else {
    // Subscription plan — activate with the type as plan_type
    const planType = type || 'pro_monthly';
    await query(
      `UPDATE ascend_subscriptions SET plan_type = $1, status = 'active' WHERE user_id = $2`,
      [planType, userId]
    );
    // Pro Max tiers are team-eligible too — auto-create the team so the
    // buyer can invite mates from the upgrade success screen.
    if (planType === 'pro_max_monthly' || planType === 'pro_max_yearly') {
      await ensureTeamForBusinessPurchase(userId, planType);
    }
    logger.info({ userId, planType, sessionId: session.id }, 'Plan activated on checkout');
  }
}

// Helper: idempotently create a team for a user after a team-eligible purchase.
// Failures are logged but never block the rest of webhook processing.
async function ensureTeamForBusinessPurchase(userId, planType) {
  try {
    const { createTeamForUser } = await import('../services/teamService.js');
    await createTeamForUser({ userId, planType });
  } catch (err) {
    logger.warn({ err: err.message, userId, planType }, '[teams] auto-create skipped on purchase');
  }
}

/**
 * Handle paid invoice (subscription renewal)
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

  // Plans are now feature-based (credit system deprecated)
  // Still update subscription period below for plan renewal tracking
  const planType = subscription.plan_type;
  const credits = 0; // Credit system deprecated — plans are feature-based

  if (credits > 0) {
    await addCredits(
      subscription.user_id,
      credits,
      'subscription',
      `${planType} subscription renewal`,
      invoice.id
    );
  }

  // Update subscription period
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    await query(
      `UPDATE ascend_subscriptions SET
        status = 'active',
        current_period_start = $1,
        current_period_end = $2,
        cancel_at_period_end = $3
       WHERE stripe_customer_id = $4`,
      [
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscription.cancel_at_period_end,
        customerId,
      ]
    );
  }

  // Phase 2B: roll over the team's hour pool so the next period starts fresh.
  // Only Pro Max teams have a recurring pool; one-time SKUs (Business Starter,
  // Business Desktop) intentionally don't reset.
  if (planType === 'pro_max_monthly' || planType === 'pro_max_yearly') {
    try {
      const { rollOverTeamPoolForUser } = await import('../services/teamService.js');
      const rolled = await rollOverTeamPoolForUser(subscription.user_id);
      if (rolled) {
        logger.info({ userId: subscription.user_id, teamId: rolled.id, planType }, 'Team pool rolled over');
      }
    } catch (err) {
      logger.warn({ err: err.message, userId: subscription.user_id }, '[teams] rollover skipped on invoice.paid');
    }
  }

  // Phase 7: clear personal pool-low reminder flags so the user gets fresh
  // warnings in the new period. Cheap update; runs for every paid plan.
  try {
    const { rollOverPersonalRemindersForUser } = await import('../services/teamService.js');
    await rollOverPersonalRemindersForUser(subscription.user_id);
  } catch { /* swallow */ }

  logger.info({ userId: subscription.user_id, planType }, 'Invoice paid — subscription renewed');
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
  else if (priceId === STRIPE_PRICES.PRO_MAX_MONTHLY) planType = 'pro_max_monthly';
  else if (priceId === STRIPE_PRICES.PRO_MAX_YEARLY) planType = 'pro_max_yearly';

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
