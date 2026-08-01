/**
 * Canonical owner/admin email allowlist.
 *
 * OWNER_EMAILS is the preferred env var; ADMIN_EMAILS is a legacy alias read
 * ONLY when OWNER_EMAILS is unset. Consolidated here so every gate parses the
 * same list with the same precedence — call sites previously diverged (some
 * reversed the precedence to ADMIN_EMAILS-first, some read only OWNER_EMAILS,
 * some compared without lowercasing).
 *
 * Inlined into each backend because Railway's per-service Root Directory model
 * can't resolve the monorepo workspace packages — keep this in sync with
 * apps/lumora-backend/src/lib/_shared/adminEmails.js (same convention as
 * _shared/auth.js and _shared/plans.js).
 *
 * DEPRECATION: set OWNER_EMAILS going forward; ADMIN_EMAILS support will be
 * removed in a future release.
 *
 * Evaluated once at import — env is fixed for a process lifetime on Railway,
 * matching the prior module-level Set behavior at each call site.
 */
const ADMIN_EMAIL_SET = new Set(
  (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** The lowercased owner/admin email set (read-only; do not mutate). */
export function getAdminEmails() {
  return ADMIN_EMAIL_SET;
}

/** True if `email` (case-insensitive) is on the owner/admin allowlist. */
export function isAdminEmail(email) {
  return !!email && ADMIN_EMAIL_SET.has(String(email).toLowerCase());
}
