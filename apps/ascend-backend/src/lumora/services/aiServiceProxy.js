/**
 * Proxy helper for forwarding requests to the Python ai-services microservice.
 *
 * ai-services hosts features that stay in Python (resemblyzer speaker
 * verification, diagrams library, etc.).  The Node.js backend authenticates
 * the user and then proxies the request through this helper.
 */

const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'http://localhost:8001';

// Defaults chosen for resemblyzer / diagrams calls — speaker enroll takes a
// few seconds, diagram generation can take 10–20s. Override per-call via opts.
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_SERVICES_TIMEOUT_MS) || 30_000;
const DEFAULT_RETRIES = Number(process.env.AI_SERVICES_RETRIES) || 2;

// Dead-simple circuit breaker. After N consecutive failures we fast-fail for
// `openFor` ms rather than piling up timeouts, then let a probe request through.
const CIRCUIT = {
  failThreshold: 5,
  openForMs: 30_000,
  failures: 0,
  openUntil: 0,
};

function circuitOpen() {
  return Date.now() < CIRCUIT.openUntil;
}

function recordOutcome(ok) {
  if (ok) { CIRCUIT.failures = 0; CIRCUIT.openUntil = 0; return; }
  CIRCUIT.failures += 1;
  if (CIRCUIT.failures >= CIRCUIT.failThreshold) {
    CIRCUIT.openUntil = Date.now() + CIRCUIT.openForMs;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Forward a request to the ai-services microservice.
 *
 * Adds:
 *   - AbortSignal.timeout so a hung Python worker can't block a lumora request.
 *   - Exponential backoff retry on network errors and 5xx responses.
 *   - Simple circuit breaker so outages fast-fail instead of piling up timeouts.
 *
 * @param {string} path   – URL path on ai-services (e.g. "/speaker/enroll")
 * @param {object} options – fetch() options + { timeoutMs, retries }
 * @returns {Promise<Response>}
 */
export async function proxyToAIService(path, options = {}) {
  if (circuitOpen()) {
    const err = new Error('ai-services circuit open');
    err.code = 'CIRCUIT_OPEN';
    throw err;
  }

  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, ...fetchOpts } = options;
  const url = `${AI_SERVICES_URL}${path}`;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { ...fetchOpts, signal: AbortSignal.timeout(timeoutMs) });
      // Retry only on 5xx; 4xx is a real answer we should surface to the caller.
      if (response.status >= 500 && attempt < retries) {
        lastErr = new Error(`ai-services ${response.status}`);
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      recordOutcome(response.ok);
      return response;
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      await sleep(500 * Math.pow(2, attempt));
    }
  }
  recordOutcome(false);
  throw lastErr;
}

export { AI_SERVICES_URL };
