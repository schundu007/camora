import { describe, it, expect, vi, beforeEach } from 'vitest';

const embedMock = vi.fn();
vi.mock('cohere-ai', () => ({
  CohereClient: vi.fn(function () {
    return { embed: embedMock };
  }),
}));

beforeEach(() => {
  embedMock.mockReset();
  vi.resetModules();
});

describe('embeddings service', () => {
  it('embeds a single query and returns a 1024-dim Float array', async () => {
    embedMock.mockResolvedValue({
      embeddings: [new Array(1024).fill(0.01)],
    });
    const { embedQuery } = await import('../src/services/embeddings.js');
    const v = await embedQuery('how does Raft handle leader election?');
    expect(v).toHaveLength(1024);
    expect(embedMock).toHaveBeenCalledTimes(1);
  });

  it('returns the cached vector on a repeat call without hitting Cohere', async () => {
    embedMock.mockResolvedValue({
      embeddings: [new Array(1024).fill(0.02)],
    });
    const { embedQuery } = await import('../src/services/embeddings.js');
    await embedQuery('what is an SLO?');
    await embedQuery('what is an SLO?');
    expect(embedMock).toHaveBeenCalledTimes(1);
  });

  it('embeds a batch of inputs in a single API call', async () => {
    embedMock.mockResolvedValue({
      embeddings: [
        new Array(1024).fill(0.1),
        new Array(1024).fill(0.2),
        new Array(1024).fill(0.3),
      ],
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const vs = await embedBatch(['a', 'b', 'c']);
    expect(vs).toHaveLength(3);
    expect(vs[0][0]).toBeCloseTo(0.1);
    expect(vs[2][0]).toBeCloseTo(0.3);
    expect(embedMock).toHaveBeenCalledTimes(1);
  });

  it('splits a large batch across multiple API calls of size 96, preserving order', async () => {
    let callIdx = 0;
    embedMock.mockImplementation(({ texts }) => {
      const fill = [0.1, 0.5, 0.9][callIdx++];
      return Promise.resolve({
        embeddings: texts.map(() => new Array(1024).fill(fill)),
      });
    });
    const { embedBatch } = await import('../src/services/embeddings.js');
    const inputs = new Array(250).fill(0).map((_, i) => `text-${i}`);
    const vs = await embedBatch(inputs);
    expect(vs).toHaveLength(250);
    expect(embedMock).toHaveBeenCalledTimes(3);
    expect(vs[0][0]).toBeCloseTo(0.1);
    expect(vs[95][0]).toBeCloseTo(0.1);
    expect(vs[96][0]).toBeCloseTo(0.5);
    expect(vs[191][0]).toBeCloseTo(0.5);
    expect(vs[192][0]).toBeCloseTo(0.9);
    expect(vs[249][0]).toBeCloseTo(0.9);
  });

  it('coalesces concurrent embedQuery calls for the same text into one API call', async () => {
    let resolveCall;
    embedMock.mockImplementation(() => new Promise((resolve) => {
      resolveCall = () => resolve({ embeddings: [new Array(1024).fill(0.42)] });
    }));
    const { embedQuery } = await import('../src/services/embeddings.js');
    const p1 = embedQuery('same question');
    const p2 = embedQuery('same question');
    expect(embedMock).toHaveBeenCalledTimes(1);
    resolveCall();
    const [v1, v2] = await Promise.all([p1, p2]);
    expect(v1[0]).toBeCloseTo(0.42);
    expect(v2[0]).toBeCloseTo(0.42);
    expect(embedMock).toHaveBeenCalledTimes(1);
  });
});
