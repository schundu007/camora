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
 * Groq sits ahead of OpenAI on speed: when its quota has room it is the fastest
 * Whisper available, and when it is exhausted the circuit breaker removes it
 * from the chain for 15 minutes, so a spent quota costs ONE failed call rather
 * than one per utterance. That is what makes speed-first safe here.
 */
export const LIVE_TRANSCRIBE_CHAIN = [
  { provider: 'deepgram', model: 'nova-3', why: 'purpose-built for speech, keyterm boosting' },
  { provider: 'groq', model: 'whisper-large-v3-turbo', why: 'fastest Whisper when its quota has room' },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe', why: 'current generation, always answers' },
];

/**
 * Does this Anthropic model still accept `temperature` / `top_p` / `top_k`?
 *
 * The Claude 5 generation (and Opus 4.7/4.8) REMOVED the sampling parameters:
 * sending one is a 400 `temperature is deprecated for this model`, which
 * failed every Sona answer on the paid tier and pushed it onto the Gemini
 * fallback. Haiku 4.5 and older still accept them, and those calls want a low
 * temperature, so this is a per-model question, not a blanket delete.
 */
export function supportsSamplingParams(model) {
  return !/^claude-(fable-5|mythos-5|opus-5|sonnet-5|opus-4-7|opus-4-8)\b/.test(String(model || ''));
}

/** Log the live policy once at boot so which models served an interview is a
 *  fact in the logs, not an archaeology exercise. */
export function logModelPolicy() {
  console.log(
    `[models] live answer=${LIVE_ANSWER_MODEL} helper=${LIVE_HELPER_MODEL} vision=${LIVE_VISION_MODEL} ` +
    `stt=${LIVE_TRANSCRIBE_CHAIN.map(p => p.provider).join('→')}`
  );
}
