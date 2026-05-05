import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const embedBatchMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedBatch: embedBatchMock }));

beforeEach(() => {
  queryMock.mockReset();
  embedBatchMock.mockReset();
});

describe('indexUserPrepDocs', () => {
  it('returns { skipped: true } when prep blob has no content', async () => {
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');
    const r = await indexUserPrepDocs({ userId: 1, prepData: { activeCompany: 'NVIDIA', data: { NVIDIA: { jd: '', resume: '' } } } });
    expect(r.skipped).toBe(true);
    expect(embedBatchMock).not.toHaveBeenCalled();
  });

  it('chunks JD, resume, cover_letter and inserts one row each', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    embedBatchMock.mockResolvedValue([
      new Array(1536).fill(0.1),
      new Array(1536).fill(0.2),
      new Array(1536).fill(0.3),
    ]);
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');
    const r = await indexUserPrepDocs({
      userId: 42,
      prepData: {
        activeCompany: 'NVIDIA',
        data: {
          NVIDIA: {
            jd: 'Senior SRE for Isaac robotics. Kubernetes, Go, observability.',
            resume: 'CI/CD owner at Trackonomy. GitLab pipelines at OSDU.',
            coverLetter: 'I want to work on Isaac because of robotic simulation.',
          },
        },
      },
    });

    expect(r.skipped).toBeFalsy();
    expect(r.written).toBe(3);
    // First call is DELETE, second is embed call (mocked), then 3 INSERTs.
    const deleteCall = queryMock.mock.calls.find((c) => c[0].startsWith('DELETE'));
    expect(deleteCall).toBeDefined();
    expect(deleteCall[1][0]).toBe(42);
    const insertCalls = queryMock.mock.calls.filter((c) => c[0].startsWith('INSERT'));
    expect(insertCalls).toHaveLength(3);
    const kinds = insertCalls.map((c) => c[1][2]);
    expect(kinds).toEqual(expect.arrayContaining(['jd', 'resume', 'cover_letter']));
  });

  it('splits a long JD into multiple chunks', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    embedBatchMock.mockImplementation((arr) =>
      Promise.resolve(arr.map(() => new Array(1536).fill(0.5))),
    );
    const longJd = 'Responsibilities:\n\n' + 'Build production systems. '.repeat(800);
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');
    const r = await indexUserPrepDocs({
      userId: 7,
      prepData: { activeCompany: 'X', data: { X: { jd: longJd, resume: 'short resume' } } },
    });
    const insertCalls = queryMock.mock.calls.filter((c) => c[0].startsWith('INSERT'));
    const jdInserts = insertCalls.filter((c) => c[1][2] === 'jd');
    expect(jdInserts.length).toBeGreaterThan(1);
  });
});
