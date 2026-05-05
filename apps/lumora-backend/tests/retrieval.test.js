import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const embedQueryMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedQuery: embedQueryMock }));

beforeEach(() => {
  queryMock.mockReset();
  embedQueryMock.mockReset();
});

describe('retrieve', () => {
  it('returns chunks from KB and user tables, with source/topic metadata', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockImplementation((sql) => {
      if (sql.includes('lumora_kb_chunks')) {
        return Promise.resolve({
          rows: [
            { id: 'k1', source: 'capra-sre', topic_id: 'sli-slo-sla',
              topic_title: 'SLI/SLO/SLA', section: 'summary',
              content: 'An SLO is a target.', distance: 0.12 },
          ],
        });
      }
      return Promise.resolve({
        rows: [
          { id: 'u1', doc_kind: 'jd', section: 'body',
            content: 'JD asks for SRE experience.', distance: 0.18 },
        ],
      });
    });
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'what is an SLO?', userId: 42 });
    expect(r.chunks.length).toBe(2);
    expect(r.chunks.find((c) => c.tier === 'kb').source).toBe('capra-sre');
    expect(r.chunks.find((c) => c.tier === 'user').docKind).toBe('jd');
    expect(r.timedOut).toBe(false);
  });

  it('returns empty chunks (not throws) when retrieval exceeds timeout', async () => {
    embedQueryMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new Array(1536).fill(0)), 500)),
    );
    const { retrieve } = await import('../src/services/retrieval.js');
    const r = await retrieve({ question: 'q', userId: 1, timeoutMs: 50 });
    expect(r.chunks).toEqual([]);
    expect(r.timedOut).toBe(true);
  });

  it('skips user-doc search when userId is missing', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockResolvedValue({ rows: [] });
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: null });
    const userTableCalls = queryMock.mock.calls.filter((c) =>
      c[0].includes('lumora_user_doc_chunks'),
    );
    expect(userTableCalls.length).toBe(0);
  });

  it('always filters user-doc search by user_id (namespace isolation)', async () => {
    embedQueryMock.mockResolvedValue(new Array(1536).fill(0.01));
    queryMock.mockResolvedValue({ rows: [] });
    const { retrieve } = await import('../src/services/retrieval.js');
    await retrieve({ question: 'q', userId: 7 });
    const userCall = queryMock.mock.calls.find((c) =>
      c[0].includes('lumora_user_doc_chunks'),
    );
    expect(userCall[0]).toMatch(/WHERE user_id\s*=\s*\$1/);
    expect(userCall[1][0]).toBe(7);
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
