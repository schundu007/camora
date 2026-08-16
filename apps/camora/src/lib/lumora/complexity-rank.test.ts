import { describe, it, expect } from 'vitest';
import { scoreComplexity, rankApproaches } from './complexity-rank';

describe('scoreComplexity', () => {
  it('orders the standard classes', () => {
    const ordered = ['O(1)', 'O(log n)', 'O(sqrt(n))', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)', 'O(n!)'];
    const scores = ordered.map(s => scoreComplexity(s)!);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(new Set(scores).size).toBe(scores.length);
  });

  // The trailing n belongs to the log, not to a second factor — counting it
  // would score O(n log n) as quadratic and badge the wrong approach as best.
  it('does not read the log argument as another factor', () => {
    expect(scoreComplexity('O(n log n)')).toBeLessThan(scoreComplexity('O(n^2)')!);
    expect(scoreComplexity('O(n log n)')).toBeGreaterThan(scoreComplexity('O(n)')!);
  });

  it('treats a variable exponent as exponential and a digit exponent as polynomial', () => {
    expect(scoreComplexity('O(2^n)')).toBeGreaterThan(scoreComplexity('O(n^3)')!);
    expect(scoreComplexity('O(k^n)')).toBe(scoreComplexity('O(2^n)'));
  });

  it('is dominated by the largest additive term, so O(V + E) is linear', () => {
    expect(scoreComplexity('O(V + E)')).toBe(scoreComplexity('O(n)'));
    expect(scoreComplexity('O(n + m log m)')).toBe(scoreComplexity('O(n log n)'));
  });

  it('multiplies factors within a term', () => {
    expect(scoreComplexity('O(n * m)')).toBe(scoreComplexity('O(n^2)'));
    expect(scoreComplexity('O(n·k)')).toBe(scoreComplexity('O(n^2)'));
  });

  it('counts repeated logs', () => {
    expect(scoreComplexity('O(n log^2 n)')).toBeGreaterThan(scoreComplexity('O(n log n)')!);
    expect(scoreComplexity('O(n log^2 n)')).toBeLessThan(scoreComplexity('O(n^2)')!);
  });

  it('ignores qualifiers the model likes to prepend', () => {
    expect(scoreComplexity('amortized O(1)')).toBe(scoreComplexity('O(1)'));
    expect(scoreComplexity('O(1) auxiliary')).toBe(0);
  });

  it('returns null for anything it cannot read as a bound', () => {
    expect(scoreComplexity(undefined)).toBeNull();
    expect(scoreComplexity('')).toBeNull();
    expect(scoreComplexity('   ')).toBeNull();
  });
});

describe('rankApproaches', () => {
  it('picks the best and the baseline by time', () => {
    expect(rankApproaches([
      { time: 'O(n^2)', space: 'O(1)' },
      { time: 'O(n log n)', space: 'O(n)' },
      { time: 'O(n)', space: 'O(n)' },
    ])).toEqual({ bestIdx: 2, worstIdx: 0 });
  });

  // The prompt asks for brute force → optimal, and mostly complies. A badge
  // that trusted the ordering would be wrong exactly when it matters.
  it('does not assume the last solution is the best', () => {
    expect(rankApproaches([
      { time: 'O(n)', space: 'O(n)' },
      { time: 'O(n^2)', space: 'O(1)' },
    ]).bestIdx).toBe(0);
  });

  it('breaks a time tie on space', () => {
    expect(rankApproaches([
      { time: 'O(n)', space: 'O(n)' },
      { time: 'O(n)', space: 'O(1)' },
    ])).toEqual({ bestIdx: 1, worstIdx: 0 });
  });

  it('badges nothing when every approach scores the same', () => {
    expect(rankApproaches([
      { time: 'O(n)', space: 'O(1)' },
      { time: 'O(n)', space: 'O(1)' },
    ])).toEqual({ bestIdx: null, worstIdx: null });
  });

  it('badges nothing when the bounds are unreadable', () => {
    expect(rankApproaches([{ time: '' }, { time: undefined }])).toEqual({ bestIdx: null, worstIdx: null });
  });
});
