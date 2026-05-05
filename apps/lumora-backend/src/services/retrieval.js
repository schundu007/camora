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
import { query } from '../lib/shared-db.js';
import { embedQuery } from './embeddings.js';

const DEFAULT_TIMEOUT_MS = 250;
const KB_TOP_K = 6;
const USER_TOP_K = 4;
const MAX_CHUNK_CHARS = 1200; // hard cap injected into prompt per chunk

function asVecLiteral(v) {
  return `[${v.join(',')}]`;
}

async function searchKb(vec, k) {
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            embedding <=> $1::vector AS distance
       FROM lumora_kb_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [asVecLiteral(vec), k],
  );
  return r.rows.map((row) => ({
    tier: 'kb',
    id: row.id,
    source: row.source,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    section: row.section,
    content: row.content.slice(0, MAX_CHUNK_CHARS),
    distance: Number(row.distance),
  }));
}

async function searchUserDocs(userId, vec, k) {
  const r = await query(
    `SELECT id, doc_kind, section, content,
            embedding <=> $2::vector AS distance
       FROM lumora_user_doc_chunks
       WHERE user_id = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
    [userId, asVecLiteral(vec), k],
  );
  return r.rows.map((row) => ({
    tier: 'user',
    id: row.id,
    docKind: row.doc_kind,
    section: row.section,
    content: row.content.slice(0, MAX_CHUNK_CHARS),
    distance: Number(row.distance),
  }));
}

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
    const vec = await embedQuery(question);
    const promises = [searchKb(vec, KB_TOP_K)];
    if (userId) promises.push(searchUserDocs(userId, vec, USER_TOP_K));
    const results = await Promise.all(promises);
    return results.flat();
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
