/**
 * Generate complete problem descriptions for all 366 DevOps challenges using Claude Haiku.
 * Reads devopsChallengesData.js, generates descriptions, saves checkpoint, patches the file.
 *
 * Usage: node generate-descriptions.js
 * Resume after interruption: runs automatically from checkpoint.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '../../apps/camora/src/data/capra/topics/devopsChallengesData.js');
const CHECKPOINT_FILE = join(__dirname, 'descriptions-checkpoint.json');
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) throw new Error('ANTHROPIC_API_KEY env var is required');

const client = new Anthropic({ apiKey: API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const RATE_LIMIT_MS = 500;
const CHECKPOINT_EVERY = 10;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseProblems(content) {
  const problems = [];
  // Match each problem object — descriptions end at ` }` pattern
  const re = /\{ id: '(hr-devops-\d+)', title: `([^`]+)`, skill: '([^']+)', difficulty: '([^']+)', skillLevel: '([^']+)', timeMinutes: (\d+), score: (\d+), description: `([^`]*)` \}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    problems.push({
      id: m[1],
      title: m[2],
      skill: m[3],
      difficulty: m[4],
      skillLevel: m[5],
      timeMinutes: parseInt(m[6]),
      score: parseInt(m[7]),
      description: m[8],
      _raw: m[0],
    });
  }
  return problems;
}

function buildPrompt(p) {
  const isCoding = p.score >= 25;
  const type = isCoding ? 'coding challenge' : 'multiple-choice question (MCQ)';

  return `You are writing the full problem statement for a HackerRank DevOps ${type}.

Challenge details:
- Title: ${p.title}
- Skill: ${p.skill}
- Difficulty: ${p.difficulty} (${p.skillLevel})
- Time limit: ${p.timeMinutes} minute${p.timeMinutes !== 1 ? 's' : ''}
- Score: ${p.score} points
- Partial description (truncated): "${p.description}"

${isCoding ? `Write a complete problem statement for this coding challenge. Include:
1. A realistic scenario/context (company, project, or system name)
2. Clear description of what needs to be implemented or configured
3. Specific technical requirements (file paths, commands, service names where relevant)
4. Expected behavior or outcome
5. Any constraints or notes

The statement should be 3-5 paragraphs of plain text. Do NOT use markdown formatting, headers, bullet lists, or code blocks. Write flowing prose paragraphs only. No backtick characters.`
: `Write a complete problem statement for this MCQ challenge. Include:
1. A concrete scenario or code/configuration snippet that sets up the question context
2. A clear question asking what would happen, what is correct, or what is the best approach
3. Enough technical detail that the question is meaningful and unambiguous

The statement should be 2-4 paragraphs of plain text. Do NOT use markdown, headers, bullet lists, or code blocks. Write flowing prose only. No backtick characters.`}

Output ONLY the problem statement text. No introductory phrases like "Here is..." or "Problem Statement:". Start directly with the scenario.`;
}

async function generateDescription(problem, attempt = 1) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: buildPrompt(problem) }],
  });

  const text = (response.content[0]?.text ?? '').trim();
  if (!text || text.length < 50) {
    if (attempt < 3) {
      await sleep(1000);
      return generateDescription(problem, attempt + 1);
    }
    throw new Error(`Empty response for ${problem.id}`);
  }
  // Escape any backticks so they're safe in template literals
  return text.replace(/`/g, "'");
}

function loadCheckpoint() {
  if (existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
  }
  return {};
}

function saveCheckpoint(checkpoint) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function patchDataFile(content, problems, checkpoint) {
  let patched = content;
  let patchedCount = 0;

  for (const p of problems) {
    const newDesc = checkpoint[p.id];
    if (!newDesc) continue;

    // Replace just the description field within this problem's raw match
    const escapedRaw = p._raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const descReplacement = p._raw.replace(
      /description: `[^`]*`/,
      `description: \`${newDesc}\``
    );
    patched = patched.replace(p._raw, descReplacement);
    patchedCount++;
  }

  return { patched, patchedCount };
}

async function main() {
  const content = readFileSync(DATA_FILE, 'utf8');
  const problems = parseProblems(content);
  console.log(`Parsed ${problems.length} problems from devopsChallengesData.js`);

  const checkpoint = loadCheckpoint();
  const remaining = problems.filter(p => !checkpoint[p.id]);
  const already = problems.length - remaining.length;

  console.log(`Already generated: ${already} | Remaining: ${remaining.length}`);

  let generated = 0;

  for (const problem of remaining) {
    process.stdout.write(`[${already + generated + 1}/${problems.length}] ${problem.id}: ${problem.title.slice(0, 60)}...`);

    try {
      const desc = await generateDescription(problem);
      checkpoint[problem.id] = desc;
      generated++;
      process.stdout.write(` ✓\n`);

      if (generated % CHECKPOINT_EVERY === 0) {
        saveCheckpoint(checkpoint);
        console.log(`  → Checkpoint saved (${Object.keys(checkpoint).length} total)`);
      }

      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      process.stdout.write(` ✗ ${err.message}\n`);
      // Save what we have, then re-throw
      saveCheckpoint(checkpoint);
      throw err;
    }
  }

  saveCheckpoint(checkpoint);
  console.log(`\nAll ${problems.length} descriptions generated. Patching data file...`);

  const { patched, patchedCount } = patchDataFile(content, problems, checkpoint);
  writeFileSync(DATA_FILE, patched, 'utf8');
  console.log(`Patched ${patchedCount} problems in devopsChallengesData.js`);
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
