# etcd Playground — Implementation Reference

## 1. Why etcd for Practice

etcd is the distributed key-value store that powers Kubernetes (it is the entire
control plane state backend), HashiCorp Consul, and many other distributed systems.
Understanding etcd is directly relevant to:

- **Platform/SRE roles**: Every Kubernetes cluster operator needs to understand what
  etcd is, how it handles leader election, and how to take and restore snapshots.
- **Distributed systems interviews**: etcd is a canonical example of Raft consensus in
  production. Questions about leader election, split-brain, quorum, and linearizability
  are common at FAANG and infrastructure-focused companies.
- **DevOps tooling**: Many tools (Kubernetes, Fleet, CoreDNS cluster config) use etcd
  as their backing store. Knowing how to inspect and manipulate it directly is a
  practical skill.

The two playground environments cover the full learning arc:

- **etcd-single** (free): Core API — get/put/delete, leases, watches, transactions,
  snapshots. No cluster complexity, lower barrier to entry.
- **etcd-cluster** (pro): Raft mechanics — starting a cluster, leader election,
  adding/removing members, fault injection, compaction. This is what SRE interviews
  actually test.

---

## 2. Single-Node Environment (etcd-single)

### Image

```
chundubabu/pg-etcd-single:latest
```

Memory limit: 512 MB. Container exposes ttyd on :7681 and code-server on :8080.

### etcd startup flags

The container starts a single etcd node with this configuration (rendered from the
image entrypoint):

```bash
etcd \
  --name etcd0 \
  --data-dir /var/lib/etcd \
  --listen-client-urls http://0.0.0.0:2379 \
  --advertise-client-urls http://127.0.0.1:2379 \
  --listen-peer-urls http://0.0.0.0:2380 \
  --initial-advertise-peer-urls http://127.0.0.1:2380 \
  --initial-cluster etcd0=http://127.0.0.1:2380 \
  --initial-cluster-token etcd-single-token \
  --initial-cluster-state new
```

Flag-by-flag explanation:

| Flag | Value | Why |
|---|---|---|
| `--name` | `etcd0` | The member name. Used in `--initial-cluster` to map names to peer URLs. |
| `--data-dir` | `/var/lib/etcd` | Where etcd stores its WAL and snapshot files. |
| `--listen-client-urls` | `http://0.0.0.0:2379` | Accept client traffic on all interfaces inside the container. |
| `--advertise-client-urls` | `http://127.0.0.1:2379` | What the client should use to reach this member. Single-node: loopback is fine. |
| `--listen-peer-urls` | `http://0.0.0.0:2380` | Accept peer (Raft) traffic. Required even for single-node (Raft still runs). |
| `--initial-advertise-peer-urls` | `http://127.0.0.1:2380` | What other cluster members would use to reach this peer. Single-node: unused in practice. |
| `--initial-cluster` | `etcd0=http://127.0.0.1:2380` | The initial cluster membership. Format: `name=peerURL[,name=peerURL]`. |
| `--initial-cluster-token` | `etcd-single-token` | Prevents a node from accidentally joining a cluster on the same network. |
| `--initial-cluster-state` | `new` | Tells etcd this is a fresh bootstrap, not a member joining a running cluster. |

### Pre-installed tools

| Tool | Purpose |
|---|---|
| `etcdctl` | Primary CLI. Uses `ETCDCTL_API=3` (v3 API) by default in the image. |
| `etcdutl` | Offline utility: snapshot restore, defragmentation, hash verification. Does not require a running etcd server. |
| `curl` | Raw HTTP access to the gRPC-gateway (port 2379) for debugging. |
| `jq` | JSON output formatting. |

The environment variable `ETCDCTL_API=3` is set in the container's shell profile so
all `etcdctl` commands default to the v3 API without needing the flag.

### Lab exercises

#### 01-basics

Teaches: key-value operations, key prefixes, range queries.

```bash
# Put and get
etcdctl put /app/config/db_host "postgres.internal"
etcdctl get /app/config/db_host

# Range query (all keys under /app/config/)
etcdctl get /app/config/ --prefix

# Delete
etcdctl del /app/config/db_host

# Watch prefix (open a second terminal)
etcdctl watch /app/ --prefix
```

Expected: students understand that etcd is fundamentally a sorted key-value store
with range queries, not a flat hash map.

#### 02-leases-ttl

Teaches: lease grant, lease attach, lease keepalive, automatic expiry.

