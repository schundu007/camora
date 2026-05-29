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
let _lastErrorMsg = null;

function getClient() {
  if (!REDIS_URL) return null;
  if (client) return client;
  try {
    client = new Redis(REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      // Exponential backoff capped at 30s — lets ioredis heal after a
      // transient Redis restart without spamming reconnects.
      retryStrategy: (times) => Math.min(times * 500, 30_000),
    });
    client.on('error', (err) => {
      if (err.message !== _lastErrorMsg) {
        _lastErrorMsg = err.message;
        console.warn('[answerCache] Redis error:', err.message);
      }
    });
    client.on('ready', () => {
      _lastErrorMsg = null;
      console.info('[answerCache] Redis connected');
    });
    return client;
  } catch (err) {
    console.warn('[answerCache] Redis init failed:', err.message);
    return null;
  }
}

/**
 * Build a deterministic cache key from request parameters. Any
 * field that affects the model output should appear here so a config
 * change naturally invalidates the namespace.
 */
/**
 * Aggressive question normalization for cache lookup. Speech-to-text
 * produces small variations on the same spoken question — trailing
 * "please", filler words ("um", "uh"), inconsistent punctuation,
 * leading "so" or "okay" — and the previous lowercase+trim was too
 * conservative, so identical questions hashed to different keys and
 * the cache effectively never hit on the behavioral panel. This
 * collapses cosmetic differences while preserving the actual
 * meaning-bearing words.
 */
function normalizeQuestionForCache(raw) {
  let q = String(raw || '').toLowerCase().trim();
  // Strip leading filler interjections (one pass; multiple back-to-back
  // get peeled in a follow-up loop below).
  const FILLER_LEADERS = ['so ', 'um ', 'uh ', 'well ', 'okay ', 'ok ', 'alright ', 'right '];
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of FILLER_LEADERS) {
      if (q.startsWith(f)) { q = q.slice(f.length); changed = true; break; }
    }
  }
  // Strip polite trailers that don't change semantics
  q = q.replace(/(\bplease\b|\bif you don'?t mind\b|\bthanks\b|\bthank you\b)[\s.?!]*$/i, '').trim();
  // Drop trailing punctuation entirely — "Tell me about yourself."
  // and "Tell me about yourself" should map to one cache entry.
  q = q.replace(/[\s.?!,;:]+$/g, '');
  // Collapse all whitespace
  q = q.replace(/\s+/g, ' ').trim();
  return q;
}

export function buildAnswerCacheKey(parts) {
  const normalized = JSON.stringify({
    q: normalizeQuestionForCache(parts.question),
    sc: parts.systemContext ? crypto.createHash('sha1').update(String(parts.systemContext)).digest('hex').slice(0, 12) : null,
    dl: parts.detailLevel || null,
    pl: parts.plan || null,
    md: parts.model || null,
    mo: parts.mode || null, // 'general' | 'design' | 'coding' — different system prompts
    rt: parts.route || null, // 'stream' | 'solve' — different shapes
    lg: parts.language || null,
    // Starter code changes the expected solution structure completely (CASE A vs CASE B,
    // different function signatures, shebang/readarray boilerplate). Must be part of the
    // key or a no-starter solve gets served for a starter-code problem and produces wrong output.
    sk: parts.starterCode ? crypto.createHash('sha1').update(String(parts.starterCode)).digest('hex').slice(0, 12) : null,
  });
  const h = crypto.createHash('sha256').update(normalized).digest('hex');
  // v6: busts v5 entries cached before anti-hardcoding prompt fixes (2026-05-29).
  return `lumora:answer:v6:${h}`;
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
