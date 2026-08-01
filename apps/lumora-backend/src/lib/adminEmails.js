/**
 * Thin re-export of the canonical owner/admin email allowlist. Inlined here so
 * the backend can build under Railway's per-service Root Directory model. Same
 * pattern as ./plans.js, ./shared-db.js and ./shared-auth.js — call sites
 * import from './lib/adminEmails.js', the implementation lives in
 * ./_shared/adminEmails.js.
 */
export { getAdminEmails, isAdminEmail } from './_shared/adminEmails.js';
