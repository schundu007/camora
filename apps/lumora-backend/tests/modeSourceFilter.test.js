import { describe, it, expect } from 'vitest';
import { sourcesForMode, KNOWN_MODES } from '../src/services/modeSourceFilter.js';

describe('sourcesForMode', () => {
  it('returns null for general mode (no filter, full hybrid search)', () => {
    expect(sourcesForMode('general')).toBeNull();
  });

  it('returns null for unknown mode (fail-open: never starve retrieval)', () => {
    expect(sourcesForMode('made-up')).toBeNull();
    expect(sourcesForMode(undefined)).toBeNull();
    expect(sourcesForMode(null)).toBeNull();
  });

  it('coding mode covers algorithm topics + LeetCode + LLD problems', () => {
    const s = sourcesForMode('coding');
    expect(s).toEqual(expect.arrayContaining([
      'capra-coding', 'capra-coding-problems', 'capra-lld', 'capra-lld-problems',
    ]));
  });

  it('design mode covers system design topics + SD problems + microservices + scalable + eng blogs', () => {
    const s = sourcesForMode('design');
    expect(s).toEqual(expect.arrayContaining([
      'capra-system-design', 'capra-sd-problems',
      'capra-microservices', 'capra-scalable',
      'capra-eng-blogs',
    ]));
  });

  it('sql mode covers SQL topics + SQL problems + database', () => {
    const s = sourcesForMode('sql');
    expect(s).toEqual(expect.arrayContaining([
      'capra-sql', 'capra-sql-problems', 'capra-database',
    ]));
  });

  it('behavioral mode covers behavioral + projects', () => {
    const s = sourcesForMode('behavioral');
    expect(s).toEqual(expect.arrayContaining([
      'capra-behavioral', 'capra-projects',
    ]));
  });

  it('KNOWN_MODES enumerates exactly the gated modes (general not included)', () => {
    expect(KNOWN_MODES).toEqual(expect.arrayContaining(['coding', 'design', 'sql', 'behavioral']));
    expect(KNOWN_MODES).not.toContain('general');
  });

  it('every mode source list contains only valid Capra source slugs (capra-* prefix)', () => {
    for (const mode of KNOWN_MODES) {
      const sources = sourcesForMode(mode);
      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBeGreaterThan(0);
      for (const src of sources) {
        expect(src).toMatch(/^capra-/);
      }
    }
  });
});
