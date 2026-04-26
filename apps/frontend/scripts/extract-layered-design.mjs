#!/usr/bin/env node
/**
 * Phase 1: extract `layeredDesign` JSON for every topic that doesn't already
 * have one, using the topic's prose description + (optional) components list
 * as the source of truth. Writes the results to a single generated TS file
 * that TopicDetail.jsx falls through to when the topic itself has no inline
 * layeredDesign.
 *
 *   Usage:
 *     ANTHROPIC_API_KEY=xxx node apps/frontend/scripts/extract-layered-design.mjs
 *     # optional flags
 *     --dry-run     list what would be processed without calling the API
 *     --limit=N     process at most N topics this run (smoke-test)
 *     --topic=ID    process only one topic by id (smoke-test)
 *     --concurrency=4   parallel API calls (default 4)
 *
 *   Output:
 *     apps/frontend/src/data/capra/topics/__generated/layered-design.ts
 *
 *   Idempotent:
 *     - Existing entries in the output file are preserved (we read it on start
 *       and skip topics whose IDs are already present).
 *     - Re-running only fills new gaps; if you want a topic re-extracted,
 *       delete its key from the output file first.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

/* ── Paths ──────────────────────────────────────────────────────── */
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const TOPICS_DIR = path.join(ROOT, 'src/data/capra/topics');
const OUT_DIR = path.join(TOPICS_DIR, '__generated');
const OUT_FILE = path.join(OUT_DIR, 'layered-design.ts');

/* ── Topic data files to scan ──────────────────────────────────────
   These are the modules whose default-or-named exports contain the
   topic objects we care about. The script tries every named export
   that is an Array and treats each element as a candidate topic. */
const TOPIC_FILES = [
  'systemDesignTopics.js',
  'systemDesignProblems.js',
  'systemDesignProblemsExtra.js',
  'lldProblems.js',
  'lldProblemsExtra.js',
  'concurrencyTopics.js',
  'databaseTopics.js',
  'scalableSystemsTopics.js',
  'projectTopics.js',
  'projectEnrichment.js',
  'projectEnrichment_1_3.js',
  'projectEnrichment_4_5.js',
  'projectEnrichment_6_9.js',
  'microservicesPatterns.js',
  'lldTopics.js',
];

/* ── CLI flags ──────────────────────────────────────────────────── */
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const ONE_TOPIC = (ARGS.find(a => a.startsWith('--topic=')) || '').split('=')[1] || null;
const LIMIT = parseInt((ARGS.find(a => a.startsWith('--limit=')) || '').split('=')[1] || '0', 10);
const CONCURRENCY = parseInt((ARGS.find(a => a.startsWith('--concurrency=')) || '').split('=')[1] || '4', 10);

/* ── Helpers ────────────────────────────────────────────────────── */
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function looksLikeTopic(obj) {
  // A topic has at least an id (or slug) and a title and either a
  // description or introduction.
  if (!isPlainObject(obj)) return false;
  const hasId = typeof obj.id === 'string' || typeof obj.slug === 'string';
  const hasTitle = typeof obj.title === 'string';
  const hasContent = typeof obj.description === 'string' || typeof obj.introduction === 'string';
  return hasId && hasTitle && hasContent;
}

function extractTextForPrompt(topic) {
  // Pick the densest available source for architecture inference.
  const parts = [];
  if (topic.title) parts.push(`# ${topic.title}`);
  if (topic.subtitle) parts.push(topic.subtitle);
  if (topic.description) parts.push(topic.description);
  if (topic.introduction) parts.push(topic.introduction);
  if (Array.isArray(topic.components) && topic.components.length) {
    parts.push(`Known components: ${topic.components.join(', ')}`);
  }
  if (Array.isArray(topic.functionalRequirements) && topic.functionalRequirements.length) {
    parts.push(`Functional reqs: ${topic.functionalRequirements.join('; ')}`);
  }
  if (isPlainObject(topic.basicImplementation)) {
    if (topic.basicImplementation.description) parts.push(`Basic: ${topic.basicImplementation.description}`);
    if (Array.isArray(topic.basicImplementation.components)) {
      parts.push(`Basic components: ${topic.basicImplementation.components.join(', ')}`);
    }
  }
  if (isPlainObject(topic.advancedImplementation)) {
    if (topic.advancedImplementation.description) parts.push(`Advanced: ${topic.advancedImplementation.description}`);
    if (Array.isArray(topic.advancedImplementation.components)) {
      parts.push(`Advanced components: ${topic.advancedImplementation.components.join(', ')}`);
    }
  }
  // Cap to keep the prompt under ~2k tokens
  return parts.join('\n\n').slice(0, 6000);
}

