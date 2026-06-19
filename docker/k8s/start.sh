#!/bin/bash
set -e

echo '__PROGRESS__:{"step":"container_ready","status":"done"}'

# --cluster-init enables k3s embedded etcd (instead of SQLite)
k3s server --disable traefik --disable servicelb --cluster-init &>/var/log/k3s.log &

echo '__PROGRESS__:{"step":"env_setup","status":"done"}'

# Wait for kubeconfig (up to 120s)
for i in $(seq 1 60); do
  [ -f /etc/rancher/k3s/k3s.yaml ] && break
  sleep 2
done

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
echo "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml" >> /etc/bash.bashrc

# Wait for etcd certs (written by k3s after cluster-init)
for i in $(seq 1 30); do
  [ -f /var/lib/rancher/k3s/server/tls/etcd/server-client.crt ] && break
  sleep 2
done

# Always configure etcdctl to talk to k3s embedded etcd
cat >> /etc/bash.bashrc << 'BASHRC'
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS="https://127.0.0.1:2379"
export ETCDCTL_CACERT="/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt"
export ETCDCTL_CERT="/var/lib/rancher/k3s/server/tls/etcd/server-client.crt"
export ETCDCTL_KEY="/var/lib/rancher/k3s/server/tls/etcd/server-client.key"
alias etcd-health='etcdctl endpoint health'
alias etcd-status='etcdctl endpoint status --write-out=table'
alias etcd-members='etcdctl member list --write-out=table'
alias k8s-etcd='etcdctl get --prefix /registry/ --keys-only'
BASHRC

# When SCENARIO_ID=etcd: copy lab scripts and show welcome message
if [ "${SCENARIO_ID}" = "etcd" ]; then
  cp -r /home/learner/labs/etcd/. /home/learner/
  echo 'echo "=== etcd Playground: run etcd-health to verify, then bash ~/01-basics.sh for Lab 01 ==="' >> /etc/bash.bashrc
fi

code-server --bind-addr 0.0.0.0:8080 --auth none /home/learner &>/var/log/code-server.log &

echo '__PROGRESS__:{"step":"ide_start","status":"done"}'
echo '__PROGRESS__:{"step":"terminal_ready","status":"done"}'

exec ttyd --port 7681 --writable --max-clients 1 bash
