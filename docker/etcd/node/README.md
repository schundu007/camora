# etcd Cluster-Node Playground

**Image:** `chundubabu/pg-etcd-node`
**etcd version:** v3.5.14
**Environment:** Ubuntu 22.04, 3-node cluster (run 3 containers)

---

## Cluster Architecture

```
  ┌────────────────────────────────────────────────────────────┐
  │                    etcd Cluster (3 nodes)                  │
  │                                                            │
  │   ┌──────────┐   Raft   ┌──────────┐  Raft  ┌──────────┐  │
  │   │  etcd1   │◄────────►│  etcd2   │◄──────►│  etcd3   │  │
  │   │ (leader) │  :2380   │(follower)│  :2380  │(follower)│  │
  │   └────┬─────┘          └────┬─────┘         └────┬─────┘  │
  │        │ :2379               │ :2379               │ :2379   │
  │        └─────────────────────┴─────────────────────┘        │
  │                          clients                             │
  └────────────────────────────────────────────────────────────┘

  Quorum: floor(3/2)+1 = 2 nodes needed for writes.
  Fault tolerance: 1 node failure → cluster keeps running.
  2 node failures → reads only, no writes.
```

---

## What's Running Per Container

| Service     | Address              | Purpose                        |
|-------------|----------------------|--------------------------------|
| etcd        | 0.0.0.0:2379         | Client API (gRPC + HTTP/2)     |
| etcd peer   | 0.0.0.0:2380         | Raft peer communication        |
| code-server | 0.0.0.0:8080         | VS Code in browser             |
| ttyd        | 0.0.0.0:7681         | Web terminal                   |

---

## Quick Start

Open the terminal (ttyd on etcd1) and run labs in order:

```bash
# Check cluster is healthy (run from etcd1)
etcdctl endpoint health --cluster
etcdctl endpoint status --cluster -w table

# Run labs
bash /home/learner/labs/01-cluster-health.sh
bash /home/learner/labs/02-leader-election.sh
bash /home/learner/labs/03-dynamic-add.sh
bash /home/learner/labs/04-fault-injection.sh
bash /home/learner/labs/05-snapshot-restore.sh
```

---

## Cluster Commands

```bash
# Health and status
cluster-health                             # alias: etcdctl endpoint health --cluster
cluster-status                             # alias: etcdctl endpoint status --cluster -w table
etcdctl member list -w table

# Key-value (targets all 3 nodes via ETCDCTL_ENDPOINTS)
etcdctl put /key value
etcdctl get /key
etcdctl get --prefix /namespace/ --keys-only

# Watch from this node
etcdctl watch --prefix /namespace/

# Leader election (application-level)
etcdctl elect my-service "this-node-is-primary"
etcdctl elect --observe my-service

# Leases
etcdctl lease grant 30
etcdctl lease keep-alive --once <id>

# Transactions
etcdctl txn

# Snapshot (run from any healthy node)
etcdctl snapshot save /tmp/cluster.db
etcdutl snapshot status /tmp/cluster.db -w table

# Logs
etcd-logs                                  # tail /var/log/etcd.log
```

---

## Helper Scripts

| Script | Path | Purpose |
|--------|------|---------|
| `configure.sh`      | `/usr/share/etcd/configure.sh`      | Write etcd config from env vars (called by start.sh) |
| `etcd-add-node.sh`  | `/usr/share/etcd/etcd-add-node.sh`  | Register a new member with the cluster |
| `etcd-kill-node.sh` | `/usr/share/etcd/etcd-kill-node.sh` | Crash this node's etcd process (fault injection) |
| `etcd-restore-node.sh` | `/usr/share/etcd/etcd-restore-node.sh` | Restart etcd after a kill |
| `etcd-remove-node.sh`  | `/usr/share/etcd/etcd-remove-node.sh`  | Gracefully remove a member |

---

## Lab Exercises

| Lab | File | Concepts Covered |
|-----|------|-----------------|
| 01  | `labs/01-cluster-health.sh`     | Member list, endpoint status, leader, Raft replication |
| 02  | `labs/02-leader-election.sh`    | Raft election, etcdctl elect API, term |
| 03  | `labs/03-dynamic-add.sh`        | member add, INITIAL_CLUSTER_STATE=existing, scale-out |
| 04  | `labs/04-fault-injection.sh`    | Node crash, quorum math, leader failover |
| 05  | `labs/05-snapshot-restore.sh`   | Cluster backup, multi-node restore procedure |

---

## Environment Variables (runtime)

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_NAME` | `etcd1` | This node's name |
| `NODE_INDEX` | `0` | 0=primary, 1, 2 |
| `CLUSTER_NODES` | `etcd1,etcd2,etcd3` | All cluster members |
| `SESSION_ID` | `abc123` | Camora session identifier |
| `INITIAL_CLUSTER_STATE` | `new` or `existing` | `existing` when joining a running cluster |

---

## Key Concepts

- **Raft** — Consensus algorithm; leader elected by majority vote, log replicated to followers.
- **Quorum** — Minimum nodes needed to commit a write: `floor(N/2)+1`.
- **Member ID** — Permanent unique identifier assigned when a node first joins.
- **Raft Term** — Monotonically increasing counter; increments on every leader election.
- **Election Timeout** — Time a follower waits before starting an election (~150-300ms).
- **Heartbeat Interval** — How often the leader sends keep-alive to followers (~50ms).
- **INITIAL_CLUSTER_STATE** — `new` bootstraps a cluster; `existing` joins a running one.
- **Peer URL** — Address other members use to talk to this node via Raft (port 2380).
- **Client URL** — Address clients use to connect (port 2379).

---

## Data Locations

| Path | Contents |
|------|----------|
| `/var/lib/etcd/<node-name>` | etcd data directory (WAL + snapshots) |
| `/etc/etcd/config.yaml` | etcd config (written by configure.sh) |
| `/var/log/etcd.log` | etcd server log |
| `/home/learner/labs` | Lab scripts |
| `/usr/share/etcd` | Helper scripts |
