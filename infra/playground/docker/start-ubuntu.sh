#!/bin/bash
set -e

if [ -n "$SCENARIO_ID" ] && [ -f "/scenarios/${SCENARIO_ID}/setup.sh" ]; then
  bash "/scenarios/${SCENARIO_ID}/setup.sh" 2>&1 | logger -t playground-setup || true
fi

exec ttyd \
  --port 7681 \
  --writable \
  --max-clients 1 \
  --once \
  bash
