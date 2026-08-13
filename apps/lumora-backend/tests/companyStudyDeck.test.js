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
  it('maps the active company to its sources, case-insensitively', async () => {
    const { studySourcesForCompany } = await import('../src/services/modeSourceFilter.js');
    // Real workspace names are free text. The live one was 'Nvidia-DevTools',
    // which an exact-equality lookup missed — silently, with no error and no
    // empty result anyone would notice, just answers quietly missing the deck.
    for (const name of ['NVIDIA', 'nvidia', ' Nvidia ', 'Nvidia-DevTools', 'NVIDIA GFN', 'nvidia_gfn_platform']) {
      expect(studySourcesForCompany(name, 'general')).toEqual(
        ['capra-nvidia-gfn', 'capra-nvidia-gfn-personal'],
      );
    }
    expect(studySourcesForCompany('Google', 'general')).toEqual([]);
    expect(studySourcesForCompany(null, 'general')).toEqual([]);
    expect(studySourcesForCompany('', 'general')).toEqual([]);
    expect(studySourcesForCompany('---', 'general')).toEqual([]);
  });

  it('behavioral gets the personal source and NOT the technical deck', async () => {
    const { studySourcesForCompany } = await import('../src/services/modeSourceFilter.js');
    // The split is by whose voice the content is in. Personal = the candidate's
    // own career, metrics and reasons, already first-person — exactly what a
    // behavioral answer should ground on. The technical deck describes NVIDIA's
    // systems and would be narrated as his own job history.
    expect(studySourcesForCompany('Nvidia-DevTools', 'behavioral')).toEqual(['capra-nvidia-gfn-personal']);
    expect(studySourcesForCompany('NVIDIA', 'behavioral')).not.toContain('capra-nvidia-gfn');
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
