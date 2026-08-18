import { describe, it, expect } from 'vitest';
import { normalizeTestInput, normalizeExamples } from './test-input';

describe('normalizeTestInput', () => {
  // The exact strings that have been failing runs.
  it('unwraps print(Solution().method(args))', () => {
    expect(normalizeTestInput("print(Solution().minWindow('ADOBECODEBANC', 'ABC'))"))
      .toBe("'ADOBECODEBANC', 'ABC'");
    expect(normalizeTestInput('print(Solution().reverseList([1, 2, 3, 4, 5]))'))
      .toBe('[1, 2, 3, 4, 5]');
  });

  it('unwraps a bare solution call and a nested print', () => {
    expect(normalizeTestInput('Solution().trap([0,1,0,2])')).toBe('[0,1,0,2]');
    expect(normalizeTestInput('print(is_leap(2000))')).toBe('2000');
  });

  it('unwraps new Solution().method(...)', () => {
    expect(normalizeTestInput('new Solution().twoSum([2,7,11,15], 9)')).toBe('[2,7,11,15], 9');
  });

  // Everything legitimate must pass through untouched.
  it('leaves raw stdin alone', () => {
    expect(normalizeTestInput('2000')).toBe('2000');
    expect(normalizeTestInput('3\n1 2 3')).toBe('3\n1 2 3');
  });

  it('leaves argument text and JSON alone', () => {
    expect(normalizeTestInput('nums = [2,7,11,15], target = 9')).toBe('nums = [2,7,11,15], target = 9');
    expect(normalizeTestInput('[1,2,3]')).toBe('[1,2,3]');
    expect(normalizeTestInput('"ADOBECODEBANC", "ABC"')).toBe('"ADOBECODEBANC", "ABC"');
  });

  // Not a single wrapped call — the trailing paren does not close the first.
  it('does not peel an expression that merely ends in a paren', () => {
    expect(normalizeTestInput('f(1) + g(2)')).toBe('f(1) + g(2)');
  });

  it('handles empty and non-string input', () => {
    expect(normalizeTestInput('')).toBe('');
    expect(normalizeTestInput(undefined)).toBe('');
    expect(normalizeTestInput(42 as any)).toBe('');
  });
});

describe('normalizeExamples', () => {
  it('cleans inputs and trims expected across the array', () => {
    expect(normalizeExamples([
      { input: 'print(Solution().trap([0,1,0,2]))', expected: ' 1 ' },
      { input: '2000', expected: 'True' },
    ])).toEqual([
      { input: '[0,1,0,2]', expected: '1' },
      { input: '2000', expected: 'True' },
    ]);
  });

  it('survives a missing or malformed examples array', () => {
    expect(normalizeExamples(undefined as any)).toEqual([]);
  });
});
