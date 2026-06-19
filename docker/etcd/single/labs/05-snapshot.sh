#!/bin/bash
# Lab 05: Snapshot and Restore — backup and disaster recovery
# Teaches: etcdutl snapshot save/restore, data integrity verification.
# Run: bash /home/learner/labs/05-snapshot.sh

set -e

SNAP_DIR=/tmp/etcd-snapshots
mkdir -p "${SNAP_DIR}"

echo "=== Lab 05: Snapshot and Restore ==="
echo ""
echo "etcd snapshots capture the full database state at a point in time."
echo "They are used for backup, disaster recovery, and cluster bootstrapping."
echo ""

# --------------------------------------------------
echo "--- Step 1: Seed some data ---"
etcdctl put /app/service/name    "payments-service"
etcdctl put /app/service/version "2.3.1"
etcdctl put /app/service/region  "us-east-1"
etcdctl put /app/config/timeout  "30s"
etcdctl put /app/config/retries  "3"
echo "(5 keys written)"
echo ""

# --------------------------------------------------
echo "--- Step 2: Take a snapshot ---"
SNAP_FILE="${SNAP_DIR}/etcd-$(date +%Y%m%d-%H%M%S).db"
etcdctl snapshot save "${SNAP_FILE}"
echo "Snapshot saved to: ${SNAP_FILE}"
ls -lh "${SNAP_FILE}"
echo ""

# --------------------------------------------------
echo "--- Step 3: Verify snapshot integrity ---"
etcdutl snapshot status "${SNAP_FILE}" -w table
echo ""

# --------------------------------------------------
echo "--- Step 4: Simulate data loss (delete all app keys) ---"
echo "Deleting all /app/* keys to simulate accidental deletion..."
etcdctl del --prefix /app/ > /dev/null
echo "Keys remaining under /app/:"
COUNT=$(etcdctl get --prefix /app/ --keys-only | wc -l)
echo "  ${COUNT} keys (expected 0)"
echo ""

# --------------------------------------------------
echo "--- Step 5: Restore from snapshot to a new data directory ---"
RESTORE_DIR=/tmp/etcd-restore-data
rm -rf "${RESTORE_DIR}"

etcdutl snapshot restore "${SNAP_FILE}" \
  --name=single \
  --initial-cluster=single=http://127.0.0.1:2380 \
  --initial-cluster-token=camora-etcd-single-restored \
  --initial-advertise-peer-urls=http://127.0.0.1:2380 \
  --data-dir="${RESTORE_DIR}"

echo "Restore complete. Data directory: ${RESTORE_DIR}"
ls -lh "${RESTORE_DIR}/member/snap/"
echo ""

echo "NOTE: In a real cluster, you would:"
echo "  1. Stop etcd on all nodes"
echo "  2. Run etcdutl snapshot restore on each node (with different --name and peer URLs)"
echo "  3. Replace the existing data directory with the restored one"
echo "  4. Restart etcd with --initial-cluster-state=existing"
echo ""

# --------------------------------------------------
echo "--- Step 6: Snapshot status in JSON ---"
etcdutl snapshot status "${SNAP_FILE}" -w json | jq .
echo ""

# --------------------------------------------------
echo "--- Step 7: Compact + defrag (reduce DB file size) ---"
echo "Current DB size:"
etcdctl endpoint status -w table
echo ""

REV=$(etcdctl endpoint status -w json | jq '.[0].Status.header.revision')
echo "Compacting to revision ${REV}..."
etcdctl compact "${REV}" > /dev/null
echo "Defragmenting..."
etcdctl defrag
echo ""
echo "DB size after compact+defrag:"
etcdctl endpoint status -w table
echo ""

# --------------------------------------------------
echo "--- Cleanup ---"
rm -rf "${SNAP_DIR}" "${RESTORE_DIR}"
etcdctl del --prefix /app/ > /dev/null 2>&1 || true

echo "✓ Lab 05 complete! You have finished all single-node labs."
echo ""
echo "Key takeaways:"
echo "  - etcdctl snapshot save  → online backup (no downtime)"
echo "  - etcdutl snapshot status → verify integrity before restore"
echo "  - etcdutl snapshot restore → rebuilds data dir from snapshot"
echo "  - etcdctl compact + defrag → reclaim space after deletes"
