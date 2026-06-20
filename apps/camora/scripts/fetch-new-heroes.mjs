#!/usr/bin/env node
/**
 * fetch-new-heroes.mjs
 * Downloads hero images for categories missing from manifest.json.
 * Uses direct Unsplash photo URLs (curated IDs, no API key needed).
 * Duotone navy CSS treatment in TopicIllustration handles visual unification.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const OUT_DIR = join(ROOT, 'public', 'topic-heroes');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');

// Curated Unsplash photo IDs — dark/tech-aesthetic, work well with navy duotone.
// Format: images.unsplash.com/photo-{id}?w=800&q=80&fm=jpg
const TOPICS = [
  {
    id: 'cloud',
    photoId: '1558494949-ef010cbdcc31', // dark server room with blue LEDs
    query: 'server room blue led lights dark',
    photographer: 'Taylor Vick',
    photographerUrl: 'https://unsplash.com/@tvick?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1558494949-ef010cbdcc31?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'linux',
    photoId: '1629654297299-c8506221ca97', // terminal/code on dark screen
    query: 'computer terminal dark command line',
    photographer: 'Florian Olivo',
    photographerUrl: 'https://unsplash.com/@florianolv?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1629654297299-c8506221ca97?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'networking',
    photoId: '1544197150-b99a580bb7a8', // fiber optic cables
    query: 'fiber optic cables glowing dark',
    photographer: 'Umberto',
    photographerUrl: 'https://unsplash.com/@umby?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1544197150-b99a580bb7a8?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'troubleshooting',
    photoId: '1516321318423-f06f85e504b3', // abstract magnified dark
    query: 'magnifying glass abstract dark',
    photographer: 'agence olloweb',
    photographerUrl: 'https://unsplash.com/@olloweb?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1516321318423-f06f85e504b3?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'war-stories',
    photoId: '1597852074816-d8c79d20ed71', // dramatic dark server lights
    query: 'server room dramatic dark',
    photographer: 'Massimo Botturi',
    photographerUrl: 'https://unsplash.com/@wildmax?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1597852074816-d8c79d20ed71?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'comparisons',
    photoId: '1480714378408-67cf0d13bc1b', // road split at night long exposure
    query: 'split road two paths abstract night',
    photographer: 'Viktor Forgacs',
    photographerUrl: 'https://unsplash.com/@sonance?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1480714378408-67cf0d13bc1b?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'mlops',
    photoId: '1677442136019-21780ecad995', // AI neural network abstract
    query: 'neural network nodes glowing abstract',
    photographer: 'Steve Johnson',
    photographerUrl: 'https://unsplash.com/@steve_j?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1677442136019-21780ecad995?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'aiops',
    photoId: '1620712943543-bcc4688e7485', // circuit board close-up dark
    query: 'artificial intelligence circuit brain dark',
    photographer: 'Michael Dziedzic',
    photographerUrl: 'https://unsplash.com/@lazycreekimages?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1620712943543-bcc4688e7485?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'observability',
    photoId: '1551288049-bebda4e38f71', // multiple dark screens with data
    query: 'multiple screens data dashboard dark',
    photographer: 'Luke Chesser',
    photographerUrl: 'https://unsplash.com/@lukechesser?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1551288049-bebda4e38f71?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'platform',
    photoId: '1486325212027-8081e485255e', // abstract architecture scaffolding
    query: 'scaffolding construction abstract dark',
    photographer: 'Danist Soh',
    photographerUrl: 'https://unsplash.com/@danist07?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1486325212027-8081e485255e?utm_source=camora&utm_medium=referral',
  },
  {
    id: 'challenges',
    photoId: '1529699211952-734e680f0960', // chess board dark moody
    query: 'chess board strategy dark abstract',
    photographer: 'Randy Fath',
    photographerUrl: 'https://unsplash.com/@randyfath?utm_source=camora&utm_medium=referral',
    unsplashUrl: 'https://unsplash.com/photos/1529699211952-734e680f0960?utm_source=camora&utm_medium=referral',
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
  await mkdir(OUT_DIR, { recursive: true });

  let manifest = {};
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(raw);
  } catch {
    console.log('  No existing manifest — starting fresh.');
  }

  let added = 0;
  for (const topic of TOPICS) {
    const { id, photoId, query, photographer, photographerUrl, unsplashUrl } = topic;
    process.stdout.write(`  → ${id.padEnd(18)} `);
    const destPath = join(OUT_DIR, `${id}.jpg`);
    let buf;
    try {
      buf = await downloadImage(photoId);
    } catch (err) {
      console.error(`✗  ${err.message}`);
      continue;
    }
    try {
      await writeFile(destPath, buf);
    } catch (err) {
      console.error(`✗  write failed: ${err.message}`);
      continue;
    }
    manifest[id] = {
      file: `/topic-heroes/${id}.jpg`,
      photographer,
      photographerUrl,
      unsplashUrl,
      query,
      bytes: buf.length,
    };
    added++;
    console.log(`✓  ${(buf.length / 1024).toFixed(0)} KB`);
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n  ✓ manifest updated — ${added}/${TOPICS.length} new images added.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
