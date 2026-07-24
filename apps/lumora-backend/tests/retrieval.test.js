import { describe, it, expect, vi, beforeEach } from 'vitest';

const hybridKbMock = vi.fn();
const hybridUserMock = vi.fn();
const hybridUserCodeMock = vi.fn();
// embedQueryOrDegrade is imported by retrieve() and MUST be mocked here.
// It was added to hybridRetrieval.js when embeddings moved to Gemini, but this
// mock was not updated — so every test in this file died with "No
// 'embedQueryOrDegrade' export is defined on the mock" rather than on an
// assertion. Any export retrieve() reaches for has to appear in this factory.
const embedQueryOrDegradeMock = vi.fn();
vi.mock('../src/services/hybridRetrieval.js', () => ({
  hybridSearchKb: hybridKbMock,
  hybridSearchUserDocs: hybridUserMock,
  hybridSearchUserCode: hybridUserCodeMock,
  embedQueryOrDegrade: embedQueryOrDegradeMock,
}));

const embedQueryMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedQuery: embedQueryMock }));

beforeEach(() => {
  hybridKbMock.mockReset();
  hybridUserMock.mockReset();
  hybridUserCodeMock.mockReset();
  hybridUserCodeMock.mockResolvedValue([]);
  embedQueryMock.mockReset();
  embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
  embedQueryOrDegradeMock.mockReset();
  embedQueryOrDegradeMock.mockResolvedValue(new Array(1536).fill(0.01));
  process.env.RAG_USE_WARM_KIT = 'false'; // disable warm kit for default tests
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
    vi.doMock('../src/services/embeddings.js', () => ({
      embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    const hybridKbMock = vi.fn().mockResolvedValue([]);
    // retrieve() embeds via hybridRetrieval's embedQueryOrDegrade, NOT
    // embeddings.embedQuery — that indirection is what lets a transient
    // embedding failure degrade to BM25. This assertion used to watch
    // embedQuery and so could never have passed once the call moved.
    const embedOrDegradeMock = vi.fn().mockResolvedValue(new Array(1536).fill(0.01));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: vi.fn(),
      hybridSearchUserCode: vi.fn(),
      embedQueryOrDegrade: embedOrDegradeMock,
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'what is an SLO?', userId: null, useHyde: true });
    expect(hydeMock).toHaveBeenCalledWith('what is an SLO?');
    expect(embedOrDegradeMock).toHaveBeenCalledWith(expect.stringContaining('reliability targets'));
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
      hybridSearchUserCode: vi.fn(),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
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
      hybridSearchUserCode: vi.fn().mockResolvedValue([]),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
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
      hybridSearchUserCode: vi.fn(),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    expect(rerankMock).not.toHaveBeenCalled();
  });
});

describe('retrieve with warm kit', () => {
  it('reads warm kit when available, skipping live retrieval', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = '';
    const kitMock = vi.fn().mockResolvedValue({
      chunks: [{ tier: 'kb', id: 'k1', source: 'capra-sre', topicTitle: 'T', section: 's', content: 'x' }],
    });
    vi.doMock('../src/services/sessionKit.js', () => ({ readSessionKit: kitMock }));
    const hybridKbMock = vi.fn();
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: vi.fn(),
      hybridSearchUserCode: vi.fn(),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: vi.fn().mockResolvedValue(undefined) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 7 });
    expect(kitMock).toHaveBeenCalledWith(7);
    expect(hybridKbMock).not.toHaveBeenCalled();
    expect(r.chunks[0].id).toBe('k1');
  });

  it('falls through to live retrieval when no kit row exists', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = '';
    vi.doMock('../src/services/sessionKit.js', () => ({ readSessionKit: vi.fn().mockResolvedValue(null) }));
    const hybridKbMock = vi.fn().mockResolvedValue([{ tier: 'kb', id: 'L1', content: 'live' }]);
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: hybridKbMock,
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
      hybridSearchUserCode: vi.fn().mockResolvedValue([]),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: vi.fn().mockResolvedValue(undefined) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 7 });
    expect(hybridKbMock).toHaveBeenCalled();
    expect(r.chunks[0].id).toBe('L1');
  });
});

