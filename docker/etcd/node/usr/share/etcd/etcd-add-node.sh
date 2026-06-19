#!/bin/bash
# etcd-add-node.sh — register a new member with the running cluster.
# This is the educational "dynamic provisioning" helper.
#
# Usage: etcd-add-node <node-name>
# Example: etcd-add-node etcd4
#
# Run this from ANY existing cluster node.
# The new node must start with INITIAL_CLUSTER_STATE=existing.

set -e

NEW_NODE=${1:-etcd4}

if [ -z "${NEW_NODE}" ]; then
  echo "Usage: etcd-add-node <node-name>" >&2
  exit 1
fi

echo "=== Adding node '${NEW_NODE}' to the cluster ==="
echo ""
echo "Step 1: Listing current members..."
etcdctl member list -w table
echo ""

echo "Step 2: Registering ${NEW_NODE} as a member (peer URL: http://${NEW_NODE}:2380)..."
etcdctl member add "${NEW_NODE}" --peer-urls="http://${NEW_NODE}:2380"
echo ""

echo "Step 3: Updated member list:"
etcdctl member list -w table
echo ""

echo "Step 4: Instructions for starting the new node:"
echo ""
echo "  The backend will provision it automatically if using the Camora UI."
echo "  Or start manually with:"
echo ""
echo "  docker run -d \\"
echo "    --network <your-network> \\"
echo "    -e NODE_NAME=${NEW_NODE} \\"
echo "    -e CLUSTER_NODES=etcd1,etcd2,etcd3,${NEW_NODE} \\"
echo "    -e INITIAL_CLUSTER_STATE=existing \\"
echo "    chundubabu/pg-etcd-node"
echo ""
echo "  IMPORTANT: INITIAL_CLUSTER_STATE=existing is required for joining nodes."
echo "  The initial-cluster value must include ALL members (existing + new)."
echo ""
echo "✓ Registration complete. Start the new container now."
