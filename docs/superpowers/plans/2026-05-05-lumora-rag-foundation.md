# Lumora RAG Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground Sona's live-interview answers in (1) the Capra Prepare knowledge base and (2) the user's Lumora Prep Kit documents, served from a pgvector index, with a hard latency budget and graceful degradation.

**Architecture:** Two-table pgvector index in the existing Postgres — `lumora_kb_chunks` (global Capra topic chunks) and `lumora_user_doc_chunks` (per-user JD/resume/uploads). Chunks are structure-aware (one chunk per topic section, not blind token windows). At question time, lumora-backend embeds the question with OpenAI `text-embedding-3-small`, runs cosine ANN against both tables, takes top-k from each, and prepends the result to the existing `systemContext` in `streamResponse`. Retrieval races against a 250ms timeout — if it loses, Sona answers without grounding rather than blocking. Chunk IDs are returned alongside the stream for citation.

**Tech Stack:**
- pgvector 0.7+ extension on existing PostgreSQL (Railway-managed)
- OpenAI `text-embedding-3-small` (1536-dim) — `OPENAI_API_KEY` already wired
- vitest 4.x (lumora-backend already configured)
- Node 20 ESM (matches existing lumora-backend)
- HNSW index (`m=16, ef_construction=64`) for vector ANN

**Out of scope (separate plans, see roadmap at bottom):**
- Hybrid retrieval (BM25 + RRF) — Plan B
- Cross-encoder reranker — Plan B
- Contextual chunking via Haiku — Plan B
- HyDE query rewriting — Plan B
- Session-warm prefetch — Plan B
- JD-derived web crawler / live web tier — Plan C
- Eval harness + retrieval logs — Plan D

---

## File Structure

**New files (lumora-backend):**

| Path | Responsibility |
|------|----------------|
| `apps/lumora-backend/src/services/embeddings.js` | OpenAI embedding wrapper with in-memory query cache |
| `apps/lumora-backend/src/services/chunker.js` | Structure-aware splitter — turns one Capra topic into N chunks |
| `apps/lumora-backend/src/services/retrieval.js` | Cosine ANN against `lumora_kb_chunks` + `lumora_user_doc_chunks`, with timeout |
| `apps/lumora-backend/src/services/userDocIndexer.js` | Indexes a user's Prep Kit blob into `lumora_user_doc_chunks` |
| `apps/lumora-backend/scripts/index-capra-kb.js` | One-time / change-driven script to chunk + embed all Capra topic files |
| `apps/lumora-backend/scripts/topic-manifest.js` | Source-of-truth list of `{file, export, source}` topic modules to ingest |
| `apps/lumora-backend/tests/embeddings.test.js` | Embedding cache + batch behavior |
| `apps/lumora-backend/tests/chunker.test.js` | Chunker output shape per topic section |
| `apps/lumora-backend/tests/retrieval.test.js` | Vector search shape, timeout race, namespace isolation |
| `apps/lumora-backend/tests/userDocIndexer.test.js` | Per-user chunking + delete-and-replace semantics |
| `apps/lumora-backend/tests/inference.integration.test.js` | streamResponse receives retrievedContext and concatenates correctly |

**Modified files:**

| Path | Change |
|------|--------|
| `apps/lumora-backend/src/index.js` | Add pgvector extension + 2 tables to migrations array |
| `apps/lumora-backend/src/services/claude.js` | Accept new `retrievedContext` option in `streamResponse`, prepend to `systemContext` |
| `apps/lumora-backend/src/routes/inference.js` | Call `retrieve()` with 250ms race before `streamResponse`; emit citation event |
| `apps/lumora-backend/src/routes/prep.js` | Fire-and-forget `indexUserPrepDocs()` on PUT /state |
| `apps/lumora-backend/package.json` | Add `pg` peer-bumps if needed (already present); no new deps |

**No frontend changes in Plan A.** Citations rendering, "Sources used" UI, and Prep panel reindex affordances ship in a follow-up.

---

## Task 1: Add pgvector extension + retrieval tables

**Files:**
- Modify: `apps/lumora-backend/src/index.js:50-150` (the `migrations` array)

The lumora-backend uses inline `CREATE TABLE IF NOT EXISTS` migrations on startup. We extend that array with the pgvector extension and two new tables.

- [ ] **Step 1: Read the existing migrations array**

Run: `sed -n '50,160p' apps/lumora-backend/src/index.js`
Expected: see the `const migrations = [...]` array containing the existing `CREATE TABLE IF NOT EXISTS` statements ending around line 150.

- [ ] **Step 2: Insert pgvector + two new tables at the END of the migrations array, before the closing `];`**

Edit `apps/lumora-backend/src/index.js`. Locate the final entry in the `migrations` array (the `lumora_audio_preferences` table). Add these entries directly after it, BEFORE the closing `];`:

```js
      // ── RAG: pgvector extension ────────────────────────────────────
      // text-embedding-3-small is 1536-dim. HNSW indexes give us ~10ms
      // top-k cosine search at our scale (low five-figures of chunks).
      `CREATE EXTENSION IF NOT EXISTS vector`,

      // Global knowledge base — Capra Prepare topic chunks. One row per
      // section of a topic (introduction / keyConcepts / whenToUse /
      // questions[N]). source_kind currently = 'capra-topic'; reserved
      // for future: 'company-blog', 'official-doc' (Plan C).
      `CREATE TABLE IF NOT EXISTS lumora_kb_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_kind VARCHAR(40) NOT NULL,
        source VARCHAR(80) NOT NULL,
        topic_id VARCHAR(120) NOT NULL,
        topic_title TEXT NOT NULL,
        section VARCHAR(60) NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding vector(1536) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        content_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source, topic_id, section)
      )`,
      `CREATE INDEX IF NOT EXISTS lumora_kb_chunks_hnsw
         ON lumora_kb_chunks USING hnsw (embedding vector_cosine_ops)
         WITH (m = 16, ef_construction = 64)`,
      `CREATE INDEX IF NOT EXISTS lumora_kb_chunks_topic
         ON lumora_kb_chunks (source, topic_id)`,

      // Per-user Prep Kit chunks — JD body, resume body, uploaded docs.
      // Strict per-user namespace; queries always filter by user_id.
      // doc_kind: 'jd' | 'resume' | 'cover_letter' | 'upload'.
      `CREATE TABLE IF NOT EXISTS lumora_user_doc_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_key VARCHAR(120),
        doc_kind VARCHAR(40) NOT NULL,
        section VARCHAR(60),
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding vector(1536) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        prep_state_version BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_user
         ON lumora_user_doc_chunks (user_id, prep_state_version)`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_hnsw
         ON lumora_user_doc_chunks USING hnsw (embedding vector_cosine_ops)
         WITH (m = 16, ef_construction = 64)`,
