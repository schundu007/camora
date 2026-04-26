import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { dialogAlert } from './Dialog';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Pricing v2 plan definitions ──────────────────────────────────────────
 * Two SKU shapes:
 *   - Capra Content (monthly/yearly): content access, no AI hours
 *   - Hour bundles (Starter/Pro/Pro Max/Annual Pro): content + included hours
 * Free tier = 30 min lifetime AI hours, content limited to 1 topic per category.
 * Hour PAYG: $10/hr (10 USD per hour). Bundles each get a lower effective rate.
 */
export interface Plan {
  name: string;
  price: string;
  period: string;
  subtitle?: string;
  description: string;
  features: string[];
  cta: string;
  priceKey: string | null;
  popular?: boolean;
  best?: boolean;
}

export const PLAN_FREE: Plan = {
  name: 'Free',
  price: '$0',
  period: '',
  description: 'Try the platform — no card needed',
  features: [
    '30 min AI hours (lifetime)',
    '1 topic per category',
    'Browse 800+ prep topics',
  ],
  cta: 'Try Free',
  priceKey: null,
};

export const CONTENT_MONTHLY: Plan = {
  name: 'Capra Content',
  price: '$19',
  period: '/mo',
  description: 'All prep content — pay-as-you-go AI',
  features: [
    'All 800+ prep topics',
    'Architecture diagrams',
    'AI hours at $10/hr (PAYG)',
  ],
  cta: 'Subscribe',
  priceKey: 'capra_content_monthly',
};

export const CONTENT_YEARLY: Plan = {
  name: 'Capra Content',
  price: '$99',
  period: '/yr',
  subtitle: 'Save 57% vs monthly',
  description: 'All prep content — pay-as-you-go AI',
  features: [
    'All 800+ prep topics',
    'Architecture diagrams',
    'AI hours at $10/hr (PAYG)',
    'Locked-in pricing',
  ],
  cta: 'Subscribe yearly',
  priceKey: 'capra_content_yearly',
};

export const BUNDLE_PLANS: Plan[] = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    subtitle: 'Effective $7.25/hr',
    description: 'Light interview prep',
    features: [
      'All prep content',
      '4 AI hours / month',
      '$9/hr overage',
    ],
    cta: 'Get Starter',
    priceKey: 'starter',
  },
  {
    name: 'Pro',
    price: '$59',
    period: '/mo',
    subtitle: 'Effective $5.90/hr',
    description: 'Active job seeker',
    features: [
      'All prep content',
      '10 AI hours / month',
      '$8/hr overage',
      'Desktop app included',
    ],
    cta: 'Upgrade to Pro',
    priceKey: 'pro',
    popular: true,
  },
  {
    name: 'Pro Max',
    price: '$99',
    period: '/mo',
    subtitle: 'Effective $3.96/hr',
    description: 'Heavy interviewer',
    features: [
      'All prep content',
      '25 AI hours / month',
      '$7/hr overage',
      'Desktop app included',
      'Priority support',
    ],
    cta: 'Get Pro Max',
    priceKey: 'pro_max',
  },
  {
    name: 'Annual Pro',
    price: '$499',
    period: '/yr',
    subtitle: '~$41.58/mo · 120h pooled',
    description: 'Save 30% vs Pro monthly',
    features: [
      'All prep content',
      '120 AI hours / year (pooled)',
      '$7/hr overage',
      'Desktop app included',
      'Locked-in pricing',
    ],
    cta: 'Go Annual',
    priceKey: 'annual_pro',
    best: true,
  },
];

// Backwards-compat: PricingPage still imports `PLANS` for marketing copy
// elsewhere. Surface the v2 lineup in the same flat array shape.
export const PLANS: Plan[] = [PLAN_FREE, CONTENT_MONTHLY, ...BUNDLE_PLANS];

export const DESKTOP_LIFETIME = {
  name: 'Desktop Lifetime',
  price: '$99',
  description: 'Lumora Desktop only — bring your own AI keys',
  priceKey: 'desktop_lifetime',
};

