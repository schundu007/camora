/**
 * Billing routes — Stripe checkout, portal, subscription status, webhook.
 *
 * Ported from Python: lumora/backend/app/api/v1/billing.py
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY       — Stripe API secret key
 *   STRIPE_WEBHOOK_SECRET   — Webhook endpoint signing secret
 *   STRIPE_PRICE_MONTHLY    — Price ID for the monthly Pro subscription
 *   STRIPE_PRICE_LIFETIME   — Price ID for the 8-Pack (one-time)
 */
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { getStripe } from '../config/stripe.js';
import { authenticate } from '../middleware/authenticate.js';
import { addTopup } from '../services/usage.js';

const router = Router();

// ---------------------------------------------------------------------------
// SECURITY: Validate redirect URLs against allowed domains (open redirect prevention)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stripe initialisation (lazy — returns null when key is absent)
// ---------------------------------------------------------------------------

const PRICE_MONTHLY  = () => process.env.STRIPE_PRICE_MONTHLY;
const PRICE_LIFETIME = () => process.env.STRIPE_PRICE_LIFETIME;

// ---------------------------------------------------------------------------
// GET /prices — available plans (public)
// ---------------------------------------------------------------------------

router.get('/prices', (_req, res) => {
  // Pricing v2 — keeps the same shape ascend-backend's /prices uses so the
  // frontend's /api/v1/billing/prices reader works whether the request lands
  // on this service or ascend's mirror. SKUs identical to ascend.
  res.json({
    pro_monthly: {
      priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      ai_hours_included: 2,
      overage_per_hour: 1000,
      hour_discount_pct: 0,
      popular: true,
    },
    pro_yearly: {
      priceId: process.env.STRIPE_PRICE_PRO_YEARLY,
      amount: 29000,
      currency: 'usd',
      interval: 'year',
      ai_hours_included: 24,
      overage_per_hour: 1000,
      yearly_savings_pct: 17,
    },
    pro_max_monthly: {
      priceId: process.env.STRIPE_PRICE_PRO_MAX_MONTHLY,
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
      priceId: process.env.STRIPE_PRICE_PRO_MAX_YEARLY,
      amount: 79000,
      currency: 'usd',
      interval: 'year',
      ai_hours_included: 96,
      overage_per_hour: 900,
      includes_desktop: true,
      yearly_savings_pct: 17,
      best_value: true,
    },
    desktop_lifetime: {
      priceId: process.env.STRIPE_PRICE_DESKTOP_LIFETIME || process.env.STRIPR_PRICE_DTOPLT,
      amount: 9900,
      currency: 'usd',
      interval: null,
      seat_limit: 1,
      desktop_only: true,
    },
    business_desktop_lifetime: {
      priceId: process.env.STRIPE_PRICE_BUSINESS_DESKTOP_LIFETIME,
      amount: 99900,
      currency: 'usd',
      interval: null,
      seat_limit: 10,
      desktop_only: true,
      business: true,
    },
    business_starter: {
      priceId: process.env.STRIPE_PRICE_BUSINESS_STARTER,
      amount: 49900,
      currency: 'usd',
      interval: null,
      ai_hours: 75,
      seat_limit: 10,
      payg_rate_per_hour: 800,
    },
    topup_1h: { priceId: process.env.STRIPE_PRICE_TOPUP_1H, amount: 1000, ai_hours: 1, interval: null },
    topup_5h: { priceId: process.env.STRIPE_PRICE_TOPUP_5H, amount: 5000, ai_hours: 5, interval: null },
    topup_25h: { priceId: process.env.STRIPE_PRICE_TOPUP_25H, amount: 25000, ai_hours: 25, interval: null },
  });
});

// ---------------------------------------------------------------------------
// POST /checkout — create Stripe Checkout session
// ---------------------------------------------------------------------------

