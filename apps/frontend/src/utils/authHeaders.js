/**
 * Auth Headers Utility
 *
 * Centralized function for generating authentication headers
 * Web-only version (no Electron dependencies)
 */

/**
 * Get auth token from storage
 * Supports both old format (chundu_token) and new OAuth format (ascend_auth)
 */
export function getToken() {
  // Try new OAuth format first (ascend_auth)
  try {
    const authData = localStorage.getItem('ascend_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.accessToken) {
        return parsed.accessToken;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Fall back to old format
  return localStorage.getItem('chundu_token');
}

/**
 * Get authentication headers for API requests
 * Includes authorization token
 */
export function getAuthHeaders() {
  const headers = {};

  // Add auth token if available
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default getAuthHeaders;
