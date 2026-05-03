#!/usr/bin/env node
/**
 * Phase 2 of the diagram-coverage plan: vision-API pass over the topic PNGs
 * that survived Phase 1 (no inline `layeredDesign`, no entry yet in the
 * generated map, but DO have a `diagramSrc` PNG sitting in /public/diagrams).
 *
 * For each candidate, this script:
 *   1. Reads the PNG from disk (under apps/frontend/public/diagrams/...).
 *   2. Sends it to Claude as a vision message ("look at this architecture
 *      diagram, return the layered structure as JSON").
 *   3. Validates the response shape exactly like the prose extractor.
 *   4. Merges into the existing layered-design.ts map (idempotent).
 *
 * Hallucination guard:
 *   - System prompt says "if you can't read the diagram or aren't confident,
 *     return { layeredDesign: [] }". Empty arrays are skipped (the topic's
 *     PNG continues to render as before).
 *   - All component names are length-clipped + the layer count is capped so
 *     a runaway response can't smuggle bad data through.
 *   - Generated entries are committed AS DATA, reviewable in git diff. A
 *     wrong layer can be removed by deleting its key from the output file;
 *     the script will skip that topic on the next run (idempotent).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node apps/frontend/scripts/extract-layered-design-from-pngs.mjs
 *   --dry-run        list candidates without API calls
 *   --limit=N        process at most N this run (smoke-test)
 *   --topic=ID       process one topic by id (smoke-test)
 *   --concurrency=4  parallel calls (default 3 — vision is heavier, slower)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const TOPICS_DIR = path.join(ROOT, 'src/data/capra/topics');
const OUT_DIR = path.join(TOPICS_DIR, '__generated');
const OUT_FILE = path.join(OUT_DIR, 'layered-design.ts');
const PUBLIC_DIR = path.join(ROOT, 'public');

// Same set of files the prose extractor walks
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

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const ONE_TOPIC = (ARGS.find(a => a.startsWith('--topic=')) || '').split('=')[1] || null;
const LIMIT = parseInt((ARGS.find(a => a.startsWith('--limit=')) || '').split('=')[1] || '0', 10);
const CONCURRENCY = parseInt((ARGS.find(a => a.startsWith('--concurrency=')) || '').split('=')[1] || '3', 10);

function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function looksLikeTopic(obj) {
  if (!isPlainObject(obj)) return false;
  const hasId = typeof obj.id === 'string' || typeof obj.slug === 'string';
  const hasTitle = typeof obj.title === 'string';
  return hasId && hasTitle;
}

/* Walk a topic object and yield every diagramSrc-bearing implementation
   block (basicImplementation / advancedImplementation / createFlow / etc).
   We only want PNGs that are the PRIMARY architecture image for the topic,
   not flow images. Picking the basicImplementation diagram first; falling
   back to the topic-level diagramSrc if that's the only one present. */
function pickBestDiagramSrc(topic) {
  if (typeof topic.diagramSrc === 'string' && topic.diagramSrc.includes('/diagrams/')) {
    return topic.diagramSrc;
  }
  if (isPlainObject(topic.basicImplementation) && typeof topic.basicImplementation.diagramSrc === 'string') {
    return topic.basicImplementation.diagramSrc;
  }
  if (isPlainObject(topic.advancedImplementation) && typeof topic.advancedImplementation.diagramSrc === 'string') {
    return topic.advancedImplementation.diagramSrc;
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert system architect extracting a CONCISE layered architecture from an existing diagram so it can be re-rendered as a stack-of-layers schematic.

You'll see ONE architecture image. Return STRICTLY JSON in this shape:
{
  "layeredDesign": [
    { "name": "Client Layer", "purpose": "What this layer does in 5-10 words", "components": ["3-6 short component names"] }
  ]
}

Rules:
- 3 to 5 layers total. Top-down logical grouping (Client -> API -> Service -> Data -> Infra) — adapt to whatever the diagram shows.
- Each layer has 3 to 6 components. Component names are short (1-4 words). Use canonical service names visible in the diagram (Kafka, Redis, S3, etc.).
- Layer "purpose" is 5-10 words, written in active voice.
- HALLUCINATION GUARD: If the diagram is unreadable, decorative, or you aren't confident you can faithfully extract its structure, RETURN { "layeredDesign": [] } — do not invent.
- ABSOLUTELY no prose outside the JSON. No markdown fences. The first character of your response must be { and the last must be }.`;

async function callVision(client, topicId, pngPath) {
  const data = await fs.readFile(pngPath);
  const b64 = data.toString('base64');
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
        { type: 'text', text: `Topic id: ${topicId}. Extract its layered architecture per the rules above.` },
      ],
    }],
  });
  const raw = resp.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Bad JSON for topic=${topicId}: ${cleaned.slice(0, 200)}`);
  }
  if (!parsed || !Array.isArray(parsed.layeredDesign)) {
    throw new Error(`Missing layeredDesign for topic=${topicId}`);
  }
  return parsed.layeredDesign
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
}

