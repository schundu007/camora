#!/usr/bin/env node
/**
 * Retrieval eval — runs the hand-curated pair set in
 * apps/lumora-backend/eval/retrieval-pairs.json through retrieve()
 * and reports recall@4, recall@8, and MRR.
 *
 * Usage:
 *   node apps/lumora-backend/scripts/eval-retrieval.js
 *   node apps/lumora-backend/scripts/eval-retrieval.js --use-hyde
 *   node apps/lumora-backend/scripts/eval-retrieval.js --use-hyde --use-rerank
 *   node apps/lumora-backend/scripts/eval-retrieval.js --limit 5 --verbose
 *
 * --no-warm-kit: bypass session kit (default behavior — eval is KB-only).
 * --verbose:     print per-pair top-K + match rank.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { retrieve } from '../src/services/retrieval.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAIRS_PATH = path.resolve(__dirname, '../eval/retrieval-pairs.json');

function parseArgs(argv) {
  const args = { useHyde: false, useRerank: false, useWarmKit: false, limit: null, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--use-hyde') args.useHyde = true;
    else if (argv[i] === '--use-rerank') args.useRerank = true;
    else if (argv[i] === '--warm-kit') args.useWarmKit = true;
    else if (argv[i] === '--no-warm-kit') args.useWarmKit = false;
    else if (argv[i] === '--limit') args.limit = Number(argv[++i]);
    else if (argv[i] === '--verbose') args.verbose = true;
  }
  return args;
}

function findHitRank(chunks, expectedSources, expectedTopicIds) {
  const sources = new Set(expectedSources || []);
  const topicIds = new Set(expectedTopicIds || []);
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (sources.size > 0 && c.source && sources.has(c.source)) return i + 1;
    if (topicIds.size > 0 && c.topicId && topicIds.has(c.topicId)) return i + 1;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const blob = JSON.parse(readFileSync(PAIRS_PATH, 'utf8'));
  let pairs = blob.pairs || [];
  if (args.limit) pairs = pairs.slice(0, args.limit);

  console.log(`Eval config: useHyde=${args.useHyde} useRerank=${args.useRerank} useWarmKit=${args.useWarmKit} pairs=${pairs.length}`);
  console.log('');

  const results = [];
  let i = 0;
  for (const p of pairs) {
    i++;
    process.stdout.write(`[${i}/${pairs.length}] ${p.id} ... `);
    const t0 = performance.now();
    const r = await retrieve({
      question: p.question,
      userId: null,
      timeoutMs: 5000, // generous for eval; warm-kit bypassed so cold-start applies
      useHyde: args.useHyde,
      useRerank: args.useRerank,
      useWarmKit: args.useWarmKit,
    });
    const elapsed = Math.round(performance.now() - t0);
    const rank = findHitRank(r.chunks, p.expectedSources, p.expectedTopicIds);
    const status = rank ? `HIT@${rank}` : 'MISS';
    process.stdout.write(`${status} (${elapsed}ms, ${r.chunks.length} chunks)\n`);
    results.push({ pair: p, rank, latency: elapsed, chunks: r.chunks });

    if (args.verbose) {
      for (let j = 0; j < Math.min(8, r.chunks.length); j++) {
        const c = r.chunks[j];
        const score = c.rerankScore || c.rrfScore || c.distance || 0;
        console.log(`     ${j + 1}. [${c.tier}] ${c.source || c.docKind} / ${c.topicTitle || c.section} (id=${c.topicId || c.id}, score=${score.toFixed(3)})`);
      }
    }
  }

  // Aggregate metrics
  const total = results.length;
  const recallAt4 = results.filter((r) => r.rank && r.rank <= 4).length / total;
  const recallAt8 = results.filter((r) => r.rank && r.rank <= 8).length / total;
  const mrr = results.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / total;
  const avgLatency = results.reduce((s, r) => s + r.latency, 0) / total;
  const misses = results.filter((r) => r.rank === null).map((r) => r.pair.id);

  console.log('\n──────────────────────────────────────────────');
  console.log(`recall@4:    ${(recallAt4 * 100).toFixed(1)}%  (${results.filter((r) => r.rank && r.rank <= 4).length}/${total})`);
  console.log(`recall@8:    ${(recallAt8 * 100).toFixed(1)}%  (${results.filter((r) => r.rank && r.rank <= 8).length}/${total})`);
  console.log(`MRR:         ${mrr.toFixed(3)}`);
  console.log(`avg latency: ${avgLatency.toFixed(0)}ms`);
  if (misses.length > 0) {
    console.log(`misses (${misses.length}): ${misses.join(', ')}`);
  }
  console.log('──────────────────────────────────────────────');

  // Per-source breakdown — recall@8 grouped by primary expected source
  const bySource = new Map();
  for (const r of results) {
    const src = r.pair.expectedSources?.[0] || '(none)';
    if (!bySource.has(src)) bySource.set(src, { total: 0, hits: 0 });
    const e = bySource.get(src);
    e.total++;
    if (r.rank && r.rank <= 8) e.hits++;
  }
  console.log('per-source recall@8:');
  for (const [src, e] of [...bySource.entries()].sort()) {
    const pct = ((e.hits / e.total) * 100).toFixed(0);
    console.log(`  ${src.padEnd(28)} ${e.hits}/${e.total}  ${pct}%`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('eval-retrieval failed:', err);
  process.exit(1);
});
