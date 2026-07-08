# Playground VM Save/Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users save a running playground VM to Cloudflare R2 and restore it later, gated behind Pro plan with 3 save slots.

**Architecture:** The worker node streams `docker export` output directly to R2 via a backend-generated presigned PUT URL — no VM data routes through the backend server. Restore works in reverse: the worker curls a presigned GET URL and pipes into `docker import`, then runs the imported image. The backend only generates presigned URLs and manages metadata in Postgres.

**Tech Stack:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, `ssh2` (existing), Cloudflare R2 (S3-compatible), Postgres `playground_saved_vms` table, React frontend following existing PlaygroundShell inline-style pattern.

## Global Constraints

- Node >=20; ES modules (`import`/`export`) throughout playground-backend
- No `workspace:*` deps — playground-backend is deployed standalone on Railway
- Pro gate: `plan_type IN ('pro_monthly','pro_yearly','team','lifetime')` or `OWNER_EMAILS` env
- Free tier: 0 save slots. Pro: 3 slots. Owner: unlimited.
- R2 env vars required: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- All new API routes under `/api/v1/playground/saves` with same `jwtAuth` middleware
- Frontend: follow existing PlaygroundShell.jsx inline-style pattern (no Tailwind classes)
- Never say "Capra" or "Lumora" in user-facing strings — say "Playground"

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/playground-backend/package.json` | Modify | Add `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` |
| `apps/playground-backend/src/services/playground/r2Client.js` | Create | R2 S3Client singleton + presigned URL helpers |
| `apps/playground-backend/src/services/playground/vmSaver.js` | Create | SSH: docker export→R2 presigned PUT, R2 presigned GET→docker import |
| `apps/playground-backend/src/routes/playgroundSaves.js` | Create | REST: save, list, restore, delete saved VMs |
| `apps/playground-backend/src/index.js` | Modify | Add `playground_saved_vms` migration + mount saves router |
| `apps/camora/src/hooks/usePlaygroundSession.js` | Modify | Add saves state + saveVm/restoreVm/deleteSave API calls |
| `apps/camora/src/components/capra/playground/SavedVmsPanel.jsx` | Create | Saved VMs list UI (idle picker view) |
| `apps/camora/src/components/capra/playground/PlaygroundShell.jsx` | Modify | Save VM button + dialog + SavedVmsPanel |

---

### Task 1: R2 client + presigned URL helpers

**Files:**
- Create: `apps/playground-backend/src/services/playground/r2Client.js`
- Modify: `apps/playground-backend/package.json`

**Interfaces:**
- Produces:
  - `getR2Client(): S3Client`
  - `presignPut(key: string, expiresIn?: number): Promise<string>`
  - `presignGet(key: string, expiresIn?: number): Promise<string>`
  - `deleteObject(key: string): Promise<void>`
  - `headObject(key: string): Promise<{ContentLength: number}>`

- [ ] **Step 1: Add dependencies**

In `apps/playground-backend/package.json` add inside `"dependencies"`:
```json
"@aws-sdk/client-s3": "^3.600.0",
"@aws-sdk/s3-request-presigner": "^3.600.0"
```

Run:
```bash
pnpm install --filter @camora/playground-backend
```

- [ ] **Step 2: Create r2Client.js**

```js
// apps/playground-backend/src/services/playground/r2Client.js
import { S3Client, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _client = null;

export function getR2Client() {
  if (_client) return _client;
  const id = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!id || !key || !secret) throw new Error('R2 credentials not configured');
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${id}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
  return _client;
}

export function r2Bucket() {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error('R2_BUCKET not configured');
  return b;
}

export async function presignPut(key, expiresIn = 3600) {
  const cmd = new PutObjectCommand({ Bucket: r2Bucket(), Key: key });
  return getSignedUrl(getR2Client(), cmd, { expiresIn });
}

export async function presignGet(key, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: r2Bucket(), Key: key });
  return getSignedUrl(getR2Client(), cmd, { expiresIn });
}

