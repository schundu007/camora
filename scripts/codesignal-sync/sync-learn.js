#!/usr/bin/env node
/**
 * CodeSignal Learn → Camora Problem Library sync
 *
 * Fetches all course paths from codesignal.com/learn/course-paths using the
 * authenticated Server Action and transforms each path into a problem entry.
 * (Detailed course/lesson pages require a paid CodeSignal subscription.)
 *
 * Usage:
 *   node extract-learn-cookies.js          # one-time cookie extraction
 *   node sync-learn.js --dry-run           # test run
 *   node sync-learn.js                     # full sync
 *   node sync-learn.js --paths 10          # limit to first 10 paths
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROBLEMS_PATH = join(__dirname, '../../apps/camora/src/data/capra/problems-full.json');
const STATE_PATH = join(__dirname, 'codesignal-learn-state.json');
const COOKIES_PATH = join(__dirname, '.codesignal-learn-cookies.json');

const BASE = 'https://codesignal.com';
const ACTION_BROWSE_PATHS = '405bf6f3892d432d67ebae1087709fe6b8049af749';

// ── CLI args ──────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : null; };
  return {
    dryRun: args.includes('--dry-run'),
    maxPaths: parseInt(flag('--paths') || '0'),
  };
}

// ── State ─────────────────────────────────────────────────────────
function loadState() {
  if (!existsSync(STATE_PATH)) return { lastSync: null, importedSlugs: [], count: 0 };
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}
function saveState(s) { writeFileSync(STATE_PATH, JSON.stringify(s, null, 2)); }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── HTTP helpers ──────────────────────────────────────────────────
function makeHeaders(cookieStr, extra = {}) {
  return {
    Cookie: cookieStr,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,*/*',
    ...extra,
  };
}

