#!/usr/bin/env node
/**
 * Generate the missing eraser-{aws,azure,gcp}.png architecture diagrams
 * for the system-design topic catalog.
 *
 * apps/frontend/public/diagrams/<slug>/eraser-{aws,azure,gcp}.png contains
 * the polished, team-curated diagrams that /capra/design serves first
 * (see preGeneratedDiagrams.ts). Today there are 110 topic dirs but only
 * ~71 have full coverage — this script generates the missing ones via the
 * Eraser.io API and writes them in place.
 *
 * USAGE:
 *   ERASER_API_KEY=<key> node apps/frontend/scripts/gen-eraser-missing-diagrams.mjs \
 *     [--providers=aws,azure,gcp] [--limit=N] [--slug=<single-slug>] [--dry-run]
 *
 *   --providers   Comma-separated list of cloud variants to generate
 *                 (default: all three: aws,azure,gcp)
 *   --limit       Generate at most N diagrams (default: unlimited)
 *   --slug        Generate only for a single slug (useful for testing)
 *   --dry-run     Print the plan without calling the API
 *
 * NOTE: Eraser.io billing is per-render. A full backfill of 100+
 * missing PNGs costs real money — use --limit=1 to spot-check first
 * before running the full pass.
 *
 * Skip pattern: if eraser-<provider>.png already exists for a slug, the
 * script skips that combination so it's safe to rerun. Delete the file
 * to force regeneration.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function flag(name, fallback) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}
const PROVIDERS = flag('providers', 'aws,azure,gcp').split(',').map((s) => s.trim()).filter(Boolean);
const LIMIT = parseInt(flag('limit', '0'), 10) || Infinity;
const ONLY_SLUG = flag('slug', '');
const DRY_RUN = argv.includes('--dry-run');
const ERASER_API_KEY = process.env.ERASER_API_KEY;

if (!DRY_RUN && !ERASER_API_KEY) {
  console.error('ERROR: ERASER_API_KEY env var required (or pass --dry-run to preview).');
  console.error('       Get a key at https://app.eraser.io/');
  process.exit(1);
}

// ── Slug → human-readable problem description ────────────────────────────
// Used as the Eraser.io prompt. Keep prompts short (1–2 sentences) so the
// generator focuses on the architecture, not narrative copy. Where the
// slug is itself a recognizable product name, the prompt just names it.
const SLUG_PROMPTS = {
  // Storage / files
  'distributed-file-systems': 'Design a distributed file system like HDFS with name nodes, data nodes, replication, and chunk servers.',
  'object-storage': 'Design an object storage system like Amazon S3 with bucket sharding, replication, and metadata service.',
  'blob-store': 'Design a blob store with chunked uploads, erasure coding, and tiered storage.',

  // Concepts / fundamentals
  'acid-vs-base': 'Visualize ACID vs BASE database tradeoffs with consistency, availability, and partition tolerance properties.',
  'bloom-filters': 'Design a Bloom filter system showing hash functions, bit array, and membership testing.',
  'cap-pacelc-deep-dive': 'Visualize the CAP theorem and PACELC extension with consistency, availability, partition tolerance, and latency tradeoffs.',
  'caching': 'Design a multi-tier cache architecture: browser cache, CDN, application cache, distributed cache, database query cache.',
  'cdn-deep-dive': 'Design a CDN with origin servers, edge servers, request routing, cache invalidation, and SSL termination.',
  'checksum': 'Visualize checksum verification: data integrity, hash functions (MD5/SHA), end-to-end checks across storage and transit.',
  'consistent-hashing': 'Visualize consistent hashing: hash ring, virtual nodes, server addition/removal, and load distribution.',
  'data-partitioning': 'Show data partitioning strategies: range-based, hash-based, geographic, and consistent hashing partitioning.',
  'database-indexes': 'Design a database indexing system: B-tree, hash index, secondary index, and composite index structures.',
  'databases': 'Compare database types: relational (PostgreSQL/MySQL), NoSQL (DynamoDB/MongoDB), wide-column (Cassandra), graph (Neo4j).',
  'distributed-cache': 'Design a distributed cache like Redis Cluster: consistent hashing, replication, eviction, and persistence.',
  'distributed-lock': 'Design a distributed lock service: ZooKeeper/etcd, lease management, fencing tokens, and lock acquisition.',
  'distributed-messaging': 'Design a distributed messaging system: pub/sub, topics, partitions, consumer groups, and at-least-once delivery.',
  'distributed-search': 'Design a distributed search engine: inverted index, sharding, replication, query coordination, and ranking.',
  'distributed-task-scheduler': 'Design a distributed task scheduler: cron, leader election, task queues, worker pools, and retry logic.',
  'dns-deep-dive': 'Design DNS architecture: root servers, TLD servers, authoritative servers, recursive resolvers, caching, and DNSSEC.',
  'heartbeat-mechanism': 'Visualize heartbeat mechanism: gossip protocol, failure detection, phi accrual detector, and leader election triggers.',
  'latency-vs-throughput': 'Visualize latency vs throughput tradeoffs: queueing theory, batching, parallelism, and SLO thresholds.',
  'leader-follower': 'Design leader-follower replication: synchronous/asynchronous replication, failover, log shipping, and read replicas.',
  'load-balancing': 'Design a load balancer: L4 (TCP) vs L7 (HTTP), round-robin, least connections, weighted, and consistent hashing.',
  'long-polling-websockets-sse': 'Compare long polling, WebSockets, and Server-Sent Events for real-time client-server communication.',
  'message-queues': 'Design a message queue system: producer-consumer, queues vs topics, broker cluster, persistence, and DLQ.',
  'monitoring': 'Design a monitoring system: metrics collection (Prometheus), aggregation, time-series DB, alerting, and dashboards.',
  'metrics-monitoring': 'Design a metrics and monitoring system: agent → collector → time-series DB → query engine → alerting → dashboards.',
  'network-essentials': 'Visualize network essentials: TCP/IP, OSI layers, DNS, HTTP/HTTPS, load balancers, and firewalls.',
  'proxies': 'Visualize proxy types: forward proxy, reverse proxy, transparent proxy, and use cases (caching, security, anonymity).',
  'quorum': 'Visualize quorum-based consistency: read quorum (R), write quorum (W), and N replicas with R+W>N for strong consistency.',
  'rate-limiting': 'Design a rate limiter: token bucket, leaky bucket, fixed window, sliding window, and distributed rate limiting.',
  'redundancy-replication': 'Visualize redundancy and replication: master-slave, multi-master, leaderless, sync vs async, and failover.',
  'rest-vs-rpc': 'Compare REST and RPC architectures: HTTP semantics, gRPC, GraphQL, and use cases for each.',
  'security': 'Design system security architecture: authentication (OAuth, JWT), authorization (RBAC), encryption (TLS, at-rest), and WAF.',
  'strong-vs-eventual-consistency': 'Visualize strong vs eventual consistency: linearizability, sequential, causal, and read-your-writes guarantees.',
  'synchronous-vs-asynchronous': 'Visualize sync vs async communication: blocking calls, message queues, callbacks, futures, and event-driven architectures.',

  // Apps / problems missing variants
  'api-design': 'Design a REST/GraphQL API with versioning, rate limiting, authentication, caching, and pagination.',
  'fb-live-comments': 'Design Facebook Live Comments with WebSocket fanout, moderation, ranking, and rate limiting.',
  'fb-post-search': 'Design Facebook post search: inverted index, sharding by user/timestamp, ranking, and caching.',
  'leetcode-online-judge': 'Design an online code judge like LeetCode: code submission queue, sandbox executor, test runners, and verdict cache.',
  'price-tracking-service': 'Design a price tracking service: scraper fleet, change detection, notification queue, and historical price DB.',
  'strava-fitness-tracking': 'Design Strava: GPS ingestion, segment matching, activity feed, leaderboards, and social graph.',
  'youtube-top-k-trending': 'Design a top-K trending videos system: real-time event stream, sketch (Count-Min Sketch / heavy hitters), and ranking.',
  'fundamentals': 'Visualize system design fundamentals: scalability, reliability, availability, performance, and maintainability tradeoffs.',
  'docs': 'Design a documentation platform: markdown rendering, full-text search, version history, and CDN delivery.',

  // Online auction (was missing AWS but had others)
  'online-auction': 'Design an online auction like eBay: real-time bidding, auction state, anti-fraud, payment, and notifications.',
};

// ── Inventory ─────────────────────────────────────────────────────────────
const PUBLIC_DIAGRAMS = path.resolve(__dirname, '../public/diagrams');
const allSlugs = fs
  .readdirSync(PUBLIC_DIAGRAMS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const tasks = [];
for (const slug of allSlugs) {
  if (ONLY_SLUG && slug !== ONLY_SLUG) continue;
  for (const provider of PROVIDERS) {
    const filePath = path.join(PUBLIC_DIAGRAMS, slug, `eraser-${provider}.png`);
    if (fs.existsSync(filePath)) continue;
    const prompt = SLUG_PROMPTS[slug] || `Design a ${slug.replace(/-/g, ' ')} system architecture using ${provider.toUpperCase()} services.`;
    tasks.push({ slug, provider, filePath, prompt });
    if (tasks.length >= LIMIT) break;
  }
  if (tasks.length >= LIMIT) break;
}

console.log(`\n=== Eraser-style diagram backfill ===`);
console.log(`Slugs scanned:     ${allSlugs.length}`);
console.log(`Pending tasks:     ${tasks.length}`);
console.log(`Providers:         ${PROVIDERS.join(', ')}`);
console.log(`Dry run:           ${DRY_RUN}`);
console.log('');

if (tasks.length === 0) {
  console.log('Nothing to do — all slugs have full coverage for the requested providers.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('Plan:');
  for (const t of tasks.slice(0, 25)) {
    console.log(`  [${t.provider}] ${t.slug.padEnd(36)} → ${path.relative(process.cwd(), t.filePath)}`);
  }
  if (tasks.length > 25) console.log(`  ... and ${tasks.length - 25} more`);
  console.log('\nRe-run without --dry-run to generate (requires ERASER_API_KEY).');
  process.exit(0);
}

// ── Generation ────────────────────────────────────────────────────────────
async function generateOne(task) {
  // Eraser.io expects a single text prompt. We bias the diagram toward
  // the requested cloud provider by appending a "Use {provider} services"
  // hint. The diagramType + theme + imageQuality match the existing
  // backfill so new files match the visual style of the old ones.
  const promptForProvider = `${task.prompt} Use ${task.provider.toUpperCase()} services exclusively.`;

  const resp = await fetch('https://app.eraser.io/api/render/prompt', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ERASER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: promptForProvider,
      diagramType: 'cloud-architecture-diagram',
      background: true,
      theme: 'light',
      imageQuality: 2,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Eraser API ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  if (!data.imageUrl) {
    throw new Error('Eraser response missing imageUrl');
  }

  // Download the PNG and write it in place.
  const imgResp = await fetch(data.imageUrl);
  if (!imgResp.ok) throw new Error(`Image download failed: ${imgResp.status}`);
  const bytes = Buffer.from(await imgResp.arrayBuffer());

  fs.mkdirSync(path.dirname(task.filePath), { recursive: true });
  fs.writeFileSync(task.filePath, bytes);
  return bytes.length;
}

let ok = 0, fail = 0;
const startedAt = Date.now();
for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];
  const label = `[${i + 1}/${tasks.length}] ${task.slug.padEnd(34)} ${task.provider.padEnd(5)}`;
  try {
    const bytes = await generateOne(task);
    console.log(`  OK   ${label} → ${(bytes / 1024).toFixed(0)} KB`);
    ok++;
  } catch (err) {
    console.error(`  FAIL ${label} → ${err.message}`);
    fail++;
  }
  // Eraser.io rate-limits aggressively; pace requests.
  if (i + 1 < tasks.length) await new Promise((r) => setTimeout(r, 2000));
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
console.log(`\n=== Complete in ${elapsed}s ===`);
console.log(`OK:    ${ok}`);
console.log(`Fail:  ${fail}`);
process.exit(fail > 0 ? 1 : 0);
