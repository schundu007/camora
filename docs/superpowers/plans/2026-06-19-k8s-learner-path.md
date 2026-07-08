# K8s Learner Path + Playground Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Radar entirely and replace it with a native Cluster Panel + a structured 22-topic k8s curriculum integrated into the playground with per-exercise validation.

**Architecture:** Backend adds `execInContainer` to nomadClient (wraps existing private `sshExec`), a `/sessions/:id/cluster-state` SSE endpoint (kubectl exec every 5s), and a `/sessions/:id/validate-exercise` endpoint (kubectl JSON field checks). Frontend replaces the Radar iframe tab with a native `ClusterPanel`, adds an `ExercisePanel` sidebar, and adds a `K8sPathPage` at `/capra/k8s`.

**Tech Stack:** Express 5, React 19 + Vite 8, PostgreSQL (inline `CREATE TABLE IF NOT EXISTS` migrations), vitest, existing `sshExec`/`authenticate` patterns from `apps/ascend-backend`.

## Global Constraints

- No new binary dependencies in Docker images
- No new proxy routes (cluster-state and validate go into the existing `playgroundSessionsRouter`)
- Auth for all new session routes: already provided by `authenticate` at router mount (`app.use('/api/v1/playground/sessions', authenticate, ...)`)
- `req.user` from `authenticate` has shape `{ id, email, name, picture }`
- `sshExec` is private in `nomadClient.js` — use new exported `execInContainer` (added Task 2)
- k8s-single container name = `session.nomad_job_id`
- k8s-multi master container = `JSON.parse(session.cluster_nodes)[0].containerId` (role: 'server')
- KUBECONFIG inside all k8s containers = `/etc/rancher/k3s/k3s.yaml`
- Validation uses label selectors (`-l selector`) not pod names wherever possible
- All backend tests in `apps/ascend-backend/tests/` using vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `docker/k8s/Dockerfile` | Modify | Remove Radar install block + `EXPOSE 9280` |
| `docker/k8s/start.sh` | Modify | Remove radar startup line |
| `docker/k8s-multi/Dockerfile` | Modify | Remove Radar install block + `EXPOSE 9280` |
| `docker/k8s-multi/start.sh` | Modify | Remove radar startup line |
| `apps/ascend-backend/src/services/playground/nomadClient.js` | Modify | Remove `-p 0:9280` from k8s-multi run; add `execInContainer` export |
| `apps/ascend-backend/src/services/playground/sessionStore.js` | Modify | Remove `radar_port`/`radar_ready` columns and `markRadarReady` |
| `apps/ascend-backend/src/services/playground/sessionManager.js` | Modify | Remove `radar_port` from returns |
| `apps/ascend-backend/src/services/playground/clusterState.js` | Create | `parseClusterList` + `getExecContainer` helpers |
| `apps/ascend-backend/src/services/k8s/curriculum.js` | Create | Module 1 seed data + `seedK8sCurriculum()` |
| `apps/ascend-backend/src/services/k8s/validator.js` | Create | 12-spec validation engine |
| `apps/ascend-backend/src/routes/playgroundSessions.js` | Modify | Remove radar routes; add cluster-state SSE + validate-exercise |
| `apps/ascend-backend/src/routes/k8sPath.js` | Create | `GET /topics`, `GET /topics/:slug` |
| `apps/ascend-backend/src/index.js` | Modify | Remove `/pg-radar` proxies; add 3 table migrations; mount k8sPath router |
| `apps/ascend-backend/tests/playground/radarStatus.test.js` | Delete | |
| `apps/ascend-backend/tests/playground/clusterState.test.js` | Create | Unit tests for `parseClusterList` |
| `apps/ascend-backend/tests/k8s/validator.test.js` | Create | Unit tests for `checkSpec` |
| `apps/camora/src/components/capra/playground/RadarPane.jsx` | Delete | |
| `apps/camora/src/components/capra/playground/ClusterPanel.jsx` | Create | Native 4-tab k8s state panel |
| `apps/camora/src/components/capra/playground/ExercisePanel.jsx` | Create | Exercise steps + hint + validate sidebar |
| `apps/camora/src/components/capra/playground/PlaygroundShell.jsx` | Modify | Remove Radar; add Cluster tab + ExercisePanel |
| `apps/camora/src/hooks/usePlaygroundSession.js` | Modify | Remove radar_port/radarUrl; add scenario_slug |
| `apps/camora/src/hooks/useClusterState.js` | Create | SSE consumer hook |
| `apps/camora/src/pages/capra/K8sPathPage.jsx` | Create | Module accordion + topic cards + progress rings |
| `apps/camora/src/services/k8sPath-api.js` | Create | API calls to k8s-path routes |
| `apps/camora/src/App.tsx` | Modify | Add `/capra/k8s` route |

---

## Task 1: Remove Radar — Docker Images + Backend

**Files:**
- Modify: `docker/k8s/Dockerfile`, `docker/k8s/start.sh`
- Modify: `docker/k8s-multi/Dockerfile`, `docker/k8s-multi/start.sh`
- Modify: `apps/ascend-backend/src/services/playground/nomadClient.js`
- Modify: `apps/ascend-backend/src/services/playground/sessionStore.js`
- Modify: `apps/ascend-backend/src/services/playground/sessionManager.js`
- Modify: `apps/ascend-backend/src/routes/playgroundSessions.js`
- Modify: `apps/ascend-backend/src/index.js`
- Delete: `apps/ascend-backend/tests/playground/radarStatus.test.js`
- Delete: `apps/camora/src/components/capra/playground/RadarPane.jsx`

**Interfaces:**
- Produces: clean session create/boot with no `radar_port`/`radar_ready` fields anywhere

- [ ] **Step 1: Remove Radar from `docker/k8s/Dockerfile`**

Remove these 6 lines:
```
# Install Radar observability binary (binary is named kubectl-radar inside the archive)
RUN curl -fsSL https://github.com/skyhook-io/radar/releases/download/v1.7.9/radar_v1.7.9_linux_amd64.tar.gz \
    | tar xz -C /usr/local/bin kubectl-radar && \
    chmod +x /usr/local/bin/kubectl-radar && \
    ln -s /usr/local/bin/kubectl-radar /usr/local/bin/radar
```
Change `EXPOSE 7681 8080 9280` to `EXPOSE 7681 8080`.

- [ ] **Step 2: Remove Radar from `docker/k8s/start.sh`**

Remove this line:
```bash
KUBECONFIG=/etc/rancher/k3s/k3s.yaml radar --port 9280 --no-browser &>/var/log/radar.log &
```

- [ ] **Step 3: Same removals in `docker/k8s-multi/Dockerfile` and `docker/k8s-multi/start.sh`**

Identical changes as Steps 1–2.

- [ ] **Step 4: Remove `-p 0:9280` from k8s-multi docker run in `nomadClient.js`**

In `scheduleK8sMultiCluster`, change:
```js
const serverCmd = `docker run -d --rm --pull=always --memory=2048m --network ${networkName} --hostname k8s-master --name pg-${sessionId}-master --privileged ${serverEnvFlags} -p 0:7681 -p 0:8080 -p 0:9280 ${image}`;
```
To:
```js
const serverCmd = `docker run -d --rm --pull=always --memory=2048m --network ${networkName} --hostname k8s-master --name pg-${sessionId}-master --privileged ${serverEnvFlags} -p 0:7681 -p 0:8080 ${image}`;
```

In `getTaskAddress`, remove the radar port lookup block — find and remove:
```js
const out = await sshExec(`docker port ${jobId} 9280`);
```
and the surrounding `radarPort` variable and any `radarPort` in the return object.

- [ ] **Step 5: Remove `radar_port`/`radar_ready` from `sessionStore.js`**

Remove `radarPort = null` parameter from `createSessionRecord`. Remove `radar_port` from the INSERT columns and values. Remove the `markRadarReady` export function. Remove these two ALTER TABLE lines from startup:
```js
query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_port INTEGER').catch(() => {});
query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_ready BOOLEAN DEFAULT FALSE').catch(() => {});
```

