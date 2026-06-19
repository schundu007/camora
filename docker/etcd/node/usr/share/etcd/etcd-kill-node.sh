#!/bin/bash
# etcd-kill-node.sh — simulate a node crash (fault injection).
# Sends SIGKILL to the etcd process on THIS container.
#
# Usage (run on the node you want to kill):
#   etcd-kill-node
#
# To kill a remote node from another node, SSH into it or use the Camora UI.

set -e

TARGET=${NODE_NAME:-$(hostname)}

echo "=== Simulating crash of node '${TARGET}' ==="
echo ""
echo "This sends SIGKILL to the etcd process on THIS container."
echo "The container stays running (only the etcd process dies)."
echo ""

# Find etcd PID from pidfile or pgrep
PID=""
if [ -f "/var/run/etcd-${TARGET}.pid" ]; then
  PID=$(cat "/var/run/etcd-${TARGET}.pid")
fi

if [ -z "${PID}" ]; then
  PID=$(pgrep -f "etcd --config-file" 2>/dev/null || true)
fi

if [ -z "${PID}" ]; then
  echo "Could not find etcd process on this node." >&2
  echo "Is etcd still running? Check: pgrep -a etcd" >&2
  exit 1
fi

echo "Killing etcd pid=${PID} on node '${TARGET}'..."
kill -9 "${PID}"
echo ""
echo "Node '${TARGET}' crashed."
echo ""
echo "Watch leader re-election from another node:"
echo "  watch -n1 'etcdctl endpoint status --cluster -w table'"
echo ""
echo "The cluster can tolerate 1 failed node (3-node quorum = 2 nodes needed)."
echo ""
echo "To restart this node:"
echo "  etcd-restore-node"
