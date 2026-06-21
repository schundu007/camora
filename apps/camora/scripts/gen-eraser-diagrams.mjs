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
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REFRESH_TOKEN = process.env.ERASER_REFRESH_TOKEN;
if (!REFRESH_TOKEN) {
  console.error('Missing ERASER_REFRESH_TOKEN.');
  process.exit(1);
}

const FIREBASE_API_KEY  = 'AIzaSyCX5UYWp-3ZAVEuQ3Ospj9Xg9e6ji16roI';
const SESSION_ID        = '3TVBEsFiAgslQdXMdurc';
const WORKSPACE_ID      = '9DzIeEmqzNtS52hJEODr';
const PROMPTS_DIR       = path.resolve(__dirname, 'eraser-prompts');
const PUBLIC_DIAGRAMS   = path.resolve(__dirname, '../public/diagrams');
const ICON_BASE         = 'https://app.eraser.io/_next/static/canvas-icons';

const argv    = process.argv.slice(2);
const flag    = (name, fb) => { const h = argv.find(a => a.startsWith(`--${name}=`)); return h ? h.split('=').slice(1).join('=') : fb; };
const LIMIT   = parseInt(flag('limit', '0'), 10) || Infinity;
const ONLY_SLUG = flag('slug', '');
const ONLY_PROV = flag('provider', '');
const DRY_RUN = argv.includes('--dry-run');
const FORCE   = argv.includes('--force');
const CONCURRENCY = parseInt(flag('concurrency', '2'), 10);

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
  console.log('Token refreshed.');
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

// ── Eraser AI ─────────────────────────────────────────────────────────────────

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
  return { interactionId: data.interactionId, toolCallId: tc.id, elementId: tc.parameters.elementId };
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

  // Stream NDJSON lines
  const text = await res.text();
  let diagramCode = '';
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'diagram-code' || obj.diagramCode) diagramCode += (obj.diagramCode || obj.code || '');
      if (obj.type === 'complete' && obj.diagramCode) diagramCode = obj.diagramCode;
    } catch {}
  }
  if (!diagramCode) throw new Error(`No diagram code in toolExecute response`);
  return diagramCode;
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

const iconCache = new Map();
async function fetchIcon(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  try {
    const img = await loadImage(`${ICON_BASE}/${name}.svg`);
    iconCache.set(name, img);
    return img;
  } catch { return null; }
}

async function renderDiagram(diagramCode, outPath) {
  const W = 1600, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Parse nodes and edges from diagram code
  const nodePattern = /^(\w[\w\s-]*?)\s*\[([^\]]*)\]/gm;
  const edgePattern = /^(\w[\w\s-]*?)\s*(?:>|->|--|<>)\s*(\w[\w\s-]*?)(?:\s*:\s*(.+))?$/gm;

  const nodes = new Map();
  let nodeMatch;
  while ((nodeMatch = nodePattern.exec(diagramCode)) !== null) {
    const name = nodeMatch[1].trim();
    const props = Object.fromEntries(
      nodeMatch[2].split(',').map(p => p.trim().split(':').map(s => s.trim()))
        .filter(([k]) => k)
    );
    nodes.set(name, { name, icon: props.icon, label: props.label || name });
  }

  const edges = [];
  let edgeMatch;
  while ((edgeMatch = edgePattern.exec(diagramCode)) !== null) {
    edges.push({ from: edgeMatch[1].trim(), to: edgeMatch[2].trim(), label: edgeMatch[3]?.trim() });
  }

  // Layout: distribute nodes in a grid
  const nodeList = [...nodes.values()];
  const cols = Math.ceil(Math.sqrt(nodeList.length));
  const cellW = W / (cols + 1);
  const cellH = H / (Math.ceil(nodeList.length / cols) + 1);
  const NODE_SIZE = Math.min(cellW, cellH) * 0.35;

  nodeList.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    node.x = cellW * (col + 1);
    node.y = cellH * (row + 1);
  });

  // Draw edges
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#64748b';
  for (const edge of edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    if (edge.label) {
      ctx.fillText(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 4);
    }
  }

  // Draw nodes
  for (const node of nodeList) {
    const img = node.icon ? await fetchIcon(node.icon) : null;
    const half = NODE_SIZE / 2;

    // Box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(node.x - half, node.y - half, NODE_SIZE, NODE_SIZE, 8);
    ctx.fill();
    ctx.stroke();

    // Icon
    if (img) {
      const iconPad = NODE_SIZE * 0.18;
      ctx.drawImage(img, node.x - half + iconPad, node.y - half + iconPad, NODE_SIZE - iconPad * 2, NODE_SIZE - iconPad * 2);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${NODE_SIZE * 0.28}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.slice(0, 2).toUpperCase(), node.x, node.y);
    }

    // Label
    ctx.fillStyle = '#1e293b';
    ctx.font = `${Math.max(10, NODE_SIZE * 0.14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, node.x, node.y + half + 4);
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
    if (!FORCE && fs.existsSync(outPath)) continue;
    tasks.push({ slug, provider, outPath, prompt: basePrompt.replace(/\{PROVIDER\}/g, PROV_LABEL[provider]) });
  }
}

const total = Math.min(tasks.length, LIMIT === Infinity ? tasks.length : LIMIT);
console.log(`${total} diagrams to generate`);
if (DRY_RUN) { tasks.slice(0, total).forEach(t => console.log(`  ${t.slug}/${t.provider}`)); process.exit(0); }
if (total === 0) process.exit(0);

let done = 0, failed = 0;
const queue = tasks.slice(0, total);

async function worker() {
  while (queue.length > 0) {
    const task = queue.shift();
    try {
      const token = await getIdToken();
      const { interactionId, toolCallId, elementId } = await callPlanner(task.prompt, token);
      const freshToken = await getIdToken();
      const diagramCode = await callToolExecute(interactionId, toolCallId, elementId, freshToken);
      await renderDiagram(diagramCode, task.outPath);
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
