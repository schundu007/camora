// System design extra topics — distributed systems, storage, reliability, and platform patterns

export const systemDesignExtraCategories = [
  { id: 'distributed', name: 'Distributed Systems', icon: 'network', color: '#6366f1' },
  { id: 'storage-advanced', name: 'Storage & Data Systems', icon: 'database', color: '#3b82f6' },
  { id: 'reliability-ops', name: 'Reliability & Operations', icon: 'shield', color: '#ef4444' },
  { id: 'platform-patterns', name: 'Platform Patterns', icon: 'layers', color: '#10b981' },
];

export const systemDesignExtraCategoryMap = {
  'raft-consensus': 'distributed',
  'two-phase-commit': 'distributed',
  'saga-pattern-distributed': 'distributed',
  'crdt': 'distributed',
  'multi-region-active-active': 'distributed',
  'time-series-databases': 'storage-advanced',
  'search-system-design': 'storage-advanced',
  'backpressure': 'reliability-ops',
  'api-gateway-design': 'platform-patterns',
  'multi-tenancy-architecture': 'platform-patterns',
  'ab-testing-platform': 'platform-patterns',
  'notification-system-design': 'platform-patterns',
  'real-time-collaboration': 'platform-patterns',
  'webhooks-design': 'platform-patterns',
  'feature-flags-design': 'platform-patterns',
};

