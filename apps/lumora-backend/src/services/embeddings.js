/**
 * Gemini text embedding service for Lumora RAG.
 *
 * - Model: gemini-embedding-001, truncated to 1536 dims (cosine similarity)
 * - In-memory LRU cache keyed by SHA-256 of `${taskType}|${text}`.
 *   Interview sessions repeat questions heavily; hit ratio is typically
 *   >70% within a single session.
 *
 * ## Two things here are load-bearing — do not "simplify" them away.
 *
 * 1. **L2 normalization is required, not optional.** gemini-embedding-001
 *    returns unit vectors ONLY at its native 3072 dims. Every truncated
 *    Matryoshka tier (768 / 1536 / …) comes back un-normalized. pgvector's
 *    cosine operator does not normalize for you, so skipping this silently
 *    skews every similarity score — no error, just quietly wrong neighbours.
 *
 * 2. **Query and document embeddings use different task types.**
 *    RETRIEVAL_DOCUMENT for indexed chunks, RETRIEVAL_QUERY for the user's
 *    question. They are asymmetric by design; embedding a query as a
 *    document measurably degrades recall. The cache key includes the task
 *    type so the two never collide for identical text.
 *
 * ## Why this file throws instead of returning null
 *
 * The previous Cohere implementation returned `null` / `[]` when no API key
 * was configured. hybridRetrieval treats a falsy vector as "skip the vector
 * arm", so a missing key silently degraded the whole product to BM25-only
 * keyword search — and stayed that way, undetected, for months. A missing
 * embedding provider is a deployment fault, so it fails loudly here.
 *
 * Dimension note: DIM must match the `vector(N)` column on lumora_kb_chunks
 * (and the user-doc / user-code chunk tables). Changing it requires
 * re-embedding every stored row — vectors from different models are NOT
 * comparable even at identical dimension.
 */
import { GoogleGenAI } from '@google/genai';
import { createHash } from 'node:crypto';

const MODEL = 'gemini-embedding-001';
const DIM = 1536;

// Undocumented server-side cap on contents[] per request. 100 is the largest
// size community reports run without tripping 429s; chunk rather than trust it.
const BATCH_SIZE = 100;
const CACHE_MAX = 2000;

// gemini-embedding-001 accepts 2048 input tokens. Our chunker caps sections at
// 700 tokens, so this is headroom rather than a live constraint — but user docs
// and web-indexed pages arrive from other paths, so guard anyway. Chars/4 is the
// same heuristic chunker.js budgets with.
const MAX_INPUT_CHARS = 2048 * 4;

export const TASK_DOCUMENT = 'RETRIEVAL_DOCUMENT';
export const TASK_QUERY = 'RETRIEVAL_QUERY';

/**
 * No embedding provider is configured, or it returned a shape we can't trust.
 * A deployment fault: it will not fix itself, and every subsequent request is
 * equally broken. Callers must NOT swallow this — let it surface.
 */
export class EmbeddingConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmbeddingConfigError';
  }
}

/**
 * A single embedding request failed (network, 429, 5xx). Likely transient and
 * specific to this request. Retrieval may degrade to BM25 for this one call —
 * loudly — rather than failing the user's answer outright.
 */
export class EmbeddingRequestError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = 'EmbeddingRequestError';
    this.cause = cause;
  }
}

let _client = null;
function client() {
  if (_client) return _client;
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new EmbeddingConfigError(
      'embeddings: GEMINI_API_KEY (or GOOGLE_AI_API_KEY) is not set. ' +
      'Vector retrieval cannot run without an embedding provider.',
    );
  }
  _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

/**
 * True when an embedding provider is configured. Callers that legitimately
 * want to degrade (a health check, an optional enrichment path) can branch on
 * this explicitly — retrieval must not, which is why embedQuery/embedBatch
 * throw rather than exposing this as a silent fallback.
 */
export function embeddingsAvailable() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
}

