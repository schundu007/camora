/**
 * Pre-generate static learn content for all Programiz and CodeSignal topics.
 * Output: apps/camora/public/learn-content/{source}/{slug}.json
 * Run: node scripts/generate-learn-content.mjs [programiz|codesignal|all]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const OUT_DIR = path.join(ROOT, 'apps/camora/public/learn-content');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CONCURRENCY = 5;
const RETRY_DELAY_MS = 3000;

// ── Same prompts as ascend-backend/src/routes/learnTopic.js ──────────────────

function buildPrompt({ title, source, category, level, count }) {
  if (source === 'programiz') {
    return `Create a comprehensive Python learning guide for: "${title}".
Level: ${level} | Category: ${category}

Structure your response with these exact headings:

## Overview
2–3 sentences: what this topic is and why it matters in Python.

## Key Concepts
Bullet list of the core ideas (5–7 points).

## How It Works
Step-by-step explanation of the mechanics with at least one code example.

## Code Examples
3 practical Python code examples covering different use cases, each with a short label.

## Workflow
Bullet points of the typical developer workflow / mental model for this feature.

## Common Mistakes
2–3 errors or misconceptions beginners make and how to avoid them.

## Practice Exercise
One concrete hands-on exercise with a clear problem statement.

Keep code clean and idiomatic Python. Be specific to "${title}".`;
  }

  return `Create a comprehensive learning guide for the programming course path: "${title}".
Difficulty: ${level} | Focus area: ${category}${count ? ` | ${count} practice tasks` : ''}

Structure your response with these exact headings:

## Course Overview
What this course covers, who it is for, and why it matters for interview prep.

## Core Topics Covered
Bullet list of the main subjects and skills taught (6–8 items).

## Learning Path Workflow
Step-by-step breakdown of how to progress through this course — what to learn in what order.

## Key Skills You'll Build
Specific technical competencies and patterns you'll develop.

## Sample Problem Types
3–4 representative problem types with brief descriptions and code sketches.

## Prerequisites
What to know before starting, and what you can tackle after completing this path.

## Interview Relevance
How mastery of this path translates to technical interview performance.

Include concrete code examples where relevant.`;
}

// ── Generate one topic ────────────────────────────────────────────────────────

async function generate(slug, opts, outDir, retries = 2) {
  const file = path.join(outDir, `${slug}.json`);
  if (fs.existsSync(file)) return 'skip';

  const prompt = buildPrompt(opts);
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = msg.content[0].text;
    fs.writeFileSync(file, JSON.stringify({ content, generatedAt: new Date().toISOString(), ...opts }, null, 2));
    return 'ok';
  } catch (err) {
    if (retries > 0 && (err.status === 429 || err.status >= 500)) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return generate(slug, opts, outDir, retries - 1);
    }
    console.error(`  ✗ ${slug}: ${err.message}`);
    return 'err';
  }
}

// ── Pool runner ───────────────────────────────────────────────────────────────

async function runPool(tasks) {
  let i = 0, done = 0, ok = 0, skipped = 0, err = 0;
  const total = tasks.length;

  async function worker() {
    while (i < total) {
      const task = tasks[i++];
      const result = await generate(task.slug, task.opts, task.outDir);
      done++;
      if (result === 'ok') ok++;
      else if (result === 'skip') skipped++;
      else err++;
      process.stdout.write(`\r  [${done}/${total}] ✓${ok} skip${skipped} ✗${err}  `);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('');
  return { ok, skipped, err };
}

// ── Load source data ──────────────────────────────────────────────────────────

async function loadProgramiz() {
  const { PROGRAMIZ_PATHS } = await import(
    path.join(ROOT, 'apps/camora/src/data/capra/programizPaths.js')
  );
  return PROGRAMIZ_PATHS.map(p => ({
    slug: p.slug,
    opts: { title: p.title, source: 'programiz', category: p.category, level: p.level, count: '' },
    outDir: path.join(OUT_DIR, 'programiz'),
  }));
}

async function loadCodeSignal() {
  const { CODESIGNAL_LEARN_PATHS } = await import(
    path.join(ROOT, 'apps/camora/src/data/capra/codesignalLearnPaths.js')
  );
  return CODESIGNAL_LEARN_PATHS.map(p => ({
    slug: p.slug,
    opts: {
      title: p.title,
      source: 'codesignal',
      category: p.topic || '',
      level: p.difficulty || 'medium',
      count: String(p.practiceCount || ''),
    },
    outDir: path.join(OUT_DIR, 'codesignal'),
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const mode = process.argv[2] || 'all';

if (mode === 'programiz' || mode === 'all') {
  console.log('\n▶ Programiz Python tutorials');
  const tasks = await loadProgramiz();
  console.log(`  ${tasks.length} topics, concurrency=${CONCURRENCY}`);
  const r = await runPool(tasks);
  console.log(`  Done: ${r.ok} generated, ${r.skipped} skipped, ${r.err} errors`);
}

if (mode === 'codesignal' || mode === 'all') {
  console.log('\n▶ CodeSignal Learn paths');
  const tasks = await loadCodeSignal();
  console.log(`  ${tasks.length} topics, concurrency=${CONCURRENCY}`);
  const r = await runPool(tasks);
  console.log(`  Done: ${r.ok} generated, ${r.skipped} skipped, ${r.err} errors`);
}

console.log('\n✅ Static content generation complete.');
console.log(`   Files saved to: ${OUT_DIR}`);
