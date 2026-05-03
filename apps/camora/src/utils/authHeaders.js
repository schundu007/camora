/**
 * Auth Headers Utility
 *
 * Web-only helper for assembling an Authorization header for fetch calls.
 * Reads the in-memory token store that AuthContext mirrors. Falls back to
 * a non-httpOnly cariara_sso cookie if one happens to exist (legacy
 * sessions before the httpOnly migration).
 *
 * IMPORTANT: do NOT add `document.cookie.match(/cariara_sso=…/)` as the
 * primary source. After the security migration the SSO cookie is
 * httpOnly, so document.cookie returns nothing and the fetch ships with
 * no Authorization header — that's the bug this util historically had.
 */

import { getStoredToken } from './tokenStore.ts';

/**
 * Get the current Bearer token. Prefers AuthContext's in-memory token
 * (set after /auth/me or /auth/refresh succeeds), falls back to a legacy
 * non-httpOnly cookie if present.
 */
export function getToken() {
  const stored = getStoredToken();
  if (stored) return stored;
  // Legacy cookie path — only useful for sessions minted before httpOnly.
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )cariara_sso=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Authentication headers for API requests. Returns an empty object when
 * the user isn't authenticated; callers should pair this with
 * `credentials: 'include'` so the httpOnly cookie can still ride along
 * server-side as a fallback.
 */
export function getAuthHeaders() {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default getAuthHeaders;
