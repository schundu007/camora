# LeetCode Scraper & Problems DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape all ~3,500 LeetCode problems (including Premium) into a PostgreSQL `coding_problems` table, deduplicate against the existing 1,526-problem JSON, wire the practice UI to query the DB, and retire the static JSON files.

**Architecture:** A one-shot Node.js scraper fetches the full problem list from LeetCode's public API then fetches per-problem content via the GraphQL endpoint using a browser session cookie. A JSON migration script seeds existing problems first so the scraper upsert (by slug) can overwrite duplicates with authoritative LeetCode content. A new Express route serves the DB to the frontend, replacing static JSON imports.

**Tech Stack:** Node.js 20, PostgreSQL (via `@camora/shared-db`), LeetCode GraphQL API, React 19 + Vite 8, Express 5, existing ascend-backend middleware (`jwtAuth`, `optionalJwtAuth`, `subscriptionRequired`, `apiLimiter`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/ascend-backend/src/index.js` | Add `coding_problems` table migration + mount problems route |
| Create | `apps/ascend-backend/scripts/migrate-problems-json.js` | One-shot: seeds DB from `problems-full.json` |
| Create | `apps/ascend-backend/scripts/scrape-leetcode.js` | One-shot: scrapes LeetCode, upserts into DB |
| Create | `apps/ascend-backend/src/routes/problems.js` | `GET /api/v1/problems`, `GET /api/v1/problems/tags`, `GET /api/v1/problems/:slug` |
| Modify | `apps/camora/src/lib/capra-api.ts` | Add `getProblems`, `getProblem`, `getProblemTags` helpers |
| Modify | `apps/camora/src/components/lumora/coding/CodingLayout.tsx` | Add `initialStarterCode` prop |
| Modify | `apps/camora/src/pages/lumora/CodingPage.tsx` | Read `?starter_code` URL param, pass to CodingLayout |
| Modify | `apps/camora/src/pages/capra/HRLibraryPage.tsx` | Add `dsa` tab: fetch + display LeetCode problems |
| Delete | `apps/camora/src/data/capra/problems-full.json` | Retired after migration |
| Delete | `apps/camora/src/data/capra/mustDoProblems.js` | Retired after migration |

---

## Task 1: DB Migration — `coding_problems` table

**Files:**
- Modify: `apps/ascend-backend/src/index.js` (inside `runMigrations`, after the last `console.log('[Migrations] refund_requests table ensured')` block, before the closing `} catch (err)`)

- [ ] **Step 1: Add the table + indexes to runMigrations**

Find the line `console.log('[Migrations] refund_requests table ensured');` in `apps/ascend-backend/src/index.js` (around line 438). Insert the following block immediately after it (before the `} catch` that closes the first try block):

```javascript
    // LeetCode problem catalog — populated by scripts/migrate-problems-json.js
    // then enriched by scripts/scrape-leetcode.js. slug is the dedup key.
    await query(`CREATE TABLE IF NOT EXISTS coding_problems (
      id              SERIAL PRIMARY KEY,
      lc_id           INTEGER UNIQUE,
      slug            VARCHAR(255) UNIQUE NOT NULL,
      title           VARCHAR(500) NOT NULL,
      difficulty      VARCHAR(10) NOT NULL DEFAULT 'Medium',
      content         TEXT,
      examples        JSONB,
      constraints     JSONB,
      hints           JSONB,
      topic_tags      JSONB,
      company_tags    JSONB,
      code_snippets   JSONB,
      is_premium      BOOLEAN DEFAULT false,
      acceptance_rate FLOAT,
      source          VARCHAR(20) NOT NULL DEFAULT 'leetcode',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON coding_problems(difficulty)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_source ON coding_problems(source)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_lc_id ON coding_problems(lc_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_topic_tags ON coding_problems USING GIN(topic_tags)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_company_tags ON coding_problems USING GIN(company_tags)');
    console.log('[Migrations] coding_problems table ensured');
```

- [ ] **Step 2: Start ascend-backend and verify migration runs**

```bash
node --watch apps/ascend-backend/src/index.js
```

Expected in console:
```
[Migrations] coding_problems table ensured
```

- [ ] **Step 3: Verify table in DB**

```bash
cd apps/ascend-backend && node --input-type=module << 'EOF'
import { query } from './src/lib/shared-db.js';
const { rows } = await query("SELECT column_name FROM information_schema.columns WHERE table_name='coding_problems' ORDER BY ordinal_position");
console.log(rows.map(r => r.column_name).join(', '));
EOF
```

Expected output:
```
id, lc_id, slug, title, difficulty, content, examples, constraints, hints, topic_tags, company_tags, code_snippets, is_premium, acceptance_rate, source, created_at, updated_at
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/src/index.js
git commit -m "feat(db): add coding_problems table migration"
```

---

## Task 2: JSON Migration Script

**Files:**
- Create: `apps/ascend-backend/scripts/migrate-problems-json.js`

- [ ] **Step 1: Create the script**

```javascript
// apps/ascend-backend/scripts/migrate-problems-json.js
// One-shot: reads problems-full.json and seeds coding_problems with source='custom'.
// Safe to re-run (ON CONFLICT DO NOTHING).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closePool } from '../src/lib/shared-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../../camora/src/data/capra/problems-full.json');

const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const entries = Object.entries(raw); // [slug, {slug, topic, description, boilerplate, ...}]

let inserted = 0;
let skipped = 0;

for (const [key, prob] of entries) {
  const slug = prob.slug || key;
  // Derive a human-readable title from slug: "two-sum" → "Two Sum"
  const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const topicTags = prob.topic
    ? JSON.stringify([{ name: prob.topic, slug: prob.topic }])
    : JSON.stringify([]);

  // Convert boilerplate {lang: code} → [{lang, langSlug, code}]
  const codeSnippets = prob.boilerplate
    ? JSON.stringify(
        Object.entries(prob.boilerplate).map(([langSlug, code]) => ({
          lang: langSlug.charAt(0).toUpperCase() + langSlug.slice(1),
          langSlug,
          code,
        }))
      )
    : JSON.stringify([]);

  const content = prob.description
    ? `<p>${prob.description.replace(/\n/g, '</p><p>')}</p>`
    : null;

  const { rowCount } = await query(
    `INSERT INTO coding_problems
       (slug, title, content, topic_tags, code_snippets, source)
     VALUES ($1, $2, $3, $4, $5, 'custom')
     ON CONFLICT (slug) DO NOTHING`,
    [slug, title, content, topicTags, codeSnippets]
  );

  if (rowCount > 0) inserted++;
  else skipped++;
}

console.log(`\nMigration complete`);
console.log(`  Inserted : ${inserted}`);
console.log(`  Skipped  : ${skipped} (already existed)`);
console.log(`  Total    : ${entries.length}`);

await closePool();
```

- [ ] **Step 2: Run the migration**

```bash
cd apps/ascend-backend && node scripts/migrate-problems-json.js
```

Expected output:
```
Migration complete
  Inserted : 1526
  Skipped  :    0 (already existed)
  Total    : 1526
```

- [ ] **Step 3: Spot-check a row**

```bash
cd apps/ascend-backend && node --input-type=module << 'EOF'
import { query, closePool } from './src/lib/shared-db.js';
const { rows } = await query("SELECT slug, title, source, topic_tags FROM coding_problems WHERE slug='two-sum'");
console.log(JSON.stringify(rows[0], null, 2));
await closePool();
EOF
```

Expected:
```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "source": "custom",
  "topic_tags": [{"name": "arrays", "slug": "arrays"}]
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/scripts/migrate-problems-json.js
git commit -m "feat(scripts): JSON → DB migration for coding_problems"
```

---

## Task 3: LeetCode Scraper Script

**Files:**
- Create: `apps/ascend-backend/scripts/scrape-leetcode.js`

The scraper needs `LEETCODE_SESSION` and `csrftoken` cookies. Get them from browser DevTools → Application → Cookies → leetcode.com while logged in with a Premium account.

- [ ] **Step 1: Create the scraper**

```javascript
// apps/ascend-backend/scripts/scrape-leetcode.js
// Usage: LEETCODE_SESSION=xxx CSRFTOKEN=yyy node scripts/scrape-leetcode.js [--force]
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
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query: GQL, variables: { titleSlug: slug } }),
    });
    if (res.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 1000;
      console.warn(`  [429] ${slug} — retrying in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      console.warn(`  [${res.status}] ${slug} — skipping`);
      return null;
    }
    const data = await res.json();
    return data.data?.question ?? null;
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
let done = 0, errors = 0, overwritten = 0;
const total = slugsToFetch.length;

