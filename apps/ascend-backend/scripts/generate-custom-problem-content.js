// apps/ascend-backend/scripts/generate-custom-problem-content.js
//
// Authors statements for the `source='custom'` problems that have none.
//
// These rows came from a CodeSignal-style import that carried only a title, a
// difficulty and a language tag — no statement exists for them anywhere upstream,
// so unlike the LeetCode set they cannot be backfilled from doocs/leetcode.
//
// Because the titles are often opaque ("Adventurers Dueling", "A Mysterious Diary"),
// the model is told to refuse rather than guess: anything it cannot turn into a
// coherent, self-contained exercise is left empty and reported, on the principle
// that an empty problem is better than a confidently wrong one. Everything written
// here is stamped content_source='generated' and the UI badges it as AI-authored.
//
// Usage:
//   DATABASE_URL=… ANTHROPIC_API_KEY=… node scripts/generate-custom-problem-content.js [options]
//     --dry-run     Print what would be written, write nothing
//     --regenerate  Also revisit rows a previous run authored
//     --limit <n>   Only process the first n problems
//     --model <id>  Override the model (default claude-sonnet-5)

import { query, closePool, getPool } from '../src/lib/shared-db.js';
// The real SDK, not lib/_shared/llm.js: that helper is an Anthropic-shaped shim over
// gemini-2.5-flash (chosen for cost on the request path). This backfill's entire value
// is statement accuracy, and it runs once, so it goes straight to Claude.
import Anthropic from '@anthropic-ai/sdk';

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = n => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : undefined; };

const DRY = flag('--dry-run');
// Re-run rows a previous pass authored, e.g. after tightening the quality gates.
const REGEN = flag('--regenerate');
const LIMIT = parseInt(opt('--limit') ?? '0', 10) || 0;
const MODEL = opt('--model') ?? process.env.PROBLEM_GEN_MODEL ?? 'claude-sonnet-5';
const CONCURRENCY = 4;

if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL'); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }

const client = new Anthropic();

// This run holds a pool open for the better part of an hour while it waits on the
// model, and an idle Postgres connection dropped by the proxy surfaces as an
// unhandled 'error' on the pool — which killed a previous run at problem 180 of
// 354. Absorb it here; pg opens a fresh connection on the next query.
getPool().on('error', err => console.warn(`  [pool] ${err.message} — continuing`));

/** Retry a write across a dropped connection rather than losing the generation. */
async function writeWithRetry(sql, params, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await query(sql, params);
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

const TOOL = {
  name: 'submit_problem',
  description: 'Return the authored exercise, or decline it.',
  input_schema: {
    type: 'object',
    properties: {
      confident: { type: 'boolean', description: 'False if the title is too vague to yield one obvious exercise.' },
      statement_html: { type: 'string', description: 'The task, in 1-3 short <p> paragraphs of plain HTML.' },
      examples: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Named arguments, e.g. "nums = [1,2,3], k = 2".' },
            output: { type: 'string', description: 'The exact returned value.' },
            explanation: { type: 'string' },
          },
          required: ['input', 'output'],
        },
      },
      constraints: { type: 'array', items: { type: 'string' } },
    },
    required: ['confident', 'statement_html', 'examples', 'constraints'],
  },
};

const SYSTEM = `You write programming-exercise statements for an interview-prep library.

You are given only a problem TITLE, a difficulty and a language/topic tag. There is no
source text to copy — you are authoring a self-contained exercise that fits the title.

Call the submit_problem tool with your result.

Rules:
- Set "confident": false and leave the other fields empty when the title is too vague or
  ambiguous to yield ONE obvious exercise (e.g. a whimsical name with no implied task).
  Refusing is correct and expected — do not invent a task just to fill the field.
- statement_html: 1-3 short <p> paragraphs of plain HTML. Allowed tags: <p> <code> <ul> <li>
  <strong> <em>. State the task, the input, and exactly what to return. No heading, no
  "Example"/"Constraints" section — those are separate fields.
- examples: 2-3 concrete worked cases. "input" must show named arguments
  (e.g. "nums = [1,2,3], k = 2"), "output" the exact returned value.
- Examples MUST be arithmetically correct and consistent with the statement and the
  constraints. Verify each one before returning it.
- constraints: 2-4 bounds in the usual notation, e.g. "1 <= nums.length <= 10^4".
- Match the stated difficulty. Respect the language tag when it implies the shape of the
  task (a "sql" tag means write a query; "java" may mean an OOP exercise).`;

function buildPrompt(p) {
  const tags = Array.isArray(p.topic_tags) ? p.topic_tags.map(t => t.name).filter(Boolean) : [];
  return `Title: ${p.title}
Difficulty: ${p.difficulty}
Tags: ${tags.join(', ') || 'none'}`;
}

// An explanation that argues with itself ("…= 10… upon recomputation the actual
// sum is 9") means the model revised its arithmetic mid-sentence and the stated
// output can no longer be trusted. Cheap to detect, and worth detecting: a wrong
// worked example is exactly what makes a problem page useless.
const SELF_CORRECTION = /\b(upon recomputation|recomputing|on second thought|wait,|actually,|let me recompute|correction:|i made an error|apologies)\b/i;