```

- [ ] **Step 3: Restart the backend locally and verify the extension + tables exist**

Run:
```bash
pnpm dev:lumora &
sleep 3
psql "$DATABASE_URL" -c "\dx vector" -c "\d lumora_kb_chunks" -c "\d lumora_user_doc_chunks"
```

Expected:
- `vector` extension listed under `\dx`
- Both tables exist with the columns shown above
- Indexes `lumora_kb_chunks_hnsw`, `lumora_user_doc_chunks_hnsw` present

If pgvector isn't installed on the Railway Postgres image, fail loud — note the error and stop. Railway's default Postgres includes pgvector; if it doesn't, the engineer must enable the extension via Railway's UI before continuing.

- [ ] **Step 4: Commit**

```bash
git add apps/lumora-backend/src/index.js
git commit -m "feat(lumora): add pgvector + lumora_kb_chunks + lumora_user_doc_chunks"
```

---

## Task 2: Embedding service with query cache

**Files:**
- Create: `apps/lumora-backend/src/services/embeddings.js`
- Test: `apps/lumora-backend/tests/embeddings.test.js`

OpenAI's embedding API costs $0.02/M tokens for `text-embedding-3-small`. We add a small in-memory LRU keyed by SHA-256 of the input — interview questions repeat heavily in the same session, so cache hit rates are high. Batch up to 100 inputs per API call.

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/embeddings.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the OpenAI SDK before importing the service.
const createMock = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: { create: createMock },
  })),
}));

beforeEach(() => {
  createMock.mockReset();
  // Reset the module so the in-memory cache is fresh per test.
  vi.resetModules();
});

describe('embeddings service', () => {
  it('embeds a single query and returns a 1536-dim Float array', async () => {
    createMock.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.01) }],
    });
    const { embedQuery } = await import('../src/services/embeddings.js');
    const v = await embedQuery('how does Raft handle leader election?');
    expect(v).toHaveLength(1536);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('returns the cached vector on a repeat call without hitting OpenAI', async () => {
    createMock.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.02) }],
    });
    const { embedQuery } = await import('../src/services/embeddings.js');
    await embedQuery('what is an SLO?');
    await embedQuery('what is an SLO?');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('embeds a batch of inputs in a single API call', async () => {
    createMock.mockResolvedValue({
      data: [
        { embedding: new Array(1536).fill(0.1) },
        { embedding: new Array(1536).fill(0.2) },
        { embedding: new Array(1536).fill(0.3) },
      ],
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const vs = await embedBatch(['a', 'b', 'c']);
    expect(vs).toHaveLength(3);
    expect(vs[0][0]).toBeCloseTo(0.1);
    expect(vs[2][0]).toBeCloseTo(0.3);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('splits a large batch across multiple API calls of size 100', async () => {
    createMock.mockResolvedValue({
      data: new Array(100).fill(null).map(() => ({ embedding: new Array(1536).fill(0.5) })),
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const inputs = new Array(250).fill(0).map((_, i) => `text-${i}`);
    const vs = await embedBatch(inputs);
    expect(vs).toHaveLength(250);
    expect(createMock).toHaveBeenCalledTimes(3); // 100 + 100 + 50
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/lumora-backend && npx vitest run tests/embeddings.test.js`
Expected: FAIL with "Cannot find module '../src/services/embeddings.js'"

- [ ] **Step 3: Implement the embedding service**

Create `apps/lumora-backend/src/services/embeddings.js`:

```js
/**
 * OpenAI text embedding service for Lumora RAG.
 *
 * - Model: text-embedding-3-small (1536-dim, cosine similarity)
 * - In-memory LRU cache keyed by SHA-256 of the input string.
 *   Interview sessions repeat questions heavily; cache hit ratio is
 *   typically >70% within a single session.
 * - Batch API calls capped at 100 inputs per request (OpenAI limit).
 */
import OpenAI from 'openai';
import { createHash } from 'node:crypto';

const MODEL = 'text-embedding-3-small';
const DIM = 1536;
const BATCH_SIZE = 100;
const CACHE_MAX = 2000;

let _client = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Simple Map-based LRU. Insertion order is iteration order; we delete
// + re-set on hit to mark as most-recently-used.
const cache = new Map();
function cacheGet(k) {
  if (!cache.has(k)) return undefined;
  const v = cache.get(k);
  cache.delete(k);
  cache.set(k, v);
  return v;
}
function cacheSet(k, v) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(k, v);
}
function hash(s) {
  return createHash('sha256').update(s).digest('hex');
}

export async function embedQuery(text) {
  const key = hash(text);
  const cached = cacheGet(key);
  if (cached) return cached;
  const r = await client().embeddings.create({ model: MODEL, input: text });
  const v = r.data[0].embedding;
  if (v.length !== DIM) {
    throw new Error(`embedding dim mismatch: got ${v.length}, expected ${DIM}`);
  }
  cacheSet(key, v);
  return v;
}

export async function embedBatch(texts) {
  if (texts.length === 0) return [];
  const out = new Array(texts.length);
  const missIdxs = [];
  const missTexts = [];
  for (let i = 0; i < texts.length; i++) {
    const c = cacheGet(hash(texts[i]));
    if (c) out[i] = c;
    else { missIdxs.push(i); missTexts.push(texts[i]); }
  }
  for (let start = 0; start < missTexts.length; start += BATCH_SIZE) {
    const slice = missTexts.slice(start, start + BATCH_SIZE);
    const r = await client().embeddings.create({ model: MODEL, input: slice });
    for (let j = 0; j < slice.length; j++) {
      const v = r.data[j].embedding;
      const targetIdx = missIdxs[start + j];
      out[targetIdx] = v;
      cacheSet(hash(slice[j]), v);
    }
  }
  return out;
}

export const _internals = { MODEL, DIM, BATCH_SIZE };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/lumora-backend && npx vitest run tests/embeddings.test.js`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/embeddings.js apps/lumora-backend/tests/embeddings.test.js
git commit -m "feat(lumora): add OpenAI embedding service with LRU cache + batching"
```

---

## Task 3: Structure-aware chunker for Capra topics

**Files:**
- Create: `apps/lumora-backend/src/services/chunker.js`
- Test: `apps/lumora-backend/tests/chunker.test.js`

Topic objects in `apps/camora/src/data/capra/topics/*.js` have a stable shape: `{id, title, description, introduction, whenToUse[], keyConcepts[{term,definition}], questions[{question,answer}]}` (plus optional `visualizations`, `references`). Naive token-window chunking destroys this structure. Instead, one chunk per logical section. Long sections are split at paragraph boundaries with a soft 700-token cap.

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/chunker.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { chunkTopic, estimateTokens } from '../src/services/chunker.js';

const sampleTopic = {
  id: 'sli-slo-sla',
  title: 'SLI / SLO / SLA',
  description: 'Service Level Indicator, Objective, Agreement.',
  introduction: 'An SLI is a quantitative measure. An SLO is a target. An SLA is a contract with consequences.',
  whenToUse: [
    'Setting reliability targets for a new service',
    'Negotiating with product on launch criteria',
  ],
  keyConcepts: [
    { term: 'SLI', definition: 'A direct measurement of one aspect of service health.' },
    { term: 'SLO', definition: 'A target value for an SLI over a window.' },
  ],
  questions: [
    { question: 'What is an error budget?', answer: 'The remaining acceptable failure for the SLO window.' },
    { question: 'Who owns SLOs?', answer: 'Product + engineering jointly.' },
  ],
};

describe('chunkTopic', () => {
  it('emits one chunk per logical section', () => {
    const chunks = chunkTopic(sampleTopic, { source: 'capra-sre' });
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain('summary');
    expect(sections).toContain('whenToUse');
    expect(sections).toContain('keyConcepts');
    expect(sections.filter((s) => s.startsWith('question:'))).toHaveLength(2);
  });

  it('attaches topic + source metadata to every chunk', () => {
    const chunks = chunkTopic(sampleTopic, { source: 'capra-sre' });
    for (const c of chunks) {
      expect(c.source).toBe('capra-sre');
      expect(c.sourceKind).toBe('capra-topic');
      expect(c.topicId).toBe('sli-slo-sla');
      expect(c.topicTitle).toBe('SLI / SLO / SLA');
      expect(c.content.length).toBeGreaterThan(0);
      expect(c.tokenCount).toBeGreaterThan(0);
    }
  });

  it('produces stable contentHash for unchanged input', () => {
    const a = chunkTopic(sampleTopic, { source: 'capra-sre' });
    const b = chunkTopic(sampleTopic, { source: 'capra-sre' });
    expect(a.map((c) => c.contentHash)).toEqual(b.map((c) => c.contentHash));
  });

  it('handles a topic missing optional sections', () => {
    const t = { id: 't1', title: 'Bare', description: 'desc only' };
    const chunks = chunkTopic(t, { source: 'capra-sre' });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe('summary');
  });

  it('splits an overlong introduction into multiple summary chunks', () => {
    const big = 'An SLI is measured.\n\n'.repeat(400);
    const t = { id: 'big', title: 'Big', introduction: big };
    const chunks = chunkTopic(t, { source: 'capra-sre' });
    const summaries = chunks.filter((c) => c.section.startsWith('summary'));
    expect(summaries.length).toBeGreaterThan(1);
    for (const c of summaries) {
      expect(c.tokenCount).toBeLessThanOrEqual(750);
    }
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
  it('approximates ~4 chars per token', () => {
    expect(estimateTokens('a'.repeat(400))).toBeGreaterThan(80);
    expect(estimateTokens('a'.repeat(400))).toBeLessThan(120);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/lumora-backend && npx vitest run tests/chunker.test.js`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the chunker**

Create `apps/lumora-backend/src/services/chunker.js`:

```js
/**
 * Structure-aware chunker for Capra Prepare topics.
 *
 * Topic objects share a stable shape:
 *   { id, title, description, introduction, whenToUse[],
 *     keyConcepts[{term,definition}], questions[{question,answer}] }
 *
 * One chunk per logical section preserves citation granularity. Long
 * sections (rare — only `introduction` exceeds 700 tokens) are split at
 * paragraph boundaries with a soft cap.
 *
 * Each chunk carries source metadata so retrieval can return precise
 * citations like "SRE / SLI-SLO-SLA / keyConcepts".
 */
