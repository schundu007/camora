import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dialogAlert } from './Dialog';
import { isOwner } from '../../lib/owner';

const BILLING_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// ── Design tokens — CSS variables so light/dark theme switches automatically
const LN = {
  bg:         'var(--bg-base)',
  surface:    'var(--bg-surface)',
  card:       'var(--bg-surface)',
  cardHover:  'var(--bg-elevated)',
  border:     'var(--border)',
  divider:    'var(--border)',
  blue:       'var(--accent)',
  blueFade:   'rgba(0,108,224,0.10)',
  blueBorder: 'rgba(0,108,224,0.30)',
  blueDk:     '#2265BF',
  text:       'var(--text-primary)',
  textSub:    'var(--text-secondary)',
  muted:      'var(--text-muted)',
  dim:        'var(--text-muted)',
  font:       'var(--font-sans)',
  mono:       'var(--font-mono)',
} as const;

// ── Types ────────────────────────────────────────────────────────────────────
export interface PlanCard {
  id: 'monthly' | 'yearly';
  name: string;
  price: string;
  priceNum: number;
  period: string;
  periodShort: string;
  priceKey: string;
  description: string;
  aiHours: string;
  features: string[];
  cta: string;
  badge?: string;
  bucket: 'solo';
}

export const SOLO_PLANS: PlanCard[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$19',
    priceNum: 19,
    period: '/month',
    periodShort: 'mo',
    priceKey: 'pro_monthly',
    description: '2 AI hours included every cycle.',
    aiHours: '2 hrs / month',
    features: [
      'Live session AI co-pilot',
      'Coding solver + system design',
      'Voice filter + architecture diagrams',
      'Prep — 1,500+ topics (unlimited)',
      'Playground — live Docker & Kubernetes terminals',
      'Top-ups at $15/hr, never expire',
    ],
    cta: 'Start Monthly',
    badge: 'Popular',
    bucket: 'solo',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$99',
    priceNum: 99,
    period: '/year',
    periodShort: 'yr',
    priceKey: 'pro_yearly',
    description: 'Same access. Pay once, save $129.',
    aiHours: '5 hrs / year',
    features: [
      'Everything in Monthly',
      'Works out to $8.25 / month',
      'Top-ups at $15/hr, never expire',
    ],
    cta: 'Start Yearly',
    badge: 'Best Value',
    bucket: 'solo',
  },
];

export const PLANS: PlanCard[] = [...SOLO_PLANS];

const HOUR_RATE_USD = 15;
const TEAM_SEATS_MIN = 5;
const TEAM_SEATS_MAX = 50;
const teamMonthlyPrice = (seats: number) =>
  seats <= 25 ? 49 + (seats - 5) * 10 : 249 + (seats - 25) * 4;
const teamIncludedHours = (seats: number) => Math.ceil(seats * 0.7);

// ── Price fetching ────────────────────────────────────────────────────────────
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

