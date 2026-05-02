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
  // Pricing v3.2 — solo + dynamic team + per-hour topup. Mirrors
  // ascend-backend/src/routes/billing.js so the frontend's /prices reader
  // works against either service.
  res.json({
    pro_monthly: {
      priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
      amount: 1900,
      currency: 'usd',
      interval: 'month',
      seats: 1,
      included_hours: 2,
      popular: true,
    },
    pro_yearly: {
      priceId: process.env.STRIPE_PRICE_PRO_YEARLY,
      amount: 9900,
      currency: 'usd',
      interval: 'year',
      seats: 1,
      included_hours: 5,
      best_value: true,
    },
    // Dynamic team — single Stripe Product, price computed per checkout.
    team: {
      dynamic: true,
      currency: 'usd',
      interval: 'month',
      seats_min: 5,
      seats_max: 50,
      price_per_seat_cents: 2000,
      flat_discount_cents: 100,
      productId: process.env.STRIPE_PRODUCT_TEAM || null,
      team: true,
    },
    topup_1h: {
      priceId: process.env.STRIPE_PRICE_TOPUP_1H,
      amount: 1500,
      currency: 'usd',
      interval: null,
      ai_hours: 1,
      supports_quantity: true,
      never_expires: true,
    },
    trial: { ai_hours: 1, expires_days: 7 },
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

  // Two checkout shapes:
  //   (a) Fixed-SKU: { price_id, success_url, cancel_url, quantity? }
  //   (b) Dynamic team: { plan: 'team', seats, success_url, cancel_url }
  const { price_id, success_url, cancel_url, quantity: rawQuantity, plan, seats: rawSeats } = req.body;
  const isTeamCheckout = plan === 'team';

  if (!success_url || !cancel_url) {
    return res.status(400).json({ error: 'success_url and cancel_url are required' });
  }
  if (!isTeamCheckout && !price_id) {
    return res.status(400).json({ error: 'price_id is required' });
  }

  // SECURITY: Validate redirect URLs to prevent open redirects
  if (!isAllowedRedirectUrl(success_url) || !isAllowedRedirectUrl(cancel_url)) {
    return res.status(400).json({ error: 'Invalid redirect URL domain' });
  }

  // Pricing v3.2 — solo + dynamic team + topup. Mirrors ascend-backend.
  if (!isTeamCheckout) {
    const validPrices = [
      process.env.STRIPE_PRICE_PRO_MONTHLY,
      process.env.STRIPE_PRICE_PRO_YEARLY,
      process.env.STRIPE_PRICE_TOPUP_1H,
    ].filter(Boolean);
    if (!validPrices.includes(price_id)) {
      return res.status(400).json({ error: 'Invalid price ID' });
    }
  }

  // Validate dynamic team params.
  const TEAM_SEATS_MIN = 5;
  const TEAM_SEATS_MAX = 50;
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

    // Only the hour topup is one-time; subscriptions (solo + team) go
    // through Stripe `mode: 'subscription'`.
    const isOneTime = !isTeamCheckout && price_id === process.env.STRIPE_PRICE_TOPUP_1H;

    // Quantity is only honored for hour top-ups (1..50). Non-topup
    // line items always quantity:1.
    let quantity = 1;
    if (isOneTime) {
      const q = Number(rawQuantity);
      if (Number.isFinite(q) && q >= 1 && q <= 50) quantity = Math.floor(q);
    }

    // Map price_id to plan_type for webhook metadata.
    let planType = 'pro_monthly';
    if (isTeamCheckout) planType = 'team';
    else if (price_id === process.env.STRIPE_PRICE_PRO_MONTHLY) planType = 'pro_monthly';
    else if (price_id === process.env.STRIPE_PRICE_PRO_YEARLY) planType = 'pro_yearly';
    else if (price_id === process.env.STRIPE_PRICE_TOPUP_1H) planType = 'topup_1h';

    // Hour top-up gated to active paid subscribers — free users
    // need a Monthly/Yearly/Team subscription first.
    if (planType === 'topup_1h') {
      try {
        const r = await query('SELECT plan_type, plan_status FROM users WHERE id = $1', [userId]);
        const userPlan = r.rows[0];
        const PAID = new Set(['pro_monthly', 'pro_yearly', 'team', 'team_5', 'team_10', 'team_15']);
        const isActive = userPlan?.plan_status === 'active' && PAID.has(userPlan.plan_type);
        if (!isActive) {
          return res.status(403).json({
            error: 'Hour top-ups require an active subscription. Subscribe to Monthly, Yearly, or a Team plan first.',
            code: 'SUBSCRIPTION_REQUIRED_FOR_TOPUP',
            upgradeUrl: '/pricing',
          });
        }
      } catch (_err) {
        return res.status(403).json({
          error: 'Cannot verify subscription. Please refresh and try again.',
          code: 'SUBSCRIPTION_CHECK_FAILED',
        });
      }
    }

    // Build the line item — fixed price for solo/topup, ad-hoc price_data for team.
    const teamPriceCents = isTeamCheckout ? (teamSeats * 20 - 1) * 100 : 0;
    const lineItem = isTeamCheckout
      ? {
          price_data: {
            currency: 'usd',
            product: process.env.STRIPE_PRODUCT_TEAM,
            unit_amount: teamPriceCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }
      : { price: price_id, quantity };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url,
      cancel_url,
      metadata: {
        user_id: String(userId),
        plan: planType,
        // Carry quantity to webhook so it can credit the right number
        // of hours without re-fetching line items.
        quantity: String(quantity),
        ...(isTeamCheckout ? { seats: String(teamSeats) } : { price_id }),
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
      plan = 'pro_yearly';
      status = 'active';
    }
    return res.json({ plan, status });
  } catch (_err) {
    if (req.user?.is_admin) {
      return res.json({ plan: 'pro_yearly', status: 'active' });
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
          const plan = data.metadata?.plan;

          // --- Legacy topup packs (questions/sessions) ----------------------
          if (data.metadata?.topup_type && userId) {
            const topupType = data.metadata.topup_type;
            const topupAmount = parseInt(data.metadata.topup_amount, 10);
            if (topupType && topupAmount > 0) {
              await addTopup(parseInt(userId, 10), topupType, topupAmount);
              console.log(`Added legacy topup: ${topupAmount} ${topupType} for user ${userId}`);
              if (data.metadata.topup_extras) {
                try {
                  const extras = JSON.parse(data.metadata.topup_extras);
                  for (const [extraType, extraAmount] of Object.entries(extras)) {
                    await addTopup(parseInt(userId, 10), extraType, extraAmount);
                  }
                } catch (parseErr) {
                  console.error('Failed to parse topup_extras:', parseErr);
                }
              }
            }
            break;
          }

          // --- v3 hour top-up: never expires, written to ai_hour_topups ----
          if (plan === 'topup_1h' && userId) {
            const metaQty = parseInt(data.metadata?.quantity || '1', 10);
            const hours = Number.isFinite(metaQty) && metaQty >= 1 ? metaQty : 1;
            const amountTotal = data.amount_total || (1500 * hours);
            try {
              await query(
                `INSERT INTO ai_hour_topups (user_id, team_id, hours, amount_cents, stripe_session_id, expires_at, source)
                 VALUES ($1, NULL, $2, $3, $4, NULL, 'topup')
                 ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING`,
                [parseInt(userId, 10), hours, amountTotal, data.id],
              );
              console.log(`Top-up credited: ${hours}h for user ${userId} (no expiry)`);
            } catch (e) {
              console.error('Top-up insert failed:', e.message);
            }
            break;
          }

          // --- Subscription plan activation --------------------------------
          // plan: 'pro_monthly' | 'pro_yearly' | 'team' | 'team_5/10/15' (legacy)
          if (plan && userId) {
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
          const item = data.items?.data?.[0];
          const subPriceId = item?.price?.id;
          const subProductId = item?.price?.product;
          let planType = null;
          if (subPriceId === process.env.STRIPE_PRICE_PRO_MONTHLY) planType = 'pro_monthly';
          else if (subPriceId === process.env.STRIPE_PRICE_PRO_YEARLY) planType = 'pro_yearly';
          else if (process.env.STRIPE_PRODUCT_TEAM && subProductId === process.env.STRIPE_PRODUCT_TEAM) planType = 'team';
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
