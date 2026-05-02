import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dialogAlert } from './Dialog';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Pricing v3 — three flat options ──────────────────────────────────────
 * Per user request: remove the multi-tier ladder, top-up packs, business
 * starter, desktop add-ons, free tier — just three options the user can
 * pick between in seconds.
 *
 *   1. Monthly        — $19 / month   (full access)
 *   2. Yearly         — $99 / year    (full access, save vs monthly)
 *   3. AI Hourly      — $15 / hour    (pay-as-you-go top-up)
 *
 * Backend price keys retained from v2 so we don't churn the billing
 * routes / Stripe webhook handlers / subscription middleware:
 *   - pro_monthly  → $19/mo subscription
 *   - pro_yearly   → $99/yr subscription
 *   - topup_1h     → $15 one-time, 1 AI hour
 * Operator updates the matching Stripe Dashboard price to the new
 * dollar amount; no code change needed elsewhere.
 */

export interface PlanCard {
  id: 'monthly' | 'yearly' | 'hourly';
  name: string;
  price: string;
  period: string;
  priceKey: string | null;
  description: string;
  features: string[];
  cta: string;
  highlight?: 'popular' | 'best';
}

export const MONTHLY_PLAN: PlanCard = {
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
};

export const YEARLY_PLAN: PlanCard = {
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
};

export const HOURLY_PLAN: PlanCard = {
  id: 'hourly',
  name: 'AI Hourly',
  price: '$15',
  period: '/hour',
  priceKey: 'topup_1h',
  description: 'Pay only for the AI hours you use. No subscription.',
  features: [
    '1 AI hour added on each purchase',
    '90-day expiry per hour pack',
    'Stacks on top of any active subscription',
    'No recurring charge',
  ],
  cta: 'Buy 1 hour',
};

export const PLANS: PlanCard[] = [MONTHLY_PLAN, YEARLY_PLAN, HOURLY_PLAN];

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

  const checkout = async (priceId: string, planName: string) => {
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
        }),
      });
      if (!resp.ok) {
        if (resp.status === 503 || resp.status === 400) {
          dialogAlert({ title: 'Payment service unavailable', message: 'Please try again in a moment.', tone: 'danger' });
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

/* ── Pricing Cards — 3 flat options ── */
export default function PricingCards({
  showFree: _showFree,
  variant: _variant,
}: {
  /** Legacy prop — ignored. Free tier is no longer part of the
      simplified pricing model. Kept on the type so existing callers
      don't break. */
  showFree?: boolean;
  variant?: 'compact' | 'default';
} = {}) {
  const prices = usePlanPrices();
  const { checkout, loading } = useCheckout();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
      {PLANS.map((plan) => {
        const priceId = plan.priceKey ? (prices?.[plan.priceKey]?.priceId || '') : '';
        const highlighted = plan.highlight === 'popular' || plan.highlight === 'best';
        const highlightBg = 'var(--cam-primary-dk)';
        const highlightFg = '#FFFFFF';
        const highlightFgMuted = 'rgba(255,255,255,0.72)';
        const highlightBorder = 'rgba(255,255,255,0.20)';

        return (
          <div
            key={plan.id}
            className="group flex flex-col rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: highlighted ? highlightBg : 'var(--bg-surface)',
              border: highlighted ? `2px solid ${highlightBg}` : '1px solid var(--border)',
            }}
          >
            <div className="p-6 flex flex-col flex-1">
              {/* Badge */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold" style={{ color: highlighted ? highlightFgMuted : 'var(--text-primary)' }}>{plan.name}</h3>
                {plan.highlight === 'popular' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#FFFFFF', color: highlightBg }}>POPULAR</span>}
                {plan.highlight === 'best' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--cam-gold-leaf)', color: highlightBg }}>BEST VALUE</span>}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-extrabold" style={{ color: highlighted ? highlightFg : 'var(--text-primary)' }}>{plan.price}</span>
                <span className="text-[13px]" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.period}</span>
              </div>
              <p className="text-[12px] mb-4 leading-relaxed" style={{ color: highlighted ? highlightFgMuted : 'var(--text-secondary)' }}>{plan.description}</p>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke={highlighted ? highlightFg : 'var(--accent)'} strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ color: highlighted ? highlightFg : 'var(--text-secondary)' }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
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
      })}
    </div>
  );
}
