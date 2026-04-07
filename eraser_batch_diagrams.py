#!/usr/bin/env python3
"""
eraser_batch_diagrams.py
━━━━━━━━━━━━━━━━━━━━━━━
Batch-generates cloud architecture diagrams via the Eraser.io AI API,
downloads each PNG, and writes it to the correct output directory.

Usage:
    export ERASER_API_KEY="your_token_here"
    python eraser_batch_diagrams.py                      # run all
    python eraser_batch_diagrams.py --dry-run            # print plan only
    python eraser_batch_diagrams.py --filter facebook    # only IDs matching substring
    python eraser_batch_diagrams.py --output-dir /tmp/diagrams
    python eraser_batch_diagrams.py --concurrency 3      # parallel requests
    python eraser_batch_diagrams.py --skip-existing      # don't re-download done files

Requirements:
    pip install httpx rich tenacity python-dotenv
"""

import argparse
import asyncio
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.table import Table
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

load_dotenv()

# ─── Configuration ─────────────────────────────────────────────────────────────

ERASER_API_BASE    = "https://app.eraser.io"
RENDER_PROMPT_PATH = "/api/render/prompt"
DIAGRAM_TYPE       = "cloud-architecture-diagram"
THEME              = "light"
SCALE              = 2
TIMEOUT_SECONDS    = 120          # Eraser AI can be slow on complex prompts
REQUEST_DELAY_SEC  = 1.5          # polite delay between API calls per worker

console = Console()

# ─── Diagram catalogue ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class DiagramJob:
    problem_id: str
    cloud:      str   # "aws" | "gcp" | "azure"
    prompt:     str

    @property
    def filename(self) -> str:
        return f"eraser-{self.cloud}.png"

    @property
    def relative_dir(self) -> str:
        return f"apps/frontend/public/diagrams/{self.problem_id}"


# ── Prompts ─────────────────────────────────────────────────────────────────────
# Each entry: (problem_id, cloud, prompt_text)
# Truncated prompts are abbreviated with "[…]" for readability here; the real
# text is the full prompt from the specification document.

