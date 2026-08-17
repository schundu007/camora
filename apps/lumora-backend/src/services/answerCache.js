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
import { query } from '../lib/shared-db.js';

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
    cp: parts.cloudProvider || null, // v9: cloud provider affects CLOUDSERVICES section
    // Starter code changes the expected solution structure completely (CASE A vs CASE B,
    // different function signatures, shebang/readarray boilerplate). Must be part of the
    // key or a no-starter solve gets served for a starter-code problem and produces wrong output.
    sk: parts.starterCode ? crypto.createHash('sha1').update(String(parts.starterCode)).digest('hex').slice(0, 12) : null,
    // How many approaches the answer holds. A one-solution answer and a
    // brute→optimized→optimal ladder are different artifacts for the same
    // question, so they cannot share a slot.
    sn: parts.solutionCount || null,
    // Conversation tail. A follow-up's text ("what about duplicates?") is
    // meaningless without the turns before it, so two threads asking the same
    // words expect different answers and must not share a slot.
    hh: Array.isArray(parts.history) && parts.history.length
      ? crypto.createHash('sha1').update(JSON.stringify(parts.history)).digest('hex').slice(0, 12)
      : null,
  });
  const h = crypto.createHash('sha256').update(normalized).digest('hex');
  // v10: CLOUD_FORBIDDEN enforcement added (2026-06-26) — invalidates stale v9 entries with wrong provider services.
  // v12: elevator pitch reformatted from one prose paragraph to labelled beats
  // (2026-07-19). NOTE: `sc` hashes the *user-assembled* systemContext (resume +
  // JD + docs), NOT the server-side system prompt — so editing a prompt in
  // claude.js / gemini-stream.js does NOT invalidate anything on its own. This
  // version prefix is the only lever. Bump it whenever a system prompt changes
  // or users keep replaying pre-change answers for up to the 30-day TTL.
  // v13: the coding system prompt gained the brute→optimal ladder and the
  // interviewer follow-up block (2026-08-14). Every v12 coding answer holds a
  // single solution and no followups, so replaying one would serve the old
  // behaviour for up to 30 days after the deploy.
  // v14: the coding system prompt now carries the caller's session context
  // (2026-08-16) — v13 coding answers were generated blind to the on-screen
  // problem, so replaying one serves an ungrounded answer for up to 30 days.
  // v15: complexity gained timeWhy/spaceWhy (2026-08-16). Every v14 solve holds
  // a bare bound with no derivation, which is exactly the gap this closed —
  // replaying one would serve the old behaviour for the full 30-day TTL.
  // v16: answers gained the identification trail and the four interview cards
  // (2026-08-17). A v15 answer carries neither, so replaying one serves a
  // card-less answer for the full 30-day TTL — the exact gap this closed.
  // v17: the identification trail is trimmed to its decisive steps (2026-08-17).
  // A v16 answer carries the full walk, so replaying one shows the dozen "no"
  // answers the trim exists to remove, for the full 30-day TTL.
  return `lumora:answer:v17:${h}`;
}

async function cacheGetFromDb(key) {
  try {
    const result = await query(
      'SELECT answer_json FROM lumora_answer_cache WHERE cache_key = $1',
      [key],
    );
    return result.rows.length > 0 ? result.rows[0].answer_json : null;
  } catch {
    return null;
  }
}

async function cacheSetToDb(key, value) {
  try {
    await query(
      `INSERT INTO lumora_answer_cache (cache_key, answer_json)
       VALUES ($1, $2)
       ON CONFLICT (cache_key) DO NOTHING`,
      [key, JSON.stringify(value)],
    );
  } catch (err) {
    console.warn('[answerCache] DB write failed:', err.message);
  }
}

export async function cacheGet(key) {
  const c = getClient();
  if (c) {
    try {
      const raw = await c.get(key);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('[answerCache] Redis get failed:', err.message);
    }
  }
  // DB fallback — permanent storage, survives Redis restarts and TTL expiry
  return cacheGetFromDb(key);
}

export async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const payload = JSON.stringify(value);
  // Don't cache absurdly large answers; safety-rail for misbehaving
  // generations that would bloat Redis memory.
  if (payload.length > 256 * 1024) return;
  const c = getClient();
  if (c) {
    try {
      await c.set(key, payload, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('[answerCache] Redis set failed:', err.message);
    }
  }
  // Always write to DB for permanent persistence (fire-and-forget)
  cacheSetToDb(key, value).catch(() => {});
}

/**
 * Hit/miss telemetry for log-based dashboards.
 */
export function logCacheEvent(kind, key, meta = {}) {
  const k = key.length > 80 ? key.slice(0, 77) + '...' : key;
  console.log(`[answerCache] ${kind} key=${k} ${Object.entries(meta).map(([a, b]) => `${a}=${JSON.stringify(b)}`).join(' ')}`);
}

/** Delete one entry by its raw cache key. Returns { redis, db } deleted booleans. */
export async function cacheDelete(key) {
  let redis = false;
  let db = false;
  const c = getClient();
  if (c) {
    try { const n = await c.del(key); redis = n > 0; } catch {}
  }
  try {
    const r = await query('DELETE FROM lumora_answer_cache WHERE cache_key = $1', [key]);
    db = (r.rowCount || 0) > 0;
  } catch {}
  return { redis, db };
}

/** Flush ALL answer cache entries across Redis + DB. Returns { redisCount, dbCount }. */
export async function cacheFlushAll() {
  let redisCount = 0;
  let dbCount = 0;
  const c = getClient();
  if (c) {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await c.scan(cursor, 'MATCH', 'lumora:answer:*', 'COUNT', 200);
        cursor = next;
        if (keys.length) { await c.del(...keys); redisCount += keys.length; }
      } while (cursor !== '0');
    } catch (err) { console.warn('[answerCache] Redis flush failed:', err.message); }
  }
  try {
    const r = await query('DELETE FROM lumora_answer_cache');
    dbCount = r.rowCount || 0;
  } catch (err) { console.warn('[answerCache] DB flush failed:', err.message); }
  return { redisCount, dbCount };
}

