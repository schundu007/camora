# Eraser Diagram Prompts

For each problem below, generate 3 diagrams on https://app.eraser.io (click "Generate diagram" or use AI):
- **AWS** version → save as `eraser-aws.png`
- **GCP** version → save as `eraser-gcp.png`
- **Azure** version → save as `eraser-azure.png`

Save each PNG to: `apps/frontend/public/diagrams/{problem-id}/`

Select **"Cloud Architecture Diagram"** as diagram type, **Light** theme, **2x** scale.

---

## 1. facebook-newsfeed (missing: AWS, Azure)

Save to: `apps/frontend/public/diagrams/facebook-newsfeed/`

**AWS Prompt:**
```
Design a production-grade Facebook News Feed system architecture.

Components: Feed Service (ranked), Post Service, Ranking Service (ML — engagement prediction), Social Graph Service, Cache (Memcached/TAO), Kafka (event bus), CDN, Object Storage, Ads Insertion Service.

Use AWS cloud services: Route 53 for DNS, CloudFront CDN, ALB load balancer, ECS/EKS for microservices (Feed Service, Post Service, Ranking Service, Social Graph, Ads Service), ElastiCache (Memcached clusters), Amazon MSK (Kafka), RDS Aurora (social graph), DynamoDB (posts/feed), S3 (media storage), SageMaker (ML ranking models), Lambda (event processing).

Deploy across Multi-AZ (us-east-1a, us-east-1b, us-east-1c). Include Auto Scaling Groups, CloudWatch monitoring, WAF, VPC with public/private subnets, NAT Gateway. Show HA with primary-replica databases, cross-AZ replication. Include DR with cross-region replication to us-west-2. Show data flow arrows between all components with labels.
```

**Azure Prompt:**
```
Design a production-grade Facebook News Feed system architecture.

Components: Feed Service (ranked), Post Service, Ranking Service (ML — engagement prediction), Social Graph Service, Cache (Memcached/TAO), Kafka (event bus), CDN, Object Storage, Ads Insertion Service.

Use Azure cloud services: Azure DNS, Azure Front Door + CDN, Application Gateway, AKS for microservices (Feed Service, Post Service, Ranking Service, Social Graph, Ads Service), Azure Cache for Redis (feed cache), Event Hubs (streaming), Azure SQL (social graph), Cosmos DB (posts/feed), Blob Storage (media), Azure ML (ranking models), Azure Functions (event processing).

Deploy across Availability Zones 1, 2, 3. Include VMSS autoscaling, Azure Monitor, WAF, VNet with public/private subnets. Show HA with geo-replication, active-active databases. Include DR with paired region failover. Show data flow arrows between all components with labels.
```

---

## 2. spotify

Save to: `apps/frontend/public/diagrams/spotify/`

**AWS Prompt:**
```
Design a production-grade Spotify Music Streaming system architecture.

Components: Audio Streaming Service (adaptive bitrate), CDN (edge cache), Recommendation Engine (collaborative filtering + deep learning), Search Service (Elasticsearch), Playlist Service, User Service, Cache (Redis), Object Storage (audio files — FLAC/OGG/MP3), Offline Sync Service, Ads Service.

Use AWS cloud services: Route 53, CloudFront CDN (audio edge caching), ALB, ECS/EKS microservices, ElastiCache Redis (session + metadata cache), Amazon OpenSearch (search), RDS Aurora PostgreSQL (user/playlist data), DynamoDB (listening history), S3 (audio file storage — multiple bitrates), SageMaker (recommendation ML), MSK Kafka (event streaming), Lambda (offline sync triggers), Kinesis (real-time analytics).

Deploy Multi-AZ (us-east-1a, 1b, 1c). Auto Scaling Groups, CloudWatch, WAF, VPC private/public subnets. HA: Aurora read replicas, ElastiCache replication. DR: Cross-region S3 replication, Aurora global database. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Spotify Music Streaming system architecture.

Components: Audio Streaming Service (adaptive bitrate), CDN (edge cache), Recommendation Engine (collaborative filtering + deep learning), Search Service (Elasticsearch), Playlist Service, User Service, Cache (Redis), Object Storage (audio files), Offline Sync Service, Ads Service.

Use Google Cloud services: Cloud DNS, Cloud CDN (audio caching), Cloud Load Balancing, GKE microservices, Memorystore Redis (cache), Elasticsearch on GKE (search), Cloud SQL PostgreSQL (user/playlist), Bigtable (listening history), Cloud Storage (audio files — multi-bitrate), Vertex AI (recommendation ML), Pub/Sub (event streaming), Cloud Functions (offline sync), BigQuery (analytics).

Deploy multi-zone (us-central1-a, b, c). GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC private/public subnets. HA: Cloud SQL HA, Memorystore replicas. DR: Multi-region Cloud Storage, Cloud SQL cross-region replicas. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Spotify Music Streaming system architecture.

Components: Audio Streaming Service (adaptive bitrate), CDN (edge cache), Recommendation Engine (collaborative filtering + deep learning), Search Service, Playlist Service, User Service, Cache (Redis), Object Storage (audio files), Offline Sync Service, Ads Service.

Use Azure cloud services: Azure DNS, Azure CDN (audio caching), Application Gateway, AKS microservices, Azure Cache for Redis, Cognitive Search, Azure SQL PostgreSQL (user/playlist), Cosmos DB (listening history), Blob Storage (audio files), Azure ML (recommendations), Event Hubs (streaming), Azure Functions (offline sync), Azure Monitor.

Deploy across Availability Zones 1, 2, 3. AKS autoscaling, Azure Monitor, WAF, VNet. HA: Azure SQL geo-replication, Redis clustering. DR: Paired region failover, geo-redundant storage. Show data flow arrows with labels.
```

---

## 3. airbnb

Save to: `apps/frontend/public/diagrams/airbnb/`

**AWS Prompt:**
```
Design a production-grade Airbnb Accommodation Marketplace system architecture.

Components: Search Service (geo + availability + pricing), Booking Service (distributed locks, double-booking prevention), Payment Service (escrow model), Messaging Service (host-guest), Review Service, Geospatial Index (Elasticsearch), CDN, Cache, Pricing Service (dynamic/smart pricing ML), Trust & Safety ML (fraud detection, ID verification).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices (Search, Booking, Payment, Messaging, Review, Pricing, Trust), ElastiCache Redis (availability cache, session), Amazon OpenSearch (geo search + full-text), RDS Aurora PostgreSQL (listings, bookings, users), DynamoDB (messages, reviews), S3 (listing photos), SageMaker (pricing ML, fraud detection), MSK Kafka (booking events), SQS (async notifications), SES (emails), Lambda (image processing).

Deploy Multi-AZ (us-east-1a, 1b, 1c). Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, OpenSearch multi-AZ. DR: Aurora global database, S3 cross-region replication. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Airbnb Accommodation Marketplace system architecture.

Components: Search Service (geo + availability + pricing), Booking Service (distributed locks), Payment Service (escrow), Messaging Service, Review Service, Geospatial Index, CDN, Cache, Pricing Service (dynamic ML), Trust & Safety ML.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, Memorystore Redis, Elasticsearch on GKE (geo search), Cloud SQL PostgreSQL (listings, bookings), Firestore (messages, reviews), Cloud Storage (photos), Vertex AI (pricing + fraud ML), Pub/Sub (events), Cloud Tasks (async), Cloud Functions (image resize), BigQuery (analytics).

Deploy multi-zone (us-central1-a, b, c). GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, multi-zone GKE. DR: Multi-region Cloud SQL, geo-redundant storage. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Airbnb Accommodation Marketplace system architecture.

Components: Search Service (geo + availability), Booking Service (distributed locks), Payment Service (escrow), Messaging Service, Review Service, Geospatial Index, CDN, Cache, Pricing Service (ML), Trust & Safety ML.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis, Cognitive Search (geo), Azure SQL PostgreSQL (listings, bookings), Cosmos DB (messages, reviews), Blob Storage (photos), Azure ML (pricing + fraud), Event Hubs (events), Service Bus (async), Azure Functions (image processing), Azure Monitor.

Deploy Availability Zones 1, 2, 3. AKS autoscaling, Azure Monitor, WAF, VNet. HA: Azure SQL geo-replication, Cosmos DB multi-region. DR: Paired region failover. Show data flow arrows with labels.
```

---

## 4. doordash

Save to: `apps/frontend/public/diagrams/doordash/`