_RAW_JOBS: list[tuple[str, str, str]] = [

    # ── 1. facebook-newsfeed ──────────────────────────────────────────────────
    ("facebook-newsfeed", "aws", """\
Design a production-grade Facebook News Feed system architecture.

Components: Feed Service (ranked), Post Service, Ranking Service (ML — engagement \
prediction), Social Graph Service, Cache (Memcached/TAO), Kafka (event bus), CDN, \
Object Storage, Ads Insertion Service.

Use AWS cloud services: Route 53 for DNS, CloudFront CDN, ALB load balancer, ECS/EKS \
for microservices (Feed Service, Post Service, Ranking Service, Social Graph, Ads \
Service), ElastiCache (Memcached clusters), Amazon MSK (Kafka), RDS Aurora (social \
graph), DynamoDB (posts/feed), S3 (media storage), SageMaker (ML ranking models), \
Lambda (event processing).

Deploy across Multi-AZ (us-east-1a, us-east-1b, us-east-1c). Include Auto Scaling \
Groups, CloudWatch monitoring, WAF, VPC with public/private subnets, NAT Gateway. Show \
HA with primary-replica databases, cross-AZ replication. Include DR with cross-region \
replication to us-west-2. Show data flow arrows between all components with labels.\
"""),

    ("facebook-newsfeed", "azure", """\
Design a production-grade Facebook News Feed system architecture.

Components: Feed Service (ranked), Post Service, Ranking Service (ML — engagement \
prediction), Social Graph Service, Cache (Memcached/TAO), Kafka (event bus), CDN, \
Object Storage, Ads Insertion Service.

Use Azure cloud services: Azure DNS, Azure Front Door + CDN, Application Gateway, AKS \
for microservices (Feed Service, Post Service, Ranking Service, Social Graph, Ads \
Service), Azure Cache for Redis (feed cache), Event Hubs (streaming), Azure SQL (social \
graph), Cosmos DB (posts/feed), Blob Storage (media), Azure ML (ranking models), Azure \
Functions (event processing).

Deploy across Availability Zones 1, 2, 3. Include VMSS autoscaling, Azure Monitor, WAF, \
VNet with public/private subnets. Show HA with geo-replication, active-active databases. \
Include DR with paired region failover. Show data flow arrows between all components \
with labels.\
"""),

    # ── 2. spotify ────────────────────────────────────────────────────────────
    ("spotify", "aws", """\
Design a production-grade Spotify Music Streaming system architecture.

Components: Audio Streaming Service (adaptive bitrate), CDN (edge cache), Recommendation \
Engine (collaborative filtering + deep learning), Search Service (Elasticsearch), \
Playlist Service, User Service, Cache (Redis), Object Storage (audio files — FLAC/OGG/MP3), \
Offline Sync Service, Ads Service.

Use AWS cloud services: Route 53, CloudFront CDN (audio edge caching), ALB, ECS/EKS \
microservices, ElastiCache Redis (session + metadata cache), Amazon OpenSearch (search), \
RDS Aurora PostgreSQL (user/playlist data), DynamoDB (listening history), S3 (audio file \
storage — multiple bitrates), SageMaker (recommendation ML), MSK Kafka (event streaming), \
Lambda (offline sync triggers), Kinesis (real-time analytics).

Deploy Multi-AZ (us-east-1a, 1b, 1c). Auto Scaling Groups, CloudWatch, WAF, VPC \
private/public subnets. HA: Aurora read replicas, ElastiCache replication. DR: Cross-region \
S3 replication, Aurora global database. Show data flow arrows with labels.\
"""),

    ("spotify", "gcp", """\
Design a production-grade Spotify Music Streaming system architecture.

Components: Audio Streaming Service (adaptive bitrate), CDN (edge cache), Recommendation \
Engine (collaborative filtering + deep learning), Search Service (Elasticsearch), \
Playlist Service, User Service, Cache (Redis), Object Storage (audio files), Offline \
Sync Service, Ads Service.

Use Google Cloud services: Cloud DNS, Cloud CDN (audio caching), Cloud Load Balancing, \
GKE microservices, Memorystore Redis (cache), Elasticsearch on GKE (search), Cloud SQL \
PostgreSQL (user/playlist), Bigtable (listening history), Cloud Storage (audio files — \
multi-bitrate), Vertex AI (recommendation ML), Pub/Sub (event streaming), Cloud Functions \
(offline sync), BigQuery (analytics).

Deploy multi-zone (us-central1-a, b, c). GKE autoscaling, Cloud Monitoring, Cloud Armor, \
VPC private/public subnets. HA: Cloud SQL HA, Memorystore replicas. DR: Multi-region \
Cloud Storage, Cloud SQL cross-region replicas. Show data flow arrows with labels.\
"""),

    ("spotify", "azure", """\
Design a production-grade Spotify Music Streaming system architecture.

Components: Audio Streaming Service (adaptive bitrate), CDN (edge cache), Recommendation \
Engine (collaborative filtering + deep learning), Search Service, Playlist Service, User \
Service, Cache (Redis), Object Storage (audio files), Offline Sync Service, Ads Service.

Use Azure cloud services: Azure DNS, Azure CDN (audio caching), Application Gateway, AKS \
microservices, Azure Cache for Redis, Cognitive Search, Azure SQL PostgreSQL (user/playlist), \
Cosmos DB (listening history), Blob Storage (audio files), Azure ML (recommendations), Event \
Hubs (streaming), Azure Functions (offline sync), Azure Monitor.

Deploy across Availability Zones 1, 2, 3. AKS autoscaling, Azure Monitor, WAF, VNet. HA: \
Azure SQL geo-replication, Redis clustering. DR: Paired region failover, geo-redundant storage. \
Show data flow arrows with labels.\
"""),

    # ── 3. airbnb ─────────────────────────────────────────────────────────────
    ("airbnb", "aws", """\
Design a production-grade Airbnb Accommodation Marketplace system architecture.

Components: Search Service (geo + availability + pricing), Booking Service (distributed locks, \
double-booking prevention), Payment Service (escrow model), Messaging Service (host-guest), \
Review Service, Geospatial Index (Elasticsearch), CDN, Cache, Pricing Service (dynamic/smart \
pricing ML), Trust and Safety ML (fraud detection, ID verification).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices (Search, Booking, \
Payment, Messaging, Review, Pricing, Trust), ElastiCache Redis (availability cache, session), \
Amazon OpenSearch (geo search + full-text), RDS Aurora PostgreSQL (listings, bookings, users), \
DynamoDB (messages, reviews), S3 (listing photos), SageMaker (pricing ML, fraud detection), \
MSK Kafka (booking events), SQS (async notifications), SES (emails), Lambda (image processing).

Deploy Multi-AZ (us-east-1a, 1b, 1c). Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, \
OpenSearch multi-AZ. DR: Aurora global database, S3 cross-region replication. Show data flow \
arrows with labels.\
"""),

    ("airbnb", "gcp", """\
Design a production-grade Airbnb Accommodation Marketplace system architecture.

Components: Search Service (geo + availability + pricing), Booking Service (distributed locks), \
Payment Service (escrow), Messaging Service, Review Service, Geospatial Index, CDN, Cache, \
Pricing Service (dynamic ML), Trust and Safety ML.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, \
Memorystore Redis, Elasticsearch on GKE (geo search), Cloud SQL PostgreSQL (listings, bookings), \
Firestore (messages, reviews), Cloud Storage (photos), Vertex AI (pricing + fraud ML), Pub/Sub \
(events), Cloud Tasks (async), Cloud Functions (image resize), BigQuery (analytics).

Deploy multi-zone (us-central1-a, b, c). GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. \
HA: Cloud SQL HA, multi-zone GKE. DR: Multi-region Cloud SQL, geo-redundant storage. Show data \
flow arrows with labels.\
"""),

    ("airbnb", "azure", """\
Design a production-grade Airbnb Accommodation Marketplace system architecture.

Components: Search Service (geo + availability), Booking Service (distributed locks), Payment \
Service (escrow), Messaging Service, Review Service, Geospatial Index, CDN, Cache, Pricing \
Service (ML), Trust and Safety ML.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure \
Cache for Redis, Cognitive Search (geo), Azure SQL PostgreSQL (listings, bookings), Cosmos DB \
(messages, reviews), Blob Storage (photos), Azure ML (pricing + fraud), Event Hubs (events), \
Service Bus (async), Azure Functions (image processing), Azure Monitor.

Deploy Availability Zones 1, 2, 3. AKS autoscaling, Azure Monitor, WAF, VNet. HA: Azure SQL \
geo-replication, Cosmos DB multi-region. DR: Paired region failover. Show data flow arrows \
with labels.\
"""),

    # ── 4. doordash ───────────────────────────────────────────────────────────
    ("doordash", "aws", """\
Design a production-grade DoorDash Food Delivery system architecture.

Components: Order Service (state machine — placed/confirmed/preparing/picked-up/delivered), \
Restaurant Service (menu, availability), Delivery Matching Service (optimization — assign \
nearest Dasher), Real-time Tracking (WebSocket — live GPS), Payment Service, Kafka (order \
events), Redis (geospatial — Dasher locations), Database, ETA Prediction (ML), Dasher App \
Gateway.

Use AWS cloud services: Route 53, CloudFront, ALB + WebSocket support, ECS/EKS microservices, \
ElastiCache Redis (geospatial GEORADIUS for Dasher matching, order cache), RDS Aurora PostgreSQL \
(orders, restaurants, users), DynamoDB (Dasher locations, delivery tracking), S3 (menu images), \
MSK Kafka (order event streaming), API Gateway (WebSocket for live tracking), SageMaker (ETA \
prediction ML), SNS/SQS (notifications), Lambda (surge pricing).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, MSK multi-AZ. DR: \
Aurora global database. Show data flow arrows with labels.\
"""),

    ("doordash", "gcp", """\
Design a production-grade DoorDash Food Delivery system architecture.

Components: Order Service (state machine), Restaurant Service, Delivery Matching Service \
(optimization), Real-time Tracking (WebSocket), Payment Service, Kafka, Redis (geospatial), \
Database, ETA Prediction (ML), Dasher App Gateway.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, \
Memorystore Redis (geospatial), Cloud SQL PostgreSQL (orders, restaurants), Firestore \
(tracking, locations), Cloud Storage (images), Pub/Sub (order events), Cloud Endpoints \
(WebSocket), Vertex AI (ETA ML), Cloud Tasks (notifications), Cloud Functions (surge \
pricing), BigQuery (analytics).

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, \
multi-zone GKE. DR: Multi-region. Show data flow arrows with labels.\
"""),

    ("doordash", "azure", """\
Design a production-grade DoorDash Food Delivery system architecture.

Components: Order Service (state machine), Restaurant Service, Delivery Matching, Real-time \
Tracking (WebSocket), Payment Service, Kafka, Redis (geospatial), Database, ETA Prediction \
(ML), Dasher App.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure \
Cache for Redis (geospatial), Azure SQL PostgreSQL (orders), Cosmos DB (tracking), Blob Storage \
(images), Event Hubs (order events), Azure SignalR (WebSocket tracking), Azure ML (ETA), \
Service Bus (notifications), Azure Functions (surge pricing), Azure Monitor.

Deploy Availability Zones 1, 2, 3. AKS autoscaling, WAF, VNet. HA: Azure SQL geo-replication, \
Cosmos DB multi-region. DR: Paired region failover. Show data flow arrows with labels.\
"""),

    # ── 5. google-maps ────────────────────────────────────────────────────────
    ("google-maps", "aws", """\
Design a production-grade Google Maps Navigation system architecture.

Components: Map Tile Service (vector tiles, pre-rendered at zoom levels), Routing Engine \
(Dijkstra/A* on weighted road graph), Real-time Traffic Service (probe data from mobile \
devices), Geocoding Service (address to coordinates), ETA Service (ML-based predictions), \
CDN (tile caching — billions of tiles), Location Service (GPS tracking), Cache, Places/POI \
Service (search nearby), Offline Maps (downloadable regions).

Use AWS cloud services: Route 53 (GeoDNS), CloudFront CDN (tile edge caching), ALB, ECS/EKS \
microservices, ElastiCache Redis (routing cache, geocoding cache), Amazon OpenSearch (POI \
search), RDS Aurora PostgreSQL (road graph, POI data), DynamoDB (real-time traffic, GPS \
probes), S3 (map tiles, offline packages), SageMaker (ETA ML, traffic prediction), Kinesis \
(real-time GPS stream processing), Lambda (tile generation), API Gateway.

Deploy Multi-AZ globally. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora global, CloudFront \
multi-origin. DR: Multi-region active-active. Show data flow arrows with labels.\
"""),

    ("google-maps", "gcp", """\
Design a production-grade Google Maps Navigation system architecture.

Components: Map Tile Service (vector tiles), Routing Engine (Dijkstra/A*), Real-time Traffic \
Service (probe data), Geocoding Service, ETA Service (ML), CDN (tile caching), Location Service, \
Cache, Places/POI Service, Offline Maps.

Use Google Cloud services: Cloud DNS, Cloud CDN (tile caching), Cloud Load Balancing, GKE \
microservices, Memorystore Redis (cache), Elasticsearch on GKE (POI search), Cloud Spanner \
(road graph — global), Bigtable (real-time traffic, GPS probes), Cloud Storage (tiles, offline \
packages), Vertex AI (ETA prediction), Dataflow (real-time GPS stream), Cloud Functions (tile \
generation), Maps Platform APIs.

Deploy multi-zone globally. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Spanner \
multi-region, global GKE. DR: Spanner automatic failover. Show data flow arrows with labels.\
"""),

    ("google-maps", "azure", """\
Design a production-grade Google Maps Navigation system architecture.

Components: Map Tile Service (vector tiles), Routing Engine (Dijkstra/A*), Real-time Traffic, \
Geocoding Service, ETA Service (ML), CDN, Location Service, Cache, Places/POI Service, Offline \
Maps.

Use Azure cloud services: Azure DNS, Azure CDN (tile caching), Application Gateway, AKS \
microservices, Azure Cache for Redis, Cognitive Search (POI), Cosmos DB (road graph — global \
distribution), Azure Table Storage (traffic probes), Blob Storage (tiles, offline), Azure ML \
(ETA), Event Hubs (GPS streaming), Azure Functions (tile generation), Azure Maps API.

Deploy Availability Zones, global distribution. AKS autoscaling, Azure Monitor, WAF, VNet. HA: \
Cosmos DB multi-region writes. DR: Automatic failover. Show data flow arrows with labels.\
"""),

    # ── 6. zoom ───────────────────────────────────────────────────────────────
    ("zoom", "aws", """\
Design a production-grade Zoom Video Conferencing system architecture.

Components: Signaling Server (WebRTC SDP exchange), Media Server (SFU — Selective Forwarding \
Unit, routes video/audio streams), Recording Service (composites streams to MP4), Chat Service \
(in-meeting text), TURN/STUN Servers (NAT traversal), CDN (recordings), Database, Object \
Storage (recordings, shared files), Screen Share Service, Breakout Rooms (sub-meetings).

Use AWS cloud services: Route 53 (latency-based routing), CloudFront (recording delivery), \
ALB + NLB (UDP/TCP media), EC2 GPU instances (SFU media servers — c5n.xlarge), ECS (signaling, \
chat), ElastiCache Redis (session state, room management), RDS Aurora PostgreSQL (users, meeting \
metadata), DynamoDB (chat messages), S3 (recordings), MediaConvert (recording processing), MSK \
Kafka (meeting events), TURN servers on EC2, API Gateway.

Deploy Multi-AZ + multi-region (edge media servers globally). Auto Scaling, CloudWatch, WAF, \
VPC. HA: Media server failover, Aurora multi-AZ. DR: Multi-region active-active media. Show \
data flow arrows with labels.\
"""),

    ("zoom", "gcp", """\
Design a production-grade Zoom Video Conferencing system architecture.

Components: Signaling Server (WebRTC SDP), Media Server (SFU), Recording Service, Chat Service, \
TURN/STUN Servers, CDN, Database, Object Storage, Screen Share, Breakout Rooms.

Use Google Cloud services: Cloud DNS, Cloud CDN (recordings), Cloud Load Balancing (UDP/TCP), \
GCE (SFU media servers — n2-highcpu), GKE (signaling, chat), Memorystore Redis (sessions, \
rooms), Cloud SQL PostgreSQL (metadata), Firestore (chat), Cloud Storage (recordings), \
Transcoder API (recording processing), Pub/Sub (events), TURN on GCE, Cloud Endpoints.

Deploy multi-zone + global edge. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: \
Media failover, Cloud SQL HA. DR: Multi-region active-active. Show data flow arrows with \
labels.\
"""),

    ("zoom", "azure", """\
Design a production-grade Zoom Video Conferencing system architecture.

Components: Signaling Server (WebRTC SDP), Media Server (SFU), Recording Service, Chat Service, \
TURN/STUN Servers, CDN, Database, Object Storage, Screen Share, Breakout Rooms.

Use Azure cloud services: Azure DNS, Azure CDN (recordings), Azure Load Balancer (UDP/TCP), \
VMs (SFU media — Fsv2 series), AKS (signaling, chat), Azure Cache for Redis (sessions), \
Azure SQL PostgreSQL (metadata), Cosmos DB (chat), Blob Storage (recordings), Media Services \
(processing), Event Hubs (events), TURN on VMs, Azure Communication Services.

Deploy Availability Zones + global. VMSS autoscaling, Azure Monitor, WAF, VNet. HA: Media \
failover, SQL geo-replication. DR: Multi-region. Show data flow arrows with labels.\
"""),

    # ── 7. linkedin ───────────────────────────────────────────────────────────
    ("linkedin", "aws", """\
Design a production-grade LinkedIn Professional Network system architecture.

Components: Profile Service, Connection Service (social graph — 1st/2nd/3rd degree), Feed \
Service (ranked by engagement + relevance), Messaging Service (real-time), Search Service \
(Elasticsearch — people, jobs, companies), Recommendation Engine (People You May Know — graph \
ML), Cache (Couchbase/Redis), Kafka (event bus — profile views, connections), CDN, Job Matching \
Service (ML).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices, ElastiCache Redis \
(feed cache, profile cache), Amazon Neptune (social graph), Amazon OpenSearch (people/job \
search), RDS Aurora PostgreSQL (profiles, jobs), DynamoDB (messages, notifications), S3 (profile \
photos, resumes), SageMaker (PYMK recommendations, job matching ML), MSK Kafka (activity events), \
API Gateway, SQS (async processing).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, Neptune replicas. DR: \
Aurora global, S3 cross-region. Show data flow arrows with labels.\
"""),

    ("linkedin", "gcp", """\
Design a production-grade LinkedIn Professional Network system architecture.

Components: Profile Service, Connection Service (social graph), Feed Service (ranked), Messaging \
Service, Search Service, Recommendation Engine (People You May Know), Cache, Kafka, CDN, Job \
Matching Service (ML).

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, \
Memorystore Redis (cache), Neo4j on GKE (social graph), Elasticsearch on GKE (search), Cloud \
SQL PostgreSQL (profiles, jobs), Firestore (messages), Cloud Storage (photos, resumes), \
Vertex AI (recommendations, job matching), Pub/Sub (events), Cloud Endpoints.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, \
multi-zone GKE. DR: Multi-region. Show data flow arrows with labels.\
"""),

    ("linkedin", "azure", """\
Design a production-grade LinkedIn Professional Network system architecture.

Components: Profile Service, Connection Service (social graph), Feed Service (ranked), Messaging \
Service, Search Service, Recommendation Engine, Cache, Kafka, CDN, Job Matching Service (ML).

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure \
Cache for Redis, Cosmos DB Gremlin API (social graph), Cognitive Search (people/jobs), Azure \
SQL PostgreSQL (profiles, jobs), Cosmos DB (messages), Blob Storage (photos), Azure ML \
(recommendations), Event Hubs (events), Azure SignalR (real-time messaging).

Deploy Availability Zones. AKS autoscaling, Azure Monitor, WAF, VNet. HA: Cosmos DB \
multi-region, SQL geo-replication. DR: Paired region failover. Show data flow arrows with \
labels.\
"""),

    # ── 8. tinder ─────────────────────────────────────────────────────────────
    ("tinder", "aws", """\
Design a production-grade Tinder Dating/Matching App system architecture.

Components: Matching Service (swipe logic — mutual likes), Recommendation Engine (ML scoring — \
attractiveness, preferences, distance), Geospatial Index (Redis GEORADIUS — nearby users), \
Profile Service (photos, bio), Chat Service (WebSocket — matched users), Redis (swipe queue, \
rate limiting), Database (PostgreSQL), Push Notifications (APNs/FCM), Photo Moderation (ML — \
NSFW detection), Boost/Premium Service.

Use AWS cloud services: Route 53, CloudFront CDN (profile photos), ALB, ECS/EKS microservices, \
ElastiCache Redis (geospatial + swipe cache + rate limiting), RDS Aurora PostgreSQL (profiles, \
matches), DynamoDB (swipe history, chat messages), S3 (photos — multiple resolutions), \
Rekognition (photo moderation ML), SageMaker (recommendation scoring), MSK Kafka (swipe events), \
API Gateway (WebSocket for chat), SNS (push notifications).

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, Redis cluster. DR: \
Aurora global database. Show data flow arrows with labels.\
"""),

    ("tinder", "gcp", """\
Design a production-grade Tinder Dating/Matching App system architecture.

Components: Matching Service, Recommendation Engine (ML), Geospatial Index (Redis), Profile \
Service, Chat Service (WebSocket), Redis (swipe queue), Database, Push Notifications, Photo \
Moderation (ML), Boost/Premium.

Use Google Cloud services: Cloud DNS, Cloud CDN (photos), Cloud Load Balancing, GKE microservices, \
Memorystore Redis (geospatial + cache), Cloud SQL PostgreSQL (profiles, matches), Firestore \
(swipes, chat), Cloud Storage (photos), Vision AI (moderation), Vertex AI (recommendations), \
Pub/Sub (events), Cloud Endpoints (WebSocket), Firebase Cloud Messaging (push).

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA, Redis \
HA. DR: Multi-region. Show data flow arrows with labels.\
"""),

    ("tinder", "azure", """\
Design a production-grade Tinder Dating/Matching App system architecture.

Components: Matching Service, Recommendation Engine (ML), Geospatial Index, Profile Service, \
Chat Service (WebSocket), Redis, Database, Push Notifications, Photo Moderation (ML), \
Boost/Premium.

Use Azure cloud services: Azure DNS, Azure CDN (photos), Application Gateway, AKS microservices, \
Azure Cache for Redis (geospatial), Azure SQL PostgreSQL (profiles), Cosmos DB (swipes, chat), \
Blob Storage (photos), Azure AI Vision (moderation), Azure ML (recommendations), Event Hubs \
(events), Azure SignalR (chat), Notification Hubs (push).

Deploy Availability Zones. AKS autoscaling, Azure Monitor, WAF, VNet. HA: SQL geo-replication, \
Redis clustering. DR: Paired region. Show data flow arrows with labels.\
"""),

    # ── 9. yelp ───────────────────────────────────────────────────────────────
    ("yelp", "aws", """\
Design a production-grade Yelp Location-based Service system architecture.

Components: Search Service (full-text + geospatial), Geospatial Index (QuadTree/Geohash — find \
nearby businesses), Business Service (CRUD, hours, photos), Review Service (ratings, text, \
photos), Database (PostgreSQL), Elasticsearch (search + geo), CDN (photos), Cache (Memcached \
— hot queries), Photo Service (upload, resize), ML Ranking (personalized results, spam \
detection).

Use AWS cloud services: Route 53, CloudFront CDN (photos), ALB, ECS/EKS microservices, \
ElastiCache Memcached (query cache), Amazon OpenSearch (geo search + full-text), RDS Aurora \
PostgreSQL (businesses, reviews, users), DynamoDB (review photos, user activity), S3 \
(business/review photos), SageMaker (ranking ML, review spam detection), MSK Kafka (review \
events), Lambda (image processing), API Gateway.

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, OpenSearch multi-AZ. \
DR: Aurora global. Show data flow arrows with labels.\
"""),

    ("yelp", "gcp", """\
Design a production-grade Yelp Location-based Service system architecture.

Components: Search Service (geo + full-text), Geospatial Index (QuadTree/Geohash), Business \
Service, Review Service, Database, Elasticsearch, CDN, Cache, Photo Service, ML Ranking.

Use Google Cloud services: Cloud DNS, Cloud CDN (photos), Cloud Load Balancing, GKE \
microservices, Memorystore Redis (cache), Elasticsearch on GKE (geo search), Cloud SQL \
PostgreSQL (businesses, reviews), Cloud Storage (photos), Vertex AI (ranking, spam detection), \
Pub/Sub (events), Cloud Functions (image resize), Cloud Endpoints.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: \
Multi-region. Show data flow arrows with labels.\
"""),

    ("yelp", "azure", """\
Design a production-grade Yelp Location-based Service system architecture.

Components: Search Service (geo + full-text), Geospatial Index, Business Service, Review Service, \
Database, Search, CDN, Cache, Photo Service, ML Ranking.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure \
Cache for Redis, Cognitive Search (geo + full-text), Azure SQL PostgreSQL (businesses, reviews), \
Blob Storage (photos), Azure ML (ranking, spam), Event Hubs (events), Azure Functions (image \
resize), Azure Monitor.

Deploy Availability Zones. AKS autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Paired \
region. Show data flow arrows with labels.\
"""),

    # ── 10. hotel-booking ─────────────────────────────────────────────────────
    ("hotel-booking", "aws", """\
Design a production-grade Hotel Booking System (Booking.com) architecture.

Components: Search Service (availability + geo + price filtering), Booking Service (optimistic \
locking — prevent double-booking), Payment Service (PCI compliant), Inventory Service (real-time \
room availability), Review Service, Geospatial Index (nearby hotels), Cache (hot searches), CDN \
(hotel photos), Notification Service (confirmation emails), Price Comparison Engine (dynamic \
pricing).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS/EKS microservices, ElastiCache Redis \
(availability cache, search cache), Amazon OpenSearch (hotel search + geo), RDS Aurora PostgreSQL \
(hotels, bookings, inventory — row-level locking), DynamoDB (reviews, price history), S3 (hotel \
photos), MSK Kafka (booking events), SES (confirmation emails), SNS (push), Lambda (price \
computation), API Gateway.

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: Aurora multi-AZ, Redis cluster. DR: \
Aurora global database. Show data flow arrows with labels.\
"""),

    ("hotel-booking", "gcp", """\
Design a production-grade Hotel Booking System (Booking.com) architecture.

Components: Search Service (availability + geo + price), Booking Service (optimistic locking), \
Payment Service, Inventory Service, Review Service, Geospatial Index, Cache, CDN, Notification \
Service, Price Comparison Engine.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE microservices, \
Memorystore Redis (cache), Elasticsearch on GKE (hotel search), Cloud SQL PostgreSQL (hotels, \
bookings, inventory), Firestore (reviews), Cloud Storage (photos), Pub/Sub (events), Cloud Tasks \
(notifications), Cloud Functions (pricing), Cloud Endpoints.

Deploy multi-zone. GKE autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: \
Multi-region. Show data flow arrows with labels.\
"""),

    ("hotel-booking", "azure", """\
Design a production-grade Hotel Booking System (Booking.com) architecture.

Components: Search Service (availability + geo), Booking Service (optimistic locking), Payment \
Service, Inventory Service, Review Service, Geospatial Index, Cache, CDN, Notification Service, \
Price Engine.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS microservices, Azure \
Cache for Redis, Cognitive Search (hotels + geo), Azure SQL PostgreSQL (hotels, bookings), \
Cosmos DB (reviews), Blob Storage (photos), Event Hubs (events), Service Bus (notifications), \
Azure Functions (pricing), Azure Monitor.

Deploy Availability Zones. AKS autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Paired \
region. Show data flow arrows with labels.\
"""),

    # ── 11. unique-id-generator ───────────────────────────────────────────────
    ("unique-id-generator", "aws", """\
Design a production-grade Distributed Unique ID Generator (Snowflake) system architecture.

Components: ID Generator Service (Snowflake — 64-bit IDs: 41-bit timestamp + 10-bit machine ID \
+ 12-bit sequence), ZooKeeper (worker registration — assigns unique machine IDs), Snowflake \
Workers (stateless, each assigned datacenter + machine ID), Load Balancer (round-robin to \
workers), Clock Sync (NTP — detect clock drift), Monitoring (alert on clock skew, ID exhaustion).

Use AWS cloud services: Route 53, NLB (low-latency UDP/TCP), EC2 instances (Snowflake workers), \
Amazon MQ or ZooKeeper on EC2 (worker coordination), CloudWatch (clock drift monitoring, ID \
generation rate), VPC (private subnet only — internal service), Auto Scaling Group, Systems \
Manager (NTP configuration), DynamoDB (worker registry backup).

Deploy Multi-AZ (3 AZs — each with worker pool). HA: Multiple workers per AZ, ZooKeeper quorum \
across AZs. DR: Separate datacenter ID per region. Show data flow arrows with labels.\
"""),

    ("unique-id-generator", "gcp", """\
Design a production-grade Distributed Unique ID Generator (Snowflake) system architecture.

Components: ID Generator Service (Snowflake — 64-bit IDs), ZooKeeper (worker registration), \
Snowflake Workers, Load Balancer, Clock Sync (NTP), Monitoring.

Use Google Cloud services: Cloud DNS, Cloud Load Balancing (internal), GCE instances (Snowflake \
workers), ZooKeeper on GCE (coordination), Cloud Monitoring (clock drift), VPC (internal only), \
Managed Instance Groups (autoscaling), Cloud Spanner (worker registry — globally consistent).

Deploy multi-zone. HA: Workers per zone, ZooKeeper quorum. DR: Separate datacenter IDs per \
region. Show data flow arrows with labels.\
"""),

    ("unique-id-generator", "azure", """\
Design a production-grade Distributed Unique ID Generator (Snowflake) system architecture.

Components: ID Generator Service (Snowflake — 64-bit IDs), ZooKeeper (worker registration), \
Snowflake Workers, Load Balancer, Clock Sync (NTP), Monitoring.

Use Azure cloud services: Azure DNS, Azure Load Balancer (internal), VMs (Snowflake workers), \
ZooKeeper on VMs or Azure Cosmos DB etcd (coordination), Azure Monitor (clock drift), VNet \
(internal only), VMSS (autoscaling), Azure Table Storage (worker registry).

Deploy Availability Zones. HA: Workers per zone, ZooKeeper quorum. DR: Separate datacenter IDs \
per region. Show data flow arrows with labels.\
"""),

    # ── 12. twitter-trends ────────────────────────────────────────────────────
    ("twitter-trends", "aws", """\
Design a production-grade Twitter Trending Topics system architecture.

Components: Stream Processor (Apache Flink/Storm — real-time hashtag counting), Kafka (tweet \
stream ingestion), Count-Min Sketch (approximate counting — memory efficient), Redis (real-time \
trend counters), Time-Decay Service (exponential decay — favor recent activity), API Gateway \
(serve trends), Cache (precomputed top-N trends), Geographic Segmentation (local trends per \
city/country).

Use AWS cloud services: Route 53, CloudFront, ALB, Amazon MSK Kafka (tweet stream), Amazon \
Managed Flink (stream processing), ElastiCache Redis (trend counters, Count-Min Sketch), \
DynamoDB (trend history, geographic trends), RDS Aurora PostgreSQL (trend metadata), Lambda \
(time-decay computation), API Gateway (trend API), CloudWatch (throughput monitoring), Kinesis \
Data Analytics.

Deploy Multi-AZ. Auto Scaling, CloudWatch, WAF, VPC. HA: MSK multi-broker, Redis cluster. DR: \
Cross-region Kafka mirroring. Show data flow arrows with labels.\
"""),

    ("twitter-trends", "gcp", """\
Design a production-grade Twitter Trending Topics system architecture.

Components: Stream Processor (Flink), Kafka (tweet stream), Count-Min Sketch, Redis (counters), \
Time-Decay Service, API Gateway, Cache, Geographic Segmentation.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, Pub/Sub (tweet stream), \
Dataflow (stream processing — Apache Beam), Memorystore Redis (counters), Bigtable (trend \
history), Cloud SQL (metadata), Cloud Functions (time-decay), Cloud Endpoints (API), Cloud \
Monitoring, BigQuery (trend analytics).

Deploy multi-zone. Autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Multi-zone Dataflow, \
Redis HA. DR: Multi-region Pub/Sub. Show data flow arrows with labels.\
"""),

    ("twitter-trends", "azure", """\
Design a production-grade Twitter Trending Topics system architecture.

Components: Stream Processor (Flink), Kafka, Count-Min Sketch, Redis (counters), Time-Decay \
Service, API Gateway, Cache, Geographic Segmentation.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, Event Hubs (tweet stream), \
Azure Stream Analytics (processing), Azure Cache for Redis (counters), Cosmos DB (trend history), \
Azure SQL (metadata), Azure Functions (time-decay), API Management, Azure Monitor.

Deploy Availability Zones. Autoscaling, WAF, VNet. HA: Event Hubs partitions, Redis cluster. DR: \
Paired region. Show data flow arrows with labels.\
"""),

    # ── 13. typeahead ─────────────────────────────────────────────────────────
    ("typeahead", "aws", """\
Design a production-grade Typeahead/Autocomplete system architecture.

Components: Trie Service (in-memory prefix tree — O(p) lookup), Data Collection Pipeline \
(search logs, click-through data), Aggregator (MapReduce — compute top suggestions weekly), \
Cache (Redis — top results per prefix), Load Balancer, CDN (static top-1000 suggestions), \
Zookeeper (shard coordination).

Use AWS cloud services: Route 53, CloudFront CDN (popular prefix caching), ALB, EC2 instances \
(Trie servers — r6g.xlarge high-memory), ElastiCache Redis (prefix to top-10 results cache), \
EMR (MapReduce aggregation of search logs), S3 (search log storage), DynamoDB (suggestion \
metadata), Kinesis (real-time search log streaming), Lambda (cache warming), ZooKeeper on EC2 \
(shard management).

Deploy Multi-AZ. Auto Scaling, CloudWatch, VPC. HA: Trie replicas per AZ, Redis cluster. DR: \
S3 cross-region, trie rebuild from logs. Show data flow arrows with labels.\
"""),

    ("typeahead", "gcp", """\
Design a production-grade Typeahead/Autocomplete system architecture.

Components: Trie Service (in-memory prefix tree), Data Collection Pipeline, Aggregator \
(MapReduce), Cache (Redis), Load Balancer, CDN, Zookeeper (shard coordination).

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GCE (Trie servers — \
high-memory), Memorystore Redis (prefix cache), Dataproc (MapReduce aggregation), Cloud Storage \
(search logs), Firestore (suggestions), Pub/Sub (search log streaming), Cloud Functions (cache \
warming).

Deploy multi-zone. Autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Trie replicas, Redis HA. \
DR: Multi-region. Show data flow arrows with labels.\
"""),

    ("typeahead", "azure", """\
Design a production-grade Typeahead/Autocomplete system architecture.

Components: Trie Service (in-memory), Data Collection Pipeline, Aggregator (MapReduce), Cache \
(Redis), Load Balancer, CDN, Shard coordination.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, VMs (Trie servers — \
high-memory), Azure Cache for Redis (prefix cache), HDInsight (MapReduce), Blob Storage (search \
logs), Cosmos DB (suggestions), Event Hubs (log streaming), Azure Functions (cache warming).

Deploy Availability Zones. Autoscaling, WAF, VNet. HA: Trie replicas, Redis clustering. DR: \
Paired region. Show data flow arrows with labels.\
"""),

    # ── 14. web-crawler ───────────────────────────────────────────────────────
    ("web-crawler", "aws", """\
Design a production-grade Web Crawler system architecture.

Components: URL Frontier (priority queue — BFS/DFS with politeness constraints), DNS Resolver \
(caching), Fetcher (distributed HTTP workers — respect robots.txt), Parser (HTML extraction, \
link discovery), Content Store (dedup using SimHash/MinHash), URL Filter (Bloom filter — 10B \
URLs), Politeness Module (per-domain rate limiting, robots.txt cache), Distributed Queue (Kafka).

Use AWS cloud services: Route 53, SQS/MSK Kafka (URL frontier queue), EC2 Auto Scaling \
(fetcher workers), ElastiCache Redis (DNS cache, robots.txt cache, Bloom filter), S3 (crawled \
page storage, WARC format), DynamoDB (URL metadata, crawl state), EMR (SimHash dedup \
processing), Lambda (HTML parsing), RDS Aurora (URL registry), CloudWatch.

Deploy Multi-AZ. Auto Scaling (scale fetchers by queue depth), CloudWatch, VPC. HA: Multi-AZ \
fetchers, SQS redundancy. DR: S3 cross-region. Show data flow arrows with labels.\
"""),

    ("web-crawler", "gcp", """\
Design a production-grade Web Crawler system architecture.

Components: URL Frontier (priority queue), DNS Resolver (caching), Fetcher (distributed), Parser, \
Content Store (SimHash dedup), URL Filter (Bloom filter), Politeness Module, Distributed Queue.

Use Google Cloud services: Cloud DNS, Pub/Sub (URL frontier), GCE Auto Scaling (fetcher workers), \
Memorystore Redis (DNS cache, Bloom filter), Cloud Storage (WARC pages), Bigtable (URL metadata), \
Dataproc (dedup processing), Cloud Functions (parsing), Cloud SQL (URL registry), Cloud Monitoring.

Deploy multi-zone. Autoscaling, Cloud Monitoring, VPC. HA: Multi-zone fetchers. DR: Multi-region \
storage. Show data flow arrows with labels.\
"""),

    ("web-crawler", "azure", """\
Design a production-grade Web Crawler system architecture.

Components: URL Frontier, DNS Resolver, Fetcher (distributed), Parser, Content Store (SimHash \
dedup), URL Filter (Bloom filter), Politeness Module, Distributed Queue.

Use Azure cloud services: Azure DNS, Service Bus (URL frontier), VMSS (fetcher workers), Azure \
Cache for Redis (DNS cache, Bloom filter), Blob Storage (WARC pages), Cosmos DB (URL metadata), \
HDInsight (dedup), Azure Functions (parsing), Azure SQL (URL registry), Azure Monitor.

Deploy Availability Zones. VMSS autoscaling, WAF, VNet. HA: Multi-zone fetchers. DR: \
Geo-redundant storage. Show data flow arrows with labels.\
"""),

    # ── 15. key-value-store ───────────────────────────────────────────────────
    ("key-value-store", "aws", """\
Design a production-grade Distributed Key-Value Store system architecture.

Components: Storage Nodes (LSM Tree: MemTable to SSTable with compaction), Consistent Hashing \
Ring (virtual nodes), Replication Manager (quorum reads W+R greater than N, configurable \
consistency), Gossip Protocol (membership, failure detection), Bloom Filters, Write-Ahead Log, \
Coordinator Node, Compaction Service, Anti-entropy (Merkle trees).

Use AWS cloud services: Route 53, NLB (low-latency), EC2 i3 instances (NVMe SSDs — storage \
nodes), ElastiCache Redis (request routing cache), EBS gp3 (WAL storage), S3 (SSTable backup), \
CloudWatch (gossip health, compaction lag), VPC (internal only), Auto Scaling.

Deploy Multi-AZ (3 AZs = replication factor 3). HA: Quorum writes across AZs, hinted handoff. \
DR: S3 cross-region SSTable backup. Show data flow arrows with labels.\
"""),

    ("key-value-store", "gcp", """\
Design a production-grade Distributed Key-Value Store system architecture.

Components: Storage Nodes (LSM Tree), Consistent Hashing Ring, Replication Manager (quorum), \
Gossip Protocol, Bloom Filters, Write-Ahead Log, Coordinator Node, Compaction Service, \
Anti-entropy (Merkle trees).

Use Google Cloud services: Cloud DNS, Cloud Load Balancing (internal), GCE Local SSD instances \
(storage nodes), Memorystore Redis (routing cache), Persistent Disk (WAL), Cloud Storage \
(SSTable backup), Cloud Monitoring, VPC, Managed Instance Groups.

Deploy multi-zone (3 zones = RF 3). HA: Quorum across zones, hinted handoff. DR: Multi-region \
backup. Show data flow arrows with labels.\
"""),

    ("key-value-store", "azure", """\
Design a production-grade Distributed Key-Value Store system architecture.

Components: Storage Nodes (LSM Tree), Consistent Hashing Ring, Replication Manager (quorum), \
Gossip Protocol, Bloom Filters, WAL, Coordinator Node, Compaction Service, Anti-entropy.

Use Azure cloud services: Azure DNS, Azure Load Balancer (internal), VMs with local NVMe \
(storage nodes), Azure Cache for Redis (routing), Managed Disks (WAL), Blob Storage (SSTable \
backup), Azure Monitor, VNet, VMSS.

Deploy Availability Zones (3 = RF 3). HA: Quorum across zones. DR: Geo-redundant backup. Show \
data flow arrows with labels.\
"""),

    # ── 16. pastebin ──────────────────────────────────────────────────────────
    ("pastebin", "aws", """\
Design a production-grade Pastebin Text Sharing system architecture.

Components: Web Servers (paste CRUD), Object Storage (paste content — text blobs), Database \
(paste metadata — title, expiry, visibility, short URL), CDN (popular pastes), Cache (Redis — \
hot/recent pastes), Load Balancer, Key Generation Service (pre-generate unique short IDs), \
Expiration/Cleanup Worker (TTL-based deletion of expired pastes).

Use AWS cloud services: Route 53, CloudFront CDN, ALB, ECS Fargate (web servers), ElastiCache \
Redis (hot paste cache), RDS Aurora PostgreSQL (paste metadata), S3 (paste content — lifecycle \
rules for expiry), Lambda (cleanup worker — scheduled), DynamoDB (key pool — pre-generated IDs), \
CloudWatch, API Gateway, WAF.

Deploy Multi-AZ. Auto Scaling, CloudWatch, VPC. HA: Aurora multi-AZ, S3 11 nines durability. DR: \
S3 cross-region. Show data flow arrows with labels.\
"""),

    ("pastebin", "gcp", """\
Design a production-grade Pastebin Text Sharing system architecture.

Components: Web Servers, Object Storage, Database (metadata), CDN, Cache (Redis), Load Balancer, \
Key Generation Service, Expiration/Cleanup Worker.

Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, Cloud Run (web servers), \
Memorystore Redis (cache), Cloud SQL PostgreSQL (metadata), Cloud Storage (paste content — \
lifecycle), Cloud Scheduler + Cloud Functions (cleanup), Firestore (key pool), Cloud Monitoring, \
Cloud Endpoints.

Deploy multi-zone. Autoscaling, Cloud Monitoring, Cloud Armor, VPC. HA: Cloud SQL HA. DR: \
Multi-region storage. Show data flow arrows with labels.\
"""),

    ("pastebin", "azure", """\
Design a production-grade Pastebin Text Sharing system architecture.

Components: Web Servers, Object Storage, Database (metadata), CDN, Cache (Redis), Load Balancer, \
Key Generation Service, Expiration/Cleanup Worker.

Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, App Service (web servers), \
Azure Cache for Redis, Azure SQL PostgreSQL (metadata), Blob Storage (paste content — lifecycle), \
Azure Functions + Timer trigger (cleanup), Cosmos DB (key pool), Azure Monitor.

Deploy Availability Zones. Autoscaling, WAF, VNet. HA: SQL geo-replication. DR: Geo-redundant \
storage. Show data flow arrows with labels.\
"""),

    # ── 17-46: remaining problems using generic cloud service blocks ───────────
    # For brevity the remaining ~90 jobs follow the same three-cloud pattern.
    # They are generated programmatically below.
]