// ── Checkout hook ─────────────────────────────────────────────────────────────
export function useCheckout() {
  const { token, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState('');
  const tokenRef = useRef(token);
  const authLoadingRef = useRef(authLoading);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { authLoadingRef.current = authLoading; }, [authLoading]);

  const goToPortal = async (returnUrl?: string) => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;
    try {
      const res = await fetch(`${BILLING_API}/api/v1/billing/portal`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ returnUrl: returnUrl || window.location.href }),
      });
      if (res.ok) { const { url } = await res.json(); window.location.href = url; }
    } catch { /* ignore */ }
  };

  const prepareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/capra/prepare`;

  const checkout = async (
    priceId: string,
    planName: string,
    opts?: { quantity?: number; team?: { seats: number } },
  ) => {
    const isTeam = !!opts?.team;
    if (!isTeam && !priceId) { navigate('/pricing'); return; }
    if (isOwner(user)) { await goToPortal(prepareUrl); return; }
    setLoading(planName);
    let waited = 0;
    while (!tokenRef.current && authLoadingRef.current && waited < 2000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }
    const currentToken = tokenRef.current;
    if (!currentToken) { setLoading(''); navigate('/login?redirect=/pricing'); return; }
    const raw = searchParams.get('returnTo');
    const returnTo = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/lumora';
    const sep = returnTo.includes('?') ? '&' : '?';
    const successUrl = `${window.location.origin}${returnTo}${sep}checkout=success`;
    try {
      const resp = await fetch(`${BILLING_API}/api/v1/billing/checkout`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
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
          dialogAlert({ title: 'Subscribe first', message: 'Hour top-ups are available to active subscribers. Pick a plan to unlock per-hour purchases.', tone: 'warning' });
        } else if (resp.status === 400 && body?.code === 'ALREADY_SUBSCRIBED') {
          setLoading(''); await goToPortal(prepareUrl); return;
        } else if (resp.status === 503 || resp.status === 400) {
          dialogAlert({ title: 'Payment service unavailable', message: 'Please try again in a moment.', tone: 'danger' });
        } else if (body?.error) {
          dialogAlert({ title: 'Checkout failed', message: body.detail || body.error, tone: 'danger' });
        }
        setLoading(''); return;
      }
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
      else dialogAlert({ title: 'Could not start checkout', message: 'Please try again.', tone: 'danger' });
    } catch {
      dialogAlert({ title: 'Payment service error', message: 'Please try again later.', tone: 'danger' });
    } finally { setLoading(''); }
  };

  return { checkout, loading, goToPortal, prepareUrl };
}

// ── Checkmark icon ────────────────────────────────────────────────────────────
function Check({ size = 12, color = LN.blue }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2.5} aria-hidden="true">
      <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Solo plan table rows — Linode-style selectable rows ───────────────────────
function SoloPlanTable({
  prices, checkout, loading,
}: {
  prices: Record<string, { priceId: string }> | null;
  checkout: (priceId: string, planName: string) => void;
  loading: string;
}) {
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: LN.font }}>
      {/* Column header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 180px 120px 200px',
        padding: '10px 16px',
        background: '#0B1B3F',
        border: `1px solid ${LN.border}`,
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
      }}>
        {['Plan', 'AI Hours Included', 'Billing', 'Price'].map((col, i) => (
          <span key={col} style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)',
            fontFamily: LN.mono, textAlign: i === 0 ? 'left' : 'right',
          }}>{col}</span>
        ))}
      </div>

      {/* Plan rows */}
      <div style={{ border: `1px solid ${LN.border}`, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {SOLO_PLANS.map((plan, idx) => {
          const isSelected = selected === plan.id;
          const priceId = prices?.[plan.priceKey]?.priceId || '';
          const isLoading = loading === plan.name;

          return (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              onMouseEnter={() => { if (!isSelected) setHoveredId(plan.id); }}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 120px 200px',
                padding: '14px 16px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(255,153,0,0.07)' : hoveredId === plan.id ? LN.cardHover : LN.card,
                borderBottom: idx < SOLO_PLANS.length - 1 ? `1px solid ${LN.divider}` : 'none',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
            >
              {/* Radio + plan name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? 'var(--cam-gold-leaf)' : LN.dim}`,
                  background: isSelected ? 'var(--cam-gold-leaf)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                }}>
                  {isSelected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: LN.text }}>{plan.name}</span>
                    {plan.badge && (
                      <span style={{
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 3,
                        background: isSelected ? 'linear-gradient(135deg, var(--cam-gold-leaf), #B88930)' : LN.border,
                        color: isSelected ? '#fff' : LN.muted,
                        fontFamily: LN.mono, transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 2px 8px rgba(255,153,0,0.32)' : 'none',
                      }}>{plan.badge}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: LN.muted, marginTop: 2 }}>{plan.description}</div>
                </div>
              </div>

              {/* AI Hours */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontFamily: LN.mono, color: isSelected ? 'var(--cam-gold-leaf-text)' : LN.muted }}>
                  {plan.aiHours}
                </span>
              </div>

              {/* Billing cycle */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: LN.muted }}>{plan.id === 'monthly' ? 'Monthly' : 'Yearly'}</span>
              </div>

              {/* Price + CTA */}
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: LN.text, fontFamily: LN.mono }}>{plan.price}</span>
                  <span style={{ fontSize: 12, color: LN.muted }}>/{plan.periodShort}</span>
                </div>
                {isSelected && (
                  <button
                    onClick={e => { e.stopPropagation(); if (priceId) checkout(priceId, plan.name); }}
                    disabled={isLoading || !priceId}
                    style={{
                      padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 3,
                      background: LN.blue, color: '#fff', border: 'none',
                      cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1,
                      fontFamily: LN.font,
                    }}
                  >
                    {isLoading ? 'Processing…' : plan.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature list for selected plan */}
      {(() => {
        const plan = SOLO_PLANS.find(p => p.id === selected)!;
        return (
          <div style={{
            marginTop: 8, padding: '12px 16px',
            background: LN.bg, border: `1px solid ${LN.border}`, borderRadius: 4,
            display: 'flex', flexWrap: 'wrap', gap: '6px 28px',
          }}>
            {plan.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Check size={11} />
                <span style={{ fontSize: 12, color: LN.textSub }}>{f}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ── Team plan panel ───────────────────────────────────────────────────────────
function TeamPlanSection({
  checkout, loading,
}: {
  checkout: (priceId: string, planName: string, opts?: { team?: { seats: number } }) => void;
  loading: string;
}) {
  const [seats, setSeats] = useState(10);
  const monthly = teamMonthlyPrice(seats);
  const hours = teamIncludedHours(seats);
  const presets = [5, 10, 25, 50];
  const planName = `Team (${seats} seats)`;
  const isLoading = loading === planName;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 260px', gap: 1,
      background: LN.border, border: `1px solid ${LN.border}`, borderRadius: 4, overflow: 'hidden',
      fontFamily: LN.font,
    }}>
      <div style={{ background: LN.card, padding: '24px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: LN.mono, marginBottom: 6 }}>Team Size</div>
          <div style={{ fontSize: 13, color: LN.textSub, marginBottom: 14 }}>
            Choose your seat count (5–50). Price and pooled hours update automatically.
          </div>
          <input
            type="range" min={TEAM_SEATS_MIN} max={TEAM_SEATS_MAX} step={1} value={seats}
            onChange={e => setSeats(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: LN.blue, marginBottom: 4 }}
            aria-label="Team seats"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: LN.dim, fontFamily: LN.mono, marginBottom: 14 }}>
            <span>5 seats</span><span>50 seats</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {presets.map(n => (
              <button key={n} onClick={() => setSeats(n)} style={{
                padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: LN.mono,
                borderRadius: 3,
                border: `1px solid ${n === seats ? LN.blue : LN.border}`,
                background: n === seats ? LN.blueFade : LN.bg,
                color: n === seats ? LN.blue : LN.muted, cursor: 'pointer',
              }}>{n} seats</button>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${LN.divider}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: LN.mono, marginBottom: 10 }}>Included</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
            {['Pooled AI hours across team', 'Per-member usage breakdown', 'Single invoice, multiple seats', 'Pooled top-ups never expire', 'Live session AI co-pilot', 'Playground — Docker & Kubernetes for every seat', 'All Camora features unlocked'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Check size={11} /><span style={{ fontSize: 12, color: LN.textSub }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: LN.bg, padding: '24px 22px', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${LN.divider}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: LN.mono, marginBottom: 16 }}>Summary</div>
        <div style={{ marginBottom: 16 }}>
          {[['Seats', `${seats}`], ['AI Hours / mo', `${hours} hrs`], ['Billing', 'Monthly']].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: LN.muted }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: i === 1 ? 600 : 400, color: i === 1 ? LN.blue : LN.text, fontFamily: LN.mono }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${LN.divider}`, paddingTop: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: LN.text }}>Total</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: LN.text, fontFamily: LN.mono, lineHeight: 1 }}>${monthly}</span>
              <div style={{ fontSize: 12, color: LN.muted }}>/month</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => checkout('', planName, { team: { seats } })}
          disabled={isLoading}
          style={{ width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 700, borderRadius: 3, background: LN.blue, color: '#fff', border: 'none', cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1, fontFamily: LN.font }}
        >
          {isLoading ? 'Processing…' : 'Start Team Plan'}
        </button>
        <p style={{ fontSize: 12, color: LN.muted, textAlign: 'center', marginTop: 8 }}>Cancel any time · Invite team after checkout</p>
      </div>
    </div>
  );
}

// ── AI Hours panel ────────────────────────────────────────────────────────────
const TOPUP_QTY_MIN = 1;
const TOPUP_QTY_MAX = 50;

function HoursSection({
  prices, checkout, loading,
}: {
  prices: Record<string, { priceId: string }> | null;
  checkout: (priceId: string, planName: string, opts?: { quantity?: number }) => void;
  loading: string;
}) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const priceId = prices?.['topup_1h']?.priceId || '';
  const hasBulkDiscount = qty >= 10;
  const discountRate = 0.30;
  const ratePerHour = hasBulkDiscount ? HOUR_RATE_USD * (1 - discountRate) : HOUR_RATE_USD;
  const total = Math.round(ratePerHour * qty * 100) / 100;
  const fullTotal = HOUR_RATE_USD * qty;
  const presets = [1, 5, 10, 25, 50];
  const planName = `${qty}h Top-up`;
  const isLoading = loading === planName;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 260px', gap: 1,
      background: LN.border, border: `1px solid ${LN.border}`, borderRadius: 4, overflow: 'hidden',
      fontFamily: LN.font,
    }}>
      <div style={{ background: LN.card, padding: '24px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: LN.mono, marginBottom: 6 }}>Quantity</div>
          <div style={{ fontSize: 13, color: LN.textSub, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>Add hours to your subscription. <span style={{ color: LN.muted }}>$15/hr · hours never expire.</span></span>
            {!hasBulkDiscount && (
              <span style={{ fontSize: 12, color: LN.muted, background: LN.bg, border: `1px solid ${LN.border}`, borderRadius: 3, padding: '2px 8px', fontFamily: LN.mono }}>
                Buy 10+ hrs → <strong style={{ color: LN.blue }}>30% off</strong>
              </span>
            )}
          </div>
          <input
            type="range" min={TOPUP_QTY_MIN} max={TOPUP_QTY_MAX} step={1} value={qty}
            onChange={e => setQty(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: LN.blue, marginBottom: 4 }}
            aria-label="Hours quantity"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: LN.dim, fontFamily: LN.mono, marginBottom: 14 }}>
            <span>1 hr</span><span>50 hrs</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {presets.map(n => (
              <button key={n} onClick={() => setQty(n)} style={{
                padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: LN.mono,
                borderRadius: 3,
                border: `1px solid ${n === qty ? LN.blue : LN.border}`,
                background: n === qty ? LN.blueFade : LN.bg,
                color: n === qty ? LN.blue : LN.muted, cursor: 'pointer',
              }}>{n}h</button>
            ))}
            <input
              type="number" min={TOPUP_QTY_MIN} max={TOPUP_QTY_MAX} value={qty}
              onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setQty(Math.max(TOPUP_QTY_MIN, Math.min(TOPUP_QTY_MAX, v))); }}
              style={{ width: 64, padding: '5px 8px', fontSize: 12, fontFamily: LN.mono, borderRadius: 3, border: `1px solid ${LN.border}`, background: LN.card, color: LN.text, outline: 'none' }}
              aria-label="Hours numeric"
            />
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${LN.divider}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: LN.mono, marginBottom: 10 }}>Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
            {['One-time charge, no auto-renew', 'Hours never expire', 'Stack on any subscription', 'Available to subscribers only'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Check size={11} /><span style={{ fontSize: 12, color: LN.textSub }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: LN.bg, padding: '24px 22px', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${LN.divider}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: LN.mono, marginBottom: 16 }}>Summary</div>
        {hasBulkDiscount && (
          <div style={{
            marginBottom: 14, padding: '8px 12px', borderRadius: 4,
            background: 'rgba(0,108,224,0.12)', border: `1px solid ${LN.blue}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: LN.blue }}>Bulk discount applied</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: LN.blue, fontFamily: LN.mono }}>30% OFF</span>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: LN.muted }}>Hours</span>
            <span style={{ fontSize: 13, color: LN.text, fontFamily: LN.mono }}>{qty} {qty === 1 ? 'hr' : 'hrs'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: LN.muted }}>Rate</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {hasBulkDiscount && (
                <span style={{ fontSize: 12, color: LN.dim, fontFamily: LN.mono, textDecoration: 'line-through' }}>$15/hr</span>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: hasBulkDiscount ? LN.blue : LN.text, fontFamily: LN.mono }}>
                ${ratePerHour.toFixed(2).replace('.00', '')}/hr
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: LN.muted }}>Expires</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: LN.blue, fontFamily: LN.mono }}>Never</span>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${LN.divider}`, paddingTop: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: LN.text }}>Total</span>
            <div style={{ textAlign: 'right' }}>
              {hasBulkDiscount && (
                <div style={{ fontSize: 13, color: LN.dim, fontFamily: LN.mono, textDecoration: 'line-through', marginBottom: 2 }}>${fullTotal}</div>
              )}
              <span style={{ fontSize: 26, fontWeight: 700, color: hasBulkDiscount ? LN.blue : LN.text, fontFamily: LN.mono, lineHeight: 1 }}>${total}</span>
              <div style={{ fontSize: 12, color: LN.muted }}>one-time{hasBulkDiscount ? ` · save $${fullTotal - total}` : ''}</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => priceId ? checkout(priceId, planName, { quantity: qty }) : navigate('/pricing')}
          disabled={isLoading || !priceId}
          style={{ width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 700, borderRadius: 3, background: LN.blue, color: '#fff', border: 'none', cursor: isLoading ? 'wait' : 'pointer', opacity: (isLoading || !priceId) ? 0.7 : 1, fontFamily: LN.font }}
        >
          {isLoading ? 'Processing…' : `Buy ${qty} ${qty === 1 ? 'Hour' : 'Hours'}`}
        </button>
        <p style={{ fontSize: 12, color: LN.muted, textAlign: 'center', marginTop: 8 }}>Subscribers only · No auto-renew</p>
      </div>
    </div>
  );
}

// ── Tab navigation ────────────────────────────────────────────────────────────
const TABS = ['Solo Plans', 'Team Plans', 'AI Hours'] as const;
type Tab = typeof TABS[number];

// ── Main export ───────────────────────────────────────────────────────────────
export default function PricingCards({
  showFree: _showFree,
  variant: _variant,
}: {
  showFree?: boolean;
  variant?: 'compact' | 'default';
} = {}) {
  const prices = usePlanPrices();
  const { checkout, loading, goToPortal, prepareUrl } = useCheckout();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Solo Plans');

  if (isOwner(user)) {
    return (
      <div style={{
        padding: 32, background: LN.card, border: `1px solid ${LN.blueBorder}`, borderRadius: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16,
        fontFamily: LN.font,
      }}>
        <span style={{ padding: '3px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 2, background: LN.blueFade, color: LN.blue, border: `1px solid ${LN.blueBorder}`, fontFamily: LN.mono }}>
          Owner
        </span>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: LN.text, margin: 0 }}>All features unlocked</h3>
        <p style={{ fontSize: 13, color: LN.textSub, maxWidth: 400, margin: 0 }}>
          Your account has owner-level access. All features are available to you.
        </p>
        <Link to="/" style={{ marginTop: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, borderRadius: 3, background: LN.blue, color: '#fff', textDecoration: 'none', display: 'inline-block', fontFamily: LN.font }}>
          Go to Camora
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: LN.font }}>
      {/* Glass segmented pill tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, width: 'fit-content', margin: '0 auto 24px' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? '#fff' : LN.muted,
              background: isActive ? 'var(--cam-primary)' : 'transparent', border: 'none',
              borderRadius: 7,
              boxShadow: isActive ? '0 1px 6px rgba(0,108,224,0.35)' : 'none',
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              fontFamily: LN.font,
            }}>{tab}</button>
          );
        })}
      </div>

      {activeTab === 'Solo Plans' && <SoloPlanTable prices={prices} checkout={checkout} loading={loading} />}
      {activeTab === 'Team Plans' && <TeamPlanSection checkout={checkout} loading={loading} />}
      {activeTab === 'AI Hours'   && <HoursSection prices={prices} checkout={checkout} loading={loading} />}
    </div>
  );
}