- [ ] **Step 6: Remove `radar_port` from `sessionManager.js`**

Remove every occurrence of `radarPort` from return objects in `createSession` and any other function that currently returns it.

- [ ] **Step 7: Remove radar routes from `playgroundSessions.js`**

Remove the `GET /:id/radar-status` route block. Remove the two `pollUntilReady(host, session.radar_port, ...)` calls inside the session-events SSE boot sequence. Remove `markRadarReady` from the import on line 9:
```js
import { getSession, getSessionHistory, updateSessionStatus } from '../services/playground/sessionStore.js';
```

- [ ] **Step 8: Remove `/pg-radar` proxy from `index.js`**

Remove the `app.use('/pg-radar', async (req, res) => { ... })` block. Remove the WebSocket upgrade block that checks `req.url?.startsWith('/pg-radar')`.

- [ ] **Step 9: Delete dead files**

```bash
rm apps/ascend-backend/tests/playground/radarStatus.test.js
rm apps/camora/src/components/capra/playground/RadarPane.jsx
```

- [ ] **Step 10: Verify backend starts clean**

```bash
cd apps/ascend-backend && node src/index.js 2>&1 | grep -i radar
```
Expected: no output — no radar references in startup logs.

- [ ] **Step 11: Commit**

```bash
git add docker/ apps/ascend-backend/ apps/camora/src/components/capra/playground/RadarPane.jsx
git commit -m "feat(playground): remove Radar — binary, proxy, session fields, dead files"
```

---

## Task 2: `execInContainer` + Cluster-State SSE Endpoint

**Files:**
- Modify: `apps/ascend-backend/src/services/playground/nomadClient.js`
- Create: `apps/ascend-backend/src/services/playground/clusterState.js`
- Modify: `apps/ascend-backend/src/routes/playgroundSessions.js`
- Create: `apps/ascend-backend/tests/playground/clusterState.test.js`

**Interfaces:**
- Produces: `execInContainer(containerId: string, command: string): Promise<string>` — exported from nomadClient
- Produces: `parseClusterList(list: object): { pods, nodes, events, services }` — exported from clusterState
- Produces: `getExecContainer(session: object): string | null` — exported from clusterState
- Produces: `GET /api/v1/playground/sessions/:id/cluster-state` SSE emitting `{ pods, nodes, events, services }` every 5s

- [ ] **Step 1: Add `execInContainer` to `nomadClient.js`**

Add after `execScriptInContainerStream`:
```js
export async function execInContainer(containerId, command) {
  return sshExec(`docker exec ${containerId} sh -c ${JSON.stringify(command)}`);
}
```

- [ ] **Step 2: Write failing tests for `clusterState.js`**

Create `apps/ascend-backend/tests/playground/clusterState.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { parseClusterList, getExecContainer } from '../../src/services/playground/clusterState.js';

const MOCK_LIST = {
  items: [
    { kind: 'Pod',     metadata: { name: 'nginx', namespace: 'default', creationTimestamp: '2026-06-19T00:00:00Z' }, status: { phase: 'Running' }, spec: { nodeName: 'k3s-server' } },
    { kind: 'Node',    metadata: { name: 'k3s-server', creationTimestamp: '2026-06-19T00:00:00Z' }, status: { conditions: [{ type: 'Ready', status: 'True' }] } },
    { kind: 'Service', metadata: { name: 'kubernetes', namespace: 'default', creationTimestamp: '2026-06-19T00:00:00Z' }, spec: { type: 'ClusterIP', ports: [{ port: 443 }] } },
    { kind: 'Event',   metadata: { name: 'ev1', namespace: 'default', creationTimestamp: '2026-06-19T00:01:00Z' }, reason: 'Scheduled', message: 'assigned', type: 'Normal', involvedObject: { name: 'nginx' } },
  ],
};

describe('parseClusterList', () => {
  it('splits items by kind', () => {
    const r = parseClusterList(MOCK_LIST);
    expect(r.pods).toHaveLength(1);
    expect(r.nodes).toHaveLength(1);
    expect(r.services).toHaveLength(1);
    expect(r.events).toHaveLength(1);
  });

  it('returns empty arrays when items is empty', () => {
    const r = parseClusterList({ items: [] });
    expect(r.pods).toEqual([]);
    expect(r.nodes).toEqual([]);
    expect(r.events).toEqual([]);
    expect(r.services).toEqual([]);
  });

  it('caps events at 10 most recent', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      kind: 'Event', metadata: { name: `ev${i}`, creationTimestamp: `2026-06-19T00:${String(i).padStart(2,'0')}:00Z` },
    }));
    const r = parseClusterList({ items });
    expect(r.events).toHaveLength(10);
  });
});

describe('getExecContainer', () => {
  it('returns nomad_job_id for k8s-single', () => {
    expect(getExecContainer({ environment: 'k8s-single', nomad_job_id: 'abc123', cluster_nodes: null })).toBe('abc123');
  });

  it('returns server node containerId for k8s-multi', () => {
    const nodes = [{ role: 'server', containerId: 'srv001' }, { role: 'agent', containerId: 'agt001' }];
    expect(getExecContainer({ environment: 'k8s-multi', cluster_nodes: JSON.stringify(nodes) })).toBe('srv001');
  });
});
```

- [ ] **Step 3: Run — verify fails**

```bash
cd apps/ascend-backend && npx vitest run tests/playground/clusterState.test.js
```
Expected: FAIL — `clusterState.js` not found.

- [ ] **Step 4: Create `apps/ascend-backend/src/services/playground/clusterState.js`**

```js
export function parseClusterList(list) {
  const items = list?.items ?? [];
  const pods     = items.filter(i => i.kind === 'Pod');
  const nodes    = items.filter(i => i.kind === 'Node');
  const services = items.filter(i => i.kind === 'Service');
  const events   = items
    .filter(i => i.kind === 'Event')
    .sort((a, b) =>
      new Date(b.metadata?.creationTimestamp ?? 0) - new Date(a.metadata?.creationTimestamp ?? 0)
    )
    .slice(0, 10);
  return { pods, nodes, events, services };
}

export function getExecContainer(session) {
  if (session.environment === 'k8s-multi') {
    const nodes = typeof session.cluster_nodes === 'string'
      ? JSON.parse(session.cluster_nodes)
      : (session.cluster_nodes ?? []);
    const server = nodes.find(n => n.role === 'server') ?? nodes[0];
    return server?.containerId ?? null;
  }
  return session.nomad_job_id ?? null;
}
```

- [ ] **Step 5: Run — verify passes**

```bash
cd apps/ascend-backend && npx vitest run tests/playground/clusterState.test.js
```
Expected: 5 tests pass.

- [ ] **Step 6: Add cluster-state SSE route to `playgroundSessions.js`**

Add imports at top of file:
```js
import { execInContainer } from '../services/playground/nomadClient.js';
import { parseClusterList, getExecContainer } from '../services/playground/clusterState.js';
```

Add route inside `playgroundSessionsRouter`:
```js
const K8S_CLUSTER_ENVS = new Set(['k8s-single', 'k8s-multi']);

playgroundSessionsRouter.get('/:id/cluster-state', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) return res.status(404).end();
  if (!K8S_CLUSTER_ENVS.has(session.environment)) {
    return res.status(400).json({ error: 'cluster-state only available for k8s environments' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let closed = false;
  req.on('close', () => { closed = true; });

  const containerId = getExecContainer(session);
  if (!containerId) { res.end(); return; }

  const CMD = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl get pods,nodes,events,services -A -o json 2>/dev/null';

  const tick = async () => {
    if (closed) return;
    try {
      const raw = await execInContainer(containerId, CMD);
      const data = parseClusterList(JSON.parse(raw));
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch { /* cluster not ready yet — skip */ }
    if (!closed) setTimeout(tick, 5000);
  };

  tick();
});
```

- [ ] **Step 7: Smoke-test the endpoint**

Start a k8s-single session then:
```bash
curl -N --cookie "cariara_sso=<token>" \
  http://localhost:3009/api/v1/playground/sessions/<sessionId>/cluster-state
```
Expected: JSON events every 5s with `{ pods, nodes, events, services }` arrays.

