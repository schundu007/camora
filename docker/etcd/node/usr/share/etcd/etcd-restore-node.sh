#!/bin/bash
# etcd-restore-node.sh — restart a killed etcd process on this container.
# Used after etcd-kill-node to bring the node back up.
#
# Usage: etcd-restore-node
#   Run this on the node that was killed.

set -e

NODE_NAME=${NODE_NAME:-etcd1}
LOG=/var/log/etcd.log

echo "=== Restoring node '${NODE_NAME}' ==="
echo ""

# Check if etcd is already running
if pgrep -f "etcd --config-file" > /dev/null 2>&1; then
  echo "etcd is already running on this node."
  pgrep -a etcd
  exit 0
fi

# Config must exist (written by configure.sh at startup)
if [ ! -f /etc/etcd/config.yaml ]; then
  echo "ERROR: /etc/etcd/config.yaml not found." >&2
  echo "Run /usr/share/etcd/configure.sh first." >&2
  exit 1
fi

echo "Starting etcd with existing data dir (member will re-join cluster)..."
echo ""

etcd --config-file /etc/etcd/config.yaml >> "${LOG}" 2>&1 &
ETCD_PID=$!
echo "${ETCD_PID}" > /var/run/etcd-${NODE_NAME}.pid

echo "etcd started (pid=${ETCD_PID})."
echo "Waiting for local health..."

LOCAL_ENDPOINT="http://127.0.0.1:2379"
ATTEMPTS=0
until ETCDCTL_ENDPOINTS="${LOCAL_ENDPOINT}" etcdctl endpoint health > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "${ATTEMPTS}" -gt 60 ]; then
    echo "ERROR: node did not recover after 60 seconds" >&2
    tail -20 "${LOG}" >&2
    exit 1
  fi
  sleep 1
done

echo ""
echo "Node '${NODE_NAME}' is back online."
echo ""
echo "Cluster status:"
etcdctl endpoint status --cluster -w table
echo ""
echo "✓ Restore complete."