/** Reject malformed or half-empty generations before they reach the DB. */
function validate(out) {
  if (typeof out !== 'object' || out === null) return 'not an object';
  if (out.confident !== true) return 'model not confident';
  if (typeof out.statement_html !== 'string' || out.statement_html.trim().length < 40) {
    return 'statement too short';
  }
  if (/<(script|iframe|style)\b/i.test(out.statement_html)) return 'disallowed markup';
  if (!Array.isArray(out.examples) || out.examples.length === 0) return 'no examples';
  for (const ex of out.examples) {
    if (!ex || typeof ex.input !== 'string' || typeof ex.output !== 'string') return 'malformed example';
    if (!ex.input.trim() || !ex.output.trim()) return 'empty example field';
    if (ex.explanation && SELF_CORRECTION.test(ex.explanation)) return 'self-correcting explanation';
    if (ex.explanation && /\.\.\.|…/.test(ex.explanation) && /\d/.test(ex.explanation) && ex.explanation.length > 220) {
      return 'rambling explanation';
    }
  }
  if (!Array.isArray(out.constraints) || out.constraints.length === 0) return 'no constraints';
  return null;
}

const VERIFY_TOOL = {
  name: 'report_check',
  description: 'Report whether every worked example is correct.',
  input_schema: {
    type: 'object',
    properties: {
      all_correct: { type: 'boolean', description: 'True only if every example output is right and consistent with the statement.' },
      problems: { type: 'array', items: { type: 'string' }, description: 'One line per example that is wrong.' },
    },
    required: ['all_correct'],
  },
};

const VERIFY_SYSTEM = `You are checking a programming exercise for correctness.

Work each example yourself against the statement, then report via report_check.

Set all_correct: false if ANY of these hold:
- an example's stated output is not what the statement's rules produce for that input
- an example contradicts the constraints
- the statement is ambiguous enough that the output cannot be determined
Be strict. Recompute every example rather than trusting the given output.`;

/**
 * Second opinion from a fresh context. The generator's own explanations are not
 * evidence — it produced the error we are looking for — so this call sees only
 * the finished statement/examples/constraints and re-derives each result.
 */
async function verify(p, out) {
  const body = [
    `Title: ${p.title}`,
    `Statement:\n${out.statement_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`,
    `Constraints:\n${out.constraints.map(c => `- ${c}`).join('\n')}`,
    'Examples:',
    ...out.examples.map((ex, i) => `Example ${i + 1}\nInput: ${ex.input}\nOutput: ${ex.output}`),
  ].join('\n\n');

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: VERIFY_SYSTEM,
    messages: [{ role: 'user', content: body }],
    tools: [VERIFY_TOOL],
    tool_choice: { type: 'tool', name: VERIFY_TOOL.name },
  });
  const check = res.content.find(b => b.type === 'tool_use')?.input;
  if (!check || typeof check.all_correct !== 'boolean') return { ok: false, why: 'verifier returned nothing' };
  if (check.all_correct) return { ok: true };
  return { ok: false, why: (check.problems ?? []).slice(0, 2).join('; ') || 'examples failed verification' };
}

async function generate(p, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1600,
        system: SYSTEM,
        messages: [{ role: 'user', content: buildPrompt(p) }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
      });
      const out = res.content.find(b => b.type === 'tool_use')?.input;
      const problem = validate(out);
      // A failed shape check is worth another attempt; a refusal is final.
      if (problem === 'model not confident') return { skipped: problem };
      if (problem) {
        if (attempt < retries) continue;
        return { skipped: problem };
      }

      const check = await verify(p, out);
      if (!check.ok) {
        if (attempt < retries) continue;
        return { skipped: `failed verification (${check.why})` };
      }
      return { out };
    } catch (err) {
      if (attempt === retries) return { error: err.message };
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return { error: 'exhausted retries' };
}

// ── Load the gap ─────────────────────────────────────────────────────────────
const { rows: targets } = await query(`
  SELECT id, slug, title, difficulty, topic_tags
  FROM coding_problems
  WHERE (content IS NULL OR content = ''${REGEN ? " OR content_source = 'generated'" : ''})
  ORDER BY slug
  ${LIMIT ? `LIMIT ${LIMIT}` : ''}`);

console.log(`${targets.length} problems without a statement`);
console.log(`Model: ${MODEL}${DRY ? '  (dry run)' : ''}\n`);

const stats = { written: 0, skipped: 0, errors: 0 };
const skippedTitles = [];
let done = 0;

async function worker(items) {
  for (const p of items) {
    const { out, skipped, error } = await generate(p);
    done++;

    if (error) {
      stats.errors++;
      console.warn(`  [error] ${p.slug}: ${error}`);
    } else if (skipped) {
      stats.skipped++;
      skippedTitles.push(`${p.title} (${skipped})`);
    } else {
      if (!DRY) {
        await writeWithRetry(
          `UPDATE coding_problems
              SET content = $2, examples = $3::jsonb, constraints = $4::jsonb,
                  content_source = 'generated', updated_at = NOW()
            WHERE id = $1`,
          [p.id, out.statement_html.trim(), JSON.stringify(out.examples), JSON.stringify(out.constraints)]
        );
      }
      stats.written++;
    }

    if (done % 20 === 0 || done === targets.length) {
      process.stdout.write(`\r[${done}/${targets.length}] written:${stats.written} skipped:${stats.skipped} errors:${stats.errors}`);
    }
  }
}

const buckets = Array.from({ length: CONCURRENCY }, () => []);
targets.forEach((p, i) => buckets[i % CONCURRENCY].push(p));
await Promise.all(buckets.map(worker));

console.log('\n');
console.log('─'.repeat(52));
console.log(`  statements written : ${stats.written}`);
console.log(`  skipped (too vague): ${stats.skipped}`);
console.log(`  errors             : ${stats.errors}`);
console.log('─'.repeat(52));
if (skippedTitles.length) {
  console.log('\nLeft empty (no coherent exercise inferable from the title):');
  skippedTitles.slice(0, 40).forEach(t => console.log(`  - ${t}`));
  if (skippedTitles.length > 40) console.log(`  … and ${skippedTitles.length - 40} more`);
}

await closePool();
