/**
 * Hybrid retrieval — vector ANN merged with BM25 (Postgres tsvector)
 * via Reciprocal Rank Fusion (Cormack et al, k=60).
 *
 * Vector recall is strong on semantic intent; BM25 recall is strong on
 * exact terms. RRF combines them without normalizing raw scores.
 */
import { query } from '../lib/shared-db.js';
import { embedQuery } from './embeddings.js';

const RRF_K = 60;
const VECTOR_TOP = 20;
const BM25_TOP = 20;

function asVecLiteral(v) {
  return `[${v.join(',')}]`;
}

function fuse(lists, finalK) {
  const byId = new Map();
  for (const list of lists) {
    list.forEach((item, idx) => {
      const rank = idx + 1;
      const contribution = 1 / (RRF_K + rank);
      const prev = byId.get(item.id);
      if (prev) prev.rrfScore += contribution;
      else byId.set(item.id, { ...item, rrfScore: contribution });
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, finalK);
}

async function vecKb(vec) {
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            embedding <=> $1::vector AS distance
       FROM lumora_kb_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [asVecLiteral(vec), VECTOR_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'kb', id: row.id, source: row.source, topicId: row.topic_id,
    topicTitle: row.topic_title, section: row.section, content: row.content,
    distance: Number(row.distance),
  }));
}
async function bm25Kb(question) {
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            ts_rank(content_tsv, plainto_tsquery('english', $1)) AS ts_rank
       FROM lumora_kb_chunks
       WHERE content_tsv @@ plainto_tsquery('english', $1)
       ORDER BY ts_rank DESC LIMIT $2`,
    [question, BM25_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'kb', id: row.id, source: row.source, topicId: row.topic_id,
    topicTitle: row.topic_title, section: row.section, content: row.content,
    tsRank: Number(row.ts_rank),
  }));
}
async function vecUser(userId, vec) {
  const r = await query(
    `SELECT id, doc_kind, section, content, embedding <=> $2::vector AS distance
       FROM lumora_user_doc_chunks
       WHERE user_id = $1
       ORDER BY embedding <=> $2::vector LIMIT $3`,
    [userId, asVecLiteral(vec), VECTOR_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'user', id: row.id, docKind: row.doc_kind, section: row.section,
    content: row.content, distance: Number(row.distance),
  }));
}
async function bm25User(userId, question) {
  const r = await query(
    `SELECT id, doc_kind, section, content,
            ts_rank(content_tsv, plainto_tsquery('english', $2)) AS ts_rank
       FROM lumora_user_doc_chunks
       WHERE user_id = $1 AND content_tsv @@ plainto_tsquery('english', $2)
       ORDER BY ts_rank DESC LIMIT $3`,
    [userId, question, BM25_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'user', id: row.id, docKind: row.doc_kind, section: row.section,
    content: row.content, tsRank: Number(row.ts_rank),
  }));
}

export async function hybridSearchKb(question, finalK, opts = {}) {
  const vec = opts.vec || await embedQuery(question);
  const [v, b] = await Promise.all([vecKb(vec), bm25Kb(question)]);
  return fuse([v, b], finalK);
}

export async function hybridSearchUserDocs(userId, question, finalK, opts = {}) {
  const vec = opts.vec || await embedQuery(question);
  const [v, b] = await Promise.all([vecUser(userId, vec), bm25User(userId, question)]);
  return fuse([v, b], finalK);
}
