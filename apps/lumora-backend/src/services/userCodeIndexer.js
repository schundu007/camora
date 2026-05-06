/**
 * Per-user code kit (RAG Phase 6).
 *
 * Captures the user's submitted code from the Practice playground so
 * Sona can ground future questions in the user's own coding style +
 * past attempts.
 *
 * Indexing strategy: keep last N attempts per (user, problem) so the
 * kit reflects evolving understanding without growing unbounded. When
 * the same problem is re-attempted, the oldest beyond MAX_PER_PROBLEM
 * is pruned. Per-user namespace enforced at the SQL layer.
 *
 * Token budget per chunk: 700 (matches the rest of the corpus).
 * Code shorter than that is one chunk; longer code is split at blank
 * lines as a soft boundary.
 */
import { query } from '../lib/shared-db.js';
import { embedBatch } from './embeddings.js';
import { estimateTokens } from './chunker.js';

const MAX_TOKENS_PER_CHUNK = 700;
const MAX_PER_PROBLEM = 3;            // keep 3 most recent attempts per problem
const MAX_CODE_CHARS = 32_000;        // hard upper bound on code length

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

function splitCode(code, max = MAX_TOKENS_PER_CHUNK) {
  if (estimateTokens(code) <= max) return [code];
  // Soft split at blank lines, then at single newlines as fallback.
  const blocks = code.split(/\n\n+/);
  const out = [];
  let buf = [];
  let bufTok = 0;
  for (const b of blocks) {
    const t = estimateTokens(b);
    if (bufTok + t > max && buf.length > 0) {
      out.push(buf.join('\n\n'));
      buf = [b];
      bufTok = t;
    } else {
      buf.push(b);
      bufTok += t;
    }
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
}

/**
 * Build chunk objects from a single submitted code attempt.
 * Returns [] for invalid input rather than throwing — callers are
 * fire-and-forget and never want to bubble.
 */
export function buildCodeChunks({ problem, language, code, success }) {
  if (!problem || typeof problem !== 'string') return [];
  if (!language || typeof language !== 'string') return [];
  if (!code || typeof code !== 'string') return [];
  if (code.length > MAX_CODE_CHARS) return [];
  const trimmed = code.trim();
  if (!trimmed) return [];

  const slug = slugify(problem);
  const title = problem.trim().slice(0, 200);
  const parts = splitCode(trimmed);
  return parts.map((p, i) => ({
    problemSlug: slug,
    problemTitle: title,
    language: language.toLowerCase().slice(0, 40),
    section: parts.length === 1 ? 'solution' : `solution:${i}`,
    content: `# Your past ${language} attempt at "${title}":\n\`\`\`${language}\n${p}\n\`\`\``,
    tokenCount: estimateTokens(p),
    success: !!success,
    metadata: { attemptedAt: Date.now(), success: !!success },
  }));
}

/**
 * Persist a single code attempt for a user. Idempotent in spirit —
 * called fire-and-forget from the Practice run path. Prunes older
 * attempts beyond MAX_PER_PROBLEM for this (user, problem).
 *
 * Returns { written, pruned } counts. On any failure returns
 * { error } so callers can log without crashing.
 */
export async function indexUserCode({ userId, problem, language, code, success = true }) {
  if (!userId) return { skipped: true, reason: 'no userId' };
  const chunks = buildCodeChunks({ problem, language, code, success });
  if (chunks.length === 0) return { skipped: true, reason: 'no chunks' };

  try {
    const vecs = await embedBatch(chunks.map((c) => c.content));
    let written = 0;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      await query(
        `INSERT INTO lumora_user_code_chunks
           (user_id, problem_slug, problem_title, language, section,
            content, token_count, embedding, success, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9, $10::jsonb)`,
        [
          userId, c.problemSlug, c.problemTitle, c.language, c.section,
          c.content, c.tokenCount,
          `[${vecs[i].join(',')}]`,
          c.success,
          JSON.stringify(c.metadata),
        ],
      );
      written++;
    }

    // Prune oldest attempts for this (user, problem) beyond MAX_PER_PROBLEM.
    // Each "attempt" is a contiguous group sharing a created_at timestamp,
    // but in practice attempts are seconds apart so this prunes by row id.
    const slug = chunks[0].problemSlug;
    const pruneRes = await query(
      `WITH ranked AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS rnk
           FROM lumora_user_code_chunks
          WHERE user_id = $1 AND problem_slug = $2
       )
       DELETE FROM lumora_user_code_chunks
        WHERE id IN (SELECT id FROM ranked WHERE rnk > $3)`,
      [userId, slug, MAX_PER_PROBLEM * 4], // generous: 4 chunks per attempt cap
    );
    return { written, pruned: pruneRes.rowCount || 0 };
  } catch (err) {
    return { error: err.message };
  }
}
