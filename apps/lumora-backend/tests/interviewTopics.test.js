import { describe, it, expect } from 'vitest';
import { SECTIONS, SECTION_NAMES, matchLessons, isKnownSection } from '../src/lib/interviewTopics.js';

// "What to review" has to point at lessons that exist. The model names concepts in
// its own words and this maps them onto the real curriculum, so a suggestion is
// never something the model merely remembered.

describe('curriculum', () => {
  it('holds the twelve course sections', () => {
    expect(SECTION_NAMES).toHaveLength(12);
    expect(SECTION_NAMES).toContain('Dynamic Prog.');
    expect(SECTION_NAMES).toContain('Priority Queue / Heap');
  });

  it('has lessons under every section', () => {
    for (const [name, lessons] of Object.entries(SECTIONS)) {
      expect(lessons.length, name).toBeGreaterThan(0);
    }
    expect(Object.values(SECTIONS).flat()).toHaveLength(285);
  });

  it('recognises only real section names', () => {
    expect(isKnownSection('Graph')).toBe(true);
    expect(isKnownSection('Graphs')).toBe(false);
    expect(isKnownSection('')).toBe(false);
  });
});

describe('matchLessons', () => {
  it('resolves a named concept to its lesson and section', () => {
    expect(matchLessons(['number of islands'])).toContainEqual({
      section: 'Graph', lesson: 'Number of Islands',
    });
  });

  it('matches on wording that is close but not exact', () => {
    const hits = matchLessons(['monotonic stack']);
    expect(hits.some(h => h.lesson.includes('Monotonic Stack'))).toBe(true);
  });

  // A single generic word overlaps half the curriculum; pulling in five unrelated
  // lessons would make the card noise rather than a study list.
  it('refuses to match on one generic word', () => {
    expect(matchLessons(['array'])).toEqual([]);
    expect(matchLessons(['problem'])).toEqual([]);
  });

  it('caps how many lessons it returns', () => {
    expect(matchLessons(['binary search tree traversal sorting graph'], 3).length).toBeLessThanOrEqual(3);
  });

  it('deduplicates across several concepts naming the same lesson', () => {
    const hits = matchLessons(['number of islands', 'islands number']);
    const keys = hits.map(h => `${h.section}|${h.lesson}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('handles empty and junk input without throwing', () => {
    expect(matchLessons([])).toEqual([]);
    expect(matchLessons(['', '   '])).toEqual([]);
    expect(matchLessons('sliding window').length).toBeGreaterThan(0);
  });
});
