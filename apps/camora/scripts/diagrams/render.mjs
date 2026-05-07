#!/usr/bin/env node
/**
 * CLI: compile a diagram spec JSON to a PNG via Graphviz.
 *
 *   node apps/camora/scripts/diagrams/render.mjs <spec.json> <out.png>
 *   node apps/camora/scripts/diagrams/render.mjs --all
 *
 * Defaults to PNG at 2x DPI for retina sharpness. Falls back to writing
 * the intermediate .dot file alongside the output when --keep-dot is
 * passed (useful for inspecting compile output).
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, basename, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { specToDot } from './dsl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolve(__dirname, 'specs');
const OUT_DIR = resolve(__dirname, 'out');

const args = process.argv.slice(2);
const KEEP_DOT = args.includes('--keep-dot');
const ALL = args.includes('--all');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function renderOne(specPath, outPath) {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const dot = specToDot(spec);

  const dotPath = outPath.replace(/\.png$/, '.dot');
  if (KEEP_DOT) writeFileSync(dotPath, dot, 'utf8');

  // Pipe DOT into graphviz via stdin so we don't leave temp files.
  // -Tpng = png output. -Gdpi=160 gives sharp retina at typical embed widths.
  const res = spawnSync('dot', ['-Tpng', '-Gdpi=160', '-o', outPath], {
    input: dot,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    process.stderr.write(`dot failed for ${specPath}:\n${res.stderr}\n`);
    if (!KEEP_DOT) writeFileSync(dotPath, dot, 'utf8');
    process.stderr.write(`(intermediate DOT saved to ${dotPath} for inspection)\n`);
    process.exit(1);
  }
  return outPath;
}

function main() {
  ensureDir(OUT_DIR);

  if (ALL) {
    const specs = readdirSync(SPECS_DIR).filter((f) => f.endsWith('.json'));
    if (specs.length === 0) {
      console.error('no specs found in', SPECS_DIR);
      process.exit(1);
    }
    for (const f of specs) {
      const out = join(OUT_DIR, basename(f, '.json') + '.png');
      const result = renderOne(join(SPECS_DIR, f), out);
      console.log('  rendered', result);
    }
    return;
  }

  if (args.length < 1) {
    console.error('usage: render.mjs <spec.json> [out.png]');
    console.error('   or: render.mjs --all');
    process.exit(1);
  }
  const specArg = args.find((a) => !a.startsWith('--'));
  const outArg = args
    .filter((a) => !a.startsWith('--'))
    .slice(1)
    .find(Boolean);

  const specPath = resolve(specArg);
  const outPath = outArg
    ? resolve(outArg)
    : join(OUT_DIR, basename(specArg, '.json') + '.png');
  ensureDir(dirname(outPath));
  renderOne(specPath, outPath);
  console.log('rendered', outPath);
}

main();
