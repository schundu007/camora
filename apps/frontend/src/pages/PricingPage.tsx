import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';
import { DiagonalDivider } from '../components/shared/DiagonalDivider';

const accent = 'var(--cam-primary)';
const F = {
  display: "'Source Sans 3', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'Source Code Pro', monospace",
};

/* ── Comparison matrix data ─────────────────────────────────────────────── */
const COMPARE_ROWS: Array<{ label: string; free: string; monthly: string; yearly: string; team: string; }> = [
  { label: 'AI hours included', free: '1 hr (7-day trial)',  monthly: '2 hrs / month', yearly: '5 hrs / year',   team: '⌈seats × 0.7⌉ / month' },
  { label: 'Lumora live answers', free: '✓', monthly: '✓', yearly: '✓', team: '✓' },
  { label: 'Capra prep (800+ topics)', free: '1 / category', monthly: 'All', yearly: 'All', team: 'All' },
  { label: 'Coding solver + system design', free: 'Limited', monthly: '✓', yearly: '✓', team: '✓' },
  { label: 'Voice filter + diagrams', free: '—', monthly: '✓', yearly: '✓', team: '✓' },
  { label: '$15/hr top-ups (never expire)', free: '—', monthly: '✓', yearly: '✓', team: 'Pooled, ✓' },
  { label: 'Centralized billing + per-seat usage', free: '—', monthly: '—', yearly: '—', team: '✓' },
  { label: 'Auto top-up with monthly cap', free: '—', monthly: '✓', yearly: '✓', team: '✓' },
  { label: 'Cancel anytime', free: '—', monthly: '✓', yearly: '✓', team: '✓' },
];

const TRUST_POINTS = [
  { title: '1 hr free, no card', sub: 'Trial expires 7 days from signup' },
  { title: 'Cancel any time', sub: 'No contracts, no penalties' },
  { title: 'Stripe-secured payments', sub: 'PCI-compliant + 3DS' },
  { title: 'Top-ups never expire', sub: 'Hours sit until you use them' },
];

const FAQS = [
  { q: 'Do I get a free trial?', a: 'Yes — 1 free AI hour the moment you sign up. The trial hour expires 7 days from signup. After that, pick a plan to keep using AI surfaces.' },
  { q: 'How many AI hours come with my plan?', a: 'Monthly $19 includes 2 AI hrs each cycle. Yearly $99 includes 5 AI hrs each cycle. Team plans include ⌈seats × 0.7⌉ pooled hrs each month (e.g. 10 seats → 7 hrs, 25 seats → 18 hrs). Hours refresh every billing cycle.' },
  { q: 'How does the $15/hour top-up work?', a: 'Top-ups are paid à la carte at $15/hr — pick any quantity 1 to 50, Stripe charges $15 × quantity. Top-up hours never expire and stack on top of your plan. Available to active subscribers only.' },
  { q: 'How is Team pricing calculated?', a: 'Pick anywhere from 5 to 50 seats. Price = (seats × $20 − $1) per month. So 5 seats = $99, 10 = $199, 15 = $299, 25 = $499, 50 = $999. Included AI hours = ⌈seats × 0.7⌉ pooled across the team each cycle.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Access continues through the end of your billing period.' },
  { q: 'What\'s the difference between Monthly and Yearly?', a: 'Same product, different cadence. Yearly costs $99 — about 57% off vs paying $19 monthly twelve times. Yearly also includes 5 hrs vs 2 hrs/month on monthly.' },
  { q: 'Is it detectable during screen share?', a: 'Camora runs in a separate browser tab or desktop window. Use Cmd+B to instantly blank the screen. Desktop app has stealth mode built in.' },
  { q: 'What platforms are supported?', a: 'Zoom, Google Meet, Microsoft Teams, HackerRank, CoderPad, Codility, and any browser-based interview platform.' },
];