async function worker(items) {
  for (const meta of items) {
    const q = await fetchOne(meta.slug);
    const status = await upsert(meta, q);
    done++;
    if (status === 'error') errors++;
    else overwritten++;
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
```

- [ ] **Step 2: Dry-run with 3 problems to verify upsert logic**

```bash
cd apps/ascend-backend && LEETCODE_SESSION=your_session CSRFTOKEN=your_csrf \
  node --input-type=module << 'EOF'
import { query, closePool } from './src/lib/shared-db.js';

const SESSION = process.env.LEETCODE_SESSION;
const CSRF    = process.env.CSRFTOKEN;
const HEADERS = {
  'Content-Type': 'application/json',
  'Cookie': `LEETCODE_SESSION=${SESSION}; csrftoken=${CSRF}`,
  'x-csrftoken': CSRF,
  'Referer': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0',
};

const GQL = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId title titleSlug difficulty isPaidOnly content
    topicTags { name slug } hints codeSnippets { lang langSlug code }
    companyTagStats stats
  }
}`;

for (const slug of ['two-sum', 'reverse-linked-list', 'longest-substring-without-repeating-characters']) {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ query: GQL, variables: { titleSlug: slug } }),
  });
  const data = await res.json();
  const q = data.data?.question;
  if (!q) { console.log(`${slug}: no data`); continue; }

  await query(
    `INSERT INTO coding_problems (lc_id, slug, title, difficulty, content, hints, topic_tags, company_tags, code_snippets, is_premium, acceptance_rate, source, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'leetcode',NOW())
     ON CONFLICT (slug) DO UPDATE SET lc_id=EXCLUDED.lc_id, title=EXCLUDED.title, difficulty=EXCLUDED.difficulty, content=EXCLUDED.content, hints=EXCLUDED.hints, topic_tags=EXCLUDED.topic_tags, company_tags=EXCLUDED.company_tags, code_snippets=EXCLUDED.code_snippets, is_premium=EXCLUDED.is_premium, acceptance_rate=EXCLUDED.acceptance_rate, source='leetcode', updated_at=NOW()`,
    [parseInt(q.questionFrontendId), q.titleSlug, q.title, q.difficulty ?? 'Medium',
     q.content ?? null, JSON.stringify(q.hints ?? []), JSON.stringify(q.topicTags ?? []),
     JSON.stringify([]), JSON.stringify(q.codeSnippets ?? []), q.isPaidOnly ?? false, 0]
  );
  console.log(`✓ ${slug} — ${q.title} (${q.difficulty})`);
}

const { rows } = await query("SELECT slug, title, source, difficulty FROM coding_problems WHERE slug IN ('two-sum','reverse-linked-list','longest-substring-without-repeating-characters')");
console.log('\nDB rows:');
rows.forEach(r => console.log(`  ${r.slug}: source=${r.source}, difficulty=${r.difficulty}`));
await closePool();
EOF
```

