# LeetCode Scraper & Problems DB — Design Spec
**Date:** 2026-05-27  
**Status:** Approved

---

## Goal

Scrape all ~3,500 LeetCode problems (including Premium) into a PostgreSQL table, deduplicate against the existing 1,526-problem `problems-full.json`, retire the static JSON files, and wire the practice UI to query the DB. Starter code snippets from LeetCode are used to constrain Claude's solution generation to the exact function signature the judge expects.

---

## 1. Database Schema

New table added to ascend-backend's startup migration in `apps/ascend-backend/src/index.js`.

```sql
CREATE TABLE IF NOT EXISTS coding_problems (
  id              SERIAL PRIMARY KEY,
  lc_id           INTEGER UNIQUE,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  title           VARCHAR(500) NOT NULL,
  difficulty      VARCHAR(10) NOT NULL,          -- 'Easy' | 'Medium' | 'Hard'
  content         TEXT,                           -- HTML description
  examples        JSONB,                          -- [{input, output, explanation}]
  constraints     JSONB,                          -- string[]
  hints           JSONB,                          -- string[]
  topic_tags      JSONB,                          -- [{name, slug}]
  company_tags    JSONB,                          -- string[] (premium)
  code_snippets   JSONB,                          -- [{lang, langSlug, code}]
  is_premium      BOOLEAN DEFAULT false,
  acceptance_rate FLOAT,
  source          VARCHAR(20) DEFAULT 'leetcode', -- 'leetcode' | 'custom'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty  ON coding_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_coding_problems_topic_tags  ON coding_problems USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_coding_problems_company_tags ON coding_problems USING GIN(company_tags);
```

**Deduplication key:** `slug` (unique constraint). Migration inserts existing JSON first as `source='custom'`, then scraper upserts by slug — LeetCode wins on conflict.

---

## 2. Migration Script — JSON → DB

**File:** `apps/ascend-backend/scripts/migrate-problems-json.js`  
**Run before the scraper.**

Reads `apps/camora/src/data/capra/problems-full.json` (1,526 problems) and inserts each row with `source='custom'`, `lc_id=null`. Field mapping:

| JSON field     | DB column      | Transform                                  |
|----------------|----------------|--------------------------------------------|
| `slug`         | `slug`         | direct                                     |
| `topic`        | `topic_tags`   | `[{name: topic, slug: topic}]`             |
| `description`  | `content`      | wrap in `<p>` (plain text → minimal HTML)  |
| `paramTypes`   | `code_snippets`| convert to per-language boilerplate        |
| solutions      | _(not stored)_ | Claude generates on demand                 |

Uses `INSERT ... ON CONFLICT (slug) DO NOTHING` so re-runs are safe.

---

## 3. Scraper Script

**File:** `apps/ascend-backend/scripts/scrape-leetcode.js`  
**Auth:** `LEETCODE_SESSION` and `csrftoken` cookies from browser DevTools, passed as env vars.

### Phase 1 — Problem list (1 request, no auth)
```
GET https://leetcode.com/api/problems/all/
→ lc_id, slug, title, difficulty level (1/2/3), is_premium, acceptance_rate
```

### Phase 2 — Full content (1 GraphQL request per problem, authenticated)
```graphql
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    titleSlug
    difficulty
    isPaidOnly
    content
    exampleTestcases
    topicTags { name slug }
    hints
    companyTagStats
    codeSnippets { lang langSlug code }
    stats
  }
}
```

Endpoint: `POST https://leetcode.com/graphql`  
Headers: `Cookie: LEETCODE_SESSION=...; csrftoken=...` + `x-csrftoken: ...`

### Execution
- **Concurrency:** 8 workers
- **Rate limit:** 250ms between each worker's requests
- **Retry:** exponential backoff on 429 (2s → 4s → 8s, max 3 retries)
- **Resume:** problems already in DB skipped unless `--force` flag passed
- **Estimated time:** ~20 minutes for full catalog
- **Progress:** logs `[1234/3500] two-sum ✓` per problem

### Upsert logic
```sql
INSERT INTO coding_problems (...) VALUES (...)
ON CONFLICT (slug) DO UPDATE SET
  lc_id = EXCLUDED.lc_id,
  content = EXCLUDED.content,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  hints = EXCLUDED.hints,
  topic_tags = EXCLUDED.topic_tags,
  company_tags = EXCLUDED.company_tags,
  code_snippets = EXCLUDED.code_snippets,
  is_premium = EXCLUDED.is_premium,
  acceptance_rate = EXCLUDED.acceptance_rate,
  source = 'leetcode',
  updated_at = NOW();
```