**AWS Prompt:**
```
Design a production-grade DoorDash Food Delivery system architecture.

Components: Order Service (state machine — placed/confirmed/preparing/picked-up/delivered), Restaurant Service (menu, availability), Delivery Matching Service (optimization — assign nearest Dasher), Real-time Tracking (WebSocket — live GPS), Payment Service, Kafka (order events), Redis (geospatial — Dasher locations), Database, ETA Prediction (ML), Dasher App Gateway.

Use AWS cloud services: Route 53, CloudFront, ALB + WebSocket support, ECS/EKS microservices, ElastiCache Redis (geospatial GEORADIUS for Dasher matching, order cache), RDS Aurora PostgreSQL (orders, restaurants, users), DynamoDB (Dasher locations, delivery tracking), S3 (menu images), MSK Kafka (order event streaming), API Gateway (WebSocket for live tracking), SageMaker (ETA prediction ML), SNS/SQS (notifications), Lambda (surge pricing).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, MSK multi-AZ. DR: Aurora global database. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade DoorDash Food Delivery system architecture.

Components: Order Service (state machine), Restaurant Service, Delivery Matching Service (optimization), Real-time Tracking (WebSocket), Payment Service, Kafka, Redis (geospatial), Database, ETA Prediction (ML), Dasher App Gateway.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, Memorystore Redis (geospatial), Cloud SQL PostgreSQL (orders, restaurants), Firestore (tracking, locations), Cloud Storage (images), Pub/Sub (order events), Cloud Endpoints (WebSocket), Vertex AI (ETA ML), Cloud Tasks (notifications), Cloud Functions (surge pricing), BigQuery (analytics).

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, multi-zone GKE. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade DoorDash Food Delivery system architecture.

Components: Order Service (state machine), Restaurant Service, Delivery Matching, Real-time Tracking (WebSocket), Payment Service, Kafka, Redis (geospatial), Database, ETA Prediction (ML), Dasher App.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis (geospatial), Azure SQL PostgreSQL (orders), Cosmos DB (tracking), Blob Storage (images), Event Hubs (order events), Azure SignalR (WebSocket tracking), Azure ML (ETA), Service Bus (notifications), Azure Functions (surge pricing), Azure Monitor.

Deploy Availability Zones 1, 2, 3. AKS autoscaling, WAF, VNet. HA: Azure SQL geo-replication, Cosmos DB multi-region. DR: Paired region failover. Show data flow arrows with labels.
```

---

## 5. google-maps

Save to: `apps/frontend/public/diagrams/google-maps/`

**AWS Prompt:**
```
Design a production-grade Google Maps Navigation system architecture.

Components: Map Tile Service (vector tiles, pre-rendered at zoom levels), Routing Engine (Dijkstra/A* on weighted road graph), Real-time Traffic Service (probe data from mobile devices), Geocoding Service (address to coordinates), ETA Service (ML-based predictions), CDN (tile caching — billions of tiles), Location Service (GPS tracking), Cache, Places/POI Service (search nearby), Offline Maps (downloadable regions).

Use AWS cloud services: Route 53 (GeoDNS), CloudFront CDN (tile edge caching), ALB, ECS/EKS microservices, ElastiCache Redis (routing cache, geocoding cache), Amazon OpenSearch (POI search), RDS Aurora PostgreSQL (road graph, POI data), DynamoDB (real-time traffic, GPS probes), S3 (map tiles, offline packages), SageMaker (ETA ML, traffic prediction), Kinesis (real-time GPS stream processing), Lambda (tile generation), API Gateway.

Deploy Multi-AZ globally. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora global, CloudFront multi-origin. DR: Multi-region active-active. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Google Maps Navigation system architecture.

Components: Map Tile Service (vector tiles), Routing Engine (Dijkstra/A*), Real-time Traffic Service (probe data), Geocoding Service, ETA Service (ML), CDN (tile caching), Location Service, Cache, Places/POI Service, Offline Maps.

Use Google Cloud services: Cloud DNS, Cloud CDN (tile caching), Cloud Load Balancing, GKE microservices, Memorystore Redis (cache), Elasticsearch on GKE (POI search), Cloud Spanner (road graph — global), Bigtable (real-time traffic, GPS probes), Cloud Storage (tiles, offline packages), Vertex AI (ETA prediction), Dataflow (real-time GPS stream), Cloud Functions (tile generation), Maps Platform APIs.

Deploy multi-zone globally. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Spanner multi-region, global GKE. DR: Spanner automatic failover. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Google Maps Navigation system architecture.

Components: Map Tile Service (vector tiles), Routing Engine (Dijkstra/A*), Real-time Traffic, Geocoding Service, ETA Service (ML), CDN, Location Service, Cache, Places/POI Service, Offline Maps.

Use Azure cloud services: Azure DNS, Azure CDN (tile caching), Application Gateway, AKS microservices, Azure Cache for Redis, Cognitive Search (POI), Cosmos DB (road graph — global distribution), Azure Table Storage (traffic probes), Blob Storage (tiles, offline), Azure ML (ETA), Event Hubs (GPS streaming), Azure Functions (tile generation), Azure Maps API.

Deploy Availability Zones, global distribution. AKS autoscaling, Azure Monitor, WAF, VNet. HA: Cosmos DB multi-region writes. DR: Automatic failover. Show data flow arrows with labels.
```

---

## 6. zoom

Save to: `apps/frontend/public/diagrams/zoom/`

**AWS Prompt:**
```
Design a production-grade Zoom Video Conferencing system architecture.

Components: Signaling Server (WebRTC SDP exchange), Media Server (SFU — Selective Forwarding Unit, routes video/audio streams), Recording Service (composites streams to MP4), Chat Service (in-meeting text), TURN/STUN Servers (NAT traversal for peer connectivity), CDN (recordings), Database, Object Storage (recordings, shared files), Screen Share Service, Breakout Rooms (sub-meetings).

Use AWS cloud services: Route 53 (latency-based routing), CloudFront (recording delivery), ALB + NLB (UDP/TCP media), EC2 GPU instances (SFU media servers — c5n.xlarge), ECS (signaling, chat), ElastiCache Redis (session state, room management), RDS Aurora PostgreSQL (users, meeting metadata), DynamoDB (chat messages), S3 (recordings), MediaConvert (recording processing), MSK Kafka (meeting events), TURN servers on EC2, API Gateway.

Deploy Multi-AZ + multi-region (edge media servers globally). Auto Scaling, CloudWatch, WAF, VPC. HA: Media server failover, Aurora multi-AZ. DR: Multi-region active-active media. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Zoom Video Conferencing system architecture.

Components: Signaling Server (WebRTC SDP), Media Server (SFU), Recording Service, Chat Service, TURN/STUN Servers, CDN, Database, Object Storage, Screen Share, Breakout Rooms.

Use Google Cloud services: Cloud DNS, Cloud CDN (recordings), Cloud Load Balancing (UDP/TCP), GCE (SFU media servers — n2-highcpu), GKE (signaling, chat), Memorystore Redis (sessions, rooms), Cloud SQL PostgreSQL (metadata), Firestore (chat), Cloud Storage (recordings), Transcoder API (recording processing), Pub/Sub (events), TURN on GCE, Cloud Endpoints.

Deploy multi-zone + global edge. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Media failover, Cloud SQL HA. DR: Multi-region active-active. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Zoom Video Conferencing system architecture.

Components: Signaling Server (WebRTC SDP), Media Server (SFU), Recording Service, Chat Service, TURN/STUN Servers, CDN, Database, Object Storage, Screen Share, Breakout Rooms.

Use Azure cloud services: Azure DNS, Azure CDN (recordings), Azure Load Balancer (UDP/TCP), VMs (SFU media — Fsv2 series), AKS (signaling, chat), Azure Cache for Redis (sessions), Azure SQL PostgreSQL (metadata), Cosmos DB (chat), Blob Storage (recordings), Media Services (processing), Event Hubs (events), TURN on VMs, Azure Communication Services.

Deploy Availability Zones + global. VMSS autoscaling, Azure Monitor, WAF, VNet. HA: Media failover, SQL geo-replication. DR: Multi-region. Show data flow arrows with labels.
```

---

## 7. linkedin

Save to: `apps/frontend/public/diagrams/linkedin/`