# Generic cloud service blocks (from the spec's substitution reference)
_AWS_BLOCK = (
    "Use AWS cloud services: Route 53 DNS, CloudFront CDN, ALB load balancer, ECS/EKS for "
    "compute, ElastiCache Redis, RDS Aurora PostgreSQL, DynamoDB, S3 storage, MSK Kafka, "
    "Lambda serverless, SageMaker ML, API Gateway, SQS/SNS messaging, CloudWatch monitoring, "
    "WAF security. Deploy Multi-AZ (us-east-1a, 1b, 1c). Include Auto Scaling, VPC with "
    "public/private subnets, NAT Gateway. Show HA with cross-AZ replication, DR with "
    "cross-region failover. Show data flow arrows with labels."
)
_GCP_BLOCK = (
    "Use Google Cloud services: Cloud DNS, Cloud CDN, Cloud Load Balancing, GKE for compute, "
    "Memorystore Redis, Cloud SQL PostgreSQL, Firestore/Bigtable, Cloud Storage, Pub/Sub "
    "messaging, Cloud Functions serverless, Vertex AI ML, Cloud Endpoints, Cloud Monitoring, "
    "Cloud Armor. Deploy multi-zone (us-central1-a, b, c). Include GKE autoscaling, VPC. "
    "Show HA with multi-zone, DR with multi-region failover. Show data flow arrows with labels."
)
_AZURE_BLOCK = (
    "Use Azure cloud services: Azure DNS, Azure CDN, Application Gateway, AKS for compute, "
    "Azure Cache for Redis, Azure SQL PostgreSQL, Cosmos DB, Blob Storage, Event Hubs/Service "
    "Bus messaging, Azure Functions serverless, Azure ML, API Management, Azure Monitor, WAF. "
    "Deploy Availability Zones 1, 2, 3. Include AKS autoscaling, VNet. Show HA with zone "
    "redundancy, DR with paired region failover. Show data flow arrows with labels."
)

