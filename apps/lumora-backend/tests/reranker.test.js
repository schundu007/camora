import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  delete process.env.COHERE_API_KEY;
  vi.resetModules();
});

describe('rerank', () => {
  it('passes chunks through unchanged when COHERE_API_KEY is missing', async () => {
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a', content: 'A' }, { id: 'b', content: 'B' }];
    const out = await rerank('q', chunks, 2);
    expect(out).toEqual(chunks);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reorders chunks by Cohere relevance scores when key is set', async () => {
    process.env.COHERE_API_KEY = 'test';
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.6 },
        ],
      }),
    });
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a', content: 'A' }, { id: 'b', content: 'B' }];
    const out = await rerank('q', chunks, 2);
    expect(out[0].id).toBe('b');
    expect(out[1].id).toBe('a');
    expect(out[0].rerankScore).toBeCloseTo(0.9);
  });

  it('truncates to topK', async () => {
    process.env.COHERE_API_KEY = 'test';
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { index: 0, relevance_score: 0.9 },
          { index: 1, relevance_score: 0.8 },
          { index: 2, relevance_score: 0.7 },
        ],
      }),
    });
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }].map((c, i) => ({ ...c, content: 'x' + i }));
    const out = await rerank('q', chunks, 2);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('a');
    expect(out[1].id).toBe('b');
  });

  it('falls back to original order on Cohere API error', async () => {
    process.env.COHERE_API_KEY = 'test';
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') });
    const { rerank } = await import('../src/services/reranker.js');
    const chunks = [{ id: 'a' }, { id: 'b' }].map((c, i) => ({ ...c, content: 'x' + i }));
    const out = await rerank('q', chunks, 2);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
