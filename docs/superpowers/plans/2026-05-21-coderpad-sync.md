# CoderPad Question Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI script that imports CoderPad Code questions (Phase 1) and MCQ questions (Phase 2) into the Camora Problem Library with 3-layer deduplication and idempotent state tracking.

**Architecture:** Playwright logs in and captures session cookies; Node native `fetch` then paginates CoderPad's internal JSON API directly — no DOM scraping. Pure transform/dedup modules are fully unit-tested. `coderpad-state.json` committed to repo prevents re-importing across runs.

**Tech Stack:** Node 20 (ESM), Playwright (auth), Node native `fetch` (API), Vitest (unit tests), dotenv (credentials)

---

## Data Structure Note

`problems-full.json` is a flat object keyed by slug — NOT an array:
```json
{
  "two-sum": {
    "slug": "two-sum",
    "topic": "arrays",
    "description": "...",
    "meta": "...",
    "testCases": [],
    "paramTypes": {},
    "solutions": {},
    "boilerplate": {}
  }
}
```
CoderPad problems are merged into this same shape. Fields we don't have (`solutions`, `boilerplate`, `testCases`) stay as empty objects/arrays.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/coderpad-sync/package.json` | Create | Node deps: playwright, dotenv, vitest |
| `scripts/coderpad-sync/.env.example` | Create | Credential template |
| `scripts/coderpad-sync/coderpad-state.json` | Create | Tracks imported IDs across runs |
| `scripts/coderpad-sync/transform.js` | Create | CoderPad raw → Camora schema (pure functions) |
| `scripts/coderpad-sync/transform.test.js` | Create | Vitest unit tests for transform |
| `scripts/coderpad-sync/dedup.js` | Create | 3-layer duplicate detection (pure functions) |
| `scripts/coderpad-sync/dedup.test.js` | Create | Vitest unit tests for dedup |
| `scripts/coderpad-sync/scraper.js` | Create | Playwright login + fetch pagination |
| `scripts/coderpad-sync/sync.js` | Create | CLI entry: parses args, orchestrates all phases |
| `apps/camora/src/data/capra/problems-full.json` | Modify | Add imported Code problems by slug key |
| `apps/camora/src/data/capra/mcq-problems.json` | Create | New MCQ store (object keyed by id) |

---

## Task 0: Inspect the Real CoderPad API

Before writing the scraper, determine the actual API field names. CoderPad is a SPA — the API is internal but stable.

**Files:** None (read-only investigation)

- [ ] **Step 1: Open CoderPad question bank in a browser with DevTools → Network tab**

  Navigate to `https://screen.coderpad.io/work/dashboard/questionbank` while logged in.
  Filter XHR/Fetch calls for `question_items`.
  
  Look for a request like:
  ```
  GET /api/v1/question_items?page=1&per_page=50
  ```

- [ ] **Step 2: Record the actual response shape**

  Copy a single item from the response and note:
  - Top-level key for the array (`question_items`, `data`, `items`, etc.)
  - Pagination meta key (`meta`, `pagination`, direct fields like `total_count`)
  - Fields present on a Code question (id, title, language, difficulty/puzzle_count, description/prompt, tags)
  - Fields present on an MCQ question (choices array shape, correct_answer field name)
  - The `question_type` or `type` filter query param name

- [ ] **Step 3: Note the actual values**

  Save to a comment at the top of `scraper.js` before coding. Example:
  ```
  // CoderPad API (verified 2026-05-21)
  // GET /api/v1/question_items?page=1&per_page=100&question_type=code
  // Response: { question_items: [...], meta: { total_count: 1481 } }
  // Code item: { id, title, language, puzzle_count, description, tags }
  // MCQ item:  { id, title, language, description, choices: [{text,correct}] }
  ```

---

## Task 1: Project Scaffold

**Files:**
- Create: `scripts/coderpad-sync/package.json`
- Create: `scripts/coderpad-sync/.env.example`
- Create: `scripts/coderpad-sync/coderpad-state.json`

