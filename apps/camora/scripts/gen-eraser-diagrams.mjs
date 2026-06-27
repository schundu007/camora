#!/usr/bin/env node
/**
 * Generate eraser-{aws,azure,gcp}.png for every topic slug via Eraser AI.
 * Uses Firebase refresh token to auto-refresh session — no cookies, no expiry.
 * Consumes Eraser AI credits (not paid API calls).
 *
 * USAGE:
 *   node apps/camora/scripts/gen-eraser-diagrams.mjs [--slug=<slug>] [--provider=aws|azure|gcp] [--force] [--limit=N] [--dry-run]
 *
 * REQUIRED ENV:
 *   ERASER_REFRESH_TOKEN   Firebase refresh token (permanent, get once from DevTools IndexedDB)
 *
 * PROMPTS:
 *   apps/camora/scripts/eraser-prompts/{slug}.txt — {PROVIDER} replaced with AWS/Azure/GCP.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REFRESH_TOKEN = process.env.ERASER_REFRESH_TOKEN;
if (!REFRESH_TOKEN) {
  console.error('Missing ERASER_REFRESH_TOKEN.');
  process.exit(1);
}

const FIREBASE_API_KEY = 'AIzaSyCX5UYWp-3ZAVEuQ3Ospj9Xg9e6ji16roI';
const SESSION_ID       = '3TVBEsFiAgslQdXMdurc';
const WORKSPACE_ID     = '9DzIeEmqzNtS52hJEODr';
const PROMPTS_DIR      = path.resolve(__dirname, 'eraser-prompts');
const PUBLIC_DIAGRAMS  = path.resolve(__dirname, '../public/diagrams');
const ICON_BASE        = 'https://app.eraser.io/_next/static/canvas-icons';

const argv      = process.argv.slice(2);
const flag      = (name, fb) => { const h = argv.find(a => a.startsWith(`--${name}=`)); return h ? h.split('=').slice(1).join('=') : fb; };
const LIMIT        = parseInt(flag('limit', '0'), 10) || Infinity;
const ONLY_SLUG    = flag('slug', '');
const ONLY_PROV    = flag('provider', '');
const DRY_RUN      = argv.includes('--dry-run');
const FORCE        = argv.includes('--force');
const COMMIT_EVERY = parseInt(flag('commit-every', '0'), 10);
// Default concurrency=1 — one at a time prevents partial/corrupt renders
const CONCURRENCY  = parseInt(flag('concurrency', '1'), 10);

// Read PNG width from header (bytes 16-19) without loading full image
function pngWidth(filePath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    return buf.readUInt32BE(16);
  } catch { return 0; }
}

const PROVIDERS  = ONLY_PROV ? [ONLY_PROV] : ['aws', 'azure', 'gcp'];
const PROV_LABEL = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

// ── Auth ──────────────────────────────────────────────────────────────────────

let idToken = null;
let tokenExpiry = 0;

async function getIdToken() {
  if (idToken && Date.now() < tokenExpiry - 60_000) return idToken;
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://app.eraser.io/',
        'Origin': 'https://app.eraser.io',
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}`,
    }
  );
  if (!res.ok) throw new Error(`Token refresh failed: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  idToken = data.id_token;
  tokenExpiry = Date.now() + parseInt(data.expires_in, 10) * 1000;
  console.log('  [auth] token refreshed');
  return idToken;
}

function eraserHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Origin': 'https://app.eraser.io',
    'Referer': 'https://app.eraser.io/',
  };
}

// ── Eraser AI API ─────────────────────────────────────────────────────────────

async function callPlanner(prompt, token) {
  const res = await fetch('https://app.eraser.io/api/ai/planner', {
    method: 'POST',
    headers: eraserHeaders(token),
    body: JSON.stringify({
      userMessage: prompt,
      sessionId: SESSION_ID,
      workspaceId: WORKSPACE_ID,
      diagramType: 'cloud-architecture-diagram',
    }),
  });
  if (!res.ok) throw new Error(`Planner failed: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  const tc = data.interaction?.toolCalls?.[0];
  if (!tc) throw new Error(`No toolCall in planner response: ${JSON.stringify(data).slice(0, 200)}`);
  return { interactionId: data.interactionId, toolCallId: tc.id, elementId: tc.parameters?.elementId };
}

async function callToolExecute(interactionId, toolCallId, elementId, token) {
  const res = await fetch('https://app.eraser.io/api/ai/toolExecute', {
    method: 'POST',
    headers: eraserHeaders(token),
    body: JSON.stringify({
      interactionId,
      toolCallId,
      elementId,
      sessionId: SESSION_ID,
      workspaceId: WORKSPACE_ID,
    }),
  });
  if (!res.ok) throw new Error(`toolExecute failed: HTTP ${res.status} ${await res.text()}`);

  // Stream NDJSON — take the LAST freeformElements (most complete state)
  const text = await res.text();
  let finalElements = null;

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'progress' && Array.isArray(obj.data?.freeformElements) && obj.data.freeformElements.length > 0) {
        finalElements = obj.data.freeformElements;
      }
    } catch {}
  }

  if (!finalElements || finalElements.length === 0) {
    throw new Error('No freeform elements returned by toolExecute');
  }
  return finalElements;
}

// ── Icon loader ───────────────────────────────────────────────────────────────

const iconCache = new Map();

async function fetchIcon(name) {
  if (!name) return null;
  if (iconCache.has(name)) return iconCache.get(name);
  try {
    const res = await fetch(`${ICON_BASE}/${name}.svg`, {
      headers: { 'Referer': 'https://app.eraser.io/', 'Origin': 'https://app.eraser.io' },
    });
    if (!res.ok) { iconCache.set(name, null); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);
    iconCache.set(name, img);
    return img;
  } catch {
    iconCache.set(name, null);
    return null;
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const RENDER_SCALE = 2;   // 2× for retina-quality output
const PAD          = 60;  // canvas padding around diagram content

function getPort(el, port) {
  const x = el.x ?? 0, y = el.y ?? 0, w = el.width ?? 50, h = el.height ?? 50;
  switch ((port || '').toLowerCase()) {
    case 'left':   return { x, y: y + h / 2 };
    case 'right':  return { x: x + w, y: y + h / 2 };
    case 'top':    return { x: x + w / 2, y };
    case 'bottom': return { x: x + w / 2, y: y + h };
    default:       return { x: x + w / 2, y: y + h / 2 };
  }
}

const stripMd = s => (s || '').replace(/\*\*/g, '').replace(/\*([^*]+)\*/g, '$1').replace(/^#+\s*/gm, '');

function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

async function renderFreeform(elements, outPath) {
  const S = RENDER_SCALE;

  // Bounding box from all positioned elements
  const positioned = elements.filter(e => e.x != null && e.y != null && e.width != null && e.height != null);
  if (positioned.length === 0) throw new Error('No positioned elements to render');

  const minX = Math.min(...positioned.map(e => e.x)) - PAD;
  const minY = Math.min(...positioned.map(e => e.y)) - PAD;
  const maxX = Math.max(...positioned.map(e => e.x + (e.width || 0))) + PAD;
  const maxY = Math.max(...positioned.map(e => e.y + (e.height || 0))) + PAD;

  const W = Math.round((maxX - minX) * S);
  const H = Math.round((maxY - minY) * S);

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Coordinate helpers
  const px = x => (x - minX) * S;
  const py = y => (y - minY) * S;

  // Element lookup for relationship arrows
  const byId = new Map(elements.filter(e => e.id).map(e => [e.id, e]));

  // ── 1. Groups (background containers) ────────────────────────────────────
  for (const e of elements.filter(el => el.tag === 'Group')) {
    const x = px(e.x), y = py(e.y), w = e.width * S, h = e.height * S;
    ctx.fillStyle   = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  }

  // ── 2. Shapes (note / annotation boxes) ──────────────────────────────────
  for (const e of elements.filter(el => el.tag === 'Shape')) {
    const x = px(e.x), y = py(e.y), w = e.width * S, h = e.height * S;
    ctx.fillStyle   = '#fefce8';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    const texts = Array.isArray(e.texts) ? e.texts : (e.text ? [{ text: String(e.text), fontSize: 12 }] : []);
    let textY = y + 10;
    for (const t of texts) {
      const fs = (t.fontSize || 12) * S * 0.5;
      ctx.fillStyle = '#374151';
      ctx.font = `${fs}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, stripMd(t.text), (w - 16));
      for (const line of lines) {
        ctx.fillText(line, x + 8, textY);
        textY += fs * 1.4;
      }
    }
  }

  // ── 3. Icons (cloud service components) ──────────────────────────────────
  for (const e of elements.filter(el => el.tag === 'Icon')) {
    const cx = px(e.x + (e.width  || 50) / 2);
    const cy = py(e.y + (e.height || 50) / 2);
    const sz = (e.width || 50) * S * 0.75;

    const img = await fetchIcon(e.icon);
    if (img) {
      ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
    } else {
      // Fallback: colored pill box with 2-letter abbreviation
      ctx.fillStyle   = '#dbeafe';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - sz / 2, cy - sz / 2, sz, sz, 8);
      ctx.fill();
      ctx.stroke();
      const abbrev = (e.texts?.[0]?.text || e.id || '??').slice(0, 2).toUpperCase();
      ctx.fillStyle = '#1e40af';
      ctx.font      = `bold ${sz * 0.36}px Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(abbrev, cx, cy);
    }

    // Text labels below icon
    const texts = Array.isArray(e.texts) ? e.texts : [];
    let labelY = py(e.y + (e.height || 50)) + 5;
    for (const t of texts) {
      const fs = (t.fontSize || 13) * S * 0.5;
      ctx.fillStyle    = t.color === 'gray' ? '#6b7280' : '#1e293b';
      ctx.font         = `${fs}px Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, stripMd(t.text), (e.width || 50) * S * 1.2);
      for (const line of lines) {
        ctx.fillText(line, cx, labelY);
        labelY += fs * 1.3;
      }
    }
  }

  // ── 4. Textboxes (titles and legends) ────────────────────────────────────
  for (const e of elements.filter(el => el.tag === 'Textbox')) {
    const rawText = typeof e.text === 'string' ? e.text : '';
    if (!rawText.trim()) continue;

    const isHeading = rawText.startsWith('#');
    const clean     = stripMd(rawText);
    const fs        = isHeading ? 18 * S * 0.5 : (e.fontSize || 13) * S * 0.5;

    ctx.fillStyle    = isHeading ? '#0f172a' : '#475569';
    ctx.font         = `${isHeading ? 'bold ' : ''}${fs}px Arial, sans-serif`;
    ctx.textAlign    = e.hAlign === 'center' ? 'center' : 'left';
    ctx.textBaseline = 'top';

    const x      = px(e.x);
    const y      = py(e.y);
    const maxW   = (e.width || 1200) * S;

    const lines = wrapText(ctx, clean, maxW);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * fs * 1.4));
  }

  // ── 5. Relationships (arrows with labels) ─────────────────────────────────
  for (const e of elements.filter(el => el.tag === 'Relationship')) {
    const fromEl = byId.get(e.from);
    const toEl   = byId.get(e.to);
    if (!fromEl || !toEl) continue;

    const fp = getPort(fromEl, e.fromPort);
    const tp = getPort(toEl,   e.toPort);

    const x1 = px(fp.x), y1 = py(fp.y);
    const x2 = px(tp.x), y2 = py(tp.y);
    const dx = x2 - x1, dy = y2 - y1;

    // Bezier arrow
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + dx * 0.4, y1, x1 + dx * 0.6, y2, x2, y2);
    ctx.stroke();

    // Arrowhead (pointing at endpoint)
    const angle = Math.atan2(y2 - (y1 + dy * 0.5), x2 - (x1 + dx * 0.6));
    const head  = 8;
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Label with white background pill
    if (e.label) {
      const midX = x1 + dx / 2;
      const midY = y1 + dy / 2 - 10;
      const fs   = 11 * S * 0.5;
      ctx.font   = `${fs}px Arial, sans-serif`;
      const tw   = ctx.measureText(e.label).width + 8;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(midX - tw / 2, midY - fs - 2, tw, fs + 6, 3);
      ctx.fill();
      ctx.fillStyle    = '#475569';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(stripMd(e.label), midX, midY);
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

// ── Task runner ───────────────────────────────────────────────────────────────

const tasks = [];
for (const slug of fs.readdirSync(PUBLIC_DIAGRAMS, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort()) {
  if (ONLY_SLUG && slug !== ONLY_SLUG) continue;
  const promptFile = path.join(PROMPTS_DIR, `${slug}.txt`);
  if (!fs.existsSync(promptFile)) continue;
  const basePrompt = fs.readFileSync(promptFile, 'utf8').trim();
  for (const provider of PROVIDERS) {
    const outPath = path.join(PUBLIC_DIAGRAMS, slug, `eraser-${provider}.png`);
    // Skip if already generated by new freeform renderer (width ≥ 2000px).
    // Old renderer produced 1500-1600px wide — those still need regenerating.
    if (!FORCE && fs.existsSync(outPath) && pngWidth(outPath) >= 2000) continue;
    tasks.push({ slug, provider, outPath, prompt: basePrompt.replace(/\{PROVIDER\}/g, PROV_LABEL[provider]) });
  }
}

const total = Math.min(tasks.length, LIMIT === Infinity ? tasks.length : LIMIT);
console.log(`${total} diagrams to generate (concurrency=${CONCURRENCY})`);
if (DRY_RUN) { tasks.slice(0, total).forEach(t => console.log(`  ${t.slug}/${t.provider}`)); process.exit(0); }
if (total === 0) { console.log('Nothing to do.'); process.exit(0); }

let done = 0, failed = 0;
const queue = tasks.slice(0, total);

async function worker() {
  while (queue.length > 0) {
    const task = queue.shift();
    const label = `${task.slug}/${task.provider}`;
    const t0 = Date.now();
    try {
      console.log(`  → [${done + failed + 1}/${total}] ${label}`);
      const token = await getIdToken();
      const { interactionId, toolCallId, elementId } = await callPlanner(task.prompt, token);
      const freshToken = await getIdToken();
      const elements = await callToolExecute(interactionId, toolCallId, elementId, freshToken);
      console.log(`     elements: ${elements.length} (${[...new Set(elements.map(e => e.tag))].join(', ')})`);
      await renderFreeform(elements, task.outPath);
      done++;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ✓ [${done}/${total}] ${label} (${elapsed}s)`);
      if (COMMIT_EVERY > 0 && done % COMMIT_EVERY === 0) {
        try {
          execSync('git add apps/camora/public/diagrams/', { stdio: 'pipe' });
          execSync(`git commit -m "chore(diagrams): progress ${done}/${total} [skip ci]"`, { stdio: 'pipe' });
          execSync('git push', { stdio: 'pipe' });
          console.log(`  [git] committed progress at ${done}/${total}`);
        } catch (e) { console.warn(`  [git] commit skipped: ${e.message.slice(0, 80)}`); }
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${label}: ${err.message}`);
    }
    // Polite delay between requests
    if (queue.length > 0) await new Promise(r => setTimeout(r, 1500));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`\nDone: ${done} generated, ${failed} failed.`);
if (failed > 0) process.exit(1);