// RSC format: "0:{...}\n1:[data]\n" — extract the line-1 payload
function parseRSC(text) {
  for (const line of (text || '').split('\n')) {
    const m = line.match(/^1:([\[\{].+)$/);
    if (m) { try { return JSON.parse(m[1]); } catch {} }
  }
  return null;
}

// ── Server Action call ────────────────────────────────────────────
async function serverAction(cookieStr, pageUrl, actionHash, body) {
  const res = await fetch(pageUrl, {
    method: 'POST',
    headers: makeHeaders(cookieStr, {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Next-Action': actionHash,
      'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
    }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server Action HTTP ${res.status}`);
  return parseRSC(await res.text());
}

// ── Fetch course paths (paginated) ────────────────────────────────
async function fetchCoursePaths(cookieStr) {
  const all = [];
  let skip = 0;
  const take = 50;
  while (true) {
    process.stdout.write(`  Fetching paths (skip=${skip})…\r`);
    const data = await serverAction(
      cookieStr,
      `${BASE}/learn/course-paths/browse`,
      ACTION_BROWSE_PATHS,
      [{ take, skip, filters: { query: '', sortBy: 'popularity', filterBy: { levels: [], collectionIds: [], jobIds: [], toolIds: [], partners: [] } } }]
    );
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < take) break;
    skip += take;
    await sleep(300);
  }
  console.log(`  ${all.length} course paths found`);
  return all;
}

// ── Transform path → problem entry ───────────────────────────────
function slugify(text) {
  return ('cslearn-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 80);
}

function inferTopic(title) {
  const t = title.toLowerCase();
  if (/python/.test(t)) return 'python';
  if (/javascript|js\b|typescript|node/.test(t)) return 'javascript';
  if (/\bjava\b/.test(t) && !/javascript/.test(t)) return 'java';
  if (/\bsql\b/.test(t)) return 'sql';
  if (/c\+\+|cpp/.test(t)) return 'dsa';
  if (/react|angular|vue/.test(t)) return 'javascript';
  if (/system.?design/.test(t)) return 'system-design';
  if (/algorithm|data.?struct|dsa/.test(t)) return 'dsa';
  if (/machine.?learn|ml\b|deep.?learn|neural|ai\b|artificial/.test(t)) return 'general';
  if (/array|list/.test(t)) return 'arrays';
  if (/string/.test(t)) return 'strings';
  if (/tree/.test(t)) return 'trees';
  if (/graph/.test(t)) return 'graphs';
  if (/dynamic|dp\b/.test(t)) return 'dynamic-programming';
  if (/sort/.test(t)) return 'sorting';
  if (/search|binary.?search/.test(t)) return 'searching';
  if (/hash/.test(t)) return 'hash-tables';
  if (/recursion/.test(t)) return 'recursion';
  if (/interview|preparation|prep/.test(t)) return 'general';
  return 'general';
}

function normLevel(raw) {
  const r = (raw || '').toLowerCase();
  if (/easy|begin/.test(r)) return 'easy';
  if (/hard|adv/.test(r)) return 'hard';
  return 'medium';
}

function transformPath(pathInfo) {
  const slug = slugify(pathInfo.title);
  const topic = inferTopic(pathInfo.title);
  const difficulty = normLevel(pathInfo.level);
  const practiceCount = pathInfo.practiceCount || 0;

  const description = `${pathInfo.title} — a CodeSignal Learn path with ${practiceCount} practice problems. ` +
    `Level: ${pathInfo.level || 'general'}. Covers ${topic} fundamentals through hands-on coding exercises ` +
    `designed to build interview-ready skills.`;

  return {
    slug,
    title: pathInfo.title,
    topic,
    difficulty,
    description: description.slice(0, 2000),
    meta: `${pathInfo.title} (${practiceCount} tasks, ${pathInfo.level || 'general'})`,
    source: 'codesignal-learn',
    codesignalLearnPath: pathInfo.urlSlug,
    practiceCount,
    testCases: [],
    solutions: {},
    boilerplate: {},
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const { dryRun, maxPaths } = parseArgs();

  if (!existsSync(COOKIES_PATH)) {
    console.error('Missing .codesignal-learn-cookies.json\nRun: node extract-learn-cookies.js');
    process.exit(1);
  }

  const { cookieStr, email } = JSON.parse(readFileSync(COOKIES_PATH, 'utf8'));
  if (!cookieStr) { console.error('No cookieStr in .codesignal-learn-cookies.json'); process.exit(1); }

  console.log('\n── CodeSignal Learn Sync ────────────────────────────');
  console.log(`  Account: ${email}`);
  if (dryRun) console.log('  DRY RUN');
  if (maxPaths) console.log(`  Path limit: ${maxPaths}`);

  // Verify session is valid
  const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: makeHeaders(cookieStr) });
  const session = await sessionRes.json();
  if (!session?.user?.email) {
    console.error('Session expired. Re-run: node extract-learn-cookies.js');
    process.exit(1);
  }
  console.log(`  Session OK: ${session.user.email}`);

  const state = loadState();
  const existingProblems = JSON.parse(readFileSync(PROBLEMS_PATH, 'utf8'));
  const toAdd = {};
  const skipped = [];

  // ── Step 1: Get all course paths ──────────────────────────────
  console.log('\n[1] Fetching course paths...');
  const allPaths = await fetchCoursePaths(cookieStr);
  const paths = maxPaths ? allPaths.slice(0, maxPaths) : allPaths;

  // ── Step 2: Transform each path into a problem entry ──────────
  console.log('\n[2] Transforming paths...');
  for (const pathInfo of paths) {
    const problem = transformPath(pathInfo);
    const { slug } = problem;

    if (state.importedSlugs.includes(slug) || existingProblems[slug] || toAdd[slug]) {
      skipped.push(slug);
      continue;
    }

    toAdd[slug] = problem;
  }

  // ── Results ────────────────────────────────────────────────────
  const addCount = Object.keys(toAdd).length;
  console.log(`\n[Summary]`);
  console.log(`  + ${addCount} new problems`);
  console.log(`  - ${skipped.length} duplicates skipped`);

  if (dryRun) {
    console.log('\n  [DRY RUN] Sample problems:');
    Object.values(toAdd).slice(0, 10).forEach(p =>
      console.log(`    ${p.slug} | ${p.topic} | ${p.difficulty} | ${p.practiceCount} tasks | ${p.title}`)
    );
    return;
  }

  if (addCount === 0) { console.log('  Nothing new to add.'); return; }

  const merged = { ...existingProblems, ...toAdd };
  writeFileSync(PROBLEMS_PATH, JSON.stringify(merged, null, 2));

  state.importedSlugs.push(...Object.keys(toAdd));
  state.count += addCount;
  state.lastSync = new Date().toISOString();
  saveState(state);

  console.log(`\n  problems-full.json: ${Object.keys(existingProblems).length} → ${Object.keys(merged).length}`);
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
