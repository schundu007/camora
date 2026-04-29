/**
 * Lumora answer cache.
 *
 * Why this exists:
 *   Live-interview routes (inference /stream, coding /solve) burn full
 *   Anthropic spend on every request, even when the same question
 *   ("design a tiny URL", "two-sum", "tell me about yourself") fires
 *   dozens of times across users. Caching the structured answer keyed
 *   on a content hash skips the LLM entirely on a hit.
 *
 * Behavior:
 *   - REDIS_URL absent or unreachable → graceful no-op (cacheGet returns
 *     null, cacheSet swallows). Routes never fail because of cache.
 *   - 30-day TTL by default — long enough to amortize repeat questions
 *     in an interview-prep loop, short enough to invalidate when prompts
 *     or models change between deploys.
 *   - Cache key includes the model ID and system-prompt hash so changing
 *     either bumps the namespace automatically without manual flush.
 */
import Redis from 'ioredis';
import crypto from 'crypto';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || null;
const DEFAULT_TTL_SECONDS = parseInt(process.env.ANSWER_CACHE_TTL_SECONDS || String(30 * 24 * 60 * 60), 10);

let client = null;
let connectionFailed = false;

function getClient() {
  if (!REDIS_URL) return null;
  if (connectionFailed) return null;
  if (client) return client;
  try {
    client = new Redis(REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        // After two failed connection attempts, stop trying for the
        // rest of the process — a missing/wrong Redis shouldn't slow
        // down every request with reconnect attempts.
        if (times > 2) {
          connectionFailed = true;
          console.warn('[answerCache] Redis unreachable after retries — disabling cache');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });
    client.on('error', (err) => {
      // Logged once per error class via ioredis's own dedup. We don't
      // want to spam logs but we DO want to know if the cache is down.
      if (!connectionFailed) {
        console.warn('[answerCache] Redis error:', err.message);
      }
    });
    return client;
  } catch (err) {
    console.warn('[answerCache] Redis init failed:', err.message);
    connectionFailed = true;
    return null;
  }
}

/**
 * Build a deterministic cache key from request parameters. Any
 * field that affects the model output should appear here so a config
 * change naturally invalidates the namespace.
 */
export function buildAnswerCacheKey(parts) {
  const normalized = JSON.stringify({
    q: String(parts.question || '').trim().toLowerCase().replace(/\s+/g, ' '),
    sc: parts.systemContext ? crypto.createHash('sha1').update(String(parts.systemContext)).digest('hex').slice(0, 12) : null,
    dl: parts.detailLevel || null,
    pl: parts.plan || null,
    md: parts.model || null,
    rt: parts.route || null, // 'stream' | 'solve' — different shapes
    lg: parts.language || null,
  });
  const h = crypto.createHash('sha256').update(normalized).digest('hex');
  // Versioned prefix lets us bump v1→v2 if the cached payload shape changes.
  return `lumora:answer:v1:${h}`;
}

export async function cacheGet(key) {
  const c = getClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[answerCache] get failed:', err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const c = getClient();
  if (!c) return;
  try {
    const payload = JSON.stringify(value);
    // Don't cache absurdly large answers; safety-rail for misbehaving
    // generations that would bloat Redis memory.
    if (payload.length > 256 * 1024) return;
    await c.set(key, payload, 'EX', ttlSeconds);
  } catch (err) {
    console.warn('[answerCache] set failed:', err.message);
  }
}

/**
 * Hit/miss telemetry for log-based dashboards.
 */
export function logCacheEvent(kind, key, meta = {}) {
  const k = key.length > 80 ? key.slice(0, 77) + '...' : key;
  console.log(`[answerCache] ${kind} key=${k} ${Object.entries(meta).map(([a, b]) => `${a}=${JSON.stringify(b)}`).join(' ')}`);
}
