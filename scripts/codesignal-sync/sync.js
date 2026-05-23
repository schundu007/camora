#!/usr/bin/env node
/**
 * CodeSignal → Camora Problem Library sync
 *
 * Fetches all coding + design tasks from CodeSignal (arcade + company library)
 * and merges them into problems-full.json.
 *
 * Usage:
 *   node sync.js               # full sync
 *   node sync.js --dry-run     # show what would be added, write nothing
 *   node sync.js --limit 50    # cap items per source (for testing)
 *
 * Prerequisites:
 *   node extract-cookies.js    # one-time Chrome cookie extraction
 *   node probe-api.js          # verify endpoints are reachable
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROBLEMS_PATH = join(__dirname, '../../apps/camora/src/data/capra/problems-full.json');
const STATE_PATH = join(__dirname, 'codesignal-state.json');
const COOKIES_PATH = join(__dirname, '.codesignal-cookies.json');

// ── CLI args ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    limit: (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : 0; })(),
  };
}

// ── State ─────────────────────────────────────────────────────────

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { lastSync: null, importedIds: [], problemCount: 0 };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ── HTTP helpers ──────────────────────────────────────────────────

function makeHeaders(cookieStr) {
  return {
    Cookie: cookieStr,
    Accept: 'application/json, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://app.codesignal.com/',
    Origin: 'https://app.codesignal.com',
  };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function gql(cookieStr, query, variables = {}) {
  const res = await fetch('https://app.codesignal.com/graphql', {
    method: 'POST',
    headers: makeHeaders(cookieStr),
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401 || res.status === 403) throw new Error(`Auth error ${res.status} — re-run extract-cookies.js`);
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors?.length) throw new Error(`GraphQL error: ${data.errors[0].message}`);
  return data.data;
}

async function restGet(cookieStr, url) {
  const res = await fetch(url, { headers: makeHeaders(cookieStr) });
  if (res.status === 401 || res.status === 403) throw new Error(`Auth error ${res.status} — re-run extract-cookies.js`);
  if (!res.ok) throw new Error(`REST HTTP ${res.status} for ${url}`);
  return res.json();
}

// ── Fetch all arcade tasks (paginated) ───────────────────────────

async function fetchArcadeTasks(cookieStr, limitOverride = 0) {
  const PAGE = 50;
  const tasks = [];
  let offset = 0;

  // Try GraphQL first
  const GQL_QUERY = `
    query ArcadeTasks($limit: Int!, $offset: Int!) {
      arcadeTasks(limit: $limit, offset: $offset) {
        id
        title
        difficulty
        category
        description
        taskDescription
        statement
        tags
        type
      }
    }
  `;

  while (true) {
    process.stdout.write(`  Fetching arcade tasks offset=${offset}…\r`);
    let batch;
    try {
      const data = await gql(cookieStr, GQL_QUERY, { limit: PAGE, offset });
      batch = data?.arcadeTasks ?? [];
    } catch (e) {
      // Fall back to taskLibrary query shape
      try {
        const data = await gql(cookieStr, `
          query TaskLib($limit: Int!, $offset: Int!) {
            taskLibrary(limit: $limit, offset: $offset) {
              tasks { id title difficulty category description statement tags type }
              totalCount
            }
          }
        `, { limit: PAGE, offset });
        batch = data?.taskLibrary?.tasks ?? [];
      } catch {
        console.log('\n  arcade GraphQL not available — skipping arcade tasks');
        break;
      }
    }

    if (batch.length === 0) break;
    tasks.push(...batch);
    if (limitOverride && tasks.length >= limitOverride) break;
    if (batch.length < PAGE) break;
    offset += PAGE;
    await sleep(300);
  }

  console.log(`  Fetched ${tasks.length} arcade tasks`);
  return tasks;
}

// ── Fetch all company assessment tasks ───────────────────────────

async function fetchCompanyTasks(cookieStr, companyId, limitOverride = 0) {
  if (!companyId) {
    console.log('  No companyId — skipping company tasks');
    return [];
  }

  const PAGE = 50;
  const tasks = [];
  let offset = 0;

  const GQL_QUERY = `
    query CompanyTasks($companyId: ID!, $limit: Int!, $offset: Int!) {
      companyTasks(companyId: $companyId, limit: $limit, offset: $offset) {
        id
        title
        difficulty
        category
        description
        taskDescription
        statement
        tags
        type
      }
    }
  `;

  while (true) {
    process.stdout.write(`  Fetching company tasks offset=${offset}…\r`);
    let batch;
    try {
      const data = await gql(cookieStr, GQL_QUERY, { companyId, limit: PAGE, offset });
      batch = data?.companyTasks ?? [];
    } catch {
      // Try companyLibrary shape
      try {
        const data = await gql(cookieStr, `
          query CompLib($companyId: ID!, $limit: Int!, $offset: Int!) {
            companyLibrary(companyId: $companyId, limit: $limit, offset: $offset) {
              tasks { id title difficulty category description statement tags type }
              totalCount
            }
          }
        `, { companyId, limit: PAGE, offset });
        batch = data?.companyLibrary?.tasks ?? [];
      } catch {
        console.log('\n  company GraphQL not available — skipping company tasks');
        break;
      }
    }

    if (batch.length === 0) break;
    tasks.push(...batch);
    if (limitOverride && tasks.length >= limitOverride) break;
    if (batch.length < PAGE) break;
    offset += PAGE;
    await sleep(300);
  }

  console.log(`  Fetched ${tasks.length} company tasks`);
  return tasks;
}

// ── Transform ─────────────────────────────────────────────────────

const DIFFICULTY_MAP = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  1: 'easy',
  2: 'medium',
  3: 'hard',
  4: 'hard',
};

const CATEGORY_MAP = {
  arrays: 'arrays',
  strings: 'strings',
  'linked-lists': 'linked-lists',
  trees: 'trees',
  graphs: 'graphs',
  'dynamic-programming': 'dynamic-programming',
  sorting: 'sorting',
  searching: 'searching',
  'hash-tables': 'hash-tables',
  recursion: 'recursion',
  'system-design': 'system-design',
  design: 'system-design',
};

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferTopic(task) {
  const cat = (task.category || '').toLowerCase().replace(/\s+/g, '-');
  if (CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];

  const tags = (task.tags || []).map(t => t.toLowerCase().replace(/\s+/g, '-'));
  for (const tag of tags) {
    if (CATEGORY_MAP[tag]) return CATEGORY_MAP[tag];
  }

  const title = (task.title || '').toLowerCase();
  if (title.includes('array') || title.includes('subarray')) return 'arrays';
  if (title.includes('string') || title.includes('palindrome') || title.includes('anagram')) return 'strings';
  if (title.includes('tree') || title.includes('bst')) return 'trees';
  if (title.includes('graph') || title.includes('bfs') || title.includes('dfs')) return 'graphs';
  if (title.includes('dp') || title.includes('dynamic')) return 'dynamic-programming';
  if (title.includes('link') && title.includes('list')) return 'linked-lists';
  if (title.includes('design') || title.includes('system')) return 'system-design';
  if (title.includes('sort')) return 'sorting';
  if (title.includes('hash') || title.includes('map')) return 'hash-tables';

  return 'general';
}

function extractDescription(task) {
  // CodeSignal may return description in different fields depending on API version
  const raw = task.description || task.taskDescription || task.statement || task.title || '';
  // Strip HTML tags if present
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function transform(task, source) {
  const slug = `cs-${slugify(task.title)}`;
  const description = extractDescription(task);
  return {
    slug,
    title: task.title,
    topic: inferTopic(task),
    difficulty: DIFFICULTY_MAP[task.difficulty] || 'medium',
    description: description.slice(0, 2000),
    meta: description.slice(0, 150) + (description.length > 150 ? '...' : ''),
    source: 'codesignal',
    codesignalId: String(task.id),
    codesignalSource: source, // 'arcade' | 'company'
    category: task.category || null,
    tags: task.tags || [],
    testCases: [],
    solutions: {},
    boilerplate: {},
  };
}

// ── Dedup ─────────────────────────────────────────────────────────

function isDuplicate(candidate, existingProblems, state) {
  // Already imported this CodeSignal ID
  if (state.importedIds.includes(candidate.codesignalId)) {
    return { isDupe: true, reason: 'already-imported' };
  }
  // Slug collision
  if (existingProblems[candidate.slug]) {
    return { isDupe: true, reason: 'slug-collision' };
  }
  // Title match (case-insensitive)
  const titleNorm = candidate.title.toLowerCase().trim();
  for (const p of Object.values(existingProblems)) {
    if (p.title?.toLowerCase().trim() === titleNorm) {
      return { isDupe: true, reason: 'title-match' };
    }
  }
  return { isDupe: false };
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const { dryRun, limit } = parseArgs();

  if (!existsSync(COOKIES_PATH)) {
    console.error('Missing .codesignal-cookies.json — run: node extract-cookies.js');
    process.exit(1);
  }
  const { cookieStr, companyId } = JSON.parse(readFileSync(COOKIES_PATH, 'utf8'));
  if (!cookieStr) {
    console.error('.codesignal-cookies.json has no cookieStr');
    process.exit(1);
  }

  console.log('\n── CodeSignal Sync ──────────────────────────────────');
  if (dryRun) console.log('  DRY RUN — no files will be written');
  if (companyId) console.log(`  companyId: ${companyId}`);

  const state = loadState();

  // ── Fetch ──────────────────────────────────────────────────────
  console.log('\n[1] Arcade / public tasks');
  const arcadeTasks = await fetchArcadeTasks(cookieStr, limit);

  console.log('\n[2] Company assessment tasks');
  const companyTasks = await fetchCompanyTasks(cookieStr, companyId, limit);

  const allTasks = [
    ...arcadeTasks.map(t => ({ ...t, _source: 'arcade' })),
    ...companyTasks.map(t => ({ ...t, _source: 'company' })),
  ];

  console.log(`\n  Total raw tasks: ${allTasks.length}`);

  // ── Dedup by CodeSignal ID (same task in both libraries) ───────
  const seenIds = new Set();
  const unique = allTasks.filter(t => {
    const key = String(t.id);
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });
  console.log(`  After cross-source dedup: ${unique.length}`);

  // ── Transform + merge ──────────────────────────────────────────
  console.log('\n[3] Merging into problems-full.json');

  const existingProblems = JSON.parse(readFileSync(PROBLEMS_PATH, 'utf8'));
  const toAdd = {};
  const skipped = [];

  for (const task of unique) {
    if (!task.title) continue;
    const candidate = transform(task, task._source);
    const check = isDuplicate(candidate, existingProblems, state);
    if (check.isDupe) {
      skipped.push({ title: candidate.title, reason: check.reason });
    } else {
      toAdd[candidate.slug] = candidate;
    }
  }

  const addCount = Object.keys(toAdd).length;
  console.log(`  + ${addCount} new problems`);
  console.log(`  - ${skipped.length} duplicates skipped`);

  if (skipped.length > 0) {
    const show = skipped.slice(0, 8);
    show.forEach(s => console.log(`    [${s.reason}] ${s.title}`));
    if (skipped.length > 8) console.log(`    …and ${skipped.length - 8} more`);
  }

  if (dryRun) {
    console.log('\n  [DRY RUN] Nothing written. Sample of what would be added:');
    Object.values(toAdd).slice(0, 5).forEach(p =>
      console.log(`    ${p.slug} (${p.topic}, ${p.difficulty}) — ${p.meta.slice(0, 80)}`)
    );
    return;
  }

  if (addCount === 0) {
    console.log('\n  Nothing new to add.');
    return;
  }

  const merged = { ...existingProblems, ...toAdd };
  writeFileSync(PROBLEMS_PATH, JSON.stringify(merged, null, 2));

  state.importedIds.push(...Object.values(toAdd).map(p => p.codesignalId));
  state.problemCount += addCount;
  state.lastSync = new Date().toISOString();
  saveState(state);

  console.log(`\n  problems-full.json updated: ${Object.keys(existingProblems).length} → ${Object.keys(merged).length} problems`);
  console.log(`  State saved to codesignal-state.json`);
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
