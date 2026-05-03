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
    questions: 9,
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

    introduction: `**Caching strategies** define how data flows between your application, cache, and database. The right choice depends on your read/write ratio, consistency requirements, and tolerance for data loss. Getting this wrong leads to stale data serving to users, unnecessary database load, or cache layers that add latency without benefit. Consider the decision Netflix faced when building EVCache: they needed a caching layer that could handle 400 million operations per second across 14.3 petabytes of data while surviving node failures during peak events like the Tyson vs. Paul fight (65 million concurrent streams). The wrong caching strategy at that scale does not just slow things down — it takes the entire service offline.

The four fundamental strategies — **cache-aside**, **read-through**, **write-through**, and **write-behind** — each make different trade-offs between consistency, latency, and complexity. In practice most production systems combine two or more strategies: for example, cache-aside for reads paired with write-through for writes gives strong consistency without requiring the cache layer to understand your data access patterns. Facebook's TAO system evolved from a simple Memcached look-aside cache to a purpose-built graph-aware caching layer because the generic approach could not handle the consistency and bandwidth requirements of the social graph at scale — invalidating an entire edge list on every small update destroyed hit rates and wasted network bandwidth.

Real-world caching decisions are rarely about picking a single strategy. Netflix uses write-through caching for live streaming chunks via EVCache so reads are served from cache with near-zero origin load, while simultaneously using cache-aside with long TTLs for relatively static catalog metadata. Amazon uses write-behind patterns for shopping cart updates where sub-second write latency matters more than immediate database consistency. The strategy you choose for user session data (short TTL, cache-aside) will differ from the strategy for product recommendations (long TTL, read-through with background refresh).

Understanding these strategies is critical for system design interviews because caching appears in virtually every scalability discussion. Interviewers expect you to articulate **when** each strategy is appropriate, what failure modes it introduces, and how to mitigate problems like cache stampede, stale reads, and data loss on cache node failure. The strongest candidates frame the decision around three axes: read/write ratio, consistency tolerance, and failure impact.`,

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
      {
        question: 'How did Netflix build EVCache to handle 400M+ ops/second, and what caching patterns does it use?',
        answer: `**Netflix's EVCache** is a distributed, multi-tiered caching layer built on top of Memcached that powers everything from movie recommendations to homepage feeds. It processes over 400 million operations per second across 14.3 petabytes of cached data.

**Architecture and caching patterns used**:
\`\`\`
EVCache Architecture:
  Client App ──► EVCache Client Library
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Zone A Cache  Zone B Cache  Zone C Cache
   (Memcached    (Memcached    (Memcached
    cluster)      cluster)      cluster)

Write path: write-through to ALL zones (consistency)
Read path:  cache-aside from LOCAL zone (latency)
Fallback:   cross-zone read on local miss (availability)
\`\`\`

**Key design decisions**:
\`\`\`
Decision                     Pattern Used         Why
──────────────────────────────────────────────────────────────
Catalog metadata             Cache-aside + TTL    Reads vastly outnumber writes,
                                                  stale data OK for seconds
Live streaming chunks        Write-through        Must be immediately available,
                                                  zero cache misses during live events
Recommendation signals       Write-behind         High write throughput needed,
                                                  eventual consistency acceptable
User session data            Cache-aside + short  Frequent access, must handle
                             TTL (15-30 min)      session expiry naturally
\`\`\`

**Resilience patterns** Netflix layers on top:
- **Circuit breakers** (Hystrix): skip cache if latency spikes, go direct to DB
- **Bulkheads**: each cache region is isolated — one zone failure does not cascade
- **Retry budget**: capped retries prevent thundering herd on cache recovery
- **Zone-aware routing**: reads go to the local AZ first, cross-zone only on miss

**When to choose A vs B — Netflix's decision framework**:
- Cache-aside for data where the application needs control over what gets cached and TTLs vary per entity
- Write-through for data that must be immediately readable after write (live streaming, real-time features)
- Write-behind for high-volume signals where write latency matters more than immediate DB persistence

**Interview tip**: Reference EVCache to show you understand production caching at scale. The key insight is that Netflix does not use one strategy — they use different strategies for different data categories within the same system, which is the correct answer for any large-scale caching question.`
      },
      {
        question: 'How did Facebook evolve from Memcached to TAO, and what does this teach about caching architecture?',
        answer: `**Facebook's caching journey** illustrates why generic cache-aside patterns break down at extreme scale and how purpose-built caching layers emerge.

**Phase 1 — Memcached as look-aside cache**:
\`\`\`
Application ──► Memcached (cache-aside)
    │               │
    │ (miss)        │ (hit)
    ▼               ▼
  MySQL ──────► return to app

Problem at Facebook's scale:
  - Social graph has interconnected objects and edges
  - Small edge update (add friend) invalidated entire
    friend list in cache → destroyed hit rate
  - Transferring full lists wasted bandwidth and CPU
  - Application code had to manage complex invalidation
    logic for graph consistency
\`\`\`

**Phase 2 — TAO (The Associations and Objects store)**:
\`\`\`
TAO Architecture:
  Application ──► Follower Cache (read)
                      │
                      │ (miss)
                      ▼
                  Leader Cache ──► MySQL
                      │
                  (graph-aware
                   invalidation)

Key innovation: cache understands the graph data model
  - Objects: user, post, photo (node)
  - Associations: friend, like, comment (edge)
  - Updates invalidate ONLY affected edges, not entire lists
\`\`\`

**Performance results**:
\`\`\`
Metric                    Memcached Era    TAO
──────────────────────────────────────────────────
Cache hit rate            ~90%             96.4%
Read throughput           Limited          1B+ reads/sec
Invalidation granularity  Entire key       Per-edge
App code complexity       High             Low (API handles it)
Cross-region consistency  Manual           Built-in
\`\`\`

**When to choose A vs B — lessons from Facebook's evolution**:
- **Cache-aside (Memcached)**: Great for simple key-value workloads where objects are independent. Choose when your data model is flat and invalidation is straightforward.
- **Purpose-built cache (TAO)**: Necessary when your data model has complex relationships, invalidation of one entity affects many cached items, and application-level cache management becomes unmaintainable.
- **The middle ground**: Most systems should start with cache-aside (Redis/Memcached). Only build a domain-aware caching layer when you can quantify that generic invalidation is destroying your hit rate or creating untenable application complexity.

**Interview tip**: The Facebook TAO story is perfect for showing that caching architecture must evolve with scale. Start with the simplest approach (cache-aside), measure hit rates and invalidation costs, and only build specialized caching infrastructure when generic patterns demonstrably fail.`
      },
      {
        question: 'How do you implement cache warming and pre-population strategies?',
        answer: `**Cache warming** pre-loads data into the cache before it is requested, avoiding the cold-start problem where a fresh cache has zero hits and all traffic hits the database.

**When cache warming is critical**:
\`\`\`
Scenario                         Impact of Cold Cache
──────────────────────────────────────────────────────────────
New deployment/restart           DB overwhelmed by cache misses
New region/datacenter launch     All users experience slow first load
After cache flush (bug, upgrade) Thundering herd on DB
Seasonal traffic spike           Black Friday: cannot afford warm-up time
\`\`\`

**Strategy 1 — Pre-population from database on startup**:
\`\`\`
On service start:
  1. Query DB for top N most-accessed keys
     SELECT key, value FROM products
     ORDER BY access_count DESC LIMIT 10000
  2. Bulk-load into cache
     MSET key1 val1 key2 val2 ... (Redis pipeline)
  3. Begin accepting traffic

Trade-off: slower startup, but no cold-start penalty
\`\`\`

**Strategy 2 — Shadow traffic / request replay**:
\`\`\`
Before cutover to new cache:
  1. Record production read traffic (keys accessed)
  2. Replay against new cache (populates it)
  3. Switch traffic when hit rate > threshold (e.g., 90%)

  Production ──► Old Cache (serving)
       │
       └──► New Cache (warming via replay)
            Hit rate: 0% → 50% → 85% → 95%
            At 95%: switch traffic to new cache
\`\`\`

**Strategy 3 — Event-driven pre-population**:
\`\`\`
On data change event:
  DB write ──► CDC event ──► Cache updater
                              │
                              ▼
                         Cache.SET(key, new_value)

Cache is always warm for recently-changed data.
Combine with TTL-based expiry for unchanged data.
\`\`\`

**Strategy 4 — Tiered warming (Netflix approach)**:
\`\`\`
Tier 1: Hot data (top 1% of keys = 80% of traffic)
  → Pre-load on startup, refresh every minute
Tier 2: Warm data (next 9% of keys)
  → Pre-load on startup, refresh every 10 minutes
Tier 3: Cold data (remaining 90%)
  → Lazy-load on first access (cache-aside)

Memory budget: allocate 70% to Tier 1, 20% to Tier 2
\`\`\`

**When to choose A vs B**:
- **Pre-population on startup**: Best for predictable datasets where you know the hot keys (product catalogs, config data)
- **Shadow traffic replay**: Best for large, unpredictable workloads where access patterns are complex (personalized feeds, search)
- **Event-driven warming**: Best when data changes frequently and you need the cache to always reflect recent writes
- **Skip warming entirely**: Acceptable when traffic ramps slowly (new product launch) and cache-aside naturally warms over minutes

**Interview tip**: Cache warming shows operational maturity. Mention it when discussing deployments, failovers, or scaling to new regions. The key insight is that cold caches can cause cascading failures — a deployment that flushes cache during peak traffic can take down the database.`
      },
      {
        question: 'How do you choose between Redis and Memcached for a caching layer, and what are the implications for caching strategy?',
        answer: `**Redis and Memcached** are the two dominant distributed caching technologies, but they have fundamentally different capabilities that affect which caching strategies you can implement.

**Feature comparison**:
\`\`\`
Feature               Redis                    Memcached
──────────────────────────────────────────────────────────────
Data structures       Strings, hashes, lists,  Strings only
                      sets, sorted sets,
                      streams, HyperLogLog
Persistence           RDB snapshots + AOF      None (volatile only)
Replication           Built-in primary-replica None (client-side)
Clustering            Redis Cluster (auto)     Client-side consistent hash
Pub/Sub               Built-in                 None
Lua scripting         Yes                      None
Memory efficiency     Less (overhead per key)  More (slab allocator)
Max value size        512MB                    1MB
Threading             Single-threaded*         Multi-threaded
Eviction policies     8 policies (LRU, LFU,   LRU only
                      random, TTL-based)

* Redis 6+ uses I/O threads for network, but commands
  are still single-threaded (simplifies atomicity).
\`\`\`

**Caching strategy implications**:
\`\`\`
Strategy              Redis Support            Memcached Support
──────────────────────────────────────────────────────────────
Cache-aside           Full                     Full
Read-through          Via client library       Via client library
Write-through         Full (with persistence)  Partial (no persistence)
Write-behind          Redis Streams as buffer  Need external queue
Cache stampede lock   SETNX (atomic)           ADD (atomic)
Tag-based invalidation Sets to track keys      Manual tracking
Sorted cache (top-N)  Sorted sets              Not possible
Rate limiting         INCR + EXPIRE (atomic)   INCR + EXPIRE (less atomic)
Session store         Hashes + TTL             Strings + TTL
Pub/sub invalidation  Built-in                 Need external system
\`\`\`

**When to choose each — company case studies**:
\`\`\`
Choose Redis when:
  - Need data structures beyond strings (leaderboards, queues, counters)
  - Need persistence as safety net for write-behind patterns
  - Need pub/sub for cache invalidation across services
  - Need atomic operations (rate limiting, distributed locks)
  Companies: GitHub (sessions + queues), Twitter (timeline cache),
             Pinterest (sorted sets for feeds), Stripe (rate limiting)

Choose Memcached when:
  - Simple key-value caching with maximum memory efficiency
  - Very high throughput on multi-core servers (multi-threaded)
  - Cache data is fully reproducible from source (no persistence needed)
  - Need maximum simplicity in operations
  Companies: Netflix EVCache (Memcached-based), Facebook (Memcached
             at massive scale before TAO), Wikipedia (page cache)
\`\`\`

**When to choose A vs B — decision framework**:
- **Default to Redis**: It covers more use cases and the operational overhead difference is minimal for most teams
- **Choose Memcached when**: You need pure caching throughput on multi-core machines, your data is simple key-value, and you want maximum memory efficiency
- **Use both**: Some companies run Memcached for simple high-throughput caching and Redis for data-structure-heavy features (rate limiting, queues, pub/sub)

**Interview tip**: Mention that Redis is the safer default for most systems because it supports more caching patterns. Only recommend Memcached when you can articulate why multi-threaded throughput or memory efficiency matters for the specific workload. Netflix's choice of Memcached (via EVCache) was driven by the extreme scale where memory efficiency per key matters at petabyte scale.`
      },
      {
        question: 'How do you handle cache consistency in a microservices architecture where multiple services read and write the same cached data?',
        answer: `**The challenge**: In a microservices architecture, Service A may update user data in the database while Service B has a cached copy. Without coordination, Service B serves stale data indefinitely.

\`\`\`
The consistency problem:
  Service A ──► DB: UPDATE user SET name='Bob'
                    (DB updated)

  Service B ──► Cache: GET user:123
               ◄── returns {name: 'Alice'} (STALE!)

  Service B's cache was populated before A's write
  and has no way to know it is stale.
\`\`\`

**Solution 1 — Event-driven invalidation (recommended)**:
\`\`\`
Service A writes to DB
    │
    ▼
DB ──► CDC (Change Data Capture) ──► Event Bus (Kafka)
                                          │
                        ┌─────────────────┼──────────────┐
                        ▼                 ▼              ▼
                   Service A          Service B      Service C
                   invalidate         invalidate     invalidate
                   local cache        local cache    local cache

Each service subscribes to data-change events
and invalidates/refreshes its own cache entries.
\`\`\`

**Solution 2 — Shared cache with TTL safety net**:
\`\`\`
All services ──► Shared Redis ──► DB
                 (single source of cached truth)

Service A writes:
  1. Update DB
  2. Update Redis (or delete key to force refresh)

Service B reads:
  1. Check Redis → always sees latest from any service's write

TTL safety net: even if invalidation fails, stale data
expires within N seconds.
\`\`\`

**Solution 3 — Cache-aside with version stamps**:
\`\`\`
Cache key includes version: user:123:v7

Service A writes:
  1. Update DB (version incremented to v8)
  2. Publish event: {entity: user:123, version: 8}

Service B receives event:
  1. Current cache key: user:123:v7
  2. Knows v7 < v8 → invalidate
  3. Next read: cache miss → fetch v8 from DB → cache as user:123:v8
\`\`\`

**Comparison of approaches**:
\`\`\`
Approach              Consistency    Complexity     Best For
──────────────────────────────────────────────────────────────
Event-driven (CDC)    Near-real-time High           Large systems, many services
Shared cache          Strong         Medium         Small teams, few services
Version stamps        Near-real-time Medium         Medium systems
TTL-only              Eventual       Low            When staleness is acceptable
Write-through shared  Strong         Low            Simple architectures
\`\`\`

**When to choose A vs B**:
- **Shared Redis cache**: Choose when you have fewer than 10 services, all in the same region, and you want simplicity. The shared cache is the single source of cached truth.
- **Event-driven invalidation**: Choose when you have many services, cross-region deployments, or services that cache different projections of the same data. Gives each service autonomy over its own cache.
- **TTL-only**: Choose when staleness of N seconds is acceptable and you want zero coordination overhead. Set TTL = max acceptable staleness.

**Interview tip**: This question tests whether you understand the distributed systems implications of caching. The key insight is that caching in microservices introduces a consistency problem that does not exist in monoliths. Always mention the TTL safety net — even with active invalidation, TTL provides a bounded staleness guarantee if invalidation fails.`
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

    introduction: `**Batch processing** and **stream processing** represent two fundamentally different approaches to handling data. Batch processing collects data over a period, then processes it all at once — think nightly ETL jobs, monthly reports, or Hadoop MapReduce. Stream processing handles data continuously as it arrives — think real-time dashboards, fraud detection, or live recommendation updates. The decision between them shapes your entire data infrastructure, from storage choices to team skills to operational costs. Spotify runs 20,000 batch pipelines daily across 1,000+ repositories owned by 300+ teams — at that scale, choosing the wrong processing paradigm for a workload wastes millions in compute costs annually.

The **Lambda architecture** was proposed by Nathan Marz to get the best of both worlds: a batch layer for accurate historical results and a speed layer for low-latency approximate results. However, maintaining two separate codebases that must produce consistent results proved operationally painful. LinkedIn experienced this firsthand — their Apache Samza (stream) plus Apache Spark (batch) Lambda architecture required maintaining dual codebases and reconciling results between them. This led Jay Kreps (LinkedIn) to propose the **Kappa architecture**, which uses a single stream processing layer with the ability to reprocess historical data by replaying the log. LinkedIn later unified their pipelines on Apache Beam, achieving 2x cost optimization and 2x performance improvement by eliminating the dual-pipeline overhead.

The industry is converging on **unified frameworks** like Apache Beam, Apache Flink, and Spark Structured Streaming that can handle both batch and streaming workloads with a single codebase. Spotify uses Scio (a Scala API for Apache Beam) to write pipelines once and run them on Google Dataflow for both batch and streaming execution. LinkedIn processes 4 trillion events daily through their unified pipeline, and their anti-abuse platform accelerated from days to minutes in detecting fake accounts after moving to real-time processing.

For system design interviews, the key is understanding **when each approach is appropriate**. Batch is simpler, cheaper, and more correct for historical analytics. Streaming is necessary when business value depends on low latency — fraud detection, real-time bidding, IoT monitoring, or live personalization. Many production systems use a hybrid approach with streaming for recent data and batch for historical corrections. The strongest candidates frame the decision around latency requirements, data completeness needs, cost constraints, and team operational maturity.`,

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
      {
        question: 'How did LinkedIn evolve from Lambda architecture to unified batch and stream processing?',
        answer: `**LinkedIn's journey** is one of the most well-documented evolutions from Lambda to a unified processing model, and it directly shaped the Kappa architecture concept.

**Phase 1 — Lambda Architecture (2012-2018)**:
\`\`\`
LinkedIn's original data processing stack:
  Events ──► Kafka (ingestion backbone)
                │
        ┌───────┴───────┐
        ▼               ▼
  Apache Samza       Apache Spark
  (stream layer)     (batch layer)
  - Real-time feed   - Nightly analytics
  - Low latency      - Full correctness
  - Approximate       - Historical reprocessing
        │               │
        └───────┬───────┘
                ▼
          Serving Layer (merge results)

Problems encountered:
  - Dual codebases for same logic (Samza + Spark)
  - Results diverged between batch and stream
  - Operational cost of maintaining both pipelines
  - Debugging inconsistencies was extremely difficult
\`\`\`

**Phase 2 — Unified on Apache Beam (2019+)**:
\`\`\`
Apache Beam unified pipeline:
  Events ──► Kafka ──► Beam Pipeline ──► Outputs
                       (single codebase)
                       │
                       ├── Runs as streaming job (real-time)
                       └── Runs as batch job (backfill/correction)

  Same logic, same codebase, different execution modes.
\`\`\`

**Results from the migration**:
\`\`\`
Metric                    Lambda Era      Unified (Beam)
──────────────────────────────────────────────────────────
Cost-to-serve             Baseline        2x reduction
Processing performance    Baseline        2x improvement
Memory/CPU efficiency     Baseline        2x improvement
Anti-abuse detection      Days            Minutes
Fake account detection    Baseline        21% improvement
Scraping detection        Baseline        15% improvement
Codebase maintenance      2 codebases     1 codebase
\`\`\`

**When to choose A vs B — LinkedIn's decision framework**:
- **Lambda architecture**: Choose if you have existing batch infrastructure you cannot replace, need guaranteed correctness for compliance, or your team has deep Spark expertise but not Flink/Beam
- **Unified streaming (Kappa/Beam)**: Choose for greenfield projects, when maintaining dual codebases is costing engineering velocity, or when latency reduction has direct business value (fraud detection, abuse prevention)
- **Key caveat**: Unified does not mean "streaming only" — Apache Beam runs the same pipeline in both batch and streaming mode, so you still get batch correctness when needed

**Interview tip**: The LinkedIn story demonstrates that Lambda architecture is not wrong — it is a stepping stone. Most companies that start with Lambda eventually consolidate. Lead with this evolutionary perspective to show architectural maturity.`
      },
      {
        question: 'How does Spotify manage 20,000+ daily batch pipelines alongside real-time streaming at scale?',
        answer: `**Spotify's data platform** is one of the largest hybrid batch/stream architectures, processing data for 600M+ monthly active users across 20,000 daily batch pipelines.

**Architecture overview**:
\`\`\`
Spotify's Hybrid Data Platform:

  User Events ──► Google Pub/Sub ──┬──► Dataflow (streaming)
  (plays, skips,                    │    - Real-time metrics
   searches)                        │    - Live A/B test results
                                    │    - Instant recommendations
                                    │
                                    └──► GCS ──► Dataflow (batch)
                                              - Daily aggregations
                                              - ML training data
                                              - Revenue reporting

  Most pipelines written in Scio (Scala API for Apache Beam)
  → Same code can run batch or streaming
\`\`\`

**Scale**:
\`\`\`
Daily pipeline volume:
  - 20,000+ batch pipelines
  - 1,000+ repositories
  - 300+ owning teams
  - Petabytes of data processed daily

Pipeline ownership model:
  Team A ──► owns pipelines for recommendation signals
  Team B ──► owns pipelines for royalty calculation
  Team C ──► owns pipelines for ad targeting
  Each team owns their data endpoints end-to-end
\`\`\`

**Key design decisions**:
\`\`\`
Decision                 Choice Made              Why
──────────────────────────────────────────────────────────────
Pipeline framework       Scio (Apache Beam)       Write-once, run batch or stream
Execution engine         Google Dataflow           Managed, auto-scaling
Data warehouse           BigQuery                  Analytics + ML training
Scheduling               Internal (Styx)           Custom for Spotify's scale
Storage                  GCS + BigQuery             Separation of compute/storage
Real-time ingestion      Google Pub/Sub             Managed, low-latency
\`\`\`

**Batch vs stream decision at Spotify**:
\`\`\`
Use Case                    Mode        Reason
──────────────────────────────────────────────────────────────
Royalty calculations        Batch       Must be 100% accurate, auditable
ML model training           Batch       Need complete datasets, cost-efficient
Wrapped (year in review)    Batch       Annual aggregation, massive scale
Real-time play counts       Stream      Users expect instant counter updates
A/B test monitoring         Stream      Need to detect issues quickly
Fraud detection             Stream      Must flag suspicious activity fast
Podcast episode popularity  Hybrid      Stream for trending, batch for totals
\`\`\`

**When to choose A vs B — Spotify's pragmatic approach**:
- **Batch when**: Correctness > latency, data is naturally periodic (daily/weekly), cost matters (spot instances), or output feeds ML training
- **Stream when**: Business value degrades with delay (fraud, abuse), users expect real-time feedback (play counts), or you need to react to events (trending content)
- **Hybrid when**: You need both a real-time view and a corrected historical view (most analytics use cases)

**Interview tip**: Spotify's architecture shows that batch is not dead — even the most modern data platforms run thousands of batch pipelines daily. The key is picking the right mode per use case, not dogmatically choosing one paradigm. Use Spotify as an example of pragmatic architecture at scale.`
      },
      {
        question: 'How do you handle backpressure in a streaming pipeline, and what happens when consumers cannot keep up?',
        answer: `**Backpressure** occurs when a downstream component cannot process data as fast as the upstream component produces it. Without backpressure handling, the system either drops data, runs out of memory, or crashes.

\`\`\`
The backpressure problem:
  Producer: 10,000 events/sec ──► Consumer: 5,000 events/sec
                                   │
                                   Buffer fills up
                                   │
                             ┌─────┴─────┐
                             │  What now? │
                             └─────┬─────┘
                        ┌──────────┼──────────┐
                        ▼          ▼          ▼
                   Drop data   Buffer to    Slow down
                   (lossy)     disk (lag)   producer
\`\`\`

**Strategy 1 — Buffering (Kafka model)**:
\`\`\`
Producer ──► Kafka (persistent buffer) ──► Consumer

Kafka retains messages for configurable duration (hours/days).
Consumer reads at its own pace.
Lag = how far behind consumer is.

  Partition lag over time:
  T=0:  lag=0      (caught up)
  T=1h: lag=50K    (producer burst, consumer steady)
  T=2h: lag=20K    (consumer catching up)
  T=3h: lag=0      (caught up again)

Kafka as buffer absorbs temporary bursts.
Alert when lag exceeds threshold (e.g., > 1M messages).
\`\`\`

**Strategy 2 — Rate-based backpressure (Flink/Reactive Streams)**:
\`\`\`
Flink's credit-based flow control:
  Downstream operator has N buffer slots
  Sends credits upstream: "I can accept N more records"
  Upstream sends only N records, then waits for more credits

  Operator A ──► Operator B ──► Operator C
             credits=5     credits=3

  If C is slow: C sends fewer credits to B
  B sends fewer credits to A → entire pipeline slows down

  No data loss, no unbounded buffering.
  Trade-off: increased end-to-end latency during backpressure.
\`\`\`

**Strategy 3 — Sampling/dropping (lossy)**:
\`\`\`
When acceptable:
  - Metrics/monitoring (approximate counts are fine)
  - Log ingestion (losing some logs during spike is OK)
  - Analytics (sampling gives statistical accuracy)

Implementation:
  if (buffer_utilization > 80%):
    sample_rate = 0.5  (process every other message)
  if (buffer_utilization > 95%):
    sample_rate = 0.1  (process 1 in 10)
\`\`\`

**Strategy 4 — Autoscaling consumers**:
\`\`\`
Monitor consumer lag
  → lag > threshold for 5 minutes
  → scale up consumer instances
  → new instances assigned partitions (rebalance)
  → lag decreases as processing capacity increases

Kafka Streams: auto-rebalances partitions across instances
Flink: rescale parallelism (with savepoint)
\`\`\`

**Comparison**:
\`\`\`
Strategy          Data Loss   Latency Impact   Complexity
──────────────────────────────────────────────────────────
Kafka buffering   None        Lag increases    Low
Rate-based (Flink) None      Pipeline slows   Built-in
Sampling/dropping  Yes        None             Low
Autoscaling       None        Brief during     Medium
                              rebalance
Spill to disk     None        Higher           Medium
\`\`\`

**When to choose A vs B**:
- **Kafka buffering**: Default choice — decouples producers and consumers, handles most burst scenarios naturally
- **Rate-based backpressure**: Choose for complex multi-operator pipelines where you need the entire pipeline to slow gracefully (Flink, Spark Structured Streaming)
- **Sampling**: Choose for monitoring/metrics where approximate results are acceptable and you cannot afford any latency increase
- **Autoscaling**: Choose when traffic patterns are predictable enough for scaling to react in time (minutes, not seconds)

**Interview tip**: Backpressure is a critical topic that separates junior from senior candidates. Always mention Kafka as a buffer layer and credit-based flow control (Flink) as the two primary approaches. The key insight is that backpressure converts a space problem (buffer overflow) into a time problem (increased latency), which is almost always the better trade-off.`
      },
      {
        question: 'How do you choose between Apache Flink, Kafka Streams, and Spark Structured Streaming?',
        answer: `**These three are the dominant stream processing frameworks**, each with different deployment models, state management, and performance characteristics.

**Architecture comparison**:
\`\`\`
Kafka Streams:
  Embedded library (runs inside your app)
  ┌─────────────────────┐
  │  Your Application   │
  │  ┌────────────────┐ │
  │  │ Kafka Streams  │ │  ← Just a JAR dependency
  │  │ (processing)   │ │  ← No separate cluster
  │  └────────────────┘ │
  └─────────────────────┘
  Deploys with: standard app deployment (K8s, ECS)

Apache Flink:
  Dedicated cluster (JobManager + TaskManagers)
  ┌──────────────┐  ┌──────────────┐
  │ JobManager   │  │ TaskManager  │
  │ (coordinator)│  │ (workers)    │
  └──────────────┘  │ TaskManager  │
                    └──────────────┘
  Deploys with: YARN, Kubernetes, standalone

Spark Structured Streaming:
  Micro-batch on Spark cluster
  ┌──────────────┐  ┌──────────────┐
  │ Spark Driver │  │ Executors    │
  │ (coordinator)│  │ (workers)    │
  └──────────────┘  └──────────────┘
  Deploys with: YARN, Kubernetes, Databricks
\`\`\`

**Detailed comparison**:
\`\`\`
Feature              Kafka Streams     Flink              Spark SS
──────────────────────────────────────────────────────────────────
Deployment           Library (embed)   Cluster            Cluster
Latency              Low (ms)          Very low (ms)      Higher (100ms+)*
State management     RocksDB local     RocksDB + remote   Spark state store
Exactly-once         Yes (Kafka)       Yes (end-to-end)   Yes (micro-batch)
Windowing            Full support      Best support       Full support
Source/Sink          Kafka only        Any (Kafka, S3,    Any (Kafka, S3,
                                       JDBC, files)       JDBC, files)
Batch processing     No                Yes (unified)      Yes (native)
Cluster management   None (embedded)   Required           Required
Scaling              Add app instances Scale operators    Scale executors
Learning curve       Low               Medium             Low (if know Spark)

* Spark SS uses micro-batches (100ms+ latency by default)
  Continuous processing mode gets lower latency but is experimental
\`\`\`

**When to choose each — company case studies**:
\`\`\`
Kafka Streams:
  ✓ Team already runs Kafka, wants to add light processing
  ✓ Source and sink are both Kafka topics
  ✓ No separate cluster management desired
  ✓ Moderate state size (fits on local disk)
  Companies: Walmart (inventory), New York Times (content pipeline)

Flink:
  ✓ Need lowest latency with complex event processing
  ✓ Large stateful computations (TBs of state)
  ✓ Need unified batch + stream in one engine
  ✓ Sources beyond Kafka (S3, JDBC, custom)
  Companies: Alibaba (Singles Day), Uber (surge pricing),
             Netflix (data pipeline), Lyft (streaming platform)

Spark Structured Streaming:
  ✓ Team already has Spark expertise and infrastructure
  ✓ Micro-batch latency (100ms+) is acceptable
  ✓ Heavy batch workload + some streaming
  ✓ Strong ML/analytics integration needed
  Companies: Apple (analytics), Netflix (ETL), Databricks customers
\`\`\`

**When to choose A vs B — decision framework**:
- **Default to Kafka Streams** if your data is already in Kafka and you want the simplest deployment model
- **Choose Flink** when you need sub-millisecond latency, massive state, complex event processing, or non-Kafka sources/sinks
- **Choose Spark Structured Streaming** when your team already runs Spark for batch and ML, and micro-batch latency is acceptable

**Interview tip**: The choice between these three is less about capability and more about operational context. All three can handle most streaming workloads. Lead with your deployment model preference and data source constraints, then justify the choice based on latency requirements and team expertise.`
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

    introduction: `The distinction between **stateful** and **stateless** services is one of the most fundamental architectural decisions in distributed systems. A **stateless service** treats each request independently — all needed context comes in the request itself, and any instance can handle any request. A **stateful service** maintains data between requests — in-memory sessions, caches, WebSocket connections, or accumulated computations. Consider the operational difference: when a stateless API server crashes at 3 AM, the load balancer routes traffic to other instances with zero impact. When a stateful game server crashes, every player on that server is disconnected and their in-progress game state may be lost.

**Stateless services** are the default choice for web application backends because they scale horizontally by simply adding more instances behind a load balancer. There are no affinity requirements, rolling deployments are trivial, and a failed instance is replaced without data loss. The trade-off is that every request must fetch state from an external store, adding latency. Companies like Shopify serve 19 million MySQL queries per second from a stateless application tier — any of their thousands of application servers can handle any merchant's request because all state lives in the database and cache layers.

**Stateful services** are necessary when the cost of externalizing state is prohibitive — real-time game servers, in-memory data grids, WebSocket hubs, or stream processing operators. Discord's chat infrastructure is inherently stateful: each guild is assigned to a specific server process that holds member presence, typing indicators, and voice state in memory. Externalizing these to Redis would add 1ms per update multiplied by hundreds of updates per second per guild — unacceptable latency that would degrade the real-time experience. The challenge is that scaling, deploying, and recovering stateful services is significantly more complex.

The **12-Factor App** methodology recommends stateless processes as a default, and for good reason: stateless services are operationally simpler in every dimension — deployment, scaling, failure recovery, and debugging. But modern distributed systems increasingly require selective statefulness for performance-critical paths. Interviewers want to see that you understand this trade-off and can articulate clear criteria for when statefulness is justified versus when state should be externalized to a dedicated data store.`,

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
      {
        question: 'How does Discord handle stateful services at scale for real-time chat and voice?',
        answer: `**Discord** is one of the best case studies for stateful service architecture because their core product — real-time chat, presence, and voice — requires in-memory state that cannot be efficiently externalized.

**Discord's stateful architecture**:
\`\`\`
Gateway (WebSocket) Layer — stateful:
  ┌──────────────┐
  │ Gateway Shard│ ◄── Each shard handles ~5,000 users
  │ (Elixir/BEAM)│     Holds: WebSocket connections,
  │              │     presence state, typing indicators
  └──────────────┘

Guild (Server) Assignment — stateful:
  Guild 12345 ──► assigned to Process A on Node 7
  Process A holds in memory:
    - Member list + roles
    - Channel state
    - Voice connection metadata
    - Recent message cache
\`\`\`

**Why stateful (not Redis)**:
\`\`\`
Operation           In-Memory (stateful)    Redis (stateless)
──────────────────────────────────────────────────────────────
Presence update     ~1 microsecond          ~1 millisecond
Typing indicator    ~1 microsecond          ~1 millisecond
Updates/sec/guild   Hundreds                Hundreds
Cost per update     CPU only                CPU + network + Redis
At 200M users       Feasible                Redis becomes bottleneck

Key math: 200M users x presence pings every 30s
  = 6.7M presence updates/sec
  At 1ms each via Redis = 6,700 Redis seconds/sec
  = need thousands of Redis instances just for presence
  In-memory: trivially handled by the gateway processes
\`\`\`

**How Discord handles the operational complexity**:
\`\`\`
Challenge              Discord's Solution
──────────────────────────────────────────────────────────────
Scaling                Gateway sharding: each shard = ~5K users,
                       add shards as users grow
Failure recovery       On crash: new process loads guild state
                       from DB, clients auto-reconnect via gateway
State migration        Consistent hashing for guild→process mapping,
                       only affected guilds re-route on rebalance
Rolling deploys        Graceful drain: notify clients to reconnect,
                       new connections go to updated instances
Voice state            Separate voice servers (also stateful),
                       WebRTC connections managed per-server
\`\`\`

**Technology choices for stateful workload**:
- **Elixir/BEAM VM**: Designed for millions of lightweight concurrent processes, each holding independent state — perfect for per-guild state isolation
- **Rust**: Performance-critical services (e.g., their read states service handling "last read" markers) migrated from Go to Rust for memory efficiency
- **Pub/Sub (internal)**: Cross-node message delivery when sender and recipient are on different gateway shards

**When to choose A vs B — Discord's criteria for statefulness**:
- **Stateful (in-memory)**: Data accessed on every user action (sub-millisecond latency required), data is naturally partitioned (per-guild), and state can be rebuilt from database on failure
- **Stateless + Redis**: Data accessed infrequently, shared across many services, or latency of 1-5ms is acceptable
- **Stateless + DB**: Source of truth for all data, used for recovery, audit, and features where eventual consistency with the in-memory layer is acceptable

**Interview tip**: Discord is the gold-standard example for justifying stateful architecture. Use it when explaining that statefulness is warranted when the access frequency and latency requirements make external state stores impractical. Always pair it with the recovery strategy — stateful is only viable if you can rebuild state on failure.`
      },
      {
        question: 'How do you design graceful degradation when a stateful service loses its state?',
        answer: `**State loss is inevitable** in stateful services — nodes crash, networks partition, and deployments replace processes. The question is not whether state will be lost, but how the system behaves when it happens.

**Graceful degradation strategies**:
\`\`\`
Strategy 1 — Rebuild from source of truth:
  Stateful service crashes
    → New instance starts
    → Loads state from database (cold start)
    → Resumes serving (slightly degraded during rebuild)

  Example (Discord):
    Guild process dies
    → New process loads guild members, roles from PostgreSQL
    → Clients reconnect via WebSocket
    → Typing indicators and presence: reset (acceptable loss)
    → Messages: loaded from DB (no loss)

    Cold start time: 100-500ms per guild
    Trade-off: brief degradation, no data loss for persistent state

Strategy 2 — Replicated state (hot standby):
  Primary ──► Replica (receives state updates)
    │              │
    ▼ (crash)      ▼ (promote)
  Dead         New Primary (instant takeover)

  Example (Kafka Streams):
    Standby tasks maintain a replica of the state store
    If active task fails, standby promotes with zero data loss
    Trade-off: 2x memory cost, near-zero recovery time

Strategy 3 — Checkpointing + replay:
  Service periodically snapshots state to persistent storage
  On restart: load latest checkpoint + replay events since

  Example (Apache Flink):
    Checkpoint every 30 seconds to S3/HDFS
    On failure: restore checkpoint + replay Kafka from offset
    Trade-off: up to 30s of reprocessing, exactly-once semantics

Strategy 4 — Degrade to stateless mode:
  When state is lost, fall back to a stateless version
  that fetches from external store (slower but functional)

  Example (caching tier):
    Normal: serve from in-memory cache (1ms)
    State lost: cache miss → fetch from DB (50ms)
    System still works, just slower until cache warms
\`\`\`

**Recovery time comparison**:
\`\`\`
Strategy              Recovery Time    Data Loss    Cost
──────────────────────────────────────────────────────────────
Rebuild from DB       Seconds-minutes  Ephemeral    1x memory
Hot standby           Milliseconds     None         2x memory
Checkpoint + replay   Seconds          None*        1x + storage
Degrade to stateless  Instant          Ephemeral    1x
\`\`\`

**Designing for state loss from the start**:
\`\`\`
Classify your state:
  ┌─────────────────────────────────────────────────┐
  │ Ephemeral state (OK to lose):                    │
  │   - Typing indicators, presence, cursor position │
  │   - In-flight metrics/counters                   │
  │   - Local cache entries                          │
  │   → Accept loss, rebuild naturally               │
  │                                                  │
  │ Recoverable state (must recover):                │
  │   - User session data, conversation history      │
  │   - Accumulated computations (aggregations)      │
  │   → Checkpoint periodically + rebuild from source│
  │                                                  │
  │ Critical state (must not lose):                  │
  │   - Financial transactions, order state          │
  │   - Must be in durable store BEFORE ack          │
  │   → Write-ahead log, synchronous replication     │
  └─────────────────────────────────────────────────┘
\`\`\`

**When to choose A vs B**:
- **Rebuild from DB**: Best for services where state is a performance optimization (cache), not the source of truth. Acceptable recovery time: seconds.
- **Hot standby**: Best for services where downtime is unacceptable (leader election, critical coordination). Worth the 2x memory cost.
- **Checkpoint + replay**: Best for stream processing where exactly-once semantics matter and events can be replayed from a log (Kafka).
- **Degrade to stateless**: Best for services where stateful behavior is an optimization, not a requirement. The system still works without state, just slower.

**Interview tip**: This question tests operational maturity. The strongest answer classifies state by criticality and matches each category to an appropriate recovery strategy. Never design a stateful service without a state recovery plan — that is the anti-pattern that causes outages.`
      },
      {
        question: 'How do you manage sessions across a stateless service fleet — comparing JWT, server sessions, and hybrid approaches?',
        answer: `**Session management** is the most common state challenge in web applications. The approach you choose affects scalability, security, and user experience.

**Three primary approaches compared in depth**:
\`\`\`
Approach 1 — Server Sessions (Redis/DB):
  Client: session_id cookie (32 bytes)
  Server: lookup session_id in Redis → user data

  Login: create session in Redis, return session_id
  Request: session_id → Redis GET → user data
  Logout: Redis DEL session_id → instant invalidation

Approach 2 — JWT (stateless):
  Client: JWT token (1-2 KB, contains claims)
  Server: verify signature → extract claims (no external lookup)

  Login: create JWT(sub, email, role, exp), return token
  Request: verify JWT signature → use embedded claims
  Logout: ...cannot truly invalidate until expiry

Approach 3 — Hybrid (short-lived JWT + refresh token in DB):
  Access token: JWT, 15 min expiry, stateless validation
  Refresh token: opaque, stored in DB, 30-day expiry

  Request: validate JWT (no DB hit for 99% of requests)
  Expired JWT: use refresh token → DB lookup → new JWT
  Logout: delete refresh token from DB → new JWTs stop being issued
           existing JWT valid for up to 15 min (acceptable)
\`\`\`

**Detailed comparison for production use**:
\`\`\`
Criteria              Server Sessions   JWT         Hybrid
──────────────────────────────────────────────────────────────
Per-request DB/Redis  Yes (every req)   No          No (only refresh)
Instant revocation    Yes               No          Partial (15 min)
Token size            32B cookie        1-2 KB      1-2 KB + 32B
Horizontal scaling    Needs shared      Any server  Any server
                      session store
Session data storage  Redis/DB          In token    Token + DB
Security (token theft) Kill session     Wait expiry  15 min exposure
GDPR right-to-delete Immediate         Wait expiry  15 min window
Cross-service auth    Needs shared      Self-       Self-contained
                      store or gateway  contained
Mobile app support    Cookie mgmt tricky Easy (header) Easy (header)
\`\`\`

**Company case studies**:
\`\`\`
Server Sessions:
  Shopify: Redis-backed sessions for merchant dashboard
  → Need instant session kill on suspicious activity
  → Merchant data too sensitive for client-side storage

JWT (stateless):
  Auth0, Firebase Auth: JWT as the standard for SaaS auth
  → Multi-service architecture, no shared session store
  → Short-lived access tokens (5-15 min) limit exposure

Hybrid:
  Most modern SaaS apps (GitHub, Stripe dashboard)
  → JWT for API authentication (stateless, fast)
  → Refresh token in DB for revocation capability
  → Best balance of performance and security
\`\`\`

**When to choose A vs B — decision framework**:
- **Server sessions (Redis)**: Choose when instant revocation is critical (banking, healthcare), session data is large/sensitive, or your infrastructure already has Redis and you want simplicity
- **Pure JWT**: Choose for machine-to-machine auth, short-lived API tokens, or when you truly cannot have any external state dependency
- **Hybrid (recommended default)**: Choose for most web/mobile applications — gets 99% of the stateless benefits while retaining revocation capability. The 15-minute revocation window is acceptable for most use cases.

**Interview tip**: The hybrid approach is the most mature answer for session management. It shows you understand the JWT revocation problem, can articulate the trade-off, and know the production-standard solution. Never recommend pure JWT without acknowledging the revocation limitation.`
      },
      {
        question: 'How do Kubernetes StatefulSets differ from Deployments, and when are they the right choice?',
        answer: `**StatefulSets** give pods stable network identities, persistent storage, and ordered deployment/scaling — specifically designed for stateful workloads that Deployments cannot handle correctly.

**Key differences**:
\`\`\`
Deployment (stateless):              StatefulSet (stateful):
  pod-xyz123 (random name)           pod-0 (stable name)
  pod-abc456 (random name)           pod-1 (stable name)
  pod-def789 (random name)           pod-2 (stable name)

  Any pod can be killed/replaced     Pods have persistent identity
  Shared volume (if any)             Each pod gets its own PVC
  Parallel startup                   Ordered startup (0, then 1, then 2)
  Random DNS                         Stable DNS: pod-0.service.ns
\`\`\`

**StatefulSet guarantees**:
\`\`\`
Guarantee            What It Means               Why It Matters
──────────────────────────────────────────────────────────────
Stable network ID    pod-0 always resolves to     Other pods can reliably
                     the same pod                 find specific instances
Stable storage       PVC survives pod restart,    Database data persists
                     same volume reattaches       across pod replacement
Ordered deployment   pod-0 starts before pod-1    Primary must start
                     before pod-2                 before replicas
Ordered scaling      Scale down removes pod-N     Last replica removed first,
                     first, not random            primary protected
Ordered rolling      Update pod-0 last            Primary updated last
  update             (reverse order)              to minimize disruption
\`\`\`

**When to use StatefulSet vs Deployment**:
\`\`\`
Workload                    Use              Reason
──────────────────────────────────────────────────────────────
REST API servers            Deployment       Stateless, interchangeable
PostgreSQL cluster          StatefulSet      Need stable IDs, persistent storage
Kafka brokers               StatefulSet      Broker IDs must be stable for
                                             partition assignment
Redis Sentinel              StatefulSet      Sentinel needs stable addressing
Elasticsearch nodes         StatefulSet      Each node has unique data shards
Application workers         Deployment       Stateless task processing
ZooKeeper ensemble          StatefulSet      Leader election needs stable IDs
Web frontends               Deployment       Stateless, any pod serves any request
Flink TaskManagers          StatefulSet      State checkpointing needs stable storage
\`\`\`

**Common misconception**: "My app is stateful, so I need StatefulSet."
\`\`\`
WRONG: My web app stores sessions → StatefulSet
RIGHT: My web app stores sessions → Deployment + Redis
       (externalize state, keep app stateless)

WRONG: My app needs persistent data → StatefulSet
RIGHT: My app needs persistent data → Deployment + managed DB
       (use RDS/Cloud SQL, not a self-managed DB in K8s)

CORRECT use of StatefulSet:
  Running a DATABASE itself in Kubernetes
  Running a MESSAGE BROKER in Kubernetes
  Running a DISTRIBUTED CACHE cluster in Kubernetes
\`\`\`

**When to choose A vs B**:
- **Deployment (default)**: For application services. Externalize state to managed databases and caches. Simpler operations, faster scaling, easier debugging.
- **StatefulSet**: Only for infrastructure components that you are running inside Kubernetes (databases, message brokers, distributed caches) where pod identity and persistent storage are fundamental requirements.
- **Neither (managed service)**: For most teams, use managed databases (RDS, Cloud SQL) and managed caches (ElastiCache) instead of running StatefulSets. StatefulSets add significant operational complexity.

**Interview tip**: The key insight is that StatefulSets exist for running data infrastructure in Kubernetes, not for making application services stateful. If you find yourself reaching for a StatefulSet for an application service, you should instead externalize the state. Recommend managed services as the default and StatefulSets only when self-hosting infrastructure is a requirement.`
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

    introduction: `**Rate limiting** is a critical mechanism for protecting services from overload, ensuring fair usage, and preventing abuse. The two most fundamental algorithms — **token bucket** and **leaky bucket** — take opposite approaches to handling bursty traffic. Token bucket accumulates tokens over time and allows bursts up to the bucket capacity, while leaky bucket processes requests at a fixed rate regardless of input burstiness. Every major API provider — Stripe, GitHub, AWS, Cloudflare — implements rate limiting, and the algorithm choice directly affects user experience. Stripe uses token bucket because it allows merchants to send bursts of API calls during checkout flows, while a network router uses leaky bucket because downstream links need a smooth, constant packet rate.

Beyond these two, practical systems often use **fixed window**, **sliding window log**, or **sliding window counter** algorithms, each with different trade-offs in accuracy, memory usage, and implementation complexity. The choice depends on whether you need to allow bursts, require smooth output, or need precise per-second guarantees. GitHub uses a combination approach: a primary rate limit of 5,000 requests per hour for authenticated users plus secondary limits that throttle concurrent requests and content creation to prevent abuse patterns that volume limits alone would miss.

The distributed rate limiting challenge adds another layer of complexity. When your API runs on 50 servers behind a load balancer, each server cannot independently enforce the per-user limit — a user hitting all 50 servers could exceed the limit by 50x. Solutions range from centralized counters in Redis (Stripe's approach) to local rate limiters with periodic synchronization (Cloudflare's approach at global scale).

In system design interviews, rate limiting appears in API gateway design, distributed systems, and any user-facing service discussion. Interviewers expect you to compare algorithms, explain the distributed rate limiting challenge, discuss where to place rate limiters in the architecture, and understand the business implications of being too aggressive (blocking legitimate users) versus too lenient (allowing abuse).`,

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
      {
        question: 'How does Stripe implement rate limiting with token bucket, and what can we learn from their approach?',
        answer: `**Stripe** has publicly documented their rate limiting architecture, which is one of the best real-world references for API rate limiting design.

**Stripe's rate limiting layers**:
\`\`\`
Layer 1 — Load shedder (system protection):
  If overall system load > threshold:
    Reject lowest-priority requests first
    Priority: critical (payments) > standard (reads) > low (list ops)
  Purpose: protect the system from total overload

Layer 2 — Request rate limiter (per-user fairness):
  Token bucket per API key
  Limit: varies by endpoint and plan
  Purpose: prevent one user from consuming all capacity

Layer 3 — Concurrent request limiter:
  Max N in-flight requests per user simultaneously
  Purpose: prevent slow consumers from holding connections

Layer 4 — Fleet usage limiter:
  Track total fleet-wide resource consumption
  Purpose: capacity planning and cost attribution
\`\`\`

**Why Stripe chose token bucket**:
\`\`\`
Stripe's requirements:
  ✓ Allow checkout bursts (merchant processes 50 charges
    in quick succession during a flash sale)
  ✓ Enforce average rate over time (1000 req/min)
  ✓ Simple to understand for API consumers
  ✓ Easy to implement with Redis

Token bucket satisfies all:
  Bucket size = burst allowance (e.g., 50)
  Refill rate = sustained limit (e.g., ~17/sec = 1000/min)

  Flash sale: merchant uses 50 tokens immediately (burst)
  Then throttled to 17/sec until bucket refills

  If Stripe used leaky bucket instead:
  Merchant could only process 17 charges/sec during flash sale
  = lost revenue = unhappy merchant
\`\`\`

**Stripe's Redis implementation pattern**:
\`\`\`
-- Atomic token bucket check in Redis (Lua script)
local tokens = redis.call('GET', KEYS[1])
local last_time = redis.call('GET', KEYS[2])
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local burst = tonumber(ARGV[3])

-- Calculate tokens to add since last check
local elapsed = now - tonumber(last_time or now)
tokens = math.min(burst, tonumber(tokens or burst) + elapsed * rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('SET', KEYS[1], tokens)
  redis.call('SET', KEYS[2], now)
  return 1  -- allowed
else
  return 0  -- rate limited
end
\`\`\`

**Key design decisions from Stripe's approach**:
\`\`\`
Decision                     Reasoning
──────────────────────────────────────────────────────────────
Token bucket over leaky      API consumers expect burst capability
Per-API-key limiting         Isolate tenants from each other
Priority-based shedding      Payments must succeed even under load
Lua scripts in Redis         Atomic check-and-decrement (race-free)
Return headers always        Clients can self-regulate before hitting limits
Generous defaults            Avoid blocking legitimate usage patterns
\`\`\`

**When to choose A vs B — Stripe's guidance**:
- **Token bucket**: Default for any user-facing API where burst traffic is natural (checkout flows, batch imports, webhook retries)
- **Leaky bucket**: Use for downstream protection where you need to smooth traffic before it hits a fragile dependency (database connection pools, third-party API calls)
- **Concurrent limiter**: Add on top of rate limiter for protection against slow requests that hold connections

**Interview tip**: Referencing Stripe's multi-layer approach shows production awareness. The key insight is that rate limiting is not one algorithm — it is multiple layers protecting different failure modes. Lead with the token bucket for per-user API limits, then add load shedding for system-wide protection.`
      },
      {
        question: 'How do you implement adaptive and dynamic rate limiting that adjusts to system load?',
        answer: `**Static rate limits** (fixed 100 req/min per user) are simple but cannot respond to changing system conditions. **Adaptive rate limiting** adjusts limits based on real-time system health.

**Why static limits are insufficient**:
\`\`\`
Scenario: 100 req/min per user, 1000 users
  Normal:  800 active users × 50 req/min avg = 40K req/min (fine)
  Spike:   1000 active users × 100 req/min  = 100K req/min
  DB load: 100% → cascading failure

  Static limit was set for average case.
  Everyone hitting the limit simultaneously overwhelms the system.
\`\`\`

**Adaptive rate limiting approaches**:
\`\`\`
Approach 1 — AIMD (Additive Increase, Multiplicative Decrease):
  Inspired by TCP congestion control.

  If system healthy (latency < threshold):
    limit = limit + 1 (slow increase)
  If system stressed (latency > threshold or errors > 1%):
    limit = limit × 0.5 (fast decrease)

  Start: 100 req/min
  → System healthy → 101 → 102 → 103 ...
  → Latency spike! → 51 → 52 → 53 ...
  → Recovers → 54 → 55 → 56 ...

Approach 2 — Gradient-based (Netflix Concurrency Limiter):
  Track request latency at different concurrency levels.
  Find the optimal concurrency where throughput is maximized.

  Concurrency:  10   20   30   40   50   60
  Throughput:   100  190  270  340  350  300 (congestion!)
  Latency:      10ms 11ms 12ms 14ms 25ms 100ms

  Optimal concurrency = ~40 (throughput plateau)
  Set limit at 40, auto-adjust as system changes.

Approach 3 — Token bucket with dynamic refill rate:
  refill_rate = base_rate × system_health_factor

  system_health_factor:
    CPU < 50%: 1.0 (full rate)
    CPU 50-70%: 0.8 (reduce 20%)
    CPU 70-90%: 0.5 (reduce 50%)
    CPU > 90%: 0.2 (emergency throttle)
\`\`\`

**Netflix's Concurrency Limiter** (open source):
\`\`\`
Netflix built a production-grade adaptive limiter:
  - Measures RTT (round-trip time) per request
  - Uses Little's Law: Concurrency = Throughput × Latency
  - Automatically finds the limit where adding more concurrency
    increases latency without increasing throughput
  - No manual configuration needed!

Library: netflix/concurrency-limits (Java)
  Algorithms: Vegas, Gradient, Gradient2
  Integrations: gRPC, Servlet, Netty
\`\`\`

**Implementation architecture**:
\`\`\`
  Request arrives
      │
      ▼
  ┌──────────────────────┐
  │ Adaptive Rate Limiter │
  │                       │
  │ Current limit: 80     │ ◄── adjusted every 10 seconds
  │ Current usage: 75     │     based on system metrics
  │ System health: 0.8    │
  │                       │
  │ 75 < 80 → ALLOW      │
  └──────────┬────────────┘
             │
        Health monitor
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
  CPU: 65%  p99: 50ms  Error: 0.1%
  → health = 0.8 (slightly stressed)
  → next interval: limit = 76
\`\`\`

**When to choose A vs B**:
- **Static rate limits**: Choose for external API quotas where limits are contractual (subscription tiers) and must be predictable for customers
- **Adaptive (AIMD)**: Choose for internal service-to-service communication where you want to automatically protect downstream services from overload
- **Gradient/Netflix**: Choose for sophisticated systems where you want zero-configuration optimal concurrency limiting
- **Combined**: External API = static per-user limit + internal adaptive limit based on system health (most production systems)

**Interview tip**: Adaptive rate limiting demonstrates advanced understanding. Mention Netflix's concurrency limiter library as a production-ready solution. The key insight is that static limits protect against individual abuse, while adaptive limits protect the system from collective overload — you need both.`
      },
      {
        question: 'How do you design rate limiting for a multi-tenant SaaS API with different subscription tiers?',
        answer: `**Multi-tenant rate limiting** must balance fairness between tenants, enforce subscription-based quotas, and protect the system from any single tenant consuming disproportionate resources.

**Tier-based rate limit design**:
\`\`\`
Subscription Tiers:
  Free:       100 req/min,  burst: 20,   concurrent: 5
  Starter:    500 req/min,  burst: 100,  concurrent: 25
  Pro:        2000 req/min, burst: 500,  concurrent: 100
  Enterprise: 10000 req/min, burst: 2000, concurrent: 500

Per-endpoint overrides:
  POST /api/generate (expensive):
    Free: 10/min, Pro: 100/min, Enterprise: 1000/min
  GET /api/status (cheap):
    All tiers: 10x the base rate (not worth limiting tightly)
\`\`\`

**Architecture**:
\`\`\`
  API Request
      │
      ▼
  ┌───────────────┐
  │ API Gateway   │
  │ (Kong/Envoy)  │
  └───────┬───────┘
          │
  ┌───────┴───────┐
  │ Rate Limit    │
  │ Service       │
  │ ┌───────────┐ │
  │ │ Redis     │ │ Keys:
  │ │           │ │   rate:{api_key}:{minute} → count
  │ │           │ │   rate:{api_key}:{endpoint}:{minute} → count
  │ │           │ │   concurrent:{api_key} → gauge
  │ └───────────┘ │
  │               │
  │ Limits loaded │
  │ from config:  │
  │ {api_key} →   │
  │ {tier, limits}│
  └───────────────┘
\`\`\`

**Multiple dimensions of limiting**:
\`\`\`
Dimension 1 — Per-API-key rate (volume):
  "Tenant X can make 2000 req/min total"
  Token bucket: refill=33/sec, burst=500

Dimension 2 — Per-endpoint rate (protect expensive ops):
  "Tenant X can call /generate 100 times/min"
  Separate bucket per expensive endpoint

Dimension 3 — Concurrent requests (protect connections):
  "Tenant X can have 100 in-flight requests simultaneously"
  Semaphore: INCR on start, DECR on complete

Dimension 4 — Daily/monthly quotas (billing enforcement):
  "Free tier: 10,000 requests/month"
  Counter: INCR per request, check against monthly limit

Dimension 5 — Cost-based (AI/compute workloads):
  "Pro tier: 100,000 tokens/month"
  Track token consumption, not just request count
\`\`\`

**Fair queuing for shared resources**:
\`\`\`
Problem: Enterprise tenant sends 10,000 req/min (within limit)
  → Consumes 80% of shared database capacity
  → Free/Starter tenants experience degraded performance

Solution: Weighted fair queuing
  Enterprise: weight=10 (gets 10 shares of capacity)
  Pro:        weight=4  (gets 4 shares)
  Starter:    weight=2  (gets 2 shares)
  Free:       weight=1  (gets 1 share)

  During contention: resources allocated proportionally
  No contention: all tenants get full performance
\`\`\`

**Response headers for multi-tenant**:
\`\`\`
HTTP/1.1 200 OK
X-RateLimit-Limit: 2000          ← your tier's limit
X-RateLimit-Remaining: 1847      ← requests left this window
X-RateLimit-Reset: 1620000060    ← when the window resets (Unix)
X-RateLimit-Policy: pro          ← your tier name
Retry-After: 3                   ← (on 429) seconds to wait

HTTP/1.1 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit of 2000 req/min exceeded",
  "retry_after": 3,
  "upgrade_url": "https://app.example.com/billing"
}
\`\`\`

**When to choose A vs B**:
- **Per-key token bucket**: Default for most SaaS APIs — simple, allows bursts, easy for clients to understand
- **Per-endpoint limits**: Add for expensive operations (AI inference, report generation, bulk exports) where volume limits alone do not protect compute costs
- **Concurrent limits**: Add for long-running operations (file processing, data exports) where connection exhaustion is the risk, not request volume
- **Cost-based limits (tokens/credits)**: Use for AI APIs and compute-heavy workloads where requests vary dramatically in cost

**Interview tip**: Multi-tenant rate limiting is one of the most practical system design topics. The key insight is that you need multiple dimensions of limiting (volume, per-endpoint, concurrent, cost) because no single dimension captures all abuse patterns. Mention the upgrade URL in 429 responses — it converts a negative experience into a sales opportunity.`
      },
      {
        question: 'How do you implement rate limiting with Redis, and what are the race condition pitfalls?',
        answer: `**Redis is the most common production choice** for distributed rate limiting because it provides atomic operations, sub-millisecond latency, and cluster support. But naive implementations have race conditions.

**Naive implementation (has race condition)**:
\`\`\`
# WRONG — race condition between GET and INCR
count = redis.GET("rate:user123:minute_42")
if count < 100:
    redis.INCR("rate:user123:minute_42")
    process_request()
else:
    reject_429()

# Race: two requests both read count=99,
# both see 99 < 100, both increment → 101 passes!
\`\`\`

**Correct implementation — atomic with Lua script**:
\`\`\`
-- Sliding window counter (Lua script — atomic in Redis)
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, window)
end

if current > limit then
  return 0  -- rejected
else
  return 1  -- allowed
end

-- Usage: EVALSHA <sha> 1 "rate:user123:min" 100 60
-- Atomic: INCR + conditional EXPIRE in single operation
-- No race condition possible
\`\`\`

**Correct implementation — token bucket with Lua**:
\`\`\`
-- Token bucket (Lua script)
local key_tokens = KEYS[1]
local key_ts = KEYS[2]
local rate = tonumber(ARGV[1])      -- tokens per second
local burst = tonumber(ARGV[2])     -- max bucket size
local now = tonumber(ARGV[3])       -- current timestamp (ms)
local requested = tonumber(ARGV[4]) -- tokens needed (usually 1)

local last_ts = tonumber(redis.call('GET', key_ts) or now)
local tokens = tonumber(redis.call('GET', key_tokens) or burst)

-- Refill tokens based on elapsed time
local elapsed = (now - last_ts) / 1000
tokens = math.min(burst, tokens + elapsed * rate)

if tokens >= requested then
  tokens = tokens - requested
  redis.call('SET', key_tokens, tokens)
  redis.call('SET', key_ts, now)
  redis.call('EXPIRE', key_tokens, burst / rate * 2)
  redis.call('EXPIRE', key_ts, burst / rate * 2)
  return {1, tokens}  -- allowed, remaining tokens
else
  return {0, tokens}  -- rejected, remaining tokens
end
\`\`\`

**Redis cluster considerations**:
\`\`\`
Challenge: Rate limit keys for same user on different Redis shards

Solution 1 — Hash tags (force same shard):
  Key: rate:{user123}:minute  ← {user123} forces same shard
  All keys for user123 on same shard → atomic operations work

Solution 2 — Accept slight inaccuracy:
  Each shard tracks independently
  2 shards × 50 limit each ≈ 100 total
  May allow 100-102 requests (close enough for most cases)

Solution 3 — Single Redis instance for rate limiting:
  Separate from main cache, dedicated to rate limiting
  Simpler, no cross-shard issues
  Risk: SPOF (mitigate with Redis Sentinel)
\`\`\`

**Performance at scale**:
\`\`\`
Operation              Redis Latency    Throughput
──────────────────────────────────────────────────────────────
Simple INCR            ~0.1ms           500K ops/sec per node
Lua script (5 ops)     ~0.3ms           200K ops/sec per node
Pipeline (batch)       ~0.5ms/batch     1M+ ops/sec per node

For 100K API requests/sec:
  Single Redis node handles it easily (200K Lua ops/sec)
  With replication: add read replicas for GET operations
  Redis Cluster: shard across 3-6 nodes for 1M+ req/sec
\`\`\`

**When to choose A vs B**:
- **Lua scripts in Redis (recommended)**: Default choice — atomic, fast, handles race conditions. Use for all production rate limiting.
- **Redis INCR + EXPIRE (simple)**: Acceptable for fixed-window rate limiting where slight boundary inaccuracy is OK. Simpler to debug.
- **Redis Sorted Sets (sliding window log)**: Use when you need exact precision and can afford O(N) memory per user. Good for low-volume, high-precision limits.
- **Application-level (no Redis)**: Use for single-server deployments or as a fast local check before hitting Redis (two-tier: local estimate + Redis for accuracy).

**Interview tip**: Always use Lua scripts for production rate limiting in Redis — they guarantee atomicity. Mention the race condition in naive GET+INCR to show you understand distributed systems pitfalls. The fact that Redis is single-threaded for command execution is what makes Lua scripts safe — no concurrent modification of the same key during script execution.`
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

    introduction: `The **SQL vs NoSQL** debate is one of the most commonly misunderstood trade-offs in system design. Relational databases (PostgreSQL, MySQL) provide strong consistency, ACID transactions, and a flexible query language. NoSQL databases (MongoDB, Cassandra, DynamoDB, Redis) offer different data models, horizontal scalability, and schema flexibility. Neither is universally better — the choice depends on your data model, access patterns, consistency requirements, and scale. Uber uses PostgreSQL for trip records requiring ACID guarantees, Cassandra for location updates needing high write throughput with eventual consistency, and Redis for driver availability requiring sub-millisecond latency. No single database could optimally serve all three workloads.

The **CAP theorem** states that a distributed data store can provide at most two of three guarantees: **Consistency**, **Availability**, and **Partition tolerance**. Since network partitions are inevitable in distributed systems, the practical choice is between CP (consistency during partitions, sacrificing availability) and AP (availability during partitions, accepting stale reads). SQL databases typically favor CP, while many NoSQL databases favor AP. The more practical PACELC extension asks: even during normal operation (99.99% of the time), do you prefer lower latency or stronger consistency? Cassandra chooses availability and low latency (PA/EL), while CockroachDB chooses consistency always (PC/EC).

By 2025, over 80% of enterprises use more than one database platform — **polyglot persistence** is the norm, not the exception. Netflix uses MySQL for user accounts and billing (ACID required), Cassandra for viewing history (high write, eventual consistency), and EVCache (Memcached-based) for session data and recommendations. Airbnb uses MySQL for listings and bookings, Elasticsearch for search, and BigQuery for analytics. The decision is never "SQL or NoSQL" — it is "which data store for which workload?"

In interviews, the strongest answer is never "use NoSQL because it scales" or "use SQL because it has joins." It is: "Given these access patterns, consistency requirements, and scale expectations, here is why this data store fits." Frame the discussion around access patterns, consistency needs, scale trajectory, and team expertise — then map each workload to the right store.`,

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
      {
        question: 'How does polyglot persistence work in practice, and how do companies like Uber and Netflix implement it?',
        answer: `**Polyglot persistence** means using different database technologies for different data workloads within the same system, choosing each store based on its strengths.

**Uber's polyglot architecture**:
\`\`\`
Workload                  Database         Why This Choice
──────────────────────────────────────────────────────────────
Trip records, payments    PostgreSQL       ACID transactions, complex queries,
                                           financial reporting compliance
Real-time location data   Cassandra        100K+ writes/sec, geo-distributed,
                                           eventual consistency is acceptable
Driver/rider availability Redis            Sub-millisecond reads, ephemeral
                                           data (TTL-based expiry)
Trip analytics, ML        Apache Pinot     Real-time analytics on streaming
                                           data, sub-second OLAP queries
Search (restaurants)      Elasticsearch    Full-text search, geo-spatial
                                           queries, faceted filtering
\`\`\`

**Netflix's polyglot architecture**:
\`\`\`
Workload                  Database         Why This Choice
──────────────────────────────────────────────────────────────
User accounts, billing    MySQL (Vitess)   ACID, relational integrity,
                                           subscription management
Viewing history           Cassandra        Billions of rows, write-heavy,
                                           eventual consistency fine
Session data, recs        EVCache          Sub-millisecond, volatile,
                                           (Memcached)     massive throughput
Content metadata          Apache Iceberg   Petabyte-scale analytics,
                          + S3             schema evolution, time travel
Search/discovery          Elasticsearch    Title search, genre filtering,
                                           personalized recommendations
\`\`\`

**Airbnb's polyglot architecture**:
\`\`\`
Workload                  Database         Why This Choice
──────────────────────────────────────────────────────────────
Listings, bookings        MySQL            Transactions, relational joins,
                                           host/guest relationships
Property search           Elasticsearch    Geo-spatial, availability dates,
                                           faceted filters, ranking
Analytics + ML            BigQuery         Petabyte analytics, ML training
                                           data, ad-hoc exploration
Pricing signals           Redis            Real-time pricing cache,
                                           dynamic rate updates
\`\`\`

**Challenges of polyglot persistence**:
\`\`\`
Challenge                Solution
──────────────────────────────────────────────────────────────
Data consistency across   CDC (Change Data Capture) from primary
  stores                  → downstream stores updated async
Operational complexity    Platform team manages shared infra,
                          product teams own their data models
Schema evolution          Each store evolves independently,
                          CDC adapters handle transformation
Debugging across stores   Distributed tracing (Jaeger, Zipkin)
                          correlates requests across all stores
Team expertise            Not every team needs every DB —
                          platform provides managed interfaces
\`\`\`

**When to choose A vs B**:
- **Single PostgreSQL**: Start here for any new project. PostgreSQL handles JSON (document), full-text search, and time-series reasonably well. Only add specialized stores when you hit measurable limitations.
- **PostgreSQL + Redis**: The most common two-database architecture. PostgreSQL for persistence, Redis for caching and ephemeral data. Covers 90% of web applications.
- **Full polyglot**: Justified when you have genuinely different workloads with different performance requirements — high write throughput (Cassandra), full-text search (Elasticsearch), real-time analytics (ClickHouse/Pinot). Requires platform team maturity.

**Interview tip**: Polyglot persistence is the correct answer for any large-scale system design question, but over-engineering with too many databases is equally dangerous. Start with PostgreSQL + Redis, add specialized stores only when you can quantify the specific limitation PostgreSQL hits. Always mention the CDC pipeline that keeps stores in sync.`
      },
      {
        question: 'What are NewSQL databases (CockroachDB, Spanner, TiDB), and when do they replace the need for NoSQL?',
        answer: `**NewSQL databases** provide the horizontal scalability of NoSQL with the ACID guarantees and SQL interface of traditional relational databases. They aim to eliminate the "SQL vs NoSQL" trade-off entirely.

**How NewSQL works**:
\`\`\`
Traditional SQL:
  Single node → vertical scaling → hardware limit
  Sharding → complex, lose cross-shard transactions

NoSQL:
  Horizontal scaling → but lose ACID, joins, SQL

NewSQL:
  Horizontal scaling + ACID + SQL + automatic sharding
  The "best of both worlds" (with trade-offs)

Architecture (CockroachDB example):
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Node 1  │  │  Node 2  │  │  Node 3  │
  │ Ranges:  │  │ Ranges:  │  │ Ranges:  │
  │ [A-F]    │  │ [G-M]    │  │ [N-Z]    │
  └──────────┘  └──────────┘  └──────────┘
       │              │              │
       └──────────────┴──────────────┘
              Raft consensus per range
              Distributed transactions across ranges
              Standard SQL interface
\`\`\`

**Comparison of NewSQL options**:
\`\`\`
Database          Based On     Consistency    Distributed  Key Feature
──────────────────────────────────────────────────────────────────
CockroachDB       PostgreSQL   Serializable   Yes (Raft)   Geo-partitioning,
                  wire protocol                             survivability zones
Google Spanner    Custom       External       Yes (Paxos)  TrueTime (atomic
                               consistency                  clocks for global
                                                            ordering)
TiDB              MySQL wire   Snapshot       Yes (Raft)   MySQL-compatible,
                  protocol     isolation                    HTAP (analytics +
                                                            transactions)
YugabyteDB        PostgreSQL   Serializable   Yes (Raft)   PostgreSQL-compatible
                  compatible                                geo-distributed
Vitess            MySQL        Eventual to    Yes          MySQL sharding
                  (sharding    strong                      middleware (YouTube
                   middleware)                              scale)
CockroachDB's Raft consensus:
  Write to Range [A-F]:
    Node 1 (leader) proposes → Node 2, Node 3 vote
    Majority (2/3) agree → committed
    → Serializable isolation across all ranges
\`\`\`

**When NewSQL replaces the need for NoSQL**:
\`\`\`
Traditional choice:
  "Need ACID + scale" → impossible, pick SQL or NoSQL

NewSQL makes possible:
  ✓ ACID transactions at 100+ TB scale
  ✓ SQL joins across distributed data
  ✓ Automatic sharding + rebalancing
  ✓ Multi-region with consistency

But NoSQL still wins when:
  ✗ Sub-millisecond latency needed (NewSQL consensus adds latency)
  ✗ Write throughput > 500K/sec (NoSQL like Cassandra is faster)
  ✗ Data model is fundamentally non-relational (graph, time-series)
  ✗ Eventual consistency is acceptable (AP systems are simpler)
\`\`\`

**Real-world adoption**:
\`\`\`
Company           NewSQL Choice      Previous Stack     Why Migrated
──────────────────────────────────────────────────────────────────
DoorDash          CockroachDB        PostgreSQL         Needed multi-region
                                                         consistency for orders
Netflix           CockroachDB        Cassandra (some)   Needed ACID for billing
                                                         at global scale
PingCAP customers TiDB               MySQL shards       Eliminate manual sharding
Spotify           Google Spanner     PostgreSQL         Global consistency for
                                                         premium features
\`\`\`

**When to choose A vs B**:
- **PostgreSQL (single node)**: Default for < 10TB. Do not add complexity you do not need.
- **PostgreSQL + read replicas**: For read-heavy workloads up to 100TB. Add Citus extension for sharding if needed.
- **NewSQL (CockroachDB/Spanner)**: When you need ACID transactions across regions, automatic sharding with SQL compatibility, or are outgrowing manually sharded PostgreSQL.
- **NoSQL (Cassandra/DynamoDB)**: When write throughput or latency requirements exceed what NewSQL can provide, or when eventual consistency is acceptable.

**Interview tip**: NewSQL is the sophisticated answer to "how do you scale SQL?" Most candidates jump to "shard it" or "use NoSQL." Mentioning CockroachDB or Spanner shows awareness of modern solutions that avoid the SQL-vs-NoSQL dichotomy. But always caveat that NewSQL adds per-query latency due to consensus — it is not free.`
      },
      {
        question: 'How do you design a database strategy for a system that starts small but may need to scale to millions of users?',
        answer: `**The most common database mistake** is either over-engineering from day one (premature NoSQL sharding) or under-engineering (no migration path when scale arrives). The right approach is a phased strategy with clear migration triggers.

**Phased scaling strategy**:
\`\`\`
Phase 1 — Single PostgreSQL (0-100K users, 0-50GB)
  ┌──────────────────────────────────────┐
  │  Application ──► PostgreSQL          │
  │                  (single node)       │
  │                  + Redis (cache)     │
  └──────────────────────────────────────┘
  Focus: get product-market fit, iterate fast
  Cost: ~$50-200/month (managed DB)
  Migration trigger: p99 query latency > 200ms

Phase 2 — Read Replicas (100K-1M users, 50-500GB)
  ┌──────────────────────────────────────┐
  │  Application ──► Primary (writes)    │
  │             ──► Replica 1 (reads)    │
  │             ──► Replica 2 (reads)    │
  │             ──► Redis (hot cache)    │
  └──────────────────────────────────────┘
  Focus: separate read/write paths
  Add: connection pooling (PgBouncer), query optimization
  Migration trigger: write throughput > single node capacity

Phase 3 — Selective Denormalization (1-5M users)
  ┌──────────────────────────────────────┐
  │  PostgreSQL (source of truth)        │
  │  + Elasticsearch (search/discovery)  │
  │  + Redis (cache + sessions)          │
  │  + CDC pipeline (sync stores)        │
  └──────────────────────────────────────┘
  Focus: purpose-built stores for specific workloads
  Add: Elasticsearch for search, materialized views for dashboards
  Migration trigger: need for specialized query patterns

Phase 4 — Sharding or NewSQL (5M+ users, 1TB+)
  ┌──────────────────────────────────────┐
  │  Option A: CockroachDB/Vitess        │
  │  (automatic sharding + SQL)          │
  │                                      │
  │  Option B: Application-level sharding│
  │  (shard by tenant_id/region)         │
  │                                      │
  │  + Cassandra (high-write workloads)  │
  │  + Elasticsearch (search)            │
  │  + Redis cluster (distributed cache) │
  └──────────────────────────────────────┘
  Focus: horizontal write scaling
  Add: distributed tracing, cross-shard query layer
\`\`\`

**What to build for in Phase 1 (future-proofing without over-engineering)**:
\`\`\`
DO (free or low-cost future-proofing):
  ✓ Use UUIDs or snowflake IDs (not auto-increment)
    → avoids conflicts when sharding later
  ✓ Include tenant_id/user_id in all tables
    → natural shard key when needed
  ✓ Use parameterized queries (not raw SQL)
    → works with any ORM/database
  ✓ Abstract database access behind a repository layer
    → swap implementations without changing business logic
  ✓ Design schemas for your access patterns
    → indexes on common query patterns

DO NOT (premature optimization):
  ✗ Shard from day one
  ✗ Use NoSQL "because it scales"
  ✗ Build custom replication
  ✗ Over-normalize (BCNF everything)
  ✗ Build a generic "database abstraction layer"
\`\`\`

**Migration trigger cheat sheet**:
\`\`\`
Symptom                       Next Step
──────────────────────────────────────────────────────────────
Read latency increasing       Add read replicas + caching
Write latency increasing      Optimize queries, then consider sharding
Full-text search slow         Add Elasticsearch
Complex analytics slow        Add read replica for analytics, or BigQuery
Storage > 500GB               Evaluate partitioning, archival
Cross-region latency          Multi-region replicas or CockroachDB
Connection limit hit          PgBouncer + connection pooling
\`\`\`

**When to choose A vs B**:
- **Stay on PostgreSQL as long as possible**: It handles more than people think. Shopify serves 19M queries/sec from MySQL. Instagram ran on a single PostgreSQL cluster to 400M users.
- **Add specialized stores incrementally**: Each new database adds operational complexity. Only add when PostgreSQL demonstrably cannot serve a specific workload.
- **Jump to NewSQL**: When manual sharding becomes a maintenance burden or you need multi-region ACID consistency.
- **Jump to NoSQL**: Only when you have a specific workload that fundamentally does not fit a relational model (time-series telemetry, social graph traversals, high-velocity event streams).

**Interview tip**: This evolutionary approach is the most mature answer in any system design interview. It shows you understand that architecture should evolve with proven scale needs, not anticipated ones. Start with "PostgreSQL is my default" and describe the migration triggers. Never start with "we need Cassandra" unless you can quantify why PostgreSQL will not work.`
      },
      {
        question: 'How do you handle database migrations and schema evolution differently in SQL vs NoSQL?',
        answer: `**Schema evolution** is one of the most practical differences between SQL and NoSQL in production. SQL enforces schema at write time (schema-on-write), while NoSQL defers validation to read time (schema-on-read). Each approach has distinct migration challenges.

**SQL schema migration (schema-on-write)**:
\`\`\`
Adding a column:
  ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  → All rows now have the column (NULL until populated)
  → All future writes are validated against new schema
  → All existing queries still work (new column is optional)

  Risk: ALTER TABLE on large tables can lock for minutes/hours
  Solution: Online DDL tools (gh-ost, pt-online-schema-change)
    1. Create shadow table with new schema
    2. Copy data in chunks (no lock)
    3. Apply ongoing changes via triggers/CDC
    4. Atomic rename when caught up

Changing a column type:
  ALTER TABLE orders ALTER COLUMN price TYPE NUMERIC(10,2);
  → Must verify ALL existing data fits new type
  → May require full table rewrite
  → Downtime or careful online migration required
\`\`\`

**NoSQL schema evolution (schema-on-read)**:
\`\`\`
MongoDB — adding a field:
  // No migration needed! Just start writing the new field:
  db.users.insertOne({ name: "Alice", phone: "555-0123" })

  // Old documents without 'phone' still exist
  // Application code must handle both versions:
  const phone = user.phone || "not provided";

  Pro: zero-downtime, no migration step
  Con: application code handles schema diversity forever

Cassandra — adding a column:
  ALTER TABLE users ADD phone text;
  → Instant (no data movement)
  → Existing rows return NULL for new column
  → Similar to SQL but truly zero-cost at any table size

DynamoDB — schema change:
  // No schema to alter! Any item can have any attributes
  // Just start writing new attributes
  // Old items do not have them → handle in application
\`\`\`

**Comparison of migration approaches**:
\`\`\`
Operation              SQL (PostgreSQL)      NoSQL (MongoDB)
──────────────────────────────────────────────────────────────
Add column/field       ALTER TABLE (fast*)    No-op (just write it)
Remove column/field    ALTER TABLE DROP       Stop writing it (old data persists)
Change type            Full table rewrite     Dual-read in app code
Rename column/field    ALTER TABLE RENAME     Write new + read both
Add index              CREATE INDEX (bg)      createIndex (bg)
Change primary key     Rebuild table          Not possible (new collection)
Cross-collection ref   Foreign key (enforced) Application-level (not enforced)

* PostgreSQL ADD COLUMN with DEFAULT is instant since v11
\`\`\`

**Best practices for production migrations**:
\`\`\`
SQL Best Practices:
  1. Always test migrations on a staging copy with production-size data
  2. Use online DDL tools for tables > 1M rows
  3. Make migrations backward-compatible (additive only):
     Deploy code that handles old AND new schema
     → Run migration
     → Deploy code that uses new schema
     → Clean up old schema handling
  4. Never rename or drop columns in the same deployment as code changes

NoSQL Best Practices:
  1. Version your documents: { _schemaVersion: 2, ... }
  2. Write migration code that upgrades documents on read (lazy migration)
  3. Run background jobs to upgrade old documents to latest schema
  4. Validate at write time in application code (since DB will not)
  5. Use a schema registry (Avro, Protobuf) for event streams
\`\`\`

**When to choose A vs B**:
- **SQL schema migrations**: Choose when data integrity is critical (financial, healthcare), schema is relatively stable, and you want the database to enforce correctness
- **NoSQL schema flexibility**: Choose when schema evolves rapidly (early-stage product, prototyping), documents have varied structures (user-generated content), or zero-downtime schema changes are mandatory
- **Schema registry (Avro/Protobuf)**: Choose for event-driven architectures where schema evolution must be backward-compatible across producers and consumers

**Interview tip**: Schema migration is a practical topic that shows real production experience. For SQL, mention gh-ost and backward-compatible migrations. For NoSQL, mention document versioning and lazy migration. The key insight is that NoSQL does not eliminate the schema problem — it moves it from the database to the application code, which can be harder to manage at scale.`
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

    introduction: `**Normalization** organizes data to eliminate redundancy and ensure integrity — each fact is stored exactly once. **Denormalization** deliberately introduces redundancy to optimize read performance by pre-computing joins and aggregations. This is one of the most fundamental trade-offs in database design. Consider a social media platform: a normalized schema stores user names in one table and references them everywhere via foreign keys. When displaying a feed with 50 posts from 30 different authors, that requires 30 joins. A denormalized schema embeds the author name directly in each post — zero joins, but when a user changes their display name, you must update potentially millions of posts.

In a normalized schema, updating a user's name requires changing one row. In a denormalized schema where the user's name is embedded in every order, comment, and message, that same update requires modifying hundreds or thousands of rows. The normalized schema guarantees consistency; the denormalized schema guarantees fast reads without joins. Twitter's timeline architecture embodies this trade-off: they denormalize (fan-out on write) for normal users' tweets, pre-building followers' timelines in Redis lists. But for celebrities with millions of followers, they normalize (fan-out on read) because writing to 80 million timelines on every Beyonce tweet would take minutes.

The decision is never purely technical — it depends on your organization's ability to maintain consistency for denormalized data. A team without CDC pipelines or event-driven architecture may find that denormalized data silently drifts out of sync, leading to subtle bugs that are harder to fix than the original performance problem. Materialized views offer a middle ground: denormalized read performance with database-managed consistency.

For system design interviews, the key insight is that this trade-off is not binary — it is a spectrum. Most production systems use a **selectively denormalized** schema: normalize the source of truth, denormalize heavily-read paths (dashboards, feeds, search), and use materialized views, CDC pipelines, or CQRS to keep the denormalized views in sync. The decision hinges on your **read-to-write ratio**, **consistency requirements**, and **operational maturity** for maintaining denormalized copies.`,

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
      {
        question: 'How do you use Change Data Capture (CDC) to keep denormalized views consistent with the source of truth?',
        answer: `**Change Data Capture (CDC)** monitors changes in the source database and propagates them to downstream stores. It is the production-grade solution for maintaining denormalized copies without coupling write logic to every downstream consumer.

**CDC architecture**:
\`\`\`
Source of Truth (normalized):
  PostgreSQL ──► WAL (Write-Ahead Log)
                     │
                     ▼
              ┌──────────────┐
              │  CDC Tool    │ (Debezium, Maxwell, DMS)
              │  Reads WAL   │
              └──────┬───────┘
                     │ events
                     ▼
              ┌──────────────┐
              │  Kafka       │ (event stream)
              └──────┬───────┘
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    Elasticsearch   Redis     Analytics DW
    (search index)  (cache)   (BigQuery)
    denormalized    denormalized  aggregated
\`\`\`

**How CDC works with PostgreSQL**:
\`\`\`
Step 1: App writes to PostgreSQL
  INSERT INTO users (id, name) VALUES (1, 'Alice');

Step 2: PostgreSQL writes to WAL (always happens)
  WAL entry: {table: users, op: INSERT, data: {id:1, name:'Alice'}}

Step 3: Debezium reads WAL (no impact on source DB)
  → Publishes to Kafka topic 'db.public.users'

Step 4: Downstream consumers process the event
  Elasticsearch consumer: index user document
  Redis consumer: update user cache
  Analytics consumer: append to BigQuery

Step 5: User renamed
  UPDATE users SET name = 'Bob' WHERE id = 1;
  → WAL entry: {op: UPDATE, before: {name:'Alice'}, after: {name:'Bob'}}
  → All downstream stores updated automatically
\`\`\`

**CDC vs application-level sync**:
\`\`\`
Approach              CDC (Debezium)          App-Level Dual Write
──────────────────────────────────────────────────────────────
Coupling              None (reads WAL)        Tight (code in every write path)
Consistency           Guaranteed (WAL=truth)  Race conditions possible
Performance impact    None on source DB       Doubles write latency
Missing updates       Impossible (WAL)        Easy to forget a path
Ordering              Preserved (WAL order)   No ordering guarantee
Complexity            Infra setup needed      Code changes in every service
\`\`\`

**When to choose A vs B**:
- **CDC (Debezium + Kafka)**: Choose when you have multiple downstream consumers that need to stay in sync, when you cannot modify existing write paths, or when consistency of denormalized views is critical. The infrastructure investment pays off when you have 3+ downstream stores.
- **Application-level dual write**: Acceptable for simple cases (one source, one cache) where you control all write paths and can tolerate occasional inconsistency.
- **Materialized views**: Choose when the denormalized view is within the same database. PostgreSQL materialized views are simpler than CDC for same-database denormalization.
- **Outbox pattern**: Choose when CDC infrastructure is not available but you need reliable event publishing. Write events to an outbox table, process them asynchronously.

**Interview tip**: CDC is the correct production answer for maintaining denormalized views at scale. Mention Debezium specifically (the industry standard for open-source CDC). The key insight is that CDC decouples the source of truth from downstream consumers — the application writes to one place, and everything else stays in sync automatically via the WAL.`
      },
      {
        question: 'How do you design denormalization for a NoSQL database where there are no joins?',
        answer: `**In NoSQL, denormalization is not an optimization — it is the primary design principle.** Because NoSQL databases do not support joins, you must pre-compute all access patterns at write time by embedding related data in the same document or partition.

**The fundamental shift in thinking**:
\`\`\`
SQL design process:
  1. Identify entities and relationships
  2. Normalize to 3NF (eliminate redundancy)
  3. Write queries with JOINs to reconstruct views
  4. Optimize later with indexes and denormalization

NoSQL design process:
  1. Identify access patterns (what queries will you run?)
  2. Design documents/partitions around those patterns
  3. Embed related data to serve each pattern in one read
  4. Accept redundancy as a feature, not a bug
\`\`\`

**DynamoDB single-table design example (e-commerce)**:
\`\`\`
Access patterns:
  1. Get user profile by user_id
  2. Get all orders for a user
  3. Get order details with items
  4. Get all items in a product category

Single table:
  PK              SK                  Data
  ──────────────────────────────────────────────
  USER#123        PROFILE             {name, email, address}
  USER#123        ORDER#456           {total, status, date}
  USER#123        ORDER#456#ITEM#1    {product, qty, price}
  USER#123        ORDER#456#ITEM#2    {product, qty, price}
  CATEGORY#elec   PRODUCT#789         {name, price, rating}

  Pattern 1: PK=USER#123, SK=PROFILE → single item
  Pattern 2: PK=USER#123, SK begins_with ORDER → all orders
  Pattern 3: PK=USER#123, SK begins_with ORDER#456 → order + items
  Pattern 4: PK=CATEGORY#elec → all electronics products
\`\`\`

**MongoDB embedded document design**:
\`\`\`
Normalized (SQL thinking — wrong for MongoDB):
  users: {_id: 123, name: "Alice"}
  orders: {_id: 456, user_id: 123, items: [...]}
  reviews: {_id: 789, user_id: 123, product_id: 101}

  "Get user with recent orders and reviews" = 3 queries

Denormalized (correct for MongoDB):
  users: {
    _id: 123,
    name: "Alice",
    recent_orders: [
      {order_id: 456, total: 99.99, status: "shipped",
       items: [{name: "Widget", qty: 2}]}
    ],
    recent_reviews: [
      {product: "Widget", rating: 5, date: "2024-01-15"}
    ]
  }

  "Get user with recent orders and reviews" = 1 query
\`\`\`

**When to embed vs reference in NoSQL**:
\`\`\`
Embed (denormalize) when:
  ✓ Data is read together > 80% of the time
  ✓ Embedded data is bounded (max 50 items)
  ✓ Embedded data changes infrequently
  ✓ One-to-few relationship (user → addresses)

Reference (normalize) when:
  ✓ Data is read independently most of the time
  ✓ Data is unbounded (user → all posts ever)
  ✓ Data changes frequently (product → current price)
  ✓ Many-to-many relationship (students ↔ courses)
  ✓ Document would exceed size limits (16MB in MongoDB)
\`\`\`

**Handling updates to denormalized data**:
\`\`\`
User changes name from "Alice" to "Bob":
  Normalized: UPDATE users SET name='Bob' WHERE id=123 (1 write)
  Denormalized: must update name everywhere it is embedded

Solution 1 — Eventual consistency:
  Update primary record immediately
  Background job updates all embedded copies
  Accept stale name in some places for minutes

Solution 2 — Reference for frequently-changing fields:
  Embed: {user_id: 123, user_name_snapshot: "Alice"}
  Reference: look up current name from user record
  Trade-off: extra read for current name, but no update cascade

Solution 3 — Accept staleness:
  Order record: {customer_name: "Alice"} — frozen at order time
  This IS the correct name at time of order (historical accuracy)
\`\`\`

**When to choose A vs B**:
- **Heavy embedding (DynamoDB single-table)**: Choose when access patterns are well-defined and stable, and you need single-digit millisecond reads with no secondary lookups
- **Moderate embedding (MongoDB)**: Choose when access patterns are mostly known but may evolve, and you want a balance between read performance and write simplicity
- **Mostly references (like SQL)**: Choose when access patterns are ad-hoc and unpredictable, or when data changes frequently. But at this point, ask whether NoSQL is the right choice at all.

**Interview tip**: When designing a NoSQL schema in an interview, always start by listing the access patterns. The schema flows directly from the queries you need to support. This is the opposite of SQL design (where you start with entities and relationships). Demonstrate this thinking shift to show NoSQL design maturity.`
      },
      {
        question: 'How does denormalization interact with data warehousing and analytics pipelines?',
        answer: `**Data warehouses** take denormalization to its logical extreme — the **star schema** and **snowflake schema** are purpose-built denormalized structures designed for analytical queries across massive datasets.

**OLTP (operational) vs OLAP (analytical) schemas**:
\`\`\`
OLTP (normalized — your application database):
  Optimized for: many small reads and writes
  Schema: 3NF, minimal redundancy
  Queries: SELECT user WHERE id=123 (simple, indexed)
  Example: PostgreSQL for your application

OLAP (denormalized — your analytics warehouse):
  Optimized for: few large analytical queries
  Schema: star/snowflake, heavy redundancy
  Queries: SELECT SUM(revenue) GROUP BY region, month (scans)
  Example: BigQuery, Snowflake, Redshift
\`\`\`

**Star schema (most common warehouse pattern)**:
\`\`\`
         ┌───────────────┐
         │  dim_product   │
         │  product_id    │
         │  name, category│
         │  brand, price  │
         └───────┬────────┘
                 │
  ┌──────────┐  │  ┌──────────────┐
  │ dim_user │  │  │  dim_date    │
  │ user_id  │  │  │  date_id     │
  │ name,    │──┼──│  year, month │
  │ region   │  │  │  day, quarter│
  └──────────┘  │  └──────────────┘
                │
         ┌──────┴────────┐
         │  fact_orders   │
         │  order_id      │
         │  user_id (FK)  │
         │  product_id(FK)│
         │  date_id (FK)  │
         │  quantity       │
         │  revenue        │
         │  discount       │
         └────────────────┘

  Query: "Revenue by region and product category, Q4 2024"
  SELECT d.region, p.category, SUM(f.revenue)
  FROM fact_orders f
  JOIN dim_user d ON f.user_id = d.user_id
  JOIN dim_product p ON f.product_id = p.product_id
  JOIN dim_date dt ON f.date_id = dt.date_id
  WHERE dt.quarter = 'Q4' AND dt.year = 2024
  GROUP BY d.region, p.category

  These "joins" are highly optimized in columnar warehouses
  because dimensions are small and fact table scans are parallel.
\`\`\`

**The ETL/ELT pipeline that creates denormalized analytics data**:
\`\`\`
OLTP Database (normalized)
    │
    ▼ (CDC or batch extract)
Staging Area (raw data)
    │
    ▼ (transform: join, aggregate, clean)
Data Warehouse (denormalized star schema)
    │
    ├──► BI Dashboard (Looker, Tableau)
    ├──► ML Training Pipeline
    └──► Ad-hoc Analysis (SQL notebooks)

Modern ELT (load first, transform in warehouse):
  OLTP ──► raw landing zone in BigQuery/Snowflake
                │
                ▼ (dbt models — SQL transformations)
           Denormalized marts (star schemas)
                │
                ▼
           BI tools + ML pipelines
\`\`\`

**When to choose A vs B**:
- **Normalized OLTP + denormalized OLAP**: Standard pattern for most companies. Keep your application database normalized, replicate and denormalize into a warehouse for analytics.
- **Denormalized in OLTP directly**: Only when analytical queries must be real-time AND cannot tolerate the ETL lag (sub-second dashboards on live data). Use materialized views or CQRS.
- **Lakehouse (Delta Lake, Apache Iceberg)**: Modern alternative that combines data lake storage (S3) with warehouse-like query performance. Eliminates the separate warehouse for many use cases.

**Interview tip**: When asked about denormalization, distinguish between operational denormalization (in your app database for read performance) and analytical denormalization (in your warehouse for BI queries). They serve different purposes and have different maintenance strategies. Mentioning star schemas and dbt shows you understand the full data lifecycle.`
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

    introduction: `The **monolith vs microservices** debate is one of the most consequential architectural decisions a team makes. A monolith is a single deployable unit containing all functionality — simpler to develop, test, debug, and deploy. Microservices decompose the system into independently deployable services, each owning a specific business capability — enabling team autonomy, independent scaling, and technology diversity at the cost of distributed systems complexity. The hidden cost is staggering: service discovery, distributed tracing, config management, secret management, per-service CI/CD pipelines, API versioning, network failure handling, and on-call complexity all multiply with every new service.

The industry pendulum has swung from monoliths (2000s) to microservices (2015s) and is now settling on a more nuanced view. **Amazon Prime Video** publicly documented cutting infrastructure costs by 90% after moving their video quality monitoring system from microservices back to a monolith — the inter-service communication overhead and AWS Step Functions costs were far greater than the benefit of decomposition. **Shopify** maintains a 2.8-million-line Ruby monolith serving millions of merchants worldwide, using a "podded architecture" with tools like Packwerk to enforce module boundaries rather than splitting into microservices. They handle 19 million MySQL queries per second with 1,000+ developers working in the same codebase.

The **modular monolith** has emerged as the pragmatic middle ground. It gives you the deployment simplicity of a monolith with the internal boundaries of microservices. Netflix operates 700+ microservices — but they have thousands of engineers and a dedicated platform team. Most companies do not, and for them the operational cost of microservices exceeds the organizational benefit.

In system design interviews, the strongest answer acknowledges that microservices solve **organizational problems** (team independence, deployment velocity at scale) more than technical ones. A 5-person startup building microservices from day one is almost certainly over-engineering. A 500-engineer organization with a 10-year-old monolith likely needs decomposition to maintain development velocity. The 2025 industry consensus is clear: if your team has fewer than 50 developers, you probably do not need microservices.`,

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
      {
        question: 'How did Amazon Prime Video cut costs 90% by moving from microservices back to a monolith?',
        answer: `**Amazon Prime Video's** video quality monitoring system migration is the most cited example of microservices being the wrong choice for a specific workload.

**The original microservices architecture**:
\`\`\`
Video Quality Monitoring (microservices):
  Video Stream ──► Media Converter (Lambda)
                       │
                       ▼
                  S3 (temp storage)
                       │
                       ▼
                  Defect Detector (Lambda) × N
                       │
                       ▼
                  Orchestrator (Step Functions)
                       │
                       ▼
                  Aggregator (Lambda)
                       │
                       ▼
                  Results DB

Problems:
  - Step Functions charged per state transition
    (millions of transitions per video = massive cost)
  - S3 put/get for inter-service data transfer
    (high latency, high cost for temporary data)
  - Each Lambda cold start added latency
  - Orchestration overhead exceeded actual processing time
\`\`\`

**The monolith solution**:
\`\`\`
Video Quality Monitoring (monolith):
  Video Stream ──► Single ECS Service
                   ┌──────────────────┐
                   │ Media Converter  │
                   │ Defect Detectors │ (all in one process)
                   │ Aggregator       │
                   └──────────────────┘
                          │
                          ▼
                     Results DB

Why it worked better:
  - In-memory data passing (no S3 round-trips)
  - No Step Functions overhead
  - Single container, predictable performance
  - Horizontal scaling by running N containers
\`\`\`

**Cost and performance impact**:
\`\`\`
Metric                  Microservices       Monolith
──────────────────────────────────────────────────────────────
Infrastructure cost     $$$$$               $ (90% reduction)
Processing latency      High (S3 hops)      Low (in-memory)
Operational complexity  High (many services) Low (one service)
Scaling model           Lambda auto-scale   ECS task count
Debugging               Distributed traces  Single process logs
\`\`\`

**Key lessons (not "monoliths are better")**:
\`\`\`
The microservices version was wrong because:
  ✗ Data flowed sequentially (not independently)
  ✗ Services were tightly coupled (pipeline, not graph)
  ✗ Inter-service data was large (video frames)
  ✗ No independent deployment benefit
  ✗ No different scaling needs per step

Microservices WOULD be right if:
  ✓ Components scaled independently
  ✓ Different teams owned different components
  ✓ Components could be deployed independently
  ✓ Inter-service data was small (events, IDs)
\`\`\`

**When to choose A vs B — the Amazon lesson**:
- **Monolith when**: Your workload is a sequential pipeline, data flows through stages in order, components do not need independent scaling, and inter-stage data is large
- **Microservices when**: Components have genuinely different scaling needs, different teams need deployment independence, and inter-service communication is lightweight
- **The meta-lesson**: Architecture decisions should be evaluated against the specific workload, not based on industry trends. Even Amazon — the company that pioneered microservices — chose a monolith when the workload demanded it.

**Interview tip**: This case study is powerful because it shows nuanced thinking. Amazon did not say "microservices are wrong" — they said "microservices were wrong for THIS workload." Use it to demonstrate that you evaluate architecture choices based on workload characteristics, not dogma.`
      },
      {
        question: 'How does Shopify maintain a 2.8-million-line monolith with 1,000+ developers?',
        answer: `**Shopify's modular monolith** is the best case study for scaling a monolith to thousands of developers through strong internal boundaries and innovative deployment patterns.

**Shopify's architecture**:
\`\`\`
Monolith codebase: 2.8 million lines of Ruby
Developers: 1,000+
MySQL queries/sec: 19 million
Merchants served: millions worldwide

Instead of microservices, Shopify uses:
  1. Modular monolith (internal boundaries)
  2. Podded architecture (database sharding)
  3. Selective extraction (checkout = separate service)
\`\`\`

**How they enforce module boundaries**:
\`\`\`
Packwerk (open-source Ruby tool by Shopify):
  ┌──────────────────────────────────────────┐
  │ Shopify Monolith                          │
  │ ┌──────────┐ ┌──────────┐ ┌────────────┐│
  │ │ Orders   │ │ Products │ │ Shipping   ││
  │ │ package  │ │ package  │ │ package    ││
  │ │          │ │          │ │            ││
  │ │ Public   │ │ Public   │ │ Public     ││
  │ │ API only │ │ API only │ │ API only   ││
  │ └──────────┘ └──────────┘ └────────────┘│
  │                                          │
  │ Packwerk enforces:                       │
  │ - No direct cross-package class access   │
  │ - Only public APIs at package boundaries │
  │ - Dependency graph must be acyclic       │
  │ - CI fails on boundary violations        │
  └──────────────────────────────────────────┘
\`\`\`

**Podded architecture (horizontal scaling without microservices)**:
\`\`\`
Instead of splitting services, Shopify shards merchants across pods:

  Pod 1: merchants A-F     Pod 2: merchants G-M
  ┌─────────────────┐      ┌─────────────────┐
  │ Full monolith   │      │ Full monolith   │
  │ App + DB shard  │      │ App + DB shard  │
  └─────────────────┘      └─────────────────┘

  Each pod runs the complete monolith
  with its own database shard.
  Merchants are assigned to pods.

  Benefits:
  - Blast radius limited per pod
  - Each pod scales independently
  - Same codebase everywhere
  - No microservice communication overhead
\`\`\`

**What Shopify DID extract as microservices**:
\`\`\`
Extracted services (selectively):
  ✓ Checkout: highest reliability requirement,
    different scaling pattern (bursty during flash sales)
  ✓ Fraud detection: different tech stack (ML),
    different team, different deployment cadence
  ✓ Storefront rendering: edge deployment,
    different performance profile

Kept in monolith:
  ✗ Admin dashboard, product management, order management,
    shipping, analytics — all benefit from shared transactions
    and simpler code sharing within the monolith
\`\`\`

**When to choose A vs B — Shopify's criteria for extraction**:
- **Keep in monolith**: Feature benefits from ACID transactions with other features, same team maintains it, same deployment cadence, shared data model
- **Extract to service**: Fundamentally different scaling pattern (bursty checkout vs steady admin), different reliability SLA, different tech stack requirement (ML), or different team with independent release needs
- **Modular monolith as default**: Enforce boundaries with tooling (Packwerk, ArchUnit), shard data for horizontal scaling, extract only when a clear criteria is met

**Interview tip**: Shopify's approach is the most pragmatic answer in 2025. It demonstrates that you do not need microservices to scale to billions in revenue with 1,000+ developers. Lead with the modular monolith recommendation and describe selective extraction for specific workloads. This shows mature architectural thinking that prioritizes business outcomes over technical fashion.`
      },
      {
        question: 'How do you handle inter-service communication patterns in a microservices architecture?',
        answer: `**Inter-service communication** is the most critical design decision in microservices because it determines coupling, failure modes, and performance characteristics.

**Synchronous vs asynchronous communication**:
\`\`\`
Synchronous (request-response):
  Service A ──REST/gRPC──► Service B
  A waits for B's response before continuing.

  Pros: Simple, immediate response, easy to reason about
  Cons: Tight coupling, cascading failures, latency chains

Asynchronous (event-driven):
  Service A ──event──► Message Broker ──► Service B
  A continues immediately, B processes when ready.

  Pros: Loose coupling, independent scaling, fault tolerant
  Cons: Eventual consistency, harder to debug, no immediate response
\`\`\`

**Communication patterns in detail**:
\`\`\`
Pattern 1 — REST/HTTP (synchronous):
  Order Service ──POST /payments──► Payment Service
  Simplest, most common for request-response.
  Use for: queries, commands needing immediate confirmation.

Pattern 2 — gRPC (synchronous, high-performance):
  Service A ──protobuf──► Service B (binary, typed, streaming)
  Lower latency than REST, schema-enforced contracts.
  Use for: internal service-to-service, high-throughput.

Pattern 3 — Message Queue (async, point-to-point):
  Order Service ──► SQS ──► Email Service
  One producer, one consumer. Guaranteed delivery.
  Use for: background tasks, one-to-one communication.

Pattern 4 — Pub/Sub (async, fan-out):
  Order Service ──event──► Kafka ──┬──► Inventory Service
                                    ├──► Shipping Service
                                    └──► Analytics Service
  One producer, many consumers. Decoupled.
  Use for: events that multiple services care about.

Pattern 5 — Saga (distributed transaction):
  Order ──► Payment ──► Inventory ──► Shipping
  Each step publishes event for next step.
  Compensating transactions on failure.
  Use for: multi-service business processes.
\`\`\`

**Failure handling for synchronous calls**:
\`\`\`
Without resilience (cascading failure):
  A ──► B ──► C (C is down)
  C times out → B times out → A times out
  All three services appear down to the user!

With resilience patterns:
  Circuit Breaker:
    A ──► B ──► [OPEN] C (C is down)
    Circuit breaker trips after N failures
    Subsequent calls to C fail fast (no timeout)
    Periodically tries C again (half-open state)

  Retry with backoff:
    A ──► B ──► C (temporary error)
    Retry after 100ms, 200ms, 400ms (exponential)
    Max 3 retries, then circuit breaker

  Bulkhead:
    A has separate thread pools for B and C calls
    C being slow does not consume all threads
    B calls continue working normally

  Timeout:
    Every call has an explicit timeout (e.g., 500ms)
    Never wait forever for a downstream response
\`\`\`

**Decision matrix**:
\`\`\`
Requirement              Pattern           Example
──────────────────────────────────────────────────────────────
Need immediate response  REST/gRPC         Get user profile
High throughput, typed   gRPC              Internal ML inference
Fire-and-forget          Message queue     Send email notification
Multiple consumers       Pub/sub (Kafka)   Order placed event
Distributed transaction  Saga pattern      Order → pay → ship
Streaming data           gRPC streaming    Real-time feed updates
\`\`\`

**When to choose A vs B**:
- **Synchronous (REST/gRPC)**: Choose when the caller needs an immediate response to continue its work. Add circuit breakers, retries, and timeouts.
- **Asynchronous (events/queues)**: Choose when the caller does not need to wait for the result, or when multiple services need to react to the same event. Default to async for decoupling.
- **The 80/20 rule**: Most mature microservice architectures use ~80% asynchronous communication and ~20% synchronous. If you find yourself making mostly synchronous calls, you may have a distributed monolith.

**Interview tip**: Always mention resilience patterns (circuit breaker, retry, timeout, bulkhead) alongside synchronous communication. A microservices architecture without resilience patterns is a cascading failure waiting to happen. Recommending async-first communication shows architectural maturity.`
      },
      {
        question: 'How does Conway\'s Law affect the monolith vs microservices decision?',
        answer: `**Conway's Law** states: "Organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations." In practice, this means your system architecture will mirror your team structure — whether you plan it that way or not.

**Conway's Law in action**:
\`\`\`
Team Structure                    Resulting Architecture
──────────────────────────────────────────────────────────────
Single team (5-10 people)    →    Monolith
  Everyone talks to everyone      (tight coupling is fine)

3 teams, shared codebase     →    Big ball of mud
  Unclear ownership               (no one owns anything)

3 teams, clear boundaries    →    Modular monolith
  Teams own modules               (clean interfaces, one deploy)

10 teams, autonomous         →    Microservices
  Teams own services end-to-end   (independent deployment)
\`\`\`

**The Inverse Conway Maneuver**:
\`\`\`
Traditional: Team structure → dictates architecture
Inverse:     Desired architecture → restructure teams

Example: You want microservices?
  Step 1: Define service boundaries (domain-driven design)
  Step 2: Create teams aligned to those boundaries
  Step 3: Each team owns their service(s) end-to-end

  WRONG: Split a monolith without changing team structure
    → Teams still communicate across service boundaries
    → Services have tight coupling (distributed monolith)

  RIGHT: Restructure teams first, then split services
    → Each team can make independent decisions
    → Services naturally decouple along team boundaries
\`\`\`

**Team Topologies framework** (Matthew Skelton & Manuel Pais):
\`\`\`
Four team types:
  Stream-aligned teams: own business features end-to-end
    → Own one or more services/modules
  Platform teams: provide shared infrastructure
    → CI/CD, monitoring, databases, auth
  Enabling teams: help stream-aligned teams adopt new tech
    → Temporary coaching, skill transfer
  Complicated subsystem teams: own technically complex domains
    → ML models, video encoding, crypto

Interaction modes:
  Collaboration: teams work closely together (temporary)
  X-as-a-Service: one team provides, other consumes (permanent)
  Facilitating: one team helps the other (temporary)
\`\`\`

**Real-world examples**:
\`\`\`
Amazon (two-pizza teams → microservices):
  Jeff Bezos mandated: every team can be fed by two pizzas (~8 people)
  Each team owns a service and its data
  Result: hundreds of independent services, fast innovation

Spotify (squads → microservices):
  Squads (small teams) own features end-to-end
  Tribes group related squads
  Result: independent deployment, aligned services

Shopify (one team → modular monolith):
  1,000+ developers in ONE codebase
  Module boundaries enforced by tooling (Packwerk)
  Team ownership mapped to modules, not services
  Result: monolith with clear ownership without microservice overhead
\`\`\`

**When to choose A vs B — Conway's Law implications**:
- **Monolith is correct when**: You have a single team or a few closely collaborating teams. Forcing microservices on a small team creates operational overhead without organizational benefit.
- **Modular monolith is correct when**: You have 5-15 teams that can coordinate on releases. Module boundaries give ownership without the operational cost of separate services.
- **Microservices are correct when**: You have many autonomous teams that need to deploy independently. The organizational benefit (deployment velocity, team autonomy) outweighs the technical cost.
- **Never split without team alignment**: Splitting a monolith into microservices without restructuring teams to match service boundaries creates a distributed monolith — the worst of both worlds.

**Interview tip**: Mentioning Conway's Law elevates your answer from a technical discussion to an organizational one, which is where the real decision lives. The strongest candidates say: "The architecture decision depends on team structure and communication patterns" before discussing technical trade-offs. This shows you understand that microservices are an organizational scaling strategy, not just a technical pattern.`
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

    introduction: `**Serverless** computing lets you run code without managing servers — the cloud provider handles provisioning, scaling, and maintenance. **AWS Lambda**, **Google Cloud Functions**, and **Azure Functions** are the leading FaaS platforms. In contrast, **traditional infrastructure** (VMs, containers on Kubernetes/ECS) gives you full control over the runtime, networking, and scaling behavior at the cost of operational overhead. The hybrid approach is increasingly dominant — teams applying workload-specific placement (serverless for bursty, containers for sustained) achieve 30-48% cost reduction compared to using only one model.

The serverless value proposition is compelling: zero idle cost, automatic scaling, and no infrastructure management. But it comes with constraints — **cold starts** add latency (100ms for Node.js to 5+ seconds for Java), execution timeouts limit long-running tasks (15 minutes on AWS Lambda), and the per-invocation pricing becomes expensive at high sustained throughput. The cost crossover point is roughly 30-50 million invocations per month — below that, Lambda is cheaper; above that, containers on ECS/Kubernetes win. Container-based deployments on Kubernetes offer a middle ground with more control and predictable performance, while requiring more operational expertise.

**Cloudflare Workers** represents an emerging third option: edge computing with V8 isolates that eliminates cold starts entirely, achieves sub-50ms global latency across 300+ edge locations, and has reached 3 million active developers. Workers Containers (launched 2025) further blur the line by enabling containerized workloads at the edge. Google Cloud Run offers a similar container-based serverless model that scales to zero without cold-start penalties of traditional FaaS.

In system design interviews, the decision should be workload-driven. **Event-driven glue code** (processing S3 uploads, reacting to queue messages, handling webhooks) is a natural fit for serverless. **Sustained request-serving workloads** (APIs handling thousands of QPS continuously) are typically cheaper and more predictable on containers. Most production architectures in 2025 use a hybrid: containers for the core request path and serverless for event processing, cron jobs, and glue code. Understanding these trade-offs and articulating the cost crossover point demonstrates practical architectural judgment.`,

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
      {
        question: 'How do Cloudflare Workers and edge computing change the serverless equation?',
        answer: `**Cloudflare Workers** represent a fundamentally different serverless model — code runs at 300+ edge locations using V8 isolates instead of containers, eliminating cold starts and achieving sub-50ms global latency.

**Architecture comparison**:
\`\`\`
AWS Lambda (container-based):
  Request ──► API Gateway ──► Lambda (one region)
  Cold start: 100ms-5s
  Location: single region (or Lambda@Edge with limits)

Cloudflare Workers (isolate-based):
  Request ──► Nearest PoP (300+ locations) ──► Worker
  Cold start: 0ms (pre-warmed V8 isolates)
  Location: every edge location globally

Google Cloud Run (container-based, scales to zero):
  Request ──► Cloud Run (auto-scales, one region)
  Cold start: ~100ms-2s (container startup)
  Location: single region (multi-region requires setup)
\`\`\`

**Cloudflare Workers ecosystem**:
\`\`\`
Component           Purpose                  Comparison
──────────────────────────────────────────────────────────────
Workers             Compute at edge           Lambda equivalent
KV                  Global key-value store    DynamoDB equivalent (eventual)
D1                  SQLite at edge            Aurora Serverless equivalent
Durable Objects     Stateful edge compute     No direct AWS equivalent
R2                  Object storage            S3 equivalent (no egress fees)
Queues              Message queues            SQS equivalent
Workers AI          ML inference at edge      SageMaker equivalent
Workers Containers  Container workloads       Fargate at edge (2025)
\`\`\`

**When edge serverless beats traditional serverless**:
\`\`\`
Use Case                  Lambda          Workers         Winner
──────────────────────────────────────────────────────────────
Auth/JWT validation       ~200ms (cold)   <10ms           Workers
A/B testing               ~200ms          <10ms           Workers
API response caching      N/A             <10ms           Workers
Geolocation routing       ~100ms          <5ms            Workers
Image transformation      ~500ms          <50ms           Workers
Complex business logic    Full runtime    Limited (10ms)  Lambda
Heavy computation (>10s)  15 min max      10ms CPU max    Lambda
VPC/DB access             Native          Via Hyperdrive  Lambda
Large dependencies        250MB           Varies          Lambda

Workers limitations:
  - 10ms CPU time per request (free) / 30s (paid)
  - No native filesystem access
  - V8 runtime only (JS/TS/Wasm)
  - Memory limits (~128MB)
\`\`\`

**When to choose A vs B**:
- **Cloudflare Workers**: Choose for latency-sensitive edge logic (auth, routing, A/B tests, caching), lightweight API endpoints, and workloads that benefit from global distribution. Best for read-heavy, stateless, low-compute tasks.
- **AWS Lambda**: Choose for compute-intensive tasks, workloads needing VPC access to databases, complex business logic with many dependencies, and tasks needing up to 15 minutes runtime.
- **Google Cloud Run**: Choose for container-based workloads that need scale-to-zero without cold-start optimization work, especially if you want full Docker compatibility.
- **Hybrid (most common)**: Workers at the edge for auth, caching, and routing + Lambda/containers in the region for business logic and database access.

**Interview tip**: Mentioning Cloudflare Workers shows awareness of the edge computing trend that is reshaping serverless. The key insight is that the serverless landscape is bifurcating: edge compute for lightweight global logic and regional compute for heavy business logic. The strongest architectures use both — Workers as a smart routing/caching layer in front of regional services.`
      },
      {
        question: 'How do you handle the serverless database connection problem, and what patterns solve it?',
        answer: `**The database connection problem** is the most common operational issue when adopting serverless. Each Lambda invocation can open a new database connection, and under high concurrency, this overwhelms the database connection limit.

**The problem illustrated**:
\`\`\`
Traditional server (connection pooling):
  Server ──► Connection Pool (10 connections) ──► PostgreSQL
  All requests share 10 connections.
  PostgreSQL sees: 10 connections (fine)

Serverless (no connection pooling):
  Lambda 1 ──► new connection ──► PostgreSQL
  Lambda 2 ──► new connection ──► PostgreSQL
  ...
  Lambda 1000 ──► new connection ──► PostgreSQL
  PostgreSQL sees: 1000 connections (overwhelmed!)

  PostgreSQL default max_connections: 100-200
  Lambda concurrent executions: 1000+ (auto-scaled)
  Result: "too many connections" errors
\`\`\`

**Solution 1 — Connection proxy (recommended)**:
\`\`\`
AWS RDS Proxy:
  Lambda ──► RDS Proxy ──► PostgreSQL/MySQL
  (up to 1000    (pools and      (sees only
   connections)   multiplexes)    50 connections)

  RDS Proxy handles:
  - Connection pooling (multiplexes many Lambda → few DB conns)
  - Connection reuse (warm connections for subsequent invocations)
  - Failover (automatic during DB failover)

  Trade-off: adds ~5ms latency, $0.015/vCPU-hour cost
  But: eliminates connection storms completely

PgBouncer (self-managed alternative):
  Lambda ──► PgBouncer (on EC2/ECS) ──► PostgreSQL
  Same concept, more operational overhead
  Cheaper than RDS Proxy for high-volume workloads
\`\`\`

**Solution 2 — Serverless-native database**:
\`\`\`
DynamoDB:
  Lambda ──HTTP──► DynamoDB (no connection concept)
  Each request is an independent HTTP call.
  No connection limits, infinite concurrency.
  Trade-off: no SQL, no joins, different data model.

Aurora Serverless v2:
  Lambda ──► Aurora Serverless (managed connection proxy)
  Built-in connection management, scales with Lambda.
  Trade-off: higher cost than standard Aurora.

PlanetScale (MySQL serverless):
  Lambda ──HTTP──► PlanetScale (connection-safe by design)
  Uses Vitess proxy layer for connection management.
  Trade-off: MySQL only, hosted service cost.
\`\`\`

**Solution 3 — Connection reuse in Lambda**:
\`\`\`
// Lambda handler — reuse connection across invocations
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      max: 1,  // one connection per Lambda instance
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 60000,
    });
  }
  return pool;
}

exports.handler = async (event) => {
  const client = await getPool().connect();
  try {
    // use client
  } finally {
    client.release();  // return to local pool, NOT close
  }
};

// Lambda keeps the connection alive between invocations
// of the SAME instance. But new instances still create
// new connections during scale-up.
\`\`\`

**Solution comparison**:
\`\`\`
Solution               Latency    Cost        Complexity   Best For
───���──────────────────────────────────────────────────────────────
RDS Proxy              +5ms       $$/month    Low          Most apps
PgBouncer (self-mgd)   +2ms       $ (EC2)     Medium       Cost-sensitive
DynamoDB               ~5ms       Per-request Low          New apps
Aurora Serverless      +0ms       $$$         Low          AWS-native
Connection reuse       +0ms       Free        Low          Low concurrency
HTTP-based DB          ~10ms      Per-request Low          Edge functions
\`\`\`

**When to choose A vs B**:
- **RDS Proxy (default recommendation)**: Best for most Lambda + RDS/Aurora workloads. Managed, requires minimal code changes, handles connection storms automatically.
- **DynamoDB**: Best for new serverless applications where you can design the data model from scratch. Eliminates the connection problem entirely.
- **Connection reuse + low concurrency limits**: Acceptable for Lambda functions with limited concurrency (< 50) where RDS Proxy cost is not justified.
- **PgBouncer on ECS**: Choose when you need connection pooling but RDS Proxy cost is prohibitive at scale.

**Interview tip**: The database connection problem is the "gotcha" that separates serverless beginners from practitioners. Always mention it when proposing Lambda + relational database. Recommending RDS Proxy shows practical AWS experience. The deeper insight is that serverless works best with serverless-native databases (DynamoDB) — the impedance mismatch with connection-based databases is fundamental.`
      },
      {
        question: 'How do you design a hybrid architecture that uses both serverless and containers for optimal cost and performance?',
        answer: `**The hybrid approach** is how most production systems actually deploy in 2025 — using serverless for bursty/event-driven workloads and containers for sustained/stateful workloads, optimizing each for its specific characteristics.

**Hybrid architecture pattern**:
\`\`\`
Internet ──► API Gateway / Load Balancer
                │
        ┌───────┴────────┐
        ▼                ▼
  Serverless Tier      Container Tier
  (Lambda/Workers)     (ECS/Kubernetes)
  ┌──────────────┐     ���──────────────────┐
  │ Auth/JWT     │     │ Core API (REST)  │
  │ Webhooks     │     │ GraphQL Gateway  │
  │ Image resize │     │ WebSocket server │
  │ Cron jobs    │     │ ML inference     │
  │ Queue workers│     │ Background workers│
  │ Edge routing │     │ Admin dashboard  │
  └──────────────┘     └──────────────────┘
        │                      │
        └──────────┬───────────┘
                   ▼
            Shared Data Layer
  ┌──────────────────────────────────┐
  │ RDS/Aurora  │  Redis  │  S3     │
  │ (via Proxy) │ (cache) │ (files) │
  └──────────────────────────────────┘
\`\`\`

**What goes where — decision matrix**:
\`\`\`
Workload Characteristic       Deploy As           Reason
───────��──────────────────────────────────────────────────────
Bursty, event-triggered       Lambda              Scale to 0, pay per use
Sustained 1000+ QPS           ECS/K8s             Cost-effective, predictable
WebSocket/long connections    ECS/K8s             Lambda has 15min timeout
Background queue processing   Lambda              Auto-scales with queue depth
Scheduled jobs (cron)         Lambda + EventBridge Zero cost between runs
Image/video processing        Lambda              Parallel, bursty, event-driven
ML model serving              ECS/K8s + GPU       Long-running, needs GPU
Auth at edge                  Workers/Lambda@Edge Global, sub-10ms needed
Core business API             ECS/K8s             Connection pooling, state
Webhook receiving             Lambda              Bursty, unpredictable volume
Data pipeline (ETL)           Lambda (if <15min)  Event-driven, parallelizable
                              ECS (if >15min)     No timeout constraint
\`\`\`

**Cost optimization patterns**:
\`\`\`
Pattern 1 — Serverless for spikes, containers for baseline:
  Baseline: ECS (2 tasks always running) = $70/month
  Spikes:   Lambda handles overflow      = $5/month (bursty)
  vs. all Lambda: $200/month (sustained is expensive)
  vs. all ECS provisioned for peak: $300/month (over-provisioned)

Pattern 2 — Lambda for async, containers for sync:
  API requests: ECS (predictable latency, connection pools)
  SQS consumers: Lambda (auto-scales with queue depth)
  S3 triggers: Lambda (event-driven, zero cost when idle)

Pattern 3 — Edge + region:
  Edge (Workers): auth, caching, A/B, geolocation routing
  Region (ECS): business logic, database queries
  Saves: ~40% of requests never reach regional compute
\`\`\`

**Real-world hybrid examples**:
\`\`\`
Company         Containers Used For       Serverless Used For
────────────────────────────��─────────────────────────────────
Airbnb          Core search API,          Image processing,
                booking service           payment webhooks
Netflix         Encoding pipeline,        Telemetry ingest,
                API gateway               cron jobs, alerts
Stripe          Payment processing API,   Webhook delivery,
                dashboard                 report generation
Vercel          Build infrastructure,     Edge middleware,
                deployment API            ISR revalidation
\`\`\`

**When to choose A vs B**:
- **100% serverless**: Choose for small teams (< 5 engineers) with bursty workloads, no WebSocket needs, and DynamoDB-compatible data model. Maximum simplicity, minimum ops.
- **100% containers**: Choose for teams with Kubernetes expertise, sustained high-throughput workloads, complex stateful services, and need for full control.
- **Hybrid (recommended for most)**: Choose when you have a mix of bursty and sustained workloads, want to optimize cost, and have the maturity to manage two deployment models.
- **Key principle**: Use serverless for event-driven glue and containers for request-serving core. This naturally aligns with cost optimization.

**Interview tip**: The hybrid approach is the most sophisticated and practical answer. It shows you understand that different workloads have different optimal deployment models. Frame it as: "I would use containers for the core request path and serverless for event processing, background jobs, and edge logic." Then walk through the cost and performance rationale for each component.`
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

    introduction: `Choosing the right **real-time communication pattern** is a critical system design decision that affects latency, scalability, infrastructure cost, and implementation complexity. The five primary approaches — **short polling**, **long polling**, **Server-Sent Events (SSE)**, **WebSockets**, and **webhooks** — each solve different problems and come with distinct trade-offs. Discord handles billions of messages daily using WebSockets sharded across thousands of gateway processes, while Stripe uses webhooks for server-to-server payment notifications with exponential backoff retry. The pattern you choose depends on who is communicating (client-server vs server-server), the direction of data flow, and your latency requirements.

**Polling** (short and long) works entirely within the HTTP request-response model, making it compatible with all infrastructure. **SSE** enables efficient server-to-client push over a single HTTP connection with automatic reconnection — and with HTTP/2 multiplexing, the historical 6-connection-per-domain limit disappears, making SSE viable for dashboards with dozens of data streams. **WebSockets** upgrade the HTTP connection to a persistent, full-duplex channel for true bidirectional communication, but each connection consumes 20-50KB of memory on the server. **Webhooks** are the server-to-server equivalent, where one system pushes notifications to another via HTTP POST.

In system design interviews, the common mistake is jumping to WebSockets for every "real-time" requirement. Most real-time features (live dashboards, notification feeds, status updates, AI streaming responses) only need server-to-client push, which SSE handles more simply. GitHub uses SSE for CI/CD log streaming, OpenAI uses SSE for streaming chat completions, and most stock ticker displays use SSE. WebSockets add connection management complexity that is justified only for truly bidirectional use cases like chat, multiplayer gaming, or collaborative editors.

The scaling challenge differs dramatically between patterns. Polling scales with your API infrastructure (stateless). SSE maintains one HTTP connection per client (moderate state). WebSockets maintain persistent TCP connections requiring sticky load balancing, pub/sub for cross-server messaging, and heartbeating to detect dead connections. Choose the simplest pattern that meets your requirements — complexity compounds at scale.`,

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
      {
        question: 'How does Discord scale WebSockets to handle hundreds of millions of concurrent users?',
        answer: `**Discord** is the gold-standard example of WebSocket scaling, processing billions of messages daily across hundreds of millions of users with sub-100ms message delivery.

**Discord's WebSocket architecture**:
\`\`\`
Client ──► Cloudflare (DDoS + routing)
               │
               ▼
          GCP Load Balancer (L4/TCP)
               │
               ▼
          Gateway Servers (WebSocket tier)
          ┌──────────┐ ┌──────────┐ ┌──────────┐
          │ Gateway  │ │ Gateway  │ │ Gateway  │
          │ Shard 0  │ │ Shard 1  │ │ Shard N  │
          │ ~5K users│ │ ~5K users│ │ ~5K users│
          │ (Elixir) │ │ (Elixir) │ │ (Elixir) │
          └────┬─────┘ └────┬─────┘ └────┬─────┘
               │            │            │
               └────────────┼────────────┘
                            ▼
                    Internal Pub/Sub
                    (message routing between shards)
                            │
                    ┌───────┴───────┐
                    ▼               ▼
              Guild Services    Presence Service
              (Rust/Elixir)     (Rust)
\`\`\`

**Key scaling decisions**:
\`\`\`
Decision                  Choice             Why
──────────────────────────────────────────────────────────────
Runtime                   Elixir (BEAM VM)   Millions of lightweight processes,
                                             built-in fault tolerance
Sharding unit             ~5K users/shard    Balance between memory efficiency
                                             and failure blast radius
Cross-shard messaging     Internal pub/sub   Decouple connection handling
                                             from message routing
Message fan-out           Per-guild          Only deliver to users in the
                                             relevant guild/channel
Voice connections         Separate servers   WebRTC needs different
                                             infrastructure than chat
State management          In-memory + DB     Presence and typing in memory,
                                             messages persisted to ScyllaDB
\`\`\`

**Why Elixir/BEAM for WebSockets**:
\`\`\`
BEAM VM advantages for connection-heavy workloads:
  - Each WebSocket connection = one Erlang process (~2KB memory)
  - Millions of processes per node (vs threads: thousands)
  - Built-in supervision trees (auto-restart on crash)
  - Hot code reloading (upgrade without disconnecting users)
  - Preemptive scheduling (one slow process cannot block others)

Comparison:
  Node.js: single-threaded, event loop (good for I/O)
  Go: goroutines (~4KB each, efficient)
  Elixir/BEAM: processes (~2KB each, fault-isolated)
  Java: threads (~1MB each, expensive)
\`\`\`

**Discord's voice architecture** (2.5M+ concurrent):
\`\`\`
Voice is separate from chat:
  Client ──► Voice Gateway (signaling) ──► Voice Server (media)
                                            │
                                       WebRTC (UDP)
                                       220 Gbps egress
                                       120M packets/sec

  Each voice server handles one voice channel
  Separate scaling from text chat
\`\`\`

**When to choose A vs B — Discord's decisions applied to your system**:
- **WebSockets (Discord's choice)**: Choose when you need true bidirectional communication, sub-second message delivery, and the user expects real-time interaction (chat, gaming, collaboration)
- **SSE would NOT work for Discord because**: Users send messages (client-to-server), not just receive them. Typing indicators require bidirectional updates. Voice signaling requires bidirectional WebSocket.
- **The sharding lesson**: If you need > 10K WebSocket connections, shard by user/room/channel. Each shard is an independent unit that can be placed on any server. Use pub/sub for cross-shard communication.

**Interview tip**: Discord is the best WebSocket scaling reference because it covers every challenge: sharding, cross-shard messaging, state management, and failure recovery. The key takeaway is that WebSocket infrastructure at scale requires a pub/sub layer for message routing — direct server-to-server communication does not work when you have thousands of gateway servers.`
      },
      {
        question: 'How do you design SSE for AI streaming responses (like ChatGPT), and what are the edge cases?',
        answer: `**Server-Sent Events (SSE)** is the standard pattern for streaming AI responses. OpenAI, Anthropic, and most LLM providers use SSE because AI responses are unidirectional (server-to-client) and benefit from incremental delivery.

**SSE for AI streaming — basic architecture**:
\`\`\`
Client ──► POST /api/chat (initial request with prompt)
       ◄── 200 OK, Content-Type: text/event-stream
       ◄── data: {"token": "The"}
       ◄── data: {"token": " answer"}
       ◄── data: {"token": " is"}
       ◄── data: {"token": " 42."}
       ◄── data: [DONE]

Backend:
  Client request ──► Your API ──► LLM API (streaming)
                                      │
                              stream tokens back
                                      │
                         ◄── forward each token to client
                              via SSE
\`\`\`

**Implementation pattern (Node.js)**:
\`\`\`
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    stream: true,
    messages: req.body.messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      res.write(\`data: \${JSON.stringify({
        token: event.delta.text
      })}\\n\\n\`);
    }
  }

  res.write('data: [DONE]\\n\\n');
  res.end();
});
\`\`\`

**Edge cases and challenges**:
\`\`\`
Challenge 1 — Client disconnect mid-stream:
  User navigates away during generation
  → Server must detect disconnect and abort LLM request
  → Otherwise: paying for tokens nobody will see

  Solution: req.on('close', () => stream.abort());

Challenge 2 — Timeout on long responses:
  Complex queries may take 60+ seconds
  CDN/proxy may timeout at 30 seconds

  Solutions:
  - Configure CDN timeout > max response time
  - Send keep-alive comments: ": ping\\n\\n" every 15s
  - Use Cloudflare's streaming-compatible configuration

Challenge 3 — Error mid-stream:
  LLM API returns error after streaming 50% of response
  HTTP status already sent as 200!

  Solution: Send error as SSE event:
  data: {"error": "upstream_timeout", "partial": true}

Challenge 4 — Retry and resume:
  Connection drops after receiving half the response
  SSE has built-in Last-Event-ID for resumption

  But: LLM responses are not easily resumable
  Solution: Cache partial responses server-side,
  include response_id, client reconnects with ID
  → Server sends remaining tokens from cache

Challenge 5 — Buffering by proxies:
  Nginx/CloudFront may buffer SSE chunks
  User sees nothing for seconds, then a burst

  Solution:
  - X-Accel-Buffering: no (Nginx)
  - Transfer-Encoding: chunked
  - Disable compression for SSE endpoints
\`\`\`

**Why SSE over WebSocket for AI streaming**:
\`\`\`
Criteria               SSE                  WebSocket
──────────────────────────────────────────────────────────────
Direction needed       Server→Client (fits) Bidirectional (overkill)
Auto-reconnection      Built-in             Must implement
HTTP compatibility     Yes (CDN, proxy)     Often needs special config
Implementation         Simple               More complex
Load balancer          Any HTTP LB          Needs WS-aware LB
Multiple conversations POST per conversation Single connection, mux

SSE wins because AI chat is:
  - Request-response (user sends, AI replies)
  - Unidirectional during streaming (server→client)
  - HTTP-compatible (works through CDN/proxy)
  - Short-lived (connection per generation, not permanent)
\`\`\`

**When to choose A vs B**:
- **SSE (recommended for AI)**: Use for AI chat completions, code generation streaming, and any LLM response streaming. Simpler, HTTP-compatible, works with CDN.
- **WebSocket**: Use only if you need real-time collaborative features ON TOP of AI (e.g., multiple users seeing AI response simultaneously with cursor sync, like Google Docs with AI). The bidirectional channel adds complexity that is unnecessary for simple AI chat.
- **Fetch streaming (ReadableStream)**: Alternative to EventSource API that gives more control (POST body, custom headers). Used by Anthropic and OpenAI SDKs.

**Interview tip**: AI streaming is an extremely relevant real-time topic. Mention SSE as the correct choice (not WebSocket), discuss the proxy buffering challenge, and show awareness of error handling mid-stream. The key insight is that even though it "feels" like a WebSocket use case, AI chat is fundamentally request-response with streaming response — SSE is the right abstraction.`
      },
      {
        question: 'How do you build a reliable webhook delivery system with guaranteed at-least-once delivery?',
        answer: `**Webhook reliability** is critical for payment processing (Stripe), CI/CD (GitHub), and any integration where missed events cause business impact. Building a production-grade webhook system requires persistent storage, retry logic, and idempotency.

**Complete webhook delivery architecture**:
\`\`\`
Event Occurs (e.g., payment.completed)
     │
     ▼
┌──────────────────────────┐
│ Webhook Events Table     │ ◄── Persistent storage (source of truth)
│ id, event_type, payload, │     Never lose an event
│ status, attempts, next_  │
│ retry_at, created_at     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Delivery Queue (SQS/BQ)  │ ◄── Decouples event creation from delivery
│ Message = event_id       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Webhook Worker           │
│ 1. Fetch event by ID     │
│ 2. POST to endpoint URL  │
│ 3. Record result         │
│ 4. If failed → retry     │
└──────────────────────────┘
\`\`\`

**Retry strategy (Stripe's model)**:
\`\`\`
Stripe retries failed webhooks on this schedule:
  Attempt 1: Immediate
  Attempt 2: 5 minutes later
  Attempt 3: 30 minutes later
  Attempt 4: 2 hours later
  Attempt 5: 5 hours later
  Attempt 6: 10 hours later
  Attempt 7: 10 hours later
  Final:     3 days total elapsed

After all retries exhausted:
  → Mark event as failed
  → Notify customer via email/dashboard
  → Allow manual retry from dashboard
  → Retain event for 30 days (query via API)
\`\`\`

**Idempotency on the receiver side**:
\`\`\`
Receiver's webhook handler MUST be idempotent:

POST /webhooks/stripe
{
  "id": "evt_1234abcd",           ← Unique event ID
  "type": "payment_intent.succeeded",
  "data": { "amount": 5000, ... }
}

Receiver logic:
  1. Check: have I already processed evt_1234abcd?
     → SELECT id FROM processed_events WHERE event_id = 'evt_1234abcd'
  2. If yes: return 200 OK (already handled)
  3. If no: process the event
     → INSERT INTO processed_events (event_id, processed_at)
     → Execute business logic
     → Return 200 OK

Why idempotency is critical:
  - Network timeout: your server processed it but the 200
    never reached Stripe → Stripe retries → duplicate!
  - Queue redelivery: SQS delivers same message twice
  - Manual retry: customer clicks "retry" from dashboard
\`\`\`

**Security — signature verification**:
\`\`\`
Stripe's HMAC signature verification:

Sender (Stripe):
  signature = HMAC-SHA256(
    timestamp + "." + raw_body,
    webhook_signing_secret
  )
  Header: Stripe-Signature: t=1234,v1=abc123...

Receiver:
  expected = HMAC-SHA256(
    timestamp + "." + raw_body,
    MY_WEBHOOK_SECRET
  )
  if (expected !== received_signature) → reject (401)
  if (abs(now - timestamp) > 300) → reject (replay attack)

Why both checks matter:
  - Signature prevents spoofed webhooks (attacker cannot sign)
  - Timestamp prevents replay attacks (old captured webhook resent)
\`\`\`

**Monitoring and observability**:
\`\`\`
Dashboard metrics (Stripe's approach):
  Per endpoint:
    - Success rate (target: >99%)
    - Average delivery latency
    - Current retry queue depth
    - Last successful delivery timestamp
    - Consecutive failure count

Alerting:
  - Endpoint success rate < 95% for 1 hour → email notification
  - 3+ consecutive failures → dashboard warning
  - All retries exhausted → email + dashboard alert
  - Endpoint disabled after 7 days of 100% failure

Self-service:
  - View recent deliveries (request + response)
  - Manual retry for failed events
  - Test endpoint with sample event
  - Enable/disable webhook without losing queued events
\`\`\`

**When to choose A vs B**:
- **Webhooks (push)**: Choose for server-to-server integration where the receiver needs to react to events without polling. Standard for payment processors, CI/CD, and SaaS integrations.
- **Polling API**: Choose when the receiver cannot expose a public endpoint (behind firewall), or when the receiver needs to control the processing rate. Simpler to implement.
- **Message queue (Kafka/SQS)**: Choose for internal service-to-service communication where both systems are under your control. More reliable than webhooks (no HTTP delivery issues).
- **Webhook + polling hybrid**: Some providers (Stripe, GitHub) offer both webhooks and a polling API. Use webhooks for real-time reaction and polling as a reconciliation mechanism to catch any missed events.

**Interview tip**: A production webhook system has four non-negotiable components: persistent event storage (never lose events), exponential backoff retries (do not overwhelm receivers), HMAC signature verification (prevent spoofing), and receiver-side idempotency (handle duplicates). Cover all four to demonstrate completeness.`
      },
      {
        question: 'How do you choose between gRPC streaming and WebSockets for inter-service real-time communication?',
        answer: `**gRPC streaming** and **WebSockets** both support bidirectional real-time communication, but they serve different use cases and have different operational characteristics.

**Protocol comparison**:
\`\`\`
gRPC Streaming:                    WebSocket:
  Built on HTTP/2                    Built on HTTP/1.1 upgrade
  Binary (Protobuf) encoding         Text or binary (flexible)
  Strongly typed (proto schema)      Untyped (app defines format)
  Multiplexed streams                Single connection, single stream
  Deadline/timeout per RPC           No built-in timeout
  Native load balancing support      Requires L4 or WS-aware LB
  Four streaming modes:              One mode:
    - Unary (req/res)                  - Bidirectional
    - Server streaming
    - Client streaming
    - Bidirectional streaming
\`\`\`

**gRPC streaming modes**:
\`\`\`
Server streaming (most common):
  Client sends one request
  Server sends stream of responses
  Use: price feeds, log tailing, progress updates

  rpc GetPrices(PriceRequest) returns (stream PriceUpdate);

Client streaming:
  Client sends stream of data
  Server sends one response
  Use: file upload, telemetry batching

  rpc UploadMetrics(stream Metric) returns (Summary);

Bidirectional streaming:
  Both sides send streams independently
  Use: chat, real-time collaboration

  rpc Chat(stream Message) returns (stream Message);
\`\`\`

**Detailed comparison**:
\`\`\`
Feature              gRPC Streaming       WebSocket
──────────────────────────────────────────────────────────────
Type safety          Protobuf (compiled)  None (JSON by convention)
Performance          Binary, compressed   Text or binary
Schema evolution     Proto versioning     Manual (no enforcement)
Browser support      Limited (gRPC-web)   Full native support
Service mesh support Excellent (Istio,    Limited
                     Envoy, Linkerd)
Observability        Built-in (deadlines, Manual (must implement)
                     metadata, status)
Load balancing       L7 with gRPC-aware   L4/sticky sessions
Cancellation         Native RPC cancel    Close connection
Error handling       Typed status codes   Connection close or
                     (gRPC codes)         custom error messages
Reconnection         Per-RPC retry        Manual reconnect logic
\`\`\`

**When to use each**:
\`\`\`
gRPC streaming — choose for:
  ✓ Service-to-service (backend-to-backend)
  ✓ Strong typing is important (proto contracts)
  ✓ Already using gRPC for unary RPCs
  ✓ Service mesh with Envoy/Istio (native gRPC support)
  ✓ Need deadline propagation and cancellation
  Companies: Google (internal), Netflix (service mesh),
             Lyft (microservice communication)

WebSocket — choose for:
  ✓ Client-to-server (browser/mobile to backend)
  ✓ Full browser support needed (no gRPC-web proxy)
  ✓ Binary data (audio, video, game state)
  ✓ Long-lived persistent connections
  ✓ Custom protocol on top of reliable transport
  Companies: Discord (chat), Slack (messaging),
             Figma (collaborative editing)
\`\`\`

**The gRPC-web bridge for browser clients**:
\`\`\`
Browser ──► gRPC-Web Proxy (Envoy) ──► gRPC Service
            (translates HTTP/1.1        (native gRPC
             to HTTP/2 gRPC)             streaming)

Limitation: gRPC-web supports server streaming but
NOT client streaming or bidirectional streaming.
For full bidirectional: use WebSocket directly.
\`\`\`

**When to choose A vs B**:
- **gRPC streaming**: Default for internal service-to-service communication, especially in a microservices architecture with a service mesh. The type safety, observability, and deadline propagation are worth the setup cost.
- **WebSocket**: Default for browser/mobile client connections where native browser support matters and you need full bidirectional streaming.
- **SSE**: Choose over both when you only need server-to-client push (dashboards, notifications, AI streaming). Simpler than WebSocket, more compatible than gRPC-web.
- **Combined**: Many architectures use WebSocket for client-facing connections and gRPC streaming for backend service-to-service communication.

**Interview tip**: Most candidates only think of WebSocket for real-time communication. Mentioning gRPC streaming for service-to-service shows backend depth. The key insight is: WebSocket for the browser edge, gRPC streaming for the backend mesh, and SSE when unidirectional push is sufficient.`
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

    introduction: `Every system has a characteristic **read-to-write ratio** that should fundamentally shape its architecture. A **read-heavy system** (social media feeds, product catalogs, CDNs) serves orders of magnitude more reads than writes — Wikipedia serves 300,000+ page views per second but only a few hundred edits per minute. A **write-heavy system** (IoT telemetry, logging platforms, financial tick data) ingests data at extreme rates where write throughput is the bottleneck — Datadog ingests trillions of data points daily where writes outnumber reads 100:1.

The optimization strategies for each are nearly opposite. Read-heavy systems benefit from **caching**, **read replicas**, **denormalization**, and **CDNs** — all techniques that trade write complexity for read speed. Write-heavy systems benefit from **LSM-tree storage** (Cassandra, RocksDB), **write-behind buffering**, **batching**, and **append-only designs** — techniques that optimize the write path at the cost of read performance. The choice of storage engine is directly driven by this ratio: B-tree indexes (PostgreSQL, MySQL) optimize for reads with random I/O writes, while LSM-tree indexes (Cassandra, RocksDB) optimize for writes with sequential I/O at the cost of read amplification.

Many real-world systems have mixed workloads that require **CQRS** (Command Query Responsibility Segregation) — separate read and write paths optimized independently. Twitter's timeline is the canonical example: writes (tweets) go to Cassandra optimized for high write throughput, while reads (timeline views) are served from pre-built Redis lists optimized for instant retrieval. LinkedIn, Netflix, and Uber all use variants of this pattern where the write store and read store are different technologies connected by CDC or event streaming.

Understanding this trade-off is essential for system design interviews because the read:write ratio is often the first question that should shape your architecture. A system designed for reads will crumble under write load, and vice versa. The strongest candidates identify the ratio early, state it explicitly, and let it drive every subsequent design decision from storage engine to caching strategy to replication topology.`,

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
      {
        question: 'How do B-tree vs LSM-tree storage engines differ, and how does this affect read/write performance?',
        answer: `**Storage engine choice** is the most fundamental decision for read-heavy vs write-heavy systems. B-trees and LSM-trees make opposite trade-offs at the I/O level.

**B-Tree (read-optimized) — used by PostgreSQL, MySQL/InnoDB**:
\`\`\`
Write operation:
  1. Find the correct page in the tree (random I/O)
  2. Read the page into memory
  3. Modify the page in place
  4. Write the modified page back (random I/O)
  5. Update WAL for durability

  Write amplification: ~2-4x (read page + write page + WAL)
  I/O pattern: RANDOM writes (slow on spinning disk, OK on SSD)

Read operation:
  1. Follow tree from root to leaf (O(log N) pages)
  2. Each page is a contiguous block on disk
  3. Pages are cached in buffer pool

  Read amplification: O(log N) pages
  I/O pattern: SEQUENTIAL within pages (fast)
\`\`\`

**LSM-Tree (write-optimized) — used by Cassandra, RocksDB, LevelDB**:
\`\`\`
Write operation:
  1. Append to WAL (sequential I/O — fast!)
  2. Insert into in-memory memtable (sorted)
  3. When memtable full → flush to disk as SSTable
  4. Background compaction merges SSTables

  Write amplification: ~1x for initial write (sequential)
  Compaction adds 10-30x total write amplification over time
  I/O pattern: SEQUENTIAL writes (optimal for any storage)

Read operation:
  1. Check memtable (in-memory)
  2. Check each SSTable level (may check multiple files)
  3. Bloom filters skip SSTables that do not contain key
  4. Merge results from multiple SSTables

  Read amplification: check multiple SSTables
  I/O pattern: potentially RANDOM across SSTables
\`\`\`

**Performance comparison**:
\`\`\`
Operation          B-Tree (PostgreSQL)   LSM-Tree (Cassandra)
──────────────────────────────────────────────────────────────
Point write        ~1ms (random I/O)     ~0.1ms (sequential append)
Batch write        ~5ms/batch            ~0.5ms/batch
Point read         ~0.5ms (tree traverse) ~1-5ms (multi-level check)
Range scan         Fast (sorted pages)    Moderate (merge SSTables)
Space usage        ~60-70% page fill      Compact after compaction
Write throughput   10K-50K writes/sec     50K-500K writes/sec
Read throughput    100K+ reads/sec        30K-100K reads/sec
\`\`\`

**When to choose A vs B**:
- **B-tree (PostgreSQL, MySQL)**: Choose for read-heavy workloads (>10:1 read:write), ad-hoc queries, range scans, and workloads where read latency consistency matters. B-trees have predictable read performance.
- **LSM-tree (Cassandra, RocksDB)**: Choose for write-heavy workloads (>1:10 read:write), time-series data, log/event ingestion, and workloads where write throughput is the bottleneck. Accept higher and less predictable read latency.
- **Hybrid (RocksDB in TiDB, CockroachDB)**: Some NewSQL databases use LSM-trees for storage but add caching layers to improve read performance. A middle ground for mixed workloads.

**Interview tip**: Understanding B-tree vs LSM-tree demonstrates deep database knowledge. The key insight is that the I/O pattern (random vs sequential) is what drives the performance difference. Sequential writes to disk are 100-1000x faster than random writes on spinning disk and 2-10x faster even on SSD. This is why LSM-trees dominate write-heavy workloads.`
      },
      {
        question: 'How does event sourcing optimize for write-heavy systems, and when should you use it vs traditional CRUD?',
        answer: `**Event sourcing** stores every state change as an immutable event rather than updating records in place. This naturally optimizes for writes (append-only) while enabling powerful read capabilities through projections.

**Traditional CRUD vs Event Sourcing**:
\`\`\`
CRUD (update in place):
  T=0: INSERT account(id=1, balance=100)
  T=1: UPDATE account SET balance=80   WHERE id=1  (withdrew 20)
  T=2: UPDATE account SET balance=130  WHERE id=1  (deposited 50)
  T=3: UPDATE account SET balance=100  WHERE id=1  (withdrew 30)

  Current state: balance=100
  History: LOST — we only know the final balance

Event Sourcing (append events):
  T=0: AccountCreated(id=1, initial_balance=100)
  T=1: MoneyWithdrawn(id=1, amount=20, reason="ATM")
  T=2: MoneyDeposited(id=1, amount=50, source="payroll")
  T=3: MoneyWithdrawn(id=1, amount=30, reason="transfer")

  Current state: replay events → balance=100
  History: COMPLETE — every transaction recorded
  Audit trail: built-in (who, what, when, why)
\`\`\`

**Event sourcing architecture**:
\`\`\`
Commands (writes):
  Command ──► Command Handler ──► Event Store (append-only)
                                      │
                                   Event published
                                      │
                           ┌──────────┼──────────┐
                           ▼          ▼          ▼
                      Projection   Projection   Notification
                      (read model) (analytics)  (email, webhook)

Event Store:
  ┌────────────────────────────────────────────────────┐
  │ stream_id │ version │ event_type      │ data       │
  │ acc-1     │ 1       │ AccountCreated  │ {bal:100}  │
  │ acc-1     │ 2       │ MoneyWithdrawn  │ {amt:20}   │
  │ acc-1     │ 3       │ MoneyDeposited  │ {amt:50}   │
  │ acc-1     │ 4       │ MoneyWithdrawn  │ {amt:30}   │
  └────────────────────────────────────────────────────┘
  Append-only! Never update or delete events.
\`\`\`

**Why event sourcing is write-optimized**:
\`\`\`
CRUD writes:
  - Read current row (random I/O)
  - Modify in place (random I/O)
  - Write back (random I/O)
  - Lock row during update (contention)

Event sourcing writes:
  - Append event to end of log (sequential I/O)
  - No read required for write
  - No locks (append-only, no conflicts)
  - Write throughput: limited only by disk sequential speed

Write throughput comparison:
  CRUD (PostgreSQL): ~10K-50K writes/sec
  Event store (Kafka): ~500K-2M events/sec
  Event store (EventStoreDB): ~100K-500K events/sec
\`\`\`

**When to choose A vs B**:
\`\`\`
Choose Event Sourcing when:
  ✓ Audit trail is a business requirement (finance, healthcare)
  ✓ Temporal queries needed ("what was the state at time T?")
  ✓ Write-heavy with complex state derivation
  ✓ Multiple read models needed from same events
  ✓ Event-driven architecture already in place
  Companies: banking (Goldman Sachs), e-commerce (order lifecycle),
             gaming (game state), IoT (device event streams)

Choose CRUD when:
  ✓ Simple domain with straightforward updates
  ✓ No audit requirement
  ✓ Team unfamiliar with event sourcing patterns
  ✓ Read-heavy workload (no need to optimize writes)
  ✓ Rapid prototyping / MVP stage
  Most web applications: CRUD is fine.

Choose HYBRID:
  ✓ Critical path uses event sourcing (payments, orders)
  ✓ Everything else uses CRUD (user profiles, settings)
  ✓ Most practical approach for real-world systems
\`\`\`

**Interview tip**: Event sourcing is an advanced topic that demonstrates deep architectural knowledge. The key insight is that event sourcing does not replace your database — it replaces how you write to it. You still need read models (projections) built from events, which are effectively CQRS. Recommend it specifically for write-heavy domains with audit requirements, not as a general-purpose pattern.`
      },
      {
        question: 'How do you design a time-series data system optimized for both high write ingestion and time-range queries?',
        answer: `**Time-series data** (metrics, IoT telemetry, financial ticks, logs) has a unique access pattern: extremely high write throughput with reads that are almost always time-bounded range queries. This combination requires specific optimizations.

**Time-series data characteristics**:
\`\`\`
Write pattern:
  - Append-only (events never update)
  - High velocity (millions of data points/sec)
  - Naturally ordered by time
  - Often bursty (sensor bursts, market open)

Read pattern:
  - Range queries: "last 1 hour", "between 2pm-3pm"
  - Aggregation: "average CPU per 5-minute bucket"
  - Recent data accessed most frequently
  - Old data accessed rarely (cold storage)

Access pattern:
  Write:Read ratio typically 100:1 to 1000:1
  99% of reads are for data < 24 hours old
  Old data needed for monthly/quarterly reports
\`\`\`

**Time-series optimized architecture**:
\`\`\`
  Sensors/Services (millions of data points/sec)
       │
       ▼
  ┌──────────────┐
  │ Kafka        │ ◄── Write buffer, absorb bursts
  │ (partitioned │     Retain 7 days for replay
  │  by source)  │
  └──────┬───────┘
         │
  ┌──────┴───────┐
  │ Stream       │ ◄── Pre-aggregate: 1-sec → 1-min → 5-min
  │ Processor    │     Reduce data volume by 60x
  └──────┬───────┘
         │
  ┌──────┴───────┐
  │ Time-Series  │ ◄── TimescaleDB, InfluxDB, or ClickHouse
  │ Database     │     Time-partitioned, columnar storage
  └──────┬───────┘
         │
         ├──► Hot tier: last 24h (SSD, in-memory)
         ├──► Warm tier: last 30 days (SSD)
         └──► Cold tier: > 30 days (S3/glacier)
\`\`\`

**Key optimization techniques**:
\`\`\`
1. Time-based partitioning:
   Table partitioned by time (hourly/daily chunks)
   Queries on "last 1 hour" only scan 1-2 partitions
   Old partitions easily moved to cold storage or dropped

2. Pre-aggregation (rollups):
   Raw: {cpu: 45.2, time: 2024-01-15T10:30:01.123}
   1-min rollup: {cpu_avg: 46.1, cpu_max: 52.3, count: 60}
   1-hour rollup: {cpu_avg: 44.8, cpu_max: 72.1, count: 3600}

   Dashboard showing "last 7 days" reads 1-hour rollups
   = 168 data points instead of 604,800 raw points

3. Columnar storage:
   Row-based: [time, cpu, mem, disk] stored together
   Columnar: [time, time, time...] [cpu, cpu, cpu...] stored separately

   Query "avg(cpu) WHERE time > X":
   Row-based: must read ALL columns (4x data)
   Columnar: reads only time + cpu columns (2x data)
   + columnar compresses similar values extremely well

4. Write batching:
   Individual inserts: 10K writes/sec
   Batched inserts (1000 per batch): 500K writes/sec
   50x improvement from batching alone
\`\`\`

**Database comparison for time-series**:
\`\`\`
Database          Write Speed    Query Speed    Best For
──────────────────────────────────────────────────────────────
InfluxDB          Very High      High           Metrics, IoT
TimescaleDB       High           Very High      Complex queries
                  (PostgreSQL                   (full SQL + time
                   extension)                    functions)
ClickHouse        Very High      Very High      Analytics, logs
                                                (columnar OLAP)
Cassandra         Very High      Moderate       High availability
                                                time-series
Prometheus        High           Moderate       Kubernetes metrics
                                                (pull model)
\`\`\`

**When to choose A vs B**:
- **TimescaleDB**: Choose when you need full SQL support, complex queries across time-series and relational data, and your team already knows PostgreSQL. Best for moderate write volumes with complex read patterns.
- **InfluxDB**: Choose for pure metrics/IoT workloads with InfluxQL or Flux query language. Purpose-built for time-series with automatic retention policies.
- **ClickHouse**: Choose for log analytics and high-volume time-series where you need fast analytical queries over billions of rows. Column-oriented for maximum query speed.
- **Kafka + Cassandra**: Choose for the highest write throughput with global distribution. Kafka buffers writes, Cassandra provides linear write scaling.

**Interview tip**: Time-series is one of the clearest write-heavy use cases in system design interviews. Always mention three optimizations: time-based partitioning, pre-aggregation rollups, and tiered storage (hot/warm/cold). The pre-aggregation technique — reducing 1-second raw data to 1-minute and 1-hour rollups — is the single most impactful optimization for time-series query performance.`
      },
      {
        question: 'How do you identify and resolve hot partitions (hot keys) in read-heavy and write-heavy systems?',
        answer: `**Hot partitions** occur when a disproportionate amount of traffic concentrates on a single partition/shard/key, overwhelming that node while others sit idle. This is the most common scaling failure in distributed databases.

**Hot partition scenarios**:
\`\`\`
Read hot spot:
  Celebrity profile viewed 10M times/day
  → Partition holding celebrity's data is overwhelmed
  → Other partitions have 10x spare capacity

Write hot spot:
  Time-partitioned data, all writes go to "current" partition
  → Latest partition absorbs ALL writes
  → Historical partitions receive zero writes

Counter hot spot:
  Global "total views" counter incremented on every request
  → Single key receives millions of writes/sec
  → Redis/DynamoDB throttles that specific key
\`\`\`

**Detection**:
\`\`\`
Symptoms:
  - p99 latency spikes on some requests but not others
  - Uneven CPU/memory across database nodes
  - Throttling errors from DynamoDB ("ProvisionedThroughputExceededException")
  - One Redis shard at 100% CPU, others at 20%

Monitoring:
  - Per-partition/shard metrics (QPS, latency, size)
  - Key access frequency distribution (Redis HOTKEYS)
  - DynamoDB CloudWatch: ConsumedReadCapacityUnits per partition
  - Cassandra: nodetool tablehistograms for partition size
\`\`\`

**Solutions for read hot spots**:
\`\`\`
Solution 1 — Caching:
  Hot key → cache in Redis/local cache
  90% of reads served from cache
  Remaining 10% spread across time (staggered TTL)

Solution 2 — Read replicas:
  Route reads for hot keys to dedicated replicas
  celebrity_profile → replica pool A (3 nodes)
  normal_profiles → replica pool B (3 nodes)

Solution 3 — Scatter reads (DynamoDB pattern):
  Instead of: celebrity:beyonce
  Use: celebrity:beyonce:shard_0, celebrity:beyonce:shard_1, ...
  Client randomly picks a shard to read from
  Each shard is on a different partition
  Write to all shards, read from random one
\`\`\`

**Solutions for write hot spots**:
\`\`\`
Solution 1 — Write sharding (distributed counter):
  Instead of: INCR total_views (single key)
  Use: INCR total_views:shard_{0-99} (100 keys)
  Read: SUM all 100 shards

  Write throughput: 100x improvement
  Read: slightly more complex (aggregate 100 keys)

Solution 2 — Time-based scatter:
  Instead of: partition_key = date (all today's writes → 1 partition)
  Use: partition_key = date + random_suffix
  Spreads writes across multiple partitions
  Range queries: must query all suffixes and merge

Solution 3 — Buffered writes:
  Hot key writes → local buffer → periodic bulk flush
  Buffer: aggregate 1000 increments → single INCRBY 1000
  Reduces write operations by 1000x

Solution 4 — Cell-based architecture:
  Assign hot entities to dedicated infrastructure
  Celebrity accounts get dedicated cache/DB resources
  Normal accounts share pooled resources
\`\`\`

**DynamoDB-specific hot key solutions**:
\`\`\`
DynamoDB's adaptive capacity (automatic):
  Detects hot partitions → borrows throughput from
  underutilized partitions → up to 300s burst
  Handles moderate hot spots automatically

DynamoDB write sharding (manual):
  PK: "views#celebrity_123#" + random(0-9)
  Creates 10 physical partitions for one logical key
  Read: query all 10 and sum
  Write: distribute evenly across 10

DAX (DynamoDB Accelerator):
  In-memory cache in front of DynamoDB
  Handles read hot spots with microsecond latency
  Write-through for consistency
\`\`\`

**When to choose A vs B**:
- **Caching (simplest)**: Default for read hot spots. Put a cache in front of the hot key with appropriate TTL. Solves 80% of hot spot problems.
- **Write sharding**: Choose for write hot spots where a single key receives disproportionate writes (counters, aggregations). Accept the read-time aggregation cost.
- **Dedicated infrastructure**: Choose for predictably hot entities (celebrity accounts, viral content) where you can pre-provision dedicated resources.
- **Redesign partition key**: Choose when the hot spot is caused by a poor partition key choice (e.g., partitioning by date for write-heavy data).

**Interview tip**: Hot partitions are one of the most practical distributed systems problems. The key insight is that distribution is only as good as your partition key. A poor partition key (low cardinality, skewed distribution) undermines all horizontal scaling. Always ask: "What is the cardinality and distribution of my partition key?" before designing the data model.`
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

    introduction: `**Replication topology** determines how data is copied across nodes in a distributed system. The three fundamental approaches — **single-leader** (primary-replica), **multi-leader**, and **leaderless** (peer-to-peer) — make different trade-offs between consistency, availability, write throughput, and operational complexity. CockroachDB uses Raft consensus (leader-based) per data range for serializable isolation, while Cassandra uses leaderless replication with tunable consistency for maximum write availability. The topology you choose fundamentally determines what guarantees your system can provide during failures.

**Single-leader** replication routes all writes through one primary node, which replicates to followers. This is the most common topology (PostgreSQL, MySQL, MongoDB) because it avoids write conflicts entirely — there is only one writer. **Multi-leader** replication allows writes at multiple nodes (typically one per datacenter), accepting the complexity of conflict resolution for the benefit of lower write latency in each region. **Leaderless** replication (DynamoDB, Cassandra, Riak) allows any node to accept writes, using quorum-based reads and writes for consistency.

The practical implications are significant: in a single-leader system, a leader failure requires promotion and causes a brief write outage. In a leaderless system, any node failure is transparent to writers but conflict resolution becomes the application's problem. CockroachDB demonstrates the middle ground — it uses Raft consensus per range (small leader-based groups) but elects leaders independently for each data range, so no single node is a bottleneck and leader failures only affect a subset of data. Google Spanner uses a similar approach with Paxos plus TrueTime for global consistency.

For system design interviews, understanding these topologies is essential because they directly impact your system's behavior during failures, cross-region latency, and write scalability. The choice should be driven by your geographic distribution requirements, consistency needs, and acceptable complexity level. Default to single-leader (covers 90% of systems) and justify leaderless or multi-leader only when specific requirements demand it.`,

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
      {
        question: 'How does CockroachDB achieve distributed SQL with strong consistency, and how does it compare to Cassandra?',
        answer: `**CockroachDB** and **Cassandra** represent opposite ends of the replication spectrum — CockroachDB uses leader-based Raft consensus per data range for strong consistency (CP), while Cassandra uses leaderless replication for maximum availability (AP).

**Architecture comparison**:
\`\`\`
CockroachDB (leader-based per range):
  Data split into ranges (~512MB each)
  Each range has 3 replicas
  One replica elected as leaseholder via Raft

  Range [A-F]: Leaseholder=Node1, Replicas=Node2,Node3
  Range [G-M]: Leaseholder=Node2, Replicas=Node1,Node3
  Range [N-Z]: Leaseholder=Node3, Replicas=Node1,Node2

  Write to Range [A-F]:
    Client ──► Node1 (leaseholder) ──► Raft consensus
              Node2 votes ✓, Node3 votes ✓ (majority)
              → Committed, return to client

Cassandra (leaderless):
  Data distributed via consistent hashing
  Each partition replicated to N nodes (typically 3)
  ANY node can accept reads or writes

  Partition "user:123": Node1, Node2, Node3
  Write "user:123":
    Client ──► Coordinator ──► Node1 ✓, Node2 ✓ (W=2 quorum)
                               Node3 (async)
              → Acknowledged after W nodes confirm
\`\`\`

**Detailed comparison**:
\`\`\`
Feature              CockroachDB            Cassandra
──────────────────────────────────────────────────────────────
Consistency          Serializable           Tunable (ONE to ALL)
SQL support          Full PostgreSQL wire   CQL (SQL-like, no joins)
Distributed txns     Yes (2PC + Raft)       No (lightweight txns only)
Write latency        Higher (consensus)     Lower (quorum, no consensus)
Write throughput     Moderate               Very high
Read latency         Low (leaseholder)      Low (any node)
Conflict handling    Prevented (serializable) LWW or app-level
Multi-region         Geo-partitioning       Multi-DC replication
Scaling              Add nodes (auto-rebal) Add nodes (auto-rebal)
Operational model    PostgreSQL-like        Unique (ring, gossip)
\`\`\`

**When to choose each — real-world decision criteria**:
\`\`\`
Choose CockroachDB when:
  ✓ Need ACID transactions across distributed data
  ✓ PostgreSQL compatibility important (migration from Postgres)
  ✓ Multi-region with consistent reads required
  ✓ Compliance requires serializable isolation (finance, healthcare)
  Companies: DoorDash (order management), Netflix (billing)

Choose Cassandra when:
  ✓ Write throughput is the primary requirement (100K+ writes/sec)
  ✓ Availability > consistency (always accept writes)
  ✓ Simple access patterns (key-based lookups, no complex joins)
  ✓ Time-series or event data (natural fit for wide-column model)
  Companies: Netflix (viewing history), Apple (iMessage), Uber (trip logs)

Choose PostgreSQL (single node) when:
  ✓ Data fits on one node (<10TB)
  ✓ Do not need multi-region writes
  ✓ Simplicity and operational ease are priorities
  → Most applications should start here
\`\`\`

**Interview tip**: CockroachDB vs Cassandra perfectly illustrates the CP vs AP trade-off in practice. CockroachDB gives you distributed SQL with strong consistency at the cost of higher write latency (Raft consensus per write). Cassandra gives you maximum write throughput and availability at the cost of eventual consistency and no cross-partition transactions. Frame your choice around: "Do I need distributed transactions or maximum write throughput?"`
      },
      {
        question: 'How do you design a multi-region database architecture for global applications?',
        answer: `**Multi-region database design** is one of the most complex distributed systems challenges. The fundamental tension is between write latency (users want fast writes) and consistency (data must be correct across regions).

**Three primary multi-region strategies**:
\`\`\`
Strategy 1 — Single primary, global read replicas:
  ┌──────────────────────────────────────────────┐
  │ US-East (primary)                             │
  │ ┌──────────┐                                  │
  │ │ Primary  │ ──► All writes go here           │
  │ └──────────┘                                  │
  └──────────────────────────────────────────────┘
       │ async replication
  ┌────┴───────────────────────────────────────┐
  │ EU-West (read replica)   Asia (read replica)│
  │ ┌──────────┐             ┌──────────┐       │
  │ │ Replica  │             │ Replica  │       │
  │ └──────────┘             └──────────┘       │
  └────────────────────────────────────────────┘
  Write latency: high for EU/Asia users (cross-ocean)
  Read latency: low everywhere (local replica)
  Consistency: strong for US, eventual for EU/Asia

Strategy 2 — Multi-primary with conflict resolution:
  US-East ◄──────► EU-West ◄──────► Asia
  ┌──────┐         ┌──────┐         ┌──────┐
  │Leader│         │Leader│         │Leader│
  └──────┘         └──────┘         └──────┘
  Each region accepts writes locally.
  Conflicts resolved async (LWW, CRDTs, or app-level)
  Write latency: low everywhere
  Consistency: eventual (conflict resolution needed)

Strategy 3 — Geo-partitioned (CockroachDB / Spanner):
  US data pinned to US nodes
  EU data pinned to EU nodes
  Asia data pinned to Asia nodes

  ┌─────────────────┐ ┌─────────────────┐
  │ US-East          │ │ EU-West          │
  │ US users' data   │ │ EU users' data   │
  │ (primary + replicas)│ (primary + replicas)│
  └─────────────────┘ └─────────────────┘

  Write latency: low (writes go to local region)
  Read latency: low (reads from local region)
  Consistency: strong (Raft consensus within region)
  Cross-region queries: slow (must cross regions)
\`\`\`

**Decision matrix**:
\`\`\`
Strategy          Write Latency  Consistency    Complexity   Use Case
──────────────────────────────────────────────────────────────────
Single primary    High (remote)  Strong         Low          Read-heavy global
Multi-primary     Low (local)    Eventual       High         Write-heavy global
Geo-partitioned   Low (local)    Strong (local) Medium       User-local data
Follow-the-sun    Varies         Strong         Medium       Time-zone aligned

Follow-the-sun: primary migrates to the active region
  - 8AM-8PM US: US is primary
  - 8AM-8PM EU: EU is primary
  - Works for region-specific business hours
\`\`\`

**GDPR and data residency implications**:
\`\`\`
GDPR requires EU user data stored in EU:
  Geo-partitioned: natural fit (EU data in EU region)
  Single primary: replicas in EU satisfy read locality,
    but writes still go to US → data crosses border
  Multi-primary: EU writes stay in EU, satisfies GDPR

Data residency requirements by region:
  EU (GDPR): data must reside in EU
  Russia: data must reside in Russia
  China: data must reside in China
  Australia: some data must reside locally
  → Geo-partitioning is often a compliance requirement
\`\`\`

**When to choose A vs B**:
- **Single primary + global replicas**: Choose when writes are infrequent from non-primary regions, read-heavy workload, and strong consistency is required. Simplest to operate.
- **Multi-primary**: Choose when all regions need low-latency writes and eventual consistency is acceptable. Requires conflict resolution strategy (complex).
- **Geo-partitioned (CockroachDB)**: Choose when data naturally partitions by region (user accounts, local content), GDPR compliance requires data residency, and you need both low latency and strong consistency within each region.
- **Stay single-region**: Choose when 90%+ of your users are in one region. Add CDN for read latency. Multi-region adds enormous complexity — do not adopt prematurely.

**Interview tip**: Multi-region design is an advanced topic where the right answer depends entirely on the consistency vs latency trade-off. Always ask: "Where are the users? Do they need cross-region reads of each other's data?" If users primarily read their own data, geo-partitioning is the best answer. If users need a global view (social media feed from worldwide friends), multi-primary or single-primary with caching is needed.`
      },
      {
        question: 'How does the Raft consensus algorithm work, and why is it preferred over Paxos for modern distributed systems?',
        answer: `**Raft** is a consensus algorithm that ensures a group of nodes agree on the same sequence of operations, even when some nodes fail. It was designed by Diego Ongaro and John Ousterhout as an understandable alternative to Paxos, which is notoriously difficult to implement correctly.

**Raft's core mechanism**:
\`\`\`
Three roles:
  Leader:    receives all client requests, replicates to followers
  Follower:  passively receives log entries from leader
  Candidate: temporarily during leader election

Normal operation:
  Client ──► Leader ──► append to local log
                   ──► replicate to Follower A
                   ──► replicate to Follower B
                   Majority (2/3) acknowledge
                   ──► commit entry
                   ──► respond to client

Leader election (when leader fails):
  Follower notices no heartbeat (timeout 150-300ms)
    → becomes Candidate
    → increments term number
    → votes for self
    → requests votes from others
    → gets majority → becomes Leader
    → sends heartbeats to establish authority
\`\`\`

**Why Raft over Paxos**:
\`\`\`
Paxos problems:
  - Described in stages (single-decree, multi-decree, ...)
  - Gap between description and implementation is huge
  - Many production implementations have bugs
  - No standard approach for leader election
  - Multi-Paxos is an extension, not clearly specified

Raft advantages:
  - Single, complete algorithm (election + replication + safety)
  - Clear leader concept (all decisions flow through leader)
  - Log-structured (ordered sequence of entries)
  - Understandable (designed for education AND production)
  - Many correct implementations (etcd, CockroachDB, TiDB)

Comparison:
  Criteria              Paxos              Raft
  ──────────────────────────────────────────────────
  Understandability     Very hard          Moderate
  Implementation        Error-prone        Straightforward
  Leader election       Not specified      Built-in
  Log compaction        Not specified      Built-in (snapshots)
  Theoretical optimality Better (fewer msgs) Slightly more messages
  Production use        ZooKeeper, Spanner etcd, CockroachDB, TiDB
  Membership changes    Complex            Joint consensus
\`\`\`

**Raft in production systems**:
\`\`\`
System              How Raft Is Used
──────────────────────────────────────────────────────────────
etcd                Entire database is one Raft group
                    (Kubernetes control plane relies on this)
CockroachDB         One Raft group per data range (~512MB)
                    Thousands of Raft groups per cluster
TiDB/TiKV           One Raft group per data region
                    Multi-Raft for scalability
Consul              Service discovery, leader election
HashiCorp Vault     Secret storage, HA coordination
Redis Sentinel      Leader election for Redis clusters
                    (Raft-like protocol)
\`\`\`

**Key safety properties**:
\`\`\`
1. Election safety: at most one leader per term
   (each node votes once per term, majority required)

2. Leader append-only: leader never overwrites/deletes entries
   (only appends new entries to its log)

3. Log matching: if two logs have same entry at same index,
   all preceding entries are identical
   (consistency of prefix)

4. Leader completeness: if an entry is committed in a term,
   it will be present in all future leaders' logs
   (no committed data is lost during elections)

5. State machine safety: if a server has applied an entry
   at a given index, no other server will apply a different
   entry at that index
   (all nodes converge to same state)
\`\`\`

**When to choose A vs B**:
- **Raft-based system (etcd, CockroachDB)**: Choose when you need strong consistency, are building consensus-dependent infrastructure, or need a proven consensus implementation. Most modern distributed databases use Raft.
- **Paxos-based system (ZooKeeper, Spanner)**: Choose when using established systems that already use Paxos (ZooKeeper) or when you need the theoretical optimality of flexible Paxos variants.
- **No consensus (Cassandra/DynamoDB)**: Choose when availability matters more than consistency and you prefer quorum-based approaches with tunable consistency levels.
- **Application-level**: If you need leader election or distributed coordination, use etcd or ZooKeeper rather than implementing Raft yourself. Getting consensus right is extremely difficult.

**Interview tip**: Understanding Raft demonstrates deep distributed systems knowledge. The most important insight is that Raft reduces the problem to leader election + log replication, making it composable with other systems. When discussing CockroachDB or etcd, mention that they use Raft for consensus to show you understand the underlying mechanism. But also note that Raft requires a majority of nodes to be available — in a 3-node cluster, losing 2 nodes means the system cannot accept writes.`
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

    introduction: `A **Content Delivery Network** (CDN) is a globally distributed network of edge servers that cache and serve content close to end users. By reducing the physical distance between the user and the server, CDNs dramatically reduce latency — a user in Tokyo accessing a US-based origin server might see 200ms latency, but only 20ms from a Tokyo edge PoP. Cloudflare operates 300+ PoPs globally, CloudFront has 600+ edge locations, and Fastly has 90+ PoPs with sub-millisecond purge capability. For any globally-distributed application, CDN is not optional — it is foundational infrastructure.

While CDNs were originally designed for static assets (images, CSS, JavaScript), modern CDNs like **Cloudflare**, **AWS CloudFront**, and **Fastly** can cache API responses, execute serverless functions at the edge, and handle dynamic content with short TTLs. Cloudflare Workers processes 10% of all Cloudflare requests with compute at the edge, Fastly's Compute platform runs WebAssembly at the edge, and CloudFront Functions handles lightweight request/response manipulation. This blurs the line between CDN and edge computing platform — the edge is becoming a general-purpose compute layer.

The cost equation is compelling: CDN bandwidth typically costs $0.01-0.08/GB compared to cloud egress at $0.05-0.09/GB, and with a 70%+ cache hit rate, you reduce both latency AND cost simultaneously. But CDN is not free — you pay for the CDN tier, potentially pay for purge/invalidation API calls, and must design your cache invalidation strategy carefully to avoid serving stale content.

The core trade-off is **freshness vs performance**. A CDN serves cached content instantly but may serve stale data. Direct serving always returns fresh data but adds latency and origin load. In system design interviews, the key is understanding **cache invalidation strategies**, the **stale-while-revalidate** pattern, and knowing when CDN caching is safe (static assets, read-heavy public content) vs when it is dangerous (personalized data, rapidly changing content, authenticated responses). The strongest candidates can articulate the full request path from client through edge PoP, shield PoP, and origin.`,

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
      {
        question: 'How do you design a CDN strategy for a global e-commerce platform with both static and dynamic content?',
        answer: `**E-commerce CDN design** is one of the most practical CDN scenarios because it combines static assets, semi-dynamic catalog pages, personalized recommendations, and transactional endpoints that must never be cached.

**Content classification and CDN strategy per type**:
\`\`\`
Content Type          CDN Strategy                Cache-Control Header
──────────────────────────────────────────────────────────────────────
Product images        CDN, long TTL               public, max-age=31536000, immutable
                      Cache-busting filenames      (1 year, versioned URLs)

CSS/JS bundles        CDN, long TTL               public, max-age=31536000, immutable
                      Hash in filename             (Vite/webpack handles this)

Product listing page  CDN, short TTL + SWR        public, max-age=10,
                      (price may change)           stale-while-revalidate=60

Search results        CDN, very short TTL          public, max-age=5,
                      (dynamic but cacheable)      stale-while-revalidate=30

Cart/checkout         NO CDN                       private, no-store
                      (personalized, transactional)

API: product details  CDN, short TTL               public, max-age=30,
                      (common product, cacheable)   stale-while-revalidate=120

API: user profile     NO CDN                       private, no-cache
                      (personalized)

API: inventory check  CDN, very short TTL          public, max-age=2,
                      (approximate count OK)        stale-while-revalidate=10

Payment webhook       NO CDN (pass-through)        Not applicable
\`\`\`

**Architecture**:
\`\`\`
  User (Tokyo)
       │
       ▼
  Cloudflare Edge (Tokyo PoP)
  ┌──────────────────────────────────────────┐
  │ Worker: route by content type            │
  │   /static/* → serve from CDN cache       │
  │   /api/products/* → CDN with short TTL   │
  │   /api/cart/* → pass to origin           │
  │   /api/checkout/* → pass to origin       │
  │                                          │
  │ DDoS protection, WAF, bot detection      │
  └──────────────────────────────────────────┘
       │ (cache miss or pass-through)
       ▼
  Origin Shield (US-West PoP)
  ┌──────────────────────────────────────────┐
  │ Second cache layer                        │
  │ Consolidates misses from all edge PoPs   │
  │ Reduces origin load by 80%+              │
  └──────────────────────────────────────────┘
       │ (cache miss)
       ▼
  Origin Server (US-West region)
  ┌──────────────────────────────────────────┐
  │ Application + Redis + PostgreSQL          │
  └──────────────────────────────────────────┘
\`\`\`

**Handling flash sales / Black Friday**:
\`\`\`
Normal day: 10K req/sec, CDN handles 70%
Black Friday: 500K req/sec peak

Preparation:
  1. Pre-warm CDN: crawl all product pages, populating edge caches
  2. Increase TTLs: product pages from 10s to 60s (accept slight staleness)
  3. Enable edge-level inventory check (approximate, cached 2s)
  4. Rate limit per-user at edge (prevent bots buying all stock)
  5. Queue system for checkout (decouple browsing from purchasing)

During spike:
  CDN absorbs 95% of traffic (cached product pages + images)
  Origin handles 5% (cart, checkout, inventory writes)
  Origin auto-scales from 10 to 100 instances
  CDN cost increase: moderate (bandwidth-based)
  Origin cost increase: significant (compute)
\`\`\`

**When to choose A vs B**:
- **CDN everything cacheable**: Default. Static assets with long TTL + cache-busting, API responses with short TTL + stale-while-revalidate. Covers 70-90% of requests.
- **Direct serving for personalized/transactional**: Cart, checkout, user-specific recommendations. Never cache these at CDN (risk serving wrong user's data).
- **Edge compute for hybrid**: Use Cloudflare Workers or Lambda@Edge to combine cached product data with user-specific elements (inject user name into cached page template) — reduces origin calls without risking personalization errors.

**Interview tip**: E-commerce CDN design is a common interview topic. The key insight is content classification — different content types get different caching strategies. Never say "put everything behind a CDN" — always distinguish between cacheable (products, images) and non-cacheable (cart, checkout, personalized) content. Mention flash sale preparation to show operational awareness.`
      },
      {
        question: 'How do you compare CDN providers (Cloudflare vs CloudFront vs Fastly) for different use cases?',
        answer: `**CDN selection** depends on your specific requirements: global reach, purge speed, edge compute capabilities, cost model, and integration with your cloud provider.

**Provider comparison**:
\`\`\`
Feature              Cloudflare        CloudFront         Fastly
──────────────────────────────────────────────────────────────
PoPs                 300+              600+               90+
Purge speed          <1 second         Up to 15 minutes*  ~150ms (instant)
Edge compute         Workers (V8)      Functions (JS)     Compute (Wasm)
                     + Lambda@Edge     (limited)
Pricing model        Flat rate + usage Bandwidth + req    Bandwidth + req
Free tier            Generous          12 months free     None (paid only)
DDoS protection      Built-in (all)    AWS Shield (extra) Basic included
DNS                  Built-in          Route53 (extra)    Limited
WAF                  Built-in          AWS WAF (extra)    Built-in
Analytics            Built-in          CloudWatch         Real-time logs
Best integration     Any provider      AWS ecosystem      Varnish/VCL experts

* CloudFront purge: individual files ~seconds,
  wildcard purge up to 15 minutes.
  CloudFront Functions: ~1ms, but very limited (2MB, no network)
  Lambda@Edge: 5-100ms cold start, more powerful
\`\`\`

**When to choose each**:
\`\`\`
Choose Cloudflare when:
  ✓ Want all-in-one (CDN + DNS + DDoS + WAF + edge compute)
  ✓ Need free tier or flat-rate pricing
  ✓ Want fastest global purge (<1 second)
  ✓ Building edge-first applications (Workers + KV + D1)
  ✓ Not locked into AWS ecosystem
  Companies: Discord, Shopify, Canva

Choose CloudFront when:
  ✓ Already in AWS ecosystem (S3, ALB, API Gateway)
  ✓ Need largest PoP footprint (600+ locations)
  ✓ Want native AWS service integration
  ✓ Using Lambda@Edge for complex edge logic
  ✓ Need AWS Shield Advanced for DDoS
  Companies: Netflix, Airbnb, Slack

Choose Fastly when:
  ✓ Need instant purge (<150ms) for real-time content
  ✓ Want VCL (Varnish Configuration Language) control
  ✓ Need Compute@Edge with Wasm for performance
  ✓ Content freshness is critical (news, stock data)
  ✓ Need real-time streaming logs
  Companies: The New York Times, GitHub, Stripe
\`\`\`

**Cost comparison (rough, for 10TB/month bandwidth)**:
\`\`\`
Provider          Monthly Cost      Notes
──────────────────────────────────────────────────────
Cloudflare Pro    $20/month + usage Generous free tier,
                  (bandwidth free!) no bandwidth charges
Cloudflare Biz    $200/month        WAF, custom rules
CloudFront        ~$850/month       $0.085/GB (US/EU)
                                    Volume discounts available
Fastly            ~$750/month       $0.08/GB (US),
                                    minimum $50/month
Bunny CDN         ~$100/month       $0.01/GB, budget option
KeyCDN            ~$40/month        $0.04/GB, pay-as-you-go

Note: Cloudflare does not charge for CDN bandwidth
on paid plans, making it dramatically cheaper at scale.
\`\`\`

**When to choose A vs B — decision framework**:
- **Cloudflare (default recommendation)**: Best overall value for most applications. Free tier is generous, paid plans include bandwidth, and Workers ecosystem is the most mature edge compute platform. Choose unless you have a specific reason not to.
- **CloudFront**: Choose when deeply integrated with AWS (S3 origins, ALB, API Gateway) and AWS-native tooling matters more than CDN cost optimization.
- **Fastly**: Choose when instant purge and real-time content freshness are business-critical requirements (news, financial data, live sports scores). Premium service for premium needs.
- **Multi-CDN**: Some large companies use multiple CDNs for redundancy and optimal routing. Services like Cedexis/Citrix Intelligent Traffic Management route users to the fastest CDN.

**Interview tip**: CDN provider selection is a practical infrastructure question. The strongest answer acknowledges that the choice depends on existing ecosystem (AWS → CloudFront), budget constraints (startup → Cloudflare free tier), and specific requirements (instant purge → Fastly). Mention that Cloudflare does not charge for CDN bandwidth — this is a significant differentiator at scale that many candidates miss.`
      },
      {
        question: 'How do you measure CDN effectiveness and optimize cache hit rates?',
        answer: `**CDN effectiveness** is measured primarily by cache hit rate — the percentage of requests served from cache without reaching the origin. A low hit rate means you are paying for CDN infrastructure without getting the latency and origin-offload benefits.

**Key metrics**:
\`\`\`
Metric                  Target          What It Tells You
──────────────────────────────────────────────────────────────
Cache hit rate          >85% (static)   % of requests served from edge
                        >50% (API)      without origin round-trip
Origin offload          >70%            % reduction in origin requests
TTFB (Time to First     <100ms (edge)   How fast users get first byte
  Byte)                 <500ms (miss)
Cache fill rate         <30%            % of cache capacity in use
Bandwidth savings       >60%            Egress cost reduction
Purge latency           <5 seconds      How fast invalidation propagates
\`\`\`

**Diagnosing low cache hit rate**:
\`\`\`
Problem 1 — Vary header is too broad:
  Response: Vary: Accept-Encoding, Cookie, User-Agent
  → Every unique cookie = separate cache entry
  → Hit rate approaches 0% for logged-in users

  Fix: Only Vary on Accept-Encoding (standard)
  Move personalization to client-side JavaScript

Problem 2 — Query string variations:
  /products?sort=price&page=1&utm_source=google
  /products?sort=price&page=1&utm_source=facebook
  → CDN treats as different URLs → duplicate cache entries

  Fix: Strip marketing query params at edge
  Cache key = /products?sort=price&page=1 (ignore utm_*)

Problem 3 — TTL too short:
  Cache-Control: max-age=1
  → Content refreshed every second → barely cached

  Fix: Increase TTL + use stale-while-revalidate
  Cache-Control: max-age=10, stale-while-revalidate=60

Problem 4 — No caching headers:
  Response missing Cache-Control header entirely
  → CDN may not cache, or uses default (very short TTL)

  Fix: Explicitly set Cache-Control on all responses
  Static: public, max-age=31536000, immutable
  API: public, max-age=30, stale-while-revalidate=120

Problem 5 — Set-Cookie prevents caching:
  Response includes: Set-Cookie: session=abc123
  → CDN correctly refuses to cache (would share sessions!)

  Fix: Only set cookies on auth endpoints
  Remove Set-Cookie from cacheable responses
\`\`\`

**Optimization techniques**:
\`\`\`
Technique 1 — Cache key normalization:
  Before: cache key = full URL + all headers
  After:  cache key = path + relevant query params only

  Cloudflare: Cache Rules → "Cache Key" customization
  CloudFront: Cache Policy → whitelist query params

Technique 2 — Edge-side includes (ESI):
  Page has static frame + personalized widget
  Cache the frame at CDN
  Fill personalized widget at edge or via AJAX

  <esi:include src="/api/user/recommendations" />
  CDN caches everything except the ESI include

Technique 3 — Tiered caching:
  L1: Edge PoP (close to user, small cache)
  L2: Regional shield (larger cache, fewer misses to origin)

  Without shield: 300 edge PoPs × cache miss = 300 origin requests
  With shield: 300 edges → 5 shields × cache miss = 5 origin requests

Technique 4 — Prefetching:
  When user views product listing page:
    → Edge prefetches top 5 product detail pages in background
    → When user clicks product → instant cache hit
\`\`\`

**Monitoring dashboard essentials**:
\`\`\`
Real-time:
  - Cache hit rate (overall and per content type)
  - Origin request rate (should decrease with CDN)
  - p50/p95/p99 TTFB (edge vs origin)
  - Bandwidth by origin vs edge

Alerting:
  - Cache hit rate drops below 70% → investigate
  - Origin request rate spikes → likely cache invalidation storm
  - TTFB p99 > 2 seconds → origin performance issue
  - 5xx from origin > 1% → origin health problem

Historical:
  - Hit rate trend over time (should improve with tuning)
  - Cost per GB served (CDN vs origin)
  - Geographic distribution of cache misses
\`\`\`

**When to choose A vs B**:
- **Focus on cache key optimization first**: Fixing Vary headers and query string handling often improves hit rate by 20-40% with zero code changes.
- **Add origin shield**: If you have global users and origin load is high. Reduces origin requests by 80%+ at minimal cost.
- **Implement stale-while-revalidate**: For API responses where slight staleness is acceptable. Users never wait for origin — always get instant (possibly slightly stale) response.
- **Move to edge compute**: When you need to combine cached content with light personalization without hitting origin.

**Interview tip**: CDN optimization is a practical operational topic that shows real-world experience. The key insight is that most CDN performance issues are caused by poor caching headers and overly broad Vary headers, not by CDN infrastructure limitations. Always mention cache hit rate as the primary metric and walk through the common causes of low hit rates.`
      },
      {
        question: 'How do you handle CDN for authenticated and partially-personalized content?',
        answer: `**Authenticated content** is the biggest CDN challenge because naive caching can leak user data (serving User A's page to User B) while no caching wastes CDN benefits for authenticated users who view public content.

**The spectrum of personalization**:
\`\`\`
Level 0 — Fully public (easy to cache):
  Product page, blog post, landing page
  → Cache at CDN, long TTL

Level 1 — User-aware but same content:
  Login status indicator ("Welcome, Alice" in header)
  → Cache the page body, personalize header client-side

Level 2 — Partially personalized:
  Product page with personalized recommendations sidebar
  → Cache the shared parts, fetch personalized parts via AJAX

Level 3 — Fully personalized:
  Dashboard, account settings, inbox
  → Cannot cache at CDN (unique per user)
\`\`\`

**Strategy 1 — Client-side personalization (most common)**:
\`\`\`
Server returns: generic HTML page (cached at CDN)
Client JS:     fetches /api/me → injects user-specific elements

  CDN serves: <html>...<div id="user-nav">Loading...</div>...</html>
  Client JS:  fetch('/api/me') → { name: "Alice", avatar: "..." }
              document.getElementById('user-nav').innerHTML = ...

  Benefits:
  - Page body is fully cacheable (same for all users)
  - Personalization happens after page load
  - CDN serves 95% of the page weight (HTML, CSS, JS, images)
  - Only /api/me bypasses CDN (tiny response, fast)

  Trade-off: slight flash of unpersonalized content (FOUC)
  Mitigation: skeleton loader while fetching user data
\`\`\`

**Strategy 2 — Edge personalization (Cloudflare Workers)**:
\`\`\`
Edge Worker reads auth cookie/JWT
  → Validates token at edge (no origin round-trip)
  → Fetches cached page template
  → Injects personalized elements
  → Returns fully personalized page

  Client ──► Edge Worker ──► Validate JWT (local, <1ms)
                         ──► Get cached template (local, <1ms)
                         ──► Get user data from KV store (<10ms)
                         ──► Stitch together → return

  Benefits:
  - Fully personalized response in <20ms
  - No flash of unpersonalized content
  - Origin only needed for user data updates

  Trade-off: edge KV store must be kept in sync with origin
  Complexity: higher than client-side approach
\`\`\`

**Strategy 3 — Segment-based caching**:
\`\`\`
Instead of per-user cache (hit rate ≈ 0%), cache per segment:

  Segments:
    - Free users (see ads)
    - Pro users (no ads)
    - Enterprise users (custom branding)
    - Country: US, EU, JP (localized pricing)

  Cache key: path + segment
    /products?segment=free_US  → one cached version
    /products?segment=pro_EU   → different cached version

  Total combinations: 3 tiers × 50 countries = 150 variants
  vs per-user: 1M users = 1M variants (uncacheable)

  Implementation:
    Edge Worker reads JWT → extracts tier + country
    → Sets cache key segment header
    → CDN caches per segment (manageable number of variants)
\`\`\`

**Strategy 4 — Cache with Vary on specific header**:
\`\`\`
For APIs where response varies by a small set of values:

  Request: GET /api/pricing
  Headers: X-User-Country: US, X-User-Tier: pro

  Response: Vary: X-User-Country, X-User-Tier
  Cache-Control: public, max-age=300

  CDN creates separate cache entries:
    /api/pricing + country=US + tier=pro
    /api/pricing + country=US + tier=free
    /api/pricing + country=EU + tier=pro

  Works when: small number of Vary combinations
  Fails when: Vary on user_id (unique per user, no caching)
\`\`\`

**What should NEVER be cached at CDN**:
\`\`\`
  ✗ Pages with Set-Cookie in response (session injection risk)
  ✗ Pages with user-specific data in HTML (data leak risk)
  ✗ API responses with sensitive PII (email, address, payment)
  ✗ Authentication endpoints (token exchange)
  ✗ Write endpoints (POST, PUT, DELETE)

  Always set: Cache-Control: private, no-store
  for these endpoints. Do not rely on CDN "smart" defaults.
\`\`\`

**When to choose A vs B**:
- **Client-side personalization (default)**: Simplest approach, works with any CDN, no edge compute needed. Cache the page, personalize in browser. Choose for most web applications.
- **Edge personalization (Workers)**: Choose when FOUC is unacceptable (e-commerce product pages, landing pages for A/B tests), and you have the infrastructure maturity for edge compute.
- **Segment-based caching**: Choose when you have a small number of user segments with meaningfully different content. Great for tier-based pricing pages, localized content.
- **No CDN caching**: Choose for fully personalized dashboards, account settings, and sensitive data. These should always hit the origin.

**Interview tip**: Authenticated CDN caching is an advanced topic that demonstrates production experience. The key insight is that "authenticated" does not mean "uncacheable" — it means you must be more thoughtful about what to cache and how. Client-side personalization is the simplest correct answer. Edge personalization is the advanced answer. Never suggest caching authenticated responses without explaining how you prevent data leaks between users.`
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
