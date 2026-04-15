/**
 * Usage limit middleware — checks plan limits before AI endpoints.
 * Increments usage counters after successful responses.
 */
import { checkLimit, incrementUsage } from '../services/usage.js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

/**
 * Pre-request guard: checks if user has remaining quota.
 * Returns 429 with upgrade info if limit reached.
 *
 * @param {'questions' | 'sessions' | 'diagrams'} type
 */
export function checkUsage(type) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admin users bypass all usage limits
      if (req.user.is_admin || ADMIN_EMAILS.includes(req.user.email?.toLowerCase())) return next();

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
      // Fail closed — deny access when usage system is unavailable
      return res.status(503).json({
        error: 'Usage system temporarily unavailable. Please try again.',
      });
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