// Per-hour rate decreases monotonically with volume so larger packs always
// look like a better deal: $9 → $8.33 → $8 → $7.50 → $7.
export const TOPUPS = [
  { name: '1 AI hour',   price: '$9',   rate: '$9.00/hr',  desc: '90-day expiry',  priceKey: 'topup_1h' },
  { name: '3 AI hours',  price: '$25',  rate: '$8.33/hr',  desc: '90-day expiry',  priceKey: 'topup_3h' },
  { name: '5 AI hours',  price: '$40',  rate: '$8.00/hr',  desc: '90-day expiry',  priceKey: 'topup_5h' },
  { name: '10 AI hours', price: '$75',  rate: '$7.50/hr',  desc: '90-day expiry',  priceKey: 'topup_10h' },
  { name: '25 AI hours', price: '$175', rate: '$7.00/hr',  desc: '90-day expiry',  priceKey: 'topup_25h' },
];

/* ── Shared price fetching hook ── */
export function usePlanPrices() {
  const [prices, setPrices] = useState<Record<string, { priceId: string }> | null>(null);

  useEffect(() => {
    fetch(`${BILLING_API}/api/v1/billing/prices`)
      .then(r => r.json())
      .then(data => {
        const mapped: Record<string, { priceId: string }> = {};
        // Backend `/prices` returns either { plans: [], topups: [] } (legacy
        // lumora-backend) OR a flat object keyed by SKU id (current ascend-
        // backend). Normalize both shapes.
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
        if (Array.isArray(data?.topups)) {
          for (const t of data.topups) {
            const pid = (t as { priceId?: string; stripe_price_id?: string }).priceId
              || (t as { priceId?: string; stripe_price_id?: string }).stripe_price_id
              || '';
            if (pid) mapped[(t as { id: string }).id] = { priceId: pid };
          }
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
    // Stripe success/cancel URLs: if PaywallGate sent the user here with
    // ?returnTo=/lumora/coding, route them back to the gated page so
    // PaywallGate's polling unblocks the original feature. Default falls
    // back to /lumora — historical behavior. Guard against open-redirect
    // by accepting only same-origin paths.
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

/* ── Pricing Cards ── */
export default function PricingCards({ showFree = true }: { showFree?: boolean }) {
  const prices = usePlanPrices();
  const { checkout, loading } = useCheckout();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [contentBilling, setContentBilling] = useState<'monthly' | 'yearly'>('yearly');

  // Highlight card surface needs to stand out against the page bg in BOTH
  // themes. Light page (white) → near-black card. Dark page (#0A1320) → a
  // brighter accent navy so the card doesn't disappear navy-on-navy.
  const isDark = theme === 'dark';
  const highlightBg = isDark ? 'var(--cam-primary-dk)' : '#0F172A';
  const highlightFg = '#FFFFFF';
  const highlightFgMuted = 'rgba(255,255,255,0.72)';
  const highlightBorder = 'rgba(255,255,255,0.18)';

  const contentPlan = contentBilling === 'yearly' ? CONTENT_YEARLY : CONTENT_MONTHLY;
  const tier1Plans: Plan[] = showFree ? [PLAN_FREE, contentPlan] : [contentPlan];

  const renderCard = (plan: Plan, opts: { compact?: boolean } = {}) => {
    const priceId = plan.priceKey ? (prices?.[plan.priceKey]?.priceId || '') : '';
    const highlighted = plan.popular || plan.best;
    return (
      <div
        key={plan.name + plan.price}
        className="group flex flex-col rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: highlighted ? highlightBg : 'var(--bg-surface)',
          border: highlighted ? `2px solid ${highlightBg}` : '1px solid var(--border)',
        }}
      >
        <div className={`${opts.compact ? 'p-3' : 'p-4'} flex flex-col flex-1`}>
          {/* Badge */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.name}</h3>
            {plan.popular && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ background: '#FFFFFF', color: highlightBg }}>POPULAR</span>}
            {plan.best && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ background: '#FFFFFF', color: highlightBg }}>BEST VALUE</span>}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className={`${opts.compact ? 'text-xl' : 'text-2xl'} font-extrabold`} style={{ color: highlighted ? highlightFg : 'var(--text-primary)' }}>{plan.price}</span>
            {plan.period && <span className="text-[11px]" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.period}</span>}
          </div>
          {plan.subtitle && <p className="text-[10px] mb-2 font-medium" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.subtitle}</p>}
          {!plan.subtitle && <p className="text-[10px] mb-2" style={{ color: highlighted ? highlightFgMuted : 'var(--text-muted)' }}>{plan.description}</p>}

          {/* Features */}
          <ul className="space-y-1.5 flex-1 mb-3">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <svg className="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke={highlighted ? highlightFg : 'var(--accent)'} strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ color: highlighted ? highlightFg : 'var(--text-secondary)' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className={`${opts.compact ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
          <button
            onClick={() => plan.priceKey ? checkout(priceId, plan.name) : navigate('/capra/prepare')}
            disabled={loading === plan.name}
            className="w-full py-2 text-[11px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50"
            style={{
              background: highlighted ? '#FFFFFF' : 'var(--bg-elevated)',
              color: highlighted ? highlightBg : 'var(--text-primary)',
              border: highlighted ? `1px solid ${highlightBorder}` : '1px solid var(--border)',
            }}
          >
            {loading === plan.name ? 'Processing...' : plan.cta}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* ── Tier 1: Free + Content (with monthly/yearly toggle) ────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Just content</h3>
          <div className="inline-flex rounded-full p-0.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {(['monthly', 'yearly'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setContentBilling(opt)}
                className="px-3 py-1 text-[10px] font-bold uppercase rounded-full transition-all cursor-pointer"
                style={{
                  background: contentBilling === opt ? 'var(--accent)' : 'transparent',
                  color: contentBilling === opt ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {opt === 'yearly' ? 'Yearly · save 57%' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
        <div className={`grid gap-4 ${tier1Plans.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {tier1Plans.map((p) => renderCard(p))}
        </div>
      </div>

      {/* ── Tier 2: Content + AI Hours bundles ─────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Content + AI hours · everything in Capra Content plus included hours
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BUNDLE_PLANS.map((p) => renderCard(p, { compact: true }))}
        </div>
      </div>

      {/* ── Hour top-up packs ─────────────────────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Hour top-ups · stack with any plan, pay-as-you-go starts at $9/hr
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TOPUPS.map(pack => {
            const pid = prices?.[pack.priceKey]?.priceId || '';
            return (
              <div key={pack.priceKey} className="rounded-xl p-3 flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{pack.price}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>· {pack.rate}</span>
                </div>
                <span className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{pack.name}</span>
                <p className="text-[9px] mb-2" style={{ color: 'var(--text-muted)' }}>{pack.desc}</p>
                <button
                  onClick={() => pid ? checkout(pid, pack.name) : navigate('/pricing')}
                  disabled={loading === pack.name}
                  className="mt-auto w-full px-2.5 py-1.5 text-white text-[10px] font-semibold rounded-md cursor-pointer disabled:opacity-50" style={{ background: 'var(--accent)' }}
                >
                  {loading === pack.name ? '...' : 'Buy pack'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desktop add-on ───────────────────────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Add-ons</h3>
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(38,97,156,0.1)', color: 'var(--accent)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            </div>
            <div className="min-w-0">
              <span className="text-[12px] font-semibold block" style={{ color: 'var(--text-primary)' }}>Desktop App — Lifetime</span>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Stealth mode, BYOK (bring your own AI keys)</p>
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
              className="px-3 py-1.5 text-white text-[10px] font-semibold rounded-md cursor-pointer" style={{ background: 'var(--accent)' }}
            >
              {loading === 'Desktop Lifetime' ? '...' : 'Buy once'}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
          AI hours apply to Lumora live interview, coding helper, and prep generation. Free tier includes 30 min lifetime. Pay-as-you-go is $10/hr.
        </p>
      </div>
    </div>
  );
}
