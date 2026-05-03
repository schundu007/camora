# Plan: Update Camora System Design Content to Match HelloInterview Curriculum + Add Visuals

## Executive Summary

This plan covers three categories of work:
1. **7 new system design problems** (missing from HelloInterview's curriculum)
2. **7 new architectural patterns** (HelloInterview-style applied patterns)
3. **5 new technology deep-dive topics** (Cassandra, DynamoDB, Flink, ZooKeeper, Vector Databases)
4. **Visual/diagram enhancements** across all new and select existing entries

---

## Part 1: Files to Modify

| File | Lines | What Changes |
|------|-------|-------------|
| `systemDesignProblemsExtra.js` | ~7354 | Add 7 new problem entries at end of `extraSystemDesigns` array |
| `systemDesignPatterns.js` | ~2749 | Add 7 new pattern entries + new categories + category map entries |
| `systemDesignTopics.js` | ~15705 | Add 5 new technology deep-dive topic entries + category map entries |
| `systemDesignProblemsExtra.js` | (same) | Update category map with new problem IDs |
| `DiagramSVG.jsx` | ~2739 | Add SVG templates for new problems (basic + advanced) |

No changes needed to `systemDesignTradeoffs.js` (already comprehensive).
No changes needed to `systemDesignProblems.js` (main file already at 53 problems; new problems go in Extra).

---

## Part 2: New Problems to Add (7 entries in `systemDesignProblemsExtra.js`)

Each entry MUST follow the full schema observed in the most recent entries (e.g., `distributed-task-scheduler`, `flash-sale`). The complete field set for each problem:

```
{
  id, isNew, title, subtitle, icon, color, difficulty, description,
  introduction,
  functionalRequirements: [],
  nonFunctionalRequirements: [],
  estimation: { users, storage, bandwidth, qps },
  apiDesign: { description, endpoints: [{ method, path, params, response }] },
  dataModel: { description, schema },
  keyQuestions: [{ question, answer }],  // 3-4 per problem
  basicImplementation: { title, description, svgTemplate?, architecture?, problems: [] },
  advancedImplementation: { title, svgTemplate?, architecture?, keyPoints: [] },
  // Extended fields (all new entries MUST include):
  discussionPoints: [{ topic, points: [] }],  // 2-3 per problem
  edgeCases: [{ scenario, impact, mitigation }],  // 4-5 per problem
  tradeoffs: [{ decision, pros, cons, recommendation }],  // 3-4 per problem
  layeredDesign: [{ name, purpose, components: [] }],  // 4 layers per problem
  // Backward compat:
  requirements: [],
  components: [],
  keyDecisions: [],
}
```

### 2.1 LeetCode Online Judge (`leetcode-online-judge`)
- **Category**: `specialized` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Medium
- **Key challenges**: Code execution sandbox, language-agnostic judging, test case management, real-time contest leaderboards, rate-limited submissions
- **Core components**: Code execution engine (Docker/gVisor sandboxes), test runner, submission queue, leaderboard service, contest service
- **Data model**: Users, Problems, TestCases, Submissions, Contests, Leaderboards
- **Key questions**: How to safely execute arbitrary user code? How to handle contest leaderboards at scale? How to prevent cheating?
- **Architecture ASCII art**: Include basic (single judge server) and advanced (distributed judge fleet with sandbox isolation)
- **svgTemplate**: Create `leetcodeJudge` (basic) and `leetcodeAdvanced` in DiagramSVG.jsx

### 2.2 Strava / Fitness Tracking (`strava-fitness`)
- **Category**: `social` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Medium
- **Key challenges**: GPS trace processing, activity feed generation, segment matching (comparing user performance on known routes), social feed, time-series data for heart rate/power
- **Core components**: GPS ingestion pipeline, segment matcher, activity processor, social feed, stats aggregator
- **Data model**: Users, Activities (polyline, stats), Segments, SegmentEfforts, Feed, Followers
- **Key questions**: How to match GPS traces to known segments? How to handle time-series data from wearables? How to rank segment leaderboards?
- **svgTemplate**: Create `stravaFitness` and `stravaAdvanced` in DiagramSVG.jsx

### 2.3 Online Auction / eBay (`online-auction`)
- **Category**: `ecommerce` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Medium
- **Key challenges**: Real-time bidding with concurrency control, auction timer management, sniping protection, bid history, proxy/automatic bidding
- **Core components**: Bid service, auction timer, notification service, payment escrow, search/browse
- **Data model**: Users, Items, Auctions, Bids, WatchList, Transactions
- **Key questions**: How to handle concurrent bids (last-second sniping)? How to implement proxy bidding? How to prevent bid manipulation?
- **svgTemplate**: Create `onlineAuction` and `onlineAuctionAdvanced` in DiagramSVG.jsx

### 2.4 Facebook Live Comments (`fb-live-comments`)
- **Category**: `communication` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Medium
- **Key challenges**: Real-time comment streaming at massive scale (millions of concurrent viewers), comment ordering, profanity filtering, pinned/highlighted comments, emoji reactions
- **Core components**: WebSocket gateway, comment ingestion, pub/sub fan-out, content moderation, comment aggregator
- **Data model**: LiveStreams, Comments, Reactions, Moderation queue
- **Key questions**: How to fan out comments to millions of viewers? How to handle comment rate limiting per stream? How to do real-time content moderation?
- **svgTemplate**: Create `fbLiveComments` and `fbLiveCommentsAdvanced` in DiagramSVG.jsx

### 2.5 Facebook Post Search (`fb-post-search`)
- **Category**: `infrastructure` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Medium
- **Key challenges**: Full-text search over billions of posts, access control (privacy-aware search), real-time indexing, personalized ranking, typeahead suggestions
- **Core components**: Indexing pipeline, search service (Elasticsearch), access control layer, ranking service, typeahead service
- **Data model**: Posts (text, media refs, privacy), SearchIndex, AccessControlList, SearchHistory
- **Key questions**: How to enforce privacy during search? How to keep index fresh with millions of new posts/hour? How to rank results by social relevance?
- **svgTemplate**: Create `fbPostSearch` and `fbPostSearchAdvanced` in DiagramSVG.jsx

### 2.6 Price Tracking Service (`price-tracker`)
- **Category**: `specialized` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Easy
- **Key challenges**: Web scraping at scale, price change detection, alert delivery, historical price storage, rate limiting against target sites
- **Core components**: Crawler/scraper fleet, price extractor (per-site parsers), price comparison engine, alert service, historical price DB
- **Data model**: Products, PriceSources, PriceHistory (time-series), Alerts, Users
- **Key questions**: How to scrape prices reliably across thousands of sites? How to store and query price history efficiently? How to trigger alerts with low latency?
- **svgTemplate**: Create `priceTracker` and `priceTrackerAdvanced` in DiagramSVG.jsx

### 2.7 YouTube Top K / Real-time Trending (`youtube-top-k`)
- **Category**: `streaming` (add to `extraSystemDesignProblemCategoryMap`)
- **Difficulty**: Hard
- **Key challenges**: Computing trending rankings over massive streaming data, time-decay weighting, fraud/manipulation detection, regional trending, approximate counting
- **Core components**: View event ingestion (Kafka), stream processor (Flink), approximate counter (Count-Min Sketch + heap), ranking service, regional aggregator
- **Data model**: ViewEvents, TrendingScores (Redis sorted sets), RegionalRankings, FraudSignals
- **Key questions**: How to compute top-K over billions of daily view events? How to handle time decay in trending scores? How to prevent manipulation?
- **NOTE**: Camora already has `top-k-leaderboard` in the main file. This entry should focus specifically on YouTube's trending algorithm and regional aspects, referencing but not duplicating the top-K data structure discussion.
- **svgTemplate**: Create `youtubeTopK` and `youtubeTopKAdvanced` in DiagramSVG.jsx

### Implementation Steps for Problems:

1. Add all 7 IDs to `extraSystemDesignProblemCategoryMap` in `systemDesignProblemsExtra.js`
2. Append all 7 full problem objects to the `extraSystemDesigns` array
3. Add 14 SVG templates (7 basic + 7 advanced) to `DiagramSVG.jsx`

---

## Part 3: New Patterns to Add (7 entries in `systemDesignPatterns.js`)

HelloInterview has "applied patterns" that differ from Camora's existing distributed system patterns (WAL, Gossip, Vector Clocks, etc.). The existing patterns are low-level distributed systems internals. The new patterns are higher-level architectural patterns applied during system design interviews.

### New Category to Add:

```js
// Add to systemDesignPatternCategories:
{ id: 'applied', name: 'Applied Architecture Patterns', icon: 'layers', color: '#f59e0b' }
```

Each pattern follows the same schema as existing patterns:
```
{
  id, title, icon, color, questions,
  description,
  concepts: [],
  tips: [],
  introduction,
  keyQuestions: [{ question, answer }],  // 3-4 per pattern
  dataModel: { description, schema }
}
```

### 3.1 Real-time Updates (`real-time-updates`)
- **Category**: `applied`
- **Concepts**: WebSocket, SSE, Long Polling, Pub/Sub, fan-out, connection management, presence
- **Key questions**: When to use WebSocket vs SSE vs long polling? How to scale WebSocket connections to millions? How to handle reconnection and missed events?
- **Data model**: Connection registry, event routing, channel subscriptions

### 3.2 Dealing with Contention (`dealing-with-contention`)
- **Category**: `applied`
- **Concepts**: Optimistic locking, pessimistic locking, CAS, distributed locks, MVCC, queue-based serialization, sharding to reduce contention
- **Key questions**: How to choose between optimistic and pessimistic locking? How to handle hot keys/rows? How does sharding reduce contention?
- **Data model**: Lock state, version vectors, queue ordering

### 3.3 Multi-step Processes / Sagas (`multi-step-processes`)
- **Category**: `applied`
- **Concepts**: Saga pattern (choreography vs orchestration), compensating transactions, idempotency, state machines, two-phase commit limitations
- **Key questions**: When to use choreography vs orchestration? How to handle partial failures? How to make compensating transactions idempotent?
- **Data model**: Saga state machine, step log, compensation log

### 3.4 Scaling Reads (`scaling-reads`)
- **Category**: `applied`
- **Concepts**: Read replicas, caching layers (L1/L2/CDN), denormalization, materialized views, CQRS, cache-aside vs read-through
- **Key questions**: How to handle read-after-write consistency with replicas? When to use caching vs replicas vs denormalization? How does CQRS separate read and write paths?
- **Data model**: Replication topology, cache hierarchy, materialized view definitions

### 3.5 Scaling Writes (`scaling-writes`)
- **Category**: `applied`
- **Concepts**: Sharding/partitioning, write-behind caching, batching, append-only logs, LSM trees, event sourcing, write amplification
- **Key questions**: How to choose a partition key? How to handle cross-shard transactions? How do LSM trees optimize write throughput?
- **Data model**: Partition mapping, write buffer, compaction schedule

### 3.6 Handling Large Blobs (`handling-large-blobs`)
- **Category**: `applied`
- **Concepts**: Object storage (S3), chunked uploads, resumable uploads, content-addressable storage, deduplication, CDN distribution, presigned URLs
- **Key questions**: How to handle multi-GB file uploads reliably? How to deduplicate stored objects? How to serve large files globally with low latency?
- **Data model**: Blob metadata, chunk registry, upload session, CDN distribution

### 3.7 Managing Long Running Tasks (`managing-long-running-tasks`)
- **Category**: `applied`
- **Concepts**: Task queues, polling vs webhook for status, progress tracking, timeout handling, checkpoint/resume, dead letter queues, idempotent task execution
- **Key questions**: How to track progress of long-running operations? How to handle task failures and retries? How to implement timeout without losing work?
- **Data model**: Task state machine, checkpoint store, progress log

### Implementation Steps for Patterns:

1. Add `applied` category to `systemDesignPatternCategories`
2. Add all 7 IDs to `systemDesignPatternCategoryMap` with value `'applied'`
3. Append all 7 full pattern objects to the `systemDesignPatterns` array

---

## Part 4: New Technology Deep-Dive Topics (5 entries in `systemDesignTopics.js`)

These follow the topic schema observed in existing entries like `caching`, `databases`, `bloom-filters`:

```
{
  id, title, icon, color, questions,
  description,
  concepts: [],
  tips: [],
  introduction,
  functionalRequirements: [],
  nonFunctionalRequirements: [],
  dataModel: { description, schema },
  apiDesign: { description, endpoints: [] },
  keyQuestions: [{ question, answer }],  // 4-6 per topic
  // Visual enhancements (existing topics use these):
  comparisonTables: [],  // optional
  visualCards: [],  // optional
  patternCards: [],  // optional
  staticDiagrams: [],  // optional
  edgeCases: [],
  tradeoffs: [],
  layeredDesign: []
}
```

### 4.1 Cassandra Deep Dive (`cassandra-deep-dive`)
- **Category**: `storage` (add to `systemDesignCategoryMap`)
- **Concepts**: Wide-column model, partition key vs clustering key, consistent hashing ring, gossip protocol, tunable consistency (ONE/QUORUM/ALL), compaction strategies (size-tiered vs leveled), tombstones, materialized views, lightweight transactions (LWT)
- **Key questions**: How does Cassandra's ring topology work? When to use Cassandra vs DynamoDB vs PostgreSQL? How to model data for Cassandra (query-driven design)? What are tombstones and why do they cause problems?
- **Visual**: comparisonTable for Cassandra vs DynamoDB vs MongoDB, visualCard for consistency levels

### 4.2 DynamoDB Deep Dive (`dynamodb-deep-dive`)
- **Category**: `storage` (add to `systemDesignCategoryMap`)
- **Concepts**: Partition key + sort key, GSI/LSI, single-table design, capacity modes (on-demand vs provisioned), DynamoDB Streams, TTL, transactions, DAX caching, partition splitting
- **Key questions**: How does DynamoDB's partition management work? When to use single-table design? How do DynamoDB Streams enable event-driven architectures? What are hot partition problems and how to avoid them?
- **Visual**: comparisonTable for provisioned vs on-demand, visualCard for partition key design patterns

### 4.3 Apache Flink Deep Dive (`flink-deep-dive`)
- **Category**: `communication` (add to `systemDesignCategoryMap`)
- **Concepts**: Stream processing vs batch, event time vs processing time, watermarks, windowing (tumbling, sliding, session), checkpointing (Chandy-Lamport), exactly-once semantics, state backends (RocksDB), savepoints
- **Key questions**: How does Flink achieve exactly-once processing? What are watermarks and how do they handle late data? How does Flink checkpointing work for fault tolerance? When to use Flink vs Kafka Streams vs Spark Streaming?
- **Visual**: comparisonTable for Flink vs Kafka Streams vs Spark, visualCard for windowing types

### 4.4 ZooKeeper Deep Dive (`zookeeper-deep-dive`)
- **Category**: `reliability` (add to `systemDesignCategoryMap`)
- **Concepts**: ZAB protocol, znodes (persistent, ephemeral, sequential), watches, leader election, distributed locks, service discovery, configuration management, session management, ZooKeeper ensemble
- **Key questions**: How does ZooKeeper leader election work? How to implement a distributed lock with ZooKeeper? What are ephemeral nodes and how do they enable service discovery? When to use ZooKeeper vs etcd vs Consul?
- **Visual**: comparisonTable for ZooKeeper vs etcd vs Consul, visualCard for znode types

### 4.5 Vector Databases Deep Dive (`vector-databases-deep-dive`)
- **Category**: `storage` (add to `systemDesignCategoryMap`)
- **Concepts**: Vector embeddings, similarity search (cosine, L2, dot product), ANN algorithms (HNSW, IVF, PQ), indexing strategies, hybrid search (vector + keyword), metadata filtering, embedding models, retrieval-augmented generation (RAG)
- **Key questions**: How does HNSW (Hierarchical Navigable Small World) work? When to use vector databases vs traditional search? How to combine vector search with metadata filtering? What are the trade-offs between different ANN algorithms?
- **Visual**: comparisonTable for Pinecone vs Weaviate vs Milvus vs pgvector, visualCard for ANN algorithm performance characteristics

### Implementation Steps for Topics:

1. Add all 5 IDs to `systemDesignCategoryMap` in `systemDesignTopics.js`
2. Append all 5 full topic objects to the `systemDesignTopics` array (before the closing `];`)
3. Each entry should include visual enhancement fields (`comparisonTables`, `visualCards`, etc.)

---

## Part 5: Visual/Diagram Enhancements

### 5.1 SVG Templates in DiagramSVG.jsx (14 new templates)

For each new problem, add a basic and advanced SVG template to the `diagrams` object in `DiagramSVG.jsx`. Follow the existing pattern using `Box`, `Arrow`, `Diamond`, `Label` helper components:

| Template Name | Problem |
|--------------|---------|
| `leetcodeJudge` + `leetcodeAdvanced` | LeetCode Online Judge |
| `stravaFitness` + `stravaAdvanced` | Strava Fitness |
| `onlineAuction` + `onlineAuctionAdvanced` | Online Auction |
| `fbLiveComments` + `fbLiveCommentsAdvanced` | FB Live Comments |
| `fbPostSearch` + `fbPostSearchAdvanced` | FB Post Search |
| `priceTracker` + `priceTrackerAdvanced` | Price Tracker |
| `youtubeTopK` + `youtubeTopKAdvanced` | YouTube Top K |

Each SVG should use `viewBox="0 0 420-500 180-280"` and the existing color palette from `COLORS`.

### 5.2 ASCII Architecture Diagrams

For problems that are complex enough, also include inline `architecture` strings in `basicImplementation` and `advancedImplementation` (see Ticketmaster as the reference). These are rendered as `<pre>` blocks when no `svgTemplate` is present.

**Recommendation**: Use both -- `svgTemplate` for the clean visual and `architecture` as a textual fallback that also serves as a detailed reference.

### 5.3 Static Diagram References (optional enhancement)

The `staticDiagrams` field can reference pre-generated PNG/SVG images from `/public/diagrams/`. Note that the `/public/diagrams/` directory does NOT currently exist. If static diagrams are desired:

1. Create `/public/diagrams/` directory structure
2. Generate diagrams using tools like Excalidraw, Eraser.io, or Mermaid
3. Reference in data as: `{ id, title, description, src: '/diagrams/problem-name/diagram.svg', type: 'architecture' }`

**For now, prioritize SVG templates and ASCII architecture diagrams** since these are self-contained and require no external asset management.

### 5.4 Visual Enhancements for New Topics

Each new technology topic should include these visual data fields:

- **comparisonTables**: At least 1 side-by-side comparison (e.g., Cassandra vs DynamoDB)
- **visualCards**: At least 1 bar-chart style card (e.g., consistency levels, latency numbers)
- **patternCards**: Where relevant, pattern cards showing when/how to use the technology
- **staticDiagrams**: Optional references to architecture diagrams

---

## Part 6: Implementation Sequence

### Phase 1: New Problems (largest content addition)
1. Update `extraSystemDesignProblemCategoryMap` with 7 new entries
2. Write all 7 problem entries with full field set
3. Add 14 SVG templates to `DiagramSVG.jsx`
4. Test that each problem renders correctly in the UI

### Phase 2: New Patterns
1. Add `applied` category to `systemDesignPatternCategories`
2. Update `systemDesignPatternCategoryMap` with 7 new entries
3. Write all 7 pattern entries with full field set
4. Verify rendering in the patterns section

### Phase 3: New Technology Topics
1. Update `systemDesignCategoryMap` with 5 new entries
2. Write all 5 topic entries with full field set including visual enhancements
3. Verify rendering in the topics section

### Phase 4: Visual Polish
1. Review all new entries for ASCII diagram quality
2. Ensure all `comparisonTables` and `visualCards` render correctly
3. Add `staticDiagrams` references if PNG/SVG assets are generated

---

## Part 7: Content Quality Guidelines

### Each new problem MUST include:
- 3-paragraph introduction explaining the system, core challenges, and what interviewers expect
- 5-8 functional requirements
- 5-6 non-functional requirements with specific numbers
- Estimation object with users, storage, bandwidth, qps
- 3-5 API endpoints with method, path, params, response
- Data model with 3-5 tables showing columns and types
- 3-4 key questions with detailed answers (use ASCII diagrams in answers)
- Basic implementation with issues/problems list
- Advanced implementation with key points
- 2-3 discussion point topics with 5 bullet points each
- 4-5 edge cases with scenario/impact/mitigation
- 3-4 tradeoffs with decision/pros/cons/recommendation
- 4 layered design entries

### Each new pattern MUST include:
- 6-8 concepts
- 5-6 interview tips
- 3-paragraph introduction
- 3-4 key questions with detailed code/diagram answers
- Data model description

### Each new topic MUST include:
- All fields from the topic schema
- At least 1 comparisonTable
- At least 1 visualCard
- 4-6 key questions with detailed answers
- Edge cases and tradeoffs arrays

---

## Part 8: Estimated Size of Changes

| File | Estimated New Lines | Current Lines |
|------|-------------------|---------------|
| `systemDesignProblemsExtra.js` | ~3,500 (7 problems x ~500 lines each) | 7,354 |
| `systemDesignPatterns.js` | ~1,750 (7 patterns x ~250 lines each) | 2,749 |
| `systemDesignTopics.js` | ~2,500 (5 topics x ~500 lines each) | 15,705 |
| `DiagramSVG.jsx` | ~700 (14 templates x ~50 lines each) | 2,739 |
| **Total** | **~8,450 new lines** | |

---

## Part 9: Risk Mitigation

1. **File size**: `systemDesignTopics.js` will grow to ~18K lines. If this causes performance issues, consider splitting into multiple files (e.g., `systemDesignTopicsAdvanced.js`) and importing/spreading in `DocsPage.jsx`.

2. **Duplicate content**: `youtube-top-k` overlaps with existing `top-k-leaderboard`. The new entry should reference the existing one and focus on YouTube-specific aspects (regional trending, time decay, manipulation detection).

3. **Category collisions**: New problems use existing categories where possible. Only `specialized` category gets new entries (LeetCode, Price Tracker).

4. **SVG template naming**: Use consistent camelCase naming matching the problem ID pattern (e.g., `onlineAuction`, not `online-auction`).

5. **Testing**: After each phase, verify by running the dev server and navigating to each new entry to confirm it renders without errors.

---

## Critical Files for Implementation

These are the files that must be modified, in order of priority:

1. `/Users/chundu/camora/apps/frontend/src/data/capra/topics/systemDesignProblemsExtra.js` — 7 new problems + category map updates
2. `/Users/chundu/camora/apps/frontend/src/data/capra/topics/systemDesignPatterns.js` — 7 new patterns + new category + category map
3. `/Users/chundu/camora/apps/frontend/src/data/capra/topics/systemDesignTopics.js` — 5 new technology topics + category map
4. `/Users/chundu/camora/apps/frontend/src/components/capra/features/DiagramSVG.jsx` — 14 new SVG diagram templates
5. `/Users/chundu/camora/apps/frontend/src/components/capra/docs/TopicDetail.jsx` — No changes needed (already renders all field types)
