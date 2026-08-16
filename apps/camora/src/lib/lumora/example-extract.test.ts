import { describe, it, expect } from 'vitest';
import {
  parseProblemExamples,
  parseCallExamples,
  parseStdinExamples,
  detectSolutionFn,
  buildTestCases,
  mergeTestCases,
} from './example-extract';

const TWO_SUM = `
Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Constraints:
2 <= nums.length <= 10000
`;

const HACKERRANK = `
Complete the simpleArraySum function below.

Input Format
The first line contains an integer n.
The second line contains n space-separated integers.

Sample Input 0
6
1 2 3 4 10 11
Sample Output 0
31

Explanation 0
The sum is 31.
`;

const SOLUTION_CLASS = `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
`;

describe('parseCallExamples — LeetCode shape', () => {
  it('recovers both examples with named args stripped', () => {
    const ex = parseCallExamples(TWO_SUM);
    expect(ex).toHaveLength(2);
    expect(ex[0].args).toEqual([
      { t: 'list', v: [{ t: 'num', v: '2' }, { t: 'num', v: '7' }, { t: 'num', v: '11' }, { t: 'num', v: '15' }] },
      { t: 'num', v: '9' },
    ]);
  });

  it('parses the stated Output into a value', () => {
    const ex = parseCallExamples(TWO_SUM);
    expect(ex[0].expected).toEqual({ t: 'list', v: [{ t: 'num', v: '0' }, { t: 'num', v: '1' }] });
  });

  it('accepts a bare value with no parameter name', () => {
    const ex = parseCallExamples('Input: [1,2,3]\nOutput: 6');
    expect(ex).toHaveLength(1);
    expect(ex[0].args).toHaveLength(1);
  });

  it('handles quoted strings and booleans', () => {
    const ex = parseCallExamples('Input: s = "aab", flag = true\nOutput: false');
    expect(ex[0].args).toEqual([{ t: 'str', v: 'aab' }, { t: 'bool', v: true }]);
    expect(ex[0].expected).toEqual({ t: 'bool', v: false });
  });

  it('does not split on a comma inside a nested list', () => {
    const ex = parseCallExamples('Input: grid = [[1,2],[3,4]], k = 2\nOutput: 4');
    expect(ex[0].args).toHaveLength(2);
  });

  it('SKIPS an example it cannot parse rather than guessing', () => {
    // A TreeNode literal is not something this parser understands.
    expect(parseCallExamples('Input: root = [1,null,2,{x}]\nOutput: 3')).toHaveLength(0);
  });
});

describe('parseStdinExamples — HackerRank shape', () => {
  it('takes the sample block verbatim as stdin', () => {
    const ex = parseStdinExamples(HACKERRANK);
    expect(ex).toHaveLength(1);
    expect(ex[0].stdin).toBe('6\n1 2 3 4 10 11');
    expect(ex[0].expected).toBe('31');
  });

  it('stops the expected block at Explanation', () => {
    expect(parseStdinExamples(HACKERRANK)[0].expected).not.toMatch(/sum is/);
  });
});

describe('parseProblemExamples — routing', () => {
  it('prefers the Sample Input block when a statement carries both shapes', () => {
    const both = HACKERRANK + '\nInput: n = 3\nOutput: 6\n';
    const ex = parseProblemExamples(both);
    expect(ex[0].kind).toBe('stdin');
  });

  it('returns nothing for a statement with no worked example', () => {
    expect(parseProblemExamples('Reverse a linked list in place.')).toEqual([]);
  });
});

describe('detectSolutionFn', () => {
  it('finds a class Solution method and reports it needs an instance', () => {
    const fn = detectSolutionFn(SOLUTION_CLASS, 2);
    expect(fn).toEqual({ name: 'twoSum', arity: 2, isMethod: true });
  });

  it('finds a top-level def', () => {
    expect(detectSolutionFn('def simpleArraySum(ar):\n    return sum(ar)', 1))
      .toEqual({ name: 'simpleArraySum', arity: 1, isMethod: false });
  });

  it('picks the def whose arity matches the example, not merely the first', () => {
    const code = 'def helper(a):\n    return a\n\ndef solve(a, b):\n    return a + b\n';
    expect(detectSolutionFn(code, 2)?.name).toBe('solve');
  });

  it('ignores a nested helper', () => {
    const code = 'def outer(a):\n    def inner(b, c):\n        return b\n    return a\n';
    expect(detectSolutionFn(code, 1)?.name).toBe('outer');
  });
});

describe('buildTestCases — the runnable output', () => {
  it('emits a print() call, which is what the old extractor never did', () => {
    const cases = buildTestCases(parseProblemExamples(TWO_SUM), { code: SOLUTION_CLASS, language: 'python' });
    expect(cases[0].input).toBe('print(Solution().twoSum([2, 7, 11, 15], 9))');
  });

  it('normalises expected to what print() ACTUALLY writes, spaces and all', () => {
    const cases = buildTestCases(parseProblemExamples(TWO_SUM), { code: SOLUTION_CLASS, language: 'python' });
    // The statement writes [0,1]; Python prints [0, 1]. Comparing against the
    // statement's spacing is what made correct solutions look wrong.
    expect(cases[0].expected).toBe('[0, 1]');
  });

  it('prints a bare string without quotes but keeps them inside a list', () => {
    const strOut = buildTestCases(parseCallExamples('Input: s = "ab"\nOutput: "ba"'), {
      code: 'def rev(s):\n    return s[::-1]',
      language: 'python',
    });
    expect(strOut[0].expected).toBe('ba');

    const listOut = buildTestCases(parseCallExamples('Input: s = "ab"\nOutput: ["a","b"]'), {
      code: 'def split(s):\n    return list(s)',
      language: 'python',
    });
    expect(listOut[0].expected).toBe("['a', 'b']");
  });

  it('passes stdin examples through untouched', () => {
    const cases = buildTestCases(parseProblemExamples(HACKERRANK), { code: '', language: 'python' });
    expect(cases).toEqual([{ input: '6\n1 2 3 4 10 11', expected: '31' }]);
  });

  it('emits nothing for a call example when no code exists yet', () => {
    expect(buildTestCases(parseProblemExamples(TWO_SUM), { code: '', language: 'python' })).toEqual([]);
  });

  it('skips call synthesis for a non-Python language rather than emitting Python', () => {
    const cases = buildTestCases(parseProblemExamples(TWO_SUM), { code: SOLUTION_CLASS, language: 'java' });
    expect(cases).toEqual([]);
  });

  it('keeps the raw Output when it cannot be parsed, so the run still shows a diff', () => {
    const ex = parseCallExamples('Input: n = 3\nOutput: 1 -> 2 -> 3');
    const cases = buildTestCases(ex, { code: 'def build(n):\n    return n', language: 'python' });
    expect(cases[0].expected).toBe('1 -> 2 -> 3');
  });
});

describe('mergeTestCases', () => {
  it('puts problem examples first and appends only new generated cases', () => {
    const merged = mergeTestCases(
      [{ input: 'print(f(1))', expected: '1' }],
      [{ input: 'print(f(1))', expected: '1' }, { input: 'print(f([]))', expected: '0' }],
    );
    expect(merged).toEqual([
      { input: 'print(f(1))', expected: '1' },
      { input: 'print(f([]))', expected: '0' },
    ]);
  });

  it('respects the cap', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ input: `print(f(${i}))`, expected: `${i}` }));
    expect(mergeTestCases([], many, 10)).toHaveLength(10);
  });
});
