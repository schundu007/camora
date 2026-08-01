import { describe, it, expect, vi, beforeEach } from 'vitest';

// disableAutoTopup must clear the flag on the table that actually holds it:
// teams.auto_topup_pack for team billing, ascend_subscriptions.auto_topup_pack
// for solo. The regression: the decline handler always cleared
// ascend_subscriptions, a no-op for teams, leaving teams.auto_topup_pack set so
// every budget exhaustion retried the same declined card (Stripe retry loop).

vi.mock('../src/config/stripe.js', () => ({ stripe: {}, STRIPE_PRICES: {} }));
vi.mock('../src/lib/shared-db.js', () => ({ query: vi.fn() }));
vi.mock('../src/middleware/requestLogger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { query } = await import('../src/lib/shared-db.js');
const { disableAutoTopup } = await import('../src/services/autoTopupService.js');

describe('disableAutoTopup — clears the correct billing subject', () => {
  beforeEach(() => { query.mockReset(); query.mockResolvedValue({ rows: [] }); });

  it('team billing clears teams.auto_topup_pack keyed by team id', async () => {
    await disableAutoTopup({ teamId: 42, billingUserId: 7 });
    const [sql, params] = query.mock.calls.at(-1);
    expect(sql).toContain('UPDATE teams');
    expect(sql).toContain('WHERE id = $1');
    expect(params).toEqual([42]);
  });

  it('solo billing clears ascend_subscriptions keyed by user id', async () => {
    await disableAutoTopup({ teamId: null, billingUserId: 7 });
    const [sql, params] = query.mock.calls.at(-1);
    expect(sql).toContain('UPDATE ascend_subscriptions');
    expect(sql).toContain('WHERE user_id = $1');
    expect(params).toEqual([7]);
  });

  it('never touches ascend_subscriptions when a team is the billing subject', async () => {
    await disableAutoTopup({ teamId: 99, billingUserId: 3 });
    const touchedSubs = query.mock.calls.some(([sql]) => sql.includes('ascend_subscriptions'));
    expect(touchedSubs).toBe(false);
  });
});
