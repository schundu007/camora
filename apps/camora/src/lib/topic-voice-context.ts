/**
 * Pure helpers that turn a Prepare "topic" object (shape varies by category)
 * into the inputs the voice agent needs: text blocks to narrate (Read mode),
 * a compact model context, per-mode directives, and quiz questions.
 *
 * No React, no side effects — trivially testable and reused by TopicVoiceAgent.
 */
export type VoiceMode = 'read' | 'teach' | 'quiz' | 'ask';

export interface TopicLike {
  title?: string;
  description?: string;
  introduction?: string;
  keyQuestions?: Array<{ question?: string; answer?: string }>;
  sections?: Array<{ heading?: string; title?: string; content?: string; body?: string }>;
}

const clean = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Ordered plain-text blocks to speak in Read mode. */
export function buildReadBlocks(topic: TopicLike): string[] {
  const blocks: string[] = [];
  if (topic.title) blocks.push(clean(topic.title));
  if (topic.description) blocks.push(clean(topic.description));
  if (topic.introduction) {
    for (const para of String(topic.introduction).split(/\n{2,}/)) {
      const p = clean(para).replace(/^#+\s*/, '');
      if (p) blocks.push(p);
    }
  }
  for (const s of topic.sections || []) {
    const head = clean(s.heading || s.title);
    const body = clean(s.content || s.body);
    if (head) blocks.push(head);
    if (body) blocks.push(body);
  }
  for (const q of topic.keyQuestions || []) {
    if (q.question) blocks.push(clean(q.question));
    if (q.answer) blocks.push(clean(q.answer));
  }
  return blocks.filter((b) => b.trim().length > 0);
}

/** Compact context string fed to the model (capped so it never bloats the prompt). */
export function buildSystemContext(topic: TopicLike): string {
  const parts: string[] = [];
  if (topic.title) parts.push(`Topic: ${clean(topic.title)}`);
  if (topic.description) parts.push(clean(topic.description));
  if (topic.introduction) parts.push(clean(topic.introduction));
  for (const s of topic.sections || []) {
    const head = clean(s.heading || s.title);
    const body = clean(s.content || s.body);
    if (head || body) parts.push([head, body].filter(Boolean).join(': '));
  }
  for (const q of topic.keyQuestions || []) {
    if (q.question) parts.push(`Q: ${clean(q.question)}`);
    if (q.answer) parts.push(`A: ${clean(q.answer)}`);
  }
  return parts.join('\n').slice(0, 6000);
}

/** Per-mode instruction prepended to the model context. */
export function buildDirective(mode: VoiceMode): string {
  switch (mode) {
    case 'teach':
      return 'You are Sona, a friendly expert tutor. Explain this topic clearly and conversationally in short spoken sentences (your reply is read aloud). Plain language, no markdown, no code fences. Keep it under ~150 words unless asked to go deeper.';
    case 'quiz':
      return 'You are Sona running an active-recall quiz. The user just answered aloud. Grade their answer briefly — say Correct, Partly right, or Not quite, give the single most important correction, then stop. Plain spoken sentences, no markdown.';
    case 'ask':
      return "You are Sona, a topic tutor. Answer the user's spoken question using the topic context below. Be concise and conversational (read aloud). Plain sentences, no markdown, no code fences.";
    case 'read':
    default:
      return 'Narrate the provided content in a natural speaking cadence.';
  }
}

/** Questions for Quiz mode — the topic's own keyQuestions, else a generic prompt. */
export function pickQuizQuestions(topic: TopicLike): string[] {
  const qs = (topic.keyQuestions || []).map((q) => clean(q.question)).filter(Boolean);
  if (qs.length) return qs;
  return [`Explain ${clean(topic.title) || 'this topic'} in your own words.`];
}
