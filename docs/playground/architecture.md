# Playground Architecture

## 1. System Overview

The Camora Playground provides interactive, browser-based terminal and IDE environments
for DevOps and distributed-systems practice. A user clicks "Launch", a container
(or cluster of containers) starts on a remote Linux VM, and within seconds they have
a fully functional shell in the browser with optional VS Code access — no local setup.

Two products share the same infrastructure:

- **Capra** — practice mode: users work through guided lab exercises (etcd, Kubernetes,
  Docker) as interview preparation.
- **Lumora** — live interview mode: a coding environment is available alongside the
  AI interview assistant for real-time whiteboarding.

The playground-backend is a separate Express 5 service (port 3010 on Railway) that is
distinct from the lumora-backend (port 8000) and ascend-backend (port 3009). It handles
only playground concerns: session lifecycle, WebSocket proxying, IDE proxying, and
container orchestration via SSH.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  ┌──────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │ PlaygroundShell│  │ IdePane (iframe)   │  │ Lumora coding  │  │
│  │ (xterm.js WS) │  │ code-server        │  │ PlaygroundLayout│  │
│  └──────┬───────┘  └────────┬───────────┘  └───────┬────────┘  │
└─────────┼───────────────────┼─────────────────────-┼───────────┘
          │ WSS               │ HTTPS                │ WS
          ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  playground-backend  (Railway)                                  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Express 5 HTTP server (port 3010)                         │ │
│  │                                                            │ │
│  │  POST /api/v1/playground/sessions  ──► sessionManager.js   │ │
│  │  GET  /api/v1/playground/sessions  ──► sessionStore.js     │ │
│  │  WS   /playground/ws/{id}?node=N   ──► wsProxy.js         │ │
│  │  HTTP /pg-ide?_s={id}&_t={token}   ──► http-proxy (inline) │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │ SSH  (port 20022)                  │
│                             │ ssh2 client per command            │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Worker Node  (Linode shared VM, 172.104.210.63)                │
│  2 vCPU, 3.8 GB RAM, Ubuntu 22.04, Docker 24+                  │
│                                                                 │
│  Single-container session:                                      │
│  ┌────────────────────────────────────────────┐                 │
│  │ docker container (chundubabu/pg-ubuntu etc.)│                │
│  │  ttyd      :7681  → host port (random)      │                │
│  │  code-server:8080 → host port (random)      │                │
│  └────────────────────────────────────────────┘                 │
│                                                                 │
│  Cluster session (etcd-cluster):                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Docker bridge network  pg-net-{sessionId[:16]}           │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ etcd1        │  │ etcd2        │  │ etcd3        │   │   │
│  │  │ :7681→hostP0 │  │ :7681→hostP1 │  │ :7681→hostP2 │   │   │
│  │  │ :8080→hostP3 │  │ :8080→hostP4 │  │ :8080→hostP5 │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │     etcd peer URLs: http://etcd1:2380, etcd2:2380, ...   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure Layer — nomadClient.js

Despite the filename (a legacy of an early Nomad evaluation), this module contains
all container orchestration logic. It communicates with the worker node exclusively
over SSH using the `ssh2` npm package.

### SSH execution model

Every container operation is a single SSH command executed by `sshExec()`:

```
playground-backend  ──SSH──►  pgrunner@172.104.210.63:20022
                                         │
                               docker run / docker stop / docker port
                               docker network create / docker network rm
```

A new SSH connection is opened for each command and torn down immediately after. This
avoids long-lived SSH sessions but means each operation has ~50–100 ms of SSH handshake
overhead. For the session creation path this is acceptable; the bottleneck is Docker
image pull and container startup, not the SSH RTT.

### Image registry

All images are pulled from Docker Hub under the `chundubabu` namespace:

| Environment key | Docker image |
|---|---|
| `ubuntu` | `chundubabu/pg-ubuntu:latest` |
| `docker` | `chundubabu/pg-docker:latest` |
| `agent-sandbox` | `chundubabu/pg-agent-sandbox:latest` |
| `k8s-single` | `chundubabu/pg-k8s-single:latest` |
| `k8s-multi` | `chundubabu/pg-k8s-multi:latest` |
| `cloud-cli` | `chundubabu/pg-cloud-cli:latest` |
| `etcd-single` | `chundubabu/pg-etcd-single:latest` |
| `etcd-cluster` (node) | `chundubabu/pg-etcd-node:latest` |

`--pull=always` is set on every `docker run` call. This guarantees users always get
the latest lab content when a new image is pushed, at the cost of 5–15 seconds on first
pull (Docker Hub → worker network). Subsequent starts of the same image are fast because
the layer cache is warm on the worker.

### Memory limits

```javascript
const MEMORY_MB = {
  ubuntu:         512,
  docker:        1024,
  'agent-sandbox': 1536,
  'k8s-single':  2048,
  'k8s-multi':   4096,
  'cloud-cli':   1536,
  'etcd-single':  512,
  'etcd-cluster': 512,   // per node, so 1536 MB total for a 3-node cluster
};
```

Memory limits are enforced with `--memory=<N>m`. There is no swap limit set, so
containers can use swap if the host has any configured.

### Why not Nomad or Kubernetes

The `nomadClient.js` name is a historical artifact. The actual implementation is
direct Docker-over-SSH for these reasons:

- **Zero orchestrator overhead**: No Nomad agent, no control plane, no etcd (for the
  orchestrator itself). One `docker` binary on one VM is the entire scheduler.
- **Cost**: A Nomad cluster needs at least one server node and one client node. That
  doubles the VM cost with no user-facing benefit at this scale.
- **Speed to ship**: SSH + docker commands took one afternoon to implement vs. days for
  a Nomad job spec pipeline.
- **Upgrade path preserved**: `nomadClient.js` exports a stable interface
  (`scheduleJob`, `getTaskAddress`, `stopJob`, `createClusterNetwork`,
  `scheduleClusterNode`, `stopClusterJob`). Swapping the implementation for a Nomad
  HTTP API or a Fly.io Machines API call requires changing only this one file.

---

## 4. Session Lifecycle

### Single-container flow

```
1. Browser: POST /api/v1/playground/sessions
           { environment: "ubuntu", scenarioId: "..." }

2. playground-backend: jwtAuth middleware
   - Verify JWT from cookie (cariara_sso) or Authorization header
   - Look up plan_type from ascend_subscriptions table
   - Attach { id, email, plan_type } to req.user

3. sessionManager.createSession()
   - Plan gate: check FREE_ENVIRONMENTS and daily session count (1/day for free)
   - Generate jobTag = randomBytes(6).hex()
   - Set expiresAt = now + 1 hour

4. nomadClient.scheduleJob(sessionTag, environment, scenarioId)
   - SSH: docker run -d --rm --pull=always --memory=512m
               -e SESSION_ID={sessionId}
               -e SCENARIO_ID={scenarioId}
               -e force_color_prompt=yes
               -p 0:7681 -p 0:8080
               chundubabu/pg-ubuntu:latest
   - Returns: 64-char container ID

5. nomadClient.getTaskAddress(containerId)
   - Poll: docker port {containerId} 7681
   - Poll: docker port {containerId} 8080
   - Interval: 500ms, timeout: 60s
   - Returns: { host: "172.104.210.63", ttydPort: XXXXX, codeServerPort: YYYYY }

6. sessionStore.createSessionRecord()
   - INSERT INTO playground_sessions (user_id, environment, nomad_job_id,
       status='provisioning', expires_at, ttyd_host, ttyd_port, code_server_port)

7. sessionStore.updateSessionStatus(sessionId, 'ready')
8. sessionStore.setTTL(sessionId, 3600)
   - Redis: SET playground:session:{id}:ttl 1 EX 3600

9. Response to browser:
   {
     sessionId,
     wsUrl: "ws://172.104.210.63:{ttydPort}",
     expiresAt,
     host, port, codeServerPort
   }
```

