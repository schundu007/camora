import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Shared plan definitions ── */
export const PLANS = [
  {
    name: 'Snowballs',
    price: '$0',
    period: '',
    description: 'Free — explore the platform',
    features: ['3 free topics per category', 'Browse 300+ prep topics', 'Basic AI'],
    cta: 'Try Free',
    priceKey: null as string | null,
  },
  {
    name: 'Frost',
    price: '$29',
    period: '/mo',
    description: 'Monthly Starter — no desktop',
    features: ['Unlimited prep topics', '10 live sessions/mo', 'AI explanations', 'System design diagrams'],
    cta: 'Get Frost',
    priceKey: 'monthly_starter',
  },
  {
    name: 'Winter Lover',
    price: '$49',
    period: '/mo',
    description: 'Monthly Pro + Desktop',
    features: ['Everything in Frost', 'Unlimited sessions', 'Desktop app included', 'Company-specific prep', 'Voice filtering'],
    cta: 'Upgrade',
    popular: true,
    priceKey: 'monthly_pro',
  },
  {
    name: 'Blizzard',
    price: '$39',
    period: '/mo',
    subtitle: '$119/quarter',
    description: 'Quarterly — save 19%',
    features: ['Everything in Winter Lover', 'Save 19% vs monthly', 'Desktop included', '3-month access'],
    cta: 'Get Blizzard',
    priceKey: 'quarterly_pro',
  },
  {
    name: 'Avalanche',
    price: '$19',
    period: '/mo',
    subtitle: '$228/year — no desktop',
    description: 'Annual — save 61%',
    features: ['All web features', 'Save 61% vs monthly', 'Locked-in pricing', 'Priority support'],
    cta: 'Go Annual',
    priceKey: 'annual',
    best: true,
    upgrade_note: 'Add desktop → Avalanche+',
  },
  {
    name: 'Avalanche+',
    price: '$25',
    period: '/mo',
    subtitle: '$299/year + desktop',
    description: 'Annual + Desktop — best value',
    features: ['Everything in Avalanche', 'Desktop app included', 'Full access for 1 year'],
    cta: 'Go Avalanche+',
    priceKey: 'annual_desktop',
  },
];

export const DESKTOP_LIFETIME = {
  name: 'Desktop Lifetime',
  price: '$99',
  description: 'Lumora Desktop only — bring your own AI keys',
  priceKey: 'desktop_lifetime',
};

export const TOPUPS = [
  { name: '20 AI Questions', price: '$5', desc: 'Additional AI-generated questions', priceKey: 'topup_20q' },
  { name: '50 AI Questions', price: '$10', desc: 'Additional AI-generated questions', priceKey: 'topup_50q' },
  { name: '5 Sessions', price: '$15', desc: '5 desktop sessions (60 min each)', priceKey: 'topup_5s' },
];

