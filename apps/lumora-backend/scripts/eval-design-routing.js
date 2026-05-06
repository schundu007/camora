#!/usr/bin/env node
/**
 * Design-routing eval — runs the hand-curated pair set in
 * apps/lumora-backend/eval/design-routing-pairs.json through
 * classifyDesignKind() and reports a pass/fail matrix.
 *
 * The vitest in tests/designRoutingEval.test.js asserts the same set
 * for CI regression catching. This script is the human-readable
 * auditor — useful when you're tuning cues or adding new known
 * problems and want to see ONE table of everything at once.
 *
 * Usage:
 *   node apps/lumora-backend/scripts/eval-design-routing.js
 *   node apps/lumora-backend/scripts/eval-design-routing.js --only-fails
 *   node apps/lumora-backend/scripts/eval-design-routing.js --by-archetype
 *
 * Exits 0 on 100% pass, 1 on any miss — wireable into CI if needed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDesignKind } from '../src/services/designKindClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAIRS_PATH = path.resolve(__dirname, '../eval/design-routing-pairs.json');

function parseArgs(argv) {
  return {
    onlyFails: argv.includes('--only-fails'),
    byArchetype: argv.includes('--by-archetype'),
  };
}

function pad(s, n) { return String(s).padEnd(n); }

function main() {
  const { onlyFails, byArchetype } = parseArgs(process.argv);
  const { pairs } = JSON.parse(readFileSync(PAIRS_PATH, 'utf8'));

  const results = pairs.map((p) => {
    const got = classifyDesignKind(p.question, p.hint || null);
    return { ...p, got, ok: got === p.expected };
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  // Human-readable matrix
  const rows = onlyFails ? results.filter((r) => !r.ok) : results;

  if (byArchetype) {
    const buckets = {};
    for (const r of rows) {
      (buckets[r.expected] ||= []).push(r);
    }
    for (const [arch, list] of Object.entries(buckets)) {
      const archPass = list.filter((r) => r.ok).length;
      console.log(`\n=== ${arch.toUpperCase()} (${archPass}/${list.length} pass) ===`);
      printRows(list);
    }
  } else {
    printRows(rows);
  }

  console.log(`\n${'─'.repeat(118)}`);
  console.log(`Total: ${passed}/${results.length} pass${failed ? ` — ${failed} FAILED` : ''}`);
  process.exit(failed === 0 ? 0 : 1);
}

function printRows(rows) {
  console.log(
    pad('Question', 42),
    pad('Hint', 16),
    pad('Got', 16),
    pad('Expected', 16),
    'Why',
  );
  console.log('─'.repeat(118));
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗';
    console.log(
      pad(r.question, 42),
      pad(r.hint || '—', 16),
      pad(r.got, 16),
      pad(r.expected, 16),
      `${mark} ${r.why}`,
    );
  }
}

main();
