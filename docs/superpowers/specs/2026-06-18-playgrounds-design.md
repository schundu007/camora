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
| 6 — Expanded Environments | Terraform, CI/CD (Jenkins), real AWS sandbox, Python env | Week 7–8 |
| 7 — Advanced UX | Monaco editor pane, multi-terminal tabs, environment reset, course integration | Week 9–10 |
| 8 — Gamification + Exams | Mock exam mode, achievement badges, leaderboard, certification tracks | Week 11–12 |

---

## 12. Open Questions

1. **Nomad ACL tokens** — session manager should use a restricted token scoped to the `playgrounds` namespace only (recommended: yes)
2. **Nginx routing** — Consul service discovery vs. session manager writing upstream entries directly
3. **Image registry** — Docker Hub public vs. Linode Container Registry private
4. **Cloud CLI write interception** — shell alias wrapper vs. lightweight proxy binary
5. **Mobile** — show "desktop only" message on `/capra/playground` for mobile viewports (recommended: yes, terminals need a physical keyboard)
6. **Real AWS sandboxes** — AWS Organizations + vended accounts vs. LocalStack vs. read-only demo credentials (Section 13.1)
7. **Monaco editor** — full `@monaco-editor/react` bundle (~2MB) vs. CodeMirror 6 (~300KB, covers 90% of use cases)

---

## 13. KodeKloud-Inspired Advanced Capabilities

> Source: KodeKloud feature analysis (June 2026). These capabilities represent the gap between our current spec and a world-class platform. Phased into Weeks 7–12.

### 13.1 Real Cloud Sandbox Environments

KodeKloud's most visible differentiator: **Launch Real AWS Services** — not just the CLI with read-only creds, but actual AWS accounts provisioned per session.

**Mechanism:** AWS Organizations + Service Control Policies (SCPs).

1. A dedicated AWS root account (`camora-sandbox-root`) runs an Organization with a `SandboxOU`.
2. On session create, a Lambda vends a fresh member account from a warm pool (pre-created accounts, ~2 min to provision fresh, <5s from pool).
3. The member account gets a restrictive SCP attached: whitelist only the services the scenario needs (EC2, S3, RDS, EKS — never IAM root, never billing).
4. Session credentials (temporary IAM role) are injected into the container at start.
5. On session destroy, the account is purged with `aws nuke` and returned to the pool.

**Cost:** ~$0 per session (free tier services); pool of 10 warm accounts handles bursts. Add `pg-aws-real` image to the Docker image list.

**New environments to add (parallel to AWS):**

| Image | Provider | What's real |
|---|---|---|
| `camora/pg-aws-real` | AWS | EC2, S3, RDS, EKS — live, in a sandboxed member account |
| `camora/pg-terraform` | Linode | Terraform 1.7 + providers (AWS local mock via LocalStack, Linode real) |
| `camora/pg-cicd` | Linode | Jenkins LTS + pre-wired pipeline repo, or GitHub Actions runner |
| `camora/pg-python` | Linode | Python 3.12 + pip, Jupyter Lab, common DevOps libs |
| `camora/pg-ai` | Linode | Jupyter Lab + Ollama (Mistral 7B local) + Claude API via env-injected key |

**Resource quotas for new environments:**

| Environment | CPU | RAM | Disk |
|---|---|---|---|
| Terraform | 500 MHz | 1 GB | 3 GB |
| CI/CD (Jenkins) | 2000 MHz | 2 GB | 10 GB |
| Python | 500 MHz | 512 MB | 2 GB |
| AI/LLM | 4000 MHz | 8 GB | 20 GB |
| AWS Real | 500 MHz | 512 MB | 1 GB (container only; real resources are in AWS) |

### 13.2 Monaco Editor Pane (VS Code in the Browser)

KodeKloud embeds an editor alongside the terminal so users can edit YAML, Dockerfiles, and Python scripts without memorizing vi keybindings.

**Implementation:**

```
┌───────────────────────────────────────────────────────┐
│  PREPARE  ›  Playground                               │
├────────────────────┬──────────────────────────────────┤
│  Left pane         │  Right pane (tabbed)             │
│  Monaco Editor     │  [Terminal 1] [Terminal 2] [+]   │
│  ─────────────     │  ─────────────────────────────   │
│  deploy.yaml  ×    │  $ kubectl apply -f deploy.yaml  │
│  service.yaml      │  deployment.apps/nginx created   │
│                    │  $ █                             │
│  [Save to /tmp]    │                                  │
├────────────────────┴──────────────────────────────────┤
│  Objectives  ⏱ 47:23  [Hint]  [Reset]  [End Session] │
└───────────────────────────────────────────────────────┘
```

- Package: `@monaco-editor/react` (lazy-loaded, not in initial bundle)
- File system bridge: Monaco saves to `/tmp/playground-editor/` inside the container via a thin HTTP endpoint exposed by the `ttyd` sidecar. Users can then `kubectl apply -f /tmp/playground-editor/deploy.yaml` in the terminal.
- Language auto-detect from file extension: `.yaml` → YAML, `.py` → Python, `.tf` → HCL, `.sh` → Shell, `Dockerfile` → Docker
- Default split: 40% editor / 60% terminal. Resizable via drag handle.
- Free-form mode: editor hidden by default; toggled via "Open Editor" button.

