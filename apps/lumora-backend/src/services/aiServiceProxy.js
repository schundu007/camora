/**
 * Proxy helper for forwarding requests to the Python ai-services microservice.
 *
 * ai-services hosts features that stay in Python (resemblyzer speaker
 * verification, diagrams library, etc.).  The Node.js backend authenticates
 * the user and then proxies the request through this helper.
 */

const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'http://localhost:8001';

/**
 * Forward a request to the ai-services microservice and return the raw
 * Response object so the caller can stream / transform as needed.
 *
 * @param {string} path   – URL path on ai-services (e.g. "/speaker/enroll")
 * @param {object} options – fetch() options (method, headers, body, …)
 * @returns {Promise<Response>}
 */
export async function proxyToAIService(path, options = {}) {
  const url = `${AI_SERVICES_URL}${path}`;
  const response = await fetch(url, options);
  return response;
}

export { AI_SERVICES_URL };
