#!/bin/bash
# Run on the Nomad server node (Linode 4GB, $24/mo)
set -euo pipefail

NOMAD_VERSION="1.7.7"
SERVER_IP="${1:?Usage: bootstrap-server.sh <server-private-ip>}"

apt-get update -y
apt-get install -y curl unzip

curl -fsSL "https://releases.hashicorp.com/nomad/${NOMAD_VERSION}/nomad_${NOMAD_VERSION}_linux_amd64.zip" -o /tmp/nomad.zip
unzip -o /tmp/nomad.zip -d /usr/local/bin/
chmod +x /usr/local/bin/nomad

mkdir -p /etc/nomad.d /opt/nomad/data

cat > /etc/nomad.d/server.hcl <<EOF
datacenter = "linode-us-east"
data_dir   = "/opt/nomad/data"
bind_addr  = "0.0.0.0"

server {
  enabled          = true
  bootstrap_expect = 1
}

telemetry {
  publish_allocation_metrics = true
  publish_node_metrics       = true
}
EOF

cat > /etc/systemd/system/nomad.service <<EOF
[Unit]
Description=Nomad
After=network.target

[Service]
ExecStart=/usr/local/bin/nomad agent -config=/etc/nomad.d/
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now nomad

echo "Nomad server started at $SERVER_IP:4646"
echo "Set NOMAD_ADDR=http://$SERVER_IP:4646 in ascend-backend env"