New frontend files:
```
src/components/capra/playground/
  EditorPane.jsx         ← Monaco wrapper with file-system bridge
  TerminalTabs.jsx       ← Multi-tab xterm.js manager
  PlaygroundSplitView.jsx ← Resizable split between editor and terminals
```

### 13.3 Multi-Terminal Tabs

K8s scenarios often need simultaneous shells: one watching `kubectl get pods -w`, one editing manifests, one tailing logs.

**Implementation:** Each tab is an independent WebSocket connection to the same session container, connecting to a separate `tmux` window. The backend creates a tmux session on container start (`tmux new-session -d -s main`). Each new tab calls `tmux new-window`, and the WebSocket proxy connects to that window.

- Free tier: 1 terminal tab (current behavior)
- Pro tier: up to 4 tabs per session
- Tab UI: thin tab strip above the terminal pane, `[bash] [watch] [logs] [+]`
- Tab titles: editable on double-click (stored client-side only)

New WebSocket message types:
```json
{ "type": "new_tab" }                          // client → server: open new tmux window
{ "type": "tab_created", "tabId": "w2" }      // server → client
{ "type": "switch_tab", "tabId": "w2" }       // client → server: redirect WS to window 2
```

### 13.4 Environment Reset Button

Users inevitably break the cluster or corrupt state. The Reset button restores the environment to its initial scenario state without ending the session or losing the timer.

**Implementation:**

1. On session create, the scenario `setup` script runs and a container filesystem snapshot is saved as a Docker layer (`docker commit pg-session-{id} pg-snapshot-{id}`).
2. On reset: `docker stop` the running container, `docker run` a new container from the snapshot, reconnect the WebSocket.
3. Timer does NOT reset — full reset counts as part of the session. One reset per session for free tier; unlimited for Pro.
4. Reset takes ~8 seconds. Frontend shows a "Resetting environment..." overlay with a spinner.

New API endpoint:
```
POST /api/v1/playground/sessions/:id/reset
Returns: { status: 'resetting', estimatedSeconds: 8 }
```

New WebSocket message:
```json
{ "type": "reset_complete", "timestamp": "..." }
```

### 13.5 Course-Integrated Lab Launch ("Try It" Buttons)

KodeKloud's killer feature: every piece of theory content has a **Try It** button that launches a pre-configured playground with the relevant scenario already loaded.

**Implementation in Camora:** Each Capra topic section gets an optional `playgroundScenarioId` field in the topic data. If present, a "Try it in Playground" button appears below the topic section. Clicking it navigates to `/capra/playground?scenarioId=k8s-debug-crashloop&source=topic`.

Topic data schema addition:
```js
// In networkingTopics.js, cloudTopics.js, etc.
{
  title: "Kubernetes NetworkPolicy",
  content: "...",
  playgroundScenarioId: "k8s-networkpolicy-isolate",  // links to scenario YAML
  playgroundEnv: "k8s-single"
}
```

Frontend: `TopicDetail.jsx` renders a `<PlaygroundLaunchButton>` component when `playgroundScenarioId` is set. The button is gold-outlined, navy background, positioned at the bottom-right of the topic card.

This is the APPA loop made concrete: **Prepare** (read the topic) → **Practice** (click Try It → playground).

### 13.6 Certification Track Lab Paths

Structured sequences of scenarios mapped to real certification exam objectives.

**Track definitions** stored in `src/data/capra/playgrounds/tracks/`:

```yaml
id: cka-track
title: "CKA Exam Prep Track"
certification: "Certified Kubernetes Administrator"
totalScenarios: 24
domains:
  - name: "Cluster Architecture, Installation & Configuration"
    weight: 25
    scenarios: [k8s-install-kubeadm, k8s-upgrade-cluster, k8s-etcd-backup, k8s-rbac-setup]
  - name: "Workloads & Scheduling"
    weight: 15
    scenarios: [k8s-deploy-scale, k8s-rolling-update, k8s-daemonset, k8s-resource-limits]
  - name: "Services & Networking"
    weight: 20
    scenarios: [k8s-networkpolicy-isolate, k8s-ingress-nginx, k8s-dns-debug]
  - name: "Storage"
    weight: 10
    scenarios: [k8s-pv-pvc, k8s-storage-class]
  - name: "Troubleshooting"
    weight: 30
    scenarios: [k8s-debug-crashloop, k8s-node-notready, k8s-service-unreachable]
```

**Initial tracks:** CKA, CKAD, Docker DCA, Linux RHCSA-style, Terraform Associate.

**Progress tracking:** `playground_track_progress` table — one row per user per track per scenario, with `completed_at` and `time_taken_seconds`.

