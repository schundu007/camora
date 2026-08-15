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
}): boolean {
  if (!input.fromImageSnap) return false;
  if (input.task !== 'review' && input.task !== 'explain') return false;
  return !!input.starterCode?.trim();
}

/** True when this situation returns the code unchanged and answers instead. */
export const isAnswerOnlyMode = (m: TaskMode | null | undefined): boolean =>
  m === 'explain' || m === 'clarify' || m === 'justify' || m === 'hint' || m === 'trace' || m === 'edge';
