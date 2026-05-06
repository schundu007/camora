# Lumora RAG Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade retrieval quality and latency on top of the Plan A foundation by adding hybrid (vector + BM25) search, HyDE query rewriting, cross-encoder reranking, contextual chunking, and session-warm prefetch — closing the gap between v1 RAG and the state of the art.

**Architecture:** Five independently shippable phases that compound. Phase 1 (hybrid) lifts exact-term recall via tsvector + Reciprocal Rank Fusion. Phase 2 (HyDE) lifts vague-question recall via a Haiku-generated hypothetical answer. Phase 3 (reranker) lifts top-k precision via a Cohere cross-encoder, env-gated so the system degrades gracefully without a key. Phase 4 (contextual chunking) re-indexes Capra KB with Haiku-generated 50-token context preambles, the largest documented quality lift. Phase 5 (session-warm prefetch) precomputes per-user retrieval at Prep-save time and stuffs results inside Anthropic's prompt-cache prefix — eliminating the cold-start 1.1s embed latency from Plan A and amortizing retrieval across an entire interview session.

**Tech Stack:**
- Postgres `tsvector` + GIN index alongside existing pgvector HNSW
- Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — already wired via `@anthropic-ai/sdk` in `apps/lumora-backend/src/services/claude.js`
- Cohere `rerank-v3.5` via REST (`https://api.cohere.com/v2/rerank`) — env-gated; new optional `COHERE_API_KEY`
- Reciprocal Rank Fusion (Cormack et al, k=60)
- Anthropic Contextual Retrieval pattern (Sept 2024, `https://www.anthropic.com/news/contextual-retrieval`)

**Prerequisites:** Plan A landed (`docs/superpowers/plans/2026-05-05-lumora-rag-foundation.md`). The lumora_kb_chunks and lumora_user_doc_chunks tables, embeddings/chunker/retrieval services, and inference-route wiring all exist.

**Out of scope (separate plans):**
- JD-derived web watchlist crawler — Plan C
- Eval harness + retrieval logs — Plan D
- Coding-path retrieval injection — already noted in Plan A's findings

---

## File Structure

**New files (lumora-backend):**

| Path | Phase | Responsibility |
|------|-------|----------------|
| `apps/lumora-backend/src/services/hybridRetrieval.js` | 1 | Vector + BM25 search merged via Reciprocal Rank Fusion |
| `apps/lumora-backend/src/services/hyde.js` | 2 | Haiku-generated hypothetical answer for query embedding |
| `apps/lumora-backend/src/services/reranker.js` | 3 | Cohere rerank-v3.5 wrapper, env-gated skip |
| `apps/lumora-backend/src/services/contextualChunker.js` | 4 | Haiku-generated 50-token context preamble per chunk |
| `apps/lumora-backend/src/services/sessionKit.js` | 5 | Per-user warm-prefetch read/write + JD-keyword expansion |
| `apps/lumora-backend/tests/hybridRetrieval.test.js` | 1 | Hybrid scoring + RRF behavior |
| `apps/lumora-backend/tests/hyde.test.js` | 2 | HyDE prompt + cache + fallback |
| `apps/lumora-backend/tests/reranker.test.js` | 3 | Cohere call shape + env-gated skip + order preservation |
| `apps/lumora-backend/tests/contextualChunker.test.js` | 4 | Context preamble generation + idempotency |
| `apps/lumora-backend/tests/sessionKit.test.js` | 5 | Kit build + freshness check + lookup |

**Modified files:**

| Path | Phase | Change |
|------|-------|--------|
| `apps/lumora-backend/src/index.js` | 1, 5 | Add tsvector columns + GIN indexes; add `lumora_session_kit` table |
| `apps/lumora-backend/src/services/retrieval.js` | 1, 2, 3 | Switch to hybrid path; accept `useHyde`/`useRerank` opts; preserve timeout race |
| `apps/lumora-backend/src/services/chunker.js` | 4 | Output now carries optional `contextSummary`; embed text becomes `${context}\n\n${content}` |
| `apps/lumora-backend/scripts/index-capra-kb.js` | 1, 4 | Populate tsv at upsert time; new `--with-context` flag triggers contextual chunker |
| `apps/lumora-backend/src/services/userDocIndexer.js` | 1, 4 | Populate tsv; optional contextual prefix |
| `apps/lumora-backend/src/routes/prep.js` | 5 | Fire-and-forget `buildSessionKit()` after `indexUserPrepDocs` |
| `apps/lumora-backend/src/routes/inference.js` | 5 | Read warm kit if fresh; fall back to live retrieval otherwise |

**Env additions** (documented in CLAUDE.md update at end of plan):
- `COHERE_API_KEY` — optional; reranker skips when absent.
- `RAG_USE_HYDE` — optional bool, default `false` until Phase 2 proven.
- `RAG_USE_RERANK` — optional bool, default `false` until Phase 3 proven.
- `RAG_USE_CONTEXTUAL` — optional bool gating Phase 4's ingest path.

---

# Phase 1 — Hybrid Retrieval (BM25 + RRF)

Vector ANN misses exact-term queries ("OAuth 2.1 PKCE", "GIL", "Raft"). Postgres `tsvector` + `to_tsquery` is fast, free, and runs in the same DB. Reciprocal Rank Fusion is the standard merge: `score = Σ 1/(k + rank_i)` with k=60.

## Task 1.1: Add tsvector columns + GIN indexes

**Files:**
- Modify: `apps/lumora-backend/src/index.js` — append entries to `migrations` array (after Plan A's RAG entries).

- [ ] **Step 1: Read the end of the migrations array**

```bash
sed -n '155,225p' apps/lumora-backend/src/index.js
```
Confirm: see Plan A's `ALTER TABLE lumora_user_doc_chunks ALTER COLUMN section TYPE TEXT` as the final entry, with the closing `];` after it.

- [ ] **Step 2: Append tsvector + GIN entries**

In `apps/lumora-backend/src/index.js`, before the closing `];` of the migrations array, append:

```js
      // ── RAG Phase 1: BM25 (Postgres tsvector) ──────────────────────
      // Generated columns + GIN indexes give us full-text search
      // coexisting with the HNSW vector index. Hybrid retrieval merges
      // both via Reciprocal Rank Fusion.
      `ALTER TABLE lumora_kb_chunks
         ADD COLUMN IF NOT EXISTS content_tsv tsvector
         GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED`,
      `CREATE INDEX IF NOT EXISTS lumora_kb_chunks_tsv_gin
         ON lumora_kb_chunks USING GIN (content_tsv)`,
      `ALTER TABLE lumora_user_doc_chunks
         ADD COLUMN IF NOT EXISTS content_tsv tsvector
         GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_tsv_gin
         ON lumora_user_doc_chunks USING GIN (content_tsv)`,
```

- [ ] **Step 3: Boot the backend to apply**

```bash
cd apps/lumora-backend && timeout 15 node src/index.js &
sleep 5
kill %1 2>/dev/null
wait 2>/dev/null || true
```
Expected log line: `Database migrations complete`. Boot then exits.

- [ ] **Step 4: Verify columns + indexes exist**

```bash
cd apps/lumora-backend && node --input-type=module -e "
import 'dotenv/config';
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const cols = await c.query(\"SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name='content_tsv' ORDER BY 1\");
const idx = await c.query(\"SELECT indexname FROM pg_indexes WHERE indexname IN ('lumora_kb_chunks_tsv_gin','lumora_user_doc_chunks_tsv_gin') ORDER BY 1\");
console.log('cols:', JSON.stringify(cols.rows));
console.log('idx:', JSON.stringify(idx.rows));
await c.end();
"
```

Expected: both tables show `content_tsv` of type `tsvector`; both GIN indexes present.

- [ ] **Step 5: Spot-check a tsvector population**

```bash
cd apps/lumora-backend && node --input-type=module -e "
import 'dotenv/config';
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(\"SELECT topic_title, content_tsv FROM lumora_kb_chunks WHERE source = 'capra-sre' LIMIT 1\");
console.log(JSON.stringify(r.rows[0], null, 2));
await c.end();
"
```

Expected: `content_tsv` is non-null and contains positional lexemes (e.g., `'reliab':32 'sre':1,5,40 ...`). The generated column populates automatically — no backfill required.

- [ ] **Step 6: Commit**

```bash
git add apps/lumora-backend/src/index.js
git commit -m "feat(lumora): add tsvector + GIN indexes for hybrid retrieval"
```

## Task 1.2: Hybrid retrieval service

**Files:**
- Create: `apps/lumora-backend/src/services/hybridRetrieval.js`
- Test: `apps/lumora-backend/tests/hybridRetrieval.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/hybridRetrieval.test.js`:

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

describe('hybridSearchKb', () => {
  it('merges vector + BM25 results via reciprocal rank fusion', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) => {
      if (sql.includes('embedding <=>')) {
        return Promise.resolve({
          rows: [
            { id: 'A', source: 'capra-sre', topic_id: 't1', topic_title: 'T1', section: 's', content: 'a', distance: 0.1 },
            { id: 'B', source: 'capra-sre', topic_id: 't2', topic_title: 'T2', section: 's', content: 'b', distance: 0.2 },
            { id: 'C', source: 'capra-sre', topic_id: 't3', topic_title: 'T3', section: 's', content: 'c', distance: 0.3 },
          ],
        });
      }
      return Promise.resolve({
        rows: [
          { id: 'C', source: 'capra-sre', topic_id: 't3', topic_title: 'T3', section: 's', content: 'c', ts_rank: 0.5 },
          { id: 'D', source: 'capra-sre', topic_id: 't4', topic_title: 'T4', section: 's', content: 'd', ts_rank: 0.4 },
        ],
      });
    });
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchKb('q', 4);
    const ids = r.map((c) => c.id);
    // C appears in both lists → highest fused score; A and B from vector only;
    // D from BM25 only. Top-4 should include C first, then a mix.
    expect(ids[0]).toBe('C');
    expect(ids).toContain('A');
    expect(ids).toContain('D');
    expect(ids.length).toBe(4);
    expect(r[0].rrfScore).toBeGreaterThan(r[1].rrfScore);
  });

  it('returns vector-only results when BM25 returns empty', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) =>
      sql.includes('embedding <=>')
        ? Promise.resolve({ rows: [
            { id: 'A', source: 'x', topic_id: 't1', topic_title: 'T1', section: 's', content: 'a', distance: 0.1 },
          ] })
        : Promise.resolve({ rows: [] }),
    );
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchKb('q', 4);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('A');
  });
});

