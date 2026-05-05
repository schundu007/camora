import { describe, it, expect, vi, beforeEach } from 'vitest';

const messagesCreateMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  function FakeAnthropic() {
    return { messages: { create: messagesCreateMock } };
  }
  return { default: FakeAnthropic };
});

beforeEach(() => {
  messagesCreateMock.mockReset();
  vi.resetModules();
});

describe('hydeRewrite', () => {
  it('returns the hypothetical answer when Haiku responds', async () => {
    messagesCreateMock.mockResolvedValue({
      content: [{ type: 'text', text: 'An SLO is a target reliability level over a window. Error budgets equal 1 minus the SLO; when burned, releases pause.' }],
    });
    const { hydeRewrite } = await import('../src/services/hyde.js');
    const out = await hydeRewrite('what is an SLO?');
    expect(out).toContain('SLO');
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
    const args = messagesCreateMock.mock.calls[0][0];
    expect(args.model).toMatch(/haiku/);
    expect(args.max_tokens).toBeLessThanOrEqual(200);
  });

  it('caches repeat calls', async () => {
    messagesCreateMock.mockResolvedValue({ content: [{ type: 'text', text: 'cached answer' }] });
    const { hydeRewrite } = await import('../src/services/hyde.js');
    await hydeRewrite('same q');
    await hydeRewrite('same q');
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns null and does not throw when Haiku fails', async () => {
    messagesCreateMock.mockRejectedValue(new Error('overloaded'));
    const { hydeRewrite } = await import('../src/services/hyde.js');
    const out = await hydeRewrite('q');
    expect(out).toBeNull();
  });
});
