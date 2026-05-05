import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the OpenAI SDK before importing the service.
const createMock = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: { create: createMock },
  })),
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

  it('splits a large batch across multiple API calls of size 100', async () => {
    createMock.mockResolvedValue({
      data: new Array(100).fill(null).map(() => ({ embedding: new Array(1536).fill(0.5) })),
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const inputs = new Array(250).fill(0).map((_, i) => `text-${i}`);
    const vs = await embedBatch(inputs);
    expect(vs).toHaveLength(250);
    expect(createMock).toHaveBeenCalledTimes(3); // 100 + 100 + 50
  });
});
