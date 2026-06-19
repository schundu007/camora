#!/bin/bash
# Lab 02: Leader Election — Raft and etcd's election API
# Teaches: how etcd election API works, how Raft leader changes happen,
#          and how to observe them.
# Run: bash /home/learner/labs/02-leader-election.sh

set -e

echo "=== Lab 02: Leader Election ==="
echo ""
echo "etcd uses Raft for consensus. One node is the leader at all times."
echo "The leader receives all writes and replicates them to followers."
echo "If the leader fails, remaining nodes elect a new one automatically."
echo ""

# --------------------------------------------------
echo "--- Step 1: Identify current leader ---"
LEADER=$(etcdctl endpoint status --cluster -w json | \
  jq -r '.[] | select(.Status.leader == .Status.header.member_id) | .Endpoint')
echo "Current leader endpoint: ${LEADER}"
echo ""
etcdctl endpoint status --cluster -w table
echo ""

# --------------------------------------------------
echo "--- Step 2: Application-level leader election (etcd election API) ---"
echo "etcd provides a higher-level election primitive on top of leases."
echo "This is what distributed systems (like Kubernetes controller-manager) use."
echo ""

echo "Starting an election campaign for 'my-service' on this node..."
echo "(Runs for 5 seconds, then releases)"

# Campaign in background, kill after 5s
etcdctl elect my-service "etcd1-is-primary" &
ELECT_PID=$!
sleep 2

echo ""
echo "While elected, try campaigning from another session:"
echo "  From etcd2 terminal: etcdctl elect my-service 'etcd2-wants-primary'"
echo "  (it will block until etcd1 releases)"
echo ""

sleep 3
kill "${ELECT_PID}" 2>/dev/null || true
wait "${ELECT_PID}" 2>/dev/null || true
echo ""
echo "Election released by etcd1."
echo ""

# --------------------------------------------------
echo "--- Step 3: Use etcdctl elect observe to watch leader changes ---"
echo "Observing 'my-service' election (3 second window)..."

# Run a campaigner
etcdctl elect my-service "primary-node" &
CAMP_PID=$!
sleep 1

# Observe
timeout 3 etcdctl elect --observe my-service 2>/dev/null || true

kill "${CAMP_PID}" 2>/dev/null || true
wait "${CAMP_PID}" 2>/dev/null || true
echo ""

# --------------------------------------------------
echo "--- Step 4: How to observe Raft leader election (real crash) ---"
echo "To trigger a real Raft leader election:"
echo ""
echo "  1. From etcd2 or etcd3 terminal, run:"
echo "       etcd-kill-node"
echo "     (This kills etcd2's etcd process)"
echo ""
echo "  2. From etcd1 or etcd3, watch the re-election:"
echo "       watch -n1 'etcdctl endpoint status --cluster -w table'"
echo ""
echo "  3. A new leader emerges within ~300ms."
echo "  4. Restore with: etcd-restore-node  (run on etcd2)"
echo ""

# --------------------------------------------------
echo "--- Step 5: Raft term ---"
echo "Every leader election increments the Raft 'term'."
echo "A node with a stale term will reject requests from that term."
echo ""
etcdctl endpoint status --cluster -w json | \
  jq '.[] | {endpoint: .Endpoint, raft_term: .Status.raftTerm, leader: .Status.leader}'
echo ""

echo "✓ Lab 02 complete! Next: bash /home/learner/labs/03-dynamic-add.sh"