export async function deleteObject(key) {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}

export async function headObject(key) {
  const res = await getR2Client().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
  return { ContentLength: res.ContentLength ?? 0 };
}
```

- [ ] **Step 3: Smoke-test (no real creds needed)**

```bash
node --input-type=module <<'EOF'
import { getR2Client } from './apps/playground-backend/src/services/playground/r2Client.js';
try { getR2Client(); console.log('OK'); } catch(e) { console.log('Expected without creds:', e.message); }
EOF
```

Expected: `Expected without creds: R2 credentials not configured`

- [ ] **Step 4: Commit**

```bash
git add apps/playground-backend/package.json apps/playground-backend/src/services/playground/r2Client.js pnpm-lock.yaml
git commit -m "feat(playground): add R2 client + presigned URL helpers"
```

---

### Task 2: vmSaver — SSH orchestration for export/import

**Files:**
- Create: `apps/playground-backend/src/services/playground/vmSaver.js`

**Interfaces:**
- Consumes: `presignPut`, `presignGet`, `deleteObject`, `headObject` from `./r2Client.js`
- Produces:
  - `exportVmToR2(containerId: string, r2Key: string): Promise<{sizeBytes: number}>`
  - `importVmFromR2(r2Key: string, imageTag: string): Promise<void>`
  - `deleteVmImage(imageTag: string): Promise<void>`
  - `deleteR2Object(r2Key: string): Promise<void>`

- [ ] **Step 1: Create vmSaver.js**

```js
// apps/playground-backend/src/services/playground/vmSaver.js
import { Client } from 'ssh2';
import { presignPut, presignGet, deleteObject, headObject } from './r2Client.js';

const WORKER_HOST = () => process.env.WORKER_HOST || '172.104.210.63';
const WORKER_USER = () => process.env.WORKER_USER || 'pgrunner';

function workerKey() {
  const b64 = process.env.WORKER_SSH_KEY_B64;
  if (!b64) throw new Error('WORKER_SSH_KEY_B64 not configured');
  return Buffer.from(b64, 'base64').toString('utf8');
}

function sshExec(command, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; conn.end(); fn(val); } };
    const timer = setTimeout(() => finish(reject, new Error(`SSH exec timeout`)), timeoutMs);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); return finish(reject, err); }
        let stdout = '', stderr = '';
        stream.on('data', d => { stdout += d; });
        stream.stderr.on('data', d => { stderr += d; });
        stream.on('close', code => {
          clearTimeout(timer);
          if (code !== 0) finish(reject, new Error(`exit ${code}: ${stderr.trim() || stdout.trim()}`));
          else finish(resolve, stdout.trim());
        });
      });
    });
    conn.on('error', err => { clearTimeout(timer); finish(reject, err); });
    conn.connect({
      host: WORKER_HOST(),
      port: parseInt(process.env.WORKER_SSH_PORT || '20022', 10),
      username: WORKER_USER(),
      privateKey: workerKey(),
      readyTimeout: 10_000,
    });
  });
}

export async function exportVmToR2(containerId, r2Key) {
  // 2hr presigned PUT — export can be slow for large containers
  const putUrl = await presignPut(r2Key, 7200);
  // Worker streams docker export directly to R2 — no data routes through backend
  await sshExec(
    `docker export ${containerId} | curl -sf -X PUT -T - -H "Content-Type: application/octet-stream" "${putUrl}"`,
    15 * 60 * 1000
  );
  const { ContentLength } = await headObject(r2Key);
  return { sizeBytes: ContentLength };
}

export async function importVmFromR2(r2Key, imageTag) {
  const getUrl = await presignGet(r2Key, 3600);
  // Worker downloads from R2 and imports — no data routes through backend
  await sshExec(
    `curl -sf "${getUrl}" | docker import - "${imageTag}"`,
    15 * 60 * 1000
  );
}

export async function deleteVmImage(imageTag) {
  try {
    await sshExec(`docker rmi "${imageTag}" 2>/dev/null || true`);
  } catch { /* best effort */ }
}

