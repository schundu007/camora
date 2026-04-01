/**
 * Rate Limiting Middleware
 *
 * Protects endpoints from brute force and abuse
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
 * Strict rate limit for auth endpoints (login, register)
 * Prevents brute force attacks
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again in 15 minutes',
  skipSuccessfulRequests: false, // Count all attempts
});

/**
 * Moderate rate limit for API endpoints
 * Prevents abuse while allowing normal usage
 */
export const apiLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please slow down',
});

/**
 * Strict rate limit for expensive operations (AI calls)
 * Prevents cost explosion
 */
export const aiLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute
  message: 'Too many AI requests, please wait a moment',
});

/**
 * Very strict rate limit for subscription/payment endpoints
 */
export const paymentLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 payment-related requests per hour
  message: 'Too many payment requests, please try again later',
});

export default {
  authLimiter,
  apiLimiter,
  aiLimiter,
  paymentLimiter,
};
