import { query } from '../lib/shared-db.js';
import { logger } from './requestLogger.js';

/**
 * Subscription Required Middleware
 * Checks if user has an active paid subscription before allowing access
 *
 * Valid subscription plans: monthly, quarterly_pro
 * Free plan users are blocked with SUBSCRIPTION_REQUIRED error
 */
export async function subscriptionRequired(req, res, next) {
  // User must be authenticated first
  if (!req.user?.id) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const result = await query(
      'SELECT plan_type, status, trial_ends_at FROM ascend_subscriptions WHERE user_id = $1',
      [req.user.id]
    );

    const subscription = result.rows[0];

    // Check if user has active paid subscription OR active trial
    const isPaidPlan = subscription?.plan_type === 'monthly' ||
                       subscription?.plan_type === 'quarterly_pro' || subscription?.plan_type === 'monthly_pro';
    const isActive = subscription?.status === 'active';
    const hasActiveTrial = subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date();

    if (!(isPaidPlan && isActive) && !hasActiveTrial) {
      logger.info({
        userId: req.user.id,
        planType: subscription?.plan_type || 'none',
        status: subscription?.status || 'none'
      }, 'Subscription required - user blocked');

      return res.status(403).json({
        error: 'Active subscription required to use this feature',
        code: 'SUBSCRIPTION_REQUIRED',
        planType: subscription?.plan_type || 'free',
        upgradeUrl: '/pricing',
      });
    }

    // Attach subscription info to request
    req.subscription = subscription;
    next();
  } catch (error) {
    logger.error({ error: error.message, userId: req.user.id }, 'Subscription check failed');
    return res.status(500).json({
      error: 'Failed to verify subscription',
      code: 'SUBSCRIPTION_CHECK_ERROR',
    });
  }
}

/**
 * Check subscription without blocking
 * Attaches subscription info to request for optional use
 */
export async function checkSubscription(req, res, next) {
  if (!req.user?.id) {
    req.hasSubscription = false;
    return next();
  }

  try {
    const result = await query(
      'SELECT plan_type, status, trial_ends_at FROM ascend_subscriptions WHERE user_id = $1',
      [req.user.id]
    );

    const subscription = result.rows[0];
    const isPaidPlan = subscription?.plan_type === 'monthly' ||
                       subscription?.plan_type === 'quarterly_pro' || subscription?.plan_type === 'monthly_pro';
    const isActive = subscription?.status === 'active';
    const hasActiveTrial = subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date();

    req.subscription = subscription;
    req.hasSubscription = (isPaidPlan && isActive) || hasActiveTrial;
  } catch (error) {
    logger.warn({ error: error.message }, 'Optional subscription check failed');
    req.hasSubscription = false;
  }

  next();
}

export default subscriptionRequired;
