import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dialogAlert } from './Dialog';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Pricing v3.1 — solo + team + per-hour topup ─────────────────────────
 *
 * Three buckets:
 *
 *   Solo
 *     · Monthly         — $19/month (popular)
 *     · Yearly          — $99/year (best value, ~57% off vs monthly × 12)
 *
 *   Team (monthly only)
 *     · Team 5          — $99/month, 5 seats
 *     · Team 10         — $199/month, 10 seats
 *     · Team 15         — $299/month, 15 seats
 *
 *   AI Hours (top-up, paid users only)
 *     · 1 hour at $15. Quantity selector at checkout — Stripe charges
 *       $15 × N via the line-item quantity field. No need for separate
 *       price IDs per N. Free users see a "subscribe first" prompt
 *       (the backend also enforces this with a 403).
 *
 * Backend price keys (kept in stripe.js / billing.js):
 *   pro_monthly, pro_yearly, team_5, team_10, team_15, topup_1h.
 */

export interface PlanCard {
  id: 'monthly' | 'yearly' | 'team_5' | 'team_10' | 'team_15';
  name: string;
  price: string;
  period: string;
  priceKey: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: 'popular' | 'best';
  bucket: 'solo' | 'team';
}

export const SOLO_PLANS: PlanCard[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$19',
    period: '/month',
    priceKey: 'pro_monthly',
    description: 'Full access, billed monthly. Cancel any time.',
    features: [
      'Unlimited Lumora live interview sessions',
      'All Capra prep topics (800+)',
      'Coding solver, system design, behavioral STAR',
      'Voice filtering and architecture diagrams',
    ],
    cta: 'Start Monthly',
    highlight: 'popular',
    bucket: 'solo',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$99',
    period: '/year',
    priceKey: 'pro_yearly',
    description: 'Same access, ~57% off vs monthly × 12.',
    features: [
      'Everything in Monthly',
      'Equivalent to $8.25/month',
      'One annual charge — set and forget',
      'Best for active interview cycles',
    ],
    cta: 'Start Yearly',
    highlight: 'best',
    bucket: 'solo',
  },
];

export const TEAM_PLANS: PlanCard[] = [
  {
    id: 'team_5',
    name: 'Team 5',
    price: '$99',
    period: '/month',
    priceKey: 'team_5',
    description: 'Up to 5 seats. Single invoice.',
    features: [
      'Everything in Monthly',
      '5 team seats',
      'Centralized billing (one invoice)',
      'Per-member usage breakdown',
      'Pooled hour top-ups',
    ],
    cta: 'Start Team 5',
    bucket: 'team',
  },
  {
    id: 'team_10',
    name: 'Team 10',
    price: '$199',
    period: '/month',
    priceKey: 'team_10',
    description: 'Up to 10 seats. For small teams.',
    features: [
      'Everything in Team 5',
      '10 team seats',
      'Pooled hour top-ups',
      'Bootcamp / cohort friendly',
    ],
    cta: 'Start Team 10',
    highlight: 'popular',
    bucket: 'team',
  },
  {
    id: 'team_15',
    name: 'Team 15',
    price: '$299',
    period: '/month',
    priceKey: 'team_15',
    description: 'Up to 15 seats. Best per-seat rate.',
    features: [
      'Everything in Team 10',
      '15 team seats',
      'Effective $19.93/seat',
      'For larger cohorts and recruiting teams',
    ],
    cta: 'Start Team 15',
    highlight: 'best',
    bucket: 'team',
  },
];

export const PLANS: PlanCard[] = [...SOLO_PLANS, ...TEAM_PLANS];

const HOUR_RATE_USD = 15;
const HOUR_RATE_DISPLAY = `$${HOUR_RATE_USD}`;

