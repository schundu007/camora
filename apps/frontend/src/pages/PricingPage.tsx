import { Fragment, useState, useEffect } from 'react';
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

/* ── Comparison matrix data ───────────────────────────────────────────────
 * Cell value tokens:
 *   '✓'                — green checkmark
 *   '—'                — dash (not included)
 *   'pill:<label>'     — checkmark + small pill (e.g. "Pooled")
 *   'mono:<text>'      — render in mono font + accent color (formula)
 *   'muted:<text>'     — render in muted body color
 *   anything else      — plain text
 */
type CompareRow = { label: string; free: string; monthly: string; yearly: string; team: string };
type CompareSection = { title: string; rows: CompareRow[] };

const COMPARE_SECTIONS: CompareSection[] = [
  {
    title: 'Core',
    rows: [
      { label: 'AI hours included',           free: 'muted:1 hr · 7-day trial', monthly: '2 hrs / month',          yearly: '5 hrs / year',            team: 'Pooled across team' },
      { label: 'Lumora live answers',         free: '✓',                         monthly: '✓',                       yearly: '✓',                        team: '✓' },
      { label: 'Capra prep · 800+ topics',    free: 'muted:1 / category',        monthly: 'All',                     yearly: 'All',                      team: 'All' },
      { label: 'Coding solver + system design', free: 'muted:Limited',           monthly: '✓',                       yearly: '✓',                        team: '✓' },
      { label: 'Voice filter + architecture diagrams', free: '—',                monthly: '✓',                       yearly: '✓',                        team: '✓' },
    ],
  },
  {
    title: 'Hours economy',
    rows: [
      { label: '$15/hr top-ups · never expire', free: '—',                       monthly: '✓',                       yearly: '✓',                        team: 'pill:Pooled' },
      { label: 'Auto top-up with monthly cap',  free: '—',                       monthly: '✓',                       yearly: '✓',                        team: '✓' },
    ],
  },
  {
    title: 'Team',
    rows: [
      { label: 'Centralized billing · one invoice', free: '—',                   monthly: '—',                       yearly: '—',                        team: '✓' },
      { label: 'Per-seat usage breakdown',          free: '—',                   monthly: '—',                       yearly: '—',                        team: '✓' },
      { label: 'Cancel anytime',                    free: '—',                   monthly: '✓',                       yearly: '✓',                        team: '✓' },
    ],
  },
];

const TRUST_POINTS = [
  { title: '1 hr free, no card', sub: 'Trial expires 7 days from signup' },
  { title: 'Cancel any time', sub: 'No contracts, no penalties' },
  { title: 'Stripe-secured payments', sub: 'PCI-compliant + 3DS' },
  { title: 'Top-ups never expire', sub: 'Hours sit until you use them' },
];

