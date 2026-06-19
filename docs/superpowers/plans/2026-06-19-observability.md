# Playground Observability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Radar-powered Kubernetes observability to playground k8s sessions plus an admin SRE dashboard and per-user stats panel.

**Architecture:** Radar binary runs as a sidecar inside each k8s container on port 9280; ascend-backend proxies `/pg-radar/*` to that port the same way it proxies `/pg-ide/*`; a dedicated `/playground/observe/:sessionId` page iframes Radar; `/admin/playground/observe` shows aggregate SRE metrics from PostgreSQL using Recharts.

**Tech Stack:** Node.js/Express (ascend-backend), React 19 + Vite 8 (camora), PostgreSQL, Recharts (new dep), existing `proxyWs` + HTTP proxy pattern.

## Global Constraints

- All `ALTER TABLE` statements must be idempotent (`ADD COLUMN IF NOT EXISTS`)
- New Express routes that could conflict with `/:id` must be registered **before** that parameterized route
- k8s environments: `k8s-single`, `k8s-multi`, `k8s-etcd` — all others get `radar_port = null`
- Owner check uses `process.env.OWNER_EMAILS` (csv) — never hardcode emails
- No TypeScript in new `.js` files; types allowed in new `.tsx` files
- Frontend import alias: `@/*` → `./src/*`
- Run `pnpm build:camora` before each frontend commit to catch build errors
- Run `node --check <file>` before each backend commit

---

## Task 1: DB Schema — Three New Columns + Store Helpers

**Files:**
- Modify: `apps/ascend-backend/src/services/playground/sessionStore.js`

**Interfaces:**
- Produces:
  - `createSessionRecord(userId, environment, scenarioId, nomadJobId, expiresAt, ttydHost, ttydPort, codeServerPort, setupScript, clusterNodes, radarPort)` — 11th param is `radarPort` (integer|null)
  - `markRadarReady(sessionId)` — sets `radar_ready = true`
  - `updateSessionStatus(sessionId, status, extra)` — now auto-stamps `became_ready_at = COALESCE(became_ready_at, NOW())` when `status === 'ready'`

- [ ] **Step 1: Add three ALTER TABLE statements**

  Open `apps/ascend-backend/src/services/playground/sessionStore.js`. After the two existing `query('ALTER TABLE...')` calls near the top, add:

  ```js
  query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_port INTEGER').catch(() => {});
  query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_ready BOOLEAN DEFAULT FALSE').catch(() => {});
  query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS became_ready_at TIMESTAMPTZ').catch(() => {});
  ```

