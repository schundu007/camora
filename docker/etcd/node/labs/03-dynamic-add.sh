#!/bin/bash
# Lab 03: Dynamic Member Add — grow the cluster at runtime
# Teaches: how to add a 4th node without downtime using etcdctl member add.
# Run: bash /home/learner/labs/03-dynamic-add.sh

set -e

echo "=== Lab 03: Dynamic Member Add (Scale-Out) ==="
echo ""
echo "etcd supports adding new members without restarting the cluster."
echo "This is how you scale from 3 to 5 nodes for higher availability."
echo ""

# --------------------------------------------------
echo "--- Step 1: Current cluster state ---"
etcdctl member list -w table
echo ""
etcdctl endpoint status --cluster -w table
echo ""

# --------------------------------------------------
echo "--- Step 2: Register etcd4 with the cluster ---"
echo "IMPORTANT: etcdctl member add tells the EXISTING cluster about the new peer."
echo "The new node must not be started yet at this point."
echo ""

echo "Registering etcd4..."
etcdctl member add etcd4 --peer-urls=http://etcd4:2380
echo ""

echo "Member list after registration (etcd4 shows as 'unstarted'):"
etcdctl member list -w table
echo ""

# --------------------------------------------------
echo "--- Step 3: What the new node needs to know ---"
echo "The new node (etcd4) must start with:"
echo ""
echo "  NODE_NAME=etcd4"
echo "  CLUSTER_NODES=etcd1,etcd2,etcd3,etcd4"
echo "  INITIAL_CLUSTER_STATE=existing"
echo ""
echo "INITIAL_CLUSTER_STATE=existing tells etcd4:"
echo "  - Do NOT initialize a new cluster"
echo "  - Join the running cluster identified by the --initial-cluster members"
echo "  - Sync data from existing members via Raft snapshot"
echo ""

# --------------------------------------------------
echo "--- Step 4: Verify initial-cluster string that etcd4 needs ---"
INITIAL_CLUSTER=$(etcdctl member list -w json | \
  jq -r '.members[] | "\(.name // "unstarted")=\(.peerURLs[0])"' | \
  tr '\n' ',' | sed 's/,$//')
echo "INITIAL_CLUSTER for etcd4's config:"
echo "  ${INITIAL_CLUSTER}"
echo ""

# --------------------------------------------------
echo "--- Step 5: Remove etcd4 registration (cleanup — it's not actually running) ---"
echo "Since etcd4 container isn't provisioned in this lab, we remove the registration."
MEMBER_ID=$(etcdctl member list -w json | \
  jq -r '.members[] | select(.name == "" or .name == null or .peerURLs[0] == "http://etcd4:2380") | .ID')

if [ -n "${MEMBER_ID}" ]; then
  etcdctl member remove "${MEMBER_ID}" > /dev/null
  echo "Removed etcd4 registration (${MEMBER_ID})."
else
  # Try by peer URL
  etcdctl member list | grep "etcd4" | awk '{print $1}' | tr -d ',' | while read -r id; do
    etcdctl member remove "${id}" > /dev/null && echo "Removed member ${id}."
  done
fi
echo ""

echo "Member list restored to 3 nodes:"
etcdctl member list -w table
echo ""

# --------------------------------------------------
echo "--- Step 6: When to add members ---"
echo ""
echo "  3 nodes  → can tolerate 1 failure"
echo "  5 nodes  → can tolerate 2 failures"
echo "  7 nodes  → can tolerate 3 failures (rarely used, too much latency)"
echo ""
echo "  Best practice: always keep cluster size ODD (quorum math)."
echo "  Even sizes (4, 6) offer NO extra fault tolerance over the next odd size down."
echo ""
echo "  Rule of thumb: 3 nodes for most workloads, 5 for multi-region HA."
echo ""

echo "✓ Lab 03 complete! Next: bash /home/learner/labs/04-fault-injection.sh"
