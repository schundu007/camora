// DDIA — Designing Data-Intensive Applications (Martin Kleppmann) interview prep.
// 11 sub-categories covering all 3 parts of the book:
//   Part I  — Foundations: data models, storage engines, encoding
//   Part II — Distributed Data: replication, partitioning, transactions, distributed systems
//   Part III — Derived Data: batch processing, stream processing, data integration
// 44 topics total. Content for interview use; no markdown bold/italic/emoji in strings.

export const ddiaCategories = [
  { id: 'foundations',          name: 'Foundations',                icon: 'layers',       color: '#6366f1' },
  { id: 'data-models',          name: 'Data Models & Query Languages', icon: 'database',  color: '#8b5cf6' },
  { id: 'storage-engines',      name: 'Storage Engines',            icon: 'hardDrive',    color: '#0ea5e9' },
  { id: 'encoding',             name: 'Encoding & Evolution',       icon: 'code',         color: '#14b8a6' },
  { id: 'replication',          name: 'Replication',                icon: 'copy',         color: '#f97316' },
  { id: 'partitioning',         name: 'Partitioning',               icon: 'scissors',     color: '#ef4444' },
  { id: 'transactions',         name: 'Transactions',               icon: 'shield',       color: '#22c55e' },
  { id: 'distributed-systems',  name: 'Distributed Systems',        icon: 'network',      color: '#f59e0b' },
  { id: 'batch-processing',     name: 'Batch Processing',           icon: 'layers',       color: '#06b6d4' },
  { id: 'stream-processing',    name: 'Stream Processing',          icon: 'activity',     color: '#ec4899' },
  { id: 'data-integration',     name: 'Data Integration',           icon: 'gitMerge',     color: '#84cc16' },
];

export const ddiaTopicCategoryMap = {
  // Foundations
  'ddia-reliability-scalability-maintainability': 'foundations',
  'ddia-slas-percentiles':                        'foundations',
  'ddia-fan-out':                                 'foundations',
  'ddia-data-systems-overview':                   'foundations',
  // Data Models
  'ddia-relational-vs-document':                  'data-models',
  'ddia-graph-data-models':                       'data-models',
  'ddia-query-languages':                         'data-models',
  'ddia-schema-on-read-vs-write':                 'data-models',
  // Storage Engines
  'ddia-lsm-trees-sstables':                      'storage-engines',
  'ddia-b-trees':                                 'storage-engines',
  'ddia-indexes':                                 'storage-engines',
  'ddia-olap-vs-oltp':                            'storage-engines',
  'ddia-column-oriented-storage':                 'storage-engines',
  // Encoding
  'ddia-encoding-formats':                        'encoding',
  'ddia-schema-evolution':                        'encoding',
  'ddia-dataflow-modes':                          'encoding',
  // Replication
  'ddia-single-leader-replication':               'replication',
  'ddia-multi-leader-replication':                'replication',
  'ddia-leaderless-replication':                  'replication',
  'ddia-replication-lag':                         'replication',
  'ddia-consistency-guarantees':                  'replication',
  // Partitioning
  'ddia-partitioning-strategies':                 'partitioning',
  'ddia-rebalancing':                             'partitioning',
  'ddia-secondary-indexes-partitioned':           'partitioning',
  // Transactions
  'ddia-acid':                                    'transactions',
  'ddia-isolation-levels':                        'transactions',
  'ddia-write-skew-phantoms':                     'transactions',
  'ddia-serializability':                         'transactions',
  // Distributed Systems
  'ddia-faults-and-partial-failures':             'distributed-systems',
  'ddia-clocks-and-time':                         'distributed-systems',
  'ddia-linearizability':                         'distributed-systems',
  'ddia-ordering-and-causality':                  'distributed-systems',
  'ddia-consensus-algorithms':                    'distributed-systems',
  'ddia-zookeeper-and-coordination':              'distributed-systems',
  // Batch Processing
  'ddia-mapreduce':                               'batch-processing',
  'ddia-beyond-mapreduce':                        'batch-processing',
  'ddia-joins-in-batch':                          'batch-processing',
  // Stream Processing
  'ddia-event-streams':                           'stream-processing',
  'ddia-stream-joins':                            'stream-processing',
  'ddia-fault-tolerance-streams':                 'stream-processing',
  'ddia-change-data-capture':                     'stream-processing',
  // Data Integration
  'ddia-lambda-kappa-architecture':               'data-integration',
  'ddia-unbundling-databases':                    'data-integration',
  'ddia-end-to-end-correctness':                  'data-integration',
};

