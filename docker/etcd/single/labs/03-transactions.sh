#!/bin/bash
# Lab 03: Transactions (compare-and-swap) — atomic conditional writes
# Teaches: etcd's txn primitive, optimistic locking, and leader election pattern.
# Run: bash /home/learner/labs/03-transactions.sh

set -e

echo "=== Lab 03: Transactions (Compare-and-Swap) ==="
echo ""
echo "etcd transactions are if/then/else blocks that execute atomically."
echo "They are the foundation of distributed locks and leader election."
echo "Syntax:  etcdctl txn << EOF"
echo "           <compare>"
echo "           <newline>"
echo "           <success ops>"
echo "           <newline>"
echo "           <failure ops>"
echo "         EOF"
echo ""

# --------------------------------------------------
echo "--- Step 1: Simple CAS — write only if key does not exist ---"
echo "Trying to claim the leader key (should SUCCEED — key is empty):"

etcdctl txn << 'TXN1'
version("/election/leader") = "0"

put /election/leader "node-A"

put /election/candidate "node-A"
TXN1
echo ""

etcdctl get /election/leader
echo ""

# --------------------------------------------------
echo "--- Step 2: Same CAS again — should FAIL now (key exists) ---"
echo "Trying to claim the leader key again (should FAIL — key has version > 0):"

etcdctl txn << 'TXN2'
version("/election/leader") = "0"

put /election/leader "node-B"

put /election/rejected-candidates "node-B"
TXN2
echo ""

echo "Current leader (still node-A):"
etcdctl get /election/leader --print-value-only
echo ""

echo "Rejected candidates (node-B was placed here by failure branch):"
etcdctl get /election/rejected-candidates --print-value-only
echo ""

# --------------------------------------------------
echo "--- Step 3: Compare by value ---"
etcdctl put /config/feature-flag "disabled"

echo "Enable feature-flag only if it is currently 'disabled':"
etcdctl txn << 'TXN3'
value("/config/feature-flag") = "disabled"

put /config/feature-flag "enabled"

put /config/feature-flag-error "already-enabled"
TXN3
echo ""
echo "feature-flag is now:"
etcdctl get /config/feature-flag --print-value-only
echo ""

# --------------------------------------------------
echo "--- Step 4: Multi-key atomic update ---"
echo "Atomically transfer a token between two service slots:"
etcdctl put /slots/A "token-xyz"
etcdctl put /slots/B ""

etcdctl txn << 'TXN4'
value("/slots/A") = "token-xyz"

put /slots/A ""
put /slots/B "token-xyz"

put /slots/error "transfer failed"
TXN4
echo ""
echo "Slot A (should be empty):"
etcdctl get /slots/A --print-value-only || echo "(empty)"
echo "Slot B (should have token-xyz):"
etcdctl get /slots/B --print-value-only
echo ""

# --------------------------------------------------
echo "--- Step 5: Mod revision compare (optimistic locking) ---"
echo "Get current mod revision of a key:"
etcdctl put /counter "10"
MOD_REV=$(etcdctl get /counter -w json | jq '.kvs[0].mod_revision')
echo "Current mod_revision: ${MOD_REV}"
echo ""

echo "Update counter only if it hasn't changed since we read it:"
etcdctl txn << TXN5
mod("/counter") = "${MOD_REV}"

put /counter "11"

put /counter-conflict "detected"
TXN5
echo ""
echo "Counter (should be 11):"
etcdctl get /counter --print-value-only
echo ""

# --------------------------------------------------
echo "--- Cleanup ---"
etcdctl del --prefix /election/ > /dev/null
etcdctl del --prefix /config/  > /dev/null
etcdctl del --prefix /slots/   > /dev/null
etcdctl del /counter > /dev/null
etcdctl del /counter-conflict > /dev/null

echo "✓ Lab 03 complete! Next: bash /home/learner/labs/04-watch.sh"