/* ── Shared price fetching hook ── */
export function usePlanPrices() {
  const [prices, setPrices] = useState<Record<string, { priceId: string }> | null>(null);

  useEffect(() => {
    fetch(`${BILLING_API}/api/v1/billing/prices`)
      .then(r => r.json())
      .then(data => {
        const mapped: Record<string, { priceId: string }> = {};
        const flat: Record<string, { priceId?: string; stripe_price_id?: string }> = {};
        if (Array.isArray(data?.plans)) {
          for (const p of data.plans) flat[p.id] = p;
        } else if (data && typeof data === 'object') {
          for (const k of Object.keys(data)) {
            if (data[k] && typeof data[k] === 'object') flat[k] = data[k];
          }
        }
        for (const id of Object.keys(flat)) {
          const v = flat[id];
          const pid = v.priceId || v.stripe_price_id || '';
          if (pid) mapped[id] = { priceId: pid };
        }
        setPrices(mapped);
      })
      .catch(err => console.error('Failed to load plans:', err));
  }, []);

  return prices;
}

/* ── Shared checkout handler ── */
export function useCheckout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState('');

  const checkout = async (priceId: string, planName: string, opts?: { quantity?: number }) => {
    if (!priceId) { navigate('/pricing'); return; }
    if (!token) { navigate('/login'); return; }
    setLoading(planName);
    const raw = searchParams.get('returnTo');
    const returnTo = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/lumora';
    const sep = returnTo.includes('?') ? '&' : '?';
    const successUrl = `${window.location.origin}${returnTo}${sep}checkout=success`;
    try {
      const resp = await fetch(`${BILLING_API}/api/v1/billing/checkout`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price_id: priceId,
          success_url: successUrl,
          cancel_url: window.location.href,
          ...(opts?.quantity ? { quantity: opts.quantity } : {}),
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        if (resp.status === 403 && body?.code === 'SUBSCRIPTION_REQUIRED_FOR_TOPUP') {
          dialogAlert({
            title: 'Subscribe first',
            message: 'Hour top-ups are available to active subscribers. Pick Monthly, Yearly, or a Team plan to unlock per-hour purchases.',
            tone: 'warning',
          });
        } else if (resp.status === 503 || resp.status === 400) {
          dialogAlert({ title: 'Payment service unavailable', message: 'Please try again in a moment.', tone: 'danger' });
        } else if (body?.error) {
          dialogAlert({ title: 'Checkout failed', message: body.error, tone: 'danger' });
        }
        setLoading('');
        return;
      }
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
      else dialogAlert({ title: 'Could not start checkout', message: 'Please try again.', tone: 'danger' });
    } catch {
      dialogAlert({ title: 'Payment service error', message: 'Please try again later.', tone: 'danger' });
    } finally {
      setLoading('');
    }
  };

  return { checkout, loading };
}

/* ── Single plan card ── */
function PlanCardView({ plan, prices, checkout, loading, navigate }: {
  plan: PlanCard;
  prices: Record<string, { priceId: string }> | null;
  checkout: (priceId: string, planName: string) => void;
  loading: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const priceId = prices?.[plan.priceKey]?.priceId || '';
  const highlighted = plan.highlight === 'popular' || plan.highlight === 'best';
  const highlightBg = 'var(--cam-primary-dk)';
  const highlightFg = '#FFFFFF';
  const highlightFgMuted = 'rgba(255,255,255,0.72)';
  const highlightBorder = 'rgba(255,255,255,0.20)';

  return (
    <div
      className="group flex flex-col rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: highlighted ? highlightBg : 'var(--bg-surface)',
        border: highlighted ? `2px solid ${highlightBg}` : '1px solid var(--border)',
      }}
    >
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold" style={{ color: highlighted ? highlightFgMuted : 'var(--text-primary)' }}>{plan.name}</h3>
          {plan.highlight === 'popular' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#FFFFFF', color: highlightBg }}>POPULAR</span>}
          {plan.highlight === 'best' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--cam-gold-leaf)', color: highlightBg }}>BEST VALUE</span>}
        </div>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-4xl font-extrabold" style={{ color: highlighted ? highlightFg : 'var(--text-primary)' }}>{plan.price}</span>
          <span className="text-[13px]" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.period}</span>
        </div>
        <p className="text-[12px] mb-4 leading-relaxed" style={{ color: highlighted ? highlightFgMuted : 'var(--text-secondary)' }}>{plan.description}</p>

        <ul className="space-y-2 flex-1 mb-4">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke={highlighted ? highlightFg : 'var(--accent)'} strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ color: highlighted ? highlightFg : 'var(--text-secondary)' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-6 pb-6">
        <button
          onClick={() => priceId ? checkout(priceId, plan.name) : navigate('/pricing')}
          disabled={loading === plan.name}
          className="w-full py-2.5 text-[12px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50"
          style={{
            background: highlighted ? '#FFFFFF' : 'var(--bg-elevated)',
            color: highlighted ? highlightBg : 'var(--text-primary)',
            border: highlighted ? `1px solid ${highlightBorder}` : '1px solid var(--border)',
          }}
        >
          {loading === plan.name ? 'Processing…' : plan.cta}
        </button>
      </div>
    </div>
  );
}

