// Microservices patterns categories, category map, and pattern topics

export const microservicesCategories = [
  { id: 'communication', name: 'Service Communication', icon: 'globe', color: '#3b82f6' },
  { id: 'resilience', name: 'Resilience Patterns', icon: 'shield', color: '#ef4444' },
  { id: 'data', name: 'Data Management', icon: 'database', color: '#8b5cf6' },
  { id: 'deployment', name: 'Deployment & Migration', icon: 'layers', color: '#f59e0b' },
];

export const microservicesCategoryMap = {
  'api-gateway-pattern': 'communication',
  'service-discovery': 'communication',
  'circuit-breaker': 'resilience',
  'saga-pattern': 'data',
  'bulkhead-pattern': 'resilience',
  'retry-pattern': 'resilience',
  'sidecar-pattern': 'deployment',
  'strangler-fig': 'deployment',
  'bff-pattern': 'communication',
  'event-driven-architecture': 'data',
  'cqrs': 'data',
  'configuration-externalization': 'deployment',
};

export const microservicesPatterns = [
  {
    id: 'api-gateway-pattern',
    title: 'API Gateway Pattern',
    icon: 'globe',
    color: '#3b82f6',
    questions: 10,
    description: 'Request routing, composition, protocol translation, rate limiting, and centralized authentication for microservices.',
    concepts: [
      'Request routing and load balancing',
      'API composition and aggregation',
      'Protocol translation (REST, gRPC, WebSocket)',
      'Rate limiting and throttling',
      'Authentication and authorization offloading',
      'Request/response transformation',
      'Cross-cutting concerns centralization',
      'Edge functions and middleware chains',
    ],
    tips: [
      'Keep the gateway thin — avoid placing business logic here; it should be a routing and cross-cutting concern layer only',
      'Implement request correlation IDs at the gateway level so every downstream call can be traced end-to-end',
      'Use circuit breakers inside the gateway to prevent a single failing service from degrading all routes',
      'Version your APIs at the gateway layer (e.g., /v1/users, /v2/users) rather than inside each service',
      'Cache frequently requested, rarely changing responses at the gateway to reduce backend load',
      'Deploy the gateway in multiple availability zones — it is a single point of entry and must not become a single point of failure',
      'Monitor gateway latency percentiles (p50, p95, p99) separately from backend latency to isolate bottlenecks',
    ],

    introduction: `The API Gateway pattern provides a single entry point for all client requests in a microservices architecture. Instead of having clients call dozens of individual services directly, the gateway acts as a reverse proxy that routes requests, aggregates responses, and handles cross-cutting concerns like authentication, rate limiting, and logging.

At companies like Netflix (Zuul/Spring Cloud Gateway), Amazon (API Gateway), and Kong, the gateway is the front door to the entire platform. It decouples clients from the internal service topology, allowing teams to refactor, split, or merge services without breaking client contracts.

Understanding the API Gateway pattern is essential for system design interviews because it appears in virtually every microservices discussion. Interviewers expect you to reason about trade-offs such as single point of failure, added latency, and the risk of the gateway becoming a monolithic bottleneck.`,

    keyQuestions: [
      {
        question: 'How does an API Gateway differ from a reverse proxy or load balancer?',
        answer: `**Reverse Proxy**: Forwards requests to a single upstream service. Operates at the transport layer (L4) or HTTP layer (L7). Does not understand application semantics.

**Load Balancer**: Distributes traffic across multiple instances of the same service. Focuses on health checking and traffic distribution.

**API Gateway**: A superset of both, plus application-aware features:

\`\`\`
Client Request
      |
      v
+---------------------+
|    API Gateway       |
|---------------------|
| 1. Auth/JWT verify  |
| 2. Rate limiting    |
| 3. Request routing  |
| 4. Protocol xlate   |
| 5. Aggregation      |
| 6. Response xform   |
| 7. Logging/metrics  |
+---------------------+
      |         |         |
      v         v         v
  Service A  Service B  Service C
  (REST)     (gRPC)     (GraphQL)
\`\`\`

**Key differentiators**:
- **API composition**: Gateway can fan-out to multiple services and merge responses into one payload
- **Protocol translation**: Accept REST from client, call gRPC internally
- **Schema validation**: Reject malformed requests before they hit backends
- **Client-specific shaping**: Return different fields for mobile vs web

**Interview tip**: Emphasize that the gateway is application-aware and handles concerns that a plain reverse proxy cannot.`
      },
      {
        question: 'What are the risks of the API Gateway becoming a bottleneck, and how do you mitigate them?',
        answer: `**Risk 1 — Single point of failure**:
If the gateway goes down, the entire system is unreachable.

Mitigation:
- Deploy across multiple AZs behind a cloud load balancer or DNS failover
- Run at least 3 instances with health checking
- Use blue/green or canary deployments for gateway updates

**Risk 2 — Latency overhead**:
Every request pays an extra network hop and processing time.

Mitigation:
- Keep the gateway stateless so it scales horizontally
- Use async I/O (event-driven architecture like Envoy or Nginx)
- Avoid heavy computation; offload to backend services

**Risk 3 — Monolithic gateway**:
Over time, teams add business logic, transformations, and orchestration until the gateway becomes a new monolith.

Mitigation:
- Enforce strict gateway responsibilities: routing, auth, rate limiting, logging
- Use a "Backend for Frontend" (BFF) pattern to separate client-specific aggregation from the core gateway
- Code reviews that flag business logic in gateway code

\`\`\`
Architecture: Multi-AZ Gateway

   DNS / Cloud LB
        |
   +----+----+
   |         |
AZ-1       AZ-2
Gateway    Gateway
  |   \\      |   \\
Svc-A Svc-B Svc-A Svc-B
\`\`\`

**Risk 4 — Coupling**:
Gateway routing rules create implicit coupling to service URLs and contracts.

Mitigation:
- Use service discovery (Consul, Kubernetes DNS) instead of hardcoded URLs
- Version routes independently of service deployments
- Automate route registration so services self-register`
      },
      {
        question: 'How do you implement API composition at the gateway?',
        answer: `**API composition** aggregates data from multiple services into a single response. For example, a product page needs data from the Product Service, Inventory Service, and Reviews Service.

**Sequential composition**:
\`\`\`
Client --> Gateway
             |
             +--> Product Service   (get product)
             |         |
             |         v
             +--> Inventory Service (get stock for product)
             |         |
             |         v
             +--> Reviews Service   (get reviews for product)
             |
             v
        Merge & Return to Client
\`\`\`
Latency = sum of all calls. Simple but slow.

**Parallel composition**:
\`\`\`
Client --> Gateway
             |
             +----+----+----+
             |    |    |    |
             v    v    v    v
           Prod  Inv  Rev  Price
             |    |    |    |
             +----+----+----+
             |
             v
        Merge & Return to Client
\`\`\`
Latency = max(all calls). Faster but requires independent data.

**Hybrid**: Fan out independent calls in parallel, then make dependent calls sequentially.

**Error handling strategies**:
- **Fail fast**: If any service fails, return error immediately
- **Partial response**: Return available data, mark missing fields as null
- **Fallback**: Use cached or default values for failed calls

**Best practices**:
- Set per-service timeouts shorter than client timeout
- Use circuit breakers per downstream service
- Return partial responses with degradation headers rather than failing entirely
- Cache stable data (product details) to avoid repeated calls`
      },
      {
        question: 'Compare popular API Gateway implementations and when to choose each.',
        answer: `**Kong (Open Source / Enterprise)**:
- Built on Nginx + Lua (OpenResty)
- Plugin ecosystem for auth, rate limiting, logging
- Best for: Teams wanting open-source with enterprise support
- Throughput: ~30K RPS per node

**AWS API Gateway**:
- Fully managed, serverless
- Native integration with Lambda, IAM, Cognito
- Best for: AWS-native serverless architectures
- Pay-per-request pricing (no idle cost)
- Limitation: 29-second timeout, 10MB payload

**Envoy Proxy**:
- C++ high-performance proxy
- Native gRPC, HTTP/2 support
- Best for: Service mesh (Istio data plane), high-throughput systems
- Throughput: ~100K+ RPS per node

**Spring Cloud Gateway**:
- Java/Spring ecosystem
- Reactive (non-blocking) architecture
- Best for: Java microservices teams already using Spring Boot
- Predicates and filters DSL

\`\`\`
Decision Matrix:

Need         | Kong  | AWS GW | Envoy | Spring
-------------|-------|--------|-------|-------
Open source  |  Yes  |   No   |  Yes  |  Yes
Serverless   |  No   |  Yes   |  No   |  No
gRPC native  |  No   |   No   |  Yes  |  Ltd
Plugin eco   | Rich  | Medium |  Med  |  Med
Managed      | Opt.  |  Yes   |  No   |  No
Performance  | High  |  Med   | V.High|  Med
\`\`\`

**Interview guidance**: State the trade-off you are making. For example: "I would choose Envoy for a high-throughput, polyglot environment because it handles gRPC and HTTP/2 natively and serves as the data plane if we adopt Istio later."`
      },
    ],

    dataModel: {
      description: 'API Gateway architecture and request flow',
      schema: `API Gateway Request Flow:

  Client (Web/Mobile/IoT)
         |
         v
  +------+-------+
  |  API Gateway  |
  |--------------|
  | - TLS term.  |
  | - Auth check |
  | - Rate limit |
  | - Route match|
  | - Req xform  |
  +------+-------+
    |    |    |
    v    v    v
  +--+ +--+ +--+
  |A | |B | |C |  <-- Microservices
  +--+ +--+ +--+

Route Configuration:
  /api/v1/users/**     --> User Service (port 8001)
  /api/v1/products/**  --> Product Service (port 8002)
  /api/v1/orders/**    --> Order Service (port 8003)
  /api/v1/search/**    --> Search Service (port 8004)

Rate Limiting Config:
  Global:     1000 req/s
  Per-user:   100 req/s
  Per-route:  Configurable per service
  Burst:      2x sustained rate

Auth Flow:
  1. Extract JWT from Authorization header
  2. Validate signature against public key
  3. Check token expiry
  4. Extract claims (user_id, roles, scopes)
  5. Attach user context to downstream headers
  6. Service reads X-User-Id, X-Roles headers`
    },
  },

  {
    id: 'service-discovery',
    title: 'Service Discovery',
    icon: 'globe',
    color: '#3b82f6',
    questions: 8,
    description: 'Client-side vs server-side discovery, service registries (Consul, Eureka, etcd), and health checking strategies.',
    concepts: [
      'Client-side discovery pattern',
      'Server-side discovery pattern',
      'Service registry (Consul, Eureka, etcd)',
      'Health checking and heartbeats',
      'DNS-based discovery',
      'Self-registration vs third-party registration',
      'Load balancing integration',
    ],
    tips: [
      'In Kubernetes environments, DNS-based service discovery via kube-dns or CoreDNS is often sufficient; avoid adding a separate registry unless you need cross-cluster discovery',
      'Always implement health checks that test actual readiness (database connectivity, dependency availability) rather than simple liveness pings',
      'Use TTL-based deregistration so that crashed instances are removed even if they cannot send a deregister request',
      'Client-side discovery gives more control (e.g., latency-weighted routing) but couples clients to the registry',
      'Server-side discovery is simpler for clients but adds a load balancer hop and potential single point of failure',
      'Combine service discovery with circuit breakers so that unhealthy instances are removed from the pool before the registry catches up',
    ],

    introduction: `In a microservices architecture, services are deployed across multiple hosts and containers, often scaling up and down dynamically. Service discovery is the mechanism by which one service finds the network location (IP address and port) of another service it needs to call.

Without service discovery, you would hardcode IP addresses or maintain static configuration files — both of which break instantly in elastic cloud environments. Service discovery automates this process, enabling services to register themselves when they start, deregister when they stop, and query the registry to find each other.

Interviewers probe this topic to test your understanding of distributed systems coordination. Key discussion points include consistency of the registry (CP vs AP), health checking strategies, and the difference between client-side and server-side discovery patterns.`,

    keyQuestions: [
      {
        question: 'What is the difference between client-side and server-side service discovery?',
        answer: `**Client-Side Discovery**:
The client queries the service registry directly and selects an instance using a load-balancing algorithm.

\`\`\`
  Service A           Service Registry
     |                (Consul / Eureka)
     |--- Query ----------->|
     |<-- [B:8001,          |
     |     B:8002,          |
     |     B:8003] ---------|
     |
     |--- LB select (round-robin, random, least-conn)
     |
     +--- Direct call --> Service B (8002)
\`\`\`

Pros:
- No extra hop (lower latency)
- Client controls LB algorithm (can do latency-aware, sticky sessions)
- Fewer infrastructure components

Cons:
- Every client needs registry-aware library (language coupling)
- LB logic duplicated across services
- Registry becomes a hard dependency for every client

Examples: Netflix Ribbon + Eureka, gRPC client-side LB

**Server-Side Discovery**:
The client sends requests to a load balancer/router that queries the registry and forwards the request.

\`\`\`
  Service A     Load Balancer     Registry     Service B
     |              |                |              |
     |-- Request -->|                |              |
     |              |-- Query ------>|              |
     |              |<- [B:8001,     |              |
     |              |    B:8002] ----|              |
     |              |                               |
     |              |--- Forward --> Service B:8001 |
     |<-- Response--|<------------- Response -------|
\`\`\`

Pros:
- Clients are simple (just call a known endpoint)
- LB logic centralized, language-agnostic
- Easier to add cross-cutting concerns (TLS, auth)

Cons:
- Extra network hop (higher latency)
- Load balancer is a potential bottleneck/SPOF
- More infrastructure to manage

Examples: AWS ALB + ECS, Kubernetes kube-proxy + CoreDNS, Consul Connect

**Interview tip**: In Kubernetes, server-side discovery via ClusterIP services is the default and simplest approach. Mention client-side only when you need fine-grained control.`
      },
      {
        question: 'How do service registries maintain consistency and handle failures?',
        answer: `**Consistency models vary by registry**:

**Consul** (CP by default):
- Uses Raft consensus for strong consistency
- Writes require leader acknowledgment + quorum
- Reads can be stale (default) or strongly consistent
- If the leader fails, a new election takes ~300ms

**Eureka** (AP):
- Peer-to-peer replication, no leader
- Every node accepts writes, syncs to peers asynchronously
- During network partition, instances continue serving stale data
- Self-preservation mode: stops evicting instances if too many heartbeats missing simultaneously

**etcd** (CP):
- Raft consensus, strongly consistent
- Foundation of Kubernetes service discovery
- Watches API for efficient change notification

\`\`\`
Consul Raft Consensus (3-node cluster):

  +--------+     +--------+     +--------+
  | Leader |<--->|Follower|<--->|Follower|
  +--------+     +--------+     +--------+
       |
  Write quorum = 2 of 3 must ACK
  Read: default stale (any node), consistent (leader)

Failure scenario:
  - 1 node down: cluster operates (2/3 quorum)
  - 2 nodes down: cluster read-only (no quorum)
  - Leader down: new election in ~300ms
\`\`\`

**Health checking approaches**:

1. **TTL-based**: Service sends heartbeat every N seconds; registry deregisters after 3x TTL with no heartbeat
2. **Active probe**: Registry sends HTTP/TCP/gRPC health checks to each instance
3. **Script check**: Registry runs a custom health check script on the service host

**Failure handling best practices**:
- Use both liveness (is the process alive?) and readiness (can it serve traffic?) checks
- Set deregistration delay (e.g., 90 seconds) to tolerate temporary network blips
- Implement graceful shutdown: deregister before stopping, drain in-flight requests
- Cache the last known good service list on each client so discovery works even if the registry is temporarily unavailable`
      },
      {
        question: 'How does service discovery work in Kubernetes?',
        answer: `Kubernetes has built-in service discovery through three mechanisms:

**1. ClusterIP Services (most common)**:
\`\`\`
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 8080
\`\`\`

- Kubernetes assigns a virtual IP (ClusterIP)
- DNS: user-service.namespace.svc.cluster.local
- kube-proxy programs iptables/IPVS rules on every node
- Requests to ClusterIP are load-balanced across healthy pods

**2. Headless Services (client-side discovery)**:
\`\`\`
spec:
  clusterIP: None  # Headless
\`\`\`
- DNS returns all pod IPs directly (no virtual IP)
- Client decides which pod to call
- Used for stateful workloads (databases, Kafka)

**3. External service discovery (cross-cluster)**:
- Consul Connect, Istio multi-cluster, AWS Cloud Map
- Needed when services span multiple Kubernetes clusters or hybrid environments

\`\`\`
Kubernetes Service Discovery Flow:

Pod A                CoreDNS              kube-proxy          Pod B
  |                     |                     |                 |
  |-- DNS lookup ------>|                     |                 |
  |   "user-service"    |                     |                 |
  |<-- ClusterIP -------|                     |                 |
  |   10.96.0.42        |                     |                 |
  |                     |                     |                 |
  |-- TCP connect to 10.96.0.42:80 --------->|                 |
  |                     |       iptables/IPVS |                 |
  |                     |       DNAT to       |                 |
  |                     |       10.244.1.5:8080 ---------->    |
  |<------------------------------ Response ------------------|
\`\`\`

**Readiness Gates**:
- Pods only receive traffic when readiness probe passes
- Failing readiness removes the pod from Endpoints (but does not restart it)
- Liveness probe failure restarts the pod`
      },
      {
        question: 'How do you handle service discovery in a multi-region or hybrid cloud deployment?',
        answer: `**Challenge**: Services are deployed across multiple regions, cloud providers, or on-prem data centers. A single Kubernetes cluster or Consul datacenter is no longer sufficient.

**Approach 1 — Federated Service Registry**:
\`\`\`
Region US-East          Region EU-West
+------------+         +------------+
| Consul DC1 |<------->| Consul DC2 |
|  (primary) |  WAN    | (primary)  |
|  gossip    |  gossip |            |
+-----+------+         +-----+------+
      |                       |
  Services               Services
  in US-East              in EU-West
\`\`\`

Consul supports multi-datacenter federation out of the box:
- WAN gossip pool connects datacenters
- Services can query across DCs: user-service.service.eu-west.consul
- Prepared queries enable failover: prefer local DC, fall back to remote

**Approach 2 — Global Load Balancer + Regional Discovery**:
\`\`\`
     Client
       |
   Global DNS (Route 53 / CloudFlare)
   latency-based routing
       |
  +----+----+
  |         |
US-East   EU-West
Regional  Regional
Gateway   Gateway
  |         |
Local     Local
Discovery Discovery
\`\`\`

Each region runs its own discovery independently. Global DNS routes clients to the nearest region. Cross-region calls use explicit region-qualified URLs.

**Approach 3 — Service Mesh (Istio Multi-Cluster)**:
- Istio control plane manages service identity and routing across clusters
- mTLS secures cross-cluster communication
- Locality-aware load balancing prefers local, then regional, then remote instances

**Best practices for multi-region discovery**:
- Prefer local calls whenever possible (latency, cost)
- Implement region-aware health checking (mark remote instances as degraded, not down)
- Use locality-weighted routing: 80% local, 20% secondary
- Plan for region isolation: each region must survive independently
- Cache remote service endpoints with longer TTL to tolerate brief connectivity loss`
      },
    ],

    dataModel: {
      description: 'Service discovery architecture',
      schema: `Service Discovery Architecture:

  +-------------------+
  | Service Registry  |
  | (Consul / Eureka) |
  +---------+---------+
   ^   ^   ^   |   |   |
   |   |   |   v   v   v
 Reg  Reg  Reg  Query Query Query
   |   |   |   |   |   |
  Svc Svc Svc Svc Svc Svc
   A   B   C   D   E   F

Registration Record:
  {
    service_name: "user-service",
    instance_id:  "user-service-i-abc123",
    address:      "10.0.1.42",
    port:         8080,
    health_check: "/health",
    tags:         ["v2.1", "us-east-1"],
    metadata: {
      version: "2.1.0",
      protocol: "grpc"
    }
  }

Health Check States:
  passing  --> instance receives traffic
  warning  --> instance receives traffic (with alert)
  critical --> instance removed from pool

DNS Resolution:
  user-service.service.consul --> 10.0.1.42, 10.0.1.43, 10.0.1.44
  user-service.service.us-east.consul --> 10.0.1.42 (region-scoped)`
    },
  },

  {
    id: 'circuit-breaker',
    title: 'Circuit Breaker Pattern',
    icon: 'shield',
    color: '#ef4444',
    questions: 10,
    description: 'Closed/Open/Half-open states, cascading failure prevention, and implementations with Hystrix and Resilience4j.',
    concepts: [
      'Closed, Open, and Half-open states',
      'Failure threshold and sliding window',
      'Cascading failure prevention',
      'Fallback strategies',
      'Monitoring and alerting on state transitions',
      'Hystrix and Resilience4j implementations',
      'Timeout management',
      'Bulkhead integration',
    ],
    tips: [
      'Set circuit breaker thresholds based on observed error rates, not arbitrary numbers — analyze production failure patterns first',
      'Always provide meaningful fallback responses: cached data, default values, or graceful degradation rather than generic errors',
      'Distinguish between transient failures (timeouts, 503s) and permanent failures (404s, 400s) — only trip the breaker for transient ones',
      'Log every state transition (CLOSED->OPEN, OPEN->HALF_OPEN, HALF_OPEN->CLOSED) with timestamps and context for debugging',
      'Use a sliding window (count-based or time-based) rather than simple counters to avoid slow-leak failures keeping the breaker closed',
      'In the HALF_OPEN state, allow only a small number of trial requests to probe whether the downstream service has recovered',
      'Combine circuit breakers with retries carefully: retries happen inside the breaker; once the breaker opens, retries stop immediately',
    ],

    introduction: `The Circuit Breaker pattern prevents an application from repeatedly trying to call a service that is likely to fail. Just like an electrical circuit breaker that trips to prevent a house fire, this pattern detects failures and short-circuits requests to a failing service, giving it time to recover.

Without circuit breakers, a single failing service can bring down an entire microservices system through cascading failures. When Service A depends on Service B, and Service B is slow or down, Service A's threads get blocked waiting for responses. As threads exhaust, Service A stops responding, and the failure cascades to every service that depends on A.

Netflix pioneered this pattern at scale with Hystrix, handling billions of requests daily across hundreds of services. While Hystrix is now in maintenance mode, the pattern lives on in Resilience4j, Istio, and Envoy. In interviews, expect to draw the state machine, discuss threshold tuning, and explain how the pattern prevents cascading failures.`,

    keyQuestions: [
      {
        question: 'Explain the circuit breaker state machine and transitions.',
        answer: `**Three states**:

\`\`\`
             success threshold met
         +----------- HALF_OPEN <----------+
         |           (probe)               |
         |              |                  |
         |         trial failure           |
         |              |             timeout expires
         v              v                  |
      CLOSED -------> OPEN ----------------+
    (normal)    failure     (fail fast)
               threshold
                 met
\`\`\`

**CLOSED (normal operation)**:
- All requests pass through to the downstream service
- Failures are counted in a sliding window
- When failure count or rate exceeds threshold, transition to OPEN
- Example: >50% failures in last 10 requests -> OPEN

**OPEN (fail fast)**:
- All requests are immediately rejected with a fallback response
- No requests reach the downstream service
- A timer starts (e.g., 30 seconds)
- When timer expires, transition to HALF_OPEN

**HALF_OPEN (probe)**:
- A limited number of trial requests (e.g., 3) are sent to the downstream service
- If trial requests succeed, transition to CLOSED
- If any trial request fails, transition back to OPEN (reset timer)

**Sliding window types**:

1. **Count-based**: Track last N requests
   - Trip at: 5 failures out of last 10 calls
   - Pros: Simple, predictable
   - Cons: Slow to react during low traffic

2. **Time-based**: Track requests in last N seconds
   - Trip at: >50% failure rate in last 60 seconds, minimum 10 calls
   - Pros: Adapts to traffic volume
   - Cons: More complex, needs minimum call threshold

**Configuration example (Resilience4j)**:
- failureRateThreshold: 50 (percent)
- slidingWindowSize: 10 (calls)
- waitDurationInOpenState: 30s
- permittedNumberOfCallsInHalfOpenState: 3
- minimumNumberOfCalls: 5 (before evaluating)`
      },
      {
        question: 'How do cascading failures happen and how do circuit breakers prevent them?',
        answer: `**Cascading failure scenario** (without circuit breakers):

\`\`\`
Step 1: Payment Service becomes slow (DB overloaded)

  Order Service         Payment Service
  Thread Pool: 200      (DB overloaded)
       |                     |
       |--- POST /pay ------>| 30s timeout...
       |--- POST /pay ------>| 30s timeout...
       |--- POST /pay ------>| 30s timeout...
       ...200 threads waiting...

Step 2: Order Service thread pool exhausted

  API Gateway        Order Service      Payment Service
       |             (all threads       (still slow)
       |--- Order -->| blocked)
       |             | TIMEOUT
       |<-- 503 -----|

Step 3: Cascade continues upstream

  Web App     Gateway      Order Svc   Payment Svc
    |            |           (down)      (slow)
    |-- Req -->  | TIMEOUT
    |<- Error ---|
    User sees: "Something went wrong"
\`\`\`

**With circuit breakers**:

\`\`\`
Step 1: Payment Service becomes slow

  Order Service         Payment Service
  Circuit: CLOSED       (DB overloaded)
       |                     |
       |--- POST /pay ------>| timeout (failure 1)
       |--- POST /pay ------>| timeout (failure 2)
       ...5 failures...
       Circuit: OPEN

Step 2: Circuit opens — fail fast

  Order Service         Payment Service
  Circuit: OPEN         (recovering)
       |
       |--- POST /pay
       |<-- FALLBACK: "Payment pending, try again later"
       (instant response, no waiting)
       Thread pool: still healthy

Step 3: Recovery

  30 seconds later...
  Circuit: HALF_OPEN
       |--- POST /pay ------>| Success!
       |--- POST /pay ------>| Success!
       |--- POST /pay ------>| Success!
       Circuit: CLOSED (back to normal)
\`\`\`

**Key insight**: The circuit breaker preserves the calling service's resources by failing fast instead of waiting for timeouts. This keeps Order Service healthy even when Payment Service is down.

**Defense in depth** — combine with:
- **Timeouts**: Set aggressive timeouts (e.g., 2s) so threads are not blocked for 30s
- **Bulkheads**: Isolate thread pools per dependency so a slow Payment Service does not starve threads for Inventory calls
- **Retries with backoff**: Retry transient failures but stop when circuit opens`
      },
      {
        question: 'What fallback strategies should you use when the circuit is open?',
        answer: `**Strategy 1 — Cached response**:
Return the last known good response from a local cache.
- Best for: Product catalog, user profiles, configuration
- Example: Show last cached product price when Pricing Service is down
- Risk: Stale data (mitigate with cache TTL and staleness indicators)

**Strategy 2 — Default value**:
Return a sensible default or empty response.
- Best for: Recommendations, non-critical features
- Example: Show generic "popular items" when Recommendation Service is down
- Risk: Degraded experience (but service stays up)

**Strategy 3 — Queue for later**:
Accept the request and process it asynchronously when the service recovers.
- Best for: Writes that are not time-critical (emails, analytics, logs)
- Example: Queue payment retry when Payment Service is down
- Risk: Increased latency for eventual processing

**Strategy 4 — Alternative service**:
Route to a backup or degraded version of the service.
- Best for: Critical functionality with redundant providers
- Example: Fall back to secondary payment processor
- Risk: Maintaining multiple integrations

**Strategy 5 — Graceful error**:
Return a clear error with retry guidance rather than a cryptic failure.
- Best for: When no reasonable fallback exists
- Example: "Payment processing is temporarily unavailable. Your cart is saved."
- Risk: User-facing errors (mitigate with good UX)

\`\`\`
Fallback Decision Tree:

  Circuit OPEN
       |
  Is data cacheable?
  |-- Yes --> Return cached data (Strategy 1)
  |-- No
       |
  Can we use a default?
  |-- Yes --> Return default (Strategy 2)
  |-- No
       |
  Is the operation a write?
  |-- Yes --> Queue for later (Strategy 3)
  |-- No
       |
  Is there an alternative provider?
  |-- Yes --> Route to backup (Strategy 4)
  |-- No
       |
  Return graceful error (Strategy 5)
\`\`\``
      },
      {
        question: 'Compare Hystrix and Resilience4j, and when would you use each?',
        answer: `**Hystrix** (Netflix, now in maintenance mode):
- Thread pool isolation by default (each dependency gets its own thread pool)
- Separate execution threads from calling threads
- Rich dashboard (Hystrix Dashboard + Turbine for aggregation)
- Heavy: creates threads per dependency, higher memory footprint
- Java only

**Resilience4j** (modern replacement):
- Lightweight, functional style (decorators/higher-order functions)
- Semaphore isolation by default (no extra thread pools)
- Modular: use only what you need (CircuitBreaker, RateLimiter, Retry, Bulkhead, TimeLimiter)
- Works with Java 8+, Kotlin, reactive streams (Project Reactor, RxJava)
- Better metrics integration (Micrometer, Prometheus)

**Comparison**:
\`\`\`
Feature         | Hystrix       | Resilience4j
----------------|---------------|------------------
Status          | Maintenance   | Active development
Isolation       | Thread pool   | Semaphore (default)
Overhead        | Higher        | Lower
Reactive        | RxJava only   | Reactor + RxJava
Config          | Archaius      | Spring Boot props
Metrics         | Custom        | Micrometer
Languages       | Java          | Java, Kotlin
Composition     | HystrixCommand| Decorator chaining
\`\`\`

**When to use Resilience4j** (almost always):
- Greenfield projects
- Spring Boot applications (first-class support)
- Need lightweight, modular approach
- Reactive programming

**When you might still see Hystrix**:
- Legacy Netflix OSS stack
- Existing systems not worth migrating
- Heavy thread pool isolation requirement

**Service mesh alternative** (language-agnostic):
- Istio/Envoy: Circuit breaking at the network proxy level
- No code changes required
- Configuration via DestinationRule CRDs in Kubernetes
- Best for polyglot environments where you cannot add a Java library`
      },
    ],

    dataModel: {
      description: 'Circuit breaker state machine and metrics',
      schema: `Circuit Breaker State Machine:

  CLOSED --> (failure threshold met) --> OPEN
  OPEN   --> (timeout expires)       --> HALF_OPEN
  HALF_OPEN --> (trial success)      --> CLOSED
  HALF_OPEN --> (trial failure)      --> OPEN

Metrics to Monitor:
  circuit_breaker_state{name="payment"}     gauge  (0=closed,1=open,2=half_open)
  circuit_breaker_calls_total{outcome}      counter (success, failure, not_permitted)
  circuit_breaker_failure_rate{name}        gauge  (0-100%)
  circuit_breaker_slow_call_rate{name}      gauge  (0-100%)
  circuit_breaker_state_transitions_total   counter

Configuration Per Dependency:
  payment-service:
    failureRateThreshold: 50
    slowCallRateThreshold: 80
    slowCallDurationThreshold: 2s
    slidingWindowType: COUNT_BASED
    slidingWindowSize: 10
    minimumNumberOfCalls: 5
    waitDurationInOpenState: 30s
    permittedCallsInHalfOpen: 3
    fallback: cached_or_queued`
    },
  },

  {
    id: 'saga-pattern',
    title: 'Saga Pattern',
    icon: 'database',
    color: '#8b5cf6',
    questions: 12,
    description: 'Choreography vs orchestration, distributed transactions, compensation actions, and failure handling in microservices.',
    concepts: [
      'Choreography-based sagas',
      'Orchestration-based sagas',
      'Compensating transactions',
      'Semantic locks and countermeasures',
      'Idempotency in saga steps',
      'Failure handling and partial rollback',
      'Saga execution coordinator (SEC)',
      'Event sourcing integration',
    ],
    tips: [
      'Prefer orchestration for complex sagas with many steps — choreography becomes hard to follow beyond 3-4 services',
      'Every saga step MUST have a corresponding compensating transaction; design compensation before implementation',
      'Make all saga steps idempotent because retries are inevitable in distributed systems',
      'Use semantic locks to prevent dirty reads during saga execution (e.g., mark an order as PENDING until the saga completes)',
      'Store the saga state in a persistent log so that the orchestrator can recover from crashes and resume from the last completed step',
      'Set timeouts on each saga step — a stuck step should trigger compensation rather than wait indefinitely',
      'Test failure at every step: what happens if step 3 of 5 fails? What happens if compensation for step 2 fails?',
    ],

    introduction: `The Saga pattern manages data consistency across microservices without distributed transactions. In a monolith, you wrap multiple database operations in a single ACID transaction. In microservices, each service owns its own database, so a single cross-service transaction is impossible without two-phase commit (2PC), which is slow, fragile, and locks resources.

A saga is a sequence of local transactions where each step is a transaction within a single service. If a step fails, the saga executes compensating transactions to undo the changes made by preceding steps. Think of it as "undo" rather than "rollback" — compensation is a new forward action, not a database rollback.

This pattern is critical in e-commerce (order creation spans Inventory, Payment, and Shipping services), banking (money transfers), and travel booking (flights, hotels, car rentals). Interviewers expect you to compare choreography and orchestration, design compensating transactions, and handle partial failure scenarios.`,

    keyQuestions: [
      {
        question: 'Compare choreography-based and orchestration-based sagas with a concrete example.',
        answer: `**Scenario**: Create an order that spans Order, Payment, and Inventory services.

**Choreography (event-driven)**:
Each service listens for events and publishes the next event. No central coordinator.

\`\`\`
Order Svc     Event Bus     Payment Svc    Inventory Svc
    |              |              |               |
    |--OrderCreated-->            |               |
    |              |--event------>|               |
    |              |              |--PaymentOK--->|
    |              |              |     event---->|
    |              |              |               |--InventoryReserved
    |              |<---------------------------------|
    |<--event------|              |               |
    |  (OrderConfirmed)          |               |
\`\`\`

Pros:
- Loose coupling (services only know about events, not each other)
- No single point of failure
- Simple for 2-3 step sagas

Cons:
- Hard to understand the full flow (distributed logic)
- Difficult to add new steps or change order
- Cyclic dependencies can emerge
- Testing the full saga requires all services running

**Orchestration (central coordinator)**:
A saga orchestrator tells each service what to do and tracks the state.

\`\`\`
Order Svc    Orchestrator    Payment Svc   Inventory Svc
    |              |              |               |
    |--Create----->|              |               |
    |              |--Reserve $-->|               |
    |              |<--OK---------|               |
    |              |--Reserve items----------->   |
    |              |<--OK--------------------------|
    |              |--Confirm order                |
    |<--Confirmed--|              |               |
\`\`\`

Pros:
- Clear, centralized flow (easy to understand and modify)
- Simple to add/remove/reorder steps
- Saga state in one place (easier debugging)
- Easier to implement timeouts and compensation

Cons:
- Orchestrator is a potential single point of failure
- Tighter coupling (orchestrator knows all services)
- Risk of centralizing too much logic

**When to choose**:
- Choreography: Simple flows, 2-3 steps, event-driven architecture already in place
- Orchestration: Complex flows, 4+ steps, need clear visibility, need to modify flow frequently`
      },
      {
        question: 'How do compensating transactions work? Design compensation for an e-commerce order saga.',
        answer: `**Compensating transactions** undo the effect of a completed step. They are NOT database rollbacks — they are new forward actions that semantically reverse the previous step.

**E-commerce Order Saga (5 steps)**:

\`\`\`
Step  | Action                  | Compensation
------|-------------------------|---------------------------
  1   | Create Order (PENDING)  | Cancel Order (CANCELLED)
  2   | Reserve Inventory       | Release Inventory
  3   | Charge Payment          | Refund Payment
  4   | Update Loyalty Points   | Deduct Loyalty Points
  5   | Schedule Shipping       | Cancel Shipment
\`\`\`

**Failure at step 3 (Payment fails)**:

\`\`\`
Orchestrator
    |
    |-- Step 1: Create Order (PENDING)   --> OK
    |-- Step 2: Reserve Inventory        --> OK
    |-- Step 3: Charge Payment           --> FAILED
    |
    |-- Compensate Step 2: Release Inventory --> OK
    |-- Compensate Step 1: Cancel Order      --> OK
    |
    Final state: Order CANCELLED, Inventory released
                 (Payment was never charged)
\`\`\`

**Critical design rules**:

1. **Compensation is semantic, not physical**:
   - Charging $100 is compensated by Refunding $100 (a new credit transaction)
   - NOT by deleting the charge record
   - Both the charge and refund appear in the audit trail

2. **Compensation must be idempotent**:
   - The compensating action might be called multiple times (network retries)
   - Use idempotency keys: "refund for saga-123-step-3"
   - Check if compensation already applied before executing

3. **Some actions cannot be compensated**:
   - Sending an email (solution: send a follow-up correction email)
   - Sending a notification (solution: send a retraction)
   - Physical delivery (solution: schedule return pickup)
   - Design principle: put hard-to-compensate steps last in the saga

4. **Compensation can fail too**:
   - Retry compensation with exponential backoff
   - After max retries, raise an alert for manual intervention
   - Store saga state so operators can resume compensation`
      },
      {
        question: 'What are semantic locks and other saga countermeasures?',
        answer: `**Problem**: During saga execution, intermediate data is visible to other transactions. This creates anomalies similar to dirty reads in databases.

**Example anomaly**:
\`\`\`
Saga 1: Create Order for $100
  Step 1: Reserve $100 from wallet (balance: $200 -> $100)
  Step 2: ... processing ...

Concurrent Read: "Show user wallet balance"
  --> Returns $100 (intermediate state)
  --> User thinks they only have $100

Saga 1 fails at Step 3:
  Compensate Step 1: Release $100 (balance: $100 -> $200)
  --> User now has $200 again, but they saw $100 briefly
\`\`\`

**Countermeasure 1 — Semantic Lock**:
Mark records as "in-progress" so other transactions know the data is tentative.

\`\`\`
Order Status Flow:
  PENDING (saga in progress, semantic lock)
     |
  +--+--+
  |     |
CONFIRMED  CANCELLED
(success)  (compensated)

Other services check: if order.status == PENDING,
treat with caution (show "processing" to user)
\`\`\`

**Countermeasure 2 — Commutative Updates**:
Design operations so that order does not matter.
- Instead of SET balance = 100, use INCREMENT balance BY -100
- Commutative operations can be applied in any order

**Countermeasure 3 — Pessimistic View**:
Reorder saga steps to reduce the window of dirty reads.
- Put steps that query data before steps that modify data
- Check inventory BEFORE reserving payment

**Countermeasure 4 — Reread Value**:
Before committing, re-read the value to verify it has not changed.
- Similar to optimistic concurrency control
- Use version numbers or ETags

**Countermeasure 5 — Version File**:
Record all operations on a record and use the log to compute the correct state.
- Similar to event sourcing
- Handles out-of-order operations

**Best practice**: Use semantic locks (PENDING status) as the primary countermeasure and combine with commutative updates where possible.`
      },
      {
        question: 'How do you handle saga step timeouts and the "stuck saga" problem?',
        answer: `**The stuck saga problem**: A saga step does not respond — it did not succeed, did not fail, it just... hangs. The orchestrator does not know whether to proceed or compensate.

**Root causes**:
- Network partition between orchestrator and service
- Service crashed mid-processing
- Database deadlock in the target service
- Message lost in the event bus

**Solution: Timeout + Retry + Eventual Compensation**

\`\`\`
Orchestrator Timeout Strategy:

  |-- Step N: Call Service X
  |       |
  |   Wait for response (timeout: 5s)
  |       |
  |   No response?
  |       |
  |   Retry (up to 3 times, exponential backoff)
  |   1s -> 2s -> 4s
  |       |
  |   Still no response?
  |       |
  |   Mark step as TIMED_OUT
  |       |
  |   Begin compensation from Step N-1 backwards
\`\`\`

**But what if the step actually succeeded?**

This is the fundamental problem. The service might have processed the request but the response was lost. Now the orchestrator compensates unnecessarily.

**Solution: Idempotency + At-least-once delivery**:

1. Assign a unique saga_step_id to every step
2. The target service stores {saga_step_id: result} before responding
3. On retry, the service returns the stored result (idempotent)
4. On compensation, the service checks whether the step actually executed

\`\`\`
Saga State Store (in orchestrator DB):

saga_id  | step | service     | status    | started_at | completed_at
---------|------|-------------|-----------|------------|-------------
saga-123 |  1   | order-svc   | COMPLETED | 10:00:01   | 10:00:02
saga-123 |  2   | payment-svc | COMPLETED | 10:00:02   | 10:00:03
saga-123 |  3   | inventory   | TIMED_OUT | 10:00:03   | NULL
saga-123 |  2c  | payment-svc | COMPENSATED | 10:00:08 | 10:00:09
saga-123 |  1c  | order-svc   | COMPENSATED | 10:00:09 | 10:00:10
\`\`\`

**Dead letter queue for unresolvable sagas**:
- After max retries on compensation, push to DLQ
- Operators review and resolve manually
- Dashboard shows stuck sagas with full step history

**Prevention**:
- Keep saga steps short (< 5 seconds each)
- Use async messaging (guaranteed delivery) over synchronous HTTP
- Monitor saga duration distributions; alert on anomalies`
      },
    ],

    dataModel: {
      description: 'Saga orchestration architecture and state flow',
      schema: `Saga Orchestrator Architecture:

  Client
    |
    v
  +--------------------+
  | Saga Orchestrator   |
  | (state machine)     |
  +---------+----------+
            |
  +---------+---------+
  | Saga State Store   |
  | (saga_id, step,    |
  |  status, payload)  |
  +--------------------+
            |
    +-------+-------+-------+
    |       |       |       |
    v       v       v       v
  Order   Payment  Inv.   Shipping
  Svc     Svc      Svc    Svc
  (DB1)   (DB2)    (DB3)  (DB4)

Saga Lifecycle:
  STARTED --> STEP_1_PENDING --> STEP_1_COMPLETE
          --> STEP_2_PENDING --> STEP_2_COMPLETE
          --> ...
          --> SAGA_COMPLETE (all steps done)
          --> COMPENSATING (step failed)
          --> STEP_N_COMPENSATED --> ...
          --> SAGA_COMPENSATED (all rolled back)
          --> SAGA_FAILED (compensation failed, needs manual)`
    },
  },

  {
    id: 'bulkhead-pattern',
    title: 'Bulkhead Pattern',
    icon: 'shield',
    color: '#ef4444',
    questions: 8,
    description: 'Resource isolation through thread pool isolation, connection pool isolation, and failure containment in microservices.',
    concepts: [
      'Thread pool isolation',
      'Semaphore isolation',
      'Connection pool isolation',
      'Process-level isolation',
      'Failure containment boundaries',
      'Resource partitioning strategies',
      'Bulkhead sizing and tuning',
    ],
    tips: [
      'Name your bulkheads after the dependency they protect — "payment-pool", "inventory-pool" — so dashboards and alerts are immediately meaningful',
      'Size thread pools based on measured throughput and latency, not guesses: pool_size = target_RPS x p99_latency_seconds',
      'Use semaphore isolation for lightweight, non-blocking calls (in-memory caches, fast lookups) and thread pool isolation for slow or unreliable dependencies',
      'Monitor bulkhead utilization continuously; a pool at 80% capacity is a warning sign, not normal operation',
      'Combine bulkheads with circuit breakers: the bulkhead limits concurrent calls, the circuit breaker stops calls when failure rate spikes',
      'In Kubernetes, resource limits (CPU/memory) on pods act as process-level bulkheads — set them to prevent a single misbehaving service from starving the node',
    ],

    introduction: `The Bulkhead pattern isolates resources so that a failure in one component does not cascade to bring down the entire system. The name comes from ship design: a ship's hull is divided into watertight compartments (bulkheads) so that if one compartment floods, the rest stay dry and the ship stays afloat.

In microservices, the most common scenario is thread pool exhaustion. If your service uses a single shared thread pool to call all downstream dependencies, a slow dependency can consume all threads, preventing your service from handling any requests — even requests to healthy dependencies.

Bulkheads are a prerequisite for building resilient systems. They pair naturally with circuit breakers (which detect failure) by providing the isolation layer that contains the blast radius. At Amazon, every service call goes through an isolated resource pool, ensuring that a problem in one service cannot affect calls to other services.`,

    keyQuestions: [
      {
        question: 'How does thread pool isolation work and when should you use it?',
        answer: `**Thread pool isolation** dedicates a separate thread pool for each dependency, so a slow or failing dependency can only consume its own pool.

\`\`\`
Without Bulkhead (shared pool):

  Incoming Requests --> [ Shared Thread Pool (200 threads) ]
                              |        |        |
                              v        v        v
                         Payment   Inventory   User
                         (slow!)   (healthy)   (healthy)

  Payment consumes 190 threads waiting...
  Only 10 threads left for Inventory + User
  --> Entire service degrades

With Bulkhead (isolated pools):

  Incoming Requests
        |
  +-----+-----+-----+
  |           |           |
  v           v           v
[Payment]  [Inventory]  [User]
[Pool: 50] [Pool: 80]  [Pool: 70]
  |           |           |
  v           v           v
Payment     Inventory    User
(slow!)     (healthy)    (healthy)

Payment pool exhausted (50 threads blocked)
Inventory and User pools unaffected!
--> Service continues serving Inventory and User requests
\`\`\`

**Sizing the thread pool**:
\`\`\`
pool_size = target_requests_per_second x p99_latency_in_seconds x safety_factor

Example for Payment Service:
  target RPS: 100
  p99 latency: 0.5s
  safety factor: 1.5
  pool_size = 100 x 0.5 x 1.5 = 75 threads
\`\`\`

**When to use thread pool isolation**:
- Calling slow or unreliable external services
- Network I/O with unpredictable latency
- Any dependency that could block for seconds

**When NOT to use**:
- In-memory operations (cache lookups)
- Very fast calls (< 5ms) where thread context switching adds more overhead than the call itself
- In reactive/async systems where threads are not blocked (use semaphore instead)`
      },
      {
        question: 'What is semaphore isolation and how does it differ from thread pool isolation?',
        answer: `**Semaphore isolation** uses a counter (semaphore) to limit concurrent calls to a dependency, but the call executes on the calling thread — no separate thread pool.

\`\`\`
Thread Pool Isolation:

  Calling Thread --> [Submit to Pool] --> [Pool Thread executes call]
                     (thread switch)      (blocks pool thread)

  + Full isolation (calling thread freed immediately)
  + Timeout on the pool thread
  - Extra thread context switch overhead
  - Higher memory usage (N thread pools)

Semaphore Isolation:

  Calling Thread --> [Acquire permit] --> [Same thread executes call]
                     (counter check)      (blocks calling thread)

  + No thread switch overhead
  + Lower memory usage
  - Calling thread is blocked during call
  - Cannot enforce timeout (depends on HTTP client timeout)
\`\`\`

**Comparison**:
\`\`\`
Feature              | Thread Pool      | Semaphore
---------------------|-----------------|------------------
Thread overhead      | High (pool/dep) | None
Latency overhead     | ~1ms context sw | ~0 (counter only)
Caller thread blocked| No              | Yes
Timeout enforcement  | Pool manages    | External (HTTP)
Use case             | Slow/unreliable | Fast/predictable
Memory               | Higher          | Lower
Resilience4j default | No              | Yes
Hystrix default      | Yes             | No
\`\`\`

**Decision guide**:
\`\`\`
Is the call blocking I/O?
  |-- Yes: Is latency unpredictable (> 100ms p99)?
  |     |-- Yes --> Thread Pool Isolation
  |     |-- No  --> Semaphore (with HTTP timeout)
  |-- No (non-blocking/reactive):
        --> Semaphore always (threads not blocked)
\`\`\`

**Resilience4j Bulkhead configuration**:
- Thread pool: maxConcurrent=25, maxWait=0 (reject immediately when full)
- Semaphore: maxConcurrent=25, maxWaitDuration=500ms`
      },
      {
        question: 'How do you implement bulkheads at different architectural layers?',
        answer: `Bulkheads can be applied at multiple levels:

**Layer 1 — Code level (thread/semaphore pools)**:
\`\`\`
Per-dependency thread pools in a single service:

  +---------------------------+
  |       Service A           |
  |                           |
  | [Payment Pool: 50]        |
  | [Inventory Pool: 80]      |
  | [Notification Pool: 30]   |
  +---------------------------+
\`\`\`

**Layer 2 — Connection pools**:
\`\`\`
Database connection pool isolation:

  Service A
    |
    +-- [Write Pool: 20 conns] --> Primary DB
    |
    +-- [Read Pool: 50 conns]  --> Read Replica
    |
    +-- [Analytics Pool: 5 conns] --> Analytics DB

A heavy analytics query cannot starve the write pool.
\`\`\`

**Layer 3 — Process/container isolation**:
\`\`\`
Kubernetes resource limits:

  Node (16 CPU, 64GB RAM)
    |
    +-- Pod: payment-svc
    |     limits: cpu=2, memory=4Gi
    |
    +-- Pod: inventory-svc
    |     limits: cpu=4, memory=8Gi
    |
    +-- Pod: user-svc
          limits: cpu=2, memory=4Gi

Payment-svc cannot consume all node resources.
\`\`\`

**Layer 4 — Infrastructure isolation**:
\`\`\`
Separate infrastructure per criticality tier:

  Tier 1 (Critical)          Tier 2 (Standard)
  +------------------+       +------------------+
  | Dedicated cluster|       | Shared cluster   |
  | Payment, Order   |       | Analytics, CMS   |
  | 99.99% SLA       |       | 99.9% SLA        |
  +------------------+       +------------------+

Tier 2 outage does not affect Tier 1.
\`\`\`

**Layer 5 — Network-level (service mesh)**:
\`\`\`
Istio DestinationRule:

apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
\`\`\`

**Best practice**: Apply bulkheads at every layer for defense in depth. Code-level pools protect against slow dependencies, container limits protect against resource abuse, infrastructure isolation protects against catastrophic failures.`
      },
      {
        question: 'How do you size and tune bulkheads in production?',
        answer: `**Step 1 — Measure baseline metrics** (before adding bulkheads):
- p50, p95, p99 latency per dependency
- Throughput (RPS) per dependency
- Current thread/connection usage patterns
- Failure rates per dependency

**Step 2 — Calculate initial pool sizes**:
\`\`\`
Formula: pool_size = RPS x response_time_seconds x headroom

Example calculations:

Payment Service:
  RPS: 200, p99 latency: 300ms, headroom: 1.5x
  pool = 200 x 0.3 x 1.5 = 90 threads

Inventory Service:
  RPS: 500, p99 latency: 50ms, headroom: 1.5x
  pool = 500 x 0.05 x 1.5 = 38 threads (round to 40)

User Service:
  RPS: 1000, p99 latency: 20ms, headroom: 1.5x
  pool = 1000 x 0.02 x 1.5 = 30 threads
\`\`\`

**Step 3 — Set rejection policy**:
- What happens when the pool is full?
- Option A: Reject immediately (fast failure) — preferred for real-time requests
- Option B: Queue briefly (100-500ms max wait) — acceptable for background tasks
- Option C: Shed load by priority (drop low-priority requests first)

**Step 4 — Monitor and alert**:
\`\`\`
Key metrics:
  bulkhead_active_threads{name="payment"}      (current usage)
  bulkhead_max_threads{name="payment"}         (pool size)
  bulkhead_queue_depth{name="payment"}         (waiting requests)
  bulkhead_rejected_total{name="payment"}      (rejected count)

Alert rules:
  - utilization > 80% for 5 minutes --> Warning
  - rejected_total increasing       --> Critical
  - queue_depth > 0 sustained       --> Review sizing
\`\`\`

**Step 5 — Tune iteratively**:
- Pools too small: Excessive rejections even when dependency is healthy
- Pools too large: Waste memory, slow failure detection
- Watch for seasonal patterns: traffic spikes need headroom
- Auto-scaling: In Kubernetes, scale pods rather than increasing pool sizes

**Common mistake**: Setting all pools to the same size. Each dependency has different latency and throughput characteristics — size each pool independently based on actual measured data.`
      },
    ],

    dataModel: {
      description: 'Bulkhead isolation architecture',
      schema: `Bulkhead Architecture (Multi-Layer):

  +-------------------------------------------+
  |              Service A                     |
  |                                           |
  |  +----------+  +----------+  +----------+ |
  |  | Payment  |  | Inventory|  | User     | |
  |  | Pool: 50 |  | Pool: 80 |  | Pool: 30 | |
  |  | Active:35|  | Active:20|  | Active:10| |
  |  +----+-----+  +----+-----+  +----+-----+ |
  +-------|-----------|-----------|-------------+
          |           |           |
          v           v           v
     Payment Svc  Inventory Svc  User Svc

  Connection Pools:
    DB Write Pool:   20 connections (primary)
    DB Read Pool:    50 connections (replicas)
    Redis Pool:      30 connections
    External API:    10 connections (3rd party)

  Resource Limits (per pod):
    CPU:    2 cores (request: 500m, limit: 2000m)
    Memory: 2Gi (request: 512Mi, limit: 2Gi)
    Ephemeral Storage: 1Gi`
    },
  },

  {
    id: 'retry-pattern',
    title: 'Retry Pattern',
    icon: 'shield',
    color: '#ef4444',
    questions: 8,
    description: 'Exponential backoff, jitter, retry budgets, idempotency requirements, and retry storm prevention.',
    concepts: [
      'Exponential backoff algorithm',
      'Jitter strategies (full, equal, decorrelated)',
      'Retry budgets and rate limiting',
      'Idempotency keys and requirements',
      'Retry storms and thundering herd',
      'Transient vs permanent failure classification',
      'Circuit breaker integration',
    ],
    tips: [
      'Never retry without backoff — immediate retries amplify load on an already struggling service',
      'Always add jitter to prevent synchronized retry storms across multiple clients',
      'Classify errors before retrying: retry on 503/timeout, never retry on 400/404',
      'Set a maximum retry count (typically 3-5) AND a maximum total time budget (e.g., 10 seconds) — whichever is reached first stops retries',
      'Every operation that can be retried MUST be idempotent; use idempotency keys for non-naturally-idempotent operations like payments',
      'Implement retry budgets at the service level: "no more than 10% of total requests should be retries" to prevent retry storms',
      'Log every retry with context (attempt number, delay, error) so you can diagnose retry patterns in production',
    ],

    introduction: `The Retry pattern handles transient failures by automatically re-attempting failed operations. In distributed systems, transient failures are routine: network blips, temporary service overloads, connection resets, and DNS resolution delays. Most of these resolve within seconds, making retries an effective strategy.

However, naive retries are dangerous. If a service is struggling under load and 1000 clients simultaneously retry their failed requests, the service receives a thundering herd of retry traffic on top of normal load, making the problem worse. This is a retry storm, and it has caused major outages at companies like AWS, Slack, and GitHub.

The key to safe retries is combining exponential backoff (wait longer between each attempt), jitter (randomize wait times), retry budgets (cap total retry traffic), and idempotency (ensure repeated requests produce the same result). Interviewers expect you to understand all four concepts and explain why each is necessary.`,

    keyQuestions: [
      {
        question: 'Explain exponential backoff with jitter and why both are necessary.',
        answer: `**Exponential backoff**: Each retry waits exponentially longer.
\`\`\`
Attempt 1: wait 1s
Attempt 2: wait 2s
Attempt 3: wait 4s
Attempt 4: wait 8s
Formula: delay = base_delay x 2^(attempt - 1)
Cap at max_delay (e.g., 30s)
\`\`\`

**Problem with backoff alone**:
If 1000 clients fail at the same time, they all retry at exactly:
- t=1s: 1000 retries hit the server simultaneously
- t=3s: 1000 retries again
- t=7s: 1000 retries again
This is called a "thundering herd" and can be worse than the original load.

**Jitter**: Add randomness to spread retries over time.

**Three jitter strategies**:

\`\`\`
1. Full Jitter (recommended):
   delay = random(0, base_delay x 2^attempt)

   Wide spread, lowest contention
   Example: attempt 3, base=1s
   delay = random(0, 4) --> could be 0.7s, 2.3s, 3.8s, etc.

2. Equal Jitter:
   half = (base_delay x 2^attempt) / 2
   delay = half + random(0, half)

   Guaranteed minimum wait, moderate spread
   Example: attempt 3, base=1s
   delay = 2 + random(0, 2) --> between 2s and 4s

3. Decorrelated Jitter:
   delay = random(base_delay, previous_delay x 3)

   Each delay based on previous, good variance
   Example: previous=2s
   delay = random(1, 6) --> between 1s and 6s
\`\`\`

**Visualization (1000 clients, attempt 3)**:
\`\`\`
No jitter:     |XXXXX|                    (all at t=4s)
Full jitter:   |X X  X X X  XX X X  X|   (spread 0-4s)
Equal jitter:  |     XX XX XXX XX XX |    (spread 2-4s)
\`\`\`

**AWS recommendation**: Use full jitter for the broadest spread and lowest collision probability. This is the strategy used by the AWS SDK.`
      },
      {
        question: 'What is a retry budget and how does it prevent retry storms?',
        answer: `**Retry budget**: A limit on the proportion of total requests that can be retries.

**Without retry budget**:
\`\`\`
Normal: 1000 req/s to Service B
Service B starts failing (50% errors):
  500 succeed, 500 fail
  500 fail --> 500 retries
  250 retries fail --> 250 more retries
  ...
  Total load: 1000 + 500 + 250 + 125 = 1875 req/s
  Service B was already struggling at 1000!
\`\`\`

**With retry budget (10%)**:
\`\`\`
Normal: 1000 req/s to Service B
Retry budget: max 10% additional = 100 retries/s

Service B starts failing (50% errors):
  500 succeed, 500 fail
  500 fail --> only 100 retries allowed (budget enforced)
  Total load: 1000 + 100 = 1100 req/s
  Service B has a chance to recover
\`\`\`

**Implementation approaches**:

1. **Token bucket per client**:
   - Each client tracks: total_requests, retry_requests
   - Allow retry only if retry_requests / total_requests < budget (e.g., 0.10)
   - Sliding window of last 60 seconds

2. **Global retry budget (service mesh)**:
   - Envoy/Istio tracks retry ratio across all pods
   - Configurable per route:
     retryPolicy:
       retryBudget:
         budget_percent: 10
         min_retries_per_second: 5

3. **Adaptive retry budget**:
   - Start with generous budget (20%)
   - As error rate increases, reduce budget automatically
   - At 50%+ error rate, disable retries entirely (let circuit breaker handle it)

\`\`\`
Retry Budget State Machine:

  Error Rate    | Retry Budget | Strategy
  0-5%          | 20%          | Normal retries
  5-20%         | 10%          | Conservative retries
  20-50%        | 5%           | Minimal retries
  50%+          | 0%           | No retries (circuit open)
\`\`\`

**Coordination with circuit breaker**:
- Retry budget handles gradual degradation (10-30% errors)
- Circuit breaker handles severe failure (50%+ errors)
- Together they provide layered protection`
      },
      {
        question: 'Why is idempotency critical for retries, and how do you implement it?',
        answer: `**The problem**: When a request times out, you do not know if it succeeded.

\`\`\`
Client         Service         Database
  |               |               |
  |-- POST /pay -->|              |
  |               |-- INSERT ---->|
  |               |<-- OK --------|
  |  (timeout)    |-- Response -->|
  |<-- TIMEOUT ---|   (lost!)    |
  |               |               |
  |-- Retry ------>|              |
  |               |-- INSERT ---->|  <-- DUPLICATE CHARGE!
\`\`\`

Without idempotency, the retry creates a double charge.

**Idempotency key pattern**:

\`\`\`
Client generates unique key per logical operation:

Request 1:
  POST /payments
  Idempotency-Key: pay_abc123
  Body: { amount: 100, to: "merchant_xyz" }

  --> Service processes payment, stores:
      idempotency_store[pay_abc123] = { status: 200, body: {id: "tx_1"} }

Request 2 (retry, same key):
  POST /payments
  Idempotency-Key: pay_abc123
  Body: { amount: 100, to: "merchant_xyz" }

  --> Service finds pay_abc123 in store
  --> Returns stored response: { status: 200, body: {id: "tx_1"} }
  --> NO duplicate processing
\`\`\`

**Implementation**:
\`\`\`
Idempotency Store Schema:

  idempotency_key  VARCHAR PRIMARY KEY
  request_hash     VARCHAR (hash of request body)
  response_status  INT
  response_body    JSONB
  created_at       TIMESTAMP
  expires_at       TIMESTAMP (cleanup after 24-48 hours)

Processing Flow:

  1. Receive request with Idempotency-Key
  2. BEGIN TRANSACTION
  3. SELECT FROM idempotency_store WHERE key = ?
     |-- Found: return stored response
     |-- Not found: INSERT key with status=PROCESSING
  4. COMMIT
  5. Process the actual operation
  6. UPDATE idempotency_store SET response = ?, status = ?
  7. Return response
\`\`\`

**Naturally idempotent operations** (no key needed):
- GET, HEAD, OPTIONS requests
- PUT (full replacement): PUT /user/123 {name: "Alice"}
- DELETE: DELETE /user/123 (deleting twice = same result)

**Non-idempotent operations** (NEED key):
- POST (create): could create duplicates
- PATCH (partial update): incrementing a counter
- Any operation with side effects (send email, charge card)

**Stripe's approach**: Every mutating API call accepts an Idempotency-Key header. Keys are scoped to the API key and expire after 24 hours. If a duplicate key is received with a different request body, Stripe returns a 422 error.`
      },
      {
        question: 'How do you classify errors to decide whether to retry?',
        answer: `**Not all errors should be retried.** Retrying a permanent failure wastes resources and delays the error response to the user.

**Retryable (transient) errors**:
\`\`\`
HTTP 429  Too Many Requests    (rate limited, try later)
HTTP 500  Internal Server Error (might be transient)
HTTP 502  Bad Gateway          (upstream temporarily down)
HTTP 503  Service Unavailable  (overloaded, try later)
HTTP 504  Gateway Timeout      (upstream slow)
ECONNRESET                     (connection dropped)
ETIMEDOUT                      (connection timed out)
DNS_RESOLUTION_FAILED          (temporary DNS issue)
\`\`\`

**Non-retryable (permanent) errors**:
\`\`\`
HTTP 400  Bad Request          (malformed, will always fail)
HTTP 401  Unauthorized         (wrong credentials)
HTTP 403  Forbidden            (no permission)
HTTP 404  Not Found            (resource doesn't exist)
HTTP 409  Conflict             (duplicate, needs resolution)
HTTP 422  Unprocessable Entity (validation error)
\`\`\`

**Gray area (context-dependent)**:
\`\`\`
HTTP 500  with body "database deadlock"  --> Retry (transient)
HTTP 500  with body "null pointer"       --> Don't retry (bug)
HTTP 408  Request Timeout                --> Retry (client was slow)
\`\`\`

**Implementation pattern**:
\`\`\`
Error Classification Decision Tree:

  Error received
       |
  Is it a network error? (timeout, connection reset)
  |-- Yes --> RETRY (transient)
  |-- No
       |
  Is HTTP status 4xx?
  |-- 429 --> RETRY (with Retry-After header delay)
  |-- Other 4xx --> DO NOT RETRY (client error)
  |-- No
       |
  Is HTTP status 5xx?
  |-- 503 --> RETRY (service unavailable)
  |-- 502/504 --> RETRY (gateway issue)
  |-- 500 --> RETRY with caution (may be permanent bug)
       |
  Max retries reached?
  |-- Yes --> FAIL (return error to caller)
  |-- No  --> Apply backoff + jitter, retry
\`\`\`

**Retry-After header**: When a server returns 429 or 503 with a Retry-After header, respect it. The server knows better than your backoff algorithm when it will be ready.

**Per-error-type metrics**:
Track retry success rate by error type. If retrying 500s never succeeds, stop retrying them — it is likely a bug, not a transient failure. This adaptive classification prevents wasting retries on unrecoverable errors.`
      },
    ],

    dataModel: {
      description: 'Retry pattern with backoff and jitter',
      schema: `Retry Flow with Exponential Backoff + Jitter:

  Request --> Attempt 1 --> Success? --> Return
                |
              Failure
                |
         Classify error
          |            |
    Retryable    Non-retryable --> Return error
          |
    Check retry budget (< 10%?)
          |
    delay = min(base x 2^attempt, max_delay)
    delay = random(0, delay)  [full jitter]
          |
    Wait(delay)
          |
    Attempt 2 --> Success? --> Return
                |
              ...repeat up to max_attempts...
                |
    Max reached --> Return last error

Typical Configuration:
  base_delay:    1 second
  max_delay:     30 seconds
  max_attempts:  3-5
  jitter:        full
  retry_budget:  10% of total traffic
  retryable:     [429, 500, 502, 503, 504, TIMEOUT]
  non_retryable: [400, 401, 403, 404, 409, 422]`
    },
  },

  {
    id: 'sidecar-pattern',
    title: 'Sidecar Pattern',
    icon: 'layers',
    color: '#f59e0b',
    questions: 8,
    description: 'Service mesh, cross-cutting concerns (logging, monitoring, security), and implementations with Envoy and Istio.',
    concepts: [
      'Sidecar proxy architecture',
      'Service mesh data plane and control plane',
      'Cross-cutting concern extraction',
      'mTLS and zero-trust networking',
      'Observability (distributed tracing, metrics)',
      'Traffic management (canary, A/B, fault injection)',
      'Envoy proxy internals',
    ],
    tips: [
      'Use a sidecar when you need to add capabilities to services written in different languages without modifying their code',
      'Service meshes add latency (typically 1-3ms per hop) — measure this overhead and ensure it is acceptable for your latency budget',
      'Start with a sidecar for observability (tracing, metrics) before adopting full service mesh features (traffic splitting, fault injection)',
      'In Kubernetes, sidecars are injected automatically via admission webhooks; make sure your CI/CD pipeline tests with sidecar injection enabled',
      'Do not put business logic in the sidecar; it handles infrastructure concerns only (networking, security, observability)',
      'Plan for sidecar resource consumption: each sidecar typically uses 50-100MB RAM and 0.1-0.5 CPU cores',
    ],

    introduction: `The Sidecar pattern deploys a helper container alongside your application container to handle cross-cutting concerns like networking, security, and observability. Instead of embedding these capabilities in every service (duplicating code across languages), you extract them into a separate process that runs alongside the service and intercepts all inbound and outbound traffic.

The most prominent implementation of the sidecar pattern is the service mesh, where every service gets a sidecar proxy (typically Envoy) that handles mTLS encryption, load balancing, circuit breaking, retries, and distributed tracing — all without modifying application code. Istio, Linkerd, and Consul Connect are popular service mesh implementations.

In interviews, the sidecar pattern tests your ability to reason about separation of concerns, the cost of additional infrastructure, and when the complexity of a service mesh is justified versus simpler alternatives.`,

    keyQuestions: [
      {
        question: 'How does the sidecar pattern work in a service mesh architecture?',
        answer: `**Architecture overview**:
Every service pod has two containers: the application and the sidecar proxy. All network traffic flows through the sidecar.

\`\`\`
Pod A                              Pod B
+---------------------------+      +---------------------------+
|  +-------+   +-------+   |      |   +-------+   +-------+  |
|  | App A |-->|Sidecar|---+------+-->|Sidecar|-->| App B |  |
|  |       |<--|Proxy  |<--+------+<--|Proxy  |<--|       |  |
|  +-------+   +-------+   |      |   +-------+   +-------+  |
+---------------------------+      +---------------------------+
     localhost:8080   :15001             :15001   localhost:8080

Traffic flow:
1. App A calls App B at service-b:8080
2. iptables rules redirect to local sidecar (port 15001)
3. Sidecar A encrypts (mTLS), adds tracing headers
4. Request goes to Pod B's sidecar
5. Sidecar B decrypts, applies policies, forwards to App B
6. Response follows the reverse path
\`\`\`

**Control plane vs data plane**:
\`\`\`
+-------------------------------------+
|          Control Plane               |
| (Istio Pilot / Linkerd Controller)  |
|-------------------------------------|
| - Service discovery                 |
| - Certificate authority (mTLS)      |
| - Configuration distribution        |
| - Policy enforcement                |
+------------------+------------------+
                   | Push config
     +-------------+-------------+
     |             |             |
     v             v             v
  Sidecar A    Sidecar B    Sidecar C
  (Envoy)     (Envoy)      (Envoy)
     |             |             |
     v             v             v
   App A         App B         App C

Data Plane: All sidecar proxies
Control Plane: Manages sidecar configuration
\`\`\`

**What the sidecar handles** (without changing application code):
- **mTLS**: Automatic encryption between all services
- **Load balancing**: Client-side LB with health checking
- **Circuit breaking**: Per-destination failure thresholds
- **Retries**: Configurable retry policies
- **Tracing**: Inject and propagate trace headers (Jaeger, Zipkin)
- **Metrics**: Emit latency, error rate, throughput per route
- **Traffic splitting**: Canary deployments, A/B testing
- **Rate limiting**: Per-service or per-route limits`
      },
      {
        question: 'Compare Istio, Linkerd, and Consul Connect. When would you choose each?',
        answer: `**Istio**:
- Data plane: Envoy proxy
- Feature-rich: traffic management, security, observability, policy
- Complex: steep learning curve, many CRDs
- Resource-heavy: ~100MB RAM per sidecar, control plane needs 2+ GB
- Best for: Large organizations needing advanced traffic management

**Linkerd**:
- Data plane: Custom Rust-based proxy (linkerd2-proxy)
- Lightweight: ~20MB RAM per sidecar, minimal control plane
- Simple: easy to install, opinionated defaults
- Focused: mTLS, observability, retries, load balancing
- Best for: Teams wanting mesh benefits without Istio complexity

**Consul Connect**:
- Data plane: Envoy (or built-in proxy)
- Multi-platform: works across Kubernetes, VMs, bare metal
- Integrated: service discovery + mesh in one product
- Best for: Hybrid environments (not purely Kubernetes)

\`\`\`
Comparison Matrix:

Feature           | Istio    | Linkerd  | Consul
------------------|----------|----------|--------
Proxy             | Envoy    | Rust     | Envoy
RAM per sidecar   | ~100MB   | ~20MB    | ~50MB
Complexity        | High     | Low      | Medium
Traffic mgmt      | Advanced | Basic    | Basic
Multi-cluster     | Yes      | Yes      | Yes
Non-K8s support   | Limited  | No       | Yes
mTLS              | Yes      | Yes      | Yes
Observability     | Rich     | Good     | Good
Learning curve    | Steep    | Gentle   | Moderate
CNCF status       | Graduated| Graduated| N/A
\`\`\`

**Decision framework**:
- Need advanced traffic management (fault injection, header-based routing, traffic mirroring)? --> Istio
- Want simplicity and low overhead? --> Linkerd
- Have VMs or multi-platform infrastructure? --> Consul Connect
- Budget-constrained or small team? --> Linkerd (least operational burden)

**Alternative: No mesh**:
For < 20 services, consider using application-level libraries (Resilience4j) + centralized observability (OpenTelemetry) instead of a full service mesh. The operational overhead of a mesh may not be justified.`
      },
      {
        question: 'What are the performance implications of adding a sidecar proxy to every service?',
        answer: `**Latency overhead**:
\`\`\`
Without sidecar:
  App A --> Network --> App B
  Latency: ~1ms (same AZ)

With sidecar:
  App A --> Sidecar A --> Network --> Sidecar B --> App B
  Added: ~1-3ms per hop (two sidecar hops)

Breakdown per sidecar hop:
  - iptables redirect:  ~0.1ms
  - TLS handshake:      ~0.5ms (first call, cached after)
  - Policy evaluation:  ~0.1ms
  - Header injection:   ~0.05ms
  - Total:              ~0.5-1.5ms per sidecar
\`\`\`

**For a request traversing 5 services**:
\`\`\`
Without mesh: 5 hops x 1ms = 5ms network time
With mesh:    5 hops x 1ms + 10 sidecar hops x 1ms = 15ms
Overhead: ~10ms additional latency
\`\`\`

**Memory overhead**:
\`\`\`
Per pod:
  Envoy (Istio):   50-150MB RAM depending on config
  linkerd2-proxy:  10-30MB RAM

For 100 pods:
  Envoy:           5-15GB additional RAM across cluster
  Linkerd:         1-3GB additional RAM
\`\`\`

**CPU overhead**:
\`\`\`
Per pod:
  Idle: 0.01-0.05 CPU cores
  Under load: 0.1-0.5 CPU cores (TLS + processing)

For 100 pods under moderate load:
  Additional: 10-50 CPU cores
\`\`\`

**Mitigation strategies**:
1. **Connection pooling**: Reuse connections, amortize TLS handshake
2. **Protocol upgrade**: Use HTTP/2 multiplexing to reduce connection overhead
3. **Resource limits**: Set sidecar CPU/memory limits to prevent runaway consumption
4. **Selective injection**: Only inject sidecars into services that need mesh features
5. **Topology-aware routing**: Prefer same-node or same-AZ traffic to minimize latency
6. **Ambient mesh** (Istio): Per-node proxy instead of per-pod, reducing sidecar count

**When the overhead is unacceptable**:
- Ultra-low-latency systems (< 1ms end-to-end): trading systems, real-time gaming
- Resource-constrained environments: edge computing, IoT
- Simple architectures with < 10 services`
      },
      {
        question: 'How does mTLS work in a service mesh and why is it important?',
        answer: `**mTLS (mutual TLS)**: Both client and server authenticate each other using certificates, and all traffic is encrypted.

\`\`\`
Without mTLS (standard networking):

  Service A --------plaintext---------> Service B

  Any pod on the network can:
  - Eavesdrop on traffic
  - Impersonate Service A or B
  - Inject malicious requests

With mTLS:

  Service A                              Service B
  +--------+                             +--------+
  | App    |                             | App    |
  | Sidecar|---encrypted + verified----->| Sidecar|
  |  cert: |    "I am Service A"         |  cert: |
  |  svc-a |    "You are Service B"      |  svc-b |
  +--------+                             +--------+
\`\`\`

**Certificate lifecycle in Istio**:
\`\`\`
1. Pod starts, sidecar generates key pair
2. Sidecar sends CSR (Certificate Signing Request) to Istiod
3. Istiod validates pod identity via Kubernetes Service Account
4. Istiod signs certificate with mesh CA
5. Certificate pushed to sidecar (valid for 24 hours default)
6. Automatic rotation before expiry

  +----------+
  |  Istiod  |  (Certificate Authority)
  |  (CA)    |
  +----+-----+
       | Sign certs
  +----+----+----+
  |    |    |    |
  v    v    v    v
 Pod  Pod  Pod  Pod
 (each has unique SPIFFE identity)
 spiffe://cluster/ns/default/sa/user-service
\`\`\`

**SPIFFE identity**: Each service gets a cryptographic identity:
- Format: spiffe://trust-domain/ns/namespace/sa/service-account
- Used for authorization policies (not just encryption)

**Authorization policy example**:
\`\`\`
Only payment-service can call billing-service:

apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: billing-access
spec:
  selector:
    matchLabels:
      app: billing-service
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/payment-service"]
\`\`\`

**Why mTLS matters**:
1. **Zero-trust networking**: Do not trust the network; verify every connection
2. **Compliance**: PCI-DSS, HIPAA, SOC2 require encryption in transit
3. **Defense in depth**: Even if an attacker breaches the network, they cannot read traffic or impersonate services
4. **Identity-based policies**: Authorization based on cryptographic identity, not IP addresses (which change constantly in Kubernetes)`
      },
    ],

    dataModel: {
      description: 'Sidecar and service mesh architecture',
      schema: `Service Mesh Architecture:

  +-------------------------------+
  |       Control Plane           |
  | +-------+ +------+ +-------+ |
  | |Pilot  | |Citadel| |Galley | |
  | |(config)| |(certs)| |(valid)| |
  | +---+---+ +---+---+ +---+---+ |
  +-----|---------|---------|------+
        |         |         |
  Push config  Push certs  Validate
        |         |         |
  +-----+---------+---------+-----+
  |          Data Plane            |
  |                                |
  | Pod A          Pod B           |
  | +-----+-----+ +-----+-----+  |
  | | App |Envoy| | App |Envoy|  |
  | +-----+-----+ +-----+-----+  |
  |         |           |          |
  |      mTLS encrypted traffic    |
  +--------------------------------+

Sidecar Responsibilities:
  Inbound:  TLS termination, auth policy, metrics, tracing
  Outbound: Service discovery, LB, circuit breaking, retry
  Both:     Access logging, rate limiting, fault injection

Resource Budget Per Sidecar:
  CPU request:    100m
  CPU limit:      500m
  Memory request: 64Mi
  Memory limit:   128Mi`
    },
  },

  {
    id: 'strangler-fig',
    title: 'Strangler Fig Pattern',
    icon: 'layers',
    color: '#f59e0b',
    questions: 8,
    description: 'Legacy migration, incremental modernization, route-based migration, and feature toggles for safe rollout.',
    concepts: [
      'Incremental legacy replacement',
      'Route-based migration',
      'Anti-corruption layer (ACL)',
      'Feature toggles and dark launches',
      'Parallel running and comparison',
      'Data migration strategies',
      'Rollback safety',
    ],
    tips: [
      'Start by migrating the least risky, most well-understood functionality first to build confidence and establish patterns',
      'Always maintain the ability to route traffic back to the legacy system if the new service has issues',
      'Use an anti-corruption layer to translate between legacy data models and new service models — do not let legacy concepts leak into new code',
      'Run the old and new systems in parallel with traffic mirroring (shadow traffic) to compare results before switching',
      'Migrate data last — start with routing and application logic, then migrate data once the new service is proven',
      'Set a deadline for completing the migration; without one, the "strangled" system tends to linger forever in a half-migrated state',
    ],

    introduction: `The Strangler Fig pattern incrementally replaces a legacy system by building new functionality around it, gradually routing traffic from the old system to the new one until the legacy system can be decommissioned. The name comes from the strangler fig tree, which grows around a host tree, eventually replacing it entirely.

This pattern is the antithesis of the "big bang rewrite," which Martin Fowler and most experienced engineers warn against. Big rewrites are risky because you must replicate years of accumulated functionality before you can switch over, and during the rewrite, the old system continues to evolve, creating a moving target.

The strangler fig approach is battle-tested at companies like Amazon (migrating from monolith to microservices), Shopify (modular monolith extraction), and the UK Government Digital Service. In interviews, it demonstrates architectural maturity — you understand that migration is a process, not an event, and that risk management matters as much as technical design.`,

    keyQuestions: [
      {
        question: 'How do you implement the Strangler Fig pattern step by step?',
        answer: `**Phase 1 — Identify and Intercept**:
Place a routing layer (proxy/gateway) in front of the legacy system.

\`\`\`
Before:
  Clients --> Legacy Monolith (all routes)

After Phase 1:
  Clients --> [Router/Proxy] --> Legacy Monolith (all routes)
                 |
              (All traffic still goes to legacy)
              (But now we can redirect selectively)
\`\`\`

**Phase 2 — Build New Service**:
Implement one bounded context as a new microservice.

\`\`\`
  Clients --> [Router/Proxy]
                 |
              /users/* --> New User Service
              /* (else) --> Legacy Monolith
\`\`\`

**Phase 3 — Shadow Traffic and Validate**:
Mirror traffic to both systems and compare results.

\`\`\`
  Clients --> [Router/Proxy]
                 |
              /users/* --> New User Service  (serves response)
                     +--> Legacy Monolith    (shadow, log only)

  Compare: response_new == response_legacy?
  Log discrepancies for investigation.
\`\`\`

**Phase 4 — Migrate Traffic**:
Gradually shift real traffic from legacy to new service.

\`\`\`
  Week 1:  1% canary traffic to new service
  Week 2:  10% traffic
  Week 3:  50% traffic
  Week 4:  100% traffic

  At each stage:
  - Monitor error rates, latency, data consistency
  - Rollback instantly if metrics degrade
\`\`\`

**Phase 5 — Migrate Data**:
Move data ownership from legacy DB to new service's DB.

\`\`\`
  Strategy options:
  a) Sync: Legacy DB --> CDC --> New DB (real-time sync)
  b) Dual-write: Write to both during transition
  c) Bulk migrate: One-time migration + cutover

  Recommended: CDC-based sync, then cutover
\`\`\`

**Phase 6 — Decommission Legacy (for this route)**:
Remove the legacy route, clean up legacy code.

\`\`\`
  Clients --> [Router/Proxy]
                 |
              /users/*    --> New User Service
              /products/* --> (next migration)
              /* (else)   --> Legacy Monolith (shrinking)
\`\`\`

Repeat Phase 2-6 for each bounded context until the legacy system is empty.`
      },
      {
        question: 'What is an anti-corruption layer and why is it essential during migration?',
        answer: `**Anti-Corruption Layer (ACL)**: A translation layer that prevents legacy system concepts, data models, and quirks from leaking into the new system.

**Problem without ACL**:
\`\`\`
Legacy DB schema:
  CUST_TBL (CUST_NO, CUST_NM, CUST_ADDR1, CUST_ADDR2, CUST_TP)

  CUST_TP values: "R" = regular, "P" = premium, "X" = deactivated

Without ACL, new service starts using:
  customer.CUST_TP === "R"  // Legacy concept leaking in!

This couples the new service to legacy conventions.
\`\`\`

**Solution with ACL**:
\`\`\`
New User Service          ACL              Legacy System
+------------------+  +----------+  +------------------+
| User {           |  | Translate|  | CUST_TBL {       |
|   id: "u_123",   |  |  <---    |  |   CUST_NO: 123,  |
|   name: "Alice", |<-| Legacy   |->|   CUST_NM: "ALICE"|
|   status: ACTIVE,|  | to New   |  |   CUST_TP: "R"   |
|   tier: STANDARD |  |          |  | }                 |
| }                |  +----------+  +------------------+
+------------------+

ACL Translation Rules:
  CUST_NO   --> id (prefixed: "u_" + CUST_NO)
  CUST_NM   --> name (title case)
  CUST_TP "R" --> { status: ACTIVE, tier: STANDARD }
  CUST_TP "P" --> { status: ACTIVE, tier: PREMIUM }
  CUST_TP "X" --> { status: DEACTIVATED, tier: null }
\`\`\`

**Where to place the ACL**:
\`\`\`
Option A: In the new service (adapter pattern)
  New Service --> [ACL Adapter] --> Legacy API/DB

  Pro: Self-contained, no extra infrastructure
  Con: New service has legacy dependency

Option B: As a separate service
  New Service --> [ACL Service] --> Legacy System

  Pro: Clean separation, reusable
  Con: Extra hop, more infrastructure

Option C: In the routing layer
  [Router] --> [ACL Middleware] --> Legacy System

  Pro: Centralized, transparent
  Con: Can become complex
\`\`\`

**ACL handles**:
1. **Data model translation**: Legacy field names/types to new domain model
2. **Protocol translation**: SOAP/XML to REST/JSON
3. **Business rule mapping**: Legacy codes to domain enums
4. **Error translation**: Legacy error codes to standard HTTP errors
5. **ID mapping**: Legacy integer IDs to new UUIDs (with a mapping table)

**Key rule**: The new service should NEVER know it is talking to a legacy system. The ACL makes the legacy system look like a modern service.`
      },
      {
        question: 'How do you handle data migration during a strangler fig migration?',
        answer: `**Data migration is the hardest part.** Application logic can be routed flexibly, but data must be consistent and durable.

**Strategy 1 — Change Data Capture (CDC)**:
\`\`\`
Legacy DB --> [CDC Tool] --> New Service DB
              (Debezium)

  1. Debezium reads legacy DB transaction log
  2. Publishes changes as events to Kafka
  3. New service consumes events and writes to new DB
  4. Real-time sync, minimal latency

Cutover:
  1. Verify new DB is in sync (lag < 1 second)
  2. Switch reads to new DB (through feature flag)
  3. Switch writes to new service
  4. Stop CDC pipeline
  5. Decommission legacy DB tables
\`\`\`

**Strategy 2 — Dual Write** (simpler but riskier):
\`\`\`
  Write Request
       |
  +----+----+
  |         |
  v         v
Legacy DB  New DB

Problems:
- Distributed transaction: what if one write fails?
- Performance: double write latency
- Consistency: writes can diverge

Mitigation:
- Use saga pattern for write coordination
- Run reconciliation jobs to detect drift
- Accept eventual consistency during migration
\`\`\`

**Strategy 3 — Bulk Migration + Cutover**:
\`\`\`
  Phase 1: Bulk copy data (offline or during low traffic)
    Legacy DB --[ETL]--> New DB

  Phase 2: Catch up (sync changes since bulk copy started)
    Legacy DB --[CDC]--> New DB (brief catch-up window)

  Phase 3: Cutover (brief downtime or read-only mode)
    1. Stop writes to legacy
    2. Final CDC sync
    3. Verify counts/checksums match
    4. Switch traffic to new service
    5. ~5-15 minutes downtime
\`\`\`

**Data migration decision matrix**:
\`\`\`
Requirement           | CDC      | Dual Write | Bulk+Cutover
Zero downtime         | Yes      | Yes        | No (brief)
Data consistency      | Strong   | Eventual   | Strong
Complexity            | Medium   | High       | Low
Legacy DB changes req | No*      | No         | No
Real-time sync        | Yes      | Yes        | No
Rollback ease         | Easy     | Hard       | Easy

* CDC reads transaction log, no schema changes needed
\`\`\`

**Recommended approach**: CDC (with Debezium + Kafka) for zero-downtime migration with strong consistency guarantees. It requires no changes to the legacy application and provides a reliable sync mechanism.`
      },
      {
        question: 'What are the common pitfalls and failure modes during a strangler fig migration?',
        answer: `**Pitfall 1 — The migration stalls halfway**:
\`\`\`
Month 1:  Migrate User Service    --> Success!
Month 3:  Migrate Product Service --> Success!
Month 6:  Migrate Order Service   --> "Too complex, defer"
Month 12: Legacy still running with 60% of functionality
Month 24: Legacy still running, two systems to maintain
\`\`\`

Prevention:
- Set a firm deadline for complete migration
- Track migration progress on a dashboard (% routes migrated)
- Allocate dedicated team capacity — do not treat migration as a side project

**Pitfall 2 — Feature parity obsession**:
\`\`\`
"We must replicate every feature of the legacy system
 before migrating any traffic"

Result: 18-month rewrite disguised as incremental migration
\`\`\`

Prevention:
- Migrate the 80% of functionality that handles 95% of traffic
- Some legacy features may no longer be needed — validate with usage data
- Accept that the new system may initially be a subset

**Pitfall 3 — Data synchronization drift**:
\`\`\`
Legacy DB and New DB gradually diverge because:
- Bug in CDC pipeline loses events
- Dual-write has unhandled edge cases
- Schema evolution on one side breaks sync
\`\`\`

Prevention:
- Run continuous reconciliation comparing both databases
- Alert on row count differences, checksum mismatches
- Have a repair mechanism to backfill missing data

**Pitfall 4 — Missing the anti-corruption layer**:
\`\`\`
New services directly call legacy APIs or read legacy DB
Legacy concepts (field names, business rules) leak into new code
When legacy is finally removed, new code is riddled with legacy assumptions
\`\`\`

Prevention:
- ACL from day one — no exceptions
- Code review rule: no legacy field names in new service code

**Pitfall 5 — Ignoring rollback**:
\`\`\`
Traffic switched to new service at 100%
Bug discovered after 2 hours
No way to route back to legacy
"We removed the legacy code last week"
\`\`\`

Prevention:
- Keep legacy running (read-only) for at least 2 weeks after cutover
- Feature flags for instant routing rollback
- Test rollback as part of migration runbook
- Monitor both old and new systems during transition`
      },
    ],

    dataModel: {
      description: 'Strangler fig migration architecture',
      schema: `Strangler Fig Migration Architecture:

  Phase: Partial Migration (60% new, 40% legacy)

  Clients
     |
  [API Gateway / Routing Layer]
     |
  Feature Flag / Route Rules:
     /api/users/*     --> New User Service (100%)
     /api/products/*  --> New Product Service (canary 30%)
                     --> Legacy Monolith (70%)
     /api/orders/*    --> Legacy Monolith (100%)
     /api/reports/*   --> Legacy Monolith (100%)
     |
  +------+------+
  |             |
  v             v
New Services   Legacy Monolith
  |             |
  v             v
New DB    <--CDC--> Legacy DB
(PostgreSQL)       (Oracle/MySQL)

Migration Tracking:
  Route           | Status      | Traffic | Data Owner
  /users          | COMPLETE    | 100%    | New DB
  /products       | CANARY      | 30%     | Legacy (syncing)
  /orders         | NOT STARTED | 0%      | Legacy
  /reports        | PLANNED     | 0%      | Legacy
  /payments       | IN PROGRESS | 0%      | Legacy`
    },
  },

  {
    id: 'bff-pattern',
    title: 'Backend for Frontend (BFF)',
    icon: 'globe',
    color: '#3b82f6',
    questions: 8,
    description: 'API tailoring per client type (web, mobile, IoT), GraphQL federation, and reducing over/under-fetching.',
    concepts: [
      'Client-specific API backends',
      'Over-fetching and under-fetching problems',
      'API aggregation and composition',
      'GraphQL as a BFF alternative',
      'BFF ownership model (frontend team owns BFF)',
      'Mobile vs web data requirements',
      'BFF vs API Gateway distinction',
    ],
    tips: [
      'Each BFF should be owned by the frontend team that consumes it — this aligns incentives and reduces cross-team coordination overhead',
      'Do not create one BFF per microservice; create one BFF per frontend client type (web, mobile, TV, IoT)',
      'BFFs should contain presentation logic and data aggregation only — not business logic, which belongs in the backend services',
      'Consider GraphQL as an alternative to BFF when clients need flexible queries, but be aware of the added complexity of schema management',
      'Monitor BFF response sizes per client: mobile responses should be smaller (less data, fewer images) than web responses',
      'BFFs can cache aggressively for data that changes infrequently, reducing load on downstream services',
    ],

    introduction: `The Backend for Frontend (BFF) pattern creates dedicated backend services tailored to the needs of specific frontend clients. Instead of one generic API serving web browsers, mobile apps, smart TVs, and IoT devices alike, each client type gets its own backend that returns exactly the data it needs in exactly the format it expects.

The pattern emerged from a common frustration: mobile developers need small, efficient payloads optimized for limited bandwidth, while web developers need richer data for complex UIs. A single generic API either over-fetches for mobile (wasting bandwidth) or under-fetches for web (requiring multiple round trips). BFF solves this by giving each client type its own purpose-built API.

SoundCloud, Netflix, and Spotify are well-known adopters. In interviews, the BFF pattern is often discussed alongside API Gateway (which handles routing and cross-cutting concerns) and GraphQL (which provides flexible client-driven queries). Understanding when to use each approach is a signal of design maturity.`,

    keyQuestions: [
      {
        question: 'What problems does the BFF pattern solve, and how does it work?',
        answer: `**Problem: One API, many clients**:
\`\`\`
Generic API Response for GET /products/123:

{
  "id": 123,
  "name": "Widget Pro",
  "description": "A very long description...(2KB)",
  "images": [
    {"url": "...", "width": 2400, "height": 1800},  // Full res
    {"url": "...", "width": 800, "height": 600},
    {"url": "...", "width": 200, "height": 150}
  ],
  "reviews": [ ... 50 reviews ... ],          // 10KB
  "relatedProducts": [ ... 20 items ... ],    // 5KB
  "specifications": { ... detailed specs ... } // 3KB
}

Total: ~20KB per product

Mobile app only needs: name, thumbnail image, price, rating
But gets 20KB when it needs 0.5KB
\`\`\`

**Solution: Dedicated BFF per client**:
\`\`\`
                       Microservices
                    +---+---+---+---+
                    | P | I | R | S |
                    | r | n | e | e |
  Web BFF --------> | o | v | v | a |
  (rich data)       | d | . | . | r |
                    | u |   |   | c |
  Mobile BFF -----> | c |   |   | h |
  (slim data)       | t |   |   |   |
                    +---+---+---+---+
  IoT BFF -------->
  (minimal data)

Web BFF Response:
  { name, description, images(all), reviews(20), specs }
  --> 15KB, optimized for desktop rendering

Mobile BFF Response:
  { name, thumbnail, price, rating, reviewCount }
  --> 0.5KB, optimized for mobile bandwidth

IoT BFF Response:
  { id, status, lastPrice }
  --> 0.1KB, minimal for constrained devices
\`\`\`

**BFF responsibilities**:
1. **Aggregate**: Call multiple backend services, merge responses
2. **Transform**: Shape data for the specific client (field selection, formatting)
3. **Optimize**: Compress images, paginate appropriately, batch requests
4. **Cache**: Cache stable data at the BFF layer
5. **Handle errors**: Provide client-appropriate error messages and fallbacks`
      },
      {
        question: 'How is a BFF different from an API Gateway?',
        answer: `They operate at different layers and serve different purposes:

\`\`\`
  Clients
     |
  [API Gateway]                   <-- Cross-cutting concerns
  | - Authentication              (shared across ALL clients)
  | - Rate limiting
  | - TLS termination
  | - Request logging
  | - Routing
     |
  +--------+--------+
  |        |        |
  v        v        v
Web BFF  Mobile   IoT BFF        <-- Client-specific logic
         BFF                      (owned by frontend teams)
  |        |        |
  +--------+--------+
  |        |        |
  v        v        v
  Backend Microservices           <-- Business logic
  (Product, Inventory, etc.)      (owned by backend teams)
\`\`\`

**API Gateway**:
- One instance shared by all clients
- Handles infrastructure concerns (auth, rate limiting, routing, TLS)
- Owned by platform/infrastructure team
- Thin: minimal data transformation
- Sits at the edge of the network

**BFF**:
- One instance per client type
- Handles presentation concerns (aggregation, shaping, optimization)
- Owned by the frontend team for that client
- Thick: significant data transformation and composition
- Sits between gateway and backend services

**Key distinction**: The API Gateway does not know or care what type of client is calling. The BFF exists specifically because different client types need different things.

\`\`\`
Anti-pattern: Fat API Gateway

  [API Gateway]
  | - Auth (correct)
  | - Rate limiting (correct)
  | - Mobile-specific response shaping (WRONG!)
  | - Web-specific aggregation (WRONG!)
  | - IoT payload compression (WRONG!)

  This turns the gateway into a monolithic BFF.
  Keep the gateway thin; use separate BFFs.
\`\`\`

**Can you combine them?** Yes, in simple systems:
- < 2 client types: A single API gateway with some BFF logic is acceptable
- 2-3 client types: Separate BFFs behind a shared gateway
- 4+ client types or complex needs: BFFs are essential`
      },
      {
        question: 'When should you use GraphQL instead of (or alongside) BFFs?',
        answer: `**GraphQL can replace BFFs** when the primary problem is over/under-fetching and clients want to define their own queries.

\`\`\`
BFF approach:
  Web BFF:    GET /api/web/product/123     --> curated web response
  Mobile BFF: GET /api/mobile/product/123  --> curated mobile response

  Each BFF is a separate service with separate code.

GraphQL approach:
  Both clients: POST /graphql

  Web query:
    { product(id: 123) { name, description, images, reviews(limit: 20) } }

  Mobile query:
    { product(id: 123) { name, thumbnail, price, rating } }

  Single endpoint, clients choose their own fields.
\`\`\`

**When GraphQL is better**:
- Many client types with overlapping but different data needs
- Clients iterate rapidly and change data requirements frequently
- Strong frontend engineering team comfortable with GraphQL
- Backend data model is graph-like (social networks, content platforms)

**When BFF is better**:
- Client needs go beyond field selection (different business logic per client)
- Need to call non-GraphQL backends (legacy SOAP, file systems, etc.)
- Team does not have GraphQL expertise
- Performance-critical: BFF can be highly optimized per client

**Hybrid approach** (Netflix, Airbnb):
\`\`\`
  Web Client      Mobile Client
     |                 |
  [GraphQL Gateway]    |
     |                 |
  [Federation]     [Mobile BFF]
     |                 |
  Microservices    Microservices

  - Web uses GraphQL for flexible queries
  - Mobile uses BFF for highly optimized, minimal payloads
  - GraphQL federation stitches backend schemas
\`\`\`

**GraphQL Federation** (Apollo Federation):
- Each microservice defines its own GraphQL schema
- A gateway composes them into a unified schema
- Clients query the gateway as if it were a single API
- Acts like an automatic BFF with client-driven query flexibility

**Trade-offs**:
\`\`\`
Concern          | BFF           | GraphQL
N+1 queries      | Controlled    | Must use DataLoader
Caching          | HTTP caching  | Complex (POST-based)
Security         | Simple (REST) | Query depth/complexity limits
Learning curve   | Low           | Medium-High
Flexibility      | Low (fixed)   | High (client-driven)
Performance ctrl | High          | Medium
\`\`\``
      },
      {
        question: 'How should BFF ownership and deployment work in a team structure?',
        answer: `**Principle: The team that owns the frontend owns its BFF.**

\`\`\`
Team Structure:

  Web Team                Mobile Team           IoT Team
  +------------------+    +------------------+  +------------------+
  | React App        |    | React Native App |  | Device Firmware  |
  | Web BFF (Node.js)|    | Mobile BFF (Go)  |  | IoT BFF (Rust)   |
  +------------------+    +------------------+  +------------------+
         |                       |                      |
         +----------+------------+----------------------+
                    |
              Backend Teams
         +----------+----------+
         | Product  | Payment  |
         | Service  | Service  |
         | (Java)   | (Python) |
         +----------+----------+
\`\`\`

**Why frontend teams own BFFs**:
1. **Aligned incentives**: The team consuming the API defines its shape
2. **Faster iteration**: Frontend changes do not require backend team coordination
3. **Domain knowledge**: Frontend team knows exactly what data the UI needs
4. **Technology choice**: BFF can use the same language as the frontend (Node.js for React teams)

**Deployment model**:
\`\`\`
Option A: BFF as a separate service (recommended)
  - Independent deployment pipeline
  - Own scaling characteristics
  - Own monitoring and alerts
  - Deployed per region, scaled independently

Option B: BFF as a middleware layer in the frontend
  - Next.js API routes, Remix loaders
  - Simpler infrastructure (one deployment)
  - Tighter coupling between BFF and frontend

Option C: BFF as serverless functions
  - AWS Lambda, Vercel Functions
  - Zero idle cost
  - Per-route scaling
  - Cold start latency concern
\`\`\`

**Versioning and contracts**:
\`\`\`
BFF --> Backend Service contract:
  - Backend services publish OpenAPI/gRPC schemas
  - BFF consumes schemas with generated clients
  - Breaking changes require version bump

Frontend --> BFF contract:
  - BFF is owned by the same team, so less formal
  - But still version the BFF API for backward compatibility
  - Useful when multiple app versions are in the wild (mobile apps)
\`\`\`

**Anti-patterns to avoid**:
1. **Shared BFF**: One BFF serving multiple client types (defeats the purpose)
2. **Business logic in BFF**: BFF should aggregate and shape, not implement business rules
3. **Backend team owns BFF**: Creates coordination bottleneck, opposite of the pattern's intent
4. **BFF per microservice**: Creates N BFFs that each call one service; use BFF per client type instead`
      },
    ],

    dataModel: {
      description: 'BFF architecture and data flow',
      schema: `BFF Architecture:

  Web Browser       Mobile App        Smart TV
      |                 |                |
      v                 v                v
  +--------+      +---------+      +--------+
  | Web BFF|      |Mobile   |      | TV BFF |
  | (Node) |      |BFF (Go) |      | (Node) |
  +---+----+      +----+----+      +---+----+
      |                |               |
      +-------+--------+-------+-------+
              |                |
        +-----+-----+   +-----+-----+
        | Product   |   | User      |
        | Service   |   | Service   |
        +-----------+   +-----------+

Response Size Comparison (same product):
  Web BFF:    ~15KB (full details, reviews, images)
  Mobile BFF: ~1KB  (summary, thumbnail, rating)
  TV BFF:     ~3KB  (title, hero image, description)

Ownership:
  Web BFF     --> Web Frontend Team
  Mobile BFF  --> Mobile Frontend Team
  TV BFF      --> TV App Team
  Services    --> Backend Platform Teams`
    },
  },

  {
    id: 'event-driven-architecture',
    title: 'Event-Driven Architecture',
    icon: 'database',
    color: '#8b5cf6',
    questions: 12,
    description: 'Event sourcing, event streaming, pub/sub messaging, event store design, and CQRS integration.',
    concepts: [
      'Domain events and event types',
      'Event sourcing (storing events as source of truth)',
      'Event streaming (Kafka, Kinesis)',
      'Pub/sub messaging patterns',
      'Event store design',
      'Event schema evolution',
      'Exactly-once vs at-least-once delivery',
      'Dead letter queues and poison messages',
    ],
    tips: [
      'Name events in past tense (OrderPlaced, PaymentProcessed) because they represent facts that have already happened',
      'Events should be immutable — never update or delete events; append new corrective events instead',
      'Design events to be self-contained with enough context that consumers do not need to call back to the producer for details',
      'Use schema registries (Confluent Schema Registry, AWS Glue) to manage event schema evolution and prevent breaking changes',
      'Implement idempotent consumers: the same event processed twice must produce the same result',
      'Monitor consumer lag in Kafka; growing lag indicates consumers cannot keep up with producers',
      'Start with at-least-once delivery and idempotent consumers rather than attempting exactly-once (which is much harder to achieve)',
    ],

    introduction: `Event-driven architecture (EDA) is a design paradigm where services communicate through events — records of things that have happened. Instead of Service A calling Service B directly (synchronous coupling), Service A publishes an event ("OrderPlaced"), and any interested services react to it independently.

This decoupling is transformative for microservices. Services do not need to know about each other; they only need to know about events. Adding a new feature (e.g., sending order confirmation emails) means deploying a new consumer that listens for OrderPlaced events — without modifying the Order Service.

At its most ambitious, event sourcing stores every state change as an immutable event, making the event log the authoritative source of truth rather than the current state in a database. This powers systems at LinkedIn (Kafka processes trillions of events), Netflix (real-time recommendations), and financial systems (audit trails). Interviewers love EDA because it touches on eventual consistency, distributed systems, and architectural trade-offs.`,

    keyQuestions: [
      {
        question: 'What is event sourcing and how does it differ from traditional state storage?',
        answer: `**Traditional (state-based) storage**:
Store the current state. When state changes, overwrite the previous value.

\`\`\`
Traditional: Store current state

  UPDATE accounts SET balance = 900 WHERE id = 1;
  -- Previous balance (1000) is LOST

  accounts table:
  | id | balance |
  |----|---------|
  | 1  | 900     |   <-- Only current state

  Question: "Why is the balance 900?"
  Answer: "We don't know. The history is gone."
\`\`\`

**Event sourcing**: Store every state change as an immutable event. The current state is derived by replaying events.

\`\`\`
Event sourced: Store events

  events table:
  | seq | aggregate_id | type         | data            | timestamp  |
  |-----|-------------|--------------|-----------------|------------|
  | 1   | account-1   | AccountOpened| {balance: 0}    | 2024-01-01 |
  | 2   | account-1   | MoneyDeposited| {amount: 1000} | 2024-01-02 |
  | 3   | account-1   | MoneyWithdrawn| {amount: 100}  | 2024-01-03 |

  Current state = replay events:
    0 + 1000 - 100 = 900

  Question: "Why is the balance 900?"
  Answer: "Opened at 0, deposited 1000, withdrew 100."
  Complete audit trail!
\`\`\`

**Rebuilding state from events**:
\`\`\`
function rebuild(events):
  state = {}
  for event in events:
    state = apply(state, event)
  return state

apply(state, AccountOpened{balance: 0}):
  return { balance: 0 }

apply(state, MoneyDeposited{amount: 1000}):
  return { balance: state.balance + 1000 }

apply(state, MoneyWithdrawn{amount: 100}):
  return { balance: state.balance - 100 }
\`\`\`

**Snapshots** (performance optimization):
\`\`\`
After 10,000 events, rebuilding is slow.
Solution: periodically save a snapshot.

  Snapshot at event 9,000: { balance: 45,230 }
  To get current state: load snapshot + replay events 9,001-10,000
  Instead of replaying all 10,000 events
\`\`\`

**Benefits**: Complete audit trail, temporal queries ("what was the balance on March 1?"), debugging (replay events to reproduce bugs), event replay for new projections.

**Trade-offs**: Complexity (event replay, schema evolution), eventual consistency, storage growth (mitigated by snapshots), steep learning curve.`
      },
      {
        question: 'How do you handle event schema evolution without breaking consumers?',
        answer: `**The problem**: Events are immutable and stored forever. But your domain model evolves. If you change an event's schema, old events in the store become incompatible.

**Strategy 1 — Backward compatible changes only**:
\`\`\`
V1: OrderPlaced { orderId, customerId, total }
V2: OrderPlaced { orderId, customerId, total, currency }

Rules:
- ADD optional fields (with defaults): OK
- REMOVE fields: NEVER (old consumers depend on them)
- RENAME fields: NEVER (add new field, keep old)
- CHANGE types: NEVER (add new field with new type)
\`\`\`

**Strategy 2 — Schema Registry**:
\`\`\`
Producer                Schema Registry          Consumer
   |                        |                       |
   |-- Register schema v2 ->|                       |
   |<-- Compatibility check--|                       |
   |   (backward OK)        |                       |
   |                        |                       |
   |-- Publish event ------>|-- (encoded with v2) ->|
   |                        |                       |
   |                        |<-- Fetch schema ------|
   |                        |-- Return v2 schema -->|
   |                        |    (consumer decodes) |

Compatibility modes:
  BACKWARD:  New schema can read old data (add optional fields)
  FORWARD:   Old schema can read new data (delete optional fields)
  FULL:      Both backward and forward compatible
  NONE:      No compatibility guarantee
\`\`\`

**Strategy 3 — Event versioning**:
\`\`\`
Explicit version in event type:

  OrderPlaced_v1 { orderId, customerId, total }
  OrderPlaced_v2 { orderId, customerId, total, currency, items[] }

Consumer handles both:
  if event.type == "OrderPlaced_v1":
    currency = "USD"  // default
    items = []
  elif event.type == "OrderPlaced_v2":
    currency = event.currency
    items = event.items
\`\`\`

**Strategy 4 — Upcaster**:
Transform old events to new schema when reading.
\`\`\`
  Event Store: [v1 events, v2 events, v3 events]
                    |           |          |
  Upcaster:    v1->v3      v2->v3      (no change)
                    |           |          |
  Consumer:      [all events in v3 format]

  Upcaster logic:
    v1->v2: add currency="USD"
    v2->v3: add region=infer_from_customer(customerId)
\`\`\`

**Best practice**: Use a schema registry with BACKWARD compatibility as the default. Add optional fields with defaults. Version events explicitly only when a breaking change is unavoidable. Use upcasters to bridge old events to new consumers.`
      },
      {
        question: 'Compare at-least-once, at-most-once, and exactly-once delivery semantics.',
        answer: `**At-most-once delivery**:
Send the message and do not retry. Message may be lost.
\`\`\`
Producer --> Broker --> Consumer
   |           |          |
   |-- Send -->|          |
   |           |-- Deliver-->|
   |           |          |-- ACK lost (network)
   |           |          |
   Message NOT redelivered. Consumer processed it once.
   But if delivery itself fails, message is LOST.
\`\`\`
Use when: Metrics, logs, non-critical notifications (acceptable to lose some)

**At-least-once delivery**:
Retry until acknowledged. Message may be delivered multiple times.
\`\`\`
Producer --> Broker --> Consumer
   |           |          |
   |-- Send -->|          |
   |           |-- Deliver-->|
   |           |          |-- Process
   |           |          |-- ACK lost (network)
   |           |          |
   |           |-- Redeliver->|
   |           |          |-- Process AGAIN (duplicate!)
   |           |<-- ACK --|
\`\`\`
Use when: Most business events (combined with idempotent consumers)

**Exactly-once delivery** (in practice: exactly-once processing):
True exactly-once delivery across network boundaries is impossible (Two Generals Problem). What systems achieve is exactly-once processing via:

\`\`\`
Approach 1: Idempotent consumer (most common)
  Consumer tracks processed event IDs:

  processed_events table:
  | event_id | processed_at |
  |----------|-------------|
  | evt-123  | 2024-01-01  |

  On receive:
    if event_id in processed_events:
      skip (already processed)
    else:
      process event
      INSERT INTO processed_events (event_id)
      COMMIT (atomically with business transaction)

Approach 2: Transactional outbox (Kafka Transactions)
  Producer writes to DB + event in same transaction:

  BEGIN TRANSACTION
    INSERT INTO orders (...)
    INSERT INTO outbox (event_data)
  COMMIT

  Separate process reads outbox and publishes to Kafka.
  Kafka transactions ensure producer->broker exactly-once.
\`\`\`

**Kafka's exactly-once semantics**:
\`\`\`
Producer (idempotent + transactional)
   |
   |-- Produce with sequence number
   |-- Broker deduplicates by sequence
   |-- Kafka transaction spans multiple topics/partitions
   |
Consumer (read-process-write pattern)
   |
   |-- Read from input topic
   |-- Process
   |-- Write to output topic + commit offset
   |-- All in one Kafka transaction
\`\`\`

**Recommendation**: Use at-least-once delivery with idempotent consumers. This is simpler, more reliable, and works across any message broker. Reserve Kafka transactions for stream processing pipelines where exactly-once between Kafka topics is needed.`
      },
      {
        question: 'How do you design an event store and handle event replay?',
        answer: `**Event store schema**:
\`\`\`
events table:
  sequence_number  BIGSERIAL PRIMARY KEY  (global ordering)
  aggregate_type   VARCHAR               (e.g., "Order")
  aggregate_id     UUID                  (e.g., order-123)
  event_type       VARCHAR               (e.g., "OrderPlaced")
  event_data       JSONB                 (event payload)
  metadata         JSONB                 (correlation_id, user_id, etc.)
  version          INT                   (per-aggregate sequence)
  created_at       TIMESTAMP

Indexes:
  (aggregate_type, aggregate_id, version) -- load aggregate
  (event_type, created_at)                -- replay by type
  (created_at)                            -- replay by time range

Unique constraint:
  (aggregate_id, version) -- optimistic concurrency control
\`\`\`

**Optimistic concurrency** (prevent lost updates):
\`\`\`
Thread A reads: Order-123 at version 5
Thread B reads: Order-123 at version 5

Thread A writes: event at version 6 --> SUCCESS
Thread B writes: event at version 6 --> CONFLICT (duplicate version)
                                        Retry: re-read, re-apply

INSERT INTO events (aggregate_id, version, ...)
  VALUES ('order-123', 6, ...)
  -- unique constraint prevents duplicate version
\`\`\`

**Event replay use cases**:

1. **Rebuild read model (projection)**:
\`\`\`
New reporting requirement: "Orders by region"

  Event Store
       |
  Replay all OrderPlaced events
       |
  Build new projection:
  orders_by_region:
    | region   | count | total_revenue |
    |----------|-------|---------------|
    | US-East  | 5,234 | $1.2M         |
    | EU-West  | 3,102 | $890K         |

  No schema migration! Just replay events into a new shape.
\`\`\`

2. **Debug production issues**:
\`\`\`
"Why is Order-456 in a weird state?"

  SELECT * FROM events
  WHERE aggregate_id = 'order-456'
  ORDER BY version;

  version 1: OrderCreated { items: [...] }
  version 2: PaymentAuthorized { amount: 100 }
  version 3: InventoryReserved { items: [...] }
  version 4: PaymentFailed { reason: "card declined" }
  version 5: InventoryReleased { items: [...] }
  -- Ah, payment failed AFTER inventory was reserved.
  -- The compensation worked correctly.
\`\`\`

3. **Temporal queries**:
\`\`\`
"What was the account balance on March 1?"

  Replay events up to March 1:
  SELECT * FROM events
  WHERE aggregate_id = 'account-1'
    AND created_at <= '2024-03-01'
  ORDER BY version;

  Result: balance as of March 1 = $45,230
\`\`\`

**Performance considerations**:
- Use snapshots every N events (e.g., every 100) to avoid replaying full history
- Partition events by aggregate_id for write scaling
- Use separate read-optimized projections for queries (CQRS pattern)
- Archive old events to cold storage after snapshotting`
      },
    ],

    dataModel: {
      description: 'Event-driven architecture and event store',
      schema: `Event-Driven Architecture:

  Producers              Event Broker            Consumers
  +--------+          +--------------+         +----------+
  | Order  |--event-->| Kafka/       |--event->| Email    |
  | Service|          | EventBridge/ |         | Service  |
  +--------+          | Kinesis      |         +----------+
  +--------+          |              |         +----------+
  |Payment |--event-->|  Topics:     |--event->| Analytics|
  |Service |          |  orders.*    |         | Service  |
  +--------+          |  payments.*  |         +----------+
                      |  inventory.* |         +----------+
                      +--------------+--event->| Search   |
                                               | Indexer  |
                                               +----------+

Event Store Schema:
  events (
    sequence_number BIGSERIAL PK,
    aggregate_id    UUID,
    event_type      VARCHAR,
    event_data      JSONB,
    version         INT,
    created_at      TIMESTAMP
  )

  snapshots (
    aggregate_id    UUID PK,
    version         INT,
    state           JSONB,
    created_at      TIMESTAMP
  )

Event Flow:
  Command --> Validate --> Event(s) --> Store --> Publish --> React`
    },
  },

  {
    id: 'cqrs',
    title: 'CQRS (Command Query Responsibility Segregation)',
    icon: 'database',
    color: '#8b5cf6',
    questions: 10,
    description: 'Command/query separation, read/write model separation, eventual consistency, and materialized views.',
    concepts: [
      'Command vs Query separation',
      'Write model (command side)',
      'Read model (query side, materialized views)',
      'Eventual consistency between read and write',
      'Projection and denormalization',
      'Event sourcing + CQRS synergy',
      'Consistency trade-offs and sync strategies',
    ],
    tips: [
      'CQRS does not require event sourcing — you can use CQRS with a traditional database by maintaining separate read and write schemas',
      'Start simple: separate read and write repositories in code before splitting into separate databases',
      'Design read models to answer specific queries without joins — each read model is a pre-computed, denormalized view',
      'Accept eventual consistency on the read side and communicate staleness to users (e.g., "updated a few seconds ago")',
      'Rebuild read models from scratch by replaying the write side events — this is your safety net for bugs in projections',
      'Monitor replication lag between write and read models; alert when it exceeds your SLA',
    ],

    introduction: `CQRS separates the model for reading data from the model for writing data. Instead of a single data model that handles both reads and writes (the traditional CRUD approach), CQRS uses distinct models optimized for their specific purpose: a write model that enforces business rules and an read model that is shaped for fast, efficient queries.

The motivation is that read and write workloads have fundamentally different characteristics. Writes need validation, business rules, and transactions. Reads need speed, denormalization, and flexibility. A single model that tries to serve both compromises on each. CQRS eliminates this tension by letting each side be independently optimized and scaled.

When combined with event sourcing, CQRS becomes especially powerful: the write side appends events, and the read side builds materialized views by projecting those events into query-optimized shapes. This pairing is used at companies like Axon (banking), EventStore (infrastructure), and many financial systems. In interviews, be ready to discuss when CQRS is worth the added complexity and when a simpler CRUD model suffices.`,

    keyQuestions: [
      {
        question: 'How does CQRS separate reads and writes, and what are the architectural options?',
        answer: `**Level 1 — Code-level separation** (simplest):
\`\`\`
Same database, separate code paths:

  [Command Handler]              [Query Handler]
  - Validates input              - Simple SELECT queries
  - Enforces business rules      - No business logic
  - Writes to DB                 - Reads from DB
  - Returns success/failure      - Returns data
        |                              |
        v                              v
  +----------------------------------+
  |        Single Database            |
  |  (shared tables, shared schema)   |
  +----------------------------------+

Benefit: Clean code, no infrastructure change
Trade-off: Read queries limited by write schema
\`\`\`

**Level 2 — Separate read and write models** (common):
\`\`\`
Same or separate databases, different schemas:

  Commands                         Queries
     |                                |
     v                                v
  [Write Model]                  [Read Model]
  - Normalized tables            - Denormalized views
  - Business invariants          - Pre-joined data
  - Transactions                 - No joins needed
     |                                ^
     v                                |
  Write DB          Sync          Read DB
  (PostgreSQL) ------------->  (PostgreSQL/Elastic)
               (CDC, events,
                or triggers)

Benefit: Read model optimized for queries
Trade-off: Eventual consistency, sync complexity
\`\`\`

**Level 3 — Event sourcing + CQRS** (most powerful):
\`\`\`
  Commands                         Queries
     |                                |
     v                                v
  [Command Handler]              [Query Handler]
     |                                |
     v                                v
  Event Store                    Read Store(s)
  (append-only)                  (materialized views)
     |                                ^
     v                                |
  Events ------> [Projector] -------->|

  Write: Append events to event store
  Read:  Query pre-built materialized views
  Sync:  Projector listens to events, updates read models
\`\`\`

**Multiple read models for different queries**:
\`\`\`
  Event Store
       |
       +--[Projector A]--> Order Summary View (Redis)
       |                   { orderId, status, total }
       |
       +--[Projector B]--> Order Search Index (Elasticsearch)
       |                   { full-text search on items }
       |
       +--[Projector C]--> Order Analytics (ClickHouse)
                           { aggregations by region, time }

Each read model is optimized for its specific query pattern.
\`\`\``
      },
      {
        question: 'How do you handle eventual consistency between the write and read models?',
        answer: `**The fundamental challenge**: After a write, the read model may not reflect the change immediately.

\`\`\`
Timeline:
  t=0:   User creates order (write model updated)
  t=0:   Event published: OrderCreated
  t=50ms:  Projector receives event
  t=100ms: Read model updated

  If user queries at t=20ms, they see stale data.
  "I just created an order but it's not in my order list!"
\`\`\`

**Strategy 1 — Read-your-writes consistency**:
After a write, route the user's subsequent reads to the write model (or wait for the read model to catch up).

\`\`\`
Option A: Return the created entity directly from the command response
  POST /orders --> { id: "order-123", status: "CREATED", ... }
  Frontend uses this data immediately, no need to query read model

Option B: Poll until read model is consistent
  POST /orders --> { id: "order-123", version: 5 }
  GET /orders/order-123?min_version=5
  --> If read model version < 5, return 409 or wait
  --> If read model version >= 5, return data

Option C: Causal consistency token
  Write returns: { token: "v5-order-123" }
  Read sends: If-Match: "v5-order-123"
  Read model waits until it has processed up to this version
\`\`\`

**Strategy 2 — Optimistic UI**:
The frontend optimistically updates the UI before the read model catches up.
\`\`\`
  1. User clicks "Create Order"
  2. Frontend immediately adds order to UI (optimistic)
  3. Backend processes write asynchronously
  4. Read model eventually updates
  5. Next full refresh shows consistent data

  If write fails: frontend rolls back optimistic update
\`\`\`

**Strategy 3 — Acceptable staleness**:
For non-critical reads, accept that data may be a few seconds old.
\`\`\`
  Dashboard showing "Total orders today: 1,234"
  This number being 5 seconds stale is perfectly acceptable.

  Display: "Last updated: 3 seconds ago"
  User knows the data is slightly stale.
\`\`\`

**Monitoring consistency lag**:
\`\`\`
Metrics:
  cqrs_projection_lag_ms{projection="orders"} gauge
  cqrs_events_pending{projection="orders"}    gauge

  Alert if:
    projection_lag > 5 seconds (Warning)
    projection_lag > 30 seconds (Critical)
    events_pending > 10,000 (Backlog alert)
\`\`\`

**Key interview point**: Eventual consistency is a trade-off you choose, not a bug. State clearly which queries need strong consistency (use read-your-writes) and which can tolerate staleness (use async projection).`
      },
      {
        question: 'When should you use CQRS and when is it overkill?',
        answer: `**Use CQRS when**:

1. **Read and write patterns are very different**:
   - Writes: Complex business rules, validations, 100 writes/sec
   - Reads: Simple lookups, full-text search, 10,000 reads/sec
   - Different scaling needs justify separate models

2. **Multiple read representations needed**:
   - Same data queried as: list view, search results, analytics, reports
   - Each read model is optimized for its query pattern

3. **Collaborative domains**:
   - Multiple users modifying the same data
   - Need to track who changed what and when
   - Event sourcing + CQRS provides complete audit trail

4. **Performance requires different storage engines**:
   - Write: PostgreSQL (ACID transactions)
   - Read: Elasticsearch (full-text search) + Redis (fast lookups)

**Do NOT use CQRS when**:

1. **Simple CRUD application**:
\`\`\`
   Blog with authors and posts
   Read and write patterns are similar
   A single PostgreSQL database with proper indexes suffices

   CQRS adds: 2 models, sync mechanism, eventual consistency
   Benefit: Nearly zero
   Cost: Significant complexity
\`\`\`

2. **Small team or prototype**:
   - CQRS requires more code, more infrastructure, more monitoring
   - Ship fast first, refactor to CQRS if scaling demands it

3. **Strong consistency is non-negotiable everywhere**:
   - Financial ledger where every read MUST be up-to-date
   - CQRS eventual consistency adds risk
   - (Though you CAN do synchronous projections)

4. **Low traffic**:
   - If your single database handles both reads and writes comfortably
   - Premature optimization adds complexity without benefit

\`\`\`
Decision Framework:

  Read/Write ratio > 10:1?
  |-- No  --> Probably don't need CQRS
  |-- Yes
       |
  Different query patterns needed?
  |-- No  --> Probably don't need CQRS
  |-- Yes
       |
  Can you accept eventual consistency?
  |-- No  --> CQRS possible but harder (sync projection)
  |-- Yes --> CQRS is a good fit
       |
  Do you have the team to maintain it?
  |-- No  --> Start simple, add CQRS later
  |-- Yes --> Implement CQRS
\`\`\``
      },
      {
        question: 'How do you build and maintain projections (read models) in a CQRS system?',
        answer: `**Projection**: A function that transforms a stream of events into a read-optimized data structure.

\`\`\`
Event Stream:
  1. OrderCreated { id, customerId, items, total }
  2. PaymentProcessed { orderId, amount, method }
  3. OrderShipped { orderId, trackingNumber, carrier }

Projection: "Order Summary View"
  Input: Order events
  Output: Denormalized order summary

  function project(event, currentView):
    switch(event.type):
      case OrderCreated:
        return {
          orderId: event.id,
          customer: event.customerId,
          total: event.total,
          itemCount: event.items.length,
          status: "CREATED",
          payment: null,
          shipping: null
        }
      case PaymentProcessed:
        return { ...currentView,
          status: "PAID",
          payment: { amount: event.amount, method: event.method }
        }
      case OrderShipped:
        return { ...currentView,
          status: "SHIPPED",
          shipping: { tracking: event.trackingNumber, carrier: event.carrier }
        }
\`\`\`

**Projection types**:

1. **Synchronous projection** (inline, strong consistency):
\`\`\`
  Write Transaction:
    BEGIN
      INSERT INTO events (...)
      UPDATE order_summary_view SET status = 'PAID' WHERE ...
    COMMIT

  Pro: Read model always consistent
  Con: Slower writes, couples write to read schema
\`\`\`

2. **Asynchronous projection** (eventual consistency):
\`\`\`
  Write:  INSERT INTO events --> COMMIT
  Async:  Projector polls/subscribes to new events
          Updates read model in separate transaction

  Pro: Fast writes, independent read model
  Con: Eventual consistency, need to handle lag
\`\`\`

**Rebuilding a projection**:
\`\`\`
Scenario: Bug in projector, read model has wrong data.

  1. Delete the read model (DROP TABLE order_summary_view)
  2. Reset projector position to beginning of event stream
  3. Replay ALL events through the projector
  4. Read model rebuilt from scratch, bug-free

  Timeline:
    1M events, 10K events/sec processing = ~100 seconds rebuild

  During rebuild:
  - Serve stale data from backup/cache
  - Or show "updating" status to users
  - Or route queries to a secondary projection
\`\`\`

**Projection management**:
\`\`\`
Track projection status:

  projection_status table:
  | name            | last_event_seq | lag_ms | status    |
  |-----------------|---------------|--------|-----------|
  | order_summary   | 1,234,567     | 50     | RUNNING   |
  | order_search    | 1,234,560     | 120    | RUNNING   |
  | order_analytics | 1,200,000     | 34,567 | REBUILDING|

  Monitor: lag_ms per projection
  Alert: if lag > threshold
  Action: Scale projector, fix bugs, rebuild
\`\`\``
      },
    ],

    dataModel: {
      description: 'CQRS architecture with read and write separation',
      schema: `CQRS Architecture:

  Commands (Writes)              Queries (Reads)
       |                              |
       v                              v
  [Command Handler]            [Query Handler]
  - Validate                   - Simple lookups
  - Business rules             - No business logic
  - Emit events                - Return data
       |                              ^
       v                              |
  Write Store                   Read Store(s)
  (Event Store or               (Materialized Views)
   normalized DB)
       |                              ^
       v                              |
  Events -----> [Projector] ----------+

Write Model (normalized):
  orders (id, customer_id, status, created_at)
  order_items (id, order_id, product_id, qty, price)
  payments (id, order_id, amount, method, status)

Read Model (denormalized):
  order_summary_view:
    order_id | customer_name | item_count | total | status | paid_at | tracking

  Optimized for: GET /orders?customer=X&status=SHIPPED
  No joins needed. Single table scan.`
    },
  },

  {
    id: 'configuration-externalization',
    title: 'Configuration Externalization',
    icon: 'layers',
    color: '#f59e0b',
    questions: 8,
    description: 'Centralized configuration management, feature flags, Spring Cloud Config, Consul KV, and runtime reconfiguration.',
    concepts: [
      'Centralized vs distributed configuration',
      'Environment-specific configuration',
      'Feature flags and toggles',
      'Runtime reconfiguration (hot reload)',
      'Configuration as code',
      'Secrets management',
      'Configuration drift detection',
    ],
    tips: [
      'Never hardcode configuration values — even "constants" like timeout values should be externalized so they can be tuned without redeployment',
      'Separate secrets (API keys, passwords) from configuration (feature flags, timeouts) and use dedicated secret management tools (Vault, AWS Secrets Manager)',
      'Version control your configuration alongside your code, but keep environment-specific values in the config server, not in the repository',
      'Implement a fallback chain: command-line args > environment variables > config server > local defaults',
      'Feature flags should have owners and expiration dates — stale flags accumulate as technical debt',
      'Test with production configuration in staging before deploying to production; many outages are caused by configuration differences between environments',
    ],

    introduction: `Configuration externalization moves application configuration out of the codebase and into a centralized, manageable location. In a microservices architecture with dozens or hundreds of services, each potentially running multiple instances across environments (dev, staging, production), managing configuration becomes a significant operational challenge.

The core principle is separating what the code does (logic) from how it behaves (configuration). Database connection strings, feature flags, timeout values, rate limits, and third-party API URLs should all be externalized so they can be changed without recompiling, redeploying, or restarting the application.

This pattern underpins operational practices at every major tech company. Netflix's Archaius, Spring Cloud Config, HashiCorp Consul, and etcd (Kubernetes ConfigMaps) all implement variations of this pattern. In interviews, demonstrating awareness of configuration management shows operational maturity beyond just writing code.`,

    keyQuestions: [
      {
        question: 'What are the different approaches to externalized configuration and when do you use each?',
        answer: `**Approach 1 — Environment variables** (simplest):
\`\`\`
Application reads:
  DATABASE_URL=postgres://host:5432/mydb
  CACHE_TTL=300
  FEATURE_NEW_CHECKOUT=true

Set via:
  Docker:      ENV DATABASE_URL=...
  Kubernetes:  env: [{ name: DATABASE_URL, value: ... }]
  Platform:    Heroku/Railway dashboard

Pros: Universal, language-agnostic, 12-factor app compliant
Cons: No versioning, no dynamic updates, flat key-value only
Best for: Simple applications, container orchestration
\`\`\`

**Approach 2 — Configuration server** (centralized):
\`\`\`
  +---------------------+
  | Config Server       |
  | (Spring Cloud Config|
  |  / Consul KV)       |
  +----------+----------+
             |
     +-------+-------+-------+
     |       |       |       |
     v       v       v       v
   Svc A   Svc B   Svc C   Svc D

  Features:
  - Git-backed (Spring Cloud Config): config stored in Git repo
  - Version history and audit trail
  - Environment-specific overrides
  - Dynamic refresh without restart
  - Encryption of sensitive values

Best for: Microservices needing centralized, versioned config
\`\`\`

**Approach 3 — Kubernetes ConfigMaps and Secrets**:
\`\`\`
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  CACHE_TTL: "300"
  LOG_LEVEL: "info"

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
data:
  DATABASE_PASSWORD: base64(...)

Pod mounts ConfigMap as env vars or files.
Changes can trigger rolling restart or volume refresh.

Best for: Kubernetes-native applications
\`\`\`

**Approach 4 — Feature flag platform** (specialized):
\`\`\`
  +----------------------+
  | Feature Flag Service |
  | (LaunchDarkly / Split|
  |  / Unleash / Flagr)  |
  +----------+-----------+
             |
  Real-time evaluation:
    isEnabled("new-checkout", { userId: "u-123", region: "US" })
    --> true (for 10% of US users)

  Features:
  - Per-user/segment targeting
  - Gradual rollout (1% -> 10% -> 50% -> 100%)
  - Kill switch (instant disable)
  - A/B testing integration
  - Audit log of all flag changes

Best for: Feature rollout, experimentation, kill switches
\`\`\`

**Recommended combination**:
\`\`\`
  Secrets     --> Vault / AWS Secrets Manager
  App config  --> Kubernetes ConfigMaps + Config Server
  Feature flags --> LaunchDarkly / Unleash

  Each tool for its specific strength.
\`\`\``
      },
      {
        question: 'How do you implement runtime reconfiguration without restarting services?',
        answer: `**The goal**: Change configuration in production and have services pick it up within seconds, without restart or redeployment.

**Approach 1 — Polling**:
\`\`\`
Service                Config Server
  |                        |
  |-- GET /config -------->|  (every 30 seconds)
  |<-- { cacheTTL: 300 } --|
  |                        |
  ...30 seconds later...
  |                        |
  |-- GET /config -------->|
  |<-- { cacheTTL: 600 } --|  (changed!)
  |                        |
  Service applies new cacheTTL = 600

Pros: Simple, works with any config server
Cons: Up to 30s delay, unnecessary network traffic
\`\`\`

**Approach 2 — Push-based (watches)**:
\`\`\`
Service                Config Server (Consul/etcd)
  |                        |
  |-- WATCH /config ------>|  (long-lived connection)
  |                        |
  ...config changes...
  |                        |
  |<-- UPDATE: {cacheTTL:600}|  (pushed immediately)
  |                        |
  Service applies new cacheTTL = 600

Pros: Near-instant updates
Cons: Requires watch-capable config server, connection management
\`\`\`

**Approach 3 — Event-driven**:
\`\`\`
Admin changes config in UI
  |
  v
Config Server publishes event to Kafka/Redis:
  topic: config-changes
  { service: "order-svc", key: "cacheTTL", value: 600, timestamp: ... }
  |
  v
All order-svc instances consume event and apply change

Pros: Decoupled, reliable delivery, audit trail
Cons: More infrastructure
\`\`\`

**Spring Cloud Config refresh example**:
\`\`\`
# Application reads config on startup from Config Server
# To refresh at runtime:

POST /actuator/refresh
--> Spring re-reads config from server
--> @RefreshScope beans are recreated with new values
--> No restart needed

For all instances simultaneously:
  Spring Cloud Bus + RabbitMQ/Kafka
  POST /actuator/bus-refresh
  --> Broadcasts refresh to all instances
\`\`\`

**Safety mechanisms**:
\`\`\`
1. Validation before applying:
   - New value must pass schema validation
   - Canary: apply to 1 instance first, monitor for errors
   - Rollback: revert to previous value if metrics degrade

2. Config change audit log:
   | timestamp  | user     | key      | old   | new  | service    |
   |------------|----------|----------|-------|------|------------|
   | 2024-01-01 | alice    | cacheTTL | 300   | 600  | order-svc  |
   | 2024-01-01 | bob      | rateLimit| 1000  | 500  | api-gateway|

3. Gradual rollout:
   - Change applied to 1 pod, wait 5 minutes
   - If healthy, apply to 10%, then 50%, then 100%
   - Similar to canary deployment but for configuration
\`\`\``
      },
      {
        question: 'How do you manage feature flags effectively at scale?',
        answer: `**Feature flag lifecycle**:
\`\`\`
  1. CREATE: Developer creates flag (default: OFF)
  2. DEVELOP: Code behind flag, deploy to production (flag OFF)
  3. TEST: Enable for internal team (targeting: team members)
  4. CANARY: Enable for 1% of users, monitor metrics
  5. ROLLOUT: 10% -> 25% -> 50% -> 100%
  6. CLEANUP: Remove flag from code, delete flag definition

  Timeline: 1-4 weeks from create to cleanup
\`\`\`

**Flag types** (categorize for different management):
\`\`\`
  Release Flag:
    Purpose: Ship incomplete features safely
    Lifetime: Days to weeks (MUST clean up)
    Example: new-checkout-flow (ON/OFF)

  Experiment Flag:
    Purpose: A/B testing
    Lifetime: Weeks to months
    Example: pricing-page-variant (A/B/C with metrics)

  Ops Flag:
    Purpose: Operational control (kill switches)
    Lifetime: Permanent
    Example: circuit-breaker-manual-override

  Permission Flag:
    Purpose: Feature access control
    Lifetime: Permanent
    Example: premium-features-enabled (per subscription tier)
\`\`\`

**Targeting strategies**:
\`\`\`
Simple: ON/OFF globally
  { "new-feature": true }

Percentage rollout:
  { "new-feature": { percentage: 25 } }
  --> 25% of users see new feature (consistent: same user always in same bucket)

User targeting:
  { "new-feature": {
      rules: [
        { attribute: "email", endsWith: "@company.com", value: true },
        { attribute: "plan", equals: "enterprise", value: true },
        { default: false }
      ]
  }}

Segment targeting:
  { "new-feature": {
      segments: {
        "beta-users": true,
        "us-east-region": true,
        "everyone-else": false
      }
  }}
\`\`\`

**Technical debt management**:
\`\`\`
Problem: 500 flags accumulated over 2 years
  - 200 are always ON (released features, never cleaned up)
  - 50 are always OFF (abandoned experiments)
  - Code is riddled with if/else branches

Prevention:
  1. Flag ownership: Every flag has an owner and team
  2. Expiration date: Flag auto-alerts if not cleaned up by deadline
  3. Dashboard: Show stale flags (ON for > 30 days = cleanup candidate)
  4. CI check: Lint for flag references; warn if flag is expired
  5. Quarterly cleanup sprints: Dedicated time to remove stale flags

Metrics:
  flags_total: 300
  flags_stale: 45 (ON > 30 days, no changes)
  flags_expired: 12 (past deadline)
  flags_active_experiments: 8
\`\`\``
      },
      {
        question: 'How do you handle secrets management separately from configuration?',
        answer: `**Secrets are NOT configuration.** They require different handling:

\`\`\`
Configuration:                    Secrets:
- Cache TTL: 300                  - DB password: "s3cret!"
- Log level: "info"               - API key: "sk-abc..."
- Feature flag: true              - TLS certificate
- Max retries: 3                  - Encryption key

Configuration:                    Secrets:
- Can be in version control       - NEVER in version control
- Can be plain text               - Must be encrypted at rest
- Wide access                     - Least-privilege access
- Change is routine               - Change requires rotation plan
\`\`\`

**Secrets management tools**:

**HashiCorp Vault**:
\`\`\`
  Application          Vault Server
      |                    |
      |-- Authenticate --->|  (Kubernetes SA, AWS IAM, etc.)
      |<-- Token ----------|
      |                    |
      |-- GET /secret/db ->|  (with token)
      |<-- {password: ...} |  (decrypted, short TTL)
      |                    |
      |-- Lease expires    |
      |-- Re-authenticate ->|
      |<-- New password ---|  (automatic rotation)

Features:
  - Dynamic secrets (generate DB credentials on demand)
  - Automatic rotation
  - Audit log of every access
  - Encryption as a service
  - PKI certificate management
\`\`\`

**AWS Secrets Manager / Parameter Store**:
\`\`\`
  Application --> AWS SDK --> Secrets Manager
                              |
                              +-- Automatic rotation (Lambda)
                              +-- Encryption (KMS)
                              +-- IAM-based access control
                              +-- Cross-account sharing

  Pricing:
    Secrets Manager: $0.40/secret/month + $0.05/10K API calls
    Parameter Store: Free (standard), $0.05/10K for advanced
\`\`\`

**Kubernetes Secrets** (basic, not sufficient alone):
\`\`\`
  apiVersion: v1
  kind: Secret
  metadata:
    name: db-credentials
  data:
    password: base64("s3cret!")  # base64 is NOT encryption!

  Limitations:
  - base64 encoded, not encrypted (by default)
  - Stored in etcd (must enable etcd encryption)
  - No automatic rotation
  - No audit trail of access

  Enhancement: Use External Secrets Operator
    - Syncs secrets from Vault/AWS to Kubernetes Secrets
    - Automatic refresh on rotation
    - Single source of truth in Vault
\`\`\`

**Secret rotation strategy**:
\`\`\`
  1. Generate new secret (version N+1)
  2. Configure service to accept BOTH old (N) and new (N+1)
  3. Gradually roll out new secret to all instances
  4. Verify all instances using new secret
  5. Revoke old secret (version N)

  Timeline:
    Step 1-3: Automated (Vault/Secrets Manager)
    Step 4: Monitor for auth failures
    Step 5: Automated after validation period

  Frequency:
    Database passwords: Every 90 days
    API keys: Every 30 days
    TLS certificates: Before expiry (auto-renew with cert-manager)
    Encryption keys: Annually (with re-encryption)
\`\`\``
      },
    ],

    dataModel: {
      description: 'Configuration externalization architecture',
      schema: `Configuration Architecture:

  +------------------+     +------------------+
  | Config Server    |     | Secrets Manager  |
  | (Spring Cloud /  |     | (Vault / AWS SM) |
  | Consul KV)       |     |                  |
  +--------+---------+     +--------+---------+
           |                        |
     Config values            Secrets (encrypted)
           |                        |
  +--------+--------+--------+-----+
  |        |        |        |
  v        v        v        v
Svc A    Svc B    Svc C    Svc D

Configuration Hierarchy (priority order):
  1. Command-line arguments      (highest)
  2. Environment variables
  3. Config server values
  4. Application defaults        (lowest)

Feature Flag Platform:
  +-------------------+
  | Flag Service      |
  | (LaunchDarkly)    |
  +--------+----------+
           |
  Flag evaluations (real-time SDK)
           |
  +--------+--------+--------+
  |        |        |        |
  v        v        v        v
Web App  Mobile   API Svc  Worker

Config Categories:
  Infrastructure: DB URLs, ports, replicas
  Application:    Timeouts, batch sizes, cache TTL
  Feature flags:  New features, experiments, kill switches
  Secrets:        Passwords, API keys, certificates`
    },
  },
];