### Cluster flow (etcd-cluster)

The cluster flow differs significantly because three containers must be coordinated:

```
1–3. Same as single-container (auth, plan gate, expiry)

4. createSessionRecord() — placeholder row, NULL nomad_job_id
5. updateSessionStatus(sessionId, 'provisioning', { is_cluster: true })

6. nomadClient.createClusterNetwork(sessionId)
   - SSH: docker network create pg-net-{sessionId[:16]} --driver bridge
   - Returns: networkName

7. Promise.all(CLUSTER_NODE_NAMES.map(startNode))
   Each: nomadClient.scheduleClusterNode(sessionId, nodeIndex, nodeName, networkName)
   - SSH: docker run -d --rm --pull=always --memory=512m
               --network {networkName}
               --network-alias {nodeName}     ← Docker DNS registration
               --name pg-{sessionId[:8]}-{nodeName}
               --hostname {nodeName}           ← container hostname
               -e NODE_NAME={nodeName}         ← etcd member name
               -e NODE_INDEX={nodeIndex}
               -e CLUSTER_NODES=etcd1,etcd2,etcd3
               -e SESSION_ID={sessionId}
               -p 0:7681 -p 0:8080
               chundubabu/pg-etcd-node:latest
   - Returns: containerId for each node

8. Promise.all(containerIds.map(getTaskAddress))
   - Resolves 6 ephemeral ports: 3 ttyd, 3 code-server

9. updateClusterNodes(sessionId, networkName, nodes)
   - UPDATE playground_sessions
     SET cluster_network = '{networkName}',
         cluster_nodes = '[{nodeIndex, nodeName, containerId, ttydPort, ...}]'

10. updateSessionStatus(sessionId, 'ready', { nomad_job_id: etcd1ContainerId })
    (primary container stored for log streaming)

11. setTTL(sessionId, 3600)

12. Response to browser:
    {
      sessionId, isCluster: true, expiresAt,
      wsUrl: "wss://.../playground/ws/{sessionId}?node=0",
      nodes: [
        { nodeIndex: 0, nodeName: "etcd1", wsUrl: "...?node=0" },
        { nodeIndex: 1, nodeName: "etcd2", wsUrl: "...?node=1" },
        { nodeIndex: 2, nodeName: "etcd3", wsUrl: "...?node=2" },
      ]
    }
```

---

## 5. Container Progress / Log Streaming

After a single-container session is created, the frontend can stream startup progress
via SSE from `GET /api/v1/playground/sessions/{id}/logs`.

The `logStreamer.js` module opens an SSH connection and runs:

```
docker logs -f {containerId} 2>&1
```

The stdout/stderr stream is line-buffered and each non-empty line is forwarded to the
SSE handler. Container images emit sentinel JSON lines for structured progress:

```
__PROGRESS__:{"step":"installing-tools","status":"done"}
__PROGRESS__:{"step":"starting-services","status":"done"}
__PROGRESS__:{"step":"ready","status":"done"}
```

The frontend parses these sentinel lines to drive a progress UI with step indicators.
Any other log lines are forwarded as plain text for debugging. The log stream is
automatically closed when the `abortSignal` fires (e.g., user navigates away) or when
the container exits.

---

## 6. WebSocket Proxy

Once a session is `ready`, the browser connects via WebSocket to receive a live
terminal session. The playground-backend acts as a transparent WebSocket proxy between
the browser and the `ttyd` process running inside the container.

### Upgrade path

```
browser  →  WSS /playground/ws/{sessionId}?node=N  →  playground-backend
                                                              │
                                                    Resolve session from DB
                                                    If is_cluster: look up
                                                      cluster_nodes[N].ttydPort
                                                    Else: use session.ttyd_port
                                                              │
                                                    wsProxy.createTtydProxy()
                                                              │
                                                    WS ws://172.104.210.63:{port}
                                                              │
                                                           ttyd :7681
```

