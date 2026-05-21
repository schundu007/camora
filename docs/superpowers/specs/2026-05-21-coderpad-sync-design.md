# CoderPad Question Sync — Design Spec

**Date:** 2026-05-21  
**Scope:** Import CoderPad question bank into Camora Problem Library (Phase 1: Code; Phase 2: MCQ)

---

## Problem

CoderPad hosts 1,481 Code questions and 3,363 MCQ questions that would enrich the Camora Problem Library. The library currently has 750 problems in `problems-full.json`. We need a reliable, re-runnable script that imports new questions without duplicating existing ones.

---

## Architecture

### Approach: Playwright API Interceptor

CoderPad is a React SPA. Rather than scraping DOM (fragile, breaks on layout changes), we intercept the internal JSON API calls the SPA makes to its own backend. Playwright logs in with user credentials, then we capture the paginated `GET /api/v1/question_items` JSON responses mid-flight. Subsequent detail fetches use the session cookie directly via `fetch`/HTTP — no need to navigate individual question pages.

This gives us structured JSON from the source of truth, with no HTML parsing.

---

## File Structure

```
scripts/coderpad-sync/
  sync.js              # CLI entry point + orchestration
  scraper.js           # Playwright login + API interception
  transform.js         # CoderPad schema → Camora schema
  dedup.js             # 3-layer deduplication
  coderpad-state.json  # Committed state file (imported IDs, counts, lastSync)
  .env.example         # Credential template
```

**Output targets:**
- Phase 1 (Code): `apps/camora/src/data/capra/problems-full.json`
- Phase 2 (MCQ): `apps/camora/src/data/capra/mcq-problems.json` (new file)

---

## Phase 1: Code Questions (1,481)

### Scraper Flow

1. Launch Playwright (headful for auth, headless after)
2. Navigate to `https://screen.coderpad.io` and log in
3. Intercept all `GET /api/v1/question_items*` requests
4. Paginate through the full list (filtering `type=code`)
5. Capture raw JSON → `coderpad-raw-code.json` (temp file)
6. For each question, optionally fetch detail page via session cookie

### Schema Mapping: Code Questions

| CoderPad field | Camora field | Notes |
|---|---|---|
| `id` | `coderpadId` | String |
| `title` | `title` | Direct |
| `language` | `language` | `"Python 3"` → `"python"`, `"JavaScript"` → `"javascript"`, `"SQL"` → `"sql"`, etc. |
| puzzle icon count | `difficulty` | 1 icon → `"easy"`, 2 → `"medium"`, 3 → `"hard"` |
| `description` | `description` | Strip HTML if present |
| `tags` | `tags` | Pass through |
| — | `source` | Always `"coderpad"` |
| — | `slug` | `slugify(title)` |
| — | `category` | Derived from language/tags |

**New fields added to existing `problems-full.json` schema:**
- `coderpadId: string` — present only on CoderPad-sourced problems
- `source: "coderpad" | "manual"` — defaults to `"manual"` on existing problems
- `difficulty: "easy" | "medium" | "hard"` — already present on some problems

### Domain → Category mapping

| CoderPad domain | Camora category |
|---|---|
| Python | python |
| JavaScript | javascript |
| SQL | sql |
| Java | java |
| C++ | cpp |
| Go | go |
| Data Structures | dsa |
| Algorithms | dsa |
| (no domain) | general |

---

## Phase 2: MCQ Questions (3,363)

Runs immediately after Phase 1 completes (same sync run, or separately with `--phase mcq`).

### New File: `mcq-problems.json`

```json
{
  "version": 1,
  "lastSync": "2026-05-21T...",
  "count": 3363,
  "problems": [
    {
      "id": "mcq_coderpad_12345",
      "coderpadId": "12345",
      "source": "coderpad",
      "title": "What does Array.prototype.flat() do?",
      "domain": "javascript",
      "difficulty": "easy",
      "question": "...",
      "choices": [
        { "id": "a", "text": "Flattens nested arrays" },
        { "id": "b", "text": "Sorts the array" },
        { "id": "c", "text": "Reverses the array" },
        { "id": "d", "text": "Maps over each element" }
      ],
      "correctAnswer": "a",
      "explanation": "...",
      "tags": []
    }
  ]
}
```

---

## Deduplication (3 Layers)

1. **CoderPad ID**: If `coderpadId` already exists in problems-full.json or coderpad-state.json → skip
2. **Slug match**: `slugify(title)` matches an existing problem's `slug` → skip
3. **Fuzzy title**: Levenshtein similarity ≥ 85% against existing titles → skip (log as potential duplicate for review)

State file `coderpad-state.json` is committed to the repo and tracks:
```json
{
  "lastSync": "2026-05-21T10:00:00Z",
  "importedCodeIds": ["12345", "67890"],
  "importedMcqIds": ["11111"],
  "codeProblemCount": 1481,
  "mcqProblemCount": 3363
}
```

---

## Rate Limiting

- 200ms between API calls (5 req/s)
- Total for 1,481 code questions ≈ 5 minutes
- Total for 3,363 MCQ questions ≈ 12 minutes

---

## Run Command

```bash
# Phase 1: Code questions only
node scripts/coderpad-sync/sync.js --phase code --email you@x.com --password xxx

# Phase 2: MCQ questions only
node scripts/coderpad-sync/sync.js --phase mcq --email you@x.com --password xxx

# Both phases (default)
node scripts/coderpad-sync/sync.js --email you@x.com --password xxx

# Dry run (no writes)
node scripts/coderpad-sync/sync.js --phase code --email you@x.com --password xxx --dry-run
```

Credentials can also be set via `.env`:
```
CODERPAD_EMAIL=you@x.com
CODERPAD_PASSWORD=xxx
```

---

## Error Handling

- Auth failure → exit early with clear error message
- API rate limit (429) → exponential backoff up to 3 retries
- Network error → save progress checkpoint, resume from last page
- Duplicate detection → log to `coderpad-sync.log`, continue
- Transform error on individual question → log + skip, continue rest

---

## What Is NOT in Scope

- Building the Quiz Playground UI — separate future task after MCQ data is imported
- Syncing CoderPad Projects or Games (only Code and MCQ types)
- Real-time sync / webhook — this is a one-shot CLI script
- Automatic scheduling (no cron) — user runs manually when needed
