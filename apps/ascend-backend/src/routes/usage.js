import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import * as usageService from '../services/usageService.js';
import * as freeUsageService from '../services/freeUsageService.js';
import { logger } from '../middleware/requestLogger.js';

const router = Router();

/**
 * Get user's usage info
 * GET /api/usage
 */
router.get('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const usage = await usageService.getUsage(userId);

    res.json({
      usage,
      allowancesPerCredit: usageService.ALLOWANCES_PER_CREDIT,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get usage');
    res.status(500).json({ error: 'Failed to get usage info' });
  }
});

/**
 * Check if user can use a feature
 * GET /api/usage/can-use/:feature
 */
router.get('/can-use/:feature', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.params;
    const minutes = req.query.minutes ? parseInt(req.query.minutes, 10) : 1;

    let result;
    switch (feature) {
      case 'coding':
        result = await usageService.canUseCoding(userId);
        break;
      case 'system-design':
        result = await usageService.canUseSystemDesign(userId);
        break;
      case 'company-prep':
        result = await usageService.canUseCompanyPrep(userId);
        break;
      case 'interview':
        result = await usageService.canUseInterview(userId, minutes);
        break;
      default:
        return res.status(400).json({ error: 'Invalid feature type' });
    }

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to check usage');
    res.status(500).json({ error: 'Failed to check usage' });
  }
});

/**
 * Get user's free trial usage status (freemium model)
 * GET /api/usage/free-status
 */
router.get('/free-status', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get free usage status for all features
    const freeUsage = await freeUsageService.getFreeUsageStatus(userId);

    // Get subscription status
    const subscription = await freeUsageService.getSubscriptionStatus(userId);

    res.json({
      hasSubscription: subscription.hasSubscription,
      planType: subscription.planType,
      status: subscription.status,
      freeUsage: {
        coding: freeUsage.coding,
        design: freeUsage.design,
        company_prep: freeUsage.company_prep,
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get free usage status');
    res.status(500).json({ error: 'Failed to get free usage status' });
  }
});

export default router;
