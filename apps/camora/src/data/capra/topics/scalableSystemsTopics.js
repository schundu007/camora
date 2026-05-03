// Scalable systems topics — caching, networking, data, and operations patterns for senior engineers

export const scalableSystemsCategories = [
  { id: 'caching', name: 'Caching Strategies', icon: 'database', color: '#f59e0b' },
  { id: 'networking', name: 'Networking & Load Balancing', icon: 'globe', color: '#3b82f6' },
  { id: 'data', name: 'Data & Storage', icon: 'hardDrive', color: '#8b5cf6' },
  { id: 'operations', name: 'Operations & Reliability', icon: 'shield', color: '#10b981' },
];

export const scalableSystemsCategoryMap = {
  'negative-caching': 'caching',
  'cache-stampede': 'caching',
  'soft-vs-hard-ttl': 'caching',
  'sticky-sessions': 'networking',
  'gslb-geodns-anycast': 'networking',
  'pagination-strategies': 'networking',
  'idempotency': 'data',
  'sql-isolation-levels-deep-dive': 'data',
  'wal-durability': 'data',
  'mvcc': 'data',
  'delivery-semantics': 'data',
  'sli-slo-sla': 'operations',
  'rpo-rto': 'operations',
  'uuid-ulid-snowflake': 'operations',
  'active-active-vs-active-passive': 'operations',
};

