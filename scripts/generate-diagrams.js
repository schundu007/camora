#!/usr/bin/env node
/**
 * Batch diagram generator — generates architecture diagrams for system design topics
 * that don't have them yet, and stores them in the ascend_diagram_cache DB.
 *
 * Usage:
 *   node scripts/generate-diagrams.js [--batch N] [--start N] [--dry-run]
 *
 * Requires:
 *   - ASCEND_API_URL (default: https://caprab.cariara.com)
 *   - AUTH_TOKEN (JWT token for authenticated requests)
 */

const API_URL = process.env.ASCEND_API_URL || 'https://caprab.cariara.com';
const TOKEN = process.env.AUTH_TOKEN;
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '10');
const START = parseInt(process.argv.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
const DRY_RUN = process.argv.includes('--dry-run');

// All system design topics that need architecture diagrams
const TOPICS = [
  // Core Fundamentals
  { id: 'cap-theorem', title: 'CAP Theorem' },
  { id: 'scalability', title: 'Scalability - Horizontal vs Vertical Scaling' },
  { id: 'availability-numbers', title: 'Availability Numbers and SLAs' },
  { id: 'distributed-architecture', title: 'Distributed System Architecture' },
  { id: 'estimation-process', title: 'Back-of-Envelope Estimation' },
  { id: 'interview-framework', title: 'System Design Interview Framework' },

  // Storage & Databases
  { id: 'sql-vs-nosql', title: 'SQL vs NoSQL Database Comparison' },
  { id: 'sharding', title: 'Database Sharding Strategies' },
  { id: 'replication', title: 'Database Replication' },
  { id: 'indexing', title: 'Database Indexing Strategies' },
  { id: 'denormalization', title: 'Database Denormalization' },
  { id: 'cache-aside', title: 'Cache-Aside Pattern' },
  { id: 'cache-eviction', title: 'Cache Eviction Policies' },
  { id: 'cache-strategies', title: 'Caching Strategies Overview' },
  { id: 'write-through', title: 'Write-Through Cache' },
  { id: 'write-behind', title: 'Write-Behind Cache' },
  { id: 'isolation-levels', title: 'Database Isolation Levels' },

  // Communication & APIs
  { id: 'oauth2', title: 'OAuth2 Authentication Flow' },
  { id: 'graphql-pattern', title: 'GraphQL API Pattern' },
  { id: 'idempotency', title: 'Idempotent API Design' },
  { id: 'pagination', title: 'API Pagination Strategies' },
  { id: 'long-polling', title: 'Long Polling Pattern' },
  { id: 'tcp-vs-udp', title: 'TCP vs UDP Comparison' },
  { id: 'http-status-codes', title: 'HTTP Status Codes' },
  { id: 'ssl-handshake', title: 'SSL/TLS Handshake' },

  // Scalability & Performance
  { id: 'circuit-breaker', title: 'Circuit Breaker Pattern' },
  { id: 'service-discovery', title: 'Service Discovery' },
  { id: 'service-mesh', title: 'Service Mesh Architecture' },
  { id: 'sidecar', title: 'Sidecar Proxy Pattern' },
  { id: 'event-sourcing', title: 'Event Sourcing Pattern' },
  { id: 'cqrs', title: 'CQRS Pattern' },
  { id: 'saga-pattern', title: 'Saga Pattern for Distributed Transactions' },
  { id: 'backpressure', title: 'Backpressure in Distributed Systems' },
  { id: 'gossip-protocol', title: 'Gossip Protocol' },
  { id: 'two-phase-commit', title: 'Two-Phase Commit Protocol' },
  { id: 'leader-election', title: 'Leader Election Algorithm' },
  { id: 'merkle-tree', title: 'Merkle Tree for Data Verification' },
  { id: 'vector-clock', title: 'Vector Clocks for Causality' },
  { id: 'crdt', title: 'Conflict-Free Replicated Data Types (CRDTs)' },

  // Reliability & Security
  { id: 'failover', title: 'Failover Strategies' },
  { id: 'disaster-recovery', title: 'Disaster Recovery Architecture' },
  { id: 'zero-trust', title: 'Zero Trust Architecture' },
  { id: 'rbac', title: 'Role-Based Access Control (RBAC)' },
  { id: 'jwt', title: 'JWT Authentication Architecture' },
  { id: 'distributed-tracing', title: 'Distributed Tracing Architecture' },
  { id: 'health-checks', title: 'Health Check Patterns' },
  { id: 'graceful-degradation', title: 'Graceful Degradation Pattern' },
  { id: 'multi-region', title: 'Multi-Region Architecture' },

  // Technologies
  { id: 'cassandra-deep-dive', title: 'Apache Cassandra Architecture' },
  { id: 'dynamodb-deep-dive', title: 'Amazon DynamoDB Architecture' },
  { id: 'zookeeper-deep-dive', title: 'Apache ZooKeeper Architecture' },
  { id: 'apache-flink-deep-dive', title: 'Apache Flink Stream Processing Architecture' },
  { id: 'vector-databases-deep-dive', title: 'Vector Database Architecture' },

  // Microservices subtopics
  { id: 'bff', title: 'Backend for Frontend (BFF) Pattern' },
  { id: 'monolith-vs-microservices', title: 'Monolith vs Microservices Architecture' },
  { id: 'microservices-patterns', title: 'Microservices Design Patterns' },
  { id: 'schema-registry', title: 'Schema Registry Architecture' },

  // Additional important topics
  { id: 'edge-computing', title: 'Edge Computing Architecture' },
  { id: 'stateless', title: 'Stateless Architecture' },
  { id: 'sticky-sessions', title: 'Sticky Sessions in Load Balancing' },
  { id: 'global-lb', title: 'Global Load Balancing Architecture' },
  { id: 'dlq', title: 'Dead Letter Queue Pattern' },
  { id: 'consumer-groups', title: 'Consumer Group Pattern in Message Queues' },
  { id: 'exactly-once', title: 'Exactly-Once Delivery Semantics' },
  { id: 'read-repair', title: 'Read Repair in Distributed Databases' },
  { id: 'tunable-consistency', title: 'Tunable Consistency in Distributed Systems' },
  { id: 'centralized-logging', title: 'Centralized Logging Architecture' },
  { id: 'structured-logging', title: 'Structured Logging Architecture' },
];

async function generateDiagram(topic) {
  const url = `${API_URL}/api/diagram/generate`;
  const body = {
    question: `Design the architecture for: ${topic.title}`,
    cloudProvider: 'aws',
    detailLevel: 'overview',
    direction: 'LR',
    cacheKey: topic.id,
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { id: topic.id, success: false, error: data.error || `HTTP ${resp.status}` };
    }
    return { id: topic.id, success: true, cached: data.cached, type: data.type || 'image' };
  } catch (err) {
    return { id: topic.id, success: false, error: err.message };
  }
}

