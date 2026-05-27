// apps/ascend-backend/scripts/scrape-leetcode.js
// Usage: LEETCODE_SESSION=xxx CSRFTOKEN=yyy node scripts/scrape-leetcode.js [--force]
// Requires a LeetCode Premium account session cookie.
import { query, closePool } from '../src/lib/shared-db.js';

const SESSION  = process.env.LEETCODE_SESSION;
const CSRF     = process.env.CSRFTOKEN;
const FORCE    = process.argv.includes('--force');
const DELAY_MS = 250;
const CONCURRENCY = 8;

if (!SESSION || !CSRF) {
  console.error('Set LEETCODE_SESSION and CSRFTOKEN env vars');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL env var');
  process.exit(1);
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Cookie': `LEETCODE_SESSION=${SESSION}; csrftoken=${CSRF}`,
  'x-csrftoken': CSRF,
  'Referer': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

// ── Phase 1: Fetch full problem list ─────────────────────────────────────────
console.log('Fetching problem list...');
const listRes = await fetch('https://leetcode.com/api/problems/all/', { headers: HEADERS });
if (!listRes.ok) {
  console.error(`Failed to fetch problem list: ${listRes.status}`);
  process.exit(1);
}
const listData = await listRes.json();
const allProblems = listData.stat_status_pairs;
if (!Array.isArray(allProblems)) {
  console.error('Unexpected API response shape:', JSON.stringify(listData).slice(0, 300));
  process.exit(1);
}
console.log(`Found ${allProblems.length} problems on LeetCode`);

// ── Determine which slugs to fetch ───────────────────────────────────────────
let slugsToFetch;
if (FORCE) {
  slugsToFetch = allProblems.map(p => ({
    slug: p.stat.question__title_slug,
    lcId: p.stat.frontend_question_id,
    isPremium: p.paid_only,
    acceptance: p.stat.total_acs / Math.max(p.stat.total_submitted, 1),
  }));
} else {
  // Skip slugs already in DB with source='leetcode'
  const { rows: existing } = await query(
    "SELECT slug FROM coding_problems WHERE source='leetcode'"
  );
  const existingSet = new Set(existing.map(r => r.slug));
  slugsToFetch = allProblems
    .map(p => ({
      slug: p.stat.question__title_slug,
      lcId: p.stat.frontend_question_id,
      isPremium: p.paid_only,
      acceptance: p.stat.total_acs / Math.max(p.stat.total_submitted, 1),
    }))
    .filter(p => !existingSet.has(p.slug));
  console.log(`Skipping ${allProblems.length - slugsToFetch.length} already-scraped problems`);
}

console.log(`Fetching content for ${slugsToFetch.length} problems...`);

// ── GraphQL query ─────────────────────────────────────────────────────────────
const GQL = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId title titleSlug difficulty isPaidOnly
    content exampleTestcases
    topicTags { name slug }
    hints
    companyTagStats
    codeSnippets { lang langSlug code }
    stats
  }
}`;

async function fetchOne(slug, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30_000);
    try {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ query: GQL, variables: { titleSlug: slug } }),
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (res.status === 429) {
        if (attempt < retries - 1) {
          const wait = Math.pow(2, attempt + 1) * 1000;
          console.warn(`  [429] ${slug} — retrying in ${wait}ms`);
          await new Promise(r => setTimeout(r, wait));
        }
        continue;
      }
      if (!res.ok) {
        console.warn(`  [${res.status}] ${slug} — skipping`);
        return null;
      }
      const data = await res.json();
      return data.data?.question ?? null;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`  [timeout] ${slug} — attempt ${attempt + 1}`);
        continue;
      }
      throw err;
    }
  }
  return null;
}

async function upsert(meta, q) {
  if (!q) return 'error';
  let companyTags = [];
  try {
    const raw = q.companyTagStats ? JSON.parse(q.companyTagStats) : {};
    // companyTagStats shape: {1: [{slug, name, timesEncountered}], 2: [...], 3: [...]}
    const allCompanies = Object.values(raw).flat();
    companyTags = allCompanies.map(c => c.name).filter(Boolean);
  } catch { /* premium accounts may return null */ }

  const diffMap = { Easy: 'Easy', Medium: 'Medium', Hard: 'Hard' };
  const difficulty = diffMap[q.difficulty] ?? 'Medium';

  await query(
    `INSERT INTO coding_problems
       (lc_id, slug, title, difficulty, content, hints, topic_tags,
        company_tags, code_snippets, is_premium, acceptance_rate, source, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'leetcode',NOW())
     ON CONFLICT (slug) DO UPDATE SET
       lc_id           = EXCLUDED.lc_id,
       title           = EXCLUDED.title,
       difficulty      = EXCLUDED.difficulty,
       content         = EXCLUDED.content,
       hints           = EXCLUDED.hints,
       topic_tags      = EXCLUDED.topic_tags,
       company_tags    = EXCLUDED.company_tags,
       code_snippets   = EXCLUDED.code_snippets,
       is_premium      = EXCLUDED.is_premium,
       acceptance_rate = EXCLUDED.acceptance_rate,
       source          = 'leetcode',
       updated_at      = NOW()`,
    [
      parseInt(q.questionFrontendId),
      q.titleSlug,
      q.title,
      difficulty,
      q.content ?? null,
      JSON.stringify(q.hints ?? []),
      JSON.stringify(q.topicTags ?? []),
      JSON.stringify(companyTags),
      JSON.stringify(q.codeSnippets ?? []),
      q.isPaidOnly ?? false,
      meta.acceptance,
    ]
  );
  return 'ok';
}

// ── Phase 2: Concurrent fetch + upsert ───────────────────────────────────────
let done = 0, errors = 0;
const total = slugsToFetch.length;

async function worker(items) {
  for (const meta of items) {
    const q = await fetchOne(meta.slug);
    const status = await upsert(meta, q);
    done++;
    if (status === 'error') errors++;
    if (done % 50 === 0 || done === total) {
      process.stdout.write(`\r[${done}/${total}] ${meta.slug.padEnd(40)} errors:${errors}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

// Split into CONCURRENCY buckets
const buckets = Array.from({ length: CONCURRENCY }, () => []);
slugsToFetch.forEach((p, i) => buckets[i % CONCURRENCY].push(p));
await Promise.all(buckets.map(worker));

console.log('\n');

// ── Dedup report ──────────────────────────────────────────────────────────────
const { rows: stats } = await query(`
  SELECT source, COUNT(*) as cnt
  FROM coding_problems
  GROUP BY source
  ORDER BY source
`);
const totalInDb = stats.reduce((s, r) => s + parseInt(r.cnt), 0);

console.log('Deduplication summary');
console.log('─'.repeat(50));
stats.forEach(r => console.log(`  ${r.source.padEnd(12)}: ${r.cnt}`));
console.log(`  ${'TOTAL'.padEnd(12)}: ${totalInDb}`);
console.log('─'.repeat(50));
console.log(`  Errors this run: ${errors}`);

await closePool();
