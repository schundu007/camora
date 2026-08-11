/**
 * PUT /api/v1/prep/state size cap.
 *
 * The Prep Kit panel PUTs the WHOLE PrepData blob on every change —
 * every company's JD + resume + cover letter + prep materials + the full
 * text of every study doc + every generated section. A single GitHub repo
 * fetch alone contributes up to 600 KB (routes/github.js MAX_TOTAL_BYTES),
 * and the UI tells users "Add as many as you want".
 *
 * The old 2 MB cap was below what a normal multi-company kit reaches, so
 * users hit a permanent 413: every later save failed, which also froze the
 * RAG index (indexUserPrepDocs / buildSessionKit only run after a save
 * that succeeds). These tests pin the cap to a realistic budget and pin
 * the error shape the frontend needs to render a usable message.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

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

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({
  query: (...args) => queryMock(...args),
}));

vi.mock('../src/services/companyContext.js', () => ({
  refreshCompanyContext: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/services/userDocIndexer.js', () => ({
  indexUserPrepDocs: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/services/sessionKit.js', () => ({
  buildSessionKit: vi.fn(() => Promise.resolve()),
  clearSessionKit: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/services/webWatchlist.js', () => ({
  buildWebWatchlist: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/lib/r2.js', () => ({
  r2: { send: vi.fn(() => Promise.resolve()) },
  R2_BUCKET: 'test-bucket',
}));

const { default: prepRouter } = await import('../src/routes/prep.js');

// Mirrors src/index.js: express.json({ limit: '10mb' }) in front of the route.
const makeApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/v1/prep', prepRouter);
  return app;
};

/** A PrepData-shaped blob whose serialized size is ~`mb` megabytes. */
const blobOfSize = (mb) => ({
  companies: ['Acme'],
  activeCompany: 'Acme',
  data: {
    Acme: {
      jd: 'x',
      resume: 'x',
      coverLetter: '',
      prepMaterials: '',
      studyDocs: [{ name: 'repo.md', content: 'y'.repeat(Math.round(mb * 1024 * 1024)) }],
      sections: {},
    },
  },
});

describe('PUT /api/v1/prep/state size cap', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [{ updated_at: '2026-08-11T00:00:00Z' }] });
  });

  it('accepts a realistic multi-company kit (3 MB) that the old 2 MB cap rejected', async () => {
    const res = await request(makeApp())
      .put('/api/v1/prep/state')
      .send({ data: blobOfSize(3) });

    expect(res.status).toBe(200);
    expect(res.body.updated_at).toBeTruthy();
  });

  it('still accepts a kit just under the cap (7.5 MB)', async () => {
    const res = await request(makeApp())
      .put('/api/v1/prep/state')
      .send({ data: blobOfSize(7.5) });

    expect(res.status).toBe(200);
  });

  it('rejects a blob over the cap with 413 and an actionable message', async () => {
    const res = await request(makeApp())
      .put('/api/v1/prep/state')
      .send({ data: blobOfSize(9) });

    expect(res.status).toBe(413);
    // The frontend surfaces this string verbatim, so it must name the
    // limit, the actual size, and what the user can do about it.
    expect(res.body.error).toMatch(/8 MB/);
    expect(res.body.error).toMatch(/9(\.\d+)? MB/);
    expect(res.body.error).toMatch(/study doc|archive/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a non-object payload with 400', async () => {
    const res = await request(makeApp())
      .put('/api/v1/prep/state')
      .send({ data: 'nope' });

    expect(res.status).toBe(400);
  });
});
