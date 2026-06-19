# etcd Single-Node Playground

**Image:** `chundubabu/pg-etcd-single`
**etcd version:** v3.5.14
**Environment:** Ubuntu 22.04, single-node (no clustering)

---

## What's Running

| Service     | Address              | Purpose                        |
|-------------|----------------------|--------------------------------|
| etcd        | 127.0.0.1:2379       | Client API (gRPC + HTTP/2)     |
| etcd peer   | 127.0.0.1:2380       | Peer port (unused in single)   |
| code-server | 0.0.0.0:8080         | VS Code in browser             |
| ttyd        | 0.0.0.0:7681         | Web terminal                   |

---

## Quick Start

Open the terminal (ttyd) and run any lab:

```bash
# Check etcd is running
etcdctl endpoint health

# Run labs in order
bash /home/learner/labs/01-basics.sh
bash /home/learner/labs/02-leases-ttl.sh
bash /home/learner/labs/03-transactions.sh
bash /home/learner/labs/04-watch.sh
bash /home/learner/labs/05-snapshot.sh
```

---

## Useful Commands

```bash
# Key-value operations
etcdctl put /key value
etcdctl get /key
etcdctl del /key
etcdctl get --prefix /namespace/
etcdctl get --prefix / --keys-only        # list all keys

# Cluster status
etcdctl endpoint status -w table
etcdctl endpoint health

# Leases
etcdctl lease grant 30                    # grant 30-second lease
etcdctl lease timetolive <lease-id>       # inspect TTL
etcdctl lease keep-alive --once <id>      # refresh TTL
etcdctl lease revoke <id>                 # delete lease + attached keys

# Watch
etcdctl watch /key
etcdctl watch --prefix /namespace/
etcdctl watch /key --rev=42               # replay from revision 42

# Transactions
etcdctl txn                               # interactive mode

# Snapshot / backup
etcdctl snapshot save /tmp/snap.db
etcdutl snapshot status /tmp/snap.db -w table
etcdutl snapshot restore /tmp/snap.db --data-dir /tmp/restored

# Compaction
etcdctl compact $(etcdctl endpoint status -w json | jq '.[0].Status.header.revision')
etcdctl defrag

# Logs
etcd-logs                                 # tail -f /var/log/etcd.log (alias)
```

---

## Lab Exercises

| Lab | File | Concepts Covered |
|-----|------|-----------------|
| 01  | `labs/01-basics.sh`        | put, get, del, prefix list, revision |
| 02  | `labs/02-leases-ttl.sh`    | lease grant, TTL, keep-alive, revoke, session locks |
| 03  | `labs/03-transactions.sh`  | txn, compare-and-swap, optimistic locking, leader election pattern |
| 04  | `labs/04-watch.sh`         | watch, prefix watch, historical replay, JSON output |
| 05  | `labs/05-snapshot.sh`      | snapshot save/restore, integrity check, compact, defrag |

---

## Key Concepts to Explore

- **Revision** — etcd's global monotonic counter; every write increments it.
- **MVCC** — Multi-Version Concurrency Control; etcd keeps historical revisions until compacted.
- **Lease** — Time-bounded token; attached keys expire when the lease does.
- **Watch** — Server-sent stream of create/update/delete events.
- **Transaction (txn)** — Atomic if/then/else on multiple keys; the foundation of distributed locks.
- **Compaction** — Discards old revisions to reclaim memory and disk.
- **Defragmentation** — Rewrites the bbolt database file to reclaim fragmented space.
- **Snapshot** — Point-in-time binary copy of the database used for backup and cluster restore.

---

## Environment Variables

```bash
ETCDCTL_API=3                         # always use v3 API
ETCDCTL_ENDPOINTS=http://127.0.0.1:2379
```

Both are pre-set in every shell session.

---

## Data Locations

| Path                 | Contents           |
|----------------------|--------------------|
| `/var/lib/etcd`      | etcd data directory (WAL + snapshots) |
| `/var/log/etcd.log`  | etcd server log    |
| `/home/learner/labs` | Lab scripts        |
