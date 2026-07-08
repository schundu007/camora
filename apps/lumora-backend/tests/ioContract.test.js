import { describe, it, expect } from 'vitest';
import { hasStdinEvidence, hasExampleEvidence, inferIoContract } from '../src/routes/coding.js';

// ─────────────────────────────────────────────────────────────────────────
// SHARED FIXTURES — apps/camora/src/components/lumora/shared/readiness.test.ts
// asserts the SAME strings against its own hasIoEvidence(). Keep in sync.
// ─────────────────────────────────────────────────────────────────────────
export const HACKERRANK_PROBLEM = `Given an array of integers, find the sum.

Input Format
The first line contains an integer n.
The second line contains n space-separated integers.

Output Format
Print the sum.

Sample Input
3
1 2 3

Sample Output
6`;

export const LEETCODE_PROBLEM = `Given an array nums and a target, return indices of the two numbers such that they add up to target.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]

Constraints:
2 <= nums.length <= 10^4`;

// The exact case from the 2026-07-08 baseline: OCR failed, user typed a bare
// prompt. No I/O format, no examples, no starter code.
export const BARE_PROBLEM = 'Reverse a singly linked list. Do it iteratively and recursively.';

describe('hasStdinEvidence', () => {
  it('detects HackerRank Input Format / Sample Input', () => {
    expect(hasStdinEvidence(HACKERRANK_PROBLEM)).toBe(true);
  });
  it('does not fire on a LeetCode worked example', () => {
    expect(hasStdinEvidence(LEETCODE_PROBLEM)).toBe(false);
  });
  it('does not fire on a bare prompt', () => {
    expect(hasStdinEvidence(BARE_PROBLEM)).toBe(false);
  });
  it('detects an explicit stdin mention', () => {
    expect(hasStdinEvidence('Read n from stdin and print n*2.')).toBe(true);
  });
  it('does not fire on an output-prediction quiz prompt', () => {
    expect(hasStdinEvidence('Print the output of the following program.')).toBe(false);
  });
  it('fires when the PROGRAM is the thing that prints', () => {
    expect(hasStdinEvidence('Your program prints True or False.')).toBe(true);
    expect(hasStdinEvidence('The function prints each element on its own line.')).toBe(true);
  });
  it('fires on an explicit stdout target', () => {
    expect(hasStdinEvidence('Print the sum to standard output.')).toBe(true);
  });
});

describe('hasExampleEvidence', () => {
  it('detects a LeetCode Example block', () => {
    expect(hasExampleEvidence(LEETCODE_PROBLEM)).toBe(true);
  });
  it('does not fire on a bare prompt', () => {
    expect(hasExampleEvidence(BARE_PROBLEM)).toBe(false);
  });
  it('requires BOTH Input: and Output: when there is no Example header', () => {
    expect(hasExampleEvidence('Input: 5')).toBe(false);
    expect(hasExampleEvidence('Input: 5\nOutput: 25')).toBe(true);
  });
});

describe('inferIoContract', () => {
  it('starter code always wins', () => {
    expect(inferIoContract(BARE_PROBLEM, "if __name__ == '__main__':\n    n = int(input())")).toBe('template');
    expect(inferIoContract(HACKERRANK_PROBLEM, 'def solve():\n    pass')).toBe('template');
  });
  it('class Solution means pure function', () => {
    expect(inferIoContract('class Solution:\n    def twoSum(self, nums, target):')).toBe('pure-function');
  });
  it('HackerRank phrasing means stdin-print', () => {
    expect(inferIoContract(HACKERRANK_PROBLEM)).toBe('stdin-print');
  });
  it('stdin evidence is checked BEFORE example evidence', () => {
    // HackerRank problems often contain both "Sample Input" and "Input:".
    expect(inferIoContract(HACKERRANK_PROBLEM + '\nInput: 3\nOutput: 6')).toBe('stdin-print');
  });
  it('a LeetCode worked example means pure function', () => {
    expect(inferIoContract(LEETCODE_PROBLEM)).toBe('pure-function');
  });
  it('THE BASELINE: a bare prompt with no starter code is unknown', () => {
    expect(inferIoContract(BARE_PROBLEM)).toBe('unknown');
    expect(inferIoContract(BARE_PROBLEM, undefined)).toBe('unknown');
    expect(inferIoContract(BARE_PROBLEM, '')).toBe('unknown');
  });
  it('an output-prediction prompt with no other signal is unknown', () => {
    expect(inferIoContract('Print the output of the following program.')).toBe('unknown');
  });
  it('tolerates a non-string problem', () => {
    expect(inferIoContract(undefined)).toBe('unknown');
    expect(inferIoContract(null)).toBe('unknown');
  });
});

import { buildCodingSystemPrompt } from '../src/routes/coding.js';

describe('buildCodingSystemPrompt — RULE #2.7 (unknown I/O contract)', () => {
  const unknown = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'unknown');
  const known = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'stdin-print');
  const legacy = () => buildCodingSystemPrompt('python', undefined, undefined, true);

  it('emits RULE #2.7 only when the contract is unknown', () => {
    expect(unknown()).toContain('RULE #2.7: I/O CONTRACT UNKNOWN');
    expect(known()).not.toContain('RULE #2.7');
  });

  it('forbids drivers and invented labels when unknown', () => {
    const p = unknown();
    expect(p).toContain('NO input(), NO sys.stdin, NO print()');
    expect(p).toContain('ONE algorithm. Never two algorithms in one file.');
    expect(p).toContain('"hackerrank_compatible": false');
  });

  it('omitting the 5th argument behaves identically to passing null', () => {
    // Guards the default-parameter value, which existing 4-arg callers rely on.
    expect(legacy()).toBe(buildCodingSystemPrompt('python', undefined, undefined, true, null));
  });

  it('the known/null paths carry an empty assumptions array, never RULE #2.7', () => {
    for (const p of [legacy(), known()]) {
      expect(p).not.toContain('RULE #2.7');
      expect(p).toContain('"assumptions": []');
    }
    // ...while the unknown path demands the model populate it.
    expect(unknown()).not.toContain('"assumptions": []');
    expect(unknown()).toContain('"assumptions"');
  });

  it('starter code and unknown never co-occur, but starter wins if they do', () => {
    const p = buildCodingSystemPrompt('python', undefined, 'def solve():\n    pass', true, 'unknown');
    expect(p).not.toContain('RULE #2.7');
    expect(p).toContain('STARTER CODE — THIS IS THE EXACT TEMPLATE FROM THE PLATFORM');
  });

  it('declares the assumptions field in the JSON schema', () => {
    expect(unknown()).toContain('"assumptions"');
  });

  it('the legacy path leaves exactly one blank line after RULE #2.6', () => {
    // Scoped to the "NOT rewrite from scratch." -> next-section transition.
    // A whole-file line count would break on any unrelated prompt edit and say
    // nothing about this invariant. The legacy (null ioUnknown) path must not
    // emit a stray blank line from the ioUnknown conditional.
    const legacyPrompt = legacy();
    expect(legacyPrompt).toMatch(/NOT rewrite from scratch\.\n\n#/);
    expect(legacyPrompt).not.toMatch(/NOT rewrite from scratch\.\n\n\n/);
  });

  it('the unknown path renders RULE #2.7 immediately after the same marker', () => {
    // The unknown (non-null ioUnknown) path injects RULE #2.7 with correct spacing.
    const unknownPrompt = unknown();
    expect(unknownPrompt).toMatch(
      /NOT rewrite from scratch\.\n\n##############################################################################\n# RULE #2\.7:/
    );
  });
});
