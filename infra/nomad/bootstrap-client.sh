#!/bin/bash
# Run on each Nomad client node (Linode 8GB, $48/mo each)
set -euo pipefail

NOMAD_VERSION="1.7.7"
SYSBOX_VERSION="0.6.4"
SERVER_IP="${1:?Usage: bootstrap-client.sh <nomad-server-private-ip>}"

apt-get update -y
apt-get install -y curl unzip docker.io

curl -fsSL "https://releases.hashicorp.com/nomad/${NOMAD_VERSION}/nomad_${NOMAD_VERSION}_linux_amd64.zip" -o /tmp/nomad.zip
unzip -o /tmp/nomad.zip -d /usr/local/bin/
chmod +x /usr/local/bin/nomad

curl -fsSL "https://github.com/nestybox/sysbox/releases/download/v${SYSBOX_VERSION}/sysbox-ce_${SYSBOX_VERSION}-0.linux_amd64.deb" \
  -o /tmp/sysbox.deb
apt-get install -y /tmp/sysbox.deb

systemctl enable --now docker
systemctl enable --now sysbox

mkdir -p /etc/nomad.d /opt/nomad/data

cat > /etc/nomad.d/client.hcl <<EOF
datacenter = "linode-us-east"
data_dir   = "/opt/nomad/data"
bind_addr  = "0.0.0.0"

client {
  enabled = true
  servers = ["${SERVER_IP}:4647"]
}

plugin "docker" {
  config {
    allow_privileged = false
    volumes {
      enabled = true
    }
  }
}
EOF

cat > /etc/systemd/system/nomad.service <<EOF
[Unit]
Description=Nomad
After=network.target docker.service

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

for env in ubuntu docker; do
  docker pull camora/pg-${env}:latest || true
done

echo "Nomad client ready — connected to server at $SERVER_IP"
