#!/bin/bash
# Lab 05: Cluster Snapshot and Restore
# Teaches: backing up a multi-node cluster, and the full cluster restore procedure.
# Run from etcd1: bash /home/learner/labs/05-snapshot-restore.sh

set -e

SNAP_DIR=/tmp/etcd-cluster-snapshots
mkdir -p "${SNAP_DIR}"

echo "=== Lab 05: Cluster Snapshot and Restore ==="
echo ""
echo "In a cluster, snapshots are taken from a SINGLE node's client endpoint."
echo "The snapshot captures the full committed database state."
echo "Restore requires stopping ALL nodes and rebuilding their data directories."
echo ""

# --------------------------------------------------
echo "--- Step 1: Seed data across the cluster ---"
etcdctl put /snap-lab/service/auth    '{"host":"auth.internal","port":8080}'
etcdctl put /snap-lab/service/billing '{"host":"billing.internal","port":8081}'
etcdctl put /snap-lab/config/timeout  "45s"
etcdctl put /snap-lab/config/replicas "3"
echo "(4 keys written, replicated to all 3 nodes)"
echo ""

# --------------------------------------------------
echo "--- Step 2: Take snapshot from this node ---"
SNAP_FILE="${SNAP_DIR}/cluster-$(date +%Y%m%d-%H%M%S).db"
echo "Snapshotting from ${NODE_NAME:-etcd1}..."
etcdctl snapshot save "${SNAP_FILE}"
echo ""
ls -lh "${SNAP_FILE}"
echo ""

# --------------------------------------------------
echo "--- Step 3: Verify snapshot ---"
etcdutl snapshot status "${SNAP_FILE}" -w table
echo ""

# --------------------------------------------------
echo "--- Step 4: Inspect snapshot contents (read-only mount) ---"
INSPECT_DIR=/tmp/etcd-inspect
rm -rf "${INSPECT_DIR}"

etcdutl snapshot restore "${SNAP_FILE}" \
  --name=inspect \
  --initial-cluster=inspect=http://127.0.0.1:12380 \
  --initial-cluster-token=inspect-token \
  --initial-advertise-peer-urls=http://127.0.0.1:12380 \
  --data-dir="${INSPECT_DIR}" > /dev/null 2>&1

echo "Starting temporary etcd from snapshot to inspect contents..."
etcd \
  --name=inspect \
  --data-dir="${INSPECT_DIR}" \
  --listen-client-urls=http://127.0.0.1:12379 \
  --advertise-client-urls=http://127.0.0.1:12379 \
  --listen-peer-urls=http://127.0.0.1:12380 \
  >> /tmp/etcd-inspect.log 2>&1 &
INSPECT_PID=$!

sleep 2

echo "Keys in snapshot:"
ETCDCTL_ENDPOINTS=http://127.0.0.1:12379 \
  etcdctl get --prefix /snap-lab/ --keys-only 2>/dev/null || true
echo ""

kill "${INSPECT_PID}" 2>/dev/null || true
wait "${INSPECT_PID}" 2>/dev/null || true
rm -rf "${INSPECT_DIR}" /tmp/etcd-inspect.log

# --------------------------------------------------
echo "--- Step 5: Full cluster restore procedure (documentation) ---"
cat << 'PROC'

  FULL CLUSTER RESTORE — Step by Step
  =====================================

  1. Stop ALL etcd nodes:
       On each node: kill $(pgrep etcd)

  2. Distribute the snapshot to all nodes:
       scp cluster-YYYYMMDD.db root@etcd2:/tmp/
       scp cluster-YYYYMMDD.db root@etcd3:/tmp/

  3. On EACH node, run etcdutl snapshot restore with that node's identity:

     Node etcd1:
       etcdutl snapshot restore /tmp/cluster.db \
         --name=etcd1 \
         --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380 \
         --initial-cluster-token=camora-etcd-cluster-restored \
         --initial-advertise-peer-urls=http://etcd1:2380 \
         --data-dir=/var/lib/etcd/etcd1

     Node etcd2 (same command, different --name and --initial-advertise-peer-urls):
       etcdutl snapshot restore /tmp/cluster.db \
         --name=etcd2 ...

  4. Restart each etcd with INITIAL_CLUSTER_STATE=existing (or just restart normally —
     the restored data dir already contains the correct cluster membership).

  5. Verify: etcdctl endpoint health --cluster

  KEY POINT: etcdutl snapshot restore does NOT talk to the network.
  It is a local, offline operation that rebuilds a data directory from a file.
  You must run it separately on each node — not once.

PROC

# --------------------------------------------------
echo "--- Step 6: Backup best practices ---"
cat << 'BEST'
  - Take snapshots on a regular schedule (every 30 min for production)
  - Snapshot from a FOLLOWER node to avoid adding load to the leader
  - Store snapshots in object storage (not on the etcd node itself)
  - After a compact+defrag, always take a fresh snapshot
  - Test your restore procedure regularly — a backup you haven't tested is not a backup
BEST
echo ""

# --------------------------------------------------
echo "--- Cleanup ---"
rm -rf "${SNAP_DIR}"
etcdctl del --prefix /snap-lab/ > /dev/null 2>&1 || true

echo "✓ Lab 05 complete! You have finished all cluster labs."
