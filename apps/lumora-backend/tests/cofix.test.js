import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock openai before app imports — transcription.js calls `new OpenAI()` at
// module-load time, which would crash the test suite without this stub.
vi.mock('openai', () => ({
  default: class { constructor() {} },
}));

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk before any app imports.
// The SDK is used via getAnthropicClient() in lib/_shared/llm.js.
// messages.stream() must return an async iterable.
// ---------------------------------------------------------------------------
const mockStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  function FakeAnthropic() {
    return {
      messages: {
        stream: mockStream,
        create: vi.fn(),
      },
    };
  }
  return { default: FakeAnthropic };
});

// CoFix runs via Gemini as ONE non-streaming call
// (getGenerativeModel().generateContent(prompt) -> { response: { text() } }).
// Mock the Google SDK accordingly.
const generateContentMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: () => ({
        generateContent: generateContentMock,
        // Kept for any other code paths that still start a chat.
        startChat: () => ({ sendMessageStream: vi.fn() }),
      }),
    };
  }),
}));

// Mock authenticate middleware — bypass JWT + DB lookup
vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', email: 't@t.com', plan_type: 'pro_monthly' };
    next();
  },
  default: (req, _res, next) => {
    req.user = { id: 'u1', email: 't@t.com', plan_type: 'pro_monthly' };
    next();
  },
}));

// Mock requirePaidSubscription — bypass subscription gate
vi.mock('../src/middleware/requirePaidSubscription.js', () => ({
  requirePaidSubscription: (_req, _res, next) => next(),
}));

// Mock usageLimits — bypass quota check (shared-db mock returns empty rows,
// which causes getOrCreateRow to return undefined and crash the usage service)
vi.mock('../src/middleware/usageLimits.js', () => ({
  checkUsage: () => (_req, _res, next) => next(),
  recordUsageCount: () => Promise.resolve(),
}));

