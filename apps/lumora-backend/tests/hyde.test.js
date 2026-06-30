import { describe, it, expect, vi, beforeEach } from 'vitest';

// hyde.js was migrated from Anthropic Haiku to Gemini (gemini-2.5-flash).
// It calls client().getGenerativeModel({ model, systemInstruction }).generateContent(question)
// then reads r.response.text(). Mock the Google SDK so no network call is made.
const generateContentMock = vi.fn();
const getGenerativeModelMock = vi.fn(() => ({ generateContent: generateContentMock }));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return { getGenerativeModel: getGenerativeModelMock };
  }),
}));

beforeEach(() => {
  generateContentMock.mockReset();
  getGenerativeModelMock.mockClear();
  vi.resetModules();
});

function geminiResponse(text) {
  return { response: { text: () => text } };
}

describe('hydeRewrite', () => {
  it('returns the hypothetical answer when Gemini responds', async () => {
    generateContentMock.mockResolvedValue(
      geminiResponse('An SLO is a target reliability level over a window. Error budgets equal 1 minus the SLO; when burned, releases pause.'),
    );
    const { hydeRewrite } = await import('../src/services/hyde.js');
    const out = await hydeRewrite('what is an SLO?');
    expect(out).toContain('SLO');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock.mock.calls[0][0]).toBe('what is an SLO?');
    const modelArgs = getGenerativeModelMock.mock.calls[0][0];
    expect(modelArgs.model).toMatch(/gemini/);
  });

  it('caches repeat calls', async () => {
    generateContentMock.mockResolvedValue(geminiResponse('cached answer'));
    const { hydeRewrite } = await import('../src/services/hyde.js');
    await hydeRewrite('same q');
    await hydeRewrite('same q');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('returns null and does not throw when Gemini fails', async () => {
    generateContentMock.mockRejectedValue(new Error('overloaded'));
    const { hydeRewrite } = await import('../src/services/hyde.js');
    const out = await hydeRewrite('q');
    expect(out).toBeNull();
  });
});