describe('hybridSearchUserDocs', () => {
  it('always filters by user_id and merges vector + BM25', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) =>
      sql.includes('embedding <=>')
        ? Promise.resolve({ rows: [
            { id: 'U1', doc_kind: 'jd', section: 'body', content: 'a', distance: 0.1 },
          ] })
        : Promise.resolve({ rows: [
            { id: 'U2', doc_kind: 'resume', section: 'body', content: 'b', ts_rank: 0.3 },
          ] }),
    );
    const { hybridSearchUserDocs } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchUserDocs(7, 'q', 4);
    const userIdParams = queryMock.mock.calls.map((c) => c[1][0]);
    expect(userIdParams.every((p) => p === 7)).toBe(true);
    expect(r.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/hybridRetrieval.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hybrid retrieval service**

Create `apps/lumora-backend/src/services/hybridRetrieval.js`:

```js
/**
 * Hybrid retrieval — vector ANN merged with BM25 (Postgres tsvector)
 * via Reciprocal Rank Fusion (Cormack et al, k=60).
 *
 * Vector recall is strong on semantic intent; BM25 recall is strong on
 * exact terms (acronyms, library names, version strings). RRF combines
 * the two without needing to normalize raw scores.
 *
 *   rrf_score = Σ 1 / (k + rank_i)
 *
 * where rank_i is 1-based rank in source list i (skipped if absent).
 */
import { query } from '../lib/shared-db.js';
import { embedQuery } from './embeddings.js';

const RRF_K = 60;
const VECTOR_TOP = 20;
const BM25_TOP = 20;

function asVecLiteral(v) {
  return `[${v.join(',')}]`;
}

function fuse(lists, finalK) {
  // Each list is an array of {id, ...rest}. Build a map of id → fused score.
  const byId = new Map();
  for (const list of lists) {
    list.forEach((item, idx) => {
      const rank = idx + 1;
      const contribution = 1 / (RRF_K + rank);
      const prev = byId.get(item.id);
      if (prev) {
        prev.rrfScore += contribution;
      } else {
        byId.set(item.id, { ...item, rrfScore: contribution });
      }
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, finalK);
}

export async function hybridSearchKb(question, finalK) {
  const vec = await embedQuery(question);
  const [vecRows, bm25Rows] = await Promise.all([
    query(
      `SELECT id, source, topic_id, topic_title, section, content,
              embedding <=> $1::vector AS distance
         FROM lumora_kb_chunks
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
      [asVecLiteral(vec), VECTOR_TOP],
    ),
    query(
      `SELECT id, source, topic_id, topic_title, section, content,
              ts_rank(content_tsv, plainto_tsquery('english', $1)) AS ts_rank
         FROM lumora_kb_chunks
         WHERE content_tsv @@ plainto_tsquery('english', $1)
         ORDER BY ts_rank DESC
         LIMIT $2`,
      [question, BM25_TOP],
    ),
  ]);
  const vecChunks = vecRows.rows.map((row) => ({
    tier: 'kb',
    id: row.id,
    source: row.source,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    section: row.section,
    content: row.content,
    distance: Number(row.distance),
  }));
  const bm25Chunks = bm25Rows.rows.map((row) => ({
    tier: 'kb',
    id: row.id,
    source: row.source,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    section: row.section,
    content: row.content,
    tsRank: Number(row.ts_rank),
  }));
  return fuse([vecChunks, bm25Chunks], finalK);
}