- [ ] **Step 8: Commit**

```bash
git add apps/ascend-backend/src/services/playground/clusterState.js \
        apps/ascend-backend/src/services/playground/nomadClient.js \
        apps/ascend-backend/src/routes/playgroundSessions.js \
        apps/ascend-backend/tests/playground/clusterState.test.js
git commit -m "feat(playground): add execInContainer + cluster-state SSE endpoint"
```

---

## Task 3: ClusterPanel + useClusterState (Frontend)

**Files:**
- Create: `apps/camora/src/hooks/useClusterState.js`
- Create: `apps/camora/src/components/capra/playground/ClusterPanel.jsx`
- Modify: `apps/camora/src/components/capra/playground/PlaygroundShell.jsx`
- Modify: `apps/camora/src/hooks/usePlaygroundSession.js`

**Interfaces:**
- Consumes: `GET /api/v1/playground/sessions/:id/cluster-state` SSE
- Produces: `useClusterState(sessionId, active)` → `{ pods, nodes, events, services }`
- Produces: `<ClusterPanel sessionId active exerciseSelector />` — `exerciseSelector` is a label selector string like `"app=nginx"` used to highlight pods; pass `null` if no exercise is active

- [ ] **Step 1: Create `apps/camora/src/hooks/useClusterState.js`**

```js
import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

export function useClusterState(sessionId, active) {
  const [state, setState] = useState({ pods: [], nodes: [], events: [], services: [] });
  const esRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !active) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }
    const es = new EventSource(
      `${API}/api/v1/playground/sessions/${sessionId}/cluster-state`,
      { withCredentials: true },
    );
    esRef.current = es;
    es.onmessage = (e) => { try { setState(JSON.parse(e.data)); } catch {} };
    return () => { es.close(); esRef.current = null; };
  }, [sessionId, active]);

  return state;
}
```

- [ ] **Step 2: Create `apps/camora/src/components/capra/playground/ClusterPanel.jsx`**