```bash
# Grant a 30-second lease
LEASE=$(etcdctl lease grant 30 | awk '{print $2}')
echo "Lease ID: $LEASE"

# Attach a key to the lease
etcdctl put /locks/job-processor locked --lease=$LEASE

# Verify
etcdctl get /locks/job-processor

# Keep alive in a loop (simulates a service holding a distributed lock)
etcdctl lease keep-alive $LEASE &

# Check lease TTL
etcdctl lease timetolive $LEASE

# Revoke manually (simulates service crash)
etcdctl lease revoke $LEASE
etcdctl get /locks/job-processor  # returns empty
```

Expected: students understand distributed TTL-based locking as a primitive.

#### 03-transactions

Teaches: compare-and-swap (CAS) transactions — the foundation of distributed locks
and leader election.

```bash
# Attempt to acquire a lock only if key does not exist
etcdctl txn --interactive << 'EOF'
compares:
create("/locks/leader") = "0"

success requests:
put /locks/leader "node-1"

failure requests:
get /locks/leader
EOF
```

Expected: students understand that etcd transactions are the correct primitive for
safe distributed state changes — not read-then-write.

#### 04-watch

Teaches: the watch API, revision numbers, and watch from a specific revision.

```bash
# Terminal 1: watch
etcdctl watch /config/ --prefix --rev=0

# Terminal 2: make changes
etcdctl put /config/feature_flag "enabled"
etcdctl put /config/timeout "30s"
etcdctl del /config/feature_flag

# Watch output shows event type (PUT/DELETE), key, value, revision
```

Expected: students understand how Kubernetes controllers are built on etcd watches —
the watch API is not polling, it is a long-lived server-push stream.

#### 05-snapshot

Teaches: backup and restore — critical SRE knowledge.

```bash
# Take a snapshot
etcdctl snapshot save /tmp/etcd-backup.db
etcdctl snapshot status /tmp/etcd-backup.db --write-out=table

# Restore to a different data directory (offline tool — etcd must be stopped)
etcdctl snapshot restore /tmp/etcd-backup.db \
  --name etcd0 \
  --data-dir /var/lib/etcd-restored \
  --initial-cluster etcd0=http://127.0.0.1:2380 \
  --initial-cluster-token etcd-single-token \
  --initial-advertise-peer-urls http://127.0.0.1:2380
```

Expected: students understand that snapshot restore is an offline operation that
re-bootstraps the cluster from a point-in-time backup.

---

## 3. Cluster Environment (etcd-cluster)

### Image

```
chundubabu/pg-etcd-node:latest   (used for all 3 nodes)
```

Memory limit: 512 MB per node. Total cluster RAM: ~1.5 GB plus host overhead.

Three containers run in a Docker bridge network named `pg-net-{sessionId[:16]}`.
Each container is assigned a fixed hostname and network alias so Docker's internal
DNS resolver can resolve `etcd1`, `etcd2`, `etcd3` to container IPs.

### Docker bridge DNS

This is the key mechanism that makes inter-node TCP work without real VM IPs or a
virtual network fabric:

```
Container etcd1  (--hostname etcd1  --network-alias etcd1)
Container etcd2  (--hostname etcd2  --network-alias etcd2)
Container etcd3  (--hostname etcd3  --network-alias etcd3)
All in network:  pg-net-{sessionId[:16]}

From inside etcd1:
  ping etcd2            → resolves to 172.18.0.3 (Docker-assigned)
  ping etcd3            → resolves to 172.18.0.4

etcd peer URL:  http://etcd2:2380   ← Docker DNS resolves this
```

Docker's embedded DNS server (127.0.0.11 inside containers) resolves names to the
container IPs within the bridge network. This gives each node a stable hostname that
works for etcd peer URLs without any manual IP management.

### Node naming and env vars

Each node container receives:

| Env var | Example (node 1) | Purpose |
|---|---|---|
| `NODE_NAME` | `etcd1` | The etcd member name. Also the hostname. |
| `NODE_INDEX` | `0` | Zero-based index (0=etcd1, 1=etcd2, 2=etcd3). |
| `CLUSTER_NODES` | `etcd1,etcd2,etcd3` | Passed to configure.sh to build --initial-cluster string. |
| `SESSION_ID` | `{uuid}` | For logging and debugging only. |

### Bootstrap sequence