export const scalableSystemsTopics = [
  // ─────────────────────────────────────────────────────────
  // 1. Negative Caching (caching)
  // ─────────────────────────────────────────────────────────
  {
    id: 'negative-caching',
    title: 'Negative Caching',
    icon: 'shieldOff',
    color: '#f59e0b',
    questions: 6,
    description: 'Caching 404 and empty results to prevent cache penetration attacks and reduce backend load from repeated misses.',
    concepts: [
      'Cache penetration vs cache miss',
      'Negative result caching with short TTLs',
      'Bloom filters as a cache gate',
      'Empty-value sentinel entries',
      'Hot-key protection for non-existent keys',
      'Rate limiting on cache misses',
      'Layered cache defense strategies',
    ],
    tips: [
      'Negative caching stores "this key does not exist" so the backend is not hammered by repeated lookups for invalid keys',
      'Use short TTLs (30-60s) for negative entries so newly created resources become discoverable quickly',
      'Bloom filters are a space-efficient alternative — they answer "definitely not in the set" with zero false negatives',
      'In interviews, distinguish cache penetration (querying keys that never exist) from cache stampede (many requests for an expired key)',
      'Consider combining negative caching with rate limiting — attackers may enumerate random keys to bypass the cache',
      'Real-world example: DNS resolvers cache NXDOMAIN responses (RFC 2308) with a negative TTL',
    ],

    introduction: `**Negative caching** is the practice of storing "miss" results — such as HTTP 404 responses, empty database query results, or null lookups — in the cache so that subsequent requests for the same non-existent resource are served from cache rather than hitting the origin. Without negative caching, an attacker (or a misconfigured client) can overwhelm your backend by repeatedly requesting keys that do not exist, since every request bypasses the cache and goes straight to the database.

This problem is called **cache penetration**: the cache provides zero protection because the requested key was never cached in the first place. It is distinct from a cache stampede (many requests for a recently expired key) and from cache avalanche (many keys expiring simultaneously). Negative caching directly addresses penetration by ensuring that even "nothing found" is a cached result.

The implementation is straightforward: when the backend returns a 404 or empty result, store a **sentinel value** (e.g., \`{status: "NOT_FOUND"}\`) in the cache with a short TTL (typically 30-120 seconds). On the next request, the cache returns the sentinel, and the backend is never contacted. For a more memory-efficient approach, a **Bloom filter** in front of the cache can reject lookups for keys that were never inserted, using only a few bits per key.`,

    keyQuestions: [
      {
        question: 'What is cache penetration and how does negative caching solve it?',
        answer: `**Cache penetration** occurs when requests target keys that never exist in the cache or database, causing every request to bypass the cache and hit the backend directly.

\`\`\`
Normal cache flow (cache hit):
  Client ──► Cache ──► HIT ──► Return cached value

Cache penetration (key never exists):
  Client ──► Cache ──► MISS ──► Database ──► NOT FOUND
  Client ──► Cache ──► MISS ──► Database ──► NOT FOUND
  Client ──► Cache ──► MISS ──► Database ──► NOT FOUND
  (every request hits DB — cache provides zero protection)

With negative caching:
  Request 1: Cache MISS ──► DB ──► NOT FOUND
             Cache stores: key → {NOT_FOUND, TTL=60s}
  Request 2: Cache HIT ──► Return NOT_FOUND from cache
  Request 3: Cache HIT ──► Return NOT_FOUND from cache
  (backend protected for the next 60 seconds)
\`\`\`

**Implementation choices**:

| Strategy | Pros | Cons |
|----------|------|------|
| Sentinel value | Simple, works with any cache | Consumes cache memory for fake entries |
| Bloom filter gate | Space-efficient (bits per key) | Cannot delete keys, false positives |
| Request coalescing | Deduplicates in-flight misses | Only helps concurrent requests |
| Rate limit on misses | Caps backend load directly | Legitimate misses also throttled |

**Best practice**: Combine sentinel caching (short TTL) with a Bloom filter for large key spaces. The Bloom filter rejects obviously invalid keys without even checking the cache.`
      },
      {
        question: 'How do Bloom filters prevent cache penetration at scale?',
        answer: `**Bloom filter** is a probabilistic data structure that answers "is this element in the set?" with:
- **Definitely not in the set** (100% accurate for negatives)
- **Probably in the set** (small false positive rate)

\`\`\`
Architecture with Bloom filter gate:

  Client Request (key=X)
        │
        ▼
  ┌─────────────┐
  │ Bloom Filter │──── "Definitely not" ──► Return 404 immediately
  │ (in-memory)  │                          (no cache or DB lookup)
  └──────┬──────┘
         │ "Possibly exists"
         ▼
  ┌─────────────┐
  │   Cache     │──── HIT ──► Return value
  └──────┬──────┘
         │ MISS
         ▼
  ┌─────────────┐
  │  Database   │──► Found: cache + return
  └─────────────┘──► Not found: negative cache + return 404
\`\`\`

**Bloom filter internals**:
\`\`\`
  Insert key "user:42":
    hash1("user:42") = 3  → set bit 3
    hash2("user:42") = 7  → set bit 7
    hash3("user:42") = 12 → set bit 12

  Bit array: [0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0]

  Check key "user:99":
    hash1 = 5, hash2 = 7, hash3 = 9
    bit 5 = 0 → DEFINITELY NOT IN SET → reject immediately
\`\`\`

**Sizing**: For 100M keys with 1% false positive rate, a Bloom filter needs ~114 MB (about 9.6 bits per element). This fits comfortably in memory and eliminates 99% of penetration attacks.

**Limitation**: Standard Bloom filters do not support deletion. Use a **Counting Bloom filter** or **Cuckoo filter** if you need to remove keys when resources are created.`
      },
      {
        question: 'How would you design a layered defense against cache penetration for a user profile service?',
        answer: `**Scenario**: A user profile API where attackers enumerate random user IDs (most do not exist).

\`\`\`
Layered defense architecture:

  Client ──► Rate Limiter ──► Bloom Filter ──► Cache ──► DB
               │                  │               │        │
               │ >100 misses/s    │ Not in set    │ HIT    │
               ▼                  ▼               ▼        ▼
            429 Reject      404 Fast-path    Return    Query
                                              value    result
                                                         │
                                              ┌──────────┤
                                              │ Found    │ Not Found
                                              ▼          ▼
                                         Cache with   Negative cache
                                         TTL=300s     TTL=60s
\`\`\`

**Layer 1 — Input validation**:
- Reject obviously invalid IDs at the API gateway (wrong format, negative numbers)
- This is free and eliminates a class of random probes

**Layer 2 — Rate limiting on misses**:
- Track per-IP or per-token miss rate
- If a client exceeds 100 misses/minute, return 429 Too Many Requests
- Legitimate users rarely hit non-existent profiles repeatedly

**Layer 3 — Bloom filter**:
- Populated on startup from the user ID column (or incrementally on inserts)
- Rejects lookups for IDs that were never created
- Memory: 50M users x 10 bits = 60 MB

**Layer 4 — Negative cache with short TTL**:
- For the small fraction of false positives from the Bloom filter
- Store \`{status: "NOT_FOUND", cached_at: timestamp}\` with TTL=60s
- When a new user registers, invalidate the negative cache entry

**Monitoring**: Track the miss-to-hit ratio. A healthy cache has <5% miss rate. If it spikes to >50%, a penetration attack may be underway.`
      },
      {
        question: 'What is the difference between cache penetration, cache stampede, and cache avalanche?',
        answer: `Three distinct failure modes that require different mitigations:

\`\`\`
Cache Penetration:
  Requests for keys that NEVER exist
  ┌────────┐    MISS    ┌────────┐    NOT FOUND    ┌────┐
  │ Client ├───────────►│ Cache  ├────────────────►│ DB │
  └────────┘  (always)  └────────┘    (always)     └────┘
  Fix: Negative caching, Bloom filters

Cache Stampede:
  Many requests for ONE key that just expired
          expired!
  ┌────────┐ ──►┌────────┐ ──► ┌────┐
  │Client 1│    │        │     │    │
  │Client 2│    │ Cache  │     │ DB │  All N clients hit DB
  │Client 3│    │(empty) │     │    │  simultaneously
  │  ...   │    │        │     │    │
  │Client N│ ──►└────────┘ ──► └────┘
  Fix: Distributed locks, probabilistic early expiry

Cache Avalanche:
  Many keys expire at the SAME time
  t=0:    [K1:TTL=3600] [K2:TTL=3600] [K3:TTL=3600]
  t=3600: [K1:expired]  [K2:expired]  [K3:expired]
          ALL cache misses at once → DB overloaded
  Fix: Jittered TTLs, staggered expiration
\`\`\`

| Aspect | Penetration | Stampede | Avalanche |
|--------|-------------|----------|-----------|
| Root cause | Key never exists | Popular key expires | Many keys expire together |
| Scale | Many different keys | One hot key | Many keys simultaneously |
| DB impact | Steady high load | Spike on one query | Massive spike on many queries |
| Primary fix | Negative cache / Bloom | Distributed lock / early refresh | TTL jitter / warming |
| Secondary fix | Rate limiting | Probabilistic early expiry | Layered cache (L1/L2) |

**Interview tip**: Interviewers love asking you to distinguish these three. Draw the diagrams above and explain the fix for each.`
      },
    ],

    dataModel: {
      description: 'Negative cache entry structure and decision flow',
      schema: `Negative Cache Entry:
  ┌─────────────┬──────────────┬─────────┬───────────┐
  │    Key      │    Value     │   TTL   │ Created   │
  │ "user:999"  │ NOT_FOUND    │  60s    │ timestamp │
  └─────────────┴──────────────┴─────────┴───────────┘

Bloom Filter Configuration:
  expected_items:      100,000,000
  false_positive_rate: 0.01 (1%)
  bits_per_item:       9.6
  hash_functions:      7
  total_memory:        ~114 MB

Cache Lookup Decision Tree:
  1. Validate input format → reject malformed keys
  2. Check Bloom filter → reject if definitely absent
  3. Check cache → return if HIT (positive or negative)
  4. Query database
  5a. Found → cache with standard TTL (300s)
  5b. Not found → negative cache with short TTL (60s)
  6. Return result to client`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. Cache Stampede (caching)
  // ─────────────────────────────────────────────────────────
  {
    id: 'cache-stampede',
    title: 'Cache Stampede',
    icon: 'zap',
    color: '#f59e0b',
    questions: 7,
    description: 'Preventing thundering herd problems when a popular cache key expires and many concurrent requests overwhelm the backend simultaneously.',
    concepts: [
      'Thundering herd problem',
      'Distributed locking (SETNX / Redlock)',
      'Probabilistic early expiration (XFetch)',
      'Request coalescing / single-flight',
      'Lease-based cache refresh',
      'Background refresh with stale-while-revalidate',
      'Hot key detection and prewarming',
    ],
    tips: [
      'A cache stampede happens when a hot key expires and hundreds of threads simultaneously try to recompute and refill the cache',
      'The simplest fix is a distributed lock — only one thread recomputes, others wait or get a stale value',
      'Probabilistic early expiration (XFetch) recomputes before TTL expires, avoiding the miss entirely',
      'Request coalescing (Go\'s singleflight, nginx proxy_cache_lock) deduplicates in-flight recomputation',
      'In interviews, mention that stampedes are most dangerous for keys that are both popular and expensive to recompute',
      'Stale-while-revalidate serves the expired value while one thread refreshes in the background — great for availability',
    ],

    introduction: `A **cache stampede** (also called thundering herd or dog-pile effect) occurs when a frequently accessed cache key expires and a large number of concurrent requests simultaneously experience a cache miss. Each of those requests independently queries the backend and attempts to recompute the cached value. If the recomputation is expensive (e.g., a complex database query or an API call taking several seconds), the backend can be overwhelmed — leading to cascading failures, increased latency, and potentially a complete outage.

The danger is proportional to the product of **request rate** and **recomputation time**. A key serving 10,000 requests per second that takes 2 seconds to recompute will generate 20,000 simultaneous backend requests in the worst case. Even a well-provisioned database cannot handle that kind of sudden spike without protection.

There are several complementary strategies to prevent stampedes: **distributed locking** (only one thread recomputes, others wait), **probabilistic early expiration** (recompute before the TTL actually expires), **request coalescing** (deduplicate in-flight requests), and **stale-while-revalidate** (serve the old value while refreshing in the background). The best production systems combine multiple strategies for defense in depth.`,

    keyQuestions: [
      {
        question: 'How does distributed locking prevent a cache stampede?',
        answer: `**Pattern**: When a cache miss occurs, the first thread acquires a lock (e.g., Redis SETNX) before recomputing. Other threads that encounter the miss either wait for the lock to release or return a stale value.

\`\`\`
Without locking (stampede):
  Thread 1 ──► Cache MISS ──► DB query ──► Update cache
  Thread 2 ──► Cache MISS ──► DB query ──► Update cache
  Thread 3 ──► Cache MISS ──► DB query ──► Update cache
  ...
  Thread N ──► Cache MISS ──► DB query ──► Update cache
  (N concurrent DB queries for the same data!)

With distributed locking:
  Thread 1 ──► Cache MISS ──► SETNX lock ──► ACQUIRED
              │                                  │
              │                              DB query
              │                                  │
  Thread 2 ──► Cache MISS ──► SETNX lock ──► BLOCKED
  Thread 3 ──► Cache MISS ──► SETNX lock ──► BLOCKED
              │                                  │
              │                          Thread 1 writes cache
              │                          Thread 1 releases lock
              ▼                                  │
  Thread 2 ──► Retry ──► Cache HIT ──► Return   │
  Thread 3 ──► Retry ──► Cache HIT ──► Return   ▼
  (only 1 DB query!)
\`\`\`

**Redis implementation**:
\`\`\`
  SETNX cache:lock:user:42 "owner-uuid" EX 10
  -- If acquired: recompute, SET value, DEL lock
  -- If not acquired: SLEEP 50ms, retry GET cache:user:42
\`\`\`

**Edge cases to handle**:
- **Lock holder crashes**: Set a TTL on the lock (EX 10) so it auto-expires
- **Lock holder is slow**: Use a lease extension (watchdog thread renews lock)
- **Waiting threads timeout**: Return stale data or a degraded response rather than hanging

**Trade-off**: Locking serializes recomputation, which adds latency for waiting threads. For most use cases, serving a slightly stale value while one thread refreshes is preferable to blocking.`
      },
      {
        question: 'How does probabilistic early expiration (XFetch) work?',
        answer: `**XFetch algorithm**: Each cache read probabilistically decides whether to recompute BEFORE the TTL actually expires. The closer to expiration, the higher the probability of triggering a refresh.

\`\`\`
Traditional TTL expiry (causes stampede):
  |────────── cached ──────────|EXPIRED|── stampede ──|
  t=0                        t=TTL    (many threads hit DB)

Probabilistic early expiry (XFetch):
  |────────── cached ──────────|──────|
  t=0                    t≈TTL-delta  (one thread refreshes early)
                              ▲
                    Random thread triggers
                    refresh before expiry
\`\`\`

**Algorithm (on every cache read)**:
\`\`\`
  function xfetch_get(key):
    value, expiry, delta = cache.get_with_metadata(key)
    if value is null:
      return recompute_and_cache(key)

    remaining = expiry - now()
    # Probability of early refresh increases as remaining → 0
    if remaining - delta * beta * ln(random()) <= 0:
      async recompute_and_cache(key)

    return value   # Always return current value immediately
\`\`\`

**Parameters**:
- **delta**: Time the last recomputation took (stored alongside the value)
- **beta**: Tuning constant (typically 1.0). Higher = more aggressive early refresh
- **ln(random())**: Negative value that grows larger as random() → 0

**Why it works**:
- When remaining time is large, probability of early refresh is near zero
- As TTL approaches, the probability ramps up exponentially
- With high traffic, one of the many readers will trigger the refresh 10-30s before actual expiry
- The key never actually expires — stampede is avoided entirely

**Advantage over locking**: No coordination overhead, no blocked threads, no stale data. The refresh happens transparently in the background.`
      },
      {
        question: 'What is request coalescing and how does it differ from locking?',
        answer: `**Request coalescing** (also called single-flight or request deduplication) groups concurrent requests for the same key into a single backend call. All waiting callers receive the same result.

\`\`\`
Without coalescing:
  T1 ──► cache miss ──► DB query ──────────────────► result
  T2 ──► cache miss ──► DB query ──────────────────► result
  T3 ──► cache miss ──► DB query ──────────────────► result
  (3 identical DB queries)

With coalescing (singleflight):
  T1 ──► cache miss ──► DB query ──────────────────► result ──► T1
  T2 ──► cache miss ──► wait... ────────────────────────────► T2
  T3 ──► cache miss ──► wait... ────────────────────────────► T3
  (1 DB query, result shared with all waiters)
\`\`\`

**Coalescing vs Locking**:

| Aspect | Coalescing | Distributed Lock |
|--------|-----------|------------------|
| Scope | Single process (in-memory) | Cross-process (Redis/ZK) |
| Coordination | In-process map of in-flight keys | External lock service |
| Latency | Near-zero overhead | Network round-trip to lock server |
| Failure mode | Process crash loses waiters | Lock holder crash → TTL expiry |
| Implementation | Go singleflight, Java CompletableFuture | Redis SETNX, Redlock |
| Best for | Single-server or per-pod dedup | Multi-pod coordination |

**Go singleflight example**:
\`\`\`
  var g singleflight.Group

  func getUser(id string) (*User, error) {
    val, err, shared := g.Do("user:"+id, func() (any, error) {
      return db.QueryUser(id)  // Only one goroutine executes this
    })
    // shared=true means result was shared with other callers
    return val.(*User), err
  }
\`\`\`

**Combining both**: Use in-process coalescing as the first layer (free, zero network overhead) and distributed locking as the second layer for cross-pod coordination. This way, each pod sends at most one request, and across N pods, at most one actually hits the database.`
      },
      {
        question: 'Design a stampede-proof caching layer for a high-traffic product page.',
        answer: `**Scenario**: E-commerce product page serving 50K requests/second. Product data is fetched from a microservice taking ~500ms.

\`\`\`
Multi-layer stampede protection:

  ┌────────────────────────────────────────────────┐
  │                  Client Request                 │
  └────────────────────┬───────────────────────────┘
                       ▼
  ┌────────────────────────────────────────────────┐
  │ Layer 1: CDN / Edge Cache (Cloudflare, etc.)   │
  │ TTL=30s, stale-while-revalidate=300s           │
  └────────────────────┬───────────────────────────┘
                       ▼ (CDN miss)
  ┌────────────────────────────────────────────────┐
  │ Layer 2: Application In-Process Cache           │
  │ Caffeine/Guava, TTL=10s, singleflight          │
  └────────────────────┬───────────────────────────┘
                       ▼ (L1 miss, coalesced)
  ┌────────────────────────────────────────────────┐
  │ Layer 3: Redis with XFetch + Distributed Lock   │
  │ TTL=300s, early refresh probability             │
  │ Lock: SETNX product:lock:{id} EX 5             │
  └────────────────────┬───────────────────────────┘
                       ▼ (lock acquired)
  ┌────────────────────────────────────────────────┐
  │ Layer 4: Product Microservice (origin)          │
  │ 500ms latency, limited to 1000 RPS              │
  └────────────────────────────────────────────────┘
\`\`\`

**Flow for a hot key expiry**:
1. CDN serves stale while revalidating (users see no latency impact)
2. CDN revalidation reaches the app server
3. App-level singleflight coalesces all concurrent misses on this pod into one
4. Redis XFetch was likely already triggered by a prior read (key refreshed before expiry)
5. If Redis is also expired, distributed lock ensures only one pod recomputes
6. Lock winner fetches from origin, writes to Redis, releases lock
7. Other pods retry and find the fresh value in Redis

**Monitoring and alerting**:
- Cache hit ratio (target >99% for hot keys)
- Lock contention rate (>10% indicates TTLs are too short)
- Origin RPS (should stay flat even during cache transitions)
- P99 latency spike detection (stampede symptom)`
      },
    ],

    dataModel: {
      description: 'Cache entry with stampede protection metadata',
      schema: `Enhanced Cache Entry (for XFetch):
  ┌──────────┬──────────┬────────┬───────────┬──────────────┐
  │   Key    │  Value   │  TTL   │  Delta    │  Created_at  │
  │          │ (data)   │ (sec)  │ (recomp   │  (timestamp) │
  │          │          │        │  time ms) │              │
  └──────────┴──────────┴────────┴───────────┴──────────────┘

Distributed Lock Entry:
  Key:     cache:lock:{resource_key}
  Value:   {owner_id, acquired_at}
  TTL:     5-10 seconds (auto-release)

Singleflight In-Memory Map:
  key → {
    result:   pending Promise / CompletableFuture
    waiters:  [channel1, channel2, ...]
    started:  timestamp
  }

Protection Strategy Selection:
  If single-server:  singleflight only
  If multi-server:   singleflight + distributed lock
  If CDN-fronted:    stale-while-revalidate + singleflight + lock
  If extreme traffic: all above + XFetch probabilistic refresh`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. Soft vs Hard TTL (caching)
  // ─────────────────────────────────────────────────────────
  {
    id: 'soft-vs-hard-ttl',
    title: 'Soft vs Hard TTL',
    icon: 'clock',
    color: '#f59e0b',
    questions: 6,
    description: 'Cache expiry strategies using soft TTL for background refresh and hard TTL for absolute staleness limits.',
    concepts: [
      'Hard TTL (absolute expiration)',
      'Soft TTL (preferred refresh window)',
      'Stale-while-revalidate pattern',
      'TTL jittering to prevent avalanche',
      'Event-driven invalidation vs TTL',
      'Cache warming and pre-population',
      'Tiered TTLs for different data freshness needs',
    ],
    tips: [
      'Soft TTL means "try to refresh after this time" but keep serving the stale value; hard TTL means "delete and force a miss"',
      'HTTP Cache-Control stale-while-revalidate is the HTTP standard implementation of soft TTL',
      'Always add jitter to TTLs: TTL = base_ttl + random(0, jitter_range) to prevent cache avalanche',
      'Event-driven invalidation (publish on write) is more precise than TTL but adds infrastructure complexity',
      'For interviews, explain the trade-off: longer TTLs reduce backend load but increase staleness window',
      'Different data types need different TTLs: user session (minutes), product catalog (hours), static config (days)',
    ],

    introduction: `Cache expiration is one of the two hard problems in computer science (the other being naming things and off-by-one errors). The fundamental tension is between **freshness** (serving up-to-date data) and **performance** (avoiding backend calls). A **hard TTL** is the traditional approach: after a fixed duration, the cached entry is evicted and the next request triggers a cache miss. This is simple but creates problems — the moment of expiry is a vulnerability window where a stampede can occur, and the data goes from "definitely fresh" to "definitely missing" with no intermediate state.

A **soft TTL** introduces a more nuanced lifecycle: after the soft TTL expires, the cached data is considered "stale but usable." The system continues serving the stale value to incoming requests while triggering a background refresh. The data is only truly removed when the **hard TTL** expires. This pattern — known as **stale-while-revalidate** in HTTP caching — provides the best of both worlds: low latency for users (they always get a cached response) and eventual freshness (the background refresh updates the cache within seconds).

In production systems, combining soft and hard TTLs with **jittered expiration** (adding randomness to TTLs so keys do not expire simultaneously) and **event-driven invalidation** (publishing cache invalidation events when data changes) provides a robust, multi-layered expiration strategy that balances freshness, performance, and resilience.`,

    keyQuestions: [
      {
        question: 'What is the difference between soft TTL and hard TTL?',
        answer: `**Hard TTL**: Entry is deleted after this time. Next request is a cache miss.
**Soft TTL**: Entry is marked stale after this time. Next request triggers a background refresh but still returns the stale value.

\`\`\`
Timeline for a cache entry:

  |◄──── FRESH ────►|◄── STALE BUT USABLE ──►|◄── EVICTED ──►|
  t=0             soft_ttl                  hard_ttl
  (cached)        (start refreshing)        (must recompute)

Example: soft_ttl=60s, hard_ttl=300s
  t=0:    Entry cached. All reads are cache hits.
  t=60:   Soft TTL expires. First read triggers async refresh.
          All reads still return the (stale) cached value.
  t=62:   Background refresh completes. Entry updated.
          New soft_ttl starts (t=62+60=122).
  t=300:  Hard TTL expires. Entry deleted.
          Next read is a true cache miss.
\`\`\`

**Why both are needed**:
- Soft TTL alone is dangerous — if the background refresh keeps failing, you serve indefinitely stale data
- Hard TTL alone causes stampedes and latency spikes at expiry time
- Together, soft TTL ensures smooth refreshes while hard TTL bounds maximum staleness

**HTTP equivalent (Cache-Control header)**:
\`\`\`
  Cache-Control: max-age=60, stale-while-revalidate=240
                 └─ soft TTL ─┘  └─ additional grace period ─┘
                 hard TTL = 60 + 240 = 300s total
\`\`\`

**Implementation in Redis**:
Store two timestamps alongside the value — a soft_expiry and let Redis handle the hard TTL:
\`\`\`
  SET key value EX 300   # Hard TTL: Redis evicts at 300s
  HSET meta:key soft_expiry (now + 60)  # Soft TTL: app checks this
\`\`\``
      },
      {
        question: 'How does stale-while-revalidate work in practice?',
        answer: `**Stale-while-revalidate** (SWR) is the HTTP-standard implementation of soft TTL, widely used by CDNs (Cloudflare, Fastly, CloudFront) and client-side libraries (SWR, React Query).

\`\`\`
Request flow with SWR:

  Client 1 (t=0, fresh):
    ──► CDN ──► HIT (fresh) ──► Return immediately
    Latency: ~5ms

  Client 2 (t=70, stale within revalidate window):
    ──► CDN ──► HIT (stale) ──► Return immediately ──► ~5ms
                    │
                    └──► Background: CDN fetches from origin
                         Origin responds ──► CDN updates cache
                         (client 2 does NOT wait for this)

  Client 3 (t=72, after background refresh):
    ──► CDN ──► HIT (fresh, just refreshed) ──► Return immediately
    Latency: ~5ms

  Client 4 (t=400, past hard TTL):
    ──► CDN ──► MISS ──► Fetch from origin ──► Return
    Latency: ~200ms (must wait for origin)
\`\`\`

**Key insight**: With SWR, no user ever sees cache-miss latency during the revalidation window. The "cost" of refreshing is paid asynchronously.

**Server-side implementation pattern**:
\`\`\`
  function get_with_swr(key):
    entry = cache.get(key)

    if entry is null:
      # Hard miss — must block and recompute
      return recompute_and_cache(key)

    if entry.soft_expiry < now():
      # Stale — serve stale, refresh in background
      async_refresh(key)   # Non-blocking

    return entry.value     # Always fast
\`\`\`

**Production tips**:
- Log revalidation failures separately — they are invisible to users but indicate origin issues
- Set a minimum revalidation interval (e.g., 5s) to prevent a flood of background refreshes
- Use a lock or singleflight for the background refresh to avoid multiple concurrent revalidations`
      },
      {
        question: 'Why is TTL jittering important and how do you implement it?',
        answer: `**Problem**: If many cache entries share the same TTL and were cached at the same time, they all expire simultaneously — causing a **cache avalanche**.

\`\`\`
Without jitter (cache avalanche):
  t=0:     Cache 1000 product entries, all with TTL=3600s
  t=3600:  ALL 1000 entries expire simultaneously
           → 1000 concurrent DB queries
           → Database overloaded
           → Cascading failure

With jitter:
  t=0:     Cache 1000 product entries
           TTL = 3600 + random(-300, +300)  # Range: 3300-3900s
  t=3300:  ~First entries start expiring (trickle)
  t=3600:  ~Middle entries expire
  t=3900:  ~Last entries expire
           → Spread over 600 seconds = ~1.7 queries/second
           → Database handles it easily
\`\`\`

**Implementation patterns**:

\`\`\`
Pattern 1: Additive jitter
  ttl = base_ttl + random(0, base_ttl * 0.1)
  # Example: 3600 + random(0, 360) = 3600-3960s

Pattern 2: Multiplicative jitter
  ttl = base_ttl * (1 + random(-0.1, 0.1))
  # Example: 3600 * random(0.9, 1.1) = 3240-3960s

Pattern 3: Slab-based jitter (for bulk inserts)
  for i, item in enumerate(items):
    ttl = base_ttl + (i % slab_count) * slab_interval
  # Deterministic spread across time slots
\`\`\`

**Guidelines**:
| Data type | Base TTL | Jitter range | Rationale |
|-----------|----------|--------------|-----------|
| User session | 1800s | +/- 180s (10%) | Moderate traffic, low risk |
| Product catalog | 3600s | +/- 600s (17%) | High traffic, bulk caching |
| Config/feature flags | 86400s | +/- 3600s (4%) | Low churn, large jitter unnecessary |
| API rate limit counters | 60s | 0 (no jitter) | Must be precise |

**Rule of thumb**: 10-20% jitter is sufficient for most workloads. The goal is to spread expirations over a window longer than the recomputation time multiplied by the number of keys.`
      },
      {
        question: 'When should you use event-driven invalidation vs TTL-based expiration?',
        answer: `**Two fundamental approaches to cache freshness**:

\`\`\`
TTL-based expiration:
  Writer ──► DB update ──► (nothing happens to cache)
  Reader ──► Cache ──► stale for up to TTL seconds
  Freshness guarantee: eventually consistent within TTL

Event-driven invalidation:
  Writer ──► DB update ──► Publish invalidation event
                                    │
                           ┌────────┴────────┐
                           ▼                 ▼
                      Cache node 1      Cache node 2
                      DEL key           DEL key
  Reader ──► Cache ──► MISS ──► DB (fresh data)
  Freshness guarantee: near-real-time (seconds)
\`\`\`

| Criteria | TTL-based | Event-driven |
|----------|-----------|-------------|
| Freshness | Bounded by TTL | Near real-time |
| Complexity | Simple (set TTL, forget) | Requires pub/sub infra |
| Failure mode | Serves stale data | Lost event = stale forever |
| Infrastructure | Cache only | Cache + message bus (Kafka, Redis Pub/Sub) |
| Best for | Read-heavy, tolerates staleness | Financial data, inventory, auth |

**Hybrid approach (recommended for production)**:
\`\`\`
  Writer ──► DB ──► Publish event ──► Invalidate cache
                                      (primary mechanism)

  Cache entry also has TTL = 1 hour
  (safety net if event is lost or delayed)

  This gives you:
  - Normal case: near-real-time freshness (event)
  - Failure case: max 1 hour staleness (TTL backup)
\`\`\`

**When to choose each**:
- **TTL only**: Blog posts, product descriptions, weather data, news feeds — staleness measured in minutes is acceptable
- **Event-driven**: Shopping cart inventory ("3 left in stock"), user permissions, payment status, feature flags
- **Hybrid**: Most production systems — events for speed, TTL as a safety net

**Event delivery reliability**:
- Redis Pub/Sub: at-most-once (fire and forget) — use with TTL backup
- Kafka / SQS: at-least-once — may invalidate twice (harmless) but never misses
- Change Data Capture (Debezium): captures DB WAL changes and publishes as events — guaranteed not to miss any write`
      },
    ],

    dataModel: {
      description: 'Dual-TTL cache entry structure',
      schema: `Cache Entry with Soft/Hard TTL:
  ┌───────────┬──────────┬───────────┬───────────┬───────────┐
  │    Key    │  Value   │ Soft TTL  │ Hard TTL  │ Version   │
  │           │ (data)   │ (refresh) │ (evict)   │ (etag)    │
  └───────────┴──────────┴───────────┴───────────┴───────────┘

TTL Strategy Matrix:
  Data Type          │ Soft TTL │ Hard TTL │ Jitter │ Invalidation
  ───────────────────┼──────────┼──────────┼────────┼─────────────
  User profile       │   60s    │  3600s   │  10%   │ Event on update
  Product catalog    │  300s    │  7200s   │  15%   │ Batch hourly
  Session token      │    -     │  1800s   │   5%   │ Event on logout
  Feature flags      │   30s    │   300s   │   0%   │ Event on deploy
  Static assets      │    -     │ 86400s   │  10%   │ Version hash

HTTP Cache-Control Mapping:
  max-age=60, stale-while-revalidate=240
  ├── max-age=60          → soft TTL (serve fresh for 60s)
  ├── stale-while-revalidate=240 → grace period (serve stale for 240s more)
  └── total lifetime = 300s → hard TTL`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 4. Sticky Sessions (networking)
  // ─────────────────────────────────────────────────────────
  {
    id: 'sticky-sessions',
    title: 'Sticky Sessions',
    icon: 'link',
    color: '#3b82f6',
    questions: 6,
    description: 'Session affinity routing that binds a client to a specific backend server, with trade-offs for scaling and fault tolerance.',
    concepts: [
      'Session affinity vs stateless design',
      'Cookie-based sticky routing',
      'IP hash-based routing',
      'Consistent hashing for session affinity',
      'Session replication vs externalized state',
      'Graceful draining during deploys',
      'Health check interaction with sticky sessions',
    ],
    tips: [
      'Sticky sessions bind a user to a specific server so in-memory session state is preserved across requests',
      'The modern best practice is to externalize session state (Redis/Memcached) and avoid sticky sessions entirely',
      'If you must use sticky sessions, prefer cookie-based (JSESSIONID, AWSALB) over IP-hash — IP can change with mobile/VPN',
      'Sticky sessions create uneven load distribution — "hot" users accumulate on fewer servers',
      'During deployments, sticky sessions require graceful drain: stop sending new sessions, wait for existing ones to finish',
      'In interviews, argue for stateless architecture first, then explain when sticky sessions are a pragmatic compromise',
    ],

    introduction: `**Sticky sessions** (also called session affinity) is a load balancing strategy where all requests from a particular client are routed to the same backend server for the duration of a session. This is typically implemented by the load balancer setting a cookie (e.g., AWS ALB's AWSALB cookie) or by hashing the client's IP address to select a consistent backend. The primary motivation is to support applications that store session state in memory on the server — such as shopping carts, authentication tokens, or WebSocket connections — where routing to a different server would lose that state.

While sticky sessions solve the immediate problem of in-memory state, they introduce significant operational trade-offs. **Uneven load distribution** is the most common issue: if one user generates 100x more traffic than average, the server they are pinned to becomes a bottleneck while other servers sit idle. **Fault tolerance** is another concern: if the pinned server crashes, the user's session is lost and they must re-authenticate or lose their shopping cart.

The modern architectural preference is **stateless servers with externalized session storage** (Redis, Memcached, or a database). This allows any server to handle any request, enabling true horizontal scaling, seamless rolling deployments, and automatic failover. However, sticky sessions remain a pragmatic choice in legacy systems, WebSocket-heavy applications, and scenarios where the cost of externalizing state outweighs the operational overhead of affinity routing.`,

    keyQuestions: [
      {
        question: 'What are the different mechanisms for implementing sticky sessions?',
        answer: `**Three common mechanisms**, each with distinct trade-offs:

\`\`\`
1. Cookie-based affinity (most common):

  Client ──► Load Balancer ──► Server A (first request)
       ◄── Set-Cookie: SERVERID=A ──┘
  Client ──► Load Balancer ──► Server A (cookie: SERVERID=A)
       (LB reads cookie, routes to A)

2. IP hash-based affinity:

  Client (IP: 10.0.1.42) ──► Load Balancer
       hash(10.0.1.42) % N = 2 ──► Server C (index 2)
  (same IP always maps to same server)

3. Header/URL-based affinity:

  Client ──► /api/user/42 ──► Load Balancer
       hash("user:42") ──► Server B
  (deterministic routing based on request content)
\`\`\`

| Mechanism | Pros | Cons |
|-----------|------|------|
| Cookie-based | Works with NAT/proxies, user-level granularity | Requires cookie support, initial request is random |
| IP hash | No cookie needed, works for any protocol | NAT breaks it (many users share IP), mobile IP changes |
| Consistent hash | Even distribution, minimal disruption on scale | More complex, still has uneven load risk |

**AWS ALB implementation**:
- ALB generates a \`AWSALB\` cookie with an encrypted target group reference
- Duration-based: cookie expires after configured TTL (1s to 7 days)
- Application-based: app sets its own cookie, ALB respects it

**Key detail for interviews**: Cookie-based affinity fails for the very first request (no cookie yet). The LB must use a fallback strategy (round-robin) for the initial request and set the affinity cookie in the response.`
      },
      {
        question: 'What are the operational problems with sticky sessions?',
        answer: `**Five key operational problems**:

\`\`\`
Problem 1: Uneven load distribution
  Server A: ████████████████ 80% CPU  (heavy user stuck here)
  Server B: ████ 20% CPU
  Server C: ██████ 30% CPU
  (autoscaler sees 43% avg → does not scale up,
   but Server A is struggling)

Problem 2: Deployment complexity
  Rolling deploy of Server B:
  ┌──────────┐
  │ Server A │ ← Users A, D still routed here
  │ Server B │ ← DRAINING: users B, E must finish
  │Server B' │ ← New version: no sticky users yet
  │ Server C │ ← Users C, F still routed here
  └──────────┘
  Must wait for B's sessions to drain before killing it

Problem 3: Failover = session loss
  Server A crashes → Users A, D lose their sessions
  ┌──────────┐
  │ Server A │ ✗ DEAD — sessions for users A, D are gone
  │ Server B │ ← Users B, E (unaffected)
  │ Server C │ ← Users C, F (unaffected)
  └──────────┘
  Users A, D re-routed to B or C but must re-login

Problem 4: Autoscaling inefficiency
  Scale-up:  New server gets NO sticky users → underutilized
  Scale-down: Cannot remove server with active sessions → slow drain

Problem 5: Capacity planning
  Cannot reason about per-server capacity independently
  One "whale" user can saturate a server regardless of fleet size
\`\`\`

**Mitigation strategies** (if sticky sessions are unavoidable):
1. **Session replication**: Replicate session state across 2-3 servers (Tomcat clustering). Failover is seamless but replication adds latency and complexity.
2. **Graceful drain timeout**: During deploys, stop assigning new sessions and wait up to N seconds for existing sessions to complete.
3. **Monitoring**: Alert on per-server imbalance (max_load / avg_load > 2x). Consider rehashing if imbalance persists.`
      },
      {
        question: 'How does externalizing session state eliminate the need for sticky sessions?',
        answer: `**Architecture comparison**:

\`\`\`
Sticky sessions (in-memory state):
  Client ──► LB ──► Server A (session in RAM)
             │      Server B (different sessions)
             │      Server C (different sessions)
  (client MUST go to A)

Externalized state (stateless servers):
  Client ──► LB ──► Server A ──►┐
             │      Server B ──►├──► Redis (all sessions)
             │      Server C ──►┘
  (client can go to ANY server)
\`\`\`

**Implementation**:
\`\`\`
  # Express.js with Redis sessions
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1800000 }  // 30 min
  }));

  # Client sends session cookie → any server loads from Redis
\`\`\`

**Benefits of externalized state**:
| Aspect | Sticky | Externalized |
|--------|--------|-------------|
| Horizontal scaling | Limited (uneven load) | True (any server, any request) |
| Failover | Session lost | Seamless (state in Redis) |
| Deployment | Drain required | Instant (kill and replace) |
| Load distribution | Uneven | Perfectly even (round-robin) |
| Latency | Fast (local RAM) | +1-2ms (Redis network hop) |

**When sticky sessions are still appropriate**:
1. **WebSockets**: Connection is inherently server-specific; externalized state does not help with an open TCP connection
2. **In-memory compute state**: ML model loaded per-server, large working set that cannot be serialized to Redis efficiently
3. **Legacy migration**: Gradual path — add sticky sessions first, externalize state later
4. **Cost sensitivity**: Redis cluster adds infrastructure cost; sticky sessions are "free" at the LB`
      },
      {
        question: 'How do you handle sticky sessions during a rolling deployment?',
        answer: `**Challenge**: During a rolling deploy, you must replace server instances without disrupting users whose sessions are pinned to them.

\`\`\`
Rolling deploy with graceful drain:

  Phase 1: Mark Server A for drain
  ┌───────────┐
  │ Server A  │ ← DRAINING (no new sessions, existing continue)
  │ Server B  │ ← ACTIVE
  │ Server C  │ ← ACTIVE
  └───────────┘
  LB config: Server A weight=0 for new sessions

  Phase 2: Wait for drain (timeout: 30-300s)
  ┌───────────┐
  │ Server A  │ ← Active sessions: 42 → 15 → 3 → 0
  │ Server B  │ ← ACTIVE (absorbing new traffic)
  │ Server C  │ ← ACTIVE
  └───────────┘

  Phase 3: Replace Server A
  ┌───────────┐
  │ Server A' │ ← NEW VERSION (health check passes → ACTIVE)
  │ Server B  │ ← ACTIVE
  │ Server C  │ ← ACTIVE
  └───────────┘

  Phase 4: Repeat for Server B, then Server C
\`\`\`

**AWS ALB deregistration**:
\`\`\`
  aws elbv2 deregister-targets \\
    --target-group-arn arn:aws:... \\
    --targets Id=i-server-a

  # ALB enters "draining" state:
  # - New connections go to other targets
  # - Existing connections continue for deregistration_delay (default 300s)
  # - After delay, connections are forcibly closed
\`\`\`

**Kubernetes with sticky sessions**:
\`\`\`
  apiVersion: v1
  kind: Service
  metadata:
    name: my-app
  spec:
    sessionAffinity: ClientIP
    sessionAffinityConfig:
      clientIP:
        timeoutSeconds: 1800
\`\`\`
- During rolling update, Kubernetes respects \`maxUnavailable\` and \`maxSurge\`
- Pods in Terminating state: no new sessions, existing connections drain for \`terminationGracePeriodSeconds\`

**Best practice**: Set drain timeout to slightly longer than your average session duration. If sessions are long-lived (hours), consider forcing a session migration by invalidating the affinity cookie and redirecting to a new server with the session loaded from external store.`
      },
    ],

    dataModel: {
      description: 'Session affinity configuration and routing logic',
      schema: `Load Balancer Affinity Configuration:
  method:           cookie | ip_hash | consistent_hash | header
  cookie_name:      "SERVERID" | "AWSALB" | "JSESSIONID"
  cookie_ttl:       1800s (30 minutes)
  drain_timeout:    300s (5 minutes)
  health_interval:  10s
  unhealthy_thresh: 3 consecutive failures

Routing Decision Flow:
  1. Extract affinity key (cookie value / IP / header)
  2. Lookup target server from affinity table
  3. If target is healthy → route to target
  4. If target is draining → route to target (existing session)
  5. If target is down → select new target, update affinity
  6. If no affinity key → round-robin, set affinity cookie

Session State Externalization:
  Redis key:    session:{session_id}
  Redis value:  { user_id, cart, csrf_token, created_at, ... }
  Redis TTL:    1800s (matches cookie maxAge)
  Serialization: JSON or MessagePack`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 5. GSLB, GeoDNS & Anycast (networking)
  // ─────────────────────────────────────────────────────────
  {
    id: 'gslb-geodns-anycast',
    title: 'GSLB, GeoDNS & Anycast',
    icon: 'globe',
    color: '#3b82f6',
    questions: 7,
    description: 'Global server load balancing techniques using DNS-based geographic routing and anycast IP addressing for multi-region traffic distribution.',
    concepts: [
      'Global Server Load Balancing (GSLB)',
      'GeoDNS (geography-based DNS resolution)',
      'Anycast routing (same IP, multiple locations)',
      'Latency-based routing (AWS Route 53)',
      'Failover routing and health checks',
      'DNS TTL and propagation trade-offs',
      'Multi-CDN and traffic splitting',
    ],
    tips: [
      'GSLB is the umbrella term for distributing traffic across global regions — GeoDNS and anycast are two implementations',
      'GeoDNS resolves the same domain to different IPs based on the resolver\'s location — Cloudflare, Route 53, and NS1 all support it',
      'Anycast advertises the same IP from multiple locations via BGP — the network routes to the nearest one automatically',
      'DNS TTL is the Achilles heel of GeoDNS: low TTL = fast failover but more DNS queries; high TTL = slow failover but less DNS load',
      'In interviews, explain that anycast is ideal for stateless protocols (DNS, CDN) but problematic for TCP-stateful services',
      'Combine GeoDNS for region selection with local load balancers (ALB/NLB) for instance-level distribution',
    ],

    introduction: `**Global Server Load Balancing** (GSLB) is the practice of distributing user traffic across geographically distributed data centers to minimize latency, maximize availability, and provide disaster recovery. When a user in Tokyo makes a request, GSLB ensures they are routed to the nearest healthy data center (e.g., ap-northeast-1) rather than one in Virginia — reducing round-trip time from 200ms to 10ms.

The two primary mechanisms for GSLB are **GeoDNS** and **Anycast**. GeoDNS works at the DNS resolution layer: the authoritative DNS server inspects the source IP of the DNS resolver and returns the IP address of the nearest data center. **Anycast** works at the network layer: the same IP address is advertised via BGP from multiple locations, and the internet's routing infrastructure automatically directs packets to the nearest announcement. CDNs like Cloudflare and cloud providers like AWS (Route 53, CloudFront) use both techniques extensively.

Choosing between GeoDNS and anycast depends on the protocol and statefulness of the service. Anycast excels for **stateless, UDP-based services** like DNS resolvers and CDN edge nodes. GeoDNS is more appropriate for **stateful TCP services** like API backends, because anycast TCP connections can break during BGP route changes. In practice, most large-scale architectures use **GeoDNS for region selection** combined with **local load balancers** (ALB, NLB, or Envoy) for instance-level routing within each region.`,

    keyQuestions: [
      {
        question: 'How does GeoDNS work and what are its limitations?',
        answer: `**GeoDNS** returns different DNS answers based on the geographic location of the DNS resolver making the query.

\`\`\`
GeoDNS resolution flow:

  User in Tokyo ──► Local DNS Resolver (103.x.x.x)
                          │
                          ▼
               Authoritative DNS (GeoDNS-enabled)
               ┌─────────────────────────────────┐
               │ GeoIP lookup: 103.x.x.x → Japan │
               │ Return: api.example.com → 13.x.x.x (Tokyo DC) │
               └─────────────────────────────────┘

  User in London ──► Local DNS Resolver (81.x.x.x)
                          │
                          ▼
               Authoritative DNS (GeoDNS-enabled)
               ┌─────────────────────────────────┐
               │ GeoIP lookup: 81.x.x.x → UK     │
               │ Return: api.example.com → 52.x.x.x (London DC) │
               └─────────────────────────────────┘
\`\`\`

**Limitations**:

1. **DNS resolver location != user location**:
\`\`\`
  User in Tokyo using Google DNS (8.8.8.8)
  ──► Google resolver in California queries GeoDNS
  ──► GeoDNS sees California IP → returns US-West DC
  ──► User in Tokyo routed to US-West (bad!)

  Fix: EDNS Client Subnet (ECS) — resolver forwards a
       prefix of the client's IP to the authoritative server
\`\`\`

2. **DNS caching delays failover**:
   - If TTL=300s and a DC goes down, clients using cached DNS continue routing to the dead DC for up to 300 seconds
   - Low TTL (30s) improves failover but increases DNS query volume by 10x

3. **GeoIP database accuracy**: Databases like MaxMind are ~95% accurate at country level but only ~70% at city level

4. **No real-time health awareness**: GeoDNS alone does not know if a DC is healthy. Must integrate health checks (Route 53 health checks, NS1 monitoring) to remove unhealthy DCs from DNS responses.`
      },
      {
        question: 'What is anycast and when should you use it vs GeoDNS?',
        answer: `**Anycast**: The same IP address is advertised from multiple locations via BGP. The network automatically routes packets to the "nearest" (in BGP terms) location.

\`\`\`
Anycast routing:

  Single IP: 1.2.3.4 advertised from 3 locations

        User A (New York)
             │
    BGP path: 2 hops to NYC PoP
             │
             ▼
  ┌─────────────┐
  │ NYC PoP     │ ← Announces 1.2.3.4 via BGP
  │ (1.2.3.4)   │
  └─────────────┘

        User B (London)
             │
    BGP path: 1 hop to London PoP
             │
             ▼
  ┌─────────────┐
  │ London PoP  │ ← Same IP 1.2.3.4 via BGP
  │ (1.2.3.4)   │
  └─────────────┘

        User C (Tokyo)
             │
    BGP path: 3 hops to Tokyo PoP
             │
             ▼
  ┌─────────────┐
  │ Tokyo PoP   │ ← Same IP 1.2.3.4 via BGP
  │ (1.2.3.4)   │
  └─────────────┘
\`\`\`

**Anycast vs GeoDNS**:

| Aspect | Anycast | GeoDNS |
|--------|---------|--------|
| Layer | Network (L3/BGP) | Application (DNS) |
| Failover speed | Seconds (BGP reconvergence) | Minutes (DNS TTL) |
| Protocol | Best for UDP/stateless | Works for TCP/stateful |
| TCP stability | Connections break on route change | Stable (IP does not change) |
| Setup complexity | Requires BGP peering, ASN | DNS provider feature |
| DDoS resilience | Excellent (traffic absorbed at nearest PoP) | Good (still reaches specific IPs) |
| Use cases | DNS resolvers, CDN, DDoS protection | API servers, databases, stateful services |

**When to use anycast**:
- DNS resolvers (Cloudflare 1.1.1.1, Google 8.8.8.8)
- CDN edge servers (static content)
- DDoS mitigation (scrubbing at nearest PoP)
- Any stateless, latency-sensitive service

**When to use GeoDNS**:
- API backends with TCP connections
- WebSocket services
- Databases and caches (connection pools)
- Any stateful service where connection stability matters`
      },
      {
        question: 'How does AWS Route 53 implement latency-based routing?',
        answer: `**Route 53 latency-based routing** goes beyond simple geography — it measures actual network latency from AWS regions to DNS resolver locations and routes to the lowest-latency region.

\`\`\`
Route 53 latency-based routing:

  DNS query from resolver in Singapore
        │
        ▼
  Route 53 latency database:
  ┌──────────────────────────────────────────┐
  │ Resolver region → AWS region latency     │
  │ Singapore → ap-southeast-1:  5ms  ← WIN │
  │ Singapore → ap-northeast-1: 35ms         │
  │ Singapore → us-west-2:     160ms         │
  │ Singapore → eu-west-1:     180ms         │
  └──────────────────────────────────────────┘
        │
        ▼
  Return IP of ap-southeast-1 (Singapore) target

  With health check integration:
  ┌──────────────────────────────────────────┐
  │ ap-southeast-1:  5ms  ← UNHEALTHY       │
  │ ap-northeast-1: 35ms  ← NEXT BEST → WIN │
  │ us-west-2:     160ms                     │
  └──────────────────────────────────────────┘
  Return IP of ap-northeast-1 (Tokyo) target
\`\`\`

**Configuration**:
\`\`\`
  Record 1: api.example.com → 13.x.x.x
    Routing: Latency
    Region: ap-southeast-1
    Health check: /health on port 443
    Set ID: "singapore"

  Record 2: api.example.com → 52.x.x.x
    Routing: Latency
    Region: us-east-1
    Health check: /health on port 443
    Set ID: "virginia"

  Record 3: api.example.com → 18.x.x.x
    Routing: Latency
    Region: eu-west-1
    Health check: /health on port 443
    Set ID: "ireland"
\`\`\`

**Key behaviors**:
- Route 53 maintains a latency matrix updated continuously from AWS infrastructure
- Health checks run every 10s or 30s from multiple Route 53 checker locations
- If the lowest-latency target fails health checks, Route 53 returns the next-lowest
- DNS TTL of 60s is typical — failover takes at most 60s + health check interval

**Combining routing policies** (Route 53 supports nested records):
\`\`\`
  api.example.com
    ├── Latency routing → region selection
    │     ├── us-east-1 → Weighted routing (canary)
    │     │     ├── 90% → stable.us-east.example.com
    │     │     └── 10% → canary.us-east.example.com
    │     ├── eu-west-1 → Failover routing
    │     │     ├── Primary: ireland-primary
    │     │     └── Secondary: ireland-dr
    │     └── ap-southeast-1 → Simple routing
    └── Health checks at every level
\`\`\``
      },
      {
        question: 'Design a multi-region architecture for a global API using GSLB.',
        answer: `**Scenario**: Global REST API serving users in Americas, Europe, and Asia-Pacific with 99.99% availability SLA.

\`\`\`
Architecture overview:

                    ┌──────────────┐
                    │  Route 53    │  (GeoDNS + latency-based)
                    │  GSLB Layer  │
                    └──────┬───────┘
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │  us-east-1   │ │  eu-west-1   │ │ap-southeast-1│
  │  (Virginia)  │ │  (Ireland)   │ │ (Singapore)  │
  ├──────────────┤ ├──────────────┤ ├──────────────┤
  │ CloudFront   │ │ CloudFront   │ │ CloudFront   │
  │ ALB          │ │ ALB          │ │ ALB          │
  │ ECS/EKS (3AZ)│ │ ECS/EKS(3AZ)│ │ ECS/EKS(3AZ)│
  │ Aurora Primary│ │ Aurora Read  │ │ Aurora Read  │
  │ ElastiCache  │ │ ElastiCache  │ │ ElastiCache  │
  └──────────────┘ └──────────────┘ └──────────────┘
         │                │                │
         └────── Aurora Global Database ───┘
           (cross-region replication <1s lag)
\`\`\`

**Traffic flow**:
1. Client resolves api.example.com via Route 53
2. Route 53 returns nearest healthy region IP (latency-based)
3. CloudFront terminates TLS at edge (reduces handshake latency)
4. ALB distributes to ECS/EKS across 3 AZs within the region
5. Read requests served from local Aurora read replica
6. Write requests forwarded to primary region (us-east-1)

**Failover strategy**:
\`\`\`
  Normal: us-east-1 (primary), eu-west-1 (read), ap-southeast-1 (read)

  us-east-1 failure:
  1. Route 53 health check fails (3 consecutive, ~30s)
  2. Route 53 removes us-east-1 from DNS responses (~60s TTL)
  3. Aurora Global Database promotes eu-west-1 to primary (<1 min)
  4. Writes now go to eu-west-1
  5. Total failover time: ~2-3 minutes (RPO <1s, RTO <3 min)
\`\`\`

**Key design decisions**:
- **Active-active reads, active-passive writes**: Simplifies consistency (single writer)
- **Aurora Global Database**: Sub-second replication lag, automated failover
- **Per-region ElastiCache**: Session and query cache local to each region (not replicated — rebuilt on miss)
- **CloudFront in front of ALB**: TLS termination at edge, DDoS protection, static asset caching`
      },
    ],

    dataModel: {
      description: 'GSLB routing configuration and decision matrix',
      schema: `GSLB Routing Decision Matrix:
  ┌─────────────────┬──────────────┬──────────────┬──────────┐
  │ Client Location │ Primary DC   │ Failover DC  │ Method   │
  ├─────────────────┼──────────────┼──────────────┼──────────┤
  │ Americas        │ us-east-1    │ us-west-2    │ Latency  │
  │ Europe/Africa   │ eu-west-1    │ eu-central-1 │ Latency  │
  │ Asia-Pacific    │ ap-southeast │ ap-northeast │ Latency  │
  └─────────────────┴──────────────┴──────────────┴──────────┘

Health Check Configuration:
  protocol:     HTTPS
  path:         /health
  port:         443
  interval:     10s
  threshold:    3 failures → unhealthy
  regions:      us-east-1, eu-west-1, ap-southeast-1 (check from all)

DNS Record Structure:
  api.example.com  A  LATENCY  us-east-1    13.x.x.x   TTL=60
  api.example.com  A  LATENCY  eu-west-1    52.x.x.x   TTL=60
  api.example.com  A  LATENCY  ap-southeast 18.x.x.x   TTL=60`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 6. Pagination Strategies (networking)
  // ─────────────────────────────────────────────────────────
  {
    id: 'pagination-strategies',
    title: 'Pagination Strategies',
    icon: 'list',
    color: '#3b82f6',
    questions: 7,
    description: 'Offset, cursor, and keyset pagination approaches with trade-offs for performance, consistency, and user experience.',
    concepts: [
      'Offset/limit pagination (traditional)',
      'Cursor-based pagination (opaque token)',
      'Keyset pagination (WHERE id > last_id)',
      'Total count estimation vs exact count',
      'Pagination with sorting and filtering',
      'Bidirectional pagination (next/previous)',
      'API design for paginated endpoints',
    ],
    tips: [
      'Offset pagination is simple but O(offset) — scanning 1M rows to skip to page 10,000 is expensive',
      'Cursor-based pagination is O(1) per page regardless of depth — always prefer it for large datasets',
      'Keyset pagination uses WHERE id > :last_id ORDER BY id LIMIT :size — requires a unique, sequential column',
      'For interviews, know that cursor pagination prevents the "shifting window" problem (new inserts do not cause duplicates or skips)',
      'COUNT(*) for total pages is expensive on large tables — consider approximate counts or remove total page counts entirely',
      'GraphQL Relay specification standardizes cursor pagination with edges/nodes/pageInfo',
    ],

    introduction: `**Pagination** is the practice of dividing a large result set into smaller pages, returning a manageable subset of records per API call. It is one of the most common API design decisions, and choosing the wrong strategy can have severe performance implications at scale. The three main approaches are **offset pagination** (OFFSET/LIMIT), **cursor pagination** (opaque encoded tokens), and **keyset pagination** (WHERE id > last_seen).

**Offset pagination** (e.g., \`?page=5&size=20\`) is the simplest to implement and understand: the database skips \`offset\` rows and returns the next \`size\` rows. However, it has a critical flaw — the database must scan and discard all skipped rows, making deep pages (page 10,000+) extremely slow. Additionally, if new records are inserted while a user is paginating, they may see duplicates or miss records.

**Cursor pagination** (e.g., \`?after=eyJpZCI6NDJ9&size=20\`) uses an opaque token that encodes the position in the result set (typically the last item's sort key). The server decodes the cursor and uses it to query the next page directly (e.g., \`WHERE id > 42 ORDER BY id LIMIT 20\`), which is O(1) regardless of page depth. This is the approach used by **Twitter's API**, **GitHub's GraphQL API**, **Slack**, and **Stripe** — and it is the recommended approach for any dataset that may grow beyond a few thousand records.`,

    keyQuestions: [
      {
        question: 'What is the performance difference between offset and cursor pagination?',
        answer: `**Offset pagination** performance degrades linearly with page depth because the database must scan all skipped rows:

\`\`\`
Offset pagination: SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 10000;
  Database execution:
    1. Scan index from beginning
    2. Skip 10,000 rows (wasted work)
    3. Return next 20 rows
    Time: O(offset + limit) → O(10,020) = slow

Cursor pagination: SELECT * FROM posts WHERE id > 10000 ORDER BY id LIMIT 20;
  Database execution:
    1. Seek directly to id=10000 in index (B-tree seek)
    2. Scan forward 20 rows
    Time: O(limit) → O(20) = constant, regardless of depth
\`\`\`

**Benchmark comparison (1M row table)**:

\`\`\`
  Page depth     │ Offset (ms) │ Cursor (ms)
  ───────────────┼─────────────┼────────────
  Page 1         │     2       │     2
  Page 100       │     5       │     2
  Page 1,000     │    25       │     2
  Page 10,000    │   180       │     2
  Page 50,000    │   900       │     2
  Page 100,000   │  1,800      │     2
\`\`\`

**Why offset is O(n)**:
- Even with an index, most databases cannot "jump" to an offset — they must traverse the index entries sequentially
- PostgreSQL's OFFSET literally counts and discards rows
- MySQL has the same behavior with LIMIT offset, count

**Additional problem — the shifting window**:
\`\`\`
  Page 1: [A, B, C, D, E]  (user reads page 1)
  New item X inserted at position 3
  Page 2: [E, F, G, H, I]  ← user sees E twice!

  With cursor (after=E):
  Page 2: [F, G, H, I, J]  ← correct, no duplicates
\`\`\`

**When offset is acceptable**: Small datasets (<10K rows), admin dashboards, or when "jump to page N" is a hard requirement.`
      },
      {
        question: 'How do you implement cursor pagination for complex sort orders?',
        answer: `**Challenge**: Cursor pagination is straightforward for single-column sorts (WHERE id > :cursor), but complex when sorting by non-unique columns (e.g., ORDER BY created_at, id).

\`\`\`
Simple cursor (single unique column):
  WHERE id > :cursor ORDER BY id ASC LIMIT 20
  Cursor encodes: { id: 42 }

Compound cursor (non-unique sort column):
  ORDER BY created_at DESC, id DESC
  Cursor encodes: { created_at: "2024-01-15T10:30:00Z", id: 42 }

  WHERE (created_at, id) < (:cursor_time, :cursor_id)
  ORDER BY created_at DESC, id DESC
  LIMIT 20

  -- Or equivalently (for databases without tuple comparison):
  WHERE created_at < :cursor_time
     OR (created_at = :cursor_time AND id < :cursor_id)
  ORDER BY created_at DESC, id DESC
  LIMIT 20
\`\`\`

**Cursor encoding**:
\`\`\`
  // Encode cursor (server-side)
  function encodeCursor(lastItem) {
    const payload = {
      created_at: lastItem.created_at,
      id: lastItem.id
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
    // "eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNSIsImlkIjo0Mn0="
  }

  // Decode cursor (server-side)
  function decodeCursor(cursor) {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
    // { created_at: "2024-01-15", id: 42 }
  }
\`\`\`

**API response format** (Relay-style):
\`\`\`
  {
    "edges": [
      { "node": { "id": 43, "title": "Post 43" }, "cursor": "eyJpZCI6NDN9" },
      { "node": { "id": 44, "title": "Post 44" }, "cursor": "eyJpZCI6NDR9" }
    ],
    "pageInfo": {
      "hasNextPage": true,
      "hasPreviousPage": true,
      "startCursor": "eyJpZCI6NDN9",
      "endCursor": "eyJpZCI6NDR9"
    }
  }
\`\`\`

**Index requirement**: The sort columns MUST have a composite index matching the ORDER BY clause. Without it, the database falls back to a sequential scan.
\`\`\`
  CREATE INDEX idx_posts_cursor ON posts (created_at DESC, id DESC);
\`\`\``
      },
      {
        question: 'How do you handle total count with cursor pagination?',
        answer: `**Problem**: \`SELECT COUNT(*) FROM posts WHERE ...\` is expensive on large tables — it requires a full index scan in PostgreSQL (MVCC means no cached row count).

\`\`\`
Cost of exact COUNT(*):
  Table size    │ COUNT(*) time │ Page query time
  ──────────────┼───────────────┼────────────────
  10K rows      │     2ms       │     2ms
  1M rows       │    80ms       │     2ms
  100M rows     │  8,000ms      │     2ms
  1B rows       │ 80,000ms      │     2ms
\`\`\`

**Strategies to avoid expensive counts**:

\`\`\`
Strategy 1: No total count (recommended)
  Response: { "data": [...], "has_next": true }
  UI: "Load more" button or infinite scroll
  Used by: Twitter, Instagram, Slack

Strategy 2: Approximate count
  PostgreSQL:
    SELECT reltuples FROM pg_class WHERE relname = 'posts';
    -- Returns estimate, updated by ANALYZE, very fast

  With filter:
    EXPLAIN SELECT * FROM posts WHERE status = 'active';
    -- Parse "rows=12345" from plan output

Strategy 3: Cached count (materialized)
  Maintain a counter table updated by triggers:
    INSERT INTO post_counts (filter_hash, count, updated_at)
    VALUES ('status=active', 50432, NOW())
    ON CONFLICT (filter_hash)
    DO UPDATE SET count = count + 1, updated_at = NOW();

Strategy 4: Count with cap
  SELECT COUNT(*) FROM (
    SELECT 1 FROM posts WHERE status = 'active' LIMIT 10001
  ) sub;
  -- Returns exact count up to 10,000, then "10,000+"
  -- UI: "Showing page 1 of 10,000+ results"
\`\`\`

**Recommendation by use case**:
| Use case | Strategy | Rationale |
|----------|----------|-----------|
| Social feed | No count | Infinite scroll, count is meaningless |
| Search results | Approximate + cap | "About 1.2M results" is fine |
| Admin dashboard | Cached count | Admin expects exact numbers, cache is acceptable |
| Export / download | Exact count (async) | Need progress bar, compute in background job |

**API design tip**: Make total count an opt-in parameter (\`?include_count=true\`) so the default fast path does not pay the cost.`
      },
      {
        question: 'Compare offset, cursor, and keyset pagination for API design.',
        answer: `**Side-by-side comparison**:

\`\`\`
Offset:    GET /posts?page=5&size=20
           SQL: SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 80

Cursor:    GET /posts?after=eyJpZCI6ODB9&size=20
           SQL: SELECT * FROM posts WHERE id > 80 ORDER BY id LIMIT 20

Keyset:    GET /posts?last_id=80&size=20
           SQL: SELECT * FROM posts WHERE id > 80 ORDER BY id LIMIT 20
           (same SQL as cursor, but cursor is opaque, keyset is explicit)
\`\`\`

**Comparison matrix**:

| Feature | Offset | Cursor | Keyset |
|---------|--------|--------|--------|
| Performance at depth | O(offset) slow | O(1) fast | O(1) fast |
| Jump to page N | Yes | No | No |
| Consistent during writes | No (shifting window) | Yes | Yes |
| Sort flexibility | Any sort order | Any (encoded in cursor) | Requires indexed column |
| Client complexity | Simple (?page=N) | Opaque token | Exposed sort column |
| Bidirectional | Yes (page-1, page+1) | Yes (before/after cursors) | Yes (< and >) |
| Cacheability | Yes (page=5 is stable) | No (cursor changes) | Limited |
| Total count needed? | Typically yes | No | No |

**Decision flowchart**:
\`\`\`
  Is the dataset small (<10K rows)?
    └── Yes → Offset is fine
    └── No  → Does the UI need "jump to page N"?
                └── Yes → Offset with count cap (accept perf hit)
                └── No  → Is the sort column unique and indexed?
                            └── Yes → Keyset (simpler implementation)
                            └── No  → Cursor (handles compound sorts)
\`\`\`

**Industry examples**:
- **Stripe**: Cursor (\`starting_after=ch_xxx\`) — financial data, must be consistent
- **GitHub GraphQL**: Cursor (Relay spec) — edges, nodes, pageInfo
- **GitHub REST**: Offset + Link header — legacy, simpler
- **Slack**: Cursor (\`cursor=dGVhbTpDMDYx\`) — real-time data, no page jumping
- **Elasticsearch**: Scroll API (cursor) for deep pagination, from/size (offset) for shallow`
      },
    ],

    dataModel: {
      description: 'Pagination API response formats and SQL patterns',
      schema: `Offset Pagination API:
  Request:  GET /posts?page=3&size=20&sort=created_at:desc
  Response: { data: [...], total: 1250, page: 3, size: 20, pages: 63 }
  SQL:      SELECT * FROM posts ORDER BY created_at DESC
            LIMIT 20 OFFSET 40

Cursor Pagination API (Relay-style):
  Request:  GET /posts?first=20&after=eyJpZCI6NDJ9
  Response: {
    edges: [{ node: {...}, cursor: "..." }],
    pageInfo: { hasNextPage, hasPreviousPage, startCursor, endCursor }
  }
  SQL:      SELECT * FROM posts WHERE (created_at, id) < (:c1, :c2)
            ORDER BY created_at DESC, id DESC LIMIT 21  -- +1 to check hasNextPage

Keyset Pagination API:
  Request:  GET /posts?after_id=42&size=20
  Response: { data: [...], has_next: true, next_id: 62 }
  SQL:      SELECT * FROM posts WHERE id > 42
            ORDER BY id ASC LIMIT 21

Required Indexes:
  Offset:  CREATE INDEX idx_posts_sort ON posts (created_at DESC);
  Cursor:  CREATE INDEX idx_posts_cursor ON posts (created_at DESC, id DESC);
  Keyset:  Primary key index on id (already exists)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 7. Idempotency (data)
  // ─────────────────────────────────────────────────────────
  {
    id: 'idempotency',
    title: 'Idempotency',
    icon: 'repeat',
    color: '#8b5cf6',
    questions: 8,
    description: 'Designing APIs and operations that produce the same result regardless of how many times they are executed, critical for payment safety and exactly-once semantics.',
    concepts: [
      'Idempotency definition and importance',
      'Idempotency keys (client-generated UUIDs)',
      'Idempotency store (deduplication table)',
      'Naturally idempotent operations (PUT, DELETE)',
      'Non-idempotent operations (POST, increment)',
      'Exactly-once semantics via idempotency',
      'Stripe-style idempotency implementation',
      'Retry safety and timeout handling',
    ],
    tips: [
      'An operation is idempotent if calling it N times produces the same result as calling it once — f(f(x)) = f(x)',
      'HTTP PUT and DELETE are naturally idempotent; POST is not — this is why payment APIs use idempotency keys',
      'Stripe\'s Idempotency-Key header is the gold standard: client sends a UUID, server deduplicates within 24 hours',
      'The idempotency store must be checked BEFORE performing the operation, not after',
      'Handle the "in-progress" state: if the first request is still processing, the retry should wait, not start a new operation',
      'In interviews, always connect idempotency to real-world scenarios: double-charging a credit card, duplicate order placement',
    ],

    introduction: `**Idempotency** is the property of an operation where performing it multiple times produces the same result as performing it once. In distributed systems, network failures, timeouts, and retries are inevitable — a client that does not receive a response cannot know whether the server processed the request or not. Without idempotency, retrying a payment request could charge a customer twice; retrying an order submission could create duplicate orders.

The standard implementation uses an **idempotency key**: the client generates a unique identifier (typically a UUID) and includes it with every request. The server stores the key alongside the result of the first execution. On subsequent requests with the same key, the server returns the stored result without re-executing the operation. This transforms any non-idempotent operation (like creating a charge) into an idempotent one.

**Stripe's idempotency implementation** is the industry reference: clients send an \`Idempotency-Key\` header with POST requests. The server stores the key, request parameters, and response for 24 hours. If a retry arrives with the same key, Stripe returns the original response. If the parameters differ (same key, different amount), Stripe returns an error — preventing misuse of idempotency keys. This pattern is now standard in payment processing, order management, and any system where **exactly-once semantics** are critical for correctness.`,

    keyQuestions: [
      {
        question: 'How do you implement an idempotency layer for a payment API?',
        answer: `**Architecture**: Client generates a UUID idempotency key. Server checks a deduplication store before processing.

\`\`\`
Idempotent payment flow:

  Client: POST /charges
          Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
          Body: { amount: 5000, currency: "usd", customer: "cus_123" }

  Server flow:
  ┌─────────────────────────────────────────────────────┐
  │ 1. BEGIN TRANSACTION                                 │
  │                                                      │
  │ 2. SELECT * FROM idempotency_keys                    │
  │    WHERE key = '550e8400...' FOR UPDATE              │
  │                                                      │
  │    ┌─── Key exists? ───┐                             │
  │    │                   │                             │
  │   YES                  NO                            │
  │    │                   │                             │
  │  status?           3. INSERT key (status=processing) │
  │    │                   │                             │
  │ completed          4. Execute payment logic           │
  │    │                   │                             │
  │ Return stored      5. UPDATE key (status=completed,  │
  │ response              response=<result>)             │
  │                        │                             │
  │ processing         6. COMMIT                         │
  │    │                   │                             │
  │ Wait/retry         7. Return response to client      │
  │ (409 or poll)                                        │
  └─────────────────────────────────────────────────────┘
\`\`\`

**Idempotency key table**:
\`\`\`
  CREATE TABLE idempotency_keys (
    key           UUID PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    request_path  TEXT NOT NULL,
    request_hash  TEXT NOT NULL,     -- hash of request body
    status        TEXT NOT NULL,     -- processing | completed | error
    response_code INT,
    response_body JSONB,
    created_at    TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
  );

  CREATE INDEX idx_idempotency_expires ON idempotency_keys (expires_at);
\`\`\`

**Critical edge cases**:
1. **Same key, different params**: Return 422 error (prevent key reuse for different operations)
2. **Request still processing**: Return 409 Conflict with Retry-After header
3. **Server crash during processing**: Background job detects stale "processing" records and retries or rolls back
4. **Key expiration**: Cron job deletes keys older than 24 hours`
      },
      {
        question: 'Which HTTP methods are naturally idempotent and why?',
        answer: `**HTTP method idempotency** (per RFC 7231):

\`\`\`
  Method  │ Idempotent │ Safe │ Explanation
  ────────┼────────────┼──────┼──────────────────────────────────
  GET     │    Yes     │ Yes  │ No side effects, same response
  HEAD    │    Yes     │ Yes  │ Same as GET without body
  PUT     │    Yes     │  No  │ Replaces resource, same result
  DELETE  │    Yes     │  No  │ Resource gone, repeated = still gone
  OPTIONS │    Yes     │ Yes  │ Returns server capabilities
  POST    │    No      │  No  │ Creates new resource each time
  PATCH   │    No*     │  No  │ Depends on implementation
\`\`\`

**Why PUT is idempotent but POST is not**:
\`\`\`
  PUT /users/42  { name: "Alice", age: 30 }
  Result: User 42 is now { name: "Alice", age: 30 }
  Repeat: User 42 is still { name: "Alice", age: 30 }
  → Same result regardless of repetition ✓

  POST /users  { name: "Alice", age: 30 }
  Result: Created User 43
  Repeat: Created User 44  ← DIFFERENT result!
  → Not idempotent ✗
\`\`\`

**PATCH can be idempotent or not**:
\`\`\`
  Idempotent PATCH (absolute update):
    PATCH /users/42  { age: 30 }
    Repeat: age is still 30 ✓

  Non-idempotent PATCH (relative update):
    PATCH /users/42  { age: "+1" }
    First:  age becomes 31
    Repeat: age becomes 32 ✗
\`\`\`

**DELETE edge case**:
\`\`\`
  DELETE /users/42
  First:  200 OK (user deleted)
  Repeat: 404 Not Found (already deleted)

  Status codes differ, but the SERVER STATE is identical
  (user 42 does not exist). This is still idempotent.
  Idempotency is about state, not response codes.
\`\`\`

**Design implications**:
- Safe methods (GET, HEAD, OPTIONS): Can be cached, retried freely
- Idempotent methods (PUT, DELETE): Safe to retry on timeout
- Non-idempotent methods (POST): MUST use idempotency keys for retry safety`
      },
      {
        question: 'How does Stripe implement idempotency and what can we learn from it?',
        answer: `**Stripe's idempotency design** is widely considered the gold standard:

\`\`\`
Client sends:
  POST /v1/charges
  Idempotency-Key: req_abc123
  Body: { amount: 2000, currency: "usd", source: "tok_visa" }

Stripe server behavior:

  Case 1: First request
    → Process charge → Store (key, params_hash, response) → Return 200

  Case 2: Retry with same key + same params
    → Lookup key → Found, params match → Return stored 200 response
    → No charge is created (deduplication)

  Case 3: Same key + DIFFERENT params
    → Lookup key → Found, params DON'T match
    → Return 400: "Idempotency key already used with different params"

  Case 4: Request still in-flight
    → Lookup key → Found, status=processing
    → Return 409: "Request is already being processed"
\`\`\`

**Stripe's key design decisions**:

| Decision | Rationale |
|----------|-----------|
| Client generates the key | Client controls retry identity, not the server |
| 24-hour expiration | Balances storage cost vs retry window |
| Params hash comparison | Prevents key reuse for different operations |
| POST only | GET/PUT/DELETE are already idempotent |
| Key stored with user scope | Keys are unique per API key, not globally |

**Stripe's recommended retry strategy**:
\`\`\`
  function chargeWithRetry(params) {
    const idempotencyKey = uuid();  // Generate ONCE

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await stripe.charges.create(params, {
          idempotencyKey: idempotencyKey  // Same key every retry
        });
      } catch (err) {
        if (err.type === 'StripeConnectionError') {
          await sleep(exponentialBackoff(attempt));
          continue;  // Retry with SAME key
        }
        throw err;  // Non-retryable error
      }
    }
  }
\`\`\`

**Lessons for your own implementation**:
1. Make the idempotency key a client responsibility — the server should not generate it
2. Store the complete response, not just a success/failure flag
3. Compare request parameters to prevent key misuse
4. Handle the "in-progress" state to avoid duplicate concurrent executions
5. Set a reasonable expiration (24h for payments, shorter for less critical operations)`
      },
      {
        question: 'How do you handle idempotency across distributed microservices?',
        answer: `**Challenge**: A single user action (e.g., "place order") triggers multiple services — each must be individually idempotent.

\`\`\`
Order placement flow:

  Client ──► API Gateway ──► Order Service ──► Payment Service
              │                    │                │
              │ Idempotency-Key:   │ Internal key:  │ Payment key:
              │ req_abc123         │ order_abc123   │ pay_abc123
              │                    │                │
              │                    ▼                ▼
              │              Orders DB         Stripe API
              │              (dedup table)     (Idempotency-Key)
              │                    │                │
              │                    ▼                │
              │              Inventory Service      │
              │              inv_key: inv_abc123    │
              │                    │                │
              │                    ▼                │
              │              Notification Service   │
              │              notif_key: notif_abc123│
\`\`\`

**Key propagation pattern**:
\`\`\`
  // API Gateway receives client idempotency key
  clientKey = "req_abc123"

  // Derive deterministic keys for downstream services
  orderKey   = hash(clientKey + "order")    // "order_7f3a..."
  paymentKey = hash(clientKey + "payment")  // "pay_2b8c..."
  inventoryKey = hash(clientKey + "inventory") // "inv_9d1e..."

  // Each service uses its derived key independently
  // Retrying the entire flow produces the same derived keys
  // Each service deduplicates independently
\`\`\`

**Saga pattern with idempotent steps**:
\`\`\`
  Step 1: Create Order (idempotent via order_key)
    ├── Success → Step 2
    └── Already exists → Skip to Step 2

  Step 2: Reserve Inventory (idempotent via inventory_key)
    ├── Success → Step 3
    └── Already reserved → Skip to Step 3
    └── Failed → Compensate: Cancel Order

  Step 3: Charge Payment (idempotent via payment_key)
    ├── Success → Step 4
    └── Already charged → Skip to Step 4
    └── Failed → Compensate: Release Inventory, Cancel Order

  Step 4: Send Confirmation (idempotent via notif_key)
    ├── Success → Done
    └── Already sent → Done
\`\`\`

**Critical design rules**:
1. **Derive downstream keys from upstream key**: Ensures deterministic deduplication across retries
2. **Each service owns its own idempotency store**: No shared dedup table across services
3. **Compensating actions must also be idempotent**: Refund with the same key should not refund twice
4. **Log the idempotency key chain**: For debugging, trace which derived keys were used in each service`
      },
    ],

    dataModel: {
      description: 'Idempotency key storage schema and lifecycle',
      schema: `Idempotency Key Table:
  ┌───────────┬──────────┬─────────────┬────────┬──────────┬───────────┐
  │    Key    │ User ID  │ Req Hash    │ Status │ Response │ Expires   │
  │  (UUID)   │          │ (SHA-256)   │        │ (JSONB)  │           │
  ├───────────┼──────────┼─────────────┼────────┼──────────┼───────────┤
  │ 550e8400..│  cus_123 │ a3f2b8...   │complete│ {200,...}│ +24 hours │
  │ 7c9e1200..│  cus_456 │ b7d4e1...   │process │  null    │ +24 hours │
  └───────────┴──────────┴─────────────┴────────┴──────────┴───────────┘

Idempotency Key Lifecycle:
  1. Client generates UUID (req_abc123)
  2. Server receives request
  3. BEGIN TRANSACTION
  4. SELECT ... WHERE key = req_abc123 FOR UPDATE
  5a. Not found → INSERT (status=processing) → Execute → UPDATE (status=completed)
  5b. Found + completed → Return stored response
  5c. Found + processing → Return 409 Conflict
  5d. Found + different params → Return 422 Error
  6. COMMIT
  7. Cleanup: DELETE WHERE expires_at < NOW() (background cron)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 8. SQL Isolation Levels (data)
  // ─────────────────────────────────────────────────────────
  {
    id: 'sql-isolation-levels-deep-dive',
    title: 'SQL Isolation Levels Deep Dive',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 8,
    description: 'Understanding read committed, repeatable read, serializable, and their trade-offs between consistency and performance in relational databases.',
    concepts: [
      'ACID properties and isolation',
      'Read uncommitted (dirty reads)',
      'Read committed (PostgreSQL default)',
      'Repeatable read (MySQL InnoDB default)',
      'Serializable (strongest guarantee)',
      'Phantom reads, non-repeatable reads, dirty reads',
      'Snapshot isolation (MVCC-based)',
      'Serializable Snapshot Isolation (SSI)',
    ],
    tips: [
      'PostgreSQL default is Read Committed; MySQL InnoDB default is Repeatable Read — know both defaults',
      'Serializable does not mean "slow" — PostgreSQL SSI uses optimistic concurrency and only aborts on actual conflicts',
      'The classic interview question: "What anomaly does each level prevent?" — draw the anomaly table',
      'Snapshot isolation (used by PostgreSQL for Repeatable Read) prevents most anomalies but allows write skew',
      'In practice, most applications work fine with Read Committed + application-level locking for critical sections',
      'Know the difference between lock-based isolation (MySQL) and MVCC-based isolation (PostgreSQL)',
    ],

    introduction: `**SQL isolation levels** define how concurrent transactions interact with each other — specifically, what data changes made by one transaction are visible to another concurrent transaction. The SQL standard defines four isolation levels, each preventing an increasing set of anomalies at the cost of reduced concurrency. Understanding these trade-offs is essential for designing correct, performant database applications.

The four standard levels are: **Read Uncommitted** (lowest, allows dirty reads), **Read Committed** (prevents dirty reads, PostgreSQL default), **Repeatable Read** (prevents non-repeatable reads, MySQL default), and **Serializable** (highest, prevents all anomalies). In practice, most databases implement these differently from the SQL standard — PostgreSQL uses **Multi-Version Concurrency Control** (MVCC) with snapshot isolation for Repeatable Read, and **Serializable Snapshot Isolation** (SSI) for Serializable. MySQL InnoDB uses a combination of MVCC and gap locks.

The critical interview insight is that stronger isolation is not always better. **Serializable** prevents all anomalies but can reduce throughput due to increased aborts (in SSI) or blocking (in 2PL). Most production applications use **Read Committed** and handle edge cases with explicit locking (\`SELECT ... FOR UPDATE\`) or application-level invariant checks. The art is choosing the weakest isolation level that still guarantees correctness for your specific use case.`,

    keyQuestions: [
      {
        question: 'What anomalies does each isolation level prevent?',
        answer: `**Three classic anomalies** that isolation levels address:

\`\`\`
1. Dirty Read: Reading uncommitted data from another transaction
   Tx1: UPDATE accounts SET balance = 0 WHERE id = 1;
   Tx2: SELECT balance FROM accounts WHERE id = 1;  → reads 0
   Tx1: ROLLBACK;  (balance was never actually 0!)

2. Non-Repeatable Read: Same query returns different values
   Tx1: SELECT balance FROM accounts WHERE id = 1;  → 100
   Tx2: UPDATE accounts SET balance = 50 WHERE id = 1; COMMIT;
   Tx1: SELECT balance FROM accounts WHERE id = 1;  → 50 (changed!)

3. Phantom Read: Same query returns different ROWS
   Tx1: SELECT * FROM orders WHERE status = 'pending';  → 5 rows
   Tx2: INSERT INTO orders (status) VALUES ('pending'); COMMIT;
   Tx1: SELECT * FROM orders WHERE status = 'pending';  → 6 rows (new row!)
\`\`\`

**Anomaly prevention matrix**:

\`\`\`
  Isolation Level   │ Dirty Read │ Non-Repeatable │ Phantom │ Write Skew
  ──────────────────┼────────────┼────────────────┼─────────┼───────────
  Read Uncommitted  │  Possible  │   Possible     │Possible │ Possible
  Read Committed    │ Prevented  │   Possible     │Possible │ Possible
  Repeatable Read   │ Prevented  │  Prevented     │Possible*│ Possible*
  Serializable      │ Prevented  │  Prevented     │Prevented│ Prevented

  * PostgreSQL's Repeatable Read (snapshot isolation) prevents phantoms
    but allows write skew. MySQL's Repeatable Read uses gap locks to
    prevent some phantoms but behavior differs from PostgreSQL.
\`\`\`

**Write skew** (the most subtle anomaly):
\`\`\`
  Rule: At least one doctor must be on call at all times.
  Currently: Alice=on_call, Bob=on_call

  Tx1 (Alice): SELECT COUNT(*) FROM doctors WHERE on_call = true;  → 2
               UPDATE doctors SET on_call = false WHERE name = 'Alice';
  Tx2 (Bob):   SELECT COUNT(*) FROM doctors WHERE on_call = true;  → 2
               UPDATE doctors SET on_call = false WHERE name = 'Bob';

  Both commit → zero doctors on call! (violates invariant)
  Both transactions saw 2 on-call doctors, so both thought it was safe.
  Only Serializable prevents this.
\`\`\``
      },
      {
        question: 'How does PostgreSQL implement isolation levels with MVCC?',
        answer: `**PostgreSQL uses MVCC** (Multi-Version Concurrency Control) for all isolation levels — readers never block writers and writers never block readers.

\`\`\`
MVCC basics — each row has hidden system columns:
  ┌────────┬────────┬──────────┬────────────────────┐
  │ xmin   │ xmax   │ data     │ meaning            │
  ├────────┼────────┼──────────┼────────────────────┤
  │ 100    │ 0      │ Alice,30 │ Created by tx 100  │
  │ 100    │ 105    │ Alice,30 │ Deleted by tx 105  │
  │ 105    │ 0      │ Alice,31 │ New version by 105 │
  └────────┴────────┴──────────┴────────────────────┘

  UPDATE creates a new row version; old version remains
  until VACUUM removes it.
\`\`\`

**Read Committed (PostgreSQL default)**:
\`\`\`
  Each STATEMENT sees a fresh snapshot
  Tx1: BEGIN;
  Tx1: SELECT balance FROM accounts WHERE id=1;  → 100 (snapshot at t1)
  Tx2: UPDATE accounts SET balance=50 WHERE id=1; COMMIT;
  Tx1: SELECT balance FROM accounts WHERE id=1;  → 50 (new snapshot at t2!)
  (Non-repeatable read is allowed)
\`\`\`

**Repeatable Read (Snapshot Isolation)**:
\`\`\`
  Transaction sees ONE snapshot taken at first statement
  Tx1: BEGIN ISOLATION LEVEL REPEATABLE READ;
  Tx1: SELECT balance FROM accounts WHERE id=1;  → 100 (snapshot at t1)
  Tx2: UPDATE accounts SET balance=50 WHERE id=1; COMMIT;
  Tx1: SELECT balance FROM accounts WHERE id=1;  → 100 (still t1 snapshot!)
  Tx1: UPDATE accounts SET balance=balance-10 WHERE id=1;
       → ERROR: could not serialize access (concurrent update detected)
       → Tx1 must retry
\`\`\`

**Serializable (SSI — Serializable Snapshot Isolation)**:
\`\`\`
  Same as Repeatable Read PLUS detection of serialization anomalies
  Uses "predicate locks" (SIReadLock) to track read dependencies:

  Tx1: SELECT * FROM doctors WHERE on_call=true;
       (SSI records: Tx1 read predicate "on_call=true")
  Tx2: SELECT * FROM doctors WHERE on_call=true;
       (SSI records: Tx2 read predicate "on_call=true")
  Tx1: UPDATE doctors SET on_call=false WHERE name='Alice'; COMMIT;
  Tx2: UPDATE doctors SET on_call=false WHERE name='Bob'; COMMIT;
       → ERROR: could not serialize access
       (SSI detected rw-dependency cycle between Tx1 and Tx2)
\`\`\`

**Key PostgreSQL behavior**: SSI is optimistic — transactions run without blocking, and the system aborts one transaction only when it detects an actual cycle. This provides much higher throughput than traditional 2PL serializable implementations.`
      },
      {
        question: 'How does MySQL InnoDB isolation differ from PostgreSQL?',
        answer: `**MySQL InnoDB** uses MVCC + locking (a hybrid approach), while PostgreSQL is pure MVCC. The differences matter in practice.

\`\`\`
Default isolation levels:
  PostgreSQL: Read Committed
  MySQL:      Repeatable Read

Key behavioral differences:

1. Locking reads in Repeatable Read:
   PostgreSQL: Uses snapshot, aborts on write conflict
   MySQL:      Uses gap locks to prevent phantoms

   MySQL gap lock example:
   Tx1: SELECT * FROM orders WHERE amount > 100 FOR UPDATE;
        (InnoDB locks the index range [100, +∞) — a "gap lock")
   Tx2: INSERT INTO orders (amount) VALUES (150);
        → BLOCKED until Tx1 commits (gap lock prevents phantom)

2. UPDATE behavior on conflict:
   PostgreSQL (RR): ERROR: could not serialize access → must retry
   MySQL (RR):      BLOCKS until conflicting tx commits, then proceeds

3. Non-locking reads:
   Both: Use MVCC snapshot (consistent read)
   But MySQL "consistent read" in RR takes snapshot at first read
   PostgreSQL identical for RR
\`\`\`

**Comparison table**:

| Behavior | PostgreSQL (RR) | MySQL InnoDB (RR) |
|----------|----------------|-------------------|
| Phantom prevention | Snapshot (no new rows visible) | Gap locks (blocks inserts) |
| Write conflict | Abort + retry | Block + wait |
| Deadlock risk | Lower (abort instead of wait) | Higher (locks can deadlock) |
| SELECT FOR UPDATE | Locks specific rows | Locks rows + index gaps |
| Performance under contention | More aborts, less blocking | More blocking, fewer aborts |
| Write skew prevention | Not prevented (need Serializable) | Not prevented |

**MySQL's "Repeatable Read" is stronger than standard**:
\`\`\`
  Standard SQL RR: Allows phantom reads
  MySQL InnoDB RR: Gap locks prevent MOST phantoms
                   (but not all — some edge cases with non-locking reads)
  PostgreSQL RR:   Snapshot prevents ALL phantom reads
                   (but allows write skew)
\`\`\`

**Practical advice**:
- For PostgreSQL: Use Read Committed + explicit \`SELECT ... FOR UPDATE\` for critical sections. Use Serializable for complex invariants (doctor on-call example).
- For MySQL: Repeatable Read is usually sufficient. Be aware of gap lock deadlocks under high write contention.`
      },
      {
        question: 'When should you use Serializable isolation and what is the performance cost?',
        answer: `**Use Serializable when** your application has invariants that span multiple reads and writes, and application-level locking is too complex or error-prone.

\`\`\`
Scenarios requiring Serializable:

1. Write skew prevention:
   "At least one doctor must be on call"
   "Account balance must not go negative across multiple accounts"
   "No double-booking of conference rooms"

2. Complex invariants across tables:
   "Total inventory across all warehouses must match order reservations"
   "User's total spending across all categories <= budget limit"

3. Audit/compliance systems:
   Financial ledgers where any anomaly is unacceptable
\`\`\`

**Performance cost (PostgreSQL SSI)**:
\`\`\`
  Throughput comparison (pgbench, 64 clients):

  Isolation Level    │ TPS    │ Abort Rate │ Avg Latency
  ───────────────────┼────────┼────────────┼────────────
  Read Committed     │ 15,000 │   0%       │   4ms
  Repeatable Read    │ 13,500 │   2%       │   5ms
  Serializable (SSI) │ 12,000 │   5-15%    │   5ms
  Serializable (2PL) │  3,000 │   0%       │  20ms
                                              (blocking)
\`\`\`

**PostgreSQL SSI overhead**:
- Memory: SIReadLocks consume ~270 bytes each. High-volume systems may need \`max_pred_locks_per_transaction\` tuning.
- Aborts: 5-15% of transactions may be aborted under moderate contention. Application must handle retries.
- Throughput: ~10-20% lower than Read Committed for conflict-free workloads (lock tracking overhead).

**Retry pattern for SSI**:
\`\`\`
  async function withSerializableRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await db.transaction(
          { isolationLevel: 'SERIALIZABLE' },
          fn
        );
      } catch (err) {
        if (err.code === '40001' && attempt < maxRetries - 1) {
          // Serialization failure — safe to retry
          await sleep(Math.random() * 100);  // Jittered backoff
          continue;
        }
        throw err;
      }
    }
  }
\`\`\`

**When NOT to use Serializable**:
- Read-heavy workloads (reports, dashboards) — Read Committed is fine
- Simple CRUD without cross-row invariants
- When \`SELECT ... FOR UPDATE\` solves the specific problem more efficiently
- High-contention write workloads where abort rate would exceed 20-30%`
      },
    ],

    dataModel: {
      description: 'Isolation levels comparison and anomaly prevention',
      schema: `SQL Standard Isolation Levels:
  ┌─────────────────────┬────────────┬─────────────────┬─────────┐
  │ Level               │ Dirty Read │ Non-Repeatable  │ Phantom │
  ├─────────────────────┼────────────┼─────────────────┼─────────┤
  │ Read Uncommitted    │ Possible   │ Possible        │Possible │
  │ Read Committed      │ Prevented  │ Possible        │Possible │
  │ Repeatable Read     │ Prevented  │ Prevented       │Possible │
  │ Serializable        │ Prevented  │ Prevented       │Prevented│
  └─────────────────────┴────────────┴─────────────────┴─────────┘

PostgreSQL Implementation:
  Read Committed   → per-statement snapshots (MVCC)
  Repeatable Read  → per-transaction snapshot (Snapshot Isolation)
  Serializable     → SSI (snapshot + predicate lock tracking)

MySQL InnoDB Implementation:
  Read Committed   → per-statement snapshots + row locks
  Repeatable Read  → per-transaction snapshot + gap locks
  Serializable     → shared locks on all reads (SELECT → SELECT ... LOCK IN SHARE MODE)

Lock Types (MySQL InnoDB):
  Record lock:  Locks a single index record
  Gap lock:     Locks the gap between index records
  Next-key lock: Record lock + gap lock (prevents phantoms)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 9. WAL & Durability (data)
  // ─────────────────────────────────────────────────────────
  {
    id: 'wal-durability',
    title: 'WAL & Durability',
    icon: 'fileText',
    color: '#8b5cf6',
    questions: 7,
    description: 'Write-ahead logging for database durability — ensuring committed transactions survive crashes through sequential log-structured persistence.',
    concepts: [
      'Write-ahead log protocol',
      'Fsync and durability guarantees',
      'Group commit optimization',
      'Log sequence numbers (LSN)',
      'Checkpointing and log truncation',
      'WAL-based replication',
      'Crash recovery (ARIES protocol)',
    ],
    tips: [
      'WAL is the foundation of ACID durability — "write the log before the data page" is the golden rule',
      'Fsync forces data from OS page cache to physical storage — without it, a power failure can lose "committed" data',
      'Group commit batches multiple transaction WAL writes into a single fsync, dramatically improving throughput',
      'PostgreSQL WAL segment files are 16MB by default; they are recycled after checkpointing',
      'In interviews, connect WAL to replication: the replica replays the leader\'s WAL stream',
      'The ARIES recovery algorithm (used by most databases) has three phases: Analysis, Redo, Undo',
    ],

    introduction: `The **Write-Ahead Log** (WAL) is the most fundamental mechanism for ensuring database durability. The protocol is deceptively simple: before any change is applied to the actual data pages on disk, a record of that change must be written to a sequential, append-only log file and fsynced to durable storage. If the database process crashes after writing the WAL record but before updating the data pages, the system replays the log on startup and reconstructs a consistent state.

Every major relational database relies on WAL: **PostgreSQL**, **MySQL/InnoDB**, **SQLite**, **SQL Server**, and **Oracle**. Beyond relational databases, the pattern extends to LSM-tree engines (**RocksDB**, **LevelDB**, **Cassandra**), distributed consensus systems (**etcd Raft log**, **ZooKeeper ZAB**), and message brokers (**Kafka's commit log**). The WAL is, conceptually, the source of truth — the data files are merely a materialized view of the log.

The performance characteristics of WAL are favorable because log writes are **sequential** (append-only), which is the fastest I/O pattern for both SSDs and HDDs. The main bottleneck is **fsync** — forcing the operating system to flush its page cache to physical storage. Modern databases use **group commit** to amortize the fsync cost across many transactions, achieving tens of thousands of commits per second while maintaining full durability.`,

    keyQuestions: [
      {
        question: 'How does the WAL protocol guarantee durability and atomicity?',
        answer: `**WAL protocol guarantees**: If the WAL record for a transaction is fsynced to disk, the transaction is durable — even if the database crashes immediately after.

\`\`\`
Write path with WAL:

  Client: INSERT INTO orders VALUES (...)
        │
        ▼
  ┌─────────────────────┐
  │ 1. Write WAL record  │ ← Append to WAL buffer
  │    (TxID, table,     │    (in memory, fast)
  │     old/new values)  │
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ 2. Fsync WAL to disk │ ← Expensive! (forces durable write)
  │    (or group commit)  │    This is the commit point.
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ 3. Update buffer pool│ ← In-memory page (fast, not durable yet)
  │    (data page in RAM)│
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ 4. Background flush  │ ← Checkpoint writes dirty pages to disk
  │    (data files)      │    (can happen much later)
  └─────────────────────┘
\`\`\`

**Crash scenarios**:
\`\`\`
  Crash at step 1 (before fsync):
    WAL record not durable → transaction lost
    Client did not receive "COMMIT OK" → correct behavior

  Crash at step 2 (after fsync, before data page update):
    WAL record is durable → on restart, REDO replay
    Replays WAL forward → updates data pages → consistent state

  Crash at step 3 (after data page in memory, before flush):
    Same as step 2 — data page not on disk, but WAL is
    Recovery replays WAL → consistent state

  Crash at step 4 (after flush):
    Everything is durable → no recovery needed
\`\`\`

**Atomicity via WAL**:
- Each transaction's WAL records are marked with BEGIN and COMMIT/ABORT
- On recovery, only transactions with a COMMIT record are redone
- Transactions without COMMIT are undone (rolled back)
- Result: Every transaction is either fully applied or fully absent`
      },
      {
        question: 'What is group commit and how does it improve throughput?',
        answer: `**Problem**: Fsync is slow (~1-10ms on SSD, ~10-20ms on HDD). If every transaction fsyncs individually, throughput is limited to 100-1000 TPS.

\`\`\`
Without group commit (individual fsync):
  Tx1: WAL write → fsync (2ms) → done       ← 2ms per tx
  Tx2:              WAL write → fsync (2ms) → done
  Tx3:                          WAL write → fsync (2ms) → done
  Throughput: ~500 TPS (1000ms / 2ms)

With group commit (batched fsync):
  Tx1: WAL write ──┐
  Tx2: WAL write ──┤── single fsync (2ms) → all 3 done
  Tx3: WAL write ──┘
  Throughput: ~15,000+ TPS (many transactions per fsync)
\`\`\`

**How it works in PostgreSQL**:
\`\`\`
  1. Transaction writes WAL record to shared WAL buffer
  2. Transaction signals "ready to commit"
  3. First transaction to arrive becomes the GROUP LEADER
  4. Leader waits briefly (wal_writer_delay, default 200ms)
     to accumulate more transactions in the group
  5. Leader issues ONE fsync for the entire group
  6. All transactions in the group are now durable
  7. All transactions wake up and return "COMMIT OK"

  Timeline:
  ┌─────────────────────────────────────────────┐
  │ 0ms: Tx1 writes WAL, becomes group leader   │
  │ 0.1ms: Tx2 writes WAL, joins group          │
  │ 0.3ms: Tx3 writes WAL, joins group          │
  │ ...                                          │
  │ 0.5ms: Leader decides group is large enough  │
  │ 0.5-2.5ms: Single fsync for all WAL records  │
  │ 2.5ms: All transactions committed             │
  └─────────────────────────────────────────────┘
\`\`\`

**PostgreSQL tuning**:
\`\`\`
  wal_writer_delay = 200ms     # How long leader waits for group
  commit_delay = 10us          # Additional delay to grow the group
  commit_siblings = 5          # Only delay if N other txs are active

  For high-throughput OLTP:
    commit_delay = 100us       # Wait slightly longer for bigger groups
    commit_siblings = 10
\`\`\`

**Trade-off**: Group commit adds slight latency to individual transactions (they wait for the group) but dramatically improves overall throughput. With 100 concurrent transactions, one fsync serves all 100 — a 100x improvement in fsync efficiency.`
      },
      {
        question: 'How does WAL-based replication work in PostgreSQL?',
        answer: `**PostgreSQL streaming replication**: The leader ships its WAL stream to replicas, which replay it to maintain identical copies.

\`\`\`
Architecture:

  ┌────────────────┐    WAL Stream     ┌────────────────┐
  │    Leader      │ ────────────────► │   Replica 1    │
  │                │    (continuous)    │  (read-only)   │
  │ Client writes  │                   │ Replays WAL    │
  │      ↓         │    WAL Stream     │                │
  │ WAL → Pages    │ ────────────────► ┌────────────────┐
  └────────────────┘                   │   Replica 2    │
                                       │  (read-only)   │
                                       └────────────────┘

  WAL Stream:
  [...LSN:100][LSN:101][LSN:102][LSN:103] →→→
       │          │         │         │
       ▼          ▼         ▼         ▼
    Replica applies each WAL record in order
\`\`\`

**Synchronous vs Asynchronous replication**:
\`\`\`
  Asynchronous (default):
    Leader: WAL write → fsync → ACK client → ship to replica (async)
    Risk: Leader crash before replica receives → data loss
    Latency: No added latency (replica is fire-and-forget)

  Synchronous:
    Leader: WAL write → fsync → ship to replica → replica fsyncs
            → replica ACKs → ACK client
    Risk: No data loss (at least one replica confirmed)
    Latency: Added network round-trip (~1-5ms same region)

  Configuration:
    synchronous_standby_names = 'replica1'  # Sync to replica1
    synchronous_commit = on                 # Wait for sync replica
\`\`\`

**Replication lag monitoring**:
\`\`\`
  On leader:
    SELECT client_addr, state,
           pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag,
           pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag
    FROM pg_stat_replication;

    client_addr  │ state     │ send_lag │ replay_lag
    ─────────────┼───────────┼──────────┼───────────
    10.0.1.2     │ streaming │   0      │  1048576
    10.0.1.3     │ streaming │   0      │  524288
    (replay_lag in bytes of WAL not yet applied)
\`\`\`

**Failover process**:
1. Leader becomes unavailable (health check fails)
2. Replica with least replay lag is promoted: \`pg_promote()\`
3. Promoted replica starts accepting writes
4. DNS/proxy updated to point to new leader
5. Old leader (when recovered) re-joins as replica
6. Remaining replicas reconfigure to follow new leader`
      },
      {
        question: 'What is the ARIES crash recovery algorithm?',
        answer: `**ARIES** (Algorithm for Recovery and Isolation Exploiting Semantics) is the standard crash recovery algorithm used by most modern databases (PostgreSQL, MySQL, SQL Server, DB2).

\`\`\`
ARIES has three phases:

  ┌──────────────────────────────────────────────────┐
  │                 WAL on disk                       │
  │ [Checkpoint][E1][E2][E3][E4][E5][E6][E7][CRASH]  │
  └──────────────────────────────────────────────────┘
         │
         ▼
  Phase 1: ANALYSIS (determine what needs recovery)
    Scan WAL from last checkpoint forward
    Build two lists:
    - Redo list: all changes that may not be on disk
    - Undo list: transactions that were active at crash
         │
         ▼
  Phase 2: REDO (repeat history)
    Replay ALL WAL records from checkpoint forward
    (even for aborted transactions — redo everything)
    This brings data pages to their exact state at crash
         │
         ▼
  Phase 3: UNDO (rollback incomplete transactions)
    For each transaction in undo list:
      Walk backward through its WAL records
      Apply UNDO (compensating) actions
      Write CLR (Compensation Log Record) to WAL
    Data pages now reflect only committed transactions
\`\`\`

**Why redo EVERYTHING, even aborted transactions?**
\`\`\`
  Scenario:
    Tx1: UPDATE balance=50 (committed, but page not flushed)
    Tx2: UPDATE name='Bob' (NOT committed at crash)

    Same data page might have BOTH changes in the buffer pool.
    The page on disk has NEITHER change.

    REDO phase replays both → page matches pre-crash state
    UNDO phase rolls back Tx2 → only Tx1's change remains

  This is simpler and more correct than trying to selectively
  redo only committed transactions.
\`\`\`

**Compensation Log Records (CLR)**:
\`\`\`
  During UNDO:
    Tx2's WAL:  [SET name='Bob' (old='Alice')]
    UNDO action: SET name='Alice' (restore old value)
    CLR written: [UNDO of Tx2: SET name='Alice']

  Why CLR? If system crashes DURING recovery:
    Next recovery sees CLR → knows this UNDO was already done
    Prevents infinite undo loops
\`\`\`

**Performance insight**: ARIES recovery time is proportional to the amount of WAL since the last checkpoint — not the database size. This is why frequent checkpointing (every 5-15 minutes) is important for fast recovery.`
      },
    ],

    dataModel: {
      description: 'WAL record structure and recovery flow',
      schema: `WAL Record Format:
  ┌──────────┬─────────┬───────────┬──────────┬──────────┬────────┐
  │   LSN    │  TxnID  │  TableID  │ PageID   │ OldValue │NewValue│
  │ (seq #)  │         │           │          │ (undo)   │ (redo) │
  └──────────┴─────────┴───────────┴──────────┴──────────┴────────┘

WAL Segment Layout (PostgreSQL):
  pg_wal/
    000000010000000000000001  (16MB segment)
    000000010000000000000002  (16MB segment)
    000000010000000000000003  (current, being written)

Checkpoint Record:
  checkpoint_lsn:    LSN of this checkpoint
  redo_lsn:          Start point for recovery
  active_txns:       [TxnID, ...]  (transactions in progress)
  dirty_pages:       [(TableID, PageID, oldest_lsn), ...]

ARIES Recovery Phases:
  1. Analysis: Scan WAL from last checkpoint → build redo/undo lists
  2. Redo:     Replay WAL forward from redo_lsn → restore pre-crash state
  3. Undo:     Walk backward through active txns → rollback uncommitted
  Recovery time ≈ WAL_since_checkpoint / disk_read_speed`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 10. MVCC (data)
  // ─────────────────────────────────────────────────────────
  {
    id: 'mvcc',
    title: 'Multi-Version Concurrency Control',
    icon: 'gitBranch',
    color: '#8b5cf6',
    questions: 7,
    description: 'MVCC enables concurrent reads and writes without locking by maintaining multiple versions of each row, providing snapshot isolation in modern databases.',
    concepts: [
      'Version chains and tuple visibility',
      'Transaction snapshots',
      'Readers never block writers (and vice versa)',
      'PostgreSQL MVCC (xmin/xmax)',
      'MySQL InnoDB MVCC (undo log rollback segments)',
      'VACUUM and garbage collection of old versions',
      'MVCC impact on storage and bloat',
      'Snapshot isolation vs serializable',
    ],
    tips: [
      'MVCC means every UPDATE creates a new row version — the old version remains until garbage collected',
      'PostgreSQL stores old versions in the main table (heap) and relies on VACUUM to clean them up',
      'MySQL stores old versions in the undo log (rollback segment) — the main page always has the latest version',
      'The key interview insight: MVCC enables non-blocking reads but at the cost of storage bloat and garbage collection overhead',
      'Long-running transactions in PostgreSQL prevent VACUUM from cleaning old versions → table bloat',
      'Snapshot isolation (MVCC-based) prevents dirty reads, non-repeatable reads, and phantoms but allows write skew',
    ],

    introduction: `**Multi-Version Concurrency Control** (MVCC) is the concurrency mechanism used by virtually all modern relational databases — PostgreSQL, MySQL InnoDB, Oracle, SQL Server (snapshot isolation mode), and CockroachDB. The core principle is that instead of locking rows to prevent concurrent access, the database maintains **multiple versions** of each row. Readers see a consistent snapshot of the database at a specific point in time, while writers create new versions without disturbing existing ones.

The revolutionary property of MVCC is that **readers never block writers and writers never block readers**. A long-running analytical query can read a consistent snapshot while concurrent transactions insert, update, and delete rows — the query sees the versions that existed at the time it started, and the new versions are invisible to it. This is a dramatic improvement over lock-based concurrency, where a write lock on a row would block all readers until the transaction commits.

However, MVCC is not without costs. Old versions must be **garbage collected** (VACUUM in PostgreSQL, purge thread in MySQL) — and if this process falls behind, the database accumulates **bloat** (wasted space from dead tuples). Long-running transactions exacerbate this because they prevent the garbage collector from removing versions that might still be visible to the transaction's snapshot. Understanding MVCC internals is essential for diagnosing performance problems like table bloat, VACUUM lag, and transaction ID wraparound.`,

    keyQuestions: [
      {
        question: 'How does PostgreSQL implement MVCC with xmin/xmax?',
        answer: `**PostgreSQL MVCC** stores all row versions in the main heap table, using hidden system columns to determine visibility.

\`\`\`
Every row (tuple) has hidden columns:
  ┌────────┬────────┬──────────┬──────────────────────────┐
  │  xmin  │  xmax  │  data    │  meaning                 │
  ├────────┼────────┼──────────┼──────────────────────────┤
  │  100   │   0    │ Alice,30 │ Created by Tx 100, alive │
  └────────┴────────┴──────────┴──────────────────────────┘

  xmin = transaction ID that created this version
  xmax = transaction ID that deleted/updated this version (0 = alive)
\`\`\`

**UPDATE creates two tuples**:
\`\`\`
  Tx 105: UPDATE users SET age=31 WHERE name='Alice';

  Before:
  ┌────────┬────────┬──────────┐
  │xmin=100│xmax=0  │Alice, 30 │  ← live version
  └────────┴────────┴──────────┘

  After:
  ┌────────┬────────┬──────────┐
  │xmin=100│xmax=105│Alice, 30 │  ← dead (marked by Tx 105)
  ├────────┼────────┼──────────┤
  │xmin=105│xmax=0  │Alice, 31 │  ← new live version
  └────────┴────────┴──────────┘
\`\`\`

**Visibility check** (simplified):
\`\`\`
  Is tuple visible to transaction T (snapshot_xid = 103)?

  Tuple (xmin=100, xmax=105):
    1. xmin=100 < snapshot_xid=103 and Tx 100 committed? YES
    2. xmax=105 > snapshot_xid=103 → Tx 105 not yet visible
    → Tuple IS visible to T (it sees the old version)

  Tuple (xmin=105, xmax=0):
    1. xmin=105 > snapshot_xid=103 → created AFTER snapshot
    → Tuple is NOT visible to T

  Result: T sees Alice with age=30 (the version before Tx 105)
\`\`\`

**Snapshot data structure** (pg_snapshot):
\`\`\`
  xmin:       100  (oldest active transaction)
  xmax:       106  (first unassigned transaction ID)
  xip_list:   [102, 104]  (in-progress transaction IDs)

  Rules:
  - TxID < xmin → definitely committed (visible)
  - TxID >= xmax → definitely not started yet (invisible)
  - TxID in xip_list → in progress (invisible)
  - Otherwise → check pg_xact (committed or aborted)
\`\`\``
      },
      {
        question: 'How does MySQL InnoDB MVCC differ from PostgreSQL?',
        answer: `**MySQL InnoDB** stores only the latest version in the main table page and keeps old versions in the **undo log** (rollback segment).

\`\`\`
PostgreSQL approach (versions in heap):
  Heap page:
  ┌────────────────────────────────────────┐
  │ (xmin=100, xmax=105) Alice, 30  DEAD  │
  │ (xmin=105, xmax=0)   Alice, 31  LIVE  │
  │ (xmin=90,  xmax=0)   Bob, 25    LIVE  │
  └────────────────────────────────────────┘
  Old versions live alongside current ones → bloat

MySQL InnoDB approach (latest in page, old in undo):
  Clustered index page:
  ┌────────────────────────────────────┐
  │ PK=1  Alice, 31  (latest version)  │ ← always current
  │ PK=2  Bob, 25    (latest version)  │
  └──────────────┬─────────────────────┘
                 │ roll_ptr
                 ▼
  Undo log (rollback segment):
  ┌────────────────────────────────┐
  │ PK=1  Alice, 30 (prev version) │ ← for snapshot reads
  │       roll_ptr → even older    │
  └────────────────────────────────┘
\`\`\`

**Key differences**:

| Aspect | PostgreSQL | MySQL InnoDB |
|--------|-----------|-------------|
| Old version location | Main heap | Undo log (separate) |
| Latest version | Not special (any tuple) | Always in clustered index |
| Garbage collection | VACUUM (scans heap) | Purge thread (trims undo log) |
| Bloat risk | Table grows with dead tuples | Undo log grows, table stays compact |
| UPDATE cost | Full new tuple + dead old tuple | In-place update + undo entry |
| Index impact | Dead tuples in indexes too | Only live tuples in secondary indexes |
| HOT updates | Yes (Heap-Only Tuple) if no indexed col changes | N/A (in-place) |

**Why this matters**:
\`\`\`
  Long-running transaction impact:

  PostgreSQL:
    Long Tx prevents VACUUM → dead tuples accumulate in heap
    Table size grows: 10GB → 30GB (bloat)
    Index bloat too → query performance degrades
    Fix: pg_repack, VACUUM FULL (locks table)

  MySQL InnoDB:
    Long Tx prevents undo purge → undo log grows
    Table size: stable (only latest versions)
    Undo tablespace grows: 1GB → 10GB
    Fix: Kill long transaction, undo space reclaimed automatically
\`\`\`

**PostgreSQL advantage**: Simpler architecture, no undo log management
**MySQL advantage**: Table stays compact, less index bloat`
      },
      {
        question: 'What causes table bloat in PostgreSQL and how do you fix it?',
        answer: `**Table bloat** occurs when dead tuples (old MVCC versions) accumulate faster than VACUUM can clean them up.

\`\`\`
Bloat lifecycle:

  Normal operation:
  ┌─────────┐    UPDATE    ┌─────────┐    VACUUM    ┌─────────┐
  │ 10GB    │ ──────────► │ 12GB    │ ──────────► │ 10.5GB  │
  │ 1M live │  (creates   │ 1M live │  (removes   │ 1M live │
  │ tuples  │  dead tuples)│200K dead│  dead tuples)│ 0 dead  │
  └─────────┘              └─────────┘              └─────────┘

  Bloat scenario (VACUUM cannot keep up):
  ┌─────────┐   continuous   ┌──────────┐   VACUUM   ┌──────────┐
  │ 10GB    │ ─────────────►│ 30GB     │ ─────────►│ 28GB     │
  │ 1M live │   UPDATEs     │ 1M live  │  can only  │ 1M live  │
  │ tuples  │               │ 5M dead  │  remove    │ 4M dead  │
  └─────────┘               └──────────┘  some dead  └──────────┘
\`\`\`

**Common causes**:
1. **Long-running transactions**: Prevent VACUUM from removing versions visible to that transaction
2. **Aggressive UPDATE patterns**: Frequent updates to the same rows create many dead versions
3. **VACUUM throttling**: autovacuum too slow (default settings too conservative for high-write tables)
4. **Disabled autovacuum**: Some teams disable it (bad idea!) for "performance"

**Monitoring bloat**:
\`\`\`
  -- Estimated bloat ratio
  SELECT relname, n_live_tup, n_dead_tup,
         round(n_dead_tup::numeric / greatest(n_live_tup, 1) * 100, 1) as bloat_pct
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 10000
  ORDER BY n_dead_tup DESC;

  -- Table size vs estimated live data size
  SELECT pg_size_pretty(pg_total_relation_size('orders')) as total_size,
         pg_size_pretty(pg_relation_size('orders')) as heap_size;
  -- If heap_size >> expected (rows * avg_row_size), bloat is present
\`\`\`

**Fixing bloat**:
\`\`\`
  Option 1: Tune autovacuum (prevent future bloat)
    ALTER TABLE orders SET (
      autovacuum_vacuum_scale_factor = 0.01,  -- vacuum after 1% dead (default 20%)
      autovacuum_vacuum_cost_delay = 2,       -- less throttling
      autovacuum_vacuum_cost_limit = 1000     -- more work per cycle
    );

  Option 2: pg_repack (online, no locks)
    pg_repack --table orders --no-superuser-check
    (creates a new copy, swaps atomically)

  Option 3: VACUUM FULL (offline, locks table)
    VACUUM FULL orders;  -- ACCESS EXCLUSIVE lock, rewrites entire table
    (only as last resort — blocks all reads and writes)
\`\`\``
      },
      {
        question: 'How does MVCC interact with indexes in PostgreSQL?',
        answer: `**PostgreSQL indexes point to heap tuples** (including dead ones). This creates unique challenges for MVCC.

\`\`\`
Index → Heap relationship:

  B-tree Index (on name):
  ┌────────────────┐
  │ "Alice" → TID1 │──► Heap: (xmin=100, xmax=105) Alice,30 DEAD
  │ "Alice" → TID2 │──► Heap: (xmin=105, xmax=0)   Alice,31 LIVE
  │ "Bob"   → TID3 │──► Heap: (xmin=90,  xmax=0)   Bob,25   LIVE
  └────────────────┘

  Problem: Index has TWO entries for "Alice" — one dead, one live
  An index scan must visit the heap to check visibility (MVCC check)
\`\`\`

**Visibility map optimization**:
\`\`\`
  Visibility Map: bitmap, 1 bit per heap page
    0 = page has dead tuples (must check visibility)
    1 = page is all-visible (skip MVCC check)

  Index-Only Scan:
    Index lookup → check visibility map
    If page is all-visible → return data from index directly
    If page has dead tuples → must visit heap to verify

  VACUUM sets visibility map bits after removing dead tuples
  This is why regular VACUUM is critical for index-only scan performance
\`\`\`

**HOT updates (Heap-Only Tuples)**:
\`\`\`
  Normal UPDATE (indexed column changes):
    1. Create new heap tuple
    2. Insert new index entry pointing to new tuple
    3. Mark old tuple dead

  HOT UPDATE (only non-indexed columns change):
    1. Create new heap tuple on SAME PAGE
    2. Link old tuple → new tuple (HOT chain)
    3. NO new index entry needed!

  Benefit: Dramatically reduces index bloat for common UPDATE patterns
  (e.g., updating "last_login" timestamp — not in any index)

  Check HOT update ratio:
    SELECT relname, n_tup_upd, n_tup_hot_upd,
           round(n_tup_hot_upd::numeric / greatest(n_tup_upd, 1) * 100) as hot_pct
    FROM pg_stat_user_tables
    WHERE n_tup_upd > 0;
    -- Target: >90% HOT updates for frequently updated tables
\`\`\`

**Index bloat mitigation**:
- Regular VACUUM removes dead heap tuples and cleans index entries pointing to them
- REINDEX rebuilds indexes without dead entries (online in PostgreSQL 12+)
- Design indexes carefully — fewer indexes = less MVCC overhead per UPDATE
- Monitor index size vs expected size: \`pg_relation_size('idx_name')\``
      },
    ],

    dataModel: {
      description: 'MVCC version chain and visibility check',
      schema: `PostgreSQL MVCC Tuple Header:
  ┌──────────┬──────────┬───────────┬──────────┬──────────────┐
  │  xmin    │  xmax    │  cmin/cmax│ ctid     │  infomask    │
  │ (creator)│ (deleter)│ (cmd seq) │(location)│ (status bits)│
  └──────────┴──────────┴───────────┴──────────┴──────────────┘

MySQL InnoDB Row Format:
  ┌──────────┬──────────┬──────────┬──────────────────────────┐
  │  TxID    │ Roll Ptr │   PK     │  Column Data             │
  │ (creator)│ (→undo)  │          │  (latest version always) │
  └──────────┴──────────┴──────────┴──────────────────────────┘

Visibility Check Algorithm (PostgreSQL):
  Input: tuple (xmin, xmax), snapshot (snap_xmin, snap_xmax, xip)
  1. If xmin not committed → invisible
  2. If xmin >= snap_xmax → invisible (started after snapshot)
  3. If xmin in xip → invisible (in-progress at snapshot time)
  4. If xmax = 0 → visible (not deleted)
  5. If xmax not committed → visible (delete not final)
  6. If xmax >= snap_xmax → visible (deleted after snapshot)
  7. If xmax in xip → visible (deleter in-progress)
  8. Otherwise → invisible (deleted before snapshot)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 11. Delivery Semantics (data)
  // ─────────────────────────────────────────────────────────
  {
    id: 'delivery-semantics',
    title: 'Delivery Semantics',
    icon: 'send',
    color: '#8b5cf6',
    questions: 7,
    description: 'At-most-once, at-least-once, and exactly-once message delivery guarantees in distributed systems and message queues.',
    concepts: [
      'At-most-once delivery (fire and forget)',
      'At-least-once delivery (retry with acks)',
      'Exactly-once semantics (idempotent processing)',
      'Consumer offsets and checkpointing',
      'Kafka delivery guarantees',
      'Deduplication strategies',
      'Transactional outbox for reliable publishing',
    ],
    tips: [
      'True exactly-once delivery is impossible in distributed systems — what we achieve is effectively-once via idempotent consumers',
      'At-least-once + idempotent consumer = effectively exactly-once processing',
      'Kafka achieves exactly-once semantics via idempotent producer + transactional writes + consumer read_committed',
      'The key interview insight: delivery guarantees are a spectrum, and the guarantee depends on ALL components (producer, broker, consumer)',
      'At-most-once is appropriate for metrics, logs, and non-critical events where occasional loss is acceptable',
      'For financial systems, at-least-once delivery with deduplication at the consumer is the practical standard',
    ],

    introduction: `**Delivery semantics** describe the guarantees a messaging system provides about whether and how many times a message will be delivered to a consumer. The three levels are **at-most-once** (message may be lost but never duplicated), **at-least-once** (message is never lost but may be duplicated), and **exactly-once** (message is delivered precisely once). This is one of the most frequently discussed topics in distributed systems design because the choice fundamentally affects system correctness, complexity, and performance.

The uncomfortable truth is that **exactly-once delivery is theoretically impossible** in a distributed system with unreliable networks (a consequence of the Two Generals Problem). What systems like Kafka actually provide is **effectively exactly-once** through a combination of idempotent producers, transactional writes, and consumer-side deduplication. The message may technically be delivered more than once at the network level, but the system ensures it is processed exactly once at the application level.

In practice, most production systems use **at-least-once delivery** (the message is retried until acknowledged) combined with **idempotent consumers** (processing a message twice produces the same result as processing it once). This combination provides strong guarantees without the complexity and performance overhead of distributed transactions. The critical design decision is where to place the deduplication logic — in the broker (Kafka exactly-once), in the consumer (idempotency keys), or in the database (unique constraints).`,

    keyQuestions: [
      {
        question: 'What are the three delivery semantics and when do you use each?',
        answer: `**Three delivery guarantees**:

\`\`\`
At-Most-Once (fire and forget):
  Producer ──► Broker ──► Consumer
     │          │           │
     │ send()   │ maybe     │ process()
     │ (no ack) │ delivered │ (maybe not)
     │          │           │
  Message may be lost. Never duplicated.

At-Least-Once (retry until ack):
  Producer ──► Broker ──► Consumer
     │          │           │
     │ send()   │ deliver   │ process()
     │          │◄── ACK ───│
     │          │           │
  If ACK lost: │ deliver   │ process() (again!)
               │◄── ACK ───│
  Message never lost. May be duplicated.

Exactly-Once (effectively):
  Producer ──► Broker ──► Consumer
     │          │           │
     │ send()   │ deliver   │ process()
     │ (idempot)│ (dedup)   │ (idempotent)
     │          │           │
  Message delivered and processed exactly once.
  (Requires coordination across all components.)
\`\`\`

**When to use each**:

| Semantic | Use case | Example |
|----------|----------|---------|
| At-most-once | Metrics, telemetry, non-critical logs | StatsD UDP metrics, click tracking |
| At-least-once | Most business events, notifications | Order events, email triggers, webhooks |
| Exactly-once | Financial transactions, inventory | Payment processing, stock trades |

**Cost comparison**:
\`\`\`
                 Complexity    Latency    Throughput
  At-most-once:    Low          Low        Highest
  At-least-once:   Medium       Medium     High
  Exactly-once:    High         Higher     Lower
\`\`\`

**Key insight**: At-least-once with idempotent consumers is the sweet spot for most systems. It provides strong guarantees with manageable complexity. Reserve exactly-once for scenarios where duplication has financial or safety consequences.`
      },
      {
        question: 'How does Kafka achieve exactly-once semantics?',
        answer: `**Kafka exactly-once** is built on three pillars: idempotent producer, transactional writes, and consumer isolation.

\`\`\`
Pillar 1: Idempotent Producer
  Producer assigns a sequence number to each message.
  Broker deduplicates based on (ProducerID, SequenceNumber).

  Producer                    Broker
  seq=1: {"order":42} ──────► Stored ✓
  seq=2: {"order":43} ──────► Stored ✓
  seq=2: {"order":43} ──────► Deduplicated! (seq 2 already seen)
                               Returns ACK without storing again

  Config: enable.idempotence=true

Pillar 2: Transactional Writes
  Multiple writes (to different partitions/topics) are atomic.

  BEGIN TRANSACTION
    Write to orders-topic partition 0  ──► Staged
    Write to inventory-topic partition 2 ──► Staged
    Write consumer offset update ──► Staged
  COMMIT TRANSACTION
    All three writes become visible atomically
    OR all are rolled back on failure

  Config: transactional.id="order-processor-1"

Pillar 3: Consumer read_committed
  Consumer only sees messages from committed transactions.

  Consumer config: isolation.level=read_committed
  (Messages from aborted transactions are skipped)
\`\`\`

**End-to-end flow**:
\`\`\`
  Producer (idempotent) ──► Kafka Broker ──► Consumer (read_committed)
        │                       │                    │
  Assigns seq numbers    Deduplicates &       Only sees committed
  Retries safely         stores atomically    messages
        │                       │                    │
        └─── exactly-once ──────┴──── exactly-once ──┘
\`\`\`

**Consume-transform-produce pattern**:
\`\`\`
  consumer.beginTransaction();
  records = consumer.poll();

  for (record : records) {
    result = transform(record);
    producer.send(outputTopic, result);  // Part of transaction
  }

  // Commit offsets AND produced messages atomically
  producer.sendOffsetsToTransaction(offsets, consumerGroupId);
  producer.commitTransaction();
  // If crash here → transaction aborted → consumer re-reads, no duplicates
\`\`\`

**Performance cost**: ~3-5% throughput reduction compared to at-least-once (extra round-trips for transaction coordination). For most use cases, this is acceptable.`
      },
      {
        question: 'How do you implement at-least-once with idempotent consumers?',
        answer: `**Pattern**: Producer retries on failure. Consumer uses deduplication to handle duplicates.

\`\`\`
Architecture:

  Producer                Message Queue              Consumer
  ┌──────┐   retry on    ┌──────────┐    deliver    ┌──────────┐
  │ App  │──► timeout ──►│  Kafka/  │──────────────►│ Consumer │
  │      │               │  SQS/    │               │ + Dedup  │
  └──────┘               │  RabbitMQ│               └────┬─────┘
                         └──────────┘                    │
                                                   ┌─────▼──────┐
                                                   │ Dedup Store│
                                                   │ (Redis/DB) │
                                                   └────────────┘
\`\`\`

**Consumer deduplication strategies**:

\`\`\`
Strategy 1: Message ID deduplication (explicit)
  function processMessage(msg) {
    // Check if already processed
    if (await redis.get("processed:" + msg.id)) {
      log("Duplicate, skipping:", msg.id);
      return ack(msg);
    }

    // Process the message
    await handleOrder(msg.payload);

    // Mark as processed (with TTL for cleanup)
    await redis.set("processed:" + msg.id, "1", "EX", 86400);
    ack(msg);
  }

Strategy 2: Database unique constraint (implicit)
  // The database enforces idempotency
  INSERT INTO orders (order_id, customer_id, amount)
  VALUES ($1, $2, $3)
  ON CONFLICT (order_id) DO NOTHING;
  -- Duplicate order_id → silently ignored

Strategy 3: Conditional write (optimistic)
  UPDATE inventory SET quantity = quantity - 1
  WHERE product_id = $1 AND version = $2;
  -- If version changed (concurrent update), retry
  -- Natural deduplication via version check
\`\`\`

**Dedup store considerations**:

| Store | Latency | Durability | TTL support | Use case |
|-------|---------|-----------|-------------|----------|
| Redis | <1ms | Optional (AOF) | Native | High-throughput, acceptable loss |
| PostgreSQL | 2-5ms | Strong | Via cron | Financial, must not lose dedup state |
| DynamoDB | 5-10ms | Strong | Native (TTL) | Serverless, auto-scaling |
| In-memory | <0.1ms | None | Manual | Single-consumer, restart-safe with replay |

**Critical edge case: consume-then-crash**:
\`\`\`
  1. Consumer reads message
  2. Consumer processes message (writes to DB)
  3. Consumer crashes BEFORE acking
  4. Queue redelivers message
  5. Consumer processes AGAIN → DUPLICATE

  Fix: Make step 2 idempotent (unique constraint, conditional write)
  OR: Use transactional outbox (process + ack in same DB transaction)
\`\`\``
      },
      {
        question: 'What is the transactional outbox pattern and how does it ensure reliable messaging?',
        answer: `**Problem**: Writing to a database and publishing to a message queue are two separate operations. If the app crashes between them, the system is inconsistent.

\`\`\`
Unsafe pattern (dual write):
  1. Write to database ── SUCCESS
  2. Publish to Kafka ── CRASH!
  → Database has the change, but Kafka does not
  → Consumer never processes the event

  OR:
  1. Publish to Kafka ── SUCCESS
  2. Write to database ── CRASH!
  → Kafka has the event, but database does not
  → Inconsistency
\`\`\`

**Transactional outbox solution**:
\`\`\`
  ┌──────────────────────────────────────────────┐
  │ Single database transaction:                  │
  │                                               │
  │ 1. INSERT INTO orders (...)                   │
  │ 2. INSERT INTO outbox (                       │
  │      topic='order-events',                    │
  │      key='order:42',                          │
  │      payload='{"event":"created",...}',        │
  │      status='pending'                         │
  │    )                                          │
  │ 3. COMMIT                                     │
  └──────────────────────────────────────────────┘
         │
         │  Both writes are atomic (same transaction)
         ▼
  ┌─────────────────────────────────────┐
  │ Outbox Relay (background process):   │
  │                                      │
  │ 1. SELECT * FROM outbox              │
  │    WHERE status = 'pending'          │
  │    ORDER BY created_at LIMIT 100     │
  │                                      │
  │ 2. Publish each to Kafka             │
  │                                      │
  │ 3. UPDATE outbox SET status='sent'   │
  │    WHERE id IN (...)                 │
  └─────────────────────────────────────┘

  Alternative: CDC (Change Data Capture)
  ┌──────────┐    WAL stream     ┌───────────┐    publish    ┌───────┐
  │ Database │ ──────────────── │ Debezium  │ ────────────► │ Kafka │
  │ (outbox  │  (reads outbox   │  (CDC)    │               │       │
  │  table)  │   changes from   └───────────┘               └───────┘
  └──────────┘   WAL directly)
\`\`\`

**Outbox table schema**:
\`\`\`
  CREATE TABLE outbox (
    id            BIGSERIAL PRIMARY KEY,
    aggregate_id  TEXT NOT NULL,        -- e.g., "order:42"
    event_type    TEXT NOT NULL,        -- e.g., "order.created"
    topic         TEXT NOT NULL,        -- Kafka topic
    payload       JSONB NOT NULL,       -- Event data
    status        TEXT DEFAULT 'pending', -- pending | sent | failed
    created_at    TIMESTAMP DEFAULT NOW(),
    sent_at       TIMESTAMP
  );

  CREATE INDEX idx_outbox_pending ON outbox (status, created_at)
    WHERE status = 'pending';
\`\`\`

**Relay vs CDC trade-offs**:
| Aspect | Polling relay | CDC (Debezium) |
|--------|-------------|----------------|
| Latency | 100ms-5s (poll interval) | ~100ms (real-time from WAL) |
| Complexity | Simple (SQL query + publish) | Requires Debezium + Kafka Connect |
| Throughput | Limited by poll batch size | Very high (WAL is sequential) |
| Ordering | Best-effort (within batch) | Guaranteed (WAL order) |
| Infrastructure | None extra | Debezium + Kafka Connect cluster |`
      },
    ],

    dataModel: {
      description: 'Delivery semantics comparison and consumer offset management',
      schema: `Delivery Guarantee Comparison:
  ┌─────────────────┬──────────┬──────────┬───────────────┐
  │ Guarantee       │ Loss?    │ Duplicate│ Implementation│
  ├─────────────────┼──────────┼──────────┼───────────────┤
  │ At-most-once    │ Possible │    No    │ Fire & forget │
  │ At-least-once   │    No    │ Possible │ Retry + ACK   │
  │ Exactly-once    │    No    │    No    │ Idempotent +  │
  │                 │          │          │ transactional │
  └─────────────────┴──────────┴──────────┴───────────────┘

Kafka Consumer Offset Management:
  Consumer Group: "order-processor"
  ┌─────────┬────────┬──────────────┐
  │Partition│ Offset │ Committed At │
  ├─────────┼────────┼──────────────┤
  │    0    │  4521  │ 2024-01-15   │
  │    1    │  3892  │ 2024-01-15   │
  │    2    │  5103  │ 2024-01-15   │
  └─────────┴────────┴──────────────┘

Transactional Outbox Entry:
  id:           BIGSERIAL
  aggregate_id: TEXT (entity being changed)
  event_type:   TEXT (domain event name)
  topic:        TEXT (destination queue/topic)
  payload:      JSONB (event data)
  status:       pending → sent → archived`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 12. SLI, SLO & SLA (operations)
  // ─────────────────────────────────────────────────────────
  {
    id: 'sli-slo-sla',
    title: 'SLI, SLO & SLA',
    icon: 'barChart',
    color: '#10b981',
    questions: 7,
    description: 'Defining and measuring service reliability through Service Level Indicators, Objectives, and Agreements with error budgets.',
    concepts: [
      'SLI (Service Level Indicator) — what you measure',
      'SLO (Service Level Objective) — what you target',
      'SLA (Service Level Agreement) — what you promise',
      'Error budgets and budget burn rate',
      'The four golden signals (latency, traffic, errors, saturation)',
      'Percentile-based SLIs (p50, p99, p99.9)',
      'SLO-based alerting vs threshold alerting',
    ],
    tips: [
      'SLI is a metric (e.g., 99.2% of requests < 200ms), SLO is a target (99.9%), SLA is a contract with penalties',
      'Error budget = 1 - SLO. For a 99.9% SLO, you have 0.1% error budget = ~43 minutes of downtime per month',
      'Google SRE recommends setting SLOs, not SLAs — SLOs drive engineering decisions, SLAs drive business contracts',
      'Measure SLIs at the client, not the server — server-side metrics miss network issues, TLS handshake time, etc.',
      'In interviews, propose specific SLIs for the system being designed: availability, latency percentiles, throughput, error rate',
      'Error budget policies: if budget is exhausted, freeze feature releases and focus on reliability',
    ],

    introduction: `**SLI** (Service Level Indicator), **SLO** (Service Level Objective), and **SLA** (Service Level Agreement) form a hierarchy for defining, measuring, and communicating service reliability. Originating from Google's **Site Reliability Engineering** (SRE) practice, these concepts provide a data-driven framework for making trade-offs between feature velocity and reliability investment.

An **SLI** is a quantitative measure of some aspect of service health — such as the proportion of requests that return successfully within 200ms. An **SLO** is the target value for that SLI — for example, "99.9% of requests must succeed within 200ms, measured over a 30-day rolling window." An **SLA** is a formal business contract that specifies consequences (usually financial penalties) if the service fails to meet certain SLOs. The relationship is: SLI measures reality, SLO sets the engineering target, and SLA sets the business commitment (typically less aggressive than the SLO to provide a buffer).

The most powerful concept in this framework is the **error budget**: the difference between 100% and the SLO target. A 99.9% availability SLO means 0.1% of requests can fail — that is the error budget. When the budget is healthy, teams can ship features aggressively (accepting some risk). When the budget is nearly exhausted, teams shift focus to reliability work. This transforms the "reliability vs velocity" debate from a political argument into a data-driven decision.`,

    keyQuestions: [
      {
        question: 'What is the relationship between SLI, SLO, and SLA?',
        answer: `**Hierarchy**:
\`\`\`
  SLI (Indicator)  →  What you MEASURE
  SLO (Objective)  →  What you TARGET
  SLA (Agreement)  →  What you PROMISE (with penalties)

  Example for an API service:

  SLI: Availability
    = (successful requests / total requests) × 100
    Current value: 99.95%

  SLO: 99.9% availability over 30-day rolling window
    Status: MEETING SLO (99.95% > 99.9%)

  SLA: 99.5% availability per calendar month
    Penalty: 10% service credit if breached
    Status: Well within SLA (99.95% >> 99.5%)
\`\`\`

**Why SLO is stricter than SLA**:
\`\`\`
  |◄──────── 100% ──────────────────────────────────►|
  |                                                   |
  99.0%        99.5%       99.9%      99.95%    100%
    │            │           │          │          │
    │         SLA floor    SLO target  Current    │
    │            │           │          │          │
    │         (business     (eng       (actual    │
    │          contract)    target)    measured)   │
    │            │           │                     │
    │            │◄─ buffer ─►                     │
    │            │ (SLO gives                      │
    │            │  early warning                   │
    │            │  before SLA breach)              │
\`\`\`

**Common SLI types for web services**:

| SLI Category | What to measure | Example SLO |
|-------------|----------------|-------------|
| Availability | Successful responses / total | 99.9% over 30 days |
| Latency | Requests < threshold | 99th percentile < 200ms |
| Throughput | Requests processed / second | > 10,000 RPS sustained |
| Error rate | 5xx responses / total | < 0.1% over 30 days |
| Freshness | Data age for read endpoints | 95% of reads < 5 min stale |
| Correctness | Valid responses / total | 99.999% correct responses |`
      },
      {
        question: 'How do error budgets work and how do they drive engineering decisions?',
        answer: `**Error budget** = 1 - SLO target. It quantifies how much unreliability is acceptable.

\`\`\`
Error budget calculation:

  SLO: 99.9% availability over 30 days
  Error budget: 100% - 99.9% = 0.1%

  In time:
    30 days × 24h × 60min = 43,200 minutes
    0.1% × 43,200 = 43.2 minutes of allowed downtime

  In requests (at 10,000 RPS):
    30 days × 86,400 sec × 10,000 = 25.92 billion requests
    0.1% × 25.92B = 25.92 million failed requests allowed
\`\`\`

**Error budget policy**:
\`\`\`
  Budget status:              Engineering response:
  ┌─────────────────────────────────────────────────┐
  │ > 50% remaining          Normal development      │
  │ (healthy)                Ship features freely     │
  │                                                   │
  │ 25-50% remaining         Caution                  │
  │ (yellow)                 Risky deploys need review │
  │                                                   │
  │ < 25% remaining          Reliability focus         │
  │ (red)                    Freeze features           │
  │                          Fix reliability issues    │
  │                                                   │
  │ 0% (exhausted)           Full stop                 │
  │                          All hands on reliability  │
  │                          No feature work until     │
  │                          budget recovers           │
  └─────────────────────────────────────────────────┘
\`\`\`

**Burn rate alerting** (Google SRE recommended):
\`\`\`
  Normal burn rate: 1x (using budget evenly over 30 days)
  = 43.2 min / 30 days = 1.44 min/day allowed downtime

  Alert thresholds:
  ┌────────────┬───────────┬─────────────────────────┐
  │ Burn rate  │ Window    │ Action                  │
  ├────────────┼───────────┼─────────────────────────┤
  │ 14.4x      │ 1 hour    │ Page on-call (critical) │
  │ 6x         │ 6 hours   │ Page on-call (high)     │
  │ 3x         │ 3 days    │ Ticket (medium)         │
  │ 1x         │ 30 days   │ No alert (normal)       │
  └────────────┴───────────┴─────────────────────────┘

  14.4x burn rate for 1 hour = 14.4 × (43.2/720) = 0.864 min
  = 2% of monthly budget consumed in 1 hour → critical
\`\`\`

**Why error budgets are powerful**:
- Transforms "should we ship this risky feature?" into a data question
- Gives product teams and SRE a shared metric to negotiate on
- Creates natural incentive: teams that cause outages consume their own budget
- Eliminates the political "my feature vs your reliability work" argument`
      },
      {
        question: 'What are the four golden signals and how do you implement them?',
        answer: `**The four golden signals** (from Google SRE) are the minimum monitoring for any service:

\`\`\`
1. LATENCY: How long requests take
   ┌────────────────────────────────┐
   │ p50:  45ms                    │
   │ p90: 120ms                    │
   │ p99: 350ms  ← SLI threshold  │
   │ p99.9: 1.2s                   │
   └────────────────────────────────┘
   Measure: request duration histogram
   Alert: p99 > 500ms for 5 minutes

2. TRAFFIC: How much demand the service receives
   ┌────────────────────────────────┐
   │ Current: 8,500 RPS            │
   │ Peak:    15,000 RPS           │
   │ Capacity: 20,000 RPS          │
   └────────────────────────────────┘
   Measure: requests per second by endpoint
   Alert: < 1,000 RPS (unexpected drop) or > 18,000 RPS (near capacity)

3. ERRORS: Rate of failed requests
   ┌────────────────────────────────┐
   │ 5xx rate: 0.05%               │
   │ 4xx rate: 2.1%                │
   │ Timeout rate: 0.01%           │
   └────────────────────────────────┘
   Measure: response codes, explicit errors
   Alert: 5xx rate > 0.1% for 5 minutes

4. SATURATION: How full the service is
   ┌────────────────────────────────┐
   │ CPU:    65%                    │
   │ Memory: 72%                   │
   │ Disk:   45%                   │
   │ Connections: 850/1000          │
   └────────────────────────────────┘
   Measure: resource utilization
   Alert: CPU > 80% for 10 minutes, connections > 90%
\`\`\`

**Implementation with Prometheus + Grafana**:
\`\`\`
  # Latency histogram
  http_request_duration_seconds_bucket{
    method="GET", endpoint="/api/users", le="0.2"
  }

  # SLI query: % of requests under 200ms (last 30 days)
  sum(rate(http_request_duration_seconds_bucket{le="0.2"}[30d]))
  /
  sum(rate(http_request_duration_seconds_count[30d]))

  # Error rate
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))

  # Saturation
  process_cpu_seconds_total / machine_cpu_cores
\`\`\`

**Key insight for interviews**: Measure SLIs from the client's perspective whenever possible. Server-side metrics miss network latency, DNS resolution time, TLS handshake overhead, and load balancer queuing time. Use synthetic monitoring (external probes) to complement server-side metrics.`
      },
      {
        question: 'How do you set appropriate SLOs for a new service?',
        answer: `**SLO-setting framework** (practical approach for a new service):

\`\`\`
Step 1: Identify critical user journeys
  ┌─────────────────────────────────────────────┐
  │ E-commerce checkout flow:                    │
  │ 1. View product page                         │
  │ 2. Add to cart                               │
  │ 3. Enter payment info                        │
  │ 4. Submit order         ← Most critical      │
  │ 5. Receive confirmation                      │
  └─────────────────────────────────────────────┘

Step 2: Define SLIs for each journey
  Product page:    Availability + Latency (p99 < 500ms)
  Add to cart:     Availability + Correctness
  Submit order:    Availability + Latency + Correctness
  Confirmation:    Availability + Freshness (< 30s delay)

Step 3: Set initial SLOs based on user expectations
  ┌───────────────────┬──────────┬────────────────────┐
  │ SLI               │ SLO      │ Rationale          │
  ├───────────────────┼──────────┼────────────────────┤
  │ Availability      │ 99.9%    │ ~43 min/month down │
  │ Latency (p99)     │ < 500ms  │ User-perceived slow│
  │ Error rate        │ < 0.1%   │ 1 in 1000 fails    │
  │ Order correctness │ 99.99%   │ Financial accuracy  │
  └───────────────────┴──────────┴────────────────────┘

Step 4: Measure for 2-4 weeks (baseline)
  Actual performance:
    Availability: 99.95% (meeting SLO)
    Latency p99:  320ms  (meeting SLO)
    Error rate:   0.08%  (meeting SLO)

Step 5: Refine SLOs based on data
  If easily meeting SLO → tighten it (99.9% → 99.95%)
  If barely meeting SLO → keep it (invest in reliability)
  If not meeting SLO → loosen it or invest immediately
\`\`\`

**Common mistakes in SLO-setting**:

| Mistake | Why it's wrong | Better approach |
|---------|---------------|----------------|
| 99.99% for everything | Error budget too small (4.3 min/month) | Different SLOs per criticality |
| Using mean latency | Hides tail latency problems | Use p99 or p99.9 |
| SLO = current performance | No room for regression | SLO slightly below current |
| No error budget policy | SLO has no teeth | Define actions when budget depletes |
| Measuring server-side only | Misses client-facing issues | Synthetic monitoring + RUM |

**SLO documentation template**:
\`\`\`
  Service: Payment API
  Owner: Payments team
  SLO window: 30-day rolling

  SLO 1: Availability
    SLI: Successful (non-5xx) responses / total responses
    Target: 99.95%
    Measurement: Prometheus http_requests_total

  SLO 2: Latency
    SLI: Proportion of requests completing < 300ms
    Target: 99th percentile < 300ms
    Measurement: Prometheus http_request_duration_seconds

  Error budget policy:
    > 50% remaining: Normal development
    < 25% remaining: Feature freeze, reliability sprint
    Exhausted: All hands on reliability
\`\`\``
      },
    ],

    dataModel: {
      description: 'SLI/SLO/SLA hierarchy and error budget tracking',
      schema: `SLI/SLO/SLA Hierarchy:
  ┌────────────────────────────────────────────────────┐
  │ SLA (Business contract)                            │
  │   "99.5% monthly availability, 10% credit if breached" │
  │                                                     │
  │   ┌────────────────────────────────────────────┐   │
  │   │ SLO (Engineering target)                   │   │
  │   │   "99.9% availability over 30-day window"  │   │
  │   │                                             │   │
  │   │   ┌────────────────────────────────────┐   │   │
  │   │   │ SLI (Measured metric)              │   │   │
  │   │   │   "successful requests / total"    │   │   │
  │   │   │   Current: 99.95%                  │   │   │
  │   │   └────────────────────────────────────┘   │   │
  │   └────────────────────────────────────────────┘   │
  └────────────────────────────────────────────────────┘

Error Budget Tracking:
  month:           "2024-01"
  slo_target:      0.999
  total_requests:  25,920,000,000
  failed_requests: 12,960,000
  error_rate:      0.0005 (0.05%)
  budget_total:    25,920,000 (0.1% of total)
  budget_consumed: 12,960,000 (50%)
  budget_remaining: 50%
  status:          GREEN`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 13. RPO & RTO (operations)
  // ─────────────────────────────────────────────────────────
  {
    id: 'rpo-rto',
    title: 'RPO & RTO',
    icon: 'alertTriangle',
    color: '#10b981',
    questions: 6,
    description: 'Recovery Point Objective and Recovery Time Objective — the two key metrics for disaster recovery planning and business continuity.',
    concepts: [
      'RPO (Recovery Point Objective) — max data loss',
      'RTO (Recovery Time Objective) — max downtime',
      'Backup strategies (full, incremental, differential)',
      'Disaster recovery tiers (cold, warm, hot, active-active)',
      'Point-in-time recovery (PITR)',
      'DR testing and runbook automation',
    ],
    tips: [
      'RPO answers "how much data can we lose?" and RTO answers "how long can we be down?" — both are business decisions, not technical ones',
      'RPO=0 requires synchronous replication (expensive). RPO=1h allows asynchronous replication + hourly backups (cheaper)',
      'The cost of DR increases exponentially as RPO and RTO approach zero — help interviewers understand the cost curve',
      'Always test DR by actually failing over — an untested DR plan is not a plan',
      'In interviews, propose RPO/RTO based on the system\'s business criticality: payments (RPO=0, RTO<1min) vs analytics (RPO=24h, RTO<4h)',
      'Point-in-time recovery (PITR) in PostgreSQL uses base backup + WAL replay to restore to any second',
    ],

    introduction: `**RPO** (Recovery Point Objective) and **RTO** (Recovery Time Objective) are the two fundamental metrics for disaster recovery planning. RPO defines the maximum acceptable amount of data loss measured in time — if your RPO is 1 hour, you can tolerate losing up to 1 hour of data in a disaster. RTO defines the maximum acceptable downtime — if your RTO is 15 minutes, the system must be operational within 15 minutes of a failure.

These are fundamentally **business decisions**, not technical ones. A payment processing system might require RPO=0 (zero data loss) and RTO<1 minute (near-instant recovery), while a marketing analytics dashboard might accept RPO=24 hours and RTO=4 hours. The technical architecture and cost follow directly from these requirements: tighter RPO/RTO demands more sophisticated (and expensive) infrastructure — synchronous replication across regions, hot standby databases, automated failover, and continuous data protection.

The classic mistake is designing for RPO=0 and RTO=0 for every system. This is prohibitively expensive and operationally complex. A mature organization classifies services into **tiers** based on business impact and assigns appropriate RPO/RTO targets to each tier. The most critical tier (Tier 1: payments, authentication) gets active-active multi-region with synchronous replication. The least critical tier (Tier 4: internal tools, batch reports) gets nightly backups with manual recovery.`,

    keyQuestions: [
      {
        question: 'What are RPO and RTO and how do they drive architecture decisions?',
        answer: `**Definitions**:

\`\`\`
Timeline of a disaster:

  Last backup      Disaster         Recovery complete
     │                │                    │
     ▼                ▼                    ▼
  ───●────────────────●────────────────────●──────►
     │◄─── RPO ──────►│◄────── RTO ──────►│
     │  (data loss)    │   (downtime)       │
     │                 │                    │

  RPO = time between last recoverable state and disaster
       = maximum data loss you can tolerate

  RTO = time between disaster and service restoration
       = maximum downtime you can tolerate
\`\`\`

**Architecture implications**:

\`\`\`
  RPO          │ Required technology           │ Cost
  ─────────────┼──────────────────────────────┼──────
  0 (zero)     │ Synchronous replication       │ $$$$
  < 1 min      │ Async replication (streaming) │ $$$
  < 1 hour     │ Frequent backups + WAL ship   │ $$
  < 24 hours   │ Daily backups                 │ $
  < 7 days     │ Weekly backups                │ ¢

  RTO          │ Required technology           │ Cost
  ─────────────┼──────────────────────────────┼──────
  < 1 min      │ Active-active, auto-failover │ $$$$
  < 15 min     │ Hot standby, auto-failover   │ $$$
  < 1 hour     │ Warm standby, manual failover│ $$
  < 4 hours    │ Cold standby, restore backup │ $
  < 24 hours   │ Rebuild from backup           │ ¢
\`\`\`

**Example: E-commerce platform**:
| Service | RPO | RTO | Strategy |
|---------|-----|-----|----------|
| Payment processing | 0 | <1 min | Sync replication, active-active |
| Order database | <1 min | <5 min | Streaming replication, hot standby |
| Product catalog | <1 hour | <15 min | Async replica + hourly snapshots |
| User analytics | <24 hours | <4 hours | Daily backup, warm standby |
| Internal reports | <7 days | <24 hours | Weekly backup, restore on demand |`
      },
      {
        question: 'What are the DR tiers and how do you implement each?',
        answer: `**Four DR tiers** from least to most resilient:

\`\`\`
Tier 4: Cold Standby (RPO: hours-days, RTO: hours-days)
  ┌──────────┐              ┌──────────────┐
  │ Primary  │  nightly     │  Cold Site   │
  │ Active   │──backup──►   │  (powered    │
  │          │              │   off)       │
  └──────────┘              └──────────────┘
  Recovery: Ship backup → Start servers → Restore → Test → Go live
  Cost: $ (only backup storage)

Tier 3: Warm Standby (RPO: minutes-hours, RTO: minutes-hours)
  ┌──────────┐  async       ┌──────────────┐
  │ Primary  │──replication──►│  Warm Site  │
  │ Active   │              │  (running,   │
  │          │              │   behind)    │
  └──────────┘              └──────────────┘
  Recovery: Catch up replication → Promote → Redirect traffic
  Cost: $$ (running infrastructure, reduced capacity)

Tier 2: Hot Standby (RPO: seconds, RTO: minutes)
  ┌──────────┐  sync/async  ┌──────────────┐
  │ Primary  │◄─replication─►│  Hot Site    │
  │ Active   │              │  (running,   │
  │ (writes) │              │  reads OK)   │
  └──────────┘              └──────────────┘
  Recovery: Promote standby → Redirect traffic (automated)
  Cost: $$$ (full infrastructure, serving read traffic)

Tier 1: Active-Active (RPO: 0, RTO: seconds)
  ┌──────────┐  sync        ┌──────────────┐
  │  Site A  │◄─replication─►│   Site B     │
  │ Active   │              │   Active     │
  │ (R+W)    │              │   (R+W)      │
  └──────────┘              └──────────────┘
  Recovery: Traffic already balanced, failed site removed
  Cost: $$$$ (full infrastructure at both sites, conflict resolution)
\`\`\`

**Implementation details for Tier 2 (Hot Standby — PostgreSQL)**:
\`\`\`
  Primary (us-east-1):
    postgresql.conf:
      wal_level = replica
      max_wal_senders = 5
      synchronous_standby_names = ''  # async for performance

  Standby (eu-west-1):
    Connected via streaming replication
    Serves read-only queries (hot_standby = on)
    Lag typically 100ms - 5s

  Failover (automated via Patroni or pg_auto_failover):
    1. Health check detects primary failure
    2. Standby runs: SELECT pg_promote();
    3. DNS updated: db.example.com → standby IP
    4. Application reconnects (connection pool retry)
    5. Total RTO: 30-60 seconds
    6. Data loss (RPO): 0 to 5s of uncommitted WAL
\`\`\``
      },
      {
        question: 'How does point-in-time recovery (PITR) work?',
        answer: `**PITR** allows you to restore a database to any specific moment in time — not just the time of the last backup.

\`\`\`
PITR components:

  Base backup (full snapshot, taken weekly or daily):
  ┌─────────────────────────────────────────────┐
  │ Full copy of all data files at t=Sunday 2AM │
  │ (pg_basebackup or physical snapshot)         │
  └─────────────────────────────────────────────┘

  Continuous WAL archiving (every WAL segment shipped to storage):
  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐
  │WAL1││WAL2││WAL3││WAL4││WAL5││WAL6││WAL7│
  └────┘└────┘└────┘└────┘└────┘└────┘└────┘
  Sun    Mon   Mon   Tue   Wed   Wed   Thu
  2AM    10AM  8PM   3PM   9AM   4PM   1PM

  PITR to Wednesday 11:30 AM:
  1. Restore base backup from Sunday 2AM
  2. Replay WAL1 through WAL5 (up to Wed 11:30 AM)
  3. Stop replay at target_time = '2024-01-10 11:30:00'
  4. Database is now in exact state of Wed 11:30 AM
\`\`\`

**PostgreSQL PITR configuration**:
\`\`\`
  # On primary: archive WAL to S3
  archive_mode = on
  archive_command = 'aws s3 cp %p s3://wal-archive/%f'

  # To restore (recovery.conf / postgresql.conf):
  restore_command = 'aws s3 cp s3://wal-archive/%f %p'
  recovery_target_time = '2024-01-10 11:30:00'
  recovery_target_action = 'promote'
\`\`\`

**PITR use cases**:
\`\`\`
  1. Accidental DELETE:
     "Someone ran DELETE FROM users WHERE active=false"
     "But it deleted ALL users (forgot the WHERE clause)"
     PITR to 1 minute before the DELETE → data recovered

  2. Bad migration:
     "Migration corrupted the orders table"
     PITR to before migration ran → orders restored

  3. Ransomware:
     "Database encrypted by malware at 3 PM"
     PITR to 2:55 PM → clean state restored
     RPO: 5 minutes of data loss (from 2:55 to 3:00)
\`\`\`

**RPO of PITR**:
\`\`\`
  RPO depends on WAL archiving frequency:
  - Continuous WAL archiving: RPO ≈ seconds (only un-archived WAL lost)
  - WAL shipped every 5 minutes: RPO ≈ 5 minutes
  - Daily base backup only (no WAL archiving): RPO = up to 24 hours

  Best practice: Continuous WAL archiving (archive_mode=on)
  gives near-zero RPO for the cost of S3 storage.
\`\`\``
      },
      {
        question: 'How do you test disaster recovery and what should the runbook contain?',
        answer: `**DR testing**: An untested DR plan is not a plan. Regular DR drills validate that failover actually works.

\`\`\`
DR testing cadence:

  ┌──────────────────────────────────────────────┐
  │ Monthly:  Backup restoration test            │
  │           Restore latest backup to test env   │
  │           Verify data integrity               │
  │                                               │
  │ Quarterly: Failover drill                     │
  │           Simulate primary failure             │
  │           Execute failover runbook             │
  │           Measure actual RTO                   │
  │           Failback to primary                 │
  │                                               │
  │ Annually: Full DR exercise                    │
  │           Simulate region-wide outage          │
  │           All teams execute their runbooks     │
  │           Measure end-to-end recovery          │
  │           Update runbooks based on findings    │
  └──────────────────────────────────────────────┘
\`\`\`

**DR runbook template**:
\`\`\`
  ┌─────────────────────────────────────────────┐
  │ DISASTER RECOVERY RUNBOOK: Payment Database  │
  ├─────────────────────────────────────────────┤
  │ RPO target: 0 (sync replication)            │
  │ RTO target: < 5 minutes                     │
  │ On-call: payments-oncall@company.com         │
  │ Escalation: VP Engineering (if > 15 min)     │
  ├─────────────────────────────────────────────┤
  │ DETECTION:                                   │
  │ 1. PagerDuty alert: "primary DB unreachable" │
  │ 2. Verify via: pg_isready -h primary-host    │
  │ 3. Check AWS console for region status       │
  │                                               │
  │ DECISION:                                     │
  │ □ Is this a transient issue? Wait 2 min.     │
  │ □ Is the entire region down? → Execute DR    │
  │ □ Is only the DB instance down? → Restart    │
  │                                               │
  │ FAILOVER EXECUTION:                           │
  │ 1. Promote standby:                          │
  │    $ patronictl failover payments-cluster     │
  │ 2. Verify new primary is accepting writes:   │
  │    $ psql -h standby -c "INSERT INTO...test" │
  │ 3. Update DNS (if not automatic):            │
  │    $ aws route53 change-resource-record-sets  │
  │ 4. Verify application connectivity:          │
  │    $ curl https://api.example.com/health      │
  │ 5. Monitor for 30 minutes                    │
  │                                               │
  │ FAILBACK (when primary region recovers):      │
  │ 1. Rebuild old primary as new standby         │
  │ 2. Wait for replication to catch up           │
  │ 3. Planned failover back (during maintenance) │
  │                                               │
  │ LAST TESTED: 2024-01-15                      │
  │ LAST ACTUAL RTO: 3 min 42 sec               │
  └─────────────────────────────────────────────┘
\`\`\`

**Common DR testing failures**:
| Failure | Root cause | Prevention |
|---------|-----------|------------|
| Backup corrupted | No integrity verification | Verify checksums after each backup |
| Standby behind by hours | Replication lag not monitored | Alert on lag > 10s |
| DNS TTL too high | 5-minute cached DNS → 5 min added to RTO | DNS TTL = 60s |
| Application hardcoded IP | App does not follow DNS change | Use connection poolers (PgBouncer) |
| Runbook outdated | Infra changed since last update | Review runbook each quarter |`
      },
    ],

    dataModel: {
      description: 'RPO/RTO requirements matrix and DR tier mapping',
      schema: `RPO/RTO Requirements Matrix:
  ┌───────────────────┬────────┬─────────┬──────────┬──────────┐
  │ Service Tier      │  RPO   │   RTO   │ Strategy │ Cost/mo  │
  ├───────────────────┼────────┼─────────┼──────────┼──────────┤
  │ Tier 1 (Critical) │   0    │ < 1 min │ Active-  │ $10,000+ │
  │ Payments, Auth     │        │         │ Active   │          │
  ├───────────────────┼────────┼─────────┼──────────┼──────────┤
  │ Tier 2 (High)     │ < 1min │ < 5 min │ Hot      │ $5,000   │
  │ Orders, Inventory  │        │         │ Standby  │          │
  ├───────────────────┼────────┼─────────┼──────────┼──────────┤
  │ Tier 3 (Medium)   │ < 1hr  │ < 1 hr  │ Warm     │ $1,000   │
  │ Product catalog    │        │         │ Standby  │          │
  ├───────────────────┼────────┼─────────┼──────────┼──────────┤
  │ Tier 4 (Low)      │ < 24hr │ < 24 hr │ Cold     │ $100     │
  │ Analytics, Reports │        │         │ Backup   │          │
  └───────────────────┴────────┴─────────┴──────────┴──────────┘

DR Test Tracking:
  service:         "payment-db"
  last_test_date:  "2024-01-15"
  test_type:       "failover-drill"
  target_rto:      300 (seconds)
  actual_rto:      222 (seconds)
  data_loss:       0 (bytes)
  issues_found:    ["DNS propagation took 45s", "App pool reconnect slow"]
  next_test:       "2024-04-15"`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 14. UUID, ULID & Snowflake (operations)
  // ─────────────────────────────────────────────────────────
  {
    id: 'uuid-ulid-snowflake',
    title: 'UUID, ULID & Snowflake',
    icon: 'hash',
    color: '#10b981',
    questions: 7,
    description: 'Distributed ID generation strategies — comparing UUIDs, ULIDs, and Snowflake IDs for uniqueness, sortability, and performance.',
    concepts: [
      'UUID v4 (random) and v7 (time-ordered)',
      'ULID (Universally Unique Lexicographically Sortable Identifier)',
      'Twitter Snowflake ID (timestamp + worker + sequence)',
      'Auto-increment limitations in distributed systems',
      'Index fragmentation from random IDs',
      'Clock skew and ID ordering',
      'K-sortability and time-based prefixes',
    ],
    tips: [
      'UUID v4 is random → terrible for B-tree index performance because inserts go to random pages (index fragmentation)',
      'ULID and UUID v7 are time-ordered → inserts are sequential, excellent for B-tree indexes',
      'Snowflake IDs are 64-bit integers (fit in a BIGINT) while UUIDs are 128-bit (need UUID or CHAR column)',
      'In interviews, always mention the index performance impact — this is what separates a good answer from a great one',
      'Auto-increment does not work in distributed systems: two databases generating IDs independently will collide',
      'ULID encodes millisecond timestamp + 80 bits of randomness in a 26-character Crockford Base32 string',
    ],

    introduction: `Generating unique identifiers in a distributed system is a deceptively complex problem. A single-database auto-increment column works perfectly for a monolith, but fails in distributed architectures where multiple nodes must independently generate IDs without coordination. The ID must be **globally unique** (no collisions across billions of IDs), and ideally **sortable by creation time** (for efficient database indexing) and **compact** (to minimize storage and network overhead).

The three dominant strategies are **UUID** (Universally Unique Identifier — 128-bit, standardized by RFC 4122/9562), **ULID** (Universally Unique Lexicographically Sortable Identifier — 128-bit, time-ordered), and **Snowflake** (Twitter's 64-bit, timestamp-embedded ID scheme). Each makes different trade-offs between uniqueness guarantees, sortability, size, and operational complexity.

The critical insight for system design interviews is the **database performance impact** of ID choice. Random UUIDs (v4) cause severe B-tree index fragmentation because each new ID inserts into a random position in the index, turning sequential I/O into random I/O. Time-ordered IDs (ULID, UUID v7, Snowflake) insert at the end of the index — maintaining sequential write patterns and dramatically improving write throughput. This single factor can mean the difference between 10,000 and 100,000 inserts per second on the same hardware.`,

    keyQuestions: [
      {
        question: 'Why do random UUIDs cause index performance problems?',
        answer: `**B-tree index behavior with random vs sequential IDs**:

\`\`\`
Sequential IDs (auto-increment, ULID, Snowflake):
  B-tree index pages:
  [1,2,3,4,5] [6,7,8,9,10] [11,12,13,14,15] [16,...←NEW]
                                                      ▲
  New inserts always go to the rightmost page.
  One page is "hot" in the buffer pool.
  Sequential I/O → fast.

Random UUIDs (v4):
  B-tree index pages:
  [0a3f..] [1b7e..] [2c9d..] [3d4a..] [...] [fe21..]
     ▲         ▲                   ▲              ▲
  New inserts go to RANDOM pages.
  All pages must be in buffer pool (or fetched from disk).
  Random I/O → slow.
\`\`\`

**Benchmark (PostgreSQL, 100M rows, B-tree primary key)**:
\`\`\`
  ID Type        │ Insert Rate │ Index Size │ Cache Hit Rate
  ───────────────┼─────────────┼────────────┼───────────────
  BIGSERIAL      │ 95,000/s    │ 2.1 GB     │ 99.9%
  UUID v7 (time) │ 88,000/s    │ 4.2 GB     │ 99.5%
  ULID           │ 85,000/s    │ 4.2 GB     │ 99.3%
  UUID v4 (rand) │ 12,000/s    │ 6.8 GB     │ 62.0%
  ──────────────────────────────────────────────────────
  UUID v4 is 7x slower and the index is 3x larger!
\`\`\`

**Why UUID v4 index is larger**:
- Random inserts cause page splits at random positions
- Page splits create half-empty pages (fill factor drops to ~50-70%)
- Sequential inserts keep pages ~90% full

**Why cache hit rate drops**:
\`\`\`
  Buffer pool: 4GB (can hold ~50% of index)

  Sequential IDs: Only the rightmost pages are accessed
    → They stay in buffer pool → 99.9% cache hit rate

  Random UUIDs: ANY page can be accessed
    → Working set = entire index (6.8 GB)
    → Buffer pool (4GB) cannot hold it all
    → 62% cache hit rate → frequent disk reads
\`\`\`

**Solution**: Use time-ordered IDs (UUID v7, ULID) or Snowflake. They maintain sequential insert patterns while providing global uniqueness.`
      },
      {
        question: 'How do ULID, UUID v7, and Snowflake IDs compare?',
        answer: `**Side-by-side comparison**:

\`\`\`
UUID v4 (random):
  550e8400-e29b-41d4-a716-446655440000
  128 bits = 16 bytes
  Format: 32 hex chars + 4 hyphens = 36 chars
  No timestamp, no sortability

UUID v7 (time-ordered, RFC 9562):
  018f4d8e-7c00-7000-8000-000000000001
  ├── 48 bits ──┤ v7 │── 74 bits random ──┤
  │ unix_ms     │    │                     │
  128 bits, sortable by creation time

ULID:
  01HYK3ABCM-PQRST5678W-XYZ90
  01HYK3ABCM PQRST5678WXYZ90  (26 chars, Crockford Base32)
  ├── 48 bits ──┤── 80 bits random ──┤
  │ unix_ms     │                     │
  128 bits, lexicographically sortable

Snowflake ID:
  1541815603606036480
  64 bits = 8 bytes
  ┌─ 1 ─┬── 41 bits ──┬─ 10 ──┬─ 12 ──┐
  │sign │ timestamp_ms │worker │  seq  │
  │  0  │ (69 years)   │ (1024 │(4096/ │
  │     │              │nodes) │  ms)  │
  └─────┴──────────────┴───────┴───────┘
\`\`\`

**Comparison matrix**:

| Feature | UUID v4 | UUID v7 | ULID | Snowflake |
|---------|---------|---------|------|-----------|
| Size | 128 bits | 128 bits | 128 bits | 64 bits |
| Storage | 16 bytes | 16 bytes | 16 bytes | 8 bytes |
| Sortable | No | Yes | Yes | Yes |
| DB column | UUID | UUID | CHAR(26)/BYTEA | BIGINT |
| Coordination | None | None | None | Worker ID assignment |
| Collision risk | ~2^-61 per pair | ~2^-37/ms | ~2^-40/ms | 0 (if worker IDs unique) |
| Embedded timestamp | No | Yes (ms) | Yes (ms) | Yes (ms) |
| Index performance | Poor | Good | Good | Excellent (smallest) |
| Standard | RFC 4122 | RFC 9562 | Spec (ulid.dev) | Custom |

**When to use each**:
- **UUID v7**: New standard, broad library support, works as PostgreSQL UUID type
- **ULID**: String-sortable, great for APIs and URLs, no hyphens
- **Snowflake**: Best performance (64-bit), requires worker ID coordination
- **UUID v4**: Legacy compatibility only, avoid for new designs with B-tree PKs`
      },
      {
        question: 'How does Twitter Snowflake work and what are its failure modes?',
        answer: `**Snowflake architecture**: Each node generates locally unique IDs using a combination of timestamp, worker ID, and sequence number.

\`\`\`
Snowflake ID layout (64 bits):
  ┌───┬──────────────────────────┬──────────┬────────────┐
  │ 0 │    41 bits timestamp     │ 10 bits  │  12 bits   │
  │   │    (milliseconds since   │ worker   │  sequence  │
  │   │     custom epoch)        │   ID     │   number   │
  └───┴──────────────────────────┴──────────┴────────────┘

  Timestamp: 2^41 ms = ~69 years from epoch
  Worker ID: 2^10 = 1024 unique workers
  Sequence:  2^12 = 4096 IDs per millisecond per worker

  Max throughput per worker: 4,096,000 IDs/second
  Max throughput total: 4,096,000 × 1024 = ~4 billion IDs/second
\`\`\`

**ID generation algorithm**:
\`\`\`
  function generateId():
    timestamp = currentTimeMs() - EPOCH

    if timestamp == lastTimestamp:
      sequence = (sequence + 1) & 0xFFF  // 12-bit mask
      if sequence == 0:
        // Sequence exhausted for this ms — wait for next ms
        timestamp = waitNextMs(lastTimestamp)
    else:
      sequence = 0   // New millisecond, reset sequence

    lastTimestamp = timestamp

    return (timestamp << 22) | (workerId << 12) | sequence
\`\`\`

**Failure modes**:

\`\`\`
1. Clock skew (most dangerous):
   System clock jumps backward (NTP correction)
   → Generated IDs could collide with previously generated ones!
   Fix: Refuse to generate IDs if clock goes backward
        Wait until clock catches up to lastTimestamp

2. Worker ID collision:
   Two nodes assigned same worker ID
   → IDs will collide (same timestamp + same worker + same sequence)
   Fix: Centralized worker ID registry (ZooKeeper, database)
        OR: Use MAC address / IP for worker ID (less reliable)

3. Sequence exhaustion:
   >4096 requests in single millisecond on one worker
   → Must wait for next millisecond (adds ~1ms latency)
   Fix: Rare in practice. If needed, use 64-bit sequence
        (sacrificing timestamp bits)

4. Epoch overflow:
   41 bits = 69 years from epoch
   Fix: Choose epoch close to system launch date (not Unix epoch)
        Twitter's epoch: 2010-11-04 → runs until ~2079
\`\`\`

**Operational considerations**:
- **Worker ID assignment**: Use ZooKeeper or database to assign unique worker IDs. When a worker restarts, it should get the same ID (or a guaranteed-new one).
- **Monitoring**: Alert on clock drift > 100ms between servers (NTP should keep drift < 10ms).
- **Extracting timestamp from ID**: \`timestamp = (id >> 22) + EPOCH\` — useful for debugging and time-range queries.`
      },
      {
        question: 'How do you choose an ID strategy for a new microservice?',
        answer: `**Decision framework**:

\`\`\`
  Do you need IDs to be sortable by creation time?
    └── No  → UUID v4 (simplest, no coordination)
    └── Yes → Is 64-bit (BIGINT) storage critical?
                └── Yes → Snowflake (best performance, needs coordination)
                └── No  → Do you need a standard format?
                            └── Yes → UUID v7 (RFC 9562, native DB support)
                            └── No  → ULID (string-sortable, URL-friendly)
\`\`\`

**Practical recommendations by use case**:

| Use case | Recommended ID | Rationale |
|----------|---------------|-----------|
| PostgreSQL primary key | UUID v7 | Native UUID type, sorted inserts, standard |
| MySQL primary key | Snowflake (BIGINT) | 8 bytes vs 16, clustered index efficiency |
| API resource IDs | ULID | URL-safe, no hyphens, lexicographically sorted |
| Event/message IDs | UUID v7 or ULID | Time-ordered for processing, no coordination |
| Analytics/data warehouse | Snowflake | Compact, embeds timestamp for partitioning |
| Legacy system migration | UUID v4 | Compatible with existing UUID columns |

**Migration from auto-increment to distributed IDs**:
\`\`\`
  Phase 1: Add new ID column alongside auto-increment
    ALTER TABLE orders ADD COLUMN distributed_id UUID;
    -- Backfill with UUID v7 based on created_at

  Phase 2: Write both IDs on new inserts
    INSERT INTO orders (id, distributed_id, ...)
    VALUES (DEFAULT, gen_random_uuid_v7(), ...);

  Phase 3: Migrate foreign keys to use new ID
    (Gradual, service by service)

  Phase 4: Drop auto-increment, rename distributed_id to id
    ALTER TABLE orders DROP COLUMN id;
    ALTER TABLE orders RENAME COLUMN distributed_id TO id;
    ALTER TABLE orders ADD PRIMARY KEY (id);
\`\`\`

**PostgreSQL UUID v7 generation** (native in PG 17+, or via extension):
\`\`\`
  -- PostgreSQL 17+
  SELECT uuidv7();

  -- Older versions: pgcrypto + custom function
  CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid AS $$
  DECLARE
    timestamp_ms bigint;
    uuid_bytes bytea;
  BEGIN
    timestamp_ms = extract(epoch from clock_timestamp()) * 1000;
    uuid_bytes = substring(int8send(timestamp_ms) from 3);
    uuid_bytes = uuid_bytes || gen_random_bytes(10);
    -- Set version 7 and variant bits
    uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
    RETURN encode(uuid_bytes, 'hex')::uuid;
  END $$ LANGUAGE plpgsql;
\`\`\``
      },
    ],

    dataModel: {
      description: 'ID format comparison and bit layout',
      schema: `ID Format Comparison:
  ┌────────────┬──────────┬──────────────┬───────────────────────┐
  │ Format     │ Size     │ Sortable     │ Example               │
  ├────────────┼──────────┼──────────────┼───────────────────────┤
  │ UUID v4    │ 128 bits │ No (random)  │ 550e8400-e29b-41d4... │
  │ UUID v7    │ 128 bits │ Yes (time)   │ 018f4d8e-7c00-7000... │
  │ ULID       │ 128 bits │ Yes (time)   │ 01HYK3ABCMPQRST56... │
  │ Snowflake  │  64 bits │ Yes (time)   │ 1541815603606036480   │
  │ Auto-incr  │  32/64   │ Yes (seq)    │ 42                    │
  └────────────┴──────────┴──────────────┴───────────────────────┘

Snowflake Bit Layout:
  [0][41-bit timestamp][10-bit worker][12-bit sequence]
  Total: 1 + 41 + 10 + 12 = 64 bits

ULID Byte Layout:
  [48-bit timestamp][80-bit randomness]
  Encoded: 26 characters Crockford Base32

UUID v7 Byte Layout:
  [48-bit unix_ms][4-bit version=7][12-bit rand_a]
  [2-bit variant][62-bit rand_b]

Database Column Types:
  UUID v4/v7:  PostgreSQL UUID (16 bytes, native support)
  ULID:        CHAR(26) or BYTEA(16)
  Snowflake:   BIGINT (8 bytes)
  Auto-incr:   SERIAL / BIGSERIAL`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 15. Active-Active vs Active-Passive (operations)
  // ─────────────────────────────────────────────────────────
  {
    id: 'active-active-vs-active-passive',
    title: 'Active-Active vs Active-Passive',
    icon: 'server',
    color: '#10b981',
    questions: 7,
    description: 'High-availability deployment topologies — comparing active-active (multi-writer) and active-passive (failover) architectures for distributed systems.',
    concepts: [
      'Active-passive (primary/standby) failover',
      'Active-active (multi-master) with conflict resolution',
      'Split-brain problem and fencing',
      'Conflict resolution strategies (LWW, CRDT, merge)',
      'Failover detection and promotion',
      'Data consistency models across topologies',
      'Cost vs availability trade-offs',
    ],
    tips: [
      'Active-passive is simpler: one writer, one or more read replicas. Failover promotes a replica to primary.',
      'Active-active serves reads AND writes at all sites, but requires conflict resolution for concurrent writes',
      'The split-brain problem occurs when both sides of a partition think they are the primary — fencing tokens prevent this',
      'Last-Write-Wins (LWW) is the simplest conflict resolution but can lose data — use CRDTs or application-level merge for correctness',
      'In interviews, argue for active-passive unless the business requires multi-region writes — active-active adds enormous complexity',
      'Active-active is required when users in different regions need low-latency writes simultaneously',
    ],

    introduction: `**Active-passive** and **active-active** are the two fundamental high-availability deployment topologies for distributed systems. In **active-passive** (also called primary-standby or master-slave), one instance handles all traffic while one or more standby instances remain ready to take over if the primary fails. In **active-active** (also called multi-master or multi-primary), multiple instances simultaneously handle traffic, including writes, with changes replicated bidirectionally.

The choice between these topologies is one of the most impactful architectural decisions in system design. **Active-passive** is simpler, avoids write conflicts entirely (since only one node accepts writes), and is well-supported by all major databases (PostgreSQL streaming replication, MySQL replication, Redis Sentinel). The trade-off is that failover takes time (seconds to minutes), and the standby resources are underutilized during normal operation (though they can serve read traffic as hot standbys).

**Active-active** provides the highest availability and lowest latency for globally distributed users — a user in Tokyo writes to a local node without waiting for a round-trip to Virginia. However, it introduces the fundamental challenge of **write conflicts**: two users updating the same record at two different sites simultaneously. Resolving these conflicts requires strategies like **Last-Write-Wins** (LWW), **Conflict-Free Replicated Data Types** (CRDTs), or **application-level merge logic**. The operational complexity is significantly higher, which is why most systems use active-passive unless the business requirements demand multi-region writes.`,

    keyQuestions: [
      {
        question: 'When should you choose active-active vs active-passive?',
        answer: `**Decision framework**:

\`\`\`
  Do users in multiple regions need low-latency WRITES?
    └── No  → Active-Passive (simpler, cheaper)
    └── Yes → Can you tolerate eventual consistency?
                └── No  → Active-Passive with cross-region sync writes
                │         (high latency but strong consistency)
                └── Yes → Active-Active with conflict resolution
                           (low latency, eventual consistency)
\`\`\`

**Architecture comparison**:
\`\`\`
Active-Passive:
  ┌──────────────┐              ┌──────────────┐
  │  Primary     │  async       │  Standby     │
  │  (R+W)       │──replication─►│  (R only)    │
  │  us-east-1   │              │  eu-west-1   │
  └──────────────┘              └──────────────┘
  All writes go to us-east-1 (200ms latency for EU users)
  Failover: promote standby, ~30-60s downtime

Active-Active:
  ┌──────────────┐  bidirectional  ┌──────────────┐
  │   Site A     │◄───replication──►│   Site B     │
  │   (R+W)      │                  │   (R+W)      │
  │  us-east-1   │                  │  eu-west-1   │
  └──────────────┘                  └──────────────┘
  Writes served locally at both sites (<10ms)
  No failover needed (traffic shifts automatically)
\`\`\`

**Comparison matrix**:

| Aspect | Active-Passive | Active-Active |
|--------|---------------|---------------|
| Write latency | High (cross-region) | Low (local) |
| Failover time | 30s - 5min | Near-zero (traffic shift) |
| Write conflicts | None (single writer) | Must be resolved |
| Consistency | Strong (single source of truth) | Eventual (unless CRDT/sync) |
| Operational complexity | Moderate | High |
| Resource efficiency | Standby underutilized | All resources active |
| Cost | Lower | Higher (2x compute, conflict infra) |
| Database support | All databases | Few (CockroachDB, Cassandra, DynamoDB) |

**Real-world examples**:
- **Active-Passive**: Most PostgreSQL deployments, Redis Sentinel, traditional enterprise apps
- **Active-Active**: DynamoDB Global Tables, CockroachDB multi-region, Cassandra multi-DC, DNS (anycast)`
      },
      {
        question: 'How do you handle write conflicts in active-active systems?',
        answer: `**Write conflicts** occur when two sites modify the same data simultaneously, and the system must decide which version wins.

\`\`\`
Conflict scenario:

  Site A (US):                    Site B (EU):
  t=1: Read user.name = "Alice"   t=1: Read user.name = "Alice"
  t=2: Update name = "Bob"        t=2: Update name = "Charlie"
  t=3: Replicate to B ──────────► t=3: Replicate to A
       name = "Bob"                    name = "Charlie"

  Conflict! Which value should win?
\`\`\`

**Conflict resolution strategies**:

\`\`\`
Strategy 1: Last-Write-Wins (LWW)
  Compare timestamps, higher timestamp wins.
  Site A: {name: "Bob",     ts: 1705312842}
  Site B: {name: "Charlie", ts: 1705312843}  ← WINS (higher ts)
  Result: name = "Charlie" at both sites

  Pro: Simple, deterministic
  Con: Silently loses data ("Bob" update is discarded)
       Clock skew can cause incorrect resolution

Strategy 2: Application-Level Merge
  Application defines merge logic per data type.
  Shopping cart: UNION of items from both sites
  Counter: SUM of increments from both sites
  Document: Three-way merge (Git-style)

  Pro: Domain-appropriate resolution
  Con: Must implement per entity type, complex

Strategy 3: CRDTs (Conflict-Free Replicated Data Types)
  Data structures that mathematically guarantee convergence.
  G-Counter: {A: 5, B: 3} → total = 8
  OR-Set:    {add(x), add(y)} ∪ {add(x), add(z)} = {x, y, z}
  LWW-Register: Like LWW but formalized

  Pro: Provably correct convergence, no coordination
  Con: Limited data types, can be complex to implement

Strategy 4: Conflict Detection + User Resolution
  Detect conflicts, present both versions to user.
  (DynamoDB Streams, Riak siblings)

  Pro: No data loss
  Con: Poor user experience, only for rare conflicts
\`\`\`

**DynamoDB Global Tables (LWW)**:
\`\`\`
  Region us-east-1: PUT {pk:"user:1", name:"Bob",   _ts:100}
  Region eu-west-1: PUT {pk:"user:1", name:"Charlie",_ts:101}

  Replication:
    us-east-1 receives Charlie (ts=101 > ts=100) → overwrites Bob
    eu-west-1 receives Bob (ts=100 < ts=101) → discarded

  Result: Both regions converge to name="Charlie"
  Data loss: "Bob" update is silently lost
\`\`\`

**Recommendation**: Use LWW for non-critical data (user preferences, last-seen timestamps). Use CRDTs or app-level merge for critical data (shopping carts, inventories, financial balances).`
      },
      {
        question: 'What is the split-brain problem and how do you prevent it?',
        answer: `**Split-brain** occurs when a network partition causes both sides to believe they are the active primary, leading to divergent writes.

\`\`\`
Normal operation:
  ┌────────┐  heartbeat  ┌────────┐
  │Primary │◄───────────►│Standby │
  │  (R+W) │             │  (R)   │
  └────────┘             └────────┘

Network partition:
  ┌────────┐              ┌────────┐
  │Primary │    ╳╳╳╳╳╳    │Standby │
  │  (R+W) │   partition  │  (R)   │
  └────────┘              └────────┘
  Primary: "I'm still primary"
  Standby: "Primary is dead → I'll promote myself"

Split brain:
  ┌────────┐              ┌────────┐
  │Primary │              │ "New"  │
  │  (R+W) │              │Primary │
  │  ↑↑↑   │              │  (R+W) │
  │ writes │              │  ↑↑↑   │
  └────────┘              │ writes │
  Client A writes here    └────────┘
                          Client B writes here
  → DATA DIVERGENCE (two different states!)
\`\`\`

**Prevention strategies**:

\`\`\`
Strategy 1: Fencing tokens
  When standby promotes, it gets a monotonically increasing
  token (epoch number) from a consensus system.

  Old primary: epoch=5
  New primary: epoch=6

  Storage layer: Reject writes with epoch < current_epoch
  Old primary's writes (epoch=5) are rejected → fenced off

Strategy 2: STONITH (Shoot The Other Node In The Head)
  When promoting standby, FORCIBLY power off the old primary.
  AWS: ec2 stop-instances --instance-id i-old-primary
  IPMI: ipmitool -H old-primary power off

  Pro: Guaranteed prevention
  Con: Requires out-of-band management (IPMI, cloud API)

Strategy 3: Quorum-based consensus
  Require majority agreement before accepting writes.
  3 nodes: need 2/3 agreement (survives 1 failure)
  5 nodes: need 3/5 agreement (survives 2 failures)

  If partition splits 2|1:
    Side with 2 nodes → has quorum → continues
    Side with 1 node → no quorum → stops accepting writes

  Used by: etcd (Raft), ZooKeeper (ZAB), CockroachDB
\`\`\`

**Quorum in practice (ZooKeeper-based fencing)**:
\`\`\`
  ┌──────────┐     ┌────────────┐     ┌──────────┐
  │ Primary  │     │ ZooKeeper  │     │ Standby  │
  │          │     │ (3 nodes)  │     │          │
  └────┬─────┘     └─────┬──────┘     └────┬─────┘
       │                 │                  │
       │ Renew leader    │                  │
       │ lock (epoch=5)  │                  │
       │────────────────►│                  │
       │                 │                  │
       │    partition     │                  │
       │ ═══════╳═══════ │                  │
       │                 │                  │
       │                 │ Leader lock       │
       │                 │ expires (TTL)     │
       │                 │                  │
       │                 │◄─────────────────│
       │                 │ Acquire lock      │
       │                 │ (epoch=6)         │
       │                 │─────────────────►│
       │                 │ GRANTED           │
       │                 │                  │
       │ Try to write    │                  │
       │ (epoch=5)       │                  │
       │──► REJECTED ◄───│                  │
       │ (epoch 5 < 6)   │                  │
\`\`\``
      },
      {
        question: 'Design a high-availability architecture for a global e-commerce platform.',
        answer: `**Requirements**: Users in US, EU, and APAC need low-latency reads. Writes must be strongly consistent for orders/payments.

\`\`\`
Hybrid architecture: Active-passive writes, active-active reads

                     ┌─────────────────┐
                     │    Route 53     │
                     │ (latency-based) │
                     └────────┬────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
  │  US-EAST-1    │ │  EU-WEST-1    │ │ AP-SOUTHEAST  │
  │ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │
  │ │   ALB     │ │ │ │   ALB     │ │ │ │   ALB     │ │
  │ ├───────────┤ │ │ ├───────────┤ │ │ ├───────────┤ │
  │ │ App (R+W) │ │ │ │ App (R)   │ │ │ │ App (R)   │ │
  │ ├───────────┤ │ │ ├───────────┤ │ │ ├───────────┤ │
  │ │ Aurora    │ │ │ │ Aurora    │ │ │ │ Aurora    │ │
  │ │ PRIMARY   │◄├─┼─┤ READ     │ │ │ │ READ     │ │
  │ │ (R+W)     │─┼─┼─► REPLICA  │ │ │ │ REPLICA  │ │
  │ ├───────────┤ │ │ ├───────────┤ │ │ ├───────────┤ │
  │ │ Redis     │ │ │ │ Redis     │ │ │ │ Redis     │ │
  │ │ (local)   │ │ │ │ (local)   │ │ │ │ (local)   │ │
  │ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │
  └───────────────┘ └───────────────┘ └───────────────┘
\`\`\`

**Traffic routing by operation type**:
\`\`\`
  Reads (product pages, search, user profiles):
    → Served locally at nearest region (low latency)
    → Read from local Aurora replica or Redis cache
    → Slight staleness acceptable (async replication lag <1s)

  Writes (orders, payments, cart updates):
    → Routed to US-EAST-1 primary (single writer)
    → EU/APAC users: 100-200ms additional latency for writes
    → Strong consistency guaranteed (single source of truth)

  Critical writes (payments):
    → US-EAST-1 with synchronous replica in US-WEST-2
    → RPO=0, RTO<1min
\`\`\`

**Failover plan**:
\`\`\`
  Primary (US-EAST-1) failure:
  1. Aurora Global Database auto-promotes EU-WEST-1 to primary (<2 min)
  2. Route 53 health check removes US-EAST-1 (<60s)
  3. EU-WEST-1 now handles ALL reads and writes
  4. AP-SOUTHEAST switches replication source to EU-WEST-1
  5. Total RTO: ~2-3 minutes
  6. RPO: <1 second (Aurora replication lag)
\`\`\`

**Why not full active-active for writes?**
\`\`\`
  Active-active writes would require:
  ✗ Conflict resolution for orders (unacceptable for financial data)
  ✗ Distributed transactions across regions (200ms+ per write)
  ✗ CRDT-compatible data model (massive refactor)
  ✗ Operational complexity for conflict monitoring and resolution

  Active-passive writes give us:
  ✓ Strong consistency (single writer)
  ✓ Simple operational model
  ✓ 100-200ms write latency for non-US users (acceptable)
  ✓ Fast failover with Aurora Global Database
\`\`\``
      },
    ],

    dataModel: {
      description: 'HA topology comparison and failover configuration',
      schema: `HA Topology Comparison:
  ┌─────────────────┬───────────────────┬───────────────────┐
  │ Aspect          │ Active-Passive    │ Active-Active     │
  ├─────────────────┼───────────────────┼───────────────────┤
  │ Writers         │ 1 (primary)       │ N (all sites)     │
  │ Readers         │ N (all replicas)  │ N (all sites)     │
  │ Failover time   │ 30s - 5min        │ Near-zero         │
  │ Write conflicts │ None              │ Must be resolved  │
  │ Consistency     │ Strong            │ Eventual (usually)│
  │ Complexity      │ Moderate          │ High              │
  │ Resource util   │ Standby idle*     │ All active        │
  │ Cost            │ Lower             │ Higher            │
  └─────────────────┴───────────────────┴───────────────────┘
  * Hot standby serves reads, reducing waste

Failover Configuration:
  detection_method:  health_check | heartbeat | consensus
  detection_timeout: 10-30 seconds
  promotion_method:  automatic | manual
  fencing_method:    STONITH | quorum | fencing_token
  dns_ttl:          60 seconds
  connection_retry:  3 attempts, exponential backoff

Conflict Resolution Matrix:
  Data type       │ Strategy    │ Rationale
  ────────────────┼─────────────┼──────────────────────
  User preferences│ LWW         │ Low impact, last edit wins
  Shopping cart    │ CRDT (set)  │ Merge items from both sites
  Inventory count │ CRDT (counter)│ Sum decrements correctly
  Order/payment   │ Single writer│ No conflicts allowed
  Chat messages   │ CRDT (list) │ Merge timelines, no loss`
    },
  },
];
