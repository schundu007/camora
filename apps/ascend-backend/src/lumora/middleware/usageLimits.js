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
      if (req.user.is_admin) return next(); // Admins bypass usage limits

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
      // Fail open — allow request if usage system is down (better UX than blocking)
      next();
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
