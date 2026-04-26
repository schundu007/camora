import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { stripe, STRIPE_PRICES, isStripeConfigured } from '../config/stripe.js';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { addCredits } from '../services/creditService.js';
import { logger } from '../middleware/requestLogger.js';

// Valid paid plan_type values — source of truth; add any new Stripe SKU here
// so subscription-verify recognises it.
const PAID_PLAN_TYPES = new Set([
  'capra_content_monthly',
  'capra_content_yearly',
  'starter',
  'pro',
  'pro_max',
  'annual_pro',
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
    // ── Pricing v2 ────────────────────────────────────────────
    capra_content_monthly: {
      priceId: STRIPE_PRICES.CAPRA_CONTENT_MONTHLY,
      amount: 1900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 0,
      overage_per_hour: 1000,
    },
    capra_content_yearly: {
      priceId: STRIPE_PRICES.CAPRA_CONTENT_YEARLY,
      amount: 9900,
      currency: 'usd',
      interval: 'year',
      ai_hours_included: 0,
      overage_per_hour: 1000,
    },
    starter: {
      priceId: STRIPE_PRICES.STARTER,
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 4,
      overage_per_hour: 900,
      includes_desktop: false,
    },
    pro: {
      priceId: STRIPE_PRICES.PRO,
      amount: 5900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 10,
      overage_per_hour: 800,
      includes_desktop: true,
      popular: true,
    },
    pro_max: {
      priceId: STRIPE_PRICES.PRO_MAX,
      amount: 9900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 25,
      overage_per_hour: 700,
      includes_desktop: true,
    },
    annual_pro: {
      priceId: STRIPE_PRICES.ANNUAL_PRO,
      amount: 49900,
      currency: 'usd',
      interval: 'year',
      ai_hours_included: 120,
      overage_per_hour: 700,
      includes_desktop: true,
      pooled_annually: true,
      best_value: true,
    },
    desktop_lifetime: {
      priceId: STRIPE_PRICES.DESKTOP_LIFETIME,
      amount: 9900,
      currency: 'usd',
      interval: null,
      desktop_only: true,
      web_content: false,
    },

    // ── Top-up hour packs ─────────────────────────────────────
    topup_5h: {
      priceId: STRIPE_PRICES.TOPUP_5H,
      amount: 4500,
      currency: 'usd',
      interval: null,
      ai_hours: 5,
    },
    topup_10h: {
      priceId: STRIPE_PRICES.TOPUP_10H,
      amount: 8000,
      currency: 'usd',
      interval: null,
      ai_hours: 10,
    },
    topup_25h: {
      priceId: STRIPE_PRICES.TOPUP_25H,
      amount: 17500,
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
      STRIPE_PRICES.CAPRA_CONTENT_MONTHLY,
      STRIPE_PRICES.CAPRA_CONTENT_YEARLY,
      STRIPE_PRICES.STARTER,
      STRIPE_PRICES.PRO,
      STRIPE_PRICES.PRO_MAX,
      STRIPE_PRICES.ANNUAL_PRO,
      STRIPE_PRICES.DESKTOP_LIFETIME,
      STRIPE_PRICES.TOPUP_5H,
      STRIPE_PRICES.TOPUP_10H,
      STRIPE_PRICES.TOPUP_25H,
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
    else if (priceId === STRIPE_PRICES.CAPRA_CONTENT_MONTHLY) purchaseType = 'capra_content_monthly';
    else if (priceId === STRIPE_PRICES.CAPRA_CONTENT_YEARLY) purchaseType = 'capra_content_yearly';
    else if (priceId === STRIPE_PRICES.STARTER) purchaseType = 'starter';
    else if (priceId === STRIPE_PRICES.PRO) purchaseType = 'pro';
    else if (priceId === STRIPE_PRICES.PRO_MAX) purchaseType = 'pro_max';
    else if (priceId === STRIPE_PRICES.ANNUAL_PRO) purchaseType = 'annual_pro';
    else if (priceId === STRIPE_PRICES.TOPUP_5H) purchaseType = 'topup_5h';
    else if (priceId === STRIPE_PRICES.TOPUP_10H) purchaseType = 'topup_10h';
    else if (priceId === STRIPE_PRICES.TOPUP_25H) purchaseType = 'topup_25h';

    // One-time purchases (Stripe `mode: 'payment'` instead of subscription).
    const isOneTime = purchaseType === 'desktop_lifetime'
      || purchaseType === 'topup_5h'
      || purchaseType === 'topup_10h'
      || purchaseType === 'topup_25h';

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
      sub.plan_type = 'quarterly_pro';
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
 * Verify subscription status (for cross-service verification)
 * Used by jobs.cariara.com to check if user has quarterly_pro access
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

    // Check if user has active paid subscription OR active trial. The old check
    // hard-coded 'monthly' but production stores 'monthly_starter' / 'monthly_pro',
    // making the branch unreachable and silently returning hasAccess=false for
    // paying users.
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

  if (type === 'desktop_lifetime') {
    // Desktop lifetime — record purchase, no web content access
    await query(
      `INSERT INTO ascend_credit_transactions (user_id, type, amount, description)
       VALUES ($1, $2, 0, $3)`,
      [userId, type, 'Desktop Lifetime ($99 one-time)']
    );
    logger.info({ userId, type, sessionId: session.id }, 'Desktop lifetime activated');
  } else {
    // Subscription plan — activate with the type as plan_type
    const planType = type || 'monthly_starter';
    await query(
      `UPDATE ascend_subscriptions SET plan_type = $1, status = 'active' WHERE user_id = $2`,
      [planType, userId]
    );
    logger.info({ userId, planType, sessionId: session.id }, 'Plan activated on checkout');
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

  if (priceId === STRIPE_PRICES.CAPRA_CONTENT_MONTHLY) planType = 'capra_content_monthly';
  else if (priceId === STRIPE_PRICES.CAPRA_CONTENT_YEARLY) planType = 'capra_content_yearly';
  else if (priceId === STRIPE_PRICES.STARTER) planType = 'starter';
  else if (priceId === STRIPE_PRICES.PRO) planType = 'pro';
  else if (priceId === STRIPE_PRICES.PRO_MAX) planType = 'pro_max';
  else if (priceId === STRIPE_PRICES.ANNUAL_PRO) planType = 'annual_pro';

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