export async function deleteR2Object(r2Key) {
  try { await deleteObject(r2Key); } catch { /* best effort */ }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground-backend/src/services/playground/vmSaver.js
git commit -m "feat(playground): SSH docker export/import via R2 presigned URLs"
```

---

### Task 3: DB migration + saves REST routes

**Files:**
- Create: `apps/playground-backend/src/routes/playgroundSaves.js`
- Modify: `apps/playground-backend/src/index.js`

**Interfaces:**
- Consumes: `exportVmToR2`, `importVmFromR2`, `deleteVmImage`, `deleteR2Object` from `vmSaver.js`; `query` from `../lib/db.js`; `createSessionRecord`, `updateSessionStatus`, `setTTL` from `sessionStore.js`; `getTaskAddress` from `nomadClient.js`
- Produces REST API:
  - `POST /api/v1/playground/saves` body `{sessionId, name}` → `201 {id, name, environment, sizeBytes, createdAt}`
  - `GET /api/v1/playground/saves` → `{saves: [...], slots: {used, max}}`
  - `POST /api/v1/playground/saves/:id/restore` → `201 {sessionId, expiresAt, environment}`
  - `DELETE /api/v1/playground/saves/:id` → `{ok: true}`

**DB table `playground_saved_vms`:**
```
id               UUID PK
user_id          INTEGER FK users(id)
name             TEXT
environment      TEXT
r2_key           TEXT
size_bytes       BIGINT
created_at       TIMESTAMPTZ
last_restored_at TIMESTAMPTZ nullable
```

- [ ] **Step 1: Add migration in index.js**

Inside `runMigrations()` in `apps/playground-backend/src/index.js`, append after the last existing `await query(...)`:

```js
await query(`CREATE TABLE IF NOT EXISTS playground_saved_vms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  name             TEXT NOT NULL,
  environment      TEXT NOT NULL,
  r2_key           TEXT NOT NULL,
  size_bytes       BIGINT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_restored_at TIMESTAMPTZ
)`);
await query('CREATE INDEX IF NOT EXISTS idx_saved_vms_user ON playground_saved_vms(user_id)');
```

- [ ] **Step 2: Create playgroundSaves.js**

```js
// apps/playground-backend/src/routes/playgroundSaves.js
import { Router } from 'express';
import { randomBytes } from 'crypto';
import { Client } from 'ssh2';
import { query } from '../lib/db.js';
import { createSessionRecord, updateSessionStatus, setTTL } from '../services/playground/sessionStore.js';
import { getTaskAddress } from '../services/playground/nomadClient.js';
import { exportVmToR2, importVmFromR2, deleteVmImage, deleteR2Object } from '../services/playground/vmSaver.js';

export const playgroundSavesRouter = Router();

const PAID_PLANS = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);
const SLOTS = { free: 0, paid: 3, owner: 999 };
const MEM_MB = { ubuntu: 512, docker: 1024, 'agent-sandbox': 1536, 'k8s-single': 2048, 'k8s-multi': 4096, 'cloud-cli': 1536 };

function isOwner(email) {
  return (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).includes((email || '').toLowerCase());
}

function maxSlots(user) {
  if (isOwner(user.email)) return SLOTS.owner;
  if (PAID_PLANS.has(user.plan_type)) return SLOTS.paid;
  return SLOTS.free;
}

function sshRun(command, timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let done = false;
    const finish = (fn, v) => { if (!done) { done = true; conn.end(); fn(v); } };
    const timer = setTimeout(() => finish(reject, new Error('SSH timeout')), timeoutMs);
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); return finish(reject, err); }
        let out = '', errOut = '';
        stream.on('data', d => { out += d; });
        stream.stderr.on('data', d => { errOut += d; });
        stream.on('close', code => {
          clearTimeout(timer);
          if (code !== 0) finish(reject, new Error(errOut.trim() || out.trim()));
          else finish(resolve, out.trim());
        });
      });
    });
    conn.on('error', e => { clearTimeout(timer); finish(reject, e); });
    conn.connect({
      host: process.env.WORKER_HOST || '172.104.210.63',
      port: parseInt(process.env.WORKER_SSH_PORT || '20022', 10),
      username: process.env.WORKER_USER || 'pgrunner',
      privateKey: Buffer.from(process.env.WORKER_SSH_KEY_B64, 'base64').toString('utf8'),
      readyTimeout: 10_000,
    });
  });
}