### Dedup report (printed at end)
```
Deduplication summary
─────────────────────────────────────────────
 LeetCode problems inserted (new)   :  2,041
 Existing JSON problems overwritten :  1,459
 Custom problems kept as-is         :     67
 Total in DB                        :  3,567
─────────────────────────────────────────────
```

After confirming the report, `problems-full.json` and `mustDoProblems.js` are deleted from the repo.

---

## 4. Starter Code Snippets

LeetCode's `codeSnippets` are the authoritative function signatures for each language. They define the exact class/function name, parameter names, and return type the judge expects.

**Editor pre-fill:** When a user opens a LeetCode problem and selects a language, the editor initialises with `code_snippets[langSlug]` from the DB row instead of an empty file.

**Solve endpoint constraint:** When `starterCode` is present in the `/api/v1/coding/solve` request, the system prompt prepends:
> "Use exactly this starter code as your function signature — do not rename the function, class, or parameters. Fill in the body only."

Custom problems (`source='custom'`) have no official snippets — Claude generates a complete solution freely as before.

---

## 5. Backend API

**File:** `apps/ascend-backend/src/routes/problems.js`  
**Mounted:** `/api/v1/problems` in `apps/ascend-backend/src/index.js`

### Endpoints

```
GET /api/v1/problems
    Query params: difficulty, tag, company, source, q (title search), page, limit (default 50)
    Auth: optional
    Returns: { problems: [list fields only — no content/hints], total, page, pages }
    Note: company_tags in response only for paid users; free users see [] with is_locked flag

GET /api/v1/problems/:slug
    Auth: required
    Gate: is_premium problems require subscriptionRequired middleware
    Returns: full row including content, examples, hints, code_snippets

GET /api/v1/problems/tags
    Auth: none
    Returns: { topic_tags: string[], company_tags: string[] }
```

### Solve endpoint change (lumora-backend)

`POST /api/v1/coding/solve` accepts optional `starterCode: string` field.  
When present, injected into system prompt before solution generation.  
Frontend passes `code_snippets` entry for the selected language from the problem detail response.

---

## 6. Frontend Changes

### Modified files

**`apps/camora/src/services/capra-api.ts`** — add helpers:
```ts
export const getProblems    = (params) => capraApi.get('/api/v1/problems', { params });
export const getProblem     = (slug)   => capraApi.get(`/api/v1/problems/${slug}`);
export const getProblemTags = ()       => capraApi.get('/api/v1/problems/tags');
```

**`apps/camora/src/pages/capra/HRLibraryPage.tsx`**
- Replace `mustDoProblems.js` static import with `getProblems()` API call
- Add filter chips: difficulty, topic tag, company tag (company locked for free users)
- Pagination (50/page)

**`apps/camora/src/pages/capra/PracticePage.jsx`**
- Replace hardcoded `CHALLENGES` object with `getProblems()` fetch
- Problem detail panel calls `getProblem(slug)` on selection
- Editor initialises with `code_snippets[selectedLanguage]`
- Solve call includes `starterCode: code_snippets[selectedLanguage]`

**`apps/camora/src/components/lumora/coding/CodingLayout.tsx`**
- When problem opened from library, editor pre-fills with starter code snippet
- `starterCode` added to solve request payload

### Deleted after migration confirmed
- `apps/camora/src/data/capra/problems-full.json`
- `apps/camora/src/data/capra/mustDoProblems.js`
- All static imports of those files

---

## 7. Run Order

1. `node scripts/migrate-problems-json.js` — seed DB from existing JSON
2. `LEETCODE_SESSION=... CSRFTOKEN=... node scripts/scrape-leetcode.js` — scrape LeetCode
3. Review dedup report
4. Delete `problems-full.json` and `mustDoProblems.js` from repo
5. Deploy ascend-backend (runs DB migration on startup)
6. Deploy frontend

---

## 8. Out of Scope

- Scheduling recurring scrapes (LeetCode problem set grows slowly — manual re-run is fine)
- Storing Claude-generated solutions in DB (generated on demand, not persisted)
- HackerRank scraping (different API, separate effort)
- Editorial/official LeetCode solutions (not available via API without Premium editorial access)
