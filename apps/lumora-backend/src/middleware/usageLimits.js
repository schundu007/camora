/**
 * Usage-limit middleware — gates endpoints based on plan quotas.
 *
 * checkUsage(type) — pre-request guard that rejects with 429 if limit reached.
 * recordUsage(type) — post-response helper that increments the counter.
 */
import { checkLimit, incrementUsage } from '../services/usage.js';

/**
 * Middleware factory: returns middleware that checks whether the authenticated
 * user has remaining quota for `type`.
 *
 * @param {'questions'|'sessions'|'diagrams'} type
 */
export function checkUsage(type) {
  return async (req, res, next) => {
    try {
      const result = await checkLimit(req.user.id, type);
      if (!result.allowed) {
        return res.status(429).json({
          error: 'Usage limit reached',
          type,
          used: result.used,
          limit: result.limit,
          upgrade_url: '/pricing',
          topup_available: true,
        });
      }
      // Attach usage info to request for downstream use
      req.usage = result;
      next();
    } catch (err) {
      console.error('Usage check error:', err);
      next(); // Don't block on usage check errors
    }
  };
}

/**
 * Middleware factory: increments the usage counter for `type` after the
 * upstream handler has completed successfully.
 *
 * @param {'questions'|'sessions'|'diagrams'} type
 */
export function recordUsage(type) {
  return async (req, _res, next) => {
    try {
      await incrementUsage(req.user.id, type);
    } catch (err) {
      console.error('Usage record error:', err);
    }
    next();
  };
}
