/**
 * Retrieval logger — writes one row per retrieve() call to
 * lumora_retrieval_logs. Fire-and-forget: failures are swallowed so
 * logging never breaks the answer path. Used by the eval CLI for
 * recall@k / MRR computation and by latency dashboards.
 */
import { query } from '../lib/shared-db.js';

const MAX_QUESTION_CHARS = 8000;
const MAX_CHUNKS = 20;

function pickScore(chunk) {
  if (typeof chunk.rerankScore === 'number') return chunk.rerankScore;
  if (typeof chunk.rrfScore === 'number') return chunk.rrfScore;
  if (typeof chunk.distance === 'number') return chunk.distance;
  return null;
}

export async function logRetrieval({
  userId = null,
  question,
  chunks = [],
  latencyMs = null,
  timedOut = false,
  usedWarmKit = false,
  usedHyde = false,
  usedRerank = false,
}) {
  try {
    const safeQuestion = (question || '').slice(0, MAX_QUESTION_CHARS);
    const slice = chunks.slice(0, MAX_CHUNKS);
    const ids = slice.map((c) => c.id);
    const scores = slice.map(pickScore);
    await query(
      `INSERT INTO lumora_retrieval_logs
         (user_id, question, top_chunk_ids, scores, latency_ms,
          used_warm_kit, used_hyde, used_rerank, timed_out)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9)`,
      [
        userId,
        safeQuestion,
        JSON.stringify(ids),
        JSON.stringify(scores),
        latencyMs,
        !!usedWarmKit,
        !!usedHyde,
        !!usedRerank,
        !!timedOut,
      ],
    );
  } catch (err) {
    // Logging must never break the live answer path.
    console.warn('[retrievalLogger] write failed:', err.message);
  }
}
