#!/usr/bin/env node
/**
 * Pre-bake every topic's layered + flow diagrams into static PNGs under
 * apps/camora/public/diagrams/{topicId}/...  served by Vercel as a
 * static asset. Per the "Diagrams From Cache Only" rule, the runtime
 * never generates these — the PNGs in this directory ARE the cache.
 *
 * Reads topic data via dynamic import, hands each {layeredDesign} or
 * {createFlow|redirectFlow|fetchFlow} entry to apps/ai-services/
 * layered_diagram.py over stdin, and writes the resulting PNG.
 *
 * Run:
 *   pnpm --filter camora-frontend build:diagrams
 *
 * Idempotent — by default skips topics whose PNG already exists. Pass
 * --force to rebuild everything.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const DATA_DIR = resolve(__dirname, '../src/data/capra/topics');
const OUT_DIR = resolve(__dirname, '../public/diagrams');
const PY_SCRIPT = resolve(REPO_ROOT, 'apps/ai-services/layered_diagram.py');

const FORCE = process.argv.includes('--force');
const VERBOSE = process.argv.includes('--verbose');

const SOURCES = [
  { file: 'systemDesignTopics.js', exportName: 'systemDesignTopics' },
  { file: 'systemDesignProblems.js', exportName: 'systemDesigns' },
  { file: 'systemDesignProblemsExtra.js', exportName: 'extraSystemDesigns' },
];

async function loadTopics() {
  const all = [];
  for (const { file, exportName } of SOURCES) {
    const filePath = join(DATA_DIR, file);
    const url = pathToFileURL(filePath).href;
    const mod = await import(url);
    const arr = mod[exportName];
    if (!Array.isArray(arr)) {
      console.warn(`! ${file}: ${exportName} not an array — skipping`);
      continue;
    }
    for (const t of arr) {
      if (t && t.id) all.push(t);
    }
  }
  return all;
}

function runPy(kind, outPath, spec) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn('python3', [PY_SCRIPT, kind, outPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.on('error', rejectP);
    child.on('close', (code) => {
      if (code === 0) resolveP();
      else rejectP(new Error(`python3 exited ${code}: ${stderr.trim()}`));
    });
    child.stdin.end(JSON.stringify(spec));
  });
}

function shouldBake(outPath, sourceMtime) {
  if (FORCE) return true;
  if (!existsSync(outPath)) return true;
  // Rebuild if source file newer than output.
  return statSync(outPath).mtimeMs < sourceMtime;
}

async function main() {
  if (!existsSync(PY_SCRIPT)) {
    console.error(`✗ Python renderer missing at ${PY_SCRIPT}`);
    process.exit(1);
  }

  const sourceMtime = Math.max(
    ...SOURCES.map(({ file }) => statSync(join(DATA_DIR, file)).mtimeMs),
  );

  console.log('→ Loading topic data…');
  const topics = await loadTopics();
  console.log(`  ${topics.length} topics found`);

  const tasks = [];
  for (const t of topics) {
    if (Array.isArray(t.layeredDesign) && t.layeredDesign.length > 0) {
      tasks.push({
        kind: 'layered',
        out: join(OUT_DIR, t.id, 'layered.png'),
        spec: { title: 'Layered Design', layers: t.layeredDesign },
        topicId: t.id,
      });
    }
    // basic / advanced architecture — flat components array → single layer.
    // Don't overwrite existing /impl-basic.png / /impl-advanced.png assets
    // that were pre-baked manually for some topics; we use a separate
    // /architecture-* path so both can coexist.
    for (const [implKey, suffix, label] of [
      ['basicImplementation', 'architecture-basic', 'Basic Architecture'],
      ['advancedImplementation', 'architecture-advanced', 'Advanced Architecture'],
    ]) {
      const impl = t[implKey];
      if (
        impl &&
        Array.isArray(impl.components) &&
        impl.components.length > 0 &&
        !impl.diagramSrc &&
        !impl.svgTemplate
      ) {
        tasks.push({
          kind: 'layered',
          out: join(OUT_DIR, t.id, `${suffix}.png`),
          spec: {
            title: impl.title || label,
            layers: [{ name: 'Components', components: impl.components }],
          },
          topicId: t.id,
        });
      }
    }
    for (const flowKey of ['createFlow', 'redirectFlow', 'fetchFlow', 'requestFlow']) {
      const flow = t[flowKey];
      if (flow && Array.isArray(flow.steps) && flow.steps.length > 0) {
        // Steps may be plain strings OR `{step, label, detail}` objects.
        // Use label when present, else stringify the value (skipping nulls).
        const stepStrings = flow.steps
          .map((s) => (typeof s === 'string' ? s : s?.label ?? s?.title ?? null))
          .filter((s) => typeof s === 'string' && s.trim().length > 0);
        if (stepStrings.length === 0) continue;
        tasks.push({
          kind: 'flow',
          out: join(OUT_DIR, t.id, `flow-${flowKey}.png`),
          spec: { title: flow.title || flowKey, steps: stepStrings },
          topicId: t.id,
        });
      }
    }
  }

  console.log(`→ ${tasks.length} diagrams to consider`);

  let baked = 0;
  let skipped = 0;
  let failed = 0;
  for (const task of tasks) {
    if (!shouldBake(task.out, sourceMtime)) {
      skipped++;
      if (VERBOSE) console.log(`  skip ${task.topicId}/${task.kind}`);
      continue;
    }
    mkdirSync(dirname(task.out), { recursive: true });
    try {
      await runPy(task.kind, task.out, task.spec);
      baked++;
      if (VERBOSE) console.log(`  bake ${task.topicId}/${task.kind}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${task.topicId}/${task.kind}: ${err.message}`);
    }
  }

  // Drop empty topic dirs that may linger from removed topics.
  if (existsSync(OUT_DIR)) {
    for (const d of readdirSync(OUT_DIR)) {
      const p = join(OUT_DIR, d);
      try {
        if (statSync(p).isDirectory() && readdirSync(p).length === 0) {
          rmSync(p, { recursive: true });
        }
      } catch {}
    }
  }

  console.log(`✓ baked ${baked}, skipped ${skipped}, failed ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('✗ build-topic-diagrams failed:', err);
  process.exit(1);
});
