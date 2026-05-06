import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const embedQueryMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedQuery: embedQueryMock }));

beforeEach(() => {
  queryMock.mockReset();
  embedQueryMock.mockReset();
});

describe('hybridSearchKb', () => {
  it('merges vector + BM25 results via reciprocal rank fusion', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) => {
      if (sql.includes('embedding <=>')) {
        return Promise.resolve({
          rows: [
            { id: 'A', source: 'capra-sre', topic_id: 't1', topic_title: 'T1', section: 's', content: 'a', distance: 0.1 },
            { id: 'B', source: 'capra-sre', topic_id: 't2', topic_title: 'T2', section: 's', content: 'b', distance: 0.2 },
            { id: 'C', source: 'capra-sre', topic_id: 't3', topic_title: 'T3', section: 's', content: 'c', distance: 0.3 },
          ],
        });
      }
      return Promise.resolve({
        rows: [
          { id: 'C', source: 'capra-sre', topic_id: 't3', topic_title: 'T3', section: 's', content: 'c', ts_rank: 0.5 },
          { id: 'D', source: 'capra-sre', topic_id: 't4', topic_title: 'T4', section: 's', content: 'd', ts_rank: 0.4 },
        ],
      });
    });
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchKb('q', 4);
    const ids = r.map((c) => c.id);
    // C appears in both lists → highest fused score; A and B from vector only;
    // D from BM25 only. Top-4 should include C first, then a mix.
    expect(ids[0]).toBe('C');
    expect(ids).toContain('A');
    expect(ids).toContain('D');
    expect(ids.length).toBe(4);
    expect(r[0].rrfScore).toBeGreaterThan(r[1].rrfScore);
  });

  it('carries url from metadata column when present (web-watchlist chunks)', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) =>
      sql.includes('embedding <=>')
        ? Promise.resolve({ rows: [
            { id: 'W', source: 'stripe', topic_id: 't', topic_title: 'T', section: 's', content: 'c', distance: 0.1, url: 'https://stripe.com/blog/x' },
          ] })
        : Promise.resolve({ rows: [] }),
    );
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchKb('q', 4);
    expect(r[0].url).toBe('https://stripe.com/blog/x');
    // SELECT must request metadata->>'url' so column is available
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toMatch(/metadata->>'url'/);
  });

  it('sets url to null when metadata has no url (legacy KB chunks)', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) =>
      sql.includes('embedding <=>')
        ? Promise.resolve({ rows: [
            { id: 'K', source: 'aws', topic_id: 't', topic_title: 'T', section: 's', content: 'c', distance: 0.1, url: null },
          ] })
        : Promise.resolve({ rows: [] }),
    );
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchKb('q', 4);
    expect(r[0].url).toBeNull();
  });

  it('returns vector-only results when BM25 returns empty', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) =>
      sql.includes('embedding <=>')
        ? Promise.resolve({ rows: [
            { id: 'A', source: 'x', topic_id: 't1', topic_title: 'T1', section: 's', content: 'a', distance: 0.1 },
          ] })
        : Promise.resolve({ rows: [] }),
    );
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchKb('q', 4);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('A');
  });
});

describe('hybridSearchKb sourceFilter', () => {
  it('passes sourceFilter into both vec and bm25 SQL when present', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockResolvedValue({ rows: [] });
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    await hybridSearchKb('q', 4, { sourceFilter: ['capra-coding', 'capra-coding-problems'] });
    const sqls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqls.some((s) => s.includes('embedding <=>') && s.includes('source = ANY'))).toBe(true);
    expect(sqls.some((s) => s.includes('content_tsv @@') && s.includes('source = ANY'))).toBe(true);
    // The filter array must be threaded as a bound parameter (not inlined)
    const params = queryMock.mock.calls.flatMap((c) => c[1]);
    expect(params).toEqual(expect.arrayContaining([['capra-coding', 'capra-coding-problems']]));
  });

  it('omits the source = ANY clause when sourceFilter is null', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockResolvedValue({ rows: [] });
    const { hybridSearchKb } = await import('../src/services/hybridRetrieval.js');
    await hybridSearchKb('q', 4);
    const sqls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqls.every((s) => !s.includes('source = ANY'))).toBe(true);
  });
});

describe('hybridSearchUserDocs', () => {
  it('always filters by user_id and merges vector + BM25', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) =>
      sql.includes('embedding <=>')
        ? Promise.resolve({ rows: [
            { id: 'U1', doc_kind: 'jd', section: 'body', content: 'a', distance: 0.1 },
          ] })
        : Promise.resolve({ rows: [
            { id: 'U2', doc_kind: 'resume', section: 'body', content: 'b', ts_rank: 0.3 },
          ] }),
    );
    const { hybridSearchUserDocs } = await import('../src/services/hybridRetrieval.js');
    const r = await hybridSearchUserDocs(7, 'q', 4);
    const userIdParams = queryMock.mock.calls.map((c) => c[1][0]);
    expect(userIdParams.every((p) => p === 7)).toBe(true);
    expect(r.length).toBe(2);
  });
});
