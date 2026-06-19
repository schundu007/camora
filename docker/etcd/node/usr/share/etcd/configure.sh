#!/bin/bash
# configure.sh — writes /etc/etcd/config.yaml from environment variables.
# Called by start.sh before launching etcd.
#
# Reads:
#   NODE_NAME             — e.g. "etcd1"
#   CLUSTER_NODES         — comma-separated, e.g. "etcd1,etcd2,etcd3"
#   INITIAL_CLUSTER_STATE — "new" (default) or "existing"

set -e

NODE_NAME=${NODE_NAME:-etcd1}
CLUSTER_NODES=${CLUSTER_NODES:-etcd1,etcd2,etcd3}
INITIAL_CLUSTER_STATE=${INITIAL_CLUSTER_STATE:-new}

# Build --initial-cluster string:
# "etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380"
INITIAL_CLUSTER=""
for node in ${CLUSTER_NODES//,/ }; do
  INITIAL_CLUSTER="${INITIAL_CLUSTER}${node}=http://${node}:2380,"
done
INITIAL_CLUSTER="${INITIAL_CLUSTER%,}"

mkdir -p /etc/etcd /var/lib/etcd/"${NODE_NAME}"

cat > /etc/etcd/config.yaml << EOF
name: ${NODE_NAME}
data-dir: /var/lib/etcd/${NODE_NAME}

listen-client-urls: http://0.0.0.0:2379
advertise-client-urls: http://${NODE_NAME}:2379

listen-peer-urls: http://0.0.0.0:2380
initial-advertise-peer-urls: http://${NODE_NAME}:2380

initial-cluster: ${INITIAL_CLUSTER}
initial-cluster-token: camora-etcd-cluster
initial-cluster-state: ${INITIAL_CLUSTER_STATE}

enable-v2: false

log-level: warn
log-outputs:
  - /var/log/etcd.log
EOF

echo "configure.sh: wrote /etc/etcd/config.yaml for node '${NODE_NAME}'"
echo "  initial-cluster: ${INITIAL_CLUSTER}"
echo "  initial-cluster-state: ${INITIAL_CLUSTER_STATE}"
