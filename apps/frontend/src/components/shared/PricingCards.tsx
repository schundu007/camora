import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dialogAlert } from './Dialog';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── Pricing v3.2 — solo + dynamic team + per-hour topup ─────────────────
 *
 * Three buckets:
 *
 *   Solo
 *     · Monthly         — $19/month, 2 included AI hrs/cycle (popular)
 *     · Yearly          — $99/year, 5 included AI hrs/cycle (best value)
 *
 *   Team (5..50 seats, billed monthly)
 *     · Single dynamic SKU. Price = (seats × $20 − $1) / month.
 *       Included AI hrs = ⌈seats × 0.7⌉ / cycle.
 *       Examples: 5→$99/4h, 10→$199/7h, 15→$299/11h, 50→$999/35h.
 *     · No fixed Stripe SKU per seat — single product + price_data per checkout.
 *
 *   AI Hours (top-up, paid users only)
 *     · 1 hour at $15. Quantity selector — Stripe charges $15 × N.
 *       Hours never expire. Free users get a "subscribe first" prompt.
 *
 *   Free trial
 *     · 1 hour, expires 7 days from signup.
 *
 * Backend price keys (kept in stripe.js / billing.js):
 *   pro_monthly, pro_yearly, team (dynamic), topup_1h.
 */

export interface PlanCard {
  id: 'monthly' | 'yearly';
  name: string;
  price: string;
  period: string;
  priceKey: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: 'popular' | 'best';
  bucket: 'solo';
}

export const SOLO_PLANS: PlanCard[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$19',
    period: '/month',
    priceKey: 'pro_monthly',
    description: '2 AI hours included. Buy more at $15/hr, never expire.',
    features: [
      '2 AI hours included every month',
      'Lumora live answers + coding solver',
      'System design generator + voice filter',
      'All Capra prep · 800+ topics (unlimited browsing)',
      'Top-ups at $15/hr if you need more',
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
    description: 'Same access. Pay once, save $129.',
    features: [
      '5 AI hours included every year',
      'Everything in Monthly',
      'Works out to $8.25 / month',
      'Top-ups at $15/hr if you need more',
    ],
    cta: 'Start Yearly',
    highlight: 'best',
    bucket: 'solo',
  },
];

export const PLANS: PlanCard[] = [...SOLO_PLANS];

const HOUR_RATE_USD = 15;
const HOUR_RATE_DISPLAY = `$${HOUR_RATE_USD}`;

// Dynamic team formulas — must match backend (computeTeamPriceCents /
// computeTeamIncludedHours in routes/billing.js).
const TEAM_SEATS_MIN = 5;
const TEAM_SEATS_MAX = 50;
const teamMonthlyPrice = (seats: number) => seats * 20 - 1;
const teamIncludedHours = (seats: number) => Math.ceil(seats * 0.7);

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

/* ── Shared checkout handler ──
 * Two shapes:
 *   (a) Fixed SKU:  checkout(priceId, name, { quantity? })  — solo + topup
 *   (b) Team:       checkout('', name, { team: { seats } }) — dynamic price_data
 */
