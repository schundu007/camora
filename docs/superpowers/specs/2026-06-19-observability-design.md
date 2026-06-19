# Playground Observability with Radar — Design Spec

**Date:** 2026-06-19  
**Status:** Approved  
**Scope:** Full-blown SRE observability for the Camora playground using [skyhook-io/radar](https://github.com/skyhook-io/radar)

---

## Overview

Two parallel observability surfaces:

1. **Per-session Kubernetes observability** — Radar runs as a sidecar in every k8s playground container (k8s-single, k8s-multi, k8s-etcd). A dedicated `/playground/observe/:sessionId` page iframes Radar's full UI (topology, traffic, audit, RBAC, cost) proxied through ascend-backend.

2. **Infra SRE dashboard + per-user stats** — An admin-gated `/admin/playground/observe` page shows aggregate playground health metrics (success rate, boot latency P50/P95, daily volume, environment mix). A personal "Stats" tab is added to the PlaygroundShell for per-user session totals.

---

## Architecture

### Layer 1 — Radar sidecar in k8s container images

**Affected images:** `chundubabu/pg-k8s-single:latest`, `chundubabu/pg-k8s-multi:latest`

- Install the Radar binary (`kubectl radar` / `radar` CLI) in each image at build time via the image Dockerfile.
- After the cluster finishes booting, the container entrypoint script launches: `kubectl radar --port 9280 --no-open --kubeconfig /root/.kube/config`
- Radar discovers the in-container Kubernetes cluster at the standard kubeconfig path.
- When Radar is ready, the entrypoint echoes a structured boot step `radar_ready` to stdout — the existing SSE boot-step stream parses and forwards this to the frontend.

**Non-k8s environments** (ubuntu, docker, agent-sandbox, cloud-cli): no Radar, no port 9280. The UI shows a "not available" state.

### Layer 2 — Port exposure and proxy

**`nomadClient.js` (SSH docker run)**

- Add `-p 0:9280` to the `docker run` command for k8s environments only (gate on `isKubernetes(environment)`).
- Inspect the mapped port after container start: `docker port <id> 9280` → store as `radar_port`.
- `radar_port` is stored in `playground_sessions` alongside `ttyd_port` and `code_server_port`.

**Proxy routes in `ascend-backend/src/index.js`**

- `GET /pg-radar/*?_s=:sessionId` — HTTP proxy to `session.ttyd_host:session.radar_port`. Mirrors the `/pg-ide/*` block exactly: session lookup → strip X-Frame-Options and CSP → pipe.
- WebSocket upgrade `/pg-radar/*` — mirrors the code-server WS upgrade branch.
- Radar uses SSE internally; the HTTP proxy is sufficient for most features. WS handles Radar's live topology stream.

### Layer 3 — Database

Idempotent `ALTER TABLE` statements added to ascend-backend startup (same pattern as all existing columns):

```sql
ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_port INTEGER;
ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS became_active_at TIMESTAMPTZ;
```

`radar_ready` is flipped to `true` by `updateSessionStatus` when the `radar_ready` boot step is received from the SSE stream.

`became_active_at` is stamped when `status` first changes to `'active'` — used by the `/metrics` endpoint for accurate boot latency P50/P95 (`became_active_at - created_at`), avoiding the `updated_at` column which changes on every row update.

---

## API Endpoints

### `GET /api/v1/playground/sessions/:id/radar-status`

Auth: standard JWT. Returns:

```json
{
  "radarAvailable": true,
  "radarReady": true,
  "radarUrl": "/pg-radar?_s=<sessionId>"
}
```

`radarAvailable` is `false` for non-k8s environments (ubuntu, docker, cloud-cli, agent-sandbox).  
`radarReady` reflects the `radar_ready` column — true once Radar has signalled it is up.  
Frontend polls this at 3s intervals after session reaches `active` status, stops polling once `radarReady` is true.

### `GET /api/v1/playground/sessions/metrics` *(admin — owner email required)*

Query param: `?window=7d` (default) or `?window=30d`

Response:

```json
{
  "successRate": 0.94,
  "bootP50": 18,
  "bootP95": 42,
  "activeCount": 3,
  "extensionRate": 0.12,
  "dailyVolume": [{ "date": "2026-06-12", "count": 14 }],
  "environmentBreakdown": { "ubuntu": 120, "k8s-single": 45, "k8s-multi": 12 },
  "errorBreakdown": { "timeout": 8, "nomad_unavailable": 2, "limit_reached": 5 }
}
```

Boot latency computed as `EXTRACT(EPOCH FROM (updated_at - created_at))` for sessions that reached `active` status, using PostgreSQL `percentile_cont` for P50/P95.

### `GET /api/v1/playground/sessions/my-stats`

Auth: standard JWT, no admin required. Returns aggregate for the authenticated user:

```json
{
  "totalSessions": 34,
  "totalMinutes": 412,
  "favoriteEnvironment": "k8s-single",
  "successRate": 0.97,
  "lastActive": "2026-06-18T21:00:00Z"
}
```

`totalMinutes` summed from `EXTRACT(EPOCH FROM (destroyed_at - created_at))/60` for completed sessions.

---

## Frontend Components

### `PlaygroundObservePage.jsx` — `/playground/observe/:sessionId`

**Route:** Added in `App.tsx` under `ProtectedRoute`, after the existing `/playground` route.

**Behavior:**

| State | UI |
|---|---|
| Loading (polling radar-status) | Spinner, "Connecting to Radar…" |
| `radarReady: true` | Slim top bar + full-viewport iframe at `/pg-radar?_s=:sessionId` |
| `radarAvailable: false` | Centered card: "Observability requires a Kubernetes environment" + link to create k8s session |
| Polling timeout (>90s) | Error card with retry button |

**Top bar (when Radar ready):** Session environment badge · Time remaining chip (from `usePlaygroundSession`) · "← Back to Playground" `<Link>` · "Open in new tab" external link icon.

**CSP note:** The iframe points at the same origin (`/pg-radar/*` proxy), so no cross-origin iframe issues.

### Observe button in `PlaygroundShell.jsx`

- Shown only when `session.environment` is `k8s-single`, `k8s-multi`, or `k8s-etcd`.
- Disabled (with tooltip "Starting Radar…") until `radarReady` is true.
- Opens `/playground/observe/:sessionId` in a **new tab** so the terminal session stays live.
- Placed in the existing top toolbar, after the Extend button.

### `AdminPlaygroundObservePage.tsx` — `/admin/playground/observe`

**Route:** Added under existing `OwnerRoute` block in `App.tsx`.

**Layout:** Matches `AdminPlaygroundPage` chrome. Two rows:

Row 1 — Stat cards (full width):
- Success Rate · Active Sessions · P50 Boot · P95 Boot · Extension Rate

Row 2 — 2×2 Recharts grid:
- **Session Volume** (`AreaChart`) — daily sessions, last 30 days
- **Boot Latency** (`BarChart`) — P50/P95 bars with reference lines
- **Environment Mix** (`PieChart`) — distribution by environment
- **Error Breakdown** (`BarChart`) — error type counts

Top-right toggle: `7d` / `30d` — refetches `/metrics?window=7d|30d`.

All charts use Recharts (already in the frontend bundle from `AnalyticsPage.tsx`).

### Stats tab in `PlaygroundShell.jsx`

- New `'stats'` value in the existing `activeTab` state.
- Tab only rendered when the user has ≥1 session in history (checked on mount via existing `/history` endpoint).
- Content: five `.chip` stat cards — Total Sessions · Total Time · Favorite Environment · Success Rate · Last Active.
- Fetches `/my-stats` once on tab open, not on every render.

---

## File Change Summary

| File | Change |
|---|---|
| `apps/ascend-backend/src/services/playground/nomadClient.js` | Add `-p 0:9280` for k8s envs; parse `radar_port` from `docker port` |
| `apps/ascend-backend/src/services/playground/sessionStore.js` | Add `radar_port`, `radar_ready` columns; add `markRadarReady()` helper |
| `apps/ascend-backend/src/services/playground/sessionManager.js` | Store `radar_port`; flip `radar_ready` on `radar_ready` SSE step |
| `apps/ascend-backend/src/routes/playgroundSessions.js` | Add `GET /:id/radar-status`, `GET /metrics`, `GET /my-stats` |
| `apps/ascend-backend/src/index.js` | Add `/pg-radar/*` HTTP proxy block; add `/pg-radar/*` WS upgrade branch |
| `apps/camora/src/App.tsx` | Add `/playground/observe/:sessionId` route; add `/admin/playground/observe` route |
| `apps/camora/src/pages/PlaygroundObservePage.jsx` | New file — Radar iframe page |
| `apps/camora/src/pages/admin/AdminPlaygroundObservePage.tsx` | New file — SRE dashboard |
| `apps/camora/src/components/capra/playground/PlaygroundShell.jsx` | Add Observe button + Stats tab |
| `apps/camora/src/hooks/useRadarStatus.js` | New hook — polls radar-status endpoint |
| `apps/camora/src/hooks/usePlaygroundMetrics.js` | New hook — fetches /my-stats |
| Docker images (`pg-k8s-single`, `pg-k8s-multi`) | Install Radar binary; add radar startup to entrypoint |

---

## Constraints & Edge Cases

- **Non-k8s sessions:** `radar_port` is `null`. Proxy route returns 404. Frontend shows unavailable card. No change to ubuntu/docker/cloud-cli flows.
- **Session expiry:** If session expires while observe page is open, iframe loses connection. The existing time-remaining chip shows 0:00; user sees Radar's own connection-lost UI.
- **Radar startup race:** Radar starts after the cluster is ready, not immediately. The 90s polling window covers this. P95 cluster boot is ~42s; Radar adds ~5–10s on top.
- **Concurrent admin requests:** `/metrics` does a single aggregation query. No N+1 problem.
- **Radar port conflict:** Port 9280 is hardcoded in the container. One Radar per container = one per session.
- **Image rebuild required:** The Docker image changes are a prerequisite for per-session Radar. Until images are rebuilt, `radar_ready` will never flip true and the Observe button stays hidden — graceful degradation with no breakage to existing flows.