router.post('/checkout', authenticate, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Billing not configured. STRIPE_SECRET_KEY missing.' });
  }

  const { price_id, success_url, cancel_url } = req.body;
  if (!price_id || !success_url || !cancel_url) {
    return res.status(400).json({ error: 'price_id, success_url, and cancel_url are required' });
  }

  // SECURITY: Validate redirect URLs to prevent open redirects
  if (!isAllowedRedirectUrl(success_url) || !isAllowedRedirectUrl(cancel_url)) {
    return res.status(400).json({ error: 'Invalid redirect URL domain' });
  }

  // Pricing v2 SKU list — kept in sync with ascend-backend/src/config/stripe.js.
  const validPrices = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
    process.env.STRIPE_PRICE_PRO_MAX_MONTHLY,
    process.env.STRIPE_PRICE_PRO_MAX_YEARLY,
    process.env.STRIPE_PRICE_DESKTOP_LIFETIME || process.env.STRIPR_PRICE_DTOPLT,
    process.env.STRIPE_PRICE_BUSINESS_DESKTOP_LIFETIME,
    process.env.STRIPE_PRICE_BUSINESS_STARTER,
    process.env.STRIPE_PRICE_TOPUP_1H,
    process.env.STRIPE_PRICE_TOPUP_5H,
    process.env.STRIPE_PRICE_TOPUP_25H,
  ].filter(Boolean);
  if (!validPrices.includes(price_id)) {
    return res.status(400).json({ error: 'Invalid price ID' });
  }

  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Get or create Stripe customer
    let customerId = null;
    try {
      const result = await query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [userId],
      );
      customerId = result.rows[0]?.stripe_customer_id || null;
    } catch (_err) {
      // Column may not exist yet
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: String(userId) },
      });
      customerId = customer.id;

      try {
        await query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [customerId, userId],
        );
      } catch (_err) {
        // Column may not exist yet
      }
    }

    // Determine payment mode and plan type. v2 SKUs:
    const desktopLifetimeId = process.env.STRIPE_PRICE_DESKTOP_LIFETIME || process.env.STRIPR_PRICE_DTOPLT;
    const businessDesktopId = process.env.STRIPE_PRICE_BUSINESS_DESKTOP_LIFETIME;
    const businessStarterId = process.env.STRIPE_PRICE_BUSINESS_STARTER;
    const topupIds = [
      process.env.STRIPE_PRICE_TOPUP_1H,
      process.env.STRIPE_PRICE_TOPUP_5H,
      process.env.STRIPE_PRICE_TOPUP_25H,
    ].filter(Boolean);
    const oneTimeIds = [desktopLifetimeId, businessDesktopId, businessStarterId, ...topupIds].filter(Boolean);
    const isOneTime = oneTimeIds.includes(price_id);

    // Map price_id to v2 plan_type for webhook metadata.
    let planType = 'pro_monthly';
    if (price_id === process.env.STRIPE_PRICE_PRO_MONTHLY) planType = 'pro_monthly';
    else if (price_id === process.env.STRIPE_PRICE_PRO_YEARLY) planType = 'pro_yearly';
    else if (price_id === process.env.STRIPE_PRICE_PRO_MAX_MONTHLY) planType = 'pro_max_monthly';
    else if (price_id === process.env.STRIPE_PRICE_PRO_MAX_YEARLY) planType = 'pro_max_yearly';
    else if (price_id === desktopLifetimeId) planType = 'desktop_lifetime';
    else if (price_id === businessDesktopId) planType = 'business_desktop_lifetime';
    else if (price_id === businessStarterId) planType = 'business_starter';
    else if (price_id === process.env.STRIPE_PRICE_TOPUP_1H) planType = 'topup_1h';
    else if (price_id === process.env.STRIPE_PRICE_TOPUP_5H) planType = 'topup_5h';
    else if (price_id === process.env.STRIPE_PRICE_TOPUP_25H) planType = 'topup_25h';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url,
      cancel_url,
      metadata: {
        user_id: String(userId),
        plan: planType,
        price_id,
      },
    });

    return res.json({ session_id: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ---------------------------------------------------------------------------
// POST /portal — create Stripe Customer Portal session
// ---------------------------------------------------------------------------

router.post('/portal', authenticate, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  const { return_url } = req.body;
  if (!return_url) {
    return res.status(400).json({ error: 'return_url is required' });
  }

  // SECURITY: Validate redirect URL to prevent open redirects
  if (!isAllowedRedirectUrl(return_url)) {
    return res.status(400).json({ error: 'Invalid redirect URL domain' });
  }

  try {
    const result = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id],
    );
    const customerId = result.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ---------------------------------------------------------------------------
// GET /subscription — current user's subscription status
// ---------------------------------------------------------------------------

router.get('/subscription', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT plan_type, plan_status FROM users WHERE id = $1',
      [req.user.id],
    );
    const row = result.rows[0];
    let plan = row?.plan_type || 'free';
    let status = row?.plan_status || 'active';
    // Admin override: authenticate middleware sets req.user.is_admin from ADMIN_EMAILS.
    if (req.user?.is_admin && (plan === 'free' || !plan)) {
      plan = 'pro_max_yearly';
      status = 'active';
    }
    return res.json({ plan, status });
  } catch (_err) {
    if (req.user?.is_admin) {
      return res.json({ plan: 'pro_max_yearly', status: 'active' });
    }
    return res.json({ plan: 'free', status: 'active' });
  }
});

// ---------------------------------------------------------------------------
// POST /webhook — Stripe webhook handler
//
// CRITICAL: This route MUST receive the raw body for signature verification.
//           Mount it with express.raw() middleware, NOT express.json().
// ---------------------------------------------------------------------------

