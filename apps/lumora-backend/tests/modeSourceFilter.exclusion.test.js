import { describe, it, expect } from 'vitest';
import {
  sourcesForMode,
  excludedSourcesForMode,
  STUDY_ONLY_SOURCES,
} from '../src/services/modeSourceFilter.js';

describe('company-specific study decks never leak into unfiltered search', () => {
  // A candidate who INTERVIEWED at AMD is not an AMD employee. The AMD ROCm/CI
  // deck is study material; grounding a personal answer on it made Sona report
  // it as the candidate's job and pulled every question toward CI/CD.
  it('excludes study-only sources in general mode', () => {
    expect(sourcesForMode('general')).toBeNull();
    expect(excludedSourcesForMode('general')).toContain('capra-nvidia-gfn');
  });

  it('excludes study-only sources when mode is absent entirely', () => {
    expect(excludedSourcesForMode(undefined)).toContain('capra-nvidia-gfn');
    expect(excludedSourcesForMode(null)).toContain('capra-nvidia-gfn');
  });

  it('excludes study-only sources for an unknown mode (fail-open to general)', () => {
    expect(excludedSourcesForMode('nonsense-typo')).toContain('capra-nvidia-gfn');
  });

  it('needs no exclusion when an allow-list already exists', () => {
    // An allow-list cannot reach a source it does not name.
    expect(excludedSourcesForMode('coding')).toEqual([]);
    expect(excludedSourcesForMode('design')).toEqual([]);
    expect(excludedSourcesForMode('behavioral')).toEqual([]);
  });

  it('still reaches the deck through its own explicit mode', () => {
    expect(sourcesForMode('nvidia-gfn')).toContain('capra-nvidia-gfn');
  });

  it('keeps no study-only source inside any general-purpose mode', () => {
    for (const mode of ['coding', 'design', 'sql', 'behavioral', 'sre']) {
      const sources = sourcesForMode(mode) || [];
      for (const banned of STUDY_ONLY_SOURCES) {
        expect(sources, `${mode} must not include ${banned}`).not.toContain(banned);
      }
    }
  });
});

describe('behavioral grounds ONLY on the candidate, not the generic KB', () => {
  it('returns an empty allow-list, which is not the same as no filter', () => {
    const sources = sourcesForMode('behavioral');
    expect(Array.isArray(sources)).toBe(true);
    expect(sources).toHaveLength(0);
    // The distinction that broke: [] means "nothing", null means "everything".
    expect(sources).not.toBeNull();
  });
});

describe('excludedDocKindsForMode', () => {
  it('withholds pasted study material from behavioral answers only', async () => {
    const { excludedDocKindsForMode } = await import('../src/services/modeSourceFilter.js');
    // Behavioral must ground on the candidate's own history. A company's
    // interview kit pasted into Study Materials is third-person writing about
    // that company; grounding "tell me about a time you..." on it makes the
    // model report their architecture as the candidate's own job.
    expect(excludedDocKindsForMode('behavioral')).toEqual(['study_doc']);
    // Every other mode wants it — that is the point of pasting a kit in.
    for (const mode of ['coding', 'design', 'sql', 'sre', 'general', undefined]) {
      expect(excludedDocKindsForMode(mode)).toEqual([]);
    }
  });

  it('keeps the NVIDIA GFN deck out of unfiltered search', async () => {
    const { STUDY_ONLY_SOURCES, excludedSourcesForMode } = await import('../src/services/modeSourceFilter.js');
    expect(STUDY_ONLY_SOURCES).toContain('capra-nvidia-gfn');
    expect(excludedSourcesForMode('general')).toContain('capra-nvidia-gfn');
  });
});
