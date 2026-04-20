// Distributed system design patterns — consistency, availability, and data integrity

export const systemDesignPatternCategories = [
  { id: 'consistency', name: 'Consistency Patterns', icon: 'shield', color: '#3b82f6' },
  { id: 'availability', name: 'Availability Patterns', icon: 'zap', color: '#10b981' },
  { id: 'data-integrity', name: 'Data Integrity Patterns', icon: 'database', color: '#8b5cf6' },
  { id: 'applied', name: 'Applied Architecture', icon: 'layers', color: '#06b6d4' },
];

export const systemDesignPatternCategoryMap = {
  'write-ahead-log': 'data-integrity',
  'gossip-protocol': 'availability',
  'vector-clocks': 'consistency',
  'merkle-trees': 'data-integrity',
  'split-brain': 'consistency',
  'hinted-handoff': 'availability',
  'read-repair': 'consistency',
  'segmented-log': 'data-integrity',
  'high-water-mark': 'consistency',
  'phi-accrual-failure-detection': 'availability',
  'outbox-pattern': 'data-integrity',
  'fencing': 'consistency',
  'real-time-updates': 'applied',
  'dealing-with-contention': 'applied',
  'multi-step-processes': 'applied',
  'scaling-reads': 'applied',
  'scaling-writes': 'applied',
  'handling-large-blobs': 'applied',
  'managing-long-running-tasks': 'applied',
};

export const systemDesignPatterns = [
  // ─────────────────────────────────────────────────────────
  // 1. Write-Ahead Log (data-integrity)
  // ─────────────────────────────────────────────────────────
  {
    id: 'write-ahead-log',
    title: 'Write-Ahead Log (WAL)',
    icon: 'fileText',
    color: '#8b5cf6',
    questions: 9,
    description: 'Append-only log written before applying changes, guaranteeing crash recovery and durability in databases and distributed systems.',
    concepts: [
      'Log-structured storage',
      'Crash recovery and replay',
      'Checkpointing and truncation',
      'LSM trees and memtables',
      'Fsync and durability guarantees',
      'Log sequence numbers (LSN)',
      'Group commit optimization',
    ],
    tips: [
      'WAL is the foundation of ACID durability — every relational database uses it',
      'Explain the write path: WAL append → memtable update → eventual flush to disk',
      'Know the difference between fsync on every commit vs group commit batching',
      'Checkpointing truncates the WAL so it does not grow forever',
      'LSM trees (used by LevelDB, RocksDB, Cassandra) combine WAL with sorted run compaction',
      'In interviews, connect WAL to replication — the replica replays the leader\'s log',
    ],

    introduction: `The **Write-Ahead Log** (WAL) is one of the most fundamental patterns in data systems. The rule is simple: before any change is applied to the actual data structures on disk, a record of that change is appended to a sequential, append-only log file. If the process crashes after writing the log but before updating the data, the system can replay the log on startup and reach a consistent state. This deceptively simple idea underpins virtually every durable storage system built in the last four decades.

Every major database — PostgreSQL, MySQL/InnoDB, SQLite, and all LSM-tree engines — relies on a WAL for **durability** and **atomicity**. Without it, a crash during a partial write could leave data pages in a corrupted, half-written state that is impossible to recover from deterministically. **PostgreSQL** uses 16MB WAL segment files and supports both synchronous and asynchronous replication through WAL shipping. **RocksDB** (used by Meta, CockroachDB, and TiKV) writes WAL entries in 32KB blocks with per-block checksums to detect corruption. **SQLite** offers both rollback journal and WAL modes, with WAL mode enabling concurrent readers and a single writer.

Beyond single-node crash recovery, the WAL pattern extends naturally to **replication**. A follower can subscribe to the leader's log stream and apply the same sequence of changes, producing an identical copy. Kafka's commit log, etcd's Raft log, and PostgreSQL streaming replication all follow this principle. **Amazon Aurora** took this further by making the WAL the replication unit itself — the database ships only WAL records to storage nodes, which reconstruct data pages locally, reducing network traffic by up to 7x compared to shipping full pages.

**When to use WAL**: Any system that needs crash recovery, durability guarantees, or change-based replication. **When NOT to use WAL**: Purely in-memory caches where data loss on crash is acceptable (e.g., Memcached), or append-only immutable stores where data is written once and never modified. Systems with extreme write latency requirements may also skip fsync on every commit in favor of group commit, trading a small durability window for throughput.`,

    keyQuestions: [
      {
        question: 'How does a write-ahead log guarantee durability after a crash?',
        answer: `**Core guarantee**: If the WAL entry has been fsynced to disk, the change is durable — even if the process crashes before the actual data file is updated.

**Write path with WAL**:
\`\`\`
Client WRITE request
        │
        ▼
┌─────────────────┐
│ Append to WAL   │◄── Sequential I/O (fast)
│ + fsync to disk │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update in-memory │   (memtable / buffer pool)
│ data structure   │
└────────┬────────┘
         │
         ▼  (eventually)
┌─────────────────┐
│ Flush to data   │◄── Background checkpoint
│ files on disk   │
└─────────────────┘
\`\`\`

**Crash recovery**:
1. On startup the system reads the WAL from the last checkpoint
2. It replays every committed entry that was not yet reflected in data files
3. It discards any uncommitted (partial) entries
4. The data files are now consistent with all committed transactions

**Why sequential?** WAL appends are sequential writes — no random seeks. Modern SSDs and HDDs can sustain very high throughput for sequential I/O, making the per-transaction cost low.

**Group commit** batches multiple transactions' WAL writes into a single fsync, amortizing the expensive disk flush across many commits. PostgreSQL uses this to achieve tens of thousands of commits per second.`
      },
      {
        question: 'What is the relationship between WAL, LSM trees, and SSTables?',
        answer: `**LSM-tree architecture** (used by LevelDB, RocksDB, Cassandra, HBase):

\`\`\`
  Write ──► WAL (on disk, sequential append)
             │
             ▼
         Memtable (in-memory sorted structure)
             │  (when full)
             ▼
      Flush to SSTable (Sorted String Table)
             │
      Level 0: SST SST SST  (unsorted between files)
             │  compaction
      Level 1: ┌──────────┐ (sorted, non-overlapping)
      Level 2: ┌────────────────┐
      Level 3: ┌──────────────────────┐
\`\`\`

**Role of WAL in LSM trees**:
- The memtable lives in RAM — a crash would lose it
- WAL persists every write before the memtable update
- On recovery: replay WAL → rebuild memtable → resume
- Once a memtable is flushed to an SSTable on disk, its WAL segment can be deleted

**Compaction**: Background process that merges SSTables across levels, removing duplicates and tombstones. This is what makes reads efficient despite the write-optimized structure.

**Trade-off**: LSM trees optimize for writes (sequential WAL + memtable) at the cost of read amplification (may need to check multiple levels). B-trees (PostgreSQL, MySQL) optimize for reads at the cost of random writes.`
      },
      {
        question: 'How is WAL used for replication in distributed databases?',
        answer: `**Log-based replication**: The leader's WAL becomes the replication stream.

\`\`\`
┌────────────┐     WAL Stream     ┌────────────┐
│   Leader   │ ──────────────────►│  Follower  │
│            │    (continuous)     │            │
│ WAL ─► DB  │                    │ WAL ─► DB  │
└────────────┘                    └────────────┘
       │            WAL Stream     ┌────────────┐
       └─────────────────────────►│  Follower  │
                                   │ WAL ─► DB  │
                                   └────────────┘
\`\`\`

**PostgreSQL streaming replication**:
1. Leader writes to its WAL as normal
2. WAL sender process ships WAL records to replicas in real time
3. Replica's WAL receiver writes records to its own WAL
4. Replica's recovery process replays the WAL to update data files

**Synchronous vs asynchronous**:
- **Synchronous**: Leader waits for at least one replica to fsync the WAL record before acknowledging the client. Guarantees no data loss on leader failure, but adds latency.
- **Asynchronous**: Leader acknowledges immediately. Faster, but failover can lose recent writes.

**Kafka's commit log** follows the same principle — producers append to a partition log, consumers replay it from their last committed offset. The log IS the database.`
      },
      {
        question: 'What is checkpointing and why is it necessary?',
        answer: `**Problem**: Without checkpointing the WAL grows forever, and recovery takes longer and longer because the entire log must be replayed.

**Checkpoint process**:
\`\`\`
WAL:  [E1][E2][E3][E4][E5][E6][E7][E8][E9]
                         ▲
                    Checkpoint
                    (E1-E5 flushed to disk)

After checkpoint:
  - WAL segments before E5 can be deleted
  - Recovery only replays E6-E9
\`\`\`

**How it works**:
1. The system periodically flushes all dirty pages (in-memory changes) to the data files on disk
2. It records which WAL position (LSN) is now fully reflected in the data files
3. WAL entries before that LSN are safe to delete

**Fuzzy checkpointing**: Does not stop all writes during the checkpoint. Instead it notes which pages are dirty, flushes them in the background, and records the oldest WAL position that any dirty page depends on.

**Key insight for interviews**: Checkpointing is a space vs recovery-time trade-off. More frequent checkpoints = smaller WAL, faster recovery, but more I/O overhead during normal operation.`
      },
      {
        question: 'What is group commit and how does it improve WAL performance?',
        answer: `**The problem**: Calling fsync after every single transaction commit is expensive. Each fsync forces a disk flush, which on a spinning disk takes ~5-10ms (limiting throughput to ~100-200 commits/s) and on an SSD still costs ~50-200 microseconds of latency.

**Group commit optimization**:
\`\`\`
Without group commit:
  Tx1: write WAL → fsync → ACK    (5ms)
  Tx2: write WAL → fsync → ACK    (5ms)
  Tx3: write WAL → fsync → ACK    (5ms)
  Total: 15ms for 3 transactions

With group commit:
  Tx1: write WAL ─┐
  Tx2: write WAL ──┤── single fsync → ACK all three
  Tx3: write WAL ─┘
  Total: 5ms for 3 transactions (3x throughput)
\`\`\`

**How it works in PostgreSQL**:
1. Transactions write their WAL records to the WAL buffer (in memory)
2. The first transaction to request a commit triggers a timer (commit_delay, default 0)
3. During the delay window, additional transactions append to the same buffer
4. One fsync flushes all accumulated WAL records together
5. All waiting transactions are acknowledged simultaneously

**Configuration**: PostgreSQL's \`synchronous_commit\` setting controls the trade-off:
- \`on\`: Wait for local WAL fsync (default, safe)
- \`remote_write\`: Wait for replica to receive but not fsync (faster, small risk)
- \`off\`: Do not wait for fsync at all (fastest, risk of losing last ~600ms of commits on crash)

**Real-world impact**: PostgreSQL with group commit can sustain 50,000+ commits/second on modern SSDs, compared to a few hundred without it. RocksDB uses a similar technique with its WAL write batch grouping.`
      },
      {
        question: 'How do WAL implementations differ across PostgreSQL, RocksDB, and SQLite?',
        answer: `**PostgreSQL WAL**:
\`\`\`
  Segment size:  16MB files (configurable at compile time)
  Format:        Binary records with LSN, transaction ID, and redo data
  Checkpointing: Background checkpointer process, fuzzy checkpoints
  Replication:   Streaming replication via WAL sender/receiver
  Recovery:      REDO-only (UNDO handled by MVCC visibility rules)
  Use case:      OLTP workloads with strong ACID requirements
\`\`\`

**RocksDB WAL (used by CockroachDB, TiKV, Meta)**:
\`\`\`
  Block size:    32KB blocks within WAL files
  Format:        Block-based with per-block CRC32 checksums
  Checkpointing: Memtable flush replaces checkpointing
  Replication:   Not built-in; left to the embedding system (Raft in CockroachDB)
  Recovery:      Replay WAL to rebuild memtable
  Use case:      Write-heavy workloads, embedded key-value storage
\`\`\`

**SQLite WAL mode**:
\`\`\`
  File:          Single -wal file alongside the main database
  Readers:       Can read main DB while writer appends to WAL
  Checkpointing: WAL entries transferred back to main DB file
  Replication:   Litestream (external tool) tails the WAL for S3 backup
  Use case:      Embedded databases, mobile apps, edge computing
\`\`\`

**Key differences**:
| Property | PostgreSQL | RocksDB | SQLite |
|----------|-----------|---------|--------|
| Architecture | B-tree pages | LSM tree | B-tree pages |
| WAL purpose | Crash recovery + replication | Memtable protection | Concurrent reads + crash recovery |
| Segment management | Fixed-size segments | Per-column-family WAL files | Single WAL file |
| Corruption detection | Page-level checksums | Block-level CRC32 | WAL frame checksums |
| Group commit | Yes (commit_delay) | Yes (write batch) | Yes (WAL sync mode) |`
      },
      {
        question: 'When should you use WAL and when should you avoid it?',
        answer: `**Use WAL when**:
\`\`\`
1. ACID durability is required
   Any database storing financial transactions, user data, or
   business-critical state MUST use a WAL for crash recovery.

2. Change-based replication is needed
   WAL enables streaming replication (PostgreSQL), Raft log
   replication (etcd, CockroachDB), and CDC (Debezium reads the WAL).

3. Write throughput matters
   WAL converts random writes (updating data pages) into sequential
   appends (WAL entries), which is 10-100x faster on both HDDs and SSDs.

4. Point-in-time recovery (PITR)
   Archived WAL segments allow restoring a database to any moment
   in time, not just the last backup.
\`\`\`

**Avoid WAL when**:
\`\`\`
1. In-memory caches without persistence
   Memcached, Redis in pure cache mode — data loss on crash is acceptable,
   and WAL overhead would reduce throughput for no benefit.

2. Immutable append-only stores
   If data is only inserted and never updated (e.g., log aggregation),
   the data file IS the log — a separate WAL is redundant.

3. Extreme latency sensitivity with acceptable data loss
   Some real-time systems (game servers, sensor ingestion) accept losing
   the last few seconds of data rather than paying fsync latency.
\`\`\`

**Comparison with related patterns**:
\`\`\`
  WAL vs Event Sourcing:
    WAL = internal implementation detail, events are redo records
    Event Sourcing = domain-level events as the source of truth
    WAL is low-level and automatic; event sourcing is application-level

  WAL vs Outbox Pattern:
    WAL ensures internal crash recovery
    Outbox ensures external event delivery to message brokers
    They complement each other — Debezium reads the WAL to publish outbox events

  WAL vs Segmented Log:
    WAL is typically segmented in practice (PostgreSQL 16MB segments)
    Segmented log is the general pattern; WAL is a specific application of it
\`\`\``
      },
      {
        question: 'How do disk-level failures affect WAL reliability, and how do databases mitigate them?',
        answer: `**The core danger**: WAL assumes that once fsync returns success, the data is on durable media. But disks can lie — some drives, controllers, and filesystems report fsync success before data actually reaches persistent storage.

**Failure modes**:
\`\`\`
1. Write reordering:
   OS or disk controller reorders writes for performance
   WAL entry may be fsynced but dependent metadata is not
   → Corrupted WAL on crash recovery

2. Torn writes:
   Power failure during a 4KB block write
   Only partial block reaches disk
   → Half-written WAL entry with invalid data

3. Silent data corruption (bit rot):
   Magnetic media degrades over time
   Bits flip without any error signal
   → WAL entry reads back differently from what was written

4. Phantom writes:
   Drive firmware reports write success but data lands in
   wrong location due to sector mapping error
   → Valid CRC but wrong data at wrong offset
\`\`\`

**Mitigation strategies used by production databases**:
\`\`\`
PostgreSQL:
  - full_page_writes: On first modification after checkpoint,
    write entire 8KB page to WAL (protects against torn pages)
  - wal_level=replica: Include enough info for full page reconstruction
  - Checksums on data pages (optional but recommended)

RocksDB:
  - Per-block CRC32 checksums in WAL files
  - paranoid_file_checks: Verify written data by reading it back
  - Block alignment to prevent torn writes at filesystem boundaries

SQLite:
  - WAL frame checksums detect corruption during replay
  - Journal mode provides rollback capability
  - Page-level checksums (optional)
\`\`\`

**Hardware-level defense**: Use enterprise SSDs with power-loss protection (capacitors that flush in-flight writes to NAND on power failure). Avoid consumer drives in production databases. Enable filesystem barriers (default on ext4/XFS).

**Interview takeaway**: A WAL is only as reliable as the underlying storage. Always mention checksums, full-page writes, and the assumption that fsync must actually flush to durable media for the WAL guarantee to hold.`
      },
      {
        question: 'How does Amazon Aurora rethink the WAL for cloud-native databases?',
        answer: `**Traditional approach (PostgreSQL on EC2)**:
\`\`\`
  Primary ──── WAL records ────► Replica 1
     │                             │
     │         WAL records ────► Replica 2
     │
     └── Writes data pages to EBS (synchronous)
         + Ships WAL for replication

  Total network I/O per write:
    1. WAL to disk (EBS)
    2. WAL to replica 1
    3. WAL to replica 2
    4. Data pages to EBS (eventually)
    = 4x amplification
\`\`\`

**Aurora's insight — "the log IS the database"**:
\`\`\`
  Primary ──── WAL records only ────► Storage Layer
                                        (6 copies across 3 AZs)
                                        │
                                        ▼
                                   Storage nodes reconstruct
                                   data pages from WAL locally
                                        │
                                        ▼
                                   Replicas read from
                                   shared storage (cached)

  Total network I/O per write:
    1. WAL to storage layer (quorum write: 4 of 6)
    = 1x amplification (no data page shipping!)
\`\`\`

**Key design decisions**:
1. **Only ship redo log records** — never ship data pages over the network. Storage nodes materialize pages locally by applying WAL records. This reduces network traffic by ~7x.
2. **Quorum writes** — write to 4 of 6 storage nodes (across 3 AZs) before acknowledging. Can tolerate an entire AZ failure plus one additional node.
3. **Background page materialization** — storage nodes asynchronously apply log records to create data pages. Reads that hit a page not yet materialized trigger on-demand application of pending log records.
4. **Read replicas share storage** — up to 15 read replicas access the same storage volume with ~10-20ms replication lag (just the time to apply new WAL records to their buffer cache).

**Impact on checkpointing**: Aurora eliminates traditional checkpointing entirely. Since the storage layer continuously applies WAL records, there is no need for the database to periodically flush dirty pages. This removes checkpoint-related I/O spikes.

**Interview takeaway**: Aurora demonstrates that the WAL can be more than a recovery mechanism — it can be the entire replication and storage protocol. This is a powerful example of how rethinking a fundamental pattern for the cloud yields dramatic improvements.`
      },
    ],

    dataModel: {
      description: 'WAL entry structure and write flow',
      schema: `WAL Entry Format:
  ┌──────────┬─────────┬───────────┬──────────┬──────────┐
  │   LSN    │  TxnID  │  TableID  │ OldValue │ NewValue │
  │ (seq #)  │         │ + RowID   │ (undo)   │ (redo)   │
  └──────────┴─────────┴───────────┴──────────┴──────────┘

Write Flow:
  1. BEGIN TxN → assign TxnID
  2. For each modification:
     a. Build WAL record (LSN, TxnID, table, old/new)
     b. Append to WAL buffer
  3. COMMIT → fsync WAL buffer to disk
  4. Apply changes to in-memory pages (buffer pool)
  5. Background: flush dirty pages → data files
  6. Checkpoint: record flushed LSN, truncate old WAL

Recovery Flow:
  1. Find last checkpoint LSN
  2. Redo: replay WAL from checkpoint forward
  3. Undo: roll back uncommitted transactions
  4. System is now consistent`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. Gossip Protocol (availability)
  // ─────────────────────────────────────────────────────────
  {
    id: 'gossip-protocol',
    title: 'Gossip Protocol',
    icon: 'radio',
    color: '#10b981',
    questions: 8,
    description: 'Epidemic-style protocol where nodes periodically exchange state with random peers, enabling decentralized membership, failure detection, and metadata propagation.',
    concepts: [
      'Epidemic dissemination',
      'Anti-entropy and rumor mongering',
      'Failure detection via heartbeats',
      'Crashing vs Byzantine faults',
      'Convergence time analysis',
      'SWIM protocol',
      'Phi-accrual integration',
    ],
    tips: [
      'Gossip achieves O(log N) convergence — every node knows within log-N rounds',
      'Cassandra uses gossip for cluster membership, schema distribution, and token ownership',
      'Contrast gossip with centralized approaches (ZooKeeper) — gossip has no single point of failure',
      'Know the fan-out parameter: each round a node contacts k random peers (typically k=3)',
      'Gossip is probabilistic, not deterministic — there is a small window where nodes disagree',
      'In interviews, explain how gossip handles network partitions gracefully — each partition continues gossiping internally',
    ],

    introduction: `The **Gossip Protocol** (also called epidemic protocol) is a peer-to-peer communication mechanism inspired by how rumors spread through a social network. Each node periodically selects a random subset of peers and exchanges its local state. Over successive rounds, information propagates exponentially until every node in the cluster converges on a shared view. Three variants exist: **push** (send what you know), **pull** (ask what others know), and **push-pull** (exchange both ways, which is the most common in practice).

Gossip is valued for its **decentralization** — there is no coordinator, no single point of failure, and no leader election required for membership management. Systems like **Cassandra**, **DynamoDB**, **Consul**, and **Serf** rely on gossip for cluster membership, failure detection, and lightweight metadata propagation. **HashiCorp Consul** uses two gossip pools: a LAN pool for intra-datacenter communication and a WAN pool for cross-datacenter federation. **Cassandra** gossips every second, exchanging node health, schema versions, token ownership, and load information across the entire cluster without any central coordinator.

The mathematical property that makes gossip powerful is **logarithmic convergence**: in a cluster of N nodes with fan-out k, information reaches every node in approximately O(log N) rounds. For a 1,000-node cluster gossiping every second, full propagation takes roughly 10 seconds — without any centralized broadcast. The gossip interval can be tuned as low as 10ms for latency-sensitive environments, achieving propagation across a large datacenter in roughly 3 seconds.

**When to use gossip**: Large clusters (hundreds to thousands of nodes) that need membership tracking, failure detection, or metadata propagation where brief inconsistency windows are acceptable. **When NOT to use gossip**: When you need strong consistency guarantees (use consensus protocols like Raft or Paxos), when cluster size is small enough for direct heartbeating (under 10 nodes), or when you need real-time, deterministic propagation rather than probabilistic convergence.`,

    keyQuestions: [
      {
        question: 'How does gossip-based failure detection work?',
        answer: `**Mechanism**: Each node maintains a heartbeat counter and gossips it to random peers. If a node's heartbeat has not incremented for a configured timeout, it is marked as suspected/down.

\`\`\`
Round 1: Node A gossips to B and D
  A: {A:42, B:37, C:19, D:28}
  B receives → updates its view with max(local, received)

Round 2: B gossips to C (includes A's updated counter)
  C now knows A is alive (transitively)

Detection:
  If C's record of D's heartbeat = 28 for T seconds:
    D is marked SUSPECT → then DOWN after T2
\`\`\`

**SWIM Protocol** (Scalable Weakly-consistent Infection-style Membership):
1. Node A picks random target B and sends PING
2. If B responds with ACK, B is alive
3. If B does not respond, A asks k random nodes to PING B (indirect probe)
4. If none get ACK from B, A marks B as suspect
5. Suspicion is disseminated via the gossip channel (piggybacked)

**Advantages over heartbeat-to-all**:
- O(1) network load per node per round (fixed fan-out)
- No centralized failure detector
- Partitioned nodes are detected by the reachable partition

**Tuning**: Higher fan-out (k) and shorter gossip interval → faster detection, more bandwidth. Typical: k=3, interval=1s, suspect timeout=10s.`
      },
      {
        question: 'How does Cassandra use gossip for cluster management?',
        answer: `**Cassandra's gossip layer** handles three responsibilities:

\`\`\`
┌─────────┐  gossip  ┌─────────┐  gossip  ┌─────────┐
│ Node A  │◄────────►│ Node B  │◄────────►│ Node C  │
│ Token:1 │          │ Token:50│          │Token:100│
│ State:  │          │ State:  │          │ State:  │
│ NORMAL  │          │ NORMAL  │          │ JOINING │
└─────────┘          └─────────┘          └─────────┘
     ▲                                         │
     └──────────── gossip ─────────────────────┘
\`\`\`

**1. Membership and topology**:
- Every node knows every other node's token range, data center, rack
- New nodes announce themselves via gossip → cluster discovers them
- Seed nodes bootstrap the initial gossip contact list

**2. State propagation**:
- Schema changes, token assignments, load information
- Each piece of state has a version number; highest version wins
- Cramer's gossip digest exchange: nodes send digests first, then request only stale data

**3. Failure detection**:
- Cassandra uses the **phi-accrual failure detector** on top of gossip heartbeats
- Rather than a binary alive/dead, phi represents a suspicion level (0 to infinity)
- When phi exceeds a threshold (default: 8), the node is considered down

**Consistency note**: Gossip is eventually consistent — during a short window after a topology change, different nodes may have different views. This is acceptable because Cassandra's read/write paths use quorum, not the gossip membership directly.`
      },
      {
        question: 'What is the convergence time for gossip and how do you analyze it?',
        answer: `**Key formula**: With N nodes and fan-out k, the expected rounds for all nodes to receive a message is approximately:

\`\`\`
  Rounds ≈ log_k(N) × C

  where C is a small constant (typically 2-3 for high probability)
\`\`\`

**Example analysis (1000-node cluster, fan-out k=3, interval=1s)**:
\`\`\`
  Round 0:  1 node has info
  Round 1:  1 + 3 = 4 nodes
  Round 2:  4 + 12 = 16 nodes
  Round 3:  16 + 48 = 64 nodes
  Round 4:  64 + 192 = 256 nodes
  Round 5:  256 + 768 ≈ 1000 nodes (saturates)

  ~6 rounds × 1s interval ≈ 6 seconds for propagation
  With safety margin: ~10-15 seconds
\`\`\`

**Bandwidth analysis**:
- Each gossip message: digest of all node states ≈ N × state_size
- For 1000 nodes × 100 bytes/state = 100KB per gossip message
- Each node sends k=3 messages/round = 300KB/s per node
- Total cluster bandwidth: 1000 × 300KB/s = 300MB/s (manageable)

**Optimizations**:
- **Digest exchange**: Only send full state for entries the peer is behind on
- **Cramer protocol**: Three-way handshake — SYN (digests) → ACK (needed data) → ACK2 (requested data)
- **Piggybacking**: Attach membership updates to application-level messages`
      },
      {
        question: 'What are the trade-offs of gossip vs centralized coordination (e.g., ZooKeeper)?',
        answer: `**Gossip (decentralized)**:
\`\`\`
  ┌───┐    ┌───┐    ┌───┐
  │ A │◄──►│ B │◄──►│ C │    Every node is equal
  └─┬─┘    └─┬─┘    └─┬─┘    No coordinator
    │        │        │
    └──►┌───┐◄───────┘
        │ D │
        └───┘
\`\`\`

**Centralized (ZooKeeper/etcd)**:
\`\`\`
         ┌──────────┐
    ┌───►│ ZooKeeper│◄───┐
    │    │ (leader) │    │
    │    └──────────┘    │
  ┌─┴─┐   ┌───┐      ┌─┴─┐
  │ A │   │ B │      │ C │
  └───┘   └───┘      └───┘
\`\`\`

| Property | Gossip | Centralized |
|----------|--------|-------------|
| Consistency | Eventual | Strong (linearizable) |
| Failure detection | Probabilistic (~seconds) | Precise (session timeout) |
| Scale | Thousands of nodes | Tens to hundreds |
| Single point of failure | None | Coordinator (mitigated by quorum) |
| Bandwidth | O(N) per node per round | O(1) per node (watch) |
| Use case | Membership, metadata | Leader election, config, locks |

**When to use gossip**: Large clusters, membership tracking, metadata that tolerates brief inconsistency (Cassandra, DynamoDB, Consul).

**When to use centralized**: Leader election, distributed locks, configuration that must be consistent (Kafka controller, HDFS NameNode, distributed transactions).

**Hybrid approach**: Many systems use both — gossip for membership and a consensus system for critical metadata (e.g., CockroachDB uses gossip for node discovery and Raft for data replication).`
      },
      {
        question: 'What are the three gossip dissemination variants and when do you use each?',
        answer: `**Push gossip**:
\`\`\`
  Node A has new info → picks random peer B → sends info to B
  B already has it? → wasted message
  B does not have it? → B now has it, will push further

  Pros: Simple, fast initial spread
  Cons: Redundant messages as most nodes already have the info
  Best for: Initial rapid dissemination of urgent updates
\`\`\`

**Pull gossip**:
\`\`\`
  Node A picks random peer B → asks "what do you have that I don't?"
  B responds with missing updates → A integrates them

  Pros: Efficient — only transfers data the receiver actually needs
  Cons: Slower initial spread (node must ask to discover)
  Best for: Anti-entropy repair, catching up after downtime
\`\`\`

**Push-pull gossip** (most common in production):
\`\`\`
  Round 1: Node A sends digest to B (push)
  Round 2: B responds with what A is missing + requests what B is missing (pull)
  Round 3: A sends what B requested

  Three-way handshake:
    SYN:  A → B  (compact digests of A's state)
    ACK:  B → A  (data B has that A needs + request for data A has that B needs)
    ACK2: A → B  (data A has that B needs)
\`\`\`

**Cassandra uses push-pull**: Every second, each node picks 1-3 random peers and performs this three-way exchange. This converges in O(log N) rounds and handles both fresh information spread and stale state repair in a single protocol.

**Comparison**:
| Variant | Messages per round | Convergence speed | Bandwidth efficiency |
|---------|-------------------|-------------------|---------------------|
| Push | O(k) per node | Fast initial, slow tail | Low (many redundant) |
| Pull | O(k) per node | Slow initial, fast tail | High (targeted) |
| Push-pull | O(k) per node | Fast throughout | Best (bidirectional) |

**Interview tip**: Always mention push-pull as the practical choice. Pure push or pull are textbook models; real systems use push-pull for balanced convergence.`
      },
      {
        question: 'How does Consul use SWIM gossip for service discovery and health checking?',
        answer: `**Consul's two gossip pools**:

\`\`\`
  Data Center 1 (LAN Pool)        Data Center 2 (LAN Pool)
  ┌──────────────────────┐        ┌──────────────────────┐
  │ Server A ◄──► Server B│       │ Server D ◄──► Server E│
  │    ▲          ▲      │        │    ▲          ▲      │
  │    ▼          ▼      │        │    ▼          ▼      │
  │ Client 1   Client 2 │        │ Client 3   Client 4 │
  └────────┬─────────────┘        └────────┬─────────────┘
           │     WAN Pool (servers only)    │
           └────────────◄──────────────────┘
\`\`\`

**LAN gossip pool** (based on Serf, which implements SWIM):
- All nodes in a datacenter participate (servers + clients)
- Gossip interval: 200ms (fast failure detection)
- Used for: membership, failure detection, event broadcast
- Every node knows every other node in its datacenter

**WAN gossip pool**:
- Only Consul servers participate (not clients)
- Gossip interval: 1 second (lower bandwidth across DCs)
- Used for: cross-datacenter service discovery, federation
- Servers act as gateways between LAN and WAN pools

**SWIM protocol in Consul/Serf**:
\`\`\`
  Period T (every 200ms):
    1. Node A selects random target B
    2. A sends PING to B
    3. If B responds with ACK → B is alive
    4. If no ACK within timeout:
       a. A selects k random nodes (indirect probes)
       b. Each probe node sends PING to B on A's behalf
       c. If any probe gets ACK from B → B is alive
       d. If no probe gets ACK → B is SUSPECT
    5. SUSPECT state gossipped to cluster
    6. If B does not refute within timeout → B is marked DEAD
\`\`\`

**Key advantage over heartbeat-to-all**: Each node does O(1) work per period (probe one random target), regardless of cluster size. A 10,000-node cluster has the same per-node overhead as a 10-node cluster.

**Piggybacking**: Membership state changes are piggybacked on SWIM protocol messages, eliminating the need for separate gossip messages for state propagation. This is a core optimization from the SWIM paper.`
      },
      {
        question: 'How does gossip handle network partitions and node rejoining?',
        answer: `**During a partition**: Each side of the partition continues gossiping internally. The partitioned sides independently converge on their own view, but cannot communicate across the partition boundary.

\`\`\`
Before partition:
  [A, B, C, D, E] — all gossiping, unified view

Partition occurs:
  Partition 1: [A, B, C]     Partition 2: [D, E]
  A gossips with B, C         D gossips with E
  A marks D, E as DOWN        D marks A, B, C as DOWN
  B and C agree (via gossip)  E agrees (via gossip)

  Each partition has a consistent INTERNAL view.
  But the views DISAGREE across the partition.
\`\`\`

**Partition heals — convergence process**:
\`\`\`
  1. Network restored between C and D
  2. C picks D as gossip target (random selection)
  3. C sends digest: {A:UP, B:UP, C:UP, D:DOWN, E:DOWN}
  4. D responds:     {A:DOWN, B:DOWN, C:DOWN, D:UP, E:UP}
  5. Both see higher generation counters from the other side
  6. Merge: both adopt the latest state for each node
  7. Within O(log N) rounds, the entire cluster converges:
     {A:UP, B:UP, C:UP, D:UP, E:UP}
\`\`\`

**Seed nodes and bootstrapping**:
\`\`\`
  New node joins the cluster:
    1. Contacts a seed node (well-known address)
    2. Seed node shares its full state via gossip exchange
    3. New node now knows all other nodes
    4. Within a few gossip rounds, all nodes know the new node

  Seed node failure:
    Not critical — seeds are only used for initial contact
    Once a node has joined, it can gossip with any peer
    Multiple seed nodes provide redundancy for initial join
\`\`\`

**Split-brain risk**: Gossip itself does not prevent split-brain — it is an availability-oriented protocol. If both partitions have write-accepting nodes (as in Cassandra), conflicting writes can occur. The database's consistency model (quorum reads, read repair, vector clocks) must handle this, not the gossip layer.

**Interview insight**: Gossip provides fast convergence after a partition heals, but it does not provide safety guarantees during the partition. This is why systems like CockroachDB pair gossip with Raft — gossip for liveness, Raft for safety.`
      },
      {
        question: 'What is the bandwidth overhead of gossip and how do you optimize it for large clusters?',
        answer: `**Baseline analysis (push-pull gossip)**:

\`\`\`
Cluster: N=1000 nodes, gossip interval=1s, fan-out k=3
State per node: ~100 bytes (heartbeat, tokens, status, load)

Digest message (SYN):
  1000 nodes × 16 bytes/digest = 16KB per message
  Each node sends k=3 SYN messages/round = 48KB/s outbound

Full state messages (ACK/ACK2):
  Typically only stale entries are exchanged
  Average: ~5% of entries stale = 50 × 100 bytes = 5KB
  × k=3 = 15KB/s outbound

Total per node: ~63KB/s ≈ 0.5 Mbps (manageable)
Total cluster: 1000 × 63KB/s = 63MB/s bandwidth
\`\`\`

**Scaling pain points**:
\`\`\`
At N=10,000:
  Digest alone: 10,000 × 16 bytes = 160KB per message
  × k=3 = 480KB/s per node = 3.8 Mbps per node
  Total cluster: 38 Gbps — expensive!
\`\`\`

**Optimization strategies**:

1. **Digest compression**: Only send entries with version > peer's last known version, not the full member list. This reduces digest size dramatically when most nodes are stable.

2. **Cramer protocol** (used by Cassandra): Three-way handshake minimizes full-state transfers. Digests are compact (node_id + version only), full state sent only for stale entries.

3. **Hierarchical gossip**: Large clusters split into sub-groups. Representatives gossip between groups.
\`\`\`
  Cluster of 10,000 nodes:
    10 racks × 1,000 nodes each
    Intra-rack: full gossip (1,000 nodes)
    Inter-rack: rack leaders gossip (10 nodes)
    Two-level convergence: O(log 1000) + O(log 10)
\`\`\`

4. **Piggybacking on application messages**: Attach membership updates to regular request/response traffic, reducing dedicated gossip bandwidth.

5. **Adaptive fan-out**: Increase fan-out during state changes (new node joining, failure detected) and decrease during stability.

**Real-world benchmarks**: Consul's Serf library handles 10,000+ nodes with sub-second convergence and <1% CPU overhead per node. Cassandra clusters of 1,000+ nodes use ~0.5MB/s of gossip bandwidth per node.`
      },
    ],

    dataModel: {
      description: 'Gossip state structure and message flow',
      schema: `Node State (maintained per node):
  node_id:    UUID
  heartbeat:  monotonic counter (incremented each round)
  state:      NORMAL | JOINING | LEAVING | DOWN
  tokens:     [token_range_start, token_range_end]
  dc:         data center name
  rack:       rack identifier
  load:       disk usage in bytes
  schema_ver: schema hash
  version:    lamport timestamp of last state change

Gossip Message (SYN):
  from:       sender node_id
  digests: [
    { node_id, heartbeat, version }   // compact summary
    ...for each known node
  ]

Gossip Message (ACK):
  needed: [node_id, ...]              // nodes sender is behind on
  updates: [                           // nodes receiver is behind on
    { node_id, heartbeat, state, tokens, ... }
  ]`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. Vector Clocks (consistency)
  // ─────────────────────────────────────────────────────────
  {
    id: 'vector-clocks',
    title: 'Vector Clocks',
    icon: 'clock',
    color: '#3b82f6',
    questions: 8,
    description: 'Logical clocks that track causality across distributed nodes, enabling conflict detection and determining the happens-before relationship without synchronized physical clocks.',
    concepts: [
      'Happens-before relationship (Lamport)',
      'Lamport clocks vs vector clocks',
      'Causal ordering',
      'Conflict detection and resolution',
      'Version vectors',
      'Dotted version vectors',
      'Clock pruning and truncation',
    ],
    tips: [
      'Vector clocks answer: "Did event A happen before B, or are they concurrent?"',
      'DynamoDB and Riak use version vectors (a variant) for conflict detection on writes',
      'Know the difference: Lamport clocks give total order but cannot detect concurrency; vector clocks can',
      'Explain clock growth: vector size = number of nodes that have written to the key',
      'In interviews, draw the space-time diagram showing concurrent writes and how vector clocks detect them',
      'Clock pruning is needed in practice — drop the oldest entry when the vector exceeds a size limit',
    ],

    introduction: `**Vector clocks** solve one of the hardest problems in distributed systems: determining the order of events when there is no shared global clock. In a single-process system, events are trivially ordered by wall-clock time. In a distributed system, clocks drift, network delays vary, and two nodes can perform conflicting operations at the "same" time. Leslie Lamport formalized the "happens-before" relationship in 1978, and vector clocks (introduced by Fidge and Mattern in 1988) extended this to detect **concurrency** — something Lamport clocks alone cannot do.

A vector clock is a map from node ID to a counter. Each node increments its own counter on every local event. When a message is sent, the sender's full vector clock is attached. The receiver merges the incoming vector with its own by taking the element-wise maximum. This gives every event a **causal history** — you can compare two vector clocks and determine if one **happened before** the other or if they are **concurrent** (and therefore potentially conflicting).

Systems like **Riak** (which switched from vector clocks to dotted version vectors in Riak 2.0 for better precision) and the original **Amazon Dynamo** paper proposed this pattern for detecting write conflicts. Notably, the actual **DynamoDB** and **Cassandra** implementations have moved away from vector clocks in production: Cassandra uses last-writer-wins with wall-clock timestamps, and modern DynamoDB uses finer-grained conflict handling. **CockroachDB** and **YugabyteDB** use **Hybrid Logical Clocks** (HLCs) instead, which combine physical time with logical counters to achieve both causal ordering and compact O(1) size.

**When to use vector clocks**: Systems that must detect concurrent writes and present conflicts to the application for resolution (shopping carts, collaborative editing, multi-master databases). **When NOT to use**: When you need a total order of events (use Lamport clocks or HLCs), when conflict resolution can be handled by last-writer-wins (simpler but lossy), or when the number of writers per key is very large (vector size grows linearly with writer count).`,

    keyQuestions: [
      {
        question: 'How do vector clocks determine causality between events?',
        answer: `**Rules**:

1. **Local event on node i**: increment VC[i]
2. **Send message**: increment VC[i], attach VC to message
3. **Receive message**: VC = max(local_VC, msg_VC) for each entry, then increment VC[i]

**Comparison**:
- VC(a) < VC(b) if every entry in a <= corresponding entry in b, and at least one is strictly less → a **happened before** b
- If neither a < b nor b < a → a and b are **concurrent**

\`\`\`
Node A       Node B       Node C
[1,0,0]
  │──msg──►
             [1,1,0]
                │──msg──►
                           [1,1,1]
[2,0,0]                      │
  │          [1,2,0]◄──msg───┘
  │            │
  │──msg──►  merge:
             max([2,0,0],[1,2,0]) = [2,2,0]
             increment B: [2,3,0]
\`\`\`

**Detecting conflicts**: Client writes to key K via Node A → VC = [2,0,0]. Another client writes via Node B → VC = [0,2,0]. Neither dominates the other → **concurrent writes detected**. The system stores both versions and lets the next reader resolve the conflict.`
      },
      {
        question: 'What is the difference between Lamport clocks and vector clocks?',
        answer: `**Lamport Clock**: Single integer counter per node.
- Rule: on event, counter++. On receive, counter = max(local, received) + 1.
- Gives **total order** but CANNOT detect concurrency.
- If L(a) < L(b), it does NOT mean a happened before b.

**Vector Clock**: Array of counters, one per node.
- Gives **partial order** and CAN detect concurrency.
- If VC(a) < VC(b), then a definitely happened before b.
- If VC(a) || VC(b) (incomparable), they are concurrent.

\`\`\`
Lamport:
  A: 1    2    3
  B:   1    2
  Events at A:3 and B:2 — Lamport says 3 > 2
  but they may be concurrent!

Vector:
  A: [2,0]  [3,0]
  B: [0,1]  [0,2]
  [3,0] vs [0,2] — neither dominates → CONCURRENT ✓
\`\`\`

| Property | Lamport | Vector |
|----------|---------|--------|
| Size | O(1) integer | O(N) where N = nodes |
| Causality detection | No (only one direction) | Yes (both directions) |
| Concurrency detection | No | Yes |
| Use case | Total ordering (Paxos log) | Conflict detection (Dynamo) |

**In practice**: Lamport/hybrid logical clocks are used where you need a total order (transaction ordering in CockroachDB). Vector clocks are used where you need to detect and resolve conflicts (shopping carts in DynamoDB).`
      },
      {
        question: 'How does DynamoDB use version vectors for conflict resolution?',
        answer: `**DynamoDB's approach** (simplified from the Dynamo paper):

\`\`\`
Write 1: Client sets key="cart" via Node A
  value: {items: ["book"]}
  VC: {A:1}

Write 2: Client reads {A:1}, adds "pen" via Node A
  value: {items: ["book","pen"]}
  VC: {A:2}

Concurrent Write 3: Another client reads stale {A:1},
  adds "hat" via Node B
  value: {items: ["book","hat"]}
  VC: {A:1, B:1}
\`\`\`

**Conflict detection on read**:
\`\`\`
  {A:2} vs {A:1, B:1}
  A: 2 > 1 but B: 0 < 1
  → CONCURRENT — neither dominates
  → Return BOTH versions to client as "siblings"
\`\`\`

**Resolution strategies**:
1. **Application-level merge**: Client merges siblings (e.g., union of cart items → ["book","pen","hat"])
2. **Last-writer-wins (LWW)**: Use wall-clock timestamp — simple but loses data
3. **CRDTs**: Conflict-free data types that merge automatically (counters, sets)

**Practical issue — clock bloat**: If many nodes write to the same key, the vector grows. Solutions:
- **Dotted version vectors**: Track exactly which dot (node, counter) created each sibling — avoids false conflicts from read-then-write patterns
- **Clock pruning**: Remove entries from nodes that haven't written recently (risks false concurrency but bounds vector size)`
      },
      {
        question: 'What are the limitations of vector clocks and what alternatives exist?',
        answer: `**Limitations**:

1. **Size**: Vector grows with number of writers — O(N) per key
   - 100 nodes × 8 bytes each = 800 bytes overhead per version
   - For hot keys written by many nodes, this adds up

2. **Sibling explosion**: Concurrent writes produce siblings; if clients do not resolve them promptly, siblings accumulate

3. **Clock pruning is lossy**: Dropping old entries can cause false concurrency detection

4. **No total order**: Cannot order concurrent events without additional mechanism

**Alternatives**:
\`\`\`
┌────────────────────┬──────────────────────────────┐
│ Mechanism          │ Used by                      │
├────────────────────┼──────────────────────────────┤
│ Vector clocks      │ Riak, Voldemort (original)   │
│ Dotted VV          │ Riak 2.0+                    │
│ Hybrid logical     │ CockroachDB, YugabyteDB      │
│   clocks (HLC)     │                              │
│ Last-writer-wins   │ Cassandra (wall clock + id)  │
│ Raft/Paxos log     │ etcd, Consul (total order)   │
│ Lamport timestamps │ Spanner (TrueTime + Lamport) │
└────────────────────┴──────────────────────────────┘
\`\`\`

**Hybrid Logical Clocks (HLC)**: Combine a physical timestamp with a logical counter. O(1) size, give causal ordering within a bounded clock-skew window, and enable snapshot reads. CockroachDB uses HLCs so that transactions can be globally ordered without vector overhead.

**Interview takeaway**: Vector clocks are the textbook answer for conflict detection, but modern systems often prefer HLCs (total order, small size) or CRDTs (automatic merge, no conflicts).`
      },
      {
        question: 'What are dotted version vectors and how do they improve on vector clocks?',
        answer: `**Problem with standard vector clocks**: When a client reads a value, modifies it, and writes it back through a different coordinator node, the vector clock grows unnecessarily. The read-modify-write pattern creates "false siblings" — versions that appear concurrent but are actually causally related.

**Example of false sibling with vector clocks**:
\`\`\`
  1. Client reads key K: value=v1, VC={A:1}
  2. Client writes v2 via Node B: VC={A:1, B:1}
  3. Another client reads K and gets both v1 and v2 as siblings
     because {A:1} and {A:1, B:1} — A:1 dominates but B entry is new
     Standard VC merging can create false concurrency here
\`\`\`

**Dotted version vectors (DVV)** solve this by tracking exactly which "dot" (node, counter pair) created each version:
\`\`\`
  Standard vector clock per VALUE:
    v1 → {A:1}
    v2 → {A:1, B:1}
    Comparison: ambiguous — is v2 an update of v1?

  Dotted version vector per KEY:
    Key K has context: {A:1, B:1}   (causal history)
    v2 was created by dot (B,1)
    The context proves v2 descends from v1
    → v1 can be safely discarded, no false sibling
\`\`\`

**Riak 2.0 switched from vector clocks to DVV** specifically to eliminate sibling explosion caused by the read-modify-write pattern. The result was dramatically fewer false conflicts in production workloads.

**Key differences**:
| Property | Vector Clock | Dotted Version Vector |
|----------|-------------|----------------------|
| Tracks | Causal history per version | Causal context per key + creation dot per version |
| False siblings | Common with read-modify-write | Eliminated |
| Size | One VC per sibling | One context per key + one dot per sibling |
| Used by | Original Dynamo paper, Voldemort | Riak 2.0+ |

**Interview tip**: If asked about vector clocks in practice, mention that Riak moved to DVV to fix real production problems with sibling explosion. This shows awareness that textbook algorithms often need practical refinements.`
      },
      {
        question: 'How do Hybrid Logical Clocks (HLCs) work and why did CockroachDB choose them over vector clocks?',
        answer: `**HLC combines physical time with logical counter**:
\`\`\`
  HLC = (physical_time, logical_counter)

  Rules:
  1. Local event or send:
     pt = max(local_pt, wall_clock)
     if pt == old_pt: lc++ else: lc = 0
     HLC = (pt, lc)

  2. Receive message with (msg_pt, msg_lc):
     pt = max(local_pt, msg_pt, wall_clock)
     if pt == old_pt == msg_pt: lc = max(local_lc, msg_lc) + 1
     elif pt == old_pt: lc = local_lc + 1
     elif pt == msg_pt: lc = msg_lc + 1
     else: lc = 0
     HLC = (pt, lc)
\`\`\`

**Why CockroachDB chose HLC over vector clocks**:
\`\`\`
  Vector clocks:
    Size: O(N) where N = number of writing nodes
    100 nodes × 8 bytes = 800 bytes per key version
    Provides: causality detection + concurrency detection
    Does NOT provide: total ordering

  HLC:
    Size: O(1) — just (timestamp, counter) = 12 bytes
    Provides: causal ordering + total ordering + real-time approximation
    Does NOT provide: concurrency detection (trade-off!)
\`\`\`

**CockroachDB's use case**:
- Needs **total ordering** for serializable transactions
- Does not need concurrency detection (uses pessimistic locking instead)
- HLC timestamps enable **snapshot reads** at any point in time
- Bounded clock skew (NTP keeps clocks within ~100-250ms) ensures correctness with a "clock skew wait" mechanism

**Comparison for interview**:
| Property | Vector Clock | HLC |
|----------|-------------|-----|
| Size | O(N) per key | O(1) constant |
| Causality | Yes | Yes (within clock skew bound) |
| Concurrency detection | Yes | No |
| Total order | No | Yes |
| Real-time correlation | No | Yes (physical timestamp) |
| Used by | Riak, Voldemort | CockroachDB, YugabyteDB |

**Key insight**: The choice between vector clocks and HLCs depends on your conflict resolution strategy. If you use optimistic concurrency (detect conflicts, resolve via application logic), vector clocks are necessary. If you use pessimistic concurrency (serializable transactions, locks), HLCs provide a compact total order without the overhead.`
      },
      {
        question: 'Why did Cassandra choose last-writer-wins instead of vector clocks?',
        answer: `**Cassandra's design decision**: Rather than tracking causal history per key, Cassandra uses **last-writer-wins (LWW)** with wall-clock timestamps at the **cell level** (individual column values, not entire rows).

**How LWW works in Cassandra**:
\`\`\`
  Write 1: UPDATE users SET name='Alice', email='a@co.com'
           WHERE id=42  (timestamp: 1000)

  Write 2 (concurrent): UPDATE users SET email='alice@new.com'
                         WHERE id=42  (timestamp: 1001)

  Resolution per cell:
    name:  'Alice'        (ts=1000, only version)
    email: 'alice@new.com' (ts=1001 > 1000, wins)

  No conflict at the row level — each cell resolved independently
\`\`\`

**Why this works for Cassandra's use case**:
1. **Cell-level granularity**: Most concurrent writes touch different columns of the same row. Cell-level LWW resolves these without any conflict.
2. **Simpler operations**: No need to return siblings to the client for resolution. Every read returns exactly one value per cell.
3. **No vector bloat**: With thousands of nodes potentially writing to the same key, vector clocks would grow very large and create performance problems.
4. **Acceptable data loss**: For most Cassandra workloads (time-series, logging, user profiles), losing the "older" of two concurrent writes to the same cell is an acceptable trade-off.

**The DataStax argument**: "The fundamental difference between Cassandra and the systems requiring vector clocks is that Cassandra supports cell-level resolution. When two writes are concurrent, the conflict is limited to specific cells, not entire objects. This eliminates most of the scenarios where vector clocks add value."

**When LWW is dangerous**:
\`\`\`
  Counter increment (NOT idempotent):
    Client A: READ count=10, WRITE count=11 (ts=1000)
    Client B: READ count=10, WRITE count=11 (ts=1001)
    LWW result: count=11 (should be 12!)

  Solution: Cassandra has dedicated counter columns that use
  a conflict-free replicated counter (not LWW)
\`\`\`

**Clock skew risk**: LWW depends on clocks being reasonably synchronized. If Node A's clock is 5 seconds ahead, its writes always win even if they are actually older. Production Cassandra deployments must run NTP and monitor clock drift.`
      },
      {
        question: 'How do CRDTs eliminate the need for conflict detection entirely?',
        answer: `**Conflict-free Replicated Data Types (CRDTs)** are data structures mathematically guaranteed to converge when replicas merge, regardless of the order operations are applied. They eliminate the "detect conflict → resolve conflict" cycle entirely.

**Two families of CRDTs**:
\`\`\`
  State-based CRDTs (CvRDTs):
    Each replica maintains full state
    Replicas periodically exchange state
    Merge function: must be commutative, associative, idempotent
    Example: G-Counter, OR-Set, LWW-Register

  Operation-based CRDTs (CmRDTs):
    Replicas exchange operations (not full state)
    Operations must be commutative
    Requires reliable, exactly-once delivery
    Example: add(x), increment()
\`\`\`

**G-Counter (grow-only counter)** — simplest CRDT:
\`\`\`
  3 nodes: A, B, C
  Each maintains a vector: {A:0, B:0, C:0}

  A increments twice:  A={A:2, B:0, C:0}
  B increments once:   B={A:0, B:1, C:0}
  C increments three:  C={A:0, B:0, C:3}

  Merge: element-wise max
  Result: {A:2, B:1, C:3}
  Total count = 2 + 1 + 3 = 6 ✓

  This works regardless of merge order!
\`\`\`

**OR-Set (observed-remove set)** — add/remove elements:
\`\`\`
  Add element with unique tag: add("apple", tag=uuid1)
  Remove element: remove all tags for "apple"

  Concurrent add and remove:
    A: add("apple", tag=t1)
    B: remove("apple")  — removes tags B has seen, NOT t1
    Merge: t1 still exists → "apple" is in the set
    "Add wins" semantics (most recent add is preserved)
\`\`\`

**Real-world CRDT usage**:
- **Redis CRDT** (Redis Enterprise): Active-active geo-distributed Redis with CRDT-based conflict resolution for strings, sets, sorted sets, and counters
- **Figma**: Uses CRDTs for real-time collaborative design canvas
- **Apple Notes**: Uses CRDTs for conflict-free sync across devices
- **Riak**: Supports CRDT data types (counters, sets, maps, flags)

**Comparison with vector clocks**:
| Property | Vector Clocks | CRDTs |
|----------|-------------|-------|
| Conflict detection | Yes (returns siblings) | Not needed (auto-merge) |
| Application logic for resolution | Required | Not required |
| Data model constraints | Any value | Must fit CRDT structure |
| Complexity | Application resolves | Data type resolves |
| Best for | Arbitrary conflict resolution | Well-defined merge semantics |`
      },
    ],

    dataModel: {
      description: 'Vector clock operations and comparison rules',
      schema: `Vector Clock Structure:
  VC = { nodeA: counterA, nodeB: counterB, ... }

Operations:
  increment(VC, node_i):
    VC[node_i] += 1

  merge(VC1, VC2):
    for each node_i:
      result[node_i] = max(VC1[node_i], VC2[node_i])

  compare(VC1, VC2):
    if all VC1[i] <= VC2[i] and at least one <:
      return BEFORE          (VC1 happened before VC2)
    if all VC2[i] <= VC1[i] and at least one <:
      return AFTER           (VC1 happened after VC2)
    return CONCURRENT        (conflict)

Stored per key-value pair:
  key  → [ { value, vector_clock }, ... ]  (siblings if concurrent)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 4. Merkle Trees (data-integrity)
  // ─────────────────────────────────────────────────────────
  {
    id: 'merkle-trees',
    title: 'Merkle Trees',
    icon: 'gitBranch',
    color: '#8b5cf6',
    questions: 8,
    description: 'Hash trees that enable efficient verification of data integrity and fast detection of differences between replicas with O(log N) comparison cost.',
    concepts: [
      'Cryptographic hash chains',
      'Tree construction from leaf hashes',
      'Anti-entropy repair between replicas',
      'Efficient difference detection',
      'Incremental updates',
      'Merkle DAGs (IPFS, Git)',
      'Consistent hashing integration',
    ],
    tips: [
      'Merkle trees reduce data comparison from O(N) to O(log N) — mention this complexity improvement',
      'Cassandra, DynamoDB, and HDFS use Merkle trees for anti-entropy repair',
      'Git uses a Merkle DAG — every commit, tree, and blob is content-addressed by its SHA hash',
      'In interviews, draw the tree and show how changing one leaf changes the root hash',
      'Know the connection to blockchain — Bitcoin transactions are verified via Merkle root in block header',
      'For range-partitioned data, each token range has its own Merkle tree',
    ],

    introduction: `A **Merkle tree** (hash tree) is a binary tree where every leaf node contains the hash of a data block and every internal node contains the hash of its two children. The root hash therefore represents a cryptographic fingerprint of the entire dataset. If even a single byte changes anywhere in the data, the root hash changes. Named after Ralph Merkle who patented the concept in 1979, this structure has become one of the most widely used data structures in distributed computing, version control, and cryptography.

This structure enables **efficient difference detection**: two replicas can compare their root hashes to know instantly whether they agree. If they disagree, they walk down the tree, comparing child hashes at each level, until they find exactly which data blocks differ. This reduces the work of finding inconsistencies from O(N) — comparing every record — to O(log N), examining only the path from root to the differing leaves. For a dataset with 1 billion records, this means comparing roughly 30 hashes instead of 1 billion records.

**Cassandra** and **DynamoDB** use Merkle trees for **anti-entropy repair**: a background process that detects and fixes inconsistencies between replicas. **Git** uses a Merkle DAG (directed acyclic graph) where every object — blob, tree, commit — is identified by the SHA-1 hash of its contents, enabling efficient diff and deduplication. **Bitcoin** stores the Merkle root of all transactions in each block header, allowing lightweight SPV clients to verify individual transactions with just 11 hashes for a block containing 2,000 transactions. **IPFS** (InterPlanetary File System) uses Merkle DAGs for content-addressed storage, where files are automatically deduplicated and verified.

**When to use Merkle trees**: Synchronizing large datasets between replicas, content-addressed storage, tamper detection, and efficient verification of data subsets. **When NOT to use**: Small datasets where full comparison is cheap, frequently-changing data where tree rebuild cost dominates (consider incremental hashing instead), or systems where the O(N) build cost is unacceptable and comparisons are rare.`,

    keyQuestions: [
      {
        question: 'How does a Merkle tree detect differences between replicas efficiently?',
        answer: `**Structure**:
\`\`\`
            Root: H(H12 + H34)
           /                  \\
     H12: H(H1+H2)      H34: H(H3+H4)
      /       \\           /       \\
   H1:H(D1) H2:H(D2) H3:H(D3) H4:H(D4)
     │         │         │         │
    D1        D2        D3        D4
   (data)   (data)    (data)    (data)
\`\`\`

**Comparison protocol between Replica A and Replica B**:
\`\`\`
Step 1: Compare root hashes
  A.root = abc123    B.root = abc999
  Different → descend

Step 2: Compare level-1 children
  A.H12 = def456     B.H12 = def456    ← Match! Skip subtree
  A.H34 = ghi789     B.H34 = ghi000    ← Different → descend

Step 3: Compare level-2 children
  A.H3 = jkl111      B.H3 = jkl111     ← Match! D3 is identical
  A.H4 = mno222      B.H4 = mno333     ← Different → D4 differs!

Result: Only D4 needs synchronization
  Compared: 5 hashes instead of 4 full data blocks
  For N blocks: O(log N) comparisons instead of O(N)
\`\`\`

**In Cassandra's anti-entropy**:
- Each node builds a Merkle tree over its token range
- Nodes exchange root hashes periodically
- On mismatch, they walk the tree to find differing keys
- Only the differing keys are streamed for repair`
      },
      {
        question: 'How does Cassandra use Merkle trees for anti-entropy repair?',
        answer: `**Cassandra's repair process**:

\`\`\`
  Node A (replica 1)          Node B (replica 2)
  ┌──────────────────┐        ┌──────────────────┐
  │ Token range:     │        │ Token range:     │
  │  1-1000          │        │  1-1000          │
  │                  │        │                  │
  │ Build Merkle tree│        │ Build Merkle tree│
  │ over all keys in │        │ over all keys in │
  │ range            │        │ range            │
  └────────┬─────────┘        └────────┬─────────┘
           │     Exchange root hash     │
           │◄──────────────────────────►│
           │     Roots differ!          │
           │     Walk tree level by     │
           │     level                  │
           │◄──────────────────────────►│
           │     Identified: keys       │
           │     501-750 differ         │
           │                            │
           │  Stream differing keys     │
           │───────────────────────────►│
           │◄───────────────────────────│
\`\`\`

**Implementation details**:
1. **Tree depth**: Configurable; deeper trees = more precision but more memory
2. **Partition**: Each token range gets its own Merkle tree
3. **Build time**: Requires a full scan of the data — expensive
4. **Incremental repair** (Cassandra 4.0+): Only repair data written since last repair, using timestamps rather than full Merkle rebuild

**When repair runs**:
- Manually triggered: \`nodetool repair\`
- Should run within gc_grace_seconds (default 10 days) to prevent zombie data from tombstone expiration
- Full repair scans all data; incremental uses sstable metadata`
      },
      {
        question: 'How are Merkle trees used in Git and blockchain?',
        answer: `**Git — Merkle DAG** (directed acyclic graph):
\`\`\`
  commit c3 ─► tree t3
    │              ├── blob b1 (file1.txt) → SHA: a1b2c3
    │              ├── blob b2 (file2.txt) → SHA: d4e5f6
    │              └── tree t3a (subdir/)
    │                    └── blob b3       → SHA: g7h8i9
    │
    ▼ parent
  commit c2 ─► tree t2
                   ├── blob b1 (same SHA → reused!)
                   └── blob b4 (old file2.txt)
\`\`\`

- Every object is **content-addressed**: SHA-1 of its contents
- Identical files across commits share the same blob (deduplication)
- Changing one file creates new blob → new tree → new commit, but unchanged files stay the same
- \`git diff\` between commits: compare tree hashes recursively

**Bitcoin — Merkle root in block header**:
\`\`\`
  Block Header
  ┌──────────────────┐
  │ prev_block_hash  │
  │ merkle_root ─────┼──► Root hash of all transactions
  │ timestamp        │
  │ nonce            │       H(H12 + H34)
  └──────────────────┘      /            \\
                        H(Tx1+Tx2)    H(Tx3+Tx4)
                        /      \\      /      \\
                      Tx1    Tx2   Tx3    Tx4
\`\`\`

**SPV (Simplified Payment Verification)**: A lightweight client can verify a transaction is in a block by requesting just the Merkle path (log N hashes) from a full node, instead of downloading the entire block.`
      },
      {
        question: 'What are the trade-offs of Merkle trees for data synchronization?',
        answer: `**Advantages**:
- O(log N) difference detection vs O(N) full comparison
- Tamper-evident: any change is detectable at the root
- Space-efficient verification: only the path is needed, not the full data
- Reusable: subtrees that match are skipped entirely

**Disadvantages**:
- **Build cost**: Constructing the tree requires hashing all data — O(N)
- **Memory**: Full tree in memory = O(N) hash nodes
- **Stale trees**: If data changes frequently, the tree must be rebuilt or incrementally updated
- **Hash function cost**: Cryptographic hashes (SHA-256) are CPU-intensive for large datasets

**Optimization strategies**:
\`\`\`
1. Incremental update:
   Change D4 → recompute H4, H34, Root  (only O(log N) hashes)

2. Lazy rebuilding:
   Mark subtrees dirty, recompute only on next comparison

3. Bucketed leaves:
   Each leaf covers a range of keys (e.g., 1000 keys)
   Reduces tree size but loses per-key precision

4. Parallel construction:
   Hash leaves in parallel, merge upward
\`\`\`

**Interview insight**: Emphasize that the tree is a read-time optimization for comparison. The build cost is amortized because the tree is rebuilt periodically (not on every write) and comparisons happen much more frequently than full rebuilds.`
      },
      {
        question: 'How does IPFS use Merkle DAGs for content-addressed storage?',
        answer: `**IPFS (InterPlanetary File System)** uses Merkle DAGs (directed acyclic graphs) as its core data structure. Unlike a binary tree, a Merkle DAG allows nodes to have any number of children, making it suitable for representing file systems, directories, and large files.

**Content addressing in IPFS**:
\`\`\`
  Traditional addressing: "get file from server X at path /foo/bar"
  Content addressing:     "get file with hash QmXyz..."

  The hash IS the address. If two files have identical content,
  they have the same hash → automatic deduplication.
\`\`\`

**How a large file is stored**:
\`\`\`
  File (10MB) → split into 256KB chunks
    Chunk 1 → hash: Qm1aaa
    Chunk 2 → hash: Qm2bbb
    Chunk 3 → hash: Qm3ccc
    ...

  Parent node (links to all chunks):
    hash: QmRoot = H(Qm1aaa + Qm2bbb + Qm3ccc + ...)

  Request QmRoot → IPFS fetches all chunks from any peer that has them
  Verify each chunk's hash → tamper-proof transfer
\`\`\`

**Directory structure as Merkle DAG**:
\`\`\`
  project/ (QmDir)
    ├── README.md    → QmReadme
    ├── src/         → QmSrc
    │   ├── main.js  → QmMain
    │   └── util.js  → QmUtil
    └── package.json → QmPkg

  Changing main.js → new QmMain' → new QmSrc' → new QmDir'
  But QmReadme, QmUtil, QmPkg are unchanged → reused!
\`\`\`

**Key properties**:
- **Deduplication**: Identical files/blocks across the entire network share one copy
- **Integrity**: Every block is verified by its hash — no man-in-the-middle tampering
- **Immutability**: A CID (Content Identifier) always refers to the exact same data
- **Efficient sync**: Like Git, only changed blocks need to be transferred

**Comparison with Git**: Git also uses a Merkle DAG (blobs, trees, commits) but is optimized for source code history. IPFS generalizes this to arbitrary files and adds peer-to-peer distribution.`
      },
      {
        question: 'What is the difference between a Merkle tree and a Merkle Patricia Trie, and why does Ethereum use the latter?',
        answer: `**Merkle Tree** (binary, used by Bitcoin):
\`\`\`
  Structure: Fixed binary tree
  Leaves: Transaction hashes
  Lookup: Not supported directly (tree is for verification only)
  Update: Rebuild entire tree on new block
  Use case: Verify a transaction is in a block
\`\`\`

**Merkle Patricia Trie** (used by Ethereum):
\`\`\`
  Structure: Trie (prefix tree) with Merkle hashing at every node
  Leaves: Account state (balance, nonce, code, storage root)
  Lookup: O(key_length) — traverse trie by key bytes
  Update: O(key_length) — only recompute hashes along the path
  Use case: World state database (all accounts and their state)
\`\`\`

**Why Ethereum needs a trie, not a simple Merkle tree**:
\`\`\`
  Bitcoin: Block contains a flat list of transactions.
    → Binary Merkle tree over the list is sufficient.
    → Only need "is transaction X in this block?"

  Ethereum: Block contains the entire WORLD STATE (every account).
    → Need key-value lookups: "what is account 0xABC's balance?"
    → Need efficient updates: "set account 0xABC's balance to 100"
    → Need state proofs: "prove that 0xABC has balance 100"
    → A trie supports all three with Merkle hashing for verification
\`\`\`

**Patricia optimization**:
\`\`\`
  Naive trie: Each hex character is a node → deep tree
    Key: 0xABCD → A → B → C → D → value (4 nodes)

  Patricia trie: Compress shared prefixes
    Key: 0xABCD → ABCD → value (1 node if no branching)

  Ethereum adds three node types:
    Branch node: 16 children (one per hex digit) + value
    Extension node: shared prefix + pointer to next node
    Leaf node: remaining key suffix + value
\`\`\`

**State root**: The root hash of the Merkle Patricia Trie is included in every block header. Light clients can verify any account's state by requesting a Merkle proof — a path from the root to the leaf — without downloading the full state (~100GB+).

**Performance trade-off**: The trie structure requires many random disk reads for lookups (each level is a separate node). Ethereum clients like Geth optimize with LRU caches and flat key-value storage under the hood, using the trie structure only for computing state roots.`
      },
      {
        question: 'How do you choose the right hash function and tree depth for a Merkle tree?',
        answer: `**Hash function selection**:
\`\`\`
  Cryptographic hashes (high security, slower):
    SHA-256: 32 bytes, used by Bitcoin, IPFS, most blockchains
    SHA-3:   32 bytes, newer standard, not yet widely adopted
    BLAKE3:  32 bytes, 3-5x faster than SHA-256, gaining adoption

  Non-cryptographic hashes (fast, lower security):
    MurmurHash3: 16 bytes, used by Cassandra for anti-entropy
    xxHash:      8 bytes, extremely fast, good for internal use
    CRC32:       4 bytes, fast but high collision rate
\`\`\`

**When to use each**:
\`\`\`
  Need tamper detection (blockchain, file transfer)?
    → SHA-256 or BLAKE3 (cryptographic)

  Need internal consistency checking (database replicas)?
    → MurmurHash3 or xxHash (faster, collision unlikely
      within a single system)

  Performance-critical with very large datasets?
    → BLAKE3 (parallelizable, ~1GB/s per core)
    → xxHash (~10GB/s per core for non-cryptographic)
\`\`\`

**Tree depth and branching factor**:
\`\`\`
  Binary tree (branching factor 2):
    Depth = log2(N)
    1M leaves → depth 20
    Proof size: 20 hashes × 32 bytes = 640 bytes
    Used by: Bitcoin, most textbook examples

  Higher branching factor (e.g., 16 for Ethereum):
    Depth = log16(N)
    1M leaves → depth 5
    Proof size: 5 × (15 sibling hashes × 32 bytes) = 2.4KB
    Wider proofs but shallower tree → fewer round trips

  Bucketed leaves (e.g., 1000 keys per leaf):
    1M keys / 1000 per bucket = 1000 leaves
    Depth = log2(1000) ≈ 10
    Trade-off: Less precision (must transfer entire bucket
    if any key differs) but much smaller tree
\`\`\`

**Practical guidelines**:
| Dataset size | Recommended approach | Proof size |
|-------------|---------------------|------------|
| <10K items | Full comparison may be faster than tree build | N/A |
| 10K-1M items | Binary Merkle tree, SHA-256 | ~640 bytes |
| 1M-1B items | Bucketed leaves (reduce tree size) | ~1KB |
| >1B items | Hierarchical trees with lazy rebuilding | Varies |

**Cassandra's choice**: Uses MurmurHash3 (fast, non-cryptographic) with configurable tree depth. The tree covers a token range, not individual keys, reducing build time at the cost of bucket-level precision.`
      },
      {
        question: 'How does incremental Merkle tree updating work and when is it preferable to full rebuilds?',
        answer: `**Full rebuild** — recompute the entire tree from scratch:
\`\`\`
  Cost: O(N) hash computations (hash every leaf + all internal nodes)
  When: After a batch import, periodic anti-entropy (Cassandra nodetool repair)
  Advantage: Correct regardless of how many changes occurred
  Disadvantage: Expensive — a 1B-key Cassandra node takes hours for full repair
\`\`\`

**Incremental update** — recompute only the affected path:
\`\`\`
  Change leaf D4 → recompute:
    1. H4 = hash(new D4)           ← leaf level
    2. H34 = hash(H3 + H4)        ← parent
    3. Root = hash(H12 + H34)     ← root

  Cost: O(log N) hash computations
  For N=1M: only 20 hashes instead of 1M

  ┌──────���──── Root* ──────────┐
  │                             │
  H12 (unchanged)          H34* (recomputed)
  │          │             │           │
  H1    H2 (unchanged)   H3      H4* (recomputed)
  │      │               │        │
  D1    D2              D3      D4* (changed)
\`\`\`

**Dirty-flag optimization** for batched changes:
\`\`\`
  Multiple changes arrive: D2, D4, D7 modified
  Mark subtrees as dirty (do NOT recompute immediately)

  On next comparison request:
    1. Check root → dirty → must recompute
    2. Left subtree → dirty (D2 changed) → recompute H12*
    3. Right subtree → dirty (D4, D7 changed) → recompute H34*, H78*
    4. Only recompute dirty paths, skip clean subtrees

  Cost: O(k × log N) where k = number of changed leaves
\`\`\`

**Cassandra incremental repair (4.0+)**:
\`\`\`
  Old approach: Full repair — rebuild Merkle tree over all data
    Duration: Hours for large nodes (100GB+)

  New approach: Track which SSTables were created since last repair
    Only include new/modified data in the comparison
    Duration: Minutes instead of hours
    Trade-off: Requires tracking repair state per range
\`\`\`

**When to prefer full rebuild**:
- After disaster recovery or node replacement
- When >50% of data has changed since last comparison
- When incremental state tracking has been lost

**When to prefer incremental**:
- Routine anti-entropy in stable clusters
- Real-time comparison systems (e.g., sync protocols)
- Large datasets where full rebuild is prohibitively expensive`
      },
    ],

    dataModel: {
      description: 'Merkle tree node structure and comparison protocol',
      schema: `Merkle Tree Node:
  hash:       SHA-256 of children (or data for leaf)
  left:       pointer to left child
  right:      pointer to right child
  range:      [start_key, end_key] covered by this subtree

Leaf Node:
  hash:       SHA-256(data_block)
  key_range:  keys covered by this leaf
  data_ref:   pointer to actual data

Anti-Entropy Protocol:
  1. Initiator sends: { range, root_hash, depth }
  2. Responder compares root_hash
  3. If match → range is consistent, done
  4. If mismatch → responder sends child hashes
  5. Initiator compares children, recurses into mismatched subtrees
  6. At leaf level: exchange actual key-value pairs for repair`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 5. Split-Brain (consistency)
  // ─────────────────────────────────────────────────────────
  {
    id: 'split-brain',
    title: 'Split-Brain',
    icon: 'alertTriangle',
    color: '#3b82f6',
    questions: 8,
    description: 'A dangerous scenario where a network partition causes multiple nodes to believe they are the leader, potentially causing data divergence, corruption, and conflicting writes.',
    concepts: [
      'Network partitions and asymmetric failures',
      'Dual-leader problem',
      'Fencing tokens and generation numbers',
      'STONITH (Shoot The Other Node In The Head)',
      'Quorum-based leader election',
      'Brain resolution strategies',
      'Partition detection mechanisms',
    ],
    tips: [
      'Split-brain is the most dangerous failure mode in leader-based systems — always address it',
      'The solution always involves preventing the old leader from making writes: fencing tokens, STONITH, or epoch numbers',
      'Quorum-based systems (Raft, Paxos) are inherently split-brain safe — the minority partition cannot elect a leader',
      'In interviews, describe the exact failure sequence: partition → both sides elect leader → conflicting writes → data loss',
      'Know how ZooKeeper, etcd, and Consul handle it: Raft requires majority, so only one partition can have a leader',
      'Discuss manual vs automatic resolution — some systems require human intervention after split-brain',
    ],

    introduction: `**Split-brain** occurs when a network partition divides a cluster into two (or more) subclusters, and each subcluster independently believes it is the active, authoritative partition. In a leader-follower system, this means two nodes simultaneously act as leader, accepting writes that may conflict with each other. When the partition heals, the system discovers divergent data that cannot be automatically reconciled. This is arguably the most feared failure mode in distributed systems because the consequences are often silent and catastrophic.

This is not a theoretical concern — it has caused major production incidents across the industry. **GitHub** experienced a 24-hour outage in 2018 caused by a split-brain in their MySQL cluster after a network partition. **Redis Sentinel** is notoriously vulnerable to split-brain in two-node configurations without proper quorum settings. **Elasticsearch** clusters have suffered split-brain when the minimum_master_nodes setting was misconfigured. Even **Kafka** has had documented issues (KAFKA-7128) where lagging high-water marks during ISR expansion could lead to committed data loss — a form of split-brain at the data level.

Preventing split-brain requires a mechanism to ensure that at most one leader can operate at any time. The three main approaches are **quorum-based election** (Raft/Paxos — only the majority partition can elect a leader), **fencing tokens** (a monotonically increasing number that storage systems use to reject stale leaders), and **STONITH** (physically shutting down the suspected-dead node before promoting a new leader). The most reliable defense is layered: consensus for election, fencing tokens for storage-level enforcement, and STONITH as physical backstop.

**When to worry about split-brain**: Any system with a single leader/primary that accepts writes and has automatic failover. **When split-brain is not a concern**: Leaderless systems like Cassandra (all nodes accept writes, conflicts resolved by LWW or vector clocks), or read-only replicas where no writes can conflict.`,

    keyQuestions: [
      {
        question: 'Walk through a split-brain scenario step by step',
        answer: `**Setup**: Primary-Replica database with automatic failover.

\`\`\`
Normal operation:
  Client ──► Primary (Node A) ──repl──► Replica (Node B)

Step 1: Network partition between A and B
  ┌─────────────┐     PARTITION     ┌─────────────┐
  │  Partition 1 │  ──── X ────    │  Partition 2 │
  │              │                  │              │
  │  Node A      │                  │  Node B      │
  │  (Primary)   │                  │  (Replica)   │
  │  Client X    │                  │  Client Y    │
  └─────────────┘                  └─────────────┘

Step 2: Node B cannot reach A, assumes A is dead
  B promotes itself to Primary

Step 3: SPLIT-BRAIN — two primaries
  Client X writes to A:  UPDATE balance SET amount=100
  Client Y writes to B:  UPDATE balance SET amount=50

Step 4: Partition heals
  A.balance = 100, B.balance = 50
  Which is correct? NEITHER can be trusted.
  Data has DIVERGED.
\`\`\`

**Consequences**:
- Conflicting writes on the same rows
- Auto-increment IDs may collide
- Unique constraints violated across partitions
- Business logic invariants broken (e.g., double-spending)`
      },
      {
        question: 'How do quorum-based systems prevent split-brain?',
        answer: `**Key insight**: A leader requires votes from a **majority** (quorum) of nodes. In a partition, at most one side has a majority.

\`\`\`
5-node cluster: A, B, C, D, E
Quorum = ⌊5/2⌋ + 1 = 3

Partition:  {A, B}  |  {C, D, E}
            2 nodes     3 nodes

Left side: Cannot elect leader (2 < 3)
Right side: CAN elect leader (3 >= 3) ✓

Only ONE partition can have a leader!
\`\`\`

**Raft protocol**:
1. Leader sends heartbeats to all followers
2. If follower receives no heartbeat for election_timeout, it starts an election
3. Candidate requests votes; needs majority to win
4. Old leader in minority partition: cannot commit (needs majority ACK)
   - Its uncommitted writes are rolled back when it rejoins

\`\`\`
  {A, B} partition:          {C, D, E} partition:
  A (old leader):            C wins election (3 votes)
  - Sends heartbeats to B   - Accepts writes
  - Cannot get 3 ACKs       - Commits with 3-node quorum
  - Writes CANNOT commit
  - Steps down after timeout

  Partition heals:
  A discovers C's higher term
  A reverts uncommitted entries
  A becomes follower of C
\`\`\`

**This is why consensus clusters use odd numbers**: 3, 5, 7 nodes. Even numbers (e.g., 4) can result in a 2-2 tie where neither side has a majority.`
      },
      {
        question: 'What is STONITH and when is it used?',
        answer: `**STONITH**: "Shoot The Other Node In The Head" — forcibly power off or isolate the old primary before promoting a new one.

\`\`\`
Normal:
  Client ──► Primary A ──repl──► Standby B

Failure detected (A unreachable):
  Step 1: STONITH — send power-off command to A
    ┌─────────┐
    │ Node A  │ ◄── IPMI/BMC power off, VM kill,
    │ (old P) │     SAN fence (revoke disk access)
    └─────────┘
    CONFIRMED: A cannot write to storage

  Step 2: Promote B to Primary
    ┌─────────┐
    │ Node B  │ ◄── Now the only writer
    │ (new P) │
    └─────────┘
\`\`\`

**STONITH mechanisms**:
1. **IPMI/BMC**: Send hardware power-off command over management network
2. **VM fencing**: Hypervisor kills the VM (VMware, KVM)
3. **SAN fencing**: Revoke the old primary's access to shared storage
4. **Network fencing**: Block the old primary's network at the switch level

**Why STONITH is necessary**:
- The old primary might NOT actually be dead — it could be slow, network-isolated, or experiencing a GC pause
- Without STONITH, it could wake up and resume writing
- STONITH guarantees that even if the "dead" node is alive, it CANNOT interfere

**Used by**: Pacemaker/Corosync (Linux HA), Oracle RAC, PostgreSQL Patroni (optional), cloud load balancers.

**Limitation**: STONITH requires out-of-band access (management network, hypervisor API). If the fencing mechanism itself fails, the operator must intervene manually.`
      },
      {
        question: 'How do you handle split-brain resolution after it has occurred?',
        answer: `**The hard truth**: Once split-brain has occurred and both sides accepted writes, there is no fully automatic, lossless resolution. Some data will be lost or require manual intervention.

**Resolution strategies**:

\`\`\`
Strategy 1: Last-Writer-Wins (LWW)
  - Use wall-clock timestamps to pick the "latest" write
  - Simple but LOSSY — earlier writes are silently discarded
  - Used by: Cassandra (default), some Redis setups
  - Risk: Clock skew can pick the "wrong" winner

Strategy 2: Manual merge
  - Halt the system, export both sides' data
  - Human reviews conflicts and chooses correct values
  - Safest but slow and expensive
  - Used for: Financial systems, critical databases

Strategy 3: Automatic conflict resolution
  - Application-specific merge logic
  - CRDTs: Data types that can always merge (counters, sets)
  - Version vectors: Detect conflicts, present siblings to app
  - Used by: Riak, CouchDB

Strategy 4: Discard minority partition's writes
  - The partition with fewer nodes loses its writes
  - Acceptable if minority had very few writes
  - Used by: Raft (uncommitted entries in old leader)
\`\`\`

**Prevention is better than cure**:
\`\`\`
  ┌──────────────────────────────────────────┐
  │ Prevention Mechanism    │ Approach       │
  ├──────────────────────────────────────────┤
  │ Quorum election (Raft)  │ Majority wins  │
  │ Fencing tokens          │ Storage rejects│
  │ STONITH                 │ Kill old leader│
  │ Lease-based leadership  │ Timed validity │
  │ Witness/tiebreaker node │ Odd count      │
  └──────────────────────────────────────────┘
\`\`\`

**Interview takeaway**: Always discuss split-brain prevention, not just resolution. Say: "I would use a consensus protocol with odd-numbered quorum so split-brain cannot happen, rather than trying to resolve it after the fact."`
      },
      {
        question: 'How do lease-based systems prevent split-brain, and what are the clock synchronization risks?',
        answer: `**Lease-based leadership**: A leader holds a time-limited lease. It can only act as leader while the lease is valid. Before the lease expires, it must renew; if it fails to renew, it must stop all operations.

\`\`\`
  t=0:  Leader A acquires lease (valid until t=10)
  t=5:  A renews lease (valid until t=15)
  t=12: Network partition — A cannot reach the lease server
  t=15: Lease expires — A MUST stop accepting writes
  t=16: B acquires new lease, becomes leader

  Key safety property:
    A stops at t=15, B starts at t=16
    There is never a moment when both are active
    (assuming clocks are reasonably synchronized)
\`\`\`

**Clock synchronization risks**:
\`\`\`
  Scenario: A's clock is 2 seconds behind real time
    A thinks: "It's t=13, lease valid until t=15, I'm fine"
    Reality:  "It's t=15, lease has expired"
    B acquires lease at t=15 (real time)
    Now A (thinks t=13) and B (knows t=15) are both active!

  The clock skew creates an overlap window
  of size = max_clock_skew between old and new leader
\`\`\`

**Mitigation strategies**:
1. **Conservative lease duration**: Set lease_duration >> max_clock_skew. If NTP keeps clocks within 250ms, use lease durations of 10-30 seconds.
2. **Leader stops early**: The leader stops accepting writes safety_margin seconds before lease expiry. E.g., lease=10s, stop writing at t=8s.
3. **Google Spanner's TrueTime**: Uses GPS and atomic clocks to bound clock uncertainty to ~7ms. Spanner adds a deliberate wait (the "commit-wait") of 2 * uncertainty before committing, ensuring no overlap.
4. **Fencing tokens as defense-in-depth**: Even with clock-based leases, use fencing tokens at the storage layer. If the lease mechanism fails due to clock skew, the storage layer catches the stale write.

**Comparison**:
| System | Lease mechanism | Clock dependency |
|--------|----------------|-----------------|
| Chubby/Bigtable | Lock service with master leases | High (requires bounded skew) |
| ZooKeeper | Session with ephemeral znodes | Moderate (session timeout) |
| Spanner | TrueTime leases | Low (GPS+atomic clock, ~7ms) |
| Raft | Term-based (no lease needed) | None (pure logical) |

**Interview tip**: If asked about lease-based approaches, always mention the clock skew risk and say you would add fencing tokens as a safety net, since clock-based guarantees are only as strong as the clock synchronization infrastructure.`
      },
      {
        question: 'How does Elasticsearch handle the split-brain problem, and what went wrong historically?',
        answer: `**The infamous Elasticsearch split-brain**: Before version 7.0, Elasticsearch required manual configuration of \`discovery.zen.minimum_master_nodes\` to prevent split-brain. The default was 1, meaning a single node could elect itself master — leading to frequent split-brain in production.

**The classic Elasticsearch split-brain scenario**:
\`\`\`
  3-node cluster: A (master), B, C
  minimum_master_nodes = 1 (unsafe default!)

  Network partition: {A} | {B, C}

  Partition 1 ({A}):
    A is still master (it's alone but minimum_master_nodes=1)
    A accepts index operations

  Partition 2 ({B, C}):
    B and C cannot reach A
    B elects itself master (minimum_master_nodes=1 met)
    B accepts index operations

  TWO masters, both accepting writes → SPLIT BRAIN

  Partition heals:
    Conflicting index state, duplicate documents,
    potentially corrupted shard data
\`\`\`

**The fix (minimum_master_nodes = N/2 + 1)**:
\`\`\`
  3-node cluster: minimum_master_nodes = 2

  Partition: {A} | {B, C}

  {A}: Only 1 node, cannot reach quorum of 2 → steps down
  {B, C}: 2 nodes, reaches quorum → B elected master

  Only ONE master — split-brain prevented!
\`\`\`

**Elasticsearch 7.0+ auto-configuration**:
- Removed the manual \`minimum_master_nodes\` setting entirely
- Introduced automatic quorum calculation based on cluster size
- Uses a voting configuration that requires majority by default
- Significantly reduced split-brain incidents in the wild

**Lessons learned**:
1. **Unsafe defaults kill**: Any default that allows split-brain will cause split-brain in production
2. **Manual configuration is error-prone**: Operators forget to update minimum_master_nodes when scaling
3. **Automation is essential**: Elasticsearch 7.0's auto-quorum was a major reliability improvement
4. **Defense in depth**: Even with auto-quorum, monitor for multiple master-eligible nodes claiming leadership simultaneously`
      },
      {
        question: 'How do two-node clusters handle split-brain, and why are they problematic?',
        answer: `**The fundamental problem with two-node clusters**: With only two nodes, there is no majority. In a partition, each side has exactly one node (50%), and neither has a majority (>50%). No quorum-based system can determine a winner.

\`\`\`
  2-node cluster: A and B
  Quorum = 2/2 + 1 = 2 (need both!)

  Partition: {A} | {B}
  Neither side has quorum → BOTH go read-only
  → System is completely unavailable during partition
  → Defeats the purpose of having two nodes
\`\`\`

**Strategies for two-node configurations**:

1. **Witness/tiebreaker node** (recommended):
\`\`\`
  Add a lightweight third node (just votes, no data)
  A, B (data nodes) + W (witness)
  Quorum = 2 of 3

  Partition: {A, W} | {B}
    A+W have quorum → A stays primary
    B has 1 of 3 → becomes read-only

  Witness can be:
    - Cloud VM (AWS/GCP lightweight instance)
    - ZooKeeper/Consul node
    - Pacemaker quorum device
\`\`\`

2. **Disk-based quorum** (Pacemaker):
\`\`\`
  Shared storage (SAN, NFS, cloud disk) holds a "quorum disk"
  Both nodes write heartbeats to the quorum disk
  During partition: node that can still write to disk keeps running
  Node that cannot → fences itself (suicide)
\`\`\`

3. **Priority-based failover** (risky):
\`\`\`
  Designate A as preferred primary
  During partition: A always wins, B always yields
  Problem: If A actually crashes (not just partitioned),
  B must still become primary → cannot distinguish
  partition from crash without a third observer
\`\`\`

4. **Accept unavailability on partition**:
\`\`\`
  Both nodes go read-only during partition
  Manual intervention required to restore writes
  Safest but lowest availability
  Acceptable for some internal services
\`\`\`

**The industry consensus**: Three nodes is the minimum for production clusters that need automatic failover. Pacemaker 3.0 (2025) and modern Kubernetes distributions standardize on three-node configurations. Two-node clusters should use a witness or accept manual failover.

**Interview answer**: "I would always recommend a minimum of three nodes for any system requiring automatic leader election. Two-node clusters cannot achieve quorum-based split-brain prevention without a witness, and a witness is effectively a third node."
`
      },
      {
        question: 'What is the relationship between split-brain and the CAP theorem?',
        answer: `**CAP theorem refresher**: During a network partition (P), a distributed system must choose between **Consistency** (C) and **Availability** (A). You cannot have both simultaneously when the network is partitioned.

\`\`\`
  No partition (normal operation):
    All systems can provide both C and A
    CAP is not relevant — it only applies during partitions

  During partition:
    ┌────────────────────────────────────────────┐
    │ Choose Consistency (CP):                   │
    │   Minority partition stops accepting writes│
    │   No split-brain, no data divergence       │
    │   But minority clients get errors          │
    │   Examples: etcd, ZooKeeper, HBase         │
    ├────────────────────────────────────────────┤
    │ Choose Availability (AP):                  │
    │   Both partitions accept writes            │
    │   Split-brain IS the trade-off you accept  │
    │   Data diverges, resolved eventually       │
    │   Examples: Cassandra, DynamoDB, CouchDB   │
    └────────────────────────────────────────────┘
\`\`\`

**Split-brain IS the CP/AP trade-off in action**:
\`\`\`
  CP system (Raft/Paxos):
    Minority partition: "I cannot elect a leader, I refuse writes"
    → No split-brain, but reduced availability

  AP system (Dynamo-style):
    Both partitions: "I accept writes, I'll resolve later"
    → Split-brain by design, but always available
    → Conflicts resolved via LWW, vector clocks, or CRDTs
\`\`\`

**The spectrum in practice**:
| System | Choice | Split-brain behavior |
|--------|--------|---------------------|
| etcd/Raft | CP | Minority partition read-only, no split-brain |
| ZooKeeper | CP | Minority partition loses sessions, no split-brain |
| Cassandra | AP | All nodes accept writes, LWW resolves conflicts |
| DynamoDB | AP | Sloppy quorum + hinted handoff, eventual consistency |
| CockroachDB | CP | Minority ranges become unavailable |
| MongoDB | CP (default) | Minority cannot elect primary |

**Key interview insight**: Split-brain is not always a "bug" — for AP systems, it is a deliberate design choice. The question is not "how to prevent split-brain" but "what trade-off does your system make during a partition?" CP systems prevent split-brain at the cost of availability. AP systems embrace split-brain at the cost of consistency.

**Nuance**: Most real systems are not purely CP or AP — they offer tunable consistency. Cassandra with CL=QUORUM behaves like a CP system for that operation (refuses writes without quorum), while CL=ONE behaves like AP (always writes, even during partitions).`
      },
    ],

    dataModel: {
      description: 'Split-brain detection and fencing data flow',
      schema: `Leader State:
  node_id:        unique identifier
  term/epoch:     monotonically increasing generation number
  lease_expiry:   timestamp when leadership expires
  fencing_token:  monotonic counter issued with each leadership grant

Fencing Token Flow:
  1. Node A becomes leader with token=42
  2. Node A sends writes to storage with token=42
  3. Partition occurs; Node B elected with token=43
  4. Node A's pending write arrives at storage with token=42
  5. Storage rejects: 42 < current_max(43) → STALE LEADER

Split-Brain Detection:
  - Monitor: epoch/term number mismatches across nodes
  - Alert: multiple nodes claiming leadership
  - Resolution: node with lower epoch must step down
  - Prevention: require quorum (N/2+1) for all leader operations`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 6. Hinted Handoff (availability)
  // ─────────────────────────────────────────────────────────
  {
    id: 'hinted-handoff',
    title: 'Hinted Handoff',
    icon: 'refreshCw',
    color: '#10b981',
    questions: 8,
    description: 'A technique for handling temporary node failures in distributed databases by storing intended writes as "hints" on available nodes and replaying them when the failed node recovers.',
    concepts: [
      'Sloppy quorum vs strict quorum',
      'Hint storage and expiration',
      'Temporary ownership transfer',
      'Repair on recovery',
      'Consistency implications',
      'Hint replay and ordering',
    ],
    tips: [
      'Hinted handoff trades consistency for availability — writes succeed even when target replicas are down',
      'It is NOT a replacement for anti-entropy repair — hints can expire or the hinting node can fail too',
      'Cassandra, DynamoDB, and Riak all use hinted handoff for temporary failures',
      'In interviews, clarify that hinted handoff helps with transient failures (minutes), not permanent ones',
      'Connect it to the Dynamo paper: sloppy quorum + hinted handoff is how DynamoDB achieves "always writable"',
    ],

    introduction: `**Hinted handoff** is an availability optimization used in distributed databases that follow the Dynamo model. When a write is destined for a node that is temporarily unreachable, another node in the cluster accepts the write on its behalf and stores a "hint" — a record of the intended destination. When the failed node recovers, the hinting node replays the stored writes to it, bringing it up to date. This pattern was introduced in the landmark 2007 **Amazon Dynamo paper** as a mechanism to achieve "always writable" behavior.

This pattern works in tandem with **sloppy quorums**. In a strict quorum, a write to a key must reach its designated replica nodes. In a sloppy quorum, any node in the cluster can temporarily stand in for an unreachable replica, allowing the write to succeed. The hint ensures the data eventually reaches the correct node. The important distinction is that **DynamoDB** counts hint nodes toward the write quorum (true sloppy quorum), while **Cassandra** does not — Cassandra stores hints for convenience but still requires actual replicas to meet the consistency level.

**Amazon DynamoDB**, **Apache Cassandra**, and **Riak** all implement hinted handoff, though with different semantics. The key insight is that most node failures are short-lived — a restart, a brief network blip, a GC pause — and hinted handoff bridges that gap without the overhead of a full data rebalance or anti-entropy repair. Cassandra stores hints in a dedicated \`hints\` directory, flushing them to disk every few seconds, with a default TTL of 3 hours.

**When to use hinted handoff**: Dynamo-style databases where write availability is prioritized over immediate consistency, and where transient failures (seconds to hours) are the common failure mode. **When NOT to use**: Systems requiring strong consistency (hints weaken read guarantees), permanent node failures (hints expire and are lost — use full streaming repair instead), or latency-critical reads where stale data from missed hint replay is unacceptable.`,

    keyQuestions: [
      {
        question: 'How does hinted handoff work in a Dynamo-style system?',
        answer: `**Setup**: Key K has replica nodes [A, B, C] with replication factor 3, write quorum W=2.

\`\`\`
Normal write (all nodes up):
  Client ──► Coordinator
               ├──► Node A (replica) ✓ ACK
               ├──► Node B (replica) ✓ ACK  ← W=2 met
               └──► Node C (replica) ✓ ACK

Write when Node C is down:
  Client ──► Coordinator
               ├──► Node A (replica)  ✓ ACK
               ├──► Node B (replica)  ✓ ACK  ← W=2 met
               └──► Node C (replica)  ✗ UNREACHABLE
               │
               └──► Node D (not a replica for K)
                    Stores: {hint: key=K, dest=C, value=..., timestamp=...}
\`\`\`

**Sloppy quorum**: Node D temporarily counts toward the quorum for this write, even though it is not a designated replica for K. The write succeeds because 2 ACKs are received.

**Recovery (Node C comes back)**:
\`\`\`
  Node D detects C is alive (via gossip)
        │
        ▼
  Node D replays hint to C:
    "Here is a write for key K that was meant for you"
        │
        ▼
  Node C applies the write
  Node D deletes the hint
\`\`\`

**Important**: D holds this data temporarily. D is NOT a permanent replica for K.`
      },
      {
        question: 'What is the difference between sloppy quorum and strict quorum?',
        answer: `**Strict quorum**: Write must reach W of the N designated replicas.
\`\`\`
Key K replicas: [A, B, C]  (N=3, W=2)

Strict: Must get ACK from 2 of {A, B, C}
  If C is down and only A responds → WRITE FAILS
  Availability sacrificed for consistency

Sloppy: Must get ACK from any 2 nodes
  If C is down → D substitutes with a hint
  A ✓ + D(hint) ✓ → WRITE SUCCEEDS
  Availability preserved, eventual consistency
\`\`\`

**Consistency implications**:
\`\`\`
With strict quorum (W + R > N):
  W=2, R=2, N=3 → guaranteed overlap
  Read always sees latest write

With sloppy quorum:
  Write went to [A, D(hint)]
  Read quorum contacts [A, B, C]
  If C is still down and hint not yet replayed:
    Read from [A, B] → A has latest, B does not
    Quorum read returns latest from A ✓

  BUT if read contacts [B, C(stale)] before
  hint replay → may miss the write!
\`\`\`

| Property | Strict Quorum | Sloppy Quorum + Hints |
|----------|--------------|----------------------|
| Write availability | Lower (need W replicas) | Higher (any W nodes) |
| Read consistency | Strong (W+R>N) | Eventual |
| Failure tolerance | Up to N-W replica failures | Up to N-1 (with enough other nodes) |
| Used by | Cassandra (default) | DynamoDB, Riak |

**Key interview point**: Sloppy quorum + hinted handoff is how DynamoDB achieves "always writable." The trade-off is that reads during the hint-replay window may return stale data.`
      },
      {
        question: 'What are the failure modes and limitations of hinted handoff?',
        answer: `**Failure mode 1 — Hinting node crashes**:
\`\`\`
  D stores hint for C, then D crashes
  Hint is LOST → C never gets the write
  → Anti-entropy (Merkle tree) repair needed
\`\`\`

**Failure mode 2 — Hints expire**:
\`\`\`
  D stores hint for C
  C is down for days (past hint TTL)
  Hint expires and is deleted from D
  C comes back but is missing data
  → Full repair (nodetool repair) needed
\`\`\`

**Failure mode 3 — Hint replay overload**:
\`\`\`
  C was down for hours
  D accumulated millions of hints
  When C recovers, D floods C with replays
  C is overwhelmed → cascading failure
  → Rate-limit hint replay (Cassandra throttles this)
\`\`\`

**Failure mode 4 — Permanent failure**:
\`\`\`
  Node C's disk dies, C is replaced by new node E
  E is not the same node — hints addressed to C are useless
  → Full streaming repair from other replicas to E
\`\`\`

**Best practices**:
- Set hint TTL reasonably (Cassandra default: 3 hours)
- Monitor hint backlog size per node
- Run anti-entropy repair periodically (regardless of hints)
- Rate-limit hint replay to avoid overwhelming recovered nodes
- Treat hinted handoff as a first-line defense, not the only repair mechanism`
      },
      {
        question: 'How does hinted handoff interact with consistency levels?',
        answer: `**Cassandra consistency interaction**:

\`\`\`
CL=ONE:
  Write to any 1 node → succeeds even if all replicas are down
  Hint stored on coordinator → VERY available, VERY eventual

CL=QUORUM (W=2, N=3):
  Need 2 of 3 replicas to ACK
  If 1 replica down: 2 remaining ACK → write succeeds
  Hint stored for the downed node
  If 2 replicas down: only 1 ACK → WRITE FAILS
  (hinted handoff does not help meet quorum)

CL=ALL (W=3, N=3):
  Need all 3 replicas to ACK
  Any node down → WRITE FAILS immediately
  Hinted handoff irrelevant at this level

CL=ANY (Cassandra-specific):
  Write succeeds if ANY node (including coordinator) stores it
  Even if ALL replicas are down, coordinator stores hint
  Lowest consistency, highest availability
\`\`\`

**Key distinction**: Hinted handoff does NOT change the consistency level guarantee. If you use QUORUM and need 2 ACKs, you still need 2 actual ACKs. Hints supplement — they ensure the data eventually reaches the downed replica, but they do not substitute for the quorum count.

**DynamoDB**: Uses sloppy quorum where hint nodes DO count toward W, making the system "always writable" but with weaker consistency guarantees during failures.`
      },
      {
        question: 'How do DynamoDB, Cassandra, and Riak differ in their hinted handoff implementations?',
        answer: `**DynamoDB (original Dynamo paper)**:
\`\`\`
  Sloppy quorum: Hint nodes COUNT toward W
  Write to key K (replicas A,B,C), C is down:
    A ✓ + B ✓ + D(hint for C) ✓ → W=3 met
    D is a full participant in the quorum

  Implication:
    Write succeeds even with 2 of 3 replicas down
    Any node in the preference list can substitute
    "Always writable" at the cost of consistency
\`\`\`

**Cassandra**:
\`\`\`
  Strict quorum: Hints do NOT count toward CL
  Write to key K (replicas A,B,C), C is down, CL=QUORUM:
    A ✓ + B ✓ → CL=QUORUM met (2 of 3)
    Coordinator stores hint for C (separate from quorum)

  If A and C are both down:
    Only B ✓ → CL=QUORUM NOT met → WRITE FAILS
    Hint does NOT rescue the write

  Hint storage: Dedicated hints/ directory on coordinator
  Hint TTL: max_hint_window_in_ms (default 3 hours)
  Replay: Triggered when gossip detects target node is UP
  Throttling: hinted_handoff_throttle_in_kb (default 1MB/s)
\`\`\`

**Riak**:
\`\`\`
  Sloppy quorum: Similar to Dynamo
  Uses preference list — ordered set of nodes for each key
  Fallback nodes accept writes with hints attached
  Hint replay uses "handoff" process with dedicated handoff manager
  Supports both ownership handoff (node join/leave) and
  hinted handoff (temporary failure)
\`\`\`

**Key differences**:
| Property | DynamoDB | Cassandra | Riak |
|----------|---------|-----------|------|
| Hints count toward quorum | Yes | No | Yes |
| Write availability during failures | Highest | Moderate | High |
| Read consistency during failure | Weakest | Stronger | Weak |
| Hint TTL | Configurable | 3 hours default | Configurable |
| Hint replay trigger | Gossip-based | Gossip-based | Handoff manager |`
      },
      {
        question: 'How do you monitor and operationally manage hinted handoff in production?',
        answer: `**Key metrics to monitor in Cassandra**:

\`\`\`
  1. Hints stored per node (JMX: StorageProxy.HintsInProgress)
     Alert if: > 10,000 pending hints
     Cause: Target node is down and accumulating hints

  2. Hint replay rate (StorageProxy.HintsCompleted)
     Expected: Hints clearing after target node recovers
     Alert if: Hints not decreasing after recovery

  3. Hint storage size on disk
     Location: data_directory/hints/
     Alert if: > 1GB (indicates prolonged outage)

  4. Hint delivery failures
     Cause: Target node recovered but is overloaded
     Action: Increase throttle or pause hint replay

  5. Hint window breach
     max_hint_window_in_ms = 3 hours (default)
     If node is down > 3 hours, new hints are DROPPED
     Alert when hint window is breached → schedule full repair
\`\`\`

**Operational playbook**:
\`\`\`
  Scenario: Node C was down for 30 minutes
    Action: Hinted handoff handles this automatically
    Verify: Check hints are replaying after C recovers
    No manual intervention needed

  Scenario: Node C was down for 4 hours (> hint window)
    Action: Some hints expired → data gaps exist
    Fix: Run nodetool repair on C's token ranges
    Duration: Minutes to hours depending on data size

  Scenario: Node C permanently failed, replaced by new Node E
    Action: Hints addressed to C are useless for E
    Fix: Full streaming repair to bootstrap E from other replicas
    Duration: Hours for large datasets
    Note: nodetool decommission (old) + nodetool bootstrap (new)

  Scenario: Hint replay is overwhelming recovered node
    Action: Reduce hinted_handoff_throttle_in_kb
    Default: 1024 KB/s → reduce to 256 KB/s
    Monitor: CPU and disk I/O on recovered node during replay
\`\`\`

**Best practices**:
- Set max_hint_window to match your expected maximum transient failure duration (default 3 hours is good for most deployments)
- Always run periodic anti-entropy repair regardless of hinted handoff — hints are a first line of defense, not a complete solution
- Monitor hint storage size as a leading indicator of cluster health problems
- Test hint replay performance during load testing to ensure recovered nodes can handle the replay traffic alongside regular load`
      },
      {
        question: 'How does hinted handoff compare with other consistency repair mechanisms?',
        answer: `**Three-tier consistency repair system**:

\`\`\`
  Speed vs Coverage trade-off:

  Hinted Handoff ──► Read Repair ──► Anti-Entropy Repair
  (fastest)          (moderate)       (slowest)
  (narrowest)        (moderate)       (broadest)
\`\`\`

**Detailed comparison**:
| Property | Hinted Handoff | Read Repair | Anti-Entropy (Merkle) |
|----------|---------------|-------------|----------------------|
| Trigger | Write to downed replica | Read detects stale data | Periodic background scan |
| Scope | Single write | Single key read | Entire token range |
| Speed | Immediate on recovery | On next read | Hours for full scan |
| Coverage | Only writes during downtime | Only read keys | All keys |
| Failure risk | Hint node crash loses hint | Cold data never repaired | Expensive I/O |
| Consistency window | Hint TTL (hours) | Until next read | Until next repair cycle |

**What each catches that the others miss**:
\`\`\`
  Hinted Handoff misses:
    ✗ Hint node crashed (hint lost)
    ✗ Node down > hint TTL (hints expired)
    ✗ Permanent node replacement

  Read Repair catches:
    ✓ Stale data from expired hints
    ✓ Data that diverged due to any cause
    ✗ But only for keys that are READ

  Anti-Entropy catches:
    ✓ Everything — compares ALL data between replicas
    ✗ But is slow and resource-intensive
\`\`\`

**Operational rule**: You need all three layers. Disabling any one creates consistency gaps:
- Without hinted handoff: Every transient failure requires full repair to fix
- Without read repair: Frequently-read stale data goes undetected until next anti-entropy
- Without anti-entropy: Cold data accumulates permanent inconsistencies

**Comparison with consensus-based systems**: In Raft/Paxos systems (etcd, CockroachDB), there is no need for these repair mechanisms because every committed write is replicated to a majority by definition. The repair tiers are specifically needed in eventually consistent systems that trade consistency for availability.`
      },
      {
        question: 'What happens to hinted handoff during rolling upgrades and topology changes?',
        answer: `**Rolling upgrade scenario**:
\`\`\`
  Cluster: A, B, C, D, E (Cassandra)
  Upgrading one node at a time

  Step 1: Stop Node A for upgrade
    Writes meant for A → hints stored on other nodes
    Duration: 5-10 minutes per node typically

  Step 2: A comes back (upgraded)
    Hints for A are replayed from all hinting nodes
    A catches up within seconds to minutes

  Step 3: Stop Node B for upgrade
    Hints stored for B on remaining nodes

  Risk: If upgrade takes longer than hint TTL, hints expire
  Mitigation: Keep upgrade time per node well under hint window
\`\`\`

**Topology changes (adding/removing nodes)**:

\`\`\`
  Adding Node F to the cluster:
    F joins with token assignment
    Data streaming from existing replicas to F
    During streaming: hints are NOT used for data transfer
    Hinted handoff only handles writes that arrive for F
    while F is bootstrapping and not yet accepting reads

  Removing Node C (decommission):
    C streams its data to remaining replicas
    Hints stored for C become orphaned
    After decommission: hints for C are discarded
    (C no longer exists in the token ring)
\`\`\`

**Race condition during topology change**:
\`\`\`
  1. Node C is being decommissioned
  2. Client writes key K (replica set includes C)
  3. Write arrives at coordinator after C left but before
     coordinator's gossip view updated
  4. Coordinator stores hint for C (ghost node)
  5. Hint can never be delivered → expires after TTL

  Fix: Anti-entropy repair after topology changes
  ensures no data is lost in these edge cases
\`\`\`

**Best practice for topology changes**:
- After adding a node: run \`nodetool cleanup\` on existing nodes (remove data they no longer own)
- After removing a node: run \`nodetool repair\` on affected token ranges
- During rolling upgrades: monitor hint accumulation and keep per-node downtime under hint TTL
- Never change topology and perform rolling upgrades simultaneously`
      },
    ],

    dataModel: {
      description: 'Hinted handoff storage structure and replay protocol',
      schema: `Hint Record:
  hint_id:        unique identifier
  target_node:    node the write was intended for
  key:            the data key
  value:          the write payload
  timestamp:      when the write occurred
  ttl:            expiration time for the hint
  replayed:       boolean (has it been delivered?)

Hint Storage (on hinting node):
  hints_directory/
    target_node_C/
      hint_001.dat  → {key, value, timestamp}
      hint_002.dat  → {key, value, timestamp}
      ...

Replay Protocol:
  1. Gossip detects target node is UP
  2. Open streaming connection to target
  3. Send hints in timestamp order
  4. Target ACKs each hint after applying
  5. Hinting node deletes ACKed hints
  6. Rate-limit: max N hints/second to avoid overload`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 7. Read Repair (consistency)
  // ─────────────────────────────────────────────────────────
  {
    id: 'read-repair',
    title: 'Read Repair',
    icon: 'checkCircle',
    color: '#3b82f6',
    questions: 8,
    description: 'An opportunistic consistency mechanism that detects and fixes stale data during read operations by comparing responses from multiple replicas and updating outdated ones.',
    concepts: [
      'Foreground read repair (synchronous)',
      'Background read repair (asynchronous)',
      'Digest queries for comparison',
      'Coordinator-based repair',
      'Consistency level interaction',
      'Repair probability tuning',
    ],
    tips: [
      'Read repair is "lazy" anti-entropy — it only fixes data that is actually read',
      'Cassandra uses digest queries: request a hash from extra replicas, full data only if digests mismatch',
      'Read repair alone is not sufficient — rarely-read data remains stale until full anti-entropy runs',
      'In interviews, explain how read repair is the complement to hinted handoff: handoff handles writes, read repair handles reads',
      'Know the performance trade-off: read repair adds latency to reads but improves consistency over time',
    ],

    introduction: `**Read repair** is an opportunistic consistency mechanism in distributed databases. During a read operation, the coordinator contacts multiple replicas and compares their responses. If one or more replicas return stale data, the coordinator sends the latest version to the outdated replicas, "repairing" the inconsistency as a side effect of the read. The term "opportunistic" is key — repairs only happen when data is actually accessed, making it a lazy, demand-driven consistency mechanism.

This approach is a cornerstone of **eventually consistent** systems. Rather than requiring eager synchronization of all replicas on every write (which reduces availability), the system tolerates temporary inconsistency and fixes it lazily — when the data is actually accessed. This means frequently-read data converges quickly, while rarely-read data may remain stale for longer. This property makes read repair particularly effective for workloads with a Zipfian (power-law) access pattern, where a small fraction of keys accounts for most reads.

**Cassandra**, **DynamoDB**, and **Riak** implement read repair as part of their read path. Cassandra optimizes this with **digest queries**: instead of fetching the full value from all replicas, it fetches the full value from one and a lightweight digest (hash) from the others. Only if the digests disagree does it fetch the full value from the mismatched replicas. Notably, **Cassandra 4.0 removed probabilistic read repair** (the old \`read_repair_chance\` setting) in favor of deterministic blocking read repair and incremental anti-entropy repair, reflecting lessons learned from production operations.

**When to use read repair**: Eventually consistent databases where read latency can tolerate the overhead of multi-replica comparison, and where hot data should converge quickly without waiting for background repair. **When NOT to use**: Strong consistency systems (Raft-based databases do not need read repair since committed data is already on a majority), write-heavy workloads where reads are rare (cold data never gets repaired), or latency-sensitive reads where the digest comparison and repair write add unacceptable overhead.`,

    keyQuestions: [
      {
        question: 'How does read repair work step by step?',
        answer: `**Cassandra read repair with digest queries (CL=QUORUM, RF=3)**:

\`\`\`
Client READ key=K, CL=QUORUM
        │
        ▼
   Coordinator
    ├── Full data request ──► Node A
    │                          Returns: {value: "v2", ts: 100}
    ├── Digest request ──────► Node B
    │                          Returns: {digest: hash("v2")}
    └── Digest request ──────► Node C
                               Returns: {digest: hash("v1")}  ← STALE!

Step 1: Compare digests
  A.digest == B.digest ✓ (both have v2)
  A.digest != C.digest ✗ (C has stale v1)

Step 2: Fetch full data from C
  C returns: {value: "v1", ts: 90}

Step 3: Determine latest version
  A.ts=100 > C.ts=90 → v2 is the latest

Step 4: Return v2 to client immediately

Step 5: (async) Send v2 to Node C as repair
  C updates key K to v2

Result: All three replicas now have v2
\`\`\`

**Key optimization**: Digest queries save bandwidth. Instead of transferring the full value from all replicas (which could be large), only a small hash is transferred. Full data is only fetched on mismatch.`
      },
      {
        question: 'What is the difference between foreground and background read repair?',
        answer: `**Foreground (synchronous) read repair**:
\`\`\`
  Client read ──► Coordinator
                    ├── Request from R replicas (quorum)
                    ├── Detect mismatch
                    ├── Repair stale replicas
                    └── Return latest to client

  Latency: Higher (waits for repair before responding)
  Consistency: Strongest (repaired before response)
  Used when: CL=ALL or strong consistency needed
\`\`\`

**Background (asynchronous) read repair**:
\`\`\`
  Client read ──► Coordinator
                    ├── Request from R replicas (quorum)
                    ├── Return latest to client IMMEDIATELY
                    └── (async) Detect mismatch, repair later

  Latency: Lower (respond immediately, repair in background)
  Consistency: Weaker (other readers may see stale data briefly)
  Used when: CL=QUORUM or ONE (most common)
\`\`\`

**Cassandra's approach**:
\`\`\`
read_repair_chance:          0.0 to 1.0
  Probability of triggering background read repair
  on each read (even when quorum agrees).
  Default was 0.1 (10%) in older versions.

dclocal_read_repair_chance:  0.0 to 1.0
  Read repair within the local data center only.
  Default was 0.1.

Note: Cassandra 4.0+ removed probabilistic read repair
in favor of transient replication and incremental repair.
\`\`\`

**Interview point**: Background read repair is a probabilistic consistency mechanism. It works well for hot data (read often → repaired often) but cold data may stay inconsistent indefinitely without periodic full repairs.`
      },
      {
        question: 'How does read repair complement hinted handoff and anti-entropy?',
        answer: `**Three-layer consistency system** (Dynamo-style databases):

\`\`\`
Layer 1: Hinted Handoff (Write-time)
  ┌─────────────────────────────────────┐
  │ When: During write, replica is down │
  │ How:  Store hint on another node    │
  │ Scope: Single write                 │
  │ Speed: Immediate on recovery        │
  │ Limit: Hint TTL, hinting node fail  │
  └─────────────────────────────────────┘
            │
            ▼  (some writes still missed)
Layer 2: Read Repair (Read-time)
  ┌─────────────────────────────────────┐
  │ When: During read, stale detected   │
  │ How:  Compare replicas, fix stale   │
  │ Scope: Data that is being read      │
  │ Speed: On next read of the key      │
  │ Limit: Cold data never repaired     │
  └─────────────────────────────────────┘
            │
            ▼  (cold data still inconsistent)
Layer 3: Anti-Entropy Repair (Background)
  ┌─────────────────────────────────────┐
  │ When: Periodic background process   │
  │ How:  Merkle tree comparison + sync │
  │ Scope: ALL data in token range      │
  │ Speed: Hours to complete full scan  │
  │ Limit: Expensive, resource-heavy    │
  └─────────────────────────────────────┘
\`\`\`

**Each layer catches what the previous missed**:
1. Hinted handoff handles most transient failures
2. Read repair catches the rest for frequently-accessed data
3. Anti-entropy ensures even rarely-read data converges

**Operational reality**: You need all three. Disabling any one creates consistency gaps that grow over time.`
      },
      {
        question: 'What are the performance implications of read repair?',
        answer: `**Latency impact**:
\`\`\`
Normal read (no repair needed):
  Coordinator ──► R replicas ──► compare ──► return
  Latency: max(R replica response times) + comparison

Read with repair triggered:
  Coordinator ──► R replicas ──► mismatch detected
    ──► fetch full data from stale replicas
    ──► determine latest version
    ──► return to client + async repair write
  Latency: max(all replica responses) + comparison + repair write

Additional latency: 1-10ms typically
  (repair write is async in background mode)
\`\`\`

**Bandwidth impact**:
- Digest queries: ~32 bytes per digest vs potentially KB-MB per full value
- Repair writes: full value sent to each stale replica
- With 10% read_repair_chance: 10% of reads trigger extra I/O

**Tuning strategies**:
\`\`\`
High consistency requirement:
  read_repair_chance = 1.0  (100% of reads)
  More bandwidth, faster convergence

Cost-sensitive / high-read-volume:
  read_repair_chance = 0.0  (disabled)
  Rely on periodic anti-entropy repair instead

Balanced:
  read_repair_chance = 0.1  (10% of reads)
  Reasonable convergence with moderate overhead
\`\`\`

**Monitoring**: Track the read_repair metric. If it fires frequently, it indicates a systemic inconsistency problem (e.g., failing hinted handoff, overloaded replicas dropping writes).`
      },
      {
        question: 'How did Cassandra 4.0 change read repair and why?',
        answer: `**What changed in Cassandra 4.0**:

\`\`\`
  Removed:
    - read_repair_chance (probabilistic background read repair)
    - dclocal_read_repair_chance
    These settings caused unpredictable repair behavior

  Kept:
    - Blocking read repair (always active for CL > ONE)
    When digests mismatch during a quorum read,
    Cassandra still fetches full data and repairs stale replicas

  Added:
    - Transient replication (experimental)
    - Incremental anti-entropy repair improvements
\`\`\`

**Why probabilistic read repair was removed**:
\`\`\`
  Problem 1: Unpredictable overhead
    read_repair_chance = 0.1 means 10% of ALL reads
    trigger extra I/O, even when no repair is needed
    Under high read load, this adds significant latency tail

  Problem 2: False sense of security
    Operators assumed read_repair_chance = 0.1 would
    keep data consistent. But cold data (rarely read)
    would still never be repaired.

  Problem 3: Unblocking read repair was racy
    Background repair writes could conflict with
    concurrent application writes, creating
    subtle ordering issues
\`\`\`

**New approach in Cassandra 4.0+**:
\`\`\`
  Consistency strategy:
    1. Blocking read repair (deterministic)
       → Fires only when digest mismatch detected
       → No wasted I/O when data is consistent
       → Repair happens before returning to client

    2. Incremental anti-entropy repair (background)
       → Only repairs data written since last repair
       → Much faster than full Merkle-tree repair
       → Run periodically (e.g., every 24 hours)

    3. Hinted handoff (write-time)
       → Unchanged, handles transient failures
\`\`\`

**Migration advice**: When upgrading to Cassandra 4.0+, ensure you have a regular incremental repair schedule (e.g., daily or weekly) to replace the consistency coverage that probabilistic read repair previously provided. Without it, cold data will not converge.`
      },
      {
        question: 'How does read repair interact with tombstones and deletions?',
        answer: `**The tombstone problem**: In distributed databases, a delete is not a simple removal — it creates a **tombstone** (a marker that says "this key was deleted"). Tombstones are necessary because simply removing data from one replica does not prevent it from being "resurrected" by read repair from another replica that still has the old data.

\`\`\`
  Without tombstones:
    Node A: DELETE key K  → K removed from A
    Node B: Still has key K (delete didn't reach B)

    Read repair from B to A:
    "Hey A, you're missing key K, here's the value"
    A accepts → K is RESURRECTED! Delete is lost.

  With tombstones:
    Node A: DELETE key K  → A stores tombstone for K
    Node B: Still has live key K

    Read repair compares:
    A has tombstone (ts=100), B has live value (ts=90)
    Tombstone wins (ts 100 > 90) → B deletes K
    K stays deleted ✓
\`\`\`

**Tombstone lifecycle**:
\`\`\`
  1. Delete issued → tombstone created (ts = now)
  2. Tombstone replicated to other nodes via normal write path
  3. Read repair propagates tombstone to stale replicas
  4. gc_grace_seconds (default: 10 days) counts down
  5. After gc_grace_seconds: tombstone eligible for compaction removal
  6. Compaction removes tombstone from SSTable

  CRITICAL: If a replica was down for > gc_grace_seconds
  and the tombstone has been compacted away on other replicas,
  the live data on the recovering replica can RESURRECT.
  This is why repair must run within gc_grace_seconds.
\`\`\`

**Read repair and tombstone interactions**:
\`\`\`
  Scenario: Range scan returns many tombstones
    Each tombstone is compared across replicas
    High tombstone count → high read repair overhead
    Cassandra warns: "Read X live and Y tombstone cells"

  Performance impact:
    Tombstone-heavy tables slow down reads significantly
    Read repair amplifies this by comparing tombstones too
    Solution: Use appropriate TTL or gc_grace_seconds,
    and run regular compaction to purge expired tombstones
\`\`\`

**Best practices**:
- Run \`nodetool repair\` within \`gc_grace_seconds\` to prevent zombie data
- Monitor tombstone scan counts per read — alert if consistently high
- Use TTL for data with natural expiration instead of explicit deletes
- Consider time-windowed compaction strategy (TWCS) for time-series data to efficiently drop old tombstones`
      },
      {
        question: 'How does read repair work in DynamoDB compared to Cassandra?',
        answer: `**DynamoDB's approach**:
\`\`\`
  DynamoDB handles consistency differently from Cassandra:

  Strongly consistent read (ConsistentRead=true):
    → Read from the leader replica
    → Always returns latest committed write
    → No read repair needed (single source of truth)
    → Higher latency, uses more read capacity units

  Eventually consistent read (default):
    → Read from any replica
    → May return stale data (typically consistent within 1s)
    → DynamoDB performs internal consistency maintenance
    → Details are not publicly documented (proprietary)

  DynamoDB does NOT expose read repair as a user-configurable mechanism.
  Consistency maintenance is fully automatic and internal.
\`\`\`

**Cassandra's approach (detailed)**:
\`\`\`
  CL=ONE:
    Read from 1 replica, return immediately
    Blocking read repair: NOT triggered
    (Only 1 replica contacted, nothing to compare)
    Background read repair: Was probabilistic (pre-4.0)

  CL=QUORUM (RF=3):
    Read from 2 replicas (1 full data + 1 digest)
    Blocking read repair: Triggered if digests differ
    Repair: Send latest to stale replica before returning

  CL=ALL (RF=3):
    Read from all 3 replicas (1 full + 2 digest)
    Blocking read repair: Triggered if any digest differs
    Strongest read consistency, highest latency
\`\`\`

**Comparison**:
| Property | DynamoDB | Cassandra |
|----------|---------|-----------|
| Read repair visibility | Hidden (internal) | Explicit (configurable) |
| Strong consistency option | ConsistentRead=true | CL=ALL or CL=QUORUM |
| Digest optimization | Not applicable (internal) | Yes (digest queries) |
| Operator control | None (managed service) | Full (CL, repair settings) |
| Cold data repair | Automatic (internal) | Requires manual anti-entropy |

**Interview insight**: DynamoDB abstracts away read repair entirely — it is a managed service where consistency maintenance is Amazon's responsibility. Cassandra gives operators full control but requires them to understand and configure the repair stack correctly. This is a key trade-off between managed and self-hosted databases.`
      },
      {
        question: 'What is speculative retry and how does it relate to read repair?',
        answer: `**Speculative retry** is a latency optimization that can trigger read repair as a side effect. When a read request to a replica takes too long, the coordinator speculatively sends the same request to another replica without waiting for the slow one to respond.

\`\`\`
  Normal read (CL=QUORUM, RF=3):
    Coordinator → Node A (full data)     → responds in 2ms ✓
    Coordinator → Node B (digest)        → responds in 2ms ✓
    Return result to client

  Read with slow replica:
    Coordinator → Node A (full data)     → responds in 2ms ✓
    Coordinator → Node B (digest)        → no response after 10ms...
    Coordinator → Node C (speculative)   → responds in 3ms ✓
    Return result (from A + C, ignore late B)
\`\`\`

**How speculative retry triggers read repair**:
\`\`\`
  If Node A and Node C have different data:
    A returns: value=v2, ts=100
    C returns: digest(v1) — stale!

    Read repair triggered:
    Coordinator sends v2 to Node C
    Client gets v2 (latest) without extra latency

    When B eventually responds:
    B might also be stale → repair B too
\`\`\`

**Cassandra speculative retry policies**:
\`\`\`
  ALWAYS:
    Always send speculative request after percentile_threshold
    Most aggressive, best tail latency, highest I/O

  p99:
    Speculate after p99 latency threshold
    Only fires for the slowest 1% of reads
    Good balance of latency improvement vs overhead

  NONE:
    Never speculate (default for some table types)
    Simplest, lowest overhead, worst tail latency

  Custom:
    Speculate after fixed delay (e.g., 50ms)
    Useful when p99 latency is well-known
\`\`\`

**The virtuous cycle**: Speculative retry improves read latency AND triggers read repair on the speculative replica, gradually improving data consistency. The extra read that fixes latency also fixes stale data.

**Trade-off**: Speculative retry increases read amplification (more replicas contacted per read). Under high load, this can create a feedback loop — slow reads trigger speculation, which increases load, which causes more slow reads. Monitor speculation rate and back off if it exceeds 5-10% of reads.`
      },
    ],

    dataModel: {
      description: 'Read repair protocol flow and digest comparison',
      schema: `Read Repair Flow:
  1. Client sends READ(key, consistency_level) to coordinator
  2. Coordinator selects R replica nodes
  3. Sends full-data request to closest replica
  4. Sends digest request to remaining R-1 replicas
  5. Compare digests:
     a. All match → return data, no repair
     b. Mismatch → fetch full data from mismatched replicas
  6. Determine latest version (by timestamp or vector clock)
  7. Return latest version to client
  8. (Async) Send latest version to stale replicas

Digest Format:
  digest:     MD5/murmur3 hash of the value
  timestamp:  write timestamp of the value

Repair Message:
  key:        the data key
  value:      the latest value
  timestamp:  the authoritative timestamp
  source:     coordinator node id`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 8. Segmented Log (data-integrity)
  // ─────────────────────────────────────────────────────────
  {
    id: 'segmented-log',
    title: 'Segmented Log',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 8,
    description: 'Splitting a large append-only log into fixed-size segments for efficient compaction, retention management, and parallel I/O — the architecture behind Kafka, etcd, and write-ahead logs.',
    concepts: [
      'Log segmentation and rolling',
      'Active vs closed segments',
      'Log compaction (key-based retention)',
      'Time-based and size-based retention',
      'Segment indexing for fast lookup',
      'Kafka partition segments',
      'Cleanup policies: delete vs compact',
    ],
    tips: [
      'Kafka splits each partition into segment files — understand this for any Kafka interview question',
      'Segmented logs solve the "infinite log" problem: old segments can be deleted or compacted independently',
      'Know the two Kafka cleanup policies: "delete" (remove old segments) and "compact" (keep latest per key)',
      'In interviews, explain how segments enable parallel reads: different consumers can read different segments simultaneously',
      'Connect to WAL: most WAL implementations use segmented logs internally (PostgreSQL WAL segments are 16MB)',
    ],

    introduction: `A **segmented log** takes the simple concept of an append-only log and makes it practical for production systems by splitting the log into fixed-size or time-bounded **segments**. Instead of one ever-growing file, the log consists of a sequence of segment files: one "active" segment being appended to, and a series of "closed" segments that are immutable and eligible for cleanup. This seemingly simple idea is what makes durable, high-throughput log systems possible at scale.

This design solves critical operational problems. A single infinite log file is impossible to manage: it cannot be efficiently searched, it fills disks, and deleting old data requires rewriting the entire file. Segments allow old data to be **deleted** (drop entire segment files) or **compacted** (remove superseded entries) without touching the active write path. The immutability of closed segments also enables **parallel reads** — different consumers can read different segments simultaneously without lock contention.

**Apache Kafka** is the most prominent implementation of this pattern. Each Kafka partition is a segmented log on disk, with configurable segment size (default 1GB) and retention policies. **etcd**'s Raft log uses segments with periodic snapshots, after which old log entries are discarded (the low-water mark pattern). **PostgreSQL**'s WAL uses 16MB segments that are archived for point-in-time recovery. **Apache BookKeeper** (used by Apache Pulsar) takes segmentation further by distributing segments across a pool of storage nodes, enabling independent scaling of storage and compute.

**When to use segmented logs**: Any system that needs ordered, durable, append-only storage with controllable retention — event streaming, transaction logs, commit logs, audit trails, and CDC pipelines. **When NOT to use**: Small datasets where a single file is sufficient, workloads requiring random updates (not append-only), or systems where the operational complexity of managing segments, indexes, and retention policies is not justified by the scale.`,

    keyQuestions: [
      {
        question: 'How does Kafka implement segmented logs for a partition?',
        answer: `**Kafka partition on disk**:
\`\`\`
  partition-0/
    ├── 00000000000000000000.log   (segment: offsets 0-9999)
    ├── 00000000000000000000.index (sparse offset → position)
    ├── 00000000000000000000.timeindex
    ├── 00000000000000010000.log   (segment: offsets 10000-19999)
    ├── 00000000000000010000.index
    ├── 00000000000000010000.timeindex
    ├── 00000000000000020000.log   (ACTIVE segment)
    ├── 00000000000000020000.index
    └── 00000000000000020000.timeindex
\`\`\`

**Segment lifecycle**:
\`\`\`
  New messages ──append──► Active Segment
                               │
                  (reaches segment.bytes=1GB
                   or segment.ms=7 days)
                               │
                               ▼
                          Close segment
                          (becomes immutable)
                               │
                          Create new active segment
                               │
       ┌───────────────────────┴──────────────────┐
       ▼                                          ▼
  retention.ms=7d                          cleanup.policy=compact
  Delete segments older                    Remove old values,
  than 7 days                              keep latest per key
\`\`\`

**Index file**: Sparse index mapping offset → byte position in the .log file. To find offset 10042:
1. Binary search index → closest entry <= 10042 (e.g., 10040 → byte 48392)
2. Sequential scan from byte 48392 to find 10042
3. Sparse index keeps the index file small (one entry per ~4KB of log data)`
      },
      {
        question: 'What is the difference between log deletion and log compaction?',
        answer: `**Deletion (cleanup.policy=delete)**:
\`\`\`
  Segment 1     Segment 2     Segment 3 (active)
  [old data]    [recent data] [new data]
  age > 7 days

  After cleanup:
  ×deleted×     Segment 2     Segment 3 (active)

  Use case: Event streams, metrics, logs
  - "I only care about the last 7 days of events"
  - All data in old segments is lost
\`\`\`

**Compaction (cleanup.policy=compact)**:
\`\`\`
  Before compaction:
  Segment 1:
    offset 0: key=A, value=1
    offset 1: key=B, value=2
    offset 2: key=A, value=3  ← supersedes offset 0
    offset 3: key=C, value=4

  Segment 2:
    offset 4: key=B, value=5  ← supersedes offset 1
    offset 5: key=A, value=6  ← supersedes offset 2

  After compaction:
  Compacted Segment:
    key=C, value=4  (only version)
    key=B, value=5  (latest)
    key=A, value=6  (latest)

  Use case: Changelog/CDC, KTable materialization
  - "I need the latest state for every key"
  - Historical versions of a key are removed
  - Keys with tombstone (null value) are deleted after grace period
\`\`\`

**Comparison**:
| Property | Delete | Compact |
|----------|--------|---------|
| Retention basis | Time/size | Per-key latest |
| Data preserved | Recent window | Latest per key (all time) |
| Disk reclaim | Predictable | Depends on key cardinality |
| Consumer replay | Can miss old events | Can always rebuild full state |
| Kafka use case | Event stream | KTable, CDC, config |`
      },
      {
        question: 'How do segment indexes enable efficient reads?',
        answer: `**Problem**: A consumer wants to read from offset 5,000,042 in a partition with millions of messages across many segments.

**Step 1: Find the right segment** (O(log S) where S = number of segments):
\`\`\`
  Segments:
    00000000000000000000.log  (offsets 0 - 999,999)
    00000000000001000000.log  (offsets 1M - 1,999,999)
    ...
    00000000000005000000.log  (offsets 5M - 5,999,999)  ← HERE

  Segment file names = base offset → binary search
\`\`\`

**Step 2: Find position within segment** using sparse index:
\`\`\`
  00000000000005000000.index:
    Offset    Position (bytes)
    5000000 → 0
    5000100 → 41,280
    5000200 → 82,644       ← closest <= 5000042
    ...

  Binary search index → offset 5000000 at byte 0
  (next entry: 5000100 at byte 41,280)
\`\`\`

**Step 3: Sequential scan from byte 0**:
\`\`\`
  Read from byte 0, scan forward 42 messages
  to reach offset 5,000,042

  Total I/O: ~42 message reads (not 5 million!)
\`\`\`

**Time-based index** (.timeindex): Maps timestamp → offset, enabling "give me messages from 2pm yesterday."

**Page cache synergy**: Active segments and recent indexes are typically in OS page cache, making most reads memory-speed.`
      },
      {
        question: 'How does segment size affect system performance?',
        answer: `**Small segments** (e.g., 100MB):
\`\`\`
Advantages:
  - Faster deletion (smaller files to remove)
  - Less wasted space (finer retention granularity)
  - Quicker compaction per segment

Disadvantages:
  - More files → more file descriptors
  - More index files → more memory for indexes
  - More frequent segment rolls → slightly more overhead
  - Many tiny files can stress the filesystem
\`\`\`

**Large segments** (e.g., 4GB):
\`\`\`
Advantages:
  - Fewer files → fewer file descriptors
  - Better sequential I/O (longer contiguous writes)
  - Less overhead from segment management

Disadvantages:
  - Coarser retention (must keep/delete entire segment)
  - Longer compaction time per segment
  - More data at risk if a segment is corrupted
  - Larger index gap if segment takes a long time to fill
\`\`\`

**Kafka defaults and tuning**:
\`\`\`
  segment.bytes = 1GB          (size-based rolling)
  segment.ms = 7 days          (time-based rolling)
  log.segment.delete.delay = 60s (delay before file delete)
  index.interval.bytes = 4096  (index sparseness)

  Recommended: Leave defaults unless you have specific needs
  High-throughput topics: Larger segments (2-4GB)
  Many small topics: Smaller segments (256MB-512MB)
  Low-volume topics: Use segment.ms to ensure segments
    roll even when data volume is low
\`\`\`

**Operational note**: Monitor open file descriptor count. A broker with thousands of partitions and small segments can exhaust file descriptors.`
      },
      {
        question: 'How does Kafka tiered storage change the segmented log architecture?',
        answer: `**Traditional Kafka storage**:
\`\`\`
  All segments stored locally on broker disk:
    Broker 1:
      topic-A/partition-0/
        segment-0.log    (old)
        segment-1.log    (old)
        segment-2.log    (recent)
        segment-3.log    (ACTIVE)

  Problem: To retain 30 days of data, need enough
  local disk for 30 days × write_rate × RF
  For a busy topic: 100MB/s × 86400s × 30d × 3 RF = 777TB!
\`\`\`

**Tiered storage (KIP-405, production in Kafka 3.6+)**:
\`\`\`
  Broker local disk:         Object storage (S3, GCS, Azure Blob):
    segment-3.log (ACTIVE)     segment-0.log (old, cheap)
    segment-2.log (recent)     segment-1.log (old, cheap)

  Hot tier: Recent segments on fast local NVMe
  Cold tier: Old segments on cheap object storage
  Retention: 30 days cold + 2 hours hot

  Broker disk: 100MB/s × 7200s × 3 RF = 2.1TB (hot)
  Object store: 100MB/s × 86400s × 30d = 259TB (cold, ~$6/TB/mo)
\`\`\`

**How it works**:
1. Active segment is written locally (as before)
2. When segment is closed (rolled), it becomes eligible for offloading
3. Background thread copies closed segments to object storage
4. Local copy retained for a configurable hot retention period
5. After hot retention expires, local copy deleted
6. Consumer reads: hot segments from local, cold from object store
7. Remote log metadata (which segments are where) maintained per partition

**Impact on consumers**:
\`\`\`
  Consumer reading recent data (within hot retention):
    Reads from local disk → same latency as before

  Consumer reading old data (cold tier):
    Reads from S3/GCS → higher latency (50-200ms)
    Segments are cached on broker after first fetch
    Acceptable for batch processing, backfill, audit
\`\`\`

**Key benefit**: Decouple retention from broker disk capacity. Keep data for months or years at object storage prices without scaling broker hardware. This is a major operational simplification for Kafka at scale.`
      },
      {
        question: 'How do etcd and Raft use segmented logs differently from Kafka?',
        answer: `**Kafka's segmented log**: Stores the data itself. Segments ARE the permanent record. Consumers read segments directly.

**etcd/Raft's segmented log**: Stores commands (state machine inputs). The log is a means to replicate commands, not the final storage.

\`\`\`
  Kafka:
    Log = primary storage
    Consumers read the log directly
    Retention: configurable (hours to indefinite)
    Log IS the database

  etcd (Raft):
    Log = replication mechanism
    State machine (BoltDB) = primary storage
    Clients read the state machine, not the log
    Log can be truncated after snapshot
    Log is a MEANS to build the database
\`\`\`

**etcd's WAL and snapshot lifecycle**:
\`\`\`
  Raft log entries:
    [1:PUT /key1=val1][2:PUT /key2=val2]...[10000:PUT /key3=val3]
                                                ▲
                                           Snapshot taken at entry 10000
                                           (full state machine state serialized)

  After snapshot:
    Entries 1-10000 can be deleted (already reflected in snapshot)
    New entries: [10001:PUT /key4=val4][10002:DELETE /key1]...
    On recovery: load snapshot + replay entries 10001+
\`\`\`

**WAL files in etcd**:
\`\`\`
  data-dir/member/wal/
    0000000000000000-0000000000000000.wal  (first segment)
    0000000000000001-0000000000010000.wal  (second segment)
    ...

  Each WAL file: 64MB (pre-allocated for sequential write perf)
  Contains: Raft log entries + hard state (term, vote, commit)
  On snapshot: old WAL files can be purged
\`\`\`

**BookKeeper (used by Apache Pulsar)**:
\`\`\`
  Differs from both Kafka and etcd:
    Log segments (ledgers) are distributed across storage nodes (bookies)
    A single topic's log spans multiple bookies
    Ledgers are immutable once sealed
    New ledger created when old one reaches size limit

  Advantage: Segment-level rebalancing without data movement
  Disadvantage: More operational complexity (separate bookie cluster)
\`\`\`

**Comparison**:
| Property | Kafka | etcd/Raft | BookKeeper/Pulsar |
|----------|-------|-----------|-------------------|
| Log purpose | Primary storage | Replication mechanism | Distributed storage |
| Segment location | Single broker | Single node WAL | Distributed across bookies |
| Truncation | Retention policy | After snapshot | After cursor advancement |
| Segment lifetime | Hours to forever | Until snapshot | Until all cursors pass |
| Read pattern | Sequential consumer | Recovery replay | Sequential consumer |`
      },
      {
        question: 'How does log compaction handle ordering and what guarantees does it provide?',
        answer: `**Log compaction guarantee**: For any key that appears in the log, the compacted log retains **at least the most recent value** for that key. The ordering of the retained entries is preserved — a compacted log is still ordered by offset.

\`\`\`
  Before compaction:
    Offset  Key  Value
    0       A    1
    1       B    2
    2       A    3     ← supersedes offset 0
    3       C    4
    4       B    5     ← supersedes offset 1
    5       A    null  ← tombstone (delete A)
    6       D    6

  After compaction:
    Offset  Key  Value
    3       C    4     (only version of C)
    4       B    5     (latest B)
    5       A    null  (tombstone, kept during delete.retention.ms)
    6       D    6     (only version of D)

  Note: Offsets are preserved! There is no offset 0, 1, or 2 after
  compaction, but offset 3 still means offset 3. Consumers that
  tracked their position by offset are not confused.
\`\`\`

**Tombstone handling in compaction**:
\`\`\`
  Key A with null value = tombstone
  Tombstone is retained for delete.retention.ms (default: 24h)
  After retention: tombstone is removed in next compaction

  Why keep tombstones temporarily?
    A consumer that is behind may have seen A=3 (offset 2)
    If we remove the tombstone immediately, the consumer
    never learns that A was deleted
    Keeping it for 24h gives consumers time to catch up
\`\`\`

**Compaction mechanics in Kafka**:
\`\`\`
  Compaction runs in background (log.cleaner threads)

  1. Identify "dirty" segments (contain superseded entries)
     dirty ratio = dirty_bytes / total_bytes
     Compact when dirty_ratio > min.cleanable.dirty.ratio (0.5)

  2. Build offset map: key → latest offset (in-memory hash map)
     Memory: log.cleaner.dedupe.buffer.size (128MB default)

  3. Copy clean entries to new segment file
     Skip entries where key has a later offset
     Preserve tombstones within retention period

  4. Swap old segments with compacted segments (atomic)

  Cost: CPU for hashing + disk I/O for rewriting segments
  Does NOT block producers or consumers
\`\`\`

**Guarantees**:
1. **Offset preservation**: Compaction never changes an entry's offset
2. **Ordering preservation**: Entries remain in offset order
3. **At-least-one**: Every key has at least its latest value (or tombstone)
4. **Tail preservation**: The active segment is never compacted (too recent)
5. **Idempotent**: Running compaction multiple times produces the same result`
      },
      {
        question: 'When should you use segmented logs vs B-tree based storage?',
        answer: `**Segmented log (LSM/append-only)**:
\`\`\`
  Write path: Append to active segment (sequential I/O)
  Read path: Check active segment, then older segments
  Update: Append new entry (old entry superseded)
  Delete: Append tombstone

  Optimized for: WRITES (sequential append is fast)
  Penalty on: READS (may scan multiple segments)
\`\`\`

**B-tree based storage**:
\`\`\`
  Write path: Find correct page, update in place (random I/O)
  Read path: Walk tree from root to leaf (O(log N))
  Update: Modify page in place + WAL entry
  Delete: Remove from page + WAL entry

  Optimized for: READS (direct page lookup)
  Penalty on: WRITES (random I/O for page updates)
\`\`\`

**Detailed comparison**:
| Property | Segmented Log (Kafka, RocksDB) | B-tree (PostgreSQL, MySQL) |
|----------|-------------------------------|---------------------------|
| Write throughput | Very high (sequential append) | Moderate (random I/O) |
| Read latency | Higher (may check multiple files) | Lower (direct page lookup) |
| Space amplification | Higher (old versions until compaction) | Lower (in-place update) |
| Write amplification | Lower (one write) | Higher (WAL + page write) |
| Compaction overhead | Background CPU + I/O | None (in-place updates) |
| Concurrent readers | Easy (immutable segments) | Page-level locking |
| Range scans | Requires merge across segments | Efficient (sorted pages) |

**Decision framework**:
\`\`\`
  Use segmented log when:
    - Write throughput is the priority
    - Data is naturally append-only (events, logs, messages)
    - Reads can tolerate higher latency
    - Workload is write-heavy (>70% writes)
    Examples: Kafka, event stores, time-series databases

  Use B-tree when:
    - Read latency is the priority
    - Workload is read-heavy or mixed
    - Data is frequently updated in place
    - Range queries are common
    Examples: PostgreSQL, MySQL, SQLite, most OLTP databases

  Use LSM tree (hybrid) when:
    - Need high write throughput AND reasonable read latency
    - Willing to accept compaction overhead
    Examples: RocksDB, LevelDB, Cassandra, HBase
\`\`\`

**Interview tip**: When discussing storage engine trade-offs, frame it as "segmented logs optimize the write path (sequential I/O) while B-trees optimize the read path (sorted structure). LSM trees bridge the gap by combining append-only writes with background compaction into sorted runs."`
      },
    ],

    dataModel: {
      description: 'Segment file structure and index format',
      schema: `Segment File (.log):
  ┌────────────────────────────────────────────┐
  │ Record 0: [offset|timestamp|key|value|crc] │
  │ Record 1: [offset|timestamp|key|value|crc] │
  │ ...                                        │
  │ Record N: [offset|timestamp|key|value|crc] │
  └────────────────────────────────────────────┘

Offset Index (.index):
  ┌──────────────────────────┐
  │ relative_offset → position│   (sparse, every ~4KB)
  │ 0 → 0                    │
  │ 100 → 41280              │
  │ 200 → 82644              │
  └──────────────────────────┘

Time Index (.timeindex):
  ┌──────────────────────────┐
  │ timestamp → offset       │   (sparse)
  │ 1709000000 → 0           │
  │ 1709000060 → 100         │
  └──────────────────────────┘

Segment Lifecycle:
  ACTIVE → append writes here
  CLOSED → immutable, eligible for cleanup
  DELETED → removed from disk after delay`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 9. High-Water Mark (consistency)
  // ─────────────────────────────────────────────────────────
  {
    id: 'high-water-mark',
    title: 'High-Water Mark',
    icon: 'barChart',
    color: '#3b82f6',
    questions: 8,
    description: 'A marker that tracks the last log entry safely replicated to a quorum of nodes, distinguishing committed (safe to read) from uncommitted (may be lost on failover) entries.',
    concepts: [
      'Committed vs uncommitted log entries',
      'Replication progress tracking',
      'Consumer visibility boundary',
      'Leader-follower sync protocol',
      'Kafka high-water mark',
      'Raft commit index',
    ],
    tips: [
      'The high-water mark is the boundary between "safe" and "unsafe" data — committed entries survive leader failure',
      'Kafka consumers only see messages up to the high-water mark, not the log end offset',
      'In Raft, the commit index is the high-water mark — entries before it are guaranteed durable',
      'In interviews, draw the log with LEO and HWM and explain why consumers cannot read past HWM',
      'Know the distinction: LEO (Log End Offset) = latest entry, HWM = latest committed entry; LEO >= HWM always',
    ],

    introduction: `The **high-water mark** (HWM) is a critical concept in replicated log systems. It marks the position in the log up to which entries have been safely replicated to enough nodes (a quorum) to guarantee durability. Entries at or before the high-water mark are **committed** — they will not be lost even if the leader crashes. Entries after the high-water mark are **uncommitted** — they exist only on the leader (and possibly some followers) and could be lost on failover. This simple boundary between "safe" and "unsafe" data is the foundation of durability guarantees in replicated systems.

In **Apache Kafka**, the high-water mark determines which messages are visible to consumers. A producer may have written a message and received an acknowledgment, but consumers cannot read it until all in-sync replicas (ISRs) have replicated it and the HWM has advanced. This is Kafka's promise to consumers: everything they read has been replicated to every broker in the ISR and will survive a single broker failure. Kafka's KIP-101 further refined the protocol by using **leader epochs** rather than high-water marks for log truncation decisions, fixing subtle edge cases where stale HWM values could cause committed data loss during ISR expansion.

In **Raft** consensus, the equivalent concept is the **commit index**. The leader tracks which log entries have been replicated to a majority of nodes and advances the commit index accordingly. Only committed entries are applied to the state machine. The Raft commit index differs from Kafka's HWM in an important way: Raft uses a fixed majority quorum (always N/2+1), while Kafka's ISR set can shrink dynamically. This means Kafka's HWM can advance with fewer replicas, which is more available but requires careful handling of ISR changes.

**When to use high-water mark**: Any replicated log system where consumers or state machines should only see committed data — distributed databases (etcd, CockroachDB), message brokers (Kafka), and replicated state machines. **When the concept does not apply**: Leaderless systems (Cassandra, DynamoDB) where there is no single log to replicate, or single-node databases where there is no replication lag to manage.`,

    keyQuestions: [
      {
        question: 'How does the high-water mark work in Kafka?',
        answer: `**Kafka's two important offsets per partition**:
\`\`\`
  Leader's log:
  [msg0][msg1][msg2][msg3][msg4][msg5][msg6]
                              ▲            ▲
                             HWM          LEO
                     (high-water mark)  (log end offset)

  Messages 0-4: Committed (replicated to all ISRs)
  Messages 5-6: Uncommitted (only on leader, replication in progress)
\`\`\`

**Consumer visibility**:
\`\`\`
  Consumer can read: msg0 through msg4 (up to HWM)
  Consumer CANNOT read: msg5, msg6 (past HWM)

  Why? If leader crashes before msg5-6 are replicated,
  a new leader may not have them → consumer would see
  data that "disappears" → violates read consistency
\`\`\`

**HWM advancement**:
\`\`\`
  Leader       Follower 1    Follower 2
  [0-6]        [0-5]         [0-4]     ← LEO per replica

  ISR = {Leader, F1, F2}
  HWM = min(LEO of all ISRs) = min(6, 5, 4) = 4

  Follower 2 fetches msg5 from leader:
  [0-6]        [0-5]         [0-5]
  HWM = min(6, 5, 5) = 5     ← HWM advances!
  Consumer can now read msg5
\`\`\`

**Producer acks interaction**:
- \`acks=0\`: No acknowledgment, fire and forget
- \`acks=1\`: Leader writes to its log, ACK immediately (before HWM advance)
- \`acks=all\`: Wait until HWM advances past the message (all ISRs replicated)`
      },
      {
        question: 'What happens to uncommitted entries during a leader failover?',
        answer: `**Scenario**: Leader has entries past the HWM that followers have not yet replicated.

\`\`\`
Before failure:
  Leader:     [0][1][2][3][4][5][6]   LEO=6, HWM=4
  Follower 1: [0][1][2][3][4][5]      LEO=5
  Follower 2: [0][1][2][3][4]         LEO=4

Leader crashes! Follower 1 becomes new leader.

New leader (F1): [0][1][2][3][4][5]   LEO=5
  - Entry 5 was on F1 but NOT on F2
  - Entry 6 was ONLY on old leader → LOST

New HWM:
  min(LEO of ISRs) = min(5, 4) = 4
  Consumer still sees messages 0-4 (no change!)

After F2 catches up:
  New Leader:  [0][1][2][3][4][5]     LEO=5
  Follower 2:  [0][1][2][3][4][5]     LEO=5
  HWM = min(5, 5) = 5
  Consumer can now read message 5
\`\`\`

**Key insight**: Only committed messages (at or before HWM) are guaranteed to survive failover. This is why \`acks=all\` is important for critical data — it guarantees the message is committed before the producer receives acknowledgment.

**Truncation**: When the old leader comes back, it must truncate its log to the HWM and replicate from the new leader:
\`\`\`
  Old leader recovers: [0][1][2][3][4][5][6]
  Discovers new leader with HWM=5
  Truncates entry 6 (never committed)
  Fetches from new leader to catch up
\`\`\`

**Data loss guarantee**: With \`acks=all\` and \`min.insync.replicas=2\`, a message is only acknowledged after it appears on at least 2 replicas. Even if one dies, the other has it.`
      },
      {
        question: 'How does Raft use the commit index as a high-water mark?',
        answer: `**Raft's commit index** is the leader's high-water mark for the replicated log.

\`\`\`
Leader (term=3):
  Log: [1:SET x=1][2:SET y=2][3:SET z=3][4:SET w=4]
                                   ▲          ▲
                              commitIndex    lastLogIndex

  Entry 3: Replicated to majority (2 of 3) → COMMITTED
  Entry 4: Only on leader so far → UNCOMMITTED

Followers:
  F1: [1:SET x=1][2:SET y=2][3:SET z=3]
  F2: [1:SET x=1][2:SET y=2]

Leader calculates commitIndex:
  matchIndex = {leader:4, F1:3, F2:2}
  Sort: [2, 3, 4]
  Median (majority position): 3
  commitIndex = 3 (if entry 3's term == current term)
\`\`\`

**State machine application**:
\`\`\`
  Only entries at or before commitIndex are applied
  to the state machine (the actual database/KV store)

  Applied:     [1:SET x=1][2:SET y=2][3:SET z=3]
  Not applied: [4:SET w=4]

  Client reads see x=1, y=2, z=3
  Client does NOT see w=4 until it's committed
\`\`\`

**Safety property**: Once committed, an entry will be in every future leader's log. Raft guarantees this through its election restriction: a candidate cannot win an election unless its log is at least as up-to-date as the majority.

**Difference from Kafka**: Raft's commit index is strictly consensus-based (majority rule). Kafka's HWM depends on the ISR set (which can shrink). Raft never shrinks the quorum requirement.`
      },
      {
        question: 'How do consumers track their position relative to the high-water mark?',
        answer: `**Kafka consumer offsets**:
\`\`\`
  Partition log:
  [msg0][msg1][msg2][msg3][msg4][msg5][msg6][msg7]
     ▲                        ▲                 ▲
  Consumer                   HWM              LEO
  committed offset        (visible limit)   (latest on leader)

  Consumer group "my-app":
    Last committed offset: 0
    Currently processing: msg1
    Can read up to: msg4 (HWM)
    Cannot see: msg5-7 (past HWM)
\`\`\`

**Offset tracking**:
\`\`\`
  __consumer_offsets topic (internal Kafka topic):
    key:   {group_id, topic, partition}
    value: {offset, metadata, timestamp}

  Consumer periodically commits: "I've processed up to offset 3"
  On restart/rebalance: fetch last committed offset → resume from 3
\`\`\`

**Lag monitoring**:
\`\`\`
  Consumer lag = HWM - consumer_committed_offset

  HWM = 4, committed_offset = 1
  Lag = 3 messages

  Alert if lag exceeds threshold
  (consumer is falling behind)
\`\`\`

**End-to-end flow**:
1. Producer writes message → appended at LEO
2. Followers replicate → HWM advances
3. Consumer fetches → only sees up to HWM
4. Consumer processes and commits offset
5. Consumer restarts → resumes from committed offset

**Read-your-writes**: A producer with \`acks=all\` gets ACK after HWM advances. But a consumer in a different process may not have fetched the new HWM yet. For read-your-writes semantics, use the producer's returned offset to wait until the consumer reaches it.`
      },
      {
        question: 'What is the difference between Kafka ISR-based HWM and Raft majority-based commit index?',
        answer: `**Kafka ISR (In-Sync Replica) model**:
\`\`\`
  3-broker partition: Leader, F1, F2

  ISR = set of replicas that are "caught up" with leader
  ISR can SHRINK if a follower falls behind
  ISR can GROW when a follower catches up

  HWM = min(LEO of all ISR members)

  If F2 falls behind: ISR = {Leader, F1}
  HWM = min(LEO_Leader, LEO_F1)  (F2 excluded!)
  Writes still succeed with acks=all (only ISR needs to ACK)

  min.insync.replicas = 2:
    If ISR drops to 1, writes are rejected
    Prevents writing data that only exists on one node
\`\`\`

**Raft majority-based model**:
\`\`\`
  3-node cluster: Leader, F1, F2
  Quorum = majority = 2

  commitIndex = entry replicated to 2 of 3 nodes
  Quorum is FIXED — cannot shrink

  If F2 is slow: Leader still needs F1 to ACK
  If F2 AND F1 are slow: Leader cannot commit at all
  No equivalent of "removing from ISR"

  F2 eventually catches up by receiving leader's log
  commitIndex only advances when matchIndex[majority] increases
\`\`\`

**Key behavioral differences**:
| Property | Kafka ISR | Raft Majority |
|----------|----------|---------------|
| Quorum size | Dynamic (ISR can shrink) | Fixed (always N/2+1) |
| Availability | Higher (ISR can be just leader) | Lower (needs majority) |
| Safety | Depends on min.insync.replicas | Always majority |
| Slow follower | Removed from ISR, no impact | Blocks commit until caught up |
| Configuration | acks, min.insync.replicas | Fixed by protocol |

**Kafka's ISR trade-off**:
\`\`\`
  If min.insync.replicas=1 (unsafe!):
    ISR can shrink to just the leader
    HWM advances with leader's LEO alone
    Leader crash = DATA LOSS (no other copy)

  If min.insync.replicas=2 (recommended):
    ISR must have at least 2 members for writes
    HWM only advances when 2+ replicas have the data
    Leader crash → at least one follower has the data ✓
\`\`\`

**Interview insight**: Kafka's ISR model is more flexible (higher availability) but requires careful configuration. Raft's fixed majority is simpler and inherently safe but less forgiving of slow followers. Most production Kafka deployments use \`acks=all\` + \`min.insync.replicas=2\` + RF=3, which approximates Raft's majority guarantee.`
      },
      {
        question: 'What is the low-water mark and how does it relate to the high-water mark?',
        answer: `**High-water mark (HWM)**: The newest committed entry — the upper boundary of safe data. Everything at or below HWM is committed and durable.

**Low-water mark (LWM)**: The oldest entry that must be retained — the lower boundary of the log. Everything below LWM can be safely deleted or has already been checkpointed/snapshotted.

\`\`\`
  Log:
  [deleted][deleted][E100][E101][E102]...[E500][E501][E502]
                      ▲                    ▲            ▲
                     LWM                  HWM          LEO
                   (oldest               (latest      (latest
                    retained)           committed)    written)

  Invariant: LWM <= HWM <= LEO

  Below LWM: Already in snapshot/checkpoint, safe to delete
  LWM to HWM: Committed but may be needed for slow consumers
  HWM to LEO: Uncommitted, may be lost on failover
\`\`\`

**How LWM is determined in different systems**:

\`\`\`
  Kafka:
    LWM determined by retention policy:
      retention.ms = 7 days → LWM = oldest offset within 7 days
      Or: log.retention.bytes = 100GB → LWM = oldest within 100GB
    Also bounded by: min(consumer_committed_offsets)
    Segments below LWM are deleted or eligible for compaction

  etcd/Raft:
    LWM = snapshot index
    After taking a snapshot at entry 10000:
      LWM = 10000, entries 1-9999 can be deleted
      Recovery: load snapshot + replay entries 10000+

  PostgreSQL WAL:
    LWM = last checkpoint LSN
    WAL segments before checkpoint can be archived and deleted
    PITR: restore from base backup + replay WAL from LWM
\`\`\`

**The relationship to garbage collection**:
\`\`\`
  LWM enables garbage collection of the log:
    1. Take snapshot/checkpoint (captures state at position X)
    2. Advance LWM to X
    3. Delete/archive log entries before X
    4. Result: bounded log size + recoverable state

  Without LWM management:
    Log grows forever → disk exhaustion
    Recovery requires replaying entire history → slow startup

  With LWM management:
    Log stays bounded (LWM to LEO)
    Recovery: load snapshot + replay (LWM to LEO) → fast startup
\`\`\`

**Interview takeaway**: Always mention both marks when discussing replicated logs. The HWM controls what is safe to read, while the LWM controls what is safe to delete. Together they define the "active window" of the log.`
      },
      {
        question: 'How do leader epoch numbers improve upon the basic high-water mark for log truncation?',
        answer: `**The problem with HWM-only truncation (Kafka pre-KIP-101)**:

\`\`\`
  Setup: Leader (L), Follower (F), RF=2, min.insync=1

  Step 1: Producer writes msg at offset 1, acks=1
    L: [msg0][msg1]  LEO=2, HWM=1 (only L has msg1)
    F: [msg0]         LEO=1, HWM=1

  Step 2: F fetches msg1 from L
    L: [msg0][msg1]  LEO=2, HWM=2
    F: [msg0][msg1]  LEO=2, HWM=1 (hasn't learned new HWM yet)

  Step 3: F crashes, L advances HWM to 2

  Step 4: F restarts, truncates to its last known HWM=1
    F: [msg0]  (TRUNCATED msg1!)
    L: [msg0][msg1]  HWM=2

  Step 5: L crashes, F becomes leader
    F (new leader): [msg0]  — msg1 is LOST despite being committed!
\`\`\`

**Leader epoch solution (KIP-101)**:
\`\`\`
  Each leader has an epoch number (incremented on each election)
  Leader epoch = (epoch, start_offset) pair

  Step 1: L (epoch=0) writes msg1
    L: [msg0:e0][msg1:e0]  LEO=2

  Step 2: F fetches msg1
    F: [msg0:e0][msg1:e0]  LEO=2

  Step 3: F crashes and restarts
    F asks L: "What is the end offset for epoch 0?"
    L responds: "Epoch 0 ends at offset 2"
    F's LEO for epoch 0 = 2 → no truncation needed!
    F keeps msg1 ✓

  Step 4: If L had been elected as new leader (epoch=1) before
  F's recovery:
    F asks new L: "What is end offset for epoch 0?"
    New L responds: "Epoch 0 ended at offset 1"
    F truncates to offset 1 (correct — the new leader
    didn't have msg1 in its winning epoch)
\`\`\`

**Key insight**: Instead of truncating based on a potentially stale HWM, the follower asks the current leader "what was the last offset for my last known epoch?" This gives an accurate truncation point because:
1. The leader knows exactly which entries belong to which epoch
2. The epoch boundary reflects actual leadership changes
3. No stale HWM can cause incorrect truncation

**Raft has this built-in**: Raft's log matching property ensures that if two logs contain an entry with the same index and term (epoch), all preceding entries are identical. This is why Raft does not need a separate HWM-based truncation mechanism — the term number IS the epoch.

**Kafka's ISR model needed this fix** because the HWM propagation is asynchronous, creating a window where followers have stale HWM values. Leader epochs close this window.`
      },
      {
        question: 'How does the high-water mark pattern apply to database replication beyond Kafka and Raft?',
        answer: `**The HWM concept appears in many forms across distributed systems**:

**PostgreSQL streaming replication**:
\`\`\`
  Primary:  WAL position = 0/16B3A820
  Sync standby: Flushed up to 0/16B3A820  ← HWM for sync commits
  Async standby: Flushed up to 0/16B3A710  ← behind HWM

  synchronous_commit = on:
    Primary waits until sync standby reaches WAL position
    HWM = sync standby's flushed position
    Client sees ACK only after HWM advances past their commit

  Monitoring:
    pg_stat_replication shows replay_lsn per standby
    Lag = primary's WAL position - standby's replay position
\`\`\`

**MongoDB replica sets**:
\`\`\`
  Oplog: Ordered sequence of operations
  Primary: latest oplog entry = ts:100
  Secondary 1: applied up to ts:98
  Secondary 2: applied up to ts:95

  writeConcern: {w: "majority"}
    Primary waits until majority (2 of 3) applied the entry
    HWM = min(ts applied by majority) = ts:98
    Read from secondary with readConcern: "majority"
    only returns data at or before HWM

  readConcern: "linearizable":
    Confirms no leader change has occurred since the write
    Strongest guarantee, highest latency
\`\`\`

**CockroachDB (Raft per range)**:
\`\`\`
  Each range (partition) has its own Raft group
  Each Raft group has its own commit index (HWM)

  Range 1: commit index = 5000 (applied entries 1-5000)
  Range 2: commit index = 3200 (applied entries 1-3200)

  Cross-range transactions:
    Transaction spans Range 1 and Range 2
    Both ranges must commit their Raft entries
    2-phase commit coordinates the commit across ranges
    HWM for the transaction = both ranges committed
\`\`\`

**Cloud-native systems**:
\`\`\`
  Amazon Aurora:
    Volume epoch + protection group commits
    HWM = 4 of 6 storage nodes acknowledged
    Read replicas see data up to the HWM

  Google Spanner:
    Paxos per split (similar to Raft per range)
    Commit timestamp based on TrueTime
    HWM = Paxos majority + TrueTime commit wait
\`\`\`

**Universal principle**: Regardless of the specific technology, the high-water mark is the answer to: "What is the latest point in the log that I can guarantee will survive the loss of any single node?" Every replicated system must answer this question, and the HWM is the abstraction that does it.`
      },
    ],

    dataModel: {
      description: 'High-water mark tracking across leader and followers',
      schema: `Leader State:
  log:              ordered list of entries
  LEO:              log end offset (next write position)
  HWM:              high-water mark (last committed offset)
  follower_LEOs:    { follower_id → LEO } per follower

HWM Calculation:
  HWM = min(LEO of all in-sync replicas)
  Alternatively (Raft): median of matchIndex array

Follower State:
  log:              replicated entries from leader
  LEO:              last replicated offset
  HWM:              received from leader (may lag)

Consumer State:
  committed_offset: last acknowledged position
  fetch_offset:     next offset to fetch (capped at HWM)
  lag:              HWM - committed_offset

Invariants:
  committed_offset <= fetch_offset <= HWM <= LEO
  Entries at or before HWM survive leader failure
  Entries after HWM may be lost on failover`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 10. Phi-Accrual Failure Detection (availability)
  // ─────────────────────────────────────────────────────────
  {
    id: 'phi-accrual-failure-detection',
    title: 'Phi-Accrual Failure Detection',
    icon: 'activity',
    color: '#10b981',
    questions: 8,
    description: 'An adaptive failure detector that outputs a continuous suspicion level (phi) instead of a binary alive/dead decision, automatically adjusting to network conditions and heartbeat patterns.',
    concepts: [
      'Suspicion level (phi value)',
      'Heartbeat inter-arrival time sampling',
      'Normal distribution assumption',
      'Adaptive threshold vs fixed timeout',
      'False positive rate control',
      'Accrual vs binary detectors',
    ],
    tips: [
      'The phi value represents the negative log of the probability that the node is alive — higher phi means more suspicious',
      'Cassandra uses phi-accrual with a default threshold of 8 (corresponding to roughly 1 in 10^8 false positive rate)',
      'The key advantage: it adapts to varying network latency automatically, unlike fixed timeouts',
      'In interviews, contrast with fixed-timeout detectors: phi-accrual works correctly across LAN (1ms) and WAN (100ms) without retuning',
      'Know the math: phi = -log10(P(heartbeat_not_yet_arrived | past_observations))',
    ],

    introduction: `The **Phi-Accrual Failure Detector** replaces the traditional binary "alive or dead" failure detection with a continuous **suspicion level**. Instead of declaring a node dead after a fixed timeout (e.g., "no heartbeat for 10 seconds"), the phi-accrual detector maintains a statistical model of heartbeat arrival times and computes a value phi that represents how suspicious the silence is, given the historical pattern. This algorithm was introduced by Naohiro Hayashibara et al. in 2004 and has since become the standard for adaptive failure detection in production distributed systems.

A phi value of 1 means there is approximately a 10% chance the node is still alive (the delay is unusual but not extreme). A phi of 5 means about a 0.001% chance. A phi of 8 means the probability is roughly 1 in 100 million. The application chooses a threshold: "mark the node as down when phi exceeds 8." This threshold translates directly to a **false positive rate** — how often you wrongly declare a healthy node as dead. The beauty of this approach is that a single threshold value works across vastly different network conditions.

The critical advantage is **adaptiveness**. A fixed 10-second timeout works on a local network where heartbeats arrive every second, but on a congested WAN where heartbeats normally take 500ms-3s, the same timeout triggers constant false alarms. The phi-accrual detector learns the heartbeat distribution and adjusts automatically. **Apache Cassandra** uses phi-accrual with a default \`phi_convict_threshold\` of 8. **Akka** (the actor framework used by Lightbend/Play) uses it for cluster membership. The algorithm is also referenced in the original Dynamo paper and used in various service mesh implementations.

**When to use phi-accrual**: Distributed clusters where nodes communicate via heartbeats and network conditions vary (mixed LAN/WAN, cloud environments with variable latency, cross-datacenter communication). **When NOT to use**: Extremely small clusters (2-3 nodes) where a simple fixed timeout is sufficient and easy to tune, or systems where deterministic detection time is required (phi-accrual's adaptive nature means detection time varies with network conditions).`,

    keyQuestions: [
      {
        question: 'How does the phi-accrual failure detector compute the suspicion level?',
        answer: `**Step-by-step computation**:

\`\`\`
1. Collect heartbeat inter-arrival times:
   samples = [998ms, 1002ms, 1050ms, 990ms, 1100ms, ...]

2. Compute statistics:
   mean (μ) = 1028ms
   stddev (σ) = 42ms

3. When checking "is node alive?":
   time_since_last_heartbeat = now - last_heartbeat_time
   e.g., time_since_last = 1200ms

4. Compute phi:
   P(next_heartbeat > time_since_last | μ, σ)
   = P(X > 1200 | μ=1028, σ=42)
   = 1 - CDF_normal(1200, 1028, 42)
   = 1 - Φ((1200-1028)/42)
   = 1 - Φ(4.095)
   ≈ 0.0000212

   phi = -log10(0.0000212) ≈ 4.67
\`\`\`

**Interpretation**:
\`\`\`
  phi    P(alive)    Interpretation
  ─────────────────────────────────
  0.5    ~31%        Normal delay
  1.0    ~10%        Slightly late
  2.0    ~1%         Unusually late
  3.0    ~0.1%       Very late
  5.0    ~0.001%     Almost certainly down
  8.0    ~10^-8      Down (Cassandra default threshold)
\`\`\`

**Window management**: The detector maintains a sliding window of recent inter-arrival times (e.g., last 1000 samples) so it adapts to changing network conditions. If the network gets slower, the mean increases and the detector becomes more tolerant.`
      },
      {
        question: 'Why is phi-accrual better than a fixed timeout for failure detection?',
        answer: `**Fixed timeout problems**:
\`\`\`
Scenario 1: LAN (heartbeats every ~1ms)
  Timeout = 10s → takes 10 seconds to detect failure
  → Too slow! Could detect in < 100ms

Scenario 2: Cross-datacenter (heartbeats every ~500ms, jittery)
  Timeout = 10s → heartbeat sometimes arrives at 3s during congestion
  → Too aggressive! False positives during network spikes

Scenario 3: Mixed environment
  Some nodes LAN, some WAN
  No single timeout works for all
\`\`\`

**Phi-accrual adapts to each node**:
\`\`\`
Node A (LAN): μ=2ms, σ=0.5ms
  10ms without heartbeat → phi=12 → DEAD (detected in 10ms!)

Node B (WAN): μ=500ms, σ=200ms
  3000ms without heartbeat → phi=3.5 → still alive
  5000ms without heartbeat → phi=8.0 → DEAD

Node C (variable): μ changes from 10ms to 200ms
  Detector adapts window → new μ=200ms
  No false positives during the transition
\`\`\`

**Comparison table**:
| Property | Fixed Timeout | Phi-Accrual |
|----------|--------------|-------------|
| Configuration | Timeout value per environment | Single phi threshold |
| Adaptiveness | None | Automatic |
| False positive rate | Varies with network | Controlled by threshold |
| Detection speed | Fixed (always waits full timeout) | Proportional to actual latency |
| Cross-DC support | Needs per-DC tuning | Works automatically |
| Complexity | Simple | Moderate (statistics) |

**In practice**: Cassandra uses phi_convict_threshold=8 globally. It works correctly for both intra-DC (microseconds) and cross-DC (hundreds of ms) heartbeats without any per-node tuning.`
      },
      {
        question: 'How does Cassandra integrate phi-accrual with gossip for failure detection?',
        answer: `**Integration architecture**:

\`\`\`
┌──────────────────────────────────────────────┐
│                 Gossip Layer                  │
│                                              │
│  Every 1s: pick random peer, exchange state  │
│  State includes: heartbeat generation,       │
│    heartbeat version (incremented each tick) │
│                                              │
│  Gossip message received from Node B:        │
│    → update B's heartbeat timestamp          │
│    → feed inter-arrival time to phi detector │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│          Phi-Accrual Failure Detector        │
│                                              │
│  Per-node tracking:                          │
│    Node B: samples=[980,1020,1050,990,...]   │
│            μ=1010ms, σ=28ms                  │
│            last_heartbeat=now-1500ms          │
│            phi=2.1 → ALIVE                   │
│                                              │
│    Node C: samples=[1000,5000,1200,...]      │
│            μ=1200ms, σ=400ms                 │
│            last_heartbeat=now-15000ms         │
│            phi=9.2 → CONVICTED (>8) → DOWN   │
│                                              │
└──────────────┬───────────────────────────────┘
               │ phi > threshold
               ▼
┌──────────────────────────────────────────────┐
│            Node State Change                 │
│                                              │
│  Mark Node C as DOWN in local state          │
│  Gossip the DOWN status to other nodes       │
│  Routing layer stops sending requests to C   │
│  If C was a replica → hinted handoff starts  │
└──────────────────────────────────────────────┘
\`\`\`

**Configuration knobs**:
- \`phi_convict_threshold\`: Default 8 (increase to 12 for cross-DC with unstable links)
- Gossip interval: 1 second (fixed)
- Sample window: Last 1000 heartbeat arrival times

**Caveat**: The detector runs independently on each node, so two nodes may disagree briefly about whether a third is alive. This is acceptable — Cassandra's read/write paths use consistency levels, not the gossip state, for correctness.`
      },
      {
        question: 'What are the limitations and edge cases of phi-accrual detection?',
        answer: `**Limitation 1: Normal distribution assumption**:
\`\`\`
  Phi-accrual assumes heartbeat inter-arrival times follow
  a normal (Gaussian) distribution.

  In practice: network jitter can be bimodal
  (fast LAN + occasional slow GC pause)

  Solution: Use exponential distribution or keep a larger
  sample window that captures both modes.
  Cassandra uses an exponential approximation for robustness.
\`\`\`

**Limitation 2: Cold start**:
\`\`\`
  New node joins → no heartbeat history
  Cannot compute meaningful phi

  Solution: Use a bootstrap period with conservative
  fixed timeout until enough samples are collected
  (typically 50-100 samples)
\`\`\`

**Limitation 3: Correlated failures**:
\`\`\`
  Network switch failure → ALL heartbeats stop simultaneously
  Phi increases for ALL remote nodes at once
  System marks entire remote DC as down

  Solution: Detect correlated failures separately
  "If >50% of nodes in a DC appear down, suspect
  network issue, not mass node failure"
\`\`\`

**Limitation 4: Asymmetric network issues**:
\`\`\`
  Node A can reach B but B cannot reach A
  A thinks B is alive (receiving heartbeats)
  B thinks A is dead (no heartbeats from A)

  Solution: Not solved by phi-accrual alone.
  Requires bidirectional health checking or
  gossip protocol (A's liveness propagated via C)
\`\`\`

**Edge case: GC pauses**:
\`\`\`
  Java GC pause of 10 seconds on Node B
  During pause: no heartbeats sent
  Other nodes: phi exceeds threshold → B marked DOWN
  After pause: B resumes, sends heartbeats → marked UP again

  This is actually CORRECT behavior — during the pause
  the node truly was non-responsive. The detector should
  flag it. The question is how quickly it recovers.
\`\`\``
      },
      {
        question: 'How do you tune the phi_convict_threshold for different environments?',
        answer: `**The threshold directly controls the false positive rate**:

\`\`\`
  phi_convict_threshold → approximate false positive probability:
    phi = 1  → P(false positive) ≈ 10%      (too aggressive)
    phi = 3  → P(false positive) ≈ 0.1%     (aggressive)
    phi = 5  → P(false positive) ≈ 0.001%   (moderate)
    phi = 8  → P(false positive) ≈ 10^-8    (conservative, Cassandra default)
    phi = 12 → P(false positive) ≈ 10^-12   (very conservative)
\`\`\`

**Environment-specific recommendations**:
\`\`\`
  Single datacenter (low-latency LAN):
    phi = 8 (default)
    Heartbeat inter-arrival: ~1000ms ± 50ms
    Detection time: ~2-3 seconds after actual failure
    False positives: Essentially never

  Cross-datacenter (high-latency WAN):
    phi = 12
    Heartbeat inter-arrival: ~1000ms ± 300ms (jittery)
    Detection time: ~5-10 seconds after actual failure
    Why higher: WAN jitter causes wide variance,
    phi=8 would trigger false positives during spikes

  Cloud environment (variable latency):
    phi = 10
    Heartbeat inter-arrival: ~1000ms ± 150ms
    Cloud networks have occasional latency spikes
    (noisy neighbors, cross-AZ traffic, GC pauses)
    phi=10 provides buffer without being too slow

  Development/testing:
    phi = 5-6
    Faster detection for quick iteration
    False positives acceptable in non-production
\`\`\`

**How to measure if your threshold is correct**:
\`\`\`
  Monitor:
    1. False positive rate: How often a healthy node is marked DOWN
       Target: < 1 per month per node in production
    2. Detection time: Time from actual failure to DOWN marking
       Target: < 10 seconds for most environments
    3. Recovery time: Time from node recovery to UP marking
       Target: < 5 seconds (first heartbeat resets phi)

  If false positives are too frequent: increase threshold
  If detection is too slow: decrease threshold
  If both are bad: check if the network is fundamentally unstable
\`\`\`

**Cassandra-specific tuning**: Edit \`phi_convict_threshold\` in cassandra.yaml. Changes take effect on restart. Monitor via JMX: \`org.apache.cassandra.net:type=FailureDetector\` exposes per-node phi values in real-time.`
      },
      {
        question: 'How does phi-accrual compare with other failure detection approaches used in production?',
        answer: `**1. Fixed timeout (simplest)**:
\`\`\`
  If no heartbeat for T seconds → node is dead

  Used by: Simple health checks, HTTP load balancers, Kubernetes liveness probes
  Pros: Dead simple, deterministic detection time
  Cons: Cannot adapt to varying latency, requires per-environment tuning
  Example: Kubernetes livenessProbe with failureThreshold=3, periodSeconds=10
           → Detection time: exactly 30 seconds (deterministic)
\`\`\`

**2. SWIM protocol (used by Consul/Serf)**:
\`\`\`
  Direct probe → indirect probe → suspect → dead

  1. Ping random target B
  2. No response → ask k random nodes to ping B
  3. If no indirect ACK → mark B as suspect
  4. B can refute suspicion within timeout
  5. If not refuted → B is dead

  Used by: Consul, Serf, Memberlist (Go library)
  Pros: O(1) per-node overhead, decentralized
  Cons: Fixed timeouts per phase, not adaptive to latency
\`\`\`

**3. Phi-accrual (used by Cassandra/Akka)**:
\`\`\`
  Continuous suspicion level based on heartbeat statistics

  Used by: Cassandra, Akka, various custom implementations
  Pros: Adaptive to network conditions, single threshold works everywhere
  Cons: Moderate complexity, normal distribution assumption
\`\`\`

**4. Heartbeat with lease (used by ZooKeeper/Chubby)**:
\`\`\`
  Client maintains session with server via periodic heartbeats
  Session has a timeout (lease duration)
  If server receives no heartbeat within timeout → session expires
  Client-side: if client cannot heartbeat within timeout → session lost

  Used by: ZooKeeper (session timeout), Chubby (lock service)
  Pros: Precise session semantics, supports ephemeral nodes
  Cons: Requires coordinated timeout agreement between client and server
\`\`\`

**Comparison table**:
| Property | Fixed Timeout | SWIM | Phi-Accrual | Session/Lease |
|----------|-------------|------|-------------|---------------|
| Adaptiveness | None | Limited | Full | None |
| Complexity | Low | Moderate | Moderate | Moderate |
| Detection time | Fixed | ~3 probe periods | Variable (adaptive) | Session timeout |
| False positive control | Manual tuning | Indirect probe helps | Statistical guarantee | Deterministic |
| Decentralized | No | Yes | Per-node | Server-based |
| Best for | Simple systems | Large P2P clusters | Heterogeneous networks | Coordination services |

**Key interview point**: These approaches are not mutually exclusive. Cassandra combines gossip (for dissemination) with phi-accrual (for detection). Consul combines SWIM (for membership) with gossip (for state propagation). Choose based on your network heterogeneity and accuracy requirements.`
      },
      {
        question: 'How do you implement phi-accrual failure detection from scratch?',
        answer: `**Core algorithm in pseudocode**:

\`\`\`
class PhiAccrualDetector:
  window_size = 1000     // sliding window of samples
  min_samples = 10       // minimum before meaningful phi
  threshold = 8.0        // phi threshold for conviction

  per-node state:
    arrival_times = []   // inter-arrival time samples
    last_heartbeat = now

  on_heartbeat(node_id):
    state = get_state(node_id)
    inter_arrival = now - state.last_heartbeat
    state.arrival_times.append(inter_arrival)
    if len(state.arrival_times) > window_size:
      state.arrival_times.pop(0)  // sliding window
    state.last_heartbeat = now

  compute_phi(node_id):
    state = get_state(node_id)
    if len(state.arrival_times) < min_samples:
      return 0.0  // not enough data, assume alive

    mean = average(state.arrival_times)
    variance = var(state.arrival_times)
    stddev = sqrt(variance)

    elapsed = now - state.last_heartbeat

    // P(next heartbeat takes longer than elapsed)
    // Using normal distribution CDF
    y = (elapsed - mean) / stddev
    p_alive = 1.0 - normal_cdf(y)

    if p_alive < 1e-15:
      return 15.0  // cap to avoid -log10(0)

    phi = -log10(p_alive)
    return phi

  is_alive(node_id):
    return compute_phi(node_id) < threshold
\`\`\`

**Normal CDF approximation** (no external library needed):
\`\`\`
  // Abramowitz and Stegun approximation
  function normal_cdf(x):
    if x < -8: return 0.0
    if x > 8: return 1.0

    t = 1.0 / (1.0 + 0.2316419 * abs(x))
    d = 0.3989422804 * exp(-x * x / 2)
    p = d * t * (0.3193815 + t * (-0.3565638 +
        t * (1.781478 + t * (-1.821256 + t * 1.330274))))

    return x > 0 ? 1.0 - p : p
\`\`\`

**Practical implementation considerations**:
\`\`\`
  1. Bootstrap period:
     Use fixed timeout for first min_samples heartbeats
     Switch to phi-accrual once enough samples collected

  2. Exponential distribution alternative:
     Cassandra uses exponential distribution instead of normal
     Exponential is simpler and more robust for skewed distributions
     phi = elapsed / mean (when using exponential)

  3. Outlier handling:
     Large GC pauses create extreme inter-arrival samples
     Option A: Cap samples at 99th percentile
     Option B: Use median instead of mean (robust to outliers)

  4. Thread safety:
     Multiple gossip threads may call on_heartbeat concurrently
     Use atomic operations or per-node locks for state updates
\`\`\`

**Testing strategy**: Simulate network conditions by injecting artificial delays into heartbeat delivery. Verify that phi stays below threshold during normal operation, exceeds threshold within target detection time during simulated failures, and recovers quickly when heartbeats resume.`
      },
      {
        question: 'What role does phi-accrual play in the broader context of fault-tolerant system design?',
        answer: `**Failure detection is the foundation of fault tolerance**. You cannot recover from a failure you have not detected. Phi-accrual sits at the bottom of the fault-tolerance stack:

\`\`\`
  Level 5: Application recovery (retry, failover, circuit breaker)
  Level 4: Consensus/leadership (Raft election, Kafka ISR)
  Level 3: Membership management (gossip state propagation)
  Level 2: FAILURE DETECTION (phi-accrual, SWIM, heartbeats)
  Level 1: Network communication (TCP, UDP, heartbeat messages)
\`\`\`

**How phi-accrual feeds into higher-level decisions**:
\`\`\`
  Cassandra example:
    phi-accrual detects Node C is down (phi > 8)
      │
      ├──► Gossip propagates DOWN status to all nodes
      │
      ├──► Coordinator stops routing reads/writes to C
      │
      ├──► Hinted handoff begins for writes destined for C
      │
      ├──► Read repair skips C during consistency checks
      │
      └──► Operators alerted (monitoring integration)

  Akka Cluster example:
    phi-accrual detects member unreachable
      │
      ├──► Cluster singleton relocates to reachable node
      │
      ├──► Sharded entities on unreachable node rebalanced
      │
      └──► After confirmation timeout: member downed
           (shard regions cleaned up)
\`\`\`

**The quality of failure detection affects everything above it**:
\`\`\`
  Too aggressive (low threshold):
    Healthy nodes marked as dead
    → Unnecessary failovers and rebalancing
    → Load on remaining nodes increases
    → Can cascade into more false positives ("flapping")

  Too conservative (high threshold):
    Dead nodes not detected for minutes
    → Requests to dead node time out
    → Users experience errors
    → Recovery delayed

  Phi-accrual at the right threshold:
    Fast detection of real failures (~seconds)
    Negligible false positives (~never)
    Automatic adaptation to network changes
    → Stable, responsive fault tolerance
\`\`\`

**Design principle**: Failure detection accuracy is a multiplier for system reliability. Investing in a good detector (like phi-accrual) pays dividends across the entire system. A poor detector (fixed timeout, manually tuned) creates ongoing operational burden and reliability risk.

**Comparison with circuit breakers**: Circuit breakers detect failures at the request level (failed HTTP calls). Phi-accrual detects failures at the node level (missing heartbeats). They operate at different granularities and complement each other — a node can be alive (phi-accrual says UP) but its service can be failing (circuit breaker says OPEN).`
      },
    ],

    dataModel: {
      description: 'Phi-accrual detector state and computation',
      schema: `Per-Node Detector State:
  target_node:        node being monitored
  arrival_window:     sliding window of heartbeat inter-arrival times
  window_size:        max samples to keep (e.g., 1000)
  mean:               running mean of inter-arrival times
  variance:           running variance
  last_heartbeat_ts:  timestamp of most recent heartbeat

Phi Computation:
  time_elapsed = now - last_heartbeat_ts
  p_alive = 1 - CDF(time_elapsed, mean, sqrt(variance))
  phi = -log10(p_alive)

Decision:
  if phi > phi_convict_threshold:
    mark node as DOWN
  else:
    node is considered ALIVE

Update on heartbeat:
  inter_arrival = now - last_heartbeat_ts
  arrival_window.append(inter_arrival)
  recalculate mean and variance
  last_heartbeat_ts = now`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 11. Outbox Pattern (data-integrity)
  // ─────────────────────────────────────────────────────────
  {
    id: 'outbox-pattern',
    title: 'Outbox Pattern',
    icon: 'inbox',
    color: '#8b5cf6',
    questions: 8,
    description: 'A reliable messaging pattern that solves the dual-write problem by writing business data and event records in the same database transaction, then asynchronously publishing events from the outbox table.',
    concepts: [
      'Dual-write problem',
      'Transactional outbox table',
      'Change Data Capture (CDC)',
      'Polling publisher vs log tailing',
      'At-least-once delivery',
      'Idempotent consumers',
      'Event ordering guarantees',
      'Debezium and Kafka Connect',
    ],
    tips: [
      'The outbox pattern is the standard answer to "how do you reliably publish events when updating a database"',
      'Always mention the dual-write problem first — writing to DB and message broker is NOT atomic',
      'CDC with Debezium is the production-grade approach — it reads the database WAL to detect outbox inserts',
      'Consumers must be idempotent because at-least-once delivery means duplicates are possible',
      'In interviews, compare with alternatives: saga pattern, listen-to-yourself, event sourcing',
    ],

    introduction: `The **Outbox Pattern** solves one of the most common reliability problems in microservice architectures: the **dual-write problem**. When a service needs to update its database AND publish an event to a message broker, these two operations cannot be made atomic with a simple approach. If the database write succeeds but the event publish fails (or vice versa), the system ends up in an inconsistent state. This problem is so fundamental that nearly every team building event-driven microservices encounters it.

The solution is elegant: instead of writing directly to the message broker, the service writes the event to an **outbox table** in the same database, within the same transaction as the business data change. A separate process then reads the outbox table and publishes the events to the message broker. Because the business data and the outbox entry are written in a single ACID transaction, they are guaranteed to be consistent — either both succeed or both fail. This is a textbook application of the "single source of truth" principle.

Two approaches exist for reading the outbox: **polling** (periodically query the outbox table for unpublished events) and **Change Data Capture** (CDC) with tools like **Debezium**, which tails the database's WAL and emits events for every outbox insert. CDC is the preferred production approach because it has lower latency (milliseconds vs seconds), does not require polling, and naturally preserves event ordering (WAL order = commit order). **Debezium** supports PostgreSQL (logical replication), MySQL (binlog), MongoDB (change streams), and SQL Server (CT). Companies like **Confluent**, **Wix**, **Zalando**, and **Airbnb** use the outbox pattern with Debezium as their standard event-driven integration architecture.

**When to use the outbox pattern**: Any microservice that needs to reliably publish events when its database state changes — order creation, payment processing, user registration, inventory updates. **When NOT to use**: If your system already uses event sourcing (the event store IS the source of truth, no dual-write problem exists), or if your workload is purely read-only with no state changes to propagate, or if the operational complexity of CDC infrastructure (Debezium, Kafka Connect) is not justified by your scale.`,

    keyQuestions: [
      {
        question: 'What is the dual-write problem and why is it dangerous?',
        answer: `**The problem**: A service must update its database AND notify other services (via message broker). These are two separate systems — no shared transaction.

\`\`\`
Naive approach (BROKEN):

  Order Service:
    1. INSERT INTO orders (...) → SUCCESS ✓
    2. Publish "OrderCreated" to Kafka → FAILS ✗
                                          (broker down)

  Result: Order exists in DB but event never published
          → Inventory never updated
          → Payment never charged
          → Downstream services out of sync
\`\`\`

**Reverse order is also broken**:
\`\`\`
    1. Publish "OrderCreated" to Kafka → SUCCESS ✓
    2. INSERT INTO orders (...) → FAILS ✗
                                   (DB constraint violation)

  Result: Event published but order does not exist
          → Inventory decremented for phantom order
          → Payment charged with no order record
\`\`\`

**Why not distributed transactions (2PC)?**
- Most message brokers do not support XA/2PC
- 2PC has high latency and reduced availability
- If the coordinator crashes, participants are stuck
- Not practical for microservices at scale

**The outbox pattern eliminates this entirely**:
\`\`\`
  Single DB transaction:
    1. INSERT INTO orders (...)        → same transaction
    2. INSERT INTO outbox (event_data) → same transaction
    COMMIT

  Separate process (async):
    3. Read from outbox → publish to Kafka
    4. Mark outbox entry as published

  If step 3-4 fails → retry later (event is safely in DB)
\`\`\``
      },
      {
        question: 'How does the outbox pattern work with Change Data Capture?',
        answer: `**Architecture with Debezium CDC**:

\`\`\`
┌──────────────────────────────────────────────┐
│              Order Service                    │
│                                              │
│  BEGIN TRANSACTION                           │
│    INSERT INTO orders (id, user_id, total)   │
│    INSERT INTO outbox (                      │
│      aggregate_type='Order',                 │
│      aggregate_id='order-123',               │
│      event_type='OrderCreated',              │
│      payload='{"orderId":"123","total":99}'  │
│    )                                         │
│  COMMIT                                      │
└──────────────────┬───────────────────────────┘
                   │ (database WAL)
                   ▼
┌──────────────────────────────────────────────┐
│           Debezium CDC Connector             │
│                                              │
│  Tails PostgreSQL WAL (replication slot)     │
│  Detects INSERT into outbox table            │
│  Transforms to Kafka event                   │
│  Routes to topic: "orders.events"            │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│            Apache Kafka                      │
│                                              │
│  Topic: orders.events                        │
│    Partition 0: [OrderCreated:123]           │
└──────────────────┬───────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
  Inventory Service    Payment Service
  (consumes event)     (consumes event)
\`\`\`

**Why CDC is better than polling**:
| Property | Polling | CDC (Debezium) |
|----------|---------|----------------|
| Latency | Seconds (poll interval) | Milliseconds (real-time) |
| DB load | Repeated queries | Reads WAL (minimal load) |
| Missed events | Possible (if poll misses window) | Impossible (WAL is complete) |
| Ordering | Needs ORDER BY + careful logic | WAL order is exact commit order |
| Setup complexity | Simple | Moderate (connector config) |`
      },
      {
        question: 'How do you design the outbox table schema?',
        answer: `**Recommended schema**:

\`\`\`sql
CREATE TABLE outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(255) NOT NULL,  -- e.g., 'Order', 'User'
  aggregate_id   VARCHAR(255) NOT NULL,  -- e.g., 'order-123'
  event_type     VARCHAR(255) NOT NULL,  -- e.g., 'OrderCreated'
  payload        JSONB NOT NULL,         -- event data
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMP,             -- NULL until published
  trace_id       VARCHAR(255),          -- for distributed tracing
  version        INTEGER DEFAULT 1      -- schema version
);

CREATE INDEX idx_outbox_unpublished
  ON outbox (created_at)
  WHERE published_at IS NULL;
\`\`\`

**Routing with Debezium outbox SMT (Single Message Transform)**:
\`\`\`
  aggregate_type = 'Order' → Kafka topic: "Order.events"
  aggregate_id = 'order-123' → Kafka partition key (ordering)
  event_type = 'OrderCreated' → Event header
  payload → Kafka message value
\`\`\`

**Key design decisions**:

1. **Partition key = aggregate_id**: Events for the same order always go to the same Kafka partition → ordered per aggregate

2. **Cleanup strategy**: Delete outbox rows after publishing (or after a retention period). The outbox is a transit table, not permanent storage.

3. **Payload format**: Include all data the consumer needs. Do not reference the source table — consumers should not query your DB.

4. **Idempotency key**: The outbox \`id\` serves as a deduplication key. Consumers store processed IDs and skip duplicates.`
      },
      {
        question: 'How do consumers handle duplicate events with at-least-once delivery?',
        answer: `**Why duplicates happen**:
\`\`\`
  CDC publishes event to Kafka → SUCCESS
  CDC tries to record offset → CRASH before recording
  CDC restarts → re-reads same WAL position → re-publishes event

  Result: Same event published twice to Kafka
\`\`\`

**Idempotent consumer pattern**:
\`\`\`
Consumer (Inventory Service):

  1. Receive event: {id: "evt-123", type: "OrderCreated", ...}

  2. Check processed_events table:
     SELECT 1 FROM processed_events WHERE event_id = 'evt-123'
     → NOT FOUND (first time)

  3. Process within transaction:
     BEGIN
       UPDATE inventory SET quantity = quantity - 1 WHERE product_id = '...'
       INSERT INTO processed_events (event_id, processed_at) VALUES ('evt-123', NOW())
     COMMIT

  4. Receive same event again (duplicate):
     SELECT 1 FROM processed_events WHERE event_id = 'evt-123'
     → FOUND → SKIP (already processed)
\`\`\`

**Alternative: naturally idempotent operations**:
\`\`\`
  Idempotent: SET balance = 100       (same result if applied twice)
  NOT idempotent: SET balance = balance - 10  (different each time)

  Convert to idempotent:
    Event carries absolute state: {new_balance: 90, version: 5}
    Consumer: UPDATE account SET balance=90 WHERE version < 5
    Applied twice → second time version check prevents update
\`\`\`

**Kafka consumer offset management**:
\`\`\`
  Option A: Commit offset AFTER processing (at-least-once)
    Risk: Duplicate processing on crash, but no data loss
    Mitigation: Idempotent consumers

  Option B: Commit offset BEFORE processing (at-most-once)
    Risk: Data loss on crash (event skipped)
    Mitigation: Acceptable for non-critical events only

  Option C: Exactly-once (Kafka transactions)
    Process + commit offset in same Kafka transaction
    Limited to Kafka-to-Kafka flows
\`\`\``
      },
      {
        question: 'How does the outbox pattern compare with event sourcing and the listen-to-yourself pattern?',
        answer: `**Outbox Pattern**:
\`\`\`
  Service writes business data + outbox event in one transaction
  Separate process publishes outbox events to message broker

  Source of truth: Business data tables (traditional CRUD)
  Events: Derived from state changes, stored in outbox temporarily
  Complexity: Moderate (outbox table + CDC/polling)
\`\`\`

**Event Sourcing**:
\`\`\`
  Service writes events to an event store as the PRIMARY data
  Current state is derived by replaying events
  No separate outbox needed — the event store IS the event stream

  Source of truth: Event log
  Events: ARE the data (not derived from state changes)
  Complexity: High (event store, projections, snapshots)
\`\`\`

**Listen-to-Yourself (publish then subscribe)**:
\`\`\`
  Service publishes event to message broker FIRST
  Then consumes its own event to update its database

  1. Order Service → publish "CreateOrder" to Kafka
  2. Order Service consumes "CreateOrder" from Kafka
  3. Order Service INSERTs order into its DB

  Source of truth: Message broker (temporarily)
  Events: Published before state change
  Complexity: Low (no outbox table needed)
  Risk: If consumption fails, order exists in Kafka but not in DB
\`\`\`

**When to choose each**:
\`\`\`
  Outbox Pattern:
    ✓ Existing CRUD application with relational DB
    ✓ Need to add event-driven integration incrementally
    ✓ Team is familiar with traditional database patterns
    ✓ Events represent side effects, not the core model

  Event Sourcing:
    ✓ Audit trail is a hard requirement (every state change recorded)
    ✓ Complex domain with rich business events
    ✓ Need temporal queries ("what was the state at time T?")
    ✓ Team willing to invest in event store infrastructure

  Listen-to-Yourself:
    ✓ Simple services with low consistency requirements
    ✓ Acceptable to lose occasional events
    ✓ Do not want any database-side infrastructure
    ✗ NOT suitable for financial or critical operations
\`\`\`

**Key interview point**: The outbox pattern is the pragmatic middle ground — it works with existing databases, does not require rethinking the data model (unlike event sourcing), and provides stronger guarantees than listen-to-yourself. It is the most commonly recommended pattern for adding reliable event publishing to existing microservices.`
      },
      {
        question: 'What are the operational challenges of running Debezium CDC in production?',
        answer: `**Debezium architecture**:
\`\`\`
  PostgreSQL ──WAL──► Debezium Connector ──► Kafka
                      (runs in Kafka Connect)

  Debezium reads the database WAL via logical replication
  Each table change → Kafka message
  Outbox table changes → routed to application topics
\`\`\`

**Challenge 1: Replication slot management (PostgreSQL)**:
\`\`\`
  Debezium creates a replication slot on PostgreSQL
  If Debezium stops consuming, the slot retains WAL files
  WAL files accumulate → disk fills up → DATABASE CRASHES

  Mitigation:
    - Monitor replication slot lag: pg_replication_slots
    - Alert if confirmed_flush_lsn falls behind
    - Set max_slot_wal_keep_size (PG 13+) to cap retention
    - Ensure Debezium restarts quickly after failures
\`\`\`

**Challenge 2: Schema evolution**:
\`\`\`
  Adding a column to the outbox table changes the event structure
  Debezium detects the schema change via WAL
  Downstream consumers may not expect the new field

  Mitigation:
    - Use Avro + Schema Registry with compatibility checks
    - Or use JSON with additive-only schema changes
    - Always add new fields as optional (backward compatible)
    - Test schema changes in staging with consumer verification
\`\`\`

**Challenge 3: Connector restarts and exactly-once semantics**:
\`\`\`
  Debezium crashes → restarts → re-reads from last committed offset
  May re-publish events that were already published

  Debezium guarantees: AT-LEAST-ONCE delivery
  Does NOT guarantee: exactly-once

  Mitigation:
    - Consumers must be idempotent
    - Use outbox event ID as deduplication key
    - Processed events table on consumer side
\`\`\`

**Challenge 4: Performance and lag**:
\`\`\`
  High write throughput → large WAL volume → Debezium lag
  Debezium is single-threaded per connector by default

  Mitigation:
    - Use snapshot.mode=schema_only (skip initial data load)
    - Increase max.batch.size and poll.interval.ms
    - Split high-volume tables across multiple connectors
    - Monitor: Debezium metrics (MilliSecondsBehindSource)
\`\`\`

**Challenge 5: Outbox table cleanup**:
\`\`\`
  Outbox rows accumulate if not cleaned up
  Options:
    A: DELETE after Debezium publishes (add published_at column)
    B: Use table partitioning, drop old partitions
    C: Rely on Debezium's outbox SMT to auto-delete
    D: Periodic cleanup job: DELETE WHERE created_at < NOW() - 7 days
\`\`\`

**Operational checklist for production Debezium**:
- Monitor replication slot lag (critical)
- Monitor connector status (running, failed, paused)
- Set up dead letter queue for poison messages
- Test connector restart recovery procedures
- Document and test schema migration procedures`
      },
      {
        question: 'How do you handle outbox event ordering across multiple aggregates?',
        answer: `**Within a single aggregate (e.g., one order)**:
\`\`\`
  Ordering is guaranteed:
    1. INSERT order → INSERT outbox (OrderCreated)
    2. UPDATE order → INSERT outbox (OrderPaid)
    3. UPDATE order → INSERT outbox (OrderShipped)

    These are separate transactions, committed in order
    CDC reads WAL in commit order → events published in order
    Kafka partition key = aggregate_id → same partition → ordered

    Consumer sees: OrderCreated → OrderPaid → OrderShipped ✓
\`\`\`

**Across different aggregates (e.g., order + inventory)**:
\`\`\`
  Ordering is NOT guaranteed:
    Tx1: INSERT order + outbox(OrderCreated)  (commit at t=100)
    Tx2: UPDATE inventory + outbox(StockDecremented) (commit at t=101)

    Different aggregate_ids → different Kafka partitions
    Consumer A processes OrderCreated at t=200
    Consumer B processes StockDecremented at t=150

    Cross-aggregate ordering is inherently non-deterministic
\`\`\`

**Strategies for cross-aggregate consistency**:
\`\`\`
  Strategy 1: Saga pattern
    Each event triggers the next step
    OrderCreated → inventory service decrements stock
    StockDecremented → payment service charges card
    Order does not matter — each step is triggered by the previous

  Strategy 2: Process manager
    A coordinator consumes events from multiple aggregates
    Maintains state: "For order-123, I've seen OrderCreated
    and StockDecremented, now I can trigger PaymentCharge"
    Handles out-of-order arrival by buffering and correlating

  Strategy 3: Single aggregate boundary
    If ordering between operations matters, they belong
    in the SAME aggregate. Redesign your domain boundaries.
    Example: Order aggregate contains stock reservation,
    not a separate inventory aggregate.
\`\`\`

**Partition key design for ordering**:
\`\`\`
  aggregate_id as partition key:
    All events for order-123 → same partition → ordered
    Events for different orders → different partitions → unordered
    This is usually sufficient

  Caution with composite keys:
    If you key by customer_id instead of order_id,
    all of a customer's orders go to the same partition
    Ordering preserved across orders, but creates hot partitions
    for customers with many orders
\`\`\`

**Interview insight**: True cross-aggregate ordering is impossible in a partitioned system without sacrificing throughput. The correct design is to ensure that operations requiring ordering belong to the same aggregate, and use sagas or process managers for cross-aggregate coordination.`
      },
      {
        question: 'What is the polling publisher approach and when is it acceptable over CDC?',
        answer: `**Polling publisher** — the simpler alternative to CDC:

\`\`\`
  Polling Loop:
    WHILE true:
      SELECT * FROM outbox
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT 100;

      FOR each event:
        publish to Kafka
        UPDATE outbox SET published_at = NOW() WHERE id = event.id

      SLEEP 1 second (poll interval)
\`\`\`

**When polling is acceptable**:
\`\`\`
  1. Low event volume (< 100 events/second)
     Polling overhead is negligible at this scale
     No need for Debezium infrastructure

  2. Latency tolerance of seconds
     Poll interval = 1-5 seconds is acceptable
     CDC provides millisecond latency

  3. Simple deployment requirements
     No Kafka Connect cluster to manage
     No replication slot monitoring needed
     Just a background thread in the application

  4. Team lacks Debezium expertise
     Polling is trivially understandable
     CDC requires knowledge of WAL, replication, connectors
\`\`\`

**When polling is NOT acceptable**:
\`\`\`
  1. High event volume (> 1000 events/second)
     Repeated SELECT queries create database load
     Index on (published_at IS NULL) helps but has limits

  2. Sub-second latency requirements
     Polling interval creates inherent minimum latency
     CDC reacts to WAL immediately

  3. Strict ordering requirements
     Polling with concurrent publishers can reorder
     CDC preserves WAL (commit) order exactly

  4. Database resource constraints
     Polling adds continuous query load
     CDC reads WAL with minimal database impact
\`\`\`

**Hybrid approach — polling with exponential backoff**:
\`\`\`
  events = query_outbox()
  if events.length > 0:
    publish_all(events)
    backoff = 10ms      // found events, check again quickly
  else:
    backoff = min(backoff * 2, 5000ms)  // no events, slow down

  This reduces DB load during quiet periods
  while maintaining low latency during activity
\`\`\`

**Comparison**:
| Property | Polling | CDC (Debezium) |
|----------|---------|----------------|
| Latency | 1-5 seconds (poll interval) | ~100ms (real-time) |
| DB load | Continuous queries | Minimal (WAL read) |
| Infrastructure | None extra | Kafka Connect + Debezium |
| Complexity | Very low | Moderate |
| Ordering | Approximate (query order) | Exact (WAL order) |
| Reliability | Good (with retry logic) | Excellent (WAL is complete) |
| Team expertise | Any developer | Requires CDC knowledge |

**Recommendation**: Start with polling if your volume is low and latency requirements are relaxed. Migrate to CDC when scale demands it. The outbox table schema is the same for both approaches, so migration is straightforward.`
      },
    ],

    dataModel: {
      description: 'Outbox table and event publishing flow',
      schema: `Outbox Table:
  id:              UUID (deduplication key for consumers)
  aggregate_type:  string (entity type, used for topic routing)
  aggregate_id:    string (entity ID, used for partitioning)
  event_type:      string (event name)
  payload:         JSON (full event data)
  created_at:      timestamp (event time)
  published_at:    timestamp (NULL until published)

Publishing Flow:
  1. Service writes business data + outbox row (one transaction)
  2. CDC connector detects outbox INSERT via WAL
  3. Connector transforms row into Kafka message:
     topic = aggregate_type + ".events"
     key = aggregate_id
     value = payload
     headers = {event_type, trace_id}
  4. Message published to Kafka
  5. Outbox row marked published (or deleted)

Consumer Flow:
  1. Read message from Kafka topic
  2. Check dedup table for message id
  3. If new: process in transaction + record id
  4. If duplicate: skip
  5. Commit Kafka offset`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 12. Fencing (consistency)
  // ─────────────────────────────────────────────────────────
  {
    id: 'fencing',
    title: 'Fencing',
    icon: 'lock',
    color: '#3b82f6',
    questions: 8,
    description: 'Preventing stale or zombie leaders from making writes by using monotonically increasing tokens, epoch numbers, or lease expiration to reject outdated operations.',
    concepts: [
      'Fencing tokens (monotonic counters)',
      'Epoch numbers and term IDs',
      'Lease-based leadership',
      'Zombie leader problem',
      'Storage-level fencing',
      'Process pause scenarios (GC, swap)',
      'Distributed lock safety',
    ],
    tips: [
      'Fencing is the mechanism that makes distributed locks actually safe — without it, locks provide only performance optimization, not correctness',
      'The classic example: GC pause causes lock holder to appear dead, new leader elected, old leader resumes and writes with stale state',
      'Fencing tokens must be checked by the storage layer — client-side checking is not sufficient',
      'In Raft, the term number IS the fencing token — storage rejects writes from leaders with old terms',
      'In interviews, connect fencing to split-brain prevention — fencing tokens are the mechanism that resolves split-brain at the storage level',
      'ZooKeeper sequential znodes and Chubby sequence numbers are forms of fencing tokens',
    ],

    introduction: `**Fencing** is a safety mechanism that prevents "zombie" processes — stale leaders or lock holders that believe they still hold authority — from corrupting data. The core insight is that in a distributed system, a process can appear dead (due to a GC pause, network partition, or OS swap) and then wake up without knowing it has lost leadership. If the system has already elected a new leader, the zombie's writes must be rejected. This is not a hypothetical scenario — it happens regularly in production, especially in Java systems subject to stop-the-world GC pauses lasting seconds.

The primary tool is the **fencing token**: a monotonically increasing number (epoch, term, or sequence number) issued with every leadership grant or lock acquisition. When a process writes to storage, it includes its fencing token. The storage layer tracks the highest token it has seen and rejects any write carrying a lower token. This guarantee holds even if the zombie does not know it has been fenced — the storage enforces the invariant unilaterally. Martin Kleppmann's famous critique of Redis Redlock highlighted that Redlock does not generate fencing tokens, making it unsuitable for correctness-critical distributed locks.

This pattern is critical in **Raft** (term numbers), **ZooKeeper** (sequential znodes and zxid), **Google Chubby** (sequencer tokens), and any system using **distributed locks** for leader election. Kleppmann's analysis in "Designing Data-Intensive Applications" draws the fundamental distinction: a distributed lock without fencing tokens only provides a **performance optimization** (avoid duplicate work) — not a **correctness guarantee** (prevent data corruption). With fencing tokens, the lock provides both.

**When to use fencing**: Any system where a leader or lock holder writes to shared storage and correctness depends on mutual exclusion — distributed databases, job schedulers, resource allocators, and financial transaction processors. **When NOT to use**: Purely idempotent operations where duplicate execution has no harmful side effects, or systems where the "lock" is just a best-effort throttle (e.g., rate limiting) and occasional concurrent access is acceptable.`,

    keyQuestions: [
      {
        question: 'What is the zombie leader problem and how do fencing tokens solve it?',
        answer: `**The zombie leader scenario**:

\`\`\`
Timeline:
  t=0   Leader A acquires lock (token=33), starts processing
  t=1   Leader A enters GC pause (stop-the-world)
  t=5   Lock expires (TTL=3s). System thinks A is dead.
  t=6   Leader B acquires lock (token=34), starts processing
  t=7   Leader A's GC pause ends. A STILL THINKS it has the lock!
  t=8   A and B both write to storage → DATA CORRUPTION

Without fencing:
  t=7: A writes {balance: 100} to storage → ACCEPTED
  t=8: B writes {balance: 50} to storage  → ACCEPTED
  → Lost update! B's write was based on stale state.
\`\`\`

**With fencing tokens**:
\`\`\`
  t=0   A acquires lock, receives token=33
  t=6   B acquires lock, receives token=34
  t=7   A resumes, writes to storage with token=33:
        Storage checks: 33 < max_seen(34) → REJECTED!
  t=8   B writes with token=34 → ACCEPTED ✓

  Storage state:
    max_token_seen = 34
    Any write with token < 34 is rejected

  Result: Zombie leader A is fenced out. Data is safe.
\`\`\`

**Key requirement**: The storage layer must participate in fencing. Client-side checking is NOT sufficient because the zombie does not know it is a zombie. The storage must independently enforce the token ordering.

**Implementation**: Add a \`token\` column or header to every write request. Storage compares incoming token against stored maximum before accepting the write.`
      },
      {
        question: 'How does Raft use term numbers as fencing tokens?',
        answer: `**Raft's term number** serves as both an election counter and a fencing token.

\`\`\`
Term 1: Leader A
  A sends AppendEntries to followers with term=1
  Followers accept entries with term >= their current term

Network partition:
  A is isolated, still thinks it is leader (term=1)

Term 2: New election in majority partition
  B becomes leader with term=2
  B sends AppendEntries with term=2
  Followers update their current_term to 2

A's zombie behavior:
  A tries to send AppendEntries with term=1
  Followers reject: 1 < current_term(2) → STALE
  A tries to commit entries: needs majority ACK
  Cannot get ACKs → entries remain uncommitted

A discovers term 2:
  A receives message with term=2 (or AppendEntries from B)
  A sees: 2 > my_term(1) → I am no longer leader
  A steps down to follower, adopts term=2
\`\`\`

**Fencing at every layer**:
\`\`\`
1. AppendEntries RPC:
   if request.term < receiver.currentTerm:
     reject (stale leader)

2. RequestVote RPC:
   if request.term < receiver.currentTerm:
     reject (stale candidate)

3. Client requests:
   Leader checks it is still leader for current term
   before responding to reads (read lease or read index)

4. Log entries:
   Each entry tagged with the leader's term
   On recovery, entries from old terms may be
   overwritten if they were never committed
\`\`\`

**Why term numbers work as fencing tokens**:
- Monotonically increasing (new election → new term)
- Majority requirement ensures at most one leader per term
- Every node tracks the highest term it has seen
- Any message with a lower term is immediately rejected`
      },
      {
        question: 'How do distributed locks with fencing tokens differ from naive locks?',
        answer: `**Naive distributed lock (UNSAFE)**:
\`\`\`
  # Using Redis SET NX (without fencing)
  LOCK:   SET mylock client_A NX EX 10
  UNLOCK: DEL mylock

  Timeline:
  A: SET mylock A NX EX 10   → OK (locked)
  A: Process work... GC pause...
  Redis: TTL expires, lock auto-released
  B: SET mylock B NX EX 10   → OK (locked)
  A: GC pause ends, writes to DB  → NO CHECK, CORRUPTS DATA
  B: Writes to DB                  → CONFLICT!

  The lock only prevents concurrent acquisition,
  NOT concurrent execution after a pause.
\`\`\`

**Lock with fencing token (SAFE)**:
\`\`\`
  # Using ZooKeeper sequential znode (or Redlock with token)
  A: Create /locks/mylock/seq-0033 → token=33
  A: Process work... GC pause...
  ZK: Session expires, /seq-0033 deleted
  B: Create /locks/mylock/seq-0034 → token=34
  A: GC ends, writes to DB with token=33
     DB: 33 < max_seen(34) → REJECTED ✗
  B: Writes to DB with token=34 → ACCEPTED ✓
\`\`\`

**Implementation in storage**:
\`\`\`sql
-- Storage table
CREATE TABLE resources (
  id VARCHAR PRIMARY KEY,
  value TEXT,
  fencing_token BIGINT NOT NULL DEFAULT 0
);

-- Write with fencing check
UPDATE resources
SET value = $new_value,
    fencing_token = $incoming_token
WHERE id = $resource_id
  AND fencing_token < $incoming_token;

-- If affected rows = 0 → fencing rejected the write
\`\`\`

**Martin Kleppmann's classification**:
- Lock WITHOUT fencing = **efficiency optimization** (avoid duplicate work, tolerate occasional failure)
- Lock WITH fencing = **correctness mechanism** (prevent data corruption, safe even under process pauses)`
      },
      {
        question: 'What other fencing mechanisms exist beyond tokens?',
        answer: `**1. Lease-based fencing**:
\`\`\`
  Leader A gets lease: "You are leader until T=100"
  A must STOP all operations before T=100
  A must include lease_expiry in requests
  Storage rejects if current_time > lease_expiry

  Problem: Requires synchronized clocks
  Mitigation: Use bounded clock skew (e.g., Google TrueTime)
\`\`\`

**2. STONITH (physical fencing)**:
\`\`\`
  Before promoting new leader:
    Power off old leader via IPMI/BMC
    Revoke old leader's SAN access
    Block old leader's network port

  Guarantees: Old leader physically CANNOT write
  Used by: Pacemaker, Oracle RAC, PostgreSQL Patroni
\`\`\`

**3. I/O fencing (SAN-level)**:
\`\`\`
  Shared storage (SAN/NFS) revokes access for old leader:
    old_leader_A → SCSI reservation removed
    new_leader_B → SCSI reservation granted

  Even if A is running, disk writes fail with I/O error
  Used by: clustered file systems, Oracle ASM
\`\`\`

**4. Network fencing**:
\`\`\`
  SDN controller blocks old leader's network traffic:
    iptables -A OUTPUT -s old_leader_ip -j DROP

  Old leader's messages never reach storage
  Used by: cloud environments, kubernetes network policies
\`\`\`

**Comparison**:
\`\`\`
  ┌───────────────────┬────────────┬──────────────┐
  │ Mechanism         │ Guarantees │ Requirements │
  ├───────────────────┼────────────┼──────────────┤
  │ Fencing token     │ Logical    │ Storage      │
  │                   │            │ cooperation  │
  │ Lease expiry      │ Time-based │ Clock sync   │
  │ STONITH           │ Physical   │ OOB access   │
  │ I/O fencing       │ Storage    │ SAN support  │
  │ Network fencing   │ Network    │ SDN control  │
  └───────────────────┴────────────┴──────────────┘
\`\`\`

**Best practice**: Use fencing tokens as the primary mechanism (logical, no special hardware). Add STONITH or I/O fencing as defense-in-depth for critical systems where token-based fencing cannot be implemented (e.g., legacy storage that does not check tokens).`
      },
      {
        question: 'Why did Martin Kleppmann argue that Redlock is unsafe, and how does this relate to fencing?',
        answer: `**Kleppmann's critique (2016)**: Redis's Redlock algorithm for distributed locking is fundamentally unsafe for correctness-critical operations because it does not provide fencing tokens.

**Redlock algorithm summary**:
\`\`\`
  1. Get current time T1
  2. Try to acquire lock on N/2+1 Redis instances (majority)
  3. Get current time T2
  4. Lock is valid if: (T2 - T1) < lock_TTL AND majority acquired
  5. Lock validity time = TTL - (T2 - T1)
  6. Use lock, then release on all instances
\`\`\`

**The problem — no fencing token**:
\`\`\`
  Client A: Acquires Redlock with TTL=10s
  Client A: Starts processing... enters GC pause
  Clock: 10 seconds pass, lock TTL expires
  Client B: Acquires Redlock (A's lock expired)
  Client A: GC pause ends, A still thinks it has the lock
  Client A: Writes to storage → SUCCEEDS (no fencing check!)
  Client B: Writes to storage → ALSO SUCCEEDS
  → DATA CORRUPTION

  Redlock's TTL prevents CONCURRENT acquisition
  but cannot prevent the zombie leader scenario
  because there is no monotonically increasing token
  that the storage layer can check
\`\`\`

**Antirez (Redis author) response**:
\`\`\`
  Argued that Redlock IS safe if:
    1. GC pauses are bounded (known maximum pause time)
    2. Lock TTL >> maximum GC pause
    3. Clock drift is bounded

  Kleppmann's counter:
    These assumptions cannot be guaranteed in practice
    GC pauses, clock drift, and process pauses are unbounded
    Fencing tokens are the ONLY way to guarantee safety
    because they don't depend on time at all
\`\`\`

**The resolution for practitioners**:
\`\`\`
  Need lock for EFFICIENCY (avoid duplicate work):
    Redlock or simple Redis SETNX is fine
    Occasional double-execution is acceptable
    Examples: cache warming, batch job dedup

  Need lock for CORRECTNESS (prevent data corruption):
    Use ZooKeeper (sequential znodes = fencing tokens)
    Or etcd (Raft lease with revision = fencing token)
    Storage MUST check fencing token on every write
    Examples: financial transactions, leader election
\`\`\`

**Interview takeaway**: This debate is one of the most important in distributed systems engineering. Mentioning it shows deep understanding. The key lesson: distributed locks are only as safe as the fencing mechanism they use, and time-based safety (TTL) is fundamentally weaker than token-based safety (monotonic fencing).`
      },
      {
        question: 'How does ZooKeeper implement fencing through sequential znodes and session semantics?',
        answer: `**ZooKeeper's lock recipe with built-in fencing**:

\`\`\`
  Lock acquisition:
    1. Client A creates ephemeral sequential znode:
       /locks/my-resource/lock-0000000001
    2. Client A lists children of /locks/my-resource/
       [lock-0000000001]
    3. A's znode has lowest sequence → A holds the lock
    4. A uses the znode version (or zxid) as fencing token

  Concurrent lock attempt:
    1. Client B creates: /locks/my-resource/lock-0000000002
    2. B lists children: [lock-0000000001, lock-0000000002]
    3. B's znode is NOT lowest → B watches lock-0000000001
    4. B waits until lock-0000000001 is deleted

  Lock release (or session expiry):
    1. A deletes lock-0000000001 (or A's session expires → auto-deleted)
    2. ZooKeeper notifies B (watch fires)
    3. B re-checks: [lock-0000000002] is now lowest → B holds lock
    4. B gets fencing token from its znode version
\`\`\`

**Why this is safe for fencing**:
\`\`\`
  Sequential znode numbers are monotonically increasing:
    lock-0000000001 (A's token = 1)
    lock-0000000002 (B's token = 2)

  Storage check:
    A writes with token=1 → accepted (first write)
    A's session expires, B acquires lock with token=2
    A (zombie) writes with token=1 → REJECTED (1 < max_seen=2)

  The zxid (ZooKeeper transaction ID) can also be used:
    Every ZooKeeper operation gets a monotonically increasing zxid
    Even more granular than sequential znode numbers
\`\`\`

**Session semantics provide defense-in-depth**:
\`\`\`
  ZooKeeper session has a timeout (e.g., 30 seconds)
  Client must send heartbeats to maintain session
  If session expires:
    1. All ephemeral znodes are deleted (lock released)
    2. All watches are removed
    3. Client receives SESSION_EXPIRED event

  Client-side responsibility:
    On SESSION_EXPIRED → STOP all operations immediately
    Do NOT continue writing to storage
    Re-acquire lock with new session if needed
\`\`\`

**Comparison with etcd leases**:
| Property | ZooKeeper | etcd |
|----------|----------|------|
| Lock mechanism | Ephemeral sequential znode | Lease + key with revision |
| Fencing token | Znode sequence # or zxid | Key revision (mod_revision) |
| Session expiry | Auto-deletes ephemeral znodes | Auto-deletes keys with expired lease |
| Watch mechanism | One-time watches (re-register) | Persistent watches (gRPC stream) |
| Consistency | Linearizable reads (sync) | Linearizable reads (default) |

**Interview point**: ZooKeeper's sequential znodes are arguably the cleanest implementation of fencing tokens in practice. The monotonic sequence number is inherent to the lock mechanism — you get fencing "for free" without any additional protocol.`
      },
      {
        question: 'How do you implement fencing in a system where the storage layer cannot be modified?',
        answer: `**The challenge**: Fencing tokens require the storage layer to check the token and reject stale writes. But what if you are using a storage system that does not support custom token checking (e.g., S3, a legacy database, or a third-party API)?

**Strategy 1: Conditional writes (if the storage supports them)**:
\`\`\`
  DynamoDB:
    UpdateItem with ConditionExpression:
      "fencing_token < :new_token"
    If condition fails → stale write rejected ✓

  S3:
    PUT with If-Match ETag header
    Only succeeds if object hasn't changed since last read
    Not a true fencing token, but prevents lost updates

  PostgreSQL:
    UPDATE table SET value=$1, fencing_token=$2
    WHERE id=$3 AND fencing_token < $2
    Affected rows = 0 → stale write detected ✓
\`\`\`

**Strategy 2: Proxy/gateway layer**:
\`\`\`
  If storage cannot check tokens, add a proxy that does:

  Client → Fencing Proxy → Storage (unmodified)

  Fencing Proxy:
    Maintains max_token_seen per resource
    Receives write request with fencing_token
    If fencing_token < max_token_seen → REJECT
    Else: forward to storage, update max_token_seen

  Limitation: Proxy is a single point of failure
  Mitigation: Replicate proxy state with Raft/Paxos
\`\`\`

**Strategy 3: Append-only with latest-wins**:
\`\`\`
  Instead of updating in place, append a new version:

  1. Client A (token=33) writes: {value:100, token:33, ts:T1}
  2. Client B (token=34) writes: {value:50, token:34, ts:T2}
  3. Client A (zombie, token=33) writes: {value:75, token:33, ts:T3}

  Reader: SELECT * ORDER BY token DESC LIMIT 1
  Result: {value:50, token:34} ← highest token wins

  Storage doesn't need to reject anything — reader resolves
  Works with: S3 (versioned bucket), append-only logs, immutable stores
\`\`\`

**Strategy 4: Lease-based fencing without storage cooperation**:
\`\`\`
  Client acquires lease with bounded duration
  Client sets "fence time" = lease_start + lease_duration - safety_margin
  Client checks clock before EVERY write:
    if now >= fence_time: STOP (do not write)

  Relies on: clock synchronization between client and lease server
  Weakness: GC pause can skip the clock check entirely
  Acceptable for: Systems where clock skew is well-bounded (NTP)
  NOT acceptable for: Safety-critical systems
\`\`\`

**Strategy 5: Idempotent operations (avoid the problem)**:
\`\`\`
  If all operations are naturally idempotent, fencing is unnecessary:

  Idempotent: SET user.email = "alice@new.com"
    Zombie writes same value → no harm done

  NOT idempotent: TRANSFER $100 from A to B
    Zombie writes again → $200 transferred!

  When operations are idempotent, duplicate execution from
  zombie leaders is harmless. Design for idempotency as a
  complement to fencing.
\`\`\`

**Recommendation order**: (1) Use storage with native conditional writes if possible. (2) Add a fencing proxy if not. (3) Use append-only + latest-token-wins for immutable stores. (4) Fall back to lease-based + clock checks only if all else fails.`
      },
      {
        question: 'How does fencing relate to distributed consensus and what is the layered defense model?',
        answer: `**Fencing is the last line of defense** in a layered approach to preventing data corruption from stale leaders:

\`\`\`
  Layer 1: Consensus Protocol (prevention)
    Raft/Paxos ensures at most one leader per term
    Leader cannot commit without majority acknowledgment
    This SHOULD prevent split-brain entirely

  Layer 2: Lease/Timeout (detection)
    Leader's authority expires after a timeout
    Leader must renew with consensus group
    If leader cannot renew → must stop operations
    Catches: process pauses, network partitions

  Layer 3: Fencing Tokens (enforcement)
    Every write carries a monotonic token
    Storage rejects writes with stale tokens
    Catches: bugs in Layer 1, clock issues in Layer 2,
    zombie processes that survived Layers 1 and 2

  Defense in depth:
    Each layer catches failures the previous layer missed
    All three together → extremely robust
\`\`\`

**Real-world examples of layered defense**:

\`\`\`
  CockroachDB:
    Layer 1: Raft consensus (term-based leadership)
    Layer 2: Epoch-based leases on range leadership
    Layer 3: Raft term number checked on every write
    Result: Three independent mechanisms prevent stale writes

  Google Chubby:
    Layer 1: Paxos consensus for lock service
    Layer 2: Session leases with bounded validity
    Layer 3: Sequencer tokens checked by storage servers
    Result: Even if Paxos has a bug, storage catches stale writes

  PostgreSQL Patroni:
    Layer 1: Consensus via etcd/ZooKeeper for leader election
    Layer 2: DCS (distributed configuration store) lease
    Layer 3: PostgreSQL recovery target timeline (epoch)
    Optional: STONITH via watchdog for hardware-level fencing
\`\`\`

**Why all three layers matter**:
\`\`\`
  Without Layer 1 (consensus):
    Multiple leaders can be elected simultaneously
    Fencing helps but data may diverge before tokens are checked

  Without Layer 2 (lease):
    Zombie leader with valid consensus membership
    but paused process continues after partition heals
    No time-based expiration to trigger step-down

  Without Layer 3 (fencing tokens):
    Zombie leader that survived layers 1 and 2
    (e.g., GC pause ended after lease expired but
     before the process checked its lease status)
    Without fencing, zombie's write reaches storage
    → DATA CORRUPTION

  With all three:
    Layer 1 prevents most issues (>99.9%)
    Layer 2 catches edge cases from Layer 1
    Layer 3 catches everything that survived 1 and 2
    → Probability of data corruption: effectively zero
\`\`\`

**Interview approach**: When discussing fencing, always present it as part of this layered model. Say: "Fencing tokens are the safety net — they are the last line of defense that catches zombie processes even when consensus and lease mechanisms have failed. No single layer is sufficient; defense-in-depth is required for correctness-critical systems."`
      },
    ],

    dataModel: {
      description: 'Fencing token lifecycle and storage enforcement',
      schema: `Fencing Token Lifecycle:
  1. Lock/leader election service issues token:
     token = previous_max + 1 (monotonically increasing)

  2. Client receives token with lock/leadership grant:
     {lock_id, fencing_token, granted_at, expires_at}

  3. Client includes token in every write:
     WRITE(resource_id, value, fencing_token)

  4. Storage checks token before applying:
     if incoming_token > stored_max_token:
       apply write, update stored_max_token
     else:
       reject write (stale leader/lock holder)

Storage Token State:
  resource_id:       the protected resource
  current_value:     the resource's current value
  max_fencing_token: highest token seen for this resource
  last_writer:       node that performed the last accepted write
  updated_at:        timestamp of last accepted write

Epoch-Based Fencing (Raft/Paxos):
  term/epoch:        monotonically increasing per election
  All RPCs include sender's term
  Receiver rejects if sender's term < receiver's current term
  Receiver updates its term if sender's term is higher`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 13. Real-time Updates (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'real-time-updates',
    title: 'Real-time Updates',
    icon: 'radio',
    color: '#06b6d4',
    questions: 8,
    description: 'Push vs pull architectures for delivering live data to clients using WebSockets, SSE, long-polling, and hybrid approaches.',
    concepts: [
      'Event-driven architecture',
      'Pub/sub fanout',
      'Connection management',
      'Reconnection strategies',
      'Message ordering guarantees',
      'WebSocket scaling with sticky sessions',
      'Hybrid push/pull patterns',
    ],
    tips: [
      'Default to SSE for unidirectional server-to-client updates — simpler than WebSockets and works through HTTP proxies',
      'WebSockets are essential only when you need bidirectional communication (chat, collaborative editing, gaming)',
      'Long-polling is a reliable fallback when SSE or WebSockets are blocked by corporate firewalls',
      'Always implement exponential backoff with jitter for reconnection to avoid thundering herd on server recovery',
      'Use sticky sessions or a shared pub/sub layer (Redis, Kafka) when horizontally scaling WebSocket servers',
      'In interviews, compare the trade-offs of each mechanism and explain when you would choose one over another',
    ],

    introduction: `**Real-time updates** refer to the ability of a system to push fresh data to clients as soon as it changes on the server, rather than waiting for the client to poll for changes. This is critical for applications like chat, live dashboards, collaborative editors, notification systems, stock tickers, and multiplayer games where stale data directly harms user experience.

There are four primary mechanisms for delivering real-time updates: **WebSockets**, **Server-Sent Events (SSE)**, **long-polling**, and **short-polling**. Each sits at a different point on the complexity-vs-capability spectrum. WebSockets provide full-duplex, bidirectional communication over a single persistent TCP connection. SSE offers a simpler, HTTP-native, unidirectional channel from server to client. Long-polling emulates push by having the client hold an open HTTP request until the server has data. Short-polling is the simplest but least efficient — the client repeatedly asks "anything new?" on a timer.

Choosing the right mechanism depends on your requirements: **direction of data flow** (unidirectional vs bidirectional), **infrastructure constraints** (load balancers, proxies, firewalls), **scale** (number of concurrent connections), and **message ordering guarantees**. Most production systems use a **hybrid approach** — SSE or WebSockets for the primary channel with polling as a fallback, plus a server-side pub/sub backbone (Redis Pub/Sub, Kafka, or NATS) to fan out events across horizontally scaled servers.`,

    keyQuestions: [
      {
        question: 'Compare WebSockets, SSE, and long-polling. When would you choose each?',
        answer: `**WebSockets**:
\`\`\`
  Client ◄──────────────────► Server
         Full-duplex TCP connection
         Binary + text frames
         Custom protocol after HTTP upgrade
\`\`\`
- **Use when**: Bidirectional communication is required — chat, collaborative editing, multiplayer games, real-time auctions
- **Pros**: Low latency in both directions, binary support, no HTTP overhead per message
- **Cons**: Requires sticky sessions or shared state for horizontal scaling, not cacheable, some proxies/firewalls block the upgrade handshake, more complex server implementation

**Server-Sent Events (SSE)**:
\`\`\`
  Client ◄────────────────── Server
         Unidirectional HTTP stream
         text/event-stream content type
         Built-in reconnection + last-event-id
\`\`\`
- **Use when**: Server-to-client push only — live feeds, notifications, dashboards, progress updates
- **Pros**: Works over standard HTTP (no upgrade), automatic reconnection with last-event-id, works through most proxies, simpler implementation
- **Cons**: Unidirectional only, text-only (no binary), limited to ~6 concurrent connections per domain in HTTP/1.1 (not an issue with HTTP/2), no built-in acknowledgment

**Long-polling**:
\`\`\`
  Client ──── GET /updates?since=X ────► Server
  Client ◄── (waits up to timeout) ──── Server
  Client ──── GET /updates?since=Y ────► Server
         Repeated HTTP requests, held open
\`\`\`
- **Use when**: SSE and WebSockets are not available (legacy browsers, corporate firewalls), or as a fallback mechanism
- **Pros**: Works everywhere HTTP works, no special server support, stateless on the server side
- **Cons**: Higher latency (one round-trip per update), more overhead (HTTP headers per request), harder to manage timeouts correctly

**Decision framework**:
1. Need bidirectional? → WebSocket
2. Server-to-client only? → SSE (with long-polling fallback)
3. Hostile network environment? → Long-polling
4. Very low update frequency? → Short-polling (simplest)`
      },
      {
        question: 'How do you scale WebSocket servers horizontally?',
        answer: `The core challenge is that a WebSocket connection is **stateful** — it is bound to a specific server process. When you scale to multiple servers, a message published on Server A must reach clients connected to Server B.

**Architecture for horizontal scaling**:
\`\`\`
  Clients      Load Balancer (sticky sessions)
    │               │
    ├──► WS Server 1 ──┐
    ├──► WS Server 2 ──┤──► Redis Pub/Sub (or Kafka/NATS)
    └──► WS Server 3 ──┘
\`\`\`

**Step 1 — Sticky sessions**: The load balancer must route a WebSocket connection to the same backend server for the lifetime of that connection. Options:
- IP hash routing
- Cookie-based affinity
- Connection ID-based routing

**Step 2 — Shared pub/sub backbone**: When an event occurs (e.g., new chat message), the originating server publishes to a shared message bus. All WS servers subscribe and forward to their connected clients.
\`\`\`
  User sends message → WS Server 2
  WS Server 2 → Redis PUBLISH channel:room:42 "new message"
  WS Server 1 (subscribed to room:42) → pushes to its clients
  WS Server 3 (subscribed to room:42) → pushes to its clients
\`\`\`

**Step 3 — Connection registry**: Track which users are connected to which servers. This enables targeted delivery:
\`\`\`
  Redis Hash: user:connections
    user_123 → ws-server-2
    user_456 → ws-server-1
\`\`\`

**Scaling considerations**:
- Each server can handle ~50K-100K concurrent WebSocket connections (kernel tuning: file descriptors, TCP buffers)
- Redis Pub/Sub fan-out adds ~1-2ms latency
- For very high throughput, use Kafka with partitioned topics instead of Redis Pub/Sub
- Consider connection draining during deployments — gracefully migrate connections to new servers`
      },
      {
        question: 'How do you handle reconnection and message ordering in real-time systems?',
        answer: `Connections drop constantly in production — network blips, mobile devices switching between WiFi and cellular, server deployments, and load balancer timeouts. A robust real-time system must handle reconnection gracefully without data loss.

**SSE built-in reconnection**:
\`\`\`
  Server sends:
    id: 1042
    data: {"type":"price_update","symbol":"AAPL","price":182.50}

  Connection drops...

  Client reconnects with header:
    Last-Event-ID: 1042

  Server resumes from event 1043
\`\`\`
SSE has native support for this — the browser automatically reconnects and sends the \`Last-Event-ID\` header. The server must maintain a buffer of recent events to replay.

**WebSocket reconnection strategy**:
\`\`\`
  Attempt 1: wait 1s    + jitter(0, 500ms)
  Attempt 2: wait 2s    + jitter(0, 500ms)
  Attempt 3: wait 4s    + jitter(0, 500ms)
  Attempt 4: wait 8s    + jitter(0, 500ms)
  ...
  Max wait:  wait 30s   + jitter(0, 500ms)
\`\`\`
Exponential backoff with jitter prevents thundering herd when many clients reconnect simultaneously after a server restart.

**Message ordering guarantees**:
1. **Per-channel ordering**: Assign a sequence number per channel/topic. Clients track the last received sequence number and request gaps on reconnect.
2. **Causal ordering**: Use vector clocks or Lamport timestamps when multiple producers generate events that have causal relationships.
3. **Exactly-once delivery**: Assign unique message IDs. Clients deduplicate using a sliding window of recently seen IDs.

**Gap detection and fill**:
\`\`\`
  Client tracks: last_seq = 1042
  Receives event with seq = 1045
  Detects gap: missing 1043, 1044
  Fetches via REST: GET /events?after=1042&before=1045
  Merges into local state, resumes streaming from 1045
\`\`\`

This hybrid approach — streaming for real-time delivery, REST for gap filling — is used by Slack, Discord, and most production chat systems.`
      },
      {
        question: 'How does pub/sub fanout work and what are the scaling challenges?',
        answer: `**Pub/sub fanout** is the process of distributing a single published message to all subscribers of a topic or channel. It is the backbone of most real-time systems.

**Basic model**:
\`\`\`
  Publisher → Topic/Channel → Subscriber 1
                            → Subscriber 2
                            → Subscriber 3
                            → ...
                            → Subscriber N
\`\`\`

**Fanout ratio**: If a topic has N subscribers, one publish operation triggers N deliveries. A single message in a popular chat room with 10,000 members triggers 10,000 deliveries.

**Scaling challenges**:

1. **Hot topics**: A viral post or popular channel creates massive fanout. Solutions:
   - Rate-limit publishers on hot topics
   - Switch from push to pull for high-fanout topics (followers fetch on demand)
   - Tiered delivery: push to online users, queue for offline users

2. **Redis Pub/Sub limitations**: Messages are fire-and-forget — if a subscriber is disconnected, the message is lost. For durability, use Redis Streams or Kafka.

3. **Fan-out-on-write vs fan-out-on-read** (the Twitter problem):
\`\`\`
  Fan-out-on-write (push):
    User posts tweet → write to every follower's timeline cache
    Fast reads, expensive writes
    Bad for users with millions of followers (celebrity problem)

  Fan-out-on-read (pull):
    User opens timeline → fetch and merge tweets from followed users
    Cheap writes, expensive reads
    Better for high-follower accounts

  Hybrid (Twitter's actual approach):
    Regular users: fan-out-on-write
    Celebrities (>500K followers): fan-out-on-read
    Merge both at read time
\`\`\`

4. **Ordering across partitions**: When using Kafka, messages in a single partition are ordered, but across partitions they are not. Use a consistent partition key (e.g., room_id) to maintain ordering within a conversation.`
      },
      {
        question: 'How do you design a notification system that supports real-time push and offline delivery?',
        answer: `A production notification system must handle two modes: **real-time push** for online users and **persistent storage** for offline users who will read notifications later.

**Architecture**:
\`\`\`
  Event Source → Notification Service → Presence Check
                                          │
                                ┌─────────┴──────────┐
                                ▼                    ▼
                          Online Path          Offline Path
                          (push via WS/SSE)    (store in DB)
                                │                    │
                                ▼                    ▼
                          WS Gateway            Notification Store
                                │                    │
                                ▼                    ▼
                          Client receives      Client fetches on
                          in real-time          next login/open
\`\`\`

**Presence tracking**: Maintain a set of online users with their connection endpoints.
\`\`\`
  Redis SET online:users {user_123, user_456, ...}
  Redis HASH user:connections
    user_123 → ws-server-2:conn-abc
\`\`\`

**Notification lifecycle**:
1. Event occurs (new message, like, follow, system alert)
2. Notification service determines recipients and their preferences
3. For each recipient:
   a. Write to notification store (permanent record)
   b. If online → push via WebSocket/SSE gateway
   c. If offline → optionally trigger mobile push (APNs/FCM) or email

**Batching and deduplication**:
- Group related notifications (e.g., "Alice and 5 others liked your post")
- Debounce rapid-fire events (e.g., typing indicators)
- Deduplicate with idempotency keys to prevent duplicate push notifications

**Read status and badge counts**:
\`\`\`
  notification_id | user_id | type | read | created_at
  ────────────────┼─────────┼──────┼──────┼───────────
  notif_1         | user_42 | like | true | 2024-01-15
  notif_2         | user_42 | msg  | false| 2024-01-15

  Badge count = SELECT COUNT(*) WHERE user_id=42 AND read=false
  (Cache in Redis for fast access, update on read/new notification)
\`\`\`

This dual-path approach ensures no notifications are lost, while online users receive instant feedback.`
      },
      {
        question: 'What are the trade-offs between HTTP/2 streaming, SSE, and WebSockets for server push?',
        answer: `All three enable server-initiated data delivery, but they differ fundamentally in protocol design and operational characteristics.

**HTTP/2 Server Push** (largely deprecated for this use case):
- Originally designed to push assets (CSS, JS) alongside an HTML response
- Not suitable for event streaming — browsers have removed support for push promises
- Do not confuse with HTTP/2 multiplexed streams, which SSE benefits from

**SSE over HTTP/2**:
\`\`\`
  Single TCP connection (HTTP/2 multiplexed)
  ├── Stream 1: SSE /events/notifications
  ├── Stream 3: SSE /events/prices
  ├── Stream 5: Regular REST request
  └── Stream 7: SSE /events/activity
\`\`\`
- HTTP/2 eliminates the 6-connection-per-domain limit of HTTP/1.1
- Multiple SSE streams share one TCP connection
- Standard HTTP headers, cookies, and auth flow apply
- Load balancers and CDNs understand HTTP natively
- Built-in reconnection and event IDs

**WebSockets over HTTP/2**:
- RFC 8441 defines WebSocket over HTTP/2 via CONNECT method
- Eliminates the separate TCP connection for WebSocket
- Not yet universally supported by all proxies and CDNs

**Operational comparison**:
\`\`\`
  ┌──────────────────┬─────────────┬────────────────┐
  │ Concern          │ SSE         │ WebSocket      │
  ├──────────────────┼─────────────┼────────────────┤
  │ Protocol         │ HTTP        │ Custom (TCP)   │
  │ Direction        │ Server→Client│ Bidirectional │
  │ Proxy support    │ Excellent   │ Moderate       │
  │ Auth             │ HTTP headers│ Query params   │
  │                  │ + cookies   │ or first msg   │
  │ Compression      │ HTTP gzip   │ Per-message    │
  │                  │             │ deflate ext    │
  │ Load balancer    │ Standard    │ Sticky session │
  │ Monitoring       │ HTTP tools  │ Custom tooling │
  │ Connection cost  │ Lower       │ Higher         │
  │ Max connections  │ HTTP/2 mux  │ 1 TCP per conn │
  └──────────────────┴─────────────┴────────────────┘
\`\`\`

**Recommendation**: Start with SSE unless bidirectional communication is a hard requirement. SSE is operationally simpler, works with existing HTTP infrastructure, and HTTP/2 makes it highly efficient for multiple concurrent streams.`
      },
      {
        question: 'How would you design real-time updates for a collaborative document editor?',
        answer: `Collaborative editing is one of the most demanding real-time use cases because multiple users modify the same document simultaneously, and conflicts must be resolved deterministically.

**Architecture**:
\`\`\`
  User A (browser)                 User B (browser)
       │                                │
  Local edit ──► WebSocket ──► Collaboration Server ◄── WebSocket ◄── Local edit
       │              │              │
       ▼              ▼              ▼
  Local state    Operation Log    Local state
  (optimistic)   (source of truth) (optimistic)
\`\`\`

**Conflict resolution strategies**:

1. **Operational Transformation (OT)** — used by Google Docs:
   - Each edit is an operation: insert(pos, char), delete(pos)
   - Server transforms concurrent operations against each other
   - Guarantees convergence: all clients reach the same final state
   - Complex to implement correctly (O(n^2) transformation pairs)

2. **Conflict-free Replicated Data Types (CRDTs)** — used by Figma, Notion:
   - Each character/element has a unique ID and position
   - Operations are commutative — order does not matter
   - No central server required for conflict resolution
   - Higher memory overhead (unique IDs per element)

**Real-time update flow with OT**:
\`\`\`
  1. User A types "hello" at position 0
     → send: {op: "insert", pos: 0, text: "hello", rev: 5}

  2. Concurrently, User B types "world" at position 0
     → send: {op: "insert", pos: 0, text: "world", rev: 5}

  3. Server receives A first, applies it (rev 6)
  4. Server receives B, transforms against A:
     B' = transform(B, A) → {op: "insert", pos: 5, text: "world", rev: 6}
  5. Server broadcasts A to B, B' to A
  6. Both clients converge on "helloworld"
\`\`\`

**Presence and cursors**: Beyond document changes, show each user's cursor position, selection, and name. This requires frequent updates (every keystroke or mouse move) but tolerates data loss — use unreliable delivery (no persistence, just broadcast).

**Persistence**: Periodically snapshot the document state to storage. The operation log can be compacted after a snapshot. This hybrid ensures fast recovery without replaying the entire operation history.`
      },
      {
        question: 'How do you handle backpressure in real-time streaming systems?',
        answer: `**Backpressure** occurs when a consumer cannot keep up with the rate of incoming messages. Without handling it, the system either drops messages, runs out of memory, or cascades failures to upstream services.

**Where backpressure arises in real-time systems**:
\`\`\`
  Fast Producer → Buffer/Queue → Slow Consumer
  (1000 msg/s)    (growing!)      (100 msg/s)
\`\`\`

**Strategies for handling backpressure**:

1. **Buffering with bounded queues**: Set a maximum buffer size. When full, apply a policy:
   - Drop oldest messages (suitable for metrics, sensor data)
   - Drop newest messages (suitable for commands)
   - Block the producer (suitable for pipelines where data loss is unacceptable)

2. **Rate limiting at the source**: Throttle the publisher to match consumer capacity.
\`\`\`
  Producer → Token Bucket (100 msg/s) → Queue → Consumer
\`\`\`

3. **Sampling/aggregation**: Instead of delivering every event, aggregate:
   - Send price updates at most once per 100ms (latest value wins)
   - Batch 100 small events into one delivery

4. **Consumer-driven pull**: Instead of the server pushing, let the client pull at its own pace:
\`\`\`
  Client: GET /events?after=last_id&limit=50
  Server: returns up to 50 events
  Client: processes, then requests next batch
\`\`\`

5. **Adaptive quality**: Degrade gracefully based on consumer speed:
   - Fast client: full fidelity (every tick, every keystroke)
   - Slow client: reduced fidelity (snapshots every second, summarized updates)

**WebSocket backpressure**: The WebSocket API does not natively expose backpressure. Monitor the \`bufferedAmount\` property on the WebSocket object — if it grows, the network or client is not keeping up. Pause sending until the buffer drains.

**Kafka backpressure**: Consumer groups naturally handle backpressure — each consumer pulls at its own rate. If consumers fall behind, increase partitions and add consumers to the group. Monitor consumer lag as an operational metric.`
      },
    ],

    dataModel: {
      description: 'Real-time connection state and event delivery tracking',
      schema: `Connection State (per client):
  connection_id:   UUID
  user_id:         user reference
  server_id:       which WS/SSE server
  transport:       websocket | sse | long-poll
  connected_at:    timestamp
  last_heartbeat:  timestamp
  subscriptions:   [channel_1, channel_2, ...]
  last_event_id:   last successfully delivered event ID

Event Record:
  event_id:        monotonic per channel
  channel:         channel/topic name
  event_type:      message | notification | presence | system
  payload:         JSON data
  created_at:      timestamp
  ttl:             expiration for ephemeral events

Delivery Tracking:
  event_id:        reference to event
  user_id:         recipient
  status:          pending | delivered | read
  delivered_at:    timestamp (null if pending)
  delivery_method: push | pull | push_notification`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 14. Dealing with Contention (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'dealing-with-contention',
    title: 'Dealing with Contention',
    icon: 'lock',
    color: '#06b6d4',
    questions: 7,
    description: 'Managing concurrent access to shared resources using optimistic locking, pessimistic locking, distributed locks, and queue-based serialization.',
    concepts: [
      'Optimistic locking (CAS)',
      'Pessimistic locking',
      'Distributed locks (Redis, ZooKeeper)',
      'Queue-based serialization',
      'Lease-based locking',
      'Hot key mitigation',
    ],
    tips: [
      'Start with optimistic concurrency control — it scales better and handles the common case where conflicts are rare',
      'Pessimistic locks should be a last resort for high-contention resources where retries are expensive',
      'Redis SETNX-based locks must always use expiration to prevent deadlocks from crashed clients',
      'Queue-based serialization eliminates contention entirely but adds latency — use for write-heavy hot keys',
      'In interviews, always discuss what happens when a lock holder crashes — fencing tokens or lease expiry are the safety nets',
    ],

    introduction: `**Contention** occurs when multiple processes or threads attempt to access or modify the same shared resource simultaneously. In distributed systems, this manifests as concurrent writes to the same database row, simultaneous updates to the same cache key, or multiple services trying to claim the same work item from a queue.

Managing contention correctly is critical because getting it wrong leads to **lost updates**, **dirty reads**, **double-processing**, and **data corruption**. The challenge is amplified in distributed systems where you cannot rely on a single-process mutex — the locks themselves must be distributed, which introduces network latency, partial failures, and the risk of lock holder crashes.

There are several strategies for managing contention, each with different trade-offs. **Optimistic locking** assumes conflicts are rare and detects them at write time using version numbers or compare-and-swap (CAS). **Pessimistic locking** assumes conflicts are common and acquires exclusive access before reading. **Distributed locks** extend pessimistic locking across machines using services like Redis or ZooKeeper. **Queue-based serialization** eliminates contention entirely by routing all operations on a resource through a single-threaded processor. The right choice depends on the contention level, the cost of retries, and the consistency requirements of your system.`,

    keyQuestions: [
      {
        question: 'How does optimistic locking work and when should you use it?',
        answer: `**Optimistic locking** assumes that conflicts are rare. Instead of acquiring a lock before reading, you read the data along with a version number, perform your computation, and then attempt to write only if the version has not changed.

**Database-level implementation (version column)**:
\`\`\`
  -- Read
  SELECT balance, version FROM accounts WHERE id = 42;
  -- Returns: balance=1000, version=7

  -- Application logic
  new_balance = 1000 - 200 = 800

  -- Conditional write
  UPDATE accounts
  SET balance = 800, version = 8
  WHERE id = 42 AND version = 7;

  -- If rows_affected = 0 → conflict detected, retry
\`\`\`

**Compare-and-Swap (CAS)**:
\`\`\`
  CAS(address, expected_value, new_value)
  - Atomically: if *address == expected_value, set *address = new_value
  - Returns: success or failure
  - Used by: CPU instructions, Redis WATCH/MULTI, DynamoDB ConditionExpression
\`\`\`

**DynamoDB conditional write**:
\`\`\`
  UpdateItem:
    Key: {id: "42"}
    UpdateExpression: "SET balance = :new, version = :v2"
    ConditionExpression: "version = :v1"
    ExpressionAttributeValues: {":v1": 7, ":v2": 8, ":new": 800}
  -- Throws ConditionalCheckFailedException on conflict
\`\`\`

**When to use**:
- Read-heavy workloads where conflicts are infrequent (<5% of writes conflict)
- When the cost of a retry is low (re-read, recompute, re-write)
- When you need high throughput — no lock acquisition overhead in the happy path

**When NOT to use**:
- High contention (many writers on the same key) — retry storms waste resources
- When the computation between read and write is expensive (e.g., calling an external API)
- When retries have side effects that cannot be safely repeated`
      },
      {
        question: 'How do distributed locks work with Redis and what are the pitfalls?',
        answer: `**Redis single-instance lock (SETNX)**:
\`\`\`
  -- Acquire lock
  SET resource:lock unique_token NX EX 30
  -- NX: only set if not exists
  -- EX 30: auto-expire after 30 seconds
  -- unique_token: random UUID for safe release

  -- Release lock (Lua script for atomicity)
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
\`\`\`

**Why unique_token matters**: Without it, Client A's lock could expire, Client B acquires it, then Client A's delayed DEL removes Client B's lock. The token ensures only the holder can release.

**Pitfalls of single-instance Redis locks**:
1. **Redis failover**: If the Redis primary crashes after granting a lock but before replicating to the replica, the lock is lost. Two clients may hold the "same" lock simultaneously.
2. **Clock issues with expiry**: If the lock holder's process pauses (GC, swapping), the lock may expire before the holder completes its work.
3. **No fencing**: Even with expiry, a slow client may continue operating after its lock expires, corrupting data.

**Redlock algorithm** (distributed across N Redis instances):
\`\`\`
  1. Get current time T1
  2. Try to acquire lock on N/2+1 Redis instances (majority)
     - Each with same key, value, and short timeout
  3. Get current time T2
  4. Lock is valid if:
     - Acquired on majority of instances
     - Elapsed time (T2-T1) < lock TTL
  5. Effective TTL = original TTL - (T2-T1)
\`\`\`

**Redlock criticism** (Martin Kleppmann's analysis):
- Relies on wall-clock time assumptions that can be violated by clock skew and process pauses
- Does not provide fencing tokens, so a paused client with an expired lock can still corrupt data
- For safety-critical locking, ZooKeeper with ephemeral nodes and fencing tokens is more robust

**Best practice**: Use Redis locks for **efficiency** (preventing duplicate work) but not for **correctness** (protecting invariants). For correctness, combine locks with fencing tokens or use a consensus-based system.`
      },
      {
        question: 'How does ZooKeeper implement distributed locks and why is it considered safer?',
        answer: `ZooKeeper provides distributed locks through **ephemeral sequential znodes**, which offer stronger guarantees than Redis-based locks.

**Lock acquisition protocol**:
\`\`\`
  /locks/resource-42/
    ├── lock-0000000001 (ephemeral, Client A)  ← holder
    ├── lock-0000000002 (ephemeral, Client B)  ← waiting
    └── lock-0000000003 (ephemeral, Client C)  ← waiting
\`\`\`

1. Client creates an ephemeral sequential znode under the lock path
2. Client lists all children and checks if its znode has the lowest sequence number
3. If yes → lock acquired
4. If no → set a watch on the znode with the next-lower sequence number (herd avoidance)
5. When the watched znode is deleted, the client rechecks

**Why ephemeral znodes are safer**:
- If the lock holder crashes or loses its ZooKeeper session, the ephemeral znode is automatically deleted
- The next waiter is notified and acquires the lock
- No reliance on TTL or wall-clock time — session liveness is determined by heartbeats

**Fencing with ZooKeeper**:
\`\`\`
  Lock znode: lock-0000000042
  Fencing token: 42 (the sequence number)

  Client includes token 42 in all writes to the protected resource
  Storage rejects writes with token < max_seen_token
\`\`\`

The monotonically increasing sequence number serves as a natural fencing token, which Redis locks do not provide natively.

**Trade-offs vs Redis**:
\`\`\`
  ┌─────────────────┬──────────────┬──────────────┐
  │ Property        │ ZooKeeper    │ Redis        │
  ├─────────────────┼──────────────┼──────────────┤
  │ Safety          │ Strong       │ Best-effort  │
  │ Fencing tokens  │ Built-in     │ Manual       │
  │ Crash handling  │ Auto-release │ TTL-based    │
  │ Latency         │ Higher       │ Lower        │
  │ Throughput      │ Lower        │ Higher       │
  │ Ops complexity  │ Higher       │ Lower        │
  │ Best for        │ Correctness  │ Efficiency   │
  └─────────────────┴──────────────┴──────────────┘
\`\`\`

**Recommendation**: Use ZooKeeper (or etcd) when a lock violation would cause data corruption or financial loss. Use Redis when a lock violation would cause duplicate work that is wasteful but not dangerous.`
      },
      {
        question: 'What is queue-based serialization and when does it outperform locking?',
        answer: `**Queue-based serialization** eliminates contention entirely by routing all operations that affect a given resource through a single, ordered queue processed by one consumer at a time.

**Architecture**:
\`\`\`
  Writer A ──┐
  Writer B ──┤──► Queue (partitioned by resource_id) ──► Single Consumer
  Writer C ──┘                                            (processes sequentially)
\`\`\`

**How it works**:
1. Instead of acquiring a lock and writing directly, clients enqueue their operations
2. Operations for the same resource are routed to the same partition (via consistent hashing on resource_id)
3. A single consumer processes operations for each partition sequentially
4. No locks needed — serialization is achieved by single-threaded processing

**Kafka-based implementation**:
\`\`\`
  Topic: account-operations (partitions: 64)
  Partition key: account_id
  Message: {account_id: "42", op: "debit", amount: 200, idempotency_key: "tx-abc"}

  Consumer group: account-processor
  - Each partition processed by exactly one consumer
  - Operations on account 42 always go to partition hash(42) % 64
  - Processed strictly in order within that partition
\`\`\`

**When queue serialization outperforms locking**:

1. **Extreme contention**: When many writers target the same key (e.g., a viral post's like counter), lock-based approaches spend most of their time retrying. A queue processes every operation exactly once, no retries.

2. **Complex operations**: When the operation between lock-acquire and lock-release is expensive (calls to external APIs, complex computations), holding a lock for that duration blocks all other writers. With a queue, the consumer processes at its own pace.

3. **Audit requirements**: The queue naturally provides an ordered log of all operations — useful for auditing, replay, and debugging.

**Trade-offs**:
- Adds latency (enqueue → dequeue → process) compared to direct writes
- Queue becomes a single point of failure (mitigate with replicated queues like Kafka)
- Backpressure: if the consumer cannot keep up, the queue grows — need monitoring and scaling strategies
- Not suitable for read-modify-write cycles where the client needs the result immediately`
      },
      {
        question: 'How do you handle contention on hot keys in databases and caches?',
        answer: `A **hot key** is a single key or row that receives a disproportionate amount of traffic. Examples: a viral tweet, a flash sale product, a global counter, or a celebrity's follower count. Hot keys create contention bottlenecks even in distributed systems because all requests funnel to a single shard or node.

**Database hot key mitigation**:

1. **Write buffering and batching**:
\`\`\`
  Instead of:  1000 concurrent UPDATEs to row X
  Do:          Batch in memory, flush periodically
               UPDATE products SET stock = stock - batch_sum WHERE id = X
\`\`\`

2. **Shard splitting**: Split the hot key into N sub-keys, distribute writes, aggregate on read.
\`\`\`
  counter:likes:post_42      (hot!)
  → counter:likes:post_42:0  (shard 0)
  → counter:likes:post_42:1  (shard 1)
  → counter:likes:post_42:2  (shard 2)
  ...
  Total = SUM of all shards (read-time aggregation)
\`\`\`

3. **Async counter updates**: Write to a fast append-only log (Kafka, Redis Stream), aggregate periodically with a background job. Accept that the displayed count is slightly stale.

**Cache hot key mitigation**:

1. **Local caching (L1 cache)**: Cache the hot key in application-server memory. Use short TTL (1-5 seconds) to limit staleness.
\`\`\`
  Request → L1 (in-process, 1s TTL) → L2 (Redis) → Database
  Hot key served from L1, never hits Redis at all
\`\`\`

2. **Replicated cache entries**: Store the hot key under multiple sub-keys in Redis, randomly route reads.
\`\`\`
  GET hot_key:{random(0,7)}  → spreads across 8 Redis slots
\`\`\`

3. **Probabilistic early expiration**: Each reader has a small probability of refreshing the cache before it expires, smoothing the thundering herd on expiry.

**Real-world examples**:
- **DynamoDB adaptive capacity**: Automatically isolates hot partitions and allocates additional throughput
- **Instagram likes**: Async counter pipeline — enqueue increment, background worker batches updates
- **Memcached at Facebook**: Hot keys replicated to dedicated memcached pools with higher capacity`
      },
      {
        question: 'Explain lease-based locking and how it prevents split-brain in distributed systems.',
        answer: `A **lease** is a time-bounded lock — it grants exclusive access to a resource for a fixed duration and automatically expires if not renewed. Leases solve the fundamental problem of distributed locking: what happens when the lock holder crashes and cannot release the lock.

**Lease lifecycle**:
\`\`\`
  T=0s:   Client A acquires lease (TTL=30s)
  T=10s:  Client A renews lease (resets TTL to 30s)
  T=20s:  Client A renews lease (resets TTL to 30s)
  T=25s:  Client A crashes!
  T=50s:  Lease expires (30s after last renewal)
  T=50s:  Client B acquires lease
\`\`\`

**Split-brain prevention with leases**:
\`\`\`
  Scenario without leases:
    Client A holds lock, network partition occurs
    Lock service thinks A is gone, grants lock to B
    A is still running, thinks it holds the lock
    A and B both write → data corruption!

  Scenario with leases + fencing:
    Client A holds lease with fencing_token=7
    Network partition, lease expires after TTL
    Client B acquires lease with fencing_token=8
    Client A's writes are rejected (token 7 < max seen 8)
    Only B's writes succeed
\`\`\`

**Renewal strategy**: The lease holder must renew before expiry. Best practice:
\`\`\`
  Renewal interval = TTL / 3
  TTL = 30s → renew every 10s
  This gives 2 missed renewals before expiry
  Handles transient network blips gracefully
\`\`\`

**Applications of leases**:
1. **Leader election**: The leader holds a lease on a "leader" key. If it fails to renew, another node becomes leader.
2. **Cache leases** (Facebook Memcache): A client gets a lease-token when it observes a cache miss. Only the lease holder can populate the cache, preventing thundering herd.
3. **HDFS leases**: The NameNode grants write leases on files. Only the lease holder can write. If the client dies, the lease expires and the file is available for recovery.

**Trade-offs**:
- Requires reasonably synchronized clocks (the lease holder and the lock server must agree on what "30 seconds" means)
- Short TTL → more renewal traffic, faster failover
- Long TTL → less renewal traffic, slower failover
- Always combine with fencing tokens for true safety`
      },
      {
        question: 'How do you choose between optimistic and pessimistic concurrency control for a given system?',
        answer: `The choice depends on **contention level**, **cost of conflict**, **retry feasibility**, and **latency requirements**.

**Decision framework**:
\`\`\`
  ┌──────────────────────────────────────────────────┐
  │            Contention Level                       │
  │  Low (<5% conflicts)  │  High (>20% conflicts)   │
  ├───────────────────────┼──────────────────────────┤
  │  Optimistic           │  Pessimistic             │
  │  (version/CAS)        │  (locks/leases)          │
  │  - High throughput    │  - No retry waste        │
  │  - No lock overhead   │  - Guaranteed progress   │
  │  - Occasional retry   │  - Lock overhead always  │
  └───────────────────────┴──────────────────────────┘
\`\`\`

**Choose optimistic when**:
1. Most transactions do not conflict (e.g., users editing their own profiles)
2. The computation between read and write is fast and cheap to retry
3. High throughput is more important than individual request latency
4. The system uses a database that supports conditional writes (DynamoDB, PostgreSQL)

**Choose pessimistic when**:
1. Conflicts are frequent and predictable (e.g., inventory decrement during flash sale)
2. The operation involves expensive side effects (external API calls, sending emails)
3. Retries are not feasible or would confuse the user
4. Strict ordering is required (e.g., financial transactions)

**Hybrid approaches in practice**:

1. **Optimistic with escalation**: Start optimistic; if a key experiences N consecutive conflicts, automatically escalate to pessimistic for that key.
\`\`\`
  attempt = 0
  while true:
    if attempt < 3:
      result = optimistic_write(key, value, version)
    else:
      acquire_lock(key)
      result = direct_write(key, value)
      release_lock(key)
    if result.success: break
    attempt++
\`\`\`

2. **Multi-Version Concurrency Control (MVCC)**: Readers never block. Writers create new versions. Used by PostgreSQL, CockroachDB, Spanner.
\`\`\`
  Reader at T=5 sees version at T=5 (snapshot isolation)
  Writer at T=7 creates new version
  Reader at T=5 is unaffected
  No read-write contention at all
\`\`\`

3. **Partitioned resources**: Reduce contention by partitioning the resource so different writers target different partitions (same as hot key sharding).

**Rule of thumb**: Default to optimistic. Switch to pessimistic only when you measure high conflict rates or when retries have unacceptable side effects.`
      },
    ],

    dataModel: {
      description: 'Lock state and contention tracking',
      schema: `Optimistic Lock State (database row):
  resource_id:     primary key
  data:            the protected resource value
  version:         monotonically increasing integer
  updated_at:      timestamp of last successful write
  updated_by:      ID of last writer

Distributed Lock (Redis):
  key:             "lock:{resource_id}"
  value:           unique_token (UUID)
  ttl:             seconds until auto-expiry
  acquired_at:     timestamp

Lease Record:
  lease_id:        UUID
  resource_id:     the locked resource
  holder_id:       client/node holding the lease
  fencing_token:   monotonic integer for fencing
  granted_at:      timestamp
  expires_at:      timestamp (granted_at + TTL)
  renewed_at:      timestamp of last renewal
  status:          active | expired | released

Contention Metrics:
  resource_id:     the monitored resource
  conflict_count:  number of CAS failures in window
  lock_wait_p99:   99th percentile lock wait time
  escalated:       boolean (switched to pessimistic)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 15. Multi-step Processes (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'multi-step-processes',
    title: 'Multi-step Processes',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 7,
    description: 'Orchestrating distributed transactions across services using sagas, compensating transactions, and event-driven choreography.',
    concepts: [
      'Saga pattern',
      'Orchestration vs choreography',
      'Compensating transactions',
      'Idempotency keys',
      'Two-phase commit limitations',
      'Dead letter queues',
      'Exactly-once processing',
    ],
    tips: [
      'Sagas replace distributed transactions — each step has a compensating action that undoes it on failure',
      'Prefer orchestration for complex flows with many steps — a central coordinator is easier to reason about and debug',
      'Use choreography for simple, decoupled flows between 2-3 services where each service owns its own logic',
      'Every step must be idempotent — network retries will cause duplicate deliveries',
      'Dead letter queues are essential for capturing failed messages that exceed retry limits',
    ],

    introduction: `In a monolithic application, a business operation like "place an order" can be wrapped in a single database transaction — all steps succeed or all are rolled back atomically. In a microservices architecture, this same operation spans multiple services (order service, payment service, inventory service, shipping service), each with its own database. A traditional distributed transaction using two-phase commit (2PC) is impractical at scale because it requires all participants to be available and introduces a coordinator as a single point of failure.

The **saga pattern** is the standard alternative. A saga breaks a distributed transaction into a sequence of local transactions, each executed by a different service. If any step fails, the saga executes **compensating transactions** for all previously completed steps, effectively undoing the work. Unlike 2PC, a saga does not hold locks across services — it trades atomicity for availability and partition tolerance.

There are two saga coordination approaches: **orchestration** and **choreography**. In orchestration, a central saga coordinator tells each service what to do and handles failures. In choreography, services communicate through events — each service listens for events from the previous step and publishes events for the next. Orchestration is easier to understand and debug for complex flows; choreography is more decoupled but harder to trace when things go wrong. Most production systems use orchestration for critical business flows and choreography for simpler, loosely coupled integrations.`,

    keyQuestions: [
      {
        question: 'Explain the saga pattern with a concrete example of an e-commerce order flow.',
        answer: `**Order placement saga** — a five-step distributed transaction:

\`\`\`
  Step 1: Create Order (Order Service)
    → Local TX: INSERT order with status=PENDING
    → Compensation: UPDATE order SET status=CANCELLED

  Step 2: Reserve Inventory (Inventory Service)
    → Local TX: UPDATE stock SET reserved += quantity WHERE product_id=X
    → Compensation: UPDATE stock SET reserved -= quantity

  Step 3: Process Payment (Payment Service)
    → Local TX: charge customer's payment method
    → Compensation: issue refund

  Step 4: Confirm Order (Order Service)
    → Local TX: UPDATE order SET status=CONFIRMED
    → Compensation: UPDATE order SET status=CANCELLED

  Step 5: Schedule Shipping (Shipping Service)
    → Local TX: create shipment record
    → Compensation: cancel shipment
\`\`\`

**Happy path**:
\`\`\`
  Create Order → Reserve Inventory → Process Payment → Confirm → Ship
       ✓              ✓                  ✓               ✓        ✓
\`\`\`

**Failure at step 3 (payment fails)**:
\`\`\`
  Create Order → Reserve Inventory → Process Payment (FAILS!)
       ✓              ✓                  ✗
       ◄──────────────◄──── Compensate ──┘
  Release Inventory ← Cancel Order
       ✓                    ✓
\`\`\`

**Key design decisions**:
- Each step publishes an event or calls the orchestrator on completion
- Compensating transactions must be idempotent (payment refund with idempotency key)
- Intermediate states are visible to users — the order shows as "processing" during the saga
- Timeouts on each step trigger compensation if a service is unresponsive`
      },
      {
        question: 'Compare orchestration vs choreography for saga coordination.',
        answer: `**Orchestration** — centralized coordinator:
\`\`\`
                    ┌──────────────┐
                    │    Saga      │
                    │ Orchestrator │
                    └──────┬───────┘
                           │
        ┌──────────┬───────┼───────┬──────────┐
        ▼          ▼       ▼       ▼          ▼
    ┌───────┐ ┌────────┐ ┌─────┐ ┌───────┐ ┌──────┐
    │Order  │ │Inventory│ │Pay  │ │Confirm│ │Ship  │
    │Service│ │Service  │ │Svc  │ │       │ │Svc   │
    └───────┘ └────────┘ └─────┘ └───────┘ └──────┘
\`\`\`

- Orchestrator contains the saga definition (step sequence, compensation logic)
- Each service exposes "execute" and "compensate" endpoints
- Orchestrator tracks saga state in its database
- Easy to add new steps, change order, or add branching logic

**Choreography** — decentralized events:
\`\`\`
    ┌───────┐    order.created    ┌────────┐   inventory.reserved   ┌─────┐
    │Order  │ ──────────────────► │Inventory│ ────────────────────► │Pay  │
    │Service│                     │Service  │                       │Svc  │
    └───────┘                     └────────┘                       └─────┘
        ▲                                                              │
        │                    payment.completed                         │
        └──────────────────────────────────────────────────────────────┘
\`\`\`

- Each service listens for events and publishes its own
- No central coordinator — logic is distributed
- Adding a new step requires modifying multiple services

**Comparison**:
\`\`\`
  ┌────────────────────┬─────────────────┬──────────────────┐
  │ Aspect             │ Orchestration   │ Choreography     │
  ├────────────────────┼─────────────────┼──────────────────┤
  │ Complexity visible │ One place       │ Spread across    │
  │ Coupling           │ Orchestrator    │ Loose (events)   │
  │                    │ knows all svcs  │                  │
  │ Debugging          │ Centralized log │ Distributed trace│
  │ Adding steps       │ Modify coord.   │ Modify multiple  │
  │ Single point of    │ Orchestrator    │ None             │
  │ failure            │ (mitigate with  │                  │
  │                    │  HA/replicas)   │                  │
  │ Best for           │ 4+ step flows   │ 2-3 step flows   │
  └────────────────────┴─────────────────┴──────────────────┘
\`\`\`

**Recommendation**: Use orchestration for the core business flow (order placement, account creation). Use choreography for auxiliary, loosely coupled concerns (analytics events, cache invalidation, notification triggers).`
      },
      {
        question: 'How do you ensure idempotency in multi-step processes?',
        answer: `**Idempotency** means executing the same operation multiple times produces the same result as executing it once. In distributed systems, network retries, duplicate message delivery, and at-least-once semantics make idempotency essential — without it, a retried payment could charge the customer twice.

**Idempotency key pattern**:
\`\`\`
  Client generates a unique key per business operation:
    POST /payments
    Idempotency-Key: pay_abc123_attempt1
    {amount: 100, currency: "USD"}

  Server checks:
    1. Lookup idempotency_key in store
    2. If found → return cached response (already processed)
    3. If not found → process, store result, return response
\`\`\`

**Database implementation**:
\`\`\`
  CREATE TABLE idempotency_keys (
    key          VARCHAR PRIMARY KEY,
    request_hash VARCHAR,      -- hash of request body
    response     JSONB,        -- cached response
    status       VARCHAR,      -- pending | completed | failed
    created_at   TIMESTAMP,
    expires_at   TIMESTAMP     -- cleanup old keys
  );

  -- Processing with idempotency:
  BEGIN;
    INSERT INTO idempotency_keys (key, status)
    VALUES ('pay_abc123', 'pending')
    ON CONFLICT (key) DO NOTHING;

    -- If INSERT succeeded (rows_affected=1), process payment
    -- If INSERT failed (duplicate), return cached response
  COMMIT;
\`\`\`

**Making operations naturally idempotent**:
\`\`\`
  ✗ Non-idempotent: UPDATE balance SET amount = amount + 100
    (retrying adds 100 again!)

  ✓ Idempotent: UPDATE balance SET amount = 1100 WHERE amount = 1000
    (second attempt is a no-op because amount is already 1100)

  ✓ Idempotent with transaction ID:
    INSERT INTO transactions (tx_id, amount)
    VALUES ('tx_abc', 100)
    ON CONFLICT (tx_id) DO NOTHING;
    -- Duplicate is silently ignored
\`\`\`

**Saga-specific idempotency considerations**:
- Each saga step must be idempotent (the orchestrator may retry after a timeout)
- Each compensating transaction must be idempotent (compensation may be triggered multiple times)
- Use the saga_id + step_number as a natural idempotency key
- Store the saga state machine in the database — the current state determines which step to execute or retry`
      },
      {
        question: 'What are the limitations of two-phase commit (2PC) and why do sagas replace it?',
        answer: `**Two-phase commit** is a distributed transaction protocol where a coordinator ensures all participants either commit or abort together.

**2PC protocol**:
\`\`\`
  Phase 1 — Prepare:
    Coordinator → Participant A: "Can you commit?"
    Coordinator → Participant B: "Can you commit?"
    Participant A → Coordinator: "Yes" (locks held)
    Participant B → Coordinator: "Yes" (locks held)

  Phase 2 — Commit:
    Coordinator → Participant A: "Commit"
    Coordinator → Participant B: "Commit"
    Both commit and release locks
\`\`\`

**Limitations**:

1. **Blocking protocol**: If the coordinator crashes after Phase 1 (all participants voted "yes") but before Phase 2, all participants are stuck holding locks, waiting for a decision that may never come. No participant can safely commit or abort on its own.

2. **Latency**: Requires at least 2 round-trips to all participants, plus the time participants hold locks. In a microservices architecture with services in different regions, this adds significant latency.

3. **Availability**: If any single participant is unavailable during the prepare phase, the entire transaction must abort. The availability of the system is the product of individual service availabilities.

4. **Heterogeneous systems**: 2PC requires all participants to implement the same transaction protocol. In practice, different services use different databases, message queues, and external APIs — not all support XA transactions.

5. **Scale**: Lock duration increases with the number of participants. Hot rows locked by a 2PC transaction block all other transactions on those rows.

**Why sagas are preferred**:
\`\`\`
  ┌─────────────────┬──────────────┬──────────────┐
  │ Property        │ 2PC          │ Saga         │
  ├─────────────────┼──────────────┼──────────────┤
  │ Consistency     │ Strong       │ Eventual     │
  │ Availability    │ Low          │ High         │
  │ Lock duration   │ Entire TX    │ Per step     │
  │ Partial failure │ Blocks       │ Compensates  │
  │ Coordinator     │ SPOF         │ Recoverable  │
  │ Heterogeneous   │ Needs XA     │ Any service  │
  │ Isolation       │ Full         │ Semantic     │
  └─────────────────┴──────────────┴──────────────┘
\`\`\`

**Where 2PC still makes sense**: Within a single database (PostgreSQL uses 2PC internally for multi-statement transactions). Across a small number of tightly coupled, co-located services where strong consistency is non-negotiable.`
      },
      {
        question: 'How do you handle failure scenarios in sagas — partial failures, timeouts, and poison messages?',
        answer: `Failure handling is the most critical aspect of saga design. Every failure mode must be explicitly addressed.

**Partial failure — compensating transactions**:
\`\`\`
  Saga: [Step1, Step2, Step3, Step4, Step5]
  Step3 fails:
    → Compensate Step2 (undo_step2)
    → Compensate Step1 (undo_step1)
    → Mark saga as COMPENSATED
\`\`\`

Compensations run in reverse order. Each compensation must be idempotent and must succeed eventually. If a compensation itself fails, it is retried with exponential backoff.

**Timeout handling**:
\`\`\`
  Saga orchestrator tracks:
    step_started_at: timestamp
    step_timeout:    30 seconds (configurable per step)

  If step_timeout exceeded:
    1. Mark step as TIMED_OUT
    2. Attempt to cancel the in-progress operation
    3. If cancellation fails, add to manual review queue
    4. Begin compensation for completed steps
\`\`\`

**Poison messages (messages that always fail)**:
\`\`\`
  Message → Consumer → Fails → Retry → Fails → Retry → Fails
                                                         │
                                                         ▼
                                                    Dead Letter Queue
                                                         │
                                                         ▼
                                                  Alert + Manual Review
\`\`\`

After N retries (typically 3-5), move the message to a dead letter queue (DLQ). This prevents a single bad message from blocking all subsequent messages in the queue.

**Saga state machine**:
\`\`\`
  STARTED → STEP1_PENDING → STEP1_COMPLETED
    → STEP2_PENDING → STEP2_COMPLETED
    → STEP3_PENDING → STEP3_FAILED
    → COMPENSATING_STEP2 → STEP2_COMPENSATED
    → COMPENSATING_STEP1 → STEP1_COMPENSATED
    → COMPENSATED (terminal)
\`\`\`

Persist the state machine in the database. On recovery after a crash, the orchestrator reads the current state and resumes from where it left off.

**Non-compensatable steps**: Some steps cannot be undone (e.g., sending an email, shipping a physical product). Place these as late as possible in the saga, after all steps that might fail. If a non-compensatable step must be earlier, use a "pending" state (draft the email but do not send it until the saga completes).`
      },
      {
        question: 'How do you achieve exactly-once processing in distributed systems?',
        answer: `True exactly-once processing is impossible in a distributed system with unreliable networks (proven by the Two Generals problem). However, you can achieve **effectively exactly-once** by combining **at-least-once delivery** with **idempotent processing**.

**The equation**:
\`\`\`
  Effectively exactly-once = At-least-once delivery + Idempotent consumer
\`\`\`

**At-least-once delivery**: The message system retries until it receives an acknowledgment. This guarantees no message is lost but may deliver duplicates.

**Idempotent consumer**: The consumer detects and ignores duplicate messages.

**Implementation pattern — transactional outbox + deduplication**:
\`\`\`
  Producer Side (Outbox Pattern):
    BEGIN;
      UPDATE orders SET status = 'confirmed';
      INSERT INTO outbox (id, topic, payload) VALUES (...);
    COMMIT;
    -- Outbox relay reads and publishes to Kafka
    -- On success, marks outbox row as published

  Consumer Side (Deduplication):
    BEGIN;
      SELECT 1 FROM processed_messages WHERE msg_id = ?;
      IF NOT FOUND:
        -- Process the message
        INSERT INTO processed_messages (msg_id) VALUES (?);
    COMMIT;
\`\`\`

**Kafka's exactly-once semantics**:
\`\`\`
  Producer:
    enable.idempotence=true
    transactional.id="order-processor-1"

  Consumer:
    isolation.level=read_committed

  This ensures:
    - Producer deduplicates retries (sequence numbers per partition)
    - Consumer only sees committed messages
    - Consume-transform-produce cycles are atomic
\`\`\`

**Key insight**: Exactly-once is not a property of the transport layer alone — it requires cooperation between the producer, the transport, and the consumer. The transport provides at-least-once; the consumer provides deduplication; together they achieve effectively exactly-once.

**Common pitfall**: Acknowledging a message before processing it completely (at-most-once) or processing before acknowledging (at-least-once with risk of duplicates). Always process and acknowledge in the same atomic operation (database transaction).`
      },
      {
        question: 'How would you design a saga for a payment processing pipeline with refunds?',
        answer: `**Payment saga with refund support** — handling the full lifecycle from authorization to settlement to potential refund.

**Forward flow (authorization and capture)**:
\`\`\`
  Step 1: Validate Order
    → Check inventory, pricing, user account
    → Compensation: none (read-only)

  Step 2: Authorize Payment
    → Call payment gateway: authorize(amount, card_token)
    → Returns: authorization_id
    → Compensation: void authorization (reverseAuth)

  Step 3: Reserve Inventory
    → Decrement available stock
    → Compensation: release reserved stock

  Step 4: Capture Payment
    → Call payment gateway: capture(authorization_id)
    → Compensation: refund(capture_id, amount)

  Step 5: Confirm and Notify
    → Update order status, send confirmation email
    → Compensation: send cancellation email
\`\`\`

**Refund saga** (triggered by customer request or dispute):
\`\`\`
  Step 1: Validate Refund Request
    → Check eligibility, time window, refund policy
    → Create refund record with status=PENDING

  Step 2: Process Refund via Gateway
    → Call: refund(original_capture_id, amount)
    → Idempotency key: refund_{order_id}_{attempt}
    → Gateway returns refund_id

  Step 3: Update Inventory
    → If physical product returned: increment stock
    → If digital product: revoke access

  Step 4: Update Accounting
    → Credit customer account, debit revenue
    → Generate credit note

  Step 5: Notify Customer
    → Send refund confirmation email
    → Update order status to REFUNDED
\`\`\`

**Critical design decisions**:
1. **Authorization vs capture**: Separate auth from capture. Auth is fully reversible (void). Capture triggers actual money movement and requires a refund to undo.
2. **Partial refunds**: Support refunding a subset of items. Track refunded amounts to prevent over-refunding.
3. **Timeout on authorization**: Payment authorizations expire (typically 7 days). The saga must capture before expiry or re-authorize.
4. **Refund window**: Payment processors have refund time limits (60-120 days). After that, disputes go through chargeback.
5. **Idempotency everywhere**: Network retries to the payment gateway are inevitable. Every gateway call must include an idempotency key to prevent double charges or double refunds.`
      },
    ],

    dataModel: {
      description: 'Saga state machine and step tracking',
      schema: `Saga Instance:
  saga_id:         UUID
  saga_type:       e.g., "order_placement", "payment_refund"
  status:          STARTED | RUNNING | COMPENSATING | COMPLETED | COMPENSATED | FAILED
  current_step:    integer (index into step list)
  payload:         JSON (initial input data)
  created_at:      timestamp
  updated_at:      timestamp
  completed_at:    timestamp (null if in progress)

Saga Step:
  saga_id:         reference to saga
  step_index:      integer (execution order)
  step_name:       e.g., "reserve_inventory"
  status:          PENDING | EXECUTING | COMPLETED | FAILED | COMPENSATING | COMPENSATED
  request:         JSON (input to this step)
  response:        JSON (output from this step)
  idempotency_key: unique key for this step execution
  started_at:      timestamp
  completed_at:    timestamp
  retry_count:     integer
  error:           text (if failed)

Dead Letter Entry:
  dlq_id:          UUID
  saga_id:         reference to saga
  step_index:      failed step
  message:         original message payload
  error:           failure reason
  retry_count:     number of attempts before DLQ
  created_at:      timestamp
  resolved_at:     timestamp (null until manually resolved)`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 16. Scaling Reads (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'scaling-reads',
    title: 'Scaling Reads',
    icon: 'bookOpen',
    color: '#06b6d4',
    questions: 8,
    description: 'Strategies for read-heavy workloads including read replicas, caching hierarchies, denormalization, materialized views, and CQRS.',
    concepts: [
      'Read replicas and replication lag',
      'Caching hierarchy (L1/L2/CDN)',
      'Cache-aside vs read-through',
      'Denormalization and materialized views',
      'CQRS (Command Query Responsibility Segregation)',
      'Cache invalidation strategies',
      'CDN for static and dynamic content',
    ],
    tips: [
      'The most common read-scaling pattern is cache-aside with Redis — read from cache first, fall back to DB on miss, populate cache on miss',
      'Read replicas add read capacity but introduce replication lag — design for eventual consistency or use read-your-writes consistency',
      'CDN is the most cost-effective scaling layer for static content and semi-static API responses',
      'Materialized views trade write-time cost for read-time speed — ideal for dashboards and analytics',
      'In interviews, always discuss cache invalidation — it is famously the hardest problem in computer science',
    ],

    introduction: `Most web applications are **read-heavy** — the ratio of reads to writes is typically 10:1 to 1000:1. A social media feed, a product catalog, a news site, or a dashboard all serve far more reads than writes. Scaling reads is therefore the most impactful optimization for most systems.

The fundamental strategies for scaling reads form a **hierarchy of caching and replication**: client-side caching (browser, mobile app), CDN edge caching, application-level caching (L1 in-process, L2 distributed cache like Redis), read replicas (database-level horizontal scaling), and denormalization or materialized views (pre-computing expensive joins). Each layer reduces load on the layers below it.

The challenge in all caching and replication strategies is **consistency** — how stale can the data be? A stock price that is 5 seconds old may be acceptable, but an account balance that is 5 seconds old is not. Understanding the consistency requirements of each data type in your system is the key to choosing the right scaling strategy. Patterns like **CQRS** (Command Query Responsibility Segregation) formalize this by separating the write model (optimized for consistency) from the read model (optimized for performance).`,

    keyQuestions: [
      {
        question: 'Explain the caching hierarchy (L1/L2/CDN) and how requests flow through it.',
        answer: `**Caching hierarchy** — each layer intercepts requests before they reach the database:

\`\`\`
  Client ─► CDN Edge ─► Load Balancer ─► App Server ─► Redis (L2) ─► Database
                                             │
                                         L1 Cache
                                      (in-process)
\`\`\`

**Layer 1 — CDN (Content Delivery Network)**:
- Caches at the network edge, closest to the user
- Best for: static assets (images, JS, CSS), semi-static API responses (product catalog)
- TTL-based invalidation or explicit purge
- Cache hit ratio for static content: 90-99%
- Examples: CloudFront, Cloudflare, Fastly

**Layer 2 — L1 In-Process Cache (Application Server)**:
- Local memory cache within each application server process
- Best for: frequently accessed, small data (configuration, feature flags, user sessions)
- Fastest access (~microseconds) but limited by server memory
- Challenge: cache coherence across multiple servers (each has its own L1)
- Typical TTL: 1-60 seconds
- Implementation: LRU map, Guava cache, Node.js Map with TTL

**Layer 3 — L2 Distributed Cache (Redis/Memcached)**:
- Shared cache accessible by all application servers
- Best for: database query results, computed aggregations, session data
- Access time: ~1ms (network round-trip)
- Scales horizontally (Redis Cluster, Memcached consistent hashing)
- Cache hit ratio: 70-95% depending on data patterns

**Layer 4 — Database (Source of Truth)**:
- Only reached on cache miss at all levels
- With a well-designed caching hierarchy, database load is reduced by 90-99%

**Request flow example** (fetching a product):
\`\`\`
  1. CDN: Cache-Control header? HIT → return (0ms latency)
  2. CDN MISS → forward to app server
  3. L1 cache: in-process LRU? HIT → return (0.01ms)
  4. L1 MISS → check L2
  5. L2 (Redis): GET product:42? HIT → return, populate L1 (1ms)
  6. L2 MISS → query database
  7. DB: SELECT * FROM products WHERE id=42 (5-50ms)
  8. Populate L2 and L1, return response
  9. Set Cache-Control header for CDN
\`\`\``
      },
      {
        question: 'Compare cache-aside, read-through, and write-through caching patterns.',
        answer: `**Cache-Aside (Lazy Loading)** — most common pattern:
\`\`\`
  Read path:
    1. App checks cache (GET key)
    2. Cache HIT → return data
    3. Cache MISS → query database
    4. App writes result to cache (SET key value TTL)
    5. Return data

  Write path:
    1. App writes to database
    2. App invalidates cache (DEL key)
    3. Next read will repopulate cache
\`\`\`
- App controls all caching logic
- Cache only contains data that has been requested (no wasted memory)
- Risk: cache stampede on popular key expiry (many requests simultaneously miss)

**Read-Through** — cache manages DB reads:
\`\`\`
  Read path:
    1. App reads from cache (always)
    2. Cache HIT → return data
    3. Cache MISS → cache itself queries database
    4. Cache stores result and returns to app

  App never talks directly to DB for reads
\`\`\`
- Simpler application code (no cache-miss handling)
- Cache library/provider must support DB integration
- Used by: Hibernate L2 cache, NCache, some Redis modules

**Write-Through** — cache manages DB writes:
\`\`\`
  Write path:
    1. App writes to cache
    2. Cache writes to database (synchronously)
    3. Both cache and DB are updated atomically
    4. Return success to app

  Read path:
    Always from cache (data is always fresh)
\`\`\`
- Cache is always consistent with DB
- Write latency is higher (cache + DB write)
- Used with read-through for a complete caching layer

**Write-Behind (Write-Back)**:
\`\`\`
  Write path:
    1. App writes to cache
    2. Cache acknowledges immediately
    3. Cache asynchronously writes to database (batched)
\`\`\`
- Lowest write latency
- Risk of data loss if cache crashes before flushing to DB
- Good for write-heavy workloads where slight data loss is tolerable (analytics, counters)

**Comparison**:
\`\`\`
  ┌────────────────┬───────────┬──────────────┬─────────────┐
  │ Pattern        │ Read perf │ Write perf   │ Consistency │
  ├────────────────┼───────────┼──────────────┼─────────────┤
  │ Cache-aside    │ Good      │ Good         │ Eventual    │
  │ Read-through   │ Good      │ Good         │ Eventual    │
  │ Write-through  │ Excellent │ Slower       │ Strong      │
  │ Write-behind   │ Excellent │ Excellent    │ Weak        │
  └────────────────┴───────────┴──────────────┴─────────────┘
\`\`\``
      },
      {
        question: 'How do read replicas work and how do you handle replication lag?',
        answer: `**Read replicas** are copies of the primary database that handle read queries, distributing read load across multiple servers.

**Architecture**:
\`\`\`
  Writes ──► Primary DB ──► Replication Stream ──► Replica 1 (reads)
                                                 ──► Replica 2 (reads)
                                                 ──► Replica 3 (reads)
  Reads  ──► Load Balancer ──► Replica 1/2/3
\`\`\`

**Replication types**:
- **Synchronous**: Primary waits for replica acknowledgment before confirming write. Zero lag but higher write latency.
- **Asynchronous**: Primary confirms write immediately, replica catches up later. Lower write latency but introduces replication lag.
- **Semi-synchronous**: Primary waits for at least one replica (MySQL semi-sync).

**Replication lag** — the delay between a write on the primary and its appearance on replicas. Typical: 10ms-1s for async replication, but can spike to minutes under load.

**Handling replication lag**:

1. **Read-your-writes consistency**: After a user writes data, ensure their subsequent reads see that write.
\`\`\`
  User updates profile → response includes version=42
  User reads profile:
    If version param = 42, route to primary (or wait for replica to catch up)
    Else route to any replica
\`\`\`

2. **Monotonic reads**: Ensure a user does not see data go "backward" (reading from a stale replica after reading from an up-to-date one). Pin user sessions to a specific replica.

3. **Lag monitoring and routing**:
\`\`\`
  Replica lag monitor:
    Replica 1: lag = 50ms   ✓ routable
    Replica 2: lag = 200ms  ✓ routable
    Replica 3: lag = 5s     ✗ remove from rotation

  Route reads to replicas with lag < threshold
\`\`\`

4. **Critical reads to primary**: For operations where staleness is unacceptable (checking balance before debit), always read from the primary.

**Scaling read replicas**:
- PostgreSQL: streaming replication, up to dozens of replicas
- MySQL: async/semi-sync replication, read-only replicas
- Aurora: up to 15 read replicas with shared storage (near-zero lag)
- DynamoDB: Global tables for multi-region read replicas`
      },
      {
        question: 'What is CQRS and when should you use it?',
        answer: `**CQRS (Command Query Responsibility Segregation)** separates the write model (commands) from the read model (queries) into different data stores, each optimized for its access pattern.

**Architecture**:
\`\`\`
  Commands (writes)              Queries (reads)
       │                              ▲
       ▼                              │
  ┌─────────┐                   ┌──────────┐
  │ Write   │ ──── Events ────► │ Read     │
  │ Model   │    (async sync)   │ Model    │
  │ (RDBMS) │                   │ (Elastic/│
  └─────────┘                   │  Redis)  │
                                └──────────┘
\`\`\`

**Write model**: Normalized, optimized for consistency and transactional integrity. Handles validations, business rules, and state transitions.

**Read model**: Denormalized, pre-joined, optimized for specific query patterns. Can use a different database technology (Elasticsearch for search, Redis for fast lookups, materialized views for dashboards).

**How sync works**: When the write model processes a command, it emits domain events. Event handlers update the read model asynchronously.

**When to use CQRS**:
1. **Vastly different read and write patterns**: The write model is a normalized relational schema, but reads require complex joins, aggregations, or full-text search.
2. **Read and write scale independently**: 1000:1 read-to-write ratio — scale read infrastructure without affecting write path.
3. **Multiple read representations**: The same data needs to be queried differently by different consumers (e.g., product data in SQL for admin, Elasticsearch for customer search, Redis for recommendations).

**When NOT to use CQRS**:
1. Simple CRUD applications where reads and writes have similar patterns
2. Small scale where a single database handles both comfortably
3. When strong consistency is required for all reads (CQRS introduces eventual consistency between write and read models)

**CQRS with Event Sourcing** (often combined):
\`\`\`
  Command → Validate → Store Event → Event Store (source of truth)
                                         │
                                    Event Handler → Update Read Model 1
                                         │
                                    Event Handler → Update Read Model 2
\`\`\`

The event store is append-only (immutable log of state changes). Read models are projections that can be rebuilt from the event stream at any time. This combination provides complete audit history and the ability to create new read models retroactively.`
      },
      {
        question: 'How do you handle cache invalidation in a distributed system?',
        answer: `Cache invalidation is famously one of the hardest problems in computer science. The challenge: cached data must reflect changes in the source of truth, but the cache and the database are separate systems with no transactional guarantee linking them.

**Strategy 1 — TTL-based expiration**:
\`\`\`
  SET product:42 "{...}" EX 300   (expire after 5 minutes)
\`\`\`
- Simplest approach — no explicit invalidation needed
- Data can be stale up to the TTL duration
- Good for: data that changes infrequently and where staleness is acceptable
- Risk: stale data served for the full TTL; thundering herd on popular key expiry

**Strategy 2 — Event-driven invalidation**:
\`\`\`
  Write to DB → Publish event → Cache subscriber → DEL key

  Product updated in DB
    → Kafka event: product.updated {id: 42}
    → Cache invalidation service: DEL product:42
    → Next read repopulates from DB
\`\`\`
- Near-real-time invalidation (milliseconds after write)
- More complex infrastructure (event bus, subscriber service)
- Risk: event delivery failure leaves stale data (mitigate with TTL as backstop)

**Strategy 3 — Write-through invalidation**:
\`\`\`
  Application write path:
    1. Update database
    2. Delete cache key (invalidate)
    -- NOT: update cache key (race condition!)
\`\`\`

**Why delete, not update?** Race condition with concurrent writes:
\`\`\`
  T1: Thread A writes value=100 to DB
  T2: Thread B writes value=200 to DB
  T3: Thread B updates cache to 200
  T4: Thread A updates cache to 100 (stale!)

  With delete:
  T1: Thread A writes 100 to DB, deletes cache
  T2: Thread B writes 200 to DB, deletes cache
  T3: Next read gets 200 from DB (correct)
\`\`\`

**Strategy 4 — Cache versioning**:
\`\`\`
  Key: product:42:v7
  On update: increment version → product:42:v8
  Old cached value (v7) is never read — effectively invalidated
  Clean up old versions asynchronously
\`\`\`

**Thundering herd prevention on cache miss**:
\`\`\`
  1. Lock-based: First request acquires a lock, fetches from DB,
     populates cache. Other requests wait for the lock.
  2. Stale-while-revalidate: Serve stale data while one request
     refreshes in the background.
  3. Probabilistic early expiration: Each reader has a small chance
     of refreshing before TTL, spreading the refresh load.
\`\`\`

**Best practice**: Use TTL as a safety net (backstop) combined with event-driven invalidation for near-real-time freshness. Never rely solely on TTL for data that changes frequently, and never rely solely on events for data where a missed event would cause serious problems.`
      },
      {
        question: 'How would you design a read-optimized system for a social media news feed?',
        answer: `The news feed is the canonical read-scaling problem. Users check their feed far more often than they post (100:1+ read-to-write ratio). The feed aggregates posts from all followed users, sorted by relevance or time.

**Architecture — fanout-on-write with caching**:
\`\`\`
  User posts ──► Post Service ──► Fanout Service ──► Feed Cache (per user)
                                                         │
  User reads feed ──► Feed Service ──► Feed Cache ───────┘
                                          │ (miss)
                                          ▼
                                    Feed Generator
                                    (query + merge)
\`\`\`

**Fanout-on-write**:
\`\`\`
  User A (1000 followers) posts:
    1. Store post in posts table
    2. Fanout service reads A's follower list
    3. For each follower, prepend post_id to their feed cache:
       LPUSH feed:user_123 post_id
       LPUSH feed:user_456 post_id
       ... (1000 writes)
    4. Trim feed to latest 500 entries:
       LTRIM feed:user_123 0 499
\`\`\`

**Celebrity/hot-user optimization (hybrid fanout)**:
\`\`\`
  Regular users (<10K followers): fanout-on-write
  Celebrities (>10K followers): fanout-on-read

  Feed assembly (on read):
    1. Fetch pre-computed feed from cache (fanout-on-write results)
    2. Fetch latest posts from followed celebrities (fanout-on-read)
    3. Merge, rank, and return top N
\`\`\`

**Caching layers**:
\`\`\`
  L1: CDN — cache feed API responses for 30 seconds (Cache-Control)
  L2: Redis — per-user feed cache (list of post_ids)
  L3: Redis — post content cache (hash per post with text, images, counts)
  L4: Database — posts table, follows table (source of truth)
\`\`\`

**Read path optimization**:
\`\`\`
  GET /feed?cursor=last_post_id&limit=20
    1. Redis LRANGE feed:user_123 offset 20 → [post_ids]
    2. Redis MGET post:id1 post:id2 ... → [post objects]
    3. Enrich with user profiles (cached), like counts (cached)
    4. Return hydrated feed with next cursor

  Total latency: ~5-10ms (all from cache)
  DB queries: 0 (on cache hit)
\`\`\`

**Consistency trade-off**: A new post may take 1-5 seconds to appear in all followers' feeds (async fanout). This is acceptable for a social feed but would not be for a banking transaction ledger.`
      },
      {
        question: 'What are materialized views and how do they help scale reads?',
        answer: `A **materialized view** is a pre-computed query result stored as a physical table. Unlike a regular view (which re-executes the query on every read), a materialized view is computed once and read directly — trading storage and write-time computation for dramatically faster reads.

**Example — dashboard analytics**:
\`\`\`
  Base tables:
    orders (100M rows): order_id, user_id, product_id, amount, created_at
    products (1M rows): product_id, category, name

  Expensive query (runs in 30 seconds):
    SELECT category, DATE(created_at), SUM(amount), COUNT(*)
    FROM orders JOIN products ON orders.product_id = products.product_id
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY category, DATE(created_at)

  Materialized view (reads in 5ms):
    CREATE MATERIALIZED VIEW daily_sales_by_category AS
    SELECT category, DATE(created_at) as day, SUM(amount) as revenue, COUNT(*) as order_count
    FROM orders JOIN products ON orders.product_id = products.product_id
    GROUP BY category, DATE(created_at);

    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_by_category;
\`\`\`

**Refresh strategies**:
1. **Periodic refresh**: Cron job refreshes every N minutes. Simple but data can be stale.
2. **Concurrent refresh** (PostgreSQL): Refreshes without locking the view — readers see old data until refresh completes.
3. **Incremental refresh** (Oracle, some custom implementations): Only process changes since last refresh — much faster for large datasets.
4. **Trigger-based**: Database triggers update the materialized view on each insert/update. Low latency but high write overhead.

**Where materialized views are used**:
\`\`\`
  ┌────────────────────────┬──────────────────────────────┐
  │ Use Case               │ Materialized View            │
  ├────────────────────────┼──────────────────────────────┤
  │ Analytics dashboards   │ Pre-aggregated metrics       │
  │ Search / facets        │ Denormalized product catalog │
  │ Leaderboards           │ Pre-ranked scores            │
  │ Reporting              │ Pre-joined cross-table data  │
  │ Feed generation        │ Pre-computed user feeds      │
  └────────────────────────┴──────────────────────────────┘
\`\`\`

**Custom materialized views (application-level)**:
When the database's built-in materialized views are not sufficient, build your own:
\`\`\`
  Write path:
    1. Write to source table
    2. Publish change event (CDC or outbox)
    3. Stream processor updates materialized table

  Read path:
    1. Query materialized table directly (fast, denormalized)
\`\`\`

This is essentially CQRS — the materialized table is the read model, updated asynchronously from write events. Tools like Kafka Connect, Debezium (CDC), and stream processors (Flink, Kafka Streams) automate this pipeline.`
      },
      {
        question: 'How do you use a CDN for dynamic content, not just static assets?',
        answer: `CDNs are traditionally associated with static assets (images, CSS, JS), but modern CDNs can cache dynamic API responses effectively, reducing origin load by 50-90% for read-heavy APIs.

**Cacheable dynamic content examples**:
\`\`\`
  High cacheability:
    GET /api/products/42          (product details, changes rarely)
    GET /api/categories            (category list, changes daily)
    GET /api/config/feature-flags  (changes on deploy)

  Medium cacheability:
    GET /api/feed/trending         (changes every minute, ok to be 60s stale)
    GET /api/search?q=laptop       (same query = same results for short period)

  Not cacheable:
    GET /api/me/account            (personalized, per-user)
    POST /api/orders               (mutation)
    GET /api/me/notifications      (real-time, per-user)
\`\`\`

**Cache-Control headers for API responses**:
\`\`\`
  // Product page (cache for 5 minutes, revalidate)
  Cache-Control: public, max-age=300, stale-while-revalidate=60

  // User-specific (do not cache at CDN)
  Cache-Control: private, no-store

  // Feature flags (cache for 1 hour)
  Cache-Control: public, max-age=3600

  // Trending feed (cache for 60 seconds)
  Cache-Control: public, max-age=60, stale-if-error=300
\`\`\`

**Vary header for personalized caching**:
\`\`\`
  Vary: Accept-Language, X-Country

  CDN caches separate versions:
    /api/products/42 (en-US) → version A
    /api/products/42 (ja-JP) → version B
\`\`\`

**Edge computing (Cloudflare Workers, Vercel Edge Functions)**:
\`\`\`
  Request → CDN Edge → Edge Function → Cache
                           │ (miss)
                           ▼
                     Origin API Server
                           │
                           ▼
                     Response cached at edge
\`\`\`

Edge functions can assemble personalized responses from cached fragments:
\`\`\`
  Feed page = cached shell + cached trending posts + personalized recommendations
  Only the personalized part hits the origin
\`\`\`

**API response caching with Surrogate Keys** (Fastly, Varnish):
\`\`\`
  Response header: Surrogate-Key: product-42 category-electronics

  On product update:
    PURGE Surrogate-Key: product-42
    → Instantly invalidates all cached responses containing product 42
    → Precise, granular invalidation without TTL delays
\`\`\`

This gives you the performance of aggressive caching with near-real-time invalidation — the best of both worlds for read-heavy APIs.`
      },
    ],

    dataModel: {
      description: 'Read scaling configuration and cache state tracking',
      schema: `Cache Entry (L2 - Redis):
  key:             "entity_type:entity_id" (e.g., "product:42")
  value:           serialized JSON
  ttl:             seconds until expiry
  created_at:      when cached
  source:          "db" | "compute" | "api"
  hit_count:       access counter (for hot key detection)

Read Replica State:
  replica_id:      identifier
  primary_host:    source database
  replication_lag: seconds behind primary
  status:          streaming | catchup | disconnected
  last_applied_lsn: log sequence number

Materialized View Metadata:
  view_name:       identifier
  source_tables:   [table names used in the view]
  last_refresh:    timestamp
  refresh_duration: seconds (last refresh took)
  row_count:       number of rows in materialized view
  schedule:        cron expression for periodic refresh
  status:          fresh | refreshing | stale`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 17. Scaling Writes (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'scaling-writes',
    title: 'Scaling Writes',
    icon: 'edit3',
    color: '#06b6d4',
    questions: 7,
    description: 'Strategies for write-heavy workloads including sharding, write-ahead logs, batching, async writes, and append-only storage.',
    concepts: [
      'Sharding and shard key selection',
      'Write-ahead log and write amplification',
      'Batching and buffering',
      'Async writes and eventual consistency',
      'Append-only storage and LSM trees',
      'Kafka as a write buffer',
    ],
    tips: [
      'Shard key selection is the most critical decision — a bad shard key creates hot shards that negate the benefits of sharding',
      'Batching writes can improve throughput by 10-100x by amortizing disk I/O and network round-trips',
      'Append-only data structures (LSM trees, log-structured storage) turn random writes into sequential writes, which are 100x faster',
      'When writes vastly exceed what a single node can handle, sharding is the only option — caching does not help write scaling',
      'In interviews, always discuss the trade-offs: sharding adds complexity (cross-shard queries, rebalancing), async writes risk data loss',
    ],

    introduction: `While most applications are read-heavy, some systems face extreme write volumes: IoT telemetry ingestion, financial transaction processing, social media interactions (likes, views, impressions), logging and metrics collection, and real-time analytics. Scaling writes is fundamentally harder than scaling reads because writes must eventually reach the source of truth, and that source of truth must maintain consistency.

The primary strategies for scaling writes are: **sharding** (partitioning data across multiple database nodes so writes are distributed), **batching** (grouping many small writes into fewer large writes), **async writes** (acknowledging the write to the client before it is durably stored, using a queue as a buffer), and **append-only storage** (using data structures like LSM trees that convert expensive random writes into cheap sequential writes).

Each strategy has fundamental trade-offs. Sharding distributes write load but makes cross-shard queries expensive and rebalancing painful. Batching increases throughput but adds latency for individual writes. Async writes improve perceived latency but risk data loss if the buffer crashes before flushing. Understanding these trade-offs and choosing the right combination for your workload is the essence of write scaling.`,

    keyQuestions: [
      {
        question: 'How does database sharding work and how do you choose a shard key?',
        answer: `**Sharding** (horizontal partitioning) distributes rows across multiple database nodes. Each node holds a subset of the data, and writes are routed to the correct node based on the shard key.

**Sharding architecture**:
\`\`\`
  Application → Shard Router → Shard 1 (user_id 1-1M)
                             → Shard 2 (user_id 1M-2M)
                             → Shard 3 (user_id 2M-3M)
                             → Shard 4 (user_id 3M-4M)
\`\`\`

**Sharding strategies**:
1. **Range-based**: Shard by ranges of the key (e.g., user_id 1-1M on shard 1). Simple but risks hot shards if data is not uniformly distributed.
2. **Hash-based**: Shard by hash(key) % num_shards. Even distribution but range queries require scatter-gather across all shards.
3. **Directory-based**: A lookup service maps keys to shards. Flexible but the directory is a single point of failure.

**Choosing a shard key — the most critical decision**:
\`\`\`
  Good shard keys:
    user_id     — distributes evenly, most queries are per-user
    tenant_id   — natural isolation for multi-tenant SaaS
    order_id    — even distribution, independent orders

  Bad shard keys:
    created_at  — all recent writes go to the latest shard (hot shard!)
    country     — uneven distribution (most users in a few countries)
    status      — only a few values, cannot distribute across many shards
\`\`\`

**Shard key evaluation criteria**:
1. **Cardinality**: High cardinality (many unique values) for even distribution
2. **Write distribution**: Writes should spread evenly across shards
3. **Query locality**: Most queries should target a single shard (avoid scatter-gather)
4. **Growth pattern**: The key should distribute future data evenly, not concentrate on recent shards

**Cross-shard queries** — the main cost of sharding:
\`\`\`
  Single-shard query (fast):
    SELECT * FROM orders WHERE user_id = 42
    → Routes to shard hash(42) % 4 = shard 2

  Cross-shard query (slow):
    SELECT * FROM orders WHERE created_at > '2024-01-01'
    → Must query ALL shards and merge results (scatter-gather)
\`\`\`

**Resharding**: When you need more shards, data must be redistributed. Consistent hashing minimizes data movement. Some systems (Vitess, CockroachDB) support online resharding.`
      },
      {
        question: 'How does batching improve write throughput and what are the trade-offs?',
        answer: `**Batching** groups multiple individual writes into a single, larger write operation. This amortizes the fixed costs of each write (disk seek, network round-trip, transaction overhead) across many records.

**Why batching is so effective**:
\`\`\`
  Individual writes (1000 inserts):
    1000 × (network round-trip + parse + plan + write + fsync + ack)
    = 1000 × 5ms = 5 seconds

  Batched write (1 batch of 1000):
    1 × (network round-trip + parse + plan + bulk write + fsync + ack)
    = 1 × 50ms = 50 milliseconds

  100x improvement!
\`\`\`

**Batching patterns**:

1. **Application-level batching**:
\`\`\`
  Buffer writes in memory:
    buffer = []
    on_write(record):
      buffer.append(record)
      if len(buffer) >= 1000 or time_since_last_flush > 1s:
        flush(buffer)  → INSERT INTO table VALUES (r1), (r2), ..., (r1000)
        buffer.clear()
\`\`\`

2. **Database-level batching (group commit)**:
\`\`\`
  PostgreSQL group commit:
    Multiple transactions commit in the same fsync call
    wal_writer_delay = 10ms (batch window)
    Amortizes fsync cost across ~100 transactions
\`\`\`

3. **Message queue batching (Kafka)**:
\`\`\`
  Producer config:
    batch.size = 16384        (bytes per batch)
    linger.ms = 5             (wait up to 5ms to fill batch)
    compression.type = lz4    (compress the batch)

  Result: fewer, larger network requests to brokers
\`\`\`

**Trade-offs**:
\`\`\`
  ┌────────────────────┬────────────────────────────────┐
  │ Benefit            │ Cost                           │
  ├────────────────────┼────────────────────────────────┤
  │ Higher throughput   │ Higher latency (wait for batch)│
  │ Less I/O overhead   │ Memory usage for buffer       │
  │ Better compression  │ Data loss risk if crash before │
  │                    │ flush                          │
  │ Fewer connections   │ Retry complexity (partial batch│
  │                    │ failure)                       │
  └────────────────────┴────────────────────────────────┘
\`\`\`

**Tuning**: The batch size and flush interval form a latency-throughput trade-off. Larger batches = higher throughput but more latency. For real-time systems, use small batches with short timeouts (5-10ms). For analytics/logging, use large batches with longer timeouts (1-5 seconds).`
      },
      {
        question: 'How does Kafka serve as a write buffer and what problems does it solve?',
        answer: `**Kafka as a write buffer** decouples fast producers from slow consumers, absorbing write spikes that would overwhelm a database.

**Architecture**:
\`\`\`
  High-volume producers         Kafka             Slow consumers
  (web servers, apps)           (buffer)          (databases, analytics)
       │                          │                    │
  10,000 writes/s ──► Topic ──► Consumer Group ──► Database
                      (partitioned)               (1,000 writes/s)

  Kafka absorbs the 10x difference, consumers drain at their own pace
\`\`\`

**Problems Kafka solves as a write buffer**:

1. **Spike absorption**: Traffic spikes (flash sales, viral events) produce sudden write bursts. Kafka absorbs the burst; consumers process at a steady rate.
\`\`\`
  Without Kafka:
    Spike: 50K writes/s → DB max: 5K writes/s → DB overwhelmed → errors

  With Kafka:
    Spike: 50K writes/s → Kafka absorbs → Consumer: steady 5K writes/s
    Queue depth grows during spike, drains afterward
\`\`\`

2. **Multiple consumers**: One write can feed multiple downstream systems without the producer knowing about them.
\`\`\`
  Producer → Kafka Topic → Consumer 1: Primary DB
                         → Consumer 2: Search index (Elasticsearch)
                         → Consumer 3: Analytics (ClickHouse)
                         → Consumer 4: Cache invalidation
\`\`\`

3. **Ordering guarantees**: Messages with the same partition key are ordered within a partition, enabling ordered processing per entity.

4. **Replay and recovery**: Kafka retains messages for a configurable period (days to weeks). If a consumer crashes, it can replay from its last committed offset.

**Configuration for write buffering**:
\`\`\`
  Topic: user-events
  Partitions: 32 (parallelism for consumers)
  Replication factor: 3 (durability)
  Retention: 7 days (replay window)

  Producer:
    acks=all (durable writes to Kafka)
    compression=lz4 (reduce network/disk)

  Consumer:
    enable.auto.commit=false (manual commit after DB write)
    max.poll.records=500 (batch size per poll)
\`\`\`

**Trade-off**: Using Kafka as a write buffer means the data in the database is eventually consistent — there is a delay between the producer writing to Kafka and the consumer writing to the database. For many use cases (analytics, search indexing, notifications) this delay is acceptable. For others (account balance), it is not.`
      },
      {
        question: 'How do LSM trees and append-only storage optimize write performance?',
        answer: `**LSM trees (Log-Structured Merge trees)** convert random writes into sequential writes, achieving write throughput that is 10-100x higher than traditional B-tree storage.

**The random vs sequential write problem**:
\`\`\`
  B-tree (traditional RDBMS):
    Write → find page → update in-place → random I/O
    ~100-1000 random writes/s per disk

  LSM tree:
    Write → append to WAL → insert into memtable (in-memory)
    → when memtable is full, flush to disk as sorted SSTable
    All disk writes are sequential → 10,000-100,000 writes/s
\`\`\`

**LSM tree write path**:
\`\`\`
  1. Write arrives
  2. Append to Write-Ahead Log (sequential, durable)
  3. Insert into memtable (in-memory sorted structure, e.g., red-black tree)
  4. When memtable reaches threshold (e.g., 64MB):
     → Freeze memtable
     → Flush to disk as immutable SSTable (sorted, sequential write)
     → Create new empty memtable
  5. Background compaction merges SSTables (levels)
\`\`\`

**Compaction** — the background maintenance:
\`\`\`
  Level 0: Recent SSTables (flushed from memtable)
  Level 1: Merged SSTables (compacted from L0)
  Level 2: Larger merged SSTables
  ...

  Compaction: merge overlapping SSTables, discard deleted/overwritten keys
  Size-tiered: merge similar-sized SSTables (Cassandra default)
  Leveled: each level is 10x larger, non-overlapping (RocksDB default)
\`\`\`

**Write amplification** — the cost of LSM trees:
\`\`\`
  A single write may be written multiple times:
    1. WAL (1x)
    2. Memtable flush to L0 SSTable (1x)
    3. Compaction L0 → L1 (1x)
    4. Compaction L1 → L2 (1x)
    ...
  Total write amplification: 10-30x (leveled compaction)
\`\`\`

**LSM trees in practice**:
\`\`\`
  ┌─────────────────┬──────────────────────┐
  │ System          │ LSM Engine           │
  ├─────────────────┼──────────────────────┤
  │ Cassandra       │ Custom LSM           │
  │ RocksDB         │ LevelDB-derived      │
  │ LevelDB         │ Original Google impl │
  │ HBase           │ Custom LSM on HDFS   │
  │ CockroachDB     │ Pebble (Go RocksDB)  │
  │ TiKV (TiDB)    │ RocksDB              │
  │ InfluxDB        │ Custom TSM (time-series)│
  └─────────────────┴──────────────────────┘
\`\`\`

**Trade-off**: LSM trees optimize writes at the cost of reads. Reading a key may require checking the memtable, then each SSTable level. Bloom filters mitigate this — they quickly determine if a key is NOT in an SSTable, avoiding unnecessary disk reads.`
      },
      {
        question: 'How do you handle write conflicts in a sharded or multi-region database?',
        answer: `Write conflicts arise when two writers modify the same data concurrently, especially in systems with multiple active writers (multi-master, multi-region active-active).

**Conflict types**:
\`\`\`
  Lost update:
    T1: read balance=100 → compute 100+50=150 → write 150
    T2: read balance=100 → compute 100-30=70  → write 70
    Result: T2's write overwrites T1's. The +50 is lost.

  Write-write conflict (multi-master):
    Region A: UPDATE user SET name='Alice' WHERE id=1
    Region B: UPDATE user SET name='Bob'   WHERE id=1
    Which write wins?
\`\`\`

**Conflict resolution strategies**:

1. **Last-writer-wins (LWW)**: The write with the highest timestamp wins. Simple but can silently lose data.
\`\`\`
  Region A: {name: "Alice", timestamp: 1000}
  Region B: {name: "Bob",   timestamp: 1001}
  Result: "Bob" wins (higher timestamp)
  Risk: clock skew can cause the "wrong" write to win
\`\`\`

2. **Version vectors**: Track the causal history of each write. Detect true conflicts (concurrent writes) vs resolved ones (one causally follows the other).
\`\`\`
  No conflict (A follows B):
    B: [A:1, B:0] → A: [A:1, B:1]  (A has seen B's write)

  True conflict (concurrent):
    A: [A:2, B:1]  B: [A:1, B:2]
    Neither dominates → conflict → application resolves
\`\`\`

3. **CRDTs (Conflict-free Replicated Data Types)**: Data structures designed so concurrent operations always merge without conflicts.
\`\`\`
  G-Counter (grow-only counter):
    Region A: {A: 5, B: 3}  → total = 8
    Region B: {A: 4, B: 7}  → total = 11
    Merge: {A: max(5,4)=5, B: max(3,7)=7} → total = 12
    No conflict possible!
\`\`\`

4. **Application-level merge**: Store both conflicting versions, let the application or user resolve.
\`\`\`
  Amazon shopping cart (Dynamo):
    Conflict: two versions of the cart exist
    Resolution: merge (union of items) — may add back a deleted item
    User can fix by removing the unwanted item
\`\`\`

**Multi-region write architecture**:
\`\`\`
  Option 1: Single-leader (write in one region, read everywhere)
    → No conflicts, but write latency for remote users

  Option 2: Multi-leader with conflict resolution
    → Low write latency everywhere, but must handle conflicts

  Option 3: Partitioned leaders (each row has a home region)
    → No conflicts for most writes, low latency for local data
\`\`\`

**Recommendation**: Avoid multi-master for data that requires strong consistency. Use partitioned leaders — assign each user/entity to a home region, and route writes for that entity to its home region.`
      },
      {
        question: 'How would you design a system to ingest millions of events per second (IoT/telemetry)?',
        answer: `Telemetry ingestion is a pure write-scaling problem. Sensors, devices, and applications generate enormous volumes of small events that must be captured, stored, and made queryable.

**Architecture for high-volume ingestion**:
\`\`\`
  IoT Devices / Apps (producers)
       │ (millions of events/second)
       ▼
  Ingestion Layer (stateless, horizontally scalable)
  ├── API Gateway / Load Balancer
  └── Ingestion Workers (validate, enrich, route)
       │
       ▼
  Kafka / Kinesis (durable buffer, partitioned)
       │
       ├──► Real-time Path: Stream Processor (Flink/Spark)
       │    → Real-time dashboards, alerts
       │
       └──► Batch Path: Consumer → Time-Series DB / Data Lake
            → Historical queries, analytics
\`\`\`

**Ingestion optimizations**:

1. **Protocol efficiency**: Use compact binary protocols (Protobuf, MessagePack) instead of JSON. 10x reduction in payload size.
\`\`\`
  JSON: {"device_id":"d123","temp":23.5,"ts":1705000000}  (52 bytes)
  Protobuf: [binary encoding]                              (12 bytes)
\`\`\`

2. **Client-side batching**: Devices buffer readings and send in batches (every 5-10 seconds) rather than per-reading.

3. **Partitioning by device_id**: Ensures all data from one device lands in the same partition, enabling per-device ordering and aggregation.

4. **Time-partitioned storage**: Partition tables by time (hourly, daily). Old partitions can be compressed, moved to cold storage, or dropped.
\`\`\`
  telemetry_2024_01_15_00  (January 15, midnight hour)
  telemetry_2024_01_15_01  (January 15, 1am hour)
  ...
  Old partitions → S3 (Parquet format, columnar, compressed)
\`\`\`

**Storage layer choices**:
\`\`\`
  ┌──────────────────┬──────────────┬────────────────────┐
  │ System           │ Write Speed  │ Best For           │
  ├──────────────────┼──────────────┼────────────────────┤
  │ InfluxDB         │ ~1M pts/s    │ Time-series metrics│
  │ TimescaleDB      │ ~500K pts/s  │ SQL + time-series  │
  │ ClickHouse       │ ~2M rows/s   │ Analytics queries  │
  │ Cassandra        │ ~1M writes/s │ High write, flexible│
  │ S3 + Parquet     │ Unlimited    │ Cold storage, batch│
  └──────────────────┴──────────────┴────────────────────┘
\`\`\`

**Key design decisions**:
- Accept eventual consistency — real-time dashboards showing data 5 seconds old are fine
- Use Kafka as the durable buffer — it handles spikes and allows multiple consumers
- Separate hot (recent, fast storage) from cold (historical, cheap storage) data
- Downsample old data — keep per-second granularity for 24 hours, per-minute for 30 days, per-hour for 1 year`
      },
      {
        question: 'What is write amplification and how do you minimize it?',
        answer: `**Write amplification** is the ratio of total bytes written to storage versus the logical bytes written by the application. A write amplification of 10x means for every 1 byte the application writes, 10 bytes are actually written to disk.

**Sources of write amplification**:

1. **LSM tree compaction**: Data is rewritten as it moves through compaction levels.
\`\`\`
  Logical write: 1KB
  WAL: 1KB
  Memtable flush to L0: 1KB
  L0 → L1 compaction: 1KB
  L1 → L2 compaction: 1KB
  L2 → L3 compaction: 1KB
  Total: 5KB written for 1KB of data (5x amplification)

  Worst case with leveled compaction: 10-30x
\`\`\`

2. **B-tree page splits**: Updating a single row may rewrite an entire 8-16KB page.
\`\`\`
  Logical write: 100 bytes
  Page rewrite: 8192 bytes (the whole B-tree page)
  WAL: 100 bytes
  Amplification: ~82x for small updates
\`\`\`

3. **Replication**: Each write is replicated to N nodes.
\`\`\`
  Replication factor 3: every write is amplified 3x
  Plus each replica's own internal amplification
\`\`\`

4. **Indexing**: Each secondary index requires an additional write.
\`\`\`
  Table with 5 indexes:
  INSERT → 1 table write + 5 index writes = 6x amplification
\`\`\`

**Minimizing write amplification**:

1. **Choose the right compaction strategy**:
\`\`\`
  Size-tiered: lower write amplification (~5-10x), more space amplification
  Leveled: higher write amplification (~10-30x), less space amplification
  FIFO: no compaction for time-series data that is naturally ordered
\`\`\`

2. **Reduce unnecessary indexes**: Each index is a write multiplier. Only create indexes that are actively used by queries.

3. **Batch writes**: Larger writes amortize the per-write overhead. A 1MB batch write into a 4KB page has much lower amplification than 250 individual 4KB writes.

4. **Partition by time**: For time-series data, old partitions are immutable (no compaction needed). Only the current partition has write amplification.

5. **Tune compaction**: Increase the size ratio between levels (e.g., from 10x to 20x) to reduce the number of levels and compaction events. Trade-off: larger read amplification (more files to check).

**Why it matters at scale**:
\`\`\`
  Application writes: 100 MB/s
  Write amplification: 20x
  Actual disk I/O: 2,000 MB/s (2 GB/s)

  This determines:
    - SSD endurance (total bytes written before failure)
    - Required disk throughput
    - Cost of storage infrastructure
\`\`\`

For SSD-based systems, write amplification directly impacts drive lifetime. A 20x amplification means the SSD wears out 20x faster than the logical write rate would suggest.`
      },
    ],

    dataModel: {
      description: 'Shard metadata and write pipeline state',
      schema: `Shard Metadata:
  shard_id:        integer
  shard_range:     key range (min_key, max_key) or hash range
  node_host:       database host for this shard
  status:          active | draining | splitting
  row_count:       approximate rows
  size_bytes:      approximate data size
  write_rate:      writes per second (for hot shard detection)

Write Buffer State (Kafka topic):
  topic:           topic name
  partition:       partition number
  offset:          current write offset (latest)
  consumer_offset: consumer group's committed offset
  lag:             offset - consumer_offset (messages behind)
  retention:       configured retention period

Batch Pipeline:
  batch_id:        UUID
  source:          producer identity
  record_count:    number of records in batch
  size_bytes:      total batch size
  status:          buffering | flushing | committed | failed
  created_at:      when batch started accumulating
  flushed_at:      when batch was written to storage`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 18. Handling Large Blobs (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'handling-large-blobs',
    title: 'Handling Large Blobs',
    icon: 'hardDrive',
    color: '#06b6d4',
    questions: 7,
    description: 'Uploading, storing, and serving large files efficiently using chunked uploads, pre-signed URLs, content-addressable storage, and CDN distribution.',
    concepts: [
      'Chunked and multipart upload',
      'Pre-signed URLs',
      'Content-addressable storage',
      'CDN distribution',
      'Resumable uploads (tus protocol)',
      'Deduplication via content hashing',
    ],
    tips: [
      'Never route large file uploads through your application server — use pre-signed URLs for direct-to-storage uploads',
      'For files over 100MB, always implement chunked/resumable uploads to handle network interruptions gracefully',
      'Content-addressable storage (hash-based keys) gives you automatic deduplication for free',
      'Generate thumbnails and variants asynchronously via a job queue, not synchronously during upload',
      'Always validate file type and size on the server side, not just the client — client-side validation is easily bypassed',
    ],

    introduction: `Large binary objects (blobs) — images, videos, documents, archives, database backups — present unique challenges that differ fundamentally from small, structured data. A 2GB video file cannot be handled the same way as a 500-byte JSON payload. The upload may take minutes on a slow connection, the transfer can be interrupted, the file must be stored durably and served efficiently to potentially millions of viewers, and the storage costs must be managed.

The key architectural patterns for handling large blobs are: **chunked/resumable uploads** (splitting files into pieces to handle interruptions), **pre-signed URLs** (offloading upload and download traffic directly to object storage like S3, bypassing your application server), **content-addressable storage** (using the file's content hash as its key for automatic deduplication), and **CDN distribution** (caching files at edge locations close to users for fast delivery).

Production systems like YouTube, Dropbox, Google Drive, and GitHub all combine these patterns. The upload path and the download path are designed independently — uploads go directly to object storage via pre-signed URLs, while downloads are served through a CDN with aggressive caching. Asynchronous processing pipelines handle transcoding, thumbnail generation, virus scanning, and metadata extraction after the upload completes.`,

    keyQuestions: [
      {
        question: 'How do pre-signed URLs work and why are they essential for large file uploads?',
        answer: `**Pre-signed URLs** are temporary, authenticated URLs generated by your backend that allow clients to upload or download files directly to/from object storage (S3, GCS, Azure Blob) without routing traffic through your application server.

**Upload flow with pre-signed URL**:
\`\`\`
  1. Client → App Server: "I want to upload profile-photo.jpg (2MB)"
  2. App Server validates request, generates pre-signed URL:
     s3.getSignedUrl('putObject', {
       Bucket: 'uploads',
       Key: 'users/42/profile-photo.jpg',
       ContentType: 'image/jpeg',
       Expires: 300  // URL valid for 5 minutes
     })
  3. App Server → Client: {upload_url: "https://s3.amazonaws.com/...?Signature=..."}
  4. Client → S3: PUT upload_url with file body (direct upload, bypasses app server)
  5. S3 → Client: 200 OK
  6. Client → App Server: "Upload complete" (with key/metadata)
  7. App Server updates database with file reference
\`\`\`

**Why this is essential**:
\`\`\`
  Without pre-signed URLs:
    Client ──(2GB)──► App Server ──(2GB)──► S3
    - App server must buffer/stream the file
    - Doubles bandwidth usage
    - App server CPU/memory tied up during transfer
    - One slow upload blocks the server thread
    - Cannot scale upload bandwidth independently

  With pre-signed URLs:
    Client ──(2GB)──────────────────────► S3 (direct)
    Client ──(1KB metadata)──► App Server
    - App server only handles metadata (tiny payload)
    - S3 handles the heavy lifting (built for this)
    - Upload bandwidth scales with S3, not your servers
    - App server remains available for other requests
\`\`\`

**Security considerations**:
- Short expiration (5-15 minutes) limits the window of misuse
- Restrict Content-Type to prevent uploading executable files
- Set maximum Content-Length to prevent abuse
- Use a separate S3 bucket for uploads (not your production bucket)
- Validate the uploaded file asynchronously (virus scan, type verification)

**Download pre-signed URLs**: Same concept in reverse — generate a temporary download URL that grants time-limited access to a private S3 object. Useful for paid content, user-specific files, or access-controlled documents.`
      },
      {
        question: 'How do you implement resumable/chunked uploads for large files?',
        answer: `**Resumable uploads** split a file into chunks that are uploaded independently. If the connection drops, only the last incomplete chunk needs to be re-uploaded, not the entire file.

**Why chunked uploads are necessary**:
\`\`\`
  1GB file on a 10 Mbps connection:
    Upload time: ~14 minutes
    Probability of network interruption: HIGH

  Without chunking: start over from byte 0
  With chunking: resume from last completed chunk
\`\`\`

**tus protocol** (open standard for resumable uploads):
\`\`\`
  Step 1 — Create upload:
    POST /uploads
    Upload-Length: 1073741824  (1GB)
    → 201 Created
    → Location: /uploads/abc123

  Step 2 — Upload chunks:
    PATCH /uploads/abc123
    Upload-Offset: 0
    Content-Length: 5242880  (5MB chunk)
    [binary data]
    → 204 No Content
    → Upload-Offset: 5242880

    PATCH /uploads/abc123
    Upload-Offset: 5242880
    Content-Length: 5242880
    [binary data]
    → 204 No Content
    → Upload-Offset: 10485760

  Step 3 — Resume after interruption:
    HEAD /uploads/abc123
    → Upload-Offset: 10485760  (server knows how far we got)

    PATCH /uploads/abc123
    Upload-Offset: 10485760  (resume from here)
    ...
\`\`\`

**S3 multipart upload**:
\`\`\`
  1. CreateMultipartUpload → returns upload_id
  2. UploadPart (part 1, 5MB) → returns ETag
  3. UploadPart (part 2, 5MB) → returns ETag
  ...
  N. CompleteMultipartUpload (upload_id, [{part: 1, ETag}, ...])

  On failure: ListParts to see what was uploaded, resume missing parts
  Cleanup: AbortMultipartUpload if abandoned
\`\`\`

**Chunk size selection**:
\`\`\`
  ┌──────────┬─────────────────┬──────────────────┐
  │ Chunk    │ Pros            │ Cons             │
  ├──────────┼─────────────────┼──────────────────┤
  │ Small    │ Fine-grained    │ More HTTP        │
  │ (1MB)    │ resume, less    │ overhead, slower  │
  │          │ data lost       │ overall          │
  │ Large    │ Fewer requests, │ More data lost on│
  │ (50MB)   │ faster overall  │ interruption     │
  │ Adaptive │ Best of both    │ More complex     │
  │          │ (adjust to      │ implementation   │
  │          │ network speed)  │                  │
  └──────────┴─────────────────┴──────────────────┘
\`\`\`

**Best practice**: Use 5-10MB chunks as a default. Implement client-side progress tracking and server-side chunk verification (checksum per chunk). Set a timeout on incomplete uploads (clean up after 24 hours).`
      },
      {
        question: 'What is content-addressable storage and how does it enable deduplication?',
        answer: `**Content-addressable storage (CAS)** uses the hash of a file's content as its storage key. Two files with identical content produce the same hash, and therefore the same key — they are stored only once regardless of how many times they are uploaded.

**How it works**:
\`\`\`
  File upload:
    1. Compute hash: SHA-256(file_content) → "a3f2b8c9d4e1..."
    2. Storage key: blobs/a3/f2/a3f2b8c9d4e1...
    3. Check if key exists in storage
       → If yes: file already stored, skip upload (deduplicated!)
       → If no: upload file to storage with this key
    4. Store reference: files table → (file_id, name, hash, size, mime_type)

  Multiple users upload the same photo:
    User A uploads sunset.jpg → hash = abc123 → stored
    User B uploads beach_sunset.jpg → hash = abc123 → already exists!
    Both users' file records point to the same blob
\`\`\`

**Deduplication in practice (Dropbox model)**:
\`\`\`
  files table:
    file_id | user_id | path           | blob_hash
    ────────┼─────────┼────────────────┼──────────
    f1      | user_A  | /photos/pic.jpg| abc123
    f2      | user_B  | /my_photo.jpg  | abc123  ← same blob!
    f3      | user_A  | /docs/spec.pdf | def456

  blobs table:
    hash    | storage_url                  | size   | ref_count
    ────────┼──────────────────────────────┼────────┼──────────
    abc123  | s3://blobs/ab/c1/abc123...   | 2.1 MB | 2
    def456  | s3://blobs/de/f4/def456...   | 500 KB | 1
\`\`\`

**Block-level deduplication** (for large files):
\`\`\`
  Instead of hashing the entire file, split into fixed-size blocks:

  File (100MB) → Block 1 (4MB) → hash1
                → Block 2 (4MB) → hash2
                → Block 3 (4MB) → hash3
                → ...
                → Block 25 (4MB) → hash25

  If only Block 15 changes in an update:
    24 blocks: already stored (deduplicated)
    1 block: new, upload only this block

  Saves ~96% of storage and bandwidth for the update!
\`\`\`

**Variable-length chunking** (Rabin fingerprinting): Instead of fixed-size blocks, use content-defined boundaries. This handles insertions at the beginning of the file without invalidating all subsequent block boundaries.

**Garbage collection**: When a blob's reference count drops to zero (all files pointing to it are deleted), the blob can be garbage collected. Use a background job that periodically scans for unreferenced blobs.

**Systems using CAS**: Git (content-addressable objects), Docker (image layers), IPFS (content-addressed distributed storage), Dropbox (block-level dedup), Venti (Plan 9 archival storage).`
      },
      {
        question: 'How do you design a media processing pipeline for uploaded files?',
        answer: `After a file is uploaded, it typically needs processing: images need thumbnails, videos need transcoding, documents need text extraction, and all files need virus scanning. This processing must be asynchronous — the user should not wait for it.

**Architecture**:
\`\`\`
  Upload Complete
       │
       ▼
  Event: "file.uploaded" (Kafka/SQS)
       │
       ├──► Virus Scanner ──► quarantine or approve
       ├──► Metadata Extractor ──► EXIF, duration, dimensions
       ├──► Thumbnail Generator ──► multiple sizes
       ├──► Video Transcoder ──► multiple formats/resolutions
       └──► Text Extractor (OCR/PDF) ──► searchable text

  Each processor updates file status in database
  Client polls or receives WebSocket notification when processing completes
\`\`\`

**Image processing pipeline**:
\`\`\`
  Original upload (8MB, 4000x3000 JPEG)
       │
       ├──► Thumbnail: 150x150 (5KB)
       ├──► Small: 640x480 (50KB)
       ├──► Medium: 1280x960 (150KB)
       ├──► Large: 1920x1440 (400KB)
       ├──► WebP variants of each (30-50% smaller)
       └──► AVIF variants (if supported, 50-70% smaller)

  Store all variants in S3:
    images/abc123/original.jpg
    images/abc123/thumb.jpg
    images/abc123/small.webp
    images/abc123/medium.webp
    ...
\`\`\`

**Video processing pipeline**:
\`\`\`
  Original upload (2GB, 4K MOV)
       │
       ├──► 4K H.265 (adaptive bitrate, 8 Mbps)
       ├──► 1080p H.264 (adaptive bitrate, 5 Mbps)
       ├──► 720p H.264 (adaptive bitrate, 2.5 Mbps)
       ├──► 480p H.264 (adaptive bitrate, 1 Mbps)
       ├──► Thumbnail sprites (for preview on hover)
       └──► HLS/DASH manifest for adaptive streaming

  Processing time: minutes to hours (use spot instances)
\`\`\`

**Processing status tracking**:
\`\`\`
  file_processing_jobs:
    job_id | file_id | job_type      | status     | progress | error
    ───────┼─────────┼───────────────┼────────────┼──────────┼──────
    j1     | f42     | virus_scan    | completed  | 100%     | null
    j2     | f42     | thumbnail     | completed  | 100%     | null
    j3     | f42     | transcode_720 | processing | 65%      | null
    j4     | f42     | transcode_1080| queued     | 0%       | null
\`\`\`

**Key design decisions**:
- Use a job queue (SQS, Celery, Bull) with retry and dead-letter capabilities
- Process in priority order: virus scan first, thumbnails second (fast user feedback), then heavy processing
- Use serverless (Lambda) or spot instances for cost-effective video transcoding
- Set processing timeouts — a stuck job should not block the pipeline
- Serve the original file immediately while processing runs (better UX than waiting)`
      },
      {
        question: 'How do you efficiently serve large files to millions of users via CDN?',
        answer: `Serving large files at scale requires minimizing origin load, reducing latency through edge caching, and handling partial content requests for streaming.

**CDN architecture for file serving**:
\`\`\`
  User Request → CDN Edge (nearest PoP)
                    │
                 Cache HIT → Serve directly (2-20ms latency)
                    │
                 Cache MISS → Fetch from Origin (S3)
                    │          → Cache at edge for subsequent requests
                    │          → Serve to user
                    │
  Origin: S3 bucket (or equivalent object storage)
\`\`\`

**Range requests (essential for video streaming)**:
\`\`\`
  Client: GET /video.mp4
          Range: bytes=0-1048575    (first 1MB)
  Server: 206 Partial Content
          Content-Range: bytes 0-1048575/104857600
          [first 1MB of data]

  Client: GET /video.mp4
          Range: bytes=1048576-2097151    (second 1MB)
  Server: 206 Partial Content
          [second 1MB of data]
\`\`\`
Range requests enable seeking in videos, resuming downloads, and parallel chunk downloads.

**Adaptive bitrate streaming (HLS/DASH)**:
\`\`\`
  manifest.m3u8 (master playlist):
    #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
    360p/playlist.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
    720p/playlist.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
    1080p/playlist.m3u8

  720p/playlist.m3u8:
    #EXTINF:10.0,
    segment001.ts    ← CDN caches each segment independently
    #EXTINF:10.0,
    segment002.ts
    ...
\`\`\`

The player measures bandwidth and switches quality automatically. Each 10-second segment is a separate CDN object with its own cache lifetime.

**Cache strategies for files**:
\`\`\`
  Immutable content (content-addressed):
    Cache-Control: public, max-age=31536000, immutable
    Key: /blobs/sha256-abc123.jpg
    → Cache forever, hash changes when content changes

  Mutable content:
    Cache-Control: public, max-age=86400, stale-while-revalidate=3600
    ETag: "v3-abc123"
    → Cache for 24h, serve stale while revalidating

  Protected content:
    Cache-Control: private, no-store
    → Do not cache at CDN, use pre-signed URLs with short TTL
\`\`\`

**Cost optimization**:
- Use CDN for hot content (frequently accessed), S3 directly for cold content (rarely accessed)
- Compress text-based files (SVG, JSON, XML) at the CDN edge (Brotli/gzip)
- Set appropriate cache TTLs — longer TTLs = higher hit ratio = lower origin costs
- Use origin shield (a single CDN node that caches between edge and origin) to reduce origin requests when you have many edge PoPs`
      },
      {
        question: 'How do you handle file upload validation and security?',
        answer: `File uploads are a major attack vector. Without proper validation, attackers can upload malware, web shells, oversized files that consume storage, or files that exploit image parsing vulnerabilities.

**Validation layers** (defense in depth):

\`\`\`
  Layer 1 — Client-side (UX only, not security):
    - Check file extension and size before upload
    - Display immediate feedback to user
    - Easily bypassed — NEVER rely on this alone

  Layer 2 — Server-side pre-upload (pre-signed URL generation):
    - Validate Content-Type and Content-Length in the pre-signed URL policy
    - Set maximum file size (S3 policy condition)
    - Restrict allowed Content-Types

  Layer 3 — Post-upload validation:
    - Verify actual file type by reading magic bytes (not extension)
    - Scan with antivirus (ClamAV or cloud service)
    - Check for embedded scripts in images (polyglot files)
    - Validate image dimensions (prevent zip bombs disguised as images)
    - Strip EXIF metadata (may contain GPS, device info)

  Layer 4 — Storage security:
    - Store uploads in a separate S3 bucket (not with application code)
    - Enable S3 versioning (recover from accidental deletion)
    - Enable server-side encryption (AES-256 or KMS)
    - Block public access by default
    - Serve files from a separate domain (prevent cookie theft via uploaded HTML)
\`\`\`

**Magic byte validation**:
\`\`\`
  // Check actual file type, not extension
  JPEG: starts with FF D8 FF
  PNG:  starts with 89 50 4E 47
  PDF:  starts with 25 50 44 46
  GIF:  starts with 47 49 46 38

  // Reject if magic bytes don't match claimed Content-Type
  if file_header != expected_magic_bytes[content_type]:
    reject("File type mismatch")
\`\`\`

**File size limits and quotas**:
\`\`\`
  Per-request limit:    100MB (reject larger uploads)
  Per-user storage:     5GB (free tier), 100GB (paid)
  Total system storage: Monitor and alert

  Implementation:
    S3 pre-signed URL with Content-Length condition:
    Conditions: [
      ["content-length-range", 0, 104857600]  // max 100MB
    ]
\`\`\`

**Serving uploaded files safely**:
\`\`\`
  Headers for serving user-uploaded content:
    Content-Disposition: attachment  (force download, don't render)
    Content-Type: application/octet-stream  (override claimed type)
    X-Content-Type-Options: nosniff  (prevent MIME sniffing)
    Content-Security-Policy: default-src 'none'  (no script execution)

  Or better: serve from a separate domain (uploads.example.com)
    → Isolated from main application cookies and auth
\`\`\`

**Best practice**: Treat every uploaded file as potentially malicious. Validate at every layer, scan asynchronously, store in isolation, and serve with restrictive headers.`
      },
      {
        question: 'How would you design a system like Dropbox for file sync across devices?',
        answer: `File sync is one of the most complex distributed systems problems — it combines large blob handling with conflict resolution, offline support, and real-time notifications.

**Architecture**:
\`\`\`
  Device A (laptop)                   Cloud                   Device B (phone)
       │                                │                          │
  Local filesystem                 Sync Service               Local filesystem
  File watcher ──► Sync Client ──► Block Server ◄── Sync Client ◄── File watcher
                        │              │                  │
                        │         Metadata Service        │
                        │         (file tree, versions)    │
                        │              │                  │
                        └──► Notification Service ◄───────┘
                             (real-time push)
\`\`\`

**Key components**:

1. **File watcher**: Monitors the local filesystem for changes (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows).

2. **Chunking engine**: Splits files into variable-length blocks using content-defined chunking (Rabin fingerprinting). This ensures that inserting bytes at the beginning of a file does not invalidate all chunks.
\`\`\`
  File (100MB) → [chunk1: 4.1MB, chunk2: 3.8MB, chunk3: 4.3MB, ...]
  Each chunk: hash = SHA-256(content)

  File modified (inserted 1KB at position 50MB):
    Chunks 1-12: unchanged (same hashes, skip upload)
    Chunk 13: modified (new hash, upload this chunk)
    Chunks 14-25: unchanged (content-defined boundaries are stable)

  Result: only ~4MB uploaded for a 1KB edit in a 100MB file
\`\`\`

3. **Metadata service**: Tracks the file tree — paths, versions, chunk lists, sharing permissions. This is a traditional database (PostgreSQL).
\`\`\`
  files:
    file_id | path              | version | chunks
    ────────┼───────────────────┼─────────┼────────────
    f1      | /docs/report.pdf  | 7       | [h1, h2, h3, h4]
    f2      | /photos/cat.jpg   | 2       | [h5, h6]
\`\`\`

4. **Block server**: Stores and retrieves chunks by their content hash. Backed by S3 or similar object storage. Automatic deduplication — same content = same hash = stored once.

5. **Notification service**: Pushes real-time notifications when files change. Uses long-polling or WebSocket to inform devices of remote changes.

**Conflict resolution**:
\`\`\`
  Device A (offline): edits report.pdf → version 8a
  Device B (offline): edits report.pdf → version 8b
  Both come online:
    Conflict detected (both modified version 7)
    Resolution: save both versions
      report.pdf          → version 8a (Device A's version wins)
      report (conflict).pdf → version 8b (Device B's version preserved)
    User manually merges
\`\`\`

**Bandwidth optimization**:
- Delta sync: only upload changed chunks
- Compression: compress chunks before upload (LZ4 for speed)
- Deduplication: skip upload if chunk hash already exists in cloud
- Prioritization: sync small files first, recently modified files first`
      },
    ],

    dataModel: {
      description: 'File metadata and chunk tracking',
      schema: `File Record:
  file_id:         UUID
  owner_id:        user reference
  filename:        original file name
  storage_key:     object storage key (may be content hash)
  content_hash:    SHA-256 of file content
  mime_type:       validated MIME type
  size_bytes:      file size
  status:          uploading | processing | ready | quarantined
  upload_method:   direct | multipart | chunked
  created_at:      timestamp
  processed_at:    timestamp (null until processing complete)

Chunk Record (for chunked uploads):
  chunk_id:        UUID
  file_id:         reference to parent file
  chunk_index:     order within file
  content_hash:    SHA-256 of chunk content
  size_bytes:      chunk size
  storage_key:     object storage key
  status:          uploaded | verified | failed

Processing Job:
  job_id:          UUID
  file_id:         reference to file
  job_type:        virus_scan | thumbnail | transcode | ocr
  status:          queued | processing | completed | failed
  progress:        percentage (0-100)
  output_key:      storage key of processed output
  started_at:      timestamp
  completed_at:    timestamp
  error:           error message if failed`
    },
  },

  // ─────────────────────────────────────────────────────────
  // 19. Managing Long Running Tasks (applied)
  // ─────────────────────────────────────────────────────────
  {
    id: 'managing-long-running-tasks',
    title: 'Managing Long Running Tasks',
    icon: 'clock',
    color: '#06b6d4',
    questions: 7,
    description: 'Processing tasks that take seconds to hours using job queues, state machines, progress tracking, and distributed task scheduling.',
    concepts: [
      'Job queues and priority scheduling',
      'Task state machines',
      'Polling vs webhooks vs WebSocket notifications',
      'Dead letter queues',
      'Idempotent retries',
      'Task timeout and heartbeat',
      'Graceful cancellation',
    ],
    tips: [
      'Never process long tasks synchronously in the request path — return a job ID immediately and process asynchronously',
      'Implement heartbeat for tasks lasting more than a few minutes so the system can detect and reschedule stuck tasks',
      'Every task must be idempotent — workers will crash, and the same task will be retried',
      'Use exponential backoff with jitter for retries to avoid overwhelming downstream services',
      'Progress tracking is a UX requirement, not optional — users need to know something is happening',
    ],

    introduction: `Many real-world operations take far longer than the typical HTTP request timeout (30 seconds). Report generation, video transcoding, data migration, machine learning training, PDF rendering, large data exports, and batch processing can take anywhere from seconds to hours. These operations cannot be handled within a synchronous request-response cycle.

The standard pattern is to **accept the request, return immediately with a job ID, and process the work asynchronously** using a background worker. The client can then check the job's status via polling, receive updates via WebSocket, or be notified via webhook when the job completes. This decouples the user-facing API from the actual processing, allowing independent scaling and graceful handling of failures.

The challenge lies in **reliability**: workers crash, tasks get stuck, downstream services become unavailable, and duplicate processing must be prevented. A robust long-running task system needs a persistent job queue, a state machine to track task lifecycle, heartbeat monitoring to detect stuck tasks, dead letter queues for tasks that repeatedly fail, and idempotent task handlers that produce the same result even when executed multiple times.`,

    keyQuestions: [
      {
        question: 'How do you design an asynchronous task processing system?',
        answer: `**Architecture**:
\`\`\`
  Client → API Server → Job Queue → Worker Pool → Result Store
    │          │            │           │              │
    │     Return job_id  Persistent   Scale          Notify
    │     immediately    (durable)    independently  client
    ▼                                                   │
  Poll for status ◄─────────────────────────────────────┘
\`\`\`

**Request flow**:
\`\`\`
  1. Client: POST /api/reports/generate {filters: {...}}
  2. API Server:
     a. Validate request
     b. Create job record (status=QUEUED)
     c. Enqueue job to queue
     d. Return: {job_id: "job_abc", status: "queued", poll_url: "/api/jobs/job_abc"}
  3. Worker picks up job from queue:
     a. Update status → PROCESSING
     b. Execute task (generate report)
     c. Store result (S3 or database)
     d. Update status → COMPLETED
  4. Client polls: GET /api/jobs/job_abc
     → {status: "completed", result_url: "/api/reports/job_abc/download"}
\`\`\`

**Job queue options**:
\`\`\`
  ┌─────────────────┬──────────────────────────────────┐
  │ Queue            │ Best For                        │
  ├─────────────────┼──────────────────────────────────┤
  │ Redis (Bull/BullMQ)│ Low latency, Node.js ecosystem│
  │ SQS             │ AWS-native, serverless           │
  │ RabbitMQ        │ Routing, priorities, AMQP        │
  │ Kafka           │ High throughput, log-based       │
  │ Celery          │ Python ecosystem                 │
  │ PostgreSQL (SKIP LOCKED)│ No additional infra     │
  └─────────────────┴──────────────────────────────────┘
\`\`\`

**PostgreSQL as a job queue** (simple, no extra infrastructure):
\`\`\`
  CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    type VARCHAR,
    payload JSONB,
    status VARCHAR DEFAULT 'queued',
    locked_by VARCHAR,
    locked_at TIMESTAMP,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB,
    error TEXT
  );

  -- Worker picks up a job (atomic, no double-processing):
  UPDATE jobs
  SET status = 'processing', locked_by = 'worker-1', locked_at = NOW()
  WHERE id = (
    SELECT id FROM jobs
    WHERE status = 'queued' AND attempts < max_attempts
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
\`\`\``
      },
      {
        question: 'How do you implement task timeout, heartbeat, and stuck task recovery?',
        answer: `Tasks get stuck for many reasons: worker crashes, out-of-memory kills, infinite loops, deadlocks, or network calls that never return. Without detection and recovery, stuck tasks block the queue and waste resources.

**Heartbeat pattern**:
\`\`\`
  Worker processing a task:
    1. Pick up job, set locked_at = NOW()
    2. Start heartbeat loop (every 30 seconds):
       UPDATE jobs SET locked_at = NOW() WHERE id = ? AND locked_by = ?
    3. Do actual work...
    4. On completion: update status → COMPLETED, stop heartbeat
    5. On failure: update status → FAILED, stop heartbeat

  Reaper process (runs every 60 seconds):
    UPDATE jobs
    SET status = 'queued', locked_by = NULL, locked_at = NULL, attempts = attempts + 1
    WHERE status = 'processing'
    AND locked_at < NOW() - INTERVAL '2 minutes'  -- no heartbeat for 2 min
    AND attempts < max_attempts;
    -- Tasks with attempts >= max_attempts → move to dead letter queue
\`\`\`

**Visibility timeout pattern** (SQS model):
\`\`\`
  1. Worker receives message (invisibility period starts: 5 minutes)
  2. Other workers cannot see this message for 5 minutes
  3. Worker processes task:
     a. If completed in time → delete message (acknowledged)
     b. If not completed → extend visibility timeout
     c. If worker crashes → message becomes visible again after timeout
        → Another worker picks it up
\`\`\`

**Timeout strategies per task type**:
\`\`\`
  ┌────────────────────────┬──────────┬────────────┐
  │ Task Type              │ Timeout  │ Heartbeat  │
  ├────────────────────────┼──────────┼────────────┤
  │ Thumbnail generation   │ 30s      │ Not needed │
  │ PDF report generation  │ 5min     │ Every 30s  │
  │ Video transcoding      │ 2 hours  │ Every 60s  │
  │ Data export            │ 30min    │ Every 60s  │
  │ ML training job        │ 24 hours │ Every 5min │
  └────────────────────────┴──────────┴────────────┘
\`\`\`

**Circuit breaker for downstream services**:
\`\`\`
  If a task fails because a downstream service is down:
    After 5 consecutive failures:
      → Circuit breaker OPENS
      → Stop sending tasks to that service
      → Return tasks to queue with a delay
    After 30 seconds:
      → Circuit breaker HALF-OPEN
      → Try one task
      → If success → CLOSE circuit, resume processing
      → If failure → OPEN circuit again
\`\`\`

**Monitoring alerts**:
- Queue depth growing → workers not keeping up
- Average processing time increasing → degradation
- Dead letter queue growing → recurring failures need investigation
- Heartbeat misses → workers may be stuck or under-resourced`
      },
      {
        question: 'Compare polling, webhooks, and WebSocket for notifying clients about task completion.',
        answer: `Clients need to know when their long-running task completes. Three main notification mechanisms serve this purpose, each with different trade-offs.

**Polling** — client periodically asks "is it done yet?":
\`\`\`
  Client:
    setInterval(async () => {
      const job = await fetch('/api/jobs/abc');
      if (job.status === 'completed') {
        clearInterval(pollId);
        showResult(job.result);
      }
    }, 2000);  // every 2 seconds
\`\`\`

Pros:
- Simplest to implement (stateless, standard HTTP)
- Works everywhere (no special infrastructure)
- Client controls the polling rate

Cons:
- Wastes bandwidth (most polls return "still processing")
- Delay between completion and notification (up to poll interval)
- Many concurrent polls can load the API server

**Webhooks** — server calls client's URL when done:
\`\`\`
  Client submits job:
    POST /api/jobs
    {task: "generate_report", callback_url: "https://client.com/webhooks/jobs"}

  Server completes job:
    POST https://client.com/webhooks/jobs
    {job_id: "abc", status: "completed", result_url: "..."}
\`\`\`

Pros:
- No wasted requests (server only calls when there is news)
- Near-instant notification
- Works for server-to-server communication

Cons:
- Client must expose a public HTTP endpoint (not always feasible)
- Delivery reliability: what if the client is temporarily down? (need retry logic)
- Security: how does the client verify the webhook is genuine? (HMAC signatures)
- Not suitable for browser clients (browsers do not expose HTTP endpoints)

**WebSocket** — persistent connection, server pushes updates:
\`\`\`
  Client:
    const ws = new WebSocket('wss://api.example.com/ws');
    ws.send(JSON.stringify({subscribe: 'job:abc'}));
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.job_id === 'abc' && data.status === 'completed') {
        showResult(data.result);
        ws.close();
      }
    };
\`\`\`

Pros:
- Real-time updates (no delay)
- Can send progress updates (30%, 50%, 75%...)
- Efficient (no repeated HTTP overhead)

Cons:
- More complex infrastructure (WebSocket servers, sticky sessions)
- Connection management (reconnection, heartbeat)
- Not suitable for server-to-server or mobile push when app is backgrounded

**Recommendation by use case**:
\`\`\`
  ┌──────────────────────────┬────────────────────┐
  │ Use Case                 │ Best Mechanism      │
  ├──────────────────────────┼────────────────────┤
  │ Browser UI, short tasks  │ Polling (simplest)  │
  │ Browser UI, long tasks   │ WebSocket + polling │
  │                          │ fallback            │
  │ Server-to-server         │ Webhooks            │
  │ Mobile (background)      │ Push notification   │
  │ Dashboard with many jobs │ SSE (server-sent    │
  │                          │ events)             │
  └──────────────────────────┴────────────────────┘
\`\`\`

**Hybrid approach** (most robust): Return a poll URL in the initial response. Optionally accept a webhook URL. If the client connects via WebSocket, push updates. This covers all client types.`
      },
      {
        question: 'How do you implement priority queues for task scheduling?',
        answer: `Not all tasks are equally urgent. A user waiting for a PDF download is more time-sensitive than a nightly analytics job. Priority queues ensure high-priority tasks are processed before low-priority ones.

**Priority implementation strategies**:

1. **Separate queues per priority**:
\`\`\`
  Queue: high-priority    → Workers check this first
  Queue: normal-priority  → Workers check this second
  Queue: low-priority     → Workers check this last (if idle)

  Worker loop:
    job = dequeue(high) || dequeue(normal) || dequeue(low)
    if job: process(job)
    else: sleep(100ms)
\`\`\`

Pros: Simple, prevents starvation with weighted processing
Cons: Low-priority tasks may starve if high-priority queue is always full

2. **Weighted fair queuing**:
\`\`\`
  Process 70% from high, 20% from normal, 10% from low:
    Pick a random number 0-100:
      0-70:   dequeue from high
      70-90:  dequeue from normal
      90-100: dequeue from low
\`\`\`

Prevents starvation while still favoring high-priority tasks.

3. **Database-level priority (PostgreSQL)**:
\`\`\`
  SELECT * FROM jobs
  WHERE status = 'queued'
  ORDER BY priority DESC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  -- Priority 3 (high) processed before priority 1 (low)
  -- Within same priority, FIFO ordering
\`\`\`

4. **BullMQ priority queues**:
\`\`\`
  // Lower number = higher priority
  await queue.add('task', data, { priority: 1 });  // urgent
  await queue.add('task', data, { priority: 5 });  // normal
  await queue.add('task', data, { priority: 10 }); // background
\`\`\`

**Priority assignment guidelines**:
\`\`\`
  ┌──────────┬───────────────────────────────────┐
  │ Priority │ Examples                          │
  ├──────────┼───────────────────────────────────┤
  │ Critical │ Payment processing, password reset│
  │ High     │ User-facing exports, notifications│
  │ Normal   │ Email sending, webhook delivery   │
  │ Low      │ Analytics, report generation      │
  │ Background│ Data cleanup, cache warming      │
  └──────────┴───────────────────────────────────┘
\`\`\`

**Dynamic priority adjustment**:
\`\`\`
  Age-based priority boost:
    effective_priority = base_priority + (age_in_minutes / 10)

  A low-priority task waiting for 30 minutes:
    effective_priority = 1 + (30/10) = 4
    Now competes with normal-priority tasks

  Prevents indefinite starvation of low-priority tasks
\`\`\`

**Dedicated workers for priority levels**: For critical tasks, reserve dedicated workers that only process the high-priority queue. This guarantees capacity even when normal queues are backed up.`
      },
      {
        question: 'How do you implement graceful cancellation of long-running tasks?',
        answer: `Users change their minds. A report that takes 10 minutes may no longer be needed. Without graceful cancellation, the system wastes resources processing unwanted work, and users have no way to stop it.

**Cancellation architecture**:
\`\`\`
  Client: DELETE /api/jobs/abc (or POST /api/jobs/abc/cancel)
  API Server:
    1. Update job status → CANCELLING
    2. Set cancellation flag in shared store (Redis)
       SET job:abc:cancel true EX 3600

  Worker (processing job abc):
    Periodically checks cancellation flag:
      if redis.get("job:abc:cancel"):
        cleanup()
        update job status → CANCELLED
        return
\`\`\`

**Cooperative cancellation** (worker checks for cancellation signal):
\`\`\`
  async function processReport(jobId, data) {
    const pages = await getPages(data);

    for (let i = 0; i < pages.length; i++) {
      // Check for cancellation between units of work
      if (await isCancelled(jobId)) {
        await cleanup(jobId);  // Remove partial results
        return { status: 'cancelled', progress: i / pages.length };
      }

      await processPage(pages[i]);
      await updateProgress(jobId, (i + 1) / pages.length);
    }

    return { status: 'completed' };
  }
\`\`\`

**Cancellation of queued (not yet started) tasks**:
\`\`\`
  If task is still in queue:
    Option 1: Remove from queue directly (if queue supports it)
    Option 2: Mark as cancelled in DB; worker checks before starting
      Worker picks up job → check DB status → if CANCELLING → skip, acknowledge
\`\`\`

**Cancellation of external operations**:
\`\`\`
  Task calls external API (e.g., video transcoding service):
    1. Task starts transcoding via API → receives external_job_id
    2. Store external_job_id in job record
    3. On cancellation:
       a. Call external API: cancel(external_job_id)
       b. Clean up any partial outputs
       c. Update status → CANCELLED
\`\`\`

**Cancellation state machine**:
\`\`\`
  QUEUED ──► CANCELLED (simple, remove from queue)
  PROCESSING ──► CANCELLING ──► CANCELLED (cooperative shutdown)
  PROCESSING ──► CANCELLING ──► COMPLETED (finished before cancellation took effect)
  COMPLETED ──► (cannot cancel, already done — offer delete result instead)
  FAILED ──► (already terminal, no cancellation needed)
\`\`\`

**Cleanup on cancellation**:
- Delete partial results from storage (S3)
- Release any held locks or reservations
- Refund any consumed resources (credits, API calls) if applicable
- Log the cancellation reason for analytics

**Key principle**: Cancellation must be cooperative. You cannot safely kill a worker mid-operation (risk of corrupted state, unreleased locks, partial writes). The worker must check for the cancellation signal and clean up gracefully.`
      },
      {
        question: 'How do you design a distributed task scheduler for recurring and scheduled jobs?',
        answer: `A distributed task scheduler handles cron-like recurring jobs and one-time scheduled tasks across a cluster of workers, ensuring each job executes exactly once even when multiple scheduler instances are running.

**Architecture**:
\`\`\`
  Schedule Store (PostgreSQL)
       │
  Scheduler Service (2+ instances for HA)
       │ (leader election for scheduling)
       ▼
  Job Queue (Redis/Kafka)
       │
  Worker Pool (N workers, auto-scaling)
       │
  Result Store + Notification
\`\`\`

**Schedule storage**:
\`\`\`
  CREATE TABLE schedules (
    schedule_id    UUID PRIMARY KEY,
    name           VARCHAR,
    cron_expr      VARCHAR,          -- "0 */6 * * *" (every 6 hours)
    task_type      VARCHAR,          -- "generate_daily_report"
    payload        JSONB,            -- task parameters
    timezone       VARCHAR,          -- "America/New_York"
    next_run_at    TIMESTAMP,        -- pre-computed next execution
    last_run_at    TIMESTAMP,
    enabled        BOOLEAN DEFAULT true,
    max_instances  INT DEFAULT 1,    -- concurrent execution limit
    created_by     VARCHAR
  );

  -- One-time scheduled tasks
  CREATE TABLE scheduled_tasks (
    task_id        UUID PRIMARY KEY,
    task_type      VARCHAR,
    payload        JSONB,
    scheduled_at   TIMESTAMP,        -- when to execute
    status         VARCHAR DEFAULT 'scheduled',
    created_at     TIMESTAMP
  );
\`\`\`

**Exactly-once scheduling** (the critical challenge):
\`\`\`
  Problem: Two scheduler instances both see next_run_at has passed
           Both enqueue the job → duplicate execution!

  Solution: Optimistic locking on the schedule row
    UPDATE schedules
    SET next_run_at = compute_next(cron_expr, NOW()),
        last_run_at = NOW()
    WHERE schedule_id = ?
    AND next_run_at = ?  -- CAS: only succeed if not already updated
    RETURNING *;

  If rows_affected = 0 → another scheduler already enqueued this run
\`\`\`

**Scheduler service leader election**:
\`\`\`
  Option 1: Database-based (simple)
    SELECT pg_try_advisory_lock(12345);
    Only one instance gets the lock, becomes the scheduler
    Others are hot standbys

  Option 2: Redis-based lock
    SET scheduler:leader worker-1 NX EX 30
    Renew every 10 seconds

  Option 3: ZooKeeper/etcd leader election
    Most robust, automatic failover
\`\`\`

**Scheduler loop**:
\`\`\`
  while true:
    // Find all schedules whose next_run_at has passed
    due_schedules = SELECT * FROM schedules
      WHERE enabled = true
      AND next_run_at <= NOW()
      ORDER BY next_run_at;

    for schedule in due_schedules:
      // Atomic: claim this run and compute next
      result = UPDATE schedules
        SET next_run_at = compute_next_run(schedule.cron_expr)
        WHERE schedule_id = schedule.id
        AND next_run_at = schedule.next_run_at;

      if result.rows_affected == 1:
        enqueue_job(schedule.task_type, schedule.payload);

    sleep(1 second);
\`\`\`

**Handling missed runs**: If the scheduler was down and missed a scheduled run:
\`\`\`
  Policies:
    SKIP:    Skip missed runs, schedule next future run
    CATCH_UP: Execute missed runs immediately (one at a time)
    COALESCE: Execute one catch-up run for all missed, then resume
\`\`\`

**Production systems**: Kubernetes CronJobs, Airflow, Temporal, Celery Beat, Quartz (Java), APScheduler (Python). Each provides scheduler HA, exactly-once guarantees, and monitoring.`
      },
      {
        question: 'How do you handle progress tracking and user experience for long-running operations?',
        answer: `Progress tracking transforms a frustrating "loading spinner" into an informative experience. Users who see concrete progress are significantly more patient and less likely to abandon or retry (which would create duplicate work).

**Progress reporting architecture**:
\`\`\`
  Worker                   Progress Store (Redis)       Client
    │                            │                        │
    ├── Update progress ──────►  SET job:abc:progress     │
    │   (after each chunk)       {percent: 35,            │
    │                             stage: "Processing",    │
    │                             message: "Page 7 of 20"}│
    │                            │                        │
    │                            │  ◄──── Poll / Subscribe │
    │                            │  ──── Return progress──►│
    │                            │                        │
    ├── Complete ────────────►   SET status: completed    │
\`\`\`

**Granular progress reporting**:
\`\`\`
  Simple percentage:
    {progress: 0.65}  // 65%

  Stage-based:
    {
      progress: 0.65,
      stage: "generating_charts",
      stages: [
        {name: "fetching_data",      status: "completed", duration: 3.2},
        {name: "computing_metrics",   status: "completed", duration: 8.1},
        {name: "generating_charts",   status: "processing", progress: 0.4},
        {name: "rendering_pdf",       status: "pending"},
        {name: "uploading_result",    status: "pending"}
      ],
      estimated_remaining: 45,  // seconds
      message: "Generating chart 4 of 10..."
    }
\`\`\`

**Estimation accuracy**:
\`\`\`
  Naive: progress = items_processed / total_items
    Problem: not all items take the same time

  Weighted: progress = time_elapsed / estimated_total_time
    Problem: estimation may be wrong

  Hybrid:
    1. Measure time for first 10% of items
    2. Extrapolate remaining time
    3. Blend with historical data for this task type
    4. Smooth the estimate (never go backward)

  estimated_remaining = max(
    historical_average * (1 - progress),
    time_per_item_so_far * remaining_items
  ) * smoothing_factor
\`\`\`

**UX patterns for long-running tasks**:
\`\`\`
  Duration < 3s:
    → Inline loading spinner, no progress bar

  Duration 3s - 30s:
    → Determinate progress bar with percentage
    → "Processing your request..."

  Duration 30s - 5min:
    → Detailed progress with stages and ETA
    → Option to navigate away ("We'll notify you when ready")

  Duration > 5min:
    → Email/push notification on completion
    → Dashboard showing all active jobs with progress
    → "This typically takes 10-15 minutes"

  Duration > 1 hour:
    → Job dashboard with cancel button
    → Email notification with download link
    → Historical duration statistics
\`\`\`

**Anti-patterns to avoid**:
- Progress bars that jump from 0% to 99% and stall (bad estimation)
- Progress that goes backward (never decrease the displayed percentage)
- "Estimated time: 2 minutes" that turns into 20 minutes (use ranges instead)
- No feedback at all for tasks > 3 seconds (users will retry/refresh)

**Storage for progress updates**: Use Redis with TTL for transient progress data. Do not write progress to PostgreSQL on every update — the write frequency would be too high (use Redis, then write final state to PostgreSQL on completion).`
      },
    ],

    dataModel: {
      description: 'Job lifecycle and scheduling state',
      schema: `Job Record:
  job_id:          UUID
  job_type:        task type identifier
  payload:         JSON input data
  status:          queued | processing | completed | failed | cancelled | cancelling
  priority:        integer (higher = more urgent)
  progress:        float (0.0 to 1.0)
  progress_detail: JSON (stage info, message, ETA)
  result:          JSON (output data or result URL)
  error:           text (if failed)
  attempts:        integer (retry count)
  max_attempts:    integer
  locked_by:       worker ID (null if not processing)
  locked_at:       timestamp (for heartbeat monitoring)
  created_at:      timestamp
  started_at:      timestamp
  completed_at:    timestamp

Schedule Record:
  schedule_id:     UUID
  name:            human-readable name
  cron_expression: cron string
  timezone:        IANA timezone
  task_type:       job type to create
  payload:         JSON parameters
  next_run_at:     timestamp (pre-computed)
  last_run_at:     timestamp
  enabled:         boolean
  miss_policy:     skip | catch_up | coalesce

Dead Letter Entry:
  dlq_id:          UUID
  job_id:          reference to failed job
  job_type:        task type
  payload:         original input
  error:           failure reason
  attempts:        total attempts before DLQ
  created_at:      timestamp
  resolved_at:     timestamp (null until manually resolved)
  resolution:      retry | discard | manual_fix`
    },
  },
];
