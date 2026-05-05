/**
 * Cohere rerank-v3.5 cross-encoder reranker.
 *
 * Hybrid retrieval (Phase 1) returns top-N by RRF. A cross-encoder
 * reranker re-orders that pool by reading every (query, chunk) pair
 * jointly — much sharper than cosine on the final cut. Top-50 → top-8
 * is the canonical pattern.
 *
 * Env-gated by COHERE_API_KEY. When the key is absent (dev environment,
 * key revoked, etc.), this function is a no-op pass-through and the
 * caller still gets a valid response. Network errors also degrade
 * gracefully — original order is returned with a warning logged.
 */
const MODEL = 'rerank-v3.5';
const ENDPOINT = 'https://api.cohere.com/v2/rerank';
const TIMEOUT_MS = 800;

export async function rerank(question, chunks, topK) {
  const key = process.env.COHERE_API_KEY;
  if (!key || chunks.length === 0) return chunks.slice(0, topK);

  const documents = chunks.map((c) => c.content || '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        query: question,
        documents,
        top_n: Math.min(topK, documents.length),
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.warn(`[rerank] cohere ${r.status}: ${body.slice(0, 200)}`);
      return chunks.slice(0, topK);
    }
    const json = await r.json();
    const ranked = (json.results || [])
      .map((res) => ({ ...chunks[res.index], rerankScore: res.relevance_score }))
      .slice(0, topK);
    return ranked;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[rerank] cohere timeout after ${TIMEOUT_MS}ms`);
    } else {
      console.warn('[rerank] cohere call failed:', err.message);
    }
    return chunks.slice(0, topK);
  } finally {
    clearTimeout(timer);
  }
}
