# K8s Learner Path + Playground Integration
**Date**: 2026-06-19  
**Status**: Design  
**Replaces**: Radar observability (skyhook-io/radar — removed entirely)

---

## Problem

The playground currently ships Radar — a third-party binary (`kubectl-radar`) proxied through a full HTTP+WebSocket tunnel into an `<iframe>`. It adds a 30s boot delay, broke builds once (tar extraction path), only works for k8s environments, and is just a reskinned `kubectl get` with worse UX than the terminal itself. Learners don't know it's there, and when they find it, it doesn't teach them anything.

The deeper problem: there's no structured k8s learning path. Learners open the playground and face a blank terminal with no guidance.

---

## Goal

A full k8s curriculum (22 topics, ~85 exercises) integrated directly into the playground:
- Learner picks a topic → playground boots pre-configured for that topic
- Exercise Panel shows steps inline (not a separate page)
- Native Cluster Panel replaces Radar — shows live cluster state via kubectl, displays the actual commands so learners see the source
- Backend validates exercise completion by querying cluster state
- Progress tracked per user, per exercise

---

## What Gets Removed (Radar)

Every Radar artifact is deleted in Phase 0:

| File / Code | What to remove |
|---|---|
| `docker/k8s/Dockerfile` | 5-line Radar install block + `EXPOSE 9280` |
| `docker/k8s-multi/Dockerfile` | Same |
| `docker/k8s/start.sh` | `radar --port 9280 --no-browser &` line |
| `docker/k8s-multi/start.sh` | Same |
| `apps/ascend-backend/src/index.js` | `/pg-radar` HTTP proxy + WebSocket proxy handler (~80 lines) |
| `apps/ascend-backend/src/routes/playgroundSessions.js` | `radar_port`, `radar_ready` fields; `radar-status` route; `pollUntilReady` on radar port |
| `apps/ascend-backend/src/services/playground/sessionManager.js` | `radar_port` extraction and session record fields |
| `apps/ascend-backend/src/services/playground/nomadClient.js` | `docker port ${jobId} 9280` lines |
| `apps/ascend-backend/tests/playground/radarStatus.test.js` | Delete entire file |
| `apps/camora/src/components/capra/playground/RadarPane.jsx` | Delete |
| `apps/camora/src/components/capra/playground/PlaygroundShell.jsx` | Remove Radar import, tab, `radarUrl` prop |
| `apps/camora/src/hooks/usePlaygroundSession.js` | Remove `radar_port`, `radarUrl`, re-fetch on ready |

No new binary dependencies are added. No new proxy routes.

---

## Architecture

```
K8s Path Page (/capra/k8s)     Playground Shell                     Backend
──────────────────────────      ──────────────────────────────────   ──────────────────────────────
Module accordion                ┌─ Tab bar ────────────────────┐    GET  /k8s-path/topics
  22 topic cards                │  Terminal │ Cluster │ Editor │    GET  /k8s-path/topics/:slug
  progress rings                └──────────────────────────────┘    POST /k8s-path/progress
  "Start Lab" → boots session   ┌─ Main ─────────┐ ┌─ Exercise┐   POST /sessions/:id/validate
                                │                │ │          │   GET  /sessions/:id/cluster-state (SSE)
                                │  Terminal      │ │ Steps    │
                                │  (primary)     │ │ Hints    │   Exec layer (existing sshExec)
                                │                │ │ Validate │     docker exec CONTAINER \
                                └────────────────┘ └──────────┘     kubectl get pods,nodes,events -A -o json
```

**Data flow for a validation cycle**:
1. Learner runs `kubectl create deployment nginx --image=nginx` in terminal
2. Cluster Panel SSE ticks — pod appears in Pods tab, highlighted gold (matches current exercise)
3. Learner clicks Validate
4. Backend: `docker exec CONTAINER kubectl get pods -l app=nginx -o json`
5. Checks `.items[0].status.phase === "Running"`
6. Returns `{ passed: true, message: "Deployment nginx is running (1/1 ready)" }`
7. Step turns green, "Next step" unlocks

---

## Curriculum: 22 Topics, 5 Modules

### Environment mapping
- Modules 1–4: `k8s-single` (k3s, 1 node) — sufficient for all workload/config/storage topics
- Module 5: `k8s-multi` (k3s, 3 nodes) — DaemonSets, HPA, taints/tolerations require real multi-node