async function loadAllTopics() {
  const all = [];
  for (const fname of TOPIC_FILES) {
    const fpath = path.join(TOPICS_DIR, fname);
    try { await fs.access(fpath); } catch { continue; }
    let mod;
    try { mod = await import(pathToFileURL(fpath).href); } catch { continue; }
    for (const value of Object.values(mod)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (looksLikeTopic(item)) all.push({ id: item.id || item.slug, raw: item, sourceFile: fname });
        if (isPlainObject(item) && Array.isArray(item.topics)) {
          for (const t of item.topics) {
            if (looksLikeTopic(t)) all.push({ id: t.id || t.slug, raw: t, sourceFile: fname });
          }
        }
      }
    }
  }
  // Dedupe by id (last wins)
  const byId = new Map();
  for (const t of all) byId.set(t.id, t);
  return [...byId.values()];
}

async function loadExistingOutput() {
  try {
    const src = await fs.readFile(OUT_FILE, 'utf8');
    // Bracket-counting parser — the previous regex was non-greedy and stopped
    // at the first ']' it saw, which sits inside a nested `components` array,
    // so it failed to capture the outer layer-array for any entry. Walk the
    // file character-by-character: for each "'topic-id': [", track bracket
    // depth and slice out the balanced outer array, then JSON.parse.
    const map = {};
    const KEY_RE = /'([^']+)':\s*\[/g;
    let m;
    while ((m = KEY_RE.exec(src)) !== null) {
      const id = m[1];
      const arrStart = m.index + m[0].length - 1; // position of the opening '['
      let depth = 0;
      let i = arrStart;
      for (; i < src.length; i++) {
        const ch = src[i];
        if (ch === '[') depth++;
        else if (ch === ']') {
          depth--;
          if (depth === 0) { i++; break; }
        }
      }
      const slice = src.slice(arrStart, i);
      try { map[id] = JSON.parse(slice); } catch { /* skip malformed */ }
    }
    return map;
  } catch { return {}; }
}

async function writeOutput(allEntries) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const sortedKeys = Object.keys(allEntries).sort();
  const body = sortedKeys
    .map(k => `  '${k}': ${JSON.stringify(allEntries[k], null, 2).split('\n').join('\n  ')}`)
    .join(',\n');
  const banner = `/* AUTO-GENERATED by apps/frontend/scripts/extract-layered-design.mjs
   AND apps/frontend/scripts/extract-layered-design-from-pngs.mjs.
   Do not edit by hand. Re-run either script to add more entries. */\n`;
  const out = `${banner}
import type { Layer } from '../../../../components/capra/docs/RoughLayeredDiagram.types';

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
      try { results[i] = await fn(items[i], i); }
      catch (e) { results[i] = { error: e.message }; }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !DRY_RUN) {
    console.error('ANTHROPIC_API_KEY env var required (or pass --dry-run).');
    process.exit(1);
  }

  console.log('[1/5] Loading topic data files...');
  const all = await loadAllTopics();
  console.log(`      Found ${all.length} candidate topics.`);

  console.log('[2/5] Loading existing generated map...');
  const existing = await loadExistingOutput();
  console.log(`      ${Object.keys(existing).length} topics already covered (Phase 1 + earlier Phase 2).`);

  console.log('[3/5] Filtering to topics with a PNG diagram and no coverage yet...');
  let queue = [];
  for (const t of all) {
    if (Array.isArray(t.raw.layeredDesign) && t.raw.layeredDesign.length) continue;
    if (existing[t.id]) continue;
    const src = pickBestDiagramSrc(t.raw);
    if (!src) continue;
    const pngPath = path.join(PUBLIC_DIR, src.replace(/^\//, ''));
    try {
      await fs.access(pngPath);
      queue.push({ ...t, src, pngPath });
    } catch {
      // PNG missing on disk — skip silently
    }
  }
  if (ONE_TOPIC) queue = queue.filter(t => t.id === ONE_TOPIC);
  if (LIMIT > 0) queue = queue.slice(0, LIMIT);

  console.log(`[4/5] ${queue.length} topics queued for vision extraction (concurrency=${CONCURRENCY}).`);
  if (DRY_RUN) {
    queue.slice(0, 30).forEach(t => console.log(`      - ${t.id}  (${path.basename(t.pngPath)})`));
    if (queue.length > 30) console.log(`      ... +${queue.length - 30} more`);
    console.log('Dry run — exiting.');
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const start = Date.now();
  let ok = 0, skipped = 0, fail = 0, processed = 0;

  await pool(queue, CONCURRENCY, async (t) => {
    try {
      const layers = await callVision(client, t.id, t.pngPath);
      if (layers.length === 0) {
        skipped++;
      } else {
        existing[t.id] = layers;
        ok++;
      }
    } catch (e) {
      fail++;
      console.warn(`  [fail] ${t.id}: ${e.message}`);
    }
    processed++;
    if (processed % 5 === 0) {
      const rate = processed / ((Date.now() - start) / 1000);
      console.log(`      progress ${processed}/${queue.length}  (${rate.toFixed(1)}/s, ok=${ok} skip=${skipped} fail=${fail})`);
    }
  });

  console.log(`[5/5] Writing generated file: ${path.relative(ROOT, OUT_FILE)}`);
  await writeOutput(existing);
  console.log(`\nDone. ok=${ok}  skipped(low-confidence)=${skipped}  failed=${fail}  total in file=${Object.keys(existing).length}.`);
  console.log(`Elapsed: ${((Date.now() - start) / 1000).toFixed(1)}s.`);
}

main().catch(e => { console.error(e); process.exit(1); });
