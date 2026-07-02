/**
 * In-memory current-user-id store shared between AuthContext and non-hook
 * helpers.
 *
 * Mirrors `tokenStore.ts`. Its job is to give plain modules (which run
 * outside React and can't call useAuth) a way to learn *who is logged in*
 * so they can scope browser-local caches per user.
 *
 * Why this exists: the Lumora Prep Kit was cached under a single global
 * localStorage key (`lumora_prep_v8`). On a shared browser, logging out and
 * back in as a different account left the previous user's prep in place —
 * the panel rendered it and even backfilled it into the new user's server
 * row. Namespacing that cache by the value written here closes the leak.
 *
 * AuthContext writes the id synchronously whenever `user` changes (login,
 * refresh, logout → null), exactly like it mirrors the token.
 */

let currentUserId: string | null = null;
const listeners = new Set<(userId: string | null) => void>();

export function setStoredUserId(userId: string | null): void {
  if (userId === currentUserId) return;
  currentUserId = userId;
  listeners.forEach((fn) => {
    try { fn(userId); } catch { /* one listener crashing must not block others */ }
  });
}

export function getStoredUserId(): string | null {
  return currentUserId;
}

/** Subscribe to user-id changes — used by code that wants to react to
 *  account switches (e.g. re-read a per-user cache). Returns an unsubscribe. */
export function subscribeUserId(fn: (userId: string | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