### Module 1 — Core Primitives (k8s-single)
| # | Topic | Exercises | Setup |
|---|---|---|---|
| 1 | Pods | 4 | none — blank cluster |
| 2 | Namespaces | 3 | none |
| 3 | Labels & Selectors | 4 | 2 pods pre-created |
| 4 | Annotations | 3 | 1 pod pre-created |

### Module 2 — Workloads (k8s-single)
| # | Topic | Exercises | Setup |
|---|---|---|---|
| 5 | ReplicaSets | 4 | none |
| 6 | Deployments | 5 | none |
| 7 | DaemonSets | 3 | **k8s-multi** (per-topic `environment` field — stays in Module 2 conceptually) |
| 8 | StatefulSets | 4 | headless service pre-created |
| 9 | Jobs & CronJobs | 3 | none |

### Module 3 — Networking (k8s-single)
| # | Topic | Exercises | Setup |
|---|---|---|---|
| 10 | Services | 5 | deployment pre-created |
| 11 | Ingress | 4 | nginx-ingress installed in setup script |
| 12 | NetworkPolicies | 4 | 2 pods in different namespaces pre-created |

### Module 4 — Configuration & Storage (k8s-single)
| # | Topic | Exercises | Setup |
|---|---|---|---|
| 13 | ConfigMaps | 4 | none |
| 14 | Secrets | 3 | none |
| 15 | Environment Variables | 3 | none |
| 16 | Volumes | 4 | none |
| 17 | PersistentVolumes & PVCs | 5 | StorageClass pre-created |

### Module 5 — Operations (k8s-multi)
| # | Topic | Exercises | Setup |
|---|---|---|---|
| 18 | RBAC | 5 | serviceaccount pre-created |
| 19 | Resource Limits & Requests | 4 | none |
| 20 | HPA | 4 | metrics-server installed; deployment pre-created |
| 21 | Health Probes | 4 | none |
| 22 | Taints & Tolerations | 4 | 3 nodes available |

**Total: ~87 exercises**

---

## Validation Engine

### Validation spec (stored as JSONB in `k8s_exercises.validation_spec`)

```json
{ "type": "pod_running",       "selector": "app=nginx",   "namespace": "default" }
{ "type": "deployment_ready",  "name": "nginx",           "replicas": 3 }
{ "type": "service_exists",    "name": "nginx-svc",       "port": 80 }
{ "type": "namespace_exists",  "name": "staging" }
{ "type": "configmap_exists",  "name": "app-config",      "key": "DB_HOST" }
{ "type": "secret_exists",     "name": "db-secret" }
{ "type": "pvc_bound",         "name": "my-pvc" }
{ "type": "resource_deleted",  "kind": "pod",             "name": "broken-pod" }
{ "type": "node_label",        "node": "node1",           "label": "role=worker" }
{ "type": "pod_count",         "selector": "app=web",     "min": 3 }
```

**Design rule**: Use label selectors (`selector`) not names wherever possible. Learners can name things differently — what matters is that the right workload is in the right state.

### Backend handler (`POST /sessions/:id/validate-exercise`)

```
1. Load exercise → validation_spec
2. Translate spec type to kubectl command
3. docker exec CONTAINER kubectl ... -o json  (via existing sshExec)
4. Parse JSON, check condition
5. Return { passed, message, hint }
```

No custom validation scripts. All checks are JSON field comparisons on kubectl output.

---

## Cluster Panel (Native — Replaces Radar)

### Backend SSE endpoint (`GET /sessions/:id/cluster-state`)

Emits every 5s:
```json
{ "nodes": [...], "pods": [...], "events": [...], "services": [...] }
```

Single exec call per tick:
```bash
docker exec CONTAINER kubectl get pods,nodes,events,services -A -o json
```

**Guard**: SSE pauses after 60s of no active subscribers. Frontend closes SSE connection when user switches away from Cluster tab (Page Visibility API + tab switch detection). Prevents exec accumulation at scale.

### Frontend: `ClusterPanel.jsx`

Four sub-tabs: **Nodes | Pods | Events | Services**

Each sub-tab header displays the kubectl command that produced the data:
```
Nodes                              kubectl get nodes
──────────────────────────────────────────────────
NAME          STATUS   ROLE    AGE   VERSION
k3s-server    Ready    master  4m    v1.29.1
```

Pod rows that match the current exercise's selector get a gold left border — the visual link between "the exercise says deploy nginx" and "here it is in the cluster" is the core learning moment.

---

## Exercise Panel: `ExercisePanel.jsx`

