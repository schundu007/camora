/**
 * The situation vocabulary, shared.
 *
 * These names are the wire contract with lumora-backend's services/taskModes.js,
 * which resolves exactly one situation per request. The union used to be
 * copy-pasted into four files (CoFixLayout, CodingLayout, LumoraShellPage, the
 * API client), so adding a situation meant finding all four — and missing one
 * failed as a type error at a call site far from the change. One definition
 * here, imported everywhere.
 *
 * Keep in sync with TASK_IDS in apps/lumora-backend/src/services/taskModes.js.
 */

/** What the EDITOR holds — the only situations a screenshot can establish. */
export type ScreenMode = 'review' | 'complete' | 'solve' | 'explain';

/** What the INTERVIEWER asked — established by the question, never by the screen. */
export type AskMode =
  | 'clarify'
  | 'optimize'
  | 'justify'
  | 'hint'
  | 'refactor'
  | 'trace'
  | 'edge'
  | 'extend';

export type TaskMode = ScreenMode | AskMode;

/** The four the screenshot extractor can return. Also validates its verdict. */
export const SCREEN_MODES: readonly ScreenMode[] = ['review', 'complete', 'solve', 'explain'] as const;

export const ASK_MODE_IDS: readonly AskMode[] = [
  'clarify', 'optimize', 'justify', 'hint', 'refactor', 'trace', 'edge', 'extend',
] as const;

/**
 * Should a capture be handed to CoFix instead of solved in the Coding tab?
 *
 * Extracted here because getting it wrong has broken production twice in
 * opposite directions, and both failures were invisible until someone hit them
 * mid-interview:
 *
 *   • Too narrow (required starter_code): a bare code screenshot has no
 *     left-hand problem panel, so the extractor puts the code in `problem` and
 *     returns starter_code null. The capture fell through to /solve and the
 *     interviewer's buggy code came back rewritten as a fresh function.
 *
 *   • Too wide (any text, no source check): HackerRank and Glider assessments
 *     are auth-walled and JS-rendered, so the URL flow gives up on scraping and
 *     screenshots the browser — landing in the same code path. Every fetched
 *     problem whose OCR read as a review got bounced to CoFix, which looks
 *     exactly like "the URL stopped fetching".
 *
 * The narrow answer is now correct because /solve resolves the situation
 * server-side: a review that is NOT diverted is still repaired in place rather
 * than rewritten. So this only decides which UI shows the answer, and can afford
 * to fire only when the evidence is unambiguous.
 */
export function shouldDivertToCofix(input: {
  /** True only for a deliberate screenshot. False for the URL-fetch fallback. */
  fromImageSnap: boolean;
  task: ScreenMode | null | undefined;
  /** Verbatim editor contents, when the extractor found an editor panel. */
  starterCode: string | null | undefined;
  /** The extracted problem statement, when the capture had one. */
  problem?: string | null;
}): boolean {
  if (!input.fromImageSnap) return false;
  if (input.task !== 'review' && input.task !== 'explain') return false;
  if (!input.starterCode?.trim()) return false;
  // A capture carrying a real problem statement is a problem to solve, whatever
  // the classifier called the editor. Snapping a LeetCode page with the template
  // already showing is the single most common capture there is, and it kept
  // reading as 'review' — the user watched the Coding tab hand their problem to
  // CoFix and answer a question they had not asked.
  //
  // Safe to be this conservative because the divert is UI routing, not
  // correctness: /solve resolves the situation server-side, so a review that
  // stays here is still repaired in place rather than rewritten.
  return !looksLikeProblemStatement(input.problem);
}

/**
 * Is this text a problem to solve, rather than the sentence or two of
 * instruction that sits above a code-review screen?
 *
 * Length alone is a bad test — "Find the bug in the following code" is short,
 * but so is a terse LeetCode prompt. The structural markers are what separate
 * them: a problem statement states its inputs, its outputs and its limits.
 */
export function looksLikeProblemStatement(text: string | null | undefined): boolean {
  const t = (text || '').trim();
  if (t.length < 80) return false;
  if (/\b(constraints?|input format|output format|sample input|sample output|example \d|explanation:)\b/i.test(t)) {
    return true;
  }
  return t.length >= 300;
}

/** True when this situation returns the code unchanged and answers instead. */
export const isAnswerOnlyMode = (m: TaskMode | null | undefined): boolean =>
  m === 'explain' || m === 'clarify' || m === 'justify' || m === 'hint' || m === 'trace' || m === 'edge';
