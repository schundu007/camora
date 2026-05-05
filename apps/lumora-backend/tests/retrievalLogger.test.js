import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

beforeEach(() => {
  queryMock.mockReset();
});

describe('logRetrieval', () => {
  it('writes a row with question + top chunk ids + scores + latency + flags', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { logRetrieval } = await import('../src/services/retrievalLogger.js');
    await logRetrieval({
      userId: 42,
      question: 'what is an SLO?',
      chunks: [
        { id: 'k1', rrfScore: 0.05, distance: 0.1 },
        { id: 'k2', rerankScore: 0.9 },
      ],
      latencyMs: 87,
      timedOut: false,
      usedWarmKit: true,
      usedHyde: false,
      usedRerank: true,
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
    const args = queryMock.mock.calls[0];
    expect(args[0]).toMatch(/INSERT INTO lumora_retrieval_logs/);
    // user_id, question, top_chunk_ids, scores, latency_ms, used_warm_kit, used_hyde, used_rerank, timed_out
    expect(args[1][0]).toBe(42);
    expect(args[1][1]).toBe('what is an SLO?');
    const ids = JSON.parse(args[1][2]);
    expect(ids).toEqual(['k1', 'k2']);
    const scores = JSON.parse(args[1][3]);
    expect(scores).toHaveLength(2);
    // First chunk had rrfScore 0.05, second had rerankScore 0.9
    expect(scores[0]).toBeCloseTo(0.05);
    expect(scores[1]).toBeCloseTo(0.9);
    expect(args[1][4]).toBe(87);
    expect(args[1][5]).toBe(true);  // used_warm_kit
    expect(args[1][6]).toBe(false); // used_hyde
    expect(args[1][7]).toBe(true);  // used_rerank
    expect(args[1][8]).toBe(false); // timed_out
  });

  it('swallows DB errors (does not throw)', async () => {
    queryMock.mockRejectedValue(new Error('connection lost'));
    const { logRetrieval } = await import('../src/services/retrievalLogger.js');
    await expect(logRetrieval({
      userId: null,
      question: 'q',
      chunks: [],
      latencyMs: 0,
      timedOut: true,
    })).resolves.toBeUndefined();
  });

  it('handles null userId for guest sessions', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { logRetrieval } = await import('../src/services/retrievalLogger.js');
    await logRetrieval({
      userId: null,
      question: 'q',
      chunks: [],
      latencyMs: 50,
      timedOut: false,
    });
    expect(queryMock.mock.calls[0][1][0]).toBeNull();
  });

  it('truncates question to 8000 chars', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { logRetrieval } = await import('../src/services/retrievalLogger.js');
    const huge = 'q'.repeat(20000);
    await logRetrieval({ userId: 1, question: huge, chunks: [], latencyMs: 0, timedOut: false });
    expect(queryMock.mock.calls[0][1][1].length).toBe(8000);
  });

  it('caps top_chunk_ids and scores at 20 entries', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { logRetrieval } = await import('../src/services/retrievalLogger.js');
    const chunks = new Array(50).fill(0).map((_, i) => ({ id: 'c' + i, rrfScore: 0.01 * i }));
    await logRetrieval({ userId: 1, question: 'q', chunks, latencyMs: 0, timedOut: false });
    const ids = JSON.parse(queryMock.mock.calls[0][1][2]);
    const scores = JSON.parse(queryMock.mock.calls[0][1][3]);
    expect(ids.length).toBe(20);
    expect(scores.length).toBe(20);
  });
});
