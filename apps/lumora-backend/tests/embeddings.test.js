import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the OpenAI SDK before importing the service.
const createMock = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn(function () {
    return { embeddings: { create: createMock } };
  }),
}));

beforeEach(() => {
  createMock.mockReset();
  // Reset the module so the in-memory cache is fresh per test.
  vi.resetModules();
});

describe('embeddings service', () => {
  it('embeds a single query and returns a 1536-dim Float array', async () => {
    createMock.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.01) }],
    });
    const { embedQuery } = await import('../src/services/embeddings.js');
    const v = await embedQuery('how does Raft handle leader election?');
    expect(v).toHaveLength(1536);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('returns the cached vector on a repeat call without hitting OpenAI', async () => {
    createMock.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.02) }],
    });
    const { embedQuery } = await import('../src/services/embeddings.js');
    await embedQuery('what is an SLO?');
    await embedQuery('what is an SLO?');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('embeds a batch of inputs in a single API call', async () => {
    createMock.mockResolvedValue({
      data: [
        { embedding: new Array(1536).fill(0.1) },
        { embedding: new Array(1536).fill(0.2) },
        { embedding: new Array(1536).fill(0.3) },
      ],
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const vs = await embedBatch(['a', 'b', 'c']);
    expect(vs).toHaveLength(3);
    expect(vs[0][0]).toBeCloseTo(0.1);
    expect(vs[2][0]).toBeCloseTo(0.3);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('splits a large batch across multiple API calls of size 100, preserving order', async () => {
    // Each call returns vectors filled with a unique sentinel so an
    // off-by-one in index mapping would produce a detectable failure.
    let callIdx = 0;
    createMock.mockImplementation(({ input }) => {
      const fill = [0.1, 0.5, 0.9][callIdx++];
      return Promise.resolve({
        data: input.map(() => ({ embedding: new Array(1536).fill(fill) })),
      });
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const inputs = new Array(250).fill(0).map((_, i) => `text-${i}`);
    const vs = await embedBatch(inputs);
    expect(vs).toHaveLength(250);
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(vs[0][0]).toBeCloseTo(0.1);
    expect(vs[99][0]).toBeCloseTo(0.1);
    expect(vs[100][0]).toBeCloseTo(0.5);
    expect(vs[199][0]).toBeCloseTo(0.5);
    expect(vs[200][0]).toBeCloseTo(0.9);
    expect(vs[249][0]).toBeCloseTo(0.9);
  });

  it('coalesces concurrent embedQuery calls for the same text into one API call', async () => {
    let resolveCall;
    createMock.mockImplementation(() => new Promise((resolve) => {
      resolveCall = () => resolve({ data: [{ embedding: new Array(1536).fill(0.42) }] });
    }));
    const { embedQuery } = await import('../src/services/embeddings.js');
    const p1 = embedQuery('same question');
    const p2 = embedQuery('same question');
    expect(createMock).toHaveBeenCalledTimes(1);
    resolveCall();
    const [v1, v2] = await Promise.all([p1, p2]);
    expect(v1[0]).toBeCloseTo(0.42);
    expect(v2[0]).toBeCloseTo(0.42);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