**AWS Prompt:**
```
Design a production-grade LinkedIn Professional Network system architecture.

Components: Profile Service, Connection Service (social graph — 1st/2nd/3rd degree), Feed Service (ranked by engagement + relevance), Messaging Service (real-time), Search Service (Elasticsearch — people, jobs, companies), Recommendation Engine (People You May Know — graph ML), Cache (Couchbase/Redis), Kafka (event bus — profile views, connections), CDN, Job Matching Service (ML).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices, ElastiCache Redis (feed cache, profile cache), Amazon Neptune (social graph), Amazon OpenSearch (people/job search), RDS Aurora PostgreSQL (profiles, jobs), DynamoDB (messages, notifications), S3 (profile photos, resumes), SageMaker (PYMK recommendations, job matching ML), MSK Kafka (activity events), API Gateway, SQS (async processing).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, Neptune replicas. DR: Aurora global, S3 cross-region. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade LinkedIn Professional Network system architecture.

Components: Profile Service, Connection Service (social graph), Feed Service (ranked), Messaging Service, Search Service, Recommendation Engine (People You May Know), Cache, Kafka, CDN, Job Matching Service (ML).

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, Memorystore Redis (cache), Neo4j on GKE (social graph), Elasticsearch on GKE (search), Cloud SQL PostgreSQL (profiles, jobs), Firestore (messages), Cloud Storage (photos, resumes), Vertex AI (recommendations, job matching), Pub/Sub (events), Cloud Endpoints.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, multi-zone GKE. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade LinkedIn Professional Network system architecture.

Components: Profile Service, Connection Service (social graph), Feed Service (ranked), Messaging Service, Search Service, Recommendation Engine, Cache, Kafka, CDN, Job Matching Service (ML).

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis, Cosmos DB Gremlin API (social graph), Cognitive Search (people/jobs), Azure SQL PostgreSQL (profiles, jobs), Cosmos DB (messages), Blob Storage (photos), Azure ML (recommendations), Event Hubs (events), Azure SignalR (real-time messaging).

Deploy Availability Zones. AKS autoscaling, Azure Monitor, WAF, VNet. HA: Cosmos DB multi-region, SQL geo-replication. DR: Paired region failover. Show data flow arrows with labels.
```

---

## 8. tinder

Save to: `apps/frontend/public/diagrams/tinder/`

**AWS Prompt:**
```
Design a production-grade Tinder Dating/Matching App system architecture.

Components: Matching Service (swipe logic — mutual likes), Recommendation Engine (ML scoring — attractiveness, preferences, distance), Geospatial Index (Redis GEORADIUS — nearby users), Profile Service (photos, bio), Chat Service (WebSocket — matched users), Redis (swipe queue, rate limiting), Database (PostgreSQL), Push Notifications (APNs/FCM), Photo Moderation (ML — NSFW detection), Boost/Premium Service.

Use AWS cloud services: Route 53, CloudFront CDN (profile photos), ALB, ECS/EKS microservices, ElastiCache Redis (geospatial + swipe cache + rate limiting), RDS Aurora PostgreSQL (profiles, matches), DynamoDB (swipe history, chat messages), S3 (photos — multiple resolutions), Rekognition (photo moderation ML), SageMaker (recommendation scoring), MSK Kafka (swipe events), API Gateway (WebSocket for chat), SNS (push notifications).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, Redis cluster. DR: Aurora global database. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Tinder Dating/Matching App system architecture.

Components: Matching Service, Recommendation Engine (ML), Geospatial Index (Redis), Profile Service, Chat Service (WebSocket), Redis (swipe queue), Database, Push Notifications, Photo Moderation (ML), Boost/Premium.

Use Google Cloud services: Cloud DNS, Cloud CDN (photos), Cloud Load Balancing, GKE microservices, Memorystore Redis (geospatial + cache), Cloud SQL PostgreSQL (profiles, matches), Firestore (swipes, chat), Cloud Storage (photos), Vision AI (moderation), Vertex AI (recommendations), Pub/Sub (events), Cloud Endpoints (WebSocket), Firebase Cloud Messaging (push).

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, Redis HA. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Tinder Dating/Matching App system architecture.

Components: Matching Service, Recommendation Engine (ML), Geospatial Index, Profile Service, Chat Service (WebSocket), Redis, Database, Push Notifications, Photo Moderation (ML), Boost/Premium.

Use Azure cloud services: Azure DNS, Azure CDN (photos), Application Gateway, AKS microservices, Azure Cache for Redis (geospatial), Azure SQL PostgreSQL (profiles), Cosmos DB (swipes, chat), Blob Storage (photos), Azure AI Vision (moderation), Azure ML (recommendations), Event Hubs (events), Azure SignalR (chat), Notification Hubs (push).

Deploy Availability Zones. AKS autoscaling, Azure Monitor, WAF, VNet. HA: SQL geo-replication, Redis clustering. DR: Paired region. Show data flow arrows with labels.
```

---

## 9. yelp

Save to: `apps/frontend/public/diagrams/yelp/`

**AWS Prompt:**
```
Design a production-grade Yelp Location-based Service system architecture.

Components: Search Service (full-text + geospatial), Geospatial Index (QuadTree/Geohash — find nearby businesses), Business Service (CRUD, hours, photos), Review Service (ratings, text, photos), Database (PostgreSQL), Elasticsearch (search + geo), CDN (photos), Cache (Memcached — hot queries), Photo Service (upload, resize), ML Ranking (personalized results, spam detection).

Use AWS cloud services: Route 53, CloudFront CDN (photos), ALB, ECS/EKS microservices, ElastiCache Memcached (query cache), Amazon OpenSearch (geo search + full-text), RDS Aurora PostgreSQL (businesses, reviews, users), DynamoDB (review photos, user activity), S3 (business/review photos), SageMaker (ranking ML, review spam detection), MSK Kafka (review events), Lambda (image processing), API Gateway.

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, OpenSearch multi-AZ. DR: Aurora global. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Yelp Location-based Service system architecture.

Components: Search Service (geo + full-text), Geospatial Index (QuadTree/Geohash), Business Service, Review Service, Database, Elasticsearch, CDN, Cache, Photo Service, ML Ranking.

Use Google Cloud services: Cloud DNS, Cloud CDN (photos), Cloud Load Balancing, GKE microservices, Memorystore Redis (cache), Elasticsearch on GKE (geo search), Cloud SQL PostgreSQL (businesses, reviews), Cloud Storage (photos), Vertex AI (ranking, spam detection), Pub/Sub (events), Cloud Functions (image resize), Cloud Endpoints.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Yelp Location-based Service system architecture.

Components: Search Service (geo + full-text), Geospatial Index, Business Service, Review Service, Database, Search, CDN, Cache, Photo Service, ML Ranking.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis, Cognitive Search (geo + full-text), Azure SQL PostgreSQL (businesses, reviews), Blob Storage (photos), Azure ML (ranking, spam), Event Hubs (events), Azure Functions (image resize), Azure Monitor.

Deploy Availability Zones. AKS autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Paired region. Show data flow arrows with labels.
```

---

## 10. hotel-booking

Save to: `apps/frontend/public/diagrams/hotel-booking/`

**AWS Prompt:**
```
Design a production-grade Hotel Booking System (Booking.com) architecture.

Components: Search Service (availability + geo + price filtering), Booking Service (optimistic locking — prevent double-booking), Payment Service (PCI compliant), Inventory Service (real-time room availability), Review Service, Geospatial Index (nearby hotels), Cache (hot searches), CDN (hotel photos), Notification Service (confirmation emails), Price Comparison Engine (dynamic pricing).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices, ElastiCache Redis (availability cache, search cache), Amazon OpenSearch (hotel search + geo), RDS Aurora PostgreSQL (hotels, bookings, inventory — row-level locking), DynamoDB (reviews, price history), S3 (hotel photos), MSK Kafka (booking events), SES (confirmation emails), SNS (push), Lambda (price computation), API Gateway.

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, Redis cluster. DR: Aurora global database. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Hotel Booking System (Booking.com) architecture.

Components: Search Service (availability + geo + price), Booking Service (optimistic locking), Payment Service, Inventory Service, Review Service, Geospatial Index, Cache, CDN, Notification Service, Price Comparison Engine.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, Memorystore Redis (cache), Elasticsearch on GKE (hotel search), Cloud SQL PostgreSQL (hotels, bookings, inventory), Firestore (reviews), Cloud Storage (photos), Pub/Sub (events), Cloud Tasks (notifications), Cloud Functions (pricing), Cloud Endpoints.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Hotel Booking System (Booking.com) architecture.

Components: Search Service (availability + geo), Booking Service (optimistic locking), Payment Service, Inventory Service, Review Service, Geospatial Index, Cache, CDN, Notification Service, Price Engine.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis, Cognitive Search (hotels + geo), Azure SQL PostgreSQL (hotels, bookings), Cosmos DB (reviews), Blob Storage (photos), Event Hubs (events), Service Bus (notifications), Azure Functions (pricing), Azure Monitor.

Deploy Availability Zones. AKS autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Paired region. Show data flow arrows with labels.
```

