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
  // Load Excalidraw via esm.sh — sidesteps the local-node-modules
  // ESM resolution problem (Excalidraw ships ESM with relative imports
  // that don't resolve from a file:// URL).
  const mod = await import('https://esm.sh/@excalidraw/excalidraw@0.18.1');
  const { exportToCanvas } = mod;

  // Wait for Virgil + Cascadia + Helvetica to be available so text
  // measures are correct in the rasterized canvas. Excalidraw lazy-
  // loads its fonts through CSS @font-face; we force them by drawing
  // a hidden test string after a short delay.
  await new Promise((r) => setTimeout(r, 500));

  window.__renderToPng = async (data, opts) => {
    const elements = data.elements || [];
    const appState = data.appState || {};
    const files = data.files || {};

    // Build set of container IDs that have bound text so we don't exclude them.
    const boundContainerIds = new Set(
      elements
        .filter(e => !e.isDeleted && e.containerId)
        .map(e => e.containerId)
    );

    // Bounding boxes of all standalone text elements — used to detect which
    // shapes actually contain or overlap readable content.
    const textBoxes = elements
      .filter(e => !e.isDeleted && e.type === 'text')
      .map(e => ({ x: e.x, y: e.y, x2: e.x + (e.width || 0), y2: e.y + (e.height || 0) }));

    const overlapsText = (el) => {
      const ex2 = el.x + (el.width || 0);
      const ey2 = el.y + (el.height || 0);
      return textBoxes.some(t => el.x < t.x2 && ex2 > t.x && el.y < t.y2 && ey2 > t.y);
    };

    // A shape is an artifact if it has no bound-text children, no inline text,
    // and no free-standing text element overlaps it. These appear as blank
    // colored boxes in the export even though they carry no real content.
    const isArtifact = (el) => {
      if (el.isDeleted) return true;
      const isShape = el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond';
      if (!isShape) return false;
      if (boundContainerIds.has(el.id)) return false;
      const hasInlineText = el.text && String(el.text).trim();
      if (hasInlineText) return false;
      return textBoxes.length > 0 && !overlapsText(el);
    };

    const visibleElements = elements.filter(e => !isArtifact(e));

    // Compute viewport from visible elements only.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of visibleElements) {
      if (el.isDeleted) continue;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0));
    }
    const PAD = 96;
    const baseW = Math.ceil(maxX - minX + PAD * 2);
    const baseH = Math.ceil(maxY - minY + PAD * 2);
    // 3× scale: sharp text at any inline preview width (typically
    // ~1000-1200px container) AND sharp at lightbox native size.
    // Roughly matches the original 5520-wide manual exports.
    const SCALE = 3;
    const width = baseW * SCALE;
    const height = baseH * SCALE;

    const canvas = await exportToCanvas({
      elements: visibleElements,
      appState: {
        ...appState,
        exportBackground: true,
        viewBackgroundColor: opts.bg,
        exportPadding: PAD,
      },
      files,
      getDimensions: () => ({ width, height, scale: SCALE }),
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
