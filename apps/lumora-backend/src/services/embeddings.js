/**
 * Cohere text embedding service for Lumora RAG.
 *
 * - Model: embed-english-v3.0 (1024-dim, cosine similarity)
 * - In-memory LRU cache keyed by SHA-256 of the input string.
 *   Interview sessions repeat questions heavily; cache hit ratio is
 *   typically >70% within a single session.
 * - Batch API calls capped at 96 inputs per request (Cohere limit).
 */
import { CohereClient } from 'cohere-ai';
import { createHash } from 'node:crypto';

const MODEL = 'embed-english-v3.0';
const DIM = 1024;
const BATCH_SIZE = 96;
const CACHE_MAX = 2000;

let _client = null;
function client() {
  const key = process.env.COHERE_API_KEY;
  if (!key) return null;
  if (!_client) _client = new CohereClient({ token: key });
  return _client;
}

// Simple Map-based LRU. Insertion order is iteration order; we delete
// + re-set on hit to mark as most-recently-used.
const cache = new Map();
function cacheGet(k) {
  if (!cache.has(k)) return undefined;
  const v = cache.get(k);
  cache.delete(k);
  cache.set(k, v);
  return v;
}
function cacheSet(k, v) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(k, v);
}
function hash(s) {
  return createHash('sha256').update(s).digest('hex');
}

const inflight = new Map();

export async function embedQuery(text) {
  if (!client()) return null;
  const key = hash(text);
  const cached = cacheGet(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);
  const promise = client().embed({ texts: [text], model: MODEL, inputType: 'search_query' })
    .then((r) => {
      const v = r.embeddings[0];
      if (v.length !== DIM) {
        throw new Error(`embedding dim mismatch: got ${v.length}, expected ${DIM}`);
      }
      cacheSet(key, v);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export async function embedBatch(texts, inputType = 'search_document') {
  if (texts.length === 0 || !client()) return [];
  const out = new Array(texts.length);
  const missIdxs = [];
  const missTexts = [];
  for (let i = 0; i < texts.length; i++) {
    const c = cacheGet(hash(texts[i]));
    if (c) out[i] = c;
    else { missIdxs.push(i); missTexts.push(texts[i]); }
  }
  for (let start = 0; start < missTexts.length; start += BATCH_SIZE) {
    const slice = missTexts.slice(start, start + BATCH_SIZE);
    const r = await client().embed({ texts: slice, model: MODEL, inputType });
    for (let j = 0; j < slice.length; j++) {
      const v = r.embeddings[j];
      const targetIdx = missIdxs[start + j];
      out[targetIdx] = v;
      cacheSet(hash(slice[j]), v);
    }
  }
  return out;
}
