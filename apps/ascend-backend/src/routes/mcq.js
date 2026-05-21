import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import rateLimit from 'express-rate-limit';
import { query } from '../lib/shared-db.js';

const router = Router();

// ── Rate limiter ──────────────────────────────────────────────────────────────
const mcqLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many MCQ requests, please try again in a minute.' },
});

// ── Load MCQ problem metadata once at startup ─────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const MCQ_DATA_PATH = resolve(__dirname, '../../../../apps/camora/src/data/capra/mcq-problems.json');

let mcqProblemsMap = {};
try {
  const raw = readFileSync(MCQ_DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  mcqProblemsMap = parsed.problems || {};
  console.log(`[MCQ] Loaded ${Object.keys(mcqProblemsMap).length} problem metadata entries`);
} catch (err) {
  console.warn('[MCQ] Could not load mcq-problems.json:', err.message);
}

// ── Claude Haiku client ───────────────────────────────────────────────────────
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  return new Anthropic({ apiKey });
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt({ title, domain, difficulty, tags }) {
  const tagList = Array.isArray(tags) && tags.length > 0 ? tags.join(', ') : 'general';
  return `Generate a realistic technical interview multiple-choice question.

Topic: ${title}
Domain: ${domain}
Difficulty: ${difficulty}
Tags: ${tagList}

Requirements:
- Write a clear scenario-based question (2-4 sentences)
- Provide exactly 4 answer options (A, B, C, D) — realistic distractors, one clearly correct
- For easy: test definitions/syntax. For medium: test application. For hard: test edge cases/tradeoffs.
- Keep options roughly equal in length
- Write a 2-3 sentence explanation of why the correct answer is right

Respond with ONLY valid JSON (no markdown, no code blocks):
{"question":"...","options":[{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."}],"correctLetter":"A","explanation":"..."}`;
}

// ── Claude call with one retry on JSON parse failure ─────────────────────────
async function generateWithClaude(promptData) {
  const client = getAnthropicClient();
  const prompt = buildPrompt(promptData);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text ?? '';
    try {
      // Strip any accidental markdown fences before parsing
      const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(stripped);

      // Validate required fields
      if (
        typeof parsed.question === 'string' &&
        Array.isArray(parsed.options) && parsed.options.length === 4 &&
        typeof parsed.correctLetter === 'string' &&
        typeof parsed.explanation === 'string'
      ) {
        return parsed;
      }
      throw new Error('Missing required fields in Claude response');
    } catch (parseErr) {
      if (attempt === 2) throw new Error(`Failed to parse Claude response after 2 attempts: ${parseErr.message}`);
      // else loop for retry
    }
  }
}

// ── POST /api/v1/mcq/generate ─────────────────────────────────────────────────
router.post('/generate', mcqLimiter, async (req, res, next) => {
  try {
    const { id, title, domain, difficulty, tags } = req.body;

    if (!id || !title || !domain || !difficulty) {
      return res.status(400).json({ error: 'id, title, domain, and difficulty are required' });
    }

    // 1. Check DB cache
    const cached = await query(
      'SELECT problem_id, question, options, correct_letter, explanation FROM ascend_mcq_generated WHERE problem_id = $1',
      [id]
    );

    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      return res.json({
        id: row.problem_id,
        question: row.question,
        options: row.options,
        correctLetter: row.correct_letter,
        explanation: row.explanation,
        cached: true,
      });
    }

    // 2. Generate via Claude Haiku
    const generated = await generateWithClaude({ title, domain, difficulty, tags });

    // 3. Store in DB
    await query(
      `INSERT INTO ascend_mcq_generated (problem_id, question, options, correct_letter, explanation)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (problem_id) DO NOTHING`,
      [id, generated.question, JSON.stringify(generated.options), generated.correctLetter, generated.explanation]
    );

    return res.json({
      id,
      question: generated.question,
      options: generated.options,
      correctLetter: generated.correctLetter,
      explanation: generated.explanation,
      cached: false,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/mcq/batch ────────────────────────────────────────────────────
router.post('/batch', mcqLimiter, async (req, res, next) => {
  try {
    const { ids, domain, difficulty, count = 10 } = req.body;

    let targetIds = [];

    if (Array.isArray(ids) && ids.length > 0) {
      // Use the explicitly provided IDs
      targetIds = ids;
    } else {
      // Filter mcqProblemsMap by domain/difficulty and pick `count` random ones
      let candidates = Object.values(mcqProblemsMap);

      if (domain) {
        candidates = candidates.filter(p => p.domain === domain);
      }
      if (difficulty) {
        candidates = candidates.filter(p => p.difficulty === difficulty);
      }

      // Fisher-Yates shuffle then slice
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      targetIds = candidates.slice(0, Math.min(count, candidates.length)).map(p => p.id);
    }

    if (targetIds.length === 0) {
      return res.json({ questions: [] });
    }

    // Generate all in parallel, skipping failures
    const results = await Promise.allSettled(
      targetIds.map(async (id) => {
        // Look up metadata for this ID
        const meta = mcqProblemsMap[id] || {};
        const { title = id, domain: d = '', difficulty: diff = 'medium', tags: t = [] } = meta;

        // Check cache first
        const cached = await query(
          'SELECT problem_id, question, options, correct_letter, explanation FROM ascend_mcq_generated WHERE problem_id = $1',
          [id]
        );

        if (cached.rows.length > 0) {
          const row = cached.rows[0];
          return {
            id: row.problem_id,
            question: row.question,
            options: row.options,
            correctLetter: row.correct_letter,
            explanation: row.explanation,
            cached: true,
          };
        }

        const generated = await generateWithClaude({ title, domain: d, difficulty: diff, tags: t });

        await query(
          `INSERT INTO ascend_mcq_generated (problem_id, question, options, correct_letter, explanation)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (problem_id) DO NOTHING`,
          [id, generated.question, JSON.stringify(generated.options), generated.correctLetter, generated.explanation]
        );

        return {
          id,
          question: generated.question,
          options: generated.options,
          correctLetter: generated.correctLetter,
          explanation: generated.explanation,
          cached: false,
        };
      })
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`[MCQ batch] ${failed.length}/${targetIds.length} generations failed. First error:`, failed[0].reason?.message);
    }

    const questions = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    return res.json({ questions });
  } catch (err) {
    next(err);
  }
});

export default router;
