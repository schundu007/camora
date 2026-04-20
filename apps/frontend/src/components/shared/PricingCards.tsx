import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/authHeaders';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Shared plan definitions ── */
export const PLANS = [
  {
    name: 'Snowballs',
    price: '$0',
    period: '',
    description: 'Play around a bit',
    features: [
      '3 live interview sessions',
      'Browse all 300+ prep topics',
      'System design, coding, behavioral',
      'Voice transcription',
      'No credit card required',
    ],
    cta: 'Try Snowballs',
    popular: false,
    priceKey: null as string | null,
  },
  {
    name: 'Frost',
    price: '$29',
    period: '/mo',
    description: 'Start the real deal',
    features: [
      'Unlimited prep and practice',
      '10 live interview sessions/mo',
      'AI-powered explanations',
      'Mock interview simulator',
      'System design diagrams',
      'Code solutions with complexity',
      'All programming languages',
    ],
    cta: 'Get Frost',
    popular: false,
    priceKey: 'monthly',
  },
  {
    name: 'Winter Lover',
    price: '$49',
    period: '/mo',
    description: 'Make your interviewers freeze',
    features: [
      'Everything in Frost',
      'Unlimited live sessions',
      'Job discovery and matching',
      'Auto resume and cover letter',
      'Auto job apply',
      'Company-specific prep material',
      'Speaker voice filtering',
      'Priority AI responses',
      'Desktop app included',
      'Mobile app (iOS & Android)',
    ],
    cta: 'Upgrade',
    popular: true,
    priceKey: 'monthly_pro',
  },
  {
    name: 'Avalanche Maker',
    price: '$19',
    period: '/mo',
    description: "It's your sandbox",
    features: [
      'Everything in Winter Lover',
      'Save 61% vs monthly',
      'Locked-in pricing',
      'Priority support',
      'Desktop app add-on: +$29/mo',
    ],
    cta: 'Go Avalanche',
    popular: false,
    priceKey: 'annual',
    best: true,
  },
];

/* ── Shared price fetching hook ── */
export function usePlanPrices() {
  const [prices, setPrices] = useState<Record<string, { priceId: string }> | null>(null);

  useEffect(() => {
    fetch(`${BILLING_API}/api/v1/billing/prices`)
      .then(r => r.json())
      .then(data => {
        const mapped: Record<string, { priceId: string }> = {};
        for (const p of (data.plans || data || [])) {
          if (p.id === 'monthly') mapped.monthly = { priceId: p.stripe_price_id || p.priceId || '' };
          if (p.id === 'monthly_pro') mapped.monthly_pro = { priceId: p.stripe_price_id || p.priceId || '' };
          if (p.id === 'annual') mapped.annual = { priceId: p.stripe_price_id || p.priceId || '' };
          if (p.id === 'lifetime') mapped.lifetime = { priceId: p.stripe_price_id || p.priceId || '' };
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
  const [loading, setLoading] = useState('');

  const checkout = async (priceId: string, planName: string) => {
    if (!priceId) { navigate('/capra/prepare'); return; }
    if (!token) { navigate('/login'); return; }
    setLoading(planName);
    try {
      const resp = await fetch(`${BILLING_API}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/lumora?checkout=success`,
          cancel_url: window.location.href,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        if (resp.status === 503 || resp.status === 400) {
          alert('Payment service temporarily unavailable. Please try again.');
        } else {
          console.error('Checkout failed:', err.error);
        }
        setLoading('');
        return;
      }
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
      else alert('Could not create checkout session. Please try again.');
    } catch {
      alert('Payment service error. Please try again later.');
    } finally {
      setLoading('');
    }
  };

  return { checkout, loading };
}

/* ── Shared PricingCards component ── */
interface PricingCardsProps {
  variant?: 'full' | 'compact';
  plans?: typeof PLANS;
  showFree?: boolean;
}

export default function PricingCards({ variant = 'full', plans: customPlans, showFree = true }: PricingCardsProps) {
  const prices = usePlanPrices();
  const { checkout, loading } = useCheckout();
  const navigate = useNavigate();

  const displayPlans = (customPlans || PLANS).filter(p => showFree || p.priceKey !== null);

  const isCompact = variant === 'compact';

  return (
    <div className={`grid gap-4 ${isCompact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
      {displayPlans.map(plan => {
        const priceId = plan.priceKey ? (prices?.[plan.priceKey]?.priceId || '') : '';
        const isPro = plan.popular;
        const isBest = (plan as any).best;

        return (
          <div
            key={plan.name}
            className="group relative flex flex-col rounded-2xl h-full transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'var(--bg-surface)',
              border: (isPro || isBest) ? '2px solid var(--accent)' : '1px solid var(--border)',
              boxShadow: (isPro || isBest) ? '0 8px 32px rgba(34,211,238,0.15)' : 'var(--shadow-sm)',
            }}
          >
            <div className={`relative flex flex-col flex-1 ${isCompact ? 'p-5 pb-0' : 'p-7 pb-0'}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: (isPro || isBest) ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{plan.name}</h3>
                {isPro && <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-white" style={{ background: 'linear-gradient(135deg, var(--accent), #0891b2)' }}>Popular</span>}
                {isBest && <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-white" style={{ background: 'linear-gradient(135deg, var(--warning), #d97706)' }}>Best Value</span>}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold leading-none tracking-tight" style={{ fontSize: isCompact ? '36px' : '44px', color: 'var(--text-primary)' }}>{plan.price}</span>
                {plan.period && <span className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>}
              </div>
              {!isCompact && <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>}

              <div className="my-4 h-px" style={{ background: 'var(--border)' }} />

              {/* Features */}
              <ul className={`space-y-2.5 flex-1 ${isCompact ? 'mb-5' : 'mb-7'}`}>
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4L6 11L3 8" /></svg>
                    <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className={isCompact ? 'p-5 pt-0' : 'p-7 pt-0'}>
              <button
                onClick={() => plan.priceKey ? checkout(priceId, plan.name) : navigate('/capra/prepare')}
                disabled={loading === plan.name}
                className="w-full py-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                style={isPro
                  ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(34,211,238,0.3)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                }
              >
                {loading === plan.name ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </span>
                ) : (
                  <>{plan.cta} <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
