import { describe, it, expect, vi, beforeEach } from 'vitest';

const hybridKbMock = vi.fn();
const hybridUserMock = vi.fn();
vi.mock('../src/services/hybridRetrieval.js', () => ({
  hybridSearchKb: hybridKbMock,
  hybridSearchUserDocs: hybridUserMock,
}));

beforeEach(() => {
  hybridKbMock.mockReset();
  hybridUserMock.mockReset();
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
    expect(hybridUserMock).toHaveBeenCalledWith(7, 'q', expect.any(Number));
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