- [ ] **Step 1: Create the directory and package.json**

  ```bash
  mkdir -p scripts/coderpad-sync
  ```

  Write `scripts/coderpad-sync/package.json`:
  ```json
  {
    "name": "coderpad-sync",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "test": "vitest run",
      "sync": "node sync.js"
    },
    "dependencies": {
      "dotenv": "^16.4.5",
      "playwright": "^1.44.0"
    },
    "devDependencies": {
      "vitest": "^1.6.0"
    }
  }
  ```

- [ ] **Step 2: Create the .env.example**

  Write `scripts/coderpad-sync/.env.example`:
  ```
  CODERPAD_EMAIL=you@example.com
  CODERPAD_PASSWORD=yourpassword
  ```

- [ ] **Step 3: Create initial state file**

  Write `scripts/coderpad-sync/coderpad-state.json`:
  ```json
  {
    "lastSync": null,
    "importedCodeIds": [],
    "importedMcqIds": [],
    "codeProblemCount": 0,
    "mcqProblemCount": 0
  }
  ```

- [ ] **Step 4: Install dependencies**

  ```bash
  cd scripts/coderpad-sync && npm install && npx playwright install chromium
  ```
  
  Expected: `node_modules/` created, chromium downloaded.

- [ ] **Step 5: Commit scaffold**

  ```bash
  git add scripts/coderpad-sync/package.json scripts/coderpad-sync/.env.example scripts/coderpad-sync/coderpad-state.json
  git commit -m "feat(coderpad-sync): scaffold project with dependencies"
  ```

---

## Task 2: Transform Module

Pure functions only — no file I/O, no network. Fully unit-testable.

**Files:**
- Create: `scripts/coderpad-sync/transform.js`
- Create: `scripts/coderpad-sync/transform.test.js`

