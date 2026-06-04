/**
 * Story anchor service — injects the best pre-parsed STAR story for a behavioral
 * archetype directly into the prompt, eliminating the need for Claude to
 * re-discover stories from raw resume text on every request.
 *
 * Pattern: "Memory-augmented agent" from awesome-llm-apps — store curated facts
 * per user and inject the exact match by archetype rather than letting the LLM
 * scan noisy resume text each time. Fixes two common behavioral failures:
 *   1. Claude picks a generic/wrong story instead of the strongest metric-backed one
 *   2. Metrics get paraphrased ("~50%" instead of the real "40% p99 reduction")
 */
import { query } from '../lib/shared-db.js';

const ARCHETYPE_KEYWORDS = {
  Conflict: ['conflict', 'disagreement', 'tension', 'pushback', 'difficult colleague', 'disagreed', 'friction', 'opposing view', 'resistance'],
  Leadership: ['lead', 'led', 'leadership', 'manage', 'managed', 'mentor', 'team', 'hire', 'grew', 'direction', 'influenced'],
  Failure: ['fail', 'failed', 'mistake', 'wrong', 'learned from', 'setback', 'regret', "didn't work", 'unsuccessful'],
  Ambiguity: ['ambiguous', 'unclear', 'no requirements', 'vague', 'ambiguity', 'uncertain', 'incomplete', 'no direction'],
  Influence: ['influence', 'convince', 'persuade', 'buy-in', 'without authority', 'cross-functional', 'across teams', 'stakeholder'],
  Innovation: ['innovative', 'novel', 'new approach', 'invented', 'created', 'first time', 'pioneered', 'came up with'],
  Collaboration: ['collaborate', 'cross-team', 'worked with', 'partnership', 'together', 'joint effort'],
  Growth: ['grew', 'growth', 'learned', 'improved yourself', 'development', 'challenge yourself', 'stretched', 'outside comfort'],
  Career: ['why', 'career change', 'transition', 'motivation', 'goal', 'direction', 'move to', 'switching'],
  Fit: ['culture', 'values', 'why us', 'why this company', 'why here', 'why join'],
};

/** Detect the best-matching archetype from a behavioral question. */
export function detectArchetype(question) {
  const q = question.toLowerCase();
  let best = null;
  let bestCount = 0;
  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    const count = keywords.filter((kw) => q.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      best = archetype;
    }
  }
  return best;
}

/**
 * Persist parsed stories for a user (upsert).
 * Called from stories.js /parse after successful extraction.
 */
export async function saveUserStories(userId, stories) {
  if (!userId || !stories?.length) return;
  await query(
    `INSERT INTO lumora_user_stories (user_id, stories_json, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET stories_json = $2::jsonb, updated_at = NOW()`,
    [userId, JSON.stringify(stories)],
  );
}

/**
 * Load the best pre-parsed story for a given archetype.
 * Prefers stories with concrete impact metrics.
 * Falls back to first story if no archetype match.
 * Returns null if user has no saved stories.
 */
export async function loadBestStory(userId, archetype) {
  if (!userId) return null;
  try {
    const result = await query(
      `SELECT stories_json FROM lumora_user_stories WHERE user_id = $1`,
      [userId],
    );
    if (!result.rows.length) return null;
    const stories = JSON.parse(result.rows[0].stories_json || '[]');
    if (!stories.length) return null;

    if (archetype) {
      const candidates = stories.filter((s) => s.archetypes?.includes(archetype));
      if (candidates.length > 0) {
        return candidates.find((s) => s.impact) || candidates[0];
      }
    }
    // No archetype match — use strongest story (first = highest ranked from parse)
    return stories.find((s) => s.impact) || stories[0];
  } catch {
    return null;
  }
}

/**
 * Build the anchor block string to prepend to the behavioral system prompt.
 * Returns { block, archetype } — block is empty string if nothing available.
 */
export async function buildStoryAnchorBlock(userId, question) {
  const archetype = detectArchetype(question);

  const story = await loadBestStory(userId, archetype).catch(() => null);
  if (!story) return { block: '', archetype };

  const block = `
═══ BEHAVIORAL ANCHOR — USE THIS STORY (do NOT substitute a different one) ═══
ARCHETYPE: ${archetype || 'not detected'}
STORY TITLE: ${story.title}
WHAT HAPPENED: ${story.summary}
IMPACT: ${story.impact || '[no metric in resume — describe the qualitative outcome, do NOT invent numbers]'}
INSTRUCTIONS:
- Build the STAR answer around THIS specific experience.
- Use the exact impact metric if provided — never paraphrase or inflate it.
- If no metric is listed, describe what changed qualitatively and say so.
- Keep the same company, role, and events from this story.
═══════════════════════════════════════════════════════════════════════════════
`;

  return { block, archetype };
}
