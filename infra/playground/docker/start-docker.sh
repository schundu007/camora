#!/bin/bash
set -e

dockerd > /var/log/dockerd.log 2>&1 &

for i in $(seq 1 30); do
  docker info >/dev/null 2>&1 && break
  sleep 1
done

if [ -n "$SCENARIO_ID" ] && [ -f "/scenarios/${SCENARIO_ID}/setup.sh" ]; then
  bash "/scenarios/${SCENARIO_ID}/setup.sh" 2>&1 | logger -t playground-setup || true
fi

exec ttyd \
  --port 7681 \
  --writable \
  --max-clients 1 \
  bash
