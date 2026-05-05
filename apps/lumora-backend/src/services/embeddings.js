/**
 * OpenAI text embedding service for Lumora RAG.
 *
 * - Model: text-embedding-3-small (1536-dim, cosine similarity)
 * - In-memory LRU cache keyed by SHA-256 of the input string.
 *   Interview sessions repeat questions heavily; cache hit ratio is
 *   typically >70% within a single session.
 * - Batch API calls capped at 100 inputs per request (OpenAI limit).
 */
import OpenAI from 'openai';
import { createHash } from 'node:crypto';

const MODEL = 'text-embedding-3-small';
const DIM = 1536;
const BATCH_SIZE = 100;
const CACHE_MAX = 2000;

let _client = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  const key = hash(text);
  const cached = cacheGet(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);
  const promise = client().embeddings.create({ model: MODEL, input: text })
    .then((r) => {
      const v = r.data[0].embedding;
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

export async function embedBatch(texts) {
  if (texts.length === 0) return [];
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
    const r = await client().embeddings.create({ model: MODEL, input: slice });
    for (let j = 0; j < slice.length; j++) {
      const v = r.data[j].embedding;
      const targetIdx = missIdxs[start + j];
      out[targetIdx] = v;
      cacheSet(hash(slice[j]), v);
    }
  }
  return out;
}

