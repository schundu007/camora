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
  res.json({
    plans: [
      // ── Subscription Plans ──
      {
        id: 'monthly_starter',
        name: 'Monthly Starter',
        price: 2900,
        interval: 'month',
        yearly_total: 34800,
        stripe_price_id: process.env.STRIPE_PRICE_STARTER || null,
        includes_desktop: false,
        features: [
          'Unlimited prep and practice',
          '10 live interview sessions/mo',
          'AI-powered explanations',
          'System design diagrams',
          'Code solutions with complexity',
          'All programming languages',
        ],
        upgrade_note: 'Upgrade to Monthly Pro for desktop access',
      },
      {
        id: 'monthly_pro',
        name: 'Monthly Pro',
        price: 4900,
        interval: 'month',
        yearly_total: 58800,
        stripe_price_id: process.env.STRIPE_PRICE_MONTHLY || null,
        includes_desktop: true,
        features: [
          'Everything in Starter',
          'Unlimited live sessions',
          'Desktop app included',
          'Job discovery and matching',
          'Auto resume and cover letter',
          'Company-specific prep',
          'Speaker voice filtering',
          'Priority AI responses',
        ],
      },
      {
        id: 'quarterly_pro',
        name: 'Quarterly Pro',
        price: 11900,
        interval: 'quarter',
        monthly_equiv: 3967,
        yearly_total: 47600,
        stripe_price_id: process.env.STRIPE_PRICE_QUARTERLY || null,
        includes_desktop: true,
        features: [
          'Everything in Monthly Pro',
          'Save 19% vs monthly',
          'Desktop app included',
          'Full access for 3 months',
        ],
      },
      {
        id: 'annual',
        name: 'Annual (No Desktop)',
        price: 22800,
        interval: 'year',
        monthly_equiv: 1900,
        stripe_price_id: process.env.STRIPE_PRICE_YEARLY || null,
        includes_desktop: false,
        features: [
          'Everything in Monthly Pro (web only)',
          'Save 61% vs monthly',
          'Locked-in pricing for 1 year',
          'Priority support',
        ],
        upgrade_note: 'Add desktop: upgrade to Annual+Desktop or pay $29/mo',
      },
      {
        id: 'annual_desktop',
        name: 'Annual + Desktop',
        price: 29900,
        interval: 'year',
        monthly_equiv: 2492,
        stripe_price_id: process.env.STRIPE_PRICE_ANNUALLY || null,
        includes_desktop: true,
        features: [
          'Everything in Annual',
          'Desktop app included',
          'Full web + desktop for 1 year',
          'Best overall value',
        ],
      },
      {
        id: 'desktop_lifetime',
        name: 'Desktop Lifetime',
        price: 9900,
        interval: null,
        stripe_price_id: process.env.STRIPR_PRICE_DTOPLT || process.env.STRIPE_PRICE_DESKTOP_LIFETIME || null,
        includes_desktop: true,
        desktop_only: true,
        web_content: false,
        features: [
          'Lumora Desktop app forever',
          'Single purchase, no subscription',
          'Bring your own AI keys (OpenAI/Claude)',
          'You pay AI costs directly',
          'No web prep content — buy a web plan separately',
        ],
      },
    ],
    // ── Top-Up Packs (for subscribers who exhaust monthly quota) ──
    topups: [
      {
        id: 'topup_20q',
        name: '20 AI Questions',
        price: 500,
        stripe_price_id: process.env.STRIPE_PRICE_TOPUP_20Q || 'price_1THiZuITUCNxtMxlS1Py7hSO',
        description: '20 additional AI-generated questions',
      },
      {
        id: 'topup_50q',
        name: '50 AI Questions',
        price: 1000,
        stripe_price_id: process.env.STRIPE_PRICE_TOPUP_50Q || 'price_1THiaHITUCNxtMxlQ31IpECl',
        description: '50 additional AI-generated questions',
      },
      {
        id: 'topup_5s',
        name: '5 Sessions',
        price: 1500,
        stripe_price_id: process.env.STRIPE_PRICE_TOPUP_5S || 'price_1THiagITUCNxtMxlG8idH0Cz',
        description: '5 Lumora Desktop sessions (60 min each)',
      },
    ],
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

  const validPrices = [
    process.env.STRIPE_PRICE_STARTER,
    process.env.STRIPE_PRICE_MONTHLY,
    process.env.STRIPE_PRICE_QUARTERLY,
    process.env.STRIPE_PRICE_YEARLY,
    process.env.STRIPE_PRICE_ANNUALLY,
    process.env.STRIPR_PRICE_DTOPLT,
    process.env.STRIPE_PRICE_DESKTOP_LIFETIME,
    process.env.STRIPE_PRICE_TOPUP_20Q || 'price_1THiZuITUCNxtMxlS1Py7hSO',
    process.env.STRIPE_PRICE_TOPUP_50Q || 'price_1THiaHITUCNxtMxlQ31IpECl',
    process.env.STRIPE_PRICE_TOPUP_5S || 'price_1THiagITUCNxtMxlG8idH0Cz',
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

    // Determine payment mode and plan type
    const desktopLifetimeId = process.env.STRIPR_PRICE_DTOPLT || process.env.STRIPE_PRICE_DESKTOP_LIFETIME;
    const topupIds = [
      process.env.STRIPE_PRICE_TOPUP_20Q || 'price_1THiZuITUCNxtMxlS1Py7hSO',
      process.env.STRIPE_PRICE_TOPUP_50Q || 'price_1THiaHITUCNxtMxlQ31IpECl',
      process.env.STRIPE_PRICE_TOPUP_5S || 'price_1THiagITUCNxtMxlG8idH0Cz',
    ];
    const isOneTime = price_id === desktopLifetimeId || topupIds.includes(price_id);

    // Map price_id to plan name for webhook metadata
    let planType = 'monthly_starter';
    if (price_id === process.env.STRIPE_PRICE_STARTER) planType = 'monthly_starter';
    else if (price_id === process.env.STRIPE_PRICE_MONTHLY) planType = 'monthly_pro';
    else if (price_id === process.env.STRIPE_PRICE_QUARTERLY) planType = 'quarterly_pro';
    else if (price_id === process.env.STRIPE_PRICE_YEARLY) planType = 'annual';
    else if (price_id === process.env.STRIPE_PRICE_ANNUALLY) planType = 'annual_desktop';
    else if (price_id === desktopLifetimeId) planType = 'desktop_lifetime';
    else if (topupIds.includes(price_id)) planType = 'topup';

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
      plan = 'quarterly_pro';
      status = 'active';
    }
    return res.json({ plan, status });
  } catch (_err) {
    if (req.user?.is_admin) {
      return res.json({ plan: 'quarterly_pro', status: 'active' });
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
