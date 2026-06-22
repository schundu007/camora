#!/usr/bin/env node
/**
 * Generate eraser-{aws,azure,gcp}.png for every topic slug via Eraser AI.
 * Flow: planner → toolExecute (NDJSON) → local HTML canvas renderer → PNG
 * Icons fetched from https://app.eraser.io/_next/static/canvas-icons/{name}.svg (public, no auth)
 *
 * USAGE:
 *   node apps/camora/scripts/gen-eraser-browser.mjs [--limit=N] [--slug=<slug>] [--provider=aws|azure|gcp] [--force] [--dry-run]
 *
 * CREDENTIALS:
 *   ERASER_COOKIE      Required. Full document.cookie string from app.eraser.io DevTools.
 *   ERASER_CFUVID      Optional. Cloudflare bot-protection cookie — improves reliability.
 *   ERASER_DEVICE_ID   Optional. Device identifier cookie — improves reliability.
 *
 * NOTE: Eraser GitHub App on this repo handles checkout + commit-back automatically.
 * Only ERASER_COOKIE is required as a GitHub Secret for diagram generation API auth.
 *
 * PROMPTS:
 *   One prompt file per slug at apps/camora/scripts/eraser-prompts/{slug}.txt
 *   Use {PROVIDER} placeholder — replaced with AWS/AZURE/GCP at runtime.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ERASER_COOKIE = process.env.ERASER_COOKIE;
const CFUVID        = process.env.ERASER_CFUVID;
const ERASER_DEVICE_ID = process.env.ERASER_DEVICE_ID;

if (!ERASER_COOKIE) {
  console.error('Missing ERASER_COOKIE env var. Get it from app.eraser.io DevTools → Application → Cookies.');
  process.exit(1);
}

const SESSION_ID   = '3TVBEsFiAgslQdXMdurc';
const TEAM_ID      = 'd1phv5uOIXftJhOb3Yw9';
const WORKSPACE_ID = '9DzIeEmqzNtS52hJEODr';
const ICON_BASE    = 'https://app.eraser.io/_next/static/canvas-icons';

const PROMPTS_DIR   = path.resolve(__dirname, 'eraser-prompts');
const PUBLIC_DIAGRAMS = path.resolve(__dirname, '../public/diagrams');

const argv = process.argv.slice(2);
const flag = (name, fb) => { const h = argv.find(a => a.startsWith(`--${name}=`)); return h ? h.split('=').slice(1).join('=') : fb; };
const LIMIT         = parseInt(flag('limit', '0'), 10) || Infinity;
const SKIP          = parseInt(flag('skip', '0'), 10) || 0;
const ONLY_SLUG     = flag('slug', '');
const ONLY_PROVIDER = flag('provider', '');
const DRY_RUN       = argv.includes('--dry-run');
const FORCE         = argv.includes('--force');

const providers = ONLY_PROVIDER ? [ONLY_PROVIDER] : ['aws', 'azure', 'gcp'];

const allTasks = [];
for (const slug of fs.readdirSync(PUBLIC_DIAGRAMS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
  if (ONLY_SLUG && slug !== ONLY_SLUG) continue;
  const promptFile = path.join(PROMPTS_DIR, `${slug}.txt`);
  if (!fs.existsSync(promptFile)) continue;
  const basePrompt = fs.readFileSync(promptFile, 'utf8').trim();
  for (const provider of providers) {
    const filePath = path.join(PUBLIC_DIAGRAMS, slug, `eraser-${provider}.png`);
    if (fs.existsSync(filePath) && !FORCE) continue;
    if (FORCE && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const prompt = basePrompt.replace(/\{PROVIDER\}/g, provider.toUpperCase());
    allTasks.push({ slug, provider, filePath, prompt });
  }
}
const tasks = allTasks.slice(SKIP, SKIP + LIMIT);

console.log(`\n=== Eraser diagram backfill (individual AI credits + canvas renderer) ===`);
console.log(`Pending: ${tasks.length} diagrams${FORCE ? ' (--force: overwriting existing)' : ''}\n`);
if (DRY_RUN || tasks.length === 0) {
  tasks.slice(0, 20).forEach(t => console.log(`  [${t.provider}] ${t.slug}`));
  if (tasks.length > 20) console.log(`  ... and ${tasks.length - 20} more`);
  process.exit(0);
}

function parseCookies(s, domain) {
  return s.split(';').map(p => p.trim()).filter(Boolean).map(p => {
    const eq = p.indexOf('=');
    return { name: p.slice(0, eq).trim(), value: p.slice(eq + 1).trim(), domain, path: '/' };
  });
}
const ALL_COOKIES = parseCookies(ERASER_COOKIE, 'app.eraser.io');
const WIDE = new Set(['_ga', '_ga_XZQP4CRRRS', '_rdt_uuid', 'amp_f168e1', 'intercom-id-fqp3uy63', 'intercom-device-id-fqp3uy63', 'intercom-session-fqp3uy63']);
ALL_COOKIES.forEach(c => { if (WIDE.has(c.name)) c.domain = '.eraser.io'; });
ALL_COOKIES.push(
  { name: '_cfuvid', value: CFUVID, domain: '.eraser.io', path: '/', httpOnly: true, secure: true },
  { name: 'eraser_device_id', value: ERASER_DEVICE_ID, domain: 'app.eraser.io', path: '/', httpOnly: true, secure: true }
);

const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies(ALL_COOKIES);
const page = await context.newPage();

await page.goto(`https://app.eraser.io/workspace/${WORKSPACE_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2000);

const jwt = await page.evaluate(() => {
  const m = document.cookie.match(/__session=([^;]+)/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])).userSessionToken; } catch { return null; }
});
if (!jwt) { console.error('Could not extract JWT from __session cookie — is ERASER_COOKIE valid?'); await browser.close(); process.exit(1); }

const authOk = await page.evaluate(async (t) => {
  const r = await fetch('/api/user/me', { headers: { Authorization: `Bearer ${t}` } });
  return r.ok;
}, jwt);
if (!authOk) { console.error('Auth failed — refresh ERASER_COOKIE env var'); await browser.close(); process.exit(1); }
console.log('Authenticated. Generating diagrams with canvas renderer...\n');

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, fail = 0;

// Canvas renderer — runs inside page context on eraser.io (for icon CDN CORS access)
const RENDERER = async ({ elements, iconBase }) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const x = el.x ?? 0, y = el.y ?? 0;
    const w = el.width ?? (el.tag === 'Icon' ? 50 : 100);
    const h = el.height ?? (el.tag === 'Icon' ? 50 : 30);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 500; }
  const pad = 32;
  const canvasW = Math.min(Math.max(maxX - minX + pad * 2, 600), 4096);
  const canvasH = Math.min(Math.max(maxY - minY + pad * 2, 400), 3072);
  const ox = -minX + pad, oy = -minY + pad;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const loadImg = (url) => new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });

  const stripMd = s => (s || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^#+\s*/, '');

  const groups = elements.filter(e => e.tag === 'Group');
  const icons  = elements.filter(e => e.tag === 'Icon');
  const texts  = elements.filter(e => e.tag === 'Textbox');
  const rels   = elements.filter(e => e.tag === 'Relationship');

  for (const el of groups) {
    const x = (el.x ?? 0) + ox, y = (el.y ?? 0) + oy;
    const w = el.width ?? 200, h = el.height ?? 150;
    ctx.save();
    ctx.fillStyle = el.bgColor || '#f3f4f6';
    ctx.strokeStyle = el.borderColor || '#d1d5db';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
    if (el.title?.text) {
      ctx.fillStyle = '#111827';
      ctx.font = `bold 13px -apple-system, system-ui, sans-serif`;
      ctx.fillText(stripMd(el.title.text), x + 10, y + 18);
    }
    ctx.restore();
  }

  for (const el of icons) {
    const x = (el.x ?? 0) + ox, y = (el.y ?? 0) + oy;
    const w = el.width ?? 50, h = el.height ?? 50;
    if (el.icon) {
      const img = await loadImg(`${iconBase}/${el.icon}.svg`);
      if (img) {
        ctx.drawImage(img, x, y, w, h);
      } else {
        ctx.save();
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(w, h) * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((el.icon[0] || '?').toUpperCase(), x + w / 2, y + h / 2);
        ctx.restore();
      }
    }
    const label = stripMd((el.texts?.[0]?.text || el.label || '').trim());
    if (label) {
      ctx.save();
      ctx.fillStyle = '#374151';
      ctx.font = `11px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x + w / 2, y + h + 4);
      ctx.restore();
    }
  }

  for (const el of texts) {
    const x = (el.x ?? 0) + ox, y = (el.y ?? 0) + oy;
    const rawText = stripMd(el.text || '');
    const isHeading = /^#/.test(el.text || '');
    const sz = el.fontSize === 'large' ? 20 : el.fontSize === 'small' ? 11 : 13;
    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = `${isHeading ? 'bold ' : ''}${sz}px -apple-system, system-ui, sans-serif`;
    if (el.hAlign === 'center') { ctx.textAlign = 'center'; ctx.fillText(rawText, x + (el.width || 200) / 2, y + sz); }
    else { ctx.textAlign = 'left'; ctx.fillText(rawText, x, y + sz); }
    ctx.restore();
  }

  const elMap = Object.fromEntries(elements.map(e => [e.id, e]));
  for (const rel of rels) {
    const fromEl = elMap[rel.from];
    const toEl   = elMap[rel.to];
    if (!fromEl || !toEl) continue;

    const fx = (fromEl.x ?? 0) + (fromEl.width ?? 50) / 2 + ox;
    const fy = (fromEl.y ?? 0) + (fromEl.height ?? 50) / 2 + oy;
    const tx = (toEl.x ?? 0) + (toEl.width ?? 50) / 2 + ox;
    const ty = (toEl.y ?? 0) + (toEl.height ?? 50) / 2 + oy;

    const isDashed = rel.lineStyle === 'dashed' || rel.style === 'dashed';
    ctx.save();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1.5;
    if (isDashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    const angle = Math.atan2(ty - fy, tx - fx);
    const as = 8;
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - as * Math.cos(angle - 0.4), ty - as * Math.sin(angle - 0.4));
    ctx.lineTo(tx - as * Math.cos(angle + 0.4), ty - as * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    if (rel.label) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rel.label, (fx + tx) / 2, (fy + ty) / 2 - 5);
    }
    ctx.restore();
  }

  return canvas.toDataURL('image/png').split(',')[1];
};

for (let i = 0; i < tasks.length; i++) {
  const { slug, provider, filePath, prompt } = tasks[i];
  const label = `[${i + 1}/${tasks.length}] ${slug.padEnd(38)} ${provider}`;

  try {
    const planResult = await page.evaluate(async ({ prompt, sessionId, teamId, token }) => {
      const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      const r = await fetch('/api/ai/planner', {
        method: 'POST', headers: h, credentials: 'include',
        body: JSON.stringify({ userMessage: prompt, sessionId, teamId, attachments: [], hasGitRepo: false, hasAiPreset: false }),
      });
      if (!r.ok) { const t = await r.text(); return { error: `planner ${r.status}: ${t.slice(0, 200)}` }; }
      const d = await r.json();
      const interactionId = d.interactionId || d.result?.interactionId;
      const toolCalls     = d.interaction?.toolCalls || d.result?.toolCalls || [];
      const toolCallIds   = toolCalls.map(tc => tc.id);
      if (!interactionId || !toolCallIds.length) return { error: `no toolCallIds: ${JSON.stringify(d).slice(0, 300)}` };
      return { interactionId, toolCallIds };
    }, { prompt, sessionId: SESSION_ID, teamId: TEAM_ID, token: jwt });

    if (planResult.error) throw new Error(`planner: ${planResult.error}`);

    const execResult = await page.evaluate(async ({ toolCallIds, interactionId, token }) => {
      const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      const r = await fetch('/api/ai/toolExecute', {
        method: 'POST', headers: h, credentials: 'include',
        body: JSON.stringify({ toolCallIds, interactionId }),
      });
      if (!r.ok) { const t = await r.text(); return { error: `toolExecute ${r.status}: ${t.slice(0, 200)}` }; }
      const text = await r.text();
      const allElements = [];
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line.trim());
          if (ev.type === 'progress' && ev.data?.freeformElements) allElements.push(...ev.data.freeformElements);
        } catch {}
      }
      const freeformElements = allElements.length ? allElements : null;
      return { freeformElements, lineCount: text.split('\n').filter(l => l.trim()).length };
    }, { toolCallIds: planResult.toolCallIds, interactionId: planResult.interactionId, token: jwt });

    if (execResult.error) throw new Error(`toolExecute: ${execResult.error}`);
    if (!execResult.freeformElements?.length) throw new Error(`no freeformElements in NDJSON (${execResult.lineCount} lines)`);

    const base64 = await page.evaluate(RENDERER, { elements: execResult.freeformElements, iconBase: ICON_BASE });
    if (!base64) throw new Error('canvas renderer returned empty');

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    const kb = Math.round(fs.statSync(filePath).size / 1024);
    console.log(`  OK   ${label} | ${execResult.freeformElements.length} elements, ${kb} KB`);
    ok++;

  } catch (err) {
    console.error(`  FAIL ${label} → ${err.message.slice(0, 200)}`);
    fail++;
    if (/401|403|quota|Unauthenticated|expired/.test(err.message)) {
      console.error('  Auth/quota error — stopping. Update ERASER_COOKIE env var.');
      break;
    }
  }

  if (i + 1 < tasks.length) await sleep(3000);
}

await browser.close();
console.log(`\n=== Done: ${ok} OK, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
