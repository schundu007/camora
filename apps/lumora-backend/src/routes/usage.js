/**
 * Usage routes — current usage stats. (v3.2 hour top-ups go through
 * /api/v1/billing/checkout with priceId=TOPUP_1H + quantity:N.)
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getUsage } from '../services/usage.js';

const router = Router();

// GET / — current usage stats
router.get('/', authenticate, async (req, res) => {
  try {
    const usage = await getUsage(req.user.id);
    return res.json(usage);
  } catch (err) {
    console.error('Usage fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

export default router;