```jsx
import { useState } from 'react';
import { useClusterState } from '@/hooks/useClusterState';

const TABS = [
  { key: 'nodes',    label: 'Nodes',    cmd: 'kubectl get nodes' },
  { key: 'pods',     label: 'Pods',     cmd: 'kubectl get pods -A' },
  { key: 'events',   label: 'Events',   cmd: 'kubectl get events -A --sort-by=.lastTimestamp' },
  { key: 'services', label: 'Services', cmd: 'kubectl get services -A' },
];

function matchesSelector(labels = {}, selector) {
  if (!selector) return false;
  return selector.split(',').every(kv => {
    const [k, v] = kv.split('=');
    return labels[k] === v;
  });
}

const TBL  = { width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: '"IBM Plex Mono", monospace' };
const THTR = { borderBottom: '1px solid rgba(255,255,255,0.08)' };
const TH   = { padding: '6px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: 10, letterSpacing: '0.05em' };
const TR   = { borderBottom: '1px solid rgba(255,255,255,0.04)' };
const TD   = { padding: '6px 12px', color: 'rgba(255,255,255,0.75)' };

function Dot({ ok }) {
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginRight: 6,
    background: ok ? '#10b981' : '#ef4444', boxShadow: ok ? '0 0 5px #10b981' : 'none' }} />;
}

function Empty({ text }) {
  return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12,
    fontFamily: '"IBM Plex Mono", monospace' }}>{text}</div>;
}

function NodesTab({ nodes }) {
  if (!nodes.length) return <Empty text="No nodes yet — cluster is starting" />;
  return (
    <table style={TBL}>
      <thead><tr style={THTR}>{['NAME','STATUS','ROLE','VERSION'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
      <tbody>{nodes.map(n => {
        const ready = n.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True';
        const role = Object.keys(n.metadata?.labels ?? {})
          .filter(k => k.startsWith('node-role.kubernetes.io/')).map(k => k.split('/')[1]).join(',') || 'worker';
        return (
          <tr key={n.metadata?.name} style={TR}>
            <td style={TD}><Dot ok={ready} />{n.metadata?.name}</td>
            <td style={TD}><span style={{ color: ready ? '#10b981' : '#ef4444' }}>{ready ? 'Ready' : 'NotReady'}</span></td>
            <td style={TD}>{role}</td>
            <td style={TD}>{n.status?.nodeInfo?.kubeletVersion ?? '—'}</td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function PodsTab({ pods, exerciseSelector }) {
  if (!pods.length) return <Empty text="No pods yet" />;
  return (
    <table style={TBL}>
      <thead><tr style={THTR}>{['NAMESPACE','NAME','STATUS','RESTARTS','NODE'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
      <tbody>{pods.map(p => {
        const highlighted = matchesSelector(p.metadata?.labels, exerciseSelector);
        const phase = p.status?.phase ?? '—';
        const restarts = p.status?.containerStatuses?.[0]?.restartCount ?? 0;
        return (
          <tr key={`${p.metadata?.namespace}/${p.metadata?.name}`} style={{
            ...TR, borderLeft: highlighted ? '3px solid #d4a043' : '3px solid transparent',
          }}>
            <td style={TD}>{p.metadata?.namespace}</td>
            <td style={TD}>{p.metadata?.name}</td>
            <td style={TD}><span style={{ color: phase === 'Running' ? '#10b981' : '#f59e0b' }}>{phase}</span></td>
            <td style={TD}>{restarts}</td>
            <td style={TD}>{p.spec?.nodeName ?? '—'}</td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function EventsTab({ events }) {
  if (!events.length) return <Empty text="No events yet" />;
  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {events.map(e => (
        <div key={e.metadata?.name} style={{
          padding: '6px 10px', borderRadius: 6, fontSize: 11, fontFamily: '"IBM Plex Mono", monospace',
          background: e.type === 'Warning' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${e.type === 'Warning' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          <span style={{ color: e.type === 'Warning' ? '#ef4444' : '#10b981', marginRight: 8 }}>
            {e.type === 'Warning' ? '⚠' : '●'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 6 }}>{e.reason}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>{e.involvedObject?.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.65)' }}>{e.message}</span>
        </div>
      ))}
    </div>
  );
}

function ServicesTab({ services }) {
  if (!services.length) return <Empty text="No services yet" />;
  return (
    <table style={TBL}>
      <thead><tr style={THTR}>{['NAMESPACE','NAME','TYPE','CLUSTER-IP','PORT(S)'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
      <tbody>{services.map(s => (
        <tr key={`${s.metadata?.namespace}/${s.metadata?.name}`} style={TR}>
          <td style={TD}>{s.metadata?.namespace}</td>
          <td style={TD}>{s.metadata?.name}</td>
          <td style={TD}>{s.spec?.type}</td>
          <td style={TD}>{s.spec?.clusterIP}</td>
          <td style={TD}>{s.spec?.ports?.map(p => p.port).join(', ') ?? '—'}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

export default function ClusterPanel({ sessionId, active, exerciseSelector }) {
  const [tab, setTab] = useState('nodes');
  const { pods, nodes, events, services } = useClusterState(sessionId, active);
  const counts = { nodes: nodes.length, pods: pods.length, events: events.length, services: services.length };
  const currentCmd = TABS.find(t => t.key === tab)?.cmd;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0e1a' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px',
        height: 36, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0d1117' }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: tab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: `1px solid ${tab === t.key ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
            color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
          }}>
            {t.label}
            <span style={{ marginLeft: 5, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{counts[t.key]}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: '"IBM Plex Mono", monospace', paddingRight: 8 }}>
          {currentCmd}
        </code>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'nodes'    && <NodesTab nodes={nodes} />}
        {tab === 'pods'     && <PodsTab pods={pods} exerciseSelector={exerciseSelector} />}
        {tab === 'events'   && <EventsTab events={events} />}
        {tab === 'services' && <ServicesTab services={services} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `PlaygroundShell.jsx`**

Remove:
```js
import RadarPane from './RadarPane';
```
Add:
```js
import ClusterPanel from './ClusterPanel';
```

Remove `radarUrl` from `usePlaygroundSession()` destructuring.

Add below `isActive`:
```js
const isK8sEnv = ['k8s-single', 'k8s-multi'].includes(session?.environment);
```

Replace Radar tab button with:
```jsx
{isK8sEnv && (
  <TabButton active={activeTab === 'cluster'} onClick={() => setActiveTab('cluster')} label="Cluster" icon="⬡" />
)}
```

Replace Radar pane with:
```jsx
{isK8sEnv && (
  <div style={{ position: 'absolute', inset: 0, display: activeTab === 'cluster' ? 'block' : 'none' }}>
    <ClusterPanel sessionId={session?.sessionId} active={activeTab === 'cluster'} exerciseSelector={null} />
  </div>
)}
```

- [ ] **Step 4: Remove `radarUrl` from `usePlaygroundSession.js`**

Remove `radar_port: data.radar_port || null` from the session state object. Remove the `radarUrl` construction and remove it from the hook's return value. Remove the one-shot re-fetch that was added to pick up `radar_port` in `onReady`.

- [ ] **Step 5: Build**

```bash
cd apps/camora && npx vite build
```
Expected: no errors. No reference to `RadarPane` or `radarUrl`.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/hooks/useClusterState.js \
        apps/camora/src/components/capra/playground/ClusterPanel.jsx \
        apps/camora/src/components/capra/playground/PlaygroundShell.jsx \
        apps/camora/src/hooks/usePlaygroundSession.js
git commit -m "feat(playground): native ClusterPanel replaces Radar iframe"
```

---

## Task 4: Database Schema + Module 1 Curriculum Seed

**Files:**
- Modify: `apps/ascend-backend/src/index.js`
- Create: `apps/ascend-backend/src/services/k8s/curriculum.js`

**Interfaces:**
- Produces: tables `k8s_topics`, `k8s_exercises`, `k8s_progress`
- Produces: `seedK8sCurriculum(): Promise<void>` — idempotent, INSERT ... ON CONFLICT DO NOTHING

- [ ] **Step 1: Add migrations to `index.js`**

After the existing `playground_sessions` table migration block:
```js
await query(`CREATE TABLE IF NOT EXISTS k8s_topics (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  module        INTEGER NOT NULL,
  topic_order   INTEGER NOT NULL,
  environment   TEXT NOT NULL DEFAULT 'k8s-single',
  estimated_min INTEGER NOT NULL DEFAULT 20,
  setup_script  TEXT
)`);

await query(`CREATE TABLE IF NOT EXISTS k8s_exercises (
  id               SERIAL PRIMARY KEY,
  topic_id         INTEGER REFERENCES k8s_topics(id) ON DELETE CASCADE,
  exercise_order   INTEGER NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  code_example     TEXT,
  hint             TEXT,
  validation_spec  JSONB NOT NULL
)`);

await query(`CREATE TABLE IF NOT EXISTS k8s_progress (
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  exercise_id  INTEGER REFERENCES k8s_exercises(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, exercise_id)
)`);
```

- [ ] **Step 2: Create `apps/ascend-backend/src/services/k8s/curriculum.js`**

```js
import { query } from '../../config/database.js';

const TOPICS = [
  { slug: 'pods',             title: 'Pods',             module: 1, topic_order: 1, environment: 'k8s-single', estimated_min: 20, setup_script: null },
  { slug: 'namespaces',       title: 'Namespaces',       module: 1, topic_order: 2, environment: 'k8s-single', estimated_min: 15, setup_script: null },
  { slug: 'labels-selectors', title: 'Labels & Selectors', module: 1, topic_order: 3, environment: 'k8s-single', estimated_min: 20,
    setup_script: `kubectl run web --image=nginx:alpine -l env=prod,tier=frontend --restart=Never\nkubectl run db --image=redis:alpine -l env=prod,tier=backend --restart=Never\nkubectl wait --for=condition=Ready pod/web pod/db --timeout=60s` },
  { slug: 'annotations',      title: 'Annotations',      module: 1, topic_order: 4, environment: 'k8s-single', estimated_min: 15,
    setup_script: `kubectl run web --image=nginx:alpine --restart=Never\nkubectl wait --for=condition=Ready pod/web --timeout=60s` },
];

const EXERCISES = [
  // ── Pods ──
  { topic_slug: 'pods', exercise_order: 1, title: 'Create a Pod',
    description: 'Create a pod named web running nginx:alpine.',
    code_example: 'kubectl run web --image=nginx:alpine --restart=Never',
    hint: 'Use --restart=Never to create a standalone pod, not a Deployment.',
    validation_spec: { type: 'pod_running', selector: 'run=web', namespace: 'default' } },
  { topic_slug: 'pods', exercise_order: 2, title: 'Inspect a Pod',
    description: 'View full details of the web pod including events, IP, and resource limits.',
    code_example: 'kubectl describe pod web',
    hint: 'kubectl describe is the most useful debugging command — learn it well.',
    validation_spec: { type: 'pod_running', selector: 'run=web', namespace: 'default' } },
  { topic_slug: 'pods', exercise_order: 3, title: 'View Pod Logs',
    description: 'Stream live logs from the web pod.',
    code_example: 'kubectl logs -f web',
    hint: 'Press Ctrl+C to stop. Without -f you get a snapshot of past logs.',
    validation_spec: { type: 'pod_running', selector: 'run=web', namespace: 'default' } },
  { topic_slug: 'pods', exercise_order: 4, title: 'Delete a Pod',
    description: 'Delete the web pod and verify it is gone.',
    code_example: 'kubectl delete pod web',
    hint: 'A standalone pod will not restart after deletion. A Deployment-managed pod would.',
    validation_spec: { type: 'resource_deleted', kind: 'pod', name: 'web', namespace: 'default' } },

  // ── Namespaces ──
  { topic_slug: 'namespaces', exercise_order: 1, title: 'Create a Namespace',
    description: 'Create a namespace named staging.',
    code_example: 'kubectl create namespace staging',
    hint: 'Namespaces scope resources. The default namespace is used when -n is omitted.',
    validation_spec: { type: 'namespace_exists', name: 'staging' } },
  { topic_slug: 'namespaces', exercise_order: 2, title: 'Run a Pod in a Namespace',
    description: 'Create a pod named app in the staging namespace running nginx:alpine.',
    code_example: 'kubectl run app --image=nginx:alpine --restart=Never -n staging',
    hint: 'Always pass -n <namespace>. Without it, resources go to default.',
    validation_spec: { type: 'pod_running', selector: 'run=app', namespace: 'staging' } },
  { topic_slug: 'namespaces', exercise_order: 3, title: 'List Pods Across All Namespaces',
    description: 'List every pod in the cluster regardless of namespace.',
    code_example: 'kubectl get pods -A',
    hint: '-A is short for --all-namespaces. A NAMESPACE column appears in output.',
    validation_spec: { type: 'pod_running', selector: 'run=app', namespace: 'staging' } },

  // ── Labels & Selectors ──
  { topic_slug: 'labels-selectors', exercise_order: 1, title: 'List Pods by Label',
    description: 'List only pods in the prod environment. Two pods were pre-created with env=prod.',
    code_example: 'kubectl get pods -l env=prod',
    hint: 'You can chain selectors: -l env=prod,tier=frontend',
    validation_spec: { type: 'pod_count', selector: 'env=prod', namespace: 'default', min: 2 } },
  { topic_slug: 'labels-selectors', exercise_order: 2, title: 'Add a Label',
    description: 'Label the web pod with version=v1.',
    code_example: 'kubectl label pod web version=v1',
    hint: 'Verify with: kubectl get pod web --show-labels',
    validation_spec: { type: 'pod_label', name: 'web', namespace: 'default', label: 'version', value: 'v1' } },
  { topic_slug: 'labels-selectors', exercise_order: 3, title: 'Select by Tier',
    description: 'List only pods with tier=frontend.',
    code_example: 'kubectl get pods -l tier=frontend',
    hint: 'Services use the exact same selector syntax to route traffic to pods.',
    validation_spec: { type: 'pod_count', selector: 'tier=frontend', namespace: 'default', min: 1 } },
  { topic_slug: 'labels-selectors', exercise_order: 4, title: 'Remove a Label',
    description: 'Remove the version label from the web pod.',
    code_example: 'kubectl label pod web version-',
    hint: 'A trailing dash (KEY-) removes the label. This detaches a pod from Service selectors.',
    validation_spec: { type: 'pod_label_absent', name: 'web', namespace: 'default', label: 'version' } },

  // ── Annotations ──
  { topic_slug: 'annotations', exercise_order: 1, title: 'Add an Annotation',
    description: 'Annotate the web pod with description="nginx frontend".',
    code_example: 'kubectl annotate pod web description="nginx frontend"',
    hint: 'Annotations are metadata for tools (CI/CD, monitoring) — not for selectors.',
    validation_spec: { type: 'pod_annotation', name: 'web', namespace: 'default', key: 'description' } },
  { topic_slug: 'annotations', exercise_order: 2, title: 'Read Annotations via JSONPath',
    description: 'Extract annotations from the web pod using jsonpath.',
    code_example: 'kubectl get pod web -o jsonpath="{.metadata.annotations}"',
    hint: 'jsonpath lets you extract specific fields — very useful in scripts and CI pipelines.',
    validation_spec: { type: 'pod_annotation', name: 'web', namespace: 'default', key: 'description' } },
  { topic_slug: 'annotations', exercise_order: 3, title: 'Remove an Annotation',
    description: 'Remove the description annotation from the web pod.',
    code_example: 'kubectl annotate pod web description-',
    hint: 'Trailing dash pattern — same as removing labels.',
    validation_spec: { type: 'pod_annotation_absent', name: 'web', namespace: 'default', key: 'description' } },
];

export async function seedK8sCurriculum() {
  for (const t of TOPICS) {
    await query(
      `INSERT INTO k8s_topics (slug, title, module, topic_order, environment, estimated_min, setup_script)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING`,
      [t.slug, t.title, t.module, t.topic_order, t.environment, t.estimated_min, t.setup_script],
    );
  }
  for (const e of EXERCISES) {
    const tr = await query('SELECT id FROM k8s_topics WHERE slug = $1', [e.topic_slug]);
    const topicId = tr.rows[0]?.id;
    if (!topicId) continue;
    await query(
      `INSERT INTO k8s_exercises (topic_id, exercise_order, title, description, code_example, hint, validation_spec)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [topicId, e.exercise_order, e.title, e.description, e.code_example, e.hint, JSON.stringify(e.validation_spec)],
    );
  }
}
```

- [ ] **Step 3: Import and call `seedK8sCurriculum` in `index.js`**

```js
import { seedK8sCurriculum } from './services/k8s/curriculum.js';
// After the k8s_progress CREATE TABLE:
await seedK8sCurriculum();
```

- [ ] **Step 4: Verify**

```bash
cd apps/ascend-backend && node src/index.js 2>&1 | grep -i "error\|radar" | head -5
```
Expected: no output.

```bash
psql $DATABASE_URL -c "SELECT slug FROM k8s_topics ORDER BY topic_order;"
```
Expected: `pods`, `namespaces`, `labels-selectors`, `annotations`.

- [ ] **Step 5: Commit**

```bash
git add apps/ascend-backend/src/index.js \
        apps/ascend-backend/src/services/k8s/curriculum.js
git commit -m "feat(k8s-path): DB schema + Module 1 curriculum seed (14 exercises)"
```

---

## Task 5: Validation Engine + K8s Path API Routes

**Files:**
- Create: `apps/ascend-backend/src/services/k8s/validator.js`
- Create: `apps/ascend-backend/src/routes/k8sPath.js`
- Create: `apps/ascend-backend/tests/k8s/validator.test.js`
- Modify: `apps/ascend-backend/src/routes/playgroundSessions.js`
- Modify: `apps/ascend-backend/src/index.js`

**Interfaces:**
- Consumes: `execInContainer` from nomadClient, `getExecContainer` from clusterState
- Produces: `checkSpec(session, spec): Promise<{ passed, message, hint }>`
- Produces: `GET /api/v1/k8s-path/topics` → `{ topics: [...] }`
- Produces: `GET /api/v1/k8s-path/topics/:slug` → `{ topic, exercises }`
- Produces: `POST /api/v1/playground/sessions/:id/validate-exercise` body `{ exerciseId }` → `{ passed, message, hint }`

- [ ] **Step 1: Write failing validator tests**

Create `apps/ascend-backend/tests/k8s/validator.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { checkSpec } from '../../src/services/k8s/validator.js';

vi.mock('../../src/services/playground/nomadClient.js', () => ({
  execInContainer: vi.fn(),
}));
import { execInContainer } from '../../src/services/playground/nomadClient.js';

const SESSION = { nomad_job_id: 'test-ctr', environment: 'k8s-single', cluster_nodes: null };

describe('checkSpec', () => {
  it('pod_running: passes when a pod with matching label is Running', async () => {
    execInContainer.mockResolvedValueOnce(JSON.stringify({
      items: [{ metadata: { name: 'web', labels: { run: 'web' } }, status: { phase: 'Running' } }],
    }));
    const r = await checkSpec(SESSION, { type: 'pod_running', selector: 'run=web', namespace: 'default' });
    expect(r.passed).toBe(true);
  });

  it('pod_running: fails when no pods match', async () => {
    execInContainer.mockResolvedValueOnce(JSON.stringify({ items: [] }));
    const r = await checkSpec(SESSION, { type: 'pod_running', selector: 'run=web', namespace: 'default' });
    expect(r.passed).toBe(false);
    expect(r.hint).toBeTruthy();
  });

  it('resource_deleted: passes when item list is empty', async () => {
    execInContainer.mockResolvedValueOnce(JSON.stringify({ items: [] }));
    const r = await checkSpec(SESSION, { type: 'resource_deleted', kind: 'pod', name: 'web', namespace: 'default' });
    expect(r.passed).toBe(true);
  });

  it('namespace_exists: passes when namespace found', async () => {
    execInContainer.mockResolvedValueOnce(JSON.stringify({ metadata: { name: 'staging' } }));
    const r = await checkSpec(SESSION, { type: 'namespace_exists', name: 'staging' });
    expect(r.passed).toBe(true);
  });

  it('pod_count: passes when min met', async () => {
    execInContainer.mockResolvedValueOnce(JSON.stringify({
      items: [
        { metadata: { labels: { env: 'prod' } }, status: { phase: 'Running' } },
        { metadata: { labels: { env: 'prod' } }, status: { phase: 'Running' } },
      ],
    }));
    const r = await checkSpec(SESSION, { type: 'pod_count', selector: 'env=prod', namespace: 'default', min: 2 });
    expect(r.passed).toBe(true);
  });

  it('pod_label: passes when label value matches', async () => {
    execInContainer.mockResolvedValueOnce(JSON.stringify({
      metadata: { name: 'web', labels: { version: 'v1' } },
    }));
    const r = await checkSpec(SESSION, { type: 'pod_label', name: 'web', namespace: 'default', label: 'version', value: 'v1' });
    expect(r.passed).toBe(true);
  });

  it('returns error message when exec throws', async () => {
    execInContainer.mockRejectedValueOnce(new Error('connection refused'));
    const r = await checkSpec(SESSION, { type: 'pod_running', selector: 'run=web', namespace: 'default' });
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/error/i);
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
cd apps/ascend-backend && npx vitest run tests/k8s/validator.test.js
```
Expected: FAIL — `validator.js` not found.

- [ ] **Step 3: Create `apps/ascend-backend/src/services/k8s/validator.js`**

```js
import { execInContainer } from '../playground/nomadClient.js';
import { getExecContainer } from '../playground/clusterState.js';

const KCF = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml';

async function kctl(session, cmd) {
  const id = getExecContainer(session);
  if (!id) throw new Error('No container for session');
  const raw = await execInContainer(id, `${KCF} kubectl ${cmd} -o json 2>/dev/null`);
  return JSON.parse(raw);
}

export async function checkSpec(session, spec) {
  try {
    switch (spec.type) {
      case 'pod_running': {
        const r = await kctl(session, `get pods -n ${spec.namespace} -l ${spec.selector}`);
        const running = r.items?.some(p => p.status?.phase === 'Running');
        return running
          ? { passed: true,  message: 'Pod is Running' }
          : { passed: false, message: 'No running pod found matching the selector.', hint: `Try: kubectl run web --image=nginx:alpine --restart=Never` };
      }
      case 'pod_count': {
        const r = await kctl(session, `get pods -n ${spec.namespace} -l ${spec.selector}`);
        const count = r.items?.filter(p => p.status?.phase === 'Running').length ?? 0;
        return count >= spec.min
          ? { passed: true,  message: `${count} pod(s) running` }
          : { passed: false, message: `Found ${count}, need ${spec.min}.`, hint: `Check: kubectl get pods -l ${spec.selector}` };
      }
      case 'deployment_ready': {
        const r = await kctl(session, `get deployment ${spec.name} -n ${spec.namespace ?? 'default'}`);
        const ready = (r.items?.[0] ?? r).status?.readyReplicas ?? 0;
        const want  = spec.replicas ?? (r.items?.[0] ?? r).spec?.replicas ?? 1;
        return ready >= want
          ? { passed: true,  message: `${spec.name}: ${ready}/${want} ready` }
          : { passed: false, message: `${spec.name}: ${ready}/${want} ready`, hint: `Check: kubectl rollout status deployment/${spec.name}` };
      }
      case 'service_exists': {
        const r = await kctl(session, `get service ${spec.name} -n ${spec.namespace ?? 'default'}`);
        const svc = r.items?.[0] ?? r;
        if (!svc.metadata?.name) return { passed: false, message: `Service ${spec.name} not found.`, hint: `Try: kubectl expose pod web --port=80 --name=${spec.name}` };
        const portOk = !spec.port || svc.spec?.ports?.some(p => p.port === spec.port);
        return portOk
          ? { passed: true,  message: `Service ${spec.name} exists` }
          : { passed: false, message: `Service exists but port ${spec.port} not configured.`, hint: `Check: kubectl describe svc ${spec.name}` };
      }
      case 'namespace_exists': {
        const r = await kctl(session, `get namespace ${spec.name}`);
        return r.metadata?.name === spec.name
          ? { passed: true,  message: `Namespace ${spec.name} exists` }
          : { passed: false, message: `Namespace ${spec.name} not found.`, hint: `Try: kubectl create namespace ${spec.name}` };
      }
      case 'configmap_exists': {
        const r = await kctl(session, `get configmap ${spec.name} -n ${spec.namespace ?? 'default'}`);
        if (!r.metadata?.name) return { passed: false, message: `ConfigMap ${spec.name} not found.`, hint: `Try: kubectl create configmap ${spec.name} --from-literal=${spec.key ?? 'key'}=value` };
        const hasKey = !spec.key || spec.key in (r.data ?? {});
        return hasKey
          ? { passed: true,  message: `ConfigMap ${spec.name} exists` }
          : { passed: false, message: `ConfigMap exists but key ${spec.key} missing.`, hint: `Check: kubectl describe configmap ${spec.name}` };
      }
      case 'secret_exists': {
        const r = await kctl(session, `get secret ${spec.name} -n ${spec.namespace ?? 'default'}`);
        return r.metadata?.name
          ? { passed: true,  message: `Secret ${spec.name} exists` }
          : { passed: false, message: `Secret ${spec.name} not found.`, hint: `Try: kubectl create secret generic ${spec.name} --from-literal=key=value` };
      }
      case 'pvc_bound': {
        const r = await kctl(session, `get pvc ${spec.name} -n ${spec.namespace ?? 'default'}`);
        const phase = r.status?.phase;
        return phase === 'Bound'
          ? { passed: true,  message: `PVC ${spec.name} is Bound` }
          : { passed: false, message: `PVC ${spec.name} is ${phase ?? 'not found'}.`, hint: `Check: kubectl describe pvc ${spec.name}` };
      }
      case 'resource_deleted': {
        const r = await kctl(session, `get ${spec.kind} ${spec.name} -n ${spec.namespace ?? 'default'}`);
        return r.metadata?.name === spec.name
          ? { passed: false, message: `${spec.kind} ${spec.name} still exists.`, hint: `Try: kubectl delete ${spec.kind} ${spec.name}` }
          : { passed: true,  message: `${spec.kind} ${spec.name} deleted` };
      }
      case 'pod_label': {
        const r = await kctl(session, `get pod ${spec.name} -n ${spec.namespace ?? 'default'}`);
        const val = r.metadata?.labels?.[spec.label];
        return val === spec.value
          ? { passed: true,  message: `Label ${spec.label}=${spec.value} set` }
          : { passed: false, message: `Label ${spec.label}=${spec.value} not found (current: ${val ?? 'absent'}).`, hint: `Try: kubectl label pod ${spec.name} ${spec.label}=${spec.value}` };
      }
      case 'pod_label_absent': {
        const r = await kctl(session, `get pod ${spec.name} -n ${spec.namespace ?? 'default'}`);
        return !(spec.label in (r.metadata?.labels ?? {}))
          ? { passed: true,  message: `Label ${spec.label} removed` }
          : { passed: false, message: `Label ${spec.label} still present.`, hint: `Try: kubectl label pod ${spec.name} ${spec.label}-` };
      }
      case 'pod_annotation': {
        const r = await kctl(session, `get pod ${spec.name} -n ${spec.namespace ?? 'default'}`);
        return spec.key in (r.metadata?.annotations ?? {})
          ? { passed: true,  message: `Annotation ${spec.key} found` }
          : { passed: false, message: `Annotation ${spec.key} not set.`, hint: `Try: kubectl annotate pod ${spec.name} ${spec.key}="value"` };
      }
      case 'pod_annotation_absent': {
        const r = await kctl(session, `get pod ${spec.name} -n ${spec.namespace ?? 'default'}`);
        return !(spec.key in (r.metadata?.annotations ?? {}))
          ? { passed: true,  message: `Annotation ${spec.key} removed` }
          : { passed: false, message: `Annotation ${spec.key} still present.`, hint: `Try: kubectl annotate pod ${spec.name} ${spec.key}-` };
      }
      default:
        return { passed: false, message: `Unknown spec type: ${spec.type}`, hint: '' };
    }
  } catch (err) {
    return { passed: false, message: `Validation error: ${err.message}`, hint: 'Cluster may still be starting. Try again in a few seconds.' };
  }
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
cd apps/ascend-backend && npx vitest run tests/k8s/validator.test.js
```
Expected: 7 tests pass.

- [ ] **Step 5: Add `validate-exercise` route to `playgroundSessions.js`**

Add imports:
```js
import { checkSpec } from '../services/k8s/validator.js';
```

Add route inside `playgroundSessionsRouter`:
```js
playgroundSessionsRouter.post('/:id/validate-exercise', async (req, res) => {
  const { exerciseId } = req.body;
  if (!exerciseId) return res.status(400).json({ error: 'exerciseId required' });

  const session = await getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) return res.status(404).end();

  const exResult = await query('SELECT * FROM k8s_exercises WHERE id = $1', [exerciseId]);
  const exercise = exResult.rows[0];
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

  const result = await checkSpec(session, exercise.validation_spec);

  if (result.passed) {
    await query(
      `INSERT INTO k8s_progress (user_id, exercise_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, exerciseId],
    );
  }

  return res.json(result);
});
```

Note: `query` is already imported in `playgroundSessions.js` as `import { query } from '../config/database.js'`.

- [ ] **Step 6: Create `apps/ascend-backend/src/routes/k8sPath.js`**

```js
import { Router } from 'express';
import { query } from '../config/database.js';

