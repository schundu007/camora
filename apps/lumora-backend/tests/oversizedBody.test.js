/**
 * Oversized / malformed request bodies must surface as client errors.
 *
 * express.json({ limit: '10mb' }) in src/index.js rejects bodies past the
 * parser limit with a body-parser error carrying type 'entity.too.large'.
 * The global error handler used to flatten every error to 500 "Internal
 * server error", so a user whose Prep Kit grew past the parser limit was
 * told the backend had broken. These pin the passthrough.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('openai', () => ({ default: class { constructor() {} } }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: function FakeAnthropic() {
    return { messages: { stream: vi.fn(), create: vi.fn() } };
  },
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return { getGenerativeModel: () => ({ generateContent: vi.fn(), startChat: () => ({ sendMessageStream: vi.fn() }) }) };
  }),
}));

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
vi.mock('../src/middleware/requirePaidSubscription.js', () => ({
  requirePaidSubscription: (_req, _res, next) => next(),
}));
vi.mock('../src/middleware/usageLimits.js', () => ({
  checkUsage: () => (_req, _res, next) => next(),
  recordUsageCount: () => Promise.resolve(),
}));
vi.mock('../src/lib/shared-db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));
vi.mock('../src/lib/shared-auth.js', () => ({
  verifyToken: vi.fn(() => ({ sub: 'u1', email: 't@t.com', type: 'access' })),
}));

const { default: app } = await import('../src/index.js');

describe('global error handler — body-parser rejections', () => {
  it('returns 413, not 500, when the body exceeds the express.json limit', async () => {
    // 11 MB > the 10mb parser limit → body-parser 'entity.too.large'.
    const huge = JSON.stringify({ data: { blob: 'x'.repeat(11 * 1024 * 1024) } });

    const res = await request(app)
      .put('/api/v1/prep/state')
      .set('Content-Type', 'application/json')
      .send(huge);

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  it('returns 400, not 500, on malformed JSON', async () => {
    const res = await request(app)
      .put('/api/v1/prep/state')
      .set('Content-Type', 'application/json')
      .send('{"data": {oops}');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/malformed json/i);
  });
});
