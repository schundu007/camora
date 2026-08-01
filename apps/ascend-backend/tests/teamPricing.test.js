import { describe, it, expect, vi } from 'vitest';

// STRIPE-001 / STRIPE-002: team pricing is TIERED and computeTeamPriceCents is
// the single source of truth used BOTH at checkout and by the /prices API
// (which builds amount_cents_by_seats from this function). These tests pin the
// tiered schedule and guard against a regression to the old linear seats*$20-$1
// model that mis-advertised $499 for 25 seats while Stripe charged $249.

// billing.js pulls in Stripe/DB/etc at import — stub them so we can import the
// pure pricing helper without side effects.
vi.mock('../src/config/stripe.js', () => ({ stripe: {}, STRIPE_PRICES: {}, isStripeConfigured: () => true }));
vi.mock('../src/lib/shared-db.js', () => ({ query: vi.fn() }));
vi.mock('../src/middleware/jwtAuth.js', () => ({ jwtAuth: vi.fn() }));
vi.mock('../src/services/creditService.js', () => ({ addCredits: vi.fn() }));
vi.mock('../src/services/autoTopupService.js', () => ({ validateAutoTopupConfig: vi.fn() }));
vi.mock('../src/middleware/requestLogger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/lib/plans.js', () => ({ PAID_PLAN_TYPES: new Set(['pro_monthly', 'pro_yearly', 'team']) }));

const { computeTeamPriceCents } = await import('../src/routes/billing.js');

describe('computeTeamPriceCents — tiered team pricing (STRIPE-001/002)', () => {
  it('matches the published tier breakpoints', () => {
    expect(computeTeamPriceCents(5)).toBe(4900);   // $49
    expect(computeTeamPriceCents(10)).toBe(9900);  // $99
    expect(computeTeamPriceCents(25)).toBe(24900); // $249
    expect(computeTeamPriceCents(50)).toBe(34900); // $349
  });

  it('is NOT the old linear seats*$20-$1 model', () => {
    // 25 seats: tiered $249, not linear $499
    expect(computeTeamPriceCents(25)).not.toBe((25 * 20 - 1) * 100);
    expect(computeTeamPriceCents(25)).toBe(24900);
  });

  it('clamps seats to the 5..50 range', () => {
    expect(computeTeamPriceCents(3)).toBe(4900);    // below min → 5 seats
    expect(computeTeamPriceCents(0)).toBe(4900);
    expect(computeTeamPriceCents(100)).toBe(34900); // above max → 50 seats
  });
});