---

## 11. unique-id-generator

Save to: `apps/frontend/public/diagrams/unique-id-generator/`

**AWS Prompt:**
```
Design a production-grade Distributed Unique ID Generator (Snowflake) system architecture.

Components: ID Generator Service (Snowflake — 64-bit IDs: 41-bit timestamp + 10-bit machine ID + 12-bit sequence), ZooKeeper (worker registration — assigns unique machine IDs), Snowflake Workers (stateless, each assigned datacenter + machine ID), Load Balancer (round-robin to workers), Clock Sync (NTP — detect clock drift), Monitoring (alert on clock skew, ID exhaustion).

Use AWS cloud services: Route 53, NLB (low-latency UDP/TCP), EC2 instances (Snowflake workers — bare metal for clock precision), Amazon MQ or ZooKeeper on EC2 (worker coordination), CloudWatch (clock drift monitoring, ID generation rate), VPC (private subnet only — internal service), Auto Scaling Group, Systems Manager (NTP configuration), DynamoDB (worker registry backup).

Deploy Multi-AZ (3 AZs — each with worker pool). HA: Multiple workers per AZ, ZooKeeper quorum across AZs. DR: Separate datacenter ID per region. Show data flow arrows with labels. Show the 64-bit ID structure breakdown.
```

**GCP Prompt:**
```
Design a production-grade Distributed Unique ID Generator (Snowflake) system architecture.

Components: ID Generator Service (Snowflake — 64-bit IDs), ZooKeeper (worker registration), Snowflake Workers, Load Balancer, Clock Sync (NTP), Monitoring.

Use Google Cloud services: Cloud DNS, Cloud Load Balancing (internal), GCE instances (Snowflake workers), ZooKeeper on GCE (coordination), Cloud Monitoring (clock drift), VPC (internal only), Managed Instance Groups (autoscaling), Cloud Spanner (worker registry — globally consistent).

Deploy multi-zone. HA: Workers per zone, ZooKeeper quorum. DR: Separate datacenter IDs per region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Distributed Unique ID Generator (Snowflake) system architecture.

Components: ID Generator Service (Snowflake — 64-bit IDs), ZooKeeper (worker registration), Snowflake Workers, Load Balancer, Clock Sync (NTP), Monitoring.

Use Azure cloud services: Azure DNS, Azure Load Balancer (internal), VMs (Snowflake workers), ZooKeeper on VMs or Azure Cosmos DB etcd (coordination), Azure Monitor (clock drift), VNet (internal only), VMSS (autoscaling), Azure Table Storage (worker registry).

Deploy Availability Zones. HA: Workers per zone, ZooKeeper quorum. DR: Separate datacenter IDs per region. Show data flow arrows with labels.
```

---

## 12. twitter-trends

Save to: `apps/frontend/public/diagrams/twitter-trends/`

**AWS Prompt:**
```
Design a production-grade Twitter Trending Topics system architecture.

Components: Stream Processor (Apache Flink/Storm — real-time hashtag counting), Kafka (tweet stream ingestion), Count-Min Sketch (approximate counting — memory efficient), Redis (real-time trend counters), Time-Decay Service (exponential decay — favor recent activity over stale topics), API Gateway (serve trends), Cache (precomputed top-N trends), Geographic Segmentation (local trends per city/country).

Use AWS cloud services: Route 53, CloudFront, ALB, Amazon MSK Kafka (tweet stream), Amazon Managed Flink (stream processing), ElastiCache Redis (trend counters, Count-Min Sketch), DynamoDB (trend history, geographic trends), RDS Aurora PostgreSQL (trend metadata), Lambda (time-decay computation), API Gateway (trend API), CloudWatch (throughput monitoring), Kinesis Data Analytics.

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: MSK multi-broker, Redis cluster. DR: Cross-region Kafka mirroring. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Twitter Trending Topics system architecture.

Components: Stream Processor (Flink), Kafka (tweet stream), Count-Min Sketch, Redis (counters), Time-Decay Service, API Gateway, Cache, Geographic Segmentation.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, Pub/Sub (tweet stream), Dataflow (stream processing — Apache Beam), Memorystore Redis (counters), Bigtable (trend history), Cloud SQL (metadata), Cloud Functions (time-decay), Cloud Endpoints (API), Cloud Monitoring, BigQuery (trend analytics).

Deploy multi-zone. Autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Multi-zone Dataflow, Redis HA. DR: Multi-region Pub/Sub. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Twitter Trending Topics system architecture.

Components: Stream Processor (Flink), Kafka, Count-Min Sketch, Redis (counters), Time-Decay Service, API Gateway, Cache, Geographic Segmentation.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, Event Hubs (tweet stream), Azure Stream Analytics (processing), Azure Cache for Redis (counters), Cosmos DB (trend history), Azure SQL (metadata), Azure Functions (time-decay), API Management, Azure Monitor.

Deploy Availability Zones. Autoscaling, WAF, VNet. HA: Event Hubs partitions, Redis cluster. DR: Paired region. Show data flow arrows with labels.
```

---

## 13. typeahead

Save to: `apps/frontend/public/diagrams/typeahead/`

**AWS Prompt:**
```
Design a production-grade Typeahead/Autocomplete system architecture.

Components: Trie Service (in-memory prefix tree — O(p) lookup where p = prefix length), Data Collection Pipeline (search logs, click-through data), Aggregator (MapReduce — compute top suggestions weekly), Cache (Redis — top results per prefix, 2-3 char prefixes), Load Balancer, CDN (static top-1000 suggestions), Zookeeper (shard coordination — partition trie by prefix range).

Use AWS cloud services: Route 53, CloudFront CDN (popular prefix caching), ALB, EC2 instances (Trie servers — r6g.xlarge high-memory), ElastiCache Redis (prefix → top-10 results cache), EMR (MapReduce aggregation of search logs), S3 (search log storage), DynamoDB (suggestion metadata), Kinesis (real-time search log streaming), Lambda (cache warming), ZooKeeper on EC2 (shard management).

Deploy Multi-AZ. Auto Scaling, CloudWatch, VPC. HA: Trie replicas per AZ, Redis cluster. DR: S3 cross-region, trie rebuild from logs. Show data flow arrows with labels. Show p50 < 50ms latency requirement.
```

**GCP Prompt:**
```
Design a production-grade Typeahead/Autocomplete system architecture.

Components: Trie Service (in-memory prefix tree), Data Collection Pipeline, Aggregator (MapReduce), Cache (Redis), Load Balancer, CDN, Zookeeper (shard coordination).

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GCE (Trie servers — high-memory), Memorystore Redis (prefix cache), Dataproc (MapReduce aggregation), Cloud Storage (search logs), Firestore (suggestions), Pub/Sub (search log streaming), Cloud Functions (cache warming).

Deploy multi-zone. Autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Trie replicas, Redis HA. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Typeahead/Autocomplete system architecture.

Components: Trie Service (in-memory), Data Collection Pipeline, Aggregator (MapReduce), Cache (Redis), Load Balancer, CDN, Shard coordination.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, VMs (Trie servers — high-memory), Azure Cache for Redis (prefix cache), HDInsight (MapReduce), Blob Storage (search logs), Cosmos DB (suggestions), Event Hubs (log streaming), Azure Functions (cache warming).

Deploy Availability Zones. Autoscaling, WAF, VNet. HA: Trie replicas, Redis clustering. DR: Paired region. Show data flow arrows with labels.
```

---

## 14. web-crawler

Save to: `apps/frontend/public/diagrams/web-crawler/`

**AWS Prompt:**
```
Design a production-grade Web Crawler system architecture.

Components: URL Frontier (priority queue — BFS/DFS with politeness constraints), DNS Resolver (caching — avoid redundant lookups), Fetcher (distributed HTTP workers — respect robots.txt), Parser (HTML extraction, link discovery), Content Store (dedup using SimHash/MinHash), URL Filter (Bloom filter — 10B URLs, <1% false positive), Politeness Module (per-domain rate limiting, robots.txt cache), Distributed Queue (Kafka — URL distribution).

Use AWS cloud services: Route 53 (DNS caching), SQS/MSK Kafka (URL frontier queue), EC2 Auto Scaling (fetcher workers — c6g instances), ElastiCache Redis (DNS cache, robots.txt cache, Bloom filter), S3 (crawled page storage, WARC format), DynamoDB (URL metadata, crawl state), EMR (SimHash dedup processing), Lambda (HTML parsing), RDS Aurora (URL registry), CloudWatch (crawl rate monitoring).

Deploy Multi-AZ. Auto Scaling (scale fetchers by queue depth), CloudWatch, VPC. HA: Multi-AZ fetchers, SQS redundancy. DR: S3 cross-region. Show data flow arrows with labels. Show crawl rate: 1000 pages/second target.
```

