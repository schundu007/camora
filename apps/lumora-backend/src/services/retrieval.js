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
import { hybridSearchKb, hybridSearchUserDocs, hybridSearchUserCode } from './hybridRetrieval.js';
import { sourcesForMode } from './modeSourceFilter.js';
import { gradeChunks } from './chunkGrader.js';

const DEFAULT_TIMEOUT_MS = 250;
// When rerank is on, we cast a wider candidate net — Cohere will trim
// down to FINAL_TOP_K. When rerank is off, we use the narrow LLM-ready
// counts directly.
const KB_TOP_K_NARROW = 6;
const USER_TOP_K_NARROW = 4;
const KB_TOP_K_WIDE = 30;
const USER_TOP_K_WIDE = 20;
const CODE_TOP_K = 2;       // tight cap — past attempts shouldn't crowd KB
const FINAL_TOP_K = 10;
const MAX_CHUNK_CHARS = 1200; // hard cap injected into prompt per chunk

function resolveUseHyde(optsValue) {
  if (typeof optsValue === 'boolean') return optsValue;
  return process.env.RAG_USE_HYDE === 'true';
}

function resolveUseRerank(optsValue) {
  if (typeof optsValue === 'boolean') return optsValue;
  return process.env.RAG_USE_RERANK === 'true' && !!process.env.COHERE_API_KEY;
}

function resolveUseWarmKit(optsValue) {
  if (typeof optsValue === 'boolean') return optsValue;
  // Default ON for any non-test environment when userId is present.
  // Test code can pass useWarmKit: false to opt out.
  return process.env.RAG_USE_WARM_KIT !== 'false';
}

/**
 * @param {object}  opts
 * @param {string}  opts.question
 * @param {number?} opts.userId
 * @param {number}  [opts.timeoutMs=250]
 * @param {boolean} [opts.useHyde]
 * @param {string}  [opts.mode]    'general' | 'coding' | 'design' | 'sql' | 'behavioral' | 'sre'
 *                                  Biases KB retrieval to a subset of sources.
 *                                  Unknown/general → no filter (full hybrid search).
 * @returns {Promise<{chunks, timedOut, latencyMs}>}
 */