import { createHash } from 'node:crypto';

const MAX_TOKENS = 700;
const CHARS_PER_TOKEN = 4; // GPT-style heuristic; close enough for budgeting

export function estimateTokens(s) {
  if (!s) return 0;
  return Math.ceil(s.length / CHARS_PER_TOKEN);
}

function sha(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function makeChunk({ source, topic, section, content }) {
  const trimmed = content.trim();
  return {
    sourceKind: 'capra-topic',
    source,
    topicId: topic.id,
    topicTitle: topic.title || topic.id,
    section,
    content: trimmed,
    tokenCount: estimateTokens(trimmed),
    contentHash: sha(`${source}|${topic.id}|${section}|${trimmed}`),
  };
}

function splitParagraphs(text, max = MAX_TOKENS) {
  const paras = text.split(/\n\n+/);
  const out = [];
  let buf = [];
  let bufTok = 0;
  for (const p of paras) {
    const t = estimateTokens(p);
    if (bufTok + t > max && buf.length > 0) {
      out.push(buf.join('\n\n'));
      buf = [p];
      bufTok = t;
    } else {
      buf.push(p);
      bufTok += t;
    }
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
}

export function chunkTopic(topic, { source }) {
  const chunks = [];

  // SUMMARY — title + description + introduction. Always present.
  const summaryParts = [
    topic.title ? `# ${topic.title}` : null,
    topic.description ? topic.description : null,
    topic.introduction ? topic.introduction : null,
  ].filter(Boolean);
  const summaryText = summaryParts.join('\n\n');
  if (summaryText.trim()) {
    const parts = splitParagraphs(summaryText);
    parts.forEach((part, i) => {
      chunks.push(makeChunk({
        source,
        topic,
        section: parts.length === 1 ? 'summary' : `summary:${i}`,
        content: part,
      }));
    });
  }

  // WHEN TO USE — bulleted list, kept whole.
  if (Array.isArray(topic.whenToUse) && topic.whenToUse.length > 0) {
    const text = ['When to apply this:', ...topic.whenToUse.map((b) => `- ${b}`)].join('\n');
    chunks.push(makeChunk({ source, topic, section: 'whenToUse', content: text }));
  }

  // KEY CONCEPTS — term/definition pairs. One chunk for the whole list;
  // they're definitional and read better together.
  if (Array.isArray(topic.keyConcepts) && topic.keyConcepts.length > 0) {
    const text = topic.keyConcepts
      .map((kc) => `${kc.term}: ${kc.definition}`)
      .join('\n');
    const headed = `Key concepts for ${topic.title || topic.id}:\n${text}`;
    if (estimateTokens(headed) <= MAX_TOKENS) {
      chunks.push(makeChunk({ source, topic, section: 'keyConcepts', content: headed }));
    } else {
      const parts = splitParagraphs(text);
      parts.forEach((p, i) => {
        chunks.push(makeChunk({
          source, topic, section: `keyConcepts:${i}`,
          content: `Key concepts (${i + 1}/${parts.length}) for ${topic.title}:\n${p}`,
        }));
      });
    }
  }

  // QUESTIONS — one chunk per Q/A pair. These are the highest-value
  // grounding for an interview AI, so we keep them addressable.
  if (Array.isArray(topic.questions)) {
    topic.questions.forEach((q, i) => {
      const qText = typeof q === 'string' ? q : q.question;
      const aText = typeof q === 'string' ? '' : (q.answer || '');
      if (!qText) return;
      const body = aText ? `Q: ${qText}\nA: ${aText}` : `Q: ${qText}`;
      chunks.push(makeChunk({
        source, topic, section: `question:${i}`, content: body,
      }));
    });
  }

  return chunks;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/lumora-backend && npx vitest run tests/chunker.test.js`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/chunker.js apps/lumora-backend/tests/chunker.test.js
git commit -m "feat(lumora): structure-aware chunker for Capra topic data"
```

---

## Task 4: Topic source manifest

**Files:**
- Create: `apps/lumora-backend/scripts/topic-manifest.js`

A single source-of-truth list of which topic modules to ingest, what export to read, and what `source` slug to tag chunks with. Centralizing this keeps the indexing script declarative — adding a new topic file is one line here, not a code change in the script.

- [ ] **Step 1: Create the manifest**

Create `apps/lumora-backend/scripts/topic-manifest.js`:

```js
/**
 * Capra topic ingest manifest.
 *
 * Each entry: {
 *   file:    path relative to apps/camora/src/data/capra/topics/
 *   export:  named export holding the topic array
 *   source:  short slug stamped onto every chunk's `source` column,
 *            used in citations: "Sona referenced: capra-sre/sli-slo-sla"
 * }
 *
 * Adding a new topic file = one line here. The indexing script walks
 * this manifest and is otherwise file-agnostic.
 */
export const TOPIC_MANIFEST = [
  { file: 'sreTopics.js',             export: 'sreTopics',             source: 'capra-sre' },
  { file: 'devopsTopics.js',          export: 'devopsTopics',          source: 'capra-devops' },
  { file: 'systemDesignTopics.js',    export: 'systemDesignTopics',    source: 'capra-system-design' },
  { file: 'scalableSystemsTopics.js', export: 'scalableSystemsTopics', source: 'capra-scalable' },
  { file: 'codingTopics.js',          export: 'codingTopics',          source: 'capra-coding' },
  { file: 'codingTopicsExtra.js',     export: 'extraCodingTopics',     source: 'capra-coding' },
  { file: 'lldTopics.js',             export: 'lldTopics',             source: 'capra-lld' },
  { file: 'behavioralTopics.js',      export: 'behavioralTopics',      source: 'capra-behavioral' },
  { file: 'projectTopics.js',         export: 'projectTopics',         source: 'capra-projects' },
  { file: 'databaseTopics.js',        export: 'databaseTopics',        source: 'capra-database' },
  { file: 'sqlTopics.js',             export: 'sqlTopics',             source: 'capra-sql' },
  { file: 'concurrencyTopics.js',     export: 'concurrencyTopics',     source: 'capra-concurrency' },
  { file: 'microservicesPatterns.js', export: 'microservicesPatterns', source: 'capra-microservices' },
  { file: 'engBlogsTopics.js',        export: 'engBlogsTopics',        source: 'capra-eng-blogs' },
  { file: 'systemDesignPatterns.js',  export: 'systemDesignPatterns',  source: 'capra-system-design' },
  { file: 'systemDesignTradeoffs.js', export: 'systemDesignTradeoffs', source: 'capra-system-design' },
];
```

- [ ] **Step 2: Verify each `(file, export)` exists in the frontend**

Run:
```bash
for entry in $(node -e "import('./apps/lumora-backend/scripts/topic-manifest.js').then(m => m.TOPIC_MANIFEST.forEach(e => console.log(e.file + ':' + e.export)))"); do
  file=$(echo "$entry" | cut -d: -f1)
  exp=$(echo "$entry" | cut -d: -f2)
  if ! grep -q "export const $exp" "apps/camora/src/data/capra/topics/$file" 2>/dev/null; then
    echo "MISSING: $file does not export $exp"
  fi
done
```

Expected: no `MISSING` lines. If any appear, fix the manifest entry to match the actual export name (some files use `extra*` prefixes — check with `grep -n "^export const" apps/camora/src/data/capra/topics/<file>`).

- [ ] **Step 3: Commit**

```bash
git add apps/lumora-backend/scripts/topic-manifest.js
git commit -m "feat(lumora): add Capra topic ingest manifest"
```

---

## Task 5: Capra KB indexing script

**Files:**
- Create: `apps/lumora-backend/scripts/index-capra-kb.js`

Walks the manifest, dynamically imports each topic file from the frontend, chunks every topic, embeds in batches, and upserts into `lumora_kb_chunks`. Idempotent: the `(source, topic_id, section)` UNIQUE constraint + `content_hash` short-circuit re-embedding when content hasn't changed.

- [ ] **Step 1: Create the script**

Create `apps/lumora-backend/scripts/index-capra-kb.js`:

```js
#!/usr/bin/env node
/**
 * Index Capra Prepare topics into lumora_kb_chunks.
 *
 * Usage:
 *   node apps/lumora-backend/scripts/index-capra-kb.js
 *   node apps/lumora-backend/scripts/index-capra-kb.js --source capra-sre
 *   node apps/lumora-backend/scripts/index-capra-kb.js --dry-run
 *
 * Idempotent. Skips chunks whose content_hash is unchanged in the DB,
 * so re-running after a topic edit only re-embeds what changed.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { query } from '../src/lib/shared-db.js';
import { embedBatch } from '../src/services/embeddings.js';
import { chunkTopic } from '../src/services/chunker.js';
import { TOPIC_MANIFEST } from './topic-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOPICS_DIR = path.resolve(
  __dirname,
  '../../../apps/camora/src/data/capra/topics',
);

function parseArgs(argv) {
  const args = { source: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function loadTopicsForEntry(entry) {
  const abs = path.join(TOPICS_DIR, entry.file);
  const url = pathToFileURL(abs).href;
  const mod = await import(url);
  const arr = mod[entry.export];
  if (!Array.isArray(arr)) {
    throw new Error(`${entry.file}: export ${entry.export} is not an array`);
  }
  return arr;
}

async function getExistingHashes(source) {
  const r = await query(
    'SELECT topic_id, section, content_hash FROM lumora_kb_chunks WHERE source = $1',
    [source],
  );
  const map = new Map();
  for (const row of r.rows) {
    map.set(`${row.topic_id}|${row.section}`, row.content_hash);
  }
  return map;
}

async function upsertChunk(c, embedding) {
  await query(
    `INSERT INTO lumora_kb_chunks
       (source_kind, source, topic_id, topic_title, section,
        content, token_count, embedding, metadata, content_hash, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9::jsonb, $10, NOW())
     ON CONFLICT (source, topic_id, section) DO UPDATE SET
       topic_title = EXCLUDED.topic_title,
       content = EXCLUDED.content,
       token_count = EXCLUDED.token_count,
       embedding = EXCLUDED.embedding,
       metadata = EXCLUDED.metadata,
       content_hash = EXCLUDED.content_hash,
       updated_at = NOW()`,
    [
      c.sourceKind, c.source, c.topicId, c.topicTitle, c.section,
      c.content, c.tokenCount,
      `[${embedding.join(',')}]`,
      JSON.stringify({}),
      c.contentHash,
    ],
  );
}

async function indexEntry(entry, { dryRun }) {
  const topics = await loadTopicsForEntry(entry);
  const existing = await getExistingHashes(entry.source);
  const allChunks = [];
  for (const t of topics) {
    for (const c of chunkTopic(t, { source: entry.source })) {
      allChunks.push(c);
    }
  }

  const newOrChanged = allChunks.filter((c) => {
    const k = `${c.topicId}|${c.section}`;
    return existing.get(k) !== c.contentHash;
  });

  console.log(
    `[${entry.source}] topics=${topics.length} chunks=${allChunks.length} ` +
    `new/changed=${newOrChanged.length} unchanged=${allChunks.length - newOrChanged.length}`,
  );

  if (dryRun || newOrChanged.length === 0) return { written: 0 };

  const BATCH = 100;
  let written = 0;
  for (let i = 0; i < newOrChanged.length; i += BATCH) {
    const slice = newOrChanged.slice(i, i + BATCH);
    const vecs = await embedBatch(slice.map((c) => c.content));
    for (let j = 0; j < slice.length; j++) {
      await upsertChunk(slice[j], vecs[j]);
      written++;
    }
    process.stdout.write(`  embedded ${written}/${newOrChanged.length}\r`);
  }
  console.log(`\n  upserted ${written} chunks for ${entry.source}`);
  return { written };
}

async function main() {
  const { source, dryRun } = parseArgs(process.argv);
  const entries = source
    ? TOPIC_MANIFEST.filter((e) => e.source === source)
    : TOPIC_MANIFEST;
  if (entries.length === 0) {
    console.error(`No manifest entries match source=${source}`);
    process.exit(2);
  }
  let total = 0;
  for (const entry of entries) {
    const r = await indexEntry(entry, { dryRun });
    total += r.written;
  }
  console.log(`Done. Total chunks written: ${total}${dryRun ? ' (dry run)' : ''}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('index-capra-kb failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run a dry run to verify chunk counts**

Run: `cd apps/lumora-backend && node scripts/index-capra-kb.js --dry-run`
Expected: per-source lines like `[capra-sre] topics=N chunks=M new/changed=M unchanged=0`. The first run shows `new/changed = chunks` (everything is new). Total chunks across all sources should land in the low five-figures (estimated 3,000-15,000 depending on file counts).

If any manifest entry fails with "export X is not an array", fix the manifest. If a file errors on import (unexpected ESM/JSX), that file isn't pure data — note it and exclude from manifest for now.

- [ ] **Step 3: Run a real index for one source first to verify embedding cost / time**

Run: `cd apps/lumora-backend && node scripts/index-capra-kb.js --source capra-sre`
Expected: writes hundreds of rows to `lumora_kb_chunks`. Expect ~5-30s depending on chunk count. Note the OpenAI cost (visible on the OpenAI dashboard) — should be well under $0.10.

Sanity check the DB:
```bash
psql "$DATABASE_URL" -c "SELECT source, COUNT(*) FROM lumora_kb_chunks GROUP BY source ORDER BY 1"
```
Expected: at least one row, `capra-sre`, with a positive count.

- [ ] **Step 4: Run a re-index of the same source — should be a no-op**

Run: `cd apps/lumora-backend && node scripts/index-capra-kb.js --source capra-sre`
Expected: `new/changed=0 unchanged=N`. Total written: 0. Confirms the content_hash short-circuit works.

- [ ] **Step 5: Run the full index**

Run: `cd apps/lumora-backend && node scripts/index-capra-kb.js`
Expected: completes across all manifest entries. Total chunks written reported at the end.

```bash
psql "$DATABASE_URL" -c "SELECT source, COUNT(*) FROM lumora_kb_chunks GROUP BY source ORDER BY 2 DESC"
```
Verify each `source` from the manifest has rows.

- [ ] **Step 6: Commit**

```bash
git add apps/lumora-backend/scripts/index-capra-kb.js
git commit -m "feat(lumora): script to index Capra topics into pgvector KB"
```

---

## Task 6: Per-user Prep Kit indexer

**Files:**
- Create: `apps/lumora-backend/src/services/userDocIndexer.js`
- Test: `apps/lumora-backend/tests/userDocIndexer.test.js`

Indexes the user's Prep Kit blob (JD, resume, cover letter, uploaded text per active company) into `lumora_user_doc_chunks`. Replace-and-rewrite semantics: every save deletes the user's existing rows for that prep_state_version and writes a new set. Simple, no diffing.

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/userDocIndexer.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const embedBatchMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedBatch: embedBatchMock }));

beforeEach(() => {
  queryMock.mockReset();
  embedBatchMock.mockReset();
});

describe('indexUserPrepDocs', () => {
  it('returns { skipped: true } when prep blob has no content', async () => {
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');
    const r = await indexUserPrepDocs({ userId: 1, prepData: { activeCompany: 'NVIDIA', data: { NVIDIA: { jd: '', resume: '' } } } });
    expect(r.skipped).toBe(true);
    expect(embedBatchMock).not.toHaveBeenCalled();
  });

  it('chunks JD, resume, cover_letter and inserts one row each', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    embedBatchMock.mockResolvedValue([
      new Array(1536).fill(0.1),
      new Array(1536).fill(0.2),
      new Array(1536).fill(0.3),
    ]);
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');
    const r = await indexUserPrepDocs({
      userId: 42,
      prepData: {
        activeCompany: 'NVIDIA',
        data: {
          NVIDIA: {
            jd: 'Senior SRE for Isaac robotics. Kubernetes, Go, observability.',
            resume: 'CI/CD owner at Trackonomy. GitLab pipelines at OSDU.',
            coverLetter: 'I want to work on Isaac because of robotic simulation.',
          },
        },
      },
    });

    expect(r.skipped).toBeFalsy();
    expect(r.written).toBe(3);
    // First call is DELETE, second is embed call (mocked), then 3 INSERTs.
    const deleteCall = queryMock.mock.calls.find((c) => c[0].startsWith('DELETE'));
    expect(deleteCall).toBeDefined();
    expect(deleteCall[1][0]).toBe(42);
    const insertCalls = queryMock.mock.calls.filter((c) => c[0].startsWith('INSERT'));
    expect(insertCalls).toHaveLength(3);
    const kinds = insertCalls.map((c) => c[1][2]);
    expect(kinds).toEqual(expect.arrayContaining(['jd', 'resume', 'cover_letter']));
  });

  it('splits a long JD into multiple chunks', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    embedBatchMock.mockImplementation((arr) =>
      Promise.resolve(arr.map(() => new Array(1536).fill(0.5))),
    );
    const longJd = 'Responsibilities:\n\n' + 'Build production systems. '.repeat(800);
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');
    const r = await indexUserPrepDocs({
      userId: 7,
      prepData: { activeCompany: 'X', data: { X: { jd: longJd, resume: 'short resume' } } },
    });
    const insertCalls = queryMock.mock.calls.filter((c) => c[0].startsWith('INSERT'));
    const jdInserts = insertCalls.filter((c) => c[1][2] === 'jd');
    expect(jdInserts.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/lumora-backend && npx vitest run tests/userDocIndexer.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the indexer**

Create `apps/lumora-backend/src/services/userDocIndexer.js`:

```js
/**
 * Index a user's Lumora Prep Kit blob into lumora_user_doc_chunks.
 *
 * The Prep panel persists JSON shaped roughly:
 *   { activeCompany: 'NVIDIA',
 *     data: { NVIDIA: { jd, resume, coverLetter, jdFile, resumeFile, ... } } }
 *
 * On every save we replace-and-rewrite the user's chunks. Simple and
 * cheap (typical Prep blob is <5KB → <10 chunks; embedding cost is
 * fractions of a cent per save). prep_state_version is a monotonic
 * counter we'll persist in lumora_prep_state via a follow-up; for now
 * we use Date.now().
 */
import { query } from '../lib/shared-db.js';
import { embedBatch } from './embeddings.js';
import { estimateTokens } from './chunker.js';

const MAX_TOKENS_PER_CHUNK = 700;

function splitForUserDoc(text, max = MAX_TOKENS_PER_CHUNK) {
  if (!text) return [];
  if (estimateTokens(text) <= max) return [text];
  const paras = text.split(/\n\n+/);
  const out = [];
  let buf = [];
  let bufTok = 0;
  for (const p of paras) {
    const t = estimateTokens(p);
    if (bufTok + t > max && buf.length > 0) {
      out.push(buf.join('\n\n'));
      buf = [p];
      bufTok = t;
    } else {
      buf.push(p);
      bufTok += t;
    }
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
}

function buildDocChunks(prepData) {
  const company = prepData.activeCompany;
  if (!company) return [];
  const doc = prepData.data?.[company];
  if (!doc) return [];

  const chunks = [];
  const fields = [
    { key: 'jd',          kind: 'jd',          section: 'body' },
    { key: 'resume',      kind: 'resume',      section: 'body' },
    { key: 'coverLetter', kind: 'cover_letter', section: 'body' },
  ];
  for (const f of fields) {
    const val = doc[f.key];
    if (typeof val !== 'string' || !val.trim()) continue;
    const parts = splitForUserDoc(val);
    parts.forEach((p, i) => {
      chunks.push({
        companyKey: company,
        kind: f.kind,
        section: parts.length === 1 ? f.section : `${f.section}:${i}`,
        content: p,
        tokenCount: estimateTokens(p),
        metadata: { fileName: doc[`${f.key}File`] || null },
      });
    });
  }
  return chunks;
}

export async function indexUserPrepDocs({ userId, prepData }) {
  if (!userId || !prepData || typeof prepData !== 'object') {
    return { skipped: true };
  }
  const chunks = buildDocChunks(prepData);
  if (chunks.length === 0) return { skipped: true };

  const version = Date.now();
  await query(
    'DELETE FROM lumora_user_doc_chunks WHERE user_id = $1',
    [userId],
  );
  const vecs = await embedBatch(chunks.map((c) => c.content));
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    await query(
      `INSERT INTO lumora_user_doc_chunks
         (user_id, company_key, doc_kind, section, content, token_count,
          embedding, metadata, prep_state_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8::jsonb, $9)`,
      [
        userId, c.companyKey, c.kind, c.section, c.content, c.tokenCount,
        `[${vecs[i].join(',')}]`,
        JSON.stringify(c.metadata),
        version,
      ],
    );
  }
  return { written: chunks.length, version };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/lumora-backend && npx vitest run tests/userDocIndexer.test.js`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/userDocIndexer.js apps/lumora-backend/tests/userDocIndexer.test.js
git commit -m "feat(lumora): per-user Prep Kit document indexer"
```

---

## Task 7: Wire user doc indexer into Prep save

**Files:**
- Modify: `apps/lumora-backend/src/routes/prep.js:74-79`

The Prep PUT route already has a fire-and-forget warm-up block for company context. We extend that block to also kick off `indexUserPrepDocs`. Errors are swallowed — the user's save must succeed even if indexing fails.

- [ ] **Step 1: Read the current PUT handler**

Run: `sed -n '49,86p' apps/lumora-backend/src/routes/prep.js`
Expected: see the existing `try { const detected = detectCompanyFromPrepData(data); if (detected) refreshCompanyContext(detected).catch(() => {}); } catch {}` block.

- [ ] **Step 2: Add the import at the top of the file**

Edit `apps/lumora-backend/src/routes/prep.js`. After the existing imports, add:

```js
import { indexUserPrepDocs } from '../services/userDocIndexer.js';
```

- [ ] **Step 3: Add the indexer call inside the existing fire-and-forget block**

In `apps/lumora-backend/src/routes/prep.js`, find:

```js
    try {
      const detected = detectCompanyFromPrepData(data);
      if (detected) {
        refreshCompanyContext(detected).catch(() => {});
      }
    } catch {}
```

Replace with:

```js
    try {
      const detected = detectCompanyFromPrepData(data);
      if (detected) {
        refreshCompanyContext(detected).catch(() => {});
      }
      // Index the Prep Kit blob into pgvector so retrieval has the
      // current JD/resume to ground Sona's answers. Fire-and-forget;
      // a failure here must not block the user's save.
      indexUserPrepDocs({ userId: req.user.id, prepData: data })
        .catch((err) => console.warn('[prep] user-doc index failed:', err.message));
    } catch {}
```

- [ ] **Step 4: Manual smoke — save Prep, verify rows appear**

Run the backend (`pnpm dev:lumora`), open the Prep panel in the frontend, paste a JD + resume, save. Then:

```bash
psql "$DATABASE_URL" -c "SELECT user_id, doc_kind, section, token_count FROM lumora_user_doc_chunks ORDER BY user_id, doc_kind"
```

Expected: at least one row per non-empty field (`jd`, `resume`, `cover_letter`).

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/routes/prep.js
git commit -m "feat(lumora): index user Prep Kit docs on save"
```

---

## Task 8: Retrieval service

**Files:**
- Create: `apps/lumora-backend/src/services/retrieval.js`
- Test: `apps/lumora-backend/tests/retrieval.test.js`

Cosine ANN against both tables. Per-user namespace strictly enforced. Race against a 250ms timeout — if retrieval loses, return empty so Sona answers without grounding rather than blocks.

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/retrieval.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const embedQueryMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedQuery: embedQueryMock }));

beforeEach(() => {
  queryMock.mockReset();
  embedQueryMock.mockReset();
});

describe('retrieve', () => {
  it('returns chunks from KB and user tables, with source/topic metadata', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) => {
      if (sql.includes('lumora_kb_chunks')) {
        return Promise.resolve({
          rows: [
            { id: 'k1', source: 'capra-sre', topic_id: 'sli-slo-sla',
              topic_title: 'SLI/SLO/SLA', section: 'summary',
              content: 'An SLO is a target.', distance: 0.12 },
          ],
        });
      }
      return Promise.resolve({
        rows: [
          { id: 'u1', doc_kind: 'jd', section: 'body',
            content: 'JD asks for SRE experience.', distance: 0.18 },
        ],
      });
    });
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'what is an SLO?', userId: 42 });
    expect(r.chunks.length).toBe(2);
    expect(r.chunks.find((c) => c.tier === 'kb').source).toBe('capra-sre');
    expect(r.chunks.find((c) => c.tier === 'user').docKind).toBe('jd');
    expect(r.timedOut).toBe(false);
  });

  it('returns empty chunks (not throws) when retrieval exceeds timeout', async () => {
    embedQueryMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new Array(1536).fill(0)), 500)),
    );
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 1, timeoutMs: 50 });
    expect(r.chunks).toEqual([]);
    expect(r.timedOut).toBe(true);
  });

  it('skips user-doc search when userId is missing', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockResolvedValue({ rows: [] });
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    const userTableCalls = queryMock.mock.calls.filter((c) =>
      c[0].includes('lumora_user_doc_chunks'),
    );
    expect(userTableCalls.length).toBe(0);
  });

  it('always filters user-doc search by user_id (namespace isolation)', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockResolvedValue({ rows: [] });
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: 7 });
    const userCall = queryMock.mock.calls.find((c) =>
      c[0].includes('lumora_user_doc_chunks'),
    );
    expect(userCall[0]).toMatch(/WHERE user_id\s*=\s*\$1/);
    expect(userCall[1][0]).toBe(7);
  });
});