- [ ] **Step 1: Write the failing tests first**

  Write `scripts/coderpad-sync/transform.test.js`:
  ```js
  import { describe, it, expect } from 'vitest';
  import {
    slugify,
    mapLanguage,
    extractDifficulty,
    stripHtml,
    deriveCategory,
    transformCodeQuestion,
    transformMcqQuestion,
  } from './transform.js';

  describe('slugify', () => {
    it('lowercases and replaces spaces with dashes', () => {
      expect(slugify('Two Sum')).toBe('two-sum');
    });
    it('strips leading/trailing dashes', () => {
      expect(slugify(' Hello World ')).toBe('hello-world');
    });
    it('collapses multiple non-alphanumeric chars', () => {
      expect(slugify('Rate Limiter (10M req/day)')).toBe('rate-limiter-10m-req-day');
    });
  });

  describe('mapLanguage', () => {
    it('maps Python 3 to python', () => expect(mapLanguage('Python 3')).toBe('python'));
    it('maps JavaScript to javascript', () => expect(mapLanguage('JavaScript')).toBe('javascript'));
    it('maps C++ to cpp', () => expect(mapLanguage('C++')).toBe('cpp'));
    it('maps unknown to lowercase no-spaces', () => expect(mapLanguage('COBOL')).toBe('cobol'));
    it('handles null', () => expect(mapLanguage(null)).toBe('general'));
    it('handles undefined', () => expect(mapLanguage(undefined)).toBe('general'));
  });

  describe('extractDifficulty', () => {
    it('maps 0 or 1 to easy', () => {
      expect(extractDifficulty(0)).toBe('easy');
      expect(extractDifficulty(1)).toBe('easy');
    });
    it('maps 2 to medium', () => expect(extractDifficulty(2)).toBe('medium'));
    it('maps 3+ to hard', () => {
      expect(extractDifficulty(3)).toBe('hard');
      expect(extractDifficulty(5)).toBe('hard');
    });
    it('handles null/undefined as easy', () => {
      expect(extractDifficulty(null)).toBe('easy');
      expect(extractDifficulty(undefined)).toBe('easy');
    });
  });

  describe('stripHtml', () => {
    it('strips tags', () => expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world'));
    it('collapses whitespace', () => expect(stripHtml('<p>  lots   of   space  </p>')).toBe('lots of space'));
    it('handles empty string', () => expect(stripHtml('')).toBe(''));
    it('handles null', () => expect(stripHtml(null)).toBe(''));
  });

  describe('deriveCategory', () => {
    it('maps python language to python category', () => expect(deriveCategory('python', [])).toBe('python'));
    it('maps cpp language to dsa category', () => expect(deriveCategory('cpp', [])).toBe('dsa'));
    it('maps typescript to javascript category', () => expect(deriveCategory('typescript', [])).toBe('javascript'));
    it('falls back to general for unknown', () => expect(deriveCategory('cobol', [])).toBe('general'));
  });

  describe('transformCodeQuestion', () => {
    const raw = {
      id: 12345,
      title: 'Two Sum',
      language: 'Python 3',
      puzzle_count: 1,
      description: '<p>Find two numbers</p>',
      tags: ['arrays'],
    };

    it('sets id to coderpad-{id}', () => {
      expect(transformCodeQuestion(raw).id).toBe('coderpad-12345');
    });
    it('sets coderpadId as string', () => {
      expect(transformCodeQuestion(raw).coderpadId).toBe('12345');
    });
    it('sets source to coderpad', () => {
      expect(transformCodeQuestion(raw).source).toBe('coderpad');
    });
    it('maps language', () => {
      expect(transformCodeQuestion(raw).language).toBe('python');
    });
    it('strips html from description', () => {
      expect(transformCodeQuestion(raw).description).toBe('Find two numbers');
    });
    it('derives difficulty from puzzle_count', () => {
      expect(transformCodeQuestion(raw).difficulty).toBe('easy');
    });
    it('generates slug', () => {
      expect(transformCodeQuestion(raw).slug).toBe('two-sum');
    });
    it('includes empty solutions/boilerplate/testCases', () => {
      const q = transformCodeQuestion(raw);
      expect(q.solutions).toEqual({});
      expect(q.boilerplate).toEqual({});
      expect(q.testCases).toEqual([]);
    });
    it('uses prompt field if description is absent', () => {
      const r = { ...raw, description: null, prompt: '<p>Use prompt</p>' };
      expect(transformCodeQuestion(r).description).toBe('Use prompt');
    });
  });

  describe('transformMcqQuestion', () => {
    const raw = {
      id: 99,
      title: 'What does Array.flat() do?',
      language: 'JavaScript',
      puzzle_count: 1,
      description: 'Choose the correct answer.',
      choices: [
        { text: 'Flattens nested arrays', correct: true },
        { text: 'Sorts the array', correct: false },
        { text: 'Reverses the array', correct: false },
        { text: 'Maps over elements', correct: false },
      ],
    };

    it('sets id to mcq-coderpad-{id}', () => {
      expect(transformMcqQuestion(raw).id).toBe('mcq-coderpad-99');
    });
    it('produces 4 choices with letter ids', () => {
      const q = transformMcqQuestion(raw);
      expect(q.choices).toHaveLength(4);
      expect(q.choices[0].id).toBe('a');
      expect(q.choices[3].id).toBe('d');
    });
    it('identifies correct answer by index', () => {
      expect(transformMcqQuestion(raw).correctAnswer).toBe('a');
    });
    it('sets domain from language', () => {
      expect(transformMcqQuestion(raw).domain).toBe('javascript');
    });
  });
  ```

- [ ] **Step 2: Run tests — expect all to fail**

  ```bash
  cd scripts/coderpad-sync && npm test
  ```
  
  Expected: many "Cannot find module './transform.js'" errors.

