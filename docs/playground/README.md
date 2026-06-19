# Camora Playground — Documentation Index

The Camora Playground is an interactive browser-based terminal and IDE environment
for hands-on DevOps, infrastructure, and distributed systems practice. It serves two
products: Capra (interview preparation) and Lumora (live interview assistance).

---

## Documents

| File | What It Covers |
|---|---|
| [architecture.md](./architecture.md) | Full system architecture — infrastructure, session lifecycle, WebSocket proxy, cluster sessions, port model |
| [etcd-implementation.md](./etcd-implementation.md) | etcd single-node and cluster environments — images, config flags, lab exercises, dynamic provisioning |
| [infrastructure-decisions.md](./infrastructure-decisions.md) | ADR: Docker Networks vs Firecracker/Cloud Hypervisor; options evaluated; migration path |
| [known-issues.md](./known-issues.md) | Current limitations, workarounds, and open risks |

---

## Environment Quick-Start

| Environment | ID | Plan | RAM | What It Teaches |
|---|---|---|---|---|
| Ubuntu 24.04 | `ubuntu` | Free | 512 MB | Linux fundamentals, shell scripting, process management |
| Docker | `docker` | Free | 1 GB | Containers, Compose, image builds, networking |
| AI Agent Sandbox | `agent-sandbox` | Pro | 1.5 GB | Claude Code, Codex CLI, Gemini CLI — agentic coding workflows |
| K8s Single-node | `k8s-single` | Pro | 2 GB | Kubernetes basics — pods, services, deployments on one node |
| K8s Multi-node | `k8s-multi` | Pro | 4 GB | kubeadm cluster setup, node roles, scheduling, CNI |
| Cloud CLI | `cloud-cli` | Pro | 1.5 GB | AWS/GCP/Azure CLIs, Terraform, kubectl against real providers |
| Deploy Your Container | `custom` | Free | — | Custom language/tool combos via user-provided image |
| etcd Single Node | `etcd-single` | Free | 512 MB | Key-value ops, leases, watches, transactions, snapshots |
| etcd Cluster | `etcd-cluster` | Pro | 512 MB × 3 | Raft consensus, leader election, member add/remove, fault injection |

**Free tier**: 1 session per 24 hours. Only `ubuntu`, `docker`, `custom`, and `etcd-single` are accessible without a subscription.

**Pro tier**: Unlimited sessions. Unlocks all environments. Plans: `pro_monthly`, `pro_yearly`, `team`, `lifetime`.

---

## Architecture at a Glance

```
Browser
  │
  ├─ HTTPS/WSS ──► playground-backend (Railway, port 3010)
  │                      │
  │                      ├─ REST  /api/v1/playground/sessions
  │                      ├─ WS    /playground/ws/{sessionId}?node=N
  │                      └─ HTTP  /pg-ide  (code-server proxy)
  │                               │
  │                        SSH over port 20022
  │                               │
  │                        Worker node (Linode, 172.104.210.63)
  │                               │
  │                        docker run (single) or
  │                        docker network + docker run ×3 (cluster)
  │                               │
  │                        Container(s): ttyd :7681, code-server :8080
  │                        mapped to ephemeral host ports
  │
  └─ iframe ──► /pg-ide?_s={sessionId}&_t={token}  (VS Code in browser)
```

---

## Key Environment Variables

| Variable | Service | Purpose |
|---|---|---|
| `WORKER_HOST` | playground-backend | Worker node IP (default: `172.104.210.63`) |
| `WORKER_USER` | playground-backend | SSH user on worker (default: `pgrunner`) |
| `WORKER_SSH_KEY_B64` | playground-backend | Base64-encoded SSH private key |
| `WORKER_SSH_PORT` | playground-backend | SSH port on worker (default: `20022`) |
| `PLAYGROUND_WS_BASE` | playground-backend | WebSocket base URL returned to clients |
| `DATABASE_URL` | playground-backend | PostgreSQL connection string |
| `REDIS_URL` | playground-backend | Redis (session TTL keys) |
| `JWT_SECRET` | playground-backend | JWT verification (shared with ascend-backend) |