**GCP Prompt:**
```
Design a production-grade Web Crawler system architecture.

Components: URL Frontier (priority queue), DNS Resolver (caching), Fetcher (distributed), Parser, Content Store (SimHash dedup), URL Filter (Bloom filter), Politeness Module, Distributed Queue (Kafka).

Use Google Cloud services: Cloud DNS, Pub/Sub (URL frontier), GCE Auto Scaling (fetcher workers), Memorystore Redis (DNS cache, Bloom filter), Cloud Storage (WARC pages), Bigtable (URL metadata), Dataproc (dedup processing), Cloud Functions (parsing), Cloud SQL (URL registry), Cloud Monitoring.

Deploy multi-zone. Autoscaling, Cloud Monitoring, VPC. HA: Multi-zone fetchers. DR: Multi-region storage. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Web Crawler system architecture.

Components: URL Frontier, DNS Resolver, Fetcher (distributed), Parser, Content Store (SimHash dedup), URL Filter (Bloom filter), Politeness Module, Distributed Queue.

Use Azure cloud services: Azure DNS, Service Bus (URL frontier), VMSS (fetcher workers), Azure Cache for Redis (DNS cache, Bloom filter), Blob Storage (WARC pages), Cosmos DB (URL metadata), HDInsight (dedup), Azure Functions (parsing), Azure SQL (URL registry), Azure Monitor.

Deploy Availability Zones. VMSS autoscaling, WAF, VNet. HA: Multi-zone fetchers. DR: Geo-redundant storage. Show data flow arrows with labels.
```

---

## 15. key-value-store

Save to: `apps/frontend/public/diagrams/key-value-store/`

**AWS Prompt:**
```
Design a production-grade Distributed Key-Value Store system architecture.

Components: Storage Nodes (LSM Tree: MemTable → SSTable with compaction), Consistent Hashing Ring (virtual nodes — minimize data movement on scale), Replication Manager (quorum reads W+R>N, configurable consistency), Gossip Protocol (membership, failure detection — phi accrual), Bloom Filters (avoid unnecessary disk reads), Write-Ahead Log (durability before MemTable), Coordinator Node (routes requests to correct partition), Compaction Service (merge SSTables, reclaim tombstones), Anti-entropy (Merkle trees — detect replica drift).

Use AWS cloud services: Route 53, NLB (low-latency), EC2 i3 instances (NVMe SSDs — storage nodes), ElastiCache Redis (request routing cache), EBS gp3 (WAL storage), S3 (SSTable backup, cold storage tier), CloudWatch (gossip health, compaction lag), VPC (internal only), Auto Scaling (add storage nodes), DynamoDB-style architecture (partition + sort key).

Deploy Multi-AZ (3 AZs = replication factor 3). HA: Quorum writes across AZs, hinted handoff. DR: S3 cross-region SSTable backup. Show data flow arrows with labels. Show read/write path through coordinator.
```

**GCP Prompt:**
```
Design a production-grade Distributed Key-Value Store system architecture.

Components: Storage Nodes (LSM Tree), Consistent Hashing Ring, Replication Manager (quorum), Gossip Protocol, Bloom Filters, Write-Ahead Log, Coordinator Node, Compaction Service, Anti-entropy (Merkle trees).

Use Google Cloud services: Cloud DNS, Cloud Load Balancing (internal), GCE Local SSD instances (storage nodes), Memorystore Redis (routing cache), Persistent Disk (WAL), Cloud Storage (SSTable backup), Cloud Monitoring (health), VPC (internal), Managed Instance Groups.

Deploy multi-zone (3 zones = RF 3). HA: Quorum across zones, hinted handoff. DR: Multi-region backup. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Distributed Key-Value Store system architecture.

Components: Storage Nodes (LSM Tree), Consistent Hashing Ring, Replication Manager (quorum), Gossip Protocol, Bloom Filters, WAL, Coordinator Node, Compaction Service, Anti-entropy.

Use Azure cloud services: Azure DNS, Azure Load Balancer (internal), VMs with local NVMe (storage nodes), Azure Cache for Redis (routing), Managed Disks (WAL), Blob Storage (SSTable backup), Azure Monitor (health), VNet (internal), VMSS.

Deploy Availability Zones (3 = RF 3). HA: Quorum across zones. DR: Geo-redundant backup. Show data flow arrows with labels.
```

---

## 16. pastebin

Save to: `apps/frontend/public/diagrams/pastebin/`

**AWS Prompt:**
```
Design a production-grade Pastebin Text Sharing system architecture.

Components: Web Servers (paste CRUD), Object Storage (paste content — text blobs), Database (paste metadata — title, expiry, visibility, short URL), CDN (popular pastes), Cache (Redis — hot/recent pastes), Load Balancer, Key Generation Service (pre-generate unique short IDs), Expiration/Cleanup Worker (TTL-based deletion of expired pastes).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS Fargate (web servers), ElastiCache Redis (hot paste cache), RDS Aurora PostgreSQL (paste metadata), S3 (paste content — lifecycle rules for expiry), Lambda (cleanup worker — scheduled), DynamoDB (key pool — pre-generated IDs), CloudWatch (metrics), API Gateway (public API), WAF.

Deploy Multi-AZ. Auto Scaling, CloudWatch, VPC. HA: Aurora multi-AZ, S3 11 nines durability. DR: S3 cross-region. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Pastebin Text Sharing system architecture.

Components: Web Servers, Object Storage, Database (metadata), CDN, Cache (Redis), Load Balancer, Key Generation Service, Expiration/Cleanup Worker.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, Cloud Run (web servers), Memorystore Redis (cache), Cloud SQL PostgreSQL (metadata), Cloud Storage (paste content — lifecycle), Cloud Scheduler + Cloud Functions (cleanup), Firestore (key pool), Cloud Monitoring, Cloud Endpoints.

Deploy multi-zone. Autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: Multi-region storage. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Pastebin Text Sharing system architecture.

Components: Web Servers, Object Storage, Database (metadata), CDN, Cache (Redis), Load Balancer, Key Generation Service, Expiration/Cleanup Worker.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, App Service (web servers), Azure Cache for Redis, Azure SQL PostgreSQL (metadata), Blob Storage (paste content — lifecycle), Azure Functions + Timer trigger (cleanup), Cosmos DB (key pool), Azure Monitor.

Deploy Availability Zones. Autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Geo-redundant storage. Show data flow arrows with labels.
```

---

## 17. news-aggregator

Save to: `apps/frontend/public/diagrams/news-aggregator/`

**AWS Prompt:**
```
Design a production-grade News Aggregator (Google News) system architecture.

Components: Crawler Service (RSS/API feeds, web scraping), NLP Pipeline (entity extraction, summarization, deduplication — same story from multiple sources), Categorizer (ML topic classification), Ranking Service (freshness + relevance + personalization), User Service (reading history, preferences), Search (Elasticsearch — full-text article search), CDN (article thumbnails), Cache (trending articles), Trending Detection (real-time breaking news).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices, ElastiCache Redis (trending cache, user preferences), Amazon OpenSearch (article search), RDS Aurora PostgreSQL (articles, users), DynamoDB (reading history), S3 (article images, crawled data), Amazon Comprehend (NLP), SageMaker (categorization, ranking ML), MSK Kafka (article pipeline), Lambda (RSS polling), EventBridge (scheduled crawls).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, OpenSearch multi-AZ. DR: Aurora global. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade News Aggregator (Google News) system architecture.

Components: Crawler Service, NLP Pipeline (entity extraction, dedup), Categorizer (ML), Ranking Service, User Service, Search, CDN, Cache, Trending Detection.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, Memorystore Redis (cache), Elasticsearch on GKE (search), Cloud SQL PostgreSQL (articles, users), Firestore (reading history), Cloud Storage (images), Cloud Natural Language (NLP), Vertex AI (categorization, ranking), Pub/Sub (article pipeline), Cloud Functions (RSS polling), Cloud Scheduler.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade News Aggregator (Google News) system architecture.

Components: Crawler Service, NLP Pipeline, Categorizer (ML), Ranking Service, User Service, Search, CDN, Cache, Trending Detection.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis, Cognitive Search (articles), Azure SQL PostgreSQL (articles, users), Cosmos DB (reading history), Blob Storage (images), Azure AI Language (NLP), Azure ML (ranking), Event Hubs (pipeline), Azure Functions (RSS polling), Logic Apps (scheduled crawls), Azure Monitor.

Deploy Availability Zones. AKS autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Paired region. Show data flow arrows with labels.
```

