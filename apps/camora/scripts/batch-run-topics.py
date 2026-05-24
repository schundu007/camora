#!/usr/bin/env python3
"""
Batch runner: research + generate for all Core Concepts topics in parallel.
Usage: python3 apps/camora/scripts/batch-run-topics.py
"""
from __future__ import annotations
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SCRIPT = Path(__file__).parent / "research-topic.py"
LOG_DIR = Path("/tmp/camora-core-concepts-logs")
LOG_DIR.mkdir(exist_ok=True)

TOPICS = [
    "fundamentals", "databases", "caching", "message-queues", "api-design",
    "load-balancing", "rate-limiting", "microservices", "security", "monitoring",
    "rest-vs-rpc", "quorum", "leader-follower", "heartbeat-mechanism", "checksum",
    "strong-vs-eventual-consistency", "latency-vs-throughput", "acid-vs-base",
    "distributed-messaging", "synchronous-vs-asynchronous", "distributed-file-systems",
    "consistent-hashing", "bloom-filters", "data-partitioning", "database-indexes",
    "proxies", "dns-deep-dive", "cdn-deep-dive", "redundancy-replication",
    "network-essentials", "long-polling-websockets-sse", "cap-pacelc-deep-dive",
    "distributed-lock", "cassandra-deep-dive", "dynamodb-deep-dive",
    "apache-flink-deep-dive", "zookeeper-deep-dive", "vector-databases-deep-dive",
]

env = {**os.environ, "ANTHROPIC_API_KEY": os.environ.get("ANTHROPIC_API_KEY", "")}


def run_phase(topic: str, phase: str) -> tuple[str, bool, str]:
    log_path = LOG_DIR / f"{phase}-{topic}.log"
    result = subprocess.run(
        [sys.executable, str(SCRIPT), f"--phase={phase}", f"--topic={topic}"],
        capture_output=True, text=True, env=env, timeout=180,
    )
    output = result.stdout + result.stderr
    log_path.write_text(output)
    return topic, result.returncode == 0, output[-300:] if result.returncode != 0 else ""


def run_phase_all(phase: str, workers: int = 10) -> list[str]:
    """Run `phase` for all topics in parallel. Returns list of failed topics."""
    print(f"\n=== Phase: {phase} ({len(TOPICS)} topics, {workers} workers) ===")
    failures = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(run_phase, t, phase): t for t in TOPICS}
        for f in as_completed(futures):
            topic, ok, tail = f.result()
            if ok:
                print(f"  [ok] {topic}")
            else:
                print(f"  [FAIL] {topic}")
                if tail:
                    print("\n".join(f"    {l}" for l in tail.splitlines()[-4:]))
                failures.append(topic)
    return failures


if __name__ == "__main__":
    if not env.get("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY not set")

    failed_research = run_phase_all("research", workers=12)
    if failed_research:
        print(f"\nWARN: {len(failed_research)} research failures: {failed_research}")

    failed_generate = run_phase_all("generate", workers=8)

    print(f"\n=== Rebuilding manifest ===")
    result = subprocess.run(
        [sys.executable, str(SCRIPT.parent / "rebuild-manifest.py")],
        capture_output=True, text=True, env=env,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)

    total_fail = len(failed_research) + len(failed_generate)
    print(f"\nBatch complete. Failures: research={len(failed_research)}, generate={len(failed_generate)}")
    if total_fail:
        print(f"Check logs in {LOG_DIR}/")
