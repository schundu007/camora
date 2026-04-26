import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { dialogAlert } from './Dialog';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Pricing v2 — 3 plans with monthly|yearly toggle ──────────────────────
 * Free / Pro / Pro Max. PAYG ceiling $10/hr; Pro Max gets 10% loyalty
 * discount on hours ($9/hr); yearly billing saves 17% over monthly × 12.
 * Top-ups (1h / 5h / 25h) all flat $10/hr. Desktop Lifetime sold separately.
 */

export interface PlanCard {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyEquiv?: string;
  monthlyHours: string;
  yearlyHours: string;
  monthlyPriceKey: string | null;
  yearlyPriceKey: string | null;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  best?: boolean;
}

export const FREE_PLAN: PlanCard = {
  name: 'Free',
  monthlyPrice: '$0',
  yearlyPrice: '$0',
  monthlyHours: '30 min lifetime',
  yearlyHours: '30 min lifetime',
  monthlyPriceKey: null,
  yearlyPriceKey: null,
  description: 'Try the platform — no card needed',
  features: [
    'Browse 800+ prep topics',
    '1 topic per category',
    '30 min AI hours (lifetime)',
  ],
  cta: 'Try Free',
};

export const PRO_PLAN: PlanCard = {
  name: 'Pro',
  monthlyPrice: '$29',
  yearlyPrice: '$290',
  monthlyEquiv: '$24.17/mo',
  monthlyHours: '2 AI hours / mo',
  yearlyHours: '24 AI hours / yr',
  monthlyPriceKey: 'pro_monthly',
  yearlyPriceKey: 'pro_yearly',
  description: 'For active job seekers',
  features: [
    'All 800+ prep topics',
    '2 AI hours / month',
    'Architecture diagrams',
    '$10/hr overage',
  ],
  cta: 'Upgrade to Pro',
  popular: true,
};

export const PRO_MAX_PLAN: PlanCard = {
  name: 'Pro Max',
  monthlyPrice: '$79',
  yearlyPrice: '$790',
  monthlyEquiv: '$65.83/mo',
  monthlyHours: '8 AI hours / mo',
  yearlyHours: '96 AI hours / yr',
  monthlyPriceKey: 'pro_max_monthly',
  yearlyPriceKey: 'pro_max_yearly',
  description: 'For heavy interviewers',
  features: [
    'Everything in Pro',
    '8 AI hours / month',
    '$9/hr overage (save 10%)',
    'Desktop app + voice filtering',
    'Priority support',
  ],
  cta: 'Get Pro Max',
  best: true,
};

export const PLANS: PlanCard[] = [FREE_PLAN, PRO_PLAN, PRO_MAX_PLAN];

export const DESKTOP_LIFETIME = {
  name: 'Desktop Lifetime',
  price: '$99',
  description: 'Lumora Desktop only — bring your own AI keys',
  priceKey: 'desktop_lifetime',
};

export const TOPUPS = [
  { name: '1 AI hour',   price: '$10',  desc: 'Small · 90-day expiry',   priceKey: 'topup_1h' },
  { name: '5 AI hours',  price: '$50',  desc: 'Medium · 90-day expiry',  priceKey: 'topup_5h' },
  { name: '25 AI hours', price: '$250', desc: 'Large · 90-day expiry',   priceKey: 'topup_25h' },
];

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

