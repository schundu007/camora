#!/usr/bin/env node
/**
 * Reconstructs full problem statements for all HR library problems missing
 * question_body, using Claude Haiku with the existing name/type/difficulty/
 * skills/preview/summary as context.
 *
 * Cost: ~$3 total for 4,033 problems using claude-haiku-4-5-20251001.
 * Reconstructed problems are marked with question_body_source: "ai_reconstructed".
 *
 * Usage:  ANTHROPIC_API_KEY=sk-... node reconstruct_problems.js
 *    or:  source ../../ascend-backend/.env && node reconstruct_problems.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH = resolve(__dirname, '../../../ascend-backend/data/hr_library.json');
const MODEL        = 'claude-haiku-4-5-20251001';
const BATCH_SAVE   = 50;    // save every N completions
const DELAY_MS     = 80;    // polite inter-request gap
const CONCURRENCY  = 5;     // parallel API calls

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY not set. Run: source ../../ascend-backend/.env && node reconstruct_problems.js');
  process.exit(1);
}

// ─── Prompt builders by question type ────────────────────────────────────────

function buildPrompt(p) {
  const skillList = (p.skills_full?.length ? p.skills_full : p.skills || []).join(', ') || 'not specified';
  const previewNote = p.preview?.trim()
    ? `\nFirst ~80 characters of the actual question:\n"${p.preview.trim()}"`
    : '';
  const summaryNote = p.summary?.trim()
    ? `\nWhat this question assesses:\n${p.summary.trim()}`
    : '';

  const base = `You are reconstructing a HackerRank technical assessment question for a practice platform.
Name: "${p.name}"
Type: ${p.type} | Difficulty: ${p.difficulty || 'unspecified'} | Skills: ${skillList}${previewNote}${summaryNote}

`;

  if (p.type === 'mcq') {
    return base + `Reconstruct the complete multiple-choice question. Output plain text:
1. The full scenario / problem description (expand the preview into a complete scenario)
2. The specific question being asked (one sentence ending in ?)
3. Four options labeled A) B) C) D)
Do NOT include any answer key. Output only the question body.`;
  }

  if (p.type === 'multiple_mcq') {
    return base + `Reconstruct the complete multiple-select question. Output plain text:
1. The full scenario / problem description
2. The specific question being asked
3. Options (choose all that apply): labeled A) B) C) D) E) — include at least 4 options
Do NOT include any answer key. Output only the question body.`;
  }

  if (p.type === 'code') {
    return base + `Reconstruct the complete coding problem. Output plain text with these sections:
[Problem description — expand the preview into a full scenario]

Input Format:
[describe the input]

Constraints:
[list numerical constraints]

Output Format:
[describe expected output]

Sample Input:
[example input]

Sample Output:
[expected output for the sample]

Output only the problem body, no preamble.`;
  }

  if (p.type === 'database') {
    return base + `Reconstruct the complete SQL problem. Output plain text with these sections:
[Problem description — expand the preview into a full scenario with table names and business context]

Schema:
[CREATE TABLE or column description]

Sample Data:
[small sample table contents]

Expected Output:
[what the correct query should return for the sample data]

Output only the problem body, no preamble.`;
  }

  if (p.type === 'fullstack' || p.type === 'coderepo_task') {
    return base + `Reconstruct the full project specification. Output plain text:
[Project overview — expand the preview into a full description]
[Feature requirements — numbered list of what must be implemented]
[Technical requirements — stack, constraints, acceptance criteria]

Output only the specification, no preamble.`;
  }

  if (p.type === 'whiteboard') {
    return base + `Reconstruct the system design / whiteboard problem. Output plain text:
[Scenario description — expand the preview]
[Design requirements — what the candidate must design]
[Constraints — scale, latency, availability requirements if applicable]

Output only the problem body, no preamble.`;
  }

  // Generic fallback for code_review, prompt_engineering, complete, approx, etc.
  return base + `Reconstruct the complete problem statement based on the context above.
Output only the problem body as plain text, no preamble or meta-commentary.`;
}

// ─── Claude API call ──────────────────────────────────────────────────────────

async function reconstruct(p) {
  const prompt = buildPrompt(p);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const lib     = JSON.parse(readFileSync(LIBRARY_PATH, 'utf-8'));
  const missing  = lib.problems.filter(p => !p.question_body);
  const total    = lib.problems.length;

  console.log(`\nHR Library: ${total} total | ${missing.length} missing question_body\n`);
  if (missing.length === 0) { console.log('All done!'); return; }

  let done = 0, errors = 0, lastSave = Date.now();
  const startTime = Date.now();

  async function processOne(p) {
    try {
      const body = await reconstruct(p);
      if (body && body.length > 30) {
        p.question_body        = body;
        p.question_body_source = 'ai_reconstructed';
        done++;
      } else {
        errors++;
      }
    } catch (e) {
      errors++;
      if (e.message.includes('401')) { console.error('\nBad API key. Exiting.'); process.exit(1); }
      if (e.message.includes('429')) await new Promise(r => setTimeout(r, 8000));
    }

    const pct = Math.round(((done + errors) / missing.length) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    process.stdout.write(`\r  [${done + errors}/${missing.length}] ${pct}% | done:${done} err:${errors} | ${elapsed}s  `);

    if (Date.now() - lastSave > 5000) {
      writeFileSync(LIBRARY_PATH, JSON.stringify(lib, null, 0));
      lastSave = Date.now();
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // Process with CONCURRENCY parallel workers
  let idx = 0;
  async function worker() {
    while (idx < missing.length) {
      const p = missing[idx++];
      await processOne(p);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  writeFileSync(LIBRARY_PATH, JSON.stringify(lib, null, 0));

  const finalHave = lib.problems.filter(p => p.question_body).length;
  const aiCount   = lib.problems.filter(p => p.question_body_source === 'ai_reconstructed').length;
  const elapsed   = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n\nFinal: ${finalHave}/${total} (${Math.round(finalHave / total * 100)}%) have question_body`);
  console.log(`AI reconstructed this run: +${done} | errors: ${errors} | time: ${elapsed} min`);
  console.log(`Total ai_reconstructed in library: ${aiCount}`);
  console.log('\nDeploy: git add apps/ascend-backend/data/hr_library.json && git push');
}

main().catch(err => { console.error(err); process.exit(1); });
