#!/bin/bash
# start.sh — entrypoint for chundubabu/pg-etcd-node
# Configures etcd from environment variables, starts the node, then ttyd.
# Emits __PROGRESS__ sentinels that the Camora backend watches.
#
# Required env vars:
#   NODE_NAME      — e.g. "etcd1", "etcd2", "etcd3"
#   NODE_INDEX     — 0, 1, or 2
#   CLUSTER_NODES  — comma-separated list, e.g. "etcd1,etcd2,etcd3"
#   SESSION_ID     — session identifier (informational)
#
# Optional:
#   INITIAL_CLUSTER_STATE — "new" (default) or "existing" (for dynamic add)

set -e

NODE_NAME=${NODE_NAME:-etcd1}
NODE_INDEX=${NODE_INDEX:-0}
CLUSTER_NODES=${CLUSTER_NODES:-etcd1,etcd2,etcd3}
SESSION_ID=${SESSION_ID:-unknown}

LOG=/var/log/etcd.log

export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS="http://etcd1:2379,http://etcd2:2379,http://etcd3:2379"

# ---------------------------------------------------------------------------
# 1. Container is ready
# ---------------------------------------------------------------------------
echo '__PROGRESS__:{"step":"container_ready","status":"done"}'

# ---------------------------------------------------------------------------
# 2. Environment / config setup
# ---------------------------------------------------------------------------
mkdir -p /var/lib/etcd/"${NODE_NAME}" /etc/etcd

/usr/share/etcd/configure.sh

echo '__PROGRESS__:{"step":"env_setup","status":"done"}'

# ---------------------------------------------------------------------------
# 3. Start etcd in background
# ---------------------------------------------------------------------------
etcd --config-file /etc/etcd/config.yaml >> "${LOG}" 2>&1 &
ETCD_PID=$!
echo "${ETCD_PID}" > /var/run/etcd-${NODE_NAME}.pid

# ---------------------------------------------------------------------------
# 4. Start code-server in background
# ---------------------------------------------------------------------------
code-server \
  --bind-addr 0.0.0.0:8080 \
  --auth none \
  /home/learner \
  >> /var/log/code-server.log 2>&1 &

echo '__PROGRESS__:{"step":"ide_start","status":"done"}'

# ---------------------------------------------------------------------------
# 5. Wait for local etcd to be up
# ---------------------------------------------------------------------------
echo "Waiting for local etcd node (${NODE_NAME}) to become healthy..."
LOCAL_ENDPOINT="http://127.0.0.1:2379"
ATTEMPTS=0
until ETCDCTL_ENDPOINTS="${LOCAL_ENDPOINT}" etcdctl endpoint health > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "${ATTEMPTS}" -gt 60 ]; then
    echo "ERROR: ${NODE_NAME} did not become healthy after 60 seconds" >&2
    echo "Last log lines:" >&2
    tail -20 "${LOG}" >&2
    exit 1
  fi
  sleep 1
done
echo "${NODE_NAME} is up (pid=${ETCD_PID})"

# ---------------------------------------------------------------------------
# 6. Primary node (NODE_INDEX=0) waits for full cluster quorum.
#    Other nodes emit terminal_ready immediately after local health.
# ---------------------------------------------------------------------------
if [ "${NODE_INDEX}" = "0" ]; then
  echo "Primary node: waiting for cluster quorum (all nodes healthy)..."
  CLUSTER_ATTEMPTS=0
  until etcdctl endpoint health --cluster > /dev/null 2>&1; do
    CLUSTER_ATTEMPTS=$((CLUSTER_ATTEMPTS + 1))
    if [ "${CLUSTER_ATTEMPTS}" -gt 120 ]; then
      echo "WARNING: Cluster quorum not reached after 120s; continuing anyway." >&2
      break
    fi
    sleep 1
  done
  echo "Cluster quorum reached."
fi

echo '__PROGRESS__:{"step":"terminal_ready","status":"done"}'

# ---------------------------------------------------------------------------
# 7. ttyd in foreground — keeps container alive
# ---------------------------------------------------------------------------
exec ttyd \
  --port 7681 \
  --interface 0.0.0.0 \
  --writable \
  bash
