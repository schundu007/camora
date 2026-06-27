/**
 * Eraser.io diagram generation via Firebase refresh token auth.
 * Calls Eraser's internal AI endpoints (uses AI credits, no paid API key).
 * Rendering logic mirrors apps/camora/scripts/gen-eraser-diagrams.mjs — uses
 * actual positioned freeformElements from the NDJSON stream, NOT DSL text.
 *
 * Required env: ERASER_REFRESH_TOKEN
 */

const FIREBASE_API_KEY = 'AIzaSyCX5UYWp-3ZAVEuQ3Ospj9Xg9e6ji16roI';
const SESSION_ID       = '3TVBEsFiAgslQdXMdurc';
const WORKSPACE_ID     = '9DzIeEmqzNtS52hJEODr';
const ICON_BASE        = 'https://app.eraser.io/_next/static/canvas-icons';
const RENDER_SCALE     = 2;  // 2× for retina-quality output
const PAD              = 60;

let _canvasMod = null;
async function loadCanvasMod() {
  if (!_canvasMod) _canvasMod = await import('@napi-rs/canvas');
  return _canvasMod;
}

let idToken     = null;
let tokenExpiry = 0;

async function getIdToken() {
  const refreshToken = process.env.ERASER_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('ERASER_REFRESH_TOKEN not set');
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
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    }
  );
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  idToken = data.id_token;
  tokenExpiry = Date.now() + parseInt(data.expires_in, 10) * 1000;
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

