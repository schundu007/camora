#!/usr/bin/env node
/**
 * Mermaid → SVG diagram renderer.
 *
 * Replaces the graphviz `gen-*.py` generators for the DevOps / control-plane
 * tracks. Two reasons for the switch:
 *
 *   1. `dot` is not installable on the build machine (no sudo, PEP 668), so
 *      the Python generators cannot be re-run to fix a diagram.
 *   2. Graphviz emitted raster PNGs at a fixed pixel size, which forced the
 *      "never upscale a diagram" rule in TopicDetail — a wide card left the
 *      diagram floating small, a narrow one blurred it. SVG has no native
 *      size, so it is crisp at every card width and every zoom level.
 *
 * Mermaid and Chromium are both already in node_modules, so this needs no
 * new dependency.
 *
 * Usage:
 *   node scripts/render-mermaid.mjs                # render every spec
 *   node scripts/render-mermaid.mjs controlplane   # one spec file
 *   node scripts/render-mermaid.mjs controlplane cp-7-bare-metal   # one diagram
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.join(HERE, 'diagrams-mermaid');
const PUBLIC = path.join(HERE, '..', 'public', 'diagrams');
const MERMAID_JS = path.join(HERE, '..', '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');

// Shared visual language, matched to the app's own palette so a diagram does
// not read as a foreign object dropped onto the page. Tailwind-500/600 hues on
// -100 fills: enough separation between roles to scan, low enough saturation
// to sit under body copy.
const THEME = {
  fontFamily: '"Inter", "Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '15px',
  lineColor: '#64748b',
  textColor: '#0f172a',
  primaryColor: '#dbeafe',
  primaryBorderColor: '#3b82f6',
  primaryTextColor: '#0f172a',
  secondaryColor: '#e0e7ff',
  tertiaryColor: '#f1f5f9',
  clusterBkg: '#f8fafc',
  clusterBorder: '#cbd5e1',
  edgeLabelBackground: '#ffffff',
};

// classDef palette shared by every spec — specs reference these by name
// (`:::navy`) instead of restating hex codes per node.
export const CLASS_DEFS = `
classDef navy   fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
classDef gold   fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
classDef green  fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
classDef red    fill:#fee2e2,stroke:#ef4444,stroke-width:1.5px,color:#7f1d1d;
classDef purple fill:#ede9fe,stroke:#8b5cf6,stroke-width:1.5px,color:#4c1d95;
classDef teal   fill:#ccfbf1,stroke:#14b8a6,stroke-width:1.5px,color:#134e4a;
classDef cyan   fill:#cffafe,stroke:#06b6d4,stroke-width:1.5px,color:#164e63;
classDef sky    fill:#e0f2fe,stroke:#0ea5e9,stroke-width:1.5px,color:#0c4a6e;
classDef slate  fill:#e2e8f0,stroke:#64748b,stroke-width:1.5px,color:#1e293b;
classDef gray   fill:#f1f5f9,stroke:#94a3b8,stroke-width:1.5px,color:#334155;
classDef amber  fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
`.trim();

async function renderAll(specs) {
  const mermaidSrc = await fs.readFile(MERMAID_JS, 'utf8');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><body><div id="out"></div></body></html>');
  await page.addScriptTag({ content: mermaidSrc });
  await page.evaluate((theme) => {
    // eslint-disable-next-line no-undef
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      themeVariables: theme,
      // wrappingWidth is the single most important knob here. Mermaid's
      // default (~200px) wraps a five-word title onto three lines, which is
      // what made the first pass a tall ribbon of narrow text-walls. 380px
      // holds a full detail fragment on one line.
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 45,
        rankSpacing: 70,
        padding: 16,
        wrappingWidth: 380,
        useMaxWidth: false,
      },
      fontFamily: theme.fontFamily,
    });
  }, THEME);

  const written = [];
  for (const spec of specs) {
    const { svg, error } = await page.evaluate(async (id, def) => {
      try {
        // eslint-disable-next-line no-undef
        const { svg } = await window.mermaid.render('m_' + id.replace(/[^a-z0-9]/gi, '_'), def);
        return { svg };
      } catch (e) {
        return { error: String(e && e.message ? e.message : e) };
      }
    }, spec.id, spec.definition);

    if (error) {
      console.error(`  ✗ ${spec.id}: ${error}`);
      continue;
    }
    const out = path.join(PUBLIC, spec.category, `${spec.id}.svg`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, postProcess(svg, spec.title));
    const kb = (Buffer.byteLength(postProcess(svg, spec.title)) / 1024).toFixed(0);
    console.log(`  ✓ ${spec.category}/${spec.id}.svg  (${kb} KB)`);
    written.push(out);
  }
  await browser.close();
  return written;
}

/**
 * Mermaid emits `style="max-width: Npx"` and no explicit width, which makes
 * the SVG refuse to grow past its natural size — reintroducing exactly the
 * "diagram floats small in a wide card" problem SVG was meant to solve. Strip
 * the cap, keep the viewBox (so the aspect ratio is preserved), and prepend a
 * white plate + accessible <title>.
 */
function postProcess(svg, title) {
  let out = svg
    .replace(/style="max-width:[^"]*"/g, 'style="width:100%;height:auto"')
    .replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ');
  if (title) {
    const safe = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    out = out.replace(/(<svg[^>]*>)/, `$1<title>${safe}</title>`);
  }
  return out;
}

async function main() {
  const [specFilter, idFilter] = process.argv.slice(2);
  const files = (await fs.readdir(SPEC_DIR)).filter((f) => f.endsWith('.mjs'));
  const specs = [];
  for (const f of files) {
    const name = f.replace(/\.mjs$/, '');
    if (specFilter && name !== specFilter) continue;
    const mod = await import(pathToFileURL(path.join(SPEC_DIR, f)).href);
    for (const d of mod.diagrams) {
      if (idFilter && d.id !== idFilter) continue;
      specs.push(d);
    }
  }
  if (!specs.length) {
    console.error('No diagrams matched.');
    process.exit(1);
  }
  console.log(`Rendering ${specs.length} diagram(s)…`);
  const written = await renderAll(specs);
  console.log(`\nDone: ${written.length}/${specs.length} written.`);
  if (written.length !== specs.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
