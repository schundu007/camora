/**
 * HyDE (Hypothetical Document Embeddings) query rewriter.
 *
 * The interviewer's literal phrasing ("how would you scale this?") often
 * embeds poorly compared to the answer text we want to find. We ask a
 * fast LLM (Haiku) for a hypothetical 3-4 sentence answer and embed
 * THAT instead. Recall improves on vague questions; cost is one cached
 * Haiku call (~50ms, ~$0.0001 per question).
 *
 * Returns null on failure so callers can transparently fall back to
 * embedding the literal question.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'node:crypto';

const MODEL = 'gemini-2.5-flash';
const MAX_TOKENS = 180;
const CACHE_MAX = 1000;

let _genAI = null;
function client() {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '');
  return _genAI;
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
    cache.delete(cache.keys().next().value);
  }
  cache.set(k, v);
}
function hash(s) {
  return createHash('sha256').update(s).digest('hex');
}

const SYSTEM = `You are helping a retrieval system. The user gives you a question that an engineer might ask in a technical interview. Write a 3-4 sentence DIRECT, FACTUAL answer to the question (not a question, not a clarification). Use precise technical terms. Don't hedge. Don't say "I would" — answer as if explaining to a peer. The answer text will be used as a search query, so include the keywords a textbook would use.`;

export async function hydeRewrite(question) {
  const k = hash(question);
  const cached = cacheGet(k);
  if (cached !== undefined) return cached;
  try {
    const gmodel = client().getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM });
    const r = await gmodel.generateContent(question);
    const text = r.response.text().trim();
    const out = text || null;
    cacheSet(k, out);
    return out;
  } catch (err) {
    console.warn('[hyde] rewrite failed:', err.message);
    cacheSet(k, null);
    return null;
  }
}
