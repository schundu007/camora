// System design problem categories, category map, and common designs

export const systemDesignProblemCategories = [
    { id: 'social', name: 'Social Media & Networking', icon: 'users', color: '#3b82f6' },
    { id: 'streaming', name: 'Streaming & Media', icon: 'play', color: '#ef4444' },
    { id: 'communication', name: 'Communication & Messaging', icon: 'messageSquare', color: '#8b5cf6' },
    { id: 'ecommerce', name: 'E-commerce & Marketplace', icon: 'shoppingCart', color: '#f59e0b' },
    { id: 'infrastructure', name: 'Infrastructure & Tools', icon: 'server', color: '#10b981' },
    { id: 'storage', name: 'Storage & Data', icon: 'database', color: '#06b6d4' },
  ];

export const systemDesignProblemCategoryMap = {
    // Social Media & Networking
    'twitter': 'social',
    'instagram': 'social',
    'facebook-newsfeed': 'social',
    'linkedin': 'social',
    'tinder': 'social',
    // Streaming & Media
    'youtube': 'streaming',
    'netflix': 'streaming',
    'spotify': 'streaming',
    // Communication & Messaging
    'whatsapp': 'communication',
    'chat-system': 'communication',
    'zoom': 'communication',
    'notification-system': 'communication',
    // E-commerce & Marketplace
    'amazon': 'ecommerce',
    'airbnb': 'ecommerce',
    'doordash': 'ecommerce',
    'yelp': 'ecommerce',
    'ticketmaster': 'ecommerce',
    'hotel-booking': 'ecommerce',
    'uber': 'ecommerce',
    // Infrastructure & Tools
    'url-shortener': 'infrastructure',
    'rate-limiter': 'infrastructure',
    'unique-id-generator': 'infrastructure',
    'typeahead': 'infrastructure',
    'google-maps': 'infrastructure',
    'leaderboard': 'infrastructure',
    'twitter-trends': 'infrastructure',
    'google-docs': 'infrastructure',
    // Storage & Data
    'dropbox': 'storage',
    'pastebin': 'storage',
    'key-value-store': 'storage',
    'web-crawler': 'storage',
    'news-aggregator': 'storage',
    'search-engine': 'storage',
    'payment-system': 'storage',
    // Additional Infrastructure & Tools
    'ad-click-aggregation': 'infrastructure',
    'autocomplete-system': 'infrastructure',
    'metrics-monitoring': 'infrastructure',
    'tiny-url': 'infrastructure',
    'top-k-leaderboard': 'infrastructure',
    // Additional E-commerce & Marketplace
    'ecommerce-platform': 'ecommerce',
    'proximity-service': 'ecommerce',
    // Additional Communication & Messaging
    'messaging-app': 'communication',
    // Additional Storage & Data
    'payment-gateway': 'storage',
  };

  // Common System Designs
export const systemDesigns = [
    {
      id: 'url-shortener',
      title: 'URL Shortener',
      subtitle: 'TinyURL / Bit.ly',
      icon: 'link',
      color: '#10b981',
      difficulty: 'Easy',
      description: 'Design a service that creates short aliases for long URLs and redirects users to the original URL.',

      // Comprehensive Editorial Content
      introduction: `URL shortener is one of the most frequently asked system design interview questions.

It appears simple on the surface, but interviewers expect you to go deep on:
• How to generate unique short codes at scale
• How to handle billions of redirects with low latency
• How to avoid collisions across distributed servers

This guide covers two approaches:
• **Basic implementation** — simple but has scalability flaws
• **Advanced implementation** — uses ZooKeeper for collision-free ID generation

Being able to discuss the flaws of the basic approach and how the advanced approach solves them demonstrates the depth of understanding most candidates lack.`,

      functionalRequirements: [
        'Given a long URL, create a short URL',
        'Given a short URL, redirect to the long URL',
        'Custom short URL aliases (optional)',
        'URL expiration (optional)'
      ],

      nonFunctionalRequirements: [
        'Very low latency (< 100ms)',
        'Very high availability (99.99%)',
        'Short URLs should not be predictable',
        'Scale to handle billions of URLs'
      ],

      dataModel: {
        description: 'Simple table storing URL mappings',
        schema: `urls {
  id: bigint (primary key)
  shortUrl: varchar(7) (indexed, unique)
  longUrl: varchar(2048)
  userId: bigint (optional)
  createdAt: timestamp
  expiresAt: timestamp (nullable)
  clickCount: bigint (default 0)
}`
      },

      apiDesign: {
        description: 'RESTful API - simple, stateless, supports caching',
        endpoints: [
          {
            method: 'POST',
            path: '/api/v1/shorten',
            params: '{ long_url: string, custom_alias?: string, expire_at?: string }',
            response: '201 Created → { short_url: "https://short.ly/abc123", long_url, created_at, expire_at }',
            notes: 'Creates a new short URL mapping. Check for custom alias collision. Rate limit: 100/hour per user.'
          },
          {
            method: 'GET',
            path: '/{short_code}',
            params: 'short_code in URL path',
            response: '301 Permanent Redirect → Location: https://original-long-url.com/path',
            notes: 'Cache-first lookup (Redis → DB). Async log click event to Kafka. Return 404 if expired or not found.'
          },
          {
            method: 'GET',
            path: '/api/v1/stats/{short_code}',
            params: 'short_code in URL path',
            response: '200 OK → { total_clicks: 15420, unique_visitors: 8930, created_at, last_accessed, top_countries: [...] }',
            notes: 'Read from analytics DB (ClickHouse). Data may lag 5-10 minutes behind real-time.'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How long should the short URL be?',
          answer: `Need to know scale to answer this:
• Example: 1,000 URLs/second
• 1,000 × 60 × 60 × 24 × 365 = 31.5 billion URLs/year
• 10:1 read:write ratio = ~300 billion reads/year

Using Base62 (a-z, A-Z, 0-9 = 62 characters):
• 6 characters: 62⁶ = 56 billion unique URLs
• 7 characters: 62⁷ = 3.5 trillion unique URLs

7 characters is sufficient for many years of operation.`
        },
        {
          question: 'What characters can we use?',
          answer: `Alphanumeric Base62:
• a-z: 26 characters
• A-Z: 26 characters
• 0-9: 10 characters
• Total: 62 characters

Avoid special characters (/, +, =) as they cause URL encoding issues.`
        }
      ],

      basicImplementation: {
        title: 'Basic Implementation',
        description: 'Client → Load Balancer → Web Server → Count Cache → Database. The web server requests a base-10 number from the count cache, converts it to base-62, and uses it as the short URL.',
        svgTemplate: 'urlShortener',
        problems: [
          'Single point of failure in web server, cache, and database',
          'When horizontally scaled, distributed caches can return same number → COLLISION',
          'No coordination among caches causes duplicate short URLs',
          'Collisions are unacceptable in this system'
        ]
      },

      advancedImplementation: {
        title: 'Advanced Implementation with ZooKeeper',
        description: 'ZooKeeper allocates ID ranges to web servers, avoiding collisions. Each server generates IDs independently.',
        svgTemplate: 'urlShortenerAdvanced',
        keyPoints: [
          'ZooKeeper allocates ranges of 1 million IDs to each web server',
          'Each server generates IDs independently within its range - no collisions',
          'If a server dies, losing 1M IDs is acceptable given 3.5 trillion total',
          'ZooKeeper only contacted when server needs new range (1M requests/contact)',
          'Much less load than per-request coordination'
        ],
        databaseChoice: 'NoSQL (Cassandra) preferred for high read volume; SQL requires sharding',
        caching: 'Redis/Memcached with LRU eviction for popular URLs'
      },

      createFlow: {
        title: 'Create URL Flow',
        steps: [
          'Client makes POST request with long URL to load balancer',
          'Load balancer distributes request to a web server',
          'Web server generates short URL from its allocated range (converts to base62)',
          'Web server saves long URL + short URL in database',
          'Optionally cache the mapping with TTL',
          'Web server responds with the newly created short URL'
        ]
      },

      redirectFlow: {
        title: 'Redirect URL Flow',
        steps: [
          'Client makes GET request with short URL',
          'Load balancer routes to a web server',
          'Web server checks if short URL exists in cache',
          'If cache miss, retrieve long URL from database',
          'Update cache with the mapping',
          'Web server responds with 301 Permanent Redirect to long URL'
        ]
      },

      // ── Back-of-Envelope Estimation ──
      // Sources: Grokking the System Design Interview (Educative), systemdesign.one, ByteByteGo
      estimation: {
        title: 'Capacity Planning',
        assumptions: '500M new URL shortenings per month. 100:1 read-to-write ratio. Average URL record ~500 bytes. 5-year retention.',
        calculations: [
          { label: 'Write QPS', value: '~200/s', detail: '500M per month ÷ (30 × 24 × 3600) ≈ 200 writes/sec' },
          { label: 'Read QPS', value: '~20K/s', detail: '200 writes/s × 100:1 ratio = 20,000 redirects/sec' },
          { label: 'URLs over 5 years', value: '30 billion', detail: '500M/month × 12 × 5 = 30B total URLs stored' },
          { label: 'Storage needed', value: '~15 TB', detail: '30B URLs × 500 bytes per record = 15 TB' },
          { label: 'Incoming bandwidth', value: '~100 KB/s', detail: '200 writes/s × 500 bytes = 100 KB/s ingress' },
          { label: 'Outgoing bandwidth', value: '~10 MB/s', detail: '20K reads/s × 500 bytes = 10 MB/s egress' },
          { label: 'Cache memory (20%)', value: '~170 GB', detail: '20% of 1.7B daily requests × 500 bytes (Pareto 80/20 rule)' },
        ]
      },

      // ── Algorithm Approaches ──
      // Sources: systemdesign.one, Grokking SDI, System Design Primer (Donne Martin)
      algorithmApproaches: [
        {
          name: 'Base62 Counter Encoding',
          description: `Assign each URL an auto-incrementing integer ID, then encode it as a Base62 string.

**How it works:**
• Use characters [a-z, A-Z, 0-9] — 62 possible characters
• 7 characters → 62⁷ = ~3.5 trillion unique short URLs
• Time complexity: O(1) for fixed-length conversion`,
          pros: ['Simple implementation — just encode an integer', 'Zero collisions — each ID is unique', 'Short codes grow predictably with usage'],
          cons: ['Predictable — users can enumerate sequential URLs', 'Requires a centralized counter or coordination service (ZooKeeper)', 'Counter is a single point of failure without distribution']
        },
        {
          name: 'MD5 Hashing + Truncation',
          description: `Compute MD5 hash (128 bits) of the long URL, then Base62-encode and truncate.

**How it works:**
• MD5 produces a 128-bit hash → Base62 gives >21 characters
• Take the first 6-7 characters as the short code
• Deterministic: same input always produces same output

**Limitation:** Truncation introduces collision risk (~1 in 62⁷ per pair). Must handle with retry + append strategy.`,
          pros: ['Deterministic — same long URL always maps to same short code', 'No central counter needed — stateless generation', 'Works well for deduplication of identical URLs'],
          cons: ['Truncation causes collisions — must handle with retry + append', 'MD5 produces 21+ chars, truncating to 6-7 loses entropy', 'Collision resolution adds complexity and latency on write path']
        },
        {
          name: 'Pre-generated Key Service (KGS)',
          description: `A dedicated service pre-generates millions of unique random keys in advance.

**How it works:**
• Store unused keys in a database
• On each URL creation, atomically pop a key from the unused pool
• Move used keys to a separate "used" table
• Allocate key ranges to app servers in bulk to reduce contention

This gives O(1) key generation with zero collision handling.`,
          pros: ['O(1) key generation — just a database read', 'No collision handling needed — all keys are unique by design', 'App servers can cache key ranges locally for fast, independent generation'],
          cons: ['Requires managing a separate key database and service', 'KGS itself becomes a single point of failure (mitigate with replicas)', 'If an app server dies, its unused key range is lost (acceptable at 3.5T total)']
        }
      ],

      // ── High-Level Architecture Layers ──
      // Source: systemdesign.one, ByteByteGo
      architectureLayers: [
        { name: 'DNS + Smart Routing', description: `Routes users to the nearest data center.
• Uses weighted, latency-based, or geo DNS (e.g., Route 53)
• Critical for achieving global <100ms redirect latency` },
        { name: 'CDN (Pull-based)', description: `Caches popular redirect responses at edge locations worldwide.
• CloudFront or Cloudflare
• Serves ~80% of redirect traffic with sub-50ms latency` },
        { name: 'Load Balancer', description: `Active-active L7 load balancer with SSL termination.
• ALB or Nginx
• Distributes traffic using round-robin or least-connections` },
        { name: 'API Servers (Stateless)', description: `Horizontally scalable application servers with no session state.
• **Write path:** validate input → generate short code → store mapping
• **Read path:** cache lookup → DB fallback → 301 redirect` },
        { name: 'Cache Layer (Redis/Memcached)', description: `In-memory cache using cache-aside pattern.
• Stores hot short_code → long_url mappings
• 80/20 rule: cache top 20% URLs to serve 80% of traffic
• LRU eviction, TTL of 1 day` },
        { name: 'Data Store (NoSQL/SQL)', description: `Primary persistent storage for URL mappings.
• **Preferred:** NoSQL (Cassandra/DynamoDB) for high write throughput
• **Alternative:** PostgreSQL with consistent hash sharding
• 3x replication for durability` },
        { name: 'Analytics Pipeline (Async)', description: `Captures click events asynchronously — never blocks redirects.
• Kafka queue with metadata (IP, User-Agent, Referer, timestamp)
• Batch processing via Spark → data warehouse (Redshift/Snowflake)
• Powers reporting dashboards` }
      ],

      // ── Deep Dive Topics ──
      // Sources: systemdesign.one, Grokking SDI
      deepDiveTopics: [
        {
          topic: 'Caching Strategy',
          detail: `Use cache-aside pattern with Redis or Memcached.

**Read flow:**
• Check cache first — O(1) lookup
• On miss: query DB, then populate cache with TTL of 1 day

**Key principles:**
• Apply 80/20 rule — cache top 20% URLs to serve 80% of traffic
• LRU eviction when memory is full
• Use bloom filter before cache lookup to avoid thrashing on single-access URLs
• At ~20K read QPS, caching reduces DB load to ~4K QPS (80% hit rate)`
        },
        {
          topic: 'Database Partitioning',
          detail: `**Avoid:** Range-based partitioning (by first character) — causes hot partitions.

**Use instead:** Consistent hashing on short_code as partition key.
• Distributes data and traffic uniformly across shards
• Each shard has read replicas with leader-follower replication
• Connection pooling (PgBouncer/ProxySQL) handles thousands of concurrent connections

**Sizing:** For 15TB over 5 years, start with 4 shards (~4TB each) and pre-provision for 16.`
        },
        {
          topic: 'Rate Limiting & Security',
          detail: `**Rate limiting:**
• Implement at API gateway layer (not in app code)
• Token bucket algorithm: N requests/minute per API key or IP
• Prevents DDoS and resource abuse

**Security measures:**
• Scan URLs against malware/phishing blacklists (VirusTotal, Google Safe Browsing)
• Sanitize input to prevent XSS in custom aliases
• Use JWT tokens for authenticated endpoints
• Apply principle of least privilege to all service accounts`
        },
        {
          topic: 'Analytics & Monitoring',
          detail: `**Rule:** Never write analytics synchronously on the redirect path — it would double latency.

**Async pipeline:**
• Publish click events to Kafka (IP, User-Agent, Referer, timestamp)
• Batch process with Spark Streaming → aggregate hourly
• Write to data warehouse (Redshift/Snowflake) for dashboards

**Data lifecycle:**
• Archive cold data (last_visited > 3 years) to S3

**Key metrics to monitor:**
• QPS, cache hit ratio, p99 latency, error rate
• Use centralized logging (Datadog/ELK)`
        }
      ],

      // ── Trade-off Decisions ──
      // Sources: systemdesign.one, Grokking SDI
      tradeoffDecisions: [
        { choice: '301 vs 302 Redirect', picked: '301 Permanent Redirect', reason: `301 tells the browser to cache the redirect. Subsequent visits skip our server, reducing load.

**Trade-off:** If the target URL changes, cached 301s in browsers won't update. Use 302 if you need server-side analytics on every request.

**Recommendation:** 301 + async analytics is the preferred approach.` },
        { choice: 'NoSQL vs SQL for URL store', picked: 'NoSQL (Cassandra/DynamoDB)', reason: `URL shortener data is non-relational — it's a simple key-value lookup.

**Why NoSQL wins:**
• Horizontal scaling out of the box
• High write throughput
• Flexible schema

**Trade-off:** No JOINs for analytics (solve with a separate data warehouse). SQL with sharding is viable but requires more operational effort.` },
        { choice: 'Sync vs Async Analytics', picked: 'Async via Kafka', reason: `Redirect latency must stay under 100ms.

• Synchronous DB write on every click adds 5-20ms
• At 20K QPS, this becomes a bottleneck

Kafka decouples click capture from processing.

**Trade-off:** Analytics data lags 5-10 minutes behind real-time. Acceptable for dashboards, not for real-time abuse detection.` },
        { choice: 'Consistency vs Availability', picked: 'Eventual Consistency (AP)', reason: `Per CAP theorem, we prioritize availability — the redirect must always work.

• A new short URL may take milliseconds to propagate across regions
• Brief window where a just-created URL returns 404 in other regions

**Mitigation:** Sticky sessions or direct-to-source routing for new URLs.` }
      ],

      // ── Common Follow-up Interview Questions ──
      // Sources: Grokking SDI, ByteByteGo, system-design-primer
      interviewFollowups: [
        { question: 'How do you handle duplicate long URLs?', answer: `Store an inverted index (long_url → short_code) alongside the primary mapping.

**How it works:**
• Before generating a new code, check if the long URL already exists
• If found, return the existing short code
• Deduplication can reduce storage by 30-40%

**Trade-off:** 2x storage for the inverted index, but saves on total URL count.` },
        { question: 'How do you prevent abuse and malicious URLs?', answer: `Multi-layer defense:

• **Rate limiting** — N shortens/minute per API key or IP (token bucket algorithm)
• **URL scanning** — Check against malware/phishing blacklists (VirusTotal, Google Safe Browsing)
• **CAPTCHA** — Trigger after repeated failures from same source
• **Anomaly detection** — Flag accounts with sudden 100x spike in creation rate` },
        { question: 'How do you clean up expired URLs?', answer: `Two approaches combined:

**1. Lazy deletion:**
• On redirect, check expires_at timestamp
• Return 404 if expired

**2. Background cleanup:**
• Runs during low-traffic hours (2-5 AM)
• Deletes expired rows in batches to avoid lock contention
• Archive cold data (last_visited > 3 years) to S3

**Important:** Never recycle short codes — reuse causes broken links.` },
        { question: 'What happens when the database is down?', answer: `**For reads (redirects):**
• Cache layer (Redis) serves 80%+ of traffic independently
• Cache misses return 503 until DB recovers

**For writes:**
• Queue new shorten requests in Kafka
• Process when DB is back (with TTL for stale requests)

**Failover strategy:**
• Leader-follower replication with automated failover (Patroni / DynamoDB global tables)
• Target: RTO < 60 seconds, RPO near zero` },
        { question: 'How do you scale from 200 to 200,000 write QPS?', answer: `Progressive scaling strategy:

• **Step 1:** Vertical scaling — bigger DB instance (up to ~5K QPS)
• **Step 2:** Read replicas — offload redirect reads from primary
• **Step 3:** Database sharding — consistent hash on short_code across N shards
• **Step 4:** KGS with pre-allocated key ranges — eliminates coordination overhead
• **Step 5:** Geographic distribution — multiple regions with local DBs and async replication

**Key principle:** Benchmark before adding complexity at each stage.` }
      ],

      // ── Code Implementations ──
      // Note: These are simplified reference implementations showing the core shortening logic.
      // Production systems would add error handling, connection pooling, input validation, and rate limiting.
      codeExamples: {
        python: `import hashlib, string, redis
from fastapi import FastAPI, HTTPException, Response

app = FastAPI()
cache = redis.Redis(host='localhost', port=6379, decode_responses=True)
CHARS = string.ascii_letters + string.digits  # Base62

def encode_base62(num: int) -> str:
    if num == 0: return CHARS[0]
    result = []
    while num > 0:
        result.append(CHARS[num % 62])
        num //= 62
    return ''.join(reversed(result))

def generate_short_code(long_url: str) -> str:
    hash_hex = hashlib.md5(long_url.encode()).hexdigest()
    return encode_base62(int(hash_hex[:12], 16))[:7]

@app.post("/api/v1/shorten")
async def shorten(long_url: str):
    existing = cache.get(f"long:{long_url}")
    if existing: return {"short_url": f"https://short.ly/{existing}"}
    code = generate_short_code(long_url)
    cache.set(f"short:{code}", long_url, ex=86400*30)
    cache.set(f"long:{long_url}", code, ex=86400*30)
    return {"short_url": f"https://short.ly/{code}"}

@app.get("/{short_code}")
async def redirect(short_code: str):
    long_url = cache.get(f"short:{short_code}")
    if not long_url: raise HTTPException(404, "URL not found")
    return Response(status_code=301, headers={"Location": long_url})`,

        javascript: `const express = require('express');
const Redis = require('ioredis');
const crypto = require('crypto');
const app = express();
const redis = new Redis();
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function encodeBase62(num) {
  let result = '';
  while (num > 0) { result = CHARS[num % 62] + result; num = Math.floor(num / 62); }
  return result || CHARS[0];
}
function generateShortCode(longUrl) {
  const hash = crypto.createHash('md5').update(longUrl).digest('hex');
  return encodeBase62(parseInt(hash.substring(0, 12), 16)).substring(0, 7);
}

app.post('/api/v1/shorten', express.json(), async (req, res) => {
  const { long_url } = req.body;
  const existing = await redis.get(\`long:\${long_url}\`);
  if (existing) return res.json({ short_url: \`https://short.ly/\${existing}\` });
  const code = generateShortCode(long_url);
  await redis.set(\`short:\${code}\`, long_url, 'EX', 30 * 86400);
  await redis.set(\`long:\${long_url}\`, code, 'EX', 30 * 86400);
  res.json({ short_url: \`https://short.ly/\${code}\` });
});

app.get('/:code', async (req, res) => {
  const longUrl = await redis.get(\`short:\${req.params.code}\`);
  if (!longUrl) return res.status(404).json({ error: 'Not found' });
  res.redirect(301, longUrl);
});
app.listen(3000);`,

        java: `import java.security.MessageDigest;
import java.util.concurrent.ConcurrentHashMap;

public class URLShortener {
    private static final String CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private final ConcurrentHashMap<String, String> shortToLong = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> longToShort = new ConcurrentHashMap<>();

    public static String encodeBase62(long num) {
        StringBuilder sb = new StringBuilder();
        while (num > 0) { sb.insert(0, CHARS.charAt((int)(num % 62))); num /= 62; }
        return sb.length() == 0 ? String.valueOf(CHARS.charAt(0)) : sb.toString();
    }

    public String shorten(String longUrl) throws Exception {
        String existing = longToShort.get(longUrl);
        if (existing != null) return "https://short.ly/" + existing;
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(longUrl.getBytes());
        long hashVal = 0;
        for (int i = 0; i < 6; i++) hashVal = (hashVal << 8) | (digest[i] & 0xFF);
        String code = encodeBase62(hashVal).substring(0, 7);
        shortToLong.put(code, longUrl);
        longToShort.put(longUrl, code);
        return "https://short.ly/" + code;
    }

    public String resolve(String code) {
        return shortToLong.getOrDefault(code, null);
    }
}`,

        cpp: `#include <string>
#include <unordered_map>
#include <openssl/md5.h>

class URLShortener {
    static const std::string CHARS;
    std::unordered_map<std::string, std::string> shortToLong;
    std::unordered_map<std::string, std::string> longToShort;
public:
    static std::string encodeBase62(uint64_t num) {
        if (num == 0) return std::string(1, CHARS[0]);
        std::string result;
        while (num > 0) { result = CHARS[num % 62] + result; num /= 62; }
        return result;
    }
    std::string shorten(const std::string& longUrl) {
        auto it = longToShort.find(longUrl);
        if (it != longToShort.end()) return "https://short.ly/" + it->second;
        unsigned char digest[MD5_DIGEST_LENGTH];
        MD5((unsigned char*)longUrl.c_str(), longUrl.size(), digest);
        uint64_t hashVal = 0;
        for (int i = 0; i < 6; i++) hashVal = (hashVal << 8) | digest[i];
        std::string code = encodeBase62(hashVal).substr(0, 7);
        shortToLong[code] = longUrl;
        longToShort[longUrl] = code;
        return "https://short.ly/" + code;
    }
    std::string resolve(const std::string& code) {
        auto it = shortToLong.find(code);
        return it != shortToLong.end() ? it->second : "";
    }
};
const std::string URLShortener::CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";`
      },

      discussionPoints: [
        {
          topic: 'Analytics',
          points: [
            'Track click counts per URL for caching decisions',
            'Store IP addresses for geographic distribution insights',
            'Determine optimal cache locations based on traffic patterns'
          ]
        },
        {
          topic: 'Rate Limiting',
          points: [
            'Prevent DDoS attacks by malicious users',
            'Limit URL creation per user/IP',
            'Use token bucket or sliding window algorithms'
          ]
        },
        {
          topic: 'Security Considerations',
          points: [
            'Add random suffix to prevent URL prediction/enumeration',
            'Tradeoff: longer URLs vs security (worth discussing)',
            'Scan long URLs for malware/phishing before creating short URL',
            'Implement URL blacklisting'
          ]
        }
      ],

      // Keep backward compatibility
      requirements: ['Shorten long URLs', '301 redirect', 'Analytics', 'Custom aliases', 'Expiration support'],
      components: ['Load Balancer', 'Web Servers', 'ZooKeeper', 'Database (NoSQL)', 'Cache (Redis)'],
      keyDecisions: [
        'Use ZooKeeper for distributed ID range allocation to avoid collisions',
        'Base62 encoding for 7-character short URLs (3.5 trillion unique)',
        'NoSQL database (Cassandra) for horizontal scaling',
        'Redis cache with LRU eviction for popular URLs',
        '301 Permanent Redirect for SEO and caching benefits'
      ],
      edgeCases: [
        { scenario: 'Hash collision on short URL generation', impact: 'Two different long URLs map to same short URL, causing incorrect redirects', mitigation: 'Check for collision before storing, append counter or use base62 of auto-increment ID' },
        { scenario: 'Expired URL reuse', impact: 'Recycled short URLs may still be cached in browsers or CDNs, serving stale redirects', mitigation: 'Use long TTLs before recycling, include generation counter in URL, purge CDN on recycle' },
        { scenario: 'Bot abuse creating millions of URLs', impact: 'Storage exhaustion and potential DDoS, wasting ID space', mitigation: 'Rate limit per IP/user, require auth for bulk creation, CAPTCHA for anonymous users' },
        { scenario: 'Custom alias conflicts', impact: 'Popular vanity URLs contested by multiple users', mitigation: 'First-come-first-served with reservation, trademark checking, paid premium aliases' },
      ],
      tradeoffs: [
        { decision: 'Base62 encoding vs MD5 hash truncation', pros: 'Base62 gives shorter predictable-length URLs; MD5 gives uniform distribution', cons: 'Base62 needs counter coordination; MD5 truncation increases collision probability', recommendation: 'Use base62 of auto-increment ID for simplicity, MD5 only if IDs must be non-sequential' },
        { decision: 'Read-through cache vs cache-aside', pros: 'Read-through simplifies app logic; cache-aside gives more control', cons: 'Read-through couples cache to DB; cache-aside requires explicit invalidation', recommendation: 'Cache-aside for URL lookups since reads dominate and data rarely changes' },
        { decision: '301 vs 302 redirect', pros: '301 reduces server load via browser caching; 302 lets you track every click', cons: '301 makes analytics impossible; 302 increases server load', recommendation: '302 if analytics matter, 301 for pure shortening without tracking' },
      ],
      layeredDesign: [
        { name: 'API Gateway Layer', purpose: 'Handle URL creation requests and redirect lookups with rate limiting', components: ['REST API', 'Rate Limiter', 'Auth Middleware'] },
        { name: 'Application Layer', purpose: 'URL generation, validation, and analytics processing', components: ['URL Generator', 'Custom Alias Handler', 'Analytics Collector'] },
        { name: 'Cache Layer', purpose: 'Hot URL lookup cache for sub-millisecond redirects', components: ['Redis Cluster', 'Local LRU Cache', 'Cache Warmer'] },
        { name: 'Storage Layer', purpose: 'Persistent URL mapping and analytics data', components: ['NoSQL Store (DynamoDB)', 'Analytics DB', 'Blob Storage (QR codes)'] },
      ],
    },
    {
      id: 'twitter',
      title: 'Twitter / X',
      subtitle: 'Social Media Feed',
      icon: 'messageSquare',
      color: '#3b82f6',
      difficulty: 'Hard',
      description: 'Design a social media platform where users post short messages, follow others, and view personalized timelines.',

      introduction: `Twitter is a classic system design question that tests your understanding of feed generation, fan-out strategies, and handling viral content. The key challenge is delivering personalized timelines to hundreds of millions of users with low latency.

The most interesting aspect is the fan-out problem: when a user tweets, how do you efficiently deliver that tweet to all their followers? This becomes especially challenging for celebrities with millions of followers.`,

      functionalRequirements: [
        'Post tweets (280 character limit)',
        'Follow and unfollow users',
        'View home timeline (feed of followed users)',
        'View user profile and their tweets',
        'Like and retweet',
        'Search tweets and users',
        'Trending topics'
      ],

      nonFunctionalRequirements: [
        'High availability (99.99%)',
        'Low latency timeline reads (<200ms)',
        'Eventual consistency is acceptable',
        'Scale to 500M+ daily active users',
        'Handle viral tweets (celebrity problem)'
      ],

      dataModel: {
        description: 'Core tables for users, tweets, and relationships',
        schema: `users {
  id: bigint PK
  username: varchar(15) unique
  displayName: varchar(50)
  bio: varchar(160)
  followerCount: int
  followingCount: int
  createdAt: timestamp
}

tweets {
  id: bigint PK (Snowflake ID)
  userId: bigint FK
  content: varchar(280)
  mediaUrls: json
  replyToId: bigint nullable
  retweetOf: bigint nullable
  likeCount: int
  retweetCount: int
  createdAt: timestamp
}

follows {
  followerId: bigint
  followeeId: bigint
  createdAt: timestamp
  PRIMARY KEY (followerId, followeeId)
}`
      },

      apiDesign: {
        description: 'RESTful API with cursor-based pagination for infinite scroll',
        endpoints: [
          {
            method: 'POST',
            path: '/api/tweets',
            params: 'content, mediaIds[], replyToId?',
            response: '201 Created { tweetId, createdAt }',
            description: 'Creates a new tweet and triggers the fan-out pipeline. For users with <10K followers, the tweet is pushed to each follower\'s pre-computed timeline cache (fan-out on write). For celebrity users, followers pull the tweet at read time. Media attachments are uploaded separately and referenced by ID.'
          },
          {
            method: 'GET',
            path: '/api/timeline',
            params: 'cursor?, limit=20',
            response: '200 { tweets[], nextCursor }',
            description: 'Returns the personalized home timeline using cursor-based pagination. Merges pre-computed timeline from Redis cache with real-time tweets from followed celebrities (hybrid fan-out). The cursor is a tweet ID for consistent pagination even as new tweets arrive.'
          },
          {
            method: 'POST',
            path: '/api/users/{id}/follow',
            response: '200 { following: true }',
            description: 'Follow a user. Triggers an async job to backfill the follower\'s timeline with the followed user\'s recent tweets. Updates the social graph in a graph database and increments follower/following counters.'
          },
          {
            method: 'GET',
            path: '/api/search',
            params: 'q, type=tweets|users, cursor?',
            response: '200 { results[], nextCursor }',
            description: 'Full-text search across tweets and user profiles using Elasticsearch. Tweets are indexed in near real-time via a Kafka consumer. Results are ranked by relevance, recency, and engagement metrics. Supports hashtag search, mention search, and phrase matching.'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How to handle the fan-out problem?',
          answer: `Three approaches:

1. Fan-out on Write (Push Model):
   • When user tweets, push to all followers' timelines
   • Good for users with few followers
   • Problem: Celebrity with 10M followers = 10M writes per tweet

2. Fan-out on Read (Pull Model):
   • Timeline generated on request by fetching from followed users
   • Good for celebrities
   • Problem: Slow for users following many people

3. Hybrid Approach (Twitter's solution):
   • Fan-out on write for users with < 10K followers
   • Fan-out on read for celebrities
   • Best of both worlds`
        },
        {
          question: 'How to generate Snowflake IDs?',
          answer: `64-bit unique IDs that are:
• Sortable by time (first 41 bits = timestamp)
• Globally unique without coordination
• Generated at 10K+ IDs/second per machine

Structure:
| 41 bits timestamp | 10 bits machine ID | 12 bits sequence |
= 69 years × 1024 machines × 4096 IDs/ms`
        }
      ],

      basicImplementation: {
        title: 'Basic Implementation (Fan-out on Write)',
        description: 'When a user posts a tweet, fan-out service pushes it to all followers\' timeline caches',
        svgTemplate: 'fanoutOnWrite',
        problems: [
          'Celebrity tweets to 10M followers = 10M cache writes',
          'Hot celebrities cause massive write amplification',
          'Wasted storage for inactive users',
          'Delay in tweet appearing (fan-out takes time)'
        ]
      },

      advancedImplementation: {
        title: 'Hybrid Fan-out (Twitter\'s Approach)',
        description: 'Fan-out on write for <10K followers, celebrity tweets merged on read from cache',
        svgTemplate: 'hybridFanout',
        keyPoints: [
          'Follower threshold (e.g., 10K) determines fan-out strategy',
          'Timeline read merges pre-computed feed + celebrity tweets',
          'Redis sorted sets store timeline (score = timestamp)',
          'Only keep last 800 tweets in cache per user',
          'Celebrities\' tweets fetched and merged on read'
        ],
        databaseChoice: 'MySQL with sharding by userId for tweets; Redis for timeline cache',
        caching: 'Redis sorted sets (ZADD/ZRANGE) with tweet IDs, 800 items max per timeline'
      },

      createFlow: {
        title: 'Post Tweet Flow',
        steps: [
          'Client sends POST /api/tweets with content',
          'Tweet Service validates content (280 chars, spam check)',
          'Generate Snowflake ID for the tweet',
          'Store tweet in Tweet DB (sharded by userId)',
          'Check user\'s follower count',
          'If < 10K followers: Fan-out service pushes tweetId to all followers\' timeline caches',
          'If >= 10K followers: Only store in celebrity cache (no fan-out)',
          'Update user\'s tweet count, return tweetId to client'
        ]
      },

      redirectFlow: {
        title: 'Read Timeline Flow',
        steps: [
          'Client requests GET /api/timeline with cursor',
          'Timeline Service fetches user\'s pre-computed timeline from Redis',
          'Fetch list of celebrities user follows',
          'Query celebrity cache for recent tweets from those celebrities',
          'Merge pre-computed timeline with celebrity tweets',
          'Sort by timestamp, apply cursor pagination',
          'Hydrate tweet IDs with full tweet data',
          'Return tweets with next cursor for pagination'
        ]
      },

      discussionPoints: [
        {
          topic: 'Search Architecture',
          points: [
            'Elasticsearch cluster for full-text search',
            'Index tweets asynchronously via Kafka',
            'Separate indices for tweets vs users',
            'Real-time indexing for trending topics'
          ]
        },
        {
          topic: 'Trending Topics',
          points: [
            'Stream processing (Kafka + Flink) for real-time counts',
            'Count-min sketch for approximate hashtag counting',
            'Time-decay to favor recent activity',
            'Geographic segmentation for local trends'
          ]
        },
        {
          topic: 'Media Storage',
          points: [
            'Store images/videos in object storage (S3)',
            'CDN for global delivery',
            'Transcode videos to multiple resolutions',
            'Lazy loading for timeline performance'
          ]
        }
      ],

      requirements: ['Post tweets (280 chars)', 'Follow/unfollow users', 'Home timeline', 'Search tweets', 'Notifications', 'Trending topics'],
      components: ['Tweet Service', 'Timeline Service', 'Fan-out Service', 'Search (Elasticsearch)', 'Cache (Redis)', 'Notification Service'],
      keyDecisions: [
        'Hybrid fan-out: Push for regular users, pull for celebrities',
        'Snowflake IDs for globally unique, time-sortable tweet IDs',
        'Redis sorted sets for O(log N) timeline operations',
        'Elasticsearch for real-time tweet search',
        'Kafka for async fan-out and search indexing'
      ],
      edgeCases: [
        { scenario: 'Celebrity tweet causing fan-out storm', impact: 'User with 100M followers triggers billions of timeline writes, overwhelming fan-out workers', mitigation: 'Hybrid fan-out: pull model for celebrities (>10K followers), push model for regular users' },
        { scenario: 'Viral retweet cascade', impact: 'Exponential amplification saturates write throughput and notification pipeline', mitigation: 'Batch fan-out with backpressure, rate-limit retweet propagation, defer non-critical writes' },
        { scenario: 'Timeline read during fan-out lag', impact: 'User sees stale timeline missing recent tweets from followed accounts', mitigation: 'Merge pre-computed timeline with real-time pull of recent tweets from followed users' },
        { scenario: 'Spam bot armies posting coordinated content', impact: 'Polluted timelines and trending topics, degraded user trust', mitigation: 'ML-based spam detection on post, rate limit per account age, shadow-ban suspected bots' },
        { scenario: 'Hashtag collision across languages', impact: 'Trending topics mix unrelated conversations from different regions', mitigation: 'Region-aware trending with language detection, separate trending lists per locale' },
      ],
      tradeoffs: [
        { decision: 'Push vs pull model for timeline generation', pros: 'Push gives instant reads with O(1) timeline fetch; pull avoids wasted writes for inactive users', cons: 'Push is expensive for high-follower accounts; pull adds read latency', recommendation: 'Hybrid approach: push for users with <10K followers, pull for celebrities' },
        { decision: 'SQL vs NoSQL for tweet storage', pros: 'SQL provides ACID and complex queries; NoSQL scales horizontally with better write throughput', cons: 'SQL sharding is complex; NoSQL lacks joins for social graph queries', recommendation: 'NoSQL (Cassandra) for tweets, graph DB or adjacency list in SQL for follow relationships' },
        { decision: 'Snowflake IDs vs UUID', pros: 'Snowflake IDs are time-sortable enabling efficient range queries; UUIDs are simpler to generate', cons: 'Snowflake requires clock synchronization; UUIDs are not sortable and waste index space', recommendation: 'Snowflake IDs for tweets to enable efficient timeline pagination by time' },
        { decision: 'Real-time search vs batch indexing', pros: 'Real-time gives instant searchability; batch reduces indexing load', cons: 'Real-time indexing adds write amplification; batch means search lag', recommendation: 'Near-real-time with Kafka consumer writing to Elasticsearch within seconds' },
      ],
      layeredDesign: [
        { name: 'API Gateway Layer', purpose: 'Route tweet creation, timeline reads, and search queries with auth and rate limiting', components: ['REST/GraphQL API', 'OAuth Service', 'Rate Limiter'] },
        { name: 'Fan-out & Timeline Layer', purpose: 'Distribute tweets to follower timelines and assemble personalized feeds', components: ['Fan-out Service', 'Timeline Cache (Redis)', 'Feed Ranking Service'] },
        { name: 'Data Processing Layer', purpose: 'Handle search indexing, trending computation, and analytics', components: ['Kafka Streams', 'Elasticsearch', 'Trending Aggregator'] },
        { name: 'Storage Layer', purpose: 'Persist tweets, user profiles, social graph, and media assets', components: ['Tweet Store (Cassandra)', 'Social Graph DB', 'Media CDN', 'Blob Storage'] },
      ],
    },
    {
      id: 'uber',
      title: 'Uber / Lyft',
      subtitle: 'Ride-Sharing Service',
      icon: 'mapPin',
      color: '#8b5cf6',
      difficulty: 'Hard',
      description: 'Design a ride-sharing platform that matches riders with nearby drivers in real-time.',

      introduction: `Uber is a location-based service that matches riders with nearby drivers in real-time. The key challenges are efficient geospatial queries (finding nearby drivers), handling millions of location updates per second, and calculating accurate ETAs.

This problem tests your understanding of geospatial indexing, real-time systems, and handling geographic distribution of load.`,

      functionalRequirements: [
        'Riders can request rides with pickup/dropoff locations',
        'Match riders with nearby available drivers',
        'Real-time location tracking during ride',
        'Calculate fare based on distance and time',
        'Driver and rider ratings',
        'Payment processing',
        'Ride history'
      ],

      nonFunctionalRequirements: [
        'Match driver within 30 seconds',
        'Location updates with <1 second latency',
        'Handle 1M+ concurrent drivers',
        '99.99% availability',
        'Surge pricing during high demand'
      ],

      dataModel: {
        description: 'Users (riders/drivers), rides, and location tracking',
        schema: `users {
  id: bigint PK
  type: enum(RIDER, DRIVER)
  name: varchar
  phoneNumber: varchar
  rating: decimal
  paymentMethods: json
}

drivers {
  userId: bigint FK
  vehicleInfo: json
  licenseNumber: varchar
  isAvailable: boolean
  currentLocation: point
  lastLocationUpdate: timestamp
}

rides {
  id: bigint PK
  riderId: bigint FK
  driverId: bigint FK nullable
  pickup: point
  dropoff: point
  status: enum(REQUESTED, MATCHED, ARRIVING, IN_PROGRESS, COMPLETED, CANCELLED)
  fare: decimal nullable
  distance: decimal nullable
  requestedAt: timestamp
  startedAt: timestamp nullable
  completedAt: timestamp nullable
}`
      },

      apiDesign: {
        description: 'REST for ride management, WebSocket for real-time updates',
        endpoints: [
          {
            method: 'POST',
            path: '/api/rides',
            params: 'pickupLocation, dropoffLocation',
            response: '201 { rideId, estimatedFare, estimatedETA }',
            description: 'Initiates a ride request. The system queries a geospatial index (QuadTree or S2 Geometry) to find available drivers within a radius, calculates estimated fare using surge pricing model, and sends push notifications to the nearest eligible drivers. Uses a matching algorithm that considers driver distance, rating, and acceptance rate.'
          },
          {
            method: 'PUT',
            path: '/api/drivers/location',
            params: 'latitude, longitude, heading, speed',
            response: '200 { success }',
            description: 'Receives driver GPS location updates every 3-4 seconds. Updates are batched and written to an in-memory spatial index (Redis with geospatial commands or a custom QuadTree). The location is also published to a Kafka topic for real-time ride tracking and ETA recalculation. At peak, this endpoint handles 1M+ updates per second.'
          },
          {
            method: 'GET',
            path: '/api/rides/{id}',
            response: '200 { ride, driverLocation, eta }',
            description: 'Returns current ride status, real-time driver location, and dynamically recalculated ETA. The ETA uses live traffic data from the routing service and the driver\'s current speed/heading. Ride status transitions: REQUESTED → ACCEPTED → ARRIVING → IN_PROGRESS → COMPLETED.'
          },
          {
            method: 'WS',
            path: '/ws/ride/{id}',
            response: 'Real-time ride updates',
            description: 'WebSocket connection for live ride tracking. Pushes driver location updates (every 2 seconds), ETA changes, ride status transitions, and driver messages to the rider\'s app. Falls back to polling at /api/rides/{id} if WebSocket connection drops.'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How to efficiently find nearby drivers?',
          answer: `Geospatial Indexing Options:

1. Geohash:
   • Encode lat/lng into string prefix (e.g., "9q8yyk")
   • Same prefix = nearby locations
   • Query: Find all drivers with prefix "9q8yy*"
   • Pros: Simple, works with any database

2. QuadTree:
   • Recursively divide space into 4 quadrants
   • Each leaf node contains drivers in that area
   • Query: Find leaf containing pickup, get nearby leaves
   • Pros: Adaptive to density, efficient updates

3. S2 Geometry (Google's choice):
   • Maps sphere to cells at multiple levels
   • Better handling of edge cases near poles
   • Used by Google Maps, Uber`
        },
        {
          question: 'How to handle 1M location updates/second?',
          answer: `Write Path Optimization:

1. Batch location updates:
   • Aggregate updates over 1-2 second windows
   • Bulk write to database

2. In-memory spatial index:
   • Keep recent locations in Redis with geospatial commands
   • GEOADD, GEORADIUS for nearby queries

3. Separate hot/warm/cold storage:
   • Hot: Last 5 min in Redis (for matching)
   • Warm: Last 24h in time-series DB (for analytics)
   • Cold: S3 for historical data

4. Cell-based sharding:
   • Divide city into cells
   • Each cell handled by dedicated server
   • Reduces contention`
        }
      ],

      basicImplementation: {
        title: 'Basic Implementation',
        description: 'Rider and Driver apps connect to Matching service, with Location service and Redis for real-time tracking',
        svgTemplate: 'rideSharing',
        problems: [
          'Database cannot handle 1M location updates/second',
          'PostGIS queries slow at scale',
          'Single point of failure',
          'No real-time tracking capability'
        ]
      },

      advancedImplementation: {
        title: 'Scalable Implementation with Cell-based Architecture',
        description: 'City divided into S2 cells, each with dedicated services. Redis Geo for O(log N) spatial queries.',
        svgTemplate: 'cellBasedArch',
        keyPoints: [
          'Divide city into S2 cells (roughly 1km²)',
          'Each cell service manages drivers in that area',
          'Redis GEOADD/GEORADIUS for O(log N + M) nearby queries',
          'Kafka streams location updates to analytics',
          'Gateway routes requests to appropriate cell',
          'Cross-cell matching when driver moves between cells'
        ],
        databaseChoice: 'PostgreSQL with PostGIS for ride records; Redis for real-time location',
        caching: 'Redis Geo for driver locations, sorted sets for availability'
      },

      createFlow: {
        title: 'Ride Request Flow',
        steps: [
          'Rider opens app, sends pickup and dropoff locations',
          'Gateway determines cell containing pickup location',
          'Route request to that cell\'s matching service',
          'Matching service queries Redis GEORADIUS for drivers within 5km',
          'Filter by availability, rating, vehicle type',
          'Select best match (closest, highest rating)',
          'Send ride request to selected driver via push notification',
          'If driver accepts within 15s, confirm match',
          'If no accept, try next best driver',
          'Return matched driver info and ETA to rider'
        ]
      },

      redirectFlow: {
        title: 'Ride Tracking Flow',
        steps: [
          'Match confirmed, both apps establish WebSocket connection',
          'Driver app sends location updates every 3-4 seconds',
          'Location service updates Redis and broadcasts to rider',
          'Rider app renders driver position on map in real-time',
          'ETA service continuously recalculates arrival time',
          'When driver arrives, status changes to ARRIVING',
          'Rider confirms pickup, ride status changes to IN_PROGRESS',
          'During ride, continue tracking for fare calculation',
          'On arrival at destination, calculate final fare'
        ]
      },

      discussionPoints: [
        {
          topic: 'ETA Calculation',
          points: [
            'Historical travel times by road segment',
            'Real-time traffic from driver locations',
            'Machine learning model for predictions',
            'Update ETA continuously during approach'
          ]
        },
        {
          topic: 'Surge Pricing',
          points: [
            'Monitor supply (drivers) vs demand (requests)',
            'Per-cell surge multiplier',
            'Smooth transitions to avoid gaming',
            'Cap surge at reasonable levels'
          ]
        },
        {
          topic: 'Dispatch Optimization',
          points: [
            'Minimize total wait time across all requests',
            'Consider driver heading (already driving toward pickup)',
            'Balance driver utilization',
            'Handle simultaneous requests'
          ]
        }
      ],

      requirements: ['Match riders with drivers', 'Real-time location tracking', 'ETA calculation', 'Payments', 'Ratings', 'Surge pricing'],
      components: ['Cell Services', 'Redis (Geospatial)', 'Kafka', 'Matching Service', 'ETA Service', 'Payment Service'],
      keyDecisions: [
        'S2/Geohash cells for geographic sharding',
        'Redis GEORADIUS for O(log N) nearby driver queries',
        'WebSocket for real-time location streaming',
        'Kafka for location event processing',
        'Cell-based architecture for horizontal scaling'
      ],
      edgeCases: [
        { scenario: 'GPS drift in urban canyons (tall buildings)', impact: 'Driver appears on wrong street, rider cannot be picked up at correct location', mitigation: 'Snap-to-road algorithm using map data, require driver confirmation of pickup location' },
        { scenario: 'Simultaneous ride requests in same area during surge', impact: 'Multiple riders matched to same driver before acceptance, causing conflicts', mitigation: 'Optimistic locking on driver assignment, immediate state transition to "matched" with rollback on rejection' },
        { scenario: 'Driver goes offline mid-ride', impact: 'Lost tracking data, rider stranded with no ETA or route info', mitigation: 'Rider-side GPS as backup, automatic re-assignment if heartbeat lost for >30 seconds, store last known location' },
        { scenario: 'Surge pricing calculation during rapid demand changes', impact: 'Stale pricing shown to rider differs from actual charge, causing disputes', mitigation: 'Lock surge multiplier at booking time with short TTL, show price estimate before confirmation' },
        { scenario: 'Network partition between matching service and driver pool', impact: 'Drivers appear available but cannot receive dispatch, rides stuck in matching', mitigation: 'Heartbeat-based driver availability with aggressive timeout, fallback to secondary matching region' },
      ],
      tradeoffs: [
        { decision: 'Geohash vs S2 geometry for spatial indexing', pros: 'Geohash is simpler with string-prefix queries; S2 provides uniform cell areas regardless of latitude', cons: 'Geohash has edge-case issues at cell boundaries; S2 is more complex to implement', recommendation: 'S2 for production accuracy, geohash for rapid prototyping' },
        { decision: 'WebSocket vs polling for location updates', pros: 'WebSocket gives real-time updates with low overhead; polling is simpler and more fault-tolerant', cons: 'WebSocket requires sticky sessions and connection management; polling wastes bandwidth with empty responses', recommendation: 'WebSocket for active rides, polling for idle driver location updates' },
        { decision: 'Centralized vs cell-based matching', pros: 'Centralized gives globally optimal matches; cell-based scales horizontally per region', cons: 'Centralized creates a single bottleneck; cell-based may miss better matches across cell boundaries', recommendation: 'Cell-based with cross-cell boundary queries for nearby cells' },
        { decision: 'Precomputed vs real-time ETA calculation', pros: 'Precomputed ETAs are fast to serve; real-time accounts for current traffic conditions', cons: 'Precomputed becomes stale quickly; real-time adds latency per request', recommendation: 'Hybrid: precomputed base ETA with real-time traffic adjustment factors' },
      ],
      layeredDesign: [
        { name: 'Client & Gateway Layer', purpose: 'Handle rider/driver apps, location streaming, and API routing', components: ['Mobile SDKs', 'WebSocket Gateway', 'REST API', 'Rate Limiter'] },
        { name: 'Matching & Dispatch Layer', purpose: 'Match riders with optimal nearby drivers using real-time location data', components: ['Matching Engine', 'Surge Pricing Service', 'ETA Calculator'] },
        { name: 'Location & Geospatial Layer', purpose: 'Index and query driver positions with sub-second freshness', components: ['Redis Geospatial Index', 'S2/Geohash Partitioner', 'Location Stream Processor'] },
        { name: 'Data & Analytics Layer', purpose: 'Persist ride data, process payments, and power demand forecasting', components: ['Ride Store (PostgreSQL)', 'Payment Service', 'Kafka Event Bus', 'ML Demand Predictor'] },
      ],
    },
    {
      id: 'youtube',
      title: 'YouTube',
      subtitle: 'Video Streaming',
      icon: 'video',
      color: '#ef4444',
      difficulty: 'Hard',
      description: 'Design a video sharing platform supporting upload, processing, streaming, and recommendations.',

      introduction: `YouTube is the world's largest video sharing platform, handling over 500 hours of video uploaded every minute and serving 1 billion hours of video watched daily. The system must handle massive-scale video upload, processing, storage, and delivery.

The key challenges include efficient video transcoding, global content delivery, search and recommendation at scale, and supporting various viewing experiences (mobile, TV, web).`,

      functionalRequirements: [
        'Upload videos (up to 12 hours, 256GB)',
        'Process videos into multiple resolutions/formats',
        'Stream videos with adaptive bitrate',
        'Search videos by title, description, tags',
        'Recommend videos based on user behavior',
        'Support likes, comments, subscriptions',
        'Live streaming capability',
        'Video analytics (views, watch time, demographics)'
      ],

      nonFunctionalRequirements: [
        'Video available within 10 minutes of upload (for standard quality)',
        'Global playback latency <100ms to start',
        '99.99% availability for streaming',
        'Support 2B+ users, 800M DAU',
        'Handle 500 hours video uploaded per minute',
        'Serve 1 billion hours of video daily'
      ],

      dataModel: {
        description: 'Videos, users, channels, and engagement data',
        schema: `videos {
  id: varchar(11) PK (e.g., "dQw4w9WgXcQ")
  channelId: bigint FK
  title: varchar(100)
  description: text
  uploadStatus: enum(PROCESSING, READY, FAILED)
  duration: int (seconds)
  viewCount: bigint
  likeCount: bigint
  uploadedAt: timestamp
  thumbnailUrl: varchar
}

video_formats {
  videoId: varchar(11) FK
  resolution: enum(360, 480, 720, 1080, 1440, 2160)
  codec: enum(H264, VP9, AV1)
  bitrate: int
  storageUrl: varchar
  segmentManifest: varchar (HLS/DASH)
}

channels {
  id: bigint PK
  userId: bigint FK
  name: varchar(100)
  subscriberCount: bigint
  totalViews: bigint
  createdAt: timestamp
}

watch_history {
  userId: bigint PK
  videoId: varchar(11) PK
  watchedAt: timestamp
  watchDuration: int (seconds)
  completionRate: float
}`
      },

      apiDesign: {
        description: 'Chunked upload for large files, HLS/DASH for streaming',
        endpoints: [
          {
            method: 'POST',
            path: '/api/upload/init',
            params: '{ title, description, tags[], privacy }',
            response: '{ uploadId, uploadUrl, chunkSize }',
            description: 'Initializes a resumable upload session. Returns a unique uploadId and a pre-signed URL for direct upload to object storage (S3). The chunkSize (typically 8MB) is determined by the server based on the file size. Upload metadata is stored in the database immediately; the video status is set to UPLOADING.'
          },
          {
            method: 'PUT',
            path: '/api/upload/{uploadId}/chunk',
            params: '{ chunkNumber, data, checksum }',
            response: '{ received: true, progress: 45% }',
            description: 'Uploads a single chunk of the video file. Each chunk includes a CRC32 checksum for integrity verification. If a chunk fails, only that chunk needs to be re-uploaded (resumable). Chunks are written directly to object storage. The upload service tracks which chunks have been received to support resume after network failures.'
          },
          {
            method: 'POST',
            path: '/api/upload/{uploadId}/complete',
            params: '{}',
            response: '{ videoId, status: PROCESSING, eta: 600 }',
            description: 'Finalizes the upload and triggers the transcoding pipeline. The raw video is read from object storage and sent to a distributed transcoding cluster (FFmpeg workers). The video is transcoded into multiple resolutions (360p, 720p, 1080p, 4K) in parallel. Each resolution is segmented into 4-second chunks for adaptive bitrate streaming. Estimated processing time depends on video length and resolution.'
          },
          {
            method: 'GET',
            path: '/api/video/{id}/manifest',
            params: '?format=hls|dash',
            response: 'HLS/DASH manifest with quality options',
            description: 'Returns the adaptive bitrate streaming manifest (M3U8 for HLS, MPD for DASH). The manifest lists all available quality levels and their segment URLs served from the nearest CDN edge. The player automatically switches quality based on the viewer\'s bandwidth. Popular videos are pre-cached at edge locations; long-tail content is fetched from regional or origin storage on demand.'
          },
          {
            method: 'GET',
            path: '/api/feed/home',
            params: '?pageToken=',
            response: '{ videos[], nextPageToken }',
            description: 'Returns the personalized home feed using a recommendation engine. Combines collaborative filtering (users who watched X also watched Y), content-based signals (category, tags, creator), and engagement metrics (watch time, likes, shares). Results are pre-computed hourly and served from cache. Uses opaque page tokens for pagination to handle feed updates between requests.'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How much storage do we need daily?',
          answer: `500 hours/min × 60 min × 24 hours = 720,000 hours of video/day
Raw upload: ~1GB per hour = 720TB raw/day
Transcoded (5 resolutions): 720TB × 5 = 3.6PB/day
Monthly: 3.6PB × 30 = 108PB/month
This requires massive object storage (S3-like) with hot/cold tiering.`
        },
        {
          question: 'How do we handle peak streaming load?',
          answer: `1B hours watched/day ÷ 86400 sec = 11,574 hours/sec average
Peak is ~3x average = 35,000 hours streaming simultaneously
Average bitrate 5 Mbps = 175 Tbps peak bandwidth
CDN with 100+ PoPs globally, cache hit ratio >95% for popular content.`
        },
        {
          question: 'How long does transcoding take?',
          answer: `Standard: 1-2x realtime (1 hour video = 1-2 hours processing)
Optimized with distributed workers: Process in parallel chunks
Priority queue: Higher priority for popular uploaders
Quick quality first: 360p available in minutes, 4K later`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Upload → Transcode → Store → CDN → Client pipeline for video streaming',
        svgTemplate: 'videoStreaming',
        problems: [
          'Single transcoding queue becomes bottleneck',
          'No adaptive bitrate - fixed quality',
          'Single region storage - high latency globally',
          'Basic recommendation - just popular videos',
          'No live streaming support'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'youtubeAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           YOUTUBE PRODUCTION                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  UPLOAD PIPELINE                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ Client → Chunked Upload → Upload Service → Message Queue            │        │
│  │    │                            │               │                    │        │
│  │    └── Resume Capability        │               ▼                    │        │
│  │                            ┌────▼────┐   ┌──────────────┐           │        │
│  │                            │Raw Store│──▶│  Transcode   │           │        │
│  │                            │  (S3)   │   │  Coordinator │           │        │
│  │                            └─────────┘   └──────┬───────┘           │        │
│  │                                                 │                    │        │
│  │         ┌───────────────────────────────────────┼───────────────┐   │        │
│  │         ▼                   ▼                   ▼               ▼   │        │
│  │   ┌──────────┐        ┌──────────┐        ┌──────────┐   ┌──────┐  │        │
│  │   │ 360p GPU │        │ 720p GPU │        │1080p GPU │   │ 4K   │  │        │
│  │   │ Worker   │        │ Worker   │        │ Worker   │   │Worker│  │        │
│  │   └────┬─────┘        └────┬─────┘        └────┬─────┘   └──┬───┘  │        │
│  │        └───────────────────┼───────────────────┼────────────┘      │        │
│  │                            ▼                                        │        │
│  │                   ┌─────────────────┐                              │        │
│  │                   │ Transcoded Store│                              │        │
│  │                   │ (Multi-Region)  │                              │        │
│  │                   └─────────────────┘                              │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  STREAMING / CDN                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  Client ◀──▶ Edge PoP ◀──▶ Regional PoP ◀──▶ Origin                 │        │
│  │    │           │              │                │                     │        │
│  │    │    ┌──────┴─────┐  ┌─────┴────┐    ┌─────┴────┐               │        │
│  │    │    │Edge Cache  │  │Regional  │    │ Origin   │               │        │
│  │    │    │(Popular)   │  │Cache     │    │ Storage  │               │        │
│  │    │    └────────────┘  └──────────┘    └──────────┘               │        │
│  │    │                                                                 │        │
│  │    └── Adaptive Bitrate (HLS/DASH)                                  │        │
│  │        - Quality selection based on bandwidth                        │        │
│  │        - Seamless quality switching                                  │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  RECOMMENDATION ENGINE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  User Activity ──▶ Kafka ──▶ ML Pipeline ──▶ Feature Store         │        │
│  │        │                          │                │                 │        │
│  │        │                    ┌─────▼─────┐    ┌────▼────┐           │        │
│  │        │                    │Candidate  │    │Ranking  │           │        │
│  │        │                    │Generation │──▶ │Model    │──▶ Feed   │        │
│  │        │                    │(1000s)    │    │(Top 50) │           │        │
│  │        │                    └───────────┘    └─────────┘           │        │
│  │        │                                                            │        │
│  │        └── Watch history, likes, subscriptions, demographics        │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Chunked upload with resume: Handle large files (up to 256GB)',
          'Parallel transcoding: Each resolution processed independently',
          'Multi-codec support: H.264 for compatibility, VP9/AV1 for efficiency',
          'Tiered CDN: Edge PoPs for popular content, regional for medium, origin for rare',
          'Two-stage recommendation: Candidate generation (1000s) → Ranking (top 50)',
          'Hot/cold storage: Recent/popular in fast storage, old in Glacier'
        ]
      },

      uploadFlow: {
        title: 'Video Upload Flow',
        steps: [
          'Client initiates upload with POST /api/upload/init, receives uploadId and chunk size',
          'Client splits video into chunks (typically 5-50MB each)',
          'Upload each chunk with checksum, server validates and stores',
          'If network fails, client resumes from last successful chunk',
          'On completion, server merges chunks and queues for transcoding',
          'Transcoding workers pull from queue, process in parallel per resolution',
          'Each resolution generates HLS/DASH segments and manifest',
          'Notify client when first quality (360p) ready, continue processing higher',
          'Update video status to READY, make searchable/recommendable'
        ]
      },

      watchFlow: {
        title: 'Video Watch Flow',
        steps: [
          'Client requests video page, metadata loaded from DB',
          'Request manifest file for adaptive streaming (HLS/DASH)',
          'Manifest contains URLs for each quality level segments',
          'Client measures bandwidth, selects appropriate quality',
          'Request video segments from CDN (edge PoP)',
          'CDN cache hit: Serve immediately from edge',
          'CDN cache miss: Fetch from regional cache or origin',
          'Client buffers segments, adjusts quality based on buffer health',
          'Track watch events: Start, 25%, 50%, 75%, 100% completion',
          'Send analytics asynchronously to Kafka for processing'
        ]
      },

      discussionPoints: [
        {
          topic: 'Adaptive Bitrate Streaming',
          points: [
            'HLS (Apple) vs DASH (Google) - most use both',
            'Video split into 2-10 second segments',
            'Manifest lists all available quality levels',
            'Client decides quality based on bandwidth/buffer',
            'Seamless quality transitions during playback'
          ]
        },
        {
          topic: 'Video Transcoding Optimization',
          points: [
            'GPU-accelerated encoding (NVENC, Intel QSV)',
            'Per-title encoding: Optimize bitrate per content type',
            'Scene detection for efficient keyframe placement',
            'Parallel encoding: Split video, encode chunks, merge',
            'Priority queuing: Popular uploaders get faster processing'
          ]
        },
        {
          topic: 'Content Delivery at Scale',
          points: [
            'CDN with 100+ global PoPs',
            'Predictive pre-warming: Cache likely viral content',
            'Long-tail challenge: Most videos rarely watched',
            'Cost optimization: Hot/warm/cold storage tiers',
            'Regional origin replication for disaster recovery'
          ]
        },
        {
          topic: 'Recommendation System',
          points: [
            'Watch time is primary optimization metric',
            'Collaborative filtering: Similar users like similar videos',
            'Content-based: Analyze video features (topics, thumbnails)',
            'Deep learning: Two-tower models for candidate generation',
            'Explore vs exploit: Balance showing popular vs new content'
          ]
        }
      ],

      requirements: ['Upload videos', 'Stream videos globally', 'Search', 'Recommendations', 'Comments', 'Live streaming'],
      components: ['Upload service', 'Transcoding pipeline', 'CDN', 'Metadata DB', 'Search service', 'Recommendation engine'],
      keyDecisions: [
        'Async transcoding: Upload triggers job queue → multiple resolutions',
        'CDN for global delivery: Cache popular videos at edge',
        'Adaptive bitrate (HLS/DASH): Client switches quality based on bandwidth',
        'Chunked upload for large files with resume capability',
        'Separate hot/cold storage: S3 Glacier for old videos'
      ],
      edgeCases: [
        { scenario: 'Transcoding failure mid-pipeline on a 4K upload', impact: 'Partial resolutions available, original file stuck in processing limbo', mitigation: 'Idempotent retry per resolution, dead-letter queue for failed jobs, notify uploader after 3 retries' },
        { scenario: 'Copyright content detected post-publish', impact: 'DMCA liability, content already cached on CDN edge nodes worldwide', mitigation: 'Content ID fingerprinting during upload, CDN cache purge API for takedowns, hold period before public listing' },
        { scenario: 'Thundering herd on viral video release', impact: 'Origin server overwhelmed when CDN cache misses simultaneously across regions', mitigation: 'Request coalescing at CDN, pre-warm popular content, origin shield layer to collapse duplicate fetches' },
        { scenario: 'Adaptive bitrate stalling on unstable mobile networks', impact: 'Frequent quality switches cause buffering and poor viewer experience', mitigation: 'Buffer-based ABR algorithm with hysteresis to avoid oscillation, predictive bandwidth estimation' },
        { scenario: 'Live stream latency spikes during high-concurrency events', impact: 'Viewers see delayed content compared to broadcast, spoilers in chat', mitigation: 'Low-latency HLS/WebRTC for live, separate live edge servers from VOD infrastructure' },
      ],
      tradeoffs: [
        { decision: 'Client-side vs server-side transcoding', pros: 'Client-side reduces server costs; server-side ensures consistent quality and format compliance', cons: 'Client-side varies by device capability; server-side requires massive compute fleet', recommendation: 'Server-side transcoding for consistency, accept multiple upload formats to reduce client burden' },
        { decision: 'Push CDN vs pull CDN for video delivery', pros: 'Push pre-positions content for instant availability; pull only caches on first request saving storage', cons: 'Push wastes CDN storage on unpopular content; pull causes cold-start latency for first viewers', recommendation: 'Hybrid: push for predicted viral content and new releases, pull for long-tail catalog' },
        { decision: 'Monolithic video table vs separate metadata and blob storage', pros: 'Monolithic simplifies queries; separation allows independent scaling of metadata reads and blob storage', cons: 'Monolithic hits row size limits; separation adds cross-service coordination', recommendation: 'Separate metadata DB (MySQL/Vitess) from blob storage (S3) with CDN in front of blobs' },
        { decision: 'Real-time vs batch recommendation updates', pros: 'Real-time adapts instantly to user behavior; batch is simpler and cheaper to compute', cons: 'Real-time requires streaming ML infrastructure; batch recommendations can feel stale', recommendation: 'Batch for candidate generation, real-time for ranking and personalization' },
      ],
      layeredDesign: [
        { name: 'Upload & Ingestion Layer', purpose: 'Accept video uploads with resumable chunked transfer and trigger processing', components: ['Upload API', 'Chunk Assembler', 'Job Queue (SQS/Kafka)'] },
        { name: 'Processing & Transcoding Layer', purpose: 'Convert uploaded videos into multiple resolutions and formats', components: ['Transcoding Workers', 'Thumbnail Generator', 'Content ID Scanner'] },
        { name: 'Delivery & Streaming Layer', purpose: 'Serve video segments globally with adaptive bitrate streaming', components: ['CDN (CloudFront)', 'Origin Shield', 'HLS/DASH Packager'] },
        { name: 'Metadata & Discovery Layer', purpose: 'Store video metadata, power search, and serve recommendations', components: ['Metadata DB (Vitess)', 'Search (Elasticsearch)', 'Recommendation Engine'] },
        { name: 'Analytics Layer', purpose: 'Track view counts, engagement metrics, and creator revenue', components: ['Event Collector', 'Real-time Counter', 'Data Warehouse'] },
      ],
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Messaging Service',
      icon: 'messageCircle',
      color: '#25d366',
      difficulty: 'Hard',
      description: 'Design a real-time messaging application supporting 1-1 chat, group chat, and media sharing.',

      introduction: `WhatsApp is a real-time messaging system handling billions of messages daily. The key challenges are maintaining persistent connections, ensuring message delivery even when users are offline, and implementing end-to-end encryption.

Unlike social media feeds, messaging requires strong delivery guarantees - users expect messages to arrive in order and not be lost. This makes the consistency and reliability requirements much stricter.`,

      functionalRequirements: [
        'One-on-one messaging',
        'Group chat (up to 256 members)',
        'Media sharing (images, videos, documents)',
        'Read receipts (sent, delivered, read)',
        'Online/last seen status',
        'Typing indicators',
        'Message history sync across devices'
      ],

      nonFunctionalRequirements: [
        'Real-time delivery (<100ms when both online)',
        'Guaranteed delivery (even if recipient offline)',
        'End-to-end encryption',
        'Message ordering within conversation',
        'Support 2B+ users, 500M DAU',
        'Handle 100B+ messages/day'
      ],

      dataModel: {
        description: 'Users, conversations, and messages with delivery tracking',
        schema: `users {
  id: bigint PK
  phoneNumber: varchar(15) unique
  publicKey: blob (for E2E encryption)
  lastSeen: timestamp
  pushToken: varchar (for notifications)
}

conversations {
  id: bigint PK
  type: enum(DIRECT, GROUP)
  name: varchar (for groups)
  participants: bigint[]
  createdAt: timestamp
}

messages {
  id: uuid PK
  conversationId: bigint FK
  senderId: bigint FK
  content: blob (encrypted)
  mediaUrl: varchar nullable
  sentAt: timestamp
  deliveredAt: timestamp nullable
  readAt: timestamp nullable
}`
      },

      apiDesign: {
        description: 'WebSocket for real-time + REST for offline sync',
        endpoints: [
          {
            method: 'WS',
            path: '/ws/chat',
            params: 'authToken in header',
            response: 'Bidirectional message stream',
            description: 'Persistent WebSocket connection for real-time messaging. Each device maintains one connection to a chat server. Messages are end-to-end encrypted (Signal Protocol) before transmission. The server routes messages by looking up the recipient\'s connected chat server in a presence service. Handles typing indicators, online status, and delivery receipts over the same connection.'
          },
          {
            method: 'POST',
            path: '/api/messages',
            params: 'conversationId, content, mediaUrl?',
            response: '201 { messageId, sentAt }',
            description: 'REST fallback for sending messages when WebSocket is unavailable (poor network). The message is encrypted client-side, stored in the recipient\'s message queue, and delivered when they reconnect. Provides at-least-once delivery with client-side deduplication using messageId.'
          },
          {
            method: 'GET',
            path: '/api/conversations/{id}/messages',
            params: 'before?, limit=50',
            response: '200 { messages[], hasMore }',
            description: 'Fetches message history for a conversation using cursor-based pagination (before=messageId). Used for initial sync when the app opens, scrolling back through chat history, and restoring messages on a new device. Messages are stored per-user (not per-conversation) for efficient sharding.'
          },
          {
            method: 'PUT',
            path: '/api/messages/{id}/read',
            response: '200 { readAt }',
            description: 'Marks a message as read and sends a read receipt to the sender via their WebSocket connection. Read receipts are batched (multiple messages marked read at once) to reduce server load. The sender sees blue double-check marks when the recipient reads.'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How to handle offline message delivery?',
          answer: `Message Queue Pattern:

1. Sender sends message via WebSocket
2. Server stores in persistent queue for recipient
3. If recipient online: deliver immediately via WebSocket
4. If recipient offline: hold in queue
5. When recipient connects: flush queued messages
6. Recipient ACKs receipt → remove from queue

Use Kafka or similar for reliable message queuing with
at-least-once delivery semantics.`
        },
        {
          question: 'How to scale WebSocket connections?',
          answer: `Connection Management:

• 500M concurrent connections ÷ 100K per server = 5000 servers
• Use consistent hashing to route user to specific chat server
• Store connection mapping: userId → serverId in Redis
• For cross-server messaging:
  1. Look up recipient's server
  2. Route message via internal message bus

Sticky sessions ensure reconnection goes to same server.`
        }
      ],

      basicImplementation: {
        title: 'Basic Implementation',
        description: 'Single chat server handling WebSocket connections and message routing.',
        svgTemplate: 'whatsapp',
        architecture: `
┌────────┐    ┌──────────────┐    ┌─────────────┐
│ Client │◀══▶│  Chat Server │───▶│ Message DB  │
│  (WS)  │    │  (WebSocket) │    └─────────────┘
└────────┘    └──────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Redis     │
              │ (Sessions)  │
              └─────────────┘`,
        problems: [
          'Single server limits concurrent connections',
          'No message persistence if server crashes',
          'Cannot route between users on different servers',
          'No offline message delivery'
        ]
      },

      advancedImplementation: {
        title: 'Distributed Chat System',
        description: 'Multiple chat servers with message broker for cross-server communication and persistent message queue for offline delivery.',
        svgTemplate: 'whatsappAdvanced',
        architecture: `
┌────────┐    ┌──────────────┐    ┌─────────────┐
│ Client │◀══▶│   Gateway    │───▶│ Chat Server │
│  (WS)  │    │ (Load Bal.)  │    │   Cluster   │
└────────┘    └──────────────┘    └─────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             ┌───────────┐      ┌─────────────┐     ┌─────────────┐
             │  Kafka    │      │   Redis     │     │ Message DB  │
             │ (Message  │      │ (Sessions/  │     │ (Cassandra) │
             │   Bus)    │      │  Presence)  │     └─────────────┘
             └───────────┘      └─────────────┘
                    │
                    ▼
             ┌─────────────┐
             │ Push Service│
             │  (Offline)  │
             └─────────────┘`,
        keyPoints: [
          'Consistent hashing routes users to specific chat servers',
          'Kafka enables cross-server message routing',
          'Redis stores session mapping (userId → serverId)',
          'Cassandra for message persistence (write-heavy workload)',
          'Push notifications via FCM/APNs for offline users',
          'Message queue holds messages until delivery confirmed'
        ],
        databaseChoice: 'Cassandra - optimized for write-heavy workloads, eventual consistency acceptable',
        caching: 'Redis for session storage, recent messages cache, presence status'
      },

      createFlow: {
        title: 'Send Message Flow',
        steps: [
          'Sender types message, client encrypts with recipient\'s public key',
          'Client sends encrypted message via WebSocket',
          'Chat server receives message, generates messageId and timestamp',
          'Store message in Cassandra with status=SENT',
          'Look up recipient\'s chat server from Redis session store',
          'If recipient online: Route message via Kafka to their chat server',
          'If recipient offline: Queue message, trigger push notification',
          'Recipient\'s chat server delivers to client via WebSocket',
          'Client ACKs delivery → update status to DELIVERED',
          'When recipient reads → update status to READ, notify sender'
        ]
      },

      redirectFlow: {
        title: 'Receive Message Flow',
        steps: [
          'User opens app, establishes WebSocket connection',
          'Chat server registers connection in Redis session store',
          'Server checks message queue for pending messages',
          'Deliver all queued messages via WebSocket',
          'Client decrypts messages with private key',
          'Client sends delivery ACK for each message',
          'Server updates message status, removes from queue',
          'Server notifies sender of delivery status'
        ]
      },

      discussionPoints: [
        {
          topic: 'End-to-End Encryption',
          points: [
            'Signal Protocol for E2E encryption',
            'Key exchange during first message',
            'Server cannot read message content',
            'Forward secrecy with ratcheting keys'
          ]
        },
        {
          topic: 'Group Messaging',
          points: [
            'Fan-out to all group members',
            'Sender keys optimization (encrypt once)',
            'Group size limit (256) for performance',
            'Admin controls for membership'
          ]
        },
        {
          topic: 'Media Handling',
          points: [
            'Encrypt media before upload',
            'Store in object storage (S3)',
            'CDN for delivery, signed URLs',
            'Thumbnail generation for previews'
          ]
        }
      ],

      requirements: ['1-1 messaging', 'Group chat (256 members)', 'Media sharing', 'Read receipts', 'Online status', 'End-to-end encryption'],
      components: ['Chat Servers', 'Kafka (Message Bus)', 'Redis (Sessions)', 'Cassandra', 'Push Service', 'Media Service'],
      keyDecisions: [
        'WebSocket for real-time bidirectional communication',
        'Kafka for cross-server message routing',
        'Message queue with ACK for guaranteed delivery',
        'Signal Protocol for end-to-end encryption',
        'Cassandra for write-heavy message storage'
      ],
      edgeCases: [
        { scenario: 'Message delivered but recipient phone is off for days', impact: 'Messages queue indefinitely, consuming server storage and delaying delivery receipts', mitigation: 'Store-and-forward with TTL (30 days), push notification on reconnect, batch delivery of queued messages' },
        { scenario: 'Group message fan-out to 256 members across regions', impact: 'High write amplification and inconsistent delivery order across participants', mitigation: 'Server-side ordering with sequence IDs per group, regional relay servers, async fan-out with delivery tracking' },
        { scenario: 'End-to-end encryption key exchange during device switch', impact: 'New device cannot decrypt message history, potential security vulnerability during transition', mitigation: 'Signal Protocol with pre-key bundles, re-encrypt session on device registration, optional encrypted backup restore' },
        { scenario: 'Media upload fails mid-transfer on slow network', impact: 'Partial upload wastes bandwidth, user must restart from beginning', mitigation: 'Resumable chunked uploads with server-side reassembly, client stores upload progress token' },
        { scenario: 'Clock skew between sender and recipient devices', impact: 'Messages appear out of order in conversation view', mitigation: 'Server-assigned monotonic sequence numbers per conversation, use server timestamp for ordering' },
      ],
      tradeoffs: [
        { decision: 'WebSocket vs long polling for message delivery', pros: 'WebSocket gives true real-time with lower overhead; long polling works through restrictive firewalls', cons: 'WebSocket requires persistent connection management; long polling adds latency and wastes connections', recommendation: 'WebSocket as primary with long-polling fallback for restrictive networks' },
        { decision: 'Store messages on server vs device-only', pros: 'Server storage enables multi-device sync; device-only is more private', cons: 'Server storage increases infrastructure cost and attack surface; device-only loses messages on device loss', recommendation: 'Server-side store-and-forward with TTL, optional encrypted cloud backup for history' },
        { decision: 'Cassandra vs MySQL for message storage', pros: 'Cassandra handles write-heavy workloads and scales horizontally; MySQL provides strong consistency', cons: 'Cassandra has eventual consistency and no cross-partition transactions; MySQL sharding is complex', recommendation: 'Cassandra partitioned by conversation ID for write scalability, MySQL for user metadata' },
      ],
      layeredDesign: [
        { name: 'Connection & Gateway Layer', purpose: 'Maintain persistent WebSocket connections and route messages to correct chat servers', components: ['WebSocket Gateway', 'Connection Manager', 'Load Balancer'] },
        { name: 'Message Processing Layer', purpose: 'Handle message routing, encryption handshakes, and delivery guarantees', components: ['Chat Service', 'Message Queue (Kafka)', 'Delivery Tracker', 'Encryption Service'] },
        { name: 'Storage Layer', purpose: 'Persist messages, media, and user profiles with partition-friendly schemas', components: ['Message Store (Cassandra)', 'Media Storage (S3)', 'User DB (MySQL)'] },
        { name: 'Push & Notification Layer', purpose: 'Deliver notifications to offline users via platform push services', components: ['Push Service (APNs/FCM)', 'Presence Service', 'Offline Queue'] },
      ],
    },
    {
      id: 'instagram',
      title: 'Instagram',
      subtitle: 'Photo Sharing',
      icon: 'camera',
      color: '#e4405f',
      difficulty: 'Medium',
      description: 'Design a photo-sharing social network with feeds, stories, and social features.',

      introduction: `Instagram is a photo and video sharing social network with over 2 billion monthly active users. The system handles image uploads, processing, feed generation, stories, and social interactions at massive scale.

The key challenges include generating personalized feeds for hundreds of millions of users, processing and delivering billions of images daily, and implementing ephemeral content (Stories) that disappears after 24 hours.`,

      functionalRequirements: [
        'Upload photos and videos with filters',
        'Create posts with captions and hashtags',
        'Generate personalized news feed',
        'Stories (disappear after 24 hours)',
        'Follow/unfollow users',
        'Like and comment on posts',
        'Direct messaging (DMs)',
        'Explore page with trending content',
        'User search and hashtag discovery'
      ],

      nonFunctionalRequirements: [
        'Feed loads in <500ms',
        'Media upload completes in <5 seconds',
        'Stories available within 1 second of posting',
        'Support 2B+ users, 500M DAU',
        'Handle 95M+ posts per day',
        '99.9% availability'
      ],

      dataModel: {
        description: 'Users, posts, media, and social graph',
        schema: `users {
  id: bigint PK
  username: varchar(30) unique
  displayName: varchar(100)
  bio: text
  profilePicUrl: varchar
  followerCount: int
  followingCount: int
  postCount: int
  isPrivate: boolean
  createdAt: timestamp
}

posts {
  id: bigint PK
  userId: bigint FK
  caption: text
  location: varchar
  likeCount: int
  commentCount: int
  createdAt: timestamp
}

media {
  id: bigint PK
  postId: bigint FK
  type: enum(IMAGE, VIDEO, CAROUSEL)
  url: varchar
  thumbnailUrl: varchar
  width: int
  height: int
  duration: int (for video)
  orderIndex: int
}

stories {
  id: bigint PK
  userId: bigint FK
  mediaUrl: varchar
  type: enum(IMAGE, VIDEO)
  createdAt: timestamp
  expiresAt: timestamp (createdAt + 24h)
  viewCount: int
}

follows {
  followerId: bigint PK
  followeeId: bigint PK
  createdAt: timestamp
  status: enum(ACTIVE, PENDING) -- for private accounts
}

feed_cache {
  userId: bigint PK
  posts: jsonb -- pre-computed list of postIds
  updatedAt: timestamp
}`
      },

      apiDesign: {
        description: 'REST APIs for posts, feed, and social features',
        endpoints: [
          {
            method: 'POST',
            path: '/api/media/upload',
            params: '{ type: IMAGE|VIDEO, data }',
            response: '{ mediaId, uploadUrl }'
          },
          {
            method: 'POST',
            path: '/api/post',
            params: '{ mediaIds[], caption, location, tags[] }',
            response: '{ postId, createdAt }'
          },
          {
            method: 'GET',
            path: '/api/feed',
            params: '?cursor=&limit=20',
            response: '{ posts[], nextCursor }'
          },
          {
            method: 'GET',
            path: '/api/stories',
            params: '',
            response: '{ stories[] grouped by user }'
          },
          {
            method: 'POST',
            path: '/api/story',
            params: '{ mediaId }',
            response: '{ storyId, expiresAt }'
          },
          {
            method: 'POST',
            path: '/api/follow/{userId}',
            params: '{}',
            response: '{ status: FOLLOWING|PENDING }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we generate feeds for 500M daily users?',
          answer: `Two approaches:
1. Push model (active users): Pre-generate feed when followees post
   - Store feed in Redis/Cassandra cache
   - Update on new posts from followed users
   - Good for users with <1000 followings

2. Pull model (inactive/celebrity followers): Generate on-demand
   - Query posts from followed users at read time
   - Merge and rank in real-time
   - Cache result for short TTL

Hybrid: Push for regular users, pull for celebrity followers (>1M)`
        },
        {
          question: 'How much storage for images?',
          answer: `95M posts/day × average 1.5 images/post = 142M images/day
Average image 2MB (multiple resolutions) = 284TB/day
Monthly: 284TB × 30 = 8.5PB/month
Use object storage (S3) with CDN caching for delivery.
Generate thumbnails + multiple resolutions (150px, 320px, 640px, 1080px).`
        },
        {
          question: 'How do Stories work with 24h expiry?',
          answer: `Store stories with createdAt and expiresAt (createdAt + 24h)
Query: WHERE expiresAt > NOW() for active stories
Background job cleans up expired stories
Use Redis sorted set with expiry timestamp as score
Ring buffer pattern: Stories are circular, auto-evict after 24h`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Monolithic service with pull-based feed generation',
        svgTemplate: 'instagram',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                           INSTAGRAM BASIC                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ API Gateway  │─────▶│   App Server     │          │
│  └──────────┘      └──────────────┘      └────────┬─────────┘          │
│                                                    │                    │
│                    ┌───────────────────────────────┼──────────────┐     │
│                    │                               │              │     │
│               ┌────▼────┐    ┌─────────┐    ┌─────▼────┐        │     │
│               │ Media   │    │ Users   │    │  Posts   │        │     │
│               │ Storage │    │   DB    │    │   DB     │        │     │
│               │  (S3)   │    │(Postgres)│   │(Postgres)│        │     │
│               └─────────┘    └─────────┘    └──────────┘        │     │
│                    │                                              │     │
│               ┌────▼──────────────────────────────────────┐      │     │
│               │                   CDN                      │      │     │
│               └────────────────────────────────────────────┘      │     │
│                                                                         │
│  FEED GENERATION (Pull Model):                                          │
│  1. Get list of followed users                                         │
│  2. Query recent posts from each user                                  │
│  3. Merge, sort by timestamp                                           │
│  4. Return top N posts                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Feed query is slow: N+1 queries for each followed user',
          'Celebrities cause fan-out explosion',
          'No ranking - just chronological',
          'Stories not efficiently handled',
          'Single database becomes bottleneck'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'instagramAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INSTAGRAM PRODUCTION                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  MEDIA UPLOAD PIPELINE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ Client ─▶ Upload Service ─▶ S3 Raw ─▶ Image Processing Queue       │        │
│  │                                              │                       │        │
│  │         ┌───────────────────────────────────┼───────────────┐       │        │
│  │         ▼                   ▼               ▼               ▼       │        │
│  │   ┌──────────┐        ┌──────────┐   ┌──────────┐    ┌──────────┐  │        │
│  │   │Thumbnail │        │  320px   │   │  640px   │    │  1080px  │  │        │
│  │   │ 150px    │        │ resize   │   │ resize   │    │ original │  │        │
│  │   └────┬─────┘        └────┬─────┘   └────┬─────┘    └────┬─────┘  │        │
│  │        └───────────────────┴──────────────┴───────────────┘        │        │
│  │                            ▼                                        │        │
│  │                   ┌─────────────────┐                              │        │
│  │                   │  S3 Processed   │─▶ CDN                        │        │
│  │                   └─────────────────┘                              │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  FEED GENERATION (Hybrid Push/Pull)                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  NEW POST ───▶ Fan-out Service                                      │        │
│  │                     │                                                │        │
│  │     ┌───────────────┼────────────────┐                              │        │
│  │     ▼               ▼                ▼                              │        │
│  │ ┌────────┐    ┌──────────┐    ┌──────────────┐                     │        │
│  │ │Active  │    │ Regular  │    │ Celebrity    │                     │        │
│  │ │Follower│    │ Follower │    │ Followers    │                     │        │
│  │ │(<1000) │    │ (1K-100K)│    │   (>100K)    │                     │        │
│  │ │        │    │          │    │              │                     │        │
│  │ │  PUSH  │    │  PUSH    │    │   SKIP       │                     │        │
│  │ │to feed │    │ to feed  │    │ (pull later) │                     │        │
│  │ │ cache  │    │  cache   │    │              │                     │        │
│  │ └────────┘    └──────────┘    └──────────────┘                     │        │
│  │                                                                      │        │
│  │  FEED READ ───▶ Feed Service                                        │        │
│  │                     │                                                │        │
│  │     ┌───────────────┴────────────────┐                              │        │
│  │     ▼                                ▼                              │        │
│  │ ┌──────────┐                  ┌──────────────┐                     │        │
│  │ │Get cached│                  │Pull celebrity│                     │        │
│  │ │feed posts│──────────────────│posts on-demand│                    │        │
│  │ └────┬─────┘                  └──────┬───────┘                     │        │
│  │      └────────────┬──────────────────┘                              │        │
│  │                   ▼                                                  │        │
│  │           ┌──────────────┐                                          │        │
│  │           │ ML Ranker    │ ─▶ Personalized Feed                    │        │
│  │           │(engagement)  │                                          │        │
│  │           └──────────────┘                                          │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  STORIES                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Redis Cluster (Sorted Set per user)                                │        │
│  │  ┌─────────────────────────────────────────────────────────┐        │        │
│  │  │ user:123:stories = { storyId: expiryTimestamp, ... }   │        │        │
│  │  │                                                         │        │        │
│  │  │ TTL-based cleanup: ZREMRANGEBYSCORE stories 0 NOW()    │        │        │
│  │  └─────────────────────────────────────────────────────────┘        │        │
│  │                                                                      │        │
│  │  Query: ZRANGEBYSCORE user:123:stories NOW() +INF                   │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Hybrid feed model: Push for regular users, pull for celebrity followers',
          'Image processing pipeline: Multiple resolutions generated async',
          'ML-based ranking: Optimize for engagement, not just chronology',
          'Stories in Redis: Sorted sets with TTL for 24h expiry',
          'Sharding: Users sharded by userId, posts by postId',
          'CDN caching: Popular images cached at edge locations'
        ]
      },

      postFlow: {
        title: 'Create Post Flow',
        steps: [
          'Client uploads media to pre-signed S3 URL',
          'Image processing queue picks up raw image',
          'Generate multiple resolutions (150, 320, 640, 1080px)',
          'Apply filters if requested (server-side or client-side)',
          'Store processed images in S3, update URLs in DB',
          'Create post record with mediaIds, caption, tags',
          'Fan-out service triggers: push to followers feed caches',
          'For users with many followers, skip push (pull model)',
          'Update hashtag counts for Explore page',
          'Send notifications to tagged users'
        ]
      },

      feedFlow: {
        title: 'Feed Generation Flow',
        steps: [
          'Client requests feed with cursor for pagination',
          'Check feed cache (Redis) for pre-computed posts',
          'If cache hit and fresh: return cached posts',
          'If cache miss or stale: regenerate feed',
          'Fetch pushed posts from feed cache',
          'Pull recent posts from followed celebrities',
          'Merge all posts, remove duplicates',
          'ML ranking: Score by engagement, recency, relationship',
          'Cache ranked feed with short TTL (5 min)',
          'Return paginated results with media URLs'
        ]
      },

      discussionPoints: [
        {
          topic: 'Feed Ranking Algorithm',
          points: [
            'Engagement signals: likes, comments, saves, shares',
            'Relationship: Close friends weighted higher',
            'Recency: Decay factor for older posts',
            'Interest: Match with users past engagement patterns',
            'Diversity: Avoid showing too many posts from same user'
          ]
        },
        {
          topic: 'Celebrity Problem',
          points: [
            'Celebrities have millions of followers',
            'Pushing to all followers on every post is expensive',
            'Solution: Pull model for celebrity content',
            'Hybrid approach based on follower count threshold',
            'Async fan-out with priority queues'
          ]
        },
        {
          topic: 'Stories Architecture',
          points: [
            'Ephemeral content - auto-deletes after 24h',
            'Redis sorted sets for efficient range queries',
            'Story ring at top of feed - separate from main feed',
            'View tracking: Who viewed your story',
            'Story highlights: Saved stories that persist'
          ]
        },
        {
          topic: 'Image Optimization',
          points: [
            'Multiple resolutions for different devices',
            'WebP format for smaller file sizes',
            'Lazy loading in feed - load as user scrolls',
            'Blur placeholders while loading',
            'CDN with aggressive caching for popular images'
          ]
        }
      ],

      requirements: ['Upload photos/videos', 'Apply filters', 'News feed', 'Stories (24h)', 'Follow users', 'Likes/comments', 'Direct messages'],
      components: ['Media service', 'Feed service', 'User service', 'CDN', 'Search', 'Notification service'],
      keyDecisions: [
        'Pre-generate feed for active users (push model)',
        'CDN for image/video delivery worldwide',
        'Stories: TTL-based storage with Redis',
        'Image processing pipeline: resize, compress, filter',
        'Shard user data by userId for locality'
      ],
      edgeCases: [
        { scenario: 'Image processing pipeline backlog during peak upload hours', impact: 'Users see unprocessed images or missing thumbnails, degraded feed experience', mitigation: 'Priority queue for feed-visible images, pre-generate common sizes, async background processing for all variants' },
        { scenario: 'Story expiration edge at exactly 24 hours across time zones', impact: 'Stories disappear mid-view or linger past intended expiration in different regions', mitigation: 'UTC-based TTL stored at creation, client-side countdown timer, server-side cleanup job with 5-minute granularity' },
        { scenario: 'Feed ranking model returns empty results for new users', impact: 'Cold start problem where new users see no content, causing immediate churn', mitigation: 'Fall back to popularity-based global feed, use onboarding interests for initial content seeding' },
        { scenario: 'Influencer post causing fan-out write storm', impact: 'Millions of timeline inserts for a single post, backlog on feed generation', mitigation: 'Hybrid push/pull: pre-compute feeds only for active followers, lazy-load for dormant users on next login' },
        { scenario: 'Duplicate image upload detection across accounts', impact: 'Wasted storage for identical images, potential copyright issues', mitigation: 'Perceptual hashing (pHash) for near-duplicate detection, content-addressable storage for exact duplicates' },
      ],
      tradeoffs: [
        { decision: 'Pre-computed feed vs on-demand assembly', pros: 'Pre-computed gives instant feed loads; on-demand always shows freshest content', cons: 'Pre-computed wastes resources for inactive users; on-demand adds read latency', recommendation: 'Pre-compute for daily active users, on-demand with caching for infrequent visitors' },
        { decision: 'Single CDN vs multi-CDN for image delivery', pros: 'Single CDN simplifies operations; multi-CDN improves availability and regional coverage', cons: 'Single CDN creates vendor lock-in; multi-CDN adds routing complexity and cache fragmentation', recommendation: 'Multi-CDN with intelligent routing based on latency and cost per region' },
        { decision: 'Store original image vs processed variants only', pros: 'Keeping originals allows reprocessing with new filters; variants-only saves storage', cons: 'Originals consume 3-5x more storage; variants-only prevents future format upgrades', recommendation: 'Store originals in cold storage (S3 Glacier), keep active variants in hot storage with CDN' },
        { decision: 'Chronological vs algorithmic feed ordering', pros: 'Chronological is predictable and simple; algorithmic maximizes engagement and relevance', cons: 'Chronological buries important posts; algorithmic feels manipulative and adds ML complexity', recommendation: 'Algorithmic default with user option to switch to chronological, A/B test engagement metrics' },
      ],
      layeredDesign: [
        { name: 'Upload & Processing Layer', purpose: 'Accept media uploads, apply filters, and generate multiple image sizes', components: ['Upload API', 'Image Processing Pipeline', 'Filter Engine', 'Thumbnail Generator'] },
        { name: 'Feed & Social Layer', purpose: 'Assemble personalized feeds, manage social graph, and handle interactions', components: ['Feed Service', 'Social Graph DB', 'Like/Comment Service', 'Story Service'] },
        { name: 'Content Delivery Layer', purpose: 'Serve images and videos globally with minimal latency', components: ['Multi-CDN Router', 'Edge Cache', 'Media Proxy'] },
        { name: 'Storage Layer', purpose: 'Persist user data, media assets, and social interactions', components: ['User DB (PostgreSQL)', 'Media Store (S3)', 'Feed Cache (Redis)', 'Analytics Store'] },
      ],
    },
    {
      id: 'dropbox',
      title: 'Dropbox / Google Drive',
      subtitle: 'File Storage',
      icon: 'folder',
      color: '#0061ff',
      difficulty: 'Hard',
      description: 'Design a cloud file storage system with sync, sharing, and real-time collaboration.',

      introduction: `Dropbox and Google Drive are cloud file storage services that allow users to store files online and sync them across multiple devices. The key challenges include efficient file synchronization (only transferring changes), handling large files, maintaining consistency across devices, and supporting real-time collaboration.

The system must handle millions of concurrent users, petabytes of data, and ensure files are never lost while remaining responsive.`,

      functionalRequirements: [
        'Upload and download files of any size',
        'Sync files across multiple devices automatically',
        'File and folder sharing with permissions',
        'File versioning and history',
        'Real-time collaboration on documents',
        'Offline access with local caching',
        'Search files by name and content',
        'File organization (folders, favorites, tags)'
      ],

      nonFunctionalRequirements: [
        'Sync latency <30 seconds for small files',
        'Support files up to 50GB',
        '99.99% durability - never lose data',
        '99.9% availability',
        'Efficient bandwidth usage (delta sync)',
        'Support 500M+ users, 100M DAU'
      ],

      dataModel: {
        description: 'Files, folders, blocks, and sharing metadata',
        schema: `files {
  id: uuid PK
  userId: bigint FK
  parentFolderId: uuid FK nullable
  name: varchar(255)
  size: bigint
  contentHash: varchar(64) -- SHA-256 of full file
  blockHashes: varchar[] -- ordered list of block hashes
  version: int
  mimeType: varchar
  isDeleted: boolean
  createdAt: timestamp
  modifiedAt: timestamp
}

blocks {
  hash: varchar(64) PK -- content-addressed
  size: int
  storageUrl: varchar -- S3 location
  referenceCount: int -- for deduplication
}

file_versions {
  fileId: uuid FK
  version: int
  blockHashes: varchar[]
  modifiedAt: timestamp
  modifiedBy: bigint FK
}

shares {
  id: uuid PK
  fileId: uuid FK
  sharedWith: bigint FK (userId or groupId)
  permission: enum(VIEW, EDIT, OWNER)
  shareLink: varchar unique nullable
  expiresAt: timestamp nullable
}

sync_cursors {
  userId: bigint PK
  deviceId: varchar PK
  cursor: varchar -- position in change stream
  lastSyncAt: timestamp
}`
      },

      apiDesign: {
        description: 'Block-level APIs for efficient sync, with metadata separation',
        endpoints: [
          {
            method: 'GET',
            path: '/api/files/{id}/metadata',
            params: '',
            response: '{ id, name, size, contentHash, blockHashes[], version }'
          },
          {
            method: 'POST',
            path: '/api/files/upload/init',
            params: '{ path, size, contentHash }',
            response: '{ uploadId, missingBlockHashes[] }'
          },
          {
            method: 'PUT',
            path: '/api/blocks/{hash}',
            params: 'binary block data',
            response: '{ stored: true }'
          },
          {
            method: 'POST',
            path: '/api/files/upload/complete',
            params: '{ uploadId, blockHashes[] }',
            response: '{ fileId, version }'
          },
          {
            method: 'GET',
            path: '/api/sync/changes',
            params: '?cursor=',
            response: '{ changes[], newCursor, hasMore }'
          },
          {
            method: 'POST',
            path: '/api/share',
            params: '{ fileId, email, permission }',
            response: '{ shareId, shareLink }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How does block-level sync work?',
          answer: `Files are split into fixed-size blocks (typically 4MB).
Each block is hashed (SHA-256) for identification.

When syncing:
1. Client computes block hashes locally
2. Sends hashes to server
3. Server returns which blocks it doesn't have
4. Client uploads only missing/changed blocks
5. Server assembles file from blocks

Benefits:
- Small change in large file = upload one block
- Deduplication: Same block only stored once globally
- Resume interrupted uploads: Skip already-uploaded blocks`
        },
        {
          question: 'How do we handle conflicts?',
          answer: `Conflicts occur when same file modified on multiple devices offline.

Detection:
- Each device tracks version number
- On sync, compare local vs server version
- If server version > local expected = conflict

Resolution options:
1. Last-writer-wins (by timestamp)
2. Create conflicted copy (Dropbox approach)
3. Three-way merge for text files
4. User chooses which version to keep

For real-time collaboration (Google Docs), use OT/CRDT to merge concurrent edits.`
        },
        {
          question: 'How do we notify devices of changes?',
          answer: `Options:
1. Polling: Simple but delayed and wasteful
2. Long polling: Client holds connection, server responds on change
3. WebSocket: Bidirectional, real-time, persistent connection
4. Server-Sent Events (SSE): One-way push from server

Dropbox uses long polling with fallback to regular polling.
Changes are pushed through notification service, client then fetches full delta.`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple upload/download without block-level sync',
        svgTemplate: 'dropbox',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                           DROPBOX BASIC                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ API Gateway  │─────▶│   File Service   │          │
│  │  (Sync)  │      └──────────────┘      └────────┬─────────┘          │
│  └──────────┘                                      │                    │
│                                           ┌────────┴────────┐           │
│                                           │                 │           │
│                                    ┌──────▼──────┐   ┌──────▼──────┐   │
│                                    │  Metadata   │   │  File Store │   │
│                                    │     DB      │   │    (S3)     │   │
│                                    └─────────────┘   └─────────────┘   │
│                                                                         │
│  SYNC PROCESS:                                                          │
│  1. Poll server for changes every 30 seconds                           │
│  2. Download entire changed files                                      │
│  3. Upload entire modified files                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Entire file uploaded/downloaded on any change',
          'Polling wastes bandwidth when no changes',
          'No deduplication - duplicate files stored multiple times',
          'Conflicts not handled gracefully',
          'No offline support'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'dropboxAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DROPBOX PRODUCTION                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CLIENT (Desktop/Mobile)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │        │
│  │  │ File Watcher│  │Block Chunker│  │  Local DB   │  │Sync Engine│  │        │
│  │  │ (inotify)   │  │(4MB blocks) │  │(SQLite)     │  │           │  │        │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │        │
│  │         └────────────────┴────────────────┴───────────────┘        │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                      │                                           │
│                                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                            API GATEWAY                               │        │
│  │    Load Balancer → Auth → Rate Limit → Route to Service             │        │
│  └────────────────────────────────────┬────────────────────────────────┘        │
│                                       │                                          │
│     ┌─────────────────────────────────┼─────────────────────────────────┐       │
│     │                                 │                                  │       │
│     ▼                                 ▼                                  ▼       │
│  ┌──────────────┐            ┌──────────────┐               ┌────────────────┐  │
│  │ Block Server │            │Metadata Svc  │               │ Notification   │  │
│  │              │            │              │               │    Service     │  │
│  │ - Upload     │            │- File tree   │               │                │  │
│  │ - Download   │            │- Versions    │               │ - Long polling │  │
│  │ - Dedup check│            │- Permissions │               │ - WebSocket    │  │
│  └──────┬───────┘            └──────┬───────┘               └────────────────┘  │
│         │                           │                                            │
│         ▼                           ▼                                            │
│  ┌──────────────┐            ┌──────────────┐                                   │
│  │ Block Store  │            │ Metadata DB  │                                   │
│  │    (S3)      │            │  (Postgres)  │                                   │
│  │              │            │              │                                   │
│  │Content-addr- │            │- Sharded by  │                                   │
│  │essed storage │            │  userId      │                                   │
│  │              │            │- Versioned   │                                   │
│  └──────────────┘            └──────────────┘                                   │
│                                                                                  │
│  SYNC FLOW                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  1. File change detected → compute block hashes                      │        │
│  │  2. Send hashes to server → receive missing block list              │        │
│  │  3. Upload only missing blocks (dedup!)                              │        │
│  │  4. Commit file metadata with new block list                        │        │
│  │  5. Notification service pushes change to other devices             │        │
│  │  6. Other devices sync only changed blocks                          │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  DEDUPLICATION                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Block Hash: SHA-256 of block content                               │        │
│  │  Same content → Same hash → Stored once globally                    │        │
│  │                                                                      │        │
│  │  Example: 1M users upload same PDF                                  │        │
│  │           → Stored ONCE, referenced 1M times                        │        │
│  │           → Massive storage savings                                 │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Block-level sync: 4MB chunks, only upload changed blocks',
          'Content-addressed storage: SHA-256 hash as block ID',
          'Global deduplication: Same block stored once across all users',
          'Long polling for instant sync notifications',
          'Client-side chunking: Work happens on client, server just stores blocks',
          'Metadata/data separation: Different scaling requirements'
        ]
      },

      uploadFlow: {
        title: 'File Upload Flow',
        steps: [
          'Client detects file change via filesystem watcher',
          'Split file into 4MB blocks',
          'Compute SHA-256 hash for each block',
          'Send block hashes to server (not data yet)',
          'Server checks which blocks already exist (dedup check)',
          'Server returns list of missing blocks',
          'Client uploads only missing blocks in parallel',
          'Server stores blocks with hash as key',
          'Client sends commit request with ordered block list',
          'Server creates new file version, updates metadata',
          'Notification sent to users other devices'
        ]
      },

      syncFlow: {
        title: 'Sync Flow (Changes)',
        steps: [
          'Client maintains long-poll connection to notification service',
          'When server has changes, connection returns with delta cursor',
          'Client fetches change list from cursor',
          'For each changed file, get metadata including block hashes',
          'Check which blocks client already has locally',
          'Download only missing blocks',
          'Assemble file from blocks',
          'Update local database with new version',
          'Update cursor position for next sync'
        ]
      },

      discussionPoints: [
        {
          topic: 'Chunking Strategies',
          points: [
            'Fixed-size (4MB): Simple, good for random access',
            'Content-defined (Rabin fingerprinting): Better dedup across versions',
            'Trade-off: Content-defined better for text, fixed better for binary',
            'Block size: Smaller = more metadata, larger = less dedup benefit',
            'Dropbox uses 4MB fixed blocks'
          ]
        },
        {
          topic: 'Conflict Resolution',
          points: [
            'Dropbox: Creates "conflicted copy" file',
            'Google Drive: Last writer wins with version history',
            'Real-time collab: OT (Google Docs) or CRDT',
            'Detection: Compare version vectors',
            'User notification: Alert when conflict occurs'
          ]
        },
        {
          topic: 'Deduplication',
          points: [
            'Block-level dedup: Same block across users stored once',
            'File-level dedup: Whole-file hash check before chunking',
            'Cross-user dedup: Privacy concerns, use hash only',
            'Storage savings: Can be 50%+ for enterprise accounts',
            'Trade-off: CPU cost of hashing vs storage savings'
          ]
        },
        {
          topic: 'Security Considerations',
          points: [
            'Encryption at rest: Server-side (default) or client-side',
            'Encryption in transit: TLS for all connections',
            'Zero-knowledge option: Client encrypts before upload',
            'Key management: Enterprise key management integration',
            'Sharing security: Signed URLs with expiry'
          ]
        }
      ],

      requirements: ['Upload/download files', 'Sync across devices', 'File versioning', 'Sharing', 'Real-time collaboration', 'Offline access'],
      components: ['Block server', 'Metadata service', 'Sync service', 'Notification service', 'CDN'],
      keyDecisions: [
        'Block-level sync: Split files into 4MB blocks, only sync changed blocks',
        'Content-addressable storage: Hash blocks for deduplication',
        'Operational Transform or CRDT for real-time collaboration',
        'Long polling or WebSocket for sync notifications',
        'Client-side encryption option for enterprise'
      ],
      edgeCases: [
        { scenario: 'Conflicting edits to same file from two devices simultaneously', impact: 'One device overwrites the other, causing silent data loss', mitigation: 'Block-level versioning with vector clocks, detect conflicts and create conflict copies for manual resolution' },
        { scenario: 'Large file upload interrupted by network failure at 95%', impact: 'Entire upload must restart, wasting bandwidth and frustrating user', mitigation: 'Chunked upload with per-block acknowledgment, resume from last confirmed block on reconnect' },
        { scenario: 'Storage quota exceeded during background sync', impact: 'Sync silently stops, files on one device diverge from cloud state', mitigation: 'Pre-check available quota before sync, notify user proactively, prioritize syncing smaller critical files first' },
        { scenario: 'Ransomware encrypts local files triggering mass sync', impact: 'Encrypted files propagate to cloud and all connected devices, destroying backups', mitigation: 'Anomaly detection for bulk file modifications, automatic version retention, 30-day recovery window, admin rollback' },
        { scenario: 'Rename of deeply nested folder with thousands of children', impact: 'Metadata update cascades to all child paths, blocking sync for minutes', mitigation: 'Store relative paths with parent references instead of full paths, rename only updates parent folder metadata' },
      ],
      tradeoffs: [
        { decision: 'Block-level sync vs file-level sync', pros: 'Block-level transfers only changed portions saving bandwidth; file-level is simpler to implement', cons: 'Block-level requires chunking logic and block index management; file-level wastes bandwidth on large files', recommendation: 'Block-level sync with 4MB blocks for files over a threshold, file-level for small files' },
        { decision: 'Operational Transform (OT) vs CRDT for collaboration', pros: 'OT is well-proven with centralized server; CRDT works peer-to-peer and offline', cons: 'OT requires central coordination server; CRDT has higher memory overhead and complex garbage collection', recommendation: 'OT for real-time document editing, CRDT for offline-first scenarios' },
        { decision: 'Client-side deduplication vs server-side', pros: 'Client-side saves upload bandwidth; server-side is simpler and more secure', cons: 'Client-side leaks information about stored content via hash probing; server-side wastes upload bandwidth', recommendation: 'Server-side deduplication for security, client-side only for enterprise single-tenant deployments' },
        { decision: 'Push notifications vs polling for sync events', pros: 'Push gives instant sync awareness; polling is simpler and works through firewalls', cons: 'Push requires persistent connections per device; polling adds latency and wastes server resources', recommendation: 'Long polling with WebSocket upgrade for active clients, push notifications for mobile' },
      ],
      layeredDesign: [
        { name: 'Client Sync Layer', purpose: 'Monitor local file changes, chunk files into blocks, and manage sync queue', components: ['File Watcher', 'Block Chunker', 'Sync Engine', 'Conflict Resolver'] },
        { name: 'API & Coordination Layer', purpose: 'Handle upload/download requests and coordinate sync across devices', components: ['REST API', 'Metadata Service', 'Notification Service'] },
        { name: 'Storage Layer', purpose: 'Store file blocks with deduplication and version history', components: ['Block Store (S3)', 'Metadata DB (MySQL)', 'Dedup Index'] },
        { name: 'Collaboration Layer', purpose: 'Enable real-time co-editing and sharing with access controls', components: ['OT/CRDT Engine', 'Permission Service', 'Sharing Service'] },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      subtitle: 'Video Streaming Platform',
      icon: 'video',
      color: '#e50914',
      difficulty: 'Hard',
      description: 'Design a subscription video streaming service with personalized recommendations.',

      introduction: `Netflix is the world's leading streaming entertainment service with over 230 million paid memberships. The system must deliver high-quality video streams to millions of concurrent users worldwide while providing personalized content recommendations.

The key challenges include building a global content delivery network, maintaining consistent streaming quality, and creating a recommendation engine that keeps users engaged.`,

      functionalRequirements: [
        'Stream movies and TV shows in multiple qualities',
        'Support multiple user profiles per account',
        'Personalized content recommendations',
        'Continue watching across devices',
        'Download content for offline viewing',
        'Search content by title, actor, genre',
        'Support subtitles and multiple audio tracks',
        'Parental controls and content ratings'
      ],

      nonFunctionalRequirements: [
        'Stream start time <3 seconds',
        'Zero buffering during playback',
        'Support 8M+ concurrent streams at peak',
        '99.99% availability',
        'Global reach with consistent quality',
        'Adaptive quality based on network conditions'
      ],

      dataModel: {
        description: 'Content metadata, user profiles, and viewing history',
        schema: `content {
  id: varchar(10) PK
  type: enum(MOVIE, SERIES)
  title: varchar(200)
  releaseYear: int
  duration: int (minutes)
  maturityRating: enum(G, PG, PG13, R, NC17)
  genres: varchar[]
  cast: varchar[]
  director: varchar
  synopsis: text
  thumbnailUrl: varchar
  trailerUrl: varchar
}

episodes {
  id: varchar(10) PK
  contentId: varchar(10) FK
  seasonNumber: int
  episodeNumber: int
  title: varchar(200)
  duration: int
}

video_assets {
  contentId: varchar(10) FK
  quality: enum(SD, HD, FHD, UHD)
  codec: enum(H264, H265, VP9, AV1)
  bitrate: int
  manifestUrl: varchar (HLS/DASH)
}

profiles {
  id: uuid PK
  accountId: bigint FK
  name: varchar(50)
  avatarUrl: varchar
  maturitySetting: enum
  language: varchar
}

watch_history {
  profileId: uuid PK
  contentId: varchar(10) PK
  position: int (seconds)
  duration: int
  watchedAt: timestamp
  completed: boolean
}`
      },

      apiDesign: {
        description: 'REST APIs for browsing and streaming',
        endpoints: [
          {
            method: 'GET',
            path: '/api/browse/home',
            params: '?profileId=',
            response: '{ rows: [{ title, items[] }] }'
          },
          {
            method: 'GET',
            path: '/api/content/{id}',
            params: '',
            response: '{ content, episodes[], similar[] }'
          },
          {
            method: 'GET',
            path: '/api/playback/{contentId}',
            params: '?profileId=',
            response: '{ manifestUrl, subtitles[], audioTracks[], position }'
          },
          {
            method: 'POST',
            path: '/api/watch/progress',
            params: '{ contentId, position, duration }',
            response: '{ saved: true }'
          },
          {
            method: 'GET',
            path: '/api/search',
            params: '?q=&profileId=',
            response: '{ results[], suggestions[] }'
          },
          {
            method: 'GET',
            path: '/api/download/{contentId}',
            params: '?quality=',
            response: '{ downloadUrl, expiresAt, license }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How does Netflix deliver content globally?',
          answer: `Netflix built Open Connect - their own CDN with 17,000+ servers worldwide.

Deployment:
- Open Connect Appliances (OCAs) placed at ISPs
- Edge servers in IXPs (Internet Exchange Points)
- Each OCA stores popular content for that region

Content Placement:
- ML predicts what content will be popular in each region
- Pre-position content overnight during off-peak hours
- 95%+ of traffic served from edge (not origin)

Benefits:
- Reduced latency: Content is 1-2 hops away
- Better quality: Consistent bitrate from nearby server
- Cost savings: Less transit bandwidth needed`
        },
        {
          question: 'How does the recommendation system work?',
          answer: `Two-stage system:

1. Candidate Generation (1000s of titles):
   - Collaborative filtering: Users like you watched X
   - Content-based: Similar genres, actors, directors
   - Trending: Popular in your region
   - Because you watched: Direct similarity

2. Ranking (order within rows):
   - ML model scores each title for this user
   - Features: Watch history, time of day, device, profile
   - Optimizes for: Engagement (will they click + watch)

Personalization touches:
- Artwork selection: Different thumbnails per user
- Row ordering: Most relevant rows first
- Within-row ordering: Most likely to watch first`
        },
        {
          question: 'How do we handle 8M concurrent streams?',
          answer: `Key strategies:

1. Distributed CDN: 17,000+ edge servers globally
   - Most streams served from local ISP/region
   - Origin only for cache misses

2. Adaptive Bitrate Streaming:
   - Multiple quality levels encoded per video
   - Client switches quality based on bandwidth
   - Buffer management: Pre-buffer next segments

3. Microservices Architecture:
   - Each service scales independently
   - Critical path: Playback service, manifest service
   - Graceful degradation: Recommendations can be cached

4. Chaos Engineering:
   - Chaos Monkey: Random instance failures
   - Test failure scenarios in production
   - Systems designed for failure`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple streaming with single CDN',
        svgTemplate: 'netflix',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                            NETFLIX BASIC                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ API Gateway  │─────▶│   App Server     │          │
│  └──────────┘      └──────────────┘      └────────┬─────────┘          │
│       │                                           │                     │
│       │                               ┌───────────┴───────────┐        │
│       │                               │                       │        │
│       │                        ┌──────▼──────┐        ┌───────▼──────┐ │
│       │                        │ Content DB  │        │ User DB      │ │
│       │                        │ (Postgres)  │        │ (Postgres)   │ │
│       │                        └─────────────┘        └──────────────┘ │
│       │                                                                 │
│       │            ┌─────────────────────────────────────┐             │
│       └───────────▶│              CDN                     │◀──┐        │
│         (stream)   │     (Third-party: Akamai)           │   │        │
│                    └─────────────────────────────────────┘   │        │
│                                                               │        │
│                                               ┌───────────────┘        │
│                                               │                        │
│                                        ┌──────▼──────┐                 │
│                                        │  Video      │                 │
│                                        │  Storage    │                 │
│                                        │    (S3)     │                 │
│                                        └─────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Third-party CDN is expensive at scale',
          'Limited control over edge placement',
          'No regional content pre-positioning',
          'Basic recommendations - just popularity',
          'Single quality level - no adaptation'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'netflixAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NETFLIX PRODUCTION                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CONTROL PLANE (AWS)                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐   │        │
│  │  │ API Svc  │  │Browse Svc │  │Playback Svc│  │Recommendation  │   │        │
│  │  └────┬─────┘  └─────┬─────┘  └──────┬─────┘  │   Service      │   │        │
│  │       │              │               │         └────────────────┘   │        │
│  │       └──────────────┴───────────────┘                              │        │
│  │                      │                                               │        │
│  │  ┌───────────────────▼────────────────────────────────────────┐    │        │
│  │  │                    DATA LAYER                               │    │        │
│  │  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │    │        │
│  │  │  │Cassandra│  │   EVCache│  │Elasticsearch│  │  Kafka  │   │    │        │
│  │  │  │(history)│  │  (cache) │  │  (search)  │  │(events) │   │    │        │
│  │  │  └─────────┘  └──────────┘  └──────────┘  └────────────┘   │    │        │
│  │  └────────────────────────────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  DATA PLANE (Open Connect CDN)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  CLIENT ──▶ ISP OCA ──▶ IXP OCA ──▶ Regional ──▶ Origin (S3)       │        │
│  │    │          │            │                                         │        │
│  │    │    ┌─────┴────┐  ┌────┴────┐                                   │        │
│  │    │    │ 95% hit  │  │ 4% hit  │  (1% goes to origin)             │        │
│  │    │    │ rate     │  │ rate    │                                   │        │
│  │    │    └──────────┘  └─────────┘                                   │        │
│  │    │                                                                 │        │
│  │    └── Adaptive Bitrate Selection                                   │        │
│  │        - Measure bandwidth continuously                              │        │
│  │        - Switch quality mid-stream                                   │        │
│  │        - Buffer 30-60 seconds ahead                                  │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  CONTENT PIPELINE                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Master ──▶ Encoding ──▶ Quality Check ──▶ Encryption ──▶ Deploy   │        │
│  │    │           │              │                │             │       │        │
│  │    │     Multiple         Automated        DRM (Widevine,    │       │        │
│  │    │     bitrates         testing         PlayReady)       │       │        │
│  │    │     & codecs                                     ▼       │        │
│  │    │                                          ┌────────────┐  │        │
│  │    └── 8K Master                             │Predictive  │  │        │
│  │        10+ encoded versions                  │Placement   │  │        │
│  │        (144p to 4K HDR)                     │Algorithm   │  │        │
│  │                                              └────────────┘  │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  RECOMMENDATION ENGINE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Watch Events ──▶ Spark/Flink ──▶ Feature Store ──▶ ML Models     │        │
│  │                                                         │            │        │
│  │                                      ┌──────────────────┘            │        │
│  │                                      ▼                               │        │
│  │                              ┌──────────────┐                       │        │
│  │                              │ Personalized │                       │        │
│  │                              │  Rankings    │                       │        │
│  │                              │ + Artwork    │                       │        │
│  │                              └──────────────┘                       │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Open Connect CDN: 17,000+ edge servers at ISPs worldwide',
          'Control/Data plane separation: AWS for logic, Open Connect for video',
          '95% cache hit rate: Most content served from ISP-local servers',
          'Adaptive streaming: 10+ quality levels, seamless switching',
          'Content pre-positioning: ML predicts regional popularity',
          'Chaos engineering: Designed for failure, tested in production'
        ]
      },

      playbackFlow: {
        title: 'Video Playback Flow',
        steps: [
          'Client requests playback for content ID',
          'Playback service checks entitlement (subscription valid?)',
          'Get license for DRM-protected content',
          'Receive manifest URL pointing to optimal edge server',
          'Client downloads manifest (HLS/DASH) with quality options',
          'Start buffering segments, beginning with lower quality',
          'Measure bandwidth, upgrade quality as buffer fills',
          'Continuous quality adaptation based on network conditions',
          'Report playback events to analytics (start, buffer, quality changes)',
          'Save watch position every 30 seconds for continue watching'
        ]
      },

      contentFlow: {
        title: 'Content Ingestion Flow',
        steps: [
          'Receive master content from studio (8K/4K source)',
          'Encoding pipeline: Generate 10+ quality levels',
          'Encode multiple codecs: H.264, H.265, VP9, AV1',
          'Quality assurance: Automated testing + human review',
          'Encrypt with DRM (Widevine, PlayReady, FairPlay)',
          'Upload to origin storage (S3)',
          'Predictive placement: ML determines regional popularity',
          'Pre-position on relevant Open Connect Appliances',
          'Content becomes available for streaming',
          'Monitor initial performance, adjust placement if needed'
        ]
      },

      discussionPoints: [
        {
          topic: 'Open Connect Architecture',
          points: [
            'Custom hardware appliances at ISPs/IXPs',
            '150+ Tbps capacity globally',
            'ISPs get free appliance + reduced transit costs',
            'Netflix controls software, updates remotely',
            'Fill during off-peak: Overnight content placement'
          ]
        },
        {
          topic: 'Adaptive Bitrate Streaming',
          points: [
            'DASH + HLS support (different devices)',
            'Per-shot encoding: Complex scenes get more bits',
            'Buffer-based adaptation (BBA) algorithm',
            'Quality of Experience metrics: rebuffer ratio, startup time',
            'AV1 codec: 20% better compression, rolling out for 4K'
          ]
        },
        {
          topic: 'Recommendation Personalization',
          points: [
            'Not just what to recommend, but how to present',
            'Personalized artwork: Different images for different users',
            'Row ordering: Most engaging categories first',
            'Time-of-day awareness: Different recommendations morning vs evening',
            'Explore vs exploit: Balance new content discovery'
          ]
        },
        {
          topic: 'Resilience & Chaos Engineering',
          points: [
            'Chaos Monkey: Random instance termination',
            'Chaos Kong: Simulated region failure',
            'Latency injection: Test degraded network conditions',
            'Circuit breakers: Graceful degradation',
            'Bulkheads: Isolate failures to prevent cascade'
          ]
        }
      ],

      requirements: ['Stream movies/shows', 'Multiple profiles', 'Personalized recommendations', 'Continue watching', 'Download for offline', 'Multiple devices'],
      components: ['Video delivery', 'Content management', 'User service', 'Recommendation engine', 'CDN (Open Connect)', 'Playback service'],
      keyDecisions: [
        'Open Connect CDN: Custom hardware at ISPs',
        'Adaptive streaming: Multiple bitrates per video',
        'Pre-position popular content at edge',
        'ML-based recommendations: Collaborative + content-based filtering',
        'A/B testing infrastructure for UI experiments'
      ],
      edgeCases: [
        { scenario: 'Regional content licensing restricts availability mid-stream', impact: 'User starts watching a movie that becomes unavailable in their region due to license expiry', mitigation: 'Grace period for active sessions, pre-check license validity at playback start, show unavailability warning before expiry' },
        { scenario: 'Adaptive bitrate oscillation on congested home network', impact: 'Quality constantly switches between 480p and 1080p causing jarring viewing experience', mitigation: 'Buffer-based ABR with hysteresis band, require sustained bandwidth improvement before quality upgrade' },
        { scenario: 'Simultaneous streams exceed account device limit', impact: 'Fifth device starts playing while four are active, policy enforcement race condition', mitigation: 'Centralized session registry with heartbeat, terminate oldest idle session on limit exceeded, real-time device count' },
        { scenario: 'CDN edge node failure during peak hours (Sunday evening)', impact: 'Millions of viewers in a region experience buffering or playback failure', mitigation: 'Multi-CDN failover with real-time health checks, automatic traffic rerouting to backup CDN within seconds' },
        { scenario: 'New season release causing thundering herd on origin', impact: 'Origin servers overwhelmed by cache misses for never-before-accessed content', mitigation: 'Pre-warm CDN caches hours before release, stagger rollout by region, origin shield to collapse duplicate requests' },
      ],
      tradeoffs: [
        { decision: 'Own CDN (Open Connect) vs third-party CDN', pros: 'Own CDN gives full control and lower marginal cost at scale; third-party CDN deploys faster globally', cons: 'Own CDN requires massive upfront hardware investment; third-party adds per-GB cost', recommendation: 'Own CDN for top markets with high traffic, third-party CDN as fallback for long-tail regions' },
        { decision: 'Pre-encode all resolutions vs on-demand transcoding', pros: 'Pre-encoding ensures instant playback at all qualities; on-demand saves storage for unpopular content', cons: 'Pre-encoding costs storage for rarely-watched content; on-demand adds first-play latency', recommendation: 'Pre-encode popular content in all resolutions, on-demand for catalog long tail' },
        { decision: 'Collaborative filtering vs content-based recommendations', pros: 'Collaborative finds unexpected gems from similar users; content-based works without user history', cons: 'Collaborative has cold-start problem for new users; content-based creates filter bubbles', recommendation: 'Hybrid approach: collaborative for core recommendations, content-based for cold start and diversity injection' },
        { decision: 'Global vs regional content metadata store', pros: 'Global store simplifies architecture; regional stores reduce read latency and respect data residency', cons: 'Global store has cross-region latency; regional stores require synchronization and add operational complexity', recommendation: 'Regional read replicas with global primary, async replication with <1s lag' },
      ],
      layeredDesign: [
        { name: 'Client & Playback Layer', purpose: 'Handle video playback, adaptive bitrate selection, and DRM decryption', components: ['Player SDK', 'ABR Controller', 'DRM Module', 'Offline Download Manager'] },
        { name: 'API & Business Logic Layer', purpose: 'Manage user profiles, subscriptions, and content catalog', components: ['User Service', 'Subscription Service', 'Content Catalog API', 'A/B Testing Framework'] },
        { name: 'Content Delivery Layer', purpose: 'Serve video segments globally with sub-second start times', components: ['Open Connect CDN', 'Edge Servers at ISPs', 'Origin Shield', 'Multi-CDN Router'] },
        { name: 'Content Processing Layer', purpose: 'Ingest, encode, and prepare content for multi-device streaming', components: ['Transcoding Pipeline', 'Quality Analysis', 'DRM Encryption', 'Subtitle Processor'] },
        { name: 'Recommendation & Data Layer', purpose: 'Power personalized recommendations and store viewing history', components: ['ML Recommendation Engine', 'Viewing History Store', 'A/B Experiment DB', 'Data Warehouse'] },
      ],
    },
    {
      id: 'amazon',
      title: 'Amazon E-commerce',
      subtitle: 'Online Shopping',
      icon: 'shoppingCart',
      color: '#ff9900',
      difficulty: 'Hard',
      description: 'Design an e-commerce platform handling millions of products, orders, and payments.',

      introduction: `Amazon is the world's largest e-commerce platform, selling 350+ million products and processing millions of orders daily. The system must handle enormous catalog sizes, high-throughput transactions, real-time inventory management, and complex fulfillment operations.

Key challenges include maintaining inventory consistency during flash sales, providing sub-second search across millions of products, and orchestrating the checkout flow across multiple services reliably.`,

      functionalRequirements: [
        'Browse and search products with filters',
        'View product details, images, reviews',
        'Add products to cart',
        'Checkout with multiple payment methods',
        'Real-time inventory tracking',
        'Order tracking and status updates',
        'Product recommendations',
        'Customer reviews and ratings',
        'Wishlist and save for later'
      ],

      nonFunctionalRequirements: [
        'Search results in <200ms',
        'Handle 66K orders/sec during Prime Day',
        'Inventory never goes negative (overselling)',
        '99.99% availability for checkout',
        'Support 300M+ active customers',
        'Scale to 350M+ products'
      ],

      dataModel: {
        description: 'Products, inventory, orders, and user data',
        schema: `products {
  id: varchar(10) PK (ASIN)
  title: varchar(500)
  description: text
  categoryId: int FK
  sellerId: bigint FK
  price: decimal(10,2)
  images: varchar[]
  attributes: jsonb
  rating: decimal(2,1)
  reviewCount: int
  createdAt: timestamp
}

inventory {
  productId: varchar(10) PK
  warehouseId: int PK
  quantity: int
  reservedQuantity: int
  lastUpdated: timestamp
  version: int -- optimistic locking
}

orders {
  id: bigint PK
  userId: bigint FK
  status: enum(PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)
  totalAmount: decimal(10,2)
  shippingAddress: jsonb
  paymentId: varchar FK
  createdAt: timestamp
  updatedAt: timestamp
}

order_items {
  orderId: bigint FK
  productId: varchar(10) FK
  quantity: int
  priceAtPurchase: decimal(10,2)
  fulfillmentStatus: enum
}

cart {
  userId: bigint PK
  items: jsonb -- [{productId, quantity, addedAt}]
  updatedAt: timestamp
}`
      },

      apiDesign: {
        description: 'RESTful APIs with event-driven backend',
        endpoints: [
          {
            method: 'GET',
            path: '/api/search',
            params: '?q=&category=&brand=&minPrice=&maxPrice=&page=',
            response: '{ products[], facets, totalCount }'
          },
          {
            method: 'GET',
            path: '/api/products/{asin}',
            params: '',
            response: '{ product, reviews[], similar[], alsoViewed[] }'
          },
          {
            method: 'POST',
            path: '/api/cart/add',
            params: '{ productId, quantity }',
            response: '{ cart, subtotal }'
          },
          {
            method: 'POST',
            path: '/api/checkout/start',
            params: '{ cartId }',
            response: '{ checkoutSessionId, summary, deliveryOptions[] }'
          },
          {
            method: 'POST',
            path: '/api/checkout/complete',
            params: '{ sessionId, paymentMethod, shippingOption }',
            response: '{ orderId, estimatedDelivery }'
          },
          {
            method: 'GET',
            path: '/api/orders/{id}',
            params: '',
            response: '{ order, items[], tracking }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we prevent overselling during flash sales?',
          answer: `Multiple strategies combined:

1. Inventory Reservation:
   - Reserve inventory when added to cart (soft hold)
   - TTL on reservation (15 min) - auto-release if not purchased
   - Confirm reservation during checkout

2. Optimistic Locking:
   - Version number on inventory record
   - UPDATE ... WHERE quantity >= requested AND version = expected
   - Retry with backoff if version mismatch

3. Distributed Locks (for hot products):
   - Redis lock per productId
   - Short TTL to prevent deadlocks
   - Queue requests during flash sales

4. Pre-allocated inventory:
   - For Prime Day: Pre-allocate inventory pools
   - Partition by region/warehouse`
        },
        {
          question: 'How does checkout work with multiple services?',
          answer: `Saga pattern for distributed transaction:

1. Cart Service: Validate cart, lock prices
2. Inventory Service: Reserve inventory (compensation: release)
3. Payment Service: Charge card (compensation: refund)
4. Order Service: Create order record
5. Notification Service: Send confirmation
6. Fulfillment: Queue for warehouse

If any step fails, run compensation actions in reverse.
Use event-driven choreography or orchestrator (Step Functions).

Idempotency keys prevent duplicate charges on retry.`
        },
        {
          question: 'How do we search 350M products fast?',
          answer: `Elasticsearch cluster with optimizations:

Index Design:
- Sharded by category (better relevance)
- Separate indices for different product types
- Denormalized data (no JOINs needed)

Query Optimization:
- Multi-level caching: Query cache, field data cache
- Use filters (cached) before scoring
- Pre-computed facets for common categories

ML-Enhanced:
- Learning-to-rank for result ordering
- Personalized ranking based on user history
- Query understanding: "iPhone 15 case" → brand:Apple AND category:cases`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Client → CDN → Load Balancer → microservices (Product, Order, Payment)',
        svgTemplate: 'ecommerce',
        problems: [
          'Single database bottleneck',
          'Long transactions with external calls',
          'Cannot scale services independently',
          'Full table scans for search',
          'Inventory locks cause contention'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'ecommerceAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AMAZON PRODUCTION                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                         API GATEWAY                                  │        │
│  │    Auth → Rate Limit → Route → Load Balance                         │        │
│  └────────────────────────────────┬────────────────────────────────────┘        │
│                                   │                                              │
│     ┌────────────┬────────────────┼────────────────┬─────────────┐              │
│     │            │                │                │             │              │
│     ▼            ▼                ▼                ▼             ▼              │
│  ┌──────┐   ┌────────┐    ┌──────────┐    ┌───────────┐   ┌──────────┐         │
│  │Search│   │Product │    │   Cart   │    │  Order    │   │ Payment  │         │
│  │ Svc  │   │  Svc   │    │   Svc    │    │   Svc     │   │   Svc    │         │
│  └──┬───┘   └───┬────┘    └────┬─────┘    └─────┬─────┘   └────┬─────┘         │
│     │           │              │                │              │                │
│     ▼           ▼              ▼                ▼              ▼                │
│  ┌──────┐   ┌────────┐    ┌────────┐    ┌──────────┐    ┌──────────┐           │
│  │Elastic│   │Product │    │ Redis  │    │Order DB  │    │Payment   │           │
│  │search │   │  DB    │    │(Cart)  │    │(Postgres)│    │Gateway   │           │
│  └──────┘   └────────┘    └────────┘    └──────────┘    └──────────┘           │
│                                                                                  │
│  INVENTORY SERVICE                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  ┌──────────────┐     ┌────────────┐     ┌───────────────┐         │        │
│  │  │ Inventory DB │◀───│ Inventory  │◀───│  Reservation   │         │        │
│  │  │  (Postgres)  │     │  Service   │     │    Queue       │         │        │
│  │  │              │     │            │     │   (SQS)        │         │        │
│  │  │ Partitioned  │     │ Optimistic │     │               │         │        │
│  │  │ by warehouse │     │  Locking   │     │               │         │        │
│  │  └──────────────┘     └────────────┘     └───────────────┘         │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  CHECKOUT SAGA (Orchestrator Pattern)                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐        │        │
│  │   │ Reserve │───▶│ Charge  │───▶│ Create  │───▶│ Notify  │        │        │
│  │   │Inventory│    │ Payment │    │  Order  │    │  User   │        │        │
│  │   └────┬────┘    └────┬────┘    └────┬────┘    └─────────┘        │        │
│  │        │              │              │                             │        │
│  │        ▼              ▼              ▼                             │        │
│  │   (compensate)   (compensate)   (compensate)                      │        │
│  │    Release        Refund        Cancel order                      │        │
│  │                                                                      │        │
│  │   State machine tracks progress, handles retries & compensations   │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  EVENT BUS (Kafka)                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  order.created ──▶ Inventory, Shipping, Analytics, Recommendation  │        │
│  │  payment.completed ──▶ Order, Notification                         │        │
│  │  inventory.low ──▶ Procurement, Alerting                           │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Microservices: Each domain has own database and scales independently',
          'Saga pattern: Distributed transactions with compensation',
          'Event-driven: Kafka for async communication between services',
          'Elasticsearch: Sub-200ms search across 350M products',
          'Inventory locking: Optimistic + reservation queue for hot items',
          'Cart in Redis: Fast reads, TTL-based cleanup'
        ]
      },

      checkoutFlow: {
        title: 'Checkout Flow (Saga)',
        steps: [
          'User clicks checkout, cart validated against current prices',
          'Checkout service creates checkout session with idempotency key',
          'Reserve inventory for all items (with 15-min TTL)',
          'If inventory unavailable, return error with alternatives',
          'User selects shipping option, confirms address',
          'Payment service authorizes card (not charged yet)',
          'Order service creates order record with PENDING status',
          'Payment service captures charge',
          'Order status updated to CONFIRMED',
          'Events published: Inventory committed, shipping queued, email sent',
          'If any step fails, orchestrator runs compensations in reverse'
        ]
      },

      searchFlow: {
        title: 'Product Search Flow',
        steps: [
          'User enters search query',
          'Query understanding: Spelling correction, synonyms, entity extraction',
          'Build Elasticsearch query with filters, facets',
          'Apply personalization: Boost based on user history',
          'Execute search with timeouts (fallback to cached results)',
          'ML ranking: Reorder results by predicted engagement',
          'Fetch product details from cache/database',
          'Return results with facets for filtering',
          'Log search for analytics and model training'
        ]
      },

      discussionPoints: [
        {
          topic: 'Inventory Management',
          points: [
            'Distributed inventory across warehouses',
            'Real-time sync with warehouse management system',
            'Safety stock buffers for popular items',
            'Reservation vs immediate decrement debate',
            'Eventual consistency acceptable for browse, strict for checkout'
          ]
        },
        {
          topic: 'Search Optimization',
          points: [
            'Sharding strategy: By category vs by product ID',
            'Learning-to-rank models trained on click data',
            'A/B testing ranking algorithms',
            'Query understanding pipeline (NLU)',
            'Personalization without filter bubble'
          ]
        },
        {
          topic: 'Handling Flash Sales',
          points: [
            'Virtual waiting room to throttle traffic',
            'Pre-warmed caches and scaled infrastructure',
            'Inventory pre-allocation by region',
            'Queue-based checkout to handle spikes',
            'Graceful degradation: Disable reviews, recommendations'
          ]
        },
        {
          topic: 'Payment Processing',
          points: [
            'Authorize at checkout, capture at ship time',
            'PCI compliance: Tokenize card data',
            'Multiple payment method support',
            'Fraud detection before authorization',
            'Idempotency keys for retry safety'
          ]
        }
      ],

      requirements: ['Product catalog', 'Search', 'Cart', 'Checkout', 'Payments', 'Order tracking', 'Reviews', 'Recommendations'],
      components: ['Product service', 'Search (Elasticsearch)', 'Cart service', 'Order service', 'Payment service', 'Inventory service', 'Recommendation'],
      keyDecisions: [
        'Microservices architecture: Each domain owns its data',
        'Event-driven: Order events trigger inventory, notification, shipping',
        'Distributed transactions: Saga pattern for checkout flow',
        'Search: Elasticsearch with product embeddings',
        'Inventory: Pessimistic locking for popular items during flash sales'
      ],
      edgeCases: [
        { scenario: 'Flash sale with 10,000 users buying last 100 units simultaneously', impact: 'Overselling beyond actual inventory, negative stock counts, fulfillment failures', mitigation: 'Pessimistic locking with Redis DECR for atomic inventory, pre-decrement stock with rollback on payment failure' },
        { scenario: 'Cart items go out of stock during checkout flow', impact: 'User completes payment but order cannot be fulfilled, requiring refund and poor experience', mitigation: 'Soft reservation with TTL on cart add, re-validate inventory at payment time, show real-time stock warnings' },
        { scenario: 'Distributed transaction failure between order and payment services', impact: 'Payment charged but order not created, or order created but payment not captured', mitigation: 'Saga pattern with compensating transactions, idempotency keys on payment calls, reconciliation job for orphaned records' },
        { scenario: 'Search index stale after bulk price or inventory update', impact: 'Users see wrong prices or buy items shown as in-stock that are actually sold out', mitigation: 'Near-real-time index updates via change data capture (CDC), show disclaimers on cached results' },
        { scenario: 'Seller uploads millions of product listings in bulk', impact: 'Ingestion pipeline backlog delays product visibility, search index falls behind', mitigation: 'Rate-limited bulk upload API with async processing, priority queue for paid sellers, background indexing' },
      ],
      tradeoffs: [
        { decision: 'Monolith vs microservices for e-commerce', pros: 'Monolith is simpler to deploy and debug; microservices enable independent scaling per domain', cons: 'Monolith becomes unwieldy at scale; microservices add network latency and operational overhead', recommendation: 'Microservices with domain-driven boundaries (catalog, cart, order, payment, inventory)' },
        { decision: 'Synchronous vs event-driven order processing', pros: 'Synchronous gives immediate confirmation; event-driven decouples services and handles spikes', cons: 'Synchronous creates tight coupling and cascading failures; event-driven adds complexity and eventual consistency', recommendation: 'Event-driven with Kafka for post-checkout steps, synchronous only for payment capture' },
        { decision: 'SQL vs NoSQL for product catalog', pros: 'SQL provides rich queries and joins across product attributes; NoSQL scales reads horizontally', cons: 'SQL sharding is complex for diverse product schemas; NoSQL lacks ad-hoc query flexibility', recommendation: 'NoSQL (DynamoDB) for product reads, SQL for seller portal and analytics, Elasticsearch for search' },
        { decision: 'Pessimistic vs optimistic locking for inventory', pros: 'Pessimistic prevents overselling with certainty; optimistic allows higher throughput with retry', cons: 'Pessimistic creates contention bottlenecks; optimistic can fail under extreme concurrency', recommendation: 'Pessimistic for flash sales and high-demand items, optimistic for regular inventory updates' },
      ],
      layeredDesign: [
        { name: 'Storefront & API Layer', purpose: 'Serve product pages, handle search queries, and manage shopping cart', components: ['Web/Mobile BFF', 'Search API (Elasticsearch)', 'Cart Service', 'Session Store'] },
        { name: 'Business Logic Layer', purpose: 'Process orders, calculate pricing, and manage seller operations', components: ['Order Service', 'Pricing Engine', 'Promotion Service', 'Seller Portal'] },
        { name: 'Transaction & Payment Layer', purpose: 'Handle payment processing, inventory reservation, and order fulfillment', components: ['Payment Gateway', 'Inventory Service', 'Fulfillment Orchestrator', 'Refund Service'] },
        { name: 'Data & Analytics Layer', purpose: 'Store product catalog, user behavior, and power recommendations', components: ['Product DB (DynamoDB)', 'User Store (PostgreSQL)', 'Event Bus (Kafka)', 'Recommendation Engine'] },
      ],
    },
    {
      id: 'google-docs',
      title: 'Google Docs',
      subtitle: 'Collaborative Editing',
      icon: 'edit',
      color: '#4285f4',
      difficulty: 'Hard',
      description: 'Design a real-time collaborative document editing system with conflict resolution.',

      introduction: `Google Docs is a real-time collaborative document editing system where multiple users can simultaneously edit the same document. The system must handle concurrent edits, resolve conflicts automatically, and ensure all users see a consistent document state.

The key technical challenge is maintaining consistency when multiple users edit the same document simultaneously. This requires sophisticated algorithms like Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs).`,

      functionalRequirements: [
        'Real-time collaborative editing',
        'Multiple cursors and selections visible',
        'Rich text formatting (bold, italic, headings)',
        'Comments and suggestions',
        'Version history with restore',
        'Offline editing with sync on reconnect',
        'Sharing with permissions (view, comment, edit)',
        'Document templates'
      ],

      nonFunctionalRequirements: [
        'Operation latency <100ms for propagation',
        'Support 100+ concurrent editors per document',
        'Handle 5B+ documents',
        'Eventually consistent - all clients converge',
        '99.99% availability',
        'Offline-first: Work without connection'
      ],

      dataModel: {
        description: 'Documents, operations, and collaboration state',
        schema: `documents {
  id: uuid PK
  ownerId: bigint FK
  title: varchar(500)
  content: text -- current snapshot
  revision: bigint -- current revision number
  createdAt: timestamp
  updatedAt: timestamp
}

operations {
  id: uuid PK
  documentId: uuid FK
  userId: bigint FK
  revision: bigint
  type: enum(INSERT, DELETE, RETAIN, FORMAT)
  position: int
  content: text nullable
  attributes: jsonb nullable (for formatting)
  timestamp: timestamp
}

collaborators {
  documentId: uuid FK
  userId: bigint FK
  permission: enum(VIEW, COMMENT, EDIT, OWNER)
  addedAt: timestamp
}

presence {
  documentId: uuid PK
  userId: bigint PK
  cursorPosition: int
  selectionStart: int
  selectionEnd: int
  color: varchar(7)
  name: varchar(100)
  lastSeen: timestamp
}`
      },

      apiDesign: {
        description: 'WebSocket for real-time sync, REST for document management',
        endpoints: [
          {
            method: 'WS',
            path: '/ws/doc/{id}/collaborate',
            params: 'authToken in header',
            response: 'Bidirectional: send operations, receive operations + presence'
          },
          {
            method: 'OPERATION',
            path: '(via WebSocket)',
            params: '{ type, position, content, baseRevision }',
            response: '{ ack, serverRevision, transformedOps[] }'
          },
          {
            method: 'GET',
            path: '/api/doc/{id}',
            params: '',
            response: '{ document, content, revision, collaborators[] }'
          },
          {
            method: 'GET',
            path: '/api/doc/{id}/history',
            params: '?since=&limit=',
            response: '{ revisions[], hasMore }'
          },
          {
            method: 'POST',
            path: '/api/doc/{id}/share',
            params: '{ email, permission }',
            response: '{ shareLink }'
          },
          {
            method: 'POST',
            path: '/api/doc/{id}/restore',
            params: '{ revision }',
            response: '{ newRevision }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How does Operational Transformation work?',
          answer: `OT transforms concurrent operations to maintain consistency.

Example:
- User A inserts "X" at position 5
- User B inserts "Y" at position 3
- Both started from same document state

Without transformation:
- A applies A's op, then B's op → result differs
- B applies B's op, then A's op → different result

With transformation:
- When A receives B's op, transform it:
  B's op was at position 3, A inserted before at 5
  So B's op position stays 3
- When B receives A's op, transform it:
  A's op was at position 5, B inserted at 3
  So A's op position becomes 5+1=6

Result: Both converge to same document state.`
        },
        {
          question: 'OT vs CRDT - which to use?',
          answer: `Operational Transformation (Google Docs approach):
+ Proven at scale (Google uses it)
+ Compact operations
- Complex implementation (quadratic transform)
- Requires central server for ordering

CRDT (Figma, Notion use variants):
+ No central coordination needed
+ Mathematically guaranteed convergence
+ Better for P2P scenarios
- Larger data structures
- Can have "surprising" merge results

For Google Docs clone: OT with central server
For offline-first/P2P: CRDT`
        },
        {
          question: 'How do we handle offline editing?',
          answer: `1. Store operations locally when offline:
   - Queue all operations in IndexedDB
   - Apply locally for instant feedback

2. On reconnect:
   - Send all queued operations to server
   - Server transforms against operations that happened while offline
   - Receive transformed operations from others
   - Apply to local document

3. Conflict resolution:
   - OT/CRDT ensures convergence
   - User may see content "jump" as remote changes apply
   - Never lose user's work

4. Version vector:
   - Track which operations each client has seen
   - Sync only missing operations`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple last-write-wins without real-time collaboration',
        svgTemplate: 'googleDocs',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                          GOOGLE DOCS BASIC                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ API Gateway  │─────▶│  Doc Service     │          │
│  └──────────┘      └──────────────┘      └────────┬─────────┘          │
│                                                    │                    │
│  EDITING:                                 ┌────────▼─────────┐          │
│  1. Load document                         │    PostgreSQL    │          │
│  2. Edit locally                          │                  │          │
│  3. Save entire document                  │  - Documents     │          │
│  4. Overwrite what's in DB                │  - Content       │          │
│                                           │                  │          │
│  PROBLEM: User A and B both editing       └──────────────────┘          │
│           A saves → B saves                                             │
│           A's changes are lost!                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Last-write-wins causes data loss',
          'No real-time collaboration',
          'No visibility into other editors',
          'Save entire document on each change (inefficient)',
          'No offline support'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'googleDocsAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GOOGLE DOCS PRODUCTION                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CLIENTS                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │        │
│  │  │ Client A │  │ Client B │  │ Client C │  ... (up to 100)         │        │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘                          │        │
│  │       │              │              │                               │        │
│  │       └──────────────┼──────────────┘                               │        │
│  │                      │ WebSocket                                    │        │
│  │                      ▼                                               │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  COLLABORATION LAYER                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  ┌────────────────────────────────────────────────────────┐         │        │
│  │  │              WebSocket Gateway                          │         │        │
│  │  │   (Sticky sessions per document via consistent hash)   │         │        │
│  │  └────────────────────────┬───────────────────────────────┘         │        │
│  │                           │                                          │        │
│  │  ┌────────────────────────▼───────────────────────────────┐         │        │
│  │  │            Collaboration Server (per document)          │         │        │
│  │  │                                                          │         │        │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │         │        │
│  │  │  │ OT Engine   │  │  Presence   │  │  Op Buffer      │ │         │        │
│  │  │  │             │  │  Manager    │  │  (in-memory)    │ │         │        │
│  │  │  │- Transform  │  │             │  │                 │ │         │        │
│  │  │  │- Compose    │  │- Cursors    │  │- Recent ops     │ │         │        │
│  │  │  │- Apply      │  │- Selections │  │- For new joins  │ │         │        │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────┘ │         │        │
│  │  └────────────────────────────────────────────────────────┘         │        │
│  │                           │                                          │        │
│  └───────────────────────────┼──────────────────────────────────────────┘        │
│                              │                                                   │
│  PERSISTENCE LAYER           │                                                   │
│  ┌───────────────────────────┼──────────────────────────────────────────┐       │
│  │                           ▼                                           │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │       │
│  │  │ Operation    │  │  Snapshot    │  │  Document    │               │       │
│  │  │    Log       │  │   Store      │  │   Metadata   │               │       │
│  │  │ (Cassandra)  │  │    (GCS)     │  │  (Spanner)   │               │       │
│  │  │              │  │              │  │              │               │       │
│  │  │- All ops     │  │- Periodic    │  │- Ownership   │               │       │
│  │  │- For history │  │  snapshots   │  │- Sharing     │               │       │
│  │  │- Replay      │  │- Quick load  │  │- Permissions │               │       │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │       │
│  └───────────────────────────────────────────────────────────────────────┘       │
│                                                                                  │
│  OPERATION FLOW                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  1. Client sends operation with baseRevision                        │        │
│  │  2. Server checks: is baseRevision current?                         │        │
│  │     - Yes: Apply directly, broadcast to all clients                 │        │
│  │     - No: Transform against ops since baseRevision                 │        │
│  │  3. Assign new revision number, persist to op log                  │        │
│  │  4. Broadcast transformed op to all connected clients              │        │
│  │  5. Each client transforms its pending ops against received op     │        │
│  │  6. All clients converge to same document state                    │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'OT engine: Transforms concurrent operations for consistency',
          'Sticky WebSocket: All clients for a doc connect to same server',
          'Operation log: Append-only log for history and replay',
          'Periodic snapshots: Avoid replaying all ops from beginning',
          'Presence system: Real-time cursor/selection sharing',
          'Offline queue: Buffer ops locally, sync on reconnect'
        ]
      },

      editFlow: {
        title: 'Collaborative Edit Flow',
        steps: [
          'Client types character, creates INSERT operation',
          'Apply operation locally immediately (optimistic)',
          'Send operation to server with current baseRevision',
          'Server receives, checks if baseRevision is current',
          'If not current: transform operation against missed ops',
          'Assign next revision number to operation',
          'Persist operation to operation log',
          'Broadcast operation to all other connected clients',
          'Each client transforms against their pending ops',
          'Clients apply transformed operation to their document',
          'All documents converge to same state'
        ]
      },

      syncFlow: {
        title: 'Initial Load / Reconnect Flow',
        steps: [
          'Client connects via WebSocket with document ID',
          'Server authenticates, checks permissions',
          'Load latest snapshot from storage',
          'Fetch all operations since snapshot revision',
          'Apply operations to snapshot to get current state',
          'Send document content + current revision to client',
          'Send current presence (other users cursors/selections)',
          'Client ready to send/receive operations',
          'If offline operations queued, send them now',
          'Server transforms offline ops, broadcasts results'
        ]
      },

      discussionPoints: [
        {
          topic: 'OT Transform Functions',
          points: [
            'INSERT vs INSERT: Adjust positions based on order',
            'INSERT vs DELETE: Adjust positions, may split delete',
            'DELETE vs DELETE: Handle overlapping ranges',
            'Commutativity: transform(a,b) + transform(b,a) converge',
            'Google Docs uses composition for efficiency'
          ]
        },
        {
          topic: 'Presence System',
          points: [
            'Real-time cursor position updates via WebSocket',
            'Color-coded for each collaborator',
            'Selection highlighting for visible ranges',
            'Throttle updates to prevent flooding',
            'Show "User typing..." indicators'
          ]
        },
        {
          topic: 'Version History',
          points: [
            'Operation log stores every change',
            'Group operations into sessions/revisions',
            'Restore by replaying ops up to point',
            'Diff view: Apply ops incrementally',
            'Named versions for milestones'
          ]
        },
        {
          topic: 'Scale Considerations',
          points: [
            'Sharding: Each document handled by one server',
            'Consistent hashing for server selection',
            'Failover: Replay from op log on new server',
            'Read replicas for view-only users',
            'Rate limiting: Max ops per second per client'
          ]
        }
      ],

      requirements: ['Real-time editing', 'Multiple cursors', 'Comments', 'Version history', 'Offline support', 'Sharing permissions'],
      components: ['Document service', 'Collaboration service', 'Storage service', 'WebSocket servers', 'Version control'],
      keyDecisions: [
        'Operational Transformation (OT): Transform concurrent operations',
        'Or CRDT: Conflict-free replicated data types for eventual consistency',
        'WebSocket for real-time sync',
        'Presence system: Show active cursors/selections',
        'Periodic snapshots + operation log for version history'
      ],
      edgeCases: [
        { scenario: 'Two users type at the exact same cursor position simultaneously', impact: 'Character interleaving creates garbled text if operations not properly transformed', mitigation: 'Operational Transformation resolves concurrent inserts deterministically, server assigns canonical operation order' },
        { scenario: 'User goes offline mid-edit and reconnects with diverged document state', impact: 'Local changes conflict with remote changes made during offline period', mitigation: 'Buffer offline operations, replay and transform against server operations on reconnect, CRDT ensures eventual convergence' },
        { scenario: 'Document with 100+ simultaneous editors', impact: 'Operation transform server becomes bottleneck, cursor rendering overwhelms client', mitigation: 'Limit visible cursors to nearby editors, batch operation transforms, partition document into independently editable sections' },
        { scenario: 'Large paste operation (100K+ characters) from clipboard', impact: 'Single massive operation blocks transform pipeline and causes latency spike for all editors', mitigation: 'Split large operations into chunks, process incrementally, show progress indicator to other editors' },
        { scenario: 'Version history storage grows unbounded for long-lived documents', impact: 'Storage costs escalate, loading version history becomes slow', mitigation: 'Periodic snapshots with operation compaction, store only snapshots after 30 days, archive old versions to cold storage' },
      ],
      tradeoffs: [
        { decision: 'OT vs CRDT for conflict resolution', pros: 'OT is mature with proven implementations (Google Docs uses it); CRDT is mathematically guaranteed conflict-free', cons: 'OT requires central server for operation ordering; CRDT has higher memory overhead and complex garbage collection', recommendation: 'OT for centralized SaaS product, CRDT for peer-to-peer or offline-heavy use cases' },
        { decision: 'WebSocket vs Server-Sent Events for real-time sync', pros: 'WebSocket is bidirectional with lower overhead; SSE is simpler and works with HTTP/2 multiplexing', cons: 'WebSocket requires connection upgrade and special proxy config; SSE is unidirectional requiring separate POST for edits', recommendation: 'WebSocket for real-time collaboration due to bidirectional need and lower latency' },
        { decision: 'Operation log vs snapshot-based versioning', pros: 'Operation log enables precise undo and time-travel; snapshots are faster to load and simpler', cons: 'Operation log grows unbounded and is slow to replay; snapshots lose granular change attribution', recommendation: 'Hybrid: operation log for recent edits (last 7 days), periodic snapshots for long-term history' },
      ],
      layeredDesign: [
        { name: 'Client Editor Layer', purpose: 'Render document, capture user operations, and manage local operation buffer', components: ['Rich Text Editor', 'Local Operation Buffer', 'Cursor/Selection Manager'] },
        { name: 'Collaboration & Sync Layer', purpose: 'Transform and apply concurrent operations in real-time across all clients', components: ['OT/CRDT Engine', 'WebSocket Server', 'Presence Service', 'Operation Sequencer'] },
        { name: 'Document Storage Layer', purpose: 'Persist document state, operation history, and version snapshots', components: ['Document Store', 'Operation Log', 'Snapshot Service', 'Blob Storage (images)'] },
        { name: 'Access & Sharing Layer', purpose: 'Manage document permissions, sharing links, and team workspaces', components: ['Permission Service', 'Sharing API', 'Comment Service', 'Notification Service'] },
      ],
    },
    {
      id: 'payment-system',
      title: 'Payment System',
      subtitle: 'Stripe / PayPal',
      icon: 'creditCard',
      color: '#635bff',
      difficulty: 'Hard',
      description: 'Design a payment processing system handling cards, transfers, and refunds.',

      introduction: `Payment systems like Stripe and PayPal handle trillions of dollars in transactions annually. They must be extremely reliable, secure, and compliant with financial regulations. The system processes card payments, handles refunds, detects fraud, and maintains accurate financial records.

Key challenges include ensuring exactly-once payment processing, maintaining PCI-DSS compliance, implementing real-time fraud detection, and guaranteeing financial accuracy through double-entry bookkeeping.`,

      functionalRequirements: [
        'Process card payments (authorization, capture)',
        'Handle refunds (full and partial)',
        'Support multiple payment methods (cards, bank transfers, wallets)',
        'Recurring billing / subscriptions',
        'Multi-currency support with FX',
        'Real-time fraud detection',
        'Dispute / chargeback handling',
        'Payout to merchants'
      ],

      nonFunctionalRequirements: [
        'Payment latency <500ms for authorization',
        '99.999% availability (5 min downtime/year)',
        'PCI-DSS Level 1 compliance',
        'Exactly-once payment processing',
        'Handle 10K+ transactions/second',
        'Audit trail for all financial operations'
      ],

      dataModel: {
        description: 'Double-entry ledger with transactions and accounts',
        schema: `payments {
  id: varchar(27) PK (pi_xxx)
  merchantId: bigint FK
  customerId: bigint FK
  amount: bigint (cents)
  currency: varchar(3)
  status: enum(PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED)
  paymentMethodId: varchar FK
  idempotencyKey: varchar unique
  metadata: jsonb
  createdAt: timestamp
}

ledger_entries {
  id: bigint PK
  transactionId: varchar FK
  accountId: bigint FK
  type: enum(DEBIT, CREDIT)
  amount: bigint
  currency: varchar(3)
  balance: bigint (running balance)
  createdAt: timestamp
}

accounts {
  id: bigint PK
  type: enum(ASSET, LIABILITY, REVENUE, EXPENSE)
  name: varchar
  currency: varchar(3)
  balance: bigint
}

payment_methods {
  id: varchar(27) PK (pm_xxx)
  customerId: bigint FK
  type: enum(CARD, BANK_ACCOUNT, WALLET)
  tokenizedData: varchar (reference to vault)
  last4: varchar(4)
  expiryMonth: int
  expiryYear: int
}

refunds {
  id: varchar(27) PK (re_xxx)
  paymentId: varchar FK
  amount: bigint
  status: enum(PENDING, SUCCEEDED, FAILED)
  reason: varchar
  createdAt: timestamp
}`
      },

      apiDesign: {
        description: 'REST APIs with idempotency for safe retries',
        endpoints: [
          {
            method: 'POST',
            path: '/v1/payment_intents',
            params: '{ amount, currency, payment_method, confirm: true }',
            response: '{ id, status, amount, client_secret }'
          },
          {
            method: 'POST',
            path: '/v1/payment_intents/{id}/capture',
            params: '{ amount_to_capture }',
            response: '{ id, status: captured, amount_captured }'
          },
          {
            method: 'POST',
            path: '/v1/refunds',
            params: '{ payment_intent, amount, reason }',
            response: '{ id, status, amount }'
          },
          {
            method: 'POST',
            path: '/v1/payouts',
            params: '{ amount, currency, destination }',
            response: '{ id, status, arrival_date }'
          },
          {
            method: 'GET',
            path: '/v1/balance',
            params: '',
            response: '{ available: [{amount, currency}], pending: [{amount, currency}] }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we ensure exactly-once payment processing?',
          answer: `Idempotency keys are essential:

1. Client generates unique key per payment attempt
2. Server stores key → result mapping
3. On retry with same key, return cached result

Implementation:
- Store in Redis with TTL (24 hours)
- Check idempotency key BEFORE processing
- Use database transaction to ensure atomic check-and-process
- Return cached result for duplicate requests

Additionally:
- Unique constraints on payment IDs
- Optimistic locking on balance updates
- Saga pattern with compensating transactions`
        },
        {
          question: 'How does double-entry bookkeeping work?',
          answer: `Every transaction creates balanced entries:

Example: Customer pays $100
1. DEBIT  Stripe_Balance  $100 (asset increases)
2. CREDIT Customer_Payable $100 (liability increases)

When merchant is paid out:
3. DEBIT  Merchant_Payable $97 (liability decreases)
4. CREDIT Stripe_Balance   $97 (asset decreases)
5. CREDIT Revenue          $3  (Stripe's fee)

Invariant: Sum of all debits = Sum of all credits

Benefits:
- Self-auditing: Imbalance indicates bug
- Clear money flow visibility
- Required for financial compliance`
        },
        {
          question: 'How do we handle PCI-DSS compliance?',
          answer: `Cardholder Data Environment (CDE) isolation:

1. Card data never touches main systems
   - Tokenization at point of entry
   - PCI vault stores actual card numbers
   - Application uses tokens (pm_xxx)

2. Network segmentation
   - CDE in isolated VPC
   - Strict firewall rules
   - Separate authentication

3. Client-side tokenization
   - Stripe.js collects card data
   - Sends directly to Stripe (not merchant server)
   - Merchant receives token only

4. Key management
   - HSM (Hardware Security Module) for encryption
   - Regular key rotation
   - Audit logging of all access`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple payment processing without compliance isolation',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT SYSTEM BASIC                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│   API Server │─────▶│   Payment DB     │          │
│  └──────────┘      └──────┬───────┘      └──────────────────┘          │
│                           │                                             │
│                           │                                             │
│                    ┌──────▼───────┐                                    │
│                    │  Card Network │                                    │
│                    │ (Visa, MC)    │                                    │
│                    └───────────────┘                                    │
│                                                                         │
│  PROBLEMS:                                                              │
│  - Card data stored in main DB (PCI violation)                         │
│  - No idempotency (double charges possible)                            │
│  - Single database = single point of failure                           │
│  - No fraud detection                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Card data in main database (PCI violation)',
          'No idempotency - retries cause double charges',
          'Single point of failure',
          'No fraud detection',
          'No audit trail / ledger'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'paymentAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT SYSTEM PRODUCTION                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CLIENT SIDE                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ┌──────────┐                       ┌───────────────┐               │        │
│  │  │ Checkout │── Card Data ────────▶│  Stripe.js    │               │        │
│  │  │   Form   │                       │ (Tokenization)│               │        │
│  │  └──────────┘                       └───────┬───────┘               │        │
│  │                                             │ (pm_xxx token)        │        │
│  │       ┌─────────────────────────────────────┘                       │        │
│  │       ▼                                                              │        │
│  │  ┌────────────┐                                                     │        │
│  │  │ Merchant   │── Token only (no card data) ────────────────────▶  │        │
│  │  │  Server    │                                                     │        │
│  │  └────────────┘                                                     │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  STRIPE INFRASTRUCTURE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  ┌─────────────────────────────────────────────────────────────┐    │        │
│  │  │                      API GATEWAY                             │    │        │
│  │  │   Auth → Rate Limit → Idempotency → Route                   │    │        │
│  │  └────────────────────────────┬────────────────────────────────┘    │        │
│  │                               │                                      │        │
│  │     ┌─────────────────────────┼──────────────────────────────┐      │        │
│  │     ▼                         ▼                              ▼      │        │
│  │  ┌────────┐            ┌────────────┐               ┌────────────┐  │        │
│  │  │Payment │            │   Fraud    │               │   Ledger   │  │        │
│  │  │Service │◀──────────▶│  Service   │               │  Service   │  │        │
│  │  └───┬────┘            └────────────┘               └──────┬─────┘  │        │
│  │      │                                                      │        │        │
│  │      │                   CARDHOLDER DATA ENV (PCI)          │        │        │
│  │      │    ┌──────────────────────────────────────────┐     │        │        │
│  │      │    │                                          │     │        │        │
│  │      └───▶│  ┌──────────┐         ┌──────────┐      │     │        │        │
│  │           │  │   Token  │────────▶│   Card   │      │     │        │        │
│  │           │  │  Service │         │   Vault  │      │     │        │        │
│  │           │  └────┬─────┘         │   (HSM)  │      │     │        │        │
│  │           │       │               └──────────┘      │     │        │        │
│  │           │       ▼                                  │     │        │        │
│  │           │  ┌──────────────┐                       │     │        │        │
│  │           │  │ Card Network │                       │     │        │        │
│  │           │  │ Integration  │                       │     │        │        │
│  │           │  │(Visa/MC/Amex)│                       │     │        │        │
│  │           │  └──────────────┘                       │     │        │        │
│  │           └──────────────────────────────────────────┘     │        │        │
│  │                                                            │        │        │
│  │  ┌────────────────────────────────────────────────────────┴──┐     │        │
│  │  │                     LEDGER DATABASE                        │     │        │
│  │  │  Double-entry bookkeeping for all money movements         │     │        │
│  │  │  ┌─────────────────────────────────────────────────────┐  │     │        │
│  │  │  │ Every payment:                                       │  │     │        │
│  │  │  │   DEBIT  stripe_balance    $100                     │  │     │        │
│  │  │  │   CREDIT customer_payable  $100                     │  │     │        │
│  │  │  └─────────────────────────────────────────────────────┘  │     │        │
│  │  └────────────────────────────────────────────────────────────┘     │        │
│  │                                                                      │        │
│  └──────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  FRAUD DETECTION                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Real-time scoring on every payment:                                │        │
│  │  - Velocity checks (too many payments from same card)              │        │
│  │  - Location anomalies (card used in different country)             │        │
│  │  - Amount patterns (unusual purchase amount)                       │        │
│  │  - Device fingerprinting                                           │        │
│  │  - ML models trained on chargeback data                            │        │
│  │                                                                      │        │
│  │  Actions: Block, 3DS challenge, flag for review                    │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Client-side tokenization: Card data never touches merchant server',
          'PCI-isolated vault: Card numbers stored in HSM-backed vault',
          'Idempotency layer: Prevents duplicate charges on retry',
          'Double-entry ledger: Self-auditing financial records',
          'Real-time fraud scoring: ML models on every transaction',
          'Multi-network integration: Visa, Mastercard, Amex, etc.'
        ]
      },

      paymentFlow: {
        title: 'Payment Flow',
        steps: [
          'Customer enters card details in Stripe.js form',
          'Stripe.js tokenizes card, returns payment method ID (pm_xxx)',
          'Merchant server creates PaymentIntent with token',
          'Stripe checks idempotency key - return cached if duplicate',
          'Fraud service scores transaction in real-time',
          'If high risk: Trigger 3D Secure challenge',
          'Token service retrieves card from vault',
          'Send authorization request to card network',
          'Card network returns approval/decline',
          'Create ledger entries for successful payment',
          'Return result to merchant, send webhook',
          'Capture later or auto-capture based on settings'
        ]
      },

      refundFlow: {
        title: 'Refund Flow',
        steps: [
          'Merchant initiates refund via API',
          'Validate: Amount <= original payment, payment is captured',
          'Create refund record with idempotency check',
          'For card payments: Send reversal to card network',
          'Card network processes, returns result',
          'Create ledger entries (reverse original entries)',
          'Update payment status to REFUNDED',
          'Send webhook notification to merchant',
          'Customer receives funds in 5-10 business days'
        ]
      },

      discussionPoints: [
        {
          topic: 'Authorization vs Capture',
          points: [
            'Authorize: Bank reserves funds, no actual charge',
            'Capture: Actually transfers money',
            'Use case: E-commerce captures at ship time',
            'Auth holds expire (typically 7 days)',
            'Auth + capture in one call for simple cases'
          ]
        },
        {
          topic: 'Handling Disputes/Chargebacks',
          points: [
            'Customer disputes charge with their bank',
            'Bank reverses charge, notifies merchant',
            'Merchant has 7-14 days to provide evidence',
            'Evidence: Receipt, delivery proof, communication',
            'Win rate: ~20-30% with good evidence'
          ]
        },
        {
          topic: 'Multi-Currency Support',
          points: [
            'Store amounts in smallest unit (cents)',
            'FX conversion at payment time vs settlement time',
            'Currency conversion fees: 1-2%',
            'Local acquiring: Route to local bank in customers country',
            'Presentment currency: Show price in customers currency'
          ]
        },
        {
          topic: 'Reconciliation',
          points: [
            'Match internal ledger with bank statements',
            'Daily automated reconciliation',
            'Flag discrepancies for manual review',
            'Handle timing differences (T+1, T+2)',
            'Settlement batching with card networks'
          ]
        }
      ],

      requirements: ['Process payments', 'Handle refunds', 'Fraud detection', 'Multi-currency', 'Recurring billing', 'Compliance (PCI-DSS)'],
      components: ['Payment gateway', 'Ledger service', 'Fraud detection', 'Notification service', 'Reconciliation', 'Compliance service'],
      keyDecisions: [
        'Double-entry ledger: Every transaction has debit and credit entries',
        'Idempotency keys: Prevent duplicate charges',
        'Saga pattern: Handle distributed transaction failures',
        'PCI-DSS: Tokenize card data, isolate cardholder data environment',
        'Real-time fraud scoring with ML models'
      ],
      edgeCases: [
        { scenario: 'Duplicate payment submission due to client retry on timeout', impact: 'Customer charged twice for the same order, requires manual refund and erodes trust', mitigation: 'Idempotency keys on every payment request, server deduplicates within a window, return original result on retry' },
        { scenario: 'Payment processor returns ambiguous response (network timeout)', impact: 'Unknown payment state: money may or may not have been captured', mitigation: 'Record pending state, query processor status API with exponential backoff, reconciliation job resolves within minutes' },
        { scenario: 'Currency conversion rate changes between quote and settlement', impact: 'Merchant receives different amount than displayed to customer, potential loss', mitigation: 'Lock exchange rate at quote time with short TTL, include rate in idempotency payload, absorb small differences as cost' },
        { scenario: 'Partial refund on a split-tender transaction (card + wallet)', impact: 'Refund must be distributed across original payment methods proportionally', mitigation: 'Track payment method breakdown per transaction, refund engine applies proportional split, manual override for exceptions' },
        { scenario: 'Fraud detection false positive blocks legitimate high-value transaction', impact: 'Customer unable to complete purchase, abandons cart, revenue lost', mitigation: 'Tiered fraud scoring with step-up verification (3DS, OTP) instead of hard block, manual review queue for borderline cases' },
      ],
      tradeoffs: [
        { decision: 'Synchronous vs asynchronous payment processing', pros: 'Synchronous gives instant confirmation to customer; async handles higher throughput and retries gracefully', cons: 'Synchronous blocks the checkout flow on processor latency; async adds complexity and delayed confirmation', recommendation: 'Synchronous for card payments with <3s timeout, async for bank transfers and settlements' },
        { decision: 'Single ledger vs double-entry bookkeeping', pros: 'Single ledger is simpler; double-entry ensures every debit has a matching credit for auditability', cons: 'Single ledger is error-prone for reconciliation; double-entry doubles write volume', recommendation: 'Double-entry ledger for production payment systems, it is the industry standard for financial accuracy' },
        { decision: 'Build payment processing vs use Stripe/Adyen', pros: 'Building gives full control and lower per-transaction cost at scale; third-party handles PCI compliance', cons: 'Building requires PCI-DSS certification and years of effort; third-party takes percentage per transaction', recommendation: 'Third-party for startups, build only when processing >$1B/year and have dedicated compliance team' },
        { decision: 'Strong consistency vs eventual consistency for balances', pros: 'Strong consistency prevents overdrafts; eventual consistency allows higher throughput', cons: 'Strong consistency limits horizontal scaling; eventual consistency risks temporary negative balances', recommendation: 'Strong consistency for account balances and ledger, eventual consistency for analytics and reporting' },
      ],
      layeredDesign: [
        { name: 'API & Gateway Layer', purpose: 'Accept payment requests, validate input, and enforce idempotency', components: ['Payment API', 'Idempotency Store', 'Auth & Rate Limiter', 'Merchant Dashboard'] },
        { name: 'Payment Orchestration Layer', purpose: 'Route payments to processors, manage transaction state machines', components: ['Payment Router', 'Transaction State Machine', 'Retry Manager', 'Fraud Detection Engine'] },
        { name: 'Ledger & Accounting Layer', purpose: 'Maintain double-entry bookkeeping and settlement records', components: ['Double-Entry Ledger', 'Settlement Engine', 'Reconciliation Service', 'Currency Converter'] },
        { name: 'Compliance & Security Layer', purpose: 'Ensure PCI-DSS compliance, tokenize card data, and manage encryption', components: ['Card Tokenizer', 'HSM (Hardware Security Module)', 'Audit Logger', 'PCI Boundary'] },
      ],
    },
    {
      id: 'search-engine',
      title: 'Web Search Engine',
      subtitle: 'Google Search',
      icon: 'search',
      color: '#4285f4',
      difficulty: 'Hard',
      description: 'Design a web search engine with crawling, indexing, and ranking.',

      introduction: `Google processes over 8.5 billion searches per day, making it the most used service on the internet. A web search engine must crawl billions of pages, build efficient indexes, and rank results by relevance in under 200ms.

The key challenges are scale (100+ billion pages), freshness (crawl 20B pages/day), and quality (PageRank + ML ranking). The architecture requires distributed crawling, inverted indexes, and multi-stage ranking pipelines.`,

      functionalRequirements: [
        'Crawl and index billions of web pages',
        'Return relevant results in <200ms',
        'Spell correction and suggestions',
        'Autocomplete as user types',
        'Support multiple languages',
        'Personalized results based on history',
        'Image, video, and news search',
        'Safe search filtering'
      ],

      nonFunctionalRequirements: [
        'Handle 100K+ queries per second',
        'Index freshness: hours for news, days for general',
        'Sub-200ms query latency (p99)',
        '99.99% availability',
        'Support 100+ petabytes of index data',
        'Crawl 20 billion pages per day'
      ],

      dataModel: {
        description: 'Inverted index mapping terms to documents',
        schema: `inverted_index {
  term: varchar PK
  posting_list: [
    { doc_id, frequency, positions[], field_weights }
  ]
  idf: float -- inverse document frequency
}

documents {
  doc_id: bigint PK
  url: varchar
  title: text
  content_hash: varchar
  pagerank: float
  last_crawled: timestamp
  language: varchar
}

url_frontier {
  url: varchar PK
  priority: float
  last_crawled: timestamp
  crawl_frequency: interval
}`
      },

      apiDesign: {
        description: 'Search and autocomplete endpoints',
        endpoints: [
          { method: 'GET', path: '/search', params: 'q, page, lang, safe', response: '{ results[], total, spelling?, suggestions[] }' },
          { method: 'GET', path: '/autocomplete', params: 'prefix, lang', response: '{ suggestions[] }' },
          { method: 'GET', path: '/images', params: 'q, size, color', response: '{ images[], total }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does the inverted index work?',
          answer: `**Inverted Index Structure**:
- Forward index: doc_id → [words]
- Inverted index: word → [doc_ids + positions]

**Example**:
"cat" → [(doc1, pos:[5,23]), (doc7, pos:[1]), (doc99, pos:[45,67,89])]

**Query Processing**:
1. Parse query: "black cat" → ["black", "cat"]
2. Lookup posting lists for each term
3. Intersect lists (docs containing both)
4. Score by TF-IDF, proximity, PageRank
5. Return top K results

**Optimizations**:
- Skip lists for fast intersection
- Compression (variable-byte encoding)
- Tiered index: hot (memory), warm (SSD), cold (disk)`
        },
        {
          question: 'How does PageRank work?',
          answer: `**Core Idea**: Pages linked by many important pages are important.

**Algorithm**:
PR(A) = (1-d)/N + d × Σ(PR(Ti)/C(Ti))
- d = damping factor (0.85)
- Ti = pages linking to A
- C(Ti) = outbound links from Ti

**Implementation**:
1. Build web graph from crawled links
2. Initialize all pages with equal rank (1/N)
3. Iterate until convergence:
   - Each page distributes rank to outbound links
   - Add random jump factor (1-d)/N
4. Typically converges in 50-100 iterations

**Scale**: MapReduce over billions of pages
- Map: Emit (target, partial_rank) for each link
- Reduce: Sum partial ranks, apply formula`
        },
        {
          question: 'How do we handle 100K queries/second?',
          answer: `**Multi-tier Architecture**:
1. **DNS load balancing**: Route to nearest datacenter
2. **CDN caching**: Cache popular queries (20% of queries = 80% of traffic)
3. **Index sharding**: Partition by document ID or term
4. **Parallel query**: Query all shards simultaneously, merge results

**Index Partitioning**:
- **Document partitioning**: Each shard has full index for subset of docs
- **Term partitioning**: Each shard has all docs for subset of terms
- Google uses document partitioning (better load balance)

**Caching Layers**:
- Query cache: Exact match (60% hit rate)
- Result cache: Top results for common queries
- Posting list cache: Hot terms in memory`
        },
        {
          question: 'How do we keep the index fresh?',
          answer: `**Crawl Prioritization**:
- News sites: Every few minutes
- Popular sites: Daily
- Long-tail: Weekly/monthly
- Priority = PageRank × freshness_need × change_frequency

**Incremental Updates**:
1. Crawler detects changed pages (Last-Modified, ETag)
2. Parser extracts new content
3. Indexer updates posting lists
4. Real-time serving picks up changes

**Freshness vs Completeness**:
- Dedicated "fresh index" for breaking news
- Merge with main index periodically
- Query both and blend results`
        },
        {
          question: 'How does query understanding work?',
          answer: `**Query Processing Pipeline**:
1. **Tokenization**: Split query into terms
2. **Spelling correction**: "pyhton" → "python"
3. **Query expansion**: "car" → "car OR automobile"
4. **Intent detection**: "weather" → show weather widget
5. **Entity recognition**: "Apple stock" → finance results

**Spelling Correction**:
- Edit distance (Levenshtein)
- N-gram overlap
- Query logs: "Did you mean?" click-through data

**Ranking Features**:
- Query-document match (TF-IDF, BM25)
- PageRank
- Freshness
- User engagement (click-through rate)
- Personalization (search history, location)`
        }
      ],

      basicImplementation: {
        title: 'Basic Search Architecture',
        description: 'Query → Search Service → Elasticsearch with index shards for parallel query processing',
        svgTemplate: 'searchEngine',
        architecture: `
│ └───────┘      └───────┘       └───────┘       └───────┘       │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐                                            │
│   │  Result Merger  │                                            │
│   │  (Top K, Rank)  │                                            │
│   └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single datacenter = high latency for distant users',
          'No query caching',
          'Limited crawl capacity',
          'No real-time freshness'
        ]
      },

      advancedImplementation: {
        title: 'Production Search Architecture',
        svgTemplate: 'searchEngineAdvanced',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Google-Scale Search Architecture                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        CRAWLING PIPELINE                             │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │    │
│  │  │   URL    │───▶│  Crawl   │───▶│  Parser  │───▶│  Index   │      │    │
│  │  │ Frontier │    │ Workers  │    │ (Extract)│    │ Builder  │      │    │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                         │                                    │
│                                         ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     DISTRIBUTED INDEX (100+ PB)                      │    │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │    │
│  │  │   Hot Tier  │   │  Warm Tier  │   │  Cold Tier  │               │    │
│  │  │  (Memory)   │   │   (SSD)     │   │   (Disk)    │               │    │
│  │  │ Top 1% docs │   │ Next 10%   │   │  Long tail  │               │    │
│  │  └─────────────┘   └─────────────┘   └─────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        SERVING LAYER                                 │    │
│  │                                                                      │    │
│  │      ┌─────────────────────────────────────────────────────────┐    │    │
│  │      │                    QUERY FRONTEND                        │    │    │
│  │      │   ┌────────┐  ┌─────────┐  ┌────────┐  ┌────────────┐   │    │    │
│  │      │   │ Parse  │─▶│ Spell   │─▶│ Expand │─▶│  Intent    │   │    │    │
│  │      │   │ Query  │  │ Check   │  │ Query  │  │ Detection  │   │    │    │
│  │      │   └────────┘  └─────────┘  └────────┘  └────────────┘   │    │    │
│  │      └──────────────────────────────┬──────────────────────────┘    │    │
│  │                                     │                               │    │
│  │   Query Cache ◀─────────────────────┤                               │    │
│  │   (60% hit)                         │                               │    │
│  │                                     ▼                               │    │
│  │      ┌─────────────────────────────────────────────────────────┐    │    │
│  │      │              INDEX SERVERS (1000s)                       │    │    │
│  │      │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐      │    │    │
│  │      │  │Shard 1│ │Shard 2│ │Shard 3│ │  ...  │ │Shard N│      │    │    │
│  │      │  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘      │    │    │
│  │      └──────┼─────────┼─────────┼─────────┼─────────┼──────────┘    │    │
│  │             └─────────┴─────────┴─────────┴─────────┘               │    │
│  │                                     │                               │    │
│  │                                     ▼                               │    │
│  │      ┌─────────────────────────────────────────────────────────┐    │    │
│  │      │                   RANKING PIPELINE                       │    │    │
│  │      │   ┌────────┐   ┌──────────┐   ┌──────────────────────┐  │    │    │
│  │      │   │Stage 1 │──▶│ Stage 2  │──▶│     Stage 3          │  │    │    │
│  │      │   │BM25+PR │   │ML Ranker │   │ Personalization+Ads  │  │    │    │
│  │      │   │(10K)   │   │ (1K)     │   │      (100)           │  │    │    │
│  │      │   └────────┘   └──────────┘   └──────────────────────┘  │    │    │
│  │      └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Tiered index: Hot (1% in memory), warm (10% on SSD), cold (disk)',
          'Document-partitioned sharding across 1000s of servers',
          'Query cache for 60% hit rate on popular queries',
          'Multi-stage ranking: BM25 → ML → Personalization',
          'Distributed crawling: 20B pages/day across global datacenters'
        ]
      },

      queryFlow: {
        title: 'Query Processing Flow',
        steps: [
          'User enters query → Frontend receives request',
          'Check query cache → Return cached result if hit',
          'Parse and tokenize query text',
          'Spell check and suggest corrections',
          'Expand query with synonyms and related terms',
          'Detect intent (navigational, informational, transactional)',
          'Broadcast query to all index shards in parallel',
          'Each shard returns top K candidates with scores',
          'Merge results from all shards',
          'Apply ML ranking model (1000s of features)',
          'Apply personalization (history, location)',
          'Insert ads and special results (news, images)',
          'Cache result and return to user (<200ms)'
        ]
      },

      discussionPoints: [
        {
          topic: 'Index Partitioning Strategy',
          points: [
            'Document partitioning: Each shard has complete index for doc subset',
            'Term partitioning: Each shard has all docs for term subset',
            'Document partitioning preferred (better load balance, simpler updates)',
            'Need to query ALL shards for each query (fan-out)',
            'Replication factor of 3+ for availability'
          ]
        },
        {
          topic: 'Ranking Quality vs Latency',
          points: [
            'More features = better ranking but slower',
            'Multi-stage approach: cheap filters first, expensive ML last',
            'Stage 1: BM25 + PageRank (10K candidates)',
            'Stage 2: ML model with 100s of features (1K candidates)',
            'Stage 3: Personalization + ads (final 10 results)',
            'Each stage reduces candidates by 10x'
          ]
        },
        {
          topic: 'Handling Spam and SEO Manipulation',
          points: [
            'Link farms: Detect unnatural link patterns',
            'Keyword stuffing: Penalize over-optimization',
            'Cloaking: Show different content to crawler vs user',
            'Manual actions: Human reviewers for high-value queries',
            'Continuous ML models trained on spam signals'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Web crawling', 'Index billions of pages', 'Fast search (<200ms)', 'Spell correction', 'Autocomplete', 'Personalization'],
      components: ['Web crawler', 'Indexer', 'Ranker (PageRank)', 'Query processor', 'Spell checker', 'Cache'],
      keyDecisions: [
        'Inverted index: Map words → document IDs + positions',
        'PageRank: Graph-based importance scoring',
        'Sharding: Partition index by document or term',
        'Tiered index: Hot/warm/cold based on query frequency',
        'Query understanding: Parse intent, expand synonyms'
      ],
      edgeCases: [
        { scenario: 'Web crawler trapped in infinite URL space (calendar pages, session IDs in URLs)', impact: 'Crawler wastes resources indexing duplicate or generated content, never finishes domain', mitigation: 'URL normalization, duplicate content detection via simhash, crawl budget per domain, robots.txt respect' },
        { scenario: 'Index corruption during partial shard rebuild', impact: 'Search returns incomplete or incorrect results for affected document partition', mitigation: 'Build new index shard in parallel, atomic swap on completion, keep previous shard as rollback backup' },
        { scenario: 'Query of death that causes expensive full-index scan', impact: 'Single pathological query consumes all resources on serving node, degrading other queries', mitigation: 'Query timeout limits, cost-based query planner rejects expensive queries, circuit breaker per query type' },
        { scenario: 'Freshness gap for breaking news content', impact: 'Users searching for current events see stale results from hours ago', mitigation: 'Real-time indexing pipeline for news domains, prioritized crawl queue for high-update-frequency sites' },
        { scenario: 'SEO spam manipulation of PageRank through link farms', impact: 'Low-quality pages rank highly, degrading search result quality', mitigation: 'Link spam detection algorithms, domain authority scoring, demote sites with unnatural link patterns' },
      ],
      tradeoffs: [
        { decision: 'Document-partitioned vs term-partitioned index', pros: 'Document-partitioned keeps all terms for a doc together (simpler updates); term-partitioned keeps all docs for a term together (faster single-term queries)', cons: 'Document-partitioned requires scatter-gather for every query; term-partitioned makes updates expensive', recommendation: 'Document-partitioned for web search due to frequent index updates from crawling' },
        { decision: 'Real-time indexing vs batch indexing', pros: 'Real-time provides fresh results within seconds; batch is simpler and more resource-efficient', cons: 'Real-time requires streaming infrastructure and incremental index updates; batch means hours of staleness', recommendation: 'Tiered approach: real-time for news/social, hourly batch for general web pages' },
        { decision: 'PageRank vs ML-based ranking', pros: 'PageRank is interpretable and hard to game at scale; ML captures complex relevance signals', cons: 'PageRank alone misses query-document relevance; ML models are opaque and expensive to train', recommendation: 'PageRank as one feature in an ML ranking model that also considers content relevance, freshness, and user signals' },
      ],
      layeredDesign: [
        { name: 'Crawl & Ingestion Layer', purpose: 'Discover and fetch web pages at scale, respecting politeness policies', components: ['URL Frontier', 'Distributed Crawler', 'DNS Resolver', 'Content Deduplicator'] },
        { name: 'Indexing Layer', purpose: 'Parse documents, build inverted index, and compute link graph metrics', components: ['Document Parser', 'Inverted Index Builder', 'PageRank Calculator', 'Index Shards'] },
        { name: 'Query Serving Layer', purpose: 'Parse queries, retrieve candidates, rank results, and serve with low latency', components: ['Query Parser', 'Index Server', 'Ranking Engine', 'Snippet Generator'] },
        { name: 'Quality & Freshness Layer', purpose: 'Maintain index freshness, fight spam, and personalize results', components: ['Real-time Index Updater', 'Spam Detector', 'Personalization Service', 'A/B Testing'] },
      ],
    },
    {
      id: 'notification-system',
      title: 'Notification System',
      subtitle: 'Push Notifications',
      icon: 'bell',
      color: '#f59e0b',
      difficulty: 'Medium',
      description: 'Design a scalable notification system supporting push, SMS, and email.',

      introduction: `A notification system delivers messages to users across multiple channels: push notifications, SMS, email, and in-app messages. Companies like Facebook, Uber, and Amazon send billions of notifications daily.

The key challenges are: handling different priority levels (OTP codes vs marketing), managing user preferences, ensuring reliable delivery with retries, and scaling to billions of notifications per day while maintaining low latency for urgent messages.`,

      functionalRequirements: [
        'Send push notifications (iOS, Android, Web)',
        'Send email notifications',
        'Send SMS messages',
        'In-app notification center',
        'User preference management (opt-out, channels)',
        'Template-based messages with personalization',
        'Scheduled and triggered notifications',
        'Notification batching (digests)',
        'Rate limiting per user'
      ],

      nonFunctionalRequirements: [
        'Handle 10B+ notifications per day',
        'Urgent notifications: <1 second delivery',
        'Normal notifications: <5 seconds',
        'Batch notifications: Within scheduled window',
        '99.9% delivery rate (with retries)',
        'Support quiet hours per timezone',
        'Analytics: delivery, open, click rates'
      ],

      dataModel: {
        description: 'Notifications, templates, and user preferences',
        schema: `notifications {
  id: uuid PK
  user_id: uuid FK
  template_id: varchar
  channel: enum(PUSH, EMAIL, SMS, IN_APP)
  priority: enum(URGENT, NORMAL, BATCH)
  status: enum(PENDING, SENT, DELIVERED, FAILED)
  data: jsonb -- template variables
  scheduled_at: timestamp
  sent_at: timestamp
  created_at: timestamp
}

templates {
  id: varchar PK
  name: varchar
  channel: enum
  subject: text -- for email
  body: text -- with {{placeholders}}
  created_at: timestamp
}

user_preferences {
  user_id: uuid PK
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  quiet_hours_start: time
  quiet_hours_end: time
  timezone: varchar
  unsubscribed_categories: varchar[]
}

device_tokens {
  user_id: uuid FK
  platform: enum(IOS, ANDROID, WEB)
  token: varchar
  created_at: timestamp
}`
      },

      apiDesign: {
        description: 'Notification sending and preference management',
        endpoints: [
          { method: 'POST', path: '/api/notify', params: '{ userId, templateId, channel, priority, data }', response: '{ notificationId }' },
          { method: 'POST', path: '/api/notify/bulk', params: '{ userIds[], templateId, data }', response: '{ batchId }' },
          { method: 'GET', path: '/api/notifications/:userId', params: 'page, unread', response: '{ notifications[], total }' },
          { method: 'PUT', path: '/api/preferences/:userId', params: '{ channels, quietHours }', response: '{ success }' },
          { method: 'POST', path: '/api/devices/register', params: '{ userId, platform, token }', response: '{ success }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we handle different priority levels?',
          answer: `**Priority Queues**:
- **URGENT** (OTP, security alerts): Dedicated high-priority queue, process immediately, bypass rate limits
- **NORMAL** (order updates, messages): Standard queue, process within seconds
- **BATCH** (marketing, digests): Low-priority queue, aggregate and send in batches

**Implementation**:
\`\`\`
┌──────────────┐
│  Incoming    │
│  Requests    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│         Priority Router               │
└──────┬───────────┬───────────┬───────┘
       │           │           │
       ▼           ▼           ▼
  ┌────────┐  ┌────────┐  ┌────────┐
  │ URGENT │  │ NORMAL │  │ BATCH  │
  │ Queue  │  │ Queue  │  │ Queue  │
  │ (Kafka)│  │ (Kafka)│  │ (Kafka)│
  └────────┘  └────────┘  └────────┘
       │           │           │
       ▼           ▼           ▼
  Workers     Workers     Scheduled
  (10x more)  (normal)    Job (hourly)
\`\`\`

**SLA by Priority**:
- Urgent: p99 < 1 second
- Normal: p99 < 5 seconds
- Batch: Within scheduled window (hourly/daily)`
        },
        {
          question: 'How do we ensure reliable delivery?',
          answer: `**At-Least-Once Delivery**:
1. Persist notification to database (PENDING)
2. Enqueue to message queue (Kafka/SQS)
3. Worker dequeues and sends to provider
4. Update status to SENT
5. Provider webhook confirms DELIVERED

**Retry Strategy**:
- Immediate retry for transient failures (3 attempts)
- Exponential backoff: 1s, 5s, 30s, 5min, 30min
- Dead letter queue after max retries
- Alert on high failure rates

**Delivery Tracking**:
\`\`\`
PENDING → QUEUED → SENT → DELIVERED
                     ↓
                   FAILED → RETRY → (DELIVERED | DLQ)
\`\`\`

**Provider Failover**:
- Primary: SendGrid/Twilio/FCM
- Secondary: Mailgun/Nexmo/APNS
- Auto-switch on provider outage`
        },
        {
          question: 'How do we handle user preferences and rate limiting?',
          answer: `**Preference Checks** (before sending):
1. Is channel enabled for this user?
2. Is user in quiet hours? → Delay if not urgent
3. Is category unsubscribed? → Skip
4. Has user exceeded rate limit? → Queue for later

**Rate Limiting**:
- Per-user limits: Max 5 push/hour (non-urgent)
- Per-category limits: Max 1 marketing email/day
- Global limits: Prevent spam during incidents

**Quiet Hours**:
\`\`\`javascript
function shouldDelay(user, notification) {
  if (notification.priority === 'URGENT') return false;

const userTime = convertToTimezone(now(), user.timezone);
  if (userTime >= user.quietHoursStart &&
      userTime <= user.quietHoursEnd) {
    return true; // Delay until quiet hours end
  }
  return false;
}
\`\`\`

**Unsubscribe**:
- One-click unsubscribe in emails (CAN-SPAM)
- Category-level opt-out (marketing vs transactional)
- Global opt-out option`
        },
        {
          question: 'How do we scale to 10B notifications/day?',
          answer: `**Scale Calculation**:
- 10B/day = 115K notifications/second
- Peak: 3x average = 350K/second

**Architecture for Scale**:
1. **Kafka partitions**: 100+ partitions per priority
2. **Worker pools**: Auto-scale based on queue depth
3. **Database sharding**: Partition by user_id
4. **Connection pooling**: Reuse provider connections

**Optimizations**:
- Batch API calls to providers (FCM supports 500/request)
- Pre-render templates at send time
- Skip delivery for inactive users
- Compress payloads for push notifications

**Cost Optimization**:
- SMS most expensive ($0.01/msg) - use sparingly
- Push notifications essentially free
- Email: $0.0001/msg with SendGrid
- Batch similar notifications into digests`
        }
      ],

      basicImplementation: {
        title: 'Basic Notification Architecture',
        description: 'Single queue with multiple channel workers distributing to Push, Email, and SMS providers',
        svgTemplate: 'notificationSystem',
        problems: [
          'Single queue = no priority handling',
          'No user preference checking',
          'No retry mechanism',
          'Single provider per channel'
        ]
      },

      advancedImplementation: {
        title: 'Production Notification Architecture',
        svgTemplate: 'notificationAdvanced',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Production Notification System                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          INGESTION LAYER                               │  │
│  │  ┌──────────┐    ┌────────────────┐    ┌────────────────────┐         │  │
│  │  │   API    │───▶│  Validation &  │───▶│   Priority Router   │         │  │
│  │  │ Gateway  │    │  Preference    │    │                    │         │  │
│  │  └──────────┘    │    Check       │    └────────┬───────────┘         │  │
│  │                  └────────────────┘             │                      │  │
│  └─────────────────────────────────────────────────┼──────────────────────┘  │
│                                                    │                         │
│  ┌─────────────────────────────────────────────────┼──────────────────────┐  │
│  │                      QUEUE LAYER (Kafka)        │                      │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │  │
│  │  │  URGENT Queue  │  │  NORMAL Queue  │  │  BATCH Queue   │           │  │
│  │  │  (P0 - OTP)    │  │ (P1 - Updates) │  │ (P2 - Marketing)│           │  │
│  │  │  100 partitions│  │ 50 partitions  │  │ 20 partitions  │           │  │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘           │  │
│  └──────────┼───────────────────┼───────────────────┼────────────────────┘  │
│             │                   │                   │                        │
│  ┌──────────┼───────────────────┼───────────────────┼────────────────────┐  │
│  │          ▼                   ▼                   ▼                    │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    WORKER POOLS (Auto-scaling)                  │  │  │
│  │  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │  │  │
│  │  │  │Push Workers │   │Email Workers│   │ SMS Workers │           │  │  │
│  │  │  │   (100)     │   │    (50)     │   │    (20)     │           │  │  │
│  │  │  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │  │  │
│  │  └─────────┼─────────────────┼─────────────────┼──────────────────┘  │  │
│  │            │                 │                 │                     │  │
│  │  ┌─────────┼─────────────────┼─────────────────┼──────────────────┐  │  │
│  │  │         ▼                 ▼                 ▼                  │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │              PROVIDER ABSTRACTION LAYER                  │  │  │  │
│  │  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │  │  │
│  │  │  │  │   FCM   │ │  APNS   │ │SendGrid │ │ Twilio  │        │  │  │  │
│  │  │  │  │(Primary)│ │(Primary)│ │(Primary)│ │(Primary)│        │  │  │  │
│  │  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │  │  │
│  │  │  │  ┌─────────┐             ┌─────────┐ ┌─────────┐        │  │  │  │
│  │  │  │  │  Expo   │             │ Mailgun │ │  Nexmo  │        │  │  │  │
│  │  │  │  │(Backup) │             │ (Backup)│ │ (Backup)│        │  │  │  │
│  │  │  │  └─────────┘             └─────────┘ └─────────┘        │  │  │  │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐│
│  │                      SUPPORTING SERVICES                               ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      ││
│  │  │ Template   │  │ Preference │  │  Analytics │  │ Dead Letter│      ││
│  │  │  Service   │  │  Service   │  │  Service   │  │   Queue    │      ││
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      ││
│  └───────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Priority queues with different worker pool sizes',
          'Kafka partitions for horizontal scaling',
          'Provider abstraction with automatic failover',
          'Template service for consistent messaging',
          'Dead letter queue for failed notifications',
          'Analytics for delivery and engagement tracking'
        ]
      },

      notificationFlow: {
        title: 'Notification Delivery Flow',
        steps: [
          'API receives notification request with userId, template, channel',
          'Validate request and check user preferences',
          'Check rate limits and quiet hours',
          'Render template with user data',
          'Route to appropriate priority queue',
          'Worker picks up from queue',
          'Look up device tokens / email / phone',
          'Call provider API (FCM/SendGrid/Twilio)',
          'Handle response: success → mark DELIVERED',
          'Handle failure: retry with backoff or move to DLQ',
          'Record analytics: sent_at, delivered_at, opened_at'
        ]
      },

      discussionPoints: [
        {
          topic: 'Push Notification Providers',
          points: [
            'FCM (Firebase Cloud Messaging): Android + iOS + Web',
            'APNS (Apple Push): iOS only, required for production',
            'Web Push: Browser notifications via service workers',
            'Each platform has different payload limits and formats',
            'Token management: Handle expired/invalid tokens'
          ]
        },
        {
          topic: 'Email Deliverability',
          points: [
            'SPF, DKIM, DMARC records for authentication',
            'Warm up IP addresses gradually for new senders',
            'Monitor bounce rates and complaints',
            'Segment lists: transactional vs marketing',
            'Dedicated IPs for high-volume senders'
          ]
        },
        {
          topic: 'Notification Fatigue',
          points: [
            'Batch similar notifications into digests',
            'Smart frequency capping per user',
            'A/B test notification content and timing',
            'Allow granular unsubscribe (category-level)',
            'Track engagement and reduce for inactive users'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Push notifications', 'Email', 'SMS', 'In-app notifications', 'Batching', 'User preferences', 'Rate limiting'],
      components: ['Notification service', 'Template service', 'Priority queue', 'Delivery workers', 'Analytics'],
      keyDecisions: [
        'Priority queues: Urgent (OTP) vs batch (marketing)',
        'Template rendering with user context',
        'Delivery retry with exponential backoff',
        'User preference service for opt-outs',
        'Vendor abstraction: Switch between Twilio/SendGrid/FCM'
      ],
      staticDiagrams: [
        { id: 'notification-arch', title: 'Notification System Architecture', description: 'Push notification system with Gateway, Distribution, Router, and multi-channel delivery', src: '/diagrams/notification-system/notification-architecture.svg', type: 'architecture' }
      ],
      edgeCases: [
        { scenario: 'Push notification token becomes invalid after app reinstall', impact: 'Notifications silently fail to deliver, user misses critical alerts like OTPs', mitigation: 'Token refresh on app startup, track delivery failures per token, fall back to SMS after consecutive push failures' },
        { scenario: 'Notification storm from cascading system alerts', impact: 'User receives hundreds of notifications in minutes, causing alert fatigue and phone unusable', mitigation: 'Notification deduplication with sliding window, aggregate similar notifications, per-user rate limiting with priority override' },
        { scenario: 'Email notification lands in spam folder consistently', impact: 'Users never see transactional emails like password resets or order confirmations', mitigation: 'SPF/DKIM/DMARC configuration, dedicated sending IP with warm-up, monitor sender reputation, separate transactional from marketing domains' },
        { scenario: 'Time zone miscalculation sends marketing notification at 3 AM', impact: 'User disturbed at night, likely unsubscribes or disables notifications entirely', mitigation: 'Store user timezone preference, enforce quiet hours (10 PM - 8 AM local), queue notifications for next delivery window' },
        { scenario: 'Third-party vendor (Twilio/SendGrid) outage', impact: 'Entire notification channel goes dark, critical messages like 2FA codes undeliverable', mitigation: 'Multi-vendor setup with automatic failover, circuit breaker per vendor, fallback channel escalation (push → SMS → email)' },
      ],
      tradeoffs: [
        { decision: 'Push vs pull notification delivery', pros: 'Push delivers instantly without client polling; pull is simpler and works without persistent connections', cons: 'Push requires device token management and platform-specific integration; pull adds latency and wasted requests', recommendation: 'Push for real-time alerts (messages, OTPs), pull/polling for non-urgent notification feeds' },
        { decision: 'Single queue vs priority queues for processing', pros: 'Single queue is simple; priority queues ensure critical notifications (OTP, fraud alerts) are not delayed by bulk marketing sends', cons: 'Single queue risks head-of-line blocking; priority queues add routing complexity', recommendation: 'Separate priority queues: critical (OTP), high (transactional), normal (social), low (marketing)' },
        { decision: 'Template rendering at send time vs pre-rendering', pros: 'Send-time rendering allows dynamic content; pre-rendering reduces send-path latency', cons: 'Send-time rendering adds latency per notification; pre-rendering cannot include real-time data', recommendation: 'Pre-render templates with placeholder substitution at send time for best of both' },
        { decision: 'Centralized notification service vs per-service sending', pros: 'Centralized enforces consistent preferences and rate limits; per-service is simpler for teams to ship independently', cons: 'Centralized is a single point of failure; per-service leads to inconsistent user experience and preference fragmentation', recommendation: 'Centralized service with per-team notification type registration and self-service templates' },
      ],
      layeredDesign: [
        { name: 'Ingestion & API Layer', purpose: 'Accept notification requests from internal services with validation and deduplication', components: ['Notification API', 'Request Validator', 'Deduplication Store', 'Rate Limiter'] },
        { name: 'Processing & Routing Layer', purpose: 'Determine delivery channel, render templates, and enforce user preferences', components: ['Channel Router', 'Template Engine', 'Preference Service', 'Priority Queue'] },
        { name: 'Delivery Layer', purpose: 'Send notifications through platform-specific channels with retry logic', components: ['Push Sender (APNs/FCM)', 'Email Sender (SES/SendGrid)', 'SMS Sender (Twilio)', 'In-App WebSocket'] },
        { name: 'Analytics & Feedback Layer', purpose: 'Track delivery status, open rates, and handle unsubscribes', components: ['Delivery Tracker', 'Analytics Pipeline', 'Feedback Processor', 'Unsubscribe Handler'] },
      ],
    },
    {
      id: 'rate-limiter',
      title: 'Rate Limiter',
      subtitle: 'API Gateway Component',
      icon: 'shield',
      color: '#dc2626',
      difficulty: 'Medium',
      description: 'Design a distributed rate limiting service for API protection.',

      introduction: `A rate limiter is a mechanism that controls the number of requests or actions a user or system can perform within a specific time frame. Think of it as a bouncer managing entry flow to maintain system stability and prevent overload.

Rate limiters are critical for protecting APIs from abuse, preventing DDoS attacks, ensuring fair resource usage across users, and controlling costs in usage-based billing models. Companies like Stripe, GitHub, and Twitter use sophisticated rate limiting to protect their APIs.

The key challenge is implementing rate limiting that's fast (sub-millisecond), accurate, distributed across multiple servers, and configurable without downtime.`,

      functionalRequirements: [
        'Limit requests per user/IP/API key',
        'Support multiple rate limit tiers (free, pro, enterprise)',
        'Configure limits per endpoint or globally',
        'Return remaining quota and reset time',
        'Allow burst traffic within limits',
        'Dynamic rule updates without restart',
        'Support for sliding window precision',
        'Whitelist/blacklist capabilities'
      ],

      nonFunctionalRequirements: [
        'Sub-millisecond latency (<1ms cached, <5ms Redis)',
        'Handle 1M+ rate limit checks per second',
        'Distributed consistency across all servers',
        'Graceful degradation (fail open vs fail closed)',
        '99.99% availability',
        'Support for 10K+ different rate limit rules',
        'Real-time monitoring and alerting'
      ],

      dataModel: {
        description: 'Rate limit rules, buckets, and request logs',
        schema: `rate_limit_rules {
  id: uuid PK
  name: varchar(100)
  key_pattern: varchar(200) -- user:{userId}, ip:{ip}
  limit: int -- max requests
  window_seconds: int
  algorithm: enum(TOKEN_BUCKET, SLIDING_WINDOW, FIXED_WINDOW, LEAKY_BUCKET)
  burst_size: int -- for token bucket
  tier: enum(FREE, PRO, ENTERPRISE)
  created_at: timestamp
}

token_buckets (Redis) {
  key: string -- "bucket:user:123:api_calls"
  tokens: float -- current tokens
  last_refill: timestamp
  ttl: seconds -- auto-expire
}

sliding_window (Redis Sorted Set) {
  key: string -- "window:user:123:api_calls"
  members: request_timestamps
  score: timestamp
}

rate_limit_logs {
  id: uuid PK
  rule_id: uuid FK
  key: varchar(200)
  allowed: boolean
  remaining: int
  timestamp: timestamp
}`
      },

      apiDesign: {
        description: 'Rate limiting check and management endpoints',
        endpoints: [
          { method: 'GET', path: '/api/ratelimit/check', params: 'key, cost=1', response: '{ allowed, remaining, resetAt, retryAfter }' },
          { method: 'POST', path: '/api/ratelimit/rules', params: '{ name, keyPattern, limit, window, algorithm }', response: '{ ruleId }' },
          { method: 'PUT', path: '/api/ratelimit/rules/:id', params: '{ limit, window }', response: '{ success }' },
          { method: 'GET', path: '/api/ratelimit/status/:key', params: '-', response: '{ currentUsage, limit, resetAt }' },
          { method: 'DELETE', path: '/api/ratelimit/rules/:id', params: '-', response: '{ success }' }
        ]
      },

      keyQuestions: [
        {
          question: 'Which rate limiting algorithm should we use?',
          answer: `**Token Bucket** (Recommended for most APIs):
- Tokens accumulate at steady rate into bucket
- Each request consumes token(s)
- Allows bursts up to bucket capacity
- Example: 100 tokens/min, bucket size 150 allows burst of 150

**Sliding Window Log**:
- Track timestamp of each request in sorted set
- Count requests in rolling window
- Most accurate but memory intensive
- O(log n) per operation with Redis sorted sets

**Fixed Window Counter**:
- Simple: count requests per time window
- Problem: 2x burst at window boundaries
- User could send 100 req at 0:59 + 100 at 1:00

**Leaky Bucket**:
- Requests queue, processed at fixed rate
- Smooths traffic but adds latency
- Good for streaming/consistent throughput

**Sliding Window Counter** (Hybrid):
- Combines fixed window with weighted previous window
- Formula: count = current + (previous × overlap%)
- Lower memory than log, more accurate than fixed`
        },
        {
          question: 'How do we implement distributed rate limiting?',
          answer: `**Challenge**: Multiple servers need consistent view of rate limits.

**Solution 1: Centralized Redis**
- All servers check/update Redis
- Use Lua scripts for atomicity:
\`\`\`lua
local tokens = tonumber(redis.call('GET', key) or bucket_size)
local last_refill = tonumber(redis.call('GET', key..':time') or now)
-- Calculate new tokens based on time elapsed
local elapsed = now - last_refill
tokens = math.min(bucket_size, tokens + elapsed * refill_rate)
if tokens >= cost then
  tokens = tokens - cost
  redis.call('SET', key, tokens)
  redis.call('SET', key..':time', now)
  return {1, tokens}  -- allowed
end
return {0, tokens}  -- denied
\`\`\`

**Solution 2: Local Cache + Sync**
- Each server has local counter
- Periodically sync to Redis
- Faster but less accurate
- Use for high-volume, approximate limits

**Solution 3: Sticky Sessions**
- Route same user to same server
- Local rate limiting becomes accurate
- Reduces Redis dependency`
        },
        {
          question: 'How do we handle race conditions?',
          answer: `**Problem**: Two requests check limit simultaneously, both see 1 token, both consume it → overshooting limit.

**Solution 1: Redis Lua Scripts (Recommended)**
- Atomic check-and-decrement
- Single-threaded Redis execution
- No race conditions possible

**Solution 2: Redis Transactions (MULTI/EXEC)**
- WATCH key for changes
- Retry if modified during transaction

**Solution 3: Distributed Locks (Redlock)**
- Acquire lock before check
- Higher latency, use sparingly

**Best Practice**: Always use Lua scripts for rate limiting - they're atomic, fast, and eliminate race conditions.`
        },
        {
          question: 'What happens when Redis is unavailable?',
          answer: `**Fail Open** (Allow requests):
- Better user experience
- Risk of system overload
- Use for non-critical rate limits

**Fail Closed** (Deny requests):
- Protects backend systems
- Frustrates users during outages
- Use for critical protection (DDoS)

**Hybrid Approach** (Recommended):
- Local fallback rate limiting
- Each server has approximate limit
- Degraded accuracy, maintained protection
- Example: If Redis down, allow 10 req/min per server

**Circuit Breaker**:
- After N Redis failures, switch to local
- Periodically check Redis recovery
- Auto-switch back when available`
        },
        {
          question: 'How do we estimate storage requirements?',
          answer: `**Token Bucket Storage**:
- Per user: key (50 bytes) + tokens (8 bytes) + timestamp (8 bytes)
- ~100 bytes per user bucket
- 10M users = 1 GB Redis memory

**Sliding Window Log**:
- Per request: timestamp in sorted set (16 bytes)
- 1000 requests/user × 10M users = 160 GB (too expensive!)
- Solution: Use sliding window counter instead

**Sliding Window Counter**:
- 2 counters per user per rule
- ~50 bytes per user per rule
- 10M users × 5 rules = 2.5 GB

**Practical Example (10M users)**:
- Token bucket: ~1 GB Redis
- 5 rate limit rules: ~2.5 GB
- With replication: 3x = 7.5 GB
- Cost: ~$50/month for Redis cluster`
        }
      ],

      basicImplementation: {
        title: 'Basic Rate Limiter Architecture',
        description: 'Single server rate limiting with Redis',
        svgTemplate: 'distributedRateLimiter',
        architecture: `
┌─────────────────────────────────────────────────────────────────┐
│                     Basic Rate Limiter                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐        ┌──────────────┐       ┌──────────────┐  │
│   │  Client  │───────▶│  API Server  │──────▶│   Backend    │  │
│   └──────────┘        └──────────────┘       │   Service    │  │
│                              │               └──────────────┘  │
│                              │                                  │
│                              ▼                                  │
│                       ┌──────────────┐                         │
│                       │    Redis     │                         │
│                       │   (Single)   │                         │
│                       │              │                         │
│                       │ Token Bucket │                         │
│                       │    State     │                         │
│                       └──────────────┘                         │
│                                                                 │
│   Request Flow:                                                 │
│   1. Request arrives at API server                              │
│   2. Extract rate limit key (user_id, IP, API key)             │
│   3. Execute Lua script on Redis (atomic check)                │
│   4. If allowed: forward to backend                            │
│   5. If denied: return 429 Too Many Requests                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single point of failure (Redis)',
          'Single server bottleneck',
          'No failover mechanism',
          'Limited to one data center',
          'No real-time rule updates'
        ]
      },

      advancedImplementation: {
        title: 'Production Distributed Rate Limiter',
        svgTemplate: 'rateLimiterDistributed',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Production Rate Limiter Architecture                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                             │
│  │   Clients   │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CDN / Edge                                   │    │
│  │                    (First-line rate limiting)                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Load Balancer (L7)                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        API Gateway Cluster                            │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │   │
│  │  │  Gateway 1  │    │  Gateway 2  │    │  Gateway 3  │               │   │
│  │  │             │    │             │    │             │               │   │
│  │  │ Local Cache │    │ Local Cache │    │ Local Cache │               │   │
│  │  │  (Rules +   │    │  (Rules +   │    │  (Rules +   │               │   │
│  │  │  Hot Keys)  │    │  Hot Keys)  │    │  Hot Keys)  │               │   │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘               │   │
│  └─────────┼─────────────────┼─────────────────┼────────────────────────┘   │
│            │                 │                 │                             │
│            └─────────────────┼─────────────────┘                             │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Redis Cluster (6 nodes)                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                               │   │
│  │  │Primary 1│  │Primary 2│  │Primary 3│   ← Sharded by key hash       │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘                               │   │
│  │       │            │            │                                     │   │
│  │  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐                               │   │
│  │  │Replica 1│  │Replica 2│  │Replica 3│   ← Automatic failover        │   │
│  │  └─────────┘  └─────────┘  └─────────┘                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│            ┌─────────────────┼─────────────────┐                            │
│            ▼                 ▼                 ▼                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                    │
│  │   Backend    │   │   Backend    │   │   Backend    │                    │
│  │  Service 1   │   │  Service 2   │   │  Service 3   │                    │
│  └──────────────┘   └──────────────┘   └──────────────┘                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Config & Monitoring                              │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                 │   │
│  │  │   Config    │   │  CloudWatch │   │   Admin     │                 │   │
│  │  │   Service   │──▶│    Logs     │   │ Dashboard   │                 │   │
│  │  │  (Rules)    │   └─────────────┘   └─────────────┘                 │   │
│  │  └──────┬──────┘                                                      │   │
│  │         │                                                             │   │
│  │         ▼                                                             │   │
│  │  ┌─────────────┐                                                      │   │
│  │  │ SNS/Lambda  │ ← Real-time rule propagation                        │   │
│  │  │  (Updates)  │                                                      │   │
│  │  └─────────────┘                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Edge rate limiting at CDN for DDoS protection',
          'Redis Cluster with 3 primaries + 3 replicas',
          'Local cache on gateways for hot keys (<1ms)',
          'Lua scripts for atomic operations',
          'SNS/Lambda for real-time rule propagation',
          'Fail-open to local limits if Redis unavailable',
          'CloudWatch for monitoring and alerting'
        ]
      },

      tokenBucketFlow: {
        title: 'Token Bucket Algorithm Flow',
        steps: [
          'Request arrives with rate limit key (user:123:api_calls)',
          'Calculate tokens to add based on time elapsed since last refill',
          'new_tokens = elapsed_seconds × refill_rate',
          'current_tokens = min(bucket_size, old_tokens + new_tokens)',
          'If current_tokens >= request_cost: allow and deduct tokens',
          'If current_tokens < request_cost: deny with 429 status',
          'Update bucket state in Redis with new token count and timestamp',
          'Return remaining tokens and reset time in response headers'
        ]
      },

      responseHeadersFlow: {
        title: 'Rate Limit Response Headers',
        steps: [
          'X-RateLimit-Limit: Maximum requests allowed in window',
          'X-RateLimit-Remaining: Requests remaining in current window',
          'X-RateLimit-Reset: Unix timestamp when window resets',
          'Retry-After: Seconds until client should retry (on 429)',
          'X-RateLimit-Policy: Description of applied policy'
        ]
      },

      discussionPoints: [
        {
          topic: 'Algorithm Selection Trade-offs',
          points: [
            'Token bucket: Best for APIs allowing bursts (most common choice)',
            'Sliding window: Most accurate but higher memory usage',
            'Fixed window: Simplest but has boundary burst problem',
            'Leaky bucket: Best for smoothing traffic to constant rate',
            'Consider hybrid: Token bucket for API limits, leaky bucket for background jobs'
          ]
        },
        {
          topic: 'Multi-tier Rate Limiting',
          points: [
            'Edge/CDN: Coarse limits for DDoS protection (10K req/min per IP)',
            'API Gateway: User-level limits (1000 req/min for Pro tier)',
            'Service-level: Endpoint-specific limits (10 writes/sec to DB)',
            'Each tier catches different abuse patterns',
            'Later tiers can be more lenient as load is filtered'
          ]
        },
        {
          topic: 'Handling Spiky Traffic',
          points: [
            'Token bucket burst capacity smooths legitimate spikes',
            'Queue requests during brief spikes instead of rejecting',
            'Auto-scale rate limit thresholds based on system load',
            'Implement request priority: critical > normal > background',
            'Use circuit breakers to shed load during extreme spikes'
          ]
        },
        {
          topic: 'Monitoring and Observability',
          points: [
            'Track rate limit hit rate per rule and user tier',
            'Alert on unusual patterns (sudden spike in 429s)',
            'Log all denied requests for security analysis',
            'Dashboard showing limit utilization per customer',
            'A/B test limit changes with gradual rollout'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Limit requests per user/IP', 'Multiple rate limit tiers', 'Distributed across servers', 'Low latency overhead', 'Graceful degradation'],
      components: ['Rate limiter service', 'Redis cluster', 'Config service'],
      keyDecisions: [
        'Algorithm: Token bucket (allows bursts) vs Sliding window (precise)',
        'Redis for distributed state with Lua scripts for atomicity',
        'Local cache for hot keys to reduce Redis calls',
        'Return remaining quota and retry-after in headers'
      ],
      edgeCases: [
        { scenario: 'Clock skew between distributed rate limiter nodes', impact: 'User gets different rate limit decisions depending on which node handles the request, allowing limit bypass', mitigation: 'Use Redis centralized counter with Lua scripts for atomicity, or NTP sync with tolerance window in sliding window algorithm' },
        { scenario: 'Redis cluster node failure during high traffic', impact: 'Rate limiting disabled for affected partition, allowing unlimited traffic through to backend', mitigation: 'Local in-memory fallback rate limiter with conservative defaults, circuit breaker pattern, fail-closed policy for critical endpoints' },
        { scenario: 'Distributed denial-of-service from rotating IP addresses', impact: 'Per-IP rate limiting ineffective as attacker uses thousands of IPs', mitigation: 'Multi-dimensional rate limiting (IP + fingerprint + API key), global rate limit alongside per-client limits, CAPTCHA escalation' },
        { scenario: 'Legitimate user hits rate limit during critical operation (payment)', impact: 'Payment fails and user sees error, potential lost sale and frustration', mitigation: 'Different rate limit tiers per endpoint criticality, token bucket allows controlled bursts, graceful degradation with retry-after header' },
        { scenario: 'Rate limit counter overflow on long-running fixed windows', impact: 'Counter wraps around or becomes inaccurate after millions of increments', mitigation: 'Use sliding window with TTL-based expiration, atomic INCR with EXPIRE in Redis, 64-bit counters' },
      ],
      tradeoffs: [
        { decision: 'Token bucket vs sliding window log vs fixed window', pros: 'Token bucket allows bursts while maintaining average rate; sliding window is precise; fixed window is simplest', cons: 'Token bucket needs careful tuning of bucket size; sliding window log uses more memory; fixed window has boundary burst problem', recommendation: 'Token bucket for API rate limiting (allows natural burst patterns), sliding window for strict compliance requirements' },
        { decision: 'Centralized (Redis) vs local rate limiting', pros: 'Centralized gives accurate global counts; local eliminates network latency and Redis dependency', cons: 'Centralized adds Redis call per request; local allows N times the limit with N servers', recommendation: 'Two-tier: local rate limiter as first check, centralized Redis for accurate global enforcement' },
        { decision: 'Fail-open vs fail-closed on rate limiter failure', pros: 'Fail-open maintains availability during outages; fail-closed protects backend from overload', cons: 'Fail-open exposes backend during rate limiter outage; fail-closed rejects legitimate traffic', recommendation: 'Fail-open for non-critical endpoints, fail-closed for payment and auth endpoints with aggressive circuit breakers' },
      ],
      layeredDesign: [
        { name: 'Client & Edge Layer', purpose: 'Apply coarse rate limiting at CDN/edge before requests reach origin', components: ['CDN Rate Limiting', 'WAF Rules', 'IP Reputation Service'] },
        { name: 'API Gateway Layer', purpose: 'Enforce per-client rate limits with token identification and quota management', components: ['API Gateway', 'Rate Limit Middleware', 'Auth/API Key Resolver'] },
        { name: 'Rate Limit Engine', purpose: 'Execute rate limiting algorithms and maintain counters', components: ['Redis Cluster', 'Lua Rate Limit Scripts', 'Local Cache Limiter', 'Config Service'] },
        { name: 'Monitoring & Rules Layer', purpose: 'Define rate limit policies, monitor usage patterns, and alert on anomalies', components: ['Rules Engine', 'Usage Analytics', 'Alerting Service', 'Admin Dashboard'] },
      ],
    },
    {
      id: 'ticketmaster',
      title: 'Ticketmaster',
      subtitle: 'Event Booking',
      icon: 'ticket',
      color: '#026cdf',
      difficulty: 'Hard',
      description: 'Design a ticket booking system handling high-traffic events with seat selection.',

      introduction: `Ticketmaster is the world's largest ticket marketplace, selling over 500 million tickets annually. The system must handle extreme traffic spikes (14M users trying to buy Taylor Swift tickets), prevent overselling, and provide fair access during high-demand sales.

The key challenges include managing seat inventory with strong consistency, handling millions of concurrent users during on-sales, and implementing fair queuing mechanisms.`,

      functionalRequirements: [
        'Browse events by category, venue, artist',
        'View venue seat map with availability',
        'Select and hold seats temporarily',
        'Complete purchase with payment',
        'Digital ticket delivery',
        'Ticket transfer and resale',
        'Waitlist for sold-out events',
        'Pre-sale access for fan clubs'
      ],

      nonFunctionalRequirements: [
        'Never oversell (strong consistency for bookings)',
        'Handle 14M+ concurrent users during major on-sales',
        'Seat hold expires in 10-15 minutes',
        'Fair access: No bots, proper queuing',
        '99.99% availability during events',
        'Sub-second seat map updates'
      ],

      dataModel: {
        description: 'Events, venues, seats, and bookings',
        schema: `events {
  id: uuid PK
  venueId: uuid FK
  artistId: uuid FK
  name: varchar(200)
  dateTime: timestamp
  onsaleDate: timestamp
  presaleDates: jsonb
  status: enum(UPCOMING, ONSALE, SOLDOUT, CANCELLED)
}

venues {
  id: uuid PK
  name: varchar(200)
  address: jsonb
  sections: jsonb -- section layout
  totalCapacity: int
}

seats {
  id: uuid PK
  eventId: uuid FK
  section: varchar(20)
  row: varchar(10)
  number: int
  status: enum(AVAILABLE, HELD, SOLD, BLOCKED)
  price: decimal(10,2)
  holdExpiry: timestamp nullable
  holdUserId: bigint nullable
  version: int -- optimistic locking
}

bookings {
  id: uuid PK
  userId: bigint FK
  eventId: uuid FK
  seatIds: uuid[]
  totalAmount: decimal(10,2)
  paymentId: varchar FK
  status: enum(CONFIRMED, CANCELLED, REFUNDED)
  barcode: varchar unique
  createdAt: timestamp
}

queue_positions {
  eventId: uuid PK
  userId: bigint PK
  position: bigint
  joinedAt: timestamp
  status: enum(WAITING, SHOPPING, EXPIRED)
}`
      },

      apiDesign: {
        description: 'APIs with hold-based checkout flow',
        endpoints: [
          {
            method: 'GET',
            path: '/api/events/{id}/seats',
            params: '?section=',
            response: '{ seats: [{id, row, number, status, price}] }'
          },
          {
            method: 'POST',
            path: '/api/events/{id}/hold',
            params: '{ seatIds[] }',
            response: '{ holdId, expiresAt, total } or { error: ALREADY_HELD }'
          },
          {
            method: 'POST',
            path: '/api/checkout',
            params: '{ holdId, paymentMethod }',
            response: '{ bookingId, tickets[], barcodes[] }'
          },
          {
            method: 'DELETE',
            path: '/api/holds/{holdId}',
            params: '',
            response: '{ released: true }'
          },
          {
            method: 'GET',
            path: '/api/queue/{eventId}',
            params: '',
            response: '{ position, estimatedWait, status }'
          },
          {
            method: 'POST',
            path: '/api/queue/{eventId}/join',
            params: '{}',
            response: '{ queueToken, position }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we prevent overselling?',
          answer: `Multiple layers of protection:

1. Pessimistic locking on seat selection:
   - Redis SETNX with userId and TTL
   - Only holder can proceed to checkout
   - Auto-release after 10-15 minutes

2. Database-level consistency:
   - Optimistic locking with version number
   - UPDATE seats SET status='SOLD', version=version+1
     WHERE id=X AND status='HELD' AND version=Y
   - Rollback if row count != expected

3. Idempotent operations:
   - holdId required for checkout
   - Same holdId always returns same result

4. Inventory buffer:
   - Hold back 1-2% of seats
   - Release gradually to handle failed payments`
        },
        {
          question: 'How does the virtual waiting room work?',
          answer: `When traffic exceeds capacity:

1. Queue Join:
   - User gets queue token with random position
   - (Random prevents gaming by early refresh)
   - Show estimated wait time

2. Processing:
   - Let N users/minute into shopping experience
   - Control N based on checkout capacity
   - Shopping timer starts when admitted

3. Fairness measures:
   - CAPTCHA to filter bots
   - One queue position per verified account
   - Device fingerprinting
   - Rate limiting on queue joins

4. Communication:
   - WebSocket for real-time position updates
   - SMS/email notification when its your turn
   - Grace period if you miss your turn`
        },
        {
          question: 'How do we handle 14M concurrent users?',
          answer: `Architecture for extreme scale:

1. CDN for static content:
   - Event pages, images, seat maps (read-only)
   - 99% of requests never hit origin

2. Queue absorbs traffic:
   - Only 10K shopping at a time
   - Rest waiting in queue (cheap to scale)
   - Queue state in Redis Cluster

3. Sharding by event:
   - Each event handled by dedicated shard
   - No cross-event transactions
   - Hot events get more resources

4. Pre-computed seat maps:
   - Generate snapshots every 500ms
   - Push updates via WebSocket
   - Reduce database reads`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple booking without queue or advanced locking',
        svgTemplate: 'ticketBooking',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                         TICKETMASTER BASIC                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ Load Balancer│─────▶│   App Server     │          │
│  └──────────┘      └──────────────┘      └────────┬─────────┘          │
│                                                    │                    │
│  BOOKING FLOW:                            ┌────────▼─────────┐          │
│  1. View seats (no lock)                  │    PostgreSQL    │          │
│  2. Click "Buy"                           │   - Events       │          │
│  3. Payment form                          │   - Seats        │          │
│  4. Submit payment                        │   - Bookings     │          │
│  5. Update seat status                    └──────────────────┘          │
│                                                                         │
│  PROBLEM: Two users can buy same seat                                  │
│           Both see "available", both submit payment                    │
│           Last write wins OR duplicate booking                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Race condition: Multiple users can select same seat',
          'No protection during checkout process',
          'System crashes under high load',
          'Bots can grab all tickets',
          'No fair access during on-sales'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'ticketmasterAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TICKETMASTER PRODUCTION                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  TRAFFIC MANAGEMENT                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ┌──────────┐                                                        │        │
│  │  │ 14M Users│                                                        │        │
│  │  └────┬─────┘                                                        │        │
│  │       │                                                              │        │
│  │       ▼                                                              │        │
│  │  ┌──────────────────────────────────────────────────────────┐       │        │
│  │  │               VIRTUAL WAITING ROOM                        │       │        │
│  │  │                                                           │       │        │
│  │  │   ┌─────────┐  ┌─────────┐  ┌─────────┐                 │       │        │
│  │  │   │Position │  │Position │  │Position │  ... 14M        │       │        │
│  │  │   │   1     │  │   2     │  │   3     │                 │       │        │
│  │  │   └────┬────┘  └────┬────┘  └────┬────┘                 │       │        │
│  │  │        │            │            │                       │       │        │
│  │  │        └────────────┼────────────┘                       │       │        │
│  │  │                     ▼                                     │       │        │
│  │  │   Let through: 100 users/second (controlled rate)        │       │        │
│  │  └───────────────────────────────────────────────────────────┘       │        │
│  │                        │                                              │        │
│  │                        ▼                                              │        │
│  │  ┌───────────────────────────────────────────────────────────┐       │        │
│  │  │                SHOPPING EXPERIENCE                         │       │        │
│  │  │            (10K concurrent shoppers max)                   │       │        │
│  │  └───────────────────────────────────────────────────────────┘       │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  SEAT SELECTION & BOOKING                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │    ┌──────────┐         ┌──────────────┐        ┌──────────────┐   │        │
│  │    │ Seat Map │────────▶│ Seat Service │───────▶│    Redis     │   │        │
│  │    │(Cached)  │         │              │        │  (Seat Locks) │   │        │
│  │    └──────────┘         └──────┬───────┘        │              │   │        │
│  │                                │                │  SETNX       │   │        │
│  │                                │                │  seat:123 →  │   │        │
│  │                                │                │  userId:456  │   │        │
│  │                                │                │  TTL: 15min  │   │        │
│  │                                │                └──────────────┘   │        │
│  │                                ▼                                    │        │
│  │                      ┌──────────────────┐                          │        │
│  │                      │    PostgreSQL    │                          │        │
│  │                      │                  │                          │        │
│  │                      │ UPDATE seats     │                          │        │
│  │                      │ SET status=SOLD  │                          │        │
│  │                      │ WHERE id=123     │                          │        │
│  │                      │ AND status=HELD  │                          │        │
│  │                      │ AND version=X    │                          │        │
│  │                      └──────────────────┘                          │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  HOLD & CHECKOUT FLOW                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │   SELECT SEATS ──▶ HOLD (10min) ──▶ PAYMENT ──▶ CONFIRM            │        │
│  │        │               │              │             │                │        │
│  │        │          Redis lock     Payment API    Update DB          │        │
│  │        │          with TTL       (Stripe)       Release lock       │        │
│  │        │               │              │             │                │        │
│  │        │          Auto-release    Idempotent    Create ticket      │        │
│  │        │          on timeout      with holdId   with barcode       │        │
│  │        │                                                            │        │
│  │   RELEASE ◀─────────── (if timeout or cancel) ◀────────────────    │        │
│  │                                                                      │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  REAL-TIME UPDATES                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Seat status changes ──▶ Redis Pub/Sub ──▶ WebSocket ──▶ Clients  │        │
│  │                                                                      │        │
│  │  - Seat sold/released: Update map in <500ms                        │        │
│  │  - Queue position: Update every 10 seconds                         │        │
│  │  - Hold expiry countdown: Client-side timer                        │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Virtual waiting room: Queue absorbs traffic spikes',
          'Controlled admission: Only N users shopping at once',
          'Redis locks with TTL: Seat holds auto-release',
          'Optimistic locking: Prevent race conditions at DB level',
          'WebSocket updates: Real-time seat availability',
          'Idempotent checkout: Safe retries with holdId'
        ]
      },

      bookingFlow: {
        title: 'Ticket Booking Flow',
        steps: [
          'User arrives at event page during on-sale',
          'If over capacity: Join virtual waiting room',
          'Wait for your position to be called (WebSocket updates)',
          'When admitted: Start shopping timer (15 minutes)',
          'View seat map (CDN-cached with WebSocket updates)',
          'Select seats → Redis SETNX to acquire hold',
          'If already held: Show error, suggest alternatives',
          'Hold acquired: Proceed to checkout with holdId',
          'Enter payment details, submit',
          'Backend validates hold, processes payment',
          'On success: Update seat status to SOLD, create booking',
          'Generate digital ticket with unique barcode',
          'Send confirmation email with tickets'
        ]
      },

      releaseFlow: {
        title: 'Seat Release Flow',
        steps: [
          'User abandons checkout or timer expires',
          'Redis key TTL expires, lock released automatically',
          'Background job checks for expired holds',
          'Update seat status back to AVAILABLE in DB',
          'Publish release event to Redis Pub/Sub',
          'WebSocket pushes update to all connected clients',
          'Seat map updates in real-time',
          'Released seats become available for others'
        ]
      },

      discussionPoints: [
        {
          topic: 'Bot Prevention',
          points: [
            'CAPTCHA at queue join and checkout',
            'Device fingerprinting to detect automation',
            'Behavioral analysis: Click patterns, timing',
            'Verified fan programs: Real identity required',
            'Purchase limits per account'
          ]
        },
        {
          topic: 'Fair Access Programs',
          points: [
            'Verified Fan: Pre-register, lottery for access',
            'Presales: Staggered access by fan tier',
            'Dynamic pricing: Market-based pricing reduces scalping',
            'Transfer restrictions: Non-transferable tickets',
            'Mobile-only entry: Harder to resell'
          ]
        },
        {
          topic: 'High-Demand Event Strategies',
          points: [
            'Scale infrastructure in advance',
            'Pre-cache all static content',
            'Dedicated shard for the event',
            'War room monitoring during on-sale',
            'Graceful degradation: Disable non-essential features'
          ]
        },
        {
          topic: 'Inventory Management',
          points: [
            'Hold back 1-2% as buffer',
            'Dynamic release of held inventory',
            'ADA compliance: Accessible seating rules',
            'Group seating: Keep parties together',
            'Best available algorithm'
          ]
        }
      ],

      requirements: ['Browse events', 'Seat selection', 'Inventory management', 'Waitlist', 'Prevent overselling', 'Handle flash sales'],
      components: ['Event service', 'Inventory service', 'Booking service', 'Payment service', 'Queue service', 'Notification'],
      keyDecisions: [
        'Pessimistic locking: Lock seats during checkout window',
        'Virtual waiting room: Queue users during high demand',
        'Seat hold with TTL: Release unpurchased seats after timeout',
        'Distributed locks: Redis SETNX for seat reservation',
        'Eventual consistency for sold counts, strong consistency for bookings'
      ],
      edgeCases: [
        { scenario: 'Two users select and pay for the same seat simultaneously', impact: 'Double-booking of a single seat, one customer must be refunded and relocated', mitigation: 'Pessimistic lock on seat selection with SETNX in Redis, 10-minute hold TTL, only one checkout can proceed per seat' },
        { scenario: 'Millions of users entering virtual queue for popular concert', impact: 'Queue service overwhelmed, users see errors or get unfair positions', mitigation: 'Pre-assign random queue positions via lottery, CDN-cached waiting room page, reveal queue position only when close to front' },
        { scenario: 'Payment timeout during seat checkout hold window', impact: 'Seat held but payment never completes, blocking seat from other buyers until TTL expires', mitigation: 'Short hold TTL (5-10 minutes), async payment with webhook confirmation, release seat immediately on payment failure' },
        { scenario: 'Scalper bots automating bulk seat purchases', impact: 'Genuine fans unable to purchase tickets, seats resold at inflated prices', mitigation: 'CAPTCHA at checkout, device fingerprinting, purchase limits per account, verified fan presale queues' },
        { scenario: 'Event cancellation requiring mass refund of 50K+ tickets', impact: 'Refund processing overwhelms payment system, customer support flooded', mitigation: 'Batch refund processing with async queue, proactive email notification, self-service refund portal, stagger refund batches' },
      ],
      tradeoffs: [
        { decision: 'Pessimistic locking vs optimistic concurrency for seat booking', pros: 'Pessimistic prevents any double-booking; optimistic allows higher throughput with retry', cons: 'Pessimistic creates lock contention during high-demand events; optimistic increases failed checkout attempts', recommendation: 'Pessimistic locking for seat-specific booking with short TTL, optimistic for general admission' },
        { decision: 'Virtual queue vs first-come-first-served', pros: 'Virtual queue provides fair access and controlled load; FCFS is simpler to implement', cons: 'Virtual queue adds waiting time and complexity; FCFS crashes under traffic spikes', recommendation: 'Virtual queue for high-demand events (>10x capacity), FCFS for regular events' },
        { decision: 'Real-time seat map vs cached availability', pros: 'Real-time shows exact available seats; cached reduces DB load significantly', cons: 'Real-time creates read hot spots on popular events; cached may show phantom availability', recommendation: 'Cached availability for browsing with real-time validation at selection and checkout' },
        { decision: 'Centralized vs distributed inventory management', pros: 'Centralized guarantees no overselling; distributed scales across regions', cons: 'Centralized is a single point of failure; distributed risks inventory inconsistency', recommendation: 'Centralized with Redis for hot events, partitioned by venue/section for parallelism' },
      ],
      layeredDesign: [
        { name: 'User-Facing Layer', purpose: 'Serve event discovery, seat maps, and manage virtual waiting room', components: ['Event Catalog API', 'Seat Map Renderer', 'Virtual Queue Service', 'CDN'] },
        { name: 'Booking & Inventory Layer', purpose: 'Handle seat reservation, hold management, and inventory consistency', components: ['Booking Service', 'Seat Lock Manager (Redis)', 'Inventory Service', 'Hold TTL Manager'] },
        { name: 'Payment & Fulfillment Layer', purpose: 'Process payments, issue tickets, and handle refunds', components: ['Payment Gateway', 'Ticket Issuer', 'QR Code Generator', 'Refund Service'] },
        { name: 'Data & Analytics Layer', purpose: 'Store event data, monitor sales velocity, and detect fraud', components: ['Event DB (PostgreSQL)', 'Sales Analytics', 'Fraud Detection', 'Notification Service'] },
      ],
    },
    {
      id: 'typeahead',
      title: 'Typeahead / Autocomplete',
      subtitle: 'Search Suggestions',
      icon: 'search',
      color: '#22c55e',
      difficulty: 'Medium',
      description: 'Design a typeahead suggestion system for search boxes.',

      introduction: `Typeahead (autocomplete) suggests search queries as users type, improving UX and helping users find what they want faster. Google, Amazon, and every major search application uses typeahead.

The system must return suggestions in under 100ms (ideally <50ms) as users type each character. This requires efficient data structures (tries), aggressive caching, and pre-computed suggestions for common prefixes.`,

      functionalRequirements: [
        'Return suggestions as user types (per keystroke)',
        'Support prefix matching',
        'Rank suggestions by popularity/relevance',
        'Show trending queries',
        'Personalize based on user history',
        'Spell correction for typos',
        'Support multiple suggestion types (queries, products, categories)',
        'Handle multiple languages'
      ],

      nonFunctionalRequirements: [
        'p99 latency < 100ms (ideally < 50ms)',
        'Handle 100K+ requests per second',
        'Support 100M+ unique query prefixes',
        'Update suggestions within minutes of trending',
        'High availability (99.99%)',
        'Graceful degradation under load'
      ],

      dataModel: {
        description: 'Trie structure with pre-computed top suggestions',
        schema: `trie_nodes {
  prefix: varchar PK
  suggestions: [ -- top 10 pre-computed
    { text: varchar, score: float, type: enum }
  ]
  updated_at: timestamp
}

query_stats {
  query: varchar PK
  count: bigint
  last_searched: timestamp
  trending_score: float
}

user_history {
  user_id: uuid
  query: varchar
  timestamp: timestamp
  clicked_result: varchar
}`
      },

      apiDesign: {
        description: 'Autocomplete suggestion endpoint',
        endpoints: [
          { method: 'GET', path: '/api/suggest', params: 'prefix, limit=10, userId?', response: '{ suggestions: [{ text, type, score }] }' },
          { method: 'POST', path: '/api/suggest/feedback', params: '{ prefix, selectedSuggestion }', response: '{ success }' }
        ]
      },

      keyQuestions: [
        {
          question: 'Which data structure should we use?',
          answer: `**Trie (Prefix Tree)** - Recommended:
- O(m) lookup where m = prefix length
- Naturally supports prefix matching
- Space efficient with compression (Patricia Trie)

**Example Trie**:
\`\`\`
        root
       /  |  \\
      a   b   c
     /|   |   |
    p r   a   a
   /  |   |   |
  p  m   t   r
 /   |       |
l   o       s
|   |
e   r
\`\`\`
"apple", "armor", "bat", "cars"

**Pre-computed Suggestions**:
- Store top 10 suggestions at each trie node
- Avoid real-time computation
- Update in background from analytics

**Alternative: Inverted Index**
- Better for fuzzy matching
- Higher latency than trie
- Use for spell correction layer`
        },
        {
          question: 'How do we rank suggestions?',
          answer: `**Ranking Formula**:
\`\`\`
score = w1 × frequency +
        w2 × recency +
        w3 × trending +
        w4 × personalization +
        w5 × query_quality
\`\`\`

**Factors**:
- **Frequency**: Historical search count (log scale)
- **Recency**: Time decay for recent searches
- **Trending**: Velocity of search growth
- **Personalization**: User's past searches/clicks
- **Query Quality**: Length, click-through rate

**Trending Detection**:
\`\`\`
trending_score = current_rate / baseline_rate
if trending_score > 3: boost significantly
\`\`\`

**Personalization** (when userId provided):
- Boost queries user has searched before
- Boost categories user engages with
- Blend: 70% global + 30% personal`
        },
        {
          question: 'How do we handle 100K requests/second?',
          answer: `**Caching Strategy**:
\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   CDN Edge  │────▶│  Typeahead  │
│    Cache    │     │    Cache    │     │   Service   │
│  (1 min)    │     │  (5 min)    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
\`\`\`

**Cache Hit Rates**:
- Single character prefixes ("a", "b"): 99%+ CDN hit
- 2-3 characters: 90%+ CDN hit
- 4+ characters: 50-70% hit
- Long tail: Pass through to service

**Optimization**:
- Pre-warm cache with top 1000 prefixes
- Cache suggestions for 5-10 minutes
- Use consistent hashing for service sharding
- Local in-memory trie for hot prefixes`
        },
        {
          question: 'How do we update suggestions in real-time?',
          answer: `**Data Pipeline**:
\`\`\`
Search Logs → Kafka → Flink → Aggregator → Trie Updater
                              (1 min windows)
\`\`\`

**Update Frequency**:
- Trending queries: Every 1-5 minutes
- Normal queries: Every hour
- New products/content: On publish

**Trie Update Strategy**:
1. Build new trie version in background
2. Atomic swap when ready
3. Propagate to all nodes via message queue

**Handling Breaking News**:
- Separate "trending" index updated in real-time
- Merge trending results with static suggestions
- Higher boost for trending items`
        }
      ],

      basicImplementation: {
        title: 'Basic Typeahead Architecture',
        description: 'In-memory trie with pre-computed suggestions',
        svgTemplate: 'typeahead',
        architecture: `
┌─────────────────────────────────────────────────────────────────┐
│                    Basic Typeahead System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐        ┌──────────────┐       ┌──────────────┐   │
│   │   User   │───────▶│  API Server  │──────▶│  In-Memory   │   │
│   │  Types   │        │              │       │    Trie      │   │
│   └──────────┘        └──────────────┘       │              │   │
│                                              │ Pre-computed │   │
│                                              │ suggestions  │   │
│                                              └──────────────┘   │
│                                                     │           │
│                                                     ▼           │
│                                              ┌──────────────┐   │
│                                              │   Analytics  │   │
│                                              │   (Batch)    │   │
│                                              └──────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single server = limited scalability',
          'No CDN caching',
          'Batch updates only (not real-time)',
          'No personalization'
        ]
      },

      advancedImplementation: {
        title: 'Production Typeahead Architecture',
        svgTemplate: 'typeaheadAdvanced',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Production Typeahead System                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                             │
│  │   Client    │                                                             │
│  │  (Debounce) │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CDN Edge Cache (99% hit rate)                     │    │
│  │              Cached: 1-3 char prefixes, common queries               │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │ (Cache miss)                             │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Load Balancer                                 │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│  ┌────────────────────────────────┼────────────────────────────────────┐    │
│  │                  TYPEAHEAD SERVICE CLUSTER                           │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │    │
│  │  │  Server 1   │    │  Server 2   │    │  Server 3   │              │    │
│  │  │             │    │             │    │             │              │    │
│  │  │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │              │    │
│  │  │ │ Trie    │ │    │ │ Trie    │ │    │ │ Trie    │ │              │    │
│  │  │ │(Shard A)│ │    │ │(Shard B)│ │    │ │(Shard C)│ │              │    │
│  │  │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │              │    │
│  │  │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │              │    │
│  │  │ │ Redis   │ │    │ │ Redis   │ │    │ │ Redis   │ │              │    │
│  │  │ │ Cache   │ │    │ │ Cache   │ │    │ │ Cache   │ │              │    │
│  │  │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │              │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     DATA PIPELINE (Real-time)                        │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │    │
│  │  │  Search  │───▶│  Kafka   │───▶│  Flink   │───▶│   Trie   │      │    │
│  │  │   Logs   │    │          │    │ (1 min)  │    │ Updater  │      │    │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Client-side debouncing (wait 100ms after keystroke)',
          'CDN caching for short prefixes (99% hit rate)',
          'Sharded tries across service cluster',
          'Real-time updates via Kafka → Flink pipeline',
          'Redis cache for personalized suggestions'
        ]
      },

      discussionPoints: [
        {
          topic: 'Client-side Optimizations',
          points: [
            'Debounce requests (wait 100-200ms after keystroke)',
            'Cancel in-flight requests on new keystroke',
            'Cache recent suggestions locally',
            'Show cached results while fetching new ones',
            'Prefetch suggestions for common next characters'
          ]
        },
        {
          topic: 'Spell Correction Integration',
          points: [
            'Edit distance for fuzzy matching',
            'Phonetic matching (Soundex, Metaphone)',
            'Use search logs to learn common typos',
            'Show "Did you mean?" for low-confidence matches',
            'Separate spell-check service or inline in trie lookup'
          ]
        },
        {
          topic: 'Multi-entity Suggestions',
          points: [
            'Mix query suggestions with products, categories, brands',
            'Type-specific ranking (products might have higher value)',
            'Visual differentiation (icons, formatting)',
            'Deep links to specific pages vs search results',
            'Balance between helpful and overwhelming'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Real-time suggestions', '<100ms latency', 'Personalization', 'Trending queries', 'Spell correction'],
      components: ['Trie service', 'Ranking service', 'Analytics pipeline', 'Cache'],
      keyDecisions: [
        'Trie data structure for prefix matching',
        'Pre-compute top suggestions per prefix',
        'Rank by: frequency, recency, personalization',
        'Edge caching for common prefixes',
        'Update suggestions from search analytics pipeline'
      ],
      edgeCases: [
        { scenario: 'User types faster than suggestion API can respond', impact: 'Stale suggestions appear for previous prefix, flickering UI as results arrive out of order', mitigation: 'Debounce requests (100-200ms), cancel in-flight requests when new keystroke arrives, sequence number to discard stale responses' },
        { scenario: 'Trie grows beyond single server memory for large corpus', impact: 'Cannot fit entire suggestion index in memory, service crashes or degrades', mitigation: 'Partition trie by prefix ranges across shards, top-K aggregation from multiple shards, keep only popular prefixes in memory' },
        { scenario: 'Trending query spike causes stale precomputed suggestions', impact: 'Breaking news topic not appearing in suggestions despite millions searching for it', mitigation: 'Real-time trending overlay on precomputed suggestions, blend batch trie with streaming hot queries updated every minute' },
        { scenario: 'Offensive or harmful content appearing in suggestions', impact: 'Brand reputation damage, legal liability, user trust erosion', mitigation: 'Blocklist filtering on suggestion output, ML content classifier in ranking pipeline, human review queue for new trending terms' },
        { scenario: 'Personalized suggestions leaking private search history', impact: 'Shared device shows previous user private searches as suggestions', mitigation: 'Tie personalization to authenticated session only, clear personalized cache on logout, incognito mode disables personalization' },
      ],
      tradeoffs: [
        { decision: 'Trie vs inverted index for prefix matching', pros: 'Trie provides O(k) prefix lookup where k is key length; inverted index leverages existing search infrastructure', cons: 'Trie requires custom implementation and more memory; inverted index prefix queries are slower and less natural', recommendation: 'Trie for dedicated typeahead service, inverted index only if piggy-backing on existing search cluster' },
        { decision: 'Precomputed top-K per prefix vs on-demand ranking', pros: 'Precomputed gives constant-time lookup; on-demand can incorporate real-time signals', cons: 'Precomputed becomes stale and uses more storage; on-demand adds latency per keystroke', recommendation: 'Precomputed top-K with periodic batch updates, overlay real-time trending for freshness' },
        { decision: 'Client-side caching vs server-only', pros: 'Client caching eliminates network round-trip for repeated prefixes; server-only ensures fresh results', cons: 'Client cache consumes device memory and may serve stale results; server-only adds latency', recommendation: 'Aggressive client-side caching with short TTL (5 minutes), prefetch suggestions for common next characters' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Capture keystrokes, debounce requests, cache results, and render suggestion dropdown', components: ['Input Handler', 'Request Debouncer', 'Local Cache', 'Suggestion Renderer'] },
        { name: 'API & Routing Layer', purpose: 'Route prefix queries to correct trie shard with low latency', components: ['API Gateway', 'Shard Router', 'Edge Cache (CDN)'] },
        { name: 'Suggestion Engine Layer', purpose: 'Store and query prefix-to-suggestion mappings with ranking', components: ['Distributed Trie', 'Ranking Service', 'Personalization Engine', 'Content Filter'] },
        { name: 'Data Pipeline Layer', purpose: 'Update suggestion corpus from search analytics and trending signals', components: ['Search Log Collector', 'Batch Trie Builder', 'Trending Aggregator', 'Blocklist Manager'] },
      ],
    },
    {
      id: 'chat-system',
      title: 'Slack / Discord',
      subtitle: 'Team Chat Application',
      icon: 'messageSquare',
      color: '#611f69',
      difficulty: 'Hard',
      description: 'Design a team communication platform with channels, threads, and integrations.',

      introduction: `Slack and Discord are team communication platforms that have transformed workplace collaboration. Slack has 20M+ daily active users sending billions of messages daily, while Discord has 150M+ monthly users.

The key challenges are: real-time message delivery via WebSockets, managing presence and typing indicators, searching through message history, and supporting rich integrations with bots and third-party apps.`,

      functionalRequirements: [
        'Workspaces/servers with multiple channels',
        'Public and private channels',
        'Direct messages (1:1 and group)',
        'Threaded conversations',
        'File and media sharing',
        'Message search across channels',
        'Reactions and emoji',
        'Mentions and notifications',
        'Bot and integration platform',
        'Voice and video calls'
      ],

      nonFunctionalRequirements: [
        'Real-time message delivery (<100ms)',
        'Support 500K+ concurrent WebSocket connections',
        'Handle 1B+ messages per day',
        'Message search across years of history',
        '99.99% availability',
        'End-to-end encryption for DMs (optional)',
        'Message retention and compliance'
      ],

      dataModel: {
        description: 'Workspaces, channels, messages, and threads',
        schema: `workspaces {
  id: uuid PK
  name: varchar(100)
  domain: varchar(50) -- company.slack.com
  plan: enum(FREE, PRO, ENTERPRISE)
  created_at: timestamp
}

channels {
  id: uuid PK
  workspace_id: uuid FK
  name: varchar(100)
  type: enum(PUBLIC, PRIVATE, DM, GROUP_DM)
  topic: text
  member_count: int
  created_at: timestamp
}

messages {
  id: snowflake PK -- time-sorted ID
  channel_id: uuid FK
  user_id: uuid FK
  thread_id: snowflake FK NULL -- parent message if thread reply
  content: text
  attachments: jsonb
  reactions: jsonb
  edited_at: timestamp
  created_at: timestamp
}

channel_members {
  channel_id: uuid FK
  user_id: uuid FK
  last_read_at: timestamp -- for unread tracking
  notifications: enum(ALL, MENTIONS, NONE)
}

user_presence {
  user_id: uuid PK
  status: enum(ACTIVE, AWAY, DND, OFFLINE)
  status_text: varchar(100)
  last_active: timestamp
}`
      },

      apiDesign: {
        description: 'REST API for CRUD, WebSocket for real-time',
        endpoints: [
          { method: 'POST', path: '/api/messages', params: '{ channelId, content, threadId?, attachments[] }', response: '{ message }' },
          { method: 'GET', path: '/api/channels/:id/messages', params: 'before, after, limit', response: '{ messages[], hasMore }' },
          { method: 'GET', path: '/api/search', params: 'q, channelIds[], from, to', response: '{ messages[], total }' },
          { method: 'WS', path: '/ws/realtime', params: 'token', response: 'MESSAGE_NEW, TYPING, PRESENCE, REACTION events' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we handle real-time messaging?',
          answer: `**WebSocket Architecture**:
\`\`\`
┌──────────┐    ┌───────────────┐    ┌────────────────┐
│  Client  │◀──▶│   WebSocket   │◀──▶│    Message     │
│          │    │    Gateway    │    │    Service     │
└──────────┘    └───────────────┘    └────────────────┘
                       │
                       ▼
               ┌───────────────┐
               │  Redis Pub/Sub │
               │  (Fan-out)     │
               └───────────────┘
\`\`\`

**Message Flow**:
1. User sends message via WebSocket
2. Gateway validates and forwards to Message Service
3. Message Service persists to DB
4. Publishes to Redis Pub/Sub channel (channel_id)
5. All Gateway instances subscribed to channel receive message
6. Gateways push to connected clients in that channel

**Connection Management**:
- Heartbeat every 30 seconds
- Reconnect with exponential backoff
- HTTP long-polling fallback for corporate firewalls
- Sticky sessions not required (stateless gateways)`
        },
        {
          question: 'How do we handle typing indicators and presence?',
          answer: `**Typing Indicators**:
- Client sends TYPING event when user starts typing
- Gateway broadcasts to channel members
- Auto-expire after 5 seconds (no need to persist)
- Rate limit: 1 event per 3 seconds per user

**Presence System**:
\`\`\`
User Activity → Presence Service → Redis
                                     ↓
                              TTL: 60 seconds
                                     ↓
                              Broadcast on change
\`\`\`

**Optimizations**:
- Only broadcast presence to users who have "viewed" target user
- Aggregate presence updates (batch every 5 seconds)
- Don't show typing for large channels (>100 members)
- Lazy presence: Fetch on demand, not push everything

**Status Levels**:
- ACTIVE: Recent activity (<5 min)
- AWAY: No activity (5-30 min)
- OFFLINE: No activity (>30 min) or explicit`
        },
        {
          question: 'How do we design message search?',
          answer: `**Search Architecture**:
\`\`\`
Messages → Kafka → Elasticsearch Indexer
                          ↓
                   Elasticsearch Cluster
                   (Sharded by workspace)
\`\`\`

**Index Design**:
- Shard by workspace_id (data locality)
- Index: message content, sender, channel, timestamp
- ACL: Filter by user's channel membership at query time

**Search Features**:
- Full-text search with highlighting
- Filters: from:user, in:channel, before/after dates
- Fuzzy matching for typos
- Recent messages weighted higher

**Performance**:
- Async indexing (1-5 second delay acceptable)
- Pre-filter by channel access (security)
- Result pagination with search_after
- Cache frequent searches`
        },
        {
          question: 'How do we track unread messages?',
          answer: `**Read Position Tracking**:
- Store last_read_message_id per user per channel
- Count unreads: messages with id > last_read_id

**Implementation**:
\`\`\`sql
-- In channel_members table
last_read_at: timestamp
last_read_message_id: snowflake

-- Unread count (at query time)
SELECT COUNT(*) FROM messages
WHERE channel_id = ? AND id > last_read_message_id
\`\`\`

**Optimizations**:
- Cache unread counts in Redis
- Invalidate on new message or mark-as-read
- Batch updates when user scrolls through messages
- Don't track exact count above threshold (show "99+")

**Mark as Read**:
- Automatic when user views channel
- Debounce: Only update after 1 second of focus
- Support "mark all as read" for workspace`
        },
        {
          question: 'How do we handle file uploads?',
          answer: `**Upload Flow**:
1. Client requests upload URL from API
2. API generates pre-signed S3 URL (expires in 15 min)
3. Client uploads directly to S3
4. Client notifies API of completion
5. API validates, creates message with attachment

**Storage**:
- S3 for files with CDN in front
- Thumbnails generated async (Lambda)
- Virus scanning before making available
- Storage limits per workspace/plan

**Message with Attachment**:
\`\`\`json
{
  "content": "Check out this design",
  "attachments": [{
    "type": "image",
    "url": "https://cdn.slack.com/...",
    "thumbnail_url": "...",
    "size": 245000,
    "name": "design.png"
  }]
}
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Basic Chat Architecture',
        description: 'Single WebSocket server with direct database connection for real-time messaging',
        svgTemplate: 'simpleChat',
        problems: [
          'Single server = limited connections',
          'No fan-out mechanism for multi-server',
          'No message search',
          'No presence aggregation'
        ]
      },

      advancedImplementation: {
        title: 'Production Chat Architecture',
        description: 'WebSocket gateway cluster with Redis Pub/Sub for cross-server message fan-out, Cassandra for message storage.',
        svgTemplate: 'distributedChat',
        architecture: `
                              (Diagram above shows simplified architecture)
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          SERVICE LAYER                                │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │  Message   │  │  Channel   │  │  Presence  │  │   Search   │     │   │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │     │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │   │
│  └────────┼───────────────┼───────────────┼───────────────┼─────────────┘   │
│           │               │               │               │                  │
│  ┌────────┼───────────────┼───────────────┼───────────────┼─────────────┐   │
│  │        ▼               ▼               ▼               ▼             │   │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐      │   │
│  │  │ Messages │   │ Channels │   │  Redis   │   │Elasticsearch │      │   │
│  │  │   DB     │   │   DB     │   │(Presence)│   │  (Search)    │      │   │
│  │  │(Sharded) │   │          │   │          │   │              │      │   │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────────┘      │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────┐       │   │
│  │  │                        Storage                            │       │   │
│  │  │  ┌──────────┐    ┌──────────┐    ┌──────────┐            │       │   │
│  │  │  │    S3    │    │   CDN    │    │  Kafka   │            │       │   │
│  │  │  │ (Files)  │    │ (Assets) │    │ (Events) │            │       │   │
│  │  │  └──────────┘    └──────────┘    └──────────┘            │       │   │
│  │  └──────────────────────────────────────────────────────────┘       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'WebSocket Gateway cluster with 100K connections per node',
          'Redis Pub/Sub for cross-gateway message fan-out',
          'Messages DB sharded by channel_id (co-locate channel messages)',
          'Elasticsearch for full-text message search',
          'Kafka for event sourcing and async processing',
          'Presence aggregated in Redis with TTL'
        ]
      },

      messageFlow: {
        title: 'Message Delivery Flow',
        steps: [
          'User sends message via WebSocket to Gateway',
          'Gateway validates auth token and permissions',
          'Gateway forwards to Message Service',
          'Message Service persists to database',
          'Message Service publishes to Redis Pub/Sub (channel topic)',
          'All Gateways subscribed to channel receive message',
          'Gateways push message to connected channel members',
          'Message Service sends to Kafka for async indexing',
          'Search indexer updates Elasticsearch',
          'Push notification service notifies offline users'
        ]
      },

      discussionPoints: [
        {
          topic: 'Message Storage & Partitioning',
          points: [
            'Partition messages by channel_id for query locality',
            'Use Snowflake IDs (time-sortable) for efficient range queries',
            'Archive old messages to cold storage (S3)',
            'Separate hot (recent) and cold (old) message stores',
            'Consider Cassandra for write-heavy workloads'
          ]
        },
        {
          topic: 'WebSocket Scaling',
          points: [
            'Each gateway handles 100K-500K connections',
            'Stateless gateways with Redis for pub/sub',
            'Graceful shutdown: Drain connections before restart',
            'Connection limits per user (prevent abuse)',
            'Geographic distribution for latency'
          ]
        },
        {
          topic: 'Bot Platform Design',
          points: [
            'Outgoing webhooks: POST to bot URL on message',
            'Incoming webhooks: Bot POSTs to Slack API',
            'Slash commands: /command triggers bot',
            'Event subscriptions: Bot subscribes to events',
            'Rate limiting per bot/workspace'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Workspaces/servers', 'Channels (public/private)', 'Direct messages', 'Threads', 'File sharing', 'Search', 'Integrations/bots'],
      components: ['Message service', 'Channel service', 'User service', 'Search (Elasticsearch)', 'File storage', 'WebSocket gateway', 'Bot platform'],
      keyDecisions: [
        'WebSocket for real-time messaging with HTTP fallback',
        'Partition messages by channel for locality',
        'Search: Index messages in Elasticsearch with channel ACL',
        'Threads: Parent-child message relationship',
        'Read position tracking per user per channel'
      ],
      edgeCases: [
        { scenario: 'User is a member of 500+ channels with active conversations', impact: 'Initial load fetches massive amounts of unread state and message previews, causing slow startup', mitigation: 'Lazy-load channels on scroll, only fetch unread counts initially, load full messages on channel open' },
        { scenario: 'File shared in channel exceeds storage quota during upload', impact: 'Upload fails mid-transfer, partial file left in storage, confusing error for user', mitigation: 'Pre-check quota before upload starts, chunked upload with early abort, cleanup orphaned chunks on failure' },
        { scenario: 'WebSocket connection drops during message send', impact: 'User unsure if message was delivered, may resend causing duplicates', mitigation: 'Client-side message ID for deduplication, optimistic UI with retry on reconnect, server acknowledges with message ID' },
        { scenario: 'Bot integration sending thousands of messages per second to a channel', impact: 'Channel becomes unusable for humans, notification storm for all members', mitigation: 'Per-bot rate limiting, message batching for bot outputs, separate bot message feed with opt-in notifications' },
        { scenario: 'Search across encrypted private channels', impact: 'Server-side search index cannot read encrypted messages, search returns incomplete results', mitigation: 'Client-side search for encrypted channels, encrypted search index with searchable encryption scheme, or disable search for E2E channels' },
      ],
      tradeoffs: [
        { decision: 'WebSocket per channel vs multiplexed WebSocket', pros: 'Per-channel gives isolated connections; multiplexed uses a single connection for all channels', cons: 'Per-channel wastes connections for users in many channels; multiplexed requires message routing logic', recommendation: 'Single multiplexed WebSocket per user with channel subscription management' },
        { decision: 'Store all message history vs time-limited retention', pros: 'Full history enables unlimited search; time-limited reduces storage costs significantly', cons: 'Full history is expensive at scale; time-limited frustrates users looking for old messages', recommendation: 'Free tier: 90-day retention, paid tier: unlimited history with cold storage archival for old messages' },
        { decision: 'Fan-out on write vs fan-out on read for channel messages', pros: 'Write fan-out gives instant delivery to all members; read fan-out reduces write amplification', cons: 'Write fan-out is expensive for large channels (10K+ members); read fan-out adds read latency', recommendation: 'Write fan-out for channels under 1K members, read fan-out for large public channels' },
        { decision: 'Elasticsearch vs custom search for message search', pros: 'Elasticsearch is battle-tested with rich query support; custom search can be optimized for chat-specific patterns', cons: 'Elasticsearch adds operational complexity; custom search requires significant engineering investment', recommendation: 'Elasticsearch for message search with channel-level access control filters' },
      ],
      layeredDesign: [
        { name: 'Client & Connection Layer', purpose: 'Manage WebSocket connections, local message cache, and real-time UI updates', components: ['WebSocket Client', 'Message Cache (IndexedDB)', 'Notification Manager', 'Presence Tracker'] },
        { name: 'Gateway & Routing Layer', purpose: 'Route messages to correct channels and manage user sessions', components: ['WebSocket Gateway', 'Message Router', 'Session Manager', 'Load Balancer'] },
        { name: 'Application Layer', purpose: 'Handle channel management, permissions, threading, and integrations', components: ['Channel Service', 'Thread Service', 'Permission Service', 'Bot Platform', 'File Service'] },
        { name: 'Storage & Search Layer', purpose: 'Persist messages, files, and power full-text search', components: ['Message Store (Cassandra)', 'File Store (S3)', 'Search Index (Elasticsearch)', 'User/Channel DB (PostgreSQL)'] },
      ],
    },
    {
      id: 'yelp',
      title: 'Yelp',
      subtitle: 'Location-Based Reviews',
      icon: 'mapPin',
      color: '#d32323',
      difficulty: 'Medium',
      description: 'Design a local business discovery and review platform.',

      introduction: `Yelp is a local business discovery platform with 200M+ businesses and reviews. Users search for nearby restaurants, shops, and services based on location, category, and ratings.

The key challenges are: efficient proximity search (geospatial queries), maintaining accurate aggregate ratings, handling user-generated content (reviews, photos), and detecting fake reviews.`,

      functionalRequirements: [
        'Search businesses by location, category, keywords',
        'View business details (hours, address, phone)',
        'Read and write reviews with ratings',
        'Upload business photos',
        'Make reservations or place orders',
        'Check-in at businesses',
        'Bookmark/save businesses',
        'Business owner dashboard'
      ],

      nonFunctionalRequirements: [
        'Search results in <200ms',
        'Handle 100M+ searches per day',
        'Support 200M+ businesses worldwide',
        'Photos load in <2 seconds (CDN)',
        'Review submission latency <1s',
        '99.9% availability',
        'Accurate ratings (fraud detection)'
      ],

      dataModel: {
        description: 'Businesses, reviews, photos, and geospatial data',
        schema: `businesses {
  id: uuid PK
  name: varchar(200)
  category_ids: uuid[] FK
  location: geography(POINT)
  geohash: varchar(12) -- for efficient proximity queries
  address: jsonb
  phone: varchar(20)
  hours: jsonb -- { mon: "9:00-17:00", ... }
  price_range: int -- 1-4 ($-$$$$)
  avg_rating: decimal(2,1) -- pre-computed
  review_count: int -- pre-computed
  photo_count: int
  claimed: boolean -- owner verified
}

reviews {
  id: uuid PK
  business_id: uuid FK
  user_id: uuid FK
  rating: int -- 1-5 stars
  text: text
  photos: varchar[] -- S3 URLs
  useful_count: int
  created_at: timestamp
}

categories {
  id: uuid PK
  name: varchar(100)
  parent_id: uuid FK -- hierarchy: Food > Restaurants > Pizza
}

user_actions {
  user_id: uuid FK
  business_id: uuid FK
  action: enum(BOOKMARK, CHECKIN, REVIEW, PHOTO)
  timestamp: timestamp
}`
      },

      apiDesign: {
        description: 'Search, business details, and review endpoints',
        endpoints: [
          { method: 'GET', path: '/api/search', params: 'q, lat, lng, radius, category, price, rating, sortBy', response: '{ businesses[], total, facets }' },
          { method: 'GET', path: '/api/businesses/:id', params: '-', response: '{ business, recentReviews[], photos[] }' },
          { method: 'POST', path: '/api/reviews', params: '{ businessId, rating, text, photos[] }', response: '{ reviewId }' },
          { method: 'GET', path: '/api/businesses/:id/reviews', params: 'sortBy, page', response: '{ reviews[], total }' },
          { method: 'POST', path: '/api/checkin', params: '{ businessId }', response: '{ success }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we implement proximity search?',
          answer: `**Geohash Approach**:
- Encode lat/lng into string (e.g., "9q8yy" for San Francisco)
- Longer prefix = more precise location
- Query: Find all businesses with geohash prefix matching

**Geohash Properties**:
\`\`\`
Precision  Cell Size
4 chars    ~20km
5 chars    ~5km
6 chars    ~1km
7 chars    ~150m
\`\`\`

**Search Query**:
\`\`\`sql
-- Find restaurants within 5km
SELECT * FROM businesses
WHERE geohash LIKE '9q8yy%'  -- prefix match
  AND category = 'restaurant'
  AND ST_DWithin(location, user_point, 5000)  -- precise filter
ORDER BY ST_Distance(location, user_point)
LIMIT 20
\`\`\`

**Alternative: QuadTree**
- Recursive spatial partitioning
- Better for non-uniform distribution
- More complex to implement`
        },
        {
          question: 'How do we handle aggregate ratings efficiently?',
          answer: `**Problem**: Can't compute AVG on every read (too slow for 200M reviews)

**Solution: Pre-compute and Update**:
\`\`\`
businesses.avg_rating = pre-computed average
businesses.review_count = pre-computed count
\`\`\`

**Update on New Review**:
\`\`\`sql
-- Atomic update when review added
UPDATE businesses SET
  avg_rating = ((avg_rating * review_count) + new_rating) / (review_count + 1),
  review_count = review_count + 1
WHERE id = business_id
\`\`\`

**Consistency Considerations**:
- Eventual consistency is OK (few seconds delay)
- Use database transaction for review + rating update
- For edits/deletes: Recompute from reviews (background job)

**Rating Distribution**:
- Also store rating histogram for display
- { 5: 120, 4: 80, 3: 30, 2: 10, 1: 5 }`
        },
        {
          question: 'How do we detect fake reviews?',
          answer: `**Fraud Signals**:
- New account posting many reviews quickly
- Review patterns (same text, suspicious timing)
- IP/device fingerprinting
- Geographic anomalies (review from different country)
- Natural language analysis (generic, template-like)

**ML Fraud Detection**:
\`\`\`
Features:
- Account age, review count, verification status
- Time since last review
- Review length, sentiment, uniqueness
- Geographic distance to business
- Device/IP reputation

Model: Classification → spam_probability
If spam_probability > 0.8: Hold for manual review
If spam_probability > 0.95: Auto-reject
\`\`\`

**Manual Review Queue**:
- Human reviewers for borderline cases
- Business owner can flag suspicious reviews
- User can report reviews

**Incentive Alignment**:
- Require purchase verification where possible
- Elite reviewer program for trusted users
- Legal action against review farms`
        },
        {
          question: 'How do we implement search with filters?',
          answer: `**Elasticsearch for Complex Search**:
\`\`\`json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "pizza" } }
      ],
      "filter": [
        { "geo_distance": {
            "distance": "5km",
            "location": { "lat": 37.7, "lon": -122.4 }
        }},
        { "range": { "avg_rating": { "gte": 4.0 } } },
        { "terms": { "price_range": [1, 2] } },
        { "term": { "open_now": true } }
      ]
    }
  },
  "sort": [
    { "_geo_distance": { "location": {...}, "order": "asc" } }
  ]
}
\`\`\`

**Faceted Search**:
Return aggregations for filters:
- Categories with counts
- Price range distribution
- Rating distribution
- "Open Now" count

**Performance**:
- Cache common searches (city + category)
- Pre-compute "popular near you" at regular intervals`
        }
      ],

      basicImplementation: {
        title: 'Basic Yelp Architecture',
        description: 'PostGIS for geospatial, single database',
        svgTemplate: 'yelp',
        architecture: `
┌─────────────────────────────────────────────────────────────────┐
│                       Basic Yelp System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐        ┌──────────────┐       ┌──────────────┐   │
│   │  Client  │───────▶│  API Server  │──────▶│  PostgreSQL  │   │
│   │          │        │              │       │  + PostGIS   │   │
│   └──────────┘        └──────────────┘       └──────────────┘   │
│                              │                                   │
│                              ▼                                   │
│                       ┌──────────────┐                          │
│                       │     S3       │                          │
│                       │   (Photos)   │                          │
│                       └──────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single database = scaling bottleneck',
          'No full-text search',
          'No caching layer',
          'No fraud detection'
        ]
      },

      advancedImplementation: {
        title: 'Production Yelp Architecture',
        svgTemplate: 'yelpAdvanced',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Production Yelp Architecture                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                             │
│  │   Clients   │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          CDN (CloudFront)                            │    │
│  │               Photos, Static Assets, Cached Search Results           │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        API Gateway / Load Balancer                   │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│  ┌────────────────────────────────┼────────────────────────────────────┐    │
│  │                         SERVICE LAYER                                │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │
│  │  │  Search    │  │  Business  │  │  Review    │  │   User     │    │    │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │    │    │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────────────┘    │    │
│  └────────┼───────────────┼───────────────┼────────────────────────────┘    │
│           │               │               │                                  │
│  ┌────────┼───────────────┼───────────────┼────────────────────────────┐    │
│  │        ▼               ▼               ▼                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │    │
│  │  │Elasticsearch │ │  PostgreSQL  │ │    Redis     │                │    │
│  │  │(Search +Geo) │ │  (Primary)   │ │   (Cache)    │                │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                │    │
│  │                                                                     │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │                    ASYNC PROCESSING                           │  │    │
│  │  │  ┌──────────┐    ┌──────────┐    ┌──────────────┐            │  │    │
│  │  │  │  Kafka   │───▶│  Fraud   │───▶│   Rating     │            │  │    │
│  │  │  │          │    │Detection │    │  Aggregator  │            │  │    │
│  │  │  └──────────┘    └──────────┘    └──────────────┘            │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  │  ┌──────────────┐                                                  │    │
│  │  │      S3      │  ← Photos with CDN in front                      │    │
│  │  └──────────────┘                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Elasticsearch for geospatial + full-text search',
          'Redis cache for business details and popular searches',
          'CDN for photos and static content',
          'Kafka pipeline for async rating aggregation',
          'ML fraud detection for review quality',
          'PostgreSQL for transactional data'
        ]
      },

      discussionPoints: [
        {
          topic: 'Search Ranking Factors',
          points: [
            'Distance from user (primary factor)',
            'Rating and review count',
            'Recency of reviews (freshness)',
            'Business completeness (photos, hours)',
            'Paid promotion (ads, sponsored)',
            'User personalization (past preferences)'
          ]
        },
        {
          topic: 'Photo Management',
          points: [
            'User-uploaded photos with moderation queue',
            'Automatic thumbnail generation',
            'Photo quality scoring (blur, lighting)',
            'Primary photo selection algorithm',
            'CDN with regional edge caching'
          ]
        },
        {
          topic: 'Business Owner Features',
          points: [
            'Claim and verify business ownership',
            'Respond to reviews publicly',
            'Analytics dashboard (views, calls, directions)',
            'Update hours, photos, menu',
            'Promoted placement (paid ads)'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Search nearby businesses', 'Ratings/reviews', 'Photos', 'Business profiles', 'Reservations', 'Check-ins'],
      components: ['Business service', 'Search service', 'Review service', 'Geospatial index', 'CDN', 'Recommendation engine'],
      keyDecisions: [
        'Geohash or QuadTree for proximity search',
        'Elasticsearch for full-text + geospatial queries',
        'Pre-compute aggregate ratings (avoid counting on read)',
        'CDN for business photos',
        'Fraud detection for fake reviews'
      ],
      edgeCases: [
        { scenario: 'Business with same name and address registered by different owners', impact: 'Duplicate listings cause review fragmentation and confuse customers', mitigation: 'Fuzzy matching on name + geocoordinates during registration, manual merge workflow, business owner verification process' },
        { scenario: 'Coordinated fake review campaign from competitor', impact: 'Artificial negative reviews tank a legitimate business rating, unfair competitive advantage', mitigation: 'ML-based review fraud detection (account age, review velocity, linguistic patterns), temporary review hold for suspicious accounts' },
        { scenario: 'GPS inaccuracy places user in wrong geohash cell', impact: 'Nearby businesses not shown in search results, poor search relevance', mitigation: 'Query adjacent geohash cells (8 neighbors), use radius-based filtering as secondary check, allow manual location correction' },
        { scenario: 'Business updates hours or menu but cache serves stale data', impact: 'Customer arrives at closed business or expects menu items no longer available', mitigation: 'Owner-initiated cache invalidation via dashboard, short TTL for business profile cache (1 hour), show last-updated timestamp' },
        { scenario: 'Search query matches thousands of restaurants in dense urban area', impact: 'Pagination through results is slow, ranking by relevance becomes critical', mitigation: 'Geo-bounded search with distance decay scoring, personalized ranking by past behavior, limit results to 50-mile radius default' },
      ],
      tradeoffs: [
        { decision: 'Geohash vs QuadTree for proximity search', pros: 'Geohash enables simple string-prefix queries and Redis integration; QuadTree provides adaptive resolution for varying business density', cons: 'Geohash has boundary issues where nearby points fall in different cells; QuadTree is harder to distribute', recommendation: 'Geohash for primary index with neighbor-cell queries to handle boundaries, QuadTree for in-memory secondary filtering' },
        { decision: 'Pre-aggregated ratings vs compute-on-read', pros: 'Pre-aggregated gives instant display; compute-on-read always shows exact current value', cons: 'Pre-aggregated can briefly show stale rating after new review; compute-on-read is expensive with many reviews', recommendation: 'Pre-aggregated with async update on new review, refresh within seconds via CDC event' },
        { decision: 'Elasticsearch vs PostgreSQL PostGIS for geospatial search', pros: 'Elasticsearch combines full-text and geo queries natively; PostGIS is simpler with existing PostgreSQL stack', cons: 'Elasticsearch adds operational overhead; PostGIS does not scale horizontally as easily', recommendation: 'Elasticsearch for search (combines text relevance + geo distance), PostGIS for precise spatial operations in backend' },
        { decision: 'Single global search index vs regional sharding', pros: 'Global index simplifies queries for traveling users; regional sharding reduces index size per shard', cons: 'Global index grows very large; regional sharding complicates cross-region searches', recommendation: 'Regional sharding by metro area with global routing layer, cross-region fallback for travel searches' },
      ],
      layeredDesign: [
        { name: 'Client & API Layer', purpose: 'Handle search queries, business profile views, and review submissions', components: ['Search API', 'Business Profile API', 'Review API', 'Photo Upload Service'] },
        { name: 'Search & Discovery Layer', purpose: 'Provide geospatial and full-text search with personalized ranking', components: ['Elasticsearch Cluster', 'Geospatial Index', 'Ranking Service', 'Personalization Engine'] },
        { name: 'Business & Review Layer', purpose: 'Manage business listings, reviews, ratings, and fraud detection', components: ['Business Service', 'Review Service', 'Rating Aggregator', 'Fraud Detection ML'] },
        { name: 'Storage & Delivery Layer', purpose: 'Persist data and serve media assets globally', components: ['Business DB (PostgreSQL)', 'Review Store', 'Photo CDN', 'Cache (Redis)'] },
      ],
    },
    {
      id: 'tinder',
      title: 'Tinder',
      subtitle: 'Dating App',
      icon: 'heart',
      color: '#fe3c72',
      difficulty: 'Medium',
      description: 'Design a location-based dating app with swipe matching.',

      introduction: `Tinder is a location-based dating app where users swipe right to like or left to pass on potential matches. When two users mutually like each other, they "match" and can start chatting.

The key challenges include finding nearby users efficiently, generating personalized recommendations at scale, detecting matches in real-time, and supporting 2B+ swipes per day.`,

      functionalRequirements: [
        'Create profile with photos, bio, preferences',
        'Browse nearby users matching preferences',
        'Swipe right (like), left (pass), or super like',
        'Match notification when mutual like occurs',
        'Chat with matches',
        'Location-based discovery',
        'Filters: age, distance, gender',
        'Premium features: unlimited likes, rewind, passport'
      ],

      nonFunctionalRequirements: [
        'Sub-100ms swipe response time',
        'Handle 2B+ swipes per day',
        'Match detection in real-time (<1 second)',
        'Recommendation generation <500ms',
        'Support 75M+ monthly active users',
        'Global availability with location awareness'
      ],

      dataModel: {
        description: 'Users, swipes, matches, and messages',
        schema: `users {
  id: bigint PK
  name: varchar(100)
  bio: text
  birthdate: date
  gender: enum
  interestedIn: enum[]
  photos: varchar[]
  location: point (lat/lng)
  geohash: varchar(12)
  ageRangeMin: int
  ageRangeMax: int
  maxDistance: int (km)
  lastActive: timestamp
  eloScore: int (for ranking)
}

swipes {
  swiperId: bigint PK
  targetId: bigint PK
  action: enum(LIKE, PASS, SUPERLIKE)
  timestamp: timestamp
}

matches {
  id: bigint PK
  user1Id: bigint FK
  user2Id: bigint FK
  matchedAt: timestamp
  unmatched: boolean default false
}

messages {
  id: uuid PK
  matchId: bigint FK
  senderId: bigint FK
  content: text
  sentAt: timestamp
  readAt: timestamp nullable
}

recommendation_queue {
  userId: bigint PK
  recommendations: bigint[] -- pre-computed stack
  generatedAt: timestamp
}`
      },

      apiDesign: {
        description: 'REST APIs for recommendations and swipes, WebSocket for chat',
        endpoints: [
          {
            method: 'GET',
            path: '/api/recommendations',
            params: '?count=10',
            response: '{ users: [{id, name, age, photos, distance, bio}] }'
          },
          {
            method: 'POST',
            path: '/api/swipe',
            params: '{ targetId, action: LIKE|PASS|SUPERLIKE }',
            response: '{ match: boolean, matchId?: bigint }'
          },
          {
            method: 'GET',
            path: '/api/matches',
            params: '?cursor=',
            response: '{ matches: [{id, user, lastMessage, matchedAt}] }'
          },
          {
            method: 'WS',
            path: '/ws/chat/{matchId}',
            params: 'auth token',
            response: 'Bidirectional messages'
          },
          {
            method: 'PATCH',
            path: '/api/profile',
            params: '{ photos, bio, preferences }',
            response: '{ updated: true }'
          },
          {
            method: 'POST',
            path: '/api/location',
            params: '{ lat, lng }',
            response: '{ geohash }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we efficiently find nearby users?',
          answer: `Geohashing approach:

1. Convert location to geohash:
   (37.7749, -122.4194) → "9q8yy"
   - Precision determines cell size
   - 6 chars ≈ 1.2km × 0.6km

2. Query nearby cells:
   - User in cell "9q8yy"
   - Query "9q8yy" + 8 neighbors
   - Covers ~3.6km × 1.8km

3. Post-filter by distance:
   - Calculate exact distance
   - Filter by user's maxDistance setting

4. Index structure:
   - B-tree on (geohash, gender, lastActive)
   - Fast range queries

Alternative: QuadTree for dynamic precision`
        },
        {
          question: 'How does match detection work?',
          answer: `On swipe LIKE:

1. Record swipe in database:
   INSERT INTO swipes (swiperId, targetId, action)

2. Check for mutual like:
   SELECT * FROM swipes
   WHERE swiperId = targetId
   AND targetId = swiperId
   AND action = 'LIKE'

3. If found, create match:
   INSERT INTO matches (user1Id, user2Id)

4. Notify both users:
   - Push notification
   - Update match count
   - Show "Its a Match!" screen

Optimization:
- Redis set for likes: SADD user:123:likes 456
- Check match: SISMEMBER user:456:likes 123
- O(1) lookup instead of DB query`
        },
        {
          question: 'How do we generate recommendations?',
          answer: `Two-stage recommendation:

1. Candidate Generation:
   - Same geohash region
   - Matches preferences (age, gender, interested_in)
   - Not already swiped on
   - Active in last 7 days

2. Ranking (Elo-like system):
   - Users have attractiveness score
   - Right-swipes increase score, left decreases
   - Show users with similar scores
   - Weighted by: distance, activity, profile completeness

3. Pre-computation:
   - Generate recommendation stack async
   - Store in Redis sorted set
   - Refresh when depleted or location changes

4. Diversity:
   - Mix high-score and varied profiles
   - Avoid showing same "type" repeatedly`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple swipe and match without optimization',
        svgTemplate: 'tinder',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                            TINDER BASIC                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ Load Balancer│─────▶│   App Server     │          │
│  └──────────┘      └──────────────┘      └────────┬─────────┘          │
│                                                    │                    │
│  GET RECOMMENDATIONS:                     ┌────────▼─────────┐          │
│  SELECT * FROM users                      │    PostgreSQL    │          │
│  WHERE location nearby                    │   - Users        │          │
│  AND gender matches                       │   - Swipes       │          │
│  AND age in range                         │   - Matches      │          │
│  AND NOT IN (already swiped)              └──────────────────┘          │
│                                                                         │
│  PROBLEMS:                                                              │
│  - Complex query on every request                                      │
│  - No ranking/personalization                                          │
│  - Slow match detection                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Query users on every recommendation request',
          'No geospatial indexing - slow location queries',
          'Match detection requires DB lookup on every swipe',
          'No recommendation ranking/personalization',
          'Cannot scale with 2B swipes/day'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'tinderAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TINDER PRODUCTION                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  RECOMMENDATION ENGINE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  ┌──────────────┐   ┌───────────────┐   ┌───────────────────────┐  │        │
│  │  │ Candidate    │──▶│   Ranker      │──▶│  Recommendation       │  │        │
│  │  │ Generator    │   │               │   │  Queue (Redis)        │  │        │
│  │  │              │   │  - Elo score  │   │                       │  │        │
│  │  │ - Geohash    │   │  - Distance   │   │  ZSET per user        │  │        │
│  │  │ - Prefs      │   │  - Activity   │   │  user:123:recs        │  │        │
│  │  │ - NOT swiped │   │  - Profile    │   │                       │  │        │
│  │  └──────────────┘   └───────────────┘   └───────────────────────┘  │        │
│  │        │                                         │                  │        │
│  │        ▼                                         ▼                  │        │
│  │  ┌──────────────────────────────────────────────────────────────┐  │        │
│  │  │              USER REQUEST FOR RECOMMENDATIONS                 │  │        │
│  │  │                                                               │  │        │
│  │  │  1. Check Redis queue: ZRANGE user:123:recs 0 9              │  │        │
│  │  │  2. If empty: Trigger async generation                       │  │        │
│  │  │  3. Return cached recommendations                            │  │        │
│  │  └──────────────────────────────────────────────────────────────┘  │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  SWIPE & MATCH                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  SWIPE RIGHT (LIKE)                                                 │        │
│  │  ┌──────────────┐   ┌───────────────┐   ┌───────────────────────┐  │        │
│  │  │   Record     │──▶│ Check Match   │──▶│   Match Found?        │  │        │
│  │  │   Swipe      │   │   (Redis)     │   │                       │  │        │
│  │  │              │   │               │   │  ┌─────┐    ┌──────┐  │  │        │
│  │  │  SADD        │   │ SISMEMBER     │   │  │ YES │    │  NO  │  │  │        │
│  │  │  user:123:   │   │ user:456:     │   │  └──┬──┘    └──────┘  │  │        │
│  │  │  likes 456   │   │ likes 123     │   │     │                 │  │        │
│  │  └──────────────┘   └───────────────┘   │     ▼                 │  │        │
│  │                                          │  Create Match        │  │        │
│  │                                          │  Send Push           │  │        │
│  │                                          │  notifications       │  │        │
│  │                                          └───────────────────────┘  │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  GEOSPATIAL INDEX                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  Geohash grid:  9q8yy | 9q8yz | 9q8z0                               │        │
│  │                 ------+-------+------                                │        │
│  │                 9q8yw | 9q8yx | 9q8yy  ← User                       │        │
│  │                 ------+-------+------                                │        │
│  │                 9q8yt | 9q8yu | 9q8yv                               │        │
│  │                                                                      │        │
│  │  Query: Get users in 9 cells around user's location                 │        │
│  │  Index: B-tree on (geohash, gender, age)                            │        │
│  │                                                                      │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  CHAT SERVICE                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  Match → Chat enabled → WebSocket connection                        │        │
│  │                              │                                       │        │
│  │                         ┌────▼────────┐                             │        │
│  │                         │  Chat       │                             │        │
│  │                         │  Gateway    │                             │        │
│  │                         └────┬────────┘                             │        │
│  │                              │                                       │        │
│  │              ┌───────────────┼───────────────┐                      │        │
│  │              ▼               ▼               ▼                      │        │
│  │         ┌────────┐     ┌────────┐     ┌────────────┐               │        │
│  │         │ Kafka  │     │ Redis  │     │ Cassandra  │               │        │
│  │         │(events)│     │(online)│     │ (messages) │               │        │
│  │         └────────┘     └────────┘     └────────────┘               │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Pre-computed recommendations: Redis sorted sets per user',
          'O(1) match detection: Redis sets for likes',
          'Geohash indexing: Efficient spatial queries',
          'Elo-like ranking: Users see similar attractiveness level',
          'Async generation: Recommendations computed in background',
          'WebSocket chat: Real-time messaging after match'
        ]
      },

      swipeFlow: {
        title: 'Swipe Flow',
        steps: [
          'Client requests recommendations from Redis queue',
          'If queue empty, trigger async generation',
          'Return profile cards to client',
          'User swipes right on profile',
          'Record like in Redis: SADD user:123:likes 456',
          'Check for match: SISMEMBER user:456:likes 123',
          'If match found, create match record',
          'Send push notification to both users',
          'Show "Its a Match!" animation',
          'Enable chat between matched users',
          'Remove profile from recommendation queue'
        ]
      },

      recommendationFlow: {
        title: 'Recommendation Generation Flow',
        steps: [
          'Triggered when queue depleted or location changes',
          'Calculate users geohash from location',
          'Query users in same and neighboring cells',
          'Filter by gender, age preferences',
          'Exclude already-swiped users',
          'Score candidates by Elo, distance, activity',
          'Apply diversity rules',
          'Store top N in Redis sorted set',
          'TTL on recommendations: regenerate if stale'
        ]
      },

      discussionPoints: [
        {
          topic: 'Elo Rating System',
          points: [
            'Similar to chess Elo ratings',
            'Right-swipes increase your score',
            'Left-swipes (especially from high-rated) decrease',
            'Show users profiles with similar Elo',
            'Prevents showing "out of league" profiles constantly'
          ]
        },
        {
          topic: 'Recommendation Quality',
          points: [
            'Cold start: New users get broad exposure',
            'Feedback loop: Learn from swipe patterns',
            'Diversity: Avoid showing same type repeatedly',
            'Freshness: Prioritize recently active users',
            'Boost new profiles initially'
          ]
        },
        {
          topic: 'Premium Features Architecture',
          points: [
            'Unlimited likes: Remove rate limiting',
            'See who liked you: Query reverse swipes',
            'Rewind: Store swipe history, allow undo',
            'Passport: Allow different location search',
            'Boost: Temporarily increase visibility'
          ]
        },
        {
          topic: 'Safety Features',
          points: [
            'Photo verification with ML',
            'Report and block functionality',
            'Message filtering for harassment',
            'Location privacy options',
            'Background checks (partnership)'
          ]
        }
      ],

      requirements: ['User profiles', 'Photo uploads', 'Nearby users', 'Swipe (like/pass)', 'Matching', 'Chat after match'],
      components: ['User service', 'Matching service', 'Geospatial service', 'Chat service', 'Recommendation engine', 'CDN'],
      keyDecisions: [
        'Geohash for efficient nearby user lookup',
        'Pre-compute recommendation stacks per user',
        'Store swipe decisions for bidirectional match detection',
        'Elo-like scoring for recommendation ranking',
        'CDN with image resizing for photos'
      ],
      edgeCases: [
        { scenario: 'Both users swipe right simultaneously from different regions', impact: 'Race condition may create duplicate matches or miss the match entirely', mitigation: 'Use atomic compare-and-swap on a centralized match store keyed by sorted user ID pair' },
        { scenario: 'User exhausts all nearby candidates in a small town', impact: 'Empty recommendation stack leads to poor engagement and churn', mitigation: 'Gradually expand search radius, resurface previously passed profiles after cooldown, and suggest travel mode' },
        { scenario: 'Fake profiles and catfishing at scale', impact: 'Degrades trust, increases reports, and drives away genuine users', mitigation: 'Photo verification with liveness check, ML-based profile authenticity scoring, and human review queue' },
        { scenario: 'Celebrity or viral user gets millions of right-swipes', impact: 'Their like queue becomes unmanageable and skews the matching algorithm', mitigation: 'Cap visible likes with smart sampling, use separate high-follower pipeline, and prioritize mutual-interest signals' },
        { scenario: 'GPS spoofing to appear in a different location', impact: 'Users game the system to match in desirable cities they are not actually in', mitigation: 'Cross-reference IP geolocation with GPS, flag large jumps, and require periodic location re-verification' },
      ],
      tradeoffs: [
        { decision: 'Pre-computed recommendation stacks vs on-demand scoring', pros: 'Pre-computed gives instant swipe experience with no loading delay', cons: 'Stacks go stale if user preferences or location change frequently', recommendation: 'Pre-compute stacks every few hours and supplement with a real-time re-ranker for freshness' },
        { decision: 'Geohash grid vs radius-based proximity search', pros: 'Geohash enables fast index lookups and easy sharding by region', cons: 'Grid boundaries cause edge effects where nearby users fall into different cells', recommendation: 'Use geohash with multi-cell overlap queries to eliminate boundary blind spots' },
        { decision: 'Elo-based ranking vs pure preference matching', pros: 'Elo balances attractiveness tiers so users see realistic matches', cons: 'Can create echo chambers and reduce diversity of shown profiles', recommendation: 'Blend Elo with exploratory slots that surface profiles outside the predicted tier' },
        { decision: 'Symmetric swipe data (store both directions) vs asymmetric', pros: 'Symmetric makes match detection a simple lookup on one key', cons: 'Doubles write volume and storage for every swipe action', recommendation: 'Store asymmetric swipes and check for reciprocal on each new swipe using a bloom filter pre-check' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Swipe UI, photo display, and local swipe queue buffering for offline resilience', components: ['Swipe Gesture Handler', 'Photo Preloader', 'Local Swipe Queue'] },
        { name: 'API Gateway Layer', purpose: 'Rate limiting, authentication, and routing swipe and match requests', components: ['Auth Middleware', 'Rate Limiter', 'WebSocket Gateway'] },
        { name: 'Matching Engine Layer', purpose: 'Process swipes, detect mutual matches, and trigger match notifications', components: ['Swipe Processor', 'Match Detector', 'Notification Dispatcher'] },
        { name: 'Recommendation Layer', purpose: 'Build and serve personalized candidate stacks using location and preferences', components: ['Geospatial Index', 'Scoring Engine', 'Stack Builder'] },
        { name: 'Data Layer', purpose: 'Persist profiles, swipe history, matches, and chat messages', components: ['Profile Store (PostgreSQL)', 'Swipe Log (Cassandra)', 'Match Cache (Redis)', 'Media CDN'] },
      ],
    },
    {
      id: 'spotify',
      title: 'Spotify',
      subtitle: 'Music Streaming',
      icon: 'music',
      color: '#1db954',
      difficulty: 'Hard',
      description: 'Design a music streaming service with playlists and recommendations.',

      introduction: `Spotify is the world's largest music streaming service with 500M+ users and 100M+ tracks. Users stream music on-demand, create playlists, and discover new music through personalized recommendations.

The key challenges are: low-latency audio streaming at scale (11K streams/second), building accurate recommendation systems, handling offline playback with DRM, and managing massive music catalog metadata.`,

      functionalRequirements: [
        'Stream audio tracks on demand',
        'Create and manage playlists',
        'Search tracks, artists, albums, playlists',
        'Personalized recommendations (Discover Weekly, Daily Mix)',
        'Offline download with DRM',
        'Follow artists and friends',
        'View artist pages and discography',
        'Podcasts and audiobooks',
        'Lyrics display',
        'Cross-device playback (Spotify Connect)'
      ],

      nonFunctionalRequirements: [
        'Audio playback starts in <200ms',
        'Gapless playback between tracks',
        'Handle 30B+ streams per month',
        'Support 100M+ track catalog',
        '99.99% streaming availability',
        'Offline mode works without network',
        'Adaptive bitrate based on network conditions'
      ],

      dataModel: {
        description: 'Tracks, artists, albums, playlists, and user data',
        schema: `tracks {
  id: uuid PK
  title: varchar(200)
  artist_ids: uuid[] FK
  album_id: uuid FK
  duration_ms: int
  audio_files: jsonb -- { "320": "s3://...", "160": "...", "96": "..." }
  release_date: date
  popularity: int -- 0-100
  audio_features: jsonb -- { tempo, energy, danceability, ... }
}

artists {
  id: uuid PK
  name: varchar(200)
  genres: varchar[]
  followers: bigint
  monthly_listeners: bigint
  images: jsonb
}

playlists {
  id: uuid PK
  owner_id: uuid FK
  name: varchar(200)
  description: text
  is_public: boolean
  track_count: int
  followers: bigint
  image_url: varchar
}

playlist_tracks {
  playlist_id: uuid FK
  track_id: uuid FK
  position: int
  added_at: timestamp
  added_by: uuid FK
}

user_library {
  user_id: uuid FK
  item_id: uuid
  item_type: enum(TRACK, ALBUM, ARTIST, PLAYLIST)
  added_at: timestamp
}

listening_history {
  user_id: uuid FK
  track_id: uuid FK
  played_at: timestamp
  context: varchar -- playlist_id, album_id, etc.
  play_duration_ms: int
}`
      },

      apiDesign: {
        description: 'Streaming, search, and playlist management',
        endpoints: [
          { method: 'GET', path: '/api/tracks/:id/stream', params: 'quality', response: 'audio/ogg stream with range support' },
          { method: 'GET', path: '/api/search', params: 'q, type, limit', response: '{ tracks[], artists[], albums[], playlists[] }' },
          { method: 'GET', path: '/api/recommendations', params: 'seedTracks[], seedArtists[]', response: '{ tracks[] }' },
          { method: 'POST', path: '/api/playlists', params: '{ name, description }', response: '{ playlist }' },
          { method: 'POST', path: '/api/playlists/:id/tracks', params: '{ trackIds[], position }', response: '{ snapshot_id }' },
          { method: 'GET', path: '/api/me/player', params: '-', response: '{ currentTrack, progress, device }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does audio streaming work?',
          answer: `**Adaptive Bitrate Streaming**:
- Store each track in multiple qualities: 96, 160, 320 kbps (Ogg Vorbis)
- Client starts with low quality, upgrades based on bandwidth
- HTTP byte-range requests for seeking

**Streaming Flow**:
\`\`\`
┌────────┐     ┌───────┐     ┌───────────┐     ┌──────────┐
│ Client │────▶│  CDN  │────▶│  Origin   │────▶│    S3    │
│        │     │ (Edge)│     │  (if miss)│     │ (Audio)  │
└────────┘     └───────┘     └───────────┘     └──────────┘
\`\`\`

**Gapless Playback**:
- Pre-buffer next track while current plays
- Crossfade overlap: Download end of current + start of next
- Start buffering next track at 70% of current

**CDN Strategy**:
- Popular tracks (top 1%) cached at edge: 99% hit rate
- Long-tail tracks: Fetch from origin on demand
- Regional CDN nodes for latency optimization`
        },
        {
          question: 'How does the recommendation system work?',
          answer: `**Recommendation Approaches**:

**1. Collaborative Filtering**:
- "Users who liked X also liked Y"
- Matrix factorization on user-track interactions
- Find similar users, recommend their tracks

**2. Content-Based**:
- Audio features: tempo, energy, danceability, key
- Genre/style similarity
- Artist similarity graph

**3. Contextual**:
- Time of day (workout music at 6am)
- Day of week (party music on Saturday)
- Recent listening (mood continuation)

**Discover Weekly Pipeline**:
\`\`\`
User Listening History
        ↓
Collaborative Filtering → Candidate Tracks
        ↓
Content-Based Filtering → Refine by audio features
        ↓
Novelty Filter → Remove already-heard tracks
        ↓
Diversity Injection → Mix genres/artists
        ↓
30 tracks → Discover Weekly playlist
\`\`\`

**Daily Mix**:
- Cluster user's listening into genres/moods
- Create 6 mixes per cluster
- Update daily with fresh tracks`
        },
        {
          question: 'How do we handle offline playback?',
          answer: `**Download Process**:
1. User selects playlist/album for offline
2. Client requests download tokens for each track
3. Server validates subscription and generates time-limited tokens
4. Client downloads encrypted audio files
5. Store with DRM wrapper in local database

**DRM (Digital Rights Management)**:
\`\`\`
Encrypted Audio File + License Key
        ↓
License Server validates:
- User has active subscription
- Track is in user's library
- Download count within limits
        ↓
Returns decryption key (valid for 30 days)
\`\`\`

**Offline Sync**:
- Background sync when on WiFi
- Track sync status: PENDING, DOWNLOADING, READY, ERROR
- Prioritize recently played/added tracks
- Auto-remove after 30 days without going online

**Storage Management**:
- User sets max storage limit
- Auto-cleanup: Remove least recently played when full
- Quality setting affects storage size`
        },
        {
          question: 'How does Spotify Connect work?',
          answer: `**Multi-device Control**:
- Any device can control playback on any other device
- Real-time sync of play state across devices

**Architecture**:
\`\`\`
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Phone   │────▶│   Connect    │────▶│  Speaker │
│(Control) │     │   Service    │     │ (Playback)│
└──────────┘     └──────────────┘     └──────────┘
                       │
               ┌───────┴───────┐
               │  Player State │
               │ { track, pos, │
               │   device_id } │
               └───────────────┘
\`\`\`

**Protocol**:
1. Devices register with Connect service via WebSocket
2. Control device sends command (play, pause, skip)
3. Service updates player state
4. Playback device receives state change
5. Playback device streams audio

**Challenges**:
- Network latency between devices
- Handoff: Transfer playback to different device
- State sync: All devices see same state`
        }
      ],

      basicImplementation: {
        title: 'Basic Music Streaming',
        description: 'Simple audio serving with basic playlists',
        svgTemplate: 'spotify',
        architecture: `
┌─────────────────────────────────────────────────────────────────┐
│                    Basic Spotify System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐        ┌──────────────┐       ┌──────────────┐   │
│   │  Client  │───────▶│  API Server  │──────▶│  PostgreSQL  │   │
│   │          │        │              │       │  (Metadata)  │   │
│   └──────────┘        └──────────────┘       └──────────────┘   │
│        │                     │                                   │
│        │                     ▼                                   │
│        │              ┌──────────────┐                          │
│        └─────────────▶│     S3       │                          │
│         (Audio)       │  (Audio Files)│                          │
│                       └──────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘`,
        problems: [
          'No CDN = high latency for distant users',
          'No adaptive bitrate',
          'No recommendation engine',
          'No offline support'
        ]
      },

      advancedImplementation: {
        title: 'Production Spotify Architecture',
        svgTemplate: 'spotifyAdvanced',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Production Spotify Architecture                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                             │
│  │   Clients   │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│  ┌──────┼───────────────────────────────────────────────────────────────┐   │
│  │      │              CONTENT DELIVERY                                  │   │
│  │      ▼                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │                   Global CDN Network                         │     │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │     │   │
│  │  │  │  Edge   │  │  Edge   │  │  Edge   │  │  Edge   │        │     │   │
│  │  │  │  US-W   │  │  US-E   │  │   EU    │  │  APAC   │        │     │   │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │     │   │
│  │  └───────┼────────────┼────────────┼────────────┼─────────────┘     │   │
│  │          └────────────┴────────────┴────────────┘                   │   │
│  │                              │ (cache miss)                          │   │
│  │                              ▼                                       │   │
│  │                   ┌──────────────────┐                              │   │
│  │                   │   Audio Origin   │◀────┐                        │   │
│  │                   │    (S3/GCS)      │     │                        │   │
│  │                   └──────────────────┘     │ Transcode              │   │
│  │                                            │                        │   │
│  │                   ┌──────────────────┐     │                        │   │
│  │                   │  Audio Pipeline  │─────┘                        │   │
│  │                   │  (Ingestion)     │                              │   │
│  │                   └──────────────────┘                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICE LAYER                                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │  Catalog   │  │  Playlist  │  │  Search    │  │  Connect   │     │   │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │     │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │   │
│  │        │               │               │               │             │   │
│  │  ┌─────┴───────────────┴───────────────┴───────────────┴─────┐      │   │
│  │  │                    DATA LAYER                              │      │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │      │   │
│  │  │  │Cassandra │  │PostgreSQL│  │Elastic-  │  │   Redis   │ │      │   │
│  │  │  │(Activity)│  │(Metadata)│  │  search  │  │  (Cache)  │ │      │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └───────────┘ │      │   │
│  │  └────────────────────────────────────────────────────────────┘      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     RECOMMENDATION ENGINE                             │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │   │
│  │  │   Listening  │───▶│    Spark     │───▶│   Model      │            │   │
│  │  │   History    │    │  (Training)  │    │   Serving    │            │   │
│  │  │   (Kafka)    │    │              │    │              │            │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Global CDN with edge caching for popular tracks',
          'Adaptive bitrate streaming (96/160/320 kbps)',
          'Cassandra for high-write listening history',
          'Spark-based recommendation training pipeline',
          'Real-time model serving for personalization',
          'Spotify Connect for multi-device control'
        ]
      },

      discussionPoints: [
        {
          topic: 'Audio Quality vs Bandwidth',
          points: [
            'Free tier: Max 160 kbps',
            'Premium: Up to 320 kbps',
            'Adaptive: Start low, increase based on bandwidth',
            'Ogg Vorbis format (better than MP3 at same bitrate)',
            'Consider AAC for iOS (native support)'
          ]
        },
        {
          topic: 'Royalty and Licensing',
          points: [
            'Track every stream for royalty calculation',
            'Minimum play time (30s) to count as stream',
            'Different rates per country/label',
            'Audit trail for disputes',
            'Content licensing by region'
          ]
        },
        {
          topic: 'Cold Start Problem',
          points: [
            'New users: Ask for favorite genres/artists',
            'Use demographics and device info',
            'Gradually personalize with listening data',
            'New tracks: Use audio features and artist similarity',
            'A/B test recommendations for new content'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Stream music', 'Playlists', 'Search', 'Recommendations', 'Offline downloads', 'Social features', 'Artist pages'],
      components: ['Streaming service', 'Catalog service', 'Playlist service', 'Search', 'Recommendation engine', 'CDN', 'Analytics'],
      keyDecisions: [
        'Adaptive bitrate streaming (Ogg Vorbis)',
        'CDN with edge caching for popular tracks',
        'Collaborative filtering + content-based recommendations',
        'Pre-load next tracks for gapless playback',
        'Offline: Encrypted local cache with license management'
      ],
      edgeCases: [
        { scenario: 'User switches between devices mid-song during playback', impact: 'Audio cuts out or restarts from the beginning on the new device', mitigation: 'Use Spotify Connect protocol to sync playback position across devices via a centralized session service' },
        { scenario: 'Massive spike in streams for a viral new album release', impact: 'CDN cache misses and origin server overload cause buffering for millions of users', mitigation: 'Pre-warm CDN edges with anticipated popular releases and use tiered caching with origin shielding' },
        { scenario: 'Artist pulls their catalog from the platform mid-stream', impact: 'Users with downloaded tracks still have access, active streams may break, and playlists become incomplete', mitigation: 'DRM license revocation on next sync, graceful skip for removed tracks, and tombstone entries in playlists' },
        { scenario: 'Collaborative playlist edited simultaneously by many users', impact: 'Conflicting additions and removals cause lost updates or duplicate tracks', mitigation: 'Use CRDTs or operational transforms for collaborative playlists with last-writer-wins for conflicts' },
        { scenario: 'Network fluctuation during streaming in a tunnel or subway', impact: 'Playback stutters and stops, degrading user experience significantly', mitigation: 'Buffer 30+ seconds ahead, automatically downgrade bitrate on poor connections, and seamlessly fall back to offline cache' },
      ],
      tradeoffs: [
        { decision: 'Adaptive bitrate streaming vs fixed quality', pros: 'Adaptive adjusts to network conditions and prevents buffering automatically', cons: 'Quality changes mid-song are noticeable and annoying to audiophiles', recommendation: 'Default to adaptive with a user setting to lock quality for premium subscribers on WiFi' },
        { decision: 'Collaborative filtering vs content-based recommendations', pros: 'Collaborative finds unexpected gems based on similar user behavior; content-based understands audio features', cons: 'Collaborative has cold-start problems for new users; content-based misses social trends', recommendation: 'Hybrid approach blending both signals, with content-based weighted more for new users' },
        { decision: 'Client-side vs server-side playlist shuffling', pros: 'Client-side shuffle reduces server load; server-side ensures consistent shuffle across devices', cons: 'Client-side shuffle diverges between devices; server-side adds latency per track', recommendation: 'Generate shuffle sequence server-side, cache it on client, and sync via session service' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Audio playback, offline caching, and device session management', components: ['Audio Player Engine', 'Download Manager', 'Spotify Connect Client'] },
        { name: 'API Gateway Layer', purpose: 'Authentication, request routing, and DRM license verification', components: ['Auth Service', 'API Router', 'License Server'] },
        { name: 'Content Delivery Layer', purpose: 'Low-latency audio chunk delivery from geographically distributed edges', components: ['CDN Edge Nodes', 'Origin Shield', 'Bitrate Selector'] },
        { name: 'Application Layer', purpose: 'Playlist management, search, social features, and recommendation serving', components: ['Playlist Service', 'Search Index (Elasticsearch)', 'Recommendation Engine', 'Social Graph'] },
        { name: 'Data Layer', purpose: 'Catalog metadata, user data, and analytics event storage', components: ['Catalog DB (Cassandra)', 'User DB (PostgreSQL)', 'Event Stream (Kafka)', 'Blob Storage (audio files)'] },
      ],
    },
    {
      id: 'airbnb',
      title: 'Airbnb',
      subtitle: 'Property Rental',
      icon: 'home',
      color: '#ff5a5f',
      difficulty: 'Hard',
      description: 'Design a property rental marketplace with search, booking, and reviews.',

      introduction: `Airbnb is a global property rental marketplace with 7+ million active listings and 150+ million users. The system enables hosts to list properties and guests to search, book, and review stays.

Key challenges include complex search with geo-location, date availability, and amenities; preventing double-bookings; managing trust and safety; and handling payments across multiple currencies.`,

      functionalRequirements: [
        'List properties with photos, amenities, pricing',
        'Search by location, dates, guests, price, amenities',
        'View property details and calendar',
        'Book with instant book or request',
        'Host calendar management',
        'Reviews (both guest and host)',
        'Messaging between guests and hosts',
        'Payment processing with escrow'
      ],

      nonFunctionalRequirements: [
        'Search results in <500ms',
        'Never allow double-booking',
        'Handle 100M+ searches/day',
        'Support 7M+ active listings',
        '99.9% availability',
        'Global reach with local currency support'
      ],

      dataModel: {
        description: 'Listings, availability, bookings, and users',
        schema: `listings {
  id: bigint PK
  hostId: bigint FK
  title: varchar(200)
  description: text
  propertyType: enum(APARTMENT, HOUSE, ROOM, etc)
  location: point (lat/lng)
  address: jsonb
  amenities: varchar[]
  maxGuests: int
  bedrooms: int
  beds: int
  bathrooms: decimal
  pricePerNight: decimal
  cleaningFee: decimal
  photos: varchar[]
  instantBook: boolean
  status: enum(ACTIVE, INACTIVE, PENDING)
}

availability {
  listingId: bigint PK
  date: date PK
  status: enum(AVAILABLE, BLOCKED, BOOKED)
  price: decimal nullable (override)
  minNights: int
  bookingId: bigint FK nullable
}

bookings {
  id: bigint PK
  listingId: bigint FK
  guestId: bigint FK
  checkin: date
  checkout: date
  guests: int
  totalPrice: decimal
  status: enum(PENDING, CONFIRMED, CANCELLED, COMPLETED)
  paymentId: varchar FK
  createdAt: timestamp
}

reviews {
  id: bigint PK
  bookingId: bigint FK
  reviewerId: bigint FK
  revieweeId: bigint FK
  type: enum(GUEST_TO_HOST, HOST_TO_GUEST)
  rating: decimal(2,1)
  content: text
  createdAt: timestamp
}`
      },

      apiDesign: {
        description: 'REST APIs for search, booking, and calendar management',
        endpoints: [
          {
            method: 'GET',
            path: '/api/search',
            description: 'Search listings by location, dates, guest count, and filters. Uses Elasticsearch for geo-distance queries and filters results against the availability calendar. Returns paginated listings sorted by relevance score.',
            params: '?location=&lat=&lng=&checkin=&checkout=&guests=&priceMin=&priceMax=&amenities=',
            response: '{ listings[], pagination, facets }'
          },
          {
            method: 'GET',
            path: '/api/listings/{id}',
            description: 'Fetch full listing details including host profile, aggregated reviews, and availability calendar for the next 3 months. Used when a guest clicks on a search result to view the property page.',
            params: '',
            response: '{ listing, host, reviews[], availability }'
          },
          {
            method: 'GET',
            path: '/api/listings/{id}/calendar',
            description: 'Retrieve the availability calendar for a specific listing. Returns each date with its booking status (available, blocked, booked) and any custom pricing overrides set by the host.',
            params: '?month=',
            response: '{ dates: [{date, status, price}] }'
          },
          {
            method: 'POST',
            path: '/api/bookings',
            description: 'Create a new booking. For Instant Book listings, dates are held for 10 minutes while payment processes. For Request to Book, the host must approve before payment is charged. Uses optimistic locking to prevent double-bookings.',
            params: '{ listingId, checkin, checkout, guests, message }',
            response: '{ bookingId, status, paymentIntent }'
          },
          {
            method: 'PATCH',
            path: '/api/host/listings/{id}/calendar',
            description: 'Host endpoint to update calendar availability. Can block dates, set custom pricing per date, or change minimum stay requirements. Changes are propagated to the search index asynchronously.',
            params: '{ dates[], status, price }',
            response: '{ updated: true }'
          },
          {
            method: 'POST',
            path: '/api/reviews',
            description: 'Submit a review after a completed stay. Both guest and host can leave reviews. Reviews are only published after both parties submit (or after 14 days), preventing retaliatory reviews.',
            params: '{ bookingId, rating, content }',
            response: '{ reviewId }'
          }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we handle complex search with availability?',
          answer: `Two-stage search:

1. Elasticsearch for initial filtering:
   - Geo-distance from location
   - Property type, amenities, price range
   - Guest capacity
   - Returns candidate listing IDs

2. Availability check against database:
   - Check calendar table for date range
   - WHERE date BETWEEN checkin AND checkout-1
   - AND status = 'AVAILABLE'
   - GROUP BY listing, HAVING COUNT(*) = nights

Optimization:
- Cache popular date ranges
- Pre-aggregate availability for next 30 days
- Denormalize into Elasticsearch for simpler queries`
        },
        {
          question: 'How do we prevent double-booking?',
          answer: `Multiple layers:

1. Database constraints:
   - Unique index on (listingId, date, status=BOOKED)
   - Transaction isolation level: SERIALIZABLE

2. Optimistic locking:
   UPDATE availability
   SET status = 'BOOKED', bookingId = X
   WHERE listingId = Y
   AND date BETWEEN checkin AND checkout-1
   AND status = 'AVAILABLE'

   If affected rows != expected nights, rollback

3. Instant Book flow:
   - Hold dates for 10 minutes during payment
   - status = 'PENDING' during hold
   - Convert to BOOKED on payment success

4. Request to Book flow:
   - No hold, host manually approves
   - Check availability again at approval time`
        },
        {
          question: 'How do we handle payments across currencies?',
          answer: `Escrow model:

1. Guest pays in their currency
   - Convert to USD at booking time
   - Hold in escrow

2. Host payout in their currency
   - Convert from USD to host currency
   - Pay 24 hours after check-in

3. Fee structure:
   - Guest service fee: 5-15% of subtotal
   - Host service fee: 3% of subtotal
   - Currency conversion spread: ~3%

4. Refund handling:
   - Full refund before cutoff date
   - Partial refund based on policy
   - Convert at current rate (guest takes FX risk)`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Simple search and booking without availability optimization',
        svgTemplate: 'airbnb',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                            AIRBNB BASIC                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐          │
│  │  Client  │─────▶│ Load Balancer│─────▶│   App Server     │          │
│  └──────────┘      └──────────────┘      └────────┬─────────┘          │
│                                                    │                    │
│  SEARCH:                                  ┌────────▼─────────┐          │
│  SELECT * FROM listings                   │    PostgreSQL    │          │
│  WHERE location nearby                    │                  │          │
│  AND dates available                      │  - Listings      │          │
│  (complex JOIN)                           │  - Availability  │          │
│                                           │  - Bookings      │          │
│  PROBLEMS:                                │  - Reviews       │          │
│  - Slow geo + date queries                └──────────────────┘          │
│  - Full table scans                                                     │
│  - Double-booking possible                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: [
          'Slow search: JOIN between listings and availability',
          'No geo-indexing: Full table scan for location',
          'Double-booking risk: Race conditions',
          'Single database: Cannot scale search and booking independently'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'airbnbAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AIRBNB PRODUCTION                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SEARCH PIPELINE                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  Client Query ──▶ API Gateway ──▶ Search Service                    │        │
│  │                                        │                             │        │
│  │                         ┌──────────────┴───────────────┐            │        │
│  │                         ▼                              ▼            │        │
│  │               ┌──────────────────┐           ┌──────────────┐       │        │
│  │               │   Elasticsearch  │           │ Availability │       │        │
│  │               │                  │           │   Service    │       │        │
│  │               │ - Geo filtering  │           │              │       │        │
│  │               │ - Amenities      │           │ - Date check │       │        │
│  │               │ - Property type  │           │ - Booking    │       │        │
│  │               │ - Price range    │           │   conflicts  │       │        │
│  │               │                  │           │              │       │        │
│  │               │ Returns: IDs     │           │              │       │        │
│  │               └────────┬─────────┘           └──────┬───────┘       │        │
│  │                        │                            │                │        │
│  │                        └──────────┬─────────────────┘                │        │
│  │                                   ▼                                  │        │
│  │                          ┌──────────────┐                           │        │
│  │                          │ Merge & Rank │                           │        │
│  │                          │   Results    │                           │        │
│  │                          └──────────────┘                           │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  BOOKING & AVAILABILITY                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │        │
│  │  │   Booking    │───▶│ Availability │───▶│     PostgreSQL       │  │        │
│  │  │   Service    │    │   Service    │    │                      │  │        │
│  │  └──────────────┘    └──────────────┘    │  availability table  │  │        │
│  │                                           │  - Sharded by        │  │        │
│  │                                           │    listingId         │  │        │
│  │                                           │  - Row-level lock    │  │        │
│  │                                           │    per date          │  │        │
│  │                                           └──────────────────────┘  │        │
│  │                                                                      │        │
│  │  BOOKING FLOW:                                                      │        │
│  │  1. Check availability (SELECT FOR UPDATE)                         │        │
│  │  2. Create booking record                                          │        │
│  │  3. Update availability to BOOKED                                  │        │
│  │  4. Process payment                                                 │        │
│  │  5. Commit transaction                                              │        │
│  │                                                                      │        │
│  │  If payment fails: Rollback, dates become available again          │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  CALENDAR MANAGEMENT                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  Host updates ──▶ Calendar Service ──▶ Update availability table   │        │
│  │       │                                        │                     │        │
│  │       │                                        ▼                     │        │
│  │       │                               ┌──────────────┐              │        │
│  │       │                               │ Invalidate   │              │        │
│  │       │                               │ ES cache     │              │        │
│  │       │                               └──────────────┘              │        │
│  │       │                                                              │        │
│  │       └── Price rules engine:                                       │        │
│  │           - Weekend pricing                                         │        │
│  │           - Seasonal pricing                                        │        │
│  │           - Event-based pricing                                     │        │
│  │           - Min stay requirements                                   │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  PAYMENT ESCROW                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                                                                      │        │
│  │  Guest ──▶ Stripe ──▶ Escrow Account ──▶ Host (after check-in)     │        │
│  │              │                                    │                  │        │
│  │              │                                    │                  │        │
│  │         Guest fee                            Host fee               │        │
│  │          deducted                            deducted               │        │
│  │                                                                      │        │
│  │  Refund flow based on cancellation policy                          │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Two-stage search: ES for filtering, DB for availability',
          'Row-level locking: Prevent double-booking at DB level',
          'Sharding by listingId: Keep all dates for a listing together',
          'Payment escrow: Hold funds until check-in',
          'Calendar service: Handle complex pricing rules',
          'Search ranking: Factor in conversion rate, response rate'
        ]
      },

      searchFlow: {
        title: 'Search Flow',
        steps: [
          'User enters location, dates, guests',
          'Geocode location to lat/lng',
          'Query Elasticsearch with geo-distance filter',
          'Apply property type, amenities, price filters',
          'Get candidate listing IDs (top 1000)',
          'Check availability service for date range',
          'Filter out listings with blocked/booked dates',
          'Rank by quality score, conversion rate, price',
          'Fetch listing details from cache/DB',
          'Return paginated results with map markers'
        ]
      },

      bookingFlow: {
        title: 'Booking Flow',
        steps: [
          'Guest clicks "Reserve" or "Request to Book"',
          'For Instant Book: Start hold on dates',
          'Collect payment information',
          'Begin database transaction',
          'SELECT FOR UPDATE on availability dates',
          'Verify all dates still available',
          'Create booking record with PENDING status',
          'Update availability status to BOOKED',
          'Process payment through Stripe',
          'If payment succeeds: Commit, confirm booking',
          'If payment fails: Rollback, release dates',
          'Send confirmation to guest and host',
          'Transfer to escrow account'
        ]
      },

      discussionPoints: [
        {
          topic: 'Search Ranking',
          points: [
            'Quality score: Photos, completeness, responsiveness',
            'Conversion rate: Bookings / views',
            'Price competitiveness vs similar listings',
            'Guest preferences and past bookings',
            'Freshness: Recently updated listings'
          ]
        },
        {
          topic: 'Trust & Safety',
          points: [
            'Identity verification for hosts and guests',
            'Photo verification for listings',
            'Reviews require completed stays',
            'Messaging monitored for scams',
            'Host guarantee and guest insurance'
          ]
        },
        {
          topic: 'Dynamic Pricing',
          points: [
            'Demand signals: Search volume, booking pace',
            'Local events: Concerts, conferences',
            'Seasonality patterns',
            'Competitor pricing',
            'Smart Pricing feature for automatic adjustment'
          ]
        },
        {
          topic: 'Calendar Optimization',
          points: [
            'Store ranges vs individual dates trade-off',
            'Efficient queries for month views',
            'iCal sync with other platforms',
            'Minimum stay rules affecting availability',
            'Gap night discounts'
          ]
        }
      ],

      requirements: ['List properties', 'Search by location/dates', 'Booking', 'Calendar management', 'Reviews', 'Messaging', 'Payments'],
      components: ['Listing service', 'Search service', 'Booking service', 'Calendar service', 'Payment service', 'Messaging', 'Review service'],
      keyDecisions: [
        'Search: Elasticsearch with geo filters + availability filters',
        'Calendar: Store availability as date ranges, not individual dates',
        'Double-booking prevention: Optimistic locking on booking',
        'Dynamic pricing based on demand, events, seasonality',
        'Trust & safety: Photo verification, reviews, identity verification'
      ],
      edgeCases: [
        { scenario: 'Two guests attempt to book the same property for overlapping dates simultaneously', impact: 'Double-booking leads to one guest arriving with no accommodation available', mitigation: 'Use optimistic locking with version numbers on the calendar table and retry the losing transaction' },
        { scenario: 'Host cancels a confirmed booking close to check-in date', impact: 'Guest is stranded with no accommodation and trust in the platform erodes', mitigation: 'Enforce Superhost penalties for late cancellations, auto-rebook guest into similar listings, and provide compensation credits' },
        { scenario: 'Fraudulent listing with stolen photos of a property that does not exist', impact: 'Guests pay for a non-existent stay and lose money and trust', mitigation: 'Require host identity verification, cross-check listing photos with reverse image search, and hold payouts until after check-in' },
        { scenario: 'Guest damages property and disputes the claim', impact: 'Host absorbs repair costs and may leave the platform', mitigation: 'Require security deposits, offer host damage protection insurance, and use photo-based pre/post check-in verification' },
        { scenario: 'Currency conversion fluctuation between booking and payout', impact: 'Host receives less than expected or platform absorbs exchange rate losses', mitigation: 'Lock exchange rate at booking time, settle in host local currency, and use hedging for major currency pairs' },
      ],
      tradeoffs: [
        { decision: 'Instant Book vs Host Approval required', pros: 'Instant Book increases conversion rates and reduces booking friction', cons: 'Hosts lose control over who stays, leading to potential bad guest experiences', recommendation: 'Default to Instant Book with host-defined auto-reject rules for guest rating thresholds' },
        { decision: 'Elasticsearch vs dedicated geo-database for search', pros: 'Elasticsearch handles full-text plus geo queries in one system with great performance', cons: 'Complex availability and date-range filtering in Elasticsearch is hard to tune and can be slow', recommendation: 'Use Elasticsearch for geo and text search, but pre-filter availability in a relational DB before sending candidates to ES' },
        { decision: 'Store calendar as individual dates vs date ranges', pros: 'Date ranges use far less storage and make bulk availability updates fast', cons: 'Range-based queries are more complex and splitting ranges on partial bookings requires careful logic', recommendation: 'Use date ranges with a merge/split algorithm, and materialize individual dates into a cache for fast availability checks' },
        { decision: 'Platform-managed payments vs direct host payment', pros: 'Platform-managed enables refunds, dispute resolution, and trust', cons: 'Adds payment processing complexity, regulatory burden, and payout delays for hosts', recommendation: 'Always use platform-managed payments with configurable payout schedules to balance host cash flow and buyer protection' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Search UI with map integration, booking flow, and messaging interface', components: ['Map View (Mapbox)', 'Search Filters', 'Booking Wizard', 'Messaging UI'] },
        { name: 'API Gateway Layer', purpose: 'Request routing, authentication, and rate limiting for guests and hosts', components: ['Auth Middleware', 'Rate Limiter', 'API Router', 'CDN for listing images'] },
        { name: 'Application Layer', purpose: 'Core business logic for listings, bookings, pricing, and reviews', components: ['Listing Service', 'Booking Service', 'Pricing Engine', 'Review Service', 'Messaging Service'] },
        { name: 'Search Layer', purpose: 'Geo-aware search with availability filtering and ranking', components: ['Elasticsearch Cluster', 'Availability Index', 'Ranking Service'] },
        { name: 'Data Layer', purpose: 'Persistent storage for listings, bookings, user profiles, and financial transactions', components: ['PostgreSQL (bookings/users)', 'Elasticsearch (search)', 'Redis (availability cache)', 'S3 (photos)', 'Payment Ledger DB'] },
      ],
    },
    {
      id: 'doordash',
      title: 'DoorDash / UberEats',
      subtitle: 'Food Delivery',
      icon: 'truck',
      color: '#ff3008',
      difficulty: 'Hard',
      description: 'Design a food delivery platform connecting restaurants, customers, and drivers.',

      introduction: `DoorDash and UberEats are food delivery platforms connecting restaurants, customers, and delivery drivers. DoorDash processes millions of orders daily with 100K+ concurrent deliveries at peak times.

The key challenges are: optimizing driver dispatch (matching orders to drivers), accurate ETA prediction, real-time order and driver tracking, and handling peak demand (dinner rush, Super Bowl Sunday).`,

      functionalRequirements: [
        'Browse restaurants by location, cuisine, rating',
        'View menus with prices and customizations',
        'Place and pay for orders',
        'Real-time order status tracking',
        'Real-time driver location tracking',
        'Driver matching and dispatch',
        'Ratings and reviews',
        'Scheduled orders',
        'Group orders',
        'Driver earnings and incentives'
      ],

      nonFunctionalRequirements: [
        'Handle 2M+ orders per day',
        'Support 100K concurrent deliveries',
        'ETA accuracy within 5 minutes',
        'Order placement < 2 seconds',
        'Real-time tracking updates every 5 seconds',
        '99.9% availability',
        'Handle surge during peak hours (2-3x normal)'
      ],

      dataModel: {
        description: 'Orders, restaurants, drivers, and tracking',
        schema: `orders {
  id: uuid PK
  customer_id: uuid FK
  restaurant_id: uuid FK
  driver_id: uuid FK NULL
  status: enum(PLACED, CONFIRMED, PREPARING, READY, PICKED_UP, DELIVERING, DELIVERED, CANCELLED)
  items: jsonb
  subtotal: decimal
  delivery_fee: decimal
  tip: decimal
  delivery_address: jsonb
  estimated_delivery: timestamp
  actual_delivery: timestamp
  created_at: timestamp
}

restaurants {
  id: uuid PK
  name: varchar(200)
  location: geography(POINT)
  cuisine_type: varchar[]
  avg_prep_time: int -- minutes
  rating: decimal(2,1)
  is_open: boolean
  operating_hours: jsonb
}

drivers {
  id: uuid PK
  name: varchar(100)
  vehicle_type: enum(CAR, BIKE, SCOOTER)
  current_location: geography(POINT)
  status: enum(OFFLINE, AVAILABLE, ASSIGNED, DELIVERING)
  current_order_ids: uuid[] -- can have multiple for batching
  rating: decimal(2,1)
}

driver_locations {
  driver_id: uuid FK
  location: geography(POINT)
  timestamp: timestamp
  -- Time-series data, partition by time
}`
      },

      apiDesign: {
        description: 'Restaurant discovery, ordering, and tracking',
        endpoints: [
          { method: 'GET', path: '/api/restaurants', params: 'lat, lng, radius, cuisine, sortBy', response: '{ restaurants[], eta[] }' },
          { method: 'GET', path: '/api/restaurants/:id/menu', params: '-', response: '{ categories[], items[] }' },
          { method: 'POST', path: '/api/orders', params: '{ restaurantId, items[], address, tip }', response: '{ orderId, estimatedDelivery }' },
          { method: 'GET', path: '/api/orders/:id', params: '-', response: '{ order, driverLocation, eta }' },
          { method: 'WS', path: '/ws/track/:orderId', params: '-', response: 'LOCATION_UPDATE, STATUS_CHANGE events' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does driver dispatch and matching work?',
          answer: `**Dispatch Optimization Goals**:
- Minimize delivery time for customer
- Maximize driver utilization (earnings)
- Balance load across available drivers
- Consider batching (multiple orders per trip)

**Matching Algorithm**:
\`\`\`
For each unassigned order:
  1. Find available drivers within radius
  2. Score each driver:
     - Distance to restaurant (primary)
     - Current direction of travel
     - Driver rating and experience
     - Vehicle suitability (hot food = car)
  3. Consider batching:
     - Can this order be added to existing route?
     - Same restaurant or nearby?
     - Delivery addresses on similar path?
  4. Assign to highest-score driver
\`\`\`

**Batch Delivery**:
- Driver picks up from 2-3 restaurants
- Delivery order optimized for total distance
- Each customer sees their own ETA
- Max 2 additional stops typically

**Real-time Reoptimization**:
- Reassign if driver cancels
- Rebalance during demand spikes`
        },
        {
          question: 'How do we predict accurate ETAs?',
          answer: `**ETA Components**:
\`\`\`
Total ETA = Driver to Restaurant +
            Food Prep Time +
            Restaurant to Customer

Each component has uncertainty → confidence interval
\`\`\`

**ML Model Features**:
- Restaurant historical prep times by item
- Current order queue length
- Time of day / day of week
- Real-time traffic data
- Weather conditions
- Driver's current location and speed
- Number of stops if batched

**Model Output**:
\`\`\`json
{
  "eta_minutes": 35,
  "confidence": 0.85,
  "range": { "min": 30, "max": 45 },
  "breakdown": {
    "pickup": 12,
    "prep": 15,
    "delivery": 8
  }
}
\`\`\`

**Continuous Learning**:
- Compare predicted vs actual delivery times
- A/B test model improvements
- Per-restaurant prep time calibration`
        },
        {
          question: 'How do we handle real-time tracking?',
          answer: `**Driver Location Updates**:
\`\`\`
Driver App → API Gateway → Location Service → Kafka → Consumers
                                                  ↓
                                            TimescaleDB
                                            (Location History)
\`\`\`

**Update Frequency**:
- Driver app: GPS every 5 seconds
- Customer app: Poll or WebSocket push every 5 seconds
- Batch location writes (5-10 at a time)

**Tracking Data Flow**:
\`\`\`
1. Driver app sends location
2. Location service validates and publishes to Kafka
3. ETA service recalculates delivery time
4. Tracking service updates customer view
5. Push notification if major ETA change
\`\`\`

**Optimizations**:
- Client-side interpolation between updates
- Snap to roads for cleaner visualization
- Reduce frequency when driver stationary
- WebSocket with fallback to polling`
        },
        {
          question: 'How do we handle peak demand (surge)?',
          answer: `**Demand Prediction**:
- Historical patterns (dinner rush, weekends, events)
- Weather (rain = more orders)
- Special events (Super Bowl, holidays)
- Proactive driver incentives to increase supply

**Surge Management**:
\`\`\`
If demand > supply by X%:
  1. Increase delivery fees (demand pricing)
  2. Show longer ETAs (set expectations)
  3. Boost driver pay (surge incentives)
  4. Temporary pause new restaurant signups
  5. Priority to loyal customers
\`\`\`

**Driver Supply**:
- Push notifications to offline drivers
- Bonus incentives for peak hours
- Predictive scheduling (guaranteed hourly rate)
- Heat maps showing high-demand areas

**Graceful Degradation**:
- Queue orders if dispatch overwhelmed
- Limit orders per restaurant
- Expand delivery radius to find more drivers`
        }
      ],

      basicImplementation: {
        title: 'Basic Food Delivery',
        description: 'Simple order flow without optimization',
        svgTemplate: 'doordash',
        architecture: `
┌─────────────────────────────────────────────────────────────────┐
│                   Basic Food Delivery System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │ Customer │────▶│  API Server  │────▶│  PostgreSQL  │        │
│  │   App    │     │              │     │              │        │
│  └──────────┘     └──────────────┘     └──────────────┘        │
│                          │                                      │
│                          │                                      │
│  ┌──────────┐            │                                      │
│  │  Driver  │◀───────────┘                                      │
│  │   App    │                                                   │
│  └──────────┘                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘`,
        problems: [
          'No dispatch optimization',
          'Manual driver assignment',
          'No real-time tracking',
          'No ETA prediction'
        ]
      },

      advancedImplementation: {
        title: 'Production Food Delivery Architecture',
        svgTemplate: 'doordashAdvanced',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Production DoorDash Architecture                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │  Customer   │    │  Restaurant │    │   Driver    │                      │
│  │    App      │    │    App      │    │    App      │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                  │                  │                              │
│         └──────────────────┼──────────────────┘                              │
│                            ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      API Gateway                                     │    │
│  └────────────────────────────┬────────────────────────────────────────┘    │
│                               │                                              │
│  ┌────────────────────────────┼────────────────────────────────────────┐    │
│  │                      SERVICE LAYER                                   │    │
│  │                                                                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │
│  │  │ Restaurant │  │   Order    │  │  Dispatch  │  │  Tracking  │    │    │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │    │    │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │    │
│  │        │               │               │               │            │    │
│  │  ┌─────┴───────────────┴───────────────┴───────────────┴─────┐     │    │
│  │  │                    MESSAGE BUS (Kafka)                     │     │    │
│  │  │  Topics: orders, driver_locations, dispatch_events         │     │    │
│  │  └─────┬───────────────┬───────────────┬───────────────┬─────┘     │    │
│  │        │               │               │               │            │    │
│  │        ▼               ▼               ▼               ▼            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │    ETA     │  │  Payment   │  │Notification│  │  Analytics │   │    │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  PostgreSQL  │  │ TimescaleDB  │  │    Redis     │               │   │
│  │  │   (Orders,   │  │  (Location   │  │   (Driver    │               │   │
│  │  │ Restaurants) │  │   History)   │  │   Status)    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      ML PLATFORM                                      │   │
│  │  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐     │   │
│  │  │  ETA Model     │    │ Demand Forecast│    │ Dispatch       │     │   │
│  │  │  (Prediction)  │    │    Model       │    │ Optimization   │     │   │
│  │  └────────────────┘    └────────────────┘    └────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Kafka for real-time event streaming',
          'TimescaleDB for location time-series data',
          'Redis for real-time driver status and availability',
          'ML-based dispatch optimization',
          'ETA prediction with continuous learning',
          'Microservices for independent scaling'
        ]
      },

      orderFlow: {
        title: 'Order Lifecycle',
        steps: [
          'Customer browses restaurants, selects items, places order',
          'Order Service validates and creates order (status: PLACED)',
          'Payment Service processes payment',
          'Order sent to Restaurant App (status: CONFIRMED)',
          'Restaurant confirms and starts preparing (status: PREPARING)',
          'Dispatch Service finds optimal driver match',
          'Driver accepts and heads to restaurant (status: ASSIGNED)',
          'Restaurant marks ready (status: READY)',
          'Driver picks up order (status: PICKED_UP)',
          'Driver delivers to customer (status: DELIVERING)',
          'Customer confirms receipt (status: DELIVERED)',
          'Rating prompts sent to customer and driver'
        ]
      },

      discussionPoints: [
        {
          topic: 'Restaurant Integration',
          points: [
            'Tablet app for order management',
            'POS integration for menu sync',
            'Printer integration for kitchen tickets',
            'Real-time menu availability updates',
            'Prep time estimation per item'
          ]
        },
        {
          topic: 'Driver Experience',
          points: [
            'Clear navigation and instructions',
            'Earnings transparency',
            'Order batching communication',
            'Support for issues (wrong address, closed restaurant)',
            'Safety features (share location, emergency button)'
          ]
        },
        {
          topic: 'Fraud Prevention',
          points: [
            'Verify delivery with photo/PIN',
            'Detect refund abuse patterns',
            'Driver fraud (false delivery claims)',
            'Restaurant fraud (inflated prep times)',
            'Promo code abuse detection'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Browse restaurants', 'Menu/ordering', 'Real-time tracking', 'Driver matching', 'Payments', 'Ratings'],
      components: ['Restaurant service', 'Order service', 'Dispatch service', 'Tracking service', 'Payment service', 'Rating service'],
      keyDecisions: [
        'Dispatch: Optimize for delivery time, driver utilization, batching',
        'Real-time tracking: WebSocket + frequent location updates',
        'ETA prediction: ML model with traffic, order prep time, driver location',
        'Kitchen display system integration for order status',
        'Surge pricing during peak demand'
      ],
      edgeCases: [
        { scenario: 'Restaurant marks order as ready but no drivers are available nearby', impact: 'Food sits and gets cold, customer receives poor quality meal and leaves bad review', mitigation: 'Pre-dispatch drivers based on predicted prep time, expand search radius dynamically, and offer priority pay to attract drivers' },
        { scenario: 'Driver app crashes mid-delivery and location updates stop', impact: 'Customer sees stale tracking, support cannot locate the order, and ETA becomes meaningless', mitigation: 'Detect heartbeat loss after 60 seconds, switch to SMS-based location polling, and auto-reassign if unresponsive for 5 minutes' },
        { scenario: 'Super Bowl Sunday causes 10x order spike in a metro area', impact: 'Dispatch queue backs up, ETAs blow past estimates, and driver supply is exhausted', mitigation: 'Activate surge pricing to balance demand, pre-position drivers in hot zones, and temporarily increase batch order size' },
        { scenario: 'Customer reports food never arrived but driver marked as delivered', impact: 'Dispute between customer and driver with no clear resolution and potential fraud', mitigation: 'Require delivery photo proof, use GPS geofence to confirm driver was at drop-off location, and ML fraud scoring on repeat claims' },
        { scenario: 'Restaurant goes offline mid-order without canceling pending orders', impact: 'Orders stuck in preparing state indefinitely, customers wait with no food coming', mitigation: 'Heartbeat monitoring on restaurant tablet, auto-cancel orders after timeout, and notify customer with alternatives' },
      ],
      tradeoffs: [
        { decision: 'Single-order dispatch vs batched multi-order dispatch', pros: 'Batching improves driver utilization and reduces cost per delivery', cons: 'Second order in a batch gets delayed, increasing that customer wait time', recommendation: 'Batch only when restaurants are within 0.5 miles and drop-offs are on the same route with under 5 minutes added delay' },
        { decision: 'Push-based driver assignment vs driver bidding on orders', pros: 'Push assignment is faster and ensures consistent ETAs; bidding lets drivers optimize their routes', cons: 'Push can assign suboptimal drivers; bidding adds latency and may leave less popular orders unserved', recommendation: 'Use push-based assignment with ML optimization, and let drivers decline with a cooldown penalty' },
        { decision: 'Real-time ETA vs padded conservative ETA', pros: 'Real-time ETA feels responsive and accurate; padded ETA reduces disappointment from late deliveries', cons: 'Real-time ETA causes frustration when it increases; padded ETA feels slow even when delivery is fast', recommendation: 'Show padded ETA initially and reveal faster actual progress, so the customer feels the delivery is ahead of schedule' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Customer ordering UI, driver delivery app, and restaurant management dashboard', components: ['Customer App', 'Driver App', 'Restaurant Tablet App', 'Real-time Map'] },
        { name: 'API Gateway Layer', purpose: 'Route requests from three client types with auth and rate limiting', components: ['Auth Service', 'Rate Limiter', 'WebSocket Server', 'API Router'] },
        { name: 'Order Orchestration Layer', purpose: 'Manage order lifecycle from placement through delivery completion', components: ['Order Service', 'Payment Service', 'Notification Service', 'ETA Predictor'] },
        { name: 'Dispatch Layer', purpose: 'Match orders to drivers using real-time location and optimization algorithms', components: ['Dispatch Engine', 'Geospatial Index', 'Driver Pool Manager', 'Route Optimizer'] },
        { name: 'Data Layer', purpose: 'Store orders, menus, driver locations, and delivery history', components: ['PostgreSQL (orders/users)', 'Redis (driver locations)', 'Kafka (event stream)', 'S3 (delivery photos)'] },
      ],
    },
    {
      id: 'twitter-trends',
      title: 'Twitter Trending Topics',
      subtitle: 'Real-time Analytics',
      icon: 'trendingUp',
      color: '#1da1f2',
      difficulty: 'Medium',
      description: 'Design a system to detect and display trending topics in real-time.',

      introduction: `Twitter's trending topics feature shows what's being talked about right now across the platform. Unlike simple frequency counting, trending detection requires identifying topics that are *rising* faster than their baseline - a topic with 1M tweets isn't trending if it normally gets 1M tweets.

The core challenge is processing hundreds of millions of tweets per day in real-time while distinguishing true viral content from spam campaigns and coordinated manipulation.`,

      functionalRequirements: [
        'Detect trending hashtags and keywords',
        'Show trends personalized by location',
        'Real-time updates (< 5 minute latency)',
        'Support trend categories (Politics, Sports, etc.)',
        'Show tweet volume and trend velocity',
        'Filter out spam and manipulation'
      ],

      nonFunctionalRequirements: [
        'Process 500M+ tweets per day (6K/sec)',
        'Track 100K+ unique hashtags per hour',
        'Update trends every 5 minutes',
        'Support 100+ geographic regions',
        '99.9% availability',
        'Memory-efficient counting (can\'t store all tweets)'
      ],

      dataModel: {
        description: 'Stream-based aggregates with time windows',
        schema: `trend_aggregates {
  topic: varchar(255)
  region: varchar(50)
  time_bucket: timestamp -- 5-minute windows
  count: bigint
  velocity: float -- tweets per second
  baseline: float -- historical average
  trend_score: float -- computed anomaly score
}

user_topic_counts {
  user_id: bigint
  topic: varchar(255)
  count: int -- for spam detection
  time_bucket: timestamp
}

trending_topics {
  region: varchar(50)
  rank: int
  topic: varchar(255)
  category: varchar(50)
  tweet_count: bigint
  trend_score: float
  started_trending: timestamp
  updated_at: timestamp
}`
      },

      apiDesign: {
        description: 'Simple read-heavy API backed by cache',
        endpoints: [
          { method: 'GET', path: '/api/trends', params: 'location, count, category', response: '{ trends: [{ topic, tweetCount, category, rank }] }' },
          { method: 'GET', path: '/api/trends/:topic', params: '-', response: '{ topic, history[], relatedTopics[], topTweets[] }' },
          { method: 'Internal', path: '/stream/tweets', params: '-', response: 'Kafka topic with tweet events' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we efficiently count hashtags at this scale?',
          answer: `**The Problem**:
- 6K tweets/second = millions of hashtags to count
- Can't store exact counts for every hashtag (memory explosion)
- Need approximate counts with bounded error

**Count-Min Sketch**:
\`\`\`
Structure:
- 2D array of counters [d rows × w columns]
- d independent hash functions

Insert(item):
  for i in 0..d:
    j = hash_i(item) % w
    counters[i][j] += 1

Query(item):
  return min(counters[i][hash_i(item) % w] for i in 0..d)
\`\`\`

**Properties**:
- Space: O(w × d) regardless of unique items
- Error: ε = e/w, probability δ = e^(-d)
- Typical: w=10K, d=7 → <0.1% error

**Windowed Counting**:
\`\`\`
┌─────────────────────────────────────────┐
│ Time Windows (sliding every 5 minutes) │
├─────────────────────────────────────────┤
│ [T-15, T-10] │ [T-10, T-5] │ [T-5, T]  │
│  CM Sketch   │  CM Sketch  │ CM Sketch │
└─────────────────────────────────────────┘

Total count = sum of window counts
Trend = compare recent window vs older windows
\`\`\`

**Memory Usage**:
- Single sketch: 10K × 7 × 4 bytes = 280KB
- 3 time windows: 840KB per region
- 100 regions: ~84MB total`
        },
        {
          question: 'How do we detect "trending" vs just "popular"?',
          answer: `**The Key Insight**:
- "Trending" = rising faster than expected
- A topic with 1M tweets isn't trending if it always gets 1M
- A topic with 10K tweets IS trending if it normally gets 100

**Anomaly Detection Algorithm**:
\`\`\`
For each topic in current window:
  current_rate = tweets_in_window / window_duration
  baseline = historical_average_for(topic, time_of_day, day_of_week)
  z_score = (current_rate - baseline) / std_dev

  if z_score > threshold:
    topic is trending
    trend_score = z_score × log(current_count)  # scale by volume
\`\`\`

**Time Decay**:
\`\`\`
decayed_score = raw_score × e^(-λt)

Where:
  λ = decay constant (0.1 = slow decay, 0.5 = fast)
  t = time since first trending

Effect: Topics that started trending recently rank higher
\`\`\`

**Velocity Tracking**:
\`\`\`json
{
  "topic": "#WorldCup",
  "current_rate": 5000,     // tweets/min now
  "rate_5min_ago": 2000,    // tweets/min 5 min ago
  "acceleration": 2.5,      // velocity multiplier
  "baseline": 100,          // normal tweets/min
  "z_score": 45.2           // very anomalous!
}
\`\`\`

**Preventing False Positives**:
- Minimum absolute count threshold (ignore if < 100 tweets)
- Minimum unique users (anti-bot)
- Blacklist certain evergreen topics`
        },
        {
          question: 'How do we filter spam and manipulation?',
          answer: `**Spam Patterns to Detect**:

1. **Bot Networks**:
   - Multiple accounts tweeting same hashtag simultaneously
   - Accounts created recently
   - Similar tweet text across accounts

2. **Coordinated Campaigns**:
   - Sudden spike from specific user segments
   - Tweets from same IP ranges
   - Similar posting patterns

**Multi-Layer Filtering**:
\`\`\`
Layer 1: Account Quality
  - Account age (< 30 days = suspicious)
  - Follower ratio
  - Tweet history diversity

Layer 2: Behavioral Signals
  - Tweets per minute per user (rate limit)
  - Duplicate text detection
  - Tweet timing patterns (bot-like regularity)

Layer 3: Network Analysis
  - Graph of users tweeting same topic
  - Cluster detection (coordinated groups)
  - Unusual geographic patterns
\`\`\`

**Weighted Counting**:
\`\`\`
Instead of: count += 1

Use: count += user_credibility_score

Where credibility considers:
  - Account age
  - Follower count (log scaled)
  - Past spam history
  - Verification status
\`\`\`

**Real-time vs Batch**:
- Real-time: Basic rate limiting, known bot lists
- Batch (hourly): Network analysis, retroactive cleanup`
        }
      ],

      basicImplementation: {
        title: 'Single Region Architecture',
        description: 'Handle trends for one geographic area',
        svgTemplate: 'twitterTrending',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                    Tweet Ingestion                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Tweets → [Kafka] → [Flink Stream Processor]               │
│              │              │                               │
│              │              ├─ Extract hashtags             │
│              │              ├─ Filter spam                  │
│              │              └─ Update Count-Min Sketch      │
│              │                       │                      │
│              │                       ▼                      │
│              │              ┌─────────────────┐             │
│              │              │ Windowed Counts │             │
│              │              │ (Redis Sorted   │             │
│              │              │  Sets by score) │             │
│              │              └─────────────────┘             │
│              │                       │                      │
│              │                       ▼                      │
│              │              ┌─────────────────┐             │
│              │              │ Trend Ranker    │             │
│              │              │ (every 5 min)   │             │
│              │              └─────────────────┘             │
│              │                       │                      │
│              │                       ▼                      │
│              │              ┌─────────────────┐             │
│              │              │ Trends Cache    │             │
│              │              │ (CDN backed)    │             │
│              │              └─────────────────┘             │
│                                      │                      │
│   Client ←──────── API Gateway ←─────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single region only - no geo trends',
          'Flink as SPOF - lose data if it fails',
          'No historical baseline yet',
          'Spam filtering is basic'
        ]
      },

      advancedImplementation: {
        title: 'Global Multi-Region Architecture',
        svgTemplate: 'twitterTrendsAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Global Trends Platform                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐     ┌─────────────────────┐                       │
│   │    Tweet Stream     │     │   User Metadata     │                       │
│   │ (Geo-partitioned    │     │ (credibility,       │                       │
│   │  by region)         │     │  location, etc.)    │                       │
│   └──────────┬──────────┘     └──────────┬──────────┘                       │
│              │                           │                                  │
│              ▼                           ▼                                  │
│   ┌────────────────────────────────────────────────────┐                    │
│   │              Apache Flink Cluster                  │                    │
│   │  ┌──────────────────────────────────────────────┐  │                    │
│   │  │ Per-Region Stream Jobs (100+ parallel)      │  │                    │
│   │  │                                              │  │                    │
│   │  │  Tweet → Spam Filter → Hashtag Extract →    │  │                    │
│   │  │         Count-Min Sketch Update              │  │                    │
│   │  └──────────────────────────────────────────────┘  │                    │
│   │  ┌──────────────────────────────────────────────┐  │                    │
│   │  │ Aggregation Job (windowed every 5 min)      │  │                    │
│   │  │                                              │  │                    │
│   │  │  Per-region counts → Anomaly detection →    │  │                    │
│   │  │         Trend scoring → Ranking              │  │                    │
│   │  └──────────────────────────────────────────────┘  │                    │
│   └────────────────────────────────────────────────────┘                    │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼               ▼               ▼                              │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│   │ Regional Trends │ │ National Trends │ │  Global Trends  │               │
│   │ (100+ regions)  │ │ (per country)   │ │ (worldwide)     │               │
│   │    Redis        │ │    Redis        │ │    Redis        │               │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│              │               │               │                              │
│              └───────────────┴───────────────┘                              │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                    CDN Edge Cache                   │                   │
│   │    (Trends cached at edge, TTL = 1 minute)         │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                              │                                              │
│   ┌───────────────┐   ┌──────┴──────┐   ┌───────────────┐                   │
│   │  Mobile App   │   │  Web Client │   │ Third-party   │                   │
│   │   (cached)    │   │  (cached)   │   │ API consumers │                   │
│   └───────────────┘   └─────────────┘   └───────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │              Batch Processing (Spark)               │                   │
│   │  - Historical baseline computation                  │                   │
│   │  - Spam network analysis                            │                   │
│   │  - Model training for anomaly detection             │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Geo-partitioned streams for regional trends',
          'Hierarchical aggregation: city → region → country → global',
          'CDN caching at edge (trends change slowly)',
          'Batch processing for baselines and ML models',
          'Flink checkpointing for fault tolerance'
        ]
      },

      trendFlow: {
        title: 'Trend Detection Flow',
        steps: `
┌──────────────────────────────────────────────────────────────────┐
│                     Trend Detection Pipeline                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. INGEST                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tweet arrives with: text, hashtags, user_id, location    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  2. FILTER                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Spam check:                                               │   │
│  │ - User credibility score                                  │   │
│  │ - Rate limit check (tweets/min for user+hashtag)          │   │
│  │ - Known bot list check                                    │   │
│  │ Result: weight = 0.0 (spam) to 1.0 (trusted)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  3. COUNT                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ For each hashtag in tweet:                                │   │
│  │   count_min_sketch[region].add(hashtag, weight)           │   │
│  │   unique_users[hashtag].add(user_id)  # HyperLogLog       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  4. AGGREGATE (every 5 minutes)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ For each hashtag with count > threshold:                  │   │
│  │   current_rate = count / 5_minutes                        │   │
│  │   baseline = get_historical_baseline(hashtag, time)       │   │
│  │   z_score = (current_rate - baseline) / std_dev           │   │
│  │   unique_users = hyperloglog.count()                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  5. RANK                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ trend_score = z_score × log(count) × user_diversity      │   │
│  │ Apply time decay: score × e^(-λt)                         │   │
│  │ Sort by trend_score, take top 10 per region               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  6. PUBLISH                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Write top trends to Redis (sorted set)                    │   │
│  │ Invalidate CDN cache                                      │   │
│  │ Push to connected clients via WebSocket                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘`,
      },

      discussionPoints: [
        {
          topic: 'Handling Breaking News',
          points: [
            'Breaking news creates sudden massive spikes',
            'Need faster detection (< 1 minute) for major events',
            'Can trigger "emergency mode" with shorter windows',
            'Human curation layer for sensitive topics'
          ]
        },
        {
          topic: 'Regional vs Global Trends',
          points: [
            'Same topic can trend in one region but not another',
            'Normalize by regional population/activity',
            'Consider language segmentation',
            'Time zone affects baselines'
          ]
        },
        {
          topic: 'Trend Categories',
          points: [
            'Classify trends into Sports, Politics, Entertainment, etc.',
            'Use NLP to identify topic category',
            'Helps personalization (show more sports if user likes sports)',
            'Enables filtering (hide political trends)'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Detect trending hashtags/topics', 'Real-time updates', 'Location-based trends', 'Time-decay ranking', 'Spam filtering'],
      components: ['Stream processor (Kafka/Flink)', 'Count-min sketch', 'Ranking service', 'Cache', 'API servers'],
      keyDecisions: [
        'Stream processing: Apache Kafka + Flink for real-time counting',
        'Count-min sketch: Probabilistic counting with low memory',
        'Time-decay: Exponential decay to favor recent activity',
        'Anomaly detection: Compare current rate vs baseline',
        'Spam filtering: Rate limit per user, detect coordinated campaigns'
      ],
      edgeCases: [
        { scenario: 'Coordinated bot network artificially inflates a hashtag to manipulate trends', impact: 'Fake topics displace genuine trends and erode user trust in the feature', mitigation: 'Detect coordinated behavior via account age clustering, shared IP ranges, and burst velocity anomaly detection' },
        { scenario: 'Breaking news event generates millions of tweets per minute with varied hashtags', impact: 'Related but differently-spelled hashtags fragment what should be one trend', mitigation: 'Use NLP-based topic clustering to merge semantically equivalent hashtags into a single trend entry' },
        { scenario: 'Count-min sketch hash collisions cause two unrelated topics to share counters', impact: 'A niche topic appears falsely trending due to inflated counts from a popular unrelated topic', mitigation: 'Use multiple independent hash functions and take the minimum count; increase sketch width during high-traffic periods' },
        { scenario: 'Regional trends spike during a local holiday while global trends dominate', impact: 'Local users never see locally relevant trends because global topics overshadow them', mitigation: 'Maintain separate trend lists per geohash region and blend local and global trends with configurable weighting' },
        { scenario: 'A previously trending topic resurges hours later after new developments', impact: 'Time-decay function suppresses it even though genuine renewed interest exists', mitigation: 'Track rate-of-change relative to recent baseline rather than absolute time, so resurgences are detected as new spikes' },
      ],
      tradeoffs: [
        { decision: 'Count-min sketch vs exact counting with hash maps', pros: 'Count-min sketch uses constant memory regardless of cardinality; exact counting gives precise results', cons: 'Count-min sketch has over-counting errors from hash collisions; exact counting needs unbounded memory', recommendation: 'Use count-min sketch for real-time counting with periodic exact count reconciliation for top candidates' },
        { decision: 'Sliding window vs tumbling window for trend detection', pros: 'Sliding windows detect trends immediately as they form; tumbling windows are simpler and cheaper to compute', cons: 'Sliding windows require more memory and computation; tumbling windows miss trends that span window boundaries', recommendation: 'Use hopping windows with 1-minute hops and 5-minute window size as a practical compromise' },
        { decision: 'Global single trend list vs per-region trend computation', pros: 'Global is simpler to implement and maintain; per-region captures local relevance', cons: 'Global misses local events; per-region multiplies compute and storage costs by number of regions', recommendation: 'Compute trends per-region on separate Flink jobs and merge into a global list with regional boost factors' },
      ],
      layeredDesign: [
        { name: 'Ingestion Layer', purpose: 'Capture tweet stream in real-time and extract hashtags and keywords for processing', components: ['Kafka Tweet Stream', 'Hashtag Extractor', 'Spam Pre-filter'] },
        { name: 'Stream Processing Layer', purpose: 'Count topic frequencies in real-time using probabilistic data structures', components: ['Apache Flink Jobs', 'Count-Min Sketch', 'Time-Decay Calculator'] },
        { name: 'Ranking Layer', purpose: 'Score and rank topics by velocity of growth relative to their baseline', components: ['Anomaly Detector', 'Trend Scorer', 'Topic Deduplicator'] },
        { name: 'Serving Layer', purpose: 'Serve personalized trend lists to users with low latency', components: ['Trend Cache (Redis)', 'API Servers', 'Geo-Router'] },
      ],
    },
    {
      id: 'pastebin',
      title: 'Pastebin',
      subtitle: 'Text Sharing',
      icon: 'clipboard',
      color: '#02a4d3',
      difficulty: 'Easy',
      description: 'Design a simple text/code sharing service with expiration.',

      introduction: `Pastebin is a simple service for sharing text snippets or code with generated short URLs. Despite its simplicity, it demonstrates key system design concepts: unique ID generation, object storage, caching, and TTL-based cleanup.

This is often asked as a warm-up or early system design question. The key is showing you understand the fundamentals while identifying non-obvious challenges like URL collision handling and abuse prevention.`,

      functionalRequirements: [
        'Create paste with text content',
        'Generate unique short URL',
        'Retrieve paste by URL',
        'Set optional expiration time',
        'Support private pastes (password protected)',
        'Syntax highlighting for code',
        'View count analytics'
      ],

      nonFunctionalRequirements: [
        'Handle 100K new pastes per day',
        'Support 1M reads per day (10:1 read ratio)',
        'Maximum paste size: 10MB',
        'URL length: 7-8 characters',
        'Low latency reads (< 100ms)',
        '99.9% availability',
        'Content stored durably (no data loss)'
      ],

      dataModel: {
        description: 'Simple metadata with content in object storage',
        schema: `pastes {
  short_key: varchar(8) PK
  content_hash: varchar(64) -- SHA256 for dedup
  content_url: varchar(500) -- S3 URL
  title: varchar(200) nullable
  syntax: varchar(50) -- 'python', 'javascript', etc.
  password_hash: varchar(256) nullable -- bcrypt
  expires_at: timestamp nullable
  created_at: timestamp
  view_count: bigint default 0
  creator_ip: inet -- for abuse tracking
  creator_user_id: uuid nullable
}

-- For analytics
paste_views {
  paste_key: varchar(8) FK
  viewed_at: timestamp
  viewer_ip: inet
  -- Aggregate hourly for dashboard
}`
      },

      apiDesign: {
        description: 'Simple REST API for paste operations',
        endpoints: [
          { method: 'POST', path: '/api/paste', params: '{ content, title?, syntax?, expiresIn?, password? }', response: '{ key, url, expiresAt }' },
          { method: 'GET', path: '/api/paste/:key', params: 'password (header)', response: '{ content, syntax, createdAt, expiresAt }' },
          { method: 'GET', path: '/api/paste/:key/raw', params: '-', response: 'Plain text content' },
          { method: 'DELETE', path: '/api/paste/:key', params: '-', response: '{ deleted: true }' },
          { method: 'GET', path: '/api/paste/:key/stats', params: '-', response: '{ viewCount, createdAt }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we generate unique short URLs?',
          answer: `**Options for Key Generation**:

**Option 1: Base62 Encoding of Counter**
\`\`\`
counter = auto_increment_id  // 1, 2, 3...
key = base62_encode(counter) // "1", "2"... "a", "b"... "10"...

Pros: Simple, no collisions, sequential
Cons: Predictable (can enumerate), single point of failure
\`\`\`

**Option 2: Random Generation + Collision Check**
\`\`\`
loop:
  key = random_base62(7)  // 62^7 = 3.5 trillion combinations
  if not exists_in_db(key):
    return key

Pros: Unpredictable, distributed friendly
Cons: Need collision handling, DB lookup on write
\`\`\`

**Option 3: Pre-generated Key Pool (Recommended)**
\`\`\`
┌─────────────────────────────────────────────┐
│            Key Generation Service           │
├─────────────────────────────────────────────┤
│                                             │
│   Background job generates keys in batches: │
│   ┌──────────────────────────────────────┐  │
│   │ unused_keys table:                   │  │
│   │   key: varchar(8) PK                 │  │
│   │   created_at: timestamp              │  │
│   │   claimed: boolean default false     │  │
│   └──────────────────────────────────────┘  │
│                                             │
│   API server claims key:                    │
│   UPDATE unused_keys                        │
│   SET claimed = true                        │
│   WHERE claimed = false                     │
│   LIMIT 1                                   │
│   RETURNING key                             │
│                                             │
└─────────────────────────────────────────────┘

Pros: No collision at write time, fast
Cons: Need background job, key inventory management
\`\`\`

**URL Length Analysis**:
\`\`\`
7 characters, Base62 = 62^7 = 3.52 trillion
100K pastes/day = 36.5M/year
Will last: 96,000+ years (more than enough!)
\`\`\``
        },
        {
          question: 'Where do we store the paste content?',
          answer: `**Option 1: In Database (Small Pastes)**
\`\`\`
For pastes < 1KB:
  Store directly in pastes table as TEXT column
  Pros: Single read, simple
  Cons: DB bloat, max row size limits
\`\`\`

**Option 2: Object Storage (Recommended)**
\`\`\`
┌────────────────────────────────────────────┐
│                Write Path                  │
├────────────────────────────────────────────┤
│                                            │
│   1. Upload content to S3:                 │
│      bucket: pastebin-content              │
│      key: {hash-prefix}/{short_key}        │
│                                            │
│   2. Store metadata in DB:                 │
│      short_key, content_url, metadata      │
│                                            │
│   S3 features we use:                      │
│   - Object lifecycle rules (auto-delete)   │
│   - Cross-region replication               │
│   - Pre-signed URLs for direct access      │
│                                            │
└────────────────────────────────────────────┘
\`\`\`

**Content Deduplication**:
\`\`\`
// Before upload
content_hash = SHA256(content)

// Check if already exists
existing = db.find(content_hash=content_hash)
if existing:
  // Just create new key pointing to same content
  return create_metadata(existing.content_url)
else:
  // Upload new content
  upload_to_s3(content)
\`\`\`

**CDN for Reads**:
\`\`\`
Client → CDN → Origin (S3/API)

Cache-Control: public, max-age=31536000
(immutable content, cache forever)
\`\`\``
        },
        {
          question: 'How do we handle paste expiration?',
          answer: `**TTL Options**:

**Option 1: Background Cleanup Job**
\`\`\`
Every hour:
  DELETE FROM pastes
  WHERE expires_at < NOW()
  LIMIT 10000  -- batch to avoid long locks

  DELETE FROM S3
  WHERE key in (expired_keys)

Pros: Simple
Cons: Expired content accessible until job runs
\`\`\`

**Option 2: S3 Lifecycle Rules (Better)**
\`\`\`
S3 Lifecycle Policy:
  Rule: Delete objects where tag:expires_at < now

When creating paste:
  s3.putObject({
    Key: short_key,
    Body: content,
    Tagging: \`expires_at=\${expiresAt.toISOString()}\`
  })

Pros: S3 handles deletion automatically
Cons: Need to sync DB metadata cleanup
\`\`\`

**Option 3: Lazy Deletion (Most Common)**
\`\`\`
On read:
  paste = db.find(key)
  if paste.expires_at < now:
    db.delete(key)
    s3.delete(key)
    return 404

  return paste

Pros: No background job needed
Cons: Storage not immediately reclaimed
\`\`\`

**Recommended: Lazy + Background**
- Lazy deletion for immediate 404 on expired
- Background job for storage cleanup (cost)`
        }
      ],

      basicImplementation: {
        title: 'Simple Architecture',
        description: 'Single server with direct S3 access',
        svgTemplate: 'pastebin',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                    Pastebin Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Client ──────────────────────────────────────────────────►│
│      │                                                      │
│      ▼                                                      │
│   ┌─────────────────┐                                       │
│   │   API Server    │                                       │
│   │   (Node.js)     │                                       │
│   └────────┬────────┘                                       │
│            │                                                │
│      ┌─────┴─────┐                                          │
│      ▼           ▼                                          │
│   ┌──────┐   ┌──────┐                                       │
│   │ DB   │   │ S3   │                                       │
│   │(meta)│   │(data)│                                       │
│   └──────┘   └──────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Write: API → Generate key → Upload S3 → Save metadata
Read: API → Lookup metadata → Redirect to S3 (or proxy)`,
        problems: [
          'Single server bottleneck',
          'No caching - every read hits DB',
          'No CDN for global latency',
          'No rate limiting for abuse prevention'
        ]
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'pastebinAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                      Production Pastebin                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│   │   Client    │────▶│     CDN     │────▶│   Origin    │               │
│   │             │     │ (CloudFront)│     │ (if miss)   │               │
│   └─────────────┘     └─────────────┘     └──────┬──────┘               │
│                                                  │                      │
│          For writes:                             ▼                      │
│          ┌───────────────────────────────────────────────────┐          │
│          │                Load Balancer                      │          │
│          └───────────────────────┬───────────────────────────┘          │
│                    ┌─────────────┼─────────────┐                        │
│                    ▼             ▼             ▼                        │
│          ┌──────────────┐┌──────────────┐┌──────────────┐               │
│          │  API Server  ││  API Server  ││  API Server  │               │
│          └──────────────┘└──────────────┘└──────────────┘               │
│                    │             │             │                        │
│                    └─────────────┼─────────────┘                        │
│                                  ▼                                      │
│                    ┌─────────────────────────┐                          │
│                    │       Redis Cache       │                          │
│                    │  (hot paste metadata)   │                          │
│                    └─────────────────────────┘                          │
│                                  │                                      │
│                    ┌─────────────┼─────────────┐                        │
│                    ▼             ▼             ▼                        │
│          ┌──────────────┐┌──────────────┐┌──────────────┐               │
│          │  PostgreSQL  ││ PostgreSQL   ││      S3      │               │
│          │   Primary    ││  Replica     ││  (content)   │               │
│          └──────────────┘└──────────────┘└──────────────┘               │
│                                                                         │
│          ┌────────────────────────────────────────────────┐             │
│          │              Background Workers                │             │
│          │  - Key generation (pre-populate pool)          │             │
│          │  - Expiration cleanup                          │             │
│          │  - Analytics aggregation                       │             │
│          └────────────────────────────────────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'CDN caches paste content globally',
          'Pre-signed S3 URLs for direct download (bypass API)',
          'Redis caches hot paste metadata',
          'Read replicas for DB scaling',
          'Background workers for cleanup and key generation'
        ]
      },

      discussionPoints: [
        {
          topic: 'Abuse Prevention',
          points: [
            'Rate limit by IP: max 10 pastes/minute',
            'CAPTCHA after threshold exceeded',
            'Content scanning for malware/phishing links',
            'Report mechanism with manual review'
          ]
        },
        {
          topic: 'Cost Optimization',
          points: [
            'S3 Intelligent Tiering for old pastes',
            'Compression before storage (gzip)',
            'Content deduplication via hashing',
            'Delete orphaned S3 objects'
          ]
        },
        {
          topic: 'Privacy & Legal',
          points: [
            'DMCA takedown process needed',
            'Encrypted storage option for sensitive data',
            'GDPR: right to deletion',
            'Log retention policies'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Create pastes', 'View pastes', 'Expiration', 'Syntax highlighting', 'Private pastes', 'Analytics'],
      components: ['API servers', 'Object storage (S3)', 'Metadata DB', 'Cache', 'CDN'],
      keyDecisions: [
        'Generate unique keys: Base62 encoding of auto-increment or random',
        'Store content in object storage (S3), metadata in DB',
        'TTL-based expiration with background cleanup job',
        'Rate limiting to prevent abuse',
        'Private pastes: Add password/auth requirement'
      ],
      edgeCases: [
        { scenario: 'User pastes a 100MB file that exceeds expected size limits', impact: 'Object storage costs spike, page load times become unacceptable, and other users experience degraded performance', mitigation: 'Enforce a hard size limit (10MB), reject oversized uploads at the API gateway, and return a clear error message' },
        { scenario: 'Paste contains malware, phishing links, or illegal content', impact: 'Platform becomes a vector for distributing harmful content and faces legal liability', mitigation: 'Scan paste content asynchronously with malware and URL reputation checks, flag suspicious pastes, and add a content warning interstitial' },
        { scenario: 'Viral paste gets millions of views in minutes', impact: 'Origin storage is overwhelmed and paste becomes unavailable at peak demand', mitigation: 'Cache popular pastes at CDN edge nodes with automatic cache warming when view count exceeds threshold' },
        { scenario: 'Expired paste URL is still indexed by search engines and bookmarked by users', impact: 'Users hit dead links and get confusing 404 errors with no context', mitigation: 'Return a friendly expiration page with metadata about when the paste expired and suggest creating a new one' },
      ],
      tradeoffs: [
        { decision: 'Object storage (S3) vs database for paste content', pros: 'S3 is cheaper for large blobs and scales infinitely; DB keeps everything in one system', cons: 'S3 adds a network hop and complexity; DB row size limits constrain paste size', recommendation: 'Store content in S3 with metadata in a relational DB for the best balance of cost and query flexibility' },
        { decision: 'Base62 random key vs auto-increment ID for paste URLs', pros: 'Random keys are non-guessable and harder to enumerate; auto-increment is simpler and collision-free', cons: 'Random keys need collision checking; auto-increment exposes paste creation order and volume', recommendation: 'Use Base62 encoding of a globally unique counter (Snowflake-style) for both uniqueness and non-guessability' },
        { decision: 'Eager expiration cleanup vs lazy deletion', pros: 'Eager cleanup keeps storage costs low; lazy deletion is simpler and avoids background job complexity', cons: 'Eager cleanup wastes compute scanning for expired pastes; lazy deletion leaves stale data consuming storage', recommendation: 'Use lazy deletion with TTL on cache entries, plus a nightly background job to purge expired content from S3' },
      ],
      layeredDesign: [
        { name: 'API Layer', purpose: 'Handle paste creation, retrieval, and deletion with rate limiting and auth', components: ['REST API', 'Rate Limiter', 'Auth Middleware'] },
        { name: 'Application Layer', purpose: 'Generate unique keys, validate content, and manage paste lifecycle', components: ['Key Generator', 'Content Validator', 'Expiration Manager'] },
        { name: 'Cache Layer', purpose: 'Serve frequently accessed pastes with sub-millisecond latency', components: ['Redis Cache', 'CDN Edge Cache'] },
        { name: 'Storage Layer', purpose: 'Persist paste content and metadata durably', components: ['Object Storage (S3)', 'Metadata DB (PostgreSQL)', 'Cleanup Job'] },
      ],
    },
    {
      id: 'web-crawler',
      title: 'Web Crawler',
      subtitle: 'Distributed Crawling',
      icon: 'globe',
      color: '#4285f4',
      difficulty: 'Hard',
      description: 'Design a distributed web crawler for search engine indexing.',

      introduction: `A web crawler (spider/bot) systematically browses the web to download pages for search engine indexing. Google crawls billions of pages to keep its search index fresh.

Key challenges include crawling at scale (billions of pages), being polite to websites (rate limiting per domain), detecting duplicate content, and prioritizing which pages to crawl first.`,

      functionalRequirements: [
        'Crawl billions of web pages',
        'Extract and follow links',
        'Respect robots.txt rules',
        'Store page content for indexing',
        'Detect and skip duplicate pages',
        'Re-crawl pages based on change frequency',
        'Handle different content types',
        'Support incremental crawling'
      ],

      nonFunctionalRequirements: [
        'Crawl 1 billion pages per day',
        'Distributed across 10,000+ workers',
        'Polite: Max 1 request/second per domain',
        'Handle malformed HTML gracefully',
        'Resume from failures (checkpointing)',
        'Minimize duplicate fetching'
      ],

      dataModel: {
        description: 'URLs, crawl state, and content storage',
        schema: `urls {
  urlHash: varchar(64) PK
  url: text
  domain: varchar(255)
  priority: float
  lastCrawled: timestamp nullable
  nextCrawl: timestamp
  crawlStatus: enum(PENDING, FETCHING, DONE, FAILED)
  contentHash: varchar(64) nullable
}

domains {
  domain: varchar(255) PK
  robotsTxt: text
  crawlDelay: int
  lastFetch: timestamp
}

content {
  contentHash: varchar(64) PK
  url: text
  fetchedAt: timestamp
  html: text compressed
  links: text[]
}`
      },

      keyQuestions: [
        {
          question: 'How does the URL Frontier work?',
          answer: `Two-level queue structure:

Front queues (by priority):
- High: Important pages (high PageRank)
- Medium: Regular pages
- Low: New discoveries

Back queues (by domain):
- One queue per domain
- Enforces rate limiting
- Only pop if enough time passed

Selection: Pick from front queue → route to back queue by domain hash → only fetch if nextFetch time reached.`
        },
        {
          question: 'How do we detect duplicates?',
          answer: `Multiple strategies:

1. URL Normalization: Remove trailing slashes, lowercase, sort params
2. Content Hash: SHA-256 for exact duplicates
3. Simhash: Fingerprint for near-duplicates (~3 bit difference threshold)

Bloom filter for fast "definitely not seen" checks before expensive hash lookups.`
        }
      ],

      basicImplementation: {
        title: 'Basic Architecture',
        description: 'Single-threaded crawler',
        svgTemplate: 'webCrawler',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────┐
│                         WEB CRAWLER BASIC                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Seed URLs → Queue → Fetcher → Parser → Link Extract → Back to Queue  │
│                         │                                               │
│                         ▼                                               │
│                    Storage (files)                                      │
│                                                                         │
│  PROBLEMS: Single-threaded, no politeness, no duplicate detection      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘`,
        problems: ['Single-threaded: Max 100 pages/min', 'No politeness', 'No duplicate detection']
      },

      advancedImplementation: {
        title: 'Production Architecture',
        svgTemplate: 'webCrawlerAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WEB CRAWLER PRODUCTION                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  URL FRONTIER                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Front Queues (priority)  ────▶  Back Queues (per domain)          │        │
│  │  [High] [Med] [Low]              [example.com] [wiki.org] ...      │        │
│  │                                  Rate limited per domain            │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                      │                                           │
│  DISTRIBUTED FETCHERS                ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  [Fetcher 1] [Fetcher 2] ... [Fetcher 10,000]                      │        │
│  │  Partitioned by domain hash                                         │        │
│  └────────────────────────────────┬────────────────────────────────────┘        │
│                                   │                                              │
│  CONTENT PIPELINE                 ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Parser ──▶ Duplicate Detector ──▶ Link Extractor ──▶ Storage      │        │
│  │              (Simhash + Bloom)      (Normalize URLs)                │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'URL Frontier: Priority + per-domain politeness',
          'Distributed fetchers partitioned by domain',
          'Simhash for near-duplicate detection',
          'robots.txt cached per domain',
          'Checkpointing for fault tolerance'
        ]
      },

      discussionPoints: [
        {
          topic: 'Crawl Traps',
          points: ['Calendar traps (infinite dates)', 'Session ID traps', 'Max depth/pages per domain limits']
        },
        {
          topic: 'Scheduling',
          points: ['News: hourly', 'Static: weekly', 'Adaptive based on change rate']
        }
      ],

      requirements: ['Crawl billions of pages', 'Respect robots.txt', 'Politeness (rate limiting per domain)', 'Duplicate detection', 'Link extraction', 'Scheduling'],
      components: ['URL frontier', 'Fetcher workers', 'Content parser', 'URL filter', 'Duplicate detector', 'Storage'],
      keyDecisions: [
        'URL Frontier: Priority queue with politeness constraints per domain',
        'Distributed fetching: Partition by domain hash',
        'Duplicate detection: Simhash or MinHash for near-duplicate content',
        'robots.txt: Cache and respect crawl-delay directives',
        'Checkpointing: Resume crawl from last known state'
      ],
      edgeCases: [
        { scenario: 'Spider trap website generates infinite URLs through dynamic query parameters or calendars', impact: 'Crawler gets stuck in an infinite loop, wasting resources and never progressing to other domains', mitigation: 'Set a max URL depth and max pages per domain limit, detect URL pattern repetition, and blacklist trap domains' },
        { scenario: 'Website serves different content to crawlers than to real users (cloaking)', impact: 'Search index contains misleading content that does not match what users actually see', mitigation: 'Periodically re-crawl with browser-like user agents, compare content hashes between bot and browser renders' },
        { scenario: 'DNS resolution fails or times out for a large batch of queued URLs', impact: 'Worker threads block on DNS, throughput drops dramatically, and crawl frontier backs up', mitigation: 'Use async DNS resolution with local caching, set aggressive DNS timeouts, and skip unresolvable domains with exponential backoff retry' },
        { scenario: 'Website changes robots.txt to disallow crawling after pages are already indexed', impact: 'Previously crawled content should be removed but stale index entries persist', mitigation: 'Re-check robots.txt before each crawl cycle, purge index entries for newly disallowed paths within 24 hours' },
        { scenario: 'Near-duplicate pages with minor template differences across millions of URLs', impact: 'Index bloats with redundant content, wasting storage and degrading search quality', mitigation: 'Use SimHash fingerprinting to detect near-duplicates and keep only the canonical version in the index' },
      ],
      tradeoffs: [
        { decision: 'Breadth-first vs depth-first crawl strategy', pros: 'BFS discovers more domains quickly and finds important pages first; DFS thoroughly indexes one site', cons: 'BFS keeps many connections open and may miss deep pages; DFS can get stuck on one large site', recommendation: 'Use BFS with priority scoring that favors high-PageRank domains and important deep pages' },
        { decision: 'Politeness delay per domain vs aggressive parallel crawling', pros: 'Politeness respects server capacity and avoids IP bans; aggressive crawling maximizes throughput', cons: 'Politeness dramatically slows crawl speed; aggressive crawling may get blocked or crash small servers', recommendation: 'Respect robots.txt crawl-delay, default to 1-second delay per domain, and parallelize across many domains simultaneously' },
        { decision: 'Store raw HTML vs parsed/extracted content only', pros: 'Raw HTML allows re-processing without re-crawling; parsed content uses far less storage', cons: 'Raw HTML storage costs are massive at web scale; parsed content cannot be reprocessed with new extractors', recommendation: 'Store raw HTML in compressed blob storage with a TTL, and keep parsed content in the search index for serving' },
      ],
      layeredDesign: [
        { name: 'URL Frontier Layer', purpose: 'Manage the queue of URLs to crawl with priority and politeness scheduling', components: ['Priority Queue', 'Politeness Enforcer', 'Domain Partitioner', 'URL Deduplicator'] },
        { name: 'Fetcher Layer', purpose: 'Download web pages in parallel while respecting rate limits and handling failures', components: ['HTTP Fetcher Workers', 'DNS Resolver Cache', 'robots.txt Cache', 'Retry Handler'] },
        { name: 'Processing Layer', purpose: 'Parse downloaded pages, extract links, and detect duplicates', components: ['HTML Parser', 'Link Extractor', 'SimHash Deduplicator', 'Content Extractor'] },
        { name: 'Storage Layer', purpose: 'Persist crawled content, URL metadata, and crawl state for checkpointing', components: ['Blob Storage (raw HTML)', 'URL Metadata DB', 'Crawl State Checkpoint Store', 'Search Index Writer'] },
      ],
    },
    {
      id: 'facebook-newsfeed',
      title: 'Facebook News Feed',
      subtitle: 'Social Media Feed',
      icon: 'home',
      color: '#1877f2',
      difficulty: 'Hard',
      description: 'Design a personalized news feed showing posts from friends and followed pages.',

      introduction: `Facebook's News Feed is one of the most complex personalization systems ever built. With 2+ billion daily active users, each with hundreds of friends and followed pages, the system must select and rank the most relevant content from thousands of candidates - in milliseconds.

The fundamental challenge is fan-out: when a celebrity with 10M followers posts, do you write to 10M feeds (expensive write) or have each user fetch at read time (expensive read)? The answer is neither - you need a hybrid approach.`,

      functionalRequirements: [
        'Show personalized feed of posts from friends and pages',
        'Support multiple content types (text, photo, video, link)',
        'Real-time updates when friends post',
        'Stories at top of feed (24-hour ephemeral)',
        'Infinite scroll with pagination',
        'Like, comment, share interactions',
        'Privacy controls (who can see)'
      ],

      nonFunctionalRequirements: [
        'Serve 2B+ daily active users',
        'Handle 1B+ posts per day',
        'Feed generation < 200ms latency',
        'Real-time: new posts appear within seconds',
        'Rank 1000+ candidate posts per feed request',
        '99.99% availability',
        'Support users with 5000 friends'
      ],

      dataModel: {
        description: 'Posts, social graph, and pre-computed feeds',
        schema: `posts {
  id: bigint PK
  user_id: bigint FK
  content: text
  media_ids: bigint[]
  audience: enum(PUBLIC, FRIENDS, CUSTOM)
  created_at: timestamp
  like_count: int
  comment_count: int
  share_count: int
}

friendships {
  user_id: bigint
  friend_id: bigint
  closeness_score: float -- ML-computed
  created_at: timestamp
  PK (user_id, friend_id)
}

user_feeds {
  user_id: bigint PK
  feed_items: jsonb[] -- [{post_id, score, timestamp}]
  last_updated: timestamp
  -- Denormalized for fast reads
}

feed_cache {
  user_id: bigint
  feed_json: bytes -- pre-rendered top 50 posts
  ttl: 5 minutes
}`
      },

      apiDesign: {
        description: 'Feed retrieval with cursor-based pagination',
        endpoints: [
          { method: 'GET', path: '/api/feed', params: 'cursor, limit', response: '{ posts[], nextCursor, hasMore }' },
          { method: 'POST', path: '/api/posts', params: '{ content, media[], audience }', response: '{ postId }' },
          { method: 'POST', path: '/api/posts/:id/like', params: '-', response: '{ liked: true }' },
          { method: 'GET', path: '/api/feed/updates', params: 'since_time', response: '{ newPostCount }' },
          { method: 'WS', path: '/ws/feed', params: '-', response: 'REALTIME_POST, LIKE_UPDATE events' }
        ]
      },

      keyQuestions: [
        {
          question: 'Push vs Pull: How do we handle fan-out?',
          answer: `**The Celebrity Problem**:
- User with 10M followers posts
- Push model: Write to 10M feeds (expensive, slow)
- Pull model: Each of 10M users queries at read time (hot spot)

**Solution: Hybrid Fan-out**
\`\`\`
                    User Posts
                        │
                        ▼
              ┌─────────────────┐
              │ Check followers │
              └────────┬────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
    < 10K followers          > 10K followers
    (Normal users)           (Celebrities)
          │                         │
          ▼                         ▼
    PUSH to feeds             PULL at read time
    (async fan-out)           (merge on query)
\`\`\`

**Push for Normal Users**:
\`\`\`
def on_post_created(post):
    followers = get_followers(post.user_id)

    if len(followers) < 10000:
        # Push to each follower's feed cache
        for follower_id in followers:
            feed_cache.add(follower_id, post)
\`\`\`

**Pull for Celebrities**:
\`\`\`
def get_feed(user_id):
    # Get pre-computed feed items (from push)
    cached_posts = feed_cache.get(user_id)

    # Get celebrity posts (pull)
    celebrity_follows = get_celebrity_follows(user_id)
    recent_celebrity_posts = db.query(
        posts WHERE user_id IN celebrity_follows
        AND created_at > now() - 24h
    )

    # Merge and rank
    all_candidates = cached_posts + recent_celebrity_posts
    return rank_posts(all_candidates, user_id)
\`\`\`

**Additional Optimization**:
- Don't push to inactive users (haven't logged in 7+ days)
- Priority push: close friends first, acquaintances later
- Batch writes to same user (avoid hot keys)`
        },
        {
          question: 'How does the ranking algorithm work?',
          answer: `**Goal**: Maximize user engagement (time spent, interactions)

**Features for ML Model**:
\`\`\`
Post Features:
  - post_age_hours
  - post_type (text, photo, video)
  - like_count, comment_count
  - creator_follower_count
  - content_embedding

User-Post Features:
  - relationship_closeness (friend, acquaintance, follow)
  - past_interactions_with_creator
  - time_since_last_interaction
  - content_interest_match (user's interests vs post content)

Context Features:
  - time_of_day
  - user_session_length
  - device_type
\`\`\`

**Ranking Pipeline**:
\`\`\`
┌────────────────────────────────────────────────────────────┐
│                    Ranking Pipeline                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. CANDIDATE GENERATION (from 1000+ posts)                │
│     - Pre-filtered by eligibility (privacy, blocked)       │
│     - Recent posts from followed accounts                  │
│     - Suggested posts (explore)                            │
│                                                            │
│  2. LIGHT RANKER (score all 1000 candidates)               │
│     - Simple logistic regression                           │
│     - Fast: ~0.1ms per post                                │
│     - Output: top 200 candidates                           │
│                                                            │
│  3. HEAVY RANKER (score top 200)                           │
│     - Deep neural network (GBDT + embeddings)              │
│     - Expensive: ~1ms per post                             │
│     - Output: final ranked list                            │
│                                                            │
│  4. BUSINESS RULES                                         │
│     - Diversity: max 2 posts from same creator             │
│     - Recency: boost very new posts                        │
│     - Quality: demote clickbait                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
\`\`\`

**Optimization Target**:
\`\`\`
Score = P(like) × weight_like +
        P(comment) × weight_comment +
        P(share) × weight_share +
        P(dwell > 30s) × weight_dwell

Weights tuned to balance engagement metrics
\`\`\``
        },
        {
          question: 'How do we handle real-time feed updates?',
          answer: `**Challenge**: User is viewing feed, friend posts → show it immediately

**Option 1: Polling (Simple)**
\`\`\`
Every 30 seconds:
  GET /api/feed/updates?since=timestamp

  if new_posts > 0:
    show "X new posts" banner
\`\`\`

**Option 2: WebSocket (Better)**
\`\`\`
┌────────────────────────────────────────────────────────┐
│                Real-time Update Flow                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Friend posts → Post Service → Kafka                   │
│                                    │                   │
│                                    ▼                   │
│                            ┌──────────────┐            │
│                            │ Fan-out      │            │
│                            │ Service      │            │
│                            └──────┬───────┘            │
│                                   │                    │
│                   ┌───────────────┼───────────────┐    │
│                   ▼               ▼               ▼    │
│            ┌───────────┐   ┌───────────┐   ┌──────────┐│
│            │WebSocket  │   │WebSocket  │   │WebSocket ││
│            │Server 1   │   │Server 2   │   │Server 3  ││
│            │(users A-M)│   │(users N-S)│   │(users T-Z││
│            └─────┬─────┘   └─────┬─────┘   └─────┬────┘│
│                  │               │               │     │
│                  ▼               ▼               ▼     │
│            Connected Users (receive push)              │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**Scaling WebSockets**:
- Partition users across WS servers
- Use Redis Pub/Sub for cross-server messages
- Graceful degradation: fall back to polling if WS fails

**Smart Notifications**:
\`\`\`
Don't push every post immediately.
Instead:
- Close friends: real-time push
- Acquaintances: batch every 5 min
- Pages: low priority, batch hourly
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Pull-Based Architecture',
        description: 'Simple pull model - compute feed on read',
        svgTemplate: 'facebookFeed',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                   Basic Feed System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   User requests feed                                        │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐                                          │
│   │  API Server  │                                          │
│   └──────┬───────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   1. Get friends list from Social Graph DB                  │
│   2. Query posts table for each friend's recent posts       │
│   3. Rank all posts                                         │
│   4. Return top N                                           │
│                                                             │
│   ┌──────────────┐     ┌──────────────┐                     │
│   │ Social Graph │     │    Posts     │                     │
│   │      DB      │     │     DB       │                     │
│   └──────────────┘     └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'N+1 query problem (query per friend)',
          'Expensive ranking on every read',
          'Celebrity posts create DB hot spots',
          'No real-time updates',
          'Latency too high (500ms+)'
        ]
      },

      advancedImplementation: {
        title: 'Hybrid Fan-out Architecture',
        svgTemplate: 'facebookFeedAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Facebook News Feed Architecture                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           POST CREATION PATH                                │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │ User creates post → Post Service → [Kafka: posts] → Fan-out    │       │
│   │                                                        │        │       │
│   │              ┌─────────────────────────────────────────┘        │       │
│   │              ▼                                                  │       │
│   │   Normal users (< 10K followers):                               │       │
│   │     Write to each follower's feed cache (Redis)                 │       │
│   │                                                                 │       │
│   │   Celebrities (> 10K followers):                                │       │
│   │     Store in celebrity_posts table only                         │       │
│   │     Followers pull at read time                                 │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│                           FEED READ PATH                                    │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │   User → CDN (cached feed) → Load Balancer → Feed Service       │       │
│   │                                         │                       │       │
│   │              ┌──────────────────────────┘                       │       │
│   │              ▼                                                  │       │
│   │   ┌──────────────────────────────────────────────────────┐      │       │
│   │   │               Feed Aggregation                       │      │       │
│   │   │                                                      │      │       │
│   │   │  1. Get cached feed items (Redis)  ◄──────────────┐  │      │       │
│   │   │  2. Get celebrity posts (pull)     ◄─────────────┐│  │      │       │
│   │   │  3. Merge all candidates                         ││  │      │       │
│   │   │  4. Send to Ranking Service        ─────────────►││  │      │       │
│   │   │                                                  ││  │      │       │
│   │   └──────────────────────────────────────────────────┘│  │      │       │
│   │                                         │             │  │      │       │
│   │              ┌──────────────────────────┘             │  │      │       │
│   │              ▼                                        │  │      │       │
│   │   ┌──────────────────┐  ┌─────────────────────────────┴┐ │      │       │
│   │   │  Ranking Service │  │       Redis Cluster          │ │      │       │
│   │   │  (ML inference)  │  │  (feed cache per user)       │ │      │       │
│   │   │                  │  │  TTL = 5 minutes             │ │      │       │
│   │   │  Light ranker    │  └──────────────────────────────┘ │      │       │
│   │   │  Heavy ranker    │                                   │      │       │
│   │   │  Business rules  │                                   │      │       │
│   │   └──────────────────┘                                   │      │       │
│   │              │                                           │      │       │
│   │              ▼                                           │      │       │
│   │   Return ranked feed to user                             │      │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    DATA STORES                                  │       │
│   │                                                                 │       │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │       │
│   │  │   Posts    │  │   Social   │  │   User     │  │   Media    │ │       │
│   │  │    DB      │  │   Graph    │  │  Features  │  │   (S3+CDN) │ │       │
│   │  │ (sharded)  │  │   (TAO)    │  │  (ML)      │  │            │ │       │
│   │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Hybrid fan-out: push for normal users, pull for celebrities',
          'Pre-computed feed cache in Redis (5 min TTL)',
          'Two-phase ranking: light ranker → heavy ranker',
          'Sharded posts by user_id for write scaling',
          'TAO (social graph) for efficient friend queries'
        ]
      },

      discussionPoints: [
        {
          topic: 'Feed Quality vs Engagement',
          points: [
            'Pure engagement optimization leads to clickbait',
            'Need "quality" signals (dwell time, not just clicks)',
            'User controls: "See less like this"',
            'Content moderation integration'
          ]
        },
        {
          topic: 'Cold Start Problem',
          points: [
            'New users have no friend activity',
            'Use interest signals from onboarding',
            'Show popular/trending content',
            'Quick suggestions to follow'
          ]
        },
        {
          topic: 'Consistency Tradeoffs',
          points: [
            'User deletes post - may still appear in cached feeds briefly',
            'Eventual consistency acceptable for most operations',
            'Strong consistency for privacy-critical ops (blocking)',
            'Fan-out can be delayed during peak traffic'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Personalized feed', 'Posts/photos/videos', 'Likes/comments', 'Stories', 'Real-time updates', 'Ranking'],
      components: ['Post service', 'Feed service', 'Ranking service', 'Graph service (friends)', 'Cache', 'CDN'],
      keyDecisions: [
        'Hybrid fan-out: Push for close friends, pull for acquaintances',
        'ML ranking: Predict engagement probability',
        'Edge caching: CDN for media, Redis for feed',
        'Real-time: Long polling or WebSocket for new posts',
        'Cold start: Use interest signals for new users'
      ],
      edgeCases: [
        { scenario: 'Celebrity with 10M followers creates a post during peak hours', impact: 'Fan-out-on-write would require 10M cache writes, causing massive write amplification and lag', mitigation: 'Use hybrid fan-out: push for normal users and pull for celebrity posts at read time, merging both at feed assembly' },
        { scenario: 'User blocks someone but their cached feed still contains the blocked person posts', impact: 'Blocked content appears in the feed until the cache refreshes, violating privacy expectations', mitigation: 'Apply block list as a post-cache filter at read time, and asynchronously purge blocked user posts from the feed cache' },
        { scenario: 'User scrolls rapidly through feed causing hundreds of ranking requests per minute', impact: 'Ranking service gets overwhelmed with per-request ML inference, degrading latency for all users', mitigation: 'Pre-rank larger batches of 500 posts at once and paginate from the pre-ranked result, re-ranking only on feed refresh' },
        { scenario: 'New user with no friends and no activity history opens the feed', impact: 'Empty feed provides a terrible first impression and high chance of immediate churn', mitigation: 'Serve trending content and popular pages during cold start, and aggressively prompt friend suggestions from contact list' },
        { scenario: 'Post containing misinformation goes viral and reaches millions of feeds before detection', impact: 'Harmful content spreads widely and erodes platform trust before fact-checkers can respond', mitigation: 'Add velocity-based circuit breaker that throttles distribution of rapidly-spreading posts pending automated content review' },
      ],
      tradeoffs: [
        { decision: 'Fan-out-on-write vs fan-out-on-read', pros: 'Write fan-out gives instant feed reads with pre-computed results; read fan-out avoids massive write amplification', cons: 'Write fan-out is extremely expensive for popular users; read fan-out adds latency to every feed request', recommendation: 'Hybrid approach: fan-out-on-write for users with under 10K followers, fan-out-on-read for celebrities' },
        { decision: 'Chronological feed vs ML-ranked feed', pros: 'Chronological is predictable and transparent; ML ranking maximizes engagement and surfaces relevant content', cons: 'Chronological buries important posts under recent noise; ML ranking is opaque and can create filter bubbles', recommendation: 'Default to ML-ranked with a user toggle for chronological, and always boost time-sensitive content types like live events' },
        { decision: 'Redis feed cache per user vs on-demand feed computation', pros: 'Redis cache gives sub-10ms feed reads; on-demand saves memory for inactive users', cons: 'Redis cache consumes massive memory for billions of users; on-demand has unpredictable cold-read latency', recommendation: 'Cache feeds for active users (last 7 days) in Redis, evict inactive feeds, and compute on-demand for returning users' },
        { decision: 'Single global feed service vs geo-distributed feed services', pros: 'Global is simpler to maintain consistency; geo-distributed reduces latency for international users', cons: 'Global adds latency for distant regions; geo-distributed requires cross-region replication of social graphs', recommendation: 'Geo-distribute the feed cache and ranking service, but keep the social graph and post store centrally replicated' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Infinite scroll feed UI with optimistic updates and real-time new post indicators', components: ['Feed Renderer', 'Infinite Scroll Manager', 'WebSocket Client', 'Media Lazy Loader'] },
        { name: 'API Gateway Layer', purpose: 'Authenticate requests, route to feed or post services, and serve cached responses', components: ['Auth Middleware', 'Feed API', 'Post API', 'CDN for media'] },
        { name: 'Feed Assembly Layer', purpose: 'Merge pre-computed feed cache with celebrity pulls and apply ML ranking', components: ['Feed Aggregator', 'Celebrity Post Fetcher', 'Ranking Service (ML)', 'Business Rules Engine'] },
        { name: 'Fan-out Layer', purpose: 'Distribute new posts to follower feed caches based on follower count threshold', components: ['Fan-out Workers', 'Kafka Post Stream', 'Follower Graph Lookup', 'Feed Cache Writer'] },
        { name: 'Data Layer', purpose: 'Persist posts, social graph, user features, and feed caches', components: ['Post DB (sharded)', 'Social Graph (TAO)', 'Feed Cache (Redis Cluster)', 'Media Storage (S3 + CDN)', 'ML Feature Store'] },
      ],
    },
    {
      id: 'key-value-store',
      title: 'Distributed Key-Value Store',
      subtitle: 'Redis / DynamoDB',
      icon: 'database',
      color: '#dc382d',
      difficulty: 'Hard',
      description: 'Design a distributed key-value store with high availability.',

      introduction: `Distributed key-value stores like DynamoDB, Cassandra, and Redis are the backbone of modern systems. This question tests your understanding of distributed systems fundamentals: partitioning, replication, consistency, and failure handling.

The key insight is the CAP theorem: you can't have perfect Consistency, Availability, and Partition tolerance simultaneously. Most systems choose AP (available during partitions) with tunable consistency.`,

      functionalRequirements: [
        'Put(key, value) - store a value',
        'Get(key) - retrieve a value',
        'Delete(key) - remove a value',
        'TTL support - auto-expire keys',
        'Atomic operations (compare-and-swap)',
        'Range queries (if sorted)'
      ],

      nonFunctionalRequirements: [
        'Handle 1M+ operations per second',
        'p99 latency < 10ms',
        'Store 100TB+ of data',
        'No single point of failure',
        'Scale horizontally (add nodes = add capacity)',
        'Survive node failures without data loss',
        'Tunable consistency (strong vs eventual)'
      ],

      dataModel: {
        description: 'Simple key-value with metadata',
        schema: `storage_node {
  key: bytes -- variable length
  value: bytes -- up to 1MB
  version: vector_clock -- for conflict resolution
  created_at: timestamp
  expires_at: timestamp nullable
  checksum: crc32 -- data integrity
}

partition_map {
  -- Consistent hash ring
  hash_range_start: uint64
  hash_range_end: uint64
  primary_node: node_id
  replica_nodes: node_id[]
}

node_registry {
  node_id: uuid
  address: varchar(255)
  status: enum(ALIVE, SUSPECT, DEAD)
  last_heartbeat: timestamp
  data_size_bytes: bigint
}`
      },

      apiDesign: {
        description: 'Simple CRUD with consistency options',
        endpoints: [
          { method: 'PUT', path: '/kv/:key', params: '{ value, ttl?, consistency }', response: '{ version }' },
          { method: 'GET', path: '/kv/:key', params: 'consistency', response: '{ value, version }' },
          { method: 'DELETE', path: '/kv/:key', params: '-', response: '{ deleted: true }' },
          { method: 'PUT', path: '/kv/:key/cas', params: '{ value, expectedVersion }', response: '{ success, newVersion }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we partition data across nodes?',
          answer: `**Consistent Hashing**:

**Problem with Simple Hashing**:
\`\`\`
node = hash(key) % num_nodes

When node count changes:
  3 nodes → 4 nodes
  Most keys get reassigned (expensive!)
\`\`\`

**Consistent Hash Ring**:
\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Hash Ring (0 to 2^64)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                         Node A                          │
│                           │                             │
│                     ┌─────┴─────┐                       │
│                0 ───┤           ├──────────── 2^64      │
│                     │           │                       │
│              Node C─┤   Ring    ├─Node B                │
│                     │           │                       │
│                     └───────────┘                       │
│                                                         │
│   key → hash(key) → walk clockwise → first node         │
│                                                         │
│   Adding/removing a node only moves keys between        │
│   adjacent nodes! (K/N keys move, not K keys)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
\`\`\`

**Virtual Nodes**:
\`\`\`
Problem: Uneven distribution with few nodes
Solution: Each physical node → many virtual nodes

Node A → hash("A-1"), hash("A-2"), ... hash("A-100")

Benefits:
- Even key distribution
- Easier rebalancing when nodes join/leave
- Can have more virtual nodes for stronger machines
\`\`\``
        },
        {
          question: 'How do we handle replication for fault tolerance?',
          answer: `**Replication Strategy**:
\`\`\`
N = Total replicas (typically 3)
W = Write quorum (how many acks needed)
R = Read quorum (how many to query)

For strong consistency: W + R > N

Examples:
  N=3, W=2, R=2: Strong consistency
  N=3, W=1, R=1: Eventual consistency (fastest)
  N=3, W=3, R=1: Read-optimized (writes slower)
\`\`\`

**Write Path**:
\`\`\`
┌─────────────────────────────────────────────────────────┐
│                     Write (N=3, W=2)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Client → Coordinator → Find 3 replicas using ring     │
│                                │                        │
│                    ┌───────────┴───────────┐            │
│                    ▼           ▼           ▼            │
│              ┌──────────┐┌──────────┐┌──────────┐       │
│              │ Replica1 ││ Replica2 ││ Replica3 │       │
│              │  (ACK)   ││  (ACK)   ││  (async) │       │
│              └──────────┘└──────────┘└──────────┘       │
│                    │           │                        │
│                    └─────┬─────┘                        │
│                          ▼                              │
│              W=2 acks received → Return success         │
│              Third replica gets eventual update         │
│                                                         │
└─────────────────────────────────────────────────────────┘
\`\`\`

**Hinted Handoff**:
\`\`\`
If Replica2 is down:
  1. Write to temporary node (hint)
  2. When Replica2 recovers, replay hint
  3. Ensures writes succeed even during failures
\`\`\``
        },
        {
          question: 'How do we handle conflicts with concurrent writes?',
          answer: `**The Problem**:
\`\`\`
Client A writes key=5 to Replica1
Client B writes key=7 to Replica2 (concurrent)

Which value is correct? Both replicas have different values!
\`\`\`

**Solution 1: Last-Write-Wins (LWW)**
\`\`\`
Each write has timestamp
On conflict: highest timestamp wins

Pros: Simple
Cons: May lose data (later timestamp isn't always "correct")
\`\`\`

**Solution 2: Vector Clocks**
\`\`\`
Each replica maintains a version vector:
  { "Replica1": 3, "Replica2": 2, "Replica3": 2 }

On write at Replica1:
  vector["Replica1"]++

Compare vectors:
  If A > B: A is newer (causally after)
  If A < B: B is newer
  If A || B: Concurrent (conflict!)
\`\`\`

**Conflict Resolution**:
\`\`\`
When conflict detected:
  Option 1: Return both versions to client (Amazon cart)
  Option 2: Application-specific merge function
  Option 3: CRDTs (conflict-free replicated data types)
\`\`\`

**Read Repair**:
\`\`\`
On read (R=2):
  Query Replica1 → value=5, version=[1,0,0]
  Query Replica2 → value=7, version=[0,1,0]

  Conflict! Return both to client OR
  Merge and write back merged value to all replicas
\`\`\``
        },
        {
          question: 'How do we detect and handle node failures?',
          answer: `**Gossip Protocol**:
\`\`\`
Every second, each node:
  1. Randomly pick another node
  2. Exchange membership lists
  3. Update local view of cluster state

Node status: ALIVE → SUSPECT → DEAD
  - No heartbeat for 5s → SUSPECT
  - Multiple nodes agree → DEAD
\`\`\`

**Failure Detection Flow**:
\`\`\`
┌─────────────────────────────────────────────────────────┐
│                   Gossip Protocol                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Node A ──gossip──► Node B                             │
│     │                  │                                │
│     │   "I see: A=1,   │   "I see: A=1, B=1, C=0"       │
│     │    B=1, C=1"     │   (C missed heartbeat!)        │
│     │                  │                                │
│     └────────┬─────────┘                                │
│              │                                          │
│              ▼                                          │
│   Both now know: C might be dead                        │
│   After multiple gossip rounds → C confirmed dead       │
│                                                         │
└─────────────────────────────────────────────────────────┘
\`\`\`

**Recovery**:
\`\`\`
When node recovers:
  1. Download latest partition map
  2. Sync data via anti-entropy (Merkle trees)
  3. Resume serving traffic

Merkle Tree sync:
  - Hash tree of all keys
  - Compare roots → find divergent branches
  - Only transfer differing keys
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Single-Node Key-Value Store',
        description: 'In-memory hash map with persistence',
        svgTemplate: 'keyValueStore',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Single Node KV Store                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Client → API Server → In-Memory Hash Map                  │
│                              │                              │
│                              ▼                              │
│                    ┌─────────────────┐                      │
│                    │  Write-Ahead    │                      │
│                    │     Log         │                      │
│                    │  (durability)   │                      │
│                    └─────────────────┘                      │
│                              │                              │
│                              ▼                              │
│                    ┌─────────────────┐                      │
│                    │   SSTable       │                      │
│                    │  (compacted)    │                      │
│                    └─────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single point of failure',
          'Memory limited to one machine',
          'No horizontal scaling',
          'Entire dataset must fit in memory'
        ]
      },

      advancedImplementation: {
        title: 'Distributed Key-Value Store',
        svgTemplate: 'keyValueAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Distributed Key-Value Store                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   Client    │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │              Coordinator / Router                   │                   │
│   │  - Route requests based on consistent hash          │                   │
│   │  - Manage quorum for reads/writes                   │                   │
│   │  - Handle timeouts and retries                      │                   │
│   └────────────────────────┬────────────────────────────┘                   │
│                            │                                                │
│          ┌─────────────────┼─────────────────┐                              │
│          ▼                 ▼                 ▼                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                       │
│   │  Storage    │   │  Storage    │   │  Storage    │                       │
│   │  Node 1     │   │  Node 2     │   │  Node 3     │  ← N storage nodes    │
│   │             │   │             │   │             │                       │
│   │ ┌─────────┐ │   │ ┌─────────┐ │   │ ┌─────────┐ │                       │
│   │ │MemTable│ │   │ │MemTable│ │   │ │MemTable│ │  ← In-memory writes     │
│   │ └────┬────┘ │   │ └────┬────┘ │   │ └────┬────┘ │                       │
│   │      ▼      │   │      ▼      │   │      ▼      │                       │
│   │ ┌─────────┐ │   │ ┌─────────┐ │   │ ┌─────────┐ │                       │
│   │ │   WAL   │ │   │ │   WAL   │ │   │ │   WAL   │ │  ← Write-ahead log    │
│   │ └────┬────┘ │   │ └────┬────┘ │   │ └────┬────┘ │                       │
│   │      ▼      │   │      ▼      │   │      ▼      │                       │
│   │ ┌─────────┐ │   │ ┌─────────┐ │   │ ┌─────────┐ │                       │
│   │ │SSTables │ │   │ │SSTables │ │   │ │SSTables │ │  ← Sorted on disk     │
│   │ └─────────┘ │   │ └─────────┘ │   │ └─────────┘ │                       │
│   └─────────────┘   └─────────────┘   └─────────────┘                       │
│          │                 │                 │                              │
│          └─────────────────┴─────────────────┘                              │
│                            │                                                │
│                            ▼                                                │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                 Gossip Protocol                     │                   │
│   │  - Cluster membership                               │                   │
│   │  - Failure detection                                │                   │
│   │  - Partition map synchronization                    │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Consistent hashing with virtual nodes for partitioning',
          'Configurable N/W/R for tunable consistency',
          'Gossip protocol for failure detection',
          'LSM tree storage (MemTable → WAL → SSTables)',
          'Hinted handoff for availability during failures',
          'Anti-entropy (Merkle trees) for repair'
        ]
      },

      discussionPoints: [
        {
          topic: 'CAP Theorem Tradeoffs',
          points: [
            'CP: Strong consistency, but unavailable during partitions (HBase)',
            'AP: Always available, eventual consistency (Cassandra, DynamoDB)',
            'Most KV stores choose AP with tunable consistency',
            'PACELC: Also consider latency vs consistency when no partition'
          ]
        },
        {
          topic: 'Storage Engine Choices',
          points: [
            'LSM Tree: Write-optimized (Cassandra, LevelDB)',
            'B+ Tree: Read-optimized (MySQL, PostgreSQL)',
            'In-memory only: Fastest but limited (Redis, Memcached)',
            'Hybrid: Hot data in memory, cold on disk'
          ]
        },
        {
          topic: 'Operational Concerns',
          points: [
            'Rebalancing when adding/removing nodes',
            'Compaction (merging SSTables) can cause latency spikes',
            'Monitoring: track p99 latency, not just average',
            'Backups: snapshot + WAL replay'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Put/Get/Delete operations', 'High availability', 'Horizontal scaling', 'Replication', 'Consistency options', 'TTL support'],
      components: ['Coordinator', 'Storage nodes', 'Replication manager', 'Failure detector', 'Consistent hashing ring'],
      keyDecisions: [
        'Partitioning: Consistent hashing with virtual nodes',
        'Replication: N replicas, W write quorum, R read quorum',
        'Consistency: Tunable (strong vs eventual)',
        'Conflict resolution: Last-write-wins or vector clocks',
        'Failure detection: Gossip protocol'
      ],

      edgeCases: [
        {
          scenario: 'Network partition splits the cluster into two groups that both accept writes.',
          impact: 'Conflicting versions of the same key diverge across partitions, risking silent data loss on merge.',
          mitigation: 'Use vector clocks or CRDTs to detect and resolve conflicts; expose conflict resolution to the application layer.'
        },
        {
          scenario: 'A hot key receives disproportionate traffic, overwhelming a single node.',
          impact: 'One node becomes a bottleneck while the rest of the cluster sits idle, degrading overall throughput.',
          mitigation: 'Replicate hot keys to additional nodes and add a caching layer; monitor per-key request rates for early detection.'
        },
        {
          scenario: 'Clock skew between nodes causes last-write-wins to silently discard the correct value.',
          impact: 'Newer data is overwritten by a stale write with a higher timestamp, causing data corruption.',
          mitigation: 'Use logical clocks (Lamport or hybrid) instead of wall-clock time; run NTP sync on all nodes.'
        },
        {
          scenario: 'A node fails mid-compaction, leaving SSTables in an inconsistent state on disk.',
          impact: 'Reads return stale or incomplete data from the affected node until recovery completes.',
          mitigation: 'Write a compaction journal before starting; on restart, either complete or roll back the partial compaction.'
        },
        {
          scenario: 'Consistent hashing ring rebalance during peak traffic causes cascading timeouts.',
          impact: 'Data migration saturates network bandwidth and spikes latency for all operations.',
          mitigation: 'Throttle rebalancing rate and use virtual nodes to limit per-move data size; schedule rebalances during off-peak.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Strong consistency vs eventual consistency for reads.',
          pros: 'Strong consistency guarantees clients always read the latest write, simplifying application logic.',
          cons: 'Requires quorum reads (R + W > N) which increases latency and reduces availability during partitions.',
          recommendation: 'Default to eventual consistency for high-throughput workloads; offer tunable consistency so latency-sensitive reads can opt in to quorum.'
        },
        {
          decision: 'In-memory storage vs LSM-tree disk-based storage.',
          pros: 'In-memory delivers sub-millisecond reads and writes with predictable performance.',
          cons: 'Limited by RAM capacity and requires persistence strategies (snapshots + AOF) to survive restarts.',
          recommendation: 'Use in-memory for hot data and cache layers; back with LSM-tree storage for datasets that exceed available memory.'
        },
        {
          decision: 'Leaderless replication vs leader-based replication.',
          pros: 'Leaderless avoids single-point-of-failure and allows writes to any node, improving write availability.',
          cons: 'Conflict resolution is complex and read-repair adds overhead; harder to maintain strong ordering.',
          recommendation: 'Choose leaderless for AP workloads where availability trumps consistency; use leader-based when strict ordering is required.'
        }
      ],

      layeredDesign: [
        {
          name: 'Client Layer',
          purpose: 'Routes requests to the correct node and handles retries, timeouts, and conflict resolution.',
          components: ['Client SDK', 'Request router', 'Retry handler', 'Conflict resolver']
        },
        {
          name: 'Coordination Layer',
          purpose: 'Manages cluster membership, consistent hashing, and quorum enforcement.',
          components: ['Coordinator node', 'Gossip protocol', 'Consistent hash ring', 'Failure detector']
        },
        {
          name: 'Storage Engine Layer',
          purpose: 'Handles the actual read/write path including memtable, WAL, and SSTable compaction.',
          components: ['Write-ahead log', 'Memtable', 'SSTable files', 'Compaction manager', 'Bloom filters']
        },
        {
          name: 'Replication Layer',
          purpose: 'Ensures data durability by replicating writes across multiple nodes and repairing divergence.',
          components: ['Replication manager', 'Hinted handoff queue', 'Anti-entropy (Merkle trees)', 'Read repair']
        }
      ]
    },
    {
      id: 'unique-id-generator',
      title: 'Unique ID Generator',
      subtitle: 'Twitter Snowflake',
      icon: 'hash',
      color: '#17bf63',
      difficulty: 'Easy',
      description: 'Design a distributed unique ID generation service.',

      introduction: `Every tweet, order, and user in a distributed system needs a unique identifier. You can't use auto-incrementing database IDs because that creates a single point of failure and doesn't scale across data centers.

Twitter's Snowflake solves this elegantly: each machine generates IDs independently using a combination of timestamp, machine ID, and sequence number - no coordination required.`,

      functionalRequirements: [
        'Generate globally unique IDs',
        'IDs should be sortable by time',
        'High throughput (millions per second)',
        'No single point of failure',
        'Works across data centers',
        '64-bit IDs (fit in long integer)'
      ],

      nonFunctionalRequirements: [
        'Generate 10,000+ IDs/second per machine',
        'Latency < 1ms per ID',
        'Zero coordination between machines',
        'Handle clock skew gracefully',
        'Support 1000+ machines',
        'IDs unique for 69+ years'
      ],

      dataModel: {
        description: 'Snowflake 64-bit ID structure',
        schema: `64-bit Snowflake ID:
┌────────────────────────────────────────────────────────────────┐
│ Sign │     Timestamp (41 bits)     │Machine│   Sequence        │
│  0   │  milliseconds since epoch   │ (10)  │   (12 bits)       │
└────────────────────────────────────────────────────────────────┘
  1 bit      41 bits = 69 years       1024     4096 per ms
                                    machines   per machine

Example: 1288834974657 + 1023 + 4095
Binary: 0_10010110001101011010101110010000001_1111111111_111111111111
Decimal: 1234567890123456789`
      },

      apiDesign: {
        description: 'Simple ID generation API',
        endpoints: [
          { method: 'GET', path: '/api/id', params: '-', response: '{ id: 1234567890123456789 }' },
          { method: 'GET', path: '/api/ids', params: 'count (max 1000)', response: '{ ids: [...] }' },
          { method: 'GET', path: '/api/id/parse/:id', params: '-', response: '{ timestamp, machineId, sequence }' }
        ]
      },

      keyQuestions: [
        {
          question: 'Why not just use UUIDs?',
          answer: `**UUID (128-bit)**:
\`\`\`
550e8400-e29b-41d4-a716-446655440000

Pros:
- No coordination needed
- Virtually impossible collision

Cons:
- 128 bits = takes more storage
- Not sortable by time
- Not human-readable
- Poor cache locality (random distribution)
\`\`\`

**Snowflake (64-bit)**:
\`\`\`
1234567890123456789

Pros:
- Sortable by time (great for DB indexes)
- 64 bits = fits in long, smaller storage
- Roughly sequential = better cache locality
- Can extract timestamp from ID

Cons:
- Requires machine ID assignment
- Limited to 69 years and 1024 machines
\`\`\`

**When to use which**:
- UUID: User-generated content, offline-first apps
- Snowflake: Tweets, orders, anything needing time ordering`
        },
        {
          question: 'How does the Snowflake algorithm work?',
          answer: `**ID Structure**:
\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    64-bit Snowflake ID                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Bit 63     │  Bits 62-22    │ Bits 21-12  │  Bits 11-0   │
│   (sign=0)   │  (timestamp)   │ (machine)   │  (sequence)  │
│              │   41 bits      │   10 bits   │   12 bits    │
│              │   69 years     │   1024 max  │   4096/ms    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
\`\`\`

**Generation Algorithm**:
\`\`\`python
class SnowflakeGenerator:
    EPOCH = 1288834974657  # Custom epoch (Nov 4, 2010)
    MACHINE_BITS = 10
    SEQUENCE_BITS = 12

    def __init__(self, machine_id):
        self.machine_id = machine_id
        self.sequence = 0
        self.last_timestamp = -1

    def generate_id(self):
        timestamp = current_time_ms()

        if timestamp < self.last_timestamp:
            raise ClockMovedBackwardsError()

        if timestamp == self.last_timestamp:
            self.sequence = (self.sequence + 1) & 4095  # 12-bit mask
            if self.sequence == 0:
                # Sequence exhausted, wait for next millisecond
                timestamp = wait_for_next_ms(self.last_timestamp)
        else:
            self.sequence = 0

        self.last_timestamp = timestamp

        return ((timestamp - EPOCH) << 22) |
               (self.machine_id << 12) |
               self.sequence
\`\`\`

**Extracting Components**:
\`\`\`python
def parse_id(snowflake_id):
    timestamp = (snowflake_id >> 22) + EPOCH
    machine_id = (snowflake_id >> 12) & 0x3FF  # 10 bits
    sequence = snowflake_id & 0xFFF  # 12 bits
    return timestamp, machine_id, sequence
\`\`\``
        },
        {
          question: 'How do we handle clock skew?',
          answer: `**The Problem**:
\`\`\`
Server clock can drift or jump backwards due to:
- NTP synchronization
- Leap seconds
- VM migration
- Manual time changes

If timestamp goes backwards, we could generate duplicate IDs!
\`\`\`

**Solution 1: Reject and Wait**
\`\`\`python
if current_time < last_timestamp:
    if (last_timestamp - current_time) < 5ms:
        # Small drift: wait it out
        sleep(last_timestamp - current_time)
    else:
        # Large drift: error
        raise ClockSkewError("Clock moved backwards")
\`\`\`

**Solution 2: Use Logical Clock**
\`\`\`
Instead of wall clock:
  - Track (physical_time, logical_counter)
  - If physical time same or backwards, increment logical
  - Always move forward

Hybrid Logical Clocks (HLC)
\`\`\`

**Solution 3: Add More Randomness**
\`\`\`
Some systems (like ULID) add random bits:
  - 48 bits timestamp
  - 80 bits random

Collision probability tiny even with clock issues
\`\`\`

**Best Practices**:
- Use NTP with multiple reliable sources
- Monitor for clock drift
- Have alerts for backwards jumps
- Consider HLC for critical systems`
        },
        {
          question: 'How do we assign machine IDs?',
          answer: `**Option 1: Configuration File**
\`\`\`
# machine_config.yaml
machine_id: 42

Simple, but:
- Manual management
- Risk of duplicate assignment
\`\`\`

**Option 2: ZooKeeper/etcd**
\`\`\`
┌───────────────────────────────────────────────────────┐
│                Machine ID Assignment                  │
├───────────────────────────────────────────────────────┤
│                                                       │
│   Server starts → Connect to ZooKeeper                │
│                         │                             │
│                         ▼                             │
│   Create sequential ephemeral node:                   │
│   /snowflake/machines/machine-0000000042              │
│                         │                             │
│                         ▼                             │
│   Extract sequence number as machine_id = 42          │
│                         │                             │
│                         ▼                             │
│   If server dies, ephemeral node deleted              │
│   ID can be reused (after lease expires)              │
│                                                       │
└───────────────────────────────────────────────────────┘
\`\`\`

**Option 3: Database Counter**
\`\`\`sql
-- On server startup
INSERT INTO machine_ids (hostname, assigned_at)
VALUES ('server-42.prod', NOW())
RETURNING id;

-- Use RETURNING id as machine_id
\`\`\`

**Option 4: MAC Address + PID**
\`\`\`
machine_id = (MAC_ADDRESS[last 6 bytes] XOR PID) % 1024

No coordination, but:
- Risk of collision with many servers
- VM cloning can duplicate MAC
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Single Server Snowflake',
        description: 'Simple in-memory generator',
        svgTemplate: 'distributedId',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Single Server Generator                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Client → API Server → Snowflake Generator                 │
│                              │                              │
│                    ┌─────────┴─────────┐                    │
│                    │                   │                    │
│                    ▼                   ▼                    │
│             ┌──────────┐         ┌──────────┐               │
│             │ Clock    │         │ Sequence │               │
│             │ (NTP)    │         │ Counter  │               │
│             └──────────┘         └──────────┘               │
│                    │                   │                    │
│                    └─────────┬─────────┘                    │
│                              ▼                              │
│                    Generate 64-bit ID                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single point of failure',
          'Limited to 4096 IDs/ms',
          'No failover',
          'Clock skew not handled'
        ]
      },

      advancedImplementation: {
        title: 'Distributed Snowflake Service',
        svgTemplate: 'distributedIdAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Distributed ID Generation                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   Client    │                                                           │
│   │ (embedded   │  ← Each service can embed ID generator                    │
│   │  library)   │     No network call needed!                               │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │              Local Snowflake Generator              │                   │
│   │                                                     │                   │
│   │   machine_id = assigned at startup                  │                   │
│   │   sequence = thread-local counter                   │                   │
│   │   timestamp = System.currentTimeMillis()            │                   │
│   │                                                     │                   │
│   │   Generate: (timestamp << 22) | (machine << 12)     │                   │
│   │             | sequence                              │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │              Machine ID Assignment                  │                   │
│   │                                                     │                   │
│   │   ┌──────────────────────────────────────────────┐  │                   │
│   │   │           ZooKeeper / etcd Cluster           │  │                   │
│   │   │                                              │  │                   │
│   │   │   /snowflake/machines/                       │  │                   │
│   │   │     ├── machine-0001 → server-a.prod         │  │                   │
│   │   │     ├── machine-0002 → server-b.prod         │  │                   │
│   │   │     └── machine-0003 → server-c.prod         │  │                   │
│   │   │                                              │  │                   │
│   │   │   Ephemeral nodes: auto-delete on crash      │  │                   │
│   │   │   Leases: prevent rapid ID reuse             │  │                   │
│   │   └──────────────────────────────────────────────┘  │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                    Monitoring                       │                   │
│   │                                                     │                   │
│   │   - IDs generated per second (per machine)          │                   │
│   │   - Sequence exhaustion events                      │                   │
│   │   - Clock skew alerts                               │                   │
│   │   - Machine ID utilization                          │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Embedded library - no network overhead',
          'ZooKeeper for machine ID assignment',
          'Thread-local sequence for concurrency',
          'Clock skew detection and alerts',
          'Graceful degradation on coordinator failure'
        ]
      },

      discussionPoints: [
        {
          topic: 'Alternative Approaches',
          points: [
            'UUID v7: Time-ordered UUID (new standard)',
            'ULID: 128-bit, lexicographically sortable',
            'MongoDB ObjectId: 96-bit, includes machine + process',
            'Database sequences with ranges (pre-allocate blocks)'
          ]
        },
        {
          topic: 'Scaling Considerations',
          points: [
            '10 bits = 1024 machines max (can split into datacenter + machine)',
            'Run out of sequence? Wait 1ms (rare at 4096/ms)',
            'Multiple generators per machine using datacenter bits',
            'Pre-generate IDs in batches for batch inserts'
          ]
        },
        {
          topic: 'Security Concerns',
          points: [
            'Sequential IDs leak information (creation time, volume)',
            'Can enumerate recent records if pattern known',
            'Consider shuffling bits for external-facing IDs',
            'Add random suffix for rate limit bypass protection'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Globally unique IDs', 'Sortable by time', 'High throughput', 'Low latency', 'No coordination'],
      components: ['ID generator service', 'Time sync (NTP)', 'Machine ID registry'],
      keyDecisions: [
        'Snowflake: 64-bit ID = timestamp + machine ID + sequence',
        '41 bits timestamp (69 years), 10 bits machine ID (1024 machines), 12 bits sequence (4096/ms)',
        'No coordination needed: Each machine generates independently',
        'Clock skew: Reject requests if clock goes backwards',
        'UUID alternative: 128-bit, no coordination, not sortable'
      ],

      edgeCases: [
        {
          scenario: 'NTP daemon corrects a clock backwards, causing the Snowflake generator to produce duplicate timestamps.',
          impact: 'Two IDs share the same timestamp prefix, and if the sequence resets, a collision occurs.',
          mitigation: 'Detect backward clock jumps and either wait until time catches up or reject requests until the clock advances.'
        },
        {
          scenario: 'A machine ID is accidentally reused after a server replacement without updating the registry.',
          impact: 'Two machines generate IDs with identical machine bits, creating collisions under concurrent load.',
          mitigation: 'Use ZooKeeper or etcd for machine ID allocation with lease-based ownership; validate uniqueness on startup.'
        },
        {
          scenario: 'Burst traffic exceeds 4096 requests in a single millisecond on one machine.',
          impact: 'The 12-bit sequence number overflows, and the generator must block until the next millisecond.',
          mitigation: 'Pre-allocate ID batches during low traffic or spread load across multiple generator instances per host.'
        },
        {
          scenario: 'The 41-bit timestamp epoch rolls over after 69 years, exhausting the ID space.',
          impact: 'All new IDs wrap around to zero, colliding with historical IDs and breaking sort ordering.',
          mitigation: 'Choose a custom epoch close to the system launch date; plan a migration strategy well before the 69-year limit.'
        },
        {
          scenario: 'Datacenter failover reassigns machine IDs that were in use at the failed site.',
          impact: 'During split-brain, both datacenters may issue IDs with overlapping machine ID bits.',
          mitigation: 'Reserve separate machine ID ranges per datacenter; use the datacenter bits in Snowflake to namespace IDs.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Snowflake (64-bit sortable) vs UUID (128-bit random).',
          pros: 'Snowflake IDs are time-sortable, compact, and enable efficient B-tree indexing in databases.',
          cons: 'Snowflake requires machine ID coordination and is vulnerable to clock skew; UUIDs need no coordination.',
          recommendation: 'Use Snowflake for internal systems where sort order and compactness matter; use UUIDs for external-facing IDs where unpredictability is valued.'
        },
        {
          decision: 'Centralized ID service vs embedded per-machine generation.',
          pros: 'Centralized services guarantee global uniqueness without machine ID management overhead.',
          cons: 'Adds network latency to every ID request and creates a single point of failure.',
          recommendation: 'Prefer embedded per-machine generation for high-throughput systems; use centralized only when strict sequential ordering is required.'
        },
        {
          decision: 'Pre-allocating ID ranges vs generating on demand.',
          pros: 'Pre-allocation eliminates per-request coordination and handles burst traffic without blocking.',
          cons: 'Wastes ID space if allocated ranges are never fully used; complicates machine decommissioning.',
          recommendation: 'Pre-allocate in small batches (e.g., 1000 IDs) for write-heavy services; generate on demand for low-throughput use cases.'
        }
      ],

      layeredDesign: [
        {
          name: 'Client SDK Layer',
          purpose: 'Provides a simple API for services to request unique IDs without knowing the generation strategy.',
          components: ['ID client library', 'Local ID buffer', 'Retry logic']
        },
        {
          name: 'Generator Layer',
          purpose: 'Combines timestamp, machine ID, and sequence number to produce unique 64-bit IDs.',
          components: ['Clock source', 'Sequence counter', 'Bit packing logic', 'Clock skew detector']
        },
        {
          name: 'Coordination Layer',
          purpose: 'Assigns and manages machine IDs across the cluster to prevent collisions.',
          components: ['ZooKeeper/etcd registry', 'Machine ID allocator', 'Lease manager', 'Health checker']
        }
      ]
    },
    {
      id: 'news-aggregator',
      title: 'Google News',
      subtitle: 'News Aggregator',
      icon: 'newspaper',
      color: '#4285f4',
      difficulty: 'Medium',
      description: 'Design a news aggregation service that collects and ranks news from multiple sources.',

      introduction: `Google News aggregates articles from 50,000+ sources, groups similar articles into stories, and ranks them by relevance and freshness. The key challenges are: ingesting millions of articles daily, detecting duplicate/similar content, and personalizing the feed for each user.

Unlike social feeds, news requires understanding what a story *is* (clustering), not just who posted it. Multiple outlets cover the same event - we need to group them and show diverse perspectives.`,

      functionalRequirements: [
        'Aggregate from 50,000+ news sources',
        'Deduplicate and cluster similar articles',
        'Categorize into topics (Politics, Sports, Tech, etc.)',
        'Personalize feed based on user interests',
        'Show trending/breaking news',
        'Support multiple countries/languages',
        'Full Coverage view (all sources for a story)'
      ],

      nonFunctionalRequirements: [
        'Ingest 5M+ articles per day',
        'Detect breaking news within 5 minutes',
        'Feed generation < 200ms',
        'Support 100M+ monthly users',
        'Handle 1B+ article views per day',
        'Fresh content (< 1 hour old) always available'
      ],

      dataModel: {
        description: 'Articles, stories (clusters), and sources',
        schema: `articles {
  id: bigint PK
  source_id: bigint FK
  url: varchar(2000) UNIQUE
  title: varchar(500)
  content: text
  summary: text -- auto-generated
  published_at: timestamp
  crawled_at: timestamp
  category: varchar(50)
  language: varchar(10)
  entities: jsonb -- extracted people, places, orgs
  embedding: vector(768) -- for similarity
}

stories {
  id: bigint PK
  headline: varchar(500) -- best headline from cluster
  category: varchar(50)
  created_at: timestamp
  updated_at: timestamp
  article_count: int
  trending_score: float
}

story_articles {
  story_id: bigint FK
  article_id: bigint FK
  is_primary: boolean -- main article for story
  added_at: timestamp
}

sources {
  id: bigint PK
  name: varchar(200)
  domain: varchar(255)
  rss_url: varchar(500)
  authority_score: float -- PageRank-like
  category: varchar(50) -- primary focus
  country: varchar(2)
  language: varchar(10)
}`
      },

      apiDesign: {
        description: 'News feed with filtering and personalization',
        endpoints: [
          { method: 'GET', path: '/api/news', params: 'category, country, language, cursor', response: '{ stories[], nextCursor }' },
          { method: 'GET', path: '/api/news/for-you', params: 'cursor', response: '{ stories[] } (personalized)' },
          { method: 'GET', path: '/api/news/story/:id', params: '-', response: '{ story, articles[], relatedStories[] }' },
          { method: 'GET', path: '/api/news/trending', params: 'country', response: '{ stories[] }' },
          { method: 'GET', path: '/api/news/search', params: 'q, dateRange', response: '{ articles[] }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we ingest articles from 50K+ sources?',
          answer: `**Ingestion Sources**:

1. **RSS/Atom Feeds** (preferred)
\`\`\`
Poll each source's RSS feed based on update frequency:
- Major outlets (CNN, BBC): Every 5 minutes
- Medium sources: Every 15 minutes
- Small blogs: Every hour

Adaptive polling: Increase frequency if source is actively publishing
\`\`\`

2. **Web Crawling** (fallback)
\`\`\`
For sources without RSS:
- Crawl homepage for new article links
- Follow sitemaps for article discovery
- Respect robots.txt and rate limits
\`\`\`

**Ingestion Pipeline**:
\`\`\`
┌────────────────────────────────────────────────────────────┐
│                    Article Ingestion                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   ┌──────────────┐                                         │
│   │ Feed Poller  │ ──► Check each source's RSS             │
│   │ (scheduled)  │     Extract new article URLs            │
│   └──────┬───────┘                                         │
│          │                                                 │
│          ▼                                                 │
│   ┌──────────────┐                                         │
│   │ URL Dedup    │ ──► Check if URL already crawled        │
│   │ (Bloom)      │     Skip duplicates                     │
│   └──────┬───────┘                                         │
│          │                                                 │
│          ▼                                                 │
│   ┌──────────────┐                                         │
│   │ Content      │ ──► Fetch full article                  │
│   │ Fetcher      │     Extract text, images, metadata      │
│   └──────┬───────┘                                         │
│          │                                                 │
│          ▼                                                 │
│   ┌──────────────┐                                         │
│   │ NLP Pipeline │ ──► Extract entities, categorize        │
│   │              │     Generate embedding, summarize       │
│   └──────┬───────┘                                         │
│          │                                                 │
│          ▼                                                 │
│   Store in Elasticsearch (search) + PostgreSQL (metadata)  │
│                                                            │
└────────────────────────────────────────────────────────────┘
\`\`\`

**Handling Volume**:
- Kafka queue for async processing
- Distributed crawlers (100+ workers)
- Prioritize major sources during breaking news`
        },
        {
          question: 'How do we cluster similar articles into stories?',
          answer: `**The Problem**:
100 articles about "Election Results" → should be ONE story with 100 sources

**Solution: Embedding-Based Clustering**:
\`\`\`
1. Generate embedding for each article:
   - Title + first 200 words
   - BERT/sentence-transformers model
   - Output: 768-dim vector

2. Find similar articles:
   - Index embeddings in vector DB (Pinecone, Milvus)
   - Query: "Find articles with similarity > 0.85"
   - Use approximate nearest neighbor (HNSW)

3. Cluster similar articles:
   - Hierarchical clustering or DBSCAN
   - Merge articles with high similarity
   - Create/update story
\`\`\`

**Clustering Algorithm**:
\`\`\`
def cluster_article(new_article):
    embedding = generate_embedding(new_article)

    # Find similar recent stories (last 48 hours)
    similar_stories = vector_db.search(
        embedding,
        filter={"created_at": "> now() - 48h"},
        top_k=5,
        threshold=0.85
    )

    if similar_stories:
        # Add to existing story
        best_story = similar_stories[0]
        add_to_story(best_story, new_article)
        update_story_headline(best_story)
    else:
        # Create new story
        create_story(new_article)
\`\`\`

**Headline Selection**:
\`\`\`
For a story with 50 articles, which headline to show?
- Prefer high-authority sources (AP, Reuters)
- Choose most concise, informative title
- Consider recency (newer = better)
- A/B test click-through rates
\`\`\``
        },
        {
          question: 'How do we rank stories in the feed?',
          answer: `**Ranking Signals**:

\`\`\`
Story Score = Freshness × Authority × Engagement × Relevance

Where:
  Freshness = decay(story.updated_at)  # Newer = higher
  Authority = avg(source.authority_score for sources in story)
  Engagement = clicks + shares (velocity matters)
  Relevance = personalization_score(user, story)
\`\`\`

**Freshness Decay**:
\`\`\`
def freshness_score(story):
    hours_old = (now - story.updated_at).hours

    if hours_old < 1:
        return 1.0  # Breaking news boost
    elif hours_old < 6:
        return 0.8
    elif hours_old < 24:
        return 0.5
    else:
        return 0.3 * exp(-hours_old / 48)  # Exponential decay
\`\`\`

**Authority Score**:
\`\`\`
Source authority computed like PageRank:
- Links from other news sources
- Citations in Wikipedia
- Social media followers
- Historical accuracy (fact-checking)

Pre-computed daily, stored with source
\`\`\`

**Personalization**:
\`\`\`
User profile:
  - Explicit: followed topics, saved sources
  - Implicit: click history, read time

Relevance = cosine_similarity(
    user_interest_embedding,
    story_embedding
)
\`\`\`

**Breaking News Boost**:
\`\`\`
if story.article_count grew > 10x in last hour:
    story.score *= 2.0  # Trending boost

if story involves major entity (president, CEO):
    story.score *= 1.5  # Importance boost
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Simple News Aggregator',
        description: 'RSS ingestion with basic ranking',
        svgTemplate: 'googleNews',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Basic News Aggregator                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   RSS Feeds → Poller (cron) → PostgreSQL                    │
│                                    │                        │
│                                    ▼                        │
│   Client → API Server → Query by category/time              │
│                                    │                        │
│                                    ▼                        │
│                         ORDER BY published_at DESC          │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'No deduplication - same story shown multiple times',
          'No personalization',
          'Slow with many sources (sequential polling)',
          'No real-time breaking news detection'
        ]
      },

      advancedImplementation: {
        title: 'Production News Platform',
        svgTemplate: 'googleNewsAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Google News Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                 Ingestion Layer                     │                   │
│   │                                                     │                   │
│   │   RSS Poller ─────►┐                                │                   │
│   │   Web Crawler ────►├──► Kafka ──► Content Workers   │                   │
│   │   API Partners ───►┘     │            │             │                   │
│   │                          │            ▼             │                   │
│   │                          │    ┌──────────────┐      │                   │
│   │                          │    │ NLP Pipeline │      │                   │
│   │                          │    │ - Entities   │      │                   │
│   │                          │    │ - Categories │      │                   │
│   │                          │    │ - Embeddings │      │                   │
│   │                          │    └──────┬───────┘      │                   │
│   │                          │           │              │                   │
│   └──────────────────────────│───────────│──────────────┘                   │
│                              │           │                                  │
│                              ▼           ▼                                  │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Storage Layer                      │                   │
│   │                                                     │                   │
│   │   ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │                   │
│   │   │ PostgreSQL   │ │Elasticsearch │ │ Vector DB  │  │                   │
│   │   │ (metadata)   │ │ (search)     │ │ (clusters) │  │                   │
│   │   └──────────────┘ └──────────────┘ └────────────┘  │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                 Clustering Service                  │                   │
│   │                                                     │                   │
│   │   New article arrives:                              │                   │
│   │   1. Query vector DB for similar articles           │                   │
│   │   2. Assign to existing story or create new         │                   │
│   │   3. Update story headline and metadata             │                   │
│   │   4. Trigger trending detection                     │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Feed Generation                    │                   │
│   │                                                     │                   │
│   │   User request → User profile lookup                │                   │
│   │                       │                             │                   │
│   │         ┌─────────────┼─────────────┐               │                   │
│   │         ▼             ▼             ▼               │                   │
│   │   Candidate      Personalize    Re-rank             │                   │
│   │   Stories          Scores      + Diversity          │                   │
│   │         │             │             │               │                   │
│   │         └─────────────┴─────────────┘               │                   │
│   │                       │                             │                   │
│   │                       ▼                             │                   │
│   │   ┌──────────────────────────────────────────────┐  │                   │
│   │   │              Redis Cache                     │  │                   │
│   │   │   (pre-computed feeds, 5 min TTL)            │  │                   │
│   │   └──────────────────────────────────────────────┘  │                   │
│   │                       │                             │                   │
│   │                       ▼                             │                   │
│   │                    CDN (edge cache)                 │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Distributed crawlers with Kafka for async processing',
          'ML pipeline for entity extraction and categorization',
          'Vector embeddings for similarity-based clustering',
          'Pre-computed feeds with personalization at request time',
          'CDN caching for "Top Stories" (same for all users)'
        ]
      },

      discussionPoints: [
        {
          topic: 'Content Quality',
          points: [
            'Detect and demote clickbait headlines',
            'Source authority scoring (not all sources equal)',
            'Fact-checking integration',
            'Paywall detection and handling'
          ]
        },
        {
          topic: 'Breaking News',
          points: [
            'Detect surge in articles about same topic',
            'Push notifications for major events',
            'Reduce clustering threshold during breaking news',
            'Manual curation for sensitive topics'
          ]
        },
        {
          topic: 'Internationalization',
          points: [
            'Separate pipelines per language',
            'Cross-lingual story linking (same event, different languages)',
            'Local vs global news ranking',
            'Country-specific source authority'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Aggregate from 50K+ sources', 'Deduplicate similar articles', 'Categorization', 'Personalization', 'Real-time updates', 'Trending stories'],
      components: ['Crawler/RSS ingestion', 'NLP pipeline', 'Deduplication service', 'Ranking service', 'Personalization', 'Cache'],
      keyDecisions: [
        'RSS/Atom feeds + web scraping for article ingestion',
        'NLP: Entity extraction, categorization, sentiment',
        'Clustering: Group similar articles about same story',
        'Ranking: Freshness, source authority, engagement',
        'Personalization: User interests + collaborative filtering'
      ],

      edgeCases: [
        {
          scenario: 'A major breaking news event causes thousands of near-identical articles to flood the system within minutes.',
          impact: 'The clustering pipeline becomes overwhelmed, and duplicate stories appear in the feed before dedup catches up.',
          mitigation: 'Use a real-time streaming dedup layer (MinHash/SimHash) before the main clustering pipeline; increase cluster merge frequency during detected surges.'
        },
        {
          scenario: 'A source publishes misleading or AI-generated clickbait articles at high volume.',
          impact: 'Low-quality content dominates the feed and erodes user trust in the aggregator.',
          mitigation: 'Maintain source authority scores updated by editorial review and user feedback; apply content quality classifiers before ranking.'
        },
        {
          scenario: 'RSS feed URLs change or sources switch to paywalled content without notice.',
          impact: 'Ingestion silently fails for affected sources, creating blind spots in news coverage.',
          mitigation: 'Monitor feed health with heartbeat checks; fall back to web scraping when RSS becomes unavailable; alert on coverage gaps per category.'
        },
        {
          scenario: 'Personalization creates a filter bubble where users only see articles confirming their existing views.',
          impact: 'Users miss important diverse perspectives, and the platform faces criticism for amplifying bias.',
          mitigation: 'Inject serendipity by mixing in editorially curated and opposing-viewpoint articles; show topic diversity metrics to users.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Pull-based RSS ingestion vs push-based publisher webhooks.',
          pros: 'RSS polling is simple to implement and works with any source without requiring publisher cooperation.',
          cons: 'Polling at scale wastes bandwidth on unchanged feeds and introduces latency between publication and ingestion.',
          recommendation: 'Use RSS polling as the default with adaptive intervals; offer webhook integration for high-priority publishers who support it.'
        },
        {
          decision: 'Pre-computed personalized feeds vs on-the-fly ranking.',
          pros: 'Pre-computed feeds deliver instant page loads with zero ranking latency at read time.',
          cons: 'Stale for fast-moving news; requires expensive fan-out to update millions of user feeds on every new story.',
          recommendation: 'Use a hybrid approach: pre-compute a candidate set periodically, then apply lightweight real-time re-ranking at request time.'
        },
        {
          decision: 'NLP-based clustering vs simpler URL/title deduplication.',
          pros: 'NLP clustering correctly groups articles about the same event even when headlines and URLs differ completely.',
          cons: 'Computationally expensive and harder to debug; may incorrectly merge distinct stories with similar language.',
          recommendation: 'Use NLP clustering for story grouping but keep a fast title/URL dedup as a first pass to reduce the volume entering the NLP pipeline.'
        }
      ],

      layeredDesign: [
        {
          name: 'Ingestion Layer',
          purpose: 'Crawls RSS feeds and scrapes web sources to collect raw articles at scale.',
          components: ['RSS poller', 'Web scraper', 'Feed health monitor', 'Raw article queue (Kafka)']
        },
        {
          name: 'Processing Layer',
          purpose: 'Extracts entities, classifies topics, detects duplicates, and clusters articles into stories.',
          components: ['NLP pipeline', 'Entity extractor', 'SimHash deduplicator', 'Story clustering engine']
        },
        {
          name: 'Ranking Layer',
          purpose: 'Scores and orders stories based on freshness, source authority, and user preferences.',
          components: ['Ranking service', 'Source authority scorer', 'Freshness decay function', 'A/B test framework']
        },
        {
          name: 'Serving Layer',
          purpose: 'Delivers personalized news feeds to users with low latency and real-time updates.',
          components: ['Personalization engine', 'Feed cache (Redis)', 'CDN', 'Push notification service']
        }
      ]
    },
    {
      id: 'leaderboard',
      title: 'Gaming Leaderboard',
      subtitle: 'Real-time Rankings',
      icon: 'award',
      color: '#f59e0b',
      difficulty: 'Medium',
      description: 'Design a real-time leaderboard for millions of players.',

      introduction: `Gaming leaderboards show player rankings in real-time. The classic approach uses Redis Sorted Sets, which provide O(log N) operations for both updates and rank lookups - perfect for millions of players.

The key challenges are: handling high write throughput during game events, providing instant rank lookups (players want to see their rank immediately), and managing multiple leaderboards (daily, weekly, all-time, per-game-mode).`,

      functionalRequirements: [
        'Update player score in real-time',
        'Get top N players (top 100 leaderboard)',
        'Get a specific player\'s rank',
        'Support multiple leaderboards (daily, weekly, all-time)',
        'Support multiple games/modes',
        'Time-based reset (daily/weekly)',
        'Historical leaderboard snapshots'
      ],

      nonFunctionalRequirements: [
        'Support 100M+ players',
        'Handle 10K+ score updates per second',
        'Handle 100K+ rank lookups per second',
        'Rank lookup < 10ms',
        'Real-time updates (< 1 second delay)',
        'Support 1000+ different leaderboards'
      ],

      dataModel: {
        description: 'Redis sorted sets with persistence backup',
        schema: `Redis Sorted Set:
  Key: leaderboard:{game_id}:{timeframe}
  Members: player_id
  Score: player_score

Example:
  ZADD leaderboard:fortnite:daily 1500 player123
  ZADD leaderboard:fortnite:daily 2300 player456

PostgreSQL (persistent backup):
scores_history {
  id: bigint PK
  player_id: bigint FK
  game_id: varchar(50)
  score: bigint
  leaderboard_type: enum(DAILY, WEEKLY, ALLTIME)
  recorded_at: timestamp
}

leaderboard_snapshots {
  id: bigint PK
  game_id: varchar(50)
  leaderboard_type: varchar(20)
  snapshot_date: date
  rankings: jsonb -- top 1000 for historical reference
}`
      },

      apiDesign: {
        description: 'Simple score update and rank queries',
        endpoints: [
          { method: 'POST', path: '/api/scores', params: '{ playerId, gameId, score }', response: '{ newRank }' },
          { method: 'GET', path: '/api/leaderboard/:gameId/top', params: 'limit, timeframe', response: '{ rankings: [{ playerId, score, rank }] }' },
          { method: 'GET', path: '/api/leaderboard/:gameId/rank/:playerId', params: 'timeframe', response: '{ rank, score, percentile }' },
          { method: 'GET', path: '/api/leaderboard/:gameId/around/:playerId', params: 'range', response: '{ rankings[] } (players above/below)' }
        ]
      },

      keyQuestions: [
        {
          question: 'Why Redis Sorted Sets?',
          answer: `**Redis Sorted Set Operations**:
\`\`\`
ZADD leaderboard:game1 1500 player123  # O(log N)
  Add/update player score

ZREVRANK leaderboard:game1 player123   # O(log N)
  Get player's rank (0-indexed, high score = rank 0)

ZREVRANGE leaderboard:game1 0 99 WITHSCORES  # O(log N + M)
  Get top 100 players with scores

ZSCORE leaderboard:game1 player123     # O(1)
  Get player's score

ZCARD leaderboard:game1                # O(1)
  Get total number of players
\`\`\`

**Why It Works**:
\`\`\`
Sorted Set uses Skip List internally:
- Insert: O(log N)
- Rank lookup: O(log N)
- Range query: O(log N + M)
- Memory efficient: stores only (member, score) pairs

For 100M players:
- ~100M × (8 byte score + ~20 byte player ID) ≈ 3GB
- All fits in memory!
\`\`\`

**Compared to SQL**:
\`\`\`sql
-- Getting rank in SQL requires counting:
SELECT COUNT(*) + 1 as rank
FROM scores
WHERE score > (SELECT score FROM scores WHERE player_id = ?)

-- O(N) operation! Far too slow for 100M players
\`\`\``
        },
        {
          question: 'How do we handle multiple leaderboards?',
          answer: `**Key Naming Convention**:
\`\`\`
leaderboard:{game_id}:{timeframe}

Examples:
  leaderboard:fortnite:alltime
  leaderboard:fortnite:weekly:2024-W23
  leaderboard:fortnite:daily:2024-06-05
  leaderboard:valorant:ranked:season3
\`\`\`

**Time-Based Reset**:
\`\`\`python
# Daily leaderboard
def get_daily_key(game_id):
    today = datetime.now().strftime("%Y-%m-%d")
    return f"leaderboard:{game_id}:daily:{today}"

# When new day starts, old key simply stops getting writes
# Old key expires after 7 days (for history)
redis.expire(old_daily_key, 7 * 24 * 3600)

# Weekly reset
def reset_weekly_leaderboard(game_id):
    week = datetime.now().strftime("%Y-W%W")
    new_key = f"leaderboard:{game_id}:weekly:{week}"
    # New key is empty, old key kept for history
\`\`\`

**Composite Leaderboards**:
\`\`\`
For complex scoring (kills × 10 + assists × 5 + wins × 100):

Option 1: Compute score on client, send composite
  POST { playerId, score: 1500 }

Option 2: Store components, compute on read (slower)
  HSET player:123 kills 50 assists 30 wins 5
  -- Compute rank on query (not scalable)
\`\`\``
        },
        {
          question: 'How do we scale for very large leaderboards?',
          answer: `**Problem**: 100M players in single sorted set can be slow

**Solution 1: Approximate Ranking**
\`\`\`
For players outside top 1000:
  - Don't store in main sorted set
  - Estimate rank based on score percentile

percentile_buckets = {
  "99th": 2500,
  "95th": 2000,
  "90th": 1800,
  ...
}

def get_approximate_rank(score, total_players):
    for percentile, threshold in buckets:
        if score >= threshold:
            return total_players * (100 - percentile) / 100
\`\`\`

**Solution 2: Sharded Leaderboards**
\`\`\`
┌────────────────────────────────────────────────────────┐
│                 Sharded Leaderboard                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Score ranges:                                        │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│   │ 0-999 points │ │1000-1999 pts │ │ 2000+ pts    │   │
│   │   Shard 1    │ │   Shard 2    │ │   Shard 3    │   │
│   │   (10M)      │ │   (50M)      │ │   (40M)      │   │
│   └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                        │
│   Global rank = offset[shard] + rank_within_shard      │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**Solution 3: Top-K Only**
\`\`\`
Only maintain sorted set for top 10,000 players
Everyone else just knows they're "not in top 10K"

On score update:
  if score > min_score_in_top_10k:
      add_to_sorted_set(player)
      if sorted_set.size > 10000:
          remove_lowest()
\`\`\``
        },
        {
          question: 'How do we handle high write throughput?',
          answer: `**Problem**: During game events, millions of score updates

**Solution 1: Batch Updates**
\`\`\`
Instead of individual ZADD:
  - Buffer updates for 100ms
  - Send as pipeline

pipeline = redis.pipeline()
for update in buffer:
    pipeline.zadd(key, {update.player: update.score})
pipeline.execute()  # Single round trip
\`\`\`

**Solution 2: Local Aggregation**
\`\`\`
┌────────────────────────────────────────────────────────┐
│                  Write Aggregation                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Game Server 1 ──┐                                    │
│   Game Server 2 ──┼──► Local Buffer ──► Flush to Redis │
│   Game Server 3 ──┘    (per server)     (every 1 sec)  │
│                                                        │
│   Multiple updates for same player? Keep only highest  │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**Solution 3: Write-Behind Cache**
\`\`\`
In-memory sorted set (local) → async sync to Redis

Pros:
  - Instant writes
  - Handles Redis downtime

Cons:
  - Slight delay in global consistency
  - Recovery complexity
\`\`\`

**Redis Cluster Mode**:
\`\`\`
Shard by leaderboard key:
  - Different games go to different shards
  - Natural load distribution
  - Hash tags for same-shard operations
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Single Redis Leaderboard',
        description: 'Simple sorted set implementation',
        svgTemplate: 'leaderboard',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Basic Leaderboard                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Game Client → API Server → Redis Sorted Set               │
│                                   │                         │
│                                   ▼                         │
│                    ┌──────────────────────────┐             │
│                    │     Redis Commands       │             │
│                    │                          │             │
│                    │  ZADD (update score)     │             │
│                    │  ZREVRANK (get rank)     │             │
│                    │  ZREVRANGE (top N)       │             │
│                    │                          │             │
│                    └──────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Single Redis instance = SPOF',
          'No persistence (data loss on Redis restart)',
          'No historical snapshots',
          'High latency during write spikes'
        ]
      },

      advancedImplementation: {
        title: 'Production Leaderboard System',
        svgTemplate: 'leaderboardAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Production Leaderboard                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │ Game Server │ ──► Score Update ──► Write Aggregator                     │
│   └─────────────┘                           │                               │
│                                             ▼                               │
│                                    ┌───────────────┐                        │
│                                    │ Kafka Topics  │                        │
│                                    │ (per game)    │                        │
│                                    └───────┬───────┘                        │
│                                            │                                │
│                              ┌─────────────┴─────────────┐                  │
│                              ▼                           ▼                  │
│                    ┌──────────────────┐        ┌──────────────────┐         │
│                    │  Score Processor │        │  Score Processor │         │
│                    │  (consumer 1)    │        │  (consumer 2)    │         │
│                    └────────┬─────────┘        └────────┬─────────┘         │
│                             │                           │                   │
│                             └───────────┬───────────────┘                   │
│                                         ▼                                   │
│                    ┌─────────────────────────────────────────┐              │
│                    │              Redis Cluster              │              │
│                    │                                         │              │
│                    │   ┌───────────┐   ┌───────────┐         │              │
│                    │   │  Shard 1  │   │  Shard 2  │  ...    │              │
│                    │   │ (games A-M)│   │ (games N-Z)│         │              │
│                    │   └───────────┘   └───────────┘         │              │
│                    │                                         │              │
│                    └─────────────────────────────────────────┘              │
│                                         │                                   │
│                                         ▼                                   │
│                    ┌─────────────────────────────────────────┐              │
│                    │           Persistence Layer             │              │
│                    │                                         │              │
│                    │   - Async backup to PostgreSQL          │              │
│                    │   - Daily snapshots of top 1000         │              │
│                    │   - Score history for anti-cheat        │              │
│                    │                                         │              │
│                    └─────────────────────────────────────────┘              │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                      Read Path                                  │       │
│   │                                                                 │       │
│   │   Client → CDN (top 100 cached) → API → Redis (direct lookup)   │       │
│   │                                                                 │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Kafka for write buffering and exactly-once delivery',
          'Redis Cluster for horizontal scaling',
          'Async persistence to PostgreSQL',
          'CDN cache for top N (changes infrequently)',
          'Anti-cheat: flag suspicious score jumps'
        ]
      },

      discussionPoints: [
        {
          topic: 'Anti-Cheat Considerations',
          points: [
            'Validate scores server-side (don\'t trust client)',
            'Rate limit score updates per player',
            'Flag suspicious jumps (1000 points in 1 second)',
            'Require game server validation before recording'
          ]
        },
        {
          topic: 'Historical Leaderboards',
          points: [
            'Snapshot top 1000 at end of each period',
            'Allow viewing past day/week/season rankings',
            'Archive old data to cold storage',
            'Achievement unlock based on historical rank'
          ]
        },
        {
          topic: 'Friends Leaderboard',
          points: [
            'Filter by friends list (social graph)',
            'Can\'t use single sorted set (different per user)',
            'Option 1: ZINTERSTORE with friends set (slow)',
            'Option 2: Query each friend\'s score, sort client-side'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Update scores in real-time', 'Get top N players', 'Get player rank', 'Support multiple leaderboards', 'Time-based reset'],
      components: ['Score service', 'Redis sorted sets', 'Sharding layer', 'Backup storage'],
      keyDecisions: [
        'Redis sorted sets: O(log N) insert, O(log N) rank lookup',
        'Sharding: By leaderboard ID for different games/levels',
        'Large leaderboards: Approximate ranking for players outside top 1000',
        'Periodic snapshots to persistent storage',
        'Batch updates for very high write volume'
      ],

      edgeCases: [
        {
          scenario: 'Two players submit score updates at the exact same millisecond with identical scores.',
          impact: 'Rank ordering between tied players is undefined, causing inconsistent rankings across requests.',
          mitigation: 'Use a composite sort key (score + timestamp) so that the earlier submission ranks higher; document the tiebreaker policy.'
        },
        {
          scenario: 'A cheater submits an impossibly high score that pushes legitimate players off the top rankings.',
          impact: 'Legitimate players lose motivation and trust in the leaderboard, damaging game engagement.',
          mitigation: 'Validate scores server-side against game state; flag statistical anomalies (e.g., 10x average score) for review before posting.'
        },
        {
          scenario: 'Redis master fails during a leaderboard season reset, and the replica has stale data.',
          impact: 'Players see outdated rankings or lose recent score updates, causing complaints and support tickets.',
          mitigation: 'Use Redis Sentinel for automatic failover; persist snapshots to PostgreSQL so leaderboards can be rebuilt from durable storage.'
        },
        {
          scenario: 'A viral game event causes millions of concurrent score updates, exceeding single Redis instance throughput.',
          impact: 'Score update latency spikes and some updates may be dropped, showing incorrect player rankings.',
          mitigation: 'Buffer updates in Kafka and apply them in micro-batches; shard by leaderboard ID to distribute write load across Redis instances.'
        },
        {
          scenario: 'A player requests their rank on a leaderboard with 100 million entries, causing a slow ZRANK operation.',
          impact: 'The O(log N) lookup on a very large sorted set takes noticeable time and blocks the Redis event loop.',
          mitigation: 'For players outside top 10K, return approximate rank using bucket-based estimation rather than exact ZRANK.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Redis sorted sets vs a relational database with indexed score column.',
          pros: 'Redis sorted sets provide O(log N) rank lookups and updates in memory with purpose-built commands (ZADD, ZRANK).',
          cons: 'Redis is limited by memory capacity and lacks built-in durability; a database crash without persistence loses all rankings.',
          recommendation: 'Use Redis as the primary ranking engine with periodic snapshots to a relational database for durability and historical queries.'
        },
        {
          decision: 'Global leaderboard vs sharded per-region leaderboards.',
          pros: 'A global leaderboard gives every player a single definitive rank, which is simpler to understand and more competitive.',
          cons: 'Cross-region writes introduce latency; a single sorted set becomes a scaling bottleneck at hundreds of millions of players.',
          recommendation: 'Maintain regional leaderboards for low-latency reads; merge the top N from each region into a global leaderboard asynchronously.'
        },
        {
          decision: 'Real-time rank updates vs periodic batch recalculation.',
          pros: 'Real-time updates give players instant feedback on their ranking position after each game.',
          cons: 'High write amplification under load; every score change triggers a re-sort that may not be visible to other players.',
          recommendation: 'Update scores in real-time but allow rank queries to be slightly stale (1-2 seconds) by caching rank results briefly.'
        }
      ],

      layeredDesign: [
        {
          name: 'API Layer',
          purpose: 'Exposes endpoints for submitting scores, querying ranks, and fetching top-N leaderboards.',
          components: ['Score submission API', 'Rank query API', 'Leaderboard listing API', 'Rate limiter']
        },
        {
          name: 'Score Processing Layer',
          purpose: 'Validates, deduplicates, and applies anti-cheat checks before writing scores to the ranking engine.',
          components: ['Score validator', 'Anti-cheat service', 'Dedup filter', 'Score event queue (Kafka)']
        },
        {
          name: 'Ranking Engine Layer',
          purpose: 'Maintains sorted player rankings in memory for fast rank lookups and top-N queries.',
          components: ['Redis sorted sets', 'Shard router', 'Approximate rank estimator', 'TTL manager for seasonal resets']
        },
        {
          name: 'Persistence Layer',
          purpose: 'Stores historical leaderboard snapshots and provides recovery data if the in-memory layer fails.',
          components: ['PostgreSQL snapshot store', 'Periodic snapshot job', 'Historical leaderboard query service']
        }
      ]
    },
    {
      id: 'hotel-booking',
      title: 'Booking.com',
      subtitle: 'Hotel Reservation',
      icon: 'building',
      color: '#003580',
      difficulty: 'Medium',
      description: 'Design a hotel booking system with search, availability, and reservations.',

      introduction: `Booking.com handles 2M+ properties with complex inventory: multiple room types, varying prices by date, and real-time availability. The core challenge is preventing double-bookings while maintaining fast search results.

Unlike simple e-commerce, hotel inventory is date-specific - a room available on June 15 might be booked on June 16. This creates an explosion of inventory states (30M rooms × 365 days = 10B+ room-nights to track).`,

      functionalRequirements: [
        'Search hotels by location, dates, guests',
        'Show real-time availability and pricing',
        'Book rooms with instant confirmation',
        'Handle cancellations with refund policies',
        'Support multiple room types per hotel',
        'Dynamic pricing based on demand',
        'Reviews and ratings',
        'Photos and hotel details'
      ],

      nonFunctionalRequirements: [
        'Support 2M+ hotels worldwide',
        'Handle 500M searches per day',
        'Process 2M bookings per day',
        'Search results < 500ms',
        'Prevent double-bookings (strong consistency)',
        '99.99% availability',
        'Handle surge during peak seasons'
      ],

      dataModel: {
        description: 'Hotels, rooms, inventory, and bookings',
        schema: `hotels {
  id: bigint PK
  name: varchar(200)
  location: geography(POINT)
  city_id: bigint FK
  star_rating: int
  amenities: varchar[]
  description: text
  check_in_time: time
  check_out_time: time
  cancellation_policy: jsonb
}

room_types {
  id: bigint PK
  hotel_id: bigint FK
  name: varchar(100) -- "Deluxe King", "Standard Double"
  max_occupancy: int
  bed_configuration: varchar(50)
  amenities: varchar[]
  total_rooms: int -- how many of this type
}

room_inventory {
  room_type_id: bigint FK
  date: date
  available: int -- rooms available that night
  price: decimal(10,2)
  PK (room_type_id, date)
}

bookings {
  id: bigint PK
  user_id: bigint FK
  hotel_id: bigint FK
  room_type_id: bigint FK
  check_in: date
  check_out: date
  guests: int
  total_price: decimal(10,2)
  status: enum(CONFIRMED, CANCELLED, COMPLETED)
  created_at: timestamp
}`
      },

      apiDesign: {
        description: 'Search, availability, and booking flows',
        endpoints: [
          { method: 'GET', path: '/api/hotels/search', params: 'lat, lng, radius, checkin, checkout, guests, filters', response: '{ hotels[], totalCount }' },
          { method: 'GET', path: '/api/hotels/:id', params: '-', response: '{ hotel, roomTypes[], photos[], reviews[] }' },
          { method: 'GET', path: '/api/hotels/:id/availability', params: 'checkin, checkout, guests', response: '{ roomTypes[], prices[] }' },
          { method: 'POST', path: '/api/bookings', params: '{ hotelId, roomTypeId, checkin, checkout, guests, payment }', response: '{ bookingId, confirmationCode }' },
          { method: 'DELETE', path: '/api/bookings/:id', params: '-', response: '{ refundAmount, status }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we model and store inventory?',
          answer: `**The Challenge**:
\`\`\`
Naive approach: Store each room individually
  30M rooms × 365 days = 10.9 billion rows
  Every search needs to join with this!

Better: Store availability count per room TYPE per date
  5 room types × 2M hotels × 365 days = 3.6B rows (still huge)
\`\`\`

**Inventory Model**:
\`\`\`
Instead of tracking individual rooms:
  "Room 101 is booked June 15"
  "Room 102 is available June 15"

Track counts per room type:
  "Deluxe King: 5 available June 15"
  "Standard Double: 12 available June 15"

room_inventory {
  room_type_id: bigint
  date: date
  available: int  -- decremented on booking
  price: decimal
}
\`\`\`

**Sparse Storage**:
\`\`\`
Don't store dates with no changes:
  - Only store dates with bookings or price changes
  - Default to "all rooms available at base price"

Query: SELECT available FROM room_inventory
       WHERE room_type_id = ? AND date = ?
       -- If no row: all rooms available
\`\`\`

**Pre-aggregated Search**:
\`\`\`
For search results, pre-compute:
  hotel_availability_cache {
    hotel_id
    date
    has_availability: boolean
    min_price: decimal
  }

Search query filters hotels BEFORE checking exact availability
\`\`\``
        },
        {
          question: 'How do we prevent double-bookings?',
          answer: `**The Problem**:
\`\`\`
User A and User B try to book last room simultaneously:
  Both read: available = 1
  Both write: available = 0, create booking
  Result: 2 bookings for 1 room!
\`\`\`

**Solution 1: Pessimistic Locking**
\`\`\`sql
BEGIN TRANSACTION;

-- Lock the inventory rows
SELECT available FROM room_inventory
WHERE room_type_id = 123
  AND date BETWEEN '2024-06-15' AND '2024-06-17'
FOR UPDATE;

-- Check availability
IF all_dates_have_availability:
  -- Decrement counts
  UPDATE room_inventory
  SET available = available - 1
  WHERE room_type_id = 123
    AND date BETWEEN '2024-06-15' AND '2024-06-17';

  -- Create booking
  INSERT INTO bookings (...);

COMMIT;
\`\`\`

**Solution 2: Optimistic Locking with Version**
\`\`\`sql
-- Read current state
SELECT available, version FROM room_inventory WHERE ...

-- Update with version check
UPDATE room_inventory
SET available = available - 1,
    version = version + 1
WHERE room_type_id = 123
  AND date = '2024-06-15'
  AND version = 42  -- Only if unchanged
  AND available > 0;

-- If rows_affected = 0, retry or fail
\`\`\`

**Solution 3: Reservation Hold**
\`\`\`
┌────────────────────────────────────────────────────────┐
│              Reservation Hold Pattern                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   1. User starts checkout → Create HOLD (10 min TTL)   │
│   2. Inventory decremented for HOLD                    │
│   3. User completes payment → HOLD → CONFIRMED         │
│   4. User abandons → HOLD expires → inventory restored │
│                                                        │
│   Prevents: "Someone else booked while you paid"       │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\``
        },
        {
          question: 'How do we handle search at scale?',
          answer: `**Search Requirements**:
\`\`\`
"Hotels in NYC, June 15-17, 2 guests, under $200/night"

Need to:
1. Filter by location (geo-query)
2. Filter by date availability
3. Filter by price
4. Rank by relevance, reviews, price
\`\`\`

**Two-Phase Search**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│                 Search Architecture                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Phase 1: Elasticsearch (fast, approximate)           │
│   ┌──────────────────────────────────────────────────┐ │
│   │  Filter: geo_distance, star_rating, amenities    │ │
│   │  Pre-computed: has_availability, min_price       │ │
│   │  Result: 500 candidate hotels                    │ │
│   └──────────────────────────────────────────────────┘ │
│                        │                               │
│                        ▼                               │
│   Phase 2: Database (exact availability)               │
│   ┌──────────────────────────────────────────────────┐ │
│   │  For each candidate:                             │ │
│   │    Check room_inventory for exact dates          │ │
│   │    Get exact prices                              │ │
│   │    Filter guests capacity                        │ │
│   │  Result: 100 available hotels with prices        │ │
│   └──────────────────────────────────────────────────┘ │
│                        │                               │
│                        ▼                               │
│   Phase 3: Ranking                                     │
│   ┌──────────────────────────────────────────────────┐ │
│   │  Score = relevance × review_score × price_value  │ │
│   │  + Personalization (user's past preferences)     │ │
│   │  + Business rules (promoted properties)          │ │
│   └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**Caching Strategy**:
\`\`\`
Hotel details: Cache aggressively (changes rarely)
  CDN + Redis, TTL = 1 hour

Availability: Cache briefly or compute live
  Redis, TTL = 1 minute (stale OK for search)
  Always fresh for booking page

Search results: Cache by query hash
  "NYC + June 15-17 + 2 guests" → cached 5 min
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Simple Booking System',
        description: 'Single database with basic search',
        svgTemplate: 'hotelBooking',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Basic Hotel Booking                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Client → API Server → PostgreSQL                          │
│                              │                              │
│                    ┌─────────┴─────────┐                    │
│                    │                   │                    │
│                    ▼                   ▼                    │
│            ┌──────────────┐    ┌──────────────┐             │
│            │   Hotels     │    │  Bookings    │             │
│            │   Inventory  │    │              │             │
│            └──────────────┘    └──────────────┘             │
│                                                             │
│   Search: SELECT * FROM hotels                              │
│           WHERE ST_DWithin(location, point, radius)         │
│           AND EXISTS (availability subquery)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Slow search (geo + availability join)',
          'Database bottleneck under load',
          'No caching strategy',
          'Single point of failure'
        ]
      },

      advancedImplementation: {
        title: 'Production Booking Platform',
        svgTemplate: 'hotelBookingAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Hotel Booking Platform                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                    Search Flow                      │                   │
│   │                                                     │                   │
│   │   User → CDN → API Gateway → Search Service         │                   │
│   │                                   │                 │                   │
│   │              ┌────────────────────┴────────────┐    │                   │
│   │              ▼                                 ▼    │                   │
│   │   ┌──────────────────┐            ┌──────────────────┐                  │
│   │   │  Elasticsearch   │            │  Redis Cache     │                  │
│   │   │  (geo + filters) │            │  (query results) │                  │
│   │   └────────┬─────────┘            └──────────────────┘                  │
│   │            │                                        │                   │
│   │            ▼                                        │                   │
│   │   ┌──────────────────┐                              │                   │
│   │   │ Availability DB  │ (sharded by hotel_id)        │                   │
│   │   │ (exact check)    │                              │                   │
│   │   └──────────────────┘                              │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                    Booking Flow                     │                   │
│   │                                                     │                   │
│   │   User → API Gateway → Booking Service              │                   │
│   │                             │                       │                   │
│   │              ┌──────────────┴──────────────┐        │                   │
│   │              ▼                             ▼        │                   │
│   │   ┌──────────────────┐          ┌──────────────────┐│                   │
│   │   │ Inventory Service│          │ Payment Service  ││                   │
│   │   │ (pessimistic     │          │ (Stripe, etc.)   ││                   │
│   │   │  locking)        │          │                  ││                   │
│   │   └────────┬─────────┘          └────────┬─────────┘│                   │
│   │            │                             │          │                   │
│   │            └─────────────┬───────────────┘          │                   │
│   │                          ▼                          │                   │
│   │              ┌──────────────────┐                   │                   │
│   │              │  Booking DB      │                   │                   │
│   │              │  (confirmed)     │                   │                   │
│   │              └──────────────────┘                   │                   │
│   │                          │                          │                   │
│   │                          ▼                          │                   │
│   │              ┌──────────────────┐                   │                   │
│   │              │  Kafka           │                   │                   │
│   │              │  (notifications) │                   │                   │
│   │              └──────────────────┘                   │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Pricing Service                    │                   │
│   │                                                     │                   │
│   │   - Dynamic pricing based on demand                 │                   │
│   │   - Competitor rate monitoring                      │                   │
│   │   - Yield management algorithms                     │                   │
│   │   - Special offers and promotions                   │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Two-phase search: Elasticsearch candidates → DB availability',
          'Pessimistic locking for booking to prevent double-booking',
          'Reservation holds during checkout (10 min TTL)',
          'Sharded inventory DB by hotel_id',
          'Dynamic pricing service with yield management'
        ]
      },

      discussionPoints: [
        {
          topic: 'Overbooking Strategy',
          points: [
            'Airlines overbook 5-15% - hotels can too',
            'Statistically some bookings will cancel',
            'Risk: "walking" guests (compensate with upgrade)',
            'Business decision, not just technical'
          ]
        },
        {
          topic: 'Multi-Channel Distribution',
          points: [
            'Same inventory on Booking.com, Expedia, direct',
            'Channel manager syncs availability in real-time',
            'Rate parity: same price across channels',
            'Last-room availability: who gets the last room?'
          ]
        },
        {
          topic: 'Cancellation Handling',
          points: [
            'Different policies: free, partial refund, non-refundable',
            'Free cancellation deadline handling',
            'Releasing inventory back to pool',
            'Waitlist for sold-out dates'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Search hotels', 'Room availability', 'Booking', 'Cancellation', 'Reviews', 'Dynamic pricing'],
      components: ['Hotel service', 'Inventory service', 'Search (Elasticsearch)', 'Booking service', 'Payment service', 'Pricing service'],
      keyDecisions: [
        'Search: Geo-filtered search with availability join',
        'Inventory: Store room availability by date, not individual nights',
        'Overbooking prevention: Pessimistic locking during checkout',
        'Caching: Cache hotel details, compute availability on-demand',
        'Rate parity: Ensure consistent pricing across channels'
      ],

      edgeCases: [
        {
          scenario: 'Two users attempt to book the last available room at the same time from different channels.',
          impact: 'Without proper locking, both bookings succeed and the hotel is double-booked for that date.',
          mitigation: 'Use pessimistic locking (SELECT FOR UPDATE) during checkout; hold a short-lived reservation token that expires if payment is not completed within 10 minutes.'
        },
        {
          scenario: 'A user books a room, then the hotel marks it unavailable on their channel manager before sync completes.',
          impact: 'The booking confirmation is sent but the room no longer exists in the hotel inventory, requiring manual resolution.',
          mitigation: 'Implement two-phase confirmation: tentatively reserve via the channel manager API, then confirm only after the hotel system acknowledges availability.'
        },
        {
          scenario: 'Dynamic pricing algorithm raises the rate between when the user views search results and when they click book.',
          impact: 'The displayed price differs from the checkout price, frustrating users and potentially violating consumer protection laws.',
          mitigation: 'Lock the displayed price for a configurable TTL (e.g., 15 minutes) using a price quote token; honor the quoted price at checkout.'
        },
        {
          scenario: 'A large group cancels 50 rooms simultaneously, flooding the inventory system with availability updates.',
          impact: 'The inventory service becomes overwhelmed, temporarily showing stale availability to new searchers.',
          mitigation: 'Process bulk cancellations asynchronously through a queue; update search cache in batches rather than one room at a time.'
        },
        {
          scenario: 'A hotel in a different timezone has a check-in date boundary that differs from the user search timezone.',
          impact: 'Users see rooms as available when they are actually booked for the requested local date, causing check-in conflicts.',
          mitigation: 'Store all availability in UTC and convert based on the hotel property timezone; display dates in the hotel local time.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Pessimistic locking vs optimistic locking for inventory reservation.',
          pros: 'Pessimistic locking guarantees no double-booking by holding exclusive locks during the checkout flow.',
          cons: 'Locks block concurrent users trying to book the same room type, reducing throughput during high-demand periods.',
          recommendation: 'Use pessimistic locking for the final booking step but optimistic locking for the search/browse phase to keep search fast.'
        },
        {
          decision: 'Pre-computed availability index vs real-time availability calculation.',
          pros: 'Pre-computed indexes make search queries fast since availability is already joined with hotel data.',
          cons: 'Indexes become stale quickly as bookings and cancellations happen, showing phantom availability.',
          recommendation: 'Pre-compute availability for search results with a short TTL cache; verify real-time availability only when the user initiates booking.'
        },
        {
          decision: 'Allowing overbooking vs strict inventory enforcement.',
          pros: 'Overbooking (like airlines) maximizes revenue by accounting for expected cancellations and no-shows.',
          cons: 'When all guests show up, the hotel must walk guests to another property, causing poor customer experience.',
          recommendation: 'Allow configurable overbooking percentage per hotel (typically 5-10%); ensure a partner hotel network for walk scenarios.'
        },
        {
          decision: 'Centralized inventory service vs distributed per-channel inventory.',
          pros: 'A centralized service provides a single source of truth, eliminating cross-channel sync issues.',
          cons: 'Creates a single point of failure; all channels depend on one service for every availability check.',
          recommendation: 'Use a centralized inventory service with local read replicas per channel; writes go to the primary, reads can be slightly stale.'
        }
      ],

      layeredDesign: [
        {
          name: 'Search Layer',
          purpose: 'Handles hotel discovery with geo-filtering, date-range availability, and faceted search results.',
          components: ['Elasticsearch cluster', 'Geo-index', 'Availability cache', 'Search ranking service']
        },
        {
          name: 'Inventory Layer',
          purpose: 'Manages room availability, pricing, and reservation locks across all distribution channels.',
          components: ['Inventory service', 'Price engine', 'Channel manager sync', 'Reservation lock manager']
        },
        {
          name: 'Booking Layer',
          purpose: 'Orchestrates the checkout flow including payment processing, confirmation, and post-booking notifications.',
          components: ['Booking orchestrator', 'Payment gateway', 'Confirmation service', 'Email/SMS notifier']
        },
        {
          name: 'Data Layer',
          purpose: 'Stores hotel metadata, reviews, photos, and historical booking data for analytics.',
          components: ['PostgreSQL (bookings)', 'Redis (session/cache)', 'S3 (photos)', 'Analytics warehouse']
        }
      ]
    },
    {
      id: 'google-maps',
      title: 'Google Maps',
      subtitle: 'Navigation System',
      icon: 'map',
      color: '#4285f4',
      difficulty: 'Hard',
      description: 'Design a mapping and navigation system with real-time traffic.',

      introduction: `Google Maps combines multiple complex systems: map rendering at 20+ zoom levels, shortest-path routing on a graph with 1 billion road segments, real-time traffic from millions of phones, and place search across 200M+ businesses.

The key insight is that maps are mostly static (roads don't change often), so we pre-compute and cache aggressively. But traffic is dynamic and requires real-time processing from anonymized phone location data.`,

      functionalRequirements: [
        'Render maps at multiple zoom levels',
        'Search for places by name or category',
        'Get directions (driving, walking, transit)',
        'Show real-time traffic conditions',
        'Calculate accurate ETAs',
        'Street View imagery',
        'Offline maps download'
      ],

      nonFunctionalRequirements: [
        'Support 1B+ monthly active users',
        'Handle 10B+ tile requests per day',
        'Process 1B+ directions requests per day',
        'Routing response < 500ms',
        'Tile loading < 200ms (from CDN)',
        'Real-time traffic updates every 1-2 minutes',
        'Cover 1 billion road segments globally'
      ],

      dataModel: {
        description: 'Road graph, tiles, places, and traffic',
        schema: `road_segments {
  id: bigint PK
  start_node: bigint FK
  end_node: bigint FK
  geometry: linestring
  road_type: enum(HIGHWAY, ARTERIAL, LOCAL, etc.)
  speed_limit: int
  one_way: boolean
  length_meters: int
}

nodes {
  id: bigint PK
  location: point
  -- Intersection points
}

places {
  id: bigint PK
  name: varchar(200)
  location: point
  category: varchar(100)
  address: text
  phone: varchar(20)
  hours: jsonb
  rating: decimal(2,1)
}

traffic_segments {
  segment_id: bigint FK
  timestamp: timestamp
  speed_ratio: float -- 0.5 = 50% of normal speed
  -- Time-series data, partitioned by time
}

tiles {
  z: int -- zoom level
  x: int -- tile x coordinate
  y: int -- tile y coordinate
  data: bytes -- pre-rendered PNG or vector
  -- 22 zoom levels, billions of tiles
}`
      },

      apiDesign: {
        description: 'Map tiles, directions, and places',
        endpoints: [
          { method: 'GET', path: '/tiles/:z/:x/:y.png', params: 'style', response: 'PNG image (256x256 or 512x512)' },
          { method: 'GET', path: '/api/directions', params: 'origin, destination, mode, avoid, departure_time', response: '{ routes: [{ distance, duration, steps[], polyline }] }' },
          { method: 'GET', path: '/api/places/search', params: 'query, location, radius, type', response: '{ places[] }' },
          { method: 'GET', path: '/api/places/:id', params: '-', response: '{ place details, reviews[], photos[] }' },
          { method: 'GET', path: '/api/geocode', params: 'address OR latlng', response: '{ location, formatted_address }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do map tiles work?',
          answer: `**Tile Pyramid**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│                    Zoom Levels                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Zoom 0: 1 tile (entire world)                        │
│   Zoom 1: 4 tiles (2×2)                                │
│   Zoom 2: 16 tiles (4×4)                               │
│   ...                                                  │
│   Zoom 18: 68 billion tiles                            │
│   Zoom 22: 17 trillion tiles (not all exist)           │
│                                                        │
│   Total tiles at zoom z = 4^z                          │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**Tile Coordinates**:
\`\`\`
URL: /tiles/{z}/{x}/{y}.png

z = zoom level (0-22)
x = column (0 to 2^z - 1)
y = row (0 to 2^z - 1)

Example: /tiles/15/5241/12661.png
  Zoom 15, specific tile in that grid
\`\`\`

**Rendering Strategy**:
\`\`\`
Option 1: Pre-render all tiles (static maps)
  - Billions of tiles × 22 zoom levels
  - Store in object storage (S3)
  - Serve via CDN
  - Problem: Takes petabytes, updates are slow

Option 2: Render on-demand + cache
  - Render when first requested
  - Cache in CDN for hours/days
  - Better for sparse areas
  - Higher latency on first load

Option 3: Vector tiles (modern approach)
  - Send data, render in client
  - Smaller transfer size
  - Dynamic styling (dark mode!)
  - Better for complex features
\`\`\`

**CDN Caching**:
\`\`\`
Cache-Control: public, max-age=86400

Tiles rarely change (roads are stable)
Invalidate specific tiles when map data updates
\`\`\``
        },
        {
          question: 'How does routing/directions work?',
          answer: `**Road Graph**:
\`\`\`
Graph = (Nodes, Edges)
  Nodes = Intersections (lat, lng)
  Edges = Road segments with weight

Edge weight factors:
  - Distance (meters)
  - Speed limit
  - Road type (highway faster than local)
  - Real-time traffic
  - Restrictions (no left turn, one-way)
\`\`\`

**Shortest Path Algorithms**:
\`\`\`
Dijkstra's Algorithm: O(E + V log V)
  - Correct, but slow for large graphs
  - 1 billion segments = too slow

A* Algorithm: O(E + V log V) but faster in practice
  - Uses heuristic (straight-line distance to dest)
  - Explores fewer nodes
  - Still slow for very long routes
\`\`\`

**Contraction Hierarchies (used at scale)**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│              Contraction Hierarchies                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Preprocessing (hours, done offline):                 │
│   1. Rank nodes by importance                          │
│   2. Contract unimportant nodes, add shortcuts         │
│   3. Create hierarchy of importance levels             │
│                                                        │
│   Query (milliseconds):                                │
│   1. Bidirectional search (from origin AND dest)       │
│   2. Only traverse "up" the hierarchy                  │
│   3. Meet in the middle at high-importance node        │
│                                                        │
│   Result: ~100x faster than Dijkstra                   │
│                                                        │
└────────────────────────────────────────────────────────┘

Cross-country route: < 1ms query time!
\`\`\`

**Real-time Traffic Integration**:
\`\`\`
For each edge (road segment):
  base_time = distance / speed_limit
  traffic_factor = current_speed / normal_speed
  current_time = base_time / traffic_factor

Update edge weights every 1-2 minutes
Routing uses current weights
\`\`\``
        },
        {
          question: 'How does real-time traffic work?',
          answer: `**Data Collection**:
\`\`\`
Millions of phones with Google Maps open:
  - Send anonymized location updates
  - Location + timestamp + speed
  - Aggregated, not individual tracking
\`\`\`

**Traffic Processing Pipeline**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│                  Traffic Pipeline                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Phone → Location Update → Kafka                      │
│                               │                        │
│                               ▼                        │
│   ┌─────────────────────────────────────────────────┐  │
│   │          Stream Processor (Flink)               │  │
│   │                                                 │  │
│   │  1. Map-match: Which road segment?              │  │
│   │  2. Filter noise (GPS jitter, stops)            │  │
│   │  3. Aggregate: Avg speed per segment            │  │
│   │  4. Smooth: Moving average over 5 min           │  │
│   │                                                 │  │
│   └─────────────────────────────────────────────────┘  │
│                               │                        │
│                               ▼                        │
│   Traffic DB: segment_id → current_speed_ratio         │
│                               │                        │
│                               ▼                        │
│   ┌─────────────────────────────────────────────────┐  │
│   │              Traffic Tile Service               │  │
│   │                                                 │  │
│   │  Generate color-coded traffic overlay tiles     │  │
│   │  Green = flowing, Yellow = slow, Red = stopped  │  │
│   │                                                 │  │
│   └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**ETA Calculation**:
\`\`\`
ETA = sum of (segment_length / segment_speed)
      for each segment in route

Speed = real-time if available
      OR historical pattern for this time/day
      OR speed limit

Confidence interval:
  "45-55 minutes depending on traffic"
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Basic Mapping System',
        description: 'Static tiles with simple routing',
        svgTemplate: 'googleMaps',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Basic Maps System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Client → CDN → Pre-rendered tiles (static)                │
│                                                             │
│   Client → API → Routing (Dijkstra on full graph)           │
│                     │                                       │
│                     ▼                                       │
│             ┌──────────────┐                                │
│             │ Road Graph   │                                │
│             │ (in memory)  │                                │
│             └──────────────┘                                │
│                                                             │
│   No real-time traffic                                      │
│   No ETA prediction                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Slow routing (Dijkstra too slow at scale)',
          'No real-time traffic',
          'Static tiles only (no dynamic styling)',
          'Petabytes of tile storage'
        ]
      },

      advancedImplementation: {
        title: 'Production Maps Platform',
        svgTemplate: 'googleMapsAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Google Maps Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                   Map Tiles                         │                   │
│   │                                                     │                   │
│   │   Client → CDN → Tile Server → Object Storage       │                   │
│   │              │                                      │                   │
│   │              └─► Vector tiles (compact, styleable)  │                   │
│   │                  Raster tiles (compatibility)       │                   │
│   │                  Satellite imagery                  │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                   Routing                           │                   │
│   │                                                     │                   │
│   │   Client → Load Balancer → Routing Service          │                   │
│   │                                  │                  │                   │
│   │              ┌───────────────────┴──────────────┐   │                   │
│   │              ▼                                  ▼   │                   │
│   │   ┌──────────────────┐         ┌──────────────────┐ │                   │
│   │   │ Graph Server     │         │ Traffic Server   │ │                   │
│   │   │ (Contraction     │         │ (real-time       │ │                   │
│   │   │  Hierarchies)    │         │  edge weights)   │ │                   │
│   │   └──────────────────┘         └──────────────────┘ │                   │
│   │              │                          │           │                   │
│   │              └────────────┬─────────────┘           │                   │
│   │                           ▼                         │                   │
│   │   Combine graph + traffic → optimal route           │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                   Traffic                           │                   │
│   │                                                     │                   │
│   │   Phones → Location Service → Kafka → Flink         │                   │
│   │                                          │          │                   │
│   │              ┌───────────────────────────┴───┐      │                   │
│   │              ▼                               ▼      │                   │
│   │   ┌──────────────────┐         ┌──────────────────┐ │                   │
│   │   │ Traffic Store    │         │ Traffic Tiles    │ │                   │
│   │   │ (segment speeds) │         │ (color overlay)  │ │                   │
│   │   └──────────────────┘         └──────────────────┘ │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                   Places                            │                   │
│   │                                                     │                   │
│   │   Client → Places API → Elasticsearch               │                   │
│   │                              │                      │                   │
│   │                    ┌─────────┴─────────┐            │                   │
│   │                    ▼                   ▼            │                   │
│   │            ┌─────────────┐     ┌─────────────┐      │                   │
│   │            │ Geo-search  │     │ Text-search │      │                   │
│   │            │ (nearby)    │     │ (by name)   │      │                   │
│   │            └─────────────┘     └─────────────┘      │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Vector tiles: Smaller, styleable, rendered client-side',
          'Contraction Hierarchies: <1ms routing queries',
          'Real-time traffic: Flink stream processing of phone locations',
          'CDN for tile caching globally',
          'Separate services for different concerns'
        ]
      },

      discussionPoints: [
        {
          topic: 'Offline Maps',
          points: [
            'Download region: tiles + road graph subset',
            'Graph partitioning for efficient download',
            'Compressed vector tiles (100MB for a city)',
            'No real-time traffic offline - use historical'
          ]
        },
        {
          topic: 'ETA Accuracy',
          points: [
            'Combine real-time + historical patterns',
            'ML models for prediction (time of day, events)',
            'Adjust based on destination type (parking time)',
            'Learn from actual trip data'
          ]
        },
        {
          topic: 'Map Data Updates',
          points: [
            'User reports (wrong turn, road closed)',
            'Satellite imagery analysis for new roads',
            'Partnership with municipalities',
            'Differential updates to existing graph'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Map rendering', 'Search places', 'Directions', 'Real-time traffic', 'ETA', 'Street View', 'Offline maps'],
      components: ['Map tile service', 'Geocoding service', 'Routing engine', 'Traffic service', 'Place service', 'CDN'],
      keyDecisions: [
        'Map tiles: Pre-rendered at multiple zoom levels, served from CDN',
        'Routing: Dijkstra/A* on road graph, segment-based for updates',
        'Traffic: Aggregate anonymized location data, update edge weights',
        'ETA: Historical patterns + real-time traffic',
        'Offline: Download bounded region tiles + graph'
      ],

      edgeCases: [
        {
          scenario: 'A road closure or accident occurs mid-navigation, invalidating the current route.',
          impact: 'The user follows an outdated route into a closed road, wasting time and eroding trust in navigation.',
          mitigation: 'Subscribe to real-time traffic event streams; trigger automatic rerouting when edge weights change significantly along the active path.'
        },
        {
          scenario: 'GPS signal is lost in a tunnel or dense urban canyon for an extended period.',
          impact: 'The navigation loses track of the user position and cannot provide turn-by-turn directions.',
          mitigation: 'Use dead reckoning with accelerometer and gyroscope data; snap to the most likely road segment when GPS signal returns.'
        },
        {
          scenario: 'Map tile requests spike when millions of users open the app simultaneously during a major event.',
          impact: 'CDN cache misses for less-popular zoom levels cause origin overload and slow map rendering for all users.',
          mitigation: 'Pre-warm CDN caches for event locations; use progressive tile loading with low-res placeholders while high-res tiles load.'
        },
        {
          scenario: 'A routing request spans two graph partitions stored on different servers.',
          impact: 'Cross-partition routing requires network hops between servers, significantly increasing route calculation latency.',
          mitigation: 'Use hierarchical routing: pre-compute routes between partition boundaries, then stitch local routes at query time.'
        },
        {
          scenario: 'Offline map data becomes outdated because the user has not connected to update in weeks.',
          impact: 'Navigation follows roads that no longer exist or misses newly opened routes.',
          mitigation: 'Show a staleness warning when offline data exceeds a threshold age; prompt for differential updates when connectivity is available.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Pre-rendered map tiles vs vector tiles rendered on the client.',
          pros: 'Pre-rendered tiles are simple to serve from a CDN and require zero client-side processing.',
          cons: 'Massive storage for all zoom levels across the globe; cannot dynamically style or rotate labels.',
          recommendation: 'Use vector tiles for mobile clients (smaller downloads, client-side styling) and pre-rendered raster tiles as a fallback for low-power devices.'
        },
        {
          decision: 'Dijkstra/A* on the full graph vs contraction hierarchies for routing.',
          pros: 'Contraction hierarchies pre-compute shortcuts that reduce query time from seconds to milliseconds for long routes.',
          cons: 'Pre-computation takes hours and must be rerun when the road graph changes; not suitable for real-time traffic integration.',
          recommendation: 'Use contraction hierarchies for static routes; overlay real-time traffic by adjusting edge weights on the original graph for short segments near the driver.'
        },
        {
          decision: 'Crowdsourced traffic data vs dedicated sensor infrastructure.',
          pros: 'Crowdsourcing from phone GPS provides global coverage at near-zero infrastructure cost.',
          cons: 'Coverage gaps in low-adoption areas; privacy concerns with continuous location tracking.',
          recommendation: 'Primarily use crowdsourced data with anonymization (differential privacy); supplement with municipal sensor feeds in cities that provide them.'
        }
      ],

      layeredDesign: [
        {
          name: 'Map Rendering Layer',
          purpose: 'Serves map tiles at multiple zoom levels and handles client-side rendering of vector data.',
          components: ['Tile server', 'CDN', 'Vector tile encoder', 'Label placement engine']
        },
        {
          name: 'Routing Layer',
          purpose: 'Computes optimal paths between origin and destination using weighted road graphs.',
          components: ['Graph partitioner', 'Contraction hierarchy builder', 'A* query engine', 'Rerouting service']
        },
        {
          name: 'Traffic Layer',
          purpose: 'Aggregates real-time location data to compute live traffic conditions and update edge weights.',
          components: ['Location ingestion pipeline', 'Traffic flow calculator', 'Incident detector', 'Edge weight updater']
        },
        {
          name: 'Search and Geocoding Layer',
          purpose: 'Resolves place names and addresses to coordinates and provides point-of-interest search.',
          components: ['Geocoder', 'Reverse geocoder', 'Place search index', 'Autocomplete service']
        },
        {
          name: 'Offline Layer',
          purpose: 'Packages map tiles and routing graphs for download so navigation works without connectivity.',
          components: ['Region packager', 'Differential update generator', 'On-device routing engine', 'Staleness tracker']
        }
      ]
    },
    {
      id: 'zoom',
      title: 'Zoom',
      subtitle: 'Video Conferencing',
      icon: 'video',
      color: '#2d8cff',
      difficulty: 'Hard',
      description: 'Design a video conferencing platform for real-time communication.',

      introduction: `Video conferencing requires real-time media streaming with < 150ms latency - far lower than typical web applications. The core challenge is handling the N² problem: in a meeting with N participants, each person needs to receive N-1 video streams.

The solution is an SFU (Selective Forwarding Unit) that receives each participant's stream once and forwards it to others, rather than peer-to-peer connections that don't scale.`,

      functionalRequirements: [
        'Video and audio calls',
        'Screen sharing',
        'In-meeting chat',
        'Recording and playback',
        'Virtual backgrounds',
        'Breakout rooms',
        'Support 2-1000 participants',
        'Waiting room and host controls'
      ],

      nonFunctionalRequirements: [
        'End-to-end latency < 150ms',
        'Support 10M concurrent participants',
        'Video quality: 720p-1080p',
        'Audio quality: Clear with noise cancellation',
        '99.99% availability',
        'Work on varying network conditions',
        'Secure (end-to-end encryption optional)'
      ],

      dataModel: {
        description: 'Meetings, participants, and media sessions',
        schema: `meetings {
  id: uuid PK
  host_user_id: uuid FK
  title: varchar(200)
  password_hash: varchar(256) nullable
  scheduled_start: timestamp
  actual_start: timestamp nullable
  actual_end: timestamp nullable
  settings: jsonb -- waiting room, mute on entry, etc.
}

participants {
  meeting_id: uuid FK
  user_id: uuid FK nullable -- null for guests
  display_name: varchar(100)
  joined_at: timestamp
  left_at: timestamp nullable
  role: enum(HOST, COHOST, PARTICIPANT)
  audio_enabled: boolean
  video_enabled: boolean
}

media_sessions {
  participant_id: uuid FK
  sfu_server: varchar(255)
  sdp_offer: text
  sdp_answer: text
  ice_candidates: jsonb[]
}

recordings {
  meeting_id: uuid FK
  storage_url: varchar(500)
  duration_seconds: int
  status: enum(RECORDING, PROCESSING, READY, FAILED)
}`
      },

      apiDesign: {
        description: 'Meeting management and real-time signaling',
        endpoints: [
          { method: 'POST', path: '/api/meetings', params: '{ title, scheduledStart, settings }', response: '{ meetingId, joinUrl, hostKey }' },
          { method: 'POST', path: '/api/meetings/:id/join', params: '{ displayName, password }', response: '{ participantId, sfuUrl, iceServers[] }' },
          { method: 'WS', path: '/signaling/:meetingId', params: '-', response: 'SDP offer/answer, ICE candidates' },
          { method: 'POST', path: '/api/meetings/:id/record/start', params: '-', response: '{ recordingId }' },
          { method: 'GET', path: '/api/recordings/:id', params: '-', response: '{ url, duration, status }' }
        ]
      },

      keyQuestions: [
        {
          question: 'What is an SFU and why use it?',
          answer: `**The N² Problem**:
\`\`\`
Peer-to-Peer (P2P):
  5 participants = each sends 4 streams = 20 streams total
  50 participants = each sends 49 streams = 2,450 streams!

  Each participant uploads N-1 copies of their stream
  Doesn't scale!
\`\`\`

**SFU (Selective Forwarding Unit)**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│                         SFU                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Participant A ──upload─► SFU ──download──► B, C, D   │
│   Participant B ──upload─► SFU ──download──► A, C, D   │
│   Participant C ──upload─► SFU ──download──► A, B, D   │
│   Participant D ──upload─► SFU ──download──► A, B, C   │
│                                                        │
│   Each participant uploads 1 stream                    │
│   SFU forwards to N-1 recipients                       │
│   Upload bandwidth: 1 stream (not N-1)                 │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**SFU vs MCU**:
\`\`\`
SFU (Selective Forwarding Unit):
  - Forwards streams as-is
  - Lower server CPU
  - Client decodes multiple streams
  - Better quality (no re-encoding)

MCU (Multipoint Control Unit):
  - Mixes all streams into one
  - Higher server CPU
  - Client decodes one stream
  - Older approach, less flexible
\`\`\`

**Simulcast**:
\`\`\`
Sender encodes 3 quality levels:
  High: 1080p @ 2 Mbps
  Medium: 480p @ 500 Kbps
  Low: 180p @ 100 Kbps

SFU sends appropriate quality to each receiver
  - Active speaker gets high quality
  - Thumbnails get low quality
\`\`\``
        },
        {
          question: 'How does WebRTC signaling work?',
          answer: `**WebRTC Overview**:
\`\`\`
WebRTC = Web Real-Time Communication
  - Browser API for peer-to-peer media
  - Handles codec negotiation, encryption, NAT traversal
  - We provide signaling (how peers find each other)
\`\`\`

**Signaling Flow**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│                  Signaling Exchange                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│   1. Alice creates "offer" (SDP describing her media)  │
│      → Send to signaling server                        │
│      → Server forwards to SFU                          │
│                                                        │
│   2. SFU creates "answer" (SDP describing its media)   │
│      → Send back via signaling                         │
│                                                        │
│   3. ICE candidate exchange (network paths)            │
│      Alice: "I can be reached at IP:port"              │
│      SFU: "I can be reached at IP:port"                │
│                                                        │
│   4. Direct media connection established               │
│      (using best available path)                       │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**SDP (Session Description Protocol)**:
\`\`\`
v=0
o=- 123456 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 49170 UDP/TLS/RTP/SAVPF 111
a=rtpmap:111 opus/48000/2
m=video 51372 UDP/TLS/RTP/SAVPF 96
a=rtpmap:96 VP8/90000

Describes: codecs, ports, encryption, etc.
\`\`\`

**NAT Traversal (STUN/TURN)**:
\`\`\`
Most users are behind NAT (private IP)

STUN: "What's my public IP?"
  → Quick, free, works 80% of time

TURN: "Relay my traffic through server"
  → Fallback when direct fails
  → More bandwidth cost
  → Always works
\`\`\``
        },
        {
          question: 'How do we handle large meetings (100+ participants)?',
          answer: `**Challenges**:
\`\`\`
100 participants:
  - 100 video streams to decode (CPU intensive)
  - 100 thumbnails to render
  - Bandwidth: 100 × 100 Kbps = 10 Mbps minimum
\`\`\`

**Optimization 1: Tile-based rendering**
\`\`\`
Only render visible tiles:
  - User sees 3×3 grid = 9 videos
  - Only decode/download those 9
  - Scroll → pause old, start new

"Pagination" for video
\`\`\`

**Optimization 2: Active speaker detection**
\`\`\`
┌────────────────────────────────────────────────────────┐
│              Active Speaker Layout                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌────────────────────────────┐ ┌───┐ ┌───┐ ┌───┐    │
│   │                            │ │   │ │   │ │   │    │
│   │    Active Speaker (HD)     │ │   │ │   │ │   │    │
│   │                            │ │ ▣ │ │ ▣ │ │ ▣ │    │
│   │                            │ │   │ │   │ │   │    │
│   └────────────────────────────┘ └───┘ └───┘ └───┘    │
│                                  (Low quality thumbs)  │
│                                                        │
│   SFU detects speaker via audio levels                 │
│   Automatically switches main view                     │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**Optimization 3: Cascaded SFUs**
\`\`\`
For 1000 participants across globe:
  - Single SFU can't handle all
  - Deploy regional SFUs
  - SFUs relay between each other

SFU(US-West) ←→ SFU(US-East) ←→ SFU(Europe)

Each user connects to nearest SFU
\`\`\`

**Optimization 4: Audio-only mode**
\`\`\`
For very large meetings (webinars):
  - Only host/panelists have video
  - Attendees are audio-only or listen-only
  - Reduces bandwidth dramatically
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Simple Video Call',
        description: 'Peer-to-peer for 2 participants',
        svgTemplate: 'zoom',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Basic P2P Video Call                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Alice ←──────── Signaling Server ──────────► Bob          │
│      │                                            │         │
│      │  1. Exchange SDP via WebSocket             │         │
│      │  2. Exchange ICE candidates                │         │
│      │                                            │         │
│      └────────── Direct P2P Media ───────────────┘          │
│                 (WebRTC UDP stream)                         │
│                                                             │
│   STUN Server: Helps discover public IPs                    │
│   TURN Server: Relay when direct fails                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          'Only works for 2-4 participants (N² problem)',
          'No recording',
          'No screen sharing support',
          'Relies on participants\' upload bandwidth'
        ]
      },

      advancedImplementation: {
        title: 'Production Video Conferencing',
        svgTemplate: 'zoomAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Video Conferencing Platform                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Meeting Lifecycle                  │                   │
│   │                                                     │                   │
│   │   User → API Gateway → Meeting Service              │                   │
│   │                             │                       │                   │
│   │              ┌──────────────┴──────────────┐        │                   │
│   │              ▼                             ▼        │                   │
│   │   ┌──────────────────┐          ┌──────────────────┐│                   │
│   │   │ PostgreSQL       │          │ Redis            ││                   │
│   │   │ (meeting data)   │          │ (active sessions)││                   │
│   │   └──────────────────┘          └──────────────────┘│                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                    Media Path                       │                   │
│   │                                                     │                   │
│   │   Client → Signaling Server (WebSocket)             │                   │
│   │                    │                                │                   │
│   │                    ▼                                │                   │
│   │   ┌─────────────────────────────────────────────┐   │                   │
│   │   │              SFU Cluster                    │   │                   │
│   │   │                                             │   │                   │
│   │   │   ┌─────────┐   ┌─────────┐   ┌─────────┐   │   │                   │
│   │   │   │ SFU 1   │←→│ SFU 2   │←→│ SFU 3   │   │   │                   │
│   │   │   │(US-West)│   │(US-East)│   │(Europe) │   │   │                   │
│   │   │   └─────────┘   └─────────┘   └─────────┘   │   │                   │
│   │   │         │             │             │       │   │                   │
│   │   │   ┌─────┴─────────────┴─────────────┴────┐  │   │                   │
│   │   │   │         TURN Server Pool            │  │   │                   │
│   │   │   │     (NAT traversal fallback)        │  │   │                   │
│   │   │   └─────────────────────────────────────┘  │   │                   │
│   │   │                                             │   │                   │
│   │   └─────────────────────────────────────────────┘   │                   │
│   │                    │                                │                   │
│   │                    ▼                                │                   │
│   │   ┌─────────────────────────────────────────────┐   │                   │
│   │   │           Recording Pipeline                │   │                   │
│   │   │                                             │   │                   │
│   │   │  SFU → Recording Bot → Transcoding → S3    │   │                   │
│   │   │              (joins as participant)         │   │                   │
│   │   │                                             │   │                   │
│   │   └─────────────────────────────────────────────┘   │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                 Quality Optimization                │                   │
│   │                                                     │                   │
│   │   - Simulcast: Encode 3 quality levels              │                   │
│   │   - Bandwidth estimation: Adjust quality dynamically│                   │
│   │   - Active speaker detection: Focus bandwidth       │                   │
│   │   - FEC: Forward error correction for packet loss   │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'SFU-based architecture for scalability',
          'Cascaded SFUs for global distribution',
          'Simulcast for adaptive quality',
          'TURN servers for reliable NAT traversal',
          'Recording bot joins meeting to capture streams'
        ]
      },

      discussionPoints: [
        {
          topic: 'End-to-End Encryption',
          points: [
            'WebRTC encrypts by default (DTLS-SRTP)',
            'But SFU can see content (decrypts/re-encrypts)',
            'True E2E: Insertable Streams API',
            'Challenge: Recording, transcription with E2E'
          ]
        },
        {
          topic: 'Network Resilience',
          points: [
            'Handle packet loss (FEC, retransmission)',
            'Bandwidth estimation algorithms',
            'Graceful quality degradation',
            'Reconnection handling'
          ]
        },
        {
          topic: 'Feature Complexity',
          points: [
            'Virtual backgrounds: Real-time ML segmentation',
            'Breakout rooms: Sub-meetings with own SFU',
            'Waiting room: Hold before joining',
            'Polls/reactions: WebSocket side channel'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['Video/audio calls', 'Screen sharing', 'Chat', 'Recording', 'Virtual backgrounds', 'Up to 1000 participants'],
      components: ['Signaling server', 'Media server (SFU)', 'TURN servers', 'Recording service', 'Chat service'],
      keyDecisions: [
        'SFU (Selective Forwarding Unit): Server relays streams, doesn\'t mix',
        'WebRTC for peer connections, fallback to TURN for NAT traversal',
        'Adaptive bitrate: Adjust quality based on bandwidth',
        'Large meetings: Tile-based view, only render visible participants',
        'Recording: Server-side capture and transcoding'
      ],

      edgeCases: [
        {
          scenario: 'A participant with very low bandwidth joins a meeting with 50 high-definition video streams.',
          impact: 'The SFU forwards all streams to the low-bandwidth client, causing severe packet loss and a frozen experience.',
          mitigation: 'Implement simulcast so senders publish multiple quality layers; the SFU forwards only the lowest layer to bandwidth-constrained participants.'
        },
        {
          scenario: 'The active speaker switches rapidly between participants in a heated discussion.',
          impact: 'Frequent layout changes and stream priority switches cause visual jitter and increased CPU usage on clients.',
          mitigation: 'Apply a debounce window (e.g., 2 seconds) for speaker detection before switching the active speaker layout; pre-buffer adjacent streams.'
        },
        {
          scenario: 'A corporate firewall blocks UDP traffic, preventing WebRTC peer connections from being established.',
          impact: 'The participant cannot send or receive any media, effectively unable to join the meeting.',
          mitigation: 'Fall back to TURN relay over TCP/443; as a last resort, use a WebSocket-based media bridge that tunnels through HTTPS.'
        },
        {
          scenario: 'A meeting with 1000 participants exhausts the SFU server memory from maintaining connection state for each stream.',
          impact: 'The SFU crashes or becomes unresponsive, dropping all participants from the meeting simultaneously.',
          mitigation: 'Use a cascaded SFU architecture where multiple SFUs share the load; limit active video senders to a configurable cap (e.g., 49).'
        },
        {
          scenario: 'Clock drift between the recording service and the live meeting causes audio/video desync in the recording.',
          impact: 'The recorded meeting has misaligned audio and video tracks, making it difficult to review.',
          mitigation: 'Embed NTP-synchronized timestamps in each media packet; re-align tracks during post-processing based on packet timestamps.'
        }
      ],

      tradeoffs: [
        {
          decision: 'SFU (Selective Forwarding Unit) vs MCU (Multipoint Control Unit) architecture.',
          pros: 'SFU uses far less server CPU because it forwards streams without decoding/re-encoding, scaling to more participants.',
          cons: 'Each client must decode multiple streams independently, increasing client-side CPU; bandwidth grows linearly with participants.',
          recommendation: 'Use SFU for most meetings; offer MCU mode for very large meetings (100+) where clients cannot handle many streams.'
        },
        {
          decision: 'WebRTC vs custom media protocol.',
          pros: 'WebRTC is browser-native, battle-tested, and handles NAT traversal, encryption, and codec negotiation out of the box.',
          cons: 'Less control over congestion control algorithms and codec selection; harder to implement custom features like server-side noise cancellation.',
          recommendation: 'Use WebRTC as the foundation; extend with custom signaling and SFU logic where fine-grained control is needed.'
        },
        {
          decision: 'Peer-to-peer for small meetings vs always routing through an SFU.',
          pros: 'P2P eliminates server infrastructure costs and reduces latency for 1:1 or small (2-3 person) calls.',
          cons: 'P2P cannot support features like server-side recording, and quality degrades as participant count increases.',
          recommendation: 'Use P2P for 1:1 calls; route through the SFU for 3+ participants or when recording/transcription is enabled.'
        }
      ],

      layeredDesign: [
        {
          name: 'Signaling Layer',
          purpose: 'Handles meeting setup, participant discovery, and SDP offer/answer exchange for WebRTC connection establishment.',
          components: ['Signaling server (WebSocket)', 'Room manager', 'ICE candidate broker', 'Authentication service']
        },
        {
          name: 'Media Transport Layer',
          purpose: 'Routes audio and video streams between participants via the SFU with adaptive quality selection.',
          components: ['SFU cluster', 'TURN relay servers', 'Simulcast layer selector', 'Bandwidth estimator']
        },
        {
          name: 'Media Processing Layer',
          purpose: 'Applies real-time transformations like noise suppression, virtual backgrounds, and recording capture.',
          components: ['Noise suppression engine', 'Background segmentation ML model', 'Recording service', 'Transcription pipeline']
        },
        {
          name: 'Application Layer',
          purpose: 'Provides meeting features beyond audio/video including chat, reactions, screen sharing, and breakout rooms.',
          components: ['Chat service', 'Screen share handler', 'Breakout room manager', 'Polling/reactions service']
        }
      ]
    },
    {
      id: 'linkedin',
      title: 'LinkedIn',
      subtitle: 'Professional Network',
      icon: 'briefcase',
      color: '#0a66c2',
      difficulty: 'Hard',
      description: 'Design a professional networking platform with connections and job search.',

      introduction: `LinkedIn combines a social graph with professional data to power networking, job matching, and content discovery. With 900M members and 100B+ connections, the graph operations are the core technical challenge.

Key features include connection degree computation (1st/2nd/3rd), job-candidate matching, and a feed that balances engagement with professional relevance.`,

      functionalRequirements: [
        'User profiles with work history, skills, education',
        'Connection requests and networking',
        'Connection degrees (1st, 2nd, 3rd)',
        'Professional feed with posts and articles',
        'Job postings and applications',
        'Messaging between members',
        'Search for people, jobs, companies, content',
        'Recommendations (jobs, connections, skills)'
      ],

      nonFunctionalRequirements: [
        'Support 900M+ members',
        'Store 100B+ connections (edges)',
        'Compute 2nd-degree connections in real-time',
        'Job recommendations personalized per user',
        'Feed refresh < 500ms',
        'Search results < 200ms',
        '99.99% availability'
      ],

      dataModel: {
        description: 'Members, connections, jobs, and content',
        schema: `members {
  id: bigint PK
  name: varchar(200)
  headline: varchar(300)
  location: varchar(100)
  industry: varchar(100)
  profile_photo_url: varchar(500)
  skills: varchar[] -- for skill matching
}

experiences {
  id: bigint PK
  member_id: bigint FK
  company_id: bigint FK
  title: varchar(200)
  start_date: date
  end_date: date nullable
  description: text
}

connections {
  member_id: bigint
  connected_member_id: bigint
  connected_at: timestamp
  PK (member_id, connected_member_id)
  -- Bidirectional: store both directions
}

jobs {
  id: bigint PK
  company_id: bigint FK
  title: varchar(200)
  location: varchar(100)
  description: text
  skills_required: varchar[]
  experience_level: varchar(50)
  posted_at: timestamp
  status: enum(OPEN, CLOSED, FILLED)
}

posts {
  id: bigint PK
  author_id: bigint FK
  content: text
  media_urls: varchar[]
  posted_at: timestamp
  like_count: int
  comment_count: int
}`
      },

      apiDesign: {
        description: 'Profile, network, jobs, and feed APIs',
        endpoints: [
          { method: 'GET', path: '/api/members/:id', params: '-', response: '{ member, experiences[], skills[] }' },
          { method: 'GET', path: '/api/network/connections', params: 'degree, limit, offset', response: '{ connections[], totalCount }' },
          { method: 'POST', path: '/api/network/connect', params: '{ memberId, message }', response: '{ requestId }' },
          { method: 'GET', path: '/api/jobs/search', params: 'keywords, location, experience', response: '{ jobs[], totalCount }' },
          { method: 'GET', path: '/api/jobs/recommended', params: '-', response: '{ jobs[] } (personalized)' },
          { method: 'GET', path: '/api/feed', params: 'cursor', response: '{ posts[], nextCursor }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we compute connection degrees?',
          answer: `**Connection Degrees**:
\`\`\`
1st degree: Direct connections (friends)
2nd degree: Friends of friends
3rd degree: Friends of friends of friends

"You and John have 15 mutual connections"
\`\`\`

**Challenge**:
\`\`\`
User with 500 connections:
  1st degree: 500 (stored)
  2nd degree: 500 × 500 = 250,000 (not stored!)
  3rd degree: 250,000 × 500 = 125M (way too many)

Can't precompute 2nd/3rd degree for everyone
\`\`\`

**Solution: Real-time Computation**
\`\`\`
// Finding 2nd degree connections
def get_2nd_degree(user_id, limit=100):
    # Get my connections
    my_connections = get_connections(user_id)  # ~500

    # Get their connections (batched)
    second_degree = Set()
    for batch in chunk(my_connections, 50):
        connections_of_connections = get_connections_batch(batch)
        second_degree.update(connections_of_connections)

    # Remove my 1st degree and myself
    second_degree -= my_connections
    second_degree.remove(user_id)

    return second_degree[:limit]
\`\`\`

**Mutual Connections**:
\`\`\`
// "You and John have 15 mutual connections"
def get_mutual_connections(user_a, user_b):
    connections_a = get_connections(user_a)
    connections_b = get_connections(user_b)
    return connections_a.intersection(connections_b)

// Can be computed in Redis with SINTER
SINTER connections:user_a connections:user_b
\`\`\`

**Graph Database Option**:
\`\`\`
// LinkedIn uses custom graph DB (Liquid)
// Can query: "2nd degree with skill:Python"

MATCH (me:Member {id: 123})-[:CONNECTED_TO]->
      (friend)-[:CONNECTED_TO]->(stranger)
WHERE "Python" IN stranger.skills
RETURN stranger LIMIT 100
\`\`\``
        },
        {
          question: 'How does job-candidate matching work?',
          answer: `**Two-Sided Matching**:
\`\`\`
Jobs → Candidates (recruiter search)
Candidates → Jobs (job recommendations)

Both need efficient, relevant matching
\`\`\`

**Feature Extraction**:
\`\`\`
Job Features:
  - Required skills (normalized)
  - Experience level (0-5 scale)
  - Location
  - Industry
  - Company size
  - Job function embedding (from description)

Candidate Features:
  - Skills (from profile + endorsements)
  - Years of experience
  - Current/past titles
  - Location + willingness to relocate
  - Industry experience
  - Career trajectory embedding
\`\`\`

**Matching Score**:
\`\`\`
score(job, candidate) =
    skill_match × 0.4 +
    experience_match × 0.2 +
    location_match × 0.15 +
    industry_match × 0.1 +
    title_similarity × 0.1 +
    ml_score × 0.05

skill_match = |job.skills ∩ candidate.skills| / |job.skills|
\`\`\`

**ML Enhancement**:
\`\`\`
Train on historical data:
  - Which jobs did similar candidates apply to?
  - Which candidates did similar jobs hire?
  - Click-through and apply rates

Embedding Model:
  - Encode job description → vector
  - Encode candidate profile → vector
  - Similarity = cosine(job_vec, candidate_vec)
\`\`\`

**Indexing for Search**:
\`\`\`
Elasticsearch for filtering:
  - Location, skills, experience (structured filters)
  - Full-text search on titles and descriptions

Then re-rank top 1000 with ML model
\`\`\``
        },
        {
          question: 'How does the LinkedIn feed work?',
          answer: `**Feed Content Sources**:
\`\`\`
1. Connection activity (posts, new jobs, work anniversaries)
2. Followed companies/influencers
3. Sponsored content (ads)
4. Recommended posts (viral, relevant)
5. Job recommendations
\`\`\`

**Fan-out Strategy** (similar to Facebook):
\`\`\`
On post creation:
  - Connections < 10K: Push to connections' feeds
  - Influencers > 10K: Pull at read time

Why different?
  - Most users have < 500 connections (push is fine)
  - Influencers would create too many writes
\`\`\`

**Ranking Signals**:
\`\`\`
┌────────────────────────────────────────────────────────┐
│               Feed Ranking Factors                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Content Quality:                                     │
│     - Engagement (likes, comments, shares)             │
│     - Dwell time on similar content                    │
│     - Author credibility                               │
│                                                        │
│   Relevance:                                           │
│     - Shared skills/industry with author               │
│     - Connection strength (frequent interactions)      │
│     - Topic relevance to your interests                │
│                                                        │
│   Freshness:                                           │
│     - Time decay (newer = better)                      │
│     - But don't show same content repeatedly           │
│                                                        │
│   Business Goals:                                      │
│     - Mix in sponsored content                         │
│     - Show job recommendations                         │
│     - Promote engagement (comments > likes)            │
│                                                        │
└────────────────────────────────────────────────────────┘
\`\`\`

**"Who Viewed Your Profile"**:
\`\`\`
Async processing pipeline:
  Profile view → Kafka → View Counter Service

Store recent viewers:
  profile_views {
    viewed_member_id
    viewer_member_id
    viewed_at
    viewer_degree (1st, 2nd, 3rd)
  }

Privacy: Option to view anonymously (hides viewer)
\`\`\``
        }
      ],

      basicImplementation: {
        title: 'Simple Professional Network',
        description: 'Basic profiles and connections',
        svgTemplate: 'linkedin',
        architecture: `
┌─────────────────────────────────────────────────────────────┐
│                  Basic LinkedIn Clone                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Client → API Server → PostgreSQL                          │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│       │ Profiles │   │Connections│   │  Jobs   │            │
│       └──────────┘   └──────────┘   └──────────┘            │
│                                                             │
│   2nd degree = SQL subquery (slow)                          │
│   Search = SQL LIKE (very slow)                             │
│   Feed = Sort by time (no ranking)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘`,
        problems: [
          '2nd degree queries are O(N²)',
          'SQL search doesn\'t scale',
          'No personalization in feed',
          'No job matching'
        ]
      },

      advancedImplementation: {
        title: 'Production LinkedIn Architecture',
        svgTemplate: 'linkedinAdvanced',
        architecture: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LinkedIn Platform                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Profile Service                    │                   │
│   │                                                     │                   │
│   │   Client → API Gateway → Profile Service            │                   │
│   │                               │                     │                   │
│   │              ┌────────────────┴────────────┐        │                   │
│   │              ▼                             ▼        │                   │
│   │   ┌──────────────────┐          ┌──────────────────┐│                   │
│   │   │ PostgreSQL       │          │ Elasticsearch    ││                   │
│   │   │ (profile data)   │          │ (search index)   ││                   │
│   │   └──────────────────┘          └──────────────────┘│                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Graph Service                      │                   │
│   │                                                     │                   │
│   │   ┌─────────────────────────────────────────────┐   │                   │
│   │   │            Graph Database (Liquid)          │   │                   │
│   │   │                                             │   │                   │
│   │   │   - 900M member nodes                       │   │                   │
│   │   │   - 100B connection edges                   │   │                   │
│   │   │   - Real-time 2nd degree queries            │   │                   │
│   │   │   - "People You May Know" computation       │   │                   │
│   │   │                                             │   │                   │
│   │   └─────────────────────────────────────────────┘   │                   │
│   │                                                     │                   │
│   │   Redis: Connection sets for fast mutual lookup     │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Jobs Service                       │                   │
│   │                                                     │                   │
│   │   ┌──────────────────┐   ┌──────────────────┐       │                   │
│   │   │ Elasticsearch    │   │ ML Ranking       │       │                   │
│   │   │ (job search)     │──►│ Service          │       │                   │
│   │   └──────────────────┘   └──────────────────┘       │                   │
│   │          │                        │                 │                   │
│   │          └────────────────────────┘                 │                   │
│   │                    │                                │                   │
│   │                    ▼                                │                   │
│   │   Candidate-Job matching: Skill overlap + ML        │                   │
│   │   Recommendations: Collaborative filtering          │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Feed Service                       │                   │
│   │                                                     │                   │
│   │   Post → Kafka → Fan-out Workers                    │                   │
│   │                        │                            │                   │
│   │              ┌─────────┴─────────┐                  │                   │
│   │              ▼                   ▼                  │                   │
│   │   ┌──────────────────┐   ┌──────────────────┐       │                   │
│   │   │ Redis            │   │ Ranking Service  │       │                   │
│   │   │ (feed cache)     │   │ (ML + rules)     │       │                   │
│   │   └──────────────────┘   └──────────────────┘       │                   │
│   │                                                     │                   │
│   │   Mix: Connection posts + Sponsored + Recommended   │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────┐                   │
│   │                  Messaging Service                  │                   │
│   │                                                     │                   │
│   │   WebSocket → Message Router → Kafka → Storage      │                   │
│   │                                                     │                   │
│   │   Similar to Slack/chat system design               │                   │
│   │                                                     │                   │
│   └─────────────────────────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`,
        keyPoints: [
          'Custom graph database for connection queries',
          'Redis for fast connection set operations',
          'Elasticsearch for search with ML re-ranking',
          'Hybrid fan-out for feed (push small, pull large)',
          'ML models for job matching and recommendations'
        ]
      },

      discussionPoints: [
        {
          topic: 'People You May Know (PYMK)',
          points: [
            'Based on mutual connections (triadic closure)',
            'Same company, school, location signals',
            'Avoid recommending blocked/rejected',
            'Collaborative filtering from similar users'
          ]
        },
        {
          topic: 'Skill Endorsements',
          points: [
            'Endorser credibility matters (do they know you?)',
            'Weight by endorser\'s expertise in skill',
            'Prevent gaming (rate limiting)',
            'Used in job matching signals'
          ]
        },
        {
          topic: 'Privacy Considerations',
          points: [
            'Anonymous profile viewing option',
            'Who can see your connections',
            'Data export (GDPR compliance)',
            'InMail limits and blocking'
          ]
        }
      ],

      // Backward compatibility
      requirements: ['User profiles', 'Connections (1st/2nd/3rd degree)', 'Feed', 'Jobs', 'Messaging', 'Search', 'Recommendations'],
      components: ['Profile service', 'Graph service', 'Feed service', 'Job service', 'Search (Elasticsearch)', 'Messaging', 'Recommendation engine'],
      keyDecisions: [
        'Social graph: Store connections, compute degrees on-demand',
        'Feed: Mix of connection activity + sponsored + recommendations',
        'Job matching: ML model on skills, experience, preferences',
        'Search: People + jobs + companies + content',
        '"Who viewed your profile": Async processing of view events'
      ],

      edgeCases: [
        {
          scenario: 'A user with 30,000 first-degree connections posts an update, triggering massive fan-out to all connection feeds.',
          impact: 'The feed service experiences a write amplification spike, slowing down feed generation for other users.',
          mitigation: 'Use a hybrid fan-out model: fan-out on write for users with fewer than 5,000 connections, fan-out on read for power users and influencers.'
        },
        {
          scenario: 'A recruiter searches for candidates with a very common skill set (e.g., "Python developer in San Francisco").',
          impact: 'The search query returns millions of results, causing slow response times and an overwhelming results page.',
          mitigation: 'Apply progressive filtering with facets; cap result sets and rank by relevance score combining profile completeness, activity recency, and connection proximity.'
        },
        {
          scenario: 'A user sets their profile to anonymous viewing mode and browses thousands of profiles programmatically.',
          impact: 'The scraping activity goes undetected because anonymous mode hides the viewer, enabling data harvesting at scale.',
          mitigation: 'Rate-limit profile view events per user regardless of anonymity mode; detect bot-like patterns (e.g., 100+ views per minute) and challenge with CAPTCHA.'
        },
        {
          scenario: 'Two users send connection requests to each other simultaneously before either request is processed.',
          impact: 'The system may create duplicate connection records or fail to recognize the mutual request.',
          mitigation: 'Use an idempotent upsert on the connection table with a canonical ordering of user IDs; treat simultaneous requests as a single accepted connection.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Graph database vs relational database for the social connection graph.',
          pros: 'Graph databases excel at multi-hop traversals (2nd/3rd degree connections) with constant-time neighbor lookups.',
          cons: 'Graph databases are harder to scale horizontally and have less mature tooling for analytics and reporting.',
          recommendation: 'Use a graph database (or adjacency list in memory) for real-time connection traversals; replicate to a relational warehouse for analytics.'
        },
        {
          decision: 'Pre-computed feed vs real-time feed assembly on request.',
          pros: 'Pre-computed feeds provide instant page loads without expensive real-time aggregation at read time.',
          cons: 'Expensive write amplification when popular users post; feeds can become stale between updates.',
          recommendation: 'Pre-compute feeds for active users and store in Redis; assemble on-demand for inactive users who rarely check their feed.'
        },
        {
          decision: 'Full-text search vs structured attribute search for people and jobs.',
          pros: 'Full-text search handles natural language queries like "senior engineer at FAANG in NYC" naturally.',
          cons: 'Less precise for structured filters (exact company, degree, years of experience); harder to apply strict boolean logic.',
          recommendation: 'Combine both: use Elasticsearch with structured fields for faceted filtering and full-text scoring for relevance ranking.'
        }
      ],

      layeredDesign: [
        {
          name: 'Profile and Identity Layer',
          purpose: 'Manages user profiles, authentication, privacy settings, and professional identity data.',
          components: ['Profile service', 'Auth service', 'Privacy manager', 'Profile completeness scorer']
        },
        {
          name: 'Social Graph Layer',
          purpose: 'Stores and traverses the connection graph for degree calculations, recommendations, and mutual connections.',
          components: ['Graph service', 'Connection manager', 'PYMK recommendation engine', 'Degree calculator']
        },
        {
          name: 'Feed and Content Layer',
          purpose: 'Aggregates, ranks, and delivers the personalized news feed combining organic posts and sponsored content.',
          components: ['Feed generator', 'Ranking service', 'Sponsored content mixer', 'Feed cache (Redis)']
        },
        {
          name: 'Jobs and Matching Layer',
          purpose: 'Powers job search, candidate matching, and recruiter tools using ML-based relevance scoring.',
          components: ['Job search index', 'Candidate matcher', 'Recruiter dashboard', 'Job alert service']
        },
        {
          name: 'Messaging Layer',
          purpose: 'Provides real-time messaging including InMail, connection messages, and group conversations.',
          components: ['Message service', 'WebSocket gateway', 'InMail quota manager', 'Notification dispatcher']
        }
      ]
    },
    {
      id: 'ad-click-aggregation',
      isNew: true,
      title: 'Ad Click Event Aggregation',
      subtitle: 'Google Ads',
      icon: 'barChart',
      color: '#ef4444',
      difficulty: 'Hard',
      description: 'Design a system that aggregates billions of ad click events in real-time for billing, analytics, and fraud detection.',

      introduction: `Ad click aggregation is a critical system at companies like Google, Facebook, and Amazon where advertising revenue depends on accurate click counting. The system must handle billions of events per day, aggregate them in near real-time, and ensure no click is lost or double-counted.

The key challenges are: handling massive write throughput, ensuring exactly-once processing for billing accuracy, detecting click fraud in real-time, and providing low-latency query results for advertisers.`,

      functionalRequirements: [
        'Ingest ad click events in real-time (billions per day)',
        'Aggregate clicks by ad_id, campaign_id, advertiser in time windows',
        'Support multiple aggregation windows (1-min, 5-min, 1-hour, daily)',
        'Provide real-time dashboard for advertisers',
        'Detect and filter fraudulent clicks',
        'Support billing reconciliation queries',
        'Handle late-arriving events gracefully'
      ],

      nonFunctionalRequirements: [
        'Handle 10K+ click events per second',
        'Exactly-once processing for billing accuracy',
        'Aggregation latency < 1 minute',
        'Query latency < 500ms for dashboard',
        '99.99% availability',
        'No data loss (durability guarantee)'
      ],

      dataModel: {
        description: 'Click events and aggregated results',
        schema: `click_events (Kafka topic) {
  click_id: uuid
  ad_id: bigint
  campaign_id: bigint
  advertiser_id: bigint
  user_id: bigint (hashed)
  timestamp: bigint (epoch ms)
  ip_address: varchar
  user_agent: varchar
  geo: varchar
}

aggregated_clicks (OLAP store) {
  ad_id: bigint
  window_start: timestamp
  window_size: enum(1MIN, 5MIN, 1HR, 1DAY)
  click_count: bigint
  unique_users: bigint (HyperLogLog)
  spend: decimal
  filtered_count: bigint (fraud)
}`
      },

      apiDesign: {
        description: 'Click ingestion and aggregation query endpoints',
        endpoints: [
          { method: 'POST', path: '/api/clicks', params: '{ adId, userId, timestamp, metadata }', response: '202 Accepted' },
          { method: 'GET', path: '/api/aggregation/:adId', params: 'windowSize, startTime, endTime', response: '{ windows: [{ start, clickCount, spend }] }' },
          { method: 'GET', path: '/api/campaigns/:campaignId/stats', params: 'granularity, dateRange', response: '{ totalClicks, totalSpend, ctr, fraudRate }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we handle exactly-once processing?',
          answer: `**The Challenge**: Clicks must be counted exactly once for accurate billing.

**Solution: Kafka + Idempotent Consumers**:
- Each click event has a unique click_id
- Kafka provides at-least-once delivery
- Consumer deduplicates using click_id in a Redis set (TTL 24h)
- Flink/Spark Streaming with checkpointing for fault tolerance

**Watermark Strategy for Late Events**:
- Use event-time processing with watermarks
- Allow up to 5 minutes of late data
- Late events trigger incremental aggregation updates
- Very late events (>5 min) go to a dead letter queue for manual reconciliation`
        },
        {
          question: 'How do we detect click fraud?',
          answer: `**Real-time Fraud Detection Pipeline**:

**Rule-based filters** (inline, low latency):
- Same user clicking same ad > 5 times in 1 minute
- Click-through rate anomaly (>10x normal)
- Known bot user-agents
- Data center IP ranges

**ML-based detection** (near real-time):
- Feature extraction: click patterns, timing, device fingerprint
- Trained model flags suspicious clicks with confidence score
- Clicks below threshold are filtered before aggregation

**Architecture**: Click -> Kafka -> Fraud Filter (rules) -> Clean Stream -> Aggregator
                                   -> ML Pipeline (async) -> Flag retrospectively`
        }
      ],

      requirements: ['Real-time click ingestion', 'Multi-window aggregation', 'Fraud detection', 'Billing reconciliation', 'Advertiser dashboard'],
      components: ['Kafka', 'Flink/Spark Streaming', 'Redis (dedup)', 'ClickHouse/Druid (OLAP)', 'ML Fraud Service'],
      keyDecisions: [
        'Kafka for durable, ordered event streaming',
        'Flink for exactly-once stream processing with watermarks',
        'ClickHouse for fast OLAP aggregation queries',
        'HyperLogLog for approximate unique user counts',
        'Two-stage fraud detection: rules (inline) + ML (async)'
      ],

      edgeCases: [
        {
          scenario: 'A click fraud bot generates millions of fake clicks from rotating IP addresses within seconds.',
          impact: 'Advertisers are billed for fraudulent clicks, eroding trust and potentially costing millions in invalid charges.',
          mitigation: 'Apply real-time rule-based filters (click velocity, device fingerprint) inline; run async ML models to detect sophisticated patterns and issue retroactive refunds.'
        },
        {
          scenario: 'Late-arriving click events arrive after the aggregation window has already closed and been billed.',
          impact: 'These clicks are either lost (undercounting revenue) or double-counted if naively reprocessed.',
          mitigation: 'Use watermarks with allowed lateness in the stream processor; maintain a reconciliation pipeline that adjusts aggregates for late events within a grace period.'
        },
        {
          scenario: 'A Kafka partition becomes temporarily unavailable, causing a gap in the click event stream.',
          impact: 'Aggregation results for the affected time window are incomplete, leading to inaccurate billing and reporting.',
          mitigation: 'Use Kafka replication factor of 3 with ISR-based writes; implement exactly-once semantics in Flink with checkpointing to replay from the last consistent offset.'
        },
        {
          scenario: 'An advertiser queries real-time dashboard during a massive click spike (e.g., Super Bowl ad).',
          impact: 'The OLAP database is overwhelmed by both write ingestion and read queries simultaneously, causing dashboard timeouts.',
          mitigation: 'Separate read and write paths: buffer writes through a staging layer and serve reads from pre-aggregated materialized views updated on a slight delay.'
        },
        {
          scenario: 'Time zone differences between global data centers cause the same click to be counted in different daily aggregation windows.',
          impact: 'Daily reports show inconsistent totals depending on which datacenter processed the event.',
          mitigation: 'Normalize all event timestamps to UTC at ingestion time; partition aggregation windows by UTC boundaries regardless of datacenter location.'
        }
      ],

      tradeoffs: [
        {
          decision: 'Exactly-once processing vs at-least-once with deduplication.',
          pros: 'Exactly-once guarantees in Flink eliminate the need for a separate dedup layer, simplifying the pipeline.',
          cons: 'Exactly-once requires frequent checkpointing which reduces throughput; adds complexity with two-phase commits to sinks.',
          recommendation: 'Use exactly-once for the billing pipeline where accuracy is critical; use at-least-once with idempotent writes for the analytics pipeline where slight overcounting is acceptable.'
        },
        {
          decision: 'Real-time stream aggregation vs micro-batch processing.',
          pros: 'True streaming provides sub-second latency for fraud detection and live dashboards.',
          cons: 'Streaming systems are harder to debug, test, and recover from failures compared to batch jobs.',
          recommendation: 'Use streaming (Flink) for real-time fraud detection and dashboard updates; run a parallel batch reconciliation job hourly to correct any stream processing errors.'
        },
        {
          decision: 'ClickHouse (column store) vs Druid for the OLAP aggregation layer.',
          pros: 'ClickHouse offers simpler operations, SQL compatibility, and excellent compression for time-series click data.',
          cons: 'Druid has better real-time ingestion and native support for approximate queries (HyperLogLog, sketches).',
          recommendation: 'Use ClickHouse for its SQL interface and operational simplicity; implement HyperLogLog as a custom aggregation function for unique user counts.'
        },
        {
          decision: 'Inline fraud filtering vs post-hoc fraud detection.',
          pros: 'Inline filtering prevents fraudulent clicks from ever being counted, protecting advertisers in real-time.',
          cons: 'Inline detection must be fast (< 10ms) so it can only use simple rules, missing sophisticated fraud patterns.',
          recommendation: 'Apply fast rule-based filters inline to catch obvious fraud; run ML-based detection asynchronously and issue billing adjustments for detected fraud within 24 hours.'
        }
      ],

      layeredDesign: [
        {
          name: 'Ingestion Layer',
          purpose: 'Captures billions of raw click events from ad servers and delivers them reliably to the processing pipeline.',
          components: ['Click event collector', 'Kafka topics (partitioned by ad_id)', 'Schema registry', 'Dead letter queue']
        },
        {
          name: 'Stream Processing Layer',
          purpose: 'Aggregates click events in real-time windows, deduplicates, and applies inline fraud detection rules.',
          components: ['Flink job cluster', 'Windowed aggregator', 'Dedup filter (Redis)', 'Rule-based fraud detector']
        },
        {
          name: 'Storage and Query Layer',
          purpose: 'Stores aggregated click data for fast analytical queries and advertiser-facing dashboards.',
          components: ['ClickHouse cluster', 'Materialized views', 'Query cache', 'Dashboard API']
        },
        {
          name: 'Reconciliation Layer',
          purpose: 'Runs periodic batch jobs to verify stream processing accuracy and apply retroactive fraud adjustments.',
          components: ['Batch reconciliation job (Spark)', 'ML fraud detection model', 'Billing adjustment service', 'Audit log']
        }
      ]
    },
    {
      id: 'autocomplete-system',
      isNew: true,
      title: 'Autocomplete System',
      subtitle: 'Google Search',
      icon: 'search',
      color: '#4285f4',
      difficulty: 'Hard',
      description: 'Design a typeahead/autocomplete system that suggests search queries as the user types.',

      introduction: `Autocomplete (typeahead) is a core feature of search engines like Google. As the user types each character, the system must return the top suggestions within milliseconds. The system must handle billions of search queries to learn popular completions and update suggestions as trends change.

The key data structure is a Trie (prefix tree) combined with frequency data. The challenge is serving suggestions with <100ms latency while the underlying data changes continuously.`,

      functionalRequirements: [
        'Return top-K suggestions for a given prefix',
        'Suggestions ranked by popularity/relevance',
        'Update suggestion rankings based on new searches',
        'Support personalized suggestions per user',
        'Handle multi-language input',
        'Filter inappropriate suggestions'
      ],

      nonFunctionalRequirements: [
        'Suggestion latency < 100ms (ideally < 50ms)',
        'Handle 100K+ queries per second',
        'Support 5 billion+ unique query strings',
        'Suggestions updated within minutes of trending',
        '99.99% availability'
      ],

      dataModel: {
        description: 'Trie structure with aggregated query frequencies',
        schema: `trie_nodes (distributed, in-memory) {
  prefix: varchar
  children: map<char, node_ref>
  top_k: list<{query, score}> -- cached top suggestions at each node
  is_terminal: boolean
}

query_frequencies (persistent) {
  query: varchar PK
  frequency: bigint
  last_updated: timestamp
  decay_score: float -- time-weighted popularity
}

trending_queries (real-time) {
  query: varchar
  window_count: bigint
  window_start: timestamp
}`
      },

      apiDesign: {
        description: 'Prefix search and query logging endpoints',
        endpoints: [
          { method: 'GET', path: '/api/suggest', params: 'prefix, limit=10, userId?', response: '{ suggestions: [{ query, score }] }' },
          { method: 'POST', path: '/api/queries', params: '{ query, userId }', response: '202 Accepted (async processing)' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does the Trie work for autocomplete?',
          answer: `**Trie with Cached Top-K**:
- Each node stores a prefix and pointers to children
- At each node, cache the top-K most popular completions
- On query "goo", traverse to node 'g'->'o'->'o' and return cached top-K
- This makes lookup O(prefix_length) regardless of total queries

**Updating Top-K**:
- When a search happens, increment frequency in a separate store
- Periodically (every few minutes) rebuild top-K caches
- Use a min-heap of size K at each node for efficient updates

**Memory Optimization**:
- Only cache top-K at popular prefix nodes (not every node)
- Use compressed tries (merge single-child chains)
- Shard trie by first 2 characters across servers`
        },
        {
          question: 'How do we handle trending queries?',
          answer: `**Time-Decay Scoring**:
- score = frequency * decay_factor^(hours_since_event)
- Recent searches weighted much higher than old ones
- A query searched 1000 times today ranks above one searched 5000 times last month

**Real-time Trending Pipeline**:
1. Search logs -> Kafka topic
2. Flink aggregates counts in sliding windows (5 min, 1 hour)
3. If current_rate > 10x historical_average, mark as trending
4. Trending queries get score boost in autocomplete
5. Trie nodes updated incrementally (not full rebuild)`
        }
      ],

      requirements: ['Prefix-based suggestions', 'Popularity ranking', 'Real-time trending', 'Personalization', 'Content filtering'],
      components: ['Trie (distributed, in-memory)', 'Kafka', 'Flink', 'Redis', 'Zookeeper (sharding)'],
      keyDecisions: [
        'Trie with cached top-K at each node for O(prefix_length) lookup',
        'Time-decay scoring to favor recent/trending queries',
        'Shard trie by prefix for horizontal scaling',
        'Separate read path (trie) from write path (log aggregation)',
        'Periodic trie rebuild with incremental trending updates'
      ],
      edgeCases: [
        { scenario: 'User types faster than suggestion round-trips complete', impact: 'Stale suggestions flash on screen for earlier prefixes, causing visual jitter', mitigation: 'Debounce requests by 50-100ms and discard responses whose prefix no longer matches the input field' },
        { scenario: 'Trending query spikes overwhelm trie rebuild pipeline', impact: 'New trending terms take minutes to surface, degrading perceived freshness', mitigation: 'Maintain a hot-path trending overlay that merges real-time Flink output with the static trie at query time' },
        { scenario: 'Offensive or harmful query surfaces in autocomplete', impact: 'Brand reputation damage and potential legal liability', mitigation: 'Maintain a blocklist filter applied at serving time, with an async ML classifier flagging new terms for review' },
        { scenario: 'High-cardinality prefix space exhausts in-memory trie capacity', impact: 'Out-of-memory crashes on trie servers or eviction of valid prefixes', mitigation: 'Only materialize trie nodes for prefixes exceeding a minimum frequency threshold and prune stale nodes periodically' },
        { scenario: 'Geographically biased suggestions due to global aggregation', impact: 'Users in one region see irrelevant trending topics from another region', mitigation: 'Shard trie data by region and blend local and global suggestion lists with configurable weight ratios' },
      ],
      tradeoffs: [
        { decision: 'Trie with cached top-K vs inverted index lookup', pros: 'Trie offers O(prefix_length) lookups; inverted index leverages existing search infra', cons: 'Trie requires significant memory; inverted index has higher latency for prefix matching', recommendation: 'Trie with cached top-K at each node for latency-critical autocomplete, backed by inverted index for long-tail queries' },
        { decision: 'Real-time trie updates vs periodic batch rebuild', pros: 'Real-time keeps suggestions fresh; batch rebuild is simpler and less error-prone', cons: 'Real-time adds complexity and risk of inconsistency; batch has minutes of staleness', recommendation: 'Periodic batch rebuild every few minutes with a real-time trending overlay for breaking queries' },
        { decision: 'Personalized vs global suggestions', pros: 'Personalization improves relevance; global is simpler and more cacheable', cons: 'Personalization requires per-user state and reduces cache hit rates', recommendation: 'Serve global suggestions by default with a lightweight personalization layer that re-ranks the top results per user' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Debounce keystrokes and manage suggestion display lifecycle', components: ['Input Debouncer', 'Suggestion Renderer', 'Local Cache'] },
        { name: 'API Gateway', purpose: 'Route prefix queries and enforce rate limiting', components: ['Load Balancer', 'Rate Limiter', 'Request Router'] },
        { name: 'Serving Layer', purpose: 'Traverse in-memory trie to return cached top-K suggestions', components: ['Distributed Trie', 'Trending Overlay', 'Personalization Re-ranker'] },
        { name: 'Aggregation Layer', purpose: 'Compute query frequencies and detect trending terms from search logs', components: ['Kafka', 'Flink Aggregator', 'Trending Detector'] },
        { name: 'Storage Layer', purpose: 'Persist raw query logs and aggregated frequency data for trie rebuilds', components: ['Query Frequency Store', 'S3 (Raw Logs)', 'ZooKeeper (Shard Config)'] },
      ],
    },
    {
      id: 'ecommerce-platform',
      isNew: true,
      title: 'E-Commerce Platform',
      subtitle: 'Amazon',
      icon: 'shoppingCart',
      color: '#ff9900',
      difficulty: 'Hard',
      description: 'Design a large-scale e-commerce platform supporting product catalog, search, cart, checkout, and order management.',

      introduction: `An e-commerce platform like Amazon handles millions of products, concurrent users, and transactions daily. The system must provide fast product search, reliable inventory management, seamless checkout, and real-time order tracking.

The key challenges include: maintaining inventory consistency under high concurrency, handling flash sales without overselling, providing personalized recommendations, and ensuring payment reliability across distributed services.`,

      functionalRequirements: [
        'Product catalog with categories, search, and filtering',
        'User accounts with addresses and payment methods',
        'Shopping cart with persistent state',
        'Checkout with inventory reservation and payment processing',
        'Order management with status tracking',
        'Product reviews and ratings',
        'Personalized recommendations',
        'Seller dashboard for inventory management'
      ],

      nonFunctionalRequirements: [
        'Search latency < 200ms',
        'Checkout completion < 3 seconds',
        'Handle 100K+ concurrent users during flash sales',
        'Zero overselling (inventory consistency)',
        '99.99% availability for checkout flow',
        'Support millions of products'
      ],

      dataModel: {
        description: 'Products, users, orders, and inventory',
        schema: `products {
  id: uuid PK
  seller_id: uuid FK
  name: varchar(500)
  description: text
  category_id: uuid FK
  price: decimal(10,2)
  images: varchar[]
  attributes: jsonb
  avg_rating: decimal(2,1)
  review_count: int
}

inventory {
  product_id: uuid FK
  warehouse_id: uuid FK
  quantity: int
  reserved: int -- held during checkout
  version: bigint -- optimistic locking
}

orders {
  id: uuid PK
  user_id: uuid FK
  status: enum(PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)
  items: jsonb
  total: decimal(10,2)
  payment_id: varchar
  shipping_address: jsonb
  created_at: timestamp
}

cart_items {
  user_id: uuid FK
  product_id: uuid FK
  quantity: int
  added_at: timestamp
}`
      },

      apiDesign: {
        description: 'Product, cart, and order endpoints',
        endpoints: [
          { method: 'GET', path: '/api/products/search', params: 'q, category, priceRange, rating, page', response: '{ products[], total, facets }' },
          { method: 'POST', path: '/api/cart/items', params: '{ productId, quantity }', response: '{ cartItem }' },
          { method: 'POST', path: '/api/checkout', params: '{ cartId, paymentMethod, shippingAddress }', response: '{ orderId, estimatedDelivery }' },
          { method: 'GET', path: '/api/orders/:id', params: '-', response: '{ order, trackingInfo }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we prevent overselling during flash sales?',
          answer: `**Inventory Reservation Pattern**:
1. User clicks "Buy" -> Reserve inventory (decrement available, increment reserved)
2. Reservation has TTL (e.g., 10 minutes)
3. Payment succeeds -> Confirm reservation (decrement reserved)
4. Payment fails or TTL expires -> Release reservation (decrement reserved, increment available)

**Implementation with Optimistic Locking**:
\`\`\`sql
UPDATE inventory
SET quantity = quantity - 1, version = version + 1
WHERE product_id = ? AND quantity > 0 AND version = ?
\`\`\`
If version mismatch, retry. If quantity = 0, sold out.

**For extreme flash sales (>10K TPS per item)**:
- Pre-shard inventory tokens into Redis
- Each token = right to purchase 1 unit
- LPOP from token list (atomic, O(1))
- Much faster than DB-level locking`
        },
        {
          question: 'How is the checkout flow designed?',
          answer: `**Saga Pattern for Distributed Checkout**:
1. **Reserve Inventory** -> Success -> Continue
2. **Process Payment** -> Success -> Continue
3. **Create Order** -> Success -> Continue
4. **Send Confirmation** -> Done

**Compensating Transactions** (if any step fails):
- Payment fails -> Release inventory reservation
- Order creation fails -> Refund payment + release inventory

**Why Saga over 2PC**:
- No distributed locks (better performance)
- Each service owns its data
- Eventual consistency is acceptable (user sees "Processing...")
- Compensating actions handle failures gracefully`
        }
      ],

      requirements: ['Product catalog', 'Search', 'Cart', 'Checkout', 'Inventory management', 'Order tracking', 'Recommendations'],
      components: ['Product Service', 'Search (Elasticsearch)', 'Cart Service (Redis)', 'Order Service', 'Payment Service', 'Inventory Service', 'Recommendation Engine'],
      keyDecisions: [
        'Microservices architecture with Saga pattern for checkout',
        'Elasticsearch for product search with faceted filtering',
        'Redis for cart persistence and inventory token pre-sharding',
        'Optimistic locking for inventory consistency',
        'Event-driven architecture for order status updates'
      ],
      edgeCases: [
        { scenario: 'Flash sale triggers thousands of concurrent purchases for a single item', impact: 'Inventory count goes negative or database locks cause checkout timeouts', mitigation: 'Pre-shard inventory tokens into Redis and use atomic LPOP so each token represents one purchasable unit' },
        { scenario: 'Payment succeeds but order service is temporarily unreachable', impact: 'Customer is charged but sees no order confirmation, generating support tickets', mitigation: 'Use the Saga pattern with compensating transactions and a persistent outbox to retry order creation' },
        { scenario: 'User adds item to cart but price changes before checkout', impact: 'Customer anger if charged more, revenue loss if charged less than current price', mitigation: 'Re-validate price at checkout time and show a clear notification if the price has changed since carting' },
        { scenario: 'Elasticsearch index lags behind the product catalog database', impact: 'Newly listed products are invisible to search, or deleted products still appear', mitigation: 'Use CDC from the products table to Kafka and near-real-time indexing, with a fallback database query for very recent items' },
        { scenario: 'Cart session expires while user is mid-checkout', impact: 'User loses cart contents and abandons the purchase entirely', mitigation: 'Persist cart server-side keyed by user ID with a generous TTL and restore automatically on next login' },
      ],
      tradeoffs: [
        { decision: 'Microservices vs monolith for e-commerce', pros: 'Microservices allow independent scaling and deployment of catalog, cart, and order services', cons: 'Distributed transactions are complex and debugging cross-service issues is harder', recommendation: 'Microservices with Saga-based checkout for large-scale platforms, monolith for smaller shops' },
        { decision: 'Optimistic locking vs pessimistic locking for inventory', pros: 'Optimistic locking avoids holding DB locks and scales better under normal load', cons: 'High contention during flash sales causes excessive retry loops with optimistic locking', recommendation: 'Optimistic locking for normal traffic, Redis token pre-sharding for hot items during flash sales' },
        { decision: 'Elasticsearch vs database full-text search', pros: 'Elasticsearch provides fast faceted search and relevance scoring across millions of products', cons: 'Adds operational complexity and introduces index staleness risk', recommendation: 'Elasticsearch for primary product search with CDC-based near-real-time indexing from the source database' },
        { decision: 'Synchronous vs event-driven order processing', pros: 'Synchronous gives immediate feedback; event-driven decouples services and handles spikes', cons: 'Synchronous blocks on slow downstream services; event-driven adds latency and debugging difficulty', recommendation: 'Event-driven with Kafka for post-checkout processing, synchronous only for the initial inventory reservation' },
      ],
      layeredDesign: [
        { name: 'Presentation Layer', purpose: 'Serve product pages, cart UI, and checkout flow to end users', components: ['CDN', 'Web/Mobile Clients', 'API Gateway'] },
        { name: 'Application Layer', purpose: 'Orchestrate business logic across product, cart, order, and payment domains', components: ['Product Service', 'Cart Service', 'Order Service', 'Checkout Orchestrator'] },
        { name: 'Search Layer', purpose: 'Index and serve fast product search with faceted filtering', components: ['Elasticsearch Cluster', 'CDC Indexer', 'Query Parser'] },
        { name: 'Data Layer', purpose: 'Persist product catalog, inventory, orders, and user data with consistency guarantees', components: ['PostgreSQL (Orders)', 'Redis (Cart/Inventory Tokens)', 'S3 (Product Images)'] },
        { name: 'Event Layer', purpose: 'Decouple services and drive async workflows like notifications and analytics', components: ['Kafka', 'Order Event Consumers', 'Notification Service'] },
      ],
    },
    {
      id: 'messaging-app',
      isNew: true,
      title: 'Messaging App',
      subtitle: 'WhatsApp',
      icon: 'messageSquare',
      color: '#25d366',
      difficulty: 'Hard',
      description: 'Design a real-time messaging application supporting 1:1 chats, group messaging, read receipts, and end-to-end encryption.',

      introduction: `A messaging app like WhatsApp serves billions of messages daily with real-time delivery, end-to-end encryption, and offline message queuing. The system must handle high concurrency, ensure message ordering, and provide reliable delivery even when recipients are offline.

The key challenges are: maintaining persistent WebSocket connections at scale, ensuring message ordering and delivery guarantees, implementing efficient group messaging fan-out, and supporting media sharing with low latency.`,

      functionalRequirements: [
        'Send and receive text messages in real-time',
        'One-on-one and group chats (up to 256 members)',
        'Message delivery status (sent, delivered, read)',
        'Share images, videos, and documents',
        'Online/offline presence indicators',
        'Push notifications for offline users',
        'Message history and search',
        'End-to-end encryption'
      ],

      nonFunctionalRequirements: [
        'Message delivery latency < 500ms for online users',
        'Support 1 billion+ connected users simultaneously',
        'Handle 100 billion+ messages per day',
        'Zero message loss (at-least-once delivery)',
        'Message ordering guaranteed within a conversation',
        '99.99% availability'
      ],

      dataModel: {
        description: 'Users, conversations, and messages',
        schema: `users {
  user_id: uuid PK
  phone: varchar(20) UNIQUE
  display_name: varchar(100)
  avatar_url: varchar
  last_seen: timestamp
  public_key: text -- for E2E encryption
}

conversations {
  conversation_id: uuid PK
  type: enum(ONE_TO_ONE, GROUP)
  participants: uuid[]
  group_name: varchar (nullable)
  created_at: timestamp
}

messages {
  message_id: uuid PK
  conversation_id: uuid FK
  sender_id: uuid FK
  content: text (encrypted)
  media_url: varchar (nullable)
  type: enum(TEXT, IMAGE, VIDEO, DOCUMENT)
  timestamp: bigint (epoch ms)
  status: map<user_id, enum(SENT, DELIVERED, READ)>
}

-- Partitioned by conversation_id, sorted by timestamp`
      },

      apiDesign: {
        description: 'WebSocket for real-time messaging, REST for history',
        endpoints: [
          { method: 'WS', path: '/ws/chat', params: 'auth_token', response: 'Bidirectional message stream' },
          { method: 'POST', path: '/api/messages', params: '{ conversationId, content, type }', response: '{ messageId, timestamp }' },
          { method: 'GET', path: '/api/conversations/:id/messages', params: 'before, limit', response: '{ messages[], hasMore }' },
          { method: 'POST', path: '/api/groups', params: '{ name, participantIds }', response: '{ conversationId }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we handle message delivery for offline users?',
          answer: `**Message Queue per User**:
- Each user has a persistent message queue (Cassandra or Redis Streams)
- When sender sends message:
  1. Store in messages table
  2. Check if recipient is online (presence service)
  3. If online: push via WebSocket immediately
  4. If offline: queue message + trigger push notification

**On Reconnect**:
- Client sends last_received_message_id
- Server replays all queued messages since that ID
- Client ACKs each message -> server updates delivery status

**Why This Works**:
- No message loss even during network partitions
- Client-side dedup using message_id prevents duplicates
- Push notifications ensure user opens app to receive`
        },
        {
          question: 'How does group messaging scale?',
          answer: `**Fan-out on Write (for groups < 256)**:
- Sender sends message to group
- Server writes message once to messages table
- Server fans out to each participant:
  - Online: WebSocket push
  - Offline: Queue + push notification

**Optimization for Large Groups**:
- Don't fan-out immediately; use lazy delivery
- Store message in group timeline
- Each member pulls unread messages on connect
- Reduces write amplification for large groups

**Message Ordering**:
- Each message gets monotonically increasing sequence_id per conversation
- Client displays messages sorted by sequence_id
- Server uses Lamport timestamps for distributed ordering`
        }
      ],

      requirements: ['Real-time messaging', 'Group chats', 'Read receipts', 'Media sharing', 'Offline delivery', 'E2E encryption'],
      components: ['WebSocket Gateway', 'Message Service', 'Presence Service', 'Queue (Kafka)', 'Cassandra (messages)', 'Redis (presence/sessions)', 'Push Notification Service', 'Media Service (S3)'],
      keyDecisions: [
        'WebSocket for real-time bidirectional communication',
        'Cassandra for message storage (write-heavy, partitioned by conversation)',
        'Per-user message queue for reliable offline delivery',
        'Fan-out on write for small groups, lazy delivery for large groups',
        'Lamport timestamps for distributed message ordering'
      ],
      edgeCases: [
        { scenario: 'User sends a message while temporarily offline and reconnects', impact: 'Message appears sent on the sender device but never reaches the server or recipient', mitigation: 'Queue messages locally with a pending state and sync to the server on reconnect, using idempotent message IDs to prevent duplicates' },
        { scenario: 'WebSocket server crashes with thousands of active connections', impact: 'All connected users are disconnected and miss incoming messages until they reconnect', mitigation: 'Run multiple gateway instances behind a load balancer, persist undelivered messages in per-user queues, and auto-reconnect clients with exponential backoff' },
        { scenario: 'Group message fan-out to a 256-member group creates a write amplification spike', impact: 'Delivery latency increases and downstream queues back up during peak hours', mitigation: 'Use lazy delivery for large groups where members pull unread messages on connect rather than pushing to each individually' },
        { scenario: 'Clock skew between distributed servers causes message ordering issues', impact: 'Messages appear out of order in the conversation, confusing participants', mitigation: 'Use per-conversation monotonically increasing sequence IDs assigned by a single coordinator rather than relying on wall-clock timestamps' },
        { scenario: 'End-to-end encryption key rotation while messages are in transit', impact: 'Recipient cannot decrypt messages encrypted with the old key', mitigation: 'Include key version in message metadata and keep previous key versions cached on client for a grace period' },
      ],
      tradeoffs: [
        { decision: 'WebSocket vs long polling for real-time delivery', pros: 'WebSocket provides true bidirectional real-time communication with low overhead', cons: 'WebSocket connections are stateful and harder to load balance across servers', recommendation: 'WebSocket for primary delivery with long-polling fallback for restrictive network environments' },
        { decision: 'Fan-out on write vs fan-out on read for group messages', pros: 'Fan-out on write gives instant delivery; fan-out on read reduces write amplification', cons: 'Fan-out on write is expensive for large groups; fan-out on read adds read latency', recommendation: 'Fan-out on write for groups under 50 members, lazy pull-based delivery for larger groups' },
        { decision: 'Cassandra vs PostgreSQL for message storage', pros: 'Cassandra handles write-heavy workloads and scales horizontally; PostgreSQL offers stronger consistency', cons: 'Cassandra has eventual consistency and limited query flexibility; PostgreSQL has scaling limits', recommendation: 'Cassandra partitioned by conversation ID for message storage at billion-message scale' },
      ],
      layeredDesign: [
        { name: 'Client Layer', purpose: 'Manage local message queue, encryption, and WebSocket connection lifecycle', components: ['Message Queue (Local)', 'E2E Encryption Engine', 'WebSocket Client'] },
        { name: 'Gateway Layer', purpose: 'Maintain persistent connections and route messages to the correct recipients', components: ['WebSocket Gateway', 'Connection Registry', 'Load Balancer'] },
        { name: 'Message Layer', purpose: 'Process, validate, and persist messages while managing delivery state', components: ['Message Service', 'Delivery Tracker', 'Presence Service'] },
        { name: 'Queue Layer', purpose: 'Buffer messages for offline users and decouple real-time delivery from storage', components: ['Kafka', 'Per-User Offline Queue', 'Push Notification Service'] },
        { name: 'Storage Layer', purpose: 'Persist message history and media with efficient partitioning', components: ['Cassandra (Messages)', 'S3 (Media)', 'Redis (Sessions/Presence)'] },
      ],
    },
    {
      id: 'metrics-monitoring',
      isNew: true,
      title: 'Metrics Monitoring & Alerting',
      subtitle: 'Datadog',
      icon: 'activity',
      color: '#632ca6',
      difficulty: 'Medium',
      description: 'Design a metrics monitoring and alerting system that collects, stores, queries, and alerts on time-series data.',

      introduction: `A metrics monitoring system like Datadog or Prometheus collects time-series data from thousands of services, stores it efficiently, and enables real-time dashboards and alerting. The system must handle millions of data points per second while supporting flexible queries.

The key challenges are: efficient time-series storage with compression, fast aggregation queries across many metrics, reliable alerting with minimal false positives, and handling the cardinality explosion from high-dimensional tags.`,

      functionalRequirements: [
        'Collect metrics from agents on thousands of hosts',
        'Store time-series data with tags/labels',
        'Query metrics with aggregation (avg, sum, max, percentiles)',
        'Create dashboards with real-time updates',
        'Define alert rules with thresholds and conditions',
        'Send notifications via email, Slack, PagerDuty',
        'Support custom metrics from application code',
        'Metric retention policies (high-res recent, downsampled historical)'
      ],

      nonFunctionalRequirements: [
        'Ingest 10M+ data points per second',
        'Query latency < 1 second for dashboard queries',
        'Alert evaluation latency < 30 seconds',
        'Support 1M+ unique time series',
        '99.9% availability for alerting pipeline',
        'Store 13 months of data with downsampling'
      ],

      dataModel: {
        description: 'Time-series data points with tags',
        schema: `data_points {
  metric_name: varchar
  tags: map<string, string>  -- e.g. {host: web-01, region: us-east}
  timestamp: bigint (epoch seconds)
  value: double
}

-- Stored in time-series DB (InfluxDB/TimescaleDB/custom)
-- Partitioned by metric_name + time range
-- Compressed using delta-of-delta + XOR encoding

alert_rules {
  id: uuid PK
  name: varchar
  metric_query: varchar  -- e.g. "avg(cpu.usage){host:web-*} > 90"
  condition: enum(ABOVE, BELOW, ANOMALY)
  threshold: double
  window: interval  -- e.g. "5 minutes"
  severity: enum(WARNING, CRITICAL)
  notification_channels: varchar[]
  evaluation_interval: interval
}`
      },

      apiDesign: {
        description: 'Metric ingestion and query endpoints',
        endpoints: [
          { method: 'POST', path: '/api/metrics', params: '{ series: [{ metric, tags, points: [{ts, value}] }] }', response: '202 Accepted' },
          { method: 'GET', path: '/api/query', params: 'query, from, to, granularity', response: '{ series: [{ tags, datapoints }] }' },
          { method: 'POST', path: '/api/alerts', params: '{ name, query, condition, threshold, channels }', response: '{ alertId }' },
          { method: 'GET', path: '/api/alerts/:id/history', params: 'from, to', response: '{ events: [{ triggeredAt, resolvedAt, value }] }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How is time-series data stored efficiently?',
          answer: `**Time-Series Compression**:
- Delta-of-delta encoding for timestamps (most intervals are regular)
  - Raw: 1000, 1010, 1020, 1030
  - Delta: 10, 10, 10 -> Delta-of-delta: 0, 0, 0 (1-2 bits each!)
- XOR encoding for values (consecutive values often similar)
  - If values change slowly, XOR of consecutive values has many leading zeros
  - Store only the meaningful bits

**Storage Layout**:
- Data partitioned into time blocks (e.g., 2-hour chunks)
- Each block: metric_name + tag_set -> compressed data points
- Recent data in memory, older data on disk
- Downsampling: 1s resolution for 48h, 1m for 30d, 1h for 13mo

**Result**: 16 bytes/point raw -> ~1.4 bytes/point compressed (10x savings)`
        },
        {
          question: 'How does the alerting pipeline work?',
          answer: `**Alert Evaluation Flow**:
1. Alert Manager reads rules from config store
2. Every evaluation_interval, query the metrics store
3. Apply condition (e.g., avg > threshold for window)
4. State machine: OK -> PENDING -> FIRING -> RESOLVED

**Avoiding Alert Storms**:
- Evaluation window prevents single-spike alerts
- Hysteresis: different thresholds for trigger vs resolve
- Alert grouping: batch related alerts
- Rate limiting on notifications

**High Availability**:
- Multiple alert evaluators with leader election
- Only leader sends notifications (prevent duplicates)
- If leader dies, follower takes over within seconds
- All evaluators compute independently for consistency checking`
        }
      ],

      requirements: ['Metric collection', 'Time-series storage', 'Dashboard queries', 'Alerting', 'Downsampling', 'Notifications'],
      components: ['Collection Agents', 'Kafka (ingestion)', 'Time-Series DB', 'Query Engine', 'Alert Manager', 'Notification Service', 'Dashboard UI'],
      keyDecisions: [
        'Delta-of-delta + XOR compression for 10x storage savings',
        'Kafka for buffering high-throughput metric ingestion',
        'Partitioning by metric name + time range for query locality',
        'Downsampling pipeline for cost-effective long-term retention',
        'Leader-elected alert evaluators for exactly-once notifications'
      ],
      edgeCases: [
        { scenario: 'Metric ingestion spike during incident (monitoring itself)', impact: 'The monitoring system becomes overloaded exactly when it is needed most', mitigation: 'Separate ingestion and alerting pipelines, shed low-priority metrics under load, reserve capacity for alerts' },
        { scenario: 'Clock skew across reporting hosts', impact: 'Out-of-order timestamps create gaps or duplicates in time-series data', mitigation: 'Use server-receive timestamp as fallback, allow configurable late-arrival windows for reprocessing' },
        { scenario: 'Alert storm from cascading failures', impact: 'Thousands of alerts fire simultaneously, overwhelming on-call engineers', mitigation: 'Alert grouping by dependency graph, implement alert suppression for downstream effects of known root causes' },
        { scenario: 'High-cardinality labels explode storage', impact: 'Unique label combinations create millions of time series, exhausting storage', mitigation: 'Enforce cardinality limits per metric name, drop or aggregate high-cardinality labels automatically' },
      ],
      tradeoffs: [
        { decision: 'Push vs pull metric collection model', pros: 'Push handles ephemeral jobs; pull gives central control of scrape targets', cons: 'Push risks overwhelming the collector; pull requires service discovery', recommendation: 'Pull-based (Prometheus-style) for long-lived services, push gateway for short-lived batch jobs' },
        { decision: 'Lossy compression vs raw storage', pros: 'Compression gives 10x savings; raw preserves exact values', cons: 'Compression introduces quantization error; raw is expensive at scale', recommendation: 'Lossy downsampling for data older than 7 days, raw retention for recent data and alerting' },
        { decision: 'Single time-series DB vs federated instances', pros: 'Single instance simplifies queries; federated scales horizontally', cons: 'Single instance has throughput limits; federated complicates cross-instance queries', recommendation: 'Federated instances sharded by metric namespace with a query fanout layer for global views' },
      ],
      layeredDesign: [
        { name: 'Collection Layer', purpose: 'Gather metrics from diverse sources at scale', components: ['Collection Agents', 'Push Gateway', 'Service Discovery'] },
        { name: 'Ingestion Layer', purpose: 'Buffer and route incoming metric streams', components: ['Kafka (Ingestion Buffer)', 'Metric Router', 'Cardinality Enforcer'] },
        { name: 'Storage Layer', purpose: 'Persist time-series data with efficient compression', components: ['Time-Series DB', 'Downsampling Pipeline', 'Cold Storage Archive'] },
        { name: 'Query & Alert Layer', purpose: 'Execute dashboard queries and evaluate alert rules', components: ['Query Engine', 'Alert Evaluator', 'Notification Dispatcher', 'Dashboard API'] },
      ],
    },
    {
      id: 'payment-gateway',
      isNew: true,
      title: 'Payment Gateway',
      subtitle: 'Stripe',
      icon: 'creditCard',
      color: '#635bff',
      difficulty: 'Hard',
      description: 'Design a payment gateway that processes credit card transactions, handles settlements, and ensures financial consistency.',

      introduction: `A payment gateway like Stripe processes billions of dollars in transactions, connecting merchants to payment networks (Visa, Mastercard). The system must guarantee that money is never lost, double-charged, or incorrectly routed, even during failures.

The key challenges are: ensuring exactly-once payment processing with idempotency, handling the complex authorization/capture/settlement flow, managing PCI-DSS compliance for sensitive card data, and providing real-time fraud detection.`,

      functionalRequirements: [
        'Process credit/debit card payments',
        'Support authorization, capture, and refund flows',
        'Idempotent payment requests (prevent double charges)',
        'Multi-currency support with exchange rates',
        'Merchant onboarding and account management',
        'Transaction history and reporting',
        'Webhook notifications for payment events',
        'Support recurring payments and subscriptions'
      ],

      nonFunctionalRequirements: [
        'Payment processing latency < 2 seconds',
        'Zero financial discrepancies (strong consistency)',
        'PCI-DSS Level 1 compliance',
        '99.999% availability for payment processing',
        'Handle 10K+ transactions per second',
        'Full audit trail for all operations'
      ],

      dataModel: {
        description: 'Payments, merchants, and ledger entries',
        schema: `payments {
  id: uuid PK
  idempotency_key: varchar UNIQUE
  merchant_id: uuid FK
  amount: bigint (in cents)
  currency: varchar(3)
  status: enum(PENDING, AUTHORIZED, CAPTURED, SETTLED, REFUNDED, FAILED)
  card_token: varchar -- tokenized, never store raw card
  processor_ref: varchar -- payment network reference
  created_at: timestamp
  updated_at: timestamp
}

ledger_entries {
  id: uuid PK
  payment_id: uuid FK
  type: enum(DEBIT, CREDIT)
  account_id: uuid FK
  amount: bigint
  balance_after: bigint
  created_at: timestamp
}

merchants {
  id: uuid PK
  name: varchar
  settlement_account: varchar
  fee_rate: decimal(4,4) -- e.g. 0.029 = 2.9%
  webhook_url: varchar
}`
      },

      apiDesign: {
        description: 'Payment processing and merchant endpoints',
        endpoints: [
          { method: 'POST', path: '/api/payments', params: '{ amount, currency, cardToken, merchantId, idempotencyKey }', response: '{ paymentId, status, processorRef }' },
          { method: 'POST', path: '/api/payments/:id/capture', params: '{ amount? }', response: '{ status }' },
          { method: 'POST', path: '/api/payments/:id/refund', params: '{ amount? }', response: '{ refundId, status }' },
          { method: 'GET', path: '/api/merchants/:id/transactions', params: 'from, to, status, page', response: '{ transactions[], balance }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does idempotency prevent double charges?',
          answer: `**Idempotency Key Pattern**:
- Client includes unique idempotency_key with each request
- Server checks if key exists in database before processing
- If exists: return cached response (no reprocessing)
- If new: process payment, store result keyed by idempotency_key

**Implementation**:
\`\`\`
1. INSERT into idempotency_keys (key, status=PROCESSING)
2. If INSERT fails (duplicate) -> return cached result
3. Process payment with payment network
4. UPDATE idempotency_keys SET status=COMPLETE, response={...}
5. Return response to client
\`\`\`

**Edge Cases**:
- Client timeout + retry: idempotency key catches duplicate
- Server crash mid-processing: status=PROCESSING detected on retry, check with payment network
- Network error to payment network: mark as UNKNOWN, reconcile later`
        },
        {
          question: 'What is the payment processing flow?',
          answer: `**Two-Phase Payment Flow**:

**Phase 1: Authorization**
1. Merchant sends payment request
2. Gateway tokenizes card data (PCI compliance)
3. Send auth request to card network (Visa/MC)
4. Card network checks with issuing bank
5. Bank approves/declines, places hold on funds
6. Gateway returns auth result to merchant

**Phase 2: Capture & Settlement**
1. Merchant captures authorized payment (can be partial)
2. Gateway batches captured payments
3. Daily settlement: Gateway sends batch to acquirer
4. Acquirer settles with card networks
5. Funds transferred to merchant account (T+2 days)

**Double-Entry Ledger**:
Every payment creates balanced debit + credit entries:
- Authorization: Hold on customer account
- Capture: Debit customer, Credit merchant (pending)
- Settlement: Move from pending to available balance`
        }
      ],

      requirements: ['Card payment processing', 'Auth/capture/refund', 'Idempotency', 'Multi-currency', 'Fraud detection', 'Settlement'],
      components: ['API Gateway', 'Payment Processor', 'Card Network Interface', 'Ledger Service', 'Fraud Detection', 'Settlement Engine', 'Webhook Dispatcher'],
      keyDecisions: [
        'Idempotency keys for exactly-once payment processing',
        'Double-entry ledger for financial consistency',
        'Card tokenization for PCI-DSS compliance',
        'Two-phase auth/capture flow matching card network protocols',
        'Batch settlement with T+2 disbursement cycle'
      ],
      edgeCases: [
        { scenario: 'Duplicate payment submission from client retry', impact: 'Customer charged twice for the same transaction', mitigation: 'Enforce idempotency keys on every payment request, reject duplicate keys within a TTL window' },
        { scenario: 'Network timeout between gateway and card network', impact: 'Uncertain payment state where charge may or may not have occurred', mitigation: 'Implement payment status reconciliation with card network, query transaction status before retrying' },
        { scenario: 'Currency conversion rate changes mid-transaction', impact: 'Settled amount differs from authorized amount, causing merchant disputes', mitigation: 'Lock exchange rate at authorization time, use rate buffers for multi-currency transactions' },
        { scenario: 'Partial refund on a multi-item order', impact: 'Ledger entries become complex and reconciliation is error-prone', mitigation: 'Track refunds as separate ledger entries linked to original transaction, reconcile line-item level' },
        { scenario: 'Fraud detection blocks legitimate transaction', impact: 'Customer frustration and abandoned purchase', mitigation: 'Multi-factor step-up authentication for borderline fraud scores, allow manual override with verification' },
      ],
      tradeoffs: [
        { decision: 'Synchronous vs asynchronous payment processing', pros: 'Synchronous gives immediate confirmation; async handles high volume', cons: 'Synchronous blocks user; async complicates status communication', recommendation: 'Synchronous for authorization, asynchronous for settlement and reconciliation' },
        { decision: 'Build vs integrate card network connectivity', pros: 'Direct integration gives full control; third-party processors are faster to market', cons: 'Direct integration requires PCI Level 1; processors take a revenue cut', recommendation: 'Use processor (Stripe/Adyen) initially, build direct integration at scale for cost savings' },
        { decision: 'Single ledger vs double-entry bookkeeping', pros: 'Single is simpler to implement; double-entry ensures financial correctness', cons: 'Single ledger makes auditing difficult; double-entry doubles write volume', recommendation: 'Double-entry ledger is non-negotiable for financial systems, ensures every debit has a credit' },
      ],
      layeredDesign: [
        { name: 'API Layer', purpose: 'Accept payment requests with authentication and idempotency', components: ['Payment API', 'Idempotency Service', 'Auth Middleware', 'Rate Limiter'] },
        { name: 'Processing Layer', purpose: 'Orchestrate payment flow through authorization, capture, and settlement', components: ['Payment Orchestrator', 'Fraud Detection Engine', 'Currency Converter'] },
        { name: 'Integration Layer', purpose: 'Interface with card networks and banking systems', components: ['Card Network Gateway', 'Bank API Adapter', 'Tokenization Vault'] },
        { name: 'Ledger Layer', purpose: 'Record all financial transactions for reconciliation and auditing', components: ['Double-Entry Ledger', 'Settlement Engine', 'Reconciliation Service', 'Webhook Dispatcher'] },
      ],
    },
    {
      id: 'proximity-service',
      isNew: true,
      title: 'Proximity Service',
      subtitle: 'Yelp',
      icon: 'mapPin',
      color: '#d32323',
      difficulty: 'Medium',
      description: 'Design a proximity service that finds nearby businesses and points of interest based on user location.',

      introduction: `A proximity service powers the "find nearby" feature in apps like Yelp, Google Maps, and Uber. Given a user's location and a search radius, the system must efficiently return relevant nearby places from a database of hundreds of millions of businesses.

The key challenge is spatial indexing: naive distance calculations against every business would be too slow. Solutions like Geohash, Quadtree, and R-tree enable efficient spatial queries.`,

      functionalRequirements: [
        'Search businesses within a given radius of user location',
        'Return results sorted by distance or relevance',
        'Filter by category, rating, price range',
        'Add, update, and remove business locations',
        'Support variable search radii (0.5km to 50km)',
        'Return business details with distance from user'
      ],

      nonFunctionalRequirements: [
        'Search latency < 200ms',
        'Handle 100K+ proximity queries per second',
        'Support 200M+ businesses worldwide',
        'Business updates reflected within minutes',
        '99.9% availability'
      ],

      dataModel: {
        description: 'Business locations with geospatial indexing',
        schema: `businesses {
  id: uuid PK
  name: varchar(200)
  latitude: decimal(10,7)
  longitude: decimal(10,7)
  geohash: varchar(12) -- precomputed for fast lookup
  category_id: uuid FK
  avg_rating: decimal(2,1)
  price_range: int
}

-- Geohash Index (primary approach)
geohash_index {
  geohash_prefix: varchar(6) -- ~1.2km precision
  business_ids: uuid[] -- businesses in this cell
}

-- Alternative: Quadtree (in-memory)
quadtree_node {
  boundary: {lat_min, lat_max, lng_min, lng_max}
  businesses: list (if leaf, max 100 items)
  children: [NW, NE, SW, SE] (if internal node)
}`
      },

      apiDesign: {
        description: 'Proximity search endpoint',
        endpoints: [
          { method: 'GET', path: '/api/nearby', params: 'lat, lng, radius, category?, limit, page', response: '{ businesses: [{ id, name, distance, rating }], total }' },
          { method: 'GET', path: '/api/businesses/:id', params: '-', response: '{ business details }' },
          { method: 'PUT', path: '/api/businesses/:id/location', params: '{ latitude, longitude }', response: '{ updated geohash }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How does Geohash-based proximity search work?',
          answer: `**Geohash Encoding**:
- Divide world into grid cells, encode each cell as a string
- Longer string = more precise location
  - 4 chars: ~20km cell
  - 5 chars: ~5km cell
  - 6 chars: ~1.2km cell

**Search Algorithm**:
1. Compute geohash of user's location (e.g., "9q8yyk")
2. For given radius, determine required precision level
3. Find the user's cell + 8 neighboring cells (handles edge cases)
4. Query: WHERE geohash LIKE '9q8yy%' (prefix match on index)
5. Filter results by exact distance calculation
6. Sort by distance and return top results

**Why Neighbors Matter**:
- A business 100m away might be in an adjacent geohash cell
- Always query the 8 surrounding cells to avoid missing results
- This is cheap: only 9 prefix queries vs millions of distance calculations`
        },
        {
          question: 'Geohash vs Quadtree: which should we use?',
          answer: `**Geohash** (database-friendly):
- Pros: Works with standard DB indexes, easy to implement, cache-friendly
- Cons: Fixed grid (ocean cells same size as city cells)
- Best for: Read-heavy with database storage

**Quadtree** (memory-efficient):
- Pros: Adaptive density (more nodes where more businesses), efficient memory
- Cons: Harder to distribute, requires in-memory structure
- Best for: In-memory spatial index on single server

**Recommendation**: Use Geohash for most cases
- Store geohash in database, create B-tree index on prefix
- Combine with in-memory cache of popular areas
- Quadtree only if you need adaptive density and can fit data in memory`
        }
      ],

      requirements: ['Proximity search', 'Geospatial indexing', 'Category filtering', 'Business CRUD', 'Distance sorting'],
      components: ['Geohash Index', 'Business Service', 'Database (PostgreSQL + PostGIS)', 'Cache (Redis)', 'Load Balancer'],
      keyDecisions: [
        'Geohash for spatial indexing with standard database prefix queries',
        'Query user cell + 8 neighbors to avoid missing nearby results',
        'PostgreSQL with PostGIS for geospatial queries and indexing',
        'Redis cache for popular area queries',
        'Pre-computed geohash stored on business records for fast lookups'
      ],
      edgeCases: [
        { scenario: 'Geohash boundary splits nearby businesses into different cells', impact: 'Search misses businesses just across the boundary, giving incomplete results', mitigation: 'Query the target cell plus all 8 neighboring cells to cover boundary cases' },
        { scenario: 'Dense urban area with thousands of businesses per cell', impact: 'Single geohash cell returns too many results, slowing response', mitigation: 'Use finer-grained geohash precision in dense areas, apply distance-based filtering and pagination' },
        { scenario: 'Business location data is stale or incorrect', impact: 'Users are directed to wrong locations, eroding trust', mitigation: 'Cross-reference with map data providers, allow user-reported corrections, periodic data validation' },
        { scenario: 'Polar or equatorial region distortions', impact: 'Geohash cells vary in physical size at different latitudes, skewing radius searches', mitigation: 'Adjust geohash precision dynamically based on latitude, or use S2 geometry cells for uniform coverage' },
      ],
      tradeoffs: [
        { decision: 'Geohash vs Quadtree vs R-tree indexing', pros: 'Geohash is simple and database-friendly; Quadtree adapts to density; R-tree handles arbitrary shapes', cons: 'Geohash has boundary issues; Quadtree is harder to distribute; R-tree has complex rebalancing', recommendation: 'Geohash for most cases due to simplicity, Quadtree for variable-density datasets' },
        { decision: 'Pre-computed index vs real-time spatial queries', pros: 'Pre-computed gives instant lookups; real-time handles dynamic data', cons: 'Pre-computed requires rebuild on changes; real-time adds query latency', recommendation: 'Pre-computed geohash index with incremental updates on business location changes' },
        { decision: 'PostgreSQL PostGIS vs dedicated spatial database', pros: 'PostGIS leverages existing Postgres infrastructure; dedicated DB is optimized for spatial', cons: 'PostGIS has scaling limits for massive datasets; dedicated DB adds operational complexity', recommendation: 'PostGIS for moderate scale, consider dedicated spatial index (Elasticsearch geo) at large scale' },
      ],
      layeredDesign: [
        { name: 'API Layer', purpose: 'Accept search queries with location and filters', components: ['REST API', 'Rate Limiter', 'Geo Validator'] },
        { name: 'Search Layer', purpose: 'Execute spatial queries and rank results by distance', components: ['Geohash Index', 'Distance Calculator', 'Category Filter', 'Result Ranker'] },
        { name: 'Data Layer', purpose: 'Store and manage business location data', components: ['PostgreSQL + PostGIS', 'Redis (Hot Areas Cache)', 'Business CRUD Service'] },
      ],
    },
    {
      id: 'tiny-url',
      isNew: true,
      title: 'Tiny URL',
      subtitle: 'URL Shortener',
      icon: 'link',
      color: '#10b981',
      difficulty: 'Easy',
      description: 'Design a URL shortening service that creates compact aliases for long URLs and redirects users.',

      introduction: `Tiny URL is one of the most commonly asked system design questions. The simplicity of the product makes it ideal for exploring scalability, collision handling, and database design. The core challenge is generating unique short codes efficiently at scale.

Two main approaches exist: counter-based (using a distributed counter like ZooKeeper to assign ranges) and hash-based (MD5/SHA256 truncated). Each has trade-offs around collision probability, predictability, and coordination overhead.`,

      functionalRequirements: [
        'Given a long URL, generate a unique short URL',
        'Redirect short URL to the original long URL',
        'Optional custom aliases for short URLs',
        'URL expiration with configurable TTL',
        'Click analytics (count, geo, referrer)'
      ],

      nonFunctionalRequirements: [
        'Redirect latency < 50ms',
        'High availability (99.99%)',
        'Short URLs should not be predictable',
        'Scale to billions of URLs',
        '100:1 read-to-write ratio'
      ],

      dataModel: {
        description: 'URL mapping table',
        schema: `urls {
  short_code: varchar(7) PK
  long_url: varchar(2048)
  user_id: uuid (nullable)
  created_at: timestamp
  expires_at: timestamp (nullable)
  click_count: bigint DEFAULT 0
}`
      },

      apiDesign: {
        description: 'Simple create and redirect API',
        endpoints: [
          { method: 'POST', path: '/api/shorten', params: '{ longUrl, customAlias?, expiresIn? }', response: '{ shortUrl }' },
          { method: 'GET', path: '/:shortCode', params: '-', response: '301 Redirect to long URL' },
          { method: 'GET', path: '/api/stats/:shortCode', params: '-', response: '{ clicks, createdAt, expiresAt }' }
        ]
      },

      keyQuestions: [
        {
          question: 'How do we generate unique short codes?',
          answer: `**Approach 1: Counter + Base62 (Recommended)**
- Use ZooKeeper/Redis to allocate ID ranges to each server
- Each server independently converts counter to Base62
- 7 chars of Base62 = 62^7 = 3.5 trillion unique URLs
- No collisions, no coordination per request

**Approach 2: Hash-based**
- Hash long URL with MD5/SHA256, take first 7 chars (Base62)
- Collision possible: check DB, rehash if collision
- Simpler setup but collision handling adds complexity

**Base62 Encoding**:
- Characters: a-z (26) + A-Z (26) + 0-9 (10) = 62
- Counter 12345 -> Base62 "3d7"
- Avoids special characters that break URLs`
        },
        {
          question: 'Should we use 301 or 302 redirect?',
          answer: `**301 Permanent Redirect**:
- Browser caches the redirect
- Subsequent visits skip our server entirely
- Better for user latency
- Bad for analytics (can't count repeat visits)

**302 Temporary Redirect**:
- Browser always hits our server first
- Every visit is tracked
- Slightly more latency for users
- Better for analytics and expiring URLs

**Recommendation**: Use 302 if analytics matter, 301 if performance is priority. Many services use 302 by default for tracking.`
        }
      ],

      requirements: ['URL shortening', '301/302 redirect', 'Custom aliases', 'Expiration', 'Analytics'],
      components: ['API Servers', 'ZooKeeper (ID ranges)', 'Database (NoSQL)', 'Cache (Redis)', 'Analytics Service'],
      keyDecisions: [
        'Counter-based Base62 encoding with ZooKeeper range allocation',
        '7-character short codes for 3.5 trillion unique URLs',
        'NoSQL (Cassandra) for horizontal scaling of URL mappings',
        'Redis cache with LRU for popular URL redirects',
        '302 redirect for analytics tracking capability'
      ],
      edgeCases: [
        { scenario: 'Hash collision on short code generation', impact: 'Two long URLs map to the same short code, causing incorrect redirects', mitigation: 'Check for collision before storing, retry with next counter value or append salt' },
        { scenario: 'ZooKeeper range exhaustion under high load', impact: 'ID allocation blocks new URL creation until a fresh range is obtained', mitigation: 'Pre-fetch next range before current range is 80% consumed, maintain local buffer' },
        { scenario: 'Malicious URLs flagged after creation', impact: 'Short links redirect users to phishing or malware sites', mitigation: 'Async URL scanning with Google Safe Browsing API, interstitial warning page for flagged links' },
        { scenario: 'Expired URL recycled but cached in CDN', impact: 'Users still reach old destination from stale CDN entries', mitigation: 'Short TTL on redirect cache headers, purge CDN on expiration, include generation counter in key' },
      ],
      tradeoffs: [
        { decision: 'Counter-based vs hash-based short codes', pros: 'Counters are sequential and collision-free; hashes are stateless', cons: 'Counters need coordination (ZooKeeper); hashes risk collisions', recommendation: 'Counter-based with ZooKeeper range allocation for guaranteed uniqueness at scale' },
        { decision: '301 permanent vs 302 temporary redirect', pros: '301 reduces server load via browser caching; 302 tracks every click', cons: '301 makes analytics impossible; 302 increases server traffic', recommendation: '302 redirect when click analytics are needed, 301 for pure shortening use cases' },
        { decision: 'SQL vs NoSQL for URL mappings', pros: 'SQL gives ACID and easy querying; NoSQL provides horizontal scaling', cons: 'SQL has scaling limits; NoSQL complicates analytics queries', recommendation: 'NoSQL (Cassandra) for URL storage with a separate analytics database for reporting' },
      ],
      layeredDesign: [
        { name: 'API Layer', purpose: 'Handle URL creation, redirect, and analytics requests', components: ['REST API', 'Rate Limiter', 'Auth Middleware'] },
        { name: 'Application Layer', purpose: 'Generate short codes, validate URLs, and track clicks', components: ['URL Generator', 'Custom Alias Handler', 'Click Tracker'] },
        { name: 'Cache Layer', purpose: 'Serve popular redirects with sub-millisecond latency', components: ['Redis Cluster', 'Local LRU Cache', 'CDN'] },
        { name: 'Storage Layer', purpose: 'Persist URL mappings and analytics data', components: ['Cassandra (URL Store)', 'Analytics DB', 'ZooKeeper (ID Ranges)'] },
      ],
    },
    {
      id: 'top-k-leaderboard',
      isNew: true,
      title: 'Top-K Leaderboard',
      subtitle: 'Real-time Rankings',
      icon: 'award',
      color: '#f59e0b',
      difficulty: 'Medium',
      description: 'Design a system to compute and serve top-K rankings in real-time across large datasets.',

      introduction: `Top-K leaderboards appear in gaming, social media (trending), e-commerce (best sellers), and analytics (top queries). The challenge is maintaining accurate top-K rankings when the underlying data changes at high velocity.

The key insight is that you don't need to sort all items -- only maintain the top K. This enables efficient algorithms using min-heaps, approximate data structures (Count-Min Sketch), and Redis sorted sets.`,

      functionalRequirements: [
        'Update scores for items in real-time',
        'Retrieve top K items (e.g., top 100)',
        'Support multiple leaderboards (by category, time window)',
        'Get rank and score for a specific item',
        'Time-windowed leaderboards (hourly, daily, weekly)',
        'Historical snapshots of rankings'
      ],

      nonFunctionalRequirements: [
        'Score update throughput: 50K+ per second',
        'Top-K query latency < 50ms',
        'Individual rank lookup < 10ms',
        'Support 100M+ items across all leaderboards',
        'Leaderboard updates reflected within 1 second'
      ],

      dataModel: {
        description: 'Redis sorted sets with persistent backup',
        schema: `Redis Sorted Sets:
  Key: topk:{category}:{timeframe}
  Members: item_id
  Score: item_score

  ZADD topk:songs:daily 15000 song_123
  ZREVRANGE topk:songs:daily 0 99 WITHSCORES  -- top 100

PostgreSQL (persistent backup):
rankings_history {
  id: bigint PK
  category: varchar
  timeframe: varchar
  item_id: varchar
  score: bigint
  rank: int
  snapshot_at: timestamp
}

-- For approximate counting (streaming data):
Count-Min Sketch {
  width: 10000 (hash buckets)
  depth: 7 (hash functions)
  // Estimates frequency with known error bound
}`
      },

      apiDesign: {
        description: 'Score update and ranking query endpoints',
        endpoints: [
          { method: 'POST', path: '/api/scores', params: '{ itemId, category, scoreIncrement }', response: '{ newScore, newRank }' },
          { method: 'GET', path: '/api/topk/:category', params: 'k=100, timeframe', response: '{ rankings: [{ itemId, score, rank }] }' },
          { method: 'GET', path: '/api/rank/:category/:itemId', params: 'timeframe', response: '{ rank, score, percentile }' }
        ]
      },

      keyQuestions: [
        {
          question: 'What data structure should we use for top-K?',
          answer: `**Option 1: Redis Sorted Set (Recommended for exact)**
- ZADD: O(log N) score update
- ZREVRANGE 0 K: O(log N + K) top-K query
- ZREVRANK: O(log N) individual rank
- Memory: ~100M items * 30 bytes = ~3GB (fits in memory)

**Option 2: Min-Heap of size K (for streaming)**
- Maintain heap of K largest items
- New item: compare with heap min, swap if larger
- O(log K) per update, O(K log K) to get sorted top-K
- Good when you only need top-K, not arbitrary ranks

**Option 3: Count-Min Sketch + Heap (approximate)**
- CMS estimates frequencies in constant space
- Maintain min-heap of K items with highest CMS estimates
- O(1) per update, slight overcount possible
- Best for: trending topics, approximate counts at massive scale`
        },
        {
          question: 'How do we handle time-windowed leaderboards?',
          answer: `**Approach: Separate Sorted Sets per Window**
\`\`\`
topk:songs:alltime      -- never expires
topk:songs:weekly:2024-W23  -- expires after 2 weeks
topk:songs:daily:2024-06-05  -- expires after 7 days
topk:songs:hourly:2024-06-05-14  -- expires after 48 hours
\`\`\`

**On Score Update**:
1. ZADD to all active windows atomically (MULTI/EXEC)
2. Set TTL on time-windowed keys

**Window Rotation**:
- New time window = new Redis key (empty)
- Old window stops receiving writes
- Old window kept for read access until TTL
- No expensive "reset" operation needed

**Combining Windows**:
- "This week's top" = ZUNIONSTORE across 7 daily keys
- Computed on-demand or pre-computed periodically`
        }
      ],

      requirements: ['Real-time score updates', 'Top-K retrieval', 'Time-windowed rankings', 'Individual rank lookup', 'Historical snapshots'],
      components: ['Redis (sorted sets)', 'Kafka (score events)', 'Score Aggregator Service', 'PostgreSQL (snapshots)', 'API Gateway'],
      keyDecisions: [
        'Redis Sorted Sets for O(log N) exact top-K with rank lookups',
        'Separate sorted set per time window for efficient rotation',
        'Count-Min Sketch for approximate streaming top-K at massive scale',
        'Kafka for buffering score events during traffic spikes',
        'Periodic snapshots to PostgreSQL for historical analytics'
      ],
      edgeCases: [
        { scenario: 'Score ties among millions of players', impact: 'Ambiguous ranking causes user complaints and inconsistent display', mitigation: 'Use composite score with timestamp as tiebreaker, ensuring deterministic ordering' },
        { scenario: 'Flash event causes massive score update burst', impact: 'Redis sorted set becomes bottleneck, write latency spikes', mitigation: 'Buffer score events in Kafka, batch-apply updates to Redis with micro-batching' },
        { scenario: 'Time window rotation during active queries', impact: 'Users see inconsistent rankings during window boundary', mitigation: 'Maintain overlapping windows and atomically swap active pointer after new window is populated' },
        { scenario: 'Approximate counts diverge from exact counts', impact: 'Count-Min Sketch over-counts lead to incorrect top-K ordering', mitigation: 'Periodically reconcile approximate with exact counts, use conservative update for better accuracy' },
      ],
      tradeoffs: [
        { decision: 'Redis Sorted Sets vs Count-Min Sketch', pros: 'Sorted sets give exact ranking; CMS uses constant memory', cons: 'Sorted sets use O(N) memory; CMS has approximation errors', recommendation: 'Redis for exact top-K under 10M items, CMS for approximate streaming top-K at billions scale' },
        { decision: 'Per-window sorted sets vs single set with timestamps', pros: 'Per-window allows clean rotation; single set is simpler', cons: 'Per-window doubles memory during rotation; single set needs expensive range deletes', recommendation: 'Per-window sorted sets with overlapping lifecycle for clean time-bounded rankings' },
        { decision: 'Synchronous vs asynchronous score updates', pros: 'Synchronous gives immediate rank accuracy; async handles burst traffic', cons: 'Synchronous limits throughput; async introduces ranking lag', recommendation: 'Async via Kafka for ingestion with sub-second batching to keep rankings near-real-time' },
      ],
      layeredDesign: [
        { name: 'Ingestion Layer', purpose: 'Accept and buffer high-throughput score events', components: ['API Gateway', 'Kafka Topics', 'Score Validators'] },
        { name: 'Processing Layer', purpose: 'Aggregate and deduplicate score updates', components: ['Score Aggregator', 'Deduplication Filter', 'Window Manager'] },
        { name: 'Ranking Layer', purpose: 'Maintain sorted rankings and serve top-K queries', components: ['Redis Sorted Sets', 'CMS Approximator', 'Rank Query API'] },
        { name: 'Persistence Layer', purpose: 'Store historical snapshots and serve analytics', components: ['PostgreSQL (Snapshots)', 'Analytics Query Engine', 'Export Service'] },
      ],
    },
  ];

  // LLD Problem Categories
export const lldProblemCategories = [
    { id: 'data-structures', name: 'Data Structures', icon: 'database', color: '#10b981' },
    { id: 'games', name: 'Games & Puzzles', icon: 'gamepad', color: '#8b5cf6' },
    { id: 'systems', name: 'Real-World Systems', icon: 'server', color: '#3b82f6' },
    { id: 'utilities', name: 'Utilities & Tools', icon: 'tool', color: '#f59e0b' },
  ];

export const lldProblemCategoryMap = {
    'lru-cache': 'data-structures',
    'parking-lot': 'systems',
    'elevator-system': 'systems',
    'library-management': 'systems',
    'tic-tac-toe': 'games',
    'snake-ladder': 'games',
    'logging-framework': 'utilities',
    'vending-machine': 'systems',
    'atm-system': 'systems',
    'task-scheduler': 'utilities',
    'stack-overflow': 'systems',
    'chess': 'games',
    'hotel-booking-lld': 'systems',
    'movie-ticket-booking': 'systems',
    'car-rental': 'systems',
    // New Data Structures
    'design-hashmap': 'data-structures',
    'circular-queue': 'data-structures',
    'queue-using-array': 'data-structures',
    '2d-vector': 'data-structures',
    'account-balance-tracker': 'data-structures',
    // New Games & Puzzles
    'rock-paper-scissors': 'games',
    'go-fish': 'games',
    // New Real-World Systems
    'splitwise': 'systems',
    'library-management-lld': 'systems',
    'locker-allocation': 'systems',
    'notepad-system': 'systems',
    'access-management': 'systems',
    'gpu-credits': 'systems',
    'disk-space-manager': 'systems',
    'access-control-tree': 'systems',
    // New Utilities & Tools
    'memory-allocator': 'utilities',
    'active-users': 'utilities',
    'actor-component': 'utilities',
  };

  // Low-Level Design Problems
