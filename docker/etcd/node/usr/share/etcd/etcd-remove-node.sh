#!/bin/bash
# etcd-remove-node.sh — gracefully remove a member from the cluster.
# Run this from any healthy node to remove a permanently failed member.
#
# Usage: etcd-remove-node <node-name>
# Example: etcd-remove-node etcd3

set -e

TARGET_NODE=${1:-}

if [ -z "${TARGET_NODE}" ]; then
  echo "Usage: etcd-remove-node <node-name>" >&2
  echo ""
  echo "Current members:"
  etcdctl member list -w table
  exit 1
fi

echo "=== Gracefully removing node '${TARGET_NODE}' from cluster ==="
echo ""

echo "Current members:"
etcdctl member list -w table
echo ""

# Find member ID by name
MEMBER_ID=$(etcdctl member list -w json | jq -r ".members[] | select(.name == \"${TARGET_NODE}\") | .ID | tostring | ltrimstr(\"0x\") | tonumber | tostring")

# Fallback: try hex format
if [ -z "${MEMBER_ID}" ]; then
  MEMBER_ID=$(etcdctl member list | grep "${TARGET_NODE}" | awk '{print $1}' | tr -d ',')
fi

if [ -z "${MEMBER_ID}" ]; then
  echo "ERROR: Could not find member named '${TARGET_NODE}'" >&2
  echo "Check the name with: etcdctl member list" >&2
  exit 1
fi

echo "Found member '${TARGET_NODE}' with ID: ${MEMBER_ID}"
echo "Removing..."
etcdctl member remove "${MEMBER_ID}"
echo ""

echo "Updated member list:"
etcdctl member list -w table
echo ""

echo "✓ Node '${TARGET_NODE}' removed from cluster."
echo "  You can now stop or destroy the '${TARGET_NODE}' container safely."
