/**
 * Read-only endpoint for fetching the cached company briefing.
 * Used by the frontend to surface "Sona has read X public posts about
 * NVIDIA" in the topbar tooltip. Refresh is gated to lumora-backend's
 * internal services to avoid letting clients trigger arbitrary
 * outbound HTTP.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getCompanyContext } from '../services/companyContext.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const name = String(req.query.company || '').trim();
    if (!name) return res.status(400).json({ error: 'company query param is required' });
    const briefing = await getCompanyContext(name);
    res.json({
      company: name,
      briefing: briefing || null,
      cached: !!briefing,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