describe('formatRetrievedContext', () => {
  it('produces a labeled, source-attributed string', async () => {
    const { formatRetrievedContext } = await import('../src/services/retrieval.js');
    const out = formatRetrievedContext([
      { tier: 'kb', source: 'capra-sre', topicTitle: 'SLI/SLO/SLA',
        section: 'summary', content: 'An SLO is a target.' },
      { tier: 'user', docKind: 'jd', content: 'JD asks for SRE.' },
    ]);
    expect(out).toContain('[KB capra-sre / SLI/SLO/SLA / summary]');
    expect(out).toContain('An SLO is a target.');
    expect(out).toContain('[USER jd]');
    expect(out).toContain('JD asks for SRE.');
  });

  it('returns empty string for no chunks', async () => {
    const { formatRetrievedContext } = await import('../src/services/retrieval.js');
    expect(formatRetrievedContext([])).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/lumora-backend && npx vitest run tests/retrieval.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the retrieval service**

Create `apps/lumora-backend/src/services/retrieval.js`:

```js
/**
 * RAG retrieval — hits both lumora_kb_chunks (global Capra KB) and
 * lumora_user_doc_chunks (per-user Prep Kit).
 *
 * Hard latency budget: races against `timeoutMs` (default 250ms). If
 * retrieval loses the race, returns `{chunks: [], timedOut: true}` so
 * inference proceeds without grounding rather than blocking. Sona
 * answering ungrounded > Sona stuck behind a slow vector query.
 *
 * Per-user namespace is enforced at the SQL layer — every user-doc
 * query has WHERE user_id = $1. Namespace bugs are tested.
 */
import { query } from '../lib/shared-db.js';
import { embedQuery } from './embeddings.js';

const DEFAULT_TIMEOUT_MS = 250;
const KB_TOP_K = 6;
const USER_TOP_K = 4;
const MAX_CHUNK_CHARS = 1200; // hard cap injected into prompt per chunk

function asVecLiteral(v) {
  return `[${v.join(',')}]`;
}

async function searchKb(vec, k) {
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            embedding <=> $1::vector AS distance
       FROM lumora_kb_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [asVecLiteral(vec), k],
  );
  return r.rows.map((row) => ({
    tier: 'kb',
    id: row.id,
    source: row.source,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    section: row.section,
    content: row.content.slice(0, MAX_CHUNK_CHARS),
    distance: Number(row.distance),
  }));
}

async function searchUserDocs(userId, vec, k) {
  const r = await query(
    `SELECT id, doc_kind, section, content,
            embedding <=> $2::vector AS distance
       FROM lumora_user_doc_chunks
       WHERE user_id = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
    [userId, asVecLiteral(vec), k],
  );
  return r.rows.map((row) => ({
    tier: 'user',
    id: row.id,
    docKind: row.doc_kind,
    section: row.section,
    content: row.content.slice(0, MAX_CHUNK_CHARS),
    distance: Number(row.distance),
  }));
}

/**
 * @param {object}  opts
 * @param {string}  opts.question
 * @param {number?} opts.userId
 * @param {number}  [opts.timeoutMs=250]
 * @returns {Promise<{chunks, timedOut, latencyMs}>}
 */
export async function retrieve(opts) {
  const { question, userId, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const t0 = performance.now();

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('__TIMEOUT__'), timeoutMs);
  });

  const work = (async () => {
    const vec = await embedQuery(question);
    const promises = [searchKb(vec, KB_TOP_K)];
    if (userId) promises.push(searchUserDocs(userId, vec, USER_TOP_K));
    const results = await Promise.all(promises);
    return results.flat();
  })();

  try {
    const winner = await Promise.race([work, timeout]);
    if (winner === '__TIMEOUT__') {
      return { chunks: [], timedOut: true, latencyMs: Math.round(performance.now() - t0) };
    }
    return { chunks: winner, timedOut: false, latencyMs: Math.round(performance.now() - t0) };
  } finally {
    clearTimeout(timer);
  }
}

