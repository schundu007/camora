#!/usr/bin/env node
/**
 * Batch pre-generate architecture diagrams for the Camora system-design catalog.
 *
 * Hits POST /api/diagram/generate (Python diagrams + Graphviz, see
 * pythonDiagrams.js + diagram_engine.py) for every problem in the
 * catalog so users hit the cache instead of triggering fresh generation.
 *
 * IMPORTANT: /api/diagram/generate is admin-only. You MUST set API_TOKEN
 * to a JWT minted for an OWNER_EMAILS account. Non-admin tokens get
 * 403 ADMIN_ONLY on every call and the script will abort.
 *
 * Topic source defaults to the catalog data files
 * (apps/frontend/src/data/capra/topics/systemDesignProblems[Extra].js).
 * Use --source=legacy for the historical hardcoded list (49 topics) or
 * --source=both to merge.
 *
 * Direction is locked to TB and detail is locked to detailed by the
 * server (the UI no longer exposes them). The script defaults match.
 *
 * Usage:
 *   API_TOKEN=<admin-jwt> node scripts/pregenerate-diagrams.js \
 *     [--batch-size=3] [--delay=5000] [--dry-run] \
 *     [--source=catalog|legacy|both] [--phrasing=title|title-subtitle] \
 *     [--limit=N] [--providers=auto,aws,azure,gcp]
 *
 * Environment:
 *   API_URL    — ascend backend URL (default: https://caprab.cariara.com)
 *   API_TOKEN  — admin JWT (REQUIRED — see above)
 */

import { fileURLToPath } from 'url';
import path from 'path';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

const BATCH_SIZE = parseInt(flag('batch-size', '3'), 10);
const DELAY_MS = parseInt(flag('delay', '5000'), 10);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(flag('limit', '0'), 10) || Infinity;
const SOURCE = flag('source', 'catalog'); // catalog | legacy | both
const PHRASING = flag('phrasing', 'title'); // title | title-subtitle
// Direction + detail are locked to TB/detailed server-side; these defaults
// reflect that. Override only if you're testing the legacy engine path.
const DIRECTIONS = flag('directions', 'TB').split(',').map((s) => s.trim()).filter(Boolean);
const DETAILS = flag('details', 'detailed').split(',').map((s) => s.trim()).filter(Boolean);
const PROVIDERS = flag('providers', 'auto').split(',').map((s) => s.trim()).filter(Boolean);
const API_URL = process.env.API_URL || 'https://caprab.cariara.com';
const API_TOKEN = process.env.API_TOKEN;

// ── Legacy hardcoded list (kept for --source=legacy backward compat) ──
const LEGACY_TOPICS = [
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

// Path to the frontend topic data files. Resolved relative to this script
// so the script works whether you `cd apps/ascend-backend` or run it from
// the repo root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../frontend/src/data/capra/topics');

async function loadCatalogTopics() {
  const collected = [];
  // Use file:// URLs because dynamic import of an absolute path needs them.
  const sources = [
    { url: new URL(`file://${path.join(DATA_DIR, 'systemDesignProblems.js')}`).href, exportName: 'systemDesigns' },
    { url: new URL(`file://${path.join(DATA_DIR, 'systemDesignProblemsExtra.js')}`).href, exportName: 'extraSystemDesigns' },
  ];
  for (const { url, exportName } of sources) {
    try {
      const mod = await import(url);
      const list = mod[exportName];
      if (!Array.isArray(list)) {
        console.warn(`[pregen] ${exportName} not found or not an array in ${url}`);
        continue;
      }
      for (const p of list) {
        if (!p?.title) continue;
        collected.push({ id: p.id, title: p.title, subtitle: p.subtitle || '' });
      }
    } catch (err) {
      console.warn(`[pregen] Failed to import ${url}: ${err.message}`);
    }
  }
  return collected;
}

function phraseProblem(p) {
  // "Design <title>" is the most common user phrasing. The optional
  // -subtitle variant gives a slightly richer prompt that produces a
  // marginally better diagram for ambiguous titles like "Pastebin".
  if (PHRASING === 'title-subtitle' && p.subtitle) {
    return `Design ${p.title} (${p.subtitle})`;
  }
  return `Design ${p.title}`;
}

async function buildTopics() {
  let topics = [];
  if (SOURCE === 'legacy') {
    topics = LEGACY_TOPICS.slice();
  } else if (SOURCE === 'both') {
    const cat = await loadCatalogTopics();
    topics = [...new Set([...LEGACY_TOPICS, ...cat.map(phraseProblem)])];
  } else {
    const cat = await loadCatalogTopics();
    topics = cat.map(phraseProblem);
  }
  if (topics.length === 0) {
    console.error('[pregen] No topics loaded. Check --source and data files.');
    process.exit(1);
  }
  if (LIMIT < topics.length) topics = topics.slice(0, LIMIT);
  return topics;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateOne(topic, provider, direction, detailLevel) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${API_URL}/api/diagram/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        question: topic,
        cloudProvider: provider,
        detailLevel,
        direction,
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    clearTimeout(timeout);

    if (res.status === 403 && data.code === 'ADMIN_ONLY') {
      return { ok: false, error: 'ADMIN_ONLY (set API_TOKEN to an owner JWT)', fatal: true };
    }
    if (data.success) {
      // Mermaid fallback was removed — every successful response is PNG.
      // engine_used is set by pythonDiagrams.js so the operator can see
      // whether D2 (primary) or Graphviz (fallback) actually rendered.
      const type = data.image_url ? 'png' : 'unknown';
      const engine = data.engine_used ? ` [${data.engine_used}]` : '';
      return { ok: true, type: type + engine, cached: !!data.cached };
    }
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err.name === 'AbortError' ? 'Timeout (2min)' : err.message };
  }
}

