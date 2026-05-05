import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));

const hybridKbMock = vi.fn();
const hybridUserMock = vi.fn();
vi.mock('../src/services/hybridRetrieval.js', () => ({
  hybridSearchKb: hybridKbMock,
  hybridSearchUserDocs: hybridUserMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  hybridKbMock.mockReset();
  hybridUserMock.mockReset();
  vi.resetModules();
});

describe('buildSessionKit', () => {
  it('returns skipped when prepData has no JD/resume', async () => {
    const { buildSessionKit } = await import('../src/services/sessionKit.js');
    const r = await buildSessionKit({ userId: 1, prepData: null });
    expect(r.skipped).toBe(true);
  });

  it('runs hybrid search per derived seed and stores results in kit', async () => {
    hybridKbMock.mockResolvedValue([{ tier: 'kb', id: 'k1', source: 'capra-sre', topicTitle: 'T', section: 's', content: 'x' }]);
    hybridUserMock.mockResolvedValue([{ tier: 'user', id: 'u1', docKind: 'jd', section: 'body', content: 'y' }]);
    queryMock.mockResolvedValue({ rows: [] });
    const { buildSessionKit } = await import('../src/services/sessionKit.js');
    const r = await buildSessionKit({
      userId: 42,
      prepData: { activeCompany: 'X', data: { X: { jd: 'SRE Kubernetes Go observability', resume: 'CI/CD pipelines' } } },
    });
    expect(r.skipped).toBeFalsy();
    expect(hybridKbMock).toHaveBeenCalled();
    const upsertCall = queryMock.mock.calls.find((c) => c[0].includes('lumora_session_kit'));
    expect(upsertCall).toBeDefined();
    expect(upsertCall[1][0]).toBe(42);
    const kit = JSON.parse(upsertCall[1][1]);
    expect(Array.isArray(kit.chunks)).toBe(true);
    expect(kit.chunks.length).toBeGreaterThan(0);
  });
});

describe('readSessionKit', () => {
  it('returns null when no row exists', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { readSessionKit } = await import('../src/services/sessionKit.js');
    expect(await readSessionKit(1)).toBeNull();
  });
  it('returns the kit when fresh', async () => {
    queryMock.mockResolvedValue({ rows: [{ kit: { chunks: [{ id: 'k1' }] }, updated_at: new Date() }] });
    const { readSessionKit } = await import('../src/services/sessionKit.js');
    const k = await readSessionKit(1);
    expect(k.chunks).toHaveLength(1);
  });
});
