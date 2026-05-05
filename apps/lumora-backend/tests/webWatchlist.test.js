import { describe, it, expect, vi, beforeEach } from 'vitest';

const indexWatchlistUrlMock = vi.fn();
vi.mock('../src/services/webIndexer.js', () => ({ indexWatchlistUrl: indexWatchlistUrlMock }));

beforeEach(() => {
  indexWatchlistUrlMock.mockReset();
  vi.resetModules();
});

describe('resolveWatchlist', () => {
  it('returns the eng URL for a known company', async () => {
    const { resolveWatchlist } = await import('../src/services/webWatchlist.js');
    const r = resolveWatchlist({ activeCompany: 'Stripe' });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].url).toMatch(/^https:\/\//);
    expect(r[0].source).toBe('Stripe');
    expect(r[0].label).toMatch(/Stripe/i);
  });

  it('returns empty when company is unknown', async () => {
    const { resolveWatchlist } = await import('../src/services/webWatchlist.js');
    expect(resolveWatchlist({ activeCompany: 'NotARealCompanyXYZ' })).toEqual([]);
  });

  it('returns empty when activeCompany is missing', async () => {
    const { resolveWatchlist } = await import('../src/services/webWatchlist.js');
    expect(resolveWatchlist({})).toEqual([]);
    expect(resolveWatchlist(null)).toEqual([]);
  });

  it('returns empty when company has no eng URL (e.g., TikTok)', async () => {
    const { resolveWatchlist } = await import('../src/services/webWatchlist.js');
    // TikTok has eng: null in COMPANY_SOURCES
    const r = resolveWatchlist({ activeCompany: 'TikTok' });
    expect(r).toEqual([]);
  });
});

describe('buildWebWatchlist', () => {
  it('skips when prepData has no activeCompany', async () => {
    const { buildWebWatchlist } = await import('../src/services/webWatchlist.js');
    const r = await buildWebWatchlist({ userId: 1, prepData: null });
    expect(r.skipped).toBe(true);
    expect(indexWatchlistUrlMock).not.toHaveBeenCalled();
  });

  it('runs indexWatchlistUrl for each resolved entry', async () => {
    indexWatchlistUrlMock.mockResolvedValue({ chunkCount: 5, written: 5 });
    const { buildWebWatchlist } = await import('../src/services/webWatchlist.js');
    const r = await buildWebWatchlist({ userId: 42, prepData: { activeCompany: 'Stripe' } });
    expect(r.skipped).toBeFalsy();
    expect(indexWatchlistUrlMock).toHaveBeenCalled();
    const args = indexWatchlistUrlMock.mock.calls[0][0];
    expect(args.source).toBe('Stripe');
    expect(args.url).toMatch(/^https:\/\//);
  });

  it('aggregates chunk counts across entries', async () => {
    let n = 0;
    indexWatchlistUrlMock.mockImplementation(() => Promise.resolve({ chunkCount: ++n, written: n }));
    const { buildWebWatchlist } = await import('../src/services/webWatchlist.js');
    const r = await buildWebWatchlist({ userId: 7, prepData: { activeCompany: 'Stripe' } });
    expect(r.totalChunks).toBe(n);
  });
});
