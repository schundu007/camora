import { describe, it, expect, vi, beforeEach } from 'vitest';

const indexWatchlistRootMock = vi.fn();
vi.mock('../src/services/webIndexer.js', () => ({
  indexWatchlistRoot: indexWatchlistRootMock,
  // Keep indexWatchlistUrl exported in case any other test imports use it
  indexWatchlistUrl: vi.fn(),
}));

beforeEach(() => {
  indexWatchlistRootMock.mockReset();
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
    expect(indexWatchlistRootMock).not.toHaveBeenCalled();
  });

  it('runs indexWatchlistRoot for each resolved entry', async () => {
    indexWatchlistRootMock.mockResolvedValue({
      totalChunks: 5,
      totalWritten: 5,
      urlCount: 3,
      perUrl: [
        { url: 'https://stripe.com/blog/', chunkCount: 2 },
        { url: 'https://stripe.com/blog/a', chunkCount: 2 },
        { url: 'https://stripe.com/blog/b', chunkCount: 1 },
      ],
    });
    const { buildWebWatchlist } = await import('../src/services/webWatchlist.js');
    const r = await buildWebWatchlist({ userId: 42, prepData: { activeCompany: 'Stripe' } });
    expect(r.skipped).toBeFalsy();
    expect(indexWatchlistRootMock).toHaveBeenCalled();
    const args = indexWatchlistRootMock.mock.calls[0][0];
    expect(args.source).toBe('Stripe');
    expect(args.rootUrl).toMatch(/^https:\/\//);
    expect(args.maxArticles).toBe(5);
  });

  it('aggregates chunk counts across entries', async () => {
    let n = 0;
    indexWatchlistRootMock.mockImplementation(() => {
      n++;
      return Promise.resolve({
        totalChunks: n,
        totalWritten: n,
        urlCount: 1,
        perUrl: [{ url: 'https://stripe.com/blog/', chunkCount: n }],
      });
    });
    const { buildWebWatchlist } = await import('../src/services/webWatchlist.js');
    const r = await buildWebWatchlist({ userId: 7, prepData: { activeCompany: 'Stripe' } });
    // Stripe now has both eng + docs entries so indexWatchlistRoot is called twice.
    // totalChunks = sum of per-call return values (1 + 2 = 3 when n ends at 2).
    const expectedTotal = (n * (n + 1)) / 2;
    expect(r.totalChunks).toBe(expectedTotal);
  });
});

describe('resolveWatchlist with docs URL', () => {
  it('returns 2 entries when company has both eng and docs', async () => {
    const { resolveWatchlist } = await import('../src/services/webWatchlist.js');
    // Stripe has both eng and docs in COMPANY_SOURCES
    const r = resolveWatchlist({ activeCompany: 'Stripe' });
    expect(r.length).toBeGreaterThanOrEqual(2);
    const labels = r.map((e) => e.label);
    expect(labels.some((l) => /Blog/.test(l))).toBe(true);
    expect(labels.some((l) => /Docs/.test(l))).toBe(true);
    for (const e of r) {
      expect(e.source).toBe('Stripe');
      expect(e.url).toMatch(/^https:\/\//);
    }
  });

  it('returns 1 entry when company has only eng (no docs)', async () => {
    const { resolveWatchlist } = await import('../src/services/webWatchlist.js');
    // Tesla has eng but no docs field in COMPANY_SOURCES
    const r = resolveWatchlist({ activeCompany: 'Tesla' });
    expect(r.length).toBe(1);
    expect(r[0].label).toMatch(/Blog/);
  });
});