_REMAINING: list[tuple[str, str]] = [
    ("slack", (
        "Design a production-grade Slack Team Communication system architecture. "
        "Components: WebSocket Gateway (per-workspace persistent connections), Kafka (message bus "
        "— ordered per channel), Cassandra (message store — partitioned by channel), Elasticsearch "
        "(message search across workspace), Redis (presence tracking + pub/sub for typing "
        "indicators), Object Storage S3 (file uploads), Channel Service (public/private/DM), "
        "Thread Service (threaded replies), Notification Service (push/email/badge counts)."
    )),
    ("tiktok", (
        "Design a production-grade TikTok Short Video Platform architecture. "
        "Components: CDN (multi-tier global — edge + regional + origin), Blob Storage (raw + "
        "transcoded videos), Kafka (upload events, engagement events), GPU Transcoding Farm "
        "(multiple resolutions + codecs), ML Recommendation Service (For You Page — real-time "
        "engagement signals), Vitess/sharded MySQL (user data, video metadata), Redis (cache — "
        "hot videos, user sessions), Vector DB (video embeddings for similarity), Content "
        "Moderation (ML — NSFW, violence, copyright), Creator Analytics Dashboard."
    )),
    ("reddit", (
        "Design a production-grade Reddit Social News Platform architecture. "
        "Components: PostgreSQL with ltree (threaded comment trees), Redis sorted sets "
        "(hot/top/new/rising rankings with time-decay), Kafka (vote events, post events), Ranking "
        "Worker (Wilson score interval for confidence-based ranking), CDN (static assets, "
        "thumbnails), Elasticsearch (subreddit + post search), Vote Service (optimistic counting "
        "with anti-cheat), Comment Service (recursive tree rendering), Subreddit Service, "
        "Moderation Queue (AutoMod rules + ML spam detection)."
    )),
    ("twitch", (
        "Design a production-grade Twitch Live Streaming Platform architecture. "
        "Components: RTMP Ingest PoPs (global — streamers push to nearest), GPU Transcoding Farm "
        "(adaptive bitrate — 160p to 1080p60), CDN multi-tier, WebSocket Gateway Cluster (chat — "
        "millions concurrent), Redis Pub/Sub (chat message fan-out), Cassandra (chat history — "
        "partitioned by channel + time), PostgreSQL (stream metadata, user profiles, "
        "subscriptions), S3/Object Storage (VOD recordings, clips), Subscription/Bits Service "
        "(monetization), Channel Points/Predictions."
    )),
    ("gmail", (
        "Design a production-grade Gmail Email Service architecture. "
        "Components: MX Servers (SMTP inbound — receive from internet), Kafka (mail processing "
        "pipeline), Spam Pipeline (ML classifier + SpamAssassin + reputation scoring), Bigtable "
        "(mail store — row per user, column per message), Blob Storage (large attachments), "
        "Elasticsearch (full-text mail search), Redis (session cache, IMAP state), Push "
        "Notification (new mail alerts — APNs/FCM), IMAP/POP3 Gateway (third-party clients), "
        "SMTP Outbound (sending — SPF/DKIM/DMARC)."
    )),
    ("google-drive", (
        "Design a production-grade Google Drive Cloud Storage and Sync architecture. "
        "Components: Sync Service (delta sync — only changed blocks, conflict resolution), "
        "Content-Addressable Blob Storage (dedup by content hash), Metadata DB Spanner (file "
        "tree, permissions, sharing — globally consistent), Redis (cache + pub/sub for real-time "
        "change notifications), CDN (preview thumbnails, public file sharing), Elasticsearch "
        "(file name + content search), Change Log (event sourcing — ordered list of all file "
        "operations), Sharing/Permissions Service (ACL with inheritance)."
    )),
    ("shopify", (
        "Design a production-grade Shopify E-commerce Platform architecture. "
        "Components: Pod-based infrastructure (tenant isolation — each merchant gets isolated "
        "compute/data), Vitess sharded MySQL (product catalog, orders — sharded by merchant), "
        "Redis (shopping carts, inventory counters — atomic decrement), CDN (storefront assets "
        "— Shopify Edge), Payment Gateway (multi-provider — Stripe, PayPal), Kafka (order events, "
        "webhook delivery), S3 (product images, theme assets), Webhook Service (notify merchants "
        "of events), Liquid Template Engine (storefront rendering), App/API Platform."
    )),
    ("flash-sale", (
        "Design a production-grade Flash Sale System architecture. "
        "Components: Virtual Queue Service (FIFO with position tracking — prevent thundering herd), "
        "Inventory Lock Redis (atomic DECR — prevent overselling), Order Service (state machine), "
        "Payment Service (timeout-based release if unpaid), Rate Limiter (DDoS protection — token "
        "bucket), CDN (static product page), Database PostgreSQL (order persistence), Notification "
        "Service (confirmation), Anti-bot/CAPTCHA, Circuit Breaker (graceful degradation)."
    )),
    ("stock-exchange", (
        "Design a production-grade Stock Exchange Trading System architecture. "
        "Components: Order Matching Engine (price-time priority — continuous double auction), "
        "Order Book (in-memory — bid/ask sorted by price), Market Data Feed (multicast/UDP — "
        "real-time quotes), Risk Engine (pre-trade checks — margin, position limits, circuit "
        "breakers), Settlement Service (T+1 clearing), FIX Gateway (Financial Information "
        "eXchange protocol), Time-Series DB (tick data, OHLCV candles), Kafka (trade events — "
        "audit trail), Sequencer (total ordering — deterministic replay)."
    )),
    ("distributed-cache", (
        "Design a production-grade Distributed Cache System architecture. "
        "Components: Cache Nodes (in-memory hash table — O(1) get/set), Consistent Hashing Ring "
        "(virtual nodes), Replication (primary-replica — async for speed, sync option), Eviction "
        "Policy (LRU/LFU — configurable per cache), Gossip Protocol (membership detection — phi "
        "accrual failure detector), Client Library (smart routing), Monitoring (hit rate, eviction "
        "rate, memory usage, latency p99), Hot Key Detection (split hot keys across replicas)."
    )),
    ("distributed-lock", (
        "Design a production-grade Distributed Lock Service architecture. "
        "Components: Lock Manager (acquire/release/extend with TTL), ZooKeeper or etcd (consensus "
        "— Paxos/Raft), Fencing Tokens (monotonically increasing — prevent stale lock holders), "
        "Heartbeat Service (lease renewal — auto-extend while holder alive), Client SDK (retry with "
        "exponential backoff, auto-release on crash), Monitoring (lock contention metrics, wait "
        "time p99, deadlock detection), Dead Lock Detection (wait-for graph analysis)."
    )),
    ("distributed-search", (
        "Design a production-grade Distributed Search Engine architecture. "
        "Components: Index Shards (inverted index — partitioned by document hash or term range), "
        "Query Coordinator (scatter-gather — fan out to all shards, merge results), Crawler (URL "
        "frontier with BFS, politeness), Indexer Pipeline (MapReduce — tokenize, stem, build "
        "inverted index), Ranking Service (BM25 baseline + ML re-ranking — LambdaMART), Cache "
        "(query result cache — LRU), Load Balancer, Spell Correction."
    )),
    ("distributed-task-scheduler", (
        "Design a production-grade Distributed Task Scheduler architecture. "
        "Components: Scheduler Service (cron + one-time + delayed tasks), Task Queue Kafka "
        "(partitioned by priority — high/medium/low), Worker Pool (auto-scaling by queue depth — "
        "heterogeneous CPU/GPU), ZooKeeper (leader election for scheduler HA), Database PostgreSQL "
        "(task state — pending/running/completed/failed), Monitoring Prometheus (SLA tracking), "
        "Dead Letter Queue (failed tasks after max retries), Retry/Backoff Engine (exponential "
        "backoff with jitter)."
    )),
    ("api-gateway", (
        "Design a production-grade API Gateway architecture. "
        "Components: Gateway Service (request routing — path-based and header-based), Rate Limiter "
        "(token bucket per API key/IP), Auth Service (JWT validation, OAuth2 token introspection), "
        "Service Registry Consul (dynamic service discovery), Load Balancer (weighted round-robin "
        "to upstream services), Cache (response cache — TTL per route), Logging/Metrics (ELK + "
        "Prometheus), Circuit Breaker (half-open/open/closed — prevent cascade failures), Request "
        "Transformation (header injection, body mapping)."
    )),
    ("blob-store", (
        "Design a production-grade Blob Storage System (S3-compatible) architecture. "
        "Components: API Gateway (S3-compatible REST — PUT/GET/DELETE/LIST), Metadata Service "
        "PostgreSQL (object metadata — bucket, key, size, ACL, versioning), Data Nodes "
        "(erasure-coded chunks — 6+3 encoding for 1.5x storage overhead), Replication Manager "
        "(cross-region async replication), Garbage Collector (mark-sweep for deleted/overwritten "
        "objects), CDN (presigned URL support for direct edge delivery), Consistent Hashing (map "
        "objects to data node groups), Versioning Service (keep all object versions, lifecycle "
        "rules)."
    )),
    ("cdn", (
        "Design a production-grade Content Delivery Network architecture. "
        "Components: Edge PoPs (300+ global locations — cache static + dynamic content), Origin "
        "Shield (mid-tier cache — reduce origin load by 90%), Origin Server (source of truth), "
        "DNS GeoDNS (latency-based routing — direct users to nearest PoP), Cache Invalidation "
        "(tag-based purge — instant global propagation), TLS Termination (edge SSL), Load "
        "Balancer (distribute within PoP), Monitoring (real-time analytics — cache hit ratio, "
        "bandwidth, errors), DDoS Mitigation (L3/L4/L7 — rate limiting, IP reputation)."
    )),
    ("ci-cd-pipeline", (
        "Design a production-grade CI/CD Pipeline System architecture. "
        "Components: Source Control Git (webhook on push/PR — trigger pipeline), Build Agents "
        "(containerized — ephemeral, parallel builds), Artifact Registry (Docker images, npm "
        "packages — versioned + signed), Test Runners (parallel unit/integration/e2e — matrix "
        "strategy), Deployment Service (blue-green + canary + rolling strategies), Queue Kafka "
        "(build events — decouple trigger from execution), Database (pipeline state — run history, "
        "logs), Notification Service (Slack/email on success/failure), Secret Manager (inject "
        "credentials at build time — never in code)."
    )),
    ("chatgpt-llm-system", (
        "Design a production-grade ChatGPT/LLM Serving System architecture. "
        "Components: API Gateway (streaming SSE — token-by-token response), Load Balancer "
        "(GPU-aware — route to available GPU nodes), GPU Inference Cluster (A100/H100 — tensor "
        "parallelism across GPUs), Model Registry (versioned model weights — A/B test different "
        "models), Token Queue (request scheduling — FIFO with priority, batch similar-length "
        "requests), KV Cache (attention key-value cache — avoid recomputation for long contexts), "
        "Object Storage (model artifacts — 100GB+ checkpoints), Monitoring (tokens/sec, "
        "time-to-first-token, GPU utilization), Rate Limiter (per-user token budgets), "
        "Safety/Content Filter (input/output moderation)."
    )),
    ("calendar-system", (
        "Design a production-grade Calendar System (Google Calendar) architecture. "
        "Components: Calendar Service (CRUD calendars, sharing), Event Service (create/update/delete "
        "events — single + recurring), Notification Service (email reminders, push alerts — "
        "15min/1hr/1day before), Recurring Event Engine (RRULE expansion — generate instances "
        "on-the-fly, handle exceptions), Timezone Service (IANA timezone database — convert between "
        "zones), Database PostgreSQL (events, calendars, attendees), Cache Redis (user upcoming "
        "events, free/busy), Push Service (APNs/FCM for mobile), Free/Busy Lookup, CalDAV Sync."
    )),
    ("deployment-system", (
        "Design a production-grade Deployment System (Kubernetes-like) architecture. "
        "Components: API Server (REST — all cluster operations go through here), Scheduler "
        "(bin-packing — assign pods to nodes by resource requests), Controller Manager "
        "(reconciliation loops — desired state vs actual state), etcd (distributed state store — "
        "Raft consensus, all cluster state), Kubelet (node agent — manage containers on each node), "
        "Container Runtime containerd (pull images, run containers), Service Mesh Istio/Envoy "
        "(mTLS, traffic splitting, observability), Ingress Controller (L7 routing), HPA (horizontal "
        "pod autoscaler — scale by CPU/memory/custom metrics)."
    )),
    ("digital-wallet", (
        "Design a production-grade Digital Wallet (Apple Pay/Venmo) architecture. "
        "Components: Wallet Service (balance management — load/withdraw/transfer), Transaction "
        "Service (ACID transfers — debit sender + credit receiver atomically), Ledger (double-entry "
        "immutable — every transaction = debit + credit entry), Fraud Detection ML (real-time "
        "scoring — velocity checks, device fingerprint, geo anomaly), KYC Service (identity "
        "verification — document upload, face match, watchlist screening), Payment Rail Integration "
        "(ACH bank transfers, Visa Direct, wire), Notification Service (transaction alerts), HSM "
        "(tokenization — encrypt card numbers), Compliance/AML (anti-money laundering — pattern "
        "detection, SAR filing)."
    )),
    ("job-scheduler", (
        "Design a production-grade Job Scheduler System architecture. "
        "Components: Scheduler Service (priority-based — earliest-deadline-first), Job Queue "
        "(partitioned by priority — separate high/medium/low lanes), Worker Pool (heterogeneous — "
        "CPU workers vs GPU workers, auto-scale), Cron Engine (time-trigger — cron expression "
        "parsing, next-fire-time calculation), Database (job state/history — PostgreSQL with state "
        "machine), Monitoring (SLA tracking — alert on missed deadlines), Dead Letter Queue (failed "
        "jobs after N retries), API Gateway (submit/cancel/query jobs), Dependency Graph Resolver "
        "(DAG execution — topological sort, parallel independent tasks)."
    )),
    ("object-storage", (
        "Design a production-grade Object Storage System architecture. "
        "Components: API Gateway (S3-compatible REST API — presigned URLs), Metadata Service "
        "(sharded PostgreSQL — bucket/key lookup, ACLs), Data Nodes (erasure coding 6+3 — "
        "Reed-Solomon, 12 data nodes per group), Replication (cross-datacenter async — RPO under "
        "1 min), Garbage Collector (mark-sweep — reclaim space from deleted/overwritten), "
        "Monitoring (capacity planning — growth projection, disk health), Lifecycle Manager "
        "(storage tiering — hot/warm/cold/archive based on access patterns)."
    )),
    ("online-chess", (
        "Design a production-grade Online Chess (Chess.com) system architecture. "
        "Components: Game Service (state machine — waiting/playing/ended, FEN board representation), "
        "WebSocket Gateway (real-time moves — sub-100ms latency), Matchmaking Service (ELO-based "
        "— pair players within rating range), Rating Engine Glicko-2 (update ratings after each "
        "game), Move Validator (legal move checking — verify against chess rules + clock), Database "
        "(game history — PGN notation, player profiles), Redis (active games cache — board state, "
        "clock), Spectator Service (fan-out live moves to viewers), Puzzle/Analysis Engine "
        "(Stockfish — post-game analysis, daily puzzles)."
    )),
    ("recommendation-engine", (
        "Design a production-grade Recommendation Engine system architecture. "
        "Components: Feature Store (online low-latency + offline batch features — user history, "
        "item attributes), ML Training Pipeline (batch on Spark — collaborative filtering, deep "
        "learning embeddings), Model Serving (low-latency inference — under 50ms p99, model "
        "versioning), User Activity Collector (clickstream — views, clicks, purchases, dwell time), "
        "Kafka (event ingestion — real-time user signals), Vector DB (ANN search — find similar "
        "items/users by embedding distance), A/B Testing Framework (experiment assignment, metric "
        "tracking, statistical significance), Cache (precomputed recommendations for cold-start), "
        "Cold-Start Handler."
    )),
    ("time-series-db", (
        "Design a production-grade Time-Series Database system architecture. "
        "Components: Write-Ahead Log (durability — fsync before acknowledging write), LSM Tree / "
        "Columnar Store (optimized for time-range scans — sorted by timestamp), Compaction Service "
        "(size-tiered — merge small SSTables into larger ones, remove tombstones), Query Engine "
        "(time-range + aggregation — downsampling, GROUP BY time window), Retention Manager (TTL "
        "+ downsampling — raw data 30d, 1-min aggregates 1y, 1-hr aggregates forever), Replication "
        "(Raft consensus — 3-node quorum writes), API Gateway (PromQL/InfluxQL compatible query "
        "language), Ingestion Buffer (batch writes — amortize WAL fsync overhead)."
    )),
    ("metrics-monitoring", (
        "Design a production-grade Metrics Monitoring System (Datadog-like) architecture. "
        "Components: Agent Collector (host/container agent — collect CPU, memory, disk, network, "
        "custom metrics), Ingestion Pipeline Kafka (time-series data stream — partitioned by "
        "metric name), Time-Series DB InfluxDB/Prometheus (optimized columnar storage), Query "
        "Engine PromQL (aggregation, rate, percentiles), Alerting Service (threshold + "
        "anomaly-based — PagerDuty/Slack integration), Dashboard API Grafana (visualization — "
        "graphs, heatmaps, tables), Object Storage (long-term metric archive — downsample to 1hr "
        "granularity), Anomaly Detection ML (statistical + ML-based)."
    )),
    ("ad-click-aggregation", (
        "Design a production-grade Ad Click Aggregation System architecture. "
        "Components: Click Ingestion Service (high-throughput — 100K clicks/sec), Stream Processor "
        "Flink/Spark Streaming (windowed aggregation — 1min/5min/1hr tumbling windows), Kafka "
        "(click event stream — partitioned by advertiser_id), Time-Series DB ClickHouse "
        "(pre-aggregated metrics — fast OLAP queries), Aggregation Service (rollup — "
        "campaign/ad_group/creative level), Dashboard API (real-time + historical reports), Cache "
        "(recent aggregates for dashboard), Fraud Detection (click fraud — bot detection, click "
        "injection, attribution fraud)."
    )),
]

