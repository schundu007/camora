#!/usr/bin/env node
/**
 * One-time script to generate Eraser cloud-architecture diagrams
 * for all system design problems (AWS, GCP, Azure).
 *
 * Usage: ERASER_API_KEY=xxx node scripts/generate-diagrams.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIAGRAMS_DIR = path.join(__dirname, '..', 'apps', 'frontend', 'public', 'diagrams');
const API_KEY = process.env.ERASER_API_KEY;

if (!API_KEY) {
  console.error('ERASER_API_KEY env var required');
  process.exit(1);
}

// All system design problems ordered by interview frequency (most-asked first)
const problems = [
  // === TIER 1: Most frequently asked in FAANG interviews ===
  { id: 'url-shortener', title: 'URL Shortener (TinyURL/Bit.ly)', components: ['Load Balancer', 'Web Servers', 'ZooKeeper (ID range allocation)', 'Database (NoSQL — Cassandra/DynamoDB)', 'Cache (Redis)', 'CDN', 'Analytics Service', 'Key Generation Service'] },
  { id: 'twitter', title: 'Twitter / X - Social Media Feed', components: ['Tweet Service', 'Timeline Service', 'Fan-out Service (hybrid push/pull)', 'Search (Elasticsearch)', 'Cache (Redis sorted sets)', 'Notification Service', 'Kafka (async fan-out)', 'MySQL (sharded by userId)', 'CDN', 'Object Storage (media)', 'Snowflake ID Generator'] },
  { id: 'netflix', title: 'Netflix - Video Streaming Service', components: ['Video delivery (adaptive bitrate HLS/DASH)', 'Content management', 'User service', 'Recommendation engine (ML)', 'CDN (Open Connect Appliances)', 'Playback service', 'Transcoding Pipeline (FFmpeg farm)', 'Object Storage', 'Microservices Gateway (Zuul)', 'Chaos Engineering (Simian Army)'] },
  { id: 'uber', title: 'Uber / Lyft - Ride Sharing', components: ['Cell Services (S2 geometry)', 'Redis (Geospatial — GEOADD/GEORADIUS)', 'Kafka', 'Matching Service', 'ETA Service (ML)', 'Payment Service', 'Location Service', 'WebSocket Gateway', 'Surge Pricing Engine', 'Driver/Rider Apps'] },
  { id: 'whatsapp', title: 'WhatsApp - Real-time Messaging', components: ['Chat Servers (Erlang/Elixir)', 'Kafka (Message Bus)', 'Redis (Sessions & presence)', 'Cassandra (message store)', 'Push Service (APNs/FCM)', 'Media Service', 'WebSocket Gateway', 'End-to-End Encryption (Signal Protocol)', 'Group Chat Service'] },
  { id: 'youtube', title: 'YouTube - Video Streaming Platform', components: ['Upload service (chunked)', 'Transcoding pipeline (DAG of tasks)', 'CDN (global edge)', 'Metadata DB (MySQL Vitess)', 'Search service (Elasticsearch)', 'Recommendation engine (deep learning)', 'Object Storage (Colossus/S3)', 'Message Queue', 'Thumbnail Generator', 'Live Streaming (WebRTC/RTMP)'] },
  { id: 'instagram', title: 'Instagram - Photo Sharing Social Network', components: ['Media service (upload/resize)', 'Feed service (ranked)', 'User service', 'CDN (global)', 'Search (Elasticsearch)', 'Notification service', 'Object Storage', 'Redis Cache (timelines)', 'Kafka (event bus)', 'Story Service', 'Explore/Discovery ML'] },
  { id: 'amazon', title: 'Amazon E-commerce Platform', components: ['Product service', 'Search (Elasticsearch)', 'Cart service', 'Order service (Saga orchestrator)', 'Payment service', 'Inventory service (distributed locks)', 'Recommendation engine', 'CDN', 'Kafka (event-driven)', 'Cache (ElastiCache)', 'Warehouse/Fulfillment Service'] },
  { id: 'rate-limiter', title: 'Distributed Rate Limiter', components: ['Rate limiter middleware', 'Redis cluster (token bucket/sliding window)', 'Config service (rules engine)', 'API Gateway', 'Monitoring & Alerting', 'Client-side throttling'] },
  { id: 'notification-system', title: 'Notification System (Push/SMS/Email)', components: ['Notification service', 'Template service', 'Priority queue (Kafka)', 'Delivery workers (per channel)', 'Analytics', 'Push (APNs/FCM)', 'SMS (Twilio)', 'Email (SES/SendGrid)', 'User Preferences Store', 'Rate Limiter'] },

  // === TIER 2: Very commonly asked ===
  { id: 'chat-system', title: 'Chat System (Slack/Discord)', components: ['WebSocket Gateway (connection management)', 'Chat Service', 'Presence Service', 'Message Queue (Kafka)', 'Database (Cassandra)', 'Redis Cache (sessions, pub/sub)', 'Push Notifications', 'File/Media Storage', 'Search Service'] },
  { id: 'google-docs', title: 'Google Docs - Collaborative Editing', components: ['Document service', 'Collaboration service (OT/CRDT engine)', 'Storage service', 'WebSocket servers (real-time sync)', 'Version control (operation log)', 'Conflict Resolution', 'Cache', 'Cursor/Presence Service'] },
  { id: 'payment-system', title: 'Payment Processing System (Stripe/PayPal)', components: ['Payment gateway', 'Ledger service (double-entry)', 'Fraud detection (ML)', 'Notification service', 'Reconciliation service', 'Compliance service (PCI DSS)', 'Message Queue', 'Idempotency Store', 'HSM (key management)'] },
  { id: 'search-engine', title: 'Web Search Engine', components: ['Web crawler (politeness/robots.txt)', 'Indexer (inverted index, MapReduce)', 'Ranker (PageRank, ML ranking)', 'Query processor', 'Spell checker', 'Cache (query results)', 'Distributed Storage (HDFS/GFS)', 'Ad Auction Service'] },
  { id: 'ticketmaster', title: 'Ticketmaster - Event Booking', components: ['Event Service', 'Booking Service (distributed locks)', 'Virtual Queue Service', 'Payment Service', 'Inventory (Redis — seat holds)', 'Database', 'CDN', 'Notification Service', 'Waiting Room/Anti-bot'] },
  { id: 'dropbox', title: 'Dropbox / Google Drive - Cloud File Storage', components: ['Block server (chunked dedup)', 'Metadata service', 'Sync service (delta sync)', 'Notification service (long polling)', 'CDN', 'Object Storage', 'Message Queue', 'Conflict Resolution'] },
  { id: 'facebook-newsfeed', title: 'Facebook News Feed', components: ['Feed Service (ranked)', 'Post Service', 'Ranking Service (ML — engagement prediction)', 'Social Graph Service', 'Cache (Memcached/TAO)', 'Kafka (event bus)', 'CDN', 'Object Storage', 'Ads Insertion Service'] },
  { id: 'web-crawler', title: 'Web Crawler', components: ['URL Frontier (priority queue)', 'DNS Resolver (caching)', 'Fetcher (distributed)', 'Parser (HTML/link extraction)', 'Content Store (dedup — SimHash)', 'URL Filter (bloom filter)', 'Politeness Module (robots.txt)', 'Distributed Queue (Kafka)'] },
  { id: 'typeahead', title: 'Typeahead / Autocomplete System', components: ['Trie Service (in-memory)', 'Data Collection Pipeline', 'Aggregator (MapReduce)', 'Cache (Redis — top results)', 'Load Balancer', 'CDN (static suggestions)', 'Zookeeper (shard coordination)'] },
  { id: 'key-value-store', title: 'Distributed Key-Value Store', components: ['Storage Nodes (LSM Tree + SSTable)', 'Consistent Hashing Ring', 'Replication Manager (quorum reads/writes)', 'Gossip Protocol', 'Bloom Filters', 'Write-Ahead Log', 'Coordinator Node', 'Compaction Service', 'Anti-entropy (Merkle trees)'] },

  // === TIER 3: Commonly asked ===
  { id: 'spotify', title: 'Spotify - Music Streaming', components: ['Audio Streaming Service (adaptive bitrate)', 'CDN (edge cache)', 'Recommendation Engine (collaborative filtering)', 'Search Service (Elasticsearch)', 'Playlist Service', 'User Service', 'Cache (Redis)', 'Object Storage (audio files)', 'Offline Sync Service'] },
  { id: 'airbnb', title: 'Airbnb - Accommodation Marketplace', components: ['Search Service (geo + availability)', 'Booking Service (distributed locks)', 'Payment Service (escrow)', 'Messaging Service', 'Review Service', 'Geospatial Index (Elasticsearch)', 'CDN', 'Cache', 'Pricing Service (dynamic)', 'Trust & Safety ML'] },
  { id: 'doordash', title: 'DoorDash - Food Delivery', components: ['Order Service (state machine)', 'Restaurant Service', 'Delivery Matching (optimization)', 'Real-time Tracking (WebSocket)', 'Payment Service', 'Kafka (event bus)', 'Redis (geospatial)', 'Database', 'ETA Prediction (ML)', 'Dasher App'] },
  { id: 'google-maps', title: 'Google Maps - Navigation', components: ['Map Tile Service (vector tiles)', 'Routing Engine (Dijkstra/A* on road graph)', 'Real-time Traffic (probe data)', 'Geocoding Service', 'ETA Service', 'CDN (tile cache)', 'Location Service (GPS)', 'Cache', 'Places/POI Service', 'Offline Maps'] },
  { id: 'zoom', title: 'Zoom - Video Conferencing', components: ['Signaling Server (WebRTC SDP)', 'Media Server (SFU — Selective Forwarding Unit)', 'Recording Service', 'Chat Service', 'TURN/STUN Servers (NAT traversal)', 'CDN', 'Database', 'Object Storage (recordings)', 'Screen Share Service', 'Breakout Rooms'] },
  { id: 'linkedin', title: 'LinkedIn - Professional Network', components: ['Profile Service', 'Connection Service (graph DB)', 'Feed Service (ranked)', 'Messaging Service', 'Search (Elasticsearch)', 'Recommendation Engine (People You May Know)', 'Cache (Couchbase)', 'Kafka (event bus)', 'CDN', 'Job Matching Service'] },
  { id: 'tinder', title: 'Tinder - Dating/Matching App', components: ['Matching Service', 'Recommendation Engine (ML scoring)', 'Geospatial Index (Redis GEORADIUS)', 'Profile Service', 'Chat Service (WebSocket)', 'Redis (swipe queue)', 'Database (PostgreSQL)', 'Push Notifications', 'Photo Moderation (ML)', 'Boost/Premium Service'] },
  { id: 'yelp', title: 'Yelp - Location-based Service', components: ['Search Service', 'Geospatial Index (QuadTree/Geohash)', 'Business Service', 'Review Service', 'Database (PostgreSQL)', 'Elasticsearch', 'CDN', 'Cache (Memcached)', 'Photo Service', 'ML Ranking'] },
  { id: 'hotel-booking', title: 'Hotel Booking System (Booking.com)', components: ['Search Service (availability + geo)', 'Booking Service (optimistic locking)', 'Payment Service', 'Inventory Service (real-time availability)', 'Review Service', 'Geospatial Index', 'Cache', 'CDN', 'Notification Service', 'Price Comparison Engine'] },
  { id: 'unique-id-generator', title: 'Distributed Unique ID Generator', components: ['ID Generator Service (Snowflake)', 'ZooKeeper (worker registration)', 'Snowflake Workers (datacenter + machine ID)', 'Load Balancer', 'Clock Sync (NTP)', 'Monitoring (clock drift detection)'] },

  // === TIER 4: Infrastructure & specialized ===
  { id: 'twitter-trends', title: 'Twitter Trending Topics', components: ['Stream Processor (Flink/Storm)', 'Kafka (tweet stream)', 'Count-Min Sketch (approximate counting)', 'Redis (real-time counters)', 'Time-Decay Service (exponential decay)', 'API Gateway', 'Cache', 'Geographic Segmentation'] },
  { id: 'pastebin', title: 'Pastebin - Text Sharing', components: ['Web Servers', 'Object Storage', 'Database (metadata)', 'CDN', 'Cache (Redis — hot pastes)', 'Load Balancer', 'Key Generation Service', 'Expiration/Cleanup Worker'] },
  { id: 'news-aggregator', title: 'News Aggregator (Google News)', components: ['Crawler Service', 'NLP Pipeline (entity extraction, dedup)', 'Categorizer (ML)', 'Ranking Service', 'User Service (personalization)', 'Search (Elasticsearch)', 'CDN', 'Cache', 'Trending Detection'] },
  { id: 'leaderboard', title: 'Real-time Leaderboard', components: ['Score Service', 'Redis (Sorted Sets — ZADD/ZRANGE)', 'Database (persistence)', 'WebSocket Gateway (live updates)', 'Cache', 'API Gateway', 'Sharding (by game/region)'] },
  { id: 'ad-click-aggregation', title: 'Ad Click Aggregation System', components: ['Click Ingestion Service', 'Stream Processor (Flink/Spark Streaming)', 'Kafka (click stream)', 'Time-Series DB (ClickHouse)', 'Aggregation Service', 'Dashboard API', 'Cache', 'Fraud Detection'] },
  { id: 'metrics-monitoring', title: 'Metrics Monitoring System (Datadog)', components: ['Agent Collector (host/container)', 'Ingestion Pipeline (Kafka)', 'Time-Series DB (InfluxDB/Prometheus)', 'Query Engine (PromQL)', 'Alerting Service (PagerDuty integration)', 'Dashboard API (Grafana)', 'Object Storage (long-term)', 'Anomaly Detection (ML)'] },
  { id: 'stock-exchange', title: 'Stock Exchange Trading System', components: ['Order Matching Engine (price-time priority)', 'Order Book (in-memory)', 'Market Data Feed (multicast)', 'Risk Engine (pre-trade checks)', 'Settlement Service (T+1)', 'FIX Gateway (protocol)', 'Time-Series DB', 'Kafka (trade events)', 'Sequencer (total ordering)'] },

  // === Duplicates with different IDs (keep for coverage) ===
  { id: 'autocomplete-system', title: 'Autocomplete / Typeahead System', components: ['Trie Service', 'Data Collection Pipeline', 'Aggregator', 'Cache (Redis)', 'Load Balancer', 'CDN'] },
  { id: 'ecommerce-platform', title: 'E-commerce Platform', components: ['Product Catalog', 'Search Service', 'Cart Service', 'Order Service', 'Payment Gateway', 'Inventory Service', 'CDN', 'Cache'] },
  { id: 'messaging-app', title: 'Real-time Messaging Application', components: ['WebSocket Gateway', 'Message Service', 'Presence Service', 'Kafka', 'Cassandra', 'Redis', 'Push Notification', 'Media Storage'] },
  { id: 'payment-gateway', title: 'Payment Gateway', components: ['API Gateway', 'Payment Router', 'Fraud Detection (ML)', 'Ledger Service', 'Notification Service', 'Reconciliation', 'HSM (Encryption)'] },
  { id: 'proximity-service', title: 'Proximity Service (Nearby Places)', components: ['Geospatial Index (QuadTree/Geohash)', 'Search Service', 'Business Service', 'Database', 'Cache (Redis)', 'Load Balancer'] },
  { id: 'tiny-url', title: 'TinyURL - URL Shortening Service', components: ['Web Servers', 'Key Generation Service', 'Database', 'Cache (Redis)', 'Load Balancer', 'CDN', 'Analytics'] },
  { id: 'top-k-leaderboard', title: 'Top-K / Leaderboard System', components: ['Score Ingestion', 'Redis (Sorted Sets)', 'Database', 'WebSocket Server', 'API Gateway', 'Cache'] },

  // === From systemDesignProblemsExtra.js ===
  { id: 'slack', title: 'Slack - Team Communication', components: ['WebSocket Gateway (per-workspace)', 'Kafka (message bus)', 'Cassandra (message store)', 'Elasticsearch (search)', 'Redis (presence + pub/sub)', 'Object Storage (S3)', 'Channel Service', 'Thread Service', 'Notification Service'] },
  { id: 'tiktok', title: 'TikTok - Short Video Platform', components: ['CDN (multi-tier global)', 'S3/Blob Storage', 'Kafka (event stream)', 'Transcoding Farm (GPU)', 'ML Recommendation Service (For You Page)', 'Vitess (sharded MySQL)', 'Redis (cache)', 'Vector DB (embeddings)', 'Content Moderation (ML)', 'Creator Analytics'] },
  { id: 'reddit', title: 'Reddit - Social News Platform', components: ['PostgreSQL (ltree for comments)', 'Redis (sorted sets — hot/top/new rankings)', 'Kafka (vote events)', 'Ranking Worker (Wilson score)', 'CDN', 'Elasticsearch (search)', 'Vote Service', 'Comment Service', 'Subreddit Service', 'Moderation Queue'] },
  { id: 'twitch', title: 'Twitch - Live Streaming Platform', components: ['RTMP Ingest PoPs (global)', 'GPU Transcoding Farm (adaptive bitrate)', 'CDN (multi-tier — edge + origin)', 'WebSocket Gateway Cluster (chat)', 'Redis Pub/Sub (chat fan-out)', 'Cassandra (chat history)', 'PostgreSQL (metadata)', 'S3 (VOD/clips)', 'Subscription/Bits Service'] },
  { id: 'gmail', title: 'Gmail - Email Service', components: ['MX Servers (SMTP inbound)', 'Kafka (mail processing pipeline)', 'Spam Pipeline (ML + SpamAssassin rules)', 'Bigtable (mail store)', 'Blob Storage (GCS — attachments)', 'Elasticsearch (mail search)', 'Redis (session cache)', 'Push Notification', 'IMAP/POP3 Gateway'] },
  { id: 'google-drive', title: 'Google Drive - Cloud Storage & Sync', components: ['Sync Service (delta sync, conflict resolution)', 'Content-Addressable Blob Storage', 'Metadata DB (Spanner)', 'Redis (cache + pub/sub — change notification)', 'CDN', 'Elasticsearch (file search)', 'Change Log (event sourcing)', 'Sharing/Permissions Service'] },
  { id: 'shopify', title: 'Shopify - E-commerce Platform', components: ['Pod-based infrastructure (tenant isolation)', 'Vitess (sharded MySQL)', 'Redis (carts, inventory counters)', 'CDN (storefront — Shopify Edge)', 'Payment Gateway', 'Kafka (order events)', 'S3 (assets/media)', 'Webhook Service', 'Liquid Template Engine', 'App/API Platform'] },
  { id: 'flash-sale', title: 'Flash Sale System', components: ['Virtual Queue Service', 'Inventory Lock (Redis — atomic decrement)', 'Order Service', 'Payment Service', 'Rate Limiter (DDoS protection)', 'CDN (static assets)', 'Database (PostgreSQL)', 'Notification Service', 'Anti-bot/CAPTCHA', 'Circuit Breaker'] },
  { id: 'distributed-cache', title: 'Distributed Cache System', components: ['Cache Nodes (in-memory)', 'Consistent Hashing Ring', 'Replication (primary-replica)', 'Eviction Policy (LRU/LFU)', 'Gossip Protocol (membership)', 'Client Library (smart routing)', 'Monitoring (hit rate, latency)', 'Hot Key Detection'] },
  { id: 'distributed-lock', title: 'Distributed Lock Service', components: ['Lock Manager (Redlock/ZooKeeper)', 'ZooKeeper/etcd (consensus)', 'Fencing Tokens (monotonic)', 'Heartbeat Service (lease renewal)', 'Client SDK', 'Monitoring (lock contention)', 'Dead Lock Detection'] },
  { id: 'distributed-search', title: 'Distributed Search Engine', components: ['Index Shards (inverted index)', 'Query Coordinator (scatter-gather)', 'Crawler (URL frontier)', 'Indexer Pipeline (MapReduce)', 'Ranking Service (BM25 + ML)', 'Cache (query results)', 'Load Balancer', 'Spell Correction'] },
  { id: 'distributed-task-scheduler', title: 'Distributed Task Scheduler', components: ['Scheduler Service (cron + one-time)', 'Task Queue (Kafka — partitioned)', 'Worker Pool (auto-scaling)', 'ZooKeeper (leader election)', 'Database (task state — PostgreSQL)', 'Monitoring (Prometheus)', 'Dead Letter Queue', 'Retry/Backoff Engine'] },
  { id: 'api-gateway', title: 'API Gateway', components: ['Gateway Service (request routing)', 'Rate Limiter (token bucket)', 'Auth Service (JWT/OAuth)', 'Service Registry (Consul)', 'Load Balancer', 'Cache (response cache)', 'Logging/Metrics (ELK/Prometheus)', 'Circuit Breaker', 'Request Transformation'] },
  { id: 'blob-store', title: 'Blob Storage System (S3)', components: ['API Gateway', 'Metadata Service (PostgreSQL)', 'Data Nodes (erasure-coded chunks)', 'Replication Manager (cross-region)', 'Garbage Collector', 'CDN (presigned URLs)', 'Consistent Hashing', 'Versioning Service'] },
  { id: 'cdn', title: 'Content Delivery Network', components: ['Edge PoPs (global — 300+ locations)', 'Origin Shield (mid-tier cache)', 'Origin Server', 'DNS (GeoDNS — latency-based routing)', 'Cache Invalidation (tag-based purge)', 'TLS Termination (edge)', 'Load Balancer', 'Monitoring (real-time analytics)', 'DDoS Mitigation'] },
  { id: 'ci-cd-pipeline', title: 'CI/CD Pipeline System', components: ['Source Control (Git)', 'Build Agents (containerized)', 'Artifact Registry (Docker/npm)', 'Test Runners (parallel)', 'Deployment Service (blue-green/canary)', 'Queue (Kafka — build events)', 'Database (pipeline state)', 'Notification Service', 'Secret Manager'] },
  { id: 'chatgpt-llm-system', title: 'ChatGPT / LLM Serving System', components: ['API Gateway (streaming SSE)', 'Load Balancer (GPU-aware)', 'GPU Inference Cluster (A100/H100)', 'Model Registry (versioned weights)', 'Token Queue (request scheduling)', 'KV Cache (attention cache)', 'Object Storage (model artifacts)', 'Monitoring (token/latency)', 'Rate Limiter', 'Safety/Content Filter'] },
  { id: 'calendar-system', title: 'Calendar System (Google Calendar)', components: ['Calendar Service', 'Event Service (CRUD + recurring)', 'Notification Service (email/push)', 'Recurring Event Engine (RRULE expansion)', 'Timezone Service (IANA)', 'Database (PostgreSQL)', 'Cache (Redis)', 'Push Service', 'Free/Busy Lookup', 'CalDAV Sync'] },
  { id: 'deployment-system', title: 'Deployment System (Kubernetes)', components: ['API Server (REST)', 'Scheduler (bin-packing)', 'Controller Manager (reconciliation loops)', 'etcd (distributed state store)', 'Kubelet (node agent)', 'Container Runtime (containerd)', 'Service Mesh (Istio/Envoy)', 'Ingress Controller', 'HPA (horizontal pod autoscaler)'] },
  { id: 'digital-wallet', title: 'Digital Wallet (Apple Pay/Venmo)', components: ['Wallet Service (balance management)', 'Transaction Service (ACID)', 'Ledger (double-entry immutable)', 'Fraud Detection (ML real-time)', 'KYC Service (identity verification)', 'Payment Rail Integration (ACH/Visa)', 'Notification Service', 'HSM (tokenization)', 'Compliance/AML'] },
  { id: 'job-scheduler', title: 'Job Scheduler System', components: ['Scheduler Service (priority-based)', 'Job Queue (partitioned)', 'Worker Pool (heterogeneous — CPU/GPU)', 'Cron Engine (time-trigger)', 'Database (job state/history)', 'Monitoring (SLA tracking)', 'Dead Letter Queue', 'API Gateway', 'Dependency Graph Resolver'] },
  { id: 'object-storage', title: 'Object Storage System', components: ['API Gateway (S3-compatible)', 'Metadata Service (sharded DB)', 'Data Nodes (erasure coding 6+3)', 'Replication (cross-datacenter)', 'Garbage Collector (mark-sweep)', 'Monitoring (capacity planning)', 'Lifecycle Manager (tiering)'] },
  { id: 'online-chess', title: 'Online Chess (Chess.com)', components: ['Game Service (state machine)', 'WebSocket Gateway (real-time moves)', 'Matchmaking Service (ELO-based)', 'Rating Engine (Glicko-2)', 'Move Validator (legal move checking)', 'Database (game history)', 'Redis (active games)', 'Spectator Service (fan-out)', 'Puzzle/Analysis Engine'] },
  { id: 'recommendation-engine', title: 'Recommendation Engine', components: ['Feature Store (online/offline)', 'ML Training Pipeline (batch — Spark)', 'Model Serving (low-latency inference)', 'User Activity Collector (clickstream)', 'Kafka (event ingestion)', 'Vector DB (ANN search)', 'A/B Testing Framework', 'Cache (precomputed recs)', 'Cold-Start Handler'] },
  { id: 'time-series-db', title: 'Time-Series Database', components: ['Write-Ahead Log (durability)', 'LSM Tree / Columnar Store', 'Compaction Service (size-tiered)', 'Query Engine (time-range + aggregation)', 'Retention Manager (TTL/downsampling)', 'Replication (Raft consensus)', 'API Gateway (PromQL/InfluxQL)', 'Ingestion Buffer'] },
];

const providers = ['aws', 'gcp', 'azure'];

const providerContext = {
  aws: 'Use AWS cloud services: EC2/ECS for compute, S3 for storage, RDS/DynamoDB for databases, ElastiCache for Redis, CloudFront for CDN, SQS/SNS for messaging, Route 53 for DNS, ALB for load balancing, Lambda for serverless, MSK for Kafka, OpenSearch for Elasticsearch, API Gateway. Show Multi-AZ deployment across us-east-1a, us-east-1b, us-east-1c. Include Auto Scaling Groups, CloudWatch monitoring, and WAF.',
  gcp: 'Use Google Cloud services: GKE/Cloud Run for compute, Cloud Storage for files, Cloud SQL/Spanner/Firestore for databases, Memorystore for Redis, Cloud CDN for content delivery, Pub/Sub for messaging, Cloud DNS, Cloud Load Balancing, Cloud Functions for serverless, Dataflow for stream processing, BigQuery for analytics. Show multi-zone deployment across us-central1-a, us-central1-b, us-central1-c. Include Cloud Armor, Cloud Monitoring.',
  azure: 'Use Azure cloud services: AKS/App Service for compute, Blob Storage for files, Azure SQL/Cosmos DB for databases, Azure Cache for Redis, Azure CDN, Service Bus for messaging, Azure DNS, Azure Load Balancer/Application Gateway, Azure Functions for serverless, Event Hubs for streaming, Cognitive Search. Show multi-zone deployment across availability zones 1, 2, 3. Include Azure Monitor, Azure Front Door, WAF.',
};

async function generateDiagram(description) {
  const response = await fetch('https://app.eraser.io/api/render/prompt', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: description,
      diagramType: 'cloud-architecture-diagram',
      background: true,
      theme: 'light',
      scale: '2',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eraser API ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function downloadImage(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const total = problems.length * providers.length;
  let done = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  console.log(`\nGenerating ${total} diagrams (${problems.length} problems × ${providers.length} providers)\n`);

  for (const problem of problems) {
    const dir = path.join(DIAGRAMS_DIR, problem.id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    for (const provider of providers) {
      const fileName = `eraser-${provider}.png`;
      const filePath = path.join(dir, fileName);

      // Skip if already exists
      if (fs.existsSync(filePath)) {
        done++;
        skipped++;
        console.log(`[${done}/${total}] SKIP ${problem.id}/${fileName} (exists)`);
        continue;
      }

      const description = `Design a production-grade ${problem.title} system architecture.

Components: ${problem.components.join(', ')}.

${providerContext[provider]}

Requirements:
- High Availability (HA): Active-active or active-passive across multiple availability zones
- Business Continuity (BCP): Cross-region replication and failover with RPO < 1 min, RTO < 5 min
- Disaster Recovery (DR): Automated failover to secondary region, regular DR drills
- Multi-AZ: All stateful services deployed across 3 availability zones minimum
- Security: VPC isolation, private subnets for databases, public subnets for load balancers only, encryption at rest and in transit, IAM/RBAC, secrets management
- Monitoring & Observability: Centralized logging, distributed tracing, metrics dashboards, alerting
- Auto-scaling: Horizontal scaling based on CPU/memory/custom metrics
- Show data flow arrows between components with labels`;

      try {
        console.log(`[${done + 1}/${total}] Generating ${problem.id}/${fileName}...`);
        const result = await generateDiagram(description);

        if (result.imageUrl) {
          await downloadImage(result.imageUrl, filePath);
          console.log(`         ✓ Saved ${filePath}`);
        } else {
          throw new Error('No imageUrl in response');
        }
      } catch (err) {
        console.error(`         ✗ FAILED: ${err.message}`);
        failures.push({ problem: problem.id, provider, error: err.message });
        failed++;
      }

      done++;

      // Rate limit: 1.5s between calls
      await sleep(1500);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done: ${done} total, ${skipped} skipped, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f.problem}/${f.provider}: ${f.error}`));
  }
}

main().catch(console.error);
