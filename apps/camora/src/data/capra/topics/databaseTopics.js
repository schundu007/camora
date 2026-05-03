// Database internals categories, category map, and core topics

export const databaseCategories = [
  { id: 'storage-engine', name: 'Storage Engines', icon: 'database', color: '#3b82f6' },
  { id: 'transactions', name: 'Transactions & Concurrency', icon: 'shield', color: '#ef4444' },
  { id: 'distributed', name: 'Distributed Databases', icon: 'globe', color: '#8b5cf6' },
  { id: 'types', name: 'Database Types', icon: 'layers', color: '#f59e0b' },
];

export const databaseCategoryMap = {
  'database-storage-engines': 'storage-engine',
  'database-indexing-deep-dive': 'storage-engine',
  'transaction-management': 'transactions',
  'concurrency-control': 'transactions',
  'sql-isolation-levels': 'transactions',
  'database-partitioning-sharding': 'distributed',
  'database-replication-strategies': 'distributed',
  'consensus-algorithms': 'distributed',
  'database-recovery': 'transactions',
  'nosql-internals': 'types',
  'newsql-databases': 'types',
  'specialized-databases': 'types',
};

// Database Internals Topics
export const databaseTopics = [
  {
    id: 'database-storage-engines',
    title: 'Storage Engines',
    icon: 'database',
    color: '#3b82f6',
    questions: 10,
    description: 'B-tree vs LSM-tree, page structure, buffer pool, and write amplification.',
    concepts: ['B-tree', 'LSM-tree', 'Page Structure', 'Buffer Pool', 'Write Amplification', 'Compaction'],
    tips: [
      'B-trees optimize for reads; LSM-trees optimize for writes',
      'Buffer pool hit ratio is the single most important performance metric',
      'Write amplification is the hidden cost that kills SSD lifespan and throughput'
    ],

    introduction: `Storage engines are the heart of every database. They determine how data is physically written to disk, organized in memory, and retrieved during queries. Two dominant paradigms exist: B-trees (used by PostgreSQL, MySQL InnoDB, Oracle) and LSM-trees (used by RocksDB, LevelDB, Cassandra).

The choice of storage engine shapes every performance characteristic of the database. Read-heavy OLTP workloads favor B-trees with their O(log n) point lookups and in-place updates. Write-heavy workloads favor LSM-trees with their sequential write patterns and high ingestion throughput. Understanding these internals lets you pick the right engine for your workload and tune it effectively.`,

    dataModel: {
      description: 'B-tree vs LSM-tree architecture comparison',
      schema: `B-tree Page Structure (fixed-size pages, typically 4-16 KB):
+---------------------------------------------+
| Page Header (LSN, checksum, free space ptr) |
+---------------------------------------------+
| Key1 | Ptr1 | Key2 | Ptr2 | ... | KeyN | PtrN |
+---------------------------------------------+
| Free Space                                   |
+---------------------------------------------+

  Root Page
  /    |    \\
 /     |     \\
Internal   Internal   Internal
 / \\      / \\       / \\
Leaf Leaf  Leaf Leaf  Leaf Leaf
[data]     [data]     [data]

LSM-tree Structure (append-only, leveled):
+--------------------------------------------------+
| Write Path:                                       |
|  Writes --> WAL (disk) --> MemTable (memory)      |
|               |                                    |
|           On flush:                                |
|  MemTable --> SSTable L0 (disk, sorted)           |
|                                                    |
| Compaction merges SSTables across levels:          |
|  L0: [SST][SST][SST]    (may overlap)            |
|  L1: [  SST  ][  SST  ] (non-overlapping)        |
|  L2: [ SST ][ SST ][ SST ][ SST ]                |
|  L3: [SST][SST][SST][SST][SST][SST][SST][SST]   |
|  Each level is ~10x larger than the previous       |
+--------------------------------------------------+

Buffer Pool (shared memory region):
+-----------+-----------+-----------+-----------+
| Page 001  | Page 042  | Page 107  | Page 203  |
| (clean)   | (dirty)   | (clean)   | (dirty)   |
+-----------+-----------+-----------+-----------+
         ^                     ^
         |                     |
  Page Table (hash map: page_id -> frame)
  LRU / Clock eviction policy for cold pages`
    },

    keyQuestions: [
      {
        question: 'How does a B-tree store and retrieve data?',
        answer: `**B-tree Fundamentals**:
A B-tree is a self-balancing tree where each node corresponds to a fixed-size disk page (typically 8-16 KB). Data is stored sorted by key, enabling efficient binary search.

**Structure**:
- **Root node**: Entry point, always cached in memory
- **Internal nodes**: Contain keys and pointers to child pages
- **Leaf nodes**: Contain actual key-value pairs (or pointers to heap tuples)

**Read Path** (point lookup):
1. Start at root page (always in buffer pool)
2. Binary search within page to find correct child pointer
3. Follow pointer to next level, repeat
4. Reach leaf page, binary search for key
5. Cost: O(log_B n) disk reads, where B is branching factor (~500 for 8KB pages)

**Write Path** (insert/update):
1. Find correct leaf page via read path
2. If page has space: insert in sorted order, mark page dirty
3. If page is full: split into two pages, propagate new key to parent
4. Parent may also split, cascading up to root (rare)

**Why B-trees dominate OLTP**:
- Predictable O(log n) reads — typically 3-4 levels for billions of rows
- In-place updates avoid write amplification for updates
- Range scans follow leaf page sibling pointers`
      },
      {
        question: 'How does an LSM-tree work and when should you use one?',
        answer: `**LSM-tree (Log-Structured Merge-tree)**:

**Write Path** (always sequential):
1. Write to WAL (Write-Ahead Log) on disk for durability
2. Insert into in-memory MemTable (usually a red-black tree or skip list)
3. When MemTable reaches threshold (~64MB), freeze it
4. Flush frozen MemTable to disk as a sorted SSTable (Sorted String Table)
5. Background compaction merges SSTables to reduce read amplification

**Read Path** (potentially multiple lookups):
1. Check MemTable first (in memory)
2. Check Bloom filters for each SSTable level
3. Search SSTables from newest to oldest
4. May need to check multiple SSTables before finding key

**Compaction Strategies**:
- **Size-tiered**: Merge similarly-sized SSTables. Simpler, higher space amplification.
- **Leveled**: Each level has non-overlapping SSTables. Better read performance, more write amplification.
- **FIFO**: Delete oldest SSTables. Good for time-series data.

**Use LSM-trees when**:
- Write throughput is critical (logging, metrics, time-series)
- Workload is append-heavy with few updates
- Sequential disk I/O matters (HDDs, cloud storage)
- Can tolerate slightly higher read latency

**Avoid LSM-trees when**:
- Read latency must be consistently low
- Heavy point-lookup workload
- Frequent updates to existing keys (high write amplification from compaction)`
      },
      {
        question: 'What is write amplification and why does it matter?',
        answer: `**Write Amplification** = Total bytes written to disk / Bytes of user data written

**In B-trees**:
- Updating a single byte requires rewriting the entire page (8-16 KB)
- Write amplification: ~100-1000x for small updates
- Mitigated by: batching writes, WAL grouping, larger updates

**In LSM-trees**:
- Data is written to WAL, then MemTable, then flushed, then compacted multiple times
- Each compaction level rewrites data: L0 -> L1 -> L2 -> ... -> Ln
- Leveled compaction: write amplification = ~10-30x
- Size-tiered compaction: write amplification = ~4-10x

**Why it matters**:
1. **SSD Lifespan**: SSDs have limited write cycles (P/E cycles). High write amplification burns through them faster.
2. **Throughput**: Disk bandwidth is consumed by background rewrites, reducing available bandwidth for user writes.
3. **Tail Latency**: Compaction storms cause latency spikes at p99.

**Strategies to reduce write amplification**:
- Use larger MemTable sizes (flush less often)
- Tune compaction concurrency and triggers
- Choose size-tiered compaction if writes dominate
- Consider hybrid engines (WiredTiger uses both B-tree and LSM)`
      },
      {
        question: 'How does the buffer pool work in a relational database?',
        answer: `**Buffer Pool** = In-memory cache of disk pages

**Purpose**: Eliminate disk I/O by keeping hot pages in memory. A well-tuned buffer pool serves 95-99% of reads from memory.

**Core Components**:
- **Page frames**: Fixed-size memory slots (matching disk page size)
- **Page table**: Hash map from (file_id, page_number) -> frame_id
- **Dirty page list**: Tracks modified pages that need flushing
- **Eviction policy**: Decides which pages to remove when full

**Page Lifecycle**:
1. Query requests page -> check page table
2. **Cache hit**: Return page from memory (fast path, ~100ns)
3. **Cache miss**: Read page from disk (~1-10ms), evict cold page if full
4. Modifications mark page as dirty
5. Background checkpoint process flushes dirty pages to disk

**Eviction Policies**:
- **LRU (Least Recently Used)**: Simple but susceptible to sequential scan pollution
- **Clock**: Approximation of LRU, lower overhead
- **LRU-K**: Track K-th most recent access, better for mixed workloads
- **ARC**: Adaptive replacement cache, balances recency and frequency

**Tuning**:
- Set buffer pool to 70-80% of available RAM
- Monitor hit ratio: \`SHOW STATUS LIKE 'Innodb_buffer_pool_read%'\`
- Hit ratio < 95% indicates undersized pool or working set exceeds memory`
      }
    ],

    basicImplementation: {
      title: 'B-tree Storage Engine',
      description: 'Classic storage engine using a B-tree for primary key lookups, with a buffer pool caching disk pages in memory. Suitable for read-heavy OLTP workloads with predictable latency requirements.',
      svgTemplate: 'singleServer',
      problems: [
        'Write amplification from full-page rewrites on small updates',
        'Page splits cause random I/O and briefly lock the tree',
        'Buffer pool cold start after restart requires warm-up period',
        'Fragmentation accumulates over time, requiring VACUUM or OPTIMIZE'
      ]
    },

    advancedImplementation: {
      title: 'LSM-tree with Tiered Compaction',
      description: 'WAL for durability -> MemTable for fast writes -> Immutable SSTables flushed to disk -> Background compaction merges levels -> Bloom filters accelerate reads.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Sequential writes achieve near-disk-bandwidth throughput',
        'Bloom filters eliminate 99% of unnecessary SSTable reads',
        'Leveled compaction bounds space amplification to ~10%',
        'Rate-limited compaction prevents latency spikes',
        'Partitioned indexes reduce memory overhead for large datasets'
      ]
    },

    discussionPoints: [
      {
        topic: 'B-tree vs LSM-tree Trade-offs',
        points: [
          'B-tree: faster reads, slower writes, moderate space usage',
          'LSM-tree: slower reads, faster writes, higher space during compaction',
          'B-tree: in-place updates, predictable performance',
          'LSM-tree: append-only, background compaction can spike latency',
          'Hybrid engines (WiredTiger, TiKV) combine both approaches'
        ]
      },
      {
        topic: 'Storage Engine Selection Criteria',
        points: [
          'Read/write ratio determines engine choice',
          'Point lookups vs range scans affect index structure',
          'SSD vs HDD changes the cost model for random I/O',
          'Memory-to-data ratio impacts caching effectiveness',
          'Compression ratios differ between engines'
        ]
      }
    ]
  },

  {
    id: 'database-indexing-deep-dive',
    title: 'Indexing Deep Dive',
    icon: 'database',
    color: '#3b82f6',
    questions: 12,
    description: 'B-tree, hash, composite, covering, partial, GIN/GiST indexes, and when to index.',
    concepts: ['B-tree Index', 'Hash Index', 'Composite Index', 'Covering Index', 'Partial Index', 'GIN/GiST'],
    tips: [
      'The leftmost prefix rule determines which queries a composite index can serve',
      'Covering indexes eliminate heap lookups entirely — a massive performance win',
      'Over-indexing slows writes and wastes storage — measure before adding indexes'
    ],

    introduction: `Indexes are the most impactful performance tool in any database. A missing index can turn a 10ms query into a 10-second table scan. But indexes are not free: each one consumes storage, slows down writes, and adds maintenance overhead during compaction and vacuuming.

Mastering indexes means understanding not just B-tree indexes, but the full spectrum: hash indexes for equality lookups, GIN indexes for full-text search and JSONB, GiST indexes for geometric and range queries, partial indexes for filtered subsets, and covering indexes that serve queries entirely from the index without touching the heap.`,

    dataModel: {
      description: 'Index structures and access patterns',
      schema: `B-tree Index (ordered, supports range queries):
+---------------------------+
|       Root Node           |
|   [10  |  50  |  90]     |
+--/------|---------\\------+
  /       |          \\
[1,3,7] [12,30,45] [55,72,88]  <-- leaf nodes
  |         |           |
 heap      heap        heap     <-- pointers to table rows

Hash Index (equality only, O(1) lookup):
hash(key) --> bucket --> [key, pointer]
- Fast for WHERE col = value
- Cannot support range queries or ORDER BY
- Not crash-safe in some engines (PostgreSQL < 10)

Composite Index on (a, b, c):
+---------+---------+---------+
| a=1,b=1 | a=1,b=2 | a=2,b=1 |  <-- sorted by a, then b, then c
+---------+---------+---------+
Usable for:    WHERE a=1
               WHERE a=1 AND b=2
               WHERE a=1 AND b=2 AND c=3
NOT usable for: WHERE b=2 (skips leftmost)
                WHERE a=1 AND c=3 (gap in prefix)

Covering Index (includes all columns query needs):
CREATE INDEX idx_cover ON orders(user_id, status)
  INCLUDE (total, created_at);

Query: SELECT total, created_at FROM orders
       WHERE user_id = 5 AND status = 'active';
--> Index-only scan, no heap access needed

GIN Index (Generalized Inverted Index):
Document: "the quick brown fox"
  the   -> [doc1, doc5, doc9]
  quick -> [doc1, doc3]
  brown -> [doc1, doc7]
  fox   -> [doc1, doc2]
- Ideal for full-text search, arrays, JSONB`
    },

    keyQuestions: [
      {
        question: 'How do B-tree indexes work internally?',
        answer: `**B-tree Index Structure**:

A B-tree index is a sorted copy of the indexed column(s) plus pointers back to the heap (actual table rows). It is separate from the table data.

**Leaf Node Contents** (for secondary index):
- Indexed column value(s)
- Pointer to heap tuple (ctid in PostgreSQL = block number + offset)
- Next/previous leaf page pointers (for range scans)

**Lookup Process**:
1. Traverse from root to leaf: O(log_B n) page reads
2. For a table with 1 billion rows and branching factor 500:
   - log_500(1,000,000,000) = ~3.3 levels
   - Only 4 page reads to find any row
3. Follow heap pointer to fetch actual row data

**Range Scan Process**:
1. Find starting leaf via tree traversal
2. Follow sibling pointers across leaf pages
3. Each leaf page contains ~200-500 index entries

**Key Properties**:
- Always balanced: all leaves at same depth
- Nodes are at least half-full (maintains efficiency)
- Updates may cause page splits (when full) or merges (when sparse)
- HOT updates in PostgreSQL avoid index updates when indexed columns unchanged`
      },
      {
        question: 'What is the leftmost prefix rule for composite indexes?',
        answer: `**Leftmost Prefix Rule**:
A composite index on (a, b, c) stores entries sorted by a first, then by b within each a value, then by c within each (a, b) pair.

**The index can serve queries that use a leading prefix**:
- WHERE a = 1 --> uses index
- WHERE a = 1 AND b = 2 --> uses index
- WHERE a = 1 AND b = 2 AND c = 3 --> uses index (full match)
- WHERE a = 1 ORDER BY b --> uses index for both filter and sort

**The index CANNOT efficiently serve**:
- WHERE b = 2 --> cannot use index (no leading 'a')
- WHERE c = 3 --> cannot use index
- WHERE a = 1 AND c = 3 --> partial: uses 'a' only, scans for 'c'

**Practical Example**:
\`CREATE INDEX idx ON orders(customer_id, status, created_at);\`

Efficient queries:
- Orders by customer: WHERE customer_id = 123
- Active orders for customer: WHERE customer_id = 123 AND status = 'active'
- Recent active orders: WHERE customer_id = 123 AND status = 'active' ORDER BY created_at DESC

Inefficient (index not useful):
- All active orders: WHERE status = 'active' (needs separate index on status)

**Column Order Strategy**:
1. Equality columns first (highest selectivity)
2. Range/inequality columns next
3. ORDER BY / GROUP BY columns last`
      },
      {
        question: 'When should you use a partial index vs a full index?',
        answer: `**Partial Index**: An index that covers only a subset of rows, defined by a WHERE clause.

**Syntax**:
\`CREATE INDEX idx_active_orders ON orders(created_at) WHERE status = 'active';\`

**When to use partial indexes**:
1. **Skewed data**: 95% of orders are 'completed', 5% are 'active'. If you only query active orders, a partial index is 20x smaller.
2. **Soft deletes**: \`WHERE deleted_at IS NULL\` — index only non-deleted rows.
3. **Hot subset**: Only recent data is queried. \`WHERE created_at > '2025-01-01'\`.
4. **Boolean flags**: \`WHERE is_featured = true\` when only 1% of rows are featured.

**Benefits**:
- Dramatically smaller index size (less storage, better cache fit)
- Faster index maintenance (fewer entries to update on writes)
- Better buffer pool utilization (index pages stay cached)

**Limitations**:
- Query planner only uses it when the query WHERE clause matches the index predicate
- Must repeat the exact condition or a subset of it in your queries
- Cannot serve queries outside the partial index predicate

**Full index is better when**:
- Queries filter on various values of the column (not just one subset)
- The filtered subset is large (>50% of table)
- You need range scans across the entire table`
      },
      {
        question: 'Explain GIN and GiST indexes and their use cases.',
        answer: `**GIN (Generalized Inverted Index)**:

**How it works**: Maps each element/token to a sorted list of row pointers (posting list). Like the index at the back of a book.

**Use cases**:
- **Full-text search**: \`CREATE INDEX idx ON articles USING gin(to_tsvector('english', body));\`
- **JSONB queries**: \`CREATE INDEX idx ON events USING gin(metadata);\` for \`WHERE metadata @> '{"type": "click"}'\`
- **Array containment**: \`CREATE INDEX idx ON products USING gin(tags);\` for \`WHERE tags @> ARRAY['sale']\`
- **Trigram similarity**: With pg_trgm extension for LIKE/ILIKE queries

**Characteristics**: Slower to build, faster to query. Updates are batched via pending list. Best for data types with many searchable elements per row.

**GiST (Generalized Search Tree)**:

**How it works**: A balanced tree where each internal node contains a bounding predicate that covers all entries in its subtree. Supports overlap and containment operations.

**Use cases**:
- **Geometric data**: Point-in-polygon, nearest neighbor, bounding box intersection
- **Range types**: \`CREATE INDEX idx ON reservations USING gist(during);\` for \`WHERE during && '[2025-01-01, 2025-01-31]'\`
- **IP address ranges**: Network containment queries
- **PostGIS**: Spatial queries (find restaurants within 5km)

**GIN vs GiST**:
| Aspect | GIN | GiST |
|--------|-----|------|
| Build speed | Slower | Faster |
| Query speed | Faster | Slower |
| Update cost | Higher (pending list) | Lower |
| Best for | Exact match, containment | Overlap, nearest-neighbor |`
      }
    ],

    basicImplementation: {
      title: 'Single-Column B-tree Index',
      description: 'Standard B-tree index on a single column. Accelerates equality and range lookups. The default and most common index type in relational databases.',
      svgTemplate: 'singleServer',
      problems: [
        'Cannot serve multi-column queries efficiently without composite index',
        'Heap lookups for non-indexed columns add random I/O',
        'Index bloat from dead tuples requires periodic maintenance',
        'Write overhead increases linearly with number of indexes'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Strategy Indexing',
      description: 'Composite B-tree indexes for OLTP queries -> Covering indexes to eliminate heap access -> Partial indexes for hot subsets -> GIN for full-text/JSONB -> Expression indexes for computed lookups.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Composite indexes serve the most common multi-column query patterns',
        'INCLUDE columns in covering indexes avoid heap fetches',
        'Partial indexes reduce size by 90%+ for skewed data distributions',
        'GIN indexes enable sub-millisecond full-text search',
        'Expression indexes (e.g., on LOWER(email)) support computed predicates'
      ]
    },

    discussionPoints: [
      {
        topic: 'Indexing Pitfalls',
        points: [
          'Over-indexing: every index slows writes and consumes memory',
          'Wrong column order in composite indexes renders them useless for some queries',
          'Low-cardinality columns (boolean, status) are poor standalone index candidates',
          'Index-only scans fail if visibility map is not up to date (need VACUUM)',
          'Unused indexes waste resources — monitor with pg_stat_user_indexes'
        ]
      },
      {
        topic: 'Index Maintenance',
        points: [
          'REINDEX rebuilds bloated indexes without downtime (CONCURRENTLY)',
          'VACUUM keeps visibility map current for index-only scans',
          'pg_stat_user_indexes shows index usage and helps identify unused indexes',
          'Index size monitoring prevents disk space surprises',
          'Automated index advisors (HypoPG, Dexter) suggest optimal indexes'
        ]
      }
    ]
  },

  {
    id: 'transaction-management',
    title: 'Transaction Management',
    icon: 'shield',
    color: '#ef4444',
    questions: 10,
    description: 'ACID deep dive, transaction lifecycle, savepoints, and distributed transactions (2PC, 3PC).',
    concepts: ['ACID Properties', 'Transaction Lifecycle', 'Savepoints', 'Two-Phase Commit', 'Three-Phase Commit', 'Saga Pattern'],
    tips: [
      'Atomicity is about all-or-nothing, not speed — transactions can be slow and still be atomic',
      'Distributed transactions (2PC) are a last resort — prefer saga pattern when possible',
      'Savepoints let you partially roll back without aborting the entire transaction'
    ],

    introduction: `Transactions are the mechanism that keeps data correct in the face of failures and concurrency. The ACID properties — Atomicity, Consistency, Isolation, Durability — are not abstract theory; they are concrete guarantees implemented by specific mechanisms in the storage engine.

Understanding transactions deeply means knowing how the WAL ensures atomicity and durability, how MVCC provides isolation without blocking readers, how constraint checks enforce consistency, and how distributed transactions coordinate across multiple nodes. In interviews, you need to discuss not just what ACID means but how each property is implemented and what trade-offs exist.`,

    dataModel: {
      description: 'Transaction lifecycle and distributed commit protocols',
      schema: `Transaction Lifecycle:
+-------+     +--------+     +-----------+     +-----------+
| BEGIN | --> | ACTIVE | --> | PARTIALLY | --> | COMMITTED |
+-------+     +--------+     | COMMITTED |     +-----------+
                  |           +-----------+
                  |                               +---------+
                  +-----------------------------> | ABORTED |
                                                  +---------+

Two-Phase Commit (2PC):
Coordinator                 Participant A    Participant B
    |                            |                |
    |--- PREPARE -------------->|                |
    |--- PREPARE -------------------------------->|
    |                            |                |
    |<-- VOTE YES --------------|                |
    |<-- VOTE YES --------------------------------|
    |                            |                |
    |--- COMMIT --------------->|                |
    |--- COMMIT --------------------------------->|
    |                            |                |
    |<-- ACK -------------------|                |
    |<-- ACK ------------------------------------|

Saga Pattern (compensating transactions):
T1 -----> T2 -----> T3 -----> T4 (success)
 |          |         |
 |          |         +--> C3 (compensate)
 |          +------------> C2 (compensate)
 +-----------------------> C1 (compensate)

If T3 fails: execute C2, then C1 to undo earlier steps`
    },

    keyQuestions: [
      {
        question: 'Explain each ACID property and how it is implemented.',
        answer: `**Atomicity** — All or nothing.
- **Implementation**: Write-Ahead Log (WAL). Every change is logged before applying. On crash, replay or undo incomplete transactions.
- **Mechanism**: Transaction manager tracks all operations. COMMIT writes a commit record to WAL. ROLLBACK replays the undo log.
- **Cost**: WAL writes add latency to every transaction.

**Consistency** — Database moves from one valid state to another.
- **Implementation**: Constraint checks (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, NOT NULL) enforced at statement or transaction end.
- **Mechanism**: Deferred constraints check at COMMIT time. Immediate constraints check after each statement.
- **Note**: Application-level consistency (business rules) is the developer's responsibility.

**Isolation** — Concurrent transactions do not interfere.
- **Implementation**: MVCC (Multi-Version Concurrency Control) in modern databases. Each transaction sees a snapshot of data.
- **Mechanism**: PostgreSQL stores xmin/xmax on each tuple. Transaction visibility rules determine which version each transaction sees.
- **Levels**: Read Uncommitted, Read Committed, Repeatable Read, Serializable — each trades performance for correctness.

**Durability** — Committed data survives crashes.
- **Implementation**: WAL is fsync'd to disk before COMMIT returns. Data pages flushed lazily by background checkpoint process.
- **Mechanism**: Group commit batches multiple transaction WAL records into a single fsync (amortizes the 1-10ms fsync cost).
- **Trade-off**: synchronous_commit=off gives 3x throughput but risks losing last few milliseconds of commits on crash.`
      },
      {
        question: 'How does Two-Phase Commit (2PC) work and what are its limitations?',
        answer: `**Two-Phase Commit** ensures atomic commits across multiple database nodes.

**Phase 1 — Prepare (Voting)**:
1. Coordinator sends PREPARE to all participants
2. Each participant writes changes to local WAL, acquires locks
3. Participant votes YES (ready to commit) or NO (must abort)
4. Participant that votes YES is "in doubt" — it has promised to commit but has not yet

**Phase 2 — Commit (Decision)**:
1. If ALL participants voted YES: Coordinator sends COMMIT
2. If ANY participant voted NO: Coordinator sends ABORT
3. Participants execute the decision and release locks
4. Participants send ACK to coordinator

**The Blocking Problem**:
If the coordinator crashes after Phase 1 but before Phase 2:
- Participants that voted YES are stuck holding locks
- They cannot unilaterally commit or abort
- Must wait for coordinator recovery (could be minutes or hours)
- All other transactions blocked by held locks

**Limitations**:
- **Blocking**: Coordinator failure blocks all participants
- **Latency**: Minimum 2 round trips + 3 forced WAL writes
- **Availability**: Any participant failure aborts the whole transaction
- **Scalability**: Lock duration spans network round trips

**Three-Phase Commit** adds a pre-commit phase to reduce blocking but does not fully eliminate it and adds latency. Rarely used in practice.

**Modern Alternatives**:
- **Saga pattern**: Sequence of local transactions with compensating actions
- **Percolator model** (Google): Distributed transactions without coordinator
- **Calvin/BOHM**: Deterministic ordering eliminates distributed coordination`
      },
      {
        question: 'What are savepoints and when would you use them?',
        answer: `**Savepoints** create named markers within a transaction that you can roll back to without aborting the entire transaction.

**Syntax**:
\`\`\`sql
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 100.00);
SAVEPOINT before_items;

INSERT INTO order_items (order_id, product_id) VALUES (1, 999);
-- Oops, product 999 doesn't exist (FK violation)
ROLLBACK TO before_items;
-- Transaction still alive, order insert preserved

INSERT INTO order_items (order_id, product_id) VALUES (1, 42);
COMMIT;
\`\`\`

**Use Cases**:
1. **Batch processing**: Process 1000 records, savepoint every 100. If record 350 fails, roll back to savepoint at 300 and skip the bad batch.
2. **Optimistic operations**: Try an operation that might fail (unique constraint, FK violation). Roll back to savepoint on failure, try alternative.
3. **Complex business logic**: Multi-step workflows where intermediate steps may fail independently.
4. **Testing within transactions**: Try a speculative operation, inspect results, roll back if undesirable.

**How they work internally**:
- Each savepoint creates a sub-transaction with its own undo log segment
- ROLLBACK TO replays the undo log back to the savepoint
- RELEASE SAVEPOINT merges the sub-transaction into the parent
- Nested savepoints form a stack (LIFO rollback order)

**Limitations**:
- Still hold all locks from before the savepoint
- Cannot savepoint across distributed transactions in most databases
- Deep nesting adds memory overhead for undo log segments`
      },
      {
        question: 'Compare the Saga pattern with distributed transactions.',
        answer: `**Distributed Transactions (2PC)**:
- Strong consistency: all-or-nothing across nodes
- Synchronous: all participants must be available
- Locks held across network calls (high contention)
- Simple programming model (looks like a local transaction)

**Saga Pattern**:
- Eventual consistency: temporary inconsistency during execution
- Asynchronous: each step is an independent local transaction
- No distributed locks (better availability and throughput)
- Complex programming model (must design compensating actions)

**Saga Execution Styles**:

**Choreography** (event-driven):
- Each service publishes events, next service reacts
- Order Service -> "OrderCreated" -> Payment Service -> "PaymentProcessed" -> Inventory Service
- Pro: Decoupled, no central coordinator
- Con: Hard to understand flow, difficult to debug

**Orchestration** (command-driven):
- Central orchestrator directs each step
- Orchestrator calls Order -> Payment -> Inventory in sequence
- Pro: Clear flow, easier to reason about
- Con: Orchestrator is a single point of logic

**Designing Compensating Actions**:
- Not always a simple "undo" — some actions are not reversible
- Refund is not the inverse of charge (refund fees, timing differences)
- Must be idempotent (safe to retry if compensation message is delivered twice)
- May require human intervention for edge cases

**When to choose**:
- 2PC: Financial transfers, inventory reservation where correctness is paramount
- Saga: E-commerce checkout, travel booking, any multi-service workflow where eventual consistency is acceptable`
      }
    ],

    basicImplementation: {
      title: 'Single-Node ACID Transactions',
      description: 'WAL-based atomicity and durability, MVCC-based isolation, constraint-based consistency. All operations on a single database node with full ACID guarantees.',
      svgTemplate: 'singleServer',
      problems: [
        'Single-node limits: cannot distribute data or load',
        'Long transactions hold locks and block other transactions',
        'WAL fsync latency adds 1-10ms per commit',
        'No coordination with other services or databases'
      ]
    },

    advancedImplementation: {
      title: 'Saga-based Distributed Transactions',
      description: 'Orchestrator coordinates sequence of local transactions across services -> Each service commits independently -> On failure, compensating transactions undo completed steps -> Event log provides audit trail and recovery.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Each step is a local ACID transaction with full guarantees',
        'Compensating actions provide eventual atomicity',
        'Idempotency keys prevent duplicate processing on retries',
        'Dead letter queues capture failed compensations for manual review',
        'Saga execution log enables monitoring and debugging'
      ]
    },

    discussionPoints: [
      {
        topic: 'Transaction Design Best Practices',
        points: [
          'Keep transactions short to minimize lock contention',
          'Avoid user interaction within open transactions',
          'Use appropriate isolation level — do not default to SERIALIZABLE',
          'Retry logic with exponential backoff for serialization failures',
          'Monitor long-running transactions and set statement timeouts'
        ]
      },
      {
        topic: 'Distributed Transaction Pitfalls',
        points: [
          '2PC coordinator failure can block entire system',
          'Saga compensations must be idempotent and tested thoroughly',
          'Eventual consistency requires UI design changes (show pending states)',
          'Monitoring distributed transactions requires correlation IDs',
          'Timeout handling is critical — what happens if a participant never responds?'
        ]
      }
    ]
  },

  {
    id: 'concurrency-control',
    title: 'Concurrency Control',
    icon: 'shield',
    color: '#ef4444',
    questions: 10,
    description: 'Optimistic vs pessimistic locking, shared/exclusive/intent locks, MVCC, and deadlock detection.',
    concepts: ['Optimistic Locking', 'Pessimistic Locking', 'Shared/Exclusive Locks', 'Intent Locks', 'MVCC', 'Deadlock Detection'],
    tips: [
      'MVCC lets readers never block writers — this is why PostgreSQL performs well under mixed workloads',
      'Optimistic concurrency is better when conflicts are rare; pessimistic is better when conflicts are common',
      'Deadlocks are not bugs — they are expected in concurrent systems. The key is detecting and handling them.'
    ],

    introduction: `Concurrency control is how databases allow multiple transactions to operate simultaneously without corrupting data. Without it, two users buying the last item in stock could both succeed, or a bank transfer could lose money mid-flight.

Two fundamental philosophies exist: pessimistic locking (assume conflicts will happen, lock preemptively) and optimistic locking (assume conflicts are rare, detect and retry). Modern databases primarily use MVCC (Multi-Version Concurrency Control), which provides snapshot isolation by maintaining multiple versions of each row, allowing readers and writers to operate without blocking each other.`,

    dataModel: {
      description: 'Lock modes, MVCC versioning, and deadlock detection',
      schema: `Lock Compatibility Matrix:
+------------+---------+-----------+
| Lock Mode  | Shared  | Exclusive |
+------------+---------+-----------+
| Shared     |  YES    |   NO      |
| Exclusive  |  NO     |   NO      |
+------------+---------+-----------+
Shared (S): Multiple readers can hold simultaneously
Exclusive (X): Only one writer, blocks all others

Intent Lock Hierarchy:
+--------------------------------------------------+
| Table-level:  IS (Intent Shared), IX (Intent Excl)|
|   |                                                |
| Page-level:   IS / IX                              |
|   |                                                |
| Row-level:    S (Shared) / X (Exclusive)           |
+--------------------------------------------------+
Intent locks signal "a transaction intends to lock rows
in this table" — prevents table-level conflicts efficiently.

MVCC in PostgreSQL (tuple versioning):
+-------------------------------------------+
| Heap Tuple:                                |
| xmin=100 | xmax=0   | data: Alice, $500  |  <- created by txn 100
| xmin=100 | xmax=105 | data: Alice, $500  |  <- deleted by txn 105
| xmin=105 | xmax=0   | data: Alice, $450  |  <- new version by txn 105
+-------------------------------------------+
Transaction 103 (started before 105) still sees $500
Transaction 106 (started after 105) sees $450

Deadlock Detection (wait-for graph):
  Txn A --waits-for--> Txn B
    ^                     |
    |                     v
  Txn D <--waits-for-- Txn C
  Cycle detected! Abort youngest transaction (Txn D).`
    },

    keyQuestions: [
      {
        question: 'How does MVCC work in PostgreSQL?',
        answer: `**Multi-Version Concurrency Control (MVCC)**:
Each row has multiple physical versions (tuples). Each transaction sees a consistent snapshot based on which versions were committed when the transaction started.

**Tuple Header Fields**:
- **xmin**: Transaction ID that created this tuple version
- **xmax**: Transaction ID that deleted/updated this version (0 if still live)
- **ctid**: Physical location (block number, offset within block)

**Visibility Rules** (for transaction T reading a tuple):
1. xmin must be committed AND committed before T started
2. xmax must be 0 (not deleted) OR not committed OR committed after T started
3. These rules are checked against the pg_xact (commit log) and the transaction's snapshot

**Update Process** (UPDATE accounts SET balance = 450 WHERE id = 1):
1. Find current version: xmin=100, xmax=0, balance=500
2. Mark old version deleted: set xmax=105
3. Create new version: xmin=105, xmax=0, balance=450
4. Old version remains for concurrent readers who started before txn 105

**Benefits**:
- Readers never block writers (read old version)
- Writers never block readers (write new version)
- No read locks needed — dramatically reduces contention

**Costs**:
- Table bloat: dead tuples accumulate until VACUUM removes them
- VACUUM overhead: background process must regularly clean dead tuples
- Index bloat: indexes may point to multiple versions of the same row
- Memory: transaction snapshots consume memory proportional to concurrent transactions`
      },
      {
        question: 'Explain optimistic vs pessimistic concurrency control.',
        answer: `**Pessimistic Concurrency Control**:
Acquire locks before accessing data. Prevents conflicts by blocking concurrent access.

**Implementation**:
\`\`\`sql
-- Pessimistic: lock the row immediately
SELECT * FROM inventory WHERE product_id = 42 FOR UPDATE;
-- Row is now locked. Other transactions wait.
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 42;
COMMIT; -- Lock released
\`\`\`

**Pros**: Guarantees no conflicts. Simple error handling.
**Cons**: Reduces concurrency. Risk of deadlocks. Locks held across application logic.

**Optimistic Concurrency Control**:
No locks during reads. At write time, verify no one else modified the data. Retry if conflict detected.

**Implementation** (application-level version column):
\`\`\`sql
-- Read with version
SELECT quantity, version FROM inventory WHERE product_id = 42;
-- Returns: quantity=10, version=5

-- Application logic, time passes...

-- Write with version check
UPDATE inventory SET quantity = 9, version = 6
WHERE product_id = 42 AND version = 5;
-- If 0 rows affected: conflict! Re-read and retry.
\`\`\`

**Pros**: No locks held. Higher throughput when conflicts are rare.
**Cons**: Wasted work on conflict (must retry). Starvation if contention is high.

**When to choose**:
- **Pessimistic**: High contention (concert ticket booking, inventory with few items)
- **Optimistic**: Low contention (user profile updates, document editing with few concurrent editors)
- **Hybrid**: Read optimistically, escalate to pessimistic lock on first conflict`
      },
      {
        question: 'How does deadlock detection work?',
        answer: `**Deadlock**: Two or more transactions each hold a lock the other needs.

**Example**:
- Txn A: locks row 1, wants row 2
- Txn B: locks row 2, wants row 1
- Neither can proceed -> deadlock

**Detection via Wait-For Graph**:
1. Database maintains a directed graph of transaction dependencies
2. Edge from Txn A -> Txn B means "A is waiting for a lock held by B"
3. Periodically (or on each wait), check for cycles in the graph
4. Cycle found = deadlock detected

**Resolution Strategies**:
- **Victim selection**: Abort the transaction that did the least work (fewest locks, shortest duration)
- **PostgreSQL**: Checks for deadlocks after 1 second of waiting (deadlock_timeout). Aborts the last transaction to join the cycle.
- **MySQL InnoDB**: Checks immediately on each lock wait. Aborts the transaction with fewest row locks.

**Prevention Strategies**:
1. **Lock ordering**: Always acquire locks in a consistent global order (e.g., by primary key ASC)
2. **Lock timeout**: Set a maximum wait time (\`SET lock_timeout = '5s'\`)
3. **Reduce transaction scope**: Shorter transactions hold locks for less time
4. **Advisory locks**: Application-level locks acquired before the transaction

**Wait-Die and Wound-Wait** (used in distributed systems):
- **Wait-Die**: Older transaction waits, younger one dies (aborts and retries)
- **Wound-Wait**: Older transaction wounds (aborts) younger one, younger waits
- Both are deadlock-free because they impose a total order on transactions`
      },
      {
        question: 'What are intent locks and why are they needed?',
        answer: `**Intent Locks** signal that a transaction intends to acquire finer-grained locks within a resource.

**The Problem Without Intent Locks**:
Txn A wants an exclusive table lock. To check if any rows are locked, it would need to scan every row in the table — potentially millions of rows. This is prohibitively expensive.

**Solution — Intent Lock Hierarchy**:
When Txn B locks a single row, it first acquires an Intent lock on the table:
1. IS (Intent Shared) on table -> S (Shared) lock on row
2. IX (Intent Exclusive) on table -> X (Exclusive) lock on row

Now when Txn A wants a table-level X lock, it only checks the table-level lock — sees IX held by Txn B, knows it must wait.

**Compatibility Matrix (full)**:
\`\`\`
         IS    IX    S     SIX   X
IS       OK    OK    OK    OK    NO
IX       OK    OK    NO    NO    NO
S        OK    NO    OK    NO    NO
SIX      OK    NO    NO    NO    NO
X        NO    NO    NO    NO    NO
\`\`\`

**SIX (Shared + Intent Exclusive)**: Read entire table, write some rows. Example: SELECT * FROM orders; UPDATE orders SET status = 'archived' WHERE created_at < '2024-01-01';

**Lock Escalation** (SQL Server):
- When a transaction acquires too many row locks (>5000), the engine escalates to a table lock
- Reduces lock manager memory usage
- Can reduce concurrency — tunable via ALTER TABLE SET LOCK_ESCALATION

**In Practice**:
- PostgreSQL uses a simplified model (no lock escalation, advisory locks instead)
- MySQL InnoDB uses intent locks at table level with row-level S/X locks
- Lock granularity trade-off: finer locks = more concurrency but more overhead`
      }
    ],

    basicImplementation: {
      title: 'Lock-based Concurrency Control',
      description: 'Two-Phase Locking (2PL): acquire locks in a growing phase, release in a shrinking phase. Guarantees serializability but limits concurrency.',
      svgTemplate: 'singleServer',
      problems: [
        'Readers block writers and writers block readers',
        'Lock contention reduces throughput under high concurrency',
        'Deadlocks require detection and victim abort/retry',
        'Lock overhead consumes memory proportional to locked rows'
      ]
    },

    advancedImplementation: {
      title: 'MVCC with Snapshot Isolation',
      description: 'Each transaction sees a consistent snapshot -> Readers access old tuple versions -> Writers create new versions -> VACUUM removes dead tuples -> No read locks needed.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Readers never block writers — critical for mixed OLTP workloads',
        'Snapshot isolation prevents dirty reads and non-repeatable reads',
        'SSI (Serializable Snapshot Isolation) detects write skew anomalies',
        'Background VACUUM is essential to prevent table bloat',
        'Long-running transactions hold back VACUUM and increase bloat'
      ]
    },

    discussionPoints: [
      {
        topic: 'Concurrency Anti-patterns',
        points: [
          'SELECT ... FOR UPDATE on large result sets causes massive lock contention',
          'Long-running transactions under MVCC prevent VACUUM from cleaning dead tuples',
          'Application-level retry loops without backoff cause thundering herd',
          'Mixing pessimistic and optimistic locking in the same workflow creates confusion',
          'Not setting lock_timeout allows transactions to wait indefinitely'
        ]
      },
      {
        topic: 'Performance Tuning',
        points: [
          'Monitor lock waits: pg_stat_activity WHERE wait_event_type = "Lock"',
          'Use pg_locks to identify lock contention hotspots',
          'Increase autovacuum frequency for high-update tables',
          'Consider partitioning to reduce lock contention on hot tables',
          'Use SKIP LOCKED for queue-like patterns to avoid contention'
        ]
      }
    ]
  },

  {
    id: 'sql-isolation-levels',
    title: 'SQL Isolation Levels',
    icon: 'shield',
    color: '#ef4444',
    questions: 8,
    description: 'Read uncommitted/committed, repeatable read, serializable, phantom reads, and write skew.',
    concepts: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable', 'Phantom Reads', 'Write Skew'],
    tips: [
      'Read Committed is the default in PostgreSQL and the right choice for 90% of applications',
      'Serializable is NOT about serial execution — it is about producing results equivalent to some serial order',
      'Write skew is the anomaly most developers overlook — it cannot occur under true serializability'
    ],

    introduction: `SQL isolation levels define the degree to which concurrent transactions are visible to each other. The SQL standard defines four levels, each preventing progressively more anomalies at the cost of reduced concurrency or increased overhead.

In practice, most databases implement isolation levels using MVCC snapshots rather than locks. This means the actual behavior often differs from the SQL standard definitions. PostgreSQL's "Repeatable Read" actually provides snapshot isolation (which prevents phantoms but allows write skew). MySQL InnoDB's "Repeatable Read" uses gap locks to prevent phantoms but still differs from true serializability.`,

    dataModel: {
      description: 'Isolation levels and their anomaly prevention',
      schema: `Anomaly Types:
+---------------------------------------------+
| Dirty Read:                                  |
|   Txn A reads uncommitted data from Txn B   |
|   Txn B rolls back -> A has invalid data     |
+---------------------------------------------+
| Non-Repeatable Read:                         |
|   Txn A reads row, Txn B updates & commits   |
|   Txn A re-reads -> different value           |
+---------------------------------------------+
| Phantom Read:                                |
|   Txn A queries WHERE age > 25 -> 5 rows     |
|   Txn B inserts a row with age=30 & commits  |
|   Txn A re-queries -> 6 rows (phantom!)      |
+---------------------------------------------+
| Write Skew:                                  |
|   Txn A reads: 2 doctors on call             |
|   Txn B reads: 2 doctors on call             |
|   Txn A removes self (still 1 left, OK)      |
|   Txn B removes self (still 1 left, OK)      |
|   Result: 0 doctors on call! (violated rule)  |
+---------------------------------------------+

Isolation Level vs Anomaly Prevention:
+------------------+-------+----------------+----------+-------+
| Level            | Dirty | Non-Repeatable | Phantom  | Write |
|                  | Read  | Read           | Read     | Skew  |
+------------------+-------+----------------+----------+-------+
| Read Uncommitted | YES   | YES            | YES      | YES   |
| Read Committed   | NO    | YES            | YES      | YES   |
| Repeatable Read  | NO    | NO             | YES*     | YES*  |
| Serializable     | NO    | NO             | NO       | NO    |
+------------------+-------+----------------+----------+-------+
* PostgreSQL RR prevents phantoms via snapshot but allows write skew
* MySQL RR uses gap locks to prevent phantoms

MVCC Snapshot Timeline:
Txn 100 starts (snapshot: sees commits before txn 100)
  |
  |  Txn 101 commits (writes row X = 42)
  |
Txn 100 reads row X:
  Read Committed  -> sees X = 42 (latest committed)
  Repeatable Read -> sees old value (snapshot at start)`
    },

    keyQuestions: [
      {
        question: 'Explain each SQL isolation level with concrete examples.',
        answer: `**Read Uncommitted** (weakest):
Transactions can see uncommitted changes from other transactions.
\`\`\`
Txn A: UPDATE accounts SET balance = 0 WHERE id = 1;  -- not committed
Txn B: SELECT balance FROM accounts WHERE id = 1;     -- sees 0 (dirty read!)
Txn A: ROLLBACK;  -- balance is actually still 1000
\`\`\`
Use case: Almost never. Some analytics where approximate data is acceptable.

**Read Committed** (PostgreSQL default):
Each statement sees only committed data. But re-executing the same query may return different results.
\`\`\`
Txn A: SELECT count(*) FROM orders WHERE status = 'pending';  -- returns 10
Txn B: UPDATE orders SET status = 'complete' WHERE id = 5; COMMIT;
Txn A: SELECT count(*) FROM orders WHERE status = 'pending';  -- returns 9
\`\`\`
Use case: Default for most OLTP applications. Good balance of correctness and performance.

**Repeatable Read**:
Transaction sees a consistent snapshot from the start. Re-reads return the same data.
\`\`\`
Txn A: BEGIN;
Txn A: SELECT balance FROM accounts WHERE id = 1;  -- returns 1000
Txn B: UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;
Txn A: SELECT balance FROM accounts WHERE id = 1;  -- still returns 1000
\`\`\`
Use case: Reports that need consistent data, financial summaries.

**Serializable** (strongest):
Guarantees results are equivalent to some serial execution order. Detects and prevents all anomalies including write skew.
Use case: Financial transactions, inventory management, any case where correctness is more important than throughput.`
      },
      {
        question: 'What is write skew and how do you prevent it?',
        answer: `**Write Skew** is an anomaly where two transactions each read a shared condition, then make independent updates that together violate an invariant.

**Classic Example — On-Call Doctors**:
Invariant: At least one doctor must be on call at all times.
\`\`\`
Initial state: Alice (on_call=true), Bob (on_call=true)

Txn A (Alice):                      Txn B (Bob):
SELECT count(*)                      SELECT count(*)
FROM doctors                         FROM doctors
WHERE on_call = true; --> 2          WHERE on_call = true; --> 2

-- 2 on call, safe to remove myself  -- 2 on call, safe to remove myself
UPDATE doctors                       UPDATE doctors
SET on_call = false                  SET on_call = false
WHERE name = 'Alice';               WHERE name = 'Bob';
COMMIT;                              COMMIT;

Result: 0 doctors on call! Invariant violated.
\`\`\`

**Why it occurs**: Under Repeatable Read / Snapshot Isolation, both transactions see the same snapshot (2 doctors). Neither detects the other's change because they modify different rows.

**Prevention Strategies**:

1. **SERIALIZABLE isolation level**: PostgreSQL SSI detects the read-write dependency cycle and aborts one transaction.

2. **Explicit locking** (materializing conflicts):
\`\`\`sql
SELECT * FROM doctors WHERE on_call = true FOR UPDATE;
\`\`\`
This locks the rows that the condition depends on, forcing serialization.

3. **Application-level constraint**: Add a database constraint that enforces the invariant (e.g., a trigger or materialized view with a CHECK constraint).

4. **Single-row pattern**: Instead of distributed state, use a single row: \`on_call_count\` that both transactions UPDATE. This naturally serializes.`
      },
      {
        question: 'How does PostgreSQL implement Serializable Snapshot Isolation (SSI)?',
        answer: `**SSI** adds anomaly detection on top of regular snapshot isolation without adding locks.

**Core Idea**: Track read-write dependencies between concurrent transactions. If a dangerous pattern (cycle) is detected, abort one transaction.

**Mechanism**:
1. **SIRead locks**: Track what each transaction has read (predicate locks on ranges, not just individual rows)
2. **RW-conflict detection**: When Txn B writes a row that Txn A previously read (or vice versa), record a rw-conflict edge
3. **Dangerous structure detection**: If two consecutive rw-conflict edges form a pattern T1 -> T2 -> T3 where T1 committed before T3 started but T2 overlaps both, abort T2

**Example — Detecting Write Skew**:
\`\`\`
Txn A reads doctors (SIRead lock on WHERE on_call=true)
Txn B reads doctors (SIRead lock on WHERE on_call=true)
Txn A writes Alice -> rw-conflict: B read, A wrote
Txn B writes Bob   -> rw-conflict: A read, B wrote
Two consecutive rw-conflicts form a cycle -> ABORT one
\`\`\`

**Performance Characteristics**:
- No blocking: SSI only detects, it does not lock
- False positives: May abort transactions that would not actually cause anomalies
- Overhead: SIRead lock tracking consumes memory (configurable max)
- Retry required: Aborted transactions must be retried by the application

**Practical Implications**:
- Applications MUST handle serialization failures (SQLSTATE 40001)
- Use retry loops with exponential backoff
- Read-only transactions can be declared as such to reduce overhead
- Performance is 10-30% lower than Repeatable Read for write-heavy workloads`
      },
      {
        question: 'How do MySQL and PostgreSQL differ in their Repeatable Read implementation?',
        answer: `**PostgreSQL Repeatable Read** (true snapshot isolation):
- Takes a snapshot at transaction start
- All reads see data as of that snapshot
- No locking for reads — pure MVCC
- Prevents: dirty reads, non-repeatable reads, phantom reads
- Does NOT prevent: write skew
- On write conflict: first-updater-wins, second transaction gets serialization error

**MySQL InnoDB Repeatable Read** (snapshot + gap locks):
- Takes a snapshot at first read (not transaction start)
- Consistent reads use MVCC snapshot
- Locking reads (SELECT FOR UPDATE) use next-key locks (record + gap)
- Gap locks prevent phantom inserts in locked ranges
- Does NOT use MVCC for locking reads — they always read latest committed

**Key Differences**:

1. **Snapshot timing**:
   - PostgreSQL: snapshot at BEGIN
   - MySQL: snapshot at first SELECT

2. **Phantom prevention**:
   - PostgreSQL: snapshot naturally prevents phantoms
   - MySQL: gap locks prevent phantoms for locking reads, snapshot for consistent reads

3. **Write conflicts**:
   - PostgreSQL: detects at COMMIT, returns serialization error
   - MySQL: detects at write time via row locks, blocks or deadlocks

4. **Lost update behavior**:
   - PostgreSQL: second updater gets error (must retry)
   - MySQL: second updater blocks until first commits, then overwrites (no error)

**Practical Impact**:
- PostgreSQL RR is safer by default (fewer silent anomalies)
- MySQL RR allows "last writer wins" which can lose updates silently
- Both require SERIALIZABLE for full anomaly prevention
- Application code must be written differently for each database`
      }
    ],

    basicImplementation: {
      title: 'Read Committed Isolation',
      description: 'Default isolation level for most databases. Each statement sees only committed data, but different statements within the same transaction may see different snapshots.',
      svgTemplate: 'singleServer',
      problems: [
        'Non-repeatable reads: same query returns different results within one transaction',
        'Phantom reads: new rows appear between queries',
        'Write skew: concurrent transactions violate invariants without detection',
        'No consistent snapshot for multi-statement reports'
      ]
    },

    advancedImplementation: {
      title: 'Serializable Snapshot Isolation',
      description: 'Full snapshot isolation with rw-conflict tracking -> SIRead predicate locks detect dangerous patterns -> Automatic abort on detected anomalies -> Application retries aborted transactions.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Prevents all anomalies including write skew and phantom reads',
        'Non-blocking: detection only, no lock waits for reads',
        'False positives may cause unnecessary aborts (trade-off for safety)',
        'Application must implement retry logic for serialization failures',
        'Read-only transaction optimization reduces tracking overhead'
      ]
    },

    discussionPoints: [
      {
        topic: 'Choosing an Isolation Level',
        points: [
          'Read Committed: default choice, handles 90% of use cases',
          'Repeatable Read: consistent reports, batch processing',
          'Serializable: financial correctness, constraint enforcement',
          'Higher isolation = lower throughput, more retries',
          'Test with realistic concurrency before choosing'
        ]
      },
      {
        topic: 'Common Interview Mistakes',
        points: [
          'Confusing isolation levels with lock modes',
          'Assuming Serializable means serial execution',
          'Not knowing that PostgreSQL RR prevents phantoms but allows write skew',
          'Forgetting that applications must handle serialization failures',
          'Ignoring that different databases implement the same level differently'
        ]
      }
    ]
  },

  {
    id: 'database-partitioning-sharding',
    title: 'Partitioning & Sharding',
    icon: 'globe',
    color: '#8b5cf6',
    questions: 10,
    description: 'Range/hash/directory partitioning, shard key selection, hotspots, and rebalancing.',
    concepts: ['Range Partitioning', 'Hash Partitioning', 'Directory Partitioning', 'Shard Key Selection', 'Hotspots', 'Rebalancing'],
    tips: [
      'The shard key is the most important decision — it determines query routing, data distribution, and rebalancing difficulty',
      'Cross-shard queries kill performance — design so 95%+ of queries hit a single shard',
      'Rebalancing without downtime requires consistent hashing or virtual shards'
    ],

    introduction: `Partitioning splits a large dataset across multiple storage units. When those units are on different machines, it is called sharding. Partitioning enables databases to scale beyond what a single machine can handle, improving both storage capacity and query throughput.

The critical challenge is choosing the right partitioning strategy and shard key. A poor choice leads to hotspots (one shard getting most of the traffic), cross-shard queries (expensive multi-machine joins), and painful rebalancing (redistributing data when adding or removing nodes). These decisions are extremely difficult to change later, so getting them right upfront is essential.`,

    dataModel: {
      description: 'Partitioning strategies and shard routing',
      schema: `Range Partitioning (by date, ID range):
+-------------+-------------+-------------+
| Shard 1     | Shard 2     | Shard 3     |
| IDs 1-1M    | IDs 1M-2M   | IDs 2M-3M   |
+-------------+-------------+-------------+
Pro: Range scans are efficient (single shard)
Con: Hotspot on latest shard (new data always goes there)

Hash Partitioning (consistent hashing):
shard_id = hash(key) % num_shards
+------+------+------+------+
| S0   | S1   | S2   | S3   |
|hash  |hash  |hash  |hash  |
|0-63  |64-127|128-191|192-255|
+------+------+------+------+
Pro: Even distribution
Con: Range queries require scatter-gather across all shards

Directory-based Partitioning:
+-------------------+
| Lookup Service    |
| user_1 -> Shard A |
| user_2 -> Shard B |
| user_3 -> Shard A |
+-------------------+
     |       |
  Shard A  Shard B
Pro: Flexible mapping, easy rebalancing
Con: Lookup service is single point of failure/bottleneck

Virtual Shards (consistent hashing with vnodes):
Physical Node A: [vnode 0, vnode 3, vnode 7]
Physical Node B: [vnode 1, vnode 4, vnode 8]
Physical Node C: [vnode 2, vnode 5, vnode 6]

Adding Node D: move vnode 3 from A, vnode 8 from B
--> Only ~1/N of data moves when adding Nth node`
    },

    keyQuestions: [
      {
        question: 'How do you choose the right shard key?',
        answer: `**Shard Key Selection Criteria**:

1. **Cardinality**: Must have many distinct values. A boolean column is a terrible shard key (only 2 shards). User ID, order ID, or tenant ID are good.

2. **Distribution**: Values should be evenly distributed. Monotonically increasing IDs cause hotspots with range partitioning. UUIDs or hash-based keys distribute evenly.

3. **Query patterns**: Most queries should be routable to a single shard. If 80% of queries filter by user_id, shard by user_id.

4. **Growth patterns**: Key should distribute new data evenly. Timestamp-based keys create write hotspots on the latest shard.

**Common Shard Key Choices**:

- **user_id**: Good for user-centric apps (social media, SaaS). All user data on one shard. Problem: power users create hotspots.

- **tenant_id**: Good for multi-tenant SaaS. Isolation between tenants. Problem: large tenants need their own shard.

- **compound key (tenant_id, entity_id)**: Route by tenant, distribute within tenant by entity. Best of both worlds.

- **hash(key)**: Eliminates hotspots but loses range query capability.

**Anti-patterns**:
- Sharding by country: uneven (US shard huge, Luxembourg tiny)
- Sharding by first letter: extremely uneven (S has far more entries than X)
- Auto-increment ID with range partitioning: all writes go to last shard
- Sharding by a column that changes (e.g., status): requires data migration on update`
      },
      {
        question: 'How do you handle hotspots in a sharded database?',
        answer: `**Hotspot**: One shard receives disproportionately more traffic than others.

**Causes**:
- Celebrity/power user problem: one user_id generates 1000x more traffic
- Temporal hotspot: latest time partition gets all writes
- Skewed data: some hash values naturally cluster

**Detection**:
- Monitor per-shard QPS, CPU, disk I/O
- Track shard sizes and growth rates
- Alert on >2x deviation from average shard load

**Mitigation Strategies**:

1. **Shard splitting**: Split the hot shard into two. Range partition at midpoint or re-hash into sub-shards.

2. **Salt the key**: Append a random suffix (0-9) to hot keys. user_123 becomes user_123_0 through user_123_9, spreading across 10 shards. Reads must scatter-gather across all suffixes.

3. **Dedicated shard**: Give the hot entity its own shard (e.g., celebrity accounts on dedicated hardware).

4. **Caching**: Put a cache (Redis) in front of the hot shard to absorb read traffic. Cache invalidation becomes critical.

5. **Rate limiting**: Throttle traffic to the hot shard to protect other tenants on the same machine.

6. **Application-level routing**: Route hot entities to beefier hardware. Requires a directory-based approach.

**Prevention**:
- Use hash partitioning to spread data evenly from the start
- Virtual shards (many more logical shards than physical nodes) make rebalancing granular
- Monitor continuously — hotspots can emerge as usage patterns change`
      },
      {
        question: 'How do you rebalance shards without downtime?',
        answer: `**Rebalancing** = Redistributing data across shards when adding/removing nodes.

**Naive approach** (hash(key) % N):
Change N (add a node) -> nearly every key maps to a different shard -> massive data migration. Unacceptable.

**Consistent Hashing**:
1. Map both keys and nodes onto a hash ring (0 to 2^32)
2. Each key is assigned to the next node clockwise on the ring
3. Adding a node: only keys between the new node and its predecessor move
4. Removing a node: its keys move to the next node clockwise
5. Only ~1/N of keys move when adding the Nth node

**Virtual Nodes (vnodes)**:
Each physical node owns multiple points on the ring (100-256 vnodes).
- Provides more uniform distribution
- Rebalancing moves individual vnodes, not all data on a node
- Heterogeneous hardware: give more vnodes to more powerful machines

**Online Migration Process**:
1. **Double-write**: New writes go to both old and new shard
2. **Backfill**: Copy existing data from old shard to new shard
3. **Verify**: Checksums to ensure data consistency
4. **Cutover**: Route reads to new shard
5. **Cleanup**: Remove duplicated data from old shard

**Vitess (YouTube's MySQL sharding)**:
- Uses a VSchema to define shard key routing
- Resharding creates new shards, sets up filtered replication
- Cutover is atomic: switch reads and writes in one operation
- Rollback possible: keep old shards until verified

**Key Metrics During Rebalancing**:
- Migration throughput (rows/second, GB/minute)
- Replication lag on new shards
- Query latency during migration (should be <10% degradation)
- Data consistency verification (row counts, checksums)`
      },
      {
        question: 'What are the challenges of cross-shard queries?',
        answer: `**Cross-Shard Query**: A query that must access data from multiple shards.

**Why they are expensive**:
1. **Network overhead**: Must contact multiple shards (latency = max of all shard responses)
2. **Scatter-gather**: Send query to all shards, merge results at coordinator
3. **No global indexes**: Cannot efficiently filter on non-shard-key columns
4. **No distributed joins**: Joining data across shards requires pulling data to coordinator
5. **No global ordering**: Each shard returns locally sorted data; must merge-sort at coordinator

**Common Cross-Shard Operations**:

**Scatter-gather query** (search across all shards):
\`\`\`
SELECT * FROM orders WHERE product_id = 42;
-- If sharded by user_id, must query ALL shards
-- Coordinator merges results
\`\`\`

**Cross-shard join**:
\`\`\`
SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2025-01-01';
-- If users and orders on different shard keys, very expensive
\`\`\`

**Global aggregation**:
\`\`\`
SELECT COUNT(*), SUM(total) FROM orders WHERE status = 'active';
-- Each shard computes local count/sum, coordinator aggregates
-- Works for SUM, COUNT, AVG (with count), MIN, MAX
-- Does NOT work for MEDIAN, PERCENTILE (need all data)
\`\`\`

**Mitigation Strategies**:
- **Co-locate related data**: Shard users and orders by user_id so joins are local
- **Global secondary indexes**: Maintain a separate index mapping non-shard-key to shard locations
- **Denormalization**: Store frequently joined data together (trade consistency for read performance)
- **CQRS**: Write to normalized shards, project to denormalized read models
- **Limit cross-shard queries**: Design API so most queries are shard-local; use analytics pipeline for cross-shard reports`
      }
    ],

    basicImplementation: {
      title: 'Single-Node Table Partitioning',
      description: 'PostgreSQL declarative partitioning: split a large table into smaller partitions on the same server. Improves query performance by scanning only relevant partitions.',
      svgTemplate: 'singleServer',
      problems: [
        'Still limited by single-machine resources',
        'Partition pruning only works if queries filter on the partition key',
        'Global indexes span all partitions (larger, slower to maintain)',
        'Partition maintenance (adding new partitions, archiving old ones) requires automation'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Sharding with Consistent Hashing',
      description: 'Hash ring distributes data across nodes -> Virtual nodes ensure uniform distribution -> Shard router directs queries to correct shard -> Rebalancing moves only 1/N of data when adding nodes.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Consistent hashing minimizes data movement during rebalancing',
        'Virtual nodes handle heterogeneous hardware and improve uniformity',
        'Co-located sharding keeps related data together for local joins',
        'Global secondary indexes enable cross-shard lookups at the cost of write overhead',
        'Online migration with double-write enables zero-downtime resharding'
      ]
    },

    discussionPoints: [
      {
        topic: 'Partitioning Strategy Selection',
        points: [
          'Range: good for time-series and archival (drop old partitions)',
          'Hash: good for even distribution and point lookups',
          'Directory: most flexible but adds a lookup dependency',
          'Composite: combine strategies (hash by tenant, range by date within tenant)',
          'Start with fewer, larger shards — splitting is easier than merging'
        ]
      },
      {
        topic: 'Operational Challenges',
        points: [
          'Schema changes must be applied to all shards consistently',
          'Backup and restore complexity increases with shard count',
          'Cross-shard transactions require distributed coordination (2PC or sagas)',
          'Monitoring must aggregate per-shard metrics and alert on imbalance',
          'Testing must include multi-shard scenarios and failure modes'
        ]
      }
    ]
  },

  {
    id: 'database-replication-strategies',
    title: 'Replication Strategies',
    icon: 'globe',
    color: '#8b5cf6',
    questions: 10,
    description: 'Single-leader, multi-leader, leaderless, sync vs async, and replication lag.',
    concepts: ['Single-Leader', 'Multi-Leader', 'Leaderless', 'Sync vs Async', 'Replication Lag', 'Conflict Resolution'],
    tips: [
      'Single-leader replication is the right default — use multi-leader or leaderless only when you need it',
      'Replication lag is not a bug, it is a fundamental trade-off between consistency and availability',
      'Conflict resolution is the hardest part of multi-leader replication — last-writer-wins loses data silently'
    ],

    introduction: `Replication maintains copies of data on multiple machines. It serves three goals: fault tolerance (survive node failures), read scalability (distribute read load), and geographic locality (serve users from nearby replicas).

The fundamental tension is between consistency and performance. Synchronous replication guarantees every replica has the latest data but blocks writes until all replicas confirm. Asynchronous replication is faster but replicas may serve stale data. Understanding these trade-offs is essential for designing systems that meet their specific consistency and availability requirements.`,

    dataModel: {
      description: 'Replication topologies and consistency models',
      schema: `Single-Leader Replication:
  Writes --> [Leader] --repl--> [Follower 1]
                       --repl--> [Follower 2]
  Reads <-- [Leader] or [Follower 1] or [Follower 2]

Multi-Leader Replication:
  [Leader A] <--sync--> [Leader B]
      |                      |
  [Follower A1]         [Follower B1]
  Writes accepted at BOTH leaders
  Conflict resolution needed for concurrent writes

Leaderless Replication (Dynamo-style):
  Client writes to W nodes (e.g., 2 of 3)
  Client reads from R nodes (e.g., 2 of 3)
  W + R > N ensures overlap -> read-repair or anti-entropy

  Write(key=X, val=42):
  +--------+  +--------+  +--------+
  | Node 1 |  | Node 2 |  | Node 3 |
  | X=42   |  | X=42   |  | X=old  |  <- W=2: wrote to 2 of 3
  +--------+  +--------+  +--------+

  Read(key=X), R=2:
  Read from Node 2 (X=42) and Node 3 (X=old)
  Return X=42 (latest version wins)
  Trigger read-repair: update Node 3 to X=42

Replication Lag Timeline:
Leader:   [W1]---[W2]---[W3]---[W4]---[W5]
Follower: [W1]---[W2]---[W3]          (lag = 2 writes)
                                  ^
                          Stale reads possible here`
    },

    keyQuestions: [
      {
        question: 'Compare single-leader, multi-leader, and leaderless replication.',
        answer: `**Single-Leader (Primary-Replica)**:
- All writes go to one leader, replicated to followers
- Followers serve reads (may be stale)
- Failover: promote a follower to leader

**Strengths**: Simple, no write conflicts, clear consistency model
**Weaknesses**: Single write bottleneck, leader failure causes brief unavailability
**Used by**: PostgreSQL, MySQL, MongoDB (replica sets), Redis Sentinel

**Multi-Leader**:
- Multiple nodes accept writes independently
- Changes replicated asynchronously between leaders
- Must resolve conflicts when same data modified on different leaders

**Strengths**: Write availability in multiple regions, lower write latency for geo-distributed users
**Weaknesses**: Conflict resolution is complex, potential for data loss
**Used by**: CouchDB, Tungsten Replicator, custom setups for geo-distributed MySQL/PostgreSQL

**Leaderless (Dynamo-style)**:
- Client writes to W replicas, reads from R replicas
- Quorum: W + R > N ensures at least one overlap
- No leader to fail — any node can serve reads or writes

**Strengths**: Highest availability, no leader bottleneck, partition tolerant
**Weaknesses**: Eventual consistency, sloppy quorums can lose data, conflict resolution needed
**Used by**: Amazon DynamoDB, Apache Cassandra, Riak

**Decision Framework**:
- Need strong consistency? -> Single-leader
- Need multi-region writes? -> Multi-leader (accept complexity)
- Need maximum availability? -> Leaderless (accept eventual consistency)`
      },
      {
        question: 'What are the trade-offs between synchronous and asynchronous replication?',
        answer: `**Synchronous Replication**:
Write is acknowledged only after ALL replicas (or quorum) confirm.

\`\`\`
Client -> Leader -> Write to WAL
                 -> Send to Follower
                 <- Wait for Follower ACK
         <- ACK to Client
Total latency: leader write + network RTT + follower write
\`\`\`

**Guarantees**: Zero data loss on leader failure (RPO = 0)
**Cost**: Higher write latency (network RTT added), reduced availability (follower down = writes blocked)
**Mitigation**: Semi-synchronous (one follower sync, rest async) — used by MySQL Group Replication

**Asynchronous Replication**:
Write is acknowledged as soon as leader writes locally.

\`\`\`
Client -> Leader -> Write to WAL
         <- ACK to Client (immediate)
                 -> Send to Follower (background)
\`\`\`

**Guarantees**: None — leader failure can lose committed writes
**Benefit**: Low latency, high availability (followers can be down)
**Risk**: Replication lag means stale reads from followers

**Replication Lag Anomalies**:

1. **Read-your-writes inconsistency**: User writes, then reads from a lagging follower, doesn't see their own write.
   Fix: Route reads to leader after writes, or read from follower only if it has caught up.

2. **Monotonic read inconsistency**: User reads from follower A (up-to-date), then follower B (lagging), sees data go backward.
   Fix: Stick user to one follower (session affinity).

3. **Causal inconsistency**: User sees a reply to a comment but not the original comment.
   Fix: Track causal dependencies, ensure follower has replicated all causal predecessors.`
      },
      {
        question: 'How does conflict resolution work in multi-leader replication?',
        answer: `**Conflict**: Two leaders accept different writes to the same data concurrently.

**Example**:
- Leader A: UPDATE users SET name = 'Alice' WHERE id = 1;
- Leader B: UPDATE users SET name = 'Alicia' WHERE id = 1;
- Both succeed locally, conflict detected during replication.

**Resolution Strategies**:

1. **Last Writer Wins (LWW)**:
   - Each write gets a timestamp, highest timestamp wins
   - Simple but LOSES DATA silently — the "losing" write is discarded
   - Used by Cassandra, DynamoDB
   - Danger: Clock skew means "last" is ambiguous

2. **Custom merge function**:
   - Application provides logic to merge conflicting values
   - Example: merge shopping cart items (union of both carts)
   - Most correct but requires per-data-type logic

3. **Multi-value (siblings)**:
   - Keep all conflicting versions, let application resolve
   - Riak stores siblings, returns all to client
   - Most flexible but burdens the application

4. **CRDTs (Conflict-free Replicated Data Types)**:
   - Data structures that mathematically guarantee convergence
   - G-Counter, PN-Counter, OR-Set, LWW-Register
   - No conflicts by design, but limited to specific data types
   - Used by Redis CRDT, Riak

5. **Operational Transform (OT) / CRDT for text**:
   - Used by Google Docs, Figma for concurrent editing
   - Transform operations based on concurrent changes

**Best Practice**: Avoid conflicts rather than resolving them. Route all writes for a given entity to the same leader (e.g., home region for a user). Use multi-leader only for truly independent data.`
      },
      {
        question: 'How do you handle failover in single-leader replication?',
        answer: `**Failover**: Promoting a follower to leader when the current leader fails.

**Detection**:
- Heartbeat timeout: leader sends periodic heartbeats, followers detect absence
- Typical timeout: 10-30 seconds (balance between false positives and detection speed)
- External monitoring (e.g., Consul, etcd) can also trigger failover

**Failover Process**:
1. **Detect leader failure** (heartbeat timeout)
2. **Choose new leader** (most up-to-date follower)
3. **Reconfigure system** (update routing, redirect clients)
4. **Handle old leader** (fence off to prevent split-brain)

**Challenges**:

1. **Data loss**: If async replication, new leader may be behind. Uncommitted writes on old leader are lost. In PostgreSQL, the new primary may have a different timeline.

2. **Split-brain**: Old leader comes back online, thinks it is still leader. Two leaders accept conflicting writes. Prevention: STONITH (Shoot The Other Node In The Head) — fencing mechanism to ensure old leader cannot accept writes.

3. **Client redirection**: Clients must discover the new leader. Options:
   - DNS update (slow propagation, 30-300 seconds)
   - Service discovery (Consul, etcd — fast, seconds)
   - Proxy layer (HAProxy, PgBouncer — transparent to clients)

4. **Replication catch-up**: New leader must apply any un-replicated transactions from its own WAL before accepting writes.

**Automated vs Manual Failover**:
- Automated: Faster recovery (seconds) but risk of false positives
- Manual: Safer but slower (minutes to hours), requires on-call engineer
- Best practice: Automated detection, human approval for promotion (semi-automated)`
      }
    ],

    basicImplementation: {
      title: 'Single-Leader Async Replication',
      description: 'One leader accepts all writes, replicates asynchronously to followers. Followers serve read traffic. Simple, well-understood, works for most applications.',
      svgTemplate: 'singleServer',
      problems: [
        'Replication lag causes stale reads from followers',
        'Leader failure risks losing committed writes (RPO > 0)',
        'Failover requires human intervention or complex automation',
        'Write throughput limited by single leader'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Region Replication with Conflict Resolution',
      description: 'Leaders in each region accept local writes with low latency -> Asynchronous cross-region replication -> Conflict resolution via CRDTs or custom merge functions -> Read-your-writes consistency via session affinity.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Local writes in each region provide low latency for users',
        'CRDTs resolve conflicts automatically for supported data types',
        'Session affinity ensures users see their own writes',
        'Anti-entropy background process repairs inconsistencies',
        'Monitoring replication lag is critical for SLA compliance'
      ]
    },

    discussionPoints: [
      {
        topic: 'Replication Topology Choices',
        points: [
          'Star topology: simple, single point of failure at hub',
          'Chain topology: ordered replication, slow propagation',
          'Ring topology: each node replicates to next, one failure breaks chain',
          'All-to-all: most resilient, highest bandwidth cost',
          'Cascading replication: followers replicate from other followers to reduce leader load'
        ]
      },
      {
        topic: 'Monitoring and Operations',
        points: [
          'Track replication lag in seconds and bytes',
          'Alert when lag exceeds acceptable threshold (e.g., >5 seconds)',
          'Test failover regularly (chaos engineering)',
          'Document runbooks for manual failover procedures',
          'Monitor for split-brain conditions continuously'
        ]
      }
    ]
  },

  {
    id: 'consensus-algorithms',
    title: 'Consensus Algorithms',
    icon: 'globe',
    color: '#8b5cf6',
    questions: 8,
    description: 'Raft, Paxos, leader election, log replication, safety vs liveness.',
    concepts: ['Raft', 'Paxos', 'Leader Election', 'Log Replication', 'Safety', 'Liveness'],
    tips: [
      'Raft was designed to be understandable — use it as your go-to explanation in interviews',
      'Safety means "nothing bad ever happens" (no conflicting commits). Liveness means "something good eventually happens" (progress).',
      'A majority quorum (N/2 + 1) is the minimum needed to tolerate N/2 failures'
    ],

    introduction: `Consensus algorithms allow a group of distributed nodes to agree on a single value, even when some nodes fail or messages are delayed. They are the foundation of every reliable distributed system: replicated state machines, distributed databases, configuration services, and leader election.

Paxos was the first proven consensus algorithm but is notoriously difficult to understand and implement. Raft was designed as an equivalent algorithm that prioritizes understandability. Both guarantee safety (no conflicting decisions) under any failure condition, and guarantee liveness (eventual progress) as long as a majority of nodes are operational and can communicate.`,

    dataModel: {
      description: 'Raft algorithm state and message flow',
      schema: `Raft Node States:
+----------+     timeout      +-----------+     majority vote    +--------+
| Follower | --------------> | Candidate | ------------------> | Leader |
+----------+                  +-----------+                     +--------+
     ^                              |                               |
     |         loses election       |          discovers higher     |
     |<-----------------------------|          term leader           |
     |                                                              |
     |<-------------------------------------------------------------|

Raft Log Replication:
Leader log:    [1:SET x=1] [2:SET y=2] [3:SET x=3] [4:SET z=7]
Follower A:    [1:SET x=1] [2:SET y=2] [3:SET x=3]  <- up to date
Follower B:    [1:SET x=1] [2:SET y=2]               <- lagging
Follower C:    [1:SET x=1]                            <- far behind

Commit rule: entry committed when replicated to majority (3 of 5)

Leader Election Timeline:
Term 1: Node A is leader (heartbeats every 150ms)
  |
  +-- Node A crashes
  |
Term 2: Election timeout fires on Node C (randomized 150-300ms)
  |   Node C: "I'm candidate for term 2, vote for me"
  |   Node B: "OK, you have my vote" (hasn't voted in term 2)
  |   Node D: "OK, you have my vote"
  |   Node C: majority (3 of 5) -> becomes leader
  |
Term 2: Node C is leader, sends heartbeats

Quorum Requirements:
+-------+----------+------------------+
| Nodes | Majority | Failures Tolerated|
+-------+----------+------------------+
|   3   |    2     |        1         |
|   5   |    3     |        2         |
|   7   |    4     |        3         |
+-------+----------+------------------+`
    },

    keyQuestions: [
      {
        question: 'How does the Raft consensus algorithm work?',
        answer: `**Raft** decomposes consensus into three sub-problems:

**1. Leader Election**:
- Each node starts as a Follower
- Followers expect heartbeats from the leader
- If no heartbeat within election timeout (randomized 150-300ms), become Candidate
- Candidate increments term, votes for self, requests votes from all nodes
- If majority votes granted: become Leader
- If another leader discovered: revert to Follower
- If election timeout with no winner: start new election

**2. Log Replication**:
- Client sends command to Leader
- Leader appends to local log with term number
- Leader sends AppendEntries RPC to all followers
- Followers append to log, respond with success
- When majority acknowledges: entry is "committed"
- Leader applies committed entry to state machine
- Leader notifies followers of commit in next heartbeat

**3. Safety**:
- **Election restriction**: Candidate must have all committed entries to win election. Voters reject candidates with shorter logs.
- **Leader completeness**: A committed entry will be present in all future leaders' logs.
- **Log matching**: If two logs contain an entry with the same index and term, all preceding entries are identical.

**Key Invariants**:
- At most one leader per term
- Leaders never overwrite or delete their own log entries
- If an entry is committed, it will never be lost (even across leader changes)

**Cluster Membership Changes**:
- Joint consensus: transition through intermediate state where both old and new configurations must agree
- Single-server changes: add or remove one node at a time (simpler, used in practice)`
      },
      {
        question: 'What is the difference between safety and liveness in consensus?',
        answer: `**Safety**: "Nothing bad ever happens."
In consensus: two different nodes never commit different values for the same log entry.

**Raft safety guarantees** (hold under ALL conditions including network partitions, crashes, message reordering):
- **Election safety**: At most one leader per term
- **Leader append-only**: Leader never overwrites or deletes its own entries
- **Log matching**: If two logs have same entry at same index, all prior entries match
- **Leader completeness**: Committed entries appear in all future leaders

**Liveness**: "Something good eventually happens."
In consensus: the system eventually makes progress (commits entries).

**Raft liveness requires**:
- A majority of nodes are running and can communicate
- Eventually, a leader is elected and remains stable long enough to commit entries
- Network partitions eventually heal

**The FLP Impossibility Result**:
In an asynchronous system (no bounds on message delay), no deterministic consensus algorithm can guarantee both safety AND liveness if even one node can crash.

**How Raft handles this**:
- Safety is ALWAYS guaranteed (never violates invariants)
- Liveness is guaranteed under "partial synchrony" — messages are eventually delivered within some unknown bound
- Randomized election timeouts break symmetry and prevent livelock

**Practical Implications**:
- During a network partition, the majority side continues to operate (safety + liveness)
- The minority side cannot elect a leader (safety maintained, liveness lost)
- When partition heals, minority nodes catch up from the leader's log
- Safety violations would mean data corruption — they must be impossible
- Liveness violations mean temporary unavailability — acceptable and recoverable`
      },
      {
        question: 'How does Paxos differ from Raft?',
        answer: `**Paxos** (Leslie Lamport, 1989):
- The original proven consensus algorithm
- Proves that consensus is solvable in asynchronous systems with crash failures

**Basic Paxos (single-decree)** — agree on one value:
- **Phase 1 (Prepare)**: Proposer sends Prepare(n) to acceptors. Acceptors promise not to accept proposals with number < n.
- **Phase 2 (Accept)**: Proposer sends Accept(n, value) to acceptors. Acceptors accept if they haven't promised a higher number.
- **Decision**: Value is chosen when a majority of acceptors accept the same proposal.

**Multi-Paxos** — agree on a sequence of values (log):
- Optimize by electing a stable leader
- Leader skips Phase 1 for subsequent proposals
- Effectively becomes similar to Raft

**Key Differences from Raft**:

| Aspect | Paxos | Raft |
|--------|-------|------|
| Designed for | Correctness proof | Understandability |
| Log structure | Gaps allowed | No gaps (contiguous) |
| Leader | Optional optimization | Required for operation |
| Specification | Abstract, many variants | Concrete, single algorithm |
| Implementation | Many subtle decisions | Relatively straightforward |

**Why Raft is preferred in practice**:
1. Easier to implement correctly (fewer edge cases)
2. Contiguous logs simplify snapshotting and recovery
3. Strong leader makes client interaction straightforward
4. Well-defined cluster membership changes
5. Extensive reference implementations available

**Where Paxos is still used**:
- Google Chubby (lock service) and Spanner
- Academic research and formal verification
- Systems that need flexible quorum configurations (Flexible Paxos)`
      },
      {
        question: 'How do real-world systems use consensus?',
        answer: `**Consensus in Production Systems**:

**etcd** (Raft):
- Kubernetes control plane stores all cluster state in etcd
- Typically 3 or 5 node cluster
- Uses Raft for leader election and log replication
- Provides linearizable reads and writes
- Watch API for change notifications

**ZooKeeper** (ZAB — Zookeeper Atomic Broadcast):
- Similar to Raft but predates it
- Used by Kafka (pre-KRaft), HBase, Hadoop
- Provides ordered, atomic broadcast of state changes
- Hierarchical key-value store with ephemeral nodes

**CockroachDB** (Raft per range):
- Database split into 64MB ranges
- Each range has its own Raft group
- Thousands of Raft groups per node
- Leader for each range handles writes
- Multi-Raft: batches Raft messages across groups for efficiency

**Kafka KRaft**:
- Replaced ZooKeeper dependency with built-in Raft
- Controller quorum manages cluster metadata
- Brokers are Raft followers for metadata
- Simplified operations (no separate ZooKeeper cluster)

**Performance Characteristics**:
- Consensus adds 1-2 round trips to write latency
- 3-node cluster: ~1-5ms write latency (same datacenter)
- 5-node cross-region: 50-200ms write latency (dominated by network RTT)
- Read optimization: leader reads are linearizable, follower reads may be stale
- Lease-based reads: leader can serve reads locally if its lease has not expired`
      }
    ],

    basicImplementation: {
      title: 'Three-Node Raft Cluster',
      description: 'Minimum viable consensus cluster. One leader handles all writes, replicates to two followers. Tolerates one node failure. Suitable for metadata storage and configuration management.',
      svgTemplate: 'singleServer',
      problems: [
        'Tolerates only one failure (2 of 3 must be up)',
        'Leader handles all writes — single bottleneck',
        'Cross-region deployment adds significant latency to every write',
        'Snapshotting required to prevent unbounded log growth'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Raft with Range-based Sharding',
      description: 'Data split into ranges, each with its own Raft group -> Thousands of independent consensus groups -> Leaders distributed across nodes for load balancing -> Multi-Raft batching reduces message overhead.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Each range operates as an independent Raft group',
        'Leader placement optimization spreads write load across nodes',
        'Follower reads with lease-based freshness guarantee reduce leader load',
        'Automatic range splitting and merging based on size and load',
        'Snapshot transfer for far-behind followers avoids replaying entire log'
      ]
    },

    discussionPoints: [
      {
        topic: 'Consensus Algorithm Selection',
        points: [
          'Raft: best default choice for new systems, well-understood',
          'Multi-Paxos: proven at Google scale, harder to implement',
          'EPaxos: leaderless, lower latency, but complex',
          'Viewstamped Replication: similar to Raft, predates it',
          '3 or 5 nodes: 5 recommended for production (tolerates 2 failures)'
        ]
      },
      {
        topic: 'Operational Considerations',
        points: [
          'Monitor leader election frequency — frequent elections indicate instability',
          'Tune election timeout based on network latency (RTT * 10 is a starting point)',
          'Log compaction via snapshots prevents unbounded disk usage',
          'Learner nodes receive log but do not vote — safe way to add capacity',
          'Joint consensus for membership changes prevents split-brain during transition'
        ]
      }
    ]
  },

  {
    id: 'database-recovery',
    title: 'Database Recovery',
    icon: 'shield',
    color: '#ef4444',
    questions: 8,
    description: 'WAL, ARIES recovery, checkpointing, crash recovery, and point-in-time recovery.',
    concepts: ['Write-Ahead Log', 'ARIES Recovery', 'Checkpointing', 'Crash Recovery', 'PITR', 'Redo/Undo Logging'],
    tips: [
      'WAL is the foundation of crash recovery — without it, any crash loses uncommitted AND committed data',
      'ARIES recovery has three phases: Analysis, Redo, Undo — know each phase well',
      'Point-in-time recovery combines base backup + WAL replay to restore to any moment'
    ],

    introduction: `Database recovery ensures that committed transactions survive any failure — crashes, power outages, disk failures — and that uncommitted transactions are cleanly rolled back. The Write-Ahead Log (WAL) is the cornerstone: every change is recorded in a sequential log file before being applied to the actual data pages.

The ARIES (Algorithms for Recovery and Isolation Exploiting Semantics) algorithm is the gold standard for crash recovery, used by PostgreSQL, MySQL InnoDB, SQL Server, and DB2. Understanding ARIES means understanding how modern databases guarantee durability without sacrificing performance. The key insight is that data pages can be written to disk lazily (improving write performance) because the WAL ensures we can always recover the correct state.`,

    dataModel: {
      description: 'WAL structure and ARIES recovery phases',
      schema: `Write-Ahead Log (WAL) Structure:
+------+------+--------+----------+----------+---------+
| LSN  | TxnID| Type   | PageID   | Before   | After   |
+------+------+--------+----------+----------+---------+
| 001  | T1   | UPDATE | Page 5   | bal=1000 | bal=900 |
| 002  | T2   | UPDATE | Page 8   | bal=500  | bal=600 |
| 003  | T1   | UPDATE | Page 12  | qty=10   | qty=9   |
| 004  | T1   | COMMIT | -        | -        | -       |
| 005  | T3   | UPDATE | Page 5   | bal=900  | bal=800 |
| 006  | T2   | ABORT  | -        | -        | -       |
+------+------+--------+----------+----------+---------+
LSN = Log Sequence Number (monotonically increasing)

Checkpoint Record:
+----------------------------------------+
| CHECKPOINT at LSN 003                   |
| Active Transactions: {T1, T2}           |
| Dirty Pages: {Page5: LSN001,            |
|               Page8: LSN002,            |
|               Page12: LSN003}           |
+----------------------------------------+

ARIES Recovery (3 phases after crash):
1. ANALYSIS: Scan log from last checkpoint forward
   -> Rebuild active transaction table (ATT)
   -> Rebuild dirty page table (DPT)

2. REDO: Replay ALL logged changes from oldest
   dirty page LSN forward (even for aborted txns)
   -> Restores database to exact pre-crash state

3. UNDO: Roll back uncommitted transactions
   -> Apply undo records in reverse LSN order
   -> Write CLR (Compensation Log Records) for undo actions

PITR (Point-in-Time Recovery):
[Base Backup] + [WAL segments] --> Replay to target timestamp
  2025-01-01     Jan 1 - Mar 15     Restore to Mar 14 23:59:59`
    },

    keyQuestions: [
      {
        question: 'How does the Write-Ahead Log (WAL) ensure durability?',
        answer: `**WAL Protocol** (the fundamental rule):
Before a modified data page is written to disk, ALL log records describing the modification must first be written to the WAL on stable storage.

**Why this works**:
1. WAL writes are sequential (fast on any storage medium)
2. Data page writes are random (slow, especially on HDD)
3. WAL is always ahead of data pages on disk
4. On crash: replay WAL to reconstruct any changes lost from data pages

**Write Path**:
1. Transaction modifies a page in the buffer pool (memory)
2. Log record written to WAL buffer with: LSN, txn_id, before-image, after-image
3. On COMMIT: WAL buffer flushed to disk (fsync)
4. COMMIT ACK returned to client
5. Modified data page remains in buffer pool (dirty)
6. Background checkpoint eventually writes dirty page to disk

**Performance Optimizations**:
- **Group commit**: Batch multiple transaction WAL records into a single fsync. Instead of 1 fsync per commit (~1ms each), batch 100 commits into 1 fsync. Throughput: 1000 -> 100,000 TPS.
- **WAL compression**: Reduce WAL size (PostgreSQL wal_compression)
- **Async commit**: Trade durability window for speed (lose last few ms of commits on crash)

**Key Properties**:
- Sequential writes: ~500MB/s on HDD, ~2GB/s on SSD
- Each log record is small (typically 50-200 bytes)
- WAL files are recycled after checkpoint (bounded disk usage)
- Replication streams WAL to replicas (physical replication)`
      },
      {
        question: 'Explain the three phases of ARIES recovery.',
        answer: `**ARIES** (Algorithms for Recovery and Isolation Exploiting Semantics):

**Phase 1: Analysis** (determine what needs to be done)
Starting from the last checkpoint record, scan the WAL forward:
- Rebuild the **Active Transaction Table (ATT)**: which transactions were in progress at crash time
- Rebuild the **Dirty Page Table (DPT)**: which pages had modifications not yet flushed to disk, with the earliest LSN that dirtied each page
- End of analysis: we know exactly which transactions to redo and undo

**Phase 2: Redo** (repeat history)
Starting from the smallest LSN in the DPT, replay every logged change:
- Redo ALL changes, including those from transactions that will be undone
- This restores the database to its exact pre-crash state
- A change is skipped only if the page's on-disk LSN is already >= the log record's LSN (page was already flushed before crash)
- After redo: buffer pool state matches moment of crash

**Why redo everything, even aborted transactions?**
- Simplifies recovery: no need to track which pages had partial writes
- Undo phase will clean up aborted transactions
- Compensation Log Records (CLRs) from previous incomplete undos are also redone

**Phase 3: Undo** (clean up)
Process uncommitted transactions in reverse LSN order:
- For each undo action, write a CLR (Compensation Log Record) to the WAL
- CLRs ensure that undo is idempotent — if crash occurs during undo, re-recovery will redo the CLRs and skip already-undone work
- Continue until all uncommitted transactions are fully rolled back

**Recovery Time**:
- Proportional to WAL between last checkpoint and crash
- More frequent checkpoints = faster recovery but more I/O during normal operation
- Typical: 30-60 seconds for well-configured databases`
      },
      {
        question: 'How does checkpointing work and why is it important?',
        answer: `**Checkpoint** = A record that establishes a known-good recovery starting point.

**Purpose**:
1. Limit recovery time: without checkpoints, recovery must replay the entire WAL from the beginning
2. Allow WAL recycling: WAL segments before the checkpoint can be deleted (or archived for PITR)
3. Flush dirty pages: reduce the number of dirty pages in the buffer pool

**Checkpoint Types**:

**Sharp Checkpoint** (simple but blocking):
1. Stop all new transactions
2. Flush ALL dirty pages to disk
3. Write checkpoint record to WAL
4. Resume transactions
Problem: Blocks the entire database during flush (unacceptable for production)

**Fuzzy Checkpoint** (non-blocking, used in practice):
1. Write BEGIN_CHECKPOINT to WAL
2. Record current ATT (Active Transaction Table) and DPT (Dirty Page Table)
3. Continue normal operations (transactions keep running)
4. Background process gradually flushes dirty pages
5. Write END_CHECKPOINT with ATT and DPT snapshot
Note: Dirty pages may have changed between begin and end — that's OK, ARIES redo handles it

**PostgreSQL Implementation**:
- Checkpoint triggered by: time interval (checkpoint_timeout, default 5min), WAL volume (max_wal_size), manual CHECKPOINT command
- Spreads dirty page writes over checkpoint_completion_target * checkpoint_timeout (default: 0.9 * 5min = 4.5min)
- Prevents I/O spike by rate-limiting page flushes

**Tuning Trade-offs**:
- More frequent checkpoints: faster recovery, more I/O overhead
- Less frequent checkpoints: less I/O overhead, longer recovery time
- Target: recovery time < RTO (Recovery Time Objective), typically 30-60 seconds`
      },
      {
        question: 'How does Point-in-Time Recovery (PITR) work?',
        answer: `**PITR** = Restore a database to any specific point in time, typically to recover from human error (accidental DELETE, DROP TABLE).

**Requirements**:
1. A base backup (physical copy of all data files)
2. All WAL segments from the base backup to the target recovery point
3. A recovery target (timestamp, transaction ID, or named restore point)

**Process**:
1. **Restore base backup**: Copy data files to the database directory
2. **Configure recovery**: Set recovery target in recovery configuration
   \`\`\`
   restore_command = 'cp /archive/%f %p'
   recovery_target_time = '2025-03-14 23:59:59'
   recovery_target_action = 'promote'
   \`\`\`
3. **Start database**: PostgreSQL enters recovery mode
4. **WAL replay**: Applies WAL segments sequentially up to target
5. **Stop at target**: Stops replay at the specified timestamp
6. **Promote**: Database becomes writable

**WAL Archiving**:
- Continuous: each completed WAL segment (16MB) is archived to remote storage
- archive_command copies to S3, NFS, or dedicated archive server
- pg_receivewal for streaming archive (lower RPO than segment-based)

**RPO (Recovery Point Objective)**:
- Segment-based archiving: RPO = up to 1 WAL segment (16MB of changes, typically minutes)
- Streaming archiving: RPO = seconds (continuously streams WAL)
- Synchronous replication: RPO = 0 (no data loss)

**Practical Considerations**:
- Test PITR regularly — an untested backup is not a backup
- Base backups weekly or daily (reduces WAL replay time)
- Monitor archive lag (how far behind is the archive?)
- pg_basebackup for taking consistent base backups without stopping the database
- Tools: pgBackRest, Barman, WAL-G automate the entire PITR pipeline`
      }
    ],

    basicImplementation: {
      title: 'WAL-based Crash Recovery',
      description: 'Write-Ahead Log ensures committed transactions survive crashes. Sequential WAL writes followed by lazy data page flushes. ARIES three-phase recovery after crash.',
      svgTemplate: 'singleServer',
      problems: [
        'Recovery time proportional to WAL since last checkpoint',
        'WAL fsync adds latency to every commit',
        'Single-node: disk failure loses both WAL and data',
        'No protection against accidental data deletion (DROP TABLE)'
      ]
    },

    advancedImplementation: {
      title: 'Continuous Archiving with PITR',
      description: 'WAL segments continuously archived to remote storage -> Periodic base backups provide restore points -> PITR recovers to any timestamp -> Streaming replication provides zero-RPO standby.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Continuous WAL archiving provides RPO of seconds',
        'Base backups reduce recovery time (less WAL to replay)',
        'PITR recovers from human error (accidental deletes/drops)',
        'Streaming replication + PITR provides comprehensive protection',
        'Automated backup verification ensures backups actually work'
      ]
    },

    discussionPoints: [
      {
        topic: 'Recovery Planning',
        points: [
          'Define RPO and RTO before choosing recovery strategy',
          'Test recovery procedures regularly (monthly at minimum)',
          'Monitor backup success and archive lag continuously',
          'Document recovery runbooks with step-by-step instructions',
          'Consider logical backup (pg_dump) as complement to physical backup'
        ]
      },
      {
        topic: 'Advanced Recovery Topics',
        points: [
          'Tablespace-level recovery for restoring individual tables',
          'Timeline management in PostgreSQL for post-recovery forking',
          'Delayed replicas provide a time window to catch errors before they replicate',
          'Block-level incremental backups reduce backup storage and time',
          'Cross-region backup replication protects against datacenter failure'
        ]
      }
    ]
  },

  {
    id: 'nosql-internals',
    title: 'NoSQL Internals',
    icon: 'layers',
    color: '#f59e0b',
    questions: 10,
    description: 'Key-value (DynamoDB), Document (MongoDB), Column-family (Cassandra), and Graph (Neo4j) internals.',
    concepts: ['Key-Value Stores', 'Document Databases', 'Column-Family Stores', 'Graph Databases', 'Eventual Consistency', 'Data Modeling'],
    tips: [
      'NoSQL is not "No SQL" — it is "Not Only SQL". Many NoSQL databases now support SQL-like query languages.',
      'Choose the NoSQL type based on your access pattern, not your data shape',
      'Denormalization in NoSQL trades storage for read performance — design for your queries, not your entities'
    ],

    introduction: `NoSQL databases emerged to address limitations of relational databases at internet scale: rigid schemas, expensive joins, and difficulty with horizontal scaling. Each NoSQL category optimizes for different access patterns and trade-offs.

Understanding the internals of each type — how data is stored on disk, how queries are routed, how consistency is maintained — is essential for choosing the right database and designing effective data models. The biggest mistake engineers make with NoSQL is modeling data the same way they would in a relational database. NoSQL requires query-driven data modeling: design your tables around your access patterns, not your entity relationships.`,

    dataModel: {
      description: 'Storage architectures for each NoSQL category',
      schema: `Key-Value Store (DynamoDB):
+------------------------------------------+
| Partition Key | Sort Key | Attributes     |
+------------------------------------------+
| user#123      | profile  | {name, email}  |
| user#123      | order#1  | {total, items} |
| user#123      | order#2  | {total, items} |
+------------------------------------------+
Single-table design: all entity types in one table
Partition key determines shard, sort key enables range queries

Document Store (MongoDB):
Collection: users
{
  _id: ObjectId("..."),
  name: "Alice",
  email: "alice@example.com",
  orders: [                    <- embedded documents
    { id: 1, total: 99.99 },
    { id: 2, total: 149.50 }
  ],
  address: {                   <- nested object
    street: "123 Main St",
    city: "Seattle"
  }
}
WiredTiger engine: B-tree + compression + MVCC

Column-Family Store (Cassandra):
Row Key: user_123
+----------+-------------+-------------+
| Column   | name:Alice  | email:a@b   |
| Family:  +-------------+-------------+
| profile  | ts:1234567  | ts:1234568  |
+----------+-------------+-------------+
| Column   | 2025-01:$99 | 2025-02:$50 |
| Family:  +-------------+-------------+
| orders   | ts:1234600  | ts:1234700  |
+----------+-------------+-------------+
Storage: SSTable (LSM-tree) per column family
Partition key -> token ring -> responsible node

Graph Database (Neo4j):
(Alice)-[:FRIENDS_WITH]->(Bob)
(Alice)-[:PURCHASED]->(ProductX)
(Bob)-[:REVIEWED]->(ProductX)

Storage: separate stores for nodes, relationships, properties
Index-free adjacency: each node stores direct pointers
to its relationships -> O(1) relationship traversal`
    },

    keyQuestions: [
      {
        question: 'How does DynamoDB work internally?',
        answer: `**DynamoDB Architecture**:

**Data Model**:
- Tables with partition key (required) and optional sort key
- Items (rows) up to 400KB, arbitrary attributes per item
- Single-table design: store multiple entity types in one table using prefixed keys

**Storage Layer**:
- Data partitioned by hash of partition key
- Each partition: ~10GB storage, 3000 RCU, 1000 WCU
- Partitions automatically split when limits are reached
- B-tree storage within each partition

**Consistency**:
- Writes go to leader replica, synchronously replicated to 2 of 3 replicas
- Eventually consistent reads: any replica (cheaper, lower latency)
- Strongly consistent reads: leader replica only (2x cost)

**Global Secondary Index (GSI)**:
- Separate table with different partition/sort key
- Asynchronously replicated from base table
- Eventually consistent only
- Separate provisioned capacity

**DynamoDB Streams**:
- Ordered sequence of item-level changes
- 24-hour retention
- Powers: Lambda triggers, cross-region replication, materialized views

**Single-Table Design Pattern**:
\`\`\`
PK: USER#123        SK: PROFILE        (user data)
PK: USER#123        SK: ORDER#2025-01  (user's orders)
PK: ORDER#2025-01   SK: ITEM#456       (order line items)
PK: PRODUCT#456     SK: METADATA       (product data)
\`\`\`
All related data co-located in same partition for single-query retrieval.`
      },
      {
        question: 'How does MongoDB handle storage and replication?',
        answer: `**MongoDB Storage Engine (WiredTiger)**:

**Storage**:
- Documents stored in BSON (Binary JSON) format
- WiredTiger uses B-tree for indexes and data (or LSM-tree, configurable)
- Block compression (snappy, zlib, zstd) at the page level
- Prefix compression for indexes
- Each collection is a separate file on disk

**MVCC and Concurrency**:
- WiredTiger implements MVCC at the document level
- Readers see a consistent snapshot without blocking writers
- Document-level locks for writes (not collection or database level)
- WiredTiger cache (separate from filesystem cache) holds working set

**Replication (Replica Sets)**:
- One primary, multiple secondaries
- Primary accepts all writes
- Oplog: Capped collection recording all write operations
- Secondaries tail the oplog and apply operations
- Automatic failover via election (similar to Raft)
- Write concern: w:1 (primary only), w:majority (majority of replicas)
- Read preference: primary, primaryPreferred, secondary, secondaryPreferred, nearest

**Sharding**:
- Mongos router directs queries to correct shard
- Config servers store shard metadata (which chunks on which shard)
- Shard key determines data distribution
- Range-based or hash-based partitioning
- Automatic balancer moves chunks between shards

**Aggregation Pipeline**:
- Multi-stage processing: $match -> $group -> $sort -> $project
- $lookup for left-outer joins (limited, expensive across shards)
- Pipeline stages push down to shards when possible`
      },
      {
        question: 'How does Cassandra achieve its write performance?',
        answer: `**Cassandra Architecture**:

**Write Path** (optimized for throughput):
1. Client writes to ANY node (coordinator)
2. Coordinator forwards to responsible replicas (determined by partition key hash on token ring)
3. Each replica: Write to commit log (WAL) -> Write to MemTable (in-memory)
4. Return ACK to client (write complete)
5. MemTable flushed to SSTable (disk) when threshold reached
6. Compaction merges SSTables in background

**Why writes are fast**:
- Commit log is sequential append (no seeks)
- MemTable is in-memory (no disk I/O for the write itself)
- No read-before-write (unlike B-tree update)
- Configurable consistency level: ONE, QUORUM, ALL

**Read Path** (more complex):
1. Check MemTable (in-memory)
2. Check Bloom filter for each SSTable (quick false-positive check)
3. Check partition index to find SSTable offset
4. Read from SSTable on disk
5. Merge results from multiple SSTables (latest timestamp wins)

**Data Model**:
- Partition key: determines which node stores the data
- Clustering columns: determine sort order within a partition
- Wide partitions: millions of rows per partition key (time-series pattern)

**Consistency**:
- Tunable per query: ONE, QUORUM, LOCAL_QUORUM, ALL
- Quorum = (replication_factor / 2) + 1
- W(QUORUM) + R(QUORUM) > RF guarantees reading latest write
- Hinted handoff: if a replica is down, coordinator stores hints for later delivery

**Anti-entropy**:
- Read repair: on read, if replicas disagree, repair the stale one
- Merkle tree: anti-entropy process compares data hash trees between replicas
- Repair: background process to synchronize all replicas`
      },
      {
        question: 'When would you choose a graph database over other NoSQL types?',
        answer: `**Graph Databases** excel when relationships between entities are the primary query target.

**Neo4j Internals**:
- **Index-free adjacency**: Each node physically stores pointers to its relationships. Traversing a relationship is O(1) — does not depend on total graph size.
- **Property graph model**: Nodes and relationships have typed properties
- **Cypher query language**: Pattern-matching for graph traversal

**When to Choose Graph**:

**Strong fit** (relationships are first-class):
- Social networks: friends-of-friends, mutual connections, influence paths
- Recommendation engines: "users who bought X also bought Y" via collaborative filtering
- Fraud detection: Circular money transfers, identity links, suspicious patterns
- Knowledge graphs: Entity relationships, ontologies, semantic search
- Network topology: routing, dependency analysis, impact assessment

**Poor fit** (use a different NoSQL type):
- Simple key-value lookups -> DynamoDB/Redis
- Document storage with nested objects -> MongoDB
- Time-series or event logging -> Cassandra/TimescaleDB
- Full-text search -> Elasticsearch

**Performance Comparison for Relationship Queries**:
\`\`\`
"Find all friends of friends of Alice" (depth 2)

Relational (SQL JOIN):
  SELECT DISTINCT f2.friend_id FROM friends f1
  JOIN friends f2 ON f1.friend_id = f2.user_id
  WHERE f1.user_id = 'Alice';
  --> O(n) with large intermediate result sets
  --> Performance degrades with graph size

Graph (Cypher):
  MATCH (a:Person {name:'Alice'})-[:FRIEND]->()-[:FRIEND]->(fof)
  RETURN DISTINCT fof;
  --> O(k^d) where k = average connections, d = depth
  --> Performance depends on local neighborhood, not graph size
\`\`\`

At depth 3-4, SQL JOIN performance becomes unacceptable (minutes), while graph database completes in milliseconds because it follows direct pointers without scanning the entire relationship table.`
      }
    ],

    basicImplementation: {
      title: 'Single-Node Document Store',
      description: 'MongoDB-style document store with flexible schema, BSON storage, and B-tree indexes. Good for prototyping and moderate-scale applications with varied data shapes.',
      svgTemplate: 'singleServer',
      problems: [
        'No transactions across collections (pre MongoDB 4.0)',
        'Schema flexibility can lead to data quality issues without validation',
        'Embedded documents cause document growth and potential migration to 16MB limit',
        'No joins — denormalization required for related data'
      ]
    },

    advancedImplementation: {
      title: 'Distributed NoSQL with Tunable Consistency',
      description: 'Token ring distributes data across nodes -> Configurable replication factor (RF=3 typical) -> Tunable consistency per query (ONE to ALL) -> Anti-entropy repairs divergent replicas.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Tunable consistency allows per-query trade-off between latency and correctness',
        'Token ring with virtual nodes ensures even data distribution',
        'Hinted handoff handles temporary node failures gracefully',
        'Quorum reads + writes guarantee reading the latest write',
        'Multi-datacenter replication with LOCAL_QUORUM for low-latency geo-distributed access'
      ]
    },

    discussionPoints: [
      {
        topic: 'NoSQL Data Modeling',
        points: [
          'Model for queries, not entities — know your access patterns first',
          'Denormalization is expected: duplicate data for read performance',
          'Single-table design (DynamoDB) reduces round trips',
          'Avoid unbounded growth (don\'t embed unbounded arrays)',
          'Use secondary indexes sparingly — they have write and consistency costs'
        ]
      },
      {
        topic: 'NoSQL Selection Criteria',
        points: [
          'Key-value: extreme throughput, simple lookups (caching, session storage)',
          'Document: flexible schema, moderate queries (content management, user profiles)',
          'Column-family: massive write throughput, time-series (metrics, IoT, event logging)',
          'Graph: relationship-heavy queries (social, fraud, recommendations)',
          'Many applications combine multiple NoSQL types (polyglot persistence)'
        ]
      }
    ]
  },

  {
    id: 'newsql-databases',
    title: 'NewSQL Databases',
    icon: 'layers',
    color: '#f59e0b',
    questions: 8,
    description: 'CockroachDB, Spanner, TiDB — distributed SQL, clock synchronization, and TrueTime.',
    concepts: ['CockroachDB', 'Google Spanner', 'TiDB', 'Distributed SQL', 'Clock Synchronization', 'TrueTime'],
    tips: [
      'NewSQL gives you the SQL interface and ACID guarantees of relational databases with the horizontal scalability of NoSQL',
      'TrueTime is Spanner\'s secret weapon — GPS + atomic clocks provide globally synchronized timestamps',
      'CockroachDB uses hybrid logical clocks because it cannot rely on specialized hardware like Spanner'
    ],

    introduction: `NewSQL databases combine the best of both worlds: the SQL interface, ACID transactions, and strong consistency of traditional relational databases with the horizontal scalability and fault tolerance of distributed NoSQL systems. They emerged because many applications needed both scale and correctness — the NoSQL movement went too far in sacrificing consistency.

Google Spanner pioneered the category with its TrueTime API. CockroachDB brought similar capabilities to the open-source world using commodity hardware. TiDB provides MySQL-compatible distributed SQL. These systems solve the historically "impossible" problem of distributed transactions with acceptable performance.`,

    dataModel: {
      description: 'NewSQL architecture comparison',
      schema: `CockroachDB Architecture:
+---------------------------------------------------+
|  SQL Layer (distributed query execution)           |
+---------------------------------------------------+
|  Transaction Layer (distributed ACID via Raft)     |
+---------------------------------------------------+
|  Distribution Layer (range-based sharding)         |
|  Key range: [a, m) -> Raft Group 1 (Nodes 1,2,3) |
|  Key range: [m, z) -> Raft Group 2 (Nodes 2,3,4) |
+---------------------------------------------------+
|  Storage Layer (RocksDB/Pebble per node)           |
+---------------------------------------------------+

Google Spanner Architecture:
+---------------------------------------------------+
|  SQL Layer (F1 distributed query engine)           |
+---------------------------------------------------+
|  Transaction Layer (2PC + TrueTime)                |
+---------------------------------------------------+
|  Replication Layer (Paxos per split)               |
+---------------------------------------------------+
|  Storage Layer (Colossus distributed filesystem)   |
+---------------------------------------------------+
|  TrueTime: [earliest, latest] uncertainty window   |
|  GPS + Atomic Clock -> uncertainty < 7ms           |
+---------------------------------------------------+

TiDB Architecture:
+---------------------------------------------------+
|  TiDB Server (stateless SQL layer, MySQL protocol) |
+---------------------------------------------------+
|  PD (Placement Driver): metadata, timestamp oracle |
+---------------------------------------------------+
|  TiKV (distributed key-value, Raft per region)     |
|  Region 1: [a, m) on Nodes 1,2,3                  |
|  Region 2: [m, z) on Nodes 2,3,4                  |
+---------------------------------------------------+
|  Storage: RocksDB per TiKV node                    |
+---------------------------------------------------+`
    },

    keyQuestions: [
      {
        question: 'How does Google Spanner achieve globally consistent transactions?',
        answer: `**Spanner's Key Innovation: TrueTime**

**TrueTime API**:
Returns an interval [earliest, latest] instead of a single timestamp.
- GPS receivers + atomic clocks in every datacenter
- Uncertainty typically < 7ms (usually ~4ms)
- Enables globally ordered timestamps without centralized coordination

**How Spanner uses TrueTime for transactions**:

1. **Read-write transaction**:
   - Acquire locks, perform reads and writes
   - At commit time, choose commit timestamp s = TT.now().latest
   - Wait until TT.now().earliest > s ("commit wait")
   - This guarantees the commit timestamp is in the past for all nodes worldwide
   - Release locks

2. **Commit wait**:
   - Duration: up to 2x TrueTime uncertainty (~7-14ms)
   - This is the price of global consistency
   - With better clocks (lower uncertainty), commit wait shrinks

3. **Snapshot reads** (no locks needed):
   - Choose a timestamp t in the past
   - Read data as of timestamp t from any replica
   - Since t is in the past, all replicas have data up to t
   - Enables consistent reads without any coordination

**Why this matters**:
- External consistency: if transaction T1 commits before T2 starts, T1's timestamp < T2's timestamp
- This is stronger than serializable isolation — it respects real-time ordering
- Enables globally distributed transactions with strong consistency
- No other database achieves this without specialized hardware`
      },
      {
        question: 'How does CockroachDB work without specialized hardware?',
        answer: `**CockroachDB** provides Spanner-like capabilities on commodity hardware.

**Architecture**:
- Data split into 64MB ranges, each replicated via Raft (typically 3 replicas)
- Each range has a leaseholder (serves reads) and a Raft leader (coordinates writes)
- Usually leaseholder == Raft leader for efficiency

**Clock Synchronization** (without TrueTime):
- Uses Hybrid Logical Clocks (HLC): physical time + logical counter
- NTP synchronization between nodes (uncertainty: ~100-250ms, much higher than Spanner)
- Nodes track maximum clock offset via gossip protocol
- Transactions use "uncertainty intervals" to handle clock skew

**Transaction Protocol**:
1. **Read**: Check if any version of the data has a timestamp within the reader's uncertainty interval
2. If yes: "uncertainty restart" — retry with a later timestamp
3. If no: safe to read the latest version before the read timestamp

**Distributed Transactions** (without 2PC blocking):
- Parallel commits: write intent records on each involved range
- Transaction record tracks commit status
- Commit: write transaction record as COMMITTED, intents resolved lazily
- Conflict resolution: first-writer-wins, losers restart

**Key Differences from Spanner**:
| Aspect | Spanner | CockroachDB |
|--------|---------|-------------|
| Clock | TrueTime (GPS+atomic) | HLC + NTP |
| Uncertainty | ~4-7ms | ~100-250ms |
| Commit wait | ~7-14ms | None (uses uncertainty restarts) |
| External consistency | Yes | Approximate (within clock skew) |
| Hardware | Specialized | Commodity |
| Deployment | Google Cloud only | Anywhere |

**Trade-off**: CockroachDB trades slightly weaker ordering guarantees for deployment flexibility.`
      },
      {
        question: 'How does TiDB provide MySQL compatibility with distributed SQL?',
        answer: `**TiDB Architecture**:

**Stateless SQL Layer (TiDB Server)**:
- Parses MySQL protocol — drop-in replacement for MySQL clients
- Compiles SQL to distributed execution plans
- Pushes computation down to TiKV (coprocessor)
- Horizontally scalable: add more TiDB servers for more query throughput

**Distributed Storage (TiKV)**:
- Key-value store with Raft consensus per region (~96MB)
- RocksDB (LSM-tree) as local storage engine
- MVCC for transaction isolation
- Automatic region splitting when size exceeds threshold

**Placement Driver (PD)**:
- Cluster metadata and orchestration
- Timestamp Oracle (TSO): globally unique, monotonically increasing timestamps
- Scheduling: balances regions across TiKV nodes
- Single logical clock eliminates clock synchronization issues (but PD is a bottleneck)

**Transaction Model (Percolator-based)**:
1. Client starts transaction, gets start_ts from PD
2. Prewrite: write locks + data to all involved keys (choose one as "primary")
3. Commit: write commit record for primary key with commit_ts from PD
4. If primary commits successfully, transaction is committed
5. Secondary keys resolved lazily (readers help resolve if they encounter locks)

**Key Features**:
- Online DDL: schema changes without locking tables
- TiFlash: columnar replica for OLAP queries (HTAP capability)
- Placement rules: control which regions go to which physical nodes (geo-pinning)

**Limitations compared to MySQL**:
- Some MySQL features not supported (stored procedures, triggers limited)
- Distributed transactions add latency (~10-20ms vs ~1ms for local MySQL)
- TSO is a centralized bottleneck (mitigated by batching timestamp requests)`
      },
      {
        question: 'When should you choose a NewSQL database over traditional SQL or NoSQL?',
        answer: `**Choose NewSQL when you need ALL of these**:
1. Strong consistency (ACID transactions)
2. SQL interface (complex queries, joins)
3. Horizontal scalability (beyond single-node capacity)
4. High availability (survive node/datacenter failures)

**NewSQL vs Traditional SQL (PostgreSQL, MySQL)**:

Choose NewSQL when:
- Data exceeds single-node capacity (>2TB for transactional data)
- Write throughput exceeds single-node limits (>50K writes/sec)
- Need multi-region deployment with low latency
- Cannot afford any single point of failure

Stick with traditional SQL when:
- Data fits on one machine (vast majority of applications)
- Simpler operations (no distributed coordination to manage)
- Lower latency for single-shard operations
- More mature ecosystem (extensions, tools, community knowledge)

**NewSQL vs NoSQL (DynamoDB, Cassandra)**:

Choose NewSQL when:
- Need multi-row/multi-table transactions
- Need SQL joins and complex queries
- Schema enforcement is important
- Strong consistency is required

Choose NoSQL when:
- Access patterns are simple (key-value, single-table)
- Maximum write throughput is the priority
- Eventual consistency is acceptable
- Schema flexibility is needed

**Real-World Decision Examples**:
- E-commerce inventory (strong consistency needed): NewSQL or traditional SQL
- Social media feed (eventual consistency OK): NoSQL
- Banking ledger at scale: NewSQL (CockroachDB)
- IoT sensor data: NoSQL (Cassandra, TimescaleDB)
- SaaS multi-tenant (needs SQL + scale): NewSQL (CockroachDB, TiDB)
- Content management (flexible schema): MongoDB`
      }
    ],

    basicImplementation: {
      title: 'Single-Region Distributed SQL',
      description: 'CockroachDB or TiDB cluster within a single region. Raft consensus provides fault tolerance. Automatic sharding distributes data. SQL interface for application developers.',
      svgTemplate: 'singleServer',
      problems: [
        'Distributed transactions add 5-20ms latency vs single-node SQL',
        'Operational complexity higher than single-node PostgreSQL',
        'Debugging distributed query plans is more challenging',
        'Not all SQL features supported (vendor-specific limitations)'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Region Distributed SQL',
      description: 'Raft groups span multiple regions for fault tolerance -> Leaseholder placement optimized for read locality -> Follower reads serve stale reads from local region -> Global transactions coordinate across regions with commit wait or uncertainty intervals.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Geo-partitioning pins data to specific regions for compliance and latency',
        'Follower reads serve local reads without cross-region round trips',
        'Automatic failover across regions with zero data loss (synchronous Raft)',
        'Global transactions incur cross-region latency (50-200ms)',
        'Locality-optimized schema design minimizes cross-region coordination'
      ]
    },

    discussionPoints: [
      {
        topic: 'NewSQL Adoption Considerations',
        points: [
          'Most applications do NOT need NewSQL — single-node PostgreSQL handles more than you think',
          'Migration from MySQL/PostgreSQL is not seamless despite SQL compatibility',
          'Operational expertise for distributed systems is scarce and expensive',
          'Cloud-managed offerings (CockroachDB Serverless, Spanner) reduce operational burden',
          'Start with read replicas and partitioning before jumping to NewSQL'
        ]
      },
      {
        topic: 'Clock Synchronization Deep Dive',
        points: [
          'TrueTime (GPS + atomic clocks): ~4ms uncertainty, Google-only',
          'NTP: ~100ms uncertainty, universally available but less precise',
          'HLC: Hybrid Logical Clocks combine physical and logical time',
          'Clock skew affects transaction ordering and read freshness',
          'Amazon Time Sync Service: ~microsecond accuracy for EC2 instances'
        ]
      }
    ]
  },

  {
    id: 'specialized-databases',
    title: 'Specialized Databases',
    icon: 'layers',
    color: '#f59e0b',
    questions: 8,
    description: 'Time-series (InfluxDB), Spatial (PostGIS), Search (Elasticsearch), and Vector (Pinecone) databases.',
    concepts: ['Time-Series Databases', 'Spatial Databases', 'Search Engines', 'Vector Databases', 'Domain-Specific Optimization'],
    tips: [
      'Specialized databases are 10-100x faster than general-purpose databases for their specific workload',
      'Most production systems use polyglot persistence — multiple database types for different data',
      'Vector databases are the hottest category due to AI/ML embedding search — understand the fundamentals'
    ],

    introduction: `General-purpose databases are good at everything but exceptional at nothing. Specialized databases sacrifice generality to achieve order-of-magnitude performance improvements for specific workloads. Time-series databases exploit the temporal ordering of data. Spatial databases use R-tree indexes for geometric queries. Search engines use inverted indexes for full-text retrieval. Vector databases use approximate nearest neighbor algorithms for similarity search.

Understanding when to reach for a specialized database — and when a general-purpose database with the right index is sufficient — is a key architectural skill. Over-specialization creates operational complexity; under-specialization creates performance problems.`,

    dataModel: {
      description: 'Storage and indexing strategies for each specialized type',
      schema: `Time-Series Database (InfluxDB / TimescaleDB):
+-----------------------------------------------------------+
| Measurement: cpu_usage                                     |
| Tags: host=server1, region=us-east (indexed, low-cardinality)|
| Time: 2025-03-14T10:00:00Z                                 |
| Fields: usage_user=45.2, usage_system=12.1 (values)        |
+-----------------------------------------------------------+
Storage: columnar + time-based partitioning
  Chunk 1: [Jan 1 - Jan 7]   <- compressed, cold
  Chunk 2: [Jan 8 - Jan 14]  <- compressed, warm
  Chunk 3: [Jan 15 - now]    <- uncompressed, hot

Spatial Database (PostGIS):
+-------------------------------------------+
| R-tree Index:                              |
|  +--[Bounding Box: North America]--+      |
|  |  +--[BB: West Coast]--+         |      |
|  |  | Seattle  Portland  |         |      |
|  |  | San Francisco      |         |      |
|  |  +--------------------+         |      |
|  |  +--[BB: East Coast]--+         |      |
|  |  | New York  Boston   |         |      |
|  |  +--------------------+         |      |
|  +----------------------------------+     |
+-------------------------------------------+
Spatial queries: ST_Within, ST_DWithin, ST_Intersects

Search Engine (Elasticsearch):
+-------------------------------------------+
| Inverted Index:                            |
| "database"  -> [doc1, doc5, doc12]         |
| "internals" -> [doc1, doc3]                |
| "postgres"  -> [doc5, doc8, doc12]         |
+-------------------------------------------+
| BM25 scoring: tf * idf * field_length_norm |
| Segments: immutable, merged in background  |
+-------------------------------------------+

Vector Database (Pinecone / pgvector):
+-------------------------------------------+
| Vector: [0.12, -0.45, 0.78, ..., 0.33]   |
|         (768 or 1536 dimensions)           |
| Index: HNSW (Hierarchical Navigable        |
|        Small World graph)                  |
|                                            |
|  Layer 2:  A ---- B                        |
|  Layer 1:  A -- C -- B -- D               |
|  Layer 0:  A-E-C-F-B-G-D-H               |
|                                            |
| Query: find K nearest vectors to query vec |
| Approximate: trades 100% recall for speed  |
+-------------------------------------------+`
    },

    keyQuestions: [
      {
        question: 'How do time-series databases optimize for temporal data?',
        answer: `**Time-Series Optimization Techniques**:

**1. Time-based Partitioning (Chunking)**:
- Data automatically partitioned by time intervals (hour, day, week)
- Recent chunks in memory (hot), older chunks compressed on disk (cold)
- Old data dropped by deleting entire chunks (instant, no individual deletes)
- Queries spanning time ranges only scan relevant chunks

**2. Columnar Storage**:
- Store each field (column) contiguously on disk
- Enables aggressive compression: timestamps are monotonically increasing (delta encoding), similar values compress well (run-length encoding, gorilla compression)
- Compression ratios: 10:1 to 50:1 typical for metrics data

**3. Write Optimization**:
- Append-only model: new data always arrives at the latest time
- Batch inserts: accumulate points in memory, flush periodically
- No random updates: historical data is immutable (or rarely modified)
- Write throughput: 1M+ points/second on moderate hardware

**4. Query Optimization**:
- Pre-aggregation: continuous queries maintain rollups (1-min, 5-min, 1-hour averages)
- Downsampling: automatically reduce resolution for old data
- Time-based indexes: skip directly to relevant time range

**InfluxDB vs TimescaleDB**:
- InfluxDB: Purpose-built, Flux query language, simpler operations
- TimescaleDB: PostgreSQL extension, full SQL, joins with relational data, easier if you already use PostgreSQL

**Common Access Patterns**:
- Last N minutes of metrics for dashboards
- Aggregate over time windows (avg CPU last hour)
- Top-K queries (busiest servers today)
- Anomaly detection over time series`
      },
      {
        question: 'How does Elasticsearch work internally?',
        answer: `**Elasticsearch Architecture**:

**Core Concepts**:
- **Index**: Collection of documents (like a database table)
- **Shard**: Horizontal partition of an index (Lucene index)
- **Replica**: Copy of a shard for fault tolerance and read scaling
- **Segment**: Immutable chunk of data within a shard (Lucene segment)

**Inverted Index**:
- Maps every unique term to the list of documents containing it
- Term dictionary: sorted list of all terms (stored in a trie/FST for O(1) lookup)
- Posting list: for each term, list of (doc_id, term_frequency, positions)
- Enables O(1) term lookup + linear scan of matching documents

**Write Path**:
1. Document received by coordinating node
2. Routed to correct shard (hash of _id % num_primary_shards)
3. Written to in-memory buffer + transaction log (translog)
4. Periodically "refreshed" (default 1 second): buffer -> new Lucene segment (searchable)
5. Segments are immutable; deletes are marked in a separate bitset
6. Background merge process combines small segments into larger ones

**Search Path**:
1. Query sent to coordinating node
2. Scatter: query forwarded to all relevant shards
3. Each shard searches its segments, returns top-K doc IDs + scores
4. Gather: coordinating node merges results, fetches full documents
5. Return results

**Relevance Scoring (BM25)**:
- Term Frequency (TF): more occurrences -> higher score
- Inverse Document Frequency (IDF): rare terms -> higher score
- Field length normalization: shorter fields score higher for a given match

**When to use Elasticsearch** (vs database full-text search):
- Need sub-100ms search across millions of documents
- Need faceted search, aggregations, highlighting
- Need fuzzy matching, synonyms, language-specific stemming
- PostgreSQL tsvector/GIN is sufficient for simpler full-text search`
      },
      {
        question: 'How do vector databases enable AI/ML similarity search?',
        answer: `**Vector Databases** store high-dimensional vectors (embeddings) and find the most similar vectors to a query.

**Use Cases**:
- Semantic search: "find documents about machine learning" (not just keyword match)
- Recommendation: find similar products/users based on embedding similarity
- RAG (Retrieval-Augmented Generation): find relevant context for LLM prompts
- Image/audio similarity: find visually/acoustically similar media

**Embedding Vectors**:
- Text: 768-dim (BERT) or 1536-dim (OpenAI text-embedding-ada-002)
- Images: 512-2048 dimensions (ResNet, CLIP)
- Each dimension captures a semantic feature learned by the model

**Distance Metrics**:
- Cosine similarity: angle between vectors (most common for text)
- Euclidean distance: straight-line distance (good for spatial data)
- Dot product: magnitude-sensitive similarity

**Indexing Algorithms**:

**HNSW (Hierarchical Navigable Small World)**:
- Multi-layer graph where higher layers have fewer, long-range connections
- Search: start at top layer, greedily navigate toward query vector, descend to next layer
- Build time: O(n * log n), Query time: O(log n)
- Recall: 95-99% with proper tuning
- Memory: stores entire graph in memory (expensive for billions of vectors)

**IVF (Inverted File Index)**:
- Partition vector space into clusters (Voronoi cells) via k-means
- At query time: find nearest cluster centroids, search only those clusters
- Faster than HNSW for very large datasets, lower recall
- Can combine with PQ (Product Quantization) for compression

**Dedicated vs Embedded**:
- **Pinecone, Weaviate, Qdrant**: Purpose-built, managed, optimized for scale
- **pgvector**: PostgreSQL extension, combine vector search with SQL queries
- **FAISS**: Library (not database), for embedding into applications

**Choosing**:
- < 1M vectors: pgvector is sufficient (simpler ops, SQL integration)
- 1M-100M vectors: HNSW-based dedicated database
- > 100M vectors: IVF + PQ or disk-based indexes (Vald, Milvus)`
      },
      {
        question: 'How do spatial databases handle geographic queries?',
        answer: `**Spatial Databases** optimize for queries involving geometry and geography.

**PostGIS** (PostgreSQL extension, the industry standard):

**Data Types**:
- GEOMETRY: flat Cartesian plane (faster, suitable for small areas)
- GEOGRAPHY: spherical earth model (accurate for global distances, slower)
- Common types: POINT, LINESTRING, POLYGON, MULTIPOLYGON

**Spatial Indexes (R-tree via GiST)**:
- R-tree organizes data into nested bounding boxes
- Each node covers a rectangular region containing its children
- Query: "find all restaurants within 5km" -> traverse tree, pruning branches whose bounding boxes don't overlap the search circle
- Dramatically faster than scanning all points: O(log n + k) vs O(n)

**Common Spatial Queries**:
\`\`\`sql
-- Find restaurants within 5km of a point
SELECT name FROM restaurants
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint(-122.4194, 37.7749)::geography,
  5000  -- meters
);

-- Find which neighborhood a point is in
SELECT neighborhood FROM boundaries
WHERE ST_Within(
  ST_MakePoint(-122.4194, 37.7749),
  geom
);

-- Find overlapping regions
SELECT a.name, b.name FROM regions a, regions b
WHERE ST_Intersects(a.geom, b.geom) AND a.id != b.id;
\`\`\`

**Geohashing** (alternative to R-tree):
- Encode lat/lon into a string: (37.7749, -122.4194) -> "9q8yyk8"
- Hierarchical: longer prefix = more precise location
- Proximity: nearby points share common prefixes
- Used by: Redis GEO, DynamoDB (with geohash sort key), Elasticsearch geo_point

**When PostGIS vs Dedicated**:
- PostGIS: need spatial + relational queries together (most common)
- Dedicated (Tile38): real-time geofencing, pub/sub on location changes
- H3 (Uber): hexagonal grid system for ride matching, surge pricing`
      }
    ],

    basicImplementation: {
      title: 'PostgreSQL with Specialized Extensions',
      description: 'Use PostgreSQL extensions for specialized workloads: pg_trgm for fuzzy text search, PostGIS for spatial queries, pgvector for similarity search, TimescaleDB for time-series. Single operational footprint.',
      svgTemplate: 'singleServer',
      problems: [
        'Jack of all trades: 2-10x slower than purpose-built specialized databases',
        'Extensions compete for shared buffer pool and CPU resources',
        'Cannot independently scale different workloads',
        'Some features limited compared to dedicated systems'
      ]
    },

    advancedImplementation: {
      title: 'Polyglot Persistence Architecture',
      description: 'PostgreSQL for transactional data -> Elasticsearch for full-text search -> TimescaleDB for metrics -> pgvector/Pinecone for embeddings -> Redis for caching. Each database optimized for its workload.',
      svgTemplate: 'loadBalancer',
      keyPoints: [
        'Each database handles its optimal workload at peak performance',
        'Change Data Capture (CDC) keeps databases synchronized',
        'Application layer routes queries to the appropriate database',
        'Operational complexity managed via infrastructure-as-code and monitoring',
        'Fallback strategy: primary database serves if specialized database is down'
      ]
    },

    discussionPoints: [
      {
        topic: 'When to Specialize',
        points: [
          'Start with PostgreSQL — it handles more specialized workloads than you expect',
          'Add a specialized database only when PostgreSQL becomes the bottleneck',
          'Measure before specializing: 10ms vs 1ms may not matter for your SLA',
          'Operational cost of each additional database type is significant',
          'Managed services (AWS OpenSearch, Pinecone) reduce operational burden'
        ]
      },
      {
        topic: 'Data Synchronization Challenges',
        points: [
          'CDC (Debezium) captures changes from primary and feeds to secondary databases',
          'Eventual consistency between primary and specialized databases',
          'Schema evolution must be coordinated across all databases',
          'Monitoring data freshness across all stores is critical',
          'Conflict resolution when same data exists in multiple stores'
        ]
      }
    ]
  },
];