/* ── Hour top-up card with quantity selector ── */
function HourTopupCard({ prices, checkout, loading }: {
  prices: Record<string, { priceId: string }> | null;
  checkout: (priceId: string, planName: string, opts?: { quantity?: number }) => void;
  loading: string;
}) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const priceId = prices?.['topup_1h']?.priceId || '';
  const total = HOUR_RATE_USD * qty;

  const presets = [1, 5, 10];

  return (
    <div
      className="rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary-dk)' }}>PAY-AS-YOU-GO</span>
        </div>
        <h3 className="text-xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>AI Hours</h3>
        <p className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>
          {HOUR_RATE_DISPLAY}/hour. Pick how many — Stripe charges {HOUR_RATE_DISPLAY} × quantity.
          90-day expiry per hour. Subscribers only.
        </p>
        <div className="flex items-center gap-2">
          {presets.map((n) => (
            <button
              key={n}
              onClick={() => setQty(n)}
              className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: qty === n ? 'var(--cam-primary)' : 'var(--bg-elevated)',
                color: qty === n ? '#FFFFFF' : 'var(--text-primary)',
                border: `1px solid ${qty === n ? 'var(--cam-primary)' : 'var(--border)'}`,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {n}h
            </button>
          ))}
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>or</span>
          <input
            type="number"
            min={1}
            max={50}
            value={qty}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v)) setQty(Math.max(1, Math.min(50, v)));
            }}
            className="w-16 px-2 py-1.5 text-[11px] font-mono rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            aria-label="AI hours quantity"
          />
        </div>
      </div>
      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>${total}</span>
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>for {qty} {qty === 1 ? 'hour' : 'hours'}</span>
        </div>
        <button
          onClick={() => priceId ? checkout(priceId, `${qty}h Top-up`, { quantity: qty }) : navigate('/pricing')}
          disabled={loading === `${qty}h Top-up`}
          className="px-4 py-2 text-[12px] font-bold rounded-lg cursor-pointer disabled:opacity-50"
          style={{ background: 'var(--cam-primary)', color: '#FFFFFF', border: '1px solid var(--cam-primary-dk)' }}
        >
          {loading === `${qty}h Top-up` ? 'Processing…' : `Buy ${qty} ${qty === 1 ? 'hour' : 'hours'}`}
        </button>
      </div>
    </div>
  );
}

/* ── Pricing Cards — solo + team + topup ── */
export default function PricingCards({
  showFree: _showFree,
  variant: _variant,
}: {
  showFree?: boolean;
  variant?: 'compact' | 'default';
} = {}) {
  const prices = usePlanPrices();
  const { checkout, loading } = useCheckout();
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      {/* ── Solo plans ── */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SOLO</h2>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>For individual interviewers</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          {SOLO_PLANS.map((plan) => (
            <PlanCardView key={plan.id} plan={plan} prices={prices} checkout={checkout} loading={loading} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* ── Team plans ── */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TEAMS</h2>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Bootcamps, cohorts, recruiting teams</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEAM_PLANS.map((plan) => (
            <PlanCardView key={plan.id} plan={plan} prices={prices} checkout={checkout} loading={loading} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* ── Hour top-up (paid users only) ── */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>HOURS</h2>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stack on top of your subscription</span>
        </div>
        <HourTopupCard prices={prices} checkout={checkout} loading={loading} />
      </div>
    </div>
  );
}
