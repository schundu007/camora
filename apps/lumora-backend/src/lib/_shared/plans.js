/**
 * Plan constants — inlined from packages/shared-db/src/plans.js so this
 * backend can build under Railway's per-service Root Directory model
 * (which can't see the monorepo's workspace packages). Keep this in sync
 * with apps/lumora-backend/src/lib/_shared/plans.js — both copies must
 * match, same convention as _shared/db.js and _shared/auth.js.
 *
 * Single source of truth for v3.2 plan constants. Adding a new plan_type
 * means changing this file in both backends, not three middlewares each.
 */

export const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team']);

export const ALL_PLAN_TYPES = new Set([...PAID_PLAN_TYPES, 'free', 'admin']);

/**
 * @param {string|null|undefined} planType
 * @returns {boolean}
 */
export function isPaidPlan(planType) {
  return !!planType && PAID_PLAN_TYPES.has(planType);
}
