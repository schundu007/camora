/**
 * CoderPad → Camora Problem Library sync
 *
 * Usage:
 *   node sync.js --phase code  --email you@x.com --password xxx
 *   node sync.js --phase mcq   --email you@x.com --password xxx
 *   node sync.js               # both phases, reads .env for credentials
 *   node sync.js --phase code --dry-run
 *
 * Credentials can also live in scripts/coderpad-sync/.env:
 *   CODERPAD_EMAIL=...
 *   CODERPAD_PASSWORD=...
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { getSessionCookies, fetchAllQuestions } from './scraper.js';
import { transformCodeQuestion, transformMcqQuestion } from './transform.js';
import { isDuplicate } from './dedup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const PROBLEMS_PATH = join(__dirname, '../../apps/camora/src/data/capra/problems-full.json');
const MCQ_PATH = join(__dirname, '../../apps/camora/src/data/capra/mcq-problems.json');
const STATE_PATH = join(__dirname, 'coderpad-state.json');

// ── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    phase: flag('--phase') ?? 'both',
    email: flag('--email') ?? process.env.CODERPAD_EMAIL,
    password: flag('--password') ?? process.env.CODERPAD_PASSWORD,
    dryRun: args.includes('--dry-run'),
  };
}

// ── State helpers ─────────────────────────────────────────────────────────────

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { lastSync: null, importedCodeIds: [], importedMcqIds: [], codeProblemCount: 0, mcqProblemCount: 0 };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ── Phase 1: Code questions ───────────────────────────────────────────────────

async function runCodePhase(cookieStr, state, dryRun) {
  console.log('\n── Phase 1: Code Questions ──────────────────────────');
  console.log('Fetching from CoderPad...');

  const { items: rawItems, total } = await fetchAllQuestions(cookieStr, 'code', (n, t) => {
    process.stdout.write(`\r  ${n}/${t} fetched`);
  });
  console.log(`\nFetched ${rawItems.length} of ${total} code questions.`);

  const existingProblems = JSON.parse(readFileSync(PROBLEMS_PATH, 'utf8'));
  const toAdd = {};
  const skipped = [];

  for (const raw of rawItems) {
    const candidate = transformCodeQuestion(raw);
    const check = isDuplicate(candidate, existingProblems, state, 'code');
    if (check.isDupe) {
      skipped.push({ title: candidate.title, reason: check.reason });
      continue;
    }
    toAdd[candidate.slug] = candidate;
  }

  const addCount = Object.keys(toAdd).length;
  console.log(`  + ${addCount} new problems`);
  console.log(`  - ${skipped.length} duplicates skipped`);

  if (skipped.length > 0) {
    const sample = skipped.slice(0, 5).map((s) => `    [${s.reason}] ${s.title}`).join('\n');
    console.log(`  Sample skipped:\n${sample}`);
    if (skipped.length > 5) console.log(`    …and ${skipped.length - 5} more`);
  }

  if (dryRun) {
    console.log('  [DRY RUN] No files written.');
    return;
  }

  if (addCount === 0) {
    console.log('  Nothing new to add.');
    return;
  }

  const merged = { ...existingProblems, ...toAdd };
  writeFileSync(PROBLEMS_PATH, JSON.stringify(merged, null, 2));
  state.importedCodeIds.push(...Object.values(toAdd).map((p) => p.coderpadId));
  state.codeProblemCount += addCount;
  state.lastSync = new Date().toISOString();
  saveState(state);
  console.log(`  problems-full.json updated (${Object.keys(merged).length} total problems).`);
}

// ── Phase 2: MCQ questions ────────────────────────────────────────────────────

async function runMcqPhase(cookieStr, state, dryRun) {
  console.log('\n── Phase 2: MCQ Questions ───────────────────────────');
  console.log('Fetching from CoderPad...');

  const { items: rawItems, total } = await fetchAllQuestions(cookieStr, 'mcq', (n, t) => {
    process.stdout.write(`\r  ${n}/${t} fetched`);
  });
  console.log(`\nFetched ${rawItems.length} of ${total} MCQ questions.`);

  const mcqStore = existsSync(MCQ_PATH)
    ? JSON.parse(readFileSync(MCQ_PATH, 'utf8'))
    : { version: 1, lastSync: null, count: 0, problems: {} };

  const toAdd = {};
  const skipped = [];

  for (const raw of rawItems) {
    const candidate = transformMcqQuestion(raw);
    const check = isDuplicate(candidate, mcqStore.problems, state, 'mcq');
    if (check.isDupe) {
      skipped.push({ title: candidate.title, reason: check.reason });
      continue;
    }
    toAdd[candidate.id] = candidate;
  }

  const addCount = Object.keys(toAdd).length;
  console.log(`  + ${addCount} new MCQ problems`);
  console.log(`  - ${skipped.length} duplicates skipped`);

  if (dryRun) {
    console.log('  [DRY RUN] No files written.');
    return;
  }

  if (addCount === 0) {
    console.log('  Nothing new to add.');
    return;
  }

  mcqStore.problems = { ...mcqStore.problems, ...toAdd };
  mcqStore.count = Object.keys(mcqStore.problems).length;
  mcqStore.lastSync = new Date().toISOString();
  writeFileSync(MCQ_PATH, JSON.stringify(mcqStore, null, 2));
  state.importedMcqIds.push(...Object.values(toAdd).map((p) => p.coderpadId));
  state.mcqProblemCount += addCount;
  state.lastSync = new Date().toISOString();
  saveState(state);
  console.log(`  mcq-problems.json updated (${mcqStore.count} total MCQ problems).`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { phase, email, password, dryRun } = parseArgs();

  if (!email || !password) {
    console.error(
      'Error: provide --email and --password, or set CODERPAD_EMAIL / CODERPAD_PASSWORD in scripts/coderpad-sync/.env'
    );
    process.exit(1);
  }

  console.log(`\nCoderPad Sync  phase=${phase}${dryRun ? '  [DRY RUN]' : ''}`);
  console.log('Logging in (a browser will open briefly)...');

  const cookieStr = await getSessionCookies(email, password);
  console.log('Login OK.');

  const state = loadState();

  if (phase === 'code' || phase === 'both') await runCodePhase(cookieStr, state, dryRun);
  if (phase === 'mcq' || phase === 'both') await runMcqPhase(cookieStr, state, dryRun);

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
