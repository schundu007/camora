/**
 * Index a user's Lumora Prep Kit blob into lumora_user_doc_chunks.
 *
 * The Prep panel persists JSON shaped roughly:
 *   { activeCompany: 'NVIDIA',
 *     data: { NVIDIA: { jd, resume, coverLetter, jdFile, resumeFile, ... } } }
 *
 * On every save we replace-and-rewrite the user's chunks. Simple and
 * cheap (typical Prep blob is <5KB → <10 chunks; embedding cost is
 * fractions of a cent per save). prep_state_version is a monotonic
 * counter we'll persist in lumora_prep_state via a follow-up; for now
 * we use Date.now().
 */
import { query } from '../lib/shared-db.js';
import { embedBatch } from './embeddings.js';
import { estimateTokens } from './chunker.js';

const MAX_TOKENS_PER_CHUNK = 700;

function splitForUserDoc(text, max = MAX_TOKENS_PER_CHUNK) {
  if (!text) return [];
  if (estimateTokens(text) <= max) return [text];
  const paras = text.split(/\n\n+/);
  const out = [];
  let buf = [];
  let bufTok = 0;
  for (const p of paras) {
    const t = estimateTokens(p);
    if (bufTok + t > max && buf.length > 0) {
      out.push(buf.join('\n\n'));
      buf = [p];
      bufTok = t;
    } else {
      buf.push(p);
      bufTok += t;
    }
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
}

// Study material is unbounded by design — the panel invites "add as many as
// you want", and one GitHub repo fetch alone can add ~600 KB. Embedding every
// byte on every save would turn a keystroke-debounced autosave into a
// multi-dollar, multi-minute job, so cap it. The caps are generous enough for
// a full interview kit (a 100 KB document is ~35 chunks) and the drop is
// reported by the caller rather than swallowed.
const MAX_STUDY_CHUNKS = 120;
const MAX_CHUNKS_PER_STUDY_DOC = 40;

function buildDocChunks(prepData) {
  const company = prepData.activeCompany;
  if (!company) return [];
  const doc = prepData.data?.[company];
  if (!doc) return [];

  const chunks = [];
  const push = (kind, section, content, metadata) => {
    chunks.push({
      companyKey: company,
      kind,
      section,
      content,
      tokenCount: estimateTokens(content),
      metadata: metadata || {},
    });
  };

  const fields = [
    { key: 'jd',            kind: 'jd',             section: 'body' },
    { key: 'resume',        kind: 'resume',         section: 'body' },
    { key: 'coverLetter',   kind: 'cover_letter',   section: 'body' },
    // prepMaterials and studyDocs were collected by the panel and persisted in
    // the blob, but never indexed — so retrieval could not see a single word of
    // them while the UI said "Sona reads them all". Anything pasted there was
    // dead weight in the payload.
    { key: 'prepMaterials', kind: 'prep_materials', section: 'body' },
  ];
  for (const f of fields) {
    const val = doc[f.key];
    if (typeof val !== 'string' || !val.trim()) continue;
    const parts = splitForUserDoc(val);
    parts.forEach((p, i) => {
      push(
        f.kind,
        parts.length === 1 ? f.section : `${f.section}:${i}`,
        p,
        { fileName: doc[`${f.key}File`] || null },
      );
    });
  }

  // studyDocs[]: { name, content }. Indexed as 'study_doc' — a doc_kind that
  // behavioral mode denies. These are third-person technical write-ups about a
  // company's systems; grounding a "tell me about a time you..." answer on one
  // makes the model narrate that company's architecture as the candidate's own
  // work history.
  let studyBudget = MAX_STUDY_CHUNKS;
  let dropped = 0;
  const studyDocs = Array.isArray(doc.studyDocs) ? doc.studyDocs : [];
  studyDocs.forEach((sd, docIdx) => {
    const content = typeof sd?.content === 'string' ? sd.content : '';
    if (!content.trim()) return;
    const parts = splitForUserDoc(content);
    const keep = parts.slice(0, Math.min(MAX_CHUNKS_PER_STUDY_DOC, studyBudget));
    dropped += parts.length - keep.length;
    studyBudget -= keep.length;
    keep.forEach((p, i) => {
      push('study_doc', `doc${docIdx}:${i}`, p, {
        fileName: sd?.name || `study-doc-${docIdx}`,
        docIndex: docIdx,
      });
    });
  });

  return { chunks, dropped };
}

export async function indexUserPrepDocs({ userId, prepData }) {
  if (!userId || !prepData || typeof prepData !== 'object') {
    return { skipped: true };
  }
  const { chunks, dropped } = buildDocChunks(prepData);
  if (chunks.length === 0) return { skipped: true };
  if (dropped > 0) {
    console.warn(`[userDocIndexer] user=${userId} study material exceeded the chunk cap — ${dropped} chunk(s) not indexed`);
  }

  const version = Date.now();
  // Scoped to rows this function owns. An unqualified delete also removed the
  // R2-sourced research_doc rows written by indexR2Doc, so every Prep save
  // silently un-indexed every uploaded research document.
  await query(
    'DELETE FROM lumora_user_doc_chunks WHERE user_id = $1 AND source_key IS NULL',
    [userId],
  );
  const vecs = await embedBatch(chunks.map((c) => c.content));
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    await query(
      `INSERT INTO lumora_user_doc_chunks
         (user_id, company_key, doc_kind, section, content, token_count,
          embedding, metadata, prep_state_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8::jsonb, $9)`,
      [
        userId, c.companyKey, c.kind, c.section, c.content, c.tokenCount,
        `[${vecs[i].join(',')}]`,
        JSON.stringify(c.metadata),
        version,
      ],
    );
  }
  return { written: chunks.length, version };
}

export async function indexR2Doc({ r2Key, userId, companySlug }) {
  if (!r2Key || !userId || !companySlug) return { skipped: true };
  const { fetchR2Text } = await import('../lib/r2.js');
  const text = await fetchR2Text(r2Key);
  if (!text || text.trim().length < 20) return { skipped: true };

  const parts = splitForUserDoc(text);
  const version = Date.now();
  await query('DELETE FROM lumora_user_doc_chunks WHERE user_id = $1 AND source_key = $2', [userId, r2Key]);
  const vecs = await embedBatch(parts);
  for (let i = 0; i < parts.length; i++) {
    await query(
      `INSERT INTO lumora_user_doc_chunks
         (user_id, company_key, doc_kind, section, content, token_count,
          embedding, metadata, prep_state_version, source_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8::jsonb, $9, $10)`,
      [
        userId, companySlug, 'research_doc', `r2:${i}`, parts[i], estimateTokens(parts[i]),
        `[${vecs[i].join(',')}]`,
        JSON.stringify({ r2Key }),
        version,
        r2Key,
      ],
    );
  }
  return { written: parts.length, version };
}
