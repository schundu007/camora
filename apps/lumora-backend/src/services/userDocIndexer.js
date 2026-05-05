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

function buildDocChunks(prepData) {
  const company = prepData.activeCompany;
  if (!company) return [];
  const doc = prepData.data?.[company];
  if (!doc) return [];

  const chunks = [];
  const fields = [
    { key: 'jd',          kind: 'jd',          section: 'body' },
    { key: 'resume',      kind: 'resume',      section: 'body' },
    { key: 'coverLetter', kind: 'cover_letter', section: 'body' },
  ];
  for (const f of fields) {
    const val = doc[f.key];
    if (typeof val !== 'string' || !val.trim()) continue;
    const parts = splitForUserDoc(val);
    parts.forEach((p, i) => {
      chunks.push({
        companyKey: company,
        kind: f.kind,
        section: parts.length === 1 ? f.section : `${f.section}:${i}`,
        content: p,
        tokenCount: estimateTokens(p),
        metadata: { fileName: doc[`${f.key}File`] || null },
      });
    });
  }
  return chunks;
}

export async function indexUserPrepDocs({ userId, prepData }) {
  if (!userId || !prepData || typeof prepData !== 'object') {
    return { skipped: true };
  }
  const chunks = buildDocChunks(prepData);
  if (chunks.length === 0) return { skipped: true };

  const version = Date.now();
  await query(
    'DELETE FROM lumora_user_doc_chunks WHERE user_id = $1',
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