---

## 18. leaderboard

Save to: `apps/frontend/public/diagrams/leaderboard/`

**AWS Prompt:**
```
Design a production-grade Real-time Leaderboard system architecture.

Components: Score Service (submit/update scores), Redis Sorted Sets (ZADD/ZRANGE — O(log N) rank lookup), Database (score persistence, historical data), WebSocket Gateway (live leaderboard updates — push to connected clients), Cache (precomputed top-N per region), API Gateway (REST + WebSocket), Sharding (partition by game/region for horizontal scale).

Use AWS cloud services: Route 53, CloudFront, ALB + API Gateway (WebSocket), ECS/EKS microservices, ElastiCache Redis cluster (sorted sets — sharded by game), RDS Aurora PostgreSQL (historical scores, user profiles), DynamoDB (real-time score events), Lambda (leaderboard aggregation), API Gateway WebSocket API (live updates), CloudWatch (latency monitoring), SNS (score notifications).

Deploy Multi-AZ. Auto Scaling, CloudWatch, VPC. HA: Redis cluster multi-AZ, Aurora multi-AZ. DR: Redis snapshot to S3, Aurora global. Show data flow arrows with labels.
```

**GCP Prompt:**
```
Design a production-grade Real-time Leaderboard system architecture.

Components: Score Service, Redis Sorted Sets (ZADD/ZRANGE), Database (persistence), WebSocket Gateway (live updates), Cache, API Gateway, Sharding (by game/region).

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, Memorystore Redis (sorted sets), Cloud SQL PostgreSQL (historical), Firestore (score events), Cloud Functions (aggregation), Cloud Endpoints (WebSocket), Cloud Monitoring.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, VPC. HA: Redis HA, Cloud SQL HA. DR: Multi-region. Show data flow arrows with labels.
```

**Azure Prompt:**
```
Design a production-grade Real-time Leaderboard system architecture.

Components: Score Service, Redis Sorted Sets, Database, WebSocket Gateway (live updates), Cache, API Gateway, Sharding.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure Cache for Redis (sorted sets), Azure SQL PostgreSQL (historical), Cosmos DB (score events), Azure Functions (aggregation), Azure SignalR (WebSocket), Azure Monitor.

Deploy Availability Zones. AKS autoscaling, WAF, VNet. HA: Redis clustering, SQL geo-replication. DR: Paired region. Show data flow arrows with labels.
```

---

## Remaining problems (19-53) — Infrastructure & Extras

For the remaining problems, use this template pattern. Replace `{TITLE}`, `{COMPONENTS}`, and the cloud-specific services:

### 19. slack
Save to: `apps/frontend/public/diagrams/slack/`
```
Design a production-grade Slack Team Communication system architecture.
Components: WebSocket Gateway (per-workspace persistent connections), Kafka (message bus — ordered per channel), Cassandra (message store — partitioned by channel), Elasticsearch (message search across workspace), Redis (presence tracking + pub/sub for typing indicators), Object Storage S3 (file uploads), Channel Service (public/private/DM), Thread Service (threaded replies), Notification Service (push/email/badge counts).
{USE_CLOUD_SERVICES}
Deploy {MULTI_AZ}. Show HA, DR, autoscaling, monitoring. Show data flow arrows with labels.
```

### 20. tiktok
Save to: `apps/frontend/public/diagrams/tiktok/`
```
Design a production-grade TikTok Short Video Platform architecture.
Components: CDN (multi-tier global — edge + regional + origin), Blob Storage (raw + transcoded videos), Kafka (upload events, engagement events), GPU Transcoding Farm (multiple resolutions + codecs), ML Recommendation Service (For You Page — real-time engagement signals), Vitess/sharded MySQL (user data, video metadata), Redis (cache — hot videos, user sessions), Vector DB (video embeddings for similarity), Content Moderation (ML — NSFW, violence, copyright), Creator Analytics Dashboard.
{USE_CLOUD_SERVICES}
```

### 21. reddit
Save to: `apps/frontend/public/diagrams/reddit/`
```
Design a production-grade Reddit Social News Platform architecture.
Components: PostgreSQL with ltree (threaded comment trees), Redis sorted sets (hot/top/new/rising rankings with time-decay), Kafka (vote events, post events), Ranking Worker (Wilson score interval for confidence-based ranking), CDN (static assets, thumbnails), Elasticsearch (subreddit + post search), Vote Service (optimistic counting with anti-cheat), Comment Service (recursive tree rendering), Subreddit Service (community management), Moderation Queue (AutoMod rules + ML spam detection).
{USE_CLOUD_SERVICES}
```

### 22. twitch
Save to: `apps/frontend/public/diagrams/twitch/`
```
Design a production-grade Twitch Live Streaming Platform architecture.
Components: RTMP Ingest PoPs (global — streamers push to nearest), GPU Transcoding Farm (adaptive bitrate — 160p to 1080p60), CDN multi-tier (edge PoPs + origin shield + origin), WebSocket Gateway Cluster (chat — millions concurrent per popular stream), Redis Pub/Sub (chat message fan-out to all viewers), Cassandra (chat history — partitioned by channel + time), PostgreSQL (stream metadata, user profiles, subscriptions), S3/Object Storage (VOD recordings, clips), Subscription/Bits Service (monetization), Channel Points/Predictions.
{USE_CLOUD_SERVICES}
```

### 23. gmail
Save to: `apps/frontend/public/diagrams/gmail/`
```
Design a production-grade Gmail Email Service architecture.
Components: MX Servers (SMTP inbound — receive from internet), Kafka (mail processing pipeline — spam check, virus scan, categorize), Spam Pipeline (ML classifier + SpamAssassin rules + reputation scoring), Bigtable (mail store — row per user, column per message), Blob Storage GCS (large attachments), Elasticsearch (full-text mail search with filters), Redis (session cache, IMAP state), Push Notification (new mail alerts — APNs/FCM), IMAP/POP3 Gateway (third-party client access), SMTP Outbound (sending — SPF/DKIM/DMARC).
{USE_CLOUD_SERVICES}
```

### 24. google-drive
Save to: `apps/frontend/public/diagrams/google-drive/`
```
Design a production-grade Google Drive Cloud Storage & Sync architecture.
Components: Sync Service (delta sync — only changed blocks, conflict resolution with last-write-wins or manual merge), Content-Addressable Blob Storage (dedup by content hash), Metadata DB Spanner (file tree, permissions, sharing — globally consistent), Redis (cache + pub/sub for real-time change notifications), CDN (preview thumbnails, public file sharing), Elasticsearch (file name + content search), Change Log (event sourcing — ordered list of all file operations), Sharing/Permissions Service (ACL with inheritance).
{USE_CLOUD_SERVICES}
```

### 25. shopify
Save to: `apps/frontend/public/diagrams/shopify/`
```
Design a production-grade Shopify E-commerce Platform architecture.
Components: Pod-based infrastructure (tenant isolation — each merchant gets isolated compute/data), Vitess sharded MySQL (product catalog, orders — sharded by merchant), Redis (shopping carts, inventory counters — atomic decrement), CDN (storefront assets — Shopify Edge), Payment Gateway (multi-provider — Stripe, PayPal), Kafka (order events, webhook delivery), S3 (product images, theme assets), Webhook Service (notify merchants of events), Liquid Template Engine (storefront rendering), App/API Platform (third-party integrations).
{USE_CLOUD_SERVICES}
```

### 26. flash-sale
Save to: `apps/frontend/public/diagrams/flash-sale/`
```
Design a production-grade Flash Sale System architecture.
Components: Virtual Queue Service (FIFO with position tracking — prevent thundering herd), Inventory Lock Redis (atomic DECR — prevent overselling), Order Service (state machine), Payment Service (timeout-based release if unpaid), Rate Limiter (DDoS protection — token bucket), CDN (static product page), Database PostgreSQL (order persistence), Notification Service (confirmation), Anti-bot/CAPTCHA (proof of humanity), Circuit Breaker (graceful degradation under load).
{USE_CLOUD_SERVICES}
```

### 27. stock-exchange
Save to: `apps/frontend/public/diagrams/stock-exchange/`
```
Design a production-grade Stock Exchange Trading System architecture.
Components: Order Matching Engine (price-time priority — continuous double auction), Order Book (in-memory — bid/ask sorted by price), Market Data Feed (multicast/UDP — real-time quotes to all subscribers), Risk Engine (pre-trade checks — margin, position limits, circuit breakers), Settlement Service (T+1 clearing), FIX Gateway (Financial Information eXchange protocol — broker connectivity), Time-Series DB (tick data, OHLCV candles), Kafka (trade events — audit trail), Sequencer (total ordering — deterministic replay).
{USE_CLOUD_SERVICES}
```

