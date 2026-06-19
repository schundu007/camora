#!/bin/bash
# start.sh — entrypoint for chundubabu/pg-etcd-single
# Starts etcd (single node), code-server, then ttyd in foreground.
# Emits __PROGRESS__ sentinels that the Camora backend watches.

set -e

LOG=/var/log/etcd.log

# ---------------------------------------------------------------------------
# 1. Container is ready
# ---------------------------------------------------------------------------
echo '__PROGRESS__:{"step":"container_ready","status":"done"}'

# ---------------------------------------------------------------------------
# 2. Environment setup
# ---------------------------------------------------------------------------
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=http://127.0.0.1:2379

mkdir -p /var/lib/etcd /etc/etcd

echo '__PROGRESS__:{"step":"env_setup","status":"done"}'

# ---------------------------------------------------------------------------
# 3. Start etcd in background
# ---------------------------------------------------------------------------
etcd \
  --name=single \
  --data-dir=/var/lib/etcd \
  --listen-client-urls=http://127.0.0.1:2379 \
  --advertise-client-urls=http://127.0.0.1:2379 \
  --listen-peer-urls=http://127.0.0.1:2380 \
  --initial-advertise-peer-urls=http://127.0.0.1:2380 \
  --initial-cluster=single=http://127.0.0.1:2380 \
  --initial-cluster-token=camora-etcd-single \
  --initial-cluster-state=new \
  >> "${LOG}" 2>&1 &

ETCD_PID=$!

# ---------------------------------------------------------------------------
# 4. Start code-server in background
# ---------------------------------------------------------------------------
# Disable built-in terminal panel (duplicate of our ttyd terminal)
mkdir -p /home/learner/.local/share/code-server/User
cat > /home/learner/.local/share/code-server/User/settings.json << 'VSCODE_SETTINGS'
{
  "terminal.integrated.hideOnStartup": "always",
  "workbench.startupEditor": "none"
}
VSCODE_SETTINGS
chown -R learner:learner /home/learner/.local

sudo -u learner code-server \
  --bind-addr 0.0.0.0:8080 \
  --auth none \
  /home/learner \
  >> /var/log/code-server.log 2>&1 &

echo '__PROGRESS__:{"step":"ide_start","status":"done"}'

# ---------------------------------------------------------------------------
# 5. Wait for etcd to be healthy
# ---------------------------------------------------------------------------
echo "Waiting for etcd to become healthy..."
ATTEMPTS=0
until etcdctl endpoint health > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "${ATTEMPTS}" -gt 60 ]; then
    echo "ERROR: etcd did not become healthy after 60 seconds" >&2
    exit 1
  fi
  sleep 1
done
echo "etcd is healthy (pid=${ETCD_PID})"

echo '__PROGRESS__:{"step":"terminal_ready","status":"done"}'

# ---------------------------------------------------------------------------
# 6. ttyd in foreground — keeps container alive
# ---------------------------------------------------------------------------
exec ttyd \
  --port 7681 \
  --interface 0.0.0.0 \
  --writable \
  su - learner
