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

/** True when this situation returns the code unchanged and answers instead. */
export const isAnswerOnlyMode = (m: TaskMode | null | undefined): boolean =>
  m === 'explain' || m === 'clarify' || m === 'justify' || m === 'hint' || m === 'trace' || m === 'edge';
