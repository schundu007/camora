/**
 * Playground Rate Limiter Middleware
 *
 * Protects playground endpoints from abuse
 * Limits code run/format/lint operations
 */

import rateLimit from 'express-rate-limit';
import { logger } from './requestLogger.js';

/**
 * Create rate limiter with custom options
 */
function createLimiter(options) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
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
    // Default keyGenerator uses req.ip with IPv6 normalization
    handler: (req, res, next, options) => {
      logger.warn({
        ip: req.ip,
        path: req.path,
        method: req.method,
      }, 'Rate limit exceeded');
      res.status(429).json(options.message);
    },
  });
}

/**
 * Moderate rate limit for playground operations (run, format, lint)
 * Allows normal usage while preventing abuse
 */
export const playgroundLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // lint+explain fire on every edit; 120/min accommodates normal typing
  message: 'Too many playground requests. Try again in a minute.',
});

export default {
  playgroundLimiter,
};
