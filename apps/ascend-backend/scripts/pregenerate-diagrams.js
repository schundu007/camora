#!/usr/bin/env node
/**
 * Batch pre-generate architecture diagrams for all system design topics.
 *
 * Calls the /api/diagram/generate endpoint which uses Python diagrams
 * library (mingrammer) for proper AWS/Azure/GCP architecture diagrams.
 * Falls back to Mermaid only if Python fails.
 *
 * Generates all 4 variants per topic: LR/TB x overview/detailed.
 * Runs in sequential batches with delays to avoid overloading the server.
 *
 * Usage:
 *   node scripts/pregenerate-diagrams.js [--batch-size=3] [--delay=5000] [--dry-run]
 *
 * Environment:
 *   API_URL    — ascend backend URL (default: http://localhost:3009)
 *   API_TOKEN  — JWT auth token (required for auth'd endpoints)
 */

const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '3');
const DELAY_MS = parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || '5000');
const DRY_RUN = args.includes('--dry-run');
const API_URL = process.env.API_URL || 'https://caprab.cariara.com';
const API_TOKEN = process.env.API_TOKEN;

// ── All system design topics ──
const TOPICS = [
  'Design a URL Shortener like TinyURL',
  'Design Twitter / X Social Media Feed',
  'Design Uber / Lyft Ride-Sharing Service',
  'Design YouTube Video Streaming Platform',
  'Design WhatsApp Messaging Service',
  'Design Instagram Photo Sharing Platform',
  'Design Dropbox / Google Drive File Storage',
  'Design Netflix Video Streaming Platform',
  'Design Amazon E-commerce Online Shopping',
  'Design Google Docs Collaborative Editing',
  'Design a Payment System like Stripe',
  'Design a Web Search Engine like Google',
  'Design a Notification System',
  'Design a Rate Limiter',
  'Design Ticketmaster Event Booking System',
  'Design Typeahead Autocomplete Search Suggestions',
  'Design a Real-time Chat System',
  'Design Yelp Proximity Service',
  'Design Tinder Matching and Geolocation',
  'Design Spotify Music Streaming',
  'Design Airbnb Accommodation Marketplace',
  'Design DoorDash Food Delivery',
  'Design Twitter Trending Topics Real-time Analytics',
  'Design Pastebin Text Sharing Service',
  'Design a Web Crawler',
  'Design a Distributed Key-Value Store',
  'Design a News Feed System',
  'Design a Social Graph Friend Recommendations',
  'Design a Metrics and Monitoring System',
  'Design a CDN Content Delivery Network',
  'Design a Distributed Task Queue',
  'Design a Real-time Gaming Leaderboard',
  'Design a Hotel Booking System like Booking.com',
  'Design an Online Code Editor like LeetCode',
  'Design a Distributed Cache like Redis',
  'Design a Message Queue like Kafka',
  'Design a Load Balancer',
  'Design a Distributed File System like HDFS',
  'Design an API Gateway',
  'Design a CI/CD Pipeline',
  'Design a Logging System like ELK Stack',
  'Design a Video Conferencing System like Zoom',
  'Design a Stock Trading System',
  'Design Google Maps Navigation and Routing',
  'Design a Collaborative Whiteboard',
  'Design a Distributed Locking Service like ZooKeeper',
  'Design a DNS System',
  'Design a Recommendation Engine',
  'Design an Ad Serving System',
  'Design a Content Moderation System',
];

const DIRECTIONS = ['LR', 'TB'];
const DETAIL_LEVELS = ['overview', 'detailed'];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateOne(topic, direction, detailLevel) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2min timeout

  try {
    const res = await fetch(`${API_URL}/api/diagram/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        question: topic,
        cloudProvider: 'auto',
        detailLevel,
        direction,
      }),
      signal: controller.signal,
    });

    const data = await res.json();
    clearTimeout(timeout);

    if (data.success) {
      const type = data.mermaid_code ? 'mermaid' : data.image_url ? 'python-png' : 'unknown';
      const cached = data.cached ? ' (cached)' : '';
      return { ok: true, type, cached };
    }
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err.name === 'AbortError' ? 'Timeout (2min)' : err.message };
  }
}

async function main() {
  // Build task list
  const tasks = [];
  for (const topic of TOPICS) {
    for (const dir of DIRECTIONS) {
      for (const detail of DETAIL_LEVELS) {
        tasks.push({ topic, direction: dir, detailLevel: detail });
      }
    }
  }

  console.log(`\n=== Architecture Diagram Pre-Generation ===`);
  console.log(`Endpoint: ${API_URL}/api/diagram/generate`);
  console.log(`Topics: ${TOPICS.length}`);
  console.log(`Variants: ${DIRECTIONS.length} directions x ${DETAIL_LEVELS.length} detail levels = ${DIRECTIONS.length * DETAIL_LEVELS.length}`);
  console.log(`Total: ${tasks.length} diagrams`);
  console.log(`Batch: ${BATCH_SIZE} concurrent, ${DELAY_MS}ms delay`);
  console.log(`Auth: ${API_TOKEN ? 'Yes' : 'No token (may fail on auth endpoints)'}`);
  console.log(`Dry run: ${DRY_RUN}\n`);

  let generated = 0, cached = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tasks.length / BATCH_SIZE);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

    console.log(`── Batch ${batchNum}/${totalBatches} [${elapsed}s elapsed] ──`);

    const results = await Promise.all(batch.map(async (task) => {
      const label = `${task.topic.slice(0, 45).padEnd(45)} [${task.direction}/${task.detailLevel}]`;

      if (DRY_RUN) {
        console.log(`  DRY   ${label}`);
        return 'dry';
      }

      const result = await generateOne(task.topic, task.direction, task.detailLevel);

      if (result.ok) {
        if (result.cached) {
          console.log(`  CACHE ${label} → ${result.type}${result.cached}`);
          return 'cached';
        }
        console.log(`  OK    ${label} → ${result.type}`);
        return 'generated';
      }
      console.error(`  FAIL  ${label} → ${result.error}`);
      return 'failed';
    }));

    for (const r of results) {
      if (r === 'generated') generated++;
      else if (r === 'cached') cached++;
      else if (r === 'failed') failed++;
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < tasks.length) {
      await sleep(DELAY_MS);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n=== Complete (${totalTime}s) ===`);
  console.log(`Generated: ${generated} (new)`);
  console.log(`Cached:    ${cached} (already existed)`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total:     ${generated + cached + failed}/${tasks.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
