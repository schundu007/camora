#!/usr/bin/env node
/**
 * Executes every Python code block in the learn curriculum and checks that each
 * "# Output:" comment matches what the interpreter actually prints.
 *
 * A wrong output comment in a teaching resource is worse than no comment, and
 * the type checker cannot see inside a template literal. This is the only thing
 * that can.
 *
 * Deliberately a script and not a vitest test: it shells out to python3, and a
 * suite that goes red on a machine without an interpreter is worse than none.
 * No python3 means "skip and exit 0".
 *
 *   node scripts/verify-python-examples.mjs                  # every topic
 *   node scripts/verify-python-examples.mjs --only variables,tuples
 *
 * Exits 1 on any mismatch, 0 otherwise.
 *
 * Note on --only: topics written before this script existed use an older
 * convention where one comment summarises several printed lines, as in a loop
 * followed by `# Output: apple  banana  cherry`. That is not a false claim, but
 * it is not one-to-one either, so a full run currently reports those alongside
 * the genuinely wrong ones. Use --only to check the topic you are writing.
 *
 * Comparison rule: a block's "# Output:" comments, read top to bottom, must
 * line up one-for-one with the lines the block prints, and each comment must
 * START WITH the printed line. The house style appends a short explanation
 * after the value, as in `# Output: [1, 2, 3, 4]  <- a changed too!`, so an
 * exact match would reject correct content. A block with no "# Output:" comment
 * at all asserts nothing and is skipped.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/src/data/python/index.ts';
const OUTPUT_RE = /#\s*Output:\s?(.*)$/;

function findPython() {
  for (const exe of ['python3', 'python']) {
    const probe = spawnSync(exe, ['--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) {
      return { exe, version: (probe.stdout || probe.stderr).trim() };
    }
  }
  return null;
}

/** Every runnable code field on a topic, labelled by where it lives. */
function blocksOf(topic) {
  const out = [{ where: 'cleanCode', code: topic.cleanCode }];
  for (const [i, s] of (topic.sections ?? []).entries()) {
    if (s.code) out.push({ where: `sections[${i}] ${s.heading}`, code: s.code });
  }
  for (const [i, e] of topic.examples.entries()) {
    out.push({ where: `examples[${i}] ${e.label}`, code: e.code });
  }
  // walkthrough[].code is single-line excerpts of cleanCode by design, not
  // standalone programs, so it is not executed.
  return out;
}

function checkBlock(python, code) {
  const expected = code
    .split('\n')
    .map(line => line.match(OUTPUT_RE))
    .filter(Boolean)
    .map(m => m[1].trimEnd());

  // A block with no "# Output:" comment makes no claim to check.
  if (expected.length === 0) return { skipped: true };

  // Run in a throwaway directory. Some topics (file-io) write real files, and
  // they must never land in the repo.
  const sandbox = mkdtempSync(path.join(os.tmpdir(), 'camora-py-verify-'));
  let run;
  try {
    run = spawnSync(python, ['-c', code], { encoding: 'utf8', cwd: sandbox });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
  if (run.error) return { problem: `could not run python: ${run.error.message}` };
  if (run.status !== 0) {
    return { problem: `block raised an error:\n      ${(run.stderr || '').trim().split('\n').slice(-3).join('\n      ')}` };
  }

  const actual = run.stdout.replace(/\n$/, '');
  const printed = actual.length === 0 ? [] : actual.split('\n');

  if (printed.length !== expected.length) {
    return { problem: `printed ${printed.length} line(s) but has ${expected.length} "# Output:" comment(s)` };
  }
  for (let i = 0; i < printed.length; i++) {
    if (!expected[i].startsWith(printed[i])) {
      return { problem: `line ${i + 1}: printed ${JSON.stringify(printed[i])}, comment claims ${JSON.stringify(expected[i])}` };
    }
  }
  return { verified: expected.length };
}

async function loadTopics() {
  // Vite resolves the TypeScript, the extensionless imports and the @/ alias.
  const { createServer } = await import('vite');
  const server = await createServer({
    root: APP_ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, watch: null },
    // We only ssrLoadModule one data file. Skipping dependency discovery keeps
    // the scan from racing server.close() and printing a spurious stack trace.
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const mod = await server.ssrLoadModule(ENTRY);
    return mod.PYTHON_TOPICS;
  } finally {
    await server.close();
  }
}

const python = findPython();
if (!python) {
  console.log('python3 not found, skipping example verification.');
  process.exit(0);
}

const onlyFlag = process.argv.indexOf('--only');
const onlyIds = onlyFlag === -1
  ? null
  : new Set((process.argv[onlyFlag + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean));

const allTopics = await loadTopics();
const topics = onlyIds ? allTopics.filter(t => onlyIds.has(t.id)) : allTopics;

if (onlyIds) {
  const missing = [...onlyIds].filter(id => !allTopics.some(t => t.id === id));
  if (missing.length) {
    console.error(`Unknown topic id(s): ${missing.join(', ')}`);
    process.exit(1);
  }
}

console.log(`Verifying Python examples with ${python.version}\n`);

let totalBlocks = 0;
let totalSkipped = 0;
const failures = [];

for (const topic of topics) {
  let checked = 0;
  let skipped = 0;
  const bad = [];

  for (const block of blocksOf(topic)) {
    const result = checkBlock(python.exe, block.code);
    if (result.skipped) {
      skipped++;
    } else if (result.problem) {
      checked++;
      bad.push({ ...block, problem: result.problem });
    } else {
      checked++;
    }
  }

  totalBlocks += checked;
  totalSkipped += skipped;

  const note = skipped ? ` (${skipped} block(s) assert no output)` : '';
  if (bad.length === 0) {
    console.log(`  PASS  ${topic.id.padEnd(18)} ${checked} block(s)${note}`);
  } else {
    console.log(`  FAIL  ${topic.id.padEnd(18)} ${checked} block(s), ${bad.length} wrong${note}`);
    for (const b of bad) {
      console.log(`        ${b.where}: ${b.problem}`);
      failures.push(`${topic.id} / ${b.where}`);
    }
  }
}

console.log(
  `\n${topics.length} topic(s), ${totalBlocks} block(s) verified, ` +
  `${totalSkipped} skipped, ${failures.length} failure(s).`
);

if (failures.length > 0) {
  console.error('\nWrong output comments:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
