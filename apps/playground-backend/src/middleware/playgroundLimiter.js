import rateLimit from 'express-rate-limit';
import { logger } from './requestLogger.js';

function createLimiter(options) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { error: message, code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests,
    skipSuccessfulRequests,
    handler: (req, res, next, options) => {
      logger.warn({ ip: req.ip, path: req.path, method: req.method }, 'Rate limit exceeded');
      res.status(429).json(options.message);
    },
  });
}

export const playgroundLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: 'Too many playground requests. Try again in a minute.',
});

export default { playgroundLimiter };
