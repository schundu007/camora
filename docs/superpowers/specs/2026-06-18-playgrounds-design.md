# Camora Playgrounds — Design Spec
**Date:** 2026-06-18  
**Status:** Approved  
**Author:** Sudhakar Chundu + Claude

---

## 1. Overview

Interactive browser-based terminal playgrounds for K8s, Docker, Ubuntu, and Cloud CLI environments — similar to [iximiuz.com/playgrounds](https://labs.iximiuz.com/playgrounds). Users get a real, isolated terminal session in the browser with pre-configured environments and optional guided scenarios.

### Goals
- Ship a self-service playground accessible from `/capra/playground`
- Support 50+ concurrent sessions at peak
- K8s (single-node + multi-node), Docker, Ubuntu, and Cloud CLI environments
- Free tier: 1 session/day (Ubuntu + Docker, free-form only)
- Pro tier: unlimited sessions, all environments, guided scenarios
- 60-minute sessions with one 15-minute extension

---

## 2. Architecture

### 2.1 Orchestration: Nomad on Linode

Nomad is the scheduler. It runs on Linode VMs with sysbox-runc installed on each client node. The Session Manager (a new module in `ascend-backend`) calls Nomad's HTTP API to schedule, stop, and inspect playground tasks. Nomad handles bin-packing sessions across nodes and scales automatically when new Linode nodes are added.

```
Browser (xterm.js)
    │  WebSocket wss://api.cariara.com/playground/ws/:sessionId
    ▼
Nginx Gateway (TLS termination, WS proxy)
    │
    ▼
ascend-backend /playground/ws/:id  ──▶  pipes to ttyd:7681 in session container
    │
    ▼
Nomad API  ──▶  schedules task on Nomad client node
    │
    ▼
Nomad Client Node (sysbox-runc)
    └── Container: ttyd + [k3d | dockerd | bash]
```

### 2.2 Infrastructure

| Component | Linode Plan | Count | Cost/month |
|---|---|---|---|
| Nomad Server | 4 GB (`g6-standard-2`) | 1 | $24 |
| Nomad Client Nodes | 8 GB (`g6-standard-4`) | 3–8 | $144–$384 |
| Nginx Gateway | 2 GB (`g6-nanode-1`) | 1 | $12 |
| **Base total** | | **5 nodes** | **~$180** |

Client nodes autoscale: start at 3, cap at 8 for 50+ concurrent sessions. Each 8GB node hosts 8–10 concurrent sessions depending on environment type.

### 2.3 sysbox-runc

sysbox is installed on every Nomad client node. It provides each container with its own kernel namespaces, allowing Docker and K3s to run inside a container without `--privileged`. This is the same isolation model used by iximiuz.com.

Install on each client node:
```bash
wget https://github.com/nestybox/sysbox/releases/download/v0.6.4/sysbox-ce_0.6.4-0.linux_amd64.deb
dpkg -i sysbox-ce_*.deb
```

Nomad task driver config:
```hcl
task "session" {
  driver = "docker"
  config {
    image   = "camora/pg-k8s-single:latest"
    runtime = "sysbox-runc"
    ports   = ["ttyd"]
  }
}
```

---

## 3. Session Lifecycle

### 3.1 States
`provisioning` → `ready` → `active` → `expiring` (T-5min warning) → `destroyed`

### 3.2 Flow

1. **Create:** `POST /api/v1/playground/sessions` → Session Manager calls Nomad API → Nomad schedules task → task starts, ttyd becomes healthy → Manager returns `{ sessionId, wsUrl, expiresAt }`
2. **Connect:** Browser opens WebSocket to `wss://api.cariara.com/playground/ws/:sessionId` → Nginx routes to ascend-backend → backend pipes to ttyd inside the container
3. **Extend:** User clicks Extend at T-5min warning → `POST /sessions/:id/extend` → Redis TTL +15min, Nomad task `kill_timeout` updated → one-time flag set in DB
4. **Destroy:** Redis TTL expires → Session Manager calls `DELETE /nomad/job/:id` → Nginx route entry removed → DB session marked `destroyed`

### 3.3 Crash Recovery

If a Nomad client node dies mid-session, Nomad marks affected tasks as `dead`. The Session Manager detects this via health polling and updates DB state to `destroyed`. The browser receives a WebSocket close event and shows "Session ended — node lost. Start a new session." — same behavior as iximiuz.

### 3.4 TTL Implementation

- Redis key: `playground:session:{id}:ttl` with 60-min TTL
- At T-5min: session manager emits `{ type: 'warning', remaining: 300 }` over WebSocket
- At T=0: session manager calls Nomad stop + Redis cleanup + DB update
- Extension: `EXPIRE playground:session:{id}:ttl 900` (add 15min), set `extended=true` in DB

---

## 4. Playground Environments

### 4.1 Docker Images

All images based on `nestybox/ubuntu-jammy-systemd-docker` (sysbox-compatible base).

| Image | Tag | Pre-installed | Startup |
|---|---|---|---|
| `camora/pg-ubuntu` | `latest` | curl, git, vim, jq, tmux, htop | bash |
| `camora/pg-docker` | `latest` | Docker CE 24 | dockerd + bash |
| `camora/pg-k8s-single` | `latest` | Docker CE, k3d 5, kubectl 1.29, helm 3 | k3d cluster create + bash |
| `camora/pg-k8s-multi` | `latest` | Same as single | k3d cluster create --agents 2 + bash |
| `camora/pg-cloud-cli` | `latest` | awscli 2, azure-cli, gcloud SDK | bash with demo credentials |

Images are pre-pulled on every Nomad client node at boot time via a Nomad periodic job, so session provisioning takes 5–15 seconds.

### 4.2 Resource Quotas (enforced by Nomad)

| Environment | CPU | RAM | Disk |
|---|---|---|---|
| Ubuntu | 500 MHz | 512 MB | 2 GB |
| Docker | 1000 MHz | 1 GB | 5 GB |
| K8s single-node | 2000 MHz | 2 GB | 10 GB |
| K8s multi-node | 3000 MHz | 4 GB | 15 GB |
| Cloud CLI | 500 MHz | 512 MB | 1 GB |

### 4.3 Cloud CLI Environment

- **AWS:** Restricted IAM user with `ReadOnlyAccess` policy on a demo account. Pre-populated with sample VPCs, EC2 instances, S3 buckets, RDS clusters. Write commands intercepted by a shell wrapper that returns plausible success output.
- **Azure:** Service principal with Reader role on a demo subscription. Same pre-populated resources.
- **GCP:** Service account with Viewer role on a demo project.

Credentials baked into the image at build time (not runtime). Demo accounts are dedicated, never contain real data.

---

## 5. Backend Services

### 5.1 New Files in `ascend-backend`

```
src/
  services/playground/
    sessionManager.js     ← CRUD sessions via Nomad API
    nomadClient.js        ← HTTP wrapper for Nomad REST API
    wsProxy.js            ← WebSocket pipe: browser ↔ ttyd
    sessionStore.js       ← Redis TTL + Postgres persistence
    completionChecker.js  ← exec objective checks inside container
  routes/
    playgroundSessions.js ← REST endpoints
    playgroundWs.js       ← WebSocket upgrade handler
```

### 5.2 REST API

Base path: `/api/v1/playground/sessions`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Required | Create session. Body: `{ environment, scenarioId? }`. Returns `{ sessionId, wsUrl, expiresAt, environment }` |
| `GET` | `/:id` | Required | Session status, `timeRemaining`, `extendAvailable`, `objectives` |
| `POST` | `/:id/extend` | Required | Extend by 15min (once). Returns `{ expiresAt }` |
| `DELETE` | `/:id` | Required | Early termination |
| `GET` | `/:id/check/:objectiveId` | Required | Run objective check. Returns `{ passed: bool }` |
| `GET` | `/history` | Required | Past sessions for current user |

### 5.3 WebSocket Protocol

Path: `/playground/ws/:sessionId`

Client → Server messages:
```json
{ "type": "input", "data": "kubectl get pods\r" }
{ "type": "resize", "cols": 220, "rows": 50 }
```

Server → Client messages:
```json
{ "type": "output", "data": "NAME   READY   STATUS\n..." }
{ "type": "warning", "remaining": 300 }
{ "type": "extended", "expiresAt": "..." }
{ "type": "destroyed", "reason": "ttl_expired" }
```

### 5.4 Database Schema

```sql
CREATE TABLE playground_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  environment   TEXT NOT NULL,
  scenario_id   TEXT,
  nomad_job_id  TEXT,
  status        TEXT NOT NULL DEFAULT 'provisioning',
  extended      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  destroyed_at  TIMESTAMPTZ
);

CREATE TABLE playground_objective_completions (
  session_id    UUID REFERENCES playground_sessions(id),
  objective_id  TEXT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, objective_id)
);

CREATE INDEX idx_playground_sessions_user ON playground_sessions(user_id);
CREATE INDEX idx_playground_sessions_status ON playground_sessions(status);
```

---

## 6. Frontend

### 6.1 New Files in `apps/camora`

```
src/
  pages/capra/
    PlaygroundPage.jsx
  components/capra/playground/
    TerminalPane.jsx
    ScenarioPanel.jsx
    SessionTimer.jsx
    EnvironmentPicker.jsx
    PlaygroundShell.jsx
  hooks/
    usePlaygroundSession.js
    useTerminalResize.js
```

### 6.2 Layout

```
┌─────────────────────────────────────────────────────┐
│  PREPARE  ›  Playground                             │
├──────────────┬──────────────────────────────────────┤
│  Environment │  ┌─────────────────────────────────┐ │
│  ○ Ubuntu    │  │ Objective 1: ✓ Deploy nginx pod │ │
│  ○ Docker    │  │ Objective 2: ◌ Expose via SVC   │ │
│  ● K8s       │  │ Objective 3: ◌ Verify health    │ │
│    ○ Single  │  │                         [Hint]  │ │
│    ● Multi   │  └─────────────────────────────────┘ │
│  ○ Cloud CLI │                                      │
│              │  ┌─────────────────────────────────┐ │
│  Scenarios   │  │$ kubectl get pods               │ │
│  ● Free      │  │NAME    READY  STATUS            │ │
│  ○ Guided    │  │nginx   1/1    Running           │ │
│              │  │                                 │ │
│              │  │$█                               │ │
│  ⏱ 47:23    │  └─────────────────────────────────┘ │
│  [Extend]    │                    [End Session]     │
└──────────────┴──────────────────────────────────────┘
```

### 6.3 npm Packages Required

```json
"xterm": "^5.3.0",
"xterm-addon-fit": "^0.8.0",
"xterm-addon-web-links": "^0.9.0",
"xterm-addon-search": "^0.13.0"
```

---

## 7. Scenario Engine

### 7.1 Scenario File Format

Stored as YAML in `apps/camora/src/data/capra/playgrounds/scenarios/`:

```yaml
id: k8s-debug-crashloop
title: "Debug a CrashLoopBackOff"
environment: k8s-single
difficulty: intermediate
estimatedMinutes: 20
tags: [debugging, pods, logs]

setup: |
  kubectl apply -f /scenarios/crashloop/broken-deploy.yaml

objectives:
  - id: find-pod
    description: "Identify the crashing pod"
    check: "kubectl get pods | grep -c CrashLoop"
    expectedOutput: "1"
  - id: read-logs
    description: "Read the pod logs to find the error"
    check: "kubectl logs -l app=broken --previous | grep -c 'Error'"
    expectedOutput: "1"
  - id: fix-deploy
    description: "Fix the deployment so all 3 pods are Running"
    check: "kubectl get pods -l app=broken | grep -c Running"
    expectedOutput: "3"

hints:
  - "Try kubectl describe pod to see the exit code"
  - "The error is in an environment variable"
  - "Look at env: in the deployment spec"
```

### 7.2 Completion Check Execution

`completionChecker.js` uses the Nomad API exec endpoint to run check commands inside the running task and compares stdout to `expectedOutput`. Checks run on demand (user clicks "Check Progress") and automatically every 30 seconds while the scenario panel is open.

### 7.3 Initial Scenario Library (Phase 1)

**K8s scenarios:**
1. Deploy and scale an nginx deployment
2. Debug a CrashLoopBackOff
3. Fix a pod that can't be scheduled (resource constraints)
4. Set up RBAC for a service account
5. Configure a NetworkPolicy to isolate namespaces

**Docker scenarios:**
1. Build and run a custom Docker image
2. Debug a container that exits immediately
3. Set up a multi-container app with docker-compose

**Ubuntu scenarios:**
1. Diagnose high CPU with top/htop
2. Trace a network connection with tcpdump
3. Debug a failed systemd service

---

## 8. Access Control

| Tier | Sessions/day | Max duration | Environments | Scenarios |
|---|---|---|---|---|
| Free | 1 | 60 min | Ubuntu, Docker | Free-form only |
| Pro | Unlimited | 60 + 15 min | All | All guided |

Free session count tracked via existing `ascend_free_usage` table. Session creation returns HTTP 429 with `{ error: 'daily_limit_reached', upgradeUrl: '/pricing' }` for free users at their limit.

---

## 9. Nomad Job Template

```hcl
job "playground-${SESSION_ID}" {
  datacenters = ["linode-us-east"]
  type        = "service"

  group "session" {
    count = 1

    network {
      port "ttyd" { to = 7681 }
    }

    task "session" {
      driver = "docker"

      config {
        image   = "camora/pg-k8s-single:latest"
        runtime = "sysbox-runc"
        ports   = ["ttyd"]
        command = "/start.sh"
      }

      resources {
        cpu    = 2000
        memory = 2048
        disk   = 10240
      }

      env {
        SESSION_ID  = "${SESSION_ID}"
        SCENARIO_ID = "${SCENARIO_ID}"
      }

      kill_timeout = "10s"

      service {
        name = "playground-${SESSION_ID}"
        port = "ttyd"
        check {
          type     = "tcp"
          interval = "5s"
          timeout  = "2s"
        }
      }
    }
  }
}
```

---

## 10. Nomad Infrastructure Bootstrap

### Server Node (1× Linode 4GB)

```bash
apt-get install -y nomad
cat > /etc/nomad.d/server.hcl <<EOF
datacenter = "linode-us-east"
data_dir   = "/opt/nomad/data"
server {
  enabled          = true
  bootstrap_expect = 1
}
EOF
systemctl enable --now nomad
```

### Client Nodes (each Linode 8GB)

```bash
apt-get install -y nomad docker.io

# Install sysbox
wget https://github.com/nestybox/sysbox/releases/download/v0.6.4/sysbox-ce_0.6.4-0.linux_amd64.deb
dpkg -i sysbox-ce_*.deb

cat > /etc/nomad.d/client.hcl <<EOF
datacenter = "linode-us-east"
data_dir   = "/opt/nomad/data"
client {
  enabled = true
  servers = ["<NOMAD_SERVER_PRIVATE_IP>:4647"]
}
plugin "docker" {
  config {
    allow_privileged = false
    volumes { enabled = true }
  }
}
EOF
systemctl enable --now nomad

# Pre-pull all playground images
for img in ubuntu docker k8s-single k8s-multi cloud-cli; do
  docker pull camora/pg-$img:latest
done
```

---

## 11. Implementation Phases

| Phase | Scope | Duration |
|---|---|---|
| 1 — Core | Nomad cluster, sysbox, Ubuntu + Docker envs, xterm.js terminal, basic `/capra/playground` | Week 1–2 |
| 2 — K8s | `pg-k8s-single` + `pg-k8s-multi` images, k3d bootstrap, multi-node toggle | Week 3 |
| 3 — Scenarios | Completion checker, ScenarioPanel UI, first 11 scenarios authored | Week 4 |
| 4 — Cloud CLI + Billing | Cloud CLI image + demo credentials, free tier quota, Pro gate | Week 5 |
| 5 — Polish | Analytics, Nomad alerting, node autoscaler, image CI pipeline | Week 6 |

---

## 12. Open Questions

1. **Nomad ACL tokens** — session manager should use a restricted token scoped to the `playgrounds` namespace only (recommended: yes)
2. **Nginx routing** — Consul service discovery vs. session manager writing upstream entries directly
3. **Image registry** — Docker Hub public vs. Linode Container Registry private
4. **Cloud CLI write interception** — shell alias wrapper vs. lightweight proxy binary
5. **Mobile** — show "desktop only" message on `/capra/playground` for mobile viewports (recommended: yes, terminals need a physical keyboard)