export const k8sPathRouter = Router();

k8sPathRouter.get('/topics', async (req, res) => {
  const result = await query(`
    SELECT t.id, t.slug, t.title, t.module, t.topic_order, t.estimated_min, t.environment,
      COUNT(e.id)::int AS exercise_count,
      COUNT(p.exercise_id)::int AS completed_count
    FROM k8s_topics t
    LEFT JOIN k8s_exercises e ON e.topic_id = t.id
    LEFT JOIN k8s_progress p ON p.exercise_id = e.id AND p.user_id = $1
    GROUP BY t.id
    ORDER BY t.module, t.topic_order
  `, [req.user.id]);
  return res.json({ topics: result.rows });
});

k8sPathRouter.get('/topics/:slug', async (req, res) => {
  const topicRes = await query('SELECT * FROM k8s_topics WHERE slug = $1', [req.params.slug]);
  const topic = topicRes.rows[0];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  const exRes = await query(`
    SELECT e.*, (p.exercise_id IS NOT NULL) AS completed
    FROM k8s_exercises e
    LEFT JOIN k8s_progress p ON p.exercise_id = e.id AND p.user_id = $1
    WHERE e.topic_id = $2
    ORDER BY e.exercise_order
  `, [req.user.id, topic.id]);

  return res.json({ topic, exercises: exRes.rows });
});
```

- [ ] **Step 7: Mount router in `index.js`**

```js
import { k8sPathRouter } from './routes/k8sPath.js';
// After playground routes:
app.use('/api/v1/k8s-path', authenticate, apiLimiter, k8sPathRouter);
```

- [ ] **Step 8: Smoke test**

```bash
curl -s --cookie "cariara_sso=<token>" \
  http://localhost:3009/api/v1/k8s-path/topics | jq '[.topics[].title]'