export const ddiaTopics = [

  // ── FOUNDATIONS ──────────────────────────────────────────────────────────────

  {
    id: 'ddia-data-systems-overview',
    title: 'What is a Data-Intensive Application?',
    icon: 'layers',
    color: '#6366f1',
    questions: 3,
    description: 'How DDIA frames data systems — databases, caches, queues, search indexes — as components with different access pattern trade-offs.',
    visualizations: [{ title: 'Data-Intensive Application Stack', description: '', image: '/diagrams/ddia/data-systems-overview-01.png' }],
    introduction: `Martin Kleppmann opens DDIA by distinguishing data-intensive applications from compute-intensive ones. Most modern applications are not limited by CPU; they are limited by the volume, complexity, and rate of change of data.

A single application typically stitches together multiple specialized data components: a relational database for durable storage, a cache (Redis) for speeding up reads, a search index (Elasticsearch) for full-text queries, a message queue (Kafka) for decoupling asynchronous processing, and a stream processor (Flink) for derived views.

The core insight is that these are all "data systems" at different levels of abstraction. A cache is a data system. An application that writes to PostgreSQL, caches in Redis, and indexes in Elasticsearch is operating three independent data stores with three separate consistency guarantees.

The book then asks: when you combine multiple data components, how do you provide consistent, reliable, scalable, and maintainable service to the application and ultimately the user? This question drives every chapter.

Understanding the building blocks and their guarantees — not just "use Postgres" or "use Kafka" but why, under what conditions, and at what cost — is the skill that distinguishes senior engineers from engineers who only know which tools to use.`,
    whenToUse: [
      'Framing a system design answer by identifying which components the system needs',
      'Explaining why modern applications use multiple data stores instead of one',
      'Introducing the concept of derived data and consistency challenges in an architecture discussion',
    ],
    keyConcepts: [
      { term: 'Data-intensive application', definition: 'An application where data volume, complexity, and rate of change are the primary engineering challenges, not raw CPU throughput.' },
      { term: 'Derived data', definition: 'Data that is computed or copied from another primary source. A search index is derived from a database. A cache is derived from the origin. Must be kept consistent with the source.' },
      { term: 'Data system composition', definition: 'Combining multiple specialized data tools (database, cache, queue, search, stream processor) into a unified data layer for an application.' },
    ],
    pitfalls: [
      'Using one database for all access patterns — OLTP reads and writes, OLAP aggregations, full-text search, and time-series all require different storage engines.',
      'Ignoring that each additional data system adds a consistency boundary — data written to PostgreSQL is not automatically synchronized to Redis or Elasticsearch.',
    ],
    keyQuestions: [
      {
        question: 'Why do modern applications use five data stores instead of one?',
        answer: `No single data store is best for all access patterns. Each system is optimized for specific read/write trade-offs.

PostgreSQL (relational OLTP): strong consistency, ACID transactions, flexible queries via SQL. Best for transactional writes and relational reads. Slow for full-text search (requires full scans without tsvector) and bad for time-series at high ingest rates.

Redis (in-memory cache): microsecond read latency for hot keys. Best for serving the most frequently read data without hitting the database on every request. Cannot persist large datasets economically; loses data on crash without AOF/RDB persistence.

Elasticsearch (inverted index): relevance-ranked full-text search with complex query DSL. Best for search. Eventual consistency; not suitable as a source of truth. Expensive to update at high frequency.

Kafka (durable log): high-throughput durable append-only event log with replay capability. Best for decoupling services and distributing events to multiple consumers. Not a query-able database; requires consumers to process events.

Snowflake or BigQuery (columnar OLAP): efficient aggregation queries over billions of rows via columnar storage. Best for analytics. Write latency is seconds to minutes; not suitable for OLTP.

The application uses all five because each serves a different access pattern. The cost is operational complexity: keeping all five consistent, monitoring five systems, and handling the failure modes of each.`,
      },
    ],
    quickFire: [
      { q: `What distinguishes a data-intensive application from a compute-intensive one?`, a: `Data-intensive applications are bottlenecked by data volume, complexity, or velocity rather than CPU cycles. A video encoding farm is compute-intensive; a social media feed platform is data-intensive.` },
      { q: `Name the three top-level concerns Kleppmann organizes Chapter 1 around.`, a: `Reliability (correct behavior under faults), scalability (coping strategies for growth), and maintainability (productive work by many engineers over time).` },
      { q: `Why can a system be highly available but unreliable?`, a: `Availability measures uptime and responsiveness; reliability measures correctness. A replica serving stale data is available but unreliable — it responds but returns wrong results.` },
      { q: `What is the composition problem in data systems?`, a: `When an application combines DB, cache, search, and queue, none of those components guarantees the cross-component invariants the application needs. The application code must maintain them, and that is where most correctness bugs live.` },
      { q: `What does Kleppmann identify as the leading cause of outages?`, a: `Human errors — configuration mistakes, bad deployments, incorrect schema migrations — not hardware failures.` },
      { q: `What is a fault vs a failure in Kleppmann's terminology?`, a: `A fault is one component deviating from its spec. A failure is the whole system stopping to provide the required service. Fault-tolerant systems isolate faults so they cannot cascade into failures.` },
      { q: `Give an example of a cross-component correctness invariant that no single component guarantees.`, a: `After a DB write, the cache must not serve the old value. PostgreSQL guarantees its own durability; Redis guarantees its own atomicity; but neither guarantees cache-DB consistency — that is the application's responsibility.` },
    ],
  },

  {
    id: 'ddia-reliability-scalability-maintainability',
    title: 'Reliability, Scalability, and Maintainability',
    icon: 'layers',
    color: '#6366f1',
    questions: 5,
    description: 'The three core concerns of every data system and how to reason about them in design interviews.',
    visualizations: [{ title: 'Twitter Fan-out Architecture', description: '', image: '/diagrams/ddia/reliability-scalability-01.png' }],
    introduction: `Chapter 1 of DDIA opens with the observation that most applications are data-intensive rather than compute-intensive — the real challenges are storing, querying, and transforming data at scale, not raw CPU throughput.

Reliability means the system continues to work correctly even when faults occur — hardware faults, software bugs, and human errors. The key distinction is fault vs failure: a fault is one component deviating from spec; a failure is the whole system stopping. Reliable systems tolerate faults before they become failures. Techniques include redundancy (RAID, replication), chaos engineering to trigger faults deliberately, and design for recoverability (backups, atomic transactions).

Scalability is the ability to handle increased load. Load is described with load parameters — requests per second, ratio of reads to writes, active users, cache hit rate. Twitter's fan-out problem is the canonical DDIA example: posting a tweet can mean writing to 30 million home timeline caches. Performance is measured by throughput (batch) or response time (online), and Kleppmann insists on percentiles (p50, p95, p99, p999) not averages, because averages hide the tail that slow down the slowest users.

Maintainability covers operability (easy for ops teams to run), simplicity (reducing accidental complexity), and evolvability (making future changes easy). Abstraction is the primary tool for simplicity — hiding implementation details behind clean interfaces.`,
    whenToUse: [
      'Opening a system design answer with the right framing',
      'Justifying why you choose replication or redundancy',
      'Explaining SLA percentile choices (p99 vs p999)',
      'Discussing technical debt and evolvability',
    ],
    keyConcepts: [
      { term: 'Reliability', definition: 'Continuing to work correctly even when faults occur. Achieved through redundancy, chaos testing, and design for recoverability.' },
      { term: 'Fault vs failure', definition: 'A fault is one component deviating from spec. A failure is the whole system stopping. Reliable systems tolerate faults.' },
      { term: 'Scalability', definition: 'The ability to handle increased load. Described by load parameters and measured by latency percentiles and throughput.' },
      { term: 'Tail latency', definition: 'High-percentile response times (p99, p999). Averages hide these; percentiles expose them. Tail latency matters because the slowest requests often affect the most important users.' },
      { term: 'Maintainability', definition: 'Operability, simplicity, and evolvability. Reducing accidental complexity through abstraction so future changes are safe.' },
    ],
    pitfalls: [
      'Quoting average latency in a design — always use percentiles in interviews.',
      'Treating reliability and availability as synonyms — availability is uptime percentage; reliability is correct behavior under faults.',
      'Ignoring human error as the largest source of production incidents.',
    ],
    keyQuestions: [
      {
        question: 'How do you define and measure scalability in a system design?',
        answer: `I start by identifying the load parameters that matter most for the system — for a read-heavy social feed, that is reads per second and the fan-out ratio; for a payment system, it is transactions per second and p99 latency under peak load.

I then measure performance in two ways: throughput (how many requests per second with fixed resources) and latency (how long each request takes, measured at p50, p95, and p99). I avoid averages because they mask tail latency — a p99 of 500ms means 1 in 100 users waits half a second, which compounds in microservices where one user request fans out to 50 backend calls.

Scalability strategies fall into two categories: scaling up (larger machines — limited ceiling) and scaling out (more machines — preferred for stateless services). Stateful services like databases require partitioning or sharding to scale out, which introduces new complexity around cross-partition queries and transactions.`,
      },
    ],
    quickFire: [
      { q: `What are the three categories of faults in DDIA Chapter 1?`, a: `Hardware faults (random, uncorrelated), software errors (systematic, correlated across instances), and human errors (configuration mistakes, bad deployments — the leading cause of outages).` },
      { q: `What is the disk MTBF range Kleppmann cites, and why does it matter for cluster sizing?`, a: `10 to 50 years MTBF per disk. In a cluster of 10,000 disks you expect roughly one failure per day, so redundancy is mandatory at scale even though individual failure rates are low.` },
      { q: `What load parameters make Twitter's fan-out architecture the right choice?`, a: `4.6K writes/sec average but 300K home timeline reads/sec — a 65:1 read/write ratio that makes it economically attractive to do more work at write time to keep reads cheap.` },
      { q: `What is the celebrity problem in fan-out-on-write?`, a: `A high-follower-count user (Lady Gaga, 30M followers) triggers 30M cache writes per tweet, which at peak tweet rates overwhelms the write pipeline.` },
      { q: `What is the difference between essential and accidental complexity?`, a: `Essential complexity is inherent to the problem domain and cannot be removed. Accidental complexity is introduced by the implementation and can be eliminated through better abstractions or refactoring.` },
      { q: `What does Kleppmann mean by operability?`, a: `Making it easy for operations teams to run the system day-to-day: good monitoring, easy rollback, predictable failure behavior, good documentation, and no single-person dependencies.` },
      { q: `Why is horizontal scaling harder for stateful services than stateless ones?`, a: `Stateless services share no state, so any instance can handle any request. Stateful services require sharding or replication strategies to distribute data, and cross-shard queries and transactions add significant complexity.` },
    ],
  },

  {
    id: 'ddia-slas-percentiles',
    title: 'SLAs, SLOs, and Percentile Latency',
    icon: 'activity',
    color: '#6366f1',
    questions: 4,
    description: 'How to set, measure, and defend latency SLOs with tail percentiles instead of averages.',
    visualizations: [{ title: 'Response Time Percentiles', description: '', image: '/diagrams/ddia/percentiles-01.png' }],
    introduction: `An SLA (Service Level Agreement) is a contract with customers specifying expected performance, often including an SLO (Service Level Objective) such as "p99 latency under 200ms for 99.9% of requests." Kleppmann argues that percentile metrics are the only honest way to describe latency — arithmetic means hide the distribution.

Why p99 matters: if a service calls 100 backend dependencies, and each has a 1% chance of being slow, almost every request will hit at least one slow backend. Tail latency amplification is the effect where a small percentage of slow responses at one layer becomes the majority of slow responses at a higher layer.

Measuring percentile latency requires keeping a histogram of response times. Rolling-window histograms (e.g., last 10 minutes) are used in practice. The percentiles are computed from the histogram, not from storing every individual sample. Tools like HDRHistogram and Prometheus histograms implement this.

Head-of-line blocking is a common source of tail latency: a few slow requests occupy all server threads, causing queuing delays for subsequent fast requests. This is why server-side concurrency matters and why timeouts must be set at percentile boundaries, not averages.`,
    whenToUse: [
      'Defining SLOs for a new service in a design review',
      'Explaining why you monitor p99 not average latency in metrics questions',
      'Discussing how to budget latency across microservice call chains',
      'Defending a timeout value choice in system design',
    ],
    keyConcepts: [
      { term: 'SLA', definition: 'Service Level Agreement — a contract specifying expected system behavior, often including latency and availability targets.' },
      { term: 'SLO', definition: 'Service Level Objective — a specific measurable target within an SLA, e.g., p99 latency under 200ms.' },
      { term: 'Tail latency amplification', definition: 'When a request fans out to N backends, the overall latency is dominated by the slowest backend. Tail latency at N=100 backends means almost every request hits a slow one.' },
      { term: 'Head-of-line blocking', definition: 'Slow requests occupy all available server threads, causing fast subsequent requests to queue behind them and experience artificially high latency.' },
      { term: 'Rolling window histogram', definition: 'A data structure that tracks the distribution of response times over a sliding window (e.g., 10 minutes), enabling percentile computation without storing every sample.' },
    ],
    pitfalls: [
      'Setting SLOs based on average latency — averages let the worst user experiences be invisible.',
      'Ignoring tail latency amplification when designing microservice call chains.',
      'Using p999 as your only SLO target — it is too expensive to meet and obscures p99 problems.',
    ],
    keyQuestions: [
      {
        question: 'Why do we use p99 latency instead of average latency for SLOs?',
        answer: `Averages hide distribution. A service with p50=10ms and p99=2000ms has an average around 30ms, which looks fine but means 1 in 100 users waits 2 seconds. For a checkout flow or API gateway, that is unacceptable.

More critically, tail latency amplifies across call chains. If each of 50 microservice calls has a 1% chance of hitting the 2-second tail, then nearly every composite request will hit at least one slow call. The composite p99 becomes approximately 1 - (0.99^50) = 40% chance of hitting a slow backend.

We use p99 as the standard SLO target because it is the highest percentile we can realistically serve within cost constraints, and it captures the experience of users who matter most: power users, paying customers, and automated callers that retry on failure.`,
      },
    ],
    quickFire: [
      { q: `What is the difference between response time and latency?`, a: `Response time is the total client-observed time including network, queuing, and processing. Latency is specifically queuing time (time waiting, not being processed). High response time with low processing time points to a queue or network bottleneck.` },
      { q: `What does p99 response time mean?`, a: `99% of requests complete within that time threshold. Equivalently, 1 in 100 requests is slower than the p99 value.` },
      { q: `If each of 100 backend services has a 1% chance of being slow, what is the probability that a fan-out request hitting all 100 is slow?`, a: `1 - 0.99^100 = approximately 63%. The fan-out amplifies tail latency dramatically.` },
      { q: `What is head-of-line blocking?`, a: `A slow request at the head of a processing queue blocks all subsequent requests behind it, artificially inflating their response times even if they would individually be fast.` },
      { q: `Name two algorithms for computing streaming percentiles without storing all observations.`, a: `t-digest (accurate at tails, mergeable) and HdrHistogram (accurate across the range, high-frequency recording, fixed memory footprint).` },
      { q: `Why might p999 matter more than p99 for some businesses?`, a: `The slowest 0.1% of users are often your highest-value customers — largest accounts, most data, highest spend. Ignoring p999 means ignoring the users you most want to retain.` },
      { q: `What is the difference between an SLO and an SLA?`, a: `SLO is an internal engineering target. SLA is a customer contract with financial consequences for missing it. SLOs should be stricter than SLAs to provide an operational safety buffer.` },
      { q: `What is the hedged request technique and when does it help?`, a: `After a timeout (e.g., the p95 latency), send the same request to a second server instance and use whichever responds first. It dramatically reduces tail latency at the cost of slightly higher resource usage — Google reported 95% reduction in p999 latency with 2% more requests.` },
    ],
  },

  {
    id: 'ddia-fan-out',
    title: 'Fan-Out and the Twitter Timeline Problem',
    icon: 'gitBranch',
    color: '#6366f1',
    questions: 4,
    description: 'Write fan-out vs read fan-out trade-offs illustrated by the canonical Twitter home timeline case.',
    visualizations: [{ title: 'Fan-out Load Model', description: '', image: '/diagrams/ddia/fan-out-01.png' }],
    introduction: `The Twitter home timeline problem is DDIA's most-cited example of load parameter trade-offs. Two approaches exist:

Approach 1 — Read fan-out (pull on read): when a user requests their timeline, query tweets from everyone they follow and merge in memory. Simple writes (one INSERT per tweet), expensive reads (query N followed accounts, merge, sort).

Approach 2 — Write fan-out (push on write): when a tweet is posted, write it into the home timeline cache of every follower immediately. Reads are fast (single cache lookup), but writes are amplified by follower count. For a user with 30 million followers, one tweet causes 30 million cache writes.

Twitter's actual solution is a hybrid: regular users use write fan-out; celebrity accounts (Beyonce, Obama) with millions of followers use read fan-out at read time and merge the two results. This avoids the write amplification problem for outliers while keeping reads fast for most users.

The fan-out concept generalizes: news feeds, notification systems, search index updates, and event-driven architectures all face the same read vs write amplification trade-off.`,
    whenToUse: [
      'Designing a social feed (Twitter, Instagram, LinkedIn) in a system design interview',
      'Explaining write amplification vs read amplification trade-offs',
      'Justifying a hybrid approach for celebrity/influencer accounts',
      'Discussing cache precomputation vs on-demand computation',
    ],
    keyConcepts: [
      { term: 'Write fan-out', definition: 'Distributing a write to multiple destinations at write time. Fast reads, but writes are amplified by the number of destinations (followers).' },
      { term: 'Read fan-out', definition: 'Merging data from multiple sources at read time. Simple writes, but reads are expensive and slow under high follower counts.' },
      { term: 'Write amplification', definition: 'One logical write triggering multiple physical writes. A tweet from a 30M-follower account causes 30M cache insertions.' },
      { term: 'Hybrid fan-out', definition: 'Regular users get write fan-out (precomputed timelines); celebrities get read fan-out merged at read time. Avoids the outlier amplification problem.' },
    ],
    pitfalls: [
      'Choosing pure write fan-out without handling high-follower outliers — this collapses under celebrity accounts.',
      'Choosing pure read fan-out for high-traffic feeds — merge queries across thousands of followed accounts are too slow.',
      'Forgetting that the hybrid split point (follower threshold) requires tuning and monitoring.',
    ],
    keyQuestions: [
      {
        question: 'How would you design a Twitter-like home timeline?',
        answer: `I use a write fan-out architecture with a celebrity exception.

For regular users: when a tweet is posted, a background worker fans out and writes the tweet ID into each follower's timeline cache (Redis sorted set keyed by timestamp). On read, the user's timeline is a single O(1) cache lookup returning the latest N tweet IDs, then a batch fetch of tweet content.

For celebrity accounts (above a configurable follower threshold, say 1M): we do NOT write to 30M caches. Instead, celebrity tweets are stored separately. At read time, the user's timeline is computed by merging their precomputed cache with a real-time query of celebrities they follow. The merge is cheap because celebrity accounts are few.

The trade-off is write cost vs read latency. Write fan-out trades storage and background CPU for fast reads. Read fan-out is free at write time but becomes expensive at read time as follower graphs grow. The hybrid gives us fast reads for the common case while avoiding catastrophic write amplification for outliers.`,
      },
    ],
    quickFire: [
      { q: `What are Twitter's key load parameters from DDIA Chapter 1?`, a: `4.6K tweets written per second average (12K peak), and 300K home timeline reads per second — a read/write ratio of approximately 65:1.` },
      { q: `Why does pull-on-read fail at Twitter's scale?`, a: `At 300K timeline reads per second, each requiring a JOIN across a follows graph and tweets corpus with billions of rows, the database cannot sustain the query load. Computation cost is paid on every read.` },
      { q: `What is the celebrity problem in fan-out-on-write?`, a: `An account with 30M followers triggers 30M cache writes per tweet. At peak tweet rates, a handful of celebrity tweets creates hundreds of millions of writes per second.` },
      { q: `How does Twitter's hybrid approach resolve the celebrity problem?`, a: `Normal users get fan-out-on-write; their followers' caches are pre-populated. High-follower accounts are excluded from fan-out; their tweets are fetched live and merged into the timeline at read time.` },
      { q: `What is write amplification?`, a: `The ratio of actual storage writes to logical application writes. In fan-out, one tweet write becomes N cache writes where N is the follower count.` },
      { q: `When does fan-out favor the read side over pull-on-read?`, a: `When the read/write ratio is high (many more reads than writes), fan-out amortizes the write cost across many cheap reads. If reads are rare relative to writes, fan-out wastes write throughput on results that are rarely consumed.` },
      { q: `What must a fan-out system do asynchronously and why?`, a: `The fan-out itself must be asynchronous (via a queue or background job) because synchronously writing to millions of follower caches during the tweet write would make the write API timeout.` },
      { q: `What load parameter would make you choose pull-on-read over fan-out?`, a: `A write-heavy workload where writes significantly outnumber reads, or where the fan-out degree is extremely high for most items, making write amplification prohibitive for the majority of writes rather than just celebrity outliers.` },
    ],
  },

  // ── DATA MODELS ──────────────────────────────────────────────────────────────

  {
    id: 'ddia-relational-vs-document',
    title: 'Relational vs Document Data Models',
    icon: 'database',
    color: '#8b5cf6',
    questions: 5,
    description: 'When to use relational (PostgreSQL) vs document (MongoDB) models and the impedance mismatch problem.',
    visualizations: [{ title: 'Relational vs Document Model', description: '', image: '/diagrams/ddia/relational-vs-document-01.png' }],
    introduction: `The relational model (Codd, 1970) organizes data into tables with rows and typed columns. Relations between entities are expressed through foreign keys and joins. It enforces schema at write time and normalizes data to reduce redundancy.

The document model stores self-contained documents (JSON, BSON, XML). Documents map naturally to object-oriented code — one document fetch retrieves an entire entity with its nested data, avoiding joins. This locality is the document model's primary advantage.

The impedance mismatch is the friction between relational tables and in-memory objects. Object-relational mappers (ORMs) like Hibernate bridge this, but the translation is never perfect. Document databases reduce impedance for hierarchical data (a resume with multiple jobs and education entries maps naturally to a document).

Kleppmann's guidance: use relational when you have many-to-many relationships (data that genuinely interconnects) or when you need joins and aggregations. Use document when your data has a natural tree structure with mostly one-to-many relationships and you always load the full document. For many-to-many, documents force you to denormalize (duplicate data) or implement joins in application code.`,
    whenToUse: [
      'Choosing a database for a new service in a design interview',
      'Explaining why you use PostgreSQL over MongoDB or vice versa',
      'Discussing denormalization trade-offs',
      'Answering questions about NoSQL vs SQL',
    ],
    keyConcepts: [
      { term: 'Impedance mismatch', definition: 'The friction between relational table representation and in-memory object representation. The reason ORMs exist and why document databases appeal to developers.' },
      { term: 'Schema-on-write', definition: 'Relational databases enforce schema at insert time — bad data is rejected. This provides guarantees but requires migrations for schema changes.' },
      { term: 'Schema-on-read', definition: 'Document databases store arbitrary structure; schema is interpreted at read time by application code. Flexible but pushes validation responsibility to the application.' },
      { term: 'Locality', definition: 'In document databases, all data for one entity is stored together and fetched in one read. In relational databases, an entity may require joining multiple tables.' },
      { term: 'Normalization', definition: 'Structuring relational data to reduce redundancy by referencing shared entities via foreign keys rather than duplicating them.' },
    ],
    pitfalls: [
      'Choosing document databases for data with many-to-many relationships — joins in application code are fragile and slow.',
      'Over-normalizing in a relational schema to the point where simple reads require five-table joins.',
      'Ignoring that document databases do support secondary indexes — they are not limited to key-value lookups.',
    ],
    keyQuestions: [
      {
        question: 'When would you choose MongoDB over PostgreSQL?',
        answer: `I choose a document database when three conditions hold: the data has a natural tree shape (one parent entity with nested children), I almost always read or write the full document together, and I do not need to join across documents.

A concrete example is a CMS article with metadata, body sections, tags, and author info. All of it belongs to one article, it is always loaded together, and I rarely need to query across articles by joining on author fields.

I choose relational (PostgreSQL) when: data has genuine many-to-many relationships (orders have many products, products belong to many orders), I need ad-hoc aggregations and GROUP BY, or I need transactions across multiple entities. PostgreSQL's JSONB column gives me a middle ground: store document-like fields inside a relational row with full indexing support, which is often the best of both worlds.`,
      },
    ],
    quickFire: [
      { q: `What problem did Edgar Codd's 1970 relational model paper solve?`, a: `It freed applications from knowing the physical layout of data. Navigational databases (IMS, CODASYL) required programmers to traverse explicit pointers; changing storage layout broke application code. The relational model made queries declarative and let a query optimizer choose access paths.` },
      { q: `Why does the document model have better data locality than relational?`, a: `A document is stored contiguously, so one disk read or network call retrieves all related data for an entity. Relational databases spread an entity across multiple tables, requiring joins (and potentially multiple disk seeks) to reassemble it.` },
      { q: `When does the document model break down?`, a: `When data has many-to-many relationships. Representing shared entities (like a company referenced by many resumes) requires either duplication (causing update anomalies) or application-level joins, which are slower and error-prone compared to database joins.` },
      { q: `What is schema-on-read?`, a: `The document model stores any structure without enforcing a schema at write time. The application interprets the document shape at read time and handles missing or differently-shaped fields in code.` },
      { q: `How is the relational vs document distinction blurring?`, a: `PostgreSQL added jsonb columns (binary JSON with GIN indexes) and MongoDB added $lookup (joins). Both databases now support mixed relational and document patterns, making the choice more about operational familiarity than fundamental capability differences.` },
      { q: `What is the N+1 query problem?`, a: `Loading a list of N records and then issuing one query per record to fetch a related entity, resulting in N+1 total queries. It is a common ORM pitfall solved by eager loading (JOIN or IN query to fetch all related records at once).` },
      { q: `Why can a document database still have a schema?`, a: `The schema is implicit, encoded in the application code that reads documents. MongoDB 3.6+ supports explicit JSON Schema validation at the collection level, and application-layer libraries (Joi, Zod) enforce structure before writes, giving schema-on-read databases an optional schema-on-write layer.` },
    ],
  },

  {
    id: 'ddia-graph-data-models',
    title: 'Graph Data Models',
    icon: 'network',
    color: '#8b5cf6',
    questions: 4,
    description: 'Property graphs, triple-stores, and when to use graph databases for highly connected data.',
    visualizations: [{ title: 'Property Graph Data Model', description: '', image: '/diagrams/ddia/graph-data-models-01.png' }],
    introduction: `Graph databases excel when data has many-to-many relationships where the connections themselves carry meaning. Social networks (people follow people), road networks (intersections connected by roads), recommendation engines (users rate items, items have categories), and knowledge graphs all fit this model naturally.

The property graph model (Neo4j) has vertices and edges, both carrying arbitrary key-value properties. Edges are directed and have a type label. Cypher is Neo4j's declarative query language — you describe the pattern you want to find, not how to traverse it.

The triple-store model (RDF, SPARQL) represents data as subject-predicate-object triples. It is the foundation of the semantic web. SPARQL is its query language.

Relational databases can represent graphs (edges table with from_id and to_id), but multi-hop traversals require recursive CTEs or application-level iteration, both of which are slow. Graph databases use index-free adjacency — each vertex directly stores pointers to adjacent vertices — so traversal is O(hops) not O(total edges).`,
    whenToUse: [
      'Designing a social graph, recommendation engine, or fraud detection system',
      'Choosing a database for a knowledge graph or permissions system',
      'Explaining why relational tables are poor for multi-hop traversals',
    ],
    keyConcepts: [
      { term: 'Property graph', definition: 'Graph model where vertices and edges both carry arbitrary key-value properties. Supported by Neo4j, Amazon Neptune.' },
      { term: 'Index-free adjacency', definition: 'Each vertex stores direct pointers to its neighbors. Traversal does not require global index lookups; cost is proportional to hops, not graph size.' },
      { term: 'Cypher', definition: 'Declarative graph query language for Neo4j. Describes patterns of vertices and edges using ASCII art syntax.' },
      { term: 'Triple-store / RDF', definition: 'Graph model storing subject-predicate-object triples. Used in semantic web and knowledge graphs. Queried with SPARQL.' },
    ],
    pitfalls: [
      'Using a relational database for multi-hop graph traversals — recursive CTEs degrade exponentially with hop depth.',
      'Choosing a graph database when data is mostly hierarchical tree-shaped rather than truly interconnected.',
    ],
    keyQuestions: [
      {
        question: 'When would you choose a graph database over a relational one?',
        answer: `I choose a graph database when the queries are primarily about relationships and multi-hop traversals matter. The canonical example is a social network: "find all people who are friends-of-friends of Alice and also work at the same company." In PostgreSQL this requires a recursive CTE or application-level iteration across millions of rows. In Neo4j this is a two-hop Cypher pattern that uses index-free adjacency.

For fraud detection, graph databases are valuable because fraud patterns manifest as unusual relationship structures — a ring of synthetic accounts sharing an address or phone number. Graph traversal can identify these rings in milliseconds; the equivalent SQL requires complex self-joins.

I would not choose a graph database for a simple social profile with a few friend counts. If the queries are "fetch a user and their direct friends," a relational join suffices. The graph database pays off when the depth of traversal is unknown or unbounded.`,
      },
    ],
    quickFire: [
      { q: `Name three real-world domains where graph databases outperform relational databases.`, a: `Social networks (friend-of-friend traversal), fraud detection (identifying clusters of accounts sharing devices or bank accounts), and dependency graphs (package managers resolving transitive dependencies across hundreds of packages).` },
      { q: `What does the * in a Cypher MATCH clause mean?`, a: `Variable-length path matching. MATCH (a)-[:WITHIN*0..]->(b) traverses zero or more WITHIN edges between a and b, handling transitive relationships without knowing the depth in advance.` },
      { q: `What is a triple in the RDF model?`, a: `A (subject, predicate, object) statement where each element is typically a URI. For example, (dbpedia:Idaho, dbpedia:within, dbpedia:United_States). Triples form a directed graph and enable linked data across different organizations.` },
      { q: `Can a relational database represent a graph?`, a: `Yes, using an adjacency table (vertex_id, neighbor_id) and WITH RECURSIVE for traversal. It works for small graphs or single-depth queries but becomes verbose for variable-depth traversal and does not optimize graph queries as well as dedicated graph databases.` },
      { q: `What database uses Datalog as its query language?`, a: `Datomic, created by Rich Hickey. Datomic stores data as immutable facts with transaction timestamps and uses Datalog for queries, supporting time-travel queries against historical states of the database.` },
      { q: `Why is sharding a graph database difficult?`, a: `Edges connect arbitrary vertex pairs. If two connected vertices live on different shards, every edge traversal between them requires a cross-shard network call, which destroys the performance advantage of graph traversal. Most graph databases run on a single large node or primary-replica pairs.` },
      { q: `What is the difference between a graph database and a graph processing framework?`, a: `A graph database stores and queries graph-structured data transactionally, serving application queries with low latency. A graph processing framework (Apache Spark GraphX, Google Pregel) runs batch algorithms like PageRank or community detection across very large static graphs, typically in analytical pipelines rather than application backends.` },
    ],
  },

  {
    id: 'ddia-query-languages',
    title: 'Declarative vs Imperative Query Languages',
    icon: 'code',
    color: '#8b5cf6',
    questions: 3,
    description: 'Why SQL is declarative, how query optimizers work, and how MapReduce differs from SQL.',
    visualizations: [{ title: 'Property Graph and Cypher Query', description: '', image: '/diagrams/ddia/graph-data-models-01.png' }],
    introduction: `SQL is declarative: you specify what result you want, not how to compute it. The query optimizer chooses the execution plan — which indexes to use, join order, whether to use a hash join or nested loop join. This lets the optimizer improve independently of application code.

Imperative code (a for-loop over data) tells the computer exactly how to compute the result. It is harder to parallelize and impossible for a query planner to optimize.

MapReduce is a hybrid: it is lower-level than SQL (you write map and reduce functions in code) but processes data in batches across a cluster. It emerged before SQL-on-Hadoop tools (Hive, Pig) existed. Modern systems like Spark SQL and BigQuery provide declarative SQL on top of distributed compute.

CSS is another example of a declarative query language: you describe which elements should have which styles, not the order in which they should be painted.`,
    whenToUse: [
      'Explaining why query optimizers matter for database choice',
      'Comparing SQL, MapReduce, and streaming query models in an architecture discussion',
    ],
    keyConcepts: [
      { term: 'Declarative query language', definition: 'You specify the desired result pattern; the system chooses the execution strategy. SQL, Cypher, SPARQL, CSS are declarative.' },
      { term: 'Query optimizer', definition: 'The database component that translates a declarative query into an efficient execution plan, choosing indexes, join orders, and parallelism.' },
      { term: 'MapReduce', definition: 'A programming model for processing large datasets across a cluster. Map emits key-value pairs; reduce aggregates by key. Lower-level than SQL.' },
    ],
    pitfalls: [
      'Assuming MapReduce is the modern default — Spark, Flink, and BigQuery have largely replaced raw MapReduce.',
      'Writing application-level sorting and filtering that bypasses the database query optimizer.',
    ],
    keyQuestions: [
      {
        question: 'Why is SQL declarative and why does that matter?',
        answer: `SQL is declarative because you write what result you want (SELECT, WHERE, GROUP BY) without specifying the algorithm to compute it. The query optimizer then chooses the execution plan — it might use an index scan, a full table scan, a hash join, or a merge join depending on table statistics, available indexes, and memory.

This matters for two reasons: performance and evolvability. Performance: the optimizer can make better choices than most application code, and it can re-plan as data distribution changes. Evolvability: adding an index improves query performance without changing any application code. If queries were imperative loops, every performance improvement would require application code changes.

The contrast is MapReduce, where you write Python or Java map/reduce functions. It is portable and powerful for unstructured data but has no query optimizer. Modern systems like Spark SQL layer a declarative SQL interface on top, giving both the expressiveness of SQL and the scalability of distributed compute.`,
      },
    ],
    quickFire: [
      { q: `Give one example each of a declarative and an imperative query approach.`, a: `Declarative: SQL SELECT statement (specifies the desired result, not the algorithm). Imperative: iterating over a CODASYL database cursor following explicit record pointers, or a JavaScript for-loop that filters an array of objects.` },
      { q: `Why can a declarative SQL query run faster after a database upgrade without changing the query?`, a: `The query optimizer may choose a better execution plan when new indexes exist, statistics are updated, or the optimizer's cost model improves. The declarative specification remains unchanged while the engine's execution strategy improves.` },
      { q: `What is the core problem with MapReduce for ad-hoc queries?`, a: `The map and reduce functions are opaque JavaScript code that the framework cannot inspect or optimize. It cannot push predicates into the map function, reorder operations, or use indexes, so every MapReduce job does a full scan.` },
      { q: `What MongoDB pipeline stage is equivalent to a SQL WHERE clause?`, a: `$match. Placed first in the pipeline, it filters documents before subsequent stages process them, and MongoDB can use an index for it when one exists on the filter field.` },
      { q: `Why is CSS considered a declarative language?`, a: `CSS specifies what elements should look like (.button { color: blue }) without prescribing when to repaint, how to resolve specificity, or how to batch DOM updates. The browser engine determines the execution.` },
      { q: `Can SQL parallelize queries automatically?`, a: `Yes, in distributed SQL engines like Presto, BigQuery, and Spark SQL, a single SQL query is split into tasks that run across hundreds of nodes. The declarative nature of SQL allows the engine to partition work without developer involvement.` },
      { q: `Why did Google invent MapReduce if SQL already existed?`, a: `SQL engines of the early 2000s could not scale to petabytes across thousands of commodity machines. MapReduce was designed for fault-tolerant, distributed batch processing at Google's scale. The industry later built SQL query engines (Hive, Dremel, Presto) on top of distributed infrastructure, combining SQL's declarative benefits with distributed execution.` },
    ],
  },

  {
    id: 'ddia-schema-on-read-vs-write',
    title: 'Schema-on-Read vs Schema-on-Write',
    icon: 'fileText',
    color: '#8b5cf6',
    questions: 3,
    description: 'Enforcing schema at write time (relational) vs at read time (document/schemaless) and the trade-offs for schema evolution.',
    visualizations: [{ title: 'Schema-on-Write vs Schema-on-Read', description: '', image: '/diagrams/ddia/schema-on-read-vs-write-01.png' }],
    introduction: `Schema-on-write (relational databases): the database enforces a fixed schema. INSERT statements that violate the schema are rejected. All data in a column is guaranteed to be of the declared type. Schema changes require ALTER TABLE migrations.

Schema-on-read (document databases, CSV files, data lakes): the structure is implicit, interpreted by the application when reading. Any document can be stored regardless of shape. The application must handle missing fields and type variations.

Schema-on-write advantages: type safety, query planner can use column statistics, data integrity enforced at storage layer. Disadvantages: migrations can be slow and disruptive (ALTER TABLE on a 500GB table with 100M rows acquires a lock or requires online migration tooling like pt-online-schema-change).

Schema-on-read advantages: flexible for heterogeneous data, no migration required when the data structure changes. Disadvantages: every reader must handle schema variations; bugs from unexpected field shapes appear at read time, not write time.

Kleppmann's nuance: schemaless databases still have schemas — they are just enforced by the application rather than the database. The choice is where the enforcement happens.`,
    whenToUse: [
      'Choosing between a relational and document database based on schema stability',
      'Explaining migration strategies for relational schema changes',
      'Discussing data lake vs data warehouse schema approaches',
    ],
    keyConcepts: [
      { term: 'Schema-on-write', definition: 'Schema enforced at insert time by the database. Rejects invalid data. Requires migrations for schema changes.' },
      { term: 'Schema-on-read', definition: 'Schema enforced at read time by application code. Flexible but moves validation responsibility to the application.' },
      { term: 'Online schema migration', definition: 'Tools (pt-online-schema-change, gh-ost, pglogical) that alter table schema without long locks by copying rows in the background.' },
    ],
    pitfalls: [
      'Treating document databases as truly schemaless — application code always encodes an implicit schema.',
      'Running ALTER TABLE on a large table without an online migration tool — this can lock the table for hours in MySQL.',
    ],
    keyQuestions: [
      {
        question: 'How do you handle a schema change on a large production table?',
        answer: `I never run a blocking ALTER TABLE on a large production table. Instead I use an online migration tool.

For MySQL: pt-online-schema-change or gh-ost create a shadow table, copy rows in batches, replay binlog changes on the shadow table, then do an atomic RENAME. The original table remains fully available for reads and writes throughout.

For PostgreSQL: ALTER TABLE ADD COLUMN with a DEFAULT is instant since PostgreSQL 11 — it stores the default in catalog metadata rather than rewriting rows. For more complex changes (changing a column type, adding a NOT NULL constraint on a populated column), I use a multi-step migration: add the new nullable column, backfill in batches, apply the constraint, then drop the old column.

The pattern for zero-downtime: expand (add new schema compatible with old code), migrate (backfill data), contract (remove old schema after all code is updated). This is the expand-contract pattern.`,
      },
    ],
    quickFire: [
      { q: `What is schema-on-read?`, a: `Schema is implicit and only interpreted when data is read — like JSON documents or MongoDB. No enforcement at write time.` },
      { q: `What is schema-on-write?`, a: `Schema is explicit and enforced at write time — like relational databases. Invalid data is rejected before it's stored.` },
      { q: `What is the main advantage of schema-on-read?`, a: `Flexibility — you can store heterogeneous or evolving data without a migration step. Different documents can have different fields.` },
      { q: `What is the main advantage of schema-on-write?`, a: `Safety — the database guarantees all stored data conforms to the schema, making reads predictable and type-safe.` },
      { q: `How do you perform a schema migration in a schema-on-write database?`, a: `Run an ALTER TABLE (or equivalent) migration, which may lock the table or require a multi-step shadow-copy process for large tables.` },
      { q: `How do you 'migrate' schema in a schema-on-read system?`, a: `You don't migrate existing data — instead you update the read path to handle both old and new formats using conditional logic on the field's presence.` },
      { q: `When does schema-on-read cause problems?`, a: `When you assume a field exists but it doesn't — bugs surface at read time, not write time, making them harder to catch early.` },
      { q: `What's an analogy Kleppmann uses for schema-on-read vs schema-on-write?`, a: `Dynamic type checking (schema-on-read) vs static type checking (schema-on-write) — same trade-off between flexibility and early error detection.` },
    ],
  },

  // ── STORAGE ENGINES ──────────────────────────────────────────────────────────

  {
    id: 'ddia-lsm-trees-sstables',
    title: 'LSM-Trees and SSTables',
    icon: 'hardDrive',
    color: '#0ea5e9',
    questions: 5,
    description: 'How log-structured merge-trees work, write amplification, space amplification, and which databases use them.',
    visualizations: [{ title: 'LSM-Tree Write and Read Path', description: '', image: '/diagrams/ddia/lsm-trees-01.png' }],
    introduction: `LSM-trees (Log-Structured Merge-Trees) are the storage engine behind RocksDB, Cassandra, HBase, and LevelDB. They are optimized for write-heavy workloads.

Write path: writes go to an in-memory buffer (MemTable) and a write-ahead log (WAL) on disk. When the MemTable fills, it is flushed to disk as an SSTable (Sorted String Table) — an immutable file with keys sorted in order. Reads check the MemTable first, then SSTables from newest to oldest.

Compaction merges SSTables to remove deleted and outdated values and to keep the number of SSTables manageable. Two main strategies: size-tiered compaction (group SSTables by size, merge groups when a level fills) and leveled compaction (LevelDB/RocksDB — maintain fixed size levels, merge older SSTables into the next level as they fill).

Write amplification: data is written once to the WAL, once to the MemTable flush, and then rewritten multiple times during compaction. RocksDB can amplify writes by 10-30x. Space amplification: deleted keys are kept until compaction; during compaction, old and new SSTables both exist temporarily.

Read path: worst case reads all SSTables. Bloom filters (probabilistic membership structures) eliminate most unnecessary SSTable reads — if the Bloom filter says a key is not in an SSTable, skip it.`,
    whenToUse: [
      'Explaining why Cassandra and RocksDB are write-optimized',
      'Comparing LSM-tree vs B-tree storage engines in a database choice discussion',
      'Discussing write amplification in a performance interview',
      'Explaining Bloom filters in the context of read optimization',
    ],
    keyConcepts: [
      { term: 'SSTable', definition: 'Sorted String Table — an immutable on-disk file with keys sorted lexicographically. The building block of LSM-tree storage.' },
      { term: 'MemTable', definition: 'In-memory sorted write buffer. New writes go here first; flushed to SSTable when full.' },
      { term: 'Write-ahead log (WAL)', definition: 'Append-only disk log written before the MemTable. Enables crash recovery — replays WAL to rebuild the MemTable after a crash.' },
      { term: 'Compaction', definition: 'Background process that merges SSTables, removes deleted entries, and reorganizes levels. Trades I/O overhead for bounded read costs.' },
      { term: 'Bloom filter', definition: 'A probabilistic data structure that can say "definitely not in this SSTable" or "might be in this SSTable." Eliminates unnecessary SSTable reads with very low memory cost.' },
      { term: 'Write amplification', definition: 'The ratio of bytes written to disk vs bytes written by the application. LSM-trees can have 10-30x write amplification due to compaction rewrites.' },
    ],
    pitfalls: [
      'Assuming LSM-tree reads are always slower than B-tree reads — Bloom filters and block caches make point reads fast in practice.',
      'Ignoring write amplification when choosing RocksDB for an SSD — high write amplification wears out flash cells faster.',
      'Confusing size-tiered and leveled compaction — they have different space and write amplification characteristics.',
    ],
    keyQuestions: [
      {
        question: 'Explain how an LSM-tree handles a write and then a read.',
        answer: `Write path: the write is appended to the write-ahead log on disk (for durability) and inserted into the in-memory MemTable (a sorted structure like a red-black tree). The write is acknowledged to the client immediately. No random disk I/O — writes are always sequential, which is why LSM-trees are write-optimized.

When the MemTable reaches a size threshold (typically 64MB), it is flushed to disk as an immutable SSTable. The WAL entries up to that point are discarded. SSTables accumulate on disk across multiple levels.

Read path: check the MemTable first (if the key was written recently, it is here). Then check each level of SSTables from newest to oldest. Before reading an SSTable, consult its Bloom filter — if the Bloom filter returns false, skip the file entirely. If the key might be present, do a binary search within the SSTable (keys are sorted, so this is O(log n)).

Compaction runs in the background, merging SSTables and removing overwritten or deleted keys. Without compaction, read performance degrades as the number of SSTables grows.`,
      },
    ],
    quickFire: [
      { q: `Why are LSM-Tree writes faster than B-tree writes on spinning disks?`, a: `LSM-Tree writes are purely sequential: appending to the WAL and flushing the memtable to SSTable files. B-tree writes involve random seeks to locate and overwrite the correct page on disk. Sequential I/O is 10-100x faster than random I/O on spinning disks.` },
      { q: `What happens when the process crashes with an unflushed memtable?`, a: `On restart, the engine replays the write-ahead log from the last successful memtable flush checkpoint, rebuilding the in-memory state that existed at crash time. The WAL must have been flushed to disk before acknowledging writes; otherwise those writes are lost.` },
      { q: `Name four production systems that use LSM-Trees as their storage engine.`, a: `Cassandra (size-tiered or leveled compaction), RocksDB (leveled, used inside TiKV, MyRocks, PebbleDB), HBase (size-tiered), and ScyllaDB (leveled). Lucene uses a similar log-structured approach for its inverted index segments.` },
      { q: `What is a tombstone in an LSM-Tree?`, a: `A special marker written when a key is deleted. Because SSTables are immutable, you cannot remove a key in place. The tombstone propagates through compaction levels until it merges with and removes the original key entry, after which the tombstone itself is discarded.` },
      { q: `What problem does a Bloom filter solve in an LSM-Tree read path?`, a: `It eliminates unnecessary disk reads for keys that do not exist in a given SSTable. The filter answers 'definitely absent' with zero false negatives, allowing the engine to skip SSTable disk reads for missing keys without any false misses.` },
      { q: `What is read amplification in an LSM-Tree?`, a: `The number of disk reads required to satisfy a single logical read. In an LSM-Tree without Bloom filters, a read must check every SSTable from newest to oldest. With Bloom filters and leveled compaction, read amplification is roughly equal to the number of levels (6-7 for a typical LevelDB/RocksDB configuration).` },
      { q: `Why does leveled compaction have higher write amplification than size-tiered?`, a: `In leveled compaction, a key is rewritten each time it is moved from level L to L+1 during compaction, potentially traversing 6 or more levels before reaching the deepest level. Each rewrite is counted in write amplification. Size-tiered merges fewer times but produces larger, overlapping SSTables.` },
      { q: `What data structure is the memtable typically implemented as, and why?`, a: `A red-black tree (self-balancing BST) or a skip list. Both maintain sorted key order with O(log n) inserts and provide in-order iteration when flushing to a sorted SSTable. RocksDB uses a skip list by default; alternatives like MemTable in Cassandra use a ConcurrentSkipListMap in Java.` },
    ],
  },

  {
    id: 'ddia-b-trees',
    title: 'B-Trees and Write-Ahead Logs',
    icon: 'gitBranch',
    color: '#0ea5e9',
    questions: 5,
    description: 'How B-tree indexes work, the WAL for crash recovery, and why B-trees are read-optimized.',
    visualizations: [{ title: 'B-Tree Structure and Trade-offs', description: '', image: '/diagrams/ddia/b-trees-01.png' }],
    introduction: `B-trees are the dominant storage structure in relational databases — PostgreSQL, MySQL InnoDB, Oracle, SQL Server all use B-trees as their primary index structure. They are optimized for reads and random access.

A B-tree breaks the database into fixed-size pages (typically 4KB or 8KB, matching the OS page size). Each page has up to n keys and n+1 child page references. Pages form a tree; the root page is always in a known location. To look up a key, traverse from root to leaf — typically 3-4 levels for a database with billions of rows.

Writes update pages in place. This is fundamentally different from LSM-trees, which always append. In-place writes require a write-ahead log (WAL) for crash recovery: before modifying a page, write the intended change to the WAL. If the database crashes mid-write, the WAL can be replayed to restore consistency.

B-trees have lower write amplification than LSM-trees (one write per page update vs repeated compaction in LSM) but higher space amplification (pages are never reused within the tree; fragmentation accumulates). B-tree reads are faster for random key lookups; LSM-tree writes are faster for sequential write workloads.`,
    whenToUse: [
      'Explaining why PostgreSQL uses B-trees for indexes',
      'Comparing B-tree vs LSM-tree for read vs write workloads',
      'Discussing crash recovery and the role of WAL in relational databases',
    ],
    keyConcepts: [
      { term: 'B-tree page', definition: 'Fixed-size block (typically 4-8KB) containing sorted keys and child page pointers. The fundamental unit of B-tree storage.' },
      { term: 'Branching factor', definition: 'The maximum number of child page references per B-tree node. Higher branching factor means fewer levels and fewer page reads per lookup.' },
      { term: 'In-place update', definition: 'B-trees overwrite existing page data rather than appending. Requires WAL for crash safety; creates fragmentation over time.' },
      { term: 'WAL (Write-Ahead Log)', definition: 'An append-only log of intended changes, written before the actual page modification. Enables crash recovery by replaying changes.' },
      { term: 'Read amplification', definition: 'The number of disk reads required to satisfy one logical read. B-trees have low read amplification (3-4 page reads for any key); LSM-trees can have higher read amplification without Bloom filters.' },
    ],
    pitfalls: [
      'Confusing WAL in B-tree context (crash recovery log) with WAL in LSM-tree context (MemTable durability log) — both are WALs but serve the same purpose.',
      'Assuming B-trees have no write amplification — updating a page and writing a WAL entry is still 2 writes per logical write.',
      'Forgetting that B-tree page splits require writing multiple pages — a cascade of splits propagates up the tree.',
    ],
    keyQuestions: [
      {
        question: 'How does a B-tree handle a crash during a write?',
        answer: `B-trees use a write-ahead log (WAL) — also called a redo log in MySQL or transaction log in SQL Server — to protect against crashes.

Before modifying any B-tree page, the database writes the intended change to the WAL sequentially on disk. The WAL write is cheap (sequential I/O). Only after the WAL write is durable (fsync) does the database modify the actual B-tree page in the buffer pool.

If a crash occurs before the page is flushed: the WAL contains the complete intended change. On restart, the database replays the WAL from the last checkpoint and reapplies any changes that were written to the WAL but not yet reflected in the actual pages.

If a crash occurs after the WAL write and after the page modification but before a checkpoint: the WAL replay reapplies the change idempotently (it was already applied, but the replay is safe because the operations are idempotent).

This is why WAL writes must be synchronous (fsync) while page writes can be asynchronous — the WAL is the source of truth for recovery.`,
      },
    ],
    quickFire: [
      { q: `Why is the B-tree branching factor typically around 500?`, a: `A 4KB page holds roughly 500 entries of typical key size (8 bytes) plus child pointers (8 bytes each). Higher branching factor reduces tree height. A branching factor of 500 gives a 4-level tree that can index hundreds of terabytes.` },
      { q: `What does the B+ tree's leaf page doubly-linked list enable?`, a: `Efficient range scans: after finding the first matching leaf page via the tree traversal, the engine follows forward pointers through adjacent leaf pages to retrieve all keys in the range without returning to internal pages.` },
      { q: `What is the purpose of abbreviated keys in B+ tree internal pages?`, a: `Internal pages only need enough of each key to route between children, not the full key value. Storing abbreviated separator keys allows more entries per internal page, increasing the branching factor and reducing tree height.` },
      { q: `How does LMDB achieve crash safety without a write-ahead log?`, a: `LMDB uses copy-on-write: modifying a page creates a new copy of that page and all its ancestors up to the root. The root pointer is updated atomically at the end. Old pages are kept for readers using MVCC and reclaimed when no transaction holds them. The atomic root update ensures the tree is always in a valid state.` },
      { q: `What is the typical tree depth for a B-tree in a large production database?`, a: `3-4 levels. With a branching factor of 500, a 4-level tree can address 500^4 pages (about 250 TB at 4KB per page). Almost no practical database exceeds 4 levels.` },
      { q: `Why do B-trees have lower read amplification than LSM-Trees for point lookups?`, a: `A key exists in exactly one location in a B-tree: one leaf page. A point lookup requires exactly one I/O per tree level (3-4 total). In an LSM-Tree, a key might exist in any SSTable across multiple levels; without Bloom filters, every SSTable must be checked.` },
      { q: `What is a B-tree fill factor and why does PostgreSQL default to 90%?`, a: `The fill factor controls what percentage of a page must be full before it is considered full for insert purposes. At 90%, PostgreSQL leaves 10% headroom in leaf pages for future inserts, reducing the frequency of splits. For append-only tables (like time-series), a fill factor of 100% wastes no space since keys are never inserted into the middle of the range.` },
    ],
  },

  {
    id: 'ddia-indexes',
    title: 'Secondary Indexes and Index Trade-offs',
    icon: 'search',
    color: '#0ea5e9',
    questions: 4,
    description: 'Hash indexes, B-tree secondary indexes, multi-column indexes, and the read vs write trade-off of every index.',
    visualizations: [{ title: 'Index Types: Heap, Clustered, Covering', description: '', image: '/diagrams/ddia/indexes-01.png' }],
    introduction: `An index is a derived data structure that speeds up reads at the cost of write overhead. Every index adds a write to every INSERT, UPDATE, and DELETE. Too many indexes slow writes; too few slow reads.

Hash indexes: a hash map from key to disk offset. O(1) point lookups, but cannot support range queries. Bitcask (Riak's storage engine) uses this model — all keys must fit in RAM. Good for high-throughput key-value workloads with infrequent key set changes.

B-tree secondary indexes: support point lookups AND range queries. They store the indexed columns and a pointer to the full row (heap file reference in PostgreSQL; primary key in InnoDB). Covering indexes (index-only scans) store enough columns in the index itself to answer a query without the heap lookup.

Multi-column (composite) indexes: indexed on (first_name, last_name). Efficient for queries filtering on first_name or on (first_name, last_name). Not useful for queries filtering on last_name alone (the index is sorted by first_name first). Column order in a composite index matters.

Full-text search indexes (inverted indexes): map from each word to the list of documents containing it. The core data structure behind Elasticsearch, Lucene, and PostgreSQL's tsvector type.`,
    whenToUse: [
      'Choosing which indexes to add to a database schema in a design interview',
      'Explaining why an index cannot be used for a query (column order in composite index)',
      'Discussing the write amplification cost of indexes',
    ],
    keyConcepts: [
      { term: 'Hash index', definition: 'In-memory hash map from key to disk offset. O(1) lookups, but no range queries and keys must fit in RAM.' },
      { term: 'Covering index', definition: 'An index that includes all columns needed to answer a query, avoiding the heap lookup. Also called an index-only scan.' },
      { term: 'Composite index', definition: 'An index on multiple columns in order. Useful for queries filtering on a left-prefix of the indexed columns.' },
      { term: 'Inverted index', definition: 'Maps from each term (word) to the list of documents or rows containing it. The foundation of full-text search engines.' },
      { term: 'Index write amplification', definition: 'Every index adds an extra write on INSERT/UPDATE/DELETE. A table with 5 indexes multiplies writes by up to 6x.' },
    ],
    pitfalls: [
      'Adding indexes to every column — each index is a write-time cost. Only index columns that appear in frequent WHERE or JOIN clauses.',
      'Using a composite index (a, b) and expecting it to support queries filtering only on b.',
      'Forgetting that full-text search requires a separate inverted index (tsvector in PostgreSQL or Elasticsearch) — LIKE queries cannot use a B-tree index effectively.',
    ],
    keyQuestions: [
      {
        question: 'What indexes would you add to speed up a query filtering on (user_id, created_at) with an ORDER BY created_at?',
        answer: `I would add a composite index on (user_id, created_at). Here is why the order matters.

The query filters on user_id first (equality) and then filters and sorts on created_at. The composite index (user_id, created_at) allows the database to: (1) seek to the first entry for the given user_id (O(log n) B-tree traversal), (2) scan forward in sorted created_at order within that user's rows, stopping when the created_at range is exhausted.

This turns the query into a range scan within the index — the database never touches the heap for filtered-out rows if it is a covering index. If the SELECT also needs other columns (like message_body), the database does a heap lookup only for the rows that pass both filters.

If I instead created the index as (created_at, user_id), the database would have to scan all rows within the created_at range across all users, then filter for the specific user_id — far less selective and more expensive.`,
      },
    ],
    quickFire: [
      { q: `What does a secondary index value store, compared to a primary index?`, a: `A list of row identifiers (since multiple rows can share the same secondary key value), whereas a primary index maps each key to exactly one row.` },
      { q: `In MySQL InnoDB, what is stored at the leaf of a secondary index?`, a: `The primary key value of the matching row, not a heap pointer. To read the full row, InnoDB then looks up the primary (clustered) index using that primary key.` },
      { q: `Can a composite index on (last_name, first_name) speed up WHERE first_name = 'Alice'?`, a: `No. The index is sorted by last_name first; first_name values are interleaved across all last-name groups, so there is no contiguous range to scan for a given first_name.` },
      { q: `Is Redis data lost if the process restarts?`, a: `Not necessarily. Redis supports RDB snapshots and AOF (append-only file) persistence. With AOF fsync-every-second, you lose at most one second of writes on crash.` },
      { q: `What is a full-text index, and how does Lucene support fuzzy matching?`, a: `A full-text index enables linguistic and approximate search over text fields. Lucene decomposes terms into trigrams and uses finite automata to find matches within a configured edit distance.` },
      { q: `When might a PostgreSQL query planner choose a sequential scan over an available secondary index?`, a: `When the query returns a large fraction of rows spread across many heap pages, making random heap fetches costlier than reading the table sequentially. The planner uses column statistics to estimate this threshold.` },
      { q: `What is the main storage advantage of in-memory databases beyond avoiding disk I/O?`, a: `They avoid the overhead of encoding data into disk-page formats. In-memory structures (hash tables, skip lists) are accessed directly without parsing page headers, slot arrays, or null bitmaps.` },
    ],
  },

  {
    id: 'ddia-olap-vs-oltp',
    title: 'OLTP vs OLAP',
    icon: 'barChart',
    color: '#0ea5e9',
    questions: 4,
    description: 'Online transaction processing vs online analytical processing — different access patterns, different storage strategies.',
    visualizations: [{ title: 'OLTP vs OLAP Star Schema', description: '', image: '/diagrams/ddia/olap-vs-oltp-01.png' }],
    introduction: `OLTP (Online Transaction Processing) systems handle user-facing, low-latency reads and writes. Access pattern: small number of rows per query, often by primary key. Examples: PostgreSQL backing an e-commerce site, MySQL storing user profiles.

OLAP (Online Analytical Processing) systems handle analytical queries that aggregate across large portions of the dataset. Access pattern: scan millions or billions of rows, compute aggregates (SUM, COUNT, AVG) across date ranges or segments. Examples: Redshift, BigQuery, Snowflake backing a business intelligence dashboard.

Key insight: the same database should not serve both workloads. OLTP queries want random I/O access to small sets of rows; OLAP queries want sequential scans across many rows. These require fundamentally different storage layouts.

Data warehouses (Redshift, BigQuery, Snowflake) solve this by extracting data from OLTP systems (via ETL — Extract, Transform, Load) and storing it in a format optimized for analytical queries. The data warehouse can run heavy queries without affecting the OLTP system's availability.

Star schema / snowflake schema: data warehouse tables are organized with a central fact table (events: sales, clicks, page views) surrounded by dimension tables (time, user, product, geography). Analytical queries join fact and dimension tables and aggregate across the fact table.`,
    whenToUse: [
      'Designing a data warehouse or analytics system in an interview',
      'Explaining why you would not run reporting queries on a production OLTP database',
      'Discussing ETL pipelines from operational databases to analytics',
    ],
    keyConcepts: [
      { term: 'OLTP', definition: 'Online transaction processing — small, fast reads and writes, row-oriented, user-facing. Optimized for random access.' },
      { term: 'OLAP', definition: 'Online analytical processing — large aggregation queries over many rows, column-oriented, analytics-facing. Optimized for sequential scans.' },
      { term: 'ETL', definition: 'Extract, Transform, Load — the pipeline that copies data from OLTP systems into a data warehouse in a query-optimized format.' },
      { term: 'Star schema', definition: 'Data warehouse schema with a central fact table (events) surrounded by dimension tables (time, user, product). Optimized for aggregation queries.' },
      { term: 'Data warehouse', definition: 'A separate analytical database that stores historical data from OLTP systems. Examples: Redshift, BigQuery, Snowflake.' },
    ],
    pitfalls: [
      'Running analytical reports directly on the production OLTP database — aggregation queries scan millions of rows and starve OLTP queries of I/O.',
      'Designing a data warehouse with a normalized relational schema instead of a star/snowflake schema — joins across many normalized tables kill analytical query performance.',
    ],
    keyQuestions: [
      {
        question: 'Why is column-oriented storage better for OLAP than row-oriented?',
        answer: `Row-oriented storage stores all columns of one row together on disk. Reading the value of one column for 1 million rows requires reading all columns of all 1 million rows from disk, then discarding the unneeded columns.

Column-oriented storage stores each column in its own file or segment. A query reading just three columns out of 100 reads only 3% of the data. For analytical queries that aggregate one or two columns across billions of rows (SUM(revenue), AVG(latency)), this is a 97% I/O reduction.

Column storage also compresses extremely well. A "country" column with values like "US", "GB", "DE" is highly repetitive — run-length encoding can compress millions of values to a few hundred bytes. Dictionaries encode repeated strings as small integers. This further reduces I/O.

Finally, CPU vectorization: operating on a single column laid out contiguously in memory allows SIMD (Single Instruction Multiple Data) CPU instructions to process 4, 8, or 16 values per clock cycle instead of 1. This is why columnar databases like BigQuery and DuckDB can aggregate billions of rows in seconds on modest hardware.`,
      },
    ],
    quickFire: [
      { q: `How many rows does a typical OLTP query touch vs an OLAP query?`, a: `OLTP: a handful of rows (often one) per transaction. OLAP: millions to billions of rows per aggregation query.` },
      { q: `What is the latency expectation difference between OLTP and OLAP?`, a: `OLTP targets sub-100ms for user-facing operations. OLAP accepts seconds to minutes for complex aggregations over historical data.` },
      { q: `What is the role of the fact table in a star schema?`, a: `It records each event (sale, click, order line) as one row, storing numeric measures and foreign keys to dimension tables. It is the largest table in the schema by row count.` },
      { q: `Why is dim_date a separate dimension table rather than just a date column in the fact table?`, a: `A dimension table allows queries to filter and group by derived attributes (day of week, quarter, fiscal year, holiday flag) without computing them at query time for every row scanned.` },
      { q: `What is Snowflake's pricing model, and how does it differ from a traditional data warehouse like Teradata?`, a: `Snowflake charges by compute-second (virtual warehouse credits) and separates storage cost. Teradata and on-premise warehouses require upfront hardware investment regardless of actual query volume.` },
      { q: `Can you run analytics on a PostgreSQL read replica instead of a warehouse?`, a: `You can, but long-running analytics queries will slow replication (the replica cannot apply WAL while processing a query), evict hot pages from the buffer pool, and degrade performance for all other replica readers.` },
      { q: `What does the 'L' in ETL mean in practice for a data warehouse pipeline?`, a: `Loading transformed data into the warehouse, typically via bulk COPY or INSERT operations that bypass row-by-row overhead and leverage the warehouse's columnar storage format.` },
    ],
  },

  {
    id: 'ddia-column-oriented-storage',
    title: 'Column-Oriented Storage and Compression',
    icon: 'columns',
    color: '#0ea5e9',
    questions: 4,
    description: 'How column stores achieve I/O reduction, compression strategies (RLE, bitmap encoding, dictionary), and vectorized execution.',
    visualizations: [{ title: 'Row vs Column Storage Layout', description: '', image: '/diagrams/ddia/column-storage-01.png' }],
    introduction: `Column-oriented storage (Parquet, ORC, Redshift, BigQuery internal format, DuckDB) stores each column separately. An analytical query reading three columns out of fifty reads only 6% of the raw data.

Compression works by encoding repeated values. Run-length encoding (RLE) collapses consecutive repeated values into (value, count) pairs: the "country" column with 50,000 consecutive "US" values stores as ("US", 50000). Bitmap indexes represent each distinct value as a bitmap — for a "status" column with values IN_PROGRESS, DONE, FAILED, three bitmaps encode which rows have each value. Bitwise AND/OR operations across bitmaps are extremely fast.

Dictionary encoding: replace each distinct string with an integer ID. Store the dictionary separately. Reduces storage for low-cardinality columns (gender, country, status) by 4-10x.

Sort order matters: if rows are sorted by date and partitioned by date, a query filtering on date range reads only the relevant partition. Redshift's sort keys and BigQuery's clustering columns exploit this.

Vectorized execution: columnar data in memory enables SIMD CPU instructions. Modern CPUs process 256 or 512 bits per instruction — 4-8 float64 values, 16-32 int16 values. DuckDB and Velox use this for order-of-magnitude speedups on aggregation queries.`,
    whenToUse: [
      'Explaining why Parquet is the preferred format for data lake storage',
      'Discussing BigQuery or Redshift internals in an analytics system design',
      'Justifying compression strategies for a time-series or analytics database',
    ],
    keyConcepts: [
      { term: 'Run-length encoding (RLE)', definition: 'Compresses consecutive repeated values into (value, count) pairs. Extremely effective for sorted low-cardinality columns.' },
      { term: 'Bitmap index', definition: 'Encodes each distinct value as a bit vector over all rows. Fast for low-cardinality columns; bitwise AND/OR answers multi-condition queries efficiently.' },
      { term: 'Dictionary encoding', definition: 'Maps distinct string values to integer IDs. Reduces storage for low-cardinality string columns by 4-10x.' },
      { term: 'Vectorized execution', definition: 'Processing multiple column values per CPU instruction using SIMD. Enables order-of-magnitude speedups on aggregation-heavy queries.' },
      { term: 'Parquet', definition: 'Open-source columnar file format used in Hadoop, Spark, BigQuery, and Athena. Stores row groups with per-column encoding and compression.' },
    ],
    pitfalls: [
      'Using Parquet for high-frequency small writes — columnar formats are immutable and require full file rewrites; they are read-optimized, not write-optimized.',
      'Choosing row-oriented format (JSON, CSV) for data lake storage — scanning large CSV files in S3 reads all columns even when only two are needed.',
    ],
    keyQuestions: [
      {
        question: 'Why is Parquet preferred over CSV for data lake storage in S3?',
        answer: `Three reasons: I/O efficiency, compression, and schema encoding.

I/O: CSV stores all columns for every row together. Athena or Spark reading two columns from a 100-column CSV reads 100 columns worth of data, then discards 98. Parquet stores each column in a separate column chunk within row groups. Reading two columns reads only those two column chunks — 98% less I/O.

Compression: Parquet applies per-column compression (Snappy, ZSTD, GZIP). Because each column chunk contains values of the same type with similar distribution, compression ratios of 5-20x are common. CSV compresses poorly because column types and distributions are mixed per row.

Schema: Parquet stores the schema in the file footer. Readers do not need a separate schema definition; types and nullability are embedded. CSV has no native type system — all values are strings; the reader must infer or be told types.

Cost impact: on Athena (priced per byte scanned), switching from CSV to Parquet typically reduces query cost by 60-80% and query time by 50-70%.`,
      },
    ],
    quickFire: [
      { q: `What is the core I/O advantage of column-oriented storage for analytical queries?`, a: `The query engine reads only the column files it needs, skipping all other columns. A query over 3 of 100 columns reads approximately 3% of the data a row-oriented engine would read.` },
      { q: `What type of column compresses best with run-length encoding?`, a: `Low-cardinality columns that are sorted by that column's values -- long runs of the same value encode to a single (value, count) pair.` },
      { q: `What is Parquet?`, a: `An open-source columnar file format used in Hadoop and cloud data lake ecosystems. It stores data in column chunks within row groups and supports per-column compression with Snappy, Gzip, or Zstandard.` },
      { q: `What does SIMD mean, and why does columnar storage enable it?`, a: `Single Instruction Multiple Data -- one CPU instruction applied to multiple values simultaneously (e.g., 8 int32s in AVX2). Columnar storage places homogeneous typed values in contiguous memory, making tight SIMD loops possible.` },
      { q: `Why are OLAP cubes (materialized aggregates) limited?`, a: `They precompute only specific dimension combinations. Ad-hoc queries over dimension combinations not in the cube still require full column scans.` },
      { q: `What is C-Store's contribution to columnar database design?`, a: `C-Store (the research prototype that became Vertica) introduced the idea of storing multiple sorted copies of the data (projections), each sorted by a different column, to optimize compression and query performance for different query patterns.` },
      { q: `Does column-oriented storage help point lookups (fetch row by primary key)?`, a: `No. Point lookups require assembling one row from multiple column files, which is slower than fetching one row from a row-oriented page. Columnar storage is optimized for analytical scans, not point access.` },
      { q: `What is Apache Arrow?`, a: `An in-memory columnar data format standard that allows zero-copy data sharing between different systems (Spark, DuckDB, Pandas, Parquet readers) without serialization. It is the in-memory counterpart to Parquet's on-disk format.` },
    ],
  },

  // ── ENCODING ─────────────────────────────────────────────────────────────────

  {
    id: 'ddia-encoding-formats',
    title: 'Encoding Formats: JSON, Protobuf, Avro, Thrift',
    icon: 'code',
    color: '#14b8a6',
    questions: 4,
    description: 'Trade-offs between human-readable (JSON, XML) and binary (Protobuf, Avro, Thrift, MessagePack) encoding formats.',
    visualizations: [{ title: 'Encoding Format Comparison', description: '', image: '/diagrams/ddia/encoding-formats-01.png' }],
    introduction: `Encoding (serialization) formats determine how in-memory data structures are converted to bytes for storage or network transmission.

Text formats (JSON, XML, CSV): human-readable, wide tooling support. Weaknesses: no binary type (JSON encodes numbers as text, losing precision for large integers), verbose (field names repeated in every record), no schema enforcement.

Binary formats: more compact, faster to parse, schema-enforced. Major options:

Protobuf (Protocol Buffers, Google): schema defined in .proto files. Fields identified by integer tags, not names — compact and enables field renaming without breaking compatibility. Generated code in 10+ languages. Default in gRPC.

Thrift (Facebook): similar to Protobuf. Two binary formats: BinaryProtocol (simple, larger) and CompactProtocol (varint encoding, smaller). Comes with a service definition framework.

Avro (Apache, Hadoop ecosystem): no field tags in the wire format — relies on the writer schema. Reader must have the writer schema (or a compatible version) to decode. Excellent for Kafka where schema is stored in a Schema Registry. Avro schemas are themselves JSON.

MessagePack: compact binary JSON. No schema required. Smaller than JSON, fast to parse, but still requires field names in the encoded data.`,
    whenToUse: [
      'Choosing a serialization format for an internal RPC service',
      'Explaining why Kafka uses Avro with a Schema Registry',
      'Discussing the trade-offs between JSON and Protobuf for API design',
    ],
    keyConcepts: [
      { term: 'Protobuf field tags', definition: 'Integer IDs assigned to fields in .proto schema. The wire format uses tags instead of field names, making encoding compact and tolerant of field renaming.' },
      { term: 'Avro writer/reader schema', definition: 'Avro encodes data using the writer schema; the reader decodes using the reader schema. Schema evolution is handled by comparing the two schemas at read time.' },
      { term: 'Schema Registry', definition: 'A central store for Avro (or Protobuf) schemas. Kafka producers write the schema ID into the message; consumers fetch the schema to decode. Used by Confluent Schema Registry.' },
      { term: 'Varint encoding', definition: 'Variable-length integer encoding used in Protobuf and Thrift CompactProtocol. Small integers use fewer bytes (1-2 bytes); large integers use more. Efficient for typical value distributions.' },
    ],
    pitfalls: [
      'Using JSON for high-throughput internal services — JSON parsing is 5-10x slower than Protobuf for the same data.',
      'Removing a Protobuf field without marking it reserved — a new field added with the same tag number causes decoding errors in old clients.',
      'Using Avro without a Schema Registry in a Kafka pipeline — consumers cannot decode messages without the writer schema.',
    ],
    keyQuestions: [
      {
        question: 'Why would you choose Protobuf over JSON for an internal microservice API?',
        answer: `Three reasons: performance, schema enforcement, and backward compatibility.

Performance: Protobuf encodes field names as integer tags (1-3 bytes) rather than strings. A JSON field "user_id": 12345 uses 18 bytes; Protobuf encodes it in 3-5 bytes. Protobuf parsing is 3-10x faster than JSON parsing in benchmarks. For high-RPS internal services (thousands of calls per second), this matters.

Schema enforcement: .proto files define field types and optionality. The generated code enforces the schema at compile time, not at runtime. JSON accepts any structure; Protobuf rejects messages that do not match the schema.

Backward compatibility: Protobuf is designed for schema evolution. New optional fields can be added with new tag numbers; old clients ignore unknown tags. Old clients can send old messages; new servers fill in default values for missing fields. This makes it safe to deploy services independently.

I would not choose Protobuf for external APIs where humans need to read and debug the wire format, or for services that need to be called from browsers without generated client libraries.`,
      },
    ],
    quickFire: [
      { q: `Why can JSON lose precision for large integers?`, a: `JSON's number type is parsed by JavaScript as IEEE 754 double-precision float, which can represent integers exactly only up to 2^53. Integers larger than this (e.g., 64-bit database IDs) are silently rounded.` },
      { q: `What is a field tag in Protobuf, and why must it never change?`, a: `A numeric identifier (e.g., field 1, field 2) used in the binary encoding instead of the field name. Changing it breaks all existing encoded messages because the decoder uses the tag to identify the field.` },
      { q: `How does Avro encode a record with three fields?`, a: `It writes the three values in schema-defined order with no field names, tags, or type markers between them. The decoder must have the writer's schema to know the order and types.` },
      { q: `What is MessagePack?`, a: `A binary encoding of JSON that replaces verbose ASCII field names with compact type-prefixed values. It reduces JSON size slightly but does not eliminate field names, so it is less compact than Protobuf or Avro.` },
      { q: `What is the Confluent Schema Registry used for?`, a: `Storing versioned Avro, Protobuf, or JSON schemas. Kafka message producers register a schema and embed a 4-byte schema ID in each message; consumers fetch the schema from the registry to decode.` },
      { q: `How does gRPC relate to Protocol Buffers?`, a: `gRPC is an RPC framework that uses Protobuf as its serialization format and HTTP/2 as its transport layer. Service methods are defined in .proto files, and protoc generates client and server stubs in multiple languages.` },
      { q: `Which encoding format should you choose for a Kafka pipeline where producers and consumers are written in different languages and schemas will evolve?`, a: `Apache Avro with the Confluent Schema Registry. It supports multi-language codecs, enforces schema evolution compatibility rules, and adds only 5 bytes of overhead per message for the schema ID.` },
    ],
  },

  {
    id: 'ddia-schema-evolution',
    title: 'Schema Evolution and Backward/Forward Compatibility',
    icon: 'refreshCw',
    color: '#14b8a6',
    questions: 4,
    description: 'How to change schemas without breaking producers and consumers — backward compatibility, forward compatibility, and full compatibility.',
    visualizations: [{ title: 'Forward vs Backward Compatibility', description: '', image: '/diagrams/ddia/schema-evolution-01.png' }],
    introduction: `Schema evolution is the ability to change a data format without breaking existing producers or consumers. Critical in distributed systems where services are deployed independently.

Backward compatibility: new code can read data written by old code. A new consumer can process old messages. Achieved by: adding optional fields with defaults, never removing required fields.

Forward compatibility: old code can read data written by new code. An old consumer can process new messages. Achieved by: old code ignores unknown fields (JSON and Protobuf both do this by default).

Full compatibility: backward AND forward compatible. Strictest requirement for long-running pipelines where producers and consumers may be at different versions simultaneously.

Kafka's Schema Registry enforces compatibility rules: BACKWARD (default), FORWARD, FULL, or NONE. When a schema is registered, the registry checks it against the previous version and rejects incompatible changes.

Protobuf rules: safe changes include adding optional fields with new tags, renaming fields (tags are used in the wire format, not names). Unsafe: removing a field without marking it reserved (the tag may be reused), changing a field's type incompatibly.`,
    whenToUse: [
      'Designing a Kafka pipeline where producers and consumers deploy independently',
      'Explaining how to safely evolve a Protobuf schema in production',
      'Discussing API versioning for backward compatibility',
    ],
    keyConcepts: [
      { term: 'Backward compatibility', definition: 'New code reads data written by old code. Required for rolling deployments where consumers upgrade before producers.' },
      { term: 'Forward compatibility', definition: 'Old code reads data written by new code. Required when producers are upgraded before consumers.' },
      { term: 'Reserved field', definition: 'A Protobuf mechanism to retire a field tag, preventing it from being reused and causing decode errors in old clients.' },
      { term: 'Compatibility mode', definition: 'Schema Registry setting controlling which schema changes are allowed: BACKWARD, FORWARD, FULL, or NONE.' },
    ],
    pitfalls: [
      'Making a Protobuf field required — required fields can never be removed without breaking all readers, making them a compatibility trap.',
      'Reusing a retired Protobuf field tag number — old clients interpret the new field as the old type, causing decode errors or silent data corruption.',
    ],
    keyQuestions: [
      {
        question: 'You need to rename a Protobuf field. How do you do it safely?',
        answer: `Rename the field name in the .proto file, but keep the same field number (tag). The Protobuf wire format uses the integer tag, not the name, to identify fields. Old code that references the field by name will break at compile time, but the wire format is unchanged, so there is no compatibility issue at runtime.

The process: (1) rename the field in the .proto file, keeping the same tag number, (2) update all generated code that references the old name, (3) deploy. No staged rollout needed — the rename is transparent on the wire.

If you also need to change the field type (e.g., from int32 to int64), that requires more care. Adding a new field with a new tag number and the new type, then migrating code to write the new field and read from either field during a transition period, is the safe approach. After all producers are writing the new field and all consumers read only the new field, the old field can be deprecated and marked reserved.`,
      },
    ],
    quickFire: [
      { q: `Can you add an optional field to a Protobuf schema without breaking existing consumers?`, a: `Yes. Existing consumers encounter the new tag, use the wire type to skip it, and decode the rest of the message normally. This is forward compatible.` },
      { q: `Can you rename a field in Avro without breaking existing consumers?`, a: `No. Avro matches fields by name during schema resolution. Renaming breaks the match; the reader will not find the field and will use the default value instead. Use Avro aliases if renaming is required.` },
      { q: `What happens if you reuse a deleted Protobuf field tag for a new field?`, a: `Old messages that contained the deleted field will have their bytes interpreted as the new field, producing incorrect values. Always mark deleted tags as 'reserved' to prevent reuse.` },
      { q: `What is the Confluent Schema Registry's BACKWARD compatibility mode?`, a: `New schemas registered under BACKWARD mode must be readable by the latest deployed consumer -- new schemas can read data written by any previous schema version. Enforced at schema registration time.` },
      { q: `Why is changing a Protobuf field from optional to required a breaking change?`, a: `Old data that omits the field will fail required-field validation when decoded by new code that marks it required. Proto3 removes required fields entirely to avoid this class of bug.` },
      { q: `What is the safe order for adding a NOT NULL column to a large production database table?`, a: `First add it as nullable with a default (no table rewrite needed on modern databases), then backfill existing rows, then add the NOT NULL constraint. Never add NOT NULL without a default in one step.` },
      { q: `How long must you maintain forward compatibility for a public REST API?`, a: `Until you know all clients have migrated away from old versions -- which for public APIs may be years. APIs should ignore unknown fields in requests and always return known fields in responses, never removing them without a versioned deprecation cycle.` },
    ],
  },

  {
    id: 'ddia-dataflow-modes',
    title: 'Modes of Dataflow: Databases, Services, Messages',
    icon: 'arrowRight',
    color: '#14b8a6',
    questions: 3,
    description: 'Three ways services communicate data — via databases, via REST/RPC, and via asynchronous message queues.',
    visualizations: [{ title: 'Three Modes of Dataflow', description: '', image: '/diagrams/ddia/dataflow-modes-01.png' }],
    introduction: `Kleppmann identifies three primary modes of dataflow between processes:

1. Via databases: one process writes, another reads. The database is the integration point. The challenge is schema compatibility — if multiple services share a database, schema changes must be coordinated. Also, if old code reads a record updated by new code, it must handle unknown fields gracefully.

2. Via services (REST, RPC): synchronous request/response. The client calls the server and waits. REST uses HTTP verbs and JSON; RPC (gRPC, Thrift) uses binary protocols with generated stubs. Challenges: services must be available, latency adds up in chains, and strong coupling between client and server schemas.

3. Via message-passing (Kafka, RabbitMQ, SQS): asynchronous. The sender publishes a message; the receiver consumes it independently. Decouples producers and consumers in time and availability. Enables fan-out (one message consumed by multiple subscribers). Challenges: ordering, exactly-once delivery, and schema evolution across producer/consumer deployments.

The choice of dataflow mode has architectural implications: synchronous services create tight coupling; databases create schema coupling; message queues decouple availability and schema but add operational complexity.`,
    whenToUse: [
      'Choosing between REST, gRPC, and Kafka for service communication in a design',
      'Explaining the trade-offs of synchronous vs asynchronous communication',
      'Discussing why shared databases create coupling between services',
    ],
    keyConcepts: [
      { term: 'Synchronous dataflow', definition: 'Caller waits for the response (REST, gRPC). Simple to implement but creates availability and latency coupling between services.' },
      { term: 'Asynchronous dataflow', definition: 'Producer publishes a message; consumer processes it later (Kafka, SQS). Decouples availability but requires handling out-of-order and duplicate delivery.' },
      { term: 'Service coupling', definition: 'When services share a database or must call each other synchronously, changes to one service require coordinated changes in others.' },
    ],
    pitfalls: [
      'Defaulting to synchronous REST for all service communication — asynchronous messaging is more resilient for workflows where the caller does not need an immediate response.',
      'Sharing a database between microservices — it couples their schemas and deployment cycles, defeating the purpose of service separation.',
    ],
    keyQuestions: [
      {
        question: 'When would you use Kafka instead of REST for service-to-service communication?',
        answer: `I choose Kafka when three conditions hold: the operation is not immediately required by the caller (the caller can proceed without waiting for the result), multiple downstream services need to react to the same event, or the downstream service may be temporarily unavailable.

Example: a user places an order. The order service writes to its database and publishes an OrderPlaced event to Kafka. The inventory service, the notifications service, and the fulfillment service each consume the event independently. If the notification service is down for 30 minutes, it catches up from Kafka when it restarts — no orders are lost.

With REST, I would have to call all three services synchronously from the order service. If any one fails, I must handle the error, retry, or implement a distributed transaction. The order service is now coupled to three downstream services' availability.

I use REST when: the caller needs an immediate response (user-facing reads), the operation requires confirmation before proceeding (payment authorization), or the call is idempotent and simple enough that retry logic is sufficient.`,
      },
    ],
    quickFire: [
      { q: `What are the three main modes of dataflow between processes?`, a: `Via databases (write/read), via service calls (REST/RPC), and via async message passing (message brokers).` },
      { q: `What compatibility concern arises when dataflow goes through a database?`, a: `Different processes may run different code versions simultaneously — old code must be able to read data written by new code (forward compatibility) and vice versa.` },
      { q: `What is the key compatibility requirement for REST APIs?`, a: `Clients and servers may be updated independently — servers must maintain backward compatibility for old clients, and new clients must handle older server responses.` },
      { q: `Why is RPC more fragile than database dataflow for schema evolution?`, a: `RPC assumes synchronous request/response, so both ends must be compatible simultaneously — you can't easily have the server ahead of the client like you can with async data.` },
      { q: `What compatibility advantage do message brokers provide?`, a: `The producer and consumer are decoupled in time — the broker buffers messages, so you can evolve them independently as long as messages are forward/backward compatible.` },
      { q: `What does 'backward compatible' mean in the context of encoding?`, a: `New code can read data written by old code — you can add new fields but must handle their absence when reading old records.` },
      { q: `What does 'forward compatible' mean in the context of encoding?`, a: `Old code can read data written by new code — typically achieved by ignoring unknown fields.` },
      { q: `Why is Avro's schema evolution approach notable?`, a: `Avro uses writer's schema and reader's schema separately — the reader resolves fields by name, enabling evolution without field tags.` },
    ],
  },

  // ── REPLICATION ──────────────────────────────────────────────────────────────

  {
    id: 'ddia-single-leader-replication',
    title: 'Single-Leader Replication',
    icon: 'server',
    color: '#f97316',
    questions: 6,
    description: 'How leader-follower replication works, failover procedures, and the trade-offs of synchronous vs asynchronous replication.',
    visualizations: [{ title: 'Single-Leader Replication', description: '', image: '/diagrams/ddia/single-leader-01.png' }],
    introduction: `Single-leader replication (also called master-slave or primary-replica) is the most common replication model. One node is the leader; all writes go to the leader. The leader sends a replication log to followers; followers apply changes in the same order.

Reads can be served from followers (read scaling) or the leader (read-your-writes consistency). Writes always go to the leader (no horizontal write scaling in this model).

Replication can be synchronous or asynchronous. Synchronous: the leader waits for at least one follower to confirm before acknowledging the write. Durable — if the leader fails, a follower has the latest data. Cost: write latency increases; if the follower is slow, the leader blocks. Asynchronous: leader acknowledges immediately and replicates in the background. Low write latency; but if the leader fails before replication completes, acknowledged writes may be lost.

Semi-synchronous: one follower is synchronous; the rest are asynchronous. Balances durability and availability.

Failover: when the leader fails, a follower must be promoted to leader. Steps: (1) detect leader failure (timeout-based), (2) elect a new leader (usually the most up-to-date follower), (3) reconfigure clients to send writes to the new leader. Challenges: split-brain (old leader comes back and both leaders accept writes), data loss (async followers may not have latest data), and wrong failover timing (leader appears down but is actually slow).`,
    whenToUse: [
      'Explaining how PostgreSQL streaming replication works',
      'Discussing failover procedures and their failure modes',
      'Justifying synchronous vs asynchronous replication for durability requirements',
    ],
    keyConcepts: [
      { term: 'Leader', definition: 'The single node that accepts all writes. The authoritative source for the current state of the data.' },
      { term: 'Follower / replica', definition: 'A read-only copy of the leader. Applies replication log entries from the leader in order.' },
      { term: 'Replication log', definition: 'The ordered sequence of changes sent from leader to followers. May be statement-based, WAL-based, or row-based (logical replication).' },
      { term: 'Synchronous replication', definition: 'Leader waits for follower acknowledgment before confirming a write. Durable but adds latency; a slow follower blocks writes.' },
      { term: 'Split-brain', definition: 'Two nodes both believe they are the leader and accept writes independently. Causes data divergence. Prevented by STONITH (Shoot The Other Node In The Head) or quorum-based fencing.' },
      { term: 'Failover', definition: 'The process of promoting a follower to leader when the current leader fails. Risk points: data loss (async replication gap), split-brain, and misconfigured clients.' },
    ],
    pitfalls: [
      'Configuring fully asynchronous replication for a financial system — acknowledged writes can be lost on leader failure.',
      'No fencing mechanism during failover — the old leader may rejoin and cause split-brain.',
      'Reading from followers without understanding replication lag — a freshly written record may not be visible on a follower yet.',
    ],
    keyQuestions: [
      {
        question: 'Walk through the failover process for a PostgreSQL leader-follower setup.',
        answer: `Failover has three phases: detection, promotion, and reconfiguration.

Detection: a health check mechanism (Patroni, pgBouncer, or a custom heartbeat) monitors the primary. After a configurable number of missed heartbeats (typically 10-30 seconds), the primary is declared failed.

Promotion: the monitoring tool (Patroni in most production setups) selects the most up-to-date replica — the one with the highest LSN (Log Sequence Number, indicating how much of the WAL it has applied). That replica is promoted with pg_promote(). It transitions from standby mode to accept writes.

Reconfiguration: (1) the new primary's connection string is updated in the service discovery system (Consul, Route53, pgBouncer config), (2) other replicas are reconfigured to replicate from the new primary using pg_rewind to align their WAL position, (3) the application reconnects to the new primary.

Risk: if the old primary had unacknowledged asynchronous writes that no replica received, those writes are lost. This is why critical financial systems use synchronous_commit = on with at least one synchronous replica. The trade-off is ~1ms added write latency vs potential data loss on failover.`,
      },
    ],
    quickFire: [
      { q: `In single-leader replication, which node accepts write requests?`, a: `Only the leader (primary). Followers are read-only replicas that apply changes from the leader's replication log.` },
      { q: `What is the PostgreSQL term for the position in the write-ahead log, used to track replication progress?`, a: `LSN -- Log Sequence Number. Followers report their current LSN to the leader; the difference between leader LSN and follower LSN is the replication lag in bytes.` },
      { q: `What durability risk is inherent in fully asynchronous replication?`, a: `If the leader fails before the async followers receive its latest WAL entries, those writes are permanently lost -- even though the leader acknowledged them to clients.` },
      { q: `How long does a typical single-leader system wait before detecting a failed leader and starting failover?`, a: `Typically 30 seconds of missed heartbeats, though this is configurable. Shorter timeouts catch real failures faster but increase false positives from temporary load spikes or GC pauses.` },
      { q: `What is a semi-synchronous replication configuration?`, a: `One follower is designated synchronous (leader waits for its ack); all others are asynchronous. Provides one extra durable copy without making the leader dependent on all followers' availability.` },
      { q: `What is split-brain, in one sentence?`, a: `Two nodes both believe they are the leader and simultaneously accept writes, causing permanent data divergence that cannot be automatically reconciled.` },
      { q: `What is STONITH, and why is it used in high-availability database clusters?`, a: `Shoot The Other Node In The Head -- physically power-cycling the old leader via IPMI or a network power switch before promoting a new leader, guaranteeing only one active leader can accept writes.` },
      { q: `Can a follower serve read requests in single-leader replication?`, a: `Yes, followers can serve reads, but the data may be stale by the current replication lag. Applications must route reads that require up-to-date data (such as read-your-own-writes) to the leader.` },
    ],
  },

  {
    id: 'ddia-multi-leader-replication',
    title: 'Multi-Leader Replication',
    icon: 'gitMerge',
    color: '#f97316',
    questions: 4,
    description: 'Multi-datacenter replication, write conflicts, conflict resolution strategies, and use cases.',
    visualizations: [{ title: 'Multi-Leader Conflict and Resolution', description: '', image: '/diagrams/ddia/multi-leader-01.png' }],
    introduction: `Multi-leader replication allows multiple nodes to accept writes. Each leader replicates to the others. This enables writes in multiple datacenters simultaneously, tolerating datacenter-level failures without stopping writes.

Use case: a multinational application where users in Europe write to a European datacenter and users in the US write to a US datacenter. Each datacenter has a local leader; changes replicate asynchronously between leaders.

The fundamental problem: write conflicts. If two users simultaneously update the same record in different datacenters, both leaders accept the write. When the replication arrives, both leaders have conflicting values. The database must resolve the conflict.

Conflict resolution strategies:
- Last Write Wins (LWW): keep the write with the latest timestamp. Simple but loses data — the "losing" write is discarded. Also fragile if clocks are skewed across nodes.
- Merge: combine both values (e.g., for a shopping cart, union the items). Complex and domain-specific.
- Record and resolve: store all conflicting values and surface the conflict to the application or user to resolve manually. Used by CouchDB.
- CRDT (Conflict-free Replicated Data Types): data structures that automatically merge concurrent writes without conflicts. Examples: G-Counter (increment-only counter), OR-Set (add/remove set).

Multi-leader replication is complex and error-prone. Kleppmann recommends avoiding it if possible — single-leader with a global leader is simpler. Multi-leader is justified only when write availability in multiple independent regions is a hard requirement.`,
    whenToUse: [
      'Designing a multi-region active-active database setup',
      'Explaining write conflict resolution in a distributed system design',
      'Discussing CRDTs for collaborative editing (Google Docs-style)',
    ],
    keyConcepts: [
      { term: 'Write conflict', definition: 'Concurrent writes to the same data from different leaders that produce inconsistent values when replication converges.' },
      { term: 'Last Write Wins (LWW)', definition: 'Conflict resolution that keeps the write with the most recent timestamp. Loses data; susceptible to clock skew.' },
      { term: 'CRDT', definition: 'Conflict-free Replicated Data Type — a data structure that can be merged from multiple nodes without conflicts. Used in collaborative editing and distributed counters.' },
      { term: 'Circular replication', definition: 'Multi-leader topology where leaders form a ring. A node failure breaks the ring; requires re-wiring.' },
    ],
    pitfalls: [
      'Using multi-leader replication for data that requires strict consistency — write conflicts guarantee that some writes will be lost or require manual resolution.',
      'Relying on wall clock timestamps for LWW — clocks differ across nodes, causing correct earlier writes to be silently overwritten by stale writes with higher timestamps.',
    ],
    keyQuestions: [
      {
        question: 'How do you handle write conflicts in a multi-leader database?',
        answer: `The strategy depends on the data type and business requirements.

For most user data (profile updates, configuration), Last Write Wins is acceptable if the data is not financial or safety-critical. I ensure all nodes use a synchronized time source (AWS Time Sync, PTP) and include a monotonic logical clock (Lamport timestamp or HLC) alongside the wall clock to resolve ties.

For collaborative documents (shared notes, spreadsheets), I use CRDTs. An OR-Set allows concurrent add and remove operations on a list; a G-Counter allows concurrent increments. CRDTs have a mathematical guarantee of convergence — any order of merge operations produces the same final state.

For financial data, I avoid multi-leader replication entirely. I use single-leader with cross-region replication and route writes to one region's leader. The 50-100ms added latency from cross-region writes is acceptable; data loss from conflict resolution is not.

If I must use multi-leader for financial data, I treat conflicts as errors: record all conflicting writes, prevent the system from proceeding, alert operations, and require a human or compensating transaction to resolve.`,
      },
    ],
    quickFire: [
      { q: `What is the primary motivation for multi-leader replication?`, a: `Enabling low-latency local writes in multiple datacenters. Each datacenter has its own leader, so writes do not need to cross the WAN to reach a single primary.` },
      { q: `What is Cassandra's default conflict resolution strategy?`, a: `Last-write-wins (LWW) using the write timestamp. The write with the highest timestamp is kept; the other is silently discarded, which can cause data loss.` },
      { q: `What is the quorum condition that guarantees a read sees the latest quorum write?`, a: `w + r > n, where w is the write quorum, r is the read quorum, and n is the total number of replicas. This ensures at least one node in any read set has the latest write.` },
      { q: `What is a sloppy quorum and what does it trade away?`, a: `Writing to any w reachable nodes during a partition rather than the designated home replicas. It preserves write availability but breaks the w + r > n freshness guarantee because the written nodes may not overlap with the read quorum.` },
      { q: `How does read repair work in Cassandra?`, a: `When a client reads from multiple replicas and detects that one returned a stale value, the client (or coordinator) writes the latest value back to the stale replica. It is triggered by reads, not a background process.` },
      { q: `Name two CRDT types and what they model.`, a: `G-Counter models a grow-only counter using a per-replica slot vector; PN-Counter models an increment-decrement counter using two G-Counters for positives and negatives.` },
      { q: `What ordering problem affects all-to-all multi-leader topology?`, a: `Writes from different leaders may arrive at a third leader out of causal order due to varying network path latencies. A causally dependent write (B depends on A) can arrive before its predecessor (A), violating causal consistency.` },
      { q: `What is anti-entropy in a leaderless system?`, a: `A background process that continuously compares replicas and copies missing data between them, repairing divergence that read repair misses because the relevant key was never read.` },
    ],
  },

  {
    id: 'ddia-leaderless-replication',
    title: 'Leaderless Replication (Dynamo-Style)',
    icon: 'share2',
    color: '#f97316',
    questions: 5,
    description: 'Quorum reads and writes, vector clocks, read repair, anti-entropy, and the Dynamo paper model used by Cassandra and Riak.',
    visualizations: [{ title: 'Leaderless Quorum (n=3, w=2, r=2)', description: '', image: '/diagrams/ddia/multi-leader-01.png' }],
    introduction: `Leaderless replication (Dynamo-style, used by Cassandra, Riak, Voldemort) removes the single leader constraint. Any replica can accept writes. Consistency is maintained through quorums.

Quorum: with N replicas, a write that reaches W replicas is acknowledged; a read that queries R replicas and returns the most up-to-date value. For strong consistency: W + R > N. Typical: N=3, W=2, R=2 (quorum read and write). Any read will overlap with at least one node that received the latest write.

Why quorums work: if W=2 and R=2 with N=3, at least one node appears in both the write set and read set. The read returns the most recent value from all R responses.

Read repair: when a read detects that one replica returned a stale value (lower version number or vector clock), it sends the latest value back to the stale replica. This is a lazy repair mechanism.

Anti-entropy: a background process compares replica datasets using Merkle trees and transfers missing data. Ensures replicas converge even when they receive no client traffic.

Vector clocks track causality: each write has a vector of (node, counter) pairs. If version A has a lower counter than version B on all nodes, B supersedes A. If A has a higher counter on node 1 and B has a higher counter on node 2, they are concurrent (siblings) and require conflict resolution.

Sloppy quorum: if the preferred N replicas are not available, write to any available node and use hinted handoff to deliver the data to the intended node when it recovers. Increases availability but weakens consistency.`,
    whenToUse: [
      'Explaining how Cassandra handles reads and writes',
      'Discussing quorum consistency levels in Cassandra (ONE, QUORUM, ALL)',
      'Explaining vector clocks and causality in distributed systems',
    ],
    keyConcepts: [
      { term: 'Quorum', definition: 'W + R > N ensures that a read overlaps with at least one node that received the latest write. Provides strong consistency within the quorum configuration.' },
      { term: 'Read repair', definition: 'When a read detects stale data on a replica, it proactively updates the stale replica with the latest version.' },
      { term: 'Anti-entropy', definition: 'Background process that compares replicas using Merkle trees and synchronizes differences. Ensures eventual consistency without client traffic.' },
      { term: 'Vector clock', definition: 'A causality tracking mechanism: a vector of (node, counter) pairs. Allows the system to determine if two writes are causally related or concurrent.' },
      { term: 'Sloppy quorum', definition: 'Writing to substitute nodes when the primary quorum nodes are unavailable. Increases write availability at the cost of potentially reading stale data.' },
      { term: 'Hinted handoff', definition: 'When a substitute node receives a write during a sloppy quorum, it stores a hint and forwards the write to the intended node when it recovers.' },
    ],
    pitfalls: [
      'Assuming W + R > N guarantees linearizability — it does not. Concurrent operations can still violate linearizability in leaderless systems.',
      'Using Cassandra with consistency level ONE for financial data — a single-node read may return stale data.',
      'Ignoring that Merkle tree anti-entropy has bounded propagation speed — leaderless systems are eventually consistent, not immediately consistent.',
    ],
    keyQuestions: [
      {
        question: 'In Cassandra, what is the difference between consistency levels ONE, QUORUM, and ALL?',
        answer: `The consistency level controls how many replicas must respond for a read or write to be considered successful.

ONE: the operation succeeds as soon as one replica responds. Lowest latency, highest availability. For reads, the response may be stale if other replicas have a more recent version. For writes, the data may be lost if the responding node fails before replicating to others. Acceptable for non-critical data like analytics events or logs where staleness is tolerable.

QUORUM: the operation requires a majority of replicas (N/2 + 1, so 2 out of 3 for RF=3) to respond. For RF=3, this means 2 nodes. If QUORUM is used for both reads and writes (W=2, R=2, N=3), reads will always see the latest written value because the read set and write set overlap by at least one node. Recommended for most production workloads.

ALL: all replicas must respond. Maximum durability and consistency — a read will always return the absolute latest value. But availability drops: if any replica is down, operations fail. Rarely used in practice because RF=3 gives only one node failure tolerance, making ALL equivalent to requiring 100% availability.

For a payment system, I would use QUORUM for writes and QUORUM for reads, ensuring no acknowledged write is missed on read while tolerating one node failure.`,
      },
    ],
    quickFire: [
      { q: `What is leaderless replication?`, a: `Any replica can accept writes directly — there is no single leader. Used by Dynamo, Cassandra, and Riak.` },
      { q: `What is a quorum in leaderless replication?`, a: `A majority-based threshold: if n replicas total, writes go to w replicas and reads from r replicas. When w + r > n, at least one read node always has the latest write.` },
      { q: `What is read repair?`, a: `When a client reads from multiple replicas and detects stale data on one, it writes the up-to-date value back to that replica immediately.` },
      { q: `What is anti-entropy?`, a: `A background process that continuously compares replicas and copies missing data between them — ensures eventual convergence without depending on reads to trigger repair.` },
      { q: `What is a sloppy quorum?`, a: `During a network partition, writes are accepted by any reachable nodes even if they're not in the intended quorum set — improves availability at the cost of consistency.` },
      { q: `What is hinted handoff?`, a: `When a node accepts a write on behalf of an unavailable node (sloppy quorum), it keeps a 'hint' and forwards the write once the target node recovers.` },
      { q: `Can quorum reads guarantee you always read the latest write?`, a: `No — edge cases like concurrent writes, failed writes partially applied, and clock skew can cause stale reads even with w + r > n.` },
      { q: `How does Cassandra handle concurrent writes to the same key on different replicas?`, a: `Last-write-wins using timestamps — but this risks data loss if clocks are skewed. Alternatives include CRDTs or application-level conflict resolution.` },
    ],
  },

  {
    id: 'ddia-replication-lag',
    title: 'Replication Lag and Consistency Anomalies',
    icon: 'clock',
    color: '#f97316',
    questions: 4,
    description: 'Read-your-writes, monotonic reads, consistent prefix reads — the consistency guarantees that close the gaps caused by async replication lag.',
    visualizations: [{ title: 'Replication Lag Anomalies', description: '', image: '/diagrams/ddia/replication-lag-01.png' }],
    introduction: `Asynchronous replication introduces replication lag: the time between a write on the leader and its visibility on replicas. Lag is typically milliseconds but can grow to seconds or minutes under load.

Three consistency anomalies arise from replication lag:

Read-your-writes (read-your-own-writes): a user writes data, then immediately reads it from a lagging replica and does not see their own write. Fix: after a write, route reads for that user to the leader for a short window, or read from a replica known to be at least as current as the user's last write (tracked by write timestamp).

Monotonic reads: a user reads data, then reads again and sees an older version (if the second read hits a more lagging replica). The user appears to travel backward in time. Fix: always route a user's reads to the same replica (sticky routing by user ID).

Consistent prefix reads: user sees two events that happened in sequence, but sees them in reverse order due to different replicas having different lag. Fix: related writes go to the same partition or shard, ensuring they are applied in order.

These are called "weak consistency" or "eventual consistency" anomalies. They do not violate eventual consistency (all replicas converge) but they are observable by users and can cause incorrect behavior in applications that assume a single consistent view of the data.`,
    whenToUse: [
      'Explaining the difference between eventual consistency and strong consistency',
      'Designing a read routing strategy for a replicated database',
      'Discussing why a user might not see their own post after submitting it',
    ],
    keyConcepts: [
      { term: 'Read-your-writes consistency', definition: 'Guarantee that after a user writes, their subsequent reads will always see that write. Does not apply to other users.' },
      { term: 'Monotonic reads', definition: 'Guarantee that a user never reads data older than data they have already read. Prevents reading "back in time."' },
      { term: 'Consistent prefix reads', definition: 'Guarantee that if a sequence of writes occurred in order, any reader sees them in order, not interleaved or reversed.' },
      { term: 'Replication lag', definition: 'The delay between a write being applied on the leader and becoming visible on replicas. Milliseconds under normal load; seconds to minutes under high load or network issues.' },
    ],
    pitfalls: [
      'Routing all reads to a replica for read scaling without implementing read-your-writes routing — users see "phantom" missing writes.',
      'Load balancing reads randomly across replicas — violates monotonic reads if different replicas have different lag.',
    ],
    keyQuestions: [
      {
        question: 'A user submits a comment and immediately refreshes the page but does not see their comment. What is happening and how do you fix it?',
        answer: `The write went to the leader, but the subsequent read was routed to a follower replica that has not yet applied the replication log entry for that write. This is a read-your-writes consistency violation caused by asynchronous replication lag.

Fixes:

Option 1 — Route reads after writes to the leader: for a short window after the write (say, 5 seconds), route that user's reads directly to the leader. After the window, resume routing to replicas. Simple but adds leader read load.

Option 2 — Track write timestamp and route reads accordingly: when the write is acknowledged, record the leader's LSN (log sequence number) in the user's session. Route the subsequent read to any replica that has applied at least that LSN. PostgreSQL's pg_last_wal_replay_lsn() allows this.

Option 3 — Optimistic UI / local cache: after the user submits a comment, immediately show it in the UI from local state without waiting for a round-trip. On refresh, the replica lag will have likely resolved. This is what Twitter and Facebook do — new posts appear immediately via client-side state injection.

In practice, option 3 (optimistic UI) is the best user experience, combined with option 1 as a safety net for the rare case where the user refreshes in a new tab or on a different device.`,
      },
    ],
    quickFire: [
      { q: `What causes replication lag to spike beyond milliseconds?`, a: `Long-running queries on the follower that block the apply thread, network congestion between leader and follower, or a follower that is under heavy read load and cannot keep up with applying the write stream from the leader.` },
      { q: `What is the simplest fix for read-your-writes on a user's own profile data?`, a: `Route reads of the user's own profile to the primary leader rather than any follower. This sacrifices replica offload for that specific data but is simple and always correct.` },
      { q: `Does sticky-replica routing (pinning user to same follower) solve read-your-writes?`, a: `Not fully. It solves monotonic reads (no backward time jumps) but if the pinned follower is still behind on the user's write, the user still will not see their own write until that follower catches up.` },
      { q: `Which PostgreSQL view shows replication lag?`, a: `pg_stat_replication on the primary, with the replay_lag column (interval) and the difference between pg_current_wal_lsn() and each standby's replay_lsn (bytes) being the key metrics.` },
      { q: `Does consistent prefix reads matter in a single-partition single-leader system?`, a: `No. A single WAL log imposes total order on all writes, and followers apply in log order, so causal ordering is automatically preserved.` },
      { q: `What is the trade-off of routing all reads to the leader to avoid lag?`, a: `It eliminates all the read-scaling benefit of having followers. The leader must handle both all writes and all reads, defeating the primary purpose of adding replicas.` },
      { q: `What AWS metric exposes RDS replica lag?`, a: `CloudWatch ReplicaLag metric, measured in seconds, shows how far behind the read replica is relative to the primary instance.` },
      { q: `How does consistent prefix reads differ from monotonic reads?`, a: `Monotonic reads prevents a single reader from seeing data go backward in time across sequential reads. Consistent prefix reads prevents any observer from seeing a causally later write (B) without first seeing the causally earlier write (A) it depended on.` },
    ],
  },

  {
    id: 'ddia-consistency-guarantees',
    title: 'Consistency Guarantees: Eventual, Strong, and Causal',
    icon: 'checkCircle',
    color: '#f97316',
    questions: 4,
    description: 'The consistency model spectrum from eventual consistency to linearizability, and which guarantees each database provides.',
    visualizations: [{ title: 'Consistency Guarantee Spectrum', description: '', image: '/diagrams/ddia/consistency-guarantees-01.png' }],
    introduction: `Consistency in distributed databases refers to the guarantees about what values a read can return relative to what has been written. Kleppmann covers a spectrum from weak to strong:

Eventual consistency: given enough time and no new writes, all replicas converge to the same value. The weakest useful guarantee. Does not prevent temporary divergence, stale reads, or concurrent write conflicts.

Causal consistency: writes that are causally related (B was written after reading A) are seen by all nodes in causal order. Concurrent writes (neither happened-before the other) can be seen in any order. Stronger than eventual, achievable without global coordination.

Linearizability (strong consistency): every operation appears to take effect atomically at some point between its start and end time. All operations see a single, consistent view of the data as if there were only one copy. The strongest practical guarantee. Requires coordination among all nodes for every read and write — expensive and unavailable during network partitions (CAP theorem).

Read committed: no dirty reads, no dirty writes. The default in most relational databases. Each read sees only committed data; each write overwrites only committed data.

Snapshot isolation: all reads within a transaction see the data as of a consistent snapshot at the start of the transaction. Avoids non-repeatable reads. Implemented with MVCC (multi-version concurrency control).

Serializable: transactions execute as if they ran one at a time in some order. The strongest isolation level.`,
    whenToUse: [
      'Explaining CAP theorem trade-offs in a system design interview',
      'Choosing a consistency level for a given use case',
      'Discussing why distributed databases cannot provide linearizability during network partitions',
    ],
    keyConcepts: [
      { term: 'Eventual consistency', definition: 'All replicas converge to the same value given time and no new writes. Does not bound how stale reads can be.' },
      { term: 'Linearizability', definition: 'All operations appear to take effect atomically at a single point in time. The strongest consistency model. Requires coordination on every operation.' },
      { term: 'Causal consistency', definition: 'Causally related writes are seen in order by all nodes. Concurrent writes may be seen in any order. Achievable without global coordination.' },
      { term: 'CAP theorem', definition: 'A distributed system can provide at most two of: Consistency (linearizability), Availability, and Partition tolerance. During a network partition, choose C (refuse unavailable operations) or A (serve potentially stale data).' },
    ],
    pitfalls: [
      'Confusing CAP consistency (linearizability) with ACID consistency — they are different concepts using the same word.',
      'Claiming eventual consistency is "good enough" for financial balances — balance reads that are temporarily stale can cause double-spends or overdrafts.',
    ],
    keyQuestions: [
      {
        question: 'What does CAP theorem mean in practice when you are designing a distributed system?',
        answer: `CAP theorem states that during a network partition — where some nodes cannot communicate with others — you must choose between consistency (refusing to serve data that might be stale) and availability (serving potentially stale data to remain operational).

In practice, partition tolerance is not optional: all distributed systems face network failures. The real choice is between CP (consistent, partition-tolerant) and AP (available, partition-tolerant) during a partition event.

CP systems (HBase, Zookeeper, etcd): during a partition, nodes that cannot reach a quorum refuse reads and writes. The system becomes partially unavailable but never returns stale data. Use this for leader election, distributed locks, financial balances.

AP systems (Cassandra, CouchDB, DynamoDB with eventual consistency): during a partition, nodes continue serving reads and accepting writes from the data they have. Replicas diverge; reads may be stale. Use this for user profiles, shopping carts, social feeds where staleness is visible but not dangerous.

The nuance DDIA adds: CAP is about what happens during a partition, not the normal case. In normal operation (no partition), you can have both consistency and availability. Systems like DynamoDB and Cassandra allow you to tune consistency level per request — you choose C or A on each call.`,
      },
    ],
    quickFire: [
      { q: `What is eventual consistency?`, a: `If you stop writing, all replicas will eventually converge to the same value — but during active writes, replicas may temporarily diverge.` },
      { q: `What is 'reading your own writes' consistency?`, a: `After you write a value, any subsequent read by the same user is guaranteed to see that write — also called read-your-writes or read-your-own-writes (RYOW).` },
      { q: `How can you implement read-your-own-writes without routing all reads to the leader?`, a: `Track the timestamp of your last write; only read from replicas that have caught up to at least that timestamp. Or always route your own profile reads to the leader.` },
      { q: `What is monotonic reads?`, a: `A guarantee that if a user makes multiple reads in sequence, they will not see time go backward — they won't read a newer value then later read an older value.` },
      { q: `How can monotonic reads be implemented?`, a: `Route each user's reads to the same replica consistently (e.g., by hashing user ID) so they always see the same replica's state.` },
      { q: `What is consistent prefix reads?`, a: `If a sequence of writes happens in a certain order, anyone reading those writes sees them in that same order — prevents causality violations across shards.` },
      { q: `What is the gap between 'eventual consistency' marketing and actual guarantees?`, a: `Vendors often say 'eventual consistency' without specifying which session guarantees (RYOW, monotonic reads, etc.) they provide — you must read fine print to know the real behavior.` },
      { q: `What are session guarantees?`, a: `Consistency promises scoped to a single client session — RYOW, monotonic reads, monotonic writes, and writes-follow-reads are the classic four.` },
    ],
  },

  // ── PARTITIONING ─────────────────────────────────────────────────────────────

  {
    id: 'ddia-partitioning-strategies',
    title: 'Partitioning Strategies: Range vs Hash',
    icon: 'scissors',
    color: '#ef4444',
    questions: 5,
    description: 'How to distribute data across partitions, hot-spot avoidance, and the trade-offs between range and hash partitioning.',
    visualizations: [{ title: 'Key Range vs Hash Ring Partitioning', description: '', image: '/diagrams/ddia/partitioning-01.png' }],
    introduction: `Partitioning (sharding) distributes data across multiple nodes so that each node holds a subset of the data. Each partition is an independent database instance. The goal is to scale both reads and writes beyond what a single node can handle.

Range partitioning: assign contiguous key ranges to partitions. E.g., A-F on partition 1, G-N on partition 2, O-Z on partition 3. Supports efficient range scans (all records for a date range are on one partition). Risk: hot spots — if most activity is on one key range (e.g., recent dates), one partition is overloaded while others are idle.

Hash partitioning: apply a hash function to the key; assign each partition a range of hash values. Distributes keys uniformly, eliminating hot spots. Cost: destroys key ordering — range queries must scatter across all partitions. Cassandra and MongoDB use consistent hashing.

Consistent hashing: places both nodes and keys on a circular ring. Each key is assigned to the next node clockwise. When a node is added or removed, only the keys on the adjacent segment are remapped, minimizing rebalancing.

Compound partition key (Cassandra): partition by hash of the first key component, sort within a partition by the second key component. Supports both uniform distribution (hash on user_id) and range scans within a partition (range on created_at for a specific user_id).

Hot-spot mitigation: if one key is extremely hot (a celebrity's posts), add a random suffix to the key (celebrity_id + random 0-99) to distribute writes across 100 partition ranges, then read from all 100 and merge.`,
    whenToUse: [
      'Designing the sharding strategy for a large database in a system design interview',
      'Explaining why Cassandra does not support arbitrary range queries',
      'Discussing hot-spot mitigation for celebrity accounts or trending topics',
    ],
    keyConcepts: [
      { term: 'Range partitioning', definition: 'Assign contiguous key ranges to partitions. Supports range scans but risks hot spots if activity is concentrated on one range.' },
      { term: 'Hash partitioning', definition: 'Assign keys based on hash value. Distributes uniformly, eliminating hot spots, but makes range queries expensive.' },
      { term: 'Consistent hashing', definition: 'A ring-based hashing scheme that minimizes key remapping when nodes are added or removed. Used by Cassandra and Amazon DynamoDB.' },
      { term: 'Hot spot', definition: 'A partition that receives disproportionate read or write traffic, becoming a bottleneck while other partitions are underutilized.' },
      { term: 'Compound partition key', definition: 'A two-part key (partition key + clustering key) that distributes by hash of the partition key but sorts within a partition by the clustering key, enabling range scans within a partition.' },
    ],
    pitfalls: [
      'Range partitioning a time-series table by date — all recent writes go to the last partition, creating a write hot spot.',
      'Hash partitioning on a low-cardinality key (e.g., country_code with 5 values) — only 5 distinct hash outputs means most partitions are empty.',
      'Not accounting for celebrity or trending-key hot spots when hash-partitioning by user_id.',
    ],
    keyQuestions: [
      {
        question: 'How would you design partitioning for a time-series sensor database?',
        answer: `Time-series data has a natural hot-spot problem: all writes go to the current time range, creating a write hot spot on the latest partition under range partitioning.

My approach: hash-partition by sensor_id, clustering by timestamp within each partition. This distributes writes uniformly across partitions (each sensor's data goes to a different shard) while enabling efficient range scans per sensor (all readings for sensor_id=X in the last hour are co-located in one partition's sorted range).

The trade-off: I cannot do a single range scan across all sensors for a given time window. That query must scatter to all partitions and aggregate. For that use case, I add a secondary materialized view (or use a columnar store like ClickHouse) that aggregates data by time window.

For hot sensor IDs (sensors that report at 1000x the average rate), I apply sub-partitioning: split the hot sensor's data across multiple partitions using a composite key of (sensor_id + bucket, where bucket = hash(timestamp) % 10). Reads from this sensor merge 10 sub-partitions.`,
      },
    ],
    quickFire: [
      { q: `What is the main advantage of key range partitioning over hash partitioning?`, a: `Efficient range scans. Keys in a given range are co-located on one or a few partitions, so a range query touches a bounded number of partitions rather than scatter/gathering all partitions.` },
      { q: `Why does using a timestamp as the partition key cause hot spots in range partitioning?`, a: `All new writes arrive with the current timestamp, which falls in the same partition range. All write load concentrates on that one partition while past-timestamp partitions sit idle.` },
      { q: `How many vnodes does Cassandra assign to each physical node by default?`, a: `256 virtual nodes per physical node, distributed around the consistent hash ring to balance load and minimize data movement when nodes join or leave.` },
      { q: `What does scatter/gather mean in the context of hash-partitioned range queries?`, a: `The query is sent (scattered) to all partitions because hash ordering does not match key ordering. Each partition returns its matching records, and the coordinator gathers and merges the results.` },
      { q: `What fraction of keys must move when a node is added in naive modulo-based partitioning versus consistent hashing?`, a: `Modulo: approximately (n-1)/n keys must move. Consistent hashing: approximately 1/n keys move (only those in the new node's neighborhood on the ring).` },
      { q: `What is Cassandra's compound partition key and what problem does it solve?`, a: `The partition key component is hashed to select the node; the clustering columns are sorted within the partition. This enables range queries within a partition while distributing data evenly across nodes by hash.` },
      { q: `How do you mitigate a hot key from a celebrity user in a hash-partitioned system?`, a: `Append a random suffix (e.g., 2 digits) to split writes across 100 partitions. Reads must then query all 100 suffix variants and aggregate, trading read cost for write distribution.` },
      { q: `HBase uses what type of partitioning and what does it call its partitions?`, a: `Key range partitioning. HBase calls its partitions 'regions'. Regions auto-split when they exceed a configured size (default 10GB) and auto-merge when they fall below a threshold.` },
    ],
  },

  {
    id: 'ddia-rebalancing',
    title: 'Rebalancing Partitions',
    icon: 'refreshCw',
    color: '#ef4444',
    questions: 3,
    description: 'How to move partitions between nodes as the cluster grows, with minimal data movement and no downtime.',
    visualizations: [{ title: 'Partition Rebalancing Strategies', description: '', image: '/diagrams/ddia/rebalancing-01.png' }],
    introduction: `Rebalancing is the process of redistributing partitions when nodes are added or removed. The goal is: spread load evenly across the new set of nodes, with minimal data movement, without interrupting reads and writes.

Fixed number of partitions: create many more partitions than nodes from the start (e.g., 1000 partitions for 10 nodes = 100 partitions per node). When a new node joins, move some partitions to it. No partition splitting needed. Used by Elasticsearch and Riak. Problem: the number of partitions must be chosen upfront; too few limits future growth, too many wastes resources.

Dynamic partitioning: when a partition grows past a threshold (e.g., 10GB), split it into two. When two adjacent partitions shrink below a threshold, merge them. The number of partitions adapts to the data size. Used by HBase and MongoDB. Problem: a new database starts with one partition and requires manual pre-splitting to distribute load.

Proportional partitioning (Cassandra): a fixed number of partitions per node. When a new node joins, it takes equal portions from existing nodes. The number of partitions scales proportionally with nodes. Each partition's data size is proportional to the data volume.

Automatic vs manual rebalancing: automatic rebalancing is convenient but dangerous — a node slowness triggers rebalancing, which generates heavy I/O, which further slows the node, potentially cascading. Many production systems use human-in-the-loop rebalancing: the system suggests a rebalancing plan, a human approves it.`,
    whenToUse: [
      'Explaining how to scale out a Cassandra or Elasticsearch cluster',
      'Discussing the risks of automatic rebalancing in production',
      'Designing a sharded database that can grow without downtime',
    ],
    keyConcepts: [
      { term: 'Fixed partition count', definition: 'Create many more partitions than nodes at cluster creation. Rebalancing moves whole partitions between nodes. Requires choosing partition count upfront.' },
      { term: 'Dynamic partitioning', definition: 'Split partitions when they grow too large; merge when they shrink. Partition count adapts to data size. Requires pre-splitting for new databases.' },
      { term: 'Rebalancing cascade', definition: 'Automatic rebalancing triggered by a slow node generates extra I/O, which further slows the node, which triggers more rebalancing — a positive feedback loop.' },
    ],
    pitfalls: [
      'Enabling fully automatic rebalancing in a production Cassandra cluster — a disk spike can trigger rebalancing that creates a heavier disk load, making the problem worse.',
      'Starting with too few partitions — once the partition count is set, redistributing data requires creating new partitions, which involves moving all data.',
    ],
    keyQuestions: [
      {
        question: 'What happens to reads and writes during partition rebalancing?',
        answer: `During rebalancing, reads and writes must continue to the correct partition even as data is being moved. The approach depends on whether the database uses a central coordinator or gossip.

In Cassandra (consistent hashing, gossip): when a new node joins and takes ownership of a token range, the existing owner continues to serve reads for that range until the data transfer is complete. The new node accepts writes immediately (as a replica per the replication factor) but does not serve reads until it has fully bootstrapped. This is the bootstrap process — Cassandra streams data from existing nodes before the new node is considered live.

In Elasticsearch: shards move as complete atomic units. The source shard continues serving reads and writes. The destination node receives the full shard copy. Once the copy is confirmed, the cluster state is updated atomically to route new requests to the destination. A brief increase in cluster state gossip traffic is the only observable impact.

In both cases, the key invariant is: data is available for reads from at least one node throughout the move. The transfer is copy-then-switch, not move-then-switch.`,
      },
    ],
    quickFire: [
      { q: `Why should you NOT use hash mod N for partitioning?`, a: `If N (the number of nodes) changes, almost every key maps to a different node — requiring a full data reshuffle, which is extremely expensive.` },
      { q: `What is the fixed number of partitions strategy?`, a: `Create many more partitions than nodes upfront (e.g., 1000 partitions for 10 nodes). When nodes are added, whole partitions are moved — no key rehashing needed.` },
      { q: `What is dynamic partitioning?`, a: `Partitions split when they grow above a threshold and merge when they shrink — used by HBase and MongoDB. Partition count adapts to data volume.` },
      { q: `What is proportional-to-nodes partitioning?`, a: `Each node has a fixed number of partitions. When a node joins, it splits some existing partitions and takes half — used by Cassandra.` },
      { q: `What is request routing in a partitioned system?`, a: `Determining which node to contact for a given key. Options: any node forwards, a routing tier, or clients know the partition mapping directly.` },
      { q: `How does ZooKeeper help with request routing?`, a: `Nodes register their partition assignments in ZooKeeper. Routing tiers or clients subscribe to ZooKeeper for up-to-date partition-to-node mappings.` },
      { q: `How does Cassandra handle request routing without ZooKeeper?`, a: `Cassandra uses a gossip protocol — nodes exchange state with each other, so every node eventually knows the partition assignments of every other node.` },
      { q: `What is the key trade-off between fixed vs dynamic partitioning?`, a: `Fixed partitions are simpler but require guessing the right count upfront; dynamic partitions adapt automatically but add complexity from split/merge operations.` },
    ],
  },

  {
    id: 'ddia-secondary-indexes-partitioned',
    title: 'Secondary Indexes on Partitioned Data',
    icon: 'search',
    color: '#ef4444',
    questions: 3,
    description: 'Local vs global secondary indexes, scatter-gather queries, and the consistency trade-offs of each approach.',
    visualizations: [{ title: 'Local vs Global Secondary Indexes', description: '', image: '/diagrams/ddia/secondary-indexes-partitioned-01.png' }],
    introduction: `Secondary indexes on partitioned data require a choice: where does the index live?

Local secondary index (document-partitioned index): each partition maintains its own index for the data it contains. A query on the indexed field must scatter to all partitions and gather results — a scatter-gather query. Write is fast (index update is local to the partition that received the write). Read is slow for non-partition-key queries (fan-out to all partitions). Used by MongoDB, Cassandra (secondary indexes), and Elasticsearch.

Global secondary index (term-partitioned index): the index itself is partitioned across nodes, distributed by the indexed value. All documents with "color=red" are indexed on a specific index partition, regardless of which partition the document lives in. Reads are fast (query just the index partition for "color=red"). Writes are slow and complex — a write to the document partition must also update the index partition, which may be on a different node. Requires distributed transactions or asynchronous index updates. Used by DynamoDB Global Secondary Indexes (async, eventual consistency).

DynamoDB GSI: writes to the base table and GSI are eventually consistent. A write to a base table item propagates to the GSI asynchronously. There is a brief window where the base table has the new value but the GSI has the old value.`,
    whenToUse: [
      'Designing a search feature on a sharded database in a system design interview',
      'Explaining why DynamoDB GSI queries may return stale results',
      'Discussing Elasticsearch architecture for search use cases',
    ],
    keyConcepts: [
      { term: 'Local secondary index', definition: 'Each partition indexes its own data. Writes are cheap (local); reads are expensive (scatter-gather across all partitions).' },
      { term: 'Global secondary index (GSI)', definition: 'Index is partitioned by the indexed value. Reads are fast (one index partition); writes are expensive (distributed write to base + index partitions).' },
      { term: 'Scatter-gather query', definition: 'A query that must be sent to all partitions in parallel and results merged. Common with local secondary indexes. Latency is bounded by the slowest partition.' },
    ],
    pitfalls: [
      'Using a local secondary index on Cassandra for a high-cardinality column — scatter-gather to thousands of partitions is slower than a full table scan.',
      'Assuming DynamoDB GSI queries are strongly consistent — they are eventually consistent by default and can return stale data.',
    ],
    keyQuestions: [
      {
        question: 'How does Elasticsearch handle queries across a distributed index?',
        answer: `Elasticsearch uses a local secondary index approach with a two-phase scatter-gather protocol called the "query then fetch" pattern.

Query phase: the coordinating node broadcasts the query to all shards (or relevant shards if the query includes a routing key). Each shard searches its local index and returns the top N matching document IDs with their scores. The coordinating node merges these lists, sorts by score, and identifies the final top N global results.

Fetch phase: the coordinating node requests the full document data for only the final top N results from the respective shards. This avoids sending full document data in the scatter phase.

The result: reads require one round-trip to all shards (O(shards) network calls). Write operations update only the shard the document is assigned to (fast, local). This is why Elasticsearch reads have higher latency than a single-node query but writes are fast.

Optimization: routing keys. If the query filters on a field that is also the routing key (e.g., a tenant_id), Elasticsearch routes the query only to shards that contain that tenant's data, eliminating the scatter to irrelevant shards.`,
      },
    ],
    quickFire: [
      { q: `What is the read cost of a local (document-partitioned) secondary index?`, a: `Scatter/gather: the read must query every partition's local index and merge results, making read latency proportional to the slowest partition's response time.` },
      { q: `Why are DynamoDB GSI reads eventually consistent?`, a: `GSI updates are applied asynchronously after the base table write succeeds. There is a propagation delay, so a GSI read immediately after a write may not reflect the write.` },
      { q: `What does ZooKeeper store in a Kafka cluster?`, a: `Partition-to-broker assignments, consumer group offsets (in older versions), controller election, and topic configuration. When a partition is reassigned, ZooKeeper notifies all brokers and consumer groups.` },
      { q: `What does a MOVED response mean in Redis Cluster?`, a: `The client sent a request to a node that does not own the key's hash slot. The response contains the address of the node that does own the slot. The client should update its local slot map and retry at the new address.` },
      { q: `What is the bootstrapping problem with dynamic partitioning?`, a: `A new cluster starts with a single partition covering the entire key space, so all initial writes go to one node. Auto-split does not trigger until enough data accumulates. Pre-splitting the key range at cluster creation avoids this.` },
      { q: `Which secondary index approach does Elasticsearch use?`, a: `Document-partitioned (local) secondary indexes. Each shard maintains its own Lucene index. A search query is scattered to all shards and results are gathered and merged at the coordinating node.` },
      { q: `What is the overhead of adding a 100th partition to a fixed-partition cluster with 1000 total partitions?`, a: `Approximately 10 partitions are moved from each of the 99 existing nodes to the new node, distributing the data movement across all nodes and allowing it to proceed in parallel.` },
      { q: `In a term-partitioned global secondary index, how many index partitions does a write to a document with 5 indexed fields touch?`, a: `Up to 5 index partitions, one per indexed term (though terms may hash to the same index partition). The data partition is also updated, so a single write can touch up to 6 partitions.` },
    ],
  },

  // ── TRANSACTIONS ─────────────────────────────────────────────────────────────

  {
    id: 'ddia-acid',
    title: 'ACID Properties',
    icon: 'shield',
    color: '#22c55e',
    questions: 5,
    description: 'What atomicity, consistency, isolation, and durability actually mean in database systems.',
    visualizations: [{ title: 'ACID Properties', description: '', image: '/diagrams/ddia/acid-01.png' }],
    introduction: `ACID is the set of properties that guarantee database transactions behave reliably.

Atomicity: a transaction is all-or-nothing. If any step fails, the entire transaction is rolled back. Atomicity is about error recovery, not concurrency. The word "atomic" in ACID has nothing to do with concurrency atomicity (unlike linearizability).

Consistency: the database moves from one valid state to another valid state. Application-defined invariants (account balances cannot go negative, foreign keys must be valid) are maintained. Technically, consistency is a property of the application, not the database — the database enforces only constraints it knows about (UNIQUE, FOREIGN KEY, NOT NULL). C in ACID was added to make the acronym work.

Isolation: concurrently executing transactions are isolated from each other — the intermediate state of one transaction is not visible to others. Full isolation (serializability) means concurrent transactions behave as if they ran one at a time. Most databases implement weaker isolation levels for performance.

Durability: once a transaction is committed, its effects are permanent. Even if the database crashes immediately after the commit acknowledgment, the data will not be lost. Implemented via write-ahead logs and fsync.

Kleppmann's nuance: "ACID" as marketed by databases does not mean the same thing in every system. Some databases call themselves ACID-compliant but use weak isolation (read committed) that allows anomalies. Always check which isolation level the database uses by default.`,
    whenToUse: [
      'Explaining why financial databases require ACID transactions',
      'Distinguishing between database-enforced consistency and application-level consistency',
      'Discussing isolation levels and why they differ from ACID marketing claims',
    ],
    keyConcepts: [
      { term: 'Atomicity', definition: 'All-or-nothing execution. A failed transaction is completely rolled back. No partial writes are visible.' },
      { term: 'Isolation', definition: 'Concurrent transactions do not interfere with each other. Strength varies by isolation level: read committed, snapshot isolation, serializable.' },
      { term: 'Durability', definition: 'Committed data survives crashes. Implemented via WAL and fsync. A "commit" acknowledgment means the WAL entry is on disk.' },
      { term: 'Write-ahead log (WAL)', definition: 'The mechanism that ensures durability: changes are written to the WAL and fsynced before the commit acknowledgment is sent.' },
    ],
    pitfalls: [
      'Assuming a database that claims ACID compliance uses serializable isolation — most default to read committed or snapshot isolation.',
      'Confusing ACID atomicity (all-or-nothing) with hardware atomicity (single CPU instruction) — they are different concepts.',
    ],
    keyQuestions: [
      {
        question: 'What does durability mean in practice, and how is it implemented?',
        answer: `Durability means that once a transaction is committed and the acknowledgment is returned to the client, the data will not be lost even if the database process crashes, the server loses power, or the disk has a partial failure.

Implementation: write-ahead logging (WAL). Before modifying any data pages in memory or on disk, the database writes the transaction's changes to the WAL — an append-only log on disk. The WAL write is fsynced (forced to durable storage) before the commit acknowledgment is sent to the client.

If the database crashes after fsync but before applying changes to the data files: on restart, the WAL is replayed to bring the data files up to date with the committed transactions.

Fsync is the critical operation. Without fsync, the WAL is only in the OS page cache (RAM), which is lost on crash. PostgreSQL's fsync=off setting disables this — it dramatically increases write throughput but means a crash can cause data corruption. Never use fsync=off in production.

For multi-server durability (protecting against the entire machine failing): replication to another node with synchronous replication ensures the WAL entry is committed to disk on at least two machines before the client acknowledgment.`,
      },
    ],
    quickFire: [
      { q: `Who coined the ACID acronym and when?`, a: `Andreas Haerder and Andreas Reuter in their 1983 paper 'Principles of Transaction-Oriented Database Recovery.'` },
      { q: `Which ACID property is primarily the application's responsibility, not the database's?`, a: `Consistency (the C). The database provides tools (constraints, atomicity, isolation) but business invariants must be defined and enforced by the application.` },
      { q: `What does PostgreSQL's default isolation level provide?`, a: `Read committed. Not full serializability. This means some anomalies (read skew, write skew, phantom reads) are possible unless the application explicitly uses SERIALIZABLE or REPEATABLE READ.` },
      { q: `What does fsync do and why does it matter for durability?`, a: `fsync forces the OS to flush its write buffer to physical storage. Without it, a crash can lose WAL records that the OS had buffered in DRAM, causing committed transaction data to be lost.` },
      { q: `What does BASE stand for?`, a: `Basically Available, Soft state, Eventually consistent. A design philosophy for distributed NoSQL systems that trades strict ACID guarantees for higher availability and partition tolerance.` },
      { q: `Is ACID atomicity about concurrency?`, a: `No. ACID atomicity is about fault handling — making a transaction all-or-nothing. Concurrency control is the job of Isolation. The word 'atomic' is used in a different sense than in CPU atomic operations.` },
      { q: `What mechanism allows a database to roll back an incomplete transaction after a crash?`, a: `The WAL's undo log (before-images of modified data). On recovery, the database reads the WAL backward from the crash point and reverses each uncommitted change to restore the pre-transaction state.` },
      { q: `Can perfect durability be achieved?`, a: `No. Physical disasters (simultaneous disk failures, datacenter fires destroying all replicas, firmware bugs in storage controllers) can defeat any durability mechanism. ACID durability reduces but cannot eliminate data loss probability.` },
    ],
  },

  {
    id: 'ddia-isolation-levels',
    title: 'Isolation Levels',
    icon: 'layers',
    color: '#22c55e',
    questions: 5,
    description: 'Read uncommitted, read committed, snapshot isolation, and serializable — what anomalies each level prevents.',
    visualizations: [{ title: 'MVCC Snapshot Isolation Timeline', description: '', image: '/diagrams/ddia/isolation-levels-01.png' }],
    introduction: `Isolation levels define how much of a concurrent transaction's intermediate state is visible to other transactions. Stronger isolation = fewer anomalies = more coordination overhead.

Read uncommitted: transactions see uncommitted writes from other transactions (dirty reads). Almost never used in practice. Provides no useful consistency guarantee.

Read committed: no dirty reads (only see committed data) and no dirty writes (only overwrite committed data). The default in PostgreSQL, Oracle, SQL Server. Anomalies still possible: non-repeatable reads (reading the same row twice in one transaction returns different values) and phantom reads (a query returns different rows when re-executed within the same transaction).

Snapshot isolation (repeatable read in MySQL, "default" in PostgreSQL): every transaction sees a snapshot of the database as of the transaction's start time. Non-repeatable reads and phantom reads are prevented. Implemented with MVCC. Not truly serializable — write skew is still possible.

Serializable: transactions execute as if they were sequential with no interleaving. Prevents all anomalies including write skew. Implemented by: two-phase locking (2PL, traditional — high lock contention), serializable snapshot isolation (SSI, optimistic — tracks conflicts and aborts conflicting transactions), or actual serial execution (only one thread executes transactions, used by VoltDB and Redis).`,
    whenToUse: [
      'Choosing an isolation level for a banking application',
      'Explaining why snapshot isolation does not prevent all anomalies',
      'Discussing MVCC implementation in PostgreSQL',
    ],
    keyConcepts: [
      { term: 'Dirty read', definition: 'Reading a value written by a transaction that has not yet committed. Prevented by read committed and stronger.' },
      { term: 'Non-repeatable read', definition: 'Reading the same row twice in one transaction returns different values because another transaction committed between the reads. Prevented by snapshot isolation.' },
      { term: 'Phantom read', definition: 'A query returns different rows when re-executed in the same transaction because another transaction inserted or deleted matching rows. Prevented by serializable.' },
      { term: 'MVCC', definition: 'Multi-Version Concurrency Control — stores multiple versions of each row. Readers see the version current at the start of their transaction; writers create new versions. No read-write contention.' },
      { term: 'Snapshot isolation', definition: 'Each transaction reads from a consistent snapshot taken at its start time. Prevents dirty reads and non-repeatable reads but not write skew.' },
    ],
    pitfalls: [
      'Using snapshot isolation for a ledger that checks balance before debit — write skew can still allow two concurrent transactions to both pass the balance check and both debit, overdrawing the account.',
      'Assuming PostgreSQL "serializable" isolation level is automatic — you must explicitly set the transaction isolation level with SET TRANSACTION ISOLATION LEVEL SERIALIZABLE.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between snapshot isolation and serializable isolation?',
        answer: `Snapshot isolation: each transaction reads from a point-in-time snapshot of the database. Reads are consistent and non-repeatable reads are prevented. But write skew is possible.

Write skew: two concurrent transactions both read overlapping data, make decisions based on what they read, and write to different rows. Neither violates any constraints on its own, but the combined result violates an application invariant.

Classic example: a hospital requires at least one doctor on call. Alice's transaction reads: two doctors on call (Alice, Bob). Bob's transaction reads: two doctors on call (Alice, Bob). Alice's transaction decides to remove Alice (still one doctor left). Bob's transaction decides to remove Bob (still one doctor left). Both commit. Zero doctors on call. Neither transaction saw the other's write — they operated on their respective snapshots.

Serializable isolation prevents write skew by detecting that Alice and Bob's transactions conflict (they both read the on-call set, which is affected by each other's writes) and aborting one. With serializable snapshot isolation (SSI), the database tracks read-write conflicts optimistically and aborts the loser on commit.

In PostgreSQL, use SET TRANSACTION ISOLATION LEVEL SERIALIZABLE for the doctor-on-call pattern. For most other patterns (no write skew risk), snapshot isolation is sufficient and more performant.`,
      },
    ],
    quickFire: [
      { q: `What isolation level does PostgreSQL use by default?`, a: `Read committed. This prevents dirty reads and dirty writes but allows read skew (non-repeatable reads), lost updates, and write skew.` },
      { q: `Does MVCC use read locks?`, a: `No. Readers select an appropriate row version based on transaction ID rules without acquiring any locks. This is why readers never block writers and writers never block readers in MVCC systems.` },
      { q: `What are the two system columns PostgreSQL adds to every row for MVCC?`, a: `xmin (transaction ID of the inserting transaction) and xmax (transaction ID of the deleting transaction, null if the row is still current).` },
      { q: `Does snapshot isolation prevent write skew?`, a: `No. Write skew (two transactions reading the same data and writing to disjoint rows in a way that together violates an invariant) is not prevented by snapshot isolation. It requires serializable isolation or SELECT FOR UPDATE.` },
      { q: `What happens to old row versions in PostgreSQL's MVCC and what cleans them up?`, a: `Old versions are retained on disk (dead tuples) until VACUUM determines no running transaction has a snapshot older than the version. Long-running transactions can block VACUUM and cause table bloat.` },
      { q: `What does Oracle call its snapshot isolation level, and why is that misleading?`, a: `Oracle calls it SERIALIZABLE. It is misleading because it does not provide true serializability — write skew is still possible. Oracle's SERIALIZABLE is snapshot isolation, not the fully serial guarantee implied by the name.` },
      { q: `What is Serializable Snapshot Isolation (SSI)?`, a: `PostgreSQL's implementation of true serializable isolation since version 9.1. It runs snapshot isolation but tracks read-write dependencies and aborts transactions that form dangerous cycles, achieving serializability without the throughput cost of two-phase locking.` },
      { q: `What is a phantom read and which isolation level prevents it?`, a: `A phantom read is when a range query run twice in the same transaction returns different sets of rows because another transaction inserted or deleted matching rows between the two executions. Serializable isolation prevents phantom reads. Snapshot isolation prevents most phantom reads in practice but not formally.` },
    ],
  },

  {
    id: 'ddia-write-skew-phantoms',
    title: 'Write Skew and Phantom Reads',
    icon: 'alertTriangle',
    color: '#22c55e',
    questions: 4,
    description: 'The two anomalies that snapshot isolation does not prevent, with concrete examples and mitigation strategies.',
    visualizations: [{ title: 'Write Skew and Lost Update Anomalies', description: '', image: '/diagrams/ddia/write-skew-01.png' }],
    introduction: `Write skew and phantom reads are the two major anomalies that snapshot isolation does not prevent. Both require serializable isolation or application-level locking.

Write skew: two transactions read overlapping data, make decisions, and write to different rows. The combined effect violates an application invariant, but neither write violates any single-row constraint. Examples: two users simultaneously claim the last item in stock, two doctors both go off call, two bookings claim the same meeting room.

Pattern for write skew: (1) A SELECT checks that a precondition is met. (2) Based on the SELECT result, the application makes a decision. (3) An UPDATE or INSERT is performed. Under snapshot isolation, step 1 reads a snapshot; the write in step 3 may conflict with a concurrent transaction's step 3 without detection.

Phantom read: during a transaction, a query for rows matching a condition returns different rows when re-executed because another transaction inserted or deleted matching rows. Snapshot isolation prevents phantom reads for SELECT statements by reading from the transaction's snapshot — but INSERT/UPDATE from other transactions can change the set of rows that would match.

Mitigation for write skew (without serializable isolation): SELECT FOR UPDATE on the rows checked in step 1. This acquires a lock on those rows, preventing other transactions from modifying them until the current transaction commits.

Materialized conflicts: when the rows that should be locked do not yet exist (e.g., booking a room that has no conflicting booking row yet), create a lock table that represents the conflict (e.g., insert a row into a bookings_lock table) and SELECT FOR UPDATE on it.`,
    whenToUse: [
      'Explaining why double-booking can happen even with transactions',
      'Designing a reservation system or doctor-on-call scheduler',
      'Discussing SELECT FOR UPDATE as a mitigation for write skew',
    ],
    keyConcepts: [
      { term: 'Write skew', definition: 'Two concurrent transactions read overlapping data, make independent decisions, and write to different rows. The combined result violates an application invariant.' },
      { term: 'Phantom read', definition: 'A query returns different rows when re-executed in the same transaction because concurrent transactions inserted or deleted matching rows.' },
      { term: 'SELECT FOR UPDATE', definition: 'A lock acquisition on selected rows that prevents other transactions from updating or deleting them until the current transaction commits. Prevents write skew on existing rows.' },
      { term: 'Materialized conflict', definition: 'Creating lock rows in a separate table to represent conflicts on data that does not yet exist, enabling SELECT FOR UPDATE to prevent write skew on phantom rows.' },
    ],
    pitfalls: [
      'Using snapshot isolation for booking systems without SELECT FOR UPDATE — two concurrent bookings for the same slot can both succeed.',
      'Using SELECT FOR UPDATE on too many rows — excessive locking reduces concurrency and causes deadlocks.',
    ],
    keyQuestions: [
      {
        question: 'How do you prevent double-booking in a reservation system under concurrent load?',
        answer: `The naive approach — check for conflicts then insert — fails under concurrent load because two transactions can both check, both find no conflict, and both insert.

Fix 1 — Serializable isolation: use SET TRANSACTION ISOLATION LEVEL SERIALIZABLE. PostgreSQL SSI detects that both transactions read the same conflict-checking query and that their inserts conflict. One transaction is aborted and retried. No application-level locking needed. Correct but has more transaction abort overhead.

Fix 2 — SELECT FOR UPDATE: within a transaction, run SELECT ... FOR UPDATE on rows representing the time slot or resource. This acquires an exclusive lock. The second concurrent transaction blocks on the SELECT FOR UPDATE until the first commits, then finds the slot taken and aborts.

Fix 3 — Unique constraint: model the booking as an INSERT with a UNIQUE constraint on (resource_id, time_slot). If two transactions try to INSERT for the same slot, one succeeds and the other fails with a unique constraint violation. The application catches the exception and returns an error. Simple and robust — the database enforces the invariant at the storage level.

I use fix 3 where possible: it requires no transaction isolation management and the unique constraint is enforced atomically by the database. Fix 2 is appropriate when the conflict check is more complex than a unique key. Fix 1 is a last resort for complex write skew patterns.`,
      },
    ],
    quickFire: [
      { q: `What is the difference between a lost update and write skew?`, a: `Lost update is a same-object problem: two transactions both read and write the same row, one write overwrites the other. Write skew is a multi-object problem: two transactions read overlapping data, make decisions, write to different objects, and the combined result violates an invariant.` },
      { q: `Does snapshot isolation prevent write skew?`, a: `No. Snapshot isolation (MVCC, the default in PostgreSQL as REPEATABLE READ) prevents dirty reads, non-repeatable reads, and lost updates via detection, but it does not prevent write skew. Write skew requires serializable isolation or explicit SELECT FOR UPDATE.` },
      { q: `What is a phantom read?`, a: `A transaction queries rows matching a condition, another transaction inserts a row that matches that condition and commits, and the first transaction re-reads and sees a different result set. The inserted row is the phantom.` },
      { q: `How does SELECT FOR UPDATE prevent write skew?`, a: `It locks the rows whose values informed the decision, not just the rows being written. The second transaction blocks on acquiring those locks, re-reads after the first commits, and sees the updated state before making its own decision.` },
      { q: `What is materializing conflicts?`, a: `Pre-creating concrete rows (e.g., one row per room-timeslot) so that SELECT FOR UPDATE can acquire a lock on an existing row, converting a phantom into a lockable conflict. It is a workaround for cases where predicate locks are unavailable.` },
      { q: `What SQLSTATE code does PostgreSQL return when SSI aborts a transaction?`, a: `40001 (serialization_failure). The application must catch this and retry the transaction from the beginning.` },
      { q: `Can atomic SQL operations like UPDATE counter = counter + 1 prevent write skew?`, a: `No. Atomic operations prevent lost updates on a single column by making the read-modify-write atomic. Write skew involves decisions spanning multiple rows or objects; atomic single-row operations do not address cross-row invariants.` },
      { q: `Name three databases that detect lost updates automatically under snapshot isolation.`, a: `PostgreSQL (snapshot isolation / REPEATABLE READ detects lost updates since version 9.1 via SSI-lite), SQL Server (SNAPSHOT isolation level), and Oracle (Serializable which is actually snapshot isolation also performs lost update detection).` },
    ],
  },

  {
    id: 'ddia-serializability',
    title: 'Implementing Serializability',
    icon: 'lock',
    color: '#22c55e',
    questions: 4,
    description: 'Two-phase locking, serializable snapshot isolation (SSI), and actual serial execution — three ways to achieve serializable transactions.',
    visualizations: [{ title: '2PL vs SSI Serializability', description: '', image: '/diagrams/ddia/serializability-01.png' }],
    introduction: `Serializability — the strongest isolation level — can be implemented three ways, with different performance characteristics.

Two-phase locking (2PL): the traditional approach (IBM System R, 1970s). During execution, transactions acquire locks on every record they read (shared locks) and write (exclusive locks). Shared locks block writes; exclusive locks block both reads and writes. Locks are held until commit. Guarantees serializability by preventing any concurrent access to locked rows. Cost: significant lock contention on hot records; deadlocks require detection and transaction abort.

Serializable snapshot isolation (SSI): an optimistic concurrency control approach. Transactions execute without blocking, reading from their snapshot. The database tracks read-write conflicts (which transactions read data that another transaction wrote). On commit, if a conflict is detected that would produce a non-serializable execution, the transaction is aborted. Cost: transaction aborts under high contention, wasted computation on aborted transactions. More concurrency than 2PL when contention is low.

Actual serial execution: run one transaction at a time on a single thread. No concurrency, no locking overhead. Feasible if transactions are short (micro-transactions), the dataset fits in RAM, and write throughput is modest. Redis (RESP protocol, single-threaded) and VoltDB use this approach. Throughput is limited to one core's processing speed.`,
    whenToUse: [
      'Comparing locking vs optimistic concurrency control in a database internals question',
      'Explaining when actual serial execution is viable (Redis transactions)',
      'Discussing why serializable isolation is expensive and when to use it',
    ],
    keyConcepts: [
      { term: 'Two-phase locking (2PL)', definition: 'Transactions acquire shared locks on reads and exclusive locks on writes, held until commit. Prevents all concurrency anomalies through blocking.' },
      { term: 'Serializable snapshot isolation (SSI)', definition: 'Optimistic approach: transactions run concurrently on snapshots, conflicts are detected on commit, and the losing transaction is aborted. More concurrent than 2PL at low contention.' },
      { term: 'Actual serial execution', definition: 'Process one transaction at a time on a single thread. No locking or conflict detection. Viable when transactions are short and data fits in RAM.' },
      { term: 'Deadlock', definition: 'Two transactions each hold a lock that the other needs. Both block indefinitely. Detected by cycle detection in the lock graph; resolved by aborting one transaction.' },
    ],
    pitfalls: [
      'Using SSI in a high-contention workload (many concurrent writes to the same rows) — high abort rates waste CPU and reduce effective throughput below 2PL.',
      'Using 2PL with long-running transactions — holding locks for seconds blocks other transactions and causes queuing.',
    ],
    keyQuestions: [
      {
        question: 'When would you choose SSI over 2PL for transaction isolation?',
        answer: `SSI is better than 2PL when read-heavy workloads dominate and write contention is low. SSI allows reads to proceed without acquiring locks — readers never block writers and writers never block readers. Under 2PL, a shared (read) lock blocks exclusive (write) locks on the same row, serializing reads and writes.

Example: a reporting dashboard that reads many rows for aggregation while background writers update individual rows. Under 2PL, report transactions hold shared locks across thousands of rows, blocking any concurrent updates. Under SSI, the report reads its snapshot with no locks; concurrent updates proceed; on commit, SSI checks if the report's read set was modified by committed writes. If not (common for aggregation queries over stable historical data), the report commits without conflict.

2PL is better when: write contention is high and conflicts are frequent (SSI would generate many aborts, wasting CPU), or when you need strict lock-based ordering guarantees for external resources (e.g., a lock that prevents two services from running simultaneously).

PostgreSQL uses SSI for SERIALIZABLE isolation (since PostgreSQL 9.1). MySQL InnoDB uses a combination of MVCC (for reads) and 2PL (for writes). In practice, the choice of database determines the isolation implementation; you choose the isolation level, not the mechanism.`,
      },
    ],
    quickFire: [
      { q: `What is the key difference between 2PL and MVCC with respect to readers and writers?`, a: `In 2PL, readers block writers and writers block readers. In MVCC (snapshot isolation), readers never block writers and writers never block readers because each transaction reads a consistent snapshot.` },
      { q: `What SQLSTATE does PostgreSQL return for a serialization failure under SSI?`, a: `40001 (serialization_failure). The application must catch this, roll back, and retry the entire transaction.` },
      { q: `What is the growing phase in 2PL?`, a: `Phase 1, where a transaction acquires locks but does not release any. Locks can only be released during Phase 2 (shrinking phase), after the transaction has decided to commit or abort.` },
      { q: `Name three production databases that use SSI.`, a: `PostgreSQL (SERIALIZABLE isolation level, since 9.1), CockroachDB (default isolation), and FoundationDB.` },
      { q: `What is an index-range lock and why is it used instead of predicate locks?`, a: `An index-range lock locks a range of values in an existing index, approximating a predicate lock. It is used because true predicate locks (locking based on arbitrary search conditions) are expensive to track. Index-range locks are a practical approximation that prevents most phantom reads.` },
      { q: `Why does deadlock rate grow super-linearly with the number of concurrent transactions in 2PL?`, a: `Because each additional transaction adds potential waiter-for edges with all other transactions. The probability of a cycle grows faster than linearly, making deadlocks increasingly frequent as concurrency increases.` },
      { q: `What are the two conditions required for actual serial execution to achieve high throughput?`, a: `All data must fit in RAM (no disk I/O blocking the single thread), and transactions must use stored procedures to eliminate network round-trips between the application and database during a transaction.` },
    ],
  },

  // ── DISTRIBUTED SYSTEMS ───────────────────────────────────────────────────────

  {
    id: 'ddia-faults-and-partial-failures',
    title: 'Faults and Partial Failures in Distributed Systems',
    icon: 'alertOctagon',
    color: '#f59e0b',
    questions: 4,
    description: 'Why partial failures make distributed systems fundamentally different from single-machine systems, and how to design for them.',
    visualizations: [{ title: 'Network Fault Taxonomy', description: '', image: '/diagrams/ddia/faults-networks-01.png' }],
    introduction: `In a single machine, software is deterministic: a computation either succeeds or fails completely. The hardware either works or the machine stops. There is no partial failure.

In a distributed system, partial failure is the norm: the network can drop packets, reorder them, or delay them arbitrarily. A remote node may be slow, stopped, or running but unable to respond due to CPU/disk exhaustion. You cannot know whether a message was delivered without a response — and a missing response does not tell you whether the request was never received, is still processing, or the response was lost.

This is the fundamental challenge of distributed systems: uncertainty. You send a request, wait for a timeout, and have no information about the state of the remote node. Did it receive the request? Did it process it? Did the response get lost?

Designing for partial failures means: idempotent operations (safe to retry), timeouts with circuit breakers (stop calling a failing dependency), retries with exponential backoff and jitter, graceful degradation (serve degraded responses rather than errors), and explicit health checks with actual load testing.

The "fallacies of distributed computing" (Peter Deutsch, 1994): the network is reliable, latency is zero, bandwidth is infinite, the network is secure, topology never changes, there is one administrator, transport cost is zero, the network is homogeneous. All of these assumptions are wrong in production.`,
    whenToUse: [
      'Justifying timeouts and circuit breakers in a service design',
      'Explaining why distributed transactions are hard',
      'Discussing resiliency patterns: retries, idempotency, circuit breakers',
    ],
    keyConcepts: [
      { term: 'Partial failure', definition: 'Some parts of the system are working while others are not. Fundamental to distributed systems; absent in single-machine systems.' },
      { term: 'Idempotency', definition: 'An operation that can be applied multiple times without changing the result beyond the first application. Required for safe retries in distributed systems.' },
      { term: 'Circuit breaker', definition: 'A pattern that detects repeated failures to a dependency, stops making calls to it for a cooling-off period, and gradually resumes. Prevents cascading failures.' },
      { term: 'Timeout', definition: 'The maximum time to wait for a response before assuming failure. Critical for bounding the time a caller waits during a partial failure.' },
    ],
    pitfalls: [
      'Retrying non-idempotent operations — retrying a payment or order creation can result in double charges or duplicate orders.',
      'Setting timeouts that are too long — a 30-second timeout means 30 seconds of blocked threads per failing request, exhausting thread pools quickly.',
    ],
    keyQuestions: [
      {
        question: 'How do you make a distributed operation safe to retry?',
        answer: `Retrying is essential in distributed systems — a timeout does not tell you if the operation failed or just took too long. But retrying a non-idempotent operation causes double-executions.

The standard approach: idempotency keys. The caller generates a unique ID for each logical operation (a UUID or a hash of the request content) and includes it in the request. The server uses this key as a deduplication mechanism: before executing, check if the key has been seen. If yes, return the cached result. If no, execute and store the result keyed on the idempotency key.

Stripe's API uses this pattern: every charge API call includes an Idempotency-Key header. If the same key is used twice, the second call returns the same result as the first without creating a new charge.

Implementation details: the idempotency key and result are stored in a fast key-value store (Redis). The key has a TTL (e.g., 24 hours) — long enough to cover retry windows. The check and execute must be atomic (use a transaction or a Redis SET NX operation) to prevent two concurrent requests with the same key from both executing.

For operations where full idempotency is not achievable (e.g., sending an email), idempotency at the operation level is replaced by at-least-once semantics plus deduplication at the delivery layer.`,
      },
    ],
    quickFire: [
      { q: `Name four scenarios that look identical to a caller when a request receives no response.`, a: `Request lost in transit, response lost in transit, server crashed before processing, server alive but paused (GC or OS preemption). No timeout can distinguish these scenarios.` },
      { q: `What is the typical NTP clock accuracy in a well-managed data center?`, a: `10-100ms. Google TrueTime (GPS + atomic clocks) achieves 0-7ms bounded uncertainty.` },
      { q: `Why can a JVM garbage collector pause create a split-brain in a distributed lock system?`, a: `A GC stop-the-world pause can last 10+ seconds, longer than a lock lease. The process wakes up believing it holds the lock, but the lease expired during the pause and another node acquired the lock. Both nodes now believe they hold an exclusive lock.` },
      { q: `What does a Lamport timestamp guarantee?`, a: `If event A causally happened before event B, then A's Lamport timestamp is less than B's. It does not guarantee the converse: a lower timestamp does not necessarily mean the event happened first in wall-clock time.` },
      { q: `What is the difference between a synchronous and asynchronous network?`, a: `A synchronous network (like telephone circuit switching) provides bounded delay guarantees. An asynchronous network (like the internet) queues packets with no upper bound on delay. Distributed systems built on the internet must assume unbounded delay.` },
      { q: `Why must a distributed leader step down even if it disagrees with the quorum's decision?`, a: `A node cannot trust its own judgment in a distributed system. It may have been partitioned, paused, or misinformed. Quorum decisions define truth by majority, and the leader must respect the quorum's verdict to prevent split-brain.` },
      { q: `What is commit-wait in Google Spanner and why is it needed?`, a: `Commit-wait is a delay imposed after acquiring a commit timestamp: the transaction waits until TT.now().earliest > commit_timestamp, ensuring that no future transaction can be assigned an earlier timestamp. It guarantees real-time ordering of transactions across globally distributed nodes.` },
    ],
  },

  {
    id: 'ddia-clocks-and-time',
    title: 'Clocks and Time in Distributed Systems',
    icon: 'clock',
    color: '#f59e0b',
    questions: 4,
    description: 'Why wall clocks are unreliable in distributed systems, monotonic clocks, NTP drift, and logical clocks (Lamport timestamps, HLC).',
    visualizations: [{ title: 'Clock Unreliability and Logical Clocks', description: '', image: '/diagrams/ddia/faults-networks-01.png' }],
    introduction: `Wall clocks (system time) in distributed systems are unreliable for ordering events because: NTP synchronization is imprecise (typically 1-100ms error, occasionally worse), clocks drift forward or backward when NTP adjusts, and a clock can jump backward after a leap second.

Two types of clocks: wall clocks (time of day — what time is it?) and monotonic clocks (elapsed time — how long did this operation take?). Monotonic clocks never go backward (they are forward-only counters). Use monotonic clocks for measuring elapsed time; never use wall clocks for measuring intervals.

Using wall clock timestamps to order events is dangerous: a write with a timestamp of T1 may have actually occurred after a write with timestamp T2 if T1's node has a faster clock. Last Write Wins replication that uses wall clock timestamps silently discards writes from nodes with slower clocks.

Google's TrueTime (Spanner): hardware-based (GPS receivers and atomic clocks) with a known error bound. Spanner timestamps are (earliest, latest) intervals. Before committing, Spanner waits until the "latest" time has passed to ensure no other machine in the world could have a timestamp that overlaps. This gives external consistency (stronger than linearizability) with bounded wait time.

Logical clocks solve the ordering problem without physical clocks. Lamport timestamps: each message is tagged with a counter. The receiver updates its counter to max(sender_counter, local_counter) + 1. This captures happens-before relationships but not causality (two Lamport timestamps cannot determine if two events are concurrent).`,
    whenToUse: [
      'Explaining why Last Write Wins using wall clocks loses data',
      'Discussing Google Spanner or CockroachDB clock synchronization',
      'Justifying the use of logical clocks or HLC in a distributed database',
    ],
    keyConcepts: [
      { term: 'Wall clock', definition: 'Time of day. Subject to NTP drift and backward jumps. Unreliable for ordering events across nodes.' },
      { term: 'Monotonic clock', definition: 'Forward-only elapsed time counter. Never goes backward. Use for measuring operation duration, not for timestamps.' },
      { term: 'Lamport timestamp', definition: 'A logical counter that captures happens-before order across nodes. Does not distinguish concurrent events from sequential ones.' },
      { term: 'TrueTime (Spanner)', definition: 'GPS + atomic clock-based time with a known error bound expressed as an interval [earliest, latest]. Enables external consistency.' },
      { term: 'Hybrid Logical Clock (HLC)', definition: 'Combines wall clock time (for interpretability) with a logical counter (for causality). Provides causality guarantees without TrueTime hardware.' },
    ],
    pitfalls: [
      'Using System.currentTimeMillis() or time.time() to timestamp events for ordering across nodes — NTP drift means these timestamps are not comparable.',
      'Using wall clock timestamps as tie-breakers in Last Write Wins — a node with a fast clock always wins, discarding writes from nodes with slower clocks.',
    ],
    keyQuestions: [
      {
        question: 'Why is Last Write Wins based on wall clock timestamps dangerous?',
        answer: `Last Write Wins assumes that the write with the highest timestamp is the most recent. This breaks when clocks differ between nodes.

Scenario: node A (clock at 10:00:00.100) accepts a write that sets user.email = "alice@new.com". Node B (clock at 10:00:00.050, slightly behind due to NTP drift) accepts a concurrent write that sets user.email = "alice@old.com". Under LWW, node B's timestamp (50ms) is lower, so when the replication arrives at node A, node A's write wins and keeps "alice@new.com." So far correct.

But now invert it: node B's clock is slightly ahead (10:00:00.200). node B's write has a higher timestamp. Under LWW, node B's write wins everywhere, discarding Alice's newer intent from node A, even though Alice changed her email after the node B write was made.

The result: LWW with wall clocks silently discards writes. There is no error, no conflict notification — the losing write simply disappears.

Safe alternatives: use logical clocks (Lamport timestamps or HLC) which capture causality without relying on synchronized clocks. Or use CRDTs that merge concurrent writes without discarding either. Or use serializable transactions that route all writes through a single ordered log.`,
      },
    ],
    quickFire: [
      { q: `What is the difference between a time-of-day clock and a monotonic clock?`, a: `Time-of-day clocks return the current wall-clock time and can jump backward (NTP sync). Monotonic clocks only move forward and are used for measuring elapsed time.` },
      { q: `Why can't you use wall-clock time to order events in a distributed system?`, a: `Clocks on different machines drift and are periodically corrected by NTP — two nodes' clocks may disagree by milliseconds to seconds, making timestamp ordering unreliable.` },
      { q: `What is NTP clock skew?`, a: `The difference between a node's local clock and the true time. NTP reduces but never eliminates skew — typical drift is tens of milliseconds, worst case seconds.` },
      { q: `What is Google's TrueTime API?`, a: `Used in Spanner — returns a time interval [earliest, latest] rather than a single timestamp, explicitly representing clock uncertainty. Spanner waits out the interval before committing.` },
      { q: `What is a process pause in the context of distributed systems?`, a: `A process can be stopped for an unpredictable duration — GC pause, VM migration, OS scheduling, disk I/O — during which it can't detect that time has passed or leases have expired.` },
      { q: `Why are process pauses dangerous for distributed leases?`, a: `A node may believe it holds a lease, pause, and resume after the lease expired — it can then make writes believing it's the leader when another node has already taken over.` },
      { q: `What is clock confidence interval and why does it matter?`, a: `The range of uncertainty in a clock reading. Systems like Spanner use it to ensure causality — by waiting for the uncertainty window to pass before making a transaction visible.` },
      { q: `Can monotonic clocks be used across machines?`, a: `No — monotonic clocks have no absolute meaning; they're only meaningful within a single process. You can't compare monotonic timestamps from two different nodes.` },
    ],
  },

  {
    id: 'ddia-linearizability',
    title: 'Linearizability',
    icon: 'checkSquare',
    color: '#f59e0b',
    questions: 4,
    description: 'The recency guarantee that makes a distributed system appear as a single copy, its cost, and when you need it.',
    visualizations: [{ title: 'Linearizability Test and CAP Theorem', description: '', image: '/diagrams/ddia/linearizability-01.png' }],
    introduction: `Linearizability is the strongest consistency model for distributed systems. A linearizable system behaves as if there is only one copy of the data, and all operations take effect atomically at some point between their start and end time.

Informally: once a read returns value X, all subsequent reads (by any client) must also return X or a later value. You cannot read a stale value after observing a fresh one.

Linearizability vs serializability: serializability is about transaction isolation (concurrent transactions behave as if they ran in some serial order). Linearizability is about recency guarantees for individual reads and writes (a read reflects the most recent write). A system can be serializable but not linearizable (snapshot isolation) or linearizable but not serializable (single-object linearizable reads/writes without transaction support). Strict serializability = serializable + linearizable.

Cost: linearizability requires coordination on every operation. In a distributed system with N replicas, at least one round-trip to a quorum of replicas is needed per operation. During a network partition (CAP theorem), linearizability cannot be preserved while remaining available — you must either refuse operations (CP) or serve stale data (AP).

Use cases: leader election (only one leader at a time — requires linearizability), distributed locks (SELECT ... FOR UPDATE across nodes), unique constraints across a distributed database.`,
    whenToUse: [
      'Explaining CAP theorem and what is sacrificed for availability',
      'Justifying the use of ZooKeeper or etcd for distributed coordination',
      'Discussing why Cassandra (AP) cannot be used for leader election',
    ],
    keyConcepts: [
      { term: 'Linearizability', definition: 'All operations appear to take effect atomically at a single point in time. Once a read returns X, all subsequent reads return X or a later value.' },
      { term: 'Strict serializability', definition: 'Serializable isolation + linearizability. The strongest combined guarantee. Achieved by SSI on a single leader or Spanner.' },
      { term: 'CAP trade-off', definition: 'During a network partition, a linearizable system must refuse operations (become unavailable) rather than risk returning stale data.' },
      { term: 'Coordination service', definition: 'A system (ZooKeeper, etcd) that provides linearizable reads and writes, used for leader election, distributed locks, and cluster membership.' },
    ],
    pitfalls: [
      'Using Cassandra or DynamoDB (AP systems) for leader election — they cannot guarantee that two nodes will not simultaneously believe they are the leader.',
      'Conflating linearizability with serializability — they are orthogonal concepts that apply to different layers (individual operations vs transactions).',
    ],
    keyQuestions: [
      {
        question: 'When do you actually need linearizability?',
        answer: `Linearizability is needed when the correctness of the application depends on at most one entity seeing or holding a value at any moment — mutual exclusion.

Leader election: at most one node must believe it is the leader at any time. ZooKeeper and etcd provide linearizable writes that guarantee only one node can win an election. Cassandra (AP) cannot — two nodes could simultaneously believe they won.

Distributed locks: a lock must ensure mutual exclusion. If two services can simultaneously believe they hold a lock (due to stale replica reads), concurrent access to the protected resource can occur. Linearizable stores (Redis with Redlock caveats, etcd leases) are used for this.

Unique constraints in distributed databases: if a username must be globally unique across a sharded database, the uniqueness check requires linearizability — otherwise two nodes can simultaneously accept the same username.

Balance checks before debit: ensuring a balance is not overdrafted requires that the read of the balance and the conditional write happen atomically from a consistent view. Stale reads (non-linearizable) allow concurrent debits to both pass the balance check and both proceed.

For everything else — user profiles, feeds, configurations, analytics — linearizability is not required and the availability tax (becoming unavailable during partitions) is too high. Use eventual consistency or causal consistency instead.`,
      },
    ],
    quickFire: [
      { q: `What is the recency guarantee that linearizability provides?`, a: `Once a write completes, all subsequent reads must return that value or a newer one. Once any read returns a new value, no subsequent read from any node can return an old value.` },
      { q: `Is PostgreSQL REPEATABLE READ linearizable?`, a: `No. REPEATABLE READ uses snapshot isolation, which allows transactions to read from a consistent snapshot that may be stale. Two transactions starting at different times can read different values for the same row simultaneously.` },
      { q: `Why is partition tolerance not optional in the CAP theorem?`, a: `Network partitions (some nodes unable to communicate with others) happen in any real distributed system. You cannot choose to have no partitions, only to decide how to behave when they occur. So the real choice is C vs A during a partition.` },
      { q: `What consistency model does Cassandra provide by default?`, a: `Eventual consistency. Cassandra prioritizes availability over linearizability. With QUORUM reads and writes you can get stronger consistency but not linearizability. Cassandra's Lightweight Transactions (using Paxos) provide linearizable compare-and-set for specific operations.` },
      { q: `What does PACELC add to CAP?`, a: `PACELC adds the latency-vs-consistency tradeoff that exists even without partitions. CAP only describes behavior during partitions, but most of the time systems face a choice between low latency (return local replica's value) and consistency (coordinate with all replicas before returning).` },
      { q: `For what use cases is linearizability strictly required?`, a: `Leader election (exactly one leader), distributed lock acquisition (exactly one holder), unique constraint enforcement (one user per username), and cross-channel coordination where a reader must not observe a notification before the corresponding data write is visible.` },
      { q: `What is the difference between linearizability and sequential consistency?`, a: `Linearizability additionally requires that the linearization order must be consistent with real-time order: if operation A completes before operation B begins, A must appear before B. Sequential consistency only requires all nodes to observe the same total order, without the real-time constraint.` },
    ],
  },

  {
    id: 'ddia-ordering-and-causality',
    title: 'Ordering and Causality',
    icon: 'arrowDown',
    color: '#f59e0b',
    questions: 3,
    description: 'Why causal ordering matters in distributed systems, and how sequence number ordering and total order broadcast achieve it.',
    visualizations: [{ title: 'Lamport Clocks and Version Vectors', description: '', image: '/diagrams/ddia/ordering-and-causality-01.png' }],
    introduction: `Causality establishes a happens-before relationship: if operation A happened before operation B (B read the result of A, or they were part of the same request), then any replica must apply A before B. Violating causal order produces anomalies: a reply appears before the question, a deletion appears before the item.

Lamport timestamps can determine causal order between two events if one knows which happened first (they are causally related). But they cannot determine if two events are concurrent — two different Lamport timestamps do not tell you if they are causally related or independent.

Total order broadcast (atomic broadcast): a protocol that delivers all messages to all nodes in the same order, with no message dropped. Every node sees the same sequence of messages. This is equivalent to linearizability — if you can achieve total order broadcast, you can build a linearizable register on top of it. Zookeeper's ZAB protocol and etcd's Raft protocol implement total order broadcast.

Sequence numbers: assign a monotonically increasing sequence number to each operation, generated by a single leader (or by a consensus-based sequence number service). All replicas apply operations in sequence number order. This achieves causal consistency without full linearizability if the sequence numbers are assigned causally (a read that happened before a write is given a lower sequence number).

Lamport timestamps do not achieve total order: Lamport timestamps create a total order (break ties by node ID) but this order is not consistent with causality across nodes that did not communicate.`,
    whenToUse: [
      'Explaining why a distributed system needs total order broadcast for consistency',
      'Discussing the relationship between Raft consensus and linearizability',
      'Designing an event sourcing system that requires causal ordering',
    ],
    keyConcepts: [
      { term: 'Happens-before', definition: 'A causal relationship: A happens-before B means A causally influenced B (B read A\'s result, or both are in the same process in order).' },
      { term: 'Total order broadcast', definition: 'A protocol that delivers all messages to all nodes in the same total order. Equivalent to a linearizable log. Implemented by ZAB (ZooKeeper) and Raft.' },
      { term: 'Causal consistency', definition: 'All nodes see causally related operations in the correct order. Concurrent operations may be seen in any order. Achievable without global coordination.' },
    ],
    pitfalls: [
      'Confusing Lamport timestamps with total order broadcast — Lamport timestamps create a total order but it does not imply causal consistency in distributed systems.',
      'Using a single sequence number generator as a bottleneck — all writes must serialize through the sequence generator, limiting throughput.',
    ],
    keyQuestions: [
      {
        question: 'Why does event sourcing require causal ordering?',
        answer: `Event sourcing stores all state changes as an ordered log of events. The current state is reconstructed by replaying the events in order. If events are applied out of causal order, the state will be wrong.

Example: UserCreated event followed by UserEmailUpdated event. If a replica applies UserEmailUpdated before UserCreated, the email update refers to a user that does not exist yet. The system either errors or creates an inconsistent partial state.

More subtle: OrderPlaced event followed by InventoryReserved event (caused by the order). If a consumer processes InventoryReserved before OrderPlaced, the inventory reservation has no corresponding order to attach to. A naive implementation might ignore the reservation as orphaned; a correct implementation must hold the reservation until the order arrives or accept out-of-order events with compensating logic.

The fix: use a total order broadcast mechanism (Kafka partition ordering, a single Raft-backed log, or an event store with causal metadata). Within a Kafka partition, events are strictly ordered. Across partitions, use an event correlation ID and a grace window (hold InventoryReserved for N seconds waiting for the matching OrderPlaced).

Event sourcing and CQRS (Command Query Responsibility Segregation) systems that use Kafka ensure causal ordering by partitioning events by their aggregate root ID (order_id, user_id) — all events for a single aggregate are in one partition, preserving their causal order.`,
      },
    ],
    quickFire: [
      { q: `What is causal consistency?`, a: `A consistency model where causally related operations are seen in order by all nodes — if A causes B, every node that sees B has already seen A.` },
      { q: `What is the happened-before relationship?`, a: `Event A happened before event B if A could have causally influenced B — either A happened on the same node before B, or A's result was seen by B's node before B occurred.` },
      { q: `What are Lamport timestamps?`, a: `A logical clock scheme: each node tracks a counter, incrementing it on each event and setting it to max(local, received) + 1 on message receipt — provides total ordering consistent with causality.` },
      { q: `What can Lamport timestamps NOT do?`, a: `They cannot tell you if two events are concurrent — if A < B in Lamport order, B might have happened before A in real time. They only enforce a consistent total order.` },
      { q: `What is total order broadcast?`, a: `A protocol that delivers messages to all nodes in the same order — no node sees message M2 before M1, for all nodes. Used to implement replicated state machines.` },
      { q: `What is the relationship between total order broadcast and linearizability?`, a: `Total order broadcast is equivalent to consensus — you can build a linearizable register from total order broadcast and vice versa. They're the same problem in different clothing.` },
      { q: `Why is total order broadcast harder than causal broadcast?`, a: `Causal order only requires agreement on causally related events. Total order requires a globally consistent order for ALL events, even concurrent ones — requiring consensus.` },
      { q: `How can you use total order broadcast to implement a linearizable compare-and-set?`, a: `Append the operation to the log; it's linearizable because all nodes process the log in the same order — the first successful CAS in the log wins.` },
    ],
  },

  {
    id: 'ddia-consensus-algorithms',
    title: 'Consensus Algorithms: Paxos and Raft',
    icon: 'users',
    color: '#f59e0b',
    questions: 5,
    description: 'How consensus is achieved in distributed systems, how Raft works, and what problems consensus solves.',
    visualizations: [{ title: 'Raft Leader Election and Log Replication', description: '', image: '/diagrams/ddia/consensus-01.png' }],
    introduction: `Consensus is the problem of getting multiple nodes to agree on a value. Consensus is needed for: leader election (agree on who is leader), atomic commit in distributed transactions (all nodes agree to commit or abort), and total order broadcast (agree on the order of messages).

Paxos (Lamport, 1989): the original theoretical consensus algorithm. Notoriously difficult to understand and implement. Multi-Paxos (the practical variant) forms the basis of many production systems.

Raft (Ongaro & Ousterhout, 2014): designed to be understandable. Separates consensus into three problems: leader election, log replication, and safety.

Raft leader election: nodes start as followers. If a follower receives no heartbeat from a leader for an election timeout (150-300ms, randomized), it becomes a candidate, increments its term, and requests votes from other nodes. A node wins if it receives votes from a majority. Terms ensure old leaders cannot act after a new election.

Raft log replication: all writes go to the leader. The leader appends the entry to its log and sends AppendEntries RPCs to all followers in parallel. When a majority acknowledges the entry, it is committed. The leader then applies it to its state machine and sends the response to the client.

Safety: a committed log entry is never lost. Raft ensures this with two invariants: (1) a leader has all committed entries (election requires a majority vote, and a candidate must have as up-to-date a log as any majority member), (2) entries are committed only when a majority acknowledges them.

FLP impossibility: in an asynchronous system (no bounded message delays), no deterministic algorithm can solve consensus if even one process can fail. Raft circumvents this with randomized election timeouts (not truly asynchronous).`,
    whenToUse: [
      'Explaining how etcd or ZooKeeper achieves consistency',
      'Discussing distributed database leader election in a design',
      'Explaining the difference between single-leader replication and Raft-based replication',
    ],
    keyConcepts: [
      { term: 'Consensus', definition: 'Multiple nodes agreeing on a single value, even in the presence of node failures. Required for leader election, distributed locking, and atomic commit.' },
      { term: 'Raft term', definition: 'A monotonically increasing epoch number. Each election starts a new term. Messages from old terms are rejected, preventing split-brain from stale leaders.' },
      { term: 'Quorum majority', definition: 'Raft requires a majority (N/2 + 1) of nodes to acknowledge a log entry before committing. Ensures no two majorities can have conflicting committed entries.' },
      { term: 'FLP impossibility', definition: 'In a fully asynchronous system, consensus is impossible if even one process can fail. Practical systems use randomized timeouts to work around this theoretical limit.' },
      { term: 'Log replication', definition: 'Raft replicates all writes as log entries from leader to followers. The log is the source of truth; the state machine is derived from replaying the log.' },
    ],
    pitfalls: [
      'Implementing Raft with fixed election timeouts — if all nodes time out simultaneously, repeated split elections occur. Randomized timeouts prevent this.',
      'Deploying a Raft cluster with an even number of nodes — with 4 nodes, a split (2 vs 2) cannot achieve majority. Use odd numbers (3, 5, 7).',
    ],
    keyQuestions: [
      {
        question: 'Walk through what happens in Raft when the current leader fails.',
        answer: `Followers stop receiving heartbeats from the leader. Each follower has a randomized election timeout (e.g., 150-300ms). The first follower to time out transitions to candidate state, increments its term, votes for itself, and sends RequestVote RPCs to all other nodes.

A follower grants its vote to a candidate if: (1) it has not already voted in this term, and (2) the candidate's log is at least as up-to-date as its own (comparison by last log term and index). The "at least as up-to-date" rule ensures the winner has all committed entries.

The candidate wins if it receives votes from a majority (N/2 + 1 nodes). It immediately sends heartbeats to all nodes to establish its authority and suppress other candidates.

If no candidate wins (split vote — multiple candidates, votes divided), all candidates time out again (randomized to avoid repeated splits) and a new election starts with a higher term.

Once elected, the new leader begins serving requests. If there were uncommitted entries from the old leader's log (entries acknowledged by fewer than a majority of followers), the new leader does not commit them until it has a new entry in the current term that achieves majority acknowledgment. This is Raft's "leader completeness" property.

Recovery time: typically 150-600ms for election timeout + heartbeat propagation. For production systems, this means a leader failure causes roughly 300-600ms of unavailability.`,
      },
    ],
    quickFire: [
      { q: `How many nodes can a 5-node Raft cluster lose while maintaining a quorum?`, a: `2 nodes. A quorum requires a strict majority: 3 of 5 nodes must be available. If 3 fail, the remaining 2 cannot form a quorum and the cluster stops accepting writes.` },
      { q: `What is the purpose of a term number in Raft?`, a: `Terms are monotonically increasing epoch numbers that identify each leader election round. A node that sees a higher term immediately becomes a follower, preventing a partitioned old leader from issuing conflicting writes after a new leader is elected.` },
      { q: `What is an ephemeral node in ZooKeeper?`, a: `A znode automatically deleted when the client session that created it expires. Used for failure detection: a process registers an ephemeral node on startup; if the process crashes and misses heartbeats, ZooKeeper deletes the node and notifies all watchers.` },
      { q: `Why is the log completeness property critical in Raft?`, a: `It ensures a candidate can only become leader if its log is at least as up-to-date as a majority of nodes. This guarantees that committed entries (which a majority have appended) are always present in the new leader's log and will never be lost.` },
      { q: `What replaced ZooKeeper in Kafka and why?`, a: `KRaft (Kafka Raft), an internal Raft-based metadata system using a dedicated quorum of controller brokers. It eliminates the external ZooKeeper dependency, reduces startup time, and supports 10x more partitions per cluster.` },
      { q: `What does the FLP impossibility result state?`, a: `In a purely asynchronous distributed system with even one crash-faulty process, no deterministic consensus algorithm can guarantee both safety and liveness (termination). Practical algorithms escape this via randomization or partial synchrony assumptions.` },
      { q: `What is total order broadcast and why is it equivalent to consensus?`, a: `Total order broadcast delivers messages to all nodes in the same total order, with no messages lost. It is equivalent to consensus: given total order broadcast, you can implement consensus (agree on message sequence); given consensus, you can implement total order broadcast (agree on the next message to deliver).` },
    ],
  },

  {
    id: 'ddia-zookeeper-and-coordination',
    title: 'ZooKeeper, etcd, and Distributed Coordination',
    icon: 'anchor',
    color: '#f59e0b',
    questions: 3,
    description: 'How ZooKeeper and etcd provide linearizable coordination primitives for distributed systems: locks, leader election, and service discovery.',
    visualizations: [{ title: 'ZooKeeper Coordination Service', description: '', image: '/diagrams/ddia/zookeeper-and-coordination-01.png' }],
    introduction: `ZooKeeper and etcd are coordination services — they provide linearizable reads and writes on a small dataset (configuration, membership, locks) that distributed systems use for coordination.

Both implement total order broadcast (ZAB for ZooKeeper, Raft for etcd). This gives them: linearizable writes, sequential consistency for reads, and durable storage of small amounts of data.

Coordination primitives built on top:

Distributed lock: create an ephemeral node (ZooKeeper) or write a key with a TTL (etcd) with a lease. The node or key disappears when the client session expires. Use compare-and-swap (CAS) to acquire the lock — only the CAS operation succeeds; others retry.

Leader election: candidates each try to create the same ephemeral node (or CAS a key). Only one succeeds. All candidates watch the node for deletion (if the leader crashes, its session expires, the node is deleted, and followers see the watch trigger and start a new election).

Service discovery and configuration: services register their endpoints as nodes. Other services watch for changes. ZooKeeper watches trigger immediately on change.

Limitations: ZooKeeper and etcd are not designed for high-throughput application data. Use them for small amounts of coordination data (config, membership, locks), not as a general database.

Fencing token: when using etcd for distributed locking, a fencing token (a monotonically increasing number tied to the lock grant) prevents a slow lock holder (zombie) from writing to the protected resource after its lease has expired. The protected resource rejects requests with a lower fencing token than the current lock holder.`,
    whenToUse: [
      'Explaining how Kafka uses ZooKeeper (or KRaft) for broker coordination',
      'Designing a distributed lock or leader election system',
      'Discussing fencing tokens as a safeguard against split-brain write conflicts',
    ],
    keyConcepts: [
      { term: 'Ephemeral node', definition: 'A ZooKeeper node that is automatically deleted when the client session that created it disconnects. Used for locks and leader election.' },
      { term: 'Watch', definition: 'A ZooKeeper mechanism where a client registers interest in a node; the server notifies the client on any change. Used for service discovery and leader election triggers.' },
      { term: 'Fencing token', definition: 'A monotonically increasing number issued with each lock grant. The protected resource rejects writes from clients presenting a lower token, preventing stale lock holders from corrupting data.' },
      { term: 'etcd lease', definition: 'A TTL-based lock in etcd. The lock holder must renew the lease periodically; failure to renew causes the lease to expire and the lock to be released.' },
    ],
    pitfalls: [
      'Using ZooKeeper for high-throughput data storage — it is optimized for coordination data (small keys, few writes), not for millions of records.',
      'Relying on a distributed lock without a fencing token — a slow lock holder can resume after its lease expires and corrupt the protected resource.',
    ],
    keyQuestions: [
      {
        question: 'How do you implement a distributed lock safely using etcd?',
        answer: `The safe approach uses etcd leases with fencing tokens and a compare-and-swap.

Acquire: the client creates a lease with a TTL (e.g., 30 seconds). Using the lease ID, the client does a compare-and-swap PUT: write lock_key = my_client_id only if the key does not already exist (transaction: if not exists, put with lease). If the CAS succeeds, the client holds the lock. If it fails, another client holds it.

Renew: the client periodically renews the lease before it expires (keepalive). If the client crashes, the lease expires and the lock is automatically released.

Fencing: when the lock is granted, etcd returns the lease ID, which acts as the fencing token. The protected resource (e.g., a database row, a file) is passed the fencing token on each write. The resource maintains the last seen token. If a request arrives with a lower fencing token (from a stale lock holder whose lease expired but which did not know it), the resource rejects the write.

Release: explicitly delete the lock key, releasing the lock before the lease expires. This allows other waiters to acquire immediately rather than waiting for the TTL.

Why CAS is critical: without compare-and-swap, two clients could both read "no lock holder," both decide to write, and both write — two holders simultaneously. etcd's transaction guarantees atomicity of the check and write.`,
      },
    ],
    quickFire: [
      { q: `What is ZooKeeper?`, a: `A distributed coordination service providing linearizable writes, sequential-consistency reads, leader election, distributed locks, and service discovery via a hierarchical namespace.` },
      { q: `What kind of data does ZooKeeper store?`, a: `Small amounts of slowly-changing metadata — partition assignments, leader identity, service addresses. Not for large or frequently-written data.` },
      { q: `What are ephemeral nodes in ZooKeeper?`, a: `ZNodes that automatically disappear when the client session that created them ends — used for failure detection since a crashed node's ephemeral nodes are cleaned up automatically.` },
      { q: `How does ZooKeeper enable leader election?`, a: `Multiple nodes try to create the same ephemeral sequential ZNode; whoever gets the lowest sequence number is leader. Others watch the next-lowest node to detect leadership changes.` },
      { q: `What consistency does ZooKeeper provide for reads vs writes?`, a: `Writes are linearizable (go through the ZooKeeper leader). Reads are sequentially consistent — they may return slightly stale data but are always from the node's own monotonic log.` },
      { q: `How does ZooKeeper support distributed locks?`, a: `Clients create ephemeral sequential nodes; the client with the lowest-numbered node holds the lock. When it releases or crashes, the next client's watch fires.` },
      { q: `What is a ZooKeeper watch?`, a: `A one-time notification mechanism — a client registers a watch on a ZNode and receives an event when that node changes, allowing reactive coordination without polling.` },
      { q: `What are the limitations of ZooKeeper?`, a: `Not suitable for storing large data volumes, high-throughput writes, or application data — it's designed for coordination metadata only and has limited write throughput.` },
    ],
  },

  // ── BATCH PROCESSING ─────────────────────────────────────────────────────────

  {
    id: 'ddia-mapreduce',
    title: 'MapReduce',
    icon: 'cpu',
    color: '#06b6d4',
    questions: 4,
    description: 'How MapReduce works, its design philosophy of bringing computation to data, and its limitations that led to Spark.',
    visualizations: [{ title: 'MapReduce Word Count Data Flow', description: '', image: '/diagrams/ddia/mapreduce-01.png' }],
    introduction: `MapReduce (Google, 2004) is a programming model for processing large datasets across a cluster. It abstracted parallel computation into two functions: map and reduce.

Map: applied to each input record independently. Emits zero or more (key, value) pairs.

Shuffle: the MapReduce framework groups all emitted values by key and sorts them. All values for key K are delivered to the same reducer.

Reduce: applied to each key and its list of values. Emits the final output.

The framework handles: distributing data, parallelizing computation, handling node failures (re-runs failed map or reduce tasks on other nodes), and managing intermediate data on local disks.

Design philosophy: bring computation to data. HDFS (Hadoop Distributed File System) stores data distributed across nodes. MapReduce runs the map task on the node that stores the input data — network transfer is minimized by reading local data.

Limitations: MapReduce writes intermediate results to disk between map and reduce phases. For iterative algorithms (machine learning, graph algorithms) that require many passes over the data, MapReduce is slow — each iteration requires reading and writing all data to disk.

Spark addresses this by keeping intermediate data in memory (RDDs — Resilient Distributed Datasets). For iterative workloads, Spark is 10-100x faster than MapReduce. For single-pass ETL on data that does not fit in memory, the difference is smaller.

Modern context: raw MapReduce is rarely used today. Spark, Flink, and BigQuery provide higher-level abstractions (SQL, DataFrame API) on top of distributed compute.`,
    whenToUse: [
      'Explaining the Hadoop ecosystem and why Spark replaced raw MapReduce',
      'Discussing distributed data processing architecture decisions',
      'Explaining the locality principle in large-scale data processing',
    ],
    keyConcepts: [
      { term: 'Map phase', definition: 'Applied to each input record independently. Emits (key, value) pairs. Parallelized across all input data splits.' },
      { term: 'Shuffle phase', definition: 'Groups and sorts emitted (key, value) pairs by key. Transfers data across the network to the correct reducer. Most expensive phase.' },
      { term: 'Reduce phase', definition: 'Applied to each key and all its values. Aggregates, filters, or transforms to produce final output.' },
      { term: 'Data locality', definition: 'Running the map task on the node storing the input data, avoiding network transfer. A core design principle of MapReduce on HDFS.' },
      { term: 'RDD (Spark)', definition: 'Resilient Distributed Dataset — Spark\'s in-memory distributed data structure. Keeps intermediate results in RAM, enabling fast iterative processing.' },
    ],
    pitfalls: [
      'Using MapReduce for iterative algorithms (k-means, PageRank) — each iteration requires a full disk read/write cycle. Use Spark instead.',
      'Forgetting that the shuffle phase transfers all intermediate data across the network — a poorly designed map function that emits too many large values causes network saturation.',
    ],
    keyQuestions: [
      {
        question: 'Why did Spark replace MapReduce for iterative workloads?',
        answer: `MapReduce writes all intermediate results to HDFS (disk) between the map and reduce phases, and between each MapReduce job in a multi-job pipeline. For a machine learning algorithm that requires 100 iterations over the same dataset, that is 200 disk read/write cycles for the intermediate data.

Spark uses Resilient Distributed Datasets (RDDs) — distributed collections held in RAM across the cluster. Transformations (map, filter, join) build a lazy computation graph. When an action (count, collect, save) is triggered, Spark executes the graph. Intermediate results stay in RAM between operations.

For k-means clustering with 100 iterations: MapReduce reads the entire dataset from HDFS 100 times. Spark reads it once, keeps it in the RDD cache, and applies each iteration's transformations in memory. The speedup is roughly proportional to the number of iterations.

For single-pass ETL (read CSV, transform, write Parquet) where data does not fit in RAM, the advantage shrinks — both MapReduce and Spark must process data in batches that fit in available memory.

Spark's additional advantages: a rich API (SQL, DataFrame, MLlib, GraphX), interactive querying via spark-shell, and better support for streaming (Spark Structured Streaming) vs MapReduce's batch-only model.`,
      },
    ],
    quickFire: [
      { q: `What is the default HDFS block size and replication factor?`, a: `128MB block size, 3x replication across different nodes and racks.` },
      { q: `What is a combiner in MapReduce and when can it be used?`, a: `A combiner is an optional local aggregation step run after Map and before shuffle. It reduces the data transferred during shuffle. It can only be used for commutative and associative operations (like sum, count, max) where partial aggregation does not change the final result.` },
      { q: `Why does Spark outperform MapReduce for iterative machine learning jobs?`, a: `Spark keeps intermediate datasets in memory (RDDs), avoiding disk I/O between iterations. MapReduce writes all intermediate output to HDFS between stages. An iterative ML algorithm with 100 iterations would read/write HDFS 100 times in MapReduce vs once in Spark.` },
      { q: `What happens if a Map task fails mid-execution?`, a: `The framework re-schedules the failed Map task on another node. The failed task's partial output on local disk is discarded. Only the specific failed task is retried, not the entire job. This is safe because Map tasks are deterministic and idempotent.` },
      { q: `What is speculative execution and why is determinism required?`, a: `Speculative execution launches a duplicate copy of a slow task on another node, using whichever finishes first. Determinism is required because both copies of the task must produce identical output; otherwise the framework cannot safely choose between two different results.` },
      { q: `What does the NameNode store and why is it a single point of failure concern?`, a: `The NameNode stores all HDFS filesystem metadata in memory: file-to-block mappings, block-to-DataNode mappings, and filesystem namespace. If the NameNode fails without a backup (HDFS HA uses a standby NameNode with shared edit log via ZooKeeper), the entire HDFS cluster is unavailable even though DataNodes are fine.` },
      { q: `How does MapReduce ensure output atomicity?`, a: `Tasks write to a temporary directory. On successful completion, the output is renamed (atomically, using HDFS's rename operation) to the final output directory. If a task fails, the temporary output is discarded. Readers only see complete output, never partial results.` },
    ],
  },

  {
    id: 'ddia-beyond-mapreduce',
    title: 'Beyond MapReduce: Dataflow Engines',
    icon: 'zap',
    color: '#06b6d4',
    questions: 3,
    description: 'Spark, Flink, Tez, and the dataflow model that replaces MapReduce with DAG-based execution.',
    visualizations: [{ title: 'MapReduce vs Spark DAG', description: '', image: '/diagrams/ddia/beyond-mapreduce-01.png' }],
    introduction: `MapReduce's rigid two-phase model (map → shuffle → reduce) is a poor fit for complex pipelines with many stages. Each stage requires writing intermediate results to disk, and pipelines of 10 MapReduce jobs write to disk 10 times.

Dataflow engines (Spark, Flink, Tez, Google Dataflow/Beam) represent computation as a directed acyclic graph (DAG) of operators. Operators communicate via in-memory streams rather than disk files. The engine schedules operators for maximum parallelism, avoiding unnecessary disk I/O.

Spark DAG: Spark translates the logical plan (RDD transformations) into a physical DAG of stages. Each stage is a set of map-side operations that can be pipelined in memory. Stages are separated by shuffle boundaries (groupByKey, reduceByKey). Within a stage, data flows through operators without touching disk.

Flink: a true streaming engine that also handles batch as a special case of streaming (bounded streams). Flink's streaming model provides lower latency and more fine-grained control than Spark's micro-batch approach.

Apache Beam: a unified programming model for both batch and streaming. Runners execute Beam pipelines on Spark, Flink, or Google Dataflow. Enables write-once-run-anywhere data pipelines.

The practical question for design interviews: Spark is the industry standard for batch processing (ETL, ML training data prep). Flink is the standard for streaming (real-time feature computation, fraud detection). For petabyte-scale SQL analytics, BigQuery or Redshift.`,
    whenToUse: [
      'Choosing between Spark and Flink for a data processing use case',
      'Explaining the DAG execution model vs MapReduce',
      'Designing an ETL pipeline or ML feature engineering pipeline',
    ],
    keyConcepts: [
      { term: 'DAG (Directed Acyclic Graph)', definition: 'The execution plan of a dataflow pipeline. Nodes are operators; edges are data flows. Engines optimize the DAG for parallelism and memory efficiency.' },
      { term: 'Stage (Spark)', definition: 'A group of operators separated by shuffle boundaries. Within a stage, data flows in memory. Between stages, data is shuffled (network transfer + optional disk spill).' },
      { term: 'Apache Beam', definition: 'A unified API for batch and streaming pipelines. Runs on Spark, Flink, or Google Dataflow without code changes.' },
    ],
    pitfalls: [
      'Using Spark Structured Streaming for sub-second latency requirements — Spark operates in micro-batches (minimum ~100ms); use Flink or Kafka Streams for true low-latency streaming.',
      'Over-partitioning a Spark job — too many small partitions causes excessive scheduler overhead. Aim for partitions of 100-200MB each.',
    ],
    keyQuestions: [
      {
        question: 'When would you use Flink instead of Spark?',
        answer: `I choose Flink when: (1) sub-second latency is required, (2) event-time processing with out-of-order events is central to the use case, or (3) stateful streaming operations need to be maintained indefinitely.

Spark Structured Streaming uses micro-batches: it accumulates events for a configured interval (minimum ~100ms, typically 1-5 seconds) and processes them as a batch. This gives throughput but adds latency.

Flink uses a true streaming model: events are processed record by record as they arrive. Latency can be as low as a few milliseconds. For real-time fraud detection (flag a suspicious transaction within 100ms) or real-time bidding (respond to an ad bid within 50ms), Flink's latency advantage is decisive.

Flink's watermark and event-time model is also more sophisticated. When processing out-of-order events from Kafka (a mobile client that was offline and sends buffered events), Flink handles late arrivals correctly via configurable watermarks and late data handling. Spark can do event-time processing but with more complexity.

For batch ETL, data warehouse loading, and ML training data preparation — workloads with no latency requirement — Spark is simpler, has a larger ecosystem (Delta Lake, MLlib), and is generally the better choice.`,
      },
    ],
    quickFire: [
      { q: `What is the core problem with MapReduce's fault tolerance approach?`, a: `MapReduce materializes all intermediate results to HDFS after each map and reduce phase — this is very slow due to repeated disk I/O even when no failure occurs.` },
      { q: `How do dataflow engines like Spark differ from MapReduce?`, a: `Operators can be composed into a pipeline without forcing a sort-and-shuffle between every step. Intermediate results can stay in memory rather than being written to disk.` },
      { q: `What is a dataflow engine operator?`, a: `A processing function (analogous to a mapper or reducer) that consumes input partitions and produces output — but without MapReduce's rigid map → shuffle → reduce structure.` },
      { q: `How does Spark handle fault tolerance without materializing intermediate results?`, a: `Spark tracks the lineage of each RDD (how it was computed). On failure, it recomputes only the lost partitions from the last checkpointed or source data.` },
      { q: `What is the key advantage of Flink's streaming-first model?`, a: `Flink treats batch as a special case of streaming — the same engine handles both, and fault tolerance uses checkpointing rather than materializing all intermediate state.` },
      { q: `Why does avoiding the sort-and-shuffle matter?`, a: `The shuffle requires all map tasks to finish before any reduce task can start, plus it writes all intermediate data to disk — skipping it when unnecessary dramatically reduces latency.` },
      { q: `What is a broadcast join in dataflow engines?`, a: `A small dataset is sent (broadcast) to every partition of a large dataset so each partition can join locally — avoids a shuffle entirely when one side fits in memory.` },
    ],
  },

  {
    id: 'ddia-joins-in-batch',
    title: 'Joins in Batch Processing',
    icon: 'gitMerge',
    color: '#06b6d4',
    questions: 3,
    description: 'Sort-merge join, broadcast join, and how distributed systems join datasets that do not fit on one machine.',
    visualizations: [{ title: 'Batch Join Algorithms', description: '', image: '/diagrams/ddia/joins-in-batch-01.png' }],
    introduction: `Joining large datasets in a distributed batch job requires moving data across the network. The strategy depends on the relative sizes of the datasets being joined.

Sort-merge join (shuffle join): both datasets are shuffled by the join key. All records with the same key land on the same partition. Each partition performs a local sort + merge join. Cost: O(N log N) total data transfer. Required when both datasets are large (neither fits in memory of one node).

Broadcast hash join: if one dataset is small enough to fit in memory of each executor, replicate it to every node. Each node builds an in-memory hash table from the small dataset. The large dataset is scanned locally on each node and probed against the in-memory hash table. No shuffle needed for the large dataset — O(small) network transfer. Typically the most efficient join strategy when the small table fits in a few hundred MB.

Map-side join (Hadoop): if both datasets are pre-sorted and co-partitioned (same number of partitions, same partition key), they can be joined locally on each node with no shuffle. The join is a simple merge of two sorted streams on each partition. Requires pre-sorting as a setup cost.

Skew handling: if the join key is highly skewed (one user_id has 1000x more records than average), the partition for that key becomes a hot spot. Mitigation: salt the hot key with a random suffix, split it across multiple partitions, and then reduce.`,
    whenToUse: [
      'Designing a Spark ETL pipeline that joins a large fact table with dimension tables',
      'Explaining why broadcast joins are the default in Spark for small tables',
      'Discussing skew handling in distributed join operations',
    ],
    keyConcepts: [
      { term: 'Sort-merge join', definition: 'Shuffle both datasets by join key, sort within partitions, merge-join. Correct for any data size; expensive for large datasets due to full shuffle.' },
      { term: 'Broadcast hash join', definition: 'Replicate the smaller dataset to every executor as a hash table. Scan the larger dataset locally and probe the hash table. No shuffle of the large dataset.' },
      { term: 'Join skew', definition: 'A hot join key whose partition receives disproportionate data, causing one executor to be slow while others finish early. Fixed with salting.' },
      { term: 'Salting', definition: 'Appending a random integer to hot keys to distribute their records across multiple partitions. Requires a secondary aggregation step to merge results from all salt partitions.' },
    ],
    pitfalls: [
      'Performing a shuffle join when one table is small enough for a broadcast join — shuffle joins are orders of magnitude slower than broadcast joins for large vs small table scenarios.',
      'Not handling join skew in Spark — one slow task blocks the entire stage from completing.',
    ],
    keyQuestions: [
      {
        question: 'How does Spark decide which join strategy to use?',
        answer: `Spark's query planner chooses the join strategy based on table statistics and configuration thresholds.

Broadcast join: if either table is smaller than spark.sql.autoBroadcastJoinThreshold (default 10MB, commonly tuned to 100MB-1GB), Spark automatically broadcasts the smaller table. The broadcast table is replicated to all executor JVMs; each executor builds an in-memory hash map and probes it against its partition of the larger table. No network shuffle of the large table.

Sort-merge join: when both tables are larger than the broadcast threshold. Both tables are shuffled by the join key across the cluster. Each partition receives all records for a subset of keys from both tables, sorts them, and performs a merge join. This is expensive but correct for any data size.

Shuffle hash join: an intermediate option — shuffle both tables by key, then build a hash table from the smaller side within each partition. Faster than sort-merge (no sort step) but requires the smaller side of each partition to fit in memory.

Manual hints: in Spark SQL, you can force a join strategy with hints: SELECT /*+ BROADCAST(small_table) */ ... or SELECT /*+ MERGE(large_table) */ .... Useful when Spark's statistics are stale or inaccurate.

Practical tuning: for a star-schema join (one large fact table, several small dimension tables), setting autoBroadcastJoinThreshold to 256MB and pre-caching dimension tables eliminates all shuffle joins, typically reducing job runtime by 3-5x.`,
      },
    ],
    quickFire: [
      { q: `What is a sort-merge join in MapReduce?`, a: `Both input datasets are keyed by the join key and sent through the shuffle — after sorting, records with the same key arrive together at the reducer, where the join is performed.` },
      { q: `What is a broadcast hash join?`, a: `The smaller dataset is loaded into a hash table in memory on each mapper. The mapper scans the larger dataset and looks up join keys in the in-memory hash table — no shuffle needed.` },
      { q: `What is a partitioned hash join?`, a: `Both datasets are partitioned by the same join key hash so matching keys end up in the same partition. Each partition pair is then joined in memory — requires both sides to partition consistently.` },
      { q: `What is a hot key in batch joins, and why is it a problem?`, a: `A key that appears disproportionately often (e.g., a celebrity user). All records with that key go to one reducer, causing skew — that reducer becomes a bottleneck.` },
      { q: `How can you mitigate hot key skew in sort-merge joins?`, a: `Split the hot key's records across multiple reducers by appending a random suffix — then combine partial results. Or use a separate broadcast join for the hot-key side.` },
      { q: `What is GROUP BY skew and how do you handle it?`, a: `Aggregating a hot key produces a massive intermediate group. Mitigate with two-phase aggregation: partially aggregate with a random reducer key, then combine partial results.` },
      { q: `What is the difference between a reduce-side join and a map-side join?`, a: `Reduce-side joins shuffle data by key and join in reducers — flexible but expensive. Map-side joins (broadcast or partitioned hash) avoid the shuffle entirely — faster but require assumptions about input.` },
      { q: `When is a broadcast hash join not applicable?`, a: `When the smaller dataset doesn't fit in memory on each mapper — you need a partitioned hash join or sort-merge join instead.` },
    ],
  },

  // ── STREAM PROCESSING ─────────────────────────────────────────────────────────

  {
    id: 'ddia-event-streams',
    title: 'Event Streams and Message Brokers',
    icon: 'activity',
    color: '#ec4899',
    questions: 5,
    description: 'Kafka vs traditional message queues, log-based messaging, consumer groups, and the advantages of durable event logs.',
    visualizations: [{ title: 'Traditional Broker vs Kafka Log', description: '', image: '/diagrams/ddia/event-streams-01.png' }],
    introduction: `Message brokers route messages from producers to consumers. Two models exist:

Traditional message queues (RabbitMQ, ActiveMQ): messages are pushed to consumers. Once acknowledged, messages are deleted. A message is delivered to exactly one consumer. Consumers compete for messages within a queue. Good for task distribution (work queues).

Log-based message brokers (Kafka): messages are written to an append-only partitioned log. Consumers maintain their own offset (position) in the log. Messages are not deleted after consumption — they are retained for a configurable period (days or weeks). Multiple consumer groups can read the same stream independently. A new consumer group starts at the beginning of the log and replays history.

Kafka advantages: durability (messages survive consumer restart), replayability (reprocess historical events), multiple independent consumers (metrics pipeline and audit pipeline both read the same Kafka topic), and high throughput (sequential writes and reads).

Kafka partitions: each topic is split into N partitions. Messages with the same key always go to the same partition (guaranteed ordering per key). Consumers in the same consumer group divide partitions among themselves — one consumer per partition at most.

Consumer groups enable fan-out: multiple consumer groups reading the same topic each see all messages independently. Adding a new consumer group does not affect existing consumers.

Offset management: consumers commit their offset to Kafka after processing a message. On restart, they resume from the last committed offset. At-least-once delivery (may reprocess if crash before commit) is the default; exactly-once is achievable with idempotent producers and transactional APIs.`,
    whenToUse: [
      'Designing an event-driven architecture with Kafka in a system design interview',
      'Explaining consumer groups and partition assignments',
      'Discussing at-least-once vs exactly-once delivery semantics',
    ],
    keyConcepts: [
      { term: 'Kafka partition', definition: 'An ordered, immutable sequence of messages within a topic. Consumed by at most one consumer per consumer group. Enables parallelism and ordered delivery per key.' },
      { term: 'Consumer group', definition: 'A group of consumers that collectively consume a topic. Each partition is assigned to one consumer. Different consumer groups get independent copies of all messages.' },
      { term: 'Offset', definition: 'The position of a consumer in a Kafka partition log. Committed to Kafka after successful message processing. Resumes from the last committed offset after restart.' },
      { term: 'Log retention', definition: 'Kafka retains messages for a configured duration (e.g., 7 days) or size. Enables replay and supports consumers that fell behind.' },
      { term: 'At-least-once delivery', definition: 'Messages may be delivered more than once (if a consumer crashes after processing but before committing the offset). Consumers must be idempotent.' },
    ],
    pitfalls: [
      'Using a Kafka topic with too few partitions — the maximum consumer parallelism per consumer group equals the partition count. Too few partitions creates a throughput ceiling.',
      'Not committing offsets after processing — all messages since the last committed offset are reprocessed on restart.',
      'Assuming Kafka guarantees ordering across partitions — ordering is only guaranteed within a single partition.',
    ],
    keyQuestions: [
      {
        question: 'How does Kafka guarantee message ordering?',
        answer: `Kafka guarantees ordering within a partition, not across partitions.

Within a partition: messages are appended to an immutable log in order. A consumer reading partition P sees messages in exactly the order they were produced. A single consumer reads a single partition sequentially — no interleaving from other consumers.

Across partitions: no ordering guarantee. If a topic has 10 partitions, messages produced to different partitions may be consumed in any interleaved order.

How to use ordering correctly: produce messages with the same key (e.g., order_id, user_id). Kafka's default partitioner hashes the key to determine the partition. All messages with the same key go to the same partition, preserving causal order for that entity.

Example: an e-commerce order lifecycle — OrderPlaced, PaymentConfirmed, OrderShipped, OrderDelivered — all produced with the same order_id key go to the same partition. The consumer processes them in order.

Tradeoff: ordering per key means one partition per key in the extreme case. More partitions allow more parallelism (more consumers) but require careful key selection to balance load. A skewed key distribution (one order_id with 10M messages) creates a hot partition.`,
      },
    ],
    quickFire: [
      { q: `What is the fundamental difference between Kafka and RabbitMQ in terms of message retention?`, a: `RabbitMQ deletes messages after acknowledgment; they are not replayable. Kafka retains messages on disk for a configurable period regardless of consumption. Any consumer can read from any offset, enabling replay and multiple independent downstream consumers.` },
      { q: `How does Kafka ensure exactly-once delivery semantics?`, a: `Kafka provides exactly-once within Kafka using idempotent producers (sequence numbers prevent duplicate writes on retry) and transactions (atomic write across multiple partitions, including the __consumer_offsets topic). End-to-end exactly-once also requires idempotent downstream writes.` },
      { q: `What is log compaction and when would you use it?`, a: `Log compaction retains only the latest value per key, deleting older values with the same key. Use it when a topic represents a changelog (CDC, event sourcing) and consumers need to reconstruct current state without replaying all history. New consumers can read from the beginning of a compacted topic to get the current snapshot.` },
      { q: `You have a Kafka topic with 8 partitions and 10 consumers in one group. What happens?`, a: `Only 8 consumers are active (one per partition). The remaining 2 consumers are idle. To utilize all 10 consumers, you need at least 10 partitions.` },
      { q: `What is the stream-table duality?`, a: `A stream is a sequence of change events; a table is the aggregated current state. A table can be derived from a stream by applying all changes. A stream can be derived from a table by emitting a change event on every insert, update, or delete. Kafka Streams and Flink exploit this to join streams with tables.` },
      { q: `Why does Kafka use the sendfile system call?`, a: `sendfile is a Linux kernel optimization that copies data from disk (page cache) directly to the network socket without passing through user-space memory. This eliminates two memory copies, reduces CPU usage, and is a primary reason for Kafka's high throughput at low CPU cost.` },
      { q: `What is the at-least-once delivery guarantee and when is it violated in Kafka?`, a: `At-least-once means a message is delivered one or more times; duplicates are possible but no messages are lost. In Kafka, at-least-once is violated (becoming at-most-once) if you commit the offset before successfully processing the message, causing the message to be skipped if the consumer crashes after committing but before processing.` },
      { q: `What determines which partition a Kafka producer writes a message to?`, a: `If a partition key is specified, the key is hashed (murmur2 hash) modulo the number of partitions, deterministically routing all messages with the same key to the same partition. If no key is specified, messages are distributed round-robin across partitions (or using sticky partitioner for batching efficiency in Kafka 2.4+).` },
    ],
  },

  {
    id: 'ddia-stream-joins',
    title: 'Joins in Stream Processing',
    icon: 'gitMerge',
    color: '#ec4899',
    questions: 3,
    description: 'Stream-stream joins, stream-table joins (enrichment), and table-table joins — how to join data sources that arrive over time.',
    visualizations: [{ title: 'Stream Join Types', description: '', image: '/diagrams/ddia/stream-joins-01.png' }],
    introduction: `Joining in stream processing is harder than in batch because data arrives over time, in arbitrary order, and both sides of a join are unbounded.

Stream-stream join: join two event streams where both sides are continuously arriving. Example: join "ad_impression" events with "ad_click" events on ad_id to compute click-through rate in real time. The join window defines how long to hold an impression waiting for a click. State must be maintained for all unjoined records within the window — expensive for long windows.

Stream-table join (stream enrichment): enrich each stream event with data from a slowly changing reference table (e.g., enrich a purchase event with the user's country from the users table). The table is loaded into memory on the stream processor and updated when the table changes. Efficient because the table is small relative to the event stream.

Table-table join (materialized view maintenance): both inputs are change streams (CDC from two databases). The result is a materialized view that is updated incrementally as either table changes. Example: join users and orders CDC streams to maintain a live "user_order_summary" view.

Time semantics: stream joins must handle late-arriving events. Flink's event-time processing with watermarks allows correct joins using the event timestamp, not the processing timestamp. Without this, a mobile app event that arrives 10 minutes late would miss its join window.`,
    whenToUse: [
      'Designing a real-time analytics pipeline that enriches events with dimension data',
      'Explaining how to build a real-time materialized view from CDC streams',
      'Discussing windowed joins for matching events across time',
    ],
    keyConcepts: [
      { term: 'Stream-stream join', definition: 'Joining two unbounded event streams. Requires maintaining state for unmatched events within a time window. Memory grows with window size.' },
      { term: 'Stream-table join', definition: 'Enriching stream events with a reference table loaded into memory. The table is periodically refreshed. Efficient for small, slowly changing tables.' },
      { term: 'Event time vs processing time', definition: 'Event time: when the event actually occurred (embedded in the event). Processing time: when the stream processor received it. Joins on event time require watermarks to handle late arrivals.' },
      { term: 'Watermark', definition: 'A marker that tells the stream processor "all events with timestamp <= T have arrived." Events after the watermark are considered late. Used to trigger window computation and join cleanup.' },
    ],
    pitfalls: [
      'Using processing time for stream-stream joins — late-arriving events miss their window and are silently dropped.',
      'Using a stream-table join with a table that changes frequently — stale table data enriches events with wrong values until the table is refreshed.',
    ],
    keyQuestions: [
      {
        question: 'How would you implement a real-time feature pipeline that joins purchase events with user demographic data?',
        answer: `This is a stream-table join (enrichment) pattern.

Architecture: publish purchase events to a Kafka topic. The user demographics table is stored in PostgreSQL. A Flink job consumes the purchase events.

State management in Flink: when the Flink job starts, it loads the users table into Flink state (a RocksDB-backed key-value store distributed across Flink TaskManagers). For each incoming purchase event, it looks up the user_id in this state store and appends the user's country, age_bucket, and subscription_tier to the event before writing to the output topic.

Keeping the table fresh: use CDC (Change Data Capture) — Debezium reads the PostgreSQL users table's WAL and publishes change events to a separate Kafka topic. A second Flink job (or the same job using a union input) consumes these change events and updates the state store. This keeps the in-memory table current with a latency of ~1 second.

Handling missing user records: if a purchase event arrives for a user_id that is not yet in the state store (new user whose record has not yet been captured by CDC), buffer the purchase event for a short window (e.g., 30 seconds) and retry the lookup. If still missing, enrich with defaults and flag for re-processing.`,
      },
    ],
    quickFire: [
      { q: `What are the three types of joins in stream processing?`, a: `Stream-stream join (windowed), stream-table join (enrichment), and table-table join (materialized view maintenance).` },
      { q: `What is a stream-stream join?`, a: `Both sides are streams of events. Events within a time window are matched on a join key — requires buffering one or both sides until the window closes.` },
      { q: `What is a stream-table join?`, a: `One side is a stream of events; the other is a database table (or changelog). The stream is enriched by looking up the current state of the table at the time of each event.` },
      { q: `What is a table-table join?`, a: `Both sides are changelogs (CDC streams). The join materializes a view that is kept up-to-date as both tables change — like a continuously maintained JOIN in a database.` },
      { q: `What ordering issue affects stream-stream joins?`, a: `Events from two streams may arrive out of order. If a user action on stream A happened before a related event on stream B, A might arrive late — requiring either buffering or accepting approximate results.` },
      { q: `How does a stream-table join handle table updates?`, a: `The processor keeps a local copy of the table (updated via a changelog). When a stream event arrives, it looks up the table's state at that moment — called enrichment.` },
      { q: `What happens if the table changes after a stream event was already processed in a stream-table join?`, a: `The event was joined against the table's state at event-processing time. If you want point-in-time accuracy, you need event-time-based lookups with versioned table state.` },
      { q: `Why are stream joins harder than batch joins?`, a: `Stream joins are stateful and unbounded — you must decide how long to buffer for out-of-order data and how to handle late arrivals, whereas batch joins see the complete, bounded dataset.` },
    ],
  },

  {
    id: 'ddia-fault-tolerance-streams',
    title: 'Fault Tolerance in Stream Processing',
    icon: 'shield',
    color: '#ec4899',
    questions: 3,
    description: 'At-least-once, exactly-once, and how Flink checkpointing and Kafka transactions achieve fault-tolerant stateful stream processing.',
    visualizations: [{ title: 'Stream Fault Tolerance and Exactly-Once', description: '', image: '/diagrams/ddia/fault-tolerance-streams-01.png' }],
    introduction: `Stream processors fail. The question is: when a Flink TaskManager crashes and restarts, what happens to the events that were in-flight?

At-least-once: on restart, re-process events from the last committed Kafka offset. Events between the last checkpoint and the crash are reprocessed. If the processing is idempotent (adding to a set, incrementing a counter with deduplication), this is safe.

At-most-once: acknowledge events immediately on receipt. On failure, no replay. Events may be lost. Acceptable only for high-volume, loss-tolerant data (analytics events where a few dropped events are tolerable).

Exactly-once: events are processed exactly once even in the presence of failures. Requires: atomic output (write to the output sink and commit the Kafka offset atomically) and idempotent or transactional producers. Flink achieves this with distributed snapshots (Chandy-Lamport algorithm).

Flink checkpointing: Flink periodically inserts barrier markers into the input Kafka stream. When a task receives barriers from all its input partitions, it snapshots its state to durable storage (S3 or HDFS) and acknowledges the checkpoint. On failure, all tasks restart from the last completed checkpoint, and Kafka offsets are reset to the checkpoint position. State is fully restored.

Two-phase commit (Flink exactly-once with Kafka output): Flink uses Kafka's transactional API. Outputs are written in a Kafka transaction that is pre-committed at checkpoint time and committed when all tasks have checkpointed. If a task fails before commit, the transaction is aborted and the output is discarded.`,
    whenToUse: [
      'Explaining the trade-offs between at-least-once and exactly-once in a Kafka + Flink pipeline',
      'Discussing how Flink checkpointing enables stateful fault tolerance',
      'Choosing delivery semantics for a financial transaction stream',
    ],
    keyConcepts: [
      { term: 'Checkpoint (Flink)', definition: 'A consistent snapshot of all Flink operator state and the corresponding Kafka offsets, stored durably. Used to restart from the last consistent state after failure.' },
      { term: 'Barrier', definition: 'A marker injected into the event stream that triggers snapshot alignment. All operators snapshot their state when they receive a barrier from all input channels.' },
      { term: 'Exactly-once semantics', definition: 'Each event affects the output state exactly once, even in the presence of failures and retries. Requires idempotent outputs or transactional sinks.' },
      { term: 'Two-phase commit sink', definition: 'Flink\'s mechanism for exactly-once output: pre-commit during checkpoint, commit when all tasks have successfully checkpointed, abort on failure.' },
    ],
    pitfalls: [
      'Enabling Flink exactly-once semantics but writing to a non-transactional sink (e.g., a REST API) — exactly-once only applies to Kafka, JDBC, and other transactional sinks.',
      'Setting checkpoint intervals too short — frequent checkpointing adds overhead; too long means more reprocessing on failure.',
    ],
    keyQuestions: [
      {
        question: 'How does Flink achieve exactly-once semantics end to end with Kafka as both source and sink?',
        answer: `Flink uses the two-phase commit protocol coordinated by the checkpoint mechanism.

Setup: Flink sources read from Kafka with auto-offset-commit disabled. Flink sinks write to Kafka using the transactional producer API.

Normal operation: the sink opens a Kafka transaction and writes output records to it. The transaction is not yet committed.

Checkpoint trigger: Flink injects checkpoint barriers into the source partitions. Barriers flow through the operator DAG. When each operator receives barriers from all inputs, it: (1) snapshots its state to S3 and (2) passes the barrier downstream.

Pre-commit: when the sink operator receives the checkpoint barrier, it pre-commits the current Kafka transaction (moves it to the "prepared" state) and snapshots the transaction ID in the checkpoint.

Commit: once all operators have completed their checkpoints (the checkpoint coordinator receives acknowledgments), it notifies the sink to commit the pre-committed Kafka transactions. The output records become visible to consumers.

Failure handling: if a TaskManager fails before the checkpoint completes, the pre-committed transaction is never committed — it expires after the Kafka transaction timeout (default 15 minutes). On restart, Flink restores state from the last completed checkpoint and resets the Kafka source offset to the corresponding checkpoint offset. Events since the last checkpoint are reprocessed, producing new output records in a new transaction.

End result: each input event causes exactly one output record to be durably committed to the Kafka output topic.`,
      },
    ],
    quickFire: [
      { q: `What is microbatching in Spark Streaming?`, a: `The stream is broken into small time-based batches (e.g., every second) and processed like a mini-batch job — exactly-once semantics via batch retries, but adds latency.` },
      { q: `What is checkpointing in Flink?`, a: `Flink periodically snapshots all operator state to durable storage. On failure, it rolls back all operators to the last consistent checkpoint and replays input from that point.` },
      { q: `What is the difference between at-least-once and exactly-once processing?`, a: `At-least-once may process an event multiple times on retry. Exactly-once ensures each event affects state exactly once — requires idempotency or atomic commits.` },
      { q: `What makes a producer idempotent in Kafka?`, a: `Kafka assigns each producer a PID and sequence number. The broker deduplicates retried messages using these IDs, so duplicate sends don't produce duplicate records.` },
      { q: `What is an idempotent consumer?`, a: `A consumer that can safely process the same message multiple times and produce the same output — achieved by deduplicating on a message ID or making writes naturally idempotent.` },
      { q: `What is the challenge of exactly-once across heterogeneous systems?`, a: `If a stream processor writes to both Kafka and a database, you need an atomic commit spanning both — different from a single-system transaction. Requires two-phase commit or careful offset management.` },
      { q: `How does Kafka Streams achieve exactly-once?`, a: `Uses Kafka transactions — reading offsets and writing output are committed atomically to Kafka, so a failure rolls back both the consumed offset and the produced output.` },
      { q: `What is the trade-off of microbatching vs true streaming for fault tolerance?`, a: `Microbatching is simpler (reuse batch fault-tolerance) but adds inherent latency from batch intervals. True streaming (Flink) has lower latency but more complex checkpointing logic.` },
    ],
  },

  {
    id: 'ddia-change-data-capture',
    title: 'Change Data Capture (CDC)',
    icon: 'database',
    color: '#ec4899',
    questions: 4,
    description: 'How CDC streams database changes to downstream systems, enabling real-time search indexing, caching, and analytics.',
    visualizations: [{ title: 'CDC Pipeline', description: '', image: '/diagrams/ddia/cdc-01.png' }],
    introduction: `Change Data Capture (CDC) captures the stream of changes to a database (INSERT, UPDATE, DELETE) and makes them available as an event stream. Instead of polling the database (expensive and laggy), CDC reads the database's own replication log.

PostgreSQL CDC: Debezium reads PostgreSQL's WAL (logical replication). Each change is emitted as an event: the full before and after state of the row (for UPDATE), the new row (for INSERT), or the primary key (for DELETE).

MySQL CDC: Debezium reads the MySQL binlog. Same semantics.

Use cases:
- Search indexing: keep Elasticsearch synchronized with a PostgreSQL database. Every database change is reflected in the search index within seconds.
- Cache invalidation: invalidate Redis cache entries when the underlying database row changes.
- Data warehouse replication: CDC from OLTP database to Snowflake or BigQuery as an event stream, replacing nightly batch dumps.
- Event sourcing integration: derive domain events from database mutations for downstream services without requiring application-level event publishing.
- Microservice data consistency: when a user updates their profile in the users service, CDC publishes the change; the notifications service and recommendation service react without direct API coupling.

Dual write problem: if an application writes to a database AND publishes an event to Kafka, the write and publish can get out of sync (one succeeds, the other fails). CDC solves this: write to the database only; CDC publishes the event automatically from the WAL.`,
    whenToUse: [
      'Designing real-time search indexing from a relational database',
      'Explaining how to avoid dual writes in an event-driven architecture',
      'Synchronizing a cache with the primary database without application-level cache invalidation logic',
    ],
    keyConcepts: [
      { term: 'Debezium', definition: 'An open-source CDC platform that reads database replication logs (PostgreSQL WAL, MySQL binlog) and publishes changes as structured events to Kafka.' },
      { term: 'Outbox pattern', definition: 'Writing events to an outbox table in the same transaction as the domain write, then using CDC to read the outbox and publish to Kafka. Guarantees at-least-once event delivery without dual writes.' },
      { term: 'Logical replication (PostgreSQL)', definition: 'PostgreSQL feature that exposes the WAL as a stream of logical row changes. Used by Debezium for CDC.' },
      { term: 'Dual write problem', definition: 'The risk of writing to two systems (database + message broker) where one write succeeds and the other fails, leaving systems inconsistent.' },
    ],
    pitfalls: [
      'Using CDC to replicate large binary columns (BLOBs, images stored in the database) — every change event includes the full column content, generating excessive Kafka message sizes.',
      'Not handling DELETE events in the CDC consumer — deletes from the source database can leave stale data in Elasticsearch or Redis if not consumed.',
    ],
    keyQuestions: [
      {
        question: 'How do you keep Elasticsearch in sync with a PostgreSQL database using CDC?',
        answer: `The pipeline: PostgreSQL → Debezium → Kafka → Elasticsearch connector → Elasticsearch index.

Setup: enable logical replication in PostgreSQL (wal_level = logical). Create a Debezium PostgreSQL source connector that reads the WAL for the target tables. Debezium emits each change (INSERT, UPDATE, DELETE) as a JSON event to a Kafka topic named after the table (e.g., postgres.public.products).

Elasticsearch sink connector (Kafka Connect): a Kafka Connect connector consumes the Kafka topic and applies changes to Elasticsearch. For INSERT and UPDATE, it does an Elasticsearch index (upsert) using the row's primary key as the document ID. For DELETE, it does an Elasticsearch delete by document ID.

Consistency: the Kafka connector commits offsets after successfully writing to Elasticsearch. At-least-once delivery — a crash and restart may reprocess recent events and re-index some documents. Elasticsearch index operations are idempotent (re-indexing the same document is safe); DELETE of an already-deleted document is a no-op.

Latency: typically 1-5 seconds from database write to Elasticsearch visibility. The bottleneck is WAL reading latency in Debezium plus Kafka consumer polling interval.

Initial load: for an existing database, Debezium performs an initial snapshot (full table scan to emit all existing rows as INSERT events) before switching to WAL-based CDC. This seeds Elasticsearch with the current data before the real-time sync begins.`,
      },
    ],
    quickFire: [
      { q: `What PostgreSQL configuration is required to enable Debezium CDC?`, a: `Set wal_level = logical in postgresql.conf (requires restart), ensure max_replication_slots >= 1 and max_wal_senders >= 1, and grant the REPLICATION role to the Debezium user.` },
      { q: `Why is MySQL statement-based binlog unsuitable for CDC?`, a: `Statement-based logging records SQL text rather than row changes. Non-deterministic functions (NOW(), UUID(), RAND()) produce different values when re-executed, making the log unreliable for CDC. Row-based logging must be used.` },
      { q: `What is the operational risk of an unmonitored PostgreSQL replication slot?`, a: `PostgreSQL retains WAL segments from the slot's confirmed position onward. If Debezium stops consuming, WAL accumulates indefinitely, eventually filling the disk and crashing the database by preventing further writes.` },
      { q: `How does a Kafka compacted topic behave like a key-value store?`, a: `Log compaction keeps only the latest value per key, deleting older values with the same key. A consumer reading from offset 0 receives the current value for every key, equivalent to a full table scan of a key-value store.` },
      { q: `What is the outbox pattern and what problem does it solve?`, a: `The outbox pattern writes to the application table and an outbox table in a single database transaction, ensuring atomicity. A separate publisher reads the outbox and publishes to Kafka. It solves the dual-write problem: preventing the case where the database is updated but the Kafka event is not published (or vice versa).` },
      { q: `What is the difference between event sourcing and CDC?`, a: `Event sourcing makes events the primary data model (application writes events, state is derived). CDC derives events from an existing relational database's WAL as a side effect of normal writes. Event sourcing requires application redesign; CDC retrofits event-streaming benefits onto existing databases.` },
      { q: `What does a Debezium change event contain?`, a: `Source metadata (table, database, commit timestamp, WAL position), operation type (c=create, u=update, d=delete, r=read/snapshot), before image (previous row values), and after image (new row values). The schema is registered in Confluent Schema Registry for typed deserialization.` },
    ],
  },

  // ── DATA INTEGRATION ──────────────────────────────────────────────────────────

  {
    id: 'ddia-lambda-kappa-architecture',
    title: 'Lambda and Kappa Architectures',
    icon: 'layers',
    color: '#84cc16',
    questions: 4,
    description: 'Lambda architecture (batch + speed layers), its complexity problem, and the Kappa simplification of using a single stream-processing layer.',
    visualizations: [{ title: 'Lambda vs Kappa Architecture', description: '', image: '/diagrams/ddia/lambda-kappa-01.png' }],
    introduction: `Lambda architecture (Nathan Marz) was the dominant big data architecture ca. 2012-2018. It addresses the accuracy vs latency trade-off by maintaining two parallel paths:

Batch layer: processes the complete historical dataset periodically (e.g., every hour). Produces accurate, complete results. High latency (1 hour delay).

Speed layer: processes new events in real time using stream processing. Produces approximate or incomplete results immediately. Low latency but covers only recent data.

Serving layer: merges batch results and speed layer results to answer queries. The batch layer results overwrite speed layer results as they arrive.

Problem: maintaining two separate processing systems (Hadoop + Spark Streaming, or Flink + Hive) that must produce the same semantic output is operationally complex. Any bug fix or business logic change must be applied to both. Two codebases to maintain, test, and operate.

Kappa architecture (Jay Kreps, 2014): eliminate the batch layer. Use only stream processing. Reprocess historical data by re-reading the full Kafka topic from the beginning, which serves the same role as the batch layer. Requirements: the stream processor must be able to ingest data fast enough (replay a large backlog quickly), and Kafka must retain data long enough for full reprocessing.

Modern trend: Kappa is now the preferred architecture. Flink and Spark Structured Streaming can process both historical backfill and real-time events from the same code. Apache Iceberg and Delta Lake provide transactional writes for the output, enabling efficient incremental updates.`,
    whenToUse: [
      'Designing a real-time + historical analytics system in a system design interview',
      'Explaining why Lambda architecture was replaced by simpler streaming approaches',
      'Discussing when batch processing is still necessary vs when streaming suffices',
    ],
    keyConcepts: [
      { term: 'Lambda architecture', definition: 'A big data pattern with separate batch and speed layers. Batch provides accurate historical results; speed layer provides low-latency recent results. Serving layer merges them.' },
      { term: 'Kappa architecture', definition: 'Simplified architecture using only a stream processing layer. Historical reprocessing is achieved by replaying the full Kafka log, eliminating the need for a separate batch system.' },
      { term: 'Serving layer', definition: 'In Lambda, the query layer that merges batch and speed layer outputs. Often a key-value store (HBase, Cassandra) preloaded with precomputed results.' },
    ],
    pitfalls: [
      'Adopting Lambda architecture without acknowledging the operational cost of maintaining two codebases for identical business logic.',
      'Assuming Kappa is always simpler — if the streaming system cannot process historical backfill at sufficient speed (e.g., 10TB/day must be reprocessed in under 4 hours), a batch system may still be needed.',
    ],
    keyQuestions: [
      {
        question: 'Why was Lambda architecture replaced by Kappa in most modern data platforms?',
        answer: `Lambda architecture's core promise was: batch for accuracy, streaming for speed, merge for completeness. In practice, the dual-system maintenance cost undermined the benefits.

The problem: every data pipeline in Lambda had two implementations — a Hive or Spark batch job and a Storm or Spark Streaming job. When a business rule changed (e.g., refund events should be counted differently), engineers had to update both codebases, test them separately, verify they produced the same output, and deploy them separately. A bug in one but not the other caused the batch and speed layers to diverge, producing inconsistent query results.

Kappa's insight (Jay Kreps, LinkedIn): if you store all events in Kafka with long retention and your stream processor can replay them fast enough, you can achieve batch-equivalent accuracy with a single streaming codebase. Reprocessing is simply starting a new consumer group from offset 0 and running the stream job at full throughput.

The enablers that made Kappa practical: (1) Flink and Spark Structured Streaming handle both batch (bounded) and streaming (unbounded) with the same API, (2) Kafka log retention at petabyte scale (Kafka on S3 via Tiered Storage), (3) transactional output stores (Apache Iceberg, Delta Lake) that allow stream jobs to write results atomically.

Lambda is still justified when: the stream processor genuinely cannot reprocess historical data fast enough within the SLA, or when batch accuracy (e.g., exact deduplication across 5 years of data) requires algorithms that are not feasible in streaming.`,
      },
    ],
    quickFire: [
      { q: `What is the main operational problem with Lambda architecture?`, a: `Maintaining two separate codepaths (batch logic in Spark/MapReduce and streaming logic in Storm/Flink) that implement the same business logic. They drift over time, causing divergent results and doubled debugging effort.` },
      { q: `In Kappa architecture, how do you reprocess historical data after a bug fix?`, a: `Deploy a new version of the streaming job starting from Kafka offset 0, process all historical events in parallel with the production job, wait until it catches up to real-time, then cut over traffic to the new job and decommission the old one.` },
      { q: `What does Apache Flink mean when it says batch is a special case of streaming?`, a: `Flink uses the same operator graph for both batch (bounded data source, process to completion) and streaming (unbounded data source, process continuously). The same code and APIs work for both; only the data source differs (a file vs a live Kafka topic).` },
      { q: `Why is event-time windowing preferred over processing-time windowing for analytics?`, a: `Event-time windowing groups events by when they actually occurred (the event's timestamp). Processing-time windowing groups them by when the streaming processor received them. Late-arriving events (due to network delays, mobile apps reconnecting) are placed in the wrong window with processing-time, causing incorrect aggregates.` },
      { q: `What is the serving layer's role in Lambda architecture?`, a: `The serving layer merges the batch view (accurate historical data) and the speed view (real-time data covering the current batch window gap) at query time. It presents a unified answer to queries that includes both historical accuracy and real-time freshness.` },
      { q: `Name two streaming systems that implement the Kappa pattern natively.`, a: `Apache Flink (supports both bounded and unbounded sources with the same job) and Kafka Streams (processes Kafka topics from any offset, enabling historical replay via consumer group offset reset).` },
      { q: `What is Apache Beam and how does it relate to Lambda/Kappa?`, a: `Apache Beam is Google's unified programming model (open-sourced from the Dataflow paper) that provides a single API for batch and streaming via PCollections, PTransforms, windowing, and watermarks. It runs on multiple runners (Flink, Spark, Dataflow), implementing the Kappa principle of one codebase for both modes.` },
    ],
  },

  {
    id: 'ddia-unbundling-databases',
    title: 'Unbundling the Database',
    icon: 'package',
    color: '#84cc16',
    questions: 3,
    description: 'DDIA Chapter 12 synthesis: the Unix philosophy applied to data systems, composing specialized tools into a unified data infrastructure.',
    visualizations: [{ title: 'Unbundling the Database', description: '', image: '/diagrams/ddia/unbundling-databases-01.png' }],
    introduction: `Kleppmann's closing argument in DDIA: the monolithic database (store, index, query, enforce constraints, provide transactions, handle replication — all in one system) is being unbundled into specialized tools that do one thing well, composed via event streams.

Unix philosophy: each tool does one thing well; tools are composed via pipes and files. The Unix pipeline ls | grep | wc is analogous to a data pipeline: Kafka → Flink → Elasticsearch → API.

Unbundled components:
- Durable storage: S3, HDFS, GCS
- Stream log: Kafka (the nervous system — connects all other components)
- Stream processor: Flink, Spark Streaming (transformations, joins, aggregations)
- Search index: Elasticsearch (full-text and structured search)
- Cache: Redis (low-latency key-value reads)
- OLTP database: PostgreSQL, MySQL (transactional writes, source of truth)
- OLAP warehouse: BigQuery, Redshift, Snowflake (analytical queries)
- Feature store: Feast, Tecton (precomputed ML features)

CDC keeps all derived systems synchronized with the OLTP source of truth via Kafka.

Tradeoffs vs monolith: the unbundled approach provides best-in-class capabilities at each layer. The cost is operational complexity: more systems to monitor, more failure modes, more data consistency challenges across systems. The monolith (single PostgreSQL for everything) is correct for early-stage products; the unbundled approach is necessary at scale.`,
    whenToUse: [
      'Designing a large-scale data platform in a principal engineer or architect interview',
      'Explaining why companies use 10 different data tools instead of one database',
      'Discussing the trade-off between operational simplicity (monolith) and capability (specialized tools)',
    ],
    keyConcepts: [
      { term: 'Unbundled database', definition: 'Using specialized tools (Kafka, Elasticsearch, Redis, Flink, Snowflake) each optimized for one task, connected via event streams. Contrasts with a single monolithic database.' },
      { term: 'Derived data', definition: 'Data that is computed from a primary source of truth. Elasticsearch index, Redis cache, Snowflake warehouse are all derived from the OLTP database. Must be kept consistent via CDC.' },
      { term: 'Dataflow architecture', definition: 'Systems connected via event streams (Kafka) rather than direct API calls. Changes propagate through the stream, keeping derived systems eventually consistent.' },
    ],
    pitfalls: [
      'Unbundling prematurely — at low scale, a single PostgreSQL database is operationally simpler and more consistent than 10 specialized systems.',
      'Not treating the OLTP database as the single source of truth — using Elasticsearch or Redis as primary stores leads to data loss on failure.',
    ],
    keyQuestions: [
      {
        question: 'How would you design a data platform for a social media application with 50M users?',
        answer: `I use an unbundled architecture with PostgreSQL as the source of truth, Kafka as the integration backbone, and specialized systems for each access pattern.

Source of truth: PostgreSQL for user profiles, posts, and relationships. Transactional writes, strong consistency, ACID guarantees. The authoritative store.

Feed delivery: Cassandra (leaderless, write-optimized) for precomputed timelines. Write fan-out via a Flink job that consumes PostCreated events from Kafka and writes to all followers' timeline shards.

Search: Elasticsearch for full-text search across posts and user profiles. Kept synchronized via Debezium CDC → Kafka → Elasticsearch connector.

Cache: Redis for hot user profiles, trending topic counters, and rate limiting. Invalidated via CDC events. Avoids read pressure on PostgreSQL for the most frequent lookups.

Analytics: BigQuery for analytics (engagement metrics, funnel analysis). Populated by a CDC pipeline from PostgreSQL to BigQuery via Kafka, plus a Kafka topic of behavioral events (views, clicks, impressions).

Event bus: Kafka connects all systems. PostCreated, UserUpdated, RelationshipCreated events flow through Kafka topics. Each consumer (timeline builder, search indexer, notification service, analytics pipeline) is an independent Kafka consumer group.

Operational trade-off: this is 7-8 systems with complex interdependencies. For the first 10K users, a single PostgreSQL instance with pg_search and pg_trgm for search is operationally far simpler. The unbundled architecture is justified when PostgreSQL cannot serve the combined read load or when specialized capabilities (Elasticsearch's relevance ranking, Cassandra's write throughput) become necessary.`,
      },
    ],
    quickFire: [
      { q: `What does 'unbundling the database' mean?`, a: `Instead of one monolithic database handling storage, indexing, caching, search, and replication, you compose specialized tools (Kafka, Elasticsearch, Redis, Flink) coordinated by derived data pipelines.` },
      { q: `What is the Unix philosophy applied to databases?`, a: `Small, focused tools that do one thing well, composed via standard interfaces (like Unix pipes) — rather than one tool trying to do everything.` },
      { q: `What is derived data in this context?`, a: `Data that is computed from a primary source of truth — indexes, caches, search replicas, materialized views. They can always be rebuilt by reprocessing the source.` },
      { q: `What is the Lambda architecture?`, a: `A pattern with two parallel pipelines: a batch layer (recomputes from raw data periodically) and a speed layer (processes recent data in real time). Results are merged at query time.` },
      { q: `What is Kleppmann's main critique of Lambda architecture?`, a: `You maintain two code paths (batch and streaming) that must produce identical results — this is complex and error-prone. The Kappa architecture proposes using only a stream-processing system.` },
      { q: `What is the Kappa architecture?`, a: `Use a single stream-processing system for both real-time and reprocessing (by replaying the event log). Eliminates the dual-pipeline complexity of Lambda.` },
      { q: `What is the role of an event log (like Kafka) in the unbundled database?`, a: `It acts as the integration backbone — a durable, ordered log that all derived systems consume. It enables rebuilding any derived view by replaying from the beginning.` },
      { q: `What is the key challenge in composing unbundled tools?`, a: `Keeping derived data in sync — ensuring that writes to the primary store and all derived systems (search index, cache, etc.) are eventually consistent without complex distributed transactions.` },
    ],
  },

  {
    id: 'ddia-end-to-end-correctness',
    title: 'End-to-End Correctness and the Exactly-Once Myth',
    icon: 'checkCircle',
    color: '#84cc16',
    questions: 3,
    description: 'Why database transactions and message broker exactly-once guarantees are not sufficient for end-to-end correctness — and how idempotency and request deduplication close the gap.',
    visualizations: [{ title: 'End-to-End Idempotency', description: '', image: '/diagrams/ddia/end-to-end-01.png' }],
    introduction: `Kleppmann's Chapter 12 makes a subtle but critical argument: even if your database provides ACID transactions and your message broker guarantees exactly-once delivery, your end-to-end system can still produce duplicate or lost effects at the application level.

The classic example: a user submits a payment. The application writes the charge to the database. The browser times out before receiving a response. The user clicks "submit" again. Did the first charge go through? Should the second click create a new charge? The database transaction committed successfully on the first attempt, but the application has no way to know — and if the browser retries, the second click creates a duplicate charge.

The problem is that exactly-once delivery at the message broker level does not help here. The retry happens at the HTTP layer, not the message layer. The database transaction does not know that this is a retry.

The solution: end-to-end request deduplication. The client generates a unique idempotency key for each logical operation (a UUID). Every submit carries this key. The server stores (idempotency_key, result) in a table. Before processing, it checks if the key has been seen. If yes, return the cached result. If no, process and store the result atomically. Any number of client retries produce exactly one effect.

This is the end-to-end argument from distributed systems: low-level guarantees (exactly-once at the broker layer, ACID at the database layer) are necessary but not sufficient. Correctness must be enforced at the application level where the full context of the operation is known.`,
    whenToUse: [
      'Designing a payment or order submission flow that is safe to retry',
      'Explaining why exactly-once message delivery does not prevent duplicate charges',
      'Discussing idempotency key design for external-facing APIs',
    ],
    keyConcepts: [
      { term: 'End-to-end argument', definition: 'A principle that correctness guarantees must be implemented at the application layer, not just at lower layers (network, database, message broker), because lower layers lack the context to enforce application-level invariants.' },
      { term: 'Idempotency key', definition: 'A client-generated unique identifier for a logical operation. The server uses it to deduplicate retries, ensuring that multiple identical requests produce exactly one effect.' },
      { term: 'Request deduplication table', definition: 'A database table storing (idempotency_key, result) pairs. Checked atomically before processing a request. Prevents duplicate effects on retry.' },
      { term: 'At-least-once + idempotent receiver', definition: 'The practical pattern for reliable message processing: the broker delivers at least once; the consumer is designed to be idempotent (safe to re-execute). Together they achieve effectively-once semantics.' },
    ],
    pitfalls: [
      'Relying on Kafka exactly-once semantics to prevent duplicate database writes — Kafka exactly-once only covers the Kafka-to-Kafka path; database writes outside the Kafka transaction are not covered.',
      'Using a wall-clock timestamp as an idempotency key — two requests submitted at the same millisecond (or from nodes with clock skew) collide. Use a UUID or a hash of the request content.',
    ],
    keyQuestions: [
      {
        question: 'How do you make a payment API safe to retry without creating duplicate charges?',
        answer: `The solution is idempotency keys combined with a deduplication table.

Client behavior: before submitting a payment, the client generates a UUID (the idempotency key) and stores it locally. Every retry of this payment includes the same idempotency key in the request header (e.g., Idempotency-Key: uuid-v4-here).

Server behavior: upon receiving the request, the server atomically checks the idempotency_keys table for this key. If found, it returns the stored result immediately without re-executing. If not found, it processes the payment and atomically inserts (key, result, expires_at) into the table in the same database transaction as the charge. The transaction commits atomically — either both the charge record and the idempotency key record are created, or neither is.

The atomic check-and-insert is critical. Without atomicity, two concurrent retries can both find "key not found," both process the payment, and both insert — creating a duplicate. Using a UNIQUE constraint on the idempotency_key column causes the second concurrent insert to fail with a constraint error. The application catches this and returns the first result.

Key expiration: idempotency keys have a TTL (Stripe uses 24 hours). After expiration, a new submission with the same key is treated as a new payment. This is the expected behavior — if a user comes back the next day and resubmits, they likely intend a new charge.

Stripe's implementation: every Stripe API endpoint accepts an Idempotency-Key header. Stripe stores results for 24 hours. This pattern is the industry standard for financial APIs.`,
      },
    ],
    quickFire: [
      { q: `Why is TCP's exactly-once delivery guarantee insufficient for application-level idempotency?`, a: `TCP provides exactly-once within a single connection. Application retries create a new TCP connection. The original connection's result is unknown, so the retry may duplicate the operation. Application-level idempotency keys are required.` },
      { q: `Where must an idempotency key be stored relative to the operation it protects?`, a: `In the same database transaction as the operation. This ensures the key and the operation are atomically committed or rolled back together, preventing partial state (key stored but operation incomplete, or operation complete but key missing).` },
      { q: `Name a production API that uses idempotency keys. How is the key provided?`, a: `Stripe's payment API uses the Idempotency-Key request header. The client generates a UUID before sending a charge or transfer request and sends the same key on all retries. Stripe guarantees the payment is processed exactly once for a given key.` },
      { q: `What is silent data corruption and give one real-world source?`, a: `Silent data corruption is data modification without an error signal from the affected layer. One source: SSD firmware bugs that return incorrect data without reporting an I/O error. Another: DRAM multi-bit errors that exceed ECC correction capability.` },
      { q: `Why does adding checksums at every layer (TCP, TLS, filesystem, application) provide better integrity than relying on one layer?`, a: `Each layer's checksum uses a different algorithm and covers a different scope. Corruption introduced between two layers is caught by the upper layer's checksum but not the lower layer's. Silent corruption that passes TCP's 16-bit CRC can still be caught by an application SHA-256.` },
      { q: `What makes an immutable event log useful for system integrity verification?`, a: `You can replay the event log from the beginning and compare the derived state to the current stored state. Any discrepancy reveals a bug, unauthorized modification, or undetected data corruption. The append-only nature makes past events tamper-evident.` },
      { q: `What did Saltzer, Reed, and Clark prove in their 1981 end-to-end argument paper?`, a: `That correctness guarantees can only be fully provided at the ends of a communication system (the application layer), not in intermediate layers. Lower layers can optimize the common case but cannot replace end-to-end application-level checks.` },
      { q: `What is the key ethical concern DDIA raises about predictive analytics?`, a: `ML models trained on historical data can encode and amplify historical biases, causing discriminatory outcomes in decisions about people (lending, hiring, parole). Compliance with anti-discrimination law is insufficient; engineers bear responsibility for the disparate impacts of systems they build.` },
    ],
  },

];
