/**
 * Single source of truth for v3.2 plan constants.
 *
 * Both backends consume this so adding a new plan_type means changing one
 * file, not three. Previously each of:
 *   - apps/ascend-backend/src/middleware/subscriptionRequired.js
 *   - apps/ascend-backend/src/routes/billing.js
 *   - apps/lumora-backend/src/middleware/requirePaidSubscription.js
 * had its own `new Set(['pro_monthly', 'pro_yearly', 'team'])` literal.
 * They happened to agree, but a future plan addition would silently miss
 * one of them and that file would treat paid users as free.
 */

export const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);

export const ALL_PLAN_TYPES = new Set([...PAID_PLAN_TYPES, 'free']);

/**
 * @param {string|null|undefined} planType
 * @returns {boolean}
 */
export function isPaidPlan(planType) {
  return !!planType && PAID_PLAN_TYPES.has(planType);
}
