import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

beforeEach(async () => {
  queryMock.mockReset();
  const { _clearActiveCompanyCache } = await import('../src/services/activeCompany.js');
  _clearActiveCompanyCache();
});

describe('mode validation cannot drift from the mode table', () => {
  it('honours every mode that defines sources, plus general', async () => {
    const { isValidMode, KNOWN_MODES, sourcesForMode } = await import('../src/services/modeSourceFilter.js');
    // The bug this replaces: inference.js kept its own literal list, so a mode
    // defined here but missing there was silently rewritten to 'general' —
    // the one mode a study deck must NOT be reachable from.
    for (const mode of KNOWN_MODES) expect(isValidMode(mode)).toBe(true);
    expect(isValidMode('general')).toBe(true);
    expect(isValidMode('nvidia-gfn')).toBe(true);
    expect(isValidMode('amd-ci')).toBe(false);
    expect(isValidMode('typo')).toBe(false);
    // Anything callable must resolve a filter (null or array), never undefined.
    for (const mode of KNOWN_MODES) {
      const f = sourcesForMode(mode);
      expect(f === null || Array.isArray(f)).toBe(true);
    }
  });
});

describe('company study deck admission', () => {
  it('maps the active company to its deck, case-insensitively', async () => {
    const { studySourceForCompany } = await import('../src/services/modeSourceFilter.js');
    expect(studySourceForCompany('NVIDIA')).toBe('capra-nvidia-gfn');
    expect(studySourceForCompany('nvidia')).toBe('capra-nvidia-gfn');
    expect(studySourceForCompany(' Nvidia ')).toBe('capra-nvidia-gfn');
    expect(studySourceForCompany('Google')).toBeNull();
    expect(studySourceForCompany(null)).toBeNull();
  });

  it('never admits a study deck into behavioral, whatever the company', async () => {
    const { STUDY_DECK_FORBIDDEN_MODES } = await import('../src/services/modeSourceFilter.js');
    // Behavioral grounds on the candidate's own history. A company's deck is
    // third-person writing about THEIR systems; admitting it produces "I work
    // at NVIDIA" for someone who is only interviewing there.
    expect(STUDY_DECK_FORBIDDEN_MODES).toContain('behavioral');
  });

  it('peek is cache-only and never queries — the retrieval path must not await a read', async () => {
    const { peekActiveCompany } = await import('../src/services/activeCompany.js');
    // A cold peek reports a miss and issues NO query. Awaiting a database read
    // inside the 250ms retrieval budget risks losing the race, which costs the
    // answer all of its grounding — far worse than missing the deck once.
    expect(peekActiveCompany(42)).toEqual({ hit: false, company: null });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('primes from a value already in hand, with no query at all', async () => {
    const { primeActiveCompany, peekActiveCompany } = await import('../src/services/activeCompany.js');
    // prep.js has activeCompany in the save payload, so the common path never
    // needs a lookup.
    primeActiveCompany(42, 'NVIDIA');
    expect(peekActiveCompany(42)).toEqual({ hit: true, company: 'NVIDIA' });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('coalesces concurrent refreshes into one query', async () => {
    queryMock.mockResolvedValue({ rows: [{ company: 'NVIDIA' }] });
    const { refreshActiveCompany, peekActiveCompany } = await import('../src/services/activeCompany.js');
    // A burst of questions on a cold cache must not fan out into a query each.
    await Promise.all([refreshActiveCompany(9), refreshActiveCompany(9), refreshActiveCompany(9)]);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(peekActiveCompany(9)).toEqual({ hit: true, company: 'NVIDIA' });
  });

  it('fails soft to no-deck when the lookup errors, and caches the miss', async () => {
    queryMock.mockRejectedValue(new Error('connection reset'));
    const { refreshActiveCompany, peekActiveCompany } = await import('../src/services/activeCompany.js');
    await expect(refreshActiveCompany(42)).resolves.toBeNull();
    // Cached miss: a database outage must not re-query on every question.
    expect(peekActiveCompany(42)).toEqual({ hit: true, company: null });
  });

  it('invalidation forces a re-read after a workspace switch', async () => {
    const { primeActiveCompany, invalidateActiveCompany, peekActiveCompany, refreshActiveCompany } =
      await import('../src/services/activeCompany.js');
    primeActiveCompany(7, 'NVIDIA');
    invalidateActiveCompany(7);
    expect(peekActiveCompany(7).hit).toBe(false);
    queryMock.mockResolvedValue({ rows: [{ company: 'Google' }] });
    await refreshActiveCompany(7);
    expect(peekActiveCompany(7)).toEqual({ hit: true, company: 'Google' });
  });
});