```
Expected: `["Pods","Namespaces","Labels & Selectors","Annotations"]`

- [ ] **Step 9: Commit**

```bash
git add apps/ascend-backend/src/services/k8s/validator.js \
        apps/ascend-backend/src/routes/k8sPath.js \
        apps/ascend-backend/src/routes/playgroundSessions.js \
        apps/ascend-backend/src/index.js \
        apps/ascend-backend/tests/k8s/
git commit -m "feat(k8s-path): validation engine (12 spec types) + API routes + validate-exercise endpoint"
```

---

## Task 6: K8sPathPage (Frontend)

**Files:**
- Create: `apps/camora/src/services/k8sPath-api.js`
- Create: `apps/camora/src/pages/capra/K8sPathPage.jsx`
- Modify: `apps/camora/src/App.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/k8s-path/topics`, `GET /api/v1/k8s-path/topics/:slug`
- Produces: route `/capra/k8s` → `<K8sPathPage />`

- [ ] **Step 1: Create `apps/camora/src/services/k8sPath-api.js`**

```js
const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

async function get(path) {
  const res = await fetch(`${API}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`k8s-path ${res.status}`);
  return res.json();
}

export const getTopics = () => get('/api/v1/k8s-path/topics');
export const getTopic  = (slug) => get(`/api/v1/k8s-path/topics/${slug}`);
```

- [ ] **Step 2: Create `apps/camora/src/pages/capra/K8sPathPage.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopics } from '@/services/k8sPath-api';

const MODULES = [
  { num: 1, title: 'Core Primitives' },
  { num: 2, title: 'Workloads' },
  { num: 3, title: 'Networking' },
  { num: 4, title: 'Configuration & Storage' },
  { num: 5, title: 'Operations' },
];

function Ring({ pct }) {
  const r = 16, circ = 2 * Math.PI * r, dash = circ * pct / 100;
  return (
    <svg width={38} height={38} style={{ flexShrink: 0 }}>
      <circle cx={19} cy={19} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
      <circle cx={19} cy={19} r={r} fill="none"
        stroke={pct === 100 ? '#10b981' : '#d4a043'} strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 19 19)" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={8} fontWeight={700} fill={pct === 100 ? '#10b981' : 'rgba(255,255,255,0.4)'}>
        {pct}%
      </text>
    </svg>
  );
}

function TopicCard({ topic, onStart }) {
  const pct = topic.exercise_count > 0 ? Math.round(topic.completed_count / topic.exercise_count * 100) : 0;
  const done = pct === 100, started = pct > 0 && !done;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 9 }}>
      <Ring pct={pct} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{topic.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {topic.exercise_count} exercises · ~{topic.estimated_min} min
          <span style={{ marginLeft: 8, color: done ? '#10b981' : started ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}>
            {done ? 'Complete' : started ? 'In Progress' : 'Not started'}
          </span>
        </div>
      </div>
      <button type="button" onClick={() => onStart(topic)} style={{
        padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: done ? 'rgba(16,185,129,0.1)' : 'rgba(212,160,67,0.12)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(212,160,67,0.25)'}`,
        color: done ? '#10b981' : '#d4a043',
      }}>
        {done ? 'Review' : started ? 'Continue' : 'Start Lab'}
      </button>
    </div>
  );
}

