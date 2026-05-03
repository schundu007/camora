// Enrichment data for projects 1-3: rate-limiter-service, distributed-task-queue, api-gateway

export const enrichment_1_3 = {

  'rate-limiter-service': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Redis Foundation & Algorithm Core',
        description: 'Set up the Redis connection layer and implement the Token Bucket algorithm with atomic Lua scripts.',
        tasks: [
          'Initialize project: pnpm init, install express, ioredis, typescript, ts-node',
          'Create RedisClient singleton with connection pooling and health checks',
          'Write Token Bucket Lua script: read tokens, compute refill, consume, return {allowed, remaining, reset}',
          'Write Sliding Window Counter Lua script using two-key weighted average approach',
          'Unit test both Lua scripts against a local Redis instance with edge cases',
        ],
      },
      {
        phase: 2,
        title: 'Rule Engine & Middleware',
        description: 'Build the rule-matching engine and Express middleware that enforces rate limits per request.',
        tasks: [
          'Define RateLimitRule TypeScript interface: endpoint_pattern, algorithm, rate, window_seconds, burst',
          'Implement rule matcher: exact path > wildcard glob > default fallback using path-to-regexp',
          'Build Express middleware factory: createRateLimiter(rules) returns req/res/next handler',
          'Set standard response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
          'Return 429 JSON body with retryAfter field on exhaustion',
        ],
      },
      {
        phase: 3,
        title: 'Client Identification & Persistence',
        description: 'Handle client identity extraction and persist rule configuration to PostgreSQL.',
        tasks: [
          'Extract client key: JWT sub claim > API key header > IP address fallback chain',
          'Create rules table in PostgreSQL with composite index on (endpoint_pattern, client_type)',
          'Implement rules cache: load from PG on startup, store in Redis hash, TTL 60s with background refresh',
          'Add admin REST endpoints: GET /rules, POST /rules, DELETE /rules/:id',
          'Build rule hot-reload: subscribe to Redis keyspace notifications for rule changes',
        ],
      },
      {
        phase: 4,
        title: 'Monitoring Dashboard',
        description: 'Build a React dashboard showing live rate limit usage, throttled requests, and per-client stats.',
        tasks: [
          'Stream throttle events to a Redis Stream (XADD) with event type, client, endpoint, timestamp',
          'Build SSE endpoint /api/metrics/stream that replays last 100 events then tails the stream',
          'Create React dashboard: requests/sec chart, throttled/sec chart, top throttled clients table',
          'Add per-client drilldown: usage gauge vs limit, recent throttle events, current token count',
          'Implement allowlist management UI: add/remove clients from bypass list',
        ],
      },
    ],

    fileStructure: `rate-limiter-service/
├── src/
│   ├── algorithms/
│   │   ├── tokenBucket.ts       # Lua script + TS wrapper
│   │   ├── slidingWindow.ts     # Sliding window counter
│   │   ├── fixedWindow.ts       # Fixed window fallback
│   │   └── index.ts             # Algorithm factory
│   ├── middleware/
│   │   ├── rateLimiter.ts       # Express middleware factory
│   │   ├── clientIdentity.ts    # Extract client key from request
│   │   └── headers.ts           # Set X-RateLimit-* headers
│   ├── rules/
│   │   ├── ruleEngine.ts        # Rule matching logic
│   │   ├── ruleCache.ts         # Redis-backed rule cache
│   │   └── ruleStore.ts         # PostgreSQL persistence
│   ├── redis/
│   │   ├── client.ts            # ioredis singleton
│   │   └── scripts/
│   │       ├── tokenBucket.lua
│   │       └── slidingWindow.lua
│   ├── routes/
│   │   ├── admin.ts             # Rule CRUD endpoints
│   │   └── metrics.ts           # SSE metrics stream
│   ├── dashboard/               # React frontend (Vite)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── UsageChart.tsx
│   │   │   ├── ClientTable.tsx
│   │   │   └── RuleEditor.tsx
│   │   └── hooks/useMetricsStream.ts
│   └── index.ts                 # Express entry point
├── migrations/
│   └── 001_create_rules.sql
├── tests/
│   ├── algorithms.test.ts
│   └── middleware.test.ts
├── docker-compose.yml
└── package.json`,

    architectureLayers: [
      { name: 'Client Layer', description: 'HTTP clients identified by JWT sub, API key header, or IP address. Identity is extracted and normalized into a consistent client key used as the Redis namespace.' },
      { name: 'Rule Matching Layer', description: 'Incoming request path and client type are matched against stored rules using longest-prefix matching. Specificity order: exact path > wildcard > global default.' },
      { name: 'Algorithm Layer', description: 'Lua scripts execute atomically in Redis, reading current state, computing refill/consumption, and writing back — all in a single round trip. Token Bucket for burst support, Sliding Window for smooth limiting.' },
      { name: 'Redis State Layer', description: 'Single-threaded Redis ensures atomic operations without locks. Keys are namespaced: rl:{algorithm}:{clientKey}:{endpoint}. TTL set to window duration to auto-expire stale entries.' },
      { name: 'Response Layer', description: 'Allowed requests pass through with standard headers injected. Throttled requests receive 429 with Retry-After. All throttle events are published to a Redis Stream for monitoring.' },
      { name: 'Persistence Layer', description: 'PostgreSQL stores the canonical rule definitions. Rules are synced to Redis on startup and refreshed every 60 seconds. Rule changes propagate within one refresh cycle without restart.' },
    ],

    dataModel: {
      description: 'Rules stored in PostgreSQL for durability. Runtime state (token counts, window counters) stored only in Redis with TTLs. Throttle events appended to a Redis Stream for analytics.',
      schema: `-- PostgreSQL: rule definitions
CREATE TABLE rate_limit_rules (
  id           SERIAL PRIMARY KEY,
  endpoint_pattern VARCHAR(255) NOT NULL,  -- e.g. "/api/users/*"
  client_type  VARCHAR(50) NOT NULL DEFAULT 'default', -- 'free' | 'paid' | 'admin'
  algorithm    VARCHAR(30) NOT NULL DEFAULT 'sliding_window',
  rate         INTEGER NOT NULL,           -- requests per window
  window_secs  INTEGER NOT NULL DEFAULT 60,
  burst        INTEGER,                    -- token bucket only: max burst
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rules_pattern_client
  ON rate_limit_rules(endpoint_pattern, client_type);

CREATE TABLE rate_limit_allowlist (
  client_key   VARCHAR(255) PRIMARY KEY,
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Redis: runtime state (not SQL, shown as key schema)
-- Token Bucket:
--   rl:tb:{clientKey}:{endpoint}  →  HASH { tokens FLOAT, last_refill INT }  TTL=window_secs
-- Sliding Window:
--   rl:sw:{clientKey}:{endpoint}:{window_ts}  →  STRING (counter)  TTL=window_secs*2
-- Events Stream:
--   rl:events  →  XADD * { client, endpoint, algorithm, remaining, ts }`,
    },

    apiDesign: {
      description: 'Admin API for rule management and a metrics SSE endpoint. The rate limiter itself is a middleware, not a standalone HTTP service — it wraps any Express app.',
      endpoints: [
        { method: 'GET',    path: '/api/rules',              response: 'Array of RateLimitRule objects with id, endpoint_pattern, client_type, algorithm, rate, window_secs, burst, is_active' },
        { method: 'POST',   path: '/api/rules',              response: '{ id, ...rule } — creates rule and syncs to Redis cache immediately' },
        { method: 'PUT',    path: '/api/rules/:id',          response: '{ id, ...rule } — updates rule and invalidates Redis cache for affected keys' },
        { method: 'DELETE', path: '/api/rules/:id',          response: '204 No Content — soft-deletes rule and removes from Redis cache' },
        { method: 'GET',    path: '/api/metrics/stream',     response: 'SSE stream: throttle_event | stats_tick every 5s with current QPS, throttle rate, top clients' },
        { method: 'GET',    path: '/api/metrics/clients/:key', response: '{ clientKey, currentTokens, windowCount, throttleCount, lastThrottled }' },
        { method: 'POST',   path: '/api/allowlist',          response: '{ clientKey, reason } — adds client to bypass list in Redis SET and PostgreSQL' },
        { method: 'DELETE', path: '/api/allowlist/:key',     response: '204 — removes from allowlist' },
      ],
    },

    codeExamples: {
      typescript: `// src/algorithms/tokenBucket.ts
import { redis } from '../redis/client';

const TOKEN_BUCKET_SCRIPT = \`
local key = KEYS[1]
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])      -- tokens per second
local capacity = tonumber(ARGV[3])  -- max tokens (burst)
local requested = tonumber(ARGV[4]) -- tokens to consume

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now

-- Refill tokens based on elapsed time
local elapsed = math.max(0, now - last_refill)
tokens = math.min(capacity, tokens + elapsed * rate)

local allowed = 0
local remaining = math.floor(tokens)

if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
  remaining = math.floor(tokens)
end

-- Persist updated state with TTL
local ttl = math.ceil(capacity / rate) * 2
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, ttl)

-- Returns: allowed(0|1), remaining, reset_at
return {allowed, remaining, math.ceil(now + (capacity - tokens) / rate)}
\`;

export interface BucketResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function tokenBucketCheck(
  clientKey: string,
  endpoint: string,
  ratePerSec: number,
  capacity: number,
): Promise<BucketResult> {
  const key = \`rl:tb:\${clientKey}:\${endpoint}\`;
  const now = Date.now() / 1000;

  const result = await redis.eval(
    TOKEN_BUCKET_SCRIPT, 1, key,
    now.toString(), ratePerSec.toString(),
    capacity.toString(), '1',
  ) as [number, number, number];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    resetAt: result[2],
  };
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Algorithm: Token Bucket vs Sliding Window Log',
        picked: 'Token Bucket for APIs, Sliding Window Counter for user-facing routes',
        reason: 'Token Bucket allows controlled bursting (important for API clients with bursty traffic) while using O(1) Redis memory. Sliding Window Log is precise but stores one entry per request — unacceptable at high QPS. The Counter variant uses weighted averages across two fixed windows for a good precision/memory balance.',
      },
      {
        choice: 'Atomicity: Lua scripts vs Redis MULTI/EXEC',
        picked: 'Lua scripts',
        reason: 'MULTI/EXEC is optimistic — it can fail if a watched key changes (WATCH/MULTI/EXEC pattern). Lua scripts execute atomically without any possibility of interference, and they reduce round trips from 3+ commands to 1. The tradeoff is Lua script complexity, but for rate limiting the logic is well-defined.',
      },
      {
        choice: 'Rule storage: Redis only vs Redis + PostgreSQL',
        picked: 'PostgreSQL as source of truth, Redis as read cache',
        reason: 'Redis is ephemeral — a crash would delete all rules. PostgreSQL provides durability and audit history. Redis provides sub-millisecond rule lookups on every request. The sync overhead (60s refresh cycle) is acceptable since rule changes are rare and a 60s propagation delay is tolerable.',
      },
      {
        choice: 'Client identification: IP vs JWT vs API key',
        picked: 'Cascading chain: JWT sub → API key → IP',
        reason: 'IP-only limiting is easily bypassed (VPNs, shared IPs for office networks). JWT-based limiting ties limits to the authenticated user identity, which is far more accurate. The cascade handles both authenticated and unauthenticated traffic with appropriate limits for each tier.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Redis Lua Script Atomicity',
        detail: 'Redis is single-threaded; all commands execute sequentially. A Lua script loaded via SCRIPT LOAD and called via EVALSHA runs as a single atomic unit — no other Redis commands can interleave during its execution. This eliminates the TOCTOU (time-of-check-time-of-use) race condition where two concurrent requests both read "1 token remaining" and both succeed. The script must complete within redis.conf\'s lua-time-limit (default 5 seconds) or Redis will kill it.',
      },
      {
        topic: 'Thundering Herd on Retry',
        detail: 'When rate limits expire simultaneously for many clients (e.g., after a fixed window resets), all of them retry at the same instant — flooding the upstream. Mitigations: (1) add random jitter to window start times per client, (2) use sliding windows which reset gradually rather than all at once, (3) return a Retry-After with added jitter: resetAt + random(0, 500ms).',
      },
      {
        topic: 'Distributed Rate Limiting Across Nodes',
        detail: 'A single Redis node is a bottleneck for very high throughput (>100K req/s). Solutions: Redis Cluster (shard by client key hash), allowing each node to handle a subset. For extreme scale, use local approximate counters (in process memory, updated every 100ms) synchronized to Redis periodically — trading precision for throughput. This is the approach used by Cloudflare\'s rate limiter.',
      },
      {
        topic: 'Token Bucket vs Leaky Bucket',
        detail: 'Token Bucket: tokens accumulate up to a max (burst capacity). Requests consume tokens instantly — burst is allowed up to the bucket size. Leaky Bucket: requests enter a queue and are processed at a fixed rate — output is perfectly smooth but burst requests experience queuing delay. Token Bucket is preferred for APIs (clients expect immediate responses), Leaky Bucket for traffic shaping (smoothing output to a downstream service).',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Not making the Redis operation atomic',
        why: 'A read-then-write pattern across two separate Redis commands (GET tokens; SET tokens - 1) has a race window. Two concurrent requests can both read "1 token remaining," both decrement, and both get allowed — effectively doubling the rate limit.',
        solution: 'Use a Lua script or Redis pipeline. The Lua script approach is simpler and more readable. Always test with concurrent load (e.g., autocannon with concurrency=50) to surface race conditions.',
      },
      {
        pitfall: 'Using request IP as the only identifier',
        why: 'Corporate networks route through a single egress IP, so all employees at a company share one rate limit bucket. A single heavy user can block everyone behind the same NAT.',
        solution: 'Use authenticated user ID (JWT sub) as the primary key. Fall back to IP only for unauthenticated endpoints. Consider IP-based limits much higher (e.g., 1000/min) and user-based limits tighter (100/min).',
      },
      {
        pitfall: 'Forgetting the Retry-After header',
        why: 'Without Retry-After, clients either retry immediately (hammering a throttled endpoint) or use fixed backoff (wasting time if the window resets in 2 seconds). Both degrade user experience.',
        solution: 'Always include Retry-After: <seconds> on 429 responses. For token bucket, it is (tokensNeeded - currentTokens) / refillRate. For sliding window, it is windowEnd - now. This enables smart client retry logic.',
      },
      {
        pitfall: 'Setting TTL shorter than the window',
        why: 'If the Redis key expires before the window ends, the counter resets mid-window. A client can get 100 requests, wait for the key to expire (not the window), and get 100 more — effectively bypassing the limit.',
        solution: 'Set key TTL to at least 2x the window duration. For sliding window counter, set TTL to 2 * window_seconds so both the current and previous window keys exist simultaneously for the weighted average calculation.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Redis connection failure',
        impact: 'All rate limit checks fail — either all requests are allowed (fail open) or all blocked (fail closed). Fail closed causes an outage; fail open removes all protection.',
        mitigation: 'Implement a fail-open strategy with circuit breaker: if Redis is down for >5 seconds, allow requests but log a critical alert. Simultaneously, enforce a conservative local in-memory fallback rate limit (e.g., 10 req/s per process) to provide basic protection.',
      },
      {
        scenario: 'Clock skew between Redis nodes in cluster',
        impact: 'Token bucket refill calculation uses server timestamps. If two cluster nodes have different times, a client hitting different nodes gets inconsistent token counts — more or fewer requests than the limit allows.',
        mitigation: 'Use Redis TIME command (ARGV[1] = current time from Redis itself, not application server) to get a consistent timestamp source within the Lua script. This ensures the time used for refill calculation is from the same clock.',
      },
      {
        scenario: 'Very large burst before the first request',
        impact: 'A new client with a fresh bucket has full capacity (e.g., 1000 tokens). They can immediately make 1000 requests — which may be undesirable for new/untrusted clients.',
        mitigation: 'Initialize new buckets at a fraction of capacity (e.g., 10% of burst). Or use a separate "new client" rule with a lower initial limit that graduates to the standard limit after the first successful window.',
      },
      {
        scenario: 'Endpoint pattern ambiguity',
        impact: 'A request to /api/users/123/posts could match both "/api/users/*" (100/min) and "/api/*/posts" (50/min). Applying the wrong rule over- or under-limits the client.',
        mitigation: 'Use longest-prefix matching: the most specific pattern wins. If two patterns have equal specificity, prefer the more restrictive (lower) rate. Document the matching algorithm clearly in admin UI so operators understand which rule applies.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you scale this to handle 1 million requests per second?',
        answer: 'Redis Cluster shards keys across nodes by hash slot — each node handles ~1/N of the traffic. Additionally, use a two-tier approach: a local in-process counter (updated every 10ms) handles the hot path, with periodic sync to Redis to reconcile distributed state. Accept up to ~1% over-counting for the synchronization window. This reduces Redis round trips by 100x.',
      },
      {
        question: 'How do you handle rate limiting for a multi-tenant SaaS where tenants have different limits?',
        answer: 'Add a tenant_id dimension to the rule schema. Key format becomes rl:{algorithm}:{tenantId}:{clientKey}:{endpoint}. Rules are matched by (endpoint_pattern, tenant_id) with a tenant-level override taking precedence over the global default. Tenant limits are loaded into Redis at tenant provisioning time and updated immediately on plan changes.',
      },
      {
        question: 'What is the difference between rate limiting and throttling?',
        answer: 'Rate limiting rejects excess requests immediately (429 response). Throttling queues excess requests and processes them at a controlled rate — clients wait rather than being rejected. Throttling is better for batch APIs where clients can tolerate delay. Rate limiting is better for real-time APIs where a delayed response is worse than an immediate rejection.',
      },
      {
        question: 'How would you test this in production without impacting users?',
        answer: 'Shadow mode: evaluate rate limit decisions but do not enforce them. Log every request that would have been throttled. Analyze the logs to tune limits before enabling enforcement. Use feature flags to enable enforcement for a small percentage of traffic first. Monitor error rates and latency during the rollout.',
      },
    ],

    extensionIdeas: [
      { idea: 'GraphQL query cost limiting', difficulty: 'advanced', description: 'Parse incoming GraphQL queries, calculate a complexity score (fields × depth), and deduct from a token bucket based on query cost rather than request count. Prevents expensive nested queries from consuming disproportionate resources.' },
      { idea: 'Dynamic limit adjustment based on server load', difficulty: 'advanced', description: 'Expose a /metrics endpoint from each backend service. The rate limiter subscribes to these metrics and automatically tightens limits when CPU > 80% or p99 latency > SLA — acting as an adaptive load shedder without manual tuning.' },
      { idea: 'Rate limit analytics dashboard with anomaly detection', difficulty: 'intermediate', description: 'Store throttle event time-series in TimescaleDB. Run a moving Z-score anomaly detector: flag clients whose throttle rate exceeds 3σ above their historical baseline. Surface these as potential abuse or misbehaving clients in an admin dashboard.' },
      { idea: 'gRPC interceptor integration', difficulty: 'intermediate', description: 'Port the rate limiter to a gRPC unary and streaming interceptor. Extract client identity from gRPC metadata (Authorization header or TLS client certificate). Return codes.ResourceExhausted with the same retry information as the HTTP 429 response.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'distributed-task-queue': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Queue Core with BullMQ',
        description: 'Set up BullMQ queues, define job schemas, and build the producer API.',
        tasks: [
          'Install bullmq, ioredis, express, zod, typescript, pg; configure BullMQ connection to Redis',
          'Define job type registry: JobType enum + per-type payload Zod schemas',
          'Create QueueManager: singleton that initializes named queues with default job options',
          'Build producer API: POST /api/jobs with validation, deduplication via jobId, and priority 1-10',
          'Implement delayed jobs: schedule jobs at a future timestamp using BullMQ delay option',
        ],
      },
      {
        phase: 2,
        title: 'Worker Implementation & Retry Policy',
        description: 'Build worker processes that consume tasks with configurable concurrency and retry logic.',
        tasks: [
          'Create Worker class wrapping BullMQ Worker with per-queue concurrency settings',
          'Implement job router: dispatch to handler function based on job.name (job type)',
          'Configure exponential backoff: attempts=5, backoff={type:"exponential", delay:1000}',
          'Build dead letter queue: move failed jobs (after max attempts) to DLQ using BullMQ failedJobsToKeep + separate DLQ queue',
          'Add graceful shutdown: worker.pause() → drain in-flight jobs → worker.close()',
        ],
      },
      {
        phase: 3,
        title: 'Persistence & Job Lifecycle Tracking',
        description: 'Persist job metadata to PostgreSQL and track full lifecycle events.',
        tasks: [
          'Create jobs table in PostgreSQL: id, queue, type, payload, status, attempts, result, created_at, started_at, completed_at',
          'Hook into BullMQ events: active, completed, failed, stalled — write lifecycle events to PG',
          'Implement idempotency: check jobs table for existing jobId before enqueuing',
          'Build job query API: GET /api/jobs/:id, GET /api/jobs?status=failed&queue=email&page=1',
          'Add job cancellation: mark PG record as cancelled, use BullMQ job.remove() if still waiting',
        ],
      },
      {
        phase: 4,
        title: 'Monitoring Dashboard',
        description: 'React dashboard showing queue depths, throughput, failure rates, and DLQ management.',
        tasks: [
          'Create /api/metrics endpoint returning queue stats via BullMQ QueueEvents + getJobCounts()',
          'Build React dashboard with recharts: queue depth over time, jobs/min throughput, error rate',
          'Add DLQ inspector: list dead letter jobs with payload, error stack, retry history',
          'Implement one-click re-queue for DLQ jobs with optional payload edit before retry',
          'Add real-time updates via WebSocket: push queue stats every 2 seconds',
        ],
      },
    ],

    fileStructure: `distributed-task-queue/
├── src/
│   ├── queues/
│   │   ├── manager.ts           # BullMQ Queue instances registry
│   │   ├── producer.ts          # Enqueue helpers with dedup + validation
│   │   └── definitions.ts       # Job type registry + Zod schemas
│   ├── workers/
│   │   ├── workerPool.ts        # Manages multiple Worker instances
│   │   ├── jobRouter.ts         # Dispatches jobs to handlers by type
│   │   └── handlers/
│   │       ├── emailHandler.ts
│   │       ├── imageHandler.ts
│   │       └── reportHandler.ts
│   ├── retry/
│   │   ├── backoffPolicy.ts     # Exponential backoff config builder
│   │   └── deadLetterQueue.ts   # DLQ management helpers
│   ├── persistence/
│   │   ├── jobRepository.ts     # PostgreSQL job CRUD
│   │   └── lifecycleHooks.ts    # BullMQ event → PG writes
│   ├── routes/
│   │   ├── jobs.ts              # Enqueue, query, cancel endpoints
│   │   └── metrics.ts           # Queue stats + WebSocket push
│   ├── dashboard/               # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── QueueDepthChart.tsx
│   │   │   ├── ThroughputChart.tsx
│   │   │   └── DLQInspector.tsx
│   │   └── hooks/useQueueStats.ts
│   └── index.ts
├── migrations/
│   └── 001_create_jobs.sql
├── tests/
│   ├── producer.test.ts
│   └── worker.test.ts
├── docker-compose.yml           # Node + Redis + PostgreSQL
└── package.json`,

    architectureLayers: [
      { name: 'Producer Layer', description: 'Express API that validates job payloads against Zod schemas, assigns priority, checks for duplicate jobIds, and enqueues to BullMQ. Returns jobId immediately — fire and forget.' },
      { name: 'Queue Layer (Redis)', description: 'BullMQ uses Redis sorted sets for scheduling (by priority + delay), lists for the active processing queue, and hashes for job metadata. Provides at-least-once delivery via the active job set.' },
      { name: 'Worker Layer', description: 'Multiple worker processes (or concurrency slots) pull from the queue using BRPOPLPUSH. Each worker processes one job, updates status, and acknowledges or fails the job. Concurrency per queue is tunable.' },
      { name: 'Retry Engine', description: 'Failed jobs are automatically re-queued with exponential backoff delays calculated by BullMQ. After max attempts, moved to the dead letter queue (separate BullMQ queue) with full failure context preserved.' },
      { name: 'Persistence Layer', description: 'PostgreSQL stores durable job records with full lifecycle history. BullMQ events (active, completed, failed) trigger writes. Enables job querying, audit trails, and recovery after Redis restarts.' },
      { name: 'Monitoring Layer', description: 'BullMQ QueueEvents subscribers aggregate real-time stats. WebSocket pushes these to the React dashboard. Dead letter jobs are surfaced for human inspection and re-queue decisions.' },
    ],

    dataModel: {
      description: 'PostgreSQL holds durable job records and lifecycle history. Redis (via BullMQ) holds ephemeral queue state. The two are kept in sync via BullMQ event hooks.',
      schema: `-- PostgreSQL: durable job records
CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   VARCHAR(255) UNIQUE,        -- caller-provided dedup key
  queue_name    VARCHAR(100) NOT NULL,
  job_type      VARCHAR(100) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  priority      SMALLINT NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
  status        VARCHAR(20) NOT NULL DEFAULT 'waiting',
    -- waiting | active | completed | failed | cancelled | delayed
  attempts      SMALLINT NOT NULL DEFAULT 0,
  max_attempts  SMALLINT NOT NULL DEFAULT 3,
  result        JSONB,
  error_message TEXT,
  error_stack   TEXT,
  scheduled_at  TIMESTAMPTZ,               -- for delayed jobs
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_queue_status ON jobs(queue_name, status);
CREATE INDEX idx_jobs_created_at   ON jobs(created_at DESC);

CREATE TABLE job_events (
  id         SERIAL PRIMARY KEY,
  job_id     UUID REFERENCES jobs(id),
  event      VARCHAR(50) NOT NULL,          -- enqueued | active | completed | failed | retrying
  attempt    SMALLINT,
  detail     JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redis key schema (BullMQ managed, shown for reference)
-- bull:{queueName}:waiting   → SORTED SET (score=priority, member=jobId)
-- bull:{queueName}:active    → LIST of jobIds currently being processed
-- bull:{queueName}:delayed   → SORTED SET (score=runAt timestamp)
-- bull:{queueName}:failed    → SORTED SET (score=failedAt timestamp)
-- bull:{queueName}:{jobId}   → HASH { name, data, opts, progress, ... }`,
    },

    apiDesign: {
      description: 'REST API for job management. Workers are internal processes, not HTTP endpoints. Metrics exposed via REST and WebSocket for the dashboard.',
      endpoints: [
        { method: 'POST',   path: '/api/jobs',                  response: '{ jobId, queue, type, status: "waiting", position } — enqueues job' },
        { method: 'GET',    path: '/api/jobs/:id',              response: 'Full job record with status, attempts, result, events array' },
        { method: 'DELETE', path: '/api/jobs/:id',              response: '204 — cancels waiting/delayed job; 409 if already active/completed' },
        { method: 'POST',   path: '/api/jobs/:id/retry',        response: '{ jobId, newStatus: "waiting" } — re-enqueues failed or DLQ job' },
        { method: 'GET',    path: '/api/jobs',                  response: 'Paginated list filterable by queue, status, type, dateRange' },
        { method: 'GET',    path: '/api/queues',                response: 'Array of { name, waiting, active, completed, failed, delayed } counts' },
        { method: 'GET',    path: '/api/queues/:name/dlq',      response: 'Paginated DLQ jobs with payload, error, retry history' },
        { method: 'GET',    path: '/api/metrics/ws',            response: 'WebSocket: pushes QueueStats every 2s — { queue, depths, throughput, errorRate }' },
      ],
    },

    codeExamples: {
      typescript: `// src/workers/workerPool.ts — reliable worker with graceful shutdown
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from '../redis/client';
import { jobRouter } from './jobRouter';
import { updateJobStatus } from '../persistence/jobRepository';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '5');

export function createWorker(queueName: string): Worker {
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      await updateJobStatus(job.id!, 'active', { startedAt: new Date() });

      try {
        const result = await jobRouter(job.name, job.data, job);
        await updateJobStatus(job.id!, 'completed', { result, completedAt: new Date() });
        return result;
      } catch (err) {
        const error = err as Error;

        // UnrecoverableError skips retries — goes straight to DLQ
        if (error.message.includes('INVALID_PAYLOAD')) {
          throw new UnrecoverableError(error.message);
        }

        await updateJobStatus(job.id!, 'failed', {
          error: error.message,
          stack: error.stack,
          attempt: job.attemptsMade,
        });
        throw err; // re-throw so BullMQ applies backoff
      }
    },
    {
      connection: redis,
      concurrency: CONCURRENCY,
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      settings: {
        backoffStrategy: (attemptsMade) =>
          Math.min(1000 * Math.pow(2, attemptsMade - 1), 60_000),
      },
    },
  );

  // Move exhausted jobs to DLQ
  worker.on('failed', async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      const dlq = getQueue('dead-letter');
      await dlq.add('dlq-entry', {
        originalQueue: queueName,
        originalJobId: job.id,
        type: job.name,
        payload: job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
        attempts: job.attemptsMade,
      });
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await worker.pause();          // stop accepting new jobs
    await worker.close();          // wait for in-flight jobs to finish
    process.exit(0);
  });

  return worker;
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Queue implementation: BullMQ vs raw Redis vs RabbitMQ',
        picked: 'BullMQ',
        reason: 'BullMQ provides built-in priority queues, delayed jobs, retries, rate limiting, and a battle-tested Redis schema — saving weeks of implementation. RabbitMQ requires running an additional broker and is harder to inspect. Raw Redis gives full control but requires reimplementing everything BullMQ already handles correctly.',
      },
      {
        choice: 'Delivery guarantee: at-most-once vs at-least-once',
        picked: 'At-least-once delivery',
        reason: 'Jobs are moved to the active set atomically (RPOPLPUSH). If a worker crashes, the job stays in the active set and is eventually re-queued after the stall timeout. This means jobs must be idempotent, but it prevents silent job loss — which is far worse than a duplicate execution in most use cases.',
      },
      {
        choice: 'Job state storage: Redis only vs Redis + PostgreSQL',
        picked: 'Redis (BullMQ) for queue state, PostgreSQL for job history',
        reason: 'Redis with BullMQ handles the hot path efficiently. PostgreSQL provides durability, queryability (SQL filters on status/type/date), and a historical record that survives Redis restarts. BullMQ event hooks keep both in sync with minimal overhead.',
      },
      {
        choice: 'Worker process model: single process vs worker threads vs separate processes',
        picked: 'Separate OS processes with cluster module',
        reason: 'Node.js is single-threaded per process. For CPU-bound jobs, worker threads share the event loop and can starve each other. Separate processes isolate failures (one crash does not kill all workers) and enable independent scaling. Use PM2 or Kubernetes to manage the pool.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'At-Least-Once Delivery and Idempotency',
        detail: 'BullMQ moves jobs from the waiting list to the active set atomically. If a worker crashes mid-job, BullMQ detects the stall (job in active set longer than the stall interval, default 30s) and moves the job back to waiting for retry. This guarantees at-least-once delivery but means any job that can be retried must be idempotent. Use the job\'s external_id as an idempotency key in the handler — check if the operation already completed before executing.',
      },
      {
        topic: 'Backpressure and Queue Overflow',
        detail: 'Without backpressure, producers can enqueue millions of jobs faster than workers can process them, consuming unbounded Redis memory. BullMQ supports a maxSizeBytes limit per queue. Alternatively, implement producer-side flow control: check queue depth before enqueuing and block (or return 429) if depth exceeds a threshold. For time-critical jobs, use priority queues — high-priority work always drains first.',
      },
      {
        topic: 'Distributed Tracing Across Job Boundaries',
        detail: 'A job enqueued by a web request should carry the trace context (OpenTelemetry trace ID) so the processing span is linked to the originating HTTP request. Inject trace context into job data on enqueue, extract and continue the trace in the worker handler. This enables end-to-end request tracing across async boundaries in tools like Jaeger or Honeycomb.',
      },
      {
        topic: 'Scheduled Jobs and Cron Patterns',
        detail: 'BullMQ supports repeateable jobs (cron-style): queue.add("dailyReport", data, { repeat: { pattern: "0 9 * * 1-5" } }). The scheduler runs in a separate process and uses Redis ZADD to enqueue jobs at the right time. For one-off scheduled jobs, use the delay option (delay: Date.now() + 3600000 for 1 hour from now). Ensure only one scheduler process runs at a time — use a Redis lock (Redlock) to prevent duplicate scheduling.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Non-idempotent job handlers',
        why: 'At-least-once delivery means a job can execute multiple times — on worker crash, stall timeout, or manual retry. A non-idempotent handler (e.g., charging a credit card, sending an email) will duplicate side effects on retry.',
        solution: 'Check if the operation already completed using the job\'s external_id before executing. Store completion state in PostgreSQL with a unique constraint on external_id. On duplicate execution, return early without re-executing the side effect.',
      },
      {
        pitfall: 'Blocking the event loop inside a worker',
        why: 'CPU-intensive work (image resize, PDF generation) blocks Node\'s event loop. This starves other jobs in the same worker process and delays heartbeat signals — causing BullMQ to incorrectly mark the job as stalled.',
        solution: 'Offload CPU-intensive work to worker_threads or a child process. For very heavy work, publish a sub-job to a separate queue handled by a dedicated worker pool. Always use async/await for I/O.',
      },
      {
        pitfall: 'Infinite retry loops on permanent failures',
        why: 'A job that fails due to a permanent condition (invalid payload, deleted resource) will be retried max_attempts times, consuming worker capacity and delaying legitimate jobs.',
        solution: 'Throw UnrecoverableError (BullMQ) for permanent failures — it immediately moves the job to the failed state without retrying. Classify errors upfront: transient (network timeout → retry) vs permanent (validation failure → no retry).',
      },
      {
        pitfall: 'Not monitoring DLQ growth',
        why: 'Dead letter queues silently accumulate failed jobs. A DLQ with 10,000 entries means 10,000 lost operations that users are waiting for.',
        solution: 'Alert when DLQ depth exceeds a threshold (e.g., 100 jobs). Set up a daily DLQ review process. For each DLQ entry, log a structured error with job type, payload, and full error stack so on-call engineers can quickly diagnose and replay.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Redis restart or crash',
        impact: 'BullMQ stores all queue state in Redis. A crash without persistence loses all waiting and delayed jobs. Active jobs (in the active list) are also lost.',
        mitigation: 'Enable Redis persistence: RDB snapshots every 60 seconds + AOF (appendonly yes). Use Redis Sentinel or Redis Cluster for HA. PostgreSQL job records serve as a recovery source — on startup, sync any jobs in PG status=waiting that are not in Redis back to the BullMQ queue.',
      },
      {
        scenario: 'Job payload exceeds Redis memory limits',
        impact: 'Very large payloads (>1MB, e.g., uploaded file contents) inflate Redis memory and reduce queue throughput.',
        mitigation: 'Store large payloads in S3/object storage on enqueue. Store only the S3 reference in the job payload. The worker fetches the actual content from S3 during processing. Enforce a max payload size (64KB) in the producer with a 400 error for oversized payloads.',
      },
      {
        scenario: 'Worker deployment during active job processing',
        impact: 'A rolling deployment kills workers mid-job. Jobs in the active state appear stalled and are re-queued after the stall timeout, leading to duplicate execution.',
        mitigation: 'Implement graceful shutdown: on SIGTERM, stop the worker from accepting new jobs (worker.pause()), wait for all in-flight jobs to complete (worker.close()), then exit. Set Kubernetes terminationGracePeriodSeconds to longer than the longest expected job duration.',
      },
      {
        scenario: 'Priority inversion under high load',
        impact: 'High-priority jobs starve when the queue is flooded with lower-priority jobs that arrived earlier. BullMQ uses ZADD scores but a saturated worker pool may still process low-priority jobs that were already in the active state.',
        mitigation: 'Use separate queues for different priority tiers (critical, standard, batch) rather than a single queue with priority numbers. Allocate dedicated workers to each queue with capacity proportional to importance. This provides hard isolation rather than best-effort priority.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you handle exactly-once delivery?',
        answer: 'True exactly-once requires distributed transactions. Practical approach: at-least-once delivery with idempotent consumers. For each job, store a completion record in PostgreSQL with a unique constraint on (job_type, idempotency_key). Before executing, check if the record exists. Wrap the check, execution, and record insertion in a transaction. This achieves effectively-once semantics at the application layer.',
      },
      {
        question: 'How do you handle a slow consumer that falls behind the queue depth?',
        answer: 'Scale workers horizontally: add more worker processes or pods. Use backpressure: the producer checks queue depth and slows down if it exceeds a threshold. For sustained overload, implement queue shedding: drop lowest-priority jobs after they exceed a TTL (stale data). Add alerts: queue depth > N or processing lag > X minutes triggers on-call.',
      },
      {
        question: 'How would you implement job chaining (job A triggers job B on completion)?',
        answer: 'BullMQ supports job flows natively: a parent job is not marked complete until all its children complete. Alternatively, implement chaining in the job handler: on successful completion, enqueue the next job with the result as its payload. Store the chain definition in a workflow table and track completion state per step.',
      },
      {
        question: 'What happens if a job takes longer than the lock duration?',
        answer: 'BullMQ uses an internal lock (TTL = 30 seconds by default) renewed every 15 seconds (lockRenewTime). If the worker stops renewing (blocked event loop, crash), the lock expires and BullMQ moves the job back to waiting after the stall timeout. To fix: increase lockDuration for known long-running jobs, or offload long-running work to a separate process and have the job just track status.',
      },
    ],

    extensionIdeas: [
      { idea: 'Workflow engine with DAG support', difficulty: 'advanced', description: 'Define jobs as nodes in a directed acyclic graph (DAG). Each node specifies its dependencies. The scheduler enqueues a job only when all its dependencies have completed successfully. Supports fan-out (one job triggers many) and fan-in (one job waits for many).' },
      { idea: 'Job progress reporting with SSE', difficulty: 'beginner', description: 'Have workers call job.updateProgress(percent) periodically. Stream progress updates via SSE from GET /api/jobs/:id/progress. Display a progress bar in the dashboard for long-running jobs like video transcoding or report generation.' },
      { idea: 'Rate-limited job execution', difficulty: 'intermediate', description: 'Use BullMQ rate limiter option (limiter: { max: 10, duration: 1000 }) to ensure workers process at most N jobs per second. Useful for jobs that call third-party APIs with their own rate limits — prevents triggering 429s from external services.' },
      { idea: 'Multi-region queue federation', difficulty: 'advanced', description: 'Deploy worker pools in multiple regions (US, EU, APAC). Route jobs to the nearest region based on producer location or data residency requirements. Use a global PostgreSQL database to track job state; use regional Redis clusters for fast queue operations. Implement cross-region failover: if a regional queue is down, re-route jobs to another region.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'api-gateway': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Reverse Proxy Core',
        description: 'Build the request routing and upstream proxying engine.',
        tasks: [
          'Install http-proxy-middleware or node-http-proxy, express, ioredis, typescript',
          'Define RouteConfig interface: path, upstream URL, stripPrefix, methods, timeout',
          'Implement route matcher: sort routes by specificity, use longest-prefix match',
          'Build proxy handler: forward request headers, stream response body back to client',
          'Add X-Request-ID header injection and X-Forwarded-For propagation',
        ],
      },
      {
        phase: 2,
        title: 'Middleware Chain',
        description: 'Build the ordered middleware pipeline: auth → rate limit → cache → circuit breaker → proxy.',
        tasks: [
          'JWT authentication middleware: verify token, attach user to request context',
          'Per-client rate limiting middleware using Redis sliding window (reuse from rate-limiter project)',
          'Response cache middleware: compute cache key, check Redis, store on miss with Cache-Control TTL',
          'Circuit breaker middleware: track failure counts per upstream, open/half-open/closed state machine',
          'Request/response transformation middleware: header injection, path rewriting, body enrichment',
        ],
      },
      {
        phase: 3,
        title: 'Service Registry & Health Checks',
        description: 'Manage upstream service catalog with health monitoring and automatic route disabling.',
        tasks: [
          'Create service registry: load route config from YAML file or admin API at startup',
          'Implement health checker: poll each upstream /health endpoint every 10 seconds',
          'Auto-disable routes when upstream fails 3 consecutive health checks',
          'Build hot-reload: watch config file for changes, apply without restart',
          'Add service discovery stub: integrate with Consul or Kubernetes service DNS (optional)',
        ],
      },
      {
        phase: 4,
        title: 'Observability & Admin API',
        description: 'Access logs, distributed tracing, metrics, and an admin dashboard.',
        tasks: [
          'Structured access logs: JSON with requestId, method, path, upstream, status, latency',
          'Prometheus metrics endpoint /metrics: request_total, request_duration_histogram, circuit_state gauge',
          'Build admin REST API: CRUD for routes, view circuit breaker states, flush cache',
          'React admin dashboard: route table, upstream health indicators, request traffic charts',
          'Add OpenTelemetry tracing: inject trace headers into upstream requests, export to Jaeger',
        ],
      },
    ],

    fileStructure: `api-gateway/
├── src/
│   ├── proxy/
│   │   ├── router.ts            # Route matching engine
│   │   ├── proxyHandler.ts      # Forward request to upstream
│   │   └── transformer.ts       # Header/path/body transformations
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── rateLimiter.ts       # Per-client Redis rate limiting
│   │   ├── cache.ts             # Response caching in Redis
│   │   ├── circuitBreaker.ts    # Circuit breaker state machine
│   │   └── pipeline.ts          # Assembles ordered middleware chain
│   ├── registry/
│   │   ├── serviceRegistry.ts   # In-memory route config + hot reload
│   │   ├── healthChecker.ts     # Polls upstream health endpoints
│   │   └── configLoader.ts      # Parses YAML/JSON route config
│   ├── redis/
│   │   └── client.ts
│   ├── metrics/
│   │   ├── prometheus.ts        # prom-client counters/histograms
│   │   └── accessLogger.ts      # Structured JSON access logs
│   ├── routes/
│   │   ├── admin.ts             # Route CRUD, circuit breaker ops
│   │   └── health.ts            # Gateway self-health endpoint
│   ├── dashboard/               # React admin UI
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── RouteTable.tsx
│   │       ├── UpstreamHealth.tsx
│   │       └── TrafficChart.tsx
│   └── index.ts
├── config/
│   └── routes.yaml              # Route definitions
├── docker-compose.yml
└── package.json`,

    architectureLayers: [
      { name: 'Client Layer', description: 'External HTTP clients send requests to the gateway. The gateway is the single entry point — clients never know the upstream service addresses.' },
      { name: 'Authentication Layer', description: 'JWT verification middleware validates the Bearer token and attaches the decoded user payload to the request. Routes can be marked as auth: required | optional | none. Invalid tokens return 401 immediately.' },
      { name: 'Rate Limiting Layer', description: 'Per-client sliding window rate limiting using Redis. Limits are configured per route and client tier. Throttled requests return 429 with Retry-After before reaching upstream.' },
      { name: 'Cache Layer', description: 'GET responses are cached in Redis using a key derived from method + path + query string hash. Cache-Control headers from upstream determine TTL. Cache hits bypass the proxy entirely, returning sub-millisecond responses.' },
      { name: 'Circuit Breaker Layer', description: 'Tracks success/failure counts per upstream over a rolling window. Opens the circuit (fail fast) when the error rate exceeds the threshold. Half-open state allows one probe request to test recovery. Prevents cascade failures.' },
      { name: 'Proxy Layer', description: 'Forwards the request to the matched upstream using HTTP. Streams the response body back to the client. Injects X-Request-ID, X-Forwarded-For, and X-Gateway-Version headers.' },
      { name: 'Observability Layer', description: 'Every request writes a structured JSON log entry. Prometheus counters and histograms are updated. OpenTelemetry spans are created and propagated to upstream via W3C trace context headers.' },
    ],

    dataModel: {
      description: 'Route configuration is stored in YAML (file) or PostgreSQL (admin API). Runtime state (circuit breaker counts, cache entries) is in Redis. No persistent state for individual requests.',
      schema: `-- PostgreSQL: route configuration (admin API managed)
CREATE TABLE gateway_routes (
  id              SERIAL PRIMARY KEY,
  path_pattern    VARCHAR(255) NOT NULL,      -- e.g. "/api/users/*"
  upstream_url    VARCHAR(500) NOT NULL,
  strip_prefix    VARCHAR(100),               -- prefix to remove before forwarding
  methods         TEXT[] DEFAULT ARRAY['GET','POST','PUT','DELETE','PATCH'],
  auth_required   BOOLEAN NOT NULL DEFAULT true,
  rate_limit      INTEGER DEFAULT 100,        -- requests per minute
  cache_ttl_secs  INTEGER DEFAULT 0,          -- 0 = no caching
  timeout_ms      INTEGER DEFAULT 30000,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Redis: runtime state (key schema)
-- Circuit breaker state:
--   gw:cb:{upstream}:state    → STRING  'closed' | 'open' | 'half-open'  TTL=none
--   gw:cb:{upstream}:failures → STRING  counter  TTL=rolling_window_secs
--   gw:cb:{upstream}:last_fail → STRING  timestamp

-- Response cache:
--   gw:cache:{method}:{pathHash}  → STRING  response body  TTL=cache_ttl_secs
--   gw:cache:{method}:{pathHash}:headers  → HASH  response headers

-- Rate limit keys (same schema as rate-limiter-service):
--   rl:sw:{clientKey}:{path}:{window}  → STRING  counter  TTL=window_secs*2`,
    },

    apiDesign: {
      description: 'Admin API for managing routes and monitoring gateway state. All proxied requests go through the gateway transparently.',
      endpoints: [
        { method: 'GET',    path: '/admin/routes',                  response: 'Array of all route configs with health status and circuit breaker state' },
        { method: 'POST',   path: '/admin/routes',                  response: 'Created route config; immediately active after hot-reload' },
        { method: 'PUT',    path: '/admin/routes/:id',              response: 'Updated route; hot-reloaded without restart' },
        { method: 'DELETE', path: '/admin/routes/:id',              response: '204 — disables route immediately' },
        { method: 'GET',    path: '/admin/upstreams',               response: 'Array of { upstream, state: closed|open|half-open, failureRate, lastError }' },
        { method: 'POST',   path: '/admin/upstreams/:id/reset',     response: '{ upstream, newState: "closed" } — manually resets circuit breaker' },
        { method: 'DELETE', path: '/admin/cache',                   response: '{ flushed: N } — clears all cached responses' },
        { method: 'DELETE', path: '/admin/cache/:pathPattern',      response: '{ flushed: N } — clears cache entries matching pattern' },
        { method: 'GET',    path: '/health',                        response: '{ status: "ok", upstreams: [{url, healthy}] }' },
        { method: 'GET',    path: '/metrics',                       response: 'Prometheus text format: request_total, request_duration_seconds, circuit_state' },
      ],
    },

    codeExamples: {
      typescript: `// src/middleware/circuitBreaker.ts
import { redis } from '../redis/client';
import type { Request, Response, NextFunction } from 'express';

const FAILURE_THRESHOLD = 5;     // failures in rolling window
const WINDOW_SECS       = 60;    // rolling window size
const OPEN_TIMEOUT_MS   = 30_000; // time before trying half-open
const HALF_OPEN_LIMIT   = 1;     // probe requests allowed when half-open

type CBState = 'closed' | 'open' | 'half-open';

async function getState(upstream: string): Promise<CBState> {
  const state = await redis.get(\`gw:cb:\${upstream}:state\`);
  if (state === 'open') {
    // Check if it is time to attempt half-open
    const openedAt = await redis.get(\`gw:cb:\${upstream}:opened_at\`);
    if (openedAt && Date.now() - parseInt(openedAt) > OPEN_TIMEOUT_MS) {
      await redis.set(\`gw:cb:\${upstream}:state\`, 'half-open');
      return 'half-open';
    }
  }
  return (state as CBState) ?? 'closed';
}

async function recordFailure(upstream: string): Promise<void> {
  const key = \`gw:cb:\${upstream}:failures\`;
  const count = await redis.incr(key);
  await redis.expire(key, WINDOW_SECS);

  if (count >= FAILURE_THRESHOLD) {
    await redis.set(\`gw:cb:\${upstream}:state\`, 'open');
    await redis.set(\`gw:cb:\${upstream}:opened_at\`, Date.now().toString());
  }
}

async function recordSuccess(upstream: string): Promise<void> {
  const state = await redis.get(\`gw:cb:\${upstream}:state\`);
  if (state === 'half-open') {
    // Probe succeeded — close the circuit
    await redis.set(\`gw:cb:\${upstream}:state\`, 'closed');
    await redis.del(\`gw:cb:\${upstream}:failures\`);
  }
}

export function circuitBreakerMiddleware(upstream: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const state = await getState(upstream);

    if (state === 'open') {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        upstream,
        retryAfter: Math.ceil(OPEN_TIMEOUT_MS / 1000),
      });
    }

    // Monkey-patch res.end to intercept upstream response
    const originalEnd = res.end.bind(res);
    res.end = async function (chunk?: unknown, ...args: unknown[]) {
      if (res.statusCode >= 500) {
        await recordFailure(upstream);
      } else {
        await recordSuccess(upstream);
      }
      return (originalEnd as Function)(chunk, ...args);
    } as typeof res.end;

    next();
  };
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Circuit breaker state storage: in-process vs Redis',
        picked: 'Redis',
        reason: 'In-process state means each gateway instance has its own view of circuit state. Instance A might have the circuit open while Instance B still forwards traffic to the failing upstream. Redis provides a shared view across all gateway instances — a circuit opened by any instance is seen by all.',
      },
      {
        choice: 'Proxy library: http-proxy-middleware vs custom node http.request',
        picked: 'http-proxy-middleware for the core, custom headers/transforms layered on top',
        reason: 'http-proxy-middleware handles WebSocket upgrades, streaming, chunked encoding, and edge cases that are hard to implement correctly from scratch. Custom code is added for transformation logic. The hybrid approach gets robustness from the library and flexibility from custom middleware.',
      },
      {
        choice: 'Cache key strategy: full URL vs hash of normalized params',
        picked: 'MD5 hash of normalized (method + sorted query params + relevant headers)',
        reason: 'Full URLs as keys work but become large for complex query strings. Normalization (sorting query params) ensures /api?b=2&a=1 and /api?a=1&b=2 share the same cache entry. Hashing keeps keys short and Redis memory efficient. Exclude volatile headers (Authorization, Cookie) from the cache key.',
      },
      {
        choice: 'Route config source: YAML files vs database',
        picked: 'YAML for development, PostgreSQL for production with hot-reload',
        reason: 'YAML is version-controllable and works well in development. PostgreSQL enables dynamic updates via admin API without redeployment. The config loader checks both sources at startup; PostgreSQL overrides YAML for matching routes. A file watcher or Postgres LISTEN/NOTIFY triggers hot-reload.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Circuit Breaker State Machine',
        detail: 'The circuit breaker has three states: Closed (normal operation, all requests pass through), Open (upstream is failing, all requests fail fast with 503), and Half-Open (test mode, one probe request is allowed through). Transitions: Closed → Open when failure rate exceeds threshold. Open → Half-Open after a timeout. Half-Open → Closed if the probe succeeds; Half-Open → Open if it fails. The Half-Open state prevents repeated open-close oscillation during partial recovery.',
      },
      {
        topic: 'Request Deduplication for Idempotent Upstreams',
        detail: 'Network retries (from mobile clients, load balancers) can cause duplicate requests. For idempotent requests with an Idempotency-Key header, store the response in Redis keyed by (client_id, idempotency_key). On duplicate requests, return the cached response immediately without forwarding to upstream. Expire the cache after 24 hours — balancing safety against memory usage.',
      },
      {
        topic: 'Header Propagation and Trust Boundaries',
        detail: 'Never blindly forward headers from external clients to internal services. Strip internal-only headers (X-Internal-User-Id, X-Admin-Token) from inbound requests to prevent privilege escalation. Inject trusted identity headers (X-User-Id, X-User-Email) based on the validated JWT, not client-provided values. Add X-Forwarded-For with the real client IP, not a proxy-injected value that could be spoofed.',
      },
      {
        topic: 'Caching and Cache Invalidation',
        detail: 'The two hard problems: what to cache and when to invalidate. Cache only idempotent responses (GET). Respect upstream Cache-Control headers (no-store = never cache, max-age = TTL). For cache invalidation, use tag-based invalidation: tag cache entries with resource types (e.g., "user:123"), and flush all entries with a given tag on write operations. This avoids point-in-time expiry while maintaining consistency.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Forwarding the Authorization header to all upstreams',
        why: 'The raw JWT contains the user\'s credentials. If upstream Service B receives the JWT, it could extract user data or be exploited if Service B is compromised. Also, different services may use different auth systems.',
        solution: 'Strip the Authorization header before forwarding. Instead, inject X-User-Id, X-User-Email, and X-User-Role headers derived from the validated JWT. Internal services trust these gateway-injected headers. This also allows different upstreams to use different auth implementations without coupling them.',
      },
      {
        pitfall: 'Opening the circuit on client errors (4xx)',
        why: '4xx errors are client-side problems (bad auth, missing params) — the upstream is healthy. Counting 401s and 404s toward the circuit breaker failure threshold will open the circuit during a wave of bad client requests, causing an outage.',
        solution: 'Only count 5xx responses and connection/timeout errors as failures. 4xx responses indicate the upstream is functioning correctly. Additionally, exclude specific 5xx codes that indicate expected conditions (e.g., 503 with a Retry-After from an upstream that implements its own rate limiting).',
      },
      {
        pitfall: 'Caching responses that contain user-specific data',
        why: 'If /api/users/me returns different data per user but shares the same cache key, User A\'s profile gets served to User B. A severe security vulnerability.',
        solution: 'Include the user identity in the cache key for authenticated routes (or disable caching entirely for authenticated endpoints). Respect Vary headers from upstream — if upstream says Vary: Authorization, the cache key must include the user identity.',
      },
      {
        pitfall: 'Single point of failure without health checks',
        why: 'A gateway without its own health endpoint cannot be managed by a load balancer. If the gateway process hangs (deadlock, OOM), the load balancer keeps sending traffic to an unresponsive instance.',
        solution: 'Expose /health that checks Redis connectivity and returns 200/503 accordingly. Configure the load balancer to use this endpoint. Run at least two gateway instances. Use Kubernetes liveness/readiness probes for automatic restart on failure.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Upstream returns a streaming response (SSE/chunked)',
        impact: 'Standard proxy implementations buffer the entire response before forwarding, adding latency and memory pressure for streaming endpoints.',
        mitigation: 'Detect streaming responses (Transfer-Encoding: chunked, Content-Type: text/event-stream) and pipe them through without buffering. Skip the cache middleware for streaming responses. Forward the Connection: keep-alive and Transfer-Encoding headers unchanged.',
      },
      {
        scenario: 'WebSocket upgrade requests',
        impact: 'WebSocket upgrades use HTTP/1.1 Upgrade mechanics. Standard HTTP proxy middleware may not handle the protocol switch correctly, dropping the connection.',
        mitigation: 'Handle HTTP 101 Upgrade responses explicitly. Use http-proxy\'s ws: true option or node-http-proxy\'s ws method for WebSocket proxying. Route /ws/* paths to WebSocket-capable upstreams and configure the proxy to preserve the upgrade.',
      },
      {
        scenario: 'Race condition: two requests simultaneously trip the circuit',
        impact: 'Both requests check circuit state concurrently, see it is closed, forward to a failing upstream, both get 500, and both try to open the circuit. Can result in double-counting failures.',
        mitigation: 'Use a Redis Lua script for atomic failure counting and state transitions. The script reads current count, increments, checks threshold, and writes new state atomically. This ensures only one request transitions the state even under concurrent load.',
      },
      {
        scenario: 'Upstream URL contains sensitive information in query params',
        impact: 'Access logs that record the full forwarded URL may capture API keys or tokens that were passed as query parameters.',
        mitigation: 'Define a list of sensitive query parameter names (api_key, token, secret). Before logging, replace their values with [REDACTED]. Apply the same redaction to the URL stored in cache keys. Never log request/response bodies for authenticated endpoints.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you implement service discovery instead of static route config?',
        answer: 'Integrate with Consul (HTTP API to list services) or use Kubernetes DNS (service.namespace.svc.cluster.local). The gateway subscribes to service health events and updates the route table dynamically. For Kubernetes, use the K8s API (watch /apis/v1/services) to detect new services and their labels. Map Kubernetes Service annotations (e.g., gateway.io/path: "/api/users") to route configurations.',
      },
      {
        question: 'How do you handle API versioning in the gateway?',
        answer: 'Three strategies: (1) URL path versioning (/v1/users → user-service-v1, /v2/users → user-service-v2), routing different versions to different upstream deployments. (2) Header-based versioning (X-API-Version: 2 → route to v2 upstream). (3) Traffic splitting: route 10% of requests to v2 for canary testing. All three can be configured per route without code changes.',
      },
      {
        question: 'How would you implement request signing for upstream authentication?',
        answer: 'The gateway holds a shared secret for each upstream service. Before forwarding, compute HMAC-SHA256 of (timestamp + method + path + body hash) and add as X-Gateway-Signature header. The upstream verifies this signature to ensure requests only come from the trusted gateway. This prevents direct access to internal services and provides request integrity verification.',
      },
      {
        question: 'What is the difference between an API gateway and a service mesh?',
        answer: 'An API gateway handles north-south traffic (external clients to internal services): auth, rate limiting, routing, caching. It is a centralized component. A service mesh handles east-west traffic (service to service): mutual TLS, load balancing, circuit breaking at the mesh level using sidecar proxies (Envoy). They are complementary — a gateway at the edge, a mesh inside. Istio and Linkerd are service meshes; Kong and AWS API Gateway are API gateways.',
      },
    ],

    extensionIdeas: [
      { idea: 'A/B testing and canary traffic splitting', difficulty: 'intermediate', description: 'Route a configurable percentage of requests to a new upstream version. Use a consistent hash (on user ID or session cookie) to ensure a user always hits the same version within a session. Track conversion metrics per variant. Gradually increase traffic to the new version as confidence grows.' },
      { idea: 'Request/response schema validation', difficulty: 'intermediate', description: 'Load OpenAPI/JSON Schema definitions for each route. Validate inbound request bodies and outbound responses against the schema. Return 400 for schema violations before forwarding to upstream. This enforces API contracts at the gateway level and protects upstream services from invalid inputs.' },
      { idea: 'GraphQL gateway with schema stitching', difficulty: 'advanced', description: 'Extend the gateway to merge GraphQL schemas from multiple downstream services into a unified supergraph. Route each field resolver to the appropriate upstream service. Implement distributed queries: a single client query can fetch data from user-service and order-service in parallel, with the gateway merging the results.' },
      { idea: 'mTLS between gateway and upstreams', difficulty: 'advanced', description: 'Configure mutual TLS so each upstream service verifies that requests originate from the trusted gateway (not just any internal service). Use a private CA to issue client certificates for the gateway and server certificates for each upstream. Rotate certificates automatically using cert-manager (Kubernetes) or Vault PKI.' },
    ],
  },
};
