import { describe, it, expect } from 'vitest';
import { similarity, isDuplicate } from './dedup.js';

const mockState = {
  importedCodeIds: ['100', '200'],
  importedMcqIds: ['50'],
};

const existingProblems = {
  'two-sum': { slug: 'two-sum', coderpadId: '100', title: 'Two Sum' },
  'longest-substring-without-repeating-characters': {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
  },
};

describe('similarity', () => {
  it('identical strings score 1', () => expect(similarity('hello', 'hello')).toBe(1));
  it('completely different strings score < 0.5', () => expect(similarity('abc', 'xyz')).toBeLessThan(0.5));
  it('is case-insensitive', () => expect(similarity('Hello', 'hello')).toBe(1));
  it('near-identical strings score >= 0.85', () => {
    expect(
      similarity(
        'Longest Substring Without Repeating Characters',
        'Longest Substring Without Repeating Chars'
      )
    ).toBeGreaterThanOrEqual(0.85);
  });
});

describe('isDuplicate', () => {
  it('detects CoderPad ID in state', () => {
    const candidate = { coderpadId: '100', title: 'Two Sum', slug: 'two-sum' };
    const r = isDuplicate(candidate, existingProblems, mockState, 'code');
    expect(r.isDupe).toBe(true);
    expect(r.reason).toBe('coderpad-id');
  });

  it('detects slug collision even for new CoderPad ID', () => {
    const candidate = { coderpadId: '999', title: 'Two Sum', slug: 'two-sum' };
    const r = isDuplicate(candidate, existingProblems, mockState, 'code');
    expect(r.isDupe).toBe(true);
    expect(r.reason).toBe('slug');
  });

  it('detects fuzzy title match at 85% threshold', () => {
    const candidate = {
      coderpadId: '999',
      title: 'Longest Substring Without Repeating Chars',
      slug: 'longest-substring-without-repeating-chars',
    };
    const r = isDuplicate(candidate, existingProblems, mockState, 'code');
    expect(r.isDupe).toBe(true);
    expect(r.reason).toBe('fuzzy');
  });

  it('passes a unique question', () => {
    const candidate = { coderpadId: '999', title: 'Binary Search Tree', slug: 'binary-search-tree' };
    const r = isDuplicate(candidate, existingProblems, mockState, 'code');
    expect(r.isDupe).toBe(false);
  });

  it('uses mcq id list when type is mcq', () => {
    const candidate = { coderpadId: '50', title: 'What is a closure?', slug: 'what-is-a-closure' };
    const r = isDuplicate(candidate, {}, mockState, 'mcq');
    expect(r.isDupe).toBe(true);
    expect(r.reason).toBe('coderpad-id');
  });

  it('handles empty existingProblems', () => {
    const candidate = { coderpadId: '888', title: 'Brand New Problem', slug: 'brand-new-problem' };
    const r = isDuplicate(candidate, {}, mockState, 'code');
    expect(r.isDupe).toBe(false);
  });
});