// POST /api/v1/playground/saves
playgroundSavesRouter.post('/', async (req, res) => {
  const { sessionId, name } = req.body;
  if (!sessionId || !name?.trim()) return res.status(400).json({ error: 'sessionId and name are required' });

  const userId = parseInt(req.user.id, 10);
  const slots = maxSlots(req.user);
  if (slots === 0) return res.status(403).json({ error: 'VM saves require a Pro subscription', upgradeUrl: '/pricing' });

  const { rows: counts } = await query(`SELECT COUNT(*) AS cnt FROM playground_saved_vms WHERE user_id=$1`, [userId]);
  if (parseInt(counts[0].cnt, 10) >= slots) {
    return res.status(429).json({ error: `Save slot limit reached (${slots} max). Delete a saved VM to free a slot.` });
  }

  const { rows: sessions } = await query(`SELECT * FROM playground_sessions WHERE id=$1 AND user_id=$2`, [sessionId, userId]);
  const session = sessions[0];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'ready' && session.status !== 'active') return res.status(400).json({ error: 'Session must be active to save' });
  if (!session.nomad_job_id) return res.status(400).json({ error: 'No container ID for session' });

  const r2Key = `playground-saves/${userId}/${randomBytes(8).toString('hex')}.tar`;
  try {
    const { sizeBytes } = await exportVmToR2(session.nomad_job_id, r2Key);
    const { rows } = await query(
      `INSERT INTO playground_saved_vms (user_id, name, environment, r2_key, size_bytes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, name.trim(), session.environment, r2Key, sizeBytes]
    );
    const saved = rows[0];
    return res.status(201).json({ id: saved.id, name: saved.name, environment: saved.environment, sizeBytes: saved.size_bytes, createdAt: saved.created_at });
  } catch (err) {
    console.error('[PlaygroundSaves] export error:', err.message);
    deleteR2Object(r2Key).catch(() => {});
    return res.status(500).json({ error: 'Failed to save VM: ' + err.message });
  }
});

// GET /api/v1/playground/saves
playgroundSavesRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, environment, size_bytes, created_at, last_restored_at FROM playground_saved_vms WHERE user_id=$1 ORDER BY created_at DESC`,
      [parseInt(req.user.id, 10)]
    );
    return res.json({
      saves: rows.map(r => ({ id: r.id, name: r.name, environment: r.environment, sizeBytes: r.size_bytes, createdAt: r.created_at, lastRestoredAt: r.last_restored_at })),
      slots: { used: rows.length, max: maxSlots(req.user) },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list saves' });
  }
});

// POST /api/v1/playground/saves/:id/restore
playgroundSavesRouter.post('/:id/restore', async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  const { rows } = await query(`SELECT * FROM playground_saved_vms WHERE id=$1 AND user_id=$2`, [req.params.id, userId]);
  const save = rows[0];
  if (!save) return res.status(404).json({ error: 'Saved VM not found' });

  const imageTag = `camora-saved-${save.id}:latest`;
  try {
    await importVmFromR2(save.r2_key, imageTag);

    const mem = MEM_MB[save.environment] || 512;
    const jobTag = randomBytes(6).toString('hex');
    const containerId = await sshRun(
      `docker run -d --rm --memory=${mem}m --hostname playground-${save.environment} -e SESSION_ID=${userId}-${jobTag} -p 0:7681 -p 0:8080 ${imageTag}`
    );
    if (!containerId || containerId.length < 12) throw new Error(`docker run unexpected output: ${containerId}`);

    const { host, ttydPort, codeServerPort } = await getTaskAddress(containerId);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = await createSessionRecord(userId, save.environment, null, containerId, expiresAt, host, ttydPort, codeServerPort);
    await updateSessionStatus(session.id, 'ready');
    await setTTL(session.id, 3600);

    deleteVmImage(imageTag).catch(() => {});
    await query(`UPDATE playground_saved_vms SET last_restored_at=NOW() WHERE id=$1`, [save.id]);

    return res.status(201).json({ sessionId: session.id, expiresAt, environment: save.environment });
  } catch (err) {
    console.error('[PlaygroundSaves] restore error:', err.message);
    deleteVmImage(imageTag).catch(() => {});
    return res.status(500).json({ error: 'Failed to restore VM: ' + err.message });
  }
});