export function useCheckout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState('');

  const checkout = async (
    priceId: string,
    planName: string,
    opts?: { quantity?: number; team?: { seats: number } },
  ) => {
    const isTeam = !!opts?.team;
    if (!isTeam && !priceId) { navigate('/pricing'); return; }
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
          success_url: successUrl,
          cancel_url: window.location.href,
          ...(isTeam
            ? { plan: 'team', seats: opts!.team!.seats }
            : { price_id: priceId, ...(opts?.quantity ? { quantity: opts.quantity } : {}) }),
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

/* ── Single solo plan card — Team-style visual language ──
 * Each card has identity bar, mono price formula, stat callout panel,
 * features list, distinctive CTA. Monthly = light/navy-accent, Yearly = navy/gold.
 */
function PlanCardView({ plan, prices, checkout, loading, navigate }: {
  plan: PlanCard;
  prices: Record<string, { priceId: string }> | null;
  checkout: (priceId: string, planName: string, opts?: { quantity?: number; team?: { seats: number } }) => void;
  loading: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const priceId = prices?.[plan.priceKey]?.priceId || '';
  const isYearly = plan.id === 'yearly';

  // Per-plan stat callouts
  const stats = isYearly
    ? { included: '5 AI hours included', equiv: '$8.25 / month', save: 'Save $129 a year' }
    : { included: '2 AI hours included', equiv: 'Add more at $15/hr', save: 'Cancel any time' };

  if (isYearly) {
    // Yearly = navy card, gold accents (mirrors Team identity)
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        style={{ background: 'var(--cam-primary-dk)', border: '2px solid var(--cam-primary-dk)' }}
      >
        <div className="p-6 flex flex-col flex-1 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}>BEST VALUE</span>
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>solo · billed yearly</span>
          </div>
          <h3 className="text-[22px] font-extrabold leading-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            One charge. A year of edge.
          </h3>
          <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.72)' }}>{plan.description}</p>

          {/* Price + stat panel (Team-style nested surface) */}
          <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>YOUR PLAN</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>{stats.equiv}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-5xl font-extrabold leading-none text-white" style={{ fontFamily: 'var(--font-display)' }}>{plan.price}</span>
              <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{plan.period}</span>
            </div>
            <div className="text-[11.5px]" style={{ color: 'var(--cam-gold-leaf-lt)', fontFamily: 'var(--font-mono)' }}>
              {stats.included} · {stats.save}
            </div>
          </div>

          <ul className="space-y-2 flex-1 mb-4 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="var(--cam-gold-leaf)" strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => priceId ? checkout(priceId, plan.name) : navigate('/pricing')}
            disabled={loading === plan.name}
            className="w-full py-3 text-[12.5px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 hover:scale-[1.01]"
            style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', border: '1px solid var(--cam-gold-leaf)' }}
          >
            {loading === plan.name ? 'Processing…' : `${plan.cta} — ${plan.price}${plan.period}`}
          </button>
          <p className="text-[10.5px] text-center mt-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cancel any time · Renews yearly
          </p>
        </div>
      </div>
    );
  }

  // Monthly = light card, navy accents
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}>POPULAR</span>
          <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>solo · billed monthly</span>
        </div>
        <h3 className="text-[22px] font-extrabold leading-tight mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Full access. No commitment.
        </h3>
        <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>

        {/* Price + stat panel (mirrors Yearly/Team) */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>YOUR PLAN</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{stats.equiv}</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-5xl font-extrabold leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{plan.price}</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
          </div>
          <div className="text-[11.5px]" style={{ color: 'var(--cam-primary-dk)', fontFamily: 'var(--font-mono)' }}>
            {stats.included} · {stats.save}
          </div>
        </div>

        <ul className="space-y-2 flex-1 mb-4 text-[12.5px]">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => priceId ? checkout(priceId, plan.name) : navigate('/pricing')}
          disabled={loading === plan.name}
          className="w-full py-3 text-[12.5px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 hover:scale-[1.01]"
          style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF', border: '1px solid var(--cam-primary-dk)' }}
        >
          {loading === plan.name ? 'Processing…' : `${plan.cta} — ${plan.price}${plan.period}`}
        </button>
        <p className="text-[10.5px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
          Cancel any time · No long-term lock-in
        </p>
      </div>
    </div>
  );
}

/* ── Hour top-up card — Team-style split layout
 * Always shows the buy form. Backend returns SUBSCRIPTION_REQUIRED_FOR_TOPUP
 * (handled in useCheckout) with a clear "Subscribe first" dialog for non-subs.
 */
const TOPUP_QTY_MIN = 1;
const TOPUP_QTY_MAX = 50;

function HourTopupCard({ prices, checkout, loading }: {
  prices: Record<string, { priceId: string }> | null;
  checkout: (priceId: string, planName: string, opts?: { quantity?: number; team?: { seats: number } }) => void;
  loading: string;
}) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const priceId = prices?.['topup_1h']?.priceId || '';
  const total = HOUR_RATE_USD * qty;
  const presets = [1, 5, 10, 25, 50];
  const planName = `${qty}h Top-up`;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="p-7 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-7">
        {/* Left: identity + plain-language pitch */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}>HOURS</span>
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>add-on for subscribers</span>
          </div>
          <h3 className="text-2xl md:text-[26px] font-extrabold mb-2 leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Need more AI hours? Add them.
          </h3>
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            $15 per hour, one-time charge. Hours stack on top of your Monthly, Yearly, or Team plan and never expire. Not subscribed yet? Pick a plan above first — then come back here to add hours.
          </p>

          <ul className="space-y-2 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            {[
              'Buy 1–50 hours at a time',
              'Hours never expire',
              'Stack on top of any subscription',
              'One-time charge, no auto-renew',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: live buy form (backend gates non-subscribers with a dialog) */}
        <div className="rounded-xl p-5 md:p-6 flex flex-col" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>YOUR PURCHASE</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{HOUR_RATE_DISPLAY}/hr</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-5xl md:text-6xl font-extrabold leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              ${total}
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>one-time</span>
          </div>
          <div className="text-[11.5px] mb-5" style={{ color: 'var(--cam-primary-dk)' }}>
            {qty} {qty === 1 ? 'hour' : 'hours'} added to your subscription
          </div>

          {/* Slider */}
          <div className="mb-3">
            <input
              type="range"
              min={TOPUP_QTY_MIN}
              max={TOPUP_QTY_MAX}
              step={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10))}
              className="w-full"
              style={{ accentColor: 'var(--cam-primary-dk)' }}
              aria-label="Hours quantity"
            />
            <div className="flex items-center justify-between text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>{TOPUP_QTY_MIN} hour</span>
              <span>{TOPUP_QTY_MAX} hours</span>
            </div>
          </div>

          {/* Presets + numeric input */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {presets.map((n) => (
              <button
                key={n}
                onClick={() => setQty(n)}
                className="text-[11px] font-bold tracking-wider px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: qty === n ? 'var(--cam-primary-dk)' : 'var(--bg-surface)',
                  color: qty === n ? '#FFFFFF' : 'var(--text-primary)',
                  border: `1px solid ${qty === n ? 'var(--cam-primary-dk)' : 'var(--border)'}`,
                }}
              >
                {n}h
              </button>
            ))}
            <input
              type="number"
              min={TOPUP_QTY_MIN}
              max={TOPUP_QTY_MAX}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) setQty(Math.max(TOPUP_QTY_MIN, Math.min(TOPUP_QTY_MAX, v)));
              }}
              className="w-16 px-2 py-1.5 text-[11px] rounded-md focus:outline-none focus:ring-1"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              aria-label="Hours numeric input"
            />
          </div>

          <button
            onClick={() => priceId ? checkout(priceId, planName, { quantity: qty }) : navigate('/pricing')}
            disabled={loading === planName}
            className="w-full py-3 text-[12.5px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 hover:scale-[1.01]"
            style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF', border: '1px solid var(--cam-primary-dk)' }}
          >
            {loading === planName ? 'Processing…' : `Buy ${qty} ${qty === 1 ? 'hour' : 'hours'} — $${total}`}
          </button>
          <p className="text-[10.5px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
            Charged once · Hours never expire · Subscribers only
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Team plan card — single-column variant for 3-card grid ──
 * Vertically stacks identity → stat panel → slider/presets → features → CTA
 * so it sits side-by-side with Monthly and Yearly at the same width.
 */
