// System design categories, category map, and core topics

export const systemDesignCategories = [
    { id: 'fundamentals', name: 'Core Fundamentals', icon: 'lightbulb', color: '#10b981' },
    { id: 'storage', name: 'Storage & Databases', icon: 'database', color: '#3b82f6' },
    { id: 'communication', name: 'Communication & APIs', icon: 'globe', color: '#8b5cf6' },
    { id: 'scalability', name: 'Scalability & Performance', icon: 'trendingUp', color: '#f59e0b' },
    { id: 'reliability', name: 'Reliability & Security', icon: 'shield', color: '#ef4444' },
  ];

export const systemDesignCategoryMap = {
    'fundamentals': 'fundamentals',
    'databases': 'storage',
    'caching': 'storage',
    'message-queues': 'communication',
    'api-design': 'communication',
    'load-balancing': 'scalability',
    'rate-limiting': 'scalability',
    'microservices': 'scalability',
    'security': 'reliability',
    'monitoring': 'reliability',
    'rest-vs-rpc': 'communication',
    'quorum': 'fundamentals',
    'leader-follower': 'reliability',
    'heartbeat-mechanism': 'reliability',
    'checksum': 'reliability',
    'strong-vs-eventual-consistency': 'fundamentals',
    'latency-vs-throughput': 'scalability',
    'acid-vs-base': 'storage',
    'distributed-messaging': 'communication',
    'synchronous-vs-asynchronous': 'communication',
    'distributed-file-systems': 'storage',
    'consistent-hashing': 'scalability',
    'bloom-filters': 'storage',
    'data-partitioning': 'storage',
    'database-indexes': 'storage',
    'proxies': 'communication',
    'dns-deep-dive': 'fundamentals',
    'cdn-deep-dive': 'scalability',
    'redundancy-replication': 'reliability',
    'network-essentials': 'communication',
    'long-polling-websockets-sse': 'communication',
    'cap-pacelc-deep-dive': 'fundamentals',
    'distributed-lock': 'reliability',
  };

  // System Design Topics
export const systemDesignTopics = [
    {
      id: 'fundamentals',
      title: 'Fundamentals',
      icon: 'lightbulb',
      color: '#10b981',
      questions: 12,
      description: 'Core concepts every system design interview requires.',
      concepts: ['Scalability', 'Latency vs Throughput', 'Availability vs Consistency', 'DNS', 'CDN', 'Load Balancing'],
      tips: [
        'Always clarify requirements first: functional and non-functional',
        'Back-of-envelope calculations show you understand scale',
        'Know the difference between vertical and horizontal scaling'
      ],

      introduction: `System design fundamentals are the building blocks every engineer must master. These concepts appear in every interview and form the vocabulary for discussing large-scale systems.

Understanding scalability, reliability, and performance trade-offs allows you to reason about complex systems. These fundamentals are not just theory—they're used daily at companies like Google, Netflix, and Amazon to serve billions of users.`,

      functionalRequirements: [
        'Handle increasing user load without degradation',
        'Respond to requests within acceptable latency',
        'Remain available even when components fail',
        'Store and retrieve data reliably',
        'Support geographic distribution of users',
        'Enable system evolution without major rewrites'
      ],

      nonFunctionalRequirements: [
        'Scalability: 10x growth without architecture change',
        'Availability: 99.9% to 99.999% uptime (3 nines to 5 nines)',
        'Latency: p50 < 100ms, p99 < 500ms',
        'Throughput: Thousands to millions of requests/second',
        'Durability: Zero data loss for critical data',
        'Cost efficiency: Linear or sub-linear cost scaling'
      ],

      dataModel: {
        description: 'Key metrics and calculations for system design',
        schema: `Availability Calculations:
  99% = 87.6 hours downtime/year
  99.9% = 8.76 hours downtime/year
  99.99% = 52.6 minutes downtime/year
  99.999% = 5.26 minutes downtime/year

Storage Estimates:
  1 KB = 1,000 bytes
  1 MB = 1,000 KB = 10^6 bytes
  1 GB = 1,000 MB = 10^9 bytes
  1 TB = 1,000 GB = 10^12 bytes
  1 PB = 1,000 TB = 10^15 bytes

Traffic Estimates:
  1 million users × 10 requests/day = 10M requests/day
  10M / 86400 seconds = ~116 requests/second
  Peak = 2-5x average = 230-580 RPS`
      },

      apiDesign: {
        description: 'Common patterns in API design',
        endpoints: [
          { method: 'GET', path: '/api/resource/:id', params: '-', response: 'Single resource' },
          { method: 'GET', path: '/api/resources', params: 'limit, offset, filters', response: 'Paginated list' },
          { method: 'POST', path: '/api/resources', params: 'resource data', response: '201 Created' },
          { method: 'PUT', path: '/api/resource/:id', params: 'full resource', response: 'Updated resource' },
          { method: 'DELETE', path: '/api/resource/:id', params: '-', response: '204 No Content' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is the difference between vertical and horizontal scaling?',
          answer: `**Vertical Scaling (Scale Up)**:
- Add more CPU, RAM, storage to existing machine
- Simpler: no code changes needed
- Limited: single machine has hardware limits
- Single point of failure

**Horizontal Scaling (Scale Out)**:
- Add more machines to the pool
- More complex: requires distributed design
- Unlimited: can keep adding servers
- Better fault tolerance

**When to use each**:
- Start vertical (simpler) until you hit limits
- Scale horizontally when: need fault tolerance, single machine can't handle load, or need geographic distribution
- Most production systems combine both`
        },
        {
          question: 'Explain the CAP theorem and its implications',
          answer: `**CAP Theorem**: A distributed system can provide at most 2 of 3 guarantees:

**Consistency**: Every read receives the most recent write
**Availability**: Every request receives a response
**Partition tolerance**: System operates despite network failures

**Reality**: Network partitions WILL happen, so you must choose:
- **CP systems** (Consistency + Partition): Refuse requests during partition
  - Examples: HBase, MongoDB, Redis Cluster
  - Use when: Financial transactions, inventory counts

- **AP systems** (Availability + Partition): Serve requests but may return stale data
  - Examples: Cassandra, DynamoDB, CouchDB
  - Use when: Social feeds, caching, analytics

**PACELC Extension**: In absence of partition (E), choose Latency vs Consistency`
        },
        {
          question: 'How do you estimate scale for a system?',
          answer: `**Back-of-Envelope Calculation Framework**:

1. **Users**: Start with DAU (Daily Active Users)
   - Twitter: 300M DAU
   - Medium app: 1M DAU

2. **Requests**: Actions per user per day
   - Read-heavy: 10-100 reads per user
   - Write-heavy: 1-10 writes per user
   - Total: DAU × actions/day ÷ 86,400 = RPS

3. **Storage**: Data per action × actions × retention
   - Tweet: ~300 bytes × 500M tweets/day × 5 years
   - Images: ~200KB average × uploads/day

4. **Bandwidth**: Data transferred per request
   - API response: 1-10 KB average
   - Images/video: 100KB-10MB per asset

**Example - URL Shortener**:
- 100M new URLs/month = ~40 URLs/second
- 100:1 read:write ratio = 4000 reads/second
- 100 bytes/URL × 100M × 12 months × 5 years = 600GB`
        },
        {
          question: 'What is latency vs throughput?',
          answer: `**Latency**: Time to complete one request (milliseconds)
- Network: 0.5ms local, 150ms cross-continent
- SSD read: 0.1ms
- HDD seek: 10ms
- RAM access: 0.0001ms (100 nanoseconds)

**Throughput**: Requests completed per unit time (RPS)
- Single server: 1,000-10,000 RPS
- With caching: 100,000+ RPS
- Distributed: millions of RPS

**Trade-offs**:
- Batching: ↑ throughput, ↑ latency
- Caching: ↓ latency, ↑ complexity
- Parallel processing: ↑ throughput, same latency

**Little's Law**: L = λW
- L = items in system
- λ = arrival rate (throughput)
- W = time in system (latency)`
        }
      ],

      basicImplementation: {
        title: 'Single Server Architecture',
        description: 'Starting point for small applications. A single server hosts both the web server and database, suitable for low-traffic applications with ~1,000 concurrent users and 100-1,000 RPS.',
        svgTemplate: 'singleServer',
        problems: [
          'Single point of failure - any failure takes down entire system',
          'Limited scalability - constrained by single machine',
          'No redundancy - data loss risk',
          'Maintenance requires downtime'
        ]
      },

      advancedImplementation: {
        title: 'Distributed Architecture',
        description: 'CDN for static assets → Load Balancer distributes traffic → Multiple stateless App Servers → Redis Cache + Primary-Replica Database setup.',
        svgTemplate: 'loadBalancer',
        keyPoints: [
          'Stateless app servers enable horizontal scaling',
          'CDN offloads static content and reduces latency',
          'Caching reduces database load by 80-90%',
          'Database replication provides read scaling and failover',
          'Load balancer eliminates single point of failure'
        ]
      },

      discussionPoints: [
        {
          topic: 'Scalability Patterns',
          points: [
            'Stateless services: Enable horizontal scaling',
            'Database sharding: Distribute data across machines',
            'Caching layers: Reduce database load',
            'Async processing: Handle spikes with queues',
            'Microservices: Scale components independently'
          ]
        },
        {
          topic: 'Reliability Patterns',
          points: [
            'Redundancy: No single point of failure',
            'Replication: Multiple copies of data',
            'Failover: Automatic switching to backup',
            'Circuit breaker: Prevent cascade failures',
            'Graceful degradation: Partial functionality when failing'
          ]
        },
        {
          topic: 'Common Mistakes in Interviews',
          points: [
            'Jumping to solutions without clarifying requirements',
            'Not doing back-of-envelope calculations',
            'Over-engineering for scale you don\'t need',
            'Ignoring trade-offs in design decisions',
            'Not discussing failure scenarios'
          ]
        }
      ],

      // ── Visual Enhancements ──────────────────────────────────────

      // Static architecture/concept diagrams (pre-generated, stored in public/diagrams/)
      staticDiagrams: [
        {
          id: 'cap-theorem',
          title: 'CAP Theorem',
          description: 'Choose two of three: Consistency, Availability, Partition Tolerance',
          src: '/diagrams/fundamentals/cap-theorem.svg',
          type: 'architecture'
        },
        {
          id: 'scaling-types',
          title: 'Vertical vs Horizontal Scaling',
          description: 'Two fundamental approaches to handling increased load',
          src: '/diagrams/fundamentals/scaling-comparison.svg',
          type: 'architecture'
        },
        {
          id: 'distributed-architecture',
          title: 'Distributed System Architecture',
          description: 'CDN → Load Balancer → App Servers → Cache → Database cluster',
          src: '/diagrams/fundamentals/distributed-architecture.svg',
          type: 'architecture'
        },
        {
          id: 'eraser-distributed',
          title: 'Cloud Architecture (Eraser)',
          description: 'Full distributed system with CDN, load balancer, cache, DB replicas, and message queue',
          src: '/diagrams/fundamentals/eraser-distributed-architecture.png',
          type: 'cloud-architecture'
        }
      ],

      // Side-by-side comparison cards
      comparisonTables: [
        {
          id: 'vertical-vs-horizontal',
          title: 'Vertical vs Horizontal Scaling',
          left: {
            title: 'Vertical Scaling (Scale Up)',
            icon: 'arrowUp',
            color: '#3b82f6',
            items: [
              { label: 'Approach', value: 'Add more CPU/RAM/Storage to one machine' },
              { label: 'Complexity', value: 'Low — no code changes needed' },
              { label: 'Limit', value: 'Hardware ceiling (single machine)' },
              { label: 'Fault Tolerance', value: 'Single point of failure' },
              { label: 'Cost', value: 'Expensive at high end' },
              { label: 'Best For', value: 'Starting out, simple apps, databases' }
            ]
          },
          right: {
            title: 'Horizontal Scaling (Scale Out)',
            icon: 'arrowRight',
            color: '#10b981',
            items: [
              { label: 'Approach', value: 'Add more machines to the pool' },
              { label: 'Complexity', value: 'High — requires distributed design' },
              { label: 'Limit', value: 'Virtually unlimited' },
              { label: 'Fault Tolerance', value: 'Built-in redundancy' },
              { label: 'Cost', value: 'Cost-effective at scale' },
              { label: 'Best For', value: 'High traffic, fault tolerance, geo-distribution' }
            ]
          }
        },
        {
          id: 'cp-vs-ap',
          title: 'CP vs AP Systems (CAP Theorem)',
          left: {
            title: 'CP — Consistency + Partition',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Behavior', value: 'Refuses requests during partition' },
              { label: 'Guarantee', value: 'Every read gets latest write' },
              { label: 'Trade-off', value: 'May be unavailable during failures' },
              { label: 'Examples', value: 'HBase, MongoDB, Redis Cluster' },
              { label: 'Use When', value: 'Financial transactions, inventory' },
              { label: 'Downside', value: 'Latency spikes, reduced availability' }
            ]
          },
          right: {
            title: 'AP — Availability + Partition',
            icon: 'globe',
            color: '#10b981',
            items: [
              { label: 'Behavior', value: 'Always responds, may serve stale data' },
              { label: 'Guarantee', value: 'Every request gets a response' },
              { label: 'Trade-off', value: 'May return outdated information' },
              { label: 'Examples', value: 'Cassandra, DynamoDB, CouchDB' },
              { label: 'Use When', value: 'Social feeds, caching, analytics' },
              { label: 'Downside', value: 'Eventual consistency, conflict resolution' }
            ]
          }
        }
      ],

      // Quick-reference cheat sheet cards
      visualCards: [
        {
          id: 'latency-numbers',
          title: 'Latency Numbers Every Programmer Should Know',
          color: '#8b5cf6',
          icon: 'clock',
          items: [
            { label: 'L1 cache reference', value: '0.5 ns', bar: 1 },
            { label: 'Branch mispredict', value: '5 ns', bar: 2 },
            { label: 'L2 cache reference', value: '7 ns', bar: 2 },
            { label: 'Mutex lock/unlock', value: '25 ns', bar: 3 },
            { label: 'Main memory reference', value: '100 ns', bar: 5 },
            { label: 'Compress 1KB (Snappy)', value: '3,000 ns (3 μs)', bar: 15 },
            { label: 'Send 1KB over 1 Gbps', value: '10,000 ns (10 μs)', bar: 20 },
            { label: 'Read 4KB from SSD', value: '150,000 ns (150 μs)', bar: 35 },
            { label: 'Read 1MB from memory', value: '250,000 ns (250 μs)', bar: 40 },
            { label: 'Round trip in datacenter', value: '500,000 ns (0.5 ms)', bar: 50 },
            { label: 'Read 1MB from SSD', value: '1,000,000 ns (1 ms)', bar: 60 },
            { label: 'HDD seek', value: '10,000,000 ns (10 ms)', bar: 75 },
            { label: 'Read 1MB from HDD', value: '20,000,000 ns (20 ms)', bar: 80 },
            { label: 'Send packet CA→NL→CA', value: '150,000,000 ns (150 ms)', bar: 100 }
          ]
        },
        {
          id: 'availability-numbers',
          title: 'Availability Cheat Sheet',
          color: '#10b981',
          icon: 'shield',
          items: [
            { label: '99% (two 9s)', value: '3.65 days/year', bar: 10 },
            { label: '99.9% (three 9s)', value: '8.76 hours/year', bar: 30 },
            { label: '99.99% (four 9s)', value: '52.6 min/year', bar: 55 },
            { label: '99.999% (five 9s)', value: '5.26 min/year', bar: 80 },
            { label: '99.9999% (six 9s)', value: '31.5 sec/year', bar: 95 }
          ]
        },
        {
          id: 'storage-numbers',
          title: 'Storage & Traffic Quick Reference',
          color: '#f59e0b',
          icon: 'database',
          items: [
            { label: 'Char / small int', value: '1-4 bytes', bar: 2 },
            { label: 'Tweet / short text', value: '~300 bytes', bar: 5 },
            { label: 'Typical JSON API response', value: '1-10 KB', bar: 10 },
            { label: 'Average web image', value: '200 KB', bar: 25 },
            { label: '1 min compressed audio', value: '1 MB', bar: 35 },
            { label: 'HD photo', value: '5 MB', bar: 45 },
            { label: '1 min SD video', value: '25 MB', bar: 60 },
            { label: '1 min HD video', value: '150 MB', bar: 80 },
            { label: '1 hour 4K video', value: '20 GB', bar: 100 }
          ]
        }
      ],

      // Workflow / process flowcharts (pre-generated SVGs)
      flowcharts: [
        {
          id: 'estimation-process',
          title: 'Back-of-Envelope Estimation Process',
          description: 'Step-by-step framework for estimating system scale in interviews',
          src: '/diagrams/fundamentals/estimation-flowchart.svg',
          steps: [
            { step: 1, label: 'Clarify Requirements', detail: 'Functional + Non-functional' },
            { step: 2, label: 'Estimate DAU', detail: 'Daily Active Users' },
            { step: 3, label: 'Calculate QPS', detail: 'DAU × actions ÷ 86,400' },
            { step: 4, label: 'Peak QPS', detail: '2-5× average QPS' },
            { step: 5, label: 'Estimate Storage', detail: 'Data/action × actions × retention' },
            { step: 6, label: 'Estimate Bandwidth', detail: 'QPS × response size' }
          ]
        },
        {
          id: 'interview-framework',
          title: 'System Design Interview Framework',
          description: 'The proven 6-step approach used at FAANG interviews',
          src: '/diagrams/fundamentals/interview-framework.svg',
          steps: [
            { step: 1, label: 'Requirements', detail: 'Clarify scope, users, constraints (5 min)' },
            { step: 2, label: 'Estimation', detail: 'Back-of-envelope: QPS, storage, bandwidth (5 min)' },
            { step: 3, label: 'High-Level Design', detail: 'Draw boxes: client, API, services, DB (10 min)' },
            { step: 4, label: 'Deep Dive', detail: 'Detail 2-3 critical components (15 min)' },
            { step: 5, label: 'Trade-offs', detail: 'Discuss alternatives and justify choices (5 min)' },
            { step: 6, label: 'Wrap Up', detail: 'Bottlenecks, monitoring, future scaling (5 min)' }
          ]
        }
      ],

      // Bar/pie chart data for visual understanding
      charts: [
        {
          id: 'latency-comparison',
          title: 'Latency Scale: From Nanoseconds to Milliseconds',
          src: '/diagrams/fundamentals/latency-chart.svg',
          type: 'bar',
          data: [
            { label: 'L1 Cache', value: 0.5, unit: 'ns', color: '#10b981' },
            { label: 'RAM', value: 100, unit: 'ns', color: '#3b82f6' },
            { label: 'SSD Read', value: 150000, unit: 'ns', color: '#f59e0b' },
            { label: 'Network (DC)', value: 500000, unit: 'ns', color: '#8b5cf6' },
            { label: 'HDD Seek', value: 10000000, unit: 'ns', color: '#ef4444' },
            { label: 'Internet RTT', value: 150000000, unit: 'ns', color: '#dc2626' }
          ]
        },
        {
          id: 'read-write-ratios',
          title: 'Typical Read:Write Ratios by Application Type',
          src: '/diagrams/fundamentals/read-write-ratios.svg',
          type: 'bar',
          data: [
            { label: 'Social Feed', read: 100, write: 1, color: '#3b82f6' },
            { label: 'E-Commerce', read: 50, write: 1, color: '#10b981' },
            { label: 'URL Shortener', read: 100, write: 1, color: '#8b5cf6' },
            { label: 'Chat App', read: 5, write: 1, color: '#f59e0b' },
            { label: 'Analytics', read: 10, write: 10, color: '#ef4444' }
          ]
        }
      ],

      // Architecture evolution timeline
      evolutionSteps: [
        {
          step: 1,
          title: 'Single Server',
          description: 'Web server + DB on one machine. Simple but fragile.',
          icon: 'server',
          color: '#ef4444',
          capacity: '~1K users',
          rps: '100-1K',
          pros: ['Simple setup', 'Low cost', 'Easy debugging'],
          cons: ['Single point of failure', 'No scalability', 'Downtime for maintenance'],
          diagram: '/diagrams/fundamentals/evolution-1-single.svg'
        },
        {
          step: 2,
          title: 'Separate Database',
          description: 'Dedicated DB server. Web and data can scale independently.',
          icon: 'database',
          color: '#f59e0b',
          capacity: '~10K users',
          rps: '1K-5K',
          pros: ['Independent scaling', 'Better resource allocation', 'DB can be optimized separately'],
          cons: ['Network latency to DB', 'Still limited horizontally', 'More operational overhead'],
          diagram: '/diagrams/fundamentals/evolution-2-separate-db.svg'
        },
        {
          step: 3,
          title: 'Load Balanced',
          description: 'Multiple web servers behind a load balancer. Add cache layer.',
          icon: 'layers',
          color: '#3b82f6',
          capacity: '~100K users',
          rps: '5K-50K',
          pros: ['Horizontal scaling', 'No single point of failure', 'Rolling deployments'],
          cons: ['Session management complexity', 'Cache invalidation', 'More infrastructure'],
          diagram: '/diagrams/fundamentals/evolution-3-load-balanced.svg'
        },
        {
          step: 4,
          title: 'Cached + Replicated',
          description: 'Redis/Memcached cache + Primary-Replica DB + Message queues.',
          icon: 'zap',
          color: '#8b5cf6',
          capacity: '~1M users',
          rps: '50K-500K',
          pros: ['90% cache hit rate', 'Read replicas scale reads', 'Async processing via queues'],
          cons: ['Cache invalidation complexity', 'Replication lag', 'Operational complexity'],
          diagram: '/diagrams/fundamentals/evolution-4-cached.svg'
        },
        {
          step: 5,
          title: 'Globally Distributed',
          description: 'CDN + Multi-region + DB sharding + Microservices + Monitoring.',
          icon: 'globe',
          color: '#10b981',
          capacity: '100M+ users',
          rps: '500K-Millions',
          pros: ['Low latency worldwide', 'Extreme fault tolerance', 'Independent team scaling'],
          cons: ['Distributed systems complexity', 'Data consistency challenges', 'High operational cost'],
          diagram: '/diagrams/fundamentals/evolution-5-global.svg'
        }
      ],

      // Design pattern cards (for the discussion points section)
      patternCards: [
        {
          id: 'stateless',
          name: 'Stateless Services',
          icon: 'layers',
          color: '#10b981',
          description: 'No server-side session state. Any server can handle any request.',
          useWhen: 'Horizontal scaling, load balancing, rolling deployments',
          example: 'JWT tokens, externalized session in Redis'
        },
        {
          id: 'sharding',
          name: 'Database Sharding',
          icon: 'database',
          color: '#3b82f6',
          description: 'Split data across multiple DB instances by a shard key.',
          useWhen: 'Single DB can\'t handle write volume or data size',
          example: 'Shard by user_id, geographic region, or tenant'
        },
        {
          id: 'caching',
          name: 'Caching Layers',
          icon: 'zap',
          color: '#f59e0b',
          description: 'Store frequently accessed data in fast storage (RAM).',
          useWhen: 'Read-heavy workloads, expensive computations, hot data',
          example: 'Redis/Memcached, CDN, browser cache, application cache'
        },
        {
          id: 'async',
          name: 'Async Processing',
          icon: 'clock',
          color: '#8b5cf6',
          description: 'Decouple work from request path using message queues.',
          useWhen: 'Spiky traffic, long-running tasks, decoupled services',
          example: 'Kafka, RabbitMQ, SQS for email, image processing'
        },
        {
          id: 'circuit-breaker',
          name: 'Circuit Breaker',
          icon: 'shield',
          color: '#ef4444',
          description: 'Stop calling a failing service to prevent cascade failures.',
          useWhen: 'Microservices, external API dependencies',
          example: 'Hystrix, Resilience4j — open/half-open/closed states'
        },
        {
          id: 'graceful-degradation',
          name: 'Graceful Degradation',
          icon: 'alertTriangle',
          color: '#f97316',
          description: 'Provide partial functionality when components fail.',
          useWhen: 'Non-critical features, third-party dependencies',
          example: 'Show cached data, disable recommendations, static fallback'
        }
      ],
      comparisonCards: [
        {
          title: '15 System Design Core Concepts',
          items: [
            { name: 'Requirement Gathering', description: 'Functional vs Non-Functional requirements. Define user stories and set priority.' },
            { name: 'System Architecture', description: 'Define system components, choose architectural styles (monolith, microservices, event-driven). Consider scalability and maintainability.' },
            { name: 'Data Design', description: 'Define data models and schemas. Choose proper database (SQL vs NoSQL). Define retention targets.' },
            { name: 'Domain Design', description: 'Break system into business domains. Encapsulate functionality within modules. Minimize dependencies among domains.' },
            { name: 'Scalability', description: 'Horizontal & vertical scaling. Load balancing strategies. Handle cold start problems.' },
            { name: 'Reliability', description: 'Fault tolerance mechanisms. Monitoring and alerting. Recovery plans for failures.' },
            { name: 'Availability', description: 'Data replication across zones/regions. Minimize system downtime. Disaster recovery planning.' },
            { name: 'Performance', description: 'Define latency and throughput targets. Optimize data structures and encoding. Implement caching strategies.' },
            { name: 'Security', description: 'Authentication & Authorization. Data encryption at rest and in transit. Sensitive data storage policies.' },
            { name: 'Cost Estimation', description: 'Evaluate hardware TCO. Consider licensing and subscription fees. Plan for future scalability costs.' },
            { name: 'Testing', description: 'Unit, integration, and system tests. Acceptance tests with users. Performance and security testing.' },
            { name: 'Maintainability', description: 'Clear code structure and documentation. SDLC management. Evolvable architecture design.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Split-brain during network partition', impact: 'Two nodes both believe they are the leader, accepting conflicting writes that corrupt data', mitigation: 'Use fencing tokens, quorum-based leader election, and STONITH (Shoot The Other Node In The Head) mechanisms' },
        { scenario: 'Cascading failure from a single component', impact: 'One slow service causes thread pool exhaustion in callers, propagating failure across the entire system', mitigation: 'Implement circuit breakers, bulkheads to isolate failures, and set aggressive timeouts on all network calls' },
        { scenario: 'Back-of-envelope estimates wildly off', impact: 'Under-provisioning leads to outages at launch; over-provisioning wastes budget', mitigation: 'Validate estimates with real benchmarks, use auto-scaling from day one, and load test before launch' },
        { scenario: 'Clock skew across distributed nodes', impact: 'Timestamps become unreliable for ordering events, causing stale reads or lost updates', mitigation: 'Use logical clocks (Lamport, vector clocks) or hybrid logical clocks instead of wall-clock time for ordering' },
        { scenario: 'Hot partition in a distributed system', impact: 'One node receives disproportionate traffic, creating a bottleneck that limits overall throughput', mitigation: 'Add jitter to partition keys, use consistent hashing with virtual nodes, and implement request shedding' },
      ],
      tradeoffs: [
        { decision: 'Vertical vs Horizontal Scaling', pros: 'Vertical is simpler with no distributed complexity; horizontal provides near-unlimited scale and fault isolation', cons: 'Vertical has hardware ceiling and single point of failure; horizontal adds distributed systems complexity', recommendation: 'Start vertical for simplicity, plan horizontal scaling boundaries from the design phase' },
        { decision: 'Consistency vs Availability (CAP)', pros: 'Strong consistency simplifies application logic; high availability ensures the system never refuses requests', cons: 'Strong consistency increases latency and reduces availability during partitions; eventual consistency requires conflict resolution', recommendation: 'Choose based on domain: financial systems need consistency, social feeds can tolerate eventual consistency' },
        { decision: 'Monolith vs Distributed Architecture', pros: 'Monolith is simpler to develop, test, and deploy; distributed provides independent scaling and team autonomy', cons: 'Monolith becomes unwieldy at scale; distributed adds networking, observability, and coordination overhead', recommendation: 'Start monolith, extract services when team size or scale demands it (modular monolith as intermediate step)' },
        { decision: 'Synchronous vs Asynchronous Communication', pros: 'Synchronous is simpler to reason about and debug; asynchronous decouples services and handles traffic spikes', cons: 'Synchronous creates tight coupling and cascade failure risk; asynchronous adds complexity with eventual consistency', recommendation: 'Use synchronous for real-time user-facing requests, asynchronous for background processing and inter-service events' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Handle user interaction, render UI, and manage client-side state', components: ['Web/Mobile Client', 'CDN for Static Assets', 'Client-side Cache', 'DNS Resolution'] },
        { name: 'API Gateway / Load Balancer Layer', purpose: 'Route requests, terminate SSL, enforce rate limits, and distribute traffic', components: ['Load Balancer (L4/L7)', 'API Gateway', 'SSL Termination', 'Rate Limiter'] },
        { name: 'Application Service Layer', purpose: 'Execute business logic, orchestrate workflows, and process requests', components: ['Application Servers', 'Service Discovery', 'Circuit Breakers', 'Message Queues'] },
        { name: 'Data Layer', purpose: 'Persist, cache, and index data for reliable storage and fast retrieval', components: ['Primary Database (SQL/NoSQL)', 'Cache (Redis/Memcached)', 'Search Index (Elasticsearch)', 'Object Storage (S3)'] },
        { name: 'Infrastructure / Observability Layer', purpose: 'Monitor system health, collect metrics, and enable debugging across all layers', components: ['Logging (ELK)', 'Metrics (Prometheus/Grafana)', 'Tracing (Jaeger)', 'Alerting (PagerDuty)'] },
      ]
    },
    {
      id: 'databases',
      title: 'Databases',
      icon: 'database',
      color: '#ef4444',
      questions: 15,
      description: 'SQL vs NoSQL, sharding, replication, and indexing strategies.',
      concepts: ['SQL vs NoSQL tradeoffs', 'ACID properties', 'Sharding strategies', 'Replication', 'Indexes', 'CAP theorem'],
      tips: [
        'SQL for complex queries and transactions',
        'NoSQL for flexible schema and horizontal scaling',
        'Shard by user_id for user-centric applications',
        'PostgreSQL is eating the database world — consider it as default for new projects unless you have specific NoSQL needs',
        'Use Star Schema for analytics/OLAP workloads, normalized schemas for OLTP'
      ],

      introduction: `Database design is the foundation of every system. The choice between SQL and NoSQL, the sharding strategy, and indexing decisions fundamentally shape system capabilities and constraints.

At scale, database choices become critical. Instagram stores 2+ billion photos, Uber processes millions of rides daily, and Facebook handles 4+ petabytes of data per day. Understanding when to use which database and how to scale them is essential for system design interviews.`,

      functionalRequirements: [
        'Store and retrieve data reliably',
        'Support complex queries when needed',
        'Handle concurrent read/write operations',
        'Maintain data consistency',
        'Support transactions for critical operations',
        'Enable efficient data access patterns'
      ],

      nonFunctionalRequirements: [
        'Read latency: < 10ms for cached, < 100ms for disk',
        'Write throughput: 10K-100K writes/second',
        'Availability: 99.99% uptime',
        'Durability: Zero data loss',
        'Scalability: Handle 10x data growth',
        'Recovery: RPO < 1 minute, RTO < 5 minutes'
      ],

      dataModel: {
        description: 'Comparison of database types',
        schema: `SQL (Relational):
  users (id, name, email, created_at)
  orders (id, user_id FK, total, status)
  - Strict schema, ACID transactions
  - JOIN operations, complex queries
  - Examples: PostgreSQL, MySQL, Oracle

NoSQL Document:
  { _id, name, email, orders: [...] }
  - Flexible schema, denormalized
  - No JOINs, embedded documents
  - Examples: MongoDB, CouchDB

NoSQL Key-Value:
  key → value (binary blob)
  - Simplest model, fastest access
  - No queries beyond key lookup
  - Examples: Redis, DynamoDB, Riak

NoSQL Wide-Column:
  row_key → { cf:col → value, ... }
  - Column families, sparse data
  - High write throughput
  - Examples: Cassandra, HBase, BigTable

NoSQL Graph:
  (node)-[relationship]->(node)
  - Optimized for relationships
  - Traversal queries
  - Examples: Neo4j, Amazon Neptune`
      },

      apiDesign: {
        description: 'Common database access patterns',
        endpoints: [
          { method: 'SELECT', path: 'users WHERE id = ?', params: 'id', response: 'Single row (indexed: O(log n))' },
          { method: 'SELECT', path: 'users WHERE email = ?', params: 'email', response: 'Single row (needs index!)' },
          { method: 'SELECT', path: 'orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', params: 'user_id', response: 'Recent orders (composite index)' },
          { method: 'INSERT', path: 'users VALUES (...)', params: 'user data', response: 'New row with id' },
          { method: 'UPDATE', path: 'users SET status = ? WHERE id = ?', params: 'status, id', response: 'Updated row count' }
        ]
      },

      keyQuestions: [
        {
          question: 'When should I use SQL vs NoSQL?',
          answer: `**Use SQL (Relational) when**:
- Need ACID transactions (banking, e-commerce orders)
- Complex queries with JOINs
- Data has clear relationships
- Need strong consistency
- Schema is well-defined

**Use NoSQL when**:
- Need horizontal scaling
- Flexible/evolving schema
- High write throughput
- Simple access patterns (key lookup)
- Geographic distribution

**Common Patterns**:
- User data: SQL (transactions, relationships)
- Session storage: Redis (fast, ephemeral)
- Analytics/logs: Cassandra (high write throughput)
- Product catalog: MongoDB (flexible schema)
- Social graph: Neo4j (relationship queries)

**Polyglot persistence**: Use multiple databases for different needs`
        },
        {
          question: 'How does database sharding work?',
          answer: `**Sharding**: Horizontal partitioning of data across multiple databases

**Sharding Strategies**:

1. **Hash-based sharding**:
   \`shard = hash(user_id) % num_shards\`
   - Even distribution
   - Hard to add/remove shards
   - Use consistent hashing to minimize reshuffling

2. **Range-based sharding**:
   \`shard = user_id / shard_size\`
   - Supports range queries
   - Can have hot spots (new users on one shard)

3. **Directory-based sharding**:
   \`lookup_service.get_shard(user_id)\`
   - Most flexible
   - Lookup adds latency

**Challenges**:
- Cross-shard queries are expensive
- Transactions across shards are complex
- Rebalancing data is difficult
- JOINs don't work across shards

**Best practice**: Shard by the entity you query most (usually user_id)`
        },
        {
          question: 'What is database replication?',
          answer: `**Replication**: Keeping copies of data on multiple machines

**Primary-Replica (Master-Slave)**:
\`\`\`
        Writes
          │
    ┌─────▼─────┐
    │  Primary  │
    └─────┬─────┘
          │ Replication
    ┌─────┴─────┐
    ▼           ▼
┌───────┐  ┌───────┐
│Replica│  │Replica│
└───────┘  └───────┘
   Reads     Reads
\`\`\`

**Sync vs Async replication**:
- Synchronous: Wait for replica ACK (strong consistency, higher latency)
- Asynchronous: Don't wait (eventual consistency, lower latency)

**Multi-Primary (Master-Master)**:
- Write to any node
- Conflict resolution needed
- Used for geographic distribution

**Replication Lag**: Delay between primary write and replica update
- Can cause stale reads
- Solutions: Read-your-writes consistency, causal consistency`
        },
        {
          question: 'How do database indexes work?',
          answer: `**Index**: Data structure for fast lookups (like a book index)

**B-Tree Index** (most common):
- Balanced tree structure
- O(log n) lookups, inserts, deletes
- Good for range queries
- Used by: PostgreSQL, MySQL, most SQL databases

**Hash Index**:
- O(1) exact match lookups
- No range queries
- Used for equality comparisons

**Composite Index**:
\`CREATE INDEX idx ON orders(user_id, created_at)\`
- Leftmost prefix rule: Can use for (user_id) or (user_id, created_at)
- Order matters!

**Trade-offs**:
- Indexes speed up reads
- Indexes slow down writes (must update index)
- Indexes use storage space
- Too many indexes hurt write performance

**Best practices**:
- Index columns in WHERE clauses
- Index foreign keys
- Analyze query patterns before adding indexes
- Use EXPLAIN to verify index usage`
        },
        {
          question: 'Explain ACID properties',
          answer: `**ACID**: Properties that guarantee database transaction reliability

**Atomicity**: All or nothing
- Transaction either fully completes or fully rolls back
- No partial updates

**Consistency**: Valid state to valid state
- Database constraints are maintained
- Foreign keys, unique constraints respected

**Isolation**: Concurrent transactions don't interfere
- Isolation levels (from weakest to strongest):
  - Read Uncommitted: See uncommitted changes
  - Read Committed: Only see committed changes
  - Repeatable Read: Same query returns same results
  - Serializable: Full isolation (slowest)

**Durability**: Committed data survives crashes
- Write-ahead logging (WAL)
- Data written to disk before commit returns

**BASE** (NoSQL alternative):
- Basically Available
- Soft state
- Eventual consistency`
        }
      ],

      basicImplementation: {
        title: 'Single Database Architecture',
        description: 'Traditional setup with one database server',
        svgTemplate: 'singleDatabase',
        problems: [
          'No failover capability',
          'Read contention at scale',
          'Limited storage capacity',
          'Backup impacts performance'
        ]
      },

      advancedImplementation: {
        title: 'Sharded Database Architecture',
        description: 'Distributed database with data partitioned across multiple shards, each with its own replicas for high availability.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Consistent hashing minimizes data movement when adding shards',
          'Each shard has its own replicas for read scaling',
          'Shard key choice is critical - usually user_id',
          'Avoid cross-shard transactions when possible',
          'Monitor shard sizes and rebalance proactively'
        ]
      },

      discussionPoints: [
        {
          topic: 'SQL vs NoSQL Trade-offs',
          points: [
            'SQL: Strong consistency, complex queries, harder to scale',
            'NoSQL: Horizontal scaling, flexible schema, eventual consistency',
            'Most systems use both (polyglot persistence)',
            'Start with SQL unless you have specific NoSQL requirements'
          ]
        },
        {
          topic: 'Scaling Strategies',
          points: [
            'Read replicas: Scale reads without sharding',
            'Connection pooling: Reduce connection overhead',
            'Query optimization: Fix slow queries before scaling',
            'Caching: Reduce database load by 80-90%',
            'Sharding: Last resort for write scaling'
          ]
        },
        {
          topic: 'Common Database Choices',
          points: [
            'PostgreSQL: Default choice for most applications',
            'MySQL: High read throughput, good replication',
            'MongoDB: Flexible schema, horizontal scaling',
            'Redis: Caching, session storage, rate limiting',
            'Cassandra: High write throughput, time-series data',
            'DynamoDB: Managed NoSQL, serverless friendly'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-db-arch', title: 'Database Architecture (Eraser)', description: 'Connection pool, primary/replica PostgreSQL, Redis cache, MongoDB, Elasticsearch, and sharding', src: '/diagrams/databases/eraser-database-architecture.png', type: 'cloud-architecture' }
      ],
      comparisonTables: [
        {
          id: 'sql-vs-nosql',
          title: 'SQL vs NoSQL',
          left: {
            title: 'SQL (Relational)',
            icon: 'database',
            color: '#3b82f6',
            items: [
              { label: 'Schema', value: 'Fixed schema, tables with rows/columns' },
              { label: 'Scaling', value: 'Primarily vertical scaling' },
              { label: 'Queries', value: 'Complex JOINs, aggregations' },
              { label: 'ACID', value: 'Full ACID compliance' },
              { label: 'Examples', value: 'PostgreSQL, MySQL, Oracle' },
              { label: 'Best For', value: 'Transactions, complex relationships' }
            ]
          },
          right: {
            title: 'NoSQL (Non-relational)',
            icon: 'layers',
            color: '#10b981',
            items: [
              { label: 'Schema', value: 'Flexible/schema-less, documents/KV' },
              { label: 'Scaling', value: 'Horizontal scaling built-in' },
              { label: 'Queries', value: 'Simple lookups, key-based access' },
              { label: 'ACID', value: 'Eventual consistency (BASE)' },
              { label: 'Examples', value: 'MongoDB, Cassandra, DynamoDB, Redis' },
              { label: 'Best For', value: 'High volume, flexible data, fast iteration' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'db-decision-guide',
          title: 'Database Selection Quick Guide',
          color: '#3b82f6',
          icon: 'database',
          items: [
            { label: 'Need JOINs & transactions?', value: 'SQL (PostgreSQL)', bar: 90 },
            { label: 'Flexible schema, fast writes?', value: 'Document DB (MongoDB)', bar: 75 },
            { label: 'Simple key-value lookups?', value: 'KV Store (Redis, DynamoDB)', bar: 60 },
            { label: 'Graph relationships?', value: 'Graph DB (Neo4j)', bar: 45 },
            { label: 'Time-series data?', value: 'TimescaleDB, InfluxDB', bar: 35 },
            { label: 'Full-text search?', value: 'Elasticsearch', bar: 50 },
            { label: 'Wide-column analytics?', value: 'Cassandra, HBase', bar: 40 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'sharding', name: 'Sharding', icon: 'layers', color: '#3b82f6',
          description: 'Split data across multiple DB instances by a shard key.',
          useWhen: 'Single DB can\'t handle write volume or data size',
          example: 'Shard by user_id, geographic region, or tenant_id'
        },
        {
          id: 'replication', name: 'Replication', icon: 'copy', color: '#10b981',
          description: 'Copy data to multiple nodes for read scaling and fault tolerance.',
          useWhen: 'Read-heavy workloads, need high availability',
          example: 'Primary-replica, multi-master, synchronous vs async'
        },
        {
          id: 'indexing', name: 'Indexing', icon: 'search', color: '#8b5cf6',
          description: 'Create data structures for faster lookups (B-Tree, Hash, GIN).',
          useWhen: 'Slow queries, frequent WHERE/ORDER BY on specific columns',
          example: 'CREATE INDEX idx_users_email ON users(email)'
        },
        {
          id: 'denormalization', name: 'Denormalization', icon: 'zap', color: '#f59e0b',
          description: 'Duplicate data to avoid expensive JOINs at read time.',
          useWhen: 'Read-heavy, performance-critical queries',
          example: 'Store user_name in orders table instead of JOINing users'
        }
      ],
      comparisonCards: [
        {
          title: 'Database Models',
          items: [
            { name: 'Flat Model', description: 'Single table with rows and columns, like a spreadsheet (Excel). Simple but cannot handle complex relationships between data entities.' },
            { name: 'Hierarchical Model', description: 'Tree-like structure where each record has a single parent but multiple children. Efficient for parent-child relationships (XML, JSON).' },
            { name: 'Relational Model', description: 'Tables (relations) of rows and columns with keys and normalization. Most widely used — SQL (MySQL, PostgreSQL, Oracle). Supports complex queries and transactions.' },
            { name: 'Star Schema', description: 'Central fact table surrounded by dimension tables. Optimized for OLAP/analytics — fast queries by minimizing joins (Redshift, Teradata).' },
            { name: 'Snowflake Schema', description: 'Normalized star schema where dimensions have sub-dimensions. Reduces redundancy at the cost of more complex joins (Snowflake, Redshift).' },
            { name: 'Network Model', description: 'Graph structure allowing many-to-many relationships. Each record can have multiple parents and children (Neo4j). Good for complex relationship modeling.' }
          ]
        },
        {
          title: 'Top Open-Source Databases',
          items: [
            { name: 'PostgreSQL', description: 'Full RDBMS features, ACID compliant, SQL query support. Best for web/cloud apps requiring complex queries and data integrity.' },
            { name: 'MySQL', description: 'Most widely adopted open-source DB. Relational database for OLTP. Powers web apps, cloud apps, and enterprise systems.' },
            { name: 'Redis', description: 'In-memory NoSQL. Ideal for caching, pub/sub, session stores. Sub-millisecond latency. Source available since 2024.' },
            { name: 'MongoDB', description: 'NoSQL document database. Flexible schema, horizontal scaling. Good for rapid prototyping and versatile use cases.' },
            { name: 'Cassandra', description: 'Distributed NoSQL by Facebook. Fault-tolerant, high performance, linearly scalable. AP system in CAP theorem.' },
            { name: 'CockroachDB', description: 'Distributed SQL database. Horizontally scalable with strong consistency. ACID transactions across distributed nodes.' },
            { name: 'Neo4j', description: 'Graph database. ACID compliant. Ideal for knowledge graphs, recommendation engines, and GenAI applications.' },
            { name: 'SQLite', description: 'Lightweight embedded RDBMS. Uses disk files. Perfect for mobile apps, IoT devices, and web browsers.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Write amplification during compaction', impact: 'LSM-tree databases (Cassandra, RocksDB) can experience 10-30x write amplification during compaction, degrading throughput', mitigation: 'Tune compaction strategies (leveled vs size-tiered), use dedicated compaction disks, schedule during low-traffic windows' },
        { scenario: 'Hot partition in sharded database', impact: 'Celebrity user or viral content concentrates load on single shard, causing timeouts and cascading failures', mitigation: 'Add salt to partition key, split hot shards dynamically, use read replicas for hot partitions' },
        { scenario: 'Replication lag causes stale reads', impact: 'User writes data then reads from a replica that has not received the write, seeing outdated information', mitigation: 'Read-your-writes consistency via sticky sessions, read from primary after writes, or use synchronous replication for critical paths' },
        { scenario: 'Schema migration on billion-row table', impact: 'ALTER TABLE locks the table for hours, causing downtime for all queries against that table', mitigation: 'Use online schema change tools (gh-ost, pt-online-schema-change), or create new table and backfill with double-write strategy' },
        { scenario: 'Connection pool exhaustion under load', impact: 'Application runs out of database connections, returning errors to all users simultaneously', mitigation: 'Use PgBouncer or ProxySQL for connection pooling, implement connection timeouts, and set proper pool size limits per service' },
      ],
      tradeoffs: [
        { decision: 'SQL vs NoSQL', pros: 'SQL offers ACID transactions, rich queries, and mature tooling; NoSQL offers flexible schemas, horizontal scaling, and high write throughput', cons: 'SQL struggles with horizontal scaling; NoSQL lacks joins and strong consistency guarantees', recommendation: 'Use SQL for transactional workloads with complex queries; NoSQL for high-volume writes with simple access patterns' },
        { decision: 'Normalization vs Denormalization', pros: 'Normalized reduces redundancy and simplifies writes; denormalized reduces JOINs and improves read performance', cons: 'Normalized requires expensive JOINs at read time; denormalized risks data inconsistency and increases storage', recommendation: 'Normalize for OLTP write-heavy systems; denormalize for read-heavy systems or OLAP workloads' },
        { decision: 'Single-leader vs Multi-leader replication', pros: 'Single-leader is simpler with no write conflicts; multi-leader provides lower write latency for geographically distributed users', cons: 'Single-leader has write bottleneck and higher latency for remote users; multi-leader requires complex conflict resolution', recommendation: 'Single-leader for most applications; multi-leader only when users in multiple regions need low-latency writes' },
        { decision: 'Sharding vs Read Replicas', pros: 'Sharding distributes both reads and writes; read replicas scale reads without partitioning complexity', cons: 'Sharding adds cross-shard query complexity and rebalancing challenges; replicas only help with read scaling', recommendation: 'Start with read replicas for read-heavy workloads; shard when write throughput exceeds single-node capacity' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Connection pooling, query routing, and load balancing across database instances', components: ['Connection Pool (PgBouncer)', 'Query Router', 'Read/Write Splitter'] },
        { name: 'Query Processing Layer', purpose: 'Parse, optimize, and execute SQL queries with cost-based optimization', components: ['Query Parser', 'Query Optimizer', 'Execution Engine', 'Prepared Statement Cache'] },
        { name: 'Storage Engine Layer', purpose: 'Manage data persistence with B-tree or LSM-tree structures', components: ['Buffer Pool', 'WAL (Write-Ahead Log)', 'Page Manager', 'Compaction Engine'] },
        { name: 'Replication Layer', purpose: 'Synchronize data across replicas for high availability and read scaling', components: ['Binlog/Oplog', 'Leader Election', 'Conflict Resolution', 'Replica Lag Monitor'] },
        { name: 'Sharding Layer', purpose: 'Distribute data across multiple nodes for horizontal write scaling', components: ['Partition Router', 'Shard Map', 'Rebalancing Engine', 'Cross-Shard Query Coordinator'] },
      ]
    },
    {
      id: 'caching',
      title: 'Caching',
      icon: 'zap',
      color: '#f59e0b',
      questions: 10,
      description: 'Redis, Memcached, and cache invalidation strategies.',
      concepts: ['Cache-aside', 'Write-through', 'Write-behind', 'TTL', 'LRU eviction', 'Cache stampede'],
      tips: [
        'Cache frequently accessed, rarely changing data',
        'Consider cache invalidation carefully',
        'Use Redis for complex data structures, Memcached for simple key-value',
        'Watch for Thunder Herd: add jitter to TTLs to prevent mass expiration',
        'Use Bloom filters to prevent cache penetration from non-existent keys',
        'Never set TTL on hot keys — use explicit invalidation instead',
        'Deploy cache clusters with replication for high availability (prevent Cache Crash)'
      ],

      introduction: `Caching is one of the most impactful performance optimizations. A well-designed cache can reduce latency from 100ms to 1ms and cut database load by 90%.

"There are only two hard things in Computer Science: cache invalidation and naming things." - Phil Karlton. This quote captures why caching, while powerful, requires careful thought about consistency and invalidation.`,

      functionalRequirements: [
        'Store frequently accessed data for fast retrieval',
        'Reduce load on backend databases',
        'Support multiple data types (strings, lists, hashes)',
        'Handle cache misses gracefully',
        'Support cache invalidation mechanisms',
        'Enable cache warm-up strategies'
      ],

      nonFunctionalRequirements: [
        'Read latency: < 1ms (in-memory)',
        'Throughput: 100K+ operations/second per node',
        'Hit rate: > 90% for effective caching',
        'Availability: 99.99%',
        'Memory efficiency: Optimal storage of hot data',
        'Eviction: Graceful handling when cache is full'
      ],

      dataModel: {
        description: 'Common caching patterns and data structures',
        schema: `Cache Key Patterns:
  user:{userId}:profile → user profile JSON
  product:{productId} → product details
  feed:{userId}:page:{page} → paginated feed
  session:{sessionId} → session data
  rate_limit:{userId}:{endpoint} → request count

Redis Data Structures:
  STRING: Simple key-value (user profile)
  HASH: Object with fields (user with multiple attributes)
  LIST: Ordered list (activity feed, recent items)
  SET: Unique items (followers, tags)
  SORTED SET: Ranked items (leaderboard, timeline)
  HYPERLOGLOG: Cardinality estimation (unique visitors)

TTL Strategies:
  Short (1-5 min): Rate limits, session tokens
  Medium (5-60 min): API responses, user profiles
  Long (1-24 hrs): Static data, computed results
  No TTL: Reference data (countries, categories)`
      },

      apiDesign: {
        description: 'Common caching operations',
        endpoints: [
          { method: 'GET', path: 'cache.get(key)', params: 'key', response: 'Cached value or null' },
          { method: 'SET', path: 'cache.set(key, value, ttl)', params: 'key, value, ttl', response: 'OK' },
          { method: 'DEL', path: 'cache.delete(key)', params: 'key', response: 'Deleted count' },
          { method: 'MGET', path: 'cache.mget([keys])', params: 'array of keys', response: 'Array of values' },
          { method: 'INCR', path: 'cache.incr(key)', params: 'key', response: 'New value (atomic)' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the main caching strategies?',
          answer: `**Cache-Aside (Lazy Loading)** - Most common
\`\`\`
Read:
1. Check cache
2. If miss, read from DB
3. Store in cache
4. Return data

Write:
1. Write to DB
2. Invalidate cache (or let it expire)
\`\`\`
- Pros: Only caches data that's requested
- Cons: Cache miss = slow request, stale data possible

**Write-Through**
\`\`\`
Write:
1. Write to cache
2. Cache writes to DB (synchronous)
\`\`\`
- Pros: Cache always consistent with DB
- Cons: Write latency increased

**Write-Behind (Write-Back)**
\`\`\`
Write:
1. Write to cache
2. Cache writes to DB (async, batched)
\`\`\`
- Pros: Fast writes, batching efficiency
- Cons: Data loss risk if cache fails

**Read-Through**
\`\`\`
Read:
1. Check cache
2. Cache fetches from DB on miss
3. Cache returns data
\`\`\`
- Pros: Simplified app logic
- Cons: Cache needs DB access`
        },
        {
          question: 'How do you handle cache invalidation?',
          answer: `**Cache Invalidation Strategies**:

1. **TTL-based expiration**:
   - Set expiry time on all cached items
   - Simple but may serve stale data until TTL

2. **Event-driven invalidation**:
   - Delete cache when data changes
   - Requires knowing all affected cache keys
   \`\`\`
   on_user_update(user_id):
     cache.delete(f"user:{user_id}")
     cache.delete(f"feed:{user_id}")
   \`\`\`

3. **Version-based invalidation**:
   - Include version in cache key
   - Increment version to invalidate
   \`user:{userId}:v{version}\`

4. **Tag-based invalidation**:
   - Tag related cache entries
   - Delete all entries with a tag
   \`\`\`
   cache.set("product:123", data, tags=["catalog"])
   cache.delete_by_tag("catalog")  # Clear all catalog
   \`\`\`

**Best practice**: Combine TTL (safety net) with event-driven (freshness)`
        },
        {
          question: 'What is cache stampede and how to prevent it?',
          answer: `**Cache Stampede (Thundering Herd)**:
Many requests hit database simultaneously when:
- Popular cached item expires
- Cache server restarts
- Cold cache on deployment

\`\`\`
                     Cache Miss!
Request 1 ───┐
Request 2 ───┼───▶ Database ◀─── OVERLOADED!
Request 3 ───┤
   ...       │
Request 100 ─┘
\`\`\`

**Prevention Strategies**:

1. **Locking (Mutex)**:
   - First request acquires lock and fetches
   - Others wait or return stale data
   \`\`\`python
   if not cache.get(key):
     if cache.acquire_lock(key):
       data = db.fetch()
       cache.set(key, data)
       cache.release_lock(key)
     else:
       wait_or_return_stale()
   \`\`\`

2. **Early expiration (Probabilistic)**:
   - Refresh before actual expiry
   - Random refresh within window
   \`ttl_remaining < random(0, buffer_time)\`

3. **Background refresh**:
   - Async worker refreshes before expiry
   - Never serve miss, always return (possibly stale) data

4. **Request coalescing**:
   - Multiple requests for same key share one DB call`
        },
        {
          question: 'Redis vs Memcached - when to use each?',
          answer: `**Redis** - Feature-rich:
- Data structures: Strings, lists, sets, hashes, sorted sets
- Persistence: RDB snapshots, AOF logs
- Replication: Primary-replica, Redis Cluster
- Pub/Sub: Real-time messaging
- Lua scripting: Atomic operations
- Use for: Sessions, leaderboards, rate limiting, pub/sub

**Memcached** - Simple and fast:
- Only strings (key-value)
- No persistence (pure cache)
- Multi-threaded (better multi-core usage)
- Simpler protocol (slightly lower latency)
- Use for: Simple caching, when you need only strings

**Decision Matrix**:
| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data types | Many | Strings only |
| Persistence | Yes | No |
| Replication | Yes | No |
| Clustering | Yes | Client-side |
| Memory efficiency | Good | Better |
| Multi-threaded | No* | Yes |

*Redis 6+ has I/O threading

**Recommendation**: Default to Redis unless you need Memcached's specific advantages`
        },
        {
          question: 'How do you design a distributed cache?',
          answer: `**Distributed Caching Architecture**:

\`\`\`
           ┌──────────────────────────────────────────┐
           │            Cache Cluster                 │
           │  ┌────────┐  ┌────────┐  ┌────────┐     │
           │  │ Node 1 │  │ Node 2 │  │ Node 3 │     │
           │  │ Keys   │  │ Keys   │  │ Keys   │     │
           │  │ A-F    │  │ G-M    │  │ N-Z    │     │
           │  └────────┘  └────────┘  └────────┘     │
           └──────────────────────────────────────────┘
                          ▲
                          │ Consistent Hashing
                          │
           ┌──────────────────────────────────────────┐
           │            App Servers                   │
           │  ┌────────┐  ┌────────┐  ┌────────┐     │
           │  │Server 1│  │Server 2│  │Server 3│     │
           │  └────────┘  └────────┘  └────────┘     │
           └──────────────────────────────────────────┘
\`\`\`

**Key Components**:

1. **Consistent hashing**: Distribute keys across nodes
   - Add/remove nodes affects minimal keys
   - Virtual nodes for better distribution

2. **Replication**: Each key on 2+ nodes
   - Read from any replica
   - Write to primary, replicate async

3. **Client-side routing**: App knows which node has key
   - No proxy latency
   - Requires cluster-aware client

4. **Failure handling**:
   - Health checks detect failed nodes
   - Traffic redirected to replicas
   - Auto-recovery when node returns`
        }
      ],

      basicImplementation: {
        title: 'Simple Application Cache',
        description: 'Single Redis instance for caching with cache-aside pattern',
        svgTemplate: 'simpleCache',
        problems: [
          'Single point of failure',
          'Limited memory capacity',
          'No automatic failover',
          'Cache stampede risk'
        ]
      },

      advancedImplementation: {
        title: 'Multi-Tier Caching Architecture',
        description: 'CDN for edge caching → L1 in-process cache → L2 Redis cluster → Database, with each tier providing faster access than the next.',
        svgTemplate: 'multiTierCache',
        keyPoints: [
          'Multi-tier reduces load on each subsequent tier',
          'L1 cache prevents network round-trip for hot data',
          'Redis Cluster provides horizontal scaling and HA',
          'CDN offloads static content globally',
          'Each tier has appropriate TTL and invalidation'
        ]
      },

      discussionPoints: [
        {
          topic: 'Cache Hit Rate Optimization',
          points: [
            'Monitor hit rate - aim for >90%',
            'Increase TTL for stable data',
            'Pre-warm cache on deployment',
            'Use appropriate key granularity',
            'Consider cache-aside vs read-through based on patterns'
          ]
        },
        {
          topic: 'Memory Management',
          points: [
            'Set maxmemory in Redis',
            'Choose eviction policy: LRU, LFU, random',
            'Monitor memory usage and eviction rate',
            'Compress large values',
            'Use appropriate data structures (HASH vs STRING)'
          ]
        },
        {
          topic: 'Consistency Trade-offs',
          points: [
            'TTL provides eventual consistency guarantee',
            'Event-driven invalidation for stronger consistency',
            'Accept stale data for read-heavy, tolerance systems',
            'Use write-through for critical data',
            'Consider read-your-writes consistency'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-caching', title: 'Multi-Layer Caching (Eraser)', description: 'Browser cache, CDN, Redis application cache, and database query cache with cache-aside pattern', src: '/diagrams/caching/eraser-caching-layers.png', type: 'cloud-architecture' },
        { id: 'cache-failure-patterns', title: 'Cache Failure Patterns', description: 'Thunder Herd, Penetration, Breakdown, and Crash — common cache failures and their solutions', src: '/diagrams/caching/cache-failure-patterns.svg', type: 'architecture' }
      ],
      comparisonTables: [
        {
          id: 'cache-strategies',
          title: 'Caching Strategies',
          left: {
            title: 'Cache-Aside (Lazy Loading)',
            icon: 'search',
            color: '#3b82f6',
            items: [
              { label: 'Flow', value: 'App checks cache → miss → read DB → write cache' },
              { label: 'Pros', value: 'Only caches what is needed, resilient to cache failure' },
              { label: 'Cons', value: 'Cache miss = 3 trips, data can be stale' },
              { label: 'Use When', value: 'Read-heavy, can tolerate stale data' },
              { label: 'Examples', value: 'User profiles, product catalog' },
              { label: 'Staleness', value: 'TTL-based expiration' }
            ]
          },
          right: {
            title: 'Write-Through',
            icon: 'edit',
            color: '#10b981',
            items: [
              { label: 'Flow', value: 'App writes cache + DB simultaneously' },
              { label: 'Pros', value: 'Cache always consistent, no stale reads' },
              { label: 'Cons', value: 'Higher write latency, caches unused data' },
              { label: 'Use When', value: 'Need strong consistency' },
              { label: 'Examples', value: 'Session storage, real-time dashboards' },
              { label: 'Staleness', value: 'None — always fresh' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'cache-hit-rates',
          title: 'Typical Cache Hit Rates by Use Case',
          color: '#10b981',
          icon: 'zap',
          items: [
            { label: 'Static assets (CDN)', value: '95-99%', bar: 97 },
            { label: 'User sessions', value: '90-95%', bar: 92 },
            { label: 'Database query results', value: '80-95%', bar: 87 },
            { label: 'API responses', value: '70-90%', bar: 80 },
            { label: 'Search results', value: '60-80%', bar: 70 },
            { label: 'Personalized content', value: '40-60%', bar: 50 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'cache-aside', name: 'Cache-Aside', icon: 'search', color: '#3b82f6',
          description: 'Application manages cache reads/writes. Most common pattern.',
          useWhen: 'Read-heavy workloads with tolerance for stale data',
          example: 'Redis as cache-aside for PostgreSQL queries'
        },
        {
          id: 'write-through', name: 'Write-Through', icon: 'edit', color: '#10b981',
          description: 'Every write goes to cache AND database simultaneously.',
          useWhen: 'Strong consistency required between cache and DB',
          example: 'DynamoDB Accelerator (DAX)'
        },
        {
          id: 'write-behind', name: 'Write-Behind (Write-Back)', icon: 'clock', color: '#f59e0b',
          description: 'Write to cache immediately, async flush to DB later.',
          useWhen: 'High write throughput, can tolerate data loss risk',
          example: 'Gaming leaderboards, analytics counters'
        },
        {
          id: 'cache-eviction', name: 'Cache Eviction', icon: 'trash', color: '#ef4444',
          description: 'Remove items when cache is full: LRU, LFU, FIFO, TTL.',
          useWhen: 'Memory management — always needed',
          example: 'LRU eviction in Redis with maxmemory-policy allkeys-lru'
        }
      ],
      comparisonCards: [
        {
          title: 'Cache Failure Patterns',
          items: [
            { name: 'Thunder Herd', description: 'Large number of keys expire simultaneously, all queries hit the database at once. Fix: Set random expiry times to spread expirations; allow only core data to hit DB until cache recovers.' },
            { name: 'Cache Penetration', description: 'Queries for data that does not exist in cache OR database, causing every request to hit DB. Fix: Use a Bloom filter to quickly reject queries for non-existent keys.' },
            { name: 'Cache Breakdown', description: 'A single hot key expires while under heavy load, causing a burst of DB queries. Fix: Never set expiry for hot keys; use mutex locks so only one thread rebuilds the cache.' },
            { name: 'Cache Crash', description: 'Entire cache instance goes down, all traffic floods the database. Fix: Use circuit breakers to prevent cascading failure; deploy highly-available cache clusters with replication.' }
          ]
        },
        {
          title: 'Cache Eviction Strategies',
          items: [
            { name: 'LRU (Least Recently Used)', description: 'Evicts items not accessed for the longest time. Best general-purpose strategy — based on temporal locality principle.' },
            { name: 'LFU (Least Frequently Used)', description: 'Evicts items with the lowest access count. Better for skewed workloads where popularity is stable.' },
            { name: 'FIFO (First In First Out)', description: 'Evicts the oldest cached item regardless of access patterns. Simple but ignores popularity.' },
            { name: 'SLRU (Segmented LRU)', description: 'Two segments: probation and protected. New entries go to probation; accessed again → promoted to protected. LRU eviction happens in probation first.' },
            { name: 'TTL (Time-to-Live)', description: 'Each entry has an expiration timer. When TTL expires, entry becomes eligible for eviction. Often combined with other strategies.' },
            { name: 'MRU (Most Recently Used)', description: 'Evicts the most recently accessed item. Useful for scanning workloads where recently accessed items are least likely to be reaccessed.' },
            { name: 'Two-Tiered Caching', description: 'Hot tier (L1) for frequently used data, cold tier (L2) for less frequently used. Combines memory efficiency with hit rate.' },
            { name: 'Random Replacement', description: 'Randomly picks a cache entry to evict. Surprisingly effective for uniform access patterns with minimal overhead.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Cache stampede (thundering herd)', impact: 'Popular key expires and hundreds of concurrent requests simultaneously hit the database to rebuild it, causing DB overload', mitigation: 'Use mutex/lock so only one request rebuilds the cache, serve stale data to others, or use probabilistic early expiration' },
        { scenario: 'Cache penetration from non-existent keys', impact: 'Attackers or bugs query keys that never exist in cache or DB, bypassing cache entirely and hammering the database', mitigation: 'Use Bloom filters to reject impossible keys, cache negative results with short TTL, and validate input before cache lookup' },
        { scenario: 'Inconsistency between cache and database', impact: 'Cache returns stale data after a database update, causing users to see outdated information or make decisions on wrong data', mitigation: 'Use cache-aside with explicit invalidation on writes, implement change data capture (CDC) for cache invalidation, or use write-through pattern' },
        { scenario: 'Hot key overwhelming single cache node', impact: 'A viral item or celebrity profile concentrates all requests on one Redis node, exceeding its throughput capacity', mitigation: 'Replicate hot keys across multiple cache nodes, use local in-process cache (L1) for ultra-hot keys, or shard the key with random suffixes' },
        { scenario: 'Memory exhaustion causing unexpected evictions', impact: 'Cache runs out of memory and evicts important keys, causing cache hit rate to drop dramatically', mitigation: 'Monitor memory usage and eviction rates, set appropriate maxmemory policies, separate hot data into dedicated cache clusters' },
      ],
      tradeoffs: [
        { decision: 'Cache-aside vs Write-through', pros: 'Cache-aside is simpler and only caches data that is actually read; write-through ensures cache is always consistent with DB', cons: 'Cache-aside has a window of inconsistency after writes; write-through has write latency penalty and caches data that may never be read', recommendation: 'Cache-aside for most read-heavy workloads; write-through when consistency is critical and data is frequently read after write' },
        { decision: 'Redis vs Memcached', pros: 'Redis offers rich data structures, persistence, and replication; Memcached is simpler with multi-threaded performance', cons: 'Redis is single-threaded (per shard) and more complex to operate; Memcached lacks persistence and advanced features', recommendation: 'Redis for most use cases due to flexibility; Memcached only for simple key-value caching with very high throughput needs' },
        { decision: 'Local (in-process) vs Distributed cache', pros: 'Local cache has zero network latency; distributed cache shares state across all app instances', cons: 'Local cache wastes memory with duplicates and has consistency issues across instances; distributed cache adds network hop latency', recommendation: 'Use two-tier caching: local L1 for ultra-hot keys with short TTL, distributed L2 (Redis) for everything else' },
        { decision: 'Short TTL vs Long TTL', pros: 'Short TTL keeps data fresh; long TTL maximizes cache hit rate and reduces DB load', cons: 'Short TTL increases cache misses and DB load; long TTL risks serving stale data', recommendation: 'Match TTL to data change frequency: seconds for rate limits, minutes for user profiles, hours for static reference data' },
      ],
      layeredDesign: [
        { name: 'Client-Side Cache', purpose: 'Cache responses in the browser or mobile app to eliminate network requests entirely', components: ['HTTP Cache (Cache-Control)', 'Service Worker Cache', 'Local Storage / IndexedDB'] },
        { name: 'CDN / Edge Cache', purpose: 'Cache static and semi-static content at edge locations near users', components: ['CDN Edge Servers (CloudFront, Cloudflare)', 'Edge Rules', 'Stale-While-Revalidate'] },
        { name: 'Application-Level Cache (L1)', purpose: 'In-process cache for ultra-hot data with zero network overhead', components: ['In-Memory HashMap', 'Caffeine/Guava Cache (JVM)', 'Node.js LRU Cache'] },
        { name: 'Distributed Cache (L2)', purpose: 'Shared cache across application instances for consistent cached data', components: ['Redis Cluster', 'Memcached', 'Cache Proxy (Twemproxy, Envoy)'] },
        { name: 'Database Query Cache', purpose: 'Cache query results or buffer pool pages within the database engine itself', components: ['Buffer Pool (InnoDB)', 'Query Result Cache', 'Materialized Views'] },
      ]
    },
    {
      id: 'message-queues',
      title: 'Message Queues',
      icon: 'inbox',
      color: '#ec4899',
      questions: 7,
      description: 'Async processing with Kafka, RabbitMQ, SQS.',
      concepts: ['Pub/Sub', 'Point-to-point', 'At-least-once delivery', 'Exactly-once semantics', 'Dead letter queues'],
      tips: [
        'Use queues to decouple services and handle traffic spikes',
        'Kafka for high-throughput event streaming',
        'SQS for simple async task processing'
      ],

      introduction: `Message queues enable asynchronous communication between services, decoupling producers from consumers. They're essential for building scalable, resilient distributed systems.

LinkedIn processes 7+ trillion messages per day through Kafka. Netflix uses queues to handle 200+ billion events daily. Understanding when and how to use message queues is critical for system design.`,

      functionalRequirements: [
        'Send messages from producers to consumers',
        'Support multiple messaging patterns (point-to-point, pub/sub)',
        'Handle message ordering when required',
        'Support message acknowledgment',
        'Enable message filtering and routing',
        'Dead letter queue for failed messages'
      ],

      nonFunctionalRequirements: [
        'Throughput: 100K-1M+ messages/second',
        'Latency: Single-digit milliseconds',
        'Durability: No message loss',
        'Availability: 99.99%',
        'Ordering: Maintain order within partition/queue',
        'Scalability: Horizontal scaling of consumers'
      ],

      dataModel: {
        description: 'Message structure and queue concepts',
        schema: `Message Structure:
{
  id: uuid,
  topic/queue: string,
  key: string (for partitioning),
  value: bytes (payload),
  headers: map (metadata),
  timestamp: datetime,
  partition: int (Kafka),
  offset: long (Kafka)
}

Kafka Concepts:
  Topic → Multiple Partitions
  Partition → Ordered sequence of messages
  Consumer Group → Consumers sharing load
  Offset → Position in partition

Queue Concepts (RabbitMQ/SQS):
  Queue: FIFO message storage
  Exchange: Routes messages to queues
  Binding: Rules for routing
  Visibility timeout: Lock while processing`
      },

      apiDesign: {
        description: 'Common messaging operations',
        endpoints: [
          { method: 'PRODUCE', path: 'topic.send(key, message)', params: 'key, payload', response: 'ack with offset' },
          { method: 'CONSUME', path: 'consumer.poll()', params: 'timeout', response: 'batch of messages' },
          { method: 'ACK', path: 'consumer.commit(offset)', params: 'offset', response: 'confirmed' },
          { method: 'SUBSCRIBE', path: 'consumer.subscribe(topics)', params: 'topic list', response: 'subscribed' },
          { method: 'SEEK', path: 'consumer.seek(offset)', params: 'partition, offset', response: 'position set' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the main messaging patterns?',
          answer: `**Point-to-Point (Queue)**:
\`\`\`
Producer ───▶ Queue ───▶ Consumer
                    ───▶ Consumer (only one gets each message)
\`\`\`
- Each message processed by exactly one consumer
- Use for: Task queues, work distribution
- Examples: SQS, RabbitMQ queues

**Publish-Subscribe (Fan-out)**:
\`\`\`
              ┌───▶ Subscriber A (gets all messages)
Producer ───▶ Topic
              └───▶ Subscriber B (gets all messages)
\`\`\`
- Each message delivered to all subscribers
- Use for: Event broadcasting, notifications
- Examples: Kafka topics, SNS, RabbitMQ exchanges

**Consumer Groups (Kafka)**:
\`\`\`
              ┌───▶ Consumer 1 ─┐
Producer ───▶ Topic               Group A (shares load)
              └───▶ Consumer 2 ─┘
\`\`\`
- Combines both: pub/sub between groups, queue within group
- Each partition assigned to one consumer in group`
        },
        {
          question: 'What delivery guarantees exist?',
          answer: `**At-Most-Once**:
- Send and forget
- Message may be lost
- Fastest, simplest
- Use for: Metrics, logs (loss acceptable)

**At-Least-Once** (most common):
- Retry until acknowledged
- Message may be delivered multiple times
- Consumer must be idempotent
- Use for: Most applications
\`\`\`
Producer: Send → wait for ACK → retry if no ACK
Consumer: Receive → process → ACK
\`\`\`

**Exactly-Once** (hardest):
- Each message processed exactly once
- Requires distributed transactions or idempotency
- Kafka supports via transactions + idempotent producer
- Use for: Financial transactions, inventory

**Idempotency** - Key to at-least-once:
\`\`\`python
# Bad: Duplicate message = double charge
def process_payment(msg):
    charge_card(msg.amount)

# Good: Use unique ID to deduplicate
def process_payment(msg):
    if not already_processed(msg.id):
        charge_card(msg.amount)
        mark_processed(msg.id)
\`\`\``
        },
        {
          question: 'Kafka vs RabbitMQ vs SQS - when to use each?',
          answer: `**Apache Kafka**:
- Log-based, append-only storage
- Very high throughput (millions/sec)
- Message retention (replay old messages)
- Ordering within partition
- Complex consumer groups
- Use for: Event streaming, logs, analytics, high throughput

**RabbitMQ**:
- Traditional message broker
- Flexible routing (exchanges, bindings)
- Message acknowledgment
- Priority queues
- Lower latency for small messages
- Use for: Task queues, complex routing, RPC

**Amazon SQS**:
- Fully managed, serverless
- Unlimited throughput (standard queues)
- FIFO queues for ordering
- No operational overhead
- Pay per request
- Use for: AWS workloads, simple queues, serverless

**Decision Matrix**:
| Need | Choose |
|------|--------|
| Event streaming | Kafka |
| Task queue | RabbitMQ or SQS |
| Complex routing | RabbitMQ |
| Managed service | SQS or Kafka (MSK) |
| Message replay | Kafka |
| Low ops overhead | SQS |`
        },
        {
          question: 'How do you handle message ordering?',
          answer: `**The Problem**:
- Distributed systems process messages in parallel
- Parallel = no global order
- But some operations need order (bank transactions)

**Solutions**:

1. **Partition by key** (Kafka):
   \`\`\`
   Messages with same key → same partition → same order

   User 123's events → Partition 5 → Order preserved
   User 456's events → Partition 8 → Order preserved
   \`\`\`

2. **Single consumer**:
   - Only one consumer per queue
   - Simple but limits throughput

3. **FIFO queues** (SQS FIFO):
   - Message groups for ordering
   - Exactly-once processing
   - Lower throughput (300 msg/sec)

4. **Sequence numbers**:
   - Include sequence in message
   - Consumer reorders if needed
   - Buffer out-of-order messages

**Best practice**: Partition by entity (user_id, order_id) to maintain ordering per entity while enabling parallelism`
        },
        {
          question: 'How do you handle failed messages?',
          answer: `**Dead Letter Queue (DLQ)**:
Messages that fail repeatedly go to separate queue for investigation.

\`\`\`
┌──────────┐    ┌───────────┐    ┌──────────┐
│ Producer │───▶│   Queue   │───▶│ Consumer │
└──────────┘    └─────┬─────┘    └────┬─────┘
                      │               │
                      │    Failed     │
                      │  (3 retries)  │
                      ▼               │
                ┌───────────┐         │
                │    DLQ    │◀────────┘
                └───────────┘
                      │
                      ▼
                ┌───────────┐
                │  Alerting │
                │  & Debug  │
                └───────────┘
\`\`\`

**Retry Strategies**:

1. **Immediate retry**: Retry N times immediately
2. **Exponential backoff**: Wait 1s, 2s, 4s, 8s...
3. **Scheduled retry**: Wait fixed interval between retries

**Error Categories**:
- Transient: Retry (network timeout, temporary failure)
- Permanent: Send to DLQ (invalid data, business rule violation)
- Poison message: Message that always fails

**DLQ Processing**:
- Alert on DLQ messages
- Manual investigation
- Fix and replay
- Or discard with logging`
        }
      ],

      basicImplementation: {
        title: 'Simple Message Queue',
        description: 'Single broker for async processing - Producer sends to queue, consumer processes asynchronously.',
        svgTemplate: 'simpleQueue',
        problems: [
          'Single point of failure',
          'Limited throughput',
          'No message replay',
          'Manual scaling'
        ]
      },

      advancedImplementation: {
        title: 'Distributed Event Streaming',
        description: 'Kafka cluster with multiple producers, partitioned topics, and consumer groups for horizontal scaling.',
        svgTemplate: 'distributedQueue',
        keyPoints: [
          'Partitions enable parallel processing',
          'Replication factor of 3 for fault tolerance',
          'Each consumer group gets all messages',
          'Within group, partitions distributed to consumers',
          'ZooKeeper (or KRaft) for coordination'
        ]
      },

      discussionPoints: [
        {
          topic: 'Choosing the Right Tool',
          points: [
            'Kafka: High throughput, event streaming, replay needed',
            'RabbitMQ: Complex routing, lower latency, traditional queuing',
            'SQS: Managed service, simple queues, AWS integration',
            'Redis Streams: Simple streaming, already using Redis',
            'Consider operational complexity vs features'
          ]
        },
        {
          topic: 'Common Patterns',
          points: [
            'Event sourcing: Store events, derive state',
            'CQRS: Separate read and write models via events',
            'Saga pattern: Distributed transactions via messages',
            'Outbox pattern: Reliable publishing with transactions',
            'Competing consumers: Scale processing horizontally'
          ]
        },
        {
          topic: 'Operational Considerations',
          points: [
            'Monitor consumer lag (falling behind)',
            'Set appropriate retention periods',
            'Plan for partition rebalancing',
            'Handle schema evolution (Avro, Protobuf)',
            'Test failure scenarios (broker down, network partition)'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-kafka', title: 'Kafka Architecture (Eraser)', description: 'Producers, brokers with partitioned topics, consumer groups, ZooKeeper, and schema registry', src: '/diagrams/message-queues/eraser-kafka-architecture.png', type: 'cloud-architecture' }
      ],
      comparisonTables: [
        {
          id: 'pubsub-vs-p2p',
          title: 'Pub/Sub vs Point-to-Point',
          left: {
            title: 'Publish/Subscribe',
            icon: 'globe',
            color: '#8b5cf6',
            items: [
              { label: 'Model', value: 'One message → multiple consumers' },
              { label: 'Coupling', value: 'Loose — publishers don\'t know subscribers' },
              { label: 'Scaling', value: 'Add subscribers without changing publisher' },
              { label: 'Use Case', value: 'Events, notifications, fan-out' },
              { label: 'Examples', value: 'Kafka topics, SNS, Redis Pub/Sub' },
              { label: 'Delivery', value: 'All subscribers get every message' }
            ]
          },
          right: {
            title: 'Point-to-Point (Queue)',
            icon: 'arrowRight',
            color: '#f59e0b',
            items: [
              { label: 'Model', value: 'One message → one consumer' },
              { label: 'Coupling', value: 'Moderate — consumers compete for messages' },
              { label: 'Scaling', value: 'Add consumers to increase throughput' },
              { label: 'Use Case', value: 'Task distribution, work queues' },
              { label: 'Examples', value: 'SQS, RabbitMQ queues, Celery' },
              { label: 'Delivery', value: 'Exactly one consumer processes each message' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'queue-comparison',
          title: 'Message Queue Technologies',
          color: '#8b5cf6',
          icon: 'layers',
          items: [
            { label: 'Apache Kafka', value: 'High throughput, log-based', bar: 95 },
            { label: 'RabbitMQ', value: 'Flexible routing, AMQP', bar: 75 },
            { label: 'Amazon SQS', value: 'Managed, serverless', bar: 70 },
            { label: 'Redis Streams', value: 'Lightweight, fast', bar: 60 },
            { label: 'Apache Pulsar', value: 'Multi-tenant, tiered storage', bar: 55 },
            { label: 'NATS', value: 'Ultra-lightweight, cloud-native', bar: 45 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'dlq', name: 'Dead Letter Queue', icon: 'alertTriangle', color: '#ef4444',
          description: 'Route failed messages to a separate queue for investigation.',
          useWhen: 'Message processing can fail, need retry/debug mechanism',
          example: 'SQS DLQ after 3 retries, RabbitMQ dead letter exchange'
        },
        {
          id: 'exactly-once', name: 'Exactly-Once Delivery', icon: 'check', color: '#10b981',
          description: 'Guarantee each message is processed exactly once using idempotency.',
          useWhen: 'Financial transactions, order processing',
          example: 'Kafka transactional API + idempotent consumers'
        },
        {
          id: 'backpressure', name: 'Backpressure', icon: 'shield', color: '#3b82f6',
          description: 'Slow down producers when consumers can\'t keep up.',
          useWhen: 'Prevent queue overflow, protect downstream services',
          example: 'Kafka consumer lag monitoring, RabbitMQ flow control'
        },
        {
          id: 'event-sourcing', name: 'Event Sourcing', icon: 'clock', color: '#8b5cf6',
          description: 'Store events as the source of truth, rebuild state from event log.',
          useWhen: 'Audit trail, temporal queries, CQRS',
          example: 'Bank transactions, shopping cart events'
        }
      ],
      comparisonCards: [
        {
          title: 'Kafka Use Cases',
          items: [
            { name: 'Log Processing & Analysis', description: 'Services emit logs to Kafka → consumed by Elasticsearch → visualized in Kibana. Decouples log producers from consumers.' },
            { name: 'Data Streaming for Recommendations', description: 'User click streams flow through Kafka → Flink aggregates data → feeds ML models for real-time recommendations.' },
            { name: 'System Monitoring & Alerting', description: 'Services publish metrics to Kafka → stream processor (Flink) analyzes patterns → triggers real-time alerts on anomalies.' },
            { name: 'Change Data Capture (CDC)', description: 'Database transaction logs flow to Kafka via connectors → consumed by ElasticSearch, Redis, and replica databases for sync.' },
            { name: 'System Migration', description: 'Old and new services both write to Kafka during migration. Compare outputs for reconciliation before full cutover.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Consumer lag causing unbounded queue growth', impact: 'Producers outpace consumers, queue fills disk storage, new messages are rejected or lost, and backpressure propagates to upstream services', mitigation: 'Monitor consumer lag metrics, auto-scale consumer groups, set retention limits with dead-letter queues for overflow' },
        { scenario: 'Poison message blocking consumer progress', impact: 'A malformed message causes the consumer to crash repeatedly, blocking all subsequent messages in the partition', mitigation: 'Implement retry limits with exponential backoff, route failed messages to dead-letter queue after N retries, use idempotent processing' },
        { scenario: 'Message ordering violated during rebalancing', impact: 'Kafka consumer group rebalance reassigns partitions, causing temporary duplicate or out-of-order processing', mitigation: 'Use cooperative sticky partition assignment, implement idempotent consumers with deduplication keys, design for at-least-once semantics' },
        { scenario: 'Duplicate messages from producer retries', impact: 'Network timeout causes producer to retry, resulting in the same message published twice and processed twice (double charge, duplicate notification)', mitigation: 'Enable Kafka idempotent producer (enable.idempotence=true), implement consumer-side deduplication using message IDs' },
        { scenario: 'Schema evolution breaks consumers', impact: 'Producer changes message format without coordinating, causing all consumers to fail deserialization', mitigation: 'Use a schema registry (Confluent Schema Registry) with compatibility checks, enforce backward/forward compatibility rules' },
      ],
      tradeoffs: [
        { decision: 'Kafka vs RabbitMQ', pros: 'Kafka offers high throughput, replay capability, and log-based durability; RabbitMQ offers flexible routing, lower latency, and simpler operations', cons: 'Kafka has higher operational complexity and higher latency; RabbitMQ does not support message replay and has lower throughput ceiling', recommendation: 'Kafka for event streaming and high-throughput pipelines; RabbitMQ for task queues and complex routing patterns' },
        { decision: 'At-least-once vs Exactly-once delivery', pros: 'At-least-once is simpler and higher throughput; exactly-once eliminates duplicate processing', cons: 'At-least-once requires idempotent consumers; exactly-once adds latency and throughput overhead from transactional writes', recommendation: 'At-least-once with idempotent consumers for most workloads; exactly-once only for financial transactions where duplication is unacceptable' },
        { decision: 'Push vs Pull consumption model', pros: 'Push delivers messages immediately with low latency; pull lets consumers control their own pace', cons: 'Push can overwhelm slow consumers; pull adds polling overhead and slight latency', recommendation: 'Pull (Kafka model) for high-throughput event processing; push (RabbitMQ/SQS model) for real-time notifications and task dispatch' },
        { decision: 'Single large topic vs Many granular topics', pros: 'Single topic is simpler to manage; granular topics enable independent scaling and filtering per consumer', cons: 'Single topic forces all consumers to process irrelevant messages; many topics increase operational overhead', recommendation: 'Use domain-based topics (order-events, user-events) with message type headers for sub-filtering' },
      ],
      layeredDesign: [
        { name: 'Producer Layer', purpose: 'Serialize messages, assign partition keys, and publish to the message broker', components: ['Message Serializer (Avro/Protobuf)', 'Partition Key Router', 'Producer Client (batching, compression)', 'Schema Registry'] },
        { name: 'Broker / Transport Layer', purpose: 'Durably store messages, manage topics/partitions, and handle replication', components: ['Topic/Queue Manager', 'Partition Log Storage', 'Replication Controller', 'Retention Policy Engine'] },
        { name: 'Consumer Layer', purpose: 'Subscribe to topics, deserialize messages, and process them with delivery guarantees', components: ['Consumer Group Coordinator', 'Offset Manager', 'Message Deserializer', 'Dead-Letter Queue Handler'] },
        { name: 'Monitoring & Operations Layer', purpose: 'Track queue health, consumer lag, and throughput metrics', components: ['Lag Monitor (Burrow)', 'Throughput Dashboard', 'Schema Compatibility Checker', 'Alert Manager'] },
      ]
    },
    {
      id: 'api-design',
      title: 'API Design',
      icon: 'code',
      color: '#6366f1',
      questions: 8,
      description: 'REST, GraphQL, gRPC, and API best practices.',
      concepts: ['REST principles', 'GraphQL vs REST', 'gRPC for microservices', 'API versioning', 'Rate limiting', 'Pagination'],
      tips: [
        'Use REST for public APIs, gRPC for internal microservices',
        'GraphQL when clients need flexible queries',
        'Always version your APIs (v1, v2) in the URL or header'
      ],

      introduction: `API design is how services communicate. A well-designed API is intuitive, consistent, and scales with your product. A poorly designed API creates technical debt that's painful to fix.

Stripe and Twilio are famous for excellent API design—developers love using them. Understanding REST, GraphQL, and gRPC, and when to use each, is fundamental to system design interviews.`,

      functionalRequirements: [
        'Support CRUD operations on resources',
        'Enable filtering, sorting, and pagination',
        'Handle authentication and authorization',
        'Support versioning for backward compatibility',
        'Provide clear error messages',
        'Enable rate limiting per client'
      ],

      nonFunctionalRequirements: [
        'Latency: < 100ms p95 for simple queries',
        'Throughput: 10K+ requests/second',
        'Availability: 99.99%',
        'Consistency: Predictable behavior',
        'Discoverability: Self-documenting',
        'Backward compatibility: No breaking changes'
      ],

      dataModel: {
        description: 'Comparison of API paradigms',
        schema: `REST (Resource-oriented):
  GET /users/123          → Read user
  POST /users             → Create user
  PUT /users/123          → Update user (full)
  PATCH /users/123        → Update user (partial)
  DELETE /users/123       → Delete user
  GET /users/123/orders   → User's orders

GraphQL (Query-oriented):
  query {
    user(id: "123") {
      name
      email
      orders(first: 10) {
        id, total, status
      }
    }
  }

gRPC (Method-oriented):
  service UserService {
    rpc GetUser(GetUserRequest) returns (User);
    rpc CreateUser(CreateUserRequest) returns (User);
    rpc ListOrders(ListOrdersRequest) returns (stream Order);
  }`
      },

      apiDesign: {
        description: 'RESTful API design patterns',
        endpoints: [
          { method: 'GET', path: '/api/v1/users', params: 'limit, offset, sort, filter', response: '{ data: [...], pagination: {...} }' },
          { method: 'GET', path: '/api/v1/users/:id', params: '-', response: '{ data: user }' },
          { method: 'POST', path: '/api/v1/users', params: '{ name, email, ... }', response: '201 { data: user }' },
          { method: 'PUT', path: '/api/v1/users/:id', params: 'full user object', response: '{ data: user }' },
          { method: 'PATCH', path: '/api/v1/users/:id', params: 'partial updates', response: '{ data: user }' },
          { method: 'DELETE', path: '/api/v1/users/:id', params: '-', response: '204 No Content' }
        ]
      },

      comparisonCards: [
        {
          title: 'REST API 6 Core Principles',
          items: [
            { name: 'Client-Server', description: 'Separate UI concerns from data storage concerns. Client handles presentation, server handles data. Improves portability and scalability.' },
            { name: 'Stateless', description: 'Each request must contain all information needed for processing. No session state stored on server between requests.' },
            { name: 'Cacheable', description: 'Responses must be explicitly marked as cacheable or non-cacheable. Clients can reuse previously fetched responses to reduce load.' },
            { name: 'Layered System', description: 'Client cannot tell if it is connected directly to the server or through intermediary (proxy, LB). Each layer only knows about the immediate layer it interacts with.' },
            { name: 'Code-on-Demand (optional)', description: 'Servers can temporarily extend client functionality by transferring executable code (e.g., JavaScript). Enhances flexibility.' },
            { name: 'Uniform Interface', description: 'Consistent and standardized interface. Use nouns for resources, HTTP verbs for actions. Makes systems independent and easier to evolve.' }
          ]
        },
        {
          title: 'REST API URL Anatomy',
          items: [
            { name: 'Protocol', description: 'Always use HTTPS:// for API calls to ensure security and data privacy.' },
            { name: 'Sub-domain', description: 'Use clear naming conventions like api.example.com. Subdomains separate API endpoints from web frontend.' },
            { name: 'Versioning', description: 'Version your API (e.g., /v1/) to manage changes and maintain backward compatibility across releases.' },
            { name: 'Endpoint', description: 'Use nouns to represent resources (/users, /orders). Paths should be intuitive and follow RESTful principles.' },
            { name: 'Filtering & Pagination', description: 'Specify criteria to retrieve relevant subsets (?age=25&gender=male). Divide large data sets into pages (?page=2&limit=10).' },
            { name: 'HTTP Methods', description: 'GET (retrieve), POST (create), PUT (update/replace), PATCH (partial update), DELETE (remove). Use the right verb for each operation.' }
          ]
        },
        {
          title: 'Idempotency Use Cases',
          items: [
            { name: 'RESTful API Requests', description: 'Retrying an API request must not lead to multiple executions. PUT and DELETE are naturally idempotent. POST needs idempotency keys.' },
            { name: 'Payment Processing', description: 'Customers must not be charged multiple times due to retries. Payment gateways use idempotency keys to ensure exactly-once charges.' },
            { name: 'Order Management', description: 'Submitting an order multiple times must result in only one order placed. Prevents duplicate inventory deductions.' },
            { name: 'Database Operations', description: 'Reapplying a transaction must not change database state. Use SELECT before INSERT/UPDATE/DELETE with proper conditions.' },
            { name: 'User Account Management', description: 'Retrying a registration request must not create multiple accounts. Check existence before creation.' },
            { name: 'Distributed Messaging', description: 'Process the same message multiple times without side effects. Consumers must handle duplicate messages gracefully.' }
          ]
        }
      ],

      keyQuestions: [
        {
          question: 'REST vs GraphQL vs gRPC - when to use each?',
          answer: `**REST**:
- Resource-oriented (nouns, not verbs)
- HTTP verbs for operations (GET, POST, PUT, DELETE)
- Stateless, cacheable
- Best for: Public APIs, simple CRUD, browser clients

**GraphQL**:
- Query language for APIs
- Client specifies exactly what data it needs
- Single endpoint, flexible queries
- Best for: Mobile apps (bandwidth), complex data requirements, multiple clients with different needs

**gRPC**:
- Remote Procedure Call using Protocol Buffers
- Binary format (smaller, faster)
- Strong typing, code generation
- Bidirectional streaming
- Best for: Microservices communication, high-performance internal APIs

**Decision Matrix**:
| Scenario | Choice |
|----------|--------|
| Public API | REST (most familiar) |
| Mobile app | GraphQL (reduce over-fetching) |
| Microservices | gRPC (performance) |
| Real-time | gRPC streaming or WebSocket |
| Browser SPA | REST or GraphQL |
| Third-party integrations | REST (universal support) |`
        },
        {
          question: 'How do you handle API versioning?',
          answer: `**URL Versioning** (most common):
\`\`\`
GET /api/v1/users
GET /api/v2/users
\`\`\`
- Pros: Clear, cacheable, easy to test
- Cons: URL pollution, maintaining multiple versions

**Header Versioning**:
\`\`\`
GET /api/users
Accept: application/vnd.api+json;version=1
\`\`\`
- Pros: Clean URLs
- Cons: Hidden, harder to test

**Query Parameter**:
\`\`\`
GET /api/users?version=1
\`\`\`
- Pros: Simple
- Cons: Less RESTful, caching issues

**Best Practices**:
- Start with v1 (never v0)
- Support at least N-1 versions
- Deprecation timeline: 6-12 months notice
- Breaking changes = new version:
  - Removing fields
  - Changing field types
  - Changing semantics
- Non-breaking (add to existing version):
  - Adding optional fields
  - Adding new endpoints`
        },
        {
          question: 'How do you implement pagination?',
          answer: `**Offset-based Pagination**:
\`\`\`
GET /users?limit=20&offset=40  (page 3)

Response:
{
  "data": [...],
  "pagination": {
    "total": 1000,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
\`\`\`
- Pros: Jump to any page, simple
- Cons: Inconsistent if data changes, slow for large offsets

**Cursor-based Pagination** (recommended):
\`\`\`
GET /users?limit=20&cursor=abc123

Response:
{
  "data": [...],
  "pagination": {
    "nextCursor": "xyz789",
    "hasMore": true
  }
}
\`\`\`
- Cursor = encoded position (e.g., last seen ID)
- Pros: Consistent, efficient (no OFFSET)
- Cons: Can't jump to page N

**Keyset Pagination** (variant of cursor):
\`\`\`sql
WHERE created_at < '2024-01-01' AND id < 12345
ORDER BY created_at DESC, id DESC
LIMIT 20
\`\`\`

**Best practice**: Use cursor-based for infinite scroll, offset for admin dashboards`
        },
        {
          question: 'How do you design error responses?',
          answer: `**Consistent Error Format**:
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "req_abc123",
    "documentation": "https://api.example.com/docs/errors#VALIDATION_ERROR"
  }
}
\`\`\`

**HTTP Status Codes**:
- 200 OK: Success
- 201 Created: Resource created
- 204 No Content: Success, no body (DELETE)
- 400 Bad Request: Client error (validation)
- 401 Unauthorized: Missing/invalid auth
- 403 Forbidden: Authenticated but not allowed
- 404 Not Found: Resource doesn't exist
- 409 Conflict: Conflict with current state
- 422 Unprocessable: Semantic errors
- 429 Too Many Requests: Rate limited
- 500 Internal Server Error: Server bug
- 503 Service Unavailable: Overloaded/maintenance

**Best Practices**:
- Always include request ID for debugging
- Use machine-readable error codes
- Provide human-readable messages
- Link to documentation
- Don't expose internal errors to clients`
        },
        {
          question: 'How do you handle authentication in APIs?',
          answer: `**API Keys** (simplest):
\`\`\`
GET /api/users
X-API-Key: sk_live_abc123
\`\`\`
- Pros: Simple, good for server-to-server
- Cons: No user context, hard to rotate

**JWT (JSON Web Tokens)**:
\`\`\`
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

JWT Payload:
{
  "sub": "user_123",
  "exp": 1700000000,
  "roles": ["user", "admin"]
}
\`\`\`
- Pros: Stateless, contains user info
- Cons: Can't revoke until expiry

**OAuth 2.0** (for third-party access):
\`\`\`
1. User authorizes app
2. App receives authorization code
3. App exchanges code for access token
4. App uses access token for API calls
\`\`\`
- Pros: Delegated access, scopes
- Cons: Complex implementation

**Best Practices**:
- Use HTTPS always
- Short-lived tokens (15 min) + refresh tokens
- Include scopes/permissions in token
- Validate on every request
- Rate limit by API key/user`
        }
      ],

      basicImplementation: {
        title: 'Simple REST API',
        description: 'Client → REST API with CRUD operations (GET, POST, PUT, DELETE)',
        svgTemplate: 'restApi',
        problems: [
          'Over-fetching: Getting more data than needed',
          'Under-fetching: Multiple requests for related data',
          'No type safety',
          'Documentation can drift from implementation'
        ]
      },

      advancedImplementation: {
        title: 'API Gateway Architecture',
        description: 'API Gateway handling auth, rate limiting, SSL, and routing to internal gRPC microservices',
        svgTemplate: 'apiGateway',
        keyPoints: [
          'Gateway handles auth, rate limiting, logging',
          'Internal services use gRPC for performance',
          'External clients use REST for familiarity',
          'Gateway can aggregate multiple service calls',
          'Versioning handled at gateway level'
        ]
      },

      discussionPoints: [
        {
          topic: 'RESTful Best Practices',
          points: [
            'Use nouns for resources, not verbs (/users not /getUsers)',
            'Use HTTP methods correctly (GET safe, POST creates)',
            'Use plural nouns (/users not /user)',
            'Nest resources appropriately (/users/123/orders)',
            'Use query params for filtering, not path params'
          ]
        },
        {
          topic: 'API Security',
          points: [
            'Always use HTTPS',
            'Validate all input (never trust client)',
            'Implement rate limiting',
            'Use short-lived tokens',
            'Audit log sensitive operations',
            'Don\'t expose internal errors'
          ]
        },
        {
          topic: 'Documentation',
          points: [
            'OpenAPI/Swagger for REST APIs',
            'Generate docs from code (stays in sync)',
            'Include examples for every endpoint',
            'Document error responses',
            'Provide SDKs for popular languages'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-api-gateway', title: 'API Gateway Architecture (Eraser)', description: 'API Gateway with auth, rate limiting, routing to REST, GraphQL, and gRPC services', src: '/diagrams/api-design/eraser-api-gateway.png', type: 'cloud-architecture' },
        { id: 'idempotency', title: 'Idempotency Use Cases', description: '6 critical use cases: APIs, payments, orders, DB operations, user accounts, messaging', src: '/diagrams/api-design/idempotency.svg', type: 'architecture' }
      ],
      comparisonTables: [
        {
          id: 'rest-vs-graphql-vs-grpc',
          title: 'REST vs GraphQL vs gRPC',
          left: {
            title: 'REST',
            icon: 'globe',
            color: '#3b82f6',
            items: [
              { label: 'Format', value: 'JSON over HTTP' },
              { label: 'Schema', value: 'OpenAPI/Swagger (optional)' },
              { label: 'Strengths', value: 'Simple, cacheable, widely adopted' },
              { label: 'Weaknesses', value: 'Over/under-fetching, multiple round trips' },
              { label: 'Use When', value: 'Public APIs, CRUD operations, web apps' },
              { label: 'Examples', value: 'Stripe API, GitHub API, Twitter API' }
            ]
          },
          right: {
            title: 'gRPC',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Format', value: 'Protocol Buffers over HTTP/2' },
              { label: 'Schema', value: 'Strict .proto files (required)' },
              { label: 'Strengths', value: '10x faster, streaming, type-safe' },
              { label: 'Weaknesses', value: 'Not browser-friendly, harder debugging' },
              { label: 'Use When', value: 'Microservices, internal APIs, real-time' },
              { label: 'Examples', value: 'Google Cloud APIs, Netflix internal' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'http-status-codes',
          title: 'HTTP Status Code Cheat Sheet',
          color: '#3b82f6',
          icon: 'code',
          items: [
            { label: '200 OK', value: 'Successful request', bar: 95 },
            { label: '201 Created', value: 'Resource created (POST)', bar: 80 },
            { label: '204 No Content', value: 'Success, no body (DELETE)', bar: 60 },
            { label: '301 Moved Permanently', value: 'URL changed forever', bar: 40 },
            { label: '400 Bad Request', value: 'Invalid input', bar: 75 },
            { label: '401 Unauthorized', value: 'Not authenticated', bar: 70 },
            { label: '403 Forbidden', value: 'Authenticated but not allowed', bar: 65 },
            { label: '404 Not Found', value: 'Resource doesn\'t exist', bar: 85 },
            { label: '429 Too Many Requests', value: 'Rate limited', bar: 55 },
            { label: '500 Internal Server Error', value: 'Server bug', bar: 90 },
            { label: '503 Service Unavailable', value: 'Server overloaded/down', bar: 50 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'pagination', name: 'Pagination', icon: 'list', color: '#3b82f6',
          description: 'Return data in pages: offset-based or cursor-based.',
          useWhen: 'Any list endpoint returning more than ~50 items',
          example: '?cursor=abc123&limit=20 (cursor) or ?page=2&size=20 (offset)'
        },
        {
          id: 'rate-limit', name: 'Rate Limiting', icon: 'shield', color: '#ef4444',
          description: 'Restrict number of requests per time window.',
          useWhen: 'Public APIs, protect against abuse and DDoS',
          example: 'Token bucket: 100 req/min, return 429 + Retry-After header'
        },
        {
          id: 'versioning', name: 'API Versioning', icon: 'gitBranch', color: '#8b5cf6',
          description: 'Support multiple API versions simultaneously.',
          useWhen: 'Breaking changes needed without breaking existing clients',
          example: '/api/v2/users or Accept: application/vnd.api+json;v=2'
        },
        {
          id: 'idempotency', name: 'Idempotency', icon: 'check', color: '#10b981',
          description: 'Same request repeated = same result. Safe to retry.',
          useWhen: 'Payment processing, any non-GET mutation',
          example: 'Idempotency-Key header, store request hash + response'
        }
      ],
      edgeCases: [
        { scenario: 'Breaking API change deployed without versioning', impact: 'All existing clients break simultaneously, causing widespread outages for mobile apps that cannot be instantly updated', mitigation: 'Always version APIs (URL path or header), maintain backward compatibility for at least 2 versions, use deprecation headers and sunset dates' },
        { scenario: 'N+1 query problem in REST APIs', impact: 'Client fetches a list of resources then makes N additional requests for related data, causing extreme latency and server load', mitigation: 'Support field expansion (?include=author,comments), use GraphQL for flexible nested queries, or provide composite endpoints' },
        { scenario: 'Pagination cursor becomes invalid', impact: 'Cursor-based pagination breaks when underlying data is deleted or reordered, returning duplicate or missing results', mitigation: 'Use stable cursor encoding (opaque base64 of primary key), handle invalid cursors gracefully with 400 response, never expose raw offsets' },
        { scenario: 'Rate limiting applied inconsistently across regions', impact: 'Users behind different load balancers get different rate limit counts, allowing abuse by spreading requests across regions', mitigation: 'Use centralized rate limiting with Redis, sync counters across regions, or use API gateway with global rate limit state' },
        { scenario: 'Large payload causing timeout on mobile networks', impact: 'API returns megabytes of JSON data, causing timeouts on slow connections and excessive memory usage on mobile clients', mitigation: 'Implement pagination, field selection (?fields=id,name), compression (gzip/brotli), and streaming for large responses' },
      ],
      tradeoffs: [
        { decision: 'REST vs GraphQL', pros: 'REST is simple, cacheable, and widely understood; GraphQL eliminates over/under-fetching and gives clients query flexibility', cons: 'REST can over-fetch or require multiple round trips; GraphQL adds query parsing complexity, makes caching harder, and risks expensive queries', recommendation: 'REST for public APIs and simple CRUD; GraphQL for mobile apps and complex UIs needing flexible data fetching' },
        { decision: 'REST vs gRPC', pros: 'REST uses human-readable JSON and works in browsers; gRPC uses efficient Protobuf, supports streaming, and auto-generates typed clients', cons: 'REST has higher serialization overhead and no built-in streaming; gRPC requires HTTP/2 and is not browser-native without grpc-web', recommendation: 'REST for public-facing APIs; gRPC for internal microservice communication where performance and type safety matter' },
        { decision: 'URL versioning vs Header versioning', pros: 'URL versioning (/v1/) is simple and visible; header versioning (Accept: application/vnd.api+json;v=2) keeps URLs clean', cons: 'URL versioning clutters the URL space; header versioning is harder to discover and test', recommendation: 'URL versioning for public APIs due to simplicity; header versioning for internal APIs with sophisticated clients' },
      ],
      layeredDesign: [
        { name: 'API Gateway Layer', purpose: 'Single entry point for all API traffic handling cross-cutting concerns', components: ['Request Routing', 'Authentication/Authorization', 'Rate Limiting', 'Request/Response Transformation', 'SSL Termination'] },
        { name: 'Protocol Layer', purpose: 'Handle serialization, deserialization, and protocol-specific concerns', components: ['JSON/Protobuf Serializer', 'GraphQL Query Parser', 'gRPC Service Definition', 'Schema Validation'] },
        { name: 'Business Logic Layer', purpose: 'Execute domain-specific operations and enforce business rules', components: ['Request Handlers/Controllers', 'Domain Services', 'Input Validation', 'Authorization Rules'] },
        { name: 'Data Access Layer', purpose: 'Abstract database operations and manage data retrieval patterns', components: ['Repository Pattern', 'ORM/Query Builder', 'Pagination Engine', 'Field Selection/Projection'] },
      ]
    },
    {
      id: 'load-balancing',
      title: 'Load Balancing',
      icon: 'share',
      color: '#14b8a6',
      questions: 6,
      description: 'Distribute traffic across servers effectively.',
      concepts: ['Round Robin', 'Least Connections', 'IP Hash', 'Layer 4 vs Layer 7', 'Health checks', 'Session affinity'],
      tips: [
        'Layer 7 (application) for content-based routing',
        'Layer 4 (transport) for raw performance',
        'Use health checks to remove unhealthy servers',
        'Use Least Connections for variable-duration requests; Round Robin for uniform workloads',
        'Layer 4 (TCP) LBs are faster but Layer 7 (HTTP) LBs can route based on content, headers, and cookies',
        'Always enable health checks — a load balancer routing to a dead server is worse than no LB at all'
      ],

      introduction: `Load balancing distributes incoming traffic across multiple servers to ensure no single server becomes overwhelmed. It's the foundation of horizontal scaling and high availability.

Every major website uses load balancing. Google handles billions of requests by distributing them across thousands of servers. Understanding load balancing algorithms and configurations is essential for building scalable systems.`,

      functionalRequirements: [
        'Distribute traffic across healthy servers',
        'Support multiple distribution algorithms',
        'Detect and remove unhealthy servers',
        'Handle SSL/TLS termination',
        'Support session persistence when needed',
        'Enable zero-downtime deployments'
      ],

      nonFunctionalRequirements: [
        'Latency: < 1ms added overhead',
        'Throughput: Millions of connections/second',
        'Availability: 99.999% (no single point of failure)',
        'Failover: Automatic in < 5 seconds',
        'Scalability: Handle 10x traffic spikes',
        'Health checks: Detect failures within seconds'
      ],

      dataModel: {
        description: 'Load balancer configuration concepts',
        schema: `Load Balancer Configuration:
{
  frontend: {
    bind: "0.0.0.0:443",
    protocol: "HTTPS",
    ssl_certificate: "/path/to/cert.pem"
  },
  backend: {
    name: "app_servers",
    algorithm: "round_robin",
    servers: [
      { address: "10.0.0.1:8080", weight: 1 },
      { address: "10.0.0.2:8080", weight: 2 },
      { address: "10.0.0.3:8080", weight: 1 }
    ],
    health_check: {
      path: "/health",
      interval: "5s",
      timeout: "2s",
      unhealthy_threshold: 3
    }
  }
}

Server Pool State:
  server_1: { status: "healthy", connections: 45 }
  server_2: { status: "healthy", connections: 32 }
  server_3: { status: "unhealthy", last_check: "2024-01-01T12:00:00Z" }`
      },

      apiDesign: {
        description: 'Common load balancer operations',
        endpoints: [
          { method: 'GET', path: '/health', params: '-', response: '200 OK (health check endpoint)' },
          { method: 'GET', path: '/api/lb/status', params: '-', response: 'Server pool health status' },
          { method: 'POST', path: '/api/lb/servers', params: 'server address', response: 'Add server to pool' },
          { method: 'DELETE', path: '/api/lb/servers/:id', params: '-', response: 'Remove server from pool' },
          { method: 'PUT', path: '/api/lb/servers/:id/drain', params: '-', response: 'Drain connections before removal' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the main load balancing algorithms?',
          answer: `**Round Robin**:
- Rotate through servers in order
- Simple and fair
- Best when servers are equal capacity
- Problem: Ignores server load/capacity

**Weighted Round Robin**:
- Assign weights to servers (server1: 3, server2: 1)
- Faster servers get more requests
- Good for heterogeneous hardware

**Least Connections**:
- Route to server with fewest active connections
- Better for varying request times
- Best for long-lived connections (WebSocket)

**Least Response Time**:
- Consider both connections and response time
- Route to fastest responding server
- Requires continuous monitoring

**IP Hash**:
- Hash client IP to determine server
- Same client always goes to same server
- Natural session affinity
- Problem: Uneven distribution possible

**Consistent Hashing**:
- Hash both servers and requests to ring
- Minimal redistribution when servers change
- Used by CDNs, distributed caches

**Random**:
- Simple, surprisingly effective
- No state to maintain
- Good enough for many use cases`
        },
        {
          question: 'What is the difference between Layer 4 and Layer 7 load balancing?',
          answer: `**Layer 4 (Transport Layer)**:
\`\`\`
Client ──TCP/UDP──▶ Load Balancer ──TCP/UDP──▶ Server

Makes decision based on:
- Source/destination IP
- Source/destination port
- Protocol (TCP/UDP)
\`\`\`
- Faster: Just forwards packets
- Simpler: No application awareness
- Can't route based on content
- Examples: AWS NLB, HAProxy TCP mode

**Layer 7 (Application Layer)**:
\`\`\`
Client ──HTTP──▶ Load Balancer ──HTTP──▶ Server

Makes decision based on:
- URL path (/api vs /static)
- HTTP headers (Host, User-Agent)
- Cookies
- Request content
\`\`\`
- Content-based routing: /api → API servers
- SSL termination: Decrypt at LB
- Header manipulation: Add X-Forwarded-For
- Caching: Cache responses
- Examples: AWS ALB, NGINX, HAProxy HTTP mode

**When to use each**:
| Use Case | Layer |
|----------|-------|
| Simple TCP pass-through | L4 |
| High-performance | L4 |
| Content-based routing | L7 |
| SSL termination | L7 |
| Header inspection | L7 |
| WebSocket | Either (L7 for routing) |`
        },
        {
          question: 'How do health checks work?',
          answer: `**Active Health Checks**:
Load balancer periodically probes servers.

\`\`\`
Load Balancer                    Server
     │                              │
     │──GET /health────────────────▶│
     │◀─────────────200 OK──────────│
     │                              │
     │──GET /health────────────────▶│
     │◀─────────────500 Error───────│
     │                              │
     │ (Mark unhealthy after 3 fails)
     │──GET /health────────────────▶│
     │◀─────────────200 OK──────────│
     │ (Mark healthy after 2 passes)
\`\`\`

**Health Check Parameters**:
- Interval: How often to check (5-30 seconds)
- Timeout: How long to wait for response (2-10 seconds)
- Unhealthy threshold: Failures before marking down (2-5)
- Healthy threshold: Passes before marking up (2-3)

**Types of Health Checks**:
- **TCP**: Can establish connection?
- **HTTP**: Returns 2xx/3xx status?
- **HTTPS**: Valid SSL + HTTP check
- **Custom**: Application-specific logic

**Deep Health Checks**:
\`\`\`python
@app.route('/health')
def health():
    # Check database
    if not db.ping():
        return "DB down", 503

    # Check cache
    if not cache.ping():
        return "Cache down", 503

    # Check dependencies
    if not check_dependencies():
        return "Dependency down", 503

    return "OK", 200
\`\`\`

**Passive Health Checks**:
Monitor real traffic for failures.
- Track error rates per server
- Mark unhealthy if errors exceed threshold
- Faster detection than active checks`
        },
        {
          question: 'How do you handle session persistence (sticky sessions)?',
          answer: `**The Problem**:
- User logs in on Server A
- Next request goes to Server B
- Server B doesn't have session = user logged out!

**Solutions**:

1. **Sticky Sessions (Session Affinity)**:
\`\`\`
Load balancer routes same user to same server

Methods:
- Cookie-based: LB adds cookie with server ID
- IP-based: Hash client IP
- Header-based: Use session ID in header
\`\`\`
- Pros: Simple, works with stateful apps
- Cons: Uneven load, server failure loses sessions

2. **Session Replication**:
\`\`\`
Server A ←──sync──→ Server B
        ←──sync──→ Server C

All servers have all sessions
\`\`\`
- Pros: Any server can handle any request
- Cons: Sync overhead, consistency issues

3. **Centralized Session Store** (recommended):
\`\`\`
Server A ──┐
Server B ──┼──▶ Redis (sessions)
Server C ──┘
\`\`\`
- Pros: Stateless servers, easy scaling
- Cons: Redis dependency, network latency

4. **Stateless Sessions (JWT)**:
\`\`\`
Session data encoded in token
Sent with every request
No server-side storage
\`\`\`
- Pros: Truly stateless, no shared storage
- Cons: Token size, can't revoke easily

**Recommendation**: Use centralized store (Redis) or JWT`
        },
        {
          question: 'How do you achieve high availability for the load balancer itself?',
          answer: `**The Problem**: Load balancer is a single point of failure!

**Solution: Active-Passive (VRRP)**:
\`\`\`
┌─────────────────────────────────────┐
│         Virtual IP: 10.0.0.100      │
│              (Floating)             │
└─────────────────┬───────────────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
┌────▼────┐               ┌────▼────┐
│ Active  │  Heartbeat    │ Passive │
│   LB    │◀─────────────▶│   LB    │
│10.0.0.1 │               │10.0.0.2 │
└─────────┘               └─────────┘

- Active handles all traffic
- Passive monitors via heartbeat
- If Active fails, Passive takes VIP
- Failover in < 5 seconds
\`\`\`

**Solution: Active-Active**:
\`\`\`
                DNS Round Robin
┌───────────────────┴───────────────────┐
│                                       │
▼                                       ▼
┌─────────┐                       ┌─────────┐
│   LB 1  │                       │   LB 2  │
│ Active  │                       │ Active  │
└────┬────┘                       └────┬────┘
     │                                 │
     └─────────────┬───────────────────┘
                   ▼
           ┌─────────────┐
           │   Servers   │
           └─────────────┘

- Both LBs handle traffic
- DNS distributes across LBs
- Better utilization
- Requires shared state for sessions
\`\`\`

**Cloud Solutions**:
- AWS: ALB/NLB are inherently HA (multi-AZ)
- GCP: Cloud Load Balancing (global)
- Azure: Load Balancer with availability zones`
        }
      ],

      basicImplementation: {
        title: 'Single Load Balancer',
        description: 'Basic load balancing with NGINX distributing traffic across multiple backend servers using round-robin.',
        svgTemplate: 'loadBalancer',
        problems: [
          'Load balancer is single point of failure',
          'No automatic failover',
          'Manual server management',
          'Limited monitoring'
        ]
      },

      advancedImplementation: {
        title: 'Global Load Balancing Architecture',
        description: 'GeoDNS routing users to nearest region, with regional HA load balancers and server pools',
        svgTemplate: 'globalLoadBalancer',
        keyPoints: [
          'GeoDNS routes users to nearest region',
          'Each region has redundant load balancers',
          'Automatic failover at every tier',
          'Can handle regional outages gracefully',
          'Central monitoring for all regions'
        ]
      },

      discussionPoints: [
        {
          topic: 'Algorithm Selection',
          points: [
            'Round Robin: Default for equal servers',
            'Least Connections: Long-running requests',
            'IP Hash: Need session affinity without cookies',
            'Weighted: Mixed server capacities',
            'Random: Simple, often good enough'
          ]
        },
        {
          topic: 'Common Load Balancer Options',
          points: [
            'NGINX: Versatile, widely used, good performance',
            'HAProxy: High performance, feature-rich',
            'AWS ALB/NLB: Managed, integrates with AWS',
            'Envoy: Modern, observability-focused',
            'Traefik: Container-native, auto-discovery'
          ]
        },
        {
          topic: 'Production Considerations',
          points: [
            'Connection draining before removing servers',
            'Graceful degradation under load',
            'SSL certificate management',
            'Logging and metrics collection',
            'Rate limiting at the load balancer'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-lb', title: 'Load Balancing Architecture (Eraser)', description: 'DNS-based global routing, L7 ALB, auto-scaling groups, health checks, and SSL termination', src: '/diagrams/load-balancing/eraser-lb-architecture.png', type: 'cloud-architecture' },
        { id: 'lb-algorithms', title: 'Load Balancing Algorithms', description: '6 algorithms: Round Robin, Sticky RR, Weighted RR, IP Hash, Least Connections, Least Time', src: '/diagrams/load-balancing/lb-algorithms.svg', type: 'architecture' }
      ],
      comparisonTables: [
        {
          id: 'l4-vs-l7',
          title: 'L4 vs L7 Load Balancing',
          left: {
            title: 'Layer 4 (Transport)',
            icon: 'layers',
            color: '#f59e0b',
            items: [
              { label: 'Level', value: 'TCP/UDP — routes by IP and port' },
              { label: 'Speed', value: 'Very fast — no payload inspection' },
              { label: 'Intelligence', value: 'Low — can\'t read HTTP headers/URL' },
              { label: 'SSL', value: 'Passes through (or TCP termination)' },
              { label: 'Use When', value: 'Raw speed, non-HTTP protocols, gaming' },
              { label: 'Examples', value: 'AWS NLB, HAProxy TCP mode' }
            ]
          },
          right: {
            title: 'Layer 7 (Application)',
            icon: 'globe',
            color: '#3b82f6',
            items: [
              { label: 'Level', value: 'HTTP — routes by URL, headers, cookies' },
              { label: 'Speed', value: 'Slower — inspects request content' },
              { label: 'Intelligence', value: 'High — content-based routing' },
              { label: 'SSL', value: 'Terminates SSL, can modify headers' },
              { label: 'Use When', value: 'Web apps, A/B testing, canary deploys' },
              { label: 'Examples', value: 'AWS ALB, Nginx, Envoy' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'lb-algorithms',
          title: 'Load Balancing Algorithms',
          color: '#f59e0b',
          icon: 'layers',
          items: [
            { label: 'Round Robin', value: 'Sequential rotation — simplest', bar: 30 },
            { label: 'Weighted Round Robin', value: 'Proportional to server capacity', bar: 45 },
            { label: 'Least Connections', value: 'Route to least busy server', bar: 65 },
            { label: 'Least Response Time', value: 'Route to fastest server', bar: 75 },
            { label: 'IP Hash', value: 'Sticky sessions by client IP', bar: 50 },
            { label: 'Consistent Hashing', value: 'Minimal redistribution on change', bar: 85 },
            { label: 'Random', value: 'Random selection — surprisingly effective', bar: 25 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'health-checks', name: 'Health Checks', icon: 'heart', color: '#ef4444',
          description: 'Periodically probe backends to remove unhealthy servers.',
          useWhen: 'Always — essential for any load balancer',
          example: 'HTTP GET /health every 10s, remove after 3 failures'
        },
        {
          id: 'sticky-sessions', name: 'Sticky Sessions', icon: 'lock', color: '#f59e0b',
          description: 'Route same client to same server (session affinity).',
          useWhen: 'Stateful apps, WebSocket connections, file uploads',
          example: 'Cookie-based affinity, IP hash in Nginx'
        },
        {
          id: 'global-lb', name: 'Global Load Balancing', icon: 'globe', color: '#3b82f6',
          description: 'DNS-based routing to nearest regional data center.',
          useWhen: 'Multi-region deployments, disaster recovery',
          example: 'AWS Route 53 latency routing, Cloudflare Load Balancing'
        },
        {
          id: 'circuit-breaker-lb', name: 'Circuit Breaker', icon: 'shield', color: '#8b5cf6',
          description: 'Stop routing to failing backends, try again after timeout.',
          useWhen: 'Prevent cascade failures when a backend is degraded',
          example: 'Envoy outlier detection, Istio circuit breaking'
        }
      ],
      comparisonCards: [
        {
          title: 'Load Balancer Use Cases',
          items: [
            { name: 'Traffic Distribution', description: 'Evenly distribute incoming traffic among multiple servers, preventing any single server from being overwhelmed. Maintains optimal performance and scalability.' },
            { name: 'High Availability', description: 'Reroute traffic away from failed or unhealthy servers to healthy ones automatically. Ensures uninterrupted service even during server failures.' },
            { name: 'SSL Termination', description: 'Offload SSL/TLS encryption and decryption from backend servers, reducing their CPU workload and improving overall throughput.' },
            { name: 'Session Persistence', description: 'Ensure a user\'s requests are consistently routed to the same backend server (sticky sessions). Critical for stateful applications.' },
            { name: 'Scalability', description: 'Seamlessly add or remove servers behind the load balancer. New instances register automatically and start receiving traffic.' },
            { name: 'Health Monitoring', description: 'Continuously monitor backend server health via heartbeats. Automatically remove unhealthy servers and add them back when recovered.' }
          ]
        },
        {
          title: 'Load Balancing Algorithms',
          items: [
            { name: 'Round Robin (Static)', description: 'Routes requests to servers in sequential order. Simple and effective when all servers have equal capacity. Services should be stateless.' },
            { name: 'Sticky Round Robin (Static)', description: 'Improvement on round robin — once a user hits server A, all subsequent requests go to A. Useful for stateful sessions.' },
            { name: 'Weighted Round Robin (Static)', description: 'Admin assigns weights to each server. Higher weight = more requests. Useful when servers have different capacities (e.g., 0.8, 0.1, 0.1).' },
            { name: 'IP/URL Hash (Static)', description: 'Applies a hash function to the request IP or URL. Requests with same hash always route to the same server. Good for cache locality.' },
            { name: 'Least Connections (Dynamic)', description: 'Routes to the server with the fewest active connections. Best when request processing times vary significantly.' },
            { name: 'Least Response Time (Dynamic)', description: 'Routes to the server with the lowest current response time. Accounts for both load AND server performance.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Health check passes but service is degraded', impact: 'Load balancer routes traffic to a server returning 200 on /health but responding to real requests in 10+ seconds, causing user-facing timeouts', mitigation: 'Implement deep health checks that test downstream dependencies, use latency-based health scoring, and remove servers with high p99 latency' },
        { scenario: 'Thundering herd after backend recovery', impact: 'All queued requests flood a recovered server simultaneously, causing it to crash again in a restart loop', mitigation: 'Use slow-start / warm-up mode that gradually increases traffic to recovered instances, implement connection draining' },
        { scenario: 'Sticky sessions with server failure', impact: 'Server holding session state crashes, user loses session and must re-authenticate or loses in-progress work', mitigation: 'Store session state externally (Redis), use cookie-based session encoding (JWT), or replicate session data across servers' },
        { scenario: 'Uneven load distribution with long-lived connections', impact: 'WebSocket or gRPC streaming connections stick to original servers, new servers added via auto-scaling receive no traffic', mitigation: 'Use connection-aware load balancing (least connections), implement periodic connection rebalancing, set maximum connection lifetime' },
        { scenario: 'Single load balancer becomes a bottleneck', impact: 'All traffic funnels through one load balancer, which becomes the system throughput ceiling and single point of failure', mitigation: 'Deploy active-passive or active-active load balancer pairs, use DNS-based load balancing as the first tier, leverage cloud-native LB (ALB/NLB)' },
      ],
      tradeoffs: [
        { decision: 'Layer 4 vs Layer 7 load balancing', pros: 'L4 is faster with less overhead (operates on TCP); L7 enables content-based routing, SSL termination, and HTTP header inspection', cons: 'L4 cannot inspect HTTP content or route by URL/header; L7 adds latency from full HTTP parsing', recommendation: 'L7 for most web applications; L4 for raw TCP performance needs like gaming or database proxying' },
        { decision: 'Hardware vs Software load balancer', pros: 'Hardware (F5) provides predictable performance with dedicated ASICs; software (Nginx, HAProxy, Envoy) is flexible, cheap, and cloud-native', cons: 'Hardware is expensive and hard to scale; software has slightly lower raw throughput per instance', recommendation: 'Software load balancers for nearly all modern applications; hardware only for extreme throughput edge cases' },
        { decision: 'Client-side vs Server-side load balancing', pros: 'Client-side (gRPC, Ribbon) eliminates the LB hop latency; server-side (ALB, Nginx) centralizes routing logic', cons: 'Client-side requires every client to implement LB logic and service discovery; server-side adds a network hop', recommendation: 'Server-side for external traffic; client-side for internal service-to-service calls in a service mesh' },
      ],
      layeredDesign: [
        { name: 'Global / DNS Layer', purpose: 'Route users to the nearest regional data center using DNS-based load balancing', components: ['GeoDNS (Route 53)', 'Anycast', 'Multi-Region Failover', 'Health-Based DNS Routing'] },
        { name: 'Edge / L4 Layer', purpose: 'Handle TCP-level traffic distribution with minimal latency overhead', components: ['Network Load Balancer (NLB)', 'TCP Connection Routing', 'TLS Passthrough', 'DDoS Protection'] },
        { name: 'Application / L7 Layer', purpose: 'Route HTTP requests based on content, headers, and URL patterns', components: ['Application Load Balancer (ALB)', 'URL-Based Routing', 'SSL Termination', 'Header Inspection', 'WebSocket Support'] },
        { name: 'Service Mesh Layer', purpose: 'Handle service-to-service load balancing within the cluster', components: ['Envoy Sidecar Proxy', 'Client-Side LB (gRPC)', 'Service Discovery', 'Circuit Breaking'] },
      ]
    },
    {
      id: 'rate-limiting',
      title: 'Rate Limiting',
      icon: 'shield',
      color: '#f43f5e',
      questions: 5,
      description: 'Protect services from abuse and overload.',
      concepts: ['Token bucket', 'Leaky bucket', 'Fixed window', 'Sliding window', 'Distributed rate limiting'],
      tips: [
        'Token bucket allows burst while maintaining average rate',
        'Sliding window is most accurate but memory-intensive',
        'Use Redis for distributed rate limiting across servers'
      ],

      introduction: `A rate limiter controls the number of requests a user or system can perform within a specific time frame. Think of it as a bouncer managing entry flow to maintain system stability.

Rate limiters are critical for: preventing API abuse, mitigating DDoS attacks, ensuring fair resource usage, and controlling costs in usage-based billing. Companies like Stripe, GitHub, and Twitter rely heavily on rate limiting.`,

      functionalRequirements: [
        'Limit requests per user/IP/API key',
        'Support multiple tiers (free, pro, enterprise)',
        'Configure limits per endpoint or globally',
        'Return remaining quota and reset time',
        'Allow burst traffic within limits',
        'Dynamic rule updates without restart'
      ],

      nonFunctionalRequirements: [
        'Sub-millisecond latency (<1ms cached)',
        'Handle 1M+ rate limit checks per second',
        'Distributed consistency across servers',
        'Graceful degradation when Redis unavailable',
        '99.99% availability'
      ],

      dataModel: {
        description: 'Rate limit rules and token bucket state in Redis',
        schema: `rate_limit_rules {
  id: uuid PK
  key_pattern: varchar -- user:{userId}, ip:{ip}
  limit: int
  window_seconds: int
  algorithm: enum(TOKEN_BUCKET, SLIDING_WINDOW)
}

token_buckets (Redis) {
  key: string -- "bucket:user:123"
  tokens: float
  last_refill: timestamp
  ttl: seconds
}`
      },

      apiDesign: {
        description: 'Rate limiting check endpoints',
        endpoints: [
          { method: 'GET', path: '/api/ratelimit/check', params: 'key, cost=1', response: '{ allowed, remaining, resetAt }' },
          { method: 'GET', path: '/api/ratelimit/status/:key', params: '-', response: '{ currentUsage, limit, resetAt }' }
        ]
      },

      keyQuestions: [
        {
          question: 'Which algorithm should we use?',
          answer: `**Token Bucket** (Most common):
- Tokens refill at steady rate into bucket
- Allows bursts up to bucket capacity
- Used by Stripe, AWS

**Sliding Window Log**:
- Track timestamp of each request
- Most accurate but memory intensive

**Fixed Window Counter**:
- Simple but has boundary burst problem
- User sends 100 req at 0:59 + 100 at 1:00

**Leaky Bucket**:
- Smooths traffic to constant rate
- Good for streaming/consistent throughput`
        },
        {
          question: 'How do we implement distributed rate limiting?',
          answer: `**Centralized Redis** (Recommended):
- All servers check Redis
- Use Lua scripts for atomic check-and-decrement:
\`\`\`lua
local tokens = redis.call('GET', key) or bucket_size
if tokens >= cost then
  redis.call('DECRBY', key, cost)
  return {1, tokens - cost}
end
return {0, tokens}
\`\`\`

**Local Cache + Sync**:
- Each server has local counter
- Periodically sync to Redis
- Less accurate but faster`
        },
        {
          question: 'What happens when Redis is down?',
          answer: `**Fail Open**: Allow requests (risk overload)
**Fail Closed**: Deny all (frustrate users)

**Hybrid** (Recommended):
- Fall back to local rate limiting
- Each server has approximate limit
- Degraded accuracy, maintained protection`
        }
      ],

      basicImplementation: {
        title: 'Basic Rate Limiter',
        description: 'Single Redis instance with Lua scripts for token bucket implementation',
        svgTemplate: 'rateLimiter',
        problems: ['Single point of failure', 'No failover']
      },

      advancedImplementation: {
        title: 'Production Architecture',
        description: 'CDN Edge → API Gateway → Redis Cluster for distributed rate limiting',
        svgTemplate: 'rateLimiterAdvanced',
        keyPoints: [
          'Edge rate limiting at CDN for DDoS protection',
          'Redis Cluster with automatic failover',
          'Local cache for hot keys (<1ms latency)',
          'Lua scripts for atomic operations'
        ]
      },

      discussionPoints: [
        {
          topic: 'Algorithm Trade-offs',
          points: [
            'Token bucket: Best for APIs allowing bursts',
            'Sliding window: Most accurate, higher memory',
            'Fixed window: Simplest, boundary burst problem',
            'Leaky bucket: Smooths traffic, adds latency'
          ]
        },
        {
          topic: 'Multi-tier Rate Limiting',
          points: [
            'Edge/CDN: Coarse limits for DDoS (10K/min per IP)',
            'API Gateway: User-level limits (1000/min for Pro)',
            'Service-level: Endpoint-specific limits'
          ]
        }
      ],
      comparisonCards: [
        {
          title: 'Rate Limiting Algorithms',
          items: [
            { name: 'Token Bucket', description: 'Bucket holds tokens refilled at fixed rate. Each request consumes a token. Allows bursts up to bucket capacity. Used by: AWS API Gateway, Stripe.' },
            { name: 'Leaky Bucket', description: 'Requests enter a queue (bucket) and are processed at a fixed rate. Overflow requests are dropped. Smooths out bursts into steady output.' },
            { name: 'Fixed Window Counter', description: 'Count requests in fixed time windows (e.g., 100 req/min). Simple but allows burst at window boundaries (up to 2x limit).' },
            { name: 'Sliding Window Log', description: 'Track timestamp of each request in a sorted log. Count requests in the sliding window. Accurate but memory-intensive for high traffic.' },
            { name: 'Sliding Window Counter', description: 'Hybrid of fixed window and sliding log. Weighted average of current and previous window counts. Good balance of accuracy and memory.' }
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-rate-limiter', title: 'Rate Limiting Architecture (Eraser)', description: 'Distributed rate limiting with Redis, token bucket algorithm, per-user and per-IP counters', src: '/diagrams/rate-limiting/eraser-rate-limiter.png', type: 'cloud-architecture' },
        { id: 'rate-limit-algorithms', title: 'Rate Limiting Algorithms', description: 'Token Bucket, Leaky Bucket, Fixed Window, Sliding Window Log, and Sliding Window Counter', src: '/diagrams/rate-limiting/rate-limit-algorithms.svg', type: 'architecture' }
      ],
      comparisonTables: [
        {
          id: 'token-bucket-vs-sliding-window',
          title: 'Token Bucket vs Sliding Window',
          left: {
            title: 'Token Bucket',
            icon: 'zap',
            color: '#f59e0b',
            items: [
              { label: 'Concept', value: 'Tokens added at fixed rate, consumed per request' },
              { label: 'Burst', value: 'Allows bursts up to bucket capacity' },
              { label: 'Memory', value: 'O(1) — just counter + timestamp' },
              { label: 'Precision', value: 'Approximate — allows brief overages' },
              { label: 'Use When', value: 'APIs needing burst tolerance' },
              { label: 'Examples', value: 'AWS API Gateway, Stripe' }
            ]
          },
          right: {
            title: 'Sliding Window Log',
            icon: 'clock',
            color: '#3b82f6',
            items: [
              { label: 'Concept', value: 'Track timestamps of all requests in window' },
              { label: 'Burst', value: 'Strict — no bursts allowed' },
              { label: 'Memory', value: 'O(n) — stores each request timestamp' },
              { label: 'Precision', value: 'Exact — precise rate enforcement' },
              { label: 'Use When', value: 'Strict rate enforcement needed' },
              { label: 'Examples', value: 'Financial APIs, compliance' }
            ]
          }
        },
        {
          id: 'token-bucket-vs-sliding-window',
          title: 'Token Bucket vs Sliding Window',
          left: {
            title: 'Token Bucket',
            icon: 'database',
            color: '#f59e0b',
            items: [
              { label: 'Mechanism', value: 'Bucket fills with tokens at fixed rate' },
              { label: 'Burst', value: 'Allows bursts up to bucket capacity' },
              { label: 'Memory', value: 'O(1) — just counter + timestamp' },
              { label: 'Accuracy', value: 'Approximate — allows slight over-limit' },
              { label: 'Use When', value: 'API rate limiting, network traffic shaping' },
              { label: 'Examples', value: 'AWS API Gateway, Stripe API' }
            ]
          },
          right: {
            title: 'Sliding Window Log',
            icon: 'clock',
            color: '#3b82f6',
            items: [
              { label: 'Mechanism', value: 'Track timestamps of all requests in window' },
              { label: 'Burst', value: 'No bursts — strict per-window limit' },
              { label: 'Memory', value: 'O(n) — stores each request timestamp' },
              { label: 'Accuracy', value: 'Exact — precise rate enforcement' },
              { label: 'Use When', value: 'Strict compliance, financial APIs' },
              { label: 'Examples', value: 'Custom implementations, Redis sorted sets' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'rate-limit-algorithms',
          title: 'Rate Limiting Algorithm Comparison',
          color: '#f59e0b',
          icon: 'shield',
          items: [
            { label: 'Token Bucket', value: 'Smooth + burst handling', bar: 85 },
            { label: 'Leaky Bucket', value: 'Smooth, constant output rate', bar: 70 },
            { label: 'Fixed Window Counter', value: 'Simple but edge-case spikes', bar: 50 },
            { label: 'Sliding Window Log', value: 'Precise but memory-heavy', bar: 75 },
            { label: 'Sliding Window Counter', value: 'Best balance: precise + efficient', bar: 90 }
          ]
        },
        {
          id: 'rate-limit-tiers',
          title: 'Common Rate Limit Tiers',
          color: '#f59e0b',
          icon: 'shield',
          items: [
            { label: 'Free tier', value: '60 req/min', bar: 10 },
            { label: 'Basic tier', value: '600 req/min', bar: 25 },
            { label: 'Pro tier', value: '6,000 req/min', bar: 50 },
            { label: 'Enterprise tier', value: '60,000 req/min', bar: 80 },
            { label: 'Internal service', value: '600,000 req/min', bar: 95 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'distributed-rl', name: 'Distributed Rate Limiting', icon: 'globe', color: '#3b82f6',
          description: 'Coordinate rate limits across multiple servers using shared storage.',
          useWhen: 'Load-balanced APIs, microservices at scale',
          example: 'Redis INCR + EXPIRE for atomic counter, Lua scripts for precision'
        },
        {
          id: 'tiered-limits', name: 'Tiered Rate Limits', icon: 'layers', color: '#10b981',
          description: 'Different limits for different user tiers or API endpoints.',
          useWhen: 'Freemium APIs, different SLA levels',
          example: 'Free: 100/hr, Pro: 1000/hr, Enterprise: 10000/hr'
        },
        {
          id: 'adaptive-rl', name: 'Adaptive Rate Limiting', icon: 'trendingUp', color: '#8b5cf6',
          description: 'Dynamically adjust limits based on system health and load.',
          useWhen: 'Protect system during traffic spikes or degradation',
          example: 'Reduce limits when p99 latency exceeds threshold'
        },
        {
          id: 'token-bucket', name: 'Token Bucket', icon: 'database', color: '#f59e0b',
          description: 'Tokens added at fixed rate. Each request consumes a token.',
          useWhen: 'Allow bursts while maintaining average rate',
          example: 'Refill 10 tokens/sec, bucket size 100. Burst of 100, then 10/sec steady'
        },
        {
          id: 'leaky-bucket', name: 'Leaky Bucket', icon: 'filter', color: '#3b82f6',
          description: 'Requests queue up and process at fixed rate. Overflow rejected.',
          useWhen: 'Smooth output rate, prevent spiky traffic to backends',
          example: 'Process 100 req/sec regardless of input rate'
        },
        {
          id: 'sliding-window', name: 'Sliding Window Counter', icon: 'clock', color: '#8b5cf6',
          description: 'Hybrid of fixed window + sliding log. Weighted count across windows.',
          useWhen: 'Good balance of accuracy and memory efficiency',
          example: 'Redis INCR + EXPIRE per window, weighted overlap calculation'
        },
        {
          id: 'distributed-rate-limit', name: 'Distributed Rate Limiting', icon: 'globe', color: '#10b981',
          description: 'Centralized counter (Redis) shared across all app servers.',
          useWhen: 'Multi-server deployments, consistent limits per user',
          example: 'Redis INCR with TTL, or token bucket in Redis Lua script'
        }
      ],
      edgeCases: [
        { scenario: 'Clock drift between rate limiter nodes', impact: 'Fixed window counters reset at different times across servers, allowing users to exceed limits by hitting different servers', mitigation: 'Use sliding window counters, synchronize clocks with NTP, or centralize rate limiting in Redis with atomic Lua scripts' },
        { scenario: 'Race condition in distributed counter', impact: 'Multiple requests read the same counter value before any increment, allowing burst of requests to exceed the limit', mitigation: 'Use Redis INCR (atomic), Lua scripts for check-and-increment, or use token bucket algorithm which is naturally atomic' },
        { scenario: 'Legitimate traffic spike blocked during product launch', impact: 'A successful marketing campaign or viral event causes legitimate users to hit rate limits, degrading their experience', mitigation: 'Implement adaptive rate limiting that raises limits based on system health, use tiered limits per user plan, pre-provision capacity for known events' },
        { scenario: 'Rate limiter itself becomes a bottleneck', impact: 'Every request requires a Redis round-trip for rate check, adding latency and creating a single point of failure', mitigation: 'Use local in-memory rate limiting as first pass, batch Redis updates, implement circuit breaker that allows traffic if rate limiter is down' },
      ],
      tradeoffs: [
        { decision: 'Token bucket vs Sliding window', pros: 'Token bucket allows controlled bursts while maintaining average rate; sliding window provides more precise per-second accuracy', cons: 'Token bucket can allow short bursts that overwhelm backends; sliding window uses more memory to track individual requests', recommendation: 'Token bucket for APIs where bursts are acceptable; sliding window for strict per-second rate enforcement' },
        { decision: 'Local vs Centralized (Redis) rate limiting', pros: 'Local is zero-latency and has no external dependency; centralized ensures consistent global limits across all servers', cons: 'Local allows N x limit (where N = server count) in aggregate; centralized adds Redis latency and failure risk', recommendation: 'Combine both: local rate limiter as first defense, centralized Redis for authoritative global limit' },
        { decision: 'Hard rate limit vs Soft rate limit with backpressure', pros: 'Hard limits (429 rejection) are simple and protective; soft limits (queue/slow down) preserve user experience', cons: 'Hard limits can reject legitimate traffic; soft limits can mask real overload if not bounded', recommendation: 'Hard limits for abuse prevention; soft limits (exponential backoff, queue) for legitimate traffic management' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Implement client-side rate limiting to reduce unnecessary requests', components: ['Retry with Exponential Backoff', 'Client-Side Throttling', 'Respect Retry-After Headers'] },
        { name: 'Edge / Gateway Layer', purpose: 'Apply coarse-grained rate limits at the entry point before requests reach application servers', components: ['API Gateway Rate Limiter', 'IP-Based Throttling', 'DDoS Protection (Cloudflare, AWS Shield)'] },
        { name: 'Application Layer', purpose: 'Enforce fine-grained per-user or per-endpoint rate limits', components: ['Token Bucket / Sliding Window', 'User/API Key Identification', 'Rate Limit Headers (X-RateLimit-Remaining)'] },
        { name: 'Distributed State Layer', purpose: 'Maintain consistent rate limit counters across all application instances', components: ['Redis Atomic Counters', 'Lua Script Rate Limiter', 'Rate Limit Synchronization'] },
      ]
    },
    {
      id: 'microservices',
      title: 'Microservices',
      icon: 'layers',
      color: '#8b5cf6',
      questions: 10,
      description: 'Service decomposition, communication, and orchestration.',
      concepts: ['Service boundaries', 'API Gateway', 'Service discovery', 'Circuit breaker', 'Saga pattern', 'Event sourcing'],
      tips: [
        'Start monolith, extract services when boundaries are clear',
        'Use API gateway for auth, rate limiting, routing',
        'Circuit breaker prevents cascade failures'
      ],

      introduction: `Microservices architecture structures an application as a collection of loosely coupled, independently deployable services. Each service owns its data and can be developed, deployed, and scaled independently.

Netflix has 700+ microservices, Amazon has thousands. While powerful, microservices add complexity—you're trading one type of problem (monolith scaling) for another (distributed systems). Understanding when and how to use them is crucial.`,

      functionalRequirements: [
        'Independent deployment of services',
        'Service-to-service communication',
        'Service discovery and registration',
        'Load balancing across instances',
        'Fault tolerance and resilience',
        'Distributed tracing and monitoring'
      ],

      nonFunctionalRequirements: [
        'Latency: < 50ms added for service hops',
        'Availability: 99.99% per service',
        'Scalability: Independent scaling per service',
        'Isolation: Service failure doesn\'t cascade',
        'Deployment: Zero-downtime deployments',
        'Recovery: < 30 second restart time'
      ],

      dataModel: {
        description: 'Microservices architecture components',
        schema: `Service Definition:
{
  name: "order-service",
  version: "2.3.1",
  endpoints: [
    { path: "/orders", methods: ["GET", "POST"] },
    { path: "/orders/:id", methods: ["GET", "PUT"] }
  ],
  dependencies: ["user-service", "inventory-service"],
  database: "orders_db",
  instances: 5,
  resources: { cpu: "0.5", memory: "512Mi" }
}

Service Registry (Consul/Eureka):
{
  "order-service": [
    { "id": "order-1", "address": "10.0.0.1:8080", "health": "passing" },
    { "id": "order-2", "address": "10.0.0.2:8080", "health": "passing" }
  ],
  "user-service": [
    { "id": "user-1", "address": "10.0.1.1:8080", "health": "passing" }
  ]
}`
      },

      apiDesign: {
        description: 'Service communication patterns',
        endpoints: [
          { method: 'GET', path: '/api/orders/:id', params: '-', response: 'Order with user and items (aggregated)' },
          { method: 'gRPC', path: 'UserService.GetUser', params: 'user_id', response: 'User proto message' },
          { method: 'EVENT', path: 'order.created', params: 'order payload', response: 'Async notification' },
          { method: 'GET', path: '/health', params: '-', response: 'Service health status' },
          { method: 'GET', path: '/metrics', params: '-', response: 'Prometheus metrics' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do you decompose a monolith into microservices?',
          answer: `**Domain-Driven Design (DDD) Approach**:

1. **Identify Bounded Contexts**:
   - User Management: Registration, profiles, auth
   - Orders: Cart, checkout, order history
   - Inventory: Stock levels, warehouses
   - Payments: Processing, refunds, billing

2. **Start with the Strangler Pattern**:
\`\`\`
┌────────────────────────────────────────────┐
│              Monolith                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  Users  │ │ Orders  │ │Inventory│       │
│  └─────────┘ └─────────┘ └─────────┘       │
└────────────────────────────────────────────┘
                    │
          Extract one at a time
                    ▼
┌──────────────┐  ┌──────────────────────────┐
│    User      │  │      Monolith            │
│   Service    │  │  Orders + Inventory      │
│  (extracted) │  │                          │
└──────────────┘  └──────────────────────────┘
\`\`\`

3. **Guidelines for Service Boundaries**:
   - Single responsibility (one reason to change)
   - Own their data (no shared databases!)
   - Team-sized (2-pizza team can own it)
   - Business capability aligned
   - Independently deployable

**Anti-patterns**:
- Nano-services (too small)
- Distributed monolith (tightly coupled services)
- Shared database between services`
        },
        {
          question: 'How do services communicate with each other?',
          answer: `**Synchronous Communication**:

1. **REST over HTTP**:
\`\`\`
Order Service ──GET /users/123──▶ User Service
              ◀──{ user data }───
\`\`\`
- Simple, widely understood
- Tight coupling (caller waits)
- Good for: Queries, simple operations

2. **gRPC**:
\`\`\`
Order Service ──GetUser(123)──▶ User Service
              ◀──User proto────
\`\`\`
- Binary protocol (faster)
- Strong typing with Protobuf
- Streaming support
- Good for: Internal service calls

**Asynchronous Communication**:

3. **Message Queues**:
\`\`\`
Order Service ──[OrderCreated]──▶ Queue
                                    │
Inventory ◀────────────────────────┘
Email     ◀────────────────────────┘
Analytics ◀────────────────────────┘
\`\`\`
- Loose coupling
- Better fault tolerance
- Good for: Events, long-running tasks

**When to use each**:
| Pattern | Use Case |
|---------|----------|
| Sync (REST/gRPC) | Need immediate response |
| Async (Events) | Fire-and-forget, eventual consistency |
| gRPC | High-performance internal calls |
| REST | Public APIs, simple integrations |`
        },
        {
          question: 'What is the Circuit Breaker pattern?',
          answer: `**The Problem**: Cascading failures
\`\`\`
Order Service ──▶ User Service (DOWN)
      │
      └──▶ Waiting... waiting... TIMEOUT
      └──▶ Retry... TIMEOUT
      └──▶ Resources exhausted
      └──▶ Order Service ALSO DOWN!
\`\`\`

**Circuit Breaker States**:
\`\`\`
┌─────────┐    Failures exceed     ┌─────────┐
│ CLOSED  │────threshold──────────▶│  OPEN   │
│ (normal)│                        │ (fail   │
└─────────┘                        │  fast)  │
     ▲                             └────┬────┘
     │                                  │
     │    Success                       │ Timeout
     │                                  │
     │                             ┌────▼────┐
     └─────────────────────────────│HALF-OPEN│
                                   │ (test)  │
                                   └─────────┘
\`\`\`

**Implementation**:
\`\`\`python
class CircuitBreaker:
    def call(self, func):
        if self.state == OPEN:
            if time.now() > self.open_until:
                self.state = HALF_OPEN
            else:
                raise CircuitOpenException()

        try:
            result = func()
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise e

    def on_failure(self):
        self.failure_count += 1
        if self.failure_count >= THRESHOLD:
            self.state = OPEN
            self.open_until = time.now() + TIMEOUT
\`\`\`

**Libraries**: Hystrix (Netflix), Resilience4j, Polly`
        },
        {
          question: 'How do you handle distributed transactions?',
          answer: `**The Problem**: No ACID across services
\`\`\`
Order Service:  Create order ✓
Payment Service: Charge card ✓
Inventory:      Reduce stock ✗ (FAILS!)

Now what? Order exists, card charged, but no inventory!
\`\`\`

**Solution 1: Saga Pattern (Choreography)**:
\`\`\`
Events flow between services:

1. Order Created ──────────────────▶
2.                 ◀── Payment Charged
3. Inventory Reserved ─────────────▶
4. (or) Inventory Failed ──────────▶
5.                 ◀── Payment Refunded
6. Order Cancelled ────────────────▶
\`\`\`
- Each service reacts to events
- Compensating transactions for rollback
- Decentralized, no coordinator

**Solution 2: Saga Pattern (Orchestration)**:
\`\`\`
┌─────────────────┐
│  Saga           │
│  Orchestrator   │
└────────┬────────┘
         │
         ├──▶ 1. Create Order
         ├──▶ 2. Charge Payment
         ├──▶ 3. Reserve Inventory
         │
         │    If any step fails:
         ├──▶ Compensate (reverse order)
         │
         └──▶ Mark saga complete
\`\`\`
- Central coordinator
- Easier to understand flow
- Single point of failure

**Compensating Transactions**:
| Action | Compensation |
|--------|--------------|
| Create order | Cancel order |
| Charge card | Refund card |
| Reserve stock | Release stock |
| Send email | Send cancellation email |`
        },
        {
          question: 'How does service discovery work?',
          answer: `**The Problem**: How does Order Service find User Service?
- IP addresses change
- Instances scale up/down
- Services move between hosts

**Client-Side Discovery**:
\`\`\`
┌────────────────┐
│Service Registry│
│   (Consul)     │
└───────┬────────┘
        │ 2. user-service:
        │    [10.0.0.1, 10.0.0.2]
        │
┌───────▼────────┐         ┌─────────────────┐
│  Order Service │──3.────▶│  User Service   │
│                │  call   │  (10.0.0.1)     │
└────────────────┘         └─────────────────┘
        │
        │ 1. Query registry

- Client queries registry
- Client does load balancing
- Examples: Eureka, Consul
\`\`\`

**Server-Side Discovery**:
\`\`\`
┌────────────────┐         ┌─────────────────┐
│  Order Service │───1.───▶│   Load Balancer │
└────────────────┘  call   └────────┬────────┘
                                    │
                           2. Route │
                                    │
┌──────────────────────────────────▼─────────┐
│                User Services               │
│   [10.0.0.1]    [10.0.0.2]    [10.0.0.3]  │
└────────────────────────────────────────────┘

- Load balancer queries registry
- Client just calls load balancer
- Examples: AWS ALB, Kubernetes Service
\`\`\`

**Kubernetes Service Discovery**:
\`\`\`yaml
# user-service is DNS name
http://user-service:8080/users/123

# Kubernetes resolves to pod IPs
# Built-in load balancing
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Simple Microservices',
        description: 'API Gateway routing to independent services, each owning their database',
        svgTemplate: 'simpleMicroservices',
        problems: [
          'Direct calls create tight coupling',
          'No fault tolerance (cascading failures)',
          'Hard to trace requests across services',
          'No service discovery (hardcoded URLs)'
        ]
      },

      advancedImplementation: {
        title: 'Production Microservices Architecture',
        description: 'API Gateway with service mesh providing mTLS, circuit breakers, and observability across services.',
        svgTemplate: 'apiGateway',
        architecture: `
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│     User      │           │     Order     │           │    Payment    │
│   Service     │           │   Service     │           │   Service     │
│   ┌───────┐   │           │   ┌───────┐   │           │   ┌───────┐   │
│   │Sidecar│   │           │   │Sidecar│   │           │   │Sidecar│   │
│   └───────┘   │           │   └───────┘   │           │   └───────┘   │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        ▼                           │                           ▼
┌───────────────┐                   │                   ┌───────────────┐
│   Users DB    │                   │                   │  Payments DB  │
└───────────────┘                   │                   └───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │        Message Queue          │
                    │         (Kafka/SQS)           │
                    └───────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
        ┌───────────┐       ┌───────────┐       ┌───────────┐
        │ Analytics │       │  Email    │       │ Inventory │
        │  Service  │       │  Service  │       │  Service  │
        └───────────┘       └───────────┘       └───────────┘

Supporting Infrastructure:
┌─────────────────────────────────────────────────────────────────────────────┐
│  Service Registry │ Config Server │ Distributed Tracing │ Log Aggregation  │
│    (Consul)       │   (Vault)     │     (Jaeger)        │    (ELK)         │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Service mesh handles cross-cutting concerns',
          'Sidecar proxies for each service',
          'Event-driven for loose coupling',
          'Centralized observability stack',
          'Each service independently scalable'
        ]
      },

      discussionPoints: [
        {
          topic: 'Microservices vs Monolith',
          points: [
            'Start monolith until you need to scale',
            'Microservices add operational complexity',
            'Need mature DevOps practices',
            'Team size matters (Conway\'s Law)',
            'Don\'t microservice for the sake of it'
          ]
        },
        {
          topic: 'Common Patterns',
          points: [
            'API Gateway: Single entry point',
            'Service Mesh: Infrastructure layer',
            'Saga: Distributed transactions',
            'Event Sourcing: Audit log of changes',
            'CQRS: Separate read/write models'
          ]
        },
        {
          topic: 'Operational Challenges',
          points: [
            'Distributed tracing is essential',
            'Centralized logging and monitoring',
            'Contract testing between services',
            'Handling partial failures gracefully',
            'Database per service (no sharing!)'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-microservices', title: 'Microservices Architecture (Eraser)', description: 'API Gateway, service mesh with Envoy sidecars, Kafka event bus, Consul discovery, ELK logging', src: '/diagrams/microservices/eraser-microservices.png', type: 'cloud-architecture' },
        { id: 'microservice-arch', title: 'Microservice Architecture', description: 'Typical microservice architecture with API Gateway, Service Registry, Load Balancer, and Identity Provider', src: '/diagrams/microservices/microservice-architecture.svg', type: 'architecture' }
      ],
      comparisonTables: [
        {
          id: 'monolith-vs-microservices',
          title: 'Monolith vs Microservices',
          left: {
            title: 'Monolith',
            icon: 'server',
            color: '#f59e0b',
            items: [
              { label: 'Deploy', value: 'Single deployable unit' },
              { label: 'Complexity', value: 'Simple at start, complex at scale' },
              { label: 'Scaling', value: 'Scale entire application' },
              { label: 'Team Size', value: 'Works well for small teams (< 10)' },
              { label: 'Data', value: 'Single shared database' },
              { label: 'Best For', value: 'Startups, MVPs, small teams' }
            ]
          },
          right: {
            title: 'Microservices',
            icon: 'layers',
            color: '#10b981',
            items: [
              { label: 'Deploy', value: 'Independent services, independent deploys' },
              { label: 'Complexity', value: 'Complex from start, manageable at scale' },
              { label: 'Scaling', value: 'Scale individual services independently' },
              { label: 'Team Size', value: 'Essential for large teams (50+)' },
              { label: 'Data', value: 'Database per service' },
              { label: 'Best For', value: 'Large orgs, complex domains, independent teams' }
            ]
          }
        },
        {
          id: 'monolith-vs-microservices-2',
          title: 'Monolith vs Microservices',
          left: {
            title: 'Monolith',
            icon: 'server',
            color: '#ef4444',
            items: [
              { label: 'Deploy', value: 'Single deployable unit' },
              { label: 'Scaling', value: 'Scale everything together' },
              { label: 'Team', value: 'One team, shared codebase' },
              { label: 'Complexity', value: 'Low operational, high code complexity' },
              { label: 'Communication', value: 'In-process function calls' },
              { label: 'Best For', value: 'Small teams, MVPs, simple domains' }
            ]
          },
          right: {
            title: 'Microservices',
            icon: 'layers',
            color: '#10b981',
            items: [
              { label: 'Deploy', value: 'Independent service deployments' },
              { label: 'Scaling', value: 'Scale each service independently' },
              { label: 'Team', value: 'Multiple teams, service ownership' },
              { label: 'Complexity', value: 'High operational, lower per-service' },
              { label: 'Communication', value: 'Network calls (HTTP, gRPC, queues)' },
              { label: 'Best For', value: 'Large teams, complex domains, high scale' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'microservices-patterns',
          title: 'Microservice Communication Patterns',
          color: '#10b981',
          icon: 'gitBranch',
          items: [
            { label: 'Synchronous REST/gRPC', value: 'Direct request-response', bar: 70 },
            { label: 'Async Message Queue', value: 'Event-driven, decoupled', bar: 85 },
            { label: 'API Gateway', value: 'Single entry point, routing', bar: 80 },
            { label: 'Service Mesh', value: 'Sidecar proxy (Istio/Envoy)', bar: 65 },
            { label: 'Event Sourcing + CQRS', value: 'Event log + read/write split', bar: 55 },
            { label: 'Saga Pattern', value: 'Distributed transactions', bar: 60 }
          ]
        },
        {
          id: 'microservices-patterns-overview',
          title: 'Key Microservices Patterns',
          color: '#10b981',
          icon: 'layers',
          items: [
            { label: 'API Gateway', value: 'Single entry point for all clients', bar: 90 },
            { label: 'Service Discovery', value: 'Dynamic service location', bar: 80 },
            { label: 'Circuit Breaker', value: 'Prevent cascade failures', bar: 85 },
            { label: 'Saga Pattern', value: 'Distributed transactions', bar: 70 },
            { label: 'CQRS', value: 'Separate read/write models', bar: 60 },
            { label: 'Sidecar/Service Mesh', value: 'Infrastructure concerns', bar: 75 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'api-gateway', name: 'API Gateway', icon: 'globe', color: '#3b82f6',
          description: 'Single entry point that routes, authenticates, and rate-limits.',
          useWhen: 'Multiple microservices exposed to clients',
          example: 'Kong, AWS API Gateway, Envoy'
        },
        {
          id: 'saga', name: 'Saga Pattern', icon: 'gitBranch', color: '#8b5cf6',
          description: 'Manage distributed transactions via a sequence of local transactions.',
          useWhen: 'Cross-service transactions (order → payment → inventory)',
          example: 'Choreography (events) or Orchestration (coordinator)'
        },
        {
          id: 'service-discovery', name: 'Service Discovery', icon: 'search', color: '#10b981',
          description: 'Automatically find network locations of service instances.',
          useWhen: 'Dynamic environments, auto-scaling services',
          example: 'Consul, Eureka, Kubernetes DNS, etcd'
        },
        {
          id: 'sidecar', name: 'Sidecar Pattern', icon: 'layers', color: '#f59e0b',
          description: 'Attach a helper container alongside each service for cross-cutting concerns.',
          useWhen: 'Logging, monitoring, TLS, retries across all services',
          example: 'Istio/Envoy sidecar proxy, Datadog agent'
        },
        {
          id: 'api-gateway-ms', name: 'API Gateway', icon: 'globe', color: '#3b82f6',
          description: 'Single entry point that routes, authenticates, and rate-limits.',
          useWhen: 'Multiple client types (web, mobile), cross-cutting concerns',
          example: 'Kong, AWS API Gateway, Nginx as gateway'
        },
        {
          id: 'saga-pattern', name: 'Saga Pattern', icon: 'gitBranch', color: '#8b5cf6',
          description: 'Sequence of local transactions with compensating actions on failure.',
          useWhen: 'Distributed transactions spanning multiple services',
          example: 'Order → Payment → Inventory → Shipping (compensate on failure)'
        },
        {
          id: 'service-mesh', name: 'Service Mesh', icon: 'layers', color: '#10b981',
          description: 'Sidecar proxies handle networking, security, observability.',
          useWhen: '50+ microservices, need consistent networking policies',
          example: 'Istio, Linkerd — mTLS, retries, tracing without code changes'
        },
        {
          id: 'cqrs', name: 'CQRS', icon: 'columns', color: '#f59e0b',
          description: 'Separate models for reading and writing data.',
          useWhen: 'Different read/write patterns, event sourcing, read replicas',
          example: 'Write to normalized DB, read from denormalized view/cache'
        }
      ],
      comparisonCards: [
        {
          title: 'Microservice Architecture Components',
          items: [
            { name: 'API Gateway', description: 'Single entry point for all clients. Handles routing, authentication, rate limiting, and request aggregation. Examples: Kong, AWS API Gateway, Nginx.' },
            { name: 'Service Registry & Discovery', description: 'Services register themselves on startup. Other services discover them dynamically. Examples: Consul, Eureka, Kubernetes DNS.' },
            { name: 'Load Balancer', description: 'Distributes incoming traffic across multiple service instances. Can be client-side (Ribbon) or server-side (ALB, Nginx).' },
            { name: 'Identity Provider', description: 'Centralized authentication and authorization. Issues tokens validated by individual services. Examples: Keycloak, Auth0, Okta.' },
            { name: 'Distributed Caching', description: 'Shared cache layer across services. Redis, Memcached, or Couchbase. Reduces database load and improves response times.' },
            { name: 'Message Broker', description: 'Async communication between services via Kafka, RabbitMQ, or SQS. Decouples producers from consumers for reliability.' },
            { name: 'Metrics & Monitoring', description: 'Services publish metrics to Prometheus, visualized in Grafana. Essential for detecting issues in distributed systems.' },
            { name: 'Log Aggregation', description: 'Centralized logging via ELK stack (Logstash → Elasticsearch → Kibana). Correlate logs across services with trace IDs.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Distributed transaction spanning multiple services', impact: 'Partial failure leaves data inconsistent: payment charged but order not created, or inventory decremented but shipment not initiated', mitigation: 'Use Saga pattern with compensating transactions, implement outbox pattern for reliable event publishing, design for eventual consistency' },
        { scenario: 'Service discovery lag during rapid scaling', impact: 'New instances registered but not yet healthy, or terminated instances still receiving traffic, causing request failures', mitigation: 'Use health check grace periods, implement client-side retry with circuit breaker, use readiness probes distinct from liveness probes' },
        { scenario: 'Cascading failure from one degraded service', impact: 'Service A calls slow Service B, exhausting A\'s thread pool, which causes A\'s callers to also exhaust their pools — entire system collapses', mitigation: 'Implement circuit breakers (Hystrix/Resilience4j), use bulkheads to isolate connection pools, set aggressive timeouts on all inter-service calls' },
        { scenario: 'Data consistency across service boundaries', impact: 'Each service owns its database but business operations span multiple services, leading to temporarily inconsistent views of data', mitigation: 'Accept eventual consistency for non-critical paths, use event-driven architecture with idempotent consumers, implement CQRS for read/write separation' },
        { scenario: 'Deployment of incompatible service versions', impact: 'Service A deploys v2 expecting new API from Service B, but Service B is still on v1, causing runtime failures', mitigation: 'Use consumer-driven contract testing (Pact), enforce API versioning, deploy with canary releases and automated rollback' },
      ],
      tradeoffs: [
        { decision: 'Monolith vs Microservices', pros: 'Monolith is simpler to develop, deploy, and debug; microservices enable independent scaling, deployment, and team ownership', cons: 'Monolith becomes a deployment bottleneck with large teams; microservices add network latency, distributed debugging complexity, and operational overhead', recommendation: 'Start with a modular monolith, extract services when team size exceeds 8-10 engineers or specific components need independent scaling' },
        { decision: 'Orchestration (Saga) vs Choreography (Events)', pros: 'Orchestration provides clear workflow visibility and easier error handling; choreography offers loose coupling and independent service evolution', cons: 'Orchestration creates a central coordinator as a bottleneck; choreography makes it hard to track overall workflow state', recommendation: 'Orchestration for complex multi-step business processes; choreography for simple event-driven reactions between loosely coupled services' },
        { decision: 'Shared database vs Database-per-service', pros: 'Shared DB simplifies joins and transactions; database-per-service provides true isolation and independent schema evolution', cons: 'Shared DB creates tight coupling and deployment dependencies; database-per-service complicates cross-service queries', recommendation: 'Database-per-service as the default; shared DB only during early migration from monolith with a clear plan to split later' },
        { decision: 'Synchronous REST vs Asynchronous events between services', pros: 'REST is simpler to implement and debug; async events decouple services and handle failures gracefully', cons: 'REST creates temporal coupling (both services must be up); async adds eventual consistency complexity and debugging difficulty', recommendation: 'REST for queries and real-time user-facing operations; async events for state changes and background processing' },
      ],
      layeredDesign: [
        { name: 'API Gateway Layer', purpose: 'Unified entry point for external clients with cross-cutting concerns', components: ['API Gateway (Kong, AWS)', 'Authentication', 'Rate Limiting', 'Request Routing', 'Response Aggregation'] },
        { name: 'Service Layer', purpose: 'Individual microservices encapsulating bounded domain contexts', components: ['Domain Services', 'Service-to-Service Communication (REST/gRPC)', 'Circuit Breakers', 'Service Discovery (Consul/K8s DNS)'] },
        { name: 'Data Layer', purpose: 'Per-service data stores with autonomous schema management', components: ['Database-per-Service', 'Event Store', 'Outbox Table', 'Read Replicas'] },
        { name: 'Messaging Layer', purpose: 'Asynchronous communication backbone for event-driven architecture', components: ['Message Broker (Kafka/RabbitMQ)', 'Event Bus', 'Dead Letter Queues', 'Schema Registry'] },
        { name: 'Observability Layer', purpose: 'Cross-service monitoring, tracing, and debugging infrastructure', components: ['Distributed Tracing (Jaeger)', 'Centralized Logging (ELK)', 'Metrics (Prometheus/Grafana)', 'Service Mesh (Istio)'] },
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: 'lock',
      color: '#dc2626',
      questions: 8,
      description: 'Authentication, authorization, and data protection.',
      concepts: ['OAuth 2.0', 'JWT', 'HTTPS/TLS', 'Encryption at rest', 'API keys', 'RBAC', 'SQL injection prevention'],
      tips: [
        'Use OAuth 2.0 for third-party auth, JWT for stateless sessions',
        'Always encrypt sensitive data at rest and in transit',
        'Principle of least privilege for access control'
      ],

      introduction: `Security is not optional—it's a fundamental requirement for every system. A single vulnerability can expose millions of users' data, destroy trust, and result in massive fines.

Breaches at companies like Equifax (143M users), Yahoo (3B accounts), and Facebook (533M users) show the consequences of poor security. Understanding authentication, authorization, encryption, and common vulnerabilities is essential for system design.`,

      functionalRequirements: [
        'Authenticate users securely',
        'Authorize access to resources',
        'Protect data in transit and at rest',
        'Handle sensitive data (PII, credentials)',
        'Audit security-relevant events',
        'Support secure password management'
      ],

      nonFunctionalRequirements: [
        'Compliance: SOC2, GDPR, HIPAA as applicable',
        'Encryption: TLS 1.3+, AES-256',
        'Password: bcrypt/Argon2 with proper work factors',
        'Session: Secure, HttpOnly, SameSite cookies',
        'Audit: 1 year retention for security logs',
        'Recovery: < 24 hour response to security incidents'
      ],

      dataModel: {
        description: 'Security-related data models',
        schema: `User Authentication:
{
  id: uuid,
  email: string (unique, indexed),
  password_hash: string (bcrypt/Argon2),
  salt: string,
  mfa_secret: string (encrypted),
  mfa_enabled: boolean,
  failed_attempts: int,
  locked_until: timestamp,
  last_login: timestamp
}

API Key:
{
  id: uuid,
  user_id: uuid FK,
  key_hash: string (never store plaintext!),
  key_prefix: string (for identification: "sk_live_"),
  name: string,
  scopes: string[],
  last_used: timestamp,
  expires_at: timestamp
}

Audit Log:
{
  id: uuid,
  timestamp: datetime,
  user_id: uuid,
  action: string,
  resource: string,
  ip_address: string,
  user_agent: string,
  result: "success" | "failure",
  details: json
}`
      },

      apiDesign: {
        description: 'Secure API patterns',
        endpoints: [
          { method: 'POST', path: '/api/auth/login', params: 'email, password', response: '{ accessToken, refreshToken }' },
          { method: 'POST', path: '/api/auth/refresh', params: 'refreshToken', response: '{ accessToken }' },
          { method: 'POST', path: '/api/auth/logout', params: 'refreshToken', response: '204 (invalidate token)' },
          { method: 'POST', path: '/api/auth/mfa/verify', params: 'code', response: '{ accessToken }' },
          { method: 'GET', path: '/api/user/me', params: 'Authorization header', response: 'Current user (authenticated)' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is the difference between authentication and authorization?',
          answer: `**Authentication (AuthN)**: Who are you?
- Verifies identity
- Proves you are who you claim to be
- Methods: Password, MFA, biometrics, SSO

**Authorization (AuthZ)**: What can you do?
- Verifies permissions
- Determines what resources you can access
- Methods: RBAC, ABAC, ACLs

**Example**:
\`\`\`
1. User logs in with email/password → Authentication
2. User requests /admin/users → Authorization check
3. System checks: Does user have "admin" role?
4. If yes → Allow; If no → 403 Forbidden
\`\`\`

**Common Patterns**:

| Pattern | Description | Use Case |
|---------|-------------|----------|
| RBAC | Role-Based Access Control | User has roles (admin, user) |
| ABAC | Attribute-Based Access Control | Rules based on attributes |
| ACL | Access Control Lists | Per-resource permissions |
| ReBAC | Relationship-Based | Based on relationships (owner, member) |

**Example RBAC**:
\`\`\`
Roles:
  admin: [read, write, delete, manage_users]
  editor: [read, write]
  viewer: [read]

User "john" has role "editor"
john can: read ✓, write ✓, delete ✗
\`\`\``
        },
        {
          question: 'How does OAuth 2.0 work?',
          answer: `**OAuth 2.0**: Authorization framework for third-party access

**The Problem**: App wants to access user's Google data without knowing Google password.

**OAuth Flow (Authorization Code)**:
\`\`\`
┌──────────┐                               ┌──────────┐
│   User   │                               │  Google  │
└────┬─────┘                               └────┬─────┘
     │                                          │
     │  1. Click "Login with Google"            │
     │  ──────────────────────────────────────▶ │
     │                                          │
     │  2. Google login page                    │
     │  ◀────────────────────────────────────── │
     │                                          │
     │  3. User logs in & approves              │
     │  ──────────────────────────────────────▶ │
     │                                          │
     │  4. Redirect with authorization code     │
     │  ◀────────────────────────────────────── │
     │                                          │
┌────▼─────┐                                    │
│   App    │  5. Exchange code for tokens       │
│  Server  │  ─────────────────────────────────▶│
│          │                                    │
│          │  6. Access token + Refresh token   │
│          │  ◀─────────────────────────────────│
│          │                                    │
│          │  7. Use access token for API calls │
│          │  ─────────────────────────────────▶│
└──────────┘                                    │
\`\`\`

**Key Tokens**:
- **Access Token**: Short-lived (15 min), for API calls
- **Refresh Token**: Long-lived, to get new access tokens
- **ID Token** (OpenID Connect): User info (email, name)

**Scopes**: Limit what app can access
\`\`\`
scopes: ["email", "profile", "calendar.readonly"]
\`\`\``
        },
        {
          question: 'How do you securely store passwords?',
          answer: `**NEVER store plaintext passwords!**

**Proper Password Hashing**:
\`\`\`python
# Good: bcrypt with cost factor
import bcrypt

def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)  # 2^12 iterations
    return bcrypt.hashpw(password.encode(), salt)

def verify_password(password, hash):
    return bcrypt.checkpw(password.encode(), hash)
\`\`\`

**Why bcrypt/Argon2?**:
- **Slow by design**: Makes brute force impractical
- **Salt built-in**: Each password has unique salt
- **Adjustable cost**: Increase work factor over time

**Password Storage Comparison**:
| Method | Security | Notes |
|--------|----------|-------|
| Plaintext | 💀 NEVER | Catastrophic if breached |
| MD5/SHA1 | 💀 NO | Too fast, rainbow tables |
| SHA256 | ⚠️ Weak | Fast, need salt |
| bcrypt | ✅ Good | Industry standard |
| Argon2 | ✅ Best | Memory-hard, newest |

**Best Practices**:
- Use bcrypt with cost factor ≥12 (or Argon2)
- Enforce strong passwords (length > complexity)
- Rate limit login attempts
- Lock account after N failures
- Never log passwords
- Use password managers (for users)`
        },
        {
          question: 'What are common security vulnerabilities to prevent?',
          answer: `**OWASP Top 10 Vulnerabilities**:

**1. Injection (SQL, NoSQL, Command)**:
\`\`\`sql
-- Bad: String concatenation
"SELECT * FROM users WHERE id = '" + userId + "'"
-- userId = "'; DROP TABLE users; --"

-- Good: Parameterized queries
"SELECT * FROM users WHERE id = $1", [userId]
\`\`\`

**2. Broken Authentication**:
- Weak passwords allowed
- No rate limiting
- Predictable session IDs
- Credentials in URL

**3. Cross-Site Scripting (XSS)**:
\`\`\`html
<!-- Bad: Rendering user input directly -->
<div>{userInput}</div>
<!-- userInput = <script>stealCookies()</script> -->

<!-- Good: Escape HTML -->
<div>{escapeHtml(userInput)}</div>
\`\`\`

**4. Insecure Direct Object References**:
\`\`\`
GET /api/invoices/12345  (user can access any invoice!)

# Good: Check ownership
if invoice.user_id != current_user.id:
    return 403 Forbidden
\`\`\`

**5. CSRF (Cross-Site Request Forgery)**:
\`\`\`html
<!-- Attacker's site -->
<img src="https://bank.com/transfer?to=attacker&amount=10000">

<!-- Prevention: CSRF tokens -->
<input type="hidden" name="csrf_token" value="random_token">
\`\`\`

**6. Security Misconfiguration**:
- Debug mode in production
- Default credentials
- Unnecessary features enabled
- Missing security headers`
        },
        {
          question: 'How do you implement JWT authentication?',
          answer: `**JWT (JSON Web Token)**: Stateless authentication token

**Structure**: header.payload.signature
\`\`\`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.
Gfx6VO9tcxwk6xqx9yYzSfebfeakZp5JYIgP_edcw_A

Header: {"alg": "HS256", "typ": "JWT"}
Payload: {"sub": "user_123", "exp": 1700000000, "roles": ["user"]}
Signature: HMACSHA256(header + "." + payload, secret)
\`\`\`

**Authentication Flow**:
\`\`\`
1. User logs in with credentials
2. Server validates, generates JWT
3. Client stores JWT (httpOnly cookie recommended)
4. Client sends JWT with every request
5. Server validates signature and expiry
\`\`\`

**Implementation**:
\`\`\`python
import jwt
from datetime import datetime, timedelta

def create_token(user_id, secret):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_token(token, secret):
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise AuthError("Token expired")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token")
\`\`\`

**Best Practices**:
- Short expiry (15 min) + refresh tokens
- Use httpOnly cookies (not localStorage)
- Include only necessary claims
- Rotate signing keys periodically
- Never store sensitive data in payload`
        }
      ],

      basicImplementation: {
        title: 'Basic Authentication',
        description: 'Client → Auth Service → Session Store (Redis) + User Database',
        svgTemplate: 'sessionAuth',
        problems: [
          'Server must store session state',
          'Hard to scale across servers',
          'Session storage becomes bottleneck',
          'CSRF protection needed'
        ]
      },

      advancedImplementation: {
        title: 'Zero-Trust Security Architecture',
        description: 'WAF → API Gateway → Identity Provider (JWT) → Service Mesh with mTLS',
        svgTemplate: 'serviceMesh',
        oldArchitecture: `
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   Service A   │           │   Service B   │           │   Service C   │
│               │           │               │           │               │
│ Validate JWT  │           │ Validate JWT  │           │ Validate JWT  │
│ Check scopes  │           │ Check scopes  │           │ Check scopes  │
│ RBAC checks   │           │ RBAC checks   │           │ RBAC checks   │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         Encrypted Data Store                               │
│                    Encryption at rest (AES-256)                            │
│              Secrets in Vault │ Key rotation │ Audit logs                  │
└───────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Defense in depth: Multiple security layers',
          'Zero trust: Verify every request',
          'mTLS: Encrypted service-to-service',
          'Centralized identity management',
          'Encryption everywhere (transit + rest)',
          'Comprehensive audit logging'
        ]
      },

      discussionPoints: [
        {
          topic: 'Authentication Methods',
          points: [
            'Passwords: Simple but weakest (require MFA)',
            'OAuth/OIDC: For third-party and SSO',
            'API Keys: For service-to-service',
            'Certificates/mTLS: Strongest, complex setup',
            'Biometrics: Convenience factor'
          ]
        },
        {
          topic: 'Data Protection',
          points: [
            'Encrypt sensitive data at rest',
            'Use TLS 1.3 for all traffic',
            'Hash passwords with bcrypt/Argon2',
            'Store secrets in Vault/KMS, not code',
            'PII requires special handling (GDPR)'
          ]
        },
        {
          topic: 'Security Monitoring',
          points: [
            'Log all authentication events',
            'Alert on anomalous behavior',
            'Rate limit failed attempts',
            'Regular security audits/pentests',
            'Incident response plan'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-security', title: 'Security Architecture (Eraser)', description: 'WAF, API Gateway, OAuth2, JWT, RBAC, mTLS, Vault secrets, SIEM audit, KMS encryption', src: '/diagrams/security/eraser-security-architecture.png', type: 'cloud-architecture' },
        { id: 'auth-methods', title: 'Authentication Methods', description: 'Session, Token, JWT, SSO, and OAuth 2.0 — how different auth mechanisms work', src: '/diagrams/security/auth-methods.svg', type: 'architecture' },
        { id: 'ssl-handshake', title: 'SSL/TLS Handshake', description: 'Three-step HTTPS handshake: certificate check, key exchange, and encrypted tunnel establishment', src: '/diagrams/security/ssl-handshake.svg', type: 'architecture' }
      ],
      comparisonTables: [
        {
          id: 'authn-vs-authz',
          title: 'Authentication vs Authorization',
          left: {
            title: 'Authentication (AuthN)',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Question', value: 'WHO are you?' },
              { label: 'Verifies', value: 'Identity — credentials, tokens, biometrics' },
              { label: 'When', value: 'First — before authorization' },
              { label: 'Methods', value: 'Password, OAuth, SSO, MFA, JWT' },
              { label: 'Failure', value: '401 Unauthorized' },
              { label: 'Example', value: 'Login with username + password → get token' }
            ]
          },
          right: {
            title: 'Authorization (AuthZ)',
            icon: 'shield',
            color: '#3b82f6',
            items: [
              { label: 'Question', value: 'WHAT can you do?' },
              { label: 'Verifies', value: 'Permissions — roles, policies, scopes' },
              { label: 'When', value: 'After authentication' },
              { label: 'Methods', value: 'RBAC, ABAC, ACL, OAuth scopes' },
              { label: 'Failure', value: '403 Forbidden' },
              { label: 'Example', value: 'Admin can delete posts, user can only read' }
            ]
          }
        },
        {
          id: 'auth-methods',
          title: 'Authentication Methods',
          left: {
            title: 'Session-Based Auth',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Storage', value: 'Server stores session in memory/DB' },
              { label: 'Token', value: 'Session ID in cookie' },
              { label: 'Stateful', value: 'Yes — server must track all sessions' },
              { label: 'Scaling', value: 'Harder — need sticky sessions or shared store' },
              { label: 'Revocation', value: 'Easy — delete session from server' },
              { label: 'Best For', value: 'Traditional web apps, simple setups' }
            ]
          },
          right: {
            title: 'Token-Based Auth (JWT)',
            icon: 'key',
            color: '#10b981',
            items: [
              { label: 'Storage', value: 'Client stores token (localStorage/cookie)' },
              { label: 'Token', value: 'Signed JWT with claims' },
              { label: 'Stateful', value: 'No — token is self-contained' },
              { label: 'Scaling', value: 'Easy — any server can verify' },
              { label: 'Revocation', value: 'Hard — need blacklist or short TTL' },
              { label: 'Best For', value: 'APIs, microservices, mobile apps' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'security-layers',
          title: 'Defense in Depth — Security Layers',
          color: '#ef4444',
          icon: 'shield',
          items: [
            { label: 'Network (Firewall/WAF)', value: 'Block malicious traffic', bar: 95 },
            { label: 'Transport (TLS/HTTPS)', value: 'Encrypt data in transit', bar: 90 },
            { label: 'Authentication (OAuth/JWT)', value: 'Verify identity', bar: 85 },
            { label: 'Authorization (RBAC/ABAC)', value: 'Enforce permissions', bar: 80 },
            { label: 'Input Validation', value: 'Prevent injection attacks', bar: 75 },
            { label: 'Encryption at Rest', value: 'Protect stored data', bar: 70 },
            { label: 'Audit Logging', value: 'Track all access', bar: 65 }
          ]
        },
        {
          id: 'security-checklist',
          title: 'System Design Security Checklist',
          color: '#ef4444',
          icon: 'shield',
          items: [
            { label: 'HTTPS everywhere', value: 'TLS 1.3, cert management', bar: 95 },
            { label: 'Authentication', value: 'OAuth2 / JWT / SSO', bar: 90 },
            { label: 'Authorization', value: 'RBAC / ABAC per endpoint', bar: 85 },
            { label: 'Input validation', value: 'Sanitize all user input', bar: 90 },
            { label: 'Rate limiting', value: 'Prevent brute force / DDoS', bar: 80 },
            { label: 'Encryption at rest', value: 'AES-256 for sensitive data', bar: 75 },
            { label: 'Audit logging', value: 'Track who did what when', bar: 70 },
            { label: 'Secret management', value: 'Vault, env vars, not in code', bar: 85 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'oauth2', name: 'OAuth 2.0 + OIDC', icon: 'lock', color: '#3b82f6',
          description: 'Delegate authentication to identity providers (Google, GitHub).',
          useWhen: 'Third-party login, API access delegation',
          example: 'Authorization Code flow with PKCE for SPAs'
        },
        {
          id: 'jwt', name: 'JWT Tokens', icon: 'key', color: '#10b981',
          description: 'Stateless auth tokens with claims signed by the server.',
          useWhen: 'Stateless APIs, microservices auth',
          example: 'Short-lived access token (15m) + refresh token (30d)'
        },
        {
          id: 'rbac', name: 'Role-Based Access Control', icon: 'users', color: '#8b5cf6',
          description: 'Assign permissions to roles, assign roles to users.',
          useWhen: 'Most applications — simple, well-understood model',
          example: 'Roles: admin, editor, viewer. Admin can delete, viewer can read'
        },
        {
          id: 'zero-trust', name: 'Zero Trust', icon: 'shield', color: '#ef4444',
          description: 'Never trust, always verify. Every request must be authenticated.',
          useWhen: 'Cloud-native, distributed systems, remote workforce',
          example: 'mTLS between services, BeyondCorp, no VPN reliance'
        },
        {
          id: 'oauth2-flow', name: 'OAuth 2.0', icon: 'globe', color: '#3b82f6',
          description: 'Delegated authorization — let third parties access resources.',
          useWhen: '"Login with Google/GitHub", API access delegation',
          example: 'Authorization Code flow with PKCE for SPAs'
        },
        {
          id: 'rbac-detailed', name: 'RBAC', icon: 'users', color: '#8b5cf6',
          description: 'Role-Based Access Control — assign permissions to roles, roles to users.',
          useWhen: 'Multi-tenant apps, admin/user/viewer permission levels',
          example: 'admin: *, editor: read+write, viewer: read'
        },
        {
          id: 'encryption', name: 'Encryption', icon: 'lock', color: '#ef4444',
          description: 'Protect data in transit (TLS) and at rest (AES). Hash passwords (bcrypt).',
          useWhen: 'Always — non-negotiable for any system',
          example: 'TLS 1.3 for transit, AES-256-GCM at rest, bcrypt for passwords'
        },
        {
          id: 'zero-trust-detailed', name: 'Zero Trust', icon: 'shield', color: '#10b981',
          description: 'Never trust, always verify. Authenticate every request.',
          useWhen: 'Microservices, cloud-native, remote workforce',
          example: 'mTLS between services, short-lived tokens, continuous verification'
        }
      ],
      comparisonCards: [
        {
          title: 'Authentication Methods Compared',
          items: [
            { name: 'Session-Cookie', description: 'Server stores session state, sends session ID as cookie. Simple but doesn\'t scale horizontally well — requires sticky sessions or shared session store.' },
            { name: 'Token-Based', description: 'Identity encoded into a token sent to browser. Stateless — no server-side session storage needed. But tokens need encryption/decryption.' },
            { name: 'JWT (JSON Web Token)', description: 'Standardized token with header.payload.signature structure. Self-contained — signature allows verification without server lookup. Widely used in APIs.' },
            { name: 'SSO (Single Sign-On)', description: 'Central Authentication Service (CAS) allows login once, access multiple apps (a.com, b.com). Reduces password fatigue but CAS is a single point of failure.' },
            { name: 'OAuth 2.0', description: 'Delegated authorization standard. Supports multiple grant types: authorization code (web), implicit (SPA), password grant (native), client credentials (M2M).' }
          ]
        },
        {
          title: 'HTTPS/SSL Handshake Steps',
          items: [
            { name: 'Step 1: Certificate Check', description: 'Client sends CLIENT HELLO → Server responds with SERVER HELLO + SSL certificate → Client verifies certificate with Certificate Authority (CA). Establishes server identity.' },
            { name: 'Step 2: Key Exchange', description: 'Client extracts server public key from certificate → Creates a session key → Negotiates cipher suite (e.g., AES-256) → Encrypts session key with server public key → Sends to server.' },
            { name: 'Step 3: Encrypted Tunnel', description: 'Both client and server now share the same session key. All subsequent data is encrypted/decrypted using this symmetric key. Secure tunnel established.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'JWT token stolen from localStorage', impact: 'Attacker gains persistent access to user account until token expires, potentially accessing sensitive data or performing unauthorized actions', mitigation: 'Store tokens in httpOnly secure cookies, use short-lived access tokens (15 min) with refresh token rotation, implement token revocation list' },
        { scenario: 'SQL injection through unexpected input vector', impact: 'Attacker bypasses input validation on an overlooked field (search, sort parameter, HTTP header), gaining read or write access to the database', mitigation: 'Use parameterized queries everywhere (no exceptions), employ ORM/query builders, implement WAF rules, run regular DAST/SAST scans' },
        { scenario: 'Certificate expiration in production', impact: 'TLS certificate expires causing all HTTPS connections to fail with browser security warnings, effectively taking the site offline', mitigation: 'Use auto-renewal (Let\'s Encrypt with certbot), monitor certificate expiry dates with alerts 30 days before, use managed TLS (Cloudflare, AWS ACM)' },
        { scenario: 'Privilege escalation through IDOR', impact: 'User changes resource ID in API request (e.g., /api/orders/123 to /api/orders/456) and accesses another user\'s data', mitigation: 'Always validate resource ownership server-side, use UUIDs instead of sequential IDs, implement row-level security policies' },
        { scenario: 'Secret leaked in git commit history', impact: 'API key, database password, or JWT secret pushed to repository, even if later deleted it persists in git history', mitigation: 'Use environment variables and secret managers (Vault, AWS Secrets Manager), run git-secrets pre-commit hook, rotate compromised credentials immediately' },
      ],
      tradeoffs: [
        { decision: 'Session-based vs Token-based authentication', pros: 'Sessions are easy to invalidate server-side; tokens (JWT) are stateless and scale horizontally without shared session store', cons: 'Sessions require sticky sessions or shared store (Redis); tokens cannot be easily revoked before expiry', recommendation: 'Token-based (JWT) for APIs and SPAs; session-based for traditional server-rendered apps that need instant revocation' },
        { decision: 'OAuth 2.0 vs API Keys', pros: 'OAuth provides granular scoped access and delegated authorization; API keys are simple to implement and use', cons: 'OAuth has complex flows and token management; API keys lack scope granularity and are easily leaked', recommendation: 'OAuth for user-facing third-party integrations; API keys for server-to-server internal communication with IP allowlisting' },
        { decision: 'Encryption at rest vs Performance', pros: 'Encryption protects data if storage is compromised; unencrypted data has faster read/write performance', cons: 'Encryption adds CPU overhead (5-10%) and key management complexity; no encryption is a compliance violation for PII/PCI', recommendation: 'Always encrypt PII and financial data at rest; use hardware-accelerated AES-NI to minimize performance impact' },
        { decision: 'Zero Trust vs Perimeter Security', pros: 'Zero trust protects against lateral movement after breach; perimeter security is simpler to implement with VPN/firewall', cons: 'Zero trust requires mTLS, identity-aware proxies, and continuous verification; perimeter security is vulnerable once breached', recommendation: 'Zero trust for cloud-native microservices; perimeter security acceptable for small teams with well-defined network boundaries' },
      ],
      layeredDesign: [
        { name: 'Edge Security Layer', purpose: 'Protect against external threats before requests reach application servers', components: ['WAF (Web Application Firewall)', 'DDoS Protection (Cloudflare)', 'Bot Detection', 'TLS Termination'] },
        { name: 'Authentication Layer', purpose: 'Verify user identity and issue credentials', components: ['OAuth 2.0 / OIDC Provider', 'JWT Issuer', 'MFA (TOTP, WebAuthn)', 'Session Manager'] },
        { name: 'Authorization Layer', purpose: 'Enforce access control policies on every request', components: ['RBAC / ABAC Engine', 'Policy Enforcement Point', 'Resource Ownership Validation', 'API Scope Checker'] },
        { name: 'Data Protection Layer', purpose: 'Encrypt and protect sensitive data at rest and in transit', components: ['AES-256 Encryption at Rest', 'TLS 1.3 in Transit', 'Key Management (KMS/Vault)', 'PII Masking/Tokenization'] },
        { name: 'Audit & Compliance Layer', purpose: 'Log security events and ensure regulatory compliance', components: ['Audit Log (immutable)', 'SIEM Integration', 'Compliance Scanner (SOC2, GDPR)', 'Vulnerability Scanner'] },
      ]
    },
    {
      id: 'monitoring',
      title: 'Monitoring & Observability',
      icon: 'eye',
      color: '#0ea5e9',
      questions: 6,
      description: 'Logging, metrics, tracing, and alerting.',
      concepts: ['Logs vs Metrics vs Traces', 'Prometheus/Grafana', 'ELK stack', 'Distributed tracing', 'SLIs/SLOs', 'On-call rotation'],
      tips: [
        'Three pillars: Logs, Metrics, Traces',
        'Set SLOs based on user experience, not server metrics',
        'Use distributed tracing for debugging microservices'
      ],

      introduction: `Observability is the ability to understand a system's internal state by examining its outputs. In distributed systems, you can't SSH into a server to debug—you need comprehensive monitoring, logging, and tracing.

Google, Netflix, and Amazon have mature observability practices that enable them to operate at massive scale with small on-call teams. Understanding the three pillars (logs, metrics, traces) and SLOs is essential for production systems.`,

      functionalRequirements: [
        'Collect and store metrics from all services',
        'Aggregate logs from distributed systems',
        'Trace requests across service boundaries',
        'Alert on anomalies and SLO violations',
        'Provide dashboards for visualization',
        'Enable root cause analysis for incidents'
      ],

      nonFunctionalRequirements: [
        'Metrics latency: < 30 seconds end-to-end',
        'Log ingestion: Handle 100K+ events/second',
        'Trace sampling: Balance detail vs overhead',
        'Storage: 30 days hot, 1 year archive',
        'Query: Sub-second for common queries',
        'Availability: Monitoring must be more reliable than monitored systems'
      ],

      dataModel: {
        description: 'Observability data formats',
        schema: `Metric (Prometheus format):
  http_requests_total{
    method="GET",
    path="/api/users",
    status="200"
  } 1234

  http_request_duration_seconds{
    method="GET",
    path="/api/users",
    quantile="0.99"
  } 0.25

Log (Structured JSON):
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "ERROR",
  "service": "order-service",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Failed to process order",
  "error": "Connection refused",
  "user_id": "user_789",
  "order_id": "order_456"
}

Trace Span:
{
  "trace_id": "abc123",
  "span_id": "def456",
  "parent_span_id": "ghi789",
  "operation_name": "POST /api/orders",
  "service_name": "order-service",
  "start_time": "2024-01-01T12:00:00.000Z",
  "duration_ms": 250,
  "tags": {"http.status_code": 200},
  "logs": [{"time": "...", "message": "Processing order"}]
}`
      },

      apiDesign: {
        description: 'Common observability endpoints',
        endpoints: [
          { method: 'GET', path: '/metrics', params: '-', response: 'Prometheus metrics format' },
          { method: 'GET', path: '/health', params: '-', response: '{ status: "healthy", checks: [...] }' },
          { method: 'GET', path: '/health/ready', params: '-', response: 'Ready to serve traffic' },
          { method: 'GET', path: '/health/live', params: '-', response: 'Process is alive' },
          { method: 'POST', path: '/api/traces', params: 'spans[]', response: 'Spans ingested' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the three pillars of observability?',
          answer: `**1. Logs**: Discrete events with context
\`\`\`
What: Specific event that happened
When: Timestamp
Where: Service, host, function
Why: Error details, stack traces

Use for:
- Debugging specific errors
- Audit trails
- Security analysis
\`\`\`

**2. Metrics**: Numerical measurements over time
\`\`\`
What: request_count, latency_p99, cpu_usage
Types:
- Counter: Only increases (requests total)
- Gauge: Can go up/down (active connections)
- Histogram: Distribution (latency buckets)

Use for:
- Dashboards and alerts
- Capacity planning
- SLO tracking
\`\`\`

**3. Traces**: Request journey across services
\`\`\`
          Order Service    Payment Service    Inventory
Request ─────┬──────────────────┬─────────────────┬─────
             │                  │                 │
             │◀────Span 1──────▶│                 │
             │                  │◀───Span 2──────▶│
             │                  │                 │
             ├──────────────────┴─────────────────┤
             │◀──────── Full Trace ──────────────▶│

Use for:
- Finding bottlenecks
- Debugging distributed issues
- Understanding dependencies
\`\`\`

**How they work together**:
1. Alert fires on high error rate (metric)
2. Check dashboard for affected endpoints (metrics)
3. Find trace for failed request (trace)
4. Examine logs for error details (logs)`
        },
        {
          question: 'What are SLIs, SLOs, and SLAs?',
          answer: `**SLI (Service Level Indicator)**: What you measure
\`\`\`
Examples:
- Request latency (p50, p95, p99)
- Error rate (5xx / total requests)
- Availability (successful requests / total)
- Throughput (requests per second)
\`\`\`

**SLO (Service Level Objective)**: Your target
\`\`\`
Examples:
- 99.9% of requests complete in < 200ms
- Error rate < 0.1%
- 99.95% availability per month

SLO = SLI + Target + Time Window
\`\`\`

**SLA (Service Level Agreement)**: Contract with consequences
\`\`\`
"99.9% monthly uptime, or customer gets credits"

SLA should be less strict than SLO:
- Internal SLO: 99.95%
- External SLA: 99.9%
- Buffer for safety
\`\`\`

**Error Budget**: How much failure is allowed
\`\`\`
SLO: 99.9% availability
Error Budget: 0.1% = 43.2 minutes/month

If budget exhausted:
- Freeze new features
- Focus on reliability

If budget remaining:
- Can take calculated risks
- Ship faster
\`\`\`

**Good SLOs**:
- Based on user experience, not server metrics
- Measurable and specific
- Achievable but ambitious
- Reviewed and adjusted`
        },
        {
          question: 'How does distributed tracing work?',
          answer: `**The Problem**: Request touches 10 services, where did it slow down?

**Solution**: Propagate trace context across services

\`\`\`
                        ┌─ trace_id: abc123 ─┐
                        │   span_id: 001     │
                        │   service: gateway │
                        │   duration: 250ms  │
                        └────────┬───────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
         ┌─────────▼─────────┐       ┌─────────▼─────────┐
         │ trace_id: abc123  │       │ trace_id: abc123  │
         │ span_id: 002      │       │ span_id: 003      │
         │ parent: 001       │       │ parent: 001       │
         │ service: users    │       │ service: orders   │
         │ duration: 50ms    │       │ duration: 180ms   │
         └───────────────────┘       └─────────┬─────────┘
                                               │
                                     ┌─────────▼─────────┐
                                     │ trace_id: abc123  │
                                     │ span_id: 004      │
                                     │ parent: 003       │
                                     │ service: payments │
                                     │ duration: 120ms   │
                                     └───────────────────┘
\`\`\`

**Context Propagation**:
\`\`\`python
# Service A creates trace
trace_id = generate_trace_id()
span = create_span(trace_id, "service-a")

# Pass context in headers
headers = {
    "X-Trace-Id": trace_id,
    "X-Span-Id": span.id
}
response = http.get("service-b", headers=headers)

# Service B continues trace
trace_id = request.headers["X-Trace-Id"]
parent_span = request.headers["X-Span-Id"]
span = create_span(trace_id, "service-b", parent=parent_span)
\`\`\`

**Sampling**: Not every request needs tracing
- Head-based: Decide at start (1% of requests)
- Tail-based: Sample interesting traces (errors, slow)

**Tools**: Jaeger, Zipkin, AWS X-Ray, Datadog APM`
        },
        {
          question: 'How do you design an alerting system?',
          answer: `**Alert Hierarchy**:
\`\`\`
                    ┌─────────────────┐
                    │   PAGE (P1)     │  Someone wakes up
                    │ User-impacting  │  Response: < 5 min
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  URGENT (P2)    │  Same-day response
                    │  Degradation    │  Response: < 4 hours
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  WARNING (P3)   │  Business hours
                    │  Attention      │  Response: < 1 day
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  INFO (P4)      │  Track in ticket
                    │  For tracking   │  Response: Best effort
                    └─────────────────┘
\`\`\`

**Good Alerts**:
- Actionable: Someone can do something about it
- Relevant: Indicates real user impact
- Clear: Includes context and runbook link
- Rare: Frequent alerts get ignored

**Alert Format**:
\`\`\`
[P1] Order Service Error Rate > 5%
Current: 8.5% (threshold: 5%)
Impact: Users cannot complete orders
Dashboard: https://grafana/orders
Runbook: https://wiki/order-errors
\`\`\`

**Common Alert Mistakes**:
- Too many alerts → alert fatigue
- Alerting on causes, not symptoms
- No runbook → time wasted investigating
- Static thresholds when anomaly detection needed

**Best Practices**:
- Alert on SLO burn rate, not raw metrics
- Page only for user-impacting issues
- Include context and runbook links
- Review and tune alerts regularly`
        },
        {
          question: 'What metrics should every service expose?',
          answer: `**The RED Method** (Request-focused):
\`\`\`
Rate:    Requests per second
Errors:  Failed requests per second
Duration: Request latency (p50, p95, p99)

# Prometheus examples
http_requests_total{status="2xx"}
http_requests_total{status="5xx"}
http_request_duration_seconds_bucket{le="0.1"}
\`\`\`

**The USE Method** (Resource-focused):
\`\`\`
Utilization: % time resource is busy
Saturation:  Queue depth / backlog
Errors:      Error events count

# Examples
cpu_utilization_percent
disk_queue_length
network_errors_total
\`\`\`

**The Four Golden Signals** (Google SRE):
\`\`\`
1. Latency: Time to serve a request
2. Traffic: Demand on the system
3. Errors: Rate of failed requests
4. Saturation: How "full" the system is
\`\`\`

**Standard Service Metrics**:
\`\`\`python
# Request metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}
http_requests_in_flight

# Resource metrics
process_cpu_seconds_total
process_resident_memory_bytes
process_open_fds

# Business metrics (custom)
orders_total
revenue_usd_total
active_users_gauge
\`\`\`

**Cardinality Warning**: Don't include high-cardinality labels
\`\`\`python
# Bad: user_id has millions of values
http_requests_total{user_id="12345"}

# Good: aggregate by meaningful dimensions
http_requests_total{endpoint="/api/orders", status="200"}
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Basic Monitoring Stack',
        description: 'Services → Collector → Prometheus, Jaeger, ELK → Grafana dashboards',
        svgTemplate: 'observability',
        problems: [
          'No distributed tracing',
          'Manual alert configuration',
          'Single points of failure',
          'Limited correlation between data types'
        ]
      },

      advancedImplementation: {
        title: 'Enterprise Observability Platform',
        svgTemplate: 'observabilityAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Services                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│   │  Service A  │    │  Service B  │    │  Service C  │                     │
│   │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │                     │
│   │ │OTel SDK │ │    │ │OTel SDK │ │    │ │OTel SDK │ │                     │
│   │ │Logs/Met/│ │    │ │Logs/Met/│ │    │ │Logs/Met/│ │                     │
│   │ │Traces   │ │    │ │Traces   │ │    │ │Traces   │ │                     │
│   │ └────┬────┘ │    │ └────┬────┘ │    │ └────┬────┘ │                     │
│   └──────┼──────┘    └──────┼──────┘    └──────┼──────┘                     │
└──────────┼──────────────────┼──────────────────┼────────────────────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OpenTelemetry Collector                                │
│              (Receive, Process, Export)                                     │
│   Sampling │ Batching │ Enrichment │ Routing                               │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Metrics     │  │      Logs       │  │     Traces      │
│   Prometheus /  │  │    Loki /       │  │    Jaeger /     │
│    Mimir        │  │  Elasticsearch  │  │     Tempo       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Grafana                                            │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│   │  Dashboards  │  │    Alerts    │  │   Explore    │                      │
│   │              │  │              │  │ (Ad-hoc      │                      │
│   │ - SLO burn  │  │ - PagerDuty  │  │  queries)    │                      │
│   │ - Service   │  │ - Slack      │  │              │                      │
│   │   health    │  │ - On-call    │  │              │                      │
│   └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Incident Management                                       │
│     PagerDuty │ Opsgenie │ Runbooks │ Postmortems                          │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'OpenTelemetry for unified instrumentation',
          'Collector for processing and routing',
          'Dedicated backends for each signal type',
          'Grafana for unified visualization',
          'Correlation between logs, metrics, traces',
          'Automated alerting and incident management'
        ]
      },

      discussionPoints: [
        {
          topic: 'Observability Stack Choices',
          points: [
            'Prometheus + Grafana: Open source, widely used',
            'Datadog: Fully managed, expensive but comprehensive',
            'New Relic: APM-focused, good tracing',
            'ELK Stack: Powerful for logs, complex to operate',
            'OpenTelemetry: Vendor-neutral instrumentation'
          ]
        },
        {
          topic: 'Cost Management',
          points: [
            'Log volume grows fast - be selective',
            'Sampling reduces trace storage costs',
            'Aggregate metrics, not store every event',
            'Set retention policies (hot, warm, cold)',
            'Consider serverless/managed vs self-hosted'
          ]
        },
        {
          topic: 'Incident Response',
          points: [
            'On-call rotation with clear escalation',
            'Runbooks for common issues',
            'Blameless postmortems',
            'Track MTTR (Mean Time To Resolve)',
            'Automate remediation where possible'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-observability', title: 'Observability Stack (Eraser)', description: 'OpenTelemetry to Prometheus metrics, ELK logs, Jaeger traces, Grafana dashboards, PagerDuty alerts', src: '/diagrams/monitoring/eraser-observability.png', type: 'cloud-architecture' }
      ],
      comparisonTables: [
        {
          id: 'metrics-vs-logs-vs-traces',
          title: 'Metrics vs Logs vs Traces',
          left: {
            title: 'Metrics',
            icon: 'barChart',
            color: '#10b981',
            items: [
              { label: 'What', value: 'Numeric measurements over time' },
              { label: 'Volume', value: 'Low — aggregated data points' },
              { label: 'Use For', value: 'Dashboards, alerts, trends' },
              { label: 'Tools', value: 'Prometheus, Datadog, CloudWatch' },
              { label: 'Retention', value: 'Months to years (cheap)' },
              { label: 'Example', value: 'CPU=75%, p99_latency=200ms, error_rate=0.5%' }
            ]
          },
          right: {
            title: 'Distributed Traces',
            icon: 'gitBranch',
            color: '#8b5cf6',
            items: [
              { label: 'What', value: 'End-to-end request journey across services' },
              { label: 'Volume', value: 'High — sampled (1-10% of requests)' },
              { label: 'Use For', value: 'Debugging latency, finding bottlenecks' },
              { label: 'Tools', value: 'Jaeger, Zipkin, OpenTelemetry, Datadog APM' },
              { label: 'Retention', value: 'Days to weeks (expensive)' },
              { label: 'Example', value: 'Request → API (50ms) → DB (120ms) → Cache (5ms)' }
            ]
          }
        },
        {
          id: 'metrics-vs-logs-vs-traces-2',
          title: 'Three Pillars of Observability',
          left: {
            title: 'Metrics',
            icon: 'barChart',
            color: '#10b981',
            items: [
              { label: 'What', value: 'Numeric measurements over time' },
              { label: 'Examples', value: 'CPU %, request count, latency p99' },
              { label: 'Storage', value: 'Compact — time-series DB' },
              { label: 'Query', value: 'Fast aggregation, dashboards' },
              { label: 'Tools', value: 'Prometheus, Datadog, CloudWatch' },
              { label: 'Best For', value: 'Alerting, trends, SLO tracking' }
            ]
          },
          right: {
            title: 'Distributed Traces',
            icon: 'gitBranch',
            color: '#8b5cf6',
            items: [
              { label: 'What', value: 'Request journey across services' },
              { label: 'Examples', value: 'Span tree: API → Auth → DB → Cache' },
              { label: 'Storage', value: 'Medium — sampled traces' },
              { label: 'Query', value: 'Trace ID lookup, service maps' },
              { label: 'Tools', value: 'Jaeger, Zipkin, AWS X-Ray, Honeycomb' },
              { label: 'Best For', value: 'Latency debugging, dependency mapping' }
            ]
          }
        }
      ],
      comparisonCards: [
        {
          title: 'Observability Stack Components',
          items: [
            { name: 'Metrics (Prometheus + Grafana)', description: 'Collect time-series metrics from services. Prometheus scrapes endpoints, Grafana visualizes dashboards. Best for: CPU, memory, request rates, error rates.' },
            { name: 'Logging (ELK Stack)', description: 'Logstash aggregates logs from services → Elasticsearch indexes and stores → Kibana visualizes and searches. Correlate with trace IDs across services.' },
            { name: 'Tracing (Jaeger/Zipkin)', description: 'Track requests as they flow through distributed services. Each span represents work in one service. Essential for debugging microservices latency.' },
            { name: 'Alerting (PagerDuty/OpsGenie)', description: 'Set thresholds on metrics. Trigger alerts when anomalies detected. Route to on-call engineers. Avoid alert fatigue with proper severity levels.' },
            { name: 'Health Checks', description: 'Periodic probes (HTTP /health endpoint, TCP checks) to verify service liveness and readiness. Load balancers and orchestrators use these to route traffic.' },
            { name: 'Synthetic Monitoring', description: 'Simulate user interactions from global locations to detect issues before users do. Measures end-to-end latency and availability from outside.' }
          ]
        }
      ],
      visualCards: [
        {
          id: 'golden-signals',
          title: 'The Four Golden Signals (Google SRE)',
          color: '#f59e0b',
          icon: 'barChart',
          items: [
            { label: 'Latency', value: 'Time to serve requests (p50, p95, p99)', bar: 90 },
            { label: 'Traffic', value: 'Requests per second (RPS)', bar: 80 },
            { label: 'Errors', value: 'Rate of failed requests (5xx)', bar: 85 },
            { label: 'Saturation', value: 'How full is the system (CPU, memory, disk)', bar: 75 }
          ]
        },
        {
          id: 'golden-signals-2',
          title: 'The Four Golden Signals (Google SRE)',
          color: '#8b5cf6',
          icon: 'barChart',
          items: [
            { label: 'Latency', value: 'Time to serve a request (p50/p95/p99)', bar: 90 },
            { label: 'Traffic', value: 'Requests per second (demand)', bar: 85 },
            { label: 'Errors', value: 'Rate of failed requests (5xx, timeouts)', bar: 80 },
            { label: 'Saturation', value: 'How full your service is (CPU, memory, queue)', bar: 75 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'alerting', name: 'Smart Alerting', icon: 'bell', color: '#ef4444',
          description: 'Alert on symptoms (user impact), not causes. Reduce noise.',
          useWhen: 'Always — but tune thresholds to avoid alert fatigue',
          example: 'Alert: error_rate > 1% for 5min. NOT: CPU > 80%'
        },
        {
          id: 'distributed-tracing', name: 'Distributed Tracing', icon: 'gitBranch', color: '#8b5cf6',
          description: 'Trace a request across multiple services with correlation IDs.',
          useWhen: 'Microservices, debugging cross-service latency',
          example: 'OpenTelemetry SDK → Jaeger/Zipkin collector → UI'
        },
        {
          id: 'centralized-logging', name: 'Centralized Logging', icon: 'list', color: '#3b82f6',
          description: 'Aggregate logs from all services into one searchable system.',
          useWhen: 'Multiple services, need to correlate events',
          example: 'ELK Stack (Elasticsearch + Logstash + Kibana) or Loki + Grafana'
        },
        {
          id: 'slo-sla', name: 'SLOs & SLAs', icon: 'target', color: '#10b981',
          description: 'Define measurable reliability targets and contractual guarantees.',
          useWhen: 'Any production service — internal SLOs, external SLAs',
          example: 'SLO: 99.9% availability. Error budget: 0.1% = 43.2 min/month'
        },
        {
          id: 'structured-logging', name: 'Structured Logging', icon: 'list', color: '#3b82f6',
          description: 'JSON logs with consistent fields for machine parsing.',
          useWhen: 'Always — unstructured logs are useless at scale',
          example: '{"level":"error","service":"auth","user_id":"123","msg":"token expired"}'
        },
        {
          id: 'alerting-strategy', name: 'Alerting Strategy', icon: 'bell', color: '#ef4444',
          description: 'SLO-based alerts on symptoms, not causes. Reduce alert fatigue.',
          useWhen: 'Production systems, on-call rotation',
          example: 'Alert when error rate > 1% for 5 min, not when CPU > 80%'
        },
        {
          id: 'distributed-tracing-detailed', name: 'Distributed Tracing', icon: 'gitBranch', color: '#8b5cf6',
          description: 'Propagate trace context across services to track request flow.',
          useWhen: 'Microservices, debugging latency, understanding dependencies',
          example: 'OpenTelemetry SDK → Jaeger/Zipkin collector → trace visualization'
        },
        {
          id: 'health-checks-mon', name: 'Health Checks', icon: 'heart', color: '#10b981',
          description: 'Expose /health and /ready endpoints for liveness and readiness.',
          useWhen: 'Kubernetes, load balancers, orchestration',
          example: '/health → 200 (alive), /ready → 503 (not ready to serve traffic)'
        }
      ]
    },
    {
      id: 'consistent-hashing',
      title: 'Consistent Hashing',
      icon: 'refreshCw',
      color: '#f59e0b',
      questions: 8,
      description: 'Ring-based hashing for distributed data distribution with minimal disruption.',
      concepts: ['Hash Ring', 'Virtual Nodes (Vnodes)', 'Token Assignment', 'Data Partitioning', 'Rebalancing', 'Replication on the Ring', 'Weighted Distribution', 'Hotspot Mitigation'],
      tips: [
        'Use virtual nodes (100-200 per physical node) for uniform distribution',
        'Consistent hashing minimizes key remapping when nodes join or leave',
        'It is the backbone of DynamoDB, Cassandra, and most distributed caches',
        'Without virtual nodes, data skew is almost guaranteed',
        'Replication is easy: replicate to the next N nodes clockwise on the ring',
        'Weighted virtual nodes let you assign more load to beefier machines',
        'Virtual nodes solve the problem of uneven distribution — map each physical node to 100-200 virtual positions on the ring',
        'Used in production by DynamoDB, Cassandra, and Akamai CDN for data partitioning and request routing',
        'When a node is added/removed, only K/N keys need to be remapped (K = total keys, N = total nodes)'
      ],

      introduction: `**Consistent hashing** is a distributed hashing technique that maps both data items and server nodes onto the same circular hash space, often called a **hash ring**. When a node is added or removed, only a small fraction of keys need to be remapped, making it far superior to naive modular hashing (hash(key) % N) where adding one server reshuffles almost every key.

The technique was first described by Karger et al. in 1997 and has since become a foundational building block of distributed systems. **Amazon DynamoDB**, **Apache Cassandra**, **Akamai CDN**, and **Memcached client libraries** all rely on consistent hashing to distribute data across nodes while keeping rebalancing overhead minimal.

In a system design interview, consistent hashing typically appears when you need to distribute data or traffic across a variable number of servers. Understanding the hash ring, **virtual nodes**, and how replication maps onto the ring will set your answer apart from candidates who only mention the concept by name.`,

      functionalRequirements: [
        'Map keys to nodes on a logical ring',
        'Minimize key movement when nodes are added or removed',
        'Support replication by assigning keys to multiple successor nodes',
        'Allow weighted distribution for heterogeneous hardware',
        'Provide O(log N) lookup for the responsible node',
        'Support dynamic membership changes without downtime'
      ],

      nonFunctionalRequirements: [
        'Even distribution: Standard deviation < 10% across nodes with vnodes',
        'Rebalance impact: < 1/N keys moved on single node change',
        'Lookup latency: < 1ms (in-memory ring)',
        'Availability: Ring metadata replicated to all clients',
        'Consistency: Membership protocol converges in seconds',
        'Scalability: Support thousands of physical nodes'
      ],

      dataModel: {
        description: 'Hash ring layout with virtual nodes',
        schema: `Hash Ring (0 to 2^32 - 1):

        0
        |
   vA1--+--vB1         Legend:
  /           \\         vA1, vA2 = Virtual nodes for Server A
 /             \\        vB1, vB2 = Virtual nodes for Server B
|               |       vC1, vC2 = Virtual nodes for Server C
vC2             vA2
 \\             /       Key placement rule:
  \\           /         hash(key) -> walk clockwise -> first vnode found
   vB2--+--vC1          owns that key
        |
      2^32/2

Node-to-VNode mapping:
  Server A (8 CPU)  -> 200 vnodes (more capacity = more vnodes)
  Server B (4 CPU)  -> 100 vnodes
  Server C (4 CPU)  -> 100 vnodes

Ring metadata (stored at each client/coordinator):
{
  ring: SortedMap<hash_position, physical_node>,
  nodes: {
    "A": { address: "10.0.0.1:9042", vnodes: 200, status: "UP" },
    "B": { address: "10.0.0.2:9042", vnodes: 100, status: "UP" },
    "C": { address: "10.0.0.3:9042", vnodes: 100, status: "UP" }
  },
  replication_factor: 3
}`
      },

      apiDesign: {
        description: 'Consistent hashing ring operations',
        endpoints: [
          { method: 'LOOKUP', path: 'ring.getNode(key)', params: 'key', response: 'Responsible node for the key' },
          { method: 'ADD', path: 'ring.addNode(node, vnodes)', params: 'node address, vnode count', response: 'Keys to migrate inward' },
          { method: 'REMOVE', path: 'ring.removeNode(node)', params: 'node id', response: 'Keys to redistribute' },
          { method: 'REPLICAS', path: 'ring.getReplicaNodes(key, N)', params: 'key, replica count', response: 'List of N distinct physical nodes' },
          { method: 'REBALANCE', path: 'ring.rebalance()', params: '-', response: 'Migration plan for skewed keys' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does consistent hashing differ from simple modular hashing?',
          answer: `**Modular hashing**: node = hash(key) % N
- Adding 1 server to a 10-server cluster remaps ~90% of keys
- Every scale event triggers a massive data migration

**Consistent hashing**: place nodes and keys on a ring
- Adding 1 server to a 10-server cluster remaps only ~1/N (~10%) of keys
- Only the new node's immediate neighbor gives up some keys

**Comparison**:

                 Modular (N=3 to N=4)
  Key   hash%3  hash%4   Moved?
  A       0       0       No
  B       1       2       Yes
  C       2       1       Yes
  D       0       3       Yes
  ... ~75% of keys move

                Consistent Hashing (add node D)
  Ring:  ...--A--B--C--...  ->  ...--A--D--B--C--...
  Only keys between A and D (previously owned by B) move to D
  ~1/N keys affected

**Bottom line**: Consistent hashing is essential whenever the number of nodes changes frequently, such as auto-scaling groups, distributed caches, or sharded databases.`
        },
        {
          question: 'What are virtual nodes and why are they necessary?',
          answer: `**Virtual nodes (vnodes)** map each physical server to many positions on the hash ring instead of just one.

**Problem without vnodes**:
- 3 servers placed at 3 points on the ring
- Distribution is uneven; one server may own 60% of the ring
- When a server dies, its entire load shifts to one neighbor

**With vnodes (e.g., 150 per server)**:

  Ring positions:
  A-1, B-1, C-1, A-2, B-2, C-2, A-3 ...
  (interleaved around the ring)

  Benefits:
  - Even load: each server owns roughly 1/N of the ring
  - Graceful failure: when Server A dies, its vnodes are spread
    across the ring, so load distributes to ALL remaining servers
  - Heterogeneous hardware: give Server A (16 CPU) 300 vnodes
    and Server B (8 CPU) 150 vnodes

**Trade-off**:
- More vnodes = better distribution
- More vnodes = larger ring metadata (memory)
- Sweet spot: 100-200 vnodes per physical node

**Real-world usage**:
- Cassandra uses 256 vnodes per node by default
- DynamoDB uses a similar virtual partitioning scheme
- Riak assigns vnodes evenly across the cluster`
        },
        {
          question: 'How does replication work on a consistent hash ring?',
          answer: `**Replication on the ring** is elegant: after finding the primary node for a key, walk clockwise and pick the next N-1 **distinct physical nodes** as replicas.

**Example (replication factor = 3)**:

  Ring layout (vnodes omitted for clarity):

       0
       |
    A--+--B
   /         \\
  |           |
  D           C
   \\         /
    E--+--F
       |

  hash("user:42") lands between A and B
  -> Primary: B
  -> Replica 1: C (next clockwise physical node)
  -> Replica 2: D (next distinct physical node)

**Important details**:
- Skip vnodes belonging to the same physical server
- This ensures replicas are on different machines
- Prefer rack-aware or zone-aware placement:
  place replicas in different availability zones

**Consistency levels** (Cassandra-style):
- Write to W of N replicas before acknowledging
- Read from R of N replicas
- If W + R > N, strong consistency (quorum)
- Common: N=3, W=2, R=2 (quorum reads and writes)

**Failure handling**:
- Hinted handoff: if a replica is down, a neighbor temporarily stores the write
- Read repair: on read, compare replicas and fix divergence
- Anti-entropy (Merkle trees): background full-data comparison`
        },
        {
          question: 'How do you handle adding or removing a node from the ring?',
          answer: `**Adding a node (scale out)**:

Step 1: Assign vnodes to the new node on the ring
Step 2: Identify keys that now belong to the new node
        (keys between new node's vnode and its predecessor)
Step 3: Stream those keys from the current owner
Step 4: Once transfer completes, update ring metadata
Step 5: New node starts serving requests

  Before:  ...--A--[keys]--B--...
  After:   ...--A--[some keys]--NEW--[rest]--B--...
  Only keys between A and NEW migrate from B to NEW

**Removing a node (scale in / failure)**:

Step 1: Mark node as leaving (or detect failure via gossip)
Step 2: Reassign its vnodes to successor nodes on the ring
Step 3: Stream data to new owners
Step 4: Remove from ring metadata

  Before:  ...--A--[keys]--LEAVING--[keys]--B--...
  After:   ...--A--[all keys]---------B--...
  B absorbs LEAVING's keys (with vnodes, spread across all)

**Rebalancing best practices**:
- Throttle data streaming to avoid saturating the network
- Use Merkle trees to transfer only differing data
- Perform rolling changes (one node at a time)
- Verify data integrity after migration with checksums`
        },
        {
          question: 'Where is consistent hashing used in real systems?',
          answer: `**Distributed databases**:
- **Cassandra**: Partitions data across nodes using consistent hashing with vnodes. Token ranges assigned per vnode.
- **DynamoDB**: Uses consistent hashing for partition placement across storage nodes.
- **Riak**: Hash ring is the core abstraction; vnodes are first-class citizens.

**Distributed caches**:
- **Memcached clients** (libmemcached, Ketama): Hash keys to server ring so adding/removing cache servers displaces minimal keys.
- **Redis Cluster**: Uses hash slots (0-16383) which is a variant of consistent hashing.

**CDNs and load balancers**:
- **Akamai**: Original consistent hashing paper was co-authored by Akamai founders. Routes content requests to nearest/best cache server.
- **NGINX upstream hashing**: Supports consistent hashing for upstream server selection.
- **Envoy proxy**: ketama-based consistent hashing for load balancing.

**Key takeaway for interviews**:
- Mention consistent hashing whenever you shard data or distribute traffic
- Always pair it with virtual nodes for even distribution
- Explain the replication strategy on top of the ring
- Discuss how it minimizes data movement during scaling events`
        },
        {
          question: 'What are the limitations of consistent hashing?',
          answer: `**Limitation 1: Non-uniform distribution without vnodes**
- With few nodes, arcs on the ring are unequal
- Fix: Use 100-200 virtual nodes per physical node

**Limitation 2: Metadata overhead**
- Every client must know the full ring map
- With 100 physical nodes x 200 vnodes = 20,000 entries
- Fix: Gossip protocol propagates changes; clients cache locally

**Limitation 3: Hotspot keys**
- A single extremely popular key always lands on one node
- Consistent hashing distributes keys, not load per key
- Fix: Application-level sharding of hot keys (e.g., append random suffix)

**Limitation 4: Range queries are difficult**
- Keys are hashed, so adjacent keys in the application may be on different nodes
- Fix: Use order-preserving hash (sacrifices uniformity) or a separate index

**Limitation 5: Cascading failure risk**
- If a node dies and its keys shift to the next node, that node may become overloaded
- Fix: Vnodes spread the load across many nodes, not just one neighbor

**Alternatives**:
- **Rendezvous hashing (HRW)**: Each key picks the node with the highest hash(key, node). Simple, no ring needed, but O(N) lookup.
- **Jump consistent hash**: Faster, zero memory, but only works with sequential node IDs (no named removal).`
        }
      ],

      basicImplementation: {
        title: 'Simple Hash Ring',
        description: 'Basic consistent hashing with one position per node on the ring',
        svgTemplate: 'simpleCache',
        problems: [
          'Uneven distribution with few nodes',
          'Single node absorbs all load on neighbor failure',
          'No support for heterogeneous hardware',
          'Poor rebalancing characteristics'
        ]
      },

      advancedImplementation: {
        title: 'Production Consistent Hash Ring',
        description: 'Virtual nodes, rack-aware replication, gossip-based membership, and Merkle tree anti-entropy for data verification.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Virtual nodes (100-200 per server) for uniform distribution',
          'Rack/AZ-aware replica placement for fault tolerance',
          'Gossip protocol for decentralized membership management',
          'Merkle trees for efficient data synchronization',
          'Hinted handoff for temporary failure handling'
        ]
      },

      discussionPoints: [
        {
          topic: 'When to Use Consistent Hashing',
          points: [
            'Distributed caches where servers are added/removed dynamically',
            'Database sharding with auto-scaling requirements',
            'CDN content routing to edge servers',
            'Load balancing with session affinity needs',
            'Any system where minimizing data movement matters'
          ]
        },
        {
          topic: 'Implementation Considerations',
          points: [
            'Choose a good hash function (MurmurHash, xxHash) for uniform distribution',
            'Tune vnode count: more vnodes = better balance but more metadata',
            'Gossip protocol keeps ring state eventually consistent across nodes',
            'Monitor distribution skew and rebalance proactively',
            'Consider jump consistent hash for simpler use cases with sequential IDs'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Draw the ring diagram and show key-to-node mapping',
            'Always mention virtual nodes unprompted to show depth',
            'Explain how replication maps onto the ring',
            'Compare with modular hashing to motivate the approach',
            'Mention real systems that use it (Cassandra, DynamoDB, Akamai)'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-hash-ring', title: 'Consistent Hashing Ring (Eraser)', description: 'Hash ring with nodes, virtual nodes, key mapping, and node removal handling', src: '/diagrams/consistent-hashing/eraser-hash-ring.png', type: 'cloud-architecture' }
      ],
      comparisonTables: [
        {
          id: 'naive-vs-consistent',
          title: 'Naive Hashing vs Consistent Hashing',
          left: {
            title: 'Naive Hash (hash % N)',
            icon: 'hash',
            color: '#ef4444',
            items: [
              { label: 'Formula', value: 'server = hash(key) % N servers' },
              { label: 'Add/Remove', value: 'Remaps almost ALL keys' },
              { label: 'Impact', value: '~100% cache miss on server change' },
              { label: 'Distribution', value: 'Uniform when N is stable' },
              { label: 'Complexity', value: 'O(1) lookup' },
              { label: 'Use When', value: 'Never changes — fixed server count' }
            ]
          },
          right: {
            title: 'Consistent Hashing',
            icon: 'target',
            color: '#10b981',
            items: [
              { label: 'Formula', value: 'Map keys + servers onto hash ring' },
              { label: 'Add/Remove', value: 'Remaps only K/N keys (minimal)' },
              { label: 'Impact', value: '~1/N keys remapped on change' },
              { label: 'Distribution', value: 'Use virtual nodes for uniformity' },
              { label: 'Complexity', value: 'O(log N) lookup with sorted ring' },
              { label: 'Use When', value: 'Dynamic clusters, distributed caches' }
            ]
          }
        },
        {
          id: 'hashing-vs-consistent',
          title: 'Standard Hashing vs Consistent Hashing',
          left: {
            title: 'Standard Hash (Modulo)',
            icon: 'hash',
            color: '#ef4444',
            items: [
              { label: 'Method', value: 'hash(key) % N servers' },
              { label: 'Add server', value: 'Nearly ALL keys remapped' },
              { label: 'Remove server', value: 'Nearly ALL keys remapped' },
              { label: 'Distribution', value: 'Uniform with good hash function' },
              { label: 'Complexity', value: 'O(1) lookup' },
              { label: 'Problem', value: 'Cache stampede on server changes' }
            ]
          },
          right: {
            title: 'Consistent Hashing',
            icon: 'circle',
            color: '#10b981',
            items: [
              { label: 'Method', value: 'Hash ring — keys map to next clockwise node' },
              { label: 'Add server', value: 'Only K/N keys remapped (minimal)' },
              { label: 'Remove server', value: 'Only K/N keys remapped (minimal)' },
              { label: 'Distribution', value: 'Use virtual nodes for uniformity' },
              { label: 'Complexity', value: 'O(log N) lookup with sorted ring' },
              { label: 'Advantage', value: 'Minimal disruption on topology changes' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'consistent-hash-use-cases',
          title: 'Where Consistent Hashing Is Used',
          color: '#10b981',
          icon: 'target',
          items: [
            { label: 'CDN (Akamai, Cloudflare)', value: 'Route to nearest cache server', bar: 95 },
            { label: 'Distributed Cache (Memcached)', value: 'Partition cache across nodes', bar: 90 },
            { label: 'Database Sharding', value: 'Assign data to shard nodes', bar: 85 },
            { label: 'Load Balancing', value: 'Sticky routing with minimal disruption', bar: 75 },
            { label: 'Kafka Partitioning', value: 'Assign partitions to consumers', bar: 70 },
            { label: 'DynamoDB / Cassandra', value: 'Token ring for data placement', bar: 80 }
          ]
        },
        {
          id: 'consistent-hashing-usage',
          title: 'Where Consistent Hashing Is Used',
          color: '#10b981',
          icon: 'circle',
          items: [
            { label: 'Amazon DynamoDB', value: 'Partition data across nodes', bar: 95 },
            { label: 'Apache Cassandra', value: 'Data distribution ring', bar: 90 },
            { label: 'Memcached clients', value: 'Distribute cache keys', bar: 80 },
            { label: 'CDN edge servers', value: 'Route content to nearest cache', bar: 75 },
            { label: 'Load balancers', value: 'Sticky routing with minimal remap', bar: 70 },
            { label: 'Discord', value: 'Route messages to correct server', bar: 65 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'virtual-nodes', name: 'Virtual Nodes', icon: 'layers', color: '#3b82f6',
          description: 'Map each physical server to multiple points on the hash ring.',
          useWhen: 'Uneven key distribution, heterogeneous server capacities',
          example: '150-200 virtual nodes per server for even distribution'
        },
        {
          id: 'bounded-loads', name: 'Bounded Loads', icon: 'shield', color: '#8b5cf6',
          description: 'Cap the load on any single node, redistribute overflow.',
          useWhen: 'Hot key problem, prevent single-node overload',
          example: 'Google\'s "Consistent Hashing with Bounded Loads" paper'
        },
        {
          id: 'jump-hash', name: 'Jump Consistent Hash', icon: 'zap', color: '#f59e0b',
          description: 'O(ln n) algorithm, perfect uniformity, no memory overhead.',
          useWhen: 'Only adding servers (not removing), simple partitioning',
          example: 'Google\'s Jump Hash — ideal for append-only clusters'
        },
        {
          id: 'virtual-nodes-detailed', name: 'Virtual Nodes', icon: 'layers', color: '#10b981',
          description: 'Each physical node maps to multiple points on the hash ring.',
          useWhen: 'Uneven distribution with few physical nodes',
          example: '3 servers × 100 virtual nodes = 300 points on ring for uniform spread'
        },
        {
          id: 'hash-ring', name: 'Hash Ring', icon: 'circle', color: '#3b82f6',
          description: 'Circular space where both keys and servers are hashed to positions.',
          useWhen: 'Distributed caching, database sharding, load balancing',
          example: 'SHA-256 hash of key/server → position on 0 to 2^32 ring'
        },
        {
          id: 'rebalancing', name: 'Rebalancing', icon: 'refreshCw', color: '#f59e0b',
          description: 'Automatically redistribute only affected keys when nodes change.',
          useWhen: 'Node additions/removals, capacity changes',
          example: 'Add node → only keys between new node and predecessor move'
        }
      ]
    },
    {
      id: 'bloom-filters',
      title: 'Bloom Filters',
      icon: 'filter',
      color: '#8b5cf6',
      questions: 7,
      description: 'Space-efficient probabilistic data structure for membership testing.',
      concepts: ['Bit Array', 'Multiple Hash Functions', 'False Positive Rate', 'No False Negatives', 'Counting Bloom Filters', 'Scalable Bloom Filters', 'Cuckoo Filters', 'Applications in Databases'],
      tips: [
        'Bloom filters can say "definitely not in set" or "probably in set" -- never the reverse',
        'Use them as a cheap first check before expensive operations (disk reads, network calls)',
        'Tune the bit array size and hash count to control the false positive rate',
        'They cannot delete elements -- use counting Bloom filters if deletion is needed',
        'Cassandra, HBase, and Chrome all use Bloom filters in production',
        'A 1% false positive rate requires ~10 bits per element'
      ],

      introduction: `A **Bloom filter** is a space-efficient probabilistic data structure that tests whether an element is a member of a set. It can tell you with certainty that an element is **not** in the set, but it can only tell you that an element is **probably** in the set. This one-sided error property makes it incredibly useful as a gatekeeper that prevents unnecessary expensive operations.

Invented by Burton Howard Bloom in 1970, the data structure uses a **bit array** of m bits and **k independent hash functions**. To add an element, you hash it with all k functions and set the corresponding bits to 1. To query, you check if all k bit positions are 1. If any bit is 0, the element is definitely absent. If all are 1, the element is probably present -- a **false positive** is possible because other elements may have set those same bits.

Bloom filters are used extensively in production systems. **Google Chrome** uses them to check URLs against a list of malicious sites without sending every URL to Google's servers. **Apache Cassandra** and **HBase** use Bloom filters to avoid unnecessary disk reads for SSTables that do not contain a requested key. **Medium** uses them to avoid recommending articles a user has already read. The key interview insight is recognizing when a cheap probabilistic check can save expensive I/O.`,

      functionalRequirements: [
        'Add elements to the set efficiently',
        'Query membership with guaranteed no false negatives',
        'Support configurable false positive rate',
        'Handle millions to billions of elements',
        'Merge multiple Bloom filters via bitwise OR',
        'Provide space usage far below storing actual elements'
      ],

      nonFunctionalRequirements: [
        'Space: ~10 bits per element for 1% false positive rate',
        'Insert time: O(k) hash computations, typically < 1 microsecond',
        'Query time: O(k) hash computations, typically < 1 microsecond',
        'False positive rate: Configurable, typically 0.1% to 5%',
        'No false negatives: 0% miss rate guaranteed',
        'Scalability: Fixed memory regardless of element size'
      ],

      dataModel: {
        description: 'Bloom filter structure and operation',
        schema: `Bloom Filter Structure:
  m = bit array size (e.g., 1,000,000 bits = 125 KB)
  k = number of hash functions (e.g., 7)
  n = number of inserted elements

Bit Array (m = 16, k = 3 for illustration):

  Index:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  Bits:  [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0]
                ^     ^        ^              -- "hello" hashes
                            ^     ^        ^  -- "world" hashes

  add("hello"):
    h1("hello") = 2, h2("hello") = 4, h3("hello") = 7
    Set bits 2, 4, 7 to 1

  query("hello") -> bits 2,4,7 all = 1 -> "probably yes"
  query("xyz")   -> bit 5 = 0          -> "definitely no"

Optimal parameters:
  m = -(n * ln(p)) / (ln(2))^2
  k = (m / n) * ln(2)

  Where p = desired false positive rate

  Example: n = 1M elements, p = 1%
  m = ~9.6M bits (1.2 MB)
  k = 7 hash functions`
      },

      apiDesign: {
        description: 'Bloom filter operations',
        endpoints: [
          { method: 'ADD', path: 'bloom.add(element)', params: 'element', response: 'void (bits set)' },
          { method: 'QUERY', path: 'bloom.mightContain(element)', params: 'element', response: 'true (maybe) or false (definitely not)' },
          { method: 'MERGE', path: 'bloom.union(otherBloom)', params: 'another bloom filter', response: 'Merged bloom filter (bitwise OR)' },
          { method: 'SIZE', path: 'bloom.estimateCount()', params: '-', response: 'Approximate number of inserted elements' },
          { method: 'RESET', path: 'bloom.clear()', params: '-', response: 'All bits set to 0' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does a Bloom filter work step by step?',
          answer: `**Setup**:
- Create a bit array of m bits, all initialized to 0
- Choose k independent hash functions (h1, h2, ... hk)

**Insert(element)**:
- Compute h1(element), h2(element), ... hk(element)
- Each hash returns an index in [0, m-1]
- Set all k bit positions to 1

**Query(element)**:
- Compute all k hash values for the element
- Check each corresponding bit
- If ANY bit is 0 -> element is DEFINITELY NOT in the set
- If ALL bits are 1 -> element is PROBABLY in the set

**Example**:
  m = 10 bits, k = 3 hash functions

  Insert("cat"):
    h1("cat")=1, h2("cat")=4, h3("cat")=7
    Bits: [0,1,0,0,1,0,0,1,0,0]

  Insert("dog"):
    h1("dog")=2, h2("dog")=4, h3("dog")=9
    Bits: [0,1,1,0,1,0,0,1,0,1]

  Query("cat"):  bits 1,4,7 = 1,1,1 -> probably yes (CORRECT)
  Query("bird"): h1=1, h2=2, h3=8 -> bit 8=0 -> definitely no (CORRECT)
  Query("fox"):  h1=1, h2=4, h3=9 -> 1,1,1 -> probably yes (FALSE POSITIVE)

**Why false positives happen**: Other elements already set those bits.
**Why no false negatives**: If the element was inserted, its bits MUST be 1.`
        },
        {
          question: 'How do you choose the optimal size and number of hash functions?',
          answer: `**Given**:
- n = expected number of elements
- p = desired false positive probability

**Optimal bit array size (m)**:
  m = -(n * ln(p)) / (ln(2))^2
  Approximately: m = -1.44 * n * log2(p)

**Optimal number of hash functions (k)**:
  k = (m / n) * ln(2)
  Approximately: k = 0.693 * (m / n)

**Practical examples**:

  | Elements (n) | FP Rate (p) | Bits (m) | Hashes (k) | Memory   |
  |-------------|-------------|----------|------------|----------|
  | 1 million   | 1%          | 9.6M     | 7          | 1.2 MB   |
  | 1 million   | 0.1%        | 14.4M    | 10         | 1.8 MB   |
  | 10 million  | 1%          | 96M      | 7          | 12 MB    |
  | 100 million | 1%          | 960M     | 7          | 120 MB   |
  | 1 billion   | 1%          | 9.6B     | 7          | 1.2 GB   |

**Key insight**: Each 10x increase in elements requires 10x more memory. Each 10x improvement in FP rate requires ~1.44x more memory -- improving accuracy is cheap.

**Hash function tips**:
- Use MurmurHash3 or xxHash (fast, good distribution)
- Can derive k hashes from 2 base hashes: hi(x) = h1(x) + i*h2(x)
- This "double hashing" trick avoids computing k independent hashes`
        },
        {
          question: 'What are the real-world applications of Bloom filters?',
          answer: `**1. Database read optimization (Cassandra, HBase, LevelDB)**:
- Each SSTable/HFile has an associated Bloom filter
- Before reading an SSTable from disk, check the Bloom filter
- If the filter says "not present," skip the disk read entirely
- Saves enormous I/O for point lookups across many SSTables

**2. Web browser safe browsing (Google Chrome)**:
- Chrome maintains a Bloom filter of known malicious URLs
- Every URL is checked locally against the filter
- Only if the filter says "maybe" does Chrome query Google's servers
- Protects privacy: most URLs never leave the browser

**3. Content recommendation deduplication (Medium, LinkedIn)**:
- Store a Bloom filter of articles/posts a user has seen
- Before recommending, check the filter to avoid repeats
- False positives just mean skipping a good recommendation (acceptable)

**4. Network routing (Squid proxy, CDN caches)**:
- Check whether a URL is cached before forwarding the request
- Reduces cache miss lookups

**5. Spell checking and dictionary lookups**:
- Store a dictionary in a Bloom filter for fast "is this a word?" checks
- False positives accept a non-word occasionally (acceptable for suggestion systems)

**6. Distributed systems deduplication**:
- Detect duplicate messages/events across distributed workers
- Each worker maintains a local Bloom filter of processed message IDs`
        },
        {
          question: 'What are counting Bloom filters and when do you need them?',
          answer: `**Problem with standard Bloom filters**: You cannot delete elements. Setting a bit to 0 might affect other elements that share that bit position.

**Counting Bloom filter**: Replace each bit with a small counter (typically 4 bits).

  Standard:   [0, 1, 0, 1, 1, 0, 0, 1]    (1 bit each)
  Counting:   [0, 2, 0, 1, 3, 0, 0, 1]    (4 bits each)

**Operations**:
- Insert: increment counters at k positions
- Delete: decrement counters at k positions
- Query: check if all k counters > 0

**Trade-offs**:
- 4x more memory (4 bits per slot vs 1 bit)
- Counter overflow risk (4 bits = max 15; rare in practice)
- Enables deletion, which standard Bloom filters cannot do

**Alternative: Cuckoo filter**
- Supports deletion natively
- Better space efficiency than counting Bloom filters
- Slightly higher lookup time
- Used when deletion is a hard requirement

**When to use counting Bloom filters**:
- Cache invalidation: add URLs to filter, remove when cache expires
- Session tracking: add session IDs, remove on logout
- Any use case where the membership set changes over time

**When standard Bloom filter suffices**:
- Append-only sets (log deduplication, seen articles)
- Sets that are rebuilt periodically (just create a new filter)`
        },
        {
          question: 'How do Bloom filters compare to other data structures for set membership?',
          answer: `**Comparison table**:

  | Structure       | Space      | FP Rate | FN Rate | Delete? | Lookup  |
  |----------------|------------|---------|---------|---------|---------|
  | HashSet        | O(n*size)  | 0%      | 0%      | Yes     | O(1)    |
  | Bloom Filter   | O(n) bits  | >0%     | 0%      | No      | O(k)    |
  | Counting BF    | O(4n) bits | >0%     | 0%      | Yes     | O(k)    |
  | Cuckoo Filter  | O(n) bits  | >0%     | 0%      | Yes     | O(1)    |
  | Sorted Array   | O(n*size)  | 0%      | 0%      | Yes     | O(logn) |

**Space comparison for 1M elements**:
- HashSet (64-byte objects): ~64 MB
- Bloom filter (1% FP): ~1.2 MB (53x smaller)
- Cuckoo filter (1% FP): ~1.5 MB

**When to use a Bloom filter over a HashSet**:
- Memory is constrained (embedded systems, mobile)
- False positives are acceptable
- Checking billions of elements
- Need to transmit the set over the network (compact)

**When NOT to use a Bloom filter**:
- Need zero false positives (financial transactions)
- Need to enumerate set members
- Need to delete elements frequently (use Cuckoo filter)
- Set is small enough to fit in a HashSet comfortably`
        }
      ],

      basicImplementation: {
        title: 'Simple Bloom Filter',
        description: 'Single bit array with k hash functions for basic membership testing',
        svgTemplate: 'simpleCache',
        problems: [
          'Cannot delete elements once inserted',
          'False positive rate increases as more elements are added',
          'Fixed size -- must estimate element count upfront',
          'No way to enumerate the stored elements'
        ]
      },

      advancedImplementation: {
        title: 'Production Bloom Filter in LSM Storage',
        description: 'Per-SSTable Bloom filters in an LSM-tree database (Cassandra/LevelDB) to skip unnecessary disk reads during point queries.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Each SSTable has its own Bloom filter stored in memory',
          'Point lookup checks all Bloom filters before any disk read',
          'False positive only causes one unnecessary disk read',
          'Filters are rebuilt during compaction',
          'Massive I/O savings: often 90%+ disk reads eliminated'
        ]
      },

      discussionPoints: [
        {
          topic: 'Sizing and Tuning',
          points: [
            '10 bits per element gives ~1% false positive rate',
            '15 bits per element gives ~0.1% false positive rate',
            'More hash functions is not always better -- there is an optimal k',
            'Monitor actual FP rate in production and resize if needed',
            'Use scalable Bloom filters if element count is unpredictable'
          ]
        },
        {
          topic: 'Variants and Alternatives',
          points: [
            'Counting Bloom filters: Support deletion with counter arrays',
            'Cuckoo filters: Better space efficiency, supports deletion',
            'Quotient filters: Cache-friendly, supports merging and deletion',
            'Scalable Bloom filters: Grow dynamically by chaining filters',
            'Ribbon filters: Newer, more space-efficient alternative from RocksDB'
          ]
        },
        {
          topic: 'Common Interview Contexts',
          points: [
            'Design a URL shortener: check if short URL already exists',
            'Design a web crawler: avoid revisiting URLs',
            'Design a recommendation system: filter already-seen items',
            'Design a database: reduce unnecessary disk I/O',
            'Design a CDN: check if content is cached at an edge node'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'bloom-vs-hash-set',
          title: 'Bloom Filter vs Hash Set',
          left: {
            title: 'Bloom Filter',
            icon: 'filter',
            color: '#8b5cf6',
            items: [
              { label: 'Memory', value: '~10 bits per element (tiny)' },
              { label: 'False Positives', value: 'Yes — "maybe exists"' },
              { label: 'False Negatives', value: 'Never — "definitely not" is certain' },
              { label: 'Deletion', value: 'Not supported (standard)' },
              { label: 'Lookup', value: 'O(k) — k hash functions' },
              { label: 'Best For', value: 'Pre-filtering, reducing expensive lookups' }
            ]
          },
          right: {
            title: 'Hash Set',
            icon: 'database',
            color: '#3b82f6',
            items: [
              { label: 'Memory', value: 'Full element size (large)' },
              { label: 'False Positives', value: 'None — exact membership' },
              { label: 'False Negatives', value: 'None — exact membership' },
              { label: 'Deletion', value: 'Supported' },
              { label: 'Lookup', value: 'O(1) average' },
              { label: 'Best For', value: 'Exact lookups, small datasets' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'bloom-filter-usage',
          title: 'Where Bloom Filters Are Used',
          color: '#8b5cf6',
          icon: 'filter',
          items: [
            { label: 'Google Chrome', value: 'Check malicious URLs', bar: 90 },
            { label: 'Apache Cassandra', value: 'Skip SSTables without key', bar: 85 },
            { label: 'Bitcoin', value: 'SPV node transaction filtering', bar: 70 },
            { label: 'Medium', value: 'Avoid recommending read articles', bar: 65 },
            { label: 'Akamai CDN', value: 'Cache one-hit-wonders filter', bar: 75 },
            { label: 'PostgreSQL', value: 'Join optimization', bar: 55 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'counting-bloom', name: 'Counting Bloom Filter', icon: 'hash', color: '#8b5cf6',
          description: 'Use counters instead of bits to support deletion.',
          useWhen: 'Need to remove elements from bloom filter',
          example: 'Increment counters on add, decrement on remove'
        },
        {
          id: 'bloom-pre-filter', name: 'Pre-filter Pattern', icon: 'filter', color: '#10b981',
          description: 'Check bloom filter before expensive DB/disk lookup.',
          useWhen: 'Frequent lookups for non-existent keys',
          example: 'Check if username exists → bloom says "no" → skip DB query'
        }
      ],
      comparisonCards: [
        {
          title: 'Bloom Filter Applications',
          items: [
            { name: 'Cache Penetration Prevention', description: 'Check Bloom filter before hitting DB for non-existent keys. If filter says "not in set", skip the DB query entirely. Eliminates cache penetration attacks.' },
            { name: 'Database Read Optimization', description: 'Cassandra uses Bloom filters to check if an SSTable might contain a key before reading from disk. Avoids unnecessary I/O on SSTables that don\'t have the key.' },
            { name: 'Web Crawlers (URL Dedup)', description: 'Track visited URLs without storing all strings. Bloom filter says "probably visited" or "definitely not visited". Saves massive memory in large crawls.' },
            { name: 'Malicious URL Detection', description: 'Chrome\'s Safe Browsing uses Bloom filter to quickly check if a URL might be malicious before doing a full lookup. False positives trigger a server check.' },
            { name: 'Spell Checkers', description: 'Dictionary stored as Bloom filter. O(1) check if word exists. False positives just mean a misspelled word isn\'t flagged.' },
            { name: 'Network Routers', description: 'Check if a packet matches any rule in a large ACL set. Bloom filter provides fast preliminary check before expensive rule matching.' }
          ]
        }
      ],
      staticDiagrams: [
        {
          id: 'bloom-filter-how',
          title: 'How Bloom Filters Work',
          description: 'Hash functions, bit arrays, and false positive trade-offs in Bloom filters',
          src: '/diagrams/bloom-filters/bloom-filter-how-it-works.svg',
          type: 'architecture'
        }
      ]
    },
    {
      id: 'data-partitioning',
      title: 'Data Partitioning',
      icon: 'grid',
      color: '#3b82f6',
      questions: 9,
      description: 'Strategies for splitting data across multiple nodes for scale and performance.',
      concepts: ['Horizontal Partitioning (Sharding)', 'Vertical Partitioning', 'Directory-Based Partitioning', 'Hash-Based Partitioning', 'Range-Based Partitioning', 'Composite Partitioning', 'Hotspot Avoidance', 'Rebalancing Strategies'],
      tips: [
        'Choose your partition key based on your most common query pattern',
        'Avoid cross-partition queries -- they are expensive in every system',
        'Hash partitioning gives even distribution; range partitioning supports range queries',
        'Directory-based partitioning is the most flexible but adds a lookup hop',
        'Always plan for rebalancing before you need it',
        'Monitor partition sizes -- skewed partitions defeat the purpose of sharding'
      ],

      staticDiagrams: [
        {
          id: 'sharding-algorithms',
          title: 'Sharding Algorithms',
          description: 'Range-based, Hash-based, Consistent Hashing, and Virtual Bucket sharding strategies',
          src: '/diagrams/data-partitioning/sharding-algorithms.svg',
          type: 'architecture'
        }
      ],

      introduction: `**Data partitioning** (also called sharding) is the technique of splitting a large dataset across multiple machines so that no single node holds all the data. It is the primary mechanism for horizontal scaling of databases and storage systems. Without partitioning, you eventually hit the limits of a single machine's storage, memory, or I/O capacity.

There are three broad strategies: **horizontal partitioning** splits rows across nodes (different users on different shards), **vertical partitioning** splits columns (user profiles on one service, user activity on another), and **directory-based partitioning** uses a lookup service to map keys to partitions. Each approach has distinct trade-offs in terms of query flexibility, data distribution, and operational complexity.

In system design interviews, data partitioning is almost always relevant when the scale exceeds what a single database can handle. The key decisions are the **partition key** (what field to shard by), the **partitioning strategy** (hash, range, or directory), and how to handle **cross-partition queries** and **rebalancing**. Getting these decisions right is the difference between a scalable system and a distributed monolith.`,

      functionalRequirements: [
        'Distribute data evenly across partitions',
        'Support the primary query pattern efficiently within a single partition',
        'Handle cross-partition queries when necessary',
        'Enable adding and removing partitions dynamically',
        'Maintain referential integrity within partitions',
        'Support partition-level backup and recovery'
      ],

      nonFunctionalRequirements: [
        'Distribution: < 10% skew between largest and smallest partitions',
        'Latency: Single-partition queries < 10ms',
        'Cross-partition queries: < 100ms (should be rare)',
        'Rebalancing: < 5% data movement per node change',
        'Availability: Partition failure affects only 1/N of data',
        'Scalability: Linear throughput increase with partition count'
      ],

      dataModel: {
        description: 'Partitioning strategies comparison',
        schema: `Horizontal Partitioning (Sharding):
  Same schema on every shard, different rows

  Shard 1 (users A-M)     Shard 2 (users N-Z)
  ┌──────────────────┐    ┌──────────────────┐
  │ id  name  email  │    │ id  name  email  │
  │ 1   Alice  a@..  │    │ 3   Nancy  n@..  │
  │ 2   Bob    b@..  │    │ 4   Oscar  o@..  │
  └──────────────────┘    └──────────────────┘

Vertical Partitioning:
  Different columns on different services

  User Service           Activity Service
  ┌───────────────┐     ┌──────────────────────┐
  │ id name email │     │ user_id action  ts    │
  │ 1  Alice a@.. │     │ 1      login  12:00  │
  │ 2  Bob   b@.. │     │ 2      view   12:05  │
  └───────────────┘     └──────────────────────┘

Directory-Based Partitioning:
  Lookup service maps keys to shards

  ┌───────────────────┐
  │  Directory Service │
  │  key_range -> shard│
  │  A-F -> Shard 1    │
  │  G-M -> Shard 2    │
  │  N-Z -> Shard 3    │
  └───────────────────┘`
      },

      apiDesign: {
        description: 'Partition-aware data access patterns',
        endpoints: [
          { method: 'GET', path: '/api/users/:id', params: 'id (hashed to shard)', response: 'User from correct shard' },
          { method: 'GET', path: '/api/users?country=US', params: 'requires scatter-gather', response: 'Results from all shards merged' },
          { method: 'POST', path: '/api/users', params: 'user data', response: 'Created on shard determined by partition key' },
          { method: 'GET', path: '/api/partitions/status', params: '-', response: 'Partition sizes, load, health' },
          { method: 'POST', path: '/api/partitions/rebalance', params: 'strategy', response: 'Migration plan' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the main partitioning strategies and when should you use each?',
          answer: `**1. Hash-Based Partitioning**:
  partition = hash(key) % num_partitions

- Even distribution of data
- No range queries on partition key
- Adding/removing partitions requires rehashing (mitigate with consistent hashing)
- Best for: User data by user_id, key-value stores

**2. Range-Based Partitioning**:
  partition = lookup_range(key)
  Example: dates 2024-01 to 2024-03 -> Shard 1

- Supports range queries on partition key
- Risk of hotspots (new data goes to one partition)
- Easy to understand and implement
- Best for: Time-series data, alphabetical ranges, sequential IDs

**3. Directory-Based Partitioning**:
  partition = directory.lookup(key)

- Most flexible (any mapping)
- Lookup service adds latency and is a potential bottleneck
- Easy to rebalance (just update the directory)
- Best for: Complex mapping rules, multi-tenant systems

**4. Composite Partitioning**:
  partition = hash(user_id) for shard, then range(timestamp) within shard

- Combines benefits of multiple strategies
- Common in Cassandra: partition key (hash) + clustering key (range)
- Best for: Queries that need both point and range access

**Decision guide**:
- Default to hash-based for even distribution
- Use range-based when range queries are the primary access pattern
- Use directory-based when you need maximum flexibility`
        },
        {
          question: 'How do you choose a good partition key?',
          answer: `**The partition key determines everything**: query routing, data distribution, and scalability limits.

**Good partition key properties**:
- High cardinality (many distinct values)
- Even distribution (no value dominates)
- Aligns with query patterns (most queries hit one partition)

**Examples by use case**:

| System | Good Key | Why | Bad Key | Why Bad |
|--------|----------|-----|---------|---------|
| Social media | user_id | Even, query by user | country | Skewed (US is huge) |
| E-commerce | order_id | Unique per order | status | Only 3-5 values |
| Chat app | conversation_id | Messages grouped logically | timestamp | All writes to one shard |
| IoT platform | device_id | Even across devices | sensor_type | Few types, many devices |

**Hotspot detection and avoidance**:

  Problem: Celebrity user_id = 1M followers, 100x more writes

  Solutions:
  - Salting: Append random suffix (user_123_0, user_123_1)
    Spreads hot key across multiple partitions
    Trade-off: Reads must query all salt values

  - Secondary index partition: Maintain local index per shard

  - Application-level caching: Cache hot keys in Redis

**Anti-pattern**: Composite keys that are too specific
  (user_id, timestamp, action) -> too many partitions, tiny each`
        },
        {
          question: 'How do you handle cross-partition queries?',
          answer: `**The fundamental challenge**: Data is split, but queries may need data from multiple partitions.

**Strategy 1: Scatter-Gather**:
  Query ALL partitions in parallel, merge results

  Client -> Coordinator
               |
     +---------+---------+
     |         |         |
  Shard 1   Shard 2   Shard 3
     |         |         |
     +---------+---------+
               |
          Merge & Sort

- Simple to implement
- Latency = slowest shard (tail latency problem)
- Acceptable for occasional queries, not for every request

**Strategy 2: Global Secondary Index**:
  Maintain a separate index that spans all partitions

  Shard 1: users by user_id
  Shard 2: users by user_id
  Global Index: email -> (shard, user_id)

- Fast lookups on indexed fields
- Index updates add write overhead
- Index itself may need to be partitioned

**Strategy 3: Denormalization**:
  Store data redundantly to avoid cross-partition reads

  Shard by user_id AND also shard by city
  Write to both when user updates their city

- Fastest reads (always single partition)
- Complex writes (must update multiple copies)
- Eventual consistency between copies

**Strategy 4: Change Data Capture (CDC)**:
  Stream changes to a search index (Elasticsearch)

  Sharded DB -> CDC -> Elasticsearch
  Point queries -> Sharded DB
  Complex queries -> Elasticsearch

**Best practice**: Design partitions so 95%+ of queries hit a single partition. Use scatter-gather or secondary systems for the rest.`
        },
        {
          question: 'How does rebalancing work when you add or remove partitions?',
          answer: `**Why rebalance**: Partitions grow unevenly, new nodes are added, or nodes fail.

**Strategy 1: Fixed Number of Partitions**:
  Create more partitions than nodes upfront

  Initially: 3 nodes, 12 partitions
  Node A: P1, P2, P3, P4
  Node B: P5, P6, P7, P8
  Node C: P9, P10, P11, P12

  Add Node D:
  Node A: P1, P2, P3
  Node B: P5, P6, P7
  Node C: P9, P10, P11
  Node D: P4, P8, P12    <- takes 1 from each

- Used by: Elasticsearch, Riak, Couchbase
- Simple, predictable
- Must choose partition count upfront

**Strategy 2: Dynamic Partitioning**:
  Split partitions when they grow too large

  P1 (10GB) -> Split -> P1a (5GB) + P1b (5GB)
  P2 (1GB)  -> No change

- Used by: HBase, MongoDB
- Adapts to data distribution
- Partition count grows with data

**Strategy 3: Proportional to Node Count**:
  Each node gets a fixed number of partitions

  Add node -> some partitions migrate to it
  Each node always owns (total_partitions / node_count) partitions

- Used by: Cassandra (with vnodes)
- Automatic, even distribution
- Combined with consistent hashing

**Rebalancing best practices**:
- Throttle data transfer to avoid degrading live traffic
- Rebalance during low-traffic windows when possible
- Never rebalance automatically without monitoring -- detect and alert first
- Verify data integrity after migration with checksums`
        },
        {
          question: 'What are the challenges and trade-offs of data partitioning?',
          answer: `**Challenge 1: Joins across partitions**
- SQL JOINs do not work across shards
- Solutions: Denormalize, use application-level joins, or use a distributed SQL layer (CockroachDB, Vitess)

**Challenge 2: Referential integrity**
- Foreign keys cannot span partitions
- Solution: Enforce at application level, accept eventual consistency

**Challenge 3: Unique constraints across shards**
- Cannot enforce global uniqueness (e.g., unique email)
- Solutions: Central uniqueness service, deterministic shard assignment for the unique field

**Challenge 4: Rebalancing complexity**
- Moving data between partitions while serving live traffic
- Solution: Use consistent hashing, plan for rebalancing, throttle migrations

**Challenge 5: Operational overhead**
- More machines, more things to monitor and maintain
- Backups, schema migrations, and upgrades are per-shard
- Solution: Automate with orchestration tools (Vitess, Citus)

**Decision framework: When to partition**:
- Single-node database handles your load? Do NOT partition.
- Read-heavy? Try read replicas first.
- Write-heavy or storage-limited? Partition.
- Complex queries across all data? Consider a search index alongside sharding.

**The golden rule**: Partition as late as possible, but plan for it from day one. Choose a partition key early even if you run on one node -- it is much harder to change later.`
        }
      ],

      basicImplementation: {
        title: 'Simple Hash-Based Sharding',
        description: 'Application routes queries to shards using hash(key) % N, with each shard being an independent database.',
        svgTemplate: 'shardedDatabase',
        problems: [
          'Adding shards requires rehashing and data migration',
          'No cross-shard queries or transactions',
          'Skewed data distribution with poor key choice',
          'Application must handle routing logic'
        ]
      },

      advancedImplementation: {
        title: 'Production Sharding with Proxy Layer',
        description: 'Proxy layer (Vitess/ProxySQL) handles routing, with consistent hashing, automatic rebalancing, and global secondary indexes.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Proxy layer abstracts sharding from the application',
          'Consistent hashing minimizes data movement on rebalance',
          'Global secondary indexes for cross-shard lookups',
          'Automated split/merge of partitions based on size',
          'Online schema changes applied across all shards'
        ]
      },

      discussionPoints: [
        {
          topic: 'Partitioning Strategy Selection',
          points: [
            'Hash for even distribution, range for range queries',
            'Composite keys combine both benefits (Cassandra-style)',
            'Directory-based for maximum flexibility with added complexity',
            'Most systems start with hash-based and add secondary indexes',
            'Consider geographic partitioning for global applications'
          ]
        },
        {
          topic: 'Partition Key Selection',
          points: [
            'Align with your most frequent query pattern',
            'High cardinality to ensure many distinct partitions',
            'Even distribution to prevent hotspots',
            'Immutable -- changing a partition key is extremely expensive',
            'Test with production-like data before committing'
          ]
        },
        {
          topic: 'Sharding in Practice',
          points: [
            'Vitess (YouTube): Proxy for MySQL sharding',
            'Citus: PostgreSQL extension for distributed queries',
            'CockroachDB: Automatic range-based partitioning',
            'MongoDB: Built-in hash and range sharding',
            'DynamoDB: Automatic partitioning by partition key'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'horizontal-vs-vertical-partition',
          title: 'Horizontal vs Vertical Partitioning',
          left: {
            title: 'Horizontal (Sharding)',
            icon: 'layers',
            color: '#3b82f6',
            items: [
              { label: 'Split By', value: 'Rows — each partition has subset of rows' },
              { label: 'Schema', value: 'Same schema in every partition' },
              { label: 'Use When', value: 'Table has billions of rows' },
              { label: 'Shard Key', value: 'user_id, region, timestamp' },
              { label: 'Challenge', value: 'Cross-shard queries, hotspots' },
              { label: 'Examples', value: 'Instagram user data, Uber rides' }
            ]
          },
          right: {
            title: 'Vertical Partitioning',
            icon: 'columns',
            color: '#10b981',
            items: [
              { label: 'Split By', value: 'Columns — each partition has subset of columns' },
              { label: 'Schema', value: 'Different columns in each partition' },
              { label: 'Use When', value: 'Table has many columns, different access patterns' },
              { label: 'Split Logic', value: 'Frequently accessed vs rarely accessed' },
              { label: 'Challenge', value: 'JOINs across partitions needed' },
              { label: 'Examples', value: 'User profile (hot) vs user preferences (cold)' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'shard-key-strategies',
          title: 'Shard Key Selection Guide',
          color: '#3b82f6',
          icon: 'layers',
          items: [
            { label: 'user_id', value: 'Good for user-centric apps', bar: 90 },
            { label: 'geographic region', value: 'Good for location-based data', bar: 80 },
            { label: 'timestamp/date', value: 'Good for time-series, logs', bar: 70 },
            { label: 'hash(key)', value: 'Uniform distribution, no range queries', bar: 65 },
            { label: 'compound key', value: 'tenant_id + user_id for multi-tenant', bar: 75 },
            { label: 'auto-increment ID', value: 'Bad — creates hotspot on one shard', bar: 15 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'range-partition', name: 'Range Partitioning', icon: 'sliders', color: '#3b82f6',
          description: 'Partition by ranges of the key (A-M, N-Z or Jan-Jun, Jul-Dec).',
          useWhen: 'Range queries needed, data has natural ordering',
          example: 'Partition orders by date ranges for time-based queries'
        },
        {
          id: 'hash-partition', name: 'Hash Partitioning', icon: 'hash', color: '#10b981',
          description: 'hash(key) % N determines partition. Uniform distribution.',
          useWhen: 'No range queries needed, want even distribution',
          example: 'hash(user_id) % 16 → partition 0-15'
        },
        {
          id: 'directory-partition', name: 'Directory-Based', icon: 'list', color: '#8b5cf6',
          description: 'Lookup table maps each key to its partition.',
          useWhen: 'Need flexible mapping, willing to maintain directory',
          example: 'Separate lookup service: "user_123 → shard_7"'
        }
      ],
      comparisonCards: [
        {
          title: 'Sharding Algorithms',
          items: [
            { name: 'Range-Based Sharding', description: 'Partition data by value ranges (e.g., A-G, H-N, O-Z for names, or date ranges). Simple but can lead to uneven distribution (hot spots) if data is skewed.' },
            { name: 'Hash-Based Sharding', description: 'Apply hash function to shard key (e.g., hash(user_id) % N). Distributes data more evenly than range-based. Requires choosing a proper hash function to avoid collisions.' },
            { name: 'Consistent Hashing', description: 'Extension of hash-based sharding using a hash ring. Minimizes data redistribution when adding/removing shards — only K/N keys need to move. Used by DynamoDB, Cassandra.' },
            { name: 'Virtual Bucket Hashing', description: 'Two-level mapping: data → virtual buckets → physical shards. Allows flexible rebalancing without significant data movement. More complex to maintain but highly flexible.' }
          ]
        }
      ]
    },
    {
      id: 'database-indexes',
      title: 'Database Indexes',
      icon: 'bookmark',
      color: '#10b981',
      questions: 8,
      description: 'B-tree, hash, and composite indexes -- when to index and the trade-offs involved.',
      concepts: ['B-Tree Indexes', 'Hash Indexes', 'Composite (Multi-Column) Indexes', 'Covering Indexes', 'Partial Indexes', 'Full-Text Indexes', 'Index Selectivity', 'Write Amplification'],
      tips: [
        'Every index speeds up reads but slows down writes -- never over-index',
        'The leftmost prefix rule determines which queries can use a composite index',
        'Use EXPLAIN / EXPLAIN ANALYZE to verify your index is actually being used',
        'High-selectivity columns make the best index candidates',
        'Covering indexes eliminate the need to read the table at all',
        'Partial indexes save space by indexing only a subset of rows'
      ],

      introduction: `A **database index** is a data structure that improves the speed of data retrieval operations at the cost of additional storage space and slower writes. Without indexes, the database must scan every row in a table to find matching records -- a **full table scan** that becomes prohibitively slow as tables grow to millions or billions of rows.

The most common index type is the **B-tree** (or B+ tree), which maintains data in sorted order and allows searches, insertions, and deletions in O(log n) time. **Hash indexes** provide O(1) lookups for exact-match queries but cannot support range queries. **Composite indexes** on multiple columns are particularly powerful but require understanding the **leftmost prefix rule** to use effectively.

In system design interviews, indexing decisions often come up when discussing database schema design or diagnosing performance bottlenecks. The key insight is that indexing is always a trade-off: faster reads versus slower writes, more storage, and increased complexity. Knowing **when to index**, **what to index**, and **what type of index** to use distinguishes strong candidates from those who simply say "add an index."`,

      functionalRequirements: [
        'Speed up point lookups from O(n) to O(log n) or O(1)',
        'Support range queries efficiently (B-tree)',
        'Enable sorted output without explicit sorting',
        'Support composite lookups on multiple columns',
        'Allow uniqueness constraints enforcement',
        'Support full-text search when needed'
      ],

      nonFunctionalRequirements: [
        'Read improvement: 100-1000x faster than full table scan',
        'Write overhead: 2-5x slower per index on inserts/updates',
        'Storage: 10-30% additional space per index',
        'Selectivity: Index is useful when < 15% of rows match',
        'Maintenance: Auto-rebalance (B-tree) without manual intervention',
        'Concurrency: Support concurrent reads and writes'
      ],

      dataModel: {
        description: 'Index structures and how they store data',
        schema: `B-Tree Index (most common):

  CREATE INDEX idx_users_email ON users(email);

  B-Tree Structure (simplified):
            ┌─────────────────┐
            │  [M]            │    <- Root
            └───┬─────────┬───┘
                │         │
       ┌────────▼──┐  ┌───▼────────┐
       │ [D, H]    │  │ [R, W]     │    <- Internal
       └─┬──┬──┬───┘  └─┬──┬──┬───┘
         │  │  │         │  │  │
  Leaf: [A,B,C] [D,E,F,G] [H,I..L] [M,N..Q] [R,S..V] [W,X,Y,Z]
         -> linked list between leaves for range scans ->

Hash Index:
  CREATE INDEX idx_users_id ON users USING HASH(id);

  Bucket 0: id=100 -> row_ptr
  Bucket 1: id=203 -> row_ptr, id=507 -> row_ptr
  Bucket 2: id=42  -> row_ptr
  ...

  O(1) lookup, but NO range queries, NO ordering

Composite Index:
  CREATE INDEX idx_orders ON orders(user_id, created_at);

  Sorted by: (user_id, created_at)
  Can serve:
    WHERE user_id = 123                      (YES - leftmost)
    WHERE user_id = 123 AND created_at > X   (YES - both)
    WHERE created_at > X                     (NO - skipped leftmost)
    ORDER BY user_id, created_at             (YES - matches sort)`
      },

      apiDesign: {
        description: 'Index-related SQL operations',
        endpoints: [
          { method: 'CREATE', path: 'CREATE INDEX idx ON table(col)', params: 'table, column(s)', response: 'Index created (may take minutes on large tables)' },
          { method: 'EXPLAIN', path: 'EXPLAIN ANALYZE SELECT ...', params: 'query', response: 'Execution plan showing index usage' },
          { method: 'DROP', path: 'DROP INDEX idx', params: 'index name', response: 'Index removed, space reclaimed' },
          { method: 'REINDEX', path: 'REINDEX INDEX idx', params: 'index name', response: 'Index rebuilt (reduces bloat)' },
          { method: 'STATS', path: 'pg_stat_user_indexes', params: '-', response: 'Index usage statistics' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does a B-tree index work and why is it the default?',
          answer: `**B-tree** (actually B+ tree in most databases) is a self-balancing tree data structure that maintains sorted data.

**Structure**:
- Root node at the top
- Internal nodes contain keys and pointers to children
- Leaf nodes contain keys and pointers to actual table rows
- Leaf nodes are linked for efficient range scans

**How a lookup works (searching for email = "alice@test.com")**:
  1. Start at root node
  2. Binary search within node to find correct child pointer
  3. Follow pointer to next level
  4. Repeat until reaching a leaf node
  5. Leaf contains pointer to the actual row on disk

**Time complexity**:
- Search: O(log n) -- typically 3-4 levels for millions of rows
- Insert: O(log n) -- find position, insert, possibly split node
- Delete: O(log n) -- find and remove, possibly merge nodes
- Range scan: O(log n + k) where k = rows in range

**Why B-tree is the default**:
- Works for both equality and range queries
- Ordered output without explicit sort
- Good for high-concurrency (fine-grained locking)
- Self-balancing (no manual maintenance)
- Disk-friendly (nodes align with disk pages)

**B-tree vs B+ tree**:
- B-tree: Data in all nodes
- B+ tree: Data only in leaf nodes, internal nodes = signposts
- B+ tree is better for range scans (linked leaf list)
- Most databases use B+ tree but call it "B-tree"`
        },
        {
          question: 'What is the leftmost prefix rule for composite indexes?',
          answer: `**Composite index**: An index on multiple columns, sorted by the first column, then the second within ties, and so on.

  CREATE INDEX idx ON orders(user_id, status, created_at);

  Index is sorted like a phone book:
  (1, "active",    2024-01-01)
  (1, "active",    2024-02-15)
  (1, "completed", 2024-01-20)
  (2, "active",    2024-01-05)
  (2, "cancelled", 2024-03-01)
  ...

**Leftmost prefix rule**: The index can be used for queries that filter on a **leftmost prefix** of the indexed columns.

  Queries that CAN use this index:
  WHERE user_id = 1                                    (1st col)
  WHERE user_id = 1 AND status = 'active'              (1st + 2nd)
  WHERE user_id = 1 AND status = 'active' AND created_at > X  (all 3)
  ORDER BY user_id, status, created_at                 (all 3, same order)

  Queries that CANNOT use this index:
  WHERE status = 'active'                   (skips 1st col)
  WHERE created_at > '2024-01-01'           (skips 1st and 2nd)
  WHERE user_id = 1 AND created_at > X      (skips 2nd col -- partial use)
    -> Can use index for user_id, but must scan for created_at

**Column order matters enormously**:
  (user_id, status, created_at) vs (status, user_id, created_at)
  -> Different queries benefit from each ordering

**Rule of thumb for ordering columns**:
  1. Equality conditions first (WHERE user_id = ?)
  2. Range conditions last (WHERE created_at > ?)
  3. High-selectivity columns earlier`
        },
        {
          question: 'What is a covering index and why does it matter?',
          answer: `**Covering index**: An index that contains ALL the columns needed to answer a query, so the database never needs to access the actual table rows (called a "heap fetch" or "table lookup").

**Normal index lookup**:
  Query: SELECT name FROM users WHERE email = 'a@test.com'
  Index on (email):
    1. Search index for email = 'a@test.com' -> row_id = 42
    2. Go to table, fetch row 42, read "name" column
    Two I/O operations (index + table)

**Covering index lookup**:
  Index on (email, name):  -- "name" included in the index
    1. Search index for email = 'a@test.com'
    2. Read "name" directly from the index leaf
    One I/O operation (index only) -- index-only scan

**Creating covering indexes**:

  -- PostgreSQL: INCLUDE clause
  CREATE INDEX idx ON users(email) INCLUDE (name, created_at);

  -- MySQL: Just add columns to the index
  CREATE INDEX idx ON users(email, name, created_at);

**When covering indexes help**:
- High-traffic queries that read a few columns
- Queries where the table is much wider than the needed columns
- Analytics queries on specific column combinations

**Trade-offs**:
- Larger index (stores more data)
- Slower writes (more data to maintain)
- Use EXPLAIN to verify "Index Only Scan" in query plan

**Impact**: Covering indexes can be 2-10x faster because they eliminate the random I/O of fetching table rows, which is the most expensive part of a query.`
        },
        {
          question: 'When should you NOT add an index?',
          answer: `**Rule**: Not every column should be indexed. Over-indexing is a common mistake.

**Do NOT index when**:

**1. The table is small (< 1000 rows)**
- Full table scan fits in one disk page
- Index adds overhead with no benefit

**2. The column has low selectivity**
- Selectivity = distinct values / total rows
- boolean "is_active" column: selectivity = 2/1M = 0.000002
- Database will choose full scan over index for low selectivity

**3. Write-heavy workload**
- Each INSERT updates every index on the table
- 5 indexes on a table = 5 additional writes per INSERT
- Batch import tables should drop indexes, load, then rebuild

**4. The query returns most rows anyway**
- SELECT * FROM logs WHERE level != 'DEBUG'
- If 80% of rows match, index does not help

**5. The column is frequently updated**
- Index must be updated on every column change
- Moving data in a B-tree is expensive

**Signs of over-indexing**:
- Write throughput has degraded
- pg_stat_user_indexes shows indexes with 0 or near-0 scans
- Storage usage growing faster than data volume

**Best practices**:
- Start with indexes on: primary key, foreign keys, WHERE clause columns
- Use query profiling to identify slow queries that need indexes
- Regularly audit unused indexes and drop them
- EXPLAIN every important query to verify index usage`
        },
        {
          question: 'How do indexes affect write performance and what is write amplification?',
          answer: `**Write amplification**: A single logical write (INSERT/UPDATE) causes multiple physical writes because every index must be updated.

**Example**: Table with 4 indexes

  INSERT INTO orders (user_id, product_id, status, amount, created_at)
  VALUES (123, 456, 'pending', 99.99, NOW());

  Physical writes:
  1. Write row to table (heap)
  2. Update B-tree index on (user_id)
  3. Update B-tree index on (product_id)
  4. Update B-tree index on (status, created_at)
  5. Update B-tree index on (amount)
  Total: 5 writes for 1 INSERT = 5x write amplification

**Impact by operation**:
- INSERT: Must update ALL indexes (worst case)
- UPDATE: Must update indexes on changed columns only
- DELETE: Must update ALL indexes (remove entries)

**Measuring write amplification**:
  Amplification = total disk writes / logical writes
  Typical: 2-10x depending on index count

**Mitigation strategies**:

1. **Fewer indexes**: Only index what you actually query
2. **Batch inserts**: Amortize B-tree rebalancing
3. **LSM-tree databases** (Cassandra, RocksDB):
   - Buffer writes in memory (memtable)
   - Flush sorted runs to disk periodically
   - Better write throughput, trade-off: slower reads
4. **Partial indexes**: Index only relevant rows
   CREATE INDEX idx ON orders(created_at) WHERE status = 'pending';
   -> Smaller index, fewer writes
5. **Delayed index builds**: Drop indexes before bulk load, rebuild after

**B-tree vs LSM-tree trade-off**:
- B-tree: Better reads, worse writes (PostgreSQL, MySQL)
- LSM-tree: Better writes, worse reads (Cassandra, RocksDB)
- Choose based on your read/write ratio`
        }
      ],

      basicImplementation: {
        title: 'Single-Column B-Tree Index',
        description: 'Basic B-tree index on a primary lookup column for point queries.',
        svgTemplate: 'singleDatabase',
        problems: [
          'Only speeds up queries on the indexed column',
          'Requires table lookup for non-indexed columns',
          'Write overhead for every insert/update',
          'Does not help with complex multi-column queries'
        ]
      },

      advancedImplementation: {
        title: 'Comprehensive Indexing Strategy',
        description: 'Composite indexes aligned with query patterns, covering indexes for hot queries, partial indexes for filtered subsets, and full-text indexes for search.',
        svgTemplate: 'singleDatabase',
        keyPoints: [
          'Composite indexes ordered by equality-first, range-last',
          'Covering indexes for the top 5 most frequent queries',
          'Partial indexes for filtering active/pending subsets',
          'Regular EXPLAIN ANALYZE audits on critical queries',
          'Automated unused index detection and cleanup'
        ]
      },

      discussionPoints: [
        {
          topic: 'Index Types and Use Cases',
          points: [
            'B-tree: Default for most queries (equality + range)',
            'Hash: Exact equality only, O(1) but no ranges',
            'GIN/GiST: Full-text search, JSONB, arrays (PostgreSQL)',
            'BRIN: Block Range Index for naturally ordered data (time-series)',
            'Bloom: Probabilistic index for many-column equality filters'
          ]
        },
        {
          topic: 'Performance Diagnosis',
          points: [
            'EXPLAIN ANALYZE reveals actual vs estimated rows',
            'Sequential scan on a large table = missing index',
            'Index scan with high "Rows Removed by Filter" = wrong index',
            'pg_stat_user_indexes shows which indexes are actually used',
            'High buffer cache hit ratio = good; low = I/O bound'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Always mention indexing when designing a database schema',
            'Discuss the read/write trade-off proactively',
            'Know the leftmost prefix rule for composite indexes',
            'Suggest EXPLAIN ANALYZE when asked about query optimization',
            'Mention covering indexes as an advanced optimization'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'btree-vs-hash-index',
          title: 'B-Tree vs Hash Index',
          left: {
            title: 'B-Tree Index',
            icon: 'gitBranch',
            color: '#3b82f6',
            items: [
              { label: 'Structure', value: 'Balanced tree, sorted keys' },
              { label: 'Range Queries', value: 'Excellent — keys are ordered' },
              { label: 'Equality', value: 'Good — O(log n) lookup' },
              { label: 'Write Speed', value: 'Slower — must maintain tree balance' },
              { label: 'Storage', value: 'Moderate overhead' },
              { label: 'Default In', value: 'PostgreSQL, MySQL InnoDB, SQLite' }
            ]
          },
          right: {
            title: 'Hash Index',
            icon: 'hash',
            color: '#10b981',
            items: [
              { label: 'Structure', value: 'Hash table, unordered' },
              { label: 'Range Queries', value: 'Not supported' },
              { label: 'Equality', value: 'Excellent — O(1) lookup' },
              { label: 'Write Speed', value: 'Fast — simple hash + insert' },
              { label: 'Storage', value: 'Less overhead' },
              { label: 'Default In', value: 'Memory-only engines, Redis' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'when-to-index',
          title: 'When to Create Indexes',
          color: '#10b981',
          icon: 'search',
          items: [
            { label: 'WHERE clause columns', value: 'Most common — filter speedup', bar: 95 },
            { label: 'JOIN columns', value: 'FK columns used in JOINs', bar: 85 },
            { label: 'ORDER BY columns', value: 'Avoid expensive sorts', bar: 75 },
            { label: 'High cardinality columns', value: 'email, user_id (many unique)', bar: 80 },
            { label: 'Covering indexes', value: 'Include all query columns', bar: 65 },
            { label: 'Low cardinality columns', value: 'Boolean, status — usually skip', bar: 15 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'composite-index', name: 'Composite Index', icon: 'layers', color: '#3b82f6',
          description: 'Multi-column index. Order matters — leftmost prefix rule.',
          useWhen: 'Queries filter on multiple columns together',
          example: 'INDEX(user_id, created_at) speeds WHERE user_id=? AND created_at>?'
        },
        {
          id: 'covering-index', name: 'Covering Index', icon: 'check', color: '#10b981',
          description: 'Index includes all columns needed — no table lookup required.',
          useWhen: 'Frequent queries reading specific column sets',
          example: 'INDEX(email) INCLUDE(name, avatar) — index-only scan'
        },
        {
          id: 'partial-index', name: 'Partial Index', icon: 'filter', color: '#8b5cf6',
          description: 'Index only rows matching a condition — smaller, faster.',
          useWhen: 'Only query subset of rows frequently',
          example: 'INDEX ON orders(created_at) WHERE status=\'pending\''
        }
      ],
      comparisonCards: [
        {
          title: 'Data Structures That Power Databases',
          items: [
            { name: 'B-Tree / B+ Tree', description: 'Self-balancing tree with high fanout. O(log N) reads/writes. B+ Tree stores data only in leaves with linked leaf nodes for range scans. Used by: PostgreSQL, MySQL InnoDB, SQLite.' },
            { name: 'LSM Tree (Log-Structured Merge)', description: 'Write to in-memory memtable → flush to sorted SSTable files → compact periodically. Optimized for write-heavy workloads. Used by: RocksDB, Cassandra, LevelDB.' },
            { name: 'Hash Index', description: 'Hash function maps key to memory location. O(1) reads but no range queries. Used by: Redis, Memcached, PostgreSQL hash indexes.' },
            { name: 'Skip List', description: 'Layered linked list with express lanes. O(log N) search/insert. Simpler than balanced trees. Used by: Redis sorted sets, MemSQL.' },
            { name: 'Inverted Index', description: 'Maps words/tokens to document IDs. Foundation of full-text search. Used by: ElasticSearch, Lucene, Solr.' },
            { name: 'R-Tree', description: 'Spatial index for multi-dimensional data (latitude, longitude). Efficiently answers "find all points within this rectangle". Used by: PostGIS, MongoDB geospatial.' },
            { name: 'Bloom Filter', description: 'Probabilistic set membership test. Can say "definitely not in set" or "probably in set". Space-efficient. Used by: Cassandra (avoid unnecessary disk reads), Chrome (malicious URL check).' },
            { name: 'SSTable (Sorted String Table)', description: 'Immutable sorted key-value file on disk. Foundation of LSM trees. Efficient sequential reads and merging. Used by: Bigtable, HBase, Cassandra.' }
          ]
        }
      ],
      staticDiagrams: [
        {
          id: 'index-data-structures',
          title: 'Index Data Structures',
          description: 'B+ Tree, LSM Tree, Hash Index, and Inverted Index — how databases store and retrieve data',
          src: '/diagrams/database-indexes/index-data-structures.svg',
          type: 'architecture'
        }
      ]
    },
    {
      id: 'proxies',
      title: 'Proxies',
      icon: 'shield',
      color: '#8b5cf6',
      questions: 7,
      description: 'Forward and reverse proxies, Layer 4 vs Layer 7, and their role in modern architectures.',
      concepts: ['Forward Proxy', 'Reverse Proxy', 'Layer 4 Proxy', 'Layer 7 Proxy', 'SSL/TLS Termination', 'Caching Proxy', 'API Gateway as Proxy', 'Service Mesh Sidecar Proxy'],
      tips: [
        'Reverse proxies sit in front of servers; forward proxies sit in front of clients',
        'NGINX and HAProxy are the most common reverse proxies in production',
        'SSL termination at the proxy offloads crypto work from application servers',
        'A CDN is essentially a geographically distributed reverse proxy with caching',
        'API gateways are specialized reverse proxies with auth, rate limiting, and routing',
        'Service mesh sidecar proxies (Envoy) handle inter-service communication'
      ],

      introduction: `A **proxy** is an intermediary server that sits between a client and a server, forwarding requests and responses. Proxies are one of the most versatile tools in system design, serving roles from security and privacy to load balancing and caching. Understanding the difference between **forward proxies** and **reverse proxies** is fundamental, as they serve entirely different purposes despite sharing the concept of intermediation.

A **forward proxy** acts on behalf of clients, sitting between users and the internet. It is commonly used for content filtering, access control, and anonymity (think VPNs and corporate firewalls). A **reverse proxy** acts on behalf of servers, sitting between the internet and backend servers. It handles load balancing, SSL termination, caching, and security for the backend infrastructure.

In system design interviews, proxies appear in almost every architecture: the **load balancer** is a reverse proxy, the **CDN** is a caching reverse proxy, the **API gateway** is a feature-rich reverse proxy, and the **service mesh sidecar** is a per-service proxy. Knowing when to operate at **Layer 4** (TCP/UDP) versus **Layer 7** (HTTP/application) and understanding the performance and feature trade-offs between them is essential for designing robust systems.`,

      functionalRequirements: [
        'Forward client requests to appropriate backend servers',
        'Terminate SSL/TLS connections and re-encrypt if needed',
        'Cache responses to reduce backend load',
        'Load balance across multiple backend servers',
        'Filter and modify requests and responses (headers, compression)',
        'Provide access control and authentication'
      ],

      nonFunctionalRequirements: [
        'Latency overhead: < 1ms for L4, < 5ms for L7',
        'Throughput: Millions of concurrent connections',
        'Availability: 99.999% (proxy failure = total outage)',
        'SSL performance: Handle 10K+ TLS handshakes/second',
        'Connection pooling: Reduce backend connection count by 10x',
        'Scalability: Horizontal scaling with consistent hashing'
      ],

      dataModel: {
        description: 'Proxy types and their positioning in the network',
        schema: `Forward Proxy:
  Client -> [Forward Proxy] -> Internet -> Server

  Purpose: Acts on behalf of the CLIENT
  - Content filtering (block sites)
  - Anonymity (hide client IP)
  - Caching (reduce bandwidth)
  - Access control (corporate firewall)

  Example: Squid, corporate VPN

Reverse Proxy:
  Client -> Internet -> [Reverse Proxy] -> Server(s)

  Purpose: Acts on behalf of the SERVER
  - Load balancing
  - SSL termination
  - Caching
  - Security (hide server IPs, WAF)
  - Compression

  Example: NGINX, HAProxy, Cloudflare

Layer 4 (Transport) Proxy:
  Operates on TCP/UDP packets
  Routes based on: IP, port, protocol
  Cannot inspect: HTTP headers, URLs, cookies
  Performance: Fastest (no payload parsing)

Layer 7 (Application) Proxy:
  Operates on HTTP/HTTPS requests
  Routes based on: URL, headers, cookies, body
  Can: Rewrite URLs, add headers, cache content
  Performance: Slower (must parse application data)`
      },

      apiDesign: {
        description: 'Proxy configuration patterns (NGINX-style)',
        endpoints: [
          { method: 'ROUTE', path: '/api/* -> backend_api_servers', params: 'URL prefix', response: 'Forward to API server pool' },
          { method: 'ROUTE', path: '/static/* -> cdn_origin', params: 'URL prefix', response: 'Forward to static asset servers' },
          { method: 'CACHE', path: 'proxy_cache for GET /api/products', params: 'TTL, key', response: 'Cached response (bypass backend)' },
          { method: 'SSL', path: 'ssl_certificate /path/to/cert', params: 'cert, key', response: 'TLS termination at proxy' },
          { method: 'HEALTH', path: 'upstream health_check interval=5s', params: 'interval, threshold', response: 'Remove unhealthy backends' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is the difference between a forward proxy and a reverse proxy?',
          answer: `**Forward Proxy** (Client-side):

  Clients ──> [Forward Proxy] ──> Internet ──> Servers

  The proxy acts on behalf of CLIENTS:
  - Clients know about the proxy (configured explicitly)
  - Servers see the proxy's IP, not the client's

  Use cases:
  - Corporate firewall: Block access to social media
  - Anonymity: Hide client identity (Tor, VPN)
  - Caching: Cache frequently accessed content for all clients
  - Access logging: Monitor what employees access

**Reverse Proxy** (Server-side):

  Clients ──> Internet ──> [Reverse Proxy] ──> Servers

  The proxy acts on behalf of SERVERS:
  - Clients do not know servers exist (transparent)
  - Clients see only the proxy's IP/domain

  Use cases:
  - Load balancing: Distribute across backend servers
  - SSL termination: Offload TLS from app servers
  - Caching: Cache responses to reduce server load
  - Security: DDoS protection, WAF, hide server topology
  - Compression: gzip/brotli responses

**Key differences**:
| Aspect        | Forward Proxy      | Reverse Proxy       |
|---------------|-------------------|---------------------|
| Protects      | Clients           | Servers             |
| Configured by | Client            | Server admin        |
| Hides         | Client identity   | Server identity     |
| Example       | Corporate proxy   | NGINX, Cloudflare   |`
        },
        {
          question: 'What is the difference between Layer 4 and Layer 7 proxies?',
          answer: `**Layer 4 Proxy (Transport Layer)**:
- Operates on TCP/UDP segments
- Routes based on source/destination IP and port
- Does NOT inspect packet contents
- Maintains a single TCP connection or NAT

  Client --TCP--> [L4 Proxy] --TCP--> Server

  Decision: IP:port -> backend server
  Cannot see: URL, HTTP method, headers, cookies

**Layer 7 Proxy (Application Layer)**:
- Operates on HTTP/HTTPS requests
- Fully parses the application protocol
- Terminates the client connection, creates new connection to backend

  Client --HTTP--> [L7 Proxy] --HTTP--> Server

  Decision: URL path, Host header, cookies, anything in HTTP
  Can: Rewrite URLs, inject headers, cache, compress, authenticate

**Performance comparison**:
- L4: ~1M+ connections/second (just forwards packets)
- L7: ~100K connections/second (must parse every request)
- L4 adds ~0.1ms latency
- L7 adds ~1-5ms latency

**Feature comparison**:
| Feature              | L4    | L7    |
|---------------------|-------|-------|
| Content routing     | No    | Yes   |
| SSL termination     | No*   | Yes   |
| Caching             | No    | Yes   |
| Header manipulation | No    | Yes   |
| WebSocket support   | Yes   | Yes   |
| gRPC routing        | No    | Yes   |
| Connection pooling  | No    | Yes   |
| Raw performance     | Best  | Good  |

*L4 can do SSL passthrough (forward encrypted traffic without terminating)

**When to use each**:
- L4: Database proxies, TCP load balancing, maximum performance needed
- L7: Web applications, API routing, need content-based decisions`
        },
        {
          question: 'How does SSL/TLS termination at a proxy work?',
          answer: `**SSL Termination**: The proxy handles the TLS handshake and decryption, forwarding plain HTTP to backend servers.

  Client ──HTTPS──> [Proxy] ──HTTP──> Backend Servers
       (encrypted)         (unencrypted, internal network)

**Why terminate at the proxy?**:
1. **Offload CPU**: TLS handshake is CPU-intensive; one proxy handles it for all backends
2. **Certificate management**: Only one place to install/renew certificates
3. **Inspection**: Proxy can read requests for routing, caching, logging
4. **Connection reuse**: Proxy maintains persistent connections to backends

**SSL Termination vs SSL Passthrough vs SSL Bridging**:

  Termination:
  Client --TLS--> Proxy --HTTP--> Server
  Proxy decrypts, sends plain text internally

  Passthrough (L4):
  Client --TLS--> Proxy --TLS--> Server
  Proxy forwards encrypted traffic (cannot inspect)

  Bridging (Re-encryption):
  Client --TLS--> Proxy --TLS--> Server
  Proxy decrypts, inspects, re-encrypts to backend

**When to use each**:
- **Termination**: Most web apps (internal network is trusted)
- **Passthrough**: When backend MUST handle its own TLS (compliance)
- **Bridging**: When you need inspection AND end-to-end encryption (zero trust)

**Performance impact**:
- TLS 1.3 handshake: ~1 RTT (fast)
- Session resumption: 0 RTT
- Hardware acceleration (AES-NI): Minimal CPU overhead
- NGINX can handle 10K+ TLS handshakes/second on modern hardware`
        },
        {
          question: 'How do proxies relate to API gateways and service meshes?',
          answer: `**API Gateway = Specialized Reverse Proxy**:

  Clients -> [API Gateway] -> Microservices

  An API gateway is a reverse proxy with extra features:
  - Authentication / Authorization
  - Rate limiting
  - Request/response transformation
  - API versioning
  - Analytics and logging
  - Circuit breaking

  Examples: Kong, AWS API Gateway, Apigee

**Service Mesh Sidecar = Per-Service Proxy**:

  ┌──────────────────────────────┐
  │  Service A                   │
  │  ┌────────┐  ┌────────────┐  │
  │  │  App   │──│  Sidecar   │  │
  │  │        │  │  Proxy     │  │
  │  └────────┘  └──────┬─────┘  │
  └─────────────────────┼────────┘
                        │ mTLS
  ┌─────────────────────┼────────┐
  │  Service B           │        │
  │  ┌────────────┐  ┌───▼────┐  │
  │  │  Sidecar   │──│  App   │  │
  │  │  Proxy     │  │        │  │
  │  └────────────┘  └────────┘  │
  └──────────────────────────────┘

  Every service has its own proxy sidecar (Envoy):
  - Mutual TLS between services (mTLS)
  - Load balancing and service discovery
  - Retry, timeout, circuit breaking
  - Observability (metrics, traces)

  Examples: Istio (Envoy), Linkerd

**Evolution**:
  Monolith: No proxy needed
  -> Load Balancer: Simple reverse proxy (NGINX)
  -> API Gateway: Smart reverse proxy (Kong)
  -> Service Mesh: Proxy per service (Istio/Envoy)

**When to use each**:
- Simple web app: NGINX reverse proxy
- Public API with multiple clients: API Gateway
- Microservices with complex inter-service communication: Service Mesh
- Many services + need observability: Service Mesh`
        },
        {
          question: 'How do caching proxies work and what can they cache?',
          answer: `**Caching proxy**: A reverse proxy that stores responses and serves them directly for subsequent identical requests.

  Request 1: Client -> Proxy -> Backend (200, data)
                       Proxy stores response in cache

  Request 2: Client -> Proxy (cache hit, return stored response)
                       Backend is NOT contacted

**What can be cached**:
- GET responses (safe, idempotent)
- Static assets (images, CSS, JS)
- API responses with proper Cache-Control headers
- Pre-rendered pages

**What should NOT be cached**:
- POST/PUT/DELETE responses (mutating)
- Personalized content (unless Vary header is used)
- Real-time data (stock prices, live scores)
- Authenticated responses (unless per-user cache)

**Cache-Control headers**:
  Cache-Control: public, max-age=3600      (cache for 1 hour)
  Cache-Control: private, no-cache         (revalidate every time)
  Cache-Control: no-store                  (never cache)
  Vary: Accept-Encoding, Authorization     (separate cache per variant)
  ETag: "abc123"                           (conditional request support)

**Cache invalidation at the proxy**:
- TTL expiration (max-age)
- Purge API (NGINX: proxy_cache_purge)
- Conditional requests (If-None-Match with ETag)
- Stale-while-revalidate (serve stale, refresh in background)

**Performance impact**:
- Cache hit: ~1ms response (vs 100ms+ from backend)
- 90% cache hit rate = 10x reduction in backend load
- CDNs are caching proxies at global scale

**Common caching proxy configurations (NGINX)**:
  proxy_cache_path /var/cache levels=1:2 keys_zone=my_cache:10m;
  proxy_cache_valid 200 1h;
  proxy_cache_valid 404 1m;
  proxy_cache_use_stale error timeout;`
        }
      ],

      basicImplementation: {
        title: 'Simple Reverse Proxy',
        description: 'Single NGINX instance as a reverse proxy with SSL termination and basic load balancing.',
        svgTemplate: 'loadBalancer',
        problems: [
          'Single point of failure',
          'No content-based routing',
          'Limited caching capabilities',
          'No authentication or rate limiting'
        ]
      },

      advancedImplementation: {
        title: 'Multi-Layer Proxy Architecture',
        description: 'CDN edge proxies -> API Gateway -> Service mesh sidecar proxies, providing caching, auth, routing, and observability at every layer.',
        svgTemplate: 'apiGateway',
        keyPoints: [
          'CDN edge handles static content and DDoS protection',
          'API Gateway handles auth, rate limiting, API versioning',
          'Service mesh sidecars handle inter-service mTLS and load balancing',
          'Each layer adds specific value without redundancy',
          'Centralized observability across all proxy layers'
        ]
      },

      discussionPoints: [
        {
          topic: 'Proxy Selection Guide',
          points: [
            'NGINX: Most popular reverse proxy, great for web traffic',
            'HAProxy: Highest performance, excellent for TCP/HTTP load balancing',
            'Envoy: Modern, designed for microservices and service mesh',
            'Traefik: Container-native, automatic service discovery',
            'Caddy: Automatic HTTPS, simple configuration'
          ]
        },
        {
          topic: 'Security at the Proxy Layer',
          points: [
            'SSL/TLS termination centralizes certificate management',
            'Web Application Firewall (WAF) blocks common attacks',
            'Rate limiting prevents abuse and DDoS',
            'IP allowlisting/blocklisting for access control',
            'Request validation and sanitization before reaching backends'
          ]
        },
        {
          topic: 'Performance Optimization',
          points: [
            'Connection pooling reduces backend connection overhead',
            'HTTP/2 multiplexing at the proxy improves throughput',
            'Compression (gzip/brotli) at the proxy reduces bandwidth',
            'Keep-alive connections minimize TLS handshake overhead',
            'Buffer settings tuning for large request/response bodies'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'forward-vs-reverse',
          title: 'Forward Proxy vs Reverse Proxy',
          left: {
            title: 'Forward Proxy',
            icon: 'arrowRight',
            color: '#3b82f6',
            items: [
              { label: 'Sits Between', value: 'Client and internet' },
              { label: 'Hides', value: 'Client identity from servers' },
              { label: 'Use Cases', value: 'Privacy, content filtering, caching' },
              { label: 'Who Uses', value: 'Clients/organizations' },
              { label: 'Examples', value: 'Corporate proxy, VPN, Squid' },
              { label: 'Server Sees', value: 'Proxy IP, not client IP' }
            ]
          },
          right: {
            title: 'Reverse Proxy',
            icon: 'arrowLeft',
            color: '#10b981',
            items: [
              { label: 'Sits Between', value: 'Internet and backend servers' },
              { label: 'Hides', value: 'Backend server details from clients' },
              { label: 'Use Cases', value: 'Load balancing, SSL termination, caching' },
              { label: 'Who Uses', value: 'Server infrastructure teams' },
              { label: 'Examples', value: 'Nginx, HAProxy, Cloudflare, AWS ALB' },
              { label: 'Client Sees', value: 'Proxy domain, not backend IPs' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'proxy-features',
          title: 'Reverse Proxy Capabilities',
          color: '#10b981',
          icon: 'shield',
          items: [
            { label: 'Load balancing', value: 'Distribute traffic across backends', bar: 95 },
            { label: 'SSL termination', value: 'Handle HTTPS, forward HTTP internally', bar: 90 },
            { label: 'Caching', value: 'Cache responses for repeated requests', bar: 80 },
            { label: 'Compression', value: 'gzip/brotli responses', bar: 70 },
            { label: 'Rate limiting', value: 'Protect backends from abuse', bar: 75 },
            { label: 'Request routing', value: 'Route by URL path, header, etc.', bar: 85 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'api-gateway-proxy', name: 'API Gateway', icon: 'globe', color: '#3b82f6',
          description: 'Reverse proxy + auth + rate limiting + request transformation.',
          useWhen: 'Microservices need unified entry point',
          example: 'Kong, AWS API Gateway, Nginx with plugins'
        },
        {
          id: 'sidecar-proxy', name: 'Sidecar Proxy', icon: 'layers', color: '#8b5cf6',
          description: 'Per-service proxy handling networking concerns.',
          useWhen: 'Service mesh, consistent networking policies',
          example: 'Envoy sidecar in Istio — mTLS, retries, tracing'
        }
      ],
      comparisonCards: [
        {
          title: 'Proxy Types Compared',
          items: [
            { name: 'Forward Proxy', description: 'Sits between client and internet. Client sends requests to proxy, proxy forwards to server. Hides client identity. Used for: content filtering, bypassing geo-restrictions, corporate firewalls.' },
            { name: 'Reverse Proxy', description: 'Sits between internet and servers. Clients don\'t know which server handles their request. Hides server identity. Used for: SSL termination, caching, DDoS protection. Example: Nginx.' },
            { name: 'API Gateway', description: 'Specialized reverse proxy for APIs. Routes requests to different backend services. Adds auth, rate limiting, request transformation, and monitoring. Example: Kong, AWS API Gateway.' },
            { name: 'Load Balancer', description: 'Distributes traffic to multiple instances of the same service. Purely focused on traffic distribution and health. Can be L4 (TCP) or L7 (HTTP). Example: ALB, HAProxy.' }
          ]
        }
      ]
    },
    {
      id: 'dns-deep-dive',
      title: 'DNS Deep Dive',
      icon: 'globe',
      color: '#10b981',
      questions: 8,
      description: 'DNS resolution, record types, DNS-based load balancing, and global traffic management.',
      concepts: ['DNS Resolution Process', 'Record Types (A, CNAME, MX, NS, TXT)', 'DNS Caching and TTL', 'DNS Load Balancing', 'GeoDNS', 'Anycast DNS', 'DNS Failover', 'DNSSEC'],
      tips: [
        'DNS is the first step of every web request -- understanding it is non-negotiable',
        'Low TTL enables faster failover but increases DNS query load',
        'GeoDNS routes users to the nearest data center for lower latency',
        'Anycast routes to the nearest DNS server, not the nearest app server',
        'DNS propagation delays can cause issues during migrations -- plan for TTL windows',
        'Always have a DNS failover plan for your critical services'
      ],

      introduction: `The **Domain Name System (DNS)** is the internet's phone book, translating human-readable domain names (like google.com) into IP addresses (like 142.250.80.46) that computers use to communicate. Every web request, API call, and email delivery begins with a DNS lookup, making it one of the most critical pieces of internet infrastructure.

DNS operates as a **hierarchical, distributed database**. When you type a URL into your browser, a series of queries flows from your local resolver to root servers, TLD (Top-Level Domain) servers, and authoritative nameservers. The response is cached at multiple levels with configurable **TTL (Time-To-Live)** values, which is why DNS changes do not propagate instantly. Understanding this caching behavior is crucial for system design, especially during migrations and failover scenarios.

In system design interviews, DNS appears in two main contexts: as a fundamental building block you should mention when describing how clients reach your system, and as an active component in traffic management through **DNS-based load balancing**, **GeoDNS** for geographic routing, and **Anycast** for high availability of the DNS infrastructure itself. Companies like Netflix, Google, and Cloudflare use sophisticated DNS strategies to route billions of requests to the optimal server.`,

      functionalRequirements: [
        'Resolve domain names to IP addresses reliably',
        'Support multiple record types (A, AAAA, CNAME, MX, NS, TXT)',
        'Cache responses at multiple levels with configurable TTL',
        'Support geographic routing for global services',
        'Enable DNS-based failover for high availability',
        'Handle reverse DNS lookups (IP to domain)'
      ],

      nonFunctionalRequirements: [
        'Resolution latency: < 50ms (cached), < 200ms (uncached)',
        'Availability: 100% (DNS failure = total service outage)',
        'Scalability: Handle billions of queries per day',
        'TTL management: Balance freshness vs query load',
        'Propagation: Global consistency within 1-2x TTL',
        'Security: DNSSEC for authentication, DoH/DoT for privacy'
      ],

      dataModel: {
        description: 'DNS record types and their purposes',
        schema: `Common DNS Record Types:

  A Record (Address):
    example.com.    300    IN    A    93.184.216.34
    Maps domain to IPv4 address

  AAAA Record (IPv6):
    example.com.    300    IN    AAAA    2606:2800:220:1:248:1893:25c8:1946
    Maps domain to IPv6 address

  CNAME Record (Canonical Name):
    www.example.com.    300    IN    CNAME    example.com.
    Alias one domain to another (cannot coexist with other records)

  MX Record (Mail Exchange):
    example.com.    300    IN    MX    10 mail.example.com.
    Specifies mail servers (priority + target)

  NS Record (Nameserver):
    example.com.    86400  IN    NS    ns1.example.com.
    Delegates a zone to nameservers

  TXT Record (Text):
    example.com.    300    IN    TXT    "v=spf1 include:_spf.google.com ~all"
    Arbitrary text (SPF, DKIM, domain verification)

  SRV Record (Service):
    _sip._tcp.example.com.    300    IN    SRV    10 60 5060 sip.example.com.
    Service discovery (priority, weight, port, target)

TTL Values (seconds):
  300 (5 min)   - Dynamic/failover records
  3600 (1 hr)   - Standard web records
  86400 (24 hr) - Stable infrastructure (NS records)`
      },

      apiDesign: {
        description: 'DNS query and management operations',
        endpoints: [
          { method: 'QUERY', path: 'dig example.com A', params: 'domain, record type', response: 'IP address(es) with TTL' },
          { method: 'QUERY', path: 'dig example.com MX', params: 'domain', response: 'Mail server(s) with priority' },
          { method: 'CREATE', path: 'dns.createRecord(zone, type, value, ttl)', params: 'zone, type, value, TTL', response: 'Record created' },
          { method: 'UPDATE', path: 'dns.updateRecord(id, newValue, newTtl)', params: 'record id, new value', response: 'Record updated (propagates after TTL)' },
          { method: 'DELETE', path: 'dns.deleteRecord(id)', params: 'record id', response: 'Record removed' }
        ]
      },

      keyQuestions: [
        {
          question: 'Walk through the full DNS resolution process',
          answer: `**What happens when you type "www.example.com" in your browser**:

  Step 1: Browser Cache
    Browser checks its own DNS cache
    -> If found and TTL valid, use cached IP (done)

  Step 2: OS Cache
    Ask operating system's resolver
    -> Checks /etc/hosts file and OS DNS cache

  Step 3: Recursive Resolver (ISP or 8.8.8.8)
    OS asks configured DNS resolver
    -> Resolver checks its cache
    -> If miss, starts recursive resolution:

  Step 4: Root Nameserver
    Resolver -> Root Server (13 root server clusters worldwide)
    "I need www.example.com"
    Root: "I don't know, but .com is handled by these TLD servers"

  Step 5: TLD Nameserver
    Resolver -> .com TLD Server
    "I need www.example.com"
    TLD: "example.com is handled by ns1.example.com"

  Step 6: Authoritative Nameserver
    Resolver -> ns1.example.com
    "What is the A record for www.example.com?"
    Auth: "93.184.216.34, TTL=300"

  Step 7: Response
    Resolver caches the answer (for 300 seconds)
    Returns IP to OS -> Browser
    Browser connects to 93.184.216.34

**Total time (uncached)**: 50-200ms (4 network hops)
**Cached**: < 1ms

**Caching layers summary**:
  Browser cache -> OS cache -> Resolver cache -> Authoritative response
  Each layer reduces load on the next`
        },
        {
          question: 'How does DNS-based load balancing work?',
          answer: `**Round-Robin DNS**: Return multiple A records; clients pick one (usually first).

  dig example.com A
  -> 93.184.216.34 (Server 1)
  -> 93.184.216.35 (Server 2)
  -> 93.184.216.36 (Server 3)

  Each query rotates the order:
  Query 1: [S1, S2, S3]
  Query 2: [S2, S3, S1]
  Query 3: [S3, S1, S2]

**Limitations of simple DNS load balancing**:
- No health checking (sends traffic to dead servers)
- Caching defeats round-robin (client uses cached IP for TTL duration)
- No session affinity
- Unequal load distribution

**Weighted DNS**: Return records with different weights

  example.com.  A  93.184.216.34  weight=70  (70% traffic)
  example.com.  A  93.184.216.35  weight=20  (20% traffic)
  example.com.  A  93.184.216.36  weight=10  (10% traffic)

**DNS Failover**: Health-checked DNS records

  Primary:   93.184.216.34 (healthy -> included)
  Secondary: 93.184.216.35 (healthy -> included)
  Failover:  93.184.216.36 (standby -> excluded until primary fails)

  When primary fails health check:
  -> Remove from DNS response
  -> TTL must expire before clients notice (delay!)

**GeoDNS**: Route users to nearest data center

  User in Europe  -> dig example.com -> 10.0.1.1 (EU server)
  User in US East -> dig example.com -> 10.0.2.1 (US-East server)
  User in Asia    -> dig example.com -> 10.0.3.1 (Asia server)

**Best practice**: Use DNS for coarse-grained global routing (GeoDNS), use a load balancer for fine-grained server selection within a data center.`
        },
        {
          question: 'What is GeoDNS and Anycast, and how do they differ?',
          answer: `**GeoDNS**: Returns different IP addresses based on the client's geographic location.

  How it works:
  1. DNS resolver's IP reveals approximate client location
  2. GeoDNS server has a geo-IP database
  3. Returns the IP of the nearest data center

  User in London -> GeoDNS -> 10.0.1.1 (London DC)
  User in Tokyo  -> GeoDNS -> 10.0.3.1 (Tokyo DC)
  User in NYC    -> GeoDNS -> 10.0.2.1 (Virginia DC)

  Used by: Netflix, Spotify, most global services
  Providers: Route 53 (AWS), Cloudflare, NS1

**Anycast**: Multiple servers share the same IP address; network routing sends traffic to the nearest one.

  How it works:
  1. Multiple data centers advertise the SAME IP (e.g., 1.1.1.1)
  2. BGP routing naturally sends packets to the nearest server
  3. No special DNS logic needed -- the network handles it

  User in London -> 1.1.1.1 -> London server (BGP shortest path)
  User in Tokyo  -> 1.1.1.1 -> Tokyo server (BGP shortest path)

  Used by: Cloudflare DNS (1.1.1.1), Google DNS (8.8.8.8), all root DNS servers

**Key differences**:
| Aspect          | GeoDNS              | Anycast              |
|----------------|--------------------|--------------------- |
| Layer          | Application (DNS)   | Network (BGP)        |
| Returns        | Different IPs       | Same IP everywhere   |
| Failover       | DNS TTL delay       | Instant (BGP reroute)|
| Granularity    | Country/region      | Network topology     |
| Use case       | App server routing  | DNS/CDN infrastructure|
| Implementation | DNS provider feature| Requires BGP control |

**Common architecture**: Use Anycast for the DNS servers themselves, and GeoDNS for routing application traffic to the correct data center.`
        },
        {
          question: 'What are the trade-offs of DNS TTL values?',
          answer: `**TTL (Time-To-Live)**: How long resolvers and clients should cache a DNS record.

**Low TTL (30-300 seconds)**:
  Pros:
  - Faster failover (clients get new IP quickly)
  - Faster traffic shifting (migrations, blue-green deploys)
  - More control over traffic distribution

  Cons:
  - More DNS queries (higher resolver load)
  - Slightly higher latency (more cache misses)
  - Higher cost (some DNS providers charge per query)

**High TTL (3600-86400 seconds)**:
  Pros:
  - Fewer DNS queries (lower cost, lower load)
  - Faster resolution for end users (cache hits)
  - More resilient to DNS infrastructure outages

  Cons:
  - Slow failover (clients use stale IP for hours)
  - Migrations are painful (must wait for TTL to expire)
  - Hard to shift traffic quickly

**Recommended TTL values by use case**:
| Use Case                | TTL        | Reason                    |
|------------------------|------------|---------------------------|
| Active failover         | 30-60s     | Fast failover required    |
| Web applications        | 300s (5m)  | Balance: fast changes     |
| CDN CNAME               | 3600s (1h) | Rarely changes            |
| NS records              | 86400s (24h)| Very stable              |
| Pre-migration           | Lower to 60s, wait, then migrate |

**Migration best practice**:
  Day 0: TTL = 3600 (normal)
  Day 1: Lower TTL to 60
  Day 2: Wait 24 hours (old TTL to expire everywhere)
  Day 3: Change DNS record to new IP
  Day 3 + 60s: All traffic on new IP
  Day 4: Raise TTL back to 3600

**Important caveat**: Some resolvers and clients ignore TTL and cache longer. Always plan for some stale clients.`
        },
        {
          question: 'How do large companies architect their DNS for high availability?',
          answer: `**Multi-provider DNS strategy**:

  Primary DNS: Route 53 (AWS)
  Secondary DNS: Cloudflare
  Tertiary DNS: NS1

  NS records point to all three:
  example.com.  NS  ns1.awsdns-01.com.
  example.com.  NS  ns2.cloudflare.com.
  example.com.  NS  ns3.nsone.net.

  If one provider goes down, others continue serving

**Anycast DNS infrastructure**:
  Every major DNS provider uses Anycast
  Cloudflare: 300+ data centers, same IP everywhere
  Route 53: 200+ edge locations

**Health-checked DNS failover** (Route 53 example):

  Primary record: US-East ALB (health check every 10s)
  Secondary record: EU-West ALB (failover target)

  Normal: DNS returns US-East IP
  US-East fails health check:
  -> Route 53 removes US-East from responses
  -> Returns EU-West IP instead
  -> Failover time = health check interval + TTL

**Global traffic management architecture**:

  User -> Anycast DNS Server (nearest PoP)
       -> GeoDNS returns nearest data center IP
       -> Client connects to regional load balancer
       -> LB distributes to healthy servers

  Layers:
  1. Anycast: Routes DNS query to nearest resolver
  2. GeoDNS: Returns IP of nearest data center
  3. Health checks: Remove unhealthy data centers
  4. Load balancer: Distribute within data center

**Monitoring DNS**:
- Track resolution latency from multiple global locations
- Alert on propagation delays after changes
- Monitor query volume for anomalies (DDoS)
- Verify DNSSEC signatures regularly`
        }
      ],

      basicImplementation: {
        title: 'Simple DNS Setup',
        description: 'Single DNS provider with A records pointing to a load balancer IP.',
        svgTemplate: 'singleServer',
        problems: [
          'Single DNS provider is a point of failure',
          'No geographic routing',
          'No automatic failover',
          'High TTL delays traffic changes'
        ]
      },

      advancedImplementation: {
        title: 'Global DNS Architecture',
        description: 'Multi-provider Anycast DNS with GeoDNS routing, health-checked failover, and low TTL for fast traffic shifting.',
        svgTemplate: 'globalLoadBalancer',
        keyPoints: [
          'Multiple DNS providers for redundancy',
          'Anycast for DNS server high availability',
          'GeoDNS for routing to nearest data center',
          'Health checks remove unhealthy endpoints automatically',
          'Low TTL (60s) for failover-ready records'
        ]
      },

      discussionPoints: [
        {
          topic: 'DNS Provider Selection',
          points: [
            'Route 53 (AWS): Deep AWS integration, health checks, GeoDNS',
            'Cloudflare: Fast Anycast network, DDoS protection, free tier',
            'Google Cloud DNS: Simple, reliable, Anycast',
            'NS1: Advanced traffic management, filter chains',
            'Multi-provider for maximum availability'
          ]
        },
        {
          topic: 'DNS Security',
          points: [
            'DNSSEC: Cryptographic signing prevents spoofing',
            'DNS over HTTPS (DoH): Encrypts DNS queries in HTTPS',
            'DNS over TLS (DoT): Encrypts DNS queries in TLS',
            'DNS rebinding attacks: Validate resolved IPs',
            'DNS amplification DDoS: Rate limit open resolvers'
          ]
        },
        {
          topic: 'Common DNS Patterns in System Design',
          points: [
            'GeoDNS + regional load balancers for global services',
            'DNS failover for disaster recovery',
            'CNAME to CDN for static assets',
            'Low TTL before migrations, high TTL after',
            'Split-horizon DNS for internal vs external resolution'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'dns-record-types',
          title: 'Key DNS Record Types',
          left: {
            title: 'Address Records',
            icon: 'globe',
            color: '#3b82f6',
            items: [
              { label: 'A Record', value: 'Domain → IPv4 address' },
              { label: 'AAAA Record', value: 'Domain → IPv6 address' },
              { label: 'CNAME', value: 'Domain → another domain (alias)' },
              { label: 'Use', value: 'Map domain names to IP addresses' },
              { label: 'TTL', value: 'Typically 300s to 86400s' },
              { label: 'Example', value: 'api.example.com → 52.1.2.3' }
            ]
          },
          right: {
            title: 'Service Records',
            icon: 'server',
            color: '#10b981',
            items: [
              { label: 'MX Record', value: 'Domain → mail server' },
              { label: 'NS Record', value: 'Domain → authoritative nameserver' },
              { label: 'TXT Record', value: 'Domain → text data (verification)' },
              { label: 'SRV Record', value: 'Service → host:port' },
              { label: 'CAA Record', value: 'Domain → allowed cert authorities' },
              { label: 'Example', value: 'MX example.com → mail.google.com' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'dns-resolution-steps',
          title: 'DNS Resolution Lookup Chain',
          color: '#3b82f6',
          icon: 'globe',
          items: [
            { label: '1. Browser cache', value: 'Check local cache first', bar: 15 },
            { label: '2. OS resolver cache', value: '/etc/hosts, OS cache', bar: 25 },
            { label: '3. Recursive resolver', value: 'ISP or public DNS (8.8.8.8)', bar: 45 },
            { label: '4. Root nameserver', value: '13 root servers worldwide', bar: 60 },
            { label: '5. TLD nameserver', value: '.com, .org, .io servers', bar: 75 },
            { label: '6. Authoritative NS', value: 'Final answer with IP', bar: 95 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'dns-load-balancing', name: 'DNS Load Balancing', icon: 'layers', color: '#3b82f6',
          description: 'Return multiple A records or use weighted/latency routing.',
          useWhen: 'Global load distribution, multi-region failover',
          example: 'Route 53 latency-based routing to nearest region'
        },
        {
          id: 'dns-caching', name: 'DNS Caching & TTL', icon: 'clock', color: '#10b981',
          description: 'Cache DNS responses for TTL duration to reduce latency.',
          useWhen: 'Always — fundamental to DNS performance',
          example: 'TTL=300 (5 min) for dynamic, TTL=86400 (1 day) for static'
        }
      ]
    },
    {
      id: 'cdn-deep-dive',
      title: 'CDN Deep Dive',
      icon: 'globe',
      color: '#f59e0b',
      questions: 8,
      description: 'Content Delivery Networks: push vs pull, cache invalidation, and edge architecture.',
      concepts: ['Push vs Pull CDN', 'Origin Server vs Edge Server', 'Cache Invalidation', 'CDN Cache Hierarchy', 'Edge Computing', 'Multi-CDN Strategy', 'Cache Key Design', 'Stale-While-Revalidate'],
      tips: [
        'Pull CDN is the default choice -- content is cached on first request',
        'Push CDN is for large files or content you know will be popular',
        'Cache invalidation is the hardest problem -- prefer TTL with versioned URLs',
        'Use versioned filenames (app.abc123.js) instead of cache purges when possible',
        'CDNs reduce latency AND offload origin servers -- double benefit',
        'Always set proper Cache-Control headers; the CDN just obeys them'
      ],

      introduction: `A **Content Delivery Network (CDN)** is a globally distributed network of servers (called **edge servers** or **Points of Presence/PoPs**) that cache and serve content from locations geographically close to end users. Instead of every user fetching content from a single origin server (potentially thousands of miles away), the CDN serves cached copies from the nearest edge, dramatically reducing latency and offloading the origin.

CDNs are essential for serving static assets (images, CSS, JavaScript, videos) and increasingly for dynamic content as well. **Cloudflare** operates 300+ data centers worldwide, **AWS CloudFront** has 400+ edge locations, and **Akamai** serves 30%+ of all web traffic. Without CDNs, the modern web as we know it would not function -- page load times would be measured in seconds rather than milliseconds.

In system design interviews, mentioning a CDN is almost always appropriate for any user-facing system. The key design decisions are whether to use a **push** or **pull** strategy, how to handle **cache invalidation**, how to design **cache keys** for content that varies by user or device, and how to architect the **cache hierarchy** (edge -> shield/mid-tier -> origin). These decisions directly impact user experience, origin load, and cost.`,

      functionalRequirements: [
        'Serve cached content from edge servers nearest to users',
        'Support static assets (images, JS, CSS, video) and cacheable API responses',
        'Handle cache misses by fetching from origin',
        'Support cache invalidation and purging',
        'Handle HTTPS with edge SSL certificates',
        'Support content compression (gzip, brotli)'
      ],

      nonFunctionalRequirements: [
        'Latency: < 50ms for cached content (edge hit)',
        'Cache hit ratio: > 95% for static content',
        'Availability: 99.99% (CDN failure = slow, not broken)',
        'Throughput: Handle traffic spikes without origin overload',
        'Global coverage: Edge servers on every populated continent',
        'Purge propagation: < 5 seconds globally'
      ],

      dataModel: {
        description: 'CDN architecture and cache hierarchy',
        schema: `CDN Cache Hierarchy:

  User -> Edge PoP (nearest) -> Shield/Mid-Tier -> Origin

  Edge Server (PoP):
    Location: 300+ cities worldwide
    Cache: Hot content for that region
    Miss: Forward to shield or origin

  Shield/Mid-Tier (optional):
    Location: ~10 regional hubs
    Cache: Aggregates misses from many edges
    Purpose: Reduces load on origin (collapse many edge misses into one origin fetch)

  Origin Server:
    Location: Your data center / cloud region
    Source of truth for all content

Cache Entry:
{
  url: "https://cdn.example.com/images/hero.webp",
  cache_key: "GET|/images/hero.webp|Accept-Encoding:gzip",
  content: <binary>,
  headers: {
    "Cache-Control": "public, max-age=86400",
    "ETag": "abc123",
    "Content-Type": "image/webp",
    "Content-Encoding": "gzip"
  },
  stored_at: "2024-01-01T00:00:00Z",
  expires_at: "2024-01-02T00:00:00Z",
  size_bytes: 45000
}`
      },

      apiDesign: {
        description: 'CDN configuration and management',
        endpoints: [
          { method: 'GET', path: 'cdn.example.com/assets/app.js', params: 'Accept-Encoding', response: 'Cached asset (X-Cache: HIT or MISS)' },
          { method: 'PURGE', path: 'cdn.purge("/assets/app.js")', params: 'path or pattern', response: 'Purge propagated to all edges' },
          { method: 'PURGE', path: 'cdn.purgeAll()', params: '-', response: 'Entire cache cleared (use rarely!)' },
          { method: 'CONFIG', path: 'cdn.setCacheRule(pattern, ttl)', params: 'URL pattern, TTL', response: 'Cache rule updated' },
          { method: 'STATS', path: 'cdn.getAnalytics()', params: 'date range', response: 'Hit ratio, bandwidth, latency metrics' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is the difference between push and pull CDN?',
          answer: `**Pull CDN** (most common):
  Content is cached on the FIRST request (lazy).

  Request flow:
  1. User requests /images/hero.jpg
  2. Edge checks cache -> MISS
  3. Edge fetches from origin server
  4. Edge caches the response
  5. Returns to user
  6. Next request from same edge -> HIT (fast)

  Pros:
  - Simple: No upload/sync needed
  - Efficient: Only caches content that is actually requested
  - Automatic: Cache fills itself based on traffic

  Cons:
  - First request is slow (cache miss)
  - Cold start after purge or TTL expiry
  - Origin must handle initial burst of misses

  Best for: Websites, APIs, dynamically generated content

**Push CDN**:
  Content is uploaded to CDN BEFORE users request it.

  Upload flow:
  1. You upload /videos/promo.mp4 to CDN
  2. CDN distributes to all edge servers
  3. When user requests it -> HIT immediately

  Pros:
  - No cold start (content pre-distributed)
  - Predictable performance
  - Origin not needed after initial upload

  Cons:
  - Must manage uploads and synchronization
  - Storage costs (content on every edge, used or not)
  - More complex deployment pipeline

  Best for: Large files (video), known-popular content, live events

**Hybrid approach** (common in practice):
  - Push for large/known-popular content (video catalogs)
  - Pull for everything else (web assets, API responses)
  - Pre-warm pull CDN for anticipated traffic spikes`
        },
        {
          question: 'How does CDN cache invalidation work?',
          answer: `**The fundamental challenge**: You update content on the origin, but edges still serve stale cached copies until TTL expires.

**Strategy 1: TTL-based expiration** (simplest)
  Cache-Control: public, max-age=3600
  -> Content expires after 1 hour
  -> Stale for up to 1 hour after origin update
  -> Acceptable for most content

**Strategy 2: Versioned URLs** (recommended for assets)
  Instead of: /css/styles.css
  Use:        /css/styles.abc123.css  (hash in filename)

  When content changes:
  -> New file: /css/styles.def456.css
  -> HTML references new URL
  -> Old version naturally expires
  -> No purge needed!

  Build tools (webpack, vite) do this automatically.

**Strategy 3: Cache purge / invalidation API**
  cdn.purge("/api/products/123")
  cdn.purge("/images/*")    (wildcard)

  -> Propagates to all edges globally
  -> Takes 1-30 seconds depending on CDN
  -> Use sparingly (expensive at scale)

**Strategy 4: Stale-while-revalidate**
  Cache-Control: public, max-age=60, stale-while-revalidate=300

  -> Serve cached content for 60 seconds
  -> After 60s, serve STALE content while fetching fresh in background
  -> User always gets fast response
  -> Content is at most 60s stale (usually much less)

**Strategy 5: Cache tags** (advanced)
  Tag content: "product:123", "category:electronics"
  Purge by tag: cdn.purgeByTag("product:123")
  -> Invalidates all content tagged with that product
  -> More targeted than URL-based purge

**Best practice priority**:
  1. Versioned URLs for static assets (no purge needed)
  2. Stale-while-revalidate for API responses
  3. Short TTL for frequently changing content
  4. Purge API for emergency/critical updates`
        },
        {
          question: 'How do you design cache keys for content that varies by user or device?',
          answer: `**Cache key**: The unique identifier for a cached response. By default, it is the URL, but content often varies by other factors.

**The Vary header problem**:
  Same URL, different content:
  - /api/feed (desktop vs mobile layout)
  - /api/products (English vs Spanish)
  - /api/data (gzip vs brotli compression)

**Vary header approach**:
  Response header: Vary: Accept-Encoding, Accept-Language

  Cache key becomes: URL + Accept-Encoding + Accept-Language
  /api/products|gzip|en -> English, gzip
  /api/products|br|es   -> Spanish, brotli

**Custom cache key dimensions**:

| Dimension       | Header/Cookie          | Example                   |
|----------------|----------------------|---------------------------|
| Compression    | Accept-Encoding       | gzip, br                  |
| Language       | Accept-Language       | en, es, fr                |
| Device type    | User-Agent (parsed)   | mobile, desktop, tablet   |
| Country        | CF-IPCountry (CDN)    | US, UK, JP                |
| A/B test group | Cookie: ab_group=A    | variant_a, variant_b      |
| Auth status    | Cookie: logged_in     | anonymous, authenticated  |

**Pitfall: Over-fragmenting the cache**
  If cache key = URL + full User-Agent string:
  -> Thousands of unique cache entries per URL
  -> Cache hit ratio plummets
  -> Fix: Normalize to "mobile" or "desktop", not full UA string

**Best practices**:
- Keep cache key dimensions minimal
- Normalize values (mobile/desktop, not raw User-Agent)
- Separate personalized content from cacheable content
- Use edge-side includes (ESI) to cache page fragments independently
- Set Vary headers carefully -- each combination is a separate cache entry

**Personalized content strategy**:
  Static shell: Cached at CDN (header, footer, layout)
  Dynamic data: Fetched via API call from browser (not cached)
  -> Cache the 90% that is shared, fetch the 10% that is personal`
        },
        {
          question: 'What is a CDN shield/mid-tier and why is it important?',
          answer: `**CDN Shield (Origin Shield / Mid-Tier Cache)**: An intermediate cache layer between edge PoPs and the origin server.

**Without shield**:
  200 edge PoPs each have a cache miss
  -> 200 simultaneous requests to origin
  -> Origin overloaded

  Edge 1 --miss--> Origin
  Edge 2 --miss--> Origin
  Edge 3 --miss--> Origin
  ...
  Edge 200 --miss--> Origin  (OVERLOADED!)

**With shield**:
  200 edge PoPs forward misses to 1 shield server
  -> Shield fetches from origin ONCE
  -> Returns cached response to all 200 edges

  Edge 1 --miss--> Shield --miss--> Origin (1 request)
  Edge 2 --miss--> Shield --HIT-->  (cached)
  Edge 3 --miss--> Shield --HIT-->  (cached)
  ...
  Edge 200 --miss--> Shield --HIT--> (cached)

**Benefits**:
- Origin receives 1 request instead of 200
- Dramatic reduction in origin load (100-200x)
- Shield has more cache capacity than individual edges
- Request collapsing: multiple simultaneous misses become one origin fetch

**Architecture**:
  User -> Edge PoP (city-level, 300+)
       -> Shield PoP (regional, ~5-10)
       -> Origin Server (1-2 data centers)

**When to use a shield**:
- High-traffic sites with many edge PoPs
- Expensive origin responses (API calls, database queries)
- Content with moderate cache hit ratio at the edge
- Live events where many edges go cold simultaneously

**Cost consideration**:
- Shield adds ~10-30ms latency on edge miss
- But reduces origin load dramatically
- Net positive for any non-trivial traffic volume

**All major CDNs support this**:
- CloudFront: Origin Shield
- Cloudflare: Tiered Cache
- Fastly: Shield PoP
- Akamai: Tiered Distribution`
        },
        {
          question: 'How do you architect a system to work well with a CDN?',
          answer: `**Design principles for CDN-friendly architecture**:

**1. Separate static and dynamic content**:
  Static: cdn.example.com/assets/*   (long TTL, versioned)
  Dynamic: api.example.com/api/*     (short or no cache)

  Static assets get near-100% cache hit ratio
  API responses are cached selectively

**2. Use proper Cache-Control headers**:
  Static assets: Cache-Control: public, max-age=31536000, immutable
  API (cacheable): Cache-Control: public, max-age=60, stale-while-revalidate=300
  API (private): Cache-Control: private, no-store
  HTML pages: Cache-Control: public, max-age=300

**3. Implement cache-busting with content hashing**:
  /assets/app.abc123.js  (hash changes when content changes)
  -> Set very long TTL (1 year)
  -> No purge needed
  -> Optimal cache efficiency

**4. Design APIs for cacheability**:
  Cacheable:
    GET /api/products/123          (specific resource)
    GET /api/categories            (public list)

  Not cacheable:
    GET /api/me/profile            (personalized)
    POST /api/orders               (mutation)

**5. Use edge-side logic**:
  Cloudflare Workers / Lambda@Edge:
  - A/B testing at the edge (no origin needed)
  - Geolocation-based redirects
  - Authentication checks
  - Response transformation

**Complete CDN architecture**:
  Browser
    |
  CDN Edge (static assets, cached API)
    |
  CDN Shield (aggregates misses)
    |
  Origin Load Balancer
    |
  Application Servers + Database

**Monitoring CDN performance**:
- Cache hit ratio (target: >90% for static, >50% for API)
- Origin offload percentage
- Edge latency by region
- Cache purge frequency (should be rare)
- Bandwidth savings vs origin-only`
        }
      ],

      basicImplementation: {
        title: 'Simple CDN Setup',
        description: 'Single CDN provider with pull-based caching for static assets and a custom origin.',
        svgTemplate: 'multiTierCache',
        problems: [
          'No cache hierarchy (every edge miss hits origin)',
          'Manual cache invalidation',
          'No multi-CDN failover',
          'Limited edge logic'
        ]
      },

      advancedImplementation: {
        title: 'Enterprise CDN Architecture',
        description: 'Multi-CDN with edge computing, tiered cache hierarchy (edge -> shield -> origin), versioned assets, and real-time purge.',
        svgTemplate: 'globalLoadBalancer',
        keyPoints: [
          'Multi-CDN with traffic splitting for redundancy and performance',
          'Tiered cache hierarchy reduces origin load by 100x+',
          'Edge computing for A/B tests, auth, and personalization',
          'Versioned URLs eliminate cache invalidation for assets',
          'Real-time monitoring of cache hit ratio per region'
        ]
      },

      discussionPoints: [
        {
          topic: 'CDN Provider Selection',
          points: [
            'Cloudflare: Best developer experience, Workers at edge, generous free tier',
            'AWS CloudFront: Deep AWS integration, Lambda@Edge',
            'Akamai: Largest network, enterprise-grade, highest cost',
            'Fastly: Real-time purge, VCL scripting, developer-friendly',
            'Multi-CDN for maximum availability and performance'
          ]
        },
        {
          topic: 'Cache Optimization',
          points: [
            'Monitor cache hit ratio and investigate misses',
            'Use versioned URLs to avoid purge operations',
            'Stale-while-revalidate for balance of freshness and speed',
            'Minimize Vary header dimensions to prevent cache fragmentation',
            'Pre-warm cache before anticipated traffic spikes'
          ]
        },
        {
          topic: 'CDN in System Design Interviews',
          points: [
            'Always mention CDN for user-facing systems',
            'Distinguish static asset CDN from API caching',
            'Discuss cache invalidation strategy proactively',
            'Mention CDN as a DDoS mitigation layer',
            'Consider edge computing for latency-sensitive operations'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-cdn', title: 'CDN Architecture (Eraser)', description: 'Origin server, global edge nodes, cache hit/miss flow, DNS routing, SSL termination', src: '/diagrams/cdn-deep-dive/eraser-cdn.png', type: 'cloud-architecture' }
      ],

      comparisonTables: [
        {
          id: 'push-vs-pull-cdn',
          title: 'Push CDN vs Pull CDN',
          left: {
            title: 'Push CDN',
            icon: 'upload',
            color: '#f59e0b',
            items: [
              { label: 'How', value: 'You upload content to CDN proactively' },
              { label: 'Freshness', value: 'Always up to date — you control uploads' },
              { label: 'Storage', value: 'Higher — stores everything you push' },
              { label: 'First Request', value: 'Fast — already cached' },
              { label: 'Complexity', value: 'More work — manage uploads yourself' },
              { label: 'Best For', value: 'Static sites, known content, videos' }
            ]
          },
          right: {
            title: 'Pull CDN',
            icon: 'download',
            color: '#3b82f6',
            items: [
              { label: 'How', value: 'CDN fetches from origin on first request' },
              { label: 'Freshness', value: 'Depends on TTL, can serve stale' },
              { label: 'Storage', value: 'Lower — only caches popular content' },
              { label: 'First Request', value: 'Slow — cache miss, fetches from origin' },
              { label: 'Complexity', value: 'Easier — CDN handles caching logic' },
              { label: 'Best For', value: 'Dynamic sites, high traffic, APIs' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'cdn-benefits',
          title: 'CDN Performance Impact',
          color: '#3b82f6',
          icon: 'zap',
          items: [
            { label: 'Latency reduction', value: '50-70% lower (edge servers)', bar: 90 },
            { label: 'Origin offload', value: '70-90% requests served from edge', bar: 85 },
            { label: 'Bandwidth savings', value: '40-60% reduction', bar: 70 },
            { label: 'DDoS protection', value: 'Absorb attack traffic at edge', bar: 75 },
            { label: 'SSL/TLS offload', value: 'Terminate SSL at edge', bar: 60 },
            { label: 'Global availability', value: '99.99%+ uptime', bar: 95 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'cache-invalidation-cdn', name: 'Cache Invalidation', icon: 'refreshCw', color: '#ef4444',
          description: 'Purge or expire cached content when origin changes.',
          useWhen: 'Content updates, deployments, bug fixes',
          example: 'Versioned URLs (/app.v2.js), purge API, or short TTL'
        },
        {
          id: 'edge-computing', name: 'Edge Computing', icon: 'globe', color: '#10b981',
          description: 'Run code at CDN edge — personalization without origin roundtrip.',
          useWhen: 'A/B testing, geo-routing, auth at edge',
          example: 'Cloudflare Workers, Vercel Edge Functions, Lambda@Edge'
        }
      ],
      edgeCases: [
        { scenario: 'Cache stampede after purge or TTL expiry', impact: 'Hundreds of simultaneous cache misses overwhelm the origin server, causing cascading failures', mitigation: 'Use request coalescing at the edge, stale-while-revalidate headers, and lock-based origin fetching' },
        { scenario: 'Stale content served after emergency update', impact: 'Users see outdated or incorrect content despite origin being updated, damaging trust or causing security issues', mitigation: 'Use instant purge APIs with versioned URLs as primary strategy, short TTLs for critical content' },
        { scenario: 'CDN provider outage or edge PoP failure', impact: 'All users routed through that PoP experience downtime or high latency', mitigation: 'Implement multi-CDN failover with DNS-based health checks, ensure origin can handle direct traffic temporarily' },
        { scenario: 'Cache key collision from incorrect Vary headers', impact: 'Users receive content meant for different devices, languages, or auth states', mitigation: 'Carefully design cache keys with appropriate Vary headers, test with multiple user agents and accept-encoding values' },
        { scenario: 'SSL certificate expiration at edge', impact: 'Users see browser security warnings, blocking access to the entire site', mitigation: 'Use CDN-managed certificates with automatic renewal, monitor certificate expiry with alerts 30 days in advance' }
      ],
      tradeoffs: [
        { decision: 'Push CDN vs Pull CDN', pros: 'Push gives guaranteed freshness and fast first-request; Pull is simpler to operate and auto-caches popular content', cons: 'Push requires upload management and wastes storage on unpopular content; Pull has slow first requests and origin load on cache misses', recommendation: 'Use Pull CDN for most web applications; Push only for large static assets like video that must be pre-positioned' },
        { decision: 'Short TTL vs Long TTL', pros: 'Short TTLs keep content fresh with minimal staleness; Long TTLs maximize cache hit ratio and reduce origin load', cons: 'Short TTLs increase origin requests; Long TTLs risk serving stale content after updates', recommendation: 'Use long TTLs with versioned filenames for static assets, short TTLs with stale-while-revalidate for dynamic content' },
        { decision: 'Single CDN vs Multi-CDN', pros: 'Single CDN is simpler and cheaper; Multi-CDN provides redundancy and best-path routing', cons: 'Single CDN is a single point of failure; Multi-CDN adds complexity in cache management and configuration', recommendation: 'Start with single CDN, adopt multi-CDN when availability requirements exceed 99.99% or for global coverage gaps' },
        { decision: 'Edge computing vs Origin processing', pros: 'Edge computing reduces latency for personalization and auth; Origin processing is simpler to debug and deploy', cons: 'Edge computing has limited runtime and storage; Origin processing adds round-trip latency for every request', recommendation: 'Use edge for A/B testing, geo-routing, and auth token validation; keep complex business logic at the origin' }
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Browser or application that initiates content requests', components: ['DNS Resolution', 'HTTP Client', 'Browser Cache', 'Service Worker Cache'] },
        { name: 'Edge Layer', purpose: 'CDN Points of Presence serving cached content closest to users', components: ['Edge Cache', 'TLS Termination', 'Compression', 'Edge Functions', 'DDoS Protection'] },
        { name: 'Shield/Mid-Tier Layer', purpose: 'Regional cache that aggregates edge misses to protect the origin', components: ['Request Coalescing', 'Regional Cache', 'Miss Aggregation', 'Health Checks'] },
        { name: 'Origin Layer', purpose: 'Source of truth that generates and serves original content', components: ['Application Server', 'Object Storage', 'Cache-Control Headers', 'Origin Shield Config'] }
      ]
    },
    {
      id: 'redundancy-replication',
      title: 'Redundancy & Replication',
      icon: 'copy',
      color: '#ef4444',
      questions: 8,
      description: 'Active-passive, active-active, leader-follower, and leaderless replication strategies.',
      concepts: ['Active-Passive (Failover)', 'Active-Active', 'Leader-Follower Replication', 'Multi-Leader Replication', 'Leaderless Replication', 'Synchronous vs Asynchronous Replication', 'Conflict Resolution', 'Quorum Reads/Writes'],
      tips: [
        'Redundancy eliminates single points of failure -- every critical component needs a backup',
        'Active-passive is simpler but wastes resources; active-active uses all capacity',
        'Synchronous replication ensures consistency but adds latency; async is faster but risks data loss',
        'Leaderless replication (Dynamo-style) provides high availability but requires conflict resolution',
        'Quorum (W + R > N) gives you strong consistency in a replicated system',
        'Always test your failover mechanism -- untested failover is no failover'
      ],

      introduction: `**Redundancy** means having duplicate components so that if one fails, another can take over. **Replication** is the specific technique of keeping copies of data on multiple machines. Together, they form the foundation of high availability and fault tolerance in distributed systems. Without redundancy, any single hardware failure, network partition, or software crash can bring down your entire service.

There are several replication topologies, each with distinct trade-offs. **Leader-follower** (also called primary-replica or master-slave) is the simplest: one node handles writes, followers replicate and serve reads. **Multi-leader** allows writes on multiple nodes for geographic distribution but introduces conflict resolution complexity. **Leaderless** (Dynamo-style) has no designated leader -- any node can accept reads and writes, using quorums for consistency.

In system design interviews, redundancy and replication decisions appear in every scalable architecture. The key questions to answer are: how many replicas (typically 3), synchronous or asynchronous replication, how to handle failover, and what consistency guarantee you need. Understanding these trade-offs and being able to articulate why you chose a particular replication strategy for your design is what separates strong candidates from those who simply say "add replicas."`,

      functionalRequirements: [
        'Maintain multiple copies of data across separate machines',
        'Handle failover automatically when the primary fails',
        'Support read scaling by distributing reads across replicas',
        'Detect and recover from replica failures',
        'Resolve conflicts in multi-leader or leaderless setups',
        'Support geographic distribution of replicas'
      ],

      nonFunctionalRequirements: [
        'Replication lag: < 100ms (async), 0 (sync)',
        'Failover time: < 30 seconds for automated failover',
        'Data durability: Zero data loss with sync replication',
        'Read scalability: Linear with replica count',
        'Write availability: Maintained during single-node failures',
        'Recovery: Automated re-replication when replica rejoins'
      ],

      dataModel: {
        description: 'Replication topologies and their data flow',
        schema: `Leader-Follower (Primary-Replica):

  Writes ──> [Leader] ──replication──> [Follower 1]
                                   ──> [Follower 2]
  Reads  <── [Leader] or [Follower 1] or [Follower 2]

Multi-Leader:

  Region A              Region B
  [Leader A] <──sync──> [Leader B]
       |                     |
  [Follower]            [Follower]

  Writes accepted at BOTH leaders
  Conflict resolution needed for concurrent writes

Leaderless (Dynamo-style):

  Write ──> [Node 1] + [Node 2] + [Node 3]
  Read  <── [Node 1] + [Node 2] (quorum)

  W=2, R=2, N=3: Strong consistency (W+R > N)
  Any node accepts reads and writes

Failover States:
  Normal:   Leader active, followers replicating
  Detection: Leader missed 3 heartbeats (10-30 seconds)
  Election:  Followers elect new leader (Raft/Paxos)
  Promotion: Follower becomes new leader
  Recovery:  Old leader rejoins as follower, syncs data`
      },

      apiDesign: {
        description: 'Replication management operations',
        endpoints: [
          { method: 'STATUS', path: 'replication.getStatus()', params: '-', response: '{ leader, followers, lag_ms, sync_state }' },
          { method: 'FAILOVER', path: 'replication.promoteFollower(node)', params: 'follower id', response: 'New leader elected' },
          { method: 'ADD', path: 'replication.addReplica(node)', params: 'node address', response: 'Replica added, sync started' },
          { method: 'REMOVE', path: 'replication.removeReplica(node)', params: 'node id', response: 'Replica removed from set' },
          { method: 'CONFIG', path: 'replication.setMode(sync|async)', params: 'mode', response: 'Replication mode updated' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is the difference between active-passive and active-active redundancy?',
          answer: `**Active-Passive (Hot Standby)**:

  ┌─────────────┐         ┌─────────────┐
  │   Active    │ ──sync──> │   Passive   │
  │   (serves   │         │  (standby,   │
  │   traffic)  │         │   no traffic)│
  └──────┬──────┘         └──────┬──────┘
         │                       │
    All traffic              Idle (waiting)
         │                       │
         └───── Failover ────────┘
               (if active dies, passive takes over)

  Pros:
  - Simple to implement and reason about
  - No conflict resolution needed
  - Clear ownership of data

  Cons:
  - Wasted resources (passive is idle)
  - Failover takes time (30s-5min)
  - Passive may have stale data (replication lag)

**Active-Active**:

  ┌─────────────┐         ┌─────────────┐
  │   Active 1  │ <──sync──> │   Active 2  │
  │   (serves   │         │   (serves    │
  │   traffic)  │         │   traffic)   │
  └──────┬──────┘         └──────┬──────┘
         │                       │
    50% traffic             50% traffic
    (or by region)          (or by region)

  Pros:
  - Full resource utilization
  - No failover delay (other node already serving)
  - Better performance (traffic distributed)

  Cons:
  - Conflict resolution for concurrent writes
  - More complex to implement
  - Data synchronization overhead

**When to use each**:
- Active-passive: Simple applications, databases with strong consistency needs
- Active-active: Global services, high availability requirements, read-heavy workloads

**Hybrid**: Active-active for reads, active-passive for writes (common with leader-follower replication)`
        },
        {
          question: 'How does leader-follower replication work and what are the consistency implications?',
          answer: `**Leader-Follower (Primary-Replica) Replication**:

  All writes go to the leader.
  Leader streams changes to followers.
  Reads can go to leader OR followers.

**Synchronous replication**:
  Client -> Write to Leader -> Wait for Follower ACK -> Return success

  Leader:    WRITE ────────────────> ACK to client
  Follower:        REPLICATE ──> ACK

  Pros: Strong consistency (follower always up-to-date)
  Cons: Higher write latency, unavailable if follower is down
  Used by: PostgreSQL (synchronous_commit), MySQL semi-sync

**Asynchronous replication**:
  Client -> Write to Leader -> Return success immediately
  Leader streams to follower in background

  Leader:    WRITE ──> ACK to client (fast!)
  Follower:        REPLICATE ──> (eventually)

  Pros: Low write latency, leader not blocked by slow followers
  Cons: Replication lag, data loss if leader dies before replication
  Used by: Default in most databases

**Replication lag problems**:

  1. Stale reads: User writes, then reads from follower -> old data
     Fix: Read-your-writes consistency (read from leader after write)

  2. Non-monotonic reads: Two reads from different followers return
     different versions (time goes backward)
     Fix: Session consistency (stick to one follower per session)

  3. Causal ordering: User A posts, User B comments, but comment
     appears before post on some followers
     Fix: Causal consistency (track dependencies between writes)

**Semi-synchronous** (best of both):
  Wait for 1 follower ACK (synchronous), rest are async
  Guarantees at least 2 copies before acknowledging
  Used by: MySQL semi-sync replication`
        },
        {
          question: 'How does leaderless replication work and when should you use it?',
          answer: `**Leaderless (Dynamo-style) Replication**:
  No designated leader. Any node can accept reads and writes.
  Use quorums to ensure consistency.

**Write path**:
  Client sends write to ALL N replicas
  Write succeeds when W replicas acknowledge

  N=3, W=2:
  Client -> Node 1 (ACK) + Node 2 (ACK) + Node 3 (timeout)
  W=2 ACKs received -> success

**Read path**:
  Client reads from R replicas, takes the most recent version

  N=3, R=2:
  Client <- Node 1 (v5) + Node 2 (v5) + Node 3 (v4)
  Return v5 (most recent)

**Quorum formula**: W + R > N guarantees overlap

  N=3, W=2, R=2: Strong consistency
  - At least 1 node in the read set has the latest write

  N=3, W=1, R=1: Eventual consistency
  - Reads may miss recent writes (no quorum overlap)

**Conflict resolution** (concurrent writes to same key):

  1. Last-Writer-Wins (LWW):
     Keep the write with the latest timestamp
     Simple but can lose data

  2. Version Vectors:
     Track causal history per replica
     Detect true conflicts vs causal ordering

  3. Application-level merge:
     Return all conflicting versions to the application
     Application decides (e.g., union of sets)

**Repair mechanisms**:
  Read repair: On read, if replicas disagree, update stale ones
  Anti-entropy: Background process compares all replicas (Merkle trees)
  Hinted handoff: If a node is down, another temporarily stores its writes

**When to use leaderless**:
- Need high write availability (no single leader to fail)
- Can tolerate eventual consistency
- Multi-datacenter deployments
- Examples: Cassandra, DynamoDB, Riak

**When NOT to use leaderless**:
- Need strong consistency (use leader-based)
- Simple read-heavy workload (leader-follower is simpler)
- Cannot handle conflict resolution complexity`
        },
        {
          question: 'How does automated failover work and what can go wrong?',
          answer: `**Automated failover process**:

  Step 1: Failure Detection
    - Heartbeat monitoring (leader sends heartbeat every 1-5s)
    - If no heartbeat for N seconds -> suspect failure
    - Multiple nodes must agree leader is down (avoid false positives)

  Step 2: Leader Election
    - Followers run consensus protocol (Raft, Paxos)
    - Most up-to-date follower is preferred
    - New leader elected by majority vote

  Step 3: Reconfiguration
    - New leader starts accepting writes
    - Other followers redirect replication to new leader
    - DNS/load balancer updated to point to new leader
    - Old leader (if it recovers) becomes a follower

**What can go wrong**:

**1. Split-brain**: Two nodes think they are leader
  Old leader recovers but doesn't know it was replaced
  Both accept writes -> data divergence!

  Fix: Fencing (STONITH - Shoot The Other Node In The Head)
  Old leader's writes are rejected by followers
  Use epoch/term numbers to identify the current leader

**2. Data loss with async replication**:
  Leader accepted writes but died before replicating
  New leader is missing those writes

  Fix: Semi-synchronous replication (wait for 1+ follower ACK)
  Or accept potential data loss (trade-off for lower latency)

**3. Cascading failures**:
  Leader dies -> traffic shifts to new leader
  New leader overwhelmed -> it also fails

  Fix: Connection throttling, circuit breakers, gradual traffic shift

**4. False positive detection**:
  Leader is slow (GC pause, network blip), not dead
  System triggers unnecessary failover

  Fix: Longer detection timeout, multi-node agreement, adaptive thresholds

**Best practices**:
- Test failover regularly (chaos engineering)
- Monitor replication lag (promote the most up-to-date follower)
- Use fencing to prevent split-brain
- Keep failover manual for critical systems until you trust automation
- Document and drill the failover runbook`
        },
        {
          question: 'How do you design replication for a globally distributed system?',
          answer: `**Challenge**: Users are worldwide, but data must be consistent. Light takes ~100ms to travel across the globe, so synchronous replication across continents is too slow.

**Strategy 1: Single leader with geo-distributed followers**:

  US-East: Leader (writes)
  EU-West: Follower (reads)
  AP-Southeast: Follower (reads)

  Pros: Simple, strong consistency for writes
  Cons: Write latency for users far from leader
  Best for: Read-heavy workloads, can tolerate write latency

**Strategy 2: Multi-leader (per-region leaders)**:

  US-East: Leader A (local writes)
  EU-West: Leader B (local writes)
  Async replication between leaders

  Pros: Low write latency everywhere
  Cons: Conflict resolution needed
  Best for: Collaborative editing, social media, any write-heavy global app

**Strategy 3: Leaderless with geo-quorums**:

  US-East: 2 nodes
  EU-West: 2 nodes
  AP-SE: 1 node
  N=5, W=3, R=3

  Local write quorum within region for low latency
  Cross-region reads for consistency

**Real-world examples**:

  Google Spanner: Synchronized clocks (TrueTime) + Paxos
  -> Strong consistency globally
  -> Requires atomic clocks and GPS in every data center

  CockroachDB: Raft consensus per range
  -> Strong consistency with range-based sharding
  -> Higher latency for cross-range transactions

  DynamoDB Global Tables: Multi-leader, last-writer-wins
  -> Eventual consistency across regions
  -> Low latency everywhere

  Cassandra: Tunable consistency per query
  -> LOCAL_QUORUM for regional consistency
  -> EACH_QUORUM for global consistency (slower)

**Decision framework**:
- Can you tolerate eventual consistency? -> Multi-leader or leaderless
- Need strong consistency? -> Single leader (accept write latency)
- Need strong consistency AND low latency? -> Spanner-like ($$$ infrastructure)
- Write-heavy with conflicts? -> CRDTs or application-level merge`
        }
      ],

      basicImplementation: {
        title: 'Simple Leader-Follower Replication',
        description: 'One leader accepts writes, two followers replicate asynchronously for read scaling.',
        svgTemplate: 'shardedDatabase',
        problems: [
          'Replication lag causes stale reads',
          'Leader is a single point of failure (manual failover)',
          'Data loss possible if leader dies before replication',
          'No geographic distribution'
        ]
      },

      advancedImplementation: {
        title: 'Multi-Region Active-Active Replication',
        description: 'Multi-leader replication across regions with conflict resolution, automated failover, and tunable consistency levels.',
        svgTemplate: 'globalLoadBalancer',
        keyPoints: [
          'Multi-leader for low-latency writes in every region',
          'Automated conflict resolution (LWW or version vectors)',
          'Tunable consistency: LOCAL_QUORUM for speed, EACH_QUORUM for safety',
          'Automated failover with fencing to prevent split-brain',
          'Continuous monitoring of replication lag across regions'
        ]
      },

      discussionPoints: [
        {
          topic: 'Replication Strategy Selection',
          points: [
            'Leader-follower: Simplest, good for read-heavy workloads',
            'Multi-leader: For multi-region writes, accepts conflict complexity',
            'Leaderless: Maximum availability, eventual consistency',
            'Synchronous: Strong consistency, higher latency',
            'Semi-synchronous: Best trade-off for most applications'
          ]
        },
        {
          topic: 'Failure Handling',
          points: [
            'Automated failover reduces downtime but risks split-brain',
            'Fencing tokens prevent stale leaders from accepting writes',
            'Replication lag monitoring is essential for data loss prevention',
            'Chaos engineering tests reveal failover weaknesses',
            'Runbooks document manual recovery procedures'
          ]
        },
        {
          topic: 'Consistency vs Availability Trade-offs',
          points: [
            'Synchronous replication = consistent but slower and less available',
            'Asynchronous replication = fast but risks stale reads and data loss',
            'Quorum systems let you tune the trade-off per query',
            'Read-your-writes consistency is the minimum for good UX',
            'CRDTs enable conflict-free replication for certain data types'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-replication', title: 'Replication Architecture (Eraser)', description: 'Primary with sync standby, async cross-region replicas, automatic failover', src: '/diagrams/redundancy-replication/eraser-replication.png', type: 'cloud-architecture' },
        { id: 'disaster-recovery', title: 'Disaster Recovery Strategies', description: 'Backup & Restore, Pilot Light, Warm Standby, and Multi-Site Active-Active with RPO/RTO comparison', src: '/diagrams/redundancy-replication/disaster-recovery.svg', type: 'architecture' }
      ],

      comparisonTables: [
        {
          id: 'sync-vs-async-replication',
          title: 'Synchronous vs Asynchronous Replication',
          left: {
            title: 'Synchronous',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Write Confirm', value: 'After ALL replicas confirm' },
              { label: 'Consistency', value: 'Strong — all replicas in sync' },
              { label: 'Write Latency', value: 'Higher — waits for replicas' },
              { label: 'Data Loss Risk', value: 'Zero — fully durable' },
              { label: 'Availability', value: 'Lower — blocked if replica down' },
              { label: 'Use When', value: 'Financial data, critical writes' }
            ]
          },
          right: {
            title: 'Asynchronous',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Write Confirm', value: 'After primary confirms only' },
              { label: 'Consistency', value: 'Eventual — replicas lag behind' },
              { label: 'Write Latency', value: 'Low — doesn\'t wait for replicas' },
              { label: 'Data Loss Risk', value: 'Small window if primary fails' },
              { label: 'Availability', value: 'Higher — not blocked by replicas' },
              { label: 'Use When', value: 'Read-heavy, geo-distributed, analytics' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'replication-strategies',
          title: 'Replication Strategies',
          color: '#10b981',
          icon: 'copy',
          items: [
            { label: 'Single-Leader', value: 'One writer, many readers', bar: 80 },
            { label: 'Multi-Leader', value: 'Multiple writers, conflict resolution', bar: 60 },
            { label: 'Leaderless', value: 'Any node reads/writes, quorum-based', bar: 50 },
            { label: 'Active-Passive', value: 'Standby takes over on failure', bar: 85 },
            { label: 'Active-Active', value: 'All nodes serve traffic', bar: 70 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'failover', name: 'Automatic Failover', icon: 'refreshCw', color: '#ef4444',
          description: 'Detect primary failure, promote replica to primary.',
          useWhen: 'High availability required, minimize downtime',
          example: 'PostgreSQL patroni, MySQL Group Replication, Redis Sentinel'
        },
        {
          id: 'multi-region', name: 'Multi-Region Replication', icon: 'globe', color: '#3b82f6',
          description: 'Replicate across geographic regions for disaster recovery.',
          useWhen: 'Global users, regulatory requirements, DR',
          example: 'AWS RDS cross-region read replicas, CockroachDB multi-region'
        }
      ],
      comparisonCards: [
        {
          title: 'Fault-Tolerant System Design Principles',
          items: [
            { name: 'Replication', description: 'Create multiple copies of data or services across different nodes/regions. If one node fails, others serve the data. Used by Cassandra, Aurora, DynamoDB.' },
            { name: 'Redundancy', description: 'Deploy additional standby components that take over on failure. Active-Active (both serve traffic) or Active-Passive (standby activates on failure). Includes RAID storage.' },
            { name: 'Load Balancing', description: 'Distribute traffic across servers so no single server is a point of failure. Combined with health checks, automatically removes failed servers.' },
            { name: 'Failover Mechanisms', description: 'Automatically switch to a standby system when the primary fails. Requires health monitoring and fast detection. Examples: DNS failover, database failover.' },
            { name: 'Graceful Degradation', description: 'System continues operating at reduced functionality rather than completely failing. Disable non-essential features during overload (e.g., disable recommendations, serve cached pages).' },
            { name: 'Monitoring & Alerting', description: 'Continuously monitor health and performance. Set up alerts for anomalies. Tools: Prometheus + Grafana for metrics, ELK for logs, PagerDuty for alerting.' }
          ]
        },
        {
          title: 'Cloud Disaster Recovery Strategies',
          items: [
            { name: 'Backup & Restore (RPO: hours, RTO: hours)', description: 'Regular backups from primary site to cloud DR site. On disaster, restore from snapshots and images. Cheapest but slowest recovery. Suitable for non-critical systems.' },
            { name: 'Pilot Light (RPO: minutes, RTO: tens of minutes)', description: 'Minimal core services running in DR site with data continuously synced. On disaster, DNS switches traffic and services scale up. Like a pilot light that can ignite the full system.' },
            { name: 'Warm Standby (RPO: seconds, RTO: minutes)', description: 'Scaled-down but fully functional copy running in DR site behind a load balancer. On disaster, auto-scaling kicks in to handle full production load. Good balance of cost and speed.' },
            { name: 'Multi-Site Active-Active (RPO: near zero, RTO: near zero)', description: 'Both sites actively serving traffic simultaneously with data sync. On disaster, load balancer redirects all traffic to surviving site. Most expensive but fastest recovery.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'Split-brain during network partition', impact: 'Two leaders accept conflicting writes, causing data divergence that is difficult to reconcile', mitigation: 'Use fencing tokens, implement STONITH, require majority quorum for leader election' },
        { scenario: 'Replication lag spike under heavy write load', impact: 'Followers fall far behind the leader, causing stale reads and potential failover to an outdated replica', mitigation: 'Monitor replication lag with alerts, throttle writes if lag exceeds threshold, use semi-synchronous replication for critical data' },
        { scenario: 'Failover promotes a follower with incomplete data', impact: 'Recently committed transactions are lost because the new leader had not yet received them', mitigation: 'Use synchronous replication for at least one follower, verify follower state before promotion, implement write-ahead log shipping' },
        { scenario: 'Cascading failure when primary and backup fail simultaneously', impact: 'Complete service outage with potential data loss if no tertiary replica exists', mitigation: 'Maintain at least 3 replicas across different failure domains, implement circuit breakers, and have runbook for manual recovery' },
        { scenario: 'Conflict resolution failure in multi-leader setup', impact: 'Data corruption or silent data loss when concurrent writes to different leaders cannot be automatically merged', mitigation: 'Use CRDTs for mergeable data types, implement application-level conflict resolution, prefer single-leader for write-heavy workloads' }
      ],
      tradeoffs: [
        { decision: 'Synchronous vs Asynchronous replication', pros: 'Synchronous ensures zero data loss on failover; Asynchronous provides lower write latency and higher throughput', cons: 'Synchronous blocks writes on slow followers and reduces availability; Asynchronous risks data loss if leader fails before replication', recommendation: 'Use semi-synchronous replication: one sync follower for durability, rest async for performance' },
        { decision: 'Active-Passive vs Active-Active', pros: 'Active-Passive is simpler with no conflict resolution; Active-Active uses all capacity and handles regional failures', cons: 'Active-Passive wastes standby resources; Active-Active requires conflict resolution and complex routing', recommendation: 'Use Active-Passive for databases and stateful services; Active-Active for stateless services behind a global load balancer' },
        { decision: 'Leader-Follower vs Leaderless replication', pros: 'Leader-Follower is simpler with clear write ordering; Leaderless has no single point of failure for writes', cons: 'Leader-Follower bottlenecks on the leader; Leaderless requires quorum coordination and conflict resolution', recommendation: 'Use Leader-Follower for relational workloads needing strong consistency; Leaderless for high-availability key-value stores' },
        { decision: 'Few replicas (3) vs Many replicas (5+)', pros: 'Fewer replicas mean lower storage cost and faster writes; More replicas improve read throughput and fault tolerance', cons: 'Fewer replicas limit fault tolerance; More replicas increase replication lag, storage, and write amplification', recommendation: 'Use 3 replicas as default, increase to 5 only for read-heavy workloads or when tolerating 2 simultaneous failures is required' }
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Routes reads and writes to appropriate replicas', components: ['Connection Router', 'Read/Write Splitting', 'Retry Logic', 'Failover Detection'] },
        { name: 'Replication Layer', purpose: 'Manages data synchronization between leader and followers', components: ['Write-Ahead Log', 'Replication Stream', 'Lag Monitor', 'Conflict Detector'] },
        { name: 'Consensus Layer', purpose: 'Coordinates leader election and membership changes', components: ['Raft/Paxos Protocol', 'Leader Election', 'Heartbeat Monitor', 'Fencing Token Service'] },
        { name: 'Storage Layer', purpose: 'Persists data durably on each replica node', components: ['WAL Storage', 'Data Files', 'Snapshot Engine', 'Compaction Process'] }
      ]
    },
    {
      id: 'network-essentials',
      title: 'Network Essentials',
      icon: 'wifi',
      color: '#06b6d4',
      questions: 8,
      description: 'HTTP versions, TCP vs UDP vs QUIC, TLS, and gRPC for system design.',
      concepts: ['HTTP/1.1 vs HTTP/2 vs HTTP/3', 'TCP vs UDP', 'QUIC Protocol', 'TLS and mTLS', 'gRPC and Protocol Buffers', 'WebSocket Protocol', 'Connection Pooling', 'Head-of-Line Blocking'],
      tips: [
        'HTTP/2 multiplexing solves HTTP/1.1 head-of-line blocking at the application layer',
        'HTTP/3 (QUIC) solves head-of-line blocking at the transport layer too',
        'gRPC uses HTTP/2 under the hood, which is why it supports streaming',
        'mTLS (mutual TLS) authenticates BOTH client and server -- essential for microservices',
        'UDP is not "unreliable" -- it is connectionless, and many reliable protocols build on it (QUIC)',
        'Connection pooling is one of the simplest and most impactful performance optimizations'
      ],

      introduction: `Understanding network protocols is fundamental to system design because every interaction between components travels over a network. The choice between **TCP** and **UDP**, the **HTTP version**, and whether to use **TLS** or **mTLS** directly impacts your system's latency, throughput, security, and reliability. These are not abstract protocol details -- they have measurable, practical consequences.

**HTTP** has evolved significantly: **HTTP/1.1** introduced persistent connections but suffers from head-of-line blocking. **HTTP/2** added multiplexing, header compression, and server push. **HTTP/3** replaced TCP entirely with **QUIC** (built on UDP), eliminating transport-layer head-of-line blocking and reducing connection establishment time. Each version solves real problems that affect user experience at scale.

For inter-service communication, **gRPC** (using HTTP/2 and Protocol Buffers) has become the standard for microservices due to its efficiency, strong typing, and streaming support. **TLS** encrypts all traffic in transit, and **mTLS** (mutual TLS) adds client authentication, which is essential in zero-trust architectures. In system design interviews, demonstrating knowledge of these protocols and when to use each shows that you understand the infrastructure beneath your application code.`,

      functionalRequirements: [
        'Reliable delivery of data between services (TCP-based)',
        'Low-latency real-time communication (UDP/QUIC-based)',
        'Multiplexed concurrent requests over a single connection (HTTP/2+)',
        'Encrypted communication for all data in transit (TLS)',
        'Mutual authentication between services (mTLS)',
        'Efficient binary serialization for inter-service calls (gRPC/Protobuf)'
      ],

      nonFunctionalRequirements: [
        'Connection setup: < 1 RTT with TLS 1.3 / QUIC 0-RTT',
        'Throughput: Saturate available bandwidth',
        'Latency: Minimize protocol overhead (< 1ms per hop)',
        'Security: TLS 1.3 minimum, no fallback to older versions',
        'Efficiency: Binary protocols (gRPC) 5-10x smaller than JSON',
        'Reliability: Automatic retransmission for dropped packets (TCP/QUIC)'
      ],

      dataModel: {
        description: 'Protocol comparison and layering',
        schema: `Protocol Stack:

  Application:  HTTP/1.1  HTTP/2   HTTP/3   gRPC   WebSocket
                  |         |        |        |        |
  Security:      TLS 1.2/1.3       TLS 1.3   TLS    TLS
                  |         |        |        |        |
  Transport:     TCP       TCP      QUIC     TCP     TCP
                  |         |        |        |
  Network:       IP        IP       UDP/IP   IP

HTTP Version Comparison:
  Feature          HTTP/1.1    HTTP/2      HTTP/3
  Multiplexing     No*         Yes         Yes
  Header compress  No          HPACK       QPACK
  Server push      No          Yes         Yes
  Transport        TCP         TCP         QUIC (UDP)
  HOL blocking     App+Trans   Transport   None
  Connection setup 2 RTT+TLS   2 RTT+TLS   0-1 RTT

  *HTTP/1.1 pipelining exists but is rarely used

TCP vs UDP vs QUIC:
  TCP:  Reliable, ordered, connection-oriented, 3-way handshake
  UDP:  Unreliable, unordered, connectionless, no handshake
  QUIC: Reliable, ordered, connection-oriented, 0-RTT, built on UDP`
      },

      apiDesign: {
        description: 'Protocol usage patterns in system design',
        endpoints: [
          { method: 'HTTP/1.1', path: 'GET /api/resource', params: 'One request per connection (or keep-alive)', response: 'Text-based headers, chunked body' },
          { method: 'HTTP/2', path: 'GET /api/resource (stream 1)', params: 'Multiplexed with other streams', response: 'Binary frames, HPACK compressed headers' },
          { method: 'gRPC', path: 'service.Method(Request)', params: 'Protobuf binary', response: 'Protobuf binary (bidirectional streaming)' },
          { method: 'WebSocket', path: 'ws://host/path', params: 'HTTP upgrade handshake', response: 'Full-duplex bidirectional messages' },
          { method: 'mTLS', path: 'Client cert + Server cert', params: 'Both parties present certificates', response: 'Mutual authentication established' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the key differences between HTTP/1.1, HTTP/2, and HTTP/3?',
          answer: `**HTTP/1.1** (1997):
- Text-based protocol
- One request per connection (or keep-alive for sequential requests)
- Head-of-line (HOL) blocking: one slow response blocks all others
- Browsers open 6-8 parallel connections per domain as workaround
- Still widely used, simple to debug

**HTTP/2** (2015):
- Binary framing (not human-readable)
- Multiplexing: many requests on ONE connection simultaneously
- HPACK header compression (reduces redundant headers by ~85%)
- Server push: server can send resources before client requests them
- Stream prioritization: important resources first
- Solves application-layer HOL blocking
- Still uses TCP -> transport-layer HOL blocking remains

  HTTP/1.1:  Req1 ──> Resp1 ──> Req2 ──> Resp2 (sequential)
  HTTP/2:    Req1 ──> ──> ──>        (parallel on same connection)
             Req2 ──> ──>
             Req3 ──> ──> ──> ──>

**HTTP/3** (2022):
- Uses QUIC instead of TCP (built on UDP)
- Eliminates transport-layer HOL blocking
  (one lost packet only affects its stream, not all streams)
- 0-RTT connection establishment (instant reconnection)
- Built-in encryption (TLS 1.3 integrated into QUIC)
- Connection migration (survives IP changes, e.g., WiFi to cellular)

**When to use each**:
- HTTP/1.1: Legacy systems, simple APIs, debugging
- HTTP/2: Modern web applications, gRPC services
- HTTP/3: Mobile-first apps, lossy networks, global users`
        },
        {
          question: 'What is head-of-line blocking and how do different protocols handle it?',
          answer: `**Head-of-Line (HOL) Blocking**: When the first item in a queue blocks all subsequent items from being processed.

**HTTP/1.1 HOL blocking (application layer)**:
  Connection 1: [Req1 (slow)] [Req2 waiting] [Req3 waiting]

  Req1 takes 5 seconds -> Req2 and Req3 wait 5 seconds

  Workaround: Open multiple connections (6-8 per domain)
  Problem: Connection overhead, limited parallel slots

**HTTP/2 solves application-layer HOL**:
  Single connection, multiplexed streams:
  Stream 1: [Req1 frames] ....
  Stream 2: [Req2 frames] ..
  Stream 3: [Req3 frames] .....

  Slow stream 1 does NOT block streams 2 and 3
  Solved at HTTP level!

**BUT HTTP/2 has TCP HOL blocking**:
  TCP guarantees ordered delivery of ALL bytes
  If one packet is lost, TCP holds ALL data until retransmission

  Packet stream: [1] [2] [LOST] [4] [5]
  TCP:           [1] [2] [waiting...] [3 retransmit] [4] [5]

  All HTTP/2 streams blocked by one lost packet
  Worse than HTTP/1.1 in lossy networks (multiple connections = independent)

**HTTP/3 (QUIC) solves BOTH**:
  Each stream has independent packet ordering

  Stream 1: [pkt1] [pkt2] [LOST] [pkt4] -- only stream 1 waits
  Stream 2: [pkt1] [pkt2] [pkt3]        -- unaffected!
  Stream 3: [pkt1] [pkt2]               -- unaffected!

  Lost packet in stream 1 only blocks stream 1

**Impact on real-world performance**:
  Network    HTTP/1.1   HTTP/2    HTTP/3
  0% loss    Slow       Fast      Fast
  1% loss    OK         Slower*   Fast
  5% loss    Bad        Bad*      Good

  *HTTP/2 can be WORSE than HTTP/1.1 on lossy networks
  HTTP/3 is consistently better on lossy/mobile networks`
        },
        {
          question: 'How does gRPC work and when should you use it?',
          answer: `**gRPC**: A high-performance RPC framework by Google, using HTTP/2 and Protocol Buffers.

**Architecture**:
  Client -> gRPC Stub -> HTTP/2 -> gRPC Server -> Service Implementation

**Protocol Buffers** (Protobuf): Binary serialization format
  // user.proto
  message User {
    string id = 1;
    string name = 2;
    string email = 3;
    int32 age = 4;
  }

  JSON equivalent: {"id":"123","name":"Alice","email":"a@b.com","age":30}
  JSON size: ~60 bytes
  Protobuf size: ~25 bytes (2-3x smaller)
  Protobuf encode/decode: 5-10x faster than JSON

**Four communication patterns**:

  1. Unary (simple request-response):
     rpc GetUser(GetUserRequest) returns (User);

  2. Server streaming:
     rpc ListUsers(ListRequest) returns (stream User);
     Server sends multiple responses

  3. Client streaming:
     rpc UploadData(stream DataChunk) returns (UploadResponse);
     Client sends multiple requests

  4. Bidirectional streaming:
     rpc Chat(stream Message) returns (stream Message);
     Both sides send concurrently

**When to use gRPC vs REST**:
| Factor            | gRPC            | REST (JSON)       |
|-------------------|-----------------|-------------------|
| Performance       | 5-10x faster    | Baseline          |
| Type safety       | Strong (proto)  | Weak (docs/spec)  |
| Browser support   | Limited         | Native            |
| Debugging         | Hard (binary)   | Easy (text/JSON)  |
| Streaming         | Native          | WebSocket needed  |
| Code generation   | Automatic       | Manual/OpenAPI    |
| Interoperability  | Need proto file | Universal         |

**Use gRPC for**: Microservices internal calls, high-performance APIs, streaming data
**Use REST for**: Public APIs, browser clients, simple CRUD, broad compatibility`
        },
        {
          question: 'What is TLS and mTLS, and when do you need each?',
          answer: `**TLS (Transport Layer Security)**: Encrypts data in transit and authenticates the server.

**Standard TLS (one-way)**:
  Client -> Server
  1. Client initiates TLS handshake
  2. Server presents its certificate
  3. Client verifies certificate (trusted CA?)
  4. Shared session key established
  5. All data encrypted

  Result: Client knows it is talking to the real server
  Server does NOT verify client identity

**mTLS (Mutual TLS)**:
  Client <-> Server
  1. Client initiates TLS handshake
  2. Server presents its certificate (client verifies)
  3. Server requests client certificate
  4. Client presents its certificate (server verifies)
  5. BOTH sides authenticated + encrypted

  Result: Both sides know who they are talking to

**TLS versions**:
  TLS 1.2: 2 RTT handshake, still widely used
  TLS 1.3: 1 RTT handshake (or 0-RTT for resumed connections)
  -> Always use TLS 1.3 for new systems

**When to use standard TLS**:
- Browser to web server (users do not have certificates)
- Public APIs
- Any client-facing connection

**When to use mTLS**:
- Service-to-service communication (microservices)
- Zero-trust network architecture
- API access with client certificates instead of API keys
- Kubernetes pod-to-pod communication (Istio/Linkerd)

**mTLS in service mesh**:
  ┌───────────┐         ┌───────────┐
  │ Service A │         │ Service B │
  │ ┌───────┐ │ mTLS    │ ┌───────┐ │
  │ │Sidecar│ │────────>│ │Sidecar│ │
  │ └───────┘ │         │ └───────┘ │
  └───────────┘         └───────────┘

  Sidecars handle mTLS automatically
  Application code is unaware of encryption
  Certificate rotation handled by mesh control plane`
        },
        {
          question: 'What is QUIC and why is it important for modern systems?',
          answer: `**QUIC**: A transport protocol built on UDP that provides reliable, encrypted, multiplexed connections. Developed by Google, standardized as RFC 9000 (2021). HTTP/3 is HTTP-over-QUIC.

**Why QUIC was created**:
TCP was designed in 1974 and is baked into operating systems, routers, and middleboxes. Improving TCP requires updating the entire internet stack -- practically impossible. QUIC builds a better transport protocol on top of UDP, which middleboxes pass through unchanged.

**Key advantages over TCP+TLS**:

**1. Faster connection establishment**:
  TCP + TLS 1.2: 3 RTT (SYN, SYN-ACK, ACK, TLS handshake)
  TCP + TLS 1.3: 2 RTT
  QUIC:          1 RTT (first connection)
  QUIC resumed:  0 RTT (subsequent connections!)

  On a 100ms RTT network:
  TCP+TLS: 200-300ms before first data byte
  QUIC:    100ms (or 0ms for resumed!)

**2. No head-of-line blocking**:
  TCP: One lost packet blocks ALL streams
  QUIC: Each stream independent, loss affects only that stream

**3. Connection migration**:
  TCP: Connection = (src_ip, src_port, dst_ip, dst_port)
  Changing IP (WiFi to cell) = new connection = new handshake

  QUIC: Connection = connection_id (not tied to IP)
  Seamless migration when IP changes

**4. Built-in encryption**:
  TLS 1.3 is mandatory and integrated (not layered on top)
  Cannot downgrade to unencrypted

**Adoption**:
- Google: 50%+ of traffic is QUIC
- YouTube: 30% reduction in rebuffering
- Facebook: 6% latency improvement, 20% fewer errors on poor networks
- All major browsers support HTTP/3/QUIC

**When QUIC helps most**:
- Mobile networks (high packet loss, IP changes)
- Long-distance connections (high RTT)
- Multiplexed APIs (many concurrent streams)
- Real-time applications (low latency critical)`
        }
      ],

      basicImplementation: {
        title: 'Standard HTTP/1.1 + TLS',
        description: 'Traditional REST API over HTTP/1.1 with TLS termination at the load balancer.',
        svgTemplate: 'restApi',
        problems: [
          'Head-of-line blocking limits concurrent requests',
          'Text-based headers are verbose and redundant',
          'No multiplexing -- browsers open multiple connections',
          'No server push capability'
        ]
      },

      advancedImplementation: {
        title: 'Modern Protocol Stack',
        description: 'HTTP/3 (QUIC) for external clients, gRPC (HTTP/2) for internal services, mTLS everywhere, with protocol negotiation at the edge.',
        svgTemplate: 'apiGateway',
        keyPoints: [
          'HTTP/3 for external clients (fast connection, no HOL blocking)',
          'gRPC for internal microservice communication (efficient, typed)',
          'mTLS for all service-to-service connections',
          'Protocol negotiation at the edge (ALPN)',
          'Connection pooling to minimize handshake overhead'
        ]
      },

      discussionPoints: [
        {
          topic: 'Protocol Selection Guide',
          points: [
            'External API: HTTP/2 or HTTP/3 with JSON (broad compatibility)',
            'Internal services: gRPC (performance, type safety, streaming)',
            'Real-time: WebSocket or gRPC bidirectional streaming',
            'Mobile apps: HTTP/3 (handles network changes gracefully)',
            'IoT devices: MQTT over TCP/TLS or CoAP over UDP'
          ]
        },
        {
          topic: 'Security Best Practices',
          points: [
            'TLS 1.3 minimum for all connections',
            'mTLS for service-to-service in zero-trust networks',
            'Certificate rotation automated via service mesh or PKI',
            'HSTS headers prevent protocol downgrade attacks',
            'Pin certificates for mobile apps (prevent MITM)'
          ]
        },
        {
          topic: 'Performance Optimization',
          points: [
            'Connection pooling eliminates handshake latency for repeated calls',
            'HTTP/2 multiplexing reduces connection count and memory',
            'Binary protocols (Protobuf) reduce serialization overhead',
            '0-RTT QUIC for returning clients',
            'Keepalive settings prevent premature connection closure'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-network', title: 'Network Architecture (Eraser)', description: 'VPC with public/private subnets, firewall, L4/L7 LB, NAT gateway, DNS resolution', src: '/diagrams/network-essentials/eraser-network.png', type: 'cloud-architecture' }
      ],

      comparisonTables: [
        {
          id: 'tcp-vs-udp',
          title: 'TCP vs UDP',
          left: {
            title: 'TCP',
            icon: 'lock',
            color: '#3b82f6',
            items: [
              { label: 'Connection', value: 'Connection-oriented (3-way handshake)' },
              { label: 'Reliability', value: 'Guaranteed delivery + ordering' },
              { label: 'Speed', value: 'Slower — overhead from reliability' },
              { label: 'Use Cases', value: 'HTTP, email, file transfer, SSH' },
              { label: 'Congestion', value: 'Built-in congestion control' },
              { label: 'Header', value: '20+ bytes overhead' }
            ]
          },
          right: {
            title: 'UDP',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Connection', value: 'Connectionless (fire and forget)' },
              { label: 'Reliability', value: 'No guarantees — packets may drop' },
              { label: 'Speed', value: 'Fast — minimal overhead' },
              { label: 'Use Cases', value: 'Video streaming, gaming, DNS, VoIP' },
              { label: 'Congestion', value: 'No built-in control' },
              { label: 'Header', value: '8 bytes overhead' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'osi-layers',
          title: 'OSI Model Quick Reference',
          color: '#3b82f6',
          icon: 'layers',
          items: [
            { label: '7. Application', value: 'HTTP, FTP, DNS, SMTP', bar: 95 },
            { label: '6. Presentation', value: 'SSL/TLS, encoding, compression', bar: 80 },
            { label: '5. Session', value: 'Session mgmt, authentication', bar: 65 },
            { label: '4. Transport', value: 'TCP, UDP — port-to-port', bar: 85 },
            { label: '3. Network', value: 'IP, routing — host-to-host', bar: 90 },
            { label: '2. Data Link', value: 'Ethernet, MAC, switches', bar: 70 },
            { label: '1. Physical', value: 'Cables, signals, bits', bar: 50 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'three-way-handshake', name: '3-Way Handshake', icon: 'lock', color: '#3b82f6',
          description: 'SYN → SYN-ACK → ACK to establish reliable TCP connection.',
          useWhen: 'Every TCP connection (HTTP, database, etc.)',
          example: 'Client sends SYN, server SYN-ACK, client ACK → connected'
        },
        {
          id: 'keep-alive', name: 'HTTP Keep-Alive', icon: 'link', color: '#10b981',
          description: 'Reuse TCP connection for multiple HTTP requests.',
          useWhen: 'Multiple requests to same server (default in HTTP/1.1+)',
          example: 'Connection: keep-alive header, avoid handshake per request'
        }
      ],
      comparisonCards: [
        {
          title: 'UDP Use Cases',
          items: [
            { name: 'Live Video Streaming', description: 'VoIP and video conferencing use UDP for lower overhead and tolerance of packet loss. Real-time communication benefits from reduced latency vs TCP.' },
            { name: 'DNS Queries', description: 'DNS queries use UDP for fast, lightweight resolution. Most queries fit in single packets. TCP is only used for large responses or zone transfers.' },
            { name: 'Market Data Multicast', description: 'Low-latency trading systems use UDP multicast for efficient market data delivery to multiple recipients simultaneously.' },
            { name: 'IoT Communications', description: 'IoT devices send small packets of data between devices. UDP\'s low overhead is ideal for resource-constrained devices.' }
          ]
        }
      ],
      edgeCases: [
        { scenario: 'HTTP/2 head-of-line blocking at TCP layer', impact: 'A single lost TCP packet blocks all multiplexed streams, negating HTTP/2 benefits under lossy networks', mitigation: 'Migrate to HTTP/3 (QUIC) which handles packet loss per-stream, or use multiple TCP connections as fallback' },
        { scenario: 'TLS certificate chain validation failure in mTLS', impact: 'Microservices cannot communicate, causing cascading service failures across the mesh', mitigation: 'Automate certificate rotation with short-lived certs, use a service mesh like Istio for transparent mTLS management' },
        { scenario: 'Connection pool exhaustion under load', impact: 'New requests queue or fail because all pooled connections are in use, causing timeout errors', mitigation: 'Set appropriate pool size limits, implement connection timeouts, add circuit breakers, and monitor pool utilization metrics' },
        { scenario: 'gRPC deadline propagation failure across services', impact: 'Downstream services continue processing requests that the caller has already abandoned, wasting resources', mitigation: 'Propagate deadlines through context in every gRPC call chain, set reasonable per-hop timeouts, cancel downstream calls on timeout' },
        { scenario: 'QUIC UDP traffic blocked by corporate firewalls', impact: 'Users behind restrictive networks cannot connect via HTTP/3, experiencing connection failures', mitigation: 'Implement graceful fallback to HTTP/2 over TCP, use Alt-Svc headers to advertise QUIC availability without requiring it' }
      ],
      tradeoffs: [
        { decision: 'TCP vs UDP for application protocol', pros: 'TCP provides reliable, ordered delivery out of the box; UDP provides minimal latency and overhead', cons: 'TCP has connection setup overhead and head-of-line blocking; UDP requires building reliability at the application layer', recommendation: 'Use TCP (or QUIC) for most applications; UDP only for real-time media, gaming, or DNS where occasional packet loss is acceptable' },
        { decision: 'HTTP/2 vs HTTP/3 (QUIC)', pros: 'HTTP/2 is universally supported and well-understood; HTTP/3 eliminates transport HOL blocking and has faster connection setup', cons: 'HTTP/2 suffers from TCP HOL blocking on lossy networks; HTTP/3 may be blocked by firewalls and has less mature tooling', recommendation: 'Deploy HTTP/3 with HTTP/2 fallback for user-facing services; HTTP/2 is sufficient for internal service-to-service communication' },
        { decision: 'REST (JSON) vs gRPC (Protobuf) for inter-service calls', pros: 'REST is human-readable, cacheable, and universally supported; gRPC is 5-10x more efficient with strong typing and streaming', cons: 'REST has verbose payloads and no built-in streaming; gRPC is not browser-native and harder to debug', recommendation: 'Use gRPC for internal microservice communication; REST for public APIs and browser-facing endpoints' },
        { decision: 'TLS vs mTLS', pros: 'TLS encrypts traffic and authenticates the server; mTLS additionally authenticates clients for zero-trust security', cons: 'TLS alone does not verify client identity; mTLS adds certificate management complexity for every service', recommendation: 'Use mTLS for all internal service-to-service communication in production; TLS-only is sufficient for public-facing endpoints with API keys' }
      ],
      layeredDesign: [
        { name: 'Application Layer', purpose: 'Provides application-level protocols for data exchange', components: ['HTTP/1.1', 'HTTP/2', 'HTTP/3', 'gRPC', 'WebSocket', 'DNS'] },
        { name: 'Security Layer', purpose: 'Encrypts data in transit and authenticates endpoints', components: ['TLS 1.3', 'mTLS', 'Certificate Authority', 'OCSP Stapling'] },
        { name: 'Transport Layer', purpose: 'Manages reliable or unreliable data delivery between hosts', components: ['TCP', 'UDP', 'QUIC', 'Connection Pooling', 'Flow Control'] },
        { name: 'Network Layer', purpose: 'Routes packets between hosts across networks', components: ['IP', 'DNS Resolution', 'BGP Routing', 'Load Balancer VIP'] }
      ]
    },
    {
      id: 'long-polling-websockets-sse',
      title: 'Long Polling, WebSockets & SSE',
      icon: 'radio',
      color: '#ec4899',
      questions: 7,
      description: 'Real-time communication patterns: long polling, WebSockets, and Server-Sent Events compared.',
      concepts: ['Short Polling', 'Long Polling', 'WebSockets', 'Server-Sent Events (SSE)', 'Socket.IO', 'Connection Scaling', 'Heartbeat Mechanisms'],
      tips: [
        'Short polling is the simplest but most wasteful approach -- avoid for real-time needs',
        'Long polling is a good fallback when WebSockets are not available',
        'WebSockets are the best choice for bidirectional real-time communication',
        'SSE is simpler than WebSockets and sufficient for server-to-client streaming',
        'SSE works over standard HTTP -- no special proxy configuration needed',
        'Consider the scale of concurrent connections when choosing a protocol'
      ],

      introduction: `Traditional HTTP follows a strict request-response pattern: the client asks, the server answers. But many modern applications need the server to push data to the client in real time -- chat messages, live notifications, stock price updates, collaborative editing. Three main techniques solve this problem: **long polling**, **WebSockets**, and **Server-Sent Events (SSE)**.

**Long polling** is an evolution of regular polling where the server holds the request open until new data is available, then responds. It works everywhere HTTP works but has overhead from repeated connection establishment. **WebSockets** upgrade an HTTP connection to a persistent, full-duplex TCP connection where both sides can send messages at any time -- the gold standard for real-time bidirectional communication. **Server-Sent Events (SSE)** provide a simpler, unidirectional (server-to-client) streaming channel over standard HTTP, ideal for notifications and live feeds.

In system design interviews, choosing the right real-time communication mechanism is a common discussion point. The decision depends on whether communication is **unidirectional** or **bidirectional**, the **number of concurrent connections**, **browser/proxy compatibility requirements**, and whether you need guaranteed delivery. Chat systems, live dashboards, notification systems, and collaborative editors each have different optimal solutions.`,

      functionalRequirements: [
        'Push data from server to client in real time',
        'Support bidirectional communication when needed (WebSocket)',
        'Handle thousands to millions of concurrent connections',
        'Detect and recover from disconnections automatically',
        'Support message ordering and delivery guarantees',
        'Work across proxies, firewalls, and CDNs'
      ],

      nonFunctionalRequirements: [
        'Latency: < 100ms from event to client notification',
        'Connections: Support 100K+ concurrent per server',
        'Reconnection: Automatic within 1-5 seconds',
        'Resource usage: Minimal per-connection memory footprint',
        'Compatibility: Work through corporate firewalls and proxies',
        'Scalability: Horizontal scaling across server instances'
      ],

      dataModel: {
        description: 'Comparison of real-time communication patterns',
        schema: `Short Polling:
  Client: GET /updates (every 5 seconds)
  Server: 200 [] (empty, no new data)
  Client: GET /updates (5 seconds later)
  Server: 200 [] (empty again)
  Client: GET /updates
  Server: 200 [{msg: "hello"}] (finally data!)
  Waste: Most responses are empty

Long Polling:
  Client: GET /updates
  Server: ... (holds connection open, waits)
  Server: 200 [{msg: "hello"}] (responds when data available)
  Client: GET /updates (immediately reconnects)
  Server: ... (holds connection again)
  Less waste, but connection churn

WebSocket:
  Client: GET /ws (Upgrade: websocket)
  Server: 101 Switching Protocols
  ── persistent bidirectional connection ──
  Client -> Server: {type: "message", text: "hello"}
  Server -> Client: {type: "message", text: "world"}
  Server -> Client: {type: "notification", data: {...}}
  Full duplex, no reconnection needed

Server-Sent Events (SSE):
  Client: GET /events (Accept: text/event-stream)
  Server: 200 (Content-Type: text/event-stream)
  Server: data: {"msg": "hello"}\\n\\n
  Server: data: {"msg": "update"}\\n\\n
  Server: data: {"msg": "another"}\\n\\n
  Unidirectional (server to client only)
  Auto-reconnect built into browser API`
      },

      apiDesign: {
        description: 'Implementation patterns for each approach',
        endpoints: [
          { method: 'GET', path: '/api/poll?since=timestamp', params: 'last seen timestamp', response: 'New events since timestamp (short polling)' },
          { method: 'GET', path: '/api/long-poll?timeout=30', params: 'timeout seconds', response: 'Held open until data or timeout' },
          { method: 'WS', path: 'ws://host/socket', params: 'HTTP Upgrade header', response: 'Persistent bidirectional connection' },
          { method: 'GET', path: '/api/events', params: 'Accept: text/event-stream', response: 'SSE stream (text/event-stream)' },
          { method: 'PING', path: 'WebSocket ping frame', params: '-', response: 'Pong (heartbeat for connection liveness)' }
        ]
      },

      keyQuestions: [
        {
          question: 'Compare long polling, WebSockets, and SSE -- when do you use each?',
          answer: `**Long Polling**:
  How: Client sends request, server holds it until data is ready

  Client ──GET──> Server (holds 30 seconds)
  Server ──200──> Client (data ready or timeout)
  Client ──GET──> Server (immediately reconnect)

  Pros: Works everywhere HTTP works, simple server implementation
  Cons: Connection overhead, higher latency than WebSocket, one direction
  Use when: Need broad compatibility, moderate real-time needs

**WebSockets**:
  How: HTTP upgrade to persistent TCP connection, full duplex

  Client ──Upgrade──> Server
  Server ──101 Switch──> Client
  Client <────────────> Server (bidirectional forever)

  Pros: Lowest latency, bidirectional, efficient (no HTTP overhead per message)
  Cons: Stateful (harder to scale), proxy/firewall issues, more complex
  Use when: Chat, gaming, collaborative editing, any bidirectional need

**Server-Sent Events (SSE)**:
  How: Server streams events over a persistent HTTP connection

  Client ──GET──> Server
  Server: data: event1
  Server: data: event2
  Server: data: event3 ...

  Pros: Simple, auto-reconnect, works with HTTP/2, event ID tracking
  Cons: Unidirectional only, text-based (no binary), limited browser connections
  Use when: Notifications, live feeds, dashboards, any server-to-client streaming

**Decision matrix**:
| Feature           | Long Polling | WebSocket  | SSE        |
|-------------------|-------------|------------|------------|
| Direction         | Server->Client | Bidirectional | Server->Client |
| Latency           | Medium      | Lowest     | Low        |
| Complexity        | Low         | High       | Low        |
| Proxy support     | Best        | Moderate   | Good       |
| Auto-reconnect    | Manual      | Manual     | Built-in   |
| Binary data       | Yes         | Yes        | No         |
| HTTP/2 compatible | Yes         | Separate   | Yes        |
| Scaling           | Moderate    | Hard       | Moderate   |`
        },
        {
          question: 'How do WebSockets work under the hood?',
          answer: `**WebSocket handshake** (HTTP Upgrade):

  Client sends:
  GET /chat HTTP/1.1
  Host: example.com
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
  Sec-WebSocket-Version: 13

  Server responds:
  HTTP/1.1 101 Switching Protocols
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

  After 101, the connection is now a WebSocket.
  No more HTTP -- raw frames on the TCP connection.

**Frame format** (binary):
  ┌─────────┬────────┬─────────────────┬─────────┐
  │ FIN+OP  │ Length │ Masking Key     │ Payload │
  │ 1 byte  │ 1-9 B  │ 4 bytes (client)│ N bytes │
  └─────────┴────────┴─────────────────┴─────────┘

  Opcodes: text (0x1), binary (0x2), close (0x8), ping (0x9), pong (0xA)

**Connection lifecycle**:
  1. HTTP upgrade handshake
  2. Connected state (bidirectional messages)
  3. Ping/pong heartbeats (keep-alive)
  4. Close handshake (graceful shutdown)

**Scaling challenges**:
  Problem: Each WebSocket = persistent TCP connection
  100K users = 100K connections per server

  Solutions:
  - Epoll/kqueue for efficient connection handling
  - Pub/sub backend (Redis) for cross-server messaging
  - Connection-aware load balancing (sticky sessions)
  - WebSocket server handles connections, separate app server handles logic

**Scaling architecture**:
  Clients -> Load Balancer (sticky) -> WS Servers
                                         |
                                    Redis Pub/Sub
                                         |
                                    WS Servers (other instances)

  When user A (on Server 1) messages user B (on Server 2):
  Server 1 publishes to Redis channel
  Server 2 receives and forwards to user B`
        },
        {
          question: 'How do Server-Sent Events (SSE) work and what makes them simpler than WebSockets?',
          answer: `**SSE** is a standard HTTP response that stays open, with the server sending events as they occur.

**Client-side (browser API)**:
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    console.log(event.data);
  };

  eventSource.addEventListener('notification', (event) => {
    console.log('Notification:', JSON.parse(event.data));
  });

**Server-side response**:
  HTTP/1.1 200 OK
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive

  event: notification
  data: {"type": "message", "text": "hello"}
  id: 1

  event: notification
  data: {"type": "update", "count": 42}
  id: 2

  : this is a comment (heartbeat)

**Why SSE is simpler than WebSockets**:

  1. Standard HTTP: No upgrade, no special protocol
     -> Works through ALL proxies and firewalls
     -> Works with HTTP/2 multiplexing
     -> CDN-compatible

  2. Auto-reconnect: Browser reconnects automatically
     -> Sends Last-Event-ID header on reconnect
     -> Server can replay missed events
     -> No manual reconnection logic needed

  3. Event IDs: Built-in tracking of last received event
     -> Server knows where to resume
     -> No message loss on reconnection

  4. Named events: Event types built into the protocol
     -> event: notification, event: update, etc.
     -> Clean event dispatch without parsing

**Limitations**:
  - Unidirectional (server to client only)
  - Text-only (no binary data)
  - Browser limit: 6 connections per domain (HTTP/1.1)
    -> HTTP/2 removes this limit (multiplexed)
  - No native support in some environments (need polyfill)

**SSE vs WebSocket for common use cases**:
  Live notifications: SSE (server pushes, client listens)
  Chat application: WebSocket (both sides send messages)
  Live dashboard: SSE (server streams metrics)
  Online game: WebSocket (real-time bidirectional)
  Stock ticker: SSE (server streams prices)`
        },
        {
          question: 'How do you scale real-time connections to millions of users?',
          answer: `**Challenge**: Each connection is a persistent, stateful resource. 1M users = 1M open connections.

**Per-server capacity**:
  Typical WebSocket server: 50K-100K connections
  With optimization (epoll, minimal state): 500K-1M connections
  Memory per connection: ~10KB = 1M connections = ~10GB

**Horizontal scaling architecture**:

  Clients -> DNS/LB -> WS Server 1 (100K connections)
                    -> WS Server 2 (100K connections)
                    -> WS Server 3 (100K connections)
                    ...
                    -> WS Server 10 (100K connections)
                           |
                      Redis Pub/Sub (or Kafka)
                           |
                    Message routing between servers

**Key components**:

1. **Sticky load balancing**:
   - WebSocket connections must stay on the same server
   - Use IP hash or cookie-based routing
   - Health checks to detect failed servers

2. **Message bus for cross-server delivery**:
   - Redis Pub/Sub: Simple, good for moderate scale
   - Kafka: Higher throughput, persistent messages
   - NATS: Low latency, lightweight

   User A (Server 1) sends to User B (Server 3):
   Server 1 -> Redis channel "user:B" -> Server 3 -> User B

3. **Presence tracking**:
   - Which server holds which user's connection?
   - Redis hash: user_id -> server_id
   - Enables targeted message routing

4. **Connection management**:
   - Heartbeat (ping/pong) every 30 seconds
   - Detect and clean up dead connections
   - Graceful reconnection with message replay

5. **Backpressure handling**:
   - Client falling behind? Queue messages (limit)
   - Too many queued? Disconnect slow client
   - Monitor queue depths per connection

**Real-world examples**:
  Slack: Uses WebSockets, ~10M concurrent connections
  Discord: Custom protocol over WebSocket, millions of users
  WhatsApp: 2M connections per server (Erlang)
  Twitch: SSE for chat in some implementations`
        },
        {
          question: 'How do you handle reconnection and message delivery guarantees?',
          answer: `**The problem**: Network interruptions are common. When a client reconnects, it may have missed messages.

**Reconnection strategies**:

1. **Exponential backoff**:
   Reconnect after: 1s, 2s, 4s, 8s, 16s (cap at 30s)
   Add jitter: 1s + random(0-1s) to avoid thundering herd

   delay = min(base * 2^attempt + random, max_delay)

2. **SSE automatic reconnect**:
   Browser EventSource reconnects automatically
   Sends Last-Event-ID header
   Server replays events from that ID

3. **WebSocket manual reconnect**:
   Must implement yourself (or use Socket.IO)
   Track last received message sequence number
   Request replay on reconnect

**Message delivery guarantees**:

**At-most-once** (fire and forget):
  Send message, if lost, too bad
  Simplest, lowest latency
  Use for: Live typing indicators, cursor positions

**At-least-once** (with acknowledgment):
  Client ──msg──> Server ──ack──> Client
  If no ack, resend
  May deliver duplicates -> client deduplicates by message ID
  Use for: Chat messages, notifications

**Exactly-once** (hardest):
  At-least-once + deduplication
  Server tracks processed message IDs
  Client retries until acknowledged
  Use for: Financial transactions, order updates

**Message replay on reconnection**:

  Architecture:
  ┌──────────────┐
  │ Message Store │  (Redis sorted set or Kafka topic)
  │ msg_1 (t=100)│
  │ msg_2 (t=101)│
  │ msg_3 (t=102)│  <- client disconnected here
  │ msg_4 (t=103)│  <- missed
  │ msg_5 (t=104)│  <- missed
  └──────────────┘

  Client reconnects: "Last seen: msg_3"
  Server replays: msg_4, msg_5
  Then resumes real-time streaming

**Socket.IO handles much of this automatically**:
  - Automatic reconnection with backoff
  - Packet buffering during disconnection
  - Acknowledgment callbacks
  - Fallback from WebSocket to long polling
  - Room-based pub/sub`
        }
      ],

      basicImplementation: {
        title: 'Simple Long Polling',
        description: 'Server holds HTTP requests open for up to 30 seconds, returning immediately when data is available.',
        svgTemplate: 'restApi',
        problems: [
          'Connection overhead from repeated HTTP requests',
          'Higher latency than persistent connections',
          'Server must manage many held connections',
          'No bidirectional communication'
        ]
      },

      advancedImplementation: {
        title: 'Scaled WebSocket Architecture',
        description: 'WebSocket servers behind sticky load balancer, Redis Pub/Sub for cross-server messaging, with SSE fallback and message replay.',
        svgTemplate: 'distributedQueue',
        keyPoints: [
          'WebSocket servers handle 100K+ connections each',
          'Redis Pub/Sub routes messages between server instances',
          'Presence service tracks user-to-server mapping',
          'Message store enables replay on reconnection',
          'SSE fallback for environments blocking WebSocket upgrade'
        ]
      },

      discussionPoints: [
        {
          topic: 'Protocol Selection by Use Case',
          points: [
            'Chat/messaging: WebSocket (bidirectional, low latency)',
            'Notifications: SSE (simple, server-to-client)',
            'Live dashboard: SSE (server pushes metrics)',
            'Collaborative editing: WebSocket (bidirectional, real-time)',
            'Broad compatibility needed: Long polling (works everywhere)'
          ]
        },
        {
          topic: 'Scaling Considerations',
          points: [
            'WebSocket connections are stateful -- requires sticky sessions',
            'Message bus (Redis/Kafka) for cross-server communication',
            'Monitor connection count and memory per server',
            'Graceful shutdown: drain connections before removing servers',
            'Connection limits per user to prevent resource exhaustion'
          ]
        },
        {
          topic: 'Common Interview Patterns',
          points: [
            'Design a chat system: WebSocket + message store + presence',
            'Design a notification system: SSE or WebSocket + Kafka',
            'Design a live scoreboard: SSE for broadcasting to many clients',
            'Design collaborative editing: WebSocket + OT/CRDT',
            'Always discuss reconnection and message replay strategy'
          ]
        }
      ],

      comparisonCards: [
        {
          title: 'Polling vs Webhooks',
          items: [
            { name: 'Polling (Pull Model)', description: 'Client repeatedly checks server at fixed intervals for updates. Like constantly asking "Do you have something new?" Higher resource consumption but gives developer control over when to fetch.' },
            { name: 'Webhooks (Push Model)', description: 'Server pushes data to client when events occur. Efficient resource use with real-time updates. Risk: can miss notifications if client endpoint is down.' }
          ]
        },
        {
          title: 'Real-Time Communication Patterns',
          items: [
            { name: 'Short Polling', description: 'Client sends HTTP request every N seconds. Server responds immediately (with or without data). Simple but wastes bandwidth on empty responses. Latency = polling interval.' },
            { name: 'Long Polling', description: 'Client sends request, server holds it open until data is available (or timeout). Reduces empty responses. Used by early chat apps.' },
            { name: 'WebSockets', description: 'Full-duplex persistent connection. Client and server can send data anytime. Low latency, low overhead. Used by: Slack, Discord, trading platforms.' },
            { name: 'Server-Sent Events (SSE)', description: 'Server pushes data to client over HTTP. Unidirectional (server → client only). Simpler than WebSockets. Auto-reconnection. Used by: news feeds, dashboards.' }
          ]
        }
      ],

      staticDiagrams: [
        { id: 'polling-vs-webhooks', title: 'Polling vs Webhooks', description: 'Pull vs Push models: polling checks at intervals, webhooks push on events', src: '/diagrams/long-polling-websockets-sse/polling-vs-webhooks.svg', type: 'architecture' }
      ],

      comparisonTables: [
        {
          id: 'realtime-protocols',
          title: 'Long Polling vs WebSocket vs SSE',
          left: {
            title: 'WebSocket',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Direction', value: 'Full duplex — bidirectional' },
              { label: 'Connection', value: 'Persistent, upgraded from HTTP' },
              { label: 'Overhead', value: 'Low — 2 byte frame header' },
              { label: 'Protocol', value: 'ws:// or wss://' },
              { label: 'Use When', value: 'Chat, gaming, collaborative editing' },
              { label: 'Examples', value: 'Slack, Discord, Google Docs' }
            ]
          },
          right: {
            title: 'Server-Sent Events (SSE)',
            icon: 'arrowDown',
            color: '#3b82f6',
            items: [
              { label: 'Direction', value: 'Server → Client only (one-way)' },
              { label: 'Connection', value: 'Persistent HTTP connection' },
              { label: 'Overhead', value: 'Low — text/event-stream' },
              { label: 'Protocol', value: 'Standard HTTP, auto-reconnect' },
              { label: 'Use When', value: 'Live feeds, notifications, dashboards' },
              { label: 'Examples', value: 'Twitter feed, stock tickers, CI logs' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'realtime-selection',
          title: 'When to Use Each Protocol',
          color: '#10b981',
          icon: 'zap',
          items: [
            { label: 'Chat / messaging', value: 'WebSocket', bar: 95 },
            { label: 'Live notifications', value: 'SSE or WebSocket', bar: 80 },
            { label: 'Real-time dashboard', value: 'SSE', bar: 70 },
            { label: 'Collaborative editing', value: 'WebSocket', bar: 90 },
            { label: 'Simple polling needs', value: 'Long Polling', bar: 40 },
            { label: 'IoT sensor data', value: 'WebSocket or MQTT', bar: 75 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'long-polling', name: 'Long Polling', icon: 'clock', color: '#f59e0b',
          description: 'Client sends request, server holds until data available or timeout.',
          useWhen: 'Simple real-time needs, no WebSocket support',
          example: 'Hold request 30s, return data or timeout → client reconnects'
        },
        {
          id: 'ws-scaling', name: 'WebSocket Scaling', icon: 'layers', color: '#10b981',
          description: 'Use pub/sub (Redis) to broadcast across multiple WS servers.',
          useWhen: 'WebSocket app behind load balancer',
          example: 'Redis Pub/Sub or Kafka for cross-server message broadcasting'
        }
      ],
      edgeCases: [
        { scenario: 'WebSocket connection dropped by intermediate proxy', impact: 'Clients silently lose real-time updates without knowing the connection is dead, leading to stale UI', mitigation: 'Implement application-level heartbeat/ping-pong, detect missed pongs within 30 seconds, auto-reconnect with exponential backoff' },
        { scenario: 'Thundering herd on SSE reconnect after server restart', impact: 'All clients reconnect simultaneously, overwhelming the server with connection establishment requests', mitigation: 'Add jittered reconnect delay on the client, use Last-Event-ID header for resumption, implement connection rate limiting' },
        { scenario: 'Long polling timeout mismatch with load balancer', impact: 'Load balancer terminates the held connection before the server responds, causing repeated empty responses', mitigation: 'Set server hold time shorter than LB timeout (e.g., server 25s, LB 30s), configure LB idle timeout appropriately' },
        { scenario: 'WebSocket memory leak from abandoned connections', impact: 'Server memory grows unbounded as disconnected clients leave orphaned connection state', mitigation: 'Implement server-side idle timeout, track last message timestamp per connection, periodically sweep and close stale connections' },
        { scenario: 'Message ordering lost during WebSocket server failover', impact: 'Client receives messages out of order after reconnecting to a different server, corrupting application state', mitigation: 'Include sequence numbers in messages, use Redis Streams or Kafka for ordered message replay on reconnection' }
      ],
      tradeoffs: [
        { decision: 'WebSocket vs Server-Sent Events (SSE)', pros: 'WebSocket enables full-duplex bidirectional communication; SSE is simpler, works over HTTP, and has built-in reconnection', cons: 'WebSocket requires upgrade handling and special proxy config; SSE is server-to-client only and limited to text data', recommendation: 'Use SSE for notifications, live feeds, and dashboards; WebSocket for chat, gaming, and collaborative editing requiring bidirectional flow' },
        { decision: 'Long polling vs WebSocket', pros: 'Long polling works everywhere HTTP works with no special infrastructure; WebSocket has lower latency and overhead for high-frequency updates', cons: 'Long polling has connection churn overhead and higher latency; WebSocket requires sticky sessions or pub/sub for scaling', recommendation: 'Use WebSocket as primary, long polling as fallback for environments that block WebSocket upgrades' },
        { decision: 'Single server vs Pub/Sub fanout for WebSocket scaling', pros: 'Single server is simpler with guaranteed ordering; Pub/Sub enables horizontal scaling across many servers', cons: 'Single server limits connection count to one machine; Pub/Sub adds latency and complexity from the message broker', recommendation: 'Start with single server, add Redis Pub/Sub or Kafka fanout when exceeding 50K concurrent connections per server' },
        { decision: 'Client-side polling vs Server push', pros: 'Polling is stateless and simple to implement; Server push provides real-time updates with minimal latency', cons: 'Polling wastes bandwidth on empty responses and has inherent delay; Push requires connection management and scaling infrastructure', recommendation: 'Use server push (SSE or WebSocket) for any real-time requirement; polling only for batch or infrequent update scenarios' }
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Manages connection lifecycle and message handling in the browser or app', components: ['EventSource API (SSE)', 'WebSocket API', 'Reconnection Logic', 'Message Buffer', 'Heartbeat Timer'] },
        { name: 'Protocol Layer', purpose: 'Handles protocol-specific framing and connection upgrades', components: ['HTTP Upgrade Handshake', 'WebSocket Frames', 'SSE Event Stream Parser', 'Ping/Pong Frames'] },
        { name: 'Routing Layer', purpose: 'Distributes connections across servers and routes messages', components: ['Sticky Session LB', 'Connection Registry', 'Pub/Sub Broker (Redis)', 'Room/Channel Manager'] },
        { name: 'Application Layer', purpose: 'Business logic for message processing and event generation', components: ['Event Producer', 'Subscription Manager', 'Authorization Middleware', 'Rate Limiter'] }
      ]
    },
    {
      id: 'cap-pacelc-deep-dive',
      title: 'CAP & PACELC Deep Dive',
      icon: 'gitBranch',
      color: '#3b82f6',
      questions: 8,
      description: 'CAP theorem with real examples, PACELC extension, and a practical decision framework.',
      concepts: ['CAP Theorem', 'Consistency', 'Availability', 'Partition Tolerance', 'PACELC Extension', 'Linearizability', 'Eventual Consistency', 'Tunable Consistency'],
      tips: [
        'Network partitions WILL happen -- the real choice is between consistency and availability during partitions',
        'CAP is often misunderstood: you cannot simply "choose 2 of 3" -- P is not optional',
        'PACELC extends CAP to address the latency-consistency trade-off during normal operation',
        'Most real systems are not purely CP or AP -- they make different trade-offs for different operations',
        'Eventual consistency does not mean "inconsistent" -- it means "consistent after a bounded delay"',
        'Always discuss specific consistency models (linearizable, causal, eventual) rather than just "consistent"'
      ],

      introduction: `The **CAP theorem**, formulated by Eric Brewer in 2000 and proven by Gilbert and Lynch in 2002, states that a distributed data store can provide at most two of three guarantees: **Consistency** (every read receives the most recent write), **Availability** (every request receives a response), and **Partition tolerance** (the system continues operating despite network partitions between nodes). Since network partitions are inevitable in distributed systems, the practical choice is between consistency and availability during a partition.

However, CAP is often oversimplified. Real systems do not simply "choose CP or AP." Most systems make nuanced, operation-specific trade-offs. A banking system might be CP for balance transfers but AP for viewing transaction history. The **PACELC theorem** extends CAP by addressing what happens during normal operation (no partition): even without partitions, there is a trade-off between **latency** and **consistency**. A system might choose consistency during partitions (C) but prioritize latency during normal operation (L), making it a **PC/EL** system.

In system design interviews, correctly applying CAP and PACELC demonstrates deep understanding of distributed systems trade-offs. Rather than simply labeling a system as "CP" or "AP," strong candidates discuss specific consistency models (linearizability, causal consistency, eventual consistency), explain why they chose a particular trade-off for each operation, and reference real systems (Cassandra as PA/EL, Spanner as PC/EC) to support their reasoning.`,

      functionalRequirements: [
        'Define consistency requirements for each data type and operation',
        'Handle network partitions without total system failure',
        'Provide appropriate consistency guarantees per use case',
        'Support conflict resolution for eventually consistent data',
        'Enable tunable consistency levels per query',
        'Detect and recover from partition events'
      ],

      nonFunctionalRequirements: [
        'Partition detection: < 10 seconds',
        'Consistency (CP mode): Linearizable reads and writes',
        'Availability (AP mode): Respond within SLA even during partitions',
        'Latency trade-off: Configurable per operation (PACELC)',
        'Recovery: Automatic reconciliation after partition heals',
        'Monitoring: Real-time visibility into consistency state'
      ],

      dataModel: {
        description: 'CAP theorem and PACELC framework',
        schema: `CAP Theorem:

  Pick 2 of 3 (but P is mandatory in distributed systems):

       Consistency
          /\\
         /  \\
        /    \\
       / CP   \\
      /________\\
     Partition   Availability
     Tolerance
        AP

  CP: Refuse requests during partition (to stay consistent)
  AP: Serve requests during partition (may return stale data)
  CA: Only possible if no network partition (single machine)

PACELC Extension:

  If (Partition):
    Choose C or A        (same as CAP)
  Else (Normal operation):
    Choose L or C        (latency vs consistency)

  System classifications:
  PA/EL: Cassandra, DynamoDB (available + low latency)
  PC/EC: HBase, BigTable (consistent always)
  PA/EC: MongoDB (available during partition, consistent normally)
  PC/EL: Spanner (consistent during partition, low latency normally via TrueTime)

Consistency Spectrum:
  Strongest ──────────────────────────────> Weakest
  Linearizable > Sequential > Causal > Eventual
  (most expensive)                    (cheapest)`
      },

      apiDesign: {
        description: 'Consistency level configuration patterns',
        endpoints: [
          { method: 'WRITE', path: 'db.write(key, value, consistency=QUORUM)', params: 'key, value, consistency level', response: 'ACK after quorum of replicas confirm' },
          { method: 'READ', path: 'db.read(key, consistency=ONE)', params: 'key, consistency level', response: 'Fastest replica responds (may be stale)' },
          { method: 'READ', path: 'db.read(key, consistency=ALL)', params: 'key, ALL', response: 'All replicas agree (strongly consistent, slowest)' },
          { method: 'CONFIG', path: 'SET consistency_level = LOCAL_QUORUM', params: 'level', response: 'Default consistency for this session' },
          { method: 'STATUS', path: 'cluster.partitionStatus()', params: '-', response: '{ partitioned: bool, affected_nodes: [...] }' }
        ]
      },

      keyQuestions: [
        {
          question: 'Explain the CAP theorem precisely -- what does each letter really mean?',
          answer: `**Consistency (C)** -- Linearizability:
  Every read returns the most recent write or an error.
  All nodes see the same data at the same time.
  NOT the same as ACID consistency (which is about constraints).

  Example: After writing balance=100, ALL subsequent reads
  return 100 (not 50, not "old value").

**Availability (A)**:
  Every request to a non-failing node receives a response
  (not necessarily the most recent data).
  No timeout, no error -- a real response.

  Example: Even during a network partition, every server that
  receives a request returns some answer.

**Partition Tolerance (P)**:
  The system continues to operate despite messages being
  dropped or delayed between nodes.

  Example: If the network between US-East and EU-West breaks,
  BOTH regions continue operating (in some way).

**Why "choose 2" is misleading**:

  You CANNOT choose CA in a distributed system.
  Network partitions WILL happen.
  Choosing CA = assuming partitions never occur = single machine.

  The REAL choice during a partition:
  - CP: Stop serving (return errors) to maintain consistency
  - AP: Continue serving (return possibly stale data) to stay available

**Key nuance**: Most systems are not purely CP or AP.
  Different operations can have different trade-offs:

  Banking app:
  - Transfer money: CP (consistency critical)
  - View transaction history: AP (stale by a few seconds is OK)
  - Check balance: CP (must be accurate for withdrawals)
  - View spending analytics: AP (slight delay acceptable)`
        },
        {
          question: 'What is PACELC and how does it extend CAP?',
          answer: `**PACELC** (proposed by Daniel Abadi, 2012):

  CAP only discusses what happens DURING a partition.
  But what about normal operation (no partition)?

  PACELC says:
  If Partition (P):
    Choose Availability (A) or Consistency (C)
  Else (E):
    Choose Latency (L) or Consistency (C)

**Why this matters**:
  Even without partitions, replicating data across nodes takes time.
  Strong consistency requires waiting for replicas -> higher latency.
  Eventual consistency responds immediately -> lower latency.

**System classifications**:

  PA/EL (High availability, low latency):
  - Cassandra (default): Available during partition, fast during normal
  - DynamoDB: Same philosophy
  - Trade-off: May read stale data
  - Use for: Social feeds, recommendations, analytics

  PC/EC (Always consistent):
  - HBase: Consistent during partition (blocks), consistent normally
  - BigTable: Same
  - Trade-off: Higher latency, reduced availability
  - Use for: Financial systems, inventory management

  PA/EC (Available during partition, consistent normally):
  - MongoDB (default): Available in partition, consistent in normal mode
  - Trade-off: Best of both worlds but complex failover
  - Use for: Content management, e-commerce catalogs

  PC/EL (Consistent in partition, low latency normally):
  - Google Spanner: Uses TrueTime (atomic clocks) for global consistency
    with near-local latency during normal operation
  - Trade-off: Requires specialized hardware (atomic clocks)
  - Use for: Global financial systems, Google's ad platform

**Interview tip**: PACELC gives you a richer vocabulary than CAP alone. Instead of "this is a CP system," say "this is PC/EC -- it prioritizes consistency in all scenarios, trading off latency during normal operation."`,
        },
        {
          question: 'What are the different consistency models and when do you use each?',
          answer: `**Linearizability** (Strongest):
  Every operation appears to take effect at a single instant in time.
  Once a write is acknowledged, ALL subsequent reads return that value.

  Timeline:
  Write(x=1) ────ACK───
                        Read(x) -> 1 (MUST return 1)
                        Read(x) -> 1 (always 1 after this)

  Cost: Highest latency (must coordinate with all replicas)
  Used by: ZooKeeper, etcd, single-leader databases
  Use for: Locks, leader election, financial transactions

**Sequential Consistency**:
  Operations appear in SOME total order consistent with each program's order.
  Different from linearizability: real-time order not preserved across clients.

  Cost: Lower than linearizable
  Use for: Most applications that need "strong" consistency

**Causal Consistency**:
  Operations that are causally related are seen in the same order by all.
  Concurrent (unrelated) operations may be seen in different orders.

  Example: Alice posts "I got promoted!" (event A)
           Bob comments "Congrats!" (event B, caused by A)
           Everyone sees A before B (causal order)
           But Carol's independent post may appear in any order

  Cost: Moderate (track causal dependencies)
  Used by: MongoDB (causal sessions)
  Use for: Social media, collaborative apps

**Eventual Consistency** (Weakest):
  If no new writes occur, all replicas will EVENTUALLY converge.
  No guarantee on when convergence happens.

  Cost: Lowest latency, highest availability
  Used by: Cassandra (ONE), DynamoDB (eventually consistent reads), DNS
  Use for: Caching, analytics, non-critical data

**Read-Your-Writes Consistency**:
  A user always sees their own writes.
  Other users may see older data.

  Implementation: Route reads to the replica that received the write,
  or track write timestamp and wait for replicas to catch up.

  Use for: User profile updates, form submissions

**Decision guide**:
  Financial/inventory: Linearizable
  User-facing writes: Read-your-writes (minimum)
  Social/collaborative: Causal
  Analytics/caching: Eventual`
        },
        {
          question: 'Give real-world examples of CP and AP system designs',
          answer: `**CP Systems** (Sacrifice availability during partition):

**ZooKeeper / etcd**:
  Purpose: Distributed coordination (leader election, config)
  During partition: Minority partition STOPS serving
  Why CP: Incorrect coordination data = catastrophic failures
  PACELC: PC/EC (consistent always)

**HBase / BigTable**:
  Purpose: Strongly consistent wide-column store
  During partition: Unavailable for affected regions
  Why CP: Data integrity over availability
  PACELC: PC/EC

**PostgreSQL (single leader)**:
  Purpose: Relational database
  During partition: Followers cannot serve writes
  Why CP: ACID transactions require consistency

**AP Systems** (Sacrifice consistency during partition):

**Cassandra**:
  Purpose: Wide-column store for massive write throughput
  During partition: All nodes continue serving
  Conflict resolution: Last-writer-wins (LWW) by timestamp
  Why AP: Availability is more important than perfect consistency
  PACELC: PA/EL (available and fast)

  Tunable: Can be made CP with consistency level ALL

**DynamoDB**:
  Purpose: Managed key-value/document store
  During partition: Continues serving from available replicas
  Conflict resolution: Version vectors + application merge
  Why AP: Designed for always-on e-commerce (Amazon shopping cart)
  PACELC: PA/EL

**DNS**:
  Purpose: Name resolution
  During partition: Serves cached (potentially stale) records
  Why AP: DNS unavailability = internet broken
  Consistency: Eventually consistent (TTL-based)

**Nuanced examples**:

**MongoDB**: PA/EC by default
  Normal: Single leader, strong consistency
  Partition: Replica set can elect new leader (brief unavailability)
  Secondary reads: Eventually consistent
  Can be tuned with write concern and read preference

**Google Spanner**: PC/EL
  Uses atomic clocks (TrueTime) for global consistency
  Commits: Globally consistent (wait for clock uncertainty)
  Reads: Low latency with bounded staleness
  The only system that achieves both C and low L (with $$$ hardware)`
        },
        {
          question: 'How do you apply CAP/PACELC when designing a system in an interview?',
          answer: `**Step-by-step decision framework**:

**Step 1: Classify each data type by consistency need**

  E-commerce example:
  - Product catalog: Eventual consistency OK (AP)
    Stale price for a few seconds is acceptable
  - Inventory count: Strong consistency required (CP)
    Overselling is not acceptable
  - User cart: Session consistency (AP with read-your-writes)
    User must see their own changes
  - Order placement: Linearizable (CP)
    Double-charging is catastrophic
  - Recommendation engine: Eventual (AP)
    Slightly stale recommendations are fine

**Step 2: Choose database/storage per classification**

  Product catalog: DynamoDB or Cassandra (PA/EL)
  Inventory: PostgreSQL with synchronous replication (PC/EC)
  User cart: Redis or DynamoDB (PA/EL)
  Order placement: PostgreSQL or Spanner (PC/EC)
  Recommendations: Cassandra or Redis (PA/EL)

**Step 3: Design for partition handling**

  Scenario: Network partition between US-East and EU-West

  Product service (AP): Continue serving from both regions
    -> Users may see slightly different prices temporarily
    -> Acceptable: merge on recovery

  Order service (CP): Route all orders to primary region
    -> EU users experience higher latency during partition
    -> Acceptable: no double-orders

  Inventory service (CP): Only accept writes in one region
    -> Other region can read (possibly stale) but not decrement
    -> Prevents overselling

**Step 4: Articulate trade-offs to interviewer**

  "For product catalog, I chose an AP system because
  showing a slightly stale price for a few seconds is
  acceptable, and availability is critical for user experience.

  For inventory and orders, I chose CP because overselling
  or double-charging would damage trust and revenue.
  During a partition, order placement routes to the primary
  region, accepting higher latency for EU users rather than
  risking inconsistency."

**Key phrases for interviews**:
  - "The trade-off here is between X and Y..."
  - "For this specific operation, consistency matters more because..."
  - "We can tolerate eventual consistency here because..."
  - "Using PACELC, this is a PA/EL system for reads and PC/EC for writes"`
        },
        {
          question: 'What are CRDTs and how do they relate to eventual consistency?',
          answer: `**CRDTs (Conflict-free Replicated Data Types)**: Data structures that can be replicated across multiple nodes and updated independently, with a mathematical guarantee that all replicas converge to the same state without coordination.

**The problem CRDTs solve**:
  In AP systems, concurrent writes to different replicas create conflicts.
  Traditional resolution: Last-Writer-Wins (LWW) -- simple but loses data.
  CRDTs: Merge concurrent updates WITHOUT losing any data.

**Common CRDT types**:

**G-Counter (Grow-only Counter)**:
  Each node tracks its own count
  Global count = sum of all nodes

  Node A: {A: 5, B: 0, C: 0}  = 5
  Node B: {A: 0, B: 3, C: 0}  = 3
  Node C: {A: 0, B: 0, C: 7}  = 7
  Merge:  {A: 5, B: 3, C: 7}  = 15 (correct!)

**PN-Counter (Positive-Negative Counter)**:
  Two G-Counters: one for increments, one for decrements
  Value = sum(increments) - sum(decrements)

**G-Set (Grow-only Set)**:
  Elements can only be added, never removed
  Merge = union of all sets

**OR-Set (Observed-Remove Set)**:
  Supports add AND remove
  Each add tagged with unique ID
  Remove removes specific tagged adds

  Node A: add("item", tag=1)
  Node B: remove("item", tag=1), add("item", tag=2)
  Merge: "item" present (tag=2 survives)

**LWW-Register (Last-Writer-Wins Register)**:
  Simple value with timestamp
  Highest timestamp wins

**Real-world CRDT usage**:
- Redis (CRDTs in active-active geo-replication)
- Riak (built-in CRDT support)
- Apple Notes (collaborative editing uses CRDTs)
- Figma (real-time collaborative design)

**Trade-offs**:
- Pro: No coordination needed, always available, always convergent
- Con: Limited data types, can grow unbounded (tombstones), complex to implement
- Best for: Counters, sets, collaborative text, shopping carts`
        }
      ],

      basicImplementation: {
        title: 'Single-Leader CP System',
        description: 'Single-leader database with synchronous replication, prioritizing consistency over availability.',
        svgTemplate: 'singleDatabase',
        problems: [
          'Unavailable during leader failure until election completes',
          'Write latency includes replication delay',
          'Single region only (or high cross-region latency)',
          'No flexibility per operation'
        ]
      },

      advancedImplementation: {
        title: 'Tunable Consistency Architecture',
        description: 'Different consistency levels per operation, with CP databases for critical writes and AP databases for high-traffic reads.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Critical operations (payments, inventory) use CP storage',
          'Read-heavy operations (catalog, recommendations) use AP storage',
          'Tunable consistency per query (Cassandra-style QUORUM/ONE/ALL)',
          'Polyglot persistence: right database for each consistency need',
          'Monitoring for replication lag and partition detection'
        ]
      },

      discussionPoints: [
        {
          topic: 'Common Misconceptions',
          points: [
            'CAP does not mean "choose 2 of 3" -- P is mandatory in distributed systems',
            'Consistency in CAP is linearizability, NOT ACID consistency',
            'CA systems are effectively single-node (not distributed)',
            'Most real systems are not purely CP or AP -- they are nuanced',
            'Eventual consistency has a specific meaning: convergence without new writes'
          ]
        },
        {
          topic: 'Practical Decision Making',
          points: [
            'Classify each data type by its consistency requirements independently',
            'Use polyglot persistence: different stores for different needs',
            'Default to eventual consistency unless you have a specific reason for strong',
            'Read-your-writes is the minimum for good user experience',
            'Consider PACELC: latency matters even without partitions'
          ]
        },
        {
          topic: 'System Examples by Classification',
          points: [
            'PA/EL: Cassandra, DynamoDB (available and fast)',
            'PC/EC: HBase, ZooKeeper, etcd (consistent always)',
            'PA/EC: MongoDB (available in partition, consistent normally)',
            'PC/EL: Google Spanner (consistent in partition, fast with TrueTime)',
            'Tunable: Cassandra with adjustable consistency levels'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'cap-choices',
          title: 'CP vs AP Database Systems',
          left: {
            title: 'CP Systems',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Priority', value: 'Consistency over availability' },
              { label: 'During Partition', value: 'Reject requests to stay consistent' },
              { label: 'Use When', value: 'Financial systems, inventory, voting' },
              { label: 'Trade-off', value: 'System may become unavailable' },
              { label: 'Examples', value: 'HBase, MongoDB, Redis Cluster, Zookeeper' },
              { label: 'PACELC', value: 'PC/EC — consistency always' }
            ]
          },
          right: {
            title: 'AP Systems',
            icon: 'globe',
            color: '#10b981',
            items: [
              { label: 'Priority', value: 'Availability over consistency' },
              { label: 'During Partition', value: 'Serve requests with possibly stale data' },
              { label: 'Use When', value: 'Social feeds, caching, analytics' },
              { label: 'Trade-off', value: 'May return outdated data' },
              { label: 'Examples', value: 'Cassandra, DynamoDB, CouchDB, Riak' },
              { label: 'PACELC', value: 'PA/EL — latency over consistency' }
            ]
          }
        }
      ],
      comparisonCards: [
        {
          title: 'CAP Theorem Critique',
          items: [
            { name: 'The Real Choice', description: 'Network partitions are guaranteed to happen in distributed systems. So the practical choice is between CP (consistency over availability) and AP (availability over consistency).' },
            { name: 'Stop Calling DBs CP or AP', description: 'Martin Kleppmann argues CAP is too narrow for categorizing databases. Real systems make nuanced trade-offs that don\'t fit neatly into CP/AP buckets.' },
            { name: 'PACELC Extension', description: 'When Partitioned: choose Availability or Consistency. Else (normal operation): choose Latency or Consistency. Captures the full trade-off spectrum.' }
          ]
        }
      ],
      visualCards: [
        {
          id: 'pacelc-systems',
          title: 'PACELC Classification of Databases',
          color: '#8b5cf6',
          icon: 'database',
          items: [
            { label: 'DynamoDB (PA/EL)', value: 'Always available, low latency', bar: 90 },
            { label: 'Cassandra (PA/EL)', value: 'Tunable consistency', bar: 85 },
            { label: 'MongoDB (PC/EC)', value: 'Strong consistency default', bar: 70 },
            { label: 'MySQL (PC/EC)', value: 'ACID compliant', bar: 65 },
            { label: 'CockroachDB (PC/EL)', value: 'Consistent + low latency', bar: 75 },
            { label: 'Cosmos DB (PA/EL)', value: '5 consistency levels', bar: 80 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'tunable-consistency', name: 'Tunable Consistency', icon: 'sliders', color: '#8b5cf6',
          description: 'Adjust consistency level per query (ONE, QUORUM, ALL).',
          useWhen: 'Different operations need different consistency levels',
          example: 'Cassandra: writes at QUORUM, reads at ONE for speed'
        },
        {
          id: 'conflict-resolution', name: 'Conflict Resolution', icon: 'gitBranch', color: '#f59e0b',
          description: 'Handle conflicting writes in AP systems: LWW, vector clocks, CRDTs.',
          useWhen: 'Multi-master or leaderless replication',
          example: 'Last-Write-Wins (LWW), or merge via vector clocks'
        }
      ]
    },
    {
      id: 'distributed-file-systems',
      title: 'Distributed File Systems',
      icon: 'hardDrive',
      color: '#3b82f6',
      questions: 10,
      description: 'GFS, HDFS, and architecture patterns for storing massive datasets across clusters.',
      concepts: ['Google File System (GFS)', 'HDFS Architecture', 'Chunk Servers & Data Nodes', 'Master/NameNode Design', 'Replication & Fault Tolerance', 'Write-Once-Read-Many', 'Block Placement Policy', 'Rack Awareness'],
      tips: [
        'Distributed file systems optimize for large sequential reads and appends, not random writes',
        'The master/NameNode is the single point of coordination -- discuss how to protect it',
        'Chunk size (64-128 MB) is a key design parameter that balances metadata overhead vs parallelism',
        'Rack-aware replication places copies across failure domains for durability',
        'GFS influenced HDFS, which powers the entire Hadoop ecosystem',
        'Always discuss the trade-off between consistency and throughput in append-heavy workloads'
      ],

      introduction: `**Distributed file systems** solve the problem of storing datasets that are far too large for any single machine. When you need to store petabytes of log data, video files, or analytical datasets, you need a system that spreads files across hundreds or thousands of commodity servers while presenting a unified namespace to applications.

**Google File System (GFS)**, described in the landmark 2003 paper, pioneered many of the ideas used in modern distributed storage. GFS was designed around Google's specific workload: large files (multi-GB), append-heavy writes, and sequential reads for batch processing. Its open-source descendant, **Hadoop Distributed File System (HDFS)**, became the backbone of the big data revolution and remains widely deployed today.

In system design interviews, distributed file systems appear whenever the problem involves storing or processing massive amounts of unstructured data -- think video platforms, log aggregation pipelines, data lakes, or machine learning training datasets. Understanding the **master-worker architecture**, **chunk-based storage**, and **replication strategies** is essential for answering these questions convincingly.`,

      functionalRequirements: [
        'Store files ranging from megabytes to terabytes across a cluster',
        'Support high-throughput sequential reads and appends',
        'Replicate data across multiple nodes for fault tolerance',
        'Provide a hierarchical namespace (directories and files)',
        'Handle concurrent readers and writers gracefully',
        'Support atomic record append operations'
      ],

      nonFunctionalRequirements: [
        'Throughput: Aggregate read bandwidth > 10 GB/s across cluster',
        'Durability: No data loss even with simultaneous disk/node failures',
        'Availability: 99.9% for reads, tolerate node failures transparently',
        'Scalability: Support 10,000+ nodes and exabytes of storage',
        'Latency: Optimize for throughput over latency (batch workloads)',
        'Cost: Run on commodity hardware, tolerate frequent failures'
      ],

      dataModel: {
        description: 'GFS/HDFS architecture and data layout',
        schema: `GFS / HDFS Architecture:

  Client
    |
    |  1. File metadata request
    v
  ┌──────────────┐
  │  Master /    │   Stores:
  │  NameNode    │   - File -> chunk mapping
  │              │   - Chunk -> server mapping
  └──────┬───────┘   - Namespace tree
         │
         │  2. Returns chunk locations
         v
  Client contacts chunk servers directly
         │
    ┌────┴────┬──────────┐
    v         v          v
┌────────┐ ┌────────┐ ┌────────┐
│ Chunk  │ │ Chunk  │ │ Chunk  │
│Server 1│ │Server 2│ │Server 3│
│(DataNode)│(DataNode)│(DataNode)
└────────┘ └────────┘ └────────┘
  chunk A    chunk A    chunk B
  chunk C    chunk B    chunk C
  (replicas spread across servers)

File Layout:
  file.dat (1 GB) -> split into chunks:
    chunk_0: bytes 0 - 63MB      -> servers {1, 3, 5}
    chunk_1: bytes 64MB - 127MB  -> servers {2, 4, 6}
    ...
    chunk_15: bytes 960MB - 1GB  -> servers {1, 2, 4}

Chunk metadata (at Master/NameNode):
{
  file: "/logs/2024/access.log",
  chunks: [
    { id: "c001", size: 67108864, replicas: ["dn1","dn3","dn5"] },
    { id: "c002", size: 67108864, replicas: ["dn2","dn4","dn6"] }
  ],
  replication_factor: 3
}`
      },

      apiDesign: {
        description: 'Core distributed file system operations',
        endpoints: [
          { method: 'CREATE', path: 'dfs.create(path, replication)', params: 'file path, replication factor', response: 'File handle for writing' },
          { method: 'APPEND', path: 'dfs.append(handle, data)', params: 'file handle, byte buffer', response: 'Bytes written, chunk locations' },
          { method: 'READ', path: 'dfs.read(path, offset, length)', params: 'file path, byte range', response: 'Data bytes from chunk servers' },
          { method: 'LIST', path: 'dfs.listDir(path)', params: 'directory path', response: 'Array of file/dir metadata' },
          { method: 'DELETE', path: 'dfs.delete(path)', params: 'file path', response: 'Marked for garbage collection' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does the GFS/HDFS master (NameNode) work, and how do you prevent it from being a single point of failure?',
          answer: `**Master / NameNode responsibilities**:
- Maintains the entire file system namespace in memory
- Maps files to chunks and chunks to data nodes
- Manages chunk lease grants for writes
- Handles replication, rebalancing, and garbage collection

**Why in-memory?** Fast metadata operations. A file system with 100 million files needs ~20 GB of RAM for metadata -- feasible on modern servers.

**Single point of failure mitigations**:

1. **Operation log + checkpoints**:
   - Every metadata mutation is logged to disk (WAL)
   - Periodic checkpoints snapshot the state
   - On crash, replay log from last checkpoint

2. **Shadow master / Standby NameNode**:
   - HDFS: Standby NameNode replays edit logs in real time
   - On failure, standby promotes to active (< 30 seconds)

3. **HDFS High Availability architecture**:

   ┌──────────┐    shared edit    ┌──────────┐
   │  Active  │───── logs ────>│ Standby  │
   │ NameNode │    (JournalNodes) │ NameNode │
   └────┬─────┘                   └────┬─────┘
        │       heartbeats              │
   ┌────┴──────────────────────────────┴────┐
   │           DataNodes report to both      │
   └─────────────────────────────────────────┘

4. **Zookeeper-based failover controller**:
   - Monitors active NameNode health
   - Triggers automatic failover to standby
   - Fencing ensures only one active at a time`
        },
        {
          question: 'How does a write operation work in GFS/HDFS?',
          answer: `**GFS write pipeline (append)**:

Step 1: Client asks Master for chunk locations
Step 2: Master grants a lease to one replica (the "primary")
Step 3: Client pushes data to ALL replicas (pipelined)
Step 4: Client sends write request to primary
Step 5: Primary assigns serial order and applies write
Step 6: Primary forwards order to secondaries
Step 7: Secondaries apply in same order and ACK
Step 8: Primary responds to client

  Client
    │
    │ data push (pipelined)
    ├──────────────> Replica A (primary)
    │                    │ data forwarded
    │                    ├───> Replica B
    │                    │        │
    │                    │        ├───> Replica C
    │                    │        │
    │ write request      │        │
    ├──────────────> Primary      │
    │                    │ serialize│
    │                    ├───> B   │
    │                    ├───────> C
    │                    │
    │ <── success ──────┘

**Key design decisions**:
- Data flow is decoupled from control flow
- Data is pipelined: each server forwards to next as it receives
- Primary serializes concurrent writes for consistency
- If any replica fails, client retries; Master re-replicates

**HDFS variation**:
- Client writes to first DataNode in pipeline
- Each DataNode forwards to next (chain replication)
- ACK flows back through the chain
- Block is considered written when all replicas ACK`
        },
        {
          question: 'How do you choose chunk size, and what are the trade-offs?',
          answer: `**Typical chunk sizes**:
- GFS: 64 MB
- HDFS: 128 MB (default, configurable)
- Cloud storage (S3): Variable, typically 5-100 MB parts

**Large chunks (64-128 MB) -- pros**:
- Fewer metadata entries at the master (less RAM)
- Fewer chunk server RPCs for large sequential reads
- Client can keep a persistent connection for multiple ops on one chunk
- Reduces network overhead (fewer round trips)

**Large chunks -- cons**:
- Small files waste space (1 KB file uses one whole chunk)
- Small files create hotspots (popular small file = all traffic to few servers)
- Internal fragmentation

**Small chunks (1-4 MB) -- pros**:
- Better utilization for small files
- More parallelism (more chunks = more servers reading in parallel)
- Finer-grained load balancing

**Small chunks -- cons**:
- Massive metadata at the master (memory pressure)
- More RPCs for large file reads

**Best practice for interviews**:

  Workload          | Recommended Chunk Size
  ──────────────────|──────────────────────
  Log aggregation   | 128 MB (large sequential)
  Video storage     | 64-128 MB (large files)
  Image storage     | 16-32 MB (many small files)
  Data lake         | 128-256 MB (analytical queries)

**GFS "small file" solution**: Lazy allocation -- don't allocate full chunk until needed, and batch small files together.`
        },
        {
          question: 'How does replication and fault tolerance work in a distributed file system?',
          answer: `**Default replication factor**: 3 copies (configurable per file)

**Rack-aware placement strategy (HDFS)**:

  Rack 1              Rack 2
  ┌──────────┐       ┌──────────┐
  │ DN1      │       │ DN3      │
  │ [copy 1] │       │ [copy 3] │
  │          │       │          │
  │ DN2      │       │ DN4      │
  │ [copy 2] │       │          │
  └──────────┘       └──────────┘

  Rule: 2 copies on same rack, 1 copy on different rack
  Why: Balances between write bandwidth (intra-rack is fast)
       and fault tolerance (survives rack failure)

**Failure detection**:
- DataNodes send heartbeats to NameNode every 3 seconds
- If no heartbeat for 10 minutes, node is declared dead
- NameNode triggers re-replication of all chunks on dead node

**Re-replication priority**:
1. Chunks with only 1 remaining replica (critical)
2. Chunks below replication factor
3. Recently created chunks

**Data integrity**:
- Each chunk stores a checksum (CRC-32 per 64KB block)
- DataNodes verify checksums on every read
- Background scanner checks all stored chunks periodically
- Corrupt chunks are reported to NameNode and re-replicated from healthy copies

**Garbage collection**:
- Deleted files are renamed to a hidden trash directory
- Master lazily reclaims storage after configurable delay
- Orphaned chunks (no file reference) are cleaned up in background scans`
        },
        {
          question: 'Compare GFS, HDFS, and modern cloud object stores (S3). When would you use each?',
          answer: `**Architecture comparison**:

  Feature           | GFS         | HDFS          | S3/GCS/Azure Blob
  ──────────────────|─────────────|───────────────|──────────────────
  Master            | Single      | Active/Standby| Managed (hidden)
  Chunk size        | 64 MB       | 128 MB        | Variable parts
  Consistency       | Relaxed     | Strong (1 writer)| Strong (2023+)
  Append support    | Atomic      | Single-writer | Multipart upload
  Latency           | Low (LAN)   | Low (LAN)     | Higher (HTTP)
  Cost model        | Own hardware| Own hardware  | Pay-per-use
  Max file size     | Petabytes   | Petabytes     | 5 TB (S3)
  POSIX compatible  | Partial     | No            | No

**When to use HDFS**:
- On-premise big data processing (Hadoop/Spark)
- Need low-latency access to large datasets
- Already have a Hadoop cluster
- Data locality matters (compute next to data)

**When to use S3 / cloud object storage**:
- Cloud-native applications
- Variable or unpredictable storage needs
- Don't want to manage infrastructure
- Need global access and CDN integration
- Event-driven architectures (S3 triggers Lambda)

**When to use neither** (use a database instead):
- Small records with random access patterns
- Need transactions or complex queries
- Low-latency key-value lookups

**Modern trend**: Separation of storage and compute
- Store data in S3/GCS (cheap, durable, infinite)
- Process with Spark/Presto/Trino pulling from object store
- Replaces HDFS for many analytical workloads`
        }
      ],

      basicImplementation: {
        title: 'Single-Master File System',
        description: 'A basic distributed file system with one master tracking all metadata and multiple chunk servers storing data blocks with replication factor 3.',
        svgTemplate: 'singleServer',
        problems: [
          'Master is a single point of failure',
          'Master memory limits total file count',
          'No support for random writes',
          'Small files waste chunk space and create hotspots'
        ]
      },

      advancedImplementation: {
        title: 'Production Distributed File System',
        description: 'High-availability NameNode with automatic failover, rack-aware replication, erasure coding for cold data, and tiered storage (hot SSD, warm HDD, cold object store).',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Active/Standby NameNode with ZooKeeper-based failover',
          'Rack-aware block placement for fault tolerance',
          'Erasure coding reduces storage overhead from 3x to 1.5x for cold data',
          'Tiered storage moves aging data to cheaper media automatically',
          'Federation splits namespace across multiple NameNodes for scale'
        ]
      },

      discussionPoints: [
        {
          topic: 'Design Trade-offs',
          points: [
            'Large chunk size: fewer metadata entries but wastes space for small files',
            'Replication factor: higher durability but more storage cost',
            'Single master simplifies design but limits metadata scale',
            'Write-once semantics simplify consistency but limit update patterns',
            'Data locality (compute near data) vs. separated storage and compute'
          ]
        },
        {
          topic: 'Failure Scenarios',
          points: [
            'DataNode failure: automatic re-replication from healthy copies',
            'NameNode failure: standby takes over via ZooKeeper fencing',
            'Rack failure: rack-aware placement ensures data survives',
            'Network partition: nodes on minority side stop serving writes',
            'Disk corruption: checksums detect and trigger re-replication'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Start by clarifying the workload: append-heavy vs random write, file sizes',
            'Draw the master-worker architecture and explain the metadata flow',
            'Discuss chunk size choice and its impact on metadata and parallelism',
            'Mention rack-aware replication unprompted to show depth',
            'Compare with object stores to show awareness of modern alternatives'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-dfs', title: 'HDFS Architecture (Eraser)', description: 'NameNode metadata, DataNodes with block replication, rack-aware placement', src: '/diagrams/distributed-file-systems/eraser-dfs.png', type: 'cloud-architecture' }
      ],

      comparisonTables: [
        {
          id: 'hdfs-vs-object-storage',
          title: 'HDFS vs Object Storage',
          left: {
            title: 'HDFS',
            icon: 'layers',
            color: '#f59e0b',
            items: [
              { label: 'Model', value: 'Block storage with NameNode metadata' },
              { label: 'Access', value: 'Streaming sequential reads' },
              { label: 'Scaling', value: 'Add DataNodes to cluster' },
              { label: 'Use Case', value: 'MapReduce, Spark, batch analytics' },
              { label: 'Latency', value: 'Higher — optimized for throughput' },
              { label: 'Examples', value: 'Apache HDFS, Google GFS' }
            ]
          },
          right: {
            title: 'Object Storage',
            icon: 'globe',
            color: '#3b82f6',
            items: [
              { label: 'Model', value: 'Flat namespace, key-value objects' },
              { label: 'Access', value: 'HTTP API (GET/PUT)' },
              { label: 'Scaling', value: 'Virtually unlimited, managed' },
              { label: 'Use Case', value: 'Media, backups, data lakes, CDN origin' },
              { label: 'Latency', value: 'Lower for random access' },
              { label: 'Examples', value: 'AWS S3, GCS, Azure Blob' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'dfs-design-choices',
          title: 'DFS Design Considerations',
          color: '#f59e0b',
          icon: 'layers',
          items: [
            { label: 'Chunk size', value: '64-256 MB typical', bar: 60 },
            { label: 'Replication factor', value: '3x default', bar: 75 },
            { label: 'Consistency model', value: 'Write-once, append-only', bar: 65 },
            { label: 'Fault tolerance', value: 'Rack-aware placement', bar: 85 },
            { label: 'Metadata management', value: 'Centralized NameNode', bar: 70 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'chunk-replication', name: 'Chunk Replication', icon: 'copy', color: '#10b981',
          description: 'Split files into chunks, replicate each to multiple nodes.',
          useWhen: 'Fault tolerance and parallel read access',
          example: 'HDFS: 128MB chunks, 3 replicas across different racks'
        },
        {
          id: 'erasure-coding', name: 'Erasure Coding', icon: 'shield', color: '#8b5cf6',
          description: 'Store parity data instead of full replicas — 50% less storage.',
          useWhen: 'Cold/archive storage where space efficiency matters',
          example: 'HDFS Erasure Coding, Azure LRS, S3 Glacier'
        }
      ]
    },
    {
      id: 'distributed-messaging',
      title: 'Distributed Messaging',
      icon: 'radio',
      color: '#8b5cf6',
      questions: 12,
      description: 'Kafka deep dive, RabbitMQ vs Kafka, delivery semantics, and event streaming architectures.',
      concepts: ['Apache Kafka Architecture', 'Topics & Partitions', 'Consumer Groups', 'Delivery Semantics (At-Least-Once, At-Most-Once, Exactly-Once)', 'RabbitMQ vs Kafka', 'Event Sourcing', 'Log Compaction', 'Schema Registry'],
      tips: [
        'Kafka is a distributed commit log, not just a message queue -- this distinction matters in interviews',
        'Partition count determines maximum parallelism for consumers',
        'Consumer group rebalancing is a critical failure mode to discuss',
        'Exactly-once semantics requires idempotent producers + transactional consumers',
        'RabbitMQ excels at complex routing; Kafka excels at high-throughput streaming',
        'Always mention offset management and its implications for replayability'
      ],

      introduction: `**Distributed messaging systems** are the backbone of modern microservice architectures, enabling services to communicate asynchronously, absorb traffic spikes, and process events at massive scale. They decouple producers from consumers, allowing each to scale independently and fail without cascading.

**Apache Kafka** has become the de facto standard for high-throughput event streaming. Unlike traditional message brokers that delete messages after delivery, Kafka retains messages in a **distributed commit log**, enabling consumers to replay events, build materialized views, and power real-time analytics pipelines. Companies like LinkedIn (where Kafka was born), Netflix, and Uber process trillions of messages per day through Kafka.

In system design interviews, messaging systems appear in nearly every architecture: notification systems, activity feeds, log aggregation, event-driven microservices, and data pipelines. Understanding the difference between **message queues** (RabbitMQ) and **event streams** (Kafka), along with **delivery semantics** and **partitioning strategies**, is essential for senior-level interviews.`,

      functionalRequirements: [
        'Publish messages to named topics with optional partitioning',
        'Subscribe to topics and consume messages in order within a partition',
        'Support consumer groups for parallel processing',
        'Retain messages for configurable duration or size',
        'Enable message replay from any offset',
        'Support multiple delivery guarantees (at-least-once, at-most-once, exactly-once)'
      ],

      nonFunctionalRequirements: [
        'Throughput: Millions of messages per second per cluster',
        'Latency: p99 < 10ms for produce, < 100ms for end-to-end',
        'Durability: No message loss with replication factor >= 3',
        'Availability: 99.99% uptime with automatic failover',
        'Scalability: Add partitions and brokers without downtime',
        'Retention: Store weeks/months of data at low cost'
      ],

      dataModel: {
        description: 'Kafka architecture and data model',
        schema: `Kafka Cluster Architecture:

  Producers                     Consumers
  ┌────┐ ┌────┐               ┌────┐ ┌────┐
  │ P1 │ │ P2 │               │ C1 │ │ C2 │
  └──┬─┘ └──┬─┘               └──┬─┘ └──┬─┘
     │       │                    │       │
     v       v                    │       │
  ┌──────────────────────────────────────────┐
  │            Kafka Cluster                  │
  │                                           │
  │  Topic: "orders"                          │
  │  ┌─────────────┬─────────────┬──────────┐│
  │  │ Partition 0 │ Partition 1 │ Part. 2  ││
  │  │ [0,1,2,3..] │ [0,1,2,3..]│ [0,1,2..]││
  │  │ Broker 1    │ Broker 2   │ Broker 3 ││
  │  └─────────────┴─────────────┴──────────┘│
  │                                           │
  │  Each partition is an ordered, immutable   │
  │  append-only log of records               │
  └───────────────────────────────────────────┘

Partition Detail:
  Offset: 0    1    2    3    4    5    6
         [msg][msg][msg][msg][msg][msg][msg]-->
          ▲                        ▲      ▲
          │                        │      │
       Earliest                Consumer  Latest
       offset                  position  offset

Consumer Group:
  Group "order-processor":
    Consumer C1 -> Partition 0, Partition 1
    Consumer C2 -> Partition 2
  (each partition assigned to exactly one consumer in a group)

Message Record:
{
  key: "user-123",           // Determines partition
  value: { orderId, items }, // Payload
  timestamp: 1704067200000,
  headers: { "source": "checkout-service" },
  partition: 1,
  offset: 42
}`
      },

      apiDesign: {
        description: 'Kafka producer and consumer operations',
        endpoints: [
          { method: 'PRODUCE', path: 'producer.send(topic, key, value)', params: 'topic, partition key, message payload', response: 'RecordMetadata (partition, offset, timestamp)' },
          { method: 'CONSUME', path: 'consumer.poll(timeout)', params: 'poll timeout', response: 'Batch of ConsumerRecords' },
          { method: 'COMMIT', path: 'consumer.commitSync(offsets)', params: 'partition -> offset map', response: 'Offsets committed to __consumer_offsets' },
          { method: 'SEEK', path: 'consumer.seek(partition, offset)', params: 'partition, target offset', response: 'Consumer repositioned for replay' },
          { method: 'ADMIN', path: 'admin.createTopic(name, partitions, replication)', params: 'topic config', response: 'Topic created across brokers' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does Kafka achieve high throughput and durability simultaneously?',
          answer: `**Key design decisions that enable high throughput**:

1. **Sequential I/O**: Kafka writes to an append-only log. Sequential disk writes (600 MB/s) approach memory speed and far exceed random writes (100 KB/s).

2. **Zero-copy transfer**: Kafka uses OS sendfile() to transfer data from disk to network socket without copying through application memory.

3. **Batching**: Producers batch messages. A single network request can carry thousands of messages, amortizing overhead.

4. **Page cache**: Kafka relies on the OS page cache rather than managing its own in-process cache. This avoids GC pauses and doubles available memory.

**Durability through replication**:

  Topic: "payments" (replication factor = 3)

  Partition 0:
  ┌─────────┐  replicate  ┌─────────┐  replicate  ┌─────────┐
  │ Broker 1│ ──────────> │ Broker 2│ ──────────> │ Broker 3│
  │ LEADER  │             │ FOLLOWER│             │ FOLLOWER│
  │ [0..99] │             │ [0..99] │             │ [0..97] │
  └─────────┘             └─────────┘             └─────────┘
       ▲                                               │
       │              ISR (In-Sync Replicas)            │
       │              = {Broker1, Broker2}              │
       │              Broker3 is catching up            │
       └────────────────────────────────────────────────┘

  acks=all: Producer waits for ALL ISR replicas to acknowledge
  acks=1:   Only leader acknowledges (risk of data loss)
  acks=0:   Fire-and-forget (highest throughput)

**Throughput numbers**:
- Single broker: 200 MB/s writes, 500 MB/s reads
- 10-broker cluster: 2 GB/s aggregate throughput
- LinkedIn: 7 trillion messages/day across clusters`
        },
        {
          question: 'Explain Kafka delivery semantics: at-most-once, at-least-once, and exactly-once.',
          answer: `**At-Most-Once** (messages may be lost, never duplicated):
- Producer: acks=0 or acks=1 without retries
- Consumer: Commit offset BEFORE processing
- If consumer crashes after commit but before processing, message is lost
- Use case: Metrics, logs where occasional loss is acceptable

  Produce -> Commit Offset -> Process
                                 ↑ crash here = message lost

**At-Least-Once** (messages never lost, may be duplicated):
- Producer: acks=all with retries enabled
- Consumer: Commit offset AFTER processing
- If consumer crashes after processing but before commit, message is reprocessed
- Use case: Most applications (with idempotent consumers)

  Produce -> Process -> Commit Offset
                 ↑ crash here = message reprocessed

**Exactly-Once** (messages never lost, never duplicated):
Requires coordination between producer and consumer:

1. **Idempotent Producer** (Kafka >= 0.11):
   - Producer sends sequence numbers per partition
   - Broker deduplicates retried messages
   - enable.idempotence=true

2. **Transactional Producer + Consumer**:
   - Producer wraps send + offset commit in a transaction
   - Consumer reads only committed messages (isolation.level=read_committed)

  Producer                          Broker
    │ beginTransaction()              │
    │ send(msg) + commitOffsets()     │
    │──────────────────────────────>│
    │ commitTransaction()             │
    │──────────────────────────────>│
    │                    atomic commit │

**Interview tip**: Most systems use at-least-once with idempotent consumers. Exactly-once has performance overhead and is reserved for critical financial or transactional pipelines.`
        },
        {
          question: 'Compare Kafka and RabbitMQ. When would you choose each?',
          answer: `**Architecture difference**:

  RabbitMQ (Smart broker, dumb consumer):
  Producer -> Exchange -> Binding -> Queue -> Consumer
  - Broker tracks which messages are delivered and ACKed
  - Messages deleted after consumption
  - Complex routing (fanout, topic, headers, direct)

  Kafka (Dumb broker, smart consumer):
  Producer -> Topic -> Partition (append-only log) -> Consumer
  - Consumer tracks its own position (offset)
  - Messages retained regardless of consumption
  - Simple partitioning, consumer manages replay

**Feature comparison**:

  Feature           | Kafka              | RabbitMQ
  ──────────────────|────────────────────|─────────────────
  Model             | Distributed log    | Message broker
  Ordering          | Per partition      | Per queue
  Retention         | Time/size-based    | Until consumed
  Replay            | Yes (seek offset)  | No (consumed=gone)
  Throughput        | Millions msg/sec   | Tens of thousands
  Routing           | Partition key only | Complex routing
  Protocol          | Custom binary      | AMQP, MQTT, STOMP
  Consumer model    | Pull (poll)        | Push (prefetch)
  Use case          | Event streaming    | Task distribution

**Choose Kafka when**:
- High throughput (> 100K msg/sec)
- Need event replay or event sourcing
- Building data pipelines or stream processing
- Multiple consumers need the same events
- Log aggregation or activity tracking

**Choose RabbitMQ when**:
- Complex routing logic needed
- Request-reply patterns
- Task distribution with priority queues
- Lower throughput but need message-level features
- Need multiple protocols (AMQP, MQTT)`
        },
        {
          question: 'How does Kafka partitioning work, and how do you choose a partition key?',
          answer: `**Partitioning fundamentals**:
- A topic is divided into N partitions
- Each partition is an ordered, append-only log
- Partition count = maximum consumer parallelism
- Messages with the same key always go to the same partition

**Partition assignment**:

  partition = hash(key) % num_partitions

  Example: Topic "orders" with 6 partitions
  ┌──────┬──────┬──────┬──────┬──────┬──────┐
  │ P0   │ P1   │ P2   │ P3   │ P4   │ P5   │
  │user-A│user-B│user-C│user-D│user-A│user-E│
  │user-F│user-G│      │      │      │user-H│
  └──────┴──────┴──────┴──────┴──────┴──────┘
  (user-A's orders always in P0, preserving order)

**Choosing partition keys**:

  Use Case              | Partition Key    | Why
  ──────────────────────|──────────────────|──────────────────
  Order processing      | user_id          | All orders for a user in order
  IoT telemetry         | device_id        | Per-device ordering
  Multi-tenant SaaS     | tenant_id        | Tenant isolation
  Log aggregation       | null (round-robin)| Even distribution
  Financial txns        | account_id       | Account-level ordering

**Common pitfalls**:
- **Hot partitions**: A popular user/tenant sends most traffic to one partition. Fix: Add sub-key (user_id + random suffix) or over-partition.
- **Too few partitions**: Limits consumer parallelism. Start with 3x expected consumer count.
- **Too many partitions**: More metadata, longer leader election, more file handles. Keep under 10,000 per broker.
- **Changing partition count**: Breaks key-based ordering. Plan partition count upfront.

**Rule of thumb**: Start with 6-12 partitions per topic, scale to hundreds for high-throughput topics.`
        },
        {
          question: 'How do you handle consumer group rebalancing and its impact on availability?',
          answer: `**Consumer group rebalancing** occurs when consumers join, leave, or crash. The group coordinator reassigns partition ownership.

**Triggers for rebalance**:
- New consumer joins the group
- Existing consumer crashes (missed heartbeat)
- Consumer calls unsubscribe()
- Topic partition count changes

**Rebalance process (eager)**:

  Step 1: Coordinator detects change
  Step 2: All consumers revoke partitions (STOP processing)
  Step 3: Coordinator reassigns partitions
  Step 4: Consumers receive new assignments
  Step 5: Consumers resume processing

  Timeline:
  C1: [processing P0,P1] --STOP-- [wait] --[processing P0]-->
  C2: [processing P2]    --STOP-- [wait] --[processing P1,P2]-->
                          ↑                ↑
                     Revocation      Reassignment
                     (downtime!)     (~seconds)

**Problem**: During rebalance, NO consumer processes ANY partition. For a large consumer group, this can mean seconds to minutes of downtime.

**Cooperative (incremental) rebalance** (Kafka >= 2.4):
- Only affected partitions are revoked and reassigned
- Other partitions continue processing uninterrupted
- Dramatically reduces rebalance impact

**Static group membership** (Kafka >= 2.3):
- Assign group.instance.id to each consumer
- If a consumer restarts quickly, it gets the same partitions back
- Avoids unnecessary rebalance on rolling deployments

**Best practices**:
- Use cooperative rebalance (CooperativeStickyAssignor)
- Set session.timeout.ms appropriately (10-30 seconds)
- Use static membership for containerized deployments
- Monitor consumer lag during rebalances
- Over-provision partitions to minimize reassignment scope`
        }
      ],

      basicImplementation: {
        title: 'Single-Broker Message Queue',
        description: 'A single Kafka broker with topics, no replication, and basic producer/consumer setup.',
        svgTemplate: 'simpleCache',
        problems: [
          'Single point of failure -- broker crash loses all data',
          'No replication means no durability guarantee',
          'Limited throughput from one machine',
          'No consumer group coordination'
        ]
      },

      advancedImplementation: {
        title: 'Production Kafka Cluster',
        description: 'Multi-broker cluster with replication, consumer groups, schema registry, and stream processing. ISR-based durability with acks=all.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Replication factor 3 with min.insync.replicas=2 for durability',
          'Consumer groups with cooperative rebalancing for high availability',
          'Schema Registry (Avro/Protobuf) for contract enforcement',
          'Kafka Streams or Flink for real-time stream processing',
          'MirrorMaker 2 for cross-datacenter replication'
        ]
      },

      discussionPoints: [
        {
          topic: 'Kafka vs Traditional Message Queues',
          points: [
            'Kafka retains messages; traditional brokers delete after delivery',
            'Kafka consumers are pull-based; RabbitMQ pushes to consumers',
            'Kafka ordering is per-partition; RabbitMQ ordering is per-queue',
            'Kafka scales by adding partitions; RabbitMQ scales by adding queues',
            'Kafka is better for event sourcing and stream processing'
          ]
        },
        {
          topic: 'Common Production Issues',
          points: [
            'Consumer lag: consumers falling behind producers (monitor with Burrow)',
            'Partition skew: uneven message distribution across partitions',
            'Rebalance storms: frequent consumer restarts causing repeated rebalances',
            'Broker disk full: retention policy not tuned for throughput',
            'Schema evolution: breaking changes without a schema registry'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Always mention partitioning strategy and how it affects ordering',
            'Discuss delivery semantics and the trade-offs between them',
            'Draw the producer -> broker -> consumer architecture with partitions',
            'Mention consumer groups and how they enable parallel processing',
            'Compare Kafka to alternatives when the interviewer asks about messaging'
          ]
        }
      ],
      staticDiagrams: [
        { id: 'eraser-messaging', title: 'Event-Driven Architecture (Eraser)', description: 'Kafka event bus, schema registry, DLQ, event store, CQRS read/write models', src: '/diagrams/distributed-messaging/eraser-messaging.png', type: 'cloud-architecture' },
        { id: 'kafka-performance', title: 'Why Kafka is Fast', description: 'Sequential I/O and zero-copy principle — how Kafka achieves high throughput', src: '/diagrams/distributed-messaging/kafka-performance.svg', type: 'architecture' }
      ],

      comparisonCards: [
        {
          title: 'Why Kafka is Fast',
          items: [
            { name: 'Sequential I/O', description: 'Kafka writes data as an append-only log. Sequential disk writes are dramatically faster than random writes — approaching memory speeds on modern SSDs. No seek time overhead.' },
            { name: 'Zero-Copy Principle', description: 'Traditional: Disk → OS Cache → App Buffer → Socket Buffer → NIC (4 copies). With zero-copy: Disk → OS Cache → NIC via sendfile() (2 copies). Eliminates unnecessary data copies between kernel and application context.' },
            { name: 'Batch Compression', description: 'Messages are batched and compressed together before sending. Reduces network overhead and disk I/O. Consumers decompress batches efficiently.' },
            { name: 'Partitioning', description: 'Topics are split into partitions that can be distributed across brokers. Enables parallel processing — consumers in a group each handle different partitions simultaneously.' }
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'kafka-vs-rabbitmq',
          title: 'Apache Kafka vs RabbitMQ',
          left: {
            title: 'Apache Kafka',
            icon: 'layers',
            color: '#10b981',
            items: [
              { label: 'Model', value: 'Distributed log — append-only' },
              { label: 'Throughput', value: 'Millions of messages/sec' },
              { label: 'Ordering', value: 'Per-partition ordering guaranteed' },
              { label: 'Retention', value: 'Configurable, days to forever' },
              { label: 'Consumer', value: 'Pull-based, consumer groups' },
              { label: 'Best For', value: 'Event streaming, analytics, logs' }
            ]
          },
          right: {
            title: 'RabbitMQ',
            icon: 'arrowRight',
            color: '#f59e0b',
            items: [
              { label: 'Model', value: 'Message broker — queues + exchanges' },
              { label: 'Throughput', value: 'Tens of thousands/sec' },
              { label: 'Ordering', value: 'FIFO per queue' },
              { label: 'Retention', value: 'Until consumed (then deleted)' },
              { label: 'Consumer', value: 'Push-based, acknowledgments' },
              { label: 'Best For', value: 'Task queues, RPC, routing patterns' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'messaging-guarantees',
          title: 'Message Delivery Guarantees',
          color: '#10b981',
          icon: 'check',
          items: [
            { label: 'At-most-once', value: 'Fire and forget, may lose', bar: 30 },
            { label: 'At-least-once', value: 'Retry until ack, may duplicate', bar: 70 },
            { label: 'Exactly-once', value: 'Idempotent + transactions', bar: 95 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'consumer-groups', name: 'Consumer Groups', icon: 'users', color: '#10b981',
          description: 'Multiple consumers share partitions for parallel processing.',
          useWhen: 'Scale consumption horizontally',
          example: 'Kafka: 12 partitions, 4 consumers → 3 partitions each'
        },
        {
          id: 'schema-registry', name: 'Schema Registry', icon: 'database', color: '#3b82f6',
          description: 'Central schema store for message format versioning.',
          useWhen: 'Multiple producers/consumers, schema evolution',
          example: 'Confluent Schema Registry with Avro/Protobuf'
        }
      ]
    },
    {
      id: 'rest-vs-rpc',
      title: 'REST vs RPC vs GraphQL',
      icon: 'code',
      color: '#8b5cf6',
      questions: 8,
      description: 'REST vs gRPC vs GraphQL trade-offs for API communication patterns.',
      concepts: ['REST Constraints', 'gRPC & Protocol Buffers', 'GraphQL Schema & Resolvers', 'HTTP/2 Multiplexing', 'API Versioning', 'Overfetching vs Underfetching', 'Streaming RPCs', 'Federation'],
      tips: [
        'REST is the default for public APIs; gRPC for internal microservice-to-microservice communication',
        'GraphQL shines when clients need flexible queries over many resources',
        'gRPC binary encoding is 5-10x smaller and faster than JSON over REST',
        'Consider the developer experience: REST is easiest to debug with curl',
        'In interviews, discuss the trade-offs rather than declaring one "best"',
        'HTTP/2 is required for gRPC -- this can be a deployment constraint'
      ],

      introduction: `Choosing the right **API communication paradigm** is a foundational decision in system design. The three dominant approaches -- **REST**, **gRPC**, and **GraphQL** -- each optimize for different use cases, and understanding their trade-offs is critical for interviews and real-world architecture.

**REST (Representational State Transfer)** uses HTTP verbs and resource-based URLs. It is the lingua franca of web APIs, universally understood and easy to cache, but can suffer from **overfetching** (returning more data than needed) and **underfetching** (requiring multiple round trips). **gRPC** uses Protocol Buffers for binary serialization and HTTP/2 for transport, delivering significantly lower latency and bandwidth for service-to-service communication. **GraphQL** gives clients a query language to request exactly the data they need in a single round trip, solving the over/underfetching problem but introducing query complexity.

In a system design interview, the choice between these paradigms signals your understanding of **performance constraints**, **developer ergonomics**, and **organizational scale**. Most production systems use a combination: gRPC internally, REST or GraphQL for external APIs.`,

      functionalRequirements: [
        'Enable service-to-service and client-to-server communication',
        'Support request-response and streaming patterns',
        'Allow schema evolution without breaking clients',
        'Provide type-safe contracts between services',
        'Support authentication and authorization at the API layer',
        'Enable efficient data fetching with minimal over/underfetching'
      ],

      nonFunctionalRequirements: [
        'Latency: < 5ms overhead for internal RPCs, < 50ms for external APIs',
        'Throughput: 100K+ RPS per service instance',
        'Compatibility: Backward-compatible schema evolution',
        'Debuggability: Easy to inspect and troubleshoot requests',
        'Tooling: Rich ecosystem for code generation, testing, monitoring',
        'Cacheability: HTTP caching for read-heavy public APIs'
      ],

      dataModel: {
        description: 'Comparison of API paradigm data models',
        schema: `REST (Resource-oriented):
  GET /api/users/123
  Response: {
    "id": 123,
    "name": "Alice",
    "email": "alice@example.com",
    "orders": [/* all fields, all orders */]  // Overfetch!
  }

gRPC (Service-oriented, Protocol Buffers):
  service UserService {
    rpc GetUser(GetUserRequest) returns (User);
    rpc ListUsers(ListUsersRequest) returns (stream User);
  }
  message User {
    int32 id = 1;
    string name = 2;
    string email = 3;
  }
  // Binary on the wire: ~50 bytes vs ~200 bytes JSON

GraphQL (Query language):
  query {
    user(id: 123) {
      name
      orders(last: 5) {
        id
        total
      }
    }
  }
  // Client specifies exactly what fields it needs

Wire format comparison (same user object):
  JSON (REST):     ~200 bytes, human-readable
  Protobuf (gRPC): ~50 bytes, binary
  GraphQL:         ~180 bytes response, but only requested fields`
      },

      apiDesign: {
        description: 'Same operation expressed in three paradigms',
        endpoints: [
          { method: 'REST', path: 'GET /users/:id', params: 'path param: id', response: 'Full user JSON with all fields' },
          { method: 'REST', path: 'GET /users/:id/orders?limit=5', params: 'path + query params', response: 'Separate request for related data' },
          { method: 'gRPC', path: 'UserService.GetUser(id=123)', params: 'Protobuf message', response: 'Binary User message (~5x smaller)' },
          { method: 'GraphQL', path: 'POST /graphql { query }', params: 'Query with field selection', response: 'Exactly requested fields in one round trip' },
          { method: 'gRPC', path: 'UserService.StreamUpdates()', params: 'Server-stream RPC', response: 'Continuous stream of User updates' }
        ]
      },

      comparisonCards: [
        {
          title: 'Reverse Proxy vs API Gateway vs Load Balancer',
          items: [
            { name: 'Reverse Proxy', description: 'Hides backend server addresses from clients. Fetches data from servers on behalf of clients. Perfect for shielding servers from direct exposure and cyber-attacks. Examples: Nginx, HAProxy.' },
            { name: 'API Gateway', description: 'Single entry point for ALL client requests to DIFFERENT backend APIs/services. Handles authentication, rate limiting, request routing, and protocol translation. Examples: Kong, AWS API Gateway.' },
            { name: 'Load Balancer', description: 'Distributes traffic across multiple instances of the SAME service. Focuses purely on traffic distribution and health checking. Examples: ALB, NLB, HAProxy.' }
          ]
        },
        {
          title: '9 System Integration Patterns',
          items: [
            { name: 'Peer-to-Peer', description: 'Direct communication between components without a central coordinator. Each node acts as both client and server.' },
            { name: 'API Gateway', description: 'Single entry point for all clients. Handles auth, rate limiting, routing, and protocol translation.' },
            { name: 'Pub-Sub', description: 'Publishers send messages to topics. Subscribers receive messages from topics they are interested in. Full decoupling.' },
            { name: 'Request-Response', description: 'Client sends request, waits for server response. Most common HTTP pattern. Simple but synchronous.' },
            { name: 'Event Sourcing', description: 'Store all state changes as a sequence of events. Event store is the source of truth. Enables full audit trail and replay.' },
            { name: 'ETL (Extract-Transform-Load)', description: 'Extract data from sources, transform to desired format, load into target system. Standard for data pipelines and warehousing.' },
            { name: 'Batching', description: 'Collect multiple inputs, process them together in one batch. Higher throughput but increased latency.' },
            { name: 'Stream Processing', description: 'Process data in real-time as it arrives. Low latency, continuous output. Used with Kafka, Flink, Spark Streaming.' },
            { name: 'Orchestration', description: 'Central orchestrator coordinates and manages workflows across multiple services. Controls sequence and handles failures.' }
          ]
        }
      ],

      keyQuestions: [
        {
          question: 'When should you choose REST vs gRPC vs GraphQL?',
          answer: `**Decision matrix**:

  Criterion          | REST         | gRPC           | GraphQL
  ────────────────── |──────────────|────────────────|──────────────
  Best for           | Public APIs  | Internal svcs  | Flexible UIs
  Payload size       | Large (JSON) | Small (binary) | Medium (JSON)
  Latency            | Medium       | Low            | Medium
  Caching            | Excellent    | Difficult      | Custom needed
  Streaming          | SSE/WebSocket| Native bi-di   | Subscriptions
  Browser support    | Native       | Needs grpc-web | Native
  Code generation    | OpenAPI opt. | Required       | Required
  Learning curve     | Low          | Medium         | High
  Debugging          | Easy (curl)  | Harder (binary)| Medium

**Choose REST when**:
- Building public-facing APIs consumed by third parties
- Caching is critical (CDN, HTTP caches)
- Simple CRUD operations on resources
- Team familiarity and ecosystem matter most

**Choose gRPC when**:
- Microservice-to-microservice communication
- Low latency and high throughput are critical
- Need streaming (server, client, or bidirectional)
- Polyglot services need strong type contracts

**Choose GraphQL when**:
- Multiple client types (web, mobile, TV) need different data shapes
- Reducing round trips is important (mobile on slow networks)
- Frontend teams need to iterate on data needs independently
- API aggregation layer over multiple backend services

**Common hybrid approach**:
  Mobile/Web -> GraphQL Gateway -> gRPC -> Microservices
                    |
              REST for partners/third-party`
        },
        {
          question: 'What are the performance trade-offs between REST and gRPC?',
          answer: `**Serialization overhead**:

  REST (JSON):
  {"userId":123,"name":"Alice","email":"alice@example.com"}
  Size: ~58 bytes, parse time: ~50 microseconds

  gRPC (Protobuf):
  Binary: 08 7B 12 05 41 6C 69 63 65 1A 11 ...
  Size: ~25 bytes, parse time: ~5 microseconds
  ~60% smaller, ~10x faster to parse

**Transport overhead**:

  REST over HTTP/1.1:
  - New TCP connection per request (or keep-alive)
  - Text headers (~500 bytes per request)
  - No multiplexing (head-of-line blocking)

  gRPC over HTTP/2:
  - Single TCP connection multiplexed
  - Binary headers with HPACK compression (~50 bytes)
  - Concurrent streams without blocking

  Benchmark (1000 requests, same data):
  ┌──────────────┬──────────┬──────────┐
  │ Metric       │ REST/JSON│ gRPC     │
  ├──────────────┼──────────┼──────────┤
  │ Total bytes  │ 580 KB   │ 175 KB   │
  │ Avg latency  │ 12 ms    │ 3 ms     │
  │ Throughput   │ 8K RPS   │ 35K RPS  │
  │ CPU usage    │ Higher   │ Lower    │
  └──────────────┴──────────┴──────────┘

**When REST is actually faster**:
- Cached responses (304 Not Modified, CDN hits)
- Simple reads with HTTP caching layers
- Browser requests (no gRPC-web proxy needed)

**gRPC streaming advantage**:
- Server streaming: Price ticker (one request, continuous updates)
- Client streaming: File upload (many chunks, one response)
- Bidirectional: Chat (both sides send freely)`
        },
        {
          question: 'What are the main challenges with GraphQL at scale?',
          answer: `**Challenge 1: Query complexity and abuse**
- Clients can craft deeply nested queries that overwhelm the server
- Example: user { friends { friends { friends { posts { comments } } } } }

Solutions:
- Query depth limiting (max depth = 5)
- Query cost analysis (assign weight to each field)
- Persisted queries (whitelist allowed queries)
- Timeout per query execution

**Challenge 2: N+1 query problem**
- Resolving a list of users, each with orders, fires N separate DB queries

  query { users { orders { items } } }
  -> 1 query for users
  -> N queries for orders (one per user)
  -> N*M queries for items

Solution: DataLoader (batching + caching)
  - Collects all user IDs in a single tick
  - Fires ONE query: SELECT * FROM orders WHERE user_id IN (...)

**Challenge 3: Caching**
- REST: Cache by URL (GET /users/123 -> cache key)
- GraphQL: Every query is POST with unique body
- Solutions: Persisted queries with GET, CDN cache by query hash, response-level @cacheControl directives

**Challenge 4: Schema evolution**
- No URL-based versioning like REST (/v1/users)
- Must use field deprecation: @deprecated(reason: "Use fullName")
- Adding fields is safe; removing/renaming breaks clients

**Challenge 5: Observability**
- Every request is POST /graphql -- hard to distinguish in logs
- Solution: Named operations, tracing per resolver, APM integration`
        },
        {
          question: 'How does gRPC handle service evolution and backward compatibility?',
          answer: `**Protocol Buffers versioning rules**:

1. **Safe changes** (backward compatible):
   - Add new fields (with new field numbers)
   - Add new RPC methods
   - Add new enum values
   - Change field from required to optional

2. **Breaking changes** (avoid these):
   - Remove or rename fields
   - Change field numbers
   - Change field types
   - Remove RPC methods

**Field number rules**:
  message User {
    int32 id = 1;         // NEVER reuse field numbers
    string name = 2;
    string email = 3;
    // Field 4 was removed -- RESERVED
    reserved 4;
    string phone = 5;     // New field, new number
  }

**Unknown field handling**:
- Old client receives new fields -> ignores them (forward compatible)
- New client receives old message -> new fields get default values

**Versioning strategies**:
1. **Field-level evolution** (preferred):
   - Add optional fields for new features
   - Use reserved to prevent field number reuse

2. **Package versioning**:
   package myservice.v1;
   package myservice.v2;
   - Run both versions simultaneously
   - Route traffic during migration

3. **Method-level versioning**:
   rpc GetUserV1(...) returns (...);
   rpc GetUserV2(...) returns (...);
   - Simple but clutters the service definition

**Interview tip**: Mention that Protobuf's binary encoding makes unknown fields safe -- this is a key advantage over JSON where unknown fields require explicit handling.`
        }
      ],

      basicImplementation: {
        title: 'REST API',
        description: 'Standard RESTful API with JSON payloads over HTTP/1.1. Suitable for simple CRUD applications and public APIs.',
        svgTemplate: 'simpleCache',
        problems: [
          'Overfetching: Clients receive more data than needed',
          'Underfetching: Multiple round trips for related resources',
          'No built-in streaming support',
          'Text-based JSON has serialization overhead'
        ]
      },

      advancedImplementation: {
        title: 'Hybrid API Gateway',
        description: 'GraphQL gateway for external clients aggregating multiple gRPC backend services, with REST endpoints for partner integrations.',
        svgTemplate: 'loadBalancer',
        keyPoints: [
          'GraphQL federation composes multiple service schemas',
          'gRPC between services for low latency and type safety',
          'REST for third-party integrations and backward compatibility',
          'API gateway handles auth, rate limiting, and protocol translation',
          'Schema registry ensures contract compatibility across services'
        ]
      },

      discussionPoints: [
        {
          topic: 'When to Use What',
          points: [
            'Public APIs: REST (universally understood, cacheable)',
            'Internal services: gRPC (performance, type safety, streaming)',
            'Mobile/multi-client: GraphQL (flexible queries, fewer round trips)',
            'Real-time: gRPC streaming or GraphQL subscriptions',
            'Most systems combine two or three paradigms'
          ]
        },
        {
          topic: 'Migration Strategies',
          points: [
            'REST to gRPC: Start with internal services, use grpc-gateway for REST compatibility',
            'REST to GraphQL: Add GraphQL layer on top of existing REST services',
            'Both: API gateway pattern translates between protocols',
            'Gradual: Run old and new in parallel, migrate clients incrementally'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Never say one paradigm is universally better -- always discuss trade-offs',
            'Mention the hybrid approach as the production reality',
            'Discuss serialization formats (JSON vs Protobuf) and their impact',
            'Know when caching makes REST the better choice despite higher latency',
            'Mention HTTP/2 as a prerequisite for gRPC'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'rest-vs-graphql-vs-grpc',
          title: 'REST vs GraphQL vs gRPC',
          left: {
            title: 'REST',
            icon: 'globe',
            color: '#3b82f6',
            items: [
              { label: 'Format', value: 'JSON over HTTP/1.1' },
              { label: 'Schema', value: 'OpenAPI (optional)' },
              { label: 'Strengths', value: 'Simple, cacheable, universal' },
              { label: 'Weaknesses', value: 'Over/under-fetching' },
              { label: 'Use When', value: 'Public APIs, CRUD, web apps' },
              { label: 'Perf', value: 'Good — HTTP caching helps' }
            ]
          },
          right: {
            title: 'gRPC',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Format', value: 'Protobuf over HTTP/2' },
              { label: 'Schema', value: '.proto files (required)' },
              { label: 'Strengths', value: '10x faster, streaming, type-safe' },
              { label: 'Weaknesses', value: 'Not browser-native, harder debug' },
              { label: 'Use When', value: 'Microservices, internal APIs' },
              { label: 'Perf', value: 'Excellent — binary + multiplexing' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'api-style-selection',
          title: 'API Style Selection Guide',
          color: '#3b82f6',
          icon: 'globe',
          items: [
            { label: 'Public API for web/mobile', value: 'REST', bar: 90 },
            { label: 'Internal microservices', value: 'gRPC', bar: 85 },
            { label: 'Mobile with varied data needs', value: 'GraphQL', bar: 80 },
            { label: 'Real-time streaming', value: 'gRPC or WebSocket', bar: 75 },
            { label: 'Simple CRUD operations', value: 'REST', bar: 85 },
            { label: 'Complex nested queries', value: 'GraphQL', bar: 70 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'graphql-pattern', name: 'GraphQL', icon: 'search', color: '#8b5cf6',
          description: 'Query language — client asks for exactly what it needs.',
          useWhen: 'Multiple clients need different data shapes',
          example: 'query { user(id:1) { name, posts { title } } }'
        },
        {
          id: 'bff', name: 'Backend for Frontend', icon: 'layers', color: '#f59e0b',
          description: 'Dedicated API layer per client type (web, mobile, IoT).',
          useWhen: 'Different clients need very different API shapes',
          example: 'Mobile BFF aggregates 3 microservices into 1 call'
        }
      ]
    },
    {
      id: 'synchronous-vs-asynchronous',
      title: 'Synchronous vs Asynchronous Communication',
      icon: 'shuffle',
      color: '#8b5cf6',
      questions: 8,
      description: 'Sync vs async communication patterns, when to use each, and hybrid architectures.',
      concepts: ['Request-Response (Sync)', 'Message Queues (Async)', 'Event-Driven Architecture', 'Pub/Sub', 'Saga Pattern', 'Choreography vs Orchestration', 'Backpressure', 'Dead Letter Queues'],
      tips: [
        'Synchronous is simpler to reason about but creates tight coupling between services',
        'Asynchronous communication enables services to fail independently',
        'Use async for anything that does not need an immediate response',
        'Dead letter queues are essential for handling poison messages',
        'The saga pattern replaces distributed transactions in async architectures',
        'Always discuss backpressure when designing async systems'
      ],

      introduction: `The choice between **synchronous** and **asynchronous communication** is one of the most impactful architectural decisions in distributed systems. It affects coupling, resilience, latency, and how your system behaves under failure -- all topics that interviewers love to explore.

**Synchronous communication** (request-response) means the caller waits for the callee to respond. It is simple, immediate, and easy to debug, but creates **temporal coupling**: if the downstream service is slow or down, the caller is blocked. **REST** and **gRPC** are the most common synchronous protocols.

**Asynchronous communication** decouples the sender from the receiver using a message broker or event bus. The sender publishes a message and moves on without waiting for a response. This enables **loose coupling**, **independent scaling**, and **graceful degradation**, but introduces complexity in ordering, error handling, and eventual consistency. In system design interviews, knowing when to use sync vs async -- and how to combine them -- separates senior candidates from junior ones.`,

      functionalRequirements: [
        'Enable services to communicate without requiring simultaneous availability',
        'Support both request-response and fire-and-forget patterns',
        'Handle message ordering within logical boundaries',
        'Provide retry and dead-letter mechanisms for failed processing',
        'Support fan-out (one event, many consumers)',
        'Enable workflow orchestration across multiple services'
      ],

      nonFunctionalRequirements: [
        'Sync latency: p99 < 100ms for user-facing operations',
        'Async processing: 99.99% message delivery guarantee',
        'Resilience: No cascading failures across service boundaries',
        'Scalability: Producer and consumer scale independently',
        'Observability: End-to-end tracing across sync and async boundaries',
        'Ordering: Maintain causal ordering where required'
      ],

      dataModel: {
        description: 'Synchronous vs asynchronous communication patterns',
        schema: `Synchronous (Request-Response):

  Service A ──────> Service B ──────> Service C
     │   request       │   request       │
     │                 │                 │
     │   <── response ─┘   <── response ─┘
     │
  Total latency = latency_B + latency_C
  If B or C is down, A fails too

Asynchronous (Event-Driven):

  Service A ──> Message Broker ──> Service B
     │  publish     │  ┌──────────> Service C
     │              │  │ consume    Service D
     │  (returns    │  │
     │   immediately)  │
     v              v  v
  A continues   Consumers process
  working       independently

Common Async Patterns:
  1. Point-to-Point (Queue):
     Producer -> [Queue] -> one Consumer

  2. Pub/Sub (Fan-out):
     Publisher -> [Topic] -> Consumer A
                          -> Consumer B
                          -> Consumer C

  3. Request-Reply (Async):
     Service A -> [request-queue] -> Service B
     Service A <- [reply-queue]   <- Service B
     (A uses correlation ID to match replies)

  4. Event Sourcing:
     Command -> [Event Log] -> Projection A
                             -> Projection B
                             -> Projection C`
      },

      apiDesign: {
        description: 'Sync vs async patterns for the same operation',
        endpoints: [
          { method: 'SYNC', path: 'POST /orders', params: 'order data', response: '201 Created with order details (waits for payment, inventory)' },
          { method: 'ASYNC', path: 'POST /orders', params: 'order data', response: '202 Accepted with order ID (processing happens later)' },
          { method: 'POLL', path: 'GET /orders/:id/status', params: 'order ID', response: 'Current processing status (pending/confirmed/failed)' },
          { method: 'WEBHOOK', path: 'POST /callback-url', params: 'event payload', response: 'Notifies client when async processing completes' },
          { method: 'EVENT', path: 'order.created -> [broker]', params: 'order event', response: 'Consumed by payment, inventory, notification services' }
        ]
      },

      keyQuestions: [
        {
          question: 'When should you use synchronous vs asynchronous communication?',
          answer: `**Use synchronous when**:
- User is waiting for an immediate response (e.g., login, search)
- Operation is fast (< 100ms) and unlikely to fail
- Strong consistency is required (read-after-write)
- Simple request-response is sufficient
- Debugging simplicity is a priority

**Use asynchronous when**:
- Operation is slow (sending email, processing video, generating report)
- Downstream services may be temporarily unavailable
- One event triggers multiple actions (fan-out)
- Services need to scale independently
- You need to absorb traffic spikes (queue as buffer)

**Decision framework**:

  Question                        | Sync | Async
  ────────────────────────────────|──────|──────
  User needs immediate result?    |  Y   |  N
  Can tolerate eventual results?  |  N   |  Y
  Downstream may be slow/down?    |  N   |  Y
  Multiple consumers for event?   |  N   |  Y
  Need traffic spike buffering?   |  N   |  Y
  Simple debugging needed?        |  Y   |  N

**Real-world example -- E-commerce order**:
  Sync:  Validate order, charge payment (user waits)
  Async: Send confirmation email, update analytics,
         notify warehouse, update recommendation engine

  POST /orders (sync response in ~200ms)
    ├── Validate inventory (sync)
    ├── Charge payment (sync)
    └── Return 201 Created
         │
         └── Emit "order.created" event (async)
              ├── Email service: send confirmation
              ├── Warehouse: reserve inventory
              ├── Analytics: record purchase
              └── Recommendations: update model`
        },
        {
          question: 'What is the Saga pattern and how does it replace distributed transactions?',
          answer: `**Problem**: In microservices, a business transaction spans multiple services. Traditional 2-phase commit (2PC) is slow, fragile, and creates tight coupling.

**Saga**: A sequence of local transactions, each updating one service and publishing an event/command to trigger the next step. If any step fails, compensating transactions undo previous steps.

**Choreography-based Saga** (event-driven):

  Order Service         Payment Service      Inventory Service
       │                      │                     │
  1. Create order             │                     │
       │──order.created──>    │                     │
       │                 2. Charge payment           │
       │                      │──payment.success──> │
       │                      │                3. Reserve stock
       │                      │                     │──stock.reserved──>
       │                      │                     │
  If payment fails:           │                     │
       │<──payment.failed─────┘                     │
  4. Cancel order             │                     │
       │                      │                     │

**Orchestration-based Saga** (central coordinator):

  ┌─────────────────────────────────┐
  │        Saga Orchestrator        │
  │  (Order Saga State Machine)     │
  └──────────┬──────────────────────┘
             │
   Step 1: Create Order ──> Order Service
   Step 2: Charge Payment ──> Payment Service
   Step 3: Reserve Stock ──> Inventory Service
   Step 4: Confirm Order ──> Order Service
             │
   On failure at step 3:
   Compensate 2: Refund Payment ──> Payment Service
   Compensate 1: Cancel Order ──> Order Service

**Choreography vs Orchestration**:

  Aspect        | Choreography      | Orchestration
  ──────────────|───────────────────|──────────────────
  Coupling      | Loose (events)    | Medium (commands)
  Visibility    | Hard to trace     | Central view
  Complexity    | Grows with steps  | Centralized logic
  Best for      | Simple sagas      | Complex workflows
  Single point  | None              | Orchestrator`
        },
        {
          question: 'How do you handle failures in asynchronous systems?',
          answer: `**Retry strategies**:

1. **Immediate retry**: Retry N times with no delay
   - Risk: Overwhelm a struggling service

2. **Exponential backoff**: Wait 1s, 2s, 4s, 8s, ...
   - Gives downstream time to recover
   - Add jitter to avoid thundering herd

3. **Retry with backoff + jitter**:
   delay = min(cap, base * 2^attempt) + random(0, base)

**Dead Letter Queue (DLQ)**:

  Main Queue -> Consumer -> Success!
       │
       │ (after N retries)
       v
  Dead Letter Queue -> Alert -> Manual review
       │
       └── Reprocess after fix

**Poison message handling**:
- Messages that always fail (bad format, invalid data)
- Without DLQ: Block the queue forever
- With DLQ: Move to DLQ after max retries, unblock queue

**Idempotency** (critical for retries):
- Processing the same message twice must produce the same result
- Use idempotency key (message ID, order ID + operation)

  Example:
  Message: { id: "msg-123", action: "charge", amount: 50 }
  First process: Charge $50, record msg-123 as processed
  Retry: See msg-123 already processed, skip (idempotent)

**Circuit breaker for async consumers**:
- If downstream fails repeatedly, stop consuming temporarily
- Prevent wasting resources on guaranteed failures
- Resume after cool-down period

**Monitoring essentials**:
- Queue depth (growing = consumers can't keep up)
- Consumer lag (time between produce and consume)
- DLQ size (growing = systemic issue)
- Processing latency per message`
        },
        {
          question: 'What is backpressure and how do you handle it?',
          answer: `**Backpressure** occurs when a producer generates data faster than consumers can process it.

**Without backpressure handling**:
  Producer (1000 msg/s) -> Queue (growing!) -> Consumer (100 msg/s)
  Queue grows unbounded -> OOM -> crash -> data loss

**Backpressure strategies**:

1. **Buffering** (absorb temporarily):
   - Queue acts as buffer for traffic spikes
   - Works if spikes are temporary
   - Fails if producer is permanently faster

2. **Dropping** (shed load):
   - Drop messages when queue is full
   - Acceptable for metrics, telemetry
   - Use sampling: keep 1 in N messages

3. **Rate limiting** (slow the producer):
   - Reject or throttle producer when queue is full
   - HTTP 429 Too Many Requests
   - Token bucket or leaky bucket

4. **Scaling consumers** (increase capacity):
   - Auto-scale consumer instances based on queue depth
   - Kafka: Add consumers to group (up to partition count)
   - Most sustainable long-term solution

5. **Load shedding with priority**:
   Priority Queue:
   ┌────────────────────────────────┐
   │ High: Payment events     -> Process always │
   │ Medium: Order updates    -> Process if capacity │
   │ Low: Analytics events    -> Drop under pressure │
   └────────────────────────────────┘

**Reactive streams** (built-in backpressure):
- Consumer signals how many items it can handle
- Producer respects the demand signal
- Examples: RxJava, Project Reactor, Akka Streams

**Interview tip**: Always mention backpressure when designing any async system. It shows you think about failure modes and capacity planning.`
        }
      ],

      basicImplementation: {
        title: 'Synchronous Microservices',
        description: 'Services communicate directly via HTTP/gRPC. Simple but tightly coupled -- a failure in any downstream service causes cascading failures.',
        svgTemplate: 'simpleCache',
        problems: [
          'Cascading failures when downstream services are slow or down',
          'Temporal coupling: all services must be available simultaneously',
          'No buffering for traffic spikes',
          'Difficult to add new consumers without modifying producers'
        ]
      },

      advancedImplementation: {
        title: 'Event-Driven Architecture',
        description: 'Services communicate via an event broker (Kafka/SQS). Sync only for user-facing requests; all background processing is async with dead letter queues and saga orchestration.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Sync for user-facing reads and critical writes (login, payment authorization)',
          'Async for everything else (notifications, analytics, downstream processing)',
          'Saga orchestrator for multi-service business transactions',
          'Dead letter queues with alerts for failed message processing',
          'Consumer auto-scaling based on queue depth metrics'
        ]
      },

      discussionPoints: [
        {
          topic: 'Sync vs Async Trade-offs',
          points: [
            'Sync: simpler debugging but creates temporal coupling',
            'Async: resilient to failures but harder to trace end-to-end',
            'Sync: strong consistency is easy; async: eventual consistency',
            'Async enables independent scaling of producers and consumers',
            'Most production systems use both: sync for UX, async for background work'
          ]
        },
        {
          topic: 'Error Handling Patterns',
          points: [
            'Dead letter queues for messages that fail after max retries',
            'Compensating transactions (sagas) for multi-service rollback',
            'Idempotent consumers for safe retries',
            'Circuit breakers to stop cascading async failures',
            'Correlation IDs for tracing across sync and async boundaries'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Always split your design into sync (user-facing) and async (background) paths',
            'Mention the saga pattern when discussing multi-service transactions',
            'Discuss backpressure and what happens when consumers fall behind',
            'Draw the message broker as a central component in your architecture',
            'Compare choreography vs orchestration for complex workflows'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'sync-vs-async-comm',
          title: 'Synchronous vs Asynchronous Communication',
          left: {
            title: 'Synchronous',
            icon: 'lock',
            color: '#3b82f6',
            items: [
              { label: 'Model', value: 'Caller waits for response' },
              { label: 'Coupling', value: 'Tight — both must be available' },
              { label: 'Latency', value: 'Predictable end-to-end' },
              { label: 'Error Handling', value: 'Immediate — caller knows result' },
              { label: 'Examples', value: 'HTTP REST, gRPC, DB queries' },
              { label: 'Best For', value: 'Simple flows, user-facing requests' }
            ]
          },
          right: {
            title: 'Asynchronous',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Model', value: 'Fire and forget / callback later' },
              { label: 'Coupling', value: 'Loose — producer and consumer independent' },
              { label: 'Latency', value: 'Lower for caller, eventual processing' },
              { label: 'Error Handling', value: 'Delayed — need DLQ / retry logic' },
              { label: 'Examples', value: 'Message queues, events, webhooks' },
              { label: 'Best For', value: 'Decoupling, spiky loads, long tasks' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'async-patterns',
          title: 'Asynchronous Communication Patterns',
          color: '#10b981',
          icon: 'zap',
          items: [
            { label: 'Request/Response (sync)', value: 'HTTP, gRPC calls', bar: 40 },
            { label: 'Fire and Forget', value: 'Send message, don\'t wait', bar: 60 },
            { label: 'Pub/Sub', value: 'Broadcast to all subscribers', bar: 80 },
            { label: 'Request/Reply (async)', value: 'Correlation ID + reply queue', bar: 65 },
            { label: 'Event Sourcing', value: 'Append events, rebuild state', bar: 75 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'callback', name: 'Callback / Webhook', icon: 'arrowRight', color: '#3b82f6',
          description: 'Register a URL to be called when async work completes.',
          useWhen: 'Payment processing, external API integrations',
          example: 'Stripe webhook POSTs to your /webhook URL on payment success'
        },
        {
          id: 'polling-vs-push', name: 'Polling vs Push', icon: 'refreshCw', color: '#10b981',
          description: 'Polling: client checks periodically. Push: server notifies client.',
          useWhen: 'Real-time updates needed — push preferred if possible',
          example: 'Long polling for compatibility, SSE/WebSocket for true push'
        }
      ],
      comparisonCards: [
        {
          title: '10 System Design Trade-offs You Cannot Ignore',
          items: [
            { name: 'Vertical vs Horizontal Scaling', description: 'Vertical: add more CPU/RAM to one server (simpler, has limits). Horizontal: add more servers (complex but unlimited scale).' },
            { name: 'SQL vs NoSQL', description: 'SQL: tables with rows/columns, ACID, complex queries. NoSQL: flexible schema, horizontal scale, eventual consistency.' },
            { name: 'Batch vs Stream Processing', description: 'Batch: process accumulated data periodically (higher throughput). Stream: process in real-time as data arrives (lower latency).' },
            { name: 'Normalization vs Denormalization', description: 'Normalized: no redundancy, complex joins. Denormalized: redundant data, faster reads, harder writes.' },
            { name: 'Consistency vs Availability (CAP)', description: 'CP systems reject requests during partition to maintain consistency. AP systems serve stale data to remain available.' },
            { name: 'Strong vs Eventual Consistency', description: 'Strong: every read sees the latest write (slower). Eventual: reads may be stale temporarily but converge (faster).' },
            { name: 'REST vs GraphQL', description: 'REST: multiple endpoints, simple caching. GraphQL: single endpoint, client specifies exact fields needed, prevents over/under-fetching.' },
            { name: 'Stateful vs Stateless', description: 'Stateful: server stores session state (simpler logic, harder to scale). Stateless: each request is independent (easy to scale, requires external state store).' },
            { name: 'Read-Through vs Write-Through Cache', description: 'Read-through: cache loads data on miss. Write-through: writes go to cache and DB simultaneously (consistent but slower writes).' },
            { name: 'Sync vs Async Processing', description: 'Sync: client waits for response (simple, higher latency). Async: client gets immediate ack, result delivered later via callback/queue.' }
          ]
        }
      ]
    },
    {
      id: 'quorum',
      title: 'Quorum Consensus',
      icon: 'users',
      color: '#10b981',
      questions: 8,
      description: 'N/R/W quorum, strong consistency, and read/write path design in distributed databases.',
      concepts: ['Quorum Formula (W + R > N)', 'Read Quorum', 'Write Quorum', 'Sloppy Quorum', 'Hinted Handoff', 'Read Repair', 'Anti-Entropy', 'Tunable Consistency'],
      tips: [
        'The quorum formula W + R > N guarantees that reads and writes overlap on at least one node',
        'Sloppy quorums trade consistency for availability during network partitions',
        'Dynamo-style databases (DynamoDB, Cassandra, Riak) all use quorum-based consistency',
        'Read repair is a lightweight mechanism that fixes stale replicas on read',
        'Always discuss the trade-off: stricter quorum = higher consistency but higher latency',
        'In interviews, draw the N/R/W diagram to show which nodes participate'
      ],

      introduction: `**Quorum consensus** is the mechanism by which distributed databases ensure data consistency across replicas without requiring all nodes to participate in every operation. The core idea is deceptively simple: if you write to enough nodes and read from enough nodes, the read set and write set must overlap, guaranteeing you see the latest write.

The **quorum formula** is **W + R > N**, where N is the total number of replicas, W is the number of nodes that must acknowledge a write, and R is the number of nodes that must respond to a read. By tuning W and R, you can trade off between **consistency**, **latency**, and **availability** -- a knob that Dynamo-style databases expose directly to applications.

In system design interviews, quorum appears whenever you discuss distributed databases, replication, or consistency models. Understanding how to configure N, R, and W for different use cases -- and what happens when nodes fail -- is essential for designing systems that balance correctness with performance.`,

      functionalRequirements: [
        'Write data to W out of N replicas before acknowledging success',
        'Read from R out of N replicas and return the most recent value',
        'Detect and resolve conflicting writes across replicas',
        'Handle temporary node failures without blocking operations',
        'Support tunable consistency per operation',
        'Repair stale replicas in the background'
      ],

      nonFunctionalRequirements: [
        'Write latency: Wait for W fastest replicas (not all N)',
        'Read latency: Wait for R fastest replicas',
        'Availability: Tolerate up to N-W node failures for writes, N-R for reads',
        'Consistency: Strong when W+R > N, eventual when W+R <= N',
        'Durability: Data safe as long as at least one replica survives',
        'Convergence: All replicas eventually hold the same value'
      ],

      dataModel: {
        description: 'Quorum configuration and replica coordination',
        schema: `Quorum Configuration (N=3):

  Strong consistency: W=2, R=2 (W+R=4 > 3)
  Read-optimized:    W=3, R=1 (W+R=4 > 3)
  Write-optimized:   W=1, R=3 (W+R=4 > 3)
  Eventual:          W=1, R=1 (W+R=2 <= 3)

  Write path (W=2, N=3):

  Client
    │ write(key="user:1", value="Alice")
    v
  Coordinator
    ├──> Replica 1 ── ACK ✓
    ├──> Replica 2 ── ACK ✓  (W=2 met, respond to client)
    └──> Replica 3 ── ACK (arrives later, async)

  Read path (R=2, N=3):

  Client
    │ read(key="user:1")
    v
  Coordinator
    ├──> Replica 1 ── "Alice" (v2) ✓
    ├──> Replica 2 ── "Alice" (v2) ✓  (R=2 met)
    └──> Replica 3 ── "Bob" (v1) -- stale!
                       └── trigger read repair

  Why W+R > N guarantees consistency:
  N=3 replicas: {R1, R2, R3}
  W=2 wrote to: {R1, R2}
  R=2 reads from: {R2, R3}  (at minimum)
  Overlap: R2 has the latest write
  -> Read will see the latest value`
      },

      apiDesign: {
        description: 'Quorum-based read/write operations',
        endpoints: [
          { method: 'WRITE', path: 'db.put(key, value, consistency=QUORUM)', params: 'key, value, consistency level', response: 'Success when W replicas ACK' },
          { method: 'READ', path: 'db.get(key, consistency=QUORUM)', params: 'key, consistency level', response: 'Latest value from R replicas' },
          { method: 'WRITE', path: 'db.put(key, value, consistency=ONE)', params: 'key, value', response: 'Success after 1 replica ACK (fast, eventual)' },
          { method: 'READ', path: 'db.get(key, consistency=ALL)', params: 'key', response: 'Value from all N replicas (strongest, slowest)' },
          { method: 'REPAIR', path: 'db.readRepair(key, staleReplicas)', params: 'key, replica list', response: 'Stale replicas updated to latest version' }
        ]
      },

      keyQuestions: [
        {
          question: 'Explain the quorum formula W + R > N and why it guarantees consistency.',
          answer: `**The formula**: For N replicas, write to W and read from R. If W + R > N, every read overlaps with the most recent write on at least one node.

**Proof by example (N=3)**:

  Write W=2: data written to nodes {A, B}
  Read  R=2: data read from any 2 of {A, B, C}

  Possible read sets: {A,B}, {A,C}, {B,C}
  Every set contains at least one node from the write set
  -> Reader always sees the latest value

**Visual representation**:

  N = 5 replicas: [R1] [R2] [R3] [R4] [R5]

  W = 3 writes:   [R1] [R2] [R3]
  R = 3 reads:               [R3] [R4] [R5]
                              ^^^ overlap!

  W + R = 6 > 5 = N  -> at least one overlap guaranteed

**Common configurations (N=3)**:

  Config      W  R  Behavior
  ──────────  ── ── ────────────────────────────────
  QUORUM      2  2  Strong consistency, balanced
  ONE/ONE     1  1  Eventual consistency, fastest
  ALL/ONE     3  1  Read-optimized, writes are slow
  ONE/ALL     1  3  Write-optimized, reads are slow
  ALL/ALL     3  3  Strongest, slowest, least available

**Latency impact**:
- Quorum wait time = time for the W-th (or R-th) fastest replica
- Not the slowest replica! This is key for tail latency
- Example: 3 replicas respond in 2ms, 3ms, 50ms
  - W=2: latency = 3ms (wait for 2nd fastest)
  - W=3: latency = 50ms (wait for slowest)`
        },
        {
          question: 'What is a sloppy quorum and when is it used?',
          answer: `**Strict quorum**: Write must go to W of the N designated replicas for a key. If fewer than W are available, the write fails.

**Sloppy quorum**: If designated replicas are unreachable, write to W of ANY available nodes (including non-designated ones). Store a "hint" to forward data when the original replica recovers.

**Example (N=3, W=2 for key "user:1")**:

  Designated replicas: {A, B, C}

  Strict quorum (A is down):
  Client -> B (ACK) ✓
         -> C (ACK) ✓
         -> A (down) ✗
  W=2 met from designated set -> success

  Strict quorum (A and B are down):
  Client -> C (ACK) ✓
         -> A (down) ✗
         -> B (down) ✗
  W=2 NOT met -> WRITE FAILS

  Sloppy quorum (A and B are down):
  Client -> C (ACK) ✓
         -> D (ACK, with hint for A) ✓  <- not a designated replica
  W=2 met (sloppy) -> success

  When A recovers:
  D sends hinted data to A -> A is now up-to-date
  This is called "hinted handoff"

**Trade-off**:
- Strict quorum: Consistent but may reject writes during failures
- Sloppy quorum: Always available but may return stale data

  Strict: Consistency > Availability (CP behavior)
  Sloppy: Availability > Consistency (AP behavior)

**Where used**:
- Amazon DynamoDB: Sloppy quorum by default
- Riak: Configurable sloppy quorum
- Cassandra: Strict quorum by default (QUORUM consistency)

**Interview tip**: Sloppy quorum is a key part of the Dynamo paper. Mention it when discussing how to maintain availability during network partitions.`
        },
        {
          question: 'How do read repair and anti-entropy keep replicas consistent?',
          answer: `**Read repair** (on-read, lazy):
When a read detects stale data on some replicas, it updates them immediately.

  Client reads key "user:1" with R=3:

  Coordinator
    ├──> Replica A: "Alice" (v3) ✓ latest
    ├──> Replica B: "Alice" (v3) ✓ latest
    └──> Replica C: "Bob"   (v1) ✗ stale!

  Steps:
  1. Return "Alice" (v3) to client (latest wins)
  2. Send "Alice" (v3) to Replica C in background
  3. C updates its copy -> all replicas consistent

  Pros: No extra background work, fixes on-demand
  Cons: Only fixes keys that are read; rarely-read keys stay stale

**Anti-entropy** (background, proactive):
Background process compares all replicas and fixes divergence.

  Uses Merkle trees for efficient comparison:

  Replica A                Replica B
  ┌───────────┐           ┌───────────┐
  │  Root: h1  │ ≠ ≠ ≠ ≠ │  Root: h2  │  <- roots differ!
  ├─────┬─────┤           ├─────┬─────┤
  │ L:a │ R:b │           │ L:a │ R:c │  <- right subtree differs
  ├──┬──┤     │           ├──┬──┤     │
  │k1│k2│ k3  │           │k1│k2│ k3' │  <- k3 is stale on B
  └──┴──┘     │           └──┴──┘     │
              └───────────────────────┘

  Only exchange data for differing subtrees (k3)
  Not the entire dataset -> O(log N) comparison

  Pros: Fixes all keys, even rarely-read ones
  Cons: Background resource usage, eventual (not immediate)

**Hinted handoff** (during failures):
- When a replica is down, another node stores the write temporarily
- When the replica recovers, the hint is forwarded
- Faster recovery than waiting for anti-entropy

**In practice, use all three together**:
1. Hinted handoff: Fast recovery from short outages
2. Read repair: Fix stale data on popular keys
3. Anti-entropy: Catch everything else in background scans`
        },
        {
          question: 'How do you handle conflicting writes in a quorum-based system?',
          answer: `**Conflict scenario**:
Two clients write different values to the same key concurrently:

  Client 1: write("user:1", "Alice")  -> Replicas {A, B}
  Client 2: write("user:1", "Bob")    -> Replicas {B, C}
  (concurrent, neither sees the other)

  Replica A: "Alice"
  Replica B: "Alice" then "Bob" (or "Bob" then "Alice"?)
  Replica C: "Bob"

**Resolution strategies**:

1. **Last-Write-Wins (LWW)**:
   - Attach timestamp to each write
   - Latest timestamp wins, discard the other
   - Simple but can lose data

   write("user:1", "Alice", t=100)
   write("user:1", "Bob",   t=101)
   -> "Bob" wins, "Alice" is silently lost

2. **Vector clocks** (detect conflicts):
   - Each replica maintains a version vector
   - Concurrent writes detected (neither dominates)
   - Application resolves the conflict

   Replica A: {A:1} -> "Alice"
   Replica B: {B:1} -> "Bob"
   Neither {A:1} nor {B:1} dominates -> CONFLICT
   Return both to client for resolution

3. **CRDTs** (Conflict-free Replicated Data Types):
   - Data structures designed to merge automatically
   - G-Counter, PN-Counter, OR-Set, LWW-Register
   - No conflicts by design, but limited data types

4. **Application-level merge**:
   - Return all conflicting versions (siblings)
   - Application merges (e.g., union of shopping cart items)
   - Used by Riak and DynamoDB

**What real databases use**:
- Cassandra: LWW (timestamp-based)
- DynamoDB: LWW by default, vector clocks optional
- Riak: Vector clocks + application merge
- CockroachDB: Serializable transactions (avoids conflicts entirely)`
        },
        {
          question: 'What are the failure modes of quorum-based systems?',
          answer: `**Failure 1: Network partition splits replicas**

  N=3 replicas: [A, B] | [C]
                         ^ partition

  Write with W=2:
  - If client reaches A and B: success (W=2 met)
  - If client reaches only C: fails (can't reach W=2)
  - Sloppy quorum: Write to C + another node (available but inconsistent)

**Failure 2: Stale reads during replica lag**

  Write W=1 (fast write), Read R=1 (fast read):
  W + R = 2 <= 3 = N -> NO overlap guarantee

  Client 1 writes to Replica A
  Client 2 reads from Replica C (stale!)

  Fix: Use W=2, R=2 for operations requiring consistency

**Failure 3: Write conflict (simultaneous writes)**

  Two clients write to the same key:
  Client 1 -> {A, B}: value = "v1"
  Client 2 -> {B, C}: value = "v2"
  Replica B receives both -> conflict!

  Fix: Vector clocks, LWW, or CRDTs

**Failure 4: Hinted handoff data loss**

  Node D holds a hint for node A (which is down)
  If D also fails before A recovers -> hint is lost
  Original write only reached W-1 surviving replicas

  Fix: Persistent hints, anti-entropy as fallback

**Failure 5: Clock skew with LWW**

  Node A clock: 12:00:01 -> write "Alice"
  Node B clock: 12:00:05 -> write "Bob" (4 seconds ahead)
  LWW picks "Bob" even if "Alice" was written later in real time

  Fix: Use logical clocks (Lamport/vector), not wall clocks
       Or use NTP with bounded skew tolerance

**Monitoring checklist**:
- Replication lag between replicas
- Hinted handoff queue depth
- Read repair rate (stale reads per second)
- Anti-entropy scan completion time
- Clock skew across nodes`
        }
      ],

      basicImplementation: {
        title: 'Simple Quorum (N=3, W=2, R=2)',
        description: 'Three replicas with strict quorum for reads and writes. Provides strong consistency but fails writes if more than one replica is down.',
        svgTemplate: 'simpleCache',
        problems: [
          'Writes fail if fewer than W replicas are available',
          'No mechanism for handling temporary failures gracefully',
          'Stale replicas are only fixed on read (no anti-entropy)',
          'Conflict resolution is undefined'
        ]
      },

      advancedImplementation: {
        title: 'Dynamo-Style Quorum System',
        description: 'Tunable quorum with sloppy quorum support, hinted handoff, read repair, Merkle tree anti-entropy, and vector clock conflict detection.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Tunable N/R/W per operation for flexible consistency-latency trade-off',
          'Sloppy quorum with hinted handoff for availability during partitions',
          'Read repair fixes stale data on popular keys',
          'Merkle tree anti-entropy catches all divergence in background',
          'Vector clocks or CRDTs for conflict detection and resolution'
        ]
      },

      discussionPoints: [
        {
          topic: 'Tuning Quorum Parameters',
          points: [
            'N=3, W=2, R=2 is the most common balanced configuration',
            'W=ALL gives strongest durability but highest write latency',
            'R=1 is fast for reads but may return stale data',
            'Cassandra allows per-query consistency levels',
            'Start strict (QUORUM) and relax only where needed'
          ]
        },
        {
          topic: 'Quorum Limitations',
          points: [
            'Quorum alone does not prevent stale reads during replication lag',
            'Concurrent writes require additional conflict resolution (LWW, vector clocks)',
            'Sloppy quorum does not guarantee W+R>N overlap',
            'Clock skew can cause LWW to pick the wrong winner',
            'Quorum is not linearizable without additional protocols (Paxos/Raft)'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Draw the N/R/W diagram showing which replicas participate',
            'Explain why W+R>N guarantees overlap with a concrete example',
            'Mention sloppy quorum and hinted handoff for availability',
            'Discuss read repair and anti-entropy as consistency mechanisms',
            'Connect quorum to real databases: Cassandra, DynamoDB, Riak'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'quorum-configs',
          title: 'Quorum Configurations',
          left: {
            title: 'Strong Consistency (W+R>N)',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Config', value: 'N=3, W=2, R=2 (2+2>3)' },
              { label: 'Guarantee', value: 'Read always sees latest write' },
              { label: 'Write Latency', value: 'Higher — waits for W nodes' },
              { label: 'Read Latency', value: 'Higher — reads from R nodes' },
              { label: 'Availability', value: 'Tolerates (N-W) write failures' },
              { label: 'Use When', value: 'Banking, inventory, leader election' }
            ]
          },
          right: {
            title: 'Eventual Consistency (W+R<=N)',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Config', value: 'N=3, W=1, R=1 (1+1<3)' },
              { label: 'Guarantee', value: 'May read stale data' },
              { label: 'Write Latency', value: 'Low — only 1 node needed' },
              { label: 'Read Latency', value: 'Low — only 1 node needed' },
              { label: 'Availability', value: 'Very high — any node works' },
              { label: 'Use When', value: 'Social feeds, caching, analytics' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'quorum-formula',
          title: 'Quorum Formula Quick Reference (N=5)',
          color: '#8b5cf6',
          icon: 'hash',
          items: [
            { label: 'Strong: W=3, R=3', value: '3+3=6 > 5 ✓', bar: 90 },
            { label: 'Read-heavy: W=5, R=1', value: '5+1=6 > 5 ✓', bar: 70 },
            { label: 'Write-heavy: W=1, R=5', value: '1+5=6 > 5 ✓', bar: 70 },
            { label: 'Balanced: W=3, R=2', value: '3+2=5 = 5 ✗', bar: 30 },
            { label: 'Weak: W=1, R=1', value: '1+1=2 < 5 ✗', bar: 15 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'sloppy-quorum', name: 'Sloppy Quorum', icon: 'layers', color: '#f59e0b',
          description: 'During network issues, accept writes on any N reachable nodes.',
          useWhen: 'Prioritize write availability over strict consistency',
          example: 'DynamoDB hinted handoff — store on available node, transfer later'
        },
        {
          id: 'read-repair', name: 'Read Repair', icon: 'refreshCw', color: '#10b981',
          description: 'On read, detect stale replicas and update them.',
          useWhen: 'Quorum reads detect inconsistency',
          example: 'Cassandra reads from R=3, finds one stale → sends correction'
        }
      ],
      comparisonCards: [
        {
          title: 'Quorum Consensus',
          items: [
            { name: 'Write Quorum (W)', description: 'Minimum number of nodes that must acknowledge a write for it to be considered successful. Higher W = stronger write consistency but higher write latency.' },
            { name: 'Read Quorum (R)', description: 'Minimum number of nodes that must respond to a read. Higher R = more likely to get latest data but higher read latency.' },
            { name: 'The Quorum Formula: W + R > N', description: 'When write quorum + read quorum exceeds total nodes, at least one node in every read has the latest write. This guarantees strong consistency.' },
            { name: 'W=1, R=N (Fast writes)', description: 'Write to any single node. Read from all nodes. Optimized for write-heavy workloads. Reads are slow but consistent.' },
            { name: 'W=N, R=1 (Fast reads)', description: 'Write to all nodes. Read from any single node. Optimized for read-heavy workloads. Writes are slow but reads always get latest data.' },
            { name: 'W=N/2+1, R=N/2+1 (Balanced)', description: 'Majority quorum for both reads and writes. Good balance. Most common configuration. Used by: Cassandra, DynamoDB.' }
          ]
        }
      ],
      staticDiagrams: [
        {
          id: 'quorum-formula',
          title: 'Quorum Consensus',
          description: 'W + R > N formula with Fast Writes, Balanced, and Fast Reads configurations',
          src: '/diagrams/quorum/quorum-formula.svg',
          type: 'architecture'
        }
      ]
    },
    {
      id: 'leader-follower',
      title: 'Leader-Follower Replication',
      icon: 'award',
      color: '#ef4444',
      questions: 8,
      description: 'Leader election, replication strategies, failover mechanisms, and consensus protocols.',
      concepts: ['Single-Leader Replication', 'Multi-Leader Replication', 'Leader Election (Raft/Paxos)', 'Synchronous vs Asynchronous Replication', 'Failover & Fencing', 'Split-Brain Problem', 'Replication Lag', 'Consensus Protocols'],
      tips: [
        'Leader-follower is the default replication model for most relational databases',
        'The split-brain problem is the most dangerous failure mode -- always discuss fencing',
        'Synchronous replication guarantees consistency but increases write latency',
        'Raft is the go-to consensus protocol in interviews -- simpler to explain than Paxos',
        'Replication lag in async setups causes stale reads -- discuss read-your-writes consistency',
        'Multi-leader replication is needed for multi-datacenter deployments'
      ],

      introduction: `**Leader-follower replication** (also called primary-replica or master-slave) is the most widely used data replication strategy. A single **leader** node accepts all writes and propagates changes to one or more **follower** nodes that serve reads. This architecture is the backbone of PostgreSQL, MySQL, MongoDB, and Redis replication.

The critical challenge is **what happens when the leader fails**. **Leader election** protocols like **Raft** and **Paxos** automate the process of choosing a new leader, but getting this right is notoriously difficult. Problems like **split-brain** (two nodes both believe they are the leader) can cause data corruption. The choice between **synchronous** and **asynchronous** replication determines whether followers are guaranteed to have the latest data or may lag behind.

In system design interviews, leader-follower replication appears in every database discussion, and understanding **failover mechanisms**, **replication lag**, and **consensus protocols** is essential. Interviewers often ask candidates to design a system that can survive leader failure without data loss -- which requires deep understanding of these concepts.`,

      functionalRequirements: [
        'All writes go through a single designated leader node',
        'Followers replicate the leader write log in order',
        'Detect leader failure and elect a new leader automatically',
        'Prevent split-brain (two leaders accepting writes simultaneously)',
        'Support read scaling by distributing reads across followers',
        'Handle network partitions without data corruption'
      ],

      nonFunctionalRequirements: [
        'Failover time: < 30 seconds for automatic leader election',
        'Replication lag: < 1 second for sync, seconds to minutes for async',
        'Write availability: 99.99% with automatic failover',
        'Read scaling: Linear read throughput with follower count',
        'Data loss on failover: Zero with sync replication, bounded with async',
        'Consistency: Strong from leader, eventual from followers'
      ],

      dataModel: {
        description: 'Leader-follower replication architecture',
        schema: `Single-Leader Architecture:

  All Writes                Read Queries
     │                      distributed
     v                      across all
  ┌────────┐   replication  ┌──────────┐
  │ LEADER │──────────────>│ FOLLOWER1│
  │ (R/W)  │──────┐        └──────────┘
  └────────┘      │        ┌──────────┐
                  └──────>│ FOLLOWER2│
                           └──────────┘

  Replication Log (WAL / Binlog):
  ┌─────┬─────┬─────┬─────┬─────┐
  │ LSN │ LSN │ LSN │ LSN │ LSN │
  │  1  │  2  │  3  │  4  │  5  │
  └─────┴─────┴─────┴─────┴─────┘
    ▲                         ▲
    │                         │
  Follower 2              Leader
  (position)              (latest)
    Replication lag = LSN 5 - LSN 1 = 4

  Sync vs Async Replication:

  Synchronous:
  Client -> Leader -> Follower ACK -> Client ACK
  (slow, consistent: follower guaranteed up-to-date)

  Asynchronous:
  Client -> Leader -> Client ACK
                └──> Follower (eventually)
  (fast, eventual: follower may lag behind)

  Semi-synchronous (PostgreSQL):
  Client -> Leader -> 1 follower ACK -> Client ACK
                 └──> other followers (async)
  (compromise: one follower guaranteed current)`
      },

      apiDesign: {
        description: 'Replication and failover operations',
        endpoints: [
          { method: 'WRITE', path: 'leader.execute(INSERT/UPDATE/DELETE)', params: 'SQL statement', response: 'Written to WAL, replicated to followers' },
          { method: 'READ', path: 'follower.execute(SELECT)', params: 'SQL query', response: 'May return slightly stale data (async)' },
          { method: 'PROMOTE', path: 'cluster.promote(follower_id)', params: 'follower to promote', response: 'Follower becomes new leader' },
          { method: 'STATUS', path: 'cluster.replicationStatus()', params: '-', response: 'Lag per follower, sync state' },
          { method: 'FENCE', path: 'cluster.fenceOldLeader(node_id)', params: 'old leader', response: 'Old leader blocked from accepting writes' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does failover work, and what are the risks?',
          answer: `**Failover steps**:

1. **Detect failure**: Followers or monitoring detect leader is unresponsive
   - Heartbeat timeout (typically 5-30 seconds)
   - Consensus-based detection (majority agree leader is dead)

2. **Elect new leader**: Choose the follower with the most up-to-date data
   - Raft/Paxos: Formal election protocol
   - Manual: Operator promotes a specific follower
   - Sentinel (Redis): Monitoring nodes vote on promotion

3. **Fence old leader**: Ensure the old leader cannot accept writes
   - STONITH: "Shoot The Other Node In The Head" (power off)
   - Lease-based: Leader holds a time-limited lease; expired = no writes
   - Network fencing: Block old leader's network access

4. **Reconfigure clients**: Direct writes to the new leader
   - DNS update: Change leader DNS record
   - Proxy/load balancer: Redirect traffic
   - Client discovery: Clients query sentinel/ZooKeeper for current leader

**Failover timeline**:

  Time 0s:  Leader crashes
  Time 5s:  Heartbeat timeout detected
  Time 8s:  Election begins (Raft: ~150-300ms)
  Time 9s:  New leader elected, old leader fenced
  Time 10s: Clients redirected to new leader
  Total: ~10 seconds of unavailability

**Risks**:
- **Data loss**: Async followers may not have latest writes
- **Split-brain**: Old leader comes back and both accept writes
- **False positive**: Leader is slow but alive; premature election causes confusion
- **Stale reads**: Clients reading from followers don't know leader changed`
        },
        {
          question: 'Explain the split-brain problem and how to prevent it.',
          answer: `**Split-brain**: Two nodes both believe they are the leader and accept writes. This causes irreconcilable data divergence.

**How it happens**:

  Network partition:
  ┌─────────────────┐  PARTITION  ┌─────────────────┐
  │ Leader (original)│ ////////// │ Follower -> NEW  │
  │ accepts writes!  │            │ Leader (elected) │
  │                  │            │ accepts writes!  │
  └─────────────────┘            └─────────────────┘
  Client A writes here            Client B writes here
  -> DATA DIVERGENCE (catastrophic)

**Prevention mechanisms**:

1. **Fencing tokens**:
   - Each leader gets a monotonically increasing token
   - Storage layer rejects writes with old tokens
   - New leader (token=2) writes accepted
   - Old leader (token=1) writes rejected

   Old leader: write(data, fence_token=1) -> REJECTED
   New leader: write(data, fence_token=2) -> ACCEPTED

2. **STONITH (Shoot The Other Node In The Head)**:
   - Physically power off or reboot the old leader
   - Common in database clusters with IPMI/BMC access
   - Brutal but effective

3. **Lease-based leadership**:
   - Leader must renew a lease every N seconds
   - If lease expires, leader stops accepting writes
   - New leader cannot be elected until old lease expires

   Leader: acquire_lease(ttl=10s)
   If leader is partitioned: lease expires in 10s
   Follower: wait 10s, then start election

4. **Quorum-based election (Raft)**:
   - Need majority vote to become leader
   - At most one leader per term (epoch number)
   - Minority partition cannot elect a leader

   3 nodes: need 2 votes to become leader
   Partition: [A] | [B, C]
   A: cannot get 2 votes -> steps down
   B or C: can get 2 votes -> becomes leader

**Interview tip**: Always mention fencing when discussing failover. It shows you understand the most dangerous failure mode.`
        },
        {
          question: 'How does the Raft consensus protocol work?',
          answer: `**Raft** ensures a cluster of nodes agrees on a sequence of operations, even when nodes fail. It is easier to understand than Paxos and is used by etcd, CockroachDB, and TiKV.

**Three roles**: Leader, Follower, Candidate

**Leader election**:

  State transitions:
  Follower --timeout--> Candidate --wins vote--> Leader
  Candidate --loses vote--> Follower
  Leader --discovers higher term--> Follower

  Election process:
  1. Follower times out (no heartbeat from leader)
  2. Becomes Candidate, increments term, votes for self
  3. Requests votes from all other nodes
  4. Wins if receives majority votes
  5. Becomes Leader, sends heartbeats to prevent new elections

  Term 1: [Leader A] heartbeats -> B, C
  Term 2: A crashes, B times out first
          B: "Vote for me in term 2!"
          C: "OK, you have my vote"
          B becomes Leader (2 of 3 votes)

**Log replication**:

  Leader           Follower 1       Follower 2
  ┌─────────┐     ┌─────────┐     ┌─────────┐
  │ set x=1 │ --> │ set x=1 │     │ set x=1 │
  │ set y=2 │ --> │ set y=2 │ --> │ set y=2 │
  │ set z=3 │     │         │     │         │
  └─────────┘     └─────────┘     └─────────┘
  committed       replicated      replicated
  (majority)      (not yet z=3)

  Commit rule: Entry is committed when replicated to majority
  set z=3 committed when 2 of 3 nodes have it

**Safety guarantees**:
- Election safety: At most one leader per term
- Leader append-only: Leader never overwrites its log
- Log matching: If two logs have same index and term, entries are identical
- Leader completeness: A committed entry appears in all future leaders' logs

**Why Raft over Paxos**:
- Raft separates leader election from log replication (easier to understand)
- Raft requires log entries to be consecutive (simpler reasoning)
- Paxos is more general but notoriously difficult to implement correctly`
        },
        {
          question: 'What are the trade-offs between synchronous and asynchronous replication?',
          answer: `**Synchronous replication**:
  Client -> Leader -> Follower ACK -> Client ACK

  Pros:
  - Zero data loss on failover (follower is up-to-date)
  - Strong consistency: reads from follower see latest write
  - Simple to reason about

  Cons:
  - Higher write latency (wait for slowest follower)
  - Lower availability (write blocked if follower is down)
  - Doesn't work well across datacenters (100ms+ network latency)

**Asynchronous replication**:
  Client -> Leader -> Client ACK (follower replicates later)

  Pros:
  - Low write latency (only wait for leader disk flush)
  - Higher availability (write succeeds even if followers are down)
  - Works across datacenters

  Cons:
  - Data loss on failover (un-replicated writes are lost)
  - Stale reads from followers (replication lag)
  - Harder to reason about consistency

**Comparison table**:

  Aspect              | Sync           | Async
  ────────────────────|────────────────|──────────────────
  Write latency       | High           | Low
  Data loss on failover| Zero          | Possible
  Availability        | Lower          | Higher
  Cross-DC support    | Poor           | Good
  Read consistency    | Strong         | Eventual
  Example             | Sync replica PG| MySQL async replica

**Semi-synchronous (practical compromise)**:
  - ONE follower is synchronous (guaranteed up-to-date)
  - Other followers are asynchronous
  - If sync follower falls behind, another follower is promoted to sync
  - Used by PostgreSQL, MySQL semisync

**Chain replication** (alternative):
  Client -> Head -> Middle -> Tail -> Client ACK
  - Writes go through the chain in order
  - Reads served from the tail (always latest)
  - High throughput, strong consistency
  - Used by Azure Storage, HDFS`
        },
        {
          question: 'How does multi-leader replication work, and when would you use it?',
          answer: `**Multi-leader (master-master)**: Multiple nodes accept writes independently, then replicate to each other.

**Architecture**:

  Datacenter 1        Datacenter 2       Datacenter 3
  ┌──────────┐       ┌──────────┐       ┌──────────┐
  │ Leader A │<─────>│ Leader B │<─────>│ Leader C │
  │ R/W      │       │ R/W      │       │ R/W      │
  ├──────────┤       ├──────────┤       ├──────────┤
  │Follower  │       │Follower  │       │Follower  │
  └──────────┘       └──────────┘       └──────────┘
  Local writes        Local writes       Local writes
  (low latency)       (low latency)      (low latency)

**When to use**:
- Multi-datacenter deployment (users write to nearest DC)
- Offline-capable applications (mobile apps, collaborative tools)
- Need write availability during network partitions

**Conflict resolution** (writes to same key in different DCs):
1. LWW (Last Write Wins): Timestamp-based, simple, can lose data
2. Merge function: Application-specific logic (e.g., union sets)
3. CRDTs: Automatic conflict-free merging
4. Custom resolution: Flag conflicts for user resolution

**Real examples**:
- CouchDB / PouchDB: Multi-leader with conflict detection
- Cassandra: All nodes accept writes (leaderless, similar concept)
- MySQL Group Replication: Multi-primary mode
- Google Docs: OT/CRDT for collaborative editing

**Challenges**:
- Write conflicts are unavoidable
- Auto-increment IDs don't work (need UUIDs or DC-prefixed IDs)
- Schema changes must be coordinated across leaders
- Circular replication loops (need to tag and filter)

**Single-leader vs Multi-leader**:

  Aspect            | Single-Leader    | Multi-Leader
  ──────────────────|──────────────────|──────────────────
  Write latency     | High (one DC)    | Low (local DC)
  Write conflicts   | None             | Must resolve
  Consistency       | Strong (easy)    | Eventual
  Availability      | Leader failure   | Any DC can serve
  Complexity        | Low              | High
  Use case          | Single DC        | Multi-DC, offline`
        }
      ],

      basicImplementation: {
        title: 'Single-Leader with Manual Failover',
        description: 'One leader, two followers with async replication. Failover requires manual operator intervention to promote a follower.',
        svgTemplate: 'simpleCache',
        problems: [
          'Manual failover means minutes to hours of downtime',
          'Async replication means potential data loss',
          'No fencing mechanism for old leader',
          'No automatic detection of leader failure'
        ]
      },

      advancedImplementation: {
        title: 'Raft-Based Automated Failover',
        description: 'Raft consensus protocol with automatic leader election, semi-synchronous replication, fencing tokens, and health-checked failover.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Raft-based leader election with sub-second failover',
          'Semi-synchronous replication for zero data loss on promoted follower',
          'Fencing tokens prevent split-brain writes',
          'Read-your-writes consistency via leader forwarding',
          'Automatic follower catch-up with snapshot + WAL streaming'
        ]
      },

      discussionPoints: [
        {
          topic: 'Replication Strategies',
          points: [
            'Statement-based: Replicate SQL statements (simple but non-deterministic)',
            'WAL shipping: Replicate write-ahead log bytes (PostgreSQL, most common)',
            'Row-based: Replicate changed rows (MySQL binlog, most reliable)',
            'Logical: Replicate logical changes (cross-version compatible)',
            'Trigger-based: Custom application-level replication (most flexible)'
          ]
        },
        {
          topic: 'Handling Replication Lag',
          points: [
            'Read-your-writes: Route user reads to leader after their writes',
            'Monotonic reads: Ensure user always reads from same replica',
            'Causal consistency: Track dependencies between operations',
            'Monitor lag and alert when exceeding SLA thresholds',
            'Use semi-synchronous replication for critical data paths'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Draw the leader-follower architecture with replication arrows',
            'Discuss failover as a three-step process: detect, elect, fence',
            'Mention split-brain as the most dangerous failure mode',
            'Compare sync vs async replication with concrete latency numbers',
            'Reference Raft as the consensus protocol and explain term-based voting'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'single-vs-multi-leader',
          title: 'Single-Leader vs Multi-Leader',
          left: {
            title: 'Single-Leader',
            icon: 'server',
            color: '#3b82f6',
            items: [
              { label: 'Writers', value: 'One leader only' },
              { label: 'Conflicts', value: 'None — serial writes' },
              { label: 'Failover', value: 'Promote follower to leader' },
              { label: 'Latency', value: 'Higher for remote writes' },
              { label: 'Complexity', value: 'Simple — clear write path' },
              { label: 'Examples', value: 'PostgreSQL, MySQL, MongoDB' }
            ]
          },
          right: {
            title: 'Multi-Leader',
            icon: 'layers',
            color: '#10b981',
            items: [
              { label: 'Writers', value: 'Multiple leaders accept writes' },
              { label: 'Conflicts', value: 'Must resolve write conflicts' },
              { label: 'Failover', value: 'Other leaders continue serving' },
              { label: 'Latency', value: 'Low — local leader for each region' },
              { label: 'Complexity', value: 'High — conflict resolution needed' },
              { label: 'Examples', value: 'CockroachDB, Google Docs, Git' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'replication-lag',
          title: 'Replication Lag Scenarios',
          color: '#3b82f6',
          icon: 'clock',
          items: [
            { label: 'Same datacenter', value: '< 1ms lag', bar: 10 },
            { label: 'Cross-AZ', value: '1-5ms lag', bar: 25 },
            { label: 'Cross-region', value: '50-200ms lag', bar: 60 },
            { label: 'Under heavy load', value: 'Seconds to minutes', bar: 85 },
            { label: 'Network partition', value: 'Unbounded until resolved', bar: 100 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'leader-election', name: 'Leader Election', icon: 'star', color: '#f59e0b',
          description: 'Algorithms to choose a new leader when current one fails.',
          useWhen: 'Automatic failover, distributed coordination',
          example: 'Raft consensus, ZooKeeper leader election, etcd'
        },
        {
          id: 'read-your-writes', name: 'Read-Your-Writes', icon: 'check', color: '#10b981',
          description: 'Guarantee that a user sees their own recent writes.',
          useWhen: 'User updates profile, then refreshes page',
          example: 'Route user reads to leader, or track write timestamp'
        }
      ],
      comparisonCards: [
        {
          title: 'Leader Election Algorithms',
          items: [
            { name: 'Bully Algorithm', description: 'When leader fails, node with highest ID sends election message. Higher-ID nodes respond. Highest surviving node becomes leader. Simple but generates many messages.' },
            { name: 'Ring Algorithm', description: 'Nodes arranged in logical ring. Election message passes around ring collecting IDs. Node with highest ID in the message becomes leader. Lower message complexity.' },
            { name: 'Raft Consensus', description: 'Leader elected by majority vote with randomized timeouts. Leader sends heartbeats to maintain authority. On leader failure, followers start new election term. Used by etcd, CockroachDB.' },
            { name: 'ZooKeeper (ZAB)', description: 'ZooKeeper Atomic Broadcast protocol. Ephemeral sequential znodes for election. Lowest sequence number is leader. Automatic re-election on leader disconnect.' }
          ]
        },
        {
          title: 'Replication Patterns',
          items: [
            { name: 'Single-Leader (Master-Slave)', description: 'One leader handles all writes, followers replicate and serve reads. Simple but leader is SPOF. Used by: MySQL, PostgreSQL, MongoDB.' },
            { name: 'Multi-Leader', description: 'Multiple nodes accept writes. Requires conflict resolution (last-write-wins, merge). Used by: CouchDB, cross-datacenter replication.' },
            { name: 'Leaderless', description: 'Any node accepts reads/writes. Uses quorum (W + R > N) for consistency. No SPOF. Used by: Cassandra, DynamoDB, Riak.' }
          ]
        }
      ],
      staticDiagrams: [
        {
          id: 'replication-patterns',
          title: 'Replication Patterns',
          description: 'Single-Leader, Multi-Leader, and Leaderless replication with trade-offs',
          src: '/diagrams/leader-follower/replication-patterns.svg',
          type: 'architecture'
        }
      ]
    },
    {
      id: 'heartbeat-mechanism',
      title: 'Heartbeat Mechanism',
      icon: 'activity',
      color: '#ef4444',
      questions: 7,
      description: 'Failure detection, health checks, liveness vs readiness probes, and distributed health monitoring.',
      concepts: ['Heartbeat Protocol', 'Failure Detection', 'Phi Accrual Detector', 'Liveness vs Readiness', 'Gossip Protocol', 'Health Check Patterns', 'Timeout Tuning', 'Cascading Failure Prevention'],
      tips: [
        'A heartbeat is the simplest and most fundamental failure detection mechanism in distributed systems',
        'Distinguish between liveness (is the process alive?) and readiness (can it serve traffic?)',
        'The phi accrual failure detector adapts timeouts based on observed heartbeat patterns',
        'Too-aggressive timeouts cause false positives; too-lenient ones delay failure detection',
        'Gossip-based heartbeats scale to thousands of nodes where centralized monitoring cannot',
        'Always discuss what happens AFTER failure is detected, not just detection itself'
      ],

      introduction: `**Heartbeat mechanisms** are the foundation of failure detection in distributed systems. A heartbeat is a periodic signal sent between nodes to indicate liveness -- if a node stops sending heartbeats, other nodes conclude it has failed and initiate recovery actions like leader election, traffic rerouting, or replica re-creation.

While conceptually simple, getting heartbeats right is surprisingly nuanced. **False positives** (declaring a healthy node dead) waste resources and cause unnecessary failovers. **False negatives** (failing to detect a dead node) leave the system in a degraded state. The timeout value is a critical tuning parameter: too short causes flapping, too long delays recovery. Advanced systems use **adaptive failure detectors** like the **phi accrual detector** that adjust thresholds based on observed network conditions.

In system design interviews, heartbeats appear in the context of load balancers, database clusters, service meshes, and container orchestration (Kubernetes liveness/readiness probes). Understanding the different heartbeat patterns, their failure modes, and how they integrate with the broader system architecture demonstrates practical distributed systems knowledge.`,

      functionalRequirements: [
        'Detect node failures within a bounded time',
        'Distinguish between liveness (process alive) and readiness (can serve requests)',
        'Support both push-based (node sends heartbeats) and pull-based (monitor polls nodes) patterns',
        'Handle network partitions without excessive false positives',
        'Trigger automated recovery actions on failure detection',
        'Scale to thousands of nodes without overwhelming the network'
      ],

      nonFunctionalRequirements: [
        'Detection latency: Failure detected within 5-30 seconds',
        'False positive rate: < 0.1% (avoid unnecessary failovers)',
        'Network overhead: < 1% of total bandwidth for heartbeat traffic',
        'Scalability: Support 10,000+ nodes with gossip-based approaches',
        'Reliability: Heartbeat system itself must not be a single point of failure',
        'Adaptability: Adjust timeouts based on network conditions'
      ],

      dataModel: {
        description: 'Heartbeat patterns and failure detection',
        schema: `Push-Based Heartbeat:

  Node A ──heartbeat──> Monitor
  Node B ──heartbeat──> Monitor
  Node C ──(silence)──> Monitor -> declare C dead after timeout

  Timeline:
  t=0s    t=1s    t=2s    t=3s    t=4s    t=5s
  Node A: [beat]  [beat]  [beat]  [beat]  [beat]  [beat]
  Node B: [beat]  [beat]  [beat]  [beat]  [beat]  [beat]
  Node C: [beat]  [beat]  [----]  [----]  [----]  [DEAD!]
                           ^                       ^
                         crash                 detected
                         (timeout = 3 heartbeat intervals)

Pull-Based Health Check:

  Monitor ──GET /health──> Node A -> 200 OK
  Monitor ──GET /health──> Node B -> 200 OK
  Monitor ──GET /health──> Node C -> timeout -> mark unhealthy

Gossip-Based Heartbeat (decentralized):

  Node A knows: {B: alive@t3, C: alive@t2, D: alive@t3}
  Node A gossips to Node B: "Here's what I know..."
  Node B merges: takes most recent timestamp per node
  If any node's timestamp is too old -> suspect -> dead

  Advantages:
  - No single monitor (no SPOF)
  - O(log N) convergence
  - Used by Cassandra, Consul, Serf

Kubernetes Health Probes:
  livenessProbe:     Is the container alive? (restart if not)
  readinessProbe:    Can it serve traffic? (remove from LB if not)
  startupProbe:      Has it finished starting? (give time to init)`
      },

      apiDesign: {
        description: 'Health check and heartbeat endpoints',
        endpoints: [
          { method: 'GET', path: '/health', params: '-', response: '200 OK if alive, includes uptime and version' },
          { method: 'GET', path: '/health/live', params: '-', response: '200 if process is alive (liveness)' },
          { method: 'GET', path: '/health/ready', params: '-', response: '200 if ready to serve traffic (readiness)' },
          { method: 'POST', path: '/heartbeat', params: '{ node_id, timestamp, load }', response: 'Heartbeat registered at monitor' },
          { method: 'GET', path: '/cluster/status', params: '-', response: 'Status of all nodes (alive/suspect/dead)' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do you choose heartbeat timeout values, and what are the trade-offs?',
          answer: `**The fundamental trade-off**:
- Short timeout: Fast detection, more false positives
- Long timeout: Fewer false positives, slow detection

**Factors affecting timeout choice**:

  Factor              | Impact on Timeout
  ────────────────────|──────────────────────────────
  Network latency     | Higher latency -> longer timeout
  Network jitter      | More jitter -> longer timeout
  Failure cost        | High cost of missed failure -> shorter
  False positive cost | High cost of false alarm -> longer
  Recovery speed      | Fast recovery -> can afford shorter

**Common timeout values**:

  System           | Heartbeat Interval | Timeout
  ─────────────────|────────────────────|──────────
  ZooKeeper        | tickTime (2s)      | 2 * tickTime
  Cassandra        | 1 second           | phi accrual
  Kubernetes       | periodSeconds(10s) | failureThreshold(3) * period
  Redis Sentinel   | 1 second           | down-after-ms (30s)
  Consul           | 200ms gossip       | Server-determined

**Rule of thumb**:
  timeout = heartbeat_interval * N (where N = 3-5)
  With 1-second heartbeats: timeout = 3-5 seconds

**Phi Accrual Failure Detector** (adaptive):
  Instead of a binary alive/dead, compute a "suspicion level" (phi)

  phi = -log10(P(heartbeat_delay >= observed_delay))

  phi < 1: Very likely alive
  phi > 8: Very likely dead (Cassandra default threshold)

  Adapts automatically:
  - Stable network: phi stays low, fewer false positives
  - Unstable network: phi accounts for jitter
  - No manual timeout tuning needed

**Interview tip**: Mention the phi accrual detector to show depth. It is used in Cassandra and Akka and solves the "one-size-fits-all timeout" problem.`
        },
        {
          question: 'What is the difference between liveness and readiness probes?',
          answer: `**Liveness probe**: "Is the process alive and not stuck?"
- Checks if the application is running and responsive
- Failure action: RESTART the container/process
- Detects: Deadlocks, infinite loops, corrupted state

**Readiness probe**: "Can this instance serve traffic?"
- Checks if the application is ready to handle requests
- Failure action: REMOVE from load balancer (don't restart)
- Detects: Initialization in progress, dependency unavailable, overloaded

**Why both are needed**:

  Scenario                      | Liveness | Readiness | Action
  ──────────────────────────────|──────────|───────────|────────────
  App starting up               | Pass     | Fail      | Don't route traffic
  App running normally          | Pass     | Pass      | Route traffic
  App deadlocked                | Fail     | Fail      | Restart
  Database connection lost      | Pass     | Fail      | Stop traffic, don't restart
  App overloaded                | Pass     | Fail      | Stop traffic, let it recover
  App crashed                   | Fail     | Fail      | Restart

**Implementation examples**:

  Liveness check (simple):
  GET /health/live
  -> Check process is responsive
  -> Check no deadlock (watchdog thread)
  -> Return 200 or hang (timeout = failure)

  Readiness check (thorough):
  GET /health/ready
  -> Check database connection pool
  -> Check Redis connection
  -> Check downstream service health
  -> Check queue consumer is running
  -> Return 200 only if ALL checks pass

**Common mistakes**:
- Making liveness probe depend on external services (database down -> restart all pods -> cascade)
- Not implementing readiness (traffic hits unready pods)
- Timeout too short (probe fails during GC pause -> unnecessary restart)
- Not using startup probe (slow-starting apps killed before ready)

**Kubernetes configuration**:

  livenessProbe:
    httpGet: { path: /health/live, port: 8080 }
    initialDelaySeconds: 15
    periodSeconds: 10
    failureThreshold: 3    # 3 failures -> restart

  readinessProbe:
    httpGet: { path: /health/ready, port: 8080 }
    periodSeconds: 5
    failureThreshold: 1    # 1 failure -> remove from LB`
        },
        {
          question: 'How does gossip-based failure detection work at scale?',
          answer: `**Problem with centralized heartbeats**:
- Monitor receives heartbeats from ALL nodes
- N nodes = N heartbeats per interval = bottleneck
- Monitor is a single point of failure

**Gossip protocol solution**:
Each node randomly contacts a few peers to exchange state. Information spreads like a rumor through the cluster.

**SWIM (Scalable Weakly-consistent Infection-style Membership)**:

  Round 1: Node A pings random node B
  ┌───┐  ping   ┌───┐
  │ A │ ──────> │ B │ ── ACK ──> A knows B is alive
  └───┘         └───┘

  If B doesn't respond:
  ┌───┐  ping-req(B)  ┌───┐  ping  ┌───┐
  │ A │ ────────────> │ C │ ─────> │ B │
  └───┘               └───┘        └───┘
                        │
                        └── ACK (or timeout) ──> A

  If B still unreachable via C:
  A marks B as "suspect"
  A gossips "B is suspect" to others
  After timeout, B moves from suspect to dead

**Convergence speed**:
- N nodes, each gossips to k peers per round
- Information reaches all nodes in O(log N) rounds
- 1000 nodes, k=3: ~10 rounds (~10 seconds with 1s intervals)

**State dissemination**:
Each gossip message piggybacks membership state:
{
  "node_id": "A",
  "members": {
    "B": { status: "alive", heartbeat: 1042, timestamp: ... },
    "C": { status: "alive", heartbeat: 1039, timestamp: ... },
    "D": { status: "suspect", heartbeat: 1035, timestamp: ... }
  }
}

Receiving node merges: keep highest heartbeat count per node

**Used in production**:
- Cassandra: Gossip for cluster membership and failure detection
- Consul: Serf library (SWIM-based) for service discovery
- HashiCorp Memberlist: Go library implementing SWIM
- Akka Cluster: Gossip-based cluster membership

**Advantages over centralized**:
- No single point of failure
- Constant per-node bandwidth O(k) regardless of cluster size
- Adapts to network conditions naturally
- No monitor to provision or maintain`
        },
        {
          question: 'How do you prevent cascading failures when heartbeats fail?',
          answer: `**Cascading failure scenario**:

  Node A (overloaded)
    │ heartbeat timeout
    v
  Load Balancer removes A
    │ traffic redistributed to B, C, D
    v
  Nodes B, C, D now overloaded
    │ their heartbeats slow down
    v
  Load Balancer removes B, C, D
    │
    v
  COMPLETE OUTAGE (cascading failure)

**Prevention strategies**:

1. **Gradual traffic shift**:
   - Don't remove a node instantly
   - Reduce its weight in load balancer (e.g., 100% -> 50% -> 0%)
   - Give remaining nodes time to auto-scale

2. **Circuit breaker pattern**:
   - Track failure rate per downstream service
   - When failure rate > threshold: OPEN circuit (stop sending)
   - After cooldown: HALF-OPEN (send a few probes)
   - If probes succeed: CLOSE circuit (resume traffic)

   States:
   CLOSED ──failures exceed threshold──> OPEN
   OPEN ──cooldown timer expires──> HALF-OPEN
   HALF-OPEN ──probes succeed──> CLOSED
   HALF-OPEN ──probes fail──> OPEN

3. **Load shedding**:
   - If node is overloaded, reject excess requests (HTTP 503)
   - Better to serve SOME requests than crash on ALL
   - Priority-based: Shed low-priority work first

4. **Bulkhead pattern**:
   - Isolate resources per downstream service
   - Database pool A can't exhaust Database pool B
   - One failing dependency doesn't affect others

5. **Health check hysteresis**:
   - Require multiple consecutive failures before marking unhealthy
   - Require multiple consecutive successes before marking healthy
   - Prevents flapping on transient issues

   Mark unhealthy: 3 consecutive failures
   Mark healthy:   2 consecutive successes

   Timeline: ✓ ✓ ✗ ✗ ✗ [UNHEALTHY] ✓ ✓ [HEALTHY]

6. **Differentiated health checks**:
   - Shallow check (liveness): Process alive? -> restart if not
   - Deep check (readiness): Dependencies connected? -> remove from LB
   - Don't restart based on deep checks (causes cascading restarts)`
        }
      ],

      basicImplementation: {
        title: 'Centralized Health Monitor',
        description: 'A single monitoring service polls all nodes via HTTP health checks. Simple but has a single point of failure and O(N) network overhead.',
        svgTemplate: 'simpleCache',
        problems: [
          'Monitor is a single point of failure',
          'O(N) health checks per interval from one machine',
          'Network partition between monitor and nodes causes mass false positives',
          'No distinction between liveness and readiness'
        ]
      },

      advancedImplementation: {
        title: 'Gossip-Based Failure Detection',
        description: 'SWIM-style gossip protocol with phi accrual failure detection, separate liveness/readiness probes, circuit breakers, and graceful degradation.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Gossip protocol for decentralized, scalable failure detection',
          'Phi accrual detector adapts timeout to network conditions',
          'Separate liveness and readiness probes for correct failure response',
          'Circuit breakers prevent cascading failures',
          'Hysteresis prevents flapping on transient network issues'
        ]
      },

      discussionPoints: [
        {
          topic: 'Heartbeat Design Decisions',
          points: [
            'Push vs pull: Push scales better; pull gives monitor more control',
            'Centralized vs gossip: Centralized is simple; gossip scales to thousands',
            'Frequency: Balance between detection speed and network overhead',
            'Payload: Lightweight (just alive) vs rich (load metrics, version info)',
            'Transport: TCP (reliable) vs UDP (lightweight, for gossip)'
          ]
        },
        {
          topic: 'Common Failure Modes',
          points: [
            'GC pause causes heartbeat timeout -> false positive -> unnecessary restart',
            'Network partition between zones -> mass false positive -> cascading failure',
            'Slow dependency makes readiness fail -> all pods removed -> outage',
            'Heartbeat system itself crashes -> no failure detection at all',
            'Clock skew causes incorrect timeout calculations'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Always distinguish between liveness and readiness when discussing health checks',
            'Mention the phi accrual detector as an advanced alternative to fixed timeouts',
            'Discuss what happens AFTER failure detection (failover, traffic shift, alerts)',
            'Draw the gossip protocol flow for systems with many nodes',
            'Connect heartbeats to Kubernetes probes for modern relevance'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'push-vs-pull-heartbeat',
          title: 'Push vs Pull Heartbeat',
          left: {
            title: 'Push (Active)',
            icon: 'arrowRight',
            color: '#10b981',
            items: [
              { label: 'How', value: 'Node sends periodic "I\'m alive" messages' },
              { label: 'Detection', value: 'Timeout = node is dead' },
              { label: 'Traffic', value: 'Constant heartbeat traffic' },
              { label: 'Complexity', value: 'Simple — just send + timeout' },
              { label: 'Delay', value: 'Up to timeout interval' },
              { label: 'Examples', value: 'Kubernetes liveness probes, ZooKeeper' }
            ]
          },
          right: {
            title: 'Pull (Polling)',
            icon: 'arrowLeft',
            color: '#3b82f6',
            items: [
              { label: 'How', value: 'Monitor periodically pings nodes' },
              { label: 'Detection', value: 'No response = potentially dead' },
              { label: 'Traffic', value: 'Centralized polling traffic' },
              { label: 'Complexity', value: 'Need central monitor (SPOF risk)' },
              { label: 'Delay', value: 'Up to polling interval' },
              { label: 'Examples', value: 'Nagios, load balancer health checks' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'heartbeat-config',
          title: 'Heartbeat Configuration Guide',
          color: '#10b981',
          icon: 'heart',
          items: [
            { label: 'Interval: 1-5 seconds', value: 'Fast detection, more traffic', bar: 80 },
            { label: 'Interval: 10-30 seconds', value: 'Balanced approach', bar: 55 },
            { label: 'Timeout: 3× interval', value: 'Standard threshold', bar: 70 },
            { label: 'Retries: 2-3 before dead', value: 'Avoid false positives', bar: 65 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'phi-accrual', name: 'Phi Accrual Detector', icon: 'barChart', color: '#8b5cf6',
          description: 'Adaptive failure detection — adjusts based on observed heartbeat intervals.',
          useWhen: 'Networks with variable latency',
          example: 'Cassandra uses phi accrual with threshold φ=8'
        },
        {
          id: 'gossip-protocol', name: 'Gossip Protocol', icon: 'globe', color: '#10b981',
          description: 'Nodes share health info with random peers — epidemic spread.',
          useWhen: 'Large clusters where centralized monitoring doesn\'t scale',
          example: 'Cassandra gossip: each node tells 3 random peers every second'
        }
      ],
      comparisonCards: [
        {
          title: 'Node Failure Detection Methods',
          items: [
            { name: 'Heartbeat (Push)', description: 'Each node periodically sends "I am alive" signal to a monitor. If no heartbeat received within timeout, node is marked dead. Simple and widely used.' },
            { name: 'Ping/Echo (Pull)', description: 'Monitor periodically pings each node and expects a response. If no response after retries, node is marked failed. More control but adds network traffic.' },
            { name: 'Gossip Protocol', description: 'Nodes randomly share health information with peers. Each node maintains a membership list with heartbeat counters. Decentralized \u2014 no single point of failure.' },
            { name: 'Phi Accrual Detector', description: 'Instead of binary alive/dead, calculates a suspicion level (phi) based on heartbeat arrival times. Adapts to network conditions. Used by Cassandra and Akka.' }
          ]
        }
      ],
      staticDiagrams: [
        {
          id: 'failure-detection',
          title: 'Failure Detection Methods',
          description: 'Heartbeat, Ping/Echo, Gossip Protocol, and Phi Accrual detection strategies',
          src: '/diagrams/heartbeat-mechanism/failure-detection.svg',
          type: 'architecture'
        }
      ]
    },
    {
      id: 'checksum',
      title: 'Checksums & Data Integrity',
      icon: 'checkCircle',
      color: '#ef4444',
      questions: 7,
      description: 'Data integrity verification, ETags, content-addressable storage, and corruption detection.',
      concepts: ['CRC32 / MD5 / SHA-256', 'Content-Addressable Storage', 'ETags & HTTP Caching', 'Merkle Trees', 'Bit Rot & Silent Corruption', 'End-to-End Integrity', 'HMAC for Tamper Detection', 'Data Scrubbing'],
      tips: [
        'Checksums detect corruption; cryptographic hashes detect tampering',
        'ETags are essentially checksums used for HTTP conditional requests and caching',
        'Content-addressable storage (Git, IPFS, Docker) uses hashes as addresses',
        'Always verify checksums at every layer boundary (network, storage, application)',
        'Merkle trees enable efficient comparison of large datasets across replicas',
        'Bit rot is real: disks silently corrupt data over time, checksums are the defense'
      ],

      introduction: `**Checksums** and **cryptographic hashes** are the fundamental mechanisms for ensuring data integrity in distributed systems. Every time data moves across a network, is written to disk, or is stored in a cache, there is a chance of corruption. Checksums detect these errors by computing a fingerprint of the data and verifying it later.

The spectrum ranges from fast, non-cryptographic checksums like **CRC32** (used in disk and network protocols) to cryptographic hashes like **SHA-256** (used in Git, blockchain, and content-addressable storage). In between, **MD5** and **SHA-1** serve as content fingerprints for caching via **ETags** and deduplication. **Merkle trees** extend checksums to enable efficient integrity verification of large datasets, as used in DynamoDB anti-entropy, Git, and BitTorrent.

In system design interviews, checksums appear in data storage (detecting corruption), caching (ETags for conditional requests), replication (Merkle trees for consistency), and security (HMAC for tamper detection). Understanding when to use which type of checksum -- and how to implement end-to-end integrity -- is a mark of engineering maturity.`,

      functionalRequirements: [
        'Detect data corruption during storage and transmission',
        'Enable conditional HTTP requests with ETags',
        'Support content-addressable storage for deduplication',
        'Verify replica consistency using Merkle trees',
        'Detect tampering with HMAC signatures',
        'Run background data scrubbing to find silent corruption'
      ],

      nonFunctionalRequirements: [
        'Checksum computation: < 1ms per MB for CRC32, < 10ms for SHA-256',
        'False negative rate: Effectively zero (collision probability negligible)',
        'Storage overhead: 4 bytes (CRC32) to 32 bytes (SHA-256) per block',
        'Scrubbing: Complete scan of all data within 2 weeks',
        'Performance: Checksumming should not reduce throughput by more than 5%',
        'Coverage: Every byte of data protected by at least one checksum layer'
      ],

      dataModel: {
        description: 'Checksum types and their applications',
        schema: `Checksum Hierarchy:

  Algorithm    | Size      | Speed    | Use Case
  ─────────────|───────────|──────────|────────────────────
  CRC32        | 4 bytes   | Fastest  | Disk blocks, network frames
  xxHash       | 8 bytes   | Very fast| Hash tables, dedup
  MD5          | 16 bytes  | Fast     | ETags, file integrity
  SHA-1        | 20 bytes  | Medium   | Git, legacy systems
  SHA-256      | 32 bytes  | Slower   | Security, blockchain
  HMAC-SHA256  | 32 bytes  | Slower   | Tamper detection

Content-Addressable Storage:
  file -> SHA-256(content) -> address
  "hello world" -> a7ffc6f8bf1ed766...

  Git object model:
  blob:   sha1(content) -> stored as objects/{sha1}
  tree:   sha1(entries) -> directory listing
  commit: sha1(tree + parent + message) -> commit history

  Docker layers:
  layer: sha256(tar contents) -> docker.io/library/nginx@sha256:abc123

Merkle Tree (used for replica comparison):

       Root Hash: h(h12 + h34)
          /              \\
    h12 = h(h1+h2)    h34 = h(h3+h4)
      /      \\          /       \\
   h1=h(D1) h2=h(D2) h3=h(D3) h4=h(D4)
     |        |        |        |
    Data1   Data2    Data3    Data4

  Compare two replicas:
  1. Compare root hashes (if equal, all data matches)
  2. If different, compare child hashes
  3. Descend to find differing leaves
  -> O(log N) comparisons to find differences`
      },

      apiDesign: {
        description: 'Checksum and integrity verification operations',
        endpoints: [
          { method: 'GET', path: '/resource/:id', params: 'If-None-Match: "etag-value"', response: '200 with data + ETag, or 304 Not Modified' },
          { method: 'PUT', path: '/resource/:id', params: 'If-Match: "etag-value"', response: '200 if ETag matches (optimistic locking), 412 if stale' },
          { method: 'GET', path: '/blob/:sha256', params: 'content-address', response: 'Content at that hash (content-addressable)' },
          { method: 'POST', path: '/upload', params: 'Content-MD5: base64(md5)', response: '200 if checksum matches uploaded data, 400 if corrupt' },
          { method: 'GET', path: '/integrity/status', params: '-', response: 'Last scrub results, corruption count, repair status' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do ETags work for HTTP caching and optimistic concurrency?',
          answer: `**ETags for caching (conditional GET)**:

  First request:
  Client -> GET /api/user/123
  Server -> 200 OK
            ETag: "abc123"
            { name: "Alice", email: "alice@example.com" }

  Subsequent request:
  Client -> GET /api/user/123
            If-None-Match: "abc123"
  Server -> 304 Not Modified (no body!)
            (saves bandwidth, client uses cached copy)

  If data changed:
  Client -> GET /api/user/123
            If-None-Match: "abc123"
  Server -> 200 OK
            ETag: "def456"
            { name: "Alice", email: "new@example.com" }

**ETags for optimistic concurrency (conditional PUT)**:

  Client A reads:
  GET /api/user/123 -> ETag: "abc123"

  Client B reads:
  GET /api/user/123 -> ETag: "abc123"

  Client A updates:
  PUT /api/user/123
  If-Match: "abc123"
  { name: "Alice Updated" }
  -> 200 OK, ETag: "def456"

  Client B updates (stale!):
  PUT /api/user/123
  If-Match: "abc123"    <- stale ETag!
  { name: "Bob Updated" }
  -> 412 Precondition Failed (must re-read and retry)

**ETag generation strategies**:
- Hash of response body: MD5(JSON.stringify(data))
- Database version column: "v42" from row version
- Last-modified timestamp: "1704067200"
- Composite: hash(version + last_modified)

**Strong vs weak ETags**:
- Strong "abc123": Byte-for-byte identical
- Weak W/"abc123": Semantically equivalent (allows minor formatting changes)`
        },
        {
          question: 'What is content-addressable storage and where is it used?',
          answer: `**Content-addressable storage (CAS)**: Data is stored and retrieved using a hash of its content as the address. Instead of "store this at location X," you say "store this, and its address IS its hash."

**Key property**: The same content always produces the same address (hash). Different content produces different addresses (with astronomically high probability).

**Advantages**:
1. **Automatic deduplication**: Same content = same hash = stored once
2. **Integrity verification**: Address IS the checksum
3. **Immutability**: Content at an address never changes
4. **Cache-friendly**: Content at hash X is always the same (infinite TTL)

**Where CAS is used**:

  Git:
  $ echo "hello" | git hash-object --stdin
  ce013625030ba8dba906f756967f9e9ca394464a
  -> Object stored at .git/objects/ce/013625...

  Docker:
  FROM nginx:latest
  -> Image layers identified by sha256 digest
  -> Pull layer once, reuse across images

  IPFS (InterPlanetary File System):
  $ ipfs add file.txt
  -> QmXoYpQH... (content ID based on hash)
  -> Anyone with the hash can retrieve the content

  AWS S3 Content-MD5:
  PUT /bucket/key
  Content-MD5: base64(md5(body))
  -> S3 verifies upload integrity

**Deduplication example**:
  File A (1 GB): SHA-256 = abc123...
  File B (1 GB, same content): SHA-256 = abc123...
  Storage needed: 1 GB (not 2 GB)

  Chunked dedup (like restic, borgbackup):
  File split into 4 MB chunks
  Each chunk hashed independently
  Only new/changed chunks stored

  File v1: [chunk1: aaa] [chunk2: bbb] [chunk3: ccc]
  File v2: [chunk1: aaa] [chunk2: bbb] [chunk3: ddd]
  -> Only chunk3 (ddd) is stored for v2
  -> 66% storage savings

**Interview tip**: Mention CAS when designing file storage, CDN caching, or deduplication systems. It naturally provides integrity verification and efficient storage.`
        },
        {
          question: 'How do Merkle trees enable efficient data verification across replicas?',
          answer: `**Problem**: You have two replicas with billions of records. How do you find which records differ without comparing every record?

**Brute force**: Compare all N records = O(N) comparisons. For 1 billion records at 1ms each = 11.5 days.

**Merkle tree solution**: O(log N) comparisons by using a tree of hashes.

**Construction**:

  Data blocks: D1, D2, D3, D4

  Leaf hashes:
  h1 = hash(D1)   h2 = hash(D2)   h3 = hash(D3)   h4 = hash(D4)

  Internal nodes:
  h12 = hash(h1 + h2)    h34 = hash(h3 + h4)

  Root:
  root = hash(h12 + h34)

**Comparison algorithm**:

  Replica A                  Replica B
  root: X                    root: Y      <- Different! Descend.
    ├── h12: P               ├── h12: P   <- Same! Skip subtree.
    └── h34: Q               └── h34: R   <- Different! Descend.
        ├── h3: M                ├── h3: M <- Same!
        └── h4: N                └── h4: S <- DIFFERENT! D4 differs.

  Compared: 5 nodes (out of billions of records)
  Only D4 needs to be synchronized

**Used in real systems**:

  DynamoDB / Cassandra anti-entropy:
  - Build Merkle tree over each partition's data
  - Compare trees between replicas periodically
  - Only transfer records in differing subtrees

  Git:
  - Each commit points to a tree (Merkle tree of files)
  - Comparing branches: compare tree hashes
  - Quickly identify which files changed

  BitTorrent:
  - File split into chunks, each hashed
  - Tree of hashes in .torrent file
  - Verify each downloaded chunk independently

  Blockchain:
  - Transactions hashed into Merkle tree per block
  - Light clients verify transaction inclusion
  - Without downloading the entire block

**Complexity**:
  Build tree: O(N)
  Compare two trees: O(log N) average case
  Space: O(N) hashes
  Update one record: O(log N) hash recomputation`
        },
        {
          question: 'What is bit rot and how do you defend against it?',
          answer: `**Bit rot** (data degradation): Stored data silently changes due to physical media decay, cosmic rays, firmware bugs, or controller errors. The data is corrupted but the storage system doesn't know.

**How common is it?**
- CERN study: 1 in 10^7 files corrupted per year on disk
- NetApp study: 400,000 silent data corruptions per 1.5 million drives per year
- AWS re:Invent: S3 checks ~2 billion checksums per day

**Defense layers**:

1. **Storage-level checksums**:
   Disk writes:
   [data block] [CRC32 checksum]
   Read: Compute CRC32(data block), compare with stored checksum
   ZFS: Checksum per block, stored in parent block (not alongside data)

2. **Application-level checksums**:
   Each record/chunk has a checksum stored separately
   On read: verify checksum before returning data
   HDFS: CRC32 per 64KB data block

3. **End-to-end checksums**:
   Client computes checksum before sending
   Server verifies on receive
   Server computes checksum before sending response
   Client verifies on receive
   -> Catches ALL corruption in the entire path

   Client                    Server
   md5(data) ─────────────> verify md5
   data ──────────────────> store data + md5
   ...
   request data
   verify md5 <───────────── md5(stored_data)
   receive data <──────────── data

4. **Background scrubbing**:
   - Periodically read ALL data and verify checksums
   - Detect corruption before it's requested
   - Repair from replicas if corruption found

   Schedule:
   - Full scrub every 2 weeks (HDFS default)
   - Prioritize data not recently accessed
   - Throttle to avoid impacting production reads

5. **Replication + verification**:
   - Store 3 copies with independent checksums
   - Corrupted copy detected via checksum mismatch
   - Re-replicate from healthy copy automatically
   - With 3 copies: probability of all 3 corrupting = ~10^-21

**Interview tip**: Mention bit rot when discussing storage systems. It shows you understand that "data at rest" is not truly at rest and needs active protection.`
        }
      ],

      basicImplementation: {
        title: 'Simple Checksum Verification',
        description: 'CRC32 checksums stored alongside data. Verified on read. No background scrubbing or end-to-end integrity.',
        svgTemplate: 'simpleCache',
        problems: [
          'Checksum stored next to data can be corrupted together',
          'No background scrubbing to detect silent corruption',
          'No end-to-end verification across network hops',
          'No automatic repair from replicas'
        ]
      },

      advancedImplementation: {
        title: 'End-to-End Data Integrity System',
        description: 'Multi-layer checksums (CRC32 for blocks, SHA-256 for objects), Merkle trees for replica comparison, background scrubbing, and automatic repair from healthy replicas.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'End-to-end checksums verified at every layer boundary',
          'Merkle trees for efficient replica comparison (O(log N))',
          'Background scrubbing detects corruption before it is requested',
          'Automatic repair from healthy replicas on corruption detection',
          'Content-addressable storage provides built-in integrity verification'
        ]
      },

      discussionPoints: [
        {
          topic: 'Checksum Selection Guide',
          points: [
            'CRC32 for speed-critical paths (disk I/O, network frames)',
            'MD5 for content fingerprinting and ETags (not security)',
            'SHA-256 for security-sensitive integrity verification',
            'HMAC for tamper detection (requires shared secret)',
            'xxHash for high-performance hash tables and deduplication'
          ]
        },
        {
          topic: 'Common Integrity Patterns',
          points: [
            'ETags for HTTP caching and optimistic concurrency control',
            'Content-addressable storage for deduplication and caching',
            'Merkle trees for efficient replica synchronization',
            'End-to-end checksums for detecting network corruption',
            'Background scrubbing for detecting silent disk corruption'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Mention checksums when designing any storage or replication system',
            'Discuss ETags when asked about caching strategies',
            'Bring up Merkle trees when discussing replica consistency',
            'Explain end-to-end integrity for data pipeline designs',
            'Connect content-addressable storage to Git, Docker, and CDNs'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'hash-algorithms',
          title: 'Hash Algorithm Comparison',
          left: {
            title: 'Fast Hashes (Non-cryptographic)',
            icon: 'zap',
            color: '#10b981',
            items: [
              { label: 'Speed', value: 'Very fast — GB/s' },
              { label: 'Security', value: 'Not collision-resistant' },
              { label: 'Use Case', value: 'Data integrity, hash tables, checksums' },
              { label: 'Output', value: '32-128 bits' },
              { label: 'Examples', value: 'CRC32, xxHash, MurmurHash' },
              { label: 'When', value: 'Network packets, file integrity, caching' }
            ]
          },
          right: {
            title: 'Cryptographic Hashes',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Speed', value: 'Slower — designed to be expensive' },
              { label: 'Security', value: 'Collision-resistant, one-way' },
              { label: 'Use Case', value: 'Passwords, digital signatures, blockchain' },
              { label: 'Output', value: '256-512 bits' },
              { label: 'Examples', value: 'SHA-256, SHA-3, bcrypt, Argon2' },
              { label: 'When', value: 'Security-critical data verification' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'checksum-usage',
          title: 'Where Checksums Are Used',
          color: '#10b981',
          icon: 'check',
          items: [
            { label: 'TCP/UDP packets', value: 'Header + data checksum', bar: 95 },
            { label: 'File downloads', value: 'MD5/SHA-256 verification', bar: 85 },
            { label: 'Database pages', value: 'Detect disk corruption', bar: 80 },
            { label: 'Distributed storage', value: 'HDFS block checksums', bar: 75 },
            { label: 'Git commits', value: 'SHA-1 content addressing', bar: 90 },
            { label: 'Blockchain', value: 'Block hash chains', bar: 70 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'merkle-tree', name: 'Merkle Tree', icon: 'gitBranch', color: '#8b5cf6',
          description: 'Tree of hashes — efficiently verify large data sets by comparing roots.',
          useWhen: 'Anti-entropy, data synchronization between replicas',
          example: 'Cassandra, Bitcoin, IPFS use Merkle trees for verification'
        },
        {
          id: 'ecc', name: 'Error Correction Codes', icon: 'shield', color: '#3b82f6',
          description: 'Not just detect errors — actually fix them (Reed-Solomon, Hamming).',
          useWhen: 'Unreliable storage or transmission channels',
          example: 'QR codes, CDs, RAID-6 use Reed-Solomon ECC'
        }
      ]
    },
    {
      id: 'strong-vs-eventual-consistency',
      title: 'Strong vs Eventual Consistency',
      icon: 'scale',
      color: '#10b981',
      questions: 10,
      description: 'Linearizability, causal consistency, eventual consistency, and the consistency spectrum.',
      concepts: ['Linearizability', 'Sequential Consistency', 'Causal Consistency', 'Read-Your-Writes', 'Monotonic Reads', 'Eventual Consistency', 'Tunable Consistency', 'Session Consistency'],
      tips: [
        'Consistency is a spectrum, not a binary choice between strong and eventual',
        'Linearizability is the strongest model: operations appear instantaneous',
        'Most applications need read-your-writes consistency at minimum',
        'Eventual consistency means replicas converge IF no new writes occur',
        'Use strong consistency for correctness-critical paths (payments, inventory)',
        'Use eventual consistency for high-throughput reads (feeds, analytics, counters)'
      ],

      introduction: `**Consistency models** define the guarantees a distributed system provides about the order and visibility of operations across replicas. At one end, **linearizability** guarantees that every operation appears to take effect instantaneously at some point between invocation and completion -- as if there were only one copy of the data. At the other end, **eventual consistency** only guarantees that replicas will converge to the same value at some unspecified future time.

Between these extremes lies a rich spectrum: **sequential consistency**, **causal consistency**, **read-your-writes**, and **monotonic reads**. Each model trades off **performance** and **availability** for **correctness guarantees**. Understanding this spectrum is critical because most real systems operate somewhere in the middle, using different consistency levels for different data and operations.

In system design interviews, this topic arises whenever you choose a database, design a replication strategy, or discuss what happens when users interact with data served from different replicas. The ability to articulate which consistency level each part of your system needs -- and why -- is a hallmark of a strong candidate.`,

      functionalRequirements: [
        'Provide a clear ordering of operations visible to all clients',
        'Ensure reads return data that reflects all previously acknowledged writes',
        'Support different consistency levels per operation or data type',
        'Handle concurrent writes with well-defined conflict resolution',
        'Maintain causal relationships between dependent operations',
        'Allow configuration of consistency-performance trade-offs'
      ],

      nonFunctionalRequirements: [
        'Strong consistency: Linearizable reads add 1 RTT to replication quorum',
        'Eventual consistency: Convergence within seconds under normal conditions',
        'Availability: AP systems serve reads during partitions with weaker consistency',
        'Latency: Weaker consistency enables local reads (< 1ms), strong requires coordination (10-100ms)',
        'Throughput: Eventual consistency enables 10-100x higher read throughput',
        'Correctness: Strong consistency for operations where stale data is unacceptable'
      ],

      dataModel: {
        description: 'The consistency spectrum from strongest to weakest',
        schema: `Consistency Spectrum:

  STRONGEST
    │
    ├── Linearizability
    │     Operations appear atomic and instantaneous
    │     As if there is one copy of data
    │     Examples: Spanner, CockroachDB, etcd
    │
    ├── Sequential Consistency
    │     All processes see the same order of operations
    │     But order may not match real-time
    │     Example: ZooKeeper (writes are sequential)
    │
    ├── Causal Consistency
    │     Causally related operations seen in order
    │     Concurrent operations may be seen in any order
    │     Example: MongoDB (causal sessions)
    │
    ├── Read-Your-Writes
    │     A client always sees its own writes
    │     Others may see stale data
    │     Example: Facebook TAO
    │
    ├── Monotonic Reads
    │     Once a client sees value v, never sees older value
    │     Different clients may see different versions
    │
    ├── Eventual Consistency
    │     Replicas converge if writes stop
    │     May read stale data at any time
    │     Examples: DynamoDB, Cassandra (with CL=ONE)
    │
  WEAKEST

  Real-time ordering (linearizability):
  Client A: write(x=1)──────────────────[ACK]
  Client B:           read(x)──[returns 1, not 0]

  Causal ordering:
  Client A: write(x=1)────[ACK]
  Client A: write(y=2)────[ACK]
  Client B: read(y=2) -> MUST also see x=1 (causal dependency)
  Client C: may see x=1 before y=2 or vice versa (no causal dep)`
      },

      apiDesign: {
        description: 'Operations with different consistency levels',
        endpoints: [
          { method: 'READ', path: 'db.get(key, consistency=STRONG)', params: 'key', response: 'Reads from leader or quorum (latest value guaranteed)' },
          { method: 'READ', path: 'db.get(key, consistency=EVENTUAL)', params: 'key', response: 'Reads from any replica (may be stale, fast)' },
          { method: 'READ', path: 'db.get(key, consistency=SESSION)', params: 'key + session token', response: 'Read-your-writes within session' },
          { method: 'WRITE', path: 'db.put(key, value, consistency=STRONG)', params: 'key, value', response: 'Acknowledged after replication to quorum' },
          { method: 'WRITE', path: 'db.put(key, value, consistency=EVENTUAL)', params: 'key, value', response: 'Acknowledged after local write (fast)' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is linearizability and why is it the gold standard?',
          answer: `**Linearizability** (also called strong consistency or atomic consistency): Every operation appears to take effect atomically at some point between its invocation and response. The system behaves as if there is a single copy of the data.

**Formal definition**:
- Every read returns the value of the most recent completed write
- If operation A completes before operation B begins, B sees A's effect
- Concurrent operations may be ordered either way, but once ordered, all observers agree

**Visualization**:

  Time ──────────────────────────────────>

  Client A: ├──write(x=1)──┤
                              Client B: ├──read(x)──┤ returns 1 ✓
                                          (started after write completed)

  Client A: ├──write(x=1)──────────────────┤
  Client B:        ├──read(x)──┤
                   (concurrent: may return 0 or 1)
                   But if read returns 1, ALL subsequent reads return 1

**How to implement linearizability**:

1. **Single leader, sync replication**:
   - All reads and writes go to leader
   - Leader replicates synchronously
   - Simplest but leader is bottleneck

2. **Quorum with linearizable reads**:
   - Write to W replicas, read from R (W+R > N)
   - Read must also do a "read repair" to be linearizable
   - Or use Raft-based reads (read through the leader)

3. **Consensus protocol (Raft/Paxos)**:
   - Every read and write goes through consensus
   - Guaranteed linearizable but high latency
   - Used by etcd, ZooKeeper, CockroachDB

**Cost of linearizability**:
- Higher latency: Every operation requires coordination
- Lower throughput: Cannot serve reads from local replicas
- Reduced availability: Cannot serve reads during network partitions
- CAP: Linearizability = C, so must give up A during P

**When it matters**:
- Leader election: Two nodes must not both think they are leader
- Distributed locks: Two processes must not both hold the lock
- Unique constraints: Two users must not both claim the same username
- Financial transactions: Account balance must never go negative`
        },
        {
          question: 'How does eventual consistency work in practice?',
          answer: `**Eventual consistency guarantee**: If no new writes are made, all replicas will eventually converge to the same value. The key word is "eventually" -- there is no bound on how long this takes.

**How it works in DynamoDB/Cassandra (CL=ONE)**:

  Client writes "Alice" to Replica A:
  t=0:  A="Alice", B="Bob"(old), C="Bob"(old)
  t=1:  A="Alice", B="Alice", C="Bob"(old)    <- async replication
  t=2:  A="Alice", B="Alice", C="Alice"        <- converged!

  But during t=0 to t=2, reads from B or C return "Bob" (stale!)

**Anomalies that can occur**:

1. **Stale reads**:
   Client 1: write(x=42)
   Client 2: read(x) -> returns OLD value (35)

2. **Read skew**:
   Client: read(balance_A) = $500 (new)
           read(balance_B) = $500 (old)
   But a transfer moved $100 from B to A, so real total is $1000, not $1000
   Looks correct by accident here, but inconsistent snapshot

3. **Lost update**:
   Client 1: read(counter=10), write(counter=11)
   Client 2: read(counter=10), write(counter=11)
   -> counter = 11, not 12 (one increment lost)

**Making eventual consistency work**:

1. **Read-your-writes** (most important):
   After a user writes, route their reads to the same replica
   Implementation: sticky sessions, read from leader after write

2. **Monotonic reads**:
   Ensure a user always reads from the same replica
   Implementation: hash(user_id) -> replica assignment

3. **Conflict resolution**:
   LWW (last-write-wins): Simple, may lose data
   CRDTs: Automatic merge for specific data types
   Application merge: Custom logic (e.g., union of sets)

4. **Anti-entropy**:
   Background repair to speed up convergence
   Read repair + Merkle tree comparison

**When eventual consistency is fine**:
- Social media feeds (slight delay is acceptable)
- Analytics and counters (approximate is sufficient)
- Product catalogs (minutes of staleness is OK)
- User profiles (read-your-writes sufficient)
- DNS (TTL-based convergence)`
        },
        {
          question: 'What is causal consistency and why is it a practical middle ground?',
          answer: `**Causal consistency**: Operations that are causally related must be seen in the same order by all nodes. Concurrent (causally unrelated) operations may be seen in different orders.

**Causal relationship**:
- If A happened before B (A wrote a value, B read it), they are causally related
- If A and B are independent, they are concurrent

**Example**:

  Alice posts: "I got promoted!" (operation A)
  Bob sees the post and comments: "Congratulations!" (operation B)
  B is causally dependent on A

  Causal consistency guarantees:
  Everyone sees A before B (the post before the comment)
  No one sees "Congratulations!" without seeing "I got promoted!"

  Violation (without causal consistency):
  Carol sees: "Congratulations!" but NOT "I got promoted!"
  This is confusing and looks like a bug

**How to implement**:

1. **Vector clocks / version vectors**:
   Each node maintains a vector of logical timestamps

   Node A: {A:3, B:2}  <- A has seen 3 own ops, 2 of B's
   Node B: {A:2, B:5}  <- B has seen 2 of A's ops, 5 own

   Operation O from A at {A:3, B:2} is causally before
   Operation P from B at {A:3, B:6} (P's vector >= O's vector)

2. **Causal sessions** (MongoDB):
   Client passes a session token with causal timestamps
   Server ensures reads reflect all causally preceding writes

3. **COPS (Clusters of Order-Preserving Servers)**:
   - Track dependencies per key-value pair
   - Before applying a write, ensure all dependencies are met
   - Used in geo-replicated systems

**Comparison**:

  Model                | See own writes? | See causal order? | Global order?
  ─────────────────────|─────────────────|───────────────────|─────────────
  Eventual             | No              | No                | No
  Read-your-writes     | Yes             | No                | No
  Causal               | Yes             | Yes               | No
  Linearizable         | Yes             | Yes               | Yes

**Why it matters for interviews**:
Causal consistency gives most of the UX benefits of strong consistency (no confusing anomalies) with much better performance (no global coordination). It is the sweet spot for many applications.`
        },
        {
          question: 'How do you choose the right consistency level for different parts of a system?',
          answer: `**Decision framework**: Classify each data type and operation by its tolerance for staleness and its correctness requirements.

**Per-operation consistency mapping**:

  Operation              | Consistency Level | Why
  ───────────────────────|───────────────────|───────────────────────
  Login / authentication | Strong            | Must verify credentials
  Payment / transfer     | Strong            | Cannot double-spend
  Leader election        | Strong            | Must agree on one leader
  Inventory check        | Strong            | Prevent overselling
  User profile read      | Read-your-writes  | User sees own changes
  Social media feed      | Eventual          | Slight delay acceptable
  Like/view counters     | Eventual          | Approximate is fine
  Product catalog        | Eventual (cached) | Minutes of staleness OK
  Search results         | Eventual          | Index lag is normal
  Notifications          | Causal            | Must be in order

**Architecture pattern (polyglot consistency)**:

  ┌──────────────────────────────────────────┐
  │              Application                  │
  └──────┬────────────┬────────────┬──────────┘
         │            │            │
  ┌──────▼──────┐ ┌───▼────┐ ┌────▼─────┐
  │ PostgreSQL  │ │  Redis │ │ Cassandra│
  │ (Strong)    │ │ (R-Y-W)│ │(Eventual)│
  │ Payments,   │ │ Session│ │ Feeds,   │
  │ Accounts    │ │ Cache  │ │ Analytics│
  └─────────────┘ └────────┘ └──────────┘

**Tunable consistency (Cassandra/DynamoDB)**:
  Same database, different consistency per query:

  // Payment: strong consistency
  db.execute("SELECT balance FROM accounts WHERE id = ?",
    { consistency: QUORUM })

  // Feed: eventual consistency
  db.execute("SELECT * FROM posts WHERE user_id = ?",
    { consistency: ONE })

**Common mistake in interviews**:
Saying "we need strong consistency everywhere" or "eventual is fine"
Instead: "Payments need strong consistency via PostgreSQL transactions.
User feeds use eventual consistency via Cassandra with CL=ONE for
low latency. User profile reads use read-your-writes by routing to
the leader after a write."`
        },
        {
          question: 'How does Google Spanner achieve strong consistency globally?',
          answer: `**Spanner** is Google's globally distributed database that provides **linearizability** (external consistency) across datacenters using a novel technique called **TrueTime**.

**TrueTime API**:
Instead of a single timestamp, TrueTime returns an interval:
  TT.now() = [earliest, latest]
  The actual time is guaranteed to be within this interval
  Uncertainty window: typically 1-7 milliseconds

  Based on GPS receivers and atomic clocks in every datacenter
  Two independent time sources reduce chance of error

**How Spanner uses TrueTime for consistency**:

1. Transaction T1 commits at timestamp t1
2. Spanner waits until TT.after(t1) is true
   (i.e., the latest possible time has passed t1)
3. Only then is the commit acknowledged
4. This ensures: if T1 commits before T2 starts,
   t1 < t2 (real-time ordering preserved)

  Wait time = uncertainty interval (~4ms average)

  T1: ├──execute──┤[commit wait]├──ACK──┤
                                t1 ↑
  T2:                               ├──starts──┤
                                    t2 is guaranteed > t1

**Spanner architecture**:

  Zone 1 (US)          Zone 2 (EU)         Zone 3 (Asia)
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │ Spanner  │<──────>│ Spanner  │<──────>│ Spanner  │
  │ Node     │ Paxos  │ Node     │ Paxos  │ Node     │
  │ [GPS +   │        │ [GPS +   │        │ [GPS +   │
  │  Atomic  │        │  Atomic  │        │  Atomic  │
  │  Clock]  │        │  Clock]  │        │  Clock]  │
  └──────────┘        └──────────┘        └──────────┘

  - Data replicated across zones via Paxos
  - TrueTime provides global timestamp ordering
  - Reads at a timestamp are served from any replica with that version

**Why this is remarkable**:
- Strong consistency across continents (~100ms latency)
- No single leader bottleneck (Paxos groups per shard)
- Lock-free read-only transactions at a snapshot timestamp
- 99.999% availability (5 nines)

**Trade-off**:
- Requires specialized hardware (GPS + atomic clocks)
- ~4ms commit wait (higher latency than eventual consistency)
- Complex infrastructure only feasible at Google-scale

**Interview tip**: Mention Spanner when asked if strong consistency can work globally. It is the gold standard example of paying engineering complexity for the strongest guarantees.`
        }
      ],

      basicImplementation: {
        title: 'Single-Leader Strong Consistency',
        description: 'All reads and writes go through a single leader with synchronous replication. Consistent but limited by leader throughput and single-region latency.',
        svgTemplate: 'simpleCache',
        problems: [
          'Leader is a throughput bottleneck',
          'Cross-region reads have high latency',
          'Leader failure causes temporary unavailability',
          'No ability to tune consistency per operation'
        ]
      },

      advancedImplementation: {
        title: 'Tunable Consistency with Polyglot Persistence',
        description: 'Different consistency levels per data type: strong consistency for transactions, causal for user-facing data, eventual for analytics. Multiple storage systems chosen to match each consistency need.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'Strong consistency (PostgreSQL) for financial data and constraints',
          'Causal consistency (MongoDB causal sessions) for user-facing reads',
          'Eventual consistency (Cassandra CL=ONE) for feeds and analytics',
          'Session tokens ensure read-your-writes for logged-in users',
          'Monitoring for replication lag to bound staleness window'
        ]
      },

      discussionPoints: [
        {
          topic: 'Consistency Model Trade-offs',
          points: [
            'Linearizability: Correct but expensive (coordination on every operation)',
            'Sequential: Weaker than linearizable but still provides total order',
            'Causal: Best UX-to-performance ratio for most applications',
            'Read-your-writes: Minimum viable consistency for user-facing systems',
            'Eventual: Highest throughput and availability but stale reads possible'
          ]
        },
        {
          topic: 'Implementation Mechanisms',
          points: [
            'Consensus protocols (Raft/Paxos) for linearizability',
            'Vector clocks for causal consistency tracking',
            'Sticky sessions for read-your-writes',
            'Quorum reads and writes for tunable consistency',
            'CRDTs for conflict-free eventual consistency'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Never say "strong consistency everywhere" or "eventual is fine" -- be specific per operation',
            'Draw the consistency spectrum and place your data types on it',
            'Mention Google Spanner as the gold standard for global strong consistency',
            'Explain causal consistency as the practical middle ground',
            'Use concrete examples: payments need strong, feeds can be eventual'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'strong-vs-eventual',
          title: 'Strong vs Eventual Consistency',
          left: {
            title: 'Strong Consistency',
            icon: 'lock',
            color: '#ef4444',
            items: [
              { label: 'Guarantee', value: 'Every read returns latest write' },
              { label: 'Latency', value: 'Higher — must sync all replicas' },
              { label: 'Availability', value: 'Lower — blocked during partitions' },
              { label: 'Implementation', value: 'Consensus protocols (Raft, Paxos)' },
              { label: 'Use When', value: 'Banking, inventory, leader election' },
              { label: 'Examples', value: 'Spanner, CockroachDB, ZooKeeper' }
            ]
          },
          right: {
            title: 'Eventual Consistency',
            icon: 'clock',
            color: '#10b981',
            items: [
              { label: 'Guarantee', value: 'All replicas converge eventually' },
              { label: 'Latency', value: 'Low — write to nearest node' },
              { label: 'Availability', value: 'High — always accepts writes' },
              { label: 'Implementation', value: 'Async replication, conflict resolution' },
              { label: 'Use When', value: 'Social feeds, DNS, shopping carts' },
              { label: 'Examples', value: 'DynamoDB, Cassandra, DNS' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'consistency-spectrum',
          title: 'Consistency Spectrum',
          color: '#8b5cf6',
          icon: 'sliders',
          items: [
            { label: 'Linearizability', value: 'Strongest — real-time ordering', bar: 100 },
            { label: 'Sequential Consistency', value: 'Global order, not real-time', bar: 85 },
            { label: 'Causal Consistency', value: 'Respects cause-effect', bar: 65 },
            { label: 'Read-Your-Writes', value: 'See your own updates', bar: 50 },
            { label: 'Monotonic Reads', value: 'Never see older data after newer', bar: 40 },
            { label: 'Eventual Consistency', value: 'Converge given time', bar: 15 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'crdt', name: 'CRDTs', icon: 'layers', color: '#8b5cf6',
          description: 'Conflict-free Replicated Data Types — merge without coordination.',
          useWhen: 'Collaborative editing, offline-first, multi-master',
          example: 'G-Counter, OR-Set used in Riak, Redis CRDT'
        },
        {
          id: 'vector-clock', name: 'Vector Clocks', icon: 'clock', color: '#f59e0b',
          description: 'Track causal ordering of events across distributed nodes.',
          useWhen: 'Detect and resolve concurrent write conflicts',
          example: 'DynamoDB version vectors, Riak vector clocks'
        }
      ],
      comparisonCards: [
        {
          title: 'Consistency Models Spectrum',
          items: [
            { name: 'Strong (Linearizable)', description: 'Every read returns the most recent write. All nodes see the same data at the same time. Highest latency but simplest to reason about. Used by: Spanner, CockroachDB.' },
            { name: 'Sequential', description: 'All operations appear in some sequential order consistent with each client\'s program order. Weaker than linearizable but still provides ordering guarantees.' },
            { name: 'Causal', description: 'Operations that are causally related are seen in the same order by all nodes. Concurrent operations may be seen in different orders. Good balance of consistency and availability.' },
            { name: 'Eventual', description: 'If no new updates are made, all replicas will eventually converge to the same value. Highest availability, lowest latency. Used by: DynamoDB, Cassandra, DNS.' },
            { name: 'Read-Your-Writes', description: 'A user always sees their own writes immediately, even if other users see eventual consistency. Common in social media (you see your own post immediately).' }
          ]
        }
      ],
      staticDiagrams: [
        {
          id: 'consistency-spectrum',
          title: 'Consistency Models',
          description: 'Spectrum from Strong to Eventual consistency with database examples',
          src: '/diagrams/strong-vs-eventual-consistency/consistency-spectrum.svg',
          type: 'architecture'
        }
      ]
    },
    {
      id: 'latency-vs-throughput',
      title: 'Latency vs Throughput',
      icon: 'barChart',
      color: '#f59e0b',
      questions: 8,
      description: "Little's Law, back-of-envelope math, capacity planning, and performance optimization.",
      concepts: ["Little's Law (L = λW)", 'Tail Latency (p99, p999)', 'Back-of-Envelope Estimation', 'Capacity Planning', 'Amdahl\'s Law', 'Bandwidth vs Throughput', 'Queueing Theory Basics', 'SLO/SLA Definitions'],
      tips: [
        "Little's Law (L = λW) connects concurrency, throughput, and latency -- use it in every estimation",
        'p99 latency matters more than average: one slow request affects the whole user experience',
        'Back-of-envelope calculations are expected in interviews -- practice common ones',
        'Throughput and latency are often inversely related (batching increases throughput but adds latency)',
        "Amdahl's Law limits speedup from parallelism -- the serial portion dominates",
        'Always define SLOs (service level objectives) before optimizing performance'
      ],

      staticDiagrams: [
        {
          id: 'latency-numbers',
          title: 'Latency Numbers',
          description: 'Key latency numbers from 1ns (L1 cache) to 10s (retry interval) every developer should know',
          src: '/diagrams/latency-vs-throughput/latency-numbers.svg',
          type: 'architecture'
        }
      ],

      introduction: `**Latency** and **throughput** are the two fundamental performance metrics in system design. Latency measures how long a single operation takes (typically in milliseconds), while throughput measures how many operations the system completes per unit time (typically requests per second). Understanding the relationship between them -- and how to optimize each -- is essential for capacity planning and system design interviews.

**Little's Law** (L = lambda * W) is the cornerstone equation: the average number of items in a system equals the arrival rate times the average time each item spends in the system. This single formula lets you calculate required concurrency, estimate queue depths, and plan capacity. Combined with **back-of-envelope estimation** techniques, it gives you the tools to quickly size any system during an interview.

**Tail latency** (p99, p99.9) is where real-world problems hide. While average latency might be 10ms, the 99th percentile might be 500ms -- and for a page that makes 50 backend calls, there is a 40% chance at least one hits the p99. Understanding tail latency, **Amdahl's Law** for parallelism limits, and **capacity planning** frameworks will make your system design answers rigorous and quantitative.`,

      functionalRequirements: [
        'Serve user-facing requests within defined latency SLOs',
        'Handle target throughput (RPS) under normal and peak load',
        'Degrade gracefully when load exceeds capacity',
        'Support load testing and benchmarking',
        'Provide real-time latency and throughput metrics',
        'Scale capacity to meet growing demand'
      ],

      nonFunctionalRequirements: [
        'Latency SLO: p50 < 50ms, p99 < 200ms, p99.9 < 1s',
        'Throughput: 10,000-100,000 RPS per service instance',
        'Availability: 99.9% of requests served within SLO',
        'Scalability: Linear throughput increase with added instances',
        'Efficiency: 70% target CPU utilization under normal load',
        'Cost: Sub-linear cost growth relative to traffic growth'
      ],

      dataModel: {
        description: "Key formulas and latency numbers every engineer should know",
        schema: `Little's Law: L = λ × W
  L = average number of items in system (concurrency)
  λ = arrival rate (throughput, e.g., RPS)
  W = average time in system (latency)

  Example: 1000 RPS, 100ms average latency
  L = 1000 × 0.1 = 100 concurrent requests
  -> Need at least 100 threads/connections

Latency Numbers (2024 reference):
  L1 cache reference:           1 ns
  L2 cache reference:           4 ns
  Main memory reference:       100 ns
  SSD random read:          16,000 ns  (16 μs)
  HDD seek:             10,000,000 ns  (10 ms)
  Same-datacenter RTT:     500,000 ns  (0.5 ms)
  Cross-continent RTT: 150,000,000 ns  (150 ms)

Throughput Estimates:
  Single server:     1,000 - 10,000 RPS (CPU-bound)
  With caching:     50,000 - 200,000 RPS
  Load balanced:   100,000 - 1,000,000 RPS (horizontal)

Amdahl's Law: S = 1 / (s + (1-s)/N)
  S = speedup
  s = serial fraction
  N = number of processors/servers
  If 5% is serial: max speedup = 1/0.05 = 20x (no matter how many servers)

Bandwidth vs Throughput:
  Network bandwidth: 10 Gbps = 1.25 GB/s (theoretical max)
  Actual throughput: 60-80% of bandwidth (protocol overhead)
  1 Gbps link with 10 KB responses = ~12,500 RPS max`
      },

      apiDesign: {
        description: 'Observability and performance management endpoints',
        endpoints: [
          { method: 'GET', path: '/metrics/latency', params: 'percentile, window', response: 'p50, p95, p99, p99.9 latency values' },
          { method: 'GET', path: '/metrics/throughput', params: 'window', response: 'Current RPS and peak RPS' },
          { method: 'GET', path: '/health/capacity', params: '-', response: 'Current load %, headroom estimate' },
          { method: 'POST', path: '/loadtest/run', params: 'target RPS, duration', response: 'Latency distribution at target load' },
          { method: 'GET', path: '/slo/status', params: 'slo_name', response: 'Current compliance %, error budget remaining' }
        ]
      },

      keyQuestions: [
        {
          question: "Explain Little's Law and how you use it in capacity planning.",
          answer: `**Little's Law**: L = λ × W

In words: The average number of items in a system (L) equals the average arrival rate (λ) times the average time each item spends in the system (W).

**Why it is powerful**: It applies to ANY stable system regardless of distribution, arrival patterns, or service order. It is universal.

**Capacity planning examples**:

Example 1: Web server thread pool
  - Target: 5,000 RPS, average latency 200ms
  - L = 5000 × 0.2 = 1,000 concurrent requests
  - Need: 1,000 threads (or async connections)
  - With 100 threads per server: need 10 servers

Example 2: Database connection pool
  - Target: 2,000 queries/sec, average query time 50ms
  - L = 2000 × 0.05 = 100 concurrent connections
  - Pool size should be ~100-120 (headroom for spikes)

Example 3: Message queue sizing
  - Producer rate: 10,000 msg/sec
  - Consumer processing time: 100ms per message
  - L = 10000 × 0.1 = 1,000 messages in queue
  - With 10 consumers: each handles 1,000 msg/sec
  - Need 10 consumers to keep queue stable

**Rearranging for different questions**:
  λ = L / W  (What throughput can I achieve?)
  W = L / λ  (What latency should I expect?)
  L = λ × W  (How many concurrent items?)

**Key insight**: If latency increases (W ↑) and arrival rate stays the same (λ constant), concurrency increases (L ↑). This is why slow requests cause thread pool exhaustion.

  Normal: L = 1000 RPS × 0.1s = 100 concurrent
  Slow DB: L = 1000 RPS × 1s = 1000 concurrent -> thread pool exhausted!`
        },
        {
          question: 'Why does tail latency (p99) matter more than average latency?',
          answer: `**The tail latency problem**: Average latency hides the worst-case user experience.

**Example**:
  p50 = 10ms (50% of requests are fast)
  p99 = 500ms (1% of requests are slow)
  Average = 15ms (looks great!)

But for a page that makes 50 backend calls in parallel:
  P(all 50 < p99) = 0.99^50 = 60%
  P(at least one hits p99) = 1 - 0.99^50 = 40%
  -> 40% of page loads experience 500ms+ latency!

**Visualization**:

  Latency distribution:
  ████████████████████████████  p50 = 10ms
  ████████████████████████████████████  p95 = 50ms
  █████████████████████████████████████████████  p99 = 500ms
  ████████████████████████████████████████████████████  p999 = 2000ms
                                                    ^^^^
                                              "The tail"

**Fan-out amplification**:

  Backend calls:   1     10     50     100
  P(hitting p99): 1%    10%    40%    63%
  P(hitting p999): 0.1%  1%     5%    10%

  -> More backend calls = more likely to hit tail latency
  -> Microservices architectures amplify tail latency

**Causes of tail latency**:
- Garbage collection pauses
- Network retransmissions
- Disk I/O on cache miss
- Resource contention (CPU, locks)
- Background tasks (compaction, replication)
- Noisy neighbors (shared infrastructure)

**Mitigation strategies**:
1. **Hedged requests**: Send to 2 replicas, use first response
   - Adds minimal load (small % of requests)
   - Dramatically cuts tail latency
2. **Speculative retry**: If p99 timeout reached, send retry to different server
3. **Request deadline**: Set maximum time, fail fast after deadline
4. **Tail-tolerant architectures**: Design for partial results when some backends are slow`
        },
        {
          question: 'Walk through a back-of-envelope estimation for a URL shortener.',
          answer: `**Step 1: Clarify requirements**
- 100 million new URLs created per month
- 10 billion URL redirects per month (100:1 read:write ratio)
- URLs kept for 5 years
- Average URL: 100 bytes

**Step 2: Traffic estimates**

  Writes:
  100M / month = 100M / (30 × 24 × 3600)
               = 100M / 2.6M seconds
               ≈ 40 writes/second

  Reads:
  10B / month = 10B / 2.6M seconds
              ≈ 4,000 reads/second

  Peak (3-5x average):
  Writes: ~200/sec peak
  Reads:  ~20,000/sec peak

**Step 3: Storage estimates**

  URLs: 100M/month × 12 months × 5 years = 6 billion URLs
  Storage: 6B × 100 bytes = 600 GB
  With overhead (indexes, etc.): ~1 TB

  Fits on a single server? Yes, but no redundancy.
  With replication (3x): ~3 TB

**Step 4: Bandwidth**

  Incoming (writes): 40 × 100 bytes = 4 KB/s (negligible)
  Outgoing (reads): 4,000 × 100 bytes = 400 KB/s (negligible)
  Peak outgoing: 2 MB/s (still small)

**Step 5: Capacity planning (using Little's Law)**

  At peak: 20,000 RPS, target p99 = 50ms
  L = 20,000 × 0.05 = 1,000 concurrent requests
  Single server handles ~10,000 RPS (with caching)
  Need: 2-3 servers (with headroom)

  Cache hit rate estimate: 80% (Pareto: 20% of URLs = 80% of traffic)
  Cache size: 20% × 6B × 100 bytes = 120 GB (fits in Redis cluster)
  With cache: DB load = 4,000 × 0.2 = 800 reads/sec (easy)

**Summary table**:

  Metric          | Value
  ────────────────|─────────────────
  Write RPS       | 40 (peak 200)
  Read RPS        | 4,000 (peak 20K)
  Storage (5yr)   | ~1 TB
  Cache size      | ~120 GB (Redis)
  App servers     | 2-3 instances
  Database        | 1 primary + 2 replicas`
        },
        {
          question: "What is Amdahl's Law and how does it limit scaling?",
          answer: `**Amdahl's Law**: The maximum speedup from parallelism is limited by the serial (non-parallelizable) portion of the work.

**Formula**: S = 1 / (s + (1-s)/N)
  S = speedup factor
  s = fraction of work that is serial
  N = number of parallel processors/servers

**Visualization**:

  Serial fraction (s) | Max speedup (N=∞)
  ────────────────────|───────────────────
  50%                 | 2x
  25%                 | 4x
  10%                 | 10x
  5%                  | 20x
  1%                  | 100x

  Even with infinite servers:
  If 5% is serial, max speedup = 20x
  Adding more servers beyond this gives diminishing returns

  Speedup vs Servers (s=10%):
  Servers:  1    2    4    8   16   32    ∞
  Speedup:  1x  1.8x 3.1x 4.7x 6.4x 7.5x 10x
                                           ↑ ceiling!

**System design examples of serial bottlenecks**:

1. **Database writes**: Single leader is the serial bottleneck
   - Reads scale with replicas (parallel)
   - Writes limited to leader throughput (serial)
   - Fix: Sharding distributes writes

2. **Global locks**: Lock contention limits parallelism
   - Only one thread holds the lock (serial)
   - All others wait (wasted parallelism)
   - Fix: Fine-grained locks, lock-free data structures

3. **Sequential processing**: Steps that must happen in order
   - User auth -> validate -> process -> respond (serial chain)
   - Adding servers doesn't help latency of one request
   - Fix: Pipeline stages or reduce serial steps

4. **Shared state coordination**: Consensus protocols
   - Raft requires leader to serialize all writes
   - Multi-Paxos: proposer is a bottleneck
   - Fix: Partition state to parallelize across groups

**Interview application**:
- Identify the serial bottleneck in your design
- Calculate max speedup before adding more servers
- Design to minimize the serial fraction (shard, partition, pipeline)
- "We can scale reads to 100x with replicas, but writes are limited to 10x because the serial consensus step is 10% of total work."`
        },
        {
          question: 'How do you define and monitor SLOs and SLAs?',
          answer: `**SLI (Service Level Indicator)**: A measurable metric
  Example: p99 latency of HTTP requests

**SLO (Service Level Objective)**: A target for the SLI
  Example: p99 latency < 200ms for 99.9% of requests

**SLA (Service Level Agreement)**: A contract with consequences
  Example: p99 latency < 200ms, or customer gets credits

**Hierarchy**:
  SLI (what you measure) -> SLO (what you target) -> SLA (what you promise)

**Common SLOs**:

  Service Type    | SLI            | SLO
  ────────────────|────────────────|──────────────────
  Web API         | p99 latency    | < 200ms, 99.9%
  Database        | Query latency  | p99 < 50ms
  Message queue   | E2E latency    | p99 < 1 second
  Storage         | Durability     | 99.999999999% (11 nines)
  CDN             | Cache hit rate | > 95%
  Auth service    | Availability   | 99.99%

**Error budget**:
  SLO = 99.9% availability
  Error budget = 0.1% = 43.8 minutes/month of downtime

  ┌──────────────────────────────────────┐
  │ Month: March                          │
  │ Budget: 43.8 minutes                  │
  │ Used:   12 minutes (incident on 3/15) │
  │ Remaining: 31.8 minutes               │
  │ Status: GREEN                         │
  └──────────────────────────────────────┘

  If budget exhausted:
  - Freeze feature releases
  - Focus on reliability improvements
  - No risky deployments until next month

**Monitoring setup**:
1. Collect SLIs continuously (Prometheus, Datadog)
2. Calculate SLO compliance over rolling windows (7d, 30d)
3. Alert when burn rate is too high:
   - 2% budget consumed in 1 hour -> PAGE
   - 5% budget consumed in 6 hours -> TICKET
4. Dashboard showing error budget remaining

**Interview tip**: Define SLOs early in your design. Say: "Our SLO is p99 < 200ms and 99.9% availability. This means we have a 43-minute monthly error budget, which informs our failover and deployment strategies."`
        }
      ],

      basicImplementation: {
        title: 'Single Server with Basic Monitoring',
        description: 'One server handling all traffic with basic latency/throughput metrics. No load balancing or redundancy.',
        svgTemplate: 'singleServer',
        problems: [
          'No horizontal scaling (throughput limited to one server)',
          'No redundancy (single point of failure)',
          'No tail latency mitigation (no hedged requests)',
          'Cannot shed load under pressure'
        ]
      },

      advancedImplementation: {
        title: 'SLO-Driven Auto-Scaling Architecture',
        description: 'Auto-scaling based on SLO compliance, hedged requests for tail latency, load shedding under pressure, and comprehensive latency/throughput monitoring with error budgets.',
        svgTemplate: 'loadBalancer',
        keyPoints: [
          'Auto-scaling triggered by SLO breach (p99 > threshold)',
          'Hedged requests to reduce tail latency by 50-90%',
          'Load shedding returns 503 when capacity exceeded (graceful degradation)',
          'Error budget tracking drives deployment velocity decisions',
          'Little\'s Law used to right-size thread pools and connection pools'
        ]
      },

      discussionPoints: [
        {
          topic: 'Optimization Priorities',
          points: [
            'Measure first: Don\'t optimize without profiling',
            'Reduce tail latency before improving average (p99 impacts user experience more)',
            'Cache hot data: 80/20 rule -- 20% of data serves 80% of traffic',
            'Batch operations: Trade latency for throughput where acceptable',
            'Identify serial bottleneck (Amdahl\'s Law) before adding servers'
          ]
        },
        {
          topic: 'Back-of-Envelope Estimation Tips',
          points: [
            'Memorize latency numbers: memory (100ns), SSD (16μs), HDD (10ms), network (0.5ms local, 150ms global)',
            'Use powers of 2: 2^10 ≈ 1K, 2^20 ≈ 1M, 2^30 ≈ 1B',
            '86,400 seconds/day ≈ 100K, 2.6M seconds/month ≈ 3M',
            'Start with DAU, derive RPS: DAU × actions/day ÷ 86400 = average RPS',
            'Peak = 3-5x average for most consumer applications'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Always do a back-of-envelope calculation -- interviewers expect it',
            'Use Little\'s Law to size thread pools, connection pools, and queue depths',
            'Define SLOs at the start of your design to anchor performance decisions',
            'Mention tail latency and hedged requests for read-heavy systems',
            'Know when to trade latency for throughput (batch processing) and vice versa'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'latency-vs-throughput-comp',
          title: 'Latency vs Throughput',
          left: {
            title: 'Optimize for Latency',
            icon: 'clock',
            color: '#3b82f6',
            items: [
              { label: 'Goal', value: 'Minimize time per request' },
              { label: 'Strategy', value: 'Caching, CDN, edge computing' },
              { label: 'Trade-off', value: 'May reduce throughput (no batching)' },
              { label: 'Measure', value: 'p50, p95, p99 response time' },
              { label: 'Use When', value: 'User-facing APIs, real-time systems' },
              { label: 'Example', value: 'Google search < 200ms' }
            ]
          },
          right: {
            title: 'Optimize for Throughput',
            icon: 'trendingUp',
            color: '#10b981',
            items: [
              { label: 'Goal', value: 'Maximize requests per second' },
              { label: 'Strategy', value: 'Batching, parallelism, async' },
              { label: 'Trade-off', value: 'Individual latency may increase' },
              { label: 'Measure', value: 'RPS, messages/sec, bytes/sec' },
              { label: 'Use When', value: 'Batch processing, data pipelines' },
              { label: 'Example', value: 'Kafka 1M+ messages/sec' }
            ]
          }
        }
      ],
      visualCards: [
        {
          id: 'optimization-techniques',
          title: 'Latency vs Throughput Optimization',
          color: '#3b82f6',
          icon: 'zap',
          items: [
            { label: 'Caching (Redis/CDN)', value: 'Latency ↓↓, Throughput ↑↑', bar: 95 },
            { label: 'Connection pooling', value: 'Latency ↓, Throughput ↑↑', bar: 80 },
            { label: 'Batching', value: 'Latency ↑, Throughput ↑↑↑', bar: 70 },
            { label: 'Async processing', value: 'Latency ↓ (perceived), Throughput ↑', bar: 75 },
            { label: 'Compression', value: 'Latency ↓ (network), CPU ↑', bar: 60 },
            { label: 'Horizontal scaling', value: 'Throughput ↑↑, Latency same', bar: 85 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'littles-law', name: 'Little\'s Law', icon: 'hash', color: '#8b5cf6',
          description: 'L = λ × W. Items in system = arrival rate × time in system.',
          useWhen: 'Capacity planning, queue sizing, thread pool tuning',
          example: '100 RPS × 0.1s avg latency = 10 concurrent requests'
        },
        {
          id: 'tail-latency', name: 'Tail Latency', icon: 'barChart', color: '#ef4444',
          description: 'p99/p999 latency matters more than average for user experience.',
          useWhen: 'SLA definitions, performance monitoring',
          example: 'p50=5ms, p99=500ms means 1% of users wait 100x longer'
        }
      ],
      comparisonCards: [
        {
          title: 'Latency Numbers Every Developer Should Know',
          items: [
            { name: 'L1 Cache: 1 ns', description: 'Built onto the CPU chip. Fastest memory access. Unless you work with hardware directly, you rarely worry about this.' },
            { name: 'L2 Cache: 10 ns', description: 'Slightly larger and slower than L1. Still on-chip. Both L1/L2 are managed by hardware automatically.' },
            { name: 'RAM Access: 100 ns', description: 'Main memory read. Redis is in-memory, so Redis reads are approximately 100 ns.' },
            { name: 'Send 1KB over 1Gbps Network: 10 us', description: 'Network transfer of small payloads. Memcached data retrieval over network takes ~10 microseconds.' },
            { name: 'Read from SSD: 100 us', description: 'Solid-state disk read. RocksDB (disk-based K/V store) read latency is around 100 microseconds.' },
            { name: 'Database Insert: 1 ms', description: 'PostgreSQL commit — store data, create index, flush logs. All disk I/O operations add up.' },
            { name: 'HDD Disk Seek: 10 ms', description: 'Mechanical hard drive seek time. 100x slower than SSD. Avoid random reads on HDDs.' },
            { name: 'Cross-Continent Packet: 100 ms', description: 'CA→Netherlands→CA round trip. A long-distance Zoom call has ~100ms latency.' },
            { name: 'Retry/Refresh Interval: 1-10 s', description: 'Monitoring systems typically use 5-10 second refresh intervals for dashboards.' }
          ]
        }
      ]
    },
    {
      id: 'acid-vs-base',
      title: 'ACID vs BASE',
      icon: 'gitBranch',
      color: '#3b82f6',
      questions: 9,
      description: 'Transaction properties, isolation levels, MVCC, and the ACID-BASE spectrum.',
      concepts: ['ACID Properties', 'BASE Properties', 'Isolation Levels', 'MVCC (Multi-Version Concurrency Control)', 'Two-Phase Commit (2PC)', 'Write-Ahead Logging (WAL)', 'Optimistic vs Pessimistic Locking', 'Distributed Transactions'],
      tips: [
        'ACID and BASE are ends of a spectrum, not a binary choice',
        'Most SQL databases use MVCC to provide isolation without blocking readers',
        'Two-phase commit is the textbook solution for distributed transactions but has serious availability problems',
        'The default isolation level in most databases is NOT serializable -- know what you are getting',
        'Sagas are the practical alternative to 2PC in microservice architectures',
        'Always ask what isolation level the interviewer expects -- it changes the design significantly'
      ],

      introduction: `**ACID** (Atomicity, Consistency, Isolation, Durability) and **BASE** (Basically Available, Soft state, Eventual consistency) represent two philosophies for managing data in distributed systems. ACID prioritizes correctness: transactions are all-or-nothing, data constraints are always maintained, and concurrent operations are isolated from each other. BASE prioritizes availability and performance: the system is always responsive, state may be temporarily inconsistent, and replicas converge over time.

The reality is that most modern systems use both. Your payment service needs ACID transactions (you cannot lose money), but your news feed can use BASE (showing a post 2 seconds late is fine). Understanding the **isolation levels** between serializable and read uncommitted, how **MVCC** enables concurrent reads without blocking, and why **two-phase commit** is problematic in microservices is essential knowledge for system design interviews.

The choice between ACID and BASE is not about which is "better" -- it is about understanding the **consistency requirements** of each operation and choosing the right guarantees for the job. This nuanced perspective separates senior candidates from those who default to "just use PostgreSQL" or "just use DynamoDB" for everything.`,

      functionalRequirements: [
        'Execute transactions atomically (all-or-nothing)',
        'Maintain database constraints across concurrent operations',
        'Provide configurable isolation levels per transaction',
        'Support distributed transactions across multiple databases',
        'Handle transaction conflicts with retry or rollback',
        'Ensure committed data survives crashes'
      ],

      nonFunctionalRequirements: [
        'Transaction throughput: 10,000+ TPS for OLTP workloads',
        'Transaction latency: p99 < 50ms for single-shard transactions',
        'Durability: Zero committed data loss (WAL + fsync)',
        'Isolation: No dirty reads, configurable phantom read prevention',
        'Availability: 99.99% with automatic failover',
        'Conflict rate: < 1% of transactions for optimistic locking'
      ],

      dataModel: {
        description: 'ACID properties and isolation levels',
        schema: `ACID Properties:

  Atomicity: All operations in a transaction succeed or all are rolled back
  ┌────────────────────────────────┐
  │ BEGIN TRANSACTION              │
  │   UPDATE accounts SET bal = bal - 100 WHERE id = 1;  │
  │   UPDATE accounts SET bal = bal + 100 WHERE id = 2;  │
  │ COMMIT;  <- both happen or neither    │
  └────────────────────────────────┘

  Consistency: Database moves from one valid state to another
  (Constraints: bal >= 0, foreign keys, unique constraints)

  Isolation: Concurrent transactions don't interfere
  (Levels: Read Uncommitted -> Serializable)

  Durability: Committed data survives crashes
  (WAL written to disk before COMMIT returns)

BASE Properties:

  Basically Available: System always responds (even with stale data)
  Soft State: State may change without new input (async replication)
  Eventual Consistency: All replicas converge eventually

Isolation Levels (weakest to strongest):

  Level              | Dirty Read | Non-Repeatable Read | Phantom Read
  ────────────────── |────────────|─────────────────────|─────────────
  Read Uncommitted   | Possible   | Possible            | Possible
  Read Committed     | Prevented  | Possible            | Possible
  Repeatable Read    | Prevented  | Prevented           | Possible
  Serializable       | Prevented  | Prevented           | Prevented

  Default by database:
  PostgreSQL:  Read Committed
  MySQL/InnoDB: Repeatable Read
  Oracle:      Read Committed
  SQL Server:  Read Committed

MVCC (Multi-Version Concurrency Control):
  Each write creates a new version, reads see a snapshot

  Time ->
  Version 1: balance = 500 (visible to Txn A snapshot)
  Version 2: balance = 400 (written by Txn B)
  Version 3: balance = 300 (written by Txn C)

  Txn A (snapshot at t=1): reads balance = 500 (version 1)
  Txn B (started at t=2): reads balance = 400 (version 2)
  Readers never block writers, writers never block readers`
      },

      apiDesign: {
        description: 'Transaction and isolation management',
        endpoints: [
          { method: 'BEGIN', path: 'db.beginTransaction(isolationLevel)', params: 'isolation: READ_COMMITTED | SERIALIZABLE', response: 'Transaction handle with snapshot' },
          { method: 'EXECUTE', path: 'txn.execute(sql, params)', params: 'SQL statement within transaction', response: 'Result set or affected row count' },
          { method: 'COMMIT', path: 'txn.commit()', params: '-', response: 'Transaction committed (WAL flushed)' },
          { method: 'ROLLBACK', path: 'txn.rollback()', params: '-', response: 'All changes undone' },
          { method: 'SAVEPOINT', path: 'txn.savepoint(name)', params: 'savepoint name', response: 'Partial rollback point within transaction' }
        ]
      },

      keyQuestions: [
        {
          question: 'What are the four isolation levels and what anomalies does each prevent?',
          answer: `**Read Uncommitted** (weakest):
- Allows dirty reads: See uncommitted changes from other transactions
- Almost never used in practice

  Txn A: UPDATE bal = 100  (not yet committed)
  Txn B: SELECT bal -> 100 (dirty read!)
  Txn A: ROLLBACK
  Txn B used a value (100) that never actually existed

**Read Committed** (most common default):
- Prevents dirty reads: Only see committed values
- Allows non-repeatable reads: Same query returns different results

  Txn A: SELECT bal -> 500
  Txn B: UPDATE bal = 400; COMMIT;
  Txn A: SELECT bal -> 400  (changed! non-repeatable)

**Repeatable Read**:
- Prevents non-repeatable reads: Same query returns same results within a transaction
- Allows phantom reads: New ROWS may appear

  Txn A: SELECT COUNT(*) FROM orders WHERE user=1 -> 5
  Txn B: INSERT INTO orders (user=1, ...); COMMIT;
  Txn A: SELECT COUNT(*) FROM orders WHERE user=1 -> 6 (phantom!)

  Note: PostgreSQL's Repeatable Read actually prevents phantoms too (uses snapshot isolation)

**Serializable** (strongest):
- Prevents all anomalies including phantoms
- Transactions execute as if serial (one after another)
- Implementation: 2PL (two-phase locking) or SSI (serializable snapshot isolation)

**Performance comparison**:

  Isolation Level    | Throughput | Locks Held | Anomaly Risk
  ────────────────── |────────────|────────────|─────────────
  Read Uncommitted   | Highest    | None       | All possible
  Read Committed     | High       | Short (row)| Non-repeatable, phantom
  Repeatable Read    | Medium     | Long (row) | Phantom (in theory)
  Serializable       | Lowest     | Range locks| None

**Interview tip**: Know that the default isolation level for PostgreSQL and MySQL is NOT serializable. If your design requires serializable, you must explicitly set it, and be prepared to discuss the performance cost.`
        },
        {
          question: 'How does MVCC work and why is it important?',
          answer: `**MVCC (Multi-Version Concurrency Control)**: Instead of locking rows, the database keeps multiple versions of each row. Readers see a consistent snapshot without blocking writers.

**How it works (PostgreSQL implementation)**:

  Each row has hidden columns:
  ┌──────────┬──────┬────────┬────────────┐
  │ data     │ xmin │ xmax   │ visible to │
  ├──────────┼──────┼────────┼────────────┤
  │ bal=500  │ 100  │ 105    │ txn < 105  │
  │ bal=400  │ 105  │ 110    │ 105 <= txn < 110 │
  │ bal=300  │ 110  │ ∞      │ txn >= 110 │
  └──────────┴──────┴────────┴────────────┘

  xmin: Transaction ID that created this version
  xmax: Transaction ID that deleted/replaced this version

  Txn 108 (snapshot at start): sees bal=400 (version from txn 105)
  Txn 112 (snapshot at start): sees bal=300 (version from txn 110)
  Both read without blocking each other or the writer!

**Key principle**: Writers create new versions, readers read old versions.

**Snapshot isolation**:
  At transaction start, take a snapshot of all committed transaction IDs
  During the transaction, only see data committed before the snapshot

  Time: ─────────────────────────>
  Txn A starts (snapshot)
     │                Txn B commits (writes new data)
     │                     │
     │ reads data ────────>│ A sees OLD data (snapshot)
     │                     │
  Txn A commits             Txn C starts -> sees Txn B's data

**Write conflicts under MVCC**:

  Txn A: Read row (version 1)
  Txn B: Read row (version 1)
  Txn A: Write row -> creates version 2, COMMIT
  Txn B: Write row -> CONFLICT! (version 1 was already replaced)
  -> Txn B must retry (optimistic conflict detection)

  This is "first writer wins" -- the second writer is aborted

**MVCC advantages**:
- Readers never block writers
- Writers never block readers
- High read throughput (no shared locks)
- Natural snapshot isolation

**MVCC disadvantages**:
- Storage overhead (multiple versions of each row)
- Need vacuum/garbage collection to clean old versions
- Long-running transactions hold old versions alive (bloat)
- Write-write conflicts require retries

**Used by**: PostgreSQL (heap + MVCC), MySQL/InnoDB (undo log), Oracle (rollback segments), CockroachDB, TiDB`
        },
        {
          question: 'What is two-phase commit (2PC) and why is it problematic?',
          answer: `**Two-phase commit** is a protocol for ensuring atomicity across multiple databases or services. Either ALL participants commit, or ALL abort.

**Protocol**:

  Phase 1: PREPARE
  ┌─────────────┐
  │ Coordinator │
  └──────┬──────┘
         │ "Can you commit?"
    ┌────┴────┬───────┐
    v         v       v
  ┌─────┐ ┌─────┐ ┌─────┐
  │ DB1 │ │ DB2 │ │ DB3 │
  │ YES │ │ YES │ │ YES │
  └──┬──┘ └──┬──┘ └──┬──┘
     │       │       │
     └───────┴───────┘
         All YES

  Phase 2: COMMIT
  ┌─────────────┐
  │ Coordinator │
  └──────┬──────┘
         │ "COMMIT!"
    ┌────┴────┬───────┐
    v         v       v
  ┌─────┐ ┌─────┐ ┌─────┐
  │ DB1 │ │ DB2 │ │ DB3 │
  │ OK  │ │ OK  │ │ OK  │
  └─────┘ └─────┘ └─────┘

  If ANY participant says NO in Phase 1:
  Coordinator sends ABORT to all -> all rollback

**The blocking problem**:
  After a participant votes YES in Phase 1:
  - It CANNOT abort on its own (promised to commit)
  - It CANNOT commit on its own (waiting for coordinator)
  - If coordinator crashes: PARTICIPANT IS STUCK (holding locks!)

  Coordinator crashes after Phase 1:
  ┌─────────────┐
  │ Coordinator │ <- DEAD
  └─────────────┘
  DB1: "I voted YES... now what?" (holding locks, can't proceed)
  DB2: "I voted YES... now what?" (holding locks, can't proceed)
  -> Locks held indefinitely until coordinator recovers

**Why 2PC is problematic for microservices**:
1. **Blocking**: Participants hold locks while waiting
2. **Single point of failure**: Coordinator crash blocks everyone
3. **Latency**: Minimum 2 round trips (prepare + commit)
4. **Tight coupling**: All participants must support 2PC protocol
5. **Availability**: If any participant is down, transaction fails

**Alternatives**:
1. **Saga pattern**: Sequence of local transactions with compensations
2. **TCC (Try-Confirm-Cancel)**: Reservation-based approach
3. **Outbox pattern**: Write event + data in same local transaction

**When 2PC is acceptable**:
- Databases on the same network (low latency, high reliability)
- XA transactions within a single application
- Financial systems where correctness > availability
- Small number of participants (2-3)

**Interview tip**: When asked about distributed transactions, explain 2PC and then immediately pivot to why sagas are preferred in microservice architectures.`
        },
        {
          question: 'When should you use ACID vs BASE, and can you use both in the same system?',
          answer: `**Decision framework**: Match the consistency requirement to the data and operation.

**Use ACID when**:
- Financial transactions (money must never be lost or duplicated)
- Inventory management (can't sell more than you have)
- User registration (unique email/username constraints)
- Order placement (consistent state across tables)
- Anything where "wrong data" is worse than "slow system"

**Use BASE when**:
- Social media feeds (2-second delay is invisible to users)
- Analytics and metrics (approximate counts are acceptable)
- Search indexing (index lag is normal)
- Recommendations (slightly stale data doesn't matter)
- Anything where "slow system" is worse than "slightly stale data"

**Polyglot persistence (use both!)**:

  E-Commerce System:
  ┌──────────────────────────────────────────────────────┐
  │                  Application Layer                    │
  └─────┬───────────┬────────────┬───────────┬───────────┘
        │           │            │           │
  ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐ ┌───▼────────┐
  │PostgreSQL │ │ Redis  │ │Cassandra │ │Elasticsearch│
  │  (ACID)   │ │ (BASE) │ │ (BASE)   │ │  (BASE)    │
  │           │ │        │ │          │ │            │
  │ Orders    │ │Sessions│ │ Activity │ │ Product    │
  │ Payments  │ │ Cache  │ │ Feed     │ │ Search     │
  │ Inventory │ │ Carts  │ │ Analytics│ │ Catalog    │
  └───────────┘ └────────┘ └──────────┘ └────────────┘
    Strong         Fast       Scalable    Full-text
    consistency    reads      writes      search

**Per-operation mapping**:

  Operation           | Model | Store       | Why
  ────────────────────|───────|─────────────|──────────────
  Place order         | ACID  | PostgreSQL  | Atomic multi-table
  Update cart         | BASE  | Redis       | Fast, ephemeral
  Post to feed        | BASE  | Cassandra   | High write volume
  Search products     | BASE  | Elasticsearch| Slight index lag OK
  Process payment     | ACID  | PostgreSQL  | Cannot lose money
  View recommendations| BASE  | Cassandra   | Stale data acceptable
  User registration   | ACID  | PostgreSQL  | Unique constraints
  Track page view     | BASE  | Kafka->Cass | High volume, approximate

**The hybrid pattern in practice**:
- ACID for the "write path" of critical operations
- BASE for the "read path" and derived data
- Event bus (Kafka) connects ACID writes to BASE read models
- Called "CQRS" (Command Query Responsibility Segregation)`
        },
        {
          question: 'Explain optimistic vs pessimistic locking and when to use each.',
          answer: `**Pessimistic locking**: Assume conflicts are likely. Lock data before reading/writing. Other transactions wait.

  Txn A: SELECT * FROM accounts WHERE id=1 FOR UPDATE;  <- LOCK!
         (A holds row lock)
  Txn B: SELECT * FROM accounts WHERE id=1 FOR UPDATE;  <- BLOCKED
         (B waits for A to release)
  Txn A: UPDATE accounts SET bal=400 WHERE id=1; COMMIT; <- UNLOCK
  Txn B: (now unblocked, reads latest value)

  Pros: No conflicts, no retries needed
  Cons: Reduced throughput, potential deadlocks, blocking

**Optimistic locking**: Assume conflicts are rare. Read without locking. Check for conflicts at write time.

  Implementation 1: Version column
  Txn A: SELECT bal, version FROM accounts WHERE id=1;
         -> bal=500, version=3
  Txn B: SELECT bal, version FROM accounts WHERE id=1;
         -> bal=500, version=3
  Txn A: UPDATE accounts SET bal=400, version=4
         WHERE id=1 AND version=3;  <- SUCCESS (1 row updated)
  Txn B: UPDATE accounts SET bal=450, version=4
         WHERE id=1 AND version=3;  <- FAILS (0 rows, version changed)
  Txn B must retry: re-read, recalculate, re-update

  Implementation 2: CAS (Compare-And-Swap)
  if current_value == expected_value:
      set new_value   <- atomic operation
  else:
      retry

**Decision matrix**:

  Factor                | Pessimistic      | Optimistic
  ──────────────────────|──────────────────|──────────────────
  Conflict frequency    | High (>10%)      | Low (<5%)
  Transaction duration  | Long             | Short
  Retry cost            | N/A (no retries) | Must handle retries
  Throughput            | Lower (blocking) | Higher (no locks)
  Deadlock risk         | Yes              | No
  Implementation        | FOR UPDATE       | Version/ETag/CAS

**Use pessimistic when**:
- High contention (popular items, hot rows)
- Transaction must succeed on first attempt
- Complex multi-step transactions that are expensive to retry

**Use optimistic when**:
- Low contention (most rows are not contested)
- Short transactions (read, modify, write)
- Can afford to retry on conflict
- Web APIs (ETag-based updates)

**Deadlock prevention** (for pessimistic):
  Always acquire locks in the same order:
  Bad:  Txn A locks row 1 then row 2
        Txn B locks row 2 then row 1 -> DEADLOCK
  Good: Both lock row 1 first, then row 2

**Interview tip**: Mention optimistic locking for web APIs (ETags) and pessimistic locking for banking systems. Explain that most modern web applications use optimistic locking because conflict rates are typically < 1%.`
        }
      ],

      basicImplementation: {
        title: 'Single-Database ACID Transactions',
        description: 'All data in one PostgreSQL database with ACID transactions and default Read Committed isolation.',
        svgTemplate: 'singleDatabase',
        problems: [
          'Single database limits write throughput',
          'No horizontal scaling for writes',
          'Default isolation (Read Committed) allows non-repeatable reads',
          'Cannot support globally distributed data'
        ]
      },

      advancedImplementation: {
        title: 'CQRS with ACID Writes and BASE Reads',
        description: 'ACID database for writes, event bus propagates changes to BASE read stores. Different consistency levels per operation.',
        svgTemplate: 'shardedDatabase',
        keyPoints: [
          'PostgreSQL for ACID writes (orders, payments, inventory)',
          'Kafka event bus propagates changes to read models',
          'Elasticsearch for BASE reads (search, catalog browsing)',
          'Redis for fast cached reads (sessions, carts)',
          'MVCC enables high-concurrency reads without lock contention'
        ]
      },

      discussionPoints: [
        {
          topic: 'ACID vs BASE Trade-offs',
          points: [
            'ACID: Correct but slower (coordination overhead)',
            'BASE: Fast and available but requires conflict resolution',
            'Most systems need both: ACID for critical paths, BASE for read-heavy',
            'The Saga pattern replaces distributed ACID transactions in microservices',
            'CQRS naturally separates ACID writes from BASE reads'
          ]
        },
        {
          topic: 'Isolation Level Selection',
          points: [
            'Read Committed: Default, good for most OLTP workloads',
            'Repeatable Read: Use for reports and aggregations within a transaction',
            'Serializable: Use only when correctness requires it (constraints, invariants)',
            'Serializable has highest conflict rate but prevents all anomalies',
            'PostgreSQL SSI (Serializable Snapshot Isolation) is better than traditional 2PL'
          ]
        },
        {
          topic: 'Interview Tips',
          points: [
            'Never say "just use transactions" without specifying the isolation level',
            'Mention MVCC to show you understand how databases implement isolation',
            'Explain why 2PC is problematic and pivot to sagas for microservices',
            'Use the polyglot persistence pattern: right store for each data type',
            'Discuss optimistic locking for web APIs and pessimistic for financial systems'
          ]
        }
      ],

      comparisonTables: [
        {
          id: 'acid-vs-base-comp',
          title: 'ACID vs BASE',
          left: {
            title: 'ACID',
            icon: 'lock',
            color: '#3b82f6',
            items: [
              { label: 'Atomicity', value: 'All or nothing — no partial commits' },
              { label: 'Consistency', value: 'Data always valid per constraints' },
              { label: 'Isolation', value: 'Concurrent txns don\'t interfere' },
              { label: 'Durability', value: 'Committed data survives crashes' },
              { label: 'Use When', value: 'Financial, orders, critical data' },
              { label: 'Examples', value: 'PostgreSQL, MySQL, Oracle, SQL Server' }
            ]
          },
          right: {
            title: 'BASE',
            icon: 'globe',
            color: '#10b981',
            items: [
              { label: 'Basically Available', value: 'System always responds' },
              { label: 'Soft state', value: 'State may change without input' },
              { label: 'Eventually consistent', value: 'Will converge given time' },
              { label: 'Trade-off', value: 'Availability over consistency' },
              { label: 'Use When', value: 'Social, analytics, caching' },
              { label: 'Examples', value: 'Cassandra, DynamoDB, CouchDB, Riak' }
            ]
          }
        }
      ],
      comparisonCards: [
        {
          title: 'ACID Properties Explained',
          items: [
            { name: 'Atomicity', description: 'All writes in a transaction execute as one unit — "all or nothing". If any operation fails, the entire transaction is rolled back. No partial commits.' },
            { name: 'Consistency', description: 'Every transaction moves the database from one valid state to another. All defined rules, constraints, and invariants are preserved. Different from CAP "consistency".' },
            { name: 'Isolation', description: 'Concurrent transactions are isolated from each other. The strictest level is "serializability" (each transaction acts like it is the only one running). In practice, weaker isolation levels are used for performance.' },
            { name: 'Durability', description: 'Once a transaction is committed, data is persisted even after system failure. In distributed systems, this means replication to multiple nodes.' }
          ]
        },
        {
          title: 'System Design Acronyms',
          items: [
            { name: 'CAP', description: 'Consistency, Availability, Partition tolerance — distributed systems can only guarantee two of three. Network partitions are inevitable, so the real choice is CP vs AP.' },
            { name: 'BASE', description: 'Basically Available, Soft state, Eventually consistent — the NoSQL alternative to ACID. States will be consistent over time, not immediately.' },
            { name: 'SOLID', description: 'Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion — five OOP design principles for maintainable code.' },
            { name: 'KISS', description: 'Keep It Simple, Stupid — avoid unnecessary complexity. Focus on user needs and stakeholder requirements over clever engineering.' }
          ]
        }
      ],
      visualCards: [
        {
          id: 'isolation-levels',
          title: 'Transaction Isolation Levels',
          color: '#3b82f6',
          icon: 'lock',
          items: [
            { label: 'Read Uncommitted', value: 'Dirty reads possible', bar: 15 },
            { label: 'Read Committed', value: 'No dirty reads', bar: 40 },
            { label: 'Repeatable Read', value: 'No non-repeatable reads', bar: 65 },
            { label: 'Snapshot Isolation', value: 'MVCC — consistent snapshots', bar: 80 },
            { label: 'Serializable', value: 'Full isolation — slowest', bar: 100 }
          ]
        }
      ],
      patternCards: [
        {
          id: 'two-phase-commit', name: 'Two-Phase Commit (2PC)', icon: 'check', color: '#ef4444',
          description: 'Coordinator asks all nodes to prepare, then commit. Atomic across nodes.',
          useWhen: 'Distributed transactions needing ACID guarantees',
          example: 'Prepare phase: all say YES → Commit phase: all commit'
        },
        {
          id: 'saga-acid', name: 'Saga Pattern', icon: 'gitBranch', color: '#10b981',
          description: 'Sequence of local ACID transactions with compensating actions.',
          useWhen: 'Microservices where 2PC is too slow or unavailable',
          example: 'Order→Pay→Ship — if Ship fails, compensate: Refund→Cancel'
        }
      ],
      staticDiagrams: [
        {
          id: 'acid-properties',
          title: 'ACID Properties',
          description: 'Atomicity, Consistency, Isolation, Durability — the four guarantees of database transactions',
          src: '/diagrams/acid-vs-base/acid-properties.svg',
          type: 'architecture'
        }
      ]
    },
  ];

  // System Design Problem Categories
