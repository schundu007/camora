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
function makeStream(text) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    },
  };
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

  it('streams token + answer + done events for valid code', async () => {
    mockStream.mockResolvedValue(makeStream(JSON.stringify(VALID_ANSWER)));

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
    expect(body).toContain('event: token');
    expect(body).toContain('event: answer');
    expect(body).toContain('event: done');
    expect(body).toContain('"hackerrank_compatible":true');
  });

  it('includes hint in prompt when provided', async () => {
    mockStream.mockResolvedValue(makeStream(JSON.stringify(VALID_ANSWER)));

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

    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('typo in return');
  });
});
