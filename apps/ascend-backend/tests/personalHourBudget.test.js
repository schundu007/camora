import { describe, it, expect, vi, beforeEach } from 'vitest';

// checkPersonalHourBudget is the single source of truth for solo included
// hours: pool = PERSONAL_HOUR_BUDGETS[plan].hours (per-period baseline) +
// sum(unexpired topups). These tests pin that the baseline is counted EXACTLY
// once — the regression being the billing.js renewal INSERT that used to add a
// second copy of the included hours as a topup row (double-count from period 2).

vi.mock('../src/lib/shared-db.js', () => ({ query: vi.fn() }));
vi.mock('../src/services/redis.js', () => ({
  cacheGet: vi.fn(), cacheSet: vi.fn(), cacheDel: vi.fn(),
}));
vi.mock('../src/middleware/requestLogger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { query } = await import('../src/lib/shared-db.js');
const { checkPersonalHourBudget } = await import('../src/services/teamService.js');

const PERIOD_START = new Date('2026-07-01T00:00:00Z');

/**
 * Wire up the 3 sequential query() calls checkPersonalHourBudget makes for a
 * paid solo user: subscription row, period usage sum, unexpired-topup sum.
 */
function mockSolo({ planType = 'pro_monthly', usedSeconds = 0, topupHours = 0 }) {
  query
    .mockResolvedValueOnce({ rows: [{ plan_type: planType, current_period_start: PERIOD_START, trial_ends_at: null }] })
    .mockResolvedValueOnce({ rows: [{ s: usedSeconds }] })   // period-windowed usage
    .mockResolvedValueOnce({ rows: [{ h: topupHours }] });    // sumUnexpiredTopups
}

describe('checkPersonalHourBudget — solo included hours counted once', () => {
  beforeEach(() => { query.mockReset(); });

  it('pro_monthly with no topups exposes exactly the 2h baseline (not 4h)', async () => {
    mockSolo({ planType: 'pro_monthly', usedSeconds: 1800, topupHours: 0 });
    const res = await checkPersonalHourBudget(7);
    expect(res.pool_hours).toBe(2);        // baseline only — NOT doubled
    expect(res.topup_hours).toBe(0);
    expect(res.remaining_hours).toBeCloseTo(1.5, 5); // 2 - 0.5h used
    expect(res.ok).toBe(true);
  });

  it('pro_yearly with no topups exposes exactly the 5h baseline', async () => {
    mockSolo({ planType: 'pro_yearly', usedSeconds: 0, topupHours: 0 });
    const res = await checkPersonalHourBudget(7);
    expect(res.pool_hours).toBe(5);
  });

  it('paid topups add on TOP of the baseline exactly once (2h + 1h = 3h)', async () => {
    mockSolo({ planType: 'pro_monthly', usedSeconds: 0, topupHours: 1 });
    const res = await checkPersonalHourBudget(7);
    expect(res.pool_hours).toBe(3);
    expect(res.topup_hours).toBe(1);
  });
});