export const systemDesignExtraTopics = [

  // ─────────────────────────────────────────────────────────
  // 1. Raft Consensus Algorithm
  // ─────────────────────────────────────────────────────────
  {
    id: 'raft-consensus',
    title: 'Raft Consensus Algorithm',
    icon: 'gitBranch',
    color: '#6366f1',
    questions: 6,
    description: 'Leader election, log replication, and safety in distributed systems — the consensus algorithm powering etcd, CockroachDB, and Consul.',
    concepts: [
      'Leader election with randomized timeouts',
      'Log replication and quorum writes',
      'Term numbers and safety guarantees',
      'Split-brain prevention',
      'Network partition behavior',
      'Raft vs Paxos tradeoffs',
    ],
    tips: [
      'Raft uses a single leader to serialize all writes — no conflicting concurrent updates',
      'A quorum is (N/2)+1 nodes; with 3 nodes, 2 must acknowledge before a write is committed',
      'Term numbers are monotonically increasing "logical clocks" that prevent stale leaders from causing harm',
      'Raft was designed to be understandable: the paper explicitly optimized for comprehensibility over theoretical minimality',
      'etcd (used in Kubernetes) uses Raft; if etcd loses quorum, the entire Kubernetes control plane stops accepting writes',
    ],
    introduction: `**Raft** is a consensus algorithm designed to be more understandable than Paxos while providing equivalent safety guarantees. It is the backbone of etcd, CockroachDB, TiKV, Consul, and dozens of other production distributed systems. Every engineer working on distributed infrastructure must understand Raft at the conceptual level.

The core insight: a cluster of N nodes can tolerate up to (N-1)/2 failures and still reach consensus. A 3-node cluster tolerates 1 failure; a 5-node cluster tolerates 2. Raft decomposes the consensus problem into three mostly independent subproblems: leader election, log replication, and safety.

**Leader election**: Each node starts as a follower with a randomized election timeout (150-300ms). If a follower does not hear a heartbeat from a leader within its timeout, it becomes a candidate, increments its term, and requests votes. A node grants a vote to the first candidate it hears from in a given term that has at least as up-to-date a log. The candidate that wins a majority becomes the new leader for that term.

**Log replication**: All client writes go to the leader. The leader appends the entry to its log and sends AppendEntries RPCs to all followers in parallel. Once a majority acknowledge the entry, the leader commits it, applies it to the state machine, and responds to the client. Followers apply committed entries in log order.`,
    keyQuestions: [
      {
        question: 'How does Raft prevent split-brain during a network partition?',
        answer: `Raft prevents split-brain through its **quorum requirement**: a leader can only commit an entry if a majority of nodes (quorum = floor(N/2)+1) acknowledge it.

In a 5-node cluster partitioned into a group of 3 and a group of 2:
- The group of 3 can elect a leader and commit writes (has quorum)
- The group of 2 cannot elect a leader (cannot reach quorum) and becomes read-only
- When the partition heals, the old leader in the minority partition steps down because it sees a higher term from the majority side

**Term numbers** are key: any message with a higher term causes the recipient to immediately update its term and revert to follower state. The old leader in the minority partition will see higher terms from the majority partition's new leader and voluntarily step down.

**Key guarantee**: at most one leader can be active per term, and a leader only commits entries acknowledged by a majority — so two leaders cannot simultaneously commit conflicting writes.`,
      },
      {
        question: 'What is the difference between Raft and Paxos, and why does it matter for system design interviews?',
        answer: `**Paxos** (Leslie Lamport, 1989) is the original consensus algorithm. It is theoretically elegant but notoriously difficult to understand and implement correctly. Multi-Paxos (the practical variant) is what systems actually implement, but it requires significant engineering beyond the original paper.

**Raft** (Ongaro & Ousterhout, 2014) was explicitly designed for understandability. Key differences:

| Aspect | Raft | Multi-Paxos |
|--------|------|-------------|
| Leader model | Strong single leader per term | More flexible, can have concurrent proposals |
| Log structure | Append-only, single sequence | More complex, holes allowed |
| Implementation | Straightforward from paper | Significant gaps between paper and implementation |
| Used in | etcd, CockroachDB, TiKV, Consul | Google Chubby (original), some Paxos variants |

**In interviews**: Mention that Raft is the practical choice for new systems due to clarity. The key properties to know: leader election (randomized timeouts), log replication (majority acknowledgment), and safety (no two leaders in the same term can commit).`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 2. Two-Phase Commit
  // ─────────────────────────────────────────────────────────
  {
    id: 'two-phase-commit',
    title: 'Two-Phase Commit & Distributed Transactions',
    icon: 'gitCommit',
    color: '#6366f1',
    questions: 6,
    description: 'The coordinator/participant protocol for atomic cross-service transactions — and why it is rarely the right answer.',
    concepts: [
      'Coordinator and participant roles',
      'Prepare phase and commit phase',
      'Blocking problem on coordinator crash',
      'Three-phase commit improvements',
      'XA transactions and JDBC',
      'When to use 2PC vs saga pattern',
    ],
    tips: [
      '2PC guarantees atomicity across distributed nodes but blocks if the coordinator crashes after prepare',
      'The blocking problem: participants that have voted "yes" must hold locks and wait — this can freeze your system',
      '3PC adds an extra phase to reduce blocking but is rarely used in practice due to complexity',
      'In microservices, sagas are almost always preferred over 2PC because they avoid distributed locking',
      'Google Spanner uses TrueTime + Paxos to implement external consistency without traditional 2PC',
    ],
    introduction: `**Two-Phase Commit (2PC)** is the canonical protocol for achieving atomicity across multiple distributed participants. It ensures that either all nodes commit a transaction or all roll back — the fundamental "all-or-nothing" guarantee extended to distributed systems.

The protocol has two phases: in the **prepare phase**, a coordinator sends "prepare to commit" to all participants, who vote yes (locking resources) or no. If all vote yes, the coordinator sends "commit" in the **commit phase**; if any vote no, it sends "abort." Every participant that voted yes must honor the coordinator's decision regardless of local failures.

The fatal flaw: if the coordinator crashes after sending "prepare" but before sending "commit," participants are left holding locks indefinitely — they have voted yes and cannot unilaterally decide. This is the **blocking problem** that makes 2PC unsuitable for high-availability systems.`,
    keyQuestions: [
      {
        question: 'Why is 2PC rarely used in modern microservices architectures?',
        answer: `**2PC is avoided in microservices for three reasons**:

1. **Blocking on coordinator failure**: If the coordinator crashes between the prepare and commit phases, all participants hold their locks and wait. In a microservices environment with many services, this can cascade into a system-wide deadlock.

2. **Tight coupling**: 2PC requires all participants to implement the XA protocol and maintain a connection to the same coordinator. This creates strong coupling between services that should be independently deployable.

3. **Performance**: All participants must hold locks throughout both phases. For cross-service transactions that touch a payment service, inventory service, and shipping service, this means all three services block concurrently for the duration of the protocol.

**The alternative — Saga pattern**: Break the transaction into a sequence of local transactions, each publishing an event. If any step fails, compensating transactions roll back the completed steps. No distributed locking, no coordinator blocking, but eventual consistency rather than strict atomicity.

**When 2PC is appropriate**: Internal database transactions within a single service boundary (PostgreSQL supports it via prepared transactions), or when strict ACID is genuinely required and availability can be sacrificed (financial clearing systems).`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 3. Saga Pattern
  // ─────────────────────────────────────────────────────────
  {
    id: 'saga-pattern-distributed',
    title: 'Saga Pattern for Distributed Transactions',
    icon: 'arrowRight',
    color: '#6366f1',
    questions: 6,
    description: 'Choreography vs orchestration sagas — achieving eventual consistency across microservices without distributed locking.',
    concepts: [
      'Local transactions with compensating transactions',
      'Choreography: event-driven saga flow',
      'Orchestration: central saga coordinator',
      'Idempotency requirements',
      'Failure modes and partial rollback',
      'Saga vs 2PC tradeoffs',
    ],
    tips: [
      'Sagas achieve eventual consistency, not ACID atomicity — intermediate states are visible',
      'Every forward step must have a compensating transaction that semantically reverses the effect',
      'Compensating transactions must be idempotent: they may be called multiple times due to retries',
      'Choreography is simpler for simple flows; orchestration is better for complex, conditional flows',
      'The outbox pattern ensures at-least-once delivery for saga events without two-phase commit',
    ],
    introduction: `**Sagas** are a pattern for managing data consistency across microservices without distributed locking. Instead of a single atomic transaction, a saga is a sequence of local transactions where each step publishes events or messages that trigger the next step. If any step fails, the saga executes **compensating transactions** to undo the completed steps.

There are two implementation styles. In **choreography**, each service listens for events and reacts without a central coordinator — simple to implement but hard to track. In **orchestration**, a central saga orchestrator sends commands to services and handles the state machine explicitly — more complex infrastructure but easier to reason about.

The critical insight: sagas trade isolation for availability. During execution, intermediate states are visible to other transactions. A payment might be reserved before the inventory is confirmed. This requires careful design of compensating transactions and idempotency.`,
    keyQuestions: [
      {
        question: 'Walk through a saga for an e-commerce order: payment, inventory, shipping.',
        answer: `**Forward flow** (choreography style):

1. Order Service creates order (status: PENDING), publishes "OrderCreated"
2. Payment Service receives event, charges card, publishes "PaymentCompleted" (or "PaymentFailed")
3. Inventory Service receives "PaymentCompleted", reserves items, publishes "InventoryReserved"
4. Shipping Service receives "InventoryReserved", creates shipment, publishes "ShipmentCreated"
5. Order Service receives "ShipmentCreated", updates order status to CONFIRMED

**Failure and compensation** (if Inventory step fails):
- Inventory publishes "InventoryFailed"
- Payment Service receives "InventoryFailed", issues refund (compensating transaction)
- Order Service marks order CANCELLED

**Key design decisions**:
- Payment refund must be idempotent: if the refund message is delivered twice, charge the card only once
- Use the outbox pattern: write the event to the same DB transaction as the local state change, then relay to the message broker
- Use a dead-letter queue for saga steps that fail repeatedly after retries`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 4. CRDTs
  // ─────────────────────────────────────────────────────────
  {
    id: 'crdt',
    title: 'CRDTs & Conflict-Free Replication',
    icon: 'merge',
    color: '#6366f1',
    questions: 5,
    description: 'Conflict-Free Replicated Data Types — enabling eventual consistency without coordination for collaborative apps and distributed counters.',
    concepts: [
      'G-Counter, PN-Counter, 2P-Set',
      'LWW-Register and OR-Set',
      'Merge commutativity and idempotency',
      'State-based vs operation-based CRDTs',
      'CRDTs vs Operational Transformation',
      'Real-world uses: Riak, Redis, collaborative editors',
    ],
    tips: [
      'CRDTs guarantee convergence: if two replicas receive the same updates in any order, they reach the same state',
      'The merge function must be commutative, associative, and idempotent — any order of merges produces the same result',
      'G-Counter: each node tracks its own count in a vector; total is the sum — increments never conflict',
      'OR-Set (Observed-Remove Set): add wins over concurrent remove by tagging each element with a unique token',
      'CRDTs avoid coordination overhead — replicas accept writes independently and merge lazily',
    ],
    introduction: `**Conflict-Free Replicated Data Types (CRDTs)** are data structures with mathematically guaranteed convergence: any two replicas that have received the same set of updates will hold the same state, regardless of the order updates were applied. This makes CRDTs ideal for systems that need to accept writes on multiple replicas simultaneously without coordination.

CRDTs work by restricting operations to those that form a semilattice — a mathematical structure where merging is commutative (A merge B = B merge A), associative ((A merge B) merge C = A merge (B merge C)), and idempotent (A merge A = A). When all updates satisfy these properties, replicas can merge in any order and always converge.

Practical examples: distributed counters that can be incremented on any node (G-Counter), shopping carts where items can be added on any replica (OR-Set), and last-write-wins registers for simple key-value state. CRDTs are foundational in Redis (streams, HyperLogLog), Riak, and collaborative editing tools.`,
    keyQuestions: [
      {
        question: 'How do CRDTs differ from Operational Transformation for real-time collaboration?',
        answer: `Both CRDTs and **Operational Transformation (OT)** enable collaborative editing, but they use fundamentally different approaches:

| Aspect | OT | CRDT |
|--------|-----|------|
| Coordination | Requires central server to order ops | No central coordination required |
| Complexity | Transform functions are hard to get right | Simpler semantics, harder initial design |
| Used in | Google Docs (original), ShareDB | Figma, Automerge, Yjs |
| Network model | Server-mediated | Peer-to-peer capable |

**OT**: When two clients concurrently insert at the same position, the server transforms one operation relative to the other before applying. This requires a central authority to define the canonical order. Google Docs uses OT with a server that serializes all operations.

**CRDTs**: Use data structures where concurrent operations automatically converge without transformation. For text editing, each character gets a unique ID; insertion/deletion operations are tagged and merge deterministically. Figma uses CRDTs for its multiplayer features because they work well in peer-to-peer scenarios.

**Interview guidance**: Mention both when discussing real-time collaboration. Google Docs = OT with server coordination. Figma, Notion (offline mode), and newer collaborative tools = CRDTs for peer-to-peer convergence.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 5. Multi-Region Active-Active
  // ─────────────────────────────────────────────────────────
  {
    id: 'multi-region-active-active',
    title: 'Multi-Region Active-Active Architecture',
    icon: 'globe',
    color: '#6366f1',
    questions: 6,
    description: 'Serving traffic from multiple regions simultaneously — traffic routing, conflict resolution, data sovereignty, and latency trade-offs.',
    concepts: [
      'Latency-based and geo DNS routing',
      'Anycast for global traffic distribution',
      'Conflict resolution strategies',
      'Data sovereignty and GDPR compliance',
      'Cross-region replication lag',
      'Active-active vs active-passive',
    ],
    tips: [
      'Active-active: all regions accept reads AND writes simultaneously. Active-passive: only the primary accepts writes',
      'The hardest problem in active-active is conflicting writes to the same record from different regions',
      'Last-write-wins (LWW) is simple but loses data; CRDTs avoid conflicts by design; application-level merging is most powerful but complex',
      'Cross-region replication lag is typically 50-200ms; design your consistency model around this floor',
      'Geo-partitioning (routing users to their "home" region based on user ID) eliminates most cross-region conflicts',
    ],
    introduction: `**Multi-region active-active** is the highest tier of availability architecture: multiple geographic regions each serve live traffic and accept writes simultaneously. This provides the lowest possible latency (users connect to their nearest region), the highest availability (any single region can fail completely without user impact), and the best disaster recovery posture.

The fundamental challenge is **write conflicts**: if a user in the US and a user in Europe both modify the same record within the replication lag window (~100-200ms for cross-continental links), both writes succeed locally and must be reconciled. Different systems handle this differently: DynamoDB uses last-write-wins with vector clocks, Google Spanner uses TrueTime to provide external consistency across regions, and CockroachDB uses Raft-based consensus extended to span regions.

Most production systems avoid the conflict problem entirely through **geo-partitioning**: user data is "homed" to a specific region based on user ID or geography, and all writes for that user are routed to their home region. Other regions serve cached reads. This gives active-active latency benefits for reads while reducing write conflicts to near zero.`,
    keyQuestions: [
      {
        question: 'How do you handle write conflicts in a multi-region active-active setup?',
        answer: `**Three main strategies**, ordered by complexity:

1. **Last-Write-Wins (LWW)**: The write with the highest timestamp wins. Simple to implement; DynamoDB and Cassandra support this. Problem: clock skew means the "last" write may not be the most recent from the user's perspective, leading to silent data loss.

2. **CRDTs**: Use data structures that merge without conflict. Works for counters, sets, and some custom types. Cannot solve all conflict scenarios (e.g., concurrent text edits at the same position).

3. **Application-level conflict resolution**: Detect conflicts (via vector clocks or version vectors), surface them to the application, and let business logic decide. Git does this: concurrent edits create a merge conflict that a human resolves. Most powerful but requires significant application code.

**Geo-partitioning as conflict avoidance**: The cleanest approach. Assign each user a "home region" at account creation. All writes for that user are routed to their home region. Other regions serve replicated reads with eventual consistency. Conflict rate drops to near zero because each user's data has exactly one primary replica. This is how most large-scale apps (Stripe, Shopify) handle multi-region without distributed transaction complexity.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 6. Time-Series Database Design
  // ─────────────────────────────────────────────────────────
  {
    id: 'time-series-databases',
    title: 'Time-Series Database Design',
    icon: 'trendingUp',
    color: '#3b82f6',
    questions: 5,
    description: 'Append-only ingestion, columnar chunks, downsampling, and retention — the storage engine behind metrics, IoT, and observability.',
    concepts: [
      'Append-only write pattern',
      'Columnar chunk storage',
      'Delta encoding and XOR float compression',
      'Downsampling and retention policies',
      'Cardinality and label explosion',
      'InfluxDB, Prometheus TSDB, TimescaleDB',
    ],
    tips: [
      'Time-series data is almost always append-only — past data rarely changes, making compression very effective',
      'High cardinality labels (e.g., user_id on every metric) can explode index size and kill query performance',
      'Downsampling: aggregate old data (1s resolution -> 1m -> 1h) to control storage growth',
      'Prometheus stores data in 2-hour chunks; each chunk is compressed independently using Gorilla encoding',
      'TimescaleDB extends PostgreSQL with automatic time-partitioned hypertables — good for SQL familiarity',
    ],
    introduction: `**Time-series databases (TSDBs)** are purpose-built for data with a time dimension: metrics (CPU usage, request rate), IoT sensor readings, financial tick data, and application traces. Unlike general-purpose databases, TSDBs optimize for the specific access patterns of time-series workloads: extremely high write throughput, range queries over time windows, and efficient aggregation.

The key insight is that time-series data is almost always **append-only**: you rarely update or delete historical data points, and writes are always for "now." This allows TSDBs to use write-optimized storage (LSM trees or columnar chunk files) and aggressive compression. Gorilla encoding (used by Facebook and Prometheus) uses XOR of adjacent float values plus delta encoding for timestamps, achieving 1.37 bytes per data point on average versus 16 bytes in a naive representation — a 12x compression ratio.

**Cardinality** is the most common production pitfall. Cardinality = number of unique time series = number of unique label/tag value combinations. Adding a \`user_id\` label to a metric in a system with 10 million users creates 10 million distinct time series, each needing its own index entry. Prometheus recommends keeping cardinality below 10 million total series per instance.`,
    keyQuestions: [
      {
        question: 'How does Prometheus store and query time-series data at scale?',
        answer: `Prometheus uses a custom local storage engine called **TSDB** (Time Series Database) that organizes data into 2-hour chunks.

**Write path**: Each incoming sample is written to an in-memory "head block." Every 2 hours, the head block is compacted into an immutable disk block. Blocks are further compacted into larger blocks over time (max 31 days).

**Compression**: Each block stores data in columnar format, separate files for timestamps and values. Timestamps use delta-of-delta encoding (differences of differences). Float values use XOR encoding from Gorilla paper: consecutive measurements of the same metric tend to be similar, so XOR is often a small number with many leading zeros, compressed with a variable-length scheme. Net result: ~1.37 bytes per sample.

**Labels and indexing**: Every unique combination of label names+values defines a time series. Prometheus maintains an inverted index: for each label value, the list of series IDs containing that value. Queries like rate(http_requests_total{job="api"}[5m]) look up series IDs from the index, then read the relevant chunks for those series.

**Scaling**: Single Prometheus instances handle ~1 million active series. For larger scales, use federation, remote write to Thanos/Cortex/VictoriaMetrics, or sharding by metric namespace.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 7. Search System Design
  // ─────────────────────────────────────────────────────────
  {
    id: 'search-system-design',
    title: 'Search System Design',
    icon: 'search',
    color: '#3b82f6',
    questions: 6,
    description: 'Inverted index, TF-IDF, BM25, Elasticsearch internals, and designing full-text search at scale.',
    concepts: [
      'Inverted index construction',
      'TF-IDF and BM25 ranking',
      'Tokenization, stemming, fuzzy matching',
      'Elasticsearch sharding and routing',
      'Search-as-you-type with edge n-grams',
      'Faceted search and reindex strategies',
    ],
    tips: [
      'The inverted index maps each token to the list of documents containing it — the fundamental data structure behind all search engines',
      'BM25 is the standard relevance ranking algorithm: it accounts for term frequency with saturation and document length normalization',
      'Elasticsearch routes documents to shards using: shard = hash(document_id) % number_of_primary_shards',
      'Number of primary shards cannot be changed after index creation — plan for future growth',
      'For type-ahead search, index edge n-grams of each token ("hel", "hell", "hello") to match prefixes efficiently',
    ],
    introduction: `**Search systems** are one of the most commonly asked design problems in senior engineering interviews because they touch nearly every distributed systems concept: high write throughput (indexing), complex read patterns (ranking), near-real-time requirements, and massive scale. Understanding how search engines work under the hood distinguishes candidates who understand distributed systems from those who only know the APIs.

The foundation is the **inverted index**: for each unique token in the corpus, maintain a posting list of all document IDs that contain that token, along with term frequency and position information. To search for "distributed systems", look up both tokens, intersect (or union) the posting lists, and rank by relevance. Elasticsearch, Solr, and Google's original MapReduce paper all build on this core structure.

**Relevance ranking** evolved from TF-IDF (term frequency times inverse document frequency) to BM25, which adds saturation (a term appearing 100 times is not 100x more relevant than one appearing 10 times) and document length normalization (a match in a short document is stronger than in a long document). Modern neural ranking models (BERT-based rerankers) sit on top of BM25 retrieval as a second-stage reranker.`,
    keyQuestions: [
      {
        question: 'How does Elasticsearch handle sharding, routing, and reindexing?',
        answer: `**Sharding**: An Elasticsearch index is divided into a fixed number of primary shards, each a self-contained Lucene index. Each primary shard has N replica shards for read scaling and fault tolerance.

**Routing**: By default, \`shard = hash(document_id) % num_primary_shards\`. This means the number of primary shards cannot be changed after index creation — if you reshard, every document must be reindexed. Custom routing keys (e.g., tenant_id) can colocate related documents for faster queries.

**Reindexing**: When you need to change mappings, add new fields, or change sharding, you must reindex:
1. Create a new index with the new mapping
2. Use the Reindex API to copy documents from old to new
3. Use an alias that points to the active index
4. Swap the alias atomically once reindex completes
5. Delete the old index

**Zero-downtime reindex**: Because clients use the alias (not the index name directly), swapping the alias is atomic and clients see no interruption. This is the standard pattern for any search system that needs to evolve its schema.

**In-flight indexing during reindex**: Use a timestamp filter — reindex all documents older than the start of reindex, then replay the change log for updates during the reindex window.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 8. Backpressure Mechanisms
  // ─────────────────────────────────────────────────────────
  {
    id: 'backpressure',
    title: 'Backpressure Mechanisms',
    icon: 'alertCircle',
    color: '#ef4444',
    questions: 5,
    description: 'Controlling overload when producers outrun consumers — bounded queues, load shedding, reactive streams, and TCP flow control.',
    concepts: [
      'Producer-consumer rate mismatch',
      'Bounded queues and rejection',
      'Load shedding strategies',
      'Reactive Streams specification',
      'TCP flow control and window size',
      'Kafka consumer lag as backpressure signal',
    ],
    tips: [
      'Backpressure is a signal from a slow consumer to a fast producer to slow down or stop',
      'Unbounded queues hide the problem — they allow infinite buffering until memory is exhausted (OutOfMemoryError)',
      'Load shedding: deliberately drop requests when overloaded, rather than queuing them indefinitely',
      'TCP implements backpressure natively via the receive window — the receiver advertises how much buffer space it has',
      'Kafka consumer lag is a natural backpressure signal: add consumers when lag grows, reduce producers when lag is manageable',
    ],
    introduction: `**Backpressure** is the mechanism by which a slow consumer signals to a fast producer to reduce its send rate. Without backpressure, a producer that generates work faster than the consumer can process it will either exhaust memory (through unbounded buffering) or drop work silently. Both outcomes are failures.

The key insight: unbounded queues are the enemy of stability. They allow the system to appear to function normally while secretly accumulating a growing backlog that will eventually cause an OOM crash or introduce unbounded latency. A message that sat in a queue for 10 minutes before being processed may be processed too late to be useful (e.g., a real-time notification), consuming CPU and I/O to produce a useless result.

**Load shedding** is the healthy alternative: explicitly reject requests when the system is overloaded, returning an error (HTTP 429 or 503) immediately. This gives the client a signal to back off (ideally with exponential backoff + jitter), protects the system from cascading overload, and ensures that accepted requests are processed within acceptable latency.`,
    keyQuestions: [
      {
        question: 'How do you implement backpressure in a message-driven microservices system?',
        answer: `**Layer 1 — Bounded queues**: Configure Kafka topics and consumer groups with explicit lag monitoring. Set consumer concurrency to match processing capacity. Alert when lag exceeds a threshold (e.g., 100K messages = 10 minutes of backlog at current rate).

**Layer 2 — Consumer-side rate limiting**: Use a semaphore or fixed thread pool in the consumer. Only pull N messages if N processing slots are available. This naturally limits the rate at which messages are consumed to match processing capacity.

**Layer 3 — Producer-side backpressure**: If using gRPC streaming or WebSockets, use the Reactive Streams protocol: the consumer requests N items; the producer sends at most N items; the consumer requests more when ready. This prevents the producer from overwhelming the network buffer.

**Layer 4 — Load shedding at the API gateway**: If the downstream queue is above a threshold (measured via a health check), the API gateway returns 503 immediately rather than enqueuing the request. This protects the queue from accumulating requests that will expire before processing.

**Monitoring**: Track queue depth, consumer lag, and processing latency as the three key backpressure signals. Set up autoscaling to add consumer instances when lag grows, reducing it back to baseline.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 9. API Gateway Design
  // ─────────────────────────────────────────────────────────
  {
    id: 'api-gateway-design',
    title: 'API Gateway Design',
    icon: 'server',
    color: '#10b981',
    questions: 6,
    description: 'Request routing, auth offloading, rate limiting, and the BFF pattern — the entry point for microservices architectures.',
    concepts: [
      'Request routing and load balancing',
      'Authentication and authorization offloading',
      'Rate limiting and quota enforcement',
      'Protocol translation (REST to gRPC)',
      'Backend for Frontend (BFF) pattern',
      'API Gateway vs service mesh',
    ],
    tips: [
      'An API gateway is the single entry point for all client requests — it eliminates the need for clients to know individual service addresses',
      'Offload auth to the gateway: validate JWT tokens once at the edge, pass user identity downstream as a trusted header',
      'Rate limiting at the gateway protects all downstream services from a single misbehaving client',
      'BFF (Backend for Frontend): separate gateway instances for mobile, web, and third-party APIs, each with optimized response shapes',
      'API Gateway handles North-South traffic (external clients to internal services); service mesh handles East-West (service to service)',
    ],
    introduction: `**API gateways** are the front door for microservices architectures. Rather than exposing dozens of individual service endpoints to clients, an API gateway provides a single URL that routes requests to the appropriate backend service, applies cross-cutting concerns (authentication, rate limiting, logging, tracing), and handles protocol translation.

The most important benefit: **decoupling clients from the internal service topology**. Clients call \`/api/v1/users\` and the gateway routes to whichever User Service instances are healthy, handles retries, and translates errors into a consistent response format. Services can be redeployed, renamed, or split without changing any client code.

Cross-cutting concerns handled at the gateway layer: JWT validation (one validation for all services), OAuth2 token exchange, rate limiting (per client, per endpoint, or per user), request/response transformation, schema validation, circuit breaking for downstream services, TLS termination, and observability (access logs, distributed trace injection).`,
    keyQuestions: [
      {
        question: 'When should you use an API gateway vs a service mesh vs both?',
        answer: `**API Gateway** (North-South traffic — external clients to internal services):
- Handles: authentication, rate limiting, routing, TLS termination, API versioning
- Examples: AWS API Gateway, Kong, Nginx, Traefik
- Clients call the gateway URL; the gateway knows where each service lives

**Service Mesh** (East-West traffic — service to service):
- Handles: mTLS between services, retries, circuit breaking, traffic splitting, observability
- Examples: Istio, Linkerd, Cilium
- Implemented as sidecar proxies (Envoy) injected alongside each service pod
- Transparent to the application code — the sidecar intercepts all outbound connections

**When to use both**:
- Large microservices architectures with both external clients AND complex service-to-service traffic
- External clients hit the API gateway for auth/rate limiting/routing
- Internal service calls go through the mesh for mTLS, retries, and observability

**When API gateway alone is sufficient**:
- Monolith or small service count where service-to-service security is handled by network policy
- Early-stage startup where the complexity of a service mesh is not yet justified

**Common interview mistake**: Conflating API gateway with service mesh. Clearly distinguish: gateway = edge layer for external traffic; mesh = internal layer for service-to-service.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 10. Multi-Tenancy Architecture
  // ─────────────────────────────────────────────────────────
  {
    id: 'multi-tenancy-architecture',
    title: 'Multi-Tenancy Architecture',
    icon: 'users',
    color: '#10b981',
    questions: 5,
    description: 'Silo, pool, and bridge models for serving multiple customers from shared infrastructure — data isolation, noisy neighbor, and cost efficiency.',
    concepts: [
      'Silo model: dedicated infra per tenant',
      'Pool model: shared database, row-level isolation',
      'Bridge model: hybrid approach',
      'Row-level security and tenant ID filtering',
      'Noisy neighbor problem and mitigation',
      'Tenant onboarding and tiering',
    ],
    tips: [
      'Silo model gives the best isolation and compliance posture but the highest cost and operational overhead',
      'Pool model is most cost-efficient but requires bulletproof tenant ID filtering everywhere or risk data leaks',
      'Always use row-level security (RLS) at the database level as a defense-in-depth layer, even if app code already filters',
      'Noisy neighbor: one tenant\'s heavy load degrades other tenants. Mitigate with per-tenant rate limits and resource quotas',
      'Many SaaS products use bridge: shared pool for free/startup tiers, dedicated silo for enterprise tiers',
    ],
    introduction: `**Multi-tenancy** is the ability to serve multiple customers (tenants) from shared infrastructure while maintaining strong isolation between them. It is the foundational architectural challenge for any SaaS product.

The three models represent a spectrum of isolation vs cost. The **silo model** gives each tenant a completely separate deployment (separate database, separate compute, sometimes separate cloud account). Isolation is perfect, compliance is simple, but cost is highest and operations become complex at scale. The **pool model** puts all tenants in the same database, differentiating rows by a tenant_id column. Cost is lowest, but a bug that omits the tenant_id filter in a query could expose one tenant's data to another — a catastrophic security failure.

The **bridge model** is the pragmatic middle ground: use a shared pool for small tenants (free, starter, growth tiers) and dedicated silos for enterprise tenants that have compliance requirements (SOC 2, HIPAA, data residency) or that need guaranteed performance isolation. This is the model used by most mature SaaS companies including Salesforce, Slack, and Stripe.`,
    keyQuestions: [
      {
        question: 'How do you prevent data leaks between tenants in a pool model?',
        answer: `**Defense in depth — three layers**:

**Layer 1 — Application-level filtering**: Every query includes a WHERE tenant_id = ? clause. This is the first line of defense. Use a base repository class or ORM hook that automatically injects the tenant filter for all queries. Never allow raw SQL that bypasses this layer.

**Layer 2 — Database row-level security (RLS)**: PostgreSQL RLS policies enforce tenant isolation at the database level, independent of application code. A policy like:
\`\`\`sql
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id'));
\`\`\`
means even if application code forgets the WHERE clause, the database silently filters to the current tenant. This is the safety net that prevents application bugs from becoming data breaches.

**Layer 3 — Automated testing**: Add test cases that explicitly verify tenant A cannot see tenant B's data. Include these in CI so a regression cannot ship without detection.

**Additional safeguards**:
- Use separate database users per tenant tier, with permissions scoped to tenant-specific schemas (schema-per-tenant variant of pool model)
- Audit logs: record all cross-tenant access attempts
- At the API level, validate that the resource ID in the URL belongs to the authenticated tenant before executing any query`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 11. A/B Testing Platform
  // ─────────────────────────────────────────────────────────
  {
    id: 'ab-testing-platform',
    title: 'A/B Testing Platform Design',
    icon: 'barChart',
    color: '#10b981',
    questions: 5,
    description: 'Experiment assignment, metric tracking, statistical significance, and the architecture behind Yelp, Airbnb, and Netflix experimentation platforms.',
    concepts: [
      'Consistent hashing for assignment',
      'Holdout groups and control arms',
      'Statistical significance and power',
      'Mutual exclusion of experiments',
      'Assignment service and event collection',
      'Metric pipeline and analysis',
    ],
    tips: [
      'Assignment must be deterministic and consistent: user 12345 always gets variant B for experiment X, regardless of which server handles the request',
      'Use hashing: bucket = hash(user_id + experiment_id) % 100; variants are ranges of buckets',
      'Holdout groups: reserve 1-5% of users that never see any experiments, used as a long-term control to measure cumulative experiment debt',
      'Mutual exclusion: if experiment A and experiment B affect the same feature, users should be in only one of them to avoid interaction effects',
      'Minimum detectable effect (MDE) determines sample size: the smaller the effect you want to detect, the more users you need',
    ],
    introduction: `**A/B testing platforms** are the infrastructure that allows product teams to run controlled experiments at scale — showing different variants of a feature to different user cohorts and measuring the impact on business metrics. Companies like Airbnb, Netflix, and Booking.com run thousands of concurrent experiments per year, making the A/B testing platform a critical piece of infrastructure.

The core challenge is **consistent assignment**: user 12345 must always see variant B for experiment X, regardless of which server handles the request, whether they are on mobile or web, and whether they log out and log back in. This is achieved by hashing the (user_id, experiment_id) pair and mapping the result to a variant. No state is needed — the assignment can be recomputed on any server and will always agree.

**Statistical rigor** is the other critical challenge. A/B tests are only valid if they are properly designed: sufficient sample size (statistical power), a pre-specified success metric, and a predetermined stopping rule. Peeking at results early and stopping when you see significance leads to false positive rates of 20-50% — far above the intended 5% alpha level.`,
    keyQuestions: [
      {
        question: 'How do you handle overlapping experiments without interaction effects?',
        answer: `**The problem**: If experiment A changes the recommendation algorithm and experiment B changes the UI layout, a user in both experiments may respond differently than a user in only one. Interaction effects contaminate results.

**Solution 1 — Layers (Google's approach)**: Divide the experiment space into independent layers. Users are randomly assigned to a bucket in each layer independently. Layer 1 (ranking experiments) and Layer 2 (UI experiments) are orthogonal — any user in layer 1 bucket 15 can be in any layer 2 bucket. As long as layers are independent, interaction effects average out. Google documented this in "Overlapping Experiment Infrastructure: More, Better, Faster Experimentation" (2010).

**Solution 2 — Mutual exclusion groups**: Experiments that touch the same feature must be in the same mutual exclusion group. Only one experiment in the group runs on any given user at a time. Simpler to implement but limits parallelism — you can only run one experiment per feature at a time.

**Solution 3 — Holdout groups**: Reserve a fixed percentage of users that see no experiments. Use them as a long-term baseline to detect cumulative effects across all experiments over time.

**In practice**: Most companies use layers for orthogonal experiments (different product areas) and mutual exclusion for experiments within the same product area.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 12. Notification System Design
  // ─────────────────────────────────────────────────────────
  {
    id: 'notification-system-design',
    title: 'Notification System Design',
    icon: 'bell',
    color: '#10b981',
    questions: 6,
    description: 'Fan-out strategies, push vs pull, deduplication, retry, and dead-letter queues — designing a notification system for millions of users.',
    concepts: [
      'Fan-out on write vs fan-out on read',
      'Push (APNs, FCM) vs pull vs email/SMS',
      'Deduplication with idempotency keys',
      'Retry with exponential backoff',
      'Dead-letter queues for failed deliveries',
      'Rate limiting per user and preference management',
    ],
    tips: [
      'Fan-out on write (precompute): write to each subscriber\'s inbox at notification creation time. Fast reads, expensive writes for high-follower users',
      'Fan-out on read (pull): store one copy, each user fetches at read time. Cheap writes, expensive reads at scale',
      'Hybrid: fan-out on write for most users, fan-out on read for celebrities with millions of followers',
      'APNs and FCM (Firebase Cloud Messaging) are the channels for iOS and Android push notifications respectively',
      'Deduplication: use notification_id as idempotency key. If the same notification is processed twice (at-least-once delivery), skip the second delivery',
    ],
    introduction: `**Notification systems** are deceptively complex. At face value, "send a notification when event X occurs" seems simple. In practice, a production notification system at scale must handle millions of notifications per second across multiple channels (push, email, SMS, in-app), guarantee at-least-once delivery without duplicates, respect user preferences and do-not-disturb windows, and recover gracefully from downstream failures (APNs/FCM outages, email deliverability issues).

The central architectural challenge is **fan-out**: when a user with 10 million followers posts a tweet, you need to notify 10 million people. If this is done synchronously in the request path, the post API would take minutes. Instead, the notification is published to a message queue, and worker services consume the queue and send notifications asynchronously.

The **fan-out strategy** determines where the multiplication happens. Fan-out on write multiplies immediately at write time, pre-populating each subscriber's notification feed. Fan-out on read stores one notification and multiplies at read time. The tradeoff is write throughput vs read latency — a classic distributed systems tension.`,
    keyQuestions: [
      {
        question: 'How do you guarantee at-least-once delivery without duplicates?',
        answer: `**The fundamental tension**: message queues typically guarantee at-least-once delivery (a message may be redelivered after a failure). But users should not receive the same notification twice.

**Solution — Idempotency keys**:
1. Generate a unique notification_id when the notification is created (UUID or ULID)
2. When the worker processes the notification, check if notification_id already exists in a delivered_notifications table
3. If it does, skip processing (it was already delivered)
4. If not, attempt delivery and write notification_id to the table atomically

**Implementation**:
\`\`\`
BEGIN TRANSACTION;
  INSERT INTO delivered_notifications (notification_id, delivered_at)
  VALUES (?, NOW())
  ON CONFLICT (notification_id) DO NOTHING;

  -- Only if INSERT succeeded (not a duplicate):
  IF rows_affected > 0 THEN
    send_push_notification(user_id, message);
  END IF;
COMMIT;
\`\`\`

**Dead-letter queues (DLQ)**: After N retries (e.g., 3), move failed notifications to a DLQ. A separate process inspects DLQ messages for: expired APNs tokens (update token from Apple's feedback service), invalid email addresses (mark as bounced), or transient outages (replay when service recovers).

**User preference check**: Before each delivery attempt, check user preferences (do-not-disturb hours, channel preferences, notification type opt-outs). Preferences may change between when the notification was created and when it is delivered.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 13. Real-Time Collaboration
  // ─────────────────────────────────────────────────────────
  {
    id: 'real-time-collaboration',
    title: 'Real-Time Collaboration System',
    icon: 'users',
    color: '#10b981',
    questions: 5,
    description: 'OT vs CRDTs, Google Docs architecture, presence systems, and designing concurrent multi-user editing.',
    concepts: [
      'Operational Transformation (OT)',
      'CRDTs for collaborative editing',
      'Conflict resolution and convergence',
      'Presence and cursor synchronization',
      'WebSocket connection management',
      'Offline editing and resync',
    ],
    tips: [
      'The core problem: two users edit the same document simultaneously and both changes must be preserved without conflicts',
      'OT transforms operations relative to each other; requires a central server to order operations',
      'CRDTs converge without central coordination; used by Figma, Notion, and Yjs-based editors',
      'Presence (who is editing where) is typically implemented as ephemeral pub/sub, not persisted state',
      'Offline editing: buffer local changes and replay against the server state on reconnect, resolving conflicts',
    ],
    introduction: `**Real-time collaborative editing** — where multiple users edit the same document simultaneously and see each other's changes instantly — is one of the most technically challenging system design problems. The core difficulty: two users can make concurrent edits that conflict, and both changes must be preserved (not silently discarded) while keeping all clients in a consistent state.

Two main approaches exist. **Operational Transformation (OT)**, used by Google Docs, transforms operations against each other: if user A inserts "X" at position 5, and user B simultaneously inserts "Y" at position 3, when A's operation is applied after B's, it must be transformed to position 6 (shifted by B's insertion). OT requires a central server to define the canonical operation order.

**CRDTs** (Conflict-Free Replicated Data Types) use data structures that merge without transformation. Each character in a collaborative text editor gets a unique identifier based on the inserting user's ID and a logical clock. Concurrent inserts at the "same position" resolve deterministically by comparing character IDs. Yjs, Automerge, and Figma's multiplayer use CRDTs and can operate peer-to-peer without a central ordering server.`,
    keyQuestions: [
      {
        question: 'How does Google Docs synchronize edits across multiple simultaneous users?',
        answer: `Google Docs uses **Operational Transformation with a central server** as the arbiter of operation order.

**The flow**:
1. User A types a character. The client creates an operation: INSERT("e", position=15) and sends it to the server, continuing to edit locally (optimistic local application).
2. User B simultaneously types a character at position 10. Client creates INSERT("h", position=10) and sends to server.
3. The server receives A's operation first, applies it to the canonical document, and broadcasts to all clients.
4. The server receives B's operation second. Before applying, it transforms B's operation against A's: since A inserted before position 10, B's position becomes 11. The server applies INSERT("h", position=11) and broadcasts.
5. Client A, which already saw its own insert, receives B's transformed operation and applies it at position 11.
6. Client B, which already applied its own insert, receives A's operation and transforms it: since B inserted at position 10, A's position 15 becomes 16. Applies INSERT("e", position=16).

Both clients converge to the same state despite the concurrent edits.

**Presence layer** is separate: user cursor positions are broadcast via WebSocket as ephemeral state, not persisted. Each cursor update includes user_id, document_id, and position. The server fans out cursor updates to all other connected clients for the same document. Cursor positions are not part of the OT operation history — they are best-effort real-time state.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 14. Webhook System Design
  // ─────────────────────────────────────────────────────────
  {
    id: 'webhooks-design',
    title: 'Webhook System Design',
    icon: 'zap',
    color: '#10b981',
    questions: 5,
    description: 'Delivery guarantees, retry backoff, signature verification, and fan-out — designing webhooks at the scale of Stripe or GitHub.',
    concepts: [
      'At-least-once vs exactly-once delivery',
      'Retry with exponential backoff and jitter',
      'HMAC-SHA256 signature verification',
      'Dead-letter queues for failed deliveries',
      'Fan-out to multiple subscribers',
      'Payload versioning and schema evolution',
    ],
    tips: [
      'Webhooks are push-based HTTP callbacks: when event X occurs, call the subscriber\'s URL with the event payload',
      'Always sign webhook payloads with HMAC-SHA256; the subscriber verifies the signature before processing',
      'Use exponential backoff with jitter for retries: 1s, 2s, 4s, 8s, 16s... with random jitter to avoid thundering herd',
      'After N failed retries (e.g., 24 hours of attempts), move to dead-letter storage and alert the subscriber',
      'Webhook delivery is inherently at-least-once; require subscribers to implement idempotency with the event ID',
    ],
    introduction: `**Webhooks** are HTTP callbacks that notify external systems when an event occurs. Rather than polling an API for changes, subscribers register a URL and receive an HTTP POST whenever a relevant event happens. Webhooks power Stripe payment notifications, GitHub push events, Shopify order webhooks, and thousands of other integrations.

The central design challenge is **reliable delivery**: the subscriber's server may be down, slow, or return errors. The webhook system must retry failed deliveries without delivering the same event twice (a payment webhook delivered twice could trigger a double-charge). Since the network and subscriber servers are unreliable, at-least-once delivery is the practical guarantee, and subscribers are required to implement idempotency using the event ID.

**Security** is equally critical. Any server on the internet can call your webhook endpoint, so you must verify that incoming requests genuinely originate from the expected source. The standard mechanism is HMAC-SHA256: the webhook sender signs the payload with a secret key known only to the sender and the subscriber, and the subscriber verifies the signature before processing.`,
    keyQuestions: [
      {
        question: 'How do you design a webhook delivery system that handles subscriber failures?',
        answer: `**Architecture components**:

1. **Event producer**: When an event occurs (e.g., payment.succeeded), write the event to a persistent store (DB or Kafka topic). Do not deliver webhooks synchronously in the request path.

2. **Delivery worker**: Consume events from the persistent store. For each event, look up all subscribers registered for that event type and their endpoint URLs. Attempt HTTP POST to each endpoint with a timeout (e.g., 30 seconds).

3. **Retry logic**: On failure (non-2xx response, timeout, connection error), schedule a retry with exponential backoff:
   - Attempt 1: immediate
   - Attempt 2: 5 minutes
   - Attempt 3: 30 minutes
   - Attempt 4: 2 hours
   - Attempt 5: 12 hours
   - After 72 hours of attempts: move to dead-letter queue

4. **Signature**: Before sending, compute \`HMAC-SHA256(secret, timestamp + "." + payload)\`. Include in \`Webhook-Signature\` header along with the timestamp. Subscribers recompute and compare.

5. **Dead-letter handling**: Alert the subscriber via email/dashboard. Allow manual replay from the DLQ once the subscriber fixes their endpoint.

6. **Fan-out**: If 1,000 subscribers are registered for payment.succeeded, process deliveries in parallel with a bounded worker pool (e.g., 50 concurrent deliveries). Avoid sequential processing for large subscriber counts.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 15. Feature Flags System Design
  // ─────────────────────────────────────────────────────────
  {
    id: 'feature-flags-design',
    title: 'Feature Flags System Design',
    icon: 'toggleRight',
    color: '#10b981',
    questions: 5,
    description: 'Flag evaluation, targeting rules, gradual rollouts, kill switches, and the OpenFeature standard — controlling feature releases without deployments.',
    concepts: [
      'Server-side vs client-side flag evaluation',
      'Targeting rules: user ID, cohort, percentage',
      'Gradual rollout and canary release',
      'Kill switch for incident response',
      'Flag lifecycle and stale flag debt',
      'OpenFeature standard and vendors',
    ],
    tips: [
      'Feature flags decouple deployment (code ships to production) from release (feature is turned on for users)',
      'Consistent hashing for percentage rollout: hash(user_id + flag_key) % 100 < rollout_percentage',
      'Kill switches are the most critical use case: a flag that disables a feature globally within seconds of an incident',
      'Client-side flags (evaluated in the browser) risk exposing your targeting rules to users; use for cosmetic features only',
      'Stale flag debt: flags that are always on or always off but never cleaned up. Schedule a quarterly flag audit',
    ],
    introduction: `**Feature flags** (also called feature toggles) allow teams to ship code to production without immediately releasing it to users. A flag evaluation at runtime determines which code path executes, enabling gradual rollouts, A/B tests, kill switches, and beta programs — all without a new deployment.

The core pattern: wrap new code in an \`if (isEnabled("new_checkout_flow", user))\` check. When the flag is off, the old code runs. When the flag is on, the new code runs. Turning on the flag requires only a configuration change — no deployment, no downtime.

**The most critical use case is the kill switch**: when an incident is caused by a newly released feature, operators can disable it globally within seconds by flipping a flag — far faster than rolling back a deployment. Stripe, Netflix, and Shopify all attribute faster incident resolution to kill switch patterns.

The OpenFeature standard (CNCF project) provides a vendor-neutral SDK for flag evaluation, allowing teams to switch between LaunchDarkly, Unleash, Flagsmith, or a homegrown system without changing application code.`,
    keyQuestions: [
      {
        question: 'How do you design a feature flag system that evaluates flags with <1ms latency?',
        answer: `**The challenge**: flag evaluation must be extremely fast (under 1ms) because it happens on every request. Calling a remote flag service on every request would add 10-50ms of latency.

**Solution — Local in-process evaluation with background sync**:

1. **Bootstrap**: On service startup, fetch all flag configurations from the flag service and load them into an in-memory hash map. This takes ~100ms but happens once.

2. **Evaluation**: At request time, evaluate flags entirely in memory. No network call. For a flag with rules (user_id in list, percentage rollout), compute: \`hash(user_id + flag_key) % 100 < rollout_percentage\`. This is ~microseconds.

3. **Background sync**: A background goroutine/thread polls the flag service every 10-30 seconds (or subscribes to a Server-Sent Events stream for real-time updates). When flags change, atomically swap the in-memory config: \`flags.Store(newConfig)\`. No request handling is interrupted.

4. **Kill switch responsiveness**: A flag change takes at most one polling interval (30s) to propagate to all instances. For truly instant kill switches (< 1s), use a pub/sub channel (Redis Pub/Sub, SNS/SQS) to push updates to all instances immediately.

**Consistency**: Because each instance evaluates flags independently with potentially slightly different configs (one polled 5 seconds before another), a user may get different behavior on different requests during a rollout window. This is acceptable for gradual rollouts; use session affinity if consistency is critical.`,
      },
    ],
  },
];