# Expand remaining jobs into DiagramJob list
for _pid, _components in _REMAINING:
    for _cloud, _block in (("aws", _AWS_BLOCK), ("gcp", _GCP_BLOCK), ("azure", _AZURE_BLOCK)):
        _RAW_JOBS.append((_pid, _cloud, f"{_components}\n\n{_block}"))

# Duplicate mappings (copy from source)
DUPLICATE_MAP: dict[str, str] = {
    "autocomplete-system": "typeahead",
    "ecommerce-platform":  "amazon",
    "messaging-app":       "whatsapp",
    "payment-gateway":     "payment-system",
    "proximity-service":   "yelp",
    "tiny-url":            "url-shortener",
    "top-k-leaderboard":   "leaderboard",
}

# Build the canonical job list
ALL_JOBS: list[DiagramJob] = [
    DiagramJob(problem_id=pid, cloud=cloud, prompt=prompt)
    for pid, cloud, prompt in _RAW_JOBS
]


# ─── Exceptions ────────────────────────────────────────────────────────────────

class EraserAPIError(Exception):
    """Raised for non-retryable Eraser API errors (4xx except 429)."""

class EraserRateLimitError(Exception):
    """Raised on HTTP 429 — will be retried with backoff."""

class EraserTimeoutError(Exception):
    """Raised when async polling exceeds the deadline."""


