#!/usr/bin/env node
/**
 * Regenerate every architecture PNG from its (fixed) .excalidraw source.
 *
 * Sister script to fix-excalidraw-overflow.mjs — that one normalizes the
 * .excalidraw files; this one re-exports them to PNG.
 *
 * Pipeline:
 *   1. Spin up a tiny HTTP server on an ephemeral port.
 *   2. The server returns one HTML page that imports `exportToCanvas`
 *      from the npm-resolved @excalidraw/excalidraw package (served via
 *      a per-file passthrough endpoint so the browser can resolve ESM
 *      relative imports).
 *   3. Launch Puppeteer, navigate to the page, wait for the global
 *      `window.__renderToPng` to be defined.
 *   4. For each .excalidraw file in apps/camora/public/diagrams/<topic>/source/,
 *      call window.__renderToPng(json) -> data URL -> save to
 *      apps/camora/public/diagrams/<topic>/<basename>.png.
 *
 * Usage:
 *   node apps/camora/scripts/regen-excalidraw-pngs.mjs
 *   node apps/camora/scripts/regen-excalidraw-pngs.mjs --only facebook-newsfeed
 *   node apps/camora/scripts/regen-excalidraw-pngs.mjs --bg dark|light
 *
 * Defaults: dark background to match topic page chrome.
 *
 * If Puppeteer cannot resolve a Chromium binary (Linux dev box without
 * a Chrome install), set PUPPETEER_EXECUTABLE_PATH or run
 * `pnpm --filter camora exec puppeteer install` first.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const DIAGRAMS_ROOT = resolve(__dirname, '../public/diagrams');
const PKG_ROOT = resolve(REPO_ROOT, 'node_modules/@excalidraw/excalidraw');

const args = process.argv.slice(2);
const ONLY = args.indexOf('--only') >= 0 ? args[args.indexOf('--only') + 1] : null;
const BG = args.indexOf('--bg') >= 0 ? args[args.indexOf('--bg') + 1] : 'dark';
const VERBOSE = args.includes('--verbose');

// Background colors that match the topic page chrome.
// Dark: --bg-app in dark mode; Light: --bg-app in light mode.
const BG_COLORS = {
  dark: '#11141A',
  light: '#FFFFFF',
};

function walkDir(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkDir(p, out);
    else if (name.endsWith('.excalidraw')) out.push(p);
  }
  return out;
}

function htmlHarness() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>excalidraw-render</title></head>
<body style="margin:0;background:${BG_COLORS[BG]}">
<div id="status">loading…</div>
<script type="module">
  const mod = await import('https://esm.sh/@excalidraw/excalidraw@0.18.1');
  const { exportToCanvas } = mod;

  await new Promise((r) => setTimeout(r, 600));

  // ── Color helpers ──────────────────────────────────────────────────────────
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    if (h.length === 3) {
      return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16) };
    }
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  }
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min, s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    const h = max === r ? (g-b)/d+(g<b?6:0) : max === g ? (b-r)/d+2 : (r-g)/d+4;
    return { h: h/6, s, l };
  }
  function hslToHex(h, s, l) {
    const hue2rgb = (p,q,t) => {
      if (t<0) t+=1; if (t>1) t-=1;
      if (t<1/6) return p+(q-p)*6*t;
      if (t<1/2) return q;
      if (t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    if (s===0) { const v=Math.round(l*255); return '#'+v.toString(16).padStart(2,'0').repeat(3); }
    const q = l<0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    const r=Math.round(hue2rgb(p,q,h+1/3)*255), g=Math.round(hue2rgb(p,q,h)*255), b=Math.round(hue2rgb(p,q,h-1/3)*255);
    return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  function luminance(hex) {
    if (!hex || !hex.startsWith('#')) return 0;
    try { const {r,g,b}=hexToRgb(hex); return 0.299*r/255+0.587*g/255+0.114*b/255; } catch { return 0; }
  }

  // Convert any fill color to dark-theme fill+stroke pair.
  // Light colors → very dark fill of same hue + bright stroke of same hue.
  // Already-dark → keep dark fill, dim border.
  function darkPair(hex) {
    if (!hex || hex==='transparent'||hex==='none') return { fill:'#0d1117', stroke:'#30363d' };
    if (!hex.startsWith('#')) return { fill:'#161b22', stroke:'#30363d' };
    try {
      const lum = luminance(hex);
      const hsl = rgbToHsl(hexToRgb(hex));
      if (lum < 0.12) {
        // already dark — use as fill, dim border
        return { fill: hex, stroke: hslToHex(hsl.h, Math.min(hsl.s*1.2,1), 0.45) };
      }
      // light color → darken fill, brighten stroke
      const fill   = hslToHex(hsl.h, Math.min(hsl.s*0.7,1), 0.07);
      const stroke = hslToHex(hsl.h, Math.min(hsl.s*1.1,1), 0.62);
      return { fill, stroke };
    } catch { return { fill:'#161b22', stroke:'#30363d' }; }
  }

  // Apply professional dark theme to all elements in-place (returns new array).
  function applyDarkTheme(elements) {
    return elements.map(el => {
      if (el.isDeleted) return el;
      const e = { ...el };

      if (e.type === 'rectangle' || e.type === 'ellipse' || e.type === 'diamond') {
        const { fill, stroke } = darkPair(e.backgroundColor || 'transparent');
        e.backgroundColor = fill;
        // Keep original stroke if already bright, else derive from fill color
        const sLum = e.strokeColor ? luminance(e.strokeColor) : 0;
        e.strokeColor = sLum > 0.35 ? e.strokeColor : stroke;
        e.strokeWidth = Math.max(e.strokeWidth || 1, 2);
        e.roughness = 0;
        e.roundness = e.roundness || { type: 3, value: 6 };
      }
      if (e.type === 'arrow' || e.type === 'line') {
        const sLum = e.strokeColor ? luminance(e.strokeColor) : 0;
        if (sLum < 0.35) {
          // dark arrow on dark bg — make it visible
          e.strokeColor = '#58a6ff';
        }
        e.strokeWidth = Math.max(e.strokeWidth || 1, 2);
        e.roughness = 0;
      }
      if (e.type === 'text') {
        const sLum = e.strokeColor ? luminance(e.strokeColor) : 0;
        // Dark text → flip to light
        if (sLum < 0.45) e.strokeColor = '#e6edf3';
        e.fontFamily = 3; // Cascadia monospace
        e.roughness = 0;
      }
      return e;
    });
  }

  // ── Artifact detection ─────────────────────────────────────────────────────
  // Shape is an artifact if: no bound-text children, no inline text, no
  // standalone text overlaps it, AND no arrow endpoint is inside it.
  function buildVisibleElements(elements) {
    const boundContainerIds = new Set(
      elements.filter(e => !e.isDeleted && e.containerId).map(e => e.containerId)
    );

    // Collect absolute arrow endpoints from points array.
    const arrowEndpoints = [];
    for (const e of elements) {
      if (e.isDeleted || (e.type !== 'arrow' && e.type !== 'line')) continue;
      const pts = e.points || [[0,0]];
      // first and last point are the endpoints
      for (const pt of [pts[0], pts[pts.length-1]]) {
        arrowEndpoints.push({ x: e.x + pt[0], y: e.y + pt[1] });
      }
      // also check binding ids
      if (e.startBinding) arrowEndpoints.push({ boundId: e.startBinding.elementId });
      if (e.endBinding)   arrowEndpoints.push({ boundId: e.endBinding.elementId });
    }
    const arrowBoundIds = new Set(arrowEndpoints.filter(p=>p.boundId).map(p=>p.boundId));
    const arrowPoints   = arrowEndpoints.filter(p=>p.x !== undefined);

    const textBoxes = elements
      .filter(e => !e.isDeleted && e.type === 'text')
      .map(e => ({ x: e.x, y: e.y, x2: e.x+(e.width||0), y2: e.y+(e.height||0) }));

    const overlapsText = (el) => {
      const ex2 = el.x+(el.width||0), ey2 = el.y+(el.height||0);
      return textBoxes.some(t => el.x < t.x2 && ex2 > t.x && el.y < t.y2 && ey2 > t.y);
    };
    const hasArrowEndpoint = (el) => {
      if (arrowBoundIds.has(el.id)) return true;
      const ex2 = el.x+(el.width||0), ey2 = el.y+(el.height||0);
      return arrowPoints.some(p => p.x >= el.x && p.x <= ex2 && p.y >= el.y && p.y <= ey2);
    };

    const isArtifact = (el) => {
      if (el.isDeleted) return true;
      const isShape = el.type==='rectangle'||el.type==='ellipse'||el.type==='diamond';
      if (!isShape) return false;
      if (boundContainerIds.has(el.id)) return false;
      if (el.text && String(el.text).trim()) return false;
      if (overlapsText(el)) return false;
      if (hasArrowEndpoint(el)) return false;
      return true;
    };

    return elements.filter(e => !isArtifact(e));
  }

  window.__renderToPng = async (data, opts) => {
    const rawElements = data.elements || [];
    const appState    = data.appState || {};
    const files       = data.files   || {};

    // 1. Remove artifacts, 2. Apply dark theme.
    const visible = buildVisibleElements(rawElements);
    const elements = applyDarkTheme(visible);

    // Let excalidraw compute the tight bounding box. getDimensions receives
    // the natural canvas size (content + 2*exportPadding) and we multiply
    // by SCALE for a high-res output — no manual bbox math needed.
    const PAD   = 72;
    const SCALE = 3;

    const canvas = await exportToCanvas({
      elements,
      appState: {
        ...appState,
        exportBackground: true,
        viewBackgroundColor: opts.bg,
        exportPadding: PAD,
      },
      files,
      getDimensions: (w, h) => ({ width: w * SCALE, height: h * SCALE, scale: SCALE }),
    });
    return canvas.toDataURL('image/png');
  };
  document.getElementById('status').textContent = 'ready';
</script>
</body></html>`;
}

function startServer() {
  return new Promise((resolveP) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/' || req.url?.startsWith('/?')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlHarness());
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveP({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function main() {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (err) {
    console.error('puppeteer is not installed. Run: pnpm --filter camora add -D puppeteer');
    process.exit(1);
  }

  const allFiles = walkDir(DIAGRAMS_ROOT);
  const files = ONLY ? allFiles.filter((f) => f.includes(`/${ONLY}/`)) : allFiles;
  if (files.length === 0) {
    console.error(`No .excalidraw files matched.${ONLY ? ` (filter: --only ${ONLY})` : ''}`);
    process.exit(1);
  }

  const { server, url } = await startServer();
  console.log(`harness server: ${url}`);
  console.log(`background:     ${BG} (${BG_COLORS[BG]})`);
  console.log(`files:          ${files.length}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (msg) => { if (VERBOSE) console.log('  console:', msg.text()); });

  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction('typeof window.__renderToPng === "function"', { timeout: 30_000 });

  let ok = 0, fail = 0;
  for (const filePath of files) {
    const rel = relative(DIAGRAMS_ROOT, filePath);
    const outName = basename(filePath, '.excalidraw') + '.png';
    const outPath = join(dirname(dirname(filePath)), outName); // .../<topic>/<outName>
    try {
      const json = JSON.parse(readFileSync(filePath, 'utf8'));
      const dataUrl = await page.evaluate(
        async (data, opts) => window.__renderToPng(data, opts),
        json,
        { bg: BG_COLORS[BG] },
      );
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      writeFileSync(outPath, buf);
      ok++;
      console.log(`  ✓ ${rel} -> ${relative(DIAGRAMS_ROOT, outPath)} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      fail++;
      console.error(`  ✗ ${rel}: ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log('─'.repeat(60));
  console.log(`Rendered: ${ok} / ${files.length}${fail ? `   FAILED: ${fail}` : ''}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