async function callPlanner(prompt, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let res;
  try {
    res = await fetch('https://app.eraser.io/api/ai/planner', {
      method: 'POST',
      headers: eraserHeaders(token),
      signal: controller.signal,
      body: JSON.stringify({
        userMessage: prompt,
        sessionId: SESSION_ID,
        workspaceId: WORKSPACE_ID,
        diagramType: 'cloud-architecture-diagram',
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`Planner failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const tc = data.interaction?.toolCalls?.[0];
  if (!tc) throw new Error('No toolCall in planner response');
  return { interactionId: data.interactionId, toolCallId: tc.id, elementId: tc.parameters?.elementId };
}

async function callToolExecute(interactionId, toolCallId, elementId, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let res;
  try {
    res = await fetch('https://app.eraser.io/api/ai/toolExecute', {
      method: 'POST',
      headers: eraserHeaders(token),
      signal: controller.signal,
      body: JSON.stringify({
        interactionId, toolCallId, elementId,
        sessionId: SESSION_ID,
        workspaceId: WORKSPACE_ID,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`toolExecute failed: ${res.status} ${await res.text()}`);

  const text = await res.text();
  // Take the LAST freeformElements batch — each progress event is more complete than the last
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
    console.error('[Eraser] No freeformElements found. Response excerpt:', text.slice(0, 1000));
    throw new Error('No freeform elements returned by Eraser toolExecute');
  }
  console.log(`[Eraser] Got ${finalElements.length} freeform elements`);
  return finalElements;
}

// ── Icon loader ───────────────────────────────────────────────────────────────

const iconCache = new Map();

async function fetchIcon(name) {
  if (!name) return null;
  if (iconCache.has(name)) return iconCache.get(name);
  try {
    const { loadImage } = await loadCanvasMod();
    const r = await fetch(`${ICON_BASE}/${name}.svg`, {
      headers: { 'Referer': 'https://app.eraser.io/', 'Origin': 'https://app.eraser.io' },
    });
    if (!r.ok) { iconCache.set(name, null); return null; }
    const buf = Buffer.from(await r.arrayBuffer());
    const img = await loadImage(buf);
    iconCache.set(name, img);
    return img;
  } catch {
    iconCache.set(name, null);
    return null;
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────

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

function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
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

async function renderFreeform(elements) {
  const { createCanvas } = await loadCanvasMod();
  const S = RENDER_SCALE;

  const positioned = elements.filter(e => e.x != null && e.y != null && e.width != null && e.height != null);
  if (positioned.length === 0) throw new Error('No positioned elements to render');

  const minX = Math.min(...positioned.map(e => e.x)) - PAD;
  const minY = Math.min(...positioned.map(e => e.y)) - PAD;
  const maxX = Math.max(...positioned.map(e => e.x + (e.width  || 0))) + PAD;
  const maxY = Math.max(...positioned.map(e => e.y + (e.height || 0))) + PAD;

  const W = Math.round((maxX - minX) * S);
  const H = Math.round((maxY - minY) * S);

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const px = x => (x - minX) * S;
  const py = y => (y - minY) * S;
  const byId = new Map(elements.filter(e => e.id).map(e => [e.id, e]));

  // 1. Groups (background containers)
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

  // 2. Shapes (annotation / note boxes)
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
      ctx.fillStyle    = '#374151';
      ctx.font         = `${fs}px Arial, sans-serif`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, t.text || '', w - 16);
      for (const line of lines) { ctx.fillText(line, x + 8, textY); textY += fs * 1.4; }
    }
  }

  // 3. Icons (cloud service components)
  for (const e of elements.filter(el => el.tag === 'Icon')) {
    const cx = px(e.x + (e.width  || 50) / 2);
    const cy = py(e.y + (e.height || 50) / 2);
    const sz = (e.width || 50) * S * 0.75;
    const img = await fetchIcon(e.icon);
    if (img) {
      ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
    } else {
      ctx.fillStyle   = '#dbeafe';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - sz / 2, cy - sz / 2, sz, sz, 8);
      ctx.fill();
      ctx.stroke();
      const abbrev = (e.texts?.[0]?.text || e.id || '??').slice(0, 2).toUpperCase();
      ctx.fillStyle    = '#1e40af';
      ctx.font         = `bold ${sz * 0.36}px Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(abbrev, cx, cy);
    }
    const texts = Array.isArray(e.texts) ? e.texts : [];
    let labelY = py(e.y + (e.height || 50)) + 5;
    for (const t of texts) {
      const fs = (t.fontSize || 13) * S * 0.5;
      ctx.fillStyle    = t.color === 'gray' ? '#6b7280' : '#1e293b';
      ctx.font         = `${fs}px Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, t.text || '', (e.width || 50) * S * 1.2);
      for (const line of lines) { ctx.fillText(line, cx, labelY); labelY += fs * 1.3; }
    }
  }

  // 4. Textboxes (titles and legends)
  for (const e of elements.filter(el => el.tag === 'Textbox')) {
    const rawText = typeof e.text === 'string' ? e.text : '';
    if (!rawText.trim()) continue;
    const isHeading = rawText.startsWith('#');
    const clean     = rawText.replace(/^#+\s*/, '').replace(/\*\*/g, '');
    const fs        = isHeading ? 18 * S * 0.5 : (e.fontSize || 13) * S * 0.5;
    ctx.fillStyle    = isHeading ? '#0f172a' : '#475569';
    ctx.font         = `${isHeading ? 'bold ' : ''}${fs}px Arial, sans-serif`;
    ctx.textAlign    = e.hAlign === 'center' ? 'center' : 'left';
    ctx.textBaseline = 'top';
    const lines = wrapText(ctx, clean, (e.width || 1200) * S);
    lines.forEach((line, i) => ctx.fillText(line, px(e.x), py(e.y) + i * fs * 1.4));
  }

  // 5. Relationships (bezier arrows with labels)
  for (const e of elements.filter(el => el.tag === 'Relationship')) {
    const fromEl = byId.get(e.from);
    const toEl   = byId.get(e.to);
    if (!fromEl || !toEl) continue;
    const fp = getPort(fromEl, e.fromPort);
    const tp = getPort(toEl,   e.toPort);
    const x1 = px(fp.x), y1 = py(fp.y);
    const x2 = px(tp.x), y2 = py(tp.y);
    const dx = x2 - x1, dy = y2 - y1;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + dx * 0.4, y1, x1 + dx * 0.6, y2, x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - (y1 + dy * 0.5), x2 - (x1 + dx * 0.6));
    const head  = 8;
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

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
      ctx.fillText(e.label, midX, midY);
    }
  }

  return canvas.toBuffer('image/png');
}

export function isConfigured() {
  return !!process.env.ERASER_REFRESH_TOKEN;
}

export async function generateDiagram(description) {
  const token = await getIdToken();
  const { interactionId, toolCallId, elementId } = await callPlanner(description, token);
  const freshToken = await getIdToken();
  const elements = await callToolExecute(interactionId, toolCallId, elementId, freshToken);
  const pngBuffer = await renderFreeform(elements);
  return { imageUrl: `data:image/png;base64,${pngBuffer.toString('base64')}` };
}
