import { describe, it, expect, vi, beforeEach } from 'vitest';

const messagesCreateMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  function FakeAnthropic() { return { messages: { create: messagesCreateMock } }; }
  return { default: FakeAnthropic };
});

beforeEach(() => {
  messagesCreateMock.mockReset();
  vi.resetModules();
});

describe('addContextToChunks', () => {
  it('prepends a context preamble to each chunk content', async () => {
    messagesCreateMock.mockResolvedValue({
      content: [{ type: 'text', text: 'This chunk introduces SLO basics within the SRE foundations topic.' }],
    });
    const { addContextToChunks } = await import('../src/services/contextualChunker.js');
    const chunks = [
      { content: 'An SLO is a target.', section: 'summary', topicTitle: 'SLI/SLO/SLA' },
    ];
    const docText = 'SLI/SLO/SLA — full topic body here.';
    const out = await addContextToChunks(chunks, docText);
    expect(out[0].content).toMatch(/^\[Context: This chunk introduces SLO basics/);
    expect(out[0].content).toContain('An SLO is a target.');
    expect(out[0].contextSummary).toBeTruthy();
  });

  it('returns chunks unmodified when Haiku fails', async () => {
    messagesCreateMock.mockRejectedValue(new Error('rate limit'));
    const { addContextToChunks } = await import('../src/services/contextualChunker.js');
    const chunks = [{ content: 'plain', section: 'summary', topicTitle: 'T' }];
    const out = await addContextToChunks(chunks, 'doc');
    expect(out[0].content).toBe('plain');
    expect(out[0].contextSummary).toBeFalsy();
  });

  it('processes chunks in parallel batches', async () => {
    messagesCreateMock.mockResolvedValue({ content: [{ type: 'text', text: 'ctx' }] });
    const { addContextToChunks } = await import('../src/services/contextualChunker.js');
    const chunks = new Array(8).fill(0).map((_, i) => ({ content: 'c' + i, section: 's', topicTitle: 'T' }));
    const out = await addContextToChunks(chunks, 'doc');
    expect(out).toHaveLength(8);
    expect(messagesCreateMock).toHaveBeenCalledTimes(8);
  });
});
