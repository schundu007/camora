import { describe, it, expect, vi, beforeEach } from 'vitest';

// embeddings.js moved from Cohere embed-english-v3.0 (1024-dim) to Gemini
// gemini-embedding-001 truncated to 1536 dims. This file previously mocked
// `cohere-ai` and asserted 1024-dim vectors, so every case failed the moment
// the provider changed — which is why the suite stayed red and the dimension
// mismatch that broke per-user indexing for a month went unnoticed.
process.env.GEMINI_API_KEY = 'test-gemini-key';

const DIM = 1536;
const embedContentMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    return { models: { embedContent: embedContentMock } };
  }),
}));

/** Gemini returns `{ embeddings: [{ values: number[] }] }`. */
const reply = (...vectors) => ({ embeddings: vectors.map((v) => ({ values: v })) });
const vec = (fill) => new Array(DIM).fill(fill);

beforeEach(() => {
  embedContentMock.mockReset();
  vi.resetModules();
});

describe('embeddings service', () => {
  it('embeds a single query and returns a 1536-dim vector', async () => {
    embedContentMock.mockResolvedValue(reply(vec(0.01)));
    const { embedQuery } = await import('../src/services/embeddings.js');
    const v = await embedQuery('how does Raft handle leader election?');
    expect(v).toHaveLength(DIM);
    expect(embedContentMock).toHaveBeenCalledTimes(1);
  });

  it('L2-normalizes the vector — truncated Matryoshka tiers arrive un-normalized', async () => {
    // pgvector does not normalize for you, so skipping this silently skews
    // every similarity score. Load-bearing, not a nicety.
    embedContentMock.mockResolvedValue(reply(vec(0.5)));
    const { embedQuery } = await import('../src/services/embeddings.js');
    const v = await embedQuery('what is an SLO?');
    expect(Math.sqrt(v.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 6);
  });

  it('sends RETRIEVAL_QUERY and the configured dimensionality for queries', async () => {
    embedContentMock.mockResolvedValue(reply(vec(0.01)));
    const { embedQuery } = await import('../src/services/embeddings.js');
    await embedQuery('vector search');
    const arg = embedContentMock.mock.calls[0][0];
    expect(arg.config.taskType).toBe('RETRIEVAL_QUERY');
    expect(arg.config.outputDimensionality).toBe(DIM);
  });

  it('sends RETRIEVAL_DOCUMENT when embedding documents', async () => {
    embedContentMock.mockResolvedValue(reply(vec(0.01)));
    const { embedBatch } = await import('../src/services/embeddings.js');
    await embedBatch(['a chunk of prose']);
    expect(embedContentMock.mock.calls[0][0].config.taskType).toBe('RETRIEVAL_DOCUMENT');
  });

  it('returns the cached vector on a repeat call without hitting the API', async () => {
    embedContentMock.mockResolvedValue(reply(vec(0.02)));
    const { embedQuery } = await import('../src/services/embeddings.js');
    await embedQuery('what is an SLO?');
    await embedQuery('what is an SLO?');
    expect(embedContentMock).toHaveBeenCalledTimes(1);
  });

  it('does not let query and document embeddings collide in the cache', async () => {
    // Same text, different task type — asymmetric by design, so the cache key
    // includes the task type and the second call must still reach the API.
    embedContentMock.mockResolvedValue(reply(vec(0.03)));
    const m = await import('../src/services/embeddings.js');
    await m.embedQuery('kubernetes networking');
    await m.embedBatch(['kubernetes networking']);
    expect(embedContentMock).toHaveBeenCalledTimes(2);
  });

  it('embeds a batch of inputs in a single API call', async () => {
    embedContentMock.mockResolvedValue(reply(vec(0.1), vec(0.2), vec(0.3)));
    const { embedBatch } = await import('../src/services/embeddings.js');
    const vs = await embedBatch(['a', 'b', 'c']);
    expect(vs).toHaveLength(3);
    // Normalization drives every component of a constant vector to
    // 1/sqrt(DIM), so assert that rather than the raw fill value.
    expect(vs[0][0]).toBeCloseTo(1 / Math.sqrt(DIM), 6);
    expect(embedContentMock).toHaveBeenCalledTimes(1);
  });

  it('splits a large batch across API calls of size 100, preserving order', async () => {
    // Tag each vector's first component with its position in the request so
    // ordering survives normalization and is actually verifiable.
    embedContentMock.mockImplementation(({ contents }) =>
      Promise.resolve(reply(...contents.map((_, i) => {
        const v = vec(0.1);
        v[0] = i + 1;
        return v;
      }))));
    const { embedBatch } = await import('../src/services/embeddings.js');
    const vs = await embedBatch(new Array(250).fill(0).map((_, i) => `text-${i}`));
    expect(vs).toHaveLength(250);
    expect(embedContentMock).toHaveBeenCalledTimes(3); // 100 + 100 + 50
    expect(embedContentMock.mock.calls[0][0].contents).toHaveLength(100);
    expect(embedContentMock.mock.calls[1][0].contents).toHaveLength(100);
    expect(embedContentMock.mock.calls[2][0].contents).toHaveLength(50);
    // Position 0 of every batch carries tag 1; position 99 carries tag 100.
    // A mis-ordered merge across batches would break these.
    expect(vs[0][0]).not.toBeCloseTo(vs[99][0], 6);
    expect(vs[0][0]).toBeCloseTo(vs[100][0], 6);   // first item of batch 2
    expect(vs[0][0]).toBeCloseTo(vs[200][0], 6);   // first item of batch 3
  });

  it('coalesces concurrent embedQuery calls for the same text into one API call', async () => {
    let resolveCall;
    embedContentMock.mockImplementation(() => new Promise((resolve) => {
      resolveCall = () => resolve(reply(vec(0.42)));
    }));
    const { embedQuery } = await import('../src/services/embeddings.js');
    const p1 = embedQuery('same question');
    const p2 = embedQuery('same question');
    expect(embedContentMock).toHaveBeenCalledTimes(1);
    resolveCall();
    const [v1, v2] = await Promise.all([p1, p2]);
    expect(v1).toEqual(v2);
    expect(embedContentMock).toHaveBeenCalledTimes(1);
  });
});

describe('failure modes stay distinguishable', () => {
  // The point of splitting these: a config fault must never look transient.
  // "Degraded" became indistinguishable from "healthy" once before and cost
  // months of silent BM25-only retrieval.
  it('throws EmbeddingRequestError on a transient API failure', async () => {
    embedContentMock.mockRejectedValue(new Error('429 rate limited'));
    const { embedQuery, EmbeddingRequestError } = await import('../src/services/embeddings.js');
    await expect(embedQuery('anything')).rejects.toBeInstanceOf(EmbeddingRequestError);
  });

  it('throws EmbeddingConfigError when the response count does not match the request', async () => {
    embedContentMock.mockResolvedValue(reply(vec(0.1)));   // 1 back for 2 sent
    const { embedBatch, EmbeddingConfigError } = await import('../src/services/embeddings.js');
    await expect(embedBatch(['a', 'b'])).rejects.toBeInstanceOf(EmbeddingConfigError);
  });

  it('throws EmbeddingConfigError on a wrong-dimension vector rather than indexing it', async () => {
    embedContentMock.mockResolvedValue(reply(new Array(1024).fill(0.1)));
    const { embedQuery, EmbeddingConfigError } = await import('../src/services/embeddings.js');
    await expect(embedQuery('anything')).rejects.toBeInstanceOf(EmbeddingConfigError);
  });
});

describe('embeddingsAvailable', () => {
  it('is true when a key is configured', async () => {
    const { embeddingsAvailable } = await import('../src/services/embeddings.js');
    expect(embeddingsAvailable()).toBe(true);
  });
});