const PROMPT_INSTRUCTION = `You are extracting a CONCISE layered architecture from a system-design topic so it can be rendered as a stack-of-layers diagram.

Return STRICTLY JSON in this shape:
{
  "layeredDesign": [
    { "name": "Client Layer", "purpose": "What this layer does in 5-10 words", "components": ["3-6 short component names"] }
  ]
}

Rules:
- 3 to 5 layers total. Top-down logical grouping (Client → API → Service → Data → Infra) — adapt to the topic.
- Each layer has 3 to 6 components. Component names are short (1-4 words). No vendor-specific noise unless it's the canonical example (e.g. Kafka, Redis, S3).
- Layer "purpose" is 5-10 words, written in active voice.
- Skip layers that don't apply (e.g. a topic about "Bloom Filters" probably has 1-2 layers, that's fine).
- If the topic is a single concept (not an architecture), return { "layeredDesign": [] } and nothing else.
- ABSOLUTELY no prose outside the JSON. No markdown fences. The first character of your response must be { and the last must be }.`;

async function callClaude(client, topic) {
  const text = extractTextForPrompt(topic);
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: PROMPT_INSTRUCTION,
    messages: [{ role: 'user', content: text }],
  });
  const raw = resp.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
  // Some models occasionally wrap in fences despite the instruction; strip.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Bad JSON from model for topic=${topic.id}: ${cleaned.slice(0, 200)}`);
  }
  if (!parsed || !Array.isArray(parsed.layeredDesign)) {
    throw new Error(`Missing layeredDesign array for topic=${topic.id}`);
  }
  // Validate shape — be liberal in what we accept, conservative in what we keep.
  const layers = parsed.layeredDesign
    .filter(l => isPlainObject(l) && typeof l.name === 'string' && l.name.trim())
    .map(l => ({
      name: String(l.name).trim().slice(0, 60),
      purpose: typeof l.purpose === 'string' ? String(l.purpose).trim().slice(0, 120) : undefined,
      components: Array.isArray(l.components)
        ? l.components.filter(c => typeof c === 'string' && c.trim())
                      .map(c => String(c).trim().slice(0, 40))
                      .slice(0, 6)
        : [],
    }))
    .slice(0, 5);
  return layers;
}

async function loadAllTopics() {
  const topics = []; // [{ id, title, sourceFile, raw }]
  for (const fname of TOPIC_FILES) {
    const fpath = path.join(TOPICS_DIR, fname);
    try {
      await fs.access(fpath);
    } catch {
      console.warn(`[skip] missing file: ${fname}`);
      continue;
    }
    const url = pathToFileURL(fpath).href;
    let mod;
    try {
      mod = await import(url);
    } catch (e) {
      console.warn(`[skip] failed to import ${fname}: ${e.message}`);
      continue;
    }
    for (const [exportName, value] of Object.entries(mod)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (looksLikeTopic(item)) {
          topics.push({ id: item.id || item.slug, title: item.title, sourceFile: fname, raw: item });
        }
        // Some files nest topics one level deeper (sections with .topics array)
        if (isPlainObject(item) && Array.isArray(item.topics)) {
          for (const t of item.topics) {
            if (looksLikeTopic(t)) {
              topics.push({ id: t.id || t.slug, title: t.title, sourceFile: fname, raw: t });
            }
          }
        }
      }
    }
  }
  // Dedupe by id (last wins — usually fine because topic data files don't double-register)
  const byId = new Map();
  for (const t of topics) byId.set(t.id, t);
  return Array.from(byId.values());
}