def _unwrap_error(exc: BaseException) -> str:
    """Extract the real error message from a tenacity RetryError chain."""
    # tenacity wraps the last attempt's exception in RetryError.__cause__
    cause = getattr(exc, "__cause__", None) or getattr(exc, "last_attempt", None)
    if cause is None:
        return str(exc)
    # last_attempt is a tenacity Future — get its exception
    if hasattr(cause, "exception"):
        try:
            inner = cause.exception()
            return str(inner) if inner else str(exc)
        except Exception:
            pass
    return str(cause)


# ─── API helpers ───────────────────────────────────────────────────────────────

POLL_INTERVAL_SEC  = 3      # seconds between status polls
POLL_MAX_WAIT_SEC  = 180    # give up polling after 3 minutes per job


def _log_retry(retry_state) -> None:
    """tenacity before_sleep callback — logs the actual error before each retry."""
    exc = retry_state.outcome.exception()
    attempt = retry_state.attempt_number
    console.print(
        f"  [yellow]⟳ retry {attempt}[/yellow] "
        f"[dim]{type(exc).__name__}: {str(exc)[:120]}[/dim]"
    )


async def _poll_for_image_url(
    client:     httpx.AsyncClient,
    request_id: str,
    token:      str,
    label:      str,
) -> str:
    """
    Poll /api/ai-requests/{requestId} until the job completes and an imageUrl
    is available.  Eraser AI generation is asynchronous — the initial POST to
    /api/render/prompt may return a requestId rather than an imageUrl directly.
    """
    deadline = time.monotonic() + POLL_MAX_WAIT_SEC
    while True:
        if time.monotonic() > deadline:
            raise EraserTimeoutError(
                f"Polling timed out after {POLL_MAX_WAIT_SEC}s for requestId={request_id}"
            )
        await asyncio.sleep(POLL_INTERVAL_SEC)
        resp = await client.get(
            f"{ERASER_API_BASE}/api/ai-requests/{request_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if resp.status_code == 429:
            await asyncio.sleep(15)
            continue
        if resp.status_code != 200:
            raise EraserAPIError(
                f"Poll HTTP {resp.status_code} for {label}: {resp.text[:200]}"
            )
        data = resp.json()
        status = data.get("status", "").lower()
        if status in ("completed", "done", "success", ""):
            img_url = (
                data.get("imageUrl")
                or data.get("image_url")
                or data.get("result", {}).get("imageUrl")
                or data.get("output", {}).get("imageUrl")
            )
            if img_url:
                return img_url
            # Status looks done but no URL yet — keep polling briefly
        if status in ("failed", "error", "cancelled"):
            raise EraserAPIError(
                f"Async job failed (status={status}) for {label}: {data}"
            )
        # still pending — loop


@retry(
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError, EraserRateLimitError)),
    wait=wait_exponential(multiplier=2, min=5, max=90),
    stop=stop_after_attempt(4),
    before_sleep=_log_retry,
    reraise=True,
)
async def _call_render_prompt(
    client: httpx.AsyncClient,
    job:    DiagramJob,
    token:  str,
) -> dict:
    """
    POST /api/render/prompt — returns the raw response JSON.
    Retries on network errors and rate-limits; raises immediately on 4xx auth errors.
    """
    payload = {
        "text":        job.prompt,
        "diagramType": DIAGRAM_TYPE,
        "background":  True,
        "theme":       THEME,
        "scale":       SCALE,
    }
    resp = await client.post(
        f"{ERASER_API_BASE}/api/render/prompt",
        json=payload,
        headers={
            "Authorization":  f"Bearer {token}",
            "Content-Type":   "application/json",
            "X-Skill-Source": "claude",
        },
        timeout=TIMEOUT_SECONDS,
    )

    # Fast-fail on auth / permission errors — no point retrying
    if resp.status_code in (401, 403):
        raise EraserAPIError(
            f"Auth error HTTP {resp.status_code}: {resp.text[:300]}\n"
            "→ Check your ERASER_API_KEY and that your plan supports the API."
        )
    if resp.status_code == 402:
        raise EraserAPIError(
            "HTTP 402 Payment Required: API access requires a paid Eraser plan "
            "(Starter / Business / Enterprise)."
        )
    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "30"))
        console.print(f"  [yellow]Rate-limited — waiting {retry_after}s[/yellow]")
        await asyncio.sleep(retry_after)
        raise EraserRateLimitError(f"429 rate-limit (Retry-After={retry_after}s)")
    if resp.status_code >= 500:
        raise EraserRateLimitError(
            f"Server error HTTP {resp.status_code}: {resp.text[:200]}"
        )
    if resp.status_code != 200:
        raise EraserAPIError(
            f"HTTP {resp.status_code} for {job.problem_id}/{job.cloud}: {resp.text[:300]}"
        )

    return resp.json()