async function run() {
  if (!TOKEN) {
    console.error('ERROR: Set AUTH_TOKEN environment variable');
    console.error('Get it from browser: localStorage.getItem("cariara_token") or from the cookie');
    process.exit(1);
  }

  const topics = TOPICS.slice(START, START + BATCH_SIZE);
  console.log(`\n=== Batch: topics ${START + 1}-${START + topics.length} of ${TOPICS.length} ===\n`);

  if (DRY_RUN) {
    topics.forEach(t => console.log(`  [DRY] Would generate: ${t.id} — ${t.title}`));
    return;
  }

  let success = 0, failed = 0, cached = 0;

  for (const topic of topics) {
    process.stdout.write(`  Generating: ${topic.id}... `);
    const result = await generateDiagram(topic);
    if (result.success) {
      if (result.cached) { cached++; console.log('CACHED'); }
      else { success++; console.log(`OK (${result.type})`); }
    } else {
      failed++;
      console.log(`FAILED: ${result.error}`);
    }
    // Small delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Results ===`);
  console.log(`  Generated: ${success}`);
  console.log(`  Cached:    ${cached}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${topics.length}`);
  console.log(`\nNext batch: node scripts/generate-diagrams.js --start=${START + BATCH_SIZE} --batch=${BATCH_SIZE}`);
}

run().catch(console.error);
