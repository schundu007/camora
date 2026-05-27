# HackerRank Full Descriptions Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 367 truncated ~80-char descriptions in `devopsChallengesData.js` with full rich-text HTML fetched from the HackerRank Work API, and update the detail view to render HTML properly.

**Architecture:** CDP cookie extraction from Chrome → HackerRank Work REST API probe to confirm endpoint → batch fetch all 367 question bodies → rewrite data file → update `DevopsChallengeDetail.jsx` to render `dangerouslySetInnerHTML` with scoped prose CSS.

**Tech Stack:** Node.js ESM, Chrome DevTools Protocol (WebSocket), native `fetch`, `ws` npm package, React 19 + inline styles.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `scripts/hackerrank-sync/package.json` | ESM package config |
| Create | `scripts/hackerrank-sync/extract-cookies.js` | CDP → `.hackerrank-cookies.json` |
| Create | `scripts/hackerrank-sync/probe-api.js` | Discover correct question detail endpoint |
| Create | `scripts/hackerrank-sync/sync.js` | Batch fetch all 367 descriptions, write checkpoint JSON |
| Create | `scripts/hackerrank-sync/write-data.js` | Patch `devopsChallengesData.js` from checkpoint JSON |
| Modify | `apps/camora/src/components/capra/docs/DevopsChallengeDetail.jsx:216-230` | Replace `<p>{challenge.description}</p>` with HTML renderer |

---

## Task 1: Scaffold `scripts/hackerrank-sync/`

**Files:**
- Create: `scripts/hackerrank-sync/package.json`

- [ ] **Step 1: Create the package**

```bash
mkdir -p /Users/chundu/camora/scripts/hackerrank-sync
```

Create `scripts/hackerrank-sync/package.json`:
```json
{
  "name": "hackerrank-sync",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "extract": "node extract-cookies.js",
    "probe": "node probe-api.js",
    "sync": "node sync.js",
    "write": "node write-data.js"
  },
  "dependencies": {
    "ws": "^8.17.0"
  }
}
```

- [ ] **Step 2: Install deps**

```bash
cd /Users/chundu/camora/scripts/hackerrank-sync && npm install
```

Expected: `node_modules/` created, `ws` installed.

- [ ] **Step 3: Commit scaffold**

```bash
cd /Users/chundu/camora
git add scripts/hackerrank-sync/package.json scripts/hackerrank-sync/package-lock.json
git commit -m "feat(hackerrank-sync): scaffold package"
```

---

## Task 2: Write `extract-cookies.js`

**Files:**
- Create: `scripts/hackerrank-sync/extract-cookies.js`

- [ ] **Step 1: Create the file**

Create `scripts/hackerrank-sync/extract-cookies.js`:
```js
#!/usr/bin/env node
/**
 * Extracts HackerRank Work session cookies from Chrome via CDP.
 * Saves to .hackerrank-cookies.json for use by sync.js.
 * Usage: node extract-cookies.js
 */
import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_OUT = join(__dirname, '.hackerrank-cookies.json');
const CDP_PORT = 9226;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`); } catch {}
  await sleep(500);

  const tmp = join(tmpdir(), `hr-cdp-${Date.now()}`);
  mkdirSync(join(tmp, 'Default'), { recursive: true });
  try { copyFileSync(join(PROFILE, 'Cookies'), join(tmp, 'Default', 'Cookies')); } catch {}

  console.log('Launching headless Chrome on port', CDP_PORT, '...');
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmp}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--disable-background-networking',
  ], { stdio: 'ignore', detached: true });
  chrome.unref();

  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try { if ((await fetch(`http://localhost:${CDP_PORT}/json/version`)).ok) { ready = true; break; } } catch {}
  }
  if (!ready) throw new Error('Chrome CDP not ready after 10s');
  console.log('Chrome CDP ready.');

  const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
  });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  const sendS = (method, params) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  await sendS('Network.enable', {});
  console.log('Navigating to HackerRank Work library...');
  await sendS('Page.navigate', { url: 'https://www.hackerrank.com/work/library/tests' });
  await sleep(8000);

  const { result: { cookies } } = await sendS('Network.getAllCookies', {});
  const relevant = (cookies || []).filter(c =>
    c.domain.includes('hackerrank.com')
  );

  ws.close();
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`); } catch {}
  try { execSync(`rm -rf "${tmp}"`); } catch {}

  if (relevant.length === 0) {
    throw new Error('No HackerRank cookies found — make sure you are logged into hackerrank.com in Chrome Profile 2');
  }

  const cookieStr = relevant.map(c => `${c.name}=${c.value}`).join('; ');
  writeFileSync(COOKIES_OUT, JSON.stringify({ cookieStr, extractedAt: new Date().toISOString() }, null, 2));
  console.log(`Saved ${relevant.length} cookies to ${COOKIES_OUT}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
