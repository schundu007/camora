/**
 * Owner / admin email allowlist — single source of truth for the
 * "this user runs Camora" check. Used by PaywallGate, admin pages,
 * and any future gated surface that needs to bypass paid-plan walls
 * for the project owner.
 *
 * Configurable via VITE_OWNER_EMAILS (comma-separated). When the env
 * var is unset, no one gets bypass — set VITE_OWNER_EMAILS in .env
 * to enable owner-level access.
 *
 * Long-term: replace with `user.role === 'admin'` once the JWT mint
 * includes role from the DB. For now the email check is good enough —
 * the frontend gate is UX only; the backend still enforces real auth
 * on every API call.
 */

const OWNER_EMAILS: string[] = (() => {
  const raw = import.meta.env.VITE_OWNER_EMAILS;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
})();

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase());
}

export function isOwner(user: { email?: string | null } | null | undefined): boolean {
  return isOwnerEmail(user?.email);
}

export { OWNER_EMAILS };
