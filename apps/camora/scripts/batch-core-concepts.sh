#!/usr/bin/env bash
# Runs research + generate for all 38 Core Concepts topics.
# Usage: bash apps/camora/scripts/batch-core-concepts.sh
set -euo pipefail

SCRIPT="apps/camora/scripts/research-topic.py"
LOG_DIR="/tmp/camora-core-concepts-logs"
mkdir -p "$LOG_DIR"

TOPICS=(
  fundamentals databases caching message-queues api-design
  load-balancing rate-limiting microservices security monitoring
  rest-vs-rpc quorum leader-follower heartbeat-mechanism checksum
  strong-vs-eventual-consistency latency-vs-throughput acid-vs-base
  distributed-messaging synchronous-vs-asynchronous distributed-file-systems
  consistent-hashing bloom-filters data-partitioning database-indexes proxies
  dns-deep-dive cdn-deep-dive redundancy-replication network-essentials
  long-polling-websockets-sse cap-pacelc-deep-dive distributed-lock
  cassandra-deep-dive dynamodb-deep-dive apache-flink-deep-dive
  zookeeper-deep-dive vector-databases-deep-dive
)

echo "=== Phase 1: Research (all ${#TOPICS[@]} topics in parallel) ==="
PIDS=()
for topic in "${TOPICS[@]}"; do
  log="$LOG_DIR/research-$topic.log"
  python3 "$SCRIPT" --phase=research --topic="$topic" >"$log" 2>&1 &
  PIDS+=($!)
  echo "  [research] $topic (pid $!)"
done

echo ""
echo "Waiting for all research jobs..."
FAILED=0
for i in "${!PIDS[@]}"; do
  pid=${PIDS[$i]}
  topic=${TOPICS[$i]}
  if wait "$pid"; then
    echo "  [done] $topic"
  else
    echo "  [FAIL] $topic — see $LOG_DIR/research-$topic.log"
    FAILED=$((FAILED+1))
  fi
done

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "ERROR: $FAILED research jobs failed. Check logs in $LOG_DIR/"
  exit 1
fi

echo ""
echo "=== Phase 2: Generate (all ${#TOPICS[@]} topics in parallel) ==="
PIDS=()
for topic in "${TOPICS[@]}"; do
  log="$LOG_DIR/generate-$topic.log"
  python3 "$SCRIPT" --phase=generate --topic="$topic" >"$log" 2>&1 &
  PIDS+=($!)
  echo "  [generate] $topic (pid $!)"
done

echo ""
echo "Waiting for all generate jobs..."
FAILED=0
for i in "${!PIDS[@]}"; do
  pid=${PIDS[$i]}
  topic=${TOPICS[$i]}
  if wait "$pid"; then
    echo "  [done] $topic"
  else
    echo "  [FAIL] $topic — see $LOG_DIR/generate-$topic.log"
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "=== Phase 3: Rebuild manifest ==="
python3 apps/camora/scripts/rebuild-manifest.py

echo ""
echo "Done. $FAILED generate job(s) failed (if any, check logs in $LOG_DIR/)."
