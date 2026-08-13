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

describe('study material indexing', () => {
  const vecs = (n) => new Array(n).fill(0).map((_, i) => new Array(1536).fill(i / 100));

  it('indexes prepMaterials and studyDocs, tagging study docs as study_doc', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    embedBatchMock.mockImplementation((texts) => Promise.resolve(vecs(texts.length)));
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');

    const r = await indexUserPrepDocs({
      userId: 7,
      prepData: {
        activeCompany: 'NVIDIA',
        data: {
          NVIDIA: {
            resume: 'Owned ArgoCD and FluxCD rollouts across bare metal and AWS.',
            prepMaterials: 'Hiring manager briefing: lead with developer tooling.',
            studyDocs: [
              { name: 'GFN Kit.docx', content: 'Zone reservation and lease system. Fencing tokens prevent a stale holder from acting.' },
              { name: 'StackStorm.md', content: 'Sensors emit triggers; rules match criteria and fire actions or Orquesta workflows.' },
            ],
          },
        },
      },
    });

    expect(r.written).toBe(4);
    const inserts = queryMock.mock.calls.filter(([sql]) => sql.includes('INSERT INTO lumora_user_doc_chunks'));
    const kinds = inserts.map(([, params]) => params[2]);
    expect(kinds).toEqual(['resume', 'prep_materials', 'study_doc', 'study_doc']);
    // Study docs carry their original filename so citations stay attributable.
    expect(JSON.parse(inserts[2][1][7]).fileName).toBe('GFN Kit.docx');
  });

  it('leaves R2-sourced research_doc rows alone when reindexing the prep blob', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    embedBatchMock.mockImplementation((texts) => Promise.resolve(vecs(texts.length)));
    const { indexUserPrepDocs } = await import('../src/services/userDocIndexer.js');

    await indexUserPrepDocs({
      userId: 9,
      prepData: { activeCompany: 'NVIDIA', data: { NVIDIA: { resume: 'GitOps at scale.' } } },
    });

    const del = queryMock.mock.calls.find(([sql]) => sql.startsWith('DELETE FROM lumora_user_doc_chunks'));
    expect(del[0]).toContain('source_key IS NULL');
  });
});
