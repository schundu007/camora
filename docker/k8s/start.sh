#!/bin/bash
set -e

echo '__PROGRESS__:{"step":"container_ready","status":"done"}'

k3s server --disable traefik --disable servicelb --cluster-init &>/var/log/k3s.log &

echo '__PROGRESS__:{"step":"env_setup","status":"done"}'

# Wait for kubeconfig (up to 120s)
for i in $(seq 1 60); do
  [ -f /etc/rancher/k3s/k3s.yaml ] && break
  sleep 2
done

# Give learner kubectl access
mkdir -p /home/learner/.kube
cp /etc/rancher/k3s/k3s.yaml /home/learner/.kube/config
chmod 600 /home/learner/.kube/config
chown learner:learner /home/learner/.kube/config

cat >> /home/learner/.bashrc << 'BASHRC'
export KUBECONFIG=/home/learner/.kube/config
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS="https://127.0.0.1:2379"
export ETCDCTL_CACERT="/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt"
export ETCDCTL_CERT="/var/lib/rancher/k3s/server/tls/etcd/server-client.crt"
export ETCDCTL_KEY="/var/lib/rancher/k3s/server/tls/etcd/server-client.key"
alias etcd-health='etcdctl endpoint health'
alias etcd-status='etcdctl endpoint status --write-out=table'
alias k8s-etcd='etcdctl get --prefix /registry/ --keys-only'
alias ll='ls -la'
BASHRC

# Make etcd certs readable by learner
chmod 644 /var/lib/rancher/k3s/server/tls/etcd/server-ca.crt 2>/dev/null || true
chmod 644 /var/lib/rancher/k3s/server/tls/etcd/server-client.crt 2>/dev/null || true
chmod 644 /var/lib/rancher/k3s/server/tls/etcd/server-client.key 2>/dev/null || true

if [ "${SCENARIO_ID}" = "etcd" ]; then
  cp -r /home/learner/labs/etcd/. /home/learner/
  chown learner:learner /home/learner/*.sh 2>/dev/null || true
  echo 'echo "=== etcd Playground: run etcd-health to verify, then bash ~/01-basics.sh ==="' >> /home/learner/.bashrc
fi

# Disable built-in terminal panel (duplicate of our ttyd terminal)
mkdir -p /home/learner/.local/share/code-server/User
mkdir -p /home/learner/.local/share/code-server/User
cat > /home/learner/.local/share/code-server/User/settings.json << 'VSCODE_SETTINGS'
{
  "workbench.startupEditor": "none",
  "workbench.colorTheme": "Default Dark+"
}
VSCODE_SETTINGS
chown -R learner:learner /home/learner/.local

# Start Radar observability sidecar (k8s topology, resources, traffic)
KUBECONFIG=/etc/rancher/k3s/k3s.yaml radar --port 9280 --no-browser &>/var/log/radar.log &

sudo -u learner code-server --bind-addr 0.0.0.0:8080 --auth none \
  --user-data-dir /home/learner/.local/share/code-server \
  /home/learner &>/var/log/code-server.log &

echo '__PROGRESS__:{"step":"ide_start","status":"done"}'
echo '__PROGRESS__:{"step":"terminal_ready","status":"done"}'

exec ttyd --port 7681 --writable --max-clients 1 su - learner
