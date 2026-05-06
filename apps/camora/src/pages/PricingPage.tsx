import { Fragment, useState, useEffect } from 'react';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Section,
  Eyebrow,
  SectionHeading,
  CTAButton,
  Pill,
} from '../components/marketing/primitives';
import { cn } from '../utils/cn';

/* ── Comparison matrix ───────────────────────────────────────
 * Cell tokens:
 *   '✓'             — green checkmark
 *   '—'             — dash (not included)
 *   'pill:<label>'  — checkmark + small pill
 *   'mono:<text>'   — mono + accent (formula)
 *   'muted:<text>'  — muted body (limit / qualifier)
 *   anything else   — plain text
 */
type CompareRow = { label: string; free: string; monthly: string; yearly: string; team: string };
type CompareSection = { title: string; rows: CompareRow[] };

const COMPARE_SECTIONS: CompareSection[] = [
  {
    title: 'Core',
    rows: [
      { label: 'AI hours included',                    free: 'muted:1 hr · 7-day trial', monthly: '2 hrs / month',  yearly: '5 hrs / year', team: 'Pooled across team' },
      { label: 'Live interview AI co-pilot',           free: '✓',                        monthly: '✓',              yearly: '✓',            team: '✓' },
      { label: 'Interview prep · 1,400+ topics',        free: 'muted:1 / category',       monthly: 'All',            yearly: 'All',          team: 'All' },
      { label: 'Coding solver + system design',        free: 'muted:Limited',            monthly: '✓',              yearly: '✓',            team: '✓' },
      { label: 'Voice filter + architecture diagrams', free: '—',                        monthly: '✓',              yearly: '✓',            team: '✓' },
    ],
  },
  {
    title: 'Hours economy',
    rows: [
      { label: '$15/hr top-ups · never expire',  free: '—', monthly: '✓', yearly: '✓', team: 'pill:Pooled' },
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

const TRUST_POINTS = [
  { title: '1 hr free, no card', sub: 'Trial expires 7 days from signup' },
  { title: 'Cancel any time',    sub: 'No contracts, no penalties' },
  { title: 'Stripe-secured',     sub: 'PCI-compliant + 3DS' },
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

function CheckIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.6} className={className} aria-hidden="true">
      <path d="M13 4 L6 11 L3 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DashIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.6} className={className} aria-hidden="true">
      <path d="M3 8 L13 8" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? '/lumora' : '/signup';
  const heroCtaLabel = isAuthenticated ? 'Start your free hour' : 'Start free — 1 hr, no card';
  const finalCtaLabel = isAuthenticated ? 'Open Lumora' : 'Create account';

  useEffect(() => {
    document.title = 'Pricing | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
      <SEO
        title="Pricing"
        description="Simple, transparent pricing — Monthly $19, Yearly $99, dynamic Team plans (5–50 seats), $15/hr top-ups that never expire. 1 free hour on signup."
        path="/pricing"
      />
      <SiteNav />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-[#0A1228] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.10), transparent 60%),' +
              'radial-gradient(ellipse 55% 60% at 12% 30%, rgba(201,162,39,0.18), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 88% 70%, rgba(38,97,156,0.30), transparent 60%),' +
              'linear-gradient(135deg, #07112A 0%, #0B1A3D 50%, #0A1228 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent 75%)',
          }}
        />

        <Container className="relative pt-16 pb-20 md:pt-24 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <Pill tone="inverse" withDot>Pricing · v3.2</Pill>

            <h1 className="mt-6 font-display text-[40px] sm:text-[52px] md:text-[64px] font-semibold tracking-tight leading-[1.04] text-white">
              Pay for hours,
              <br />
              <span className="bg-gradient-to-r from-[var(--cam-gold-leaf-lt)] via-[var(--cam-gold-leaf)] to-[var(--cam-gold-leaf-lt)] bg-clip-text text-transparent">
                not seats.
              </span>
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-base md:text-lg leading-relaxed text-white/72">
              One hour free, no card. Plans from $19/mo with 2 included AI hours. Teams of 5–50 with pooled hours and a single invoice. Top-ups at $15/hr that never expire.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <CTAButton to={ctaHref} variant="inverse-primary" size="lg" trailingArrow>
                {heroCtaLabel}
              </CTAButton>
              <CTAButton href="#plans" variant="inverse-secondary" size="lg">
                Compare plans
              </CTAButton>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
            {TRUST_POINTS.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5 text-left">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--cam-gold-leaf)]/20 text-[var(--cam-gold-leaf-lt)]">
                  <CheckIcon size={12} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-tight text-white">{p.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-white/55">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════ PLANS ═══════════ */}
      <section id="plans" className="scroll-mt-24 bg-[var(--bg-surface)]">
        <Container className="py-14 md:py-16">
          <SharedPricingCards />
        </Container>
      </section>

      {/* ═══════════ COMPARISON ═══════════ */}
      <Section tone="muted" spacing="md">
        <Container>
          <SectionHeading
            align="center"
            eyebrow="Compare"
            title={<>Everything, <span className="text-[var(--cam-primary)]">side by side.</span></>}
          />

          <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_2px_4px_rgba(15,23,42,0.04),0_16px_40px_-20px_rgba(15,23,42,0.18)]">
            <div className="overflow-x-auto">
              <table className="w-full pricing-compare-table" style={{ tableLayout: 'fixed', minWidth: 760, borderCollapse: 'collapse' }}>
                <style>{`
                  .pricing-compare-table tr > *:nth-child(5),
                  .pricing-compare-table .team-tint-keep {
                    background: var(--accent-subtle);
                  }
                `}</style>
                <colgroup>
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '17%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[var(--bg-elevated)]">
                    <th className="px-5 pt-5 pb-1 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Feature</th>
                    <th className="px-5 pt-5 pb-1 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Free</th>
                    <th className="px-5 pt-5 pb-1 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Monthly</th>
                    <th className="px-5 pt-5 pb-1 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Yearly</th>
                    <th className="px-5 pt-3 pb-1 text-left">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cam-primary-dk)] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-white">
                        <span className="h-1 w-1 rounded-full bg-[var(--cam-gold-leaf-lt)]" />
                        Team · Recommended
                      </span>
                    </th>
                  </tr>
                  <tr className="border-b-2 border-[var(--border)] bg-[var(--bg-surface)]">
                    <th className="px-5 pb-4 pt-2"></th>
                    <PriceHead name="Trial" sub="$0 · 7 days" />
                    <PriceHead name="Monthly" sub="$19 / mo" />
                    <PriceHead name="Yearly" sub="$99 / yr" />
                    <PriceHead name="Team" sub="5–50 seats · monthly" accent />
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_SECTIONS.map((section, si) => (
                    <Fragment key={si}>
                      <tr>
                        <td colSpan={4} className="px-5 pt-6 pb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          {section.title}
                        </td>
                        <td className="team-tint-keep" aria-hidden="true" />
                      </tr>
                      {section.rows.map((row, ri) => (
                        <tr
                          key={`${si}-${ri}`}
                          className={cn(
                            'border-t border-[var(--border)]',
                            ri % 2 === 1 && 'bg-[rgba(15,27,45,0.02)]',
                          )}
                        >
                          <td className="px-5 py-3.5 text-[13.5px] font-medium text-[var(--text-primary)]">{row.label}</td>
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
            <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-4 text-center text-[12px] text-[var(--text-muted)]">
              Browsing prep topics is unlimited. AI features (live co-pilot, coding solver, system design) draw from your monthly AI hours. Top up at $15/hr — hours never expire.
            </div>
          </div>
        </Container>
      </Section>

      {/* ═══════════ FAQ ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container size="sm">
          <SectionHeading
            align="center"
            eyebrow="FAQ"
            title={<>Common <span className="text-[var(--cam-primary)]">questions.</span></>}
          />

          <div className="mt-10 border-t border-[var(--border)]">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[var(--cam-primary)]"
                  aria-expanded={openFaq === i}
                >
                  <span className="pr-4 text-[15px] font-semibold text-[var(--text-primary)]">{faq.q}</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      'flex-shrink-0 text-[var(--text-muted)] transition-transform duration-200',
                      openFaq === i && 'rotate-180',
                    )}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === i && (
                  <p className="-mt-1 pb-5 pr-8 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <Section tone="muted" spacing="sm">
        <Container size="md">
          <div className="relative overflow-hidden rounded-3xl bg-[#0A1228] px-8 py-12 md:px-14 text-white">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '54px 54px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 30% 30%, black, transparent 75%)',
              }}
            />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div>
                <Eyebrow tone="inverse">Ready to go</Eyebrow>
                <h2 className="mt-2 font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Start free.{' '}
                  <span className="text-[var(--cam-gold-leaf-lt)]">Pay for results.</span>
                </h2>
                <p className="mt-2 text-[14px] text-white/65">
                  Free hour, no card. Pick a plan when you're ready.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CTAButton to={ctaHref} variant="inverse-primary" size="lg" trailingArrow>
                  {finalCtaLabel}
                </CTAButton>
                <CTAButton href="mailto:hello@cariara.com?subject=Camora%20Team%20plan" variant="inverse-secondary" size="lg">
                  Talk to sales
                </CTAButton>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <SiteFooter />
    </div>
  );
}

function PriceHead({ name, sub, accent = false }: { name: string; sub: string; accent?: boolean }) {
  return (
    <th className="px-5 pb-4 pt-2 text-left">
      <div className={cn('font-display text-[14px] font-semibold', accent ? 'text-[var(--cam-primary-dk)]' : 'text-[var(--text-primary)]')}>
        {name}
      </div>
      <div className={cn('font-mono text-[11px]', accent ? 'text-[var(--cam-primary-dk)]/75' : 'text-[var(--text-muted)]')}>
        {sub}
      </div>
    </th>
  );
}

function CompareCell({ value, accent: isAccent = false }: { value: string; accent?: boolean }) {
  const cellPad = 'px-5 py-3.5';

  if (value === '✓') {
    return (
      <td className={cellPad}>
        <span
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full',
            isAccent ? 'bg-[var(--cam-primary-dk)] text-white' : 'bg-[rgba(16,185,129,0.12)] text-[#10b981]',
          )}
        >
          <CheckIcon size={11} />
        </span>
      </td>
    );
  }
  if (value === '—') {
    return (
      <td className={cellPad}>
        <DashIcon size={14} className="text-[var(--text-muted)]" />
      </td>
    );
  }
  if (value.startsWith('pill:')) {
    const label = value.slice(5);
    return (
      <td className={cellPad}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cam-primary-dk)] text-white">
            <CheckIcon size={11} />
          </span>
          <span className="rounded-full bg-[var(--cam-gold-leaf)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--cam-primary-dk)]">
            {label}
          </span>
        </span>
      </td>
    );
  }
  if (value.startsWith('mono:')) {
    return (
      <td className={cellPad}>
        <span className="font-mono text-[12.5px] font-bold text-[var(--cam-primary-dk)]">{value.slice(5)}</span>
      </td>
    );
  }
  if (value.startsWith('muted:')) {
    return (
      <td className={cellPad}>
        <span className="text-[12.5px] text-[var(--text-muted)]">{value.slice(6)}</span>
      </td>
    );
  }
  return (
    <td className={cellPad}>
      <span className={cn('text-[13px] font-medium', isAccent ? 'text-[var(--cam-primary-dk)]' : 'text-[var(--text-secondary)]')}>
        {value}
      </span>
    </td>
  );
}