async def generate_diagram(
    client: httpx.AsyncClient,
    job:    DiagramJob,
    token:  str,
) -> str:
    """
    Full pipeline:  POST prompt → handle sync/async response → return PNG URL.

    Eraser can respond in two ways:
      a) Synchronous: {"imageUrl": "https://...", ...}
      b) Asynchronous: {"requestId": "abc123", ...} → poll /api/ai-requests/{id}
    """
    label = f"{job.problem_id}/{job.cloud}"
    data  = await _call_render_prompt(client, job, token)

    # ── Synchronous response (imageUrl present immediately) ──
    img_url = (
        data.get("imageUrl")
        or data.get("image_url")
        or data.get("result", {}).get("imageUrl")
    )
    if img_url:
        return img_url

    # ── Asynchronous response (requestId present, need to poll) ──
    request_id = data.get("requestId") or data.get("request_id") or data.get("id")
    if request_id:
        console.print(f"  [dim]async job {request_id[:12]}… polling for {label}[/dim]")
        return await _poll_for_image_url(client, request_id, token, label)

    # Neither — something unexpected
    raise EraserAPIError(
        f"Unexpected response for {label} (no imageUrl or requestId): {data}"
    )


async def download_png(client: httpx.AsyncClient, url: str) -> bytes:
    resp = await client.get(url, timeout=60)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "")
    if "image" not in content_type and "octet-stream" not in content_type:
        raise EraserAPIError(
            f"Expected PNG download but got Content-Type '{content_type}'. "
            f"URL: {url[:100]}"
        )
    return resp.content


# ─── Probe mode ────────────────────────────────────────────────────────────────

async def probe(token: str) -> None:
    """
    Fire ONE minimal API call and print the full raw response so you can
    diagnose auth / plan / response-shape issues without running all 131 jobs.
    """
    import json
    console.rule("[bold cyan]PROBE MODE[/bold cyan]")
    console.print("Sending a single test request to Eraser /api/render/prompt …\n")

    payload = {
        "text": (
            "Design a simple 3-tier web application on AWS. "
            "Components: Route 53, ALB, ECS (web server), RDS Aurora, S3. "
            "Show data flow arrows with labels."
        ),
        "diagramType": DIAGRAM_TYPE,
        "background":  True,
        "theme":       THEME,
        "scale":       1,
    }

    async with httpx.AsyncClient() as client:
        t0   = time.monotonic()
        resp = await client.post(
            f"{ERASER_API_BASE}/api/render/prompt",
            json=payload,
            headers={
                "Authorization":  f"Bearer {token}",
                "Content-Type":   "application/json",
                "X-Skill-Source": "claude",
            },
            timeout=TIMEOUT_SECONDS,
        )
        elapsed = time.monotonic() - t0

    console.print(f"[bold]HTTP Status:[/bold] {resp.status_code}  ({elapsed:.1f}s)")
    console.print(f"[bold]Headers:[/bold]")
    for k, v in resp.headers.items():
        console.print(f"  {k}: {v}")

    try:
        body = resp.json()
        console.print(f"\n[bold]Body (JSON):[/bold]")
        console.print(json.dumps(body, indent=2))

        # Interpret
        if resp.status_code == 200:
            img_url    = body.get("imageUrl") or body.get("image_url")
            request_id = body.get("requestId") or body.get("request_id")
            if img_url:
                console.print(f"\n[green]✓ Got imageUrl directly:[/green] {img_url}")
            elif request_id:
                console.print(
                    f"\n[yellow]⟳ Got requestId (async):[/yellow] {request_id}\n"
                    f"  The script will poll /api/ai-requests/{{requestId}} — this is normal."
                )
                console.print("Polling once to inspect status …")
                poll_resp = await client.get(  # noqa: F821 — client still open above
                    f"{ERASER_API_BASE}/api/ai-requests/{request_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30,
                )
                console.print(f"\nPoll response ({poll_resp.status_code}):")
                console.print(json.dumps(poll_resp.json(), indent=2))
            else:
                console.print(
                    "\n[red]✗ Neither imageUrl nor requestId in response.[/red]\n"
                    "  Check the keys above and update generate_diagram() accordingly."
                )
        elif resp.status_code in (401, 403):
            console.print("\n[red]✗ Auth failed.[/red] Check ERASER_API_KEY.")
        elif resp.status_code == 402:
            console.print("\n[red]✗ Payment required.[/red] Upgrade to a paid Eraser plan.")
        elif resp.status_code == 429:
            console.print("\n[yellow]✗ Rate-limited.[/yellow] Wait and retry.")
        else:
            console.print(f"\n[red]✗ Unexpected status {resp.status_code}.[/red]")
    except Exception:
        console.print(f"\n[bold]Body (raw):[/bold]\n{resp.text[:1000]}")

    console.rule()


# ─── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class JobResult:
    status:     str          # "ok" | "error" | "skipped"
    problem_id: str
    cloud:      str
    elapsed:    float        # seconds
    detail:     str          # file path (ok/skipped) or error message (error)
    file_bytes: int = 0      # PNG size on disk, set after validation


# ─── PNG validation ────────────────────────────────────────────────────────────

PNG_HEADER    = b"\x89PNG\r\n\x1a\n"
MIN_PNG_BYTES = 5_000   # anything smaller is almost certainly a blank/error image


def validate_png(path: Path) -> tuple[bool, str]:
    """Return (ok, reason) after checking the file is a real, non-trivial PNG."""
    if not path.exists():
        return False, "file not found on disk"
    size = path.stat().st_size
    if size < MIN_PNG_BYTES:
        return False, f"suspiciously small ({size} bytes — likely blank)"
    try:
        header = path.read_bytes()[:8]
    except OSError as e:
        return False, f"cannot read file: {e}"
    if header != PNG_HEADER:
        return False, f"not a valid PNG (header: {header.hex()})"
    return True, f"{size:,} bytes"


# ─── Single-job worker ─────────────────────────────────────────────────────────