**UI:** A `/capra/playground/tracks` page showing each track as a card with a progress bar (X/24 scenarios complete). Clicking a track shows the domain breakdown and scenario list as a skill tree.

### 13.7 Mock Exam Mode

Timed multi-scenario exam simulating CKA/CKAD: 15–17 tasks, 2-hour timer, no hints, automated scoring.

**Exam session flow:**

1. User selects exam track and clicks "Start Mock Exam"
2. A dedicated exam session is created (`type: 'exam'` in `playground_sessions`)
3. A curated subset of scenarios from the track is shuffled and presented as tasks
4. 2-hour countdown shown prominently (no extension available)
5. User works through tasks in any order; can skip and return
6. On time expiry or "Submit Exam": all objectives run final check simultaneously
7. Score report: percentage, per-domain breakdown, pass/fail (pass = ≥66% for CKA standard), time per task

**Score report stored in** `playground_exam_results`:
```sql
CREATE TABLE playground_exam_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  track_id      TEXT NOT NULL,
  session_id    UUID REFERENCES playground_sessions(id),
  score_pct     INTEGER,
  passed        BOOLEAN,
  domain_scores JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**UI differences from normal mode:** No scenario hints panel. No "Check Progress" button (final check only). Red countdown timer when <15 minutes remain.

### 13.8 Achievement System

Gamification layer: badges for completing scenario categories and milestone accomplishments.

**Badge definitions** (stored as static JSON in `src/data/capra/playgrounds/badges.json`):

| Badge | Trigger |
|---|---|
| First Steps | Complete first playground session |
| Container Captain | Complete all 3 Docker scenarios |
| K8s Sailor | Complete 5 K8s scenarios |
| K8s Admiral | Complete all K8s scenarios |
| CKA Ready | Pass CKA mock exam |
| Speed Demon | Complete any scenario in under half the estimated time |
| Streak: 7 Days | Open playground 7 days in a row |
| Troubleshooter | Complete all 3 troubleshooting scenarios |
| Cloud Architect | Complete AWS real sandbox scenario |
| IaC Engineer | Complete Terraform scenario |

**Backend:** `POST /api/v1/playground/sessions/:id/check/:objectiveId` triggers badge evaluation in `badgeEngine.js` after a pass. Earned badges stored in `playground_badges` table. New badges surfaced as a toast notification on the playground page.

### 13.9 Leaderboard

Per-scenario leaderboard showing fastest completion times (time from scenario start to all objectives passed).

- Leaderboard scoped per scenario: `/api/v1/playground/scenarios/:id/leaderboard` returns top 10 with display name, avatar, and `time_taken_seconds`
- Weekly reset: leaderboard shows all-time and "This week" tabs
- Displayed in the ScenarioPanel below the objectives list (collapsed by default, one click to expand)
- Only Pro users appear on the leaderboard (free users still see it, just don't contribute)

### 13.10 Lab Notes Sidebar

Collapsible markdown notes panel alongside the terminal. Users take notes during a session; notes persist to their account and are viewable in a "My Notes" section on `/capra/playground/notes`.

- Rendered with the same `FormattedContent` component used for topic content
- Notes auto-save on 1-second debounce (no Save button)
- Linked to the scenario: searching "nginx" in My Notes surfaces all sessions where the user took notes during nginx-related scenarios
- Stored in `playground_notes` table: `(user_id, session_id, scenario_id, content_md, updated_at)`

### 13.11 Pre-Flight Environment Check

Before a scenario timer starts, a checklist verifies the cluster or container is healthy.

**Check sequence (runs in parallel, 15s timeout total):**

| Check | K8s | Docker | Ubuntu |
|---|---|---|---|
| Container responding | ✓ | ✓ | ✓ |
| All nodes Ready | ✓ | — | — |
| CoreDNS running | ✓ | — | — |
| Docker daemon up | — | ✓ | — |
| Required namespaces exist | ✓ | — | — |
| Scenario setup script exited 0 | ✓ | ✓ | ✓ |

**UI:** A "Preparing environment…" overlay with a live checklist as each check passes (green checkmark). Once all pass, "Environment Ready" badge appears and the scenario timer starts. If any check fails after 3 retries, show "Environment setup failed" with a Retry button (spawns a fresh container).

### 13.12 AI-Assisted Hint System

When a user clicks Hint in a scenario, instead of revealing a static pre-written hint, the system queries the Ascend backend's AI to generate a contextual hint based on:
1. The specific objective that hasn't been completed yet
2. The last 10 commands the user typed (captured from terminal output)
3. The scenario's domain context

This produces targeted, progressive hints ("You've checked the pod logs — now look at the events section of kubectl describe") rather than generic ones.

**Implementation:**
- `POST /api/v1/playground/sessions/:id/hint/:objectiveId` — body includes `{ recentCommands: string[] }`
- Streams the hint back as SSE (same pattern as Lumora answers)
- First hint is free; subsequent hints for same objective cost 1 Capra credit (free tier gets 3 hints/day total)
- Hints cached by `(scenarioId, objectiveId, recentCommandsHash)` in Redis with 1-hour TTL
