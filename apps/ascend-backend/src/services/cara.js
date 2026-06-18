import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CAMORA_ROUTES = `
/capra/prepare          → Prep dashboard — topics overview and study plan
/capra/practice         → DSA practice problems — coding challenges
/capra/playground       → Code playground — run code in the browser
/capra/mcq              → Multiple choice quizzes — test knowledge
/capra/resume           → Resume analysis and feedback
/capra/company-prep     → Company-specific prep — Google, Meta, Amazon, etc.
/capra/plan             → Study plan — set goals and timeline
/capra/library          → Problem library — curated DSA problem sets
/capra/achievements     → Achievements and progress badges
/capra/hr-library       → Behavioral / HR questions library
/lumora                 → Live interview assistant — Sona helps in real-time
/pricing                → Subscription plans and pricing
/profile                → Account settings and preferences
/docs                   → Documentation and guides
/jobs                   → Job listings and applications
`.trim();

function buildSystemPrompt(ctx) {
  const { userName, goal, topicsStudied, planTier, currentPath } = ctx;
  return `You are Cara, Camora's platform guide. Help ${userName || 'the user'} navigate features and plan their prep. Be concise — 1-3 sentences max. Never answer interview questions — redirect: "For live interviews, Sona's got you — head to Lumora."

USER:
- Name: ${userName || 'unknown'}
- Goal: ${goal || 'not set'}
- Topics studied: ${topicsStudied.length ? topicsStudied.join(', ') : 'none yet'}
- Plan tier: ${planTier || 'free'}
- Current page: ${currentPath || '/'}

CAMORA ROUTES:
${CAMORA_ROUTES}

Always respond with valid JSON in exactly this shape:
{"answer":"<1-3 sentence response>","action":{"type":"navigate","path":"<exact path from list>","label":"<short label e.g. Open System Design>"}}

Omit "action" entirely when navigation is not appropriate. Never fabricate routes not in the list above.`;
}

export async function askCara({ message, context }) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: buildSystemPrompt(context),
    messages: [{ role: 'user', content: message }],
  });

  const raw = msg.content[0]?.text?.trim() ?? '';

  try {
    const parsed = JSON.parse(raw);
    return {
      answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
      action: parsed.action ?? null,
    };
  } catch {
    return { answer: raw, action: null };
  }
}