- [ ] **Step 3: Implement transform.js**

  Write `scripts/coderpad-sync/transform.js`:
  ```js
  const LANGUAGE_MAP = {
    'Python 3': 'python',
    'Python': 'python',
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'SQL': 'sql',
    'Java': 'java',
    'C++': 'cpp',
    'Go': 'go',
    'Ruby': 'ruby',
    'C#': 'csharp',
    'Rust': 'rust',
    'Swift': 'swift',
    'Kotlin': 'kotlin',
    'PHP': 'php',
  };

  const CATEGORY_MAP = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'javascript',
    sql: 'sql',
    java: 'java',
    cpp: 'dsa',
    go: 'go',
    ruby: 'general',
    csharp: 'general',
    rust: 'general',
    swift: 'general',
    kotlin: 'general',
    php: 'general',
  };

  export function slugify(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  export function mapLanguage(raw) {
    if (!raw) return 'general';
    return LANGUAGE_MAP[raw] ?? raw.toLowerCase().replace(/\s+/g, '');
  }

  export function extractDifficulty(puzzleCount) {
    const n = Number(puzzleCount ?? 0);
    if (n <= 1) return 'easy';
    if (n === 2) return 'medium';
    return 'hard';
  }

  export function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  export function deriveCategory(language, tags = []) {
    if (CATEGORY_MAP[language]) return CATEGORY_MAP[language];
    const tagHit = tags.find((t) => CATEGORY_MAP[t?.toLowerCase()]);
    if (tagHit) return CATEGORY_MAP[tagHit.toLowerCase()];
    return 'general';
  }

  export function transformCodeQuestion(raw) {
    const language = mapLanguage(raw.language);
    const description = stripHtml(raw.description || raw.prompt || '');
    return {
      id: `coderpad-${raw.id}`,
      coderpadId: String(raw.id),
      source: 'coderpad',
      slug: slugify(raw.title),
      title: raw.title,
      topic: deriveCategory(language, raw.tags),
      language,
      difficulty: extractDifficulty(raw.puzzle_count ?? raw.difficulty_level),
      description,
      meta: description.slice(0, 160),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      testCases: [],
      paramTypes: {},
      solutions: {},
      boilerplate: {},
    };
  }

  export function transformMcqQuestion(raw) {
    const choices = Array.isArray(raw.choices)
      ? raw.choices.map((c, i) => ({
          id: String.fromCharCode(97 + i),
          text: typeof c === 'string' ? c : c.text ?? '',
          correct: typeof c === 'object' ? Boolean(c.correct) : false,
        }))
      : [];

    const correctIdx = choices.findIndex((c) => c.correct);
    const correctAnswer = correctIdx >= 0 ? choices[correctIdx].id : 'a';

    return {
      id: `mcq-coderpad-${raw.id}`,
      coderpadId: String(raw.id),
      source: 'coderpad',
      title: raw.title,
      domain: mapLanguage(raw.language) || raw.topic || 'general',
      difficulty: extractDifficulty(raw.puzzle_count ?? raw.difficulty_level),
      question: stripHtml(raw.description || raw.prompt || raw.title),
      choices: choices.map(({ id, text }) => ({ id, text })),
      correctAnswer,
      explanation: stripHtml(raw.explanation || raw.rationale || ''),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    };
  }
  ```

- [ ] **Step 4: Run tests — expect all to pass**

  ```bash
  cd scripts/coderpad-sync && npm test
  ```
  
  Expected: all tests pass, no failures.

- [ ] **Step 5: Commit**

  ```bash
  git add scripts/coderpad-sync/transform.js scripts/coderpad-sync/transform.test.js
  git commit -m "feat(coderpad-sync): add transform module with unit tests"
  ```

---

## Task 3: Dedup Module

Pure functions — takes candidates and existing data, returns a decision.

**Files:**
- Create: `scripts/coderpad-sync/dedup.js`
- Create: `scripts/coderpad-sync/dedup.test.js`