/* ── Shared price fetching hook ── */
export function usePlanPrices() {
  const [prices, setPrices] = useState<Record<string, { priceId: string }> | null>(null);

  useEffect(() => {
    fetch(`${BILLING_API}/api/v1/billing/prices`)
      .then(r => r.json())
      .then(data => {
        const mapped: Record<string, { priceId: string }> = {};
        for (const p of (data.plans || [])) {
          const pid = p.stripe_price_id || p.priceId || '';
          if (pid) mapped[p.id] = { priceId: pid };
        }
        for (const t of (data.topups || [])) {
          const pid = t.stripe_price_id || '';
          if (pid) mapped[t.id] = { priceId: pid };
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
    if (!priceId) { navigate('/pricing'); return; }
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
        if (resp.status === 503 || resp.status === 400) {
          alert('Payment service temporarily unavailable. Please try again.');
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

/* ── Pricing Cards ── */
export default function PricingCards({ showFree = true }: { showFree?: boolean }) {
  const prices = usePlanPrices();
  const { checkout, loading } = useCheckout();
  const navigate = useNavigate();

  const displayPlans = PLANS.filter(p => showFree || p.priceKey !== null);

  return (
    <div className="space-y-8">
      {/* ── Subscription Plans Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayPlans.map(plan => {
          const priceId = plan.priceKey ? (prices?.[plan.priceKey]?.priceId || '') : '';
          const isPro = (plan as any).popular;
          const isBest = (plan as any).best;

          return (
            <div
              key={plan.name}
              className="group flex flex-col rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                background: (isPro || isBest) ? '#C2E3F5' : 'var(--bg-surface)',
                border: (isPro || isBest) ? '2px solid var(--border)' : '1px solid var(--border)',
              }}
            >
              <div className="p-3 flex flex-col flex-1">
                {/* Badge */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: (isPro || isBest) ? 'var(--text-muted)' : 'var(--text-muted)' }}>{plan.name}</h3>
                  {isPro && <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold text-white" style={{ background: 'var(--text-muted)' }}>Popular</span>}
                  {isBest && <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold text-white" style={{ background: 'var(--text-muted)' }}>Best</span>}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-xl font-extrabold" style={{ color: (isPro || isBest) ? 'var(--text-primary)' : 'var(--text-primary)' }}>{plan.price}</span>
                  {plan.period && <span className="text-[10px]" style={{ color: (isPro || isBest) ? 'var(--text-muted)' : 'var(--text-muted)' }}>{plan.period}</span>}
                </div>
                {(plan as any).subtitle && <p className="text-[9px] mb-1" style={{ color: (isPro || isBest) ? 'var(--text-muted)' : 'var(--text-muted)' }}>{(plan as any).subtitle}</p>}

                {/* Features */}
                <ul className="space-y-1 flex-1 mb-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1 text-[10px] leading-tight">
                      <svg className="w-3 h-3 mt-px shrink-0" viewBox="0 0 16 16" fill="none" stroke={(isPro || isBest) ? 'var(--text-primary)' : 'var(--accent)'} strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span style={{ color: (isPro || isBest) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Upgrade note */}
                {(plan as any).upgrade_note && (
                  <p className="text-[8px] mb-2" style={{ color: (isPro || isBest) ? 'var(--text-primary)' : 'var(--warning)' }}>{(plan as any).upgrade_note}</p>
                )}
              </div>

              {/* CTA */}
              <div className="px-3 pb-3">
                <button
                  onClick={() => plan.priceKey ? checkout(priceId, plan.name) : navigate('/capra/prepare')}
                  disabled={loading === plan.name}
                  className="w-full py-2 text-[11px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                  }
                >
                  {loading === plan.name ? 'Processing...' : plan.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop Download ── */}
      <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Desktop App</h3>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Stealth mode, screen-share safe. Included in Winter Lover, Blizzard, Avalanche+ plans.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const pid = prices?.desktop_lifetime?.priceId || '';
              if (pid) checkout(pid, 'Desktop Lifetime');
              else navigate('/pricing');
            }}
            disabled={loading === 'Desktop Lifetime'}
            className="px-3 py-1.5 text-[10px] font-semibold rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Buy $99 Lifetime
          </button>
          <a href="https://github.com/schundu007/camora/releases/latest" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-white text-[10px] font-semibold rounded-lg" style={{ background: 'var(--accent)' }}>
            Download
          </a>
        </div>
      </div>

      {/* ── Top-Up Packs ── */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-center mb-3" style={{ color: 'var(--text-muted)' }}>Top-Up Packs — for subscribers who exhaust monthly quota</h3>
        <div className="grid grid-cols-3 gap-3">
          {TOPUPS.map(pack => {
            const pid = prices?.[pack.priceKey]?.priceId || '';
            return (
              <div key={pack.priceKey} className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pack.name}</span>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{pack.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{pack.price}</span>
                  <button
                    onClick={() => pid ? checkout(pid, pack.name) : navigate('/pricing')}
                    disabled={loading === pack.name}
                    className="px-2.5 py-1 text-white text-[9px] font-semibold rounded-md cursor-pointer" style={{ background: 'var(--accent)' }}
                  >
                    {loading === pack.name ? '...' : 'Buy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