- [ ] **Step 2: Update `createSessionRecord` to accept `radarPort` as 11th parameter**

  Replace the existing `createSessionRecord` function:

  ```js
  export async function createSessionRecord(userId, environment, scenarioId, nomadJobId, expiresAt, ttydHost, ttydPort, codeServerPort, setupScript, clusterNodes, radarPort = null) {
    const result = await query(
      `INSERT INTO playground_sessions
         (user_id, environment, scenario_id, nomad_job_id, status, expires_at, ttyd_host, ttyd_port, code_server_port, setup_script, cluster_nodes, radar_port)
       VALUES ($1, $2, $3, $4, 'provisioning', $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, environment, scenarioId || null, nomadJobId || null, expiresAt, ttydHost || null, ttydPort || null, codeServerPort || null, setupScript || null, clusterNodes ? JSON.stringify(clusterNodes) : null, radarPort || null],
    );
    return result.rows[0];
  }
  ```

- [ ] **Step 3: Update `updateSessionStatus` to stamp `became_ready_at`**

  Replace the existing `updateSessionStatus` function:

  ```js
  export async function updateSessionStatus(sessionId, status, extra = {}) {
    const setClauses = ['status = $2'];
    const values = [sessionId, status];
    let idx = 3;

    if (status === 'ready') {
      setClauses.push(`became_ready_at = COALESCE(became_ready_at, NOW())`);
    }

    for (const [col, val] of Object.entries(extra)) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(val);
    }

    const result = await query(
      `UPDATE playground_sessions SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  }
  ```

- [ ] **Step 4: Add `markRadarReady` export at the bottom of sessionStore.js**

  ```js
  export async function markRadarReady(sessionId) {
    await query(
      `UPDATE playground_sessions SET radar_ready = true WHERE id = $1`,
      [sessionId],
    );
  }
  ```

- [ ] **Step 5: Syntax check**

  ```bash
  node --check apps/ascend-backend/src/services/playground/sessionStore.js
  ```

  Expected: no output.

- [ ] **Step 6: Write tests**

  Create `apps/ascend-backend/tests/playground/sessionStore.test.js`:

  ```js
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  vi.mock('../../src/config/database.js', () => ({ query: vi.fn() }));
  vi.mock('../../src/services/redis.js', () => ({ cacheSet: vi.fn(), cacheDel: vi.fn() }));

  const { query } = await import('../../src/config/database.js');

  describe('updateSessionStatus', () => {
    beforeEach(() => { query.mockReset(); });

    it('stamps became_ready_at when status is ready', async () => {
      query.mockResolvedValue({ rows: [{ id: 'abc', status: 'ready' }] });
      const { updateSessionStatus } = await import('../../src/services/playground/sessionStore.js');
      await updateSessionStatus('abc', 'ready');
      const sql = query.mock.calls.at(-1)[0];
      expect(sql).toContain('became_ready_at');
    });

    it('does not add became_ready_at for non-ready statuses', async () => {
      query.mockResolvedValue({ rows: [{ id: 'abc', status: 'destroyed' }] });
      const { updateSessionStatus } = await import('../../src/services/playground/sessionStore.js');
      await updateSessionStatus('abc', 'destroyed');
      const sql = query.mock.calls.at(-1)[0];
      expect(sql).not.toContain('became_ready_at');
    });
  });

  describe('markRadarReady', () => {
    beforeEach(() => { query.mockReset(); });

    it('sets radar_ready = true for the given sessionId', async () => {
      query.mockResolvedValue({ rows: [] });
      const { markRadarReady } = await import('../../src/services/playground/sessionStore.js');
      await markRadarReady('session-123');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('radar_ready = true'),
        ['session-123'],
      );
    });
  });
  ```

- [ ] **Step 7: Run tests**

  ```bash
  cd apps/ascend-backend && npx vitest run tests/playground/sessionStore.test.js
  ```

  Expected: all PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/ascend-backend/src/services/playground/sessionStore.js \
          apps/ascend-backend/tests/playground/sessionStore.test.js
  git commit -m "feat(playground): add radar_port, radar_ready, became_ready_at schema + helpers"
  ```

---

## Task 2: nomadClient — Expose Radar Port 9280 for k8s Environments

**Files:**
- Modify: `apps/ascend-backend/src/services/playground/nomadClient.js`

**Interfaces:**
- Produces:
  - `getTaskAddress(jobId, environment)` — second param added; returns `{ host, ttydPort, codeServerPort, radarPort }` where `radarPort` is null for non-k8s envs
  - `getClusterAddresses(nodes, environment)` — second param added; server node gains `radarPort`

- [ ] **Step 1: Add `isKubernetesEnv` helper after the `MEMORY_MB` object**

  ```js
  const KUBERNETES_ENVS = new Set(['k8s-single', 'k8s-multi', 'k8s-etcd']);
  function isKubernetesEnv(environment) {
    return KUBERNETES_ENVS.has(environment);
  }
  ```

- [ ] **Step 2: Add `-p 0:9280` to single-env `scheduleJob` for k8s environments**

  Replace the `cmd` construction inside `scheduleJob`:

  ```js
  const radarPortFlag = isKubernetesEnv(environment) ? '-p 0:9280' : '';
  const cmd = `docker run -d --rm --pull=always --memory=${mem}m --hostname ${hostname} ${envFlags.join(' ')} -p 0:7681 -p 0:8080 ${radarPortFlag} ${image}`.replace(/\s+/g, ' ').trim();
  ```

- [ ] **Step 3: Update `getTaskAddress` signature and add radar port polling**

  Replace the entire `getTaskAddress` function:

  ```js
  export async function getTaskAddress(jobId, environment = '') {
    const deadline = Date.now() + 60_000;
    const needsRadar = isKubernetesEnv(environment);

    let ttydPort = null;
    let codeServerPort = null;
    let radarPort = null;

    while (Date.now() < deadline) {
      try {
        if (!ttydPort) {
          const out = await sshExec(`docker port ${jobId} 7681`);
          for (const line of out.split('\n')) {
            const port = parseInt(line.split(':').at(-1), 10);
            if (port > 0) { ttydPort = port; break; }
          }
        }
        if (!codeServerPort) {
          const out = await sshExec(`docker port ${jobId} 8080`);
          for (const line of out.split('\n')) {
            const port = parseInt(line.split(':').at(-1), 10);
            if (port > 0) { codeServerPort = port; break; }
          }
        }
        if (needsRadar && !radarPort) {
          try {
            const out = await sshExec(`docker port ${jobId} 9280`);
            for (const line of out.split('\n')) {
              const port = parseInt(line.split(':').at(-1), 10);
              if (port > 0) { radarPort = port; break; }
            }
          } catch { /* radar may start later than ttyd */ }
        }
        if (ttydPort && codeServerPort) break;
      } catch { /* container starting */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!ttydPort) throw new Error('Timed out waiting for ttyd port mapping');
    if (!codeServerPort) throw new Error('Timed out waiting for code-server port mapping');

    return { host: WORKER_HOST(), ttydPort, codeServerPort, radarPort };
  }
  ```

- [ ] **Step 4: Add `-p 0:9280` to the k8s-multi server container in `scheduleK8sMultiCluster`**

  Find the `serverCmd` line inside `scheduleK8sMultiCluster`. Add `-p 0:9280` after `-p 0:8080`:

  ```js
  const serverCmd = `docker run -d --rm --pull=always --memory=2048m --network ${networkName} --hostname k8s-master --name pg-${sessionId}-master --privileged ${serverEnvFlags} -p 0:7681 -p 0:8080 -p 0:9280 ${image}`;
  ```

- [ ] **Step 5: Update `getClusterAddresses` signature and add radar port polling on server node**

  Replace the entire `getClusterAddresses` function:

  ```js
  export async function getClusterAddresses(nodes, environment = '') {
    const deadline = Date.now() + 90_000;
    const host = WORKER_HOST();
    const needsRadar = isKubernetesEnv(environment);

    return Promise.all(nodes.map(async (node) => {
      let ttydPort = null;
      while (Date.now() < deadline && !ttydPort) {
        try {
          const out = await sshExec(`docker port ${node.containerId} 7681`);
          for (const line of out.split('\n')) {
            const port = parseInt(line.split(':').at(-1), 10);
            if (port > 0) { ttydPort = port; break; }
          }
        } catch {}
        if (!ttydPort) await new Promise(r => setTimeout(r, 500));
      }
      if (!ttydPort) throw new Error(`Timed out waiting for ttyd port on ${node.nodeName}`);

      let codeServerPort = null;
      if (node.role === 'server') {
        const ideDeadline = Date.now() + 30_000;
        while (Date.now() < ideDeadline && !codeServerPort) {
          try {
            const out = await sshExec(`docker port ${node.containerId} 8080`);
            for (const line of out.split('\n')) {
              const port = parseInt(line.split(':').at(-1), 10);
              if (port > 0) { codeServerPort = port; break; }
            }
          } catch {}
          if (!codeServerPort) await new Promise(r => setTimeout(r, 500));
        }
      }

      let radarPort = null;
      if (needsRadar && node.role === 'server') {
        try {
          const out = await sshExec(`docker port ${node.containerId} 9280`);
          for (const line of out.split('\n')) {
            const port = parseInt(line.split(':').at(-1), 10);
            if (port > 0) { radarPort = port; break; }
          }
        } catch { /* radar may not be up yet; radarReady will be polled by the frontend */ }
      }

      return { ...node, host, ttydPort, codeServerPort, radarPort, status: 'provisioning' };
    }));
  }
  ```

- [ ] **Step 6: Syntax check**

  ```bash
  node --check apps/ascend-backend/src/services/playground/nomadClient.js
  ```

  Expected: no output.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/ascend-backend/src/services/playground/nomadClient.js
  git commit -m "feat(playground): expose radar port 9280 for k8s environments"
  ```

---

## Task 3: sessionManager — Wire radar_port Into Session Creation

**Files:**
- Modify: `apps/ascend-backend/src/services/playground/sessionManager.js`

**Interfaces:**
- Consumes:
  - `getTaskAddress(jobId, environment)` → now returns `radarPort` (Task 2)
  - `getClusterAddresses(nodes, environment)` → server node now has `radarPort` (Task 2)
  - `createSessionRecord(..., radarPort)` — 11th param (Task 1)
  - `markRadarReady(sessionId)` (Task 1)

- [ ] **Step 1: Add `markRadarReady` to the sessionStore import**

  Find the import from `./sessionStore.js` and add `markRadarReady`:

  ```js
  import {
    createSessionRecord,
    getSession,
    updateSessionStatus,
    markExtended,
    destroySession as destroySessionRecord,
    setTTL,
    clearTTL,
    getUserDailyCount,
    markRadarReady,
  } from './sessionStore.js';
  ```

- [ ] **Step 2: Pass `environment` to `getTaskAddress` and `radarPort` to `createSessionRecord` in the single-env path**

  Find the non-cluster branch inside `createSession`. Update these two lines:

  ```js
  const { host, ttydPort, codeServerPort, radarPort } = await getTaskAddress(jobId, environment);
  const session = await createSessionRecord(userId, environment, scenarioId, jobId, expiresAt, host, ttydPort, codeServerPort, setupScript, null, radarPort);
  ```

- [ ] **Step 3: Pass `environment` to `getClusterAddresses` and `radarPort` to `createSessionRecord` in the cluster path**

  Find the cluster branch (`if (CLUSTER_ENVIRONMENTS.has(environment))`). Update:

  ```js
  const nodesWithPorts = await getClusterAddresses(nodes, environment);
  const clusterNodes = nodesWithPorts.map(n => ({ ...n, status: 'provisioning' }));

  const primary = nodesWithPorts[0];
  const serverNode = nodesWithPorts.find(n => n.role === 'server') || primary;
  const radarPort = serverNode.radarPort || null;

  const session = await createSessionRecord(
    userId, environment, null, networkName, expiresAt,
    primary.host, primary.ttydPort, primary.codeServerPort, null, clusterNodes, radarPort,
  );
  ```

- [ ] **Step 4: Syntax check**

  ```bash
  node --check apps/ascend-backend/src/services/playground/sessionManager.js
  ```

  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/ascend-backend/src/services/playground/sessionManager.js
  git commit -m "feat(playground): store radar_port in session on creation"
  ```

---

## Task 4: Backend API Routes — radar-status, metrics, my-stats

**Files:**
- Modify: `apps/ascend-backend/src/routes/playgroundSessions.js`

**Interfaces:**
- Produces:
  - `GET /api/v1/playground/sessions/metrics?window=7d|30d` — admin only
  - `GET /api/v1/playground/sessions/my-stats` — per-user aggregate
  - `GET /api/v1/playground/sessions/:id/radar-status` — per-session Radar availability

- [ ] **Step 1: Add imports at the top of playgroundSessions.js**

  Add after the existing imports:

  ```js
  import { markRadarReady } from '../services/playground/sessionStore.js';
  import { query } from '../config/database.js';

  function isOwner(email) {
    const owners = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return owners.includes((email || '').toLowerCase());
  }
  ```

- [ ] **Step 2: Add `/metrics` route — insert BEFORE the existing `GET /history` route**

  ```js
  playgroundSessionsRouter.get('/metrics', async (req, res) => {
    if (!isOwner(req.user?.email)) return res.status(403).json({ error: 'Admin only' });
    const win = req.query.window === '30d' ? 30 : 7;
    try {
      const [successRow, latencyRow, activeRow, extensionRow, dailyRow, envRow, errorRow] = await Promise.all([
        query(`SELECT COUNT(*) FILTER (WHERE status IN ('ready','active','destroyed')) AS total, COUNT(*) FILTER (WHERE became_ready_at IS NOT NULL) AS succeeded FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days'`),
        query(`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (became_ready_at - created_at))) AS p50, percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (became_ready_at - created_at))) AS p95 FROM playground_sessions WHERE became_ready_at IS NOT NULL AND created_at >= NOW() - INTERVAL '${win} days'`),
        query(`SELECT COUNT(*) AS count FROM playground_sessions WHERE status IN ('provisioning','ready','active')`),
        query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE extended = true) AS extended FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days'`),
        query(`SELECT DATE_TRUNC('day', created_at)::date AS date, COUNT(*) AS count FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days' GROUP BY 1 ORDER BY 1`),
        query(`SELECT environment, COUNT(*) AS count FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days' GROUP BY environment`),
        query(`SELECT status, COUNT(*) AS count FROM playground_sessions WHERE status IN ('error','timeout') AND created_at >= NOW() - INTERVAL '${win} days' GROUP BY status`),
      ]);
      const total = parseInt(successRow.rows[0]?.total || 0, 10);
      const succeeded = parseInt(successRow.rows[0]?.succeeded || 0, 10);
      const extTotal = parseInt(extensionRow.rows[0]?.total || 0, 10);
      const extExtended = parseInt(extensionRow.rows[0]?.extended || 0, 10);
      return res.json({
        successRate: total > 0 ? Math.round((succeeded / total) * 1000) / 1000 : null,
        bootP50: latencyRow.rows[0]?.p50 != null ? Math.round(latencyRow.rows[0].p50) : null,
        bootP95: latencyRow.rows[0]?.p95 != null ? Math.round(latencyRow.rows[0].p95) : null,
        activeCount: parseInt(activeRow.rows[0]?.count || 0, 10),
        extensionRate: extTotal > 0 ? Math.round((extExtended / extTotal) * 1000) / 1000 : null,
        dailyVolume: dailyRow.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
        environmentBreakdown: Object.fromEntries(envRow.rows.map(r => [r.environment, parseInt(r.count, 10)])),
        errorBreakdown: Object.fromEntries(errorRow.rows.map(r => [r.status, parseInt(r.count, 10)])),
      });
    } catch (err) {
      console.error('[PlaygroundSessions] metrics error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });
  ```

- [ ] **Step 3: Add `/my-stats` route — insert AFTER `/metrics`, BEFORE `/history`**

  ```js
  playgroundSessionsRouter.get('/my-stats', async (req, res) => {
    try {
      const [totalsRow, favRow] = await Promise.all([
        query(`SELECT COUNT(*) AS total_sessions, ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(destroyed_at, NOW()) - created_at)) / 60)::numeric, 0) AS total_minutes, COUNT(*) FILTER (WHERE became_ready_at IS NOT NULL)::float / NULLIF(COUNT(*), 0) AS success_rate, MAX(created_at) AS last_active FROM playground_sessions WHERE user_id = $1`, [req.user.id]),
        query(`SELECT environment, COUNT(*) AS count FROM playground_sessions WHERE user_id = $1 GROUP BY environment ORDER BY count DESC LIMIT 1`, [req.user.id]),
      ]);
      const row = totalsRow.rows[0] || {};
      return res.json({
        totalSessions: parseInt(row.total_sessions || 0, 10),
        totalMinutes: parseInt(row.total_minutes || 0, 10),
        favoriteEnvironment: favRow.rows[0]?.environment || null,
        successRate: row.success_rate != null ? Math.round(parseFloat(row.success_rate) * 1000) / 1000 : null,
        lastActive: row.last_active || null,
      });
    } catch (err) {
      console.error('[PlaygroundSessions] my-stats error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
  ```

- [ ] **Step 4: Add `/:id/radar-status` route — insert BEFORE existing `GET /:id` route**

  ```js
  const K8S_ENVS_SET = new Set(['k8s-single', 'k8s-multi', 'k8s-etcd']);

  playgroundSessionsRouter.get('/:id/radar-status', async (req, res) => {
    try {
      await checkSessionOwner(req.params.id, req.user.id);
      const session = await getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      const radarAvailable = K8S_ENVS_SET.has(session.environment) && !!session.radar_port;
      const radarReady = radarAvailable && !!session.radar_ready;
      return res.json({
        radarAvailable,
        radarReady,
        radarUrl: radarAvailable ? `/pg-radar?_s=${session.id}` : null,
      });
    } catch (err) {
      console.error('[PlaygroundSessions] radar-status error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch radar status' });
    }
  });
  ```

- [ ] **Step 5: Syntax check**

  ```bash
  node --check apps/ascend-backend/src/routes/playgroundSessions.js
  ```

  Expected: no output.

- [ ] **Step 6: Write route logic tests**

  Create `apps/ascend-backend/tests/playground/radarStatus.test.js`:

  ```js
  import { describe, it, expect } from 'vitest';

  const K8S_ENVS_SET = new Set(['k8s-single', 'k8s-multi', 'k8s-etcd']);

  function computeRadarStatus(session) {
    const radarAvailable = K8S_ENVS_SET.has(session.environment) && !!session.radar_port;
    const radarReady = radarAvailable && !!session.radar_ready;
    return { radarAvailable, radarReady, radarUrl: radarAvailable ? `/pg-radar?_s=${session.id}` : null };
  }

  describe('radar-status logic', () => {
    it('ubuntu session → radarAvailable false', () => {
      const r = computeRadarStatus({ id: 'a', environment: 'ubuntu', radar_port: null, radar_ready: false });
      expect(r.radarAvailable).toBe(false);
      expect(r.radarUrl).toBeNull();
    });

    it('k8s-single with radar_port but not ready → radarAvailable true, radarReady false', () => {
      const r = computeRadarStatus({ id: 'b', environment: 'k8s-single', radar_port: 31200, radar_ready: false });
      expect(r.radarAvailable).toBe(true);
      expect(r.radarReady).toBe(false);
      expect(r.radarUrl).toBe('/pg-radar?_s=b');
    });

    it('k8s-multi fully ready → radarReady true', () => {
      const r = computeRadarStatus({ id: 'c', environment: 'k8s-multi', radar_port: 31201, radar_ready: true });
      expect(r.radarReady).toBe(true);
    });
  });
  ```

- [ ] **Step 7: Run tests**

  ```bash
  cd apps/ascend-backend && npx vitest run tests/playground/
  ```

  Expected: all PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/ascend-backend/src/routes/playgroundSessions.js \
          apps/ascend-backend/tests/playground/radarStatus.test.js
  git commit -m "feat(playground): add /radar-status, /metrics, /my-stats API routes"
  ```

---

## Task 5: /pg-radar HTTP Proxy + WebSocket Upgrade Branch

**Files:**
- Modify: `apps/ascend-backend/src/index.js`

**Interfaces:**
- Consumes: `getSession` (already imported), `pgParseToken` (already defined), `proxyWs` (already defined), `http` (already imported)
- Produces:
  - `app.use('/pg-radar', ...)` — HTTP proxy to `session.ttyd_host:session.radar_port`
  - `/pg-radar` branch in `server.on('upgrade', ...)`

- [ ] **Step 1: Add the /pg-radar HTTP proxy block**

  Find the comment `// Enhanced health check` in `index.js`. Insert this block **immediately before** that comment (right after the `/pg-ide` proxy block ends):

  ```js
  // Radar HTTP proxy — /pg-radar/* → container port 9280
  app.use('/pg-radar', async (req, res) => {
    const qs = new URL(req.url, 'http://localhost').searchParams;

    let userId = -1;
    const qt = qs.get('_t');
    if (qt) { const p = pgParseToken(qt); if (p?.sub) userId = parseInt(p.sub, 10); }
    if (userId === -1 && req.cookies?.cariara_sso) {
      const p = pgParseToken(req.cookies.cariara_sso);
      if (p?.sub) userId = parseInt(p.sub, 10);
    }
    const isAssetRequest = !qt && !req.cookies?.cariara_sso && req.cookies?.pg_radar;
    if (userId === -1 && !isAssetRequest) return res.status(401).end('Unauthorized');

    const sessionId = qs.get('_s') || req.cookies?.pg_radar;
    if (!sessionId) return res.status(400).end('Missing session');

    let session;
    try { session = await getSession(sessionId); } catch { return res.status(502).end(); }
    if (!session) return res.status(404).end('Session not found');
    if (userId > 0 && session.user_id !== userId) return res.status(403).end('Forbidden');
    if (!session.ttyd_host || !session.radar_port) return res.status(503).end('Radar not ready');

    res.cookie('pg_radar', sessionId, { httpOnly: true, maxAge: 3600, path: '/pg-radar', sameSite: 'strict' });
    res.removeHeader('content-security-policy');
    res.removeHeader('x-frame-options');

    const proxyReq = http.request({
      hostname: session.ttyd_host,
      port: session.radar_port,
      path: req.url || '/',
      method: req.method,
      headers: { ...req.headers, host: `${session.ttyd_host}:${session.radar_port}` },
    }, (proxyRes) => {
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['x-frame-options'];
      proxyRes.headers['content-security-policy'] =
        "default-src * 'unsafe-inline' 'unsafe-eval' blob: data: ws: wss:; frame-ancestors 'self' https://camora.cariara.com https://caprab.cariara.com";
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', () => { if (!res.headersSent) res.status(502).end(); });
    req.pipe(proxyReq);
  });
  ```

- [ ] **Step 2: Add /pg-radar branch to the WebSocket upgrade handler**

  Find `server.on('upgrade', async (req, socket, head) => {`. At the very end of the handler body, after the `if (pgIdeMatch)` block and before the closing `});`, add:

  ```js
  if (req.url?.startsWith('/pg-radar')) {
    const pgRadarCookie = req.headers.cookie?.match(/(?:^|;\s*)pg_radar=([^;]+)/)?.[1];
    const sessionId = pgRadarCookie ? decodeURIComponent(pgRadarCookie) : null;
    if (!sessionId) { socket.destroy(); return; }
    let session;
    try { session = await getSession(sessionId); } catch { socket.destroy(); return; }
    if (!session?.ttyd_host || !session?.radar_port) { socket.destroy(); return; }
    const wsPath = req.url.replace(/^\/pg-radar/, '') || '/';
    proxyWs(socket, head, session.ttyd_host, session.radar_port, wsPath, req.rawHeaders);
  }
  ```

- [ ] **Step 3: Syntax check**

  ```bash
  node --check apps/ascend-backend/src/index.js
  ```

  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/ascend-backend/src/index.js
  git commit -m "feat(playground): add /pg-radar HTTP and WebSocket proxy"
  ```

---

## Task 6: Frontend Hook — useRadarStatus

**Files:**
- Create: `apps/camora/src/hooks/useRadarStatus.js`

**Interfaces:**
- Produces: `useRadarStatus(sessionId)` → `{ radarAvailable, radarReady, radarUrl, loading, timedOut }`

- [ ] **Step 1: Create the hook**

  Create `apps/camora/src/hooks/useRadarStatus.js`:

  ```js
  import { useState, useEffect, useRef } from 'react';
  import { getStoredToken } from '@/utils/tokenStore';

  const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';
  const POLL_MS = 3000;
  const TIMEOUT_MS = 90000;

  export function useRadarStatus(sessionId) {
    const [state, setState] = useState({
      radarAvailable: false, radarReady: false, radarUrl: null, loading: true, timedOut: false,
    });
    const intervalRef = useRef(null);
    const startRef = useRef(Date.now());
    const mountedRef = useRef(true);

    useEffect(() => {
      if (!sessionId) { setState(s => ({ ...s, loading: false })); return; }
      mountedRef.current = true;
      startRef.current = Date.now();

      const poll = async () => {
        if (!mountedRef.current) return;
        if (Date.now() - startRef.current > TIMEOUT_MS) {
          clearInterval(intervalRef.current);
          setState(s => ({ ...s, loading: false, timedOut: true }));
          return;
        }
        try {
          const token = getStoredToken();
          const res = await fetch(
            `${API}/api/v1/playground/sessions/${sessionId}/radar-status`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' },
          );
          if (!mountedRef.current || !res.ok) return;
          const data = await res.json();
          if (data.radarReady) {
            clearInterval(intervalRef.current);
            setState({ radarAvailable: true, radarReady: true, radarUrl: data.radarUrl, loading: false, timedOut: false });
          } else if (!data.radarAvailable) {
            clearInterval(intervalRef.current);
            setState({ radarAvailable: false, radarReady: false, radarUrl: null, loading: false, timedOut: false });
          }
        } catch { /* keep polling */ }
      };

      poll();
      intervalRef.current = setInterval(poll, POLL_MS);
      return () => { mountedRef.current = false; clearInterval(intervalRef.current); };
    }, [sessionId]);

    return state;
  }
  ```

- [ ] **Step 2: Build check**

  ```bash
  pnpm build:camora 2>&1 | tail -10
  ```

  Expected: build succeeds.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/camora/src/hooks/useRadarStatus.js
  git commit -m "feat(playground): add useRadarStatus hook"
  ```

---

## Task 7: PlaygroundObservePage — Full-Page Radar Iframe

**Files:**
- Create: `apps/camora/src/pages/PlaygroundObservePage.jsx`

**Interfaces:**
- Consumes: `useRadarStatus(sessionId)` (Task 6), `useParams`, `Link` from react-router-dom

- [ ] **Step 1: Create PlaygroundObservePage.jsx**

  Create `apps/camora/src/pages/PlaygroundObservePage.jsx`:

  ```jsx
  import { useParams, Link } from 'react-router-dom';
  import { useRadarStatus } from '@/hooks/useRadarStatus';

  const ENV_LABELS = {
    'k8s-single': 'K8s Single-Node',
    'k8s-multi': 'K8s Multi-Node',
    'k8s-etcd': 'K8s + etcd',
  };

  function TopBar({ environment }) {
    return (
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: '#0a0f1a', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <Link to="/playground" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Playground
        </Link>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
        {environment && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '2px 8px', borderRadius: 4 }}>
            {ENV_LABELS[environment] || environment}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Radar Observability</span>
      </div>
    );
  }

  function CenteredCard({ children }) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>{children}</div>
      </div>
    );
  }

  export default function PlaygroundObservePage() {
    const { sessionId } = useParams();
    const { radarAvailable, radarReady, radarUrl, loading, timedOut } = useRadarStatus(sessionId);

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0f1a' }}>
        <TopBar />

        {loading && !timedOut && (
          <CenteredCard>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Connecting to Radar…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </CenteredCard>
        )}

        {timedOut && (
          <CenteredCard>
            <p style={{ color: '#ef4444', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Radar took too long to start</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>The Kubernetes cluster may still be booting.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
            >
              Retry
            </button>
          </CenteredCard>
        )}

        {!loading && !timedOut && !radarAvailable && (
          <CenteredCard>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Observability not available</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
              Radar requires a Kubernetes environment (k8s-single, k8s-multi, or k8s-etcd).
            </p>
            <Link
              to="/playground"
              style={{ background: '#3b82f6', color: '#fff', borderRadius: 6, padding: '8px 20px', fontSize: 13, textDecoration: 'none', display: 'inline-block' }}
            >
              Create a k8s session
            </Link>
          </CenteredCard>
        )}

        {radarReady && radarUrl && (
          <iframe
            src={radarUrl}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="Radar — Kubernetes Observability"
            allow="clipboard-read; clipboard-write"
          />
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Build check**

  ```bash
  pnpm build:camora 2>&1 | tail -10
  ```

  Expected: build succeeds.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/camora/src/pages/PlaygroundObservePage.jsx
  git commit -m "feat(playground): add PlaygroundObservePage with Radar iframe"
  ```

---

## Task 8: Observe Button + Stats Tab in PlaygroundShell

**Files:**
- Modify: `apps/camora/src/components/capra/playground/PlaygroundShell.jsx`
- Create: `apps/camora/src/hooks/usePlaygroundMetrics.js`

**Interfaces:**
- Consumes: `useRadarStatus(sessionId)` (Task 6)
- Produces: "Observe" button in toolbar; "Stats" tab with per-user totals

- [ ] **Step 1: Create usePlaygroundMetrics hook**

  Create `apps/camora/src/hooks/usePlaygroundMetrics.js`:

  ```js
  import { useState } from 'react';
  import { getStoredToken } from '@/utils/tokenStore';

  const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

  export function usePlaygroundMetrics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = getStoredToken();
        const res = await fetch(`${API}/api/v1/playground/sessions/my-stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (res.ok) setStats(await res.json());
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };

    return { stats, loading, fetchStats };
  }
  ```

- [ ] **Step 2: Import hooks in PlaygroundShell.jsx**

  Add to the existing import block at the top of PlaygroundShell.jsx:

  ```js
  import { useRadarStatus } from '@/hooks/useRadarStatus';
  import { usePlaygroundMetrics } from '@/hooks/usePlaygroundMetrics';
  ```

- [ ] **Step 3: Add hook calls inside the PlaygroundShell component body**

  After the existing destructured hook calls, add:

  ```js
  const K8S_ENVS = new Set(['k8s-single', 'k8s-multi', 'k8s-etcd']);
  const isK8sSession = session ? K8S_ENVS.has(session.environment) : false;
  const { radarReady } = useRadarStatus(isK8sSession ? session?.sessionId : null);
  const { stats, loading: statsLoading, fetchStats } = usePlaygroundMetrics();
  ```

- [ ] **Step 4: Add the Observe button in the toolbar**

  Find the area where the Extend button is rendered. Add the Observe button immediately after it:

  ```jsx
  {isK8sSession && (
    <a
      href={`/playground/observe/${session.sessionId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={radarReady ? 'Open Radar Observability' : 'Starting Radar…'}
      style={{
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 500,
        background: radarReady ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
        color: radarReady ? '#3b82f6' : 'rgba(255,255,255,0.3)',
        border: `1px solid ${radarReady ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 5,
        cursor: radarReady ? 'pointer' : 'default',
        pointerEvents: radarReady ? 'auto' : 'none',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <circle cx="12" cy="12" r="7" strokeDasharray="2 2"/>
        <circle cx="12" cy="12" r="11" strokeDasharray="2 3"/>
      </svg>
      {radarReady ? 'Observe' : 'Starting Radar…'}
    </a>
  )}
  ```

- [ ] **Step 5: Add the Stats tab button**

  Find where the Terminal/IDE tab buttons are rendered. Add the Stats tab button after them:

  ```jsx
  <button
    onClick={() => {
      setActiveTab('stats');
      if (!stats && !statsLoading) fetchStats();
    }}
    style={{
      padding: '6px 12px',
      fontSize: 12,
      background: activeTab === 'stats' ? 'rgba(255,255,255,0.1)' : 'transparent',
      color: activeTab === 'stats' ? '#fff' : 'rgba(255,255,255,0.5)',
      border: 'none',
      borderRadius: 4,
      cursor: 'pointer',
    }}
  >
    Stats
  </button>
  ```

- [ ] **Step 6: Add the Stats tab content panel**

  In the area where tab content panels are rendered (search for `showTerminal` or `activeTab === 'terminal'`), add a Stats panel:

  ```jsx
  {activeTab === 'stats' && (
    <div style={{ padding: 24, color: '#fff' }}>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'rgba(255,255,255,0.7)' }}>Your Session Stats</p>
      {statsLoading && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading…</p>}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            { label: 'Total Sessions', value: stats.totalSessions ?? '—' },
            { label: 'Total Time', value: stats.totalMinutes != null ? `${stats.totalMinutes}m` : '—' },
            { label: 'Favorite Env', value: stats.favoriteEnvironment ?? '—' },
            { label: 'Success Rate', value: stats.successRate != null ? `${Math.round(stats.successRate * 100)}%` : '—' },
            { label: 'Last Active', value: stats.lastActive ? new Date(stats.lastActive).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="chip" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
  ```

- [ ] **Step 7: Build check**

  ```bash
  pnpm build:camora 2>&1 | tail -10
  ```

  Expected: build succeeds.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/camora/src/components/capra/playground/PlaygroundShell.jsx \
          apps/camora/src/hooks/usePlaygroundMetrics.js
  git commit -m "feat(playground): add Observe button and Stats tab to PlaygroundShell"
  ```

---

## Task 9: AdminPlaygroundObservePage — SRE Dashboard

**Files:**
- Create: `apps/camora/src/pages/admin/AdminPlaygroundObservePage.tsx`
- Modify: `apps/camora/package.json` (add recharts)

**Interfaces:**
- Consumes: `GET /api/v1/playground/sessions/metrics?window=7d|30d` (Task 4)

- [ ] **Step 1: Install recharts**

  ```bash
  cd apps/camora && pnpm add recharts
  ```

  Expected: `recharts` appears in `apps/camora/package.json` dependencies.

- [ ] **Step 2: Create AdminPlaygroundObservePage.tsx**

  Create `apps/camora/src/pages/admin/AdminPlaygroundObservePage.tsx`:

  ```tsx
  import { useState, useEffect } from 'react';
  import { useAuth } from '@/contexts/AuthContext';
  import SiteNav from '@/components/shared/SiteNav';
  import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  } from 'recharts';

  const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  interface DayVolume { date: string; count: number }
  interface Metrics {
    successRate: number | null;
    bootP50: number | null;
    bootP95: number | null;
    activeCount: number;
    extensionRate: number | null;
    dailyVolume: DayVolume[];
    environmentBreakdown: Record<string, number>;
    errorBreakdown: Record<string, number>;
  }

  function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px 20px', minWidth: 140 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>{sub}</p>}
      </div>
    );
  }

  function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px' }}>{title}</p>
        {children}
      </div>
    );
  }

  export default function AdminPlaygroundObservePage() {
    const { user } = useAuth();
    const [win, setWin] = useState<'7d' | '30d'>('7d');
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      setLoading(true);
      setError(null);
      fetch(`${API}/api/v1/playground/sessions/metrics?window=${win}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(d => { setMetrics(d); setLoading(false); })
        .catch(e => { setError(String(e)); setLoading(false); });
    }, [win]);

    const envPieData = metrics
      ? Object.entries(metrics.environmentBreakdown).map(([name, value]) => ({ name, value }))
      : [];
    const errorBarData = metrics
      ? Object.entries(metrics.errorBreakdown).map(([name, value]) => ({ name, value }))
      : [];
    const latencyData = metrics
      ? [{ name: 'Boot Latency', P50: metrics.bootP50 ?? 0, P95: metrics.bootP95 ?? 0 }]
      : [];

    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#fff' }}>
        <SiteNav />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Playground Observability</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>SRE metrics — playground session health</p>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 3 }}>
              {(['7d', '30d'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setWin(w)}
                  style={{
                    padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                    border: 'none', cursor: 'pointer',
                    background: win === w ? '#3b82f6' : 'transparent',
                    color: win === w ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {loading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading metrics…</p>}
          {error && <p style={{ color: '#ef4444', fontSize: 14 }}>Error: {error}</p>}

          {metrics && !loading && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatCard label="Success Rate" value={metrics.successRate != null ? `${Math.round(metrics.successRate * 100)}%` : '—'} />
                <StatCard label="Active Sessions" value={metrics.activeCount} sub="live right now" />
                <StatCard label="P50 Boot" value={metrics.bootP50 != null ? `${metrics.bootP50}s` : '—'} />
                <StatCard label="P95 Boot" value={metrics.bootP95 != null ? `${metrics.bootP95}s` : '—'} />
                <StatCard label="Extension Rate" value={metrics.extensionRate != null ? `${Math.round(metrics.extensionRate * 100)}%` : '—'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <ChartPanel title={`Session Volume (last ${win})`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metrics.dailyVolume}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false}/>
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}/>
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#volGrad)" strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Boot Latency (seconds)">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={latencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}/>
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}/>
                      <Legend wrapperStyle={{ fontSize: 12 }}/>
                      <Bar dataKey="P50" fill="#10b981" radius={[3,3,0,0]}/>
                      <Bar dataKey="P95" fill="#f59e0b" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Environment Mix">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={envPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                        {envPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Error Breakdown">
                  {errorBarData.length === 0
                    ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: 60 }}>No errors in this window</p>
                    : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={errorBarData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                          <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}/>
                          <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} width={100}/>
                          <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}/>
                          <Bar dataKey="value" fill="#ef4444" radius={[0,3,3,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </ChartPanel>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Build check**

  ```bash
  pnpm build:camora 2>&1 | tail -10
  ```

  Expected: build succeeds.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/camora/src/pages/admin/AdminPlaygroundObservePage.tsx \
          apps/camora/package.json
  git commit -m "feat(playground): add AdminPlaygroundObservePage SRE dashboard with Recharts"
  ```

---

## Task 10: Route Wiring in App.tsx

**Files:**
- Modify: `apps/camora/src/App.tsx`

- [ ] **Step 1: Add lazy imports**

  Find the `const Admin* = lazy(...)` import block in App.tsx. Add:

  ```tsx
  const PlaygroundObservePage = lazy(() => import('./pages/PlaygroundObservePage'));
  const AdminPlaygroundObservePage = lazy(() => import('./pages/admin/AdminPlaygroundObservePage'));
  ```

- [ ] **Step 2: Add /playground/observe/:sessionId route**

  Find the existing line:
  ```tsx
  <Route path="/playground" element={<ProtectedRoute><PlaygroundPage /></ProtectedRoute>} />
  ```

  Add immediately after:
  ```tsx
  <Route path="/playground/observe/:sessionId" element={<ProtectedRoute><PlaygroundObservePage /></ProtectedRoute>} />
  ```

- [ ] **Step 3: Add /admin/playground/observe route**

  Find the existing `/admin/teams` route:
  ```tsx
  <Route path="/admin/teams" element={<OwnerRoute><AdminTeamsPage /></OwnerRoute>} />
  ```

  Add immediately after:
  ```tsx
  <Route path="/admin/playground/observe" element={<OwnerRoute><AdminPlaygroundObservePage /></OwnerRoute>} />
  ```

- [ ] **Step 4: Build check**

  ```bash
  pnpm build:camora 2>&1 | tail -10
  ```

  Expected: build succeeds.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/camora/src/App.tsx
  git commit -m "feat(playground): wire /playground/observe and /admin/playground/observe routes"
  ```

---

## Task 11: Docker Image Updates — Install Radar in k8s Images

> **Prerequisite:** Locate the Dockerfiles for `chundubabu/pg-k8s-single` and `chundubabu/pg-k8s-multi`. These are in a separate build repository — confirm the path with the repo owner before proceeding. The instructions below describe what to change.

- [ ] **Step 1: Find the latest Radar Linux amd64 release URL**

  Visit https://github.com/skyhook-io/radar/releases and note the latest version (e.g., `v1.7.9`) and the download URL for `radar_linux_amd64`.

- [ ] **Step 2: Add Radar binary install to pg-k8s-single Dockerfile**

  In the Dockerfile for `pg-k8s-single`, after the k3s installation layer:

  ```dockerfile
  ARG RADAR_VERSION=1.7.9
  RUN curl -fsSL "https://github.com/skyhook-io/radar/releases/download/v${RADAR_VERSION}/radar_linux_amd64" \
        -o /usr/local/bin/radar && chmod +x /usr/local/bin/radar
  ```

- [ ] **Step 3: Update pg-k8s-single entrypoint to start Radar after k3s is ready**

  In the entrypoint script, after the k3s readiness check:

  ```bash
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  radar --port 9280 --no-open --kubeconfig "$KUBECONFIG" &
  for i in $(seq 1 15); do
    if curl -sf http://localhost:9280/health > /dev/null 2>&1; then
      echo '##PG##{"tool":"radar","label":"Radar ready","status":"done"}'
      break
    fi
    sleep 1
  done
  ```

- [ ] **Step 4: Apply same changes to pg-k8s-multi — gate on server node only**

  In the pg-k8s-multi entrypoint, Radar should start only on the master node:

  ```bash
  if [ "${HOSTNAME:-}" = "k8s-master" ]; then
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    radar --port 9280 --no-open --kubeconfig "$KUBECONFIG" &
    for i in $(seq 1 15); do
      if curl -sf http://localhost:9280/health > /dev/null 2>&1; then
        echo '##PG##{"tool":"radar","label":"Radar ready","status":"done"}'
        break
      fi
      sleep 1
    done
  fi
  ```

- [ ] **Step 5: Build and push both images**

  ```bash
  docker build -t chundubabu/pg-k8s-single:latest .
  docker push chundubabu/pg-k8s-single:latest

  docker build -t chundubabu/pg-k8s-multi:latest .
  docker push chundubabu/pg-k8s-multi:latest
  ```

- [ ] **Step 6: Smoke test Radar in a local container**

  ```bash
  # Run a k8s-single container and verify Radar starts
  docker run -d --rm -p 9280:9280 chundubabu/pg-k8s-single:latest
  # Wait ~60s for k3s to start, then:
  curl -sf http://localhost:9280/health && echo "Radar OK"
  ```

  Expected: `Radar OK` printed.

---

## Task 12: Deploy and Verify

- [ ] **Step 1: Pull latest before pushing**

  ```bash
  git pull origin main
  ```

- [ ] **Step 2: Final build check**

  ```bash
  pnpm build:camora 2>&1 | tail -5
  ```

- [ ] **Step 3: Push and deploy frontend**

  ```bash
  git push origin main
  vercel --prod
  ```

- [ ] **Step 4: Verify admin SRE dashboard**

  Open `https://camora.cariara.com/admin/playground/observe` as `chundubabu@gmail.com`.
  Expected: page loads, stat cards show values, AreaChart renders session volume.

- [ ] **Step 5: Smoke test radar-status API in browser console**

  On any Camora page, open DevTools console and run:
  ```js
  fetch('/api/v1/playground/sessions/test-id/radar-status', {credentials:'include'}).then(r=>r.json()).then(console.log)
  ```
  Expected: `{ radarAvailable: false, radarReady: false, radarUrl: null }` or 404 — confirms route is live.

- [ ] **Step 6: Verify Stats tab on playground page**

  Open `https://camora.cariara.com/playground`, start a session, click the Stats tab.
  Expected: stats chips render with real values from the `/my-stats` endpoint.
