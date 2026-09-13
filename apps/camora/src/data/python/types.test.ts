import { describe, it, expect } from 'vitest';
import { CHAPTERS, CHAPTER_IDS } from './types';

describe('CHAPTERS', () => {
  it('declares seven chapters in curriculum order', () => {
    expect(CHAPTERS.map(c => c.id)).toEqual([
      'getting-started',
      'functions',
      'data-structures',
      'oop',
      'errors-files',
      'stdlib',
      'advanced',
    ]);
  });

  it('gives every chapter a label and an accent token', () => {
    for (const c of CHAPTERS) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.accent).toMatch(/^var\(--/);
    }
  });

  it('exposes CHAPTER_IDS as a lookup set matching CHAPTERS', () => {
    expect(CHAPTER_IDS.size).toBe(CHAPTERS.length);
    for (const c of CHAPTERS) expect(CHAPTER_IDS.has(c.id)).toBe(true);
  });
});
