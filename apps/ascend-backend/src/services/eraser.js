/**
 * Eraser.io diagram generation via Firebase refresh token auth.
 * Calls Eraser's internal AI endpoints (uses AI credits, no paid API key).
 * Same auth flow as apps/camora/scripts/gen-eraser-diagrams.mjs.
 *
 * Required env: ERASER_REFRESH_TOKEN
 */

let _canvasMod = null;
async function loadCanvasMod() {
  if (!_canvasMod) _canvasMod = await import('@napi-rs/canvas');
  return _canvasMod;
}

const FIREBASE_API_KEY = 'AIzaSyCX5UYWp-3ZAVEuQ3Ospj9Xg9e6ji16roI';
const SESSION_ID       = '3TVBEsFiAgslQdXMdurc';
const WORKSPACE_ID     = '9DzIeEmqzNtS52hJEODr';
const ICON_BASE        = 'https://app.eraser.io/_next/static/canvas-icons';

let idToken    = null;
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
  if (!res.ok) throw new Error(`Planner failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const tc = data.interaction?.toolCalls?.[0];
  if (!tc) throw new Error('No toolCall in planner response');
  return { interactionId: data.interactionId, toolCallId: tc.id, elementId: tc.parameters.elementId };
}

async function callToolExecute(interactionId, toolCallId, elementId, token) {
  const res = await fetch('https://app.eraser.io/api/ai/toolExecute', {
    method: 'POST',
    headers: eraserHeaders(token),
    body: JSON.stringify({
      interactionId, toolCallId, elementId,
      sessionId: SESSION_ID,
      workspaceId: WORKSPACE_ID,
    }),
  });
  if (!res.ok) throw new Error(`toolExecute failed: ${res.status} ${await res.text()}`);

  const text = await res.text();
  let diagramCode = '';
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'complete' && obj.diagramCode) { diagramCode = obj.diagramCode; break; }
      if (obj.type === 'diagram-code' || obj.diagramCode) diagramCode += (obj.diagramCode || obj.code || '');
    } catch {}
  }
  if (!diagramCode) throw new Error('No diagram code in toolExecute response');
  return diagramCode;
}

const iconCache = new Map();
async function fetchIcon(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  try {
    const { loadImage } = await loadCanvasMod();
    const img = await loadImage(`${ICON_BASE}/${name}.svg`);
    iconCache.set(name, img);
    return img;
  } catch { return null; }
}

async function renderToBuffer(diagramCode) {
  const { createCanvas, loadImage } = await loadCanvasMod();
  const W = 1600, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const nodePattern = /^(\w[\w\s-]*?)\s*\[([^\]]*)\]/gm;
  const edgePattern = /^(\w[\w\s-]*?)\s*(?:>|->|--|<>)\s*(\w[\w\s-]*?)(?:\s*:\s*(.+))?$/gm;

  const nodes = new Map();
  let m;
  while ((m = nodePattern.exec(diagramCode)) !== null) {
    const name = m[1].trim();
    const props = Object.fromEntries(
      m[2].split(',').map(p => p.trim().split(':').map(s => s.trim())).filter(([k]) => k)
    );
    nodes.set(name, { name, icon: props.icon, label: props.label || name });
  }

  const edges = [];
  while ((m = edgePattern.exec(diagramCode)) !== null) {
    edges.push({ from: m[1].trim(), to: m[2].trim(), label: m[3]?.trim() });
  }

  const nodeList = [...nodes.values()];
  const cols = Math.ceil(Math.sqrt(nodeList.length));
  const cellW = W / (cols + 1);
  const cellH = H / (Math.ceil(nodeList.length / cols) + 1);
  const NODE_SIZE = Math.min(cellW, cellH) * 0.35;

  nodeList.forEach((node, i) => {
    node.x = cellW * ((i % cols) + 1);
    node.y = cellH * (Math.floor(i / cols) + 1);
  });

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  for (const edge of edges) {
    const from = nodes.get(edge.from);
    const to   = nodes.get(edge.to);
    if (!from || !to) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    if (edge.label) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 4);
    }
  }

  for (const node of nodeList) {
    const img  = node.icon ? await fetchIcon(node.icon) : null;
    const half = NODE_SIZE / 2;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(node.x - half, node.y - half, NODE_SIZE, NODE_SIZE, 8);
    ctx.fill();
    ctx.stroke();
    if (img) {
      const pad = NODE_SIZE * 0.18;
      ctx.drawImage(img, node.x - half + pad, node.y - half + pad, NODE_SIZE - pad * 2, NODE_SIZE - pad * 2);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${NODE_SIZE * 0.28}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.slice(0, 2).toUpperCase(), node.x, node.y);
    }
    ctx.fillStyle = '#1e293b';
    ctx.font = `${Math.max(10, NODE_SIZE * 0.14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, node.x, node.y + half + 4);
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
  const diagramCode = await callToolExecute(interactionId, toolCallId, elementId, freshToken);
  const pngBuffer = await renderToBuffer(diagramCode);
  return { imageUrl: `data:image/png;base64,${pngBuffer.toString('base64')}` };
}
