import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CAMORA_ROUTES = `
/capra/prepare                  → Prep dashboard — all topic categories
/capra/prepare/coding           → Data Structures & Algorithms topics
/capra/prepare/system-design    → System Design topics
/capra/prepare/behavioral       → Behavioral / STAR interview topics
/capra/prepare/devops           → DevOps — CI/CD, containers, Kubernetes, IaC
/capra/prepare/linux            → Linux fundamentals — shell, permissions, systemd
/capra/prepare/sre              → Site Reliability Engineering topics
/capra/prepare/cloud            → Cloud (AWS, GCP, Azure) topics
/capra/prepare/networking       → Networking — TCP/IP, DNS, HTTP, TLS
/capra/prepare/low-level        → Low-level design and system internals
/capra/prepare/mlops            → MLOps — training pipelines, model serving
/capra/prepare/observability    → Observability — metrics, logs, traces
/capra/prepare/challenges       → Coding challenges and exercises
/capra/practice                 → DSA practice problems — coding challenges
/capra/playground               → Code playground — run code in the browser
/capra/resume                   → Resume analysis and feedback
/capra/company-prep             → Company-specific prep — Google, Meta, Amazon, etc.
/capra/plan                     → Study plan — set goals and timeline
/capra/achievements             → Achievements and progress badges
/capra/hr-library               → Behavioral / HR questions library
/lumora                         → Live interview assistant — Sona helps in real-time
/pricing                        → Subscription plans and pricing
/profile                        → Account settings and preferences
/docs                           → Documentation and guides
/jobs                           → Job listings and applications
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
    // Prefill forces the model to start mid-JSON — prevents preamble text
    messages: [
      { role: 'user', content: message },
      { role: 'assistant', content: '{' },
    ],
  });

  // Prepend the prefilled '{' the model continued from
  const raw = '{' + (msg.content[0]?.text?.trim() ?? '');

  // Strategy 1: raw is valid JSON
  try {
    const parsed = JSON.parse(raw);
    return {
      answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
      action: parsed.action ?? null,
    };
  } catch {}

  // Strategy 2: JSON inside a ```json ... ``` block anywhere in the text
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock[1].trim());
      return {
        answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
        action: parsed.action ?? null,
      };
    } catch {}
  }

  // Strategy 3: find any {...} object in the text
  const jsonObj = raw.match(/\{[\s\S]*\}/);
  if (jsonObj) {
    try {
      const parsed = JSON.parse(jsonObj[0]);
      return {
        answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
        action: parsed.action ?? null,
      };
    } catch {}
  }

  return { answer: raw, action: null };
}
