import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

const ARCHETYPES = [
  'Conflict', 'Leadership', 'Failure', 'Ambiguity',
  'Influence', 'Innovation', 'Collaboration', 'Growth',
  'Career', 'Fit',
];

const STORY_PARSE_PROMPT = `You extract behavioral-interview stories from a candidate's resume.

Your goal: produce 6-10 DISCRETE experience units a candidate can reference in a behavioral interview.

Each story must be a SPECIFIC project, incident, or accomplishment — not a job title, not a skill list. If the resume is thin, return fewer stories rather than padding with generic entries.

For each story, emit:
- id: a short kebab-case slug unique within this response
- title: 3-7 word label the candidate will scan ("Led migration from monolith", "Handled prod outage at 3am")
- summary: one sentence describing what the candidate actually did
- archetypes: array of 1-3 archetypes this story could answer, chosen ONLY from: ${ARCHETYPES.join(', ')}
- impact: one short phrase with the measurable outcome if available ("40% p99 reduction", "led 4 engineers") — empty string if no metric in resume

Respond with valid JSON only, no prose before or after:
{ "stories": [ { "id": "...", "title": "...", "summary": "...", "archetypes": ["Leadership", "Growth"], "impact": "..." } ] }

Rules:
- Pull facts ONLY from the resume text — never invent employers, metrics, or details
- Favor stories with concrete metrics or named systems
- If two stories are near-duplicates, keep only the stronger one
- Prefer recent experience (last 3-5 years) over older roles`;

router.post('/parse', authenticate, async (req, res) => {
  const { resume } = req.body || {};
  if (!resume || typeof resume !== 'string') {
    return res.status(400).json({ error: 'Missing resume text' });
  }
  const trimmed = resume.trim();
  if (trimmed.length < 80) {
    return res.status(400).json({ error: 'Resume is too short to extract stories' });
  }
  if (trimmed.length > 20000) {
    return res.status(413).json({ error: 'Resume is too long (>20k chars); please trim it' });
  }

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2400,
      system: STORY_PARSE_PROMPT,
      messages: [{ role: 'user', content: `RESUME:\n\n${trimmed}` }],
    });

    const text = msg.content?.map(b => b.text).join('') || '';
    // Extract JSON (tolerant of stray prose)
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: 'Parser returned no JSON' });

    let parsed;
    try { parsed = JSON.parse(m[0]); } catch (e) {
      return res.status(502).json({ error: 'Parser returned invalid JSON' });
    }
    if (!parsed || !Array.isArray(parsed.stories)) {
      return res.status(502).json({ error: 'Parser returned unexpected shape' });
    }

    // Sanitize + validate archetypes
    const stories = parsed.stories
      .filter(s => s && typeof s === 'object' && s.title && s.summary)
      .slice(0, 12)
      .map((s, i) => ({
        id: String(s.id || `story-${i}`).slice(0, 48),
        title: String(s.title).slice(0, 80),
        summary: String(s.summary).slice(0, 300),
        archetypes: (Array.isArray(s.archetypes) ? s.archetypes : [])
          .filter(a => ARCHETYPES.includes(a))
          .slice(0, 3),
        impact: String(s.impact || '').slice(0, 80),
      }));

    return res.json({ stories });
  } catch (err) {
    console.error('Story parse error:', err.message);
    return res.status(500).json({ error: 'Story extraction failed' });
  }
});

export default router;