Expected (all three should now have `source=leetcode`):
```
✓ two-sum — Two Sum (Easy)
✓ reverse-linked-list — Reverse Linked List (Easy)
✓ longest-substring-without-repeating-characters — Longest Substring Without Repeating Characters (Medium)

DB rows:
  two-sum: source=leetcode, difficulty=Easy
  reverse-linked-list: source=leetcode, difficulty=Easy
  longest-substring-without-repeating-characters: source=leetcode, difficulty=Medium
```

- [ ] **Step 3: Run the full scraper (grab cookies from browser first)**

Open leetcode.com, log in with Premium, then DevTools → Application → Cookies:
- Copy value of `LEETCODE_SESSION`
- Copy value of `csrftoken`

```bash
cd apps/ascend-backend && \
  LEETCODE_SESSION="<paste>" CSRFTOKEN="<paste>" \
  node scripts/scrape-leetcode.js
```

Expected final output (numbers approximate):
```
Deduplication summary
──────────────────────────────────────────────────
  custom      : 67
  leetcode    : 3500
  TOTAL       : 3567
──────────────────────────────────────────────────
  Errors this run: 0
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/scripts/scrape-leetcode.js
git commit -m "feat(scripts): LeetCode scraper with upsert + dedup report"
```

---

## Task 4: Problems API Routes

**Files:**
- Create: `apps/ascend-backend/src/routes/problems.js`