async function loadExistingOutput() {
  try {
    const src = await fs.readFile(OUT_FILE, 'utf8');
    // Match: `'topic-id': [ ... ]` and re-eval the array as JSON. We control this
    // file's format completely, so a permissive parse is safe.
    const map = {};
    const RE = /'([^']+)':\s*(\[[\s\S]*?\])(?=,\s*'|,?\s*\})/g;
    let m;
    while ((m = RE.exec(src)) !== null) {
      try {
        map[m[1]] = JSON.parse(m[2]);
      } catch { /* ignore corrupt entry — will be regenerated next run */ }
    }
    return map;
  } catch {
    return {};
  }
}

async function writeOutput(allEntries) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const sortedKeys = Object.keys(allEntries).sort();
  const body = sortedKeys
    .map(k => `  '${k}': ${JSON.stringify(allEntries[k], null, 2).split('\n').join('\n  ')}`)
    .join(',\n');

  const banner = `/* AUTO-GENERATED by apps/frontend/scripts/extract-layered-design.mjs.
   Do not edit by hand. Re-run the script to regenerate.

   Maps a topic id -> layeredDesign array, used by TopicDetail.jsx as the
   FALLBACK source of truth when the topic data file itself doesn't carry
   an inline layeredDesign. The renderer (RoughLayeredDiagram) consumes
   this shape directly. */
`;

  const out = `${banner}
import type { Layer } from '../../../components/capra/docs/RoughLayeredDiagram.types';

export const GENERATED_LAYERED_DESIGN: Record<string, Layer[]> = {
${body}
};
`;
  await fs.writeFile(OUT_FILE, out, 'utf8');
}

async function pool(items, concurrency, fn) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        results[i] = { error: e.message };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/* ── Main ──────────────────────────────────────────────────────── */
async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !DRY_RUN) {
    console.error('ANTHROPIC_API_KEY env var required (or pass --dry-run).');
    process.exit(1);
  }

  console.log('[1/4] Loading topic data files...');
  const all = await loadAllTopics();
  console.log(`      Found ${all.length} topics across ${TOPIC_FILES.length} files.`);

  console.log('[2/4] Reading existing generated output...');
  const existing = await loadExistingOutput();
  console.log(`      ${Object.keys(existing).length} topics already have generated layeredDesign.`);

  // Filter to topics that need extraction
  let queue = all.filter(t => {
    if (Array.isArray(t.raw.layeredDesign) && t.raw.layeredDesign.length) return false; // inline already
    if (existing[t.id]) return false; // generated previously
    return true;
  });
  if (ONE_TOPIC) queue = queue.filter(t => t.id === ONE_TOPIC);
  if (LIMIT > 0) queue = queue.slice(0, LIMIT);

  console.log(`[3/4] ${queue.length} topics queued for extraction (concurrency=${CONCURRENCY}).`);
  if (DRY_RUN) {
    queue.slice(0, 30).forEach(t => console.log(`      - ${t.id}  (${t.sourceFile})`));
    if (queue.length > 30) console.log(`      ... +${queue.length - 30} more`);
    console.log('Dry run — exiting without API calls.');
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let ok = 0, fail = 0, skipped = 0, processed = 0;
  const start = Date.now();
  await pool(queue, CONCURRENCY, async (t) => {
    try {
      const layers = await callClaude(client, t.raw);
      if (layers.length === 0) {
        skipped++; // model decided this isn't an architecture topic
      } else {
        existing[t.id] = layers;
        ok++;
      }
    } catch (e) {
      fail++;
      console.warn(`  [fail] ${t.id}: ${e.message}`);
    }
    processed++;
    if (processed % 10 === 0) {
      const rate = processed / ((Date.now() - start) / 1000);
      console.log(`      progress ${processed}/${queue.length}  (${rate.toFixed(1)}/s, ok=${ok} skip=${skipped} fail=${fail})`);
    }
  });

  console.log(`[4/4] Writing generated file: ${path.relative(ROOT, OUT_FILE)}`);
  await writeOutput(existing);

  console.log(`\nDone. ok=${ok}  skipped(non-arch)=${skipped}  failed=${fail}  total in file=${Object.keys(existing).length}.`);
  console.log(`Elapsed: ${((Date.now() - start) / 1000).toFixed(1)}s.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
