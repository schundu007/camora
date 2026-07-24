import { describe, it, expect, vi, beforeEach } from 'vitest';

const queries = [];
vi.mock('../src/lib/shared-db.js', () => ({
  query: vi.fn(async (sql, params) => {
    queries.push({ sql, params });
    return { rows: [] };
  }),
}));
vi.mock('../src/services/hybridRetrieval.js', () => ({
  hybridSearchKb: vi.fn(async () => []),
  hybridSearchUserDocs: vi.fn(async () => []),
}));

const { buildSessionKit, clearSessionKit } = await import('../src/services/sessionKit.js');

const deletes = () => queries.filter(q => /DELETE FROM lumora_session_kit/i.test(q.sql));

beforeEach(() => { queries.length = 0; });

describe('a stale kit must never outlive the prep data it came from', () => {
  // retrieve() PREFERS the warm kit and short-circuits live retrieval, so a kit
  // left behind by a skipped rebuild silently grounds every later answer on the
  // wrong company's material. That is how answers kept coming from a deleted
  // AMD prep kit after the user switched to Salesforce.

  it('clears the kit when the active company has no documents yet', async () => {
    const r = await buildSessionKit({
      userId: 7,
      prepData: { activeCompany: 'Salesforce', data: { Salesforce: {} } },
    });
    expect(r.skipped).toBe(true);
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0].params).toEqual([7]);
  });

  it('clears the kit when the active company is missing entirely', async () => {
    const r = await buildSessionKit({ userId: 7, prepData: { data: {} } });
    expect(r.skipped).toBe(true);
    expect(deletes()).toHaveLength(1);
  });

  it('clears the kit when prepData is absent', async () => {
    const r = await buildSessionKit({ userId: 7, prepData: null });
    expect(r.skipped).toBe(true);
    expect(deletes()).toHaveLength(1);
  });

  it('clears the kit when documents yield no usable seed terms', async () => {
    const r = await buildSessionKit({
      userId: 7,
      prepData: { activeCompany: 'Acme', data: { Acme: { jd: '...', resume: '!!!' } } },
    });
    expect(r.skipped).toBe(true);
    expect(deletes()).toHaveLength(1);
  });

  it('clearSessionKit deletes only the requested user', async () => {
    await clearSessionKit(42);
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0].params).toEqual([42]);
  });

  it('is a no-op without a user id', async () => {
    await clearSessionKit(undefined);
    expect(deletes()).toHaveLength(0);
  });
});

describe('a real build still stores a kit', () => {
  it('writes the kit stamped with the company it was built for', async () => {
    await buildSessionKit({
      userId: 7,
      prepData: {
        activeCompany: 'Salesforce',
        data: { Salesforce: { jd: 'Kubernetes Terraform Kafka pipelines', resume: 'Jenkins GitLab' } },
      },
    });
    const insert = queries.find(q => /INSERT INTO lumora_session_kit/i.test(q.sql));
    expect(insert).toBeTruthy();
    const kit = JSON.parse(insert.params[1]);
    expect(kit.company).toBe('Salesforce');
    // Nothing was cleared — the build succeeded.
    expect(deletes()).toHaveLength(0);
  });
});
