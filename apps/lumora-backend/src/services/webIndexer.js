/**
 * Web indexer — fetches a URL, chunks the extracted text into ~700-token
 * windows, embeds, and upserts into lumora_kb_chunks with
 * source_kind='web-watchlist'. Idempotent via content_hash short-circuit.
 *
 * On fetch/extract failure, returns {skipped: true, error} so the caller
 * (Prep PUT pipeline, refresh CLI) can log and continue.
 */
import { createHash } from 'node:crypto';
import { query } from '../lib/shared-db.js';
import { embedBatch } from './embeddings.js';
import { estimateTokens } from './chunker.js';
import { fetchAndExtract } from './webExtract.js';

const MAX_TOKENS_PER_CHUNK = 700;
const SOURCE_KIND = 'web-watchlist';

function sha32(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function topicIdForUrl(url) {
  return sha32(url).slice(0, 16);
}

function chunkText(text, max = MAX_TOKENS_PER_CHUNK) {
  if (!text || !text.trim()) return [];
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

async function getExistingHashes(source, topicId) {
  const r = await query(
    'SELECT topic_id, section, content_hash FROM lumora_kb_chunks WHERE source = $1 AND topic_id = $2',
    [source, topicId],
  );
  const map = new Map();
  for (const row of r.rows) {
    map.set(`${row.topic_id}|${row.section}`, row.content_hash);
  }
  return map;
}

async function upsertChunk(c, embedding) {
  await query(
    `INSERT INTO lumora_kb_chunks
       (source_kind, source, topic_id, topic_title, section,
        content, token_count, embedding, metadata, content_hash, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9::jsonb, $10, NOW())
     ON CONFLICT (source, topic_id, section) DO UPDATE SET
       topic_title = EXCLUDED.topic_title,
       content = EXCLUDED.content,
       token_count = EXCLUDED.token_count,
       embedding = EXCLUDED.embedding,
       metadata = EXCLUDED.metadata,
       content_hash = EXCLUDED.content_hash,
       updated_at = NOW()`,
    [
      c.sourceKind, c.source, c.topicId, c.topicTitle, c.section,
      c.content, c.tokenCount,
      `[${embedding.join(',')}]`,
      JSON.stringify(c.metadata),
      c.contentHash,
    ],
  );
}

/**
 * @param {object} opts
 * @param {string} opts.url      page to index
 * @param {string} opts.label    human-readable label (e.g., "Stripe Eng Blog")
 * @param {string} opts.source   stable group key (typically a company name)
 * @returns {Promise<{chunkCount: number, written?: number, skipped?: boolean, error?: string}>}
 */
export async function indexWatchlistUrl({ url, label, source }) {
  let extracted;
  try {
    extracted = await fetchAndExtract(url);
  } catch (err) {
    return { skipped: true, error: err.message, chunkCount: 0 };
  }
  if (!extracted.text || !extracted.text.trim()) {
    return { skipped: true, error: 'empty extracted text', chunkCount: 0 };
  }
  const topicId = topicIdForUrl(url);
  const topicTitle = label || url;

  const parts = chunkText(extracted.text);
  if (parts.length === 0) return { skipped: true, error: 'no chunks', chunkCount: 0 };

  const chunks = parts.map((content, i) => ({
    sourceKind: SOURCE_KIND,
    source,
    topicId,
    topicTitle,
    section: `chunk:${i}`,
    content,
    tokenCount: estimateTokens(content),
    metadata: { url, label, fetchedAt: extracted.fetchedAt },
    contentHash: sha32(`${SOURCE_KIND}|${source}|${topicId}|chunk:${i}|${content.trim()}`),
  }));

  const existing = await getExistingHashes(source, topicId);
  const newOrChanged = chunks.filter((c) => existing.get(`${c.topicId}|${c.section}`) !== c.contentHash);
  if (newOrChanged.length === 0) {
    return { chunkCount: chunks.length, written: 0 };
  }
  const vecs = await embedBatch(newOrChanged.map((c) => c.content));
  for (let i = 0; i < newOrChanged.length; i++) {
    await upsertChunk(newOrChanged[i], vecs[i]);
  }
  return { chunkCount: chunks.length, written: newOrChanged.length };
}
