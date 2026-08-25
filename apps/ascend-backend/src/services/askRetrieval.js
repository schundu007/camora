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
const CI_HINTS = /\b(ci|cd|pipeline|workflow|runner|build system|monorepo|submodule|terraform|drift|kubernetes|k8s|gpu)\b/i;

export function sourcesForQuestion(q) {
  if (!q) return null;
  // CI-flavoured questions: bias toward the general CI/SRE/design material.
  //
  // This used to route to 'capra-amd-ci', a company-specific study deck, and
  // the CI_HINTS branch is broad enough ("kubernetes", "pipeline", "gpu") that
  // it pulled one company's study notes into a large share of general
  // questions. The deck has been removed; company decks are reachable only
  // through their own explicit mode in lumora-backend's modeSourceFilter, not
  // from keyword sniffing here.
  if (CI_HINTS.test(q)) return ['capra-devops', 'capra-sre', 'capra-system-design'];
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

/**
 * Render retrieved chunks as a prompt block.
 *
 * Chunks are labelled by TITLE, never by number. They used to be numbered
 * `[1]`…`[6]`, with the prompt telling the model not to cite them — and Gemini
 * complied with the letter of that by renaming the index and printing it
 * anyway, so live answers came out carrying "[Ref 3]" and "[Ref 6]". A
 * candidate reading that out loud says a number that refers to nothing.
 *
 * Removing the index removes the thing there is to cite. `createCitationStripper`
 * is the backstop for whatever the model invents instead.
 */
export function formatContext(chunks) {
  if (!chunks || chunks.length === 0) return '';
  const body = chunks
    .map((c) => {
      const label = [c.topic_title || c.source, c.section].filter(Boolean).join(' — ');
      return `SOURCE — ${label}\n${c.content}`;
    })
    .join('\n\n');
  return `\n\nReference material retrieved for this question. Treat it as your own knowledge: prefer its specifics (names, numbers, commands, versions) over your own recollection, and ignore any entry that does not bear on the question.

The candidate reads your answer out loud in a live interview. Anything they cannot say is a defect. So write every line as plain speech carrying NO citation markers of any kind — no "[Ref 3]", no "[3]", no "(source)", no "SOURCE —", and no mention that reference material was supplied to you. A fact worth using is stated directly, as something you know.\n\n${body}`;
}

/*
 * Citation markers the model may still emit despite the instruction above.
 * Deliberately narrow: the label word is REQUIRED, so a bare `[3]` — an array
 * index, a markdown footnote in the candidate's own pasted code — is never
 * touched. Only a labelled, numbered bracket or paren is.
 */
const CITE_RE = /[[(](?:refs?|references?|sources?|citations?|docs?|kb|context)\s*[:#]?\s*\d+(?:\s*(?:,|;|&|and|-|–)\s*\d+)*[\])][ \t]?/gi;

/* Could the tail of the buffer be the front of a marker that has not finished
 * arriving? An open `[` followed only by letters, then optional separators,
 * then optional digits. `arr[3]` closes in the same chunk and never reaches
 * this test; `[Ref ` does. */
const PARTIAL_RE = /^\[[A-Za-z]{0,12}[\s:#]{0,4}[\d\s,;&–-]{0,16}$/;

/* Give up holding after this many characters so a stray `[` can never stall
 * the stream — longer than any real marker. */
const MAX_HOLD = 40;

/**
 * Strip citation markers from a token stream without eating content.
 *
 * SSE tokens split anywhere, so "[Ref" and " 3]" routinely arrive in separate
 * chunks and a per-chunk `.replace()` would miss every one of them. This holds
 * back only the trailing fragment that could still become a marker, emits
 * everything before it, and re-tests on the next token.
 *
 * Usage: `const strip = createCitationStripper()` per request, then
 * `strip.push(token)` at each write site and `strip.flush()` before [DONE].
 */
export function createCitationStripper() {
  let buf = '';
  return {
    push(chunk) {
      if (!chunk) return '';
      buf += chunk;
      let out = '';
      let cut = 0;      // everything before this is resolved
      let hold = -1;    // index the buffer must be kept from, or -1
      CITE_RE.lastIndex = 0;
      for (let m = CITE_RE.exec(buf); m; m = CITE_RE.exec(buf)) {
        // A match touching the end of the buffer is not final: the space the
        // pattern optionally eats may be the next token. Wait one character
        // rather than emit "manifest.  Then" with the gap left behind.
        if (m.index + m[0].length === buf.length) { hold = m.index; break; }
        out += buf.slice(cut, m.index);
        cut = m.index + m[0].length;
      }
      if (hold === -1) {
        // Nothing matched at the end — but the tail may still be growing into
        // a marker, so keep it back if it could be one.
        const rest = buf.slice(cut);
        const open = rest.lastIndexOf('[');
        if (open !== -1 && rest.indexOf(']', open) === -1) {
          const tail = rest.slice(open);
          if (tail.length <= MAX_HOLD && PARTIAL_RE.test(tail)) hold = cut + open;
        }
      }
      out += buf.slice(cut, hold === -1 ? buf.length : hold);
      buf = hold === -1 ? '' : buf.slice(hold);
      return out;
    },

    /** Release whatever is still held. Safe to call more than once. */
    flush() {
      const out = buf.replace(CITE_RE, '');
      buf = '';
      return out;
    },
  };
}
