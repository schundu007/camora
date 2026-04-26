/**
 * Owner / admin email allowlist — single source of truth for the
 * "this user runs Camora" check. Used by PaywallGate, admin pages,
 * and any future gated surface that needs to bypass paid-plan walls
 * for the project owner.
 *
 * Configurable via VITE_OWNER_EMAILS (comma-separated). The hardcoded
 * fallback is the project founder so that a fresh checkout works even
 * if the env var isn't set.
 *
 * Long-term: replace with `user.role === 'admin'` once the JWT mint
 * includes role from the DB. For now the email check is good enough —
 * the frontend gate is UX only; the backend still enforces real auth
 * on every API call.
 */

const OWNER_FALLBACK = ['chundubabu@gmail.com'];

const OWNER_EMAILS: string[] = (() => {
  const raw = import.meta.env.VITE_OWNER_EMAILS;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  return OWNER_FALLBACK;
})();

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase());
}

export function isOwner(user: { email?: string | null } | null | undefined): boolean {
  return isOwnerEmail(user?.email);
}

export { OWNER_EMAILS };