```
Backend (sessionManager.js):
  1. createClusterNetwork(sessionId)
     SSH: docker network create pg-net-{id[:16]} --driver bridge

  2. Promise.all([
       scheduleClusterNode(sessionId, 0, "etcd1", networkName),
       scheduleClusterNode(sessionId, 1, "etcd2", networkName),
       scheduleClusterNode(sessionId, 2, "etcd3", networkName),
     ])
     All 3 docker run commands fire in parallel.

  3. Promise.all([
       getTaskAddress(etcd1ContainerId),   ← poll docker port
       getTaskAddress(etcd2ContainerId),
       getTaskAddress(etcd3ContainerId),
     ])

  4. updateClusterNodes(sessionId, networkName, nodesArray)
     5. updateSessionStatus(sessionId, 'ready', { nomad_job_id: etcd1ContainerId })

Inside each container (configure.sh, run at startup):
  1. Read $NODE_NAME, $CLUSTER_NODES from environment
  2. Build --initial-cluster string:
       etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
  3. Write /etc/etcd/config.yaml
  4. Start etcd with the generated config

Cluster formation:
  - Each node starts with --initial-cluster-state=new
  - etcd runs Raft leader election: quorum = 2 of 3 nodes
  - Leader elected once 2+ nodes can communicate (via Docker bridge)
  - etcd1 is usually (but not always) elected leader on first boot
  - etcd1 waits for all 3 members to become healthy before emitting
    the terminal_ready sentinel line
```

### etcd startup flags (cluster node)

```bash
etcd \
  --name ${NODE_NAME} \
  --data-dir /var/lib/etcd \
  --listen-client-urls http://0.0.0.0:2379 \
  --advertise-client-urls http://${NODE_NAME}:2379 \
  --listen-peer-urls http://0.0.0.0:2380 \
  --initial-advertise-peer-urls http://${NODE_NAME}:2380 \
  --initial-cluster etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380 \
  --initial-cluster-token etcd-cluster-${SESSION_ID} \
  --initial-cluster-state new
```

Note: `--advertise-client-urls` and `--initial-advertise-peer-urls` use
`${NODE_NAME}` (e.g., `etcd1`) as the hostname. Docker DNS resolves this to the
container's IP from any other container in the same bridge network.

### UI: three node tabs

The frontend renders three terminal tabs, one per node. Each tab opens a separate
WebSocket connection:

```
Tab "etcd1" → WSS /playground/ws/{sessionId}?node=0
Tab "etcd2" → WSS /playground/ws/{sessionId}?node=1
Tab "etcd3" → WSS /playground/ws/{sessionId}?node=2
```

The backend reads `?node=N` and looks up `cluster_nodes[N].ttydPort` from the JSONB
column to proxy to the correct container's ttyd process.

---

## 4. Dynamic Provisioning — Member Add/Remove

The cluster environment ships with helper scripts that teach the two-step etcd
member management protocol. This is a critical concept: you cannot simply start a new
container and have it join — you must first register it with the existing cluster.

### Why two steps are required

etcd uses a strict cluster membership protocol based on Raft. A new node joining an
existing cluster must:

1. Be **registered** with the current leader (step 1: `etcdctl member add`). This
   tells the cluster a new peer is expected and allocates it a member ID.
2. **Start** with `--initial-cluster-state=existing` (step 2: container start). This
   tells etcd not to bootstrap a new cluster but to join the running one using the
   member ID allocated in step 1.

If step 2 uses `--initial-cluster-state=new` instead, etcd treats it as a competing
cluster bootstrap and rejects the join, or worse, causes a split-brain situation.

### etcd-add-node

Adds a fourth node (etcd4) to the running cluster:

```bash
# Step 1: Register with the cluster (run from any existing member terminal)
etcdctl member add etcd4 --peer-urls=http://etcd4:2380

# Output:
# Member 8e9e05c52164694d added to cluster ef37ad9dc622a7c4
# ETCD_NAME="etcd4"
# ETCD_INITIAL_CLUSTER="etcd1=http://etcd1:2380,...,etcd4=http://etcd4:2380"
# ETCD_INITIAL_CLUSTER_STATE="existing"

# Step 2: Start the new container (run from etcd-add-node helper or manually)
docker run -d --rm \
  --network pg-net-{sessionId} \
  --network-alias etcd4 \
  --hostname etcd4 \
  --name pg-{sessionId}-etcd4 \
  -e NODE_NAME=etcd4 \
  -e CLUSTER_NODES=etcd1,etcd2,etcd3,etcd4 \
  -e INITIAL_CLUSTER_STATE=existing \
  chundubabu/pg-etcd-node:latest
```

After step 2, etcd4 contacts the existing members via Raft, receives a snapshot of
the current state, and joins the cluster. `etcdctl member list` will show 4 members.

### etcd-kill-node

Simulates a node crash by stopping a container without graceful shutdown:

```bash
# Stop etcd2 (simulates hard crash)
docker kill pg-{sessionId}-etcd2

# Verify cluster still functions with 2/3 nodes (quorum maintained)
etcdctl put /test/key "still-works"
etcdctl get /test/key

# Check member list — etcd2 shows as unreachable
etcdctl member list
etcdctl endpoint health --cluster
```

Key learning: the cluster remains writable as long as quorum (2 of 3) is available.
Killing a second node causes the cluster to become read-only (no leader can be elected).

### etcd-restore-node

Restarts a previously killed node:

```bash
docker run -d --rm \
  --network pg-net-{sessionId} \
  --network-alias etcd2 \
  --hostname etcd2 \
  --name pg-{sessionId}-etcd2 \
  -e NODE_NAME=etcd2 \
  -e CLUSTER_NODES=etcd1,etcd2,etcd3 \
  -e INITIAL_CLUSTER_STATE=existing \
  chundubabu/pg-etcd-node:latest
```

The restored node contacts the leader, receives a snapshot, and re-syncs its log.
`etcdctl endpoint health --cluster` will show it healthy again.

### etcd-remove-node

Gracefully removes a member from the cluster:

```bash
# Get the member ID
etcdctl member list

# Remove (MEMBER_ID is the hex ID from member list output)
etcdctl member remove {MEMBER_ID}

# Stop the container
docker stop pg-{sessionId}-etcd3
```

After removal, the cluster operates with 2 members. Quorum is now 2/2 — both
remaining nodes must be healthy for writes to succeed.

---

## 5. Cluster Lab Exercises

### Lab 01: Verify cluster health

```bash
# From any node terminal
etcdctl endpoint health --cluster --endpoints=http://etcd1:2379,http://etcd2:2379,http://etcd3:2379
etcdctl endpoint status --cluster --write-out=table \
  --endpoints=http://etcd1:2379,http://etcd2:2379,http://etcd3:2379
etcdctl member list
```

Expected output from `endpoint status`: shows which member is the leader
(IS LEADER = true), the Raft index, and the DB size.

### Lab 02: Leader election

```bash
# Find current leader from status output
# Stop the leader container
docker kill pg-{sessionId}-{leaderName}

# Watch from another node — within 1-2 seconds a new leader is elected
etcdctl endpoint status --cluster --write-out=table \
  --endpoints=http://etcd2:2379,http://etcd3:2379

# Verify writes still work
etcdctl put /test/after-failover "ok" --endpoints=http://etcd2:2379
```

Key learning: etcd's default election timeout is 1 second (heartbeat 100ms). Leader
election after a crash completes in 1–2 seconds. Clients experience only a brief
write outage.

### Lab 03: Distributed watch across nodes

```bash
# Terminal etcd1: put a key
etcdctl put /notifications/event "ticket-123"

# Terminal etcd2: watch the same key (set up before the put above)
etcdctl watch /notifications/ --prefix --endpoints=http://etcd2:2379
```

Key learning: writes go to the leader and are replicated to followers before
acknowledgement. Watches on any node receive events for changes written to any node.

### Lab 04: Split-brain prevention

```bash
# Kill two nodes (etcd2 and etcd3) — lose quorum
docker kill pg-{sessionId}-etcd2 pg-{sessionId}-etcd3

# Try to write to remaining node (etcd1)
etcdctl put /test/no-quorum "attempt" --endpoints=http://etcd1:2379

# Expected: request times out or returns "etcdserver: leader changed" error
# etcd refuses to accept writes without quorum — prevents data divergence
```

Key learning: etcd chooses consistency over availability (CP in CAP theorem). With
fewer than quorum members, the cluster halts writes to prevent split-brain data
corruption.

### Lab 05: Snapshot and disaster recovery

```bash
# Take snapshot from any healthy member
etcdctl snapshot save /tmp/cluster-backup.db --endpoints=http://etcd1:2379
etcdctl snapshot status /tmp/cluster-backup.db --write-out=table

# Simulate total cluster loss
docker kill pg-{sessionId}-etcd1 pg-{sessionId}-etcd2 pg-{sessionId}-etcd3

# Restore (must be done offline, before starting any etcd)
# Each member needs a separate restore with its own data dir
etcdctl snapshot restore /tmp/cluster-backup.db \
  --name etcd1 \
  --data-dir /var/lib/etcd-recovered \
  --initial-cluster "etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380" \
  --initial-cluster-token etcd-cluster-recovered \
  --initial-advertise-peer-urls http://etcd1:2380
```

Key learning: disaster recovery from a snapshot requires restoring each member
independently from the same snapshot file, then starting them simultaneously so they
form a new cluster with the restored data.