### 28. distributed-cache
Save to: `apps/frontend/public/diagrams/distributed-cache/`
```
Design a production-grade Distributed Cache System architecture.
Components: Cache Nodes (in-memory hash table — O(1) get/set), Consistent Hashing Ring (virtual nodes — minimize redistribution on scale), Replication (primary-replica — async for speed, sync option for consistency), Eviction Policy (LRU/LFU — configurable per cache), Gossip Protocol (membership detection — phi accrual failure detector), Client Library (smart routing — hash key to correct node), Monitoring (hit rate, eviction rate, memory usage, latency p99), Hot Key Detection (split hot keys across replicas).
{USE_CLOUD_SERVICES}
```

### 29. distributed-lock
Save to: `apps/frontend/public/diagrams/distributed-lock/`
```
Design a production-grade Distributed Lock Service architecture.
Components: Lock Manager (acquire/release/extend with TTL), ZooKeeper or etcd (consensus-based — Paxos/Raft), Fencing Tokens (monotonically increasing — prevent stale lock holders from corrupting data), Heartbeat Service (lease renewal — auto-extend while holder alive), Client SDK (retry with exponential backoff, auto-release on crash), Monitoring (lock contention metrics, wait time p99, deadlock detection), Dead Lock Detection (wait-for graph analysis).
{USE_CLOUD_SERVICES}
```

### 30. distributed-search
Save to: `apps/frontend/public/diagrams/distributed-search/`
```
Design a production-grade Distributed Search Engine architecture.
Components: Index Shards (inverted index — partitioned by document hash or term range), Query Coordinator (scatter-gather — fan out to all shards, merge results), Crawler (URL frontier with BFS, politeness), Indexer Pipeline (MapReduce — tokenize, stem, build inverted index), Ranking Service (BM25 baseline + ML re-ranking — LambdaMART), Cache (query result cache — LRU, invalidate on index update), Load Balancer (route queries to coordinator replicas), Spell Correction (edit distance, n-gram suggestions).
{USE_CLOUD_SERVICES}
```

### 31. distributed-task-scheduler
Save to: `apps/frontend/public/diagrams/distributed-task-scheduler/`
```
Design a production-grade Distributed Task Scheduler architecture.
Components: Scheduler Service (cron + one-time + delayed tasks), Task Queue Kafka (partitioned by priority — high/medium/low), Worker Pool (auto-scaling by queue depth — heterogeneous CPU/GPU), ZooKeeper (leader election for scheduler HA), Database PostgreSQL (task state — pending/running/completed/failed), Monitoring Prometheus (SLA tracking, task latency), Dead Letter Queue (failed tasks after max retries), Retry/Backoff Engine (exponential backoff with jitter).
{USE_CLOUD_SERVICES}
```

### 32. api-gateway
Save to: `apps/frontend/public/diagrams/api-gateway/`
```
Design a production-grade API Gateway architecture.
Components: Gateway Service (request routing — path-based and header-based), Rate Limiter (token bucket per API key/IP), Auth Service (JWT validation, OAuth2 token introspection), Service Registry Consul (dynamic service discovery — health check based), Load Balancer (weighted round-robin to upstream services), Cache (response cache — TTL per route), Logging/Metrics (ELK stack + Prometheus — request logs, latency histograms), Circuit Breaker (half-open/open/closed — prevent cascade failures), Request Transformation (header injection, body mapping).
{USE_CLOUD_SERVICES}
```

### 33. blob-store
Save to: `apps/frontend/public/diagrams/blob-store/`
```
Design a production-grade Blob Storage System (S3-compatible) architecture.
Components: API Gateway (S3-compatible REST — PUT/GET/DELETE/LIST), Metadata Service PostgreSQL (object metadata — bucket, key, size, ACL, versioning), Data Nodes (erasure-coded chunks — 6+3 encoding for 1.5x storage overhead vs 3x replication), Replication Manager (cross-region async replication), Garbage Collector (mark-sweep for deleted/overwritten objects), CDN (presigned URL support for direct edge delivery), Consistent Hashing (map objects to data node groups), Versioning Service (keep all object versions, lifecycle rules for expiry).
{USE_CLOUD_SERVICES}
```

### 34. cdn
Save to: `apps/frontend/public/diagrams/cdn/`
```
Design a production-grade Content Delivery Network architecture.
Components: Edge PoPs (300+ global locations — cache static + dynamic content), Origin Shield (mid-tier cache — reduce origin load by 90%), Origin Server (source of truth — web server or object storage), DNS GeoDNS (latency-based routing — direct users to nearest PoP), Cache Invalidation (tag-based purge — instant global propagation), TLS Termination (edge SSL — reduce latency by terminating close to user), Load Balancer (distribute within PoP), Monitoring (real-time analytics — cache hit ratio, bandwidth, errors), DDoS Mitigation (L3/L4/L7 — rate limiting, IP reputation, challenge pages).
{USE_CLOUD_SERVICES}
```

### 35. ci-cd-pipeline
Save to: `apps/frontend/public/diagrams/ci-cd-pipeline/`
```
Design a production-grade CI/CD Pipeline System architecture.
Components: Source Control Git (webhook on push/PR — trigger pipeline), Build Agents (containerized — ephemeral, parallel builds), Artifact Registry (Docker images, npm packages — versioned + signed), Test Runners (parallel unit/integration/e2e — matrix strategy), Deployment Service (blue-green + canary + rolling strategies), Queue Kafka (build events — decouple trigger from execution), Database (pipeline state — run history, logs), Notification Service (Slack/email on success/failure), Secret Manager (inject credentials at build time — never in code).
{USE_CLOUD_SERVICES}
```

### 36. chatgpt-llm-system
Save to: `apps/frontend/public/diagrams/chatgpt-llm-system/`
```
Design a production-grade ChatGPT/LLM Serving System architecture.
Components: API Gateway (streaming SSE — token-by-token response), Load Balancer (GPU-aware — route to available GPU nodes), GPU Inference Cluster (A100/H100 — tensor parallelism across GPUs), Model Registry (versioned model weights — A/B test different models), Token Queue (request scheduling — FIFO with priority, batch similar-length requests), KV Cache (attention key-value cache — avoid recomputation for long contexts), Object Storage (model artifacts — 100GB+ checkpoints), Monitoring (tokens/sec, time-to-first-token, GPU utilization), Rate Limiter (per-user token budgets), Safety/Content Filter (input/output moderation — classifier + rules).
{USE_CLOUD_SERVICES}
```

### 37. calendar-system
Save to: `apps/frontend/public/diagrams/calendar-system/`
```
Design a production-grade Calendar System (Google Calendar) architecture.
Components: Calendar Service (CRUD calendars, sharing), Event Service (create/update/delete events — single + recurring), Notification Service (email reminders, push alerts — 15min/1hr/1day before), Recurring Event Engine (RRULE expansion — generate instances on-the-fly, handle exceptions), Timezone Service (IANA timezone database — convert between zones), Database PostgreSQL (events, calendars, attendees), Cache Redis (user's upcoming events, free/busy), Push Service (APNs/FCM for mobile), Free/Busy Lookup (aggregate across calendars — for scheduling), CalDAV Sync (standard protocol for third-party clients).
{USE_CLOUD_SERVICES}
```

### 38. deployment-system
Save to: `apps/frontend/public/diagrams/deployment-system/`
```
Design a production-grade Deployment System (Kubernetes-like) architecture.
Components: API Server (REST — all cluster operations go through here), Scheduler (bin-packing — assign pods to nodes by resource requests), Controller Manager (reconciliation loops — desired state vs actual state), etcd (distributed state store — Raft consensus, all cluster state), Kubelet (node agent — manage containers on each node), Container Runtime containerd (pull images, run containers, manage lifecycle), Service Mesh Istio/Envoy (mTLS, traffic splitting, observability between services), Ingress Controller (L7 routing — path/host-based to services), HPA (horizontal pod autoscaler — scale by CPU/memory/custom metrics).
{USE_CLOUD_SERVICES}
```

