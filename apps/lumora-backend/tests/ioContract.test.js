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
  it('tolerates a non-string problem', () => {
    expect(inferIoContract(undefined)).toBe('unknown');
    expect(inferIoContract(null)).toBe('unknown');
  });
});