/**
 * Scale to unit length. Required for every non-native dimension — see the
 * header. No-op on vectors that are already unit length, so it is safe to
 * apply unconditionally (and we do, rather than branching on model/dim).
 */
function l2normalize(v) {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) sumSq += v[i] * v[i];
  const norm = Math.sqrt(sumSq);
  // A zero vector has no direction to preserve; returning it as-is keeps the
  // dimension contract intact and lets the caller's dim check still pass.
  if (norm === 0) return v.slice();
  const out = new Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

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
// Task type is part of the key: the same string embedded as a query and as a
// document yields different vectors, and conflating them would poison both.
function hash(taskType, s) {
  return createHash('sha256').update(`${taskType}|${s}`).digest('hex');
}

function truncate(text) {
  return text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
}

/**
 * Embed one batch (already <= BATCH_SIZE) and return normalized vectors.
 * Validates both the response shape and every vector's dimension — a silent
 * shape change here corrupts the index rather than failing a request.
 */
async function embedRaw(texts, taskType) {
  // client() throws EmbeddingConfigError on a missing key — deliberately not
  // caught here, so a misconfiguration never masquerades as a transient blip.
  const api = client();

  let res;
  try {
    res = await api.models.embedContent({
      model: MODEL,
      contents: texts,
      config: { taskType, outputDimensionality: DIM },
    });
  } catch (err) {
    throw new EmbeddingRequestError(
      `embeddings: request failed (${texts.length} texts, ${taskType}): ${err?.message || err}`,
      { cause: err },
    );
  }

  // Shape and dimension problems are config-class, not transient: retrying
  // won't help, and writing the result would corrupt the index.
  const embeddings = res?.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new EmbeddingConfigError(
      `embeddings: shape mismatch — sent ${texts.length} texts, ` +
      `got ${Array.isArray(embeddings) ? embeddings.length : typeof embeddings}`,
    );
  }

  return embeddings.map((e, i) => {
    const v = e?.values;
    if (!Array.isArray(v) || v.length !== DIM) {
      throw new EmbeddingConfigError(
        `embeddings: bad vector at index ${i} — expected ${DIM} dims, got ${v?.length}`,
      );
    }
    return l2normalize(v);
  });
}

const inflight = new Map();

/**
 * Embed a search query. Returns a normalized 1536-dim vector.
 * Throws if no provider is configured or the API call fails — callers must
 * not treat retrieval failure as "no results".
 */
export async function embedQuery(text) {
  const key = hash(TASK_QUERY, text);
  const cached = cacheGet(key);
  if (cached) return cached;
  // Live sessions fire the same question from several code paths at once
  // (retrieval, HyDE, warm-kit); collapse those into one API call.
  if (inflight.has(key)) return inflight.get(key);

  const promise = embedRaw([truncate(text)], TASK_QUERY)
    .then(([v]) => {
      cacheSet(key, v);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/**
 * Embed documents for indexing. Returns normalized 1536-dim vectors, one per
 * input, in input order. Cached entries are filled in place so a partially
 * cached batch only sends its misses.
 */
export async function embedBatch(texts, taskType = TASK_DOCUMENT) {
  if (texts.length === 0) return [];

  const out = new Array(texts.length);
  const missIdxs = [];
  const missTexts = [];
  for (let i = 0; i < texts.length; i++) {
    const c = cacheGet(hash(taskType, texts[i]));
    if (c) out[i] = c;
    else {
      missIdxs.push(i);
      missTexts.push(texts[i]);
    }
  }

  for (let start = 0; start < missTexts.length; start += BATCH_SIZE) {
    const slice = missTexts.slice(start, start + BATCH_SIZE);
    const vecs = await embedRaw(slice.map(truncate), taskType);
    for (let j = 0; j < slice.length; j++) {
      out[missIdxs[start + j]] = vecs[j];
      cacheSet(hash(taskType, slice[j]), vecs[j]);
    }
  }
  return out;
}
