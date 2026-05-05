import { describe, it, expect, vi, beforeEach } from 'vitest';

const hybridKbMock = vi.fn();
const hybridUserMock = vi.fn();
vi.mock('../src/services/hybridRetrieval.js', () => ({
  hybridSearchKb: hybridKbMock,
  hybridSearchUserDocs: hybridUserMock,
}));

const embedQueryMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedQuery: embedQueryMock }));

beforeEach(() => {
  hybridKbMock.mockReset();
  hybridUserMock.mockReset();
  embedQueryMock.mockReset();
  embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
});

describe('retrieve', () => {
  it('returns chunks from KB and user tiers with metadata, no timeout', async () => {
    hybridKbMock.mockResolvedValue([
      { tier: 'kb', id: 'k1', source: 'capra-sre', topicId: 't1', topicTitle: 'SLI/SLO/SLA', section: 'summary', content: 'An SLO is a target.', rrfScore: 0.05 },
    ]);
    hybridUserMock.mockResolvedValue([
      { tier: 'user', id: 'u1', docKind: 'jd', section: 'body', content: 'JD asks for SRE experience.', rrfScore: 0.04 },
    ]);
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'what is an SLO?', userId: 42 });
    expect(r.chunks.length).toBe(2);
    expect(r.chunks.find((c) => c.tier === 'kb').source).toBe('capra-sre');
    expect(r.chunks.find((c) => c.tier === 'user').docKind).toBe('jd');
    expect(r.timedOut).toBe(false);
  });

  it('returns empty chunks (not throws) when retrieval exceeds timeout', async () => {
    hybridKbMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 500)),
    );
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 1, timeoutMs: 50 });
    expect(r.chunks).toEqual([]);
    expect(r.timedOut).toBe(true);
  });

  it('skips user-doc search when userId is missing', async () => {
    hybridKbMock.mockResolvedValue([]);
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    expect(hybridUserMock).not.toHaveBeenCalled();
  });

  it('passes userId through to hybridSearchUserDocs (namespace isolation)', async () => {
    hybridKbMock.mockResolvedValue([]);
    hybridUserMock.mockResolvedValue([]);
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: 7 });
    expect(hybridUserMock).toHaveBeenCalledWith(7, 'q', expect.any(Number), expect.any(Object));
  });

  it('truncates chunk content to MAX_CHUNK_CHARS', async () => {
    const longContent = 'x'.repeat(2000);
    hybridKbMock.mockResolvedValue([
      { tier: 'kb', id: 'k1', source: 's', topicId: 't', topicTitle: 'T', section: 'sec', content: longContent, rrfScore: 0.05 },
    ]);
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null });
    expect(r.chunks[0].content.length).toBeLessThanOrEqual(1200);
  });
});

describe('formatRetrievedContext', () => {
  it('produces a labeled, source-attributed string', async () => {
    const { formatRetrievedContext } = await import('../src/services/retrieval.js');
    const out = formatRetrievedContext([
      { tier: 'kb', source: 'capra-sre', topicTitle: 'SLI/SLO/SLA',
        section: 'summary', content: 'An SLO is a target.' },
      { tier: 'user', docKind: 'jd', content: 'JD asks for SRE.' },
    ]);
    expect(out).toContain('[KB capra-sre / SLI/SLO/SLA / summary]');
    expect(out).toContain('An SLO is a target.');
    expect(out).toContain('[USER jd]');
    expect(out).toContain('JD asks for SRE.');
  });

  it('returns empty string for no chunks', async () => {
    const { formatRetrievedContext } = await import('../src/services/retrieval.js');
    expect(formatRetrievedContext([])).toBe('');
  });
});

describe('retrieve with HyDE', () => {
  it('augments embedding query with hypothetical answer when useHyde=true', async () => {
    vi.resetModules();
    process.env.RAG_USE_HYDE = '';
    const hydeMock = vi.fn().mockResolvedValue('SLOs are reliability targets; error budgets cap outages.');
    vi.doMock('../src/services/hyde.js', () => ({ hydeRewrite: hydeMock }));
    const embedMock = vi.fn().mockResolvedValue(new Array(1536).fill(0.01));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: embedMock }));
    const hybridKbMock = vi.fn().mockResolvedValue([]);
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: vi.fn(),
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'what is an SLO?', userId: null, useHyde: true });
    expect(hydeMock).toHaveBeenCalledWith('what is an SLO?');
    expect(embedMock).toHaveBeenCalledWith(expect.stringContaining('reliability targets'));
  });

  it('does not call hyde when useHyde is undefined and env flag is off', async () => {
    vi.resetModules();
    process.env.RAG_USE_HYDE = '';
    const hydeMock = vi.fn();
    vi.doMock('../src/services/hyde.js', () => ({ hydeRewrite: hydeMock }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([]),
      hybridSearchUserDocs: vi.fn(),
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    expect(hydeMock).not.toHaveBeenCalled();
  });
});

describe('retrieve with reranker', () => {
  it('passes merged chunks through rerank when useRerank=true', async () => {
    vi.resetModules();
    process.env.RAG_USE_RERANK = '';
    process.env.COHERE_API_KEY = 'set';
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([
        { tier: 'kb', id: 'k1', content: 'A' },
        { tier: 'kb', id: 'k2', content: 'B' },
      ]),
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
    }));
    const rerankMock = vi.fn().mockImplementation((q, chunks) => Promise.resolve(chunks.slice().reverse()));
    vi.doMock('../src/services/reranker.js', () => ({ rerank: rerankMock }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null, useRerank: true });
    expect(rerankMock).toHaveBeenCalledTimes(1);
    expect(r.chunks[0].id).toBe('k2');
    expect(r.chunks[1].id).toBe('k1');
  });

  it('skips rerank when useRerank is undefined and no env flag', async () => {
    vi.resetModules();
    process.env.RAG_USE_RERANK = '';
    delete process.env.COHERE_API_KEY;
    const rerankMock = vi.fn();
    vi.doMock('../src/services/reranker.js', () => ({ rerank: rerankMock }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([{ tier: 'kb', id: 'k1', content: 'A' }]),
      hybridSearchUserDocs: vi.fn(),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    expect(rerankMock).not.toHaveBeenCalled();
  });
});
