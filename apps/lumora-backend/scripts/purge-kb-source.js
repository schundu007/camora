/**
 * Delete every chunk belonging to a KB source.
 *
 * Why this exists: index-capra-kb.js UPSERTS. It never deletes. So removing a
 * deck from topic-manifest.js stops it being refreshed but leaves every row it
 * ever wrote in lumora_kb_chunks — still embedded, still matched by vector and
 * BM25 search, still cited.
 *
 * That is actively dangerous for a company-specific study deck. Such a deck is
 * protected by being listed in STUDY_ONLY_SOURCES, which subtracts it from
 * unfiltered search. Delete the deck from the manifest and drop it from
 * STUDY_ONLY_SOURCES, and the orphaned rows become reachable from EVERY
 * unfiltered query — the exclusion is gone but the content is not. The deck
 * ends up less contained after removal than it was before.
 *
 * Usage:
 *   node apps/lumora-backend/scripts/purge-kb-source.js --source capra-amd-ci
 *   node apps/lumora-backend/scripts/purge-kb-source.js --source X --dry-run
 *
 * Requires DATABASE_URL.
 */
import { query, closePool } from '../src/lib/shared-db.js';

function parseArgs(argv) {
  const args = { source: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function main() {
  const { source, dryRun } = parseArgs(process.argv);
  if (!source) {
    console.error('Usage: purge-kb-source.js --source <slug> [--dry-run]');
    process.exit(1);
  }

  const { rows } = await query(
    `SELECT topic_id, COUNT(*)::int AS chunks
       FROM lumora_kb_chunks
      WHERE source = $1
      GROUP BY topic_id
      ORDER BY topic_id`,
    [source],
  );

  if (rows.length === 0) {
    console.log(`No chunks found for source "${source}" — nothing to purge.`);
    return;
  }

  const total = rows.reduce((n, r) => n + r.chunks, 0);
  console.log(`Source "${source}" — ${rows.length} topic(s), ${total} chunk(s):`);
  for (const r of rows) console.log(`  ${String(r.chunks).padStart(4)}  ${r.topic_id}`);

  if (dryRun) {
    console.log('\n--dry-run: nothing deleted.');
    return;
  }

  const del = await query('DELETE FROM lumora_kb_chunks WHERE source = $1', [source]);
  console.log(`\nDeleted ${del.rowCount} chunk(s) for "${source}".`);

  // A warm session kit is a cached copy of chunk rows. Purging the source
  // without clearing kits leaves the deleted content live in cached form —
  // the same way a stale kit outlives the prep data it came from.
  const kits = await query(
    `DELETE FROM lumora_session_kit
      WHERE kit::text LIKE $1`,
    [`%"${source}"%`],
  );
  if (kits.rowCount > 0) {
    console.log(`Cleared ${kits.rowCount} warm session kit(s) that cached this source.`);
    console.log('They rebuild on the next Prep save.');
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => closePool().catch(() => {}));