function TeamPlanCard({ checkout, loading }: {
  checkout: (priceId: string, planName: string, opts?: { quantity?: number; team?: { seats: number } }) => void;
  loading: string;
}) {
  const [seats, setSeats] = useState(10);
  const monthly = teamMonthlyPrice(seats);
  const hours = teamIncludedHours(seats);
  const presets = [5, 10, 25, 50];
  const planName = `Team (${seats} seats)`;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: 'var(--cam-primary-dk)', border: '2px solid var(--cam-primary-dk)' }}
    >
      <div className="p-6 flex flex-col flex-1 text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}>TEAM</span>
          <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>5–50 seats · monthly</span>
        </div>
        <h3 className="text-[22px] font-extrabold leading-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          One subscription. Your whole cohort.
        </h3>
        <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Pool AI hours across the team. One invoice, per-member usage breakdown.
        </p>

        {/* Stat panel — live price + seats */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>YOUR TEAM</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>{seats} seats</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-5xl font-extrabold leading-none text-white" style={{ fontFamily: 'var(--font-display)' }}>
              ${monthly}
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>/month</span>
          </div>
          <div className="text-[11.5px] mb-3" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
            {hours} pooled AI hours · every month
          </div>

          {/* Slider */}
          <input
            type="range"
            min={TEAM_SEATS_MIN}
            max={TEAM_SEATS_MAX}
            step={1}
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value, 10))}
            className="w-full"
            style={{ accentColor: 'var(--cam-gold-leaf)' }}
            aria-label="Team seats"
          />

          {/* Preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {presets.map((n) => (
              <button
                key={n}
                onClick={() => setSeats(n)}
                className="text-[10.5px] font-bold tracking-wider px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: seats === n ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.08)',
                  color: seats === n ? 'var(--cam-primary-dk)' : '#FFFFFF',
                  border: `1px solid ${seats === n ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.14)'}`,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-2 flex-1 mb-4 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.92)' }}>
          {[
            'Pooled hours grow with your team',
            'One invoice, multiple seats',
            'Per-member usage + caps',
            'Pooled top-ups never expire',
          ].map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="var(--cam-gold-leaf)" strokeWidth="2.5"><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => checkout('', planName, { team: { seats } })}
          disabled={loading === planName}
          className="w-full py-3 text-[12.5px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 hover:scale-[1.01]"
          style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', border: '1px solid var(--cam-gold-leaf)' }}
        >
          {loading === planName ? 'Processing…' : `Start Team — $${monthly}/month`}
        </button>
        <p className="text-[10.5px] text-center mt-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Cancel any time · Invite team after checkout
        </p>
      </div>
    </div>
  );
}

/* ── Pricing Cards — solo + dynamic team + topup ── */
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
      {/* ── Plans: Monthly · Yearly · Team — side by side ── */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PLANS</h2>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pick the cadence that fits — switch anytime</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {SOLO_PLANS.map((plan) => (
            <PlanCardView key={plan.id} plan={plan} prices={prices} checkout={checkout} loading={loading} navigate={navigate} />
          ))}
          <TeamPlanCard checkout={checkout} loading={loading} />
        </div>
      </div>

      {/* ── Hour top-up (add-on for subscribers) ── */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>HOURS</h2>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Add-on for subscribers · hours never expire</span>
        </div>
        <HourTopupCard prices={prices} checkout={checkout} loading={loading} />
      </div>
    </div>
  );
}
