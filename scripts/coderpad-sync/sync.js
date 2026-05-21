/**
 * CoderPad → Camora Problem Library sync
 *
 * Usage:
 *   node sync.js               # both phases, Google OAuth on first run
 *   node sync.js --phase code  # code questions only
 *   node sync.js --phase mcq   # MCQ stubs only
 *   node sync.js --phase code --dry-run
 *
 * Login: opens a browser window on first run; Google OAuth session is saved to
 * .coderpad-session.json and reused on subsequent runs automatically.
 *
 * NOTE: MCQ choices are NOT returned by the list endpoint. MCQ import stores
 * metadata (title, domain, difficulty) only.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loginAndGetContext, fetchAllQuestions } from './scraper.js';
import { transformCodeQuestion, transformMcqQuestion } from './transform.js';
import { isDuplicate } from './dedup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROBLEMS_PATH = join(__dirname, '../../apps/camora/src/data/capra/problems-full.json');
const MCQ_PATH = join(__dirname, '../../apps/camora/src/data/capra/mcq-problems.json');
const STATE_PATH = join(__dirname, 'coderpad-state.json');

// Preferred language order for CODE dedup (same question ID, multiple language variants)
const PREFERRED_LANG_ORDER = [
  'Python3', 'JavaScript', 'Java', 'Go', 'C++', 'C#',
  'TypeScript', 'Ruby', 'Rust', 'Swift', 'Kotlin', 'PHP', 'SQL', 'R', 'Cross',
];

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    phase: flag('--phase') ?? 'both',
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

// ── CODE dedup by question ID ─────────────────────────────────────────────────
// The same question ID appears once per supported language.
// Pick one variant per ID using PREFERRED_LANG_ORDER.

function pickBestVariant(variants) {
  for (const lang of PREFERRED_LANG_ORDER) {
    const match = variants.find((v) => v.programmingLanguageId === lang);
    if (match) return match;
  }
  return variants[0];
}

function dedupeByLanguage(codeItems) {
  const byId = {};
  for (const item of codeItems) {
    if (!byId[item.id]) byId[item.id] = [];
    byId[item.id].push(item);
  }
  return Object.values(byId).map(pickBestVariant);
}

// ── Phase 1: Code questions ───────────────────────────────────────────────────

async function runCodePhase(allItems, state, dryRun) {
  console.log('\n── Phase 1: Code Questions ──────────────────────────');

  const rawCode = allItems.filter((i) => i.type === 'CODE' || i.type === 'SOLO');
  console.log(`  ${rawCode.length} CODE items (before language dedup)`);

  const deduped = dedupeByLanguage(rawCode);
  console.log(`  ${deduped.length} unique CODE questions (after language dedup)`);

  const existingProblems = JSON.parse(readFileSync(PROBLEMS_PATH, 'utf8'));
  const toAdd = {};
  const skipped = [];

  for (const raw of deduped) {
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

  if (skipped.length > 0 && skipped.length <= 10) {
    skipped.forEach((s) => console.log(`    [${s.reason}] ${s.title}`));
  } else if (skipped.length > 10) {
    skipped.slice(0, 5).forEach((s) => console.log(`    [${s.reason}] ${s.title}`));
    console.log(`    …and ${skipped.length - 5} more`);
  }

  if (dryRun) { console.log('  [DRY RUN] No files written.'); return; }
  if (addCount === 0) { console.log('  Nothing new to add.'); return; }

  const merged = { ...existingProblems, ...toAdd };
  writeFileSync(PROBLEMS_PATH, JSON.stringify(merged, null, 2));
  state.importedCodeIds.push(...Object.values(toAdd).map((p) => p.coderpadId));
  state.codeProblemCount += addCount;
  state.lastSync = new Date().toISOString();
  saveState(state);
  console.log(`  problems-full.json updated (${Object.keys(merged).length} total problems).`);
}

// ── Phase 2: MCQ questions ────────────────────────────────────────────────────

async function runMcqPhase(allItems, state, dryRun) {
  console.log('\n── Phase 2: MCQ Questions ───────────────────────────');
  console.log('  ⚠  MCQ choices/answers not available in list response.');
  console.log('  Importing metadata (title, domain, difficulty) only.');

  const rawMcq = allItems.filter((i) => i.type === 'MCQ');
  console.log(`  ${rawMcq.length} MCQ items found`);

  const mcqStore = existsSync(MCQ_PATH)
    ? JSON.parse(readFileSync(MCQ_PATH, 'utf8'))
    : { version: 1, lastSync: null, count: 0, problems: {} };

  const toAdd = {};
  const skipped = [];

  for (const raw of rawMcq) {
    const candidate = transformMcqQuestion(raw);
    const check = isDuplicate(candidate, mcqStore.problems, state, 'mcq');
    if (check.isDupe) {
      skipped.push({ title: candidate.title, reason: check.reason });
      continue;
    }
    toAdd[candidate.id] = candidate;
  }

  const addCount = Object.keys(toAdd).length;
  console.log(`  + ${addCount} new MCQ stubs`);
  console.log(`  - ${skipped.length} duplicates skipped`);

  if (dryRun) { console.log('  [DRY RUN] No files written.'); return; }
  if (addCount === 0) { console.log('  Nothing new to add.'); return; }

  mcqStore.problems = { ...mcqStore.problems, ...toAdd };
  mcqStore.count = Object.keys(mcqStore.problems).length;
  mcqStore.lastSync = new Date().toISOString();
  writeFileSync(MCQ_PATH, JSON.stringify(mcqStore, null, 2));
  state.importedMcqIds.push(...Object.values(toAdd).map((p) => p.coderpadId));
  state.mcqProblemCount += addCount;
  state.lastSync = new Date().toISOString();
  saveState(state);
  console.log(`  mcq-problems.json updated (${mcqStore.count} total MCQ stubs).`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { phase, dryRun } = parseArgs();

  console.log(`\nCoderPad Sync  phase=${phase}${dryRun ? '  [DRY RUN]' : ''}`);
  console.log('Opening browser (restores saved session or waits for Google OAuth)...');

  const { cookieStr, orgId } = await loginAndGetContext();
  console.log('Login OK.');

  console.log('Fetching all questions from CoderPad...');
  const { items: allItems, total, countByType } = await fetchAllQuestions(
    cookieStr,
    orgId,
    (n, t) => process.stdout.write(`\r  ${n}/${t} fetched`)
  );
  console.log(`\nFetched ${allItems.length} of ${total} total questions.`);
  console.log(`  By type: CODE=${countByType.CODE ?? 0}  MCQ=${countByType.MCQ ?? 0}  TEXT=${countByType.TEXT ?? 0}  SOLO=${countByType.SOLO ?? 0}`);

  const state = loadState();

  if (phase === 'code' || phase === 'both') await runCodePhase(allItems, state, dryRun);
  if (phase === 'mcq' || phase === 'both') await runMcqPhase(allItems, state, dryRun);

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
