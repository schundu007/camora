import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getTopicContent, saveTopicContent, deleteTopicContent } from '../services/learnTopicCache.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Keep code clean and idiomatic Python. Be specific to "${title}".
Wrap ALL code in triple-backtick code blocks with "python" as the language (e.g., \`\`\`python ... \`\`\`). Never write bare code lines without backticks.`;
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
Use ### subheadings (e.g. ### Phase 1: Fundamentals) for each phase or stage. Never use **bold** as a heading substitute.

## Key Skills You'll Build
Specific technical competencies and patterns you'll develop.

## Sample Problem Types
3–4 representative problem types. For each, include a brief description and a Code Sketch wrapped in a triple-backtick code block with the language name (e.g., \`\`\`python ... \`\`\`).

## Prerequisites
What to know before starting, and what you can tackle after completing this path.

## Interview Relevance
How mastery of this path translates to technical interview performance.

IMPORTANT: Wrap ALL code — every example, snippet, and code sketch — in triple-backtick code blocks (e.g., \`\`\`python ... \`\`\`). Never write bare code lines without backticks.`;
}

// GET /api/v1/learn/topic/:slug — cache lookup only
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const result = await getTopicContent(slug);
  if (result.cached) return res.json({ content: result.content, cached: true });
  res.json({ content: null, cached: false });
});

// POST /api/v1/learn/topic/:slug — stream + auto-save on first generation
router.post('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { title = slug, source = 'programiz', category = '', level = 'beginner', count = '' } = req.body;

  // Check cache first — if already cached, stream it directly as SSE so the
  // frontend doesn't need separate code paths.
  const cached = await getTopicContent(slug);
  if (cached.cached) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ text: cached.content, fromCache: true })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let full = '';
  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt({ title, source, category, level, count }) }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        const text = chunk.delta.text;
        full += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Persist to Redis + Postgres after stream completes
    if (full) {
      saveTopicContent(slug, full, { title, source, category, level }).catch(() => {});
    }
  } catch (err) {
    console.error('[LearnTopic] generation error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Generation failed. Please try again.' })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// DELETE /api/v1/learn/topic/:slug — admin: evict cache to force refresh
router.delete('/:slug', async (req, res) => {
  await deleteTopicContent(req.params.slug);
  res.json({ ok: true });
});

export default router;
