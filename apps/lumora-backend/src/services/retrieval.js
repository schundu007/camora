/**
 * RAG retrieval — hits both lumora_kb_chunks (global Capra KB) and
 * lumora_user_doc_chunks (per-user Prep Kit).
 *
 * Hard latency budget: races against `timeoutMs` (default 250ms). If
 * retrieval loses the race, returns `{chunks: [], timedOut: true}` so
 * inference proceeds without grounding rather than blocking. Sona
 * answering ungrounded > Sona stuck behind a slow vector query.
 *
 * Per-user namespace is enforced at the SQL layer — every user-doc
 * query has WHERE user_id = $1. Namespace bugs are tested.
 */
import { hybridSearchKb, hybridSearchUserDocs } from './hybridRetrieval.js';

const DEFAULT_TIMEOUT_MS = 250;
const KB_TOP_K = 6;
const USER_TOP_K = 4;
const MAX_CHUNK_CHARS = 1200; // hard cap injected into prompt per chunk

/**
 * @param {object}  opts
 * @param {string}  opts.question
 * @param {number?} opts.userId
 * @param {number}  [opts.timeoutMs=250]
 * @returns {Promise<{chunks, timedOut, latencyMs}>}
 */
export async function retrieve(opts) {
  const { question, userId, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const t0 = performance.now();

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('__TIMEOUT__'), timeoutMs);
  });

  const work = (async () => {
    const promises = [hybridSearchKb(question, KB_TOP_K)];
    if (userId) promises.push(hybridSearchUserDocs(userId, question, USER_TOP_K));
    const results = await Promise.all(promises);
    const flat = results.flat();
    return flat.map((c) => ({ ...c, content: (c.content || '').slice(0, MAX_CHUNK_CHARS) }));
  })();

  try {
    const winner = await Promise.race([work, timeout]);
    if (winner === '__TIMEOUT__') {
      return { chunks: [], timedOut: true, latencyMs: Math.round(performance.now() - t0) };
    }
    return { chunks: winner, timedOut: false, latencyMs: Math.round(performance.now() - t0) };
  } finally {
    clearTimeout(timer);
  }
}

export function formatRetrievedContext(chunks) {
  if (!chunks || chunks.length === 0) return '';
  const lines = ['[GROUNDING — verbatim source excerpts; cite by tag if relevant]'];
  for (const c of chunks) {
    if (c.tier === 'kb') {
      lines.push(`[KB ${c.source} / ${c.topicTitle} / ${c.section}]`);
    } else {
      lines.push(`[USER ${c.docKind}${c.section ? ' / ' + c.section : ''}]`);
    }
    lines.push(c.content);
    lines.push('');
  }
  return lines.join('\n').trim();
}