```

- [ ] **Step 2: Make sure you are logged into HackerRank Work in Chrome Profile 2**

Open Chrome (the profile at `~/Library/Application Support/Google/Chrome/Profile 2`) and verify you are logged into `https://www.hackerrank.com/work/library/tests`.

- [ ] **Step 3: Run extract-cookies**

```bash
cd /Users/chundu/camora/scripts/hackerrank-sync && node extract-cookies.js
```

Expected output:
```
Launching headless Chrome on port 9226 ...
Chrome CDP ready.
Navigating to HackerRank Work library...
Saved XX cookies to .../hackerrank-sync/.hackerrank-cookies.json
```

Verify: `cat .hackerrank-cookies.json` should show a `cookieStr` with `hackerrank` tokens (non-empty).

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora
git add scripts/hackerrank-sync/extract-cookies.js
git commit -m "feat(hackerrank-sync): add CDP cookie extractor"
```

---

## Task 3: Write `probe-api.js` and discover the question endpoint

**Files:**
- Create: `scripts/hackerrank-sync/probe-api.js`

- [ ] **Step 1: Create probe script**

Create `scripts/hackerrank-sync/probe-api.js`:
```js
#!/usr/bin/env node
/**
 * Probes HackerRank Work API endpoints to find the question detail endpoint.
 * Run once, note the working endpoint + response shape, then delete this file.
 * Usage: node probe-api.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { cookieStr } = JSON.parse(readFileSync(join(__dirname, '.hackerrank-cookies.json'), 'utf8'));

// Sample IDs from devopsChallengesData.js
const SAMPLE_IDS = ['1802015', '860700', '1091837', '1162127'];

const CANDIDATES = [
  id => `https://www.hackerrank.com/work/api/v3/questions/${id}`,
  id => `https://www.hackerrank.com/work/api/v1/questions/${id}`,
  id => `https://www.hackerrank.com/work/api/v3/library/questions/${id}`,
  id => `https://www.hackerrank.com/rest/contests/master/challenges/${id}`,
];

const HEADERS = {
  Cookie: cookieStr,
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Referer: 'https://www.hackerrank.com/work/library/tests',
};

async function probe(urlFn, id) {
  const url = urlFn(id);
  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { url, status: res.status, hasJson: !!json, keys: json ? Object.keys(json).slice(0, 8) : [], preview: text.slice(0, 200) };
  } catch (e) {
    return { url, status: 'error', error: e.message };
  }
}

async function main() {
  const id = SAMPLE_IDS[0];
  console.log(`\nProbing with question ID: ${id}\n`);
  for (const urlFn of CANDIDATES) {
    const result = await probe(urlFn, id);
    console.log(`\n--- ${result.url} ---`);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log(`JSON keys: ${result.keys.join(', ')}`);
      console.log(`Preview: ${result.preview}`);
    } else {
      console.log(`Preview: ${result.preview || result.error}`);
    }
  }

  console.log('\n\n--- Testing working endpoint with all sample IDs ---');
  // Try the v3 endpoint as primary, print body field names
  const url = `https://www.hackerrank.com/work/api/v3/questions/${id}`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 200) {
    const json = await res.json();
    console.log('Full response keys (top level):', Object.keys(json));
    // Drill down to find description/body fields
    const data = json.data || json.question || json;
    console.log('Data keys:', Object.keys(data));
    const attrs = data.attributes || data;
    console.log('Attribute keys:', Object.keys(attrs).slice(0, 20));
    const descField = ['body_html', 'body', 'description', 'description_html', 'preview'].find(k => attrs[k]);
    console.log(`\nDescription field name: "${descField}"`);
    if (descField) console.log(`Description preview (200 chars): ${String(attrs[descField]).slice(0, 200)}`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
```

- [ ] **Step 2: Run the probe**

```bash
cd /Users/chundu/camora/scripts/hackerrank-sync && node probe-api.js
```

Expected: One of the candidate URLs returns status 200 with JSON containing a description/body field. Note:
- Which URL pattern returned 200
- The exact field name containing the description (e.g., `body_html`, `body`, `description`)
- Whether the content is HTML or plain text

- [ ] **Step 3: Update sync.js constants (next task) with confirmed endpoint + field name**

Write down the working URL template and field name — you will use them in `sync.js` Task 4.

---

## Task 4: Write `sync.js`

**Files:**
- Create: `scripts/hackerrank-sync/sync.js`

> **Before writing this file:** Replace `QUESTION_URL` and `BODY_FIELD` constants below with what `probe-api.js` confirmed.

- [ ] **Step 1: Create sync.js**

Create `scripts/hackerrank-sync/sync.js`:
```js
#!/usr/bin/env node
/**
 * Fetches full question descriptions from HackerRank Work API for all 367 IDs
 * in devopsChallengesData.js. Saves to hackerrank-descriptions.json (checkpoint).
 * Run write-data.js after this to patch devopsChallengesData.js.
 *
 * Usage: node sync.js
 * Resume: re-run — already-fetched IDs are skipped via checkpoint file.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_FILE = join(__dirname, '.hackerrank-cookies.json');
const DATA_FILE = join(__dirname, '../../apps/camora/src/data/capra/topics/devopsChallengesData.js');
const CHECKPOINT_FILE = join(__dirname, 'hackerrank-descriptions.json');

// ── CONFIGURE AFTER RUNNING probe-api.js ─────────────────────────────────────
// Replace with the URL template that returned 200 in probe-api.js:
const QUESTION_URL = id => `https://www.hackerrank.com/work/api/v3/questions/${id}`;
// Replace with the field name containing the description from probe-api.js:
const BODY_FIELD = 'body_html';   // e.g. 'body_html', 'body', 'description'
// ──────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 500; // 2 req/sec
const CHECKPOINT_INTERVAL = 50;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractIds(dataFileContent) {
  const matches = [...dataFileContent.matchAll(/id:\s*'hr-devops-(\d+)'/g)];
  return matches.map(m => m[1]);
}

function getField(json, fieldName) {
  // Try top-level, then .data, then .data.attributes
  if (json[fieldName]) return json[fieldName];
  if (json.data) {
    if (json.data[fieldName]) return json.data[fieldName];
    if (json.data.attributes?.[fieldName]) return json.data.attributes[fieldName];
  }
  if (json.question?.[fieldName]) return json.question[fieldName];
  return null;
}

async function main() {
  if (!existsSync(COOKIES_FILE)) throw new Error('Run extract-cookies.js first');
  const { cookieStr } = JSON.parse(readFileSync(COOKIES_FILE, 'utf8'));

  const dataContent = readFileSync(DATA_FILE, 'utf8');
  const ids = extractIds(dataContent);
  console.log(`Found ${ids.length} question IDs in devopsChallengesData.js`);

  // Load checkpoint
  const checkpoint = existsSync(CHECKPOINT_FILE)
    ? JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'))
    : {};
  const alreadyFetched = Object.keys(checkpoint).length;
  if (alreadyFetched > 0) console.log(`Resuming — ${alreadyFetched} already fetched, skipping those.`);

  const headers = {
    Cookie: cookieStr,
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    Referer: 'https://www.hackerrank.com/work/library/tests',
  };

  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (checkpoint[id] !== undefined) continue; // already fetched

    const url = QUESTION_URL(id);
    let body = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { headers });
        if (res.status === 429) {
          console.log(`  Rate limited on ${id}, backing off 10s...`);
          await sleep(10000);
          continue;
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Auth error (${res.status}) — re-run extract-cookies.js`);
        }
        if (res.status === 404) {
          console.warn(`  404 for ID ${id} — skipping`);
          body = '__NOT_FOUND__';
          break;
        }
        if (!res.ok) {
          console.warn(`  HTTP ${res.status} for ID ${id} — will retry`);
          await sleep(2000);
          continue;
        }
        const json = await res.json();
        body = getField(json, BODY_FIELD);
        if (!body) {
          // Log available fields to help debug field name mismatch
          const topKeys = Object.keys(json);
          console.warn(`  No "${BODY_FIELD}" in response for ${id}. Top keys: ${topKeys.join(', ')}`);
          body = '__FIELD_MISSING__';
        }
        break;
      } catch (e) {
        if (e.message.includes('Auth error')) throw e;
        console.warn(`  Error fetching ${id}: ${e.message}`);
        await sleep(2000);
      }
    }

    checkpoint[id] = body ?? '__FETCH_FAILED__';
    fetched++;

    // Progress
    process.stdout.write(`\r  [${i + 1}/${ids.length}] fetched: ${fetched}  failed: ${failed}  `);

    // Checkpoint save
    if (fetched % CHECKPOINT_INTERVAL === 0) {
      writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
      console.log(`\n  Checkpoint saved (${fetched} fetched)`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`\n\nDone. ${fetched} fetched, ${failed} failed.`);
  console.log(`Checkpoint: ${CHECKPOINT_FILE}`);
  console.log('Run: node write-data.js');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
```

- [ ] **Step 2: Commit**

```bash
cd /Users/chundu/camora
git add scripts/hackerrank-sync/sync.js scripts/hackerrank-sync/probe-api.js
git commit -m "feat(hackerrank-sync): add probe + sync scripts"
```

---

## Task 5: Run sync and inspect checkpoint

- [ ] **Step 1: Run the sync**

```bash
cd /Users/chundu/camora/scripts/hackerrank-sync && node sync.js
```

Expected: Progress counter increments `[1/367] ... [367/367]`. Takes ~3-4 minutes at 2 req/sec.

If you see `No "body_html" in response` warnings for many IDs, the field name is wrong. Stop the run (`Ctrl+C`), check the logged field names, update `BODY_FIELD` in `sync.js`, and re-run (checkpoint will skip already-fetched IDs).

- [ ] **Step 2: Verify checkpoint quality**

```bash
cd /Users/chundu/camora/scripts/hackerrank-sync
node -e "
const c = JSON.parse(require('fs').readFileSync('hackerrank-descriptions.json','utf8'));
const ids = Object.keys(c);
const ok = ids.filter(id => c[id] && !c[id].startsWith('__'));
const notFound = ids.filter(id => c[id] === '__NOT_FOUND__');
const missing = ids.filter(id => c[id] === '__FIELD_MISSING__' || c[id] === '__FETCH_FAILED__');
console.log('Total:', ids.length);
console.log('OK:', ok.length);
console.log('Not found:', notFound.length);
console.log('Field missing / failed:', missing.length);
console.log('Sample OK description (200 chars):', (c[ok[0]] || '').slice(0, 200));
"
```

Expected: `OK: 350+`, `Not found: <15`, `Field missing: 0`. If `Field missing` is high, the `BODY_FIELD` constant is wrong — fix and re-run.

---

## Task 6: Write `write-data.js` and patch `devopsChallengesData.js`

**Files:**
- Create: `scripts/hackerrank-sync/write-data.js`
- Modify: `apps/camora/src/data/capra/topics/devopsChallengesData.js`

- [ ] **Step 1: Create write-data.js**

Create `scripts/hackerrank-sync/write-data.js`:
```js
#!/usr/bin/env node
/**
 * Patches devopsChallengesData.js by replacing truncated description values
 * with full HTML from hackerrank-descriptions.json.
 * Usage: node write-data.js
 */
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '../../apps/camora/src/data/capra/topics/devopsChallengesData.js');
const CHECKPOINT_FILE = join(__dirname, 'hackerrank-descriptions.json');
const BACKUP_FILE = DATA_FILE + '.bak';

