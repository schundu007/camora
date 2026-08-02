/**
 * Which model serves which surface. ONE place.
 *
 * The policy, in the product's terms:
 *
 *   LUMORA is LIVE. Someone is sitting in a real interview with a real
 *   interviewer waiting. It gets the newest, strongest model available, every
 *   time. Latency and quality both matter and neither is negotiable.
 *
 *   CAPRA is PRACTICE. Nobody is waiting. It runs on cheaper models (Gemini
 *   primary, Claude fallback) because a second of latency costs nothing there.
 *   That lives in ascend-backend; this file governs the live side.
 *
 * WHY THIS FILE EXISTS: model ids were scattered across services and routes,
 * and they had drifted into THREE different Sonnet-4 pins — claude-sonnet-4-6,
 * claude-sonnet-4-5-20250929 and claude-sonnet-4-20250514 — while the current
 * generation is Claude 5. Nobody chose that; it accreted. A live interview was
 * being answered by a model a full generation old because the string happened
 * to be typed in a file nobody revisited.
 *
 * Adding a model id anywhere outside this file is how that happens again.
 */

/**
 * The live answer model: behavioral answers, Ask Sona, coding, CoFix, design.
 * Sonnet over Opus deliberately — in a live interview a slower better answer is
 * a worse answer, and Sonnet 5 is the quality/latency point that fits a person
 * reading aloud while someone watches.
 */
export const LIVE_ANSWER_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/**
 * Cheap, fast helpers that are NOT the answer: chunk grading, HyDE rewriting,
 * archetype classification, hallucination checks. These run on the critical
 * path, so they must be fast; they are not user-visible prose, so they do not
 * need frontier quality.
 */
export const LIVE_HELPER_MODEL = process.env.ANTHROPIC_HELPER_MODEL || 'claude-haiku-4-5-20251001';

/**
 * Vision: reading a problem statement or code off a screenshot. Gemini Flash is
 * kept here on merit — it is fast and strong at OCR-style extraction, and this
 * runs while the candidate waits.
 */
export const LIVE_VISION_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Speech to text, best-first. A provider is used if its key is present.
 * Ordered by RELIABILITY, not headline speed: the fastest option is useless if
 * it 429s on every request mid-interview.
 */
export const LIVE_TRANSCRIBE_CHAIN = [
  { provider: 'deepgram', model: 'nova-3', why: 'purpose-built for speech, keyterm boosting' },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe', why: 'current generation, answers every time' },
  { provider: 'groq', model: 'whisper-large-v3-turbo', why: 'fastest, but the free tier daily cap makes it a last resort' },
];

/** Log the live policy once at boot so which models served an interview is a
 *  fact in the logs, not an archaeology exercise. */
export function logModelPolicy() {
  console.log(
    `[models] live answer=${LIVE_ANSWER_MODEL} helper=${LIVE_HELPER_MODEL} vision=${LIVE_VISION_MODEL} ` +
    `stt=${LIVE_TRANSCRIBE_CHAIN.map(p => p.provider).join('→')}`
  );
}
