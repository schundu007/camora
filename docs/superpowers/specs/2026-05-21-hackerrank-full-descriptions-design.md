# HackerRank Full Problem Description Scraper

**Date:** 2026-05-21  
**Scope:** Replace 367 truncated descriptions in `devopsChallengesData.js` with full rich-text content from HackerRank Work API. Update UI renderer to display HTML/markdown correctly.

---

## Problem

`apps/camora/src/data/capra/topics/devopsChallengesData.js` has 367 problems with `description` fields truncated at ~80 characters. The full content lives in HackerRank For Work. Users see incomplete problem statements on `/capra/prepare?page=devops&topic=devops-coding-challenges`.

---

## Architecture

### New: `scripts/hackerrank-sync/`

Three scripts, same CDP pattern as `scripts/coderpad-sync/`:

**`extract-cookies.js`**  
Opens the user's Chrome browser via CDP (port 9222), reads HackerRank Work cookies (`hackerrank_coupa_session`, `_hjSessionUser_*`, and any `__Secure-*` tokens), writes them to `.hackerrank-cookies.json`. Run once before syncing.

**`probe-api.js`** (one-shot discovery, delete after use)  
Makes test requests to candidate HackerRank Work endpoints with the extracted cookies to confirm the correct question detail endpoint and response shape. Candidate: `GET https://www.hackerrank.com/work/api/v3/questions/{id}`.

**`sync.js`** (main)  
- Reads `.hackerrank-cookies.json`
- Reads all 367 IDs from `devopsChallengesData.js` (regex extract numeric portion)
- For each ID, calls the confirmed detail endpoint
- Extracts `description`/`body_html`/`body` field from response (exact field name TBD by probe)
- Writes updated `devopsChallengesData.js` with full descriptions
- Rate-limits to ~2 req/sec to avoid throttling
- Saves a checkpoint JSON (`hackerrank-descriptions.json`) so partial runs can resume

### Modified: `DevopsChallengeDetail.jsx`

Currently renders: `{challenge.description}` (plain text, no formatting).

After: renders description as HTML using `dangerouslySetInnerHTML`. HackerRank Work returns descriptions as HTML (`<p>`, `<pre>`, `<code>`, `<ul>` etc.). We add a `prose` wrapper with scoped CSS to style the HTML — code blocks get monospace + slight highlight, paragraphs get proper line-height.

No external markdown library needed — HTML rendering with `dangerouslySetInnerHTML` is sufficient. No sanitization library needed either (content is from our own authenticated HackerRank account, not user input).

---

## Data Schema

`description` field: **same field name**, just replace truncated value with full HTML string. No migration needed — the data file is static JS, no database involved.

```js
// Before
{ id: 'hr-devops-1802015', ..., description: `As part of the transition to a more automated and efficient deployment process f` }

// After
{ id: 'hr-devops-1802015', ..., description: `<p>As part of the transition to a more automated and efficient deployment process for the "OceanView" project...</p><pre><code>...</code></pre>` }
```

---

## API Discovery Notes

The numeric ID embedded in `hr-devops-{numeric}` is the HackerRank Work question ID. Candidate endpoints (to confirm via probe):
- `GET https://www.hackerrank.com/work/api/v3/questions/{id}`
- `GET https://www.hackerrank.com/work/api/v1/questions/{id}`
- `GET https://www.hackerrank.com/rest/contests/master/challenges/{id}` (public API fallback)

Cookie names to extract from Chrome (HackerRank Work session):
- `hackerrank_coupa_session`
- `remember_hacker_token`
- `__cfduid` or `cf_clearance`

---

## Implementation Order

1. Create `scripts/hackerrank-sync/` package scaffolding
2. Write `extract-cookies.js` (adapt from coderpad version)
3. Write `probe-api.js`, run it, confirm endpoint + field names
4. Write `sync.js` with rate limiting + checkpoint resume
5. Run sync, verify output in `hackerrank-descriptions.json`
6. Write final `devopsChallengesData.js` with full descriptions
7. Update `DevopsChallengeDetail.jsx` renderer (HTML support + scoped prose CSS)
8. Build + verify in browser

---

## Error Handling

- 401/403: re-run `extract-cookies.js`
- 429: back off 10s, retry
- Missing `description` field: keep original truncated value, log warning
- Checkpoint: save after every 50 successful fetches; on resume, skip already-fetched IDs
