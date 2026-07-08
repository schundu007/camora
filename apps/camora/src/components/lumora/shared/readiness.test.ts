import { describe, it, expect } from 'vitest';
import { hasIoEvidence, codingChecks, cofixChecks, summarize } from './readiness';

// ─────────────────────────────────────────────────────────────────────────
// SHARED FIXTURES — these strings are duplicated verbatim in
// apps/lumora-backend/tests/ioContract.test.js. coding.js is the source of
// truth for the regexes; this copy exists because the gate must warn BEFORE
// the request is sent. If these two files ever disagree, coding.js wins.
// ─────────────────────────────────────────────────────────────────────────
const HACKERRANK_PROBLEM = `Given an array of integers, find the sum.

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

const LEETCODE_PROBLEM = `Given an array nums and a target, return indices of the two numbers such that they add up to target.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]

Constraints:
2 <= nums.length <= 10^4`;

const BARE_PROBLEM = 'Reverse a singly linked list. Do it iteratively and recursively.';

describe('hasIoEvidence — must agree with coding.js', () => {
  it('true for HackerRank stdin phrasing', () => {
    expect(hasIoEvidence(HACKERRANK_PROBLEM)).toBe(true);
  });
  it('true for a LeetCode worked example', () => {
    expect(hasIoEvidence(LEETCODE_PROBLEM)).toBe(true);
  });
  it('THE BASELINE: false for a bare prompt', () => {
    expect(hasIoEvidence(BARE_PROBLEM)).toBe(false);
  });
  it('false for empty input', () => {
    expect(hasIoEvidence('')).toBe(false);
  });
  // These four mirror the same cases in ioContract.test.js. If either side's
  // regex is edited without the other, exactly one of the two suites goes red.
  it('does not fire on an output-prediction quiz prompt', () => {
    expect(hasIoEvidence('Print the output of the following program.')).toBe(false);
  });
  it('fires when the PROGRAM is the thing that prints', () => {
    expect(hasIoEvidence('Your program prints True or False.')).toBe(true);
    expect(hasIoEvidence('The function prints each element on its own line.')).toBe(true);
  });
  it('fires on an explicit stdout target', () => {
    expect(hasIoEvidence('Print the sum to standard output.')).toBe(true);
  });
});

describe('codingChecks', () => {
  const base = { problemText: LEETCODE_PROBLEM, starterCode: 'def f(): pass', company: 'Salesforce' };

  it('all satisfied when everything is present', () => {
    const { blocking, degrading, ready } = summarize(codingChecks(base), new Set());
    expect(blocking).toHaveLength(0);
    expect(degrading).toHaveLength(0);
    expect(ready).toBe(true);
  });

  it('an empty problem is BLOCKING', () => {
    const { blocking } = summarize(codingChecks({ ...base, problemText: '   ' }), new Set());
    expect(blocking.map(c => c.id)).toEqual(['problem']);
  });

  it('THE BASELINE: a bare prompt with no starter is two DEGRADING checks', () => {
    const checks = codingChecks({ problemText: BARE_PROBLEM, starterCode: null, company: null });
    const { blocking, degrading, ready } = summarize(checks, new Set());
    expect(blocking).toHaveLength(0);
    expect(degrading.map(c => c.id).sort()).toEqual(['company', 'io-contract', 'starter'].sort());
    expect(ready).toBe(false);
  });

  it('names the consequence, not just the miss', () => {
    const checks = codingChecks({ problemText: BARE_PROBLEM, starterCode: null, company: null });
    const io = checks.find(c => c.id === 'io-contract')!;
    expect(io.consequence).toBe('Solve will invent an I/O contract — an output format the grader never asked for.');
  });

  it('a satisfied io-contract check does not appear when evidence exists', () => {
    const checks = codingChecks({ ...base, starterCode: null });
    expect(checks.find(c => c.id === 'io-contract')!.satisfied).toBe(true);
  });
});

describe('cofixChecks', () => {
  it('code shorter than 5 chars is BLOCKING', () => {
    const { blocking } = summarize(cofixChecks({ inputCode: 'x', problemContext: 'p', company: 'c' }), new Set());
    expect(blocking.map(c => c.id)).toEqual(['code']);
  });

  it('THE BASELINE: a missing problem statement is DEGRADING, never blocking', () => {
    const checks = cofixChecks({ inputCode: 'def f():\n    pass', problemContext: '', company: 'Salesforce' });
    const { blocking, degrading } = summarize(checks, new Set());
    expect(blocking).toHaveLength(0);
    expect(degrading.map(c => c.id)).toEqual(['problem']);
    expect(degrading[0].consequence).toBe('Fix will guess what the stub should compute.');
  });
});

describe('summarize — dismissal', () => {
  const checks = codingChecks({ problemText: BARE_PROBLEM, starterCode: null, company: null });

  it('dismissing hides a degrading check', () => {
    const { degrading, ready } = summarize(checks, new Set(['company', 'starter', 'io-contract']));
    expect(degrading).toHaveLength(0);
    expect(ready).toBe(true);
  });

  it('dismissing NEVER hides a blocking check', () => {
    const blocked = codingChecks({ problemText: '', starterCode: null, company: null });
    const { blocking, ready } = summarize(blocked, new Set(['problem']));
    expect(blocking.map(c => c.id)).toEqual(['problem']);
    expect(ready).toBe(false);
  });
});
