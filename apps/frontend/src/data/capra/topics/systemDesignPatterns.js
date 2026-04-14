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
    questions: 8,
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

    introduction: `The **Write-Ahead Log** (WAL) is one of the most fundamental patterns in data systems. The rule is simple: before any change is applied to the actual data structures on disk, a record of that change is appended to a sequential, append-only log file. If the process crashes after writing the log but before updating the data, the system can replay the log on startup and reach a consistent state.

Every major database — PostgreSQL, MySQL/InnoDB, SQLite, and all LSM-tree engines — relies on a WAL for **durability** and **atomicity**. Without it, a crash during a partial write could leave data pages in a corrupted, half-written state that is impossible to recover from deterministically.

Beyond single-node crash recovery, the WAL pattern extends naturally to **replication**. A follower can subscribe to the leader's log stream and apply the same sequence of changes, producing an identical copy. Kafka's commit log, etcd's Raft log, and PostgreSQL streaming replication all follow this principle.`,

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
    questions: 7,
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

    introduction: `The **Gossip Protocol** (also called epidemic protocol) is a peer-to-peer communication mechanism inspired by how rumors spread through a social network. Each node periodically selects a random subset of peers and exchanges its local state. Over successive rounds, information propagates exponentially until every node in the cluster converges on a shared view.

Gossip is valued for its **decentralization** — there is no coordinator, no single point of failure, and no leader election required for membership management. Systems like **Cassandra**, **DynamoDB**, **Consul**, and **Serf** rely on gossip for cluster membership, failure detection, and lightweight metadata propagation.

The mathematical property that makes gossip powerful is **logarithmic convergence**: in a cluster of N nodes with fan-out k, information reaches every node in approximately O(log N) rounds. For a 1,000-node cluster gossiping every second, full propagation takes roughly 10 seconds — without any centralized broadcast.`,

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

    introduction: `**Vector clocks** solve one of the hardest problems in distributed systems: determining the order of events when there is no shared global clock. In a single-process system, events are trivially ordered by wall-clock time. In a distributed system, clocks drift, network delays vary, and two nodes can perform conflicting operations at the "same" time.

A vector clock is a map from node ID to a counter. Each node increments its own counter on every local event. When a message is sent, the sender's full vector clock is attached. The receiver merges the incoming vector with its own by taking the element-wise maximum. This gives every event a **causal history** — you can compare two vector clocks and determine if one **happened before** the other or if they are **concurrent** (and therefore potentially conflicting).

Systems like **Amazon DynamoDB** (version vectors), **Riak**, and **Voldemort** use this pattern to detect write conflicts in an eventually consistent store. When a client reads a value and finds multiple concurrent versions, the application can resolve the conflict (e.g., merge shopping carts, take the latest profile update, or present the choice to the user).`,

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
    questions: 7,
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

    introduction: `A **Merkle tree** (hash tree) is a binary tree where every leaf node contains the hash of a data block and every internal node contains the hash of its two children. The root hash therefore represents a cryptographic fingerprint of the entire dataset. If even a single byte changes anywhere in the data, the root hash changes.

This structure enables **efficient difference detection**: two replicas can compare their root hashes to know instantly whether they agree. If they disagree, they walk down the tree, comparing child hashes at each level, until they find exactly which data blocks differ. This reduces the work of finding inconsistencies from O(N) — comparing every record — to O(log N), examining only the path from root to the differing leaves.

**Cassandra** and **DynamoDB** use Merkle trees for **anti-entropy repair**: a background process that detects and fixes inconsistencies between replicas. **Git** uses a Merkle DAG (directed acyclic graph) where every object — blob, tree, commit — is identified by the SHA-1 hash of its contents. **Bitcoin** stores the Merkle root of all transactions in each block header, allowing lightweight clients to verify individual transactions without downloading the entire block.`,

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

    introduction: `**Split-brain** occurs when a network partition divides a cluster into two (or more) subclusters, and each subcluster independently believes it is the active, authoritative partition. In a leader-follower system, this means two nodes simultaneously act as leader, accepting writes that may conflict with each other. When the partition heals, the system discovers divergent data that cannot be automatically reconciled.

This is not a theoretical concern — it is one of the most common and dangerous failure modes in production distributed systems. **MySQL replication**, **Redis Sentinel**, **Elasticsearch**, and **Kafka** have all experienced split-brain scenarios in real-world deployments. The consequences range from data loss to corrupted state to violated business invariants (e.g., selling more inventory than exists).

Preventing split-brain requires a mechanism to ensure that at most one leader can operate at any time. The three main approaches are **quorum-based election** (Raft/Paxos — only the majority partition can elect a leader), **fencing tokens** (a monotonically increasing number that storage systems use to reject stale leaders), and **STONITH** (physically shutting down the suspected-dead node before promoting a new leader).`,

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
    questions: 6,
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

    introduction: `**Hinted handoff** is an availability optimization used in distributed databases that follow the Dynamo model. When a write is destined for a node that is temporarily unreachable, another node in the cluster accepts the write on its behalf and stores a "hint" — a record of the intended destination. When the failed node recovers, the hinting node replays the stored writes to it, bringing it up to date.

This pattern works in tandem with **sloppy quorums**. In a strict quorum, a write to a key must reach its designated replica nodes. In a sloppy quorum, any node in the cluster can temporarily stand in for an unreachable replica, allowing the write to succeed. The hint ensures the data eventually reaches the correct node.

**Amazon DynamoDB**, **Apache Cassandra**, and **Riak** use hinted handoff to maintain write availability during transient failures. The key insight is that most node failures are short-lived — a restart, a brief network blip, a GC pause — and hinted handoff bridges that gap without the overhead of a full data rebalance or anti-entropy repair.`,

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
    questions: 6,
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

    introduction: `**Read repair** is an opportunistic consistency mechanism in distributed databases. During a read operation, the coordinator contacts multiple replicas and compares their responses. If one or more replicas return stale data, the coordinator sends the latest version to the outdated replicas, "repairing" the inconsistency as a side effect of the read.

This approach is a cornerstone of **eventually consistent** systems. Rather than requiring eager synchronization of all replicas on every write (which reduces availability), the system tolerates temporary inconsistency and fixes it lazily — when the data is actually accessed. This means frequently-read data converges quickly, while rarely-read data may remain stale for longer.

**Cassandra**, **DynamoDB**, and **Riak** implement read repair as part of their read path. Cassandra optimizes this with **digest queries**: instead of fetching the full value from all replicas, it fetches the full value from one and a lightweight digest (hash) from the others. Only if the digests disagree does it fetch the full value from the mismatched replicas.`,

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
    questions: 7,
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

    introduction: `A **segmented log** takes the simple concept of an append-only log and makes it practical for production systems by splitting the log into fixed-size or time-bounded **segments**. Instead of one ever-growing file, the log consists of a sequence of segment files: one "active" segment being appended to, and a series of "closed" segments that are immutable and eligible for cleanup.

This design solves critical operational problems. A single infinite log file is impossible to manage: it cannot be efficiently searched, it fills disks, and deleting old data requires rewriting the entire file. Segments allow old data to be **deleted** (drop entire segment files) or **compacted** (remove superseded entries) without touching the active write path.

**Apache Kafka** is the most prominent implementation of this pattern. Each Kafka partition is a segmented log on disk, with configurable segment size (default 1GB) and retention policies. **etcd**'s Raft log, **PostgreSQL**'s WAL (16MB segments), and **Apache BookKeeper** all use segmented logs. The pattern is foundational to any system that needs durable, ordered, high-throughput event storage.`,

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
    questions: 6,
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

    introduction: `The **high-water mark** (HWM) is a critical concept in replicated log systems. It marks the position in the log up to which entries have been safely replicated to enough nodes (a quorum) to guarantee durability. Entries at or before the high-water mark are **committed** — they will not be lost even if the leader crashes. Entries after the high-water mark are **uncommitted** — they exist only on the leader (and possibly some followers) and could be lost on failover.

In **Apache Kafka**, the high-water mark determines which messages are visible to consumers. A producer may have written a message and received an acknowledgment, but consumers cannot read it until all in-sync replicas (ISRs) have replicated it and the HWM has advanced. This prevents consumers from seeing data that might be rolled back if the leader fails.

In **Raft** consensus, the equivalent concept is the **commit index**. The leader tracks which log entries have been replicated to a majority of nodes and advances the commit index accordingly. Only committed entries are applied to the state machine. This is how Raft guarantees that a committed entry will be present in every future leader's log.`,

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
    questions: 6,
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

    introduction: `The **Phi-Accrual Failure Detector** replaces the traditional binary "alive or dead" failure detection with a continuous **suspicion level**. Instead of declaring a node dead after a fixed timeout (e.g., "no heartbeat for 10 seconds"), the phi-accrual detector maintains a statistical model of heartbeat arrival times and computes a value phi that represents how suspicious the silence is, given the historical pattern.

A phi value of 1 means there is approximately a 10% chance the node is still alive (the delay is unusual but not extreme). A phi of 5 means about a 0.001% chance. A phi of 8 means the probability is roughly 1 in 100 million. The application chooses a threshold: "mark the node as down when phi exceeds 8." This threshold translates directly to a **false positive rate** — how often you wrongly declare a healthy node as dead.

The critical advantage is **adaptiveness**. A fixed 10-second timeout works on a local network where heartbeats arrive every second, but on a congested WAN where heartbeats normally take 500ms-3s, the same timeout triggers constant false alarms. The phi-accrual detector learns the heartbeat distribution and adjusts automatically. **Cassandra** and **Akka** use this detector in production, and it is referenced in the Amazon Dynamo paper as a superior alternative to fixed timeouts.`,

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
    questions: 7,
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

    introduction: `The **Outbox Pattern** solves one of the most common reliability problems in microservice architectures: the **dual-write problem**. When a service needs to update its database AND publish an event to a message broker, these two operations cannot be made atomic with a simple approach. If the database write succeeds but the event publish fails (or vice versa), the system ends up in an inconsistent state.

The solution is elegant: instead of writing directly to the message broker, the service writes the event to an **outbox table** in the same database, within the same transaction as the business data change. A separate process then reads the outbox table and publishes the events to the message broker. Because the business data and the outbox entry are written in a single ACID transaction, they are guaranteed to be consistent — either both succeed or both fail.

Two approaches exist for reading the outbox: **polling** (periodically query the outbox table for unpublished events) and **Change Data Capture** (CDC) with tools like **Debezium**, which tails the database's WAL and emits events for every outbox insert. CDC is the preferred production approach because it has lower latency, does not require polling, and avoids the "busy-wait" overhead. Companies like **Confluent**, **Wix**, and **Zalando** use the outbox pattern with Debezium as a standard integration architecture.`,

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
    questions: 7,
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

    introduction: `**Fencing** is a safety mechanism that prevents "zombie" processes — stale leaders or lock holders that believe they still hold authority — from corrupting data. The core insight is that in a distributed system, a process can appear dead (due to a GC pause, network partition, or OS swap) and then wake up without knowing it has lost leadership. If the system has already elected a new leader, the zombie's writes must be rejected.

The primary tool is the **fencing token**: a monotonically increasing number (epoch, term, or sequence number) issued with every leadership grant or lock acquisition. When a process writes to storage, it includes its fencing token. The storage layer tracks the highest token it has seen and rejects any write carrying a lower token. This guarantee holds even if the zombie does not know it has been fenced — the storage enforces the invariant.

This pattern is critical in **Raft** (term numbers), **ZooKeeper** (sequential znodes), **Chubby** (sequencer tokens), and any system using **distributed locks** for leader election. Martin Kleppmann's analysis in "Designing Data-Intensive Applications" highlights that a distributed lock without fencing tokens only provides a performance optimization (avoid duplicate work) — not a correctness guarantee (prevent data corruption).`,

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
