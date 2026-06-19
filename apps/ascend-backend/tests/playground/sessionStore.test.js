import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/database.js', () => ({ query: vi.fn() }));
vi.mock('../../src/services/redis.js', () => ({ cacheSet: vi.fn(), cacheDel: vi.fn() }));

const { query } = await import('../../src/config/database.js');

describe('updateSessionStatus', () => {
  beforeEach(() => { query.mockReset(); });

  it('stamps became_ready_at when status is ready', async () => {
    query.mockResolvedValue({ rows: [{ id: 'abc', status: 'ready' }] });
    const { updateSessionStatus } = await import('../../src/services/playground/sessionStore.js');
    await updateSessionStatus('abc', 'ready');
    const sql = query.mock.calls.at(-1)[0];
    expect(sql).toContain('became_ready_at');
  });

  it('does not add became_ready_at for non-ready statuses', async () => {
    query.mockResolvedValue({ rows: [{ id: 'abc', status: 'destroyed' }] });
    const { updateSessionStatus } = await import('../../src/services/playground/sessionStore.js');
    await updateSessionStatus('abc', 'destroyed');
    const sql = query.mock.calls.at(-1)[0];
    expect(sql).not.toContain('became_ready_at');
  });
});

describe('markRadarReady', () => {
  beforeEach(() => { query.mockReset(); });

  it('sets radar_ready = true for the given sessionId', async () => {
    query.mockResolvedValue({ rows: [] });
    const { markRadarReady } = await import('../../src/services/playground/sessionStore.js');
    await markRadarReady('session-123');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('radar_ready = true'),
      ['session-123'],
    );
  });
});
