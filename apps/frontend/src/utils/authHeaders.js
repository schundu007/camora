/**
 * Auth Headers Utility
 *
 * Centralized function for generating authentication headers
 * Web-only version — reads the SSO cookie set by Ascend (cariara_sso)
 */

/**
 * Get auth token from the SSO cookie (cariara_sso).
 * This is the same source AuthContext uses, keeping them in sync.
 */
export function getToken() {
  const match = document.cookie.match(/(^| )cariara_sso=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Get authentication headers for API requests
 * Includes authorization token from the SSO cookie
 */
export function getAuthHeaders() {
  const headers = {};

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default getAuthHeaders;
