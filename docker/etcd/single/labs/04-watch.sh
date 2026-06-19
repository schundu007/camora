#!/bin/bash
# Lab 04: Watch — real-time event streaming
# Teaches: etcd's watch API, historical replay from revision, and prefix watches.
# Run: bash /home/learner/labs/04-watch.sh

set -e

echo "=== Lab 04: Watch — Real-Time Change Notification ==="
echo ""
echo "etcd watch streams every create/update/delete event on a key or prefix."
echo "Kubernetes uses this to detect pod spec changes, configmap updates, etc."
echo ""

# --------------------------------------------------
echo "--- Step 1: Watch a key in the background, then write to it ---"
echo "Starting a background watch on /watch-demo/key1 (5 second window)..."

etcdctl watch /watch-demo/key1 &
WATCH_PID=$!

sleep 1
echo "Writing 3 values to /watch-demo/key1..."
etcdctl put /watch-demo/key1 "first"
sleep 0.5
etcdctl put /watch-demo/key1 "second"
sleep 0.5
etcdctl del /watch-demo/key1
sleep 0.5

kill "${WATCH_PID}" 2>/dev/null || true
wait "${WATCH_PID}" 2>/dev/null || true
echo ""
echo "Watch captured PUT x2 and DELETE events above."
echo ""

# --------------------------------------------------
echo "--- Step 2: Watch a prefix (all keys under /services/) ---"
echo "Starting prefix watch on /services/ (3 second window)..."

etcdctl watch --prefix /services/ &
WATCH_PID2=$!

sleep 1
etcdctl put /services/api     "up"
etcdctl put /services/worker  "starting"
etcdctl del /services/api
sleep 1

kill "${WATCH_PID2}" 2>/dev/null || true
wait "${WATCH_PID2}" 2>/dev/null || true
echo ""

# --------------------------------------------------
echo "--- Step 3: Watch with revision replay (historical events) ---"
echo "Get current revision before writing:"
BEFORE_REV=$(etcdctl endpoint status -w json | jq '.[0].Status.header.revision')
echo "Before revision: ${BEFORE_REV}"
echo ""

etcdctl put /history/a "alpha"
etcdctl put /history/b "beta"
etcdctl put /history/a "ALPHA_V2"

AFTER_REV=$(etcdctl endpoint status -w json | jq '.[0].Status.header.revision')
echo "After revision: ${AFTER_REV}"
echo ""

echo "Replaying events from revision ${BEFORE_REV} (historical watch):"
REPLAY_REV=$((BEFORE_REV + 1))
timeout 2 etcdctl watch --prefix /history/ --rev="${REPLAY_REV}" 2>/dev/null || true
echo ""

# --------------------------------------------------
echo "--- Step 4: Watch with JSON output (useful for scripting) ---"
echo "Starting JSON watch on /json-demo/ (2 second window)..."
etcdctl watch --prefix /json-demo/ -w json &
JSON_WATCH_PID=$!

sleep 0.5
etcdctl put /json-demo/x "100"
sleep 0.5

kill "${JSON_WATCH_PID}" 2>/dev/null || true
wait "${JSON_WATCH_PID}" 2>/dev/null || true
echo ""
echo "(JSON output includes revision, create_revision, mod_revision, version, and base64-encoded key/value)"
echo ""

# --------------------------------------------------
echo "--- Cleanup ---"
etcdctl del --prefix /watch-demo/ > /dev/null 2>&1 || true
etcdctl del --prefix /services/   > /dev/null 2>&1 || true
etcdctl del --prefix /history/    > /dev/null 2>&1 || true
etcdctl del --prefix /json-demo/  > /dev/null 2>&1 || true

echo "✓ Lab 04 complete! Next: bash /home/learner/labs/05-snapshot.sh"
