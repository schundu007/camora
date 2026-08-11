/**
 * Behavioral question routing — decides what happens to a transcribed
 * interviewer line once the coalescer has assembled the full utterance.
 *
 * Lifted out of AICompanionPanel (same reason as text-formatting.ts) so the
 * policy can be tested without dragging in the panel's React tree. This is the
 * single control point for the flood-vs-miss tradeoff that has churned several
 * times; keep the decision here rather than inlining it at a call site.
 *
 * Two tiers, both behind one shared noise floor:
 *   passesNoiseFilter() false → dropped entirely, never shown, never asked
 *   shouldAutoAnswer()  true  → answered hands-free, immediately
 *   shouldAutoAnswer()  false → parked in the tap-to-answer list
 */
import { isQuestion, isWhisperHallucination, isBehavioralPrompt } from '@/lib/questionDetector';

// Whisper hallucinations in a noisy room are low-content loops — a single word
// repeated, or a 2-word phrase repeated ("the next thing… the next step…").
// Catches the garbage isBehavioralPrompt lets through so the tap-to-answer list
// stays clean.
export const looksLowContent = (s: string): boolean => {
  const words = s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  if (words.length <= 14 && Math.max(...Object.values(counts)) >= 3) return true;
  const bigrams: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    const b = words[i] + ' ' + words[i + 1];
    bigrams[b] = (bigrams[b] || 0) + 1;
  }
  return Object.values(bigrams).some((c) => c >= 2);
};

/**
 * Shared noise floor for every transcribed line that reaches the behavioral
 * panel, whether it gets auto-answered or parked in the tap-to-answer list.
 *
 * Both tiers sit behind this so the auto-answer path can never become the hole
 * that lets hallucinated URLs and filler loops back through to the LLM — the
 * exact regression 45d885ae was written to stop.
 */
export const passesNoiseFilter = (t: string): boolean => {
  if (!t || t.length < 15) return false;                                      // fragments: "of the", "with the"
  if (/https?:\/\/|www\.|\.(?:com|net|org|io|ai|co)\b/i.test(t)) return false; // hallucinated URLs ("www.Versa.gbias.com")
  if (isWhisperHallucination(t)) return false;                                // known Whisper phantoms
  if (!isBehavioralPrompt(t)) return false;                                   // pleasantries, wrap-ups, non-prompts
  if (looksLowContent(t)) return false;                                       // repetitive "next thing… next step" loops
  return true;
};

/**
 * AUTO-ANSWER POLICY — the one knob that decides flood vs. miss.
 *
 * Runs only on lines that already cleared passesNoiseFilter(), so the input
 * here is "plausibly an interview prompt". The job is to split that into:
 *   true  → answer it hands-free, right now
 *   false → park it in the tap-to-answer list for the user to choose
 *
 * Defers to isQuestion(), the precision-first gate: a question-word opener
 * ("what/how/why/tell me about"), a terminal "?", or an interview verb phrase.
 * Everything softer — "I'd love to hear about a time you led", bare statements,
 * ambiguous narration — falls to the tap list, which is where the 2026-06-29
 * garbage flood came from.
 *
 * Tuning direction, so the tradeoff stays explicit:
 *   • loosen (`return true`) → answers everything; the flood returns
 *   • tighten (require a terminal "?") → misses most real questions, since
 *     Whisper routinely drops the question mark
 */
export const shouldAutoAnswer = (t: string): boolean => isQuestion(t);