// DELETE /api/v1/playground/saves/:id
playgroundSavesRouter.delete('/:id', async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  const { rows } = await query(`SELECT * FROM playground_saved_vms WHERE id=$1 AND user_id=$2`, [req.params.id, userId]);
  const save = rows[0];
  if (!save) return res.status(404).json({ error: 'Saved VM not found' });
  await query(`DELETE FROM playground_saved_vms WHERE id=$1`, [save.id]);
  deleteR2Object(save.r2_key).catch(() => {});
  return res.json({ ok: true });
});
```

- [ ] **Step 3: Mount saves router in index.js**

Add import at the top of `apps/playground-backend/src/index.js` with other route imports:
```js
import { playgroundSavesRouter } from './routes/playgroundSaves.js';
```

Add mount after the existing `/api/v1/playground/sessions` line:
```js
app.use('/api/v1/playground/saves', jwtAuth, playgroundSavesRouter);
```

- [ ] **Step 4: Commit and push**

```bash
git add apps/playground-backend/src/routes/playgroundSaves.js apps/playground-backend/src/index.js
git pull --rebase && git push
git commit -m "feat(playground): VM save/restore/delete REST API + DB migration"
git pull --rebase && git push
```

---

### Task 4: Set R2 env vars in Railway

- [ ] **Step 1: Create R2 bucket**

In Cloudflare dashboard → R2 → Create bucket named `camora-playground-saves`.
Create an API token with Object Read & Write on that bucket.

- [ ] **Step 2: Set Railway env vars**

```bash
railway variables --service playground-backend set \
  "R2_ACCOUNT_ID=<cloudflare-account-id>" \
  "R2_ACCESS_KEY_ID=<r2-token-access-key>" \
  "R2_SECRET_ACCESS_KEY=<r2-token-secret>" \
  "R2_BUCKET=camora-playground-saves"
```

- [ ] **Step 3: Verify deployment**

```bash
railway logs --service playground-backend 2>&1 | tail -5
```

Expected: `[Migrations] playground tables ensured` then `[Playground] server started on port 3010`

---

### Task 5: Frontend — hook + SavedVmsPanel

**Files:**
- Modify: `apps/camora/src/hooks/usePlaygroundSession.js`
- Create: `apps/camora/src/components/capra/playground/SavedVmsPanel.jsx`

**Interfaces:**
- `usePlaygroundSession` adds to its return: `saves`, `savesLoading`, `slotsUsed`, `slotsMax`, `saveVm(sessionId, name)`, `restoreVm(saveId)`, `deleteSave(saveId)`
- `SavedVmsPanel` props: `{ saves, slotsUsed, slotsMax, onRestore, onDelete, savesLoading, restoringId }`

- [ ] **Step 1: Add saves API helper + state to usePlaygroundSession.js**

After the existing `async function apiFetch(...)` block, add:
```js
async function savesFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}${endpoint}`, { credentials: 'include', ...options, headers });
}
```

Inside `usePlaygroundSession()`, add with existing state declarations:
```js
const [saves, setSaves] = useState([]);
const [savesLoading, setSavesLoading] = useState(false);
const [slotsUsed, setSlotsUsed] = useState(0);
const [slotsMax, setSlotsMax] = useState(0);
```