async def run_job(
    job:           DiagramJob,
    token:         str,
    output_root:   Path,
    skip_existing: bool,
    semaphore:     asyncio.Semaphore,
    progress:      Progress,
    task_id,
    verbose:       bool,
) -> JobResult:
    out_dir  = output_root / job.problem_id
    out_file = out_dir / job.filename

    if skip_existing and out_file.exists():
        progress.advance(task_id)
        ok, reason = validate_png(out_file)
        return JobResult(
            status="skipped", problem_id=job.problem_id, cloud=job.cloud,
            elapsed=0.0, detail=str(out_file), file_bytes=out_file.stat().st_size if ok else 0,
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.monotonic()

    async with semaphore:
        try:
            async with httpx.AsyncClient() as client:
                img_url  = await generate_diagram(client, job, token)
                if verbose:
                    console.print(
                        f"  [dim]↓ {job.problem_id}/{job.cloud} "
                        f"→ {img_url[:70]}[/dim]"
                    )
                png_data = await download_png(client, img_url)

            out_file.write_bytes(png_data)
            elapsed = time.monotonic() - t0
            result = JobResult(
                status="ok", problem_id=job.problem_id, cloud=job.cloud,
                elapsed=elapsed, detail=str(out_file), file_bytes=len(png_data),
            )
        except Exception as exc:
            elapsed = time.monotonic() - t0
            result = JobResult(
                status="error", problem_id=job.problem_id, cloud=job.cloud,
                elapsed=elapsed, detail=_unwrap_error(exc),
            )
        finally:
            await asyncio.sleep(REQUEST_DELAY_SEC)
            progress.advance(task_id)

    return result


# ─── Batch runner ──────────────────────────────────────────────────────────────

async def run_batch(
    batch_num:     int,
    batch_label:   str,
    jobs:          list[DiagramJob],
    token:         str,
    output_root:   Path,
    skip_existing: bool,
    concurrency:   int,
    verbose:       bool,
    total_jobs:    int,
    done_so_far:   int,
) -> list[JobResult]:
    """
    Run one batch of jobs with the given concurrency, then validate each PNG.
    Returns the list of JobResults (including post-write validation status).
    """
    semaphore = asyncio.Semaphore(concurrency)

    console.rule(
        f"[bold cyan]Batch {batch_num}[/bold cyan]  "
        f"[dim]{batch_label}[/dim]  "
        f"[dim]({len(jobs)} jobs, concurrency={concurrency})[/dim]"
    )

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        task_id = progress.add_task(
            f"  Batch {batch_num} — {batch_label}", total=len(jobs)
        )
        results = await asyncio.gather(*[
            run_job(
                job=j,
                token=token,
                output_root=output_root,
                skip_existing=skip_existing,
                semaphore=semaphore,
                progress=progress,
                task_id=task_id,
                verbose=verbose,
            )
            for j in jobs
        ])

    results = list(results)

    # ── Post-batch PNG validation ──
    for r in results:
        if r.status == "ok":
            out_file = output_root / r.problem_id / f"eraser-{r.cloud}.png"
            ok, reason = validate_png(out_file)
            if not ok:
                # Downgrade to error — PNG was written but is invalid
                r.status = "error"
                r.detail = f"PNG validation failed: {reason}"
            else:
                r.file_bytes = out_file.stat().st_size

    # ── Batch summary table ──
    ok_count  = sum(1 for r in results if r.status == "ok")
    err_count = sum(1 for r in results if r.status == "error")
    skp_count = sum(1 for r in results if r.status == "skipped")

    table = Table(show_lines=False, box=None, padding=(0, 1))
    table.add_column("",           no_wrap=True, width=2)
    table.add_column("Problem",    style="cyan",  no_wrap=True)
    table.add_column("Cloud",      style="green", no_wrap=True)
    table.add_column("Time",       no_wrap=True)
    table.add_column("Size",       no_wrap=True)
    table.add_column("Detail",     overflow="fold")

    for r in sorted(results, key=lambda x: (x.problem_id, x.cloud)):
        if r.status == "ok":
            icon = "[green]✓[/green]"
            size = f"{r.file_bytes/1024:.1f} KB"
            detail = ""
        elif r.status == "skipped":
            icon = "[dim]⏭[/dim]"
            size = f"{r.file_bytes/1024:.1f} KB" if r.file_bytes else "-"
            detail = "[dim]already exists[/dim]"
        else:
            icon = "[red]✗[/red]"
            size = "-"
            detail = f"[red]{r.detail[:90]}[/red]"
        table.add_row(icon, r.problem_id, r.cloud, f"{r.elapsed:.1f}s", size, detail)

    console.print(table)

    overall = done_so_far + len(jobs)
    status_color = "green" if err_count == 0 else "red"
    console.print(
        f"  [{status_color}]Batch {batch_num} result:[/{status_color}] "
        f"[green]{ok_count} ok[/green]  "
        f"[dim]{skp_count} skipped[/dim]  "
        f"[{'red' if err_count else 'dim'}]{err_count} errors[/{'red' if err_count else 'dim'}]  "
        f"[dim]│ overall progress: {overall}/{total_jobs}[/dim]"
    )

    return results


# ─── Batch planner ─────────────────────────────────────────────────────────────

def make_batches(
    jobs:        list[DiagramJob],
    batch_size:  int,         # number of *problems* per batch (not jobs)
) -> list[tuple[str, list[DiagramJob]]]:
    """
    Group jobs into batches of `batch_size` problems.
    Each problem has up to 3 cloud variants — a batch of N problems = N*3 jobs max.
    Returns list of (label, jobs) tuples.
    """
    # Preserve insertion order of problem IDs
    seen:     dict[str, list[DiagramJob]] = {}
    for j in jobs:
        seen.setdefault(j.problem_id, []).append(j)

    problem_ids = list(seen.keys())
    batches: list[tuple[str, list[DiagramJob]]] = []
    for i in range(0, len(problem_ids), batch_size):
        chunk   = problem_ids[i : i + batch_size]
        label   = ", ".join(chunk)
        batch_jobs = [j for pid in chunk for j in seen[pid]]
        batches.append((label, batch_jobs))
    return batches


# ─── Duplicate copy helper ──────────────────────────────────────────────────────

def handle_duplicates(output_root: Path) -> None:
    import shutil
    for target_id, source_id in DUPLICATE_MAP.items():
        src_dir = output_root / source_id
        dst_dir = output_root / target_id
        dst_dir.mkdir(parents=True, exist_ok=True)
        for cloud in ("aws", "gcp", "azure"):
            src_png = src_dir / f"eraser-{cloud}.png"
            dst_png = dst_dir / f"eraser-{cloud}.png"
            if src_png.exists():
                shutil.copy2(src_png, dst_png)
                console.print(f"[dim]  copied {src_png.name} → {dst_dir.name}/[/dim]")
            else:
                console.print(
                    f"[yellow]  ⚠ source not found for duplicate: {src_png}[/yellow]"
                )


# ─── Interactive continue prompt ───────────────────────────────────────────────

def ask_continue(batch_num: int, next_label: str, err_count: int, auto: bool) -> bool:
    """
    Return True to continue to the next batch, False to stop.
    In auto mode always continues (unless there were errors and --stop-on-error).
    """
    if auto:
        return True
    console.print()
    prompt = (
        f"[bold]Continue to batch {batch_num + 1}[/bold] ({next_label})? "
        "[cyan][y][/cyan]/[red]n[/red] → "
    )
    try:
        answer = console.input(prompt).strip().lower()
    except (KeyboardInterrupt, EOFError):
        console.print("\n[yellow]Interrupted.[/yellow]")
        return False
    return answer in ("", "y", "yes")


# ─── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Batch-generate Eraser.io cloud architecture diagrams",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Batched workflow
────────────────
Jobs are grouped into batches of N problems (--batch-size, default 2).
Each batch runs with up to --concurrency parallel API calls (default 5).
After every batch the script validates the PNGs and prints a summary.
You are then prompted to continue to the next batch — or use --auto to
skip all prompts and run fully unattended.

Examples
────────
  # Step 1 — smoke test auth and response shape (no quota spent):
  python eraser_batch_diagrams.py --probe

  # Step 2 — dry-run to see the full plan:
  python eraser_batch_diagrams.py --dry-run

  # Step 3 — test one problem first:
  python eraser_batch_diagrams.py --filter spotify

  # Step 4 — run everything, 5 concurrent, 2 problems per batch, confirm each:
  python eraser_batch_diagrams.py --concurrency 5 --batch-size 2

  # Fully unattended run (CI/CD):
  python eraser_batch_diagrams.py --concurrency 5 --batch-size 3 --auto

  # Resume without re-generating existing PNGs:
  python eraser_batch_diagrams.py --concurrency 5 --skip-existing --auto

  # Stop immediately if any job in a batch fails:
  python eraser_batch_diagrams.py --stop-on-error
""",
    )
    parser.add_argument("--api-key",       default=os.getenv("ERASER_API_KEY"),
                        help="Eraser API token  (default: $ERASER_API_KEY)")
    parser.add_argument("--output-dir",    default="apps/frontend/public/diagrams",
                        help="Root output directory for PNGs")
    parser.add_argument("--filter",        default="",
                        help="Only process problem IDs containing this substring")
    parser.add_argument("--cloud",         choices=["aws", "gcp", "azure", "all"],
                        default="all",
                        help="Limit to one cloud provider")
    parser.add_argument("--concurrency",   type=int, default=5,
                        help="Parallel API calls within each batch (default: 5)")
    parser.add_argument("--batch-size",    type=int, default=2,
                        help="Number of *problems* per batch (default: 2 → 6 jobs/batch)")
    parser.add_argument("--auto",          action="store_true",
                        help="Skip inter-batch confirmation prompts (unattended mode)")
    parser.add_argument("--stop-on-error", action="store_true",
                        help="Abort remaining batches if any job in a batch fails")
    parser.add_argument("--skip-existing", action="store_true",
                        help="Skip PNG files that already exist and are valid on disk")
    parser.add_argument("--dry-run",       action="store_true",
                        help="Print the full batch plan without making any API calls")
    parser.add_argument("--probe",         action="store_true",
                        help="Fire one test call, print full raw response, then exit")
    parser.add_argument("--verbose",       action="store_true",
                        help="Print imageUrl for every successfully generated diagram")
    parser.add_argument("--no-duplicates", action="store_true",
                        help="Skip the final step that copies alias problem sets")
    args = parser.parse_args()

    if not args.api_key and not args.dry_run and not args.probe:
        console.print(
            "[bold red]Error:[/bold red] ERASER_API_KEY not set.\n"
            "  export ERASER_API_KEY=your_token_here\n"
            "  or pass: --api-key YOUR_TOKEN\n\n"
            "  Tip: run [bold]--probe[/bold] first to verify auth and response shape."
        )
        sys.exit(1)

    # ── Probe ──
    if args.probe:
        await probe(args.api_key)
        return

    output_root = Path(args.output_dir)

    # ── Filter job list ──
    jobs: list[DiagramJob] = list(ALL_JOBS)
    if args.filter:
        jobs = [j for j in jobs if args.filter.lower() in j.problem_id.lower()]
    if args.cloud != "all":
        jobs = [j for j in jobs if j.cloud == args.cloud]

    batches = make_batches(jobs, args.batch_size)
    total_jobs     = len(jobs)
    total_batches  = len(batches)
    total_problems = len({j.problem_id for j in jobs})

    # ── Header ──
    console.print()
    console.rule("[bold cyan]Eraser Diagram Batch Generator[/bold cyan]")
    console.print(f"  Output root   : {output_root.resolve()}")
    console.print(f"  Problems      : {total_problems}")
    console.print(f"  Total jobs    : {total_jobs}")
    console.print(f"  Batches       : {total_batches}  ({args.batch_size} problems × 3 clouds each)")
    console.print(f"  Concurrency   : {args.concurrency} parallel calls per batch")
    console.print(f"  Mode          : {'AUTO (unattended)' if args.auto else 'INTERACTIVE (confirm each batch)'}")
    console.print(f"  Stop on error : {args.stop_on_error}")
    console.print(f"  Skip existing : {args.skip_existing}")
    console.print()

    # ── Dry run ──
    if args.dry_run:
        for b_num, (label, b_jobs) in enumerate(batches, 1):
            table = Table(
                title=f"Batch {b_num} — {label}",
                show_lines=False, box=None,
            )
            table.add_column("#",           no_wrap=True, width=3)
            table.add_column("Problem ID",  style="cyan")
            table.add_column("Cloud",       style="green")
            table.add_column("Output File", style="dim", overflow="fold")
            for idx, j in enumerate(b_jobs, 1):
                table.add_row(
                    str(idx), j.problem_id, j.cloud,
                    str(output_root / j.problem_id / j.filename),
                )
            console.print(table)
        console.print(
            f"[dim]Total: {total_batches} batches, {total_jobs} jobs[/dim]"
        )
        return

    # ── Run batches ──
    all_results:    list[JobResult] = []
    grand_ok        = 0
    grand_err       = 0
    grand_skipped   = 0
    done_jobs       = 0
    aborted         = False

    for b_num, (label, b_jobs) in enumerate(batches, 1):
        results = await run_batch(
            batch_num     = b_num,
            batch_label   = label,
            jobs          = b_jobs,
            token         = args.api_key,
            output_root   = output_root,
            skip_existing = args.skip_existing,
            concurrency   = args.concurrency,
            verbose       = args.verbose,
            total_jobs    = total_jobs,
            done_so_far   = done_jobs,
        )
        all_results.extend(results)
        done_jobs   += len(b_jobs)

        b_ok  = sum(1 for r in results if r.status == "ok")
        b_err = sum(1 for r in results if r.status == "error")
        b_skp = sum(1 for r in results if r.status == "skipped")
        grand_ok      += b_ok
        grand_err     += b_err
        grand_skipped += b_skp

        # Stop on error?
        if b_err > 0 and args.stop_on_error:
            console.print(
                f"\n[bold red]⛔ Stopping:[/bold red] {b_err} error(s) in batch {b_num} "
                f"and --stop-on-error is set."
            )
            aborted = True
            break

        # Ask to continue?
        if b_num < total_batches:
            next_label = batches[b_num][0]   # b_num is 1-based; batches[b_num] is next
            if not ask_continue(b_num, next_label, b_err, args.auto):
                console.print("[yellow]Stopped by user.[/yellow]")
                aborted = True
                break

    # ── Grand summary ──
    console.print()
    console.rule("[bold]Final Summary[/bold]")
    status_color = "red" if grand_err else "green"
    console.print(
        f"  Batches run  : {min(b_num, total_batches)}/{total_batches}"
        f"{'  [yellow](aborted early)[/yellow]' if aborted else ''}"
    )
    console.print(f"  Jobs run     : {done_jobs}/{total_jobs}")
    console.print(f"  [green]✓ OK         : {grand_ok}[/green]")
    console.print(f"  [dim]⏭ Skipped    : {grand_skipped}[/dim]")
    console.print(f"  [{status_color}]✗ Errors     : {grand_err}[/{status_color}]")

    # Show all errors compactly
    errors = [r for r in all_results if r.status == "error"]
    if errors:
        console.print()
        err_table = Table(title="All Errors", show_lines=False, box=None)
        err_table.add_column("Problem",  style="cyan", no_wrap=True)
        err_table.add_column("Cloud",    style="green", no_wrap=True)
        err_table.add_column("Error",    overflow="fold")
        for r in errors:
            err_table.add_row(r.problem_id, r.cloud, r.detail)
        console.print(err_table)
        console.print(
            "\n[dim]Tip: fix the errors above then re-run with "
            "[bold]--skip-existing[/bold] to resume without regenerating successful PNGs.[/dim]"
        )

    # ── Duplicates ──
    if not args.no_duplicates and grand_ok > 0:
        console.print()
        console.rule("Copying alias diagram sets")
        handle_duplicates(output_root)

    console.rule()
    if grand_err or aborted:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
