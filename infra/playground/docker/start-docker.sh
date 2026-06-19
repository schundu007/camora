#!/bin/bash
set -e

emit() { printf '__PROGRESS__:%s\n' "$1"; }

emit '{"step":"container_ready","label":"Container started","status":"done","phase":"SYSTEM CHECKS"}'
emit '{"step":"env_setup","label":"Starting Docker daemon","status":"running","phase":"SYSTEM CHECKS"}'

dockerd > /var/log/dockerd.log 2>&1 &

for i in $(seq 1 30); do
  docker info >/dev/null 2>&1 && break || true
  sleep 1
done

if [ -n "$SCENARIO_ID" ] && [ -f "/scenarios/${SCENARIO_ID}/setup.sh" ]; then
  bash "/scenarios/${SCENARIO_ID}/setup.sh" 2>&1 | logger -t playground-setup || true
fi

emit '{"step":"env_setup","label":"Docker daemon ready","status":"done","phase":"SYSTEM CHECKS"}'
emit '{"step":"ide_start","label":"Starting IDE","status":"running","phase":"TOOLS"}'

# Disable built-in terminal panel (duplicate of our ttyd terminal)
mkdir -p /home/camora/.code-server/User
cat > /home/camora/.code-server/User/settings.json << 'VSCODE_SETTINGS'
{
  "terminal.integrated.enabled": false,
  "workbench.startupEditor": "none"
}
VSCODE_SETTINGS
chown -R camora:camora /home/camora/.code-server

sudo -u camora code-server \
  --port 8080 \
  --auth none \
  --bind-addr 0.0.0.0 \
  --disable-update-check \
  --disable-telemetry \
  --user-data-dir /home/camora/.code-server \
  --extensions-dir /home/camora/.code-server/extensions \
  > /var/log/code-server.log 2>&1 &

for i in $(seq 1 30); do
  curl -sf http://localhost:8080 -o /dev/null 2>/dev/null && break || true
  sleep 1
done

emit '{"step":"ide_start","label":"IDE ready","status":"done","phase":"TOOLS"}'
emit '{"step":"terminal_ready","label":"Terminal ready","status":"done","phase":"TOOLS"}'

exec ttyd \
  --port 7681 \
  --writable \
  --max-clients 5 \
  su - camora
