import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the args every Anthropic call is made with.
const capturedCalls = [];

// Mock the SDK before any import.
// client.messages.stream() returns a stream object that:
//   1. Is async-iterable (used in `for await (const event of stream)`)
//   2. Has a `.finalMessage()` async method
// Both properties must be present for streamResponse to run to completion.
vi.mock('@anthropic-ai/sdk', () => {
  function makeFakeStream(args) {
    capturedCalls.push({ kind: 'stream', args });
    const events = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } },
      { type: 'message_delta', usage: { output_tokens: 1 } },
      { type: 'message_stop' },
    ];
    return {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < events.length) return { value: events[i++], done: false };
            return { value: undefined, done: true };
          },
        };
      },
      async finalMessage() {
        return {
          id: 'm1',
          usage: { input_tokens: 10, output_tokens: 1 },
        };
      },
      controller: { abort: vi.fn() },
    };
  }

  function FakeAnthropic() {
    return {
      messages: {
        stream: vi.fn((args) => makeFakeStream(args)),
        create: vi.fn(async (args) => {
          capturedCalls.push({ kind: 'create', args });
          return {
            id: 'm1',
            content: [{ type: 'text', text: 'ok' }],
            usage: { input_tokens: 10, output_tokens: 1 },
          };
        }),
      },
    };
  }
  return { default: FakeAnthropic };
});

// streamResponse() now streams via Gemini (getGeminiClient), not Anthropic.
// Mock the Google SDK so the assembled `systemInstruction` — which carries the
// prepended retrievedContext + JD systemContext — is captured without a network
// call. (The Anthropic mock above is kept harmless for any legacy code paths.)
vi.mock('@google/generative-ai', () => {
  function GoogleGenerativeAI() {
    return {
      getGenerativeModel(cfg) {
        capturedCalls.push({ kind: 'gemini', systemInstruction: cfg?.systemInstruction, args: cfg });
        return {
          async generateContentStream() {
            return {
              stream: (async function* () {
                yield { text: () => 'ok' };
              })(),
              response: Promise.resolve({
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1 },
              }),
            };
          },
        };
      },
    };
  }
  return { GoogleGenerativeAI };
});

// Mock companyContext + companyCulture + cloudHint to no-ops to keep
// the test focused on the prompt-assembly path.
vi.mock('../src/services/companyContext.js', () => ({
  getCompanyContext: vi.fn().mockResolvedValue(null),
  detectCompanyFromContext: vi.fn().mockReturnValue(null),
}));
vi.mock('../src/services/companyCulture.js', () => ({
  getCultureFrame: vi.fn().mockReturnValue(''),
}));
vi.mock('../src/services/cloudHint.js', () => ({
  cloudHintFor: vi.fn().mockReturnValue(''),
  default: vi.fn().mockReturnValue(''),
}));

beforeEach(() => {
  capturedCalls.length = 0;
});

function findCapturedSystem() {
  // streamResponse uses `system: [{type:'text', text, cache_control}]`
  // Normalize to a plain string for assertion.
  const call = capturedCalls[capturedCalls.length - 1];
  if (!call) throw new Error('SDK was not called');
  // streamResponse streams via Gemini: the system prompt is passed as
  // `systemInstruction` to getGenerativeModel(). (Legacy Anthropic path put it
  // in `args.system` as [{type,text}] blocks — still handled for safety.)
  const sys = call.systemInstruction ?? call.args?.system;
  if (Array.isArray(sys)) return sys.map((b) => b.text).join('\n');
  return String(sys || '');
}

describe('streamResponse with retrievedContext', () => {
  it('passes the retrievedContext through and includes it in the assembled prompt', async () => {
    const { streamResponse } = await import('../src/services/claude.js');
    const gen = streamResponse('what is an SLO?', [], {
      systemContext: 'JD: SRE role.',
      retrievedContext: '[KB capra-sre / SLI-SLO-SLA / summary]\nAn SLO is a target.',
    });
    for await (const _ of gen) { /* drain */ }
    const sys = findCapturedSystem();
    expect(sys).toContain('[KB capra-sre / SLI-SLO-SLA / summary]');
    expect(sys).toContain('An SLO is a target.');
    expect(sys).toContain('JD: SRE role.');
  });

  it('falls back to systemContext when retrievedContext is null', async () => {
    const { streamResponse } = await import('../src/services/claude.js');
    const gen = streamResponse('q', [], {
      systemContext: 'JD only.',
      retrievedContext: null,
    });
    for await (const _ of gen) { /* drain */ }
    const sys = findCapturedSystem();
    expect(sys).toContain('JD only.');
  });
});

describe('streamResponse coding path with retrievedContext', () => {
  it('prepends retrievedContext to the coding system prompt', async () => {
    const { streamResponse } = await import('../src/services/claude.js');
    const gen = streamResponse('reverse a linked list in O(1) space', [], {
      systemContext: 'JD: Senior Backend Eng.',
      retrievedContext: '[KB capra-coding / Linked List Reversal / question:0]\nUse three pointers: prev, curr, next.',
    });
    for await (const _ of gen) { /* drain */ }
    const sys = findCapturedSystem();
    expect(sys).toContain('[KB capra-coding / Linked List Reversal / question:0]');
    expect(sys).toContain('Use three pointers');
    // CODING_SYSTEM_PROMPT body must also be present (confirms this was the coding branch).
    expect(sys).toContain('LIVE coding interview');
  });
});
