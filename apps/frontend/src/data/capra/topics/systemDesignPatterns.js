// Distributed system design patterns — consistency, availability, and data integrity

export const systemDesignPatternCategories = [
  { id: 'consistency', name: 'Consistency Patterns', icon: 'shield', color: '#3b82f6' },
  { id: 'availability', name: 'Availability Patterns', icon: 'zap', color: '#10b981' },
  { id: 'data-integrity', name: 'Data Integrity Patterns', icon: 'database', color: '#8b5cf6' },
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
];
