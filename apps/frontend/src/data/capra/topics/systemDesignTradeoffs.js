// System design trade-offs — choosing between competing approaches in distributed systems

export const tradeoffCategories = [
  { id: 'caching-processing', name: 'Caching & Processing', icon: 'layers', color: '#3b82f6' },
  { id: 'architecture', name: 'Architecture Decisions', icon: 'gitBranch', color: '#10b981' },
  { id: 'data-storage', name: 'Data & Storage', icon: 'database', color: '#8b5cf6' },
  { id: 'communication-delivery', name: 'Communication & Delivery', icon: 'radio', color: '#f59e0b' },
];

export const tradeoffCategoryMap = {
  'cache-read-write-strategies': 'caching-processing',
  'batch-vs-stream-processing': 'caching-processing',
  'stateful-vs-stateless': 'architecture',
  'token-bucket-vs-leaky-bucket': 'caching-processing',
  'sql-vs-nosql-tradeoffs': 'data-storage',
  'normalization-vs-denormalization': 'data-storage',
  'monolith-vs-microservices': 'architecture',
  'serverless-vs-traditional': 'architecture',
  'polling-vs-websockets-vs-webhooks': 'communication-delivery',
  'read-heavy-vs-write-heavy': 'data-storage',
  'primary-replica-vs-peer-to-peer': 'communication-delivery',
  'cdn-vs-direct-serving': 'communication-delivery',
};

