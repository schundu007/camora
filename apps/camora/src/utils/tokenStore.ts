/**
 * In-memory token store shared between AuthContext and fetch helpers.
 *
 * Background: the SSO cookie became httpOnly in Batch 1 of the security
 * pass, which means `document.cookie.match(/cariara_sso=…/)` returns null
 * even when the user is logged in. The legacy `getAuthHeaders()` helper
 * relied on that match, so every authenticated fetch outside of AuthContext
 * (Profile badges, Practice Run Code, ResumeOptimizer, etc.) shipped
 * without a Bearer header → 401 cascade.
 *
 * This module gives AuthContext a place to write the token it received
 * from /auth/me (or /auth/refresh, or the legacy non-httpOnly cookie) and
 * gives the fetch helpers a way to read it without React hooks.
 */

let currentToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export function setStoredToken(token: string | null): void {
  if (token === currentToken) return;
  currentToken = token;
  listeners.forEach((fn) => {
    try { fn(token); } catch { /* listener crash shouldn't block other listeners */ }
  });
}

export function getStoredToken(): string | null {
  return currentToken;
}

/** Subscribe to token changes — used by code that wants to react to logout/login. */
export function subscribeToken(fn: (token: string | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