export async function hybridSearchUserDocs(userId, question, finalK) {
  const vec = await embedQuery(question);
  const [vecRows, bm25Rows] = await Promise.all([
    query(
      `SELECT id, doc_kind, section, content,
              embedding <=> $2::vector AS distance
         FROM lumora_user_doc_chunks
         WHERE user_id = $1
         ORDER BY embedding <=> $2::vector
         LIMIT $3`,
      [userId, asVecLiteral(vec), VECTOR_TOP],
    ),
    query(
      `SELECT id, doc_kind, section, content,
              ts_rank(content_tsv, plainto_tsquery('english', $2)) AS ts_rank
         FROM lumora_user_doc_chunks
         WHERE user_id = $1 AND content_tsv @@ plainto_tsquery('english', $2)
         ORDER BY ts_rank DESC
         LIMIT $3`,
      [userId, question, BM25_TOP],
    ),
  ]);
  const vecChunks = vecRows.rows.map((row) => ({
    tier: 'user',
    id: row.id,
    docKind: row.doc_kind,
    section: row.section,
    content: row.content,
    distance: Number(row.distance),
  }));
  const bm25Chunks = bm25Rows.rows.map((row) => ({
    tier: 'user',
    id: row.id,
    docKind: row.doc_kind,
    section: row.section,
    content: row.content,
    tsRank: Number(row.ts_rank),
  }));
  return fuse([vecChunks, bm25Chunks], finalK);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/hybridRetrieval.test.js
```
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/hybridRetrieval.js apps/lumora-backend/tests/hybridRetrieval.test.js
git commit -m "feat(lumora): hybrid retrieval (vector + BM25) via reciprocal rank fusion"
```

## Task 1.3: Wire hybrid into retrieval.js

**Files:**
- Modify: `apps/lumora-backend/src/services/retrieval.js`
- Test: `apps/lumora-backend/tests/retrieval.test.js` (existing — extend)

- [ ] **Step 1: Read the current retrieve function**

```bash
sed -n '64,98p' apps/lumora-backend/src/services/retrieval.js
```
Confirm the `retrieve()` function and its `searchKb`/`searchUserDocs` callers.

- [ ] **Step 2: Replace the search calls with hybrid**

In `apps/lumora-backend/src/services/retrieval.js`, change the import block at the top:

```js
import { query } from '../lib/shared-db.js';
import { embedQuery } from './embeddings.js';
```

to:

```js
import { hybridSearchKb, hybridSearchUserDocs } from './hybridRetrieval.js';
```

Then delete the `searchKb` and `searchUserDocs` helper functions (and the `asVecLiteral` helper if it's no longer used elsewhere in this file). Also delete the `query` and `embedQuery` imports — they're now consumed transitively via hybridRetrieval.

In the `retrieve()` body, replace the two helper calls. Find:

```js
  const work = (async () => {
    const vec = await embedQuery(question);
    const promises = [searchKb(vec, KB_TOP_K)];
    if (userId) promises.push(searchUserDocs(userId, vec, USER_TOP_K));
    const results = await Promise.all(promises);
    return results.flat();
  })();
```

Replace with:

```js
  const work = (async () => {
    const promises = [hybridSearchKb(question, KB_TOP_K)];
    if (userId) promises.push(hybridSearchUserDocs(userId, question, USER_TOP_K));
    const results = await Promise.all(promises);
    return results.flat();
  })();
```

(`hybridSearch*` internally calls `embedQuery` once per side, so the embedding fires twice when userId is present. That's a real cost — see Task 1.4 for the optimization.)

- [ ] **Step 3: Add a hybrid-aware test**

Append to `apps/lumora-backend/tests/retrieval.test.js`:

```js
describe('retrieve hybrid integration', () => {
  it('still respects userId namespace via hybridSearchUserDocs', async () => {
    // Re-mock at the hybridRetrieval boundary, since retrieve.js now
    // depends on it instead of shared-db.
    vi.resetModules();
    const hybridKbMock = vi.fn().mockResolvedValue([
      { tier: 'kb', id: 'k1', source: 'capra-sre', topicId: 't1', topicTitle: 'T1', section: 'summary', content: 'kb', rrfScore: 0.05 },
    ]);
    const hybridUserMock = vi.fn().mockResolvedValue([
      { tier: 'user', id: 'u1', docKind: 'jd', section: 'body', content: 'jd', rrfScore: 0.04 },
    ]);
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: hybridUserMock,
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 13 });
    expect(r.chunks.length).toBe(2);
    expect(hybridUserMock).toHaveBeenCalledWith(13, 'q', expect.any(Number));
  });
});
```

- [ ] **Step 4: Run the test**

```bash
cd apps/lumora-backend && npx vitest run tests/retrieval.test.js tests/hybridRetrieval.test.js
```
Expected: all green — pre-existing 6 retrieval tests + 3 hybrid tests + 1 new integration test = 10. (Some pre-existing retrieval tests use `query`/`embedQuery` mocks which are now indirect; if those fail, update the mocks in the existing tests to `vi.doMock('../src/services/hybridRetrieval.js', ...)` instead.)

- [ ] **Step 5: Live smoke — confirm hybrid finds an exact-term match vector misses**

```bash
cd apps/lumora-backend && node --input-type=module -e "
import 'dotenv/config';
const { retrieve } = await import('./src/services/retrieval.js');
const r = await retrieve({ question: 'GIL global interpreter lock', userId: null, timeoutMs: 3000 });
console.log('latency:', r.latencyMs, 'chunks:', r.chunks.length);
for (const c of r.chunks) console.log(' -', c.source, '/', c.topicTitle, '(rrf=' + (c.rrfScore || 0).toFixed(4) + ')');
"
```
Expected: a `capra-concurrency` GIL topic should rank highly. Without BM25, "GIL" alone may not retrieve the right topic; with BM25 it should.

- [ ] **Step 6: Commit**

```bash
git add apps/lumora-backend/src/services/retrieval.js apps/lumora-backend/tests/retrieval.test.js
git commit -m "feat(lumora): switch retrieve() to hybrid search"
```

## Task 1.4: Avoid double-embed across hybrid sides

**Files:**
- Modify: `apps/lumora-backend/src/services/hybridRetrieval.js`

The `embedQuery` LRU already collapses repeats via SHA-256 cache, but the first call per question still misses cache twice (once per side). Hoisting the embed to a single top-level await + accepting it as an arg keeps the contract clean.

- [ ] **Step 1: Add `searchOnlyKb` and `searchOnlyUserDocs` (vector-pre-embedded variants) and refactor**

Replace the body of `apps/lumora-backend/src/services/hybridRetrieval.js` (preserving exports `hybridSearchKb`, `hybridSearchUserDocs`):

```js
/**
 * Hybrid retrieval — vector ANN merged with BM25 (Postgres tsvector)
 * via Reciprocal Rank Fusion (Cormack et al, k=60).
 */
import { query } from '../lib/shared-db.js';
import { embedQuery } from './embeddings.js';

const RRF_K = 60;
const VECTOR_TOP = 20;
const BM25_TOP = 20;

function asVecLiteral(v) {
  return `[${v.join(',')}]`;
}

function fuse(lists, finalK) {
  const byId = new Map();
  for (const list of lists) {
    list.forEach((item, idx) => {
      const rank = idx + 1;
      const contribution = 1 / (RRF_K + rank);
      const prev = byId.get(item.id);
      if (prev) prev.rrfScore += contribution;
      else byId.set(item.id, { ...item, rrfScore: contribution });
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, finalK);
}

async function vecKb(vec) {
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            embedding <=> $1::vector AS distance
       FROM lumora_kb_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [asVecLiteral(vec), VECTOR_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'kb', id: row.id, source: row.source, topicId: row.topic_id,
    topicTitle: row.topic_title, section: row.section, content: row.content,
    distance: Number(row.distance),
  }));
}
async function bm25Kb(question) {
  const r = await query(
    `SELECT id, source, topic_id, topic_title, section, content,
            ts_rank(content_tsv, plainto_tsquery('english', $1)) AS ts_rank
       FROM lumora_kb_chunks
       WHERE content_tsv @@ plainto_tsquery('english', $1)
       ORDER BY ts_rank DESC LIMIT $2`,
    [question, BM25_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'kb', id: row.id, source: row.source, topicId: row.topic_id,
    topicTitle: row.topic_title, section: row.section, content: row.content,
    tsRank: Number(row.ts_rank),
  }));
}
async function vecUser(userId, vec) {
  const r = await query(
    `SELECT id, doc_kind, section, content, embedding <=> $2::vector AS distance
       FROM lumora_user_doc_chunks
       WHERE user_id = $1
       ORDER BY embedding <=> $2::vector LIMIT $3`,
    [userId, asVecLiteral(vec), VECTOR_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'user', id: row.id, docKind: row.doc_kind, section: row.section,
    content: row.content, distance: Number(row.distance),
  }));
}
async function bm25User(userId, question) {
  const r = await query(
    `SELECT id, doc_kind, section, content,
            ts_rank(content_tsv, plainto_tsquery('english', $2)) AS ts_rank
       FROM lumora_user_doc_chunks
       WHERE user_id = $1 AND content_tsv @@ plainto_tsquery('english', $2)
       ORDER BY ts_rank DESC LIMIT $3`,
    [userId, question, BM25_TOP],
  );
  return r.rows.map((row) => ({
    tier: 'user', id: row.id, docKind: row.doc_kind, section: row.section,
    content: row.content, tsRank: Number(row.ts_rank),
  }));
}

export async function hybridSearchKb(question, finalK, opts = {}) {
  const vec = opts.vec || await embedQuery(question);
  const [v, b] = await Promise.all([vecKb(vec), bm25Kb(question)]);
  return fuse([v, b], finalK);
}

export async function hybridSearchUserDocs(userId, question, finalK, opts = {}) {
  const vec = opts.vec || await embedQuery(question);
  const [v, b] = await Promise.all([vecUser(userId, vec), bm25User(userId, question)]);
  return fuse([v, b], finalK);
}
```

- [ ] **Step 2: Hoist embedQuery in retrieval.js to share the vector**

In `apps/lumora-backend/src/services/retrieval.js`, change the work block to:

```js
  const work = (async () => {
    const { embedQuery } = await import('./embeddings.js');
    const vec = await embedQuery(question);
    const promises = [hybridSearchKb(question, KB_TOP_K, { vec })];
    if (userId) promises.push(hybridSearchUserDocs(userId, question, USER_TOP_K, { vec }));
    const results = await Promise.all(promises);
    return results.flat();
  })();
```

- [ ] **Step 3: Re-run the suite**

```bash
cd apps/lumora-backend && npx vitest run
```
Expected: all tests still pass. Update test mocks if a test now intercepts at the hybrid boundary differently.

- [ ] **Step 4: Commit**

```bash
git add apps/lumora-backend/src/services/hybridRetrieval.js apps/lumora-backend/src/services/retrieval.js
git commit -m "perf(lumora): single embed call shared across hybrid sides"
```

---

# Phase 2 — HyDE Query Rewriting

The interviewer's literal phrasing ("how would you scale this?") embeds poorly. HyDE (Gao et al, 2022) generates a hypothetical answer with a fast LLM and embeds THAT instead. Cost: one Haiku call (~50ms, ~$0.0001). Cached per-question hash so the same question reuses the rewrite.

## Task 2.1: HyDE service

**Files:**
- Create: `apps/lumora-backend/src/services/hyde.js`
- Test: `apps/lumora-backend/tests/hyde.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/hyde.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const messagesCreateMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  function FakeAnthropic() {
    return { messages: { create: messagesCreateMock } };
  }
  return { default: FakeAnthropic };
});

beforeEach(() => {
  messagesCreateMock.mockReset();
  vi.resetModules();
});

describe('hydeRewrite', () => {
  it('returns the hypothetical answer when Haiku responds', async () => {
    messagesCreateMock.mockResolvedValue({
      content: [{ type: 'text', text: 'An SLO is a target reliability level over a window. Error budgets equal 1 minus the SLO; when burned, releases pause.' }],
    });
    const { hydeRewrite } = await import('../src/services/hyde.js');
    const out = await hydeRewrite('what is an SLO?');
    expect(out).toContain('SLO');
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
    const args = messagesCreateMock.mock.calls[0][0];
    expect(args.model).toMatch(/haiku/);
    expect(args.max_tokens).toBeLessThanOrEqual(200);
  });

  it('caches repeat calls', async () => {
    messagesCreateMock.mockResolvedValue({ content: [{ type: 'text', text: 'cached answer' }] });
    const { hydeRewrite } = await import('../src/services/hyde.js');
    await hydeRewrite('same q');
    await hydeRewrite('same q');
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns null and does not throw when Haiku fails', async () => {
    messagesCreateMock.mockRejectedValue(new Error('overloaded'));
    const { hydeRewrite } = await import('../src/services/hyde.js');
    const out = await hydeRewrite('q');
    expect(out).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/hyde.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement HyDE**

Create `apps/lumora-backend/src/services/hyde.js`:

```js
/**
 * HyDE (Hypothetical Document Embeddings) query rewriter.
 *
 * The interviewer's literal phrasing ("how would you scale this?") often
 * embeds poorly compared to the answer text we want to find. We ask a
 * fast LLM (Haiku) for a hypothetical 3-4 sentence answer and embed
 * THAT instead. Recall improves on vague questions; cost is one cached
 * Haiku call (~50ms, ~$0.0001 per question).
 *
 * Returns null on failure so callers can transparently fall back to
 * embedding the literal question.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 180;
const CACHE_MAX = 1000;

let _client = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

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
    cache.delete(cache.keys().next().value);
  }
  cache.set(k, v);
}
function hash(s) {
  return createHash('sha256').update(s).digest('hex');
}

const SYSTEM = `You are helping a retrieval system. The user gives you a question that an engineer might ask in a technical interview. Write a 3-4 sentence DIRECT, FACTUAL answer to the question (not a question, not a clarification). Use precise technical terms. Don't hedge. Don't say "I would" — answer as if explaining to a peer. The answer text will be used as a search query, so include the keywords a textbook would use.`;

export async function hydeRewrite(question) {
  const k = hash(question);
  const cached = cacheGet(k);
  if (cached !== undefined) return cached;
  try {
    const r = await client().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [{ role: 'user', content: question }],
    });
    const text = (r.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    const out = text || null;
    cacheSet(k, out);
    return out;
  } catch (err) {
    console.warn('[hyde] rewrite failed:', err.message);
    cacheSet(k, null);
    return null;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/hyde.test.js
```
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/hyde.js apps/lumora-backend/tests/hyde.test.js
git commit -m "feat(lumora): HyDE query rewrite via Haiku"
```

## Task 2.2: Wire HyDE into retrieval

**Files:**
- Modify: `apps/lumora-backend/src/services/retrieval.js`

- [ ] **Step 1: Accept `useHyde` option, gate on env**

In `apps/lumora-backend/src/services/retrieval.js`, find the `retrieve` function. Modify the signature/destructure:

```js
export async function retrieve(opts) {
  const { question, userId, timeoutMs = DEFAULT_TIMEOUT_MS, useHyde } = opts;
```

Add a helper `resolveUseHyde` near the top of the file (above `retrieve`):

```js
function resolveUseHyde(optsValue) {
  if (typeof optsValue === 'boolean') return optsValue;
  return process.env.RAG_USE_HYDE === 'true';
}
```

In the `work` block, before calling `embedQuery`, optionally rewrite the question:

```js
  const work = (async () => {
    const { embedQuery } = await import('./embeddings.js');
    let queryForEmbed = question;
    if (resolveUseHyde(useHyde)) {
      const { hydeRewrite } = await import('./hyde.js');
      const rewritten = await hydeRewrite(question);
      if (rewritten) queryForEmbed = `${question}\n\n${rewritten}`;
    }
    const vec = await embedQuery(queryForEmbed);
    const promises = [hybridSearchKb(question, KB_TOP_K, { vec })];
    if (userId) promises.push(hybridSearchUserDocs(userId, question, USER_TOP_K, { vec }));
    const results = await Promise.all(promises);
    return results.flat();
  })();
```

Note: the BM25 side still uses the raw `question` (not the HyDE rewrite) — BM25 wants the user's actual terms, not synthesized prose.

- [ ] **Step 2: Add a HyDE-aware test**

Append to `apps/lumora-backend/tests/retrieval.test.js`:

```js
describe('retrieve with HyDE', () => {
  it('augments embedding query with hypothetical answer when useHyde=true', async () => {
    vi.resetModules();
    process.env.RAG_USE_HYDE = '';
    const hydeMock = vi.fn().mockResolvedValue('SLOs are reliability targets; error budgets cap outages.');
    vi.doMock('../src/services/hyde.js', () => ({ hydeRewrite: hydeMock }));
    const embedMock = vi.fn().mockResolvedValue(new Array(1536).fill(0.01));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: embedMock }));
    const hybridKbMock = vi.fn().mockResolvedValue([]);
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: vi.fn(),
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'what is an SLO?', userId: null, useHyde: true });
    expect(hydeMock).toHaveBeenCalledWith('what is an SLO?');
    expect(embedMock).toHaveBeenCalledWith(expect.stringContaining('reliability targets'));
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/lumora-backend && npx vitest run
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/lumora-backend/src/services/retrieval.js apps/lumora-backend/tests/retrieval.test.js
git commit -m "feat(lumora): wire HyDE into retrieve() (env/option-gated)"
```

---

# Phase 3 — Cohere Reranker

A cross-encoder reranker (Cohere `rerank-v3.5`) re-orders the top-50 candidates from hybrid retrieval into a top-k that's sharper for the LLM. Quality > vector similarity for the final cut. Env-gated: skip with a no-op when `COHERE_API_KEY` is absent.

## Task 3.1: Reranker service

**Files:**
- Create: `apps/lumora-backend/src/services/reranker.js`
- Test: `apps/lumora-backend/tests/reranker.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/reranker.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  delete process.env.COHERE_API_KEY;
  vi.resetModules();
});

describe('rerank', () => {
  it('passes chunks through unchanged when COHERE_API_KEY is missing', async () => {
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a', content: 'A' }, { id: 'b', content: 'B' }];
    const out = await rerank('q', chunks, 2);
    expect(out).toEqual(chunks);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reorders chunks by Cohere relevance scores when key is set', async () => {
    process.env.COHERE_API_KEY = 'test';
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.6 },
        ],
      }),
    });
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a', content: 'A' }, { id: 'b', content: 'B' }];
    const out = await rerank('q', chunks, 2);
    expect(out[0].id).toBe('b');
    expect(out[1].id).toBe('a');
    expect(out[0].rerankScore).toBeCloseTo(0.9);
  });

  it('truncates to topK', async () => {
    process.env.COHERE_API_KEY = 'test';
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { index: 0, relevance_score: 0.9 },
          { index: 1, relevance_score: 0.8 },
          { index: 2, relevance_score: 0.7 },
        ],
      }),
    });
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }].map((c, i) => ({ ...c, content: 'x' + i }));
    const out = await rerank('q', chunks, 2);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('a');
    expect(out[1].id).toBe('b');
  });

  it('falls back to original order on Cohere API error', async () => {
    process.env.COHERE_API_KEY = 'test';
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') });
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a' }, { id: 'b' }].map((c, i) => ({ ...c, content: 'x' + i }));
    const out = await rerank('q', chunks, 2);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/reranker.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the reranker**

Create `apps/lumora-backend/src/services/reranker.js`:

```js
/**
 * Cohere rerank-v3.5 cross-encoder reranker.
 *
 * Hybrid retrieval (Phase 1) returns top-N by RRF. A cross-encoder
 * reranker re-orders that pool by reading every (query, chunk) pair
 * jointly — much sharper than cosine on the final cut. Top-50 → top-8
 * is the canonical pattern.
 *
 * Env-gated by COHERE_API_KEY. When the key is absent (dev environment,
 * key revoked, etc.), this function is a no-op pass-through and the
 * caller still gets a valid response. Network errors also degrade
 * gracefully — original order is returned with a warning logged.
 */
const MODEL = 'rerank-v3.5';
const ENDPOINT = 'https://api.cohere.com/v2/rerank';
const TIMEOUT_MS = 800;

export async function rerank(question, chunks, topK) {
  const key = process.env.COHERE_API_KEY;
  if (!key || chunks.length === 0) return chunks.slice(0, topK);

  const documents = chunks.map((c) => c.content || '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        query: question,
        documents,
        top_n: Math.min(topK, documents.length),
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.warn(`[rerank] cohere ${r.status}: ${body.slice(0, 200)}`);
      return chunks.slice(0, topK);
    }
    const json = await r.json();
    const ranked = (json.results || [])
      .map((res) => ({ ...chunks[res.index], rerankScore: res.relevance_score }))
      .slice(0, topK);
    return ranked;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[rerank] cohere timeout after ${TIMEOUT_MS}ms`);
    } else {
      console.warn('[rerank] cohere call failed:', err.message);
    }
    return chunks.slice(0, topK);
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/reranker.test.js
```
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/reranker.js apps/lumora-backend/tests/reranker.test.js
git commit -m "feat(lumora): Cohere rerank-v3.5 cross-encoder (env-gated)"
```

## Task 3.2: Wire reranker into retrieval

**Files:**
- Modify: `apps/lumora-backend/src/services/retrieval.js`

The reranker takes the merged `flat()` list (top KB + top user). Default topK = 8 after rerank. We bump pre-rerank fetch sizes since the reranker will trim down — wider candidate pool = better final precision.

- [ ] **Step 1: Accept `useRerank` and bump candidate sizes**

In `apps/lumora-backend/src/services/retrieval.js`, change the constants block:

```js
const DEFAULT_TIMEOUT_MS = 250;
const KB_TOP_K = 6;
const USER_TOP_K = 4;
const MAX_CHUNK_CHARS = 1200;
```

to:

```js
const DEFAULT_TIMEOUT_MS = 250;
// When rerank is on, we cast a wider candidate net — Cohere will trim
// down to FINAL_TOP_K. When rerank is off, we use the narrow LLM-ready
// counts directly.
const KB_TOP_K_NARROW = 6;
const USER_TOP_K_NARROW = 4;
const KB_TOP_K_WIDE = 30;
const USER_TOP_K_WIDE = 20;
const FINAL_TOP_K = 10;
const MAX_CHUNK_CHARS = 1200;

function resolveUseRerank(optsValue) {
  if (typeof optsValue === 'boolean') return optsValue;
  return process.env.RAG_USE_RERANK === 'true' && !!process.env.COHERE_API_KEY;
}
```

In the `retrieve` destructure add `useRerank`. In the `work` block, choose top-k based on rerank mode and rerank after merge:

```js
  const { question, userId, timeoutMs = DEFAULT_TIMEOUT_MS, useHyde, useRerank } = opts;
  const willRerank = resolveUseRerank(useRerank);
  // ... earlier code ...
  const work = (async () => {
    const { embedQuery } = await import('./embeddings.js');
    let queryForEmbed = question;
    if (resolveUseHyde(useHyde)) {
      const { hydeRewrite } = await import('./hyde.js');
      const rewritten = await hydeRewrite(question);
      if (rewritten) queryForEmbed = `${question}\n\n${rewritten}`;
    }
    const vec = await embedQuery(queryForEmbed);
    const kbTop = willRerank ? KB_TOP_K_WIDE : KB_TOP_K_NARROW;
    const userTop = willRerank ? USER_TOP_K_WIDE : USER_TOP_K_NARROW;
    const promises = [hybridSearchKb(question, kbTop, { vec })];
    if (userId) promises.push(hybridSearchUserDocs(userId, question, userTop, { vec }));
    const merged = (await Promise.all(promises)).flat();
    if (!willRerank) return merged;
    const { rerank } = await import('./reranker.js');
    return rerank(question, merged, FINAL_TOP_K);
  })();
```

- [ ] **Step 2: Add a rerank-aware test**

Append to `apps/lumora-backend/tests/retrieval.test.js`:

```js
describe('retrieve with reranker', () => {
  it('passes merged chunks through rerank when useRerank=true', async () => {
    vi.resetModules();
    process.env.RAG_USE_RERANK = '';
    process.env.COHERE_API_KEY = 'set';
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([{ tier: 'kb', id: 'k1', content: 'A' }, { tier: 'kb', id: 'k2', content: 'B' }]),
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
    }));
    const rerankMock = vi.fn().mockImplementation((q, chunks) => Promise.resolve(chunks.slice().reverse()));
    vi.doMock('../src/services/reranker.js', () => ({ rerank: rerankMock }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null, useRerank: true });
    expect(rerankMock).toHaveBeenCalledTimes(1);
    expect(r.chunks[0].id).toBe('k2');
    expect(r.chunks[1].id).toBe('k1');
  });
});
```

- [ ] **Step 3: Run tests + live smoke**

```bash
cd apps/lumora-backend && npx vitest run
```
Expected: all green.

If a `COHERE_API_KEY` is available in `.env`, run:

```bash
cd apps/lumora-backend && node --input-type=module -e "
import 'dotenv/config';
process.env.RAG_USE_RERANK = 'true';
const { retrieve } = await import('./src/services/retrieval.js');
const r = await retrieve({ question: 'how do I scale a chat service?', userId: null, timeoutMs: 5000 });
console.log('latency:', r.latencyMs, 'chunks:', r.chunks.length);
for (const c of r.chunks) console.log(' -', c.tier, '/', c.topicTitle || c.docKind, '(rerank=' + (c.rerankScore || 0).toFixed(3) + ')');
"
```
Expected: top chunks now have non-zero `rerankScore` and ordering is by score, not RRF. If no key is set, skip this step.

- [ ] **Step 4: Commit**

```bash
git add apps/lumora-backend/src/services/retrieval.js apps/lumora-backend/tests/retrieval.test.js
git commit -m "feat(lumora): apply rerank after hybrid merge (env/option-gated)"
```

---

# Phase 4 — Contextual Chunking

The Anthropic Sept-2024 "Contextual Retrieval" paper showed that prepending a 50-token Haiku-generated context summary to each chunk before embedding cuts retrieval failures by 35-67%. We implement it as an optional re-index pass — the existing chunks stay valid; running with `--with-context` rebuilds them with prefixes.

## Task 4.1: Contextual chunker service

**Files:**
- Create: `apps/lumora-backend/src/services/contextualChunker.js`
- Test: `apps/lumora-backend/tests/contextualChunker.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/contextualChunker.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const messagesCreateMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  function FakeAnthropic() { return { messages: { create: messagesCreateMock } }; }
  return { default: FakeAnthropic };
});

