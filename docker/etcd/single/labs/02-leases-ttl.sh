#!/bin/bash
# Lab 02: Leases and TTL — ephemeral keys, service heartbeat pattern
# Teaches: how Kubernetes uses etcd leases for node heartbeats and leader locks.
# Run: bash /home/learner/labs/02-leases-ttl.sh

set -e

echo "=== Lab 02: Leases and Time-To-Live (TTL) ==="
echo ""
echo "A lease is a time-bounded token. Keys attached to a lease"
echo "expire automatically when the lease expires (no TTL on the lease)."
echo "This is how Kubernetes keeps track of which nodes are alive."
echo ""

# --------------------------------------------------
echo "--- Step 1: Grant a lease (10 seconds) ---"
LEASE_ID=$(etcdctl lease grant 10 | awk '{print $2}')
echo "Lease granted: ${LEASE_ID}"
echo ""

# --------------------------------------------------
echo "--- Step 2: Attach a key to the lease ---"
etcdctl put /services/worker-1 '{"status":"healthy","pid":42}' --lease="${LEASE_ID}"
echo ""

# --------------------------------------------------
echo "--- Step 3: Read the key (with lease info) ---"
etcdctl get /services/worker-1 -w json | jq '{key: (.kvs[0].key | @base64d), value: (.kvs[0].value | @base64d), lease: (.kvs[0].lease | tostring)}'
echo ""

# --------------------------------------------------
echo "--- Step 4: Inspect lease TTL ---"
etcdctl lease timetolive "${LEASE_ID}"
echo ""

# --------------------------------------------------
echo "--- Step 5: Keep-alive (simulate a heartbeat) ---"
echo "Sending one keep-alive ping (extends TTL back to 10s)..."
etcdctl lease keep-alive --once "${LEASE_ID}"
echo ""
etcdctl lease timetolive "${LEASE_ID}"
echo ""

# --------------------------------------------------
echo "--- Step 6: Grant a SHORT lease (5 seconds) and watch it expire ---"
SHORT_LEASE=$(etcdctl lease grant 5 | awk '{print $2}')
etcdctl put /services/worker-2 '{"status":"starting"}' --lease="${SHORT_LEASE}"
echo "Key written with 5-second lease (${SHORT_LEASE})."
echo "Waiting 6 seconds for the lease to expire..."
sleep 6

echo "Attempting to read expired key:"
RESULT=$(etcdctl get /services/worker-2 --print-value-only 2>/dev/null || true)
if [ -z "${RESULT}" ]; then
  echo "  Key is gone — lease expired and etcd cleaned it up automatically."
else
  echo "  Key still exists: ${RESULT}"
fi
echo ""

# --------------------------------------------------
echo "--- Step 7: Revoke a lease manually ---"
echo "Revoking original lease ${LEASE_ID}..."
etcdctl lease revoke "${LEASE_ID}"

echo "Attempting to read key after revoke:"
RESULT=$(etcdctl get /services/worker-1 --print-value-only 2>/dev/null || true)
if [ -z "${RESULT}" ]; then
  echo "  Key is gone — revoked lease deleted all attached keys."
else
  echo "  Key still exists: ${RESULT}"
fi
echo ""

# --------------------------------------------------
echo "--- Step 8: Real-world pattern — session lock ---"
echo "Service lock example (60s lease, then immediately revoked):"
LOCK_LEASE=$(etcdctl lease grant 60 | awk '{print $2}')
etcdctl put /locks/primary-scheduler "owned-by:node-A" --lease="${LOCK_LEASE}"
echo "Lock acquired by node-A."
echo "If node-A crashes without revoking, the lock expires in 60s automatically."
etcdctl lease revoke "${LOCK_LEASE}"
echo "Lock released."
echo ""

echo "✓ Lab 02 complete! Next: bash /home/learner/labs/03-transactions.sh"