/* ── Recommendation calculator ─────────────────────────────────────────── */
function recommend(hoursPerMonth: number) {
  // Monthly: 2 hrs included + $15/extra. Yearly: 5/12 ≈ 0.42 hrs/mo, $99/12 ≈ $8.25/mo
  const monthlyCost = 19 + Math.max(0, hoursPerMonth - 2) * 15;
  const yearlyCost = 99 / 12 + Math.max(0, hoursPerMonth - (5 / 12)) * 15;
  if (monthlyCost <= yearlyCost) {
    return {
      pick: 'Monthly',
      detail: `~$${monthlyCost.toFixed(0)}/mo all-in`,
      reason: hoursPerMonth <= 2 ? 'Your usage fits inside the included 2 hrs/cycle' : 'Monthly + a few top-up hours is your sweet spot',
    };
  }
  return {
    pick: 'Yearly',
    detail: `~$${yearlyCost.toFixed(0)}/mo all-in`,
    reason: 'Annual cadence + top-ups beats monthly at this volume',
  };
}

/* ── Inline icon set (custom, not stock SVG) ───────────────────────────── */
function CheckMark({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2.6} aria-hidden="true">
      <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DashMark({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2.6} aria-hidden="true">
      <path d="M3 8 L13 8" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hours, setHours] = useState(4);
  const reco = useMemo(() => recommend(hours), [hours]);

  useEffect(() => {
    document.title = 'Pricing | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO
        title="Pricing"
        description="Simple, transparent pricing — Monthly $19, Yearly $99, dynamic Team plans (5–50 seats), $15/hr top-ups that never expire. 1 free hour on signup."
        path="/pricing"
      />
      <SiteNav variant="light" />

      {/* ═══════════ HERO ═══════════ */}
      <section
        className="relative pt-28 md:pt-32 pb-36 px-6 text-center overflow-hidden"
        style={{ background: 'var(--cam-hero-bg, #0A2A53)' }}
      >
        {/* Soft radial light */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }}
        />
        {/* Aviation grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent 75%)',
          }}
        />

        <div className="relative max-w-4xl mx-auto">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{
              color: 'var(--cam-gold-leaf-lt)',
              fontFamily: F.mono,
              background: 'rgba(201,162,39,0.08)',
              border: '1px solid rgba(201,162,39,0.28)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-gold-leaf-lt)' }} />
            PRICING · v3.2
          </span>

          <h1
            className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight uppercase text-white leading-[1.05]"
            style={{ fontFamily: F.display }}
          >
            Pay for hours,<br />
            <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>not seats.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
            One hour free, no card. Plans from $19/mo with 2 included AI hrs. Teams of 5–50 with pooled hours and a single invoice. Top-ups at $15/hr that never expire.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.08em] rounded-full transition-transform hover:scale-[1.02]"
              style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', boxShadow: '0 8px 22px rgba(0,0,0,0.25)' }}
            >
              Start free — 1 hr, no card
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </Link>
            <a
              href="#plans"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-[13px] font-semibold tracking-[0.04em] rounded-full transition-colors"
              style={{ color: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              Compare plans
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
            {TRUST_POINTS.map((p, i) => (
              <div key={i} className="text-left flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ background: 'rgba(201,162,39,0.18)', color: 'var(--cam-gold-leaf-lt)' }}>
                  <CheckMark size={12} />
                </span>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-white leading-tight">{p.title}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DiagonalDivider fill="var(--bg-surface)" slope="tr-to-bl" position="bottom" height="9vh" />
      </section>

      {/* ═══════════ PLANS ═══════════ */}
      <section id="plans" className="max-w-6xl mx-auto px-6 pb-16 pt-10 w-full scroll-mt-24">
        <SharedPricingCards />
      </section>

      {/* ═══════════ COMPARISON ═══════════ */}
      <section className="px-6 py-20" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>COMPARE</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Everything, <span style={{ color: accent }}>side by side.</span>
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>Feature</th>
                    <th className="text-left px-5 py-4 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Free</th>
                    <th className="text-left px-5 py-4 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly · $19</th>
                    <th className="text-left px-5 py-4 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Yearly · $99</th>
                    <th className="text-left px-5 py-4 text-[12px] font-semibold" style={{ color: 'var(--cam-primary-dk)' }}>Team · 5–50 seats</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{row.label}</td>
                      <CompareCell value={row.free} />
                      <CompareCell value={row.monthly} />
                      <CompareCell value={row.yearly} />
                      <CompareCell value={row.team} accent />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ ROI / RECOMMENDER ═══════════ */}
      <section className="px-6 py-20" style={{ background: 'var(--bg-elevated)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>RECOMMENDER</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: F.display }}>
              How many <span style={{ color: accent }}>AI hours</span> a month?
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Slide to your interview prep volume — we'll pick the cheapest path.
            </p>
          </div>

          <div className="rounded-2xl p-6 md:p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[11px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>YOUR VOLUME</span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>{hours} hrs / month</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value, 10))}
              className="w-full"
              style={{ accentColor: 'var(--cam-primary)' }}
              aria-label="Hours per month"
            />
            <div className="flex items-center justify-between text-[10px] mt-1.5" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>
              <span>0 (just trial)</span>
              <span>10 (active prep)</span>
              <span>20 (heavy)</span>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-5 p-5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--cam-gold-leaf-50)', color: 'var(--cam-gold-leaf-text)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2 L2 22 L12 18 L22 22 Z" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>Best fit</div>
                  <div className="text-[18px] font-bold leading-tight">{reco.pick}</div>
                </div>
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{reco.detail}</span>
                <span className="block mt-0.5" style={{ color: 'var(--text-muted)' }}>{reco.reason}</span>
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] rounded-full transition-transform hover:scale-[1.02] justify-self-start md:justify-self-end"
                style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}
              >
                Start with {reco.pick}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </div>

            <p className="text-[11px] mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
              Heavy team usage? Switch to a <Link to="#plans" className="underline" style={{ color: 'var(--cam-primary)' }}>Team plan</Link> for pooled hours and one invoice.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="px-6 py-20" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>FAQ</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Common <span style={{ color: accent }}>questions.</span>
            </h2>
          </div>

          <div className="space-y-0" style={{ borderTop: '1px solid var(--border)' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left transition-colors"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-[15px] font-semibold pr-4" style={{ color: 'var(--text-primary)' }}>{faq.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-[14px] leading-relaxed -mt-1" style={{ color: 'var(--text-muted)' }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="px-6 py-16" style={{ background: 'var(--bg-elevated)' }}>
        <div className="max-w-5xl mx-auto">
          <div
            className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 px-10 md:px-14 py-12 rounded-2xl"
            style={{ background: 'var(--cam-primary-dk)' }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-[0.18]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '54px 54px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 30% 30%, black, transparent 75%)',
              }}
            />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: F.display }}>
                Ready to <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>fly?</span>
              </h2>
              <p className="mt-2 text-[14px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Free hour, no card. Pick a plan when you're ready.
              </p>
            </div>
            <div className="relative flex items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-[13px] font-bold uppercase tracking-[0.08em] rounded-full transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', boxShadow: '0 8px 22px rgba(0,0,0,0.3)' }}
              >
                Create account
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
              <a
                href="mailto:hello@cariara.com?subject=Camora%20Team%20plan"
                className="hidden sm:inline-flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold rounded-full transition-colors"
                style={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                Talk to sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}

/* ── Comparison row cell ── */
function CompareCell({ value, accent: isAccent = false }: { value: string; accent?: boolean }) {
  if (value === '✓') {
    return (
      <td className="px-5 py-3.5">
        <CheckMark size={16} color={isAccent ? 'var(--cam-primary)' : 'var(--accent, #10b981)'} />
      </td>
    );
  }
  if (value === '—') {
    return (
      <td className="px-5 py-3.5">
        <DashMark size={16} color="var(--text-muted)" />
      </td>
    );
  }
  return (
    <td className="px-5 py-3.5 text-[13px]" style={{ color: isAccent ? 'var(--cam-primary-dk)' : 'var(--text-secondary)' }}>
      {value}
    </td>
  );
}