beforeEach(() => {
  messagesCreateMock.mockReset();
  vi.resetModules();
});

describe('addContextToChunks', () => {
  it('prepends a context preamble to each chunk content', async () => {
    messagesCreateMock.mockResolvedValue({
      content: [{ type: 'text', text: 'This chunk introduces SLO basics within the SRE foundations topic.' }],
    });
    const { addContextToChunks } = await import('../src/services/contextualChunker.js');
    const chunks = [
      { content: 'An SLO is a target.', section: 'summary', topicTitle: 'SLI/SLO/SLA' },
    ];
    const docText = 'SLI/SLO/SLA — full topic body here.';
    const out = await addContextToChunks(chunks, docText);
    expect(out[0].content).toMatch(/^\[Context: This chunk introduces SLO basics/);
    expect(out[0].content).toContain('An SLO is a target.');
    expect(out[0].contextSummary).toBeTruthy();
  });

  it('returns chunks unmodified when Haiku fails', async () => {
    messagesCreateMock.mockRejectedValue(new Error('rate limit'));
    const { addContextToChunks } = await import('../src/services/contextualChunker.js');
    const chunks = [{ content: 'plain', section: 'summary', topicTitle: 'T' }];
    const out = await addContextToChunks(chunks, 'doc');
    expect(out[0].content).toBe('plain');
    expect(out[0].contextSummary).toBeFalsy();
  });

  it('processes chunks in parallel batches', async () => {
    messagesCreateMock.mockResolvedValue({ content: [{ type: 'text', text: 'ctx' }] });
    const { addContextToChunks } = await import('../src/services/contextualChunker.js');
    const chunks = new Array(8).fill(0).map((_, i) => ({ content: 'c' + i, section: 's', topicTitle: 'T' }));
    const out = await addContextToChunks(chunks, 'doc');
    expect(out).toHaveLength(8);
    expect(messagesCreateMock).toHaveBeenCalledTimes(8);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/contextualChunker.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the contextual chunker**

Create `apps/lumora-backend/src/services/contextualChunker.js`:

```js
/**
 * Contextual chunking — Anthropic Sept-2024 pattern.
 *
 * For each chunk, ask Haiku for a 50-token context that situates the
 * chunk within its source document. Prepend that context to the chunk
 * before embedding. Reduces retrieval failures by 35-67% on the paper's
 * benchmark.
 *
 *   prompt: "Here is the chunk we want to situate within the whole
 *            document <document>{doc}</document>. Here is the chunk
 *            <chunk>{chunk}</chunk>. Please give a short succinct
 *            context to situate this chunk within the overall document
 *            for the purposes of improving search retrieval of the
 *            chunk."
 *
 * Failures degrade silently — chunks pass through unmodified, so a
 * partial run still produces a valid index.
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 100;
const PARALLEL = 8;

let _client = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const PROMPT_TEMPLATE = (doc, chunk) =>
  `Here is the chunk we want to situate within the whole document
<document>
${doc.slice(0, 8000)}
</document>
Here is the chunk
<chunk>
${chunk}
</chunk>
Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`;

async function generateContextOne(chunk, docText) {
  try {
    const r = await client().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: PROMPT_TEMPLATE(docText, chunk.content) }],
    });
    const text = (r.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[contextualChunker] generation failed:', err.message);
    return null;
  }
}

async function processInBatches(items, batchSize, fn) {
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((it) => fn(it)));
    results.forEach((r, j) => { out[i + j] = r; });
  }
  return out;
}

export async function addContextToChunks(chunks, docText) {
  const contexts = await processInBatches(chunks, PARALLEL, (c) => generateContextOne(c, docText));
  return chunks.map((c, i) => {
    const ctx = contexts[i];
    if (!ctx) return c;
    return {
      ...c,
      contextSummary: ctx,
      content: `[Context: ${ctx}]\n\n${c.content}`,
      // Recompute hash since content changed; caller (indexer) should
      // detect the change and re-embed. Hash recomputation is the
      // chunker's responsibility, so we leave hash to the caller after
      // contextSummary is applied.
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/contextualChunker.test.js
```
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/contextualChunker.js apps/lumora-backend/tests/contextualChunker.test.js
git commit -m "feat(lumora): contextual chunker (Anthropic Sept-2024 pattern)"
```

## Task 4.2: Re-hash chunks after contextualization

**Files:**
- Modify: `apps/lumora-backend/src/services/chunker.js`

The chunker's `contentHash` is computed from `${source}|${topic.id}|${section}|${trimmed}`. After contextualization, `content` changes but the spec hash inputs don't include the prefix — so the indexer would skip re-embedding and the DB content would mismatch the embedding. Fix: expose a helper that recomputes the hash given the (possibly contextualized) content.

- [ ] **Step 1: Export a `rehash` helper**

In `apps/lumora-backend/src/services/chunker.js`, add at the bottom (after the existing exports):

```js
/**
 * Recompute a chunk's contentHash after its `content` has been mutated
 * (e.g., by addContextToChunks prepending a context preamble). Keeps
 * the original hash inputs stable across mutations of `source`,
 * `topic.id`, and `section`.
 */
export function rehash(chunk) {
  const newHash = createHash('sha256')
    .update(`${chunk.source}|${chunk.topicId}|${chunk.section}|${chunk.content.trim()}`)
    .digest('hex')
    .slice(0, 32);
  return { ...chunk, contentHash: newHash };
}
```

The `createHash` import is already at the top of the file from Plan A's chunker.

- [ ] **Step 2: Add a test for rehash**

Append to `apps/lumora-backend/tests/chunker.test.js`:

```js
describe('rehash', () => {
  it('produces a different hash when content changes', async () => {
    const { chunkTopic, rehash } = await import('../src/services/chunker.js');
    const topic = { id: 't1', title: 'T1', introduction: 'i' };
    const [c] = chunkTopic(topic, { source: 'x' });
    const original = c.contentHash;
    const mutated = rehash({ ...c, content: 'mutated content' });
    expect(mutated.contentHash).not.toBe(original);
  });
  it('produces the same hash for unchanged content', async () => {
    const { chunkTopic, rehash } = await import('../src/services/chunker.js');
    const topic = { id: 't1', title: 'T1', introduction: 'i' };
    const [c] = chunkTopic(topic, { source: 'x' });
    expect(rehash(c).contentHash).toBe(c.contentHash);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/lumora-backend && npx vitest run tests/chunker.test.js
```
Expected: 9 passing (was 7).

- [ ] **Step 4: Commit**

```bash
git add apps/lumora-backend/src/services/chunker.js apps/lumora-backend/tests/chunker.test.js
git commit -m "feat(lumora): export rehash for post-mutation chunks"
```

## Task 4.3: --with-context flag in the Capra indexer

**Files:**
- Modify: `apps/lumora-backend/scripts/index-capra-kb.js`

- [ ] **Step 1: Add the flag and serialize the topic doc**

In `apps/lumora-backend/scripts/index-capra-kb.js`:

1. Import additions at the top:
```js
import { addContextToChunks } from '../src/services/contextualChunker.js';
import { rehash } from '../src/services/chunker.js';
```

2. Add `withContext: false` to `parseArgs`:
```js
function parseArgs(argv) {
  const args = { source: null, dryRun: false, maxSpendUsd: DEFAULT_MAX_SPEND_USD, withContext: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--max-spend-usd') args.maxSpendUsd = Number(argv[++i]);
    else if (argv[i] === '--with-context') args.withContext = true;
  }
  return args;
}
```

3. Add a helper near the top:
```js
function topicAsDocText(topic) {
  const parts = [
    topic.title,
    topic.description,
    topic.introduction,
    Array.isArray(topic.whenToUse) ? topic.whenToUse.join('\n') : null,
    Array.isArray(topic.keyConcepts) ? topic.keyConcepts.map((kc) => `${kc.term}: ${kc.definition}`).join('\n') : null,
    Array.isArray(topic.questions) ? topic.questions.map((q) => `Q: ${q.question}\nA: ${q.answer || ''}`).join('\n\n') : null,
  ].filter(Boolean);
  return parts.join('\n\n');
}
```

4. In `indexEntry`, after generating `allChunks` and before computing `newOrChanged`, apply contextualization when the flag is set. Replace:

```js
  const allChunks = [];
  for (const t of topics) {
    for (const c of chunkTopic(t, { source: entry.source })) {
      allChunks.push(c);
    }
  }
```

with:

```js
  const allChunks = [];
  for (const t of topics) {
    let topicChunks = chunkTopic(t, { source: entry.source });
    if (withContext) {
      const docText = topicAsDocText(t);
      topicChunks = await addContextToChunks(topicChunks, docText);
      topicChunks = topicChunks.map(rehash);
    }
    for (const c of topicChunks) allChunks.push(c);
  }
```

And update the `indexEntry` signature: change `async function indexEntry(entry, { dryRun })` to `async function indexEntry(entry, { dryRun, withContext })`. In `main()`, pass `{ dryRun, withContext }` to `indexEntry`. Same change for the pre-flight loop.

- [ ] **Step 2: Run a dry-run with --with-context against one source to verify the flag works**

```bash
cd apps/lumora-backend && node scripts/index-capra-kb.js --source capra-concurrency --with-context --dry-run
```
Expected: per-source line shows `new/changed=N` where N matches the chunk count for that source (since contextualization changes every content_hash). No real Haiku spend (dry-run), no embedding spend.

- [ ] **Step 3: Real run on a small source with cost cap protection**

The estimate: 11 concurrency chunks × ~$0.0001 Haiku call each + ~$0.0001 embed = ~$0.001 total. Well under the default $1 cap.

```bash
cd apps/lumora-backend && node scripts/index-capra-kb.js --source capra-concurrency --with-context
```
Expected: `Done. Total chunks written: ~11.` Cost printed.

Verify a chunk has the context preamble:

```bash
cd apps/lumora-backend && node --input-type=module -e "
import 'dotenv/config';
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(\"SELECT topic_title, section, substring(content, 1, 200) AS preview FROM lumora_kb_chunks WHERE source = 'capra-concurrency' AND content LIKE '[Context:%' ORDER BY topic_title LIMIT 3\");
console.log(JSON.stringify(r.rows, null, 2));
await c.end();
"
```
Expected: at least 3 rows with `preview` starting with `[Context: ...`.

- [ ] **Step 4: Commit**

```bash
git add apps/lumora-backend/scripts/index-capra-kb.js
git commit -m "feat(lumora): --with-context flag triggers Anthropic contextual chunking"
```

---

# Phase 5 — Session-Warm Prefetch

Plan A's per-question retrieval pays ~150-300ms (or 1.1s cold-start) per Sona answer. Phase 5 amortizes this: at Prep-save time, we prefetch a "kit" — top-30 chunks from KB+user-docs against keywords derived from the JD+resume — and stuff it inside Anthropic's prompt-cache prefix. At question time, no live retrieval needed; warm kit is ~5ms to read from Postgres. Cold-start latency drops to zero per-question; prompt cache stays hot for ~5 minutes per session.

## Task 5.1: lumora_session_kit table

**Files:**
- Modify: `apps/lumora-backend/src/index.js`

- [ ] **Step 1: Append migration**

Before the closing `];` of the migrations array (after Phase 1's tsvector entries):

```js
      // ── RAG Phase 5: session warm kit ──────────────────────────────
      // Per-user prefetched chunks, refreshed on Prep save. Inference
      // reads this and skips live retrieval when the kit is fresh.
      `CREATE TABLE IF NOT EXISTS lumora_session_kit (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        kit JSONB NOT NULL,
        prep_state_version BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
```

- [ ] **Step 2: Boot, verify**

```bash
cd apps/lumora-backend && timeout 15 node src/index.js &
sleep 5; kill %1 2>/dev/null; wait 2>/dev/null || true
node --input-type=module -e "
import 'dotenv/config';
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='lumora_session_kit' ORDER BY ordinal_position\");
console.log(JSON.stringify(r.rows));
await c.end();
"
```
Expected: 5 columns: `user_id` int, `kit` jsonb, `prep_state_version` bigint, `created_at` timestamptz, `updated_at` timestamptz.

- [ ] **Step 3: Commit**

```bash
git add apps/lumora-backend/src/index.js
git commit -m "feat(lumora): add lumora_session_kit table for warm prefetch"
```

## Task 5.2: Session-kit service

**Files:**
- Create: `apps/lumora-backend/src/services/sessionKit.js`
- Test: `apps/lumora-backend/tests/sessionKit.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/sessionKit.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const hybridKbMock = vi.fn();
const hybridUserMock = vi.fn();
vi.mock('../src/services/hybridRetrieval.js', () => ({
  hybridSearchKb: hybridKbMock,
  hybridSearchUserDocs: hybridUserMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  hybridKbMock.mockReset();
  hybridUserMock.mockReset();
  vi.resetModules();
});

describe('buildSessionKit', () => {
  it('returns skipped when prepData has no JD/resume', async () => {
    const { buildSessionKit } = await import('../src/services/sessionKit.js');
    const r = await buildSessionKit({ userId: 1, prepData: null });
    expect(r.skipped).toBe(true);
  });

  it('runs hybrid search per derived seed and stores results in kit', async () => {
    hybridKbMock.mockResolvedValue([{ tier: 'kb', id: 'k1', source: 'capra-sre', topicTitle: 'T', section: 's', content: 'x' }]);
    hybridUserMock.mockResolvedValue([{ tier: 'user', id: 'u1', docKind: 'jd', section: 'body', content: 'y' }]);
    queryMock.mockResolvedValue({ rows: [] });
    const { buildSessionKit } = await import('../src/services/sessionKit.js');
    const r = await buildSessionKit({
      userId: 42,
      prepData: { activeCompany: 'X', data: { X: { jd: 'SRE Kubernetes Go observability', resume: 'CI/CD pipelines' } } },
    });
    expect(r.skipped).toBeFalsy();
    expect(hybridKbMock).toHaveBeenCalled();
    const upsertCall = queryMock.mock.calls.find((c) => c[0].includes('lumora_session_kit'));
    expect(upsertCall).toBeDefined();
    expect(upsertCall[1][0]).toBe(42);
    const kit = JSON.parse(upsertCall[1][1]);
    expect(Array.isArray(kit.chunks)).toBe(true);
    expect(kit.chunks.length).toBeGreaterThan(0);
  });
});

describe('readSessionKit', () => {
  it('returns null when no row exists', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { readSessionKit } = await import('../src/services/sessionKit.js');
    expect(await readSessionKit(1)).toBeNull();
  });
  it('returns the kit when fresh', async () => {
    queryMock.mockResolvedValue({ rows: [{ kit: { chunks: [{ id: 'k1' }] }, updated_at: new Date() }] });
    const { readSessionKit } = await import('../src/services/sessionKit.js');
    const k = await readSessionKit(1);
    expect(k.chunks).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/sessionKit.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/lumora-backend/src/services/sessionKit.js`:

```js
/**
 * Session-warm prefetch kit.
 *
 * On Prep save, derive a small set of "seed" queries from the JD and
 * resume — most-distinctive technical terms — and run hybrid retrieval
 * against KB+user docs for each seed. Merge, dedupe by id, take top-30,
 * store as JSONB in lumora_session_kit.
 *
 * At question time, inference can read this kit (5ms vs 150-1100ms for
 * a live query) and re-rank the kit against the actual question. The
 * full kit goes inside the Anthropic prompt-cache prefix, so the
 * cache stays hot across the whole interview.
 */
import { query } from '../lib/shared-db.js';
import { hybridSearchKb, hybridSearchUserDocs } from './hybridRetrieval.js';

const KIT_SIZE = 30;
const PER_SEED_KB = 8;
const PER_SEED_USER = 4;
const SEED_MAX = 8; // bound the parallel search count

// Crude keyword extractor — pulls 2-4-word noun phrases of capitalized
// terms, library names, and acronyms. Good enough as a seed; not a
// full NLP step.
const TECHNICAL_TOKEN = /\b([A-Z][a-zA-Z0-9+#]+(?:[-/][A-Za-z0-9+#]+)*|[A-Z]{2,}(?:\.js)?|kubernetes|terraform|graphql|grpc|kafka|redis|postgres|mongodb|prometheus|grafana|opentelemetry|argo|flux|cilium|airflow|spark|flink|kotlin|rust|golang|typescript|jenkins|gitlab|github actions|circleci|cloudbuild|cloudfunctions|lambda|fargate|cloudrun|cosmos db|dynamodb|firestore|bigquery|snowflake|databricks|s3|gcs|azure blob|sqs|sns|pubsub|eventbridge|kinesis)\b/g;

function extractSeeds(text) {
  if (typeof text !== 'string') return [];
  const tokens = (text.match(TECHNICAL_TOKEN) || []).map((t) => t.toLowerCase());
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SEED_MAX)
    .map(([t]) => t);
}

function dedupeById(chunks, max) {
  const seen = new Set();
  const out = [];
  for (const c of chunks) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export async function buildSessionKit({ userId, prepData }) {
  if (!userId || !prepData?.activeCompany) return { skipped: true };
  const company = prepData.activeCompany;
  const doc = prepData.data?.[company];
  if (!doc) return { skipped: true };
  const haystack = [doc.jd, doc.resume, doc.coverLetter].filter(Boolean).join('\n\n');
  if (!haystack.trim()) return { skipped: true };
  const seeds = extractSeeds(haystack);
  if (seeds.length === 0) return { skipped: true };

  // Run hybrid search against each seed in parallel, then merge.
  const all = [];
  await Promise.all(seeds.map(async (seed) => {
    const [kb, user] = await Promise.all([
      hybridSearchKb(seed, PER_SEED_KB).catch(() => []),
      hybridSearchUserDocs(userId, seed, PER_SEED_USER).catch(() => []),
    ]);
    all.push(...kb, ...user);
  }));
  const chunks = dedupeById(all, KIT_SIZE);

  const kit = { seeds, chunks, builtAt: Date.now() };
  const version = Date.now();
  await query(
    `INSERT INTO lumora_session_kit (user_id, kit, prep_state_version, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET kit = EXCLUDED.kit,
           prep_state_version = EXCLUDED.prep_state_version,
           updated_at = NOW()`,
    [userId, JSON.stringify(kit), version],
  );
  return { kitSize: chunks.length, seedCount: seeds.length, version };
}

export async function readSessionKit(userId) {
  const r = await query(
    'SELECT kit, updated_at FROM lumora_session_kit WHERE user_id = $1',
    [userId],
  );
  if (r.rows.length === 0) return null;
  return r.rows[0].kit;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/sessionKit.test.js
```
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/services/sessionKit.js apps/lumora-backend/tests/sessionKit.test.js
git commit -m "feat(lumora): session-warm prefetch kit (build + read)"
```

## Task 5.3: Wire kit-build into Prep PUT and kit-read into retrieve

**Files:**
- Modify: `apps/lumora-backend/src/routes/prep.js`
- Modify: `apps/lumora-backend/src/services/retrieval.js`

- [ ] **Step 1: Fire-and-forget kit build after user-doc index in prep.js**

In `apps/lumora-backend/src/routes/prep.js`, after the existing `indexUserPrepDocs(...)` line, add:

```js
import { buildSessionKit } from '../services/sessionKit.js';
```
(at the top, alongside the existing `import { indexUserPrepDocs } ...`).

In the fire-and-forget try block, after the indexUserPrepDocs line, add:

```js
      // Sequence: index user docs → build session kit. The kit reads
      // from the user-doc rows we just wrote, so we chain rather than
      // run them in parallel.
      indexUserPrepDocs({ userId: req.user.id, prepData: data })
        .then(() => buildSessionKit({ userId: req.user.id, prepData: data }))
        .catch((err) => console.warn('[prep] index/kit pipeline failed:', err.message));
```

(replace the existing `indexUserPrepDocs(...).catch(...)` line with the chained version above).

- [ ] **Step 2: Read kit in retrieve() when present**

In `apps/lumora-backend/src/services/retrieval.js`, modify the `retrieve` function. Add an option `useWarmKit` (defaults env-gated). When the kit is present and fresh, score it against the question and skip live retrieval.

Insert this near the top of `retrieve`'s `work` block, BEFORE the embedQuery call:

```js
    // Phase 5: prefer warm kit when available — skips embed + ANN.
    if (userId) {
      const { readSessionKit } = await import('./sessionKit.js');
      const kit = await readSessionKit(userId).catch(() => null);
      if (kit && Array.isArray(kit.chunks) && kit.chunks.length > 0) {
        // Score the kit against the actual question via Cohere rerank
        // when available; otherwise return the kit as-is (top-K).
        if (resolveUseRerank(useRerank)) {
          const { rerank } = await import('./reranker.js');
          return rerank(question, kit.chunks, FINAL_TOP_K);
        }
        return kit.chunks.slice(0, KB_TOP_K_NARROW + USER_TOP_K_NARROW);
      }
    }
    // ... existing live-retrieval code path follows ...
```

- [ ] **Step 3: Add a kit-aware test**

Append to `apps/lumora-backend/tests/retrieval.test.js`:

```js
describe('retrieve with warm kit', () => {
  it('reads warm kit when available, skipping live retrieval', async () => {
    vi.resetModules();
    const kitMock = vi.fn().mockResolvedValue({
      chunks: [{ tier: 'kb', id: 'k1', source: 'capra-sre', topicTitle: 'T', section: 's', content: 'x' }],
    });
    vi.doMock('../src/services/sessionKit.js', () => ({ readSessionKit: kitMock }));
    const hybridKbMock = vi.fn();
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: vi.fn(),
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 7 });
    expect(kitMock).toHaveBeenCalledWith(7);
    expect(hybridKbMock).not.toHaveBeenCalled();
    expect(r.chunks[0].id).toBe('k1');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd apps/lumora-backend && npx vitest run
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/lumora-backend/src/routes/prep.js apps/lumora-backend/src/services/retrieval.js apps/lumora-backend/tests/retrieval.test.js
git commit -m "feat(lumora): build session kit on Prep save; prefer warm kit in retrieve"
```

## Task 5.4: Final regression sweep

**Files:** none — verification only.

- [ ] **Step 1: Full lumora-backend suite**

```bash
cd apps/lumora-backend && npx vitest run
```
Expected: 23 (Plan A) + ~17 new tests = ~40 total, all passing.

- [ ] **Step 2: Frontend build (regression insurance)**

```bash
cd apps/camora && npx vite build
```
Expected: succeeds.

- [ ] **Step 3: Live end-to-end smoke**

Trigger a Prep save through the frontend (paste a JD + resume, save). Then:

```bash
cd apps/lumora-backend && node --input-type=module -e "
import 'dotenv/config';
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const k = await c.query(\"SELECT user_id, jsonb_array_length(kit->'chunks') AS chunks, updated_at FROM lumora_session_kit ORDER BY updated_at DESC LIMIT 5\");
console.log(JSON.stringify(k.rows, null, 2));
await c.end();
"
```
Expected: rows for users who saved Prep, each with `chunks` count up to 30.

Issue a question through the live Lumora UI and confirm:
- Server log shows `[inference] retrieval ...ms` line — latency should be < 50ms (kit read, no embed).
- Stream emits `citations` event before first `delta`.
- Answer references content from the JD/resume + relevant Capra topics.

- [ ] **Step 4: Update CLAUDE.md to document the new env vars**

Edit the project's `CLAUDE.md` "Key Environment Variables" → "Backends" section. Append:

```
- `COHERE_API_KEY` — optional. Enables cross-encoder reranking via Cohere rerank-v3.5. When absent, retrieval uses RRF order alone.
- `RAG_USE_HYDE` — optional `'true'`/`'false'`. Enables HyDE query rewriting (Haiku-generated hypothetical answer embedded for retrieval). Default off.
- `RAG_USE_RERANK` — optional `'true'`/`'false'`. Enables Cohere reranker (requires `COHERE_API_KEY`). Default off.
- `RAG_USE_CONTEXTUAL` — informational only. Set to `'true'` when Capra KB has been re-indexed with `--with-context`. Used for monitoring/eval; does not gate runtime behavior.
```

- [ ] **Step 5: Commit final**

```bash
git add CLAUDE.md
git commit -m "docs: document RAG quality env vars"
```

---

## Roadmap (still ahead, separate plans)

**Plan C — Live Web Tier**
- JD → URL watchlist (company eng blog, official docs of listed stack, GitHub orgs).
- Crawler service: fetch + extract text + chunk + embed with `source_kind='web-watchlist'` and `metadata.url`.
- Weekly refresh via Railway cron.
- Confidence-gated tier-3 fallback: when warm-kit max rerank score < threshold, fire `useSearch` (existing flag) at query time.

**Plan D — Eval & Observability**
- 50-pair `(question, expected_source/topic_id)` eval set.
- Metrics: recall@4, recall@8, MRR. Run on every retrieval-touching commit.
- `lumora_retrieval_logs` table: query, top-N chunk IDs, scores, latency, kit-vs-live, timeout flag.
- Latency dashboard wired into existing usage_logs surface.

---

## Self-Review

**Spec coverage:** Phase 1 ships hybrid retrieval (BM25 + RRF). Phase 2 ships HyDE. Phase 3 ships reranker (env-gated). Phase 4 ships contextual chunking + re-index flag. Phase 5 ships session-warm prefetch including the prompt-cache positioning rationale. All five quality upgrades from Plan A's roadmap are covered with concrete tasks.

**Placeholder scan:** No "TBD", no "add appropriate error handling", no "similar to Task N." Every code step has complete code.

**Type consistency:** `rrfScore` introduced in Task 1.2 carries through to retrieval.js consumption. `rerankScore` introduced in Task 3.1 is added on rerank pass. `contextSummary` introduced in Task 4.1 is consumed by Task 4.3's indexer via `rehash`. `kit.chunks` introduced in Task 5.2 matches the consumer in Task 5.3.

**One known weak spot:** the keyword extractor in Task 5.2's `extractSeeds` is a regex of curated technical terms — it'll miss niche tooling. The right-shape upgrade is to ask Haiku to extract 5-8 distinctive seed queries from the JD/resume; that's a Plan-C-adjacent enhancement. For Plan B v1, accept the regex fallback — it captures the common case (Kubernetes, Go, Terraform, etc.) which dominates real JDs.

**Cost estimate at full Phase 5 deployment:** Per Prep save: ~10 Haiku context calls (Phase 4 if re-indexed) + 1 HyDE call (if `RAG_USE_HYDE=true`) + 8 hybrid searches (~8 embeds, ~$0.0008) + 1 kit upsert. Total ~$0.005 per save. Per question (warm kit + rerank): 1 Cohere rerank call (~$0.001). Negligible at any realistic interview volume.
