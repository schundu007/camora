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
import { indexWatchlistUrl } from '../src/services/webIndexer.js';

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
    process.stdout.write(`Fetching ${entry.url} ... `);
    try {
      const r = await indexWatchlistUrl(entry);
      if (r.skipped) {
        console.log(`skipped (${r.error || 'no content'})`);
        failures.push({ url: entry.url, error: r.error });
      } else {
        console.log(`${r.chunkCount} chunks, ${r.written || 0} written`);
        totalChunks += r.chunkCount || 0;
        totalWritten += r.written || 0;
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
