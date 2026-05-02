/**
 * Thin re-export of @camora/shared-db/plans. Inlined here so the backend
 * can build under Railway's per-service Root Directory model. Same
 * pattern as ./shared-db.js and ./shared-auth.js — call sites import
 * from './lib/plans.js' (or '@/lib/plans'), the implementation lives in
 * ./_shared/plans.js.
 */
export { PAID_PLAN_TYPES, ALL_PLAN_TYPES, isPaidPlan } from './_shared/plans.js';
