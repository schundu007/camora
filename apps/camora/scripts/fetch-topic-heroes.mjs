#!/usr/bin/env node
/**
 * fetch-topic-heroes.mjs
 *
 * Pulls one curated photograph per topic category from Unsplash,
 * writes them to public/topic-heroes/<id>.jpg + a manifest.json
 * with photographer attribution (Unsplash API license terms).
 *
 * Run:
 *   cd apps/frontend
 *   VITE_UNSPLASH_KEY=<access-key> node scripts/fetch-topic-heroes.mjs
 *
 * Queries are tuned for tech-aesthetic / abstract imagery so the
 * duotone navy CSS filter (applied in TopicIllustration) unifies them
 * into a single brand-mood look across the card grid.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const OUT_DIR = join(ROOT, 'public', 'topic-heroes');

const TOPICS = [
  { id: 'coding',         query: 'binary code abstract dark',          orientation: 'landscape' },
  { id: 'system-design',  query: 'circuit board macro',                orientation: 'landscape' },
  { id: 'microservices',  query: 'abstract geometric pattern',         orientation: 'landscape' },
  { id: 'databases',      query: 'fiber optic light',                  orientation: 'landscape' },
  { id: 'low-level',      query: 'blueprint architecture drawing',     orientation: 'landscape' },
  { id: 'projects',       query: 'minimal workspace clean',            orientation: 'landscape' },
  { id: 'roadmaps',       query: 'abstract lines path long exposure',  orientation: 'landscape' },
  { id: 'eng-blogs',      query: 'modern library books minimal',       orientation: 'landscape' },
  { id: 'behavioral',     query: 'people silhouette abstract',         orientation: 'landscape' },
];

const KEY = process.env.VITE_UNSPLASH_KEY || process.env.UNSPLASH_KEY;
if (!KEY) {
  console.error('\n  ✗ VITE_UNSPLASH_KEY (or UNSPLASH_KEY) is not set.\n    Add to apps/frontend/.env.local first.\n');
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY}` } });
  if (!res.ok) throw new Error(`Unsplash ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf.length;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {};
  for (const topic of TOPICS) {
    process.stdout.write(`  → ${topic.id.padEnd(16)} `);
    const search = new URL('https://api.unsplash.com/search/photos');
    search.searchParams.set('query', topic.query);
    search.searchParams.set('per_page', '1');
    search.searchParams.set('orientation', topic.orientation);
    search.searchParams.set('content_filter', 'high');
    let data;
    try { data = await fetchJson(search.toString()); }
    catch (err) { console.error(`\n    ✗ search failed: ${err.message}`); continue; }
    const photo = data.results?.[0];
    if (!photo) { console.error(`\n    ✗ no results for "${topic.query}"`); continue; }
    const imgUrl = photo.urls?.regular || photo.urls?.full;
    const file = `${topic.id}.jpg`;
    const destPath = join(OUT_DIR, file);
    let bytes;
    try { bytes = await downloadTo(imgUrl, destPath); }
    catch (err) { console.error(`\n    ✗ download failed: ${err.message}`); continue; }
    try { await fetchJson(photo.links.download_location); } catch { /* tracking best-effort */ }
    manifest[topic.id] = {
      file: `/topic-heroes/${file}`,
      photographer: photo.user?.name || 'Unknown',
      photographerUrl: photo.user?.links?.html ? `${photo.user.links.html}?utm_source=camora&utm_medium=referral` : null,
      unsplashUrl: photo.links?.html ? `${photo.links.html}?utm_source=camora&utm_medium=referral` : null,
      query: topic.query,
      bytes,
    };
    console.log(`✓  ${(bytes / 1024).toFixed(0)} KB · @${photo.user?.username || '?'}`);
  }
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n  ✓ manifest written: public/topic-heroes/manifest.json\n    ${Object.keys(manifest).length}/${TOPICS.length} categories cached.\n`);
}
main().catch((err) => { console.error(err); process.exit(1); });