Add after the existing session-restore `useEffect`:
```js
const loadSaves = useCallback(async () => {
  setSavesLoading(true);
  try {
    const res = await savesFetch('/api/v1/playground/saves');
    if (res.ok) {
      const data = await res.json();
      setSaves(data.saves || []);
      setSlotsUsed(data.slots?.used ?? 0);
      setSlotsMax(data.slots?.max ?? 0);
    }
  } catch {}
  setSavesLoading(false);
}, []);

useEffect(() => { loadSaves(); }, [loadSaves]);
```

Add callbacks before the `return`:
```js
const saveVm = useCallback(async (sessionId, name) => {
  const res = await savesFetch('/api/v1/playground/saves', { method: 'POST', body: JSON.stringify({ sessionId, name }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Save failed');
  await loadSaves();
  return data;
}, [loadSaves]);

const restoreVm = useCallback(async (saveId) => {
  const res = await savesFetch(`/api/v1/playground/saves/${saveId}/restore`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Restore failed');
  const newSession = { sessionId: data.sessionId, environment: data.environment, expiresAt: data.expiresAt };
  setSession(newSession);
  setStatus('ready');
  saveSession(data.sessionId, data.environment, data.expiresAt);
  const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
  setTimeRemaining(remaining);
  startTick(data.expiresAt);
  startPolling(data.sessionId, data.expiresAt);
}, [loadSaves, startTick, startPolling]);

const deleteSave = useCallback(async (saveId) => {
  const res = await savesFetch(`/api/v1/playground/saves/${saveId}`, { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
  await loadSaves();
}, [loadSaves]);
```

Add to the hook's `return` object:
```js
saves, savesLoading, slotsUsed, slotsMax, saveVm, restoreVm, deleteSave,
```

- [ ] **Step 2: Create SavedVmsPanel.jsx**

```jsx
// apps/camora/src/components/capra/playground/SavedVmsPanel.jsx
import { ENVIRONMENTS, EnvIcon } from './EnvironmentPicker';

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SavedVmsPanel({ saves, slotsUsed, slotsMax, onRestore, onDelete, savesLoading, restoringId }) {
  if (slotsMax === 0) return null;

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          Saved VMs
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{slotsUsed}/{slotsMax} slots</span>
      </div>

      {savesLoading && saves.length === 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>Loading...</div>
      )}

      {!savesLoading && saves.length === 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: 8, fontSize: 11, textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.3)',
        }}>
          No saved VMs yet. Use "Save VM" while a session is running.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {saves.map(save => {
          const env = ENVIRONMENTS.find(e => e.id === save.environment) || ENVIRONMENTS[0];
          const isRestoring = restoringId === save.id;
          return (
            <div key={save.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}><EnvIcon icon={env.icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {save.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {env.label} · {fmtSize(save.sizeBytes)} · {fmtDate(save.createdAt)}
                </div>
              </div>
              <button type="button" disabled={isRestoring} onClick={() => onRestore(save.id)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: isRestoring ? 'rgba(212,160,67,0.3)' : 'rgba(212,160,67,0.15)',
                border: '1px solid rgba(212,160,67,0.4)', color: '#d4a043',
                cursor: isRestoring ? 'not-allowed' : 'pointer',
              }}>
                {isRestoring ? 'Restoring...' : '↩ Restore'}
              </button>
              <button type="button" onClick={() => onDelete(save.id)} disabled={isRestoring} style={{
                padding: '4px 8px', borderRadius: 5, fontSize: 11, flexShrink: 0,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', cursor: 'pointer',
              }} title="Delete saved VM">🗑</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/hooks/usePlaygroundSession.js apps/camora/src/components/capra/playground/SavedVmsPanel.jsx
git commit -m "feat(playground): saves hook state + SavedVmsPanel component"
```

---

### Task 6: Wire into PlaygroundShell

