// Real-Time System Design Problems

export const realtimeProblemCategories = [
  { id: 'realtime', name: 'Real-Time Systems', icon: 'zap', color: '#f59e0b' },
];

export const realtimeProblemCategoryMap = {
  'realtime-bidding': 'realtime',
  'live-sports-scoreboard': 'realtime',
  'event-stream-processing': 'realtime',
  'live-video-transcoding': 'realtime',
  'realtime-matchmaking': 'realtime',
  'iot-data-pipeline': 'realtime',
  'realtime-monitoring-alerting': 'realtime',
  'live-auction-platform': 'realtime',
  'realtime-presence': 'realtime',
  'realtime-geospatial-tracking': 'realtime',
};

export const realtimeDesigns = [
  {
    id: 'realtime-bidding',
    isNew: true,
    title: 'Real-Time Bidding Platform',
    subtitle: 'Google Ad Exchange / OpenRTB / AppNexus',
    icon: 'zap',
    color: '#f59e0b',
    difficulty: 'Hard',
    description: 'Design a programmatic advertising exchange where publishers auction ad impressions to thousands of bidders in under 100 milliseconds, processing billions of auctions daily.',

    introduction: `Real-time bidding is one of the most latency-sensitive distributed systems in existence. When a user loads a webpage, an entire auction involving hundreds of demand-side platforms (DSPs) must complete in under 100 milliseconds — including network round-trips, bid evaluation, auction mechanics, and ad serving. At scale, major exchanges process over 5 million auctions per second globally.

The system must implement the OpenRTB protocol standard, which defines how publishers (supply-side platforms) send bid requests and DSPs respond with bids. Every millisecond of latency costs revenue — DSPs that respond too slowly simply don't participate in that auction. The exchange must also filter invalid traffic (bots, click fraud) before the auction to protect advertisers.

Budget pacing is a critical operational challenge. An advertiser might have a $10,000 daily budget, but all their auctions occur in the first hour of the day if not controlled. The system must spread spend evenly while still winning competitive auctions, using token-bucket algorithms distributed across a global cluster.

Frequency capping, user targeting, and bid price prediction all require knowing who the user is across sites — a challenge made harder by increasing privacy restrictions (third-party cookie deprecation, iOS ATT). Modern RTB systems increasingly rely on contextual signals and privacy-preserving technologies like Google's Privacy Sandbox rather than individual user tracking.`,

    functionalRequirements: [
      'Receive bid requests from publishers via OpenRTB protocol and fan out to registered DSPs',
      'Collect bids from DSPs within a configurable timeout (typically 80-100ms)',
      'Run second-price auction and notify winner and losers',
      'Enforce frequency capping per user per campaign per time window',
      'Track and enforce daily/hourly budget pacing per advertiser campaign',
      'Filter invalid traffic (bots, click farms) before auction participation',
      'Serve winning creative to the publisher for display',
      'Record win/loss/click/conversion events for billing and reporting',
    ],

    nonFunctionalRequirements: [
      'Auction completion latency under 100ms end-to-end at p99',
      'Process at least 5 million auctions per second at peak',
      'DSP timeout rate under 5% (DSPs that respond too slowly are penalized)',
      'Billing accuracy within 0.1% — overbilling is a trust-destroying event',
      '99.99% availability — downtime means publisher revenue loss in real time',
      'Fraud detection must add less than 10ms to the auction pipeline',
    ],

    estimation: {
      users: '5M auctions/sec peak, each involving 200 DSPs = 1B outbound bid requests/sec',
      storage: '5M auctions/sec * 500 bytes * 86400 sec = ~200TB/day raw auction logs; aggregated reporting ~10TB/day',
      bandwidth: '5M auctions * 1KB bid request * 200 DSPs = 1TB/sec outbound; 5M * 50 DSPs responding * 200 bytes = ~50GB/sec inbound',
      qps: '5M auction decisions/sec; 1B DSP calls/sec fan-out; 500M win/loss notifications/sec',
    },

    apiDesign: {
      description: 'OpenRTB 2.6 compatible REST API for bid requests and management endpoints for campaign configuration',
      endpoints: [
        { method: 'POST', path: '/openrtb/2.6/auction', params: '{ id, imp[{id, banner/video, bidfloor}], site/app, user, device, at:2 }', response: '{ id, seatbid[{bid[{price, adid, adm, nurl, lurl}]}] }', description: 'Core OpenRTB bid request sent to each DSP; response is their bid or empty for no-bid' },
        { method: 'GET', path: '/win/${auction_id}/${bid_price}', params: 'Macro-substituted URL called by exchange to notify DSP of win', response: '200 OK', description: 'Win notification URL (nurl) — exchange calls this when DSP wins' },
        { method: 'POST', path: '/api/v1/campaigns', params: '{ advertiser_id, name, daily_budget_cents, start_date, end_date, targeting, creatives[] }', response: '{ campaign_id, status }', description: 'Create or update an advertiser campaign with targeting criteria and budget' },
        { method: 'GET', path: '/api/v1/reports/spend', params: 'campaign_id, date_from, date_to, granularity=hour', response: '{ rows[{date, impressions, clicks, spend_cents, ecpm}] }', description: 'Campaign performance and spend reporting' },
        { method: 'POST', path: '/api/v1/dsps', params: '{ name, endpoint_url, qps_limit, timeout_ms, seat_id }', response: '{ dsp_id, status }', description: 'Register a new demand-side platform bidder' },
      ],
    },

    dataModel: {
      description: 'Auction logs, campaign configuration, budget pacing state, and frequency cap counters',
      schema: `auctions {
  id: uuid PK
  timestamp: timestamp
  publisher_id: bigint FK
  user_id: varchar(64) nullable  -- hashed/anonymized
  winning_dsp_id: bigint FK nullable
  winning_bid_price_micros: bigint
  clearing_price_micros: bigint  -- second price paid
  floor_price_micros: bigint
  creative_id: bigint FK nullable
  imp_count: int
  duration_ms: int
  ivt_filtered: boolean
}

campaigns {
  id: bigint PK
  advertiser_id: bigint FK
  name: varchar(200)
  daily_budget_cents: bigint
  total_budget_cents: bigint
  start_date: date
  end_date: date
  targeting: jsonb  -- geo, device, audience segments
  status: enum(active, paused, completed, exhausted)
  created_at: timestamp
}

budget_pacing {
  campaign_id: bigint PK
  date: date PK
  total_budget_cents: bigint
  spent_cents: bigint  -- updated via atomic increment
  target_hourly_rate: bigint  -- recomputed each hour
  last_updated: timestamp
  -- Stored in Redis for sub-ms access; synced to DB every minute
}

frequency_caps {
  user_id: varchar(64)
  campaign_id: bigint
  window_start: timestamp
  impression_count: int
  -- Stored in Redis with TTL matching the cap window
  PRIMARY KEY (user_id, campaign_id, window_start)
}`,
      examples: [
        { table: 'auctions', label: 'Completed display auction', json: '{ "id": "auc-7f3a2b1c", "timestamp": "2025-04-18T14:32:01.234Z", "publisher_id": 10291, "user_id": "u_h8d2k9m3", "winning_dsp_id": 42, "winning_bid_price_micros": 2500000, "clearing_price_micros": 2200000, "floor_price_micros": 1000000, "duration_ms": 67, "ivt_filtered": false }' },
        { table: 'campaigns', label: 'Active retargeting campaign', json: '{ "id": 80012, "advertiser_id": 5500, "name": "Summer Sale Retargeting", "daily_budget_cents": 500000, "start_date": "2025-04-01", "end_date": "2025-06-30", "targeting": {"geo": ["US", "CA"], "device": ["mobile"], "segments": ["cart_abandoners"]}, "status": "active" }' },
        { table: 'budget_pacing', label: 'Mid-day pacing state', json: '{ "campaign_id": 80012, "date": "2025-04-18", "total_budget_cents": 500000, "spent_cents": 210000, "target_hourly_rate": 20833 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single auction server receives bid requests, fans out HTTP calls to all DSPs synchronously, waits for all responses, runs the auction, and returns the winner. Budget and frequency state are stored in a central database queried on every auction.',
      problems: [
        'Synchronous fan-out to 200 DSPs with 80ms timeout means the server holds 200 open connections per auction — does not scale past a few thousand auctions per second',
        'Querying the database for budget and frequency state on every auction adds 5-10ms of latency and creates a database hotspot',
        'No fraud filtering means bots can burn advertiser budgets without delivering real impressions',
        'No budget pacing means a campaign with a $10K daily budget can exhaust it in the first few minutes of the day',
        'A single auction server is a single point of failure with no geographic distribution',
      ],
    },

    advancedImplementation: {
      title: 'Globally Distributed Auction Engine with Redis Pacing and Async Fan-out',
      description: 'Auction servers run in every major region. Fan-out uses async HTTP/2 multiplexing with per-DSP connection pools. Budget state and frequency caps live in Redis with atomic increments. Invalid traffic filtering runs as a pre-auction sidecar. Budget pacing uses a distributed token bucket replenished by a background pacing controller.',
      keyPoints: [
        'Async HTTP/2 fan-out: single connection per DSP with multiplexed streams — 200 concurrent bid requests per auction over a handful of connections, not 200 separate TCP connections',
        'Redis atomic INCR for frequency caps: INCR user:{id}:campaign:{id}:{window} with TTL — sub-millisecond, no race conditions, auto-expiry',
        'Distributed token bucket pacing: each auction server holds a local token bucket; a global pacing controller replenishes tokens across all servers every 100ms based on remaining daily budget and time remaining',
        'Pre-auction IVT scoring: device fingerprint + behavioral signals scored by a gradient-boosted model in <5ms; suspicious impressions filtered before fan-out',
        'Second-price sealed-bid auction: all DSPs bid without seeing others bids; winner pays one cent above the second-highest bid, which gives DSPs the incentive to bid their true value',
        'Geo-distributed deployment: auction servers colocated with major publisher data centers; DSPs register region-specific endpoints to minimize network round-trip in the 80ms budget',
        'Win/loss notification via pixel or server-side call: win URL (nurl) called asynchronously after auction decision, decoupled from the latency-critical auction path',
      ],
      databaseChoice: 'Redis Cluster for budget pacing (atomic INCRBY, TTL-based frequency caps, DSP blocklists); Kafka for auction event streaming to analytics; ClickHouse for real-time spend and performance reporting; PostgreSQL for campaign configuration, advertiser accounts, and DSP registry; S3 for raw auction log archival',
      caching: 'Campaign targeting criteria and bid floors cached in-process on auction servers (refreshed every 30s); DSP endpoint registry cached in Redis (updated on config change); User segment lookups cached with 5-minute TTL; frequency cap counters stored entirely in Redis (no DB fallback needed — eventual consistency on failure is acceptable)',
    },

    tips: [
      'Scope the problem: focus on the exchange (SSP side) — DSPs are external systems, treat them as black boxes that respond to bid requests',
      'The 100ms budget is the most important constraint — trace through each step: network to DSP, DSP processing, network back, auction logic',
      'Second-price auction is the standard — explain that it gives DSPs the incentive to bid their true value without needing to guess what others will bid',
      'Budget pacing is often overlooked — interviewers love it because it requires distributed rate limiting and involves business logic, not just infrastructure',
      'Discuss OpenRTB as the standard protocol — knowing the industry standard shows real-world awareness',
      'IVT filtering is critical context: advertisers pay for real human impressions; bot traffic is a major industry problem',
      'Frequency capping is a Redis-natural problem: mention INCR with TTL as the implementation',
    ],

    keyQuestions: [
      {
        question: 'How does second-price auction work and why is it used instead of first-price?',
        answer: `**Second-Price (Vickrey) Auction**:
- All DSPs submit sealed bids simultaneously (they cannot see each other's bids)
- The highest bidder wins
- The winner pays the second-highest bid price (plus one cent), not their own bid

**Example**:
\`\`\`
DSP A bids: $2.50
DSP B bids: $2.20
DSP C bids: $1.80

Winner: DSP A
Price paid: $2.21 (second-highest + $0.01)
\`\`\`

**Why Second-Price?**
- Dominant strategy: each DSP's optimal strategy is to bid exactly what the impression is worth to them
- No need to guess competitors' bids or shade bids downward
- Results in more efficient price discovery — DSPs don't waste resources on bid shading algorithms
- Widely understood and trusted by the industry

**First-Price Auction**:
- Winner pays their own bid price
- DSPs must shade their bids down to avoid overpaying
- Requires sophisticated bid optimization to avoid "winner's curse"
- CTV and some mobile exchanges have moved to first-price, but web display remains largely second-price`,
      },
      {
        question: 'How do you pace an advertiser budget evenly across a day without over- or under-spending?',
        answer: `**The Pacing Problem**:
- $10,000 daily budget, auction rate varies by time of day (peak 9am-9pm)
- Naive approach: spend freely until budget exhausted → all money gone by 8am
- Goal: spend proportionally to time remaining and expected traffic

**Distributed Token Bucket Approach**:
\`\`\`
Global Pacing Controller (runs every 100ms):
  remaining_budget = daily_budget - total_spent (from Redis)
  remaining_time_fraction = seconds_remaining_today / 86400
  target_remaining_spend = remaining_budget * smoothing_factor

  tokens_per_server = target_remaining_spend / server_count / 10
  SETEX campaign:{id}:tokens {tokens_per_server} 100ms TTL (per server)
\`\`\`

**At Auction Time (per auction server)**:
\`\`\`
tokens = DECR campaign:{id}:tokens
if tokens < 0:
  skip this campaign (pacing suppression)
else:
  include campaign in auction, bid normally
\`\`\`

**Smoothing**:
- Target 90% of ideal spend rate — keeps 10% reserve for high-value opportunities
- Adjust every minute based on actual vs ideal cumulative spend curve
- Accelerate if behind target (e.g. campaign started late), decelerate if ahead

**Result**: spend follows a smooth curve across 24 hours, finishing within 2-5% of budget`,
      },
      {
        question: 'How do you make a bidding decision in under 100ms end-to-end?',
        answer: `**Latency Budget Breakdown** (total: 80ms for DSP timeout):
\`\`\`
Publisher → Exchange:          5ms  (network, nearby data center)
Pre-auction IVT check:         3ms  (in-process ML model)
Budget/frequency lookup:       1ms  (Redis, same data center)
Fan-out bid requests:          0ms  (async, overlaps with timeout wait)
Waiting for DSP responses:    70ms  (the timeout window)
Auction logic + winner select: 1ms  (in-process, trivial)
Exchange → Publisher:          5ms  (network)
Total:                        85ms
\`\`\`

**Key Optimizations**:
- **Connection pooling**: maintain persistent HTTP/2 connections to each DSP, eliminating TCP handshake overhead on every auction
- **Async fan-out**: send all bid requests simultaneously, not sequentially. Do not wait for one DSP before sending to the next
- **Partial results**: collect bids as they arrive; run auction immediately at timeout even if some DSPs haven't responded yet. Late bids are discarded
- **In-process state**: budget tokens and frequency cap results pre-loaded into memory where possible; avoid remote calls on the critical path
- **Co-location**: auction servers deployed in same data center as publisher ad servers — network hop to publisher is <1ms`,
      },
    ],

    keyDecisions: [
      'Second-price vs first-price auction — chose second-price because it produces honest bidding without requiring DSPs to implement bid shading, and it is the dominant standard for web display',
      'Async HTTP/2 fan-out vs synchronous HTTP/1.1 per DSP — chose async HTTP/2 because it multiplexes 200 requests over a handful of connections, reducing both latency and file descriptor overhead dramatically',
      'Redis for budget and frequency state vs PostgreSQL — chose Redis because atomic INCR operations at sub-millisecond latency are critical; PostgreSQL row-level locking would add 5-10ms per auction',
      'Distributed token bucket vs centralized pacing controller — chose distributed bucket replenished by a lightweight controller because it keeps budget decisions in-process on each auction server, avoiding a remote call on the critical path',
      'Pre-auction IVT filtering vs post-auction filtering — chose pre-auction to avoid charging advertisers for fraudulent impressions and to protect DSP budgets from bot traffic',
      'DSP-level timeout vs global timeout — chose per-DSP timeout because slow DSPs should not delay the auction for all other bidders; each DSP has its own SLA tracked and enforced independently',
    ],
  },

  {
    id: 'live-sports-scoreboard',
    isNew: true,
    title: 'Live Sports Scoreboard',
    subtitle: 'ESPN / ESPN+ / Yahoo Sports Real-Time Scores',
    icon: 'zap',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a system that ingests live sports event data and pushes score updates to millions of concurrent users with sub-second latency.',

    introduction: `Live sports scores feel simple but represent a classic fan-out problem at massive scale. A single game-winning goal at the World Cup can trigger 50 million simultaneous score updates. The gap between receiving the event data and displaying it to all fans must be under one second, or social media will break the news before the app does.

Data comes from multiple sources — official league data feeds, automated tracking systems, and manual data entry operators at venues. These sources may conflict (two feeds report different scores) and the system must apply deterministic conflict resolution rather than letting inconsistent states propagate to users.

Fantasy sports adds a secondary real-time requirement: score updates must also trigger fantasy point recalculations for tens of millions of active lineups simultaneously. A touchdown is not just a score update — it may change thousands of fantasy matchup outcomes in real time.

The thundering herd at game start is a distinct scaling challenge. Traffic is flat before kickoff, then spikes 1000x the moment the game begins as millions of fans open the app simultaneously. Pre-warming and staged admission are required to avoid cascade failure.`,

    functionalRequirements: [
      'Ingest live event data from official league feeds, automated tracking systems, and venue operators',
      'Resolve conflicts when multiple data sources report different scores for the same event',
      'Push score updates to all subscribed clients within one second of ingestion',
      'Support millions of concurrent WebSocket or SSE connections per game',
      'Send mobile push notifications for key events such as touchdowns, goals, and game-ending plays',
      'Provide play-by-play historical storage accessible after the game ends',
      'Support real-time fantasy sports point updates triggered by scoring events',
      'Display live lineups, statistics, and standings alongside scores',
    ],

    nonFunctionalRequirements: [
      'Score update delivery under 1 second from data ingestion at p95',
      'Support 50 million concurrent users across all active games during peak events',
      'System must handle a 1000x traffic spike at game start without degradation',
      '99.99% availability — sports fans do not forgive outages during major events',
      'Message ordering must be guaranteed — a score cannot temporarily decrease then increase due to out-of-order delivery',
      'Mobile push notification delivery under 5 seconds for high-priority events',
    ],

    estimation: {
      users: '50M concurrent users during peak events; 5M per individual major game',
      storage: '500 score events per game * 100K games per year * 10KB per event = 500GB/year for play-by-play; 50M users * 200 bytes connection state = 10GB RAM for connection state',
      bandwidth: '5M users * 200 bytes per update * 0.1 updates/sec = 100MB/sec outbound per game; 50 games simultaneously = 5GB/sec peak',
      qps: '10 score events/sec per game * 5000 concurrent games = 50K ingest events/sec; 5M subscribers per game * 0.1 events/sec = 500K WebSocket messages/sec per game',
    },

    apiDesign: {
      description: 'WebSocket connections for real-time score streaming, REST endpoints for game metadata and historical data',
      endpoints: [
        { method: 'GET', path: '/api/v1/games/{game_id}/stream', params: 'WebSocket upgrade; sends score update JSON messages as events occur', response: '{ type: "score_update", game_id, home_score, away_score, clock, period, event_description, timestamp }', description: 'WebSocket endpoint for real-time score streaming; client subscribes and receives push updates' },
        { method: 'GET', path: '/api/v1/games/{game_id}', params: '', response: '{ game_id, home_team, away_team, home_score, away_score, status, clock, period, venue, start_time }', description: 'Current game state snapshot for initial page load' },
        { method: 'GET', path: '/api/v1/games/{game_id}/plays', params: 'cursor?, limit=50', response: '{ plays[{id, timestamp, description, score_home, score_away, team, player}], next_cursor }', description: 'Paginated play-by-play history' },
        { method: 'GET', path: '/api/v1/scoreboard', params: 'sport?, date?', response: '{ games[{game_id, home, away, scores, status, start_time}] }', description: 'All games for a given sport and date, used for the scoreboard overview page' },
        { method: 'POST', path: '/internal/ingest/event', params: '{ source_id, game_id, event_type, payload, source_timestamp }', response: '{ event_id, accepted }', description: 'Internal endpoint for data source operators to push events; not exposed publicly' },
      ],
    },

    dataModel: {
      description: 'Game state, play-by-play events, and subscriptions stored in a combination of Redis for live state and PostgreSQL for historical records',
      schema: `games {
  id: bigint PK
  sport: varchar(50)
  home_team_id: bigint FK
  away_team_id: bigint FK
  home_score: int
  away_score: int
  status: enum(scheduled, in_progress, final, postponed)
  period: int
  clock: varchar(10)
  venue_id: bigint FK
  start_time: timestamp
  end_time: timestamp nullable
  updated_at: timestamp
}

plays {
  id: bigint PK (auto-increment, monotonic)
  game_id: bigint FK
  play_number: int
  event_type: varchar(50)  -- touchdown, field_goal, goal, penalty, etc.
  description: text
  home_score_after: int
  away_score_after: int
  period: int
  clock: varchar(10)
  team_id: bigint FK nullable
  player_id: bigint FK nullable
  source_id: int  -- which data feed provided this
  source_timestamp: timestamp
  created_at: timestamp
}

data_sources {
  id: int PK
  game_id: bigint FK
  name: varchar(100)
  priority: int  -- lower = higher priority; used for conflict resolution
  last_event_at: timestamp
  lag_ms: int
}`,
      examples: [
        { table: 'plays', label: 'Touchdown event', json: '{ "id": 8820341, "game_id": 9901, "play_number": 47, "event_type": "touchdown", "description": "Patrick Mahomes 12-yard rushing touchdown", "home_score_after": 21, "away_score_after": 14, "period": 3, "clock": "7:42", "team_id": 301, "player_id": 15, "source_id": 1, "source_timestamp": "2025-02-09T21:14:08Z" }' },
        { table: 'games', label: 'In-progress NFL game', json: '{ "id": 9901, "sport": "NFL", "home_team_id": 301, "away_team_id": 302, "home_score": 21, "away_score": 14, "status": "in_progress", "period": 3, "clock": "7:42", "start_time": "2025-02-09T18:30:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single ingest server receives events from data feeds, updates the games table in PostgreSQL, and long-polling clients re-fetch scores every 5 seconds.',
      problems: [
        'Long-polling every 5 seconds means users see stale scores for up to 5 seconds, which is unacceptable for live sports',
        'All 5 million users polling the same PostgreSQL row creates massive read load — database becomes a bottleneck immediately',
        'No conflict resolution: if two data feeds send different scores, the last write wins regardless of which source is more accurate',
        'No thundering herd mitigation: when kickoff occurs and 5 million users open the app simultaneously, the servers crash under the spike',
        'Fantasy point updates are not implemented — they would require querying millions of lineup records on each scoring event',
      ],
    },

    advancedImplementation: {
      title: 'Fan-Out Pub/Sub Architecture with Differential WebSocket Updates',
      description: 'Ingested events flow through a conflict-resolution layer into Kafka. WebSocket gateway servers subscribe to Kafka topics per game and push differential updates only to connected clients. Redis stores the current game state for fast initial page loads. Fantasy updates run as a separate consumer group on the same Kafka stream.',
      keyPoints: [
        'Conflict resolution at ingest: events from multiple sources are deduplicated by play_number and resolved by source priority — the official league feed wins over automated tracking, which wins over manual entry',
        'Kafka topic per sport/game: each game has its own Kafka topic partition, giving isolated fan-out and replay capability for late-joining clients',
        'WebSocket gateway fan-out: each gateway server maintains 50K-200K persistent connections; it subscribes to Kafka topics for its clients games and pushes events as they arrive — no polling',
        'Differential updates: only changed fields are sent over WebSocket (score changed from 14 to 21, clock changed to 7:42), not the full game state — reduces bandwidth by 10x',
        'Redis for initial state: when a client connects, the current game state is served from Redis (updated on every event), not from PostgreSQL — sub-millisecond response',
        'Pre-warming for thundering herd: WebSocket servers are auto-scaled 10 minutes before scheduled game start based on registered user interest; connection admission is rate-limited at kickoff to prevent simultaneous flood',
        'Fantasy consumer group: a separate Kafka consumer group reads scoring events and triggers batch lineup recalculation using a scoring rules engine, fan-outing fantasy score updates to a separate WebSocket channel',
      ],
      databaseChoice: 'Redis for current game state and WebSocket connection metadata (TTL-based cleanup); Kafka for event streaming and replay; PostgreSQL for play-by-play history, team/player records, and game schedules; ClickHouse for post-game analytics and historical statistics; APNs/FCM for mobile push notifications via an async notification queue',
      caching: 'Current game state in Redis (updated on every event, sub-1ms reads); game schedule and team data cached in application servers (refreshed every 5 minutes); scoreboard overview cached with 1-second TTL behind CDN; play-by-play history paginated from PostgreSQL with cursor-based caching',
    },

    tips: [
      'Start by establishing the fan-out problem clearly: one event must reach millions of clients — this is the core challenge',
      'WebSocket vs SSE vs long-polling: WebSocket is preferred for bidirectional and high-frequency updates; SSE is simpler for one-directional streams; long-polling is a fallback for restricted environments',
      'Conflict resolution is a great detail to add: data comes from multiple sources and they disagree — mention priority-based resolution by source reliability',
      'The thundering herd at kickoff is a common follow-up — discuss pre-warming, connection admission rate limiting, and staged rollout',
      'Mention that fantasy updates are a separate consumer on the same event stream — it shows you understand the decoupling benefit of a pub/sub architecture',
      'Push vs pull: explain why push (WebSocket/SSE) is better than pull (polling) for this use case in terms of latency and server load',
    ],

    keyQuestions: [
      {
        question: 'How do you push score updates to 50 million concurrent users with under 1 second latency?',
        answer: `**Architecture: Pub/Sub Fan-Out**
\`\`\`
Data Feed → Ingest Service → Kafka Topic (per game)
                                    ↓
              WebSocket Gateway 1 (500K connections)
              WebSocket Gateway 2 (500K connections)
              ...
              WebSocket Gateway 100 (500K connections)
              Each gateway subscribes to Kafka, pushes to connected clients
\`\`\`

**Latency Budget**:
- Data feed → ingest server: ~50ms (varies by source)
- Ingest → Kafka: <5ms
- Kafka → WebSocket gateway consumer: <10ms
- Gateway → client WebSocket push: <5ms
- Total: ~70ms (well under 1 second)

**Scaling the Gateways**:
- Each WebSocket gateway maintains 200K–500K persistent connections
- 50M users / 300K per gateway = ~167 gateway servers needed for a peak event
- Gateways are stateless except for connection state — they subscribe to Kafka and push; no cross-gateway coordination needed
- Each gateway subscribes only to Kafka topics for games its connected clients are watching

**Connection Management**:
- Clients reconnect automatically on disconnect with exponential backoff
- Gateway sends a heartbeat ping every 30 seconds; closes connections that miss 2 pings
- New connections get the current game state from Redis, then switch to WebSocket push for subsequent updates`,
      },
      {
        question: 'How do you handle conflicting data from multiple sources reporting different scores?',
        answer: `**The Problem**:
- Official NFL data feed (priority 1) reports score as 21-14
- Automated tracking system (priority 2) reports 20-14 (processing lag)
- Manual entry operator (priority 3) reports 21-13 (typo)
- Without conflict resolution, the last write wins — users see score flickering

**Resolution Approach: Source Priority + Play Number Deduplication**

\`\`\`
For each incoming event:
  1. Check if play_number already exists for this game
  2. If yes: compare source priorities
     - New event source priority < existing? Reject (lower number = higher priority)
     - New event source priority > existing? Accept as correction
     - Same source? Accept (update with newer data)
  3. If no: insert and publish to Kafka immediately

Conflict log: always record all received events with source and resolution outcome
\`\`\`

**Source Priority Tiers**:
- Priority 1: Official league data feed (contractually authoritative)
- Priority 2: Stadium automated tracking (accurate but can lag)
- Priority 3: Broadcast network feed (accurate, moderate lag)
- Priority 4: Manual data entry operators (fallback when all else fails)

**Score Decrease Prevention**:
- Scores can only increase (no sport un-scores a goal after the fact, except penalty reversal)
- If a new event would decrease a score and is from a lower-priority source, reject it as a conflict
- Surface conflicts to a human operator dashboard for manual review`,
      },
      {
        question: 'How do you handle the 1000x traffic spike when a major game kicks off?',
        answer: `**The Thundering Herd Pattern**:
- At T-0 (kickoff), 5 million users simultaneously open the app
- All request the game state, attempt WebSocket connection, and load team rosters
- Without mitigation: CDN miss storm → origin overload → cascading failure

**Strategies**:

**Pre-warming (before kickoff)**:
- Auto-scale WebSocket gateways 15 minutes before scheduled start based on RSVP/notification opt-in counts
- Cache game state, rosters, and lineups in Redis and CDN before kickoff
- Prime database read replicas by warming connection pools

**Staged Connection Admission**:
\`\`\`
T-5 min: open WebSocket connections for premium tier users
T-2 min: open connections for all users (connection pool pre-warmed)
T-0:     new connection rate limited to 100K/sec (not all 5M at once)
         overflow: queue clients with an estimated wait time
\`\`\`

**CDN for Static Content**:
- Team logos, player photos, stadium images: 100% CDN-cached
- Current game state: CDN with 1-second TTL for the first snapshot; WebSocket delivers updates after

**Circuit Breakers**:
- If connection rate exceeds capacity, return a 503 with Retry-After header instead of hanging
- Clients implement exponential backoff — spread the reconnect storm over 30 seconds instead of all at once`,
      },
    ],

    keyDecisions: [
      'WebSocket vs SSE vs polling — chose WebSocket for bidirectional capability and lower overhead at scale; SSE would also work but WebSocket is more standard for sports apps that need bidirectional control messages',
      'Kafka vs direct pub/sub (Redis Pub/Sub) — chose Kafka because it provides replay capability for late-joining clients, persistent storage of the event stream, and decoupled consumer groups for fantasy updates',
      'Per-game Kafka topic vs single topic with game_id field — chose per-game topic because it isolates game traffic, allows independent retention policies, and lets gateways subscribe only to relevant games',
      'Redis for current game state vs reading from Kafka on connect — chose Redis because new connections need the current state instantly; replaying the Kafka log from game start would add seconds of latency',
      'Priority-based conflict resolution vs last-write-wins — chose priority-based because the official league feed is contractually authoritative; last-write-wins would allow lower-quality sources to overwrite correct data',
    ],
  },

  {
    id: 'event-stream-processing',
    isNew: true,
    title: 'Real-Time Event Stream Processing',
    subtitle: 'Apache Flink / Kafka Streams / Spark Streaming Pipeline',
    icon: 'server',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design a distributed stream processing system that ingests millions of events per second, applies real-time transformations and aggregations, and delivers results to downstream consumers with exactly-once guarantees.',

    introduction: `Stream processing systems power some of the most critical real-time pipelines in modern infrastructure — fraud detection, user activity analytics, recommendation feature computation, and real-time dashboards. Unlike batch processing where you run a job over a fixed dataset, stream processing handles an unbounded stream of events as they arrive, with sub-second latency requirements.

The fundamental challenge is balancing correctness with latency. Exactly-once semantics — ensuring each event is processed precisely once even during failures — requires careful coordination between the processing framework, the message broker, and the output sinks. Achieving this without sacrificing throughput requires transactional producers, idempotent consumers, and coordinated checkpointing.

Late-arriving events are an inherent property of distributed systems. Network delays, device clock skew, and mobile apps that come online after being offline all produce events that arrive out of order. Windowing operations (count clicks per minute) must handle late events gracefully without either dropping them or holding windows open indefinitely.

State management is the hardest operational problem. A fraud detection job that counts transactions per user per hour must maintain state for millions of users. This state must be durable (survives task failures), scalable (distributed across many nodes), and fast (sub-millisecond access to make real-time decisions).`,

    functionalRequirements: [
      'Ingest events from Kafka topics at millions of events per second',
      'Apply stateless transformations such as filtering, mapping, and enrichment from external lookups',
      'Apply stateful aggregations with time windows including tumbling, sliding, and session windows',
      'Handle late-arriving events based on configurable watermark policies',
      'Write results to output sinks including Kafka, databases, and object storage',
      'Provide exactly-once processing semantics across failure and recovery scenarios',
      'Support schema evolution without pipeline downtime',
      'Expose monitoring metrics including lag, throughput, and processing latency',
    ],

    nonFunctionalRequirements: [
      'End-to-end processing latency under 500ms for real-time use cases at p95',
      'Throughput of at least 1 million events per second per pipeline on standard hardware',
      'Recovery from a node failure within 30 seconds without data loss or duplication',
      'State store access latency under 1ms for keyed lookups during processing',
      'Support pipelines with state measured in terabytes for large user bases',
      'Zero data loss guarantee on failure — no events dropped, duplicates handled by exactly-once semantics',
    ],

    estimation: {
      users: '1M events/sec per pipeline; 10 concurrent pipelines = 10M events/sec total',
      storage: '1M events/sec * 1KB/event * 86400 sec = ~86TB/day raw; state store 100 bytes/key * 100M unique keys = ~10GB per pipeline',
      bandwidth: '1M events/sec * 1KB = 1GB/sec inbound per pipeline; output ~200MB/sec (aggregated)',
      qps: '1M event reads/sec from Kafka; 100K state store operations/sec; 10K sink writes/sec (aggregated batches)',
    },

    apiDesign: {
      description: 'Pipeline management REST API for deploying, monitoring, and managing stream processing jobs',
      endpoints: [
        { method: 'POST', path: '/api/v1/pipelines', params: '{ name, source_topic, sink_config, transformations[], window_spec, parallelism }', response: '{ pipeline_id, status, submit_time }', description: 'Deploy a new stream processing pipeline from a declarative specification' },
        { method: 'GET', path: '/api/v1/pipelines/{pipeline_id}/metrics', params: '', response: '{ lag_ms, events_per_sec, records_in, records_out, checkpoints[{id, duration_ms, status}] }', description: 'Real-time metrics for a running pipeline' },
        { method: 'POST', path: '/api/v1/pipelines/{pipeline_id}/savepoint', params: '{ target_path }', response: '{ savepoint_path, status }', description: 'Trigger a savepoint for zero-downtime upgrades or manual recovery' },
        { method: 'GET', path: '/api/v1/pipelines/{pipeline_id}/lag', params: '', response: '{ topic_partition_lag[{partition, consumer_offset, log_end_offset, lag}] }', description: 'Consumer lag per partition — key operational metric for detecting pipeline slowdown' },
        { method: 'DELETE', path: '/api/v1/pipelines/{pipeline_id}', params: '{ with_savepoint: bool }', response: '{ status, savepoint_path? }', description: 'Stop a pipeline, optionally creating a savepoint for future resume' },
      ],
    },

    dataModel: {
      description: 'Pipeline configuration, checkpoint metadata, and job state tracked in a control plane database; actual event data flows through Kafka and state stores',
      schema: `pipelines {
  id: uuid PK
  name: varchar(200)
  spec: jsonb  -- full pipeline DAG specification
  status: enum(deploying, running, paused, failed, cancelled)
  parallelism: int
  created_at: timestamp
  updated_at: timestamp
}

checkpoints {
  id: bigint PK
  pipeline_id: uuid FK
  checkpoint_id: bigint  -- Flink internal checkpoint sequence number
  status: enum(in_progress, completed, failed, expired)
  state_size_bytes: bigint
  duration_ms: int
  triggered_at: timestamp
  completed_at: timestamp nullable
  storage_path: varchar(500)
}

pipeline_metrics {
  pipeline_id: uuid FK
  collected_at: timestamp
  events_in_per_sec: bigint
  events_out_per_sec: bigint
  processing_lag_ms: int
  consumer_lag_records: bigint
  active_task_count: int
  -- Partitioned by collected_at (hourly)
  PRIMARY KEY (pipeline_id, collected_at)
}`,
      examples: [
        { table: 'pipelines', label: 'Active fraud detection pipeline', json: '{ "id": "pipe-a1b2c3d4", "name": "fraud-detection-v3", "status": "running", "parallelism": 32, "spec": {"source": "transactions", "window": {"type": "sliding", "size_ms": 3600000, "slide_ms": 60000}, "aggregations": ["count_by_user", "sum_by_merchant"], "sink": "fraud-scores"} }' },
        { table: 'checkpoints', label: 'Recent completed checkpoint', json: '{ "id": 8820, "pipeline_id": "pipe-a1b2c3d4", "checkpoint_id": 44201, "status": "completed", "state_size_bytes": 8589934592, "duration_ms": 3200, "triggered_at": "2025-04-18T10:00:00Z", "completed_at": "2025-04-18T10:00:03.2Z", "storage_path": "s3://checkpoints/pipe-a1b2c3d4/44201" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single consumer process reads from Kafka, applies transformations in memory using Python or Java code, and writes results to a database. State is stored in the database and queried on each event.',
      problems: [
        'Single process is a single point of failure — any crash loses the current processing state and requires reprocessing from last committed Kafka offset',
        'State stored in a remote database adds 5-10ms latency per event for keyed lookups — unacceptable at 1M events/sec',
        'No windowing support — aggregating over time windows requires custom timer logic that is error-prone and hard to scale',
        'Late-arriving events are silently dropped or cause incorrect aggregate results because there is no watermark mechanism',
        'At-least-once processing with manual deduplication at the sink is fragile — duplicates appear during failures and are hard to detect',
      ],
    },

    advancedImplementation: {
      title: 'Apache Flink with RocksDB State Backend, Exactly-Once Transactions, and Watermark-Based Windowing',
      description: 'Flink jobs run as distributed dataflow graphs with operator parallelism up to hundreds of tasks. State is stored in embedded RocksDB instances local to each task manager, avoiding network calls for state access. Checkpoints use Chandy-Lamport distributed snapshots to create consistent state snapshots without pausing processing. Exactly-once is achieved by combining Flink transactional sinks (two-phase commit) with idempotent Kafka producers.',
      keyPoints: [
        'RocksDB state backend: each Flink task manager holds a local RocksDB instance for keyed state — sub-millisecond reads/writes without network hops; state is checkpointed asynchronously to S3 for durability',
        'Chandy-Lamport checkpointing: barriers injected into the Kafka stream flow through the operator DAG; when all operators have received barriers, a consistent global snapshot is taken — no processing pause required',
        'Exactly-once with two-phase commit: Flink sinks (e.g., Kafka sink) use a pre-commit / commit protocol tied to checkpoint completion — results are written to a staging area and committed only after the checkpoint succeeds, preventing partial outputs on failure',
        'Watermark-based windowing: each event carries an event timestamp; Flink tracks the maximum observed timestamp per partition as the watermark, triggering windows when watermark exceeds window_end — late events (within configured allowance) are re-processed; beyond allowance they are counted in a side output',
        'Incremental checkpointing: only changed RocksDB SST files are uploaded to S3 on each checkpoint, not the full state — reduces checkpoint duration from minutes to seconds for terabyte-scale state',
        'Backpressure propagation: if a downstream operator is slow, Flink propagates backpressure upstream via TCP buffer pressure — Kafka consumers automatically slow down, preventing unbounded queue growth',
        'Schema Registry integration: Avro schemas registered in Confluent Schema Registry; deserialization uses schema ID in message header for forward-compatible schema evolution without pipeline restarts',
      ],
      databaseChoice: 'Apache Kafka as the event backbone (source and sink); RocksDB embedded in Flink task managers for local state; S3 or HDFS for checkpoint storage; ClickHouse or Apache Pinot as the real-time OLAP sink for dashboards; PostgreSQL for pipeline metadata and job configuration; Prometheus + Grafana for operational metrics',
      caching: 'RocksDB block cache (in-process, configurable size) for hot state keys — frequently accessed user keys such as high-volume accounts stay in memory; Bloom filters in RocksDB skip disk reads for keys that do not exist in state; external lookup cache (Guava LoadingCache) for enrichment data such as user profiles and merchant categories — refreshed every 5 minutes',
    },

    tips: [
      'Distinguish event time from processing time: event time is when the event actually occurred (embedded in the event); processing time is when Flink processes it — windowing should always use event time for correctness',
      'Watermarks are the most common interview follow-up: explain that a watermark is the maximum event time seen so far, minus a configured allowance for late arrivals',
      'Exactly-once is more complex than at-least-once — explain the two-phase commit protocol between the checkpoint and the sink commit',
      'State backend choice is important: in-memory is fast but limited by RAM; RocksDB can hold terabytes of state but adds a serialization overhead',
      'Mention the operational challenges: checkpoints that take too long indicate state growth or slow I/O; consumer lag indicates the pipeline cannot keep up with ingestion rate',
      'Backpressure is a sign of a healthy system: Flink slowing Kafka consumption is better than building an unbounded in-memory queue that causes OOM',
    ],

    keyQuestions: [
      {
        question: 'How do windowing functions work and how do you handle late-arriving events?',
        answer: `**Window Types**:
\`\`\`
Tumbling Window (size=1hr):
  [12:00-13:00] [13:00-14:00] [14:00-15:00]  -- non-overlapping

Sliding Window (size=1hr, slide=15min):
  [12:00-13:00] [12:15-13:15] [12:30-13:30]  -- overlapping

Session Window (gap=30min):
  Events grouped by inactivity gaps -- each user session is a dynamic window
\`\`\`

**Watermarks and Window Triggers**:
\`\`\`
Events arrive with event_time embedded:
  event: {user_id: 42, action: "click", event_time: "13:00:02"}
  event: {user_id: 17, action: "purchase", event_time: "13:00:15"}
  event: {user_id: 42, action: "click", event_time: "12:59:55"}  <-- late!

Flink watermark = max(event_time seen) - 60 seconds (allowed lateness)

When watermark passes 13:00:00:
  Trigger the [12:00-13:00] tumbling window
  Results are emitted for all keys

The late event (12:59:55) arrives after window trigger:
  If within allowed lateness: re-trigger window with updated result
  If beyond allowed lateness: route to side output for separate handling
\`\`\`

**Why Event Time Matters**:
- Mobile app was offline for 2 hours; events arrive with old event_time
- Processing time would put them in the wrong window
- Event time correctly attributes them to the window where they occurred`,
      },
      {
        question: 'How do you achieve exactly-once processing with Kafka source and sink?',
        answer: `**The Challenge**:
- At-least-once: on failure, replay from last checkpoint — events between checkpoint and failure are reprocessed → duplicates in output
- Exactly-once: each input event contributes to output exactly once, even across failures

**Flink's Two-Phase Commit (2PC) with Kafka**:
\`\`\`
Normal operation:
  1. Flink processes events, writes to Kafka sink in a pending transaction
  2. Checkpoint barrier flows through the DAG
  3. All operators complete their pre-commit (flush pending state)
  4. Checkpoint coordinator confirms checkpoint is complete
  5. Kafka sink commits the transaction → results visible to consumers

On failure before commit:
  1. Flink recovers from last checkpoint
  2. Pending Kafka transaction is aborted (results not visible)
  3. Flink replays events from checkpoint offset
  4. Kafka sink opens a new transaction

On failure after commit:
  1. Flink recovers from checkpoint
  2. Replays events → tries to write to Kafka again
  3. Idempotent producer: same sequence number → Kafka deduplicates
  4. Transaction was already committed → no double-publish
\`\`\`

**Requirements for Exactly-Once**:
- Kafka source: committed offset tied to checkpoint (not auto-commit)
- Processing: deterministic transformations (no random, no wall-clock time)
- Kafka sink: transactional producer with idempotent writes
- External sinks: must support upsert or idempotent write (JDBC with unique key, Elasticsearch with doc ID)`,
      },
      {
        question: 'How do you manage terabytes of state in a distributed stream processing job?',
        answer: `**State Backend Options**:

| Backend      | State Location  | Max State | Latency   | Use Case                    |
|:-------------|:----------------|:----------|:----------|:----------------------------|
| HashMapState | JVM heap        | ~1-4 GB   | <0.1ms    | Small state, highest perf   |
| RocksDB      | Disk + RAM      | Terabytes | 0.1-1ms   | Large state, standard prod  |

**RocksDB State in Flink**:
\`\`\`
Each Flink task manager has:
  - Local RocksDB instance (on SSD)
  - Block cache: 256MB-4GB in RAM (hot key cache)
  - Write buffer: 64MB (batches writes, flushed to disk periodically)

State access pattern:
  fraudState.get(userId)  -- RocksDB lookup, <1ms on SSD
  fraudState.update(...)  -- buffered in write buffer
\`\`\`

**Checkpointing Large State**:
- Incremental checkpoints: only upload changed SST files to S3 each checkpoint
- A 1TB state store with 1% change rate → 10GB checkpoint upload instead of 1TB
- Checkpoint duration: 10-30 seconds for incremental vs hours for full

**Operational Challenges**:
- State growth: old keys accumulate (users who churned 3 years ago)
  - Solution: TTL on state entries (Flink State TTL), archive or evict inactive keys
- Rebalancing after scaling: state must be redistributed when parallelism changes
  - Flink handles this automatically via key group assignment on savepoint restore
- RocksDB compaction: background compaction can spike CPU — tune compaction threads and resource limits`,
      },
    ],

    keyDecisions: [
      'RocksDB vs in-memory state backend — chose RocksDB because terabyte-scale state for fraud detection across millions of users cannot fit in JVM heap; RocksDB sub-millisecond latency is acceptable for 1M events/sec throughput',
      'Flink vs Kafka Streams — chose Flink for complex stateful operations, exactly-once with non-Kafka sinks, and advanced windowing; Kafka Streams is simpler but limited to Kafka sinks and lacks Flink advanced windowing',
      'Event time vs processing time windowing — chose event time because mobile and batch ingestion patterns produce out-of-order events; processing time would produce incorrect aggregations for late-arriving data',
      'Incremental vs full checkpoints — chose incremental because full checkpoints of terabyte state would take hours and consume enormous S3 bandwidth; incremental reduces checkpoint time to seconds',
      'Two-phase commit for exactly-once vs idempotent sink design — chose 2PC with Kafka transactional producer because it provides true exactly-once without requiring every downstream system to implement idempotency independently',
    ],
  },

  {
    id: 'live-video-transcoding',
    isNew: true,
    title: 'Live Video Transcoding Pipeline',
    subtitle: 'Twitch Ingest / YouTube Live / AWS Elemental',
    icon: 'cpu',
    color: '#dc2626',
    difficulty: 'Hard',
    description: 'Design a live video streaming infrastructure that ingests video from broadcasters, transcodes it into multiple quality levels in real time, and delivers it to millions of concurrent viewers with minimal latency.',

    introduction: `Live video transcoding combines some of the most demanding requirements in distributed systems: real-time GPU-intensive computation, global content delivery to millions of concurrent viewers, and latency measured in seconds rather than milliseconds. A live sports broadcast where viewers experience a 30-second delay is usable; a live interactive stream with a 5-second delay is acceptable; a live auction or gaming stream that needs sub-2-second latency requires a fundamentally different architecture.

The core technical challenge is that a broadcaster sends a single high-quality video stream (typically 1080p60 at 6-8 Mbps), but viewers arrive on a wide range of devices and network connections. A mobile viewer on 4G cannot receive the same stream as a desktop viewer on fiber. The system must transcode the single ingest stream into 5-8 different quality levels in real time, typically in under 2 seconds of added latency, before pushing all renditions to a CDN edge network.

Scaling is asymmetric: a popular streamer going live from zero to 1 million concurrent viewers in minutes is normal on platforms like Twitch. The transcoding cluster must scale up fast enough to meet this demand, but transcoding servers take 2-3 minutes to initialize — requiring predictive scaling based on streamer history and notification signals rather than reactive scaling on actual viewer arrival.

Fault tolerance in live streaming has no equivalent of "retry later." If a transcoding node fails mid-broadcast, a seamless failover must occur within seconds or viewers see a black screen. Redundant transcoding paths and fast detection of pipeline failures are critical.`,

    functionalRequirements: [
      'Accept live video ingest from broadcasters via RTMP or SRT protocol',
      'Transcode the ingest stream into 5-8 quality renditions in real time using the adaptive bitrate ladder',
      'Generate HLS or DASH segments and push them to CDN edge servers continuously',
      'Support multiple latency modes: ultra-low (under 2 seconds), low (under 5 seconds), and normal (under 30 seconds)',
      'Enable DVR functionality allowing viewers to pause and rewind live streams up to a configured window',
      'Monitor stream health and alert on ingest quality degradation such as frame drops and bitrate spikes',
      'Support stream recording to object storage for on-demand playback after the broadcast ends',
      'Provide a stream dashboard showing ingest quality, viewer count, and CDN metrics in real time',
    ],

    nonFunctionalRequirements: [
      'Transcoding latency (glass-to-glass) under 5 seconds for low-latency mode at p95',
      'Support 10,000 concurrent live streams on the platform simultaneously',
      'Handle a single stream scaling from 0 to 1 million concurrent viewers within 5 minutes',
      'Transcoding cluster auto-scales new capacity within 3 minutes of a scaling trigger',
      '99.95% ingest availability — stream drops must auto-recover within 5 seconds',
      'CDN origin shield offloads at least 95% of viewer requests — only 5% reach the transcoding origin',
    ],

    estimation: {
      users: '10K concurrent live streams; peak stream 1M concurrent viewers; 50M daily viewers across all streams',
      storage: '10K streams * 6 Mbps ingest * 86400 sec = ~648TB/day raw recording; HLS segments on CDN: 10K streams * 8 renditions * 2s segments = ~160K segment files generated/sec',
      bandwidth: '10K streams * 6 Mbps ingest = 60 Gbps ingest; 10K streams * 8 renditions * 4 Mbps avg = 320 Gbps origin → CDN; CDN to viewers: 1M viewers * 4 Mbps = 4 Tbps peak for one stream',
      qps: '10K stream ingest connections; 80K HLS segments generated/sec; CDN serving millions of segment requests/sec globally',
    },

    apiDesign: {
      description: 'Stream management API for broadcaster configuration and viewer playback URLs; ingest is via RTMP/SRT protocol, not HTTP',
      endpoints: [
        { method: 'POST', path: '/api/v1/streams', params: '{ streamer_id, title, category, latency_mode: "ultra_low"|"low"|"normal", dvr_window_minutes }', response: '{ stream_id, rtmp_url, stream_key, playback_url }', description: 'Create a new live stream session and get the RTMP ingest URL and stream key' },
        { method: 'GET', path: '/api/v1/streams/{stream_id}/playback', params: '', response: '{ hls_url, dash_url, thumbnail_url, viewer_count, latency_mode }', description: 'Get the adaptive bitrate playlist URL for a viewer to begin playback' },
        { method: 'GET', path: '/api/v1/streams/{stream_id}/health', params: '', response: '{ ingest_bitrate_kbps, frame_rate, keyframe_interval_ms, drop_rate_pct, transcoder_node, status }', description: 'Real-time stream health metrics for the broadcaster dashboard' },
        { method: 'DELETE', path: '/api/v1/streams/{stream_id}', params: '', response: '{ status, recording_url? }', description: 'End a live stream and optionally trigger recording finalization' },
        { method: 'GET', path: '/api/v1/streams/{stream_id}/dvr', params: 'seek_position_ms', response: '{ hls_url, available_range_ms }', description: 'Get DVR playback URL at a specific timestamp within the DVR window' },
      ],
    },

    dataModel: {
      description: 'Stream sessions, transcoding jobs, CDN segment inventory, and DVR metadata',
      schema: `streams {
  id: uuid PK
  streamer_id: bigint FK
  title: varchar(200)
  category_id: int FK
  status: enum(idle, live, ended, error)
  latency_mode: enum(ultra_low, low, normal)
  dvr_window_minutes: int
  ingest_node: varchar(100)
  transcoder_node: varchar(100)
  stream_key: varchar(64) unique
  rtmp_url: varchar(300)
  started_at: timestamp nullable
  ended_at: timestamp nullable
  peak_viewer_count: int
  created_at: timestamp
}

segments {
  id: bigint PK
  stream_id: uuid FK
  sequence_number: int
  rendition: varchar(20)  -- e.g., 1080p60, 720p30, 480p, 360p, audio_only
  duration_ms: int
  storage_path: varchar(500)
  cdn_pushed_at: timestamp
  created_at: timestamp
  expires_at: timestamp nullable  -- for DVR window eviction
}

transcoding_jobs {
  id: uuid PK
  stream_id: uuid FK
  node_id: varchar(100)
  status: enum(running, failed, completed)
  input_bitrate_kbps: int
  output_renditions: jsonb
  started_at: timestamp
  last_heartbeat_at: timestamp
}`,
      examples: [
        { table: 'streams', label: 'Active live stream', json: '{ "id": "str-9a8b7c6d", "streamer_id": 444001, "title": "Sunday Night Football Live Reaction", "status": "live", "latency_mode": "low", "dvr_window_minutes": 60, "ingest_node": "ingest-us-east-1-04", "transcoder_node": "transcode-us-east-1-gpu-12", "started_at": "2025-04-18T20:00:00Z", "peak_viewer_count": 82400 }' },
        { table: 'segments', label: 'HLS segment pushed to CDN', json: '{ "id": 8820001, "stream_id": "str-9a8b7c6d", "sequence_number": 4410, "rendition": "720p30", "duration_ms": 2000, "storage_path": "s3://live-segments/str-9a8b7c6d/720p30/seg_4410.ts", "cdn_pushed_at": "2025-04-18T21:14:08.234Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Each live stream is assigned to a single transcoding server. The server runs FFmpeg to produce multiple renditions and writes HLS segments to a shared NFS mount that an HTTP server reads from for viewer requests.',
      problems: [
        'Single transcoding server per stream is a single point of failure — if the server crashes, the stream goes offline with no automatic recovery',
        'Shared NFS for segment storage creates a bottleneck and single point of failure; NFS latency adds seconds to segment availability',
        'No CDN integration means all viewer requests hit the origin server — a stream with 1 million viewers overwhelms the origin immediately',
        'No predictive auto-scaling means the cluster cannot respond fast enough to a streamer suddenly going viral; reactive scaling takes too long',
        'No monitoring means stream health issues go undetected until viewers complain',
      ],
    },

    advancedImplementation: {
      title: 'Distributed Transcoding with CDN Push, GPU Auto-Scaling, and Redundant Ingest',
      description: 'Ingest servers accept RTMP connections and immediately relay the stream to two parallel transcoding nodes for redundancy. Each transcoding node runs GPU-accelerated FFmpeg producing the full rendition ladder. Segments are pushed directly to CDN edge nodes (not pulled) using a push-based origin model. A global ingest load balancer routes streamers to the nearest ingest PoP. Auto-scaling pre-warms transcoding GPU instances based on streamer notification signals.',
      keyPoints: [
        'Redundant transcoding: each ingest stream is sent to two transcoding nodes simultaneously; the CDN playlist switches to the backup node within 3 seconds if primary fails, preventing visible stream interruption',
        'GPU-accelerated transcoding: NVIDIA NVENC hardware encoder produces H.264/HEVC transcodes in real time on a single GPU at 4-8x lower latency than CPU FFmpeg; one A10G GPU handles 8-12 simultaneous stream transcoding jobs',
        'CDN push vs pull: instead of waiting for CDN edges to request segments (pull), the transcoder pushes each segment to a set of CDN PoPs immediately upon generation — removes one round-trip from the latency budget',
        'Low-latency HLS (LHLS) or CMAF: 2-second segments with chunked transfer encoding allow the player to begin buffering a segment before it is complete, reducing end-to-end latency from 6-30 seconds to 2-5 seconds',
        'Predictive auto-scaling: when a streamer with large following publishes a "going live in 15 minutes" notification, the scheduler pre-allocates a transcoding slot immediately rather than waiting for the RTMP connection',
        'Ingest PoP co-location: ingest servers located near major cable and fiber exchange points in each region minimize the distance the broadcaster stream travels before transcoding begins, reducing ingest jitter',
        'DVR via object storage: segments written to S3 with lifecycle rules matching the DVR window length (e.g., 1 hour); DVR playback generates a playlist referencing historical S3 segments; recording finalization concatenates all segments into a single MP4 after stream ends',
      ],
      databaseChoice: 'Redis for stream session state and segment metadata cache (fast lookup during playlist generation); S3 for segment storage and DVR archive; PostgreSQL for stream configuration, streamer accounts, and long-term analytics; Kafka for stream health events and viewer analytics; CDN provider (CloudFront, Fastly, Akamai) for global segment delivery; ClickHouse for real-time viewer count and engagement analytics',
      caching: 'HLS master playlist cached on CDN with 2-second TTL (must refresh for new segments); segment files cached at CDN edge with immutable long TTL (segment filenames include sequence number, never change); current segment index cached in Redis on origin for fast playlist generation; thumbnail cache at CDN refreshed every 10 seconds',
    },

    tips: [
      'The transcoding ladder is fundamental — explain that you must produce multiple quality levels (1080p, 720p, 480p, 360p, 160p) because viewers have different bandwidth capabilities',
      'Distinguish latency modes clearly: ultra-low latency (under 2s) requires fundamentally different architecture (WebRTC or LHLS with 0.5s segments) vs normal HLS (30s latency with 6s segments)',
      'CDN is the key to scaling to millions of viewers — origin can serve hundreds of requests per second; CDN can serve billions. Discuss the push vs pull segment delivery model',
      'Mention the cold-start scaling problem: transcoding GPU instances take 2-3 minutes to provision; reactive scaling always lags demand. Predictive scaling based on streamer signals is the solution',
      'Stream health monitoring is operationally critical — keyframe interval, bitrate drops, and frame rate are leading indicators of viewer-visible quality degradation',
      'DVR and recording are often follow-up questions — explain that they naturally fall out of the segment-based architecture because S3 already stores all segments',
    ],

    keyQuestions: [
      {
        question: 'How does adaptive bitrate streaming work and why is it essential for live video?',
        answer: `**The Problem Without ABR**:
- Broadcaster sends a single 1080p stream at 8 Mbps
- Viewer on 4G mobile has 3 Mbps available → cannot receive the stream → black screen or constant buffering

**Adaptive Bitrate (HLS) Solution**:
\`\`\`
Transcoding produces multiple renditions:
  1080p60 @ 8 Mbps
  720p30  @ 4 Mbps
  480p    @ 2 Mbps
  360p    @ 1 Mbps
  160p    @ 400 Kbps
  Audio   @ 128 Kbps

Master playlist (m3u8) lists all renditions:
  #EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080
  1080p/index.m3u8
  #EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1280x720
  720p/index.m3u8
  ...
\`\`\`

**ABR Algorithm (client side)**:
1. Player starts downloading at a low quality to buffer quickly
2. Measures download throughput for each segment
3. If throughput > current rendition bitrate by a margin: switch up
4. If throughput < current rendition bitrate: switch down immediately
5. Buffer level also influences decisions — low buffer → switch down aggressively

**Result**: viewer automatically gets the highest quality their connection supports, with smooth quality transitions instead of rebuffering`,
      },
      {
        question: 'How do you minimize end-to-end latency from streamer camera to viewer screen?',
        answer: `**Sources of Latency in the Pipeline**:
\`\`\`
Streamer camera capture:           33ms (30fps capture interval)
Encoder on streamer device:        66ms (2-frame lookahead buffer)
Network: streamer → ingest PoP:    20-100ms (geography dependent)
Ingest buffer:                     500ms (stability buffer for jitter)
Transcoding:                       500ms (segment processing)
Segment generation (HLS):         2000ms (standard 2-second segments)
CDN propagation:                   200ms (push to edge)
Player buffer:                    2000ms (standard 3 segments pre-buffered)
Viewer decode and display:          33ms

Standard HLS total:               ~5-6 seconds (low-latency mode)
Normal HLS (6s segments):         ~20-30 seconds
\`\`\`

**Ultra-Low Latency Techniques** (target: under 2 seconds):
- Chunked transfer encoding (CMAF): send segment data as it is generated, not after full segment is complete → player buffers from the start of a segment
- Reduce segment duration to 0.5-1 second (increases CDN request rate)
- Reduce player buffer to 1 segment instead of 3
- WebRTC path: bypass HLS entirely, use RTP/RTCP directly — sub-500ms but requires server-side WebRTC infrastructure and does not use CDN for distribution
- Push-based CDN: push segments to edge immediately upon generation instead of waiting for a pull request`,
      },
    ],

    keyDecisions: [
      'GPU vs CPU transcoding — chose GPU (NVENC) because a single A10G GPU transcodes 8-12 simultaneous streams in real time at 4x lower latency than CPU FFmpeg; CPU transcoding cannot meet real-time requirements for 1080p60 at scale',
      'CDN push vs pull — chose push because it eliminates one network round-trip from the latency budget and ensures segments are available at the edge before the first viewer requests them',
      'HLS vs DASH — chose HLS as default because Apple devices require HLS and it has the broadest player support; DASH is offered as a second format for devices where it provides better ABR performance',
      'Redundant parallel transcoders vs single transcoder with fast restart — chose redundant parallel transcoders because fast restart still results in a 5-10 second stream interruption; redundant transcoding with CDN playlist switching achieves under 3 second failover',
      'Predictive vs reactive auto-scaling — chose predictive based on notification signals because reactive scaling always lags by 3-5 minutes, which is too slow when a stream goes viral in seconds',
      'S3 segment storage vs NFS — chose S3 because it provides durable, globally replicated segment storage with lifecycle rules for DVR window management; NFS creates a bottleneck and is a single point of failure',
    ],
  },

  {
    id: 'realtime-matchmaking',
    isNew: true,
    title: 'Real-Time Matchmaking System',
    subtitle: 'League of Legends / Call of Duty / Valorant Matchmaking',
    icon: 'zap',
    color: '#6366f1',
    difficulty: 'Medium',
    description: 'Design a matchmaking system that forms balanced multiplayer game sessions by grouping players of similar skill within acceptable wait times across regional servers.',

    introduction: `Matchmaking is a deceptively complex optimization problem disguised as a simple queue. The goal sounds straightforward: put players together who are of similar skill level. But in practice, the system must simultaneously optimize for match quality (balanced skill), wait time (players abandon after 3-5 minutes), geographic proximity (high-latency matches are frustrating), group composition (a team of 5 friends should face a similar coordinated group), and anti-cheat enforcement (flagged accounts should not ruin normal players' games).

Skill rating systems like Elo (chess), TrueSkill (Halo, Gears), and MMR (League of Legends) each have different properties. Elo works well for 1v1 but degrades for team games where individual contribution is hard to measure. TrueSkill models uncertainty about a player's true skill, making it better for players who haven't played many games and for team composition matching.

The classic tension in matchmaking is quality vs wait time. An ideal match might require finding 10 players within 50 MMR of each other in your region who are all queuing at the same moment. For popular games during peak hours, this is achievable. For niche game modes, off-peak hours, or players at extreme MMR ratings (very high or very low), the system must relax constraints progressively as wait time increases.

Party matching adds significant complexity. A group of 5 friends queueing together should face another premade group, not 5 solo players who have no coordination. The combined skill rating of a party must account for the coordination bonus that premade groups have over random strangers, or premade groups will have an unfair advantage.`,

    functionalRequirements: [
      'Accept players into a matchmaking queue with their current skill rating and preferred game mode',
      'Form balanced matches by grouping players of similar skill rating within a configurable threshold',
      'Support party queuing where groups of friends are placed into the same team',
      'Assign matches to game servers in the region with the lowest latency to all players in the match',
      'Progressively relax match quality requirements as a player waits longer in queue',
      'Prevent flagged or banned accounts from being matched with normal players',
      'Provide real-time queue status updates to players including estimated wait time',
      'Handle player dropouts during the lobby phase and either backfill or cancel the match',
    ],

    nonFunctionalRequirements: [
      'Match formation latency under 100ms once all players are identified (match forming itself, not queue wait)',
      'Average queue wait time under 90 seconds during peak hours for most skill ranges',
      'Support 500,000 concurrent players in matchmaking queues across all regions and game modes',
      'Server assignment decision under 200ms after match is formed',
      '99.9% of matches should have all players within 80ms ping of the assigned server',
      'Queue dropout rate should be under 2% — the system must estimate wait time accurately enough that players stay in queue',
    ],

    estimation: {
      users: '500K concurrent players in matchmaking queues across all regions; 10M daily active players',
      storage: '500K queue entries * 200 bytes = 100MB in-memory queue state; match history: 10M daily players * 3 matches/day * 1KB = 30GB/day',
      bandwidth: '500K players * 1 status update/5sec * 200 bytes = 20MB/sec status push; negligible compared to game traffic',
      qps: '500K queue entries evaluated every 5 seconds = 100K match-formation attempts/sec; 10K matches formed/sec during peak',
    },

    apiDesign: {
      description: 'Queue management API used by game clients to enter and monitor matchmaking, and internal APIs for match server assignment',
      endpoints: [
        { method: 'POST', path: '/api/v1/queue/join', params: '{ player_id, game_mode, party_id?, region_preference }', response: '{ ticket_id, estimated_wait_sec, position_in_queue }', description: 'Enter the matchmaking queue; returns a ticket for status polling' },
        { method: 'GET', path: '/api/v1/queue/{ticket_id}/status', params: '', response: '{ status: queuing|match_found|cancelled, wait_sec, match_id?, server_ip?, server_port? }', description: 'Poll for queue status; match_found includes the game server connection details' },
        { method: 'DELETE', path: '/api/v1/queue/{ticket_id}', params: '', response: '{ status }', description: 'Leave the matchmaking queue voluntarily' },
        { method: 'POST', path: '/api/v1/queue/{ticket_id}/accept', params: '', response: '{ status }', description: 'Accept a found match during the lobby acceptance phase; if any player declines the match is cancelled and others re-queue' },
        { method: 'GET', path: '/api/v1/players/{player_id}/rating', params: 'game_mode', response: '{ mmr, rank, confidence_interval, games_played, win_rate }', description: 'Get a player skill rating and rank for a specific game mode' },
      ],
    },

    dataModel: {
      description: 'Queue state maintained in Redis for low-latency access; match history and skill ratings persisted in PostgreSQL',
      schema: `queue_tickets {
  id: uuid PK
  player_id: bigint FK
  party_id: uuid FK nullable
  game_mode: varchar(50)
  region: varchar(20)
  mmr: float
  mmr_lower_bound: float  -- current acceptable range lower (expands over time)
  mmr_upper_bound: float  -- current acceptable range upper
  latency_to_regions: jsonb  -- {us-east: 12, us-west: 45, eu: 180}
  status: enum(queuing, match_found, accepted, cancelled)
  queued_at: timestamp
  matched_at: timestamp nullable
  -- Stored in Redis sorted set scored by mmr for efficient range queries
}

matches {
  id: uuid PK
  game_mode: varchar(50)
  region: varchar(20)
  server_ip: varchar(45)
  server_port: int
  team_a_player_ids: bigint[]
  team_b_player_ids: bigint[]
  avg_mmr: float
  mmr_spread: float  -- max - min MMR among all players
  formed_at: timestamp
  accepted_at: timestamp nullable
  cancelled_at: timestamp nullable
  cancel_reason: varchar(100) nullable
}

player_ratings {
  player_id: bigint PK
  game_mode: varchar(50) PK
  mmr: float
  confidence: float  -- TrueSkill sigma (uncertainty)
  games_played: int
  wins: int
  updated_at: timestamp
}`,
      examples: [
        { table: 'queue_tickets', label: 'Solo player in queue', json: '{ "id": "tkt-a1b2c3d4", "player_id": 100291, "game_mode": "ranked_5v5", "region": "us-east", "mmr": 1842.5, "mmr_lower_bound": 1742.5, "mmr_upper_bound": 1942.5, "latency_to_regions": {"us-east": 12, "us-west": 78}, "status": "queuing", "queued_at": "2025-04-18T21:00:00Z" }' },
        { table: 'player_ratings', label: 'Diamond-tier player rating', json: '{ "player_id": 100291, "game_mode": "ranked_5v5", "mmr": 1842.5, "confidence": 87.3, "games_played": 412, "wins": 221, "updated_at": "2025-04-18T20:45:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single matchmaking server maintains a sorted list of queuing players ordered by MMR. Every 5 seconds, it scans the list and groups nearby players by MMR into matches.',
      problems: [
        'Single server is a single point of failure and cannot scale beyond a few thousand concurrent queue entries before the 5-second scan becomes a bottleneck',
        'Naive MMR range is static — players waiting 10 minutes have the same range as players who just joined, leading to long waits in thin queues',
        'No party support — a group of 5 friends is broken up or placed on separate teams',
        'No region-aware server assignment — players are matched without considering geographic proximity, resulting in high-latency games',
        'No lobby acceptance phase — if any player is disconnected when the match is found, the game starts with a missing player',
      ],
    },

    advancedImplementation: {
      title: 'Distributed Matchmaking with TrueSkill Ratings, Progressive Expansion, and Party-Aware Grouping',
      description: 'Queuing players are stored in Redis sorted sets partitioned by game mode, region, and MMR band. A fleet of matchmaker workers each claim a MMR band and attempt to form matches by querying Redis for players within range. MMR ranges expand every 30 seconds a player waits. Party members are pre-grouped and their combined MMR is adjusted for coordination. Game servers are assigned using a latency map pre-computed for each region.',
      keyPoints: [
        'Redis sorted set per (game_mode, region, MMR_band): ZADD with score=MMR allows efficient ZRANGEBYSCORE queries for players within a skill range; bands are 200 MMR wide and matchmakers claim a band to avoid concurrent modification',
        'Progressive MMR expansion: match quality degrades gracefully as wait time increases — at t=0s the acceptable range is +/- 50 MMR; at t=60s it expands to +/- 100; at t=120s to +/- 200; at t=300s any player is acceptable',
        'TrueSkill for team games: models each player as a Gaussian distribution over true skill; team skill is the sum of member distributions; expected win probability is calculated analytically, allowing match quality scoring without exact MMR matching',
        'Party coordination adjustment: a group of N players who regularly play together receives an MMR bonus of N*10 points applied to their combined rating when searching for opponents, ensuring premade groups face similarly coordinated opponents',
        'Lobby acceptance phase: all 10 players must click Accept within 60 seconds; any decline or timeout cancels the match, returns all players to the front of the queue, and penalizes the declining player with a 5-minute queue ban',
        'Server assignment: each game mode maintains a pool of regional game server instances pinged every 30 seconds; when a match is formed, the server with lowest average latency to all players and available capacity is selected in under 50ms',
        'Anti-cheat integration: flagged players queued in a separate shadow pool; they experience normal queue times but are matched only against other flagged players, preventing them from knowing they are in the shadow pool',
      ],
      databaseChoice: 'Redis Cluster for queue state (sorted sets by MMR band, player ticket TTLs, party groupings); PostgreSQL for player ratings, match history, and ban records; Kafka for match outcome events consumed by the rating update service; in-memory sorted structures on matchmaker workers for candidate evaluation during a matching cycle',
      caching: 'Player MMR cached in Redis alongside queue ticket to avoid PostgreSQL lookups during matching; game server ping data cached in Redis with 30-second TTL; party composition cached in Redis until all members are in queue or 10 minutes elapses; ban status cached in Redis with TTL matching ban expiry',
    },

    tips: [
      'Start by defining what a good match means: balanced skill (similar MMR), low latency (geographic proximity), and acceptable wait time — and explain that these three goals conflict with each other',
      'Progressive expansion is the key insight that makes matchmaking work at all skill ranges and times of day — a static MMR range would cause very long or impossible waits for outlier players',
      'TrueSkill is a great detail to mention for team games — it handles uncertainty (new players may be much better than their MMR shows) better than Elo',
      'The lobby acceptance phase is often overlooked — without it, players who disconnect between match-found and game-start ruin the game for everyone else',
      'Party matching is a rich follow-up topic: discuss the coordination bonus and why without it premade teams would stomp solo queue players',
      'Anti-cheat shadow pool is a well-known industry pattern — Valorant and other games use it and it is a great detail to include',
    ],

    keyQuestions: [
      {
        question: 'How do you balance match quality versus wait time?',
        answer: `**The Fundamental Tradeoff**:
- Perfect match: all 10 players within 10 MMR of each other, all in the same region, same queue time
- Acceptable match: players within 200 MMR, region within 50ms latency, wait under 2 minutes
- These goals conflict: the smaller the MMR window, the longer the wait

**Progressive Expansion Algorithm**:
\`\`\`
When player joins queue:
  mmr_window = 50  (very tight)
  latency_budget = 30ms (same-city quality)

After 30 seconds waiting:
  mmr_window = 100
  latency_budget = 50ms

After 60 seconds:
  mmr_window = 200
  latency_budget = 80ms

After 120 seconds:
  mmr_window = 400
  latency_budget = 120ms

After 300 seconds:
  mmr_window = unlimited (accept any opponent)
  latency_budget = 200ms
\`\`\`

**Match Quality Score**:
\`\`\`
quality = 1.0
  - (mmr_spread / 100) * 0.4     -- penalize large MMR differences
  - (max_latency / 100) * 0.3    -- penalize high ping
  - (wait_time_variance) * 0.3   -- penalize unequal wait times

Form match when quality > threshold (typically 0.7 for ranked, 0.5 for casual)
\`\`\`

**Practical Result**:
- During peak hours: matches form quickly with tight quality (window stays small)
- Off-peak or extreme MMR: system expands constraints to ensure games happen`,
      },
      {
        question: 'How does the TrueSkill rating system work for team games?',
        answer: `**Problems with Elo in Team Games**:
- Elo assumes 1v1 outcomes; team outcomes depend on all 10 players
- A pro player smurfing at low Elo wins every game — Elo rises slowly because it does not model uncertainty about true skill
- New player MMR starts at 1000 whether they are a veteran or a true beginner

**TrueSkill: Bayesian Skill Rating**:
Each player modeled as a Gaussian distribution: Skill ~ N(mu, sigma)
- mu: estimated skill (like Elo)
- sigma: uncertainty about that estimate (decreases as more games are played)

\`\`\`
New player:    N(mu=1500, sigma=500)  -- wide uncertainty
After 10 games: N(mu=1800, sigma=200) -- narrowing in on true skill
After 100 games: N(mu=1820, sigma=80) -- high confidence estimate
\`\`\`

**Team Skill Aggregation**:
\`\`\`
Team A skill = sum of member mus
Team A uncertainty = sqrt(sum of member sigma^2)

Expected win probability:
  P(A wins) = Phi((mu_A - mu_B) / sqrt(sigma_A^2 + sigma_B^2 + 2*beta^2))
  where beta = performance variability constant
\`\`\`

**After Match**:
- Winner's mu increases, sigma decreases (confirmed skill)
- Loser's mu decreases, sigma decreases (also confirmed, just lower)
- Both players have narrower uncertainty after each match
- An unexpected upset (low-skill team beats high-skill team) causes larger mu updates in both directions`,
      },
    ],

    keyDecisions: [
      'TrueSkill vs Elo for skill rating — chose TrueSkill because it models uncertainty explicitly, enabling faster calibration for new players and more accurate team win probability estimates than Elo which assumes fixed skill',
      'Redis sorted sets vs PostgreSQL for queue state — chose Redis because sorted set ZRANGEBYSCORE queries give O(log N) MMR-range lookups at sub-millisecond latency; PostgreSQL index scans at 500K concurrent entries would add unacceptable latency',
      'Progressive expansion vs dynamic programming for matching — chose progressive expansion because it is predictable, explainable to players via estimated wait time, and computationally simple; global optimization is NP-hard and overkill for the problem',
      'Shadow pool anti-cheat isolation vs direct banning — chose shadow pool because banned players immediately create new accounts; shadow pool delays the disruption, allows human review, and avoids harming legitimate players',
      'Lobby acceptance phase vs direct game start — chose acceptance phase because network conditions between match-found and game-start can result in disconnected players; acceptance ensures all 10 players are present before the server is allocated',
    ],
  },

  {
    id: 'iot-data-pipeline',
    isNew: true,
    title: 'IoT Data Ingestion Pipeline',
    subtitle: 'AWS IoT Core / Azure IoT Hub / Industrial SCADA',
    icon: 'server',
    color: '#10b981',
    difficulty: 'Hard',
    description: 'Design a scalable IoT data pipeline that handles millions of concurrent device connections, ingests high-frequency telemetry streams, and enables real-time alerting and device command delivery.',

    introduction: `IoT data pipelines face a unique combination of challenges: massive connection counts (millions of devices connected simultaneously), heterogeneous device capabilities (microcontrollers with 32KB RAM alongside industrial PLCs), unreliable network connectivity (devices going offline and reconnecting with buffered data), and strict data ordering requirements (sensor readings must be attributed to the correct time, not the time they arrived).

The MQTT protocol was designed specifically for IoT scenarios — its publish/subscribe model, three QoS levels (fire-and-forget, at-least-once, exactly-once), and tiny packet overhead (as low as 2 bytes) make it far more suitable than HTTP for battery-powered devices with intermittent connectivity. An HTTP POST for a temperature reading consumes 10x the bandwidth of an equivalent MQTT publish.

The device shadow (or digital twin) pattern solves one of the hardest IoT problems: commanding offline devices. If a smart thermostat is sleeping to conserve battery, you cannot send it a real-time command. The device shadow stores the desired state in the cloud; when the device reconnects, it reads the shadow and applies any pending commands. This decouples the command lifecycle from device connectivity.

Industrial IoT adds regulatory and safety dimensions absent in consumer IoT. A temperature sensor in a pharmaceutical cold chain has regulatory data integrity requirements — every reading must be timestamped, immutable, and auditable. An industrial motor controller requires deterministic command delivery with confirmation, not best-effort messaging. These use cases require more robust protocols (OPC-UA, Modbus) and stronger consistency guarantees than consumer IoT.`,

    functionalRequirements: [
      'Maintain persistent connections from millions of IoT devices simultaneously via MQTT protocol',
      'Ingest telemetry messages from devices and route them to downstream processing pipelines',
      'Deliver command messages from the cloud to devices including to devices that are currently offline via the device shadow pattern',
      'Authenticate and authorize every device using X.509 certificates or token-based credentials',
      'Deduplicate messages from devices that retry on network failures with at-least-once delivery',
      'Implement a rules engine that evaluates alert conditions on incoming telemetry and triggers notifications or downstream actions',
      'Support over-the-air firmware updates delivered to device groups on a rolling schedule',
      'Provide a device registry with metadata, connectivity status, and last-seen timestamps for all registered devices',
    ],

    nonFunctionalRequirements: [
      'Support 10 million simultaneously connected devices per deployment',
      'Telemetry message ingestion latency under 100ms from device publish to pipeline delivery at p95',
      'Zero message loss for QoS 1 and QoS 2 MQTT messages even during backend failures',
      'Device shadow sync latency under 500ms when device reconnects after offline period',
      'Alert rule evaluation latency under 10 seconds from telemetry receipt to notification delivery',
      'OTA update delivery must be resumable — interrupted downloads restart from where they stopped',
    ],

    estimation: {
      users: '10M concurrent device connections; 100M total registered devices',
      storage: '10M devices * 10 messages/sec average * 200 bytes = 20GB/sec raw ingestion; time-series DB: 20GB/sec * 86400 = 1.7PB/day (with compression: ~170TB/day); device shadow: 100M devices * 2KB = 200GB',
      bandwidth: '10M devices * 10 msg/sec * 200 bytes = 20GB/sec inbound; command delivery: 10M devices * 1 command/min * 100 bytes = ~17MB/sec outbound',
      qps: '100M messages/sec ingestion peak; 10M concurrent MQTT connections; 1M alert rule evaluations/sec',
    },

    apiDesign: {
      description: 'Device-facing MQTT protocol for telemetry and commands; REST API for device management, shadow access, and OTA updates',
      endpoints: [
        { method: 'MQTT PUB', path: 'devices/{device_id}/telemetry', params: 'QoS 1, payload: { timestamp_ms, readings: {temp: 24.5, humidity: 60.2, battery_pct: 87} }', response: 'PUBACK (QoS 1 acknowledgement from broker)', description: 'Device publishes sensor readings; retained=false, broker routes to telemetry pipeline' },
        { method: 'MQTT SUB', path: 'devices/{device_id}/commands', params: 'QoS 1 subscription', response: 'Command messages pushed by cloud when available', description: 'Device subscribes to receive cloud-to-device commands including shadow delta updates' },
        { method: 'GET', path: '/api/v1/devices/{device_id}/shadow', params: '', response: '{ desired: {setpoint: 22}, reported: {setpoint: 20}, delta: {setpoint: 22}, version: 47 }', description: 'Get device shadow showing desired state from cloud, reported state from device, and computed delta' },
        { method: 'PUT', path: '/api/v1/devices/{device_id}/shadow/desired', params: '{ state: {setpoint: 22} }', response: '{ version, timestamp }', description: 'Update desired state; delta is computed and pushed to device if connected, or stored for next reconnect' },
        { method: 'POST', path: '/api/v1/ota/campaigns', params: '{ firmware_version, target_device_group, rollout_pct, schedule }', response: '{ campaign_id, estimated_device_count }', description: 'Create an OTA firmware update campaign targeting a device group with staged rollout' },
      ],
    },

    dataModel: {
      description: 'Device registry, shadow state, telemetry time-series, and OTA campaign tracking',
      schema: `devices {
  id: varchar(64) PK  -- hardware serial number or UUID
  device_type: varchar(50)
  firmware_version: varchar(20)
  certificate_id: varchar(64) unique
  group_ids: text[]
  status: enum(active, inactive, decommissioned)
  last_connected_at: timestamp
  last_ip: varchar(45)
  created_at: timestamp
}

device_shadows {
  device_id: varchar(64) PK FK → devices.id
  desired_state: jsonb
  reported_state: jsonb
  delta: jsonb  -- computed: desired - reported
  desired_version: int
  reported_version: int
  updated_at: timestamp
}

telemetry {
  device_id: varchar(64)
  event_time: timestamp  -- device-reported timestamp
  received_at: timestamp  -- server-side receipt timestamp
  readings: jsonb
  -- Partitioned by event_time (daily) and device_id
  -- Stored in time-series DB (TimescaleDB or InfluxDB), not PostgreSQL
}

ota_campaigns {
  id: uuid PK
  firmware_version: varchar(20)
  target_group: varchar(100)
  rollout_pct: int
  status: enum(draft, active, paused, completed)
  device_count: int
  updated_count: int
  failed_count: int
  created_at: timestamp
}`,
      examples: [
        { table: 'device_shadows', label: 'Thermostat with pending setpoint change', json: '{ "device_id": "therm-4f2a8b3c", "desired_state": {"setpoint": 22, "mode": "heat"}, "reported_state": {"setpoint": 20, "mode": "heat", "current_temp": 19.5}, "delta": {"setpoint": 22}, "desired_version": 12, "reported_version": 11 }' },
        { table: 'telemetry', label: 'Temperature sensor reading', json: '{ "device_id": "sensor-9d1e7f4a", "event_time": "2025-04-18T14:32:01.123Z", "received_at": "2025-04-18T14:32:01.234Z", "readings": {"temperature_c": 4.2, "humidity_pct": 72.1, "door_open": false, "battery_pct": 63} }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single MQTT broker (Eclipse Mosquitto) handles all device connections. Devices publish to topics that a Node.js consumer reads and inserts into a PostgreSQL database. Alert rules are checked by a cron job every 5 minutes.',
      problems: [
        'A single MQTT broker cannot handle 10 million concurrent connections — open source brokers scale to tens of thousands of connections before becoming a bottleneck',
        'Inserting each telemetry message individually into PostgreSQL cannot keep up with 100M messages/sec — PostgreSQL would collapse under the write load',
        'Cron-based alert evaluation every 5 minutes misses time-critical alerts for events like temperature spikes or machine failures',
        'No device shadow means commands to offline devices are lost — there is no way to command a device that is not currently connected',
        'No certificate-based authentication means any device claiming a device_id is trusted, creating a significant security vulnerability',
      ],
    },

    advancedImplementation: {
      title: 'Clustered MQTT Brokers with Kafka Backplane, Time-Series Storage, and Device Shadow via DynamoDB',
      description: 'MQTT broker clusters (EMQX or AWS IoT Core) handle millions of connections using consistent hashing to route each device to a specific broker node. All published messages flow into Kafka topics partitioned by device_id. Stream processors (Flink) evaluate alert rules in real time against the Kafka stream. Device shadows are stored in DynamoDB with conditional writes ensuring version consistency. OTA updates use S3 for firmware storage with pre-signed URLs delivered via MQTT.',
      keyPoints: [
        'EMQX cluster: horizontally scaled MQTT broker that natively supports clustering — devices are consistently hashed to broker nodes; inter-node routing handles subscriptions across nodes transparently; supports 1 million connections per node on appropriate hardware',
        'Kafka as the telemetry backplane: every MQTT message is published to a Kafka topic partitioned by device_id, decoupling the ingest layer from all downstream consumers (alerting, time-series storage, analytics) without coordination',
        'TimescaleDB or InfluxDB for time-series: telemetry written in micro-batches (every 100ms, batch 10K messages); hypertable partitioning by device_id and time provides efficient time-range queries; automatic compression after 7 days reduces storage by 10x',
        'Device shadow with optimistic locking: DynamoDB stores desired and reported states; conditional writes with version number prevent concurrent updates from corrupting state; delta is computed on write and pushed to the device via a shadow topic',
        'MQTT QoS levels for different workloads: temperature readings use QoS 0 (fire-and-forget) since a dropped reading is acceptable; alerts and commands use QoS 1 (at-least-once) with broker-side retry; firmware OTA uses QoS 1 with device-side resumable download',
        'Certificate-based device authentication: each device has a unique X.509 certificate signed by a device CA; the broker validates the certificate on every connection; certificate rotation is handled via OTA update or a grace period dual-certificate approach',
        'Edge computing for bandwidth reduction: edge gateways aggregate readings from hundreds of nearby devices, applying local filtering and compression before forwarding to the cloud — reduces inbound bandwidth by 10-100x for dense deployments',
      ],
      databaseChoice: 'EMQX or AWS IoT Core for MQTT broker clustering; Kafka for telemetry event streaming; TimescaleDB for time-series telemetry storage; DynamoDB for device shadow (single-digit millisecond reads, conditional writes for version safety); PostgreSQL for device registry, OTA campaigns, and certificates; S3 for firmware binaries and OTA packages; Redis for real-time device status cache and alert deduplication',
      caching: 'Device metadata and authentication credentials cached in broker memory per active connection to avoid database lookups on every message; device shadow reported state cached in Redis for the last 30 minutes to serve dashboard requests without hitting DynamoDB; alert rule definitions cached in stream processor memory refreshed every 60 seconds; OTA firmware pre-signed URLs cached for 1 hour',
    },

    tips: [
      'Start with MQTT: explain why it is preferred over HTTP for IoT (persistent connection, tiny overhead, pub/sub model, QoS levels) — showing knowledge of the right protocol is a strong signal',
      'QoS levels are important: QoS 0 (fire-and-forget) for high-frequency telemetry where some loss is acceptable; QoS 1 (at-least-once) for commands and alerts where delivery is critical',
      'Device shadow is a key pattern to explain: it decouples command delivery from device connectivity, which is essential for battery-powered devices that sleep between readings',
      'At-least-once delivery means deduplication is needed downstream — mention idempotency keys or dedup windows in the Kafka consumer',
      'Edge computing is often the most impactful optimization: filtering at the source (only send anomalies, not every reading) can reduce bandwidth and cloud cost by orders of magnitude',
      'Security is critical: certificate-based authentication, least-privilege topic ACLs, and encryption at rest are all expected for production IoT systems',
    ],

    keyQuestions: [
      {
        question: 'Why is MQTT preferred over HTTP for IoT devices?',
        answer: `**MQTT vs HTTP Comparison for IoT**:

| Property              | MQTT                            | HTTP                          |
|:----------------------|:--------------------------------|:------------------------------|
| Connection            | Persistent (one TCP connection) | New connection per request    |
| Overhead              | 2-byte minimum header           | 200-800 byte headers minimum  |
| Pattern               | Pub/Sub (broker routes)         | Request/Response (one-to-one) |
| Power impact          | Low (idle connection)           | High (TCP handshake per send) |
| Offline support       | QoS 1/2 with retry             | Client must retry manually    |
| Bidirectional         | Yes (server can push)           | No (must poll or use SSE)     |

**Concrete Example — Sending 1 Temperature Reading**:
\`\`\`
HTTP POST:
  TCP handshake: 3 packets
  TLS handshake: 6 packets
  HTTP request headers: 400 bytes
  Body: 20 bytes
  HTTP response: 200 bytes
  Total: ~10 packets, ~630 bytes, 150ms latency

MQTT PUBLISH (existing connection, QoS 0):
  Fixed header: 2 bytes
  Topic: 30 bytes
  Payload: 20 bytes
  Total: 1 packet, 52 bytes, 5ms latency
\`\`\`

**When HTTP is still appropriate**:
- Batch uploads of large telemetry files (HTTPS multipart)
- Device onboarding and certificate provisioning (REST API)
- Industrial devices that only support HTTP (legacy systems)`,
      },
      {
        question: 'How does the device shadow pattern work for offline device commands?',
        answer: `**The Problem Without Device Shadow**:
\`\`\`
Cloud: "Set thermostat to 22°C"  →  MQTT publish to device/commands
Device is offline (sleeping to save battery)  →  message dropped
Device wakes up 8 hours later  →  never receives the command
\`\`\`

**Device Shadow (Desired/Reported State)**:
\`\`\`
Cloud updates desired state:
  PUT /shadow/desired: { "setpoint": 22 }
  Shadow: {
    desired: { setpoint: 22 },
    reported: { setpoint: 20 },
    delta: { setpoint: 22 },  -- computed: desired != reported
    version: 12
  }

Device connects after 8 hours:
  1. Subscribes to device/{id}/shadow/delta
  2. Cloud pushes: { "state": { "setpoint": 22 } }
  3. Device applies the setpoint change
  4. Device publishes to device/{id}/shadow/reported:
     { "state": { "setpoint": 22 } }
  5. Shadow syncs: desired == reported, delta = {}
\`\`\`

**Version Conflict Handling**:
- Each shadow update increments a version number
- Device always includes the version it last saw when updating reported state
- DynamoDB conditional write: UPDATE shadow WHERE version = expected_version
- If versions mismatch (two updates arrived while device was offline): reject with 409, device re-reads shadow and re-applies

**Benefits**:
- Commands survive indefinitely until device reconnects (not dropped)
- Multiple pending updates are consolidated (only the latest desired state matters)
- Device knows exactly what it needs to change without tracking command history`,
      },
    ],

    keyDecisions: [
      'MQTT vs HTTP for device communication — chose MQTT because its persistent connections, minimal overhead, QoS levels, and native pub/sub routing are designed for exactly the constraints IoT devices face: limited bandwidth, intermittent connectivity, and battery power',
      'DynamoDB vs Redis for device shadow — chose DynamoDB because it provides durable, strongly consistent conditional writes with millisecond latency at any scale; Redis would lose shadow state on restart without RDB/AOF persistence, which is unacceptable for command delivery',
      'Kafka as ingest backplane vs direct database writes — chose Kafka because it decouples the broker from all downstream consumers without coordination, enables replay for late-starting consumers, and provides buffering during downstream outages without losing messages',
      'TimescaleDB vs InfluxDB for telemetry — chose TimescaleDB because it extends PostgreSQL with hypertables and compression, enabling SQL analytics without learning a new query language; InfluxDB has better time-series performance but a less capable query language',
      'Edge aggregation vs sending all raw readings — chose edge aggregation where devices have sufficient compute because it reduces bandwidth and cloud costs by 10-100x while preserving the ability to send raw data for anomalous readings',
    ],
  },

  {
    id: 'realtime-monitoring-alerting',
    isNew: true,
    title: 'Real-Time Monitoring and Alerting System',
    subtitle: 'Datadog / PagerDuty / Grafana OnCall',
    icon: 'shield',
    color: '#f59e0b',
    difficulty: 'Hard',
    description: 'Design a production monitoring platform that ingests metrics, logs, and traces from thousands of services, evaluates alert conditions in real time, and routes notifications to the appropriate on-call engineers.',

    introduction: `Monitoring and alerting systems are responsible for detecting production incidents before or as they impact users — and then getting the right engineer notified within seconds. The system itself must be more reliable than the systems it monitors, creating a challenging bootstrapping problem: you need monitoring to detect outages, but if your monitoring system goes down, you lose visibility during outages.

Metrics at scale are a high-cardinality data problem. A microservices platform with 1000 services, each emitting 100 metrics, with labels for host, region, and version produces 100 million unique metric series. Traditional time-series databases like InfluxDB struggle with high-cardinality labels (per-user metrics, per-request metrics) because they create too many series. Prometheus handles cardinality well within a single instance but requires architectural solutions (Thanos, Cortex) for multi-tenant or long-term storage.

Alert rule evaluation is a fan-in aggregation problem at massive scale. 100,000 alert rules must each be evaluated against the latest metric data every 30-60 seconds. Naively evaluating each rule requires reading recent data from the time-series database, but at 100K rules this creates unbounded database load. The solution is to push alert evaluation into the stream processing layer, evaluating rules against the incoming metrics stream rather than polling the database.

Alert fatigue is the enemy of effective on-call. When everything pages, engineers learn to ignore pages, and real incidents go unaddressed. Intelligent alert grouping, deduplication, and severity scoring are as important as the alerting mechanism itself. A monitoring system that pages 200 times per night for the same root cause will be disabled by frustrated on-call engineers within a week.`,

    functionalRequirements: [
      'Ingest metrics in Prometheus format (pull-based scrape) and StatsD or OpenTelemetry format (push-based)',
      'Store metric time-series with retention tiers: high-resolution for 15 days, 1-minute aggregates for 1 year',
      'Allow users to define alert rules using PromQL or a similar query language with configurable evaluation windows',
      'Evaluate alert rules every 30 seconds and fire notifications when thresholds are breached for a sustained duration',
      'Route alerts to on-call schedules based on service ownership, severity, and team rotation policies',
      'Deduplicate and group related alerts into a single incident to prevent alert storms',
      'Support maintenance windows that silence alerts for planned downtime',
      'Provide dashboards with real-time metric graphs and alert status panels',
    ],

    nonFunctionalRequirements: [
      'Metric ingestion latency under 30 seconds from emission to queryable in the time-series store',
      'Alert evaluation latency under 60 seconds from threshold breach to notification delivery',
      'Support 100,000 alert rules across all teams and services',
      'Ingest 10 million metric data points per second at peak',
      'Dashboard query response under 2 seconds for 24-hour time windows',
      'The monitoring system itself must maintain 99.999% availability — five minutes of downtime per year maximum',
    ],

    estimation: {
      users: '10M metric data points/sec; 100K alert rules; 5000 engineers as potential notification recipients',
      storage: '10M points/sec * 12 bytes/point * 86400 = ~10TB/day raw; with 15:1 compression: ~700GB/day; 1-year aggregate retention: ~25TB',
      bandwidth: '10M points/sec * 12 bytes = 120MB/sec inbound; dashboard queries: 5000 concurrent users * 1MB response = 5GB/sec at peak query time',
      qps: '10M metric writes/sec; 100K alert rule evaluations every 30s = 3300 evaluations/sec; 50K dashboard queries/sec at peak',
    },

    apiDesign: {
      description: 'Prometheus-compatible scrape endpoint, push-based metric ingestion API, alert management API, and notification routing API',
      endpoints: [
        { method: 'POST', path: '/api/v1/metrics', params: 'Content-Type: application/x-protobuf; body: prometheus remote_write proto', response: '204 No Content', description: 'Prometheus remote_write compatible endpoint for metric ingestion from all sources' },
        { method: 'POST', path: '/api/v1/alerts', params: '{ name, expr: "rate(http_errors[5m]) > 0.01", for: "2m", severity: "critical", labels: {team: "payments"}, annotations: {summary, runbook_url} }', response: '{ alert_id, status }', description: 'Create an alert rule with a PromQL expression, duration threshold, and routing labels' },
        { method: 'GET', path: '/api/v1/query', params: 'query=rate(http_requests[5m]), time=now, step=15s', response: '{ resultType: "matrix", result[{metric, values[[timestamp, value]]}] }', description: 'Prometheus-compatible instant and range query endpoint for dashboard and alert evaluation' },
        { method: 'POST', path: '/api/v1/silences', params: '{ matchers[{name, value, isRegex}], startsAt, endsAt, comment }', response: '{ silence_id }', description: 'Create a maintenance window silence matching alert labels; matched alerts are suppressed during the window' },
        { method: 'GET', path: '/api/v1/incidents/{incident_id}', params: '', response: '{ id, status, severity, alerts[{rule, value, started_at}], assignee, timeline[{event, timestamp}] }', description: 'Get the current status and timeline of a grouped incident' },
      ],
    },

    dataModel: {
      description: 'Metric time-series in a specialized TSDB; alert rules, incidents, and on-call schedules in PostgreSQL; notification state in Redis',
      schema: `-- Time-series data stored in Prometheus TSDB / Thanos / Cortex
-- Not SQL — represented here for clarity
metric_series {
  labels: map<string, string>  -- {__name__: "http_requests", job: "api", region: "us-east"}
  samples: list<(timestamp_ms, float64)>
}

-- Control plane in PostgreSQL:
alert_rules {
  id: uuid PK
  name: varchar(200)
  team_id: bigint FK
  expr: text  -- PromQL expression
  for_duration_ms: int  -- must breach for this long before firing
  severity: enum(critical, warning, info)
  labels: jsonb
  annotations: jsonb
  enabled: boolean
  created_at: timestamp
}

incidents {
  id: uuid PK
  status: enum(firing, resolved, silenced)
  severity: enum(critical, warning, info)
  first_fired_at: timestamp
  resolved_at: timestamp nullable
  assignee_id: bigint FK nullable
  alert_rule_ids: uuid[]
  fingerprint: varchar(64)  -- hash of labels for deduplication
  notification_sent_count: int
}

oncall_schedules {
  id: bigint PK
  team_id: bigint FK
  rotation_type: enum(weekly, biweekly, follow_the_sun)
  current_oncall_user_id: bigint FK
  next_rotation_at: timestamp
}`,
      examples: [
        { table: 'alert_rules', label: 'High error rate alert', json: '{ "id": "rule-a1b2c3d4", "name": "high-error-rate", "team_id": 42, "expr": "rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05", "for_duration_ms": 120000, "severity": "critical", "labels": {"service": "payment-api"}, "annotations": {"summary": "Error rate above 5% for 2 minutes", "runbook_url": "https://runbooks.internal/payment-api/high-errors"} }' },
        { table: 'incidents', label: 'Active payment service incident', json: '{ "id": "inc-9a8b7c6d", "status": "firing", "severity": "critical", "first_fired_at": "2025-04-18T14:32:00Z", "assignee_id": 8820, "alert_rule_ids": ["rule-a1b2c3d4", "rule-e5f6g7h8"], "fingerprint": "a3f8c9d2e1b4", "notification_sent_count": 2 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Prometheus scrapes metrics from all services. Alert rules are evaluated by Prometheus every 30 seconds using PromQL. Alertmanager receives fired alerts and sends emails or Slack messages based on routing rules configured in a YAML file.',
      problems: [
        'Single Prometheus instance cannot scale beyond ~1 million active series — a large microservices platform with high-cardinality labels (per-user, per-request) immediately exceeds this limit',
        'Prometheus stores data locally — there is no long-term retention, multi-tenancy, or high availability; if the server fails, all metric history is lost',
        'Alert evaluation competes with query traffic on the same Prometheus instance — heavy dashboard queries delay alert evaluation, causing missed alerts',
        'Alertmanager routing is defined in YAML files managed by hand — no self-service for teams to create and manage their own alert rules',
        'No intelligent alert grouping means a single database outage triggers 500 separate alerts (one per service that depends on the database), flooding on-call with notifications for a single root cause',
      ],
    },

    advancedImplementation: {
      title: 'Horizontally Scaled TSDB with Stream-Based Alert Evaluation and Intelligent Incident Grouping',
      description: 'Metrics flow into an ingest layer that shards by metric name and labels into a cluster of TSDB nodes (Thanos or Cortex). Alert evaluation runs as a separate fleet reading from Kafka (not the TSDB), enabling sub-30-second evaluation without database load. An AI-assisted incident grouping service clusters related alerts into single incidents using label similarity and topology awareness. On-call routing pulls from a schedule service that integrates with PagerDuty schedules.',
      keyPoints: [
        'Thanos or Cortex extends Prometheus for multi-tenancy and horizontal scale: each team owns a Prometheus instance (or a shard of Cortex), and Thanos Query aggregates results across all shards for cross-team queries and dashboards',
        'Dual-write for alert evaluation: metrics are also written to Kafka topics partitioned by metric name; a fleet of alert evaluators subscribe and evaluate alert expressions against a sliding window of recent samples in memory — no TSDB queries needed',
        'Incremental alert state: each alert evaluator maintains an in-memory state machine per rule (OK → PENDING → FIRING → RESOLVED); state is persisted to Redis every 5 seconds so evaluator failures do not reset alert timing',
        'Intelligent alert grouping: incoming fired alerts are fingerprinted by their label set (service, region, alert name); alerts with overlapping labels within a 5-minute window are grouped into a single incident with one notification, preventing alert storms',
        'Inhibition rules: when a critical infrastructure alert fires (database down), lower-severity dependent service alerts are automatically inhibited — the database alert is the root cause, not the 50 application alerts it triggers',
        'Multi-window alert evaluation: critical alerts evaluate over 1-minute windows for fast detection; warning alerts evaluate over 5-minute windows to reduce false positives from momentary spikes',
        'Self-service alert management: teams create and modify alert rules via a UI backed by a Kubernetes CRD or API — no central YAML file to merge into, and each team owns their alert lifecycle independently',
      ],
      databaseChoice: 'Prometheus TSDB for high-resolution recent metrics (15-day local retention); Thanos or Cortex for long-term storage in S3 with unlimited retention and horizontal query scaling; Redis for alert evaluator state and deduplication keys; PostgreSQL for alert rules, incidents, on-call schedules, and notification history; Kafka as the metrics stream for alert evaluation decoupling; PagerDuty or OpsGenie APIs for notification delivery',
      caching: 'Dashboard query results cached in Redis with 30-second TTL to reduce TSDB load during peak dashboard usage; alert rule definitions cached in memory on evaluators and refreshed every 60 seconds; on-call schedule cached in Redis with refresh on rotation; metric metadata cached in Prometheus for fast label autocompletion in UI',
    },

    tips: [
      'Distinguish the three pillars of observability: metrics (aggregated numeric time-series), logs (event records), and traces (distributed request spans) — a monitoring system may handle all three but the interview usually focuses on metrics',
      'High cardinality is a key challenge to raise: per-user or per-request labels create millions of metric series that overwhelm naive TSDB implementations — mention Thanos or Cortex as the solution for Prometheus at scale',
      'Alert fatigue is as important as detection: discuss grouping, inhibition, and deduplication — an alert system that pages too much will be ignored or disabled',
      'Mention the bootstrapping problem: the monitoring system must be more reliable than what it monitors — discuss separate infrastructure, out-of-band health checks, and multi-region deployment',
      'PromQL is the industry standard for metric queries — mentioning it shows familiarity with real tools even if you do not know the syntax deeply',
      'Runbooks are often overlooked: every alert should link to a runbook (step-by-step remediation guide) — this dramatically reduces mean time to resolve for on-call engineers',
    ],

    keyQuestions: [
      {
        question: 'How do you evaluate 100,000 alert rules every 30 seconds without overwhelming the time-series database?',
        answer: `**The Problem with Pull-Based Evaluation**:
\`\`\`
Naive approach: every 30 seconds, for each of 100K rules:
  1. Execute PromQL query against TSDB
  2. Compare result to threshold
  3. Update alert state

100K queries * 30ms average = 3000 seconds of query time
But only 30 seconds available → TSDB is perpetually overloaded
\`\`\`

**Stream-Based Alert Evaluation**:
\`\`\`
Metrics write path:
  Service → Prometheus → Kafka (parallel write) → TSDB

Alert evaluator fleet:
  Kafka consumer reads metrics stream
  For each metric sample arriving:
    1. Look up matching alert rules in memory (rule index by metric name)
    2. Update in-memory sliding window for that metric/rule pair
    3. Evaluate the rule against the window immediately
    4. If threshold breached: update alert state, notify if sustained

Rule index: pre-compiled from PromQL into metric-name → rule lookups
\`\`\`

**Benefits**:
- No TSDB queries during alert evaluation — evaluation happens on the stream
- Sub-second evaluation latency instead of 30-second poll cycles
- Alert evaluation CPU cost is proportional to metric write rate, not rule count

**State Persistence**:
- Evaluator writes alert state (OK/PENDING/FIRING) to Redis every 5 seconds
- On evaluator restart: read state from Redis, resume without losing pending timing
- Kafka partition assignment ensures each metric is always evaluated by the same evaluator instance`,
      },
      {
        question: 'How do you prevent alert storms when a single root cause triggers hundreds of alerts?',
        answer: `**The Alert Storm Problem**:
- Database goes down at 2am
- 200 services that depend on the database all start failing
- Each service has an error rate alert and a latency alert
- Result: 400 separate PagerDuty pages wake up 20 on-call engineers simultaneously
- Reality: there is ONE problem (database) not 400 problems

**Solution 1: Alert Grouping by Label Similarity**:
\`\`\`
Incoming fired alerts within 5-minute window:
  {service: api-gateway, alert: high_error_rate, severity: critical}
  {service: payment-api, alert: high_error_rate, severity: critical}
  {service: user-service, alert: high_error_rate, severity: critical}
  {service: search-api, alert: high_latency, severity: warning}

Grouping: all share {region: us-east-1} label
→ One incident created, one PagerDuty page sent
→ Incident shows: "4 services in us-east-1 are degraded"
\`\`\`

**Solution 2: Inhibition Rules**:
\`\`\`
Rule: "If database-down alert is FIRING for database db-primary,
       SUPPRESS all alerts with label {depends_on: db-primary}"

Effect:
  database-down fires → triggers 400 dependent alerts
  Inhibition rule: 400 dependent alerts are suppressed
  Only 1 page sent: "database db-primary is down"
  On-call engineer fixes the database → all 400 dependent alerts auto-resolve
\`\`\`

**Solution 3: Topology-Aware Grouping**:
- Maintain a service dependency graph (populated from service mesh or config)
- When alerts fire, walk the dependency graph upstream to find the likely root cause
- Surface the root cause alert prominently; mark dependent alerts as "likely downstream effects"`,
      },
    ],

    keyDecisions: [
      'Kafka-based stream evaluation vs TSDB polling for alerts — chose stream evaluation because it eliminates database query load during alert evaluation, reduces evaluation latency from 30 seconds to under 5 seconds, and scales independently of the TSDB',
      'Thanos vs Cortex for long-term Prometheus scaling — both are valid; Thanos is simpler (sidecar per Prometheus instance) but has higher query latency for large time ranges; Cortex is more complex but provides better multi-tenancy and ingestion scaling',
      'Label-based grouping vs topology-based grouping for alert deduplication — label-based is simpler and works for most cases; topology-aware root cause analysis is better for large platforms but requires maintaining an accurate service dependency graph',
      'PagerDuty integration vs building on-call scheduling in-house — chose PagerDuty integration because on-call scheduling (rotations, escalations, holiday coverage, escalation policies) is sufficiently complex that building it from scratch adds no competitive value; integrate with existing tools',
      'Self-service alert rules via API vs centralized YAML — chose API-based self-service because centralized YAML creates a coordination bottleneck and a single YAML file with 100K rules becomes unmergeable; team ownership of alert rules reduces toil and improves alert quality',
    ],
  },

  {
    id: 'live-auction-platform',
    isNew: true,
    title: 'Live Auction Platform',
    subtitle: 'eBay Live / Christie\'s Online / Sotheby\'s',
    icon: 'zap',
    color: '#ec4899',
    difficulty: 'Hard',
    description: 'Design a live auction platform that handles real-time competitive bidding with strong consistency guarantees, preventing double-wins while delivering sub-second bid confirmations to thousands of concurrent bidders.',

    introduction: `Live auction platforms combine the strongest consistency requirements of any e-commerce system with the real-time fan-out requirements of a live streaming platform. When two bidders submit bids within milliseconds of each other, exactly one must win and be notified immediately — a split-second outcome that must be consistent across all observers globally. At the same time, thousands of bidders must see every new bid appear on their screens within a second, creating a fan-out problem at scale.

The concurrency control problem is the heart of live auctions. Unlike typical e-commerce where a few concurrent purchases compete for inventory, an auction may have 5,000 bidders all attempting to place the winning bid in the final 30 seconds. Database row-level locking would serialize all these attempts, creating a bottleneck. Optimistic locking avoids the bottleneck but requires a retry strategy that does not degrade under high contention.

Anti-sniping mechanisms exist to preserve auction fairness. In physical auctions, bidding in the last second is impossible — the auctioneer calls time. Online, without protection, automated bots can place bids in the last millisecond, preventing human bidders from responding. Extending the auction timer when a bid arrives near the end (typically 10-15 minutes of remaining time) replicates the fairness of physical auctions.

Proxy bidding (auto-bid) is a feature that allows bidders to set a maximum price and have the system automatically outbid competitors up to that maximum. This requires the system to maintain confidential maximum bid amounts and raise the current price only as needed — revealing the proxy maximum would enable other bidders to game it.`,

    functionalRequirements: [
      'Display real-time current bid, bid history, and auction countdown timer to all viewers',
      'Accept bids from authenticated bidders and immediately confirm acceptance or rejection',
      'Enforce that each new bid must exceed the current price by at least the minimum increment',
      'Implement anti-sniping by extending the auction timer when bids arrive near the end',
      'Support proxy bidding where the system automatically bids on behalf of a user up to their configured maximum',
      'Prevent shill bidding by detecting when sellers or their associates bid on their own items',
      'Send push notifications to outbid users immediately so they can counter-bid',
      'Process payment authorization for winning bidders and handle failed payment recovery',
    ],

    nonFunctionalRequirements: [
      'Bid acceptance or rejection response under 500ms at p99 for all concurrent bidders',
      'Bid update fan-out to all viewers within 1 second of bid acceptance',
      'Zero double-wins — exactly one bidder wins at any final price, guaranteed',
      'Support 10,000 concurrent bidders on a single high-value auction item',
      'Auction timer accuracy within 500ms across all viewer clocks globally',
      'Payment processing must complete or fail within 30 minutes of auction end before lot is re-listed',
    ],

    estimation: {
      users: '10K concurrent bidders per top auction; 1M concurrent viewers across all live auctions; 100K auctions running simultaneously',
      storage: '100K auctions * 1000 bids avg * 200 bytes = 20GB/day bid history; auction catalog: 100K items * 5MB photos = 500GB images on CDN',
      bandwidth: '1M viewers * 1 bid update/5sec * 500 bytes = 100MB/sec fan-out; bid submission: 10K bidders * 10 bids/sec peak = 50MB/sec inbound',
      qps: '10K concurrent bid attempts/sec during auction end frenzy; 200K WebSocket push messages/sec fan-out; 1K payment processing events/sec after auction ends',
    },

    apiDesign: {
      description: 'WebSocket for real-time bid streaming and timer updates; REST for bid submission, proxy configuration, and auction management',
      endpoints: [
        { method: 'POST', path: '/api/v1/auctions/{auction_id}/bids', params: '{ bidder_id, amount_cents, bid_token }', response: '{ status: accepted|rejected, current_price_cents, new_end_time?, your_rank }', description: 'Place a bid; bid_token is a unique client-generated nonce for idempotency; response is synchronous (500ms max)' },
        { method: 'GET', path: '/api/v1/auctions/{auction_id}/stream', params: 'WebSocket upgrade', response: 'Stream of: { type: bid_placed|timer_extended|auction_ended, current_price, bidder_count, end_time }', description: 'WebSocket stream for real-time auction updates pushed to all viewers' },
        { method: 'POST', path: '/api/v1/auctions/{auction_id}/proxy', params: '{ bidder_id, max_amount_cents }', response: '{ status, current_proxy_position }', description: 'Set or update proxy (auto-bid) maximum; maximum amount is stored encrypted and never revealed to other bidders' },
        { method: 'GET', path: '/api/v1/auctions/{auction_id}', params: '', response: '{ id, title, current_price_cents, end_time, bid_count, reserve_price_met, my_proxy_max?, bid_history[last_10] }', description: 'Current auction state for initial page load' },
        { method: 'POST', path: '/api/v1/auctions/{auction_id}/end', params: 'Internal; triggered by timer service', response: '{ winner_id, final_price_cents }', description: 'Internal endpoint called when auction timer expires; triggers payment authorization for winner' },
      ],
    },

    dataModel: {
      description: 'Auction state in Redis for low-latency bid acceptance; persistent bid history and proxy bids in PostgreSQL; winner and payment state in PostgreSQL',
      schema: `auctions {
  id: uuid PK
  seller_id: bigint FK
  title: varchar(300)
  starting_price_cents: bigint
  reserve_price_cents: bigint  -- secret minimum for seller
  current_price_cents: bigint
  minimum_increment_cents: bigint
  status: enum(scheduled, live, ended, cancelled)
  start_time: timestamp
  original_end_time: timestamp
  current_end_time: timestamp  -- updated by anti-snipe extensions
  extension_count: int
  winner_id: bigint FK nullable
  created_at: timestamp
}

bids {
  id: bigint PK (snowflake — monotonic, embedded timestamp)
  auction_id: uuid FK
  bidder_id: bigint FK
  amount_cents: bigint
  bid_token: varchar(36) unique  -- client nonce for idempotency
  type: enum(manual, proxy_auto)
  status: enum(leading, outbid, won, payment_failed)
  placed_at: timestamp
}

proxy_bids {
  auction_id: uuid FK
  bidder_id: bigint FK
  max_amount_cents: bigint  -- stored encrypted
  current_proxy_bid_cents: bigint  -- current auto-bid level, may be lower than max
  updated_at: timestamp
  PRIMARY KEY (auction_id, bidder_id)
}

payments {
  id: uuid PK
  auction_id: uuid FK
  winner_id: bigint FK
  amount_cents: bigint
  status: enum(pending, authorized, captured, failed, waived)
  payment_intent_id: varchar(100)  -- Stripe PaymentIntent
  authorized_at: timestamp nullable
  captured_at: timestamp nullable
}`,
      examples: [
        { table: 'auctions', label: 'Live high-value auction in final minutes', json: '{ "id": "auc-c3d4e5f6", "title": "Picasso Blue Period Sketch, 1902", "starting_price_cents": 100000, "current_price_cents": 4250000, "minimum_increment_cents": 50000, "status": "live", "current_end_time": "2025-04-18T21:45:00Z", "extension_count": 3, "bid_count": 47 }' },
        { table: 'bids', label: 'Proxy auto-bid placed by system', json: '{ "id": 9203847561, "auction_id": "auc-c3d4e5f6", "bidder_id": 88201, "amount_cents": 4250000, "type": "proxy_auto", "status": "leading", "placed_at": "2025-04-18T21:44:12.334Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A web server accepts bid submissions, validates them against the current price stored in PostgreSQL, inserts the bid row, and broadcasts the update to all connected clients via a Redis Pub/Sub channel.',
      problems: [
        'Database row locking on the auction row serializes all concurrent bid attempts — at 10,000 simultaneous bidders, the last bidder waits for 9,999 lock acquisitions before their turn, exceeding the 500ms latency target',
        'Without atomic compare-and-update, two concurrent bids can both read the same current_price and both pass validation, resulting in two winning bids for the same price',
        'No proxy bidding support means users who cannot watch the auction in real time cannot participate competitively',
        'Redis Pub/Sub does not persist messages — if a WebSocket server restarts during an auction, it loses all subscriber state and misses in-flight bids',
        'No idempotency for bid submission — a network retry from a bidder submits a duplicate bid, potentially jumping the price twice',
      ],
    },

    advancedImplementation: {
      title: 'Redis Atomic Bid Acceptance with PostgreSQL Persistence and Proxy Bidding Engine',
      description: 'Bid acceptance uses a Redis Lua script for atomic compare-and-swap: the script checks the current price, validates the increment, sets the new price and winner, and returns success or failure — all atomically without race conditions. PostgreSQL persists the authoritative bid history asynchronously after Redis acceptance. A proxy bidding engine subscribes to bid events and automatically places counter-bids up to each proxy maximum. WebSocket fan-out uses a pub/sub layer backed by Kafka for durability.',
      keyPoints: [
        'Redis Lua script for atomic bid acceptance: EVAL executes check-and-set atomically — read current_price, compare to bid amount, if valid set new current_price and leading_bidder atomically; if another bid arrived between the check and set the script fails and the client retries',
        'Bid idempotency via bid_token: client generates a UUID before submitting; Redis stores bid_token → result mapping with 5-minute TTL; a retried bid with the same token returns the cached result without re-processing',
        'Anti-sniping via atomic timer extension: the Lua script also checks time_remaining; if under 10 minutes it atomically extends current_end_time by 10 minutes and increments extension_count; this happens atomically with bid acceptance',
        'Proxy bidding engine: a separate service subscribes to bid_accepted events from Kafka; for each new leading bid, it checks all proxy_bids for this auction, finds the highest proxy maximum above the new price, and places an automatic counter-bid at minimum_increment above the new leader if the proxy maximum allows it',
        'Optimistic concurrency for PostgreSQL persistence: bid rows are written asynchronously after Redis acceptance; if the write fails (extremely rare), the Redis state is authoritative and a reconciliation job catches up',
        'Shill bidding detection: bids from accounts with the same payment method, IP range, or device fingerprint as the seller trigger a manual review flag and suppress the bid from the public feed pending review',
        'Timer synchronization: the authoritative end time lives in Redis; a clock service pushes countdown updates via WebSocket every second; clients display the server-synchronized timer rather than counting down locally to prevent drift',
      ],
      databaseChoice: 'Redis for atomic bid state (current price, leading bidder, timer, proxy maxima); PostgreSQL for authoritative bid history, auction catalog, user accounts, and payments; Kafka for bid event fan-out to WebSocket servers and proxy bidding engine; Stripe for payment authorization and capture; S3 and CDN for auction catalog images; DynamoDB or Redis for bid_token idempotency cache',
      caching: 'Current auction state (price, timer, bid count) cached in Redis and served directly to WebSocket fan-out; auction catalog and images served from CDN with long TTL; bidder account status and payment method cached with 5-minute TTL to avoid authorization database queries on every bid; proxy bid maxima cached in the proxy bidding service memory with invalidation on update',
    },

    tips: [
      'The atomic bid acceptance problem is the core of this design — explain how Redis Lua scripts provide atomic compare-and-swap without database row locking',
      'Proxy bidding is a great detail: explain that the maximum is confidential and the system bids only as much as needed to stay in the lead, not the full maximum immediately',
      'Anti-sniping is a real feature on eBay and most major auction platforms — mentioning it shows awareness of auction fairness mechanics',
      'Idempotency is critical: a bidder whose request times out will retry, and without idempotency that retry becomes a duplicate bid',
      'Payment authorization at auction end is a separate system: discuss the two-step auth-then-capture pattern, what happens if the winning bidder payment fails (second-highest bidder offered the item), and the time window for payment',
      'Timer synchronization across globally distributed clients is a subtle problem — mention that the timer must come from the server, not the client clock',
    ],

    keyQuestions: [
      {
        question: 'How do you handle two bidders submitting bids simultaneously for the same auction?',
        answer: `**The Race Condition**:
\`\`\`
Current price: $4,200,000
Bidder A submits: $4,300,000 at time T
Bidder B submits: $4,250,000 at time T+1ms

Without atomic protection:
  Thread 1 reads price: $4,200,000 → $4,300,000 is valid
  Thread 2 reads price: $4,200,000 → $4,250,000 is valid
  Thread 1 writes: current_price = $4,300,000, winner = A
  Thread 2 writes: current_price = $4,250,000, winner = B ← incorrect!
  Result: lower bid B wins over higher bid A
\`\`\`

**Redis Lua Script (Atomic)**:
\`\`\`lua
-- Runs atomically; no other Redis commands execute during this script
local current = redis.call('HGET', 'auction:auc-123', 'current_price')
local min_next = tonumber(current) + tonumber(ARGV[3])  -- minimum increment
local bid_amount = tonumber(ARGV[2])

if bid_amount < min_next then
  return {0, 'BID_TOO_LOW', current}
end

redis.call('HSET', 'auction:auc-123',
  'current_price', bid_amount,
  'leading_bidder', ARGV[1],
  'last_bid_at', ARGV[4])

-- Anti-snipe: extend timer if needed
local end_time = redis.call('HGET', 'auction:auc-123', 'end_time')
local now = tonumber(ARGV[4])
if (tonumber(end_time) - now) < 600 then
  redis.call('HSET', 'auction:auc-123', 'end_time', now + 600)
  redis.call('HINCRBY', 'auction:auc-123', 'extensions', 1)
end

return {1, 'ACCEPTED', bid_amount}
\`\`\`

**Result**:
- Bidder A's script runs first: price → $4,300,000, A is leading
- Bidder B's script runs next: $4,250,000 < $4,300,000 + increment → BID_TOO_LOW
- B is notified: "Your bid was outbid. Current price is $4,300,000"
- Zero possibility of double-win`,
      },
      {
        question: 'How does proxy (automatic) bidding work?',
        answer: `**Proxy Bidding Flow**:
\`\`\`
Bidder A sets proxy maximum: $5,000,000 (kept secret)
Current price: $4,200,000

When another bidder B bids $4,300,000:
  Proxy engine sees: B now leads at $4,300,000
  A's proxy max ($5,000,000) > $4,300,000 + increment ($4,350,000)?  YES
  Proxy engine places bid on A's behalf: $4,350,000
  Result: A immediately re-takes the lead

When bidder C bids $4,900,000:
  Proxy engine: A's max ($5,000,000) > $4,900,000 + $50,000 = $4,950,000?  YES
  Proxy engine places: $4,950,000 for A

When bidder D bids $5,100,000:
  Proxy engine: A's max ($5,000,000) < $5,100,000?  NO (max exceeded)
  Proxy engine does NOT bid
  A is outbid; A receives push notification: "You've been outbid. Current price: $5,100,000"
\`\`\`

**Confidentiality of Proxy Maximum**:
- Proxy maximum stored encrypted in the database
- The system only bids the minimum necessary to stay in the lead
- Other bidders never learn A's maximum from the bid history
- If A is the only bidder, the auction ends at the starting price even if A's proxy max is $10M

**Proxy vs Proxy Collision**:
- If A (max $5M) and B (max $4.8M) both have proxies active:
  - System bids A up to $4.85M (just above B's max)
  - B's proxy max is exhausted; B is notified as outbid
  - Auction ends with A winning at $4.85M, not at A's $5M max`,
      },
    ],

    keyDecisions: [
      'Redis Lua script vs database row locking for bid acceptance — chose Redis Lua because it provides atomic compare-and-swap without locking overhead; database row locking at 10K concurrent bidders serializes all bids and exceeds the 500ms latency target under load',
      'Optimistic locking vs Redis for bid state — Redis is the right choice here because optimistic locking in PostgreSQL still requires database round-trips and retry logic under high contention; Redis Lua eliminates contention entirely',
      'Proxy engine as separate service vs inline in bid path — chose separate service because the proxy bidding logic can trigger a cascade of counter-bids between proxy bidders; running it inline blocks the bid response path and risks stack overflow in recursive proxy chains',
      'Anti-sniping as atomic extension vs separate timer service — chose atomic extension in the bid acceptance Lua script because any delay between bid acceptance and timer extension creates a race condition where the auction could end before the extension is applied',
      'Kafka for WebSocket fan-out vs Redis Pub/Sub — chose Kafka because it persists messages, allowing WebSocket servers that restart mid-auction to replay missed bids and maintain consistent state for all viewers; Redis Pub/Sub would drop messages to disconnected servers',
    ],
  },

  {
    id: 'realtime-presence',
    isNew: true,
    title: 'Real-Time Presence System',
    subtitle: 'Slack Online Status / Discord / WhatsApp Last Seen',
    icon: 'zap',
    color: '#0ea5e9',
    difficulty: 'Medium',
    description: 'Design a real-time presence system that tracks online status, last-seen timestamps, and typing indicators for millions of users and efficiently fans out presence changes to relevant contacts.',

    introduction: `Presence systems seem simple — track who is online and tell their contacts. In practice, presence is one of the trickiest real-time problems because of the fan-out mathematics. If a popular user with 1,000 friends comes online, their status change must be delivered to 1,000 contacts immediately. If 1 million users come online in the morning, the system generates 1 billion presence fan-out events in a short window — a thundering herd in both directions.

The definition of online is deceptively complex. A mobile user who received a push notification, opened the app, read a message, and put the phone in their pocket is now in background mode — their WebSocket connection may still be alive, but they are not actively engaged. A desktop user who walked away from their computer still has an active WebSocket but is effectively offline. Different products make different choices about background vs active status, and these choices affect both the engineering and the user experience.

Typing indicators are an ephemeral form of presence that pose their own challenges. They must appear instantly when a user starts typing and disappear quickly when they stop or send the message. Storing typing indicators in a database would be wasteful — they are irrelevant milliseconds after they change. They must be implemented as ephemeral state that is pushed and does not persist.

Privacy is a first-class concern in presence systems. WhatsApp allows users to hide their last-seen timestamp from specific contacts or all contacts. LinkedIn shows profile views only to premium members. The presence system must enforce privacy rules on the fan-out path, not just on read, to prevent leaking presence data through timing side-channels.`,

    functionalRequirements: [
      'Track whether each user is online, away, or offline and maintain last-seen timestamps',
      'Fan out presence status changes to all of a user changed status contacts',
      'Support typing indicators that appear when a user is composing a message and vanish when they stop or send',
      'Show read receipts indicating when a message has been seen by the recipient',
      'Allow users to control visibility of their presence and last-seen to different contact groups',
      'Support workspace-level presence aggregation showing how many team members are currently online',
      'Detect mobile background state separately from fully offline state',
      'Provide a REST API for clients to query the current presence of a list of users efficiently',
    ],

    nonFunctionalRequirements: [
      'Presence status change visible to contacts within 2 seconds of the event',
      'Support 50 million simultaneously connected users',
      'Each user can have up to 1,000 contacts who receive their presence updates',
      'Typing indicator latency under 300ms from keystroke to display on recipient screen',
      'Last-seen queries must return results under 50ms for up to 100 users per request',
      'Privacy rules must be enforced with zero information leakage even through timing or error response differences',
    ],

    estimation: {
      users: '50M concurrent users; average 300 contacts per user; morning rush: 5M users come online in 10 minutes',
      storage: '50M users * 50 bytes presence state = 2.5GB in Redis; last-seen: 50M * 20 bytes = 1GB in Redis; typing indicators: ephemeral, no persistent storage',
      bandwidth: '5M users coming online in 10 min * 300 contacts * 100 bytes = 150TB of fan-out in 10 minutes = 250GB/sec peak; steady state: much lower',
      qps: '50M users * 1 heartbeat/30sec = 1.7M heartbeats/sec; peak fan-out: 5M * 300 / 10 = 25M presence updates/sec during morning rush',
    },

    apiDesign: {
      description: 'WebSocket for real-time presence push; REST for bulk presence queries and privacy settings',
      endpoints: [
        { method: 'MQTT/WS HEARTBEAT', path: 'presence/heartbeat', params: '{ user_id, status: active|away|background, device_type }', response: 'Server updates TTL on user presence key', description: 'Client sends heartbeat every 30 seconds; server marks user offline if 2 consecutive heartbeats are missed' },
        { method: 'GET', path: '/api/v1/presence', params: 'user_ids=id1,id2,...(up to 100)', response: '{ presences: [{user_id, status, last_seen_at, visible_to_me}] }', description: 'Bulk presence query for a list of user IDs; respects privacy settings of each queried user' },
        { method: 'POST', path: '/api/v1/presence/typing', params: '{ user_id, conversation_id, is_typing: bool }', response: '204 No Content', description: 'Update typing indicator state; pushed to other conversation members via WebSocket; no database storage' },
        { method: 'PUT', path: '/api/v1/presence/settings', params: '{ last_seen_visibility: everyone|contacts|nobody, status_visibility: everyone|contacts|nobody }', response: '{ settings }', description: 'Update privacy settings controlling who can see this user presence and last-seen' },
        { method: 'GET', path: '/api/v1/workspaces/{workspace_id}/presence', params: '', response: '{ online_count, away_count, offline_count, online_users[first_20] }', description: 'Workspace-level presence summary for sidebar display' },
      ],
    },

    dataModel: {
      description: 'Presence state in Redis with TTL-based offline detection; privacy settings and contact graphs in PostgreSQL; typing indicators are ephemeral and never stored',
      schema: `-- Redis keys (not SQL):
-- presence:{user_id} → HASH { status, last_seen_at, device_type }
--   TTL: 65 seconds (refreshed by heartbeat every 30s; expires if 2 missed)
-- typing:{conversation_id}:{user_id} → string "1"
--   TTL: 5 seconds (refreshed while typing; vanishes when stopped)
-- workspace_online:{workspace_id} → SET of online user_ids

-- PostgreSQL:
presence_settings {
  user_id: bigint PK FK → users.id
  last_seen_visibility: enum(everyone, contacts, nobody)
  status_visibility: enum(everyone, contacts, nobody)
  updated_at: timestamp
}

contact_relationships {
  user_id: bigint
  contact_id: bigint
  type: enum(friend, follower, coworker, blocked)
  created_at: timestamp
  PRIMARY KEY (user_id, contact_id)
}

users {
  id: bigint PK
  name: varchar(200)
  -- last_seen_at stored in Redis; PostgreSQL copy updated every 5 minutes
  last_seen_at: timestamp
}`,
      examples: [
        { table: 'presence_settings', label: 'User with strict privacy settings', json: '{ "user_id": 100291, "last_seen_visibility": "contacts", "status_visibility": "everyone" }' },
        { table: 'contact_relationships', label: 'Mutual friends relationship', json: '{ "user_id": 100291, "contact_id": 100502, "type": "friend", "created_at": "2024-11-03T10:15:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Each user connection is tracked in a database row with a last-heartbeat timestamp. A cron job runs every minute and marks users offline if their last heartbeat is older than 90 seconds. Presence is fetched by clients polling the database every 30 seconds.',
      problems: [
        'Polling every 30 seconds means presence changes take up to 30 seconds to appear for contacts — unacceptable for a chat application where online status drives whether users initiate conversations',
        'Cron job marking users offline runs every minute, meaning a disconnected user appears online for up to 60 extra seconds after disconnecting',
        'Database polling from millions of clients creates enormous read load — 50 million users checking 300 contacts every 30 seconds is 50 billion database reads per day',
        'No fan-out mechanism: when a user changes status, their contacts must wait for their next poll cycle to see the change',
        'No typing indicator support: there is no ephemeral state mechanism in this architecture',
      ],
    },

    advancedImplementation: {
      title: 'Redis TTL-Based Presence with Server-Fan-Out via Contact Graph Lookup',
      description: 'User presence is stored in Redis with a TTL of 65 seconds refreshed by heartbeats every 30 seconds. When a TTL expires (user goes offline) or a user actively changes status, the presence service looks up the user contact list, shards it by WebSocket server ownership, and pushes updates to the appropriate servers which forward to connected contacts. Typing indicators use a separate Redis key with a 5-second TTL — no storage, pure ephemeral push.',
      keyPoints: [
        'TTL-based offline detection: each heartbeat runs SETEX presence:{user_id} 65s "online" — if the client stops sending heartbeats, the key expires and a Keyspace Notification triggers the offline fan-out event',
        'Redis Keyspace Notifications for expiry events: when a presence key expires (client disconnected without explicit logout), Redis publishes a __keyevent__:expired notification that the presence service consumes to trigger the fan-out',
        'Contact graph sharding: when fanning out a status change for user U with 1,000 contacts, the presence service looks up the contact list in PostgreSQL (cached in Redis for active users), groups contacts by which WebSocket server they are connected to, and sends one bulk message per WebSocket server rather than 1,000 individual pushes',
        'Typing indicator via ephemeral Redis key: POST /presence/typing sets typing:{conversation_id}:{user_id}=1 with a 5-second TTL; while the user types, the client refreshes the key every 3 seconds; when they stop, the key expires naturally; server pushes the update to conversation members via WebSocket without any database write',
        'Read receipts via acknowledgement messages: when a message is displayed on screen the client sends a receipt event; the server persists the receipt and pushes a read notification to the message sender — implemented similarly to a typing indicator but persisted',
        'Privacy enforcement on fan-out: before pushing a presence update to a contact, the service checks the user privacy settings; if the user has set last_seen_visibility=contacts, the service verifies the recipient is in the contact list before including last-seen in the pushed update',
        'Morning rush handling: presence updates are debounced — if a user goes online, the fan-out is scheduled 1 second later; if the user status changes again within that window (online → away → online), only the final state is fanned out, reducing fan-out volume during mass reconnection events',
      ],
      databaseChoice: 'Redis for all presence state (online status with TTL, typing indicators with TTL, workspace online sets, contact list cache); PostgreSQL for contact graphs, privacy settings, and durable last-seen timestamps (synced from Redis every 5 minutes); Kafka for presence change events that drive WebSocket server fan-out across a cluster; WebSocket gateway servers that maintain persistent connections and receive fan-out messages from Kafka',
      caching: 'Contact lists cached in Redis per active user (refreshed on contact add/remove) to avoid PostgreSQL lookups on every fan-out event; workspace member counts cached in Redis with 30-second TTL for sidebar display; privacy settings cached in presence service memory with invalidation on settings update; WebSocket server connection registry (user_id → server_id mapping) cached in Redis for fan-out routing',
    },

    tips: [
      'The fan-out math is the core challenge: mention that 50M users * 300 contacts = 15B presence subscriptions — explain how you avoid N^2 fan-out via contact graph partitioning',
      'TTL-based offline detection is the right pattern: explain that a client that crashes without sending a disconnect message must still be detected as offline — TTL solves this without a polling job',
      'Typing indicators are a classic interview question: emphasize that they are ephemeral — no database writes, just Redis TTL + WebSocket push',
      'Privacy enforcement must happen at the fan-out layer, not just at read time: a privacy-conscious design prevents leaking presence even through side-channel timing',
      'Distinguish mobile background from fully offline: a backgrounded mobile app keeps the WebSocket alive on iOS but may be killed on Android; different heartbeat timeout strategies are needed per platform',
      'Workspace-level presence aggregation (X people online) is much simpler than individual presence — use a Redis SET per workspace and SCARD for count; no need to fan-out to every member individually',
    ],

    keyQuestions: [
      {
        question: 'How do you fan out a presence update to hundreds of contacts efficiently?',
        answer: `**The Fan-Out Problem**:
\`\`\`
User A (500 contacts) comes online
Naive approach:
  For each of 500 contacts:
    Find which WebSocket server they are on
    Send presence update to that server
    Server pushes to connected contact
= 500 individual lookups + 500 individual pushes = slow and expensive
\`\`\`

**Optimized Fan-Out**:
\`\`\`
Step 1: Load contact list from Redis (cached, O(1))
  contacts = SMEMBERS user:A:contacts  → [B, C, D, ..., 500 users]

Step 2: Look up which server each contact is connected to
  MGET conn:B, conn:C, conn:D, ...
  → {server-1: [B, E, F, ...], server-2: [C, G, ...], server-3: [D, H, ...]}

Step 3: One bulk message per WebSocket server
  Kafka publish to server-1: { update: {user: A, status: online}, recipients: [B, E, F] }
  Kafka publish to server-2: { update: {user: A, status: online}, recipients: [C, G] }
  Kafka publish to server-3: { update: {user: A, status: online}, recipients: [D, H] }

Step 4: Each server pushes to its connected subset
  Server-1 pushes to B, E, F's WebSocket connections
\`\`\`

**Result**:
- 3 Kafka messages instead of 500 individual deliveries
- Each server does O(K) pushes where K is contacts on that server
- Fan-out is parallelized across the entire WebSocket server fleet`,
      },
      {
        question: 'How do you implement typing indicators without database writes?',
        answer: `**Requirements**:
- Appear within 300ms of first keystroke
- Vanish automatically when user stops typing (no explicit "stopped typing" event needed)
- Do not survive server restarts (ephemeral by nature)
- Must not create database load

**Redis TTL Implementation**:
\`\`\`
When user starts typing:
  Client sends: POST /presence/typing { conversation_id: 42, is_typing: true }
  Server: SETEX typing:42:{user_id} 5 "1"
  Server: push to conversation members via WebSocket:
          { type: "typing", user_id: 99201, is_typing: true }

While user continues typing (client sends refresh every 3s):
  Server: SETEX typing:42:{user_id} 5 "1"  (reset TTL)
  No WebSocket push if already showing as typing

When user sends message or stops typing for 5s:
  Redis TTL expires: key deleted automatically
  Server (via Keyspace Notification): push to conversation members:
          { type: "typing", user_id: 99201, is_typing: false }
\`\`\`

**Why No Database Write**:
- Typing state is irrelevant the moment it changes
- A server crash during typing: indicator vanishes (TTL expires) → looks like user stopped typing → correct behavior
- Storing typing in DB would require cleanup jobs, create write hotspots on active conversations, and add latency

**Edge Cases**:
- User opens two devices: both can send typing indicators; server deduplicates (if any device is typing, show typing)
- Large group chat with 50 people typing: throttle to show at most 3 names + "and others" to avoid UI noise`,
      },
    ],

    keyDecisions: [
      'TTL-based offline detection vs heartbeat polling — chose TTL because it handles crash detection without a polling job; a client that crashes silently is automatically marked offline when the TTL expires, whereas polling requires a separate job and adds a lag equal to the polling interval',
      'Redis for presence state vs PostgreSQL — chose Redis because presence requires sub-millisecond reads and writes with automatic expiry; PostgreSQL does not support TTL natively and polling for expired rows adds unacceptable lag',
      'Server-side fan-out vs client-side subscription — chose server-side fan-out because clients cannot efficiently subscribe to 1,000 individual user presence topics; server-side fan-out routes updates from the changed user to connected contacts using the contact graph',
      'Ephemeral Redis keys for typing vs persisted typing state — chose ephemeral because typing state is meaningless after 5 seconds; persistence adds database load and cleanup complexity with no benefit',
      'Privacy enforcement at fan-out vs at read time — chose fan-out enforcement because read-time enforcement still sends the presence update to the WebSocket server (just omitting the last-seen field) which can leak information through message timing; enforcing at fan-out prevents the update from being sent at all to unauthorized contacts',
    ],
  },

  {
    id: 'realtime-geospatial-tracking',
    isNew: true,
    title: 'Real-Time Geospatial Tracking System',
    subtitle: 'Uber Driver Tracking / DoorDash Delivery / Fleet Management',
    icon: 'globe',
    color: '#16a34a',
    difficulty: 'Hard',
    description: 'Design a geospatial tracking system that ingests high-frequency location updates from millions of mobile devices, enables proximity queries, and pushes real-time location updates to observers with sub-second latency.',

    introduction: `Real-time geospatial tracking powers some of the most visible consumer experiences in technology — watching your Uber driver approach on a live map, tracking a DoorDash courier's route, or monitoring a fleet of delivery trucks. The engineering challenge spans three distinct problems: efficiently storing and querying spatial data, ingesting millions of location updates per second from mobile devices, and pushing smooth location animations to millions of concurrent observers.

Geospatial indexing is a specialized domain where traditional database B-tree indexes fail. Finding all drivers within 3km of a coordinate is a two-dimensional range query that a one-dimensional index cannot satisfy efficiently. Solutions like H3 hexagonal grids, QuadTrees, R-trees, and S2 cells partition the Earth's surface into a hierarchy of cells, enabling proximity queries that are O(log n) rather than O(n) full scans.

The location update rate creates a write amplification problem. A driver sends GPS coordinates every 3-5 seconds. With 1 million active drivers, that is 200,000-333,000 writes per second to a spatial index that must be kept current for proximity queries. Traditional relational databases with geospatial extensions (PostGIS) cannot sustain this write rate without careful sharding and connection pooling.

Battery and data efficiency are critical for mobile tracking apps. A navigation app that sends GPS coordinates every second on cellular would drain a phone battery in 2-3 hours and use gigabytes of data per month. Intelligent location update strategies — increasing frequency when moving, reducing when stationary, using geofences to trigger updates on boundary crossing — are essential for production viability.`,

    functionalRequirements: [
      'Ingest GPS location updates from mobile devices at configurable intervals (1-10 seconds)',
      'Enable proximity queries to find all entities within a radius of a given coordinate',
      'Push real-time location updates to observers such as passengers watching drivers or dispatch systems',
      'Trigger geofence events when a tracked entity enters or exits a defined geographic boundary',
      'Store location history for route replay and compliance purposes',
      'Estimate ETAs based on current position, route, and real-time traffic conditions',
      'Support batch queries returning the current locations of a list of entity IDs',
      'Adapt update frequency dynamically based on velocity and context to conserve battery',
    ],

    nonFunctionalRequirements: [
      'Location update ingestion latency under 100ms from device transmission to system acknowledgement',
      'Proximity query response under 50ms for queries within a 5km radius at any scale',
      'Location push to observers within 500ms of new position update being ingested',
      'Support 1 million simultaneously tracked entities sending updates',
      'Location history retention for 90 days with efficient time-range query support',
      'Geofence evaluation latency under 200ms from update ingestion to event trigger',
    ],

    estimation: {
      users: '1M active tracked entities; 5M concurrent observers (passengers, dispatchers)',
      storage: '1M entities * 1 update/4sec * 50 bytes * 86400 = ~1TB/day location history; current positions: 1M * 100 bytes = 100MB in Redis',
      bandwidth: '1M entities * 50 bytes/update * 0.25 updates/sec = 12.5MB/sec inbound; 5M observers * 500 bytes/update * 0.25 updates/sec = 625MB/sec outbound push',
      qps: '250K location writes/sec; 10K proximity queries/sec; 5M WebSocket push messages/sec to observers',
    },

    apiDesign: {
      description: 'REST API for location ingestion and queries; WebSocket for real-time location push to observers',
      endpoints: [
        { method: 'POST', path: '/api/v1/locations', params: '{ entity_id, entity_type, lat, lng, accuracy_m, heading_deg, speed_mps, timestamp_ms }', response: '{ accepted, next_update_in_ms }', description: 'Ingest a location update from a tracked entity; response includes adaptive update interval recommendation' },
        { method: 'GET', path: '/api/v1/locations/nearby', params: 'lat, lng, radius_m, entity_type?, limit=50', response: '{ entities[{id, lat, lng, heading, speed, updated_at, distance_m}], total_count }', description: 'Find all tracked entities within the specified radius; returns distance-sorted results' },
        { method: 'GET', path: '/api/v1/entities/{entity_id}/track', params: 'WebSocket upgrade', response: 'Stream: { lat, lng, heading, speed, timestamp }', description: 'Subscribe to real-time location updates for a specific entity (e.g., passenger watching their driver)' },
        { method: 'POST', path: '/api/v1/geofences', params: '{ name, type: circle|polygon, coordinates, entity_types[], callback_url }', response: '{ geofence_id }', description: 'Create a geofence; system calls callback_url when any matching entity enters or exits' },
        { method: 'GET', path: '/api/v1/entities/{entity_id}/history', params: 'start_time, end_time, resolution_seconds=60', response: '{ points[{lat, lng, timestamp, speed}] }', description: 'Retrieve location history for route replay with configurable resolution' },
      ],
    },

    dataModel: {
      description: 'Current positions in Redis with geospatial index; location history in time-series storage; geofence definitions in PostgreSQL',
      schema: `-- Redis data structures:
-- GEOADD locations:drivers lng lat entity_id
--   (Redis Geo commands use sorted set internally with score=geohash)
-- HSET entity:driver_123 lat ... lng ... heading ... speed ... updated_at ...
--   TTL: 60 seconds (entity marked inactive if no update)

-- PostgreSQL:
entities {
  id: varchar(64) PK
  type: enum(driver, courier, vehicle, asset)
  owner_id: bigint FK nullable
  status: enum(active, inactive, offline)
  metadata: jsonb  -- vehicle make, driver name, etc.
  created_at: timestamp
}

geofences {
  id: uuid PK
  name: varchar(200)
  type: enum(circle, polygon)
  center_lat: float8 nullable  -- for circle
  center_lng: float8 nullable
  radius_m: float8 nullable
  polygon: geometry(POLYGON, 4326) nullable  -- PostGIS for polygon
  entity_types: text[]
  callback_url: varchar(500)
  active: boolean
  created_at: timestamp
}

-- Location history in TimescaleDB:
location_history {
  entity_id: varchar(64)
  event_time: timestamp  -- device-reported
  received_at: timestamp
  lat: float8
  lng: float8
  accuracy_m: float4
  heading_deg: float2
  speed_mps: float4
  -- Hypertable partitioned by event_time (daily chunks)
  -- Compressed after 7 days, retained for 90 days
}`,
      examples: [
        { table: 'geofences', label: 'Airport pickup zone geofence', json: '{ "id": "geo-a1b2c3d4", "name": "LAX Terminal 1 Pickup Zone", "type": "circle", "center_lat": 33.9425, "center_lng": -118.4081, "radius_m": 200, "entity_types": ["driver"], "callback_url": "https://dispatch.internal/geofence-events", "active": true }' },
        { table: 'entities', label: 'Active Uber driver', json: '{ "id": "driver-88201", "type": "driver", "owner_id": 88201, "status": "active", "metadata": {"vehicle_make": "Toyota", "vehicle_model": "Camry", "license_plate": "7ABC123"} }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Location updates are stored as rows in a PostgreSQL table with lat and lng columns. Proximity queries use a Haversine distance calculation in a SQL WHERE clause. Passengers refresh the driver position by polling the API every 5 seconds.',
      problems: [
        'Full table scan for proximity queries against 1M entities using Haversine formula in SQL takes seconds, not milliseconds — no spatial index is used',
        '250K writes per second overwhelms a single PostgreSQL instance — write throughput becomes the bottleneck',
        'Polling every 5 seconds means passengers see jerky, delayed driver movement rather than smooth animation',
        'No geofence evaluation — there is no efficient way to check if any of 1M entities has crossed any of thousands of geofences on every location update',
        'Storing every raw GPS update in PostgreSQL wastes storage — a driver generates 17,280 rows per day even when not moving',
      ],
    },

    advancedImplementation: {
      title: 'Redis Geospatial Index with H3 Sharding, Kafka Ingestion Pipeline, and WebSocket Observer Push',
      description: 'Location updates flow through a Kafka ingest layer that distributes writes across processing nodes. Current positions are maintained in Redis using the native GEOADD command, which uses a geohash-based sorted set for O(log n) proximity queries. H3 cells shard the spatial index across Redis nodes. An observer service subscribes each passenger to their driver via a dedicated Redis channel, pushing location updates within 500ms. Geofences are evaluated by a stream processor reading from Kafka.',
      keyPoints: [
        'Redis GEO commands: GEOADD stores positions using geohash encoding; GEORADIUS or GEOSEARCH returns nearby entities sorted by distance — O(log N + M) where M is the result set size, enabling sub-10ms queries across 1M entities',
        'H3 hexagonal sharding: the Earth is divided into H3 resolution-5 hexagonal cells (each about 250km across); each cell maps to a Redis shard; proximity queries that span cell boundaries query up to 7 adjacent cells (the H3 ring), each potentially on a different shard',
        'Kafka for location ingestion: devices publish to Kafka topics partitioned by entity_id; stream processors consume and fan-out to three destinations in parallel: Redis GEO update (for proximity queries), TimescaleDB batch writer (for history), and observer notification service (for WebSocket push)',
        'Observer subscription pattern: when a passenger opens the driver tracking view, the app subscribes via WebSocket; the server registers interest in driver_id updates in Redis Pub/Sub; each location update for that driver is pushed to all subscribed observers within 500ms',
        'Smooth map animation on client: the client receives GPS points every 3-5 seconds but must animate movement smoothly; client-side linear interpolation extrapolates the position between received updates for smooth animation; dead reckoning uses heading and speed to predict position',
        'Adaptive update frequency: the server returns next_update_in_ms in the location acknowledgement; when a driver is stationary (speed < 0.5 m/s) for 60 seconds, the server tells the device to reduce updates to every 30 seconds; moving at highway speed triggers 1-second intervals',
        'Geofence evaluation via stream processing: Flink consumes location updates from Kafka; for each update, it queries active geofences for that entity type, checks if the entity is inside or outside each geofence, detects state transitions (was outside, now inside = entry event), and triggers callbacks asynchronously',
      ],
      databaseChoice: 'Redis Cluster for current positions (GEOADD/GEOSEARCH) and observer Pub/Sub channels; Kafka for location event streaming and geofence evaluation; TimescaleDB for location history with compression and time-based partitioning; PostgreSQL with PostGIS for geofence geometry storage and complex polygon queries; Flink for geofence stream evaluation; DynamoDB or Redis for entity metadata cache',
      caching: 'Current entity positions stored entirely in Redis (the Redis GEO index IS the cache — no separate database lookup needed for proximity queries); entity metadata cached in Redis with 5-minute TTL for enriching query results; geofence definitions cached in Flink operator state refreshed every 60 seconds; passenger-to-driver subscription mapping stored in Redis Pub/Sub channel registry',
    },

    tips: [
      'Redis GEO commands are the right tool: mention GEOADD and GEOSEARCH by name — they demonstrate knowledge of the specific Redis primitives for geospatial use cases',
      'H3 hexagonal indexing vs QuadTree vs S2: H3 is Uber open-source and widely known in industry; all three are valid answers but H3 shows current knowledge',
      'The write load is the primary scaling challenge: 250K location writes/sec requires sharding — explain how H3 cells provide a natural sharding key that also optimizes proximity queries',
      'Client-side interpolation is an important detail: explain that the app does not wait for each GPS update to move the pin — it smoothly interpolates between received positions to create the illusion of real-time tracking',
      'Privacy is a follow-up: discuss that driver exact location should be hidden from passenger until the driver is matched (only approximate distance shown); matched passengers get exact location',
      'Battery optimization often comes up: adaptive update frequency based on motion state is the key answer — not sending GPS every second when the driver is parked',
    ],

    keyQuestions: [
      {
        question: 'How does H3 hexagonal indexing work for proximity queries?',
        answer: `**The Problem with Naive Lat/Lng Queries**:
\`\`\`
SQL: SELECT * FROM drivers
  WHERE lat BETWEEN 37.7-0.05 AND 37.7+0.05
  AND lng BETWEEN -122.4-0.05 AND -122.4+0.05
-- Not a circle, and B-tree indexes cannot efficiently satisfy 2D range queries
\`\`\`

**H3 Hierarchical Hexagonal Grid**:
- Earth is divided into hexagons at 16 resolution levels (0=continents, 15=~1m²)
- Resolution 9 cells are ~0.1km² — useful for rider-driver matching
- Each location can be instantly converted to its H3 cell ID
- Hexagons tile perfectly, unlike squares which have varying diagonal distances

\`\`\`python
h3.geo_to_h3(37.774, -122.419, resolution=9)
→ "8928308280fffff"  # cell ID for this coordinate

# Find all cells within k rings of this cell:
h3.k_ring("8928308280fffff", k=2)
→ 19 cells covering roughly 1km radius
\`\`\`

**Proximity Query with H3**:
\`\`\`
1. Convert query location to H3 cell at resolution 9
2. Get all H3 cells within k rings (k=1 covers ~300m, k=2 covers ~600m, etc.)
3. For each cell: SMEMBERS drivers_in_cell:{cell_id}  (Redis set per cell)
4. For returned driver IDs: calculate exact Haversine distance
5. Filter and sort by distance

Performance:
  19 Redis SMEMBERS (k=2 rings) = 19 parallel lookups = <5ms
  vs full scan of 1M rows = 500ms+
\`\`\`

**Redis GEO Alternative** (simpler for many use cases):
\`\`\`
GEOADD drivers_geo -122.419 37.774 "driver_88201"
GEOSEARCH drivers_geo FROMLONLAT -122.419 37.774 BYRADIUS 3 km ASC COUNT 50
→ Returns driver IDs sorted by distance in <10ms for 1M drivers
\`\`\``,
      },
      {
        question: 'How do you push smooth location animation to passengers watching a driver?',
        answer: `**The Raw Data Problem**:
\`\`\`
Driver sends GPS update every 4 seconds:
  T=0s:  lat=37.774291, lng=-122.419015  (map pin jumps here)
  T=4s:  lat=37.774442, lng=-122.418890  (map pin jumps here)
  T=8s:  lat=37.774612, lng=-122.418742  (map pin jumps here)

Passenger sees driver teleporting every 4 seconds → terrible UX
\`\`\`

**Client-Side Linear Interpolation**:
\`\`\`javascript
// Client stores last two known positions:
const prev = { lat: 37.774291, lng: -122.419015, t: 0 }
const next = { lat: 37.774442, lng: -122.418890, t: 4000 }

// Animation loop (60 fps):
function animate(currentTime) {
  const progress = (currentTime - prev.t) / (next.t - prev.t)
  const clampedProgress = Math.min(progress, 1.0)

  map.setDriverPosition({
    lat: prev.lat + (next.lat - prev.lat) * clampedProgress,
    lng: prev.lng + (next.lng - prev.lng) * clampedProgress,
    bearing: calculateBearing(prev, next)
  })
  requestAnimationFrame(animate)
}
\`\`\`

**Dead Reckoning for Freshness**:
- When next update is late (network delay), extrapolate beyond the last position
- Use heading and speed from the last update: new_pos = last_pos + speed * heading * elapsed
- Cap extrapolation at 10 seconds to avoid large errors if driver turns

**Server-Side Smoothing** (additional option):
- Server applies a Kalman filter to incoming GPS readings to remove noise
- GPS accuracy on phones is ±5-15 meters; Kalman filtering can reduce this to ±2-5 meters
- Send filtered position + velocity vector to client for better dead reckoning`,
      },
    ],

    keyDecisions: [
      'Redis GEO vs PostGIS for current position queries — chose Redis GEO because it handles 250K writes/sec and sub-10ms proximity queries at 1M entities in memory; PostGIS with spatial indexes is excellent but the write throughput of a single PostgreSQL instance cannot match Redis at this scale',
      'H3 vs QuadTree vs S2 for spatial sharding — H3 is the industry standard (open-sourced by Uber) and provides uniform cell sizes unlike QuadTrees which produce uneven cells in dense areas; S2 is also excellent and used by Google but H3 tooling is more accessible',
      'Kafka vs direct-to-Redis for location ingestion — chose Kafka as an intermediary because it decouples ingest rate from Redis write rate, allows replay for history writers and geofence evaluators, and provides backpressure when downstream systems are slow',
      'Client-side interpolation vs higher update frequency — chose interpolation because reducing GPS updates from 1/sec to 1/4sec saves 75% of battery and bandwidth with no perceptible quality loss on the map; interpolation makes 4-second updates look as smooth as 1-second updates',
      'Adaptive update frequency vs fixed interval — chose adaptive because a driver who is parked at a restaurant for 8 minutes does not need GPS updates every 3 seconds; reducing to every 30 seconds when stationary extends battery life significantly and reduces ingestion load by 10x',
    ],
  },
];