export function formatRetrievedContext(chunks) {
  if (!chunks || chunks.length === 0) return '';
  const lines = ['[GROUNDING — verbatim source excerpts; cite by tag if relevant]'];
  for (const c of chunks) {
    if (c.tier === 'kb') {
      lines.push(`[KB ${c.source} / ${c.topicTitle} / ${c.section}]`);
    } else {
      lines.push(`[USER ${c.docKind}${c.section ? ' / ' + c.section : ''}]`);
    }
    lines.push(c.content);
    lines.push('');
  }
  return lines.join('\n').trim();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/lumora-backend && npx vitest run tests/retrieval.test.js`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/retrieval.js apps/lumora-backend/tests/retrieval.test.js
git commit -m "feat(lumora): pgvector retrieval service with timeout race"
```

---

## Task 9: Inject retrieved context into the prompt

**Files:**
- Modify: `apps/lumora-backend/src/services/claude.js:377-410`

Add a new option `retrievedContext` to `streamResponse`. When present, it is prepended to the resolved `systemContext` so the existing prompt assembly sees it as part of the JD/resume context. This is the cheapest integration — no new prompt section, no cache-control re-architecture in v1.

- [ ] **Step 1: Read the current option-destructure block**

Run: `sed -n '377,410p' apps/lumora-backend/src/services/claude.js`
Expected: see the destructure of options including `systemContext = null`, and the line `const resume = systemContext || resumeContext || getDefaultResumeContext();`.

- [ ] **Step 2: Add `retrievedContext` to the destructure**

Edit `apps/lumora-backend/src/services/claude.js`. Find the destructure block:

```js
  const {
    useSearch = false,
    resumeContext = null,
    technicalContext = null,
    systemContext = null,
    detailLevel = null,
    plan = 'free',
```

Add `retrievedContext = null,` immediately after `systemContext = null,`:

```js
  const {
    useSearch = false,
    resumeContext = null,
    technicalContext = null,
    systemContext = null,
    retrievedContext = null,
    detailLevel = null,
    plan = 'free',
```

- [ ] **Step 3: Prepend retrievedContext to systemContext when present**

In the same file, find the line:

```js
  const resume = systemContext || resumeContext || getDefaultResumeContext();
```

Replace with:

```js
  // Retrieved grounding (Capra KB + user Prep Kit chunks) is prepended
  // to the system context so the existing prompt assembly treats it
  // as part of the JD/resume context bundle. Empty string when retrieval
  // returned nothing or timed out.
  const groundedContext = retrievedContext
    ? `${retrievedContext}\n\n${systemContext || ''}`.trim()
    : systemContext;
  const resume = groundedContext || resumeContext || getDefaultResumeContext();
```

- [ ] **Step 4: Update the JSDoc above streamResponse**

Find the JSDoc block (above `export async function* streamResponse`). Add this line under the `options` block:

```js
 * @param {string}   [options.retrievedContext] Pre-formatted grounding string from retrieval.js
```

- [ ] **Step 5: Write an integration test**

Create `apps/lumora-backend/tests/inference.integration.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub Anthropic so streamResponse doesn't try to call the API.
const streamMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: streamMock },
  })),
}));

beforeEach(() => {
  streamMock.mockReset();
  // Capture the system prompt + user message and yield a tiny stream.
  streamMock.mockImplementation((args) => {
    return {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { id: 'm1' } };
        yield { type: 'content_block_delta', delta: { text: 'ok' } };
        yield { type: 'message_stop' };
      },
      _capturedArgs: args,
    };
  });
});

describe('streamResponse with retrievedContext', () => {
  it('passes the retrievedContext through and includes it in the assembled prompt', async () => {
    const { streamResponse } = await import('../src/services/claude.js');
    const gen = streamResponse('what is an SLO?', [], {
      systemContext: 'JD: SRE role.',
      retrievedContext: '[KB capra-sre / SLI/SLO/SLA / summary]\nAn SLO is a target.',
    });
    // Drain so the call happens.
    for await (const _ of gen) { /* consume */ }
    const args = streamMock.mock.calls[0][0];
    const sys = Array.isArray(args.system) ? args.system[0].text : args.system;
    expect(sys).toContain('[KB capra-sre / SLI/SLO/SLA / summary]');
    expect(sys).toContain('An SLO is a target.');
    expect(sys).toContain('JD: SRE role.');
  });

  it('falls back to systemContext when retrievedContext is null', async () => {
    const { streamResponse } = await import('../src/services/claude.js');
    const gen = streamResponse('q', [], {
      systemContext: 'JD only.',
      retrievedContext: null,
    });
    for await (const _ of gen) { /* consume */ }
    const args = streamMock.mock.calls[0][0];
    const sys = Array.isArray(args.system) ? args.system[0].text : args.system;
    expect(sys).toContain('JD only.');
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/lumora-backend && npx vitest run tests/inference.integration.test.js`
Expected: PASS. If a different mock shape is required (`streamResponse` may use a function form rather than `messages.stream`), inspect `claude.js` and adjust the mock — the assertion to keep is "the retrieved context appears in the assembled system prompt."

- [ ] **Step 7: Commit**

```bash
git add apps/lumora-backend/src/services/claude.js apps/lumora-backend/tests/inference.integration.test.js
git commit -m "feat(lumora): wire retrievedContext option into streamResponse"
```

---

## Task 10: Call retrieval from the inference route

**Files:**
- Modify: `apps/lumora-backend/src/routes/inference.js:224-300`

The streaming inference handler builds an `options` bundle and passes it to `streamResponse`. We add a `retrieve()` call before the streamResponse invocation and pass its result as `retrievedContext`. The 250ms timeout inside `retrieve()` guarantees we never block the user.

- [ ] **Step 1: Read the streaming handler**

Run: `sed -n '224,310p' apps/lumora-backend/src/routes/inference.js`
Expected: see the destructure of `req.body`, the user lookup, and the call to `streamResponse(question, history, { ... })`.

- [ ] **Step 2: Add the import at the top of inference.js**

Edit `apps/lumora-backend/src/routes/inference.js`. After the existing imports, add:

```js
import { retrieve, formatRetrievedContext } from '../services/retrieval.js';
```

- [ ] **Step 3: Call retrieve() before streamResponse and pass the result**

Find the streamResponse call site in the streaming handler (around line 300). Locate the options object that's passed in. Immediately before that call, add:

```js
    // Tier 1 + 2 grounding — Capra KB + this user's Prep Kit. Hard
    // 250ms timeout inside retrieve(); if it loses, retrieved is empty
    // and Sona answers ungrounded rather than blocked.
    const retrieved = await retrieve({
      question,
      userId: user?.id || null,
      timeoutMs: 250,
    });
    const retrievedContext = formatRetrievedContext(retrieved.chunks);
    if (retrieved.timedOut) {
      console.warn(`[inference] retrieval timed out after ${retrieved.latencyMs}ms`);
    }
```

Then in the options object passed to `streamResponse`, add the `retrievedContext` field. For example, the existing call looks roughly like:

```js
const stream = streamResponse(question, history, {
  useSearch,
  systemContext,
  resumeContext: user.resume_text || null,
  technicalContext: null,
  detailLevel,
  plan,
  cloudProvider,
  signal: req.signal,
});
```

Add `retrievedContext,` to that object:

```js
const stream = streamResponse(question, history, {
  useSearch,
  systemContext,
  retrievedContext,
  resumeContext: user.resume_text || null,
  technicalContext: null,
  detailLevel,
  plan,
  cloudProvider,
  signal: req.signal,
});
```

Repeat the same change for the non-streaming POST handler around line 116 (it also calls `streamResponse` or its non-streaming sibling and accepts `systemContext`).

- [ ] **Step 4: Emit a citation event before/with the stream**

Still in the streaming handler, immediately after the retrieve call and before the for-await over the stream, write an SSE event with the chunk metadata:

```js
    // Emit citation metadata once, up front, so the UI can render
    // "Sources used" while the answer is still streaming.
    if (retrieved.chunks.length > 0) {
      const citations = retrieved.chunks.map((c) => ({
        tier: c.tier,
        source: c.source || null,
        topicId: c.topicId || null,
        topicTitle: c.topicTitle || null,
        section: c.section || null,
        docKind: c.docKind || null,
        distance: c.distance,
      }));
      res.write(`event: citations\ndata: ${JSON.stringify(citations)}\n\n`);
    }
```

If the route uses a custom event-writing helper, use that instead of raw `res.write`. Match the existing SSE conventions in this file.

- [ ] **Step 5: Manual end-to-end smoke**

Start the backend (`pnpm dev:lumora`). Save a Prep Kit blob with a NVIDIA Isaac JD + a resume. Then with a tool like `curl -N` or via the frontend, ask Sona: "What's an SLO and how would you set one for an Isaac robotics service?"

Expected:
- Server log shows a retrieval latency line (`[inference] retrieval ...ms`).
- Stream emits a `citations` event listing chunk metadata before the answer text begins.
- Answer text references concrete content from the SRE topic (SLI/SLO/SLA) and from the user's JD.

If retrieval is timing out: bump `timeoutMs` to 500 temporarily, log `retrieved.latencyMs`, and check if it's the embedding call (cold OpenAI) or the SQL query that's slow. The HNSW index should keep the SQL portion under 30ms.

- [ ] **Step 6: Commit**

```bash
git add apps/lumora-backend/src/routes/inference.js
git commit -m "feat(lumora): retrieve + inject grounding before Sona stream; emit citations"
```

---

## Task 11: Verify nothing regressed and full test suite passes

**Files:** none — verification only.

- [ ] **Step 1: Run the full lumora-backend test suite**

Run: `cd apps/lumora-backend && npx vitest run`
Expected: all tests green. New test files: `embeddings.test.js`, `chunker.test.js`, `userDocIndexer.test.js`, `retrieval.test.js`, `inference.integration.test.js`.

If any pre-existing test fails, investigate — RAG additions should be additive.

- [ ] **Step 2: Verify the frontend still builds (per "Test Before Push" rule)**

Run: `cd apps/camora && npx vite build`
Expected: build succeeds. No frontend changes were made in Plan A; this is just regression insurance for shared types.

- [ ] **Step 3: Verify the Capra KB has rows for every manifest source**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT source, COUNT(*) AS chunks FROM lumora_kb_chunks GROUP BY source ORDER BY 1"
```
Expected: one row per `source` slug from `topic-manifest.js`. No source missing.

- [ ] **Step 4: Manual: run a Lumora answer and confirm citations appear in the SSE stream**

Use the Lumora live page in the browser DevTools Network tab to watch the SSE stream for the inference call. Confirm a `citations` event arrives before the first `delta` event.

- [ ] **Step 5: Final commit (if any cleanup) and push**

If everything is green and no edits remain, no commit needed. Otherwise:

```bash
git status
git add <any straggling files>
git commit -m "chore(lumora): RAG foundation cleanup"
git pull --rebase origin main
git push origin main
```

(Per the user's "Always Push" feedback rule, push after Plan A is verified. Per "Approve Changes," confirm with the user before pushing.)

---

## Roadmap (separate plans to write next)

**Plan B — Retrieval Quality**
- Hybrid retrieval: Postgres `tsvector` BM25 column on both chunk tables + Reciprocal Rank Fusion of vector + BM25.
- Cohere `rerank-3` cross-encoder on top-50 → top-8 (env-gated; skipped if no `COHERE_API_KEY`).
- Contextual chunking: Haiku generates a 50-token "this chunk is from X about Y" preamble at index time, prepended to chunk content before embedding (Anthropic Contextual Retrieval, Sept 2024).
- HyDE query rewrite: Haiku generates a hypothetical answer; embed THAT for retrieval to handle vague questions ("scale this", "tell me about X").
- Session-warm prefetch: on Prep save or session start, prefetch a top-30 chunk "kit" against JD+resume keywords and inject it INSIDE the cached system prompt prefix. Per-question retrieval becomes a thin keyword filter against the warm kit (~5ms instead of ~150ms).

**Plan C — Live Web Tier**
- Derive a watchlist of canonical URLs from the JD: company eng blog, listed-stack official docs, GitHub orgs.
- Crawler: fetch + extract text + chunk + embed into `lumora_kb_chunks` with `source_kind = 'web-watchlist'` and `metadata.url`.
- Weekly refresh job (cron via Railway scheduler).
- Confidence-gated fallback: if max retrieval score < threshold, fire the existing `useSearch` web search at query time (current behavior, now smarter).

**Plan D — Eval & Observability**
- 50-pair eval set: (question, expected_source/topic_id) handcrafted from the topic data.
- Metrics: recall@4, recall@8, MRR. Run on every retrieval-touching commit.
- `lumora_retrieval_logs` table: query, top-8 chunk IDs, scores, latency, timeout flag — for offline tuning.
- Latency dashboard wired to the existing usage_logs surface.

---

## Self-Review

**Spec coverage:** The user's request was "Prepare first → Lumora documents → internet org docs/blogs/journals supporting JD/resume." Plan A covers tiers 1 and 2 in full. Tier 3 is intentionally deferred to Plan C and noted in scope so the engineer doesn't get surprised. The "world class" upgrades (hybrid, reranker, contextual chunking, HyDE) are queued in Plan B with concrete techniques, not vague gestures.

**Placeholder scan:** No "TBD", no "add appropriate error handling", no "similar to Task N." Every code step is complete.

**Type consistency:** Chunk shape is consistent across chunker.js (`{sourceKind, source, topicId, topicTitle, section, content, tokenCount, contentHash}`), the indexing script's INSERT params, and retrieval.js's row mapping. User-doc chunks consistently use `(userId, companyKey, kind, section, ...)`. The `retrievedContext` option name matches everywhere it's used (chunker → retrieval → claude.js → inference.js).

**One known weak spot:** Task 9's prompt-cache positioning is naive in v1 — prepending retrieved chunks to the cached `systemContext` will invalidate the Anthropic prompt cache on every question (since the retrieved content varies). Plan B's session-warm prefetch fixes this. For Plan A, accept the warm-cache penalty as a known v1 tradeoff; it's still net-positive because grounded answers > cached-but-ungrounded answers.
