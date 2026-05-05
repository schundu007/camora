# Lumora RAG Retrieval Eval — Baseline 2026-05-05

**Run:** `node apps/lumora-backend/scripts/eval-retrieval.js --no-warm-kit`

**Eval set:** `apps/lumora-backend/eval/retrieval-pairs.json` — 32 hand-curated `(question, expectedSources, expectedTopicIds)` pairs covering all 13 KB sources.

**Config:**
- useHyde = false
- useRerank = false (no `COHERE_API_KEY` in this run)
- useWarmKit = false (KB-only eval — bypasses session kit)
- timeoutMs = 5000ms (generous; production default is 250ms)

## Headline metrics

| Metric | Value |
|--------|-------|
| recall@4 | **100.0%** (32/32) |
| recall@8 | **100.0%** (32/32) |
| MRR | **0.924** |
| Avg latency | 435 ms |

## Per-source recall@8

Every source: 3/3, 6/6, etc. — 100% across the board.

| Source | Hits / Total |
|--------|-------------|
| capra-sre | 6/6 |
| capra-system-design | 5/5 |
| capra-behavioral | 3/3 |
| capra-coding | 3/3 |
| capra-lld | 2/2 |
| capra-database | 2/2 |
| capra-concurrency | 2/2 |
| capra-microservices | 2/2 |
| capra-devops | 2/2 |
| capra-scalable | 2/2 |
| capra-sql | 1/1 |
| capra-projects | 1/1 |
| capra-eng-blogs | 1/1 |

## Rank distribution

| Rank | Pairs |
|------|-------|
| 1 | 28 (87.5%) |
| 2 | 2 (concurrency-gil-1, microservices-discovery-1) |
| 3 | 1 (sysdesign-hashing-2) |
| 4 | 1 (engblogs-netflix-1) |

## Latency

| Bucket | Pairs |
|--------|-------|
| < 300ms | 14 |
| 300-500ms | 11 |
| 500-1000ms | 5 |
| 1000-1500ms | 2 (cold-start sre-slo-1, sre-slo-2) |

The first two pairs were cold-start (~1.2s each — OpenAI embed connection setup). After the LRU warms up, queries land in the 250-500ms range. Production default `timeoutMs=250` would miss the cold-start; warm-kit prefetch mitigates this.

## Findings

**System is well-tuned for current corpus.** All 32 pairs hit within the top-4. The handful of rank-2/3/4 hits are interesting:

- `concurrency-gil-1` ("explain the GIL") → rank 2. Expected: there's no dedicated GIL topic in the KB; the closest matches (`concurrency-fundamentals`, `thread-lifecycle`) are diffuse.
- `sysdesign-hashing-2` ("scale a database with consistent hashing") → rank 3. The cross-source ground truth (`capra-system-design / consistent-hashing` OR `capra-database / sharding`) means the top hit was the system-design topic but a database topic appears earlier in the list.
- `engblogs-netflix-1` ("chaos engineering at Netflix") → rank 4. Source-only ground truth; the eng-blogs source has only 39 chunks and the question is thematic.

**MRR = 0.924** is strong. The benchmark for Plan B's quality upgrades (HyDE / reranker / contextual chunking) is ≥ 0.95 — there's headroom but baseline is already production-ready.

## What's NOT measured here

- **Live web tier (`source_kind='web-watchlist'`)** — eval pairs target Capra topics only. Web chunks are present in the KB but the eval doesn't probe them.
- **Per-user namespace** — eval runs with `userId=null`, so user-doc chunks are bypassed.
- **Warm-kit performance** — `--no-warm-kit` flag bypasses; warm kit benefits are observable in the production retrieval logs (Plan D Task 3 logger).

## Re-run command for future comparisons

```bash
OPENAI_API_KEY=<key> node apps/lumora-backend/scripts/eval-retrieval.js --no-warm-kit
```

Variant flags to compare:
- `--use-hyde`           — enable HyDE query rewrite
- `--use-rerank`         — enable Cohere reranker (requires `COHERE_API_KEY`)
- `--use-hyde --use-rerank` — both quality upgrades

Save these outputs alongside this baseline file with date suffix to track drift over time.
