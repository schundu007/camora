// Extra system design problems - extends systemDesignProblems.js

export const extraSystemDesignProblemCategories = [
  { id: 'payment', name: 'Payment & Financial', icon: 'dollarSign', color: '#16a34a' },
  { id: 'async', name: 'Async & Background Processing', icon: 'clock', color: '#d946ef' },
  { id: 'specialized', name: 'Specialized Systems', icon: 'zap', color: '#0ea5e9' },
  { id: 'social', name: 'Social Media & Networking', icon: 'users', color: '#3b82f6' },
  { id: 'streaming', name: 'Streaming & Media', icon: 'play', color: '#ef4444' },
];

export const extraSystemDesignProblemCategoryMap = {
  'slack': 'communication',
  'tiktok': 'social',
  'reddit': 'social',
  'twitch': 'streaming',
  'gmail': 'communication',
  'google-drive': 'storage',
  'shopify': 'ecommerce',
  'flash-sale': 'ecommerce',
  'digital-wallet': 'payment',
  'stock-exchange': 'payment',
  'api-gateway': 'infrastructure',
  'distributed-cache': 'infrastructure',
  'cdn': 'infrastructure',
  'object-storage': 'storage',
  'time-series-db': 'storage',
  'distributed-lock': 'infrastructure',
  'job-scheduler': 'async',
  'ci-cd-pipeline': 'async',
  'calendar-system': 'specialized',
  'online-chess': 'specialized',
  'recommendation-engine': 'specialized',
  'chatgpt-llm-system': 'specialized',
  'deployment-system': 'async',
  'distributed-search': 'infrastructure',
  'blob-store': 'storage',
  'distributed-task-scheduler': 'async',
  'leetcode-online-judge': 'specialized',
  'strava-fitness-tracking': 'social',
  'online-auction': 'ecommerce',
  'fb-live-comments': 'communication',
  'fb-post-search': 'infrastructure',
  'price-tracking-service': 'specialized',
  'youtube-top-k-trending': 'streaming',
};

export const extraSystemDesigns = [
  // ─── 1. Slack ───────────────────────────────────────────────────────
  {
    id: 'slack',
    isNew: true,
    title: 'Slack',
    subtitle: 'Team Collaboration Platform',
    icon: 'hash',
    color: '#4a154b',
    difficulty: 'Hard',
    description: 'Design a real-time team messaging platform with channels, threads, file sharing, and presence indicators.',

    introduction: `Slack-style team collaboration platforms present a fascinating mix of real-time messaging, persistent history, and rich integrations. Unlike 1-to-1 messaging apps, Slack revolves around channels (many-to-many communication) with threading, reactions, file attachments, and powerful search across an organization's entire message corpus.

The core technical challenges include: maintaining WebSocket connections for millions of concurrent users, fan-out of messages to potentially thousands of channel members simultaneously, providing sub-second search across billions of messages, and handling the "presence" system that shows who is online in real-time.

A well-designed Slack system must balance write-heavy workloads (messages, reactions, edits) with read-heavy patterns (scrolling history, searching), while keeping the real-time experience feeling instantaneous.`,

    functionalRequirements: [
      'Create and manage channels (public, private, DM)',
      'Send, edit, and delete messages in channels',
      'Threaded replies within channels',
      'File and image uploads with previews',
      'Real-time presence indicators (online, away, DND)',
      'Full-text search across all messages',
      'Emoji reactions on messages',
      'User mentions and notifications (@user, @channel)'
    ],

    nonFunctionalRequirements: [
      'Message delivery latency < 200ms for online users',
      'Support 10M+ concurrent WebSocket connections',
      'Message history search latency < 500ms',
      '99.99% availability',
      'Messages must be durable (zero loss)',
      'Support organizations with 100K+ members'
    ],

    estimation: {
      users: '20M DAU, 10M concurrent connections at peak',
      storage: '~500 bytes/msg avg * 5B messages/day = ~2.5TB/day raw messages',
      bandwidth: '~50KB/s per active connection (including presence updates) = ~500Gbps peak',
      qps: '~100K messages/sec writes, ~500K reads/sec (history + search)'
    },

    apiDesign: {
      description: 'REST for CRUD operations, WebSocket for real-time delivery',
      endpoints: [
        { method: 'POST', path: '/api/channels', params: '{ name, type, members[] }', response: '201 { channelId, name }', description: 'Create a new channel (public, private, or DM). The members array seeds initial membership. Channel names are unique per workspace and automatically lowercased/slugified. Creating a DM reuses an existing conversation if one already exists between the same participants.' },
        { method: 'POST', path: '/api/channels/:channelId/messages', params: '{ content, threadId?, attachments[] }', response: '201 { messageId, timestamp }', description: 'Send a message to a channel. If threadId is provided, the message is posted as a threaded reply. Messages are persisted to Cassandra and simultaneously published to the channel\'s Kafka topic for real-time fan-out to online members via WebSocket gateways. Attachments are referenced by pre-uploaded file IDs.' },
        { method: 'GET', path: '/api/channels/:channelId/messages', params: 'cursor, limit, before?', response: '{ messages[], nextCursor }', description: 'Fetch paginated message history for a channel using cursor-based pagination. Messages are returned in reverse chronological order. The cursor is a snowflake message ID; passing before? fetches messages older than that ID. Recent messages (last 50) are served from Redis cache, older ones from Cassandra.' },
        { method: 'POST', path: '/api/messages/:messageId/reactions', params: '{ emoji }', response: '200 { reactionCount }', description: 'Toggle an emoji reaction on a message. If the user already reacted with the same emoji, it is removed (idempotent toggle). Reaction counts are denormalized on the message document for fast reads. The reaction event is broadcast to channel members via WebSocket for real-time UI updates.' },
        { method: 'GET', path: '/api/search', params: 'query, channelId?, from?, after?, before?', response: '{ results[], total }', description: 'Full-text search across all messages the user has access to, powered by Elasticsearch. Supports filtering by channel, sender, and date range. Results include highlighted snippets with matching terms. Queries are rate-limited to 20/min per user to protect the search cluster from expensive wildcard queries.' },
        { method: 'WS', path: '/ws/connect', params: 'auth token', response: 'Bidirectional: messages, typing, presence events', description: 'Establish a persistent WebSocket connection for real-time events. The server authenticates via the token and subscribes the connection to all channels the user belongs to. Inbound frames include typing indicators and presence heartbeats (every 30s). The server sends message delivery, reaction updates, and channel membership changes.' }
      ]
    },

    dataModel: {
      description: 'Core tables for workspaces, channels, messages, and presence',
      schema: `workspaces {
  id: uuid PK
  name: varchar(100)
  domain: varchar(50) unique
  plan: enum(free, pro, enterprise)
  created_at: timestamp
}

channels {
  id: uuid PK
  workspace_id: uuid FK
  name: varchar(80)
  type: enum(public, private, dm, group_dm)
  topic: text
  created_by: uuid FK
  created_at: timestamp
}

messages {
  id: snowflake_id PK
  channel_id: uuid FK (partition key)
  user_id: uuid FK
  content: text
  thread_id: snowflake_id nullable
  edited_at: timestamp nullable
  created_at: timestamp
  -- Denormalized: reaction_counts jsonb, reply_count int
}

channel_members {
  channel_id: uuid FK
  user_id: uuid FK
  last_read_msg_id: snowflake_id
  muted: boolean
  joined_at: timestamp
  PK(channel_id, user_id)
}

-- Elasticsearch index for full-text search
messages_search_index {
  message_id, channel_id, workspace_id
  content: text (analyzed)
  sender_name, timestamp
}`,
        examples: [
          {
            table: 'messages',
            label: 'Channel message with reactions',
            json: `{
  "id": 7291048362817429504,
  "channel_id": "c8a3f1e2-4d5b-4c9a-b7e6-2f1a3d5c8e9b",
  "user_id": "u4b2e7d1-9a3c-4f8b-a5d6-7e1c3b9f2a4d",
  "content": "Just pushed the hotfix for the login timeout issue. Can someone on the SRE team verify?",
  "thread_id": null,
  "edited_at": null,
  "created_at": "2026-04-19T14:32:17Z",
  "reaction_counts": {"white_check_mark": 3, "eyes": 1},
  "reply_count": 0
}`
          },
          {
            table: 'channel_members',
            label: 'Member with unread tracking',
            json: `{
  "channel_id": "c8a3f1e2-4d5b-4c9a-b7e6-2f1a3d5c8e9b",
  "user_id": "u4b2e7d1-9a3c-4f8b-a5d6-7e1c3b9f2a4d",
  "last_read_msg_id": 7291048362817429504,
  "muted": false,
  "joined_at": "2025-09-12T08:00:00Z"
}`
          },
          {
            table: 'workspaces',
            label: 'Enterprise workspace',
            json: `{
  "id": "w1a2b3c4-5d6e-7f8a-9b0c-d1e2f3a4b5c6",
  "name": "Acme Engineering",
  "domain": "acme-eng",
  "plan": "enterprise",
  "created_at": "2024-03-15T10:00:00Z"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/slack/impl-basic.png',
      description: 'Clients connect via WebSocket to gateway servers. Messages are written to the database and fanned out to online channel members through their WebSocket connections. A message broker coordinates delivery across gateway servers.',
      problems: [
        'Single gateway server cannot hold millions of connections',
        'Broadcasting to large channels creates write amplification',
        'Unread counts and last-read tracking are expensive at scale',
        'Search over billions of messages requires specialized indexing'
      ]
    },

    advancedImplementation: {
      title: 'Scalable Architecture with Connection Gateway Layer',
      diagramSrc: '/diagrams/slack/impl-advanced.png',
      description: 'A distributed WebSocket gateway tier sits behind load balancers. A pub/sub layer (Redis Pub/Sub or Kafka) routes messages to the correct gateway holding each recipient connection. Messages are persisted asynchronously in Cassandra (partitioned by channel_id + time bucket) and indexed in Elasticsearch for search.',
      keyPoints: [
        'WebSocket Gateway tier: stateful servers each holding ~500K connections, registered in a service registry',
        'Channel-to-gateway mapping in Redis: when a message is sent, look up which gateways hold channel members',
        'Kafka topic per workspace for ordered, durable message processing',
        'Cassandra for message storage with channel_id as partition key and time-based clustering',
        'Elasticsearch cluster for full-text search with near-real-time indexing',
        'Presence service uses heartbeats + Redis EXPIRE: user pings every 30s, absence = offline after 60s'
      ],
      databaseChoice: 'Cassandra for messages (time-series write pattern, partition by channel); PostgreSQL for metadata (channels, users); Redis for presence and gateway routing; Elasticsearch for search',
      caching: 'Redis caches recent messages per channel (last 50), channel member lists, and unread counts. LRU eviction with 1-hour TTL for message caches.'
    },

    tips: [
      'Start by clarifying scale: number of workspaces, channels per workspace, messages per day',
      'Discuss the fan-out tradeoff: push (WebSocket broadcast) vs pull (clients poll) for large channels',
      'Presence is deceptively hard at scale -- discuss heartbeat intervals and consistency tradeoffs',
      'Mention unread count tracking: per-user last_read pointer vs pre-computed counts',
      'Search is a separate concern: discuss Elasticsearch vs dedicated search infrastructure',
      'Threading adds complexity: thread participants need notifications even if they muted the channel'
    ],

    keyQuestions: [
      {
        question: 'How do you deliver messages in real-time to all channel members?',
        answer: `**Fan-out via WebSocket Gateways + Pub/Sub**:
1. User sends message -> hits any API server via load balancer
2. API server persists to Kafka (durable) and Cassandra
3. API server publishes to a Redis Pub/Sub channel: \`channel:{channelId}\`
4. Each WebSocket Gateway subscribes to channels its connected users belong to
5. Gateway pushes message to relevant WebSocket connections

**Optimization for Large Channels (10K+ members)**:
- Don't fan-out to offline users; they load history on reconnect
- Use "lazy delivery": only push to users who have the channel in view
- Background workers compute push notifications for mobile users separately

**Connection State Management**:
- Gateway registers \`userId -> gatewayId\` in Redis on connect
- On disconnect, entry is removed; presence service updated
- If a gateway crashes, its entries expire via Redis TTL (30s)`
      },
      {
        question: 'How does search work across billions of messages?',
        answer: `**Elasticsearch-Based Search Pipeline**:
1. Messages flow through Kafka -> Search Indexer -> Elasticsearch
2. Index is partitioned by workspace_id for tenant isolation
3. Each message document includes: content (analyzed), channel_id, sender, timestamp

**Query Processing**:
- \`from:alice in:#engineering after:2024-01-01 deployment\`
- Parsed into structured Elasticsearch query with filters + full-text match
- Results ranked by relevance (BM25) with recency boost

**Scaling Strategies**:
- Shard Elasticsearch index by workspace_id (large workspaces get dedicated shards)
- Older messages (>1 year) moved to cold storage indices with fewer replicas
- Query routing: recent-first search hits hot shards, falls back to cold if needed
- Index lag is acceptable (1-5 seconds) since search is not the primary read path`
      },
      {
        question: 'How do you handle user presence at scale?',
        answer: `**Heartbeat + Redis EXPIRE Approach**:
- Client sends heartbeat every 30 seconds via WebSocket
- Server sets Redis key: \`presence:{userId} = {status, lastSeen}\` with 60s TTL
- If no heartbeat in 60s, key expires -> user is offline

**Presence Fan-out (the hard part)**:
- When user status changes, who needs to know?
- Naive: broadcast to all workspace members (too expensive for 100K org)
- Optimized: only notify users who have the status-changed user visible
  - Track "presence subscriptions" per client (users in sidebar, open DMs)
  - On status change, look up subscribers and push only to them

**Consistency Trade-off**:
- Presence is inherently approximate (network delays, heartbeat intervals)
- Eventual consistency is fine: 30-60 second staleness is acceptable
- Mobile users: even longer intervals (2-5 minutes) to save battery`
      }
    ],

    requirements: ['Real-time messaging', 'Channels and threads', 'Presence system', 'Full-text search', 'File sharing', 'Notifications'],
    components: ['WebSocket Gateway', 'Kafka', 'Cassandra', 'Elasticsearch', 'Redis (presence + pub/sub)', 'Object Storage (S3)'],
    keyDecisions: [
      'WebSocket gateway tier with Redis-based routing for real-time delivery',
      'Kafka for durable message ordering before persistence and indexing',
      'Cassandra partitioned by channel_id for efficient message history queries',
      'Elasticsearch for workspace-scoped full-text search with near-real-time indexing',
      'Redis heartbeat + TTL pattern for scalable presence tracking',
      'Fan-out optimization: push to online viewers, pull for offline users on reconnect'
    ],

    edgeCases: [
      { scenario: 'Message ordering across distributed nodes', impact: 'Users in same channel see messages in different order, causing confusion', mitigation: 'Use Lamport timestamps or hybrid logical clocks, order by server-assigned sequence numbers per channel' },
      { scenario: 'Thundering herd on workspace login', impact: 'Monday morning login spike overwhelms auth and channel-load services', mitigation: 'Stagger channel data loading, lazy-load message history, use connection queuing with backoff' },
      { scenario: 'Large file upload during real-time messaging', impact: 'File upload blocks WebSocket connection, causing message delivery delays', mitigation: 'Use separate HTTP connection for file uploads, stream files to object storage independently' },
      { scenario: 'Channel with 100K+ members', impact: 'Typing indicators and presence updates create O(N) fan-out per event', mitigation: 'Sample presence updates, batch typing indicators, limit real-time features for large channels' },
    ],
    tradeoffs: [
      { decision: 'WebSocket vs long polling for real-time', pros: 'WebSocket gives true bidirectional low-latency; long polling is simpler and firewall-friendly', cons: 'WebSocket requires sticky sessions and connection management; long polling wastes bandwidth', recommendation: 'WebSocket with long-polling fallback for corporate firewalls' },
      { decision: 'Fan-out on write vs fan-out on read', pros: 'Write fan-out gives instant delivery; read fan-out saves storage', cons: 'Write fan-out expensive for large channels; read fan-out adds read latency', recommendation: 'Fan-out on write for channels <10K members, fan-out on read for larger channels' },
      { decision: 'Full-text search index per workspace vs global', pros: 'Per-workspace ensures data isolation; global enables cross-workspace search', cons: 'Per-workspace wastes resources for small workspaces; global complicates access control', recommendation: 'Per-workspace sharding with shared infrastructure to balance isolation and efficiency' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Desktop/mobile/web apps maintaining persistent connections', components: ['Electron App', 'React Web Client', 'Mobile SDK', 'WebSocket Manager'] },
      { name: 'Real-Time Gateway', purpose: 'Manage millions of persistent WebSocket connections', components: ['WebSocket Server', 'Connection Registry', 'Presence Service'] },
      { name: 'Application Layer', purpose: 'Business logic for messaging, channels, and search', components: ['Message Service', 'Channel Service', 'Search Service', 'File Service'] },
      { name: 'Data Layer', purpose: 'Persistent storage for messages, files, and metadata', components: ['MySQL (messages)', 'Elasticsearch (search)', 'S3 (files)', 'Redis (presence/cache)'] },
    ],
  },

  // ─── 2. TikTok ──────────────────────────────────────────────────────
  {
    id: 'tiktok',
    isNew: true,
    title: 'TikTok',
    subtitle: 'Short-Form Video Platform',
    icon: 'video',
    color: '#ff0050',
    difficulty: 'Hard',
    description: 'Design a short-form video platform with algorithmic feed recommendations, video upload and transcoding, and social interactions.',

    introduction: `TikTok-style platforms are among the most challenging system design problems because they combine massive video storage and delivery with a sophisticated recommendation engine that drives user engagement. Unlike traditional social media where you follow accounts, TikTok's "For You Page" is powered primarily by an interest graph rather than a social graph.

The system must handle enormous data volumes: millions of video uploads per day, each requiring transcoding into multiple resolutions and formats, storage in a global CDN, and delivery to billions of personalized feeds. The recommendation engine must process implicit signals (watch time, replays, skips) in real-time to keep the feed fresh and engaging.

Key architectural tensions include: upload processing latency vs. quality, recommendation freshness vs. computation cost, and global content delivery vs. regional content moderation requirements.`,

    functionalRequirements: [
      'Upload short videos (15s to 3 minutes) with editing tools',
      'Algorithmic "For You" feed personalized per user',
      'Follow accounts and view a "Following" feed',
      'Like, comment, share, and save videos',
      'Video search by hashtags, sounds, and creators',
      'Live streaming capability',
      'Duets and stitches (create videos alongside existing ones)',
      'Content moderation and age-gating'
    ],

    nonFunctionalRequirements: [
      'Video playback start time < 500ms',
      'Feed recommendation latency < 200ms',
      'Support 1B+ DAU globally',
      '99.99% availability',
      'Handle 5M+ video uploads per day',
      'Global content delivery with edge caching'
    ],

    estimation: {
      users: '1B DAU, 500M create content monthly',
      storage: '~20MB avg per video (post-transcode, multiple resolutions) * 5M uploads/day = 100TB/day new video',
      bandwidth: '~5Mbps per concurrent viewer * 200M concurrent = ~1 Pbps peak',
      qps: '~2M feed requests/sec, ~100K uploads/sec peak, ~500K interactions/sec'
    },

    apiDesign: {
      description: 'REST APIs for CRUD, specialized endpoints for feed and upload',
      endpoints: [
        { method: 'POST', path: '/api/videos/upload', params: '{ video binary, caption, hashtags[], soundId? }', response: '202 { uploadId, status: processing }', description: 'Upload a short-form video for processing. Returns 202 immediately as the video enters an async transcoding pipeline that generates multiple resolutions (360p, 720p, 1080p) and creates an HLS manifest. The soundId links to a reusable audio track. A webhook or polling endpoint notifies the client when processing completes.' },
        { method: 'GET', path: '/api/feed/foryou', params: 'cursor, count=10, sessionId', response: '{ videos[], nextCursor, sessionId }', description: 'Fetch the personalized For You feed powered by the recommendation engine. The sessionId ties a viewing session together so the model can learn from in-session engagement signals (watch time, replays, skips). Each batch is pre-ranked by the ML scoring service. Videos are returned with pre-signed CDN URLs for instant playback.' },
        { method: 'GET', path: '/api/feed/following', params: 'cursor, count=20', response: '{ videos[], nextCursor }', description: 'Fetch videos from accounts the user follows, sorted reverse-chronologically. Unlike the For You feed, this uses a simple fan-out-on-read model: the server queries the user\'s follow list, then merges recent videos from each followed creator. Results are cursor-paginated by timestamp.' },
        { method: 'POST', path: '/api/videos/:videoId/interactions', params: '{ type: like|save|share, value }', response: '200 { updated }', description: 'Record a user interaction (like, save, or share) on a video. Likes are idempotent toggles. Interaction counts are updated asynchronously via a counter service backed by Redis to avoid write contention on hot videos. Each interaction event is also published to Kafka for the recommendation engine to consume as a training signal.' },
        { method: 'POST', path: '/api/videos/:videoId/comments', params: '{ text, replyToId? }', response: '201 { commentId }', description: 'Post a comment on a video, optionally as a reply to an existing comment. Comments pass through a content moderation pipeline (toxicity filter + spam detection) before becoming visible. Reply threads are limited to 2 levels deep. The video owner receives a push notification unless they have disabled comment notifications.' },
        { method: 'GET', path: '/api/search', params: 'query, type=video|user|hashtag, cursor', response: '{ results[], nextCursor }', description: 'Search across videos, users, or hashtags using Elasticsearch. Video search indexes captions and hashtags; user search indexes display names and bios. Trending hashtags are boosted in results via a time-decayed popularity score. Results are personalized based on the user\'s language and region preferences.' }
      ]
    },

    dataModel: {
      description: 'Video metadata, user interactions, and recommendation signals',
      schema: `videos {
  id: snowflake_id PK
  creator_id: bigint FK
  caption: varchar(2200)
  sound_id: bigint FK nullable
  duration_ms: int
  status: enum(processing, active, removed)
  cdn_urls: jsonb  -- { 360p, 720p, 1080p }
  thumbnail_url: varchar
  hashtags: text[]
  view_count: bigint
  like_count: bigint
  share_count: bigint
  created_at: timestamp
}

user_interactions {
  user_id: bigint
  video_id: bigint
  interaction_type: enum(view, like, save, share, comment)
  watch_duration_ms: int  -- critical for recommendations
  watch_percentage: float
  replayed: boolean
  timestamp: timestamp
  PK(user_id, video_id, interaction_type)
}

user_embeddings (ML feature store) {
  user_id: bigint PK
  interest_vector: float[256]  -- learned embedding
  recent_topics: jsonb
  last_updated: timestamp
}

video_embeddings (ML feature store) {
  video_id: bigint PK
  content_vector: float[256]  -- from visual/audio analysis
  engagement_score: float
  topic_tags: text[]
  created_at: timestamp
}`,
        examples: [
          {
            table: 'videos',
            label: 'Active short video with engagement stats',
            json: `{
  "id": 7384920156283401728,
  "creator_id": 991204837,
  "caption": "POV: your microservices start talking to each other #devlife #backend",
  "sound_id": 820193746,
  "duration_ms": 28400,
  "status": "active",
  "cdn_urls": {"360p": "https://cdn.tt/v/7384920/360p.mp4", "720p": "https://cdn.tt/v/7384920/720p.mp4", "1080p": "https://cdn.tt/v/7384920/1080p.mp4"},
  "thumbnail_url": "https://cdn.tt/thumb/7384920.jpg",
  "hashtags": ["devlife", "backend", "microservices"],
  "view_count": 2840193,
  "like_count": 341029,
  "share_count": 12840,
  "created_at": "2026-04-17T19:22:05Z"
}`
          },
          {
            table: 'user_interactions',
            label: 'User watch event with engagement signal',
            json: `{
  "user_id": 550382917,
  "video_id": 7384920156283401728,
  "interaction_type": "view",
  "watch_duration_ms": 27200,
  "watch_percentage": 0.96,
  "replayed": true,
  "timestamp": "2026-04-19T10:15:33Z"
}`
          },
          {
            table: 'user_embeddings',
            label: 'ML interest embedding for feed personalization',
            json: `{
  "user_id": 550382917,
  "interest_vector": [0.142, -0.038, 0.891, 0.204, -0.553, "...(256 dims)"],
  "recent_topics": {"tech_humor": 0.82, "coding_tutorials": 0.65, "startup_culture": 0.41},
  "last_updated": "2026-04-19T10:16:00Z"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/tiktok/impl-basic.png',
      description: 'Users upload videos to application servers, which store them in blob storage and enqueue transcoding jobs. A simple recommendation engine ranks videos by popularity. Clients pull feeds and stream videos directly from storage.',
      problems: [
        'Popularity-based feed creates a "rich get richer" problem with no personalization',
        'Transcoding on upload creates latency; no pipeline for parallel processing',
        'Single-region storage cannot serve a global audience with acceptable latency',
        'No real-time signal processing means stale recommendations'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Architecture with ML-Powered Recommendations',
      diagramSrc: '/diagrams/tiktok/impl-advanced.png',
      description: 'A multi-stage architecture: upload -> object storage -> transcoding pipeline (FFmpeg workers) -> CDN distribution. The recommendation system uses a two-tower neural network model: one tower encodes user interests from interaction history, the other encodes video features. Candidate generation narrows from millions of videos to ~1000, then a ranking model scores and re-ranks the final feed.',
      keyPoints: [
        'Video upload pipeline: chunked upload -> S3 -> SQS -> transcoding farm (FFmpeg) -> CDN push to edge',
        'Two-phase recommendation: candidate generation (ANN search on embeddings) -> ranking (neural network scoring)',
        'Real-time feature pipeline: Kafka streams user interactions -> Flink computes features -> updates user embedding',
        'Edge caching: popular videos pre-cached at CDN edge, long-tail served from origin',
        'A/B testing framework: different recommendation models served to user cohorts simultaneously',
        'Content moderation pipeline runs in parallel with transcoding: visual AI + audio analysis + text review'
      ],
      databaseChoice: 'Vitess (sharded MySQL) for video metadata and social graph; Redis for engagement counters; Cassandra for interaction event log; vector DB (Milvus) for embedding-based retrieval; S3 for video storage',
      caching: 'CDN for video delivery; Redis for hot video metadata and engagement counts; pre-computed feed cache for cold-start users (trending/popular); user embedding cache in feature store with 15-minute refresh'
    },

    tips: [
      'Clarify early: is the focus on the recommendation engine or the video infrastructure?',
      'The recommendation system is the differentiator -- spend time on the two-phase approach',
      'Discuss cold-start problem: new users (no history) and new videos (no engagement signals)',
      'Video transcoding is an async pipeline -- discuss how you handle failures and retries',
      'Mention content moderation as a parallel concern that must complete before video goes live',
      'Global CDN strategy is critical: discuss edge caching and regional content restrictions'
    ],

    keyQuestions: [
      {
        question: 'How does the recommendation algorithm work?',
        answer: `**Two-Phase Recommendation Pipeline**:

**Phase 1: Candidate Generation (~1000 videos from millions)**
- Multiple candidate sources run in parallel:
  - Collaborative filtering: users who watched X also watched Y
  - Content-based: videos similar to ones you engaged with (embedding similarity)
  - Social: videos liked by people you follow
  - Trending: globally/regionally popular recent videos
- Each source returns ~200-500 candidates, merged and deduplicated

**Phase 2: Ranking (~30 videos from 1000)**
- Neural ranking model scores each candidate
- Features: user embedding, video embedding, context (time of day, device), cross-features
- Prediction target: P(watch >75%) * engagement_score
- Final re-ranking applies diversity rules (no >3 consecutive same-creator, topic mixing)

**Real-time Signal Loop**:
- User watches/skips -> event to Kafka -> Flink updates session context
- Next feed request uses updated context -> recommendations adapt within seconds
- This "tight loop" is what makes TikTok's feed feel uncannily personalized`
      },
      {
        question: 'How do you handle video upload and transcoding?',
        answer: `**Chunked Upload Pipeline**:
1. Client splits video into 2MB chunks, uploads to pre-signed S3 URLs
2. Upload service tracks chunks, assembles on completion
3. Publishes \`VideoUploaded\` event to Kafka

**Transcoding Pipeline**:
1. Transcoding worker pulls from Kafka, downloads raw video from S3
2. FFmpeg produces multiple renditions: 360p, 720p, 1080p, plus adaptive bitrate (HLS/DASH)
3. Generates thumbnail, extracts audio waveform, computes content hash (dedup)
4. Uploads all artifacts to S3, publishes \`VideoTranscoded\` event

**Content Moderation (parallel)**:
1. Visual AI scans frames for policy violations
2. Audio analysis checks for copyrighted music
3. OCR + NLP on text overlays
4. If flagged, video enters human review queue; otherwise auto-approved

**Reliability**:
- Each step is idempotent with at-least-once delivery
- Dead letter queue for persistently failing transcodes
- Typical pipeline: 30-60 seconds for short videos (< 1 min)`
      },
      {
        question: 'How do you handle the CDN and global video delivery?',
        answer: `**Multi-Tier CDN Strategy**:

**Tier 1 - Edge PoPs (200+ locations)**:
- Cache the top ~10K videos globally (covers 60-70% of traffic)
- Each PoP has SSD storage for cached segments
- Cache key: \`{videoId}:{resolution}:{segment}\`

**Tier 2 - Regional Origin Shields (10-15 regions)**:
- Cache long-tail content missed at edge
- Reduces load on central origin by 90%+
- Regional content moderation filtering applied here

**Tier 3 - Central Origin (2-3 data centers)**:
- S3/GCS stores all transcoded video permanently
- Only serves cache misses from Tier 2 (~1-2% of traffic)

**Adaptive Bitrate Streaming**:
- HLS segments (2-4 seconds each) at multiple quality levels
- Client-side ABR algorithm switches quality based on bandwidth
- Pre-buffer next video while current plays (feels instant)

**Optimization**:
- Predictive pre-caching: push newly viral videos to edge before they spike
- Geo-aware routing: DNS-based or anycast to nearest healthy PoP
- Cost optimization: serve from cheapest healthy PoP (cloud egress costs vary)`
      }
    ],

    requirements: ['Video upload and transcoding', 'Personalized feed (For You Page)', 'Social interactions', 'Global video delivery', 'Content moderation', 'Search'],
    components: ['CDN (multi-tier)', 'S3/Blob Storage', 'Kafka', 'Transcoding Farm', 'ML Recommendation Service', 'Vitess', 'Redis', 'Vector DB'],
    keyDecisions: [
      'Two-phase recommendation: candidate generation (ANN) + neural ranking model',
      'Async video pipeline: chunked upload -> S3 -> Kafka -> transcode -> CDN push',
      'Real-time user signal loop via Kafka + Flink for instant feed adaptation',
      'Multi-tier CDN with predictive pre-caching for popular and trending videos',
      'Parallel content moderation pipeline to minimize time-to-publish',
      'Vector embeddings for both users and videos enabling similarity-based retrieval'
    ],

    edgeCases: [
      { scenario: 'Creator uploads a video that is nearly identical to copyrighted content', impact: 'Platform faces DMCA liability if not detected, or false positive blocks legitimate fair-use content', mitigation: 'Audio/video fingerprinting against content ID database, appeals process for false positives, graduated enforcement' },
      { scenario: 'Viral video causes sudden 1000x traffic spike in one region', impact: 'CDN cache misses in that region, origin overwhelmed', mitigation: 'Predictive pre-warming of CDN caches for trending content, origin shielding, request coalescing for same video' },
      { scenario: 'User scrolls For You Page for hours generating infinite recommendations', impact: 'Recommendation model runs out of diverse content, starts repeating or showing low-quality videos', mitigation: 'Diversity injection in recommendation batches, explore/exploit balance, session-length-aware quality boosting' },
      { scenario: 'Coordinated inauthentic behavior inflates view counts and engagement', impact: 'Fake engagement skews recommendations and misleads advertisers', mitigation: 'Real-time view deduplication by device/IP fingerprint, engagement velocity anomaly detection, delayed count finalization' },
      { scenario: 'New user with no watch history opens the app for the first time', impact: 'Cold start problem: no signal for personalized recommendations', mitigation: 'Popularity-based initial feed, rapid interest detection from first few interactions, demographic-based cohort seeding' },
    ],
    tradeoffs: [
      { decision: 'Pre-computed recommendations vs real-time recommendation', pros: 'Pre-computed is fast to serve; real-time adapts to current session context', cons: 'Pre-computed goes stale quickly; real-time adds latency and compute cost', recommendation: 'Hybrid: pre-compute candidate pool offline, re-rank in real-time based on session signals' },
      { decision: 'Single global feed algorithm vs per-user personalized model', pros: 'Global is simpler and consistent; per-user maximizes engagement', cons: 'Global ignores user preferences; per-user creates filter bubbles and is expensive', recommendation: 'Per-user personalization with diversity constraints and trending content injection' },
      { decision: 'On-device video processing vs server-side processing', pros: 'On-device reduces upload size and server cost; server-side ensures consistent quality', cons: 'On-device depends on phone capability; server-side requires massive compute', recommendation: 'Client-side light processing (trim, basic filters), server-side transcoding and advanced effects' },
      { decision: 'Chronological feed vs algorithm-driven feed', pros: 'Chronological is transparent and fair; algorithmic maximizes engagement and watch time', cons: 'Chronological surfaces mediocre content from followed creators; algorithmic is opaque', recommendation: 'Algorithm-driven by default (For You), with Following tab as chronological option' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Video capture, editing, and immersive playback experience', components: ['Camera/Editor SDK', 'Video Player (preload/buffer)', 'Infinite Scroll Feed', 'Engagement UI (likes, comments, shares)'] },
      { name: 'Content Pipeline Layer', purpose: 'Process uploads through moderation, transcoding, and indexing', components: ['Upload Service', 'Transcoder (multi-bitrate)', 'Content Moderation (ML)', 'Content ID (fingerprinting)'] },
      { name: 'Recommendation Layer', purpose: 'Generate personalized video feeds using ML models', components: ['Candidate Generator', 'Ranking Model', 'Diversity Injector', 'A/B Test Framework'] },
      { name: 'Data & Distribution Layer', purpose: 'Store content and deliver to users globally', components: ['Object Storage (videos)', 'CDN (global delivery)', 'Redis (user signals)', 'Feature Store (ML features)'] },
    ],
  },

  // ─── 3. Reddit ──────────────────────────────────────────────────────
  {
    id: 'reddit',
    isNew: true,
    title: 'Reddit',
    subtitle: 'Community Discussion Forum',
    icon: 'messageCircle',
    color: '#ff4500',
    difficulty: 'Hard',
    description: 'Design a community-driven discussion platform with subreddits, nested comments, voting, and content ranking.',

    introduction: `Reddit is a unique social platform centered on communities (subreddits) rather than individuals. The system design challenge revolves around its voting and ranking algorithms, deeply nested comment trees, and the balance between real-time vote counting and ranking consistency.

Unlike traditional feeds sorted chronologically, Reddit uses time-decay ranking algorithms (Hot, Best, Controversial, Top) that combine vote scores with post age. This requires continuous re-ranking as votes arrive, which is computationally expensive at scale.

The nested comment system is another distinguishing challenge: a popular post can have tens of thousands of comments organized in deep tree structures, and efficiently loading, sorting, and rendering these trees is non-trivial.`,

    functionalRequirements: [
      'Create and manage subreddits with custom rules',
      'Submit posts (text, link, image, video, poll)',
      'Nested comment threads on posts',
      'Upvote/downvote on posts and comments',
      'Multiple sort algorithms (Hot, Best, New, Top, Controversial)',
      'User karma tracking',
      'Cross-posting between subreddits',
      'Content moderation tools per subreddit'
    ],

    nonFunctionalRequirements: [
      'Feed generation latency < 200ms',
      'Vote processing within 5 seconds of ranking update',
      'Support loading comment trees with 50K+ comments efficiently',
      '99.95% availability',
      'Scale to 50M+ DAU',
      'Eventual consistency acceptable for vote counts'
    ],

    estimation: {
      users: '50M DAU, 500M MAU, 100K active subreddits',
      storage: '~10M new posts/day, ~200M new comments/day, ~2B votes/day',
      bandwidth: '~500Gbps peak (text-heavy, lower than video platforms)',
      qps: '~200K feed reads/sec, ~50K vote writes/sec, ~30K comment writes/sec'
    },

    apiDesign: {
      description: 'RESTful API with cursor-based pagination',
      endpoints: [
        { method: 'GET', path: '/api/r/:subreddit/posts', params: 'sort=hot|new|top|controversial, timeframe, cursor', response: '{ posts[], nextCursor }', description: 'Fetch posts from a subreddit with configurable sort algorithm. The "hot" sort uses a time-decayed scoring formula (similar to Wilson score) combining upvotes, downvotes, and post age. The "controversial" sort surfaces posts with roughly equal up/down vote ratios. Results are cursor-paginated and served from a pre-computed cache for popular subreddits.' },
        { method: 'POST', path: '/api/r/:subreddit/posts', params: '{ title, type, content, flair? }', response: '201 { postId }', description: 'Create a new post in a subreddit. The type field determines the post format (text, link, image, or poll). Posts go through an automod rules engine that checks subreddit-specific rules (minimum karma, account age, banned keywords) before publishing. Flair is validated against the subreddit\'s allowed flair list. New posts trigger notifications to subreddit subscribers who opted in.' },
        { method: 'GET', path: '/api/posts/:postId/comments', params: 'sort=best|top|new, depth=3, limit=200', response: '{ comments[] (nested), moreIds[] }', description: 'Fetch the comment tree for a post. Comments are returned as a nested structure up to the specified depth; deeper branches are collapsed and their IDs returned in moreIds for lazy loading. The "best" sort uses a confidence-based ranking (lower bound of Wilson score interval) that accounts for sample size. Collapsed/removed comments show [deleted] placeholders to preserve tree structure.' },
        { method: 'POST', path: '/api/vote', params: '{ targetId, targetType, direction: up|down|none }', response: '200 { newScore }', description: 'Cast an upvote, downvote, or remove a previous vote on a post or comment. Votes are idempotent -- voting the same direction twice is a no-op, and "none" retracts any existing vote. Vote counts are maintained in Redis for fast reads and periodically flushed to the database. Each user can only have one active vote per target, enforced by a composite unique constraint.' },
        { method: 'GET', path: '/api/home', params: 'sort, cursor', response: '{ posts[] (from subscribed subreddits) }', description: 'Fetch the user\'s personalized home feed aggregated from all subscribed subreddits. Uses a fan-out-on-read approach: the server merges top posts from each subscribed subreddit\'s pre-ranked cache, then applies a final ranking pass. For users subscribed to many subreddits, a sampling strategy ensures diversity across communities rather than letting one active subreddit dominate the feed.' }
      ]
    },

    dataModel: {
      description: 'Posts, comments as a tree structure, and vote tracking',
      schema: `subreddits {
  id: bigint PK
  name: varchar(21) unique
  description: text
  rules: jsonb
  subscriber_count: bigint
  created_at: timestamp
}

posts {
  id: snowflake_id PK
  subreddit_id: bigint FK
  author_id: bigint FK
  title: varchar(300)
  type: enum(text, link, image, video, poll)
  content: text
  url: varchar nullable
  score: int  -- denormalized (upvotes - downvotes)
  upvotes: int
  downvotes: int
  comment_count: int
  hot_rank: float  -- pre-computed ranking score
  created_at: timestamp
}

comments {
  id: snowflake_id PK
  post_id: bigint FK
  parent_id: bigint nullable  -- null = top-level
  author_id: bigint FK
  content: text
  score: int
  depth: smallint  -- denormalized for query optimization
  path: ltree  -- materialized path: "post.c1.c2.c3"
  created_at: timestamp
}

votes {
  user_id: bigint
  target_id: bigint
  target_type: enum(post, comment)
  direction: smallint  -- +1, -1, 0
  PK(user_id, target_id)
}`,
        examples: [
          {
            table: 'posts',
            label: 'Popular post with pre-computed hot rank',
            json: `{
  "id": 8291047283749120,
  "subreddit_id": 44021,
  "author_id": 7720183,
  "title": "I built a distributed rate limiter that handles 1M req/s on a single node. Here's the architecture.",
  "type": "text",
  "content": "After months of benchmarking, we settled on a token bucket implementation backed by Redis...",
  "url": null,
  "score": 4287,
  "upvotes": 4891,
  "downvotes": 604,
  "comment_count": 342,
  "hot_rank": 7842.31,
  "created_at": "2026-04-19T08:14:22Z"
}`
          },
          {
            table: 'comments',
            label: 'Nested comment with materialized path',
            json: `{
  "id": 8291048391027456,
  "post_id": 8291047283749120,
  "parent_id": 8291047502918144,
  "author_id": 3310924,
  "content": "Have you considered using a sliding window approach instead? It handles burst traffic more gracefully.",
  "score": 189,
  "depth": 2,
  "path": "8291047283749120.8291047502918144.8291048391027456",
  "created_at": "2026-04-19T08:47:03Z"
}`
          },
          {
            table: 'votes',
            label: 'User upvote on a post',
            json: `{
  "user_id": 3310924,
  "target_id": 8291047283749120,
  "target_type": "post",
  "direction": 1
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/reddit/impl-basic.png',
      description: 'A monolithic application handles all requests. Posts are stored in a relational database, votes update counters directly, and feed ranking is computed on every read by sorting all posts in a subreddit by the hot algorithm.',
      problems: [
        'Computing hot ranking on every read is O(n log n) per request -- very expensive',
        'Direct vote counter updates cause write contention on popular posts',
        'Loading deeply nested comment trees from a relational DB is slow (recursive queries)',
        'Home feed aggregation across subscribed subreddits requires expensive UNION queries'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Architecture with Pre-Computed Rankings',
      diagramSrc: '/diagrams/reddit/impl-advanced.png',
      description: 'Votes are buffered in Redis and periodically flushed to the database. A ranking worker continuously re-computes hot scores and maintains sorted feed caches per subreddit in Redis sorted sets. Comment trees use materialized path (ltree) for efficient subtree queries, with top-level comments pre-ranked and deeper levels loaded on demand.',
      keyPoints: [
        'Vote buffering: votes hit Redis INCR first, async worker flushes to DB every 5-10 seconds',
        'Pre-computed feeds: background workers maintain Redis sorted sets (ZADD with hot_rank score) per subreddit',
        'Home feed: merge top posts from subscribed subreddit sorted sets using a priority queue',
        'Comment tree loading: fetch top-level comments sorted by "best", lazy-load deeper branches',
        'Materialized path (ltree): enables efficient subtree queries without recursive joins',
        'Separate read and write models (CQRS-like): writes go to primary DB, reads served from Redis + read replicas'
      ],
      databaseChoice: 'PostgreSQL with ltree extension for comments; Redis sorted sets for pre-computed feeds; Cassandra for vote event log; S3 for media attachments',
      caching: 'Redis sorted sets for subreddit feeds (hot, top, new); Redis hashes for post metadata; CDN for static content; user subscription list cached with 5-minute TTL'
    },

    tips: [
      'Start with the ranking algorithm -- it drives the entire architecture',
      'Discuss the Hot ranking formula: score / (age + 2)^gravity and its implications',
      'Vote counting is a classic distributed counter problem -- discuss eventual consistency',
      'Comment trees are the hardest part: discuss materialized path vs adjacency list tradeoffs',
      'Home feed is an aggregation problem: discuss fan-out-on-write vs fan-out-on-read',
      'Mention content moderation: per-subreddit rules, AutoModerator, spam detection'
    ],

    keyQuestions: [
      {
        question: 'How does the Hot ranking algorithm work?',
        answer: `**Reddit's Hot Algorithm (simplified)**:
\`\`\`
hot_score = log10(max(|score|, 1)) + sign(score) * (created_epoch / 45000)
\`\`\`
- The log of the score means early votes matter more (going from 1->10 = same boost as 10->100)
- The time component increases linearly: newer posts get a constant score boost
- Net effect: a post with 10 upvotes now beats a post with 100 upvotes from yesterday

**Pre-computation Strategy**:
- Background worker recalculates hot_score every 30-60 seconds for active subreddits
- Writes updated scores to Redis sorted set: \`ZADD feed:subreddit:hot score postId\`
- Feed reads become simple ZREVRANGE: O(log N + K) for top K posts
- Only recalculates for posts from the last 48 hours (older posts have effectively static rank)

**The "Best" Sort for Comments** uses Wilson score interval:
- Accounts for sample size: 5/5 upvotes ranks lower than 100/110 upvotes
- More statistically sound than simple upvote percentage`
      },
      {
        question: 'How do you efficiently load nested comment trees?',
        answer: `**Materialized Path with ltree**:
- Each comment stores its full path: "post_123.c1.c5.c12"
- Top-level: fetch WHERE post_id = X AND parent_id IS NULL ORDER BY score LIMIT 200
- Expand branch: fetch WHERE path <@ 'post_123.c1' AND depth <= parent_depth + 3

**Loading Strategy (progressive)**:
1. First load: top 200 root comments, sorted by "best", with top 3 replies each
2. "Load more replies": fetch next depth level for a specific branch
3. "Continue thread": new page load for deeply nested chains (depth > 10)

**"More comments" stubs**:
- When a branch has >3 replies at a level, return a stub: { type: "more", count: 47, ids: [...] }
- Client fetches \`GET /api/morecomments?ids=c1,c2,...\` on click
- Server returns only the requested subtree

**Performance Numbers**:
- Top-level fetch: ~5ms (indexed query + Redis cache)
- Branch expansion: ~10ms (ltree index makes subtree queries fast)
- Full 50K comment tree: never loaded at once; progressive loading keeps latency <100ms per interaction`
      },
      {
        question: 'How do you handle vote counting at scale?',
        answer: `**Multi-Layer Vote Processing**:

**Layer 1 - Redis (immediate)**:
- Vote hits Redis: INCR post:{id}:up or INCR post:{id}:down
- Also SET user_vote:{userId}:{postId} = direction (for UI state)
- Response returns immediately with optimistic score

**Layer 2 - Kafka (durable)**:
- Vote event published to Kafka topic for durable processing
- Event: { userId, targetId, direction, timestamp }

**Layer 3 - DB Flush (periodic)**:
- Consumer batches votes per post (every 5-10 seconds)
- Single UPDATE posts SET upvotes = upvotes + batch_up, downvotes = downvotes + batch_down
- Reduces write contention from 1000s of individual updates to one batch update

**Idempotency**:
- Redis SET for user_vote prevents duplicate counting
- Changing vote: decrement old direction, increment new
- Kafka consumer uses userId+targetId as dedup key

**Consistency Trade-off**:
- Score displayed may be 5-10 seconds stale (acceptable)
- Vote direction (did I upvote?) is always consistent (served from Redis)
- Final DB score is eventually consistent after flush`
      }
    ],

    requirements: ['Subreddit communities', 'Voting system', 'Ranked feeds', 'Nested comments', 'Content moderation', 'User karma'],
    components: ['PostgreSQL (ltree)', 'Redis (sorted sets, counters)', 'Kafka', 'Ranking Worker', 'CDN', 'Elasticsearch (search)'],
    keyDecisions: [
      'Pre-computed rankings in Redis sorted sets to avoid on-read computation',
      'Vote buffering in Redis with periodic batch flush to reduce DB write contention',
      'Materialized path (ltree) for efficient nested comment tree queries',
      'Progressive comment loading: top-level first, lazy-load branches on demand',
      'CQRS-like separation: writes to primary DB, reads from Redis + read replicas',
      'Wilson score interval for statistically sound comment ranking'
    ],

    edgeCases: [
      { scenario: 'Vote manipulation ring using coordinated accounts', impact: 'Fake content reaches front page, undermining trust in ranking algorithm', mitigation: 'Graph-based bot detection (account clusters), velocity checks on voting patterns, shadow-banning suspicious accounts' },
      { scenario: 'Post goes viral: 100K comments in minutes', impact: 'Comment tree rendering becomes slow, database write contention on hot post', mitigation: 'Shard comment storage by post_id, lazy-load comment branches, cache top-level comments aggressively' },
      { scenario: 'Brigading: external community mass-downvotes a post/subreddit', impact: 'Legitimate content suppressed, community morale damaged', mitigation: 'Detect abnormal voting velocity from non-subscribers, weight votes by community participation history, temporary vote fuzzing' },
      { scenario: 'User deletes account but has thousands of comments across subreddits', impact: 'Orphaned comments break thread context, or deletion takes very long', mitigation: 'Soft delete user profile, anonymize comments (replace username with [deleted]), async background processing for full purge' },
      { scenario: 'Subreddit with millions of subscribers creates massive hot page computation', impact: 'Hot ranking algorithm recalculation overwhelms CPU for mega-subreddits', mitigation: 'Pre-compute hot rankings in background workers on schedule (every 2-5 min), serve from cache, not real-time' },
    ],
    tradeoffs: [
      { decision: 'Real-time vote counts vs eventually consistent counts', pros: 'Real-time is satisfying for users; eventual consistency scales better', cons: 'Real-time requires atomic counters under heavy contention; eventual consistency shows stale numbers', recommendation: 'Eventually consistent with vote fuzzing (Reddit already fuzzes counts), update every few seconds' },
      { decision: 'Flat comment list vs nested/threaded comments', pros: 'Flat is simple to render and paginate; nested shows conversation structure', cons: 'Flat loses context; nested trees are expensive to query and render deeply', recommendation: 'Nested with depth limit (10 levels), collapse deep threads with "continue this thread" link' },
      { decision: 'Hot ranking (time-decayed) vs top ranking (pure votes)', pros: 'Hot promotes fresh content; top surfaces best content regardless of age', cons: 'Hot penalizes slow-burn quality posts; top stagnates without new content', recommendation: 'Hot as default feed (like Reddit), with top/new/controversial as user-selectable sort options' },
      { decision: 'Centralized feed generation vs per-user personalized feed', pros: 'Centralized is simpler; personalized increases engagement', cons: 'Centralized ignores user preferences; personalized requires ML infrastructure', recommendation: 'Start with centralized hot/top per subreddit, add lightweight personalization (subscribed subreddits blend) for home feed' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Web and mobile interfaces for browsing, posting, and voting', components: ['Web App (React)', 'Mobile App', 'Rich Text Editor (Markdown)', 'Media Uploader'] },
      { name: 'API & Feed Layer', purpose: 'Content serving, feed generation, and ranking', components: ['Feed Generator', 'Ranking Engine (Hot/Top/New)', 'Search Service', 'Recommendation Engine'] },
      { name: 'Content & Moderation Layer', purpose: 'Post/comment management and community moderation', components: ['Post Service', 'Comment Service', 'Vote Service', 'Moderation Tools (AutoMod)'] },
      { name: 'Data Layer', purpose: 'Persistent storage for content, votes, and user data', components: ['PostgreSQL (posts, users)', 'Redis (vote counts, hot rankings)', 'Cassandra (comments)', 'Elasticsearch (search)'] },
    ],
  },

  // ─── 4. Twitch ──────────────────────────────────────────────────────
  {
    id: 'twitch',
    isNew: true,
    title: 'Twitch',
    subtitle: 'Live Streaming Platform',
    icon: 'tv',
    color: '#9146ff',
    difficulty: 'Hard',
    description: 'Design a live video streaming platform with real-time chat, low-latency broadcasting, and millions of concurrent viewers.',

    introduction: `Live streaming platforms like Twitch represent one of the most demanding distributed systems challenges, combining real-time video ingestion and distribution with massive concurrent chat systems. Unlike on-demand video (Netflix, YouTube), live streaming has strict latency requirements: viewers expect to see events within 2-5 seconds of real-time.

The two main subsystems are the video pipeline (ingest -> transcode -> distribute via CDN) and the chat system (which must broadcast messages to chatrooms with 100K+ concurrent participants). Each has distinct scaling characteristics and failure modes.

The economic model also influences architecture: streamers produce content (write-heavy ingest), but viewership is heavily skewed -- a small number of popular streams serve millions while most streams have fewer than 10 viewers. This skew affects caching, CDN strategy, and resource allocation decisions.`,

    functionalRequirements: [
      'Stream live video using RTMP/WebRTC from broadcaster software',
      'View live streams with adaptive bitrate',
      'Real-time chat per stream channel',
      'Follow channels and receive go-live notifications',
      'Clips: capture and share short segments of live streams',
      'VOD: automatically save past broadcasts',
      'Channel subscriptions and emotes',
      'Stream discovery: categories, tags, recommended streams'
    ],

    nonFunctionalRequirements: [
      'Glass-to-glass latency < 5 seconds for live video',
      'Chat message delivery < 1 second',
      'Support 50K+ concurrent viewers per popular stream',
      'Handle 100K+ messages/second in a popular chat room',
      '99.95% uptime for live streams',
      'Graceful degradation: lower quality before dropping streams'
    ],

    estimation: {
      users: '30M DAU, 10M concurrent viewers peak, 200K concurrent streamers',
      storage: '~5GB/hour per stream (source) * 200K streams * avg 3 hours = ~3PB/day before transcoding',
      bandwidth: '~3-5 Mbps per viewer * 10M concurrent = ~40Tbps peak outbound',
      qps: '~500K chat messages/sec peak, ~100K API calls/sec, ~50K follow/subscription events/sec'
    },

    apiDesign: {
      description: 'REST for metadata, RTMP for stream ingest, HLS for playback, WebSocket for chat',
      endpoints: [
        { method: 'POST', path: '/api/streams/key', params: '{ channelId }', response: '{ streamKey, ingestServer }', description: 'Generate a new stream key for a channel. The stream key is a one-time-use secret the broadcaster configures in their OBS/streaming software. The ingestServer returns the nearest RTMP endpoint based on the broadcaster\'s geographic location. Regenerating a key invalidates the previous one to prevent unauthorized restreaming.' },
        { method: 'GET', path: '/api/streams/:channelId/playlist.m3u8', params: 'quality?', response: 'HLS playlist', description: 'Returns the HLS manifest for a live stream. The playlist contains multiple quality variants (160p, 480p, 720p, 1080p) so the client can perform adaptive bitrate switching based on network conditions. Each segment is 2-4 seconds long, balancing latency against buffering. The playlist is served from CDN edge nodes with a 2-second TTL to keep it fresh.' },
        { method: 'GET', path: '/api/streams/directory', params: 'category?, sort=viewers, cursor', response: '{ streams[], nextCursor }', description: 'Browse live streams, optionally filtered by category (e.g., gaming, music). Sorted by concurrent viewer count by default. Viewer counts are approximate, updated every 5-10 seconds via a distributed counter service. Stream thumbnails are auto-generated every 30 seconds from the live feed. Results are cursor-paginated to handle directories with thousands of live streams.' },
        { method: 'WS', path: '/ws/chat/:channelId', params: 'auth token', response: 'Bidirectional: messages, events, moderation', description: 'Join a channel\'s live chat via WebSocket. Messages are broadcast to all connected viewers with sub-200ms latency. For channels with 100K+ viewers, messages are sampled server-side to prevent client flooding. Moderator actions (timeouts, bans, message deletions) are delivered as special event frames. Slow mode and subscriber-only mode are enforced server-side.' },
        { method: 'POST', path: '/api/clips', params: '{ channelId, startOffset, duration }', response: '202 { clipId, status: processing }', description: 'Create a clip from a live or recent stream. Returns 202 immediately while a background worker extracts the segment from the stream\'s rolling buffer (typically last 60 seconds). Duration is capped at 60 seconds. The worker transcodes the clip into a standalone MP4 and generates a thumbnail. The clip is associated with the source stream\'s VOD timeline for context.' }
      ]
    },

    dataModel: {
      description: 'Channel metadata, stream sessions, and chat messages',
      schema: `channels {
  id: bigint PK
  username: varchar unique
  display_name: varchar
  category_id: bigint FK
  is_live: boolean
  current_stream_id: bigint nullable
  follower_count: bigint
  subscriber_count: int
  created_at: timestamp
}

stream_sessions {
  id: bigint PK
  channel_id: bigint FK
  title: varchar(140)
  category_id: bigint FK
  started_at: timestamp
  ended_at: timestamp nullable
  peak_viewers: int
  avg_viewers: int
  vod_url: varchar nullable
}

chat_messages (Cassandra) {
  channel_id: bigint  -- partition key
  message_id: timeuuid  -- clustering key
  user_id: bigint
  content: varchar(500)
  emotes: jsonb
  badges: text[]
  is_action: boolean
  created_at: timestamp
}

follows {
  follower_id: bigint
  channel_id: bigint
  notify: boolean
  followed_at: timestamp
  PK(follower_id, channel_id)
}`,
        examples: [
          {
            table: 'stream_sessions',
            label: 'Active live stream session',
            json: `{
  "id": 49201837465,
  "channel_id": 28401923,
  "title": "Speedrunning Elden Ring DLC - Day 3 attempts",
  "category_id": 509658,
  "started_at": "2026-04-19T16:00:00Z",
  "ended_at": null,
  "peak_viewers": 84210,
  "avg_viewers": 52300,
  "vod_url": null
}`
          },
          {
            table: 'chat_messages',
            label: 'Chat message with subscriber badge and emote',
            json: `{
  "channel_id": 28401923,
  "message_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": 7782019,
  "content": "LET'S GOOO that skip was insane PogChamp",
  "emotes": [{"id": "305954156", "name": "PogChamp", "positions": [38, 46]}],
  "badges": ["subscriber/24", "glhf-pledge/1"],
  "is_action": false,
  "created_at": "2026-04-19T17:42:18Z"
}`
          },
          {
            table: 'channels',
            label: 'Live channel with current stream',
            json: `{
  "id": 28401923,
  "username": "speedmaster_ttv",
  "display_name": "SpeedMaster",
  "category_id": 509658,
  "is_live": true,
  "current_stream_id": 49201837465,
  "follower_count": 1420000,
  "subscriber_count": 8420,
  "created_at": "2022-06-14T12:00:00Z"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/twitch/impl-basic.png',
      description: 'Streamers send RTMP to a single ingest server, which transcodes and serves HLS segments to viewers. Chat uses a single WebSocket server broadcasting to all connected clients.',
      problems: [
        'Single ingest server cannot handle transcoding for many streams simultaneously',
        'One WebSocket server cannot hold 100K+ chat connections for a popular stream',
        'No CDN means every viewer fetches from origin -- bandwidth bottleneck',
        'Stream failure at ingest loses the entire broadcast with no recovery'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Live Streaming Architecture',
      diagramSrc: '/diagrams/twitch/impl-advanced.png',
      description: 'Streamers connect to the nearest ingest PoP, which transcodes into multiple quality levels (1080p, 720p, 480p, 160p) as HLS segments. Segments are pushed to a multi-tier CDN. Chat uses a clustered WebSocket tier with Redis Pub/Sub for cross-server message broadcasting. Separate IRC-like protocol for ultra-high-volume chat rooms.',
      keyPoints: [
        'Ingest PoPs in 20+ regions accept RTMP, transcode locally using GPU workers, push HLS segments to CDN',
        'Adaptive bitrate: client receives master playlist pointing to multiple quality playlists, switches based on bandwidth',
        'CDN push model: new HLS segments actively pushed to edge when a stream has >1000 viewers at that edge',
        'Chat clustering: consistent hashing assigns chat rooms to server groups, Redis Pub/Sub syncs across servers',
        'For massive chat rooms (>50K users): server-side message sampling (show 1 in N messages to each client)',
        'VOD pipeline: HLS segments saved to S3 in parallel with live distribution, assembled into full VOD post-stream'
      ],
      databaseChoice: 'PostgreSQL for channel/user metadata; Cassandra for chat message history (write-heavy, time-series); Redis for live state (viewer counts, chat pub/sub); S3 for video segments and VODs',
      caching: 'CDN edge caches HLS segments (2-4 second TTL matching segment duration); Redis caches live stream metadata and viewer counts; chat message history cached in Cassandra memtables for recent messages'
    },

    tips: [
      'Separate the discussion into two systems: video pipeline and chat system',
      'Discuss RTMP ingest -> transcode -> HLS/DASH segments -> CDN push/pull',
      'Chat scaling is the hardest part: discuss how to broadcast to 100K+ users in a room',
      'Mention the viewer count skew: most streams have <10 viewers, optimize for the common case',
      'Discuss latency budget: total glass-to-glass = encode + transcode + segment + CDN + decode',
      'Clips and VOD are async post-processing concerns: mention but do not over-invest time'
    ],

    keyQuestions: [
      {
        question: 'How does the live video pipeline work end-to-end?',
        answer: `**Glass-to-Glass Pipeline (target: <5 seconds)**:

**1. Ingest (Streamer -> Platform, ~500ms)**
- Streamer's OBS sends RTMP to nearest ingest PoP (DNS-based routing)
- Ingest server receives raw H.264/AAC stream

**2. Transcode (~1-2 seconds)**
- GPU-accelerated transcoding at the ingest PoP
- Produces 4 quality levels: source, 720p, 480p, 160p
- Segments stream into 2-second HLS chunks (.ts files)

**3. Distribution (~1-2 seconds)**
- Segments pushed to origin storage + CDN edge nodes
- Popular streams: proactive push to all edges
- Long-tail streams: pull-through caching on first viewer request

**4. Playback (~500ms)**
- Client fetches master playlist (lists available qualities)
- ABR algorithm picks quality based on measured bandwidth
- Client buffers 2-4 seconds of segments for smooth playback

**Failure Handling**:
- Ingest PoP failure: streamer reconnects to next-nearest PoP (auto-reconnect in OBS)
- Transcode failure: fallback to single-quality passthrough
- CDN failure: failover to secondary CDN provider`
      },
      {
        question: 'How do you scale chat to 100K+ concurrent users in one room?',
        answer: `**Tiered Chat Architecture**:

**Tier 1 - WebSocket Gateway (connection handling)**:
- Each server holds ~50K WebSocket connections
- Popular chat room spans 5-20 gateway servers
- Gateway servers register with a Chat Coordinator: "I have 5000 users for channel X"

**Tier 2 - Chat Service (message processing)**:
- Receives messages from any gateway, validates, applies moderation
- Publishes to Redis Pub/Sub channel: \`chat:{channelId}\`
- All gateways for that channel subscribe and broadcast to their connections

**Scaling Beyond 50K Messages/sec**:
- Problem: even Redis Pub/Sub has limits (~500K msg/sec per channel)
- Solution: message batching -- accumulate messages for 100ms, send as batch
- Further: server-side sampling for extreme rooms (>100K users):
  - Show all moderator/subscriber messages
  - Sample regular messages at 1/N rate to stay under bandwidth budget
  - Each client sees a different random sample (feels full-speed)

**Moderation Pipeline** (inline, <50ms):
- Blocked words filter (Aho-Corasick automaton)
- Slow mode: rate limit per user per channel
- Follower-only / subscriber-only mode
- AutoMod ML classifier for toxicity (async, flag for review)`
      },
      {
        question: 'How do you handle the viewer count skew?',
        answer: `**The Long-Tail Problem**:
- Top 100 streams: 80% of all viewers
- Bottom 90% of streams: <10 viewers each

**Resource Allocation Strategy**:

**For Popular Streams (>1000 viewers)**:
- Dedicated transcoding GPU slots
- Proactive CDN edge caching (push model)
- Chat room gets dedicated Redis Pub/Sub channels
- Multiple gateway servers assigned

**For Long-Tail Streams (<100 viewers)**:
- Shared transcoding pool (may only produce 2 quality levels)
- CDN pull-through caching (first viewer triggers cache fill)
- Chat handled by shared multi-room gateway servers
- Single Redis channel suffices

**Dynamic Scaling**:
- Monitor viewer count changes in real-time
- "Raid" events (streamer sends all viewers to another): triggers pre-warming
  - Alert CDN: warm cache for target stream at edges where raid viewers are
  - Spin up additional chat gateways for target channel
  - Scale up transcoding quality for target stream
- Scaling down: cool-off period of 5 minutes before reducing resources`
      }
    ],

    requirements: ['Live video ingest and delivery', 'Real-time chat', 'Stream discovery', 'Clips and VOD', 'Follow notifications', 'Channel subscriptions'],
    components: ['RTMP Ingest PoPs', 'GPU Transcoding Farm', 'CDN (multi-tier)', 'WebSocket Gateway Cluster', 'Redis Pub/Sub', 'Cassandra (chat)', 'PostgreSQL (metadata)', 'S3 (VOD)'],
    keyDecisions: [
      'Regional RTMP ingest with local GPU transcoding to minimize latency',
      'HLS segmented delivery with 2-second chunks for adaptive bitrate streaming',
      'Proactive CDN push for popular streams, pull-through for long-tail',
      'Clustered WebSocket gateways with Redis Pub/Sub for chat fan-out',
      'Message batching and server-side sampling for ultra-high-volume chat rooms',
      'Dynamic resource allocation based on real-time viewer count changes'
    ],

    edgeCases: [
      { scenario: 'Streamer with 500K viewers suddenly ends stream', impact: 'Mass WebSocket disconnection spike overwhelms connection cleanup and redirect systems', mitigation: 'Graceful stream-end notification with staggered client reconnection, redirect viewers to raid target in batches' },
      { scenario: 'Chat moves at 50K messages/second during hype moments', impact: 'Clients cannot render all messages, server fan-out overwhelmed', mitigation: 'Server-side chat sampling (show 1 in N messages), client-side throttled rendering, batch messages in 100ms windows' },
      { scenario: 'Streamer broadcasts copyrighted content (DMCA)', impact: 'Legal liability, need to take down live stream and stored VOD quickly', mitigation: 'Real-time audio fingerprinting (like Audible Magic), automatic mute or stream termination, DMCA takedown workflow for VODs' },
      { scenario: 'Transcoding pipeline fails mid-stream for a popular channel', impact: 'Viewers on lower quality settings lose the stream, viewer count drops', mitigation: 'Redundant transcoding pipelines, automatic failover to backup encoder, serve source quality as fallback' },
      { scenario: 'Viewer in region with poor connectivity buffers constantly', impact: 'Poor viewing experience, viewer leaves', mitigation: 'Adaptive bitrate streaming (ABR) with aggressive downshift, regional edge caching, low-latency mode with reduced buffer' },
    ],
    tradeoffs: [
      { decision: 'Low-latency streaming (WebRTC/LL-HLS) vs standard HLS', pros: 'Low-latency gives <2s delay (better interaction); standard HLS is reliable with large buffer', cons: 'Low-latency sacrifices buffer resilience; standard HLS has 10-30s delay', recommendation: 'Low-latency HLS by default with fallback to standard HLS on poor connections' },
      { decision: 'Server-side transcoding vs client-side adaptive bitrate', pros: 'Server transcoding serves all clients; client-side ABR adapts to each viewer', cons: 'Server transcoding is expensive per-stream; ABR requires smart client logic', recommendation: 'Server-side transcoding to multiple quality levels combined with client-side ABR switching between them' },
      { decision: 'Chat as part of video stream vs separate WebSocket', pros: 'Embedded chat is simpler; separate WebSocket enables rich chat features', cons: 'Embedded chat has video delay; separate WebSocket requires additional connection management', recommendation: 'Separate WebSocket for chat (enables emotes, moderation, polls) with video stream independent' },
      { decision: 'Store all VODs vs expire after retention period', pros: 'Store all enables content library; expiring saves massive storage costs', cons: 'Store all is expensive for small streamers; expiring loses content value', recommendation: 'Tiered retention: 7 days for free, 60 days for partners, indefinite for highlights/clips' },
    ],
    layeredDesign: [
      { name: 'Ingest Layer', purpose: 'Receive live video from streamers and prepare for distribution', components: ['RTMP Ingest Server', 'Transcoder (multi-bitrate)', 'Stream Health Monitor', 'Thumbnail Generator'] },
      { name: 'Distribution Layer', purpose: 'Deliver video segments to viewers worldwide with low latency', components: ['CDN Edge Servers', 'HLS/LL-HLS Packager', 'Origin Shield', 'ABR Controller'] },
      { name: 'Interactive Layer', purpose: 'Real-time chat, subscriptions, and viewer engagement', components: ['Chat Service (WebSocket)', 'Chat Moderation', 'Subscription/Bits Service', 'Polls & Predictions'] },
      { name: 'Data & Storage Layer', purpose: 'VOD storage, analytics, and user data', components: ['Object Storage (VODs)', 'PostgreSQL (users, streams)', 'Redis (live state, chat)', 'Analytics Pipeline (Kafka)'] },
    ],
  },

  // ─── 5. Gmail ───────────────────────────────────────────────────────
  {
    id: 'gmail',
    isNew: true,
    title: 'Gmail',
    subtitle: 'Email Service',
    icon: 'mail',
    color: '#ea4335',
    difficulty: 'Hard',
    description: 'Design a web-based email service supporting sending, receiving, searching, labeling, filtering, and attachment storage at scale.',

    introduction: `Email remains one of the most critical communication systems, and designing a service like Gmail requires handling an extraordinary volume of messages while providing fast search, spam filtering, and reliable delivery. Gmail serves over 1.8 billion users, processing hundreds of billions of emails daily.

The system must handle the full email lifecycle: receiving emails via SMTP from external servers, delivering to recipients' mailboxes, supporting complex queries across years of email history, managing attachments (often the bulk of storage), and fighting spam and phishing at massive scale.

A unique challenge of email systems compared to chat apps is the federated protocol: Gmail must interoperate with every other email provider via SMTP/IMAP/POP3, handle email authentication (SPF, DKIM, DMARC), and manage reputation to avoid being flagged as spam by other providers.`,

    functionalRequirements: [
      'Send and receive emails with attachments (up to 25MB)',
      'Organize with labels, folders, and stars',
      'Full-text search across all emails with advanced filters',
      'Spam and phishing detection',
      'Automated rules and filters',
      'Thread conversations by subject/references',
      'Draft auto-saving',
      'Push notifications for new emails'
    ],

    nonFunctionalRequirements: [
      'Email delivery latency < 5 seconds (internal), < 30 seconds (external)',
      'Search latency < 500ms across millions of emails per user',
      '99.99% availability (email is mission-critical)',
      'Zero email loss (durability)',
      'Support 1.8B+ users, 300B+ emails/day',
      'Storage: 15GB free per user, expandable'
    ],

    estimation: {
      users: '1.8B accounts, 500M DAU, avg 50 emails received/day per active user',
      storage: '~75KB avg email size * 300B emails/day = ~22PB/day new email data',
      bandwidth: '~2PB/day inbound + ~2PB/day outbound email traffic',
      qps: '~5M email deliveries/sec, ~1M search queries/sec, ~500K send operations/sec'
    },

    apiDesign: {
      description: 'RESTful API for client operations, SMTP for email transport',
      endpoints: [
        { method: 'GET', path: '/api/messages', params: 'labelId, q (search), maxResults, pageToken', response: '{ messages[{id, threadId, snippet}], nextPageToken }', description: 'List messages matching the given criteria. The q parameter supports Gmail-style search operators (from:, to:, subject:, has:attachment, after:, before:). Messages are returned as lightweight stubs with snippets; full content requires a separate fetch. Results are page-token paginated to handle mailboxes with millions of messages efficiently.' },
        { method: 'GET', path: '/api/messages/:id', params: 'format=full|metadata|minimal', response: '{ id, threadId, labels[], payload, sizeEstimate }', description: 'Fetch a single message with configurable detail level. "minimal" returns only IDs and labels for batch operations; "metadata" adds headers (From, To, Subject, Date); "full" includes the decoded MIME body tree. Inline images are returned as base64 content parts. The sizeEstimate helps clients decide whether to fetch attachments on metered connections.' },
        { method: 'POST', path: '/api/messages/send', params: '{ raw (RFC 2822), threadId? }', response: '{ id, threadId, labelIds[] }', description: 'Send an email. The raw field contains a complete RFC 2822 message (headers + body) encoded as base64url. If threadId is provided, the message is threaded with the existing conversation using In-Reply-To and References headers. The server queues the message for SMTP delivery asynchronously and applies the SENT label. Rate-limited to 500 messages/day per user to prevent abuse.' },
        { method: 'POST', path: '/api/messages/:id/modify', params: '{ addLabelIds[], removeLabelIds[] }', response: '{ id, labelIds[] }', description: 'Modify the labels on a message (e.g., archive by removing INBOX, mark as read by removing UNREAD). This is the primary mechanism for organizing email since Gmail uses labels instead of folders. The operation is atomic -- all label additions and removals are applied together. System labels (SENT, DRAFT) cannot be modified through this endpoint.' },
        { method: 'GET', path: '/api/threads/:id', params: 'format', response: '{ id, messages[], snippet }', description: 'Fetch an entire email thread (conversation) with all its messages. Messages within the thread are ordered chronologically. The snippet is the last message\'s preview text. Thread grouping is based on the Subject header and RFC 2822 References chain. This endpoint is the primary way to render a conversation view, avoiding N+1 queries for individual messages.' },
        { method: 'POST', path: '/api/messages/:id/attachments', params: 'binary upload', response: '{ attachmentId, size }', description: 'Upload a binary attachment for a draft message. Attachments are stored in object storage (GCS/S3) and referenced by attachmentId in the message body. Maximum size is 25MB per attachment, 35MB total per message. Large files above the limit should be uploaded to Google Drive and shared as a link instead. The server validates MIME type and scans for malware before accepting.' }
      ]
    },

    dataModel: {
      description: 'User mailboxes, messages, labels, and search index',
      schema: `mailboxes {
  user_id: bigint PK
  email: varchar unique
  storage_used: bigint
  storage_limit: bigint
  settings: jsonb
}

messages {
  id: bigint PK
  user_id: bigint  -- partition key
  thread_id: bigint FK
  from_addr: varchar
  to_addrs: text[]
  cc_addrs: text[]
  subject: varchar
  snippet: varchar(200)
  body_ref: varchar  -- pointer to blob storage
  attachment_refs: jsonb
  size_bytes: int
  is_read: boolean
  is_starred: boolean
  spam_score: float
  received_at: timestamp
}

message_labels {
  user_id: bigint
  message_id: bigint
  label_id: varchar  -- INBOX, SENT, SPAM, TRASH, custom
  PK(user_id, message_id, label_id)
}

threads {
  id: bigint PK
  user_id: bigint
  subject: varchar
  last_message_at: timestamp
  message_count: int
  participant_addrs: text[]
}

-- Elasticsearch per-user index partition
email_search_index {
  message_id, user_id, from, to, subject, body_text,
  labels, has_attachment, date, size
}`,
        examples: [
          {
            table: 'messages',
            label: 'Received email with attachment reference',
            json: `{
  "id": 18294710384562,
  "user_id": 440291837,
  "thread_id": 18294710384500,
  "from_addr": "alice@company.com",
  "to_addrs": ["bob@gmail.com"],
  "cc_addrs": ["team-leads@company.com"],
  "subject": "Q1 Performance Review - Final Draft",
  "snippet": "Hi Bob, please find the finalized Q1 performance review attached. Let me know if you have...",
  "body_ref": "gs://mail-bodies/sha256/a1b2c3d4e5f6",
  "attachment_refs": [{"name": "Q1_Review_Final.pdf", "size": 2841920, "mime": "application/pdf", "ref": "gs://mail-attach/sha256/f6e5d4c3b2a1"}],
  "size_bytes": 2904128,
  "is_read": false,
  "is_starred": true,
  "spam_score": 0.02,
  "received_at": "2026-04-19T09:14:33Z"
}`
          },
          {
            table: 'threads',
            label: 'Email thread with multiple participants',
            json: `{
  "id": 18294710384500,
  "user_id": 440291837,
  "subject": "Q1 Performance Review - Final Draft",
  "last_message_at": "2026-04-19T09:14:33Z",
  "message_count": 4,
  "participant_addrs": ["alice@company.com", "bob@gmail.com", "team-leads@company.com"]
}`
          },
          {
            table: 'message_labels',
            label: 'Label assignment for inbox categorization',
            json: `{
  "user_id": 440291837,
  "message_id": 18294710384562,
  "label_id": "INBOX"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/gmail/impl-basic.png',
      description: 'A monolithic SMTP server receives emails, stores them in a relational database, and serves a web interface. Search is powered by SQL LIKE queries. Attachments stored as BLOBs in the database.',
      problems: [
        'SQL LIKE search across millions of emails is extremely slow',
        'Storing attachments in DB bloats the database and complicates backups',
        'Single SMTP server is a bottleneck and single point of failure',
        'No spam filtering means inbox is quickly overwhelmed'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Email Architecture',
      diagramSrc: '/diagrams/gmail/impl-advanced.png',
      description: 'Inbound email flows through MX servers -> spam/phishing filter pipeline -> delivery workers that write to Bigtable (partitioned by user_id). Email bodies and attachments are stored separately in blob storage. Elasticsearch provides per-user full-text search. Outbound email uses a queue with rate limiting and reputation management.',
      keyPoints: [
        'MX servers accept SMTP, validate SPF/DKIM/DMARC, and enqueue to Kafka for processing',
        'Multi-stage spam pipeline: heuristic rules -> ML classifier -> reputation scoring -> sandbox (attachment scanning)',
        'Bigtable for message metadata: partition by user_id, row key = user_id + reverse_timestamp for chronological listing',
        'Email bodies stored in blob storage (GCS/S3), referenced by content hash for deduplication',
        'Per-user Elasticsearch index shards: enables fast search scoped to a single mailbox',
        'Push notifications via long-polling or server-sent events (IMAP IDLE equivalent for web clients)'
      ],
      databaseChoice: 'Bigtable for message metadata (wide-column, user-partitioned); GCS/S3 for email bodies and attachments; Elasticsearch for full-text search; Redis for session state and rate limiting',
      caching: 'Redis caches recent inbox messages (last 50 per user), thread summaries, and label counts. CDN for static web assets. Attachment download URLs are pre-signed with expiration.'
    },

    tips: [
      'Clarify scope: focus on the storage/retrieval side or the email delivery protocol side?',
      'Spam filtering is a critical differentiator -- discuss the multi-stage pipeline',
      'Search is the hardest read-path problem: discuss per-user index partitioning',
      'Separate email bodies from metadata: bodies are large and rarely re-read in full',
      'Threading is non-trivial: emails are grouped by References and In-Reply-To headers',
      'Discuss SMTP delivery guarantees: retry with exponential backoff, bounce handling'
    ],

    keyQuestions: [
      {
        question: 'How does spam filtering work at scale?',
        answer: `**Multi-Stage Spam Pipeline (inline, <2 seconds)**:

**Stage 1 - Connection-Level (SMTP)**:
- IP reputation check against known spam sources
- SPF record validation (is sender authorized for this domain?)
- DKIM signature verification (was the email tampered with?)
- DMARC policy check (what does the domain owner want us to do?)

**Stage 2 - Content Analysis**:
- Heuristic rules engine (SpamAssassin-like): checks headers, body patterns
- ML classifier trained on billions of user-reported spam/not-spam decisions
- URL reputation: check links against known phishing databases
- Attachment sandboxing: execute suspicious attachments in a VM, observe behavior

**Stage 3 - Aggregate Signals**:
- If 1000 users received the same email body hash in the last hour -> likely spam
- Sender reputation score: based on historical spam reports from all recipients
- New sender penalty: first email from unknown sender gets extra scrutiny

**Scoring**: Each stage contributes to a composite spam_score (0.0 to 1.0).
- < 0.3: deliver to Inbox
- 0.3-0.7: deliver to Spam folder
- > 0.7: reject at SMTP level (saves storage)

**Feedback Loop**: Users marking "Not Spam" or "Report Spam" feeds back into ML training.`
      },
      {
        question: 'How do you handle email search across years of history?',
        answer: `**Per-User Elasticsearch Sharding**:

**Index Strategy**:
- Each user's emails are indexed in a dedicated Elasticsearch shard group
- Routing key = user_id ensures all of a user's documents land on the same shard
- Typical user has 50K-500K emails -> single shard handles this easily

**What's Indexed**:
- From, To, Cc, Subject: keyword fields (exact match + prefix)
- Body text: analyzed with standard tokenizer + language detection
- Labels, has_attachment, size_range: keyword filters
- Date: date range queries

**Query Examples**:
- \`from:alice@company.com has:attachment after:2024/01/01 quarterly report\`
- Parsed into: bool query with term filters (from, has_attachment, date range) + match query (body text)

**Performance**:
- Query scoped to single user's shard -> very fast (<100ms for most queries)
- Heavy users (1M+ emails): may need 2-3 shards, but Elasticsearch handles this transparently

**Indexing Pipeline**:
- New email -> Kafka -> Search Indexer -> Elasticsearch
- Index lag: 1-5 seconds (search may not find email sent 1 second ago)
- Deleted/archived emails: soft delete in index, periodic cleanup`
      },
      {
        question: 'How do you ensure zero email loss?',
        answer: `**Durability at Every Stage**:

**SMTP Reception**:
- Email is only ACK'd to sending server after it's durably written to Kafka
- If server crashes before ACK, sending server retries (SMTP guarantees this)
- Kafka topic has replication factor 3, min.insync.replicas = 2

**Processing Pipeline**:
- Each consumer checkpoints progress in Kafka (consumer offsets)
- If consumer crashes mid-processing, it replays from last checkpoint
- Idempotent writes to Bigtable (same email processed twice = same result)

**Storage**:
- Bigtable: data replicated across 3+ data centers (synchronous replication)
- Blob storage (GCS): 99.999999999% (11 nines) durability
- Cross-region replication: emails are readable from any region within minutes

**Defense in Depth**:
- WAL (write-ahead log) at every persistent component
- Daily consistency checks: compare Kafka offsets vs Bigtable row counts
- Backup Kafka cluster in different region for disaster recovery
- Deletion has 30-day soft-delete window (Trash -> permanent delete after 30 days)`
      }
    ],

    requirements: ['Send/receive emails', 'Full-text search', 'Spam filtering', 'Labels and threading', 'Attachments', 'Push notifications'],
    components: ['MX Servers (SMTP)', 'Kafka', 'Spam Pipeline (ML + rules)', 'Bigtable', 'Blob Storage (GCS)', 'Elasticsearch', 'Redis'],
    keyDecisions: [
      'Multi-stage spam pipeline with ML classifier and aggregate signal detection',
      'Bigtable for message metadata partitioned by user_id for locality',
      'Separate blob storage for email bodies and attachments to keep metadata compact',
      'Per-user Elasticsearch shard routing for fast mailbox-scoped search',
      'SMTP-level rejection for high-confidence spam to save storage and processing',
      'Kafka-based processing pipeline with exactly-once delivery semantics'
    ],

    edgeCases: [
      { scenario: 'Email loop: auto-reply rule triggers another auto-reply indefinitely', impact: 'Exponential message generation, fills mailboxes, wastes server resources', mitigation: 'Loop detection via X-Auto-Reply and message ID tracking, limit auto-replies to 1 per sender per hour, cap chain depth' },
      { scenario: 'Large attachment (25MB) sent to a mailing list with 10K recipients', impact: 'Storage multiplied 10K times, delivery queue blocked by slow recipients', mitigation: 'Single-instance storage with reference counting, attachment deduplication by hash, progressive delivery with priority queuing' },
      { scenario: 'Spam campaign mimics legitimate sender domain (spoofing)', impact: 'Users receive phishing emails that appear to come from trusted contacts', mitigation: 'Enforce SPF, DKIM, and DMARC validation, display warning banners for failed authentication, ML-based content analysis' },
      { scenario: 'User accidentally deletes emails then empties trash', impact: 'Permanent data loss of potentially critical business correspondence', mitigation: 'Soft delete with 30-day trash retention, legal hold capability, admin-level recovery from backup within retention window' },
      { scenario: 'Recipient mail server is down for extended period', impact: 'Outgoing messages queue up, memory pressure on sending servers', mitigation: 'Exponential backoff retry (up to 5 days per RFC), dead-letter after max retries, bounce notification to sender' },
    ],
    tradeoffs: [
      { decision: 'Push (IMAP IDLE) vs pull (polling) for new mail notification', pros: 'Push gives instant notification; pull is simpler and works through all firewalls', cons: 'Push requires persistent connections per mailbox; pull wastes bandwidth and has latency', recommendation: 'IMAP IDLE for desktop clients, push notifications for mobile, polling as fallback' },
      { decision: 'Store emails as individual files vs in a database', pros: 'Files are simple and leverage filesystem caching; database enables complex queries', cons: 'Files are hard to search and index; database has overhead for large attachments', recommendation: 'Metadata and body in database (Bigtable/Cassandra), large attachments in object storage with references' },
      { decision: 'Spam filtering at SMTP level vs after delivery', pros: 'SMTP-level saves storage and processing; post-delivery allows user review', cons: 'SMTP-level may reject legitimate email; post-delivery wastes resources on spam', recommendation: 'Multi-stage: reject obvious spam at SMTP level, classify borderline at delivery, allow user review in spam folder' },
      { decision: 'Single global search index vs per-user search index', pros: 'Global index shares infrastructure; per-user index ensures isolation', cons: 'Global index complicates access control; per-user index wastes resources for light users', recommendation: 'Per-user index partitions within shared Elasticsearch cluster for balance of isolation and efficiency' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Web, mobile, and desktop email clients with rich compose and search', components: ['Web Client (React)', 'Mobile App', 'Desktop Client (IMAP)', 'Push Notification Handler'] },
      { name: 'Email Gateway Layer', purpose: 'Handle SMTP inbound/outbound and spam filtering', components: ['SMTP Receiver', 'SMTP Sender', 'Spam/Phishing Filter', 'SPF/DKIM/DMARC Validator'] },
      { name: 'Application Layer', purpose: 'Email business logic, labeling, threading, and search', components: ['Mailbox Service', 'Thread Composer', 'Label/Filter Engine', 'Search Service'] },
      { name: 'Data Layer', purpose: 'Persistent storage for messages, attachments, and indices', components: ['Bigtable (email bodies)', 'Blob Storage (attachments)', 'Elasticsearch (search index)', 'Redis (session cache)'] },
    ],
  },

  // ─── 6. Google Drive ────────────────────────────────────────────────
  {
    id: 'google-drive',
    isNew: true,
    title: 'Google Drive',
    subtitle: 'Cloud File Storage & Collaboration',
    icon: 'hardDrive',
    color: '#4285f4',
    difficulty: 'Hard',
    description: 'Design a cloud file storage service with real-time collaboration, file versioning, sharing permissions, and cross-device sync.',

    introduction: `Cloud file storage systems like Google Drive combine several difficult distributed systems challenges: reliable file sync across devices, real-time collaborative editing, fine-grained permission models, and efficient storage of petabytes of user files including deduplication and versioning.

Unlike simple blob storage (S3), a Drive-like system must maintain a hierarchical file/folder namespace per user, support shared folders that appear in multiple users' views, track detailed version history, and synchronize changes across desktop clients, mobile apps, and web interfaces in near real-time.

The sync engine is particularly challenging: it must handle concurrent modifications from multiple devices, resolve conflicts gracefully, work offline with eventual sync, and minimize bandwidth by transferring only deltas rather than full files.`,

    functionalRequirements: [
      'Upload, download, and delete files (up to 5TB per file)',
      'Create folders and organize files hierarchically',
      'Share files/folders with specific users or via link (view, comment, edit)',
      'File versioning: view and restore previous versions',
      'Real-time sync across all connected devices',
      'Offline access with sync when reconnected',
      'Full-text search across file names and document contents',
      'Collaborative editing (for native document types)'
    ],

    nonFunctionalRequirements: [
      'Sync latency < 10 seconds for small files across devices',
      'Upload throughput: support 100Mbps+ per user',
      '99.99% availability for file access',
      '99.999999999% durability (11 nines) for stored files',
      'Support 1B+ users with 100M+ DAU',
      'Storage efficiency: deduplication and compression'
    ],

    estimation: {
      users: '1B users, 100M DAU, avg 5GB stored per user',
      storage: '5 exabytes total stored; ~50PB new data/day',
      bandwidth: '~50PB/day upload + ~100PB/day download',
      qps: '~500K file operations/sec (upload, download, rename, share), ~200K sync check/sec'
    },

    apiDesign: {
      description: 'RESTful API with resumable uploads for large files',
      endpoints: [
        { method: 'POST', path: '/api/files/upload', params: 'multipart: { metadata, file binary } or resumable session', response: '{ fileId, version, md5 }', description: 'Upload a file using either simple multipart (files <5MB) or resumable upload (large files). Resumable uploads return a session URI that accepts chunked PUT requests, enabling retry of individual chunks on network failure without re-uploading the entire file. The server computes an MD5 checksum and returns it for client-side verification. Each upload creates version 1 of the file.' },
        { method: 'GET', path: '/api/files/:fileId', params: 'version?, alt=media (download)', response: 'File binary or metadata JSON', description: 'Fetch file metadata (default) or download file content (alt=media). Without alt=media, returns JSON metadata including name, size, MIME type, sharing permissions, and version history. The version parameter retrieves a specific historical version. Downloads are served via a CDN redirect (302) with a time-limited signed URL to offload bandwidth from the API servers.' },
        { method: 'GET', path: '/api/files', params: 'folderId, q (search), pageToken, orderBy', response: '{ files[], nextPageToken }', description: 'List files in a folder or search across all files. The q parameter supports search operators (name contains, mimeType, modifiedTime >, owners, sharedWithMe). Results can be ordered by name, modifiedTime, or sharedWithMeTime. Page-token pagination handles folders with thousands of files. Trashed files are excluded by default unless explicitly queried.' },
        { method: 'PATCH', path: '/api/files/:fileId', params: '{ name?, parentId?, starred? }', response: '{ updated file metadata }', description: 'Update file metadata without re-uploading content. Supports renaming, moving to a different folder (changing parentId), starring, and updating description. Moving a file requires write access to both the source and destination folders. The operation uses optimistic concurrency control via an If-Match header with the file\'s etag to prevent lost updates from concurrent modifications.' },
        { method: 'POST', path: '/api/files/:fileId/permissions', params: '{ email, role: viewer|commenter|editor }', response: '{ permissionId }', description: 'Share a file with a specific user by granting a permission. The role determines the access level: viewers can read, commenters can add comments, editors can modify content. Sharing sends an email notification to the recipient. Permissions cascade to child files in shared folders. The owner can revoke any permission by deleting the permissionId. Link-sharing (anyone with the link) is also supported via a special "anyone" permission type.' },
        { method: 'GET', path: '/api/changes', params: 'startChangeId, pageToken', response: '{ changes[], newStartChangeId }', description: 'Poll for file changes since a given checkpoint. The client stores newStartChangeId and uses it in subsequent polls to receive only incremental changes (creates, updates, deletes, permission changes). This is the foundation of the desktop sync client -- it polls every 30-60 seconds and applies changes locally. For real-time sync, a push notification channel can be registered to receive instant change webhooks.' }
      ]
    },

    dataModel: {
      description: 'File metadata, versions, permissions, and change tracking',
      schema: `files {
  id: uuid PK
  owner_id: bigint FK
  name: varchar(255)
  mime_type: varchar
  size_bytes: bigint
  parent_id: uuid FK nullable  -- folder hierarchy
  is_folder: boolean
  current_version: int
  md5_checksum: varchar(32)
  blob_ref: varchar  -- pointer to content-addressable storage
  is_trashed: boolean
  created_at: timestamp
  modified_at: timestamp
}

file_versions {
  file_id: uuid FK
  version: int
  blob_ref: varchar  -- content-addressable blob key
  size_bytes: bigint
  modified_by: bigint FK
  created_at: timestamp
  PK(file_id, version)
}

permissions {
  id: uuid PK
  file_id: uuid FK
  grantee_id: bigint  -- user or group
  grantee_type: enum(user, group, anyone)
  role: enum(owner, editor, commenter, viewer)
  inherited: boolean  -- from parent folder
  created_at: timestamp
}

change_log {
  change_id: bigint PK (monotonically increasing)
  user_id: bigint  -- whose view was affected
  file_id: uuid
  change_type: enum(create, update, delete, permission, move)
  timestamp: timestamp
}

-- Content-addressable storage
blobs {
  content_hash: varchar PK  -- SHA-256
  storage_path: varchar
  size_bytes: bigint
  ref_count: int  -- for garbage collection
}`,
        examples: [
          {
            table: 'files',
            label: 'Shared document with version history',
            json: `{
  "id": "d4e5f6a7-b8c9-4d0e-a1f2-3b4c5d6e7f8a",
  "owner_id": 772019384,
  "name": "System Design Interview Notes.docx",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size_bytes": 1482935,
  "parent_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "is_folder": false,
  "current_version": 12,
  "md5_checksum": "e99a18c428cb38d5f260853678922e03",
  "blob_ref": "cas://sha256/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "is_trashed": false,
  "created_at": "2026-03-01T10:30:00Z",
  "modified_at": "2026-04-19T11:22:45Z"
}`
          },
          {
            table: 'file_versions',
            label: 'Version snapshot from collaborative edit',
            json: `{
  "file_id": "d4e5f6a7-b8c9-4d0e-a1f2-3b4c5d6e7f8a",
  "version": 12,
  "blob_ref": "cas://sha256/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "size_bytes": 1482935,
  "modified_by": 881029374,
  "created_at": "2026-04-19T11:22:45Z"
}`
          },
          {
            table: 'permissions',
            label: 'Editor access shared with a collaborator',
            json: `{
  "id": "p9a8b7c6-d5e4-4f3a-b2c1-d0e9f8a7b6c5",
  "file_id": "d4e5f6a7-b8c9-4d0e-a1f2-3b4c5d6e7f8a",
  "grantee_id": 881029374,
  "grantee_type": "user",
  "role": "editor",
  "inherited": false,
  "created_at": "2026-03-02T14:00:00Z"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/google-drive/impl-basic.png',
      description: 'Files uploaded to application servers, stored in a single object storage system with metadata in a relational database. Desktop clients poll for changes periodically.',
      problems: [
        'Polling wastes bandwidth and creates latency: changes not detected until next poll interval',
        'No deduplication: identical files stored multiple times across users',
        'Full-file uploads for small edits waste bandwidth',
        'Permission checks on deeply nested shared folders require recursive queries'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Sync Architecture with Content-Addressable Storage',
      diagramSrc: '/diagrams/google-drive/impl-advanced.png',
      description: 'Files are chunked (4MB blocks), each chunk stored by its content hash in blob storage (deduplication). A sync service maintains per-user change logs. Desktop clients maintain a local database of file states and use long-polling/WebSocket to receive real-time change notifications. Large file uploads use resumable, chunked protocols.',
      keyPoints: [
        'Content-addressable storage: chunks keyed by SHA-256 hash enable cross-user deduplication (~30% storage savings)',
        'Block-level sync: only changed 4MB blocks are uploaded, using rolling checksums (rsync algorithm) to detect diffs',
        'Change notification: sync service pushes changes via long-poll; client diffs local state against server state',
        'Resumable uploads: client requests upload session, uploads chunks independently, server assembles on completion',
        'Permission inheritance: permissions cached in a tree structure, invalidated on permission change via pub/sub',
        'Conflict resolution: last-writer-wins for files; for collaborative docs, operational transforms handle concurrent edits'
      ],
      databaseChoice: 'Spanner/CockroachDB for metadata (globally consistent, supports complex queries); GCS/S3 for blob storage; Redis for session state and change notification pub/sub; Elasticsearch for file search',
      caching: 'Metadata cache in Redis (file listings, permissions); CDN for shared/public file downloads; client-side cache for recently accessed files with ETag validation'
    },

    tips: [
      'Focus on the sync protocol: how changes propagate between devices',
      'Discuss content-addressable storage and deduplication early -- it shows depth',
      'Permission inheritance in nested folders is a classic tree problem',
      'Mention conflict resolution: what happens when two devices edit the same file offline?',
      'Resumable uploads are essential for large files -- discuss the protocol',
      'Separate file metadata from file content in your storage design'
    ],

    keyQuestions: [
      {
        question: 'How does file sync work across devices?',
        answer: `**Change-Based Sync Protocol**:

**Server Side**:
- Every file mutation generates a change_log entry with a monotonically increasing change_id
- Change log is per-user (each user's "view" of the filesystem)
- Shared file edits generate entries in all viewers' change logs

**Client Side**:
- Client stores \`last_synced_change_id\` locally
- On sync: \`GET /api/changes?startChangeId=12345\`
- Server returns all changes since that ID
- Client applies changes to local state, updates checkpoint

**Real-Time Notification**:
- Client maintains long-poll connection to sync service
- When a change occurs, sync service notifies affected clients immediately
- Client fetches the actual changes via the changes API

**Conflict Resolution**:
- Same file edited on two offline devices -> conflict
- Strategy: keep both versions, rename conflicting copy: "report (conflict from Device B).docx"
- For Google Docs (collaborative): OT/CRDT handles concurrent edits in real-time, no conflicts possible

**Bandwidth Optimization**:
- Only sync metadata for unmodified files (name, permissions)
- For modified files, use rolling checksum to identify changed blocks
- Only upload/download changed 4MB blocks`
      },
      {
        question: 'How does content-addressable storage and deduplication work?',
        answer: `**Content-Addressable Storage (CAS)**:
- File is split into 4MB chunks
- Each chunk hashed with SHA-256: \`chunk_hash = SHA256(chunk_bytes)\`
- Chunk stored at path derived from hash: \`/ab/cd/abcdef1234...\`
- File metadata stores ordered list of chunk hashes

**Deduplication Levels**:

**Cross-user dedup**: If Alice and Bob both upload the same 1GB video, only one copy stored
- On upload: compute chunk hashes, check if hash exists in blob store
- If exists: increment ref_count, skip upload (instant "upload")
- Savings: ~30% for consumer storage, ~60% for enterprise (shared documents)

**Cross-version dedup**: Editing page 50 of a 200-page PDF
- Only the chunk containing page 50 changes
- New version references 49 unchanged chunks + 1 new chunk
- Version storage cost: ~1 chunk instead of entire file

**Garbage Collection**:
- Blob ref_count tracks how many file versions reference each chunk
- When ref_count reaches 0: chunk eligible for deletion
- GC runs offline, marks and sweeps unreferenced chunks weekly
- 30-day grace period before physical deletion (safety buffer)`
      },
      {
        question: 'How do you handle permissions for shared folders?',
        answer: `**Hierarchical Permission Model**:

**Permission Types**: Owner > Editor > Commenter > Viewer
**Inheritance Rule**: Child inherits parent's permissions unless explicitly overridden

**Storage**:
- Explicit permissions stored in \`permissions\` table
- Inherited permissions computed at read time (or cached)

**Permission Check Algorithm**:
1. Check explicit permissions on the file
2. If none found, walk up the folder tree checking each parent
3. First explicit permission found = effective permission
4. Root folder with no permission = no access

**Caching Strategy** (permissions are read-heavy):
- Build a materialized permission map per file: \`{userId -> role}\`
- Cache in Redis with TTL = 5 minutes
- On permission change: publish invalidation event to Pub/Sub
- All nodes receiving event clear cached permissions for affected subtree

**Shared Folder Challenges**:
- Shared folder appears in multiple users' "My Drive" (as a virtual link)
- Moving a shared folder: only the owner can move it
- Removing yourself from shared folder: removes the link, not the folder
- "Anyone with link" permissions: verified at download time using signed URL + permission check`
      }
    ],

    requirements: ['File upload/download', 'Cross-device sync', 'Sharing and permissions', 'Version history', 'Search', 'Offline access'],
    components: ['Sync Service', 'Content-Addressable Blob Storage', 'Metadata DB (Spanner)', 'Redis (cache + pub/sub)', 'CDN', 'Elasticsearch', 'Change Log'],
    keyDecisions: [
      'Content-addressable storage with SHA-256 chunk hashing for cross-user and cross-version deduplication',
      'Block-level sync with rolling checksums to minimize bandwidth for file updates',
      'Monotonically increasing change log per user for efficient sync protocol',
      'Long-poll notifications for real-time change detection across devices',
      'Permission inheritance with Redis-cached materialized permission maps',
      'Resumable chunked uploads with server-side assembly for reliability'
    ],

    edgeCases: [
      { scenario: 'Two users edit the same document simultaneously in different applications', impact: 'One user overwrites the other, last-writer-wins causes data loss', mitigation: 'Operational Transform (OT) or CRDT for real-time co-editing, conflict detection with merge UI for async edits' },
      { scenario: 'User uploads a 10GB file on an unstable mobile connection', impact: 'Upload fails repeatedly, wasting bandwidth and frustrating user', mitigation: 'Resumable chunked uploads (tus protocol), upload progress persisted server-side, resume from last successful chunk' },
      { scenario: 'Deeply nested folder with thousands of files is shared with new permission', impact: 'Permission propagation takes minutes, inconsistent access during propagation', mitigation: 'Lazy permission evaluation at access time using inheritance chain, cache materialized permissions with async background refresh' },
      { scenario: 'User deletes a shared folder that others are actively working in', impact: 'Collaborators lose access mid-work, unsaved changes lost', mitigation: 'Soft delete with 30-day recovery, notify active collaborators before permanent deletion, lock files with active editors' },
      { scenario: 'Storage quota exceeded during a sync operation with many pending uploads', impact: 'Partial sync leaves desktop folder and cloud out of sync', mitigation: 'Pre-check quota before sync batch, prioritize by file modification time, clear notification of which files failed' },
    ],
    tradeoffs: [
      { decision: 'Block-level deduplication vs file-level deduplication', pros: 'Block-level saves more storage (shared blocks across files); file-level is simpler', cons: 'Block-level adds computational overhead for chunking/hashing; file-level misses partial-overlap savings', recommendation: 'Block-level dedup for storage efficiency (like Dropbox), with content-defined chunking (Rabin fingerprint)' },
      { decision: 'Sync-on-write vs sync-on-demand for desktop client', pros: 'Sync-on-write keeps everything current; sync-on-demand saves bandwidth and disk', cons: 'Sync-on-write wastes bandwidth on rarely accessed files; sync-on-demand has latency on first access', recommendation: 'Smart sync: sync recent/frequent files eagerly, placeholder files for rest with on-demand download' },
      { decision: 'Full file versioning vs delta/diff versioning', pros: 'Full versioning is simple; delta saves storage dramatically', cons: 'Full versioning wastes storage on large files; delta adds complexity for version reconstruction', recommendation: 'Delta versioning (store binary diffs between versions) with periodic full snapshots for fast reconstruction' },
      { decision: 'Centralized metadata vs distributed metadata', pros: 'Centralized is consistent and simple to query; distributed scales better', cons: 'Centralized is a bottleneck at scale; distributed complicates operations like search and listing', recommendation: 'Centralized metadata (sharded by user/org) with caching, since metadata operations are much smaller than data operations' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Desktop sync agent, web UI, and mobile apps for file access', components: ['Desktop Sync Engine', 'Web Application', 'Mobile App', 'Chunked Upload Client'] },
      { name: 'API & Collaboration Layer', purpose: 'File CRUD, sharing, and real-time collaboration', components: ['File API', 'Sharing & Permission Service', 'Real-Time Collab (OT/CRDT)', 'Notification Service'] },
      { name: 'Storage & Processing Layer', purpose: 'Chunk management, deduplication, and file processing', components: ['Chunk Store', 'Deduplication Engine', 'Thumbnail Generator', 'Virus Scanner'] },
      { name: 'Data Layer', purpose: 'Metadata storage, search indexing, and object storage', components: ['PostgreSQL (metadata)', 'Elasticsearch (file search)', 'S3/GCS (file chunks)', 'Redis (permission cache)'] },
    ],
  },

  // ─── 7. Shopify ─────────────────────────────────────────────────────
  {
    id: 'shopify',
    isNew: true,
    title: 'Shopify',
    subtitle: 'Multi-Tenant E-Commerce Platform',
    icon: 'shoppingBag',
    color: '#96bf48',
    difficulty: 'Hard',
    description: 'Design a multi-tenant e-commerce platform where merchants create storefronts, manage inventory, and process orders.',

    introduction: `Shopify-style platforms are multi-tenant e-commerce systems where millions of merchants each run their own online store on shared infrastructure. This is fundamentally different from designing a single e-commerce site (like Amazon): the challenge is providing isolated, customizable storefronts while sharing underlying infrastructure efficiently.

Key architectural challenges include: multi-tenancy (data isolation between merchants while sharing resources), handling traffic spikes that vary independently per merchant (one merchant's flash sale shouldn't affect others), payment processing with PCI compliance, and supporting a plugin/app ecosystem that extends merchant functionality.

The system must balance customizability (each store looks and behaves differently) with operational efficiency (millions of stores on shared infrastructure). This tension drives many architectural decisions around tenant isolation, resource allocation, and deployment models.`,

    functionalRequirements: [
      'Merchant onboarding: create store with custom domain',
      'Product catalog management (variants, images, inventory)',
      'Customizable storefront themes and templates',
      'Shopping cart and checkout flow',
      'Order management and fulfillment tracking',
      'Payment processing (multi-provider: Stripe, PayPal, etc.)',
      'Analytics dashboard per merchant',
      'App/plugin marketplace for extensions'
    ],

    nonFunctionalRequirements: [
      'Storefront page load < 2 seconds (including custom themes)',
      'Checkout must be PCI-DSS compliant',
      '99.99% availability (every minute of downtime = lost sales for merchants)',
      'Tenant isolation: one merchant cannot affect another',
      'Support 2M+ active stores with independent traffic patterns',
      'Handle Black Friday scale: 10-50x normal traffic for individual stores'
    ],

    estimation: {
      users: '2M active stores, 500M shoppers, peak 50M concurrent shoppers (Black Friday)',
      storage: '~500TB product images, ~50TB order data, growing ~5TB/day',
      bandwidth: '~2Tbps peak (product images + storefront assets)',
      qps: '~2M storefront page views/sec peak, ~100K checkout/sec peak, ~50K order writes/sec'
    },

    apiDesign: {
      description: 'Merchant Admin API and Storefront API, both scoped by store',
      endpoints: [
        { method: 'POST', path: '/admin/api/products', params: '{ title, variants[], images[], price }', response: '201 { productId }', notes: 'Merchant admin: create product', description: 'Create a product in the merchant\'s catalog. Each product can have multiple variants (size, color) with independent inventory tracking and pricing. Images are uploaded to a CDN and automatically resized to multiple dimensions for thumbnails, listing pages, and zoom views. The product is indexed in Elasticsearch within seconds for storefront search availability.' },
        { method: 'GET', path: '/storefront/api/products', params: 'collection?, sort, cursor', response: '{ products[], pageInfo }', notes: 'Public: browse products', description: 'Browse products on a store\'s public storefront. Results can be filtered by collection (e.g., "Summer Sale") and sorted by price, popularity, or newest. Responses are aggressively cached at the CDN edge with a 60-second TTL since product catalogs change infrequently. Cursor-based pagination via pageInfo ensures stable results even as new products are added between pages.' },
        { method: 'POST', path: '/storefront/api/cart', params: '{ lineItems[{variantId, quantity}] }', response: '{ cartId, lineItems[], totalPrice }', description: 'Create or update a shopping cart. Cart state is stored server-side keyed by cartId (returned in a cookie for anonymous users). Inventory is not reserved at cart time -- availability is only checked at checkout. The totalPrice includes applicable taxes and discounts computed in real-time. Cart contents expire after 14 days of inactivity to release stale data.' },
        { method: 'POST', path: '/storefront/api/checkout', params: '{ cartId, shippingAddress, paymentMethod }', response: '{ orderId, confirmationUrl }', description: 'Convert a cart into a paid order. This endpoint orchestrates a multi-step transaction: validate inventory availability, calculate final shipping rates, authorize payment via the payment gateway, decrement inventory atomically, and create the order record. If payment authorization fails, inventory is immediately released. The confirmationUrl redirects the buyer to the order confirmation page. The entire checkout is idempotent when retried with the same cartId.' },
        { method: 'GET', path: '/admin/api/orders', params: 'status, dateRange, cursor', response: '{ orders[], pageInfo }', description: 'List orders for the merchant\'s store with filtering by status (pending, fulfilled, refunded, cancelled) and date range. Orders include line items, customer info, payment status, and fulfillment details. Results are sorted by creation date descending. This endpoint powers the merchant\'s order management dashboard and supports export for accounting integrations.' },
        { method: 'POST', path: '/admin/api/orders/:id/fulfill', params: '{ trackingNumber, carrier }', response: '{ fulfillmentId }', description: 'Mark an order as fulfilled by providing shipping details. This triggers an automated email to the customer with tracking information and updates the order status to "fulfilled." Partial fulfillment is supported for orders with multiple line items shipping separately. The tracking number is validated against the carrier\'s API format. Fulfillment events are published to webhooks for third-party integrations (e.g., inventory management systems).' }
      ]
    },

    dataModel: {
      description: 'Multi-tenant data model with store-scoped resources',
      schema: `stores {
  id: bigint PK
  name: varchar
  domain: varchar unique  -- custom domain
  subdomain: varchar unique  -- store.myshopify.com
  plan: enum(basic, standard, advanced, plus)
  owner_id: bigint FK
  theme_id: bigint FK
  settings: jsonb
  created_at: timestamp
}

products {
  id: bigint PK
  store_id: bigint FK  -- tenant isolation key
  title: varchar
  description: text
  vendor: varchar
  product_type: varchar
  status: enum(active, draft, archived)
  tags: text[]
  created_at: timestamp
}

variants {
  id: bigint PK
  product_id: bigint FK
  store_id: bigint FK
  sku: varchar
  price: decimal(10,2)
  compare_at_price: decimal nullable
  inventory_quantity: int
  option_values: jsonb  -- { size: "L", color: "Blue" }
  weight: decimal
}

orders {
  id: bigint PK
  store_id: bigint FK
  customer_id: bigint FK
  order_number: int  -- per-store sequential
  total_price: decimal(10,2)
  financial_status: enum(pending, paid, refunded, voided)
  fulfillment_status: enum(unfulfilled, partial, fulfilled)
  line_items: jsonb
  shipping_address: jsonb
  created_at: timestamp
}

-- Inventory tracked separately for multi-location support
inventory_levels {
  variant_id: bigint
  location_id: bigint
  available: int
  reserved: int  -- in checkout but not yet ordered
  PK(variant_id, location_id)
}`,
        examples: [
          {
            table: 'orders',
            label: 'Paid order awaiting fulfillment',
            json: `{
  "id": 5820193746582,
  "store_id": 44019283,
  "customer_id": 8829104,
  "order_number": 1047,
  "total_price": 129.97,
  "financial_status": "paid",
  "fulfillment_status": "unfulfilled",
  "line_items": [{"variant_id": 39201847, "title": "Classic Hoodie - Black / L", "quantity": 2, "price": 49.99}, {"variant_id": 39201903, "title": "Logo Cap - Navy", "quantity": 1, "price": 29.99}],
  "shipping_address": {"name": "Jamie Chen", "address1": "742 Evergreen Terrace", "city": "Portland", "province": "OR", "zip": "97201", "country": "US"},
  "created_at": "2026-04-19T13:42:18Z"
}`
          },
          {
            table: 'variants',
            label: 'Product variant with inventory and pricing',
            json: `{
  "id": 39201847,
  "product_id": 8102938,
  "store_id": 44019283,
  "sku": "HOOD-BLK-L",
  "price": 49.99,
  "compare_at_price": 69.99,
  "inventory_quantity": 142,
  "option_values": {"size": "L", "color": "Black"},
  "weight": 0.45
}`
          },
          {
            table: 'inventory_levels',
            label: 'Warehouse stock with active reservations',
            json: `{
  "variant_id": 39201847,
  "location_id": 7720194,
  "available": 142,
  "reserved": 8
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/shopify/impl-basic.png',
      description: 'Shared application servers serve all stores. Requests are routed by domain to the correct store context. A single database stores all merchant data with store_id as a discriminator.',
      problems: [
        'Single database becomes a bottleneck: one slow query from one store affects all',
        'No isolation: a traffic spike on one store degrades performance for all others',
        'Checkout contention: inventory decrement races during popular sales',
        'Theme rendering on the server is CPU-intensive and blocks other requests'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Tenant Architecture with Pod-Based Isolation',
      diagramSrc: '/diagrams/shopify/impl-advanced.png',
      description: 'Stores are assigned to "pods" -- independent infrastructure units each containing application servers, database shards, and cache layers. Routing layer maps store domains to pods. High-traffic stores (Shopify Plus) get dedicated pods. Storefront rendering is edge-cached with CDN, and checkout uses a separate high-reliability service with distributed inventory reservations.',
      keyPoints: [
        'Pod architecture: each pod serves ~10K stores, has its own DB shard + cache + app servers',
        'Routing layer: maps incoming domain -> store_id -> pod_id, implemented at edge/CDN layer',
        'Storefront rendering: Liquid templates compiled to efficient bytecode, output cached at CDN edge',
        'Checkout service: separate, hardened service with distributed locks for inventory reservation',
        'Payment processing: tokenized via payment gateway (never touches raw card data), PCI scope minimized',
        'App ecosystem: webhooks + API for third-party apps, rate-limited per store to prevent noisy neighbor'
      ],
      databaseChoice: 'Vitess (sharded MySQL) for transactional data sharded by store_id; Redis for cart sessions and inventory reservation locks; S3 for product images and theme assets; Kafka for order event streaming',
      caching: 'CDN caches storefront pages (30-second TTL with instant purge on product change); Redis caches product catalog, cart sessions, and inventory counts; theme compilation cached until theme is edited'
    },

    tips: [
      'Multi-tenancy is THE defining challenge: lead with your isolation strategy',
      'Discuss the noisy neighbor problem: how one store spike cannot affect others',
      'Checkout and inventory are the consistency-critical paths: discuss locking strategies',
      'PCI compliance constrains where and how payment data can flow',
      'Theme/storefront rendering is a unique challenge: discuss server-side rendering vs. CDN caching',
      'Mention the app/webhook ecosystem: critical for merchant customization'
    ],

    keyQuestions: [
      {
        question: 'How do you handle multi-tenancy and tenant isolation?',
        answer: `**Pod-Based Multi-Tenancy**:

**What is a Pod?**
- Self-contained infrastructure unit: app servers + DB shard + Redis + queues
- Each pod serves ~10K stores
- Pods are independently scalable and deployable

**Data Isolation**:
- Every table includes \`store_id\` as partition key
- Database connection middleware injects store_id filter on every query
- Cross-store queries are impossible by design (no JOINs across shards)

**Resource Isolation**:
- Rate limiting per store: API calls/sec, webhook deliveries/sec
- CPU and memory limits per request: prevent one store's heavy query from starving others
- Separate checkout infrastructure: not affected by catalog browsing spikes

**Large Store Handling (Shopify Plus)**:
- Stores exceeding 100K orders/day get a dedicated pod
- Custom scaling rules: auto-scale pod based on that store's traffic patterns
- Dedicated CDN cache allocation for storefront assets

**Routing Layer**:
1. Request arrives at edge CDN with Host header (store domain)
2. Edge looks up store_id from domain mapping (cached, <1ms)
3. Routes to correct pod's load balancer
4. Application layer validates store context for every request`
      },
      {
        question: 'How does checkout handle inventory under high concurrency?',
        answer: `**Distributed Inventory Reservation Protocol**:

**Problem**: 100 people click "Buy" for the last item simultaneously. Only one should succeed.

**Two-Phase Approach**:

**Phase 1 - Reservation (at "Add to Cart" / "Begin Checkout")**:
- \`DECR inventory_reserved:{variantId}:{locationId}\` in Redis
- If result >= 0: reservation successful, set TTL = 10 minutes
- If result < 0: item unavailable, INCR back immediately
- Redis is single-threaded: DECR is atomic, no race conditions

**Phase 2 - Confirmation (at "Place Order")**:
- Convert reservation to order: write to DB, clear Redis reservation
- If checkout abandoned (TTL expires): Redis key expires, reservation released

**Why Not Just Lock the DB Row?**:
- Row-level locks under high concurrency = contention and timeouts
- Redis DECR is O(1) and lock-free: handles 100K ops/sec easily
- DB write happens only for confirmed orders (much lower volume)

**Edge Cases**:
- Redis failure: fall back to DB-level SELECT FOR UPDATE (slower but correct)
- Split payment: reservation held until all payment steps complete
- Multi-item order: all-or-nothing reservation (reserve all or release all)`
      },
      {
        question: 'How do you handle Black Friday traffic spikes?',
        answer: `**Pre-Event Preparation (weeks before)**:
- Identify high-traffic stores (based on last year + merchant forecasts)
- Pre-scale their pods: additional app servers, read replicas, expanded cache
- Pre-warm CDN: crawl storefronts, cache all product pages and images
- Load test checkout pipeline at 10x expected peak

**During Event - Auto-Scaling**:
- Monitor per-pod metrics: request rate, latency, error rate, DB connections
- Auto-scale app server tier horizontally (pods add servers in 60 seconds)
- Read replicas scale independently from write primary

**Traffic Management**:
- CDN absorbs 90%+ of storefront traffic (cached pages)
- Checkout queue: if checkout rate exceeds capacity, queue users with progress indicator
- "Checkout throttling": limit concurrent checkouts per store to prevent DB overload
- Graceful degradation: disable non-critical features (analytics, recommendations) under extreme load

**Post-Event**:
- Scale down gradually (2-hour cool-off period)
- Analyze bottlenecks for next year's capacity planning
- Per-store reports: conversion rate, peak concurrent users, cart abandonment`
      }
    ],

    requirements: ['Multi-tenant storefronts', 'Product catalog', 'Cart and checkout', 'Order management', 'Payment processing', 'Theme customization'],
    components: ['Pod-based infrastructure', 'Vitess (sharded MySQL)', 'Redis (carts, inventory)', 'CDN (storefront)', 'Payment Gateway', 'Kafka (order events)', 'S3 (assets)'],
    keyDecisions: [
      'Pod-based multi-tenancy for resource isolation between stores',
      'Vitess-sharded MySQL partitioned by store_id for data isolation',
      'Redis atomic DECR for lock-free inventory reservation during checkout',
      'CDN-first storefront strategy: edge-cached pages with instant purge on changes',
      'Separate checkout service with independent scaling and higher reliability target',
      'Webhook-based app ecosystem with per-store rate limiting to prevent noisy neighbor'
    ],

    edgeCases: [
      { scenario: 'Merchant installs a buggy app that makes excessive API calls', impact: 'Noisy neighbor degrades platform performance for other merchants', mitigation: 'Per-app and per-store rate limiting, circuit breaker on webhook delivery, app suspension after repeated violations' },
      { scenario: 'Flash sale by a single large merchant spikes traffic 100x their normal', impact: 'Shared infrastructure overwhelmed, affecting unrelated merchants', mitigation: 'Tenant-aware autoscaling, request queuing with per-merchant fair scheduling, dedicated pools for enterprise merchants' },
      { scenario: 'Cart abandoned with inventory reserved across multiple warehouse locations', impact: 'Inventory locked in multiple locations, reducing availability for other customers', mitigation: 'Soft reservations with short TTL (10 min), nearest-warehouse-first allocation, release on cart expiry' },
      { scenario: 'Payment processor returns ambiguous response (timeout)', impact: 'Order status unknown, risk of double-charging or lost payment', mitigation: 'Idempotent payment requests, pending order state with async reconciliation, payment processor query for status resolution' },
      { scenario: 'Theme/storefront customization causes performance regression', impact: 'Merchant store page load time increases, conversion rate drops', mitigation: 'Sandboxed Liquid template rendering with CPU/memory limits, performance budget warnings in theme editor' },
    ],
    tradeoffs: [
      { decision: 'Multi-tenant shared database vs database-per-tenant', pros: 'Shared DB is cost-efficient; per-tenant gives isolation and independent scaling', cons: 'Shared DB risks noisy neighbors and complicates migrations; per-tenant is expensive and complex to manage', recommendation: 'Shared database with tenant_id partitioning for small/medium stores, dedicated shards for enterprise' },
      { decision: 'Monolithic storefront vs headless commerce API', pros: 'Monolithic is simpler for merchants; headless enables custom frontends', cons: 'Monolithic limits customization; headless requires technical expertise', recommendation: 'Support both: managed storefront for simplicity, headless API (Storefront API) for advanced merchants' },
      { decision: 'Synchronous webhook delivery vs event streaming', pros: 'Webhooks are simple and familiar; streaming is reliable and replayable', cons: 'Webhooks fail silently and require retry logic; streaming adds infrastructure complexity', recommendation: 'Webhooks with retry and dead-letter queue, plus event streaming API for apps needing guaranteed delivery' },
      { decision: 'Server-side rendering vs static generation for storefronts', pros: 'SSR shows real-time data; static generation gives fastest page loads', cons: 'SSR requires compute per request; static generation shows stale data', recommendation: 'Static generation for product pages with ISR (incremental static regeneration) for inventory updates' },
    ],
    layeredDesign: [
      { name: 'Storefront Layer', purpose: 'Customer-facing shopping experience for each merchant', components: ['Storefront Renderer (Liquid)', 'Theme Engine', 'CDN (static assets)', 'Headless Storefront API'] },
      { name: 'Commerce Logic Layer', purpose: 'Core e-commerce business logic shared across merchants', components: ['Product Service', 'Cart & Checkout Service', 'Order Management', 'Discount Engine'] },
      { name: 'Platform Services Layer', purpose: 'Cross-cutting services supporting the merchant ecosystem', components: ['Payment Processing', 'Shipping & Fulfillment', 'App/Webhook Platform', 'Analytics Service'] },
      { name: 'Data & Infrastructure Layer', purpose: 'Multi-tenant data storage and platform infrastructure', components: ['Sharded MySQL (per-tenant)', 'Redis (sessions, caching)', 'Kafka (events)', 'Elasticsearch (product search)'] },
    ],
  },

  // ─── 8. Flash Sale ──────────────────────────────────────────────────
  {
    id: 'flash-sale',
    isNew: true,
    title: 'Flash Sale System',
    subtitle: 'High-Concurrency Limited Inventory',
    icon: 'zap',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design a system for time-limited sales with extremely limited inventory and millions of concurrent buyers.',

    introduction: `Flash sales (also known as "lightning deals" or "drop" events) are time-limited sales where a small quantity of items is sold at a steep discount to a massive, eager audience. Think Amazon Prime Day deals, Supreme drops, or concert ticket releases. The defining characteristic is an extreme imbalance: millions of users competing for hundreds or thousands of items in seconds.

This creates one of the most challenging concurrency problems in system design: the system must handle a traffic spike of 100-1000x normal load, ensure exactly the right number of items are sold (no overselling, no underselling), maintain fairness (no automated bots jumping the queue), and survive gracefully even if components fail.

The key insight is that this is fundamentally a rate-limiting and queuing problem, not a traditional e-commerce problem. Most requests will be rejected (inventory exhausted), and the system must reject them as early and cheaply as possible.`,

    functionalRequirements: [
      'Schedule flash sales with start time, item, quantity, and price',
      'Handle millions of concurrent purchase requests at sale start',
      'Guarantee no overselling (sold <= available inventory)',
      'Provide real-time inventory countdown',
      'Fair ordering: first-come-first-served within capacity',
      'Bot detection and prevention',
      'Payment processing within a time window (hold reservation)',
      'Waiting room / queue experience before sale starts'
    ],

    nonFunctionalRequirements: [
      'Handle 1M+ requests in the first second of a sale',
      'Purchase decision latency < 500ms',
      'Zero overselling (strict consistency for inventory)',
      '99.99% availability during sale events',
      'Graceful degradation: deny excess traffic without crashing',
      'Support concurrent independent flash sales'
    ],

    estimation: {
      users: '10M users waiting for sale, 5M submit in first 10 seconds',
      storage: 'Minimal: sale metadata + reservation records (~1GB per event)',
      bandwidth: '~500K requests/sec peak for 10-30 seconds, then rapid decline',
      qps: '500K-1M purchase attempts/sec (concentrated burst), inventory: 1K-100K items'
    },

    apiDesign: {
      description: 'Minimal API surface for maximum performance during sale',
      endpoints: [
        { method: 'GET', path: '/api/sale/:saleId/status', params: '', response: '{ status: upcoming|active|sold_out, remainingQty, startsAt }', description: 'Check the current status of a flash sale. This endpoint is heavily cached at the CDN edge with a 1-second TTL to handle millions of concurrent polling clients. The remainingQty is approximate (updated every few seconds from Redis) to avoid putting read pressure on the inventory counter. The response includes cache headers to prevent thundering herd problems when the sale transitions from "upcoming" to "active."' },
        { method: 'POST', path: '/api/sale/:saleId/reserve', params: '{ userId, captchaToken }', response: '{ reservationId, expiresAt } or { status: sold_out }', description: 'Attempt to reserve an item during an active sale. The captchaToken prevents bot abuse. Inventory is atomically decremented using Redis DECR -- if the counter reaches zero, all subsequent requests receive "sold_out" instantly. Successful reservations are held for 5 minutes (expiresAt) and released back to inventory if not purchased. A distributed rate limiter restricts each user to one reservation attempt per sale.' },
        { method: 'POST', path: '/api/sale/:saleId/purchase', params: '{ reservationId, paymentMethodId }', response: '{ orderId, confirmationNumber }', description: 'Complete the purchase of a reserved item before the reservation expires. The server validates the reservation is still active, charges the payment method via a pre-authorized payment gateway, and converts the reservation to a confirmed order atomically. If payment fails, the reservation remains active until expiry so the user can retry with a different payment method. The endpoint is idempotent -- retrying with the same reservationId returns the existing order.' },
        { method: 'GET', path: '/api/sale/:saleId/queue', params: '{ userId }', response: '{ position, estimatedWait }', description: 'Check the user\'s position in the virtual waiting room queue. When traffic exceeds system capacity, users are placed in a FIFO queue and admitted in batches. Position is updated in real-time via server-sent events. The estimatedWait is calculated from the current processing rate and queue depth. Queue position is backed by a Redis sorted set with join timestamp as the score to ensure fairness.' }
      ]
    },

    dataModel: {
      description: 'Sale configuration, inventory counter, and reservation tracking',
      schema: `flash_sales {
  id: bigint PK
  item_id: bigint FK
  title: varchar
  original_price: decimal
  sale_price: decimal
  total_quantity: int
  starts_at: timestamp
  ends_at: timestamp
  status: enum(scheduled, active, sold_out, ended)
}

-- Redis atomic counter (primary source of truth during sale)
-- Key: sale:{saleId}:remaining = <int>
-- DECR returns new value atomically

reservations {
  id: uuid PK
  sale_id: bigint FK
  user_id: bigint FK
  status: enum(reserved, purchased, expired, cancelled)
  reserved_at: timestamp
  expires_at: timestamp  -- typically 5-10 minutes
  purchased_at: timestamp nullable
}

-- Anti-bot tracking
user_sale_attempts {
  user_id: bigint
  sale_id: bigint
  attempt_count: int
  first_attempt_at: timestamp
  ip_address: varchar
  device_fingerprint: varchar
  PK(user_id, sale_id)
}`,
        examples: [
          {
            table: 'flash_sales',
            label: 'Active flash sale event',
            json: `{
  "id": 20482,
  "item_id": 991028,
  "title": "PlayStation 6 Pro - Launch Day Deal",
  "original_price": 699.99,
  "sale_price": 399.99,
  "total_quantity": 500,
  "starts_at": "2026-04-19T18:00:00Z",
  "ends_at": "2026-04-19T18:30:00Z",
  "status": "active"
}`
          },
          {
            table: 'reservations',
            label: 'Successful reservation pending payment',
            json: `{
  "id": "res-a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d",
  "sale_id": 20482,
  "user_id": 33019284,
  "status": "reserved",
  "reserved_at": "2026-04-19T18:00:02Z",
  "expires_at": "2026-04-19T18:05:02Z",
  "purchased_at": null
}`
          },
          {
            table: 'user_sale_attempts',
            label: 'Bot detection tracking record',
            json: `{
  "user_id": 33019284,
  "sale_id": 20482,
  "attempt_count": 1,
  "first_attempt_at": "2026-04-19T18:00:02Z",
  "ip_address": "198.51.100.42",
  "device_fingerprint": "fp_x7k9m2n4p6q8r0"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/flash-sale/impl-basic.png',
      description: 'Standard e-commerce checkout: user clicks "Buy", application server checks inventory in database, decrements if available, processes payment. All behind a load balancer.',
      problems: [
        'Database becomes the bottleneck: 500K concurrent SELECT FOR UPDATE = instant deadlocks',
        'Race conditions: two servers read inventory=1, both decrement, oversell to -1',
        'Payment processing is slow (2-3 seconds): holding DB locks while waiting = cascading timeouts',
        'No queue management: all users hit the system simultaneously, most get errors'
      ]
    },

    advancedImplementation: {
      title: 'Queue-Based Architecture with Redis Atomic Counter',
      diagramSrc: '/diagrams/flash-sale/impl-advanced.png',
      description: 'Traffic flows through a CDN-cached waiting room, then a rate-limited queue, then a Redis atomic counter for instant inventory decisions. Only successful reservations proceed to payment. The architecture is designed to reject 99%+ of requests at the cheapest layer possible.',
      keyPoints: [
        'Layer 1 - CDN/Edge: serve static waiting room page, absorb 90% of traffic before it hits origin',
        'Layer 2 - Rate Limiter: token bucket per user, blocks bots and repeated requests',
        'Layer 3 - Redis DECR: atomic inventory counter, O(1) per request, handles 1M ops/sec',
        'Layer 4 - Reservation: successful DECR gets a reservation with 5-minute TTL for payment',
        'Layer 5 - Payment: only reserved users proceed, standard payment processing with timeout handling',
        'Expired reservations: background worker restocks inventory (INCR) for expired/cancelled reservations'
      ],
      databaseChoice: 'Redis for atomic inventory counter and reservation TTL; PostgreSQL for sale configuration and order records (low-volume, post-purchase); rate limiter state in Redis',
      caching: 'CDN-cached waiting room page (no origin hit); sale status endpoint cached with 1-second TTL; inventory count approximation cached client-side to reduce polling'
    },

    tips: [
      'Frame this as a rejection optimization problem: most requests must be rejected cheaply',
      'The Redis DECR pattern is the key insight -- explain why it solves the concurrency problem',
      'Discuss the waiting room / queue as a traffic shaping mechanism',
      'Anti-bot measures are expected: CAPTCHA, device fingerprinting, rate limiting',
      'Separate reservation from payment: do not hold inventory locks during payment processing',
      'Discuss what happens when reservations expire: inventory restock and fairness'
    ],

    keyQuestions: [
      {
        question: 'How do you prevent overselling with millions of concurrent requests?',
        answer: `**Redis Atomic DECR Pattern**:

\`\`\`
# Before sale: SET sale:123:remaining 1000

# On purchase attempt:
remaining = DECR sale:123:remaining
if remaining >= 0:
    # SUCCESS: create reservation
    # SET reservation:{uuid} = {userId, saleId}, EXPIRE 300
elif remaining < 0:
    # SOLD OUT: increment back to prevent underflow
    INCR sale:123:remaining
    return "sold out"
\`\`\`

**Why This Works**:
- Redis DECR is atomic and single-threaded: no race conditions possible
- O(1) per operation, handles 1M+ ops/sec on a single Redis instance
- No locks, no transactions, no contention
- The counter can briefly go negative (two requests DECR simultaneously), but the INCR correction ensures it settles at 0

**Why Not a Database?**:
- SELECT FOR UPDATE on a single row = serial execution = ~1000 ops/sec max
- Distributed locks (Redlock) add latency and complexity
- Redis DECR is 1000x faster and simpler

**Restock on Expiration**:
- Reservation has 5-minute TTL
- Background worker scans expired reservations: INCR sale:123:remaining
- This returns inventory for users who didn't complete payment`
      },
      {
        question: 'How does the waiting room and queue work?',
        answer: `**Pre-Sale Waiting Room**:
1. Before sale time: CDN serves a static page with a countdown timer
2. Page auto-refreshes or uses WebSocket for "sale started" signal
3. No requests hit origin servers during countdown (pure CDN)

**Queue Entry (at sale start)**:
1. Client sends request to queue service
2. Queue service assigns position using Redis INCR: \`INCR sale:123:queue_position\`
3. Returns position + estimated wait time
4. Client polls or receives WebSocket update when it's their turn

**Admission Control**:
- Process queue in batches: admit 1000 users per second to the purchase endpoint
- Rate shaped by: inventory remaining * (avg payment time)
- If inventory = 500 and avg payment = 30 seconds: admit at 500/30 = ~17/sec

**Fairness Guarantees**:
- Position determined by arrival time (INCR is ordered)
- Each user gets exactly one position (deduplicated by userId)
- Queue position is not transferable

**Skip the Queue (VIP / Loyalty)**:
- Priority queue: VIP users get positions in a separate, faster lane
- Implementation: two Redis counters, drain VIP queue first until empty`
      },
      {
        question: 'How do you detect and prevent bots?',
        answer: `**Multi-Layer Bot Defense**:

**Layer 1 - CAPTCHA (pre-sale)**:
- Require CAPTCHA solve to enter the waiting room
- Use proof-of-work challenge that takes 2-3 seconds (prevents automated solving)
- CAPTCHA token valid for 10 minutes, single-use

**Layer 2 - Rate Limiting**:
- Per-IP: max 5 requests/sec to purchase endpoint
- Per-user: max 1 purchase attempt per sale
- Per device fingerprint: max 3 accounts per device

**Layer 3 - Behavioral Analysis**:
- Time-to-click after sale starts: <100ms is suspicious (human reaction time ~200ms)
- Request pattern: identical timing intervals = bot
- Browser fingerprint: headless Chrome, Selenium markers
- Mouse movement/touch events: bots don't generate realistic interaction patterns

**Layer 4 - Account Reputation**:
- New account (created <24h before sale): flagged, extra verification
- Account with history of abandoned reservations: throttled
- Account linked to known bot IPs: blocked

**Enforcement**:
- Suspicious requests get a fake "queued" response (honeypot)
- Confirmed bots: cancel their reservations, restock inventory
- Post-sale audit: cancel orders from detected bot accounts, refund and restock`
      }
    ],

    requirements: ['Scheduled flash sales', 'Atomic inventory management', 'Reservation-based checkout', 'Queue/waiting room', 'Bot prevention', 'Payment timeout handling'],
    components: ['CDN (waiting room)', 'Redis (atomic counter + reservations)', 'Queue Service', 'Rate Limiter', 'Payment Gateway', 'PostgreSQL (orders)', 'Bot Detection Service'],
    keyDecisions: [
      'Redis DECR for atomic, lock-free inventory management at 1M+ ops/sec',
      'CDN-served waiting room to absorb traffic before it reaches origin',
      'Two-phase purchase: reservation (instant) then payment (async with timeout)',
      'Queue-based admission control to shape traffic into manageable throughput',
      'Multi-layer bot defense: CAPTCHA + rate limiting + behavioral analysis',
      'Expired reservation restock via background worker to prevent inventory loss'
    ],

    edgeCases: [
      { scenario: 'Inventory count goes negative due to race condition under extreme load', impact: 'More items sold than available, requiring order cancellation and angry customers', mitigation: 'Atomic decrement with check (Redis DECR + Lua script that rejects if below zero), or database row-level locking' },
      { scenario: 'User holds item in cart but never completes checkout', impact: 'Inventory reserved indefinitely, other users cannot purchase available stock', mitigation: 'Time-limited reservations (5-10 minutes) with background worker releasing expired holds back to available inventory' },
      { scenario: 'Payment succeeds but order confirmation fails to persist', impact: 'Money charged but no order record, customer support nightmare', mitigation: 'Outbox pattern: write order to DB in same transaction as payment intent, async confirmation via event processor' },
      { scenario: 'Bot army buys all inventory in milliseconds before real users', impact: 'Legitimate customers never see inventory available, brand reputation damaged', mitigation: 'CAPTCHA at checkout, progressive rate limiting, queue-based access (virtual waiting room), device fingerprinting' },
      { scenario: 'CDN serves stale page showing items still available after sellout', impact: 'Users attempt purchase of sold-out items, poor experience and wasted server load', mitigation: 'Real-time inventory status via API (not cached page), WebSocket push for stock updates, short TTL on product pages during sales' },
    ],
    tradeoffs: [
      { decision: 'Optimistic vs pessimistic inventory locking', pros: 'Optimistic allows higher concurrency; pessimistic guarantees no oversell', cons: 'Optimistic requires conflict resolution and retries; pessimistic creates bottleneck under load', recommendation: 'Pessimistic locking via Redis atomic operations for flash sales (correctness > throughput)' },
      { decision: 'Queue-based (waiting room) vs direct access', pros: 'Queue provides fairness and controls load; direct access is simpler', cons: 'Queue adds wait time and complexity; direct access causes thundering herd', recommendation: 'Virtual waiting room for flash sales with randomized queue position to prevent gaming' },
      { decision: 'Pre-warm inventory in Redis vs read-through from database', pros: 'Pre-warm eliminates cold start; read-through is simpler', cons: 'Pre-warm requires cache invalidation strategy; read-through has first-request latency spike', recommendation: 'Pre-warm Redis with inventory counts before sale starts, use as authoritative counter during sale' },
      { decision: 'Synchronous payment vs async payment with reservation', pros: 'Sync gives instant confirmation; async reduces checkout latency', cons: 'Sync payment timeout blocks inventory; async requires reservation management', recommendation: 'Reserve inventory first (sync), process payment async with timeout-based release on failure' },
    ],
    layeredDesign: [
      { name: 'Traffic Control Layer', purpose: 'Manage incoming traffic surge and prevent system overload', components: ['Virtual Waiting Room', 'Rate Limiter', 'Bot Detection', 'CDN (static assets)'] },
      { name: 'Application Layer', purpose: 'Handle product browsing, cart, and checkout logic', components: ['Product Service', 'Cart Service', 'Checkout Orchestrator', 'Session Manager'] },
      { name: 'Inventory & Payment Layer', purpose: 'Atomic inventory management and payment processing', components: ['Redis Inventory Counter', 'Reservation Manager', 'Payment Gateway Integration', 'Order Writer'] },
      { name: 'Data & Messaging Layer', purpose: 'Persistent storage and async event processing', components: ['PostgreSQL (orders)', 'Kafka (order events)', 'Notification Service', 'Analytics Pipeline'] },
    ],
  },

  // ─── 9. Digital Wallet ──────────────────────────────────────────────
  {
    id: 'digital-wallet',
    isNew: true,
    title: 'Digital Wallet',
    subtitle: 'Venmo / Cash App',
    icon: 'creditCard',
    color: '#008cff',
    difficulty: 'Hard',
    description: 'Design a digital wallet system supporting peer-to-peer transfers, balance management, bank linking, and transaction history.',

    introduction: `Digital wallets like Venmo, Cash App, and PayPal are financial systems that require extremely high correctness guarantees. Unlike most distributed systems where eventual consistency is acceptable, financial systems must ensure that money is never created or destroyed: every debit must have a corresponding credit, and the total money in the system must always balance.

The core technical challenge is implementing double-entry bookkeeping in a distributed system while maintaining high availability. Every transaction involves at least two account balance changes that must happen atomically. When you send $50 to a friend, your balance must decrease by $50 AND their balance must increase by $50 -- partial completion is unacceptable.

Additional challenges include: integrating with external banking networks (ACH, card networks), fraud detection in real-time, regulatory compliance (KYC/AML), and handling disputes and reversals.`,

    functionalRequirements: [
      'Create wallet account linked to bank account or debit card',
      'Send money to other users (P2P transfer)',
      'Receive money from other users',
      'Add funds from linked bank account (top-up)',
      'Withdraw funds to linked bank account (cash-out)',
      'View transaction history with filtering',
      'Request money from other users',
      'Split bills among multiple users'
    ],

    nonFunctionalRequirements: [
      'Transaction processing latency < 2 seconds',
      'Zero balance inconsistencies (no money created or lost)',
      'Support 100M+ active wallets',
      '99.99% availability',
      'PCI-DSS and financial regulatory compliance',
      'All transactions must be auditable with complete trail'
    ],

    estimation: {
      users: '100M active wallets, 50M DAU',
      storage: '~1KB per transaction * 500M transactions/day = 500GB/day',
      bandwidth: '~50Gbps peak (text-heavy, low bandwidth per request)',
      qps: '~10K P2P transfers/sec peak, ~5K top-up/withdrawal/sec, ~50K balance checks/sec'
    },

    apiDesign: {
      description: 'RESTful API with idempotency keys for financial safety',
      endpoints: [
        { method: 'POST', path: '/api/transfers', params: '{ fromWalletId, toWalletId, amount, currency, idempotencyKey, note }', response: '{ transferId, status, timestamp }', description: 'Transfer funds between two wallets atomically. The idempotencyKey (client-generated UUID) ensures the transfer is processed exactly once even if the client retries due to network timeouts. The operation uses a serializable database transaction to debit the sender and credit the receiver, preventing double-spending. Transfers between different currencies trigger real-time exchange rate lookup. The note is visible to both parties in their transaction history.' },
        { method: 'POST', path: '/api/topup', params: '{ walletId, bankAccountId, amount, idempotencyKey }', response: '{ transactionId, status: pending }', description: 'Initiate a wallet top-up from a linked bank account. Returns "pending" immediately because bank transfers (ACH/SEPA) settle asynchronously over 1-3 business days. The pending amount is reflected in the balance but not available for spending until settlement confirmation arrives via webhook from the payment processor. The idempotencyKey prevents duplicate top-ups from retried requests.' },
        { method: 'POST', path: '/api/withdraw', params: '{ walletId, bankAccountId, amount, idempotencyKey }', response: '{ transactionId, status: pending }', description: 'Withdraw funds from the wallet to a linked bank account. The available balance is immediately decreased to prevent overdraft, but the bank transfer settles asynchronously. Withdrawals above a threshold trigger additional KYC/AML verification and may be held for manual review. The idempotencyKey ensures a withdrawal is only initiated once. Failed withdrawals (e.g., invalid bank account) automatically refund the wallet balance.' },
        { method: 'GET', path: '/api/wallets/:walletId/balance', params: '', response: '{ available, pending, currency }', description: 'Fetch the current wallet balance split into available (immediately spendable) and pending (in-transit top-ups and unsettled transactions). The balance is read from a strongly consistent data store to prevent stale reads that could allow double-spending. This endpoint is called on every app launch and before payment initiation. Response is not cached to ensure real-time accuracy for financial operations.' },
        { method: 'GET', path: '/api/wallets/:walletId/transactions', params: 'type, startDate, endDate, cursor', response: '{ transactions[], nextCursor }', description: 'Fetch paginated transaction history for a wallet, filterable by type (transfer, topup, withdrawal, purchase) and date range. Transactions are returned in reverse chronological order with details including counterparty, amount, status (completed, pending, failed), and descriptive note. Cursor-based pagination ensures stable results as new transactions arrive. This data is served from a read replica to avoid impacting transactional throughput.' }
      ]
    },

    dataModel: {
      description: 'Double-entry ledger with wallet accounts',
      schema: `wallets {
  id: bigint PK
  user_id: bigint FK unique
  balance: decimal(15,2)  -- available balance
  pending_balance: decimal(15,2)  -- pending top-ups/withdrawals
  currency: varchar(3)
  status: enum(active, frozen, closed)
  daily_limit: decimal(10,2)
  created_at: timestamp
}

-- Double-entry ledger: every transaction has TWO entries
ledger_entries {
  id: bigint PK
  transaction_id: uuid FK
  wallet_id: bigint FK
  entry_type: enum(debit, credit)
  amount: decimal(15,2)  -- always positive
  balance_after: decimal(15,2)  -- running balance snapshot
  created_at: timestamp
}

transactions {
  id: uuid PK
  type: enum(p2p_transfer, topup, withdrawal, refund, fee)
  status: enum(pending, completed, failed, reversed)
  amount: decimal(15,2)
  currency: varchar(3)
  from_wallet_id: bigint nullable
  to_wallet_id: bigint nullable
  external_ref: varchar  -- bank transaction reference
  idempotency_key: varchar unique
  note: text
  created_at: timestamp
  completed_at: timestamp nullable
}

linked_accounts {
  id: bigint PK
  wallet_id: bigint FK
  type: enum(bank_account, debit_card)
  institution: varchar
  last_four: varchar(4)
  routing_number_encrypted: bytea
  account_number_encrypted: bytea
  verified: boolean
  created_at: timestamp
}`,
        examples: [
          {
            table: 'transactions',
            label: 'Completed P2P transfer with idempotency key',
            json: `{
  "id": "tx-7a8b9c0d-1e2f-4a3b-5c6d-7e8f9a0b1c2d",
  "type": "p2p_transfer",
  "status": "completed",
  "amount": 42.50,
  "currency": "USD",
  "from_wallet_id": 88201937,
  "to_wallet_id": 55102938,
  "external_ref": null,
  "idempotency_key": "idem-client-a1b2c3d4e5f6",
  "note": "Dinner last night - your share",
  "created_at": "2026-04-19T20:15:33Z",
  "completed_at": "2026-04-19T20:15:33Z"
}`
          },
          {
            table: 'ledger_entries',
            label: 'Debit entry for sender in double-entry ledger',
            json: `{
  "id": 9920184756,
  "transaction_id": "tx-7a8b9c0d-1e2f-4a3b-5c6d-7e8f9a0b1c2d",
  "wallet_id": 88201937,
  "entry_type": "debit",
  "amount": 42.50,
  "balance_after": 157.50,
  "created_at": "2026-04-19T20:15:33Z"
}`
          },
          {
            table: 'wallets',
            label: 'Active wallet with daily limit',
            json: `{
  "id": 88201937,
  "user_id": 440291,
  "balance": 157.50,
  "pending_balance": 250.00,
  "currency": "USD",
  "status": "active",
  "daily_limit": 2500.00,
  "created_at": "2025-01-22T14:30:00Z"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/digital-wallet/impl-basic.png',
      description: 'A single database handles all transactions. P2P transfers use a database transaction to atomically decrement sender balance and increment receiver balance.',
      problems: [
        'Single database limits throughput: all transfers serialize on balance rows',
        'Hot wallets (celebrity accounts) cause extreme row-level lock contention',
        'No idempotency: network retries can cause duplicate transfers',
        'External bank operations (ACH) take days: no mechanism for pending states'
      ]
    },

    advancedImplementation: {
      title: 'Event-Sourced Ledger Architecture',
      diagramSrc: '/diagrams/digital-wallet/impl-advanced.png',
      description: 'An event-sourced ledger where every balance change is recorded as an immutable event. The wallet balance is derived from the sum of all ledger entries. P2P transfers are processed via a two-phase protocol: first reserve funds (debit sender), then credit receiver. External operations (top-up, withdrawal) use a saga pattern with compensating transactions.',
      keyPoints: [
        'Double-entry bookkeeping: every transaction produces exactly two ledger entries (debit + credit)',
        'Event sourcing: balance is computed from ledger entries, not stored as a mutable field (balance field is a cached projection)',
        'Idempotency: every API call requires an idempotency_key; duplicate requests return the original result',
        'Saga pattern for bank operations: Reserve -> Initiate ACH -> Wait for confirmation -> Complete (or Reverse)',
        'Sharding by wallet_id: each wallet\'s ledger lives on one shard, P2P across shards uses distributed transaction',
        'Real-time fraud scoring: ML model evaluates transaction risk before execution, blocks suspicious activity'
      ],
      databaseChoice: 'PostgreSQL for ledger (ACID transactions critical); separate read replicas for balance queries and transaction history; Redis for idempotency key dedup and rate limiting',
      caching: 'Redis caches current wallet balance (invalidated on every transaction); transaction history paginated with cursor-based caching; idempotency keys stored in Redis with 24-hour TTL'
    },

    tips: [
      'Lead with double-entry bookkeeping: it shows you understand financial system correctness',
      'Idempotency is critical: discuss idempotency keys and exactly-once semantics',
      'Distinguish internal (instant P2P) from external (ACH, days-long) operations',
      'Fraud detection must be inline (pre-transaction) not just post-hoc',
      'Discuss regulatory requirements: KYC, AML, transaction limits, reporting',
      'Mention reconciliation: how you verify the system is consistent'
    ],

    keyQuestions: [
      {
        question: 'How does double-entry bookkeeping work in this system?',
        answer: `**The Golden Rule**: Every transaction creates exactly two ledger entries that sum to zero.

**P2P Transfer ($50 from Alice to Bob)**:
\`\`\`
BEGIN TRANSACTION;
-- Debit Alice's wallet
INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
  VALUES ('tx-123', 'alice', 'debit', 50.00, 150.00);
UPDATE wallets SET balance = balance - 50.00 WHERE id = 'alice' AND balance >= 50.00;

-- Credit Bob's wallet
INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
  VALUES ('tx-123', 'bob', 'credit', 50.00, 250.00);
UPDATE wallets SET balance = balance + 50.00 WHERE id = 'bob';
COMMIT;
\`\`\`

**Why Double-Entry?**:
- Audit trail: every balance change is traceable to a specific transaction
- Self-checking: sum of all debits must equal sum of all credits (invariant)
- Debugging: if totals don't balance, you know something is wrong

**Reconciliation** (daily background job):
- Sum all credit entries across all wallets
- Sum all debit entries across all wallets
- If credits != debits -> alert, investigate, fix
- Also: sum all wallet balances = total deposits - total withdrawals`
      },
      {
        question: 'How do you handle bank operations that take days?',
        answer: `**Saga Pattern for ACH Top-Up**:

**Step 1 - Initiate** (immediate):
- Create transaction record: status = "pending"
- Add pending_balance to user's wallet (visible but not spendable)
- Submit ACH request to banking partner API

**Step 2 - Wait** (1-3 business days):
- Banking partner processes the ACH transfer
- Webhook notification when transfer completes or fails

**Step 3a - Success**:
- Move amount from pending_balance to available balance
- Create ledger entries: debit "external_funds" account, credit user wallet
- Update transaction status to "completed"
- Send user notification

**Step 3b - Failure** (compensating transaction):
- Reverse pending_balance addition
- Update transaction status to "failed"
- Create ledger entries that cancel the pending entries
- Notify user of failure

**Withdrawal Saga** is similar but reversed:
- Immediately debit wallet balance
- If ACH fails: compensating credit restores the balance
- "Returned" withdrawals (e.g., invalid bank account) handled same way

**Key Principle**: The saga maintains consistency across the async boundary. At every point, either the forward transaction or the compensating transaction has run.`
      },
      {
        question: 'How do you prevent duplicate transactions?',
        answer: `**Idempotency Key Pattern**:

**Client Side**:
- Before every API call, client generates a unique idempotency_key (UUID)
- If request times out or fails, client retries with THE SAME key

**Server Side**:
\`\`\`python
def process_transfer(request):
    key = request.idempotency_key

    # Check Redis for existing result
    cached = redis.get(f"idemp:{key}")
    if cached:
        return cached  # Return original result, no re-processing

    # Process the transfer
    result = execute_transfer(request)

    # Store result in Redis with 24h TTL
    redis.set(f"idemp:{key}", result, ex=86400)

    # Also store in DB for longer-term dedup
    insert_idempotency_record(key, result)

    return result
\`\`\`

**Why This Matters**:
- Network timeout: client didn't receive response but server processed it
- Without idempotency: retry = double charge (user loses $50 twice)
- With idempotency: retry returns original result (correct behavior)

**Database-Level Protection** (belt and suspenders):
- Unique constraint on (from_wallet_id, idempotency_key)
- Even if Redis fails, DB prevents duplicate transactions
- Transaction isolation level: SERIALIZABLE for critical paths`
      }
    ],

    requirements: ['P2P transfers', 'Balance management', 'Bank linking', 'Transaction history', 'Fraud detection', 'Regulatory compliance'],
    components: ['Transaction Service', 'Ledger (PostgreSQL)', 'Redis (idempotency + cache)', 'ACH Gateway', 'Fraud Detection (ML)', 'Reconciliation Worker'],
    keyDecisions: [
      'Double-entry bookkeeping ensures every balance change is traceable and self-checking',
      'Idempotency keys at API and database level prevent duplicate transactions',
      'Saga pattern for async bank operations with compensating transactions on failure',
      'Event-sourced ledger: balance is a projection of immutable ledger entries',
      'Inline fraud scoring with ML model before transaction execution',
      'Sharding by wallet_id with distributed transactions for cross-shard transfers'
    ],

    edgeCases: [
      { scenario: 'Double-spend: user initiates two payments simultaneously from same balance', impact: 'Both transactions succeed, resulting in negative balance and financial loss', mitigation: 'Optimistic locking with version checks on balance, or pessimistic row-level lock during transaction execution' },
      { scenario: 'Payment gateway timeout during fund transfer', impact: 'Money debited from sender but status unknown, user panics and retries', mitigation: 'Idempotency keys on all payment APIs, two-phase commit with pending state, background reconciliation to resolve ambiguous transactions' },
      { scenario: 'Refund requested after merchant has already withdrawn funds', impact: 'Wallet balance goes negative for merchant, platform absorbs the loss', mitigation: 'Hold period before merchant withdrawal, reserve refund buffer, escrow pattern for high-risk transactions' },
      { scenario: 'Fraud ring creating multiple wallets for promotional credit abuse', impact: 'Promotional budget drained by fake accounts, distorts unit economics', mitigation: 'Device fingerprinting, phone number verification, graph analysis of linked wallets, velocity checks on promo redemption' },
      { scenario: 'Regulatory requirement to freeze wallet mid-transaction', impact: 'In-flight transactions may complete after freeze order, violating compliance', mitigation: 'Freeze flag checked at transaction execution time (not just initiation), queue pending transactions for review' },
    ],
    tradeoffs: [
      { decision: 'Synchronous vs asynchronous transaction processing', pros: 'Synchronous gives instant confirmation; asynchronous enables higher throughput', cons: 'Synchronous limits throughput under contention; asynchronous complicates UX (pending states)', recommendation: 'Synchronous for P2P transfers (user expects instant), asynchronous for batch operations and merchant settlements' },
      { decision: 'Single ledger database vs event-sourced ledger', pros: 'Single DB is simple and queryable; event sourcing provides complete audit trail', cons: 'Single DB loses history on updates; event sourcing is complex and storage-heavy', recommendation: 'Event-sourced ledger for financial transactions (immutable audit trail is a regulatory requirement)' },
      { decision: 'Real-time fraud detection vs post-transaction analysis', pros: 'Real-time blocks fraud before loss; post-transaction avoids user friction', cons: 'Real-time adds latency to every transaction; post-transaction means losses before detection', recommendation: 'Tiered approach: lightweight real-time scoring for all transactions, deep analysis async for flagged ones' },
      { decision: 'Single currency vs multi-currency wallet', pros: 'Single currency is simple; multi-currency serves international users', cons: 'Single currency requires conversions; multi-currency adds FX rate management complexity', recommendation: 'Multi-currency with real-time FX rates and transparent conversion at transaction time' },
    ],
    layeredDesign: [
      { name: 'Client & API Layer', purpose: 'Mobile/web apps for payments, transfers, and wallet management', components: ['Mobile App', 'Web Dashboard', 'Payment API', 'Merchant SDK'] },
      { name: 'Transaction Processing Layer', purpose: 'Execute financial transactions with ACID guarantees', components: ['Transaction Engine', 'Balance Manager', 'Idempotency Store', 'Two-Phase Commit Coordinator'] },
      { name: 'Risk & Compliance Layer', purpose: 'Fraud detection, KYC, and regulatory compliance', components: ['Fraud Scoring Engine', 'KYC/AML Service', 'Transaction Monitor', 'Regulatory Reporter'] },
      { name: 'Ledger & Data Layer', purpose: 'Immutable financial record keeping and reconciliation', components: ['Event-Sourced Ledger', 'PostgreSQL (account state)', 'Reconciliation Engine', 'Audit Log'] },
    ],
  },

  // ─── 10. Stock Exchange ─────────────────────────────────────────────
  {
    id: 'stock-exchange',
    isNew: true,
    title: 'Stock Exchange',
    subtitle: 'Order Matching Engine',
    icon: 'trendingUp',
    color: '#16a34a',
    difficulty: 'Hard',
    description: 'Design a stock exchange with an order matching engine, order book management, and real-time market data distribution.',

    introduction: `A stock exchange is one of the most latency-sensitive systems in existence. The matching engine -- the core component that pairs buy and sell orders -- must process orders in microseconds, not milliseconds. Modern exchanges like NASDAQ handle millions of orders per second with deterministic latency.

The system has two primary subsystems: the order matching engine (which must be single-threaded per symbol for correctness and fairness) and the market data distribution system (which must broadcast price updates to millions of subscribers in real-time). These have opposite scaling characteristics: the matching engine must be fast and sequential, while data distribution must be parallel and fan-out-heavy.

Key constraints include regulatory requirements for fairness (orders must be processed in strict time order), audit trails (every order and match must be recorded), and fault tolerance (the exchange must recover from failures without losing any orders or corrupting the order book).`,

    functionalRequirements: [
      'Submit limit orders (buy/sell at a specific price)',
      'Submit market orders (buy/sell at best available price)',
      'Cancel and modify existing orders',
      'Price-time priority matching (best price first, then earliest)',
      'Real-time order book depth display',
      'Trade execution notifications',
      'Market data feed (last price, bid/ask, volume)',
      'Support multiple symbols/instruments'
    ],

    nonFunctionalRequirements: [
      'Matching engine latency < 10 microseconds per order',
      'Order processing throughput: 1M+ orders/sec per symbol',
      'Market data distribution latency < 1ms to co-located subscribers',
      'Strict ordering guarantee: no order can be processed out of sequence',
      '99.999% availability during market hours',
      'Complete audit trail for regulatory compliance'
    ],

    estimation: {
      users: '10K broker-dealers, 100M end investors (via brokers)',
      storage: '~500 bytes/order * 10B orders/day = ~5TB/day',
      bandwidth: '~1Tbps market data fan-out to all subscribers',
      qps: '~5M orders/sec aggregate across all symbols, ~200K trades/sec'
    },

    apiDesign: {
      description: 'FIX protocol for institutional trading, REST/WebSocket for retail',
      endpoints: [
        { method: 'POST', path: '/api/orders', params: '{ symbol, side: buy|sell, type: limit|market, quantity, price?, timeInForce }', response: '{ orderId, status, timestamp }', description: 'Submit a new order to the matching engine. Market orders execute immediately at the best available price; limit orders are placed in the order book at the specified price. The timeInForce parameter controls order lifetime: GTC (good-til-cancelled), IOC (immediate-or-cancel), FOK (fill-or-kill). Orders are validated for sufficient margin/balance before acceptance. The matching engine processes orders with sub-millisecond latency using an in-memory order book.' },
        { method: 'DELETE', path: '/api/orders/:orderId', params: '', response: '{ status: cancelled, remainingQty }', description: 'Cancel an open order. Only the unfilled portion of a partially filled order can be cancelled -- the already-executed portion remains settled. The cancellation must reach the matching engine before the next fill occurs, so the response indicates the actual remainingQty at cancellation time. Cancel requests are prioritized in the matching engine queue to minimize the window for unwanted fills.' },
        { method: 'GET', path: '/api/orderbook/:symbol', params: 'depth=20', response: '{ bids[{price, qty}], asks[{price, qty}], lastPrice }', description: 'Fetch a snapshot of the order book for a symbol at a given depth (number of price levels). Bids are sorted descending by price, asks ascending. The lastPrice reflects the most recent trade. This endpoint returns an aggregate view -- individual orders at the same price level are summed into total quantity. The snapshot is generated from an in-memory order book replica and served with minimal latency for algorithmic trading clients.' },
        { method: 'WS', path: '/ws/marketdata', params: 'symbols[]', response: 'Stream: { symbol, lastPrice, bidPrice, askPrice, volume, trades[] }', description: 'Subscribe to real-time market data for one or more symbols. The server streams tick-by-tick updates including last trade price, best bid/ask (top of book), cumulative volume, and individual trade executions. Updates are pushed with microsecond timestamps for ordering. The feed uses binary encoding (e.g., Protocol Buffers) to minimize serialization overhead. Clients can subscribe to up to 100 symbols per connection.' },
        { method: 'GET', path: '/api/trades', params: 'symbol, startTime, endTime, cursor', response: '{ trades[], nextCursor }', description: 'Query historical trade data for a symbol within a time range. Each trade record includes price, quantity, buyer/seller order IDs, and execution timestamp. This endpoint is used for charting, backtesting trading strategies, and regulatory audit trails. Data is served from a time-series database (e.g., TimescaleDB) optimized for range queries. Results are cursor-paginated since popular symbols can have millions of trades per day.' }
      ]
    },

    dataModel: {
      description: 'Order book structure and trade records',
      schema: `-- In-memory order book (per symbol)
order_book {
  symbol: varchar
  bids: SortedMap<price DESC, Queue<Order>>  -- sorted by price (highest first)
  asks: SortedMap<price ASC, Queue<Order>>   -- sorted by price (lowest first)
  last_trade_price: decimal
  last_trade_qty: int
}

orders {
  id: bigint PK (sequence)
  symbol: varchar
  broker_id: int
  side: enum(buy, sell)
  type: enum(limit, market)
  price: decimal(10,4) nullable
  quantity: int
  filled_quantity: int
  status: enum(new, partially_filled, filled, cancelled)
  time_in_force: enum(day, GTC, IOC, FOK)
  submitted_at: timestamp (nanosecond precision)
  sequence_number: bigint  -- strict ordering
}

trades {
  id: bigint PK
  symbol: varchar
  buy_order_id: bigint FK
  sell_order_id: bigint FK
  price: decimal(10,4)
  quantity: int
  executed_at: timestamp (nanosecond precision)
}

-- Audit log (append-only, regulatory requirement)
order_events {
  sequence_id: bigint PK
  order_id: bigint
  event_type: enum(submitted, accepted, partially_filled, filled, cancelled, rejected)
  details: jsonb
  timestamp: timestamp (nanosecond precision)
}`,
        examples: [
          {
            table: 'orders',
            label: 'Partially filled limit buy order',
            json: `{
  "id": 1840291038475,
  "symbol": "AAPL",
  "broker_id": 4021,
  "side": "buy",
  "type": "limit",
  "price": 198.5000,
  "quantity": 500,
  "filled_quantity": 320,
  "status": "partially_filled",
  "time_in_force": "day",
  "submitted_at": "2026-04-19T14:30:00.482917382Z",
  "sequence_number": 8829104738291
}`
          },
          {
            table: 'trades',
            label: 'Executed trade matching buy and sell',
            json: `{
  "id": 7291048362019,
  "symbol": "AAPL",
  "buy_order_id": 1840291038475,
  "sell_order_id": 1840291038102,
  "price": 198.5000,
  "quantity": 200,
  "executed_at": "2026-04-19T14:30:00.482921047Z"
}`
          },
          {
            table: 'order_events',
            label: 'Audit log entry for partial fill',
            json: `{
  "sequence_id": 99201847382,
  "order_id": 1840291038475,
  "event_type": "partially_filled",
  "details": {"fill_qty": 200, "fill_price": 198.5000, "trade_id": 7291048362019, "remaining_qty": 180},
  "timestamp": "2026-04-19T14:30:00.482921047Z"
}`
          }
        ]
    },

    basicImplementation: {
      title: 'Basic Matching Engine',
      diagramSrc: '/diagrams/stock-exchange/impl-basic.png',
      description: 'A single-threaded matching engine maintains an in-memory order book per symbol. Incoming orders are matched against the opposite side of the book using price-time priority. Unmatched portions are added to the book.',
      problems: [
        'Single server limits total throughput across all symbols',
        'In-memory state is lost on crash -- no persistence',
        'Market data distribution from the matching engine adds latency to matching',
        'No redundancy: if the matching engine goes down, trading stops'
      ]
    },

    advancedImplementation: {
      title: 'Partitioned Matching with Replicated State Machine',
      diagramSrc: '/diagrams/stock-exchange/impl-advanced.png',
      description: 'Each symbol (or group of symbols) is assigned to a dedicated matching engine instance. Orders are routed to the correct engine via a gateway. Each engine uses a replicated state machine (Raft consensus) for fault tolerance: the primary processes orders while secondaries maintain synchronized order book state. Market data is published to a separate multicast network for distribution.',
      keyPoints: [
        'Symbol partitioning: each matching engine handles a subset of symbols, single-threaded per symbol for correctness',
        'Raft-based replication: primary matching engine replicates every order to 2 secondaries before acknowledging',
        'Sequencer: assigns globally unique sequence numbers to orders before routing, ensuring deterministic replay',
        'Kernel bypass (DPDK/RDMA): network packets bypass the OS kernel for sub-microsecond processing',
        'Market data multicast: trade/quote updates published to a multicast group, subscribers receive simultaneously',
        'WAL (write-ahead log): every order event persisted to local NVMe before processing for crash recovery'
      ],
      databaseChoice: 'In-memory data structures (red-black tree + FIFO queues) for the live order book; NVMe SSDs for WAL persistence; time-series DB (QuestDB/TimescaleDB) for historical trade data; message queue for order routing',
      caching: 'Order book IS the cache (entirely in-memory); market data snapshots cached at gateway for new subscriber catch-up; historical data queries served from time-series DB with read replicas'
    },

    tips: [
      'Emphasize that the matching engine MUST be single-threaded per symbol for fairness',
      'Discuss the price-time priority matching algorithm in detail',
      'Latency is measured in microseconds, not milliseconds -- discuss hardware optimizations',
      'Separate the matching engine concerns from market data distribution',
      'Fault tolerance is critical but cannot add latency: discuss Raft replication trade-offs',
      'Mention regulatory requirements: audit trails, circuit breakers, fair access'
    ],

    keyQuestions: [
      {
        question: 'How does the price-time priority matching algorithm work?',
        answer: `**Order Book Data Structure**:
\`\`\`
Bids (buy orders):           Asks (sell orders):
Price  | Orders (FIFO)       Price  | Orders (FIFO)
-------|------------------   -------|------------------
$150.50| [B1:100, B2:50]    $150.55| [A1:200]
$150.45| [B3:300]           $150.60| [A2:100, A3:150]
$150.40| [B4:200, B5:100]   $150.75| [A4:500]
\`\`\`

**Matching a new Sell Limit Order: Sell 250 @ $150.45**:
1. Best bid = $150.50 >= limit price $150.45? YES -> match
2. Fill B1 (100 shares @ $150.50) -> Trade! Remaining: 150
3. Fill B2 (50 shares @ $150.50) -> Trade! Remaining: 100
4. Next bid = $150.45 >= $150.45? YES -> match
5. Fill B3 partially (100 of 300 shares @ $150.45) -> Trade! Remaining: 0
6. Order fully filled. B3 has 200 shares remaining on the book.

**Time Complexity**:
- Match: O(1) to find best price (sorted tree), O(k) where k = orders matched
- Insert: O(log P) where P = number of price levels
- Cancel: O(1) with order ID -> pointer lookup (hash map)

**Market Order**: Same algorithm but no price limit -> fills at whatever price is available (dangerous in thin markets)`
      },
      {
        question: 'How do you achieve microsecond-level latency?',
        answer: `**Hardware Optimizations**:
- **Kernel bypass (DPDK)**: network packets go directly to user-space, skipping the OS kernel (~5us saved)
- **RDMA**: remote direct memory access for inter-server communication without CPU involvement
- **NVMe SSDs**: WAL writes complete in <10us (vs ~1ms for regular SSDs)
- **CPU pinning**: matching engine thread pinned to a specific core, no context switches
- **NUMA-aware memory**: allocate memory on the same NUMA node as the pinned CPU core

**Software Optimizations**:
- **Single-threaded**: no locks, no synchronization overhead
- **Pre-allocated memory**: no heap allocation during order processing (object pools)
- **Lock-free data structures**: for the rare shared state (e.g., sequence counters)
- **Batched I/O**: accumulate market data updates, send in batches every 10us
- **JIT compilation**: hot paths compiled to native code (if using JVM)

**What NOT to do**:
- No garbage collection pauses (use C/C++/Rust, or tune JVM GC carefully)
- No syscalls on the hot path (pre-open all file descriptors, pre-allocate all buffers)
- No logging on the hot path (buffer log entries, flush asynchronously)
- No dynamic memory allocation (everything pre-allocated at startup)

**Typical Latency Budget**: Gateway receive: 1us + deserialize: 1us + match: 2-5us + serialize: 1us + send: 1us = ~7-10us total`
      },
      {
        question: 'How do you handle fault tolerance without adding latency?',
        answer: `**Replicated State Machine Approach**:

**Primary-Secondary Architecture**:
- Primary matching engine processes all orders
- 2 secondary engines receive the same order stream (via Raft or custom replication)
- Secondaries maintain identical order book state but do NOT send responses

**Replication Protocol**:
1. Sequencer assigns sequence number to incoming order
2. Order written to shared log (replicated across 3 nodes)
3. Primary processes order, generates trades
4. Response sent after order is durably logged (not after replication completes)
5. Secondaries process the same order from the log, reach identical state

**Failover (< 1 second)**:
1. Primary failure detected via heartbeat (100ms timeout)
2. Secondary with latest sequence number becomes new primary
3. Replays any orders that primary acknowledged but secondary hasn't processed
4. Deterministic replay: same orders + same sequence = same order book state
5. Gateway redirects traffic to new primary

**Why Deterministic Replay Works**:
- Matching is a pure function of: order book state + incoming order
- No randomness, no external dependencies, no timestamps in matching logic
- Given the same sequence of orders, any engine produces identical results

**WAL for Crash Recovery**:
- Every order event written to local NVMe WAL before processing
- On restart: replay WAL from last checkpoint to rebuild order book
- Checkpoint: serialize full order book state every 60 seconds`
      }
    ],

    requirements: ['Order submission and cancellation', 'Price-time priority matching', 'Real-time market data', 'Fault tolerance', 'Audit trail', 'Sub-millisecond latency'],
    components: ['Gateway (order routing)', 'Matching Engine (per symbol)', 'Sequencer', 'Replicated WAL', 'Market Data Multicast', 'Time-Series DB', 'Regulatory Audit Store'],
    keyDecisions: [
      'Single-threaded matching engine per symbol for correctness and fairness',
      'Symbol partitioning across multiple matching engine instances for aggregate throughput',
      'Raft-based replication with deterministic replay for fault tolerance',
      'Kernel bypass (DPDK) and CPU pinning for microsecond-level latency',
      'Separated market data distribution via multicast to avoid adding matching latency',
      'WAL on NVMe SSDs with periodic checkpointing for crash recovery'
    ],

    edgeCases: [
      { scenario: 'Two orders arrive at exact same price and nanosecond timestamp', impact: 'Undefined ordering can lead to disputes about execution priority', mitigation: 'Deterministic tiebreaking by order sequence number (monotonic counter), FIFO within same price level' },
      { scenario: 'Flash crash: cascading stop-loss orders trigger rapid price decline', impact: 'Market drops 10%+ in seconds, massive unintended liquidations', mitigation: 'Circuit breakers that halt trading when price moves exceed threshold (e.g., 5% in 5 minutes), cool-down period before resume' },
      { scenario: 'Market maker withdraws all liquidity simultaneously', impact: 'Order book becomes thin, huge spread, next market order fills at extreme price', mitigation: 'Market maker obligations (minimum quote size/time), synthetic liquidity bands, price band rejection for orders far from mid-price' },
      { scenario: 'Network partition between matching engine and order gateway', impact: 'Orders accepted but not matched, or matched but confirmations lost', mitigation: 'Synchronous acknowledgment chain: gateway -> sequencer -> matcher, reject if any link breaks, clients retry with idempotency key' },
      { scenario: 'Replay attack: duplicate order submission after network timeout', impact: 'Same order executed twice, doubling the intended position', mitigation: 'Client-assigned order IDs with server-side deduplication window, reject duplicate IDs within time window' },
    ],
    tradeoffs: [
      { decision: 'Single-threaded matching engine vs multi-threaded', pros: 'Single-threaded avoids lock contention, deterministic ordering; multi-threaded gives higher throughput', cons: 'Single-threaded limits throughput to one core; multi-threaded introduces ordering complexity', recommendation: 'Single-threaded per symbol/instrument with symbol-level partitioning across cores' },
      { decision: 'In-memory order book vs persistent order book', pros: 'In-memory gives microsecond latency; persistent survives crashes', cons: 'In-memory loses state on crash; persistent adds write latency per order', recommendation: 'In-memory with write-ahead log (WAL) for crash recovery, periodic snapshots to reduce replay time' },
      { decision: 'FIFO matching vs pro-rata matching', pros: 'FIFO rewards speed and is simple; pro-rata is fairer for large resting orders', cons: 'FIFO incentivizes latency arms race; pro-rata discourages small orders', recommendation: 'FIFO (price-time priority) for equities, pro-rata for certain derivatives and options markets' },
      { decision: 'Colocation vs remote access for trading firms', pros: 'Colocation gives lowest latency; remote access is more accessible', cons: 'Colocation creates unfair advantages; remote adds variable network latency', recommendation: 'Offer both with fair access policies, consider speed bumps (IEX-style) to level the playing field' },
    ],
    layeredDesign: [
      { name: 'Gateway Layer', purpose: 'Accept, validate, and sequence incoming orders', components: ['Order Gateway (FIX protocol)', 'Order Validator', 'Sequencer', 'Deduplication Engine'] },
      { name: 'Matching Engine Layer', purpose: 'Execute order matching with price-time priority', components: ['Order Book (per symbol)', 'Matching Algorithm', 'Trade Generator', 'WAL Writer'] },
      { name: 'Market Data Layer', purpose: 'Distribute real-time price and trade data to subscribers', components: ['Market Data Publisher (multicast)', 'Tick Database', 'Level 2 Book Builder', 'Historical Data Store'] },
      { name: 'Risk & Settlement Layer', purpose: 'Pre-trade risk checks and post-trade settlement', components: ['Pre-Trade Risk Engine', 'Position Manager', 'Clearing Interface', 'Regulatory Reporter'] },
    ],
  },

  // ─── 11. API Gateway ────────────────────────────────────────────────
  {
    id: 'api-gateway',
    isNew: true,
    title: 'API Gateway',
    subtitle: 'Unified API Entry Point',
    icon: 'shield',
    color: '#6366f1',
    difficulty: 'Medium',
    description: 'Design an API gateway that serves as the single entry point for microservices, handling routing, authentication, rate limiting, and request transformation.',

    introduction: `An API Gateway is the front door to a microservices architecture. Every external request passes through it, making it one of the most critical infrastructure components. It centralizes cross-cutting concerns like authentication, rate limiting, protocol translation, and request routing so that individual microservices can focus purely on business logic.

The design challenge is that the gateway sits on the critical path of every request, so it must add minimal latency while handling enormous throughput. It must also be highly available -- if the gateway goes down, the entire system is inaccessible. At the same time, it needs to be flexible enough to support diverse routing rules, multiple authentication schemes, and per-client rate limits.

Key trade-offs include: how much logic to put in the gateway (thin vs. fat gateway), how to handle gateway failures (redundancy strategy), and how to update routing configuration without downtime (hot reloading vs. rolling deploys).`,

    functionalRequirements: [
      'Route requests to appropriate backend microservices based on path, headers, or method',
      'Authenticate and authorize requests (JWT, API keys, OAuth)',
      'Rate limiting per client, per endpoint, and globally',
      'Request/response transformation (protocol translation, field mapping)',
      'Load balancing across service instances',
      'Circuit breaking: stop routing to unhealthy services',
      'Request logging and metrics collection',
      'API versioning support'
    ],

    nonFunctionalRequirements: [
      'Added latency < 5ms per request (p99)',
      'Throughput: 500K+ requests/sec per gateway instance',
      '99.999% availability (five nines)',
      'Configuration changes applied without downtime',
      'Support 1000+ backend service endpoints',
      'Graceful degradation under overload'
    ],

    estimation: {
      users: 'All external clients (web, mobile, third-party APIs)',
      storage: 'Minimal persistent storage: routing config ~10MB, rate limit state ~1GB in Redis',
      bandwidth: '~100Gbps through the gateway tier (pass-through)',
      qps: '1M+ requests/sec aggregate across gateway cluster'
    },

    apiDesign: {
      description: 'Gateway Admin API for configuration, plus transparent proxying of client requests',
      endpoints: [
        { method: 'POST', path: '/admin/routes', params: '{ path, methods[], upstream, plugins[] }', response: '201 { routeId }' },
        { method: 'PUT', path: '/admin/routes/:routeId', params: '{ upstream, plugins[], enabled }', response: '200 { updated }' },
        { method: 'POST', path: '/admin/consumers', params: '{ name, apiKey, rateLimit, scopes[] }', response: '201 { consumerId, apiKey }' },
        { method: 'GET', path: '/admin/metrics', params: 'timeRange, groupBy=route|consumer', response: '{ requestCount, errorRate, p99Latency }' },
        { method: '*', path: '/{proxy+}', params: 'Any client request', response: 'Proxied to upstream service' }
      ]
    },

    dataModel: {
      description: 'Routing configuration, consumer registry, and rate limit state',
      schema: `routes {
  id: varchar PK
  path_pattern: varchar  -- /api/v1/users/*
  methods: text[]  -- [GET, POST]
  upstream_service: varchar  -- user-service.internal:8080
  strip_path: boolean
  plugins: jsonb  -- [{type: "auth", config: ...}, {type: "rateLimit", config: ...}]
  priority: int  -- for overlapping path patterns
  enabled: boolean
  version: int  -- for optimistic concurrency
}

consumers {
  id: varchar PK
  name: varchar
  api_key_hash: varchar unique
  rate_limit: int  -- requests per second
  scopes: text[]  -- allowed API scopes
  enabled: boolean
}

-- Redis structures for runtime state
-- Rate limit: sliding window counter
rate_limit:{consumer_id}:{window} = count (EXPIRE after window)

-- Circuit breaker state
circuit:{upstream}:state = {open|closed|half_open}
circuit:{upstream}:failures = count (EXPIRE 60s)
circuit:{upstream}:last_failure = timestamp`,
      examples: [
        { table: 'routes', label: 'Route to user service with auth plugin', json: `{ "id": "rt-user-api", "path_pattern": "/api/v1/users/*", "methods": ["GET", "POST", "PUT"], "upstream_service": "user-service.internal:8080", "strip_path": true, "plugins": [{"type": "auth", "config": {"required": true}}, {"type": "rateLimit", "config": {"rpm": 60}}], "priority": 10, "enabled": true, "version": 14 }` },
        { table: 'consumers', label: 'Partner API consumer with rate limit', json: `{ "id": "cns-partner-acme", "name": "Acme Corp", "api_key_hash": "sha256:9f86d08...c5c4", "rate_limit": 100, "scopes": ["users:read", "orders:read", "orders:write"], "enabled": true }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Reverse Proxy Gateway',
      diagramSrc: '/diagrams/api-gateway/impl-basic.png',
      description: 'An Nginx or HAProxy instance with static configuration files that route requests to backend services. Authentication and rate limiting are implemented as custom modules or Lua scripts.',
      problems: [
        'Configuration changes require reload/restart (brief connection drops)',
        'No dynamic service discovery: backend IP changes require config updates',
        'Rate limiting is per-instance, not global (inconsistent across gateway nodes)',
        'No circuit breaking: requests continue to failed services'
      ]
    },

    advancedImplementation: {
      title: 'Plugin-Based Gateway with Dynamic Configuration',
      diagramSrc: '/diagrams/api-gateway/impl-advanced.png',
      description: 'A custom gateway built on an async framework (Envoy, or custom on top of Netty/Tokio) with a plugin architecture. Routing configuration is stored in a database and pushed to all gateway instances via a control plane. Rate limiting uses a distributed Redis counter. Circuit breakers use shared state. Service discovery integrates with Consul/Kubernetes for automatic backend registration.',
      keyPoints: [
        'Plugin pipeline: each request passes through an ordered chain of plugins (auth -> rate limit -> transform -> route -> circuit break)',
        'Control plane: configuration changes written to DB, pushed to gateways via gRPC streaming (no restart needed)',
        'Distributed rate limiting: Redis sliding window counters shared across all gateway instances',
        'Service discovery: gateways subscribe to Consul/K8s service registry for real-time backend health',
        'Circuit breaker: shared failure counts in Redis, three states (closed -> open -> half-open)',
        'Async I/O: non-blocking event loop handles 100K+ concurrent connections per instance with minimal threads'
      ],
      databaseChoice: 'etcd/Consul for configuration store (strong consistency, watch support); Redis for rate limiting and circuit breaker state; ClickHouse for request logs and analytics',
      caching: 'Route table cached in-memory on each gateway (refreshed via control plane push); response caching for GET requests with configurable TTL per route; consumer authentication cached with 60-second TTL'
    },

    tips: [
      'Distinguish between a gateway (application-layer, L7) and a load balancer (transport-layer, L4)',
      'Discuss the plugin/middleware pipeline model for extensibility',
      'Rate limiting must be distributed (not per-instance) for correctness',
      'Dynamic configuration without restarts is a key differentiator from basic reverse proxies',
      'Mention the thin vs. fat gateway trade-off: too much logic = bottleneck and coupling',
      'Circuit breakers prevent cascading failures in microservices architectures'
    ],

    keyQuestions: [
      {
        question: 'How does distributed rate limiting work?',
        answer: `**Sliding Window Counter in Redis**:

**Algorithm** (per consumer, per endpoint):
\`\`\`
# Window = 1 second, limit = 100 requests/sec
key = "rl:{consumerId}:{endpoint}:{current_second}"

count = INCR key
if count == 1:
    EXPIRE key 2  # auto-cleanup after 2 seconds

if count > 100:
    return 429 Too Many Requests
    Headers: X-RateLimit-Remaining: 0, Retry-After: <ms to next window>
else:
    forward request
    Headers: X-RateLimit-Remaining: {100 - count}
\`\`\`

**Why Sliding Window?** (vs fixed window):
- Fixed window: consumer sends 100 requests at 0:59, 100 more at 1:01 = 200 in 2 seconds
- Sliding window: uses weighted average of current and previous window counts
- \`effective_count = prev_count * (1 - elapsed/window) + current_count\`

**Distributed Consistency**:
- All gateway instances hit the same Redis key -> globally consistent count
- Redis INCR is atomic -> no race conditions
- Trade-off: adds ~0.5ms per request for Redis round-trip
- Optimization: local counter + periodic sync (less accurate but faster)

**Multiple Tiers**:
- Per-consumer: 100 req/sec (business plan)
- Per-endpoint: 10K req/sec (protect backend)
- Global: 1M req/sec (infrastructure protection)`
      },
      {
        question: 'How does the circuit breaker pattern work?',
        answer: `**Three States**:

**Closed** (normal operation):
- Requests forwarded to upstream service
- Track failure rate in sliding window
- If failure rate > threshold (e.g., 50% of last 20 requests): -> OPEN

**Open** (service is down, fail fast):
- All requests immediately rejected with 503
- Do NOT forward to failing service (prevent cascading failure)
- After timeout (e.g., 30 seconds): -> HALF-OPEN

**Half-Open** (testing recovery):
- Allow 1-3 probe requests through to upstream
- If probes succeed: -> CLOSED (service recovered)
- If probes fail: -> OPEN (reset timeout)

**Shared State (distributed)**:
\`\`\`
Redis:
  circuit:{upstream}:state = "open"
  circuit:{upstream}:failures = 12  (TTL: 60s)
  circuit:{upstream}:successes = 3
  circuit:{upstream}:opened_at = timestamp
\`\`\`

**Why Shared?**:
- 10 gateway instances: each sees 1/10th of traffic
- If only local state: each instance independently determines service health
- Shared state: collective view, faster detection, consistent behavior

**Fallback Options** when circuit is open:
- Return cached response (if GET request and cache available)
- Return degraded response (partial data from alternative source)
- Return error with retry-after header`
      },
      {
        question: 'How do you handle configuration changes without downtime?',
        answer: `**Control Plane Push Model**:

**Architecture**:
\`\`\`
Admin API -> Config DB (etcd) -> Control Plane -> gRPC Stream -> Gateway Instances
\`\`\`

**Change Flow**:
1. Admin updates route via API: POST /admin/routes
2. Config written to etcd with version number
3. Control plane detects change (etcd watch)
4. Control plane pushes delta to all gateways via persistent gRPC stream
5. Each gateway atomically swaps its in-memory route table
6. New requests use new routes; in-flight requests complete on old routes

**Atomic Swap**:
- Gateway maintains two route tables: active and pending
- New config builds the pending table
- Single pointer swap makes pending the active table
- Old table garbage collected after in-flight requests drain

**Rollback Safety**:
- Every config change is versioned
- If error rate spikes after change: auto-rollback to previous version
- Canary deployment: apply change to 1 gateway first, monitor, then roll out

**Zero-Downtime Guarantee**:
- No process restart needed
- No connection drops (existing connections unaffected)
- Change propagation: <1 second to all gateway instances
- Worst case: brief inconsistency where some gateways have new config, others old (converges in <1s)`
      }
    ],

    requirements: ['Request routing', 'Authentication', 'Rate limiting', 'Circuit breaking', 'Configuration management', 'Load balancing'],
    components: ['Gateway Instances (async I/O)', 'Control Plane', 'etcd (config store)', 'Redis (rate limiting + circuit state)', 'Service Registry (Consul)', 'ClickHouse (analytics)'],
    keyDecisions: [
      'Plugin pipeline architecture for extensible request processing',
      'Control plane push model for zero-downtime configuration updates',
      'Distributed rate limiting via Redis sliding window counters',
      'Shared circuit breaker state in Redis for consistent failure detection',
      'Async I/O (event loop) for handling 100K+ concurrent connections per instance',
      'Atomic route table swap for safe, non-blocking configuration updates'
    ],

    edgeCases: [
      { scenario: 'Backend service is slow but not fully down', impact: 'Gateway threads/connections pile up waiting, cascading slowness to all routes', mitigation: 'Per-route circuit breakers with timeout thresholds, bulkhead pattern to isolate slow backends' },
      { scenario: 'Rate limit counter desync across gateway replicas', impact: 'Users exceed rate limits by distributing requests across gateway instances', mitigation: 'Centralized rate limit store (Redis) with sliding window counters, or accept approximate limits with local counters synced periodically' },
      { scenario: 'Malformed request triggers unhandled exception in gateway', impact: 'Gateway process crashes, dropping all in-flight requests on that instance', mitigation: 'Robust input validation, graceful error handling with catch-all middleware, process supervisor for automatic restart' },
      { scenario: 'Configuration update with invalid routing rules pushed to all instances', impact: 'All gateway instances start returning 404/500, total service outage', mitigation: 'Canary config deployment (roll to 1 instance first), config validation before apply, instant rollback capability' },
      { scenario: 'JWT validation key rotation during active traffic', impact: 'Requests signed with old key are rejected, causing user-facing auth failures', mitigation: 'Support multiple active verification keys during rotation window, graceful key transition with overlap period' },
    ],
    tradeoffs: [
      { decision: 'Centralized gateway vs sidecar proxy (service mesh)', pros: 'Centralized is simpler to manage; sidecar gives per-service control', cons: 'Centralized is a single point of failure; sidecar adds resource overhead per pod', recommendation: 'Centralized gateway for north-south traffic (external), sidecar for east-west traffic (inter-service)' },
      { decision: 'Synchronous request proxying vs async message passing', pros: 'Sync is simple and familiar (HTTP); async decouples services and handles spikes', cons: 'Sync has cascading failure risk; async adds complexity and eventual consistency', recommendation: 'Sync for real-time user-facing APIs, async via message queue for background and fire-and-forget operations' },
      { decision: 'Token validation at gateway vs pass-through to services', pros: 'Gateway validation offloads auth from services; pass-through gives services full control', cons: 'Gateway validation couples auth logic to gateway; pass-through duplicates validation', recommendation: 'Gateway validates token signature and expiration, services validate fine-grained permissions' },
      { decision: 'Static routing config vs dynamic service discovery', pros: 'Static is predictable and debuggable; dynamic adapts to scaling and failures', cons: 'Static requires redeployment for routing changes; dynamic adds discovery infrastructure', recommendation: 'Dynamic service discovery (Consul/etcd) with static fallback routes for critical paths' },
    ],
    layeredDesign: [
      { name: 'Edge Layer', purpose: 'TLS termination, DDoS protection, and initial request handling', components: ['TLS Terminator', 'IP Allowlist/Blocklist', 'DDoS Shield', 'Load Balancer'] },
      { name: 'Gateway Core Layer', purpose: 'Request routing, transformation, and policy enforcement', components: ['Route Matcher', 'Request Transformer', 'Response Transformer', 'Plugin Engine'] },
      { name: 'Security & Policy Layer', purpose: 'Authentication, authorization, and rate limiting', components: ['Auth Handler (JWT/OAuth)', 'Rate Limiter', 'Circuit Breaker', 'Request Validator'] },
      { name: 'Backend Integration Layer', purpose: 'Service discovery, health checking, and load balancing', components: ['Service Registry Client', 'Health Checker', 'Load Balancer (round-robin/least-conn)', 'Retry Handler'] },
    ],
  },

  // ─── 12. Distributed Cache ──────────────────────────────────────────
  {
    id: 'distributed-cache',
    isNew: true,
    title: 'Distributed Cache',
    subtitle: 'Redis / Memcached',
    icon: 'layers',
    color: '#dc2626',
    difficulty: 'Medium',
    description: 'Design a distributed in-memory caching system with consistent hashing, replication, and eviction policies.',

    introduction: `Distributed caching is a foundational infrastructure component that sits between application servers and databases, reducing latency from milliseconds (database query) to microseconds (memory access). Systems like Redis and Memcached are used in virtually every large-scale web application.

The core challenge is distributing cached data across multiple nodes while handling node failures, data rebalancing, and cache coherence. When a cache node is added or removed, the system must minimize the number of keys that need to be remapped (this is where consistent hashing becomes essential).

Additional challenges include: choosing the right eviction policy when memory is full, maintaining cache coherence (when the underlying data changes), replication for high availability, and handling the "thundering herd" problem when a popular cache key expires and hundreds of requests simultaneously hit the database.`,

    functionalRequirements: [
      'GET: retrieve value by key with O(1) latency',
      'SET: store key-value pair with optional TTL',
      'DELETE: remove a key',
      'Distribute data across multiple cache nodes',
      'Automatic rebalancing when nodes are added/removed',
      'Configurable eviction policies (LRU, LFU, TTL)',
      'Support for data structures (strings, lists, sets, hashes, sorted sets)',
      'Atomic operations (INCR, DECR, CAS)'
    ],

    nonFunctionalRequirements: [
      'GET/SET latency < 1ms (p99)',
      'Support 1M+ ops/sec per node',
      '99.99% availability',
      'Linear horizontal scalability',
      'Minimal key redistribution on node changes (<1/N keys moved)',
      'Memory-efficient storage with low overhead'
    ],

    estimation: {
      users: 'All application servers in the organization',
      storage: '~64GB-256GB RAM per cache node, cluster of 100-1000 nodes',
      bandwidth: '~100Gbps aggregate (small payloads, high request rate)',
      qps: '1M ops/sec per node, 100M+ ops/sec cluster-wide'
    },

    apiDesign: {
      description: 'Simple key-value protocol (similar to Redis RESP)',
      endpoints: [
        { method: 'GET', path: 'GET key', params: '', response: 'value or nil' },
        { method: 'SET', path: 'SET key value [EX seconds] [NX|XX]', params: '', response: 'OK or nil (if NX and key exists)' },
        { method: 'DEL', path: 'DEL key', params: '', response: 'count of keys deleted' },
        { method: 'INCR', path: 'INCR key', params: '', response: 'new integer value (atomic)' },
        { method: 'MGET', path: 'MGET key1 key2 ...', params: '', response: '[value1, value2, ...]' },
        { method: 'EXPIRE', path: 'EXPIRE key seconds', params: '', response: '1 if TTL set, 0 if key not found' }
      ]
    },

    dataModel: {
      description: 'In-memory hash table with metadata per entry',
      schema: `-- Per cache node (in-memory)
hash_table {
  buckets: array<LinkedList<Entry>>
  size: int
  capacity: int  -- resize when load factor > 0.75
}

entry {
  key: bytes
  value: bytes
  ttl_ms: int64  -- 0 = no expiration
  created_at: int64
  last_accessed: int64  -- for LRU eviction
  access_count: int  -- for LFU eviction
  cas_token: int64  -- for compare-and-swap
}

-- Cluster metadata (stored in each node + coordinator)
cluster_config {
  ring: ConsistentHashRing {
    nodes: [{id, address, virtual_nodes[]}]
    hash_function: xxHash
  }
  replication_factor: int  -- typically 2-3
  read_quorum: int
  write_quorum: int
}`,
      examples: [
        { table: 'entry', label: 'Cached user session with TTL', json: `{ "key": "session:u-4829173", "value": "{\\\"userId\\\":4829173,\\\"role\\\":\\\"admin\\\"}", "ttl_ms": 1800000, "created_at": 1713482910000, "last_accessed": 1713483600000, "access_count": 37, "cas_token": 892710384 }` },
        { table: 'cluster_config', label: 'Three-node cache cluster', json: `{ "ring": { "nodes": [{"id": "cache-01", "address": "10.0.1.10:6379", "virtual_nodes": ["vn-0","vn-1","vn-2"]}, {"id": "cache-02", "address": "10.0.1.11:6379", "virtual_nodes": ["vn-3","vn-4","vn-5"]}, {"id": "cache-03", "address": "10.0.1.12:6379", "virtual_nodes": ["vn-6","vn-7","vn-8"]}], "hash_function": "xxHash" }, "replication_factor": 2, "read_quorum": 1, "write_quorum": 2 }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Cache with Mod Hashing',
      diagramSrc: '/diagrams/distributed-cache/impl-basic.png',
      description: 'Client uses modular hashing (key_hash % N) to determine which of N cache nodes holds a key. Each node stores data in an in-memory hash map with LRU eviction.',
      problems: [
        'Adding/removing a node remaps ~all keys (N-1/N keys move), causing a cache stampede',
        'No replication: single node failure loses all cached data on that node',
        'Hot keys on a single node create an unbalanced load',
        'No coordination: clients must all know the exact node list'
      ]
    },

    advancedImplementation: {
      title: 'Consistent Hashing with Virtual Nodes and Replication',
      diagramSrc: '/diagrams/distributed-cache/impl-advanced.png',
      description: 'Keys are distributed using consistent hashing with virtual nodes (each physical node owns multiple points on the hash ring). Data is replicated to N successor nodes on the ring. Clients connect to any node, which routes internally. Eviction uses a combination of LRU and TTL with lazy expiration.',
      keyPoints: [
        'Consistent hashing ring: each node has 100-200 virtual nodes for even distribution',
        'On node add/remove: only ~1/N keys need to be remapped (vs nearly all with mod hashing)',
        'Replication: each key stored on R consecutive nodes on the ring (R=3 typical)',
        'Read/write quorum: W + R > N for strong consistency, or W=1 R=1 for eventual consistency',
        'Lazy expiration: TTL-expired keys not actively deleted, removed on next access or eviction',
        'Background sweeper: periodically samples random keys, deletes expired ones to free memory'
      ],
      databaseChoice: 'Pure in-memory hash tables; optional persistence via RDB snapshots or AOF (append-only file) for recovery; Gossip protocol for cluster membership and health detection',
      caching: 'The system IS the cache. Client-side connection pooling and pipelining for throughput. Bloom filters can be used to quickly check if a key definitely does not exist (avoid unnecessary network round-trips).'
    },

    tips: [
      'Consistent hashing is THE key concept: explain virtual nodes and why they matter',
      'Discuss cache invalidation strategies: TTL, write-through, write-behind, cache-aside',
      'The thundering herd problem is a classic follow-up: discuss lease-based solutions',
      'Eviction policy choice depends on workload: LRU for recency, LFU for popularity',
      'Mention memory management: jemalloc, slab allocation to reduce fragmentation',
      'Discuss the CAP trade-off: most caches choose AP (available, partition-tolerant)'
    ],

    keyQuestions: [
      {
        question: 'How does consistent hashing with virtual nodes work?',
        answer: `**Hash Ring Concept**:
- Hash space is a ring from 0 to 2^32
- Each physical node placed at multiple points (virtual nodes) on the ring
- A key is hashed, then walks clockwise to find its owning node

**Example**: 3 physical nodes, 4 virtual nodes each = 12 points on ring
\`\`\`
Ring: ... [N1-v2] ... [N3-v1] ... [N2-v3] ... [N1-v4] ...
Key "user:123" hashes to position X
Walk clockwise from X -> first virtual node found = owner
\`\`\`

**Why Virtual Nodes?**:
- 3 physical nodes with 1 point each: wildly uneven distribution (one node might get 60% of keys)
- 3 nodes with 200 virtual nodes each: nearly perfect distribution (each gets ~33% ± 2%)
- More virtual nodes = better balance, but more memory for the ring data structure

**Node Addition (adding Node 4)**:
- Place Node 4's virtual nodes on the ring
- Keys between each new virtual node and its predecessor belong to Node 4
- Only ~1/4 of keys move (those in the ranges now owned by Node 4)
- Other 3/4 of keys: completely unaffected

**Node Removal**:
- Remove Node 3's virtual nodes from ring
- Keys that belonged to Node 3 now fall to the next clockwise node
- Only Node 3's keys are redistributed (~1/3 of total keys)`
      },
      {
        question: 'How do you handle the thundering herd problem?',
        answer: `**The Problem**:
- Popular key (e.g., celebrity profile) cached with TTL
- Key expires at time T
- 10,000 requests arrive in the next 100ms, all get cache miss
- All 10,000 hit the database simultaneously -> database overloaded

**Solution 1: Cache Lease (best approach)**:
\`\`\`
value = cache.GET(key)
if value is MISS:
    lease = cache.SET_LEASE(key, timeout=5s)
    if lease granted (first requester):
        value = database.query(key)
        cache.SET(key, value, ttl=300)
    else (subsequent requesters):
        wait(100ms)
        retry cache.GET(key)  # lease holder will have populated it
\`\`\`
- Only ONE request reaches the database
- Others wait briefly and read from cache

**Solution 2: Stale-While-Revalidate**:
- When TTL expires, serve stale value while ONE request refreshes in background
- No requests ever hit the database stampede
- Trade-off: briefly serves stale data

**Solution 3: Probabilistic Early Expiration**:
- Each request has a small probability of triggering refresh before TTL
- \`should_refresh = random() < (time_remaining / total_ttl) * factor\`
- Popular keys: refreshed early by one of many requesters
- Less popular keys: refresh naturally at TTL`
      },
      {
        question: 'How do you choose between LRU, LFU, and TTL eviction?',
        answer: `**LRU (Least Recently Used)**:
- Evict the key that hasn't been accessed for the longest time
- Good for: temporal locality (recently accessed = likely accessed again)
- Implementation: doubly linked list + hash map, O(1) for all operations
- Weakness: one-time scan of many keys pollutes the cache (scan resistance)

**LFU (Least Frequently Used)**:
- Evict the key with the fewest accesses
- Good for: skewed popularity (some keys are consistently hot)
- Implementation: frequency count + min-heap or frequency-indexed linked lists
- Weakness: keys with historically high count but no longer popular stay cached (stale popularity)

**TTL (Time-To-Live)**:
- Keys automatically expire after a set duration
- Good for: data with known freshness requirements
- Often combined with LRU/LFU for when memory is full before TTL expires

**Redis's Approach (recommended)**:
- allkeys-lru: LRU across all keys (most common choice)
- volatile-lfu: LFU only among keys with TTL set
- Sampling-based approximation: don't track access order for ALL keys
  - On eviction: sample 10 random keys, evict the LRU among them
  - Much less memory overhead than maintaining a full LRU list
  - Surprisingly close to perfect LRU in practice

**Recommendation by Workload**:
- Web sessions: TTL (known expiration)
- Database query cache: LRU (temporal locality)
- Content recommendation: LFU (popular items stay cached)
- Mixed: allkeys-lru with TTL on time-sensitive keys`
      }
    ],

    requirements: ['Key-value GET/SET operations', 'Consistent hashing', 'Replication', 'Eviction policies', 'Cluster management', 'Atomic operations'],
    components: ['Cache Nodes (in-memory)', 'Consistent Hash Ring', 'Gossip Protocol', 'Client Library (smart routing)', 'Monitoring/Metrics'],
    keyDecisions: [
      'Consistent hashing with virtual nodes for even distribution and minimal remapping',
      'Replication to R successor nodes on the ring for fault tolerance',
      'Sampling-based LRU approximation for memory-efficient eviction',
      'Cache lease mechanism to prevent thundering herd on popular key expiration',
      'Lazy expiration with background sweeper to balance CPU and memory usage',
      'Gossip protocol for decentralized cluster membership and failure detection'
    ],

    edgeCases: [
      { scenario: 'Hot key accessed by thousands of clients simultaneously', impact: 'Single cache node becomes CPU/network bottleneck, increased latency for co-located keys', mitigation: 'Hot key detection with automatic replication to multiple nodes, or client-side local caching for hot keys' },
      { scenario: 'Cache node failure causes thundering herd to database', impact: 'All keys on failed node miss simultaneously, database overwhelmed by sudden load spike', mitigation: 'Consistent hashing with virtual nodes to spread impact, circuit breaker on DB, warm up replacement node from replica' },
      { scenario: 'Large value (>1MB) evicts many small values during memory pressure', impact: 'Cache hit rate drops dramatically for small frequently-accessed keys', mitigation: 'Separate pools for large and small values, or reject values above a size threshold with external storage redirect' },
      { scenario: 'Cache poisoning: incorrect value cached with long TTL', impact: 'Stale or wrong data served for extended period across all clients', mitigation: 'Support explicit key invalidation API, version-tagged keys, short TTLs for mutable data with cache-aside pattern' },
      { scenario: 'Network partition between cache nodes splits the hash ring', impact: 'Clients route to different subsets of nodes, causing inconsistent reads', mitigation: 'Clients detect partition via health checks, fall through to database, automatic rebalancing on partition heal' },
    ],
    tradeoffs: [
      { decision: 'Consistent hashing vs hash slot (Redis Cluster style)', pros: 'Consistent hashing minimizes key movement; hash slots are simpler to manage', cons: 'Consistent hashing can create imbalanced load; hash slots require explicit slot management', recommendation: 'Consistent hashing with virtual nodes for automated balancing, hash slots if manual control is preferred' },
      { decision: 'Write-through vs write-behind vs cache-aside', pros: 'Write-through ensures consistency; write-behind improves write performance; cache-aside is simplest', cons: 'Write-through adds write latency; write-behind risks data loss; cache-aside has cache miss penalty', recommendation: 'Cache-aside for most use cases; write-through for critical data requiring strong consistency' },
      { decision: 'LRU vs LFU eviction policy', pros: 'LRU is simple and handles recency; LFU handles frequency-based access patterns', cons: 'LRU evicts frequently-used items after a cold spell; LFU is slow to adapt to changing patterns', recommendation: 'LFU with aging (like Redis allkeys-lfu) to balance frequency and recency' },
      { decision: 'Embedded cache vs external cache service', pros: 'Embedded eliminates network hop; external enables shared cache across services', cons: 'Embedded duplicates data per instance; external adds latency and operational overhead', recommendation: 'Two-tier: embedded L1 cache for hot data, external L2 (Redis/Memcached) for shared state' },
    ],
    layeredDesign: [
      { name: 'Client SDK Layer', purpose: 'Provide transparent caching API with connection pooling', components: ['Cache Client Library', 'Connection Pool', 'Consistent Hash Router', 'Local L1 Cache'] },
      { name: 'Cache Server Layer', purpose: 'Store and serve cached data with high throughput', components: ['Memory Store (hash table)', 'Eviction Engine (LRU/LFU)', 'Expiration Manager', 'Replication Handler'] },
      { name: 'Cluster Management Layer', purpose: 'Coordinate cache nodes and handle topology changes', components: ['Gossip Protocol', 'Failure Detector', 'Rebalancing Engine', 'Node Registry'] },
      { name: 'Persistence & Recovery Layer', purpose: 'Optional durability and warm-start capability', components: ['AOF/RDB Snapshots', 'Replica Sync', 'Backup Manager', 'Warm-Up Loader'] },
    ],
  },

  // ─── 13. CDN ────────────────────────────────────────────────────────
  {
    id: 'cdn',
    isNew: true,
    title: 'Content Delivery Network',
    subtitle: 'CloudFront / Akamai',
    icon: 'globe',
    color: '#f97316',
    difficulty: 'Hard',
    description: 'Design a content delivery network that caches and serves static and dynamic content from edge locations worldwide.',

    introduction: `A Content Delivery Network (CDN) is a geographically distributed network of proxy servers that cache content closer to end users. CDNs serve 50-90% of all internet traffic today, handling everything from static assets (images, CSS, JS) to video streaming and even dynamic API responses.

The fundamental challenge is maintaining cache consistency across hundreds of Points of Presence (PoPs) worldwide while minimizing the distance (and therefore latency) between users and content. A user in Tokyo should be served from a nearby PoP, not from an origin server in Virginia.

CDN design involves three key subsystems: the request routing system (directing users to the optimal PoP), the caching layer (deciding what to cache, when to evict, and when to purge), and the origin shield layer (protecting origin servers from being overwhelmed by cache misses from hundreds of PoPs).`,

    functionalRequirements: [
      'Cache static content (images, CSS, JS, video segments) at edge PoPs',
      'Route user requests to the nearest/fastest PoP',
      'Support cache invalidation and purging (instant and scheduled)',
      'Origin pull: fetch content from origin server on cache miss',
      'Custom caching rules per domain/path (TTL, query string handling)',
      'HTTPS termination at the edge',
      'Support for streaming (HLS/DASH video segments)',
      'Real-time analytics: hit rate, bandwidth, latency per PoP'
    ],

    nonFunctionalRequirements: [
      'Time-to-first-byte < 50ms for cached content',
      'Cache hit ratio > 95% for static content',
      '99.99% availability globally',
      'Support 200+ PoP locations worldwide',
      'Cache purge propagation < 5 seconds globally',
      'Handle 100+ Tbps aggregate traffic'
    ],

    estimation: {
      users: 'Millions of websites, billions of end users',
      storage: '~100TB SSD per PoP * 200 PoPs = ~20PB total edge storage',
      bandwidth: '~100+ Tbps aggregate outbound across all PoPs',
      qps: '~100M+ HTTP requests/sec across all PoPs'
    },

    apiDesign: {
      description: 'Configuration API for CDN customers, transparent HTTP proxying for end users',
      endpoints: [
        { method: 'POST', path: '/api/distributions', params: '{ originDomain, cacheBehaviors[], customDomain }', response: '201 { distributionId, cdnDomain }' },
        { method: 'POST', path: '/api/distributions/:id/invalidations', params: '{ paths: ["/images/*", "/index.html"] }', response: '202 { invalidationId, estimatedTime }' },
        { method: 'GET', path: '/api/distributions/:id/analytics', params: 'timeRange, metrics[], groupBy=pop|country', response: '{ dataPoints[] }' },
        { method: 'GET', path: '/*', params: 'End user request', response: 'Cached content or origin-fetched content', notes: 'Transparent proxying at edge PoPs' }
      ]
    },

    dataModel: {
      description: 'Cache storage, routing configuration, and analytics',
      schema: `-- Per-PoP cache storage (SSD-backed)
cache_entries {
  cache_key: varchar PK  -- hash(host + path + vary_headers + query)
  body: blob  -- actual content (or file path on SSD)
  content_type: varchar
  content_length: int
  ttl_expires: timestamp
  origin_headers: jsonb  -- Cache-Control, ETag, Last-Modified
  last_accessed: timestamp
  access_count: int
  created_at: timestamp
}

-- Central configuration (replicated to all PoPs)
distributions {
  id: uuid PK
  customer_id: bigint FK
  origin_domain: varchar
  cdn_domain: varchar  -- d1234.cdn.example.com
  custom_domains: text[]
  ssl_cert_ref: varchar
  cache_behaviors: jsonb  -- [{pathPattern, ttl, queryStringForwarding, headers}]
  enabled: boolean
}

-- Analytics (per-PoP, aggregated centrally)
request_logs {
  timestamp: timestamp
  pop_id: varchar
  distribution_id: uuid
  cache_status: enum(hit, miss, expired, bypass)
  status_code: int
  bytes_served: bigint
  ttfb_ms: int
  client_country: varchar
  client_ip_hash: varchar
}`
    },

    basicImplementation: {
      title: 'Basic CDN with DNS-Based Routing',
      diagramSrc: '/diagrams/cdn/impl-basic.png',
      description: 'DNS resolves the CDN domain to the IP of the nearest PoP (GeoDNS). Each PoP runs an Nginx reverse proxy that caches content from the origin server. Cache key is the full URL.',
      problems: [
        'DNS-based routing is coarse (GeoDNS latency measurements may be stale or inaccurate)',
        'Cache miss from any PoP goes directly to origin, potentially overwhelming it',
        'Cache purge requires contacting every PoP individually (slow propagation)',
        'No origin shield: 200 PoPs each making cache-miss requests = 200x origin load'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Tier CDN with Origin Shield and Anycast Routing',
      diagramSrc: '/diagrams/cdn/impl-advanced.png',
      description: 'Three-tier architecture: Edge PoPs (200+) -> Regional Shield PoPs (10-15) -> Origin Server. Anycast routing directs users to the nearest healthy Edge PoP automatically. Cache misses go to the regional shield (not origin), reducing origin load by 90%+. Cache invalidation uses a push-based fanout tree.',
      keyPoints: [
        'Anycast routing: all edge PoPs advertise the same IP prefix; BGP routes users to nearest PoP automatically',
        'Origin Shield tier: regional caches that aggregate cache misses from edge PoPs, protecting the origin',
        'Tiered caching: edge (hot content, SSD) -> shield (warm content, SSD+HDD) -> origin (cold, all content)',
        'Cache invalidation fanout: control plane pushes invalidation to shield PoPs, shields push to edges (tree topology)',
        'Consistent hashing within PoPs: each PoP has multiple cache servers, keys distributed by consistent hash',
        'Health checking: PoPs run active health checks to origin; if origin unhealthy, serve stale content (stale-while-error)'
      ],
      databaseChoice: 'SSD-backed file cache at edge PoPs; SSD+HDD at shield PoPs; etcd/Consul for configuration distribution; ClickHouse for analytics aggregation',
      caching: 'The system IS the cache. Layered TTLs: edge (short, 30s-5min for dynamic, hours for static), shield (2x edge TTL), stale-while-revalidate for seamless background refresh.'
    },

    tips: [
      'Start with the three-tier architecture: Edge -> Shield -> Origin',
      'Anycast vs GeoDNS routing is an important decision: discuss trade-offs',
      'Origin shield is a key insight that reduces origin load dramatically',
      'Cache invalidation at global scale is the hardest operational problem',
      'Discuss cache key construction: which headers and query params to include',
      'Mention SSL/TLS termination at edge: performance vs. end-to-end encryption trade-off'
    ],

    keyQuestions: [
      {
        question: 'How does request routing work to direct users to the optimal PoP?',
        answer: `**Option 1: Anycast (preferred for CDNs)**:
- All edge PoPs advertise the same IP prefix via BGP
- Internet routing naturally directs packets to the nearest PoP
- Pros: automatic, no DNS TTL issues, handles PoP failure (BGP withdraws route)
- Cons: routing is based on network topology (hops), not actual latency

**Option 2: GeoDNS**:
- DNS server maps client IP to geographic location
- Returns IP of the nearest PoP based on geo-database
- Pros: can incorporate real-time latency measurements
- Cons: DNS caching means clients may use stale PoP assignment

**Option 3: Latency-Based (hybrid)**:
- Client-side JavaScript measures latency to multiple PoPs
- Subsequent requests directed to the lowest-latency PoP
- Used by sophisticated CDNs for fine-tuning after initial anycast routing

**Failover**:
- Health checker monitors each PoP (synthetic requests every 10s)
- Unhealthy PoP: BGP withdraws its route announcement (anycast) or DNS stops returning its IP (GeoDNS)
- Traffic shifts to next-nearest healthy PoP within seconds (anycast) or DNS TTL (GeoDNS)

**Real-World**: Most CDNs use anycast for initial routing + real-time performance data for optimization`
      },
      {
        question: 'How does the origin shield tier work?',
        answer: `**The Problem Without Shield**:
- 200 edge PoPs, each with independent caches
- Popular content cached at all edges (great hit rate)
- Long-tail content: cache miss at multiple edges simultaneously
- 50 edges miss on same URL at same time -> 50 requests to origin

**Origin Shield Solution**:
- 10-15 regional shield PoPs placed between edges and origin
- Edge cache miss -> goes to regional shield (NOT to origin)
- Shield cache miss -> goes to origin (only 1 request per region)

**Request Flow**:
\`\`\`
User -> Edge PoP (SFO) -> [HIT] -> serve
User -> Edge PoP (SFO) -> [MISS] -> Shield (US-West) -> [HIT] -> serve, cache at edge
User -> Edge PoP (SFO) -> [MISS] -> Shield (US-West) -> [MISS] -> Origin -> serve, cache at shield + edge
\`\`\`

**Shield Assignment**:
- Each edge PoP is assigned to one shield PoP (based on network proximity)
- US-West edges -> US-West shield
- EU edges -> EU shield
- This ensures request coalescing: all US-West edges funnel misses through one shield

**Origin Load Reduction**:
- Without shield: origin sees O(PoPs) requests per unique URL
- With shield: origin sees O(regions) requests per unique URL
- 200 PoPs, 10 regions -> 20x reduction in origin load

**Request Coalescing at Shield**:
- Multiple edges miss on same URL simultaneously
- Shield receives multiple requests for same URL
- Only the FIRST request goes to origin
- Subsequent requests wait for the first to complete, then all served from shield cache`
      },
      {
        question: 'How do you handle cache invalidation across 200+ PoPs?',
        answer: `**Push-Based Invalidation Fanout**:

**Invalidation Request Flow**:
1. Customer calls API: \`POST /invalidations { paths: ["/images/*"] }\`
2. Control plane writes invalidation to central store
3. Control plane pushes to shield PoPs (10 nodes, parallel)
4. Each shield pushes to its assigned edge PoPs (20 nodes each, parallel)
5. Total propagation: 2 hops * ~1s each = ~2-3 seconds globally

**At Each PoP**:
- Receive invalidation pattern (e.g., "/images/*")
- Walk cache index, mark matching entries as invalidated
- Marked entries: serve stale with background revalidation (optional) or reject immediately
- Do NOT delete from disk (expensive): let normal eviction reclaim space

**Invalidation Types**:
- **Path-based**: invalidate all URLs matching a glob pattern
- **Tag-based**: objects tagged at creation, invalidate by tag (e.g., "product:123")
- **Purge all**: nuclear option, clears entire cache for a distribution

**Consistency Guarantees**:
- "Best effort within 5 seconds": not instant, but very fast
- During propagation window: some PoPs may serve stale content (acceptable for most use cases)
- For strong consistency needs: use Cache-Control: no-cache (forces origin validation on every request)

**Monitoring**:
- Track invalidation progress: how many PoPs have processed each invalidation
- Alert if propagation takes >10 seconds (indicates network or PoP health issues)
- Invalidation rate limiting: prevent customers from invalidating too frequently (cache thrashing)`
      }
    ],

    requirements: ['Edge caching', 'Request routing', 'Cache invalidation', 'Origin shielding', 'HTTPS termination', 'Analytics'],
    components: ['Edge PoPs (200+)', 'Shield PoPs (10-15)', 'Anycast Routing', 'Control Plane', 'etcd (config)', 'ClickHouse (analytics)', 'Health Checker'],
    keyDecisions: [
      'Three-tier architecture: Edge -> Shield -> Origin for progressive cache aggregation',
      'Anycast routing for automatic, topology-aware user-to-PoP assignment',
      'Origin shield reduces origin load from O(PoPs) to O(regions) per unique URL',
      'Push-based invalidation fanout tree for sub-5-second global cache purging',
      'Consistent hashing within PoPs for even load distribution across cache servers',
      'Stale-while-revalidate for seamless background cache refresh without latency spikes'
    ],

    edgeCases: [
      { scenario: 'Origin server goes down during a cache miss', impact: 'Edge nodes cannot serve content, users see errors for uncached resources', mitigation: 'Serve stale content with stale-if-error directive, maintain origin health checks, failover to backup origin' },
      { scenario: 'Cache stampede when popular content expires simultaneously', impact: 'All edge nodes hit origin at once, overwhelming it', mitigation: 'Request coalescing at edge (single flight), stale-while-revalidate, jittered TTLs to spread expiration' },
      { scenario: 'Content purge needed immediately (legal takedown, security incident)', impact: 'Stale content served from thousands of edge nodes until TTL expires', mitigation: 'Fast purge API that broadcasts invalidation to all PoPs within seconds, support for instant purge via token-based versioning' },
      { scenario: 'DDoS attack targeting a specific URL pattern', impact: 'Edge nodes forward attack traffic to origin, or cache fills with attack responses', mitigation: 'Rate limiting at edge, WAF rules, challenge pages for suspicious traffic, origin shielding' },
      { scenario: 'Video live stream with millions of concurrent viewers across regions', impact: 'Origin bandwidth exhausted, cache fragmentation across bitrates and segments', mitigation: 'Origin shield (mid-tier cache), segment-level caching with predictive pre-fetch for next segments' },
    ],
    tradeoffs: [
      { decision: 'Push-based vs pull-based cache population', pros: 'Push pre-warms caches for predictable traffic; pull is simple and demand-driven', cons: 'Push wastes bandwidth for unpopular content; pull causes cold-start latency', recommendation: 'Pull-based for general content with push pre-warming for known high-traffic events (product launches, live streams)' },
      { decision: 'Single-tier vs multi-tier caching (edge + shield)', pros: 'Single-tier is simpler; multi-tier reduces origin load dramatically', cons: 'Single-tier hammers origin on cache misses; multi-tier adds latency and complexity', recommendation: 'Multi-tier with origin shield (mid-tier) to absorb cache misses from regional edges' },
      { decision: 'Anycast vs DNS-based routing to nearest PoP', pros: 'Anycast is instant and transparent; DNS gives more control over routing', cons: 'Anycast can route to suboptimal PoP; DNS has TTL-based propagation delay', recommendation: 'Anycast for initial routing with DNS fine-tuning for geographic optimization' },
      { decision: 'Cache everything vs selective caching', pros: 'Cache everything maximizes hit rate; selective caching saves edge storage', cons: 'Cache everything includes uncacheable/dynamic content; selective misses optimization opportunities', recommendation: 'Cache by default with explicit no-cache directives for dynamic or personalized content' },
    ],
    layeredDesign: [
      { name: 'Edge Layer (PoPs)', purpose: 'Serve content from geographically distributed points of presence', components: ['Edge Cache Servers', 'TLS Termination', 'WAF/DDoS Protection', 'Request Router (Anycast)'] },
      { name: 'Mid-Tier / Shield Layer', purpose: 'Reduce origin load by aggregating cache misses from edge nodes', components: ['Origin Shield Cache', 'Request Coalescing', 'Health Checker', 'Failover Manager'] },
      { name: 'Origin Integration Layer', purpose: 'Connect CDN to customer origin servers', components: ['Origin Connector', 'Pull/Push Manager', 'Purge API', 'Certificate Manager'] },
      { name: 'Control Plane', purpose: 'Configure, monitor, and manage CDN behavior', components: ['Configuration API', 'Analytics Pipeline', 'Real-Time Monitoring', 'DNS Management'] },
    ],
  },

  // ─── 14. Object Storage (S3) ───────────────────────────────────────
  {
    id: 'object-storage',
    isNew: true,
    title: 'Object Storage (S3)',
    subtitle: 'Blob Storage Service',
    icon: 'archive',
    color: '#569a31',
    difficulty: 'Hard',
    description: 'Design a highly durable, scalable object storage service for storing and retrieving arbitrary binary objects.',

    introduction: `Object storage (like Amazon S3) is the backbone of the modern internet. It stores everything from user-uploaded images to data lake files to application backups. S3 alone stores over 200 trillion objects. The defining characteristic is extreme durability: S3 promises 99.999999999% (11 nines) durability, meaning if you store 10 million objects, you'd statistically lose one object every 10,000 years.

Unlike file systems (hierarchical, mutable) or block storage (fixed-size blocks), object storage uses a flat namespace of immutable objects addressed by key. This simplicity enables massive horizontal scaling because there's no directory tree to maintain consistency on and no file locking needed.

The key engineering challenges are: achieving 11-nines durability through replication and erasure coding, managing metadata for trillions of objects, handling multi-part uploads for huge files, and providing strong consistency (S3 achieved strong read-after-write consistency in 2020, which is architecturally non-trivial at this scale).`,

    functionalRequirements: [
      'PUT: upload objects up to 5TB (multipart upload for >100MB)',
      'GET: download objects by key, support range requests for partial reads',
      'DELETE: remove objects',
      'LIST: enumerate objects with prefix filtering and pagination',
      'Buckets: logical containers for organizing objects',
      'Access control: per-bucket and per-object ACLs and policies',
      'Object versioning: keep all versions of an object',
      'Pre-signed URLs: time-limited access without authentication'
    ],

    nonFunctionalRequirements: [
      'Durability: 99.999999999% (11 nines)',
      'Availability: 99.99%',
      'Support trillions of objects across millions of buckets',
      'Throughput: thousands of PUT/GET per second per bucket',
      'Strong read-after-write consistency',
      'No limit on total storage capacity'
    ],

    estimation: {
      users: '1M+ customers, 200T+ objects stored',
      storage: '~100 exabytes total, growing ~1 exabyte/month',
      bandwidth: '~100+ Tbps aggregate (large objects dominate)',
      qps: '~100M requests/sec (mixed GET, PUT, LIST, DELETE)'
    },

    apiDesign: {
      description: 'RESTful API using bucket and key path',
      endpoints: [
        { method: 'PUT', path: '/:bucket/:key', params: 'Object body, Content-Type, metadata headers', response: '200 { ETag, versionId }' },
        { method: 'GET', path: '/:bucket/:key', params: 'Range header (optional), versionId (optional)', response: '200 Object body + metadata headers' },
        { method: 'DELETE', path: '/:bucket/:key', params: 'versionId (optional)', response: '204 No Content' },
        { method: 'GET', path: '/:bucket?list-type=2', params: 'prefix, delimiter, max-keys, continuation-token', response: '200 XML { Contents[], CommonPrefixes[] }' },
        { method: 'POST', path: '/:bucket/:key?uploads', params: 'Initiate multipart upload', response: '200 { uploadId }' },
        { method: 'PUT', path: '/:bucket/:key?partNumber=N&uploadId=X', params: 'Part body', response: '200 { ETag }' }
      ]
    },

    dataModel: {
      description: 'Metadata index and data storage layers',
      schema: `-- Metadata layer (distributed key-value store)
objects {
  bucket_name: varchar
  key: varchar  -- full object key (path-like string)
  version_id: varchar  -- for versioned buckets
  etag: varchar  -- MD5 hash of content
  size_bytes: bigint
  content_type: varchar
  user_metadata: map<string, string>
  storage_class: enum(standard, infrequent, glacier)
  data_locations: list<{chunk_id, node_ids[]}>  -- where data lives
  created_at: timestamp
  PK(bucket_name, key, version_id)
}

buckets {
  name: varchar PK  -- globally unique
  owner_id: bigint
  region: varchar
  versioning: boolean
  acl: jsonb
  lifecycle_rules: jsonb
  created_at: timestamp
}

-- Data layer (distributed across storage nodes)
data_chunks {
  chunk_id: uuid PK
  data: blob  -- actual bytes (or erasure-coded fragments)
  checksum: varchar  -- SHA-256 for integrity verification
  node_id: varchar  -- which storage node
  replica_set: list<node_id>  -- nodes holding copies
}`,
      examples: [
        { table: 'objects', label: 'Uploaded image object with metadata', json: `{ "bucket_name": "media-uploads", "key": "photos/2025/04/sunset.jpg", "version_id": "v3", "etag": "d41d8cd98f00b204e9800998ecf8427e", "size_bytes": 4218903, "content_type": "image/jpeg", "user_metadata": {"uploaded-by": "user-7291"}, "storage_class": "standard", "data_locations": [{"chunk_id": "ck-a1b2c3", "node_ids": ["node-1","node-3","node-5"]}], "created_at": "2025-04-15T09:23:11Z" }` },
        { table: 'buckets', label: 'Versioned media bucket', json: `{ "name": "media-uploads", "owner_id": 58201, "region": "us-east-1", "versioning": true, "acl": {"owner": "FULL_CONTROL", "public": "READ"}, "lifecycle_rules": [{"prefix": "tmp/", "expiration_days": 7}], "created_at": "2024-01-10T14:00:00Z" }` },
        { table: 'data_chunks', label: 'Erasure-coded data chunk', json: `{ "chunk_id": "ck-a1b2c3", "data": "<binary 8MB>", "checksum": "sha256:e3b0c44298fc1c14...", "node_id": "node-1", "replica_set": ["node-1", "node-3", "node-5"] }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/object-storage/impl-basic.png',
      description: 'Objects stored as files on a distributed filesystem (e.g., HDFS). Metadata in a centralized database. Three-way replication for durability.',
      problems: [
        'Three-way replication has 200% storage overhead (3x the actual data)',
        'Centralized metadata database becomes the bottleneck for trillions of objects',
        'Strong consistency across replicas is slow with synchronous replication',
        'Small files are inefficient: each is a separate filesystem entry with metadata overhead'
      ]
    },

    advancedImplementation: {
      title: 'Erasure-Coded Storage with Distributed Metadata',
      diagramSrc: '/diagrams/object-storage/impl-advanced.png',
      description: 'Object data is split into fragments and encoded using Reed-Solomon erasure coding (e.g., 6 data + 3 parity fragments). This provides 11-nines durability with only 1.5x storage overhead (vs 3x for replication). Metadata is stored in a distributed, partitioned key-value store (like DynamoDB) with strong consistency via Paxos. Small objects are packed together into larger "log-structured" segments.',
      keyPoints: [
        'Erasure coding (6+3 Reed-Solomon): object survives loss of any 3 fragments; 1.5x overhead vs 3x for replication',
        'Metadata partitioning: bucket+key hash determines metadata shard, each shard uses Paxos for consistency',
        'Log-structured storage: small objects appended to a shared log segment, compacted periodically',
        'Strong consistency: metadata write completes only after Paxos quorum acknowledges, GET always reads latest',
        'Background integrity checker: continuously reads and verifies checksums, reconstructs any degraded fragments',
        'Storage tiering: hot data on SSD, warm on HDD, cold archived to tape/deep storage with retrieval delay'
      ],
      databaseChoice: 'Custom distributed KV store (Paxos-based) for metadata; raw disk management for data storage (bypass filesystem for efficiency); separate index service for LIST operations (prefix-based range queries)',
      caching: 'Metadata cache in memory on storage nodes (object metadata accessed frequently on reads); front-end CDN for GET requests; no caching of object data itself (too large, too diverse access patterns)'
    },

    tips: [
      'Durability is the primary design goal: explain erasure coding vs replication trade-offs',
      'Separate metadata from data in your architecture: they have very different access patterns',
      'Strong read-after-write consistency is a notable achievement: discuss how it is implemented',
      'Multipart upload is essential for large objects: discuss the protocol',
      'Mention the LIST operation challenge: prefix-based listing across a distributed namespace',
      'Storage classes (hot/warm/cold) are an important cost optimization feature'
    ],

    keyQuestions: [
      {
        question: 'How does erasure coding achieve 11-nines durability?',
        answer: `**Reed-Solomon Erasure Coding (6+3 example)**:
- Object split into 6 data fragments
- 3 parity fragments computed (mathematical redundancy)
- 9 fragments placed on 9 different storage nodes (different racks/zones)

**Durability Math**:
- Object is lost only if 4+ of 9 fragments are simultaneously unavailable
- P(single fragment loss) = 0.01 (1% per year, industry average for disk failure)
- P(4+ fragments lost simultaneously) ≈ C(9,4) * 0.01^4 * 0.99^5 ≈ 1.25 × 10^-8
- With repair (fragments reconstructed within hours of failure): effectively < 10^-11

**Comparison with 3-Way Replication**:
- Replication: 3 copies, data lost if all 3 fail -> P ≈ 10^-6 (6 nines)
- Erasure coding 6+3: 9 fragments, data lost if 4+ fail -> P ≈ 10^-11 (11 nines)
- Storage overhead: replication = 3x, erasure coding = 1.5x (9/6)
- Erasure coding is both MORE durable AND MORE space-efficient

**Repair Process**:
- Background process monitors fragment health (heartbeats, checksums)
- When a fragment is lost (node dies): reconstruct from any 6 of remaining 8 fragments
- Place reconstructed fragment on a new healthy node
- Repair window: <6 hours (the shorter, the more durable the system)`
      },
      {
        question: 'How do you achieve strong read-after-write consistency?',
        answer: `**The Challenge**:
- PUT completes at time T
- GET at time T+1ms must return the new object (not stale or "not found")
- In a distributed system with replication, this is hard

**Solution: Paxos-Based Metadata Writes**:

**Write Path (PUT)**:
1. Client sends object to front-end server
2. Front-end writes data fragments to storage nodes (erasure coded)
3. Front-end proposes metadata write to Paxos group for that key's shard
4. Paxos group achieves consensus (majority acknowledges)
5. PUT response sent to client only after Paxos commits

**Read Path (GET)**:
1. Client sends GET to front-end server
2. Front-end reads metadata from Paxos group (reads from leader or quorum)
3. Metadata includes data locations; front-end fetches data fragments
4. Returns object to client

**Why This Guarantees Consistency**:
- PUT only succeeds after Paxos consensus (metadata is committed)
- GET reads from the same Paxos group (sees all committed writes)
- No stale reads possible: every read sees every completed write

**Performance Impact**:
- Write latency slightly higher (Paxos round-trip: ~5-10ms additional)
- Read latency: can read from Paxos leader (no quorum needed for reads if leader has latest state)
- Trade-off is worth it: strong consistency eliminates an entire class of application bugs`
      },
      {
        question: 'How does multipart upload work for large objects?',
        answer: `**Protocol** (for objects >100MB, required >5GB):

**Phase 1 - Initiate**:
\`\`\`
POST /bucket/large-file.zip?uploads
Response: { uploadId: "abc-123" }
\`\`\`

**Phase 2 - Upload Parts** (parallel):
\`\`\`
PUT /bucket/large-file.zip?partNumber=1&uploadId=abc-123  [body: 100MB]
PUT /bucket/large-file.zip?partNumber=2&uploadId=abc-123  [body: 100MB]
...
PUT /bucket/large-file.zip?partNumber=50&uploadId=abc-123 [body: 50MB]
// Parts can be uploaded in any order, in parallel, from different clients
\`\`\`

**Phase 3 - Complete**:
\`\`\`
POST /bucket/large-file.zip?uploadId=abc-123
Body: { parts: [{partNumber: 1, ETag: "..."}, {partNumber: 2, ETag: "..."}, ...] }
// Server assembles parts into final object
\`\`\`

**Why Multipart?**:
- Resumability: if a part fails, retry just that part (not the whole 5TB file)
- Parallelism: upload multiple parts simultaneously (saturate network bandwidth)
- Memory efficiency: server handles one part at a time, doesn't buffer entire file

**Server-Side Handling**:
- Each part stored independently (like a temporary small object)
- On complete: create final object metadata pointing to all parts in order
- Parts are already erasure-coded individually -> final object doesn't need re-encoding
- Abort: if upload not completed within 7 days, parts garbage collected

**Integrity**:
- Each part has its own ETag (MD5 hash)
- Final object ETag = MD5(concatenation of part ETags) + "-" + partCount
- Client can verify each part and final object independently`
      }
    ],

    requirements: ['Object PUT/GET/DELETE', 'Multipart upload', '11-nines durability', 'Strong consistency', 'Bucket management', 'Access control'],
    components: ['Front-End Servers', 'Metadata Store (Paxos)', 'Storage Nodes', 'Erasure Coding Engine', 'Integrity Checker', 'Lifecycle Manager'],
    keyDecisions: [
      'Reed-Solomon erasure coding (6+3) for 11-nines durability at 1.5x storage overhead',
      'Paxos-based metadata store for strong read-after-write consistency',
      'Log-structured storage for efficient small object handling',
      'Multipart upload protocol for reliable large object transfers',
      'Background integrity checker continuously verifies checksums and repairs degraded fragments',
      'Storage tiering (SSD -> HDD -> archive) for cost optimization'
    ],

    edgeCases: [
      { scenario: 'Concurrent writes to the same object key from multiple clients', impact: 'Last-writer-wins silently overwrites data, one client loses their upload', mitigation: 'Support conditional writes with ETags/If-Match headers, return 412 on conflict for client-side resolution' },
      { scenario: 'Disk failure loses data chunks before replication completes', impact: 'Partial object stored, reads return corrupted or incomplete data', mitigation: 'Write to minimum replication factor before acknowledging success, use erasure coding for space-efficient durability' },
      { scenario: 'Multi-part upload abandoned halfway through', impact: 'Orphaned chunks consume storage indefinitely without forming a complete object', mitigation: 'TTL on incomplete multipart uploads, background garbage collector cleans orphaned parts after configurable period' },
      { scenario: 'Object listing on a bucket with billions of objects', impact: 'LIST operation times out or consumes excessive memory', mitigation: 'Prefix-based partitioned index, paginated listing with continuation tokens, limit results per page' },
      { scenario: 'Hot object accessed millions of times per second (viral content)', impact: 'Single storage node becomes bottleneck, degrading access for co-located objects', mitigation: 'Automatic hot-object detection with read replicas or CDN integration for frequently accessed objects' },
    ],
    tradeoffs: [
      { decision: 'Replication vs erasure coding for durability', pros: 'Replication is simple with fast reads; erasure coding uses 50% less storage', cons: 'Replication triples storage cost; erasure coding adds CPU overhead for encode/decode', recommendation: 'Erasure coding (e.g., Reed-Solomon 6+3) for cold data, replication for frequently accessed objects' },
      { decision: 'Strong consistency vs eventual consistency for object reads', pros: 'Strong consistency avoids stale reads; eventual consistency gives lower latency', cons: 'Strong consistency requires synchronous replication; eventual consistency confuses clients', recommendation: 'Read-after-write consistency for the uploading client, eventual consistency for other readers (like S3 model)' },
      { decision: 'Flat namespace vs hierarchical directory structure', pros: 'Flat namespace scales infinitely; hierarchical is intuitive for users', cons: 'Flat namespace makes prefix listing expensive; hierarchical complicates rename operations', recommendation: 'Flat namespace internally with virtual directory emulation via key prefixes (the S3 approach)' },
      { decision: 'Inline metadata vs separate metadata service', pros: 'Inline is simpler; separate metadata service scales independently', cons: 'Inline couples data and metadata; separate adds network hop for every operation', recommendation: 'Separate metadata service for scalability, with metadata caching for hot objects' },
    ],
    layeredDesign: [
      { name: 'API Gateway Layer', purpose: 'Handle HTTP requests, authentication, and request routing', components: ['REST API (S3-compatible)', 'Auth & ACL Checker', 'Rate Limiter', 'Request Router'] },
      { name: 'Metadata Layer', purpose: 'Track object locations, versions, and bucket configurations', components: ['Metadata Service', 'Namespace Manager', 'Versioning Engine', 'Bucket Policy Engine'] },
      { name: 'Data Layer', purpose: 'Store and retrieve actual object bytes with durability guarantees', components: ['Chunk Manager', 'Erasure Coding Engine', 'Replication Controller', 'Integrity Verifier'] },
      { name: 'Storage Infrastructure Layer', purpose: 'Physical storage management and lifecycle automation', components: ['Disk Manager', 'Storage Tiering (SSD/HDD/Archive)', 'Garbage Collector', 'Capacity Planner'] },
    ],
  },

  // ─── 15. Time Series Database ──────────────────────────────────────
  {
    id: 'time-series-db',
    isNew: true,
    title: 'Time Series Database',
    subtitle: 'InfluxDB / Prometheus',
    icon: 'activity',
    color: '#22c55e',
    difficulty: 'Medium',
    description: 'Design a database optimized for time-stamped data with high write throughput and efficient range queries.',

    introduction: `Time series databases (TSDBs) are specialized storage systems for data that is indexed by time: metrics, IoT sensor readings, financial tick data, application logs, and more. The access pattern is distinctive: data is written once (append-only), read in time-range scans, and older data is accessed less frequently.

Standard databases handle time series data poorly because they are designed for random read/write access. TSDBs exploit the unique characteristics of time series data: it arrives in roughly chronological order, it is rarely updated after writing, and queries almost always involve time-range filters with aggregation (e.g., "average CPU usage per minute for the last 24 hours").

The key engineering challenge is sustaining high write throughput (millions of data points per second) while supporting fast range queries with aggregation. The LSM-tree (Log-Structured Merge Tree) storage engine is the foundation, combined with time-based partitioning and columnar compression.`,

    functionalRequirements: [
      'Ingest millions of data points per second',
      'Time-range queries with aggregation (avg, sum, min, max, percentile)',
      'Tag-based filtering (e.g., host=web01 AND region=us-east)',
      'Downsampling: automatic aggregation of old data to lower resolution',
      'Retention policies: auto-delete data older than N days',
      'Continuous queries / materialized aggregations',
      'Multi-series queries (compare CPU across 1000 hosts)',
      'Support for out-of-order data arrival'
    ],

    nonFunctionalRequirements: [
      'Write throughput: 10M+ data points/sec per node',
      'Query latency: <100ms for recent data, <1s for aggregations over months',
      'Compression ratio: 10-20x for numerical time series',
      '99.95% availability',
      'Linear write scalability with additional nodes',
      'Storage efficiency: hot/warm/cold tiering'
    ],

    estimation: {
      users: '10K services reporting metrics, 1M IoT devices',
      storage: '~16 bytes/point * 10M points/sec = ~160MB/sec raw; ~10MB/sec compressed',
      bandwidth: '~1Gbps ingest, ~10Gbps query responses',
      qps: '~100K write batches/sec (each batch = 100-1000 points), ~10K queries/sec'
    },

    apiDesign: {
      description: 'Line protocol for writes, SQL-like query language for reads',
      endpoints: [
        { method: 'POST', path: '/api/write', params: 'measurement,tag1=v1,tag2=v2 field1=100,field2=3.14 timestamp_ns', response: '204 No Content' },
        { method: 'POST', path: '/api/query', params: '{ query: "SELECT mean(cpu) FROM metrics WHERE host=web01 AND time > now()-1h GROUP BY time(5m)" }', response: '{ results: [{time, mean_cpu}] }' },
        { method: 'POST', path: '/api/retention', params: '{ database, duration: "30d", downsampleTo: "1h" }', response: '200 { policyId }' },
        { method: 'GET', path: '/api/series', params: 'measurement, tagKey', response: '{ tagValues[] }' }
      ]
    },

    dataModel: {
      description: 'Time-partitioned, columnar storage with tag indexing',
      schema: `-- Logical data model
data_point {
  measurement: varchar  -- e.g., "cpu_usage"
  tags: map<string, string>  -- e.g., {host: "web01", region: "us-east"}
  fields: map<string, number|string|bool>  -- e.g., {value: 87.5, idle: 12.5}
  timestamp: int64 (nanoseconds)
}

-- Physical storage: time-partitioned shards
shard {
  time_range: [start_time, end_time)  -- e.g., 24-hour window
  series_index: map<series_key, series_id>  -- series_key = measurement + sorted tags
  -- Columnar storage per series:
  timestamps: compressed_array<int64>  -- delta-of-delta encoding
  values: compressed_array<float64>  -- XOR encoding (Gorilla compression)
}

-- Tag index (inverted index for filtering)
tag_index {
  tag_key: varchar
  tag_value: varchar
  series_ids: roaring_bitmap  -- compressed set of series IDs
}

-- Downsampled aggregations
rollups {
  measurement: varchar
  tags: map<string, string>
  interval: enum(1m, 5m, 1h, 1d)
  aggregates: map<string, {min, max, sum, count, mean}>
  bucket_time: timestamp
}`,
      examples: [
        { table: 'data_point', label: 'CPU usage metric from web server', json: `{ "measurement": "cpu_usage", "tags": {"host": "web-07", "region": "us-east", "env": "production"}, "fields": {"value": 87.5, "idle": 12.5, "system": 4.2}, "timestamp": 1713483600000000000 }` },
        { table: 'tag_index', label: 'Inverted index entry for region tag', json: `{ "tag_key": "region", "tag_value": "us-east", "series_ids": [101, 102, 205, 318, 442] }` },
        { table: 'rollups', label: 'Hourly rollup for cpu_usage metric', json: `{ "measurement": "cpu_usage", "tags": {"host": "web-07", "region": "us-east"}, "interval": "1h", "aggregates": {"value": {"min": 22.1, "max": 97.3, "sum": 4280.5, "count": 720, "mean": 59.45}}, "bucket_time": "2025-04-18T14:00:00Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/time-series-db/impl-basic.png',
      description: 'Data stored in a standard database (PostgreSQL) with a timestamp column and B-tree indexes. Queries use standard SQL with time-range WHERE clauses.',
      problems: [
        'B-tree indexes are write-amplified: every insert updates multiple index pages',
        'Row-oriented storage wastes space: reading one field requires loading the entire row',
        'No compression: 16 bytes per data point adds up quickly at millions per second',
        'Aggregation queries scan all matching rows: no pre-computed rollups'
      ]
    },

    advancedImplementation: {
      title: 'LSM-Tree Based TSDB with Columnar Compression',
      diagramSrc: '/diagrams/time-series-db/impl-advanced.png',
      description: 'Writes go to an in-memory buffer (WAL-backed), which is periodically flushed to immutable, time-partitioned, columnar files on disk (SST files). Gorilla-style compression encodes timestamps with delta-of-delta and values with XOR encoding, achieving 10-20x compression. Background compaction merges small files into larger ones. An inverted index on tags enables fast series lookup.',
      keyPoints: [
        'LSM-tree write path: append to WAL + in-memory buffer -> periodic flush to sorted SST files -> background compaction',
        'Time-based partitioning: each shard covers a fixed time window (e.g., 24 hours), enabling efficient retention (drop old shard = delete one directory)',
        'Gorilla compression: timestamps delta-of-delta encoded (most deltas are 0 or small), values XOR-encoded (consecutive values are similar)',
        'Inverted tag index: Roaring Bitmaps for each tag value mapping to series IDs, enabling fast AND/OR filtering',
        'Query engine: reads only relevant shards (time-range prune) and series (tag filter prune), then scans columnar data',
        'Downsampling worker: background process computes 1-minute, 5-minute, 1-hour rollups from raw data'
      ],
      databaseChoice: 'Custom LSM-tree engine (similar to RocksDB internals) with time-series-specific optimizations; WAL for durability; separate inverted index for tag queries',
      caching: 'In-memory buffer serves queries for most recent data (last few minutes); block cache for frequently accessed SST file blocks; downsampled rollups cached in memory for dashboard queries'
    },

    tips: [
      'Start by explaining why general-purpose databases are poor for time series',
      'The LSM-tree write path is the key concept for high write throughput',
      'Gorilla compression is a great depth point: explain delta-of-delta and XOR encoding',
      'Time-based partitioning makes retention trivially efficient (drop shard = delete directory)',
      'Discuss the read path: time-range pruning + tag filtering + columnar scan',
      'Mention out-of-order data handling: buffering window or separate late-data partition'
    ],

    keyQuestions: [
      {
        question: 'How does Gorilla compression achieve 10-20x compression?',
        answer: `**Timestamp Compression (delta-of-delta)**:
- Timestamps arrive at regular intervals (e.g., every 10 seconds)
- First timestamp: stored as full 64-bit value
- Subsequent: store delta from previous (e.g., 10, 10, 10, 10...)
- Delta-of-delta: store difference of deltas (e.g., 0, 0, 0, 0...)
- Most delta-of-deltas are 0: encode as single bit!
- Result: ~1-2 bits per timestamp (vs 64 bits uncompressed) = 32-64x compression

**Value Compression (XOR encoding)**:
- Consecutive readings of same metric are usually similar
- Example: CPU values 87.5, 87.3, 87.6, 87.4...
- XOR of consecutive float64 values: most bits are identical (XOR result has few 1-bits)
- Encode only the position and length of differing bits
- Result: ~5-10 bits per value (vs 64 bits uncompressed) = 6-12x compression

**Combined Effect**:
- Raw data point: 8 (timestamp) + 8 (value) = 16 bytes
- Compressed: ~0.5 (timestamp) + ~1.0 (value) = ~1.5 bytes per point
- Compression ratio: ~10x for typical metrics data

**Why This Works for Time Series**:
- Regular timestamps -> delta-of-delta is near-zero
- Slowly changing values -> XOR bits are mostly identical
- Other data types (random values, strings) compress much worse`
      },
      {
        question: 'How does the write path work for high throughput?',
        answer: `**LSM-Tree Write Path**:

**Step 1 - WAL + Memory Buffer**:
\`\`\`
Incoming data point -> Append to WAL (sequential disk write, ~1us)
                    -> Insert into in-memory buffer (sorted by series + time)
\`\`\`
- WAL ensures durability: if process crashes, replay WAL on restart
- Memory buffer: typically 256MB-1GB, holds minutes of data
- No disk seeks on write path -> can sustain millions of points/sec

**Step 2 - Flush to Disk (every few minutes or when buffer is full)**:
- Serialize buffer into an immutable SST (Sorted String Table) file
- Each SST file covers one time shard and contains columnar, compressed data
- New empty buffer starts accepting writes (double-buffering)

**Step 3 - Background Compaction**:
- Many small SST files accumulate over time
- Compaction merges them into fewer, larger files
- Removes any out-of-order data by re-sorting
- Applies Gorilla compression to the merged data

**Why This is Fast**:
- Writes are sequential (append to WAL, insert to sorted buffer): no random I/O
- No index updates on write (unlike B-tree): just append
- Compression happens during flush (batch operation), not per-write
- Single node can sustain 10M+ points/sec with SSD storage

**Batch Ingestion Optimization**:
- Clients send batches of 100-1000 points per request
- Server parses batch, inserts all points into buffer in one operation
- Amortizes network and parsing overhead across many points`
      },
      {
        question: 'How does downsampling and retention work?',
        answer: `**Time-Based Partitioning Enables Simple Retention**:

**Partition Strategy**:
\`\`\`
data/
  shard_2024-06-01/  -- all data for June 1
  shard_2024-06-02/  -- all data for June 2
  ...
  shard_2024-06-30/
\`\`\`

**Retention Policy**: "Keep raw data for 30 days"
- Implementation: \`rm -rf shard_older_than_30_days\`
- O(1) operation regardless of data volume!
- No expensive DELETE queries, no vacuum/compaction needed

**Downsampling Pipeline**:
1. Raw data: every 10 seconds (full resolution)
2. After 7 days: downsample to 1-minute aggregates (min, max, avg, count)
3. After 30 days: downsample to 1-hour aggregates
4. After 1 year: downsample to 1-day aggregates

**Implementation**:
- Background worker reads raw shard for day N-7
- Computes 1-minute rollups: GROUP BY series, floor(timestamp, 1m)
- Writes rollups to separate rollup table/shard
- Raw shard can then be deleted (or moved to cold storage)

**Query Routing**:
- Query for last 1 hour: read from raw data (full resolution)
- Query for last 7 days: read from 1-minute rollups
- Query for last year: read from 1-hour rollups
- Query engine automatically picks the appropriate resolution

**Storage Savings**:
- 1 year of raw data at 10s interval: 3.15M points per series
- 1-minute rollups: 525K points per series (6x reduction)
- 1-hour rollups: 8.7K points per series (360x reduction)
- 1-day rollups: 365 points per series (8,630x reduction)`
      }
    ],

    requirements: ['High write throughput', 'Time-range queries', 'Tag-based filtering', 'Compression', 'Downsampling', 'Retention policies'],
    components: ['Write-Ahead Log', 'In-Memory Buffer', 'LSM-Tree Storage Engine', 'Columnar Compressor (Gorilla)', 'Inverted Tag Index', 'Downsampling Worker', 'Query Engine'],
    keyDecisions: [
      'LSM-tree storage engine for sequential write performance (millions of points/sec)',
      'Gorilla compression (delta-of-delta + XOR) for 10-20x compression ratio',
      'Time-based sharding for O(1) retention policy enforcement (delete shard = delete directory)',
      'Inverted tag index with Roaring Bitmaps for fast series filtering',
      'Multi-resolution downsampling for efficient long-range queries',
      'Query engine auto-selects resolution based on query time range'
    ],

    edgeCases: [
      { scenario: 'Late-arriving data points with timestamps far in the past', impact: 'Already-compacted time windows need reopening, breaking immutable segment assumptions', mitigation: 'Buffer window for late data (e.g., 1 hour), write late points to a separate out-of-order segment merged during compaction' },
      { scenario: 'High-cardinality labels (e.g., user_id as a tag) explode the index', impact: 'Inverted index grows unbounded, memory exhaustion, slow queries', mitigation: 'Enforce cardinality limits per metric, reject or drop high-cardinality labels, use bloom filters for existence checks' },
      { scenario: 'Clock skew between data sources sending metrics', impact: 'Out-of-order writes within the same time series cause incorrect aggregations', mitigation: 'Accept writes within a configurable disorder window, sort within ingestion buffer before flush' },
      { scenario: 'Query spans years of data across thousands of series', impact: 'Query exhausts memory or times out scanning massive data ranges', mitigation: 'Auto-select downsampled resolution for large ranges, enforce query time/series limits, use pre-computed rollups' },
      { scenario: 'Retention policy deletes data still referenced by active dashboards', impact: 'Dashboard queries return gaps or errors for deleted time ranges', mitigation: 'Soft-delete with grace period, notify dashboard owners before deletion, support tiered storage (hot/warm/cold) instead of hard delete' },
    ],
    tradeoffs: [
      { decision: 'Write-optimized LSM tree vs read-optimized B-tree storage', pros: 'LSM handles high write throughput; B-tree gives faster point queries', cons: 'LSM has write amplification during compaction; B-tree has slower bulk inserts', recommendation: 'LSM-tree based storage (like Prometheus TSDB) optimized for append-heavy time series workloads' },
      { decision: 'Pull-based vs push-based metric collection', pros: 'Pull (Prometheus-style) gives central control; push (StatsD-style) works behind firewalls', cons: 'Pull requires service discovery and network access; push can overwhelm the receiver', recommendation: 'Pull-based for infrastructure metrics, push-based for short-lived jobs and serverless functions' },
      { decision: 'Pre-computed rollups vs query-time aggregation', pros: 'Pre-computed is fast for dashboards; query-time is flexible for ad-hoc queries', cons: 'Pre-computed wastes storage on unused aggregations; query-time is slow for large ranges', recommendation: 'Pre-compute common rollups (1m, 5m, 1h) on write path, support query-time aggregation for ad-hoc analysis' },
      { decision: 'Single-node vs distributed time series storage', pros: 'Single-node is simple with no coordination overhead; distributed handles larger scale', cons: 'Single-node has capacity limits; distributed adds complexity for cross-shard queries', recommendation: 'Start single-node, shard by metric name hash when capacity requires it' },
    ],
    layeredDesign: [
      { name: 'Ingestion Layer', purpose: 'Receive and buffer high-throughput metric data points', components: ['Push/Pull Collector', 'Write Buffer', 'Label Validator', 'Cardinality Enforcer'] },
      { name: 'Storage Engine Layer', purpose: 'Compress and persist time series data efficiently', components: ['LSM-Tree Engine', 'Compaction Manager', 'Chunk Encoder (Gorilla compression)', 'Retention Manager'] },
      { name: 'Query Engine Layer', purpose: 'Execute time-range queries with aggregation and filtering', components: ['Query Parser (PromQL-like)', 'Resolution Selector', 'Series Scanner', 'Aggregation Engine'] },
      { name: 'Index & Metadata Layer', purpose: 'Fast series lookup by labels and metric names', components: ['Inverted Index', 'Label Index', 'Bloom Filters', 'Series Registry'] },
    ],
  },

  // ─── 16. Distributed Lock ──────────────────────────────────────────
  {
    id: 'distributed-lock',
    isNew: true,
    title: 'Distributed Locking Service',
    subtitle: 'ZooKeeper / etcd',
    icon: 'lock',
    color: '#7c3aed',
    difficulty: 'Medium',
    description: 'Design a distributed locking service that provides mutual exclusion across processes and machines in a distributed system.',

    introduction: `Distributed locks enable mutual exclusion across multiple processes running on different machines -- a fundamental primitive for coordinating distributed systems. Use cases include: preventing double-processing of a job, ensuring only one instance modifies a shared resource, leader election, and rate-limiting distributed workers.

Unlike in-process locks (mutexes), distributed locks must handle partial failures: the lock holder can crash, the network can partition, and the lock service itself must be replicated for availability. The most dangerous failure mode is a "split-brain" where two processes both believe they hold the lock.

The key insight is that a correct distributed lock requires a consensus protocol (Paxos, Raft, ZAB) at its core. Simple approaches using a single Redis instance or database row can fail under network partitions. Martin Kleppmann's analysis of Redis Redlock highlights these subtleties.`,

    functionalRequirements: [
      'Acquire a named lock (blocking or non-blocking)',
      'Release a lock',
      'Lock with TTL (automatic release if holder crashes)',
      'Lock renewal (extend TTL while still holding)',
      'Fencing tokens: monotonically increasing tokens to prevent stale lock holders',
      'Fair locking: waiters served in FIFO order',
      'Read-write locks: multiple readers OR single writer',
      'Lock contention metrics and monitoring'
    ],

    nonFunctionalRequirements: [
      'Mutual exclusion guarantee (safety): at most one holder at any time',
      'Liveness: locks are eventually released even if holder crashes',
      'Lock acquisition latency < 10ms (uncontended)',
      '99.99% availability',
      'Survive minority node failures (up to N/2 - 1 in a 2N+1 cluster)',
      'No split-brain: network partition must not result in two holders'
    ],

    estimation: {
      users: 'All services in the organization needing coordination',
      storage: 'Minimal: lock state ~1KB per lock * 100K active locks = ~100MB',
      bandwidth: '~1Gbps (small payloads, high request rate)',
      qps: '~50K lock operations/sec (acquire, release, renew)'
    },

    apiDesign: {
      description: 'Simple lock/unlock API with fencing token support',
      endpoints: [
        { method: 'POST', path: '/api/locks/:name/acquire', params: '{ ttl_ms, owner_id, wait_timeout_ms? }', response: '{ lockId, fencingToken, expiresAt } or 409 Conflict' },
        { method: 'POST', path: '/api/locks/:name/release', params: '{ lockId, fencingToken }', response: '200 { released: true }' },
        { method: 'POST', path: '/api/locks/:name/renew', params: '{ lockId, ttl_ms }', response: '200 { expiresAt } or 404 (lock expired)' },
        { method: 'GET', path: '/api/locks/:name', params: '', response: '{ isLocked, owner_id, fencingToken, expiresAt }' }
      ]
    },

    dataModel: {
      description: 'Lock state stored in replicated state machine',
      schema: `-- Replicated via Raft consensus
locks {
  name: varchar PK
  owner_id: varchar  -- who holds the lock
  lock_id: uuid  -- unique per acquisition
  fencing_token: bigint  -- monotonically increasing, incremented on each acquisition
  ttl_ms: int
  acquired_at: timestamp
  expires_at: timestamp
  waiters: queue<{owner_id, wait_started}>  -- FIFO queue of waiters
}

-- Raft cluster state
raft_state {
  current_term: bigint
  voted_for: node_id nullable
  log: [{index, term, command}]  -- replicated log of lock operations
  commit_index: bigint
  last_applied: bigint
}

-- Fencing token usage (client-side protocol)
-- When accessing shared resource:
--   1. Acquire lock -> get fencing_token = 42
--   2. Include fencing_token in all writes to shared resource
--   3. Shared resource rejects writes with token < last_seen_token
--   4. Prevents stale lock holder (with token 41) from corrupting data`,
      examples: [
        { table: 'locks', label: 'Acquired distributed lock on payment processing', json: `{ "name": "payment:order-8291", "owner_id": "worker-03", "lock_id": "a7b8c9d0-1e2f-4a3b-5c6d-7e8f9a0b1c2d", "fencing_token": 42, "ttl_ms": 30000, "acquired_at": "2025-04-18T10:15:30Z", "expires_at": "2025-04-18T10:16:00Z", "waiters": [{"owner_id": "worker-07", "wait_started": "2025-04-18T10:15:31Z"}] }` },
        { table: 'raft_state', label: 'Raft cluster state on leader node', json: `{ "current_term": 18, "voted_for": "node-2", "log": [{"index": 156, "term": 18, "command": "ACQUIRE payment:order-8291 worker-03"}, {"index": 157, "term": 18, "command": "RELEASE inventory:sku-4420 worker-01"}], "commit_index": 157, "last_applied": 157 }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Lock with Redis SETNX',
      diagramSrc: '/diagrams/distributed-lock/impl-basic.png',
      description: 'Use Redis SETNX (SET if Not eXists) to acquire a lock. SET key with TTL for auto-release. Delete key to release.',
      problems: [
        'Single Redis instance: if it crashes, all locks are lost',
        'No fencing token: stale lock holder can still write to shared resource after lock expires',
        'Clock drift: TTL-based expiration depends on Redis server clock accuracy',
        'Redlock (multi-node Redis): vulnerable to timing issues during network partitions'
      ]
    },

    advancedImplementation: {
      title: 'Consensus-Based Lock Service (ZooKeeper / etcd)',
      diagramSrc: '/diagrams/distributed-lock/impl-advanced.png',
      description: 'Lock state is stored in a Raft-replicated state machine. Lock acquisition is a Raft log entry that requires majority consensus. Fencing tokens are Raft log indices (monotonically increasing by design). Session-based locking with heartbeats: client maintains a session with the lock service, and locks are automatically released if the session expires (no heartbeat received).',
      keyPoints: [
        'Raft consensus ensures lock state survives minority failures (2 of 5 nodes can fail)',
        'Fencing tokens = Raft log index: guaranteed monotonically increasing, no clock dependency',
        'Session-based locking: client session has a TTL, must send heartbeats to renew',
        'If session expires (client crash or network partition): all locks held by that session are released',
        'Watch mechanism: waiters register a watch on the lock; notified immediately when lock is released',
        'Ephemeral nodes (ZooKeeper): lock represented as a node that is auto-deleted when session ends'
      ],
      databaseChoice: 'Raft-replicated state machine (embedded, not external DB); persistent WAL on each node for crash recovery; in-memory state machine for fast reads',
      caching: 'Leader node serves reads directly (linearizable with ReadIndex or LeaseRead optimization); follower reads allowed for non-critical monitoring queries'
    },

    tips: [
      'Start by explaining WHY distributed locks are hard: partial failures and network partitions',
      'Fencing tokens are the key safety mechanism: explain the stale-lock-holder problem',
      'Contrast Redis-based locking (simpler, weaker) with consensus-based (stronger, more complex)',
      'Discuss the trade-off between lock TTL length and time-to-detect failures',
      'Mention practical concerns: lock contention monitoring, deadlock detection, fairness',
      'Leader election is a closely related problem: discuss the connection'
    ],

    keyQuestions: [
      {
        question: 'Why is a simple Redis lock insufficient and what are fencing tokens?',
        answer: `**The Stale Lock Holder Problem**:
\`\`\`
Time 0: Client A acquires lock (TTL=30s)
Time 0: Client A starts long GC pause (or network issue)
Time 31: Lock expires (TTL elapsed, A is still paused)
Time 32: Client B acquires lock, starts writing to shared resource
Time 33: Client A wakes up, STILL THINKS it holds the lock
Time 33: Client A writes to shared resource -> DATA CORRUPTION
\`\`\`

**Why TTL Alone Doesn't Work**:
- Client A has no way to know its lock expired while it was paused
- From A's perspective, it acquired the lock and never released it
- This is a fundamental issue with any TTL-based lock without fencing

**Fencing Token Solution**:
\`\`\`
Client A acquires lock -> fencing_token = 33
Client B acquires lock (after A's expires) -> fencing_token = 34

Client A wakes up, writes to storage with token=33
Storage sees: last_accepted_token = 34, received = 33
33 < 34 -> REJECTED (stale lock holder detected)
\`\`\`

**Why This Works**:
- Fencing tokens are monotonically increasing (guaranteed by Raft log index)
- The shared resource (database, file system) checks the token on every write
- A stale holder always has a lower token than the current holder
- This provides safety EVEN IF the lock service itself makes a mistake`
      },
      {
        question: 'How does session-based locking work?',
        answer: `**Session Lifecycle**:

**Creation**:
- Client connects to lock service, receives sessionId
- Session has a TTL (e.g., 30 seconds)
- Client must send heartbeats every TTL/3 (10 seconds) to keep session alive

**Lock Acquisition**:
- Lock is associated with a session, not just a client ID
- If session expires -> all locks held by that session are automatically released
- This handles the "client crashes while holding lock" problem

**Session Expiration**:
\`\`\`
Client A: session TTL=30s, heartbeat every 10s
Time 0:  Heartbeat received, session renewed until T+30
Time 10: Heartbeat received, session renewed until T+40
Time 20: Client A crashes (no more heartbeats)
Time 40: Session expires on server (20s since last heartbeat)
Time 40: All of Client A's locks released
Time 40: Waiters notified, next in queue acquires lock
\`\`\`

**ZooKeeper Ephemeral Nodes**:
- Lock = ephemeral znode: /locks/my-resource/lock-0000000042
- Ephemeral = automatically deleted when the creating session ends
- Sequential = monotonically increasing suffix (natural fencing token!)
- Lock holder = client that created the znode with the LOWEST sequence number

**Fair Locking with Sequential Nodes**:
1. Client creates sequential ephemeral node: /locks/res/lock-0000000042
2. Client reads all children of /locks/res/
3. If my node is the lowest: I hold the lock
4. If not: watch the node just before mine (not ALL nodes -- avoids herd effect)
5. When watched node is deleted: re-check if I'm now the lowest`
      },
      {
        question: 'How does the Raft consensus protocol ensure correctness?',
        answer: `**Raft for Distributed Locks**:

**Cluster Setup**: 5 nodes (tolerates 2 failures)
- 1 Leader: handles all writes (lock acquire/release)
- 4 Followers: replicate leader's log

**Lock Acquisition Flow**:
1. Client sends ACQUIRE to leader
2. Leader appends to log: { term: 5, index: 142, cmd: ACQUIRE("my-lock", clientA) }
3. Leader replicates to followers (parallel RPCs)
4. 3 of 5 nodes acknowledge (majority) -> committed
5. Leader applies to state machine: lock acquired, fencing_token = 142
6. Leader responds to client: { fencingToken: 142, expiresAt: ... }

**Safety Guarantee**:
- Log entry 142 is committed -> it will never be undone
- Even if leader crashes after commit, new leader has the entry (majority has it)
- Fencing token = log index 142: guaranteed unique and increasing

**Leader Failure Handling**:
1. Leader crashes after committing but before responding to client
2. Client times out, retries with same idempotency key
3. New leader elected (has the committed entry)
4. Retry detected: returns original result (idempotent)

**Network Partition**:
- Minority partition: cannot form majority, cannot acquire locks (safe)
- Majority partition: continues operating normally
- When partition heals: minority nodes catch up from majority
- NO split-brain: lock can only be acquired through majority consensus

**Read Optimization (ReadIndex)**:
- Client wants to check lock status (read-only)
- Leader confirms it's still leader (one round of heartbeats)
- Then reads directly from state machine (no log replication needed)
- Provides linearizable reads without full Raft round-trip`
      }
    ],

    requirements: ['Mutual exclusion', 'Fault tolerance', 'Fencing tokens', 'Session management', 'Fair queuing', 'Auto-release on failure'],
    components: ['Raft Consensus Group (5 nodes)', 'Session Manager', 'Lock State Machine', 'Watch/Notification System', 'Client Library'],
    keyDecisions: [
      'Raft consensus for correct mutual exclusion even during network partitions',
      'Fencing tokens (Raft log indices) to prevent stale lock holders from corrupting data',
      'Session-based locking with heartbeats for automatic release on client failure',
      'Sequential ephemeral nodes for fair FIFO lock queuing',
      'Watch mechanism for efficient notification of waiters (no polling)',
      'ReadIndex optimization for low-latency lock status queries'
    ],

    edgeCases: [
      { scenario: 'Lock holder process crashes without releasing the lock', impact: 'Resource is permanently locked, blocking all other consumers (deadlock)', mitigation: 'TTL-based auto-expiration on all locks; lock holder must renew lease before TTL expires via background thread' },
      { scenario: 'GC pause causes lock holder to miss lease renewal', impact: 'Lock expires and another process acquires it while original holder still believes it holds the lock', mitigation: 'Fencing tokens: monotonically increasing token issued with each lock grant, resource validates token before accepting writes' },
      { scenario: 'Network partition splits lock service nodes', impact: 'Split-brain: both partitions may grant the same lock to different clients', mitigation: 'Require majority quorum (Redlock algorithm) or use consensus-based system (etcd/ZooKeeper) that refuses writes without quorum' },
      { scenario: 'Clock skew between lock service nodes', impact: 'TTL expiration happens at different times on different nodes, causing premature or delayed release', mitigation: 'Use logical clocks or lease-based approach where leader alone tracks expiration, avoid relying on wall clocks' },
      { scenario: 'Thundering herd when a popular lock is released', impact: 'All waiting clients simultaneously retry, overloading the lock service', mitigation: 'Use fair queuing (FIFO waiters list) and notify only the next waiter, not all waiters' },
    ],
    tradeoffs: [
      { decision: 'Redis-based (Redlock) vs consensus-based (ZooKeeper/etcd) locks', pros: 'Redis is fast and simple; consensus-based provides stronger correctness guarantees', cons: 'Redis lacks true consensus under partitions; ZooKeeper/etcd adds operational complexity', recommendation: 'etcd/ZooKeeper for critical locks (financial, inventory); Redis for advisory locks where brief overlap is tolerable' },
      { decision: 'TTL-based expiration vs explicit release only', pros: 'TTL prevents permanent deadlocks; explicit release is precise', cons: 'TTL can release too early if holder is slow; explicit release fails if holder crashes', recommendation: 'TTL with renewal (lease pattern): short TTL (10-30s) with active renewal by holder' },
      { decision: 'Blocking wait vs spin/retry for lock acquisition', pros: 'Blocking is efficient (no wasted CPU); spin/retry is simpler to implement', cons: 'Blocking requires watch/notification infrastructure; spin/retry wastes resources', recommendation: 'Blocking wait with watch notifications and a timeout to avoid indefinite blocking' },
    ],
    layeredDesign: [
      { name: 'Client SDK Layer', purpose: 'Provide simple lock/unlock API with automatic lease renewal', components: ['Lock Client SDK', 'Lease Renewal Thread', 'Fencing Token Manager', 'Retry/Backoff Logic'] },
      { name: 'Lock Coordination Layer', purpose: 'Manage lock state with distributed consensus', components: ['Lock Manager', 'Waiter Queue (FIFO)', 'Lease Tracker', 'Watch/Notification Engine'] },
      { name: 'Consensus Layer', purpose: 'Ensure consistent lock state across nodes', components: ['Raft/Paxos Consensus', 'Leader Election', 'Log Replication', 'Snapshot Manager'] },
      { name: 'Storage & Monitoring Layer', purpose: 'Persist lock state and provide operational visibility', components: ['Replicated State Machine', 'Audit Log', 'Metrics (lock contention, wait times)', 'Health Checker'] },
    ],
  },

  // ─── 17. Job Scheduler ─────────────────────────────────────────────
  {
    id: 'job-scheduler',
    isNew: true,
    title: 'Job Scheduler',
    subtitle: 'Cron / Airflow at Scale',
    icon: 'clock',
    color: '#8b5cf6',
    difficulty: 'Medium',
    description: 'Design a distributed job scheduling system that reliably executes tasks at specified times or on recurring schedules.',

    introduction: `Distributed job schedulers orchestrate the execution of millions of scheduled tasks across a fleet of worker machines. Unlike a simple cron daemon on a single server, a distributed scheduler must handle: tasks that must run exactly once (no duplicates, no misses), scheduling across time zones, complex dependencies between tasks, and recovery when workers fail mid-execution.

Common use cases include: periodic data pipeline jobs (ETL), scheduled report generation, system maintenance tasks (backups, cleanups), delayed message delivery (send email in 24 hours if user hasn't responded), and recurring billing operations.

The core challenge is the combination of strict timing requirements (task must fire at the scheduled time), exactly-once execution semantics (no duplicates even if the scheduler itself fails), and scale (millions of pending tasks with heterogeneous schedules).`,

    functionalRequirements: [
      'Schedule one-time tasks at a specific future time',
      'Schedule recurring tasks (cron expressions: every day at 3am, every 5 minutes)',
      'Task dependencies (run B only after A completes successfully)',
      'Task priority levels',
      'Retry with configurable policy (backoff, max retries)',
      'Task timeout and cancellation',
      'Monitoring: task status, execution history, failure alerts',
      'Distributed execution across a worker fleet'
    ],

    nonFunctionalRequirements: [
      'Scheduling accuracy: task fires within 1 second of scheduled time',
      'Exactly-once execution guarantee',
      'Support 100M+ pending scheduled tasks',
      '99.99% availability (missed scheduled task = data loss or SLA violation)',
      'Worker failures handled transparently (re-schedule on another worker)',
      'Horizontal scalability for both schedulers and workers'
    ],

    estimation: {
      users: 'All services in the organization',
      storage: '~1KB per task * 100M pending tasks = ~100GB',
      bandwidth: '~10Gbps (task payloads vary from 1KB to 1MB)',
      qps: '~50K tasks dispatched/sec at peak, ~10K task completions/sec'
    },

    apiDesign: {
      description: 'RESTful API for task management',
      endpoints: [
        { method: 'POST', path: '/api/tasks', params: '{ name, schedule (cron or timestamp), payload, priority, retryPolicy, timeout, dependencies[] }', response: '201 { taskId }' },
        { method: 'DELETE', path: '/api/tasks/:taskId', params: '', response: '200 { cancelled: true }' },
        { method: 'GET', path: '/api/tasks/:taskId', params: '', response: '{ taskId, status, lastRun, nextRun, history[] }' },
        { method: 'GET', path: '/api/tasks', params: 'status, schedule, cursor', response: '{ tasks[], nextCursor }' },
        { method: 'GET', path: '/api/tasks/:taskId/runs', params: 'cursor', response: '{ runs[{runId, status, startedAt, finishedAt, worker}] }' }
      ]
    },

    dataModel: {
      description: 'Task definitions, execution queue, and run history',
      schema: `tasks {
  id: uuid PK
  name: varchar
  type: enum(one_time, recurring)
  schedule: varchar  -- cron expression or ISO timestamp
  next_fire_time: timestamp  -- pre-computed, indexed
  payload: jsonb  -- task-specific data
  priority: int  -- higher = more important
  retry_policy: jsonb  -- { maxRetries, backoffMs, backoffMultiplier }
  timeout_ms: int
  status: enum(active, paused, completed, cancelled)
  created_by: varchar
  created_at: timestamp
}

task_runs {
  id: uuid PK
  task_id: uuid FK
  scheduled_for: timestamp
  started_at: timestamp nullable
  finished_at: timestamp nullable
  status: enum(pending, running, succeeded, failed, timed_out, retrying)
  worker_id: varchar nullable
  attempt: int
  error_message: text nullable
  execution_time_ms: int nullable
}

-- Worker heartbeat tracking
workers {
  id: varchar PK
  status: enum(active, draining, dead)
  current_tasks: int  -- number of running tasks
  capacity: int  -- max concurrent tasks
  last_heartbeat: timestamp
  tags: text[]  -- capabilities (e.g., "gpu", "high-memory")
}

task_dependencies {
  task_id: uuid FK
  depends_on_task_id: uuid FK
  PK(task_id, depends_on_task_id)
}`,
      examples: [
        { table: 'tasks', label: 'Recurring daily report generation task', json: `{ "id": "t-00a1b2c3", "name": "daily-sales-report", "type": "recurring", "schedule": "0 6 * * *", "next_fire_time": "2025-04-19T06:00:00Z", "payload": {"report_type": "sales", "format": "pdf", "recipients": ["team@acme.com"]}, "priority": 5, "retry_policy": {"maxRetries": 3, "backoffMs": 5000, "backoffMultiplier": 2}, "timeout_ms": 120000, "status": "active", "created_by": "admin", "created_at": "2025-01-15T09:00:00Z" }` },
        { table: 'task_runs', label: 'Completed task execution run', json: `{ "id": "run-7829", "task_id": "t-00a1b2c3", "scheduled_for": "2025-04-18T06:00:00Z", "started_at": "2025-04-18T06:00:02Z", "finished_at": "2025-04-18T06:00:47Z", "status": "succeeded", "worker_id": "worker-12", "attempt": 1, "error_message": null, "execution_time_ms": 45200 }` },
        { table: 'workers', label: 'Active worker with GPU capability', json: `{ "id": "worker-12", "status": "active", "current_tasks": 3, "capacity": 8, "last_heartbeat": "2025-04-18T10:14:58Z", "tags": ["gpu", "high-memory"] }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Scheduler',
      diagramSrc: '/diagrams/job-scheduler/impl-basic.png',
      description: 'A single scheduler process polls the database every second for tasks with next_fire_time <= now. It picks tasks and dispatches them to workers via a message queue.',
      problems: [
        'Single scheduler is a single point of failure',
        'Polling every second: tasks with sub-second precision are impossible',
        'Database polling at scale (100M tasks) is expensive even with indexes',
        'No exactly-once guarantee: scheduler crash after dispatch but before marking as running = duplicate'
      ]
    },

    advancedImplementation: {
      title: 'Partitioned Scheduler with Time-Wheel and Exactly-Once Execution',
      diagramSrc: '/diagrams/job-scheduler/impl-advanced.png',
      description: 'Multiple scheduler instances partition the task space by consistent hashing of task IDs. Each scheduler uses a hierarchical time wheel for efficient timer management. Tasks are dispatched to workers via a durable message queue with exactly-once semantics. Workers send heartbeats; if a worker dies, its tasks are re-dispatched to healthy workers.',
      keyPoints: [
        'Partitioned scheduling: tasks assigned to scheduler instances by consistent hash, avoiding duplicate dispatch',
        'Hierarchical time wheel: O(1) insert/fire for scheduled tasks (vs O(log N) for priority queue)',
        'Durable dispatch: task dispatch is a transactional operation (update DB + enqueue atomically)',
        'Worker lease: each task run has a lease (TTL); worker must renew lease periodically or task is re-dispatched',
        'Exactly-once: combination of DB-level task state machine + idempotent worker execution',
        'Recurring task: after completion, scheduler computes next_fire_time from cron expression and re-inserts into time wheel'
      ],
      databaseChoice: 'PostgreSQL for task definitions and run history; Redis for time wheel and worker heartbeats; Kafka for durable task dispatch queue',
      caching: 'Time wheel is an in-memory data structure for fast timer management; active tasks cached in scheduler memory; worker capacity cached for dispatch decisions'
    },

    tips: [
      'Exactly-once execution is the hardest guarantee: discuss the state machine approach',
      'The time wheel data structure is a great depth point: explain the hierarchical variant',
      'Discuss what happens when a scheduler instance fails: partition reassignment',
      'Worker failure detection via heartbeats + lease-based task timeout',
      'Cron expression parsing and next-fire-time computation is a detail worth mentioning',
      'Task dependencies create a DAG execution problem: discuss topological ordering'
    ],

    keyQuestions: [
      {
        question: 'How do you guarantee exactly-once task execution?',
        answer: `**State Machine Approach**:

**Task Run States**: pending -> claimed -> running -> succeeded/failed

**Claim Protocol** (prevents duplicate dispatch):
\`\`\`sql
-- Atomic claim: only one scheduler can claim a task run
UPDATE task_runs
SET status = 'claimed', worker_id = 'worker-42', started_at = now()
WHERE id = 'run-123' AND status = 'pending'
-- If 0 rows affected: someone else claimed it (skip)
-- If 1 row affected: we own it (dispatch to worker)
\`\`\`

**Worker Lease Protocol** (handles worker failure):
- Worker receives task, starts execution
- Worker sends heartbeat every 10 seconds: "I'm still working on run-123"
- Server extends lease: run-123 expires at now + 30 seconds
- If no heartbeat in 30 seconds: task run marked as "timed_out", re-dispatched

**Idempotent Execution** (belt and suspenders):
- Each task run has a unique run_id
- Worker includes run_id in all side effects (database writes, API calls)
- Side-effect targets check for duplicate run_id: if seen, skip
- Even if a task accidentally runs twice, it produces the same result

**End-to-End Flow**:
1. Scheduler fires task -> inserts task_run (status: pending)
2. Scheduler claims task_run (atomic UPDATE)
3. Dispatcher sends to Kafka with run_id
4. Worker receives, executes with run_id for idempotency
5. Worker reports completion -> task_run status: succeeded
6. If worker dies: lease expires -> new task_run created (new attempt, same task)`
      },
      {
        question: 'How does the hierarchical time wheel work?',
        answer: `**Basic Time Wheel**:
- Circular array of N buckets, each representing a time slot
- Current time pointer advances every tick (e.g., every 100ms)
- Tasks in the current bucket are fired
- Insert: compute bucket = (fire_time / tick_size) % N -> O(1)
- Fire: process all tasks in current bucket -> O(tasks in bucket)

**Problem**: for large time ranges, need huge array
- 1-second granularity, 1-year range = 31M buckets (wasteful)

**Hierarchical Time Wheel** (like a clock with hours/minutes/seconds):
\`\`\`
Level 0 (seconds):  60 buckets, 1-second tick
Level 1 (minutes):  60 buckets, 1-minute tick
Level 2 (hours):    24 buckets, 1-hour tick
Level 3 (days):     365 buckets, 1-day tick
\`\`\`

**Insert Task "fire in 3 hours 25 minutes 10 seconds"**:
- Place in Level 2, bucket (current_hour + 3) % 24

**When Level 2 bucket fires (3 hours later)**:
- "Cascade down": move tasks to Level 1 (minute wheel)
- Task goes to Level 1, bucket 25

**When Level 1 bucket fires (25 minutes later)**:
- Cascade to Level 0 (second wheel)
- Task goes to Level 0, bucket 10

**When Level 0 bucket fires (10 seconds later)**:
- Task is dispatched to worker

**Complexity**:
- Insert: O(1) (compute which level and bucket, append)
- Fire: O(tasks in bucket) (no scanning)
- Total buckets: 60 + 60 + 24 + 365 = 509 (vs 31M for flat array)
- Memory: trivial (509 bucket headers)`
      },
      {
        question: 'How do you handle task dependencies?',
        answer: `**DAG-Based Dependency Resolution**:

**Modeling Dependencies**:
\`\`\`
Task A (extract data) -> Task B (transform) -> Task C (load)
                     \\-> Task D (validate) -/
\`\`\`
- This is a Directed Acyclic Graph (DAG)
- Task C runs only after both B and D complete

**Execution Protocol**:
1. When a task completes, check all tasks that depend on it
2. For each dependent task: are ALL its dependencies now complete?
3. If yes: task is now "ready" -> add to dispatch queue
4. If no: wait for remaining dependencies

**Implementation**:
\`\`\`sql
-- On task B completion:
SELECT t.id FROM tasks t
JOIN task_dependencies td ON td.task_id = t.id
WHERE td.depends_on_task_id = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM task_dependencies td2
    JOIN task_runs tr ON tr.task_id = td2.depends_on_task_id
    WHERE td2.task_id = t.id
      AND tr.status != 'succeeded'
  )
-- Returns tasks whose ALL dependencies have succeeded
\`\`\`

**Failure Propagation**:
- If Task B fails: what happens to C and D?
- Option 1: "Fail fast" -- mark all downstream tasks as failed
- Option 2: "Best effort" -- only run tasks whose dependencies all succeeded, skip others
- Option 3: "Retry" -- retry B per its retry policy, only fail downstream after max retries

**Cycle Detection**:
- On task creation, validate that adding the dependency doesn't create a cycle
- Topological sort of the DAG: if sort fails (cycle detected), reject the task definition
- This is checked at task creation time, not execution time`
      }
    ],

    requirements: ['Scheduled execution', 'Recurring tasks (cron)', 'Exactly-once guarantee', 'Task dependencies', 'Retry policies', 'Worker fleet management'],
    components: ['Scheduler Instances (partitioned)', 'Time Wheel', 'PostgreSQL (task store)', 'Kafka (dispatch queue)', 'Worker Fleet', 'Redis (heartbeats)'],
    keyDecisions: [
      'Partitioned scheduling via consistent hashing to prevent duplicate dispatch',
      'Hierarchical time wheel for O(1) timer management across large time ranges',
      'Atomic claim protocol (DB update) + worker lease for exactly-once execution',
      'Idempotent worker execution with unique run_id for safety under retries',
      'DAG-based dependency resolution with topological ordering',
      'Worker heartbeat + lease expiration for transparent failure handling'
    ],

    edgeCases: [
      { scenario: 'Job scheduled for exact time a worker node fails', impact: 'Job is lost or executed twice if recovery assigns it to another worker', mitigation: 'Use lease-based ownership with heartbeats; missed heartbeat triggers reassignment with idempotency checks' },
      { scenario: 'Cron job takes longer than its interval to complete', impact: 'Overlapping executions cause resource contention or data corruption', mitigation: 'Enforce run-once semantics with distributed lock per job, skip or queue subsequent triggers' },
      { scenario: 'Massive backlog of delayed jobs after scheduler outage', impact: 'Thundering herd when scheduler recovers, overwhelming downstream services', mitigation: 'Gradual backlog drain with rate limiting, prioritize by job age and priority, shed expired jobs' },
      { scenario: 'Circular dependency in job DAG', impact: 'Deadlock where jobs wait on each other indefinitely, consuming queue slots', mitigation: 'Validate DAG at submission time with cycle detection, reject circular dependencies upfront' },
      { scenario: 'Clock skew between scheduler nodes causes duplicate or missed triggers', impact: 'Jobs fire at wrong times or fire multiple times across nodes', mitigation: 'Use a single leader for cron evaluation with NTP-synchronized clocks, heartbeat-based leader election' },
    ],
    tradeoffs: [
      { decision: 'Push-based vs pull-based job distribution', pros: 'Push gives lower latency; pull gives natural load balancing', cons: 'Push can overwhelm slow workers; pull has polling overhead', recommendation: 'Pull-based with long polling for natural backpressure and worker self-selection by capability' },
      { decision: 'At-least-once vs exactly-once execution', pros: 'At-least-once is simple and reliable; exactly-once prevents side effects', cons: 'At-least-once requires idempotent jobs; exactly-once is extremely hard to guarantee', recommendation: 'At-least-once delivery with idempotency keys, making jobs safe to retry' },
      { decision: 'Priority queue vs FIFO queue', pros: 'Priority queue ensures critical jobs run first; FIFO is fair and simple', cons: 'Priority queue can starve low-priority jobs; FIFO ignores urgency', recommendation: 'Multi-level priority queues with aging to prevent starvation of low-priority jobs' },
      { decision: 'Centralized scheduler vs distributed scheduling', pros: 'Centralized is easier to reason about ordering; distributed scales better', cons: 'Centralized is a single point of failure; distributed has coordination overhead', recommendation: 'Leader-elected centralized scheduler with hot standby for fast failover' },
    ],
    layeredDesign: [
      { name: 'API & Submission Layer', purpose: 'Accept job definitions, schedules, and DAG specifications', components: ['Job Submission API', 'DAG Validator', 'Cron Parser', 'Schedule Registry'] },
      { name: 'Scheduling Layer', purpose: 'Determine when and where jobs should run', components: ['Cron Evaluator', 'Priority Queue', 'Dependency Resolver', 'Leader Election'] },
      { name: 'Execution Layer', purpose: 'Run jobs on distributed workers with monitoring', components: ['Worker Pool', 'Job Executor', 'Heartbeat Monitor', 'Retry Handler'] },
      { name: 'Data & Observability Layer', purpose: 'Store job state and provide operational visibility', components: ['PostgreSQL (job metadata)', 'Redis (queues, locks)', 'Logging Pipeline', 'Metrics Dashboard'] },
    ],
  },

  // ─── 18. CI/CD Pipeline ────────────────────────────────────────────
  {
    id: 'ci-cd-pipeline',
    isNew: true,
    title: 'CI/CD Pipeline',
    subtitle: 'GitHub Actions / Jenkins',
    icon: 'gitBranch',
    color: '#2563eb',
    difficulty: 'Medium',
    description: 'Design a continuous integration and deployment system that builds, tests, and deploys code changes automatically.',

    introduction: `CI/CD (Continuous Integration / Continuous Deployment) systems are the backbone of modern software development, automatically building, testing, and deploying every code change. Systems like GitHub Actions, Jenkins, and GitLab CI process millions of pipeline runs per day, each involving multiple stages of compilation, testing, artifact creation, and deployment.

The core challenge is orchestrating complex, multi-stage workflows where each stage may have different resource requirements (a Rust compilation needs lots of CPU and RAM; a Selenium test needs a browser environment), stages have dependencies (don't deploy if tests fail), and the system must scale to handle bursts of activity (Monday morning when everyone pushes their weekend work).

Key architectural decisions include: ephemeral vs. persistent build environments (containers vs. VMs vs. bare metal), artifact management and caching (recompiling unchanged dependencies is wasteful), secret management (builds need access to private registries and deployment credentials), and the build queue scheduling problem (prioritizing certain pipelines over others).`,

    functionalRequirements: [
      'Define multi-stage pipelines via configuration file (YAML)',
      'Trigger pipelines on events (push, PR, tag, schedule, manual)',
      'Execute stages sequentially or in parallel based on dependencies',
      'Provide isolated build environments (containers or VMs)',
      'Cache dependencies and build artifacts between runs',
      'Stream build logs in real-time',
      'Manage secrets and environment variables securely',
      'Support matrix builds (test across multiple OS/language versions)'
    ],

    nonFunctionalRequirements: [
      'Pipeline start latency < 30 seconds after trigger',
      'Support 100K+ concurrent pipeline runs',
      'Build logs available within 1 second of generation',
      '99.95% availability',
      'Secrets never exposed in logs or artifacts',
      'Build environment isolation: one pipeline cannot affect another'
    ],

    estimation: {
      users: '1M developers, 10M repositories',
      storage: '~100MB avg artifacts per run * 10M runs/day = ~1PB/day (with retention policies)',
      bandwidth: '~10Tbps peak (pulling Docker images, dependencies, pushing artifacts)',
      qps: '~50K pipeline triggers/day peak, ~500K stage executions/day'
    },

    apiDesign: {
      description: 'REST API for pipeline management, WebSocket for real-time logs',
      endpoints: [
        { method: 'POST', path: '/api/pipelines/:repo/runs', params: '{ branch, commitSha, triggerType }', response: '201 { runId, status: queued }' },
        { method: 'GET', path: '/api/runs/:runId', params: '', response: '{ runId, status, stages[{name, status, duration}], triggeredBy }' },
        { method: 'GET', path: '/api/runs/:runId/stages/:stageId/logs', params: 'offset?', response: '{ lines[], nextOffset }' },
        { method: 'WS', path: '/ws/runs/:runId/logs', params: '', response: 'Stream: log lines in real-time' },
        { method: 'POST', path: '/api/runs/:runId/cancel', params: '', response: '200 { status: cancelling }' },
        { method: 'POST', path: '/api/pipelines/:repo/secrets', params: '{ name, value }', response: '201 { secretId }' }
      ]
    },

    dataModel: {
      description: 'Pipeline definitions, runs, stages, and artifacts',
      schema: `pipeline_configs {
  id: bigint PK
  repo_id: bigint FK
  branch: varchar
  config_yaml: text  -- the pipeline definition
  triggers: jsonb  -- { push: {branches: ["main"]}, pr: true, schedule: "0 0 * * *" }
  created_at: timestamp
}

pipeline_runs {
  id: uuid PK
  pipeline_id: bigint FK
  commit_sha: varchar(40)
  branch: varchar
  status: enum(queued, running, succeeded, failed, cancelled)
  trigger_type: enum(push, pr, tag, schedule, manual)
  triggered_by: varchar
  started_at: timestamp nullable
  finished_at: timestamp nullable
  duration_ms: int nullable
}

stages {
  id: uuid PK
  run_id: uuid FK
  name: varchar
  status: enum(pending, running, succeeded, failed, skipped, cancelled)
  image: varchar  -- Docker image for execution environment
  commands: text[]
  depends_on: uuid[]  -- stage IDs that must complete first
  started_at: timestamp nullable
  finished_at: timestamp nullable
  worker_id: varchar nullable
  cache_key: varchar  -- for dependency caching
}

artifacts {
  id: uuid PK
  run_id: uuid FK
  stage_id: uuid FK
  name: varchar
  path: varchar  -- S3 path
  size_bytes: bigint
  expires_at: timestamp
}

secrets {
  id: uuid PK
  repo_id: bigint FK
  name: varchar
  encrypted_value: bytea  -- AES-256 encrypted
  created_at: timestamp
}`,
      examples: [
        { table: 'pipeline_runs', label: 'Successful CI pipeline run', json: `{ "id": "run-e4f5a6b7", "pipeline_id": 1042, "commit_sha": "a3c8f92e1b4d6e0f7a2c5b8d3e9f1a4c7b0d2e5f", "branch": "main", "status": "succeeded", "trigger_type": "push", "triggered_by": "alice", "started_at": "2025-04-18T09:10:00Z", "finished_at": "2025-04-18T09:14:32Z", "duration_ms": 272000 }` },
        { table: 'stages', label: 'Running test stage with Docker image', json: `{ "id": "stg-b8c9d0e1", "run_id": "run-e4f5a6b7", "name": "unit-tests", "status": "running", "image": "node:20-slim", "commands": ["npm ci", "npm test"], "depends_on": ["stg-a7b8c9d0"], "started_at": "2025-04-18T09:11:15Z", "finished_at": null, "worker_id": "ci-worker-05", "cache_key": "npm-deps-sha256:e3b0c4429..." }` },
        { table: 'artifacts', label: 'Build artifact stored in S3', json: `{ "id": "art-c1d2e3f4", "run_id": "run-e4f5a6b7", "stage_id": "stg-b8c9d0e1", "name": "coverage-report.html", "path": "s3://ci-artifacts/run-e4f5a6b7/coverage-report.html", "size_bytes": 284510, "expires_at": "2025-05-18T09:14:32Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/ci-cd-pipeline/impl-basic.png',
      description: 'A scheduler picks up triggered pipelines, runs each stage sequentially on a shared build server. Logs are written to files and served via HTTP. Artifacts stored on local disk.',
      problems: [
        'Shared build server: no isolation between pipelines (one can affect another)',
        'Sequential execution: parallel stages run one at a time, wasting time',
        'Local disk: artifacts lost if server fails, no sharing across workers',
        'No caching: every run downloads all dependencies from scratch'
      ]
    },

    advancedImplementation: {
      title: 'Container-Based Distributed Pipeline Engine',
      diagramSrc: '/diagrams/ci-cd-pipeline/impl-advanced.png',
      description: 'Each pipeline stage runs in an isolated Docker container on a pool of worker nodes. A scheduler orchestrates stage execution based on the dependency DAG, dispatching to workers with available capacity. Build logs are streamed via WebSocket through a pub/sub system. Artifacts and dependency caches are stored in S3. Secrets are injected at runtime from a vault service, never stored in the build environment.',
      keyPoints: [
        'Container isolation: each stage runs in a fresh Docker container with defined resource limits (CPU, memory)',
        'DAG executor: parses pipeline YAML into a dependency graph, runs independent stages in parallel',
        'Worker pool: auto-scaling group of build machines; scheduler assigns stages based on resource requirements and availability',
        'Dependency caching: hash of lock file (package-lock.json, Gemfile.lock) = cache key; cache stored in S3',
        'Log streaming: stage writes to stdout -> sidecar container captures -> publishes to Kafka -> WebSocket gateway fans out to clients',
        'Secret injection: secrets fetched from Vault at stage start, injected as env vars, scrubbed from logs (regex pattern matching)'
      ],
      databaseChoice: 'PostgreSQL for pipeline/run/stage metadata; S3 for artifacts and dependency caches; Kafka for log streaming; Redis for worker state and stage dispatch queue; HashiCorp Vault for secrets',
      caching: 'S3-backed dependency cache (keyed by lock file hash + Docker image); Docker layer cache on workers (warm workers start stages faster); pre-pulled common Docker images on all workers'
    },

    tips: [
      'Start with the pipeline execution model: YAML -> DAG -> parallel stage execution',
      'Container isolation is a key architecture decision: discuss Docker vs VM trade-offs',
      'Build caching is critical for developer experience: discuss cache key strategies',
      'Secret management deserves its own discussion: injection, scrubbing, rotation',
      'Auto-scaling workers is important for cost: scale to zero during quiet hours',
      'Log streaming is a nice real-time systems sub-problem'
    ],

    keyQuestions: [
      {
        question: 'How do you execute a multi-stage pipeline with dependencies?',
        answer: `**Pipeline YAML -> DAG -> Execution**:

**Example Pipeline**:
\`\`\`yaml
stages:
  install: { image: node:18, commands: [npm ci] }
  lint:    { image: node:18, commands: [npm run lint], needs: [install] }
  test:    { image: node:18, commands: [npm test], needs: [install] }
  build:   { image: node:18, commands: [npm run build], needs: [lint, test] }
  deploy:  { image: aws-cli, commands: [./deploy.sh], needs: [build] }
\`\`\`

**DAG Construction**:
\`\`\`
install -> lint  ─┐
       \\-> test ─┤-> build -> deploy
\`\`\`

**Execution Algorithm**:
1. Parse YAML, build dependency graph
2. Find all stages with no unmet dependencies -> "ready" set: {install}
3. Dispatch ready stages to workers (parallel)
4. When a stage completes:
   - Update its dependents' unmet dependency count
   - If a dependent's count reaches 0: add to ready set
5. Repeat until all stages complete or one fails

**Failure Handling**:
- If \`test\` fails: \`build\` and \`deploy\` are marked "skipped" (unrunnable)
- If \`lint\` fails but \`test\` succeeds: \`build\` still skipped (needs BOTH)
- Optional "allow_failure" flag: stage failure doesn't block dependents

**Optimization - Workspace Sharing**:
- \`install\` produces node_modules -> stages \`lint\`, \`test\`, \`build\` need it
- Workspace (filesystem snapshot) is captured after \`install\`
- Dependent stages start with that workspace (avoid re-installing)
- Implementation: tarball in S3 or shared volume mount`
      },
      {
        question: 'How does dependency caching work?',
        answer: `**Cache Key Strategy**:
\`\`\`yaml
# In pipeline config:
cache:
  key: node-modules-{{ hashFiles('package-lock.json') }}
  paths: [node_modules/]
\`\`\`

**Cache Flow**:

**On Stage Start**:
1. Compute cache key: hash of lock file content -> "node-modules-a1b2c3d4"
2. Check S3: does cache object exist at \`caches/repo-123/node-modules-a1b2c3d4.tar.zst\`?
3. If HIT: download and extract (10 seconds vs 2 minutes for npm install)
4. If MISS: proceed without cache

**On Stage Success**:
1. If cache key didn't exist (was a miss): archive cached paths
2. Upload to S3: \`caches/repo-123/node-modules-a1b2c3d4.tar.zst\` (zstd compressed)
3. Future runs with same lock file -> instant cache hit

**Cache Invalidation**:
- Automatic: when package-lock.json changes, hash changes -> new cache key
- Manual: API endpoint to clear caches for a repository
- TTL: caches expire after 7 days of no access (S3 lifecycle policy)

**Multi-Layer Caching**:
- L1: Worker local disk (fastest, survives between runs on same worker)
- L2: S3 (shared across all workers, survives worker replacement)
- Cache hit rate: 80-90% for established projects (lock files change rarely)

**Docker Layer Cache**:
- Workers keep Docker layer cache warm
- Custom base image (node:18 + common packages) pre-pulled on all workers
- Dockerfile cache: each layer is cached by its instruction hash
- "Warm worker" assignment: prefer dispatching to a worker that recently ran the same image`
      },
      {
        question: 'How do you handle secrets securely?',
        answer: `**Secret Lifecycle**:

**Storage**:
- Secrets stored in HashiCorp Vault (or similar KMS)
- Encrypted at rest with AES-256, key managed by HSM
- Access controlled per repository: repo X can only read its own secrets

**Injection at Runtime**:
1. Stage is about to start on worker
2. Worker requests secrets from Vault: "give me secrets for repo-123"
3. Vault authenticates worker (mutual TLS + IAM role)
4. Vault returns decrypted secrets
5. Worker injects as environment variables inside the container
6. Container process reads them like normal env vars

**Log Scrubbing** (critical):
- Build output is scanned for secret values before logging
- Pattern matching: if any log line contains a secret value, replace with "***"
- Also scrub: base64-encoded secrets, URL-encoded secrets, partial matches
- Defense in depth: scrubbing happens at both container sidecar and log ingestion

**What Secrets NEVER Touch**:
- Never written to disk inside the container (tmpfs only)
- Never included in Docker image layers
- Never passed as command-line arguments (visible in /proc)
- Never included in artifacts or cache archives
- Never visible in pipeline YAML (stored separately, referenced by name)

**Rotation**:
- Secrets can be rotated without changing pipeline config
- Old secret value remains valid for a grace period (ongoing runs)
- Vault audit log tracks every secret access (who, when, which pipeline run)`
      }
    ],

    requirements: ['Pipeline definition (YAML)', 'Multi-stage execution', 'Container isolation', 'Dependency caching', 'Log streaming', 'Secret management'],
    components: ['Pipeline Scheduler', 'DAG Executor', 'Worker Pool (auto-scaling)', 'S3 (artifacts + cache)', 'Kafka (log streaming)', 'Vault (secrets)', 'PostgreSQL (metadata)'],
    keyDecisions: [
      'Container-based stage isolation with defined resource limits',
      'DAG-based pipeline execution with parallel stage scheduling',
      'Content-addressed dependency caching (lock file hash = cache key) in S3',
      'Log streaming via Kafka + WebSocket for real-time build output',
      'Vault-based secret injection at runtime with log scrubbing for defense in depth',
      'Auto-scaling worker pool to handle burst traffic and minimize idle cost'
    ],

    edgeCases: [
      { scenario: 'Build step produces non-deterministic output (timestamps, random IDs)', impact: 'Cache invalidation fails, deployments differ between runs despite identical code', mitigation: 'Enforce deterministic builds via SOURCE_DATE_EPOCH, fixed seeds, and content-addressable artifact hashing' },
      { scenario: 'Flaky test passes on retry but masks a real intermittent bug', impact: 'Broken code reaches production, test suite loses credibility', mitigation: 'Track flaky test history, quarantine repeat offenders, require N consecutive passes after flake detection' },
      { scenario: 'Pipeline runs on a forked repo with malicious code in CI config', impact: 'Secrets exfiltrated, supply chain attack on downstream artifacts', mitigation: 'Run forked PR builds in sandboxed environment without secret access, require maintainer approval for CI on forks' },
      { scenario: 'Deployment rollback needed but database migration is irreversible', impact: 'Cannot revert to previous version without data loss or schema conflicts', mitigation: 'Enforce forward-only compatible migrations, separate deploy from migrate, use expand-contract migration pattern' },
      { scenario: 'Concurrent merges trigger parallel pipelines deploying to same environment', impact: 'Race condition causes partial deployments or resource conflicts', mitigation: 'Serialize deployments per environment with a deployment lock, queue subsequent pipelines' },
    ],
    tradeoffs: [
      { decision: 'Monorepo pipeline vs per-service pipelines', pros: 'Monorepo gives atomic cross-service changes; per-service gives independent velocity', cons: 'Monorepo pipelines are slow without smart change detection; per-service complicates integration testing', recommendation: 'Monorepo with affected-service detection (e.g., Turborepo, Bazel) to build only what changed' },
      { decision: 'Self-hosted runners vs cloud-managed runners', pros: 'Self-hosted gives full control and GPU access; cloud-managed is zero maintenance', cons: 'Self-hosted requires patching, scaling, and security hardening; cloud-managed has cold start latency', recommendation: 'Cloud-managed for standard builds, self-hosted for specialized workloads (GPU, large builds)' },
      { decision: 'Blue-green deployment vs canary deployment', pros: 'Blue-green gives instant rollback; canary reduces blast radius', cons: 'Blue-green doubles infrastructure cost; canary is complex to monitor and route', recommendation: 'Canary for high-traffic services with automated rollback, blue-green for stateful services' },
      { decision: 'Artifact caching aggressiveness', pros: 'Aggressive caching dramatically speeds up builds; minimal caching ensures correctness', cons: 'Aggressive caching can serve stale artifacts; minimal caching wastes compute', recommendation: 'Content-addressable caching with dependency-graph-aware invalidation' },
    ],
    layeredDesign: [
      { name: 'Source & Trigger Layer', purpose: 'Detect code changes and trigger appropriate pipelines', components: ['Webhook Receiver', 'Change Detector', 'Pipeline Scheduler', 'Branch Policy Engine'] },
      { name: 'Build & Test Layer', purpose: 'Compile, test, and produce deployable artifacts', components: ['Build Orchestrator', 'Test Runner', 'Artifact Builder', 'Cache Manager'] },
      { name: 'Deployment Layer', purpose: 'Ship artifacts to target environments safely', components: ['Deployment Controller', 'Canary Manager', 'Rollback Engine', 'Environment Manager'] },
      { name: 'Infrastructure Layer', purpose: 'Compute, storage, and security for pipeline execution', components: ['Worker Pool (auto-scaling)', 'Artifact Storage', 'Secret Vault', 'Container Registry'] },
    ],
  },

  // ─── 19. Calendar System ───────────────────────────────────────────
  {
    id: 'calendar-system',
    isNew: true,
    title: 'Calendar System',
    subtitle: 'Google Calendar',
    icon: 'calendar',
    color: '#4285f4',
    difficulty: 'Medium',
    description: 'Design a calendar system supporting event scheduling, recurring events, multi-timezone support, and availability-based scheduling.',

    introduction: `Calendar systems are deceptively complex. On the surface, it's just storing events with start/end times. But recurring events (every Tuesday and Thursday, except holidays, ending after 50 occurrences), multi-timezone handling (a meeting at "3pm ET" shows as "12pm PT" for another participant), and free/busy availability queries across hundreds of participants make this a rich system design problem.

The core data model challenge is recurring events. A naive approach (materialize all instances of a recurring event) doesn't scale: a daily event for 10 years = 3,650 rows, and modifying the recurring series means updating all of them. The efficient approach uses a recurrence rule (RFC 5545 RRULE) and expands instances on-the-fly during queries.

The availability/scheduling problem is also interesting: "Find a 30-minute slot when Alice, Bob, and the Main Conference Room are all free in the next 2 weeks" requires computing the intersection of multiple calendars' free/busy intervals, potentially across different time zones.`,

    functionalRequirements: [
      'Create, update, delete calendar events',
      'Recurring events with complex rules (RRULE: daily, weekly, monthly, custom)',
      'Invite attendees and track RSVP status',
      'Multiple calendars per user (work, personal, shared team calendars)',
      'Free/busy availability queries across multiple participants',
      'Smart scheduling: find available slots for a group',
      'Reminders and notifications (email, push)',
      'Time zone support: events stored in one timezone, displayed in another'
    ],

    nonFunctionalRequirements: [
      'Event CRUD latency < 100ms',
      'Calendar view render (month view with events) < 200ms',
      'Availability query across 20 participants < 500ms',
      '99.99% availability',
      'Support 500M+ users, 10B+ events',
      'Recurring event modifications reflected instantly across all views'
    ],

    estimation: {
      users: '500M users, 200M DAU, avg 20 events/week per active user',
      storage: '~2KB per event * 10B events = ~20TB; recurring rules add minimal overhead',
      bandwidth: '~100Gbps peak (calendar views with many events)',
      qps: '~500K calendar view reads/sec, ~50K event writes/sec, ~100K availability queries/sec'
    },

    apiDesign: {
      description: 'RESTful API following CalDAV-like semantics',
      endpoints: [
        { method: 'POST', path: '/api/calendars/:calendarId/events', params: '{ title, startTime, endTime, timezone, recurrence?, attendees[], reminders[] }', response: '201 { eventId }' },
        { method: 'GET', path: '/api/calendars/:calendarId/events', params: 'timeMin, timeMax, singleEvents=true (expand recurring)', response: '{ events[] }' },
        { method: 'PATCH', path: '/api/events/:eventId', params: '{ title?, startTime?, recurrence? } + scope: this|thisAndFollowing|all', response: '200 { updated }' },
        { method: 'GET', path: '/api/freebusy', params: '{ attendees[], timeMin, timeMax }', response: '{ calendars: { userId: [{start, end}] } }' },
        { method: 'GET', path: '/api/findtime', params: '{ attendees[], duration, timeMin, timeMax, workingHoursOnly? }', response: '{ suggestions[{start, end, confidence}] }' },
        { method: 'POST', path: '/api/events/:eventId/rsvp', params: '{ status: accepted|declined|tentative }', response: '200' }
      ]
    },

    dataModel: {
      description: 'Events with recurrence rules, not materialized instances',
      schema: `calendars {
  id: uuid PK
  owner_id: bigint FK
  name: varchar
  type: enum(primary, secondary, shared, resource)
  timezone: varchar  -- e.g., "America/New_York"
  color: varchar
  default_reminders: jsonb
}

events {
  id: uuid PK
  calendar_id: uuid FK
  title: varchar
  description: text
  start_time: timestamp with time zone
  end_time: timestamp with time zone
  timezone: varchar  -- original creation timezone
  all_day: boolean
  location: varchar
  recurrence_rule: varchar nullable  -- RRULE string: "FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20251231"
  recurrence_id: uuid nullable  -- for exception instances, points to parent
  original_start: timestamp nullable  -- for exception: the instance being overridden
  status: enum(confirmed, tentative, cancelled)
  created_at: timestamp
  updated_at: timestamp
}

attendees {
  event_id: uuid FK
  user_id: bigint FK
  email: varchar
  rsvp_status: enum(needs_action, accepted, declined, tentative)
  is_organizer: boolean
  PK(event_id, user_id)
}

-- Pre-computed free/busy blocks (materialized for fast queries)
freebusy_blocks {
  user_id: bigint
  start_time: timestamp
  end_time: timestamp
  event_id: uuid FK
  transparency: enum(opaque, transparent)
  -- Indexed: (user_id, start_time, end_time) for range queries
}`,
      examples: [
        { table: 'events', label: 'Recurring weekly team standup', json: `{ "id": "evt-a1b2c3d4", "calendar_id": "cal-primary-42", "title": "Team Standup", "description": "Daily sync with engineering team", "start_time": "2025-04-15T09:00:00-04:00", "end_time": "2025-04-15T09:30:00-04:00", "timezone": "America/New_York", "all_day": false, "location": "Zoom Room 3", "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20251231", "recurrence_id": null, "original_start": null, "status": "confirmed", "created_at": "2025-01-10T14:00:00Z", "updated_at": "2025-04-01T08:20:00Z" }` },
        { table: 'attendees', label: 'Accepted meeting attendee', json: `{ "event_id": "evt-a1b2c3d4", "user_id": 7291, "email": "alice@acme.com", "rsvp_status": "accepted", "is_organizer": false }` },
        { table: 'freebusy_blocks', label: 'Opaque busy block for meeting', json: `{ "user_id": 7291, "start_time": "2025-04-18T09:00:00-04:00", "end_time": "2025-04-18T09:30:00-04:00", "event_id": "evt-a1b2c3d4", "transparency": "opaque" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/calendar-system/impl-basic.png',
      description: 'Events stored in a SQL database. Recurring events materialized as individual rows (one per instance). Calendar views query for events in a time range.',
      problems: [
        'Materializing recurring events creates massive data: daily event for 10 years = 3,650 rows',
        'Modifying a recurring series requires updating thousands of rows',
        'Availability queries across many calendars are N * time-range scans',
        'Time zone handling with DST transitions is error-prone when stored as naive timestamps'
      ]
    },

    advancedImplementation: {
      title: 'RRULE-Based Events with Materialized Free/Busy',
      diagramSrc: '/diagrams/calendar-system/impl-advanced.png',
      description: 'Recurring events stored as a single row with an RRULE string. Instances are computed on-the-fly when querying a time range. Exception instances (modified or deleted occurrences) are stored separately and merged during expansion. Free/busy blocks are pre-computed and materialized in a separate table for fast availability queries.',
      keyPoints: [
        'RRULE storage: one row per recurring series, not per instance (daily event = 1 row, not 3,650)',
        'On-the-fly expansion: when rendering a calendar view, expand RRULEs within the requested time range',
        'Exception instances: "this occurrence only" modifications create a new event row linked to the parent by recurrence_id',
        'Materialized free/busy: background worker expands events into free/busy blocks for the next 60 days',
        'Availability query: interval intersection across materialized free/busy blocks (very fast with proper indexing)',
        'All times stored as UTC + timezone identifier: renders correctly across DST transitions'
      ],
      databaseChoice: 'PostgreSQL for events and calendars (complex queries, timezone support); Redis for materialized free/busy (fast range queries); Kafka for event change notifications to attendees',
      caching: 'Redis caches rendered calendar views per user per time range (invalidated on event change); free/busy blocks cached for 60-day lookahead; user timezone preferences cached'
    },

    tips: [
      'Recurring events and how to store/expand them is THE central topic',
      'Discuss the three modification scopes: this instance, this and following, all instances',
      'Time zones with DST are tricky: always store UTC + timezone name, never just an offset',
      'Free/busy materialization is a key optimization for scheduling',
      'The "find a time" feature is an interval intersection/gap-finding algorithm',
      'Reminders are a sub-problem of the job scheduler design'
    ],

    keyQuestions: [
      {
        question: 'How do you handle recurring events efficiently?',
        answer: `**RRULE-Based Storage** (RFC 5545):

**Storage**: One row per recurring series
\`\`\`
Event: "Team Standup"
start_time: 2024-01-01 09:00 America/New_York
recurrence_rule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20241231"
\`\`\`

**On-The-Fly Expansion** (when rendering a calendar view):
\`\`\`python
def get_events(calendar_id, time_min, time_max):
    # 1. Get non-recurring events in range
    simple = SELECT * FROM events WHERE calendar_id = :cal
             AND start_time >= :min AND start_time < :max
             AND recurrence_rule IS NULL

    # 2. Get recurring events that MIGHT have instances in range
    recurring = SELECT * FROM events WHERE calendar_id = :cal
                AND recurrence_rule IS NOT NULL
                AND start_time < :max  -- started before range ends

    # 3. Expand each recurring event within the range
    expanded = []
    for event in recurring:
        instances = rrule_expand(event.recurrence_rule, event.start_time, time_min, time_max)
        expanded.extend(instances)

    # 4. Merge with exception instances (modified/deleted occurrences)
    exceptions = SELECT * FROM events WHERE recurrence_id IN (recurring_ids)
    # Apply exceptions: replace matching instances, remove cancelled ones

    return simple + expanded
\`\`\`

**Performance**:
- RRULE expansion is pure computation (no I/O): ~1ms for 1 year of weekly events
- Only expand within the requested time range (not all time)
- Exception instances are few (most recurring instances are unmodified)`
      },
      {
        question: 'How does the "Find a Time" scheduling feature work?',
        answer: `**Algorithm: Interval Gap Finding**:

**Input**:
- Participants: [Alice, Bob, Charlie, Room A]
- Duration: 30 minutes
- Range: next 2 weeks, working hours only (9am-5pm in each person's timezone)

**Step 1 - Gather Busy Intervals**:
\`\`\`
Alice:   [9:00-10:00, 11:00-12:00, 14:00-15:30]  (day 1, converted to UTC)
Bob:     [9:30-10:30, 13:00-14:00]
Charlie: [10:00-11:30, 15:00-16:00]
Room A:  [9:00-10:00, 14:00-16:00]
\`\`\`

**Step 2 - Merge All Busy Intervals** (union):
\`\`\`
Merged busy: [9:00-10:30, 10:00-12:00, 13:00-16:00]
Simplified:  [9:00-12:00, 13:00-16:00]
\`\`\`

**Step 3 - Find Gaps >= Duration**:
\`\`\`
Free slots: [12:00-13:00 (60min), 16:00-17:00 (60min)]
Both fit a 30-minute meeting!
\`\`\`

**Step 4 - Rank Suggestions**:
- Prefer earlier slots (less likely to conflict with new events)
- Prefer slots during "preferred" hours (10am-12pm, 2pm-4pm)
- Penalize slots that require timezone inconvenience (2am for someone)
- Score each slot, return top 3-5 suggestions

**Implementation Optimization**:
- Read from materialized free/busy blocks (not raw events)
- Index: (user_id, start_time) enables efficient range scan
- For N participants, 2-week range: ~100-500 busy blocks to merge
- Merge algorithm: O(N log N) sort + linear scan = <10ms

**Working Hours Per Timezone**:
- Each participant has a timezone and working hours preference
- Convert working hours to UTC ranges for each day in the range
- Non-working hours are treated as "busy" in the merge step`
      },
      {
        question: 'How do you handle time zones correctly?',
        answer: `**The Problem**:
- Alice creates "Meeting at 3pm ET" on March 5
- Bob views it in PT: should see 12pm
- On March 10 (after DST spring-forward): ET is now EDT, PT is now PDT
- The meeting should STILL be at 3pm ET / 12pm PT (not shift by an hour)

**Correct Storage Strategy**:
\`\`\`
DON'T store: start_time = "2024-03-05T15:00:00-05:00" (offset)
            (offset changes with DST, this is ambiguous for recurring events)

DO store:   start_time = "2024-03-05T20:00:00Z" (UTC)
            timezone = "America/New_York"
\`\`\`

**Why UTC + Timezone Name (not Offset)?**:
- Offset -05:00 could be EST or CDT (ambiguous)
- Timezone name "America/New_York" encodes all DST transition rules
- For recurring events: "every Tuesday at 3pm America/New_York" correctly adjusts for DST

**Recurring Event Expansion with DST**:
\`\`\`
Rule: FREQ=WEEKLY;BYDAY=TU at 15:00 America/New_York

Before DST (EST, UTC-5):  Tuesday 15:00 EST = 20:00 UTC
After DST (EDT, UTC-4):   Tuesday 15:00 EDT = 19:00 UTC

The UTC value changes! But the local time (3pm ET) stays the same.
\`\`\`

**IANA Timezone Database**:
- Use the IANA tz database (e.g., via date-fns-tz or Java's ZoneId)
- Updated regularly with new DST rules (countries change their DST policies)
- Server must use the latest tz database version
- Edge case: a country abolishes DST -> all future recurring events need recomputation`
      }
    ],

    requirements: ['Event CRUD', 'Recurring events (RRULE)', 'Multi-timezone support', 'Free/busy queries', 'Smart scheduling', 'Reminders'],
    components: ['Event Service', 'RRULE Expansion Engine', 'Free/Busy Materializer', 'Scheduling Optimizer', 'Notification Service', 'PostgreSQL', 'Redis (free/busy cache)'],
    keyDecisions: [
      'RRULE-based recurring event storage (1 row per series, not per instance)',
      'On-the-fly instance expansion within requested time ranges',
      'Exception instances linked by recurrence_id for per-occurrence modifications',
      'Materialized free/busy blocks for fast availability queries',
      'UTC storage with IANA timezone identifiers for correct DST handling',
      'Interval gap-finding algorithm for smart meeting scheduling'
    ],

    edgeCases: [
      { scenario: 'Recurring event spanning a DST transition', impact: 'Meeting shifts by an hour or duplicates/skips an occurrence', mitigation: 'Store recurrence rules with IANA timezone, compute occurrences at query time using timezone-aware libraries' },
      { scenario: 'Organizer changes timezone of a recurring event after attendees accepted', impact: 'Existing attendees see wrong times or miss meetings', mitigation: 'Send update notifications with old and new times, require re-confirmation for affected occurrences' },
      { scenario: 'Conflicting meeting invitations accepted simultaneously', impact: 'User double-booked without realizing, misses one meeting', mitigation: 'Real-time conflict detection on accept, warn user with option to decline conflicting event' },
      { scenario: 'Free/busy lookup across thousands of attendees for room scheduling', impact: 'Query timeout when finding available slots for large groups', mitigation: 'Pre-compute free/busy bitmaps per user per day, use bitwise AND for fast intersection queries' },
      { scenario: 'Calendar sync across multiple providers (Google, Outlook, Apple)', impact: 'Events duplicated, deleted, or out of sync across platforms', mitigation: 'Use CalDAV/iCal standards with sync tokens, implement conflict resolution with last-writer-wins per field' },
    ],
    tradeoffs: [
      { decision: 'Store individual occurrences vs recurrence rules', pros: 'Individual occurrences are simple to query; rules save massive storage', cons: 'Individual occurrences explode storage for daily events; rules require complex expansion logic', recommendation: 'Store recurrence rules and expand on read, with materialized occurrences for the next 6 months' },
      { decision: 'Push notifications vs polling for calendar updates', pros: 'Push gives instant awareness; polling is simpler and works offline', cons: 'Push requires maintaining notification channels; polling wastes bandwidth and has latency', recommendation: 'Push via WebSocket for active sessions, email/mobile push for important changes, polling as fallback' },
      { decision: 'Per-user timezone storage vs UTC-only', pros: 'Per-user timezone gives natural display; UTC-only simplifies storage', cons: 'Per-user timezone complicates queries; UTC-only requires client-side conversion', recommendation: 'Store all times in UTC with IANA timezone metadata, render in user local timezone on client' },
      { decision: 'Centralized vs federated calendar system', pros: 'Centralized is simpler to maintain; federated enables cross-org scheduling', cons: 'Centralized creates vendor lock-in; federated has consistency challenges', recommendation: 'Centralized with CalDAV federation endpoints for external calendar interop' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Calendar views (day/week/month) with drag-and-drop scheduling', components: ['Web Calendar UI', 'Mobile Calendar App', 'Timezone Converter', 'Notification Handler'] },
      { name: 'API & Scheduling Layer', purpose: 'Event CRUD, recurrence expansion, and conflict detection', components: ['Event Service', 'Recurrence Engine', 'Conflict Detector', 'Free/Busy Service'] },
      { name: 'Notification & Sync Layer', purpose: 'Reminders, invitations, and cross-platform synchronization', components: ['Reminder Scheduler', 'Email/Push Notifier', 'CalDAV Sync Engine', 'Webhook Dispatcher'] },
      { name: 'Data Layer', purpose: 'Persistent storage for events, calendars, and user preferences', components: ['PostgreSQL (events, calendars)', 'Redis (free/busy bitmaps, caches)', 'Message Queue (notifications)', 'Blob Storage (attachments)'] },
    ],
  },

  // ─── 20. Online Chess ──────────────────────────────────────────────
  {
    id: 'online-chess',
    isNew: true,
    title: 'Online Chess',
    subtitle: 'Chess.com / Lichess',
    icon: 'grid',
    color: '#769656',
    difficulty: 'Medium',
    description: 'Design an online chess platform with real-time gameplay, matchmaking, time controls, and player rating systems.',

    introduction: `Online chess platforms like Chess.com and Lichess serve millions of games per day, combining real-time interactive gameplay with sophisticated matchmaking and rating systems. The system must handle the unique characteristics of turn-based games: strict move validation, multiple time control formats (bullet, blitz, rapid, classical), and real-time clock synchronization between players.

Unlike many real-time systems where eventual consistency is acceptable, chess requires strict consistency: both players must always see the same board state, and clock times must be accurate to the tenth of a second (in bullet chess, a tenth of a second can determine the winner). The server is the authoritative source of truth for both the board and the clocks.

The matchmaking system is also interesting: it must pair players of similar rating with minimal wait time, handle multiple game variants (standard, chess960, crazyhouse), and prevent rating manipulation while maintaining statistical accuracy (the Glicko-2 rating system).`,

    functionalRequirements: [
      'Real-time two-player chess with move validation',
      'Multiple time controls (bullet 1+0, blitz 3+2, rapid 10+5, classical 30+0)',
      'Matchmaking: pair players by rating and time control preference',
      'Move validation: reject illegal moves, detect check/checkmate/stalemate/draw',
      'Game clock management with increment support',
      'Player rating system (Elo/Glicko-2)',
      'Game history: review past games, PGN export',
      'Spectator mode: watch live games'
    ],

    nonFunctionalRequirements: [
      'Move transmission latency < 100ms (critical for bullet chess)',
      'Clock synchronization accuracy < 50ms between players',
      'Matchmaking wait time < 10 seconds for popular time controls',
      '99.99% availability during active games (game loss = rating loss)',
      'Support 1M+ concurrent games',
      'Server is authoritative: no client-side game state manipulation'
    ],

    estimation: {
      users: '10M registered, 1M DAU, peak 500K concurrent players, 250K concurrent games',
      storage: '~5KB per game (moves + metadata) * 5M games/day = ~25GB/day',
      bandwidth: '~50Gbps (small payloads but high frequency per game)',
      qps: '~500K moves/sec (250K games * avg 2 moves/sec), ~10K matchmaking requests/sec'
    },

    apiDesign: {
      description: 'WebSocket for gameplay, REST for matchmaking and history',
      endpoints: [
        { method: 'POST', path: '/api/seek', params: '{ timeControl, rated, ratingRange?, variant }', response: '{ seekId }' },
        { method: 'WS', path: '/ws/game/:gameId', params: 'auth token', response: 'Bidirectional: moves, clock updates, draw offers, resign' },
        { method: 'GET', path: '/api/games/:gameId', params: '', response: '{ pgn, players, result, moves[], clockTimes[] }' },
        { method: 'GET', path: '/api/players/:playerId/rating', params: 'variant?', response: '{ rating, rd, volatility, history[] }' },
        { method: 'GET', path: '/api/players/:playerId/games', params: 'variant, rated, cursor', response: '{ games[], nextCursor }' },
        { method: 'WS', path: '/ws/spectate/:gameId', params: '', response: 'Stream: moves, clock updates' }
      ]
    },

    dataModel: {
      description: 'Games, moves, ratings, and matchmaking state',
      schema: `players {
  id: bigint PK
  username: varchar unique
  ratings: jsonb  -- { bullet: {rating, rd, volatility}, blitz: {...}, rapid: {...} }
  games_played: int
  created_at: timestamp
}

games {
  id: uuid PK
  white_id: bigint FK
  black_id: bigint FK
  variant: enum(standard, chess960, crazyhouse)
  time_control: varchar  -- "3+2" (3 minutes + 2 sec increment)
  rated: boolean
  status: enum(in_progress, checkmate, stalemate, draw, resignation, timeout, abort)
  result: enum(white_wins, black_wins, draw) nullable
  pgn: text  -- Portable Game Notation
  opening_eco: varchar  -- ECO opening classification
  started_at: timestamp
  ended_at: timestamp nullable
}

moves {
  game_id: uuid FK
  move_number: int
  color: enum(white, black)
  uci: varchar  -- "e2e4" (Universal Chess Interface notation)
  san: varchar  -- "e4" (Standard Algebraic Notation)
  fen_after: varchar  -- board state after move
  clock_ms: int  -- remaining time after move
  timestamp: timestamp
  PK(game_id, move_number, color)
}

-- In-memory matchmaking pool (Redis)
seek_pool {
  seek_id: uuid
  player_id: bigint
  rating: int
  time_control: varchar
  variant: varchar
  rated: boolean
  created_at: timestamp
}`,
      examples: [
        { table: 'games', label: 'Completed blitz game won by white', json: `{ "id": "game-f8e7d6c5", "white_id": 40291, "black_id": 51823, "variant": "standard", "time_control": "3+2", "rated": true, "status": "checkmate", "result": "white_wins", "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 ...", "opening_eco": "C65", "started_at": "2025-04-18T14:30:00Z", "ended_at": "2025-04-18T14:37:42Z" }` },
        { table: 'moves', label: 'Opening move with clock time', json: `{ "game_id": "game-f8e7d6c5", "move_number": 1, "color": "white", "uci": "e2e4", "san": "e4", "fen_after": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "clock_ms": 178500, "timestamp": "2025-04-18T14:30:05Z" }` },
        { table: 'players', label: 'Active player with multi-variant ratings', json: `{ "id": 40291, "username": "ChessKnight99", "ratings": {"bullet": {"rating": 1850, "rd": 45, "volatility": 0.06}, "blitz": {"rating": 1920, "rd": 38, "volatility": 0.05}, "rapid": {"rating": 2010, "rd": 55, "volatility": 0.06}}, "games_played": 3842, "created_at": "2023-06-15T10:00:00Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/online-chess/impl-basic.png',
      description: 'Players connect via WebSocket to an application server. The server maintains game state in memory, validates moves, and relays them to the opponent. Matchmaking uses a simple queue.',
      problems: [
        'Single server: game state lost if server crashes mid-game',
        'Both players must be connected to the same server (sticky sessions required)',
        'Simple queue matchmaking produces poor rating-based pairings',
        'Clock managed client-side: vulnerable to manipulation'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Game Server Architecture',
      diagramSrc: '/diagrams/online-chess/impl-advanced.png',
      description: 'Game state is managed by a Game Server tier where each game is assigned to a specific server via consistent hashing. WebSocket connections go through a gateway layer that routes messages to the correct game server. Game state is periodically checkpointed to Redis for crash recovery. Matchmaking uses a rating-bucketed pool with time-decay for wait time.',
      keyPoints: [
        'Game Server: maintains authoritative board state, validates moves, manages clocks; one server per game',
        'WebSocket Gateway: handles client connections, routes messages by gameId to the correct game server',
        'Server-side clock: game server is the source of truth for time; accounts for network latency via timestamps',
        'Matchmaking: rating-bucketed pools in Redis, widening rating range as wait time increases',
        'Crash recovery: game state checkpointed to Redis every move; on server restart, resume from checkpoint',
        'Spectator fan-out: spectators subscribe to game events via separate pub/sub channel (not through game server)'
      ],
      databaseChoice: 'Redis for active game state (low-latency reads/writes) and matchmaking pool; PostgreSQL for completed game history and player profiles; Kafka for spectator event streaming',
      caching: 'Active game state lives in game server memory with Redis backup; player ratings cached in matchmaking service; completed game PGN generated lazily on first access'
    },

    tips: [
      'The game server must be authoritative: discuss why client-side validation is insufficient',
      'Clock management is subtle: discuss how to handle network latency fairly',
      'Matchmaking rating pools are the key to fast, fair pairing',
      'Glicko-2 rating system is more nuanced than Elo: discuss rating deviation',
      'Crash recovery mid-game is critical: players should be able to reconnect',
      'Spectator mode is a pub/sub fan-out problem'
    ],

    keyQuestions: [
      {
        question: 'How does server-side clock management work?',
        answer: `**The Problem**:
- In bullet chess (1 minute per player), 100ms of unfairness matters
- Network latency varies: player with better connection has an advantage
- Client-side clock is manipulable (cheating)

**Server-Side Clock Protocol**:
\`\`\`
1. Player makes a move at client time T_client
2. Client sends: { move: "e2e4", clientTimestamp: T_client }
3. Server receives at T_server_receive
4. Server validates move, computes time used:
   time_used = T_server_receive - T_last_server_event - estimated_network_latency
5. Server deducts time_used from player's clock
6. Server sends to both players: { move: "e4", whiteClockMs: 54200, blackClockMs: 58300 }
\`\`\`

**Latency Compensation**:
- On game start: server pings both clients, estimates round-trip time (RTT)
- Estimated one-way latency = RTT / 2
- Time used = time on server - estimated one-way latency
- This ensures a player with 200ms latency isn't penalized 200ms per move vs a player with 20ms

**Pre-move / Pre-claim**:
- Player can set a "pre-move" (queued move before opponent's turn)
- When opponent's move arrives, pre-move is executed with near-zero think time
- Critical for bullet chess where reaction time matters

**Clock Sync Messages**:
- Server sends clock state with every move
- If client clock drifts (due to browser tab throttling), server clock is authoritative
- Client interpolates between server updates for smooth display

**Timeout Detection**:
- Server runs a timer for the active player
- If clock reaches 0: game ends (timeout)
- Grace period: 100ms (accounts for in-flight move from client)`
      },
      {
        question: 'How does the matchmaking system work?',
        answer: `**Rating-Bucketed Pool with Time-Based Widening**:

**Pool Structure** (Redis sorted sets):
\`\`\`
seek:blitz:3+2:rated -> Sorted set (score = rating)
  { player: "alice", rating: 1500, seekTime: T }
  { player: "bob", rating: 1520, seekTime: T-5 }
  { player: "charlie", rating: 1800, seekTime: T-15 }
\`\`\`

**Matching Algorithm**:
\`\`\`python
def find_match(seeker):
    pool_key = f"seek:{seeker.time_control}:{seeker.variant}:{'rated' if seeker.rated else 'casual'}"

    # Start with tight rating range, widen over time
    wait_time = now() - seeker.created_at
    rating_range = 50 + (wait_time_seconds * 10)  # widens 10 points/sec
    rating_range = min(rating_range, 500)  # cap at ±500

    # Find candidates within rating range
    candidates = ZRANGEBYSCORE pool_key
                   seeker.rating - rating_range,
                   seeker.rating + rating_range

    if candidates:
        # Pick closest rating match
        best = min(candidates, key=lambda c: abs(c.rating - seeker.rating))
        # Atomically remove both from pool, create game
        ZREM pool_key seeker, best
        create_game(seeker, best)
    else:
        # No match yet, stay in pool
        return None  # check again in 1 second
\`\`\`

**Fairness**:
- Rating range starts narrow (±50): strong preference for close matches
- Widens over time: after 30 seconds, range is ±350 (accept wider gap)
- Prevents indefinite waiting while maintaining quality matches

**Preventing Abuse**:
- Can't seek if already in a game
- Minimum time between seeks (prevent rapid cancel/re-seek for rating sniping)
- Provisional players (< 20 games) matched separately to protect established ratings

**Color Assignment**:
- Track each player's recent color history
- Assign to balance: if Alice played white 3 of last 4 games, she gets black
- If both have balanced history: random`
      },
      {
        question: 'How does the Glicko-2 rating system work?',
        answer: `**Why Not Simple Elo?**:
- Elo assumes all players are equally "certain" in their rating
- A player who played 1000 games has a very certain rating
- A new player or one returning after 6 months has an uncertain rating
- Glicko-2 tracks this uncertainty explicitly

**Three Components**:
- **Rating (r)**: skill level (like Elo), default 1500
- **Rating Deviation (RD)**: uncertainty in the rating (high = uncertain)
- **Volatility (σ)**: how much the player's skill fluctuates over time

**How It Works**:
\`\`\`
New player: r=1500, RD=350 (very uncertain)
After 20 games: r=1650, RD=75 (fairly certain)
After 6 months inactive: RD increases back toward 350 (uncertainty grows)
\`\`\`

**Rating Update After a Game**:
1. Expected score: E = 1 / (1 + 10^((opponent_r - my_r) / (400 * g(opponent_RD))))
   - g(RD) is a function that reduces weight of opponents with high RD
2. If I win against a higher-rated opponent: big rating gain
3. If I win against a lower-rated opponent with high RD: smaller gain (uncertain opponent)
4. RD decreases after each game (more certainty)
5. Volatility updated based on how surprising the result was

**Practical Effects**:
- **New player**: wins/losses cause large rating swings (high RD)
- **Established player**: ratings change slowly (low RD)
- **Returning player**: first few games cause larger swings (RD increased during inactivity)
- **Matchmaking uses RD**: prefer opponents with low RD (their rating is more reliable)

**Batch vs. Real-Time**:
- Original Glicko-2: batch update after a "rating period" (e.g., 1 week of games)
- Online adaptation: update after each game, but cap RD decrease per game
- This provides near-real-time rating updates while maintaining statistical properties`
      }
    ],

    requirements: ['Real-time gameplay', 'Server-side validation', 'Time control management', 'Matchmaking', 'Rating system', 'Game history'],
    components: ['WebSocket Gateway', 'Game Servers', 'Matchmaking Service', 'Rating Engine (Glicko-2)', 'PostgreSQL (game history)', 'Redis (active games + matchmaking pool)', 'Kafka (spectator events)'],
    keyDecisions: [
      'Server-authoritative game state with move validation for anti-cheat',
      'Server-side clock with network latency compensation for fair time management',
      'Rating-bucketed matchmaking pools with time-based range widening',
      'Glicko-2 rating system with rating deviation for uncertainty tracking',
      'Redis-backed active game state with crash recovery via checkpointing',
      'Separate spectator fan-out via pub/sub to avoid impacting gameplay latency'
    ],

    edgeCases: [
      { scenario: 'Clock synchronization between player clients and server', impact: 'Players see different remaining times, leading to disputes or unfair timeouts', mitigation: 'Server is authoritative for all time tracking; client clocks are display-only with periodic server sync' },
      { scenario: 'Player disconnects mid-game in a timed match', impact: 'Opponent waits indefinitely or game state becomes orphaned', mitigation: 'Grace period (30-60s) with clock still running; auto-forfeit on timeout; allow reconnection to resume' },
      { scenario: 'Rapid move sequences in bullet chess (1-minute games)', impact: 'Network latency causes move ordering issues and race conditions', mitigation: 'Server-side move validation with sequence numbers; optimistic client rendering with rollback on rejection' },
      { scenario: 'Cheating via external chess engines', impact: 'Destroys competitive integrity and drives away legitimate players', mitigation: 'Statistical move analysis comparing to engine suggestions, time-per-move pattern detection, post-game engine correlation scoring' },
      { scenario: 'Matchmaking during off-peak hours with few players online', impact: 'Long wait times or very unbalanced skill pairings', mitigation: 'Gradually widen Elo range over wait time, offer bot opponents after threshold, cross-region matching with latency warnings' },
    ],
    tradeoffs: [
      { decision: 'Server-authoritative vs client-authoritative game state', pros: 'Server-authoritative prevents cheating entirely; client-authoritative gives instant feedback', cons: 'Server-authoritative adds round-trip latency to every move; client-authoritative is exploitable', recommendation: 'Server-authoritative with optimistic client rendering and rollback on invalid moves' },
      { decision: 'WebSocket vs HTTP polling for real-time game updates', pros: 'WebSocket gives sub-50ms delivery; HTTP polling is simpler and stateless', cons: 'WebSocket requires connection management and sticky sessions; polling wastes bandwidth', recommendation: 'WebSocket for active games, HTTP for lobby and matchmaking' },
      { decision: 'Elo rating vs Glicko-2 rating system', pros: 'Elo is simple and well-understood; Glicko-2 accounts for rating uncertainty and volatility', cons: 'Elo converges slowly for new players; Glicko-2 is more complex to implement', recommendation: 'Glicko-2 for more accurate matchmaking, especially for players with few games' },
      { decision: 'Store full game history vs just final state', pros: 'Full history enables replay, analysis, and cheat detection; final state saves storage', cons: 'Full history requires more storage and indexing; final state loses analytical value', recommendation: 'Store full move history (PGN format is compact) for replay and engine analysis' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Interactive chess board with real-time updates and move validation', components: ['Web/Mobile Chess UI', 'Move Validator (client-side)', 'WebSocket Client', 'Clock Display'] },
      { name: 'Game Server Layer', purpose: 'Authoritative game state management and real-time move processing', components: ['Game State Manager', 'Move Validator (server-side)', 'Clock Service', 'WebSocket Server'] },
      { name: 'Matchmaking & Social Layer', purpose: 'Player pairing, ratings, and community features', components: ['Matchmaking Service', 'Rating Engine (Glicko-2)', 'Tournament Manager', 'Spectator Service'] },
      { name: 'Data Layer', purpose: 'Persistent storage for games, ratings, and player profiles', components: ['Redis (active game state)', 'PostgreSQL (games, ratings, profiles)', 'S3 (PGN archives)', 'Elasticsearch (game search)'] },
    ],
  },

  // ─── 21. Recommendation Engine ──────────────────────────────────────
  {
    id: 'recommendation-engine',
    isNew: true,
    title: 'Recommendation Engine',
    subtitle: 'YouTube/Netflix-Style Recommendations',
    icon: 'thumbsUp',
    color: '#e11d48',
    difficulty: 'Hard',
    description: 'Design a large-scale recommendation system using collaborative filtering, content-based, and hybrid approaches for platforms like YouTube or Netflix.',

    introduction: `Recommendation engines are the invisible backbone of every major content platform. Whether it is Netflix suggesting your next binge, YouTube autoplaying the perfect video, or Spotify creating Discover Weekly, the underlying system must sift through millions of items and billions of user signals to surface a personalized ranked list in under 200 milliseconds.

The core challenge is balancing three competing concerns: relevance (show the user things they will love), diversity (avoid filter bubbles and repetitive suggestions), and freshness (surface new content before it has engagement signals). The system must handle the cold-start problem for new users and new items, the popularity bias that drowns out niche content, and the real-time feedback loop where a single click changes the next set of recommendations.

From an infrastructure perspective, the system must serve recommendations at massive scale (millions of QPS), retrain models on petabytes of interaction data, and maintain low-latency feature stores that bridge the offline training world with the online serving world.`,

    functionalRequirements: [
      'Generate personalized ranked recommendations for each user',
      'Support multiple recommendation surfaces (home feed, "more like this", search re-ranking)',
      'Collaborative filtering: users who liked X also liked Y',
      'Content-based filtering: recommend items similar to those the user engaged with',
      'Hybrid approach combining collaborative and content-based signals',
      'Handle cold-start for new users (no history) and new items (no engagement)',
      'Real-time incorporation of user feedback (clicks, watches, skips)',
      'A/B testing framework for comparing recommendation models'
    ],

    nonFunctionalRequirements: [
      'Recommendation serving latency < 200ms at p99',
      'Support 10M+ concurrent users requesting recommendations',
      'Model retraining on full dataset completes within 6 hours',
      'Near-real-time feature updates (< 5 minute lag for user signals)',
      '99.99% availability for recommendation serving',
      'Graceful degradation: fall back to popularity-based if ML models are unavailable'
    ],

    estimation: {
      users: '500M DAU, 10M concurrent peak, each user requests recommendations ~50 times/day',
      storage: '100B+ interaction events/day (~10TB/day raw); item catalog ~50M items; user embeddings ~500M vectors',
      bandwidth: '~200KB per recommendation response * 25B requests/day = ~60PB/day egress',
      qps: '~5M recommendation requests/sec peak, ~2M feature lookups/sec, model training reads ~100TB/day'
    },

    apiDesign: {
      description: 'Internal microservice APIs for recommendation serving and feedback ingestion',
      endpoints: [
        { method: 'GET', path: '/api/recommendations/:userId', params: 'surface=home|similar|search, context, count=30, excludeIds[]', response: '{ items[{id, score, reason}], modelVersion }' },
        { method: 'POST', path: '/api/feedback', params: '{ userId, itemId, action: click|watch|skip|like|dislike, duration?, context }', response: '202 { acknowledged }' },
        { method: 'GET', path: '/api/similar/:itemId', params: 'count=20, userId?', response: '{ items[{id, score, similarity}] }' },
        { method: 'POST', path: '/api/experiments', params: '{ modelA, modelB, trafficSplit, metrics[] }', response: '201 { experimentId }' },
        { method: 'GET', path: '/api/explain/:userId/:itemId', params: '', response: '{ reasons[], topFeatures[], similarUsers[] }' }
      ]
    },

    dataModel: {
      description: 'User profiles, item metadata, interaction logs, and embedding stores',
      schema: `users {
  id: bigint PK
  signup_date: timestamp
  demographics: jsonb  -- age_bucket, country, language
  subscription_tier: enum(free, premium)
}

items {
  id: bigint PK
  type: enum(video, movie, song, article)
  title: varchar
  genres: text[]
  tags: text[]
  creator_id: bigint FK
  content_embedding: float[512]  -- from content analysis (visual, audio, text)
  popularity_score: float
  freshness_score: float
  created_at: timestamp
}

interactions {
  user_id: bigint
  item_id: bigint
  action: enum(impression, click, watch, complete, like, dislike, skip)
  watch_duration_ms: int nullable
  watch_percentage: float nullable
  context: jsonb  -- {surface, position, session_id, device}
  timestamp: timestamp
  PK(user_id, item_id, action, timestamp)
  -- Partitioned by date for efficient batch processing
}

user_embeddings (feature store) {
  user_id: bigint PK
  collaborative_vector: float[256]  -- learned from interaction patterns
  content_preference_vector: float[256]  -- aggregated from liked item embeddings
  recent_interests: jsonb  -- short-term session-based signals
  last_updated: timestamp
}

item_embeddings (feature store) {
  item_id: bigint PK
  collaborative_vector: float[256]  -- learned from user co-interactions
  content_vector: float[512]  -- from content analysis
  engagement_features: jsonb  -- {ctr, avg_watch_pct, like_rate}
  last_updated: timestamp
}`,
      examples: [
        { table: 'items', label: 'Movie item with content embedding', json: `{ "id": 829104, "type": "movie", "title": "Inception", "genres": ["Sci-Fi", "Action", "Thriller"], "tags": ["mind-bending", "dreams", "heist"], "creator_id": 1001, "content_embedding": [0.12, -0.34, 0.56, "...512 floats"], "popularity_score": 0.92, "freshness_score": 0.35, "created_at": "2010-07-16T00:00:00Z" }` },
        { table: 'interactions', label: 'User watched a movie to completion', json: `{ "user_id": 7291048, "item_id": 829104, "action": "complete", "watch_duration_ms": 8880000, "watch_percentage": 1.0, "context": {"surface": "home_feed", "position": 3, "session_id": "sess-a1b2c3", "device": "smart_tv"}, "timestamp": "2025-04-17T21:30:00Z" }` },
        { table: 'user_embeddings', label: 'User embedding with collaborative and content vectors', json: `{ "user_id": 7291048, "collaborative_vector": [0.08, -0.22, 0.41, "...256 floats"], "content_preference_vector": [0.15, -0.31, 0.67, "...256 floats"], "recent_interests": {"genres": ["Sci-Fi", "Thriller"], "avg_session_length": 3}, "last_updated": "2025-04-18T02:00:00Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/recommendation-engine/impl-basic.png',
      description: 'A single recommendation service computes suggestions by querying a database of user-item interactions, applying simple collaborative filtering (item-item similarity based on co-occurrence), and ranking by a weighted score. Models are retrained nightly in batch.',
      problems: [
        'Batch-only retraining means recommendations are stale for up to 24 hours',
        'Single-model approach cannot handle cold-start users or items',
        'Item-item similarity matrix grows quadratically and does not fit in memory',
        'No separation between candidate generation and ranking limits personalization quality',
        'No real-time feature pipeline means user actions during a session are ignored'
      ]
    },

    advancedImplementation: {
      title: 'Multi-Stage Recommendation Pipeline with Real-Time Features',
      diagramSrc: '/diagrams/recommendation-engine/impl-advanced.png',
      description: 'A three-stage pipeline: (1) Candidate Generation narrows millions of items to ~1000 using multiple retrieval strategies (collaborative ANN, content-based ANN, trending, social graph); (2) Ranking scores each candidate with a deep neural network using rich user/item/context features; (3) Re-ranking applies business rules (diversity, freshness boost, deduplication). A real-time feature pipeline via Kafka + Flink updates user signals within seconds.',
      keyPoints: [
        'Multiple candidate generators run in parallel: collaborative filtering ANN, content-based ANN, trending, editorial curated',
        'Two-tower model for candidate generation: user tower and item tower produce embeddings, ANN search finds nearest items',
        'Ranking model: deep neural network (Wide & Deep or DCN) with hundreds of features including user history, item features, and cross-features',
        'Real-time feature pipeline: Kafka ingests clicks/watches -> Flink computes session features -> Feature Store updated in < 1 minute',
        'Feature Store (Redis + DynamoDB): serves pre-computed features at low latency during online inference',
        'Model serving via TensorFlow Serving or Triton with GPU inference, batched requests for throughput'
      ],
      databaseChoice: 'Feature Store (Redis for hot features, DynamoDB for warm); Vector DB (Milvus/Pinecone) for ANN retrieval; Hive/Spark for batch training data; Kafka + Flink for real-time stream processing; PostgreSQL for experiment configuration',
      caching: 'Pre-computed recommendation lists cached in Redis for users with stable preferences (TTL 15 min); candidate sets cached per retrieval strategy; feature vectors cached in Feature Store with tiered TTLs (real-time features: 1 min, batch features: 6 hours)'
    },

    tips: [
      'Start by clarifying the scale and type of content (videos, products, articles) as this affects the approach',
      'The two-phase architecture (candidate generation + ranking) is essential -- explain why single-phase does not scale',
      'Discuss the cold-start problem explicitly: new users get popularity/trending, new items get content-based boosting',
      'Emphasize the feedback loop: impressions -> interactions -> model updates -> better impressions',
      'Mention the exploration-exploitation tradeoff: always showing "safe" recommendations creates filter bubbles',
      'A/B testing is critical: discuss how you measure recommendation quality (CTR, watch time, retention, diversity)'
    ],

    keyQuestions: [
      {
        question: 'How does collaborative filtering work at scale?',
        answer: `**Core Idea**: Users who interacted with similar items have similar preferences.

**Matrix Factorization Approach**:
- Build a user-item interaction matrix (sparse: most entries are missing)
- Factorize into two lower-rank matrices: User matrix (N x k) and Item matrix (M x k)
- Each user and item is represented as a k-dimensional vector (embedding)
- Predicted score = dot product of user and item vectors

**Training** (Alternating Least Squares or SGD):
\`\`\`
For each known interaction (user_i, item_j, rating):
  Minimize: (rating - dot(user_vec_i, item_vec_j))^2 + regularization
\`\`\`

**Scaling to Billions of Interactions**:
- **Distributed training**: Spark MLlib or parameter server architecture
- Partition the interaction matrix by user shards
- Each worker processes its shard, synchronizes embeddings periodically
- Training on 100B interactions takes ~4 hours on a 100-node Spark cluster

**Serving** (Approximate Nearest Neighbor):
- Once trained, each user has a fixed embedding vector
- To get recommendations: find the top-K item vectors nearest to the user vector
- Use ANN index (HNSW, IVF) for sub-millisecond retrieval from millions of items
- Libraries: Faiss (Facebook), ScaNN (Google), Milvus (open source)

**Implicit Feedback** (more realistic than explicit ratings):
- Weighted by engagement: watch_completion > click > impression
- One-class problem: we observe positive signals but "no interaction" is ambiguous (not interested vs. never seen)
- Bayesian Personalized Ranking (BPR): optimize relative ordering of items per user`
      },
      {
        question: 'How do you handle the cold-start problem?',
        answer: `**Cold-Start Users** (no interaction history):

**Onboarding Signals**:
- Explicit preferences during signup (genre picks, favorite creators)
- Demographic features: age bucket, country, language -> demographic cohort recommendations
- Device/platform signals: iOS vs. Android, time zone

**Bandit-Based Exploration**:
- Treat new user's first N sessions as exploration
- Thompson Sampling: show items from diverse categories, observe reactions
- Each interaction rapidly narrows the user's preference estimate
- Transition to full personalization after ~20-30 interactions

**Cold-Start Items** (no engagement data):

**Content-Based Bootstrapping**:
- Extract content features: visual (CNN), audio (spectrogram), text (BERT embeddings)
- Find nearest existing items by content similarity
- "Borrow" engagement predictions from similar items
- Boost exposure in candidate generation to accumulate real signals

**Exploration Budget**:
- Reserve 5-10% of recommendation slots for cold-start items
- Distribute new items across diverse user segments to gather broad signal
- Use contextual bandits: show new item to users most likely to engage (based on content match)

**Measuring Cold-Start Performance**:
- Track "time to first meaningful engagement" for new users
- Track "impressions needed to reach stable CTR prediction" for new items
- Target: new users get personalized recommendations within 5 interactions; new items get stable predictions within 1000 impressions`
      },
      {
        question: 'How does the real-time feature pipeline work?',
        answer: `**Why Real-Time Matters**:
- User watches a cooking video -> next recommendations should reflect this immediately
- Without real-time: user sees stale recommendations until next batch retrain (hours later)
- Goal: user actions reflected in recommendations within 1-5 minutes

**Architecture**:
\`\`\`
User action -> API -> Kafka (interaction events)
                         |
                    Flink jobs (stream processing)
                         |
                    Feature Store (Redis)
                         |
                    Recommendation Service reads updated features
\`\`\`

**Feature Types by Freshness**:
- **Real-time (< 1 min)**: session features (last 10 items viewed, current category distribution), active device
- **Near-real-time (< 1 hour)**: user engagement rates updated with recent actions, trending scores
- **Batch (6-24 hours)**: user/item embeddings from full model retrain, long-term preference vectors

**Flink Processing Examples**:
\`\`\`
// Sliding window: user's genre distribution in last 30 minutes
SELECT user_id,
       genre,
       COUNT(*) as genre_count,
       AVG(watch_percentage) as avg_watch_pct
FROM interactions
WHERE timestamp > now() - INTERVAL 30 MINUTES
GROUP BY user_id, genre
\`\`\`

**Feature Store Design**:
- **Write path**: Flink outputs -> Redis (real-time features) + DynamoDB (durable backup)
- **Read path**: Recommendation service batch-fetches features for all candidates
  - Single round-trip via Redis MGET for user + candidate features
  - Latency budget: 10-20ms for feature retrieval
- **Fallback**: if real-time features are unavailable, use last-known batch features (slightly stale but always available)

**Consistency**:
- Features are eventually consistent (acceptable for recommendations)
- Version each feature update to prevent out-of-order writes
- Monitor feature freshness: alert if any feature type lags beyond its SLA`
      }
    ],

    requirements: ['Personalized ranking', 'Collaborative filtering', 'Content-based filtering', 'Cold-start handling', 'Real-time feature pipeline', 'A/B testing'],
    components: ['Recommendation Service', 'Candidate Generators', 'Ranking Model (TF Serving)', 'Feature Store (Redis + DynamoDB)', 'Kafka + Flink (real-time pipeline)', 'Vector DB (Milvus)', 'Spark (batch training)', 'Experiment Platform'],
    keyDecisions: [
      'Multi-stage pipeline (candidate generation -> ranking -> re-ranking) for scalable personalization',
      'Two-tower embedding model for candidate generation enabling sub-millisecond ANN retrieval',
      'Real-time feature pipeline via Kafka + Flink for session-aware recommendations',
      'Feature Store with tiered freshness (real-time, near-real-time, batch) for optimal latency',
      'Exploration budget (5-10% of slots) with contextual bandits for cold-start items',
      'Offline-online consistency: same feature definitions used in training and serving to prevent skew'
    ],
    edgeCases: [
      { scenario: 'New user with no interaction history (cold start)', impact: 'Collaborative filtering produces empty or random recommendations, driving user churn', mitigation: 'Fall back to content-based and popularity-based recommendations, use onboarding preference surveys to bootstrap user profile' },
      { scenario: 'Popularity bias drowning out long-tail items', impact: 'Popular items dominate all recommendation slots, niche content never surfaces', mitigation: 'Apply inverse propensity scoring, reserve exploration slots (5-10%) for long-tail items using contextual bandits' },
      { scenario: 'Feedback loop amplifying filter bubbles', impact: 'Users only see content similar to past clicks, reducing diversity and engagement over time', mitigation: 'Inject diversity constraints in re-ranking, track and optimize for long-term engagement metrics not just click-through rate' },
      { scenario: 'Item catalog update with millions of new products', impact: 'Embedding index becomes stale, new items have no vectors and are invisible to ANN retrieval', mitigation: 'Incremental index updates with real-time embedding generation for new items, use content features as fallback until collaborative signals accumulate' },
      { scenario: 'Adversarial click farms inflating item signals', impact: 'Fraudulent engagement data corrupts collaborative filtering models', mitigation: 'Anomaly detection on interaction patterns, weight interactions by user trust score, use implicit signals (dwell time) that are harder to fake' },
    ],
    tradeoffs: [
      { decision: 'Collaborative filtering vs content-based filtering', pros: 'Collaborative captures latent preferences; content-based works for cold-start items', cons: 'Collaborative needs large interaction data; content-based misses serendipitous discoveries', recommendation: 'Hybrid approach: collaborative for warm users, content-based for cold-start, blend scores in ranking layer' },
      { decision: 'Batch model retraining vs online learning', pros: 'Batch is simpler and reproducible; online learning adapts to trends in real time', cons: 'Batch models are stale between retrains; online learning is complex and prone to instability', recommendation: 'Batch retraining daily for base model, real-time feature updates via streaming pipeline for session-aware signals' },
      { decision: 'Pre-computed recommendations vs real-time inference', pros: 'Pre-computed is fast and cheap to serve; real-time adapts to current context', cons: 'Pre-computed cannot react to session signals; real-time adds serving latency and cost', recommendation: 'Pre-compute candidate sets offline, re-rank in real time using session features for the best balance of freshness and latency' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Display personalized feeds and capture user interaction signals', components: ['Web/Mobile Client', 'Event Tracker (clicks, views, dwell time)', 'A/B Test SDK'] },
      { name: 'API & Orchestration Layer', purpose: 'Route recommendation requests and blend results from multiple sources', components: ['Recommendation API', 'Experiment Router', 'Result Blender', 'Feature Gateway'] },
      { name: 'Candidate Generation Layer', purpose: 'Retrieve a broad set of relevant items from multiple retrieval sources', components: ['Collaborative Filtering (ANN/Milvus)', 'Content-Based Retrieval', 'Trending/Popularity Service', 'Two-Tower Embedding Model'] },
      { name: 'Ranking & Re-Ranking Layer', purpose: 'Score and re-order candidates using ML models and business rules', components: ['Ranking Model (TF Serving)', 'Diversity Re-Ranker', 'Business Rules Engine', 'Exploration/Exploitation Module'] },
      { name: 'Data & Training Layer', purpose: 'Store features, train models, and process interaction streams', components: ['Feature Store (Redis + DynamoDB)', 'Kafka + Flink (streaming)', 'Spark (batch training)', 'Model Registry'] },
    ],
  },

  // ─── 22. ChatGPT / LLM System ──────────────────────────────────────
  {
    id: 'chatgpt-llm-system',
    isNew: true,
    title: 'ChatGPT / LLM System',
    subtitle: 'Large Language Model Serving Platform',
    icon: 'cpu',
    color: '#10a37f',
    difficulty: 'Hard',
    description: 'Design an LLM serving platform with inference optimization, conversation management, and GPU cluster orchestration similar to ChatGPT.',

    introduction: `Serving large language models at scale is one of the most challenging distributed systems problems in modern computing. Unlike traditional web services where request processing takes milliseconds, a single LLM inference request can take 10-60 seconds, consume gigabytes of GPU memory, and generate output token-by-token in an autoregressive loop.

The system must manage GPU clusters worth hundreds of millions of dollars, balance request queues across heterogeneous hardware (A100, H100, different memory configurations), and implement sophisticated inference optimizations (KV-cache management, continuous batching, speculative decoding) to maximize throughput while maintaining acceptable latency.

Beyond raw inference, the platform must handle conversation history (multi-turn context windows), streaming token delivery to clients, content safety filtering, rate limiting per user and organization, and graceful degradation when demand exceeds capacity. The cost of GPU compute makes efficiency not just a performance concern but an existential business requirement.`,

    functionalRequirements: [
      'Accept text prompts and return generated completions (chat and completion modes)',
      'Multi-turn conversation with persistent context',
      'Streaming token-by-token response delivery via SSE',
      'Support multiple model sizes (GPT-4-class, GPT-3.5-class, fine-tuned variants)',
      'System prompts, temperature, max_tokens, and other generation parameters',
      'Function calling / tool use capabilities',
      'Content safety filtering on inputs and outputs',
      'Organization and API key management with usage tracking'
    ],

    nonFunctionalRequirements: [
      'Time-to-first-token (TTFT) < 2 seconds at p95',
      'Token generation throughput > 30 tokens/sec per request',
      'Support 1M+ concurrent conversations',
      'GPU utilization > 70% across the cluster',
      '99.9% availability (with graceful degradation under overload)',
      'Cost-efficient: maximize tokens generated per GPU-hour'
    ],

    estimation: {
      users: '100M weekly users, 10M concurrent conversations at peak',
      storage: '~2KB avg per conversation turn * 1B turns/day = ~2TB/day conversation data; model weights: 500GB-1TB per model',
      bandwidth: '~500 bytes/token * 50 tokens/sec * 10M concurrent = ~250GB/sec peak output bandwidth',
      qps: '~500K new requests/sec peak, each generating 200-2000 tokens over 5-30 seconds'
    },

    apiDesign: {
      description: 'REST API for chat completions with SSE streaming, plus management endpoints',
      endpoints: [
        { method: 'POST', path: '/v1/chat/completions', params: '{ model, messages[{role, content}], stream?, temperature, max_tokens, tools[]? }', response: 'SSE stream: data: {choices[{delta:{content}}]}\n or JSON {choices[{message}]}' },
        { method: 'POST', path: '/v1/completions', params: '{ model, prompt, max_tokens, temperature, stop[] }', response: '{ choices[{text}], usage }' },
        { method: 'GET', path: '/v1/models', params: '', response: '{ data[{id, created, owned_by, context_length}] }' },
        { method: 'POST', path: '/v1/moderations', params: '{ input }', response: '{ results[{flagged, categories}] }' },
        { method: 'GET', path: '/v1/usage', params: 'start_date, end_date, org_id?', response: '{ daily[{date, tokens_input, tokens_output, cost}] }' }
      ]
    },

    dataModel: {
      description: 'Conversations, usage tracking, model registry, and inference metadata',
      schema: `conversations {
  id: uuid PK
  user_id: bigint FK
  org_id: bigint FK nullable
  model: varchar(50)
  system_prompt: text nullable
  created_at: timestamp
  last_active_at: timestamp
  total_tokens: bigint
}

messages {
  id: uuid PK
  conversation_id: uuid FK
  role: enum(system, user, assistant, tool)
  content: text
  tool_calls: jsonb nullable
  token_count: int
  model_version: varchar
  latency_ms: int
  created_at: timestamp
}

api_keys {
  id: uuid PK
  org_id: bigint FK
  key_hash: varchar(64) unique
  name: varchar
  rate_limit_rpm: int
  rate_limit_tpm: int
  created_at: timestamp
  revoked_at: timestamp nullable
}

usage_records {
  id: bigint PK
  org_id: bigint FK
  api_key_id: uuid FK
  model: varchar(50)
  input_tokens: int
  output_tokens: int
  cost_cents: int
  request_id: uuid
  timestamp: timestamp
  -- Partitioned by date + org_id
}

model_registry {
  id: varchar PK  -- e.g., "gpt-4-turbo-2024-04-09"
  base_model: varchar
  context_length: int
  gpu_memory_gb: float
  min_gpus: int
  tensor_parallel_degree: int
  status: enum(active, deprecated, canary)
  deployed_at: timestamp
}`,
      examples: [
        { table: 'conversations', label: 'Active coding assistant conversation', json: `{ "id": "conv-d4e5f6a7", "user_id": 82910, "org_id": 3001, "model": "gpt-4-turbo", "system_prompt": "You are a helpful coding assistant.", "created_at": "2025-04-18T10:00:00Z", "last_active_at": "2025-04-18T10:42:15Z", "total_tokens": 14820 }` },
        { table: 'messages', label: 'Assistant response with latency', json: `{ "id": "msg-b8c9d0e1", "conversation_id": "conv-d4e5f6a7", "role": "assistant", "content": "Here is a Python function that implements binary search...", "tool_calls": null, "token_count": 342, "model_version": "gpt-4-turbo-2024-04-09", "latency_ms": 2840, "created_at": "2025-04-18T10:42:15Z" }` },
        { table: 'usage_records', label: 'Token usage for billing', json: `{ "id": 49201837, "org_id": 3001, "api_key_id": "key-a1b2c3d4", "model": "gpt-4-turbo", "input_tokens": 1250, "output_tokens": 342, "cost_cents": 8, "request_id": "req-f5e4d3c2", "timestamp": "2025-04-18T10:42:15Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/chatgpt-llm-system/impl-basic.png',
      description: 'Requests hit an API gateway that routes to a pool of GPU servers, each running a single model instance. One request occupies one GPU until completion. Conversations are stored in a database and the full history is sent with each request.',
      problems: [
        'One-request-per-GPU utilization is extremely wasteful (GPU idle during I/O and between tokens)',
        'No batching means throughput is limited to single-digit requests per GPU',
        'Sending full conversation history with each request wastes input processing time',
        'No KV-cache reuse means redundant computation for every turn in a conversation',
        'Single model size per server prevents mixing workloads for optimal utilization'
      ]
    },

    advancedImplementation: {
      title: 'Optimized LLM Serving with Continuous Batching and KV-Cache Management',
      diagramSrc: '/diagrams/chatgpt-llm-system/impl-advanced.png',
      description: 'An inference engine (like vLLM) implements continuous batching: new requests are inserted into a running batch as slots become available, maximizing GPU utilization. PagedAttention manages KV-cache memory like virtual memory pages, preventing fragmentation. A global scheduler routes requests to the optimal GPU based on model affinity, current load, and KV-cache availability. Tensor parallelism splits large models across multiple GPUs.',
      keyPoints: [
        'Continuous batching (iteration-level scheduling): unlike static batching, new requests join mid-batch as others complete, keeping GPUs saturated',
        'PagedAttention (vLLM): KV-cache stored in non-contiguous memory pages, allocated on demand, enabling 2-4x more concurrent requests per GPU',
        'Prefix caching: shared system prompts and repeated conversation prefixes reuse cached KV blocks across requests',
        'Speculative decoding: small draft model generates candidate tokens, large model verifies in parallel, reducing latency by 2-3x for some workloads',
        'Tensor parallelism for large models: split model layers across 4-8 GPUs with NVLink interconnect for low-latency all-reduce',
        'Global request scheduler: routes based on model affinity (warm weights), GPU memory availability, queue depth, and SLO tier'
      ],
      databaseChoice: 'PostgreSQL for conversations and usage records; Redis for rate limiting, session state, and request queue management; S3 for model weight storage; etcd for cluster coordination and model registry; ClickHouse for usage analytics',
      caching: 'GPU KV-cache for active conversations (PagedAttention); prefix cache for common system prompts; Redis for conversation metadata and rate limit counters; CDN for static model documentation and API responses'
    },

    tips: [
      'Clarify the scope: focus on the inference serving infrastructure, not the model training pipeline',
      'Continuous batching is the single most important optimization -- explain how it differs from static batching',
      'KV-cache management is the key memory bottleneck -- discuss PagedAttention or similar approaches',
      'Discuss the prefill vs. decode phases: prefill is compute-bound, decode is memory-bandwidth-bound',
      'Mention GPU cluster economics: a single H100 costs ~$30K, so utilization is critical',
      'Content safety as a separate pipeline: moderation model checks input before inference and output before delivery'
    ],

    keyQuestions: [
      {
        question: 'How does continuous batching work?',
        answer: `**Problem with Static Batching**:
- Collect N requests, process as a batch, wait for ALL to finish
- Short requests (20 tokens) wait for long requests (2000 tokens) in the same batch
- GPU idle time while waiting for the batch to fill
- Throughput: ~5-10 requests/sec per GPU

**Continuous Batching (Iteration-Level Scheduling)**:
\`\`\`
Iteration 1: [Req_A(token 1), Req_B(token 1), Req_C(token 1)]
Iteration 2: [Req_A(token 2), Req_B(DONE), Req_C(token 2)]
             -> Req_B slot freed, Req_D joins immediately
Iteration 3: [Req_A(token 3), Req_D(token 1), Req_C(token 3)]
\`\`\`

**How It Works**:
1. Maintain a running batch of active requests
2. Each iteration: generate one token for each request in the batch
3. When any request completes (hits stop token or max_tokens):
   - Remove it from the batch
   - Immediately insert the next waiting request
4. New requests start generating within one iteration (~50ms)

**Benefits**:
- GPU never idles waiting for batch to fill
- Short requests complete quickly without being blocked by long ones
- Throughput: ~50-200 requests/sec per GPU (10-20x improvement)
- TTFT reduced because requests do not wait for a full batch

**Memory Management Challenge**:
- Each request in the batch needs KV-cache memory
- Batch size limited by total GPU memory available for KV-cache
- PagedAttention solves this by eliminating memory fragmentation

**Prefill vs. Decode Phases**:
- Prefill (processing input tokens): compute-bound, benefits from parallelism
- Decode (generating output tokens): memory-bandwidth-bound, one token at a time
- Advanced systems separate prefill and decode into different GPU pools`
      },
      {
        question: 'How do you manage KV-cache memory efficiently?',
        answer: `**The KV-Cache Problem**:
- For each token in the context, the model stores Key and Value tensors for every attention layer
- GPT-4 class model: ~1-2MB of KV-cache per token per request
- 4096 token context: ~4-8GB of KV-cache per request
- A single 80GB A100 can only hold 10-20 concurrent requests!

**Traditional Approach (Wasteful)**:
- Pre-allocate max_context_length of KV-cache per request
- If max is 8192 but actual context is 500 tokens: 94% of allocated memory is wasted
- Result: far fewer concurrent requests than GPU memory allows

**PagedAttention (vLLM)**:
\`\`\`
Physical GPU memory divided into fixed-size "pages" (e.g., 16 tokens each)

Request A (200 tokens): Pages [P1, P2, ..., P13] (allocated on demand)
Request B (50 tokens):  Pages [P14, P15, P16, P17]
Request C (300 tokens): Pages [P18, ..., P37]

As Request B generates more tokens:
  New pages allocated: P38, P39, ... (non-contiguous, that is fine!)

When Request A completes:
  Pages [P1-P13] freed immediately, available for new requests
\`\`\`

**Benefits**:
- Near-zero memory waste (only last page may have unused slots)
- 2-4x more concurrent requests compared to pre-allocation
- Pages can be shared across requests (prefix caching)

**Prefix Caching**:
- Many requests share the same system prompt (e.g., "You are a helpful assistant...")
- Compute KV-cache for the system prompt once, share pages across all requests
- For a 500-token system prompt: saves 500-1000MB of KV-cache per request
- Particularly valuable for function-calling prompts (large tool definitions)

**Eviction Policy** (when GPU memory is full):
- Priority queue: premium tier users kept in GPU memory, free tier swapped
- Swap KV-cache to CPU memory (10x slower but cheaper than recomputation)
- Last resort: preempt lowest-priority request, recompute from scratch later`
      },
      {
        question: 'How do you handle GPU cluster scheduling and routing?',
        answer: `**Cluster Topology**:
\`\`\`
GPU Cluster (thousands of GPUs):
  ├── Model Pool: GPT-4 (8x H100 per instance, tensor parallel)
  │     ├── Instance 1: [GPU 0-7] - 12 active requests
  │     ├── Instance 2: [GPU 8-15] - 8 active requests (has capacity)
  │     └── Instance 3: [GPU 16-23] - 15 active requests (at capacity)
  ├── Model Pool: GPT-3.5 (1x A100 per instance)
  │     ├── Instance 1-50: varying load
  │     └── ...
  └── Model Pool: Fine-tuned variants (mixed hardware)
\`\`\`

**Global Request Scheduler**:
1. Request arrives at API Gateway
2. Scheduler selects target instance based on:
   - **Model match**: route to instances running the requested model
   - **KV-cache affinity**: if this is a multi-turn conversation, route to the instance that has the KV-cache from the previous turn (avoid recomputation)
   - **Load balancing**: prefer instances with lower queue depth
   - **SLO tier**: premium users routed to less-loaded instances
   - **Memory availability**: check if instance has enough KV-cache memory for the request

**Autoscaling**:
- Scale based on queue depth and average TTFT, not just GPU utilization
- Scale-up is slow (loading model weights takes 2-5 minutes for large models)
- Keep warm spare capacity: always maintain 10-15% idle instances
- Predictive scaling: use historical traffic patterns (traffic doubles during US business hours)

**Handling Overload**:
- Priority queuing: premium requests skip ahead of free-tier
- Request shedding: reject lowest-priority requests with 429 status when queue exceeds threshold
- Graceful degradation: offer smaller/faster model as fallback ("GPT-4 is busy, GPT-3.5 available")
- Token budget management: limit max_tokens for free-tier during peak to increase throughput

**Fault Tolerance**:
- GPU failure detection via heartbeat (5-second timeout)
- Running requests on failed GPU: client receives error, retries on different instance
- KV-cache is ephemeral: loss means re-prefill (extra latency but not data loss)
- Model weight replication: weights stored in shared storage (S3), loaded on demand`
      }
    ],

    requirements: ['Chat completions API', 'Streaming token delivery', 'Conversation management', 'GPU cluster orchestration', 'Rate limiting and billing', 'Content safety'],
    components: ['API Gateway', 'Global Request Scheduler', 'Inference Engine (vLLM)', 'GPU Clusters (H100/A100)', 'KV-Cache Manager (PagedAttention)', 'PostgreSQL (conversations)', 'Redis (rate limits + queues)', 'Model Registry (etcd)'],
    keyDecisions: [
      'Continuous batching at the iteration level for 10-20x throughput improvement over static batching',
      'PagedAttention for KV-cache memory management eliminating fragmentation waste',
      'Prefix caching for shared system prompts reducing per-request memory and compute',
      'KV-cache affinity routing for multi-turn conversations avoiding redundant prefill',
      'Separate prefill and decode GPU pools for workload-specific optimization',
      'Priority-based request scheduling with graceful degradation under overload'
    ],
    edgeCases: [
      { scenario: 'GPU out-of-memory during long context inference', impact: 'Request fails mid-generation, wasting compute and degrading user experience', mitigation: 'Implement KV-cache offloading to CPU/NVMe, set max context limits, use PagedAttention for memory efficiency' },
      { scenario: 'Prompt injection bypassing safety filters', impact: 'Model produces harmful or policy-violating content', mitigation: 'Multi-layer filtering (input classifier + output classifier), constitutional AI guardrails, human-in-the-loop for edge cases' },
      { scenario: 'Thundering herd after model update deployment', impact: 'All cached KV-caches invalidated simultaneously, causing latency spike', mitigation: 'Rolling deployment across GPU fleet, warm up new model instances before routing traffic, keep old model as fallback' },
      { scenario: 'Token generation stuck in repetition loop', impact: 'Response consumes max tokens with repetitive content, wasting compute', mitigation: 'Implement repetition penalty, frequency penalty, and early termination on repetition detection' },
    ],
    tradeoffs: [
      { decision: 'Larger model vs smaller fine-tuned model', pros: 'Large models handle diverse tasks; small fine-tuned models are cheaper and faster', cons: 'Large models cost 10-100x more per token; small models fail on out-of-distribution queries', recommendation: 'Route simple queries to small models, complex/creative queries to large models using a classifier' },
      { decision: 'Streaming vs batch response', pros: 'Streaming gives perceived low latency; batch allows full response optimization', cons: 'Streaming complicates error handling; batch has high time-to-first-token', recommendation: 'Stream by default for chat, batch for API integrations needing complete responses' },
      { decision: 'Shared GPU cluster vs dedicated instances', pros: 'Shared maximizes utilization; dedicated gives predictable latency', cons: 'Shared causes noisy-neighbor issues; dedicated wastes idle capacity', recommendation: 'Shared for batch/async workloads, dedicated for latency-sensitive real-time chat' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Chat interface, streaming display, and conversation management', components: ['Web/Mobile Client', 'SSE/WebSocket Handler', 'Conversation Store'] },
      { name: 'API & Routing Layer', purpose: 'Request routing, rate limiting, and model selection', components: ['API Gateway', 'Model Router', 'Rate Limiter', 'Safety Classifier'] },
      { name: 'Inference Layer', purpose: 'Run model inference with optimized serving', components: ['vLLM/TensorRT-LLM', 'KV-Cache Manager', 'Batch Scheduler', 'GPU Fleet'] },
      { name: 'Data & Feedback Layer', purpose: 'Store conversations, collect feedback, and fine-tune', components: ['Conversation DB', 'Feedback Pipeline', 'RLHF Training', 'Prompt Cache (Redis)'] },
    ],
  },

  // ─── 23. Deployment System ──────────────────────────────────────────
  {
    id: 'deployment-system',
    isNew: true,
    title: 'Deployment System',
    subtitle: 'CI/CD at Scale',
    icon: 'upload',
    color: '#6366f1',
    difficulty: 'Hard',
    description: 'Design a deployment system supporting blue-green, canary, and rolling deployments with CI/CD pipelines at scale.',

    introduction: `A deployment system is the bridge between source code and production. At scale, companies deploy thousands of times per day across hundreds of microservices, and a bad deployment can take down the entire platform. The system must provide both velocity (developers ship fast) and safety (bad code is caught before it reaches all users).

The core challenge is managing the lifecycle of a deployment: building the artifact (container image), running tests, gradually rolling out to production instances, monitoring health metrics, and automatically rolling back if something goes wrong. Each deployment strategy (blue-green, canary, rolling) offers different tradeoffs between speed, resource cost, and risk.

Beyond the mechanics of placing containers on servers, the system must handle dependency management (service A depends on service B version >= 2.0), configuration management (feature flags, environment variables), and observability integration (connecting deployment events to metrics dashboards for impact correlation).`,

    functionalRequirements: [
      'CI pipeline: build, test, and produce deployment artifacts (container images)',
      'Multiple deployment strategies: blue-green, canary, rolling update',
      'Automatic rollback on health check failure or metric degradation',
      'Deployment pipeline with approval gates (staging -> canary -> production)',
      'Configuration and secret management per environment',
      'Deployment history, audit log, and diff visualization',
      'Feature flag integration for decoupling deployment from release',
      'Multi-region deployment orchestration'
    ],

    nonFunctionalRequirements: [
      'Zero-downtime deployments (no dropped requests during rollout)',
      'Canary analysis detects regressions within 5 minutes',
      'Rollback completes in < 60 seconds',
      'Support 500+ microservices with 2000+ deployments per day',
      'Build pipeline completes in < 10 minutes for 95% of services',
      '99.99% availability of the deployment platform itself'
    ],

    estimation: {
      users: '5000 engineers, 500 microservices, ~2000 deployments/day, ~100 concurrent builds',
      storage: '~500MB avg container image * 2000 builds/day = ~1TB/day of artifacts (with layer deduplication ~200GB/day net new)',
      bandwidth: '~50GB/hour during peak deployment windows (image pulls across regions)',
      qps: '~100 build triggers/min peak, ~50 deployments/min peak, ~10K health check probes/sec'
    },

    apiDesign: {
      description: 'REST API for pipeline management, webhooks for CI triggers, gRPC for agent communication',
      endpoints: [
        { method: 'POST', path: '/api/pipelines/:serviceId/trigger', params: '{ commitSha, branch, triggeredBy }', response: '201 { pipelineId, status: building }' },
        { method: 'POST', path: '/api/deployments', params: '{ serviceId, imageTag, strategy: blue-green|canary|rolling, regions[], config }', response: '201 { deploymentId, status: pending }' },
        { method: 'POST', path: '/api/deployments/:deploymentId/promote', params: '{ targetPercentage }', response: '200 { status: promoting }' },
        { method: 'POST', path: '/api/deployments/:deploymentId/rollback', params: '{ reason }', response: '200 { status: rolling_back, targetVersion }' },
        { method: 'GET', path: '/api/deployments/:deploymentId/status', params: '', response: '{ status, percentage, healthMetrics, canaryAnalysis }' },
        { method: 'GET', path: '/api/services/:serviceId/history', params: 'limit, cursor', response: '{ deployments[], currentVersion }' }
      ]
    },

    dataModel: {
      description: 'Services, pipelines, deployments, and health metrics',
      schema: `services {
  id: varchar PK  -- e.g., "payment-service"
  team_id: bigint FK
  repo_url: varchar
  default_strategy: enum(blue_green, canary, rolling)
  health_check_path: varchar
  min_instances: int
  max_instances: int
  regions: text[]
  config_template: jsonb
  created_at: timestamp
}

pipelines {
  id: uuid PK
  service_id: varchar FK
  commit_sha: varchar(40)
  branch: varchar
  status: enum(building, testing, artifact_ready, failed)
  image_tag: varchar nullable
  build_duration_ms: int nullable
  test_results: jsonb nullable
  triggered_by: varchar
  created_at: timestamp
}

deployments {
  id: uuid PK
  service_id: varchar FK
  pipeline_id: uuid FK
  image_tag: varchar
  strategy: enum(blue_green, canary, rolling)
  status: enum(pending, in_progress, canary_analysis, promoting, complete, rolled_back, failed)
  current_percentage: int  -- % of traffic on new version
  previous_version: varchar
  regions: text[]
  config_snapshot: jsonb
  approved_by: varchar nullable
  started_at: timestamp
  completed_at: timestamp nullable
}

deployment_events {
  id: bigint PK
  deployment_id: uuid FK
  event_type: enum(started, health_check_pass, health_check_fail, canary_pass, canary_fail, promoted, rolled_back)
  details: jsonb
  timestamp: timestamp
}

canary_metrics {
  deployment_id: uuid FK
  metric_name: varchar  -- e.g., "error_rate", "p99_latency", "cpu_usage"
  canary_value: float
  baseline_value: float
  verdict: enum(pass, fail, inconclusive)
  sample_size: int
  measured_at: timestamp
  PK(deployment_id, metric_name, measured_at)
}`,
      examples: [
        { table: 'deployments', label: 'Canary deployment at 5% traffic', json: `{ "id": "dep-a7b8c9d0", "service_id": "payment-service", "pipeline_id": "pipe-e1f2a3b4", "image_tag": "v2.14.0-rc3", "strategy": "canary", "status": "canary_analysis", "current_percentage": 5, "previous_version": "v2.13.2", "regions": ["us-east-1", "eu-west-1"], "config_snapshot": {"replicas": 3, "memory": "512Mi"}, "approved_by": null, "started_at": "2025-04-18T09:00:00Z", "completed_at": null }` },
        { table: 'canary_metrics', label: 'Canary vs baseline error rate comparison', json: `{ "deployment_id": "dep-a7b8c9d0", "metric_name": "error_rate", "canary_value": 0.012, "baseline_value": 0.009, "verdict": "pass", "sample_size": 14200, "measured_at": "2025-04-18T09:15:00Z" }` },
        { table: 'deployment_events', label: 'Health check passed event', json: `{ "id": 892014, "deployment_id": "dep-a7b8c9d0", "event_type": "health_check_pass", "details": {"region": "us-east-1", "instances_healthy": 3, "response_time_ms": 42}, "timestamp": "2025-04-18T09:02:30Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/deployment-system/impl-basic.png',
      description: 'A CI server builds container images on commit, pushes to a registry, and a deployment controller replaces all running instances with the new version. Health checks run after replacement. If health checks fail, the previous version is redeployed.',
      problems: [
        'All-at-once replacement causes downtime during the switch',
        'No canary analysis: problems are only caught after full rollout',
        'Single-region deployment does not account for region-specific failures',
        'No automated rollback: operators must manually trigger revert',
        'Build queue bottleneck: sequential builds block deployments during peak hours'
      ]
    },

    advancedImplementation: {
      title: 'Progressive Delivery Platform with Automated Canary Analysis',
      diagramSrc: '/diagrams/deployment-system/impl-advanced.png',
      description: 'A deployment controller manages progressive rollouts: canary (1% -> 5% -> 25% -> 100%) with automated statistical analysis at each stage. Traffic splitting is done at the service mesh level (Envoy/Istio) by adjusting routing weights. A canary analysis engine compares real-time metrics between the canary and baseline using statistical tests (Mann-Whitney U). Blue-green deployments maintain two full environments with instant traffic switch via DNS or load balancer.',
      keyPoints: [
        'Service mesh (Envoy/Istio) handles traffic splitting: route X% to canary pods based on weighted routing rules',
        'Canary analysis engine: compares error rate, latency percentiles, and custom metrics between canary and baseline using Mann-Whitney U test',
        'Blue-green via dual target groups: both versions running simultaneously, ALB switches traffic atomically',
        'Rolling update with surge capacity: deploy to N+1 instances, drain connections from old instance, then terminate',
        'Multi-region orchestration: deploy to staging region first, then roll out to production regions sequentially with bake time between regions',
        'GitOps model: desired state stored in Git, deployment controller reconciles actual state to match'
      ],
      databaseChoice: 'PostgreSQL for deployment history and service configuration; Redis for deployment locks and real-time status; S3 for build artifacts and container images; etcd for service mesh configuration; Prometheus/ClickHouse for canary metrics',
      caching: 'Container image layer caching in registry (deduplication saves 60-80% storage); build cache per service (dependency cache, compilation cache); DNS TTL management for blue-green switches (low TTL before switch, raise after)'
    },

    tips: [
      'Start by clarifying the deployment strategy focus: canary vs. blue-green vs. rolling have very different architectures',
      'Zero-downtime is non-negotiable: discuss connection draining and health check timing',
      'Canary analysis is the differentiator: explain statistical comparison of canary vs. baseline metrics',
      'Discuss the rollback mechanism in detail: how fast, what triggers it, what happens to in-flight requests',
      'Multi-region adds complexity: discuss deployment ordering, bake time, and blast radius containment',
      'Mention feature flags as complementary: deploy code dark, enable via flag independently of deployment'
    ],

    keyQuestions: [
      {
        question: 'How does canary deployment with automated analysis work?',
        answer: `**Canary Deployment Flow**:
\`\`\`
1. Deploy canary (1 instance with new version alongside N baseline instances)
2. Route 1% of traffic to canary via service mesh weighted routing
3. Collect metrics for 5 minutes (error rate, p50/p99 latency, CPU, custom business metrics)
4. Canary Analysis Engine compares canary vs. baseline
5. If pass: promote to 5% -> 25% -> 50% -> 100% (with analysis at each stage)
6. If fail at any stage: automatic rollback to 0% canary traffic, terminate canary instances
\`\`\`

**Canary Analysis Engine**:
\`\`\`python
def analyze_canary(deployment_id, metric_name):
    canary_samples = get_metric_samples(deployment_id, "canary", metric_name, window="5m")
    baseline_samples = get_metric_samples(deployment_id, "baseline", metric_name, window="5m")

    # Mann-Whitney U test (non-parametric, no normality assumption)
    statistic, p_value = mannwhitneyu(canary_samples, baseline_samples, alternative='greater')

    if p_value < 0.05:  # canary is statistically worse
        return Verdict.FAIL
    elif len(canary_samples) < MIN_SAMPLE_SIZE:
        return Verdict.INCONCLUSIVE  # need more data, extend analysis window
    else:
        return Verdict.PASS
\`\`\`

**Metrics Compared**:
- **Error rate**: canary error rate should not be statistically higher than baseline
- **Latency (p50, p99)**: canary should not be slower
- **Resource usage**: CPU/memory should not spike (indicates potential leak or inefficiency)
- **Custom business metrics**: conversion rate, checkout success, etc.

**Traffic Splitting via Service Mesh**:
\`\`\`yaml
# Istio VirtualService
apiVersion: networking.istio.io/v1
kind: VirtualService
spec:
  http:
  - route:
    - destination:
        host: payment-service
        subset: stable
      weight: 95
    - destination:
        host: payment-service
        subset: canary
      weight: 5
\`\`\`

**Handling Edge Cases**:
- **Low traffic services**: extend analysis window (30 min instead of 5 min) or use synthetic load
- **Flaky metrics**: use rolling averages and require consecutive failures before rollback
- **Regional differences**: analyze canary independently per region, not globally aggregated`
      },
      {
        question: 'How does blue-green deployment achieve zero-downtime?',
        answer: `**Blue-Green Architecture**:
\`\`\`
Load Balancer / DNS
       |
  ┌────┴────┐
  ▼         ▼
 BLUE      GREEN
(v1.2)    (v1.3)   <- new version deployed here while blue handles traffic
 active    standby

After validation: switch traffic from BLUE -> GREEN
GREEN becomes active, BLUE becomes standby
\`\`\`

**Deployment Steps**:
1. **Prepare Green**: deploy new version to Green environment (identical to Blue in capacity)
2. **Validate Green**: run smoke tests, synthetic traffic, health checks against Green
3. **Switch Traffic**: update load balancer target group (ALB) or DNS record to point to Green
4. **Drain Blue**: wait for in-flight requests on Blue to complete (connection draining, 30-60 seconds)
5. **Monitor**: watch Green metrics for 15-30 minutes (bake time)
6. **Cleanup**: Blue can be kept warm for instant rollback or terminated to save cost

**Traffic Switch Methods**:
- **Load Balancer (instant)**: ALB target group swap, traffic shifts within seconds
- **DNS (slower)**: update DNS record, depends on TTL propagation (set TTL to 60s before switch)
- **Service Mesh (granular)**: weighted routing allows gradual blue->green shift

**Rollback** (the key advantage):
- Blue environment is still running (or can be restarted from same image)
- Switch traffic back: load balancer points to Blue again
- Rollback time: < 30 seconds (just a target group change)
- No need to rebuild, redeploy, or re-download anything

**Cost Tradeoff**:
- Requires 2x infrastructure during deployment (both Blue and Green running)
- Mitigation: keep standby environment at reduced capacity, scale up before switch
- For stateless services: auto-scaling handles this naturally
- For services with warm caches: pre-warm Green cache before traffic switch

**Database Considerations**:
- Blue-green is easy for stateless services but hard when database schema changes
- Strategy: make DB changes backward-compatible (additive only), deploy DB change first, then application
- Never drop columns or rename tables during blue-green: both versions must work with same schema`
      },
      {
        question: 'How do you handle rollback safely?',
        answer: `**Rollback Triggers** (automated):
1. Health check failures exceed threshold (3 consecutive failures)
2. Canary analysis verdict: FAIL on any critical metric
3. Error rate spike > 2x baseline within 2 minutes of promotion
4. Alerting system fires P1/P2 alert correlated with deployment window

**Rollback Triggers** (manual):
5. Engineer clicks "Rollback" button with reason
6. On-call engineer triggers via CLI: \`deploy rollback --service payment --reason "elevated 5xx"\`

**Rollback Mechanics by Strategy**:

**Blue-Green Rollback** (fastest: < 30 seconds):
- Switch load balancer back to old environment
- Old environment was never touched, still running previous version
- In-flight requests to new version may error (acceptable, clients retry)

**Canary Rollback** (fast: < 60 seconds):
- Set canary traffic weight to 0% in service mesh
- Terminate canary instances
- 100% traffic goes to stable baseline (which was always serving)
- Minimal user impact since canary was serving small % of traffic

**Rolling Update Rollback** (slower: 2-5 minutes):
- Some instances already running new version
- Reverse the rolling update: deploy old version back to updated instances
- During rollback, mixed versions are serving (both old and new)
- Requires backward-compatible versions to avoid issues during transition

**Safe Rollback Patterns**:
- **Deployment locks**: only one deployment per service at a time (prevents rollback-during-rollback)
- **Rollback version pinning**: always roll back to last-known-good, not just "previous" (which may also be bad)
- **Database migration rollback**: if the new version ran DB migrations, rollback code must handle both old and new schema
- **In-flight request handling**: connection draining ensures requests complete before instance termination

**Post-Rollback**:
- Auto-create incident ticket with deployment context
- Capture canary metrics snapshot for debugging
- Lock service from re-deployment until incident is resolved
- Notify team channel with rollback details and link to metrics dashboard`
      }
    ],

    requirements: ['CI/CD pipeline', 'Blue-green deployment', 'Canary deployment', 'Rolling updates', 'Automated rollback', 'Multi-region orchestration'],
    components: ['CI Build Farm', 'Container Registry', 'Deployment Controller', 'Service Mesh (Envoy/Istio)', 'Canary Analysis Engine', 'PostgreSQL (deployment history)', 'Redis (locks + status)', 'Prometheus (metrics)'],
    keyDecisions: [
      'Service mesh weighted routing for fine-grained canary traffic splitting',
      'Statistical canary analysis (Mann-Whitney U) for automated promotion/rollback decisions',
      'Blue-green with load balancer target group swap for instant rollback capability',
      'GitOps model: deployment desired state in Git for auditability and reproducibility',
      'Multi-region sequential rollout with bake time for blast radius containment',
      'Feature flags decoupled from deployment for independent release control'
    ],
    edgeCases: [
      { scenario: 'Canary deployment passes metrics but causes data corruption in background jobs', impact: 'Silent data integrity issues spread to production before detection', mitigation: 'Include data validation checks in canary analysis, run shadow traffic through data pipelines, add schema compatibility verification pre-deploy' },
      { scenario: 'Circular dependency between two services deploying simultaneously', impact: 'Service A v2 requires B v2, but B v2 requires A v2, creating a deadlock', mitigation: 'Enforce backward-compatible API contracts, deploy with feature flags disabled, use dependency graph analysis to sequence rollouts' },
      { scenario: 'Database migration fails mid-deployment and rollback needed', impact: 'New code expects new schema, old code expects old schema, both break during mixed state', mitigation: 'Use expand-contract migration pattern: add new columns first, deploy code that handles both, then remove old columns in a later deploy' },
      { scenario: 'Region-wide deployment during peak traffic hours', impact: 'Increased error rates and latency during container restarts affect user experience', mitigation: 'Enforce deployment windows per region based on traffic patterns, require manual approval for peak-hour deploys, use traffic draining before instance termination' },
    ],
    tradeoffs: [
      { decision: 'Blue-green vs canary deployment', pros: 'Blue-green gives instant rollback; canary limits blast radius to small traffic percentage', cons: 'Blue-green requires 2x infrastructure; canary rollback is slower since bad code served to some users', recommendation: 'Canary for most services (cost-efficient), blue-green for critical stateless services where instant rollback is essential' },
      { decision: 'GitOps (pull-based) vs push-based deployment', pros: 'GitOps provides auditability and declarative state; push-based is simpler and faster', cons: 'GitOps adds reconciliation lag; push-based lacks audit trail and drift detection', recommendation: 'GitOps for production environments, push-based for development and staging where speed matters more' },
      { decision: 'Shared CI build farm vs per-team build infrastructure', pros: 'Shared amortizes cost and standardizes builds; per-team gives autonomy and isolation', cons: 'Shared creates bottlenecks and noisy-neighbor issues; per-team duplicates infrastructure and expertise', recommendation: 'Shared build farm with per-team resource quotas and priority queues to balance efficiency and fairness' },
    ],
    layeredDesign: [
      { name: 'Developer Interface Layer', purpose: 'Git integration, PR triggers, and deployment dashboards', components: ['Git Webhook Handler', 'Deployment Dashboard', 'CLI Tool', 'Slack Notifications'] },
      { name: 'CI/CD Pipeline Layer', purpose: 'Build artifacts, run tests, and produce deployable images', components: ['Build Farm', 'Test Runner', 'Container Registry', 'Artifact Cache'] },
      { name: 'Deployment Orchestration Layer', purpose: 'Execute deployment strategies and manage rollout state', components: ['Deployment Controller', 'Canary Analysis Engine', 'Rollback Manager', 'Feature Flag Service'] },
      { name: 'Infrastructure Layer', purpose: 'Manage compute resources, routing, and health monitoring', components: ['Service Mesh (Envoy/Istio)', 'Container Orchestrator (K8s)', 'Load Balancer', 'Prometheus + Grafana'] },
    ],
  },

  // ─── 24. Distributed Search ─────────────────────────────────────────
  {
    id: 'distributed-search',
    isNew: true,
    title: 'Distributed Search',
    subtitle: 'Elasticsearch-Like Search Engine',
    icon: 'search',
    color: '#f59e0b',
    difficulty: 'Hard',
    description: 'Design a distributed search system with inverted indexing, ranking, crawling, and real-time search capabilities similar to Elasticsearch.',

    introduction: `Distributed search is one of the foundational building blocks of modern infrastructure. Whether powering a site search for an e-commerce platform, log analytics for a DevOps team, or full-text search across a social network, the underlying system must ingest documents, build inverted indices, and serve queries with sub-second latency across billions of documents.

The core data structure is the inverted index: a mapping from every unique term to the list of documents containing that term. Building, updating, and querying this index in a distributed setting is where the complexity lies. Documents must be analyzed (tokenized, stemmed, normalized), indexed across shards for parallelism, and queries must be scattered to relevant shards then gathered and merged.

Beyond basic keyword matching, a production search system needs relevance ranking (BM25, TF-IDF), faceted aggregations, fuzzy matching, near-real-time indexing (documents searchable within seconds of ingestion), and the ability to scale horizontally as data grows from gigabytes to petabytes.`,

    functionalRequirements: [
      'Index documents with arbitrary JSON fields',
      'Full-text search with relevance ranking (BM25)',
      'Filtered queries (range, term, bool combinations)',
      'Faceted aggregations (counts by category, date histograms)',
      'Near-real-time indexing (document searchable within 1 second)',
      'Fuzzy matching and typo tolerance',
      'Highlighting of matched terms in results',
      'Index management: create, update mapping, reindex, delete'
    ],

    nonFunctionalRequirements: [
      'Query latency < 100ms at p95 for simple queries, < 500ms for complex aggregations',
      'Indexing throughput > 100K documents/sec sustained',
      'Support 1T+ documents across the cluster',
      'Near-real-time: document searchable within 1 second of indexing',
      '99.99% query availability with replica failover',
      'Horizontal scaling: add nodes to increase capacity linearly'
    ],

    estimation: {
      users: '10K query users, ~50K queries/sec peak; 100K+ data sources ingesting documents',
      storage: '~1KB avg document * 1T documents = ~1PB raw data; inverted index ~30% of raw = ~300TB index',
      bandwidth: '~100K docs/sec * 1KB = ~100MB/sec ingest; ~50K queries/sec * 10KB response = ~500MB/sec query',
      qps: '~50K search queries/sec, ~100K index operations/sec, ~5K aggregation queries/sec'
    },

    apiDesign: {
      description: 'REST API modeled after Elasticsearch DSL for indexing and querying',
      endpoints: [
        { method: 'PUT', path: '/:index/_doc/:id', params: '{ field1: value1, field2: value2, ... }', response: '201 { _id, _version, result: created }' },
        { method: 'POST', path: '/:index/_bulk', params: 'NDJSON: {action}\n{document}\n...', response: '200 { items[], errors: bool }' },
        { method: 'POST', path: '/:index/_search', params: '{ query: {bool: {must, filter, should}}, size, from, sort, aggs, highlight }', response: '{ hits: {total, hits[]}, aggregations }' },
        { method: 'PUT', path: '/:index', params: '{ mappings: {properties: {field: {type, analyzer}}}, settings: {shards, replicas} }', response: '200 { acknowledged }' },
        { method: 'POST', path: '/:index/_refresh', params: '', response: '200 { _shards: {successful} }' }
      ]
    },

    dataModel: {
      description: 'Inverted index structure, document store, and cluster metadata',
      schema: `-- Logical structure of the inverted index (per shard)

inverted_index {
  term: varchar  -- normalized token (e.g., "distributed")
  field: varchar  -- which document field (e.g., "title", "body")
  posting_list: [  -- sorted list of documents containing this term
    {
      doc_id: int,
      term_frequency: int,     -- how many times term appears in this doc
      positions: int[],         -- positions for phrase queries
      field_length: int         -- total terms in field (for BM25 normalization)
    }
  ]
  document_frequency: int  -- number of docs containing this term (for IDF)
}

document_store {
  doc_id: int PK
  _source: jsonb  -- original document (for retrieval)
  _version: bigint
  field_norms: map<field, float>  -- pre-computed field length norms
}

-- Cluster metadata (stored in dedicated master nodes)
cluster_state {
  indices: [{
    name: varchar,
    uuid: uuid,
    mappings: jsonb,         -- field name -> type + analyzer
    settings: jsonb,         -- shard count, replica count
    shards: [{
      shard_id: int,
      primary_node: varchar,
      replica_nodes: varchar[],
      status: enum(started, initializing, relocating)
    }]
  }]
  nodes: [{
    node_id: varchar,
    address: varchar,
    roles: enum[](master, data, ingest, coordinating),
    disk_usage: float,
    heap_usage: float
  }]
}`,
      examples: [
        { table: 'inverted_index', label: 'Posting list for term "distributed"', json: `{ "term": "distributed", "field": "body", "posting_list": [{"doc_id": 1042, "term_frequency": 3, "positions": [12, 45, 89], "field_length": 520}, {"doc_id": 2891, "term_frequency": 1, "positions": [7], "field_length": 180}], "document_frequency": 2 }` },
        { table: 'document_store', label: 'Indexed document with field norms', json: `{ "doc_id": 1042, "_source": {"title": "Distributed Systems Design", "body": "A comprehensive guide to building distributed...", "author": "jdoe"}, "_version": 3, "field_norms": {"title": 0.577, "body": 0.044} }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/distributed-search/impl-basic.png',
      description: 'A single node maintains an inverted index in memory, accepts documents for indexing, and serves search queries. Documents are analyzed (tokenized, lowercased) and added to the inverted index. Queries look up terms in the index, intersect posting lists, and rank by TF-IDF.',
      problems: [
        'Single node limits both index size (memory) and query throughput',
        'No replication means any node failure causes data loss and downtime',
        'Full index rebuild required on restart (no durable index storage)',
        'Cannot handle concurrent indexing and querying without lock contention',
        'No distributed coordination: cannot scatter queries across shards'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Search Cluster with Near-Real-Time Indexing',
      diagramSrc: '/diagrams/distributed-search/impl-advanced.png',
      description: 'Documents are routed to shards by hash(doc_id) % num_shards. Each shard is a self-contained inverted index with a primary copy and N replicas. Writes go to the primary, which replicates to replicas before acknowledging. Queries are scattered to one copy of each shard (primary or replica), each shard returns its top-K results, and the coordinating node merges and re-ranks the final result. Near-real-time indexing uses an in-memory buffer that is periodically "refreshed" into a searchable segment.',
      keyPoints: [
        'Shard routing: hash(doc_id) % num_shards determines which shard stores a document',
        'Scatter-gather query: coordinating node sends query to one copy of each shard, merges top-K results',
        'Segment-based indexing: new documents buffered in memory, periodically flushed to immutable segments (like LSM-tree)',
        'Near-real-time refresh: every 1 second, in-memory buffer becomes a searchable segment (no full reindex needed)',
        'Segment merging: background process merges small segments into larger ones (reduces file handles and improves query speed)',
        'Replica promotion: if primary shard fails, a replica is promoted to primary within seconds'
      ],
      databaseChoice: 'Custom inverted index storage (Lucene-based segment files) for search data; ZooKeeper/etcd for cluster coordination and master election; translog (write-ahead log) for durability between flushes',
      caching: 'Node-level query cache (LRU, keyed by query hash, invalidated on segment refresh); field data cache for aggregations and sorting; OS filesystem cache for memory-mapped segment files (often the biggest performance factor); request-level cache for identical repeated queries'
    },

    tips: [
      'Start with the inverted index data structure: explain how terms map to posting lists',
      'Scatter-gather is the core query pattern: describe how coordination works across shards',
      'Near-real-time indexing is a key feature: explain the refresh interval and segment buffer mechanism',
      'BM25 ranking needs per-shard statistics: discuss how distributed scoring works (and its inaccuracies)',
      'Discuss shard sizing: too many small shards = overhead, too few large shards = hotspots and slow queries',
      'Mention the split-brain problem: how master election prevents inconsistent cluster state'
    ],

    keyQuestions: [
      {
        question: 'How does the inverted index work and how are queries executed?',
        answer: `**Inverted Index Structure**:
\`\`\`
Document 1: "the quick brown fox"
Document 2: "the lazy brown dog"
Document 3: "quick fox jumps"

Inverted Index:
  "the"   -> [doc1(pos:0), doc2(pos:0)]
  "quick" -> [doc1(pos:1), doc3(pos:0)]
  "brown" -> [doc1(pos:2), doc2(pos:2)]
  "fox"   -> [doc1(pos:3), doc3(pos:1)]
  "lazy"  -> [doc2(pos:1)]
  "dog"   -> [doc2(pos:3)]
  "jumps" -> [doc3(pos:2)]
\`\`\`

**Query Execution: "quick brown"**:
1. Look up "quick" -> posting list [doc1, doc3]
2. Look up "brown" -> posting list [doc1, doc2]
3. For OR query: union -> [doc1, doc2, doc3]
4. For AND query: intersection -> [doc1]
5. Score each result using BM25

**BM25 Scoring**:
\`\`\`
score(doc, query) = Σ for each term t in query:
  IDF(t) * (tf(t,doc) * (k1 + 1)) / (tf(t,doc) + k1 * (1 - b + b * fieldLen/avgFieldLen))

Where:
  IDF(t) = log((N - df(t) + 0.5) / (df(t) + 0.5) + 1)
  tf(t,doc) = term frequency in document
  N = total documents, df(t) = documents containing term
  k1 = 1.2 (term frequency saturation), b = 0.75 (field length normalization)
\`\`\`

**Distributed Query (Scatter-Gather)**:
1. Coordinating node receives query
2. Sends query to one copy of each shard (primary or replica)
3. Each shard executes locally: look up posting lists, score, return top-K
4. Coordinating node merges sorted results from all shards
5. Fetch full documents (_source) for the final top-N results

**Optimization**:
- Skip lists in posting lists for fast intersection
- Block-Max WAND algorithm: skips low-scoring documents early
- Query rewriting: "quick brown" as phrase query requires position matching`
      },
      {
        question: 'How does near-real-time indexing work?',
        answer: `**The Segment Model** (inspired by Lucene):

**Write Path**:
\`\`\`
1. Document arrives at primary shard
2. Written to translog (WAL) for durability
3. Added to in-memory buffer (indexing buffer)
4. Response returned to client (document NOT yet searchable)

Every 1 second (refresh interval):
5. In-memory buffer flushed to a new segment (immutable, on disk)
6. New segment is opened for searching
7. Document is now searchable! (this is the "near-real-time" part)

Periodically (every 30 minutes or when translog is large):
8. Full flush: all in-memory data written to segments
9. Translog is cleared (segments are now the durable copy)
\`\`\`

**What Is a Segment?**:
- An immutable, self-contained inverted index
- Once written, never modified (append-only architecture)
- Each segment has its own: inverted index, document store, field norms, deletion bitset
- A shard = collection of segments + in-memory buffer

**Why Immutability?**:
- No locking needed for reads (segments never change)
- Concurrent reads and writes without contention
- Crash recovery: replay translog to reconstruct in-memory buffer

**Segment Merging** (background process):
\`\`\`
Before: [seg1: 100 docs] [seg2: 100 docs] [seg3: 50 docs] [seg4: 200 docs] [seg5: 80 docs]
After merge: [seg1_2_3: 250 docs] [seg4_5: 280 docs]
\`\`\`
- Merge combines small segments into larger ones
- Deleted documents are purged during merge (previously just marked in bitset)
- Reduces number of segments that need to be searched per query
- Tiered merge policy: small segments merge frequently, large segments merge rarely

**Tuning Trade-offs**:
- Lower refresh interval (100ms) = faster searchability but more small segments = slower queries
- Higher refresh interval (30s) = better indexing throughput but longer delay to searchability
- For bulk loading: disable refresh, index all data, then refresh once`
      },
      {
        question: 'How do you handle distributed scoring and relevance?',
        answer: `**The Problem with Distributed BM25**:
- BM25 needs global statistics: total document count (N), document frequency (df) per term
- Each shard only knows its local statistics
- Shard 1 has 1M docs, shard 2 has 1M docs: each thinks N=1M but true N=2M
- If term "rare_word" appears in 100 docs on shard 1 and 0 docs on shard 2:
  - Shard 1 IDF: calculated with df=100 (correct locally)
  - Shard 2 IDF: term not found locally, very high IDF if document is somehow present
  - Scores are inconsistent across shards!

**Solution 1: DFS_QUERY_THEN_FETCH** (Elasticsearch approach):
\`\`\`
Phase 1 (Distributed Frequency Scatter):
  - Coordinating node sends query to all shards
  - Each shard returns local statistics: {term: df, total_docs: N}
  - Coordinating node aggregates into global statistics

Phase 2 (Query with Global Stats):
  - Coordinating node sends query + global stats to all shards
  - Each shard scores using global stats -> consistent scores
  - Returns top-K doc IDs + scores

Phase 3 (Fetch):
  - Coordinating node determines final top-N across all shards
  - Fetches full documents from relevant shards
\`\`\`

**Solution 2: Shard-Local Scoring (default, good enough)**:
- With enough documents per shard (~10K+), local statistics approximate global
- Law of large numbers: term distributions converge across shards
- Much faster (2 phases vs. 3), acceptable for most use cases

**When Local Scoring Fails**:
- Very small indices (< 1000 docs per shard)
- Highly skewed data distribution (one shard has all docs of a certain type)
- Precise ranking is critical (e-commerce product search)

**Advanced Ranking**:
- **Learning to Rank (LTR)**: train ML model to predict relevance, use BM25 as one feature among many
- **Personalized ranking**: boost results based on user history (requires user context in query)
- **Freshness boost**: multiply score by recency factor for time-sensitive searches
- **Function scoring**: combine BM25 with custom scoring functions (popularity, location proximity)`
      }
    ],

    requirements: ['Full-text search', 'Inverted indexing', 'BM25 ranking', 'Near-real-time indexing', 'Faceted aggregations', 'Horizontal scaling'],
    components: ['Coordinating Nodes', 'Data Nodes (shards)', 'Master Nodes (cluster state)', 'Inverted Index (Lucene segments)', 'Translog (WAL)', 'ZooKeeper/etcd (coordination)', 'Query Cache', 'Segment Merger'],
    keyDecisions: [
      'Scatter-gather query execution across shards for parallel search',
      'Segment-based immutable index with periodic refresh for near-real-time searchability',
      'Hash-based shard routing for even document distribution',
      'Primary-replica model with replica promotion for high availability',
      'Tiered segment merging to balance query performance and indexing throughput',
      'DFS_QUERY_THEN_FETCH for globally consistent BM25 scoring when precision matters'
    ],

    comparisonCards: [
      {
        title: 'ElasticSearch Use Cases',
        items: [
          { name: 'Full-Text Search', description: 'Robust, scalable, near real-time search using inverted indexes. Handles complex queries across millions of documents. The core use case.' },
          { name: 'Real-Time Analytics', description: 'Track live data like user activity, transactions, and sensor outputs. Aggregation queries return in milliseconds with Kibana dashboards.' },
          { name: 'Log Analysis (ELK Stack)', description: 'Filebeat/Logstash collects logs → Kafka buffers → Logstash processes → Elasticsearch stores → Kibana visualizes. The standard log management pipeline.' },
          { name: 'Machine Learning', description: 'X-Pack ML detects anomalies, patterns, and trends in data automatically. Proactive observability and alerting without manual threshold setting.' },
          { name: 'Geo-Data Applications', description: 'Balanced k-d tree geo indexing enables proximity searches and geographic data visualization. Used by mapping and location services.' },
          { name: 'Security Information & Event Management', description: 'Elastic Agent collects security events → detection rules identify anomalies → real-time alerts and dashboards for security operations centers.' }
        ]
      }
    ],

    staticDiagrams: [
      { id: 'elasticsearch-use-cases', title: 'ElasticSearch Use Cases', description: 'Full-text search, real-time analytics, log analysis, ML, geo-data, and SIEM', src: '/diagrams/distributed-search/elasticsearch-use-cases.svg', type: 'architecture' }
    ],
    edgeCases: [
      { scenario: 'Hot shard receiving disproportionate query traffic', impact: 'Single data node becomes bottleneck, causing query timeouts and cluster-wide latency increase', mitigation: 'Use routing-aware shard allocation, add replicas for hot shards, implement adaptive replica selection to spread read load' },
      { scenario: 'Segment merge storm during heavy indexing', impact: 'Merge I/O saturates disk, competing with search queries for resources', mitigation: 'Throttle merge bandwidth, schedule large merges during off-peak hours, use separate I/O threads for merging vs searching' },
      { scenario: 'Mapping explosion from dynamic field creation', impact: 'Cluster state grows unbounded, master node OOM, new index creation fails', mitigation: 'Set strict mapping limits, disable dynamic mapping for untrusted input, use flattened field type for arbitrary key-value data' },
      { scenario: 'Split-brain during network partition between master-eligible nodes', impact: 'Two masters accept conflicting writes, causing data divergence and corruption', mitigation: 'Configure minimum_master_nodes to quorum (N/2+1), use dedicated master nodes, implement fencing to isolate partitioned masters' },
    ],
    tradeoffs: [
      { decision: 'Real-time indexing vs batch indexing', pros: 'Real-time makes documents searchable in seconds; batch gives higher throughput and fewer segment merges', cons: 'Real-time creates many small segments degrading search performance; batch adds latency before documents are searchable', recommendation: 'Real-time with 1-second refresh interval for user-facing search, batch bulk API for log ingestion and analytics workloads' },
      { decision: 'More shards (fine-grained) vs fewer shards (coarse-grained)', pros: 'More shards enable parallelism and granular scaling; fewer shards reduce coordination overhead', cons: 'More shards increase cluster state size and per-query fan-out cost; fewer shards limit write throughput', recommendation: 'Target 20-40GB per shard, shard count based on data volume, use time-based indices with rollover for growing datasets' },
      { decision: 'Denormalized documents vs parent-child relationships', pros: 'Denormalized gives fast single-query retrieval; parent-child supports independent updates', cons: 'Denormalized requires reindexing on any field change; parent-child adds join overhead and requires co-located shards', recommendation: 'Denormalize for read-heavy search workloads, use parent-child only when update frequency of nested data is very high' },
    ],
    layeredDesign: [
      { name: 'Client Layer', purpose: 'Accept search and indexing requests via REST API', components: ['REST API (HTTP)', 'Query DSL Parser', 'Bulk Indexing API', 'Client Libraries'] },
      { name: 'Coordination Layer', purpose: 'Route queries to shards and merge results', components: ['Coordinating Nodes', 'Scatter-Gather Engine', 'Query Cache', 'Cluster State Manager'] },
      { name: 'Data Node Layer', purpose: 'Store index shards and execute local search operations', components: ['Inverted Index (Lucene)', 'Translog (WAL)', 'Segment Merger', 'Field Data Cache'] },
      { name: 'Cluster Management Layer', purpose: 'Maintain cluster health, rebalance shards, and manage masters', components: ['Master Nodes', 'Shard Allocation Service', 'ZooKeeper/etcd', 'Snapshot & Restore'] },
    ],
  },

  // ─── 25. Blob Store ─────────────────────────────────────────────────
  {
    id: 'blob-store',
    isNew: true,
    title: 'Blob Store',
    subtitle: 'S3-Like Object Storage',
    icon: 'database',
    color: '#059669',
    difficulty: 'Hard',
    description: 'Design an object storage system similar to S3 with chunking, deduplication, and 11-nines durability.',

    introduction: `Object storage (blob storage) is the foundational storage layer of the cloud. Amazon S3 alone stores over 350 trillion objects, and virtually every modern application depends on some form of blob storage for images, videos, backups, logs, and data lake storage. Designing such a system requires solving some of the hardest problems in distributed systems: achieving 99.999999999% (11-nines) durability, scaling to exabytes of data, and maintaining strong read-after-write consistency.

Unlike file systems that use hierarchical directories and support in-place modifications, object storage uses a flat namespace (bucket + key) and treats objects as immutable blobs. This simplification enables massive horizontal scaling: objects can be distributed across thousands of storage nodes without complex locking or directory traversal.

The core challenges include: efficiently chunking and distributing large objects across nodes, implementing erasure coding for durability without 3x storage overhead, maintaining a metadata layer that can handle trillions of keys with low-latency lookups, and providing strong consistency guarantees in a geo-distributed setting.`,

    functionalRequirements: [
      'PUT and GET objects (up to 5TB per object)',
      'Multipart upload for large objects (parallel chunk upload)',
      'Bucket creation and management with access policies',
      'Object versioning (keep previous versions)',
      'Object listing with prefix filtering and pagination',
      'Presigned URLs for time-limited direct access',
      'Lifecycle policies (transition to cold storage, auto-delete after N days)',
      'Cross-region replication for disaster recovery'
    ],

    nonFunctionalRequirements: [
      'Durability: 99.999999999% (11-nines) annual',
      'Availability: 99.99% for reads, 99.9% for writes',
      'Read-after-write consistency for PUTs (strong consistency)',
      'Support exabytes of total storage',
      'First-byte latency < 100ms for small objects',
      'Throughput: handle 100K+ requests/sec per partition'
    ],

    estimation: {
      users: '1M+ active buckets, trillions of objects total, 100K+ req/sec',
      storage: '~100EB total data; ~10PB/day new data ingested; metadata: ~500 bytes per object * 1T objects = ~500TB metadata',
      bandwidth: '~100K requests/sec * 1MB avg object = ~100GB/sec sustained; peak egress: ~500GB/sec',
      qps: '~100K PUT/sec, ~500K GET/sec, ~20K LIST/sec, ~50K HEAD/sec'
    },

    apiDesign: {
      description: 'REST API compatible with S3-style interface',
      endpoints: [
        { method: 'PUT', path: '/:bucket/:key', params: 'Body: binary, Headers: Content-Type, x-storage-class', response: '200 { ETag, VersionId }' },
        { method: 'GET', path: '/:bucket/:key', params: 'Headers: Range (byte range), versionId?', response: '200 Body: binary, Headers: Content-Length, ETag' },
        { method: 'POST', path: '/:bucket/:key?uploads', params: '', response: '200 { UploadId }  -- initiate multipart' },
        { method: 'PUT', path: '/:bucket/:key?partNumber=N&uploadId=X', params: 'Body: chunk binary', response: '200 { ETag }  -- upload part' },
        { method: 'POST', path: '/:bucket/:key?uploadId=X', params: '{ parts: [{partNumber, ETag}] }', response: '200 { ETag, VersionId }  -- complete multipart' },
        { method: 'GET', path: '/:bucket?prefix=X&delimiter=/&marker=Y&max-keys=1000', params: '', response: '200 { Contents[], CommonPrefixes[], NextMarker }' }
      ]
    },

    dataModel: {
      description: 'Metadata layer (key-value) and data layer (chunks stored on storage nodes)',
      schema: `-- Metadata layer (distributed key-value store, sharded by bucket+key)

object_metadata {
  bucket: varchar
  key: varchar
  version_id: uuid  -- for versioned buckets
  size: bigint
  etag: varchar(32)  -- MD5 of content (or of parts for multipart)
  content_type: varchar
  storage_class: enum(standard, infrequent, glacier)
  chunk_manifest: [  -- ordered list of chunks that compose this object
    {
      chunk_id: uuid,
      offset: bigint,
      length: int,
      checksum: varchar(64),  -- SHA-256
      storage_nodes: varchar[]  -- nodes holding this chunk's erasure-coded fragments
    }
  ]
  user_metadata: map<varchar, varchar>
  created_at: timestamp
  delete_marker: boolean  -- for versioned delete
  PK(bucket, key, version_id)
}

bucket_metadata {
  name: varchar PK
  owner_id: bigint
  region: varchar
  versioning: enum(disabled, enabled, suspended)
  lifecycle_rules: jsonb
  replication_config: jsonb nullable
  acl: jsonb
  created_at: timestamp
}

-- Data layer: chunks stored on storage nodes with erasure coding

chunk_placement {
  chunk_id: uuid PK
  erasure_scheme: varchar  -- e.g., "8+3" (8 data + 3 parity fragments)
  fragment_locations: [  -- one entry per fragment
    {
      fragment_index: int,
      node_id: varchar,
      disk_id: varchar,
      offset: bigint  -- offset within the disk's data file
    }
  ]
  checksum: varchar(64)
  size: int
  created_at: timestamp
}`,
      examples: [
        { table: 'object_metadata', label: 'Multipart-uploaded video file', json: `{ "bucket": "user-videos", "key": "uploads/2025/04/interview-recording.mp4", "version_id": "v1-abc123", "size": 524288000, "etag": "a3c8f92e1b4d-3", "content_type": "video/mp4", "storage_class": "standard", "chunk_manifest": [{"chunk_id": "ck-001", "offset": 0, "length": 67108864, "checksum": "sha256:e3b0c442...", "storage_nodes": ["sn-01","sn-04","sn-07"]}, {"chunk_id": "ck-002", "offset": 67108864, "length": 67108864, "checksum": "sha256:9f86d081...", "storage_nodes": ["sn-02","sn-05","sn-08"]}], "user_metadata": {"uploader": "user-5820"}, "created_at": "2025-04-18T08:30:00Z", "delete_marker": false }` },
        { table: 'bucket_metadata', label: 'Versioned bucket with lifecycle rules', json: `{ "name": "user-videos", "owner_id": 58201, "region": "us-west-2", "versioning": "enabled", "lifecycle_rules": [{"prefix": "tmp/", "expiration_days": 3}, {"prefix": "", "transition_to": "infrequent", "after_days": 90}], "replication_config": {"destination": "us-east-1"}, "acl": {"owner": "FULL_CONTROL"}, "created_at": "2024-03-01T00:00:00Z" }` },
        { table: 'chunk_placement', label: 'Erasure-coded chunk with fragment locations', json: `{ "chunk_id": "ck-001", "erasure_scheme": "8+3", "fragment_locations": [{"fragment_index": 0, "node_id": "sn-01", "disk_id": "disk-a", "offset": 1048576}, {"fragment_index": 1, "node_id": "sn-02", "disk_id": "disk-b", "offset": 2097152}, {"fragment_index": 2, "node_id": "sn-03", "disk_id": "disk-a", "offset": 524288}], "checksum": "sha256:e3b0c44298fc1c149...", "size": 67108864, "created_at": "2025-04-18T08:30:05Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/blob-store/impl-basic.png',
      description: 'Objects are stored as files on a distributed file system with 3-way replication. A centralized metadata service maps bucket+key to the file location. Clients upload to an API gateway which writes to the storage nodes and updates the metadata.',
      problems: [
        '3x replication wastes 200% extra storage (a 100PB system needs 300PB of disk)',
        'Centralized metadata becomes a bottleneck and single point of failure',
        'Large objects stored as single files cannot be written in parallel',
        'No deduplication: identical files stored multiple times',
        'Consistency is hard: metadata and data can become out of sync during failures'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Object Storage with Erasure Coding and Tiered Metadata',
      diagramSrc: '/diagrams/blob-store/impl-advanced.png',
      description: 'Objects are chunked (64-128MB per chunk), and each chunk is erasure-coded (e.g., 8+3 Reed-Solomon: 8 data fragments + 3 parity, tolerating any 3 node failures with only 1.375x storage overhead). The metadata layer is a distributed key-value store sharded by hash(bucket+key), with a separate partition index for LIST operations. Strong consistency is achieved via a consensus protocol on the metadata layer.',
      keyPoints: [
        'Erasure coding (8+3 RS): 11-nines durability with only 37.5% storage overhead vs 200% for 3-way replication',
        'Chunking: large objects split into 64-128MB chunks, each independently erasure-coded and distributed',
        'Metadata sharding: hash(bucket, key) determines metadata shard; each shard is a Raft group for strong consistency',
        'Multipart upload: chunks uploaded in parallel to different storage nodes, assembled on completion',
        'Data integrity: SHA-256 checksum per chunk verified on write and periodically scrubbed; corrupted fragments auto-repaired from parity',
        'Storage tiering: hot data on SSD, warm on HDD, cold on tape/archival with transparent retrieval'
      ],
      databaseChoice: 'Custom distributed KV store (Raft-based) for object metadata; raw disk management (bypass filesystem) for data chunks; RocksDB on each storage node for local chunk index; etcd for cluster membership and placement decisions',
      caching: 'Read cache: frequently accessed small objects cached in memory on gateway nodes; metadata cache: bucket ACLs and recent key lookups cached per gateway (TTL 5 seconds with invalidation); prefetch: sequential read pattern detected -> prefetch next chunks'
    },

    tips: [
      'Start with the two-layer architecture: metadata layer (key->chunk mapping) and data layer (chunk storage)',
      'Erasure coding is the key differentiator over simple replication: explain the durability math',
      'Discuss the consistency model: read-after-write for PUTs, eventual consistency for LIST (why?)',
      'Multipart upload is essential for large objects: explain parallel chunk upload and the complete operation',
      'Mention the durability verification process: background scrubbing and repair of corrupted fragments',
      'Storage cost optimization is critical: discuss tiering (hot/warm/cold) and lifecycle policies'
    ],

    keyQuestions: [
      {
        question: 'How does erasure coding achieve 11-nines durability?',
        answer: `**Erasure Coding Basics (Reed-Solomon)**:
- Split data into k data fragments, generate m parity fragments
- Can tolerate loss of any m fragments (out of k+m total)
- Storage overhead: (k+m)/k instead of replication's 3x

**Example: 8+3 Reed-Solomon**:
\`\`\`
64MB chunk -> split into 8 x 8MB data fragments
           -> generate 3 x 8MB parity fragments
           -> 11 fragments total, stored on 11 different nodes
           -> can lose ANY 3 nodes and still reconstruct the chunk
           -> storage overhead: 11/8 = 1.375x (vs. 3x for replication)
\`\`\`

**Durability Calculation**:
- Assume annual node failure rate: 2% (industry average for disks)
- For data loss, need 4+ simultaneous failures among 11 fragments (before repair)
- Repair time: detect failure + reconstruct from remaining 8 fragments: ~2 hours
- P(4 failures in 2 hours among 11 nodes) ≈ 10^-11 per chunk per year
- This gives 99.999999999% (11-nines) durability per chunk

**Why Not Just Use 3x Replication?**:
- 3 copies: lose data if 3 specific nodes fail simultaneously
- P(3 failures in repair window among 3 nodes) ≈ 10^-6 per year (only 6-nines)
- To match 11-nines with replication: need 5-6 copies (5-6x overhead)
- Erasure coding achieves better durability with less storage

**Background Integrity Verification (Scrubbing)**:
\`\`\`
Every 30 days for each chunk:
1. Read all 11 fragments
2. Verify SHA-256 checksum of each fragment
3. If any fragment is corrupted or missing:
   a. Reconstruct from remaining healthy fragments
   b. Write repaired fragment to a new healthy node
   c. Update chunk_placement metadata
4. Report: chunks_scrubbed, fragments_repaired, data_at_risk
\`\`\`

**Protection Against Correlated Failures**:
- Place fragments across different racks, power domains, and availability zones
- Rack-aware placement: no 2 fragments of the same chunk on the same rack
- AZ-aware: distribute across 3 AZs (4+4+3 fragments) for zone-level resilience`
      },
      {
        question: 'How does the metadata layer work at trillion-object scale?',
        answer: `**The Challenge**:
- Trillions of objects = trillions of key-value entries
- Each GET needs a metadata lookup: must be fast (< 10ms)
- LIST operations need range scans by prefix: requires ordered storage
- Strong consistency for PUT (read-after-write): requires consensus

**Architecture: Sharded Raft KV Store**:
\`\`\`
Metadata Cluster:
  Shard 1 (Raft group: 3 nodes): keys with hash 0-999
  Shard 2 (Raft group: 3 nodes): keys with hash 1000-1999
  ...
  Shard N (Raft group: 3 nodes): keys with hash (N-1)*1000 - N*1000-1

Each shard stores:
  - Object metadata: bucket+key -> {size, etag, chunk_manifest, ...}
  - Backed by RocksDB (LSM-tree) for sorted key storage
\`\`\`

**Key Operations**:

**PUT metadata** (on object upload completion):
1. Route to correct shard by hash(bucket, key)
2. Raft leader writes to local RocksDB + replicates to 2 followers
3. Acknowledged after majority (2/3) confirm
4. Guarantees read-after-write consistency

**GET metadata** (on object read):
1. Route to correct shard by hash(bucket, key)
2. Read from Raft leader (for strong consistency) or any replica (for eventual)
3. Return object metadata including chunk manifest

**LIST by prefix** (the hard part):
- Hash-based sharding destroys key ordering!
- Solution: maintain a secondary prefix index
  - Separate shard groups ordered by (bucket, key_prefix)
  - Updated asynchronously on PUT/DELETE
  - LIST reads from prefix-ordered shards (range scan)
  - Slightly eventual (new objects may take 1-2 seconds to appear in LIST)
  - This is why S3 had eventual consistency for LIST even after adding strong consistency for GET

**Scaling**:
- Each shard handles ~1M keys
- 1T objects = 1M shards
- Shards automatically split when they exceed size threshold
- Shard rebalancing: migrate shard replicas to new nodes as cluster grows`
      },
      {
        question: 'How does multipart upload work for large objects?',
        answer: `**Why Multipart?**:
- Single PUT has a practical limit (~5GB): network timeouts, no resume on failure
- A 1TB object would take hours on a single connection
- Multipart enables: parallel upload, resumable upload, and streaming

**Multipart Upload Flow**:
\`\`\`
Step 1: Initiate
  POST /bucket/key?uploads -> { uploadId: "abc123" }
  Server creates upload session in metadata store

Step 2: Upload Parts (parallel)
  PUT /bucket/key?partNumber=1&uploadId=abc123  Body: [64MB chunk]  -> { ETag: "aaa" }
  PUT /bucket/key?partNumber=2&uploadId=abc123  Body: [64MB chunk]  -> { ETag: "bbb" }
  PUT /bucket/key?partNumber=3&uploadId=abc123  Body: [64MB chunk]  -> { ETag: "ccc" }
  ... (parts can be uploaded in any order, from multiple clients)

  Each part:
  1. Written to storage nodes with erasure coding (just like a regular small object)
  2. Part metadata stored: {uploadId, partNumber, size, etag, chunk_ids}
  3. Acknowledged independently

Step 3: Complete
  POST /bucket/key?uploadId=abc123
  Body: { parts: [{1, "aaa"}, {2, "bbb"}, {3, "ccc"}] }

  Server:
  1. Verifies all parts exist and ETags match
  2. Assembles chunk manifest: ordered list of all chunks from all parts
  3. Writes final object metadata atomically
  4. Object is now readable as a single entity
  5. Cleans up upload session state

Step 4 (optional): Abort
  DELETE /bucket/key?uploadId=abc123
  Server: marks all uploaded parts for garbage collection
\`\`\`

**Parallel Upload Optimization**:
\`\`\`
Client with 1Gbps connection uploading 1TB file:
  Sequential: 1TB / 125MB/s = ~2.2 hours
  Parallel (8 connections): 1TB / (125MB/s * 8) = ~17 minutes
  Parallel (32 connections): 1TB / (125MB/s * 32) = ~4 minutes
\`\`\`

**Failure Handling**:
- Part upload fails: retry just that part (other parts already stored)
- Client crash: incomplete upload persists, cleaned up after configurable timeout (7 days default)
- Network issue: client can resume by re-uploading only missing part numbers
- Server crash: parts stored on durable storage nodes survive; session metadata replicated via Raft

**Deduplication** (optional, storage optimization):
- Compute content hash (SHA-256) per chunk
- Before storing: check if chunk with same hash already exists
- If yes: reference existing chunk (copy-on-write metadata update)
- Saves storage for backup workloads where many versions of similar files exist`
      }
    ],

    requirements: ['Object PUT/GET/DELETE', 'Multipart upload', '11-nines durability', 'Strong read-after-write consistency', 'Prefix-based listing', 'Storage tiering'],
    components: ['API Gateway', 'Metadata Service (Raft KV store)', 'Storage Nodes (erasure-coded chunks)', 'Placement Service', 'Garbage Collector', 'Background Scrubber', 'Replication Manager', 'Lifecycle Policy Engine'],
    keyDecisions: [
      'Erasure coding (8+3 RS) for 11-nines durability at 1.375x storage overhead',
      'Two-layer architecture: Raft-based metadata store + distributed chunk storage',
      'Chunking (64-128MB) for parallel I/O and independent fault tolerance per chunk',
      'Rack and AZ-aware fragment placement for correlated failure protection',
      'Strong consistency via Raft for metadata, background scrubbing for data integrity',
      'Separate prefix index for LIST operations since hash-sharded metadata is unordered'
    ],
    edgeCases: [
      { scenario: 'Erasure-coded fragment on failed disk passes checksum but returns corrupted data', impact: 'Silent data corruption served to client, potentially undetected for months', mitigation: 'End-to-end checksums verified on every read, background scrubber continuously validates all fragments, store checksums in metadata service separate from data path' },
      { scenario: 'Multipart upload abandoned after partial completion', impact: 'Orphaned chunks consume storage indefinitely with no owning object', mitigation: 'Track incomplete uploads in metadata with expiration TTL, garbage collector reclaims orphaned parts after configurable timeout (default 7 days)' },
      { scenario: 'Hot object accessed by millions of concurrent readers', impact: 'Single storage node serving popular object becomes overwhelmed, causing timeouts', mitigation: 'Automatic replication of hot objects to additional nodes, CDN integration for public objects, read-through cache layer for frequently accessed metadata' },
      { scenario: 'Rack failure losing multiple erasure-coded fragments simultaneously', impact: 'Object becomes temporarily unreadable if too many fragments are co-located in failed rack', mitigation: 'Rack-aware and AZ-aware placement policy ensuring no two fragments of same object share a rack, automatic re-replication when fragment count drops below threshold' },
      { scenario: 'LIST operation on prefix with millions of keys', impact: 'Query takes minutes, times out, or causes metadata service memory pressure', mitigation: 'Paginated listing with cursor-based iteration, dedicated prefix index partitioned by common prefixes, streaming response to avoid buffering entire result set' },
    ],
    tradeoffs: [
      { decision: 'Erasure coding vs triple replication', pros: 'Erasure coding achieves 11-nines durability at 1.4x overhead; replication is simpler at 3x overhead', cons: 'Erasure coding has higher CPU cost for encode/decode and slower recovery; replication wastes 2x more storage', recommendation: 'Erasure coding for bulk storage and cost efficiency, triple replication for metadata and small hot objects where latency matters' },
      { decision: 'Strong consistency vs eventual consistency for reads', pros: 'Strong consistency eliminates stale reads; eventual consistency reduces latency and increases availability', cons: 'Strong consistency requires coordination on every read; eventual consistency can serve stale data after overwrites', recommendation: 'Strong read-after-write consistency via metadata service (Raft), eventual consistency acceptable for LIST operations with short propagation delay' },
      { decision: 'Fixed-size chunks vs variable-size content-defined chunks', pros: 'Fixed-size is simple and predictable; variable-size enables deduplication across similar files', cons: 'Fixed-size misses dedup opportunities; variable-size adds complexity in chunk boundary detection and indexing', recommendation: 'Fixed-size chunks (64-128MB) for general blob storage, content-defined chunking as optional optimization for backup and archival workloads' },
    ],
    layeredDesign: [
      { name: 'API Layer', purpose: 'Handle client requests for object CRUD and multipart uploads', components: ['REST API Gateway', 'Authentication & Authorization', 'Multipart Upload Manager', 'Presigned URL Generator'] },
      { name: 'Metadata Layer', purpose: 'Map object keys to chunk locations with strong consistency', components: ['Raft-Based Metadata Store', 'Namespace Manager', 'Prefix Index', 'Versioning Engine'] },
      { name: 'Storage Engine Layer', purpose: 'Store and retrieve erasure-coded data chunks across nodes', components: ['Chunk Storage Nodes', 'Erasure Coding Engine (Reed-Solomon)', 'Placement Service', 'Replication Manager'] },
      { name: 'Background Services Layer', purpose: 'Maintain data integrity, reclaim space, and manage lifecycle', components: ['Background Scrubber', 'Garbage Collector', 'Lifecycle Policy Engine', 'Storage Tier Migration'] },
    ],
  },

  // ─── 26. Distributed Task Scheduler ─────────────────────────────────
  {
    id: 'distributed-task-scheduler',
    isNew: true,
    title: 'Distributed Task Scheduler',
    subtitle: 'Job Queuing and Execution Platform',
    icon: 'layers',
    color: '#7c3aed',
    difficulty: 'Hard',
    description: 'Design a distributed task scheduling system with job queuing, priority management, retry logic, and dead letter queues.',

    introduction: `Distributed task schedulers are the workhorses behind every large-scale application. From sending millions of push notifications, to processing image thumbnails, to running daily ETL pipelines, virtually every operation that does not need to happen synchronously in a request path is handled by a task scheduling system.

The fundamental challenge is reliable execution: ensuring that every submitted task is eventually executed exactly once, even in the face of worker crashes, network partitions, and queue backlogs. This "exactly-once" guarantee is deceptively difficult in a distributed setting, and the system must handle subtle failure modes like a worker that processes a task but crashes before acknowledging completion.

Beyond reliability, the system must support priorities (high-priority tasks skip ahead of low-priority), scheduling (run at a specific time or on a cron schedule), task dependencies (task B runs only after task A succeeds), rate limiting (do not overwhelm downstream APIs), and observability (where is my task, why is it stuck, how long will it take?).`,

    functionalRequirements: [
      'Submit tasks for immediate or scheduled execution',
      'Priority queues: critical, high, normal, low',
      'Cron-style recurring task scheduling',
      'Task dependencies and workflows (DAG execution)',
      'Configurable retry policies (max retries, exponential backoff, jitter)',
      'Dead letter queue for permanently failed tasks',
      'Task status tracking and progress reporting',
      'Rate limiting per task type and per downstream dependency'
    ],

    nonFunctionalRequirements: [
      'At-least-once execution guarantee (with idempotency support for exactly-once semantics)',
      'Task pickup latency < 100ms for immediate tasks',
      'Support 1M+ tasks/hour throughput',
      'Worker fleet: 10K+ workers across multiple data centers',
      'Scheduled task accuracy: execute within 1 second of scheduled time',
      '99.99% availability for task submission and queue management'
    ],

    estimation: {
      users: '500+ internal services submitting tasks, 10K worker instances, 1M+ tasks/hour peak',
      storage: '~2KB avg task payload * 25M tasks/day = ~50GB/day task data; task history retention: 30 days = ~1.5TB',
      bandwidth: '~25M tasks/day * 5KB (payload + metadata + result) = ~125GB/day',
      qps: '~300 task submissions/sec, ~300 task completions/sec, ~1K status queries/sec, ~10K heartbeats/sec'
    },

    apiDesign: {
      description: 'REST API for task submission and management, gRPC for worker communication',
      endpoints: [
        { method: 'POST', path: '/api/tasks', params: '{ type, payload, priority, scheduledAt?, idempotencyKey?, retryPolicy?, deadline? }', response: '201 { taskId, status: queued }' },
        { method: 'POST', path: '/api/tasks/batch', params: '{ tasks: [{type, payload, priority}], workflow?: {dependencies} }', response: '201 { taskIds[], workflowId? }' },
        { method: 'GET', path: '/api/tasks/:taskId', params: '', response: '{ taskId, status, attempts, result?, error?, createdAt, startedAt?, completedAt? }' },
        { method: 'POST', path: '/api/schedules', params: '{ type, payload, cronExpression, timezone }', response: '201 { scheduleId }' },
        { method: 'GET', path: '/api/dlq', params: 'taskType?, limit, cursor', response: '{ tasks[], total }' },
        { method: 'POST', path: '/api/dlq/:taskId/retry', params: '', response: '200 { taskId, status: requeued }' }
      ]
    },

    dataModel: {
      description: 'Task queue, schedule definitions, and execution history',
      schema: `tasks {
  id: uuid PK
  idempotency_key: varchar unique nullable  -- for exactly-once submission
  type: varchar  -- e.g., "send_email", "generate_thumbnail"
  payload: jsonb
  priority: enum(critical, high, normal, low)  -- maps to priority value 0-3
  status: enum(queued, scheduled, running, completed, failed, dead_lettered)
  scheduled_at: timestamp  -- null for immediate, future timestamp for delayed
  deadline: timestamp nullable  -- task expires if not completed by this time
  retry_policy: jsonb  -- {maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2, maxBackoffMs: 60000}
  attempt_count: int default 0
  max_attempts: int default 3
  last_error: text nullable
  worker_id: varchar nullable  -- which worker is processing this
  locked_until: timestamp nullable  -- visibility timeout
  result: jsonb nullable
  created_at: timestamp
  started_at: timestamp nullable
  completed_at: timestamp nullable
}

schedules {
  id: uuid PK
  type: varchar
  payload: jsonb
  cron_expression: varchar  -- e.g., "0 */5 * * *" (every 5 hours)
  timezone: varchar
  next_run_at: timestamp
  last_run_at: timestamp nullable
  last_task_id: uuid nullable
  enabled: boolean
  created_at: timestamp
}

dead_letter_queue {
  id: bigint PK
  original_task_id: uuid FK
  type: varchar
  payload: jsonb
  error_history: jsonb[]  -- [{attempt, error, timestamp}]
  total_attempts: int
  dead_lettered_at: timestamp
  requeued_at: timestamp nullable
}

task_metrics {
  type: varchar
  window_start: timestamp
  submitted_count: bigint
  completed_count: bigint
  failed_count: bigint
  avg_latency_ms: float
  p99_latency_ms: float
  PK(type, window_start)
}`,
      examples: [
        { table: 'tasks', label: 'Queued email task with retry policy', json: `{ "id": "task-d4e5f6a7", "idempotency_key": "email-welcome-user-7291", "type": "send_email", "payload": {"to": "alice@example.com", "template": "welcome", "vars": {"name": "Alice"}}, "priority": "normal", "status": "queued", "scheduled_at": null, "deadline": "2025-04-18T12:00:00Z", "retry_policy": {"maxRetries": 3, "backoffMs": 1000, "backoffMultiplier": 2, "maxBackoffMs": 60000}, "attempt_count": 0, "max_attempts": 3, "last_error": null, "worker_id": null, "locked_until": null, "result": null, "created_at": "2025-04-18T10:00:00Z", "started_at": null, "completed_at": null }` },
        { table: 'dead_letter_queue', label: 'Failed task moved to DLQ after max retries', json: `{ "id": 4029, "original_task_id": "task-b1c2d3e4", "type": "generate_thumbnail", "payload": {"image_url": "s3://uploads/img-broken.png", "sizes": [128, 256]}, "error_history": [{"attempt": 1, "error": "Image decode failed: corrupt header", "timestamp": "2025-04-17T08:00:05Z"}, {"attempt": 2, "error": "Image decode failed: corrupt header", "timestamp": "2025-04-17T08:00:12Z"}, {"attempt": 3, "error": "Image decode failed: corrupt header", "timestamp": "2025-04-17T08:00:28Z"}], "total_attempts": 3, "dead_lettered_at": "2025-04-17T08:00:28Z", "requeued_at": null }` },
        { table: 'schedules', label: 'Recurring cleanup schedule', json: `{ "id": "sched-a1b2c3d4", "type": "cleanup_temp_files", "payload": {"directory": "/tmp/uploads", "max_age_hours": 24}, "cron_expression": "0 */6 * * *", "timezone": "UTC", "next_run_at": "2025-04-18T12:00:00Z", "last_run_at": "2025-04-18T06:00:00Z", "last_task_id": "task-e5f6a7b8", "enabled": true, "created_at": "2025-01-01T00:00:00Z" }` },
      ]
    },

    basicImplementation: {
      title: 'Basic Architecture',
      diagramSrc: '/diagrams/distributed-task-scheduler/impl-basic.png',
      description: 'Tasks are inserted into a database table. Workers poll the table for unclaimed tasks, lock a row using SELECT FOR UPDATE, process it, and update the status. A cron job checks for scheduled tasks whose time has arrived and moves them to the ready queue.',
      problems: [
        'Database polling is inefficient and adds latency (polling interval vs. task pickup speed)',
        'SELECT FOR UPDATE creates lock contention under high concurrency',
        'No priority support: all tasks are treated equally in the polling query',
        'Worker crash while holding a lock: task is stuck until lock timeout expires',
        'Single database becomes the bottleneck for both reads and writes'
      ]
    },

    advancedImplementation: {
      title: 'Distributed Task Scheduler with Priority Queues and Exactly-Once Semantics',
      diagramSrc: '/diagrams/distributed-task-scheduler/impl-advanced.png',
      description: 'Tasks are submitted to a partitioned queue (Kafka or Redis Streams) organized by priority. A scheduler service manages delayed and cron tasks using a time-ordered priority queue (backed by Redis sorted sets with score = scheduled_time). Workers pull tasks via a consumer group pattern with visibility timeouts. A lease-based protocol ensures at-most-one active execution: the worker must renew its lease periodically, and if it fails to do so, the task becomes available for another worker.',
      keyPoints: [
        'Priority queues: separate queues per priority level, workers always check critical before high before normal',
        'Visibility timeout (lease): when a worker picks a task, it becomes invisible to other workers for T seconds; worker must heartbeat to extend the lease',
        'Delayed task scheduler: Redis sorted set with score=scheduled_timestamp; background thread checks for tasks where score <= now() and moves them to the ready queue',
        'Exactly-once via idempotency: each task has an idempotency_key; workers check a deduplication store before processing',
        'Dead letter queue: after max_attempts exhausted, task moved to DLQ with full error history for manual inspection',
        'Rate limiting: token bucket per task type; workers check rate limit before executing, back off if limit reached'
      ],
      databaseChoice: 'Redis Streams (or Kafka) for primary task queues; Redis sorted sets for delayed task scheduling; PostgreSQL for task history and DLQ persistence; Redis for rate limiting counters and distributed locks',
      caching: 'Worker-side task type config cache (retry policies, rate limits) with 1-minute TTL; schedule metadata cached in scheduler service memory; rate limit token buckets maintained in Redis with atomic MULTI/EXEC operations'
    },

    tips: [
      'Start by clarifying the exactly-once semantics: it is really at-least-once + idempotent handlers',
      'The visibility timeout pattern is critical: explain how it handles worker crashes without losing tasks',
      'Priority queues add complexity: discuss weighted fair queuing vs. strict priority and starvation prevention',
      'Discuss the cron scheduling mechanism: time-wheel or sorted set approach for efficient scheduled task management',
      'Rate limiting is often overlooked: explain why unconstrained task execution can overwhelm downstream services',
      'Observability matters: discuss how you track task latency, queue depth, and worker utilization'
    ],

    keyQuestions: [
      {
        question: 'How do you achieve exactly-once task execution?',
        answer: `**The Reality: At-Least-Once + Idempotency = Exactly-Once Semantics**

True exactly-once in a distributed system is impossible (FLP impossibility). What we achieve:
- **At-least-once delivery**: guaranteed by the queue + retry mechanism
- **Exactly-once processing**: guaranteed by making task handlers idempotent

**At-Least-Once Delivery via Visibility Timeout**:
\`\`\`
1. Worker pulls task from queue
2. Task becomes "invisible" to other workers for 60 seconds (visibility timeout)
3. Worker processes task:
   a. Success: worker sends ACK, task permanently removed from queue
   b. Worker crashes: no ACK, visibility timeout expires after 60s
   c. Task reappears in queue, another worker picks it up
4. Worker taking too long: heartbeat extends visibility timeout before it expires
\`\`\`

**Problem: Duplicate Execution**:
\`\`\`
Worker A picks task, processes it, sends ACK
ACK is lost due to network issue
Visibility timeout expires -> task reappears
Worker B picks the same task -> processes it AGAIN
\`\`\`

**Solution: Idempotency Key + Deduplication Store**:
\`\`\`python
def process_task(task):
    dedup_key = f"task:{task.idempotency_key}"

    # Check if already processed (Redis SET NX with TTL)
    if redis.set(dedup_key, "processing", nx=True, ex=86400):
        # First time: process the task
        result = execute_task_logic(task)
        redis.set(dedup_key, json.dumps(result), ex=86400)
        return result
    else:
        # Already processed: return cached result
        return json.loads(redis.get(dedup_key))
\`\`\`

**Making Task Handlers Idempotent**:
- **Sending email**: check if email already sent for this event (dedup by event_id)
- **Charging payment**: use Stripe's idempotency_key parameter
- **Updating database**: use upsert (INSERT ON CONFLICT UPDATE) instead of blind INSERT
- **Generating thumbnail**: check if output already exists in storage before processing

**Idempotency Key Generation**:
- Must be deterministic for the same logical task
- Example: \`send_email:{userId}:{eventType}:{eventId}\`
- Caller provides it at submission time (not auto-generated UUID)`
      },
      {
        question: 'How does the retry mechanism with dead letter queues work?',
        answer: `**Retry Policy Configuration**:
\`\`\`json
{
  "maxRetries": 5,
  "initialBackoffMs": 1000,
  "backoffMultiplier": 2,
  "maxBackoffMs": 60000,
  "jitterPercent": 25,
  "retryableErrors": ["TIMEOUT", "SERVICE_UNAVAILABLE", "RATE_LIMITED"],
  "nonRetryableErrors": ["INVALID_INPUT", "UNAUTHORIZED"]
}
\`\`\`

**Retry Flow**:
\`\`\`
Attempt 1: execute task
  -> fails with TIMEOUT
  -> delay = 1000ms + random(0, 250ms) = ~1.1s
  -> requeue with scheduled_at = now + 1.1s

Attempt 2: execute task (after 1.1s delay)
  -> fails with SERVICE_UNAVAILABLE
  -> delay = 2000ms + random(0, 500ms) = ~2.3s
  -> requeue with scheduled_at = now + 2.3s

Attempt 3: execute task (after 2.3s delay)
  -> fails with TIMEOUT
  -> delay = 4000ms + random(0, 1000ms) = ~4.7s
  -> requeue with scheduled_at = now + 4.7s

...

Attempt 5: execute task
  -> fails with TIMEOUT
  -> max retries exhausted -> move to Dead Letter Queue
\`\`\`

**Why Jitter?**:
- Without jitter: if 1000 tasks fail at the same time, all retry at the same time -> thundering herd
- With 25% jitter: retries spread across a time window, reducing downstream load spike

**Dead Letter Queue (DLQ)**:
\`\`\`python
def handle_task_failure(task, error):
    task.attempt_count += 1

    if error.type in task.retry_policy.non_retryable_errors:
        move_to_dlq(task, error, reason="non_retryable_error")
        return

    if task.attempt_count >= task.retry_policy.max_retries:
        move_to_dlq(task, error, reason="max_retries_exhausted")
        return

    if task.deadline and now() > task.deadline:
        move_to_dlq(task, error, reason="deadline_exceeded")
        return

    # Calculate next retry delay
    delay = min(
        task.retry_policy.initial_backoff * (task.retry_policy.multiplier ** task.attempt_count),
        task.retry_policy.max_backoff
    )
    jitter = delay * random.uniform(0, task.retry_policy.jitter_percent / 100)
    task.scheduled_at = now() + delay + jitter
    requeue(task)
\`\`\`

**DLQ Management**:
- Dashboard shows all dead-lettered tasks with error history
- Operators can: inspect, retry individual tasks, retry all tasks of a type, purge
- Auto-alerting: if DLQ size exceeds threshold for a task type, page the owning team
- DLQ retention: 30 days, then archived to cold storage for compliance`
      },
      {
        question: 'How does priority scheduling prevent starvation?',
        answer: `**Strict Priority (Simple but Dangerous)**:
\`\`\`
Queue: CRITICAL -> HIGH -> NORMAL -> LOW
Worker always checks CRITICAL first, then HIGH, etc.

Problem: if CRITICAL queue always has tasks, NORMAL and LOW never execute
This is "starvation"
\`\`\`

**Weighted Fair Queuing (Better)**:
\`\`\`
Priority weights:
  CRITICAL: 50%
  HIGH:     30%
  NORMAL:   15%
  LOW:       5%

For every 100 tasks a worker processes:
  ~50 from CRITICAL
  ~30 from HIGH
  ~15 from NORMAL
  ~5 from LOW
\`\`\`

**Implementation with Weighted Random Selection**:
\`\`\`python
def pick_next_task(worker):
    # Check if any CRITICAL tasks exist (always priority)
    if critical_queue.size() > 0 and critical_queue.oldest_age() > MAX_WAIT:
        return critical_queue.dequeue()

    # Weighted random selection
    weights = {
        'critical': 50 * critical_queue.size_factor(),
        'high': 30 * high_queue.size_factor(),
        'normal': 15 * normal_queue.size_factor(),
        'low': 5 * low_queue.size_factor()
    }
    selected_queue = weighted_random_choice(weights)
    return selected_queue.dequeue()

def size_factor(queue):
    # Boost weight for queues that are backing up
    if queue.size() > queue.threshold:
        return min(queue.size() / queue.threshold, 3.0)  # cap at 3x
    return 1.0
\`\`\`

**Anti-Starvation Mechanisms**:
1. **Age-based promotion**: tasks waiting longer than threshold get promoted
   - NORMAL task waiting > 5 minutes -> promoted to HIGH
   - LOW task waiting > 15 minutes -> promoted to NORMAL
2. **Minimum guarantees**: reserve 5% of worker capacity for LOW priority
   - Even under heavy CRITICAL load, LOW tasks make progress
3. **Deadline awareness**: tasks with approaching deadlines get boosted regardless of priority

**Dynamic Priority Adjustment**:
\`\`\`
Scenario: payment processing tasks are NORMAL priority, but at month-end the queue backs up

Monitor detects:
  - payment_processing queue depth: 50K (threshold: 10K)
  - avg wait time: 45 minutes (SLA: 15 minutes)

Auto-adjustment:
  - Temporarily promote payment_processing to HIGH priority
  - Scale up worker pool for payment_processing type
  - Alert team: "payment_processing queue backed up, auto-promoted to HIGH"
  - Revert when queue depth drops below threshold
\`\`\`

**Worker Specialization**:
- Some workers only process specific task types (GPU workers for ML tasks)
- Generic workers handle all types with priority weighting
- Dedicated worker pools for CRITICAL tasks ensure they are never starved by volume of lower-priority work`
      }
    ],

    requirements: ['Task queuing', 'Priority scheduling', 'Retry with backoff', 'Dead letter queues', 'Cron scheduling', 'Exactly-once semantics'],
    components: ['Task Queue (Redis Streams / Kafka)', 'Scheduler Service', 'Worker Fleet', 'DLQ Manager', 'Rate Limiter', 'PostgreSQL (task history)', 'Redis (delayed tasks + locks)', 'Monitoring Dashboard'],
    keyDecisions: [
      'Visibility timeout with heartbeat for crash-safe task processing without lost tasks',
      'At-least-once delivery plus idempotency keys for exactly-once processing semantics',
      'Weighted fair queuing with age-based promotion to prevent priority starvation',
      'Redis sorted sets for efficient delayed and cron task scheduling',
      'Dead letter queue with full error history for diagnosable failure handling',
      'Per-task-type rate limiting with token buckets to protect downstream services'
    ],
    edgeCases: [
      { scenario: 'Worker crashes after processing task but before acknowledging completion', impact: 'Task is re-executed after visibility timeout, causing duplicate side effects (double email, double charge)', mitigation: 'Require all task handlers to be idempotent using unique idempotency keys, store completion records in database before acknowledging' },
      { scenario: 'Poison pill task that crashes every worker it is assigned to', impact: 'Task cycles through retries, consuming worker capacity and blocking the queue', mitigation: 'Track consecutive failure count per task, move to dead letter queue after max retries, alert on DLQ growth rate' },
      { scenario: 'Cron-scheduled task takes longer than its scheduling interval', impact: 'Multiple instances of the same cron job run concurrently, causing resource contention and duplicate work', mitigation: 'Use distributed locks with the cron job ID, skip execution if previous run still active, alert if overlap exceeds threshold' },
      { scenario: 'Downstream service rate limit hit during batch task processing', impact: 'All tasks for that service fail simultaneously, filling the retry queue', mitigation: 'Per-task-type rate limiting with token buckets, exponential backoff on 429 responses, circuit breaker to pause task type when downstream is overwhelmed' },
      { scenario: 'Priority inversion starving low-priority tasks indefinitely', impact: 'Low-priority tasks never execute during sustained high-priority load, violating SLAs', mitigation: 'Age-based priority promotion (tasks waiting beyond threshold get boosted), reserve minimum worker capacity for each priority tier' },
    ],
    tradeoffs: [
      { decision: 'At-least-once vs exactly-once delivery', pros: 'At-least-once is simpler and more available; exactly-once prevents duplicate processing', cons: 'At-least-once requires idempotent handlers; exactly-once adds coordination overhead and reduces throughput', recommendation: 'At-least-once delivery with idempotency keys at the application level for practical exactly-once semantics without distributed transaction cost' },
      { decision: 'Pull-based (workers poll) vs push-based (broker dispatches) task assignment', pros: 'Pull gives workers backpressure control; push enables faster dispatch and better load balancing', cons: 'Pull adds polling latency and wasted requests; push can overwhelm slow workers', recommendation: 'Pull-based with long-polling for most workloads, push-based for ultra-low-latency tasks where milliseconds matter' },
      { decision: 'Redis-based queue vs Kafka-based queue', pros: 'Redis gives sub-millisecond latency and simple ops; Kafka provides durability, replay, and massive throughput', cons: 'Redis risks data loss on failure and limited persistence; Kafka has higher latency and operational complexity', recommendation: 'Redis for low-latency interactive tasks with small payloads, Kafka for high-throughput durable workloads like event processing and ETL' },
      { decision: 'Central scheduler vs distributed scheduling', pros: 'Central is simpler to reason about ordering and priorities; distributed eliminates single point of failure', cons: 'Central becomes a bottleneck at scale; distributed complicates global priority ordering and deduplication', recommendation: 'Partitioned central scheduler (shard by task type or tenant) for the balance of simplicity and scalability' },
    ],
    layeredDesign: [
      { name: 'Client SDK Layer', purpose: 'Submit tasks, query status, and define task handlers', components: ['Task Submission SDK', 'Status Query API', 'Cron Expression Parser', 'Task Handler Framework'] },
      { name: 'Scheduling Layer', purpose: 'Queue tasks, manage priorities, and handle delayed execution', components: ['Priority Queue Manager', 'Delayed Task Scheduler (Redis ZSET)', 'Cron Trigger Service', 'Rate Limiter'] },
      { name: 'Execution Layer', purpose: 'Dispatch tasks to workers and manage lifecycle', components: ['Worker Fleet', 'Task Dispatcher', 'Heartbeat Monitor', 'Retry Engine'] },
      { name: 'Reliability Layer', purpose: 'Ensure delivery guarantees and handle failures', components: ['Dead Letter Queue', 'Idempotency Store', 'Distributed Lock Manager', 'Audit Log (PostgreSQL)'] },
    ],
  },

  // ─── NEW: LeetCode Online Judge ──────────────────────────────────────
  {
    id: 'leetcode-online-judge',
    isNew: true,
    title: 'LeetCode Online Judge',
    subtitle: 'Code Execution & Evaluation Platform',
    icon: 'code',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design an online judge system that compiles, executes, and evaluates code submissions against test cases in multiple languages.',

    introduction: `Online judge platforms like LeetCode, HackerRank, and Codeforces serve millions of developers practicing coding challenges. The core challenge is executing untrusted user code safely, efficiently, and at scale while providing near-instant feedback.

The system must handle bursty traffic patterns (contest mode with thousands of simultaneous submissions), support 15+ programming languages, enforce strict time and memory limits, and prevent malicious code from escaping the sandbox. Each submission spawns an isolated execution environment, runs against multiple test cases, and returns granular results (pass/fail per test, runtime, memory usage).

Beyond basic execution, production systems need plagiarism detection across submissions, editorial solutions, discussion forums, and contest ranking with real-time leaderboards. The code execution pipeline is the hardest part — it requires container orchestration, resource limiting via cgroups, and careful security boundaries.

Key architectural decisions include queue-based processing vs. synchronous execution, container reuse vs. fresh containers per submission, and how to scale the worker fleet during contests.`,

    functionalRequirements: [
      'Submit code in 15+ languages and receive compilation + execution results',
      'Run submissions against hidden test cases with time/memory limits',
      'Support contests with real-time leaderboards and rankings',
      'Provide per-test-case pass/fail results with runtime and memory stats',
      'Display editorial solutions and allow community discussions',
      'Track user progress, streaks, and problem completion history',
    ],
    nonFunctionalRequirements: [
      'Submission results returned within 5 seconds for standard problems',
      'Secure sandboxed execution — no escape from container isolation',
      'Handle 10K+ concurrent submissions during contests',
      'Zero data loss on submissions even during worker failures',
      '99.9% availability for the submission pipeline',
    ],
    dataModel: {
      description: 'Core entities: Users, Problems, Submissions, TestCases, Contests',
      schema: `problems: id, title, slug, difficulty, description, constraints, companies[], topics[], acceptance_rate, created_at
test_cases: id, problem_id, input, expected_output, is_sample, order_index
submissions: id, user_id, problem_id, language, code, status (pending|running|accepted|wrong_answer|TLE|MLE|RE|CE), runtime_ms, memory_kb, created_at
submission_results: id, submission_id, test_case_id, status, actual_output, runtime_ms, memory_kb
contests: id, title, start_time, end_time, problems[], registered_users[]
contest_rankings: contest_id, user_id, score, penalty_time, solved_count, rank`,
      examples: [
        { table: 'submissions', label: 'Accepted Python submission', json: `{ "id": 4829173, "user_id": 82910, "problem_id": 1, "language": "python3", "code": "class Solution:\\n    def twoSum(self, nums, target):\\n        seen = {}\\n        for i, n in enumerate(nums):\\n            if target - n in seen:\\n                return [seen[target-n], i]\\n            seen[n] = i", "status": "accepted", "runtime_ms": 48, "memory_kb": 16420, "created_at": "2025-04-18T10:15:00Z" }` },
        { table: 'problems', label: 'Medium difficulty problem', json: `{ "id": 15, "title": "3Sum", "slug": "3sum", "difficulty": "Medium", "description": "Given an integer array nums, return all the triplets...", "constraints": "-10^5 <= nums[i] <= 10^5", "companies": ["Google", "Amazon", "Meta"], "topics": ["Array", "Two Pointers", "Sorting"], "acceptance_rate": 0.332, "created_at": "2024-01-01T00:00:00Z" }` },
        { table: 'contest_rankings', label: 'Contest participant ranking', json: `{ "contest_id": 420, "user_id": 82910, "score": 18, "penalty_time": 4520, "solved_count": 3, "rank": 142 }` },
      ]
    },
    apiDesign: {
      description: 'REST API for submissions, problems, and contests',
      endpoints: [
        { method: 'POST', path: '/api/submissions', params: '{ problem_id, language, code }', response: '{ submission_id, status: "queued" }', notes: 'Async — returns immediately, poll for results' },
        { method: 'GET', path: '/api/submissions/:id', params: 'submission_id', response: '{ status, runtime_ms, memory_kb, test_results[] }', notes: 'Poll or use WebSocket for real-time updates' },
        { method: 'GET', path: '/api/problems/:slug', params: 'slug', response: '{ problem details, sample_test_cases, stats }', notes: 'Public problem data with sample cases only' },
        { method: 'POST', path: '/api/submissions/:id/run', params: '{ code, language, custom_input }', response: '{ output, runtime, status }', notes: 'Run against custom input without submitting' },
        { method: 'GET', path: '/api/contests/:id/leaderboard', params: 'contest_id, page', response: '{ rankings[], total }', notes: 'Real-time during contest, cached after' },
      ]
    },
    keyQuestions: [
      { question: 'How do you safely execute untrusted user code?', answer: 'Use container-level isolation with strict resource controls. Each submission runs in an ephemeral Docker container (or gVisor/Firecracker microVM) with: (1) cgroups limiting CPU time, memory, and process count, (2) seccomp profiles blocking dangerous syscalls (no network, no filesystem writes outside /tmp), (3) read-only root filesystem, (4) no network access, (5) execution timeout with SIGKILL. The container is destroyed after execution. For extra security, run workers on dedicated nodes isolated from the main infrastructure. Language-specific measures include disabling reflection/JNI in Java, restricting imports in Python, and compiling with -fsanitize in C++.' },
      { question: 'How do you handle 10K concurrent submissions during a contest?', answer: 'Use a queue-based architecture: submissions go into a distributed message queue (Kafka or SQS), and a fleet of worker nodes pulls jobs. Auto-scale workers based on queue depth — during contests, pre-warm extra workers. Key optimizations: (1) pre-pull Docker images for all languages on workers, (2) reuse warm containers for the same language (reset state between runs), (3) prioritize contest submissions over practice submissions with separate queues, (4) use spot/preemptible instances for cost efficiency. The queue provides natural backpressure and ensures zero submission loss even if workers crash.' },
      { question: 'How do you minimize submission latency?', answer: 'Target sub-5s end-to-end: (1) Skip cold container start by maintaining warm pools of pre-initialized containers per language, (2) compile and run in the same container to avoid network transfer, (3) stream test case results as they complete rather than waiting for all, (4) cache compilation results for identical code (hash-based), (5) use local SSD for test case data on workers, (6) run test cases in parallel for independent cases. For "Run Code" (custom input), use a fast path that skips the queue and hits a warm worker pool directly.' },
      { question: 'How would you implement the real-time contest leaderboard?', answer: 'During a contest, use a Redis sorted set per contest. Score = (solved_count * 1000000) - penalty_time for natural ordering. On each accepted submission: ZADD updates the score atomically, then publish a leaderboard-change event via pub/sub. The frontend connects via WebSocket and receives incremental updates. For scale, partition by contest_id. After the contest ends, materialize the final rankings to PostgreSQL and cache the leaderboard. Handle tie-breaking by earliest solve time stored in a secondary sorted set.' },
      { question: 'How do you detect plagiarism across submissions?', answer: 'Use a multi-layer approach: (1) AST-based comparison — parse submissions into abstract syntax trees and compare structural similarity (MOSS algorithm), normalizing variable names and formatting, (2) Token-based analysis — tokenize code and run winnowing/fingerprinting to detect copied segments, (3) Statistical anomaly — flag when a user suddenly solves a hard problem in under 1 minute or submits code with different coding style than their history. Run plagiarism checks asynchronously after contests. Store code fingerprints in a searchable index for O(1) lookup of known copied solutions. Alert contest admins with similarity scores and side-by-side diffs.' },
      { question: 'How do you handle different programming languages?', answer: 'Each language has a "judge profile" defining: compiler command, run command, file extension, time multiplier (Java gets 2x time limit vs C++), memory multiplier, and compilation flags. Store profiles in a configuration service. Workers pull the appropriate Docker image (python:3.11-slim, gcc:13, openjdk:17, etc.) from a local registry. Key considerations: (1) normalize output comparison (trim trailing whitespace/newlines), (2) handle language-specific gotchas (floating point precision, integer overflow), (3) measure wall-clock time not CPU time for fairness, (4) set per-language memory limits (JVM needs more baseline memory than C).' },
    ],
    basicImplementation: {
      title: 'Basic Online Judge',
      diagramSrc: '/diagrams/leetcode-online-judge/impl-basic.png',
      description: 'Synchronous execution with Docker containers and a simple queue',
      svgTemplate: null,
      problems: ['Single worker bottleneck during contests', 'Cold container starts add 2-3s latency', 'No plagiarism detection', 'No horizontal scaling for execution'],
    },
    advancedImplementation: {
      title: 'Production Online Judge',
      diagramSrc: '/diagrams/leetcode-online-judge/impl-advanced.png',
      description: 'Distributed execution fleet with warm container pools, priority queues, and real-time leaderboards',
      svgTemplate: null,
      keyPoints: ['Auto-scaling worker fleet with pre-warmed containers', 'Priority queues separating contest vs practice submissions', 'Redis sorted sets for real-time leaderboard', 'AST-based plagiarism detection pipeline', 'gVisor/Firecracker for stronger sandbox isolation'],
      databaseChoice: 'PostgreSQL for problems/submissions/users, Redis for leaderboards and queue metadata, S3 for code storage and test case files',
      caching: 'Cache problem metadata and sample test cases in CDN, compilation results by code hash, leaderboard snapshots in Redis',
    },
  },

  // ─── NEW: Strava Fitness Tracking ────────────────────────────────────
  {
    id: 'strava-fitness-tracking',
    isNew: true,
    title: 'Strava Fitness Tracking',
    subtitle: 'GPS Activity & Social Fitness Platform',
    icon: 'activity',
    color: '#fc4c02',
    difficulty: 'Medium',
    description: 'Design a fitness tracking platform that records GPS activities, provides social features, and ranks users on road segments.',

    introduction: `Strava is a social fitness platform where athletes record GPS-based activities (running, cycling, swimming), share them with followers, and compete on road segments. The core technical challenges involve processing high-frequency GPS data streams, matching activities to predefined road segments, and maintaining real-time leaderboards.

The system ingests millions of GPS activities daily, each containing thousands of coordinate points at 1-second intervals. Post-upload processing includes route matching to known roads, segment detection (matching portions of the activity to community-defined segments), pace/speed/elevation calculations, and social feed distribution.

Segments are the killer feature — any user can create a segment on a stretch of road, and Strava automatically ranks every athlete who has ever ridden/run that segment. This requires efficient geospatial matching: given a GPS trace, find all segments that overlap with the route, determine exact entry/exit points, and compute segment-specific times.

Real-time activity tracking (live location sharing during an activity) adds WebSocket complexity, while the social feed requires efficient fan-out of activities to followers.`,

    functionalRequirements: [
      'Record GPS activities with heart rate, cadence, and power data',
      'Automatic segment detection and leaderboard ranking',
      'Social feed showing followed athletes activities',
      'Route matching to known roads and trails',
      'Activity statistics: pace, elevation gain, estimated calories',
      'Live activity tracking with real-time location sharing',
      'Personal records and year-over-year comparisons',
    ],
    nonFunctionalRequirements: [
      'Process uploaded activities within 30 seconds including segment matching',
      'Support 50M+ active users uploading 10M+ activities per week',
      'Segment matching accuracy within 10 meters of actual route',
      'Live tracking updates delivered within 2 seconds',
      '99.95% availability for activity upload and retrieval',
    ],
    dataModel: {
      description: 'Core entities: Users, Activities, Segments, SegmentEfforts, Routes',
      schema: `users: id, name, profile_pic, followers_count, following_count, total_distance_km, created_at
activities: id, user_id, type (run|ride|swim), start_time, elapsed_time_s, distance_m, elevation_gain_m, avg_speed, max_speed, avg_hr, calories, polyline (encoded), gps_points JSONB, gear_id
segments: id, name, creator_id, start_latlng, end_latlng, distance_m, avg_grade, polyline, city, country, bounding_box, created_at
segment_efforts: id, segment_id, activity_id, user_id, elapsed_time_s, start_index, end_index, rank, pr_rank, created_at
follows: follower_id, following_id, created_at
feed_items: id, user_id, activity_id, created_at`,
      examples: [
        { table: 'activities', label: 'Morning cycling activity with GPS data', json: `{ "id": 9201847, "user_id": 40291, "type": "ride", "start_time": "2025-04-18T06:30:00Z", "elapsed_time_s": 5420, "distance_m": 42150, "elevation_gain_m": 385, "avg_speed": 28.0, "max_speed": 52.3, "avg_hr": 148, "calories": 1120, "polyline": "}_~kFn|yiVo@mA...", "gps_points": [{"lat": 40.7128, "lng": -74.006, "elev": 10, "t": 0}], "gear_id": "bike-001" }` },
        { table: 'segments', label: 'Popular hill climb segment', json: `{ "id": 302918, "name": "Hawk Hill Climb", "creator_id": 10042, "start_latlng": [37.8324, -122.4996], "end_latlng": [37.8265, -122.4955], "distance_m": 1820, "avg_grade": 6.2, "polyline": "qgkeFnxdjV...", "city": "Sausalito", "country": "US", "bounding_box": [37.825, -122.501, 37.834, -122.494], "created_at": "2023-05-10T12:00:00Z" }` },
        { table: 'segment_efforts', label: 'Personal record on a segment', json: `{ "id": 58201934, "segment_id": 302918, "activity_id": 9201847, "user_id": 40291, "elapsed_time_s": 312, "start_index": 1420, "end_index": 1580, "rank": 89, "pr_rank": 1, "created_at": "2025-04-18T07:05:22Z" }` },
      ]
    },
    apiDesign: {
      description: 'REST API for activities, segments, and social features',
      endpoints: [
        { method: 'POST', path: '/api/activities', params: '{ type, gps_points[], start_time, device }', response: '{ activity_id, processing_status }', notes: 'Async processing — GPS analysis, segment matching happen in background' },
        { method: 'GET', path: '/api/activities/:id', params: 'activity_id', response: '{ activity, segment_efforts[], stats, map_polyline }', notes: 'Full activity details with matched segments' },
        { method: 'GET', path: '/api/segments/:id/leaderboard', params: 'segment_id, filter (overall|age|weight|following)', response: '{ efforts[], user_rank }', notes: 'Filtered leaderboard with user position' },
        { method: 'GET', path: '/api/feed', params: 'cursor, limit', response: '{ activities[], next_cursor }', notes: 'Paginated social feed of followed athletes' },
        { method: 'POST', path: '/api/activities/:id/live', params: '{ lat, lng, speed, hr, timestamp }', response: '202 Accepted', notes: 'Real-time location updates during live activity via WebSocket' },
      ]
    },
    keyQuestions: [
      { question: 'How does segment matching work at scale?', answer: 'Segment matching is a geospatial problem: given a GPS trace of N points, find all segments whose polyline overlaps the trace. Use a spatial index (R-tree or S2 geometry cells) to narrow candidates. Step 1: Compute the bounding box of the activity. Step 2: Query the spatial index for all segments whose bounding boxes intersect. Step 3: For each candidate segment, use the Fréchet distance or Hausman distance to compare the segment polyline against the matching portion of the activity trace. Step 4: If distance < threshold (10m), compute the entry/exit indices and elapsed time. Optimization: pre-compute S2 cell coverage for each segment and index by cell ID in a lookup table — this turns the spatial query into a simple set intersection.' },
      { question: 'How do you build the segment leaderboard?', answer: 'Each segment has a sorted leaderboard of all efforts. Use a Redis sorted set per segment (ZADD segment:{id} elapsed_time user_id). When a new segment effort is recorded: (1) ZADD to update the leaderboard, (2) ZRANK to get the new rank, (3) compare with previous best to detect PRs, (4) publish rank-change events for push notifications. For very popular segments (100K+ efforts), use tiered leaderboards — top 100 in Redis for fast access, full history in PostgreSQL. Filter leaderboards (age group, gender, followed athletes) require separate sorted sets or materialized views with periodic refresh.' },
      { question: 'How do you handle the social feed at scale?', answer: 'Hybrid push/pull fan-out model. When a user uploads an activity: (1) For users with < 5K followers, push the activity_id into each followers feed list (Redis LIST or sorted set by timestamp), (2) For celebrity athletes with 100K+ followers, use pull-on-read — when a follower loads their feed, query the celebrity activity list and merge with their pre-built feed. Feed reads: ZRANGEBYSCORE on the users feed sorted set, then batch-fetch activity details. Trim feeds to last 500 items. Cache hot activity data (thumbnail, summary stats) in the feed entry itself to avoid joins.' },
      { question: 'How do you process GPS data efficiently?', answer: 'Activity processing pipeline: (1) Ingest: receive raw GPS points (lat, lng, elevation, timestamp, hr, cadence) — typically 1 point/second, so a 1-hour ride is 3600 points. (2) Clean: remove GPS jitter using Kalman filter, fill gaps via interpolation, snap to roads using map-matching API. (3) Analyze: compute distance (Haversine formula between consecutive points), elevation gain (only count positive deltas after smoothing), speed, pace, calories (using heart rate and weight). (4) Encode: compress the polyline using Google Polyline Encoding for efficient storage and map rendering. (5) Match segments: run the spatial matching pipeline. All steps run as a Kafka-driven processing pipeline, each stage as a separate consumer group for independent scaling.' },
      { question: 'How would you implement live activity tracking?', answer: 'Use WebSocket connections for real-time location updates. The athlete app sends GPS coordinates every 3-5 seconds via WebSocket to a Live Tracking Service. This service: (1) writes the latest position to a Redis key (live:{activity_id}) with a 60s TTL, (2) publishes position updates to a pub/sub channel (live:{activity_id}), (3) followers watching the live activity subscribe to the channel and receive updates. Scaling: partition WebSocket connections across nodes using the activity_id as the routing key. Use Redis pub/sub (or Kafka) to bridge updates across nodes. For map rendering, buffer the last 5 positions and interpolate on the client for smooth animation. Automatically detect activity end when no updates arrive for 5 minutes.' },
      { question: 'How do you handle privacy and data protection for GPS data?', answer: 'GPS data is highly sensitive — it reveals home/work addresses and daily patterns. Implement: (1) Privacy zones — users define circular zones around addresses; any GPS points within the zone are stripped from the public activity, and the polyline is truncated before entering the zone. (2) Activity visibility controls — public, followers-only, or private per activity. (3) Segment opt-out — users can hide their efforts from public leaderboards. (4) Data retention — allow full GPS data deletion while keeping aggregate stats. (5) Enhanced privacy mode — add random offset (50-200m) to start/end points. Store raw GPS data encrypted at rest, and ensure the API never returns raw coordinates for other users activities — only encoded polylines for map display.' },
    ],
    basicImplementation: {
      title: 'Basic Fitness Tracker',
      diagramSrc: '/diagrams/strava-fitness-tracking/impl-basic.png',
      description: 'Monolithic app with PostGIS for spatial queries and basic feed',
      svgTemplate: null,
      problems: ['Segment matching is O(N*M) scanning all segments', 'Feed generation requires expensive joins', 'No real-time tracking', 'GPS processing blocks the upload response'],
    },
    advancedImplementation: {
      title: 'Production Fitness Platform',
      diagramSrc: '/diagrams/strava-fitness-tracking/impl-advanced.png',
      description: 'Event-driven pipeline with spatial indexing, hybrid fan-out feed, and real-time tracking',
      svgTemplate: null,
      keyPoints: ['S2 geometry spatial index for O(1) segment candidate lookup', 'Kafka pipeline for async GPS processing and segment matching', 'Hybrid push/pull fan-out for social feed', 'WebSocket + Redis pub/sub for live tracking', 'Tiered leaderboards: Redis for top-N, PostgreSQL for full history'],
      databaseChoice: 'PostgreSQL + PostGIS for activities and segments, Redis for leaderboards and live tracking, Kafka for processing pipeline, S3 for raw GPS files',
      caching: 'Cache segment leaderboard top-100 in Redis, activity summaries in CDN, feed items with embedded activity thumbnails',
    },
  },

  // ─── NEW: Online Auction ─────────────────────────────────────────────
  {
    id: 'online-auction',
    isNew: true,
    title: 'Online Auction (eBay)',
    subtitle: 'Real-time Bidding & Auction Platform',
    icon: 'dollarSign',
    color: '#e53e3e',
    difficulty: 'Medium',
    description: 'Design a real-time auction platform with concurrent bidding, anti-sniping protection, and auction lifecycle management.',

    introduction: `Online auction systems like eBay handle millions of concurrent auctions, each with real-time bidding, countdown timers, and strict consistency requirements. The core challenge is managing bid concurrency — when multiple users bid on the same item simultaneously, the system must guarantee that only the highest valid bid wins and that no bids are lost.

Auction timing is critical: auctions must end at exactly the scheduled time (or with anti-sniping extensions), and the winning bid must be determined atomically. This requires careful handling of distributed clocks, race conditions, and network delays.

The system also needs proxy bidding (automatic bidding up to a maximum), buy-it-now options, reserve prices, and a payment/escrow flow after auction completion. Real-time notifications keep bidders engaged, while the search and discovery system helps buyers find relevant auctions among millions of active listings.

Anti-fraud measures include shill bidding detection, bid shielding prevention, and seller reputation scoring. The payment escrow system must handle disputes, returns, and refunds.`,

    functionalRequirements: [
      'Create auctions with start/end time, starting price, reserve price, and buy-it-now option',
      'Place bids with real-time validation (must exceed current bid + increment)',
      'Proxy bidding: set maximum bid, system autobids up to that amount',
      'Anti-sniping: extend auction by 2 minutes if bid placed in final 30 seconds',
      'Real-time notifications for outbid, auction ending soon, and won/lost',
      'Search and browse active auctions with filters',
      'Payment escrow and seller/buyer rating after completion',
    ],
    nonFunctionalRequirements: [
      'Bid processing latency under 100ms',
      'Strong consistency for bid ordering — no lost or phantom bids',
      'Support 1M+ concurrent active auctions',
      'Real-time bid updates to all watchers within 500ms',
      '99.99% availability for bid placement during auction end times',
    ],
    dataModel: {
      description: 'Core entities: Auctions, Bids, Users, Watchlist, Payments',
      schema: `auctions: id, seller_id, title, description, category, images[], starting_price, reserve_price, buy_now_price, current_bid, current_bidder_id, bid_count, start_time, end_time, status (draft|active|ended|sold|unsold), anti_snipe_extensions
bids: id, auction_id, bidder_id, amount, max_proxy_bid, is_proxy, created_at, status (active|outbid|winning|cancelled)
watchlist: user_id, auction_id, created_at
payments: id, auction_id, buyer_id, seller_id, amount, platform_fee, status (pending|paid|in_escrow|released|disputed|refunded)`,
      examples: [
        { table: 'auctions', label: 'Active auction with bids and reserve', json: `{ "id": 820194, "seller_id": 40291, "title": "Vintage 1967 Fender Stratocaster", "description": "Original finish, all-original electronics...", "category": "musical-instruments", "images": ["img1.jpg", "img2.jpg"], "starting_price": 5000, "reserve_price": 15000, "buy_now_price": 25000, "current_bid": 12500, "current_bidder_id": 71829, "bid_count": 23, "start_time": "2025-04-15T10:00:00Z", "end_time": "2025-04-20T10:00:00Z", "status": "active", "anti_snipe_extensions": 0 }` },
        { table: 'bids', label: 'Proxy bid with maximum set', json: `{ "id": 5820193, "auction_id": 820194, "bidder_id": 71829, "amount": 12500, "max_proxy_bid": 18000, "is_proxy": false, "created_at": "2025-04-18T14:22:10Z", "status": "winning" }` },
        { table: 'payments', label: 'Payment held in escrow', json: `{ "id": "pay-a1b2c3", "auction_id": 820194, "buyer_id": 71829, "seller_id": 40291, "amount": 15000, "platform_fee": 450, "status": "in_escrow" }` },
      ]
    },
    apiDesign: {
      description: 'REST + WebSocket API for auctions and real-time bidding',
      endpoints: [
        { method: 'POST', path: '/api/auctions', params: '{ title, description, starting_price, reserve_price, duration, images[] }', response: '{ auction_id }', notes: 'Seller creates auction listing' },
        { method: 'POST', path: '/api/auctions/:id/bid', params: '{ amount, max_proxy_bid? }', response: '{ bid_id, current_price, your_status }', notes: 'Atomic bid with optimistic concurrency control' },
        { method: 'GET', path: '/ws/auctions/:id', params: 'WebSocket connection', response: 'Stream of bid events, timer updates', notes: 'Real-time bid stream for auction watchers' },
        { method: 'POST', path: '/api/auctions/:id/buy-now', params: '{ }', response: '{ payment_url }', notes: 'Instant purchase at buy-now price, ends auction immediately' },
        { method: 'GET', path: '/api/auctions/search', params: '{ query, category, price_range, sort }', response: '{ auctions[], total, facets }', notes: 'Full-text search with faceted filtering' },
      ]
    },
    keyQuestions: [
      { question: 'How do you handle concurrent bids on the same auction?', answer: 'Use optimistic concurrency control with a version counter. Each auction row has a version field. To place a bid: (1) Read current auction state (current_bid, version), (2) Validate new bid > current_bid + minimum_increment, (3) UPDATE auctions SET current_bid=:new_bid, current_bidder=:user, version=version+1 WHERE id=:auction_id AND version=:expected_version. If the UPDATE affects 0 rows, the version changed (concurrent bid), so retry from step 1. This guarantees exactly one winner per bid round without locks. For very hot auctions (100+ bids/second), use a Redis-based serialization queue — bids for the same auction are routed to the same queue and processed sequentially, then written to the database.' },
      { question: 'How does proxy bidding work?', answer: 'When a user sets a maximum proxy bid of $100 on an auction currently at $50: (1) Store the proxy bid in a separate table (not visible to others), (2) Place an actual bid at the minimum increment above current price ($51), (3) When another user bids $60, the system automatically bids $61 on behalf of the proxy bidder, (4) Continue until the proxy maximum is reached. If two users both have proxy bids, resolve immediately: the higher proxy wins at one increment above the lower proxy maximum. Implementation: keep proxy bids in a priority queue per auction, and after each new bid, check if any proxy bid can respond. This runs within the same transaction as bid processing.' },
      { question: 'How do you implement anti-sniping protection?', answer: 'Sniping is placing a bid in the final seconds to prevent counter-bids. Anti-sniping: if a bid is placed within the last N seconds (e.g., 30s) of an auction, extend the end time by M minutes (e.g., 2 min). Implementation: (1) Each bid checks if current_time > end_time - snipe_window, (2) If yes, UPDATE end_time = end_time + extension, (3) Track total extensions (cap at e.g., 30 minutes to prevent infinite extension). The Timer Service watches auction end times and triggers closing when end_time is reached with no further extensions. Use a Redis sorted set of auction end times, with a poller checking every second for auctions that should close.' },
      { question: 'How do you close auctions at exactly the right time?', answer: 'Use a dedicated Auction Timer Service. Store all active auction end_times in a Redis sorted set (ZADD active_auctions end_timestamp auction_id). A worker polls every second: ZRANGEBYSCORE active_auctions 0 current_timestamp to find expired auctions. For each: (1) Acquire a distributed lock on the auction, (2) Verify end_time hasnt been extended (anti-snipe check), (3) Determine winner (highest bidder if >= reserve price), (4) Update status to ended/sold/unsold atomically, (5) Trigger payment flow for winner, (6) Send notifications to all participants. Use multiple timer workers with leader election for HA. If a worker crashes, another picks up within 1 second.' },
      { question: 'How do you prevent auction fraud?', answer: 'Multi-layer fraud detection: (1) Shill bidding detection — flag when same-IP or related accounts bid on each others auctions using graph analysis of bidding relationships, (2) Bid shielding — detect patterns where accomplices place high bids to scare away real bidders then retract, (3) Velocity checks — rate limit bids per user per minute, (4) Payment verification — require payment method on file before bidding, (5) Seller verification — identity verification for high-value listings, (6) ML anomaly detection — train models on historical fraud patterns (unusual bidding times, bid amounts, account ages). Run fraud checks asynchronously to not slow the bid path, but immediately freeze suspicious accounts and auctions.' },
      { question: 'How do you design the payment and escrow system?', answer: 'After auction ends: (1) Winner gets a payment notification with a deadline (e.g., 3 days), (2) Payment is collected via Stripe/payment processor and held in escrow, (3) Seller ships the item and uploads tracking, (4) Buyer confirms receipt or auto-confirm after delivery + 3 days, (5) Escrow releases payment to seller minus platform fee. Dispute flow: buyer opens dispute within 7 days of delivery, funds remain in escrow during resolution, platform mediates based on evidence. Implementation: use a state machine (pending → paid → shipped → delivered → released) with timeout-based auto-transitions. Store all state transitions for audit trail.' },
    ],
    basicImplementation: {
      title: 'Basic Auction Platform',
      diagramSrc: '/diagrams/online-auction/impl-basic.png',
      description: 'Monolithic app with PostgreSQL row-level locking for bid serialization',
      svgTemplate: null,
      problems: ['Row-level locks create contention on hot auctions', 'Timer polling is imprecise', 'No proxy bidding', 'Notifications are delayed'],
    },
    advancedImplementation: {
      title: 'Production Auction Platform',
      diagramSrc: '/diagrams/online-auction/impl-advanced.png',
      description: 'Distributed bidding engine with optimistic concurrency, real-time updates, and fraud detection',
      svgTemplate: null,
      keyPoints: ['Optimistic concurrency with version counters for bid atomicity', 'Redis sorted sets for auction timer management', 'WebSocket fan-out for real-time bid updates', 'Proxy bid engine with priority queue resolution', 'ML-based fraud detection pipeline'],
      databaseChoice: 'PostgreSQL for auctions/bids/users with version column, Redis for timers and leaderboards, Elasticsearch for auction search, Kafka for event processing',
      caching: 'Cache auction details in Redis with short TTL (5s), search results in CDN, user bid history in application cache',
    },
  },

  // ─── NEW: Facebook Live Comments ─────────────────────────────────────
  {
    id: 'fb-live-comments',
    isNew: true,
    title: 'Facebook Live Comments',
    subtitle: 'Real-time Comment Streaming System',
    icon: 'messageCircle',
    color: '#1877f2',
    difficulty: 'Medium',
    description: 'Design a real-time comment streaming system for live video broadcasts with millions of concurrent viewers.',

    introduction: `Live comment systems power real-time interaction during live video broadcasts on platforms like Facebook Live, YouTube Live, and Twitch. The core challenge is fan-out at massive scale — a single popular live stream may have millions of concurrent viewers, each seeing a real-time stream of comments flowing at hundreds per second.

Unlike stored comments on regular posts, live comments are ephemeral and time-ordered. The system must ingest comments from millions of viewers, filter spam and profanity in real-time, and distribute approved comments to all connected viewers with sub-second latency. During peak events (Super Bowl, elections, celebrity streams), comment rates can spike to 10,000+ per second on a single stream.

The fan-out problem is the key architectural challenge. You cannot send every comment to every viewer individually — that would require N×M message deliveries. Instead, the system uses a hierarchical distribution model where comments flow through aggregation layers before reaching viewers. Client-side sampling ensures viewers see a manageable flow (e.g., 5-10 comments/second) even when the true rate is much higher.

Additional features include comment reactions (likes), pinned comments, moderator tools, and real-time sentiment analysis for the broadcaster.`,

    functionalRequirements: [
      'Post comments on live streams visible to all viewers in real-time',
      'Spam and profanity filtering with sub-100ms latency',
      'Comment rate limiting per user (max 1 comment per 3 seconds)',
      'Moderator tools: delete comments, ban users, slow mode',
      'Pinned/highlighted comments by broadcaster',
      'Comment reactions (likes) with aggregated counts',
      'Real-time comment count and sentiment indicators for broadcaster',
    ],
    nonFunctionalRequirements: [
      'End-to-end latency under 1 second from post to display',
      'Support 10M concurrent viewers on a single stream',
      'Handle 10K comments/second ingestion rate per stream',
      'Graceful degradation — show sampled comments rather than fail',
      '99.99% availability during live broadcasts',
    ],
    dataModel: {
      description: 'Core entities: LiveStreams, Comments, Moderation',
      schema: `live_streams: id, broadcaster_id, title, status (live|ended), viewer_count, comment_count, started_at
comments: id, stream_id, user_id, text, created_at, is_pinned, is_deleted, moderation_status (approved|filtered|deleted)
comment_reactions: comment_id, user_id, reaction_type, created_at
bans: stream_id, user_id, banned_by, reason, expires_at
moderation_rules: stream_id, rule_type (word_filter|slow_mode|subscriber_only), config JSONB`,
      examples: [
        { table: 'comments', label: 'Approved live stream comment', json: `{ "id": 920184736, "stream_id": 50291, "user_id": 82910, "text": "This is amazing! Best stream ever!", "created_at": "2025-04-18T20:15:42Z", "is_pinned": false, "is_deleted": false, "moderation_status": "approved" }` },
        { table: 'live_streams', label: 'Active live stream with high engagement', json: `{ "id": 50291, "broadcaster_id": 10042, "title": "Live Q&A with the Team", "status": "live", "viewer_count": 284500, "comment_count": 192048, "started_at": "2025-04-18T19:00:00Z" }` },
        { table: 'bans', label: 'Temporarily banned spammer', json: `{ "stream_id": 50291, "user_id": 99201, "banned_by": 10042, "reason": "Repeated spam links", "expires_at": "2025-04-18T21:00:00Z" }` },
      ]
    },
    apiDesign: {
      description: 'WebSocket-based real-time API with REST for management',
      endpoints: [
        { method: 'POST', path: '/ws/streams/:id/connect', params: 'WebSocket upgrade', response: 'Stream of comment events', notes: 'Client receives sampled comment stream based on total rate' },
        { method: 'POST', path: '/api/streams/:id/comments', params: '{ text }', response: '{ comment_id, status }', notes: 'Rate limited to 1 per 3s, passes through spam filter' },
        { method: 'DELETE', path: '/api/comments/:id', params: 'comment_id', response: '204', notes: 'Moderator-only, broadcasts deletion event to all viewers' },
        { method: 'POST', path: '/api/streams/:id/pin/:commentId', params: 'comment_id', response: '{ pinned: true }', notes: 'Broadcaster pins a comment visible to all viewers' },
        { method: 'GET', path: '/api/streams/:id/stats', params: 'stream_id', response: '{ viewer_count, comment_rate, sentiment }', notes: 'Real-time dashboard for broadcaster' },
      ]
    },
    keyQuestions: [
      { question: 'How do you fan out comments to millions of concurrent viewers?', answer: 'Use hierarchical fan-out with edge servers. Architecture: (1) Comment ingestion service receives comments and publishes to a Kafka topic partitioned by stream_id, (2) Regional aggregator services consume from Kafka and publish to a pub/sub layer (Redis pub/sub or custom), (3) Edge WebSocket servers in each region subscribe to relevant streams and push to connected clients. This creates a tree: 1 comment → Kafka → N regional aggregators → M edge servers → K clients per server. For a 10M viewer stream, with 1000 edge servers each handling 10K connections, each edge server gets the comment once and distributes locally. Total message amplification is ~1000x, not 10Mx.' },
      { question: 'How do you handle comment rate sampling for viewers?', answer: 'When comments arrive faster than viewers can read (>5/sec), apply client-guided sampling. Each edge server maintains a token bucket per stream — allow N comments/second through to clients. Selection criteria: (1) Always show comments from friends/followed users, (2) Always show moderator and broadcaster comments, (3) Prioritize comments with early reactions, (4) Random sample from remaining. The server sends a "comment_rate" metadata field so the client UI can show "2,340 comments/sec" while displaying a readable subset. During lulls, show all comments. This is configurable per stream — a small stream shows everything, a massive one samples aggressively.' },
      { question: 'How do you filter spam and profanity in real-time?', answer: 'Multi-stage pipeline: (1) Synchronous fast path (<10ms): word blocklist lookup using Aho-Corasick automaton (matches all blocked words in single pass), regex patterns for common spam (URLs, repeated characters), rate limit check. (2) Asynchronous slow path (<100ms): ML classifier for subtle spam/toxicity (runs in parallel, can retroactively delete if flagged). (3) User-reputation scoring: new accounts and previously flagged users get stricter filtering. Implementation: the fast path is in the ingestion service (in-memory), the ML path runs as a separate microservice that can lag behind. Comments that pass the fast path are immediately distributed; the ML path can send delete events within 100ms for false negatives.' },
      { question: 'How do you maintain comment ordering across distributed viewers?', answer: 'Perfect global ordering across millions of viewers is impractical and unnecessary. Use approximate ordering: (1) Each comment gets a Lamport timestamp (stream_sequence_number) assigned by the Kafka partition leader for that stream, (2) Edge servers buffer comments for a short window (200ms) and sort by sequence number before sending to clients, (3) Clients maintain a local buffer and insert comments in sequence order, dropping comments that arrive too late (>2s old). This gives viewers a consistent experience without requiring distributed consensus. For pinned comments and moderator actions, use a separate high-priority channel that bypasses the buffer.' },
      { question: 'How do you scale WebSocket connections?', answer: 'Each edge server handles 10-50K WebSocket connections. Scaling strategy: (1) Use a WebSocket gateway layer (e.g., Envoy or custom Go service) optimized for many idle connections, (2) Route viewers to the nearest edge region using DNS-based geo routing, (3) Within a region, load-balance across edge servers by stream_id consistent hashing (so all viewers of stream X on the same server share one upstream subscription), (4) Use connection pooling — each edge server maintains one subscription per stream to the regional aggregator regardless of how many local viewers. Capacity planning: 10M viewers / 10K per server = 1,000 servers. With 5 regions, ~200 servers per region. Auto-scale based on live viewer count.' },
      { question: 'What happens when a live stream ends?', answer: 'Graceful shutdown sequence: (1) Broadcaster ends stream → status changes to "ended", (2) Send final "stream_ended" event to all connected viewers via WebSocket, (3) Stop accepting new comments, (4) Allow 30-second drain for in-flight comments, (5) Close all WebSocket connections with a clean close frame, (6) Archive comments: move from hot storage (Redis) to cold storage (PostgreSQL/S3) for replay, (7) Generate stream summary (total comments, peak rate, sentiment timeline) for broadcaster analytics, (8) Clean up pub/sub channels and edge server subscriptions. Comments remain viewable in the VOD replay, but served from the archive rather than the live pipeline.' },
    ],
    basicImplementation: {
      title: 'Basic Live Comments',
      diagramSrc: '/diagrams/fb-live-comments/impl-basic.png',
      description: 'Single-server WebSocket with direct database writes',
      svgTemplate: null,
      problems: ['Single server limits to ~10K concurrent connections', 'Database writes bottleneck at high comment rates', 'No spam filtering', 'No sampling for high-volume streams'],
    },
    advancedImplementation: {
      title: 'Production Live Comment System',
      diagramSrc: '/diagrams/fb-live-comments/impl-advanced.png',
      description: 'Hierarchical fan-out with edge servers, Kafka backbone, and ML-based moderation',
      svgTemplate: null,
      keyPoints: ['Hierarchical fan-out: Kafka → regional aggregators → edge servers', 'Client-guided comment sampling for high-volume streams', 'Aho-Corasick + ML pipeline for real-time spam filtering', 'Approximate ordering with Lamport timestamps and client-side buffering', 'Auto-scaling edge fleet based on live viewer count'],
      databaseChoice: 'Kafka for comment ingestion and distribution, Redis for hot comment storage and pub/sub, PostgreSQL for archived comments, DynamoDB for user reputation scores',
      caching: 'Edge servers cache pinned comments and stream metadata, CDN for broadcaster profile images, in-memory word blocklist on ingestion servers',
    },
  },

  // ─── NEW: Facebook Post Search ───────────────────────────────────────
  {
    id: 'fb-post-search',
    isNew: true,
    title: 'Facebook Post Search',
    subtitle: 'Social Content Search Engine',
    icon: 'search',
    color: '#4267b2',
    difficulty: 'Medium',
    description: 'Design a search engine for social media posts with relevance ranking, social graph boosting, and privacy-aware filtering.',

    introduction: `Social search differs fundamentally from web search. In web search, pages are public and ranking is based on content relevance and authority (PageRank). In social search, most content is private, relevance depends heavily on the searcher's social graph, and results must respect complex privacy settings in real-time.

Facebook's post search must index billions of posts across text, images (via OCR/captions), links, and check-ins. When a user searches "birthday party photos," the results should prioritize posts from their friends, then friends-of-friends, then public posts — all while filtering out posts the searcher doesn't have permission to see.

The indexing pipeline must handle real-time updates: when a user changes a post's privacy setting from "public" to "friends only," search results must reflect this immediately. Typeahead suggestions must return in under 100ms, combining query completions with entity suggestions (people, pages, groups, places).

The ranking model blends text relevance (BM25/TF-IDF), social signals (likes, comments, shares from the searcher's network), recency, and engagement quality. Personalization is key — the same query should return different results for different users based on their social graph and interaction history.`,

    functionalRequirements: [
      'Full-text search across posts, comments, and shared content',
      'Typeahead suggestions with query completions and entity suggestions',
      'Privacy-aware filtering: only show results the searcher can see',
      'Social graph boosted ranking: friends content ranked higher',
      'Search filters: date range, post type, author, location',
      'Search across multiple content types: text, images, videos, links, events',
      'Trending search topics and popular queries',
    ],
    nonFunctionalRequirements: [
      'Search results returned within 200ms',
      'Typeahead suggestions within 50ms',
      'Index updated within 30 seconds of post creation/edit',
      'Privacy changes reflected in search within 5 seconds',
      'Support 100K+ search queries per second',
    ],
    dataModel: {
      description: 'Search index with social graph integration',
      schema: `search_documents: doc_id, author_id, content_text, content_type (post|comment|photo|video|event|link), privacy_level (public|friends|friends_of_friends|custom), mentioned_users[], tagged_users[], location, created_at, engagement_score, like_count, comment_count, share_count
entity_index: entity_id, entity_type (person|page|group|place|event), name, aliases[], follower_count, category
query_log: query_id, user_id, query_text, results_clicked[], timestamp
typeahead_index: prefix, suggestions[] (query completions + entity matches), score`,
      examples: [
        { table: 'search_documents', label: 'Indexed public post with engagement', json: `{ "doc_id": 920184736, "author_id": 40291, "content_text": "Just finished the marathon! 26.2 miles in 3:45:12. New personal best!", "content_type": "post", "privacy_level": "public", "mentioned_users": [], "tagged_users": [51823, 62914], "location": "Boston, MA", "created_at": "2025-04-18T14:30:00Z", "engagement_score": 0.87, "like_count": 342, "comment_count": 58, "share_count": 12 }` },
        { table: 'entity_index', label: 'Person entity for typeahead', json: `{ "entity_id": 40291, "entity_type": "person", "name": "Alice Johnson", "aliases": ["alice.johnson", "alicej"], "follower_count": 1842, "category": null }` },
        { table: 'typeahead_index', label: 'Typeahead suggestions for "mara"', json: `{ "prefix": "mara", "suggestions": [{"type": "query", "text": "marathon training", "score": 0.95}, {"type": "query", "text": "marathon results 2025", "score": 0.82}, {"type": "entity", "text": "Marathon Sports", "entity_id": 30291, "score": 0.78}], "score": 0.95 }` },
      ]
    },
    apiDesign: {
      description: 'Search API with typeahead and filtered queries',
      endpoints: [
        { method: 'GET', path: '/api/search', params: '{ q, type, date_from, date_to, author, limit }', response: '{ results[], total, facets, did_you_mean }', notes: 'Main search with privacy filtering applied server-side' },
        { method: 'GET', path: '/api/search/typeahead', params: '{ prefix, limit }', response: '{ suggestions: [{ type, text, entity?, score }] }', notes: 'Must return within 50ms, combines completions and entities' },
        { method: 'GET', path: '/api/search/trending', params: '{ region }', response: '{ topics[] }', notes: 'Trending search queries by region' },
        { method: 'POST', path: '/api/search/feedback', params: '{ query_id, result_id, action (click|hide|report) }', response: '200', notes: 'Implicit relevance feedback for ranking improvement' },
      ]
    },
    keyQuestions: [
      { question: 'How do you handle privacy filtering in search results?', answer: 'Privacy filtering is the hardest part of social search. Approach: (1) At index time, store the privacy level and author_id with each document, (2) At query time, determine the searcher relationship to each result author — this requires a social graph lookup, (3) Apply a privacy filter: public posts always visible, "friends" posts only if searcher is friends with author, "friends of friends" requires 2-hop graph check, custom lists require checking membership. For performance, pre-compute privacy posting lists: maintain an inverted index of "users who can see this post" for common access patterns. For the friends case, use a bloom filter of each users friends set — fast probabilistic check, with exact verification only for positive matches. Critical: when a user changes privacy settings, update the posting list synchronously before returning success.' },
      { question: 'How do you rank results with social signals?', answer: 'Multi-factor ranking model: (1) Text relevance score (BM25 on content text), (2) Social distance score — posts from friends get 10x boost, friends-of-friends 3x, (3) Engagement quality — weighted sum of likes, comments, shares, with recency decay, (4) Author authority — page/profile follower count normalized, (5) Content freshness — exponential decay based on age, (6) Personal affinity — how often the searcher interacts with the author (likes their posts, comments on their content). Combine using a learned-to-rank model (LambdaMART or neural ranker) trained on click-through data. The model is retrained weekly with fresh interaction data. For real-time personalization, the social distance and affinity scores are computed at query time from cached social graph data.' },
      { question: 'How do you implement typeahead with sub-50ms latency?', answer: 'Two-tier typeahead: (1) Prefix trie in memory on edge servers — stores the top 10M most popular query completions with their scores, updated hourly. As the user types, trie lookup returns completions in <1ms. (2) Entity matching — query a pre-built entity index (people, pages, places) using prefix matching on names and aliases. For the searcher, boost entities they follow or interact with. Combine both sources, rank by (personalized score × popularity), return top 8 suggestions. Architecture: typeahead runs on dedicated edge nodes with the trie fully in memory. The trie is built offline from query logs (frequency-weighted) and entity data, compressed using a minimal perfect hash or FST (finite state transducer) for memory efficiency.' },
      { question: 'How do you handle near-real-time indexing?', answer: 'Dual-path indexing: (1) Batch indexing — periodically rebuild the full search index from the posts table (daily or weekly), this is the source of truth. (2) Real-time indexing — new/edited/deleted posts publish events to Kafka, a stream processor updates a real-time index segment within seconds. At query time, merge results from the base index and the real-time segment. For privacy changes, use a synchronous path: when a user changes post privacy, immediately update a "privacy override" cache that the query engine checks before returning results. This ensures privacy changes are instant even before the index catches up. Use Elasticsearch or a custom Lucene-based index with support for near-real-time refresh.' },
      { question: 'How do you scale to 100K queries per second?', answer: 'Horizontal scaling with query routing: (1) Shard the search index by document_id range across N index servers, (2) Each query is sent to all shards in parallel (scatter), results are merged and re-ranked at the aggregator (gather), (3) Cache frequent queries: top 10K queries account for ~30% of traffic, cache their results with short TTL (30s). (4) Use query classification to route simple queries to a lightweight index (e.g., exact name match) and complex queries to the full index. (5) Replicate each shard 3x for read throughput and availability. With 100 shards × 3 replicas = 300 index servers, each handling ~1K qps. Edge caching handles another 30K qps. Scale by adding replicas to hot shards.' },
    ],
    basicImplementation: {
      title: 'Basic Social Search',
      diagramSrc: '/diagrams/fb-post-search/impl-basic.png',
      description: 'Elasticsearch cluster with post-query privacy filtering',
      svgTemplate: null,
      problems: ['Post-query privacy filtering wastes computation on filtered results', 'No social graph ranking', 'Full index rebuild needed for updates', 'Typeahead is slow without in-memory trie'],
    },
    advancedImplementation: {
      title: 'Production Social Search',
      diagramSrc: '/diagrams/fb-post-search/impl-advanced.png',
      description: 'Sharded index with pre-computed privacy posting lists, social ranking, and near-real-time indexing',
      svgTemplate: null,
      keyPoints: ['Bloom filter-based privacy pre-filtering at index level', 'Learned-to-rank model with social distance and engagement features', 'FST-based in-memory typeahead trie on edge servers', 'Dual-path indexing: batch + real-time Kafka stream', 'Scatter-gather query across sharded index with result caching'],
      databaseChoice: 'Custom Lucene-based search index (sharded), Redis for social graph cache and privacy overrides, Kafka for real-time indexing pipeline, PostgreSQL for query logs and analytics',
      caching: 'Query result cache (30s TTL) for frequent queries, typeahead trie fully in memory, social graph adjacency lists in Redis, entity metadata in CDN',
    },
  },

  // ─── NEW: Price Tracking Service ─────────────────────────────────────
  {
    id: 'price-tracking-service',
    isNew: true,
    title: 'Price Tracking Service',
    subtitle: 'Product Price Monitoring & Alert Platform',
    icon: 'tag',
    color: '#059669',
    difficulty: 'Easy',
    description: 'Design a service that monitors product prices across e-commerce sites and alerts users when prices drop.',

    introduction: `Price tracking services like CamelCamelCamel, Honey, and Keepa monitor product prices across e-commerce platforms and notify users when prices drop below their target thresholds. The system must crawl thousands of product pages, extract prices, detect changes, and deliver timely alerts.

The core challenges are web scraping at scale (handling anti-bot measures, dynamic JavaScript rendering, and varying HTML structures across sites), efficient change detection (comparing new prices against stored history for millions of products), and reliable alert delivery (email, push notification, SMS within minutes of a price drop).

The crawler must be respectful of target sites — adhering to robots.txt, rate limiting requests per domain, rotating IP addresses and user agents, and handling CAPTCHAs and JavaScript-rendered prices. Many e-commerce sites use dynamic pricing that changes based on location, cookies, and time of day, adding complexity.

This is a great "Easy" system design problem because the architecture is straightforward (crawl → compare → alert), but the interview discussion can go deep on crawling strategies, scheduling, and notification reliability.`,

    functionalRequirements: [
      'Track product prices by URL from major e-commerce sites',
      'Set price alerts: notify when price drops below a target',
      'Price history charts showing price trends over time',
      'Browser extension for one-click price tracking from product pages',
      'Deal discovery: surface products with significant recent price drops',
      'Support multiple currencies and regional pricing',
    ],
    nonFunctionalRequirements: [
      'Price checks at least every 4 hours for tracked products',
      'Alerts delivered within 15 minutes of price drop detection',
      'Support tracking 10M+ products across 100+ retailers',
      'Crawler must not get blocked — maintain >95% successful scrape rate',
      '99.9% availability for alert delivery',
    ],
    dataModel: {
      description: 'Core entities: Products, PriceHistory, Alerts, Users',
      schema: `products: id, url, retailer, title, image_url, current_price, currency, last_checked_at, check_interval_hours, status (active|paused|broken)
price_history: id, product_id, price, currency, availability (in_stock|out_of_stock), recorded_at
alerts: id, user_id, product_id, target_price, alert_type (below_price|any_drop|percent_drop), status (active|triggered|expired), notified_at
users: id, email, push_token, notification_preferences JSONB
crawl_jobs: id, product_id, scheduled_at, status (pending|running|completed|failed), result_price, error_message`,
      examples: [
        { table: 'products', label: 'Actively tracked Amazon product', json: `{ "id": 482917, "url": "https://amazon.com/dp/B09V3KXJPB", "retailer": "amazon", "title": "Sony WH-1000XM5 Wireless Headphones", "image_url": "https://m.media-amazon.com/images/I/51aYXg.jpg", "current_price": 328.00, "currency": "USD", "last_checked_at": "2025-04-18T10:00:00Z", "check_interval_hours": 4, "status": "active" }` },
        { table: 'alerts', label: 'Active price drop alert', json: `{ "id": "alert-a1b2c3", "user_id": 82910, "product_id": 482917, "target_price": 279.99, "alert_type": "below_price", "status": "active", "notified_at": null }` },
        { table: 'price_history', label: 'Recorded price point', json: `{ "id": 9201847, "product_id": 482917, "price": 328.00, "currency": "USD", "availability": "in_stock", "recorded_at": "2025-04-18T10:00:15Z" }` },
      ]
    },
    apiDesign: {
      description: 'REST API for product tracking and alerts',
      endpoints: [
        { method: 'POST', path: '/api/products/track', params: '{ url, target_price? }', response: '{ product_id, current_price, title }', notes: 'Parses product page and starts tracking; creates alert if target_price given' },
        { method: 'GET', path: '/api/products/:id/history', params: 'product_id, days', response: '{ prices: [{ price, date }] }', notes: 'Price history for charting' },
        { method: 'POST', path: '/api/alerts', params: '{ product_id, target_price, alert_type }', response: '{ alert_id }', notes: 'Create price drop alert' },
        { method: 'GET', path: '/api/deals', params: '{ category, min_discount }', response: '{ deals: [{ product, old_price, new_price, discount_pct }] }', notes: 'Current deals sorted by discount percentage' },
        { method: 'GET', path: '/api/products/:id', params: 'product_id', response: '{ product, current_price, price_stats, alert_count }', notes: 'Product details with price statistics (min, max, avg)' },
      ]
    },
    keyQuestions: [
      { question: 'How do you design the web crawler for price extraction?', answer: 'Use a modular crawler with site-specific extractors. Architecture: (1) Crawler Scheduler reads from the crawl_jobs queue (Redis sorted set, scored by next_check_time), (2) Worker pulls job, fetches page via headless browser (Playwright) for JS-rendered sites or simple HTTP for static sites, (3) Site-specific Extractor parses the HTML to find the price — each retailer has a custom extraction config (CSS selectors, JSON-LD schema, or regex patterns), (4) Price normalizer strips currency symbols, converts formats. For anti-bot: rotate residential proxies, randomize request timing (±30% of interval), use realistic browser fingerprints. Maintain a health dashboard showing success rate per retailer — when a retailer changes their HTML structure, the extractor needs updating.' },
      { question: 'How do you schedule crawls efficiently for millions of products?', answer: 'Priority-based scheduling: not all products need the same check frequency. (1) Hot products (many watchers, volatile prices): check every 1-2 hours, (2) Warm products (some watchers): check every 4-6 hours, (3) Cold products (few/no watchers): check every 12-24 hours, (4) Products with pending alerts near target price: check every 30 minutes. Implementation: Redis sorted set with next_check_timestamp as score. Workers ZPOPMIN to get the next due job. When a price is checked, re-insert with score = now + interval. This naturally distributes crawl load over time. Batch same-domain requests together and respect per-domain rate limits (max 1 request per second per domain) to avoid getting blocked.' },
      { question: 'How do you detect price changes and trigger alerts?', answer: 'After each successful crawl: (1) Compare new price with stored current_price, (2) If different: insert into price_history, update current_price, (3) Query all active alerts for this product where new_price <= target_price (or meets the alert condition), (4) For each matching alert: enqueue a notification job and mark alert as triggered. For efficiency, use a single SQL query: SELECT * FROM alerts WHERE product_id = :id AND status = "active" AND target_price >= :new_price. Batch this check into the crawl result processing pipeline. For "any drop" alerts, compare with the previous price. For "percent drop" alerts, compare with the 30-day average or all-time high.' },
      { question: 'How do you handle different e-commerce site structures?', answer: 'Use a registry of site-specific extractors: (1) Template-based: define CSS selectors per site (e.g., Amazon: "#priceblock_ourprice", Best Buy: ".priceView-customer-price span"), (2) Structured data: many sites embed JSON-LD schema.org Product markup — parse this first as its the most reliable, (3) ML-based fallback: train a model to identify price elements on unknown pages using visual features and HTML structure. Store extractor configs in a database so they can be updated without code deploys. When an extractor starts failing (price is null or dramatically different), auto-flag for human review and fall back to the previous known price. A/B test extractor changes on a subset of crawls before rolling out.' },
      { question: 'How do you ensure reliable alert delivery?', answer: 'Multi-channel with retry: (1) Alert jobs go into a reliable message queue (SQS or Kafka), (2) Notification worker processes jobs: try email first (SES/SendGrid), then push notification (FCM/APNS), then SMS for high-priority alerts, (3) If delivery fails, retry with exponential backoff (1min, 5min, 15min, 1hr), (4) Idempotency: deduplicate by alert_id + price_snapshot to prevent sending the same alert twice, (5) Batching: if a user has 10 products that dropped in the same window, combine into a single digest email. Track delivery status (sent, delivered, opened, clicked) for each notification. Allow users to set quiet hours and notification frequency limits (max 5 alerts per day).' },
    ],
    basicImplementation: {
      title: 'Basic Price Tracker',
      diagramSrc: '/diagrams/price-tracking-service/impl-basic.png',
      description: 'Single crawler with cron job scheduling and email alerts',
      svgTemplate: null,
      problems: ['Single crawler cant scale to millions of products', 'Fixed schedule wastes resources on inactive products', 'Simple HTML parsing breaks when sites change', 'No proxy rotation leads to blocking'],
    },
    advancedImplementation: {
      title: 'Production Price Tracking Service',
      diagramSrc: '/diagrams/price-tracking-service/impl-advanced.png',
      description: 'Distributed crawler fleet with priority scheduling, adaptive extraction, and multi-channel alerts',
      svgTemplate: null,
      keyPoints: ['Priority-based crawl scheduling with Redis sorted sets', 'Site-specific extractors with JSON-LD fallback and ML backup', 'Residential proxy rotation with per-domain rate limiting', 'Multi-channel alert delivery with deduplication and batching', 'Real-time deals pipeline aggregating price drops across all products'],
      databaseChoice: 'PostgreSQL for products/alerts/users, TimescaleDB or ClickHouse for price history (time-series optimized), Redis for crawl scheduling queue, S3 for page snapshots',
      caching: 'Cache product details and current price in CDN (5min TTL), price history charts pre-rendered as SVGs, deals page cached with 15min refresh',
    },
  },

  // ─── NEW: YouTube Top K / Trending ───────────────────────────────────
  {
    id: 'youtube-top-k-trending',
    isNew: true,
    title: 'YouTube Top K / Trending',
    subtitle: 'Real-time Video Trending & Ranking System',
    icon: 'trendingUp',
    color: '#ff0000',
    difficulty: 'Hard',
    description: 'Design a real-time trending video ranking system with time-decay, regional leaderboards, and manipulation detection.',

    introduction: `YouTube's trending system determines which videos surface on the trending page across 100+ countries. Unlike a simple "most viewed" leaderboard, trending must balance view velocity (how fast views are growing), engagement quality (likes, comments, shares vs. passive views), content diversity, and manipulation resistance.

The system ingests billions of view events per day. Simply counting views is insufficient — trending must capture velocity (a video going from 1K to 100K views in an hour is more "trending" than one steadily at 1M views/day). This requires time-windowed aggregation with decay functions that weight recent activity higher.

Regional trending adds complexity: the same video may be trending in India but not in the US. Each region has its own leaderboard computed from region-specific view data, but cross-region momentum should also be considered (a video going viral globally should appear on regional pages faster).

Manipulation detection is critical — bot networks, view farms, and click fraud attempt to artificially inflate view counts to game the trending algorithm. The system must identify and discount artificial views in real-time without penalizing legitimate viral content.

Heavy hitter detection (identifying videos suddenly receiving disproportionate traffic) enables early trending prediction and can trigger CDN pre-warming for anticipated viral content.`,

    functionalRequirements: [
      'Real-time trending page showing top 50 videos per region per category',
      'Time-decay scoring: recent views weighted higher than older views',
      'Regional leaderboards for 100+ countries with category breakdowns',
      'Trending velocity indicator: show how fast a video is climbing',
      'Content diversity: prevent same creator from dominating trending',
      'Manipulation detection: identify and discount artificial views',
      'Trending notifications: alert creators when their video starts trending',
    ],
    nonFunctionalRequirements: [
      'Trending page reflects view changes within 5 minutes',
      'Process 10B+ view events per day (115K events/second average, 500K peak)',
      'Trending computation latency under 10 seconds per region',
      'Manipulation detection with <1% false positive rate on legitimate content',
      '99.99% availability for the trending API',
    ],
    dataModel: {
      description: 'Event-driven with pre-aggregated counters',
      schema: `view_events: video_id, user_id, region, device_type, watch_duration_s, timestamp (Kafka topic, not stored raw)
video_counters: video_id, region, time_bucket (5min), view_count, unique_viewers, avg_watch_pct, like_count, comment_count, share_count
trending_scores: video_id, region, category, score, velocity, rank, updated_at
trending_snapshots: region, category, timestamp, video_ids[] (ordered), scores[]
manipulation_flags: video_id, flag_type (bot_traffic|view_farm|click_fraud), confidence, detected_at, evidence JSONB`,
      examples: [
        { table: 'video_counters', label: '5-minute aggregated view counter', json: `{ "video_id": "vid-a7b8c9d0", "region": "US", "time_bucket": "2025-04-18T10:15:00Z", "view_count": 48201, "unique_viewers": 42890, "avg_watch_pct": 0.68, "like_count": 3201, "comment_count": 892, "share_count": 410 }` },
        { table: 'trending_scores', label: 'Top trending video in US music category', json: `{ "video_id": "vid-a7b8c9d0", "region": "US", "category": "music", "score": 98420.5, "velocity": 2.8, "rank": 1, "updated_at": "2025-04-18T10:20:00Z" }` },
        { table: 'manipulation_flags', label: 'Detected bot traffic on video', json: `{ "video_id": "vid-x1y2z3w4", "flag_type": "bot_traffic", "confidence": 0.89, "detected_at": "2025-04-18T09:45:00Z", "evidence": {"regular_interval_pct": 0.72, "short_watch_pct": 0.85, "new_account_pct": 0.64, "unique_ip_ratio": 0.12} }` },
      ]
    },
    apiDesign: {
      description: 'REST API for trending consumption and event ingestion',
      endpoints: [
        { method: 'GET', path: '/api/trending', params: '{ region, category?, limit }', response: '{ videos: [{ video_id, title, score, velocity, rank }] }', notes: 'Served from cache, refreshed every 5 minutes' },
        { method: 'POST', path: '/api/events/view', params: '{ video_id, user_id, region, watch_duration }', response: '202 Accepted', notes: 'High-throughput event ingestion, async processing' },
        { method: 'GET', path: '/api/trending/video/:id', params: 'video_id', response: '{ trending_regions[], peak_rank, velocity_chart }', notes: 'Trending history for a specific video' },
        { method: 'GET', path: '/api/trending/rising', params: '{ region }', response: '{ videos[] }', notes: 'Videos with highest velocity that havent peaked yet' },
      ]
    },
    keyQuestions: [
      { question: 'How do you compute trending scores with time decay?', answer: 'Use exponential time-decay scoring. For each video, the trending score is: score = Σ(events × e^(-λ × age_hours)) where λ is the decay constant (e.g., 0.1 means half-life of ~7 hours). Implementation: (1) Aggregate view events into 5-minute time buckets per video per region, (2) For each bucket, compute weighted_views = view_count × engagement_multiplier (likes=2x, comments=3x, shares=5x), (3) Score = Σ over all buckets in the last 48 hours of (weighted_views × e^(-λ × bucket_age_hours)). Optimization: since old buckets contribute negligibly, only sum the last 48 hours and pre-compute the decay factors. Recalculate every 5 minutes. Velocity = (score_now - score_1hr_ago) / score_1hr_ago — captures acceleration.' },
      { question: 'How do you process 500K view events per second?', answer: 'Use a streaming aggregation pipeline: (1) Events land in Kafka partitioned by video_id (ensures all events for a video go to the same partition), (2) Apache Flink (or Kafka Streams) consumes events and maintains tumbling windows of 5 minutes, (3) At window close, emit aggregated counters (view_count, unique_viewers, engagement metrics) to a downstream Kafka topic, (4) A materialization service writes aggregated counters to a time-series store (ClickHouse or TimescaleDB). For peak handling: Kafka handles backpressure naturally with consumer lag. Pre-aggregate at the edge — CDN/API servers batch view events locally (1-second micro-batches) before publishing to Kafka, reducing event volume 10-100x. Use Count-Min Sketch for approximate unique viewer counting without storing full user sets.' },
      { question: 'How do you handle regional trending for 100+ countries?', answer: 'Partition computation by region: (1) View events carry a region field (from IP geolocation at ingestion), (2) Flink processes events and emits per-video-per-region counters, (3) A trending computation job runs per region every 5 minutes: reads all video counters for that region, computes scores with time decay, ranks by score, applies diversity filters, writes top 200 to the trending_snapshots table. With 100 regions × 200 videos = 20K entries, this fits in a single table with region as partition key. Cross-region trending: also maintain a "global" trending by summing across regions, use this as a "momentum boost" — if a video is top-10 globally but not yet trending in a specific region, give it a 20% score boost in that region to surface it faster.' },
      { question: 'How do you detect and prevent view count manipulation?', answer: 'Multi-signal fraud detection: (1) Traffic pattern analysis — legitimate viral videos have smooth growth curves; bot traffic shows step-function jumps. Flag videos where >30% of views come in suspiciously regular intervals. (2) Viewer profile analysis — check if viewers are real accounts (account age, activity history, device diversity). A video where 80% of views come from accounts created in the last week is suspicious. (3) Watch duration analysis — bots typically have very short watch durations (<5s) or suspiciously uniform durations. Legitimate views follow a power-law distribution. (4) Geographic anomaly — views from regions inconsistent with the videos language/content. (5) IP/fingerprint clustering — many views from the same IP ranges or device fingerprints. Implementation: run these checks asynchronously. Videos flagged with >70% confidence have their artificial views discounted (not removed) from the trending score. Human review for borderline cases.' },
      { question: 'How do you ensure content diversity on the trending page?', answer: 'Without diversity controls, trending becomes dominated by a few mega-creators. Rules: (1) Max 2 videos per creator on the trending page, (2) Category quotas — ensure at least N videos from each category (music, gaming, news, education), (3) Novelty bonus — videos appearing on trending for the first time get a boost; those that have been trending for >24 hours get a penalty, (4) Editorial curation — reserve 5-10% of trending slots for editor picks (quality content that deserves exposure). Implementation: after computing raw scores, apply a greedy diversification algorithm: iterate through ranked videos, add each to the trending list unless it violates a constraint (creator cap, category quota), skip and try the next one.' },
      { question: 'How do you serve the trending page with low latency?', answer: 'The trending page is pre-computed and cached. Flow: (1) Every 5 minutes, the trending computation job writes the ranked list to a trending_snapshots table and Redis, (2) CDN caches the trending API response with a 5-minute TTL, (3) API servers read from Redis (hot cache) with PostgreSQL as fallback. The trending page is the same for all users in a region (no personalization needed), making it extremely cacheable. For the "rising" page (videos gaining velocity), update more frequently (every 1 minute) with a shorter cache TTL. Video metadata (title, thumbnail, view count) is fetched separately and cached independently. Total API latency: ~10ms from Redis, ~50ms from CDN.' },
      { question: 'How would you implement heavy hitter detection for early trending prediction?', answer: 'Use a Count-Min Sketch with sliding windows to detect videos receiving disproportionate traffic. Structure: maintain a Count-Min Sketch (width=10000, depth=5) per 1-minute window. For each view event, increment the sketch. Every minute: (1) Query the sketch for the estimated count of each recently-active video, (2) Compare against the videos historical baseline (avg views per minute over the last 7 days), (3) If current_rate > 10 × baseline, flag as a potential heavy hitter. Actions for detected heavy hitters: (a) Pre-warm CDN with the video in regions where its gaining traction, (b) Increase engagement data collection frequency for trending score accuracy, (c) Trigger manipulation detection pipeline for fraud check, (d) Notify the creator that their video is gaining momentum.' },
    ],
    basicImplementation: {
      title: 'Basic Trending System',
      diagramSrc: '/diagrams/youtube-top-k-trending/impl-basic.png',
      description: 'Batch processing with hourly aggregation and simple view counting',
      svgTemplate: null,
      problems: ['Hourly batch means trending is always stale', 'Simple view count favors established creators', 'No manipulation detection', 'Single global trending ignores regional preferences'],
    },
    advancedImplementation: {
      title: 'Production Trending System',
      diagramSrc: '/diagrams/youtube-top-k-trending/impl-advanced.png',
      description: 'Real-time streaming pipeline with time-decay scoring, fraud detection, and regional computation',
      svgTemplate: null,
      keyPoints: ['Kafka + Flink streaming pipeline for real-time view aggregation', 'Exponential time-decay scoring with engagement multipliers', 'Count-Min Sketch for heavy hitter detection and approximate counting', 'Multi-signal fraud detection pipeline (traffic patterns, viewer profiles, watch duration)', 'Per-region trending computation with cross-region momentum boosting'],
      databaseChoice: 'Kafka for event ingestion, ClickHouse for time-series view counters, Redis for trending cache and Count-Min Sketches, PostgreSQL for trending snapshots and video metadata',
      caching: 'CDN caches trending page per region (5min TTL), Redis hot cache for trending lists, pre-computed trending velocity charts cached per video',
    },
  },
];
