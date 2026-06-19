#!/bin/bash
# Lab 01: Cluster Health and Status
# Teaches: how to inspect a 3-node etcd cluster — members, leader, DB size,
#          and the Raft consensus basics.
# Run: bash /home/learner/labs/01-cluster-health.sh

set -e

echo "=== Lab 01: Cluster Health and Status ==="
echo ""
echo "You are in a 3-node etcd cluster (etcd1, etcd2, etcd3)."
echo "These labs must be run from the PRIMARY node (etcd1)."
echo ""

# --------------------------------------------------
echo "--- Step 1: Check cluster health ---"
echo "A healthy cluster needs a quorum: (N/2)+1 nodes = 2 of 3."
echo ""
etcdctl endpoint health --cluster
echo ""

# --------------------------------------------------
echo "--- Step 2: Endpoint status (who is the leader?) ---"
etcdctl endpoint status --cluster -w table
echo ""
echo "IS LEADER column: the current Raft leader handles all writes."
echo "All nodes can serve reads (by default, linearized reads go through leader too)."
echo ""

# --------------------------------------------------
echo "--- Step 3: Member list ---"
etcdctl member list -w table
echo ""
echo "MEMBER ID    — permanent unique identifier (persists across restarts)"
echo "STATUS       — started = active, unstarted = registered but not yet joined"
echo "PEER ADDRS   — how this member is reached by other members (Raft)"
echo "CLIENT ADDRS — how clients connect to this member"
echo ""

# --------------------------------------------------
echo "--- Step 4: Write a test key and verify it on all nodes ---"
echo "Writing to cluster (goes to leader, replicated to all followers)..."
etcdctl put /cluster/test "hello-from-lab01"
echo ""

echo "Reading back from all endpoints individually:"
for node in etcd1 etcd2 etcd3; do
  VAL=$(ETCDCTL_ENDPOINTS="http://${node}:2379" etcdctl get /cluster/test --print-value-only 2>/dev/null || echo "(unreachable)")
  echo "  ${node}: ${VAL}"
done
echo ""
echo "All nodes return the same value — that's Raft consensus."
echo ""

# --------------------------------------------------
echo "--- Step 5: DB size and revision ---"
etcdctl endpoint status --cluster -w json | \
  jq '.[] | {endpoint: .Endpoint, revision: .Status.header.revision, db_size_mb: (.Status.dbSize / 1024 / 1024 | round)}'
echo ""

# --------------------------------------------------
echo "--- Step 6: etcd architecture (ASCII) ---"
cat << 'ARCH'

  ┌─────────────────────────────────────────────────────────┐
  │                    etcd Cluster (3 nodes)                │
  │                                                         │
  │   ┌──────────┐   Raft   ┌──────────┐  Raft  ┌────────┐ │
  │   │  etcd1   │◄────────►│  etcd2   │◄──────►│ etcd3  │ │
  │   │ (leader) │  2380    │(follower)│  2380   │(follow)│ │
  │   └────┬─────┘          └────┬─────┘         └───┬────┘ │
  │        │ 2379                │ 2379               │ 2379 │
  │        └─────────────────────┴────────────────────┘      │
  │                         clients                          │
  └─────────────────────────────────────────────────────────┘

  Raft guarantees:
    - All writes go through the leader
    - A write is committed only after a quorum (2/3) acknowledges it
    - If the leader fails, remaining nodes elect a new leader in ~150-300ms

ARCH

# --------------------------------------------------
echo "--- Cleanup ---"
etcdctl del /cluster/test > /dev/null

echo "✓ Lab 01 complete! Next: bash /home/learner/labs/02-leader-election.sh"
