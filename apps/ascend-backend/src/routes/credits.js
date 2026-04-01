import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { canCreateCompany, getCreditInfo } from '../services/creditService.js';
import { logger } from '../middleware/requestLogger.js';

const router = Router();

/**
 * Get credit balance and info
 * GET /api/credits
 */
router.get('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const creditInfo = await getCreditInfo(userId);

    res.json(creditInfo);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get credits');
    res.status(500).json({ error: 'Failed to get credit information' });
  }
});

/**
 * Check if user can create a new company
 * GET /api/credits/can-create
 */
router.get('/can-create', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await canCreateCompany(userId);

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to check can-create');
    res.status(500).json({ error: 'Failed to check credit status' });
  }
});

export default router;