**Files:**
- Modify: `apps/camora/src/components/capra/playground/PlaygroundShell.jsx`

- [ ] **Step 1: Add import**

At top of PlaygroundShell.jsx with other imports:
```js
import SavedVmsPanel from './SavedVmsPanel';
```

- [ ] **Step 2: Destructure new hook values**

Add to the existing `usePlaygroundSession()` destructure:
```js
saves, savesLoading, slotsUsed, slotsMax, saveVm, restoreVm, deleteSave,
```

- [ ] **Step 3: Add local state for save dialog**

Add with existing `useState` declarations:
```js
const [saveDialogOpen, setSaveDialogOpen] = useState(false);
const [saveName, setSaveName] = useState('');
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState(null);
const [restoringId, setRestoringId] = useState(null);
```

- [ ] **Step 4: Add handlers**

Add after `handleFontDec`:
```js
const handleSaveVm = useCallback(async () => {
  if (!saveName.trim() || !session) return;
  setSaving(true); setSaveError(null);
  try {
    await saveVm(session.sessionId, saveName.trim());
    setSaveDialogOpen(false); setSaveName('');
  } catch (err) { setSaveError(err.message); }
  setSaving(false);
}, [saveName, session, saveVm]);

const handleRestoreVm = useCallback(async (saveId) => {
  setRestoringId(saveId); setMinimized(false);
  try { await restoreVm(saveId); } catch (err) { alert(err.message); }
  setRestoringId(null);
}, [restoreVm]);

const handleDeleteSave = useCallback(async (saveId) => {
  const ok = await confirm({ message: 'Delete this saved VM? This cannot be undone.', tone: 'danger' });
  if (!ok) return;
  try { await deleteSave(saveId); } catch {}
}, [confirm, deleteSave]);
```

- [ ] **Step 5: Add Save VM button to active title bar**

In the active title bar button row, add between the `← Exit` and `⏻` buttons:
```jsx
{slotsMax > 0 && (
  <button type="button" onClick={() => setSaveDialogOpen(true)} style={{ ...iconBtn, color: '#d4a043' }} title="Save VM snapshot">
    💾 Save
  </button>
)}
```

- [ ] **Step 6: Add save dialog**

Inside the `{showTerminal && (...)}` block, after the content pane closing `</div>` and before the outer closing `</>`:
```jsx
{saveDialogOpen && (
  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
    <div style={{ width: 360, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Save VM Snapshot</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
        Saves your container state to cloud storage. Takes 1–3 minutes. Restore any time to continue where you left off.
      </div>
      <input
        autoFocus type="text" placeholder="e.g. My Python setup"
        value={saveName} onChange={e => setSaveName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSaveVm(); if (e.key === 'Escape') setSaveDialogOpen(false); }}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }}
      />
      {saveError && <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 8 }}>{saveError}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => { setSaveDialogOpen(false); setSaveName(''); setSaveError(null); }} style={iconBtn}>Cancel</button>
        <button type="button" disabled={saving || !saveName.trim()} onClick={handleSaveVm} style={{ padding: '4px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700, background: saving ? 'rgba(212,160,67,0.4)' : '#d4a043', color: '#1a1200', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save VM'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Add SavedVmsPanel to idle view**

In the right panel of the idle section, after `<EnvironmentPicker .../>`:
```jsx
<SavedVmsPanel
  saves={saves} slotsUsed={slotsUsed} slotsMax={slotsMax}
  savesLoading={savesLoading} onRestore={handleRestoreVm}
  onDelete={handleDeleteSave} restoringId={restoringId}
/>
```

- [ ] **Step 8: Build + push**

```bash
pnpm build:camora 2>&1 | tail -5
git add apps/camora/src/components/capra/playground/PlaygroundShell.jsx
git commit -m "feat(playground): Save VM button + dialog + SavedVmsPanel in idle view"
git pull --rebase && git push
```

Expected build output: `✓ built in X.XXs` with no errors.