export const systemDesignTradeoffs = [
  // ─────────────────────────────────────────────────────────
  // 1. Cache Read/Write Strategies (caching-processing)
  // ─────────────────────────────────────────────────────────
  {
    id: 'cache-read-write-strategies',
    title: 'Cache Read/Write Strategies',
    icon: 'database',
    color: '#3b82f6',
    questions: 8,
    description: 'Read-through, write-through, write-behind, and cache-aside patterns for balancing consistency, latency, and throughput in caching layers.',
    concepts: [
      'Cache-aside (lazy loading)',
      'Read-through caching',
      'Write-through caching',
      'Write-behind (write-back) caching',
      'Cache invalidation strategies (TTL, event-driven, versioned)',
      'Cache stampede and thundering herd prevention',
      'Cache warming and pre-population',
      'Consistency guarantees per strategy',
    ],
    tips: [
      'Cache-aside is the most common pattern — the application manages the cache explicitly, giving maximum control',
      'Write-through guarantees consistency but adds latency on every write because both cache and DB must be updated synchronously',
      'Write-behind gives the best write latency but risks data loss if the cache node fails before flushing to the DB',
      'Read-through simplifies application code because the cache layer handles DB fetches transparently',
      'Always discuss TTL as a safety net even when using event-driven invalidation — stale data should have a bounded lifetime',
      'For interviews, know that cache stampede occurs when a popular key expires and hundreds of concurrent requests all miss simultaneously — solve with locking, probabilistic early expiry, or request coalescing',
      'Combine strategies: cache-aside for reads with write-through for writes is a common production pattern',
    ],

    introduction: `**Caching strategies** define how data flows between your application, cache, and database. The right choice depends on your read/write ratio, consistency requirements, and tolerance for data loss. Getting this wrong leads to stale data serving to users, unnecessary database load, or cache layers that add latency without benefit.

The four fundamental strategies — **cache-aside**, **read-through**, **write-through**, and **write-behind** — each make different trade-offs between consistency, latency, and complexity. In practice most production systems combine two or more strategies: for example, cache-aside for reads paired with write-through for writes gives strong consistency without requiring the cache layer to understand your data access patterns.

Understanding these strategies is critical for system design interviews because caching appears in virtually every scalability discussion. Interviewers expect you to articulate **when** each strategy is appropriate, what failure modes it introduces, and how to mitigate problems like cache stampede, stale reads, and data loss on cache node failure.`,

    keyQuestions: [
      {
        question: 'Compare cache-aside vs read-through caching. When would you choose each?',
        answer: `**Cache-Aside (Lazy Loading)**:
The application manages the cache directly. On read: check cache, if miss, fetch from DB, populate cache, return.

**Read-Through**:
The cache layer itself fetches from DB on a miss. The application only talks to the cache.

\`\`\`
Cache-Aside Flow:                    Read-Through Flow:

App ──► Cache  (HIT? return)         App ──► Cache  (HIT? return)
 │                                            │
 │  (MISS)                                    │  (MISS)
 ▼                                            ▼
App ──► DB ──► App ──► Cache         Cache ──► DB ──► Cache ──► App
 │         (app populates cache)              (cache populates itself)
 ▼
Return to client
\`\`\`

**Comparison**:
\`\`\`
Criteria              Cache-Aside        Read-Through
──────────────────────────────────────────────────────
Code complexity       Higher (app owns)  Lower (cache owns)
Cache library req.    Simple (GET/SET)   Must support read-through
Flexibility           Full control       Limited to cache config
Cache miss penalty    Same               Same
Stale data risk       Same (TTL-based)   Same (TTL-based)
Testability           Easier to mock     Harder to unit test
\`\`\`

**Choose cache-aside when**: You need fine-grained control over what gets cached, different TTLs per entity, or conditional caching logic.

**Choose read-through when**: You want simpler application code, uniform caching behavior, and your cache library supports it (e.g., NCache, Hazelcast, Caffeine).

**Interview tip**: Most companies use cache-aside because Redis and Memcached do not natively support read-through. Read-through is more common with embedded caches (Caffeine in JVM) or cache-as-a-service products.`
      },
      {
        question: 'What are the trade-offs between write-through and write-behind caching?',
        answer: `**Write-Through**: Every write updates both cache and DB synchronously before returning to the client.

**Write-Behind (Write-Back)**: Write updates the cache immediately and returns. The cache asynchronously flushes to the DB in the background.

\`\`\`
Write-Through:                       Write-Behind:

App ──► Cache ──► DB                 App ──► Cache ──► return immediately
         │         │                          │
         │  (both sync)                       │  (async, batched)
         ▼         ▼                          ▼
      return after BOTH              Background flush to DB
      succeed                        (may batch multiple writes)

Latency: Higher (DB write on path)   Latency: Lower (only cache write)
Consistency: Strong                  Consistency: Eventual
Data loss risk: None                 Data loss risk: Cache crash = lost writes
\`\`\`

**Detailed comparison**:
\`\`\`
Criteria              Write-Through      Write-Behind
──────────────────────────────────────────────────────────
Write latency         Higher (DB+cache)  Lower (cache only)
Consistency           Strong             Eventual
Data loss risk        None               Yes (unflushed writes)
Write amplification   1:1                Batched (reduced)
DB load               Every write        Batched, smoothed
Complexity            Simple             Complex (queue, retry)
Failure handling      Straightforward    Needs WAL or redo log
\`\`\`

**Choose write-through when**: Consistency matters more than latency (financial systems, user profiles, inventory counts).

**Choose write-behind when**: Write throughput is critical and you can tolerate eventual consistency (analytics counters, activity feeds, recommendation signals).

**Failure mitigation for write-behind**: Use a persistent queue (Redis Streams, Kafka) as the write-behind buffer instead of in-memory queues. This survives cache node restarts.`
      },
      {
        question: 'How do you handle cache stampede (thundering herd) on a popular key expiration?',
        answer: `**The problem**: A heavily-accessed cache key expires. Hundreds of concurrent requests all see a cache miss simultaneously and all query the database, causing a spike that can overwhelm the DB.

\`\`\`
Timeline of cache stampede:

T=0: Key "product:123" expires (TTL reached)
T=0.001s: 500 concurrent requests arrive
           All check cache → MISS
           All query DB simultaneously
           DB: 500 identical queries hit at once

         Normal Load          Stampede
DB QPS:  ████  (50 QPS)      ████████████████ (500 QPS spike)
\`\`\`

**Solution 1 — Mutex/Lock (most common)**:
\`\`\`
Request arrives → cache MISS
  → Try to acquire lock (SETNX in Redis)
  → If lock acquired:
      Fetch from DB, populate cache, release lock
  → If lock NOT acquired:
      Wait/retry after short delay (50-100ms)
      → Cache is now populated by the winner
\`\`\`

**Solution 2 — Probabilistic early expiry (XFetch)**:
\`\`\`
On each cache HIT, with probability P:
  P = max(0, (current_time - (expiry - delta)) / delta)
  If random() < P:
    Refresh the value in background (before TTL)

As TTL approaches, P increases → one request
  refreshes early, preventing mass expiry
\`\`\`

**Solution 3 — Request coalescing (singleflight)**:
\`\`\`
Multiple concurrent requests for same key:
  → Only ONE request goes to DB
  → All others wait for that one result
  → Result is shared to all waiters

Go: singleflight.Group
Node.js: dataloader or custom promise dedup
\`\`\`

**Solution 4 — Never expire, refresh in background**:
Set no TTL. Use a background job or event-driven trigger to refresh cache entries. The cache always has a value, though it may be slightly stale.

**Interview recommendation**: Lead with mutex locking (simple, effective) and mention probabilistic early expiry as an advanced optimization for extremely hot keys.`
      },
      {
        question: 'How do you design a caching strategy for a system with a mixed read/write workload?',
        answer: `**Step 1 — Classify your data access patterns**:
\`\`\`
Data Category       Read:Write Ratio   Strategy
──────────────────────────────────────────────────────
User profiles       100:1              Cache-aside + long TTL
Product catalog     1000:1             Read-through + event invalidation
Shopping cart       1:1                Write-through (consistency)
Analytics events    1:100              Write-behind (throughput)
Session data        10:1               Cache-aside + short TTL
Leaderboard         50:1               Write-through + sorted set
\`\`\`

**Step 2 — Choose a layered architecture**:
\`\`\`
                     Client
                       │
                       ▼
              ┌─────────────────┐
              │   CDN / Edge    │  ◄── Static assets, API responses
              │   Cache (L1)    │      with Cache-Control headers
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Application    │  ◄── In-process cache (Caffeine,
              │  Cache (L2)     │      node-cache) for hot data
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Distributed    │  ◄── Redis/Memcached for shared
              │  Cache (L3)     │      state across instances
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Database      │  ◄── Source of truth
              └─────────────────┘
\`\`\`

**Step 3 — Invalidation strategy**:
- **Event-driven**: DB writes publish events (Kafka, CDC) that invalidate/update cache entries. Best consistency.
- **TTL-based**: Every entry has a TTL as a safety net. Even with event-driven invalidation, set a max TTL.
- **Versioned keys**: Include a version or timestamp in the key (e.g., \`user:123:v5\`). New writes create a new key, old keys naturally expire.

**Step 4 — Monitor and tune**:
- Track hit rate per key prefix (target >95% for read-heavy data)
- Monitor p99 latency for cache misses vs hits
- Alert on sudden hit-rate drops (indicates invalidation storm)
- Size your cache to hold the working set, not the entire dataset

**Key interview insight**: There is no single "best" caching strategy. The answer is always a combination tailored to each data category's consistency and latency requirements.`
      },
    ],

    dataModel: {
      description: 'Cache strategy decision flow and architecture',
      schema: `Cache Strategy Decision Matrix:
  ┌──────────────────────────────────────────────────────────────┐
  │                     Decision Criteria                        │
  ├──────────────┬──────────────┬────────────┬──────────────────┤
  │ Read-heavy?  │ Write-heavy? │ Consistent?│ Simple code?     │
  ├──────────────┼──────────────┼────────────┼──────────────────┤
  │ Cache-aside  │ Write-behind │ Write-thru │ Read-through     │
  │ Read-through │              │ Cache-aside│                  │
  └──────────────┴──────────────┴────────────┴──────────────────┘

Common Combinations:
  1. Cache-aside reads + Write-through writes
     → Strong consistency, moderate latency
  2. Read-through reads + Write-behind writes
     → Best performance, eventual consistency
  3. Cache-aside reads + Event-driven invalidation
     → Good consistency, flexible control

Cache Entry Lifecycle:
  SET key=value TTL=300s
  → HIT HIT HIT HIT ...
  → T=280s: probabilistic early refresh (optional)
  → T=300s: key expires
  → MISS → fetch from DB → SET → HIT HIT ...`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. Batch vs Stream Processing (caching-processing)
  // ─────────────────────────────────────────────────────────
  {
    id: 'batch-vs-stream-processing',
    title: 'Batch vs Stream Processing',
    icon: 'activity',
    color: '#3b82f6',
    questions: 8,
    description: 'Lambda/Kappa architecture, windowing strategies, watermarks, and choosing between batch and stream processing for data pipelines.',
    concepts: [
      'Batch processing (MapReduce, Spark)',
      'Stream processing (Kafka Streams, Flink, Spark Streaming)',
      'Lambda architecture (batch + speed layers)',
      'Kappa architecture (stream-only)',
      'Windowing: tumbling, sliding, session',
      'Watermarks and late data handling',
      'Exactly-once vs at-least-once semantics',
      'Backpressure and flow control',
    ],
    tips: [
      'Lambda architecture maintains two pipelines (batch + stream) — powerful but operationally complex due to dual codebases',
      'Kappa architecture simplifies by using only the stream layer with reprocessing via log replay — preferred for new systems',
      'Windowing is how you turn an unbounded stream into bounded computations — know tumbling, sliding, and session windows',
      'Watermarks track event-time progress and determine when a window can be closed — critical for handling out-of-order events',
      'Exactly-once semantics in stream processing requires idempotent sinks and transactional offset commits',
      'In interviews, always mention the latency vs correctness trade-off: batch gives perfect results late, streaming gives approximate results fast',
    ],

    introduction: `**Batch processing** and **stream processing** represent two fundamentally different approaches to handling data. Batch processing collects data over a period, then processes it all at once — think nightly ETL jobs, monthly reports, or Hadoop MapReduce. Stream processing handles data continuously as it arrives — think real-time dashboards, fraud detection, or live recommendation updates.

The **Lambda architecture** was proposed by Nathan Marz to get the best of both worlds: a batch layer for accurate historical results and a speed layer for low-latency approximate results. However, maintaining two separate codebases that must produce consistent results proved operationally painful, leading Jay Kreps to propose the **Kappa architecture**, which uses a single stream processing layer with the ability to reprocess historical data by replaying the log.

For system design interviews, the key is understanding **when each approach is appropriate**. Batch is simpler, cheaper, and more correct for historical analytics. Streaming is necessary when business value depends on low latency — fraud detection, real-time bidding, IoT monitoring, or live personalization. Many production systems use a hybrid approach with streaming for recent data and batch for historical corrections.`,

    keyQuestions: [
      {
        question: 'Compare Lambda vs Kappa architecture. When would you choose each?',
        answer: `**Lambda Architecture** (Nathan Marz):
Maintains two parallel pipelines — batch for accuracy, speed for freshness.

\`\`\`
                    ┌───────────────────┐
                    │   Incoming Data   │
                    └─────────┬─────────┘
                        ┌─────┴─────┐
                        ▼           ▼
              ┌──────────────┐ ┌──────────────┐
              │ Batch Layer  │ │ Speed Layer  │
              │ (MapReduce/  │ │ (Storm/Flink │
              │  Spark)      │ │  Streaming)  │
              └──────┬───────┘ └──────┬───────┘
                     │                │
              ┌──────┴───────┐ ┌──────┴───────┐
              │ Batch Views  │ │ Real-time    │
              │ (accurate,   │ │ Views (fast, │
              │  hours old)  │ │  approximate)│
              └──────┬───────┘ └──────┬───────┘
                     └────────┬───────┘
                              ▼
                    ┌─────────────────┐
                    │  Serving Layer  │
                    │  (merge both)   │
                    └─────────────────┘
\`\`\`

**Kappa Architecture** (Jay Kreps):
Single stream processing pipeline. Reprocess by replaying the log.

\`\`\`
                    ┌───────────────────┐
                    │   Incoming Data   │
                    └─────────┬─────────┘
                              ▼
                    ┌─────────────────┐
                    │  Immutable Log  │  (Kafka, retain forever)
                    │  (append-only)  │
                    └─────────┬─────────┘
                              ▼
                    ┌─────────────────┐
                    │ Stream Process  │  (single pipeline)
                    │ (Flink/KStreams)│
                    └─────────┬─────────┘
                              ▼
                    ┌─────────────────┐
                    │ Serving Layer   │
                    └─────────────────┘

  Reprocessing: deploy new job version,
  replay log from beginning, swap output
\`\`\`

**Comparison**:
\`\`\`
Criteria              Lambda             Kappa
──────────────────────────────────────────────────────
Codebase              Dual (batch+stream) Single (stream)
Operational cost      High               Lower
Historical reprocess  Native (batch)     Log replay
Latency               Low (speed layer)  Low
Correctness           High (batch layer) Depends on stream
Complexity            High               Moderate
\`\`\`

**Choose Lambda when**: You have existing batch infrastructure, need guaranteed correctness for compliance/financial reporting, or your stream processing cannot handle the full historical dataset.

**Choose Kappa when**: Building greenfield, your stream processor can handle replay at scale, and you want to avoid maintaining two codebases.`
      },
      {
        question: 'Explain windowing strategies in stream processing and when to use each.',
        answer: `**Windowing** groups unbounded streams into finite chunks for aggregation. Three primary types:

\`\`\`
Tumbling Windows (fixed, non-overlapping):
  ┌─────┐┌─────┐┌─────┐┌─────┐
  │ W1  ││ W2  ││ W3  ││ W4  │
  │0-5m ││5-10m││10-15││15-20│
  └─────┘└─────┘└─────┘└─────┘
  ──────────────────────────────► time
  Use: Hourly/daily aggregations, billing periods

Sliding Windows (fixed size, overlapping):
  ┌──────────┐
  │   W1     │
  ┌──────────┐
  │   W2     │ (slides by 1 min)
  ┌──────────┐
  │   W3     │
  ──────────────────────────────► time
  Use: Moving averages, rate calculations

Session Windows (gap-based, variable size):
  ┌──────┐  ┌────────────┐  ┌───┐
  │ S1   │  │     S2     │  │S3 │
  │(3 ev)│  │  (7 events)│  │(1)│
  └──────┘  └────────────┘  └───┘
       gap       gap         gap
  ──────────────────────────────► time
  Use: User sessions, click-stream analysis
\`\`\`

**Watermarks and late data**:
\`\`\`
Event Time:    1  2  3  [5]  4  6  7  [9]  8
                         ▲             ▲
                    Watermark=5    Watermark=9
                    (window 0-5    (can close
                     can close)     window 5-10)

Late event "4" arrives after watermark=5:
  Option 1: Drop it (simplest)
  Option 2: Allowed lateness window (refire result)
  Option 3: Side output for late data handling
\`\`\`

**Decision framework**:
\`\`\`
Question                          Window Type
──────────────────────────────────────────────
"How many orders per hour?"       Tumbling (1h)
"Average response time last 5m?"  Sliding (5m / 1m)
"Revenue per user session?"       Session (30m gap)
"Peak QPS in any 1-minute span?"  Sliding (1m / 10s)
\`\`\`

**Interview tip**: Always mention that windowing operates on **event time** (when the event happened) not **processing time** (when your system sees it). This distinction is critical for correctness with out-of-order data.`
      },
      {
        question: 'How do you handle exactly-once semantics in a streaming pipeline?',
        answer: `**The challenge**: In distributed systems, messages can be duplicated (producer retries, rebalances). Exactly-once means each message affects the output exactly once.

\`\`\`
Delivery Guarantees Spectrum:

At-most-once:   Fire and forget. Fast but may lose data.
At-least-once:  Retry on failure. No loss, but duplicates.
Exactly-once:   Each message processed once. Hardest to achieve.

Producer ──► Broker ──► Consumer ──► Sink
   │            │           │          │
   retry?    dedup?     checkpoint?  idempotent?
\`\`\`

**Achieving exactly-once end-to-end**:

**1. Idempotent producer** (Kafka):
\`\`\`
Producer assigns sequence number per partition.
Broker deduplicates: if seq already seen, ACK without storing.
  Msg(seq=5) ──► Broker: stored
  Msg(seq=5) ──► Broker: duplicate, ACK but discard
\`\`\`

**2. Transactional processing** (Kafka Streams, Flink):
\`\`\`
  Read input offset 100
  Process → produce output
  Atomically:
    - Commit output records
    - Commit input offset 101
  If crash before commit:
    - Both rolled back
    - Re-read from offset 100, reprocess
\`\`\`

**3. Idempotent sink**:
\`\`\`
  Deduplication key = (source_partition, source_offset)

  DB: INSERT ... ON CONFLICT (dedup_key) DO NOTHING
  or: UPSERT with idempotency token

  Even if the same record is delivered twice,
  the sink produces the same result.
\`\`\`

**Comparison of approaches**:
\`\`\`
Approach           Complexity  Performance   Guarantee
─────────────────────────────────────────────────────
At-most-once       Low         Best          May lose data
At-least-once +    Medium      Good          Effectively once
  idempotent sink
Transactional      High        Lower         True exactly-once
  (Kafka EOS)                  (2-phase)
\`\`\`

**Interview recommendation**: State that true exactly-once is achieved through a combination of idempotent producers, transactional offset commits, and idempotent sinks. Most production systems use at-least-once + idempotent sinks because it is simpler and nearly as effective.`
      },
      {
        question: 'When should you choose batch processing over stream processing and vice versa?',
        answer: `**Decision framework** — evaluate along five dimensions:

\`\`\`
Dimension          Batch                    Stream
──────────────────────────────────────────────────────────
Latency need       Hours/days OK            Seconds/minutes
Data completeness  Need all data            Can handle partial
Correctness        Must be exact            Approximate OK
Cost               Cheaper (spot instances) More expensive (always on)
Complexity         Simpler                  More complex
\`\`\`

**Choose BATCH when**:
\`\`\`
  ✓ Nightly ETL / data warehouse refresh
  ✓ Monthly billing calculation
  ✓ ML model training on historical data
  ✓ Compliance reports (need 100% correct)
  ✓ Backfill or migration jobs
  ✓ Data volume is bounded and periodic

  Tools: Spark, Hadoop, Airflow, dbt
\`\`\`

**Choose STREAM when**:
\`\`\`
  ✓ Fraud detection (must react in <1s)
  ✓ Real-time dashboards / monitoring
  ✓ Live recommendation updates
  ✓ IoT sensor alerting
  ✓ Real-time bidding (ad tech)
  ✓ Event-driven microservice communication

  Tools: Kafka Streams, Flink, Spark Structured Streaming
\`\`\`

**Choose HYBRID when**:
\`\`\`
  ✓ Streaming for real-time view + batch for correction
  ✓ Stream for ingest, batch for aggregation
  ✓ Example: Real-time ad click counting (stream)
    + daily reconciliation with billing (batch)

Architecture:
  Events ──► Kafka ──┬──► Flink (real-time dashboard)
                     │
                     └──► S3 ──► Spark (nightly rollup)
\`\`\`

**Cost comparison**:
\`\`\`
               Batch                    Stream
Compute:       Ephemeral (spot OK)      Always-on (reserved)
Storage:       Object store (cheap)     Log retention (moderate)
Operations:    Scheduled (cron/Airflow) 24/7 monitoring
Scaling:       Vertical + horizontal    Horizontal (partitions)
TCO for 1TB/day: ~$500-2K/month        ~$2K-10K/month
\`\`\`

**Key interview insight**: The trend is toward streaming-first with batch for correction ("Kappa with guardrails"). Modern stream processors (Flink) can handle both real-time and historical reprocessing, reducing the need for separate batch infrastructure.`
      },
    ],

    dataModel: {
      description: 'Batch vs stream processing architecture comparison',
      schema: `Batch Processing Pipeline:
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  Source   │───►│  Store   │───►│ Process  │───►│  Output  │
  │ (files,  │    │ (S3/HDFS)│    │ (Spark/  │    │ (DW/DB)  │
  │  DB dump)│    │          │    │  MR)     │    │          │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
  Schedule: hourly/daily          Duration: minutes-hours

Stream Processing Pipeline:
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  Source   │───►│  Log     │───►│ Process  │───►│  Sink    │
  │ (events, │    │ (Kafka)  │    │ (Flink/  │    │ (DB/API/ │
  │  CDC)    │    │          │    │  KStream)│    │  Kafka)  │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
  Continuous: 24/7                 Latency: ms-seconds

Hybrid (Lambda):
  Source ──► Kafka ──┬──► Flink ──► Real-time Views
                     └──► S3 ──► Spark ──► Batch Views
                                           │
                     Serving Layer ◄────────┘`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. Stateful vs Stateless (architecture)
  // ─────────────────────────────────────────────────────────
  {
    id: 'stateful-vs-stateless',
    title: 'Stateful vs Stateless Services',
    icon: 'server',
    color: '#10b981',
    questions: 7,
    description: 'Session management, horizontal scaling implications, and choosing between stateful and stateless service architectures.',
    concepts: [
      'Stateless service design principles',
      'Stateful services and session affinity',
      'Sticky sessions vs externalized state',
      'Horizontal scaling with stateless services',
      'State externalization patterns (Redis, DB)',
      'Stateful sets in Kubernetes',
      'Session replication vs session persistence',
      'Graceful degradation on state loss',
    ],
    tips: [
      'Default to stateless — it is simpler to scale, deploy, and reason about; externalize state to Redis or a database',
      'Stateful services are sometimes necessary for performance (in-memory caches, WebSocket connections, game servers)',
      'Sticky sessions solve the state problem but create hot spots and complicate rolling deployments',
      'In Kubernetes, StatefulSets give pods stable identities and persistent volumes — use for databases, not application services',
      'Always design for state loss: if a stateful node dies, the system should recover gracefully (rebuild from DB, reconnect clients)',
      'JWT tokens make authentication stateless — the token carries all needed claims, no session store required',
      'In interviews, connect stateless to 12-factor app principles — processes are disposable and share nothing',
    ],

    introduction: `The distinction between **stateful** and **stateless** services is one of the most fundamental architectural decisions in distributed systems. A **stateless service** treats each request independently — all needed context comes in the request itself, and any instance can handle any request. A **stateful service** maintains data between requests — in-memory sessions, caches, WebSocket connections, or accumulated computations.

**Stateless services** are the default choice for web application backends because they scale horizontally by simply adding more instances behind a load balancer. There are no affinity requirements, rolling deployments are trivial, and a failed instance is replaced without data loss. The trade-off is that every request must fetch state from an external store, adding latency.

**Stateful services** are necessary when the cost of externalizing state is prohibitive — real-time game servers, in-memory data grids, WebSocket hubs, or stream processing operators. The challenge is that scaling, deploying, and recovering stateful services is significantly more complex. Interviewers want to see that you understand this trade-off and can articulate clear criteria for when statefulness is justified.`,

    keyQuestions: [
      {
        question: 'How do you scale stateful services horizontally?',
        answer: `**The challenge**: Unlike stateless services where any instance handles any request, stateful services must route requests to the instance holding the relevant state.

\`\`\`
Stateless Scaling (simple):          Stateful Scaling (complex):

  LB (round-robin)                     LB (must route by state)
  ┌──┬──┬──┐                           ┌──┬──┬──┐
  │S1│S2│S3│  any can handle           │S1│S2│S3│  each holds different
  └──┴──┴──┘  any request              └──┴──┴──┘  users' state

  Add S4 → instant scaling            Add S4 → must redistribute state
  Kill S2 → no impact                 Kill S2 → state lost (or migrated)
\`\`\`

**Strategy 1 — Consistent hashing**:
\`\`\`
  Hash ring: user_id → hash → node

  Node A (0-33)    Node B (34-66)    Node C (67-99)
  ┌────────┐       ┌────────┐        ┌────────┐
  │User 12 │       │User 45 │        │User 89 │
  │User 28 │       │User 51 │        │User 73 │
  └────────┘       └────────┘        └────────┘

  Add Node D: only ~1/N keys redistribute
  Remove Node B: B's keys go to next node on ring
\`\`\`

**Strategy 2 — State externalization (convert to stateless)**:
Move state to Redis/DB. Service becomes stateless. This is the most common approach.

**Strategy 3 — State partitioning with replication**:
\`\`\`
  Partition 0: Primary=S1, Replica=S2
  Partition 1: Primary=S2, Replica=S3
  Partition 2: Primary=S3, Replica=S1

  If S1 dies: S2 promotes for Partition 0
  State is preserved via replication
\`\`\`

**Strategy 4 — StatefulSets (Kubernetes)**:
Pods get stable network IDs (pod-0, pod-1) and persistent volumes. Useful for databases and message brokers, not typical application services.

**Decision**: If you can externalize state affordably (latency is acceptable), do it. Reserve true stateful scaling for use cases where in-memory state is essential (real-time gaming, stream processing, in-memory databases).`
      },
      {
        question: 'What are the trade-offs between sticky sessions and externalized session state?',
        answer: `**Sticky sessions**: Load balancer routes all requests from the same client to the same server instance using cookies or IP hashing.

**Externalized state**: Session data is stored in Redis/Memcached/DB. Any instance can serve any request.

\`\`\`
Sticky Sessions:                     Externalized State:

Client ──► LB ──► always Server A    Client ──► LB ──► any Server
           (cookie: srv=A)                      (round-robin)
                                                  │
Server A has session in memory                    ▼
                                          ┌──────────────┐
                                          │  Redis/DB    │
                                          │  (sessions)  │
                                          └──────────────┘
\`\`\`

**Detailed comparison**:
\`\`\`
Criteria              Sticky Sessions     Externalized State
────────────────────────────────────────────────────────────
Latency               Lower (in-memory)   Higher (+network hop)
Scaling               Uneven (hot spots)  Even distribution
Server failure        Session lost        Session preserved
Rolling deploy        Drain required      Instant swap
Memory per server     Grows with sessions Fixed (stateless)
Complexity            LB config           Redis/DB infra
Cost                  Free (LB feature)   Redis/DB cost
\`\`\`

**When sticky sessions are acceptable**:
- WebSocket connections (inherently sticky)
- Development/staging environments
- Short-lived sessions where loss is tolerable
- Small scale (<10 servers) with simple load patterns

**When externalized state is required**:
- Auto-scaling groups (instances come and go)
- Multi-region deployments
- Zero-downtime deployments
- Session data must survive server restarts
- Compliance requires session auditing

**Hybrid approach**: Use in-process cache with Redis as backing store. Check local cache first (fast), fall back to Redis (consistent). Invalidate local cache on session update via pub/sub.

**Interview tip**: Always recommend externalized state as the default. Mention sticky sessions as an optimization only when latency requirements demand it and the trade-offs are acceptable.`
      },
      {
        question: 'How do JWT tokens enable stateless authentication?',
        answer: `**Traditional session auth** (stateful): Server stores session in memory/Redis. Every request must look up the session.

**JWT auth** (stateless): Token contains all claims. Server just validates the signature. No session store needed.

\`\`\`
Session-Based (Stateful):
  Login → Server creates session → stores in Redis
         → returns session_id cookie

  Request → session_id → Redis lookup → user data

  Every request: 1 Redis round-trip

JWT-Based (Stateless):
  Login → Server creates JWT(claims, signature)
         → returns token

  Request → JWT → verify signature → claims in token

  Every request: 0 external lookups (CPU only)
\`\`\`

**JWT structure**:
\`\`\`
Header.Payload.Signature
  │       │        │
  │       │        └─ HMAC-SHA256(header+payload, secret)
  │       └── {"sub":"user123","role":"admin","exp":1234567890}
  └────── {"alg":"HS256","typ":"JWT"}
\`\`\`

**Trade-offs**:
\`\`\`
Criteria              Session             JWT
─────────────────────────────────────────────────────
Stateless?            No                  Yes
Revocation            Instant (delete)    Hard (wait for expiry)
Size                  Small cookie (~32B) Large token (~1KB)
Server storage        Required (Redis)    None
Horizontal scaling    Need shared store   Any server works
Token theft impact    Kill session        Cannot revoke easily
\`\`\`

**The revocation problem**: JWTs cannot be revoked before expiry without reintroducing state.

**Solutions**:
1. Short-lived access tokens (15 min) + refresh tokens (stored in DB)
2. Token blacklist in Redis (partially stateful)
3. Token versioning: store version in DB, bump on logout

**Interview insight**: JWT does not eliminate ALL state — it moves the session state into the token. The real benefit is eliminating the per-request session store lookup, which removes a scaling bottleneck. But you trade away instant revocation.`
      },
      {
        question: 'When is a stateful service architecture justified over stateless?',
        answer: `**Criteria for choosing stateful**:

\`\`\`
  Justify stateful when ALL of these are true:
  ┌─────────────────────────────────────────────────┐
  │ 1. State is HOT (accessed every request)        │
  │ 2. External store adds UNACCEPTABLE latency     │
  │ 3. State SIZE fits in memory per instance        │
  │ 4. You CAN rebuild state on failure              │
  └─────────────────────────────────────────────────┘
\`\`\`

**Use case comparison**:
\`\`\`
Use Case               Stateful?  Reason
──────────────────────────────────────────────────────
REST API backend       No         Externalize to Redis
WebSocket chat server  Yes        Connections are inherently stateful
Real-time game server  Yes        Microsecond state access needed
ML inference service   No         Model loaded once, requests independent
Stream processing      Yes        Windowed aggregations in memory
In-memory database     Yes        That IS the purpose
Shopping cart          No         Externalize to Redis/DB
Video transcoding      No         Stateless workers, job queue
\`\`\`

**Stateful service checklist**:
\`\`\`
If stateful, you MUST handle:
  □ State recovery on crash (rebuild from source of truth)
  □ State migration during scaling (consistent hashing)
  □ Replication for durability (at least one replica)
  □ Graceful shutdown (drain connections, flush state)
  □ Health checks that verify state integrity
  □ Monitoring memory usage per instance
  □ Rolling deploy strategy (canary, blue/green)
\`\`\`

**Real-world example — Discord**:
\`\`\`
Discord's chat is stateful:
  - Each guild assigned to a specific server process
  - Server holds member presence, typing indicators, voice state
  - Consistent hashing routes guild_id → server
  - On failure: new server loads guild state from DB + reconnects clients

Why not stateless?
  - Presence updates happen 100s of times/second per guild
  - Redis round-trip per update would cost ~1ms x 100 = 100ms/s
  - In-memory: ~1 microsecond per update
\`\`\`

**Interview framework**: Default to stateless. When asked about real-time systems, explain that statefulness is a performance optimization with operational costs, not a simplicity win.`
      },
    ],

    dataModel: {
      description: 'Stateful vs stateless architecture comparison',
      schema: `Stateless Architecture:
  Client ──► Load Balancer (round-robin) ──► Any Server
                                               │
                                          ┌────┴────┐
                                          │ Redis   │  (shared state)
                                          │ / DB    │
                                          └─────────┘
  Scaling: add servers, LB distributes evenly
  Deploy: replace any server, no impact
  Failure: restart, no state lost

Stateful Architecture:
  Client ──► Load Balancer (hash-based) ──► Specific Server
                                            (holds client state)
  Scaling: consistent hashing, state redistribution
  Deploy: drain connections, migrate state, then replace
  Failure: rebuild state from source of truth, reconnect

Decision Flow:
  Is per-request external store latency acceptable?
    YES → Stateless (default)
    NO  → Is state rebuildable from a durable source?
      YES → Stateful (with recovery plan)
      NO  → Stateful + Replication (complex)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 4. Token Bucket vs Leaky Bucket (caching-processing)
  // ─────────────────────────────────────────────────────────
  {
    id: 'token-bucket-vs-leaky-bucket',
    title: 'Token Bucket vs Leaky Bucket',
    icon: 'filter',
    color: '#3b82f6',
    questions: 7,
    description: 'Rate limiting algorithms comparison — token bucket, leaky bucket, fixed window, sliding window log, and sliding window counter.',
    concepts: [
      'Token bucket algorithm',
      'Leaky bucket algorithm',
      'Fixed window counters',
      'Sliding window log',
      'Sliding window counter (hybrid)',
      'Distributed rate limiting (Redis)',
      'Rate limiting headers (X-RateLimit-*)',
      'Adaptive and dynamic rate limiting',
    ],
    tips: [
      'Token bucket allows bursts up to the bucket size while maintaining a long-term average rate — most APIs use this',
      'Leaky bucket smooths traffic to a constant output rate — use when downstream systems cannot handle bursts',
      'Fixed window has a boundary problem: 2x the rate can pass at the window boundary (end of one + start of next)',
      'Sliding window counter is the practical sweet spot — good accuracy, low memory, and easy to implement in Redis',
      'In distributed systems, use Redis INCR + EXPIRE for centralized rate limiting, or local rate limiters with a global budget',
      'Always return rate limit headers so clients can self-regulate: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
    ],

    introduction: `**Rate limiting** is a critical mechanism for protecting services from overload, ensuring fair usage, and preventing abuse. The two most fundamental algorithms — **token bucket** and **leaky bucket** — take opposite approaches to handling bursty traffic. Token bucket accumulates tokens over time and allows bursts up to the bucket capacity, while leaky bucket processes requests at a fixed rate regardless of input burstiness.

Beyond these two, practical systems often use **fixed window**, **sliding window log**, or **sliding window counter** algorithms, each with different trade-offs in accuracy, memory usage, and implementation complexity. The choice depends on whether you need to allow bursts, require smooth output, or need precise per-second guarantees.

In system design interviews, rate limiting appears in API gateway design, distributed systems, and any user-facing service discussion. Interviewers expect you to compare algorithms, explain the distributed rate limiting challenge (multiple servers sharing a rate limit), and discuss where to place rate limiters in the architecture (client, gateway, service, database).`,

    keyQuestions: [
      {
        question: 'Compare token bucket and leaky bucket algorithms. When would you use each?',
        answer: `**Token Bucket**: Tokens accumulate at a fixed rate. Each request consumes a token. If bucket is empty, request is rejected. Bucket has a maximum capacity (allows bursts).

**Leaky Bucket**: Requests enter a queue (bucket). The queue drains at a fixed rate. If queue is full, new requests are dropped. Output is always at a constant rate.

\`\`\`
Token Bucket:                        Leaky Bucket:

Tokens added at rate R               Requests enter queue
  │                                    │
  ▼                                    ▼
┌─────────┐                          ┌─────────┐
│ ● ● ● ● │ capacity = B            │ ● ● ● ● │ capacity = B
│ ● ● ●   │                         │ ● ● ●   │
└────┬─────┘                         └────┬─────┘
     │ consume 1 token per request        │ drain at constant rate R
     ▼                                    ▼
  Request passes                      Processed at rate R
  (burst OK up to B)                  (smooth output)
\`\`\`

**Behavior comparison with burst traffic**:
\`\`\`
Input:  ████████░░░░████████░░░░████████
        (burst)    (quiet)   (burst)

Token Bucket Output:
        ████████░░░░████████░░░░████████
        (allows burst up to bucket size)

Leaky Bucket Output:
        ████░░██░░░░████░░██░░░░████░░██
        (smooths everything to constant rate)
\`\`\`

**Comparison**:
\`\`\`
Criteria              Token Bucket        Leaky Bucket
──────────────────────────────────────────────────────────
Burst handling        Allows (up to B)    Smooths out
Output rate           Variable            Constant
Implementation        Counter + timer     Queue + timer
Memory                O(1) - just counter O(B) - queue
Use case              API rate limiting   Traffic shaping
Fairness              Can starve others   Even distribution
Parameters            Rate R, Bucket B    Rate R, Queue B
\`\`\`

**Choose token bucket when**: You want to allow reasonable bursts (API rate limiting, user quotas). Most REST APIs use this (Stripe, GitHub, AWS).

**Choose leaky bucket when**: Downstream systems require a smooth, constant input rate (network traffic shaping, database write throttling, message queue consumption).`
      },
      {
        question: 'Explain fixed window, sliding window log, and sliding window counter trade-offs.',
        answer: `**Fixed Window**: Count requests in fixed time intervals. Simple but has boundary spike problem.

**Sliding Window Log**: Track timestamp of each request. Precise but memory-intensive.

**Sliding Window Counter**: Weighted combination of current and previous window. Good balance.

\`\`\`
Fixed Window (boundary problem):
  Window 1 [0:00-1:00]    Window 2 [1:00-2:00]
  ░░░░░░░░░░█████         █████░░░░░░░░░░░░
  (5 req at 0:59)         (5 req at 1:00)

  Limit: 5 req/min. But 10 requests pass in 2 seconds!

Sliding Window Log:
  Track every timestamp: [0:45, 0:50, 0:55, 0:59, 1:00]
  At time 1:01, check: how many in [0:01 - 1:01]?
  Remove entries < 0:01, count remaining

  Precise! But stores every timestamp → O(N) memory

Sliding Window Counter:
  Previous window count: 5 (weight: 40% remaining)
  Current window count:  2 (weight: 60% elapsed)
  Estimated: 5 * 0.4 + 2 = 4.0
  Limit: 5 → ALLOW (4.0 < 5)

  Approximate but O(1) memory!
\`\`\`

**Detailed comparison**:
\`\`\`
Algorithm          Memory     Accuracy    Complexity  Boundary
─────────────────────────────────────────────────────────────
Fixed window       O(1)       Low         Simple      2x spike
Sliding log        O(N)       Exact       Medium      None
Sliding counter    O(1)       ~High       Medium      Minimal
Token bucket       O(1)       N/A*        Simple      N/A
Leaky bucket       O(B)       N/A*        Simple      N/A

* Token/Leaky bucket are not window-based, so boundary
  does not apply. They enforce rate differently.
\`\`\`

**Redis implementation of sliding window counter**:
\`\`\`
MULTI
  current = INCR  rate:user123:current_minute
  EXPIRE rate:user123:current_minute 120
  prev = GET rate:user123:prev_minute
EXEC

weight = (60 - seconds_into_current_minute) / 60
estimated = prev * weight + current
if estimated > limit: REJECT
\`\`\`

**Interview recommendation**: Sliding window counter is the best practical choice for most systems — O(1) memory, good accuracy, easy Redis implementation. Mention the fixed window boundary problem to show depth.`
      },
      {
        question: 'How do you implement distributed rate limiting across multiple servers?',
        answer: `**The challenge**: Rate limit is 100 req/min per user, but you have 10 servers. Each server cannot independently enforce 100/min — a user hitting all 10 servers could make 1000 req/min.

\`\`\`
Problem: Local-only rate limiting
  Server 1: 100 req ✓ (limit 100)
  Server 2: 100 req ✓ (limit 100)
  ...
  Server 10: 100 req ✓ (limit 100)
  Total: 1000 req passed! (should be 100)
\`\`\`

**Approach 1 — Centralized counter (Redis)**:
\`\`\`
  All servers check/increment a shared Redis counter

  Server ──► Redis: INCR user:123:minute_42
           ◄── returns current count
           → if count > limit: REJECT

  Pros: Accurate, simple
  Cons: Redis latency (~1ms), SPOF

  Mitigation: Redis Cluster for HA,
    local fallback if Redis is down
\`\`\`

**Approach 2 — Local rate limiter with global budget**:
\`\`\`
  Global limit: 100 req/min
  10 servers → each gets 10 req/min local budget

  Server 1: local limit = 10/min (no Redis needed)
  Server 2: local limit = 10/min
  ...

  Pros: No external dependency, fast
  Cons: Uneven traffic → wasted budget
    Server 1 gets 50 req, Server 2 gets 0
    Server 1 rejects 40 that could be served
\`\`\`

**Approach 3 — Hybrid (best practice)**:
\`\`\`
  Local token bucket (fast path)
    + periodic sync with Redis (accuracy)

  1. Each server maintains local token bucket
  2. Every N seconds, sync with Redis:
     - Report local consumption
     - Get updated allocation
  3. Between syncs, use local bucket

  Example (sync every 5s):
    Server reports: "I used 8 tokens"
    Redis: "Global: 45/100 used. Your new allocation: 12"
\`\`\`

**Approach 4 — Sticky routing**:
\`\`\`
  Route user X always to Server A
  Server A enforces full rate limit locally

  Pros: Simple, accurate, no shared state
  Cons: Uneven load, single point of failure per user
\`\`\`

**Comparison**:
\`\`\`
Approach          Accuracy  Latency   Complexity  Failure Mode
─────────────────────────────────────────────────────────────
Centralized Redis High      +1ms      Low         Redis down = no limiting
Local budget      Low       None      Low         Wastes capacity
Hybrid sync       Medium    ~None     Medium      Degrades gracefully
Sticky routing    High      None      Low         User stuck on dead server
\`\`\`

**Interview tip**: Recommend centralized Redis for most systems (simple, accurate). Mention the hybrid approach for ultra-high throughput systems where Redis round-trip per request is too costly.`
      },
      {
        question: 'Where should rate limiting be placed in a system architecture?',
        answer: `**Rate limiting can exist at multiple layers**, each catching different types of abuse:

\`\`\`
Layer              What it limits              Tool
─────────────────────────────────────────────────────────
Client SDK         Self-regulation             Local token bucket
CDN/Edge           DDoS, geographic blocks     Cloudflare, AWS WAF
API Gateway        Per-user API quotas         Kong, Envoy, nginx
Service mesh       Inter-service calls         Istio, Linkerd
Application        Business logic limits       Custom middleware
Database           Query rate, connections     Connection pool, pg_bouncer
\`\`\`

**Layered architecture**:
\`\`\`
  Internet
     │
     ▼
  ┌─────────────┐
  │   CDN/WAF   │ ◄── IP-based, geographic, DDoS (L3/L4)
  │ (Cloudflare)│     Limit: 10K req/s per IP
  └──────┬──────┘
         │
  ┌──────┴──────┐
  │ API Gateway │ ◄── Per-user, per-API-key (L7)
  │ (Kong/Envoy)│     Limit: 100 req/min per user
  └──────┬──────┘
         │
  ┌──────┴──────┐
  │  Service A  │ ◄── Business logic limits
  │             │     Limit: 5 password attempts/hour
  └──────┬──────┘
         │
  ┌──────┴──────┐
  │  Service B  │ ◄── Inter-service rate limiting
  │  (downstream│     Service mesh sidecar enforces
  └──────┬──────┘
         │
  ┌──────┴──────┐
  │  Database   │ ◄── Connection pool limits
  │             │     Max 100 connections
  └─────────────┘
\`\`\`

**Best practices**:
\`\`\`
1. Apply at the EARLIEST point possible
   → CDN blocks obvious abuse before it hits your servers

2. Use DIFFERENT limits per layer
   → Gateway: 1000 req/min (all endpoints)
   → App: 5 password attempts/hour (sensitive endpoint)

3. Return informative headers:
   HTTP/1.1 429 Too Many Requests
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1620000060
   Retry-After: 30

4. Differentiate by tier:
   Free tier:  100 req/min
   Pro tier:   1000 req/min
   Enterprise: 10000 req/min + burst allowance

5. Monitor and alert:
   → Track rejection rate per user/endpoint
   → Alert if legitimate users are being limited
   → Adjust limits based on capacity planning
\`\`\`

**Interview tip**: Start with API gateway rate limiting (covers 90% of cases), then mention layered defense for production systems. Always discuss what happens when the rate limiter itself fails — default to open (allow) or closed (deny) based on your security requirements.`
      },
    ],

    dataModel: {
      description: 'Rate limiting algorithm comparison and architecture',
      schema: `Token Bucket State:
  tokens:      current token count (0 to max_bucket_size)
  max_tokens:  bucket capacity (burst size)
  refill_rate: tokens added per second
  last_refill: timestamp of last refill

Leaky Bucket State:
  queue:       FIFO queue of pending requests
  queue_size:  max queue capacity
  drain_rate:  requests processed per second
  last_drain:  timestamp of last drain

Sliding Window Counter State:
  current_count:    requests in current window
  previous_count:   requests in previous window
  window_start:     start of current window
  window_size:      window duration (e.g., 60s)

Rate Limit Decision Flow:
  Request arrives
    → Identify client (API key, IP, user ID)
    → Check rate limit (algorithm-specific)
    → If under limit: ALLOW, decrement/increment counter
    → If over limit: REJECT with 429 + headers
    → Log decision for monitoring`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 5. SQL vs NoSQL Trade-offs (data-storage)
  // ─────────────────────────────────────────────────────────
  {
    id: 'sql-vs-nosql-tradeoffs',
    title: 'SQL vs NoSQL Trade-offs',
    icon: 'database',
    color: '#8b5cf6',
    questions: 8,
    description: 'When to use relational vs non-relational databases, CAP theorem implications, and choosing the right data store for your use case.',
    concepts: [
      'ACID vs BASE properties',
      'CAP theorem and practical implications',
      'Document stores (MongoDB, DynamoDB)',
      'Wide-column stores (Cassandra, HBase)',
      'Key-value stores (Redis, DynamoDB)',
      'Graph databases (Neo4j, Neptune)',
      'Schema flexibility vs data integrity',
      'Horizontal scaling (sharding) differences',
    ],
    tips: [
      'SQL is the right default for most applications — do not choose NoSQL just because it is trendy or "web-scale"',
      'NoSQL shines when your data model naturally fits (documents, graphs, time-series) or when you need horizontal write scaling beyond what a single SQL node handles',
      'CAP theorem in practice: most systems choose between CP (consistency + partition tolerance) and AP (availability + partition tolerance) — you always need P in distributed systems',
      'DynamoDB and Cassandra are designed for AP workloads — high availability with eventual consistency; PostgreSQL and CockroachDB are CP',
      'In interviews, do not frame it as SQL vs NoSQL — frame it as "what are my access patterns, consistency requirements, and scale needs?"',
      'Polyglot persistence is common: SQL for transactions, Redis for caching, Elasticsearch for search, DynamoDB for high-throughput simple lookups',
      'Schema-on-write (SQL) catches errors early; schema-on-read (NoSQL) gives flexibility but moves validation to application code',
    ],

    introduction: `The **SQL vs NoSQL** debate is one of the most commonly misunderstood trade-offs in system design. Relational databases (PostgreSQL, MySQL) provide strong consistency, ACID transactions, and a flexible query language. NoSQL databases (MongoDB, Cassandra, DynamoDB, Redis) offer different data models, horizontal scalability, and schema flexibility. Neither is universally better — the choice depends on your data model, access patterns, consistency requirements, and scale.

The **CAP theorem** states that a distributed data store can provide at most two of three guarantees: **Consistency**, **Availability**, and **Partition tolerance**. Since network partitions are inevitable in distributed systems, the practical choice is between CP (consistency during partitions, sacrificing availability) and AP (availability during partitions, accepting stale reads). SQL databases typically favor CP, while many NoSQL databases favor AP.

In interviews, the strongest answer is never "use NoSQL because it scales" or "use SQL because it has joins." It is: "Given these access patterns, consistency requirements, and scale expectations, here is why this data store fits." The best architectures often use multiple data stores — **polyglot persistence** — with each store optimized for its specific workload.`,

    keyQuestions: [
      {
        question: 'When should you choose SQL over NoSQL and vice versa?',
        answer: `**Decision framework** based on workload characteristics:

\`\`\`
Choose SQL When:                     Choose NoSQL When:
──────────────────────────────────────────────────────────
Complex joins / relationships        Simple key-based lookups
ACID transactions required           Eventual consistency OK
Schema is well-defined               Schema evolves rapidly
Read patterns are ad-hoc/flexible    Access patterns are known
Scale fits single node (most apps)   Need horizontal write scaling
Referential integrity matters        Denormalized data is fine
Reporting / analytics needed         Real-time at massive scale
\`\`\`

**Specific NoSQL type selection**:
\`\`\`
Data Model          Use When                     Example DB
─────────────────────────────────────────────────────────────
Document (JSON)     Varied object structures,    MongoDB
                    embedded data, catalogs      DynamoDB

Wide-column         Time-series, IoT, high       Cassandra
                    write throughput, analytics   HBase

Key-value           Caching, sessions, config    Redis
                    simple lookups               Memcached

Graph               Social networks, fraud       Neo4j
                    detection, recommendations   Neptune

Time-series         Metrics, monitoring, logs    InfluxDB
                    financial tick data           TimescaleDB
\`\`\`

**Real-world examples**:
\`\`\`
Uber:
  PostgreSQL → trip records (ACID, reporting)
  Cassandra  → location updates (high write, AP)
  Redis      → driver availability (low latency)

Netflix:
  MySQL      → user accounts, billing (ACID)
  Cassandra  → viewing history (high write, eventual)
  EVCache    → session data, recommendations

Your startup:
  PostgreSQL → almost everything (until you prove otherwise)
  Redis      → caching, rate limiting
\`\`\`

**Interview tip**: Start with PostgreSQL as the default. Only introduce NoSQL when you can articulate the specific limitation SQL hits for that use case (write throughput, data model mismatch, or latency at scale).`
      },
      {
        question: 'Explain the CAP theorem and its practical implications for database selection.',
        answer: `**CAP Theorem**: A distributed data store can guarantee at most two of:
- **C**onsistency: every read returns the most recent write
- **A**vailability: every request gets a response (not guaranteed to be latest)
- **P**artition tolerance: system continues despite network failures between nodes

\`\`\`
The CAP Triangle:
                    C (Consistency)
                   / \\
                  /   \\
                 /     \\
          CP ──/── CA ──\\── AP
              /         \\
             /           \\
            P ─────────── A
     (Partition tol.)  (Availability)

CP: Consistent + Partition-tolerant (reject requests during partition)
AP: Available + Partition-tolerant (serve stale data during partition)
CA: Consistent + Available (not possible in distributed systems)
\`\`\`

**Why P is non-negotiable**: Network partitions WILL happen (cable cuts, router failures, cloud AZ isolation). A system that does not handle partitions is effectively a single-node system.

**Practical database classification**:
\`\`\`
CP Systems (consistency over availability):
  PostgreSQL, MySQL (with sync replication)
  MongoDB (with majority write concern)
  CockroachDB, Google Spanner
  ZooKeeper, etcd, Consul
  HBase

  During partition: refuse writes to maintain consistency

AP Systems (availability over consistency):
  Cassandra, DynamoDB
  Riak, CouchDB
  DNS

  During partition: accept writes, resolve conflicts later
  Conflict resolution: last-write-wins, vector clocks, CRDTs
\`\`\`

**The PACELC extension**:
\`\`\`
  If Partition:
    choose A or C         (same as CAP)
  Else (normal operation):
    choose Latency or Consistency

  PA/EL: Cassandra, DynamoDB (available, low latency)
  PC/EC: PostgreSQL, Spanner (consistent always)
  PA/EC: rare
  PC/EL: MongoDB default (consistent on partition, fast normally)
\`\`\`

**Interview tip**: Do not just state CAP — explain PACELC, because during normal operation (99.99% of the time) the latency vs consistency trade-off matters more than the partition behavior.`
      },
      {
        question: 'How do ACID and BASE differ, and when does each matter?',
        answer: `**ACID** (SQL databases): Atomicity, Consistency, Isolation, Durability
**BASE** (many NoSQL databases): Basically Available, Soft state, Eventually consistent

\`\`\`
ACID Transaction:                    BASE Transaction:

BEGIN;                               Write to Node A (immediate ACK)
  Debit account A: -$100                │
  Credit account B: +$100               │ (async replication)
COMMIT; (atomic — both or neither)       ▼
                                     Node B, Node C get update
All reads see consistent state       eventually (ms to seconds)
immediately after commit
                                     Reads from B may see stale
                                     state briefly
\`\`\`

**Detailed comparison**:
\`\`\`
Property        ACID                    BASE
─────────────────────────────────────────────────────
Atomicity       All-or-nothing txn      No multi-record atomicity
Consistency     Immediate               Eventual
Isolation       Serializable possible   No isolation guarantees
Durability      Guaranteed on commit    Usually guaranteed
Availability    May block on conflicts  Always available
Scalability     Harder to distribute    Designed for distribution
Complexity      DB handles it           App handles conflicts
\`\`\`

**When ACID is critical**:
\`\`\`
  ✓ Financial transactions (bank transfers, payments)
  ✓ Inventory management (cannot oversell)
  ✓ User account operations (email change, password reset)
  ✓ Order processing (payment + fulfillment atomic)
  ✓ Any case where inconsistency = money loss or legal risk
\`\`\`

**When BASE is acceptable**:
\`\`\`
  ✓ Social media feeds (seeing a post 1s late is fine)
  ✓ Analytics counters (approximate counts OK)
  ✓ Product catalog browsing (stale price briefly OK)
  ✓ Notification delivery (duplicates tolerable)
  ✓ Recommendation engines (slight staleness fine)
\`\`\`

**Hybrid approach** (common in practice):
\`\`\`
  Order Service:
    PostgreSQL (ACID) ─── payment, inventory reservation
    │
    ▼ (event published)
    │
  Notification Service:
    DynamoDB (BASE) ─── delivery tracking, email logs

  Use ACID for the critical path, BASE for everything else.
\`\`\`

**Interview insight**: The question is never "ACID or BASE?" — it is "which operations in my system require ACID guarantees?" Often only 10-20% of operations truly need strong consistency. Design those with SQL and use NoSQL for the rest.`
      },
      {
        question: 'How does horizontal scaling differ between SQL and NoSQL databases?',
        answer: `**SQL horizontal scaling** is possible but complex. **NoSQL** was designed for it from the ground up.

\`\`\`
SQL Vertical Scaling (traditional):
  ┌──────────────┐
  │  Single DB   │  ← Add CPU, RAM, faster disks
  │  (bigger HW) │  ← Works until hardware limits
  └──────────────┘  ← Typical limit: ~10TB, 100K QPS

SQL Horizontal Scaling:
  ┌──────┐ ┌──────┐ ┌──────┐
  │Shard1│ │Shard2│ │Shard3│  ← Split data by key
  │(A-H) │ │(I-P) │ │(Q-Z) │  ← Cross-shard joins = pain
  └──────┘ └──────┘ └──────┘  ← Cross-shard txns = 2PC

NoSQL Horizontal Scaling (native):
  ┌──────┐ ┌──────┐ ┌──────┐
  │Node 1│ │Node 2│ │Node 3│  ← Auto-sharding by partition key
  │      │ │      │ │      │  ← No joins (by design)
  └──────┘ └──────┘ └──────┘  ← Add nodes = automatic rebalance
\`\`\`

**Challenges of SQL sharding**:
\`\`\`
Challenge              Impact                 Solution
─────────────────────────────────────────────────────────
Cross-shard joins      Slow, complex          Denormalize or app-level join
Cross-shard txns       2PC overhead           Saga pattern
Schema changes         Must run on all shards Rolling DDL migrations
Auto-increment IDs     Conflicts across shards UUID or snowflake IDs
Shard key selection    Wrong key = hot spots  Analyze access patterns first
Rebalancing            Data movement          Consistent hashing + vNodes
\`\`\`

**NewSQL — the middle ground**:
\`\`\`
Database         Approach
──────────────────────────────────────────────────
CockroachDB      Distributed SQL, auto-sharding, serializable
Google Spanner   Global consistency with TrueTime
TiDB             MySQL-compatible, distributed
Vitess           MySQL sharding middleware (YouTube)
Citus            PostgreSQL extension for sharding

These give SQL semantics with NoSQL-like horizontal scaling,
at the cost of higher latency per query.
\`\`\`

**Scaling decision framework**:
\`\`\`
Current scale        Recommendation
──────────────────────────────────────────────────
< 1TB, < 10K QPS     Single PostgreSQL (just scale up)
1-10TB, 10-100K QPS   Read replicas + connection pooling
10-100TB, 100K+ QPS   Shard or migrate to NewSQL
> 100TB, 1M+ QPS      NoSQL or specialized data store
\`\`\`

**Interview tip**: Most companies never outgrow a single PostgreSQL node. Do not over-engineer with NoSQL sharding for a system that will have <1TB of data. Start with SQL, add read replicas, and shard only when you have concrete evidence of need.`
      },
    ],

    dataModel: {
      description: 'SQL vs NoSQL decision matrix and architecture',
      schema: `Database Selection Decision Tree:
  What are your access patterns?
    ├── Complex queries, joins, ad-hoc? → SQL (PostgreSQL, MySQL)
    ├── Simple key-value lookups? → Key-value (Redis, DynamoDB)
    ├── Document/object storage? → Document (MongoDB)
    ├── Wide-column/time-series? → Wide-column (Cassandra)
    ├── Graph traversals? → Graph (Neo4j)
    └── Full-text search? → Search engine (Elasticsearch)

  What consistency do you need?
    ├── Strong (ACID)? → SQL, CockroachDB, Spanner
    └── Eventual (BASE)? → Cassandra, DynamoDB, CouchDB

  What scale do you need?
    ├── < 10TB? → Single SQL node is fine
    ├── 10-100TB? → Sharded SQL or NewSQL
    └── > 100TB? → Purpose-built NoSQL

Polyglot Persistence Example (E-Commerce):
  PostgreSQL  ── orders, payments, users (ACID)
  Redis       ── sessions, cache, rate limits (speed)
  Elasticsearch ── product search (full-text)
  Cassandra   ── click-stream, analytics (write throughput)
  S3          ── images, static assets (blob storage)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 6. Normalization vs Denormalization (data-storage)
  // ─────────────────────────────────────────────────────────
  {
    id: 'normalization-vs-denormalization',
    title: 'Normalization vs Denormalization',
    icon: 'grid',
    color: '#8b5cf6',
    questions: 7,
    description: 'Read vs write optimization — when to normalize for data integrity and when to denormalize for read performance.',
    concepts: [
      'Normal forms (1NF through 3NF/BCNF)',
      'Denormalization for read performance',
      'Materialized views',
      'Data redundancy and update anomalies',
      'CQRS as structured denormalization',
      'Denormalization in NoSQL design',
      'Fan-out on write vs fan-out on read',
      'Consistency maintenance for denormalized data',
    ],
    tips: [
      'Normalize first, denormalize when profiling shows read performance is the bottleneck — premature denormalization leads to data integrity nightmares',
      'Denormalization trades write complexity for read speed — every write must update all denormalized copies',
      'Materialized views give you denormalized read performance with automatic refresh — use them before manual denormalization',
      'In NoSQL, denormalization is the norm because there are no joins — design your documents/partitions around access patterns',
      'Fan-out on write (denormalize at write time) is better when reads vastly outnumber writes (social media feeds)',
      'Fan-out on read (normalize, join at read time) is better when writes are frequent and read patterns are unpredictable',
      'In interviews, always discuss the consistency cost: who is responsible for keeping denormalized copies in sync?',
    ],

    introduction: `**Normalization** organizes data to eliminate redundancy and ensure integrity — each fact is stored exactly once. **Denormalization** deliberately introduces redundancy to optimize read performance by pre-computing joins and aggregations. This is one of the most fundamental trade-offs in database design.

In a normalized schema, updating a user's name requires changing one row. In a denormalized schema where the user's name is embedded in every order, comment, and message, that same update requires modifying hundreds or thousands of rows. The normalized schema guarantees consistency; the denormalized schema guarantees fast reads without joins.

For system design interviews, the key insight is that this trade-off is not binary — it is a spectrum. Most production systems use a **selectively denormalized** schema: normalize the source of truth, denormalize heavily-read paths (dashboards, feeds, search), and use materialized views, CDC pipelines, or CQRS to keep the denormalized views in sync. The decision hinges on your **read-to-write ratio** and **consistency requirements**.`,

    keyQuestions: [
      {
        question: 'When should you denormalize, and what are the risks?',
        answer: `**Denormalize when ALL of these conditions are met**:

\`\`\`
  ┌──────────────────────────────────────────────────┐
  │ 1. Read performance is a MEASURED bottleneck      │
  │ 2. Read-to-write ratio is high (>10:1)           │
  │ 3. The data being denormalized changes rarely     │
  │ 4. You have a plan for keeping copies in sync    │
  └──────────────────────────────────────────────────┘
\`\`\`

**Normalized vs Denormalized example**:
\`\`\`
NORMALIZED (3 tables, requires JOIN):
  orders: {order_id, user_id, product_id, qty}
  users:  {user_id, name, email}
  products: {product_id, title, price}

  SELECT o.*, u.name, p.title, p.price
  FROM orders o
  JOIN users u ON o.user_id = u.user_id
  JOIN products p ON o.product_id = p.product_id
  → 2 JOINs per query

DENORMALIZED (1 table, no JOIN):
  orders: {order_id, user_id, user_name, user_email,
           product_id, product_title, product_price, qty}

  SELECT * FROM orders WHERE order_id = 123
  → 0 JOINs, single table scan
\`\`\`

**Risks of denormalization**:
\`\`\`
Risk                    Impact                    Mitigation
──────────────────────────────────────────────────────────────
Update anomalies        User renames → must update  CDC pipeline, async
                        all orders with old name    update job
Data inconsistency      Some copies updated, some   Eventual consistency
                        not (race conditions)       with reconciliation
Storage bloat           Redundant data uses more    Acceptable at scale
                        disk and cache space        (storage is cheap)
Write amplification     One logical update → many   Batch writes, async
                        physical writes             propagation
Schema rigidity         Adding fields requires      Versioned schemas,
                        updating all copies         migration jobs
\`\`\`

**Interview tip**: Always say "I would start normalized and denormalize based on profiling data." This shows you understand that denormalization is an optimization, not a default.`
      },
      {
        question: 'Compare fan-out on write vs fan-out on read for a social media feed.',
        answer: `**Fan-out on write**: When a user posts, immediately write the post to all followers' feeds (denormalized).

**Fan-out on read**: When a user opens their feed, query all followed users' posts and merge at read time (normalized).

\`\`\`
Fan-Out on Write (push model):
  User A posts
    │
    ├──► Write to Follower B's feed cache
    ├──► Write to Follower C's feed cache
    ├──► Write to Follower D's feed cache
    └──► ... (N followers = N writes)

  When B opens feed: read B's pre-built feed (fast!)

Fan-Out on Read (pull model):
  User B opens feed
    │
    ├──► Query User A's posts (B follows A)
    ├──► Query User C's posts (B follows C)
    ├──► Query User D's posts (B follows D)
    └──► Merge + sort + return (N follows = N reads)
\`\`\`

**Comparison**:
\`\`\`
Criteria              Fan-Out Write      Fan-Out Read
──────────────────────────────────────────────────────────
Write latency         High (N writes)    Low (1 write)
Read latency          Low (pre-built)    High (N queries + merge)
Storage               High (N copies)    Low (single copy)
Celebrity problem     Terrible (1M+)     Handled naturally
Consistency           Eventual           Real-time
Best for              Normal users       Celebrity/popular users
\`\`\`

**The celebrity problem**:
\`\`\`
  Beyonce posts (80M followers):

  Fan-out write: 80M writes per post!
    → Minutes to propagate
    → Massive write spike on infrastructure

  Solution: HYBRID approach
    ├── Normal users (<10K followers): fan-out on write
    └── Celebrities (>10K followers): fan-out on read

  When B opens feed:
    1. Read B's pre-built feed (from normal users)  [fast]
    2. Query celebrity posts B follows              [few queries]
    3. Merge and return                             [balanced]
\`\`\`

**Twitter's actual approach**: Hybrid. Normal users' tweets are fanned out at write time into followers' timelines (Redis lists). Celebrity tweets are mixed in at read time. This keeps write costs bounded while maintaining fast reads for 99% of users.

**Interview insight**: Always mention the hybrid approach. It shows you understand that neither extreme works at scale, and the optimal solution is workload-aware.`
      },
      {
        question: 'How do materialized views help bridge normalization and denormalization?',
        answer: `**Materialized views** are pre-computed query results stored as a physical table. They give you denormalized read performance while the source tables remain normalized.

\`\`\`
Normalized Tables (source of truth):
  orders    ──┐
  users     ──├──► Materialized View ──► Fast reads
  products  ──┘    (pre-joined, aggregated)

Regular View:         Materialized View:
  SELECT ... JOIN     SELECT * FROM mv_order_summary
  (computed on read)  (pre-computed, stored on disk)

  Latency: 50ms       Latency: 2ms
  Always fresh         Stale until refresh
\`\`\`

**Refresh strategies**:
\`\`\`
Strategy          Freshness        Cost            Use Case
──────────────────────────────────────────────────────────────
Full refresh      Periodic         Expensive        Small MVs, hourly OK
  (REFRESH MATERIALIZED VIEW)      (recomputes all)

Incremental       Near-real-time   Cheaper          Large MVs, CDC-based
  (only apply diffs from source)   (only changes)

Eager (on write)  Immediate        Write overhead   Small, critical MVs
  (trigger updates MV on INSERT)   (sync on write)
\`\`\`

**PostgreSQL example**:
\`\`\`sql
-- Create materialized view
CREATE MATERIALIZED VIEW mv_order_summary AS
SELECT o.order_id, u.name AS user_name,
       p.title AS product_title, o.qty * p.price AS total
FROM orders o
JOIN users u ON o.user_id = u.user_id
JOIN products p ON o.product_id = p.product_id;

-- Create index on the MV for fast lookups
CREATE INDEX idx_mv_order_user ON mv_order_summary(user_name);

-- Refresh periodically (e.g., via cron every 5 min)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_summary;
-- CONCURRENTLY allows reads during refresh (requires unique index)
\`\`\`

**When materialized views are not enough**:
\`\`\`
Limitation                           Alternative
───────────────────────────────────────────────────
Cross-database joins                 CDC + denormalized table
Sub-second freshness needed          CQRS with event streaming
Complex transformations              Stream processing (Flink)
NoSQL source (no MV support)         Application-level MV
\`\`\`

**Interview tip**: Materialized views are the first tool to reach for before manual denormalization. They keep the source of truth normalized while giving read performance. Only move to manual denormalization or CQRS when MVs cannot meet freshness or cross-system requirements.`
      },
      {
        question: 'How does CQRS relate to normalization vs denormalization?',
        answer: `**CQRS** (Command Query Responsibility Segregation) formalizes the idea of having different data models for reads and writes — the write model is normalized for integrity, and the read model is denormalized for performance.

\`\`\`
Traditional (single model):
  ┌──────────────────┐
  │   Application    │
  │  ┌────────────┐  │
  │  │ Single DB  │  │  ← Same schema for reads AND writes
  │  │ (normalized│  │  ← Reads need JOINs
  │  │  or not)   │  │  ← Writes need to update denormalized copies
  │  └────────────┘  │
  └──────────────────┘

CQRS (separated models):
  ┌──────────────────────────────────────────────┐
  │                Application                    │
  │                                               │
  │  Command Side         Query Side              │
  │  (writes)             (reads)                 │
  │  ┌──────────┐         ┌──────────────┐        │
  │  │ Write DB │──event──│ Read Store   │        │
  │  │(normal-  │  stream │(denormalized,│        │
  │  │ ized)    │         │ pre-joined)  │        │
  │  └──────────┘         └──────────────┘        │
  └──────────────────────────────────────────────┘
\`\`\`

**How CQRS maintains consistency**:
\`\`\`
1. Write arrives → Write DB (normalized, ACID)
2. Write DB emits event (CDC or outbox pattern)
3. Event processor updates Read Store (denormalized)
4. Read queries hit Read Store (fast, no joins)

Timeline:
  T=0:   Write committed to Write DB
  T=10ms: Event published
  T=50ms: Read Store updated (eventual consistency)
  T=50ms+: Reads see new data
\`\`\`

**CQRS + Event Sourcing** (advanced):
\`\`\`
  Commands ──► Event Store ──► events ──► Read Model
                (append-only)            (projection)

  Event Store: [OrderPlaced, ItemAdded, PaymentReceived]
  Read Model:  orders_summary table (materialized from events)

  Benefits:
  - Complete audit trail
  - Rebuild read model from events anytime
  - Multiple read models from same events
\`\`\`

**When to use CQRS**:
\`\`\`
  ✓ Read and write models are very different
  ✓ Read-to-write ratio is >100:1
  ✓ Different scaling needs (reads >> writes)
  ✓ Complex domain with event sourcing

  ✗ Simple CRUD applications (overkill)
  ✗ Team is unfamiliar with eventual consistency
  ✗ Strong consistency required on reads
\`\`\`

**Interview tip**: CQRS is the architecturally clean version of "denormalize for reads." Position it as the solution when ad-hoc denormalization becomes unmaintainable. Mention that it introduces eventual consistency, which must be acceptable for the use case.`
      },
    ],

    dataModel: {
      description: 'Normalization vs denormalization spectrum',
      schema: `Normalization Spectrum:
  ┌──────────────────────────────────────────────────────────┐
  │  Fully Normalized (3NF)  ←──────────────→  Fully Denorm │
  │  - No redundancy          - Max redundancy               │
  │  - Slow reads (joins)     - Fast reads (no joins)        │
  │  - Fast writes (1 place)  - Slow writes (N places)       │
  │  - Strong consistency     - Eventual consistency          │
  │  - Flexible queries       - Fixed access patterns         │
  └──────────────────────────────────────────────────────────┘

Practical Sweet Spots:
  1. Normalized + Indexes + Materialized Views
     → Good for most SQL workloads

  2. Selectively Denormalized
     → Normalize source of truth, denormalize hot paths

  3. CQRS (separated read/write models)
     → Enterprise-grade separation of concerns

  4. Fully Denormalized (NoSQL)
     → When access patterns are fixed and scale is massive

Consistency Maintenance for Denormalized Data:
  Source table WRITE
    → CDC (Change Data Capture) or Outbox event
    → Event processor updates denormalized copies
    → Reconciliation job catches any drift (nightly)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 7. Monolith vs Microservices (architecture)
  // ─────────────────────────────────────────────────────────
  {
    id: 'monolith-vs-microservices',
    title: 'Monolith vs Microservices',
    icon: 'gitBranch',
    color: '#10b981',
    questions: 8,
    description: 'Migration strategies, organizational alignment, and criteria for when to split a monolith into microservices.',
    concepts: [
      'Monolithic architecture benefits',
      'Microservices decomposition patterns',
      'Strangler fig migration pattern',
      'Domain-driven design and bounded contexts',
      'Service mesh and inter-service communication',
      'Distributed monolith anti-pattern',
      'Conway\'s Law and team topology',
      'Modular monolith as a middle ground',
    ],
    tips: [
      'Start with a monolith — it is faster to build, easier to debug, and simpler to deploy; microservices add distributed systems complexity from day one',
      'The modular monolith is often the best of both worlds: monolith deployment simplicity with clean module boundaries that can be split later',
      'Conway\'s Law is real: your system architecture will mirror your team communication structure — align service boundaries with team boundaries',
      'A distributed monolith (microservices that must be deployed together) is worse than either pure approach — it has all the complexity of both',
      'Use the strangler fig pattern to migrate incrementally: route new traffic to the new service while the old code continues handling existing functionality',
      'Microservices are an organizational scaling strategy as much as a technical one — they make sense when teams need to deploy independently',
      'In interviews, never say "microservices are better" — always qualify with team size, complexity, and organizational context',
    ],

    introduction: `The **monolith vs microservices** debate is one of the most consequential architectural decisions a team makes. A monolith is a single deployable unit containing all functionality — simpler to develop, test, debug, and deploy. Microservices decompose the system into independently deployable services, each owning a specific business capability — enabling team autonomy, independent scaling, and technology diversity at the cost of distributed systems complexity.

The industry pendulum has swung from monoliths (2000s) to microservices (2015s) and is now settling on a more nuanced view. Companies like Amazon, Shopify, and Segment have publicly documented moving from microservices back to monoliths for certain workloads. The **modular monolith** — a monolith with well-defined internal boundaries — has emerged as an increasingly popular middle ground.

In system design interviews, the strongest answer acknowledges that microservices solve **organizational problems** (team independence, deployment velocity at scale) more than technical ones. A 5-person startup building microservices from day one is almost certainly over-engineering. A 500-engineer organization with a 10-year-old monolith likely needs decomposition to maintain development velocity.`,

    keyQuestions: [
      {
        question: 'What criteria should you use to decide between monolith and microservices?',
        answer: `**Decision framework** — evaluate along organizational and technical dimensions:

\`\`\`
Criteria                 Monolith             Microservices
──────────────────────────────────────────────────────────────
Team size                < 50 engineers       > 50 engineers
Deployment frequency     Weekly/monthly       Daily/hourly per service
Domain complexity        Low-moderate         High (many bounded contexts)
Scaling needs            Uniform              Services scale differently
Technology diversity     Not needed           Different stacks per service
Organizational structure Single team/few      Many autonomous teams
Time to market           Critical (startup)   Can invest in infra
Operational maturity     Low                  High (CI/CD, monitoring, etc.)
\`\`\`

**The real decision tree**:
\`\`\`
  Are you a startup (<20 engineers)?
    YES → Monolith (99% of the time)
    NO  ↓
  Do teams need to deploy independently?
    NO  → Monolith or modular monolith
    YES ↓
  Do you have platform/infra team capacity?
    NO  → Modular monolith (not ready for MS cost)
    YES ↓
  Are bounded contexts clearly identified?
    NO  → Modular monolith (split later)
    YES → Microservices
\`\`\`

**What microservices ACTUALLY cost**:
\`\`\`
Hidden Cost              Description
──────────────────────────────────────────────────────
Service discovery        How do services find each other?
Distributed tracing      How do you debug across services?
Config management        How do 50 services get config?
Secret management        How do services get credentials?
CI/CD per service        50 services = 50 pipelines
API versioning           Breaking changes across services
Data consistency         No distributed transactions
Network failures         Timeouts, retries, circuit breakers
Monitoring/alerting      Per-service dashboards and alerts
On-call complexity       Which service is the problem?
\`\`\`

**Interview tip**: Lead with "it depends on team size and organizational needs" and walk through the decision tree. This shows mature architectural thinking, not dogmatic preference.`
      },
      {
        question: 'How does the strangler fig pattern work for migrating from monolith to microservices?',
        answer: `**Strangler Fig Pattern**: Incrementally replace monolith functionality with new services, routing traffic to the new service as each piece is ready. Named after strangler fig trees that grow around a host tree and eventually replace it.

\`\`\`
Phase 1: Monolith handles everything
  ┌─────────────────────────────┐
  │        Monolith             │
  │  [Auth][Orders][Payments]   │
  │  [Users][Search][Notify]    │
  └─────────────────────────────┘

Phase 2: Extract first service, proxy routes
  ┌──────────────┐
  │   Proxy/     │
  │   Gateway    │
  └──┬───────┬───┘
     │       │
     ▼       ▼
  ┌──────┐ ┌──────────────────────┐
  │Orders│ │      Monolith        │
  │ Svc  │ │ [Auth][Payments]     │
  │(new) │ │ [Users][Search]      │
  └──────┘ └──────────────────────┘

Phase 3: Continue extracting
  ┌──────────────┐
  │   Gateway    │
  └─┬──┬──┬──┬──┘
    │  │  │  │
    ▼  ▼  ▼  ▼
  Orders Payments Search  ┌──────────┐
  Svc    Svc      Svc     │ Monolith │
                          │ [Auth]   │
                          │ [Users]  │
                          └──────────┘

Phase 4: Monolith fully replaced (or kept for legacy)
\`\`\`

**Implementation steps**:
\`\`\`
1. IDENTIFY bounded context to extract
   → Pick the least coupled module first
   → High-churn area = high value to extract

2. BUILD the new service
   → Replicate the data it needs
   → Implement the API contract
   → Write integration tests against monolith behavior

3. ROUTE traffic gradually
   → Feature flag or percentage-based routing
   → 1% → 10% → 50% → 100% over weeks
   → Monitor error rates and latency at each step

4. DECOMMISSION the old code
   → Remove the module from the monolith
   → Clean up database tables (or keep shared, migrate later)
   → Update documentation and runbooks
\`\`\`

**Data migration challenge**:
\`\`\`
  Option A: Shared database (temporary)
    Monolith ──► DB ◄── New Service
    Risk: coupling, schema conflicts

  Option B: Database per service (target)
    Monolith ──► Old DB
    New Service ──► New DB
    Sync: CDC from old DB to new DB during migration

  Option C: API calls back to monolith
    New Service ──API──► Monolith
    Temporary dependency, removed when fully migrated
\`\`\`

**Interview tip**: Emphasize that strangler fig is incremental and reversible. If the new service has issues, you route traffic back to the monolith. This reduces risk compared to a big-bang rewrite.`
      },
      {
        question: 'What is a modular monolith and when is it the right choice?',
        answer: `**Modular monolith**: A single deployable unit with strict internal module boundaries. Each module owns its data, has a public API, and communicates with other modules through well-defined interfaces.

\`\`\`
Traditional Monolith (big ball of mud):
  ┌──────────────────────────────────┐
  │  Everything calls everything     │
  │  Shared database tables          │
  │  No clear boundaries             │
  │  Spaghetti dependencies          │
  └──────────────────────────────────┘

Modular Monolith:
  ┌──────────────────────────────────┐
  │ ┌────────┐ ┌────────┐ ┌───────┐ │
  │ │ Orders │ │ Users  │ │Payments│ │
  │ │  API ──┼─┼─► API ─┼─┼─► API │ │
  │ │  Data  │ │  Data  │ │  Data  │ │
  │ └────────┘ └────────┘ └───────┘ │
  │      Single deployment unit      │
  └──────────────────────────────────┘

  Rules:
  - Modules communicate via public APIs only
  - No direct database table access across modules
  - Each module owns its schema/tables
  - Enforce boundaries via packages/namespaces
\`\`\`

**Comparison**:
\`\`\`
Criteria              Monolith    Modular Mono  Microservices
────────────────────────────────────────────────────────────
Deployment            Simple      Simple        Complex
Boundaries            None        Enforced      Physical
Network overhead      None        None          Yes
Data consistency      ACID        ACID*         Eventual
Debugging             Easy        Easy          Hard
Team independence     Low         Medium        High
Tech diversity        None        None/limited  Full
Future extraction     Hard        Easy          Already done
Operational cost      Low         Low           High

* Can use DB transactions across modules (same DB)
\`\`\`

**When modular monolith is ideal**:
\`\`\`
  ✓ 10-50 engineers, 3-8 teams
  ✓ Want clean architecture without microservice overhead
  ✓ May need microservices later but not yet
  ✓ Strong consistency across domains is important
  ✓ Team can enforce module boundaries via code review/tooling
  ✓ Single deployment pipeline is acceptable
\`\`\`

**Enforcement tools**:
- Java: Maven modules, ArchUnit, Java Platform Module System
- .NET: Project references, solution structure
- Node.js: Workspace packages, import restrictions (ESLint rules)
- Go: Package visibility, internal packages

**Interview tip**: The modular monolith is the most mature answer for most system design scenarios. It shows you understand that clean boundaries matter more than deployment topology, and that microservices are an organizational scaling tool, not an architectural silver bullet.`
      },
      {
        question: 'What is a distributed monolith and how do you avoid creating one?',
        answer: `**Distributed monolith**: A system decomposed into services that MUST be deployed together, share databases, and have tight coupling — all the complexity of microservices with none of the benefits.

\`\`\`
Microservices (correct):
  ┌──────┐    ┌──────┐    ┌──────┐
  │Svc A │    │Svc B │    │Svc C │
  │ DB-A │    │ DB-B │    │ DB-C │
  └──────┘    └──────┘    └──────┘
  Deploy independently, own data, async communication

Distributed Monolith (anti-pattern):
  ┌──────┐    ┌──────┐    ┌──────┐
  │Svc A │◄──►│Svc B │◄──►│Svc C │
  └──┬───┘    └──┬───┘    └──┬───┘
     │           │           │
     └───────────┴───────────┘
              Shared DB
  Must deploy together, shared data, sync calls everywhere
\`\`\`

**Symptoms of a distributed monolith**:
\`\`\`
Symptom                          Root Cause
──────────────────────────────────────────────────────────
Must deploy services together    Tight API coupling
One service change breaks others Shared data models
Cascading failures              Synchronous call chains
Shared database tables          No data ownership
"Microservice" with 50 API deps  Wrong decomposition boundaries
Every change needs cross-team    Services split by layer
  coordination                    not by domain
\`\`\`

**How to avoid it**:

\`\`\`
1. DECOMPOSE BY DOMAIN, not by layer

   WRONG (layer split):          RIGHT (domain split):
   ┌──────────┐                  ┌──────────┐
   │ UI Layer │                  │ Orders   │ (UI+API+DB)
   ├──────────┤                  ├──────────┤
   │ API Layer│                  │ Payments │ (UI+API+DB)
   ├──────────┤                  ├──────────┤
   │ DB Layer │                  │ Users    │ (UI+API+DB)
   └──────────┘                  └──────────┘

2. OWN YOUR DATA
   Each service has its own database/schema
   Communicate via APIs or events, never shared tables

3. PREFER ASYNC COMMUNICATION
   Sync: A calls B calls C (chain of failure)
   Async: A publishes event, B and C consume independently

4. DESIGN FOR INDEPENDENT DEPLOYMENT
   Test: Can I deploy service A without deploying B?
   If no: your boundary is wrong

5. APPLY CONWAY'S LAW INTENTIONALLY
   One team owns one service (or a few closely related ones)
   Cross-team dependencies = wrong boundaries
\`\`\`

**The litmus test**:
\`\`\`
  Can you...                           Distributed Mono  True MS
  ─────────────────────────────────────────────────────────────
  Deploy one service independently?    No               Yes
  Change one service's DB schema?      Breaks others    No impact
  Take one service offline?            System crashes   Degrades gracefully
  Add a new service without changing   No               Yes
    existing ones?
\`\`\`

**Interview tip**: Distributed monolith is the most common failure mode of microservices adoption. Mentioning it shows real-world experience and warns the interviewer that you will not blindly recommend microservices.`
      },
    ],

    dataModel: {
      description: 'Monolith to microservices migration path',
      schema: `Architecture Evolution Path:
  Stage 1: Monolith (start here)
    Single codebase, single deployment, single database
    Team: 1-20 engineers

  Stage 2: Modular Monolith
    Single deployment, internal module boundaries
    Each module owns its tables, public API only
    Team: 10-50 engineers

  Stage 3: Selective Extraction (Strangler Fig)
    Extract highest-value modules into services
    Proxy/gateway routes traffic
    Team: 30-100 engineers

  Stage 4: Microservices
    Independent services, independent data, async events
    Service mesh, distributed tracing, platform team
    Team: 100+ engineers

Conway's Law Alignment:
  Team Structure         →  System Architecture
  ─────────────────────────────────────────────
  Single team            →  Monolith
  Few cross-functional   →  Modular monolith
  Many autonomous teams  →  Microservices
  Matrix/shared teams    →  Distributed monolith (danger!)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 8. Serverless vs Traditional (architecture)
  // ─────────────────────────────────────────────────────────
  {
    id: 'serverless-vs-traditional',
    title: 'Serverless vs Traditional Infrastructure',
    icon: 'cloud',
    color: '#10b981',
    questions: 7,
    description: 'Cold starts, cost models, use cases, and choosing between serverless functions, containers, and traditional servers.',
    concepts: [
      'Function-as-a-Service (FaaS) model',
      'Cold starts and warm execution',
      'Pay-per-invocation cost model',
      'Serverless databases (DynamoDB, Aurora Serverless)',
      'Container-based architectures (ECS, Kubernetes)',
      'Vendor lock-in considerations',
      'Event-driven serverless patterns',
      'Serverless limitations (timeouts, state, connections)',
    ],
    tips: [
      'Serverless excels for event-driven, bursty, or low-traffic workloads where you would otherwise pay for idle servers',
      'Cold starts are the primary latency concern — typically 100ms-5s depending on runtime, package size, and VPC configuration',
      'Serverless is NOT cheaper at high sustained load — once you hit consistent utilization, reserved instances or containers win on cost',
      'Connection pooling is a hidden challenge: 1000 concurrent Lambda invocations = 1000 DB connections; use RDS Proxy or DynamoDB',
      'Vendor lock-in is real but often overstated — the business logic is portable; the event wiring (API Gateway, SQS triggers) is the lock-in',
      'In interviews, match the deployment model to the workload: serverless for glue/event processing, containers for long-running services, VMs for legacy/specialized needs',
    ],

    introduction: `**Serverless** computing lets you run code without managing servers — the cloud provider handles provisioning, scaling, and maintenance. **AWS Lambda**, **Google Cloud Functions**, and **Azure Functions** are the leading FaaS platforms. In contrast, **traditional infrastructure** (VMs, containers on Kubernetes/ECS) gives you full control over the runtime, networking, and scaling behavior at the cost of operational overhead.

The serverless value proposition is compelling: zero idle cost, automatic scaling, and no infrastructure management. But it comes with constraints — **cold starts** add latency, execution timeouts limit long-running tasks, and the per-invocation pricing becomes expensive at high sustained throughput. Container-based deployments on Kubernetes offer a middle ground with more control and predictable performance, while requiring more operational expertise.

In system design interviews, the decision should be workload-driven. **Event-driven glue code** (processing S3 uploads, reacting to queue messages, handling webhooks) is a natural fit for serverless. **Sustained request-serving workloads** (APIs handling thousands of QPS continuously) are typically cheaper and more predictable on containers. Understanding these trade-offs and articulating the cost crossover point demonstrates practical architectural judgment.`,

    keyQuestions: [
      {
        question: 'What are cold starts and how do they affect serverless architectures?',
        answer: `**Cold start**: When a serverless function is invoked and no warm instance exists, the provider must provision a new execution environment. This adds latency before your code runs.

\`\`\`
Cold Start Breakdown:
  ┌──────────────────────────────────────────────────┐
  │ 1. Provision container    │ ~100-500ms           │
  │ 2. Download code package  │ ~50-200ms            │
  │ 3. Initialize runtime     │ ~50-300ms            │
  │ 4. Run initialization code│ ~50-5000ms (your code)│
  │ 5. Execute handler        │ (your actual function)│
  └──────────────────────────────────────────────────┘

  Steps 1-4 = cold start overhead
  Step 5 = same as warm invocation

Warm Invocation (reuses existing container):
  Only step 5 → millisecond latency
\`\`\`

**Cold start latency by runtime**:
\`\`\`
Runtime          Typical Cold Start    With VPC
──────────────────────────────────────────────────
Node.js          100-300ms             +200ms*
Python           150-400ms             +200ms*
Go               50-100ms              +200ms*
Java             500-5000ms            +200ms*
.NET             200-1000ms            +200ms*

* VPC cold starts improved dramatically with AWS
  Hyperplane (2019) — was +10s, now ~200ms
\`\`\`

**Mitigation strategies**:
\`\`\`
Strategy              How                       Trade-off
──────────────────────────────────────────────────────────
Provisioned concur.   Pre-warm N instances       Costs $ (always-on)
Keep-alive pings      CloudWatch timer every 5m  Reduces but doesn't
                                                  eliminate
Smaller packages      Fewer dependencies         Limits functionality
Faster runtimes       Go > Node > Java           Language constraints
Lazy initialization   Init DB conn on first use  First request slower
SnapStart (Java)      Checkpoint warm JVM state   AWS-specific
\`\`\`

**When cold starts matter vs don't**:
\`\`\`
  MATTERS:
  - User-facing APIs (p99 latency budget)
  - Real-time processing with SLAs
  - Interactive applications

  DOES NOT MATTER:
  - Async event processing (S3 triggers, queue consumers)
  - Scheduled batch jobs (cron)
  - Backend-to-backend calls (internal, no user waiting)
  - Low-traffic services (cost savings > latency)
\`\`\`

**Interview tip**: Acknowledge cold starts but contextualize them. For async workloads (80% of serverless use cases), cold starts are irrelevant. For synchronous APIs, discuss provisioned concurrency or containers as alternatives.`
      },
      {
        question: 'Compare the cost models of serverless vs containers vs VMs. Where is the crossover point?',
        answer: `**Cost models**:

\`\`\`
Serverless (Lambda):
  Cost = invocations x duration x memory
  $0.20 per 1M invocations
  $0.0000166667 per GB-second
  Zero cost when idle ← key advantage

Containers (ECS/Fargate):
  Cost = vCPU-hours + memory-hours
  ~$0.04/vCPU-hour, ~$0.004/GB-hour
  Pay while running (even if idle)

Containers (EKS/self-managed):
  Cost = EC2 instances + EKS control plane ($73/mo)
  Most cost-effective at scale
  Highest operational overhead

VMs (EC2 reserved):
  Cost = instance-hours (reserved = ~40% discount)
  Pay for capacity regardless of utilization
  Most predictable pricing
\`\`\`

**Cost crossover analysis**:
\`\`\`
Monthly cost comparison (128MB function, 200ms avg):

Invocations/month   Lambda    Fargate(1 task)  EC2(t3.micro)
─────────────────────────────────────────────────────────────
10,000              $0.01     $35              $7.50
100,000             $0.08     $35              $7.50
1,000,000           $0.83     $35              $7.50
10,000,000          $8.35     $35              $7.50
50,000,000          $41.67    $35              $7.50  ← crossover
100,000,000         $83.34    $35              $7.50
500,000,000         $416.67   $35              $7.50

Crossover: ~30-50M invocations/month
  Below → Lambda is cheaper
  Above → Containers/VMs are cheaper
\`\`\`

**Total Cost of Ownership** (beyond compute):
\`\`\`
Cost Factor          Serverless     Containers      VMs
──────────────────────────────────────────────────────────
Compute              Pay-per-use    Always-on       Always-on
Scaling              Automatic      Manual/HPA      Manual
Ops team             Minimal        Medium (DevOps) Large (SysAdmin)
Monitoring           CloudWatch     Prometheus+     Nagios+
Networking           Managed        VPC setup       VPC setup
Idle cost            Zero           Full            Full
Burst cost           Linear         Pre-provision   Pre-provision
Dev productivity     High           Medium          Low
\`\`\`

**Decision framework**:
\`\`\`
  Traffic < 30M req/month AND bursty? → Serverless
  Traffic 30M-500M req/month, steady? → Containers (Fargate/EKS)
  Traffic > 500M req/month, predictable? → Reserved EC2 + containers
  Mixed workload? → Containers for baseline + Lambda for spikes
\`\`\`

**Interview tip**: Do not just compare compute cost. Factor in operational overhead — a small team without DevOps expertise saves more with serverless even above the compute crossover point because they avoid hiring infrastructure engineers.`
      },
      {
        question: 'What workloads are ideal for serverless vs containers vs traditional servers?',
        answer: `**Workload-to-infrastructure matching**:

\`\`\`
Workload Type        Best Fit      Why
──────────────────────────────────────────────────────────
Webhook handlers     Serverless    Bursty, event-driven, idle between
S3 file processing   Serverless    Event trigger, variable load
API < 10K QPS        Serverless    Simple, auto-scale, low ops
Scheduled jobs       Serverless    Pay only for execution time
Chat/WebSocket       Containers    Long-lived connections
API > 50K QPS        Containers    Cost-effective at sustained load
ML inference         Containers    GPU support, model loading
Stateful services    Containers    Persistent connections, memory
Legacy apps          VMs           Cannot containerize easily
Databases            VMs/Managed   Need persistent storage, tuning
CI/CD runners        Serverless    Bursty, ephemeral
Image/video process  Serverless    Parallelizable, bursty
\`\`\`

**Architecture by pattern**:
\`\`\`
Event-Driven Processing (serverless ideal):
  S3 Upload ──► Lambda ──► Process ──► DynamoDB
  SQS Queue ──► Lambda ──► Transform ──► S3
  API GW ──► Lambda ──► Response

Request-Serving (containers ideal):
  ALB ──► ECS/K8s ──► Service A ──► Database
                  ──► Service B ──► Cache

  Persistent connections, connection pooling,
  in-memory caching, predictable latency

Hybrid (common in practice):
  API Gateway
    ├──► Lambda (auth, lightweight endpoints)
    ├──► ECS (core business logic, heavy endpoints)
    └──► Lambda (async: emails, notifications)

  Background:
    EventBridge ──► Lambda (scheduled jobs)
    SQS ──► Lambda (queue processing)
    Kinesis ──► Lambda (stream processing)
\`\`\`

**Serverless limitations**:
\`\`\`
Limitation               Impact              Workaround
──────────────────────────────────────────────────────────
Timeout (15 min AWS)     No long-running      Step Functions
Connection limits        DB overwhelmed       RDS Proxy, DynamoDB
Package size (250MB)     Large dependencies   Layers, container Lambda
Stateless               No in-memory cache   External cache (Redis)
Cold starts             Latency spikes       Provisioned concurrency
Vendor lock-in          Migration cost       Abstraction layers
Local testing           Harder               SAM, Serverless Framework
\`\`\`

**Interview tip**: Frame the decision as a spectrum, not binary. Most production architectures use a mix: containers for the core request path and serverless for event processing, cron jobs, and glue code. This hybrid approach optimizes both cost and performance.`
      },
      {
        question: 'How do you handle the vendor lock-in concern with serverless?',
        answer: `**Vendor lock-in spectrum** — not all serverless components are equally locked in:

\`\`\`
Lock-in Risk:  LOW ──────────────────────────── HIGH

  Business logic   API format    Event wiring     Managed services
  (your code)      (REST/gRPC)   (triggers,       (DynamoDB, SQS,
                                  event sources)    Step Functions)

  Portable         Mostly         Hard to          Very hard to
                   portable       migrate          migrate
\`\`\`

**What is actually locked in**:
\`\`\`
Component            AWS                    GCP                  Portable?
─────────────────────────────────────────────────────────────────────────
Function runtime     Lambda                 Cloud Functions      YES*
API routing          API Gateway            Cloud Endpoints      Moderate
Event triggers       EventBridge            Eventarc             NO
Queue integration    SQS → Lambda           Pub/Sub → CF         NO
Database             DynamoDB               Firestore            NO
Orchestration        Step Functions         Workflows            NO
Auth                 Cognito                Firebase Auth        NO

* Code runs anywhere, but the handler signature and
  event format differ between providers.
\`\`\`

**Mitigation strategies**:

\`\`\`
Strategy 1: Hexagonal Architecture (Ports & Adapters)
  ┌──────────────────────────────────────┐
  │          Business Logic              │
  │    (pure functions, no AWS imports)  │
  ├──────────────────────────────────────┤
  │  Adapters (thin wrappers)            │
  │  ├── AWS Lambda handler             │
  │  ├── Express.js handler (container) │
  │  └── GCP Cloud Function handler     │
  └──────────────────────────────────────┘

  Only the adapter layer changes when migrating.

Strategy 2: Abstraction layers
  Use Serverless Framework, SST, or Pulumi
  Infrastructure defined in code, multi-provider support
  Trade-off: added complexity, not all features available

Strategy 3: Container-based serverless
  AWS: Lambda container images (up to 10GB)
  GCP: Cloud Run (container-based, auto-scales to zero)
  Azure: Container Apps
  → Same container runs anywhere

Strategy 4: Accept lock-in strategically
  Core business logic → portable
  Infrastructure wiring → accept lock-in
  Managed services → accept lock-in (migration = rewrite anyway)
\`\`\`

**Real-world perspective**:
\`\`\`
  Migration cost vs. opportunity cost:

  Scenario: Building on DynamoDB + Lambda + SQS
  Migration to GCP: ~3-6 months engineering effort

  But: Using generic alternatives (self-managed Kafka,
    PostgreSQL, Kubernetes) costs MORE in ongoing ops
    than the hypothetical one-time migration.

  Rule of thumb: If your company is not likely to switch
    clouds in the next 3 years, accept the lock-in and
    move faster with managed services.
\`\`\`

**Interview tip**: Show nuanced thinking. Pure "avoid lock-in" leads to over-engineering. Pure "embrace lock-in" ignores real risks. The middle ground is: keep business logic portable, accept infrastructure lock-in for managed services, and document the migration path without building it.`
      },
    ],

    dataModel: {
      description: 'Serverless vs traditional infrastructure decision framework',
      schema: `Infrastructure Decision Matrix:
  ┌───────────────┬──────────────┬──────────────┬──────────────┐
  │ Criteria      │  Serverless  │  Containers  │  VMs         │
  ├───────────────┼──────────────┼──────────────┼──────────────┤
  │ Scaling       │ Automatic    │ HPA/manual   │ Manual       │
  │ Cold start    │ Yes (100ms+) │ No           │ No           │
  │ Max duration  │ 15 min       │ Unlimited    │ Unlimited    │
  │ State         │ Stateless    │ Can be both  │ Can be both  │
  │ Cost model    │ Per-invoke   │ Per-hour     │ Per-hour     │
  │ Idle cost     │ Zero         │ Full         │ Full         │
  │ Ops overhead  │ Minimal      │ Medium       │ High         │
  │ Vendor lock-in│ High         │ Low-Medium   │ Low          │
  └───────────────┴──────────────┴──────────────┴──────────────┘

Workload Routing:
  Incoming request/event
    → Is it event-driven/async? → Serverless
    → Is it sustained high-QPS? → Containers
    → Does it need GPU/special HW? → VMs/specialized
    → Is it a legacy application? → VMs + container migration path`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 9. Polling vs WebSockets vs Webhooks (communication-delivery)
  // ─────────────────────────────────────────────────────────
  {
    id: 'polling-vs-websockets-vs-webhooks',
    title: 'Polling vs WebSockets vs Webhooks',
    icon: 'radio',
    color: '#f59e0b',
    questions: 8,
    description: 'Real-time communication trade-offs — short polling, long polling, Server-Sent Events, WebSockets, and webhooks.',
    concepts: [
      'Short polling and its inefficiency',
      'Long polling (Comet pattern)',
      'Server-Sent Events (SSE)',
      'WebSocket protocol (full-duplex)',
      'Webhooks (server-to-server push)',
      'Connection management at scale',
      'Reconnection and reliability patterns',
      'Scaling real-time systems (pub/sub, fan-out)',
    ],
    tips: [
      'Short polling is the simplest but most wasteful — most requests return empty; use only for very low-frequency updates',
      'Long polling is a solid middle ground when SSE/WebSocket infrastructure is not available — HTTP-compatible, works through proxies',
      'SSE is ideal for server-to-client push (dashboards, feeds, notifications) — simpler than WebSockets, built-in reconnection, HTTP-based',
      'WebSockets are necessary only when you need bidirectional communication (chat, gaming, collaborative editing)',
      'Webhooks are for server-to-server integration — the receiving server must be publicly accessible and idempotent',
      'In interviews, start with the simplest solution (polling/SSE) and upgrade to WebSockets only if bidirectional communication is required',
      'Connection management is the hidden challenge: 1M WebSocket connections requires careful memory management, heartbeating, and graceful reconnection',
    ],

    introduction: `Choosing the right **real-time communication pattern** is a critical system design decision that affects latency, scalability, infrastructure cost, and implementation complexity. The five primary approaches — **short polling**, **long polling**, **Server-Sent Events (SSE)**, **WebSockets**, and **webhooks** — each solve different problems and come with distinct trade-offs.

**Polling** (short and long) works entirely within the HTTP request-response model, making it compatible with all infrastructure. **SSE** enables efficient server-to-client push over a single HTTP connection with automatic reconnection. **WebSockets** upgrade the HTTP connection to a persistent, full-duplex channel for true bidirectional communication. **Webhooks** are the server-to-server equivalent, where one system pushes notifications to another via HTTP POST.

In system design interviews, the common mistake is jumping to WebSockets for every "real-time" requirement. Most real-time features (live dashboards, notification feeds, status updates) only need server-to-client push, which SSE handles more simply. WebSockets add connection management complexity that is justified only for truly bidirectional use cases like chat, multiplayer gaming, or collaborative editors.`,

    keyQuestions: [
      {
        question: 'Compare all five real-time communication patterns. When would you use each?',
        answer: `\`\`\`
Pattern         Direction       Latency    Complexity  Use Case
──────────────────────────────────────────────────────────────────
Short Polling   Client→Server   High       Low         Status checks
Long Polling    Server→Client   Medium     Low-Med     Chat (fallback)
SSE             Server→Client   Low        Low         Dashboards, feeds
WebSocket       Bidirectional   Low        High        Chat, gaming
Webhook         Server→Server   Low        Medium      Integrations
\`\`\`

**Visual comparison**:
\`\`\`
Short Polling (wasteful):
  Client: REQ──────REQ──────REQ──────REQ──────REQ
  Server: ───empty───empty───DATA───empty───DATA

Long Polling (efficient but complex):
  Client: REQ──────────────────────REQ───────────
  Server: ─────────(hold)──────DATA  ──(hold)─DATA

SSE (server push):
  Client: ──connect──────────────────────────────
  Server: ─────────DATA──DATA──────DATA──DATA────

WebSocket (bidirectional):
  Client: ──upgrade──MSG──────MSG──────MSG───────
  Server: ──────────MSG──MSG──────MSG────────MSG─

Webhook (server-to-server):
  Sender:  ────────EVENT──────EVENT──────────────
  Receiver: ──────POST────────POST────────────────
\`\`\`

**Decision tree**:
\`\`\`
  Do you need server→client push?
    NO → Short polling (check periodically)
    YES ↓
  Is it server-to-server?
    YES → Webhooks
    NO  ↓
  Do you need client→server push too?
    NO → SSE (simplest push option)
    YES ↓
  Is low latency bidirectional critical?
    YES → WebSocket
    NO  → Long polling (fallback-friendly)
\`\`\`

**Real-world examples**:
\`\`\`
Short Polling:  Checking build status, email inbox refresh
Long Polling:   Facebook Messenger (original), Slack (fallback)
SSE:            Twitter/X live feed, stock tickers, CI/CD logs
WebSocket:      Discord voice/chat, Google Docs, multiplayer games
Webhook:        Stripe payment notifications, GitHub PR events
\`\`\`

**Interview tip**: Always start with SSE if the requirement is server-to-client push. Only escalate to WebSockets when you identify a clear need for client-to-server messages beyond the initial request.`
      },
      {
        question: 'How do you scale WebSocket connections to millions of concurrent users?',
        answer: `**The challenge**: Each WebSocket connection is a persistent TCP connection consuming memory, file descriptors, and state on the server.

\`\`\`
Per-connection cost:
  Memory: ~20-50KB per connection (buffers, metadata)
  File descriptors: 1 per connection (OS limit ~1M)
  CPU: heartbeat processing, message routing

  1M connections × 50KB = ~50GB RAM just for connections
\`\`\`

**Architecture for scale**:
\`\`\`
                    ┌─────────────────┐
                    │   Load Balancer  │
                    │  (L4/TCP, sticky)│
                    └────┬────┬────┬──┘
                         │    │    │
                    ┌────┴┐ ┌┴──┐ ┌┴───┐
                    │WS-1 │ │WS-2│ │WS-3│  WebSocket Servers
                    │100K │ │100K│ │100K│  (each handles 100K conns)
                    └──┬──┘ └─┬──┘ └─┬──┘
                       │      │      │
                    ┌──┴──────┴──────┴──┐
                    │    Pub/Sub Layer   │  Redis Pub/Sub, Kafka,
                    │    (message bus)   │  or NATS
                    └───────────────────┘
\`\`\`

**Key scaling strategies**:

\`\`\`
1. HORIZONTAL SCALING with pub/sub:
   User A (on WS-1) sends message to User B (on WS-3)
   WS-1 → publishes to Redis channel → WS-3 delivers to B

2. CONNECTION MANAGEMENT:
   - Heartbeats: server pings every 30s, client must pong
   - Idle timeout: disconnect after 5 min no activity
   - Graceful shutdown: notify clients to reconnect to another server

3. STICKY LOAD BALANCING:
   - Use L4 (TCP) not L7 (HTTP) load balancing for WebSocket
   - Consistent hashing by connection ID or user ID
   - Or: use connection ID cookie for session affinity

4. MESSAGE FAN-OUT optimization:
   Chat room with 10K members = 10K messages per post

   Naive: server sends 10K individual messages
   Better: batch sends, group connections by room
   Best: hierarchical fan-out (room → shards → connections)
\`\`\`

**Technology choices at scale**:
\`\`\`
Connections       Approach                Example
──────────────────────────────────────────────────────
< 10K            Single server           Express + ws
10K - 100K       Few servers + Redis     Socket.io cluster
100K - 1M        Dedicated WS tier +     Custom + Redis/NATS
                 pub/sub
> 1M             Purpose-built infra     Discord (Elixir),
                 + sharded pub/sub       Slack (Java + Flannel)
\`\`\`

**Interview tip**: Mention that WebSocket connections are stateful, making them harder to scale than stateless HTTP. The pub/sub layer is the key architectural element that decouples connection handling from message routing.`
      },
      {
        question: 'How do you design a reliable webhook system?',
        answer: `**Webhook reliability challenges**: The receiving server may be down, slow, or return errors. You need retry logic, idempotency, and delivery guarantees.

\`\`\`
Reliable Webhook Architecture:

  Event occurs
     │
     ▼
  ┌──────────────┐
  │ Event Queue  │ ◄── Persistent (not in-memory)
  │ (SQS/Kafka)  │
  └──────┬───────┘
         │
  ┌──────┴───────┐
  │ Webhook      │
  │ Dispatcher   │
  └──────┬───────┘
         │
    ┌────┴────┐
    ▼         ▼
  POST to    POST to
  Endpoint A  Endpoint B
    │         │
    ▼         ▼
  200 OK?   Timeout?
  ✓ done    → retry queue
\`\`\`

**Retry strategy** (exponential backoff):
\`\`\`
Attempt   Delay        Total Elapsed
──────────────────────────────────────
1         0 (immediate) 0
2         1 minute      1 min
3         5 minutes     6 min
4         30 minutes    36 min
5         2 hours       2h 36m
6         8 hours       10h 36m
7         24 hours      34h 36m (give up)

After all retries:
  → Mark as failed
  → Notify webhook owner
  → Allow manual retry via dashboard
\`\`\`

**Idempotency** (critical):
\`\`\`
  Every webhook includes an idempotency key:

  POST /webhook
  {
    "event_id": "evt_abc123",  ← unique, never changes on retry
    "event_type": "payment.completed",
    "data": {...},
    "timestamp": "2024-01-15T10:30:00Z"
  }

  Receiver:
    IF event_id already processed → 200 OK (deduplicate)
    ELSE → process and store event_id
\`\`\`

**Security**:
\`\`\`
  1. Signature verification (HMAC):
     Header: X-Webhook-Signature: sha256=abc123...
     Receiver: verify HMAC(payload, shared_secret) matches

  2. Mutual TLS (mTLS):
     Both sender and receiver authenticate via certificates

  3. IP allowlisting:
     Receiver only accepts from known sender IPs
     Sender publishes IP ranges (like Stripe does)
\`\`\`

**Monitoring dashboard essentials**:
\`\`\`
Metric                  Alert Threshold
──────────────────────────────────────────
Delivery success rate   < 95% over 1 hour
Average delivery time   > 30 seconds
Retry queue depth       > 10,000
Failed (exhausted)      Any non-zero
Endpoint latency p99    > 10 seconds
\`\`\`

**Interview tip**: A well-designed webhook system has four pillars: persistent queue (survive crashes), exponential backoff (avoid overwhelming receivers), idempotency keys (deduplicate retries), and signature verification (prevent spoofing). Cover all four to demonstrate thoroughness.`
      },
      {
        question: 'Compare SSE vs WebSocket for a real-time dashboard. Which would you choose?',
        answer: `**For a real-time dashboard, SSE is almost always the better choice.** Here is why:

\`\`\`
Dashboard requirements:
  ✓ Server pushes data to client (metrics, alerts)
  ✗ Client rarely sends data (maybe filter changes)
  ✓ Auto-reconnection on disconnect
  ✓ Works through HTTP proxies and CDNs
  ✓ Simple server implementation
\`\`\`

**Detailed comparison for dashboard use case**:
\`\`\`
Feature              SSE                    WebSocket
──────────────────────────────────────────────────────────
Direction            Server → Client        Bidirectional
Protocol             HTTP/1.1 or HTTP/2     ws:// or wss://
Reconnection         Built-in (automatic)   Manual (must code)
Last-Event-ID        Built-in (resume)      Manual (must code)
Proxy/CDN compat.    Yes (standard HTTP)    Often breaks
Browser support      All modern browsers    All modern browsers
Max connections      6 per domain (HTTP/1)  No limit
                     Multiplexed (HTTP/2)
Data format          Text (UTF-8)           Text or binary
Server complexity    Low (standard HTTP)    Higher (upgrade, ping)
Load balancer        Any HTTP LB            Needs L4 or WS-aware
\`\`\`

**SSE implementation** (simpler):
\`\`\`
Server (Node.js):
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  setInterval(() => {
    res.write(\`id: \${id}\\ndata: \${JSON.stringify(metrics)}\\n\\n\`);
  }, 1000);

Client (browser):
  const source = new EventSource('/api/dashboard/stream');
  source.onmessage = (e) => updateChart(JSON.parse(e.data));
  // Auto-reconnects on disconnect!
  // Sends Last-Event-ID header to resume where it left off!
\`\`\`

**When WebSocket IS needed for dashboards**:
\`\`\`
  ✓ User can draw/annotate on shared dashboard (collaborative)
  ✓ User sends real-time queries that change the data stream
  ✓ Binary data streaming (video feeds, audio)
  ✓ Very high frequency updates (>60fps, gaming)

  For a typical metrics dashboard: SSE wins.
\`\`\`

**HTTP/2 advantage for SSE**:
\`\`\`
HTTP/1.1: Max 6 SSE connections per domain
  Dashboard with 6 data streams = at the limit!

HTTP/2: Multiplexed streams over single connection
  Dashboard with 20 data streams = all on 1 connection
  → SSE on HTTP/2 has no practical connection limit
\`\`\`

**Interview tip**: Choosing SSE over WebSocket for a dashboard demonstrates mature engineering judgment — you picked the simpler tool that fully meets the requirements instead of reaching for the more complex one. Mention HTTP/2 multiplexing to show you understand the connection limit concern.`
      },
    ],

    dataModel: {
      description: 'Real-time communication pattern comparison',
      schema: `Communication Pattern Selection:
  ┌────────────────────────────────────────────────────────┐
  │              Direction of Data Flow                     │
  ├────────────┬───────────────┬───────────────────────────┤
  │ Client→Srv │ Srv→Client    │ Bidirectional             │
  ├────────────┼───────────────┼───────────────────────────┤
  │ REST API   │ SSE           │ WebSocket                 │
  │ Short Poll │ Long Polling  │                           │
  │            │ Webhook(S2S)  │                           │
  └────────────┴───────────────┴───────────────────────────┘

Connection Lifecycle:
  Short Poll:  CONNECT → REQUEST → RESPONSE → DISCONNECT (repeat)
  Long Poll:   CONNECT → REQUEST → WAIT → RESPONSE → DISCONNECT (repeat)
  SSE:         CONNECT → SUBSCRIBE → DATA DATA DATA ... → RECONNECT
  WebSocket:   CONNECT → UPGRADE → MSG MSG MSG MSG ... → CLOSE
  Webhook:     SERVER EVENT → HTTP POST → RECEIVER ACK

Scaling Architecture:
  Clients ──► Load Balancer ──► WS/SSE Servers
                                     │
                              ┌──────┴──────┐
                              │  Pub/Sub    │  (Redis, Kafka, NATS)
                              │  (message   │
                              │   routing)  │
                              └─────────────┘`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 10. Read-Heavy vs Write-Heavy Systems (data-storage)
  // ─────────────────────────────────────────────────────────
  {
    id: 'read-heavy-vs-write-heavy',
    title: 'Read-Heavy vs Write-Heavy Systems',
    icon: 'barChart',
    color: '#8b5cf6',
    questions: 7,
    description: 'System design approaches for read-dominated and write-dominated workloads, including caching, replication, and write optimization.',
    concepts: [
      'Read replicas and read scaling',
      'Write-optimized data structures (LSM trees)',
      'Read-optimized structures (B-trees, materialized views)',
      'CQRS for asymmetric workloads',
      'Caching layers for read amplification',
      'Write batching and buffering',
      'Denormalization for read performance',
      'Event sourcing for write-heavy systems',
    ],
    tips: [
      'Identify the read:write ratio early — it fundamentally changes your architecture; social media is 100:1 read-heavy, IoT telemetry is 1:100 write-heavy',
      'Read-heavy systems benefit most from caching and read replicas — both multiply read capacity without changing the write path',
      'Write-heavy systems need LSM-tree databases (Cassandra, RocksDB), write-behind caching, and batched/buffered writes',
      'CQRS naturally emerges when read and write patterns are very different — separate the models and optimize each independently',
      'Read replicas introduce replication lag — design for eventual consistency or use synchronous replication for critical reads',
      'In interviews, always quantify: "How many reads/sec vs writes/sec? What is the acceptable latency for each?" Then design accordingly',
    ],

    introduction: `Every system has a characteristic **read-to-write ratio** that should fundamentally shape its architecture. A **read-heavy system** (social media feeds, product catalogs, CDNs) serves orders of magnitude more reads than writes. A **write-heavy system** (IoT telemetry, logging platforms, financial tick data) ingests data at extreme rates where write throughput is the bottleneck.

The optimization strategies for each are nearly opposite. Read-heavy systems benefit from **caching**, **read replicas**, **denormalization**, and **CDNs** — all techniques that trade write complexity for read speed. Write-heavy systems benefit from **LSM-tree storage**, **write-behind buffering**, **batching**, and **append-only designs** — techniques that optimize the write path at the cost of read performance.

Understanding this trade-off is essential for system design interviews because the read:write ratio is often the first question that should shape your architecture. A system designed for reads will crumble under write load, and vice versa. The strongest candidates identify the ratio early, state it explicitly, and let it drive every subsequent design decision.`,

    keyQuestions: [
      {
        question: 'How do you design a system optimized for read-heavy workloads?',
        answer: `**Read-heavy optimization stack** (applied in layers):

\`\`\`
Layer 1: CDN / Edge Cache
  Static assets + cacheable API responses
  Reduces load by 60-80% for global users

Layer 2: Application Cache (Redis/Memcached)
  Hot data: user profiles, product info, sessions
  Cache hit rate target: >95%

Layer 3: Read Replicas
  Route read queries to replicas
  1 primary + N replicas (typical: 3-5)

Layer 4: Denormalization / Materialized Views
  Pre-compute expensive joins
  Trade write complexity for read speed

Layer 5: Database Optimization
  Indexes on read patterns
  Query optimization, covering indexes
  Connection pooling
\`\`\`

**Architecture diagram**:
\`\`\`
  Client ──► CDN (cache HIT → return)
              │ (cache MISS)
              ▼
          API Gateway
              │
              ▼
          App Server ──► Redis Cache (HIT → return)
              │              │ (MISS)
              ▼              ▼
          ┌───────────────────────────┐
          │      Database Cluster     │
          │  ┌────────┐  ┌────────┐  │
          │  │Primary │  │Replica │  │ ◄── Writes to primary
          │  │(writes)│  │(reads) │  │ ◄── Reads from replica
          │  └────────┘  ├────────┤  │
          │              │Replica │  │
          │              └────────┘  │
          └───────────────────────────┘
\`\`\`

**Read scaling math**:
\`\`\`
  Without optimization:
    Primary DB: 10K reads/s max

  With read replicas (3x):
    Primary: writes only
    3 replicas: 30K reads/s

  With Redis cache (95% hit rate):
    Only 5% of reads hit replicas
    Effective capacity: 30K / 0.05 = 600K reads/s

  With CDN (70% hit rate for cacheable):
    70% served from CDN edge
    Effective capacity: 600K / 0.3 = 2M reads/s
\`\`\`

**Key patterns**:
- Cache-aside with TTL (simple, effective)
- Read replicas with routing middleware
- Materialized views for complex aggregations
- Denormalized search index (Elasticsearch) for text queries

**Interview tip**: Layer the optimizations and quantify the impact at each layer. This shows you understand that caching is multiplicative — each layer reduces the load on the layer below.`
      },
      {
        question: 'How do you design a system optimized for write-heavy workloads?',
        answer: `**Write-heavy optimization strategies**:

\`\`\`
Strategy 1: Write-Optimized Storage (LSM Trees)
  ┌───────────────────────────────────────┐
  │ B-Tree (read-optimized):              │
  │   Write: random I/O → find page → update│
  │   Read: follow tree → O(log N)        │
  │                                        │
  │ LSM Tree (write-optimized):           │
  │   Write: sequential append to WAL +   │
  │          in-memory insert to memtable  │
  │   Read: check memtable + SSTables     │
  │          (read amplification)          │
  └───────────────────────────────────────┘

  B-Tree: PostgreSQL, MySQL/InnoDB
  LSM:    Cassandra, RocksDB, LevelDB, HBase

Strategy 2: Write Batching / Buffering
  Individual writes:  ████████████ (1000 IOPS)
  Batched writes:     ██ (10 batch writes = same data)

  Buffer in memory → flush periodically or at threshold
  Risk: data loss on crash → mitigate with WAL

Strategy 3: Append-Only Design
  Instead of UPDATE: append new version
  ┌──────────────────────────────────────┐
  │ user_id │ name    │ version │ time   │
  │ 1       │ Alice   │ 1       │ T1     │
  │ 1       │ Alicia  │ 2       │ T2     │ ← new row
  └──────────────────────────────────────┘
  Read: SELECT WHERE version = max(version)
  Write: Just INSERT (fast!)
\`\`\`

**Write-heavy architecture**:
\`\`\`
  Producers (millions of events)
       │
       ▼
  ┌──────────────┐
  │ Message Queue│ ◄── Buffer for burst absorption
  │ (Kafka)      │     Retain for replay
  └──────┬───────┘
         │
  ┌──────┴───────┐
  │ Stream       │ ◄── Aggregate, deduplicate, transform
  │ Processor    │
  └──────┬───────┘
         │
  ┌──────┴───────┐
  │ Write-       │ ◄── Cassandra, InfluxDB, TimescaleDB
  │ Optimized DB │     (LSM trees, time-partitioned)
  └──────────────┘
\`\`\`

**Write scaling techniques**:
\`\`\`
Technique           How                    Capacity Gain
──────────────────────────────────────────────────────────
Sharding            Partition by key       Linear with shards
Kafka buffering     Absorb bursts          Decouple ingestion
Batch inserts       GROUP INTO inserts     10-100x throughput
Async writes        Return before flush    Lower latency
LSM storage         Sequential writes      3-10x vs B-tree
Time partitioning   Partition by time      Efficient writes + TTL
\`\`\`

**Interview tip**: For write-heavy systems, always mention Kafka as the ingestion buffer, LSM-tree storage (Cassandra/RocksDB) for persistence, and batching at every layer. The key insight is converting random writes into sequential writes.`
      },
      {
        question: 'How do read replicas work and what are the consistency implications?',
        answer: `**Read replicas** duplicate data from a primary node to one or more followers. Writes go to the primary; reads can go to any replica.

\`\`\`
Replication Flow:
  Client Write ──► Primary DB ──► WAL / Binlog
                                      │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
                      Replica 1   Replica 2   Replica 3
                      (read)      (read)      (read)

  Replication Lag: time between write to primary
                   and visibility on replica (ms to seconds)
\`\`\`

**Replication modes**:
\`\`\`
Mode              Lag          Consistency    Availability
──────────────────────────────────────────────────────────
Synchronous       0            Strong         Lower (waits)
Semi-synchronous  ~0           Strong*        Medium
Asynchronous      ms-seconds   Eventual       Highest

* Semi-sync: primary waits for at least 1 replica ACK
  before acknowledging client. Balance of both.
\`\`\`

**Consistency problems with async replicas**:
\`\`\`
Problem 1: Read-after-write inconsistency
  T=0: User updates profile (write to primary)
  T=1: User refreshes page (read from replica)
  T=1: Replica has not received update yet → stale data!

  Solution: Route user's own reads to primary
            (or to a replica known to be caught up)

Problem 2: Monotonic read violation
  T=0: User reads from Replica A (sees update)
  T=1: User reads from Replica B (does not see update)
  T=1: User thinks their data reverted!

  Solution: Sticky reads — route same user to same replica

Problem 3: Causal ordering violation
  User A posts, User B comments on the post
  Replica may show comment before the post!

  Solution: Causal consistency (track dependencies)
\`\`\`

**Routing strategies**:
\`\`\`
Strategy              Implementation              Use Case
──────────────────────────────────────────────────────────
Route all to primary  Simple, no lag issues        Low-read systems
Read-from-primary     After write, read primary    User's own data
  after write         for N seconds, then replica
Sticky reads          Hash user → specific replica  Monotonic reads
Lag-aware routing     Check replica lag, skip if    General purpose
                      > threshold (e.g., 1s)
\`\`\`

**Scaling with replicas**:
\`\`\`
  1 Primary + 0 Replicas: 10K reads/s, 5K writes/s
  1 Primary + 3 Replicas: 40K reads/s, 5K writes/s
  1 Primary + 9 Replicas: 100K reads/s, 5K writes/s

  Note: writes do NOT scale with replicas!
  Every replica must apply every write.
  For write scaling → sharding.
\`\`\`

**Interview tip**: Always mention that read replicas scale reads but NOT writes. For write scaling, you need sharding. Also discuss replication lag and how to handle read-after-write consistency for the user who just wrote.`
      },
      {
        question: 'How do you design a system that must handle both high read AND high write throughput?',
        answer: `**This is the hardest scenario** — you cannot optimize purely for one direction. The answer is CQRS with purpose-built stores for each path.

\`\`\`
CQRS Architecture for High Read + High Write:

  Writes (high throughput)          Reads (high throughput)
       │                                 ▲
       ▼                                 │
  ┌──────────┐                    ┌──────────────┐
  │ Write    │   CDC / Events     │ Read Store   │
  │ Store    │──────────────────►│ (denormalized,│
  │ (LSM,   │                    │  cached,      │
  │  append) │                    │  replicated)  │
  └──────────┘                    └──────────────┘

  Write Store: optimized for ingestion (Kafka → Cassandra)
  Read Store: optimized for queries (Elasticsearch, Redis, read replicas)
  CDC: Change Data Capture keeps them in sync
\`\`\`

**Concrete example — Twitter-like system**:
\`\`\`
Write Path (tweets, likes, follows):
  Client ──► API ──► Kafka ──► Write Workers ──► Cassandra
                                    │
                                    ▼
                              Event stream
                                    │
              ┌─────────────────────┼─────────────────┐
              ▼                     ▼                  ▼
         Timeline                Search            Analytics
         Service                 Index             Pipeline
         (Redis)                 (Elastic)         (Spark)

Read Path (home feed):
  Client ──► API ──► Redis (pre-built timeline)

  Cache miss:
  Client ──► API ──► Fan-out-on-read from followed users
\`\`\`

**Strategy comparison**:
\`\`\`
Approach              Read Perf    Write Perf    Consistency   Complexity
──────────────────────────────────────────────────────────────────────────
Single SQL DB         Medium       Medium        Strong        Low
Read replicas         High         Medium        Eventual      Low
CQRS                  Very High    Very High     Eventual      High
CQRS + Event Sourcing Very High    Very High     Eventual      Very High
\`\`\`

**Scaling each path independently**:
\`\`\`
Write scaling:
  Kafka partitions: 100 partitions × 10MB/s = 1GB/s ingest
  Cassandra nodes: 10 nodes × 20K writes/s = 200K writes/s

Read scaling:
  Redis cluster: 10 shards × 100K reads/s = 1M reads/s
  CDN: serves 70% of cacheable reads
  Elasticsearch: 5 nodes for full-text search

Total capacity:
  Writes: 200K/s
  Reads: 1M/s (from Redis) + CDN

  Each scales independently by adding nodes
  to the appropriate store.
\`\`\`

**Key insight**: Separate the write path and read path physically. Use an event stream (Kafka, CDC) as the bridge. Each side uses purpose-built technology optimized for its workload. This is how every large-scale system (Twitter, LinkedIn, Netflix) actually works.

**Interview tip**: When asked to design a system with mixed workload, immediately draw the CQRS split. It shows you understand that a single database cannot be simultaneously optimal for both reads and writes at scale.`
      },
    ],

    dataModel: {
      description: 'Read-heavy vs write-heavy architecture patterns',
      schema: `Read-Heavy Architecture:
  CDN → Cache (Redis) → Read Replicas → Primary DB
  Optimization: cache everything, replicate, denormalize
  Goal: minimize database reads

Write-Heavy Architecture:
  Kafka (buffer) → Stream Processor → LSM-Tree DB
  Optimization: sequential writes, batch, buffer
  Goal: maximize write throughput

Mixed (CQRS):
  Write Path: Kafka → Write-Optimized Store (Cassandra)
       │
       ▼ (CDC / events)
  Read Path: Read-Optimized Store (Redis, Elasticsearch)

Workload Classification:
  Read:Write Ratio    Category         Example
  100:1+              Read-heavy       Product catalog, Wikipedia
  10:1                Read-moderate    Social media (mixed)
  1:1                 Balanced         E-commerce orders
  1:10                Write-moderate   Chat messages
  1:100+              Write-heavy      IoT telemetry, logging`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 11. Primary-Replica vs Peer-to-Peer (communication-delivery)
  // ─────────────────────────────────────────────────────────
  {
    id: 'primary-replica-vs-peer-to-peer',
    title: 'Primary-Replica vs Peer-to-Peer Replication',
    icon: 'share2',
    color: '#f59e0b',
    questions: 7,
    description: 'Replication topology trade-offs — leader-follower vs multi-leader vs leaderless architectures.',
    concepts: [
      'Single-leader (primary-replica) replication',
      'Multi-leader replication',
      'Leaderless (peer-to-peer) replication',
      'Conflict detection and resolution',
      'Quorum reads and writes (R + W > N)',
      'Vector clocks and version vectors',
      'Last-write-wins vs merge strategies',
      'Split-brain prevention',
    ],
    tips: [
      'Primary-replica is the default for most systems — simple, well-understood, strong consistency on reads from primary',
      'Multi-leader is for multi-datacenter writes — each datacenter has a leader, conflicts resolved asynchronously',
      'Leaderless (Dynamo-style) gives the highest availability but requires quorum tuning and conflict resolution strategy',
      'The quorum formula R + W > N ensures overlap between reads and writes — tune R and W for your read/write ratio',
      'Last-write-wins (LWW) is the simplest conflict resolution but silently drops writes — only use when data loss is acceptable',
      'In interviews, discuss the CAP implications: primary-replica is CP (during partition, replicas are unavailable for writes), leaderless is AP (always accept writes, resolve later)',
    ],

    introduction: `**Replication topology** determines how data is copied across nodes in a distributed system. The three fundamental approaches — **single-leader** (primary-replica), **multi-leader**, and **leaderless** (peer-to-peer) — make different trade-offs between consistency, availability, write throughput, and operational complexity.

**Single-leader** replication routes all writes through one primary node, which replicates to followers. This is the most common topology (PostgreSQL, MySQL, MongoDB) because it avoids write conflicts entirely — there is only one writer. **Multi-leader** replication allows writes at multiple nodes (typically one per datacenter), accepting the complexity of conflict resolution for the benefit of lower write latency in each region. **Leaderless** replication (DynamoDB, Cassandra, Riak) allows any node to accept writes, using quorum-based reads and writes for consistency.

For system design interviews, understanding these topologies is essential because they directly impact your system's behavior during failures, cross-region latency, and write scalability. The choice should be driven by your geographic distribution requirements, consistency needs, and acceptable complexity level.`,

    keyQuestions: [
      {
        question: 'Compare single-leader, multi-leader, and leaderless replication. When would you use each?',
        answer: `\`\`\`
Single-Leader (Primary-Replica):
  ┌─────────┐
  │ Primary │ ◄── All writes
  └────┬────┘
       │ replication
  ┌────┴────┐ ┌─────────┐
  │Replica 1│ │Replica 2│ ◄── Reads only
  └─────────┘ └─────────┘

Multi-Leader:
  DC-1              DC-2
  ┌─────────┐       ┌─────────┐
  │ Leader  │◄─────►│ Leader  │ ◄── Both accept writes
  └────┬────┘       └────┬────┘     Conflicts resolved async
       │                 │
  ┌────┴────┐       ┌────┴────┐
  │Follower │       │Follower │
  └─────────┘       └─────────┘

Leaderless (Peer-to-Peer):
  ┌───────┐  ┌───────┐  ┌───────┐
  │Node A │◄►│Node B │◄►│Node C │ ◄── Any node accepts writes
  └───────┘  └───────┘  └───────┘     Quorum for consistency
\`\`\`

**Comparison**:
\`\`\`
Criteria              Single-Leader   Multi-Leader   Leaderless
────────────────────────────────────────────────────────────────
Write conflicts       None            Yes (async)    Yes (quorum)
Write throughput      1 node limit    Multi-DC       Any node
Read scaling          Replicas        Replicas       Any node
Consistency           Strong*         Eventual       Tunable
Failover              Promote replica Complex        No failover needed
Complexity            Low             High           Medium
Cross-DC latency      Write to 1 DC   Local writes   Local writes
Data loss risk        Async lag       Conflict loss   Quorum-dependent

* Strong if reading from primary; eventual if reading from replicas
\`\`\`

**When to use each**:
\`\`\`
Single-Leader:
  ✓ Most applications (default choice)
  ✓ Strong consistency required
  ✓ Single-region or read-heavy cross-region
  Examples: PostgreSQL, MySQL, MongoDB, Redis

Multi-Leader:
  ✓ Multi-datacenter with local write latency requirement
  ✓ Collaborative editing (each user = "leader")
  ✓ Offline-capable apps (each device = "leader")
  Examples: CouchDB, Cassandra (multi-DC), custom systems

Leaderless:
  ✓ Highest availability requirement
  ✓ Write-heavy, can tolerate eventual consistency
  ✓ No single point of failure desired
  Examples: Cassandra, DynamoDB, Riak, Voldemort
\`\`\`

**Interview tip**: Default to single-leader (90% of systems). Mention multi-leader only for explicit multi-DC write requirements. Mention leaderless when availability and write throughput trump consistency needs.`
      },
      {
        question: 'How do quorum reads and writes work in leaderless replication?',
        answer: `**Quorum rule**: For N replicas, choose R (read quorum) and W (write quorum) such that R + W > N. This guarantees at least one node in the read set has the latest write.

\`\`\`
Example: N=3, W=2, R=2  (R+W=4 > 3 ✓)

Write "X=5" (must succeed on W=2 nodes):
  Node A: X=5 ✓
  Node B: X=5 ✓
  Node C: (missed, still X=3)

Read X (query R=2 nodes):
  Possible read sets:
    {A, B} → both have X=5 → return 5 ✓
    {A, C} → A has 5, C has 3 → return 5 (latest) ✓
    {B, C} → B has 5, C has 3 → return 5 (latest) ✓

  At least 1 node in any R=2 set has the latest write!
\`\`\`

**Quorum configurations**:
\`\`\`
Config        R  W   Behavior
──────────────────────────────────────────────
R=N, W=1      3  1   Fast writes, slow reads (check all)
R=1, W=N      1  3   Fast reads, slow writes (write all)
R=2, W=2      2  2   Balanced (typical choice for N=3)
R=1, W=1      1  1   No consistency guarantee! (R+W=2 ≤ N=3)
\`\`\`

**How version resolution works**:
\`\`\`
Node A: X=5, version=7
Node C: X=3, version=5

Client reads from {A, C}:
  → Sees version 7 > version 5
  → Returns X=5 (latest version)
  → Optionally: trigger read repair on Node C

Read Repair:
  Client (or coordinator) sends X=5,v=7 to Node C
  Node C updates: X=5, version=7
  → Eventually all nodes converge
\`\`\`

**Sloppy quorum and hinted handoff**:
\`\`\`
Normal quorum (strict):
  Write to designated nodes {A, B, C}
  If B is down → write FAILS (cannot reach W=2)

Sloppy quorum:
  If B is down → write to substitute node D
  D stores a "hint" for B
  When B recovers → D sends hinted write to B

  Trade-off: higher availability, weaker consistency
  (D is not a "real" replica, so quorum reads may miss it)
\`\`\`

**Limitations of quorums**:
\`\`\`
Even with R + W > N, consistency can break:
  1. Sloppy quorum (writes go to non-designated nodes)
  2. Concurrent writes (which one wins?)
  3. Read and write arrive simultaneously (race condition)
  4. Write succeeds on some nodes, fails on others
  5. Node with latest value dies before read

Quorums are a probabilistic guarantee, not absolute.
For strong consistency: use consensus (Raft/Paxos) instead.
\`\`\`

**Interview tip**: Mention the R + W > N formula immediately, then discuss the practical limitations. This shows you understand both the theory and real-world behavior. For truly strong consistency, recommend consensus-based systems (etcd, CockroachDB) over quorum-based ones.`
      },
      {
        question: 'How do you handle write conflicts in multi-leader and leaderless systems?',
        answer: `**Conflicts occur when two writes to the same key happen on different nodes before replication syncs them.**

\`\`\`
Conflict scenario (multi-leader):

  DC-1 Leader:          DC-2 Leader:
  T=0: X = "Alice"      T=0: X = "Alice"
  T=1: X = "Bob"        T=1: X = "Carol"
       │                      │
       └──── replication ─────┘

  Both nodes now have conflicting values for X.
  Which one wins?
\`\`\`

**Conflict resolution strategies**:

\`\`\`
Strategy 1: Last-Write-Wins (LWW)
  Compare timestamps, highest wins.

  "Bob" at T=1.001, "Carol" at T=1.002
  → Carol wins, Bob's write is silently lost!

  Pros: Simple, deterministic
  Cons: Data loss (one write discarded)
  Use: When data loss is acceptable (cache, session, analytics)
  Used by: Cassandra (default), DynamoDB

Strategy 2: Application-Level Resolution
  Store both versions, let the application decide.

  Read returns: ["Bob", "Carol"] (siblings)
  App logic: merge, prompt user, or pick one

  Pros: No data loss
  Cons: Complex application code
  Use: When all writes are valuable (shopping carts)
  Used by: Riak, CouchDB

Strategy 3: CRDTs (Conflict-Free Replicated Data Types)
  Data structures designed to merge automatically.

  Counter: {A: +5, B: +3} merge → total = 8
  Set: {A: {x,y}, B: {y,z}} merge → {x, y, z}

  Pros: Automatic, mathematically correct
  Cons: Limited data types, memory overhead
  Use: Counters, sets, registers
  Used by: Riak (2.0+), Redis (CRDT mode)

Strategy 4: Operational Transformation (OT)
  Transform concurrent operations to converge.

  User A inserts "X" at position 3
  User B inserts "Y" at position 3
  OT: transform B's op to position 4 (after A's insert)

  Pros: Works for text editing
  Cons: Very complex, hard to prove correct
  Use: Collaborative editing (Google Docs)
\`\`\`

**Comparison**:
\`\`\`
Strategy        Data Loss  Complexity  Automatic  Use Case
──────────────────────────────────────────────────────────────
LWW             Yes        Low         Yes        Caches, logs
App-level       No         High        No         Shopping carts
CRDTs           No         Medium      Yes        Counters, sets
OT              No         Very High   Yes        Text editing
Vector clocks   Detection  Medium      No         General purpose
  + merge                                          (manual merge)
\`\`\`

**Interview tip**: Start with LWW (simplest, most common). Acknowledge its data loss issue. Then mention CRDTs for cases where all writes must be preserved. Mention OT only if specifically discussing collaborative editing.`
      },
      {
        question: 'How do you handle split-brain in a primary-replica system?',
        answer: `**Split-brain**: During a network partition, replicas elect a new primary while the old primary is still running. The system now has two primaries accepting conflicting writes.

\`\`\`
Normal Operation:
  Client ──► Primary ──► Replica A
                     ──► Replica B

Split-Brain:
  ┌─────────────────────────────────┐
  │ Partition 1:                     │
  │   Client ──► OLD Primary         │
  │              (thinks it's leader)│
  │                                  │
  │ Partition 2:                     │
  │   Client ──► Replica A          │
  │              (promoted to NEW    │
  │               Primary)           │
  │   Replica B (follows new leader) │
  └─────────────────────────────────┘

  TWO primaries accepting writes!
  Conflicting data accumulates until partition heals.
\`\`\`

**Prevention strategies**:

\`\`\`
Strategy 1: Fencing Tokens
  ┌──────────────────────────────────────┐
  │ New leader gets fencing token = 34   │
  │ Old leader had token = 33            │
  │                                      │
  │ Storage layer rejects writes with    │
  │ token < current highest seen (34)    │
  │ → Old leader's writes are blocked!   │
  └──────────────────────────────────────┘

Strategy 2: Quorum-Based Leader Election
  Majority (N/2 + 1) nodes must agree on leader.
  In a 5-node cluster: need 3 votes.

  Partition 1: [A, B] → only 2 nodes → cannot elect
  Partition 2: [C, D, E] → 3 nodes → can elect leader

  → Only one partition can have a leader!

Strategy 3: STONITH (Shoot The Other Node In The Head)
  When new leader is elected:
    → Forcibly shut down old leader (power off via IPMI)
    → Guarantees old leader cannot write

  Pros: Definitive
  Cons: Aggressive, hardware-dependent

Strategy 4: Lease-Based Leadership
  Leader holds a time-limited lease (e.g., 10 seconds).
  Must renew before expiry.

  If partitioned: cannot renew → lease expires → steps down
  New leader elected after old lease expires

  Clock skew risk: leader thinks lease is valid,
  but other nodes think it expired → use bounded clock skew
\`\`\`

**Comparison**:
\`\`\`
Strategy          Reliability     Complexity    Latency Impact
──────────────────────────────────────────────────────────────
Fencing tokens    High            Medium        None
Quorum election   Very High       Low (built-in) Election delay
STONITH           Very High       High          Restart delay
Lease-based       High            Medium        Lease duration
Epoch numbers     High            Low           None
  (Raft/Paxos)
\`\`\`

**How Raft prevents split-brain**:
\`\`\`
Term 5: Leader = Node A
  Network partition occurs

  Partition 1: [A] (minority)
    → A cannot get majority heartbeat ACKs
    → A steps down to follower

  Partition 2: [B, C, D, E] (majority)
    → Election timeout → B becomes candidate
    → B gets 3 votes (majority of 5) → B is leader (Term 6)

  Partition heals:
    → A sees Term 6 > Term 5 → A becomes follower of B
    → A replays B's log to catch up
    → No conflicting writes!
\`\`\`

**Interview tip**: The key insight is that split-brain is prevented by requiring a majority for leadership. In a 2N+1 node cluster, at most one partition can have a majority. Mention Raft/Paxos as the standard solution, and fencing tokens as an additional safety layer for storage access.`
      },
    ],

    dataModel: {
      description: 'Replication topology comparison',
      schema: `Replication Topologies:

Single-Leader:
  Primary ──► Replica 1
         ──► Replica 2
         ──► Replica 3
  Writes: Primary only | Reads: Any node

Multi-Leader:
  Leader A (DC-1) ◄──► Leader B (DC-2)
     │                    │
  Follower A1          Follower B1
  Writes: Any leader | Conflict resolution required

Leaderless:
  Node A ◄──► Node B ◄──► Node C
  Writes: Any node (quorum W) | Reads: Quorum R
  R + W > N for consistency overlap

Quorum Parameters (N=3):
  Strong reads:  R=2, W=2 (overlap guaranteed)
  Fast writes:   R=3, W=1 (read all, write any one)
  Fast reads:    R=1, W=3 (read any one, write all)
  No guarantee:  R=1, W=1 (no overlap, stale reads possible)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 12. CDN vs Direct Serving (communication-delivery)
  // ─────────────────────────────────────────────────────────
  {
    id: 'cdn-vs-direct-serving',
    title: 'CDN vs Direct Serving',
    icon: 'globe',
    color: '#f59e0b',
    questions: 7,
    description: 'When to use a CDN, cache invalidation strategies, edge computing, and the trade-offs of content delivery networks.',
    concepts: [
      'CDN architecture (PoPs, edge servers, origin)',
      'Cache-Control headers and TTL strategies',
      'Cache invalidation (purge, versioning, stale-while-revalidate)',
      'Dynamic content at the edge (edge computing)',
      'Multi-tier caching (edge, shield, origin)',
      'CDN for API responses (not just static assets)',
      'Cost models (bandwidth, requests, storage)',
      'Origin shielding and origin load reduction',
    ],
    tips: [
      'CDN is almost always the right choice for static assets — the latency improvement from geographic proximity is dramatic (200ms to 20ms)',
      'Cache invalidation is the hardest problem in CDN usage — prefer cache-busting URLs (hash in filename) over purge-based invalidation',
      'Dynamic API responses can benefit from CDN with short TTLs (5-60s) — even a 5-second cache prevents thundering herd on popular endpoints',
      'Origin shielding reduces origin load by having a mid-tier cache that consolidates requests from multiple edge PoPs',
      'stale-while-revalidate is the best header strategy — serve stale content immediately while fetching fresh content in the background',
      'In interviews, discuss the full request path: client → edge PoP → shield PoP → origin, and explain cache behavior at each layer',
    ],

    introduction: `A **Content Delivery Network** (CDN) is a globally distributed network of edge servers that cache and serve content close to end users. By reducing the physical distance between the user and the server, CDNs dramatically reduce latency — a user in Tokyo accessing a US-based origin server might see 200ms latency, but only 20ms from a Tokyo edge PoP.

While CDNs were originally designed for static assets (images, CSS, JavaScript), modern CDNs like **Cloudflare**, **AWS CloudFront**, and **Fastly** can cache API responses, execute serverless functions at the edge, and handle dynamic content with short TTLs. This blurs the line between CDN and edge computing platform.

The core trade-off is **freshness vs performance**. A CDN serves cached content instantly but may serve stale data. Direct serving always returns fresh data but adds latency and origin load. In system design interviews, the key is understanding **cache invalidation strategies** and knowing when CDN caching is safe (static assets, read-heavy public content) vs when it is dangerous (personalized data, rapidly changing content, authenticated responses).`,

    keyQuestions: [
      {
        question: 'How does a CDN work and what is the request flow through a multi-tier CDN?',
        answer: `**CDN architecture**:

\`\`\`
User Request Flow:

User (Tokyo) ──► DNS Resolution
                      │
                      ▼
               Anycast/GeoDNS routes to
               nearest PoP (Point of Presence)
                      │
                      ▼
          ┌──────────────────────┐
          │   Edge PoP (Tokyo)   │
          │  Cache HIT? → return │ ◄── L1 Cache
          │  Cache MISS? ↓       │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Shield PoP (US-West)│
          │  Cache HIT? → return │ ◄── L2 Cache (origin shield)
          │  Cache MISS? ↓       │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Origin Server       │
          │  (your application)  │ ◄── Source of truth
          └──────────────────────┘
\`\`\`

**Why origin shielding matters**:
\`\`\`
Without shield (origin gets hammered):
  Edge Tokyo   ──MISS──► Origin
  Edge London  ──MISS──► Origin
  Edge Sydney  ──MISS──► Origin
  Edge Sao Paulo──MISS──► Origin
  = 4 requests to origin for same content

With shield (origin protected):
  Edge Tokyo   ──MISS──► Shield ──MISS──► Origin (1 request)
  Edge London  ──MISS──► Shield ──HIT──► return
  Edge Sydney  ──MISS──► Shield ──HIT──► return
  Edge Sao Paulo──MISS──► Shield ──HIT──► return
  = 1 request to origin!
\`\`\`

**Cache behavior**:
\`\`\`
Request arrives at edge:
  1. Check local cache
     → HIT (within TTL): serve immediately (0ms origin latency)
     → STALE (past TTL): serve stale + revalidate in background*
     → MISS: forward to shield/origin

  2. Cache the response for future requests
     → Respect Cache-Control headers from origin
     → Or: CDN-specific rules override

* stale-while-revalidate behavior — best UX
\`\`\`

**Key CDN concepts**:
\`\`\`
PoP (Point of Presence):  Physical location with edge servers
                          Major CDNs have 200-300+ PoPs globally

Anycast:                  Same IP announces from all PoPs
                          BGP routing sends users to nearest

Cache Key:                URL + headers that differentiate cached responses
                          e.g., /api/products (vary by Accept-Language)

TTL:                      Time-to-Live — how long edge caches the response
                          Static assets: 1 year (versioned filenames)
                          API responses: 5s-60s (short TTL)
\`\`\`

**Interview tip**: Walk through the full request path (edge → shield → origin) and explain the cache behavior at each layer. This shows depth beyond just "use a CDN."`
      },
      {
        question: 'What are the best cache invalidation strategies for a CDN?',
        answer: `**Cache invalidation is the hardest problem** in CDN usage. Stale content hurts users; over-invalidation wastes CDN effectiveness.

\`\`\`
Strategy 1: Cache-Busting URLs (BEST for static assets)

  Old: /static/app.js
  New: /static/app.a1b2c3d4.js (content hash in filename)

  → Old URL stays cached (fine, no one requests it)
  → New URL is a cache miss → fetched from origin
  → No purge needed! Instant switch via HTML update.

  Used by: Every modern build tool (webpack, Vite, etc.)

Strategy 2: Purge / Invalidation API

  CDN provides API to invalidate specific URLs:
    POST /purge { "urls": ["/api/product/123"] }

  → All edge PoPs remove the cached response
  → Next request fetches fresh from origin

  Pros: Explicit control
  Cons: Propagation delay (seconds to minutes across all PoPs)
        Rate limits on purge API

  Used by: Cloudflare (instant purge), CloudFront (up to 15 min)

Strategy 3: Short TTL + stale-while-revalidate (BEST for APIs)

  Cache-Control: max-age=5, stale-while-revalidate=30

  T=0s: Response cached at edge
  T=3s: Request → serve from cache (fresh, <5s)
  T=7s: Request → serve stale + revalidate in background
  T=7.1s: Background fetch completes → cache updated
  T=8s: Request → serve fresh cached response

  Users NEVER wait for origin! Best UX.

Strategy 4: Tag-Based Invalidation (Surrogate Keys)

  Response includes tags:
    Surrogate-Key: product-123 category-electronics

  Invalidate by tag:
    PURGE tag=category-electronics
    → All responses tagged with that category are purged

  Pros: Surgical invalidation of related content
  Cons: Only supported by some CDNs (Fastly, Varnish)
\`\`\`

**Comparison**:
\`\`\`
Strategy              Speed        Precision   Complexity  Best For
──────────────────────────────────────────────────────────────────
Cache-busting URL     Instant      Exact       Low         Static assets
Purge API             Seconds-min  Per-URL     Medium      Dynamic content
Short TTL + SWR       TTL delay    Time-based  Low         API responses
Tag-based purge       Instant      Per-tag     Medium      CMS/catalog
Event-driven purge    Seconds      Per-entity  High        E-commerce
\`\`\`

**Anti-pattern: Long TTL + purge-on-update**:
\`\`\`
  Set TTL = 1 year for API responses
  Purge when data changes

  Problems:
  1. Purge may fail → stale data for 1 year!
  2. Purge takes time to propagate → inconsistency window
  3. If you miss a purge trigger → permanent stale data

  Better: Short TTL (5-60s) as a safety net even with purge
\`\`\`

**Interview tip**: Recommend cache-busting URLs for static assets and short TTL + stale-while-revalidate for API responses. Mention tag-based invalidation for content management systems. Always set a TTL safety net even when using active purging.`
      },
      {
        question: 'When should you NOT use a CDN?',
        answer: `**CDN is not appropriate for all content types.** Key scenarios where direct serving is better:

\`\`\`
Content Type              CDN Appropriate?    Reason
──────────────────────────────────────────────────────────────
Static assets (JS/CSS)    YES (always)        Immutable, cacheable
Public images/video       YES                 Heavy bandwidth, global
Public API (read-only)    YES (short TTL)     Reduces origin load
Personalized content      USUALLY NO          Different per user
Authenticated APIs        CAREFUL             Must vary by auth token
Real-time data            NO                  Stale by definition
WebSocket connections     NO                  Not cacheable
Write endpoints (POST)    NO                  Must reach origin
Small/single-region app   MAYBE NOT           Overhead > benefit
\`\`\`

**Detailed scenarios where CDN hurts**:

\`\`\`
Problem 1: Personalized Content
  /api/feed (different per user)
  CDN cache key = URL → serves User A's feed to User B!

  Fix: Vary by auth header → but then cache hit rate ≈ 0%
  Better: Skip CDN for personalized endpoints

Problem 2: Rapidly Changing Data
  /api/stock-price/AAPL (changes every second)
  Even 1-second TTL may serve stale price

  For trading: use WebSocket, bypass CDN entirely
  For display: 5-second TTL may be acceptable (discuss with PM)

Problem 3: Large File Uploads
  POST /api/upload (sending data TO server)
  CDN adds latency (extra hop) with no caching benefit
  Use direct upload to S3 with pre-signed URLs instead

Problem 4: Single-Region, Low-Traffic App
  10 users, all in same city as origin
  CDN adds complexity and cost without meaningful latency improvement
  Just use direct serving
\`\`\`

**Cost considerations**:
\`\`\`
CDN costs:
  Bandwidth: $0.01-0.08/GB (varies by region)
  Requests:  $0.01/10K requests
  Purge/invalidation: may have limits

Direct serving costs:
  Bandwidth: $0.05-0.09/GB (cloud egress)
  Compute:   Higher (no cache offload)

Breakeven: CDN is cheaper when cache hit rate > 60%
  Below that: you're paying CDN + origin costs

  Formula: CDN cost = (miss_rate × origin_cost) + cdn_fee
           Direct cost = origin_cost
           CDN wins when cdn_fee < (hit_rate × origin_cost)
\`\`\`

**Decision framework**:
\`\`\`
  Is the content public and cacheable?
    NO → Direct serving (personalized, auth, writes)
    YES ↓
  Are users geographically distributed?
    NO → Direct serving may be fine (single region)
    YES ↓
  Is the cache hit rate expected to be > 60%?
    NO → Direct serving (CDN adds cost without benefit)
    YES → USE CDN
\`\`\`

**Interview tip**: Show nuance by explaining that CDN is not a blanket solution. Segment your content: CDN for static assets and public APIs, direct serving for personalized and write endpoints. This demonstrates practical experience.`
      },
      {
        question: 'How does edge computing extend the CDN model for dynamic content?',
        answer: `**Edge computing** runs application logic at CDN edge PoPs, not just caching static content. This enables dynamic responses with CDN-like latency.

\`\`\`
Traditional CDN:
  Edge PoP: cache/serve static content only
  Dynamic requests → forward to origin (slow)

Edge Computing:
  Edge PoP: run code + cache + serve
  Dynamic requests → execute at edge (fast!)
  Only DB queries go to origin
\`\`\`

**Edge computing platforms**:
\`\`\`
Platform               Runtime           Cold Start    Limits
──────────────────────────────────────────────────────────────
Cloudflare Workers     V8 isolates       0ms           10ms CPU / 128MB
AWS CloudFront Fn      JavaScript        <1ms          <1ms limit
AWS Lambda@Edge        Node/Python       ~5-100ms      5s / 128MB
Fastly Compute         Wasm              0ms           Variable
Vercel Edge Functions  V8 (Node subset)  0ms           Variable
Deno Deploy            V8 (Deno)         0ms           Variable
\`\`\`

**Use cases for edge computing**:
\`\`\`
Use Case                  Why at Edge            Example
──────────────────────────────────────────────────────────────
A/B testing               No origin round-trip   Vary response at edge
Auth token validation     Reject early           JWT verify at edge
Geolocation routing       Know user location     Localized content
Bot detection             Block before origin    Fingerprint + block
Request transformation    Modify headers/body    Add user-agent header
Personalization (light)   Combine cached +       Inject user name into
                          user context            cached HTML template
API response assembly     Aggregate cached        Merge 3 cached API
                          fragments               responses at edge
\`\`\`

**Architecture comparison**:
\`\`\`
Traditional:
  Client ──200ms──► Edge ──100ms──► Origin ──► DB
  Total: ~350ms

Edge Computing:
  Client ──20ms──► Edge (runs logic) ──100ms──► DB*
  Total: ~150ms (if DB needed)
  Total: ~20ms (if edge cache + logic sufficient)

  *For reads that need DB: use edge + KV store
   Cloudflare KV, DynamoDB Global Tables
\`\`\`

**Edge data stores**:
\`\`\`
Store              Read Latency    Write Latency    Consistency
──────────────────────────────────────────────────────────────
Cloudflare KV      <10ms (global)  ~60s propagation  Eventual
Cloudflare D1      <10ms (SQLite)  ~ms (local)       Strong (local)
DynamoDB Global    <10ms (local)   ~ms (local)       Eventual (global)
Turso (LibSQL)     <5ms (replica)  ~ms (primary)     Eventual (global)
\`\`\`

**The spectrum from CDN to edge to origin**:
\`\`\`
  CDN (cache only)
    │ → Static assets, public API responses
    │ → No computation, just cache/serve
    ▼
  Edge Functions (light compute)
    │ → Auth, routing, A/B, personalization
    │ → Read from edge KV stores
    │ → Sub-10ms response times
    ▼
  Origin (full compute)
    → Complex business logic
    → Relational DB queries
    → Write operations
    → Full application runtime
\`\`\`

**Interview tip**: Position edge computing as the evolution of CDNs. It allows you to push read-path logic closer to users while keeping write-path and complex logic at the origin. Mention specific platforms (Cloudflare Workers, Lambda@Edge) to show practical knowledge.`
      },
    ],

    dataModel: {
      description: 'CDN architecture and cache invalidation patterns',
      schema: `CDN Request Flow:
  User ──► DNS (GeoDNS/Anycast) ──► Nearest Edge PoP
                                         │
                                    Cache HIT? → serve
                                    Cache MISS? ↓
                                         │
                                    Shield PoP (optional)
                                         │
                                    Cache HIT? → serve
                                    Cache MISS? ↓
                                         │
                                    Origin Server → response
                                         │
                                    Cache at shield + edge

Cache-Control Header Strategies:
  Static assets:  Cache-Control: public, max-age=31536000, immutable
                  (1 year, use cache-busting URLs for updates)

  API responses:  Cache-Control: public, max-age=5, stale-while-revalidate=30
                  (5s fresh, serve stale up to 30s while revalidating)

  Personalized:   Cache-Control: private, no-store
                  (never cache at CDN, only browser)

  Authenticated:  Cache-Control: private, max-age=0
                  (CDN skips, browser validates every time)

CDN Decision Matrix:
  Public + Static → CDN with long TTL + cache-busting URLs
  Public + Dynamic → CDN with short TTL + stale-while-revalidate
  Private + Personalized → No CDN (direct to origin)
  Write operations → No CDN (pass-through to origin)`
    },
  },
];