export default function K8sPathPage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    getTopics().then(d => setTopics(d.topics)).finally(() => setLoading(false));
  }, []);

  const handleStart = (topic) => {
    navigate(`/capra/playground?scenario=${topic.slug}&env=${topic.environment}`);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64,
      color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading curriculum...</div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Kubernetes Path</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          22 topics · hands-on labs · live cluster validation
        </p>
      </div>

      {MODULES.map(mod => {
        const modTopics = topics.filter(t => t.module === mod.num);
        const modDone = modTopics.filter(t => t.completed_count === t.exercise_count && t.exercise_count > 0).length;
        const isOpen = open === mod.num;
        return (
          <div key={mod.num} style={{ marginBottom: 8 }}>
            <button type="button" onClick={() => setOpen(isOpen ? 0 : mod.num)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', borderRadius: 8, cursor: 'pointer',
              background: isOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)', marginBottom: isOpen ? 6 : 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                Module {mod.num} — {mod.title}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                {modDone}/{modTopics.length} complete
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {modTopics.map(t => <TopicCard key={t.id} topic={t} onStart={handleStart} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Add route to `App.tsx`**

```tsx
const K8sPathPage = lazy(() => import('./pages/capra/K8sPathPage'));
// Inside the /capra/* routes:
<Route path="/capra/k8s" element={<K8sPathPage />} />
```

- [ ] **Step 4: Build and verify**

```bash
cd apps/camora && npx vite build
```
Expected: no errors. Navigate to `/capra/k8s` — module accordion renders with topic cards.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/services/k8sPath-api.js \
        apps/camora/src/pages/capra/K8sPathPage.jsx \
        apps/camora/src/App.tsx
git commit -m "feat(k8s-path): K8sPathPage with module accordion, topic cards, progress rings"
```

---

## Task 7: ExercisePanel + End-to-End Wiring

**Files:**
- Create: `apps/camora/src/components/capra/playground/ExercisePanel.jsx`
- Modify: `apps/camora/src/hooks/usePlaygroundSession.js`
- Modify: `apps/camora/src/components/capra/playground/PlaygroundShell.jsx`

**Interfaces:**
- Consumes: `getTopic(slug)` from k8sPath-api
- Consumes: `POST /api/v1/playground/sessions/:id/validate-exercise`
- Consumes: `session.sessionId`, `session.scenario_slug` from `usePlaygroundSession`
- Produces: `<ExercisePanel sessionId scenarioSlug />` — 280px right sidebar

- [ ] **Step 1: Add `scenario_slug` to `usePlaygroundSession.js`**

In the function that creates a session (calls `POST /api/v1/playground/sessions`), read the scenario slug from URL:
```js
const scenarioSlug = new URLSearchParams(window.location.search).get('scenario') || null;
```

Include in the POST body:
```js
{ environment, scenario_id: scenarioSlug }
```

Store in session state when the POST responds:
```js
scenario_slug: data.scenario_id || null,
```

Add `scenario_slug` to the hook's return value.

- [ ] **Step 2: Create `apps/camora/src/components/capra/playground/ExercisePanel.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { getTopic } from '@/services/k8sPath-api';

const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

async function postValidate(sessionId, exerciseId) {
  const res = await fetch(`${API}/api/v1/playground/sessions/${sessionId}/validate-exercise`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciseId }),
  });
  return res.json();
}

function StepDot({ state }) {
  const c = state === 'done' ? '#10b981' : state === 'active' ? '#d4a043' : 'rgba(255,255,255,0.15)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      background: state === 'done' ? 'rgba(16,185,129,0.15)' : 'transparent',
      border: `1.5px solid ${c}`, fontSize: 9, color: c }}>
      {state === 'done' ? '✓' : ''}
    </span>
  );
}

export default function ExercisePanel({ sessionId, scenarioSlug }) {
  const [topic,    setTopic]    = useState(null);
  const [exercises,setExercises]= useState([]);
  const [idx,      setIdx]      = useState(0);
  const [completed,setCompleted]= useState(new Set());
  const [hintOpen, setHintOpen] = useState(false);
  const [validating,setValidating]=useState(false);
  const [result,   setResult]   = useState(null);

  useEffect(() => {
    if (!scenarioSlug) return;
    getTopic(scenarioSlug).then(d => {
      setTopic(d.topic);
      setExercises(d.exercises);
      const done = new Set(d.exercises.filter(e => e.completed).map(e => e.id));
      setCompleted(done);
      const first = d.exercises.findIndex(e => !e.completed);
      setIdx(first >= 0 ? first : 0);
    });
  }, [scenarioSlug]);

  if (!scenarioSlug || !topic) return (
    <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 12,
      fontFamily: '"IBM Plex Mono", monospace', textAlign: 'center' }}>
      {scenarioSlug ? 'Loading...' : 'Launch from\nK8s Path to\nload exercises'}
    </div>
  );

  const ex = exercises[idx];
  if (!ex) return null;

  const isDone = completed.has(ex.id);

  const handleValidate = async () => {
    setValidating(true); setResult(null);
    try {
      const r = await postValidate(sessionId, ex.id);
      setResult(r);
      if (r.passed) {
        setCompleted(prev => new Set([...prev, ex.id]));
        if (idx < exercises.length - 1) {
          setTimeout(() => { setIdx(i => i + 1); setResult(null); setHintOpen(false); }, 1200);
        }
      }
    } catch {
      setResult({ passed: false, message: 'Request failed — is the server running?', hint: '' });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 2 }}>
          Module {topic.module} · {topic.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          {completed.size}/{exercises.length} complete
        </div>
      </div>

      {/* Exercise body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 8 }}>
          Step {idx + 1} of {exercises.length}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{ex.title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 12 }}>
          {ex.description}
        </div>

        {ex.code_example && (
          <div style={{ position: 'relative', background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
            <code style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', color: '#d4a043',
              whiteSpace: 'pre-wrap', display: 'block' }}>
              {ex.code_example}
            </code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(ex.code_example)}
              style={{ position: 'absolute', top: 6, right: 6, padding: '2px 6px', fontSize: 9,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              copy
            </button>
          </div>
        )}

        {ex.hint && (
          <div style={{ marginBottom: 12 }}>
            <button type="button" onClick={() => setHintOpen(h => !h)}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              {hintOpen ? '▾' : '▸'} Hint
            </button>
            {hintOpen && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6,
                padding: '8px 10px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5 }}>
                {ex.hint}
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={handleValidate} disabled={validating || isDone} style={{
          width: '100%', padding: 8, borderRadius: 6, fontSize: 12, fontWeight: 700,
          cursor: isDone ? 'default' : validating ? 'wait' : 'pointer',
          background: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(212,160,67,0.13)',
          border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'rgba(212,160,67,0.25)'}`,
          color: isDone ? '#10b981' : '#d4a043',
        }}>
          {validating ? 'Checking...' : isDone ? '✓ Complete' : 'Validate →'}
        </button>

        {result && !result.passed && (
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 5, fontSize: 11,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: 'rgba(239,68,68,0.8)' }}>
            {result.message}
          </div>
        )}
      </div>

      {/* Step list */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflow: 'auto', flexShrink: 0 }}>
        {exercises.map((e, i) => {
          const state = completed.has(e.id) ? 'done' : i === idx ? 'active' : 'pending';
          return (
            <button key={e.id} type="button"
              onClick={() => { setIdx(i); setResult(null); setHintOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                border: 'none', cursor: 'pointer', padding: '3px 0', textAlign: 'left' }}>
              <StepDot state={state} />
              <span style={{ fontSize: 11, color: state === 'done' ? '#10b981' : state === 'active' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                {e.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire ExercisePanel into `PlaygroundShell.jsx`**

Add import:
```js
import ExercisePanel from './ExercisePanel';
```

Destructure `scenario_slug` from `usePlaygroundSession()`:
```js
const { ..., scenario_slug } = usePlaygroundSession();
```

In the active playground layout, wrap the main content + ExercisePanel in a flex row:
```jsx
{/* Where the tab content currently is, wrap it: */}
<div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
  {/* existing tab content wrapper (position: relative for absolute panes) */}
  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
    {/* Terminal, Cluster, Editor panes — unchanged */}
  </div>

  {session?.scenario_slug && (
    <ExercisePanel sessionId={session.sessionId} scenarioSlug={session.scenario_slug} />
  )}
</div>
```

- [ ] **Step 4: Full end-to-end test**

```bash
cd apps/camora && npx vite build
```

Manual flow:
1. Navigate to `/capra/k8s` → click "Start Lab" on Pods
2. Playground opens at `/capra/playground?scenario=pods&env=k8s-single`
3. ExercisePanel visible on right: "Step 1 of 4 — Create a Pod"
4. Switch to Cluster tab — shows nodes/pods/events/services with kubectl command in header
5. Run `kubectl run web --image=nginx:alpine --restart=Never` in terminal
6. Cluster → Pods tab: `web` pod appears within 5s
7. Click Validate → `{ passed: true }` → step 1 turns green → step 2 activates automatically
8. Navigate back to `/capra/k8s` → Pods card shows 1/4 (25%) progress ring

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/components/capra/playground/ExercisePanel.jsx \
        apps/camora/src/components/capra/playground/PlaygroundShell.jsx \
        apps/camora/src/hooks/usePlaygroundSession.js
git commit -m "feat(k8s-path): ExercisePanel sidebar with steps, hints, validate, and progress"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Remove all Radar artifacts | Task 1 |
| `execInContainer` export | Task 2 |
| Cluster-state SSE, 5s tick | Task 2 |
| SSE pauses when tab hidden | Task 3 (`active` prop + useEffect cleanup) |
| Native ClusterPanel 4 tabs | Task 3 |
| kubectl command shown in tab header | Task 3 |
| Gold highlight on matching pods | Task 3 (`exerciseSelector` prop — wired but `null` until full curriculum; activate per-exercise in Phase 4) |
| 3 DB tables + migrations | Task 4 |
| Module 1 seed (14 exercises) | Task 4 |
| K8s Path topics + progress API | Task 5 |
| 12 validation spec types | Task 5 |
| `validate-exercise` + progress write | Task 5 |
| `K8sPathPage` at `/capra/k8s` | Task 6 |
| Module accordion + progress rings | Task 6 |
| Topic "Start Lab" → playground with scenario | Task 6 |
| ExercisePanel sidebar | Task 7 |
| Hints, validate button, step list | Task 7 |
| `scenario_slug` threaded through session | Task 7 |

**Gaps addressed:**
- `pod_label`, `pod_label_absent`, `pod_annotation`, `pod_annotation_absent` spec types — added to validator (not in original spec list but required by Module 1 exercises).
- `exerciseSelector` for pod highlight: prop is there, highlight logic is implemented in ClusterPanel, but threading the active exercise's selector from ExercisePanel → PlaygroundShell → ClusterPanel is left for Phase 4 to avoid tight coupling before the curriculum is complete.

**Type consistency:**
- `session.scenario_slug` — consistent across `usePlaygroundSession` → `PlaygroundShell` → `ExercisePanel`
- `getExecContainer(session)` — single export used in both `clusterState.js` (Task 2) and `validator.js` (Task 5)
- `req.user.id` — consistent with `authenticate` middleware across all routes