function escapeTemplateLiteral(str) {
  // Escape backticks and ${} inside a template literal
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

async function main() {
  const checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
  let content = readFileSync(DATA_FILE, 'utf8');

  // Backup original
  copyFileSync(DATA_FILE, BACKUP_FILE);
  console.log(`Backed up original to ${BACKUP_FILE}`);

  let replaced = 0;
  let skipped = 0;

  // Each problem is exactly one line — process line-by-line for reliability
  const lines = content.split('\n');

  for (const [id, body] of Object.entries(checkpoint)) {
    if (!body || body.startsWith('__')) { skipped++; continue; }

    const escaped = escapeTemplateLiteral(body);
    const idStr = `'hr-devops-${id}'`;
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(idStr)) {
        const updated = lines[i].replace(/description: `[^`]*`/, `description: \`${escaped}\``);
        if (updated !== lines[i]) {
          lines[i] = updated;
          replaced++;
          found = true;
        }
        break;
      }
    }
    if (!found) {
      console.warn(`  Could not find/replace id: hr-devops-${id}`);
      skipped++;
    }
  }

  writeFileSync(DATA_FILE, lines.join('\n'));
  console.log(`\nDone. Replaced: ${replaced}, Skipped: ${skipped}`);
  console.log(`Updated: ${DATA_FILE}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
```

- [ ] **Step 2: Run write-data.js**

```bash
cd /Users/chundu/camora/scripts/hackerrank-sync && node write-data.js
```

Expected:
```
Backed up original to .../devopsChallengesData.js.bak
Done. Replaced: 350+, Skipped: <15
```

- [ ] **Step 3: Verify the data file was patched**

```bash
# Check that descriptions are now longer than 80 chars
grep -oP "description: \`[^\`]{100}" /Users/chundu/camora/apps/camora/src/data/capra/topics/devopsChallengesData.js | wc -l
```

Expected: `350+` lines (problems that now have descriptions longer than 100 chars). Previously all descriptions were ~80 chars so this count would have been 0.

- [ ] **Step 4: Commit data update**

```bash
cd /Users/chundu/camora
git add apps/camora/src/data/capra/topics/devopsChallengesData.js scripts/hackerrank-sync/write-data.js
git commit -m "feat(capra): replace truncated HR descriptions with full content (367 problems)"
```

---

## Task 7: Update `DevopsChallengeDetail.jsx` to render HTML

**Files:**
- Modify: `apps/camora/src/components/capra/docs/DevopsChallengeDetail.jsx:216-230`

- [ ] **Step 1: Read the current section**

Read `DevopsChallengeDetail.jsx` lines 216–230 to confirm the exact current code:
```jsx
{/* Problem description */}
<section>
  <SectionHeading>Problem</SectionHeading>
  <p
    style={{
      fontSize: 15,
      color: 'var(--text-secondary)',
      lineHeight: 1.7,
      marginTop: 0,
      marginBottom: 0,
    }}
  >
    {challenge.description}
  </p>
</section>
```

- [ ] **Step 2: Replace plain-text `<p>` with HTML renderer + scoped CSS**

Replace that entire `{/* Problem description */}` section with:
```jsx
{/* Problem description */}
<section>
  <SectionHeading>Problem</SectionHeading>
  <style>{`
    .hr-problem-body { font-size: 15px; color: var(--text-secondary); line-height: 1.7; }
    .hr-problem-body p { margin: 0 0 12px 0; }
    .hr-problem-body p:last-child { margin-bottom: 0; }
    .hr-problem-body pre { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 12px 16px; overflow-x: auto; margin: 12px 0; }
    .hr-problem-body code { font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
    .hr-problem-body pre code { background: none; padding: 0; }
    .hr-problem-body :not(pre) > code { background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px; font-size: 13px; }
    .hr-problem-body ul, .hr-problem-body ol { padding-left: 20px; margin: 8px 0 12px 0; }
    .hr-problem-body li { margin-bottom: 4px; }
    .hr-problem-body strong { color: var(--text-primary); }
    .hr-problem-body a { color: var(--accent); text-decoration: none; }
    .hr-problem-body a:hover { text-decoration: underline; }
    .hr-problem-body h3, .hr-problem-body h4 { color: var(--text-primary); margin: 16px 0 8px 0; font-size: 14px; }
  `}</style>
  <div
    className="hr-problem-body"
    dangerouslySetInnerHTML={{ __html: challenge.description }}
  />
</section>
```

- [ ] **Step 3: Handle plain-text fallback**

If `challenge.description` is plain text (not HTML — some problems may not have HTML), it will render without tags but still display correctly as raw text. No extra handling needed.

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora
git add apps/camora/src/components/capra/docs/DevopsChallengeDetail.jsx
git commit -m "feat(capra): render HR problem descriptions as HTML with prose styles"
```

---

## Task 8: Build, verify, push

- [ ] **Step 1: Run Vite build to catch any errors**

```bash
cd /Users/chundu/camora && npx vite build --config apps/camora/vite.config.ts 2>&1 | tail -20
```

Expected: `built in Xs` with no errors. If there are template literal parse errors in `devopsChallengesData.js`, the `escapeTemplateLiteral` function in `write-data.js` missed something — manually fix the offending line.

- [ ] **Step 2: Run dev server and verify in browser**

```bash
cd /Users/chundu/camora && pnpm dev:camora
```

Open `http://localhost:3000/capra/prepare?page=devops&topic=devops-coding-challenges`, click a problem, confirm:
- Description is now full (not 80-char truncated)
- Code blocks render with monospace font and dark background
- Paragraphs have proper spacing

- [ ] **Step 3: Pull, push, deploy**

```bash
cd /Users/chundu/camora && git pull && git push
```

- [ ] **Step 4: Delete probe-api.js (one-shot script, no longer needed)**

```bash
cd /Users/chundu/camora
git rm scripts/hackerrank-sync/probe-api.js
git commit -m "chore: remove one-shot probe script"
git push
```

---

## Post-Sync Cleanup

`scripts/hackerrank-sync/.hackerrank-cookies.json` — already in `.gitignore` (add it if not). Never commit cookies.  
`devopsChallengesData.js.bak` — delete after verifying the build is clean.  
`hackerrank-descriptions.json` — keep locally as a re-run cache; add to `.gitignore`.
