/**
 * KB retrieval for Ask Sona.
 *
 * Ask Sona runs on ascend-backend, but the knowledge base (lumora_kb_chunks)
 * is written by lumora-backend's indexer. Both services share one Postgres, so
 * we read the table directly rather than adding a cross-service HTTP hop.
 *
 * Contract with the indexer (apps/lumora-backend):
 *   - vectors are gemini-embedding-001 @ outputDimensionality 1536
 *   - vectors are L2-normalized (required: truncated Matryoshka tiers are not
 *     unit-length by default, and pgvector does not normalize for you)
 *   - documents indexed with RETRIEVAL_DOCUMENT; queries MUST use
 *     RETRIEVAL_QUERY — the pair is asymmetric and mixing them costs recall
 *
 * If lumora-backend changes model or dimension, this must change with it.
 * Vectors from different models are not comparable even at equal dimension.
 */
import { GoogleGenAI } from '@google/genai';
import { query } from '../config/database.js';

const MODEL = 'gemini-embedding-001';
const DIM = 1536;

let _client = null;
function client() {
  // GOOGLE_AI_API_KEY first: as of 2026-07 this service's GEMINI_API_KEY is
  // stale and returns API_KEY_INVALID, while GOOGLE_AI_API_KEY is valid.
  // Other call sites on this service still read GEMINI_API_KEY and are
  // presumably broken the same way — worth auditing separately.
  const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_client) _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

function l2normalize(v) {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) sumSq += v[i] * v[i];
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return v.slice();
  return v.map((x) => x / norm);
}

async function embedQuestion(text) {
  const api = client();
  if (!api) return null;
  const res = await api.models.embedContent({
    model: MODEL,
    contents: [text.slice(0, 8000)],
    config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: DIM },
  });
  const v = res?.embeddings?.[0]?.values;
  if (!Array.isArray(v) || v.length !== DIM) return null;
  return l2normalize(v);
}

/**
 * Which KB sources a question should draw on. Kept deliberately small: Ask
 * Sona is a general assistant, so we only narrow when the question clearly
 * belongs to a specialist corpus. Everything else searches the whole KB.
 */
const AMD_HINTS = /\b(amd|rocm|therock|the rock|gfx\d|mi300|mi325|mi350|hip|instinct|arc runner|actions runner controller)\b/i;
const CI_HINTS = /\b(ci|cd|pipeline|workflow|runner|build system|monorepo|submodule|terraform|drift|kubernetes|k8s|gpu)\b/i;

export function sourcesForQuestion(q) {
  if (!q) return null;
  // AMD/ROCm-specific, or CI-flavoured questions during AMD prep: bias toward
  // the company corpus plus the general CI/SRE material that supports it.
  if (AMD_HINTS.test(q)) return ['capra-amd-ci', 'capra-devops', 'capra-sre'];
  if (CI_HINTS.test(q)) return ['capra-amd-ci', 'capra-devops', 'capra-sre', 'capra-system-design'];
  return null; // no filter — full KB
}

/**
 * Retrieve supporting chunks for a question.
 *
 * Fails open: any error (no key, embed failure, DB hiccup) returns [] so Ask
 * Sona answers without grounding rather than erroring. Unlike the live
 * inference path this is a chat assistant — a degraded answer beats no answer.
 * Every failure logs, so degraded is never silent.
 */
export async function retrieveForAsk(question, { limit = 6 } = {}) {
  if (!question || question.trim().length < 8) return [];
  try {
    const vec = await embedQuestion(question);
    if (!vec) {
      console.warn('[askRetrieval] no embedding — answering without KB grounding');
      return [];
    }
    const sources = sourcesForQuestion(question);
    const params = [`[${vec.join(',')}]`, limit];
    let sourceClause = '';
    if (sources) {
      params.push(sources);
      sourceClause = 'WHERE source = ANY($3)';
    }
    const sql = `SELECT source, topic_title, section, content, embedding <=> $1::vector AS distance FROM lumora_kb_chunks ${sourceClause} ORDER BY embedding <=> $1::vector LIMIT $2`;
    const r = await query(sql, params);
    // Cosine distance; >0.62 is empirically unrelated for this corpus. Drop
    // those rather than pad the prompt with noise the model has to ignore.
    return r.rows.filter((row) => Number(row.distance) < 0.62);
  } catch (err) {
    console.error('[askRetrieval] retrieval failed, answering ungrounded:', err?.message || err);
    return [];
  }
}

/**
 * The candidate's OWN prep material — resume, JD, cover letter for their active
 * company — read straight from lumora_prep_state (shared Postgres, written by
 * lumora-backend's Prep Kit). This is what "tell me about yourself" must ground
 * on. Ask Sona's system prompt tells the model to answer in the first person as
 * the candidate; with no personal material it invents a plausible-but-FAKE
 * persona (fake employers, fake metrics). This runs deterministically — no
 * embedding — so unlike vector retrieval it cannot silently fail to a persona.
 *
 * Returns '' (and the caller degrades) when there is no prep kit, rather than
 * throwing — a chat assistant should still answer, just without a résumé.
 */
export async function getCandidateBackground(userId, { maxChars = 6000 } = {}) {
  if (!userId) return '';
  try {
    const r = await query('SELECT data FROM lumora_prep_state WHERE user_id = $1', [userId]);
    const data = r.rows[0]?.data;
    if (!data || typeof data !== 'object') return '';
    const company = data.activeCompany || (Array.isArray(data.companies) ? data.companies[0] : null);
    const doc = company ? data.data?.[company] : null;
    if (!doc) return '';
    const parts = [];
    if (doc.resume) parts.push(`RESUME:\n${doc.resume}`);
    if (doc.jd) parts.push(`JOB DESCRIPTION${company ? ` (${company})` : ''}:\n${doc.jd}`);
    if (doc.coverLetter) parts.push(`COVER LETTER:\n${doc.coverLetter}`);
    if (parts.length === 0) return '';
    let body = parts.join('\n\n');
    if (body.length > maxChars) body = body.slice(0, maxChars);
    return `\n\nCANDIDATE BACKGROUND — this is who "I" am. Every first-person claim ("I built…", "at my last role…", any employer, project, title, or metric) MUST come from THIS material. NEVER invent an employer, role, project, or number that is not written here. If the background does not cover what was asked, answer in the first person from general knowledge WITHOUT fabricating a specific personal history.\n\n${body}`;
  } catch (err) {
    console.error('[askRetrieval] candidate background load failed:', err?.message || err);
    return '';
  }
}

/** Render retrieved chunks as a prompt block. Returns '' when there's nothing. */
export function formatContext(chunks) {
  if (!chunks || chunks.length === 0) return '';
  const body = chunks
    .map((c, i) => `[${i + 1}] ${c.topic_title || c.source} — ${c.section}\n${c.content}`)
    .join('\n\n');
  return `\n\nReference material retrieved for this question. Use it when relevant and prefer its specifics (names, numbers, PR references) over your own recollection. Ignore any entry that does not bear on the question, and never mention this block or cite it by number to the user.\n\n${body}`;
}
