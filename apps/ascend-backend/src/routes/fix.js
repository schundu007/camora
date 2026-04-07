import { Router } from 'express';
import * as claude from '../services/claude.js';
import * as openai from '../services/openai.js';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import * as freeUsageService from '../services/freeUsageService.js';

const router = Router();

router.post('/', validate('fix'), async (req, res, next) => {
  try {
    const { code, error, language, provider = 'openai', problem = '', model } = req.body;

    // Select model based on user plan — free users get Haiku, paid users get Sonnet
    let userModel = model;
    if (!userModel && req.user?.id && provider === 'claude') {
      const subStatus = await freeUsageService.getSubscriptionStatus(req.user.id);
      userModel = (subStatus.hasSubscription)
        ? 'claude-sonnet-4-20250514'
        : 'claude-haiku-4-5-20251001';
    }

    const service = provider === 'openai' ? openai : claude;
    const result = await service.fixCode(code, error, language, problem, userModel);

    res.json(result);
  } catch (error) {
    next(new AppError(
      'Failed to fix code',
      ErrorCode.EXTERNAL_API_ERROR,
      error.message
    ));
  }
});

export default router;