- [ ] **Step 1: Write the failing tests**

  Write `scripts/coderpad-sync/dedup.test.js`:
  ```js
  import { describe, it, expect } from 'vitest';
  import { similarity, isDuplicate } from './dedup.js';

  const mockState = {
    importedCodeIds: ['100', '200'],
    importedMcqIds: ['50'],
  };

  const existingProblems = {
    'two-sum': { slug: 'two-sum', coderpadId: '100', title: 'Two Sum' },
    'longest-substring-without-repeating-characters': {
      slug: 'longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
    },
  };

  describe('similarity', () => {
    it('identical strings score 1', () => {
      expect(similarity('hello', 'hello')).toBe(1);
    });
    it('completely different strings score < 0.5', () => {
      expect(similarity('abc', 'xyz')).toBeLessThan(0.5);
    });
    it('is case-insensitive', () => {
      expect(similarity('Hello', 'hello')).toBe(1);
    });
    it('near-identical strings score >= 0.85', () => {
      expect(
        similarity(
          'Longest Substring Without Repeating Characters',
          'Longest Substring Without Repeating Chars'
        )
      ).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('isDuplicate', () => {
    it('detects CoderPad ID in state', () => {
      const candidate = { coderpadId: '100', title: 'Two Sum', slug: 'two-sum' };
      const r = isDuplicate(candidate, existingProblems, mockState, 'code');
      expect(r.isDupe).toBe(true);
      expect(r.reason).toBe('coderpad-id');
    });

    it('detects slug collision in existing data', () => {
      const candidate = { coderpadId: '999', title: 'Two Sum', slug: 'two-sum' };
      const r = isDuplicate(candidate, existingProblems, mockState, 'code');
      expect(r.isDupe).toBe(true);
      expect(r.reason).toBe('slug');
    });

    it('detects fuzzy title match at 85% threshold', () => {
      const candidate = {
        coderpadId: '999',
        title: 'Longest Substring Without Repeating Chars',
        slug: 'longest-substring-without-repeating-chars',
      };
      const r = isDuplicate(candidate, existingProblems, mockState, 'code');
      expect(r.isDupe).toBe(true);
      expect(r.reason).toBe('fuzzy');
    });

    it('passes a unique question', () => {
      const candidate = { coderpadId: '999', title: 'Binary Search Tree', slug: 'binary-search-tree' };
      const r = isDuplicate(candidate, existingProblems, mockState, 'code');
      expect(r.isDupe).toBe(false);
    });

    it('uses mcq id list when type is mcq', () => {
      const candidate = { coderpadId: '50', title: 'What is a closure?', slug: 'what-is-a-closure' };
      const r = isDuplicate(candidate, {}, mockState, 'mcq');
      expect(r.isDupe).toBe(true);
      expect(r.reason).toBe('coderpad-id');
    });
  });
  ```

- [ ] **Step 2: Run tests — expect all to fail**

  ```bash
  cd scripts/coderpad-sync && npm test
  ```
  
  Expected: "Cannot find module './dedup.js'".

- [ ] **Step 3: Implement dedup.js**

  Write `scripts/coderpad-sync/dedup.js`:
  ```js
  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  export function similarity(a, b) {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const maxLen = Math.max(al.length, bl.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(al, bl) / maxLen;
  }

  // existingProblems is the slug-keyed object from problems-full.json
  // or the id-keyed object from mcq-problems.json
  export function isDuplicate(candidate, existingProblems, state, type = 'code') {
    const idSet = new Set(type === 'code' ? state.importedCodeIds : state.importedMcqIds);

    // Layer 1: ID already tracked
    if (idSet.has(candidate.coderpadId)) {
      return { isDupe: true, reason: 'coderpad-id' };
    }

    // Layer 2: Slug key exists in problems object
    if (existingProblems[candidate.slug]) {
      return { isDupe: true, reason: 'slug', matchSlug: candidate.slug };
    }

    // Layer 3: Fuzzy title match against all existing problem titles
    const titles = Object.values(existingProblems).map((p) => p.title).filter(Boolean);
    const fuzzyMatch = titles.find((t) => similarity(candidate.title, t) >= 0.85);
    if (fuzzyMatch) {
      return {
        isDupe: true,
        reason: 'fuzzy',
        matchTitle: fuzzyMatch,
        score: similarity(candidate.title, fuzzyMatch),
      };
    }

    return { isDupe: false };
  }
  ```

- [ ] **Step 4: Run tests — expect all to pass**

  ```bash
  cd scripts/coderpad-sync && npm test
  ```
  
  Expected: all tests pass (transform + dedup suites).

- [ ] **Step 5: Commit**

  ```bash
  git add scripts/coderpad-sync/dedup.js scripts/coderpad-sync/dedup.test.js
  git commit -m "feat(coderpad-sync): add dedup module with 3-layer detection"
  ```

---

## Task 4: Scraper Module

Playwright handles login only. All pagination is done via direct HTTP fetch with the session cookie.

**Files:**
- Create: `scripts/coderpad-sync/scraper.js`

**Note:** Update the constants at the top of this file based on Task 0 API inspection — especially `QUESTION_TYPE_CODE`, `QUESTION_TYPE_MCQ`, `ITEMS_KEY`, and `TOTAL_KEY`.