const FAQS = [
  { q: 'Do I get a free trial?', a: 'Yes — 1 free AI hour the moment you sign up. The trial hour expires 7 days from signup. After that, pick a plan to keep using AI surfaces.' },
  { q: 'How many AI hours come with my plan?', a: 'Monthly $19 gives you 2 AI hours per month. Yearly $99 gives you 5 AI hours per year. Team plans include pooled hours that scale with your seat count — for example, 10 seats gets 7 hours/month, 25 seats gets 18 hours/month. Hours refresh every billing cycle.' },
  { q: 'How do I buy more AI hours?', a: 'Already on Monthly, Yearly, or Team? Scroll to the Hours section on this page — pick how many hours you want (1 to 50), and you\'ll be charged $15 per hour, one-time. The hours stack on top of your plan and never expire. If you\'re not subscribed yet, pick a plan first and the buy-hours form unlocks automatically.' },
  { q: 'How is Team pricing calculated?', a: 'Pick anywhere from 5 to 50 seats. Examples: 5 seats = $99/month, 10 = $199, 15 = $299, 25 = $499, 50 = $999. Each Team plan also gets pooled AI hours that grow with your team — roughly 0.7 hours per seat each month.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Access continues through the end of your billing period.' },
  { q: 'What\'s the difference between Monthly and Yearly?', a: 'Same product, different cadence. Yearly costs $99 a year — about $8.25 a month, or roughly $129 less than paying $19 every month. Yearly also includes 5 hours vs 2 hours/month on monthly.' },
  { q: 'Is it detectable during screen share?', a: 'Camora runs in a separate browser tab or desktop window. Use Cmd+B to instantly blank the screen. Desktop app has stealth mode built in.' },
  { q: 'What platforms are supported?', a: 'Zoom, Google Meet, Microsoft Teams, HackerRank, CoderPad, Codility, and any browser-based interview platform.' },
];

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

          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              border: '1px solid var(--border)',
              boxShadow: '0 12px 36px -16px rgba(15, 27, 45, 0.18)',
              background: 'var(--bg-surface)',
            }}
          >
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm pricing-compare-table"
                style={{ tableLayout: 'fixed', minWidth: 760, borderCollapse: 'collapse' }}
              >
                {/* Team column tint applied per-cell via CSS below — using
                    colgroup background here leaves a sub-pixel gap at the
                    rounded card edge in some browsers. */}
                <style>{`
                  /* Team column tint — applied to:
                     (a) the 5th cell of any normal 5-cell row
                     (b) the .team-tint-keep cell of a section-heading row */
                  .pricing-compare-table tr > *:nth-child(5),
                  .pricing-compare-table .team-tint-keep {
                    background: var(--accent-subtle);
                  }
                `}</style>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '23%' }} />
                </colgroup>
                <thead>
                  {/* Eyebrow row — bucket labels */}
                  <tr style={{ background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)' }}>
                    <th className="text-left px-5 pt-5 pb-1 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>Feature</th>
                    <th className="text-left px-5 pt-5 pb-1 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>Free</th>
                    <th className="text-left px-5 pt-5 pb-1 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>Solo</th>
                    <th className="text-left px-5 pt-5 pb-1 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>Solo</th>
                    <th className="text-left px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--cam-primary-dk)', fontFamily: F.mono }}>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}>
                        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--cam-gold-leaf-lt)' }} />
                        TEAM · RECOMMENDED
                      </span>
                    </th>
                  </tr>
                  {/* Plan-name + price row */}
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border)' }}>
                    <th className="text-left px-5 pb-4 pt-1"></th>
                    <th className="text-left px-5 pb-4 pt-1">
                      <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: F.display }}>Trial</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>$0 · 7 days</div>
                    </th>
                    <th className="text-left px-5 pb-4 pt-1">
                      <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: F.display }}>Monthly</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>$19 / mo</div>
                    </th>
                    <th className="text-left px-5 pb-4 pt-1">
                      <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: F.display }}>Yearly</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>$99 / yr</div>
                    </th>
                    <th className="text-left px-5 pb-4 pt-1">
                      <div className="text-[14px] font-bold" style={{ color: 'var(--cam-primary-dk)', fontFamily: F.display }}>Team</div>
                      <div className="text-[11px]" style={{ color: 'var(--cam-primary-dk)', fontFamily: F.mono, opacity: 0.78 }}>5–50 seats · monthly</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_SECTIONS.map((section, si) => (
                    <Fragment key={si}>
                      {/* Section heading — split so Team column (col 5) keeps its tint */}
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.22em]"
                          style={{ color: 'var(--text-muted)', fontFamily: F.mono }}
                        >
                          {section.title}
                        </td>
                        <td className="team-tint-keep" aria-hidden="true" />
                      </tr>
                      {section.rows.map((row, ri) => (
                        <tr
                          key={`${si}-${ri}`}
                          style={{
                            borderTop: '1px solid var(--border)',
                            background: ri % 2 === 0 ? 'transparent' : 'rgba(15, 27, 45, 0.02)',
                          }}
                        >
                          <td className="px-5 py-3.5 text-[13.5px]" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.label}</td>
                          <CompareCell value={row.free} />
                          <CompareCell value={row.monthly} />
                          <CompareCell value={row.yearly} />
                          <CompareCell value={row.team} accent />
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Bottom microcopy */}
            <div className="px-6 py-3.5 text-[11.5px] text-center border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              Capra topic browsing is unlimited. AI features (Lumora, coding solver, system design) draw from your monthly AI hours. Top up at $15/hr — hours never expire.
            </div>
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

/* ── Comparison row cell ──
 * Token grammar:
 *   '✓'              — checkmark
 *   '—'              — dash
 *   'pill:<label>'   — pill chip + checkmark
 *   'mono:<text>'    — monospaced + accent (for formulas)
 *   'muted:<text>'   — muted body text (for limits / qualifiers)
 *   anything else    — plain text
 */
function CompareCell({ value, accent: isAccent = false }: { value: string; accent?: boolean }) {
  const cellPad = 'px-5 py-3.5';

  if (value === '✓') {
    return (
      <td className={cellPad}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: isAccent ? 'var(--cam-primary-dk)' : 'rgba(16,185,129,0.12)' }}>
          <CheckMark size={11} color={isAccent ? '#FFFFFF' : '#10b981'} />
        </span>
      </td>
    );
  }
  if (value === '—') {
    return (
      <td className={cellPad}>
        <DashMark size={14} color="var(--text-muted)" />
      </td>
    );
  }
  if (value.startsWith('pill:')) {
    const label = value.slice(5);
    return (
      <td className={cellPad}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: 'var(--cam-primary-dk)' }}>
            <CheckMark size={11} color="#FFFFFF" />
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', fontFamily: 'var(--font-mono)' }}
          >
            {label}
          </span>
        </span>
      </td>
    );
  }
  if (value.startsWith('mono:')) {
    return (
      <td className={cellPad}>
        <span className="text-[12.5px] font-bold" style={{ color: 'var(--cam-primary-dk)', fontFamily: 'var(--font-mono)' }}>
          {value.slice(5)}
        </span>
      </td>
    );
  }
  if (value.startsWith('muted:')) {
    return (
      <td className={cellPad}>
        <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {value.slice(6)}
        </span>
      </td>
    );
  }
  return (
    <td className={cellPad}>
      <span className="text-[13px] font-medium" style={{ color: isAccent ? 'var(--cam-primary-dk)' : 'var(--text-secondary)' }}>
        {value}
      </span>
    </td>
  );
}
