/**
 * Per-IP rate limiting for lumora-backend.
 *
 * Four tiers matching the project convention (see CLAUDE.md):
 *   authLimiter    — 10 attempts / 15 min  (brute-force defense)
 *   apiLimiter     — 60 req / 1 min        (general /api/v1/* baseline)
 *   aiLimiter      — 20 req / 1 min        (Anthropic / OpenAI cost guard)
 *   paymentLimiter — 20 req / 1 hr         (billing surface, rarely hit)
 *
 * Mirrors apps/ascend-backend/src/middleware/rateLimiter.js; the two should
 * eventually move into a shared package.
 */

import rateLimit from 'express-rate-limit';
import { logger } from './requestLogger.js';

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    message: { error: message, code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      logger.warn({ ip: req.ip, path: req.path, method: req.method }, '[rate-limit] request blocked');
      res.status(429).json(options.message);
    },
  });
}

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again in 15 minutes',
});

export const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many requests, please slow down',
});

export const aiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many AI requests, please wait a moment',
});

// Transcription fires once per audio chunk — behavioral mode generates
// 10-20 calls/min. Dedicated limit prevents transcription from consuming
// the inference budget and causing 429s on stream calls.
export const transcriptionLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many transcription requests, please wait a moment',
});

export const paymentLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many payment requests, please try again later',
});

// Coding-specific limiter: fix/execute/translate cycle naturally needs
// 3-5 calls per minute in a debug loop. 60/min gives headroom without
// removing cost protection entirely.
export const codingLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many coding requests, please wait a moment',
});