### 39. digital-wallet
Save to: `apps/frontend/public/diagrams/digital-wallet/`
```
Design a production-grade Digital Wallet (Apple Pay/Venmo) architecture.
Components: Wallet Service (balance management — load/withdraw/transfer), Transaction Service (ACID transfers — debit sender + credit receiver atomically), Ledger (double-entry immutable — every transaction = debit + credit entry), Fraud Detection ML (real-time scoring — velocity checks, device fingerprint, geo anomaly), KYC Service (identity verification — document upload, face match, watchlist screening), Payment Rail Integration (ACH bank transfers, Visa Direct, wire), Notification Service (transaction alerts — push + SMS + email), HSM (tokenization — encrypt card numbers, generate payment tokens), Compliance/AML (anti-money laundering — pattern detection, SAR filing).
{USE_CLOUD_SERVICES}
```

### 40. job-scheduler
Save to: `apps/frontend/public/diagrams/job-scheduler/`
```
Design a production-grade Job Scheduler System architecture.
Components: Scheduler Service (priority-based — earliest-deadline-first), Job Queue (partitioned by priority — separate high/medium/low lanes), Worker Pool (heterogeneous — CPU workers vs GPU workers, auto-scale), Cron Engine (time-trigger — cron expression parsing, next-fire-time calculation), Database (job state/history — PostgreSQL with state machine), Monitoring (SLA tracking — alert on missed deadlines), Dead Letter Queue (failed jobs after N retries — manual review), API Gateway (submit/cancel/query jobs), Dependency Graph Resolver (DAG execution — topological sort, parallel independent tasks).
{USE_CLOUD_SERVICES}
```

### 41. object-storage
Save to: `apps/frontend/public/diagrams/object-storage/`
```
Design a production-grade Object Storage System architecture.
Components: API Gateway (S3-compatible REST API — presigned URLs), Metadata Service (sharded PostgreSQL — bucket/key lookup, ACLs), Data Nodes (erasure coding 6+3 — Reed-Solomon, 12 data nodes per group), Replication (cross-datacenter async — RPO < 1 min), Garbage Collector (mark-sweep — reclaim space from deleted/overwritten), Monitoring (capacity planning — growth projection, disk health), Lifecycle Manager (storage tiering — hot/warm/cold/archive based on access patterns).
{USE_CLOUD_SERVICES}
```

### 42. online-chess
Save to: `apps/frontend/public/diagrams/online-chess/`
```
Design a production-grade Online Chess (Chess.com) system architecture.
Components: Game Service (state machine — waiting/playing/ended, FEN board representation), WebSocket Gateway (real-time moves — sub-100ms latency), Matchmaking Service (ELO-based — pair players within rating range, expand over time), Rating Engine Glicko-2 (update ratings after each game — accounts for rating uncertainty), Move Validator (legal move checking — verify against chess rules + clock), Database (game history — PGN notation, player profiles), Redis (active games cache — board state, clock), Spectator Service (fan-out live moves to viewers), Puzzle/Analysis Engine (Stockfish — post-game analysis, daily puzzles).
{USE_CLOUD_SERVICES}
```

### 43. recommendation-engine
Save to: `apps/frontend/public/diagrams/recommendation-engine/`
```
Design a production-grade Recommendation Engine system architecture.
Components: Feature Store (online low-latency + offline batch features — user history, item attributes), ML Training Pipeline (batch on Spark — collaborative filtering, deep learning embeddings), Model Serving (low-latency inference — <50ms p99, model versioning), User Activity Collector (clickstream — views, clicks, purchases, dwell time), Kafka (event ingestion — real-time user signals), Vector DB (ANN search — find similar items/users by embedding distance), A/B Testing Framework (experiment assignment, metric tracking, statistical significance), Cache (precomputed recommendations for cold-start + popular), Cold-Start Handler (content-based for new users, popularity-based for new items).
{USE_CLOUD_SERVICES}
```

### 44. time-series-db
Save to: `apps/frontend/public/diagrams/time-series-db/`
```
Design a production-grade Time-Series Database system architecture.
Components: Write-Ahead Log (durability — fsync before acknowledging write), LSM Tree / Columnar Store (optimized for time-range scans — sorted by timestamp), Compaction Service (size-tiered — merge small SSTables into larger ones, remove tombstones), Query Engine (time-range + aggregation — downsampling, GROUP BY time window), Retention Manager (TTL + downsampling — raw data 30d, 1-min aggregates 1y, 1-hr aggregates forever), Replication (Raft consensus — 3-node quorum writes), API Gateway (PromQL/InfluxQL compatible query language), Ingestion Buffer (batch writes — amortize WAL fsync overhead).
{USE_CLOUD_SERVICES}
```

### 45. metrics-monitoring
Save to: `apps/frontend/public/diagrams/metrics-monitoring/`
```
Design a production-grade Metrics Monitoring System (Datadog-like) architecture.
Components: Agent Collector (host/container agent — collect CPU, memory, disk, network, custom metrics), Ingestion Pipeline Kafka (time-series data stream — partitioned by metric name), Time-Series DB InfluxDB/Prometheus (optimized columnar storage), Query Engine PromQL (aggregation, rate, percentiles), Alerting Service (threshold + anomaly-based — PagerDuty/Slack integration), Dashboard API Grafana (visualization — graphs, heatmaps, tables), Object Storage (long-term metric archive — downsample to 1hr granularity), Anomaly Detection ML (statistical + ML-based — detect unusual patterns).
{USE_CLOUD_SERVICES}
```

### 46. ad-click-aggregation
Save to: `apps/frontend/public/diagrams/ad-click-aggregation/`
```
Design a production-grade Ad Click Aggregation System architecture.
Components: Click Ingestion Service (high-throughput — 100K clicks/sec), Stream Processor Flink/Spark Streaming (windowed aggregation — 1min/5min/1hr tumbling windows), Kafka (click event stream — partitioned by advertiser_id), Time-Series DB ClickHouse (pre-aggregated metrics — fast OLAP queries), Aggregation Service (rollup — campaign/ad_group/creative level), Dashboard API (real-time + historical reports), Cache (recent aggregates for dashboard), Fraud Detection (click fraud — bot detection, click injection, attribution fraud).
{USE_CLOUD_SERVICES}
```

---

## Duplicate problems (47-53)

These share content with other problems. You can copy diagrams from the matching problem:

| Problem ID | Copy from |
|---|---|
| `autocomplete-system` | `typeahead` |
| `ecommerce-platform` | `amazon` |
| `messaging-app` | `whatsapp` |
| `payment-gateway` | `payment-system` |
| `proximity-service` | `yelp` |
| `tiny-url` | `url-shortener` |
| `top-k-leaderboard` | `leaderboard` |

For each, create the directory and copy the 3 PNGs:
```bash
# Example for all duplicates:
for pair in "autocomplete-system:typeahead" "ecommerce-platform:amazon" "messaging-app:whatsapp" "payment-gateway:payment-system" "proximity-service:yelp" "tiny-url:url-shortener" "top-k-leaderboard:leaderboard"; do
  target="${pair%%:*}"
  source="${pair##*:}"
  mkdir -p apps/frontend/public/diagrams/$target
  cp apps/frontend/public/diagrams/$source/eraser-*.png apps/frontend/public/diagrams/$target/
done
```

---

## Cloud service substitution reference

When the prompt says `{USE_CLOUD_SERVICES}`, replace with one of:

**AWS:**
```
Use AWS cloud services: Route 53 DNS, CloudFront CDN, ALB load balancer, ECS/EKS for compute, ElastiCache Redis, RDS Aurora PostgreSQL, DynamoDB, S3 storage, MSK Kafka, Lambda serverless, SageMaker ML, API Gateway, SQS/SNS messaging, CloudWatch monitoring, WAF security. Deploy Multi-AZ (us-east-1a, 1b, 1c). Include Auto Scaling, VPC with public/private subnets, NAT Gateway. Show HA with cross-AZ replication, DR with cross-region failover. Show data flow arrows with labels.
```

**GCP:**
```
Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE for compute, Memorystore Redis, Cloud SQL PostgreSQL, Firestore/Bigtable, Cloud Storage, Pub/Sub messaging, Cloud Functions serverless, Vertex AI ML, Cloud Endpoints, Cloud Monitoring, Cloud Armor. Deploy multi-zone (us-central1-a, b, c). Include GKE autoscaling, VPC. Show HA with multi-zone, DR with multi-region failover. Show data flow arrows with labels.
```

**Azure:**
```
Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS for compute, Azure Cache for Redis, Azure SQL PostgreSQL, Cosmos DB, Blob Storage, Event Hubs/Service Bus messaging, Azure Functions serverless, Azure ML, API Management, Azure Monitor, WAF. Deploy Availability Zones 1, 2, 3. Include AKS autoscaling, VNet. Show HA with zone redundancy, DR with paired region failover. Show data flow arrows with labels.
```
