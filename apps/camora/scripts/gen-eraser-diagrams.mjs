#!/usr/bin/env node
/**
 * Generate eraser-{aws,azure,gcp}.png for every topic slug via Eraser REST API.
 * No browser, no cookies, no expiry — just Bearer API key auth.
 *
 * USAGE:
 *   node apps/camora/scripts/gen-eraser-diagrams.mjs [--limit=N] [--slug=<slug>] [--provider=aws|azure|gcp] [--force] [--dry-run]
 *
 * CREDENTIALS:
 *   ERASER_API_KEY   Required. From app.eraser.io → Team Settings → API Keys.
 *
 * PROMPTS:
 *   apps/camora/scripts/eraser-prompts/{slug}.txt — one file per topic.
 *   Use {PROVIDER} placeholder — replaced with AWS/Azure/GCP at runtime.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.ERASER_API_KEY;
if (!API_KEY) {
  console.error('Missing ERASER_API_KEY. Get it from app.eraser.io → Team Settings → API Keys.');
  process.exit(1);
}

const ERASER_API      = 'https://app.eraser.io/api/render/prompt';
const PROMPTS_DIR     = path.resolve(__dirname, 'eraser-prompts');
const PUBLIC_DIAGRAMS = path.resolve(__dirname, '../public/diagrams');

const argv = process.argv.slice(2);
const flag = (name, fb) => { const h = argv.find(a => a.startsWith(`--${name}=`)); return h ? h.split('=').slice(1).join('=') : fb; };
const LIMIT       = parseInt(flag('limit', '0'), 10) || Infinity;
const ONLY_SLUG   = flag('slug', '');
const ONLY_PROV   = flag('provider', '');
const DRY_RUN     = argv.includes('--dry-run');
const FORCE       = argv.includes('--force');
const CONCURRENCY = parseInt(flag('concurrency', '3'), 10);

const PROVIDERS  = ONLY_PROV ? [ONLY_PROV] : ['aws', 'azure', 'gcp'];
const PROV_LABEL = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

const tasks = [];
for (const slug of fs.readdirSync(PUBLIC_DIAGRAMS, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort()) {
  if (ONLY_SLUG && slug !== ONLY_SLUG) continue;
  const promptFile = path.join(PROMPTS_DIR, `${slug}.txt`);
  if (!fs.existsSync(promptFile)) continue;
  const basePrompt = fs.readFileSync(promptFile, 'utf8').trim();
  for (const provider of PROVIDERS) {
    const outPath = path.join(PUBLIC_DIAGRAMS, slug, `eraser-${provider}.png`);
    if (!FORCE && fs.existsSync(outPath)) continue;
    tasks.push({ slug, provider, outPath, prompt: basePrompt.replace(/\{PROVIDER\}/g, PROV_LABEL[provider]) });
  }
}

const total = Math.min(tasks.length, LIMIT === Infinity ? tasks.length : LIMIT);
console.log(`${total} diagrams to generate (${FORCE ? 'force-all' : 'missing only'})`);
if (DRY_RUN) { tasks.slice(0, total).forEach(t => console.log(`  ${t.slug}/${t.provider}`)); process.exit(0); }
if (total === 0) process.exit(0);

async function generate(task) {
  const res = await fetch(ERASER_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: task.prompt, type: 'cloud-architecture-diagram' }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const imageUrl = data.imageUrl || data.url || data.image || data.diagramUrl || data.pngUrl;
  if (!imageUrl) throw new Error(`No image URL in response: ${JSON.stringify(data).slice(0, 300)}`);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image download failed: HTTP ${imgRes.status}`);

  const buf = Buffer.from(await imgRes.arrayBuffer());
  fs.mkdirSync(path.dirname(task.outPath), { recursive: true });
  fs.writeFileSync(task.outPath, buf);
}

let done = 0, failed = 0;
const queue = tasks.slice(0, total);

async function worker() {
  while (queue.length > 0) {
    const task = queue.shift();
    try {
      await generate(task);
      done++;
      console.log(`✓ [${done}/${total}] ${task.slug}/${task.provider}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${task.slug}/${task.provider}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`\nDone: ${done} generated, ${failed} failed.`);
if (failed > 0) process.exit(1);
