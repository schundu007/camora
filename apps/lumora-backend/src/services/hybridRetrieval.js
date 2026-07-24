/**
 * Hybrid retrieval — vector ANN merged with BM25 (Postgres tsvector)
 * via Reciprocal Rank Fusion (Cormack et al, k=60).
 *
 * Vector recall is strong on semantic intent; BM25 recall is strong on
 * exact terms. RRF combines them without normalizing raw scores.
 */
import { query } from '../lib/shared-db.js';
import { embedQuery, EmbeddingRequestError } from './embeddings.js';

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

async function vecKb(vec, sourceFilter, excludeSources) {
  const params = [asVecLiteral(vec), VECTOR_TOP];
  const clauses = [];
  if (sourceFilter) { params.push(sourceFilter); clauses.push(`source = ANY($${params.length})`); }
  if (excludeSources) { params.push(excludeSources); clauses.push(`source <> ALL($${params.length})`); }
  const filterClause = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            metadata->>'url' AS url,
            embedding <=> $1::vector AS distance
       FROM lumora_kb_chunks${filterClause}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    params,
  );
  return r.rows.map((row) => ({
    tier: 'kb', id: row.id, source: row.source, topicId: row.topic_id,
    topicTitle: row.topic_title, section: row.section, content: row.content,
    url: row.url || null,
    distance: Number(row.distance),
  }));
}
async function bm25Kb(question, sourceFilter, excludeSources) {
  const params = [question, BM25_TOP];
  let filterClause = '';
  if (sourceFilter) { params.push(sourceFilter); filterClause += ` AND source = ANY($${params.length})`; }
  if (excludeSources) { params.push(excludeSources); filterClause += ` AND source <> ALL($${params.length})`; }
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            metadata->>'url' AS url,
            ts_rank(content_tsv, plainto_tsquery('english', $1)) AS ts_rank
       FROM lumora_kb_chunks
       WHERE content_tsv @@ plainto_tsquery('english', $1)${filterClause}
       ORDER BY ts_rank DESC LIMIT $2`,
    params,
  );
  return r.rows.map((row) => ({
    tier: 'kb', id: row.id, source: row.source, topicId: row.topic_id,
    topicTitle: row.topic_title, section: row.section, content: row.content,
    url: row.url || null,
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

/**
 * Embed the query, degrading to BM25-only if — and ONLY if — the embedding
 * request itself failed transiently (network, 429, 5xx).
 *
 * The distinction matters. An EmbeddingConfigError (no API key, wrong vector
 * shape) is a deployment fault: it will not recover, and every request is
 * equally broken, so it propagates and takes the request down visibly. A
 * transient EmbeddingRequestError costs this one query its semantic arm, which
 * is worth degrading for mid-interview rather than failing the answer.
 *
 * The loud console.error is load-bearing: this pipeline previously fell back to
 * BM25-only silently for months because a missing provider returned null
 * instead of throwing. Degraded must never again be indistinguishable from
 * healthy — if you see this line in the logs, vector search is off.
 */
export async function embedQueryOrDegrade(question) {
  try {
    return await embedQuery(question);
  } catch (err) {
    if (err instanceof EmbeddingRequestError) {
      console.error(
        '[hybridRetrieval] DEGRADED to BM25-only — embedding request failed:',
        err.message,
      );
      return null;
    }
    throw err;
  }
}

export async function hybridSearchKb(question, finalK, opts = {}) {
  // An EMPTY allow-list means "ground on nothing from the generic KB" — it is
  // NOT the same as "no filter". Behavioral mode returns [] precisely so that
  // answers ground only on the candidate's own resume/JD/stories; collapsing []
  // to null inverted that into a full-KB search, which is how AMD ROCm/CI study
  // content ended up inside personal behavioral answers ("I work at AMD", every
  // question answered as CI/CD). Only null/undefined means unfiltered.
  const hasAllowList = Array.isArray(opts.sourceFilter);
  const sourceFilter = hasAllowList && opts.sourceFilter.length > 0 ? opts.sourceFilter : null;
  if (hasAllowList && opts.sourceFilter.length === 0) return [];

  const excludeSources = Array.isArray(opts.excludeSources) && opts.excludeSources.length > 0
    ? opts.excludeSources
    : null;

  const vec = opts.vec || await embedQueryOrDegrade(question);
  const results = vec
    ? await Promise.all([
        vecKb(vec, sourceFilter, excludeSources),
        bm25Kb(question, sourceFilter, excludeSources),
      ])
    : [[], await bm25Kb(question, sourceFilter, excludeSources)];
  return fuse(results, finalK);
}

export async function hybridSearchUserDocs(userId, question, finalK, opts = {}) {
  const vec = opts.vec || await embedQueryOrDegrade(question);
  const results = vec
    ? await Promise.all([vecUser(userId, vec), bm25User(userId, question)])
    : [[], await bm25User(userId, question)];
  return fuse(results, finalK);
}

// ── Per-user code kit (RAG Phase 6) ──────────────────────────────────
async function vecUserCode(userId, vec) {
  const r = await query(
    `SELECT id, problem_slug, problem_title, language, section, content,
            embedding <=> $2::vector AS distance
       FROM lumora_user_code_chunks
       WHERE user_id = $1
       ORDER BY embedding <=> $2::vector LIMIT $3`,
    [userId, asVecLiteral(vec), VECTOR_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'code', id: row.id,
    problemSlug: row.problem_slug, problemTitle: row.problem_title,
    language: row.language, section: row.section, content: row.content,
    distance: Number(row.distance),
  }));
}
async function bm25UserCode(userId, question) {
  const r = await query(
    `SELECT id, problem_slug, problem_title, language, section, content,
            ts_rank(content_tsv, plainto_tsquery('english', $2)) AS ts_rank
       FROM lumora_user_code_chunks
       WHERE user_id = $1 AND content_tsv @@ plainto_tsquery('english', $2)
       ORDER BY ts_rank DESC LIMIT $3`,
    [userId, question, BM25_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'code', id: row.id,
    problemSlug: row.problem_slug, problemTitle: row.problem_title,
    language: row.language, section: row.section, content: row.content,
    tsRank: Number(row.ts_rank),
  }));
}

export async function hybridSearchUserCode(userId, question, finalK, opts = {}) {
  const vec = opts.vec || await embedQueryOrDegrade(question);
  const results = vec
    ? await Promise.all([vecUserCode(userId, vec), bm25UserCode(userId, question)])
    : [[], await bm25UserCode(userId, question)];
  return fuse(results, finalK);
}