export async function retrieve(opts) {
  const { question, userId, timeoutMs = DEFAULT_TIMEOUT_MS, useHyde, useRerank, useWarmKit, mode } = opts;
  const t0 = performance.now();
  const sourceFilter = sourcesForMode(mode);

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('__TIMEOUT__'), timeoutMs);
  });

  const willRerank = resolveUseRerank(useRerank);
  const willUseKit = resolveUseWarmKit(useWarmKit);
  const willUseHyde = resolveUseHyde(useHyde);
  const work = (async () => {
    // Phase 5: prefer warm kit when available — skips embed + ANN.
    if (userId && willUseKit) {
      const { readSessionKit } = await import('./sessionKit.js');
      const kit = await readSessionKit(userId).catch(() => null);
      if (kit && Array.isArray(kit.chunks) && kit.chunks.length > 0) {
        let kitChunks = kit.chunks;
        // Mode gating: drop kit chunks whose source isn't in the
        // mode's allowed list. User-tier chunks (no source) always
        // pass — Prep Kit content is per-user and mode-agnostic.
        if (sourceFilter) {
          const allowed = new Set(sourceFilter);
          kitChunks = kitChunks.filter((c) => c.tier === 'user' || allowed.has(c.source));
        }
        // If gating left nothing usable, fall through to live retrieval
        // rather than returning an empty kit.
        if (kitChunks.length > 0) {
          if (willRerank) {
            const { rerank } = await import('./reranker.js');
            kitChunks = await rerank(question, kitChunks, FINAL_TOP_K);
          } else {
            kitChunks = kitChunks.slice(0, KB_TOP_K_NARROW + USER_TOP_K_NARROW);
          }
          return {
            chunks: kitChunks.map((c) => ({ ...c, content: (c.content || '').slice(0, MAX_CHUNK_CHARS) })),
            usedKit: true,
          };
        }
      }
    }
    // ... existing live-retrieval code path follows ...
    const { embedQuery } = await import('./embeddings.js');
    let queryForEmbed = question;
    if (willUseHyde) {
      const { hydeRewrite } = await import('./hyde.js');
      const rewritten = await hydeRewrite(question);
      if (rewritten) queryForEmbed = `${question}\n\n${rewritten}`;
    }
    const vec = await embedQuery(queryForEmbed);
    const kbTop = willRerank ? KB_TOP_K_WIDE : KB_TOP_K_NARROW;
    const userTop = willRerank ? USER_TOP_K_WIDE : USER_TOP_K_NARROW;
    const promises = [hybridSearchKb(question, kbTop, { vec, sourceFilter })];
    if (userId) promises.push(hybridSearchUserDocs(userId, question, userTop, { vec }));
    // Per-user code kit: only relevant for coding/sql modes (or general,
    // since coding follow-ups can come up in any chat). Keep CODE_TOP_K
    // small so past attempts inform but don't dominate.
    const wantsCode = !sourceFilter || mode === 'coding' || mode === 'sql' || mode === 'general';
    if (userId && wantsCode) {
      promises.push(hybridSearchUserCode(userId, question, CODE_TOP_K, { vec }));
    }
    const results = await Promise.all(promises);
    let merged = results.flat();
    if (willRerank) {
      const { rerank } = await import('./reranker.js');
      merged = await rerank(question, merged, FINAL_TOP_K);
    }
    return {
      chunks: merged.map((c) => ({ ...c, content: (c.content || '').slice(0, MAX_CHUNK_CHARS) })),
      usedKit: false,
    };
  })();

  try {
    const winner = await Promise.race([work, timeout]);
    const latencyMs = Math.round(performance.now() - t0);
    if (winner === '__TIMEOUT__') {
      import('./retrievalLogger.js').then(({ logRetrieval }) =>
        logRetrieval({
          userId,
          question,
          chunks: [],
          latencyMs,
          timedOut: true,
          usedWarmKit: false,
          usedHyde: willUseHyde,
          usedRerank: willRerank,
        }).catch(() => {}),
      );
      return { chunks: [], timedOut: true, latencyMs, lowConfidence: true };
    }
    const { chunks, usedKit } = winner;
    // CRAG: grade chunks for relevance before injecting into prompt.
    // Runs only when RAG_USE_GRADING=true; fails open on timeout.
    const gradedChunks = await gradeChunks(question, chunks);

    const lowConfidence = detectLowConfidence(gradedChunks);
    import('./retrievalLogger.js').then(({ logRetrieval }) =>
      logRetrieval({
        userId,
        question,
        chunks,
        latencyMs,
        timedOut: false,
        usedWarmKit: usedKit,
        usedHyde: willUseHyde,
        usedRerank: willRerank,
      }).catch(() => {}),
    );
    return { chunks: gradedChunks, timedOut: false, latencyMs, lowConfidence };
  } finally {
    clearTimeout(timer);
  }
}

const LOW_RERANK_THRESHOLD = 0.20;
const LOW_RRF_THRESHOLD = 0.025;
const HIGH_DISTANCE_THRESHOLD = 0.5;

function detectLowConfidence(chunks) {
  if (!chunks || chunks.length === 0) return true;
  const top = chunks[0];
  if (typeof top.rerankScore === 'number') return top.rerankScore < LOW_RERANK_THRESHOLD;
  if (typeof top.rrfScore === 'number') return top.rrfScore < LOW_RRF_THRESHOLD;
  if (typeof top.distance === 'number') return top.distance > HIGH_DISTANCE_THRESHOLD;
  return false;
}

export function formatRetrievedContext(chunks) {
  if (!chunks || chunks.length === 0) return '';
  const lines = ['[GROUNDING — verbatim source excerpts; cite by tag if relevant]'];
  for (const c of chunks) {
    if (c.tier === 'kb') {
      lines.push(`[KB ${c.source} / ${c.topicTitle} / ${c.section}]`);
    } else if (c.tier === 'code') {
      lines.push(`[YOUR CODE / ${c.problemTitle} / ${c.language}]`);
    } else {
      lines.push(`[USER ${c.docKind}${c.section ? ' / ' + c.section : ''}]`);
    }
    lines.push(c.content);
    lines.push('');
  }
  return lines.join('\n').trim();
}
