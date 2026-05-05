#!/usr/bin/env node
/**
 * Manually re-crawl the live web tier for a given company.
 *
 * Usage:
 *   node apps/lumora-backend/scripts/refresh-watchlist.js --company NVIDIA
 *   node apps/lumora-backend/scripts/refresh-watchlist.js --company Stripe --dry-run
 *
 * Reuses webWatchlist.resolveWatchlist() to derive URLs from the
 * COMPANY_SOURCES map, then calls webIndexer.indexWatchlistUrl() per
 * URL. Idempotent — re-running on unchanged content writes no rows.
 *
 * Cost: roughly 1 Haiku-free fetch + ~10 OpenAI embeds per URL.
 * Per-company: ~$0.002.
 */
import 'dotenv/config';
import { resolveWatchlist } from '../src/services/webWatchlist.js';
import { indexWatchlistRoot } from '../src/services/webIndexer.js';

function parseArgs(argv) {
  const args = { company: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--company') args.company = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function main() {
  const { company, dryRun } = parseArgs(process.argv);
  if (!company) {
    console.error('Usage: node scripts/refresh-watchlist.js --company <Name> [--dry-run]');
    process.exit(2);
  }

  // resolveWatchlist takes a prepData-shaped object; we synthesize one
  // with just the activeCompany field since v1 only uses that.
  const entries = resolveWatchlist({ activeCompany: company });
  if (entries.length === 0) {
    console.error(`No watchlist URLs for company "${company}". Either the company is not in COMPANY_SOURCES, or its eng URL is null.`);
    process.exit(3);
  }

  console.log(`Refresh plan for ${company}: ${entries.length} URL(s)`);
  for (const e of entries) console.log(`  - ${e.url}  (${e.label})`);
  if (dryRun) {
    console.log('Dry run — no fetches, no writes.');
    process.exit(0);
  }

  let totalChunks = 0;
  let totalWritten = 0;
  const failures = [];
  for (const entry of entries) {
    process.stdout.write(`Crawling ${entry.url} ... `);
    try {
      const r = await indexWatchlistRoot({
        rootUrl: entry.url,
        label: entry.label,
        source: entry.source,
        maxArticles: 5,
      });
      console.log(`${r.totalChunks} chunks total, ${r.totalWritten || 0} written (${r.urlCount} URL(s))`);
      totalChunks += r.totalChunks || 0;
      totalWritten += r.totalWritten || 0;
      if (r.perUrl) {
        for (const u of r.perUrl) {
          const status = u.skipped
            ? `skipped (${u.error || 'no content'})`
            : `${u.chunkCount || 0} chunks, ${u.written || 0} written`;
          console.log(`    - ${u.url}: ${status}`);
        }
      }
      for (const u of (r.perUrl || [])) {
        if (u.skipped) failures.push({ url: u.url, error: u.error });
      }
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failures.push({ url: entry.url, error: err.message });
    }
  }
  console.log(`\nDone. ${totalChunks} chunks total, ${totalWritten} newly written.`);
  if (failures.length > 0) {
    console.log(`Failures: ${failures.length}`);
    for (const f of failures) console.log(`  ${f.url}: ${f.error}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('refresh-watchlist failed:', err);
  process.exit(1);
});
