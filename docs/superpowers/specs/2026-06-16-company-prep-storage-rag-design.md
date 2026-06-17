# Company Prep Storage & RAG — Design Spec

**Date:** 2026-06-16
**Status:** Approved

## Overview

Store company prep documents in Cloudflare R2 (platform-owned, not per-user Drive OAuth) and index them into the existing Lumora RAG pipeline so Sona can retrieve research docs, JD notes, and prep context during live interviews. Structured prep data (Prep Kit JSON) also auto-syncs to R2 as a durable backup alongside raw file uploads.

---

## Architecture

```
User uploads PDF / saves Prep Kit
        │
        ▼
ascend-backend
  POST /api/v1/prep/docs/upload
  ├── write file → R2  camora-prep-docs/users/{id}/companies/{slug}/
  ├── insert metadata → PostgreSQL  user_company_docs
  └── call lumora-backend  POST /internal/reindex-doc

Prep Kit auto-save (existing POST /api/v1/prep/save)
  └── also write prep_state.json → R2  (fire-and-forget, non-blocking)

Live interview (hot path — unchanged)
  hybridRetrieval.js → lumora_user_doc_chunks → Sona answer
```

Both ascend-backend and lumora-backend need R2 read access. Only ascend-backend writes.

**New env vars** (both backends):
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` (value: `camora-prep-docs`)

---

## Storage Structure

### R2 Bucket Layout

```
camora-prep-docs/
  users/{user_id}/
    companies/{company_slug}/
      prep_state.json          ← Prep Kit JSON (JD, cover letter, generated sections)
      resume_{resume_id}.txt   ← active resume snapshot at prep-save time
      {uuid}_{original_name}   ← user-uploaded files (PDF, DOCX, TXT, MD)
```

`company_slug` is URL-safe lowercase of the company name (e.g. `nvidia`, `google-deepmind`). UUID prefix on upload filenames prevents collisions.

### PostgreSQL Table (ascend-backend migration)

```sql
CREATE TABLE IF NOT EXISTS user_company_docs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  company_slug TEXT NOT NULL,
  filename     TEXT NOT NULL,
  r2_key       TEXT NOT NULL UNIQUE,
  mime_type    TEXT,
  size_bytes   INTEGER,
  doc_type     TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'prep_state' | 'resume'
  indexed_at   TIMESTAMP,
  uploaded_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_company_docs_user_company
  ON user_company_docs(user_id, company_slug);
```

**Limits:** 10 MB per file, 50 files per user total. Enforced in the upload endpoint.

---

## API Endpoints

### ascend-backend — new routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/prep/docs/upload` | Multipart upload (file + company_slug). Stores to R2, inserts metadata row, triggers reindex. Returns `{ id, filename, r2_key, size_bytes }`. |
| `GET` | `/api/v1/prep/docs?company_slug=nvidia` | List metadata rows for user + company. No file content. |
| `DELETE` | `/api/v1/prep/docs/:id` | Delete from R2 + metadata row + trigger chunk removal in lumora. |
| `GET` | `/api/v1/prep/docs/:id/download` | Returns presigned R2 URL (15-min TTL). Never proxies file bytes. |

**Existing route change:** `POST /api/v1/prep/save` — after the existing PostgreSQL write, fire-and-forget write of `prep_state.json` to R2. Does not block the response.

**`indexed_at` update flow:** ascend-backend fires `POST /internal/reindex-doc` without awaiting (fire-and-forget). lumora-backend calls `PUT /internal/docs/mark-indexed` (body: `{ r2_key }`) on ascend-backend upon successful indexing, which sets `indexed_at = NOW()` on the `user_company_docs` row. This endpoint is also protected by `X-API-Key`.

### lumora-backend — new internal routes

Protected by `X-API-Key` header (same `AI_SERVICES_API_KEY` pattern as camora-ai). Not exposed to frontend or rate-limited.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/reindex-doc` | Body: `{ r2_key, user_id, company_slug }`. Fetches from R2, parses text, chunks + embeds, upserts `lumora_user_doc_chunks`. Returns `{ success: true }` on completion. |
| `POST` | `/internal/remove-doc-chunks` | Body: `{ r2_key }`. Deletes all `lumora_user_doc_chunks` WHERE `source_key = r2_key`. |

---

## Frontend UI

**Prep Kit page** — new "Research Docs" card below the JD/Cover Letter cards:

```
┌─ Research Docs ──────────────────────────────────────┐
│  NVIDIA Isaac  ·  3 files  ·  Last synced 2m ago      │
│                                                        │
│  📄 nvidia_jd_notes.pdf          142 KB   [Delete]    │
│  📄 glassdoor_nvidia_2025.pdf    890 KB   [Delete]    │
│  📄 isaac_ros_architecture.txt    18 KB   [Delete]    │
│                                                        │
│  [+ Upload Document]   (10 MB max · PDF, DOCX, TXT)   │
└────────────────────────────────────────────────────────┘
```

- Upload uses existing `multipart/form-data` pattern (same as resume upload)
- Delete triggers `dialogConfirm` before removing
- "Last synced" = most recent `indexed_at` across the file list
- Prep state auto-sync is silent — no UI indicator (fire-and-forget)
- At 50-file cap: upload button disabled with "Storage limit reached"

**No live interview UI changes** — RAG retrieval surfaces through Sona's answers transparently.

---

## RAG Integration

The existing `lumora_user_doc_chunks` table and `hybridRetrieval.js` pipeline are unchanged. The only addition is a new `source_key` column (R2 key) on `lumora_user_doc_chunks` to support targeted chunk deletion when a file is removed.

```sql
ALTER TABLE lumora_user_doc_chunks
  ADD COLUMN IF NOT EXISTS source_key TEXT;
CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_source_key
  ON lumora_user_doc_chunks(source_key);
```

Re-indexing is triggered on: file upload, file delete (remove chunks), and prep-save (overwrites `prep_state.json` + re-indexes it).

---

## Error Handling

- R2 write failure on upload → 500, do not insert metadata row (R2 write first, then DB)
- lumora reindex failure → log + mark `indexed_at = NULL`; file still stored, retry possible
- R2 write failure on prep-save → log warning, do not fail the prep-save response (fire-and-forget)
- File too large (>10 MB) → 400 before R2 write
- 50-file cap exceeded → 400 before R2 write

---

## Out of Scope

- Real-time Drive sync or webhooks
- Per-user Google Drive OAuth
- File versioning / history
- Full-text search UI on stored documents
- Mobile app support (web only for now)