async function main() {
  const TOPICS = await buildTopics();

  const tasks = [];
  for (const topic of TOPICS) {
    for (const provider of PROVIDERS) {
      for (const dir of DIRECTIONS) {
        for (const detail of DETAILS) {
          tasks.push({ topic, provider, direction: dir, detailLevel: detail });
        }
      }
    }
  }

  console.log(`\n=== Architecture Diagram Pre-Generation ===`);
  console.log(`Endpoint:  ${API_URL}/api/diagram/generate`);
  console.log(`Source:    ${SOURCE} (${TOPICS.length} topics)`);
  console.log(`Phrasing:  ${PHRASING}`);
  console.log(`Variants:  ${PROVIDERS.length}P × ${DIRECTIONS.length}D × ${DETAILS.length}L = ${PROVIDERS.length * DIRECTIONS.length * DETAILS.length} per topic`);
  console.log(`Total:     ${tasks.length} diagrams`);
  console.log(`Batch:     ${BATCH_SIZE} concurrent, ${DELAY_MS}ms delay between batches`);
  console.log(`Auth:      ${API_TOKEN ? 'admin token set' : 'NO TOKEN — every call will 403'}`);
  console.log(`Dry run:   ${DRY_RUN}\n`);

  if (DRY_RUN) {
    for (const t of tasks.slice(0, 10)) {
      console.log(`  DRY  ${t.topic.slice(0, 50).padEnd(50)} [${t.provider}/${t.direction}/${t.detailLevel}]`);
    }
    if (tasks.length > 10) console.log(`  ... and ${tasks.length - 10} more`);
    process.exit(0);
  }

  let generated = 0, cached = 0, failed = 0;
  const startTime = Date.now();
  let aborted = false;

  for (let i = 0; i < tasks.length && !aborted; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tasks.length / BATCH_SIZE);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

    console.log(`── Batch ${batchNum}/${totalBatches} [${elapsed}s elapsed] ──`);

    const results = await Promise.all(batch.map(async (task) => {
      const label = `${task.topic.slice(0, 40).padEnd(40)} [${task.provider}/${task.direction}/${task.detailLevel}]`;
      const result = await generateOne(task.topic, task.provider, task.direction, task.detailLevel);

      if (result.ok) {
        const tag = result.cached ? 'CACHE' : 'OK   ';
        console.log(`  ${tag} ${label} → ${result.type}${result.cached ? ' (cached)' : ''}`);
        return result.cached ? 'cached' : 'generated';
      }
      console.error(`  FAIL  ${label} → ${result.error}`);
      if (result.fatal) {
        aborted = true;
        return 'fatal';
      }
      return 'failed';
    }));

    for (const r of results) {
      if (r === 'generated') generated++;
      else if (r === 'cached') cached++;
      else if (r === 'failed' || r === 'fatal') failed++;
    }

    if (i + BATCH_SIZE < tasks.length && !aborted) {
      await sleep(DELAY_MS);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Complete (${totalTime}s) ===`);
  console.log(`Generated: ${generated} (new)`);
  console.log(`Cached:    ${cached} (already existed)`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total:     ${generated + cached + failed}/${tasks.length}`);
  if (aborted) console.log(`ABORTED — fatal auth error. Set API_TOKEN to an owner JWT.`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