- [ ] **Step 1: Write scraper.js**

  Write `scripts/coderpad-sync/scraper.js`:
  ```js
  import { chromium } from 'playwright';

  // Update these after Task 0 API inspection:
  const BASE_URL = 'https://screen.coderpad.io';
  const QUESTION_TYPE_CODE = 'code';
  const QUESTION_TYPE_MCQ = 'multiple_choice'; // verify in Task 0
  const ITEMS_KEY = 'question_items';          // verify in Task 0
  const TOTAL_KEY = 'meta.total_count';        // e.g. data.meta.total_count

  function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  export async function getSessionCookies(email, password) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${BASE_URL}/users/sign_in`, { waitUntil: 'domcontentloaded' });

      // Try common selectors for email/password fields
      const emailSel = 'input[type="email"], input[name="email"], input[name="user[email]"]';
      const passSel = 'input[type="password"], input[name="password"], input[name="user[password]"]';
      const submitSel = 'button[type="submit"], input[type="submit"]';

      await page.fill(emailSel, email);
      await page.fill(passSel, password);
      await page.click(submitSel);

      await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {
        throw new Error(
          'Login timed out — check credentials or try navigating to CoderPad manually first'
        );
      });
    } finally {
      const cookies = await context.cookies();
      await browser.close();
      if (!cookies.length) throw new Error('Login succeeded but no cookies returned');
      return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }
  }

  async function fetchPage(cookieStr, page, perPage, questionType) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      question_type: questionType,
    });
    const url = `${BASE_URL}/api/v1/question_items?${params}`;
    const res = await fetch(url, {
      headers: {
        Cookie: cookieStr,
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (res.status === 429) {
      throw Object.assign(new Error('Rate limited'), { retryable: true });
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Auth error (${res.status}) — session may have expired`);
    }
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  export async function fetchAllQuestions(cookieStr, questionType = QUESTION_TYPE_CODE, onProgress) {
    const PER_PAGE = 100;
    const RATE_LIMIT_MS = 200;
    const all = [];
    let pageNum = 1;
    let total = null;

    while (true) {
      let data;
      try {
        data = await fetchPage(cookieStr, pageNum, PER_PAGE, questionType);
      } catch (err) {
        if (err.retryable) {
          console.warn('\nRate limited — waiting 5s...');
          await sleep(5000);
          continue;
        }
        throw err;
      }

      const items = data[ITEMS_KEY] ?? data.items ?? data.data ?? [];
      if (!items.length) break;
      all.push(...items);

      total = getNestedValue(data, TOTAL_KEY) ?? data.total_count ?? all.length;
      if (onProgress) onProgress(all.length, total);
      if (all.length >= total) break;

      pageNum++;
      await sleep(RATE_LIMIT_MS);
    }

    return { items: all, total: total ?? all.length };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/coderpad-sync/scraper.js
  git commit -m "feat(coderpad-sync): add Playwright login + fetch pagination scraper"
  ```

---

## Task 5: Sync Orchestration (Phase 1 — Code)

The main CLI entry point that wires everything together for code questions.

**Files:**
- Create: `scripts/coderpad-sync/sync.js`

- [ ] **Step 1: Write sync.js**

  Write `scripts/coderpad-sync/sync.js`:
  ```js
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

  function parseArgs() {
    const args = process.argv.slice(2);
    const flag = (name) => {
      const i = args.indexOf(name);
      return i !== -1 ? args[i + 1] : null;
    };
    return {
      phase: flag('--phase') ?? 'code',
      email: flag('--email') ?? process.env.CODERPAD_EMAIL,
      password: flag('--password') ?? process.env.CODERPAD_PASSWORD,
      dryRun: args.includes('--dry-run'),
    };
  }

  function loadState() {
    if (!existsSync(STATE_PATH)) {
      return { lastSync: null, importedCodeIds: [], importedMcqIds: [], codeProblemCount: 0, mcqProblemCount: 0 };
    }
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  }

  function saveState(state) {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  }

  async function runCodePhase(cookieStr, state, dryRun) {
    console.log('\n── Phase 1: Code Questions ──');
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

    console.log(`  + ${Object.keys(toAdd).length} new problems`);
    console.log(`  - ${skipped.length} duplicates skipped`);
    if (skipped.length > 0) {
      const sample = skipped.slice(0, 5).map((s) => `    [${s.reason}] ${s.title}`).join('\n');
      console.log(`  Sample skipped:\n${sample}`);
    }

    if (!dryRun) {
      const merged = { ...existingProblems, ...toAdd };
      writeFileSync(PROBLEMS_PATH, JSON.stringify(merged, null, 2));
      state.importedCodeIds.push(...Object.values(toAdd).map((p) => p.coderpadId));
      state.codeProblemCount += Object.keys(toAdd).length;
      state.lastSync = new Date().toISOString();
      saveState(state);
      console.log(`  problems-full.json updated (${Object.keys(merged).length} total problems).`);
    } else {
      console.log('  [DRY RUN] No files written.');
    }
  }

  async function runMcqPhase(cookieStr, state, dryRun) {
    console.log('\n── Phase 2: MCQ Questions ──');
    console.log('Fetching from CoderPad...');

    const { items: rawItems, total } = await fetchAllQuestions(cookieStr, 'multiple_choice', (n, t) => {
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

    console.log(`  + ${Object.keys(toAdd).length} new MCQ problems`);
    console.log(`  - ${skipped.length} duplicates skipped`);

    if (!dryRun) {
      mcqStore.problems = { ...mcqStore.problems, ...toAdd };
      mcqStore.count = Object.keys(mcqStore.problems).length;
      mcqStore.lastSync = new Date().toISOString();
      writeFileSync(MCQ_PATH, JSON.stringify(mcqStore, null, 2));
      state.importedMcqIds.push(...Object.values(toAdd).map((p) => p.coderpadId));
      state.mcqProblemCount += Object.keys(toAdd).length;
      state.lastSync = new Date().toISOString();
      saveState(state);
      console.log(`  mcq-problems.json updated (${mcqStore.count} total MCQ problems).`);
    } else {
      console.log('  [DRY RUN] No files written.');
    }
  }

  async function main() {
    const { phase, email, password, dryRun } = parseArgs();

    if (!email || !password) {
      console.error(
        'Error: Provide --email and --password flags, or set CODERPAD_EMAIL / CODERPAD_PASSWORD in scripts/coderpad-sync/.env'
      );
      process.exit(1);
    }

    console.log(`CoderPad Sync  phase=${phase}${dryRun ? '  [DRY RUN]' : ''}`);
    console.log('Logging in to CoderPad (a browser will open briefly)...');

    const cookieStr = await getSessionCookies(email, password);
    console.log('Login OK.');

    const state = loadState();

    if (phase === 'code' || phase === 'both') await runCodePhase(cookieStr, state, dryRun);
    if (phase === 'mcq' || phase === 'both') await runMcqPhase(cookieStr, state, dryRun);

    console.log('\nDone.');
  }

  main().catch((err) => {
    console.error(`\nFatal: ${err.message}`);
    process.exit(1);
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/coderpad-sync/sync.js
  git commit -m "feat(coderpad-sync): add sync.js CLI orchestrator (both phases)"
  ```

---

## Task 6: Smoke Test (Dry Run)

Validate the full pipeline without writing any files.

**Files:** None

- [ ] **Step 1: Create a .env file from the example**

  ```bash
  cp scripts/coderpad-sync/.env.example scripts/coderpad-sync/.env
  # Then edit .env and fill in your CoderPad credentials
  ```

- [ ] **Step 2: Run all unit tests one more time**

  ```bash
  cd scripts/coderpad-sync && npm test
  ```
  
  Expected: all tests pass.

- [ ] **Step 3: Run a dry-run for code phase**

  ```bash
  node scripts/coderpad-sync/sync.js --phase code --dry-run
  ```
  
  Expected output (approximate):
  ```
  CoderPad Sync  phase=code  [DRY RUN]
  Logging in to CoderPad (a browser will open briefly)...
  Login OK.

  ── Phase 1: Code Questions ──
  Fetching from CoderPad...
    1481/1481 fetched
  Fetched 1481 of 1481 code questions.
    + 731 new problems
    - 750 duplicates skipped
    [DRY RUN] No files written.

  Done.
  ```
  
  If you see an auth error, verify your `.env` credentials.  
  If `ITEMS_KEY` doesn't match the actual API (items array is empty), open a browser → DevTools → inspect the real response and update the constant in `scraper.js`.

- [ ] **Step 4: Run the real code import**

  Once dry-run output looks correct (nonzero new problems found):
  ```bash
  node scripts/coderpad-sync/sync.js --phase code
  ```
  
  Expected: `problems-full.json` grows by new problems, `coderpad-state.json` updated with imported IDs.

- [ ] **Step 5: Verify problems-full.json**

  ```bash
  node -e "const d = JSON.parse(require('fs').readFileSync('apps/camora/src/data/capra/problems-full.json','utf8')); console.log('Total problems:', Object.keys(d).length); const cp = Object.values(d).filter(p => p.source === 'coderpad'); console.log('CoderPad imported:', cp.length); console.log('Sample:', cp[0]?.title);"
  ```
  
  Expected: total count > 750, CoderPad count matches the sync output.

- [ ] **Step 6: Verify the build still passes**

  ```bash
  cd apps/camora && npx vite build 2>&1 | tail -5
  ```
  
  Expected: build completes without errors. The large JSON is just data — it doesn't affect the build's TypeScript checking.

- [ ] **Step 7: Commit the updated data and state**

  ```bash
  git pull --rebase
  git add apps/camora/src/data/capra/problems-full.json scripts/coderpad-sync/coderpad-state.json
  git commit -m "feat(coderpad-sync): import CoderPad code questions into Problem Library"
  git push
  ```

---

## Task 7: MCQ Import

Run once the Code phase is confirmed complete.

**Files:**
- Create: `apps/camora/src/data/capra/mcq-problems.json` (auto-created by sync.js)

- [ ] **Step 1: Dry run MCQ phase**

  ```bash
  node scripts/coderpad-sync/sync.js --phase mcq --dry-run
  ```
  
  Expected output (approximate):
  ```
  ── Phase 2: MCQ Questions ──
  Fetching from CoderPad...
    3363/3363 fetched
  Fetched 3363 of 3363 MCQ questions.
    + 3363 new MCQ problems
    - 0 duplicates skipped
    [DRY RUN] No files written.
  ```

- [ ] **Step 2: Run real MCQ import**

  ```bash
  node scripts/coderpad-sync/sync.js --phase mcq
  ```

- [ ] **Step 3: Verify mcq-problems.json**

  ```bash
  node -e "const d = JSON.parse(require('fs').readFileSync('apps/camora/src/data/capra/mcq-problems.json','utf8')); console.log('MCQ count:', d.count); const sample = Object.values(d.problems)[0]; console.log('Sample:', sample?.title, '| choices:', sample?.choices?.length, '| correct:', sample?.correctAnswer);"
  ```
  
  Expected: count ~3363, each MCQ has 4 choices, correctAnswer is a letter (a/b/c/d).

- [ ] **Step 4: Commit MCQ data**

  ```bash
  git pull --rebase
  git add apps/camora/src/data/capra/mcq-problems.json scripts/coderpad-sync/coderpad-state.json
  git commit -m "feat(coderpad-sync): import CoderPad MCQ questions into mcq-problems.json"
  git push
  ```

---

## Self-Review

**Spec coverage:**
- ✅ Playwright API interceptor → using cookie-based fetch (more reliable than mid-flight interception)
- ✅ Phase 1: 1,481 code questions → `problems-full.json`
- ✅ Phase 2: MCQ → `mcq-problems.json`
- ✅ 3-layer deduplication (ID, slug, fuzzy Levenshtein)
- ✅ `coderpad-state.json` state tracking committed to repo
- ✅ Rate limiting (200ms between requests)
- ✅ 429 retryable error handling
- ✅ `--dry-run` flag
- ✅ Credential via CLI flags or `.env`
- ✅ MCQ schema matches spec

**Placeholder check:** None found — all steps have full code.

**Type consistency:** `coderpadId` is always `String(raw.id)` in transform.js and compared against `state.importedCodeIds` (strings) in dedup.js. Consistent throughout.

**One gap addressed:** `problems-full.json` is a slug-keyed object, not an array — transform, dedup, and sync all use `existingProblems[slug]` key lookup and object merge (`{...existing, ...toAdd}`), which matches the actual data format verified in Task 0.