Authentication on the WebSocket upgrade:
1. Check `Authorization: Bearer {token}` header
2. Fall back to `cariara_sso` cookie
3. Fall back to `?token=` query parameter
4. Verify JWT, extract userId, confirm `session.user_id === userId`

For cluster sessions, the `?node=N` query parameter selects which node's terminal to
proxy. Node 0 = etcd1, Node 1 = etcd2, Node 2 = etcd3.

### ttyd retry logic

`ttyd` starts inside the container and may not be ready immediately. `wsProxy.js`
retries the upstream connection up to 10 times with 1200 ms between attempts. A
successful `open` event that is immediately followed by a `close` within 600 ms is
treated as a "not ready" signal and triggers a retry. This handles the race between
Docker reporting ports as mapped and `ttyd` actually accepting connections.

### Keep-alive

A 30-second ping is sent to both the browser WebSocket and the ttyd upstream to
prevent intermediate proxies (Railway's load balancer, Cloudflare) from timing out
idle connections.

### Teardown

- If the browser closes: ttyd WS is closed.
- If ttyd closes: browser WS is closed with code 1000.
- If ttyd errors: browser WS is closed with code 1011 ("upstream error").

---

## 7. IDE Proxy (/pg-ide)

The VS Code-in-browser experience (code-server) is proxied through `/pg-ide`.

### HTTP proxy

All HTTP requests to `/pg-ide` are proxied to `http://{ttyd_host}:{code_server_port}`.
The proxy:
- Strips hop-by-hop headers before forwarding
- Rewrites `host` to the container's address
- Removes any upstream `Content-Security-Policy` and `X-Frame-Options` headers
- Injects a permissive CSP that allows `frame-ancestors` from all known Camora origins
  so the iframe in the browser does not get blocked

### WebSocket upgrade (code-server)

code-server uses WebSocket for its own real-time protocol. The upgrade handler in
`index.js` checks for the `pg_ide` cookie to identify the session, then opens a raw
TCP tunnel (`net.connect`) to `{ttyd_host}:{code_server_port}` and pipes socket
bytes in both directions. This is a raw TCP tunnel, not a WebSocket proxy, because
code-server handles its own WS framing.

### Authentication

On the first HTTP request to `/pg-ide`:
1. JWT from `?_t=` query param or `cariara_sso` cookie → verify → extract userId
2. Match against `session.user_id`
3. Set `pg_ide` httpOnly cookie (path `/pg-ide`, sameSite=none, secure, maxAge=3600)

On subsequent requests and WebSocket upgrades, only the `pg_ide` cookie is checked
(no JWT needed per request). This avoids sending JWTs in query params for every
code-server resource fetch.

---

## 8. Session TTL and Cleanup

### TTL enforcement

When a session is created or extended, a Redis key is set:

```
playground:session:{id}:ttl  →  "1"  EX {seconds}
```

This key is informational — it lets the frontend poll remaining time. The authoritative
expiry is `expires_at` in PostgreSQL.

### Cleanup sweep

A `setInterval` runs every 5 minutes in the playground-backend process:

```sql
SELECT id, nomad_job_id, is_cluster, cluster_network, cluster_nodes
FROM playground_sessions
WHERE status NOT IN ('destroyed')
  AND expires_at < NOW() - INTERVAL '2 minutes'
LIMIT 50
```

The 2-minute grace period beyond `expires_at` prevents race conditions where a
user is still connected when the timer expires. For each expired row:

1. Single-container: `docker stop {nomad_job_id}` via SSH
2. Cluster: `docker stop` each container in `cluster_nodes`, then `docker network rm`
3. `UPDATE playground_sessions SET status='destroyed', destroyed_at=NOW()`
4. Delete the Redis TTL key

### Session extension

A session can be extended once (enforced by the `extended` boolean column):

```
PUT /api/v1/playground/sessions/{id}/extend
```

Adds 15 minutes to the current `expires_at`. The new TTL is recalculated from now
and the Redis key is updated. A second extend request returns `ALREADY_EXTENDED`.

---

## 9. Port Architecture

All container ports are mapped to random ephemeral host ports by Docker:

```
docker run -p 0:7681 -p 0:8080 {image}
```

Docker selects available ports from the kernel's `net.ipv4.ip_local_port_range`
(typically 32768–60999). The actual assigned ports are discovered via:

```
docker port {containerId} 7681
docker port {containerId} 8080
```

This means:
- No manual port allocation or tracking is needed
- Multiple concurrent sessions never collide on ports
- The backend stores the resolved ports in `playground_sessions.ttyd_port` and
  `playground_sessions.code_server_port` for the single-container case
- For cluster sessions, each node's ports are stored in the `cluster_nodes` JSONB array

### Port inventory per session type

| Session type | Ports on host |
|---|---|
| Single-container | 2 random ports (ttyd, code-server) |
| etcd-cluster (3 nodes) | 6 random ports (3 ttyd, 3 code-server) |

---

## 10. Database Schema

The `playground_sessions` table is the single source of truth for session state.
It is created (idempotently) on backend startup via inline migrations.

```sql
CREATE TABLE IF NOT EXISTS playground_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  environment      TEXT NOT NULL,
  scenario_id      TEXT,
  nomad_job_id     TEXT,       -- container ID (single) or primary node cID (cluster)
  status           TEXT NOT NULL DEFAULT 'provisioning',
                               -- provisioning → ready → active → destroyed
  extended         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  destroyed_at     TIMESTAMPTZ,
  ttyd_host        TEXT,       -- worker IP
  ttyd_port        INTEGER,    -- mapped ttyd port (single-container only)
  code_server_port INTEGER,    -- mapped code-server port (single-container only)
  is_cluster       BOOLEAN DEFAULT FALSE,
  cluster_network  VARCHAR(128),  -- pg-net-{sessionId[:16]}
  cluster_nodes    JSONB          -- [{nodeIndex, nodeName, containerId, ttydPort,
                                  --   codeServerPort, ttydHost}]
);
```

Supporting tables:

```sql
-- Lab objective tracking
CREATE TABLE IF NOT EXISTS playground_objective_completions (
  session_id   UUID REFERENCES playground_sessions(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, objective_id)
);

-- Coding playground saved snippets
CREATE TABLE IF NOT EXISTS playground_snippets (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  language   TEXT NOT NULL,
  code       TEXT NOT NULL,
  tests_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved VM snapshots (R2 storage)
CREATE TABLE IF NOT EXISTS playground_saved_vms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  name             TEXT NOT NULL,
  environment      TEXT NOT NULL,
  r2_key           TEXT NOT NULL,
  size_bytes       BIGINT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_restored_at TIMESTAMPTZ
);
```

---

## 11. Frontend Structure

`PlaygroundPage.jsx` renders three tabs driven by `?tab=` query parameter:

| Tab key | Component | What it renders |
|---|---|---|
| `vm` (default) | `PlaygroundShell` | Environment picker + terminal + (IDE pane for cluster sessions, node tabs) |
| `code` | `PlaygroundLayout` | Lumora-style coding environment (Monaco editor + AI assistance) |
| `sql` | `SQLPlayground` | Browser-side SQL playground with theme-aware editor |

The `vm` tab loads `PlaygroundShell`, which uses `EnvironmentPicker` to present the
9 available environments with plan-gating. Locked environments are rendered at 55%
opacity with a PRO badge and are non-clickable. The cluster session UI adds three
node tabs (etcd1/etcd2/etcd3), each backed by a separate WebSocket connection
using `?node=0`, `?node=1`, `?node=2`.
