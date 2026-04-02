/**
 * Usage routes — current usage stats and topup checkout.
 */
import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/authenticate.js';
import { getUsage } from '../services/usage.js';

const router = Router();

// ---------------------------------------------------------------------------
// Topup pack definitions
// ---------------------------------------------------------------------------

const TOPUP_PACKS = [
  { id: 'questions_20', name: '20 AI Questions', price: 500, stripePrice: 'price_1THiZuITUCNxtMxlS1Py7hSO', type: 'questions', amount: 20, extras: { diagrams: 3 } },
  { id: 'questions_50', name: '50 AI Questions', price: 1000, stripePrice: 'price_1THiaHITUCNxtMxlQ31IpECl', type: 'questions', amount: 50, extras: { diagrams: 8 } },
  { id: 'sessions_5', name: '5 Live Sessions', price: 1500, stripePrice: 'price_1THiagITUCNxtMxlG8idH0Cz', type: 'sessions', amount: 5 },
];

// ---------------------------------------------------------------------------
// Stripe helper (lazy init)
// ---------------------------------------------------------------------------

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// ---------------------------------------------------------------------------
// GET / — current usage stats
// ---------------------------------------------------------------------------

router.get('/', authenticate, async (req, res) => {
  try {
    const usage = await getUsage(req.user.id);
    return res.json(usage);
  } catch (err) {
    console.error('Usage fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// ---------------------------------------------------------------------------
// POST /topup — create Stripe checkout for a topup pack
// ---------------------------------------------------------------------------

router.post('/topup', authenticate, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Billing not configured. STRIPE_SECRET_KEY missing.' });
  }

  const { pack_id, success_url, cancel_url } = req.body;
  if (!pack_id || !success_url || !cancel_url) {
    return res.status(400).json({ error: 'pack_id, success_url, and cancel_url are required' });
  }

  const pack = TOPUP_PACKS.find((p) => p.id === pack_id);
  if (!pack) {
    return res.status(400).json({ error: 'Invalid topup pack', available: TOPUP_PACKS.map((p) => p.id) });
  }

  try {
    // Build metadata with primary topup + extras
    const metadata = {
      user_id: String(req.user.id),
      topup_type: pack.type,
      topup_amount: String(pack.amount),
    };
    if (pack.extras) {
      metadata.topup_extras = JSON.stringify(pack.extras);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: pack.stripePrice, quantity: 1 }],
      mode: 'payment',
      success_url,
      cancel_url,
      metadata,
    });

    return res.json({ session_id: session.id, url: session.url });
  } catch (err) {
    console.error('Topup checkout error:', err);
    return res.status(500).json({ error: 'Failed to create topup checkout' });
  }
});

export default router;