describe('retrieve writes to retrievalLogger', () => {
  it('calls logRetrieval after a successful live retrieval', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = 'false';
    const logMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: logMock }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([{ tier: 'kb', id: 'k1', content: 'a' }]),
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
      hybridSearchUserCode: vi.fn().mockResolvedValue([]),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    // Logger is fire-and-forget via dynamic import — flush microtasks
    await new Promise((r) => setTimeout(r, 10));
    expect(logMock).toHaveBeenCalledTimes(1);
    const args = logMock.mock.calls[0][0];
    expect(args.question).toBe('q');
    expect(args.timedOut).toBe(false);
    expect(args.usedWarmKit).toBe(false);
  });

  it('marks usedWarmKit=true when kit short-circuit fires', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = '';
    const logMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: logMock }));
    vi.doMock('../src/services/sessionKit.js', () => ({
      readSessionKit: vi.fn().mockResolvedValue({
        chunks: [{ tier: 'kb', id: 'k1', content: 'kit' }],
      }),
    }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn(),
      hybridSearchUserDocs: vi.fn(),
      hybridSearchUserCode: vi.fn(),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: 7 });
    await new Promise((r) => setTimeout(r, 10));
    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock.mock.calls[0][0].usedWarmKit).toBe(true);
  });

  it('logs the timeout path', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = 'false';
    const logMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: logMock }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockImplementation(() => new Promise((res) => setTimeout(() => res([]), 500))),
      hybridSearchUserDocs: vi.fn(),
      hybridSearchUserCode: vi.fn(),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null, timeoutMs: 50 });
    await new Promise((r) => setTimeout(r, 10));
    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock.mock.calls[0][0].timedOut).toBe(true);
    expect(logMock.mock.calls[0][0].chunks).toEqual([]);
  });
});

describe('retrieve.lowConfidence', () => {
  it('flags lowConfidence=true when no chunks returned', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = 'false';
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([]),
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
      hybridSearchUserCode: vi.fn().mockResolvedValue([]),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null });
    expect(r.lowConfidence).toBe(true);
  });

  it('flags lowConfidence=false when top chunk has strong rrfScore', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = 'false';
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([
        { tier: 'kb', id: 'k1', content: 'a', rrfScore: 0.05 },
      ]),
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
      hybridSearchUserCode: vi.fn().mockResolvedValue([]),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null });
    expect(r.lowConfidence).toBe(false);
  });

  it('flags lowConfidence=true when top rrfScore is below threshold', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = 'false';
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockResolvedValue([
        { tier: 'kb', id: 'k1', content: 'a', rrfScore: 0.01 },
      ]),
      hybridSearchUserDocs: vi.fn().mockResolvedValue([]),
      hybridSearchUserCode: vi.fn().mockResolvedValue([]),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null });
    expect(r.lowConfidence).toBe(true);
  });

  it('returns lowConfidence=true on timeout', async () => {
    vi.resetModules();
    process.env.RAG_USE_WARM_KIT = 'false';
    vi.doMock('../src/services/retrievalLogger.js', () => ({ logRetrieval: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/services/hybridRetrieval.js', () => ({
      hybridSearchKb: vi.fn().mockImplementation(() => new Promise((res) => setTimeout(() => res([]), 500))),
      hybridSearchUserDocs: vi.fn(),
      hybridSearchUserCode: vi.fn(),
      // retrieve() imports this from hybridRetrieval; omitting it makes every
      // test in the block die on the mock instead of on an assertion.
      embedQueryOrDegrade: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    }));
    vi.doMock('../src/services/embeddings.js', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)) }));
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: null, timeoutMs: 50 });
    expect(r.timedOut).toBe(true);
    expect(r.lowConfidence).toBe(true);
  });
});
