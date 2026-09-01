/**
 * Ask Sona KB source filtering.
 *
 * The bug: sourcesForQuestion() narrows to the three general capra study decks
 * whenever a question matches CI_HINTS — and CI_HINTS includes "gpu", "k8s",
 * "kubernetes", "pipeline", "ci". The retrieval SQL then bound that list as an
 * exclusive `WHERE source = ANY($3)`, so EVERY other row in the KB was
 * invisible to exactly those questions.
 *
 * That silently hid the web-watchlist rows, which are keyed by company name
 * (source='NVIDIA', written by lumora-backend's webWatchlist on Prep save) for
 * the company the user is actually interviewing at. Ask "how does the GPU
 * Operator work with KubeVirt" the day you index NVIDIA's docs, and retrieval
 * searched everything except NVIDIA's docs.
 *
 * The same file already carries a comment about the previous incarnation of
 * this bug ('capra-amd-ci' leaking one company's deck into general questions),
 * so the fix has to keep OTHER companies' study decks out while letting
 * non-deck sources through.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../src/config/database.js';

vi.mock('../src/config/database.js', () => ({ query: vi.fn() }));

// retrieveForAsk bails before touching SQL if embedding fails, so stand in a
// deterministic 1536-dim vector rather than calling Gemini.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      embedContent: async () => ({ embeddings: [{ values: Array(1536).fill(0.1) }] }),
    };
  },
}));

const { retrieveForAsk, sourcesForQuestion } = await import('../src/services/askRetrieval.js');

const sqlFor = async (question) => {
  query.mockResolvedValueOnce({ rows: [] });
  await retrieveForAsk(question);
  return query.mock.calls.at(-1);
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_AI_API_KEY = 'test-key';
});

describe('sourcesForQuestion', () => {
  it('biases CI-flavoured questions toward the general decks', () => {
    expect(sourcesForQuestion('how do I cut a release pipeline')).toEqual([
      'capra-devops', 'capra-sre', 'capra-system-design',
    ]);
  });

  it('leaves everything else unfiltered', () => {
    expect(sourcesForQuestion('tell me about yourself')).toBeNull();
  });
});

describe('retrieveForAsk source clause', () => {
  it('does not exclude company watchlist rows from GPU questions', async () => {
    const [sql, params] = await sqlFor('how does the GPU Operator work with KubeVirt');
    // The regression: a bare `source = ANY($3)` here means source='NVIDIA' can
    // never be returned for this question.
    expect(sql).toContain("source NOT LIKE 'capra-%'");
    expect(params[2]).toEqual(['capra-devops', 'capra-sre', 'capra-system-design']);
  });

  it('still keeps other companies study decks out of CI questions', async () => {
    const [sql] = await sqlFor('kubernetes deployment strategy');
    // capra-* decks are admitted only via the explicit allow-list, never by the
    // NOT LIKE escape hatch.
    expect(sql).toMatch(/source = ANY\(\$3\) OR source NOT LIKE 'capra-%'/);
  });

  it('applies no source filter to a non-CI question', async () => {
    const [sql, params] = await sqlFor('tell me about a time you led a team');
    expect(sql).not.toContain('WHERE');
    expect(params).toHaveLength(2);
  });
});
