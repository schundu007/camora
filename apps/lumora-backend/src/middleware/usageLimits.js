/**
 * Usage limit middleware — checks plan limits before AI endpoints.
 * Increments usage counters after successful responses.
 */
import { checkLimit, incrementUsage } from '../services/usage.js';

/**
 * Pre-request guard: checks if user has remaining quota.
 * Returns 429 with upgrade info if limit reached.
 *
 * @param {'questions' | 'sessions' | 'diagrams'} type
 */
export function checkUsage(type) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) return next(); // No auth = skip (other middleware handles auth)

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
      req.usage = result;
      next();
    } catch (err) {
      console.error('Usage check error:', err.message);
      next(); // Don't block on usage check errors
    }
  };
}

/**
 * Post-response counter: increments usage after successful AI call.
 * Call this AFTER the response is sent.
 *
 * @param {'questions' | 'sessions' | 'diagrams'} type
 */
export async function recordUsageCount(userId, type) {
  try {
    await incrementUsage(userId, type);
  } catch (err) {
    console.error('Usage record error:', err.message);
  }
}
