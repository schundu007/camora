import { query } from '../lib/shared-db.js';
import { PAID_PLAN_TYPES } from '../lib/plans.js';

/**
 * Check if user can use a feature (has subscription OR free allowance)
 * @param {number} userId - User ID
 * @param {string} featureType - 'coding', 'design', or 'company_prep'
 * @returns {Promise<Object>} - { allowed, hasSubscription, freeRemaining, freeUsed, freeLimit, reason }
 */
export async function canUseFeature(userId, featureType) {
  try {
    const result = await query(
      'SELECT ascend_can_use_feature($1, $2) as result',
      [userId, featureType]
    );

    return result.rows[0]?.result || { allowed: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return { allowed: false, error: error.message };
  }
}

/**
 * Use free allowance (decrement counter)
 * @param {number} userId - User ID
 * @param {string} featureType - 'coding', 'design', or 'company_prep'
 * @returns {Promise<boolean>} - Whether the allowance was successfully used
 */
export async function useFreeAllowance(userId, featureType) {
  try {
    const result = await query(
      'SELECT ascend_use_free_allowance($1, $2) as success',
      [userId, featureType]
    );

    return result.rows[0]?.success || false;
  } catch (error) {
    console.error('Error using free allowance:', error);
    throw error;
  }
}

/**
 * Get user's free usage status for all features
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Usage status for all features
 */
export async function getFreeUsageStatus(userId) {
  try {
    // Initialize user's free usage if not exists
    await query('SELECT ascend_init_free_usage($1)', [userId]);

    const result = await query(
      `SELECT
        coding_used, coding_limit,
        design_used, design_limit,
        company_prep_used, company_prep_limit
       FROM ascend_free_usage
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        coding: { used: 0, limit: 1, remaining: 1 },
        design: { used: 0, limit: 1, remaining: 1 },
        company_prep: { used: 0, limit: 1, remaining: 1 },
      };
    }

    const row = result.rows[0];
    return {
      coding: {
        used: row.coding_used,
        limit: row.coding_limit,
        remaining: row.coding_limit - row.coding_used,
      },
      design: {
        used: row.design_used,
        limit: row.design_limit,
        remaining: row.design_limit - row.design_used,
      },
      company_prep: {
        used: row.company_prep_used,
        limit: row.company_prep_limit,
        remaining: row.company_prep_limit - row.company_prep_used,
      },
    };
  } catch (error) {
    console.error('Error getting free usage status:', error);
    // Fail closed. Previous version returned `remaining: 1` for every
    // feature on DB error, so any caller using this output as a UI
    // gate (without server-side re-check at decrement time) granted
    // unlimited free usage during a Postgres outage. Returning
    // `remaining: 0, error: true` lets callers either show a
    // "try again" banner OR fall through to the normal gate.
    return {
      coding: { used: 0, limit: 1, remaining: 0, error: true },
      design: { used: 0, limit: 1, remaining: 0, error: true },
      company_prep: { used: 0, limit: 1, remaining: 0, error: true },
    };
  }
}

/**
 * Get subscription status for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - { hasSubscription, planType, status }
 */
export async function getSubscriptionStatus(userId) {
  try {
    const result = await query(
      'SELECT plan_type, status, trial_ends_at FROM ascend_subscriptions WHERE user_id = $1',
      [userId]
    );

    const subscription = result.rows[0];
    // Use the shared PAID_PLAN_TYPES set (includes 'lifetime') so a lifetime
    // subscriber isn't misclassified as free. Hardcoding the list here dropped
    // 'lifetime' and locked those users out of paid features.
    const isPaidPlan = PAID_PLAN_TYPES.has(subscription?.plan_type);
    const isActive = subscription?.status === 'active';
    // Trial residue guard: only count active trial when plan_type is
    // 'free'. Stops trial_ends_at from re-granting access to a paid
    // user who went past_due (card declined) but had a leftover trial
    // timestamp from before they upgraded.
    const hasActiveTrial =
      subscription?.plan_type === 'free' &&
      subscription?.trial_ends_at &&
      new Date(subscription.trial_ends_at) > new Date();

    return {
      hasSubscription: (isPaidPlan && isActive) || hasActiveTrial,
      planType: subscription?.plan_type || 'free',
      status: subscription?.status || 'none',
      isTrialUser: hasActiveTrial && !isPaidPlan,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    // Fail closed (no subscription) on DB error.
    return {
      hasSubscription: false,
      planType: 'free',
      status: 'error',
      error: true,
    };
  }
}
