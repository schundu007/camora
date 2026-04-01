import { Router } from 'express';
import * as claude from '../services/claude.js';
import * as openai from '../services/openai.js';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';

const router = Router();

router.post('/', validate('fix'), async (req, res, next) => {
  try {
    const { code, error, language, provider = 'openai', problem = '', model } = req.body;

    const service = provider === 'openai' ? openai : claude;
    const result = await service.fixCode(code, error, language, problem, model);

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
