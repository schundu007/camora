/**
 * shouldDivertToCofix — the capture-routing decision.
 *
 * This has broken production twice, in opposite directions, and both were
 * reported from a live interview rather than caught by CI. The two regressions
 * are the first two tests below; everything else guards the space between them.
 */
import { describe, it, expect } from 'vitest';
import { shouldDivertToCofix, SCREEN_MODES, ASK_MODE_IDS, isAnswerOnlyMode } from './task-modes';

describe('shouldDivertToCofix', () => {
  const snap = (over: Partial<Parameters<typeof shouldDivertToCofix>[0]> = {}) =>
    shouldDivertToCofix({ fromImageSnap: true, task: 'review', starterCode: 'x = 1\nprint(x)', ...over });

  // Reported live: a screenshot added in the Coding tab jumped to CoFix and
  // started generating. Two paths produced it — the model calling a filled
  // template 'review', and the backend's shape fallback, which read "there is
  // code in the editor" as "this is a code review".
  it('REGRESSION: never diverts a capture that carries a real problem statement', () => {
    const statement = 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nConstraints:\n2 <= nums.length <= 10^4\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]';
    expect(snap({ problem: statement })).toBe(false);
    expect(snap({ problem: statement, task: 'explain' })).toBe(false);
  });

  it('still diverts a code-led capture — the instruction above it is not a problem', () => {
    expect(snap({ problem: 'Find the bug in the following code.' })).toBe(true);
    expect(snap({ problem: '' })).toBe(true);
    expect(snap({ problem: null })).toBe(true);
  });

  it('REGRESSION: never diverts the URL-fetch fallback', () => {
    // HackerRank and Glider are auth-walled and JS-rendered, so /fetch-problem
    // gives up and screenshots the browser — arriving in the same function with
    // fromImageSnap false. Diverting these bounced the user to CoFix, which
    // reads as "the URL stopped auto-fetching".
    expect(snap({ fromImageSnap: false })).toBe(false);
    expect(snap({ fromImageSnap: false, task: 'explain' })).toBe(false);
  });

  it('REGRESSION: does not divert a capture with no editor panel', () => {
    // A bare code screenshot puts its code in `problem`, not `starter_code`.
    // Those are handled server-side by /solve now, which repairs in place — so
    // the correct behaviour here is to decline and let it through.
    expect(snap({ starterCode: null })).toBe(false);
    expect(snap({ starterCode: '   ' })).toBe(false);
  });

  it('diverts a deliberate snap of an editor holding faulty code', () => {
    expect(snap()).toBe(true);
    expect(snap({ task: 'explain' })).toBe(true);
  });

  it('leaves solve and complete captures in the Coding tab', () => {
    // These are the whole point of the tab; diverting them would be worse than
    // the bug that started this.
    expect(snap({ task: 'solve' })).toBe(false);
    expect(snap({ task: 'complete' })).toBe(false);
  });

  it('declines when the classifier had no opinion', () => {
    expect(snap({ task: null })).toBe(false);
    expect(snap({ task: undefined })).toBe(false);
  });
});

describe('mode vocabulary', () => {
  it('keeps screen and ask modes disjoint', () => {
    for (const m of SCREEN_MODES) expect(ASK_MODE_IDS).not.toContain(m as never);
  });

  it('agrees on which situations leave the code untouched', () => {
    // Mirrors ANSWER_ONLY_TASKS on the server; the backend suite asserts the
    // two lists match, this asserts the predicate behaves.
    expect(isAnswerOnlyMode('explain')).toBe(true);
    expect(isAnswerOnlyMode('edge')).toBe(true);
    expect(isAnswerOnlyMode('trace')).toBe(true);
    expect(isAnswerOnlyMode('optimize')).toBe(false);
    expect(isAnswerOnlyMode('refactor')).toBe(false);
    expect(isAnswerOnlyMode('extend')).toBe(false);
    expect(isAnswerOnlyMode(null)).toBe(false);
  });
});