- [ ] **Step 1: Write the route file**

```javascript
// apps/ascend-backend/src/routes/problems.js
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { optionalJwtAuth, jwtAuth } from '../middleware/jwtAuth.js';
import { subscriptionRequired } from '../middleware/subscriptionRequired.js';

const router = Router();

const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);
const OWNER_EMAILS = new Set(
  (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);

function isPaidUser(req) {
  return !!req.user?.planType && PAID_PLAN_TYPES.has(req.user.planType)
    || (!!req.user?.email && OWNER_EMAILS.has(req.user.email.toLowerCase()));
}

// GET /api/v1/problems/tags — no auth needed
router.get('/tags', async (req, res) => {
  try {
    const { rows: topicRows } = await query(`
      SELECT DISTINCT elem->>'name' AS tag
      FROM coding_problems, LATERAL jsonb_array_elements(topic_tags) AS elem
      WHERE topic_tags IS NOT NULL AND jsonb_typeof(topic_tags) = 'array'
      ORDER BY tag
    `);
    const { rows: companyRows } = await query(`
      SELECT DISTINCT elem AS tag
      FROM coding_problems, LATERAL jsonb_array_elements_text(company_tags) AS elem
      WHERE company_tags IS NOT NULL AND jsonb_typeof(company_tags) = 'array'
        AND jsonb_array_length(company_tags) > 0
      ORDER BY tag
    `);
    res.json({
      topic_tags:   topicRows.map(r => r.tag).filter(Boolean),
      company_tags: companyRows.map(r => r.tag).filter(Boolean),
    });
  } catch (err) {
    console.error('[problems/tags]', err.message);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/v1/problems — list with filters + pagination
router.get('/', optionalJwtAuth, async (req, res) => {
  try {
    const {
      difficulty, tag, company, source, q,
      page = '1', limit = '50',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset   = (pageNum - 1) * limitNum;

    const conditions = [];
    const params     = [];

    if (difficulty) {
      params.push(difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }
    if (source) {
      params.push(source);
      conditions.push(`source = $${params.length}`);
    }
    if (tag) {
      params.push(`%"name":"${tag}"%`);
      conditions.push(`topic_tags::text ILIKE $${params.length}`);
    }
    if (company) {
      params.push(company);
      conditions.push(`company_tags @> to_jsonb($${params.length}::text)`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS total FROM coding_problems ${where}`,
      params
    );
    const total = parseInt(countRows[0].total);

    params.push(limitNum, offset);
    const { rows } = await query(
      `SELECT id, lc_id, slug, title, difficulty, topic_tags, is_premium,
              acceptance_rate, source,
              CASE WHEN $${params.length - 1} = 1 THEN company_tags ELSE '[]'::jsonb END AS company_tags
       FROM coding_problems
       ${where}
       ORDER BY COALESCE(lc_id, 999999), slug
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Strip company_tags for free/unauthenticated users
    const paid = isPaidUser(req);
    const problems = rows.map(r => ({
      ...r,
      company_tags: paid ? r.company_tags : [],
      company_tags_locked: !paid && (r.company_tags?.length ?? 0) > 0,
    }));

    res.json({ problems, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('[problems/list]', err.message);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// GET /api/v1/problems/:slug — full detail, auth required
router.get('/:slug', jwtAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM coding_problems WHERE slug = $1',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Problem not found' });

    const prob = rows[0];

    // Premium problems gated behind paid subscription
    if (prob.is_premium) {
      const { rows: subRows } = await query(
        'SELECT plan_type FROM ascend_subscriptions WHERE user_id = $1 AND status = $2',
        [req.user.id, 'active']
      );
      const planType = subRows[0]?.plan_type ?? 'free';
      const isOwner  = OWNER_EMAILS.has((req.user.email ?? '').toLowerCase());
      if (!isOwner && !PAID_PLAN_TYPES.has(planType)) {
        return res.status(403).json({ error: 'Premium problem — upgrade to access', code: 'SUBSCRIPTION_REQUIRED' });
      }
    }

    res.json(prob);
  } catch (err) {
    console.error('[problems/detail]', err.message);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

export default router;
```

- [ ] **Step 2: Mount the route in ascend-backend index.js**

Add the import near the other route imports (around line 36):
```javascript
import problemsRouter from './routes/problems.js';
```

Add the mount near the other `/api/v1/` routes (around line 1310):
```javascript
app.use('/api/v1/problems', apiLimiter, problemsRouter);
```

- [ ] **Step 3: Restart the server and smoke-test the endpoints**

```bash
# Restart: node --watch apps/ascend-backend/src/index.js

# Tags (no auth)
curl -s http://localhost:3009/api/v1/problems/tags | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('Topics:', d.topic_tags.slice(0,5)); console.log('Companies:', d.company_tags.slice(0,5))"

# List first page
curl -s "http://localhost:3009/api/v1/problems?limit=3&difficulty=Easy" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('total:', d.total, 'problems:', d.problems.map(p=>p.slug))"
```

Expected:
```
Topics: [ 'arrays', 'backtracking', 'binary-search', ... ]
total: <number>  problems: [ 'two-sum', ... ]
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/src/routes/problems.js apps/ascend-backend/src/index.js
git commit -m "feat(api): GET /api/v1/problems list + tags + detail routes"
```

---

## Task 5: Frontend API Helpers

**Files:**
- Modify: `apps/camora/src/lib/capra-api.ts`

- [ ] **Step 1: Add helpers at the end of capra-api.ts (before the final `export { CapraAPIError }`)**

```typescript
// ── LeetCode Problems ─────────────────────────────────────────────────────────

export interface LcProblem {
  id: number;
  lc_id: number | null;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic_tags: { name: string; slug: string }[];
  company_tags: string[];
  company_tags_locked?: boolean;
  is_premium: boolean;
  acceptance_rate: number | null;
  source: 'leetcode' | 'custom';
}

export interface LcProblemDetail extends LcProblem {
  content: string | null;
  examples: { input: string; output: string; explanation?: string }[] | null;
  constraints: string[] | null;
  hints: string[] | null;
  code_snippets: { lang: string; langSlug: string; code: string }[];
}

export interface ProblemsResponse {
  problems: LcProblem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProblemsParams {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tag?: string;
  company?: string;
  source?: 'leetcode' | 'custom';
  q?: string;
  page?: number;
  limit?: number;
}

export async function getProblems(params: ProblemsParams = {}): Promise<ProblemsResponse> {
  const qs = new URLSearchParams();
  if (params.difficulty) qs.set('difficulty', params.difficulty);
  if (params.tag)        qs.set('tag',        params.tag);
  if (params.company)    qs.set('company',     params.company);
  if (params.source)     qs.set('source',      params.source);
  if (params.q)          qs.set('q',           params.q);
  if (params.page)       qs.set('page',        String(params.page));
  if (params.limit)      qs.set('limit',       String(params.limit));
  const query = qs.toString();
  return fetchCapra<ProblemsResponse>(`/api/v1/problems${query ? `?${query}` : ''}`);
}

export async function getProblem(slug: string): Promise<LcProblemDetail> {
  return fetchCapra<LcProblemDetail>(`/api/v1/problems/${slug}`);
}

export async function getProblemTags(): Promise<{ topic_tags: string[]; company_tags: string[] }> {
  return fetchCapra<{ topic_tags: string[]; company_tags: string[] }>('/api/v1/problems/tags');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/camora && npx tsc --noEmit 2>&1 | grep -i "error" | head -10
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/lib/capra-api.ts
git commit -m "feat(capra-api): add getProblems / getProblem / getProblemTags helpers"
```

---

## Task 6: CodingLayout initialStarterCode Prop

**Files:**
- Modify: `apps/camora/src/components/lumora/coding/CodingLayout.tsx`
- Modify: `apps/camora/src/pages/lumora/CodingPage.tsx`

- [ ] **Step 1: Add `initialStarterCode` to CodingLayoutProps**

In `CodingLayout.tsx`, find the `interface CodingLayoutProps` block (around line 176). Add one prop after `initialUrl`:

```typescript
  /** Starter code to pre-load (e.g. from LeetCode code snippet for selected language). */
  initialStarterCode?: string | null;
```

- [ ] **Step 2: Wire initialStarterCode into the component**

In `CodingLayout.tsx`, find the destructuring of props (around line 249):
```typescript
export function CodingLayout({ onSubmit, isLoading, onBack, initialProblem, initialUrl, embedded, ...
```
Add `initialStarterCode` to the destructured props list.

Then find the `useState<string | null>(null)` for starterCode (around line 276):
```typescript
  const [starterCode, setStarterCode] = useState<string | null>(null);
```
Change it to:
```typescript
  const [starterCode, setStarterCode] = useState<string | null>(initialStarterCode ?? null);
```

- [ ] **Step 3: Update CodingPage to read `?starter_code` from URL**

In `apps/camora/src/pages/lumora/CodingPage.tsx`, replace the full file content with:

```typescript
import { Suspense, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodingLayout } from '../../components/lumora/coding/CodingLayout';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';
import { useStreamingSession } from '../../hooks/useStreamingSession';

const CodingPageContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCodingSubmit, isStreaming } = useStreamingSession();

  const initialProblem     = searchParams.get('problem')      || '';
  const initialUrl         = searchParams.get('url')          || '';
  const initialStarterCode = searchParams.get('starter_code') || null;

  return (
    <CodingLayout
      onSubmit={handleCodingSubmit}
      isLoading={isStreaming}
      onBack={() => navigate('/lumora')}
      initialProblem={initialProblem}
      initialUrl={initialUrl}
      initialStarterCode={initialStarterCode}
    />
  );
};

export const CodingPage = () => {
  useEffect(() => {
    document.title = 'Coding Interview | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <PaywallGate feature="Coding Solutions">
      <ErrorBoundary>
        <Suspense>
          <CodingPageContent />
        </Suspense>
      </ErrorBoundary>
    </PaywallGate>
  );
};

export default CodingPage;
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd apps/camora && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/components/lumora/coding/CodingLayout.tsx \
        apps/camora/src/pages/lumora/CodingPage.tsx
git commit -m "feat(coding): initialStarterCode prop + URL param ?starter_code"
```

---

## Task 7: HRLibraryPage — DSA Tab

**Files:**
- Modify: `apps/camora/src/pages/capra/HRLibraryPage.tsx`

The `must-do` tab currently shows 76 Blind 75 problems from static JSON. We replace it with a `dsa` tab that queries the DB (all LeetCode + custom DSA problems) and add a separate `must-do` section within it or keep the must-do tab intact and add a new `dsa` tab. The simpler change: **replace the static `must-do` rendering with a DB-backed query filtered to `source IN (leetcode, custom)`** — keeping the tab label "Must Do" but wiring it to the real DB.

Wait — the existing `must-do` tab is for 76 curated Blind 75 problems specifically. We should keep that concept but serve it from the DB (filtered to the 76 slugs). For LeetCode's full catalog we add a new `dsa` tab.

- [ ] **Step 1: Add the `dsa` tab label to the TAB_GROUPS constant**

Find the `TAB_GROUPS` / tabs constant (around line 83):
```typescript
  all: 'All', mcq: 'MCQ', coding: 'Coding', design: 'Design', 'must-do': 'Must Do',
```
Add `dsa`:
```typescript
  all: 'All', mcq: 'MCQ', coding: 'Coding', design: 'Design', 'must-do': 'Must Do', dsa: 'LeetCode',
```

- [ ] **Step 2: Add state and effect for DSA problems**

After the existing `const [problems, setProblems] = useState...` block, add:

```typescript
  const [dsaProblems, setDsaProblems]   = useState<LcProblem[]>([]);
  const [dsaTotal, setDsaTotal]         = useState(0);
  const [dsaPages, setDsaPages]         = useState(1);
  const [dsaPage, setDsaPage]           = useState(1);
  const [dsaDifficulty, setDsaDifficulty] = useState('');
  const [dsaTag, setDsaTag]             = useState('');
  const [dsaQ, setDsaQ]                 = useState('');
  const [dsaLoading, setDsaLoading]     = useState(false);
  const [dsaTags, setDsaTags]           = useState<{ topic_tags: string[]; company_tags: string[] }>({ topic_tags: [], company_tags: [] });
```

Add to imports at the top of the file:
```typescript
import { getProblems, getProblemTags, getProblem, type LcProblem } from '../../lib/capra-api';
```

- [ ] **Step 3: Add useEffect to fetch DSA problems when dsa tab is active**

After the existing fetch `useEffect` blocks, add:

```typescript
  useEffect(() => {
    if (activeTab !== 'dsa') return;
    setDsaLoading(true);
    getProblems({ difficulty: dsaDifficulty || undefined, tag: dsaTag || undefined, q: dsaQ || undefined, page: dsaPage, limit: 50 })
      .then(data => { setDsaProblems(data.problems); setDsaTotal(data.total); setDsaPages(data.pages); })
      .catch(err => console.error('[dsa fetch]', err))
      .finally(() => setDsaLoading(false));
  }, [activeTab, dsaDifficulty, dsaTag, dsaQ, dsaPage]);

  useEffect(() => {
    if (activeTab !== 'dsa') return;
    getProblemTags().then(setDsaTags).catch(() => {});
  }, [activeTab]);
```

- [ ] **Step 4: Add the `dsa` tab to the rendered tab list**

Find the tabs render section (around line 594):
```tsx
{(['all', 'mcq', 'coding', 'design', 'must-do'] as const).map(tab => (
```
Change to:
```tsx
{(['all', 'mcq', 'coding', 'design', 'must-do', 'dsa'] as const).map(tab => (
```

- [ ] **Step 5: Add DSA tab content panel**

In the main content area, after the `activeTab === 'must-do'` block, add a new branch for `dsa`. Find the structure around line 722:

```tsx
{activeTab === 'must-do' ? (
  ...
) : (
  <ProblemCard ... />
)}
```

Restructure to:

```tsx
{activeTab === 'must-do' ? (
  // existing MUST_DO_PROBLEMS rendering — unchanged
  <div ...>
    {MUST_DO_PROBLEMS.map(...)}
  </div>
) : activeTab === 'dsa' ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    {/* Filter bar */}
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px', flexWrap: 'wrap', borderBottom: '1px solid rgba(196,160,60,0.18)' }}>
      <select
        value={dsaDifficulty}
        onChange={e => { setDsaDifficulty(e.target.value); setDsaPage(1); }}
        style={{ background: '#0d1117', color: 'var(--text-primary)', border: '1px solid rgba(196,160,60,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
      >
        <option value="">All Difficulties</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
      <select
        value={dsaTag}
        onChange={e => { setDsaTag(e.target.value); setDsaPage(1); }}
        style={{ background: '#0d1117', color: 'var(--text-primary)', border: '1px solid rgba(196,160,60,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
      >
        <option value="">All Topics</option>
        {dsaTags.topic_tags.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input
        type="text"
        placeholder="Search..."
        value={dsaQ}
        onChange={e => { setDsaQ(e.target.value); setDsaPage(1); }}
        style={{ background: '#0d1117', color: 'var(--text-primary)', border: '1px solid rgba(196,160,60,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 160 }}
      />
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>{dsaTotal} problems</span>
    </div>

    {/* Problem list */}
    {dsaLoading ? (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
    ) : dsaProblems.map(p => (
      <DsaProblemRow
        key={p.slug}
        problem={p}
        onClick={async () => {
          try {
            const detail = await getProblem(p.slug);
            const pySnippet = detail.code_snippets?.find(s => s.langSlug === 'python3') ?? detail.code_snippets?.[0];
            const starterCode = pySnippet?.code ?? '';
            const content = detail.content
              ? detail.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
              : p.title;
            navigate(`/lumora/coding?problem=${encodeURIComponent(content)}&starter_code=${encodeURIComponent(starterCode)}`);
          } catch {
            navigate(`/lumora/coding?problem=${encodeURIComponent(p.title)}`);
          }
        }}
      />
    ))}

    {/* Pagination */}
    {dsaPages > 1 && (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0' }}>
        <button disabled={dsaPage <= 1} onClick={() => setDsaPage(p => p - 1)} className="btn-secondary" style={{ fontSize: 11 }}>Prev</button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>{dsaPage} / {dsaPages}</span>
        <button disabled={dsaPage >= dsaPages} onClick={() => setDsaPage(p => p + 1)} className="btn-secondary" style={{ fontSize: 11 }}>Next</button>
      </div>
    )}
  </div>
) : (
  // existing ProblemCard rendering — unchanged
  <ProblemCard ... />
)}
```

- [ ] **Step 6: Add the DsaProblemRow component**

Add this component near the top of HRLibraryPage.tsx, alongside the existing `ProblemCard` component:

```typescript
const DIFF_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

function DsaProblemRow({ problem, onClick }: { problem: LcProblem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,160,60,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {problem.lc_id && (
        <span style={{ width: 40, flexShrink: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {problem.lc_id}
        </span>
      )}
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
        {problem.title}
        {problem.is_premium && <span style={{ marginLeft: 6, fontSize: 10, color: '#f59e0b' }}>⭐</span>}
      </span>
      <span style={{ fontSize: 11, color: DIFF_COLORS[problem.difficulty] ?? 'var(--text-muted)', width: 50, textAlign: 'right' }}>
        {problem.difficulty}
      </span>
      {problem.acceptance_rate != null && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 42, textAlign: 'right' }}>
          {(problem.acceptance_rate * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Build to verify no errors**

```bash
cd apps/camora && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`

- [ ] **Step 8: Start dev server and verify the DSA tab loads problems**

```bash
pnpm dev:camora
# Open http://localhost:3000/capra/library?tab=dsa
```

Verify:
- Problems list loads with LeetCode IDs, titles, difficulty colours
- Difficulty filter narrows the list
- Clicking a problem navigates to `/lumora/coding` with the problem pre-filled

- [ ] **Step 9: Commit**

```bash
git add apps/camora/src/pages/capra/HRLibraryPage.tsx
git commit -m "feat(library): DSA tab — LeetCode problems from DB with filters + pagination"
```

---

## Task 8: Cleanup — Retire Static JSON Files

**Files:**
- Delete: `apps/camora/src/data/capra/problems-full.json`
- Delete: `apps/camora/src/data/capra/mustDoProblems.js`

Only do this task after confirming:
1. The scraper ran successfully (all problems in DB)
2. The DSA tab in HRLibraryPage loads problems from the API correctly
3. The `must-do` tab still renders (it still uses `MUST_DO_PROBLEMS` from the JS file — leave that tab alone unless you also migrate those 76 slugs to the DB)

> **Note:** `mustDoProblems.js` is still used by the `must-do` tab in HRLibraryPage. Only delete it if you've wired the `must-do` tab to the DB too. For now, **only delete `problems-full.json`** and remove its imports.

- [ ] **Step 1: Find all imports of problems-full.json**

```bash
grep -rn "problems-full\|problems-full\.json" apps/camora/src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```

- [ ] **Step 2: Remove each import and any code that references it**

For each file found in Step 1, remove the import line and any variable/usage that depends on it. These are one-off data imports with no runtime side effects — safe to delete.

- [ ] **Step 3: Delete the file**

```bash
rm apps/camora/src/data/capra/problems-full.json
```

- [ ] **Step 4: Build to confirm nothing broke**

```bash
cd apps/camora && npx vite build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs` with no module-not-found errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: retire problems-full.json — replaced by coding_problems DB table"
```

---

## Task 9: Deploy

- [ ] **Step 1: Pull, build, push**

```bash
cd /Users/chundu/camora
git pull
cd apps/camora && npx vite build 2>&1 | tail -5
cd /Users/chundu/camora && git push
```

- [ ] **Step 2: Deploy frontend to Vercel**

```bash
cd /Users/chundu/camora && vercel --prod
```

- [ ] **Step 3: Deploy ascend-backend to Railway**

Railway auto-deploys on push to main. Verify at:
```
https://ascendb.cariara.com/health
```

- [ ] **Step 4: Verify DSA tab on production**

Open `https://camora.cariara.com/capra/library?tab=dsa`, confirm:
- Problems load from the DB
- Difficulty filter works
- Clicking a problem opens the coding page with content pre-filled

---

## Self-Review

**Spec coverage check:**
- ✅ DB schema — Task 1
- ✅ JSON migration (seed from problems-full.json) — Task 2
- ✅ LeetCode scraper with auth, rate limiting, upsert, dedup report — Task 3
- ✅ Backend API (list, tags, detail, premium gate) — Task 4
- ✅ Starter code snippet support in CodingLayout — Task 6
- ✅ Frontend DSA tab with filters + navigation — Task 7
- ✅ Cleanup of old JSON files — Task 8
- ✅ Deploy — Task 9

**Notes:**
- `mustDoProblems.js` intentionally not deleted — the `must-do` tab still relies on it. Migrating that tab is a follow-up (it needs the 76 slugs tagged as `blind75` in the DB).
- The `starter_code` URL param encodes Python 3 snippet by default (first match for `langSlug === 'python3'`). Language switching after navigation clears the starter code (existing `setStarterCode(null)` on problem text change handles this).
- Company tags are hidden for free/unauthenticated users via the list endpoint — no frontend conditional needed beyond the existing `company_tags_locked` flag.
