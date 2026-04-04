#!/usr/bin/env node
/**
 * Generate Mermaid cloud architecture diagrams for all missing system design problems.
 * Outputs PNG files to apps/frontend/public/diagrams/{problemId}/mermaid-{provider}.png
 *
 * Usage: node scripts/generate-mermaid-diagrams.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIAGRAMS_DIR = path.join(__dirname, '..', 'apps', 'frontend', 'public', 'diagrams');
const TMP_DIR = path.join(__dirname, 'mermaid-tmp');
const CONFIG_PATH = path.join(__dirname, 'mermaid-config.json');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// Cloud service name mappings per provider
// ─────────────────────────────────────────────────────────────────────────────
const cloud = {
  aws: {
    dns: 'Route 53', cdn: 'CloudFront', waf: 'WAF', lb: 'ALB', compute: 'ECS / EKS',
    redis: 'ElastiCache\\nRedis', postgres: 'Aurora\\nPostgreSQL', nosql: 'DynamoDB',
    search: 'OpenSearch', storage: 'S3', kafka: 'MSK Kafka', serverless: 'Lambda',
    ml: 'SageMaker', queue: 'SQS', notify: 'SNS', monitor: 'CloudWatch',
    gateway: 'API Gateway', email: 'SES', graph: 'Neptune', ws: 'API GW\\nWebSocket',
    tsdb: 'Timestream', stream: 'Kinesis', container: 'ECR', kms: 'KMS / HSM',
    bigtable: 'DynamoDB', spanner: 'Aurora Global', vision: 'Rekognition',
    nlp: 'Comprehend', transcode: 'MediaConvert', ci: 'CodePipeline',
  },
  gcp: {
    dns: 'Cloud DNS', cdn: 'Cloud CDN', waf: 'Cloud Armor', lb: 'Cloud LB', compute: 'GKE',
    redis: 'Memorystore\\nRedis', postgres: 'Cloud SQL\\nPostgreSQL', nosql: 'Firestore',
    search: 'Elasticsearch\\non GKE', storage: 'Cloud Storage', kafka: 'Pub/Sub', serverless: 'Cloud Functions',
    ml: 'Vertex AI', queue: 'Cloud Tasks', notify: 'FCM', monitor: 'Cloud Monitoring',
    gateway: 'Cloud Endpoints', email: 'SendGrid', graph: 'Neo4j on GKE', ws: 'Cloud Endpoints\\nWebSocket',
    tsdb: 'Bigtable', stream: 'Dataflow', container: 'Artifact Registry', kms: 'Cloud KMS',
    bigtable: 'Bigtable', spanner: 'Spanner', vision: 'Vision AI',
    nlp: 'Natural Language', transcode: 'Transcoder API', ci: 'Cloud Build',
  },
  azure: {
    dns: 'Azure DNS', cdn: 'Azure CDN', waf: 'Azure WAF', lb: 'App Gateway', compute: 'AKS',
    redis: 'Azure Cache\\nfor Redis', postgres: 'Azure SQL\\nPostgreSQL', nosql: 'Cosmos DB',
    search: 'Cognitive\\nSearch', storage: 'Blob Storage', kafka: 'Event Hubs', serverless: 'Azure Functions',
    ml: 'Azure ML', queue: 'Service Bus', notify: 'Notification Hubs', monitor: 'Azure Monitor',
    gateway: 'API Management', email: 'Communication Svc', graph: 'Cosmos DB\\nGremlin', ws: 'SignalR',
    tsdb: 'Azure Data Explorer', stream: 'Stream Analytics', container: 'ACR', kms: 'Key Vault / HSM',
    bigtable: 'Cosmos DB\\nTable', spanner: 'Cosmos DB\\nGlobal', vision: 'AI Vision',
    nlp: 'AI Language', transcode: 'Media Services', ci: 'Azure DevOps',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Diagram templates — each returns a Mermaid string given a cloud provider map
// ─────────────────────────────────────────────────────────────────────────────
function makeDiagram(id, c) {
  const templates = {
    // ── TIER 1: Most asked ──
    'spotify': () => `graph LR
    subgraph clients["Clients"]
        Mobile["Mobile App"]
        Web["Web Player"]
        Desktop["Desktop App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}\\nAudio Edge Cache"]
        WAF["${c.waf}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        AudioSvc["Audio Streaming\\nAdaptive Bitrate"]
        PlaylistSvc["Playlist\\nService"]
        UserSvc["User\\nService"]
        SearchSvc["Search\\nService"]
        RecSvc["Recommendation\\nEngine (ML)"]
        AdsSvc["Ads\\nService"]
        OfflineSvc["Offline Sync\\nService"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}")]
        PG[("${c.postgres}\\nMulti-AZ")]
        ES["${c.search}"]
        Kafka["${c.kafka}\\nEvent Bus"]
        ML["${c.ml}\\nCollab Filtering"]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nAudio Files\\nMulti-bitrate"]
    end
    clients --> DNS --> CDN --> WAF --> LB
    LB --> AudioSvc & PlaylistSvc & UserSvc & SearchSvc & RecSvc & AdsSvc & OfflineSvc
    AudioSvc --> CDN
    AudioSvc --> S3
    PlaylistSvc --> PG
    UserSvc --> PG & Redis
    SearchSvc --> ES
    RecSvc --> ML & Redis & Kafka
    OfflineSvc --> S3
    AdsSvc --> Redis
    Kafka --> RecSvc
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'airbnb': () => `graph LR
    subgraph clients["Clients"]
        Guest["Guest App"]
        Host["Host App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}"]
        WAF["${c.waf}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        SearchSvc["Search Service\\nGeo + Availability"]
        BookingSvc["Booking Service\\nDistributed Locks"]
        PaymentSvc["Payment Service\\nEscrow Model"]
        MsgSvc["Messaging\\nService"]
        ReviewSvc["Review\\nService"]
        PricingSvc["Smart Pricing\\nML Engine"]
        TrustSvc["Trust & Safety\\nFraud Detection"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}")]
        PG[("${c.postgres}\\nMulti-AZ")]
        ES["${c.search}\\nGeo Index"]
        Kafka["${c.kafka}"]
        ML["${c.ml}"]
        NoSQL[("${c.nosql}")]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nListing Photos"]
    end
    clients --> DNS --> CDN --> WAF --> LB
    LB --> SearchSvc & BookingSvc & PaymentSvc & MsgSvc & ReviewSvc & PricingSvc & TrustSvc
    SearchSvc --> ES & Redis
    BookingSvc --> PG & Redis & Kafka
    PaymentSvc --> PG
    MsgSvc --> NoSQL
    ReviewSvc --> PG
    PricingSvc --> ML & PG
    TrustSvc --> ML & Kafka
    SearchSvc --> S3
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'doordash': () => `graph LR
    subgraph clients["Clients"]
        Customer["Customer App"]
        Dasher["Dasher App"]
        Restaurant["Restaurant\\nDashboard"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}"]
        WAF["${c.waf}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        OrderSvc["Order Service\\nState Machine"]
        RestSvc["Restaurant\\nService"]
        MatchSvc["Delivery\\nMatching"]
        TrackSvc["Real-time\\nTracking"]
        PaySvc["Payment\\nService"]
        ETASvc["ETA Prediction\\nML"]
        SurgeSvc["Surge Pricing\\nEngine"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nGeospatial")]
        PG[("${c.postgres}\\nMulti-AZ")]
        Kafka["${c.kafka}\\nOrder Events"]
        ML["${c.ml}"]
        WS["${c.ws}\\nLive GPS"]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nMenu Images"]
    end
    clients --> DNS --> CDN --> WAF --> LB
    LB --> OrderSvc & RestSvc & MatchSvc & TrackSvc & PaySvc & ETASvc & SurgeSvc
    OrderSvc --> PG & Kafka
    MatchSvc --> Redis & ML
    TrackSvc --> WS & Redis
    RestSvc --> PG & S3
    PaySvc --> PG
    ETASvc --> ML & Redis
    SurgeSvc --> Redis & Kafka
    Kafka --> MatchSvc
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'google-maps': () => `graph LR
    subgraph clients["Clients"]
        Mobile["Mobile App"]
        Web["Web App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}\\nGeoDNS"]
        CDN["${c.cdn}\\nTile Cache"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        TileSvc["Map Tile\\nService"]
        RouteSvc["Routing Engine\\nDijkstra / A*"]
        TrafficSvc["Real-time\\nTraffic"]
        GeoSvc["Geocoding\\nService"]
        ETASvc["ETA Service\\nML Prediction"]
        POISvc["Places / POI\\nSearch"]
        OfflineSvc["Offline Maps\\nDownload"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nRoute Cache")]
        PG[("${c.postgres}\\nRoad Graph")]
        ES["${c.search}\\nPOI Search"]
        NoSQL[("${c.nosql}\\nGPS Probes")]
        Stream["${c.stream}\\nGPS Stream"]
        ML["${c.ml}"]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nVector Tiles\\nOffline Packages"]
    end
    clients --> DNS --> CDN --> LB
    LB --> TileSvc & RouteSvc & TrafficSvc & GeoSvc & ETASvc & POISvc & OfflineSvc
    TileSvc --> CDN & S3
    RouteSvc --> PG & Redis
    TrafficSvc --> Stream & NoSQL
    GeoSvc --> PG & Redis
    ETASvc --> ML & Redis
    POISvc --> ES
    OfflineSvc --> S3
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'zoom': () => `graph LR
    subgraph clients["Clients"]
        Desktop["Desktop App"]
        Mobile["Mobile App"]
        Browser["Web Client"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}\\nLatency-based"]
        CDN["${c.cdn}\\nRecordings"]
        TURN["TURN/STUN\\nNAT Traversal"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}\\nUDP+TCP"]
        Signal["Signaling Server\\nWebRTC SDP"]
        SFU["Media Server\\nSFU"]
        RecordSvc["Recording\\nService"]
        ChatSvc["Chat\\nService"]
        ScreenSvc["Screen Share\\nService"]
        BreakoutSvc["Breakout\\nRooms"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nSession + Rooms")]
        PG[("${c.postgres}\\nMetadata")]
        NoSQL[("${c.nosql}\\nChat Messages")]
        Kafka["${c.kafka}\\nMeeting Events"]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nRecordings"]
    end
    clients --> DNS
    DNS --> TURN --> SFU
    DNS --> CDN --> LB
    LB --> Signal & ChatSvc & RecordSvc & ScreenSvc & BreakoutSvc
    Signal --> SFU & Redis
    SFU --> RecordSvc & TURN
    RecordSvc --> S3 & Kafka
    ChatSvc --> NoSQL & Redis
    BreakoutSvc --> Redis
    Signal --> PG
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'linkedin': () => `graph LR
    subgraph clients["Clients"]
        Mobile["Mobile App"]
        Web["Web App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}"]
        WAF["${c.waf}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        ProfileSvc["Profile\\nService"]
        ConnSvc["Connection\\nService"]
        FeedSvc["Feed Service\\nRanked"]
        MsgSvc["Messaging\\nService"]
        SearchSvc["Search\\nService"]
        RecSvc["PYMK\\nRecommendation"]
        JobSvc["Job Matching\\nService"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nFeed Cache")]
        PG[("${c.postgres}\\nProfiles, Jobs")]
        Graph[("${c.graph}\\nSocial Graph")]
        ES["${c.search}\\nPeople + Jobs"]
        Kafka["${c.kafka}\\nActivity Events"]
        ML["${c.ml}"]
        NoSQL[("${c.nosql}\\nMessages")]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nPhotos, Resumes"]
    end
    clients --> DNS --> CDN --> WAF --> LB
    LB --> ProfileSvc & ConnSvc & FeedSvc & MsgSvc & SearchSvc & RecSvc & JobSvc
    ProfileSvc --> PG & S3
    ConnSvc --> Graph & Kafka
    FeedSvc --> Redis & Kafka
    MsgSvc --> NoSQL
    SearchSvc --> ES
    RecSvc --> ML & Graph
    JobSvc --> ML & ES
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'tinder': () => `graph LR
    subgraph clients["Clients"]
        iOS["iOS App"]
        Android["Android App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}\\nProfile Photos"]
        WAF["${c.waf}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        MatchSvc["Matching\\nService"]
        RecSvc["Recommendation\\nML Scoring"]
        ProfileSvc["Profile\\nService"]
        ChatSvc["Chat Service\\nWebSocket"]
        ModSvc["Photo Moderation\\nML"]
        BoostSvc["Boost/Premium\\nService"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nGEORADIUS\\nSwipe Queue")]
        PG[("${c.postgres}\\nProfiles, Matches")]
        NoSQL[("${c.nosql}\\nSwipe History\\nChat Messages")]
        ML["${c.ml}"]
        Vision["${c.vision}\\nNSFW Detection"]
        Push["${c.notify}"]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nPhotos"]
    end
    clients --> DNS --> CDN --> WAF --> LB
    LB --> MatchSvc & RecSvc & ProfileSvc & ChatSvc & ModSvc & BoostSvc
    MatchSvc --> Redis & PG
    RecSvc --> ML & Redis
    ProfileSvc --> PG & S3
    ChatSvc --> NoSQL & Redis
    ModSvc --> Vision & S3
    BoostSvc --> PG & Push
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'yelp': () => `graph LR
    subgraph clients["Clients"]
        Mobile["Mobile App"]
        Web["Web App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}"]
        WAF["${c.waf}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        SearchSvc["Search Service\\nGeo + Text"]
        BizSvc["Business\\nService"]
        ReviewSvc["Review\\nService"]
        PhotoSvc["Photo\\nService"]
        RankSvc["ML Ranking\\nPersonalization"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nQuery Cache")]
        PG[("${c.postgres}\\nBiz, Reviews")]
        ES["${c.search}\\nQuadTree/Geohash"]
        Kafka["${c.kafka}"]
        ML["${c.ml}\\nSpam Detection"]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nBiz Photos"]
    end
    clients --> DNS --> CDN --> WAF --> LB
    LB --> SearchSvc & BizSvc & ReviewSvc & PhotoSvc & RankSvc
    SearchSvc --> ES & Redis
    BizSvc --> PG
    ReviewSvc --> PG & Kafka
    PhotoSvc --> S3
    RankSvc --> ML & Redis
    Kafka --> ML
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'hotel-booking': () => `graph LR
    subgraph clients["Clients"]
        Mobile["Mobile App"]
        Web["Web App"]
    end
    subgraph edge["Edge Layer"]
        DNS["${c.dns}"]
        CDN["${c.cdn}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        SearchSvc["Search Service\\nAvailability+Geo"]
        BookSvc["Booking Service\\nOptimistic Lock"]
        PaySvc["Payment\\nService"]
        InvSvc["Inventory\\nReal-time"]
        ReviewSvc["Review\\nService"]
        PriceSvc["Price Engine\\nDynamic"]
        NotifSvc["Notification\\nService"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nAvailability Cache")]
        PG[("${c.postgres}\\nHotels, Bookings")]
        ES["${c.search}\\nGeo Search"]
        Kafka["${c.kafka}"]
        NoSQL[("${c.nosql}\\nReviews")]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nHotel Photos"]
    end
    clients --> DNS --> CDN --> LB
    LB --> SearchSvc & BookSvc & PaySvc & InvSvc & ReviewSvc & PriceSvc & NotifSvc
    SearchSvc --> ES & Redis
    BookSvc --> PG & Redis & Kafka
    PaySvc --> PG
    InvSvc --> Redis & PG
    ReviewSvc --> NoSQL
    PriceSvc --> PG & Redis
    NotifSvc --> Kafka
    BookSvc --> S3
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'unique-id-generator': () => `graph LR
    subgraph clients["Internal Services"]
        Svc1["Tweet Service"]
        Svc2["Order Service"]
        Svc3["Message Service"]
    end
    subgraph coord["Coordination"]
        ZK["ZooKeeper\\nWorker Registry"]
        NTP["NTP Server\\nClock Sync"]
    end
    subgraph compute["ID Generator — ${c.compute}"]
        LB["${c.lb}\\nInternal"]
        W1["Snowflake Worker 1\\nDC:01 Machine:01"]
        W2["Snowflake Worker 2\\nDC:01 Machine:02"]
        W3["Snowflake Worker 3\\nDC:01 Machine:03"]
    end
    subgraph idformat["64-bit Snowflake ID"]
        Bits["| 1 sign | 41 timestamp | 10 machine | 12 sequence |\\n| 0 | ms since epoch | DC+Worker | counter/ms |"]
    end
    subgraph monitor["Monitoring"]
        Mon["${c.monitor}\\nClock Drift Alert"]
    end
    clients --> LB
    LB --> W1 & W2 & W3
    ZK --> W1 & W2 & W3
    NTP --> W1 & W2 & W3
    W1 & W2 & W3 --> Mon
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style coord fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style idformat fill:#f0fdf4,stroke:#059669,color:#064e3b
    style monitor fill:#fce7f3,stroke:#db2777,color:#831843`,

    'twitter-trends': () => `graph LR
    subgraph ingest["Ingestion"]
        Tweets["Tweet Stream\\n100K tweets/sec"]
        Kafka["${c.kafka}\\nPartitioned"]
    end
    subgraph process["Stream Processing"]
        Flink["${c.stream}\\nFlink/Beam"]
        CMS["Count-Min Sketch\\nApprox Counting"]
        Decay["Time-Decay\\nExponential"]
    end
    subgraph store["Storage"]
        Redis[("${c.redis}\\nTrend Counters")]
        DB[("${c.postgres}\\nTrend History")]
        NoSQL[("${c.nosql}\\nGeo Trends")]
    end
    subgraph serve["Serving"]
        GW["${c.gateway}"]
        Cache["Response Cache\\nTop-N per Region"]
        CDN["${c.cdn}"]
    end
    Tweets --> Kafka --> Flink
    Flink --> CMS --> Redis
    Flink --> Decay --> Redis
    Redis --> DB
    Redis --> NoSQL
    GW --> Cache --> CDN
    Redis --> GW
    style ingest fill:#fef3c7,stroke:#d97706,color:#78350f
    style process fill:#ecfdf5,stroke:#059669,color:#064e3b
    style store fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style serve fill:#dbeafe,stroke:#2563eb,color:#1e3a5f`,

    'typeahead': () => `graph LR
    subgraph clients["Clients"]
        App["User Types\\nQuery Prefix"]
    end
    subgraph serve["Serving Layer"]
        CDN["${c.cdn}\\nTop-1000 Prefixes"]
        LB["${c.lb}"]
        TrieSvc["Trie Service\\nIn-Memory\\nO(prefix) Lookup"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nPrefix → Top-10")]
        ZK["ZooKeeper\\nShard Coord"]
    end
    subgraph pipeline["Offline Pipeline"]
        Logs["Search Logs\\n${c.storage}"]
        MR["MapReduce\\nAggregator"]
        Warm["Cache Warmer\\n${c.serverless}"]
    end
    App --> CDN --> LB --> TrieSvc
    TrieSvc --> Redis
    ZK --> TrieSvc
    Logs --> MR --> Redis
    MR --> Warm --> TrieSvc
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style serve fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style pipeline fill:#fef3c7,stroke:#d97706,color:#78350f`,

    'web-crawler': () => `graph LR
    subgraph frontier["URL Frontier"]
        Queue["Priority Queue\\n${c.kafka}"]
        Filter["Bloom Filter\\n10B URLs"]
        Polite["Politeness\\nrobots.txt Cache"]
    end
    subgraph fetch["Fetcher Farm"]
        DNS["DNS Resolver\\nCaching"]
        Workers["Fetcher Workers\\n${c.compute}\\nAuto-Scale"]
    end
    subgraph process["Processing"]
        Parser["HTML Parser\\nLink Extraction"]
        Dedup["Content Dedup\\nSimHash/MinHash"]
    end
    subgraph store["Storage"]
        Pages["${c.storage}\\nWARC Pages"]
        Meta[("${c.nosql}\\nURL Metadata")]
        Redis[("${c.redis}\\nDNS + robots.txt")]
    end
    subgraph monitor["Monitoring"]
        Mon["${c.monitor}\\n1000 pages/sec"]
    end
    Queue --> Polite --> DNS --> Workers
    Workers --> Parser --> Dedup
    Dedup --> Pages & Meta
    Parser --> Filter --> Queue
    Workers --> Redis
    Workers --> Mon
    style frontier fill:#fef3c7,stroke:#d97706,color:#78350f
    style fetch fill:#ecfdf5,stroke:#059669,color:#064e3b
    style process fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style store fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style monitor fill:#fce7f3,stroke:#db2777,color:#831843`,

    'key-value-store': () => `graph LR
    subgraph client["Client"]
        SDK["Client SDK\\nConsistent Hash"]
    end
    subgraph coord["Coordinator"]
        Coord["Coordinator Node\\nRoute to Partition"]
    end
    subgraph ring["Storage Ring"]
        N1["Node 1\\nLSM Tree"]
        N2["Node 2\\nLSM Tree"]
        N3["Node 3\\nLSM Tree"]
    end
    subgraph internal["Node Internals"]
        WAL["Write-Ahead\\nLog"]
        Mem["MemTable\\nIn-Memory"]
        SST["SSTable\\nOn Disk"]
        Bloom["Bloom Filter\\nAvoid Disk Read"]
        Compact["Compaction\\nMerge SSTables"]
    end
    subgraph protocol["Protocols"]
        Gossip["Gossip Protocol\\nFailure Detection"]
        Merkle["Merkle Trees\\nAnti-Entropy"]
        Quorum["Quorum\\nW+R > N"]
    end
    SDK --> Coord --> N1 & N2 & N3
    N1 --> WAL --> Mem --> SST
    SST --> Bloom
    SST --> Compact
    N1 <--> Gossip
    N2 <--> Gossip
    N3 <--> Gossip
    N1 <--> Merkle
    style client fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style coord fill:#fef3c7,stroke:#d97706,color:#78350f
    style ring fill:#ecfdf5,stroke:#059669,color:#064e3b
    style internal fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style protocol fill:#fce7f3,stroke:#db2777,color:#831843`,

    'pastebin': () => `graph LR
    subgraph clients["Clients"]
        User["User / API"]
    end
    subgraph edge["Edge"]
        CDN["${c.cdn}\\nHot Pastes"]
        LB["${c.lb}"]
    end
    subgraph compute["Compute — ${c.compute}"]
        WebSvc["Web Server\\nCRUD"]
        KeyGen["Key Generation\\nPre-generated IDs"]
        Cleanup["Cleanup Worker\\nExpiry TTL"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nHot Pastes")]
        PG[("${c.postgres}\\nMetadata")]
    end
    subgraph storage["Storage"]
        S3["${c.storage}\\nPaste Content"]
    end
    User --> CDN --> LB --> WebSvc
    WebSvc --> KeyGen
    WebSvc --> PG & S3 & Redis
    Cleanup --> PG & S3
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843`,

    'news-aggregator': () => `graph LR
    subgraph ingest["Content Ingestion"]
        Crawler["RSS/API\\nCrawler"]
        NLP["NLP Pipeline\\nEntity + Dedup"]
        Cat["Categorizer\\nML"]
    end
    subgraph compute["Compute — ${c.compute}"]
        LB["${c.lb}"]
        RankSvc["Ranking Service\\nFreshness+Relevance"]
        UserSvc["User Service\\nPersonalization"]
        TrendSvc["Trending\\nDetection"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nTrending Cache")]
        PG[("${c.postgres}\\nArticles, Users")]
        ES["${c.search}\\nFull-text"]
        Kafka["${c.kafka}\\nArticle Pipeline"]
        ML["${c.ml}"]
        NoSQL[("${c.nosql}\\nReading History")]
    end
    subgraph serve["Serving"]
        CDN["${c.cdn}"]
        GW["${c.gateway}"]
    end
    Crawler --> Kafka --> NLP --> Cat --> PG
    Cat --> ML
    NLP --> ES
    LB --> RankSvc & UserSvc & TrendSvc
    RankSvc --> ML & Redis & PG
    UserSvc --> NoSQL & PG
    TrendSvc --> Redis & Kafka
    GW --> CDN
    LB --> GW
    style ingest fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style serve fill:#dbeafe,stroke:#2563eb,color:#1e3a5f`,

    'leaderboard': () => `graph LR
    subgraph clients["Clients"]
        Game["Game Client"]
    end
    subgraph compute["Compute — ${c.compute}"]
        GW["${c.gateway}"]
        ScoreSvc["Score Service\\nSubmit/Update"]
        WS["${c.ws}\\nLive Updates"]
    end
    subgraph data["Data Layer"]
        Redis[("${c.redis}\\nSorted Sets\\nZADD/ZRANGE")]
        PG[("${c.postgres}\\nHistorical Scores")]
        Cache["Cache\\nTop-N per Region"]
    end
    subgraph scale["Scaling"]
        Shard1["Shard: Game A"]
        Shard2["Shard: Game B"]
        Agg["Aggregator\\n${c.serverless}"]
    end
    Game --> GW --> ScoreSvc
    ScoreSvc --> Redis --> PG
    Redis --> WS --> Game
    Redis --> Cache
    Shard1 & Shard2 --> Agg --> Cache
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style scale fill:#fef3c7,stroke:#d97706,color:#78350f`,
  };

  // ── TIER 3+4: Infrastructure & Extra ──
  // Generic template for remaining problems
  const genericProblems = {
    'slack': { services: ['WebSocket GW\\nPer-Workspace', 'Channel Svc', 'Thread Svc', 'Search Svc', 'Notification Svc', 'File Upload'], stores: ['Cassandra\\nMessages', 'ES Search', 'Redis\\nPresence'] },
    'tiktok': { services: ['Upload Svc', 'GPU Transcode\\nFarm', 'ML Rec Engine\\nFor You Page', 'Moderation\\nML', 'Creator\\nAnalytics'], stores: ['Vitess\\nSharded MySQL', 'Vector DB\\nEmbeddings', 'Redis Cache'] },
    'reddit': { services: ['Post Svc', 'Comment Svc\\nltree', 'Vote Svc\\nWilson Score', 'Ranking Worker', 'Mod Queue\\nAutoMod'], stores: ['PostgreSQL\\nltree Comments', 'Redis\\nSorted Sets', 'ES Search'] },
    'twitch': { services: ['RTMP Ingest\\nGlobal PoPs', 'GPU Transcode\\nAdaptive Bitrate', 'Chat Gateway\\nWebSocket', 'Sub/Bits\\nService'], stores: ['Cassandra\\nChat History', 'PostgreSQL\\nMetadata', 'Redis Pub/Sub'] },
    'gmail': { services: ['SMTP Inbound\\nMX Servers', 'Spam Pipeline\\nML + Rules', 'IMAP/POP3\\nGateway', 'SMTP Outbound\\nDKIM/SPF'], stores: ['Bigtable\\nMail Store', 'ES\\nMail Search', 'Redis Session'] },
    'google-drive': { services: ['Sync Service\\nDelta Sync', 'Sharing\\nPermissions', 'Preview\\nGenerator', 'Change Log\\nEvent Source'], stores: ['Spanner\\nMetadata', 'Content-Addr\\nBlob Store', 'Redis\\nChange Notify'] },
    'shopify': { services: ['Storefront\\nLiquid Render', 'Cart Svc', 'Order Svc', 'Payment GW', 'Webhook Svc', 'App Platform'], stores: ['Vitess\\nSharded MySQL', 'Redis\\nCarts+Inventory', 'Kafka Events'] },
    'flash-sale': { services: ['Virtual Queue\\nFIFO', 'Rate Limiter\\nAnti-DDoS', 'Order Svc', 'Payment Svc', 'Anti-Bot\\nCAPTCHA'], stores: ['Redis\\nAtomic DECR', 'PostgreSQL\\nOrders', 'Circuit Breaker'] },
    'stock-exchange': { services: ['FIX Gateway', 'Matching Engine\\nPrice-Time', 'Risk Engine\\nPre-trade', 'Settlement\\nT+1', 'Sequencer\\nTotal Order'], stores: ['Order Book\\nIn-Memory', 'TimeSeries DB\\nTick Data', 'Kafka Audit'] },
    'distributed-cache': { services: ['Client Library\\nSmart Route', 'Hot Key\\nDetection', 'Eviction\\nLRU/LFU'], stores: ['Cache Nodes\\nIn-Memory', 'Consistent\\nHash Ring', 'Gossip\\nProtocol'] },
    'distributed-lock': { services: ['Lock Manager\\nAcquire/Release', 'Heartbeat\\nLease Renewal', 'Client SDK\\nRetry+Backoff'], stores: ['ZooKeeper/etcd\\nConsensus', 'Fencing Tokens\\nMonotonic', 'Deadlock\\nDetection'] },
    'distributed-search': { services: ['Query Coord\\nScatter-Gather', 'Crawler\\nURL Frontier', 'Indexer\\nMapReduce', 'Ranker\\nBM25+ML'], stores: ['Index Shards\\nInverted Index', 'Cache\\nQuery Results', 'Spell\\nCorrection'] },
    'distributed-task-scheduler': { services: ['Scheduler\\nCron+OneTime', 'Worker Pool\\nAuto-Scale', 'Retry Engine\\nExp Backoff', 'Leader Election\\nZooKeeper'], stores: ['Task Queue\\nKafka', 'PostgreSQL\\nTask State', 'Dead Letter\\nQueue'] },
    'api-gateway': { services: ['Request Router\\nPath+Header', 'Rate Limiter\\nToken Bucket', 'Auth Service\\nJWT/OAuth', 'Circuit Breaker\\nHalf/Open/Closed'], stores: ['Service Registry\\nConsul', 'Response Cache', 'Metrics\\nPrometheus'] },
    'blob-store': { services: ['S3-Compat API\\nPUT/GET/DELETE', 'Metadata Svc', 'Replication Mgr\\nCross-Region', 'GC\\nMark-Sweep', 'Versioning'], stores: ['Data Nodes\\nErasure 6+3', 'PostgreSQL\\nMetadata', 'Consistent\\nHashing'] },
    'cdn': { services: ['Edge PoPs\\n300+ Global', 'Origin Shield\\nMid-tier Cache', 'Cache Invalidation\\nTag Purge', 'DDoS Mitigation'], stores: ['Origin Server', 'GeoDNS\\nLatency Route', 'TLS Termination\\nEdge SSL'] },
    'ci-cd-pipeline': { services: ['Build Agents\\nContainerized', 'Test Runners\\nParallel', 'Deploy Svc\\nBlue-Green/Canary', 'Secret Manager'], stores: ['Git Source\\nWebhook', 'Artifact Registry\\nDocker/npm', 'Pipeline DB\\nState'] },
    'chatgpt-llm-system': { services: ['API GW\\nStreaming SSE', 'GPU LB\\nAware Routing', 'Safety Filter\\nModeration', 'Rate Limiter\\nToken Budget'], stores: ['GPU Cluster\\nA100/H100', 'KV Cache\\nAttention', 'Model Registry\\nVersioned'] },
    'calendar-system': { services: ['Event Svc\\nCRUD+Recurring', 'RRULE Engine\\nExpansion', 'Notification Svc\\nReminders', 'Free/Busy\\nLookup', 'CalDAV Sync'], stores: ['PostgreSQL\\nEvents', 'Redis\\nUpcoming', 'Timezone DB\\nIANA'] },
    'deployment-system': { services: ['API Server\\nREST', 'Scheduler\\nBin-Packing', 'Controller Mgr\\nReconciliation', 'Kubelet\\nNode Agent', 'HPA\\nAutoscaler'], stores: ['etcd\\nRaft Consensus', 'Container Runtime\\ncontainerd', 'Service Mesh\\nEnvoy'] },
    'digital-wallet': { services: ['Wallet Svc\\nBalance Mgmt', 'Transaction Svc\\nACID', 'Fraud ML\\nReal-time', 'KYC Service\\nID Verify', 'Compliance\\nAML'], stores: ['Ledger\\nDouble-Entry', 'Payment Rails\\nACH/Visa', 'HSM\\nTokenization'] },
    'job-scheduler': { services: ['Scheduler\\nPriority-Based', 'Worker Pool\\nCPU+GPU', 'Cron Engine\\nTime-Trigger', 'DAG Resolver\\nTopo Sort'], stores: ['Job Queue\\nPartitioned', 'PostgreSQL\\nJob State', 'Dead Letter\\nQueue'] },
    'object-storage': { services: ['S3 API\\nPresigned URLs', 'Metadata Svc\\nSharded', 'GC\\nMark-Sweep', 'Lifecycle Mgr\\nTiering'], stores: ['Data Nodes\\nErasure 6+3', 'Replication\\nCross-DC', 'Monitoring\\nCapacity'] },
    'online-chess': { services: ['Game Svc\\nState Machine', 'Matchmaking\\nELO-Based', 'Move Validator\\nChess Rules', 'Spectator\\nFan-out', 'Puzzle Engine\\nStockfish'], stores: ['Redis\\nActive Games', 'PostgreSQL\\nGame History', 'Rating\\nGlicko-2'] },
    'recommendation-engine': { services: ['Activity Collector\\nClickstream', 'ML Training\\nSpark Batch', 'Model Serving\\n<50ms p99', 'A/B Testing', 'Cold-Start\\nHandler'], stores: ['Feature Store\\nOnline+Offline', 'Vector DB\\nANN Search', 'Kafka Events'] },
    'time-series-db': { services: ['Ingestion Buffer\\nBatch Writes', 'Query Engine\\nTime-Range+Agg', 'Compaction\\nSize-Tiered', 'Retention Mgr\\nTTL+Downsample'], stores: ['WAL\\nDurability', 'LSM/Columnar\\nStore', 'Raft\\nReplication'] },
    'ad-click-aggregation': { services: ['Click Ingest\\n100K/sec', 'Stream Processor\\nFlink Windows', 'Aggregation Svc\\nCampaign Level', 'Dashboard API', 'Fraud Detection\\nBot Filter'], stores: ['Kafka\\nClick Stream', 'ClickHouse\\nOLAP', 'Cache\\nRecent Aggs'] },
    'metrics-monitoring': { services: ['Agent Collector\\nHost/Container', 'Query Engine\\nPromQL', 'Alerting Svc\\nPagerDuty', 'Dashboard\\nGrafana', 'Anomaly ML'], stores: ['Kafka\\nIngestion', 'TSDB\\nPrometheus', 'Object Store\\nLong-term'] },
  };

  // Check if we have a specific template
  if (templates[id]) return templates[id]();

  // Use generic template for the rest
  const p = genericProblems[id];
  if (!p) return null;

  const svcNodes = p.services.map((s, i) => `        Svc${i}["${s}"]`).join('\n');
  const storeNodes = p.stores.map((s, i) => `        Store${i}[("${s}")]`).join('\n');
  const svcLinks = p.services.map((_, i) => `Svc${i}`).join(' & ');
  const storeLinks = p.stores.map((_, i) => {
    const svcIdx = i % p.services.length;
    return `    Svc${svcIdx} --> Store${i}`;
  }).join('\n');

  return `graph LR
    subgraph clients["Clients"]
        App["Application"]
    end
    subgraph edge["Edge"]
        DNS["${c.dns}"]
        CDN["${c.cdn}"]
        LB["${c.lb}"]
    end
    subgraph compute["Compute — ${c.compute}"]
${svcNodes}
    end
    subgraph data["Data Layer"]
${storeNodes}
    end
    subgraph storage["Storage"]
        S3["${c.storage}"]
    end
    subgraph infra["Infrastructure"]
        Kafka["${c.kafka}"]
        Mon["${c.monitor}"]
    end
    App --> DNS --> CDN --> LB
    LB --> ${svcLinks}
${storeLinks}
    Svc0 --> Kafka
    Svc0 --> S3
    Kafka --> Mon
    style clients fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    style edge fill:#fef3c7,stroke:#d97706,color:#78350f
    style compute fill:#ecfdf5,stroke:#059669,color:#064e3b
    style data fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    style storage fill:#fce7f3,stroke:#db2777,color:#831843
    style infra fill:#f1f5f9,stroke:#64748b,color:#334155`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: generate all missing diagrams
// ─────────────────────────────────────────────────────────────────────────────
const allProblems = Object.keys({
  ...Object.fromEntries([
    'spotify','airbnb','doordash','google-maps','zoom','linkedin','tinder','yelp',
    'hotel-booking','unique-id-generator','twitter-trends','typeahead','web-crawler',
    'key-value-store','pastebin','news-aggregator','leaderboard',
    'slack','tiktok','reddit','twitch','gmail','google-drive','shopify','flash-sale',
    'stock-exchange','distributed-cache','distributed-lock','distributed-search',
    'distributed-task-scheduler','api-gateway','blob-store','cdn','ci-cd-pipeline',
    'chatgpt-llm-system','calendar-system','deployment-system','digital-wallet',
    'job-scheduler','object-storage','online-chess','recommendation-engine',
    'time-series-db','ad-click-aggregation','metrics-monitoring',
  ].map(k => [k, true])),
});

const providers = ['aws', 'gcp', 'azure'];
let generated = 0;
let skipped = 0;
let failed = 0;
const total = allProblems.length * providers.length;

console.log(`Generating ${total} Mermaid diagrams (${allProblems.length} problems × 3 providers)\n`);

for (const id of allProblems) {
  for (const provider of providers) {
    const outDir = path.join(DIAGRAMS_DIR, id);
    // Use eraser- prefix for compatibility with existing TopicDetail code
    const outFile = path.join(outDir, `eraser-${provider}.png`);

    if (fs.existsSync(outFile)) {
      skipped++;
      console.log(`[${generated + skipped}/${total}] SKIP ${id}/eraser-${provider}.png (exists)`);
      continue;
    }

    const c = cloud[provider];
    const mermaidCode = makeDiagram(id, c);

    if (!mermaidCode) {
      console.log(`[${generated + skipped + 1}/${total}] SKIP ${id} (no template)`);
      skipped++;
      continue;
    }

    const tmpFile = path.join(TMP_DIR, `${id}-${provider}.mmd`);
    fs.writeFileSync(tmpFile, mermaidCode);

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    try {
      execSync(
        `npx mmdc -i "${tmpFile}" -o "${outFile}" -c "${CONFIG_PATH}" -w 2400 -H 1200 -s 2`,
        { stdio: 'pipe', timeout: 30000 }
      );
      generated++;
      console.log(`[${generated + skipped}/${total}] ✓ ${id}/eraser-${provider}.png`);
    } catch (err) {
      failed++;
      console.error(`[${generated + skipped + failed}/${total}] ✗ ${id}/eraser-${provider}.png — ${err.message.split('\n')[0]}`);
    }
  }
}

// Copy duplicates
const duplicates = {
  'autocomplete-system': 'typeahead',
  'ecommerce-platform': 'amazon',
  'messaging-app': 'whatsapp',
  'payment-gateway': 'payment-system',
  'proximity-service': 'yelp',
  'tiny-url': 'url-shortener',
  'top-k-leaderboard': 'leaderboard',
};

console.log('\nCopying duplicate diagrams...');
for (const [target, source] of Object.entries(duplicates)) {
  const srcDir = path.join(DIAGRAMS_DIR, source);
  const tgtDir = path.join(DIAGRAMS_DIR, target);
  if (!fs.existsSync(tgtDir)) fs.mkdirSync(tgtDir, { recursive: true });
  for (const provider of providers) {
    const srcFile = path.join(srcDir, `eraser-${provider}.png`);
    const tgtFile = path.join(tgtDir, `eraser-${provider}.png`);
    if (fs.existsSync(srcFile) && !fs.existsSync(tgtFile)) {
      fs.copyFileSync(srcFile, tgtFile);
      console.log(`  Copied ${source} → ${target}/eraser-${provider}.png`);
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);