/* ── Pricing Cards — Free / Pro / Pro Max with billing toggle ── */
export default function PricingCards({ showFree = true }: { showFree?: boolean }) {
  const prices = usePlanPrices();
  const { checkout, loading } = useCheckout();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  const isDark = theme === 'dark';
  const highlightBg = isDark ? 'var(--cam-primary-dk)' : '#0F172A';
  const highlightFg = '#FFFFFF';
  const highlightFgMuted = 'rgba(255,255,255,0.72)';
  const highlightBorder = 'rgba(255,255,255,0.18)';

  const visiblePlans = showFree ? PLANS : PLANS.filter((p) => p.monthlyPriceKey !== null);

  return (
    <div className="space-y-8">
      {/* ── Billing cycle toggle ────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full p-0.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {(['monthly', 'yearly'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setBilling(opt)}
              className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer"
              style={{
                background: billing === opt ? 'var(--accent)' : 'transparent',
                color: billing === opt ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {opt === 'yearly' ? 'Yearly · save 17%' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3-plan grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visiblePlans.map((plan) => {
          const isFree = plan.monthlyPriceKey === null;
          const priceKey = billing === 'yearly' ? plan.yearlyPriceKey : plan.monthlyPriceKey;
          const priceId = priceKey ? (prices?.[priceKey]?.priceId || '') : '';
          const highlighted = plan.popular || plan.best;

          const displayPrice = isFree ? plan.monthlyPrice : (billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice);
          const displayPeriod = isFree ? '' : (billing === 'yearly' ? '/yr' : '/mo');
          const displayHours = billing === 'yearly' ? plan.yearlyHours : plan.monthlyHours;

          return (
            <div
              key={plan.name}
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
                  {plan.popular && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#FFFFFF', color: highlightBg }}>POPULAR</span>}
                  {plan.best && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#FFFFFF', color: highlightBg }}>BEST VALUE</span>}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold" style={{ color: highlighted ? highlightFg : 'var(--text-primary)' }}>{displayPrice}</span>
                  {displayPeriod && <span className="text-[12px]" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{displayPeriod}</span>}
                </div>
                {!isFree && billing === 'yearly' && plan.monthlyEquiv && (
                  <p className="text-[11px] mb-1 font-medium" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.monthlyEquiv} · save 17%</p>
                )}
                <p className="text-[12px] mb-4" style={{ color: highlighted ? highlightFgMuted : 'var(--text-secondary)' }}>{plan.description}</p>

                {/* Hours callout */}
                <div className="rounded-lg px-3 py-2 mb-4" style={{ background: highlighted ? 'rgba(255,255,255,0.1)' : 'var(--bg-elevated)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>AI hours</p>
                  <p className="text-[14px] font-bold" style={{ color: highlighted ? highlightFg : 'var(--text-primary)' }}>{displayHours}</p>
                </div>

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
                  onClick={() => isFree ? navigate('/capra/prepare') : checkout(priceId, plan.name)}
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

      {/* ── Hour top-up packs (3) ───────────────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Need more hours? Top-up packs (flat $10/hr)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOPUPS.map((pack) => {
            const pid = prices?.[pack.priceKey]?.priceId || '';
            return (
              <div key={pack.priceKey} className="rounded-xl p-4 flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{pack.price}</span>
                </div>
                <span className="text-[12px] font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{pack.name}</span>
                <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>{pack.desc}</p>
                <button
                  onClick={() => pid ? checkout(pid, pack.name) : navigate('/pricing')}
                  disabled={loading === pack.name}
                  className="mt-auto w-full px-3 py-2 text-white text-[11px] font-semibold rounded-md cursor-pointer disabled:opacity-50" style={{ background: 'var(--accent)' }}
                >
                  {loading === pack.name ? '…' : 'Buy pack'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desktop add-on ──────────────────────────────────────────── */}
      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(38,97,156,0.1)', color: 'var(--accent)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-semibold block" style={{ color: 'var(--text-primary)' }}>Desktop App — Lifetime</span>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stealth mode, BYOK (bring your own AI keys) · one-time purchase</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-base font-bold" style={{ color: 'var(--accent)' }}>$99</span>
          <button
            onClick={() => {
              const pid = prices?.desktop_lifetime?.priceId || '';
              if (pid) checkout(pid, 'Desktop Lifetime');
              else navigate('/pricing');
            }}
            disabled={loading === 'Desktop Lifetime'}
            className="px-3 py-1.5 text-white text-[11px] font-semibold rounded-md cursor-pointer" style={{ background: 'var(--accent)' }}
          >
            {loading === 'Desktop Lifetime' ? '…' : 'Buy once'}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
        AI hours apply to Lumora live interview, coding helper, and prep generation.
        Free tier includes 30 min lifetime. PAYG is $10/hr — Pro Max subscribers pay $9/hr.
      </p>
    </div>
  );
}
