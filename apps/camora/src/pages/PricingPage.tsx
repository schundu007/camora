import { Fragment, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';
import { useAuth } from '../contexts/AuthContext';

// ── Design tokens — CSS variables so light/dark theme switches automatically
const LN = {
  bg:         'var(--bg-base)',
  surface:    'var(--bg-surface)',
  card:       'var(--bg-surface)',
  border:     'var(--border)',
  divider:    'var(--border)',
  blue:       '#3683DC',
  blueFade:   'rgba(54,131,220,0.10)',
  blueBorder: 'rgba(54,131,220,0.30)',
  text:       'var(--text-primary)',
  textSub:    'var(--text-secondary)',
  muted:      'var(--text-muted)',
  dim:        'var(--text-muted)',
  font:       'var(--font-sans)',
  mono:       'var(--font-mono)',
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
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%',
        background: isTeam ? 'linear-gradient(135deg, var(--cam-gold-leaf), #B88930)' : 'rgba(54,131,220,0.10)',
        boxShadow: isTeam ? '0 0 10px rgba(212,160,67,0.35), 0 0 4px rgba(54,131,220,0.40)' : 'none',
        border: isTeam ? 'none' : '1px solid rgba(54,131,220,0.22)',
      }}>
        <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke={isTeam ? '#fff' : LN.blue} strokeWidth={2.5} aria-hidden="true">
          <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (value === '—') return <span style={{ color: LN.dim, fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 12, color: isTeam ? LN.blue : LN.muted, fontFamily: LN.mono }}>{value}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, var(--cam-gold-leaf) 0%, #3683DC 100%)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--cam-gold-leaf-text)', fontFamily: LN.mono }}>
        {children}
      </span>
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
      <div style={{ background: LN.surface, borderBottom: `1px solid ${LN.border}`, padding: '36px 32px 30px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.025em', background: 'linear-gradient(120deg, #3683DC 0%, var(--cam-gold-leaf) 45%, #60A5FA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Plans & Pricing
          </h1>
          <p style={{ fontSize: 15, color: LN.muted, margin: 0 }}>
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
              borderLeft: '3px solid var(--cam-gold-leaf)',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(212,160,67,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="var(--cam-gold-leaf)" strokeWidth={2.5} aria-hidden="true">
                  <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: LN.text }}>Free trial included — no card required.</span>
                <span style={{ fontSize: 13, color: LN.muted, marginLeft: 8 }}>1 AI hour on signup, expires after 7 days. Pick a plan any time to continue.</span>
              </div>
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <Link to={ctaHref} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 3, background: LN.blue, color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: '#0B1B3F', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ padding: '12px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', fontFamily: LN.mono }}>Feature</div>
                {[
                  { label: 'Free',    sub: '$0 · 7 days' },
                  { label: 'Monthly', sub: '$19 / mo' },
                  { label: 'Yearly',  sub: '$99 / yr' },
                  { label: 'Team',    sub: '5–50 seats', accent: true },
                ].map(col => (
                  <div key={col.label} style={{ padding: '12px 16px', textAlign: 'center', background: col.accent ? 'rgba(212,160,67,0.15)' : undefined }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: col.accent ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.85)' }}>{col.label}</div>
                    <div style={{ fontSize: 11, color: col.accent ? 'rgba(212,160,67,0.70)' : 'rgba(255,255,255,0.38)', fontFamily: LN.mono, marginTop: 2 }}>{col.sub}</div>
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {COMPARE_SECTIONS.map((section, si) => (
                <Fragment key={si}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: 'rgba(54,131,220,0.04)', borderTop: si > 0 ? `1px solid ${LN.border}` : undefined }}>
                    <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 1.5, borderRadius: 1, background: 'linear-gradient(90deg, var(--cam-gold-leaf), #3683DC)', flexShrink: 0 }} />
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cam-gold-leaf-text)', fontFamily: LN.mono }}>
                        {section.title}
                      </span>
                    </div>
                    <div /><div /><div />
                    <div style={{ background: 'rgba(99,102,241,0.08)' }} />
                  </div>
                  {section.rows.map((row, ri) => (
                    <div key={`${si}-${ri}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderTop: `1px solid ${LN.border}`, background: ri % 2 === 0 ? LN.card : LN.bg }}>
                      <div style={{ padding: '11px 20px', fontSize: 13, color: LN.text }}>{row.label}</div>
                      <div style={{ padding: '11px 16px', textAlign: 'center' }}><CellValue value={row.free} /></div>
                      <div style={{ padding: '11px 16px', textAlign: 'center' }}><CellValue value={row.monthly} /></div>
                      <div style={{ padding: '11px 16px', textAlign: 'center' }}><CellValue value={row.yearly} /></div>
                      <div style={{ padding: '11px 16px', textAlign: 'center', background: LN.blueFade }}><CellValue value={row.team} isTeam /></div>
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
                <Link to={ctaHref} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 3, background: LN.blue, color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
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
