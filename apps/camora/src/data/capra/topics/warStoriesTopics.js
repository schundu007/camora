// War Stories — real production incidents for interview prep.
// Content sourced from AceCloudInterviews.com and public postmortems.
// Each topic is a real incident: what happened, how it was diagnosed, and what changed.

export const warStoriesCategories = [
  { id: 'availability',  name: 'Availability & Outages',       icon: 'alertTriangle', color: '#ef4444' },
  { id: 'data',          name: 'Data Loss & Corruption',        icon: 'database',      color: '#8b5cf6' },
  { id: 'security',      name: 'Security Incidents',            icon: 'shield',        color: '#dc2626' },
  { id: 'performance',   name: 'Performance Degradation',       icon: 'activity',      color: '#f97316' },
  { id: 'deployment',    name: 'Deployment Disasters',          icon: 'gitMerge',      color: '#f59e0b' },
  { id: 'networking',    name: 'Network & DNS Failures',        icon: 'globe',         color: '#3b82f6' },
];

export const warStoriesTopicCategoryMap = {
  // Availability
  'ws-cascading-failure':           'availability',
  'ws-region-outage':               'availability',
  'ws-dependency-outage':           'availability',
  'ws-thundering-herd':             'availability',
  'ws-cache-stampede':              'availability',
  // Data
  'ws-accidental-delete':           'data',
  'ws-data-corruption-migration':   'data',
  'ws-replication-lag-data-loss':   'data',
  'ws-backup-failure-discovery':    'data',
  // Security
  'ws-credential-leak':             'security',
  'ws-misconfigured-s3-bucket':     'security',
  'ws-iam-privilege-escalation':    'security',
  'ws-supply-chain-attack':         'security',
  // Performance
  'ws-memory-leak-production':      'performance',
  'ws-n-plus-one-queries':          'performance',
  'ws-connection-pool-exhaustion':  'performance',
  'ws-hot-partition-dynamodb':      'performance',
  // Deployment
  'ws-bad-deploy-rollback':         'deployment',
  'ws-config-change-outage':        'deployment',
  'ws-failed-db-migration':         'deployment',
  'ws-blue-green-gone-wrong':       'deployment',
  // Networking
  'ws-dns-cache-poisoning':         'networking',
  'ws-certificate-expiry-outage':   'networking',
  'ws-bgp-route-leak':              'networking',
  'ws-nat-gateway-exhaustion':      'networking',
};

