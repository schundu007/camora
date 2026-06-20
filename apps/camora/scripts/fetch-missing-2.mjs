#!/usr/bin/env node
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const OUT_DIR = join(ROOT, 'public', 'topic-heroes');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');

const TOPICS = [
  {
    id: 'war-stories',
    photoId: '1558618666-fcd25c85cd64',
    query: 'server room dramatic glow dark',
    photographer: 'Isai Ramos',
    photographerUrl: 'https://unsplash.com/@isairamos?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1558618666-fcd25c85cd64?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'challenges',
    photoId: '1528819622765-d6bcf132f793',
    query: 'chess board strategy dark moody',
    photographer: 'Piotr Makowski',
    photographerUrl: 'https://unsplash.com/@squarelynx?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1528819622765-d6bcf132f793?utm_source=camora&utm_medium=referral',
  },
];

async function downloadImage(photoId) {
  const url = `https://images.unsplash.com/photo-${photoId}?w=800&q=80&fm=jpg&fit=crop`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`too small (${buf.length} bytes)`);
  return buf;
}

async function main() {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw);

  for (const topic of TOPICS) {
    const { id, photoId, query, photographer, photographerUrl, unsplashUrl } = topic;
    process.stdout.write(`  → ${id.padEnd(18)} `);
    let buf;
    try { buf = await downloadImage(photoId); }
    catch (err) { console.error(`✗  ${err.message}`); continue; }
    await writeFile(join(OUT_DIR, `${id}.jpg`), buf);
    manifest[id] = { file: `/topic-heroes/${id}.jpg`, photographer, photographerUrl, unsplashUrl, query, bytes: buf.length };
    console.log(`✓  ${(buf.length / 1024).toFixed(0)} KB`);
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log('\n  ✓ manifest updated.\n');
}
main().catch((err) => { console.error(err); process.exit(1); });
