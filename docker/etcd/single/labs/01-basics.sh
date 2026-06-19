#!/bin/bash
# Lab 01: etcd Basics — put, get, delete, list
# Teaches: the fundamental KV operations of etcd.
# Run: bash /home/learner/labs/01-basics.sh

set -e

echo "=== Lab 01: etcd Key-Value Basics ==="
echo ""
echo "etcd is a distributed key-value store. Keys are arbitrary strings;"
echo "values are bytes. Let's explore the four basic operations."
echo ""

# --------------------------------------------------
echo "--- Step 1: Store keys ---"
etcdctl put /myapp/config/env production
etcdctl put /myapp/config/version "1.0.0"
etcdctl put /myapp/config/max_connections "100"
etcdctl put /myapp/users/alice "active"
etcdctl put /myapp/users/bob   "suspended"
echo "(5 keys written)"
echo ""

# --------------------------------------------------
echo "--- Step 2: Read a single key ---"
etcdctl get /myapp/config/env
echo ""

# --------------------------------------------------
echo "--- Step 3: Read with --print-value-only (just the value) ---"
VALUE=$(etcdctl get /myapp/config/env --print-value-only)
echo "Value only: ${VALUE}"
echo ""

# --------------------------------------------------
echo "--- Step 4: List all keys under a prefix ---"
echo "Keys under /myapp/config/:"
etcdctl get --prefix /myapp/config/
echo ""

echo "Keys under /myapp/ (all):"
etcdctl get --prefix /myapp/
echo ""

# --------------------------------------------------
echo "--- Step 5: List only keys (no values) ---"
etcdctl get --prefix /myapp/ --keys-only
echo ""

# --------------------------------------------------
echo "--- Step 6: Delete a key ---"
etcdctl del /myapp/users/alice
echo "(deleted /myapp/users/alice)"
echo ""

# --------------------------------------------------
echo "--- Step 7: Confirm deletion ---"
RESULT=$(etcdctl get /myapp/users/alice --print-value-only 2>/dev/null || true)
if [ -z "${RESULT}" ]; then
  echo "Confirmed: /myapp/users/alice is gone."
else
  echo "Unexpected: key still exists with value '${RESULT}'"
fi
echo ""

# --------------------------------------------------
echo "--- Step 8: Delete by prefix ---"
etcdctl del --prefix /myapp/config/
echo "(deleted all /myapp/config/* keys)"
echo ""

echo "Remaining keys:"
etcdctl get --prefix /myapp/ --keys-only
echo ""

# --------------------------------------------------
echo "--- Step 9: Check revision (etcd's global version counter) ---"
etcdctl endpoint status -w table
echo ""
echo "Every write increments the cluster revision. This is used for watch and transactions."
echo ""

echo "✓ Lab 01 complete! Next: bash /home/learner/labs/02-leases-ttl.sh"