export const warStoriesTopics = [

  // ── AVAILABILITY ──────────────────────────────────────────────────────────

  {
    id: 'ws-cascading-failure',
    title: 'The Cascade That Took Down Three Services',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 5,
    description: 'A single slow dependency turned synchronous timeouts into a process-pool meltdown that propagated upstream.',
    visualizations: [],
    introduction: `At 2:14 AM on a Tuesday, the on-call engineer received a PagerDuty alert: the checkout API was returning 503s. By 2:17 AM, two upstream services that called checkout had also gone red. By 2:22 AM, four services in total were down — services that had nothing to do with each other except that they all shared a downstream dependency on a payment processor that had begun responding slowly.

The root problem was not the slow dependency. It was the application architecture: every service had a thread pool sized for peak traffic, and every thread was configured to wait up to 30 seconds for the payment processor to respond. As the processor slowed to 8-second response times, threads backed up. New requests arrived faster than threads returned to the pool. Within six minutes, thread pools across all four services were exhausted, and each service began refusing new connections. Callers upstream got timeouts, panicked, retried — amplifying load on already-exhausted services.

The incident lasted 47 minutes and affected 18,000 users. The payment processor itself recovered after 11 minutes; the application services took 36 more minutes to drain their retry queues and stabilize.`,
    whenToUse: [
      'Explaining cascading failures in system design interviews',
      'Justifying timeout, circuit breaker, and bulkhead decisions',
      'Discussing why retry storms amplify rather than resolve outages',
      'Answering "How do you design for partial failure?"',
    ],
    keyConcepts: [
      { term: 'Cascading failure', definition: 'A failure in one component that causes failures in dependent components, typically because callers exhaust their own capacity waiting for a slow downstream.' },
      { term: 'Thread pool exhaustion', definition: 'When all available worker threads are blocked waiting for a response, no new requests can be processed, causing the service itself to appear down.' },
      { term: 'Retry storm', definition: 'Clients that receive errors immediately retry, multiplying load on an already-degraded service and preventing recovery.' },
      { term: 'Circuit breaker', definition: 'A pattern that detects consecutive failures to a dependency and "opens" the circuit — fast-failing calls to that dependency for a cooling-off period — to protect the caller.' },
      { term: 'Bulkhead pattern', definition: 'Isolating different downstream calls into separate thread pools so that one slow dependency cannot exhaust the entire process.' },
    ],
    pitfalls: [
      'Setting retry logic without exponential backoff and jitter — retries become synchronized and amplify the problem.',
      'Using a single shared thread pool for all outbound calls — one slow dependency starves all others.',
      'Configuring timeouts too long (30 seconds is almost always wrong for a synchronous call in a user-facing path).',
      'Assuming the failing component is the one first paged — the real root cause may be several hops downstream.',
    ],
    keyQuestions: [
      {
        question: 'You are on-call. The checkout service is down, and three services that depend on it are also timing out. How do you diagnose and recover?',
        answer: `First, establish whether the cascade is still propagating or has stabilized. Check thread pool metrics and active connection counts on all affected services to determine if they are still saturating.

Second, identify the root cause: look at the slowest outbound calls on the checkout service. Distributed traces (X-Ray, Jaeger) will show which dependency is slow. In this incident, payment processor latency was the root.

Third, break the feedback loop before fixing the root cause. The fastest lever is usually to reject or fast-fail requests to the saturated service — returning a 503 with a Retry-After header stops retries from adding load. If a circuit breaker exists, open it manually.

Fourth, recover in order: fix or wait for the root dependency to recover, then let callers drain their retry queues with backoff, then reopen the circuit breaker progressively.

Post-incident: add per-dependency thread pool bulkheads, set aggressive timeouts (target p99 of the healthy dependency, not a generous ceiling), add circuit breakers with half-open probing, and replace synchronized retry with exponential backoff plus jitter.`,
      },
      {
        question: 'Why are long timeouts (like 30 seconds) dangerous in synchronous service-to-service calls?',
        answer: `Because each waiting thread holds a socket, memory, and a slot in the thread pool for the full duration of the timeout. At 30-second timeouts and moderate traffic, a dependency that degrades for even 60 seconds can cause hundreds of threads to pile up, exhausting the pool long before the dependency recovers.

The correct approach is to set timeouts at or slightly above the p99 latency of the healthy dependency — often 200–500ms for internal calls. Anything beyond that budget should either fail fast (circuit breaker) or be pushed to an async queue. A 30-second timeout is appropriate only for human-initiated, low-frequency operations like file uploads.`,
      },
    ],
    references: [
      'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/',
      'https://martinfowler.com/bliki/CircuitBreaker.html',
    ],
  },

  {
    id: 'ws-region-outage',
    title: 'Single-Region Dependency That Caused a Global Outage',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 4,
    description: 'A globally deployed service collapsed because its auth token endpoint was pinned to a single AWS region.',
    visualizations: [],
    introduction: `The service deployed across four AWS regions advertised 99.99% uptime in its SLA. Customers were paying for multi-region resilience. On the night of the incident, us-east-1 experienced elevated API error rates — a well-known AWS event that lasted about 40 minutes. The service's own compute in all four regions kept running. But within 8 minutes, authenticated requests in all four regions began failing globally.

The reason: every region's auth middleware validated JWT tokens by calling a shared introspection endpoint in us-east-1. The endpoint was behind an Application Load Balancer that itself depended on IAM calls — which were degraded during the event. Token validation began timing out at 15 seconds per attempt. With no circuit breaker and no cache, every authenticated request across all four regions stalled waiting for us-east-1. The multi-region architecture had a single-region soft dependency that negated all geographic redundancy.

The postmortem found 23 other endpoints with similar hidden dependencies on us-east-1.`,
    whenToUse: [
      'Illustrating why multi-region architecture requires dependency mapping, not just compute placement',
      'Designing auth and control-plane services in interviews',
      'Discussing the difference between data-plane and control-plane resilience',
    ],
    keyConcepts: [
      { term: 'Soft dependency', definition: 'A dependency that is not required for the happy path but is called on every request — auth, logging, feature flags — that can silently become a hard dependency under failure.' },
      { term: 'Data plane vs control plane', definition: 'Data plane handles actual traffic (serving requests); control plane handles management (auth, config, orchestration). Outages hit data planes hardest when control-plane calls are inline.' },
      { term: 'Token caching', definition: 'Storing validated JWT results in a short-lived local cache so that auth introspection calls are not made per-request.' },
      { term: 'Regional isolation', definition: 'Each region should be able to operate independently without calling cross-region endpoints in the request path.' },
    ],
    pitfalls: [
      'Assuming that deploying compute to multiple regions provides resilience if shared services (auth, config, logging) remain single-region.',
      'Inline token introspection per-request without caching or local validation fallback.',
      'Not mapping all outbound dependencies during architecture review — the 23 hidden us-east-1 calls were unknown until the postmortem.',
    ],
    keyQuestions: [
      {
        question: 'How would you redesign the auth system to eliminate the single-region dependency?',
        answer: `Three complementary changes: First, switch from online token introspection to offline JWT validation. Sign tokens with an asymmetric key (RS256); each region caches the public key and validates tokens locally without any network call. Token revocation becomes eventual (short expiry + refresh tokens) rather than inline.

Second, if online introspection is required for immediate revocation, replicate the introspection endpoint into each region behind a regional ALB. Each region calls its local endpoint; cross-region calls are the fallback, not the primary path.

Third, add a circuit breaker and local cache: if the introspection endpoint is slow, serve from the last-known-valid cached result for a configurable grace period (30–60 seconds) rather than blocking the request.`,
      },
      {
        question: 'How do you audit an existing system for hidden single-region or single-AZ dependencies?',
        answer: `Four approaches: (1) Dependency mapping — for each service, enumerate all outbound network calls (DNS lookups, HTTP endpoints, database connections, KMS calls) and tag each with the region/AZ it resolves to. Any single-region tag on an inline path is a risk. (2) Chaos engineering — inject az-level failures using AWS Fault Injection Simulator or similar; watch which metrics degrade in unrelated regions. (3) CloudTrail analysis — query for API calls that cross regions (caller region != resource region). (4) Network flow logs — inspect VPC flow logs for traffic patterns to single endpoints.`,
      },
    ],
    references: [
      'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/',
    ],
  },

  {
    id: 'ws-dependency-outage',
    title: 'Third-Party API Outage That Was Mistaken for Own Code',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 3,
    description: 'Four hours of debugging internal code before realizing the root cause was a third-party geolocation API silently returning stale data.',
    visualizations: [],
    introduction: `The incident began with a spike in customer support tickets: shipping cost calculations were returning zero for international orders. Engineering spent the first two hours ruling out recent deployments — the last deploy was 72 hours ago. They reviewed the pricing service code, replayed requests through staging, and ran integration tests. Everything passed.

At hour three, a junior engineer noticed the geolocation API used to convert ZIP codes to country codes was returning "US" for every ZIP code, including obviously non-US postal codes. The third-party API had silently changed its fallback behavior: instead of returning an error when it could not resolve a ZIP code, it was returning "US" as a default. International orders were being priced as domestic.

The vendor acknowledged the change in their changelog — an entry added three days earlier under "improvement." No breaking-change notice was sent. The API contract had not formally changed (it still returned HTTP 200 with a country code), so the integration test passed.`,
    whenToUse: [
      'Discussing API contract testing and consumer-driven contracts',
      'Explaining observability requirements for third-party integrations',
      'Justifying defensive integration patterns (validation, alerting on unexpected values)',
    ],
    keyConcepts: [
      { term: 'Silent behavioral change', definition: 'A dependency change that does not alter the HTTP status code or schema but changes the semantic meaning of the response, breaking consumers without causing obvious errors.' },
      { term: 'Consumer-driven contract testing', definition: 'Tests where the consumer (caller) defines what it expects from a provider, and the provider runs those expectations as part of its own test suite (e.g., Pact framework).' },
      { term: 'Canary value monitoring', definition: 'Sending known test inputs to a dependency and alerting if the output deviates from expected — useful for detecting silent behavioral changes in third-party APIs.' },
    ],
    pitfalls: [
      'Assuming HTTP 200 means correctness — third-party APIs can silently change behavior while maintaining the same status code and schema.',
      'Not monitoring value distributions of third-party responses — a sudden spike in a specific return value (like "US" for 100% of geolocation calls) is an anomaly signal.',
      'Relying on vendor notification for breaking changes — changelog monitoring or automated canary tests are more reliable.',
    ],
    keyQuestions: [
      {
        question: 'How would you design monitoring to detect silent behavioral changes in a third-party API?',
        answer: `Four mechanisms: (1) Canary requests — periodically send known test inputs (ZIP codes from 10 different countries) and assert expected outputs. Alert if any return value changes. (2) Value distribution metrics — instrument the integration to emit a counter per unique return value. A sudden shift in the distribution (e.g., "US" rising from 15% to 100%) triggers an alert. (3) Contract tests — use Pact or similar to define consumer contracts; run them in CI against a recorded snapshot of the third-party API responses. (4) Changelog monitoring — use a tool like Feedbin or Slack RSS to subscribe to the vendor's changelog and route it to the team channel.`,
      },
    ],
    references: [
      'https://docs.pact.io/',
    ],
  },

  {
    id: 'ws-thundering-herd',
    title: 'Thundering Herd After a Cache Cluster Restart',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 4,
    description: 'Restarting an ElastiCache cluster during low-traffic hours triggered a database overload at 3 AM when all cache misses hit simultaneously.',
    visualizations: [],
    introduction: `The plan seemed safe: rotate the ElastiCache Redis cluster to a new node type during the 3 AM low-traffic window. The maintenance completed in 11 minutes. At 3:14 AM, as the application reconnected to the new cluster, every request encountered a cold cache. The cache hit ratio dropped from 94% to 0% simultaneously for all nodes in the application fleet.

The RDS primary received 47x its normal query rate within 90 seconds. Read replicas, which normally handled 80% of traffic, were not warmed either — connection pools to replicas filled and began queuing. By 3:17 AM, p99 latency on the main API had risen from 45ms to 8 seconds. By 3:19 AM, the RDS instance hit its max_connections limit and began refusing new connections. The site effectively went down for 22 minutes during what was supposed to be a zero-downtime maintenance window.`,
    whenToUse: [
      'Explaining cache warming strategies in system design interviews',
      'Justifying probabilistic cache expiry and request coalescing patterns',
      'Discussing how low-traffic windows can paradoxically expose certain failure modes',
    ],
    keyConcepts: [
      { term: 'Thundering herd', definition: 'Multiple processes or clients simultaneously contacting the same resource (typically a database) after a shared cache becomes unavailable, overwhelming the backend.' },
      { term: 'Cache warming', definition: 'Pre-populating a cache before directing live traffic to it, either by replaying recent read traffic or by explicitly seeding frequently accessed keys.' },
      { term: 'Request coalescing', definition: 'Deduplicating concurrent cache-miss requests for the same key so only one request reaches the database; all waiters receive the same result.' },
      { term: 'Probabilistic early expiry', definition: 'Cache keys are refreshed slightly before their TTL expires using a probability function, avoiding simultaneous expiry of many popular keys.' },
    ],
    pitfalls: [
      'Assuming low-traffic windows eliminate risk — a cold cache during even low traffic can saturate a database if cache hit rate was high.',
      'Replacing an entire cache cluster at once rather than doing a rolling node-by-node replacement.',
      'Not having a cache warming strategy or a read replica promotion plan for cold-start scenarios.',
    ],
    keyQuestions: [
      {
        question: 'How do you safely replace an ElastiCache cluster without a thundering herd?',
        answer: `Three strategies: (1) Blue-green cache — provision a new cluster in parallel, warm it by replaying recent queries or by running a cache loader script against known hot keys, then switch the application endpoint. Traffic hits the new cluster warm. (2) Rolling node replacement — replace one node at a time; consistent hashing means only 1/N of the keyspace goes cold per step, not 100%. (3) Traffic throttling fallback — add a request coalescing layer (typically in the application cache client or a sidecar like mcrouter) that collapses simultaneous misses for the same key into a single database call. If a cold-cache event still occurs, database load is bounded by unique key request rate, not total request rate.`,
      },
    ],
    references: [
      'https://aws.amazon.com/elasticache/redis/',
    ],
  },

  {
    id: 'ws-cache-stampede',
    title: 'Cache Stampede on a Flash-Sale Product Page',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 3,
    description: 'Synchronized TTL expiry on a high-traffic product page caused every application server to hit the database simultaneously at the top of the hour.',
    visualizations: [],
    introduction: `The e-commerce platform had a flash sale starting at noon. Product page cache TTLs were set to exactly 3600 seconds. Every product had been cached at the last cache flush — also at noon exactly, one hour earlier. At 12:00:00 PM, every product page key expired simultaneously across the fleet.

With 200 application servers all receiving traffic at noon, and all finding the product cache empty, every server independently fired a database query for each product page. The PostgreSQL database received approximately 4,000 concurrent queries in the first 500ms. Query queue depth reached 600. Response time for cache-miss queries rose to 12 seconds. Application servers began timing out, treating the response as an error, and retrying — which doubled the query count again.

The database held for 4 minutes before the most popular queries repopulated the cache and the stampede subsided. Less popular pages took 18 minutes. Total impact: 11 minutes of elevated error rates during the peak of the flash sale.`,
    whenToUse: [
      'Discussing cache expiry strategies and TTL design',
      'Explaining the value of cache locking and probabilistic expiry',
      'Interviewer asks about high-traffic event preparation',
    ],
    keyConcepts: [
      { term: 'Cache stampede', definition: 'Multiple concurrent cache misses for the same key that each independently query the database, multiplying backend load.' },
      { term: 'TTL jitter', definition: 'Adding a random offset (e.g., plus or minus 10%) to cache TTLs so keys expire at different times and misses are spread out.' },
      { term: 'Cache lock', definition: 'A pattern where the first cache miss acquires a distributed lock, queries the database, and populates the cache; subsequent misses wait or serve stale data rather than hitting the database independently.' },
      { term: 'Stale-while-revalidate', definition: 'Serving the expired (stale) cached value to users while asynchronously refreshing the cache in the background, eliminating synchronous miss latency entirely.' },
    ],
    pitfalls: [
      'Setting identical TTLs across all keys cached at the same point in time — they will all expire at the same point in time.',
      'Not testing cache behavior under high concurrency — unit tests and staging environments rarely reproduce stampede conditions.',
    ],
    keyQuestions: [
      {
        question: 'How do you prevent a cache stampede for a high-traffic product page?',
        answer: `Multiple defenses that compose: (1) TTL jitter — set TTL to base_ttl + random(0, base_ttl * 0.1) so keys expire across a window rather than simultaneously. (2) Stale-while-revalidate — when a key expires, continue serving the stale value to users while a single background worker refreshes it asynchronously. (3) Cache lock — the first miss for a key sets a short-lived distributed lock (Redis SET NX); lock holders query the database and write the cache; non-holders either wait or serve stale content. (4) Pre-warming for known events — before a flash sale, explicitly warm all affected keys with a batch job rather than relying on organic cache population.`,
      },
    ],
    references: [
      'https://redis.io/docs/manual/patterns/distributed-locks/',
    ],
  },

  // ── DATA ──────────────────────────────────────────────────────────────────

  {
    id: 'ws-accidental-delete',
    title: 'Accidental DELETE Without a WHERE Clause in Production',
    icon: 'database',
    color: '#8b5cf6',
    questions: 5,
    description: 'An engineer running a cleanup script against the wrong environment deleted 2.3 million user preference records in 4 seconds.',
    visualizations: [],
    introduction: `The task was routine: delete soft-deleted user records older than 90 days from the staging database to free up space. The engineer had run the same script dozens of times. This time, the environment variable pointing to the database DSN had a typo — it fell back to the default value, which was the production connection string set in the shell profile.

The script ran in 4.1 seconds and deleted 2.3 million rows from the user_preferences table. No WHERE clause had been added to scope by environment because the engineer believed the DSN would ensure environment isolation.

The deletion was caught when the application health check began failing — a startup check queried user preferences, found zero rows, and returned unhealthy. The database had no soft-delete on the preferences table; the rows were hard-deleted.

RTO target was 4 hours. Actual recovery time was 6 hours 12 minutes using a combination of a 2-hour-old RDS automated snapshot and 4 hours of binary log replay to recover as close to the deletion event as possible.`,
    whenToUse: [
      'Discussing database safety controls in production environments',
      'Designing recovery plans for data loss scenarios',
      'Explaining RTO vs RPO tradeoffs in database backup strategy',
    ],
    keyConcepts: [
      { term: 'RTO (Recovery Time Objective)', definition: 'The maximum acceptable time to restore service after a failure. In this incident, 4 hours was the target; 6+ hours was actual.' },
      { term: 'RPO (Recovery Point Objective)', definition: 'The maximum acceptable amount of data loss measured in time. An RPO of 2 hours means the recovery point can be up to 2 hours before the incident.' },
      { term: 'Binary log replay', definition: 'Replaying MySQL/PostgreSQL WAL or binary logs from a snapshot forward to a specific timestamp, recovering changes made after the snapshot.' },
      { term: 'Point-in-time recovery (PITR)', definition: 'RDS/Aurora feature that allows restoring a database to any second within the backup retention window using automated backups plus transaction logs.' },
      { term: 'Soft delete', definition: 'Marking rows as deleted with a flag and timestamp rather than issuing a DELETE statement, preserving the data and enabling trivial recovery.' },
    ],
    pitfalls: [
      'Assuming environment variable isolation is sufficient for database access — a missing or mistyped variable can fall through to a production default.',
      'Running destructive scripts directly rather than testing with a DRY_RUN=true flag or a SELECT COUNT first.',
      'Not having point-in-time recovery enabled — automated snapshots alone leave a gap equal to the snapshot interval.',
      'Hard-deleting data that could be soft-deleted — soft delete makes accidental deletion a one-line UPDATE to recover.',
    ],
    keyQuestions: [
      {
        question: 'An engineer accidentally deleted 2 million rows from production. Walk me through the recovery.',
        answer: `Immediate actions: (1) Stop writes to the affected table if possible — prevent more changes from widening the gap between the snapshot and recovery point. (2) Verify the deletion extent — query the table, check row count, compare against monitoring baselines. (3) Identify the most recent clean recovery point — check RDS automated snapshot timestamps and whether PITR is enabled (it should be).

Recovery path: If PITR is enabled, restore to T-minus-5-minutes (before the deletion). In RDS, this creates a new DB instance — you do not restore in-place. Redirect a read-only replica of the application to the recovered instance, extract the deleted rows, and replay them into production using an INSERT ... ON CONFLICT DO NOTHING pattern to avoid overwriting legitimate changes.

If PITR is not enabled: restore from the latest snapshot, then replay binary logs (MySQL) or WAL (Postgres) forward to just before the DELETE timestamp using a tool like mysqlbinlog or pg_waldump.

Post-incident controls: enable PITR, add a deletion guard (require WHERE clause or row count confirmation for DML above a threshold), use soft delete on critical tables, and require separate credentials for production DML.`,
      },
      {
        question: 'What is the difference between RPO and RTO, and how do backup strategies affect them?',
        answer: `RPO (Recovery Point Objective) is the maximum data loss you can accept, measured in time from the incident backward. An RPO of 1 hour means the recovered database can be up to 1 hour behind the incident. RTO (Recovery Time Objective) is the maximum downtime you can accept — the time from incident detection to full service restoration.

Backup strategies affect them differently. Automated daily snapshots alone give a worst-case RPO of ~24 hours and a reasonable RTO (restore from snapshot in 15–30 minutes). PITR reduces RPO to near-zero (seconds of data loss) but can increase RTO because log replay takes time proportional to the gap between the snapshot and the target time. Read replicas reduce RTO for failover scenarios but do not protect against logical data loss — a DELETE on the primary replicates immediately to all replicas.

For critical tables, the combination of PITR + application-level soft delete provides both near-zero RPO and fast recovery (a single UPDATE to un-delete soft-deleted rows).`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PitrRestore.html',
    ],
  },

  {
    id: 'ws-data-corruption-migration',
    title: 'Silent Data Corruption from an Off-By-One Migration',
    icon: 'database',
    color: '#8b5cf6',
    questions: 4,
    description: 'A database migration that ran successfully corrupted currency amounts for 6% of transactions due to an integer division truncation error.',
    visualizations: [],
    introduction: `The payment platform stored monetary amounts as integers representing cents. A migration was written to convert a legacy float column (storing dollars with two decimal places) to the integer cents format used everywhere else. The migration ran cleanly against all test environments and against staging with a production data sample.

In production, the migration ran against 14 million rows in 22 minutes without errors. The error was discovered 11 days later during a monthly reconciliation: a subset of transactions had amounts that were off by 1 cent or occasionally by 1 dollar. The investigation revealed that the migration had used integer division in Python (amount / 100 instead of int(round(amount * 100))) — a floor operation that silently truncated amounts like $19.999... to $19.99 instead of $20.00.

The affected rows totaled $847,000 in under-recorded revenue. Recovery required replaying original transaction events from the event store, which the team was fortunate to have. Without the event store, the corruption would have been unrecoverable.`,
    whenToUse: [
      'Discussing database migration safety and verification practices',
      'Explaining why financial systems require integer arithmetic',
      'Designing event sourcing for auditability and recovery',
    ],
    keyConcepts: [
      { term: 'Floating point precision error', definition: 'Binary floating point cannot represent many decimal fractions exactly (e.g., 0.1 in binary is a repeating fraction), leading to tiny rounding errors that accumulate.' },
      { term: 'Integer arithmetic for currency', definition: 'Store monetary amounts as integers (cents or the smallest currency unit) and avoid floating point entirely for any financial calculation.' },
      { term: 'Migration dry run with comparison', definition: 'Running a migration against a production replica and comparing before/after value distributions (min, max, sum, sample of rows) before applying to production.' },
      { term: 'Event sourcing', definition: 'Storing every state change as an immutable event, allowing the current state to be rebuilt by replaying events — providing a recovery path even after corruption.' },
    ],
    pitfalls: [
      'Testing migrations only on small datasets — rounding errors may be rare enough not to appear in samples but prevalent at scale.',
      'Trusting migration success logs — a migration can complete with zero SQL errors while silently applying incorrect transformations.',
      'Not performing post-migration data quality checks (sum comparison, distribution comparison, sampling of converted values).',
    ],
    keyQuestions: [
      {
        question: 'How do you safely run a data-transforming migration on a large production table?',
        answer: `Six-step process: (1) Write the migration and run it against a production replica. Compare before/after: check row counts, column sum/min/max/average, and a random sample of 1,000 rows. (2) Add a verification query at the end of the migration that asserts invariants (e.g., no NULL where NOT NULL expected, sum matches expected value). Fail the migration if assertions fail. (3) Run on a small percentage of rows first (WHERE id % 100 = 0) and verify before running on all. (4) Keep the old column until the application has been verified correct in production — rename rather than drop. (5) In production, use a background migration (process rows in batches with sleep between batches) to avoid locking. (6) After migration, compare sums and distributions against the event store or a pre-migration snapshot.`,
      },
    ],
    references: [
      'https://martinfowler.com/articles/eventsourcing.html',
    ],
  },

  {
    id: 'ws-replication-lag-data-loss',
    title: 'Failover to a Lagging Replica Lost 4 Minutes of Orders',
    icon: 'database',
    color: '#8b5cf6',
    questions: 4,
    description: 'Automatic RDS failover promoted a replica that was 4 minutes behind the primary, discarding all writes from that window.',
    visualizations: [],
    introduction: `The e-commerce platform used RDS Multi-AZ for its orders database. Multi-AZ was configured correctly — the standby replica was in a different availability zone and received synchronous replication. The incident did not involve the Multi-AZ standby.

The problem was a different replica: the analytics team had provisioned an additional read replica for reporting queries. This replica was not synchronous — it used asynchronous replication and had accumulated a replication lag of 4 minutes due to a heavy reporting query that had locked table statistics.

When the primary instance failed (a storage volume issue at 7:42 PM), the RDS automated failover promoted the Multi-AZ standby correctly and quickly (62 seconds). But the application's read replica connection strings pointed to the analytics replica by hostname alias, not the Multi-AZ standby. The application was configured to read from the analytics replica for all non-critical reads. After failover, the analytics replica (now 4 minutes stale) was still responding to read traffic.

For 4 minutes, order status pages showed orders as "pending" that had already shipped. More critically, a batch job that read order states from the replica and triggered fulfillment re-triggered 847 orders that had already been fulfilled.`,
    whenToUse: [
      'Discussing replication lag monitoring and read replica placement',
      'Designing failover strategies that account for stale read replicas',
      'Explaining why replica lag is a consistency risk, not just a performance metric',
    ],
    keyConcepts: [
      { term: 'Replication lag', definition: 'The delay between a write on the primary and its visibility on a read replica. Async replicas can accumulate minutes of lag under heavy load.' },
      { term: 'Read-after-write consistency', definition: 'Guarantee that a read immediately following a write will see the write. Async replicas do not provide this without additional routing logic.' },
      { term: 'Replica promotion', definition: 'Elevating a read replica to primary after a failover. RDS Multi-AZ promotion is automatic and targets the synchronous standby; other replicas are not promoted.' },
      { term: 'RDS Multi-AZ vs read replica', definition: 'Multi-AZ standby uses synchronous replication and is promoted automatically on failure. Read replicas use asynchronous replication and are not promoted automatically.' },
    ],
    pitfalls: [
      'Routing business-logic reads (not just analytics) to an async replica without monitoring its lag.',
      'Confusing Multi-AZ standby with read replicas — only the Multi-AZ standby is promoted automatically and is synchronous.',
      'Batch jobs that use the same read replica endpoint as the analytics system — business-critical idempotency requires fresh data.',
    ],
    keyQuestions: [
      {
        question: 'How do you design a read replica strategy that avoids serving stale data to business-critical reads?',
        answer: `Separate read endpoints by staleness tolerance: (1) All writes and all reads that require freshness (order status, inventory levels, payment state) route to the primary or Multi-AZ standby endpoint. (2) Reads that tolerate eventual consistency (user profiles, product descriptions, historical analytics) route to async read replicas. (3) Add replica lag monitoring — alert when lag exceeds a threshold (e.g., 30 seconds), and automatically route replica reads to the primary when lag is above the threshold (this is a feature in Amazon Aurora's reader endpoint). (4) For batch jobs that trigger downstream actions, always read from the primary connection string, not the replica, to prevent double-processing.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html',
    ],
  },

  {
    id: 'ws-backup-failure-discovery',
    title: 'Backups That Were Never Actually Completing',
    icon: 'database',
    color: '#8b5cf6',
    questions: 3,
    description: 'A 14-month-old backup job was logging success but writing zero bytes — discovered only when a recovery was attempted.',
    visualizations: [],
    introduction: `The daily backup job had been running for 14 months without a single alert. Every morning, the Slack notification read "Backup completed successfully." When the database host suffered a disk failure and the team attempted recovery, they discovered the backup S3 bucket was empty. The job had been "succeeding" since a configuration change 14 months ago had pointed the output path to a bucket that no longer existed. S3 responded with a 404 to the PUT request. The backup script interpreted any non-exception exit as success and posted the success message regardless of the HTTP response code.

The team had never run a restore drill. There was no monitoring on the backup bucket's object count or size. The only backup that existed was a weekly RDS automated snapshot — 6 days old at the time of the disk failure — which meant 6 days of data was unrecoverable.`,
    whenToUse: [
      'Explaining why backup verification is as important as backup creation',
      'Discussing SRE toil and the danger of "green" dashboards that are not actually checked',
      'Designing backup and restore testing procedures',
    ],
    keyConcepts: [
      { term: 'Backup verification', definition: 'Periodically performing an actual restore from backup to verify the backup is complete, uncorrupted, and restorable within the RTO.' },
      { term: 'Dead man\'s switch', definition: 'An alert that fires if an expected event does NOT happen within a time window — for backups, alerting if no new backup object appears in S3 within 25 hours.' },
      { term: 'Restore drill', definition: 'A scheduled exercise where the team actually restores from backup to a test environment and verifies data integrity, typically monthly or quarterly.' },
    ],
    pitfalls: [
      'Treating backup job success logs as confirmation of backup validity — the log only confirms the process ran, not that data was written correctly.',
      'Monitoring backup creation but not backup content (object count, object size, checksum verification).',
      'Never running a restore drill — most backup failures are only discovered during actual recovery attempts.',
    ],
    keyQuestions: [
      {
        question: 'How do you design a backup monitoring system that actually validates backups are working?',
        answer: `Three layers: (1) Dead man's switch — create a CloudWatch alarm or equivalent that alerts if no new object has appeared in the backup S3 bucket within 1.5x the backup interval. This catches cases where the job silently stops running. (2) Object validation — after each backup completes, the backup job must verify the written object: check that its size is above a minimum threshold, run a checksum comparison against the source, and assert that the object is readable (attempt a HEAD or small byte-range GET). Alert on any failure. (3) Restore drills — monthly (for databases) or quarterly (for file systems), restore the most recent backup to an isolated test environment and run a data integrity check. Automate this if possible; at minimum, track it as a calendar recurring task with a paging escalation if skipped.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html',
    ],
  },

  // ── SECURITY ──────────────────────────────────────────────────────────────

  {
    id: 'ws-credential-leak',
    title: 'AWS Credentials Committed to a Public GitHub Repository',
    icon: 'shield',
    color: '#dc2626',
    questions: 5,
    description: 'An access key ID and secret committed in a config file were found by an automated scanner within 4 minutes, leading to $34,000 in EC2 charges overnight.',
    visualizations: [],
    introduction: `A developer was writing a tutorial blog post and committed a sample config file to a public GitHub repository. The file contained a real AWS access key that had been left in the project after local testing. The developer planned to remove it before publishing — but pushed to the public branch first.

Automated scanners that watch public GitHub commits for credential patterns found the key within 4 minutes. By the time the developer noticed the mistake 3 hours later and revoked the key, the attacker had already: launched 400 p3.16xlarge GPU instances in 6 regions for cryptocurrency mining, created 12 IAM users, and configured an SQS queue as a dead drop for ongoing communications. Total EC2 charges incurred: $34,200 in 14 hours. AWS ultimately waived the charges after a Security Incident Report, but recovery took 3 days.`,
    whenToUse: [
      'Discussing secrets management and credential hygiene',
      'Explaining the response procedure for a leaked AWS key',
      'Justifying IAM least-privilege and credential rotation policies',
    ],
    keyConcepts: [
      { term: 'Credential scanning', definition: 'Automated tools (GitHub secret scanning, truffleHog, gitleaks) that search code repositories for patterns matching API keys, passwords, and credentials.' },
      { term: 'IAM least privilege', definition: 'Granting only the permissions required for the specific task — a key used for S3 read access during a tutorial should have no EC2 or IAM permissions.' },
      { term: 'Secret rotation', definition: 'Regularly replacing credentials and automatically distributing the new values using a secrets manager, reducing the window of exposure for any compromised key.' },
      { term: 'AWS Secrets Manager', definition: 'Managed service for storing, rotating, and auditing access to secrets. Applications retrieve credentials at runtime rather than storing them in code or config files.' },
    ],
    pitfalls: [
      'Using long-lived IAM access keys for development or CI — prefer IAM roles with temporary credentials via STS or OIDC.',
      'Not adding secrets to .gitignore before creating the file — the file may be committed before the developer remembers.',
      'Assuming that revoking the key ends the incident — the attacker may have already created new IAM users or keys before revocation.',
    ],
    keyQuestions: [
      {
        question: 'You discover an AWS access key has been committed to a public GitHub repository. Walk me through your incident response.',
        answer: `Immediate response (first 15 minutes): (1) Revoke the key immediately via IAM console or CLI: aws iam delete-access-key. Do not wait to investigate first — every minute of delay is more exposure. (2) Enable AWS CloudTrail and search for all actions taken with the compromised key ID since the commit timestamp. (3) Check for new IAM users, roles, or policies created. Delete any unauthorized principals. (4) Check for unexpected resource creation in all regions: EC2 instances, Lambda functions, ECS tasks, S3 buckets. Terminate unauthorized resources.

Investigation (next hour): (5) Determine the full scope of what the attacker accessed or modified. (6) Check SQS, SNS, and S3 for exfiltrated data or planted payloads. (7) Enable AWS GuardDuty if not already active — it will flag ongoing anomalous activity.

Prevention: Remove the file from git history using git filter-branch or BFG Repo Cleaner (note: for public repos, assume the credentials are permanently exposed even after history rewrite — scanners index commits quickly). Replace with IAM roles and AWS Secrets Manager. Add pre-commit hooks (detect-secrets) to the repo.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
      'https://github.com/awslabs/git-secrets',
    ],
  },

  {
    id: 'ws-misconfigured-s3-bucket',
    title: 'Public S3 Bucket Exposed Customer PII for 8 Months',
    icon: 'shield',
    color: '#dc2626',
    questions: 4,
    description: 'A single Block Public Access setting left unchecked exposed 3.2 million customer records in a logging bucket.',
    visualizations: [],
    introduction: `The engineering team had strong S3 security practices: all application buckets required server-side encryption, versioning, and had Block Public Access enabled at the bucket level. What they missed was the logging bucket.

A new observability pipeline had been set up 8 months earlier. The engineer creating the logging bucket was working quickly and unchecked the "Block all public access" option, intending to come back and restrict it after testing. The bucket was never locked down. The logging pipeline wrote application logs that included request payloads — which included customer email addresses, shipping addresses, and partial payment card data in error logs.

The exposure was discovered during an automated compliance audit 8 months later. By then, the bucket had 847 GB of log data. AWS Macie scan of the bucket found 3.2 million distinct email addresses and 180,000 instances of what it classified as credit card-like patterns.`,
    whenToUse: [
      'Discussing AWS security baseline requirements and account-level controls',
      'Explaining why logging infrastructure must meet the same security standards as application infrastructure',
      'Justifying data classification and PII filtering in logs',
    ],
    keyConcepts: [
      { term: 'S3 Block Public Access', definition: 'Four settings that can be applied at the account or bucket level to prevent any bucket policy or ACL from granting public access. Should be enabled at the account level as a baseline.' },
      { term: 'AWS Macie', definition: 'Managed service that uses ML to automatically discover, classify, and protect sensitive data in S3, alerting on PII, credentials, and financial data.' },
      { term: 'Data minimization', definition: 'Logging only the fields necessary for debugging, not full request/response payloads. PII should be masked or excluded from logs by default.' },
      { term: 'AWS Config rules', definition: 'Automated compliance checks that evaluate resource configurations against rules, alerting or auto-remediating when resources drift from the expected configuration.' },
    ],
    pitfalls: [
      'Not enabling Block Public Access at the AWS account level — account-level enforcement prevents any bucket from being made public, regardless of individual bucket settings.',
      'Treating logging and monitoring buckets as lower-security than application buckets — they often contain more sensitive data.',
      'Logging full request/response payloads in production — PII leaks into log storage and any downstream systems that consume logs.',
    ],
    keyQuestions: [
      {
        question: 'How do you ensure no S3 bucket in your AWS account can be made public accidentally?',
        answer: `Layered controls: (1) Enable S3 Block Public Access at the account level — this overrides any bucket-level policy or ACL that would grant public access. It takes 2 minutes to configure and prevents all future accidental public buckets. (2) Add an AWS Config rule (s3-bucket-public-read-prohibited, s3-bucket-public-write-prohibited) that alerts and optionally auto-remediates any bucket found to be public. (3) Use AWS Security Hub with the CIS AWS Foundations Benchmark enabled — it checks for public buckets as a baseline control. (4) In your IaC templates (CloudFormation, Terraform), set BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, and RestrictPublicBuckets to true on every bucket resource by default, and treat any override as a required code review exception.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
    ],
  },

  {
    id: 'ws-iam-privilege-escalation',
    title: 'An IAM Misconfiguration That Let a Developer Become Admin',
    icon: 'shield',
    color: '#dc2626',
    questions: 4,
    description: 'A developer with iam:PassRole and lambda:CreateFunction permissions silently escalated to full AdministratorAccess in 10 minutes.',
    visualizations: [],
    introduction: `The security audit finding came in a routine IAM access review: a developer in the platform team had the permissions iam:PassRole, lambda:CreateFunction, and lambda:InvokeFunction. These appeared reasonable — the developer managed Lambda deployments. What the access review initially missed was that these three permissions, combined, allow full privilege escalation.

The attack chain: the developer could create a new Lambda function, pass it an IAM role with AdministratorAccess (a role that already existed for production deployments), and then invoke the Lambda. The Lambda, running with the admin role, could then create a new IAM user with AdministratorAccess and return the credentials. This attack was never executed maliciously — it was discovered by a contractor running an automated privilege escalation scanner (Cloudsplaining) during a pen test.

The finding required revoking iam:PassRole from the developer's policy and implementing a permission boundary on all roles that could be passed to Lambda — restricting what the Lambda could actually do even if passed an admin role.`,
    whenToUse: [
      'Explaining IAM least privilege and indirect privilege escalation risks',
      'Discussing permission boundaries as a defense against escalation',
      'Justifying automated IAM auditing in security programs',
    ],
    keyConcepts: [
      { term: 'Privilege escalation', definition: 'Using a combination of allowed permissions to gain capabilities beyond what was explicitly granted — often by creating or modifying resources that operate with higher permissions.' },
      { term: 'iam:PassRole', definition: 'A permission that allows attaching an IAM role to a service. Combined with resource creation permissions, it is a common escalation vector.' },
      { term: 'Permission boundary', definition: 'An IAM policy attached to a role that sets the maximum permissions the role can have — even if a broader policy is attached, the boundary limits effective permissions.' },
      { term: 'Cloudsplaining', definition: 'An open-source tool that analyzes IAM policies and identifies privilege escalation paths, resource exposure, and overly broad permissions.' },
    ],
    pitfalls: [
      'Reviewing individual IAM permissions in isolation — privilege escalation paths arise from combinations of permissions, not single permissions.',
      'Not using permission boundaries on service roles that can be passed to compute services (Lambda, EC2 instance profiles, ECS task roles).',
      'Granting iam:PassRole without a Condition restricting which roles can be passed (use StringEquals aws:RequestedRegion or ARN conditions).',
    ],
    keyQuestions: [
      {
        question: 'How do you prevent IAM privilege escalation through Lambda and iam:PassRole?',
        answer: `Three controls in combination: (1) Restrict iam:PassRole with a condition: add a Condition block that limits which roles can be passed (e.g., Condition: StringLike: iam:PassedToService: lambda.amazonaws.com and a resource ARN pattern that only allows passing specific roles). (2) Add permission boundaries to all Lambda execution roles: a boundary policy with a maximum of ReadOnlyAccess prevents any Lambda from creating IAM users or elevating permissions even if passed an admin role. (3) Run automated escalation scanning: tools like Cloudsplaining, PMapper, or AWS IAM Access Analyzer's policy analysis can map escalation paths. Run them in CI when IAM policies change and as a scheduled audit.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html',
      'https://github.com/salesforce/cloudsplaining',
    ],
  },

  {
    id: 'ws-supply-chain-attack',
    title: 'Malicious npm Package Exfiltrated Environment Variables at Build Time',
    icon: 'shield',
    color: '#dc2626',
    questions: 3,
    description: 'A typosquatted npm package installed via a developer\'s local npm install exfiltrated AWS credentials from CI environment variables.',
    visualizations: [],
    introduction: `A developer on the platform team was setting up a new project and typed npm install lodash-utils instead of lodash. The package lodash-utils was a typosquatted package published to npm 3 weeks earlier. Its postinstall script ran a Node.js snippet that read process.env, serialized the object, and sent it to an external endpoint via an HTTPS request.

On the developer's local machine, the only interesting environment variable was the AWS_PROFILE for development. But that developer had also recently added lodash-utils to the project's package.json without noticing it was not lodash. When the project was subsequently cloned in CI (GitHub Actions), the CI runner had AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY injected as environment variables for deployment. The postinstall script ran during npm install in CI and sent those credentials to the attacker.

The CI keys had S3 read/write and CloudFront invalidation permissions. The attacker used them to replace the CDN-served JavaScript bundle with a malicious version over a 6-hour window before the keys were rotated.`,
    whenToUse: [
      'Discussing software supply chain security and npm package hygiene',
      'Justifying the use of npm audit, lock files, and private registries',
      'Explaining why CI environment variables should be scoped to specific jobs and not available to all steps',
    ],
    keyConcepts: [
      { term: 'Typosquatting', definition: 'Publishing a malicious package under a name that closely resembles a popular legitimate package, relying on developers mistyping the package name.' },
      { term: 'Postinstall script attack', definition: 'Malicious npm packages that execute arbitrary code via the postinstall lifecycle hook, which runs automatically during npm install.' },
      { term: 'Lock file integrity', definition: 'package-lock.json or yarn.lock files pin exact package versions and checksums, preventing unexpected package substitution.' },
      { term: 'OIDC for CI credentials', definition: 'Using OpenID Connect to issue short-lived, scoped tokens to CI jobs rather than long-lived access keys stored as secrets, limiting the blast radius of a credential compromise.' },
    ],
    pitfalls: [
      'Storing long-lived AWS access keys as CI secrets — a single compromised CI step exposes those credentials.',
      'Not auditing package.json changes in code review — a typosquatted package often looks similar enough to pass a quick review.',
      'Running npm install in CI without --ignore-scripts when lifecycle scripts are not required for the build.',
    ],
    keyQuestions: [
      {
        question: 'How do you protect CI/CD pipelines from malicious npm packages?',
        answer: `Layered defenses: (1) Use lock files — commit package-lock.json and run npm ci (not npm install) in CI. npm ci installs exactly the versions in the lock file and verifies checksums. (2) Disable postinstall scripts in CI where not needed: npm ci --ignore-scripts prevents lifecycle hooks from running. If scripts are needed, audit them explicitly. (3) Replace long-lived CI access keys with OIDC — GitHub Actions OIDC integration issues temporary AWS credentials scoped to the specific job, revoked after the job completes. A stolen token is unusable after the job ends. (4) Scope CI credentials to the minimum — the CDN invalidation job should only have CloudFront:CreateInvalidation and the specific S3 bucket write, not all S3. (5) Use npm audit and tools like Socket.dev in CI to flag packages with postinstall scripts or suspicious behaviors before they are installed.`,
      },
    ],
    references: [
      'https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions',
      'https://socket.dev/',
    ],
  },

  // ── PERFORMANCE ───────────────────────────────────────────────────────────

  {
    id: 'ws-memory-leak-production',
    title: 'Node.js Memory Leak That Required Daily Restarts',
    icon: 'activity',
    color: '#f97316',
    questions: 4,
    description: 'A closures-based event listener accumulation caused heap growth of 40 MB/hour, requiring nightly automated restarts to prevent OOM crashes.',
    visualizations: [],
    introduction: `The symptom was consistent: every night around 3 AM, the Node.js API server would become unresponsive and be restarted by the health check. Engineers accepted this as normal for months because the restart took only 30 seconds and the 3 AM timing meant low user impact. When the service scaled from 2 to 8 instances, the crash window widened — with staggered starts, some instances were crashing at different times throughout the day.

The investigation used a heap snapshot taken at startup and compared to one taken 4 hours later. The growing objects were EventEmitter listener arrays on a shared Redis client. Each incoming HTTP request was adding a new close event listener to the Redis client to handle request teardown, but the listener was never removed after the request completed. After 10,000 requests, there were 10,000 listeners, each holding a closure reference to the request object. The fix was a single removeListener call in the response end handler, plus a maxListeners increase with a warning threshold.`,
    whenToUse: [
      'Discussing Node.js memory management and closure gotchas',
      'Explaining how to diagnose memory leaks with heap snapshots',
      'Justifying operational observability requirements (heap metrics, process memory)',
    ],
    keyConcepts: [
      { term: 'Heap snapshot', definition: 'A point-in-time dump of the JavaScript heap showing all allocated objects, their sizes, and reference chains — used to identify what is growing over time.' },
      { term: 'Event listener accumulation', definition: 'A common Node.js leak pattern where listeners are added to emitters without corresponding removeListener calls, causing references to accumulate.' },
      { term: 'Closure reference leak', definition: 'A function (closure) that captures outer-scope variables keeps those variables alive in memory even after the outer scope should have been garbage collected.' },
      { term: 'MaxListeners warning', definition: 'Node.js emits a warning when more than 10 listeners are added to a single event on an emitter, indicating a potential leak.' },
    ],
    pitfalls: [
      'Accepting periodic restarts as normal operations without investigating the root cause — restarts mask memory leaks.',
      'Adding event listeners in request handlers without corresponding cleanup in response/error handlers.',
      'Not monitoring process.memoryUsage() as an application metric — heap growth is a leading indicator of leaks, visible before OOM.',
    ],
    keyQuestions: [
      {
        question: 'A Node.js service is growing in memory usage by 50 MB per hour. How do you diagnose and fix it?',
        answer: `Diagnosis: (1) Take a heap snapshot at startup (process.heapUsed() baseline or v8.writeHeapSnapshot()). (2) After 1-2 hours of traffic, take a second snapshot. (3) Load both snapshots in Chrome DevTools Memory tab and use the Comparison view to see which object types have grown. Look for object counts that grew proportionally to the number of requests handled. (4) For the growing objects, inspect the Retainer tree to find what is holding references. Common culprits: event listener arrays, closure-captured request objects, global caches without TTL or size bounds.

Fix patterns: For event listener leaks — match every addEventListener/on with a removeEventListener/removeListener. For cache leaks — add a size limit (LRU cache with max entries) and a TTL. For timer leaks — ensure clearInterval/clearTimeout is called in cleanup paths.

Monitor with a CloudWatch/Datadog metric for process.memoryUsage().heapUsed and alert when it exceeds 80% of available memory, giving time to investigate before OOM.`,
      },
    ],
    references: [
      'https://nodejs.org/en/docs/guides/debugging-getting-started',
    ],
  },

  {
    id: 'ws-n-plus-one-queries',
    title: 'N+1 Query Pattern That Collapsed Under Load',
    icon: 'activity',
    color: '#f97316',
    questions: 4,
    description: 'An ORM-generated N+1 query pattern that ran fine in staging (10 records) caused 8,400 database queries per user request in production.',
    visualizations: [],
    introduction: `The API endpoint served a list of orders with associated products and customer details. In development and staging, test data had at most 10-20 orders per user. In production, power users had hundreds to thousands of orders.

The ORM code was straightforward: fetch orders, then for each order fetch the associated product, then fetch the associated customer. With lazy loading enabled by default, each association trigger generated a separate SQL SELECT. A user with 840 orders triggered 840 product queries and 840 customer queries — 1,681 queries for a single API request. Database connection pool was sized for 20 concurrent connections. Three concurrent power user requests (5,043 queries) exhausted the pool, causing all other requests to queue.

The issue was invisible in staging because the test data was too small. It was invisible in production monitoring because the endpoint's average latency looked fine — most users had fewer than 20 orders. Only the p99 and p99.9 showed the problem, and those were not being alerted on.`,
    whenToUse: [
      'Discussing ORM best practices and eager loading',
      'Explaining why production performance testing requires production-scale data',
      'Justifying SQL query logging and slow-query monitoring',
    ],
    keyConcepts: [
      { term: 'N+1 query problem', definition: 'Fetching N items then issuing one additional query per item, resulting in N+1 total queries instead of 1-2 optimized queries using JOINs or eager loading.' },
      { term: 'Eager loading', definition: 'Loading associated records in the same query or a bounded number of additional queries using JOINs or IN clauses, rather than fetching one at a time.' },
      { term: 'Query batching', definition: 'Collecting multiple individual queries and executing them as a single batch query using WHERE id IN (...), reducing N queries to 1.' },
      { term: 'Percentile latency monitoring', definition: 'Tracking p95, p99, and p99.9 latency rather than averages — average latency can look healthy while a small percentage of requests are extremely slow.' },
    ],
    pitfalls: [
      'Using ORM lazy loading without reviewing generated SQL — lazy loading is convenient but produces N+1 queries by default.',
      'Testing with small data sets that do not represent production data distribution — 10-record tests never reveal N+1 problems.',
      'Alerting only on average latency — N+1 problems typically only show up at high percentiles where affected users are concentrated.',
    ],
    keyQuestions: [
      {
        question: 'How do you detect and fix N+1 query problems in an ORM-based application?',
        answer: `Detection: (1) Enable SQL query logging in development and count the queries generated by a single request. A list endpoint that fires more than 3-5 queries should be investigated. (2) Use an APM tool (Datadog, New Relic) or database-level slow query log to identify endpoints that issue high query counts. (3) Run load tests with production-scale data — N+1 problems only become visible at the sizes where they hurt.

Fix: (1) Switch lazy associations to eager loading for the specific endpoint: use include/with/joinedLoad depending on the ORM. (2) If the association is not always needed, use DataLoader pattern (batching) — collect all IDs from the list and issue a single WHERE id IN (...) query. (3) For complex cases, write a custom raw SQL query with JOINs rather than relying on ORM association loading.

Monitor: add a per-request query count metric to APM. Alert if any endpoint averages more than 20 queries per request in production.`,
      },
    ],
    references: [
      'https://use-the-index-luke.com/',
    ],
  },

  {
    id: 'ws-connection-pool-exhaustion',
    title: 'Connection Pool Exhaustion That Brought Down 12 Microservices',
    icon: 'activity',
    color: '#f97316',
    questions: 4,
    description: 'A single slow migration caused connection pool exhaustion on the RDS primary, cascading to 12 services that shared the same database.',
    visualizations: [],
    introduction: `The shared PostgreSQL RDS instance had a max_connections limit of 500. Across 12 microservices, connection pools totaled 420 max connections — 84% of capacity under normal load. A database engineer kicked off a schema migration during a low-traffic window: ALTER TABLE orders ADD COLUMN delivery_estimate_v2 jsonb. The migration on a 300-million-row table took a table-level lock for 18 minutes.

During those 18 minutes, every query from every service that touched the orders table queued behind the lock. Connection pool slots filled with waiting connections. Within 4 minutes, all 12 services had exhausted their pools — new requests could not acquire connections and began failing with "connection pool timeout" errors. The services themselves appeared healthy (process running, health checks passing via a bypass route), but all order-related operations were failing for users.

The migration was killed at 22 minutes. Connection pools drained over the next 8 minutes as queued queries resolved. Total user impact: 27 minutes.`,
    whenToUse: [
      'Explaining why ALTER TABLE on large tables requires lock-free migration strategies',
      'Discussing connection pooling architecture for microservices sharing a database',
      'Justifying PgBouncer or RDS Proxy for connection management',
    ],
    keyConcepts: [
      { term: 'Table-level lock', definition: 'A lock that prevents all reads and writes to a table during a schema change (like adding a NOT NULL column without a default, or adding an index without CONCURRENTLY).' },
      { term: 'Online schema change', definition: 'Techniques (pt-online-schema-change, pg_repack, GitHub gh-ost, or PostgreSQL CONCURRENTLY options) that perform DDL without holding table locks for the full migration duration.' },
      { term: 'Connection pool sizing', definition: 'Choosing pool sizes that sum to less than the database max_connections limit, with headroom for admin connections and spikes.' },
      { term: 'PgBouncer', definition: 'A connection pooler for PostgreSQL that multiplexes application connections onto a smaller set of actual database connections, raising the effective connection capacity.' },
    ],
    pitfalls: [
      'Running blocking DDL on large tables during business hours — or even at night if other services share the database.',
      'Sizing connection pools without accounting for the total across all services sharing the same database.',
      'Not using CONCURRENTLY when creating indexes in PostgreSQL — CREATE INDEX takes a full table lock; CREATE INDEX CONCURRENTLY does not.',
    ],
    keyQuestions: [
      {
        question: 'How do you safely add a column to a 300-million-row PostgreSQL table without downtime?',
        answer: `Three-step approach: (1) Add the column as nullable with no default: ALTER TABLE orders ADD COLUMN delivery_estimate_v2 jsonb. This is instantaneous in PostgreSQL — it only modifies the catalog, not the actual rows. (2) Backfill the column in batches: UPDATE orders SET delivery_estimate_v2 = '{}' WHERE id BETWEEN x AND y AND delivery_estimate_v2 IS NULL. Process 1,000-10,000 rows per batch with a short sleep between batches to avoid lock contention. (3) Once backfill is complete, set the NOT NULL constraint with a validation that skips full table scan: first add a CHECK constraint with NOT VALID (fast), then VALIDATE CONSTRAINT in a separate transaction (uses ShareUpdateExclusiveLock, not full table lock).

For index creation: always use CREATE INDEX CONCURRENTLY — it builds the index without a table lock, taking slightly longer but not blocking reads or writes.`,
      },
    ],
    references: [
      'https://www.postgresql.org/docs/current/sql-altertable.html',
      'https://github.com/nicuk/pgbouncer',
    ],
  },

  {
    id: 'ws-hot-partition-dynamodb',
    title: 'DynamoDB Hot Partition That Throttled a Flash Sale',
    icon: 'activity',
    color: '#f97316',
    questions: 4,
    description: 'A product ID used as the DynamoDB partition key concentrated 80% of flash-sale reads on a single partition, causing sustained throttling.',
    visualizations: [],
    introduction: `The flash sale featured one hero product — a limited-edition sneaker. The product catalog DynamoDB table used product_id as the partition key. The hero product's product_id was read by every shopper visiting the sale page, by the inventory service checking stock every 5 seconds, and by the recommendation engine for all related products.

DynamoDB partitions are limited to 3,000 read capacity units (RCU) per second per partition. The hero product's reads concentrated exclusively on a single partition. At peak, the sale page received 2,200 requests/second, each triggering 3 DynamoDB reads. The partition received 6,600 reads/second — more than twice its limit. DynamoDB returned ProvisionedThroughputExceededException errors. The application had no retry logic for DynamoDB errors on the read path, so product pages began failing for all users, not just users experiencing throttling.`,
    whenToUse: [
      'Designing DynamoDB schemas and partition key selection',
      'Explaining hot partition problems and mitigation strategies',
      'Discussing caching strategies in front of DynamoDB for high-read items',
    ],
    keyConcepts: [
      { term: 'Hot partition', definition: 'A DynamoDB partition that receives a disproportionate share of traffic, hitting the 3,000 RCU/1,000 WCU per partition per second limit and causing throttling.' },
      { term: 'Partition key design', definition: 'Choosing partition keys with high cardinality and even access distribution to spread load across all partitions.' },
      { term: 'Write sharding', definition: 'Appending a random suffix (1-N) to a partition key to distribute writes across N partitions; reads must query all N shards and merge results.' },
      { term: 'DAX (DynamoDB Accelerator)', definition: 'An in-memory cache for DynamoDB that handles microsecond reads and absorbs read spikes without hitting DynamoDB directly.' },
    ],
    pitfalls: [
      'Using a business entity ID (product_id, user_id) as the partition key without analyzing access patterns — popular entities create hot partitions.',
      'Not adding a caching layer in front of DynamoDB for high-read items — DAX or ElastiCache can absorb flash-sale read spikes.',
      'Using DynamoDB on-demand (pay-per-request) mode and assuming it eliminates throttling — per-partition limits still apply.',
    ],
    keyQuestions: [
      {
        question: 'How do you redesign a DynamoDB product catalog to handle flash-sale access patterns without hot partitions?',
        answer: `Three strategies: (1) Add a caching layer — put ElastiCache or DAX in front of DynamoDB for product reads. Flash-sale items are read frequently but change rarely (stock count aside); a 5-second cache TTL absorbs 99% of reads while keeping stock reasonably fresh. The cache becomes the flash-sale read path; DynamoDB handles cache misses and writes. (2) Write sharding for write-heavy scenarios — if the stock count requires frequent writes, shard the stock counter across N partition keys (product_id#1, product_id#2, ... product_id#10) and use a Lambda to sum shards for the true count. This spreads writes across 10 partitions. (3) Pre-compute and store aggregates — use DynamoDB Streams + Lambda to maintain a pre-computed "available stock" item that is updated on each write, so reads only need one get_item call against a well-distributed key.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html',
    ],
  },

  // ── DEPLOYMENT ────────────────────────────────────────────────────────────

  {
    id: 'ws-bad-deploy-rollback',
    title: 'A Deployment That Could Not Be Rolled Back',
    icon: 'gitMerge',
    color: '#f59e0b',
    questions: 4,
    description: 'A database migration included in the same deployment as application code made rollback impossible after the new version broke production.',
    visualizations: [],
    introduction: `The deploy bundle included two changes: a new API version that changed the response shape of /api/v1/orders, and a database migration that renamed the orders.status column to orders.fulfillment_status. Both changes were tested together in staging and passed.

In production, the new API code deployed successfully across 8 instances. Within 3 minutes, PagerDuty fired: error rate on /api/v1/orders spiked to 34%. The old mobile app version (still in use by 12% of users) expected the old response shape and was failing. The team attempted to roll back the application code to the previous version. But the previous version referenced orders.status — the column that had been renamed. Rolling back the app code with the renamed database column caused all database queries to fail. Rolling back the database rename required reverting 2 hours of writes that had used the new column name.

The team was stuck: neither direction was safe. They had to forward-fix by shipping a new version that handled both column names using a database view as a compatibility shim.`,
    whenToUse: [
      'Explaining why database migrations and application deployments must be decoupled',
      'Discussing backward-compatible database schema changes',
      'Designing deployment strategies that preserve rollback ability',
    ],
    keyConcepts: [
      { term: 'Expand-contract migration', definition: 'A two-phase approach: first add the new column/table (expand), migrate data and update code to write both, then remove the old column/table (contract) after all code is updated.' },
      { term: 'Backward-compatible migration', definition: 'A database schema change that both the old and new versions of the application can use simultaneously, enabling safe rollback of application code.' },
      { term: 'Blue-green deployment', definition: 'Running two identical environments (blue and green) and switching traffic between them — requires that both versions can use the same database schema.' },
      { term: 'Database view', definition: 'A virtual table that presents a query result as a table — can be used as a compatibility shim to present old column names while the underlying table uses new names.' },
    ],
    pitfalls: [
      'Deploying destructive database changes (renames, drops, NOT NULL additions) in the same release as the application code that requires them.',
      'Not testing rollback explicitly — most teams test the happy path but never test whether the previous version of the code still works against the new database state.',
      'Treating staging as equivalent to production for rollback testing — production may have old client versions, different load, or different data distributions.',
    ],
    keyQuestions: [
      {
        question: 'What is the expand-contract pattern and how does it make database deployments safe to roll back?',
        answer: `The expand-contract pattern decouples schema changes from application changes into multiple deployments:

Phase 1 (Expand): Add the new column alongside the old one. Deploy application code that writes to both columns (old and new) and reads from the new column with a fallback to the old. No removal yet. This deployment is fully rollback-safe: the old code still works against the old column; the new code writes both.

Phase 2 (Migrate): Run a background job to backfill the new column for all existing rows. Verify completeness.

Phase 3 (Contract): Once all application instances run the new code and the old column is no longer read or written, remove the old column. This removal is also safe — if it fails, the new code already has the new column.

This pattern means: any application version can be deployed between phases without breaking the database. It costs extra deployments but eliminates the rollback trap.`,
      },
    ],
    references: [
      'https://martinfowler.com/articles/evodb.html',
    ],
  },

  {
    id: 'ws-config-change-outage',
    title: 'A Feature Flag Change That Triggered a Production Outage',
    icon: 'gitMerge',
    color: '#f59e0b',
    questions: 3,
    description: 'Enabling a feature flag caused all application instances to immediately reload configuration, creating a thundering herd on the config service.',
    visualizations: [],
    introduction: `The platform used a centralized configuration service backed by DynamoDB. All 240 application instances polled the config service every 30 seconds. When a feature flag was toggled from false to true, all 240 instances detected the change on their next poll. But instead of using the locally cached config for the flag evaluation, the application code fetched the full config from DynamoDB on every feature flag evaluation — by design, to ensure freshness.

Enabling the flag caused 240 concurrent DynamoDB GetItem calls per second as each instance evaluated the flag on every incoming request. DynamoDB was configured with provisioned capacity of 100 RCU. The instantaneous spike to 240 RCU triggered throttling. The application interpreted DynamoDB throttling errors as "flag not available" and defaulted to disabled — meaning the feature was effectively off for 11 minutes until the throttling subsided. The irony: a flag change intended to enable a feature disabled it instead.`,
    whenToUse: [
      'Designing feature flag systems with caching and polling',
      'Discussing the difference between config fetch and config evaluation',
      'Explaining why config changes need the same review rigor as code changes',
    ],
    keyConcepts: [
      { term: 'Config polling vs push', definition: 'Polling fetches config on a schedule (simple, tolerates config service downtime); push delivers config changes in real time (lower latency, but requires a reliable push mechanism).' },
      { term: 'Local config cache', definition: 'Caching fetched configuration in memory so that flag evaluations use the cached value rather than fetching from the config service on every evaluation.' },
      { term: 'Staggered config refresh', definition: 'Adding jitter to the config poll interval so not all instances refresh simultaneously — spreading the load on the config service.' },
    ],
    pitfalls: [
      'Fetching configuration from the config service on every flag evaluation rather than caching and evaluating locally.',
      'Synchronized polling intervals across all instances — all instances detecting a change simultaneously concentrates load.',
      'Using a config service that does not support on-demand scaling for spike patterns.',
    ],
    keyQuestions: [
      {
        question: 'How should a feature flag system be designed to handle 240 application instances without hitting config service rate limits?',
        answer: `The key principle: fetch centrally on a schedule, evaluate locally against the cached copy. (1) Each instance fetches the full config from the service once per interval (30-60 seconds), not on every flag evaluation. Flag evaluations read from the in-memory cache — no network call. (2) Add jitter to the poll interval: base_interval + random(0, 10 seconds) so 240 instances spread their polls across the interval window rather than synchronizing. (3) Use an exponential backoff with cached-value fallback on config fetch errors — if the config service is unavailable, serve the last known config rather than failing open or closed. (4) Consider a push model using DynamoDB Streams + SNS fan-out to Lambda that invalidates each instance's local cache on change — eliminates polling load on the config service entirely.`,
      },
    ],
    references: [
      'https://launchdarkly.com/blog/feature-flag-best-practices/',
    ],
  },

  {
    id: 'ws-failed-db-migration',
    title: 'A Failed Migration That Left the Database in a Partial State',
    icon: 'gitMerge',
    color: '#f59e0b',
    questions: 4,
    description: 'A migration script that added 3 constraints failed partway through, leaving the database with one constraint applied and the others missing.',
    visualizations: [],
    introduction: `The migration added three foreign key constraints to the orders table as part of a data integrity project. The migration file contained three separate ALTER TABLE statements. In PostgreSQL, each ALTER TABLE runs in its own implicit transaction unless wrapped in an explicit transaction block. The migration tool was configured to run each statement individually.

The first two statements succeeded. The third failed: a data quality issue — orphaned order records that referenced non-existent customer IDs — violated the constraint. The migration tool marked the migration as "failed" and exited. But the first two constraints were already committed to the database.

The application code was deployed before the migration was fixed. It expected all three constraints to be present for its validation logic to work correctly. With only two applied, some validation queries returned incorrect results. The fix required manually identifying which constraints had been applied, removing them to reach a clean state, fixing the orphaned records, and re-running the migration inside a transaction that would roll back all three if any one failed.`,
    whenToUse: [
      'Explaining why database migrations must be transactional',
      'Discussing data quality validation before running constraint migrations',
      'Justifying the use of migration testing on a production data replica',
    ],
    keyConcepts: [
      { term: 'Transactional DDL', definition: 'Running DDL statements inside an explicit transaction so that if any statement fails, all preceding statements in the transaction are rolled back. PostgreSQL supports transactional DDL; MySQL does not for most DDL.' },
      { term: 'Pre-migration data validation', definition: 'Running a SELECT query to identify rows that would violate a constraint before applying the constraint, allowing data cleanup before the migration.' },
      { term: 'Idempotent migration', definition: 'A migration that can be run multiple times safely, producing the same result — achieved using IF NOT EXISTS, IF EXISTS, or ON CONFLICT clauses.' },
    ],
    pitfalls: [
      'Running multiple DDL statements outside a transaction — a failure partway through leaves the schema in a partially-migrated state.',
      'Not validating data quality before adding foreign key constraints — constraint violations will fail the migration against production data even when staging passes.',
      'Deploying application code before verifying all migration steps have completed successfully.',
    ],
    keyQuestions: [
      {
        question: 'How do you write a migration script that is safe to run against production data and handles failures cleanly?',
        answer: `Four practices: (1) Wrap all DDL in a transaction (BEGIN / COMMIT) so that any failure rolls back all preceding statements. Verify your migration tool respects this — Flyway requires you to write DDL inside a transaction block; Alembic has a transaction_per_migration option. (2) Add a pre-flight validation step: before running the migration, run SELECT COUNT(*) to check that no rows would violate the new constraint. If count > 0, fail the migration with a clear error message and instructions for the data cleanup. (3) Run the migration against a production replica first — catch data quality issues before touching the primary. (4) Make migrations idempotent: use ADD COLUMN IF NOT EXISTS, ADD CONSTRAINT IF NOT EXISTS, DROP IF EXISTS — so re-running a partially-applied migration is safe.`,
      },
    ],
    references: [
      'https://www.postgresql.org/docs/current/sql-begin.html',
    ],
  },

  {
    id: 'ws-blue-green-gone-wrong',
    title: 'Blue-Green Deployment That Resulted in Split-Brain Sessions',
    icon: 'gitMerge',
    color: '#f59e0b',
    questions: 3,
    description: 'Incomplete session store migration meant users were authenticated on green but not on blue, causing random logout loops during traffic shifting.',
    visualizations: [],
    introduction: `The team was deploying a new version of the session management service as part of a blue-green deployment. Blue was the old version, green was the new. Session tokens issued by blue used HMAC-SHA256 with a 32-byte key. Green used the same algorithm but a newly generated key (as part of a planned key rotation).

The load balancer was shifted to send 50% of traffic to green. Users who had been active on blue had tokens signed with the blue key. When their requests were routed to green, token validation failed. Green returned a 401 and invalidated the session. The user saw a logout — then on re-login, received a green token. If that user's next request routed to blue, the same cycle repeated.

The fix required green to accept both the old and new signing keys during the transition window — a concept called dual-read. Instead of immediately discarding the old key, green was updated to validate tokens signed with either key. Only after 100% traffic was on green and all old sessions had expired (24-hour TTL) was the old key removed.`,
    whenToUse: [
      'Designing session management during major version deployments',
      'Explaining dual-read/dual-write patterns for compatibility during transitions',
      'Discussing blue-green deployment prerequisites',
    ],
    keyConcepts: [
      { term: 'Split-brain session', definition: 'A state where different servers validate the same user session differently, causing inconsistent authentication behavior depending on which server handles a request.' },
      { term: 'Dual-read key validation', definition: 'Accepting tokens signed by both the old and new signing keys during a transition window, maintaining backward compatibility while new tokens are issued with the new key.' },
      { term: 'Key rotation', definition: 'Replacing a cryptographic signing key with a new one. In session systems, requires a transition period where both keys are accepted to avoid invalidating active sessions.' },
    ],
    pitfalls: [
      'Rotating session signing keys simultaneously with a traffic shift — users on the old key get logged out when routed to the new key environment.',
      'Not accounting for session TTL in the transition timeline — if sessions live for 24 hours, the old key must be accepted for 24+ hours after the last blue token was issued.',
    ],
    keyQuestions: [
      {
        question: 'How do you safely rotate session signing keys in a blue-green deployment without logging users out?',
        answer: `Three-phase approach: (1) Dual-read: before shifting any traffic, update the new environment (green) to accept tokens signed by both the old key and the new key. New tokens it issues use the new key; old tokens it receives are validated against the old key. (2) Traffic shift: move traffic to green progressively (10%, 25%, 50%, 100%). Throughout the shift, all users with old tokens can still authenticate. (3) Key removal: after the traffic shift is 100% to green, wait for the session TTL to expire (e.g., 24 hours). After that window, all active sessions have been re-issued with the new key. Remove old-key validation from green.

This is the same pattern used for JWT algorithm migrations, TLS certificate transitions, and any secret rotation in a live system.`,
      },
    ],
    references: [
      'https://aws.amazon.com/blogs/devops/use-aws-codedeploy-to-implement-blue-green-deployments/',
    ],
  },

  // ── NETWORKING ────────────────────────────────────────────────────────────

  {
    id: 'ws-dns-cache-poisoning',
    title: 'Internal DNS Cache Poisoning That Redirected API Traffic',
    icon: 'globe',
    color: '#3b82f6',
    questions: 3,
    description: 'A misconfigured internal DNS resolver accepted forged responses, causing microservice-to-microservice calls to route to a stale IP for 2 hours.',
    visualizations: [],
    introduction: `The internal DNS resolver used by all microservices was a self-hosted BIND instance running in an EC2 instance. During an upgrade, the engineer had disabled DNSSEC validation temporarily and forgotten to re-enable it. A configuration management drift detection tool caught the issue 6 weeks later, but by then the resolver had accepted a forged response.

The forged response had come from a rogue resolver that the BIND instance briefly queried during a network hiccup — the forged response set the A record for payments-api.internal to a stale IP (an IP that had previously belonged to the payments service but now pointed to a decommissioned instance). All microservices resolving that hostname began sending requests to the dead IP. Requests silently failed with connection refused. Because the forged TTL was 7,200 seconds, the stale record persisted for 2 hours even after the rogue resolver was identified and blocked.

Recovery required flushing the DNS cache (rndc flush) and repointing the A record to the correct IP.`,
    whenToUse: [
      'Discussing DNS security (DNSSEC, resolver hardening)',
      'Explaining why internal DNS infrastructure requires the same security scrutiny as external DNS',
      'Designing service discovery with health checking and short TTLs',
    ],
    keyConcepts: [
      { term: 'DNS cache poisoning', definition: 'Inserting malicious records into a DNS resolver\'s cache, causing clients to resolve legitimate hostnames to attacker-controlled IPs.' },
      { term: 'DNSSEC', definition: 'DNS Security Extensions — cryptographic signatures on DNS records that allow resolvers to verify that records are authentic and have not been tampered with.' },
      { term: 'DNS TTL', definition: 'Time to live — how long a DNS record is cached. Long TTLs amplify the impact of poisoning; short TTLs increase resolver load but limit exposure duration.' },
      { term: 'Service discovery with health checks', definition: 'Using a service registry (Consul, AWS Cloud Map) that actively health-checks instances and removes unhealthy IPs from DNS responses rather than relying on static TTLs.' },
    ],
    pitfalls: [
      'Disabling DNSSEC validation temporarily during maintenance and not tracking the re-enable as a required follow-up.',
      'Using long TTLs on internal DNS records — a 7,200-second TTL means a poisoned record persists for 2 hours without any active intervention.',
      'Not monitoring DNS resolver health and cache state as part of infrastructure observability.',
    ],
    keyQuestions: [
      {
        question: 'How do you design internal service-to-service DNS to minimize the impact of DNS failures or poisoning?',
        answer: `Three practices: (1) Use service discovery with health checking (AWS Cloud Map, Consul) rather than static DNS records for internal services. The registry health-checks instances every 10 seconds and only returns healthy IPs. A stale record is overwritten within 10 seconds of detection. (2) Set short TTLs on internal records (30-60 seconds). This limits how long a poisoned or stale record persists. Pair with a local DNS cache to avoid resolver overload. (3) Enable DNSSEC validation on all internal resolvers and treat DNSSEC disablement as a change requiring change management review and a follow-up task to re-enable. Validate DNSSEC status as part of infrastructure compliance checks (AWS Config custom rule or equivalent).`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-configure-dnssec.html',
    ],
  },

  {
    id: 'ws-certificate-expiry-outage',
    title: 'TLS Certificate Expiry That Took Down an Internal API',
    icon: 'globe',
    color: '#3b82f6',
    questions: 3,
    description: 'A wildcard TLS certificate for internal APIs expired with no automated renewal, causing all internal service-to-service calls to fail with SSL errors.',
    visualizations: [],
    introduction: `The internal API gateway used a wildcard certificate for *.internal.company.com. The certificate had been issued manually 13 months earlier with a 12-month validity. It had expired 31 days earlier — but the expiry had gone unnoticed because the monitoring alert had been configured to fire at 7 days remaining, and the alert had been misconfigured to send to a defunct team email alias.

The expiry was discovered when a new microservice was deployed and its integration tests failed with "SSL certificate has expired" errors. Investigation revealed that all existing services had cached TLS sessions from before the expiry — those sessions continued to work because TLS session resumption does not revalidate the certificate. New connections (new deployments, container restarts, cold starts) were failing. The incident had technically been active for 31 days, but only new connections were affected.

Recovery was a 45-minute process: obtain a new certificate, update the certificate on the API gateway, and force a rotation of TLS sessions across all services.`,
    whenToUse: [
      'Discussing certificate lifecycle management and automated renewal',
      'Explaining TLS session resumption and why it masks certificate expiry',
      'Justifying ACM or cert-manager for automated certificate rotation',
    ],
    keyConcepts: [
      { term: 'TLS session resumption', definition: 'Reusing a previously established TLS session (via session tickets or session IDs) to avoid the full handshake cost. Existing sessions do not revalidate the certificate on resumption.' },
      { term: 'ACM (AWS Certificate Manager)', definition: 'Managed service that provisions and automatically renews TLS certificates for use with ALB, CloudFront, and API Gateway — eliminates manual renewal.' },
      { term: 'cert-manager', definition: 'A Kubernetes add-on that automatically provisions and renews certificates from Let\'s Encrypt or private CAs, eliminating manual certificate management for containerized workloads.' },
      { term: 'Certificate monitoring', definition: 'Alerting on certificate expiry at multiple thresholds (90, 30, 14, 7, 1 days remaining) with escalation to avoid the alert going unnoticed.' },
    ],
    pitfalls: [
      'Relying on a single alert threshold (7 days) for certificate expiry — if that alert is misconfigured or missed, there is no safety net.',
      'Using manually-managed certificates for any infrastructure — automated renewal (ACM, cert-manager, Certbot) eliminates human error.',
      'Not monitoring from the perspective of connecting clients — a certificate may appear valid on the server but already be rejected by new clients.',
    ],
    keyQuestions: [
      {
        question: 'How do you ensure TLS certificates never expire unexpectedly in a production environment?',
        answer: `Two complementary approaches: (1) Automate renewal — use ACM for all ALB and CloudFront endpoints (ACM auto-renews 60 days before expiry with no human intervention). For Kubernetes workloads, use cert-manager with Let's Encrypt or your private CA. For any remaining manually-managed certificates, use a renewal script triggered by a CloudWatch Event 90 days before expiry. (2) Monitor from the outside — run an external certificate check (Lambda + CloudWatch, or Datadog synthetic, or Nagios check_ssl) that connects to the endpoint and reads the certificate expiry date. Alert at 90, 30, 14, and 7 days remaining to multiple escalation channels. External monitoring catches certificate issues regardless of how the cert is managed or renewed — it tests the actual TLS handshake, not the certificate files on disk.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html',
    ],
  },

  {
    id: 'ws-bgp-route-leak',
    title: 'BGP Route Leak That Rerouted Traffic Through an Unexpected AS',
    icon: 'globe',
    color: '#3b82f6',
    questions: 3,
    description: 'A misconfigured BGP peer accepted a broader-than-intended prefix announcement, briefly rerouting user traffic through a third-party network.',
    visualizations: [],
    introduction: `The company operated a hybrid cloud setup with a Direct Connect connection to AWS. A network engineer updated a BGP route policy at the Direct Connect router and made an error in the prefix filter: instead of accepting only the specific /24 prefix for the corporate network, the filter accepted a /16 supernet that covered the corporate /24 plus an adjacent /24 owned by a different customer.

For 18 minutes, some BGP speakers in the regional network preferred the newly-announced /16 route (longer AS-path, but wider prefix — behavior is AS-dependent). Traffic destined for a portion of the adjacent customer's IP space was briefly transiting through the company's Direct Connect link. The company's network team did not notice — they had not been impacted directly. The adjacent customer noticed unusual latency spikes and filed a complaint with the shared carrier, which traced it to the misconfigured route.

The incident had no data security impact for the company, but it violated acceptable-use terms with the carrier and required a formal incident report.`,
    whenToUse: [
      'Explaining BGP route hygiene and prefix filtering requirements',
      'Discussing Direct Connect route policy design',
      'Answering "What is a BGP route leak and how do you prevent it?"',
    ],
    keyConcepts: [
      { term: 'BGP route leak', definition: 'Propagating a BGP route beyond the intended scope — advertising a prefix to a peer that was not meant to receive it, potentially causing traffic to transit through unintended networks.' },
      { term: 'Prefix filter', definition: 'A BGP policy that restricts which prefixes are accepted or advertised to a peer, preventing route leaks by enforcing explicit prefix lists.' },
      { term: 'AS-path prepending', definition: 'Adding your own AS number to the AS-path multiple times to make a route appear longer and less preferred, useful for traffic engineering.' },
      { term: 'Direct Connect route policy', definition: 'BGP configuration on the Direct Connect virtual interface that controls which prefixes are accepted from and advertised to AWS, and which routes are propagated to the on-premises network.' },
    ],
    pitfalls: [
      'Using broad prefix filters (accepting all or accepting supernets) rather than explicit prefix lists for BGP peers.',
      'Not using a route monitoring tool (BGPMon, RIPE RIS, AWS Network Manager) to detect unexpected prefix announcements.',
      'Applying BGP configuration changes without a peer review — network config changes have global impact and benefit from a second pair of eyes.',
    ],
    keyQuestions: [
      {
        question: 'How do you design BGP prefix filters to prevent route leaks on a Direct Connect connection?',
        answer: `Three controls: (1) Explicit inbound prefix list — define an explicit list of CIDR prefixes you will accept from AWS (your VPC CIDRs, specific service prefixes). Use a deny-all default with explicit permit statements — not a permit-all with deny exceptions. (2) Explicit outbound prefix list — define exactly which prefixes you will advertise to AWS (your corporate subnets). Never advertise default route (0.0.0.0/0) or any prefix more specific than what you own. (3) Maximum prefix limit — configure a maximum-prefix limit on the BGP session that triggers an alert (or drops the session) if the peer advertises more prefixes than expected. This catches misconfiguration on the AWS side as well. Review and validate prefix lists in a staging environment (using a route reflector test environment) before applying to production.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html',
    ],
  },

  {
    id: 'ws-nat-gateway-exhaustion',
    title: 'NAT Gateway Port Exhaustion Under Bursty Lambda Traffic',
    icon: 'globe',
    color: '#3b82f6',
    questions: 3,
    description: 'A burst of Lambda invocations exhausted NAT Gateway SNAT ports, causing connection failures to external APIs with confusing "connection refused" errors.',
    visualizations: [],
    introduction: `The data pipeline used Lambda functions deployed in a VPC to call external third-party APIs. The pipeline ran nightly batches and had been stable for months. A new customer acquisition campaign tripled the batch size overnight. Lambda scaled to 800 concurrent executions. Each Lambda maintained 3 persistent HTTPS connections to the external API.

NAT Gateway supports 55,000 simultaneous connections. But the 800 Lambdas were all assigned to the same NAT Gateway, all connecting to the same external IP, and all using ephemeral source ports from the same SNAT pool. The NAT Gateway exhausted its SNAT port allocation for the destination IP — all 65,535 ports from the NAT Gateway's IP to the external API's IP were in use or in TIME_WAIT.

New connection attempts failed with connection refused errors that looked identical to external API downtime. Engineers spent 90 minutes debugging the external API before a network engineer recognized the NAT Gateway error metric pattern.`,
    whenToUse: [
      'Designing Lambda networking for high-concurrency workloads in VPCs',
      'Explaining NAT Gateway limits and port exhaustion symptoms',
      'Justifying VPC endpoint usage for AWS service calls from Lambda',
    ],
    keyConcepts: [
      { term: 'SNAT (Source NAT)', definition: 'Network Address Translation on the source port — NAT Gateway translates Lambda\'s private IP and port to a public IP and ephemeral port for outbound connections.' },
      { term: 'Port exhaustion', definition: 'Running out of available source port numbers (max 65,535 per destination IP/port pair), preventing new TCP connections from being established.' },
      { term: 'TIME_WAIT state', definition: 'A TCP connection state after close where the port is held for 2x maximum segment lifetime (typically 60-120 seconds), effectively consuming a port slot.' },
      { term: 'VPC endpoint', definition: 'A private connection to AWS services that bypasses the NAT Gateway entirely, reducing both cost and SNAT port consumption for AWS API calls.' },
    ],
    pitfalls: [
      'Deploying high-concurrency Lambda functions in a VPC without accounting for NAT Gateway SNAT port limits.',
      'Not using VPC endpoints for AWS service calls (S3, DynamoDB, SQS, etc.) from Lambda — these calls unnecessarily consume NAT Gateway ports.',
      'Using persistent connections from Lambda without connection limits — connection reuse reduces port consumption but can also cause port contention at scale.',
    ],
    keyQuestions: [
      {
        question: 'A Lambda function in a VPC is failing with connection errors to an external API at scale. How do you diagnose NAT Gateway port exhaustion?',
        answer: `Diagnosis: Check CloudWatch metrics for the NAT Gateway: the metric ErrorPortAllocation counts connection attempts that failed due to SNAT port exhaustion. If this metric is non-zero, port exhaustion is confirmed. Also check ActiveConnectionCount to understand the current connection load.

Mitigation options: (1) Add a second NAT Gateway — each NAT Gateway has its own pool of source ports, so spreading Lambda subnets across multiple NAT Gateways effectively multiplies available SNAT ports. (2) Use connection pooling with limits — limit maximum connections per Lambda instance to reduce port consumption at peak. (3) Use VPC endpoints for any AWS service calls (S3, SQS, DynamoDB) — these bypass the NAT Gateway entirely and are free of SNAT limits. (4) Move Lambda out of VPC if it does not require VPC resources — Lambda outside VPC reaches the internet without NAT Gateway constraints. (5) Increase the number of NAT Gateways and distribute Lambda subnets across them proportionally to expected concurrent calls.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html',
    ],
  },
];
