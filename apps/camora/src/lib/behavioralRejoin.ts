/**
 * Behavioral-mode transcript rejoin buffer.
 *
 * In behavioral mode the interviewer's question can flush in TWO pieces when
 * they pause mid-sentence ("what are hermetic" … "deterministic and
 * reproducible builds"). Each fragment fails isQuestion() on its own, so both
 * get dropped and the question silently vanishes — even though the live
 * preview showed the whole sentence. The fix: when a clean (non-hallucination)
 * fragment isn't yet a question, hold it briefly and prepend it to the next
 * fragment before re-testing. The concatenation passes and Sona answers.
 *
 * A lone non-question fragment (interviewer narration, an unfinished thought)
 * simply ages out via the caller's carry timeout and never fires — so this
 * does NOT weaken the isQuestion gate against genuine non-questions.
 */
import { isQuestion, isWhisperHallucination } from './questionDetector';

/** How long the caller should hold a buffered fragment before discarding it. */
export const BEHAVIORAL_CARRY_MS = 2500;

/** Upper bound on the buffered carry so a long monologue can't grow it forever. */
const MAX_CARRY_CHARS = 400;

export type RejoinResult =
  /** Dispatch `text` as the question, then clear the carry. */
  | { action: 'fire'; text: string }
  /** Hold `carry` and wait for the next fragment (arm/refresh the timeout). */
  | { action: 'buffer'; carry: string }
  /** Garbage — discard and clear the carry. */
  | { action: 'drop' };

/**
 * Decide what to do with a freshly-committed behavioral transcript, given any
 * fragment carried over from a prior flush of the same utterance.
 */
export function rejoinBehavioral(carry: string, incoming: string): RejoinResult {
  const trimmed = (incoming || '').trim();
  if (!trimmed) return carry ? { action: 'buffer', carry } : { action: 'drop' };

  // A standalone hallucination ("thank you", slide dumps) never joins a real
  // question — drop it outright without polluting the carry.
  if (isWhisperHallucination(trimmed)) return { action: 'drop' };

  const candidate = carry ? `${carry} ${trimmed}`.trim() : trimmed;
  if (isQuestion(candidate)) return { action: 'fire', text: candidate };

  // Not a question yet — buffer for the rest of the sentence. Bound the carry
  // so continuous narration can't accumulate without limit; once it overflows,
  // keep only the latest fragment as the new seed.
  const bounded = candidate.length > MAX_CARRY_CHARS ? trimmed : candidate;
  return { action: 'buffer', carry: bounded };
}
