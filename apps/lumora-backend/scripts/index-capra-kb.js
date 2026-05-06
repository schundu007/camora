#!/usr/bin/env node
/**
 * Index Capra Prepare topics into lumora_kb_chunks.
 *
 * Usage:
 *   node apps/lumora-backend/scripts/index-capra-kb.js
 *   node apps/lumora-backend/scripts/index-capra-kb.js --source capra-sre
 *   node apps/lumora-backend/scripts/index-capra-kb.js --dry-run
 *
 * Idempotent. Skips chunks whose content_hash is unchanged in the DB,
 * so re-running after a topic edit only re-embeds what changed.
 *
 * Hard cost cap: $1 of OpenAI spend per invocation. Aborts before any
 * embedding call if the projected cost exceeds the cap. Override with
 * --max-spend-usd <amount> if you genuinely need more.
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { query } from '../src/lib/shared-db.js';
import { embedBatch } from '../src/services/embeddings.js';
import { chunkTopic, rehash } from '../src/services/chunker.js';
import { chunkProblem } from '../src/services/problemChunker.js';
import { addContextToChunks } from '../src/services/contextualChunker.js';
import { TOPIC_MANIFEST } from './topic-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(
  __dirname,
  '../../../apps/camora/src/data/capra',
);
const TOPICS_DIR = path.join(DATA_DIR, 'topics');

function resolveEntryPath(entry) {
  const base = entry.dir === 'data' ? DATA_DIR : TOPICS_DIR;
  return path.join(base, entry.file);
}

function chunkOne(item, entry) {
  const kind = entry.kind || 'topic';
  if (kind === 'topic') return chunkTopic(item, { source: entry.source });
  if (kind === 'problem-leetcode') return chunkProblem(item, { source: entry.source, kind: 'leetcode' });
  if (kind === 'problem-lld') return chunkProblem(item, { source: entry.source, kind: 'lld' });
  if (kind === 'problem-sd') return chunkProblem(item, { source: entry.source, kind: 'sd' });
  throw new Error(`Unknown manifest kind: ${kind}`);
}

// text-embedding-3-small pricing (May 2026 — verify if model rev changes).
const COST_PER_M_TOKENS_USD = 0.02;
const DEFAULT_MAX_SPEND_USD = 1.00;

function parseArgs(argv) {
  const args = { source: null, dryRun: false, maxSpendUsd: DEFAULT_MAX_SPEND_USD, withContext: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--max-spend-usd') args.maxSpendUsd = Number(argv[++i]);
    else if (argv[i] === '--with-context') args.withContext = true;
  }
  return args;
}

function topicAsDocText(topic) {
  const parts = [
    topic.title,
    topic.description,
    topic.introduction,
    Array.isArray(topic.whenToUse) ? topic.whenToUse.join('\n') : null,
    Array.isArray(topic.keyConcepts) ? topic.keyConcepts.map((kc) => `${kc.term}: ${kc.definition}`).join('\n') : null,
    Array.isArray(topic.questions) ? topic.questions.map((q) => `Q: ${q.question}\nA: ${q.answer || ''}`).join('\n\n') : null,
  ].filter(Boolean);
  return parts.join('\n\n');
}

async function loadTopicsForEntry(entry) {
  const abs = resolveEntryPath(entry);
  const url = pathToFileURL(abs).href;
  const mod = await import(url);
  const exp = mod[entry.export];
  if (entry.shape === 'object') {
    if (!exp || typeof exp !== 'object') {
      throw new Error(`${entry.file}: export ${entry.export} is not an object`);
    }
    // Promote object key onto each value as `slug` so the chunker can
    // use it as a stable topic_id (matches the frontend's URL routing).
    return Object.entries(exp).map(([slug, val]) => ({ ...val, slug }));
  }
  if (!Array.isArray(exp)) {
    throw new Error(`${entry.file}: export ${entry.export} is not an array`);
  }
  return exp;
}

async function getExistingHashes(source) {
  const r = await query(
    'SELECT topic_id, section, content_hash FROM lumora_kb_chunks WHERE source = $1',
    [source],
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
      JSON.stringify({}),
      c.contentHash,
    ],
  );
}

function projectCostUsd(chunks) {
  const totalTokens = chunks.reduce((s, c) => s + c.tokenCount, 0);
  return (totalTokens / 1_000_000) * COST_PER_M_TOKENS_USD;
}

async function indexEntry(entry, { dryRun, withContext }) {
  const topics = await loadTopicsForEntry(entry);
  const existing = await getExistingHashes(entry.source);
  const allChunks = [];
  for (const t of topics) {
    let topicChunks = chunkOne(t, entry);
    if (withContext && !dryRun && (!entry.kind || entry.kind === 'topic')) {
      // Contextual chunking only meaningful for topic shape today; the
      // problem chunker already produces self-contained sections.
      const docText = topicAsDocText(t);
      topicChunks = await addContextToChunks(topicChunks, docText);
      topicChunks = topicChunks.map(rehash);
    }
    for (const c of topicChunks) allChunks.push(c);
  }

  const newOrChanged = allChunks.filter((c) => {
    const k = `${c.topicId}|${c.section}`;
    return existing.get(k) !== c.contentHash;
  });

  const projected = projectCostUsd(newOrChanged);
  console.log(
    `[${entry.source}] topics=${topics.length} chunks=${allChunks.length} ` +
    `new/changed=${newOrChanged.length} unchanged=${allChunks.length - newOrChanged.length} ` +
    `projectedCost=$${projected.toFixed(4)}`,
  );

  if (dryRun || newOrChanged.length === 0) return { written: 0, costUsd: 0 };

  const BATCH = 100;
  let written = 0;
  for (let i = 0; i < newOrChanged.length; i += BATCH) {
    const slice = newOrChanged.slice(i, i + BATCH);
    const vecs = await embedBatch(slice.map((c) => c.content));
    for (let j = 0; j < slice.length; j++) {
      await upsertChunk(slice[j], vecs[j]);
      written++;
    }
    process.stdout.write(`  embedded ${written}/${newOrChanged.length}\r`);
  }
  console.log(`\n  upserted ${written} chunks for ${entry.source}`);
  return { written, costUsd: projected };
}

async function main() {
  const { source, dryRun, maxSpendUsd, withContext } = parseArgs(process.argv);
  const entries = source
    ? TOPIC_MANIFEST.filter((e) => e.source === source)
    : TOPIC_MANIFEST;
  if (entries.length === 0) {
    console.error(`No manifest entries match source=${source}`);
    process.exit(2);
  }

  // Pre-flight cost projection across all selected entries.
  // Aborts if total > cap unless --dry-run is set.
  let totalProjected = 0;
  if (!dryRun) {
    for (const entry of entries) {
      const topics = await loadTopicsForEntry(entry);
      const existing = await getExistingHashes(entry.source);
      const allChunks = [];
      for (const t of topics) {
        for (const c of chunkOne(t, entry)) {
          allChunks.push(c);
        }
      }
      const newOrChanged = allChunks.filter((c) => existing.get(`${c.topicId}|${c.section}`) !== c.contentHash);
      totalProjected += projectCostUsd(newOrChanged);
    }
    if (totalProjected > maxSpendUsd) {
      console.error(
        `ABORT: projected cost $${totalProjected.toFixed(4)} exceeds cap ` +
        `$${maxSpendUsd.toFixed(2)}. Re-run with --max-spend-usd ${Math.ceil(totalProjected * 2)} ` +
        `if you genuinely intend to spend this much.`,
      );
      process.exit(3);
    }
    console.log(`Pre-flight: projected total cost $${totalProjected.toFixed(4)} (cap $${maxSpendUsd.toFixed(2)})`);
  }

  let total = 0;
  let totalCost = 0;
  for (const entry of entries) {
    const r = await indexEntry(entry, { dryRun, withContext });
    total += r.written;
    totalCost += r.costUsd;
  }
  console.log(`Done. Total chunks written: ${total}${dryRun ? ' (dry run)' : ''}. Cost: $${totalCost.toFixed(4)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('index-capra-kb failed:', err);
  process.exit(1);
});