router.post(
  '/webhook',
  // NOTE: express.raw() is applied globally for this path in index.js
  // so req.body is already a raw Buffer here — needed for Stripe signature verification.
  async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Idempotency: atomic insert — only proceed if this is a new event
    try {
      const inserted = await query(
        'INSERT INTO lumora_stripe_events (event_id, type, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (event_id) DO NOTHING RETURNING event_id',
        [event.id, event.type],
      );
      if (inserted.rows.length === 0) {
        // Already processed — skip
        return res.json({ received: true });
      }
    } catch (_err) {
      // Table may not exist yet — continue processing (migrations may not have run)
    }

    const data = event.data.object;

    try {
      switch (event.type) {
        // ---- Checkout completed (activate plan or apply topup) -----------
        case 'checkout.session.completed': {
          const userId = data.metadata?.user_id;

          // --- Topup payment -------------------------------------------------
          if (data.metadata?.topup_type && userId) {
            const topupType = data.metadata.topup_type;
            const topupAmount = parseInt(data.metadata.topup_amount, 10);
            if (topupType && topupAmount > 0) {
              await addTopup(parseInt(userId, 10), topupType, topupAmount);
              console.log(`Added topup: ${topupAmount} ${topupType} for user ${userId}`);

              // Apply extras (e.g. bonus diagrams bundled with question packs)
              if (data.metadata.topup_extras) {
                try {
                  const extras = JSON.parse(data.metadata.topup_extras);
                  for (const [extraType, extraAmount] of Object.entries(extras)) {
                    await addTopup(parseInt(userId, 10), extraType, extraAmount);
                    console.log(`Added topup extra: ${extraAmount} ${extraType} for user ${userId}`);
                  }
                } catch (parseErr) {
                  console.error('Failed to parse topup_extras:', parseErr);
                }
              }
            }
            break;
          }

          // --- Plan activation -----------------------------------------------
          const plan = data.metadata?.plan || 'pro';
          if (userId) {
            await query(
              "UPDATE users SET plan_type = $1, plan_status = 'active' WHERE id = $2",
              [plan, userId],
            );
            console.log(`Activated ${plan} plan for user ${userId}`);
          }
          break;
        }

        // ---- Subscription updated ----------------------------------------
        case 'customer.subscription.updated': {
          const customerId = data.customer;
          const status = data.status; // active | past_due | canceled | unpaid
          // Derive plan_type from the subscription's price
          const subPriceId = data.items?.data?.[0]?.price?.id;
          const PRICE_M = process.env.STRIPE_PRICE_MONTHLY;
          const PRICE_L = process.env.STRIPE_PRICE_LIFETIME;
          let planType = null;
          if (subPriceId === PRICE_M) planType = 'monthly';
          else if (subPriceId === PRICE_L) planType = 'lifetime';
          if (customerId) {
            if (planType) {
              await query(
                'UPDATE users SET plan_status = $1, plan_type = $2 WHERE stripe_customer_id = $3',
                [status, planType, customerId],
              );
            } else {
              await query(
                'UPDATE users SET plan_status = $1 WHERE stripe_customer_id = $2',
                [status, customerId],
              );
            }
            console.log(`Subscription updated to ${status}${planType ? ` (${planType})` : ''} for customer ${customerId}`);
          }
          break;
        }

        // ---- Subscription deleted (revert to free) -----------------------
        case 'customer.subscription.deleted': {
          const customerId = data.customer;
          if (customerId) {
            await query(
              "UPDATE users SET plan_type = 'free', plan_status = 'canceled' WHERE stripe_customer_id = $1",
              [customerId],
            );
            console.log(`Canceled subscription for customer ${customerId}`);
          }
          break;
        }

        // ---- Invoice paid (reactivate subscription) ----------------------
        case 'invoice.paid': {
          const customerId = data.customer;
          // Find user and ensure subscription is active
          const userResult = await query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [customerId]
          );
          if (userResult.rows.length > 0) {
            await query(
              "UPDATE users SET plan_status = 'active' WHERE id = $1",
              [userResult.rows[0].id]
            );
            console.log(`[Billing] Invoice paid for user ${userResult.rows[0].id}`);
          }
          break;
        }

        // ---- Invoice payment failed --------------------------------------
        case 'invoice.payment_failed': {
          const customerId = data.customer;
          if (customerId) {
            await query(
              "UPDATE users SET plan_status = 'past_due' WHERE stripe_customer_id = $1",
              [customerId],
            );
            console.log(`Payment failed for customer ${customerId}`);
          }
          break;
        }

        default:
          // Unhandled event type — acknowledge receipt
          break;
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(400).json({ error: 'Webhook processing failed' });
    }
  },
);

export default router;
