import { Fragment, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';
import { useAuth } from '../contexts/AuthContext';

// ── Linode cloud console design tokens ──────────────────────────────────────
const LN = {
  bg:          '#0D1017',
  surface:     '#13161E',
  card:        '#191D27',
  border:      '#252A36',
  green:       '#02B159',
  greenFade:   'rgba(2,177,89,0.10)',
  greenBorder: 'rgba(2,177,89,0.25)',
  text:        '#E4E7F0',
  muted:       '#7C849C',
  dim:         '#4A5168',
} as const;

// ── Comparison table data ────────────────────────────────────────────────────
type CompareRow = { label: string; free: string; monthly: string; yearly: string; team: string };
type CompareSection = { title: string; rows: CompareRow[] };

const COMPARE_SECTIONS: CompareSection[] = [
  {
    title: 'Core',
    rows: [
      { label: 'AI hours included',                    free: '1 hr · 7-day trial', monthly: '2 hrs / month',  yearly: '5 hrs / year', team: 'Pooled across team' },
      { label: 'Live session AI',                      free: '✓',                  monthly: '✓',              yearly: '✓',            team: '✓' },
      { label: 'Prep · 1,400+ topics',                 free: '1 / category',       monthly: 'All',            yearly: 'All',          team: 'All' },
      { label: 'Coding solver + system design',        free: 'Limited',             monthly: '✓',              yearly: '✓',            team: '✓' },
      { label: 'Voice filter + architecture diagrams', free: '—',                  monthly: '✓',              yearly: '✓',            team: '✓' },
    ],
  },
  {
    title: 'Hours economy',
    rows: [
      { label: '$15/hr top-ups · never expire',  free: '—', monthly: '✓', yearly: '✓', team: 'Pooled' },
      { label: 'Auto top-up with monthly cap',   free: '—', monthly: '✓', yearly: '✓', team: '✓' },
    ],
  },
  {
    title: 'Team',
    rows: [
      { label: 'Centralized billing · one invoice', free: '—', monthly: '—', yearly: '—', team: '✓' },
      { label: 'Per-seat usage breakdown',          free: '—', monthly: '—', yearly: '—', team: '✓' },
      { label: 'Cancel anytime',                    free: '—', monthly: '✓', yearly: '✓', team: '✓' },
    ],
  },
];

const FAQS = [
  { q: 'Do I get a free trial?', a: 'Yes — 1 free AI hour the moment you sign up. The trial hour expires 7 days from signup. After that, pick a plan to keep using AI surfaces.' },
  { q: 'How many AI hours come with my plan?', a: 'Monthly $19 gives you 2 AI hours per month. Yearly $99 gives you 5 AI hours per year. Team plans include pooled hours that scale with your seat count — for example, 10 seats gets 7 hours/month, 25 seats gets 18 hours/month. Hours refresh every billing cycle.' },
  { q: 'How do I buy more AI hours?', a: "Already on Monthly, Yearly, or Team? Use the AI Hours tab on this page — pick how many hours you want (1 to 50), and you'll be charged $15 per hour, one-time. Hours never expire." },
  { q: 'How is Team pricing calculated?', a: 'Pick anywhere from 5 to 50 seats. Examples: 5 seats = $99/month, 10 = $199, 15 = $299, 25 = $499, 50 = $999. Each Team plan also gets pooled AI hours that grow with your team — roughly 0.7 hours per seat each month.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Access continues through the end of your billing period.' },
  { q: "What's the difference between Monthly and Yearly?", a: 'Same product, different cadence. Yearly costs $99 a year — about $8.25 a month, or roughly $129 less than paying $19 every month. Yearly also includes 5 hours vs 2 hours/month on monthly.' },
  { q: 'Is it detectable during screen share?', a: 'Camora runs in a separate browser tab or desktop window. Use Cmd+B to instantly blank the screen. Desktop app has stealth mode built in.' },
  { q: 'What platforms are supported?', a: 'Zoom, Google Meet, Microsoft Teams, HackerRank, CoderPad, Codility, and any browser-based interview platform.' },
];

// ── Cell renderer ─────────────────────────────────────────────────────────────
function CellValue({ value, isTeam }: { value: string; isTeam?: boolean }) {
  if (value === '✓') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: isTeam ? LN.green : LN.greenFade }}>
        <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke={isTeam ? '#fff' : LN.green} strokeWidth={2.5} aria-hidden="true">
          <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (value === '—') return <span style={{ color: LN.dim, fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 12, color: isTeam ? LN.green : LN.muted, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: LN.muted, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? '/lumora' : '/signup';

  useEffect(() => {
    document.title = 'Pricing | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: LN.bg, color: LN.text }}>
      <SEO
        title="Pricing"
        description="Simple, transparent pricing — Monthly $19, Yearly $99, dynamic Team plans (5–50 seats), $15/hr top-ups that never expire. 1 free hour on signup."
        path="/pricing"
      />
      <SiteNav />

      {/* ── Breadcrumb bar ── */}
      <div style={{ background: LN.surface, borderBottom: `1px solid ${LN.border}`, padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 44, gap: 8 }}>
          <Link to="/" style={{ fontSize: 13, color: LN.muted, textDecoration: 'none' }}>Camora</Link>
          <span style={{ color: LN.dim, fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: LN.text }}>Plans & Pricing</span>
        </div>
      </div>

      {/* ── Page title ── */}
      <div style={{ background: LN.surface, borderBottom: `1px solid ${LN.border}`, padding: '28px 32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: LN.text, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            Plans & Pricing
          </h1>
          <p style={{ fontSize: 14, color: LN.muted, margin: 0 }}>
            One free AI hour on signup. Plans from $19/mo. Top-ups at $15/hr, never expire.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: '32px 32px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Plans */}
          <section>
            <SectionLabel>Choose a plan</SectionLabel>
            <SharedPricingCards />
          </section>

          {/* Free tier notice */}
          <section>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              background: LN.surface, border: `1px solid ${LN.border}`, borderRadius: 4,
              borderLeft: `3px solid ${LN.green}`,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: LN.greenFade, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke={LN.green} strokeWidth={2.5} aria-hidden="true">
                  <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: LN.text }}>Free trial included — no card required.</span>
                <span style={{ fontSize: 13, color: LN.muted, marginLeft: 8 }}>1 AI hour on signup, expires after 7 days. Pick a plan any time to continue.</span>
              </div>
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <Link to={ctaHref} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 3, background: LN.green, color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
                  Get started free
                </Link>
              </div>
            </div>
          </section>

          {/* Feature comparison */}
          <section id="compare">
            <SectionLabel>Feature comparison</SectionLabel>
            <div style={{ border: `1px solid ${LN.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: LN.surface, borderBottom: `1px solid ${LN.border}` }}>
                <div style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: LN.muted, fontFamily: 'IBM Plex Mono, monospace' }}>Feature</div>
                {[
                  { label: 'Free',    sub: '$0 · 7 days' },
                  { label: 'Monthly', sub: '$19 / mo' },
                  { label: 'Yearly',  sub: '$99 / yr' },
                  { label: 'Team',    sub: '5–50 seats', accent: true },
                ].map(col => (
                  <div key={col.label} style={{ padding: '10px 16px', textAlign: 'center', background: col.accent ? LN.greenFade : undefined }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: col.accent ? LN.green : LN.text }}>{col.label}</div>
                    <div style={{ fontSize: 11, color: col.accent ? LN.green + 'aa' : LN.dim, fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>{col.sub}</div>
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {COMPARE_SECTIONS.map((section, si) => (
                <Fragment key={si}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: '#0F1219', borderTop: si > 0 ? `1px solid ${LN.border}` : undefined }}>
                    <div style={{ padding: '7px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: LN.dim, fontFamily: 'IBM Plex Mono, monospace' }}>
                      {section.title}
                    </div>
                    <div /><div /><div />
                    <div style={{ background: LN.greenFade }} />
                  </div>
                  {section.rows.map((row, ri) => (
                    <div key={`${si}-${ri}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderTop: `1px solid ${LN.border}`, background: ri % 2 === 0 ? LN.card : LN.bg }}>
                      <div style={{ padding: '11px 20px', fontSize: 13, color: LN.text }}>{row.label}</div>
                      <div style={{ padding: '11px 16px', textAlign: 'center' }}><CellValue value={row.free} /></div>
                      <div style={{ padding: '11px 16px', textAlign: 'center' }}><CellValue value={row.monthly} /></div>
                      <div style={{ padding: '11px 16px', textAlign: 'center' }}><CellValue value={row.yearly} /></div>
                      <div style={{ padding: '11px 16px', textAlign: 'center', background: LN.greenFade }}><CellValue value={row.team} isTeam /></div>
                    </div>
                  ))}
                </Fragment>
              ))}

              <div style={{ padding: '10px 20px', background: LN.surface, borderTop: `1px solid ${LN.border}`, fontSize: 12, color: LN.dim }}>
                Browsing prep topics is unlimited. AI features draw from your monthly AI hours. Top up at $15/hr — hours never expire.
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq">
            <SectionLabel>Frequently asked questions</SectionLabel>
            <div style={{ border: `1px solid ${LN.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {FAQS.map((faq, i) => (
                <div key={i} style={{ borderTop: i > 0 ? `1px solid ${LN.border}` : undefined, background: openFaq === i ? LN.surface : LN.card }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: LN.text }}>{faq.q}</span>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={LN.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 20px 16px', fontSize: 13, lineHeight: 1.7, color: LN.muted }}>{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '20px 28px', background: LN.surface, border: `1px solid ${LN.border}`, borderRadius: 4 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: LN.text, marginBottom: 4 }}>Ready to start?</div>
                <div style={{ fontSize: 13, color: LN.muted }}>Free hour, no card. Pick a plan when you're ready.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link to={ctaHref} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 3, background: LN.green, color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
                  {isAuthenticated ? 'Open Camora' : 'Create account — free'}
                </Link>
                <a href="mailto:hello@cariara.com?subject=Camora%20Team%20plan" style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 3, border: `1px solid ${LN.border}`, color: LN.muted, textDecoration: 'none', display: 'inline-block' }}>
                  Talk to sales
                </a>
              </div>
            </div>
          </section>

        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