// Mock shared-db to avoid real DB connections
vi.mock('../src/lib/shared-db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

// Mock shared-auth verifyToken (used by authenticate, but already mocked above — belt & suspenders)
vi.mock('../src/lib/shared-auth.js', () => ({
  verifyToken: vi.fn(() => ({ sub: 'u1', email: 't@t.com', type: 'access' })),
}));

const { default: app } = await import('../src/index.js');

// ---------------------------------------------------------------------------
// Helper: build a minimal async-iterable SSE stream from a text payload
// ---------------------------------------------------------------------------
// Gemini generateContent() resolves to { response: { text(): string } }.
function makeResult(text) {
  return { response: { text: () => text } };
}

const VALID_ANSWER = {
  fixed_code: 'def solution(n):\n  return n * 2',
  changes: [
    {
      line: 1,
      badge: 1,
      type: 'fix',
      label: 'Typo fixed',
      note: "Fixed 'retrun' to 'return'.",
    },
  ],
  complexity: { time: 'O(1)', space: 'O(1)' },
  hackerrank_compatible: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/v1/coding/cofix/stream', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when code is missing', async () => {
    const res = await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({ language: 'python' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing/i);
  });

  it('returns 400 when code is fewer than 5 chars', async () => {
    const res = await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({ code: 'hi', language: 'python' });
    expect(res.status).toBe(400);
  });

  it('emits answer + done events for valid code', async () => {
    generateContentMock.mockResolvedValue(makeResult(JSON.stringify(VALID_ANSWER)));

    const res = await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({ code: 'def solution(n):\n  retrun n * 2', language: 'python' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (c) => { data += c.toString(); });
        res.on('end', () => cb(null, data));
      });

    // supertest custom parser puts the accumulated string in res.body
    const body = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    expect(res.status).toBe(200);
    expect(body).toContain('event: answer');
    expect(body).toContain('event: done');
    expect(body).toContain('"hackerrank_compatible":true');
  });

  it('includes hint in prompt when provided', async () => {
    generateContentMock.mockResolvedValue(makeResult(JSON.stringify(VALID_ANSWER)));

    await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({
        code: 'def solution(n):\n  retrun n * 2',
        language: 'python',
        hint: 'typo in return',
      })
      .buffer(true)
      .parse((res, cb) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => cb(null, d));
      });

    // Gemini's sendMessageStream() receives the full prompt as a plain string.
    const sentText = generateContentMock.mock.calls[0][0];
    expect(sentText).toContain('typo in return');
  });

  it('threads the problem statement into the prompt when provided', async () => {
    generateContentMock.mockResolvedValue(makeResult(JSON.stringify(VALID_ANSWER)));

    await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({
        code: 'def solution(n):\n  retrun n * 2',
        language: 'python',
        problem: 'Given an integer n, return n doubled.',
      })
      .buffer(true)
      .parse((res, cb) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => cb(null, d));
      });

    const sentText = generateContentMock.mock.calls[0][0];
    expect(sentText).toContain('PROBLEM STATEMENT');
    expect(sentText).toContain('return n doubled');
  });

  it('activates TEMPLATE-SOLVE mode for a locked HackerRank template (empty body + __main__ harness)', async () => {
    generateContentMock.mockResolvedValue(makeResult(JSON.stringify(VALID_ANSWER)));

    const template = [
      'def count_substring(string, sub_string):',
      '    return',
      '',
      "if __name__ == '__main__':",
      '    string = input().strip()',
      '    sub_string = input().strip()',
      '    count = count_substring(string, sub_string)',
      '    print(count)',
    ].join('\n');

    await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({
        code: template,
        language: 'python',
        problem: 'Count occurrences of sub_string in string (overlapping).',
      })
      .buffer(true)
      .parse((res, cb) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => cb(null, d));
      });

    const sentText = generateContentMock.mock.calls[0][0];
    expect(sentText).toContain('SITUATION: PLATFORM TEMPLATE');
    expect(sentText).toContain('CHARACTER-FOR-CHARACTER');
    // the problem must also be threaded so the empty body gets solved, not guessed
    expect(sentText).toContain('Count occurrences of sub_string');
  });

  it('activates TEMPLATE-SOLVE mode for a MINIMAL imports-only template (numpy) and forbids inventing a wrapper', async () => {
    generateContentMock.mockResolvedValue(makeResult(JSON.stringify(VALID_ANSWER)));

    await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({
        code: 'import numpy\n',
        language: 'python',
        problem: 'Print a numpy array of zeros then ones with the given shape.',
      })
      .buffer(true)
      .parse((res, cb) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => cb(null, d));
      });

    const sentText = generateContentMock.mock.calls[0][0];
    expect(sentText).toContain('SITUATION: PLATFORM TEMPLATE');
    // The minimal template must complete INLINE, never wrapped in a new function.
    expect(sentText).toMatch(/MINIMAL \/ INLINE skeleton/i);
    expect(sentText).toMatch(/DO NOT invent a wrapper function/i);
  });

  it('does NOT activate TEMPLATE-SOLVE mode for ordinary broken code', async () => {
    generateContentMock.mockResolvedValue(makeResult(JSON.stringify(VALID_ANSWER)));

    await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({ code: 'def solution(n):\n  retrun n * 2', language: 'python' })
      .buffer(true)
      .parse((res, cb) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => cb(null, d));
      });

    const sentText = generateContentMock.mock.calls[0][0];
    expect(sentText).not.toContain('TEMPLATE-SOLVE MODE');
  });

  it('returns 400 for unsupported language', async () => {
    const res = await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({ code: 'def solution(n):\n  return n', language: 'brainfuck' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported language/i);
  });

  it('returns 400 when code exceeds 50000 chars', async () => {
    const res = await request(app)
      .post('/api/v1/coding/cofix/stream')
      .send({ code: 'x'.repeat(50001), language: 'python' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too large/i);
  });
});
