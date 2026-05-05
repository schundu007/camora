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