Right sidebar, 280px wide, open by default when session launches from a topic.

```
┌─────────────────────────────────┐
│ Module 2 › Deployments          │
│                                 │
│  Step 2 of 5                    │
│  ─────────────────────────────  │
│  Create a Deployment            │
│                                 │
│  Deploy nginx with 3 replicas:  │
│  ┌─────────────────────────┐    │
│  │ kubectl create deploy-  │    │
│  │  ment nginx \           │    │
│  │  --image=nginx \        │    │
│  │  --replicas=3           │    │
│  └─────────────────────────┘    │
│                                 │
│  [Hint ▾]  [Validate →]         │
│                                 │
│  ✓ Step 1: Create namespace     │
│  ● Step 2: Create Deployment    │
│  ○ Step 3: Scale to 5           │
│  ○ Step 4: Rollback             │
│  ○ Step 5: Delete deployment    │
└─────────────────────────────────┘
```

Validate result appears inline below the button. No modals, no page navigation.

---

## K8s Path Page: `/capra/k8s`

Module accordion. Topic cards in a grid per module.

Topic card content:
- Title + exercise count
- Estimated time (e.g., "~20 min")
- Progress ring (0% / partial / 100%)
- Status badge: Not started | In Progress | Complete
- CTA button: "Start Lab" / "Continue" / "Review"

"Start Lab" → `POST /sessions` with `{ environment: 'k8s-single', scenario_id: 'pods' }` → playground opens, Exercise Panel visible at step 1.

---

## Database

```sql
CREATE TABLE k8s_topics (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  module        INTEGER NOT NULL,
  topic_order   INTEGER NOT NULL,
  environment   TEXT NOT NULL DEFAULT 'k8s-single',
  estimated_min INTEGER NOT NULL DEFAULT 20,
  setup_script  TEXT
);

CREATE TABLE k8s_exercises (
  id               SERIAL PRIMARY KEY,
  topic_id         INTEGER REFERENCES k8s_topics(id),
  exercise_order   INTEGER NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  code_example     TEXT,
  hint             TEXT,
  validation_spec  JSONB NOT NULL
);

CREATE TABLE k8s_progress (
  user_id      INTEGER REFERENCES users(id),
  exercise_id  INTEGER REFERENCES k8s_exercises(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, exercise_id)
);
```

Progress computed on read — topic complete when all exercise rows exist, module complete when all topics complete. No denormalized counters.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| SSE exec overload at scale | Only poll when Cluster tab visible; SSE closes after 60s idle |
| Validation rejects correct answers | Use label selectors not names; every spec tested before shipping |
| Setup scripts fail silently | Scripts run via existing `execScriptInContainerStream`; errors surface in boot progress |
| Content gap — 87 exercises is a lot | Phase 2 ships engine with Module 1 only; remaining modules added iteratively |
| DaemonSets/HPA broken on single node | Module 5 maps to k8s-multi explicitly |

---

## Phased Build

### Phase 0: Remove Radar (day 1)
Delete all Radar code. Rebuild Docker images. Verify clean session boot.  
Done when: no `radar_port` in session state, no proxy routes, clean boot logs.

### Phase 1: Cluster Panel (day 1–2)
- SSE endpoint + kubectl exec via existing sshExec
- `ClusterPanel.jsx` (4 tabs, kubectl command display, exercise resource highlighting)
- Wired into PlaygroundShell as "Cluster" tab

### Phase 2: K8s Path UI + Database (day 2–4)
- 3 new tables + migrations (idempotent CREATE IF NOT EXISTS)
- Seed Module 1 topics + exercises (Pods, Namespaces, Labels, Annotations)
- `/k8s-path/topics` API routes
- `K8sPathPage.jsx` at `/capra/k8s`

### Phase 3: Exercise Panel + Validation (day 4–6)
- `ExercisePanel.jsx` sidebar in PlaygroundShell
- Validation engine (10 spec types)
- `/sessions/:id/validate-exercise` endpoint
- Progress write on pass

### Phase 4: Remaining Curriculum (ongoing after Phase 3)
- Modules 2–5 content + per-topic setup scripts
- Integration test per topic

---

## Success Criteria

- Playground boots with no Radar artifacts in logs or session state
- Cluster Panel shows live pod/node/event state within 5s of kubectl command in terminal
- Validation passes/fails correctly for all 10 spec types
- Module 1 (4 topics, ~14 exercises) fully playable end-to-end
- SSE connections drop when Cluster tab is hidden
