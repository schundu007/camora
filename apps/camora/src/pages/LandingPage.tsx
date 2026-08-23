import { useEffect } from 'react';
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import JobUrlAnalysisDemo from '../components/shared/JobUrlAnalysisDemo';
import {
  ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles,
} from '../components/landing/CardAnimations';
import CapabilityDeck from '../components/landing/CapabilityDeck';
import VisitorCountLine from '../components/landing/VisitorCountLine';
import SkillDrift from '../components/landing/SkillDrift';
import MagneticCTA from '../components/landing/MagneticCTA';
import { Container, Section, Eyebrow, SectionHeading, CTAButton, SurfaceCard, Pill } from '../components/marketing/primitives';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE — enterprise redesign.
   ══════════════════════════════════════════════════════════════ */

type Step = {
  key: string;
  label: string;
  href: string;
  headline: string;
  desc: string;
  Anim: () => JSX.Element;
  icon: JSX.Element;
  color: string;
  cta: string;
};

const Glyph = (path: JSX.Element) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

// Single source of truth for every headline metric on the page. Before this,
// "Topics" read 750+ in the hero but 1,500+ in APPA and the feature grid, and
// latency drifted between <1s / 0.3s / 0.4s. Every claim now derives from here
// so the numbers can never contradict each other again. If the real DB count
// changes, update it once.
const STATS = {
  roles: '1,000+',
  topics: '1,500+',
  problems: '9,500+',
  latency: '<1s',
  envReady: '<5s',
} as const;

const APPA: Step[] = [
  {
    key: 'apply', label: 'Apply', href: '/jobs',
    headline: 'Roles matched to your skills',
    desc: `${STATS.roles} matched roles · tailored resume + cover letter`,
    color: 'var(--cam-primary)',
    cta: 'Find roles',
    Anim: ApplyAnim,
    icon: Glyph(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></>),
  },
  {
    key: 'prepare', label: 'Prepare', href: '/capra/prepare',
    headline: `${STATS.topics} curated study topics`,
    desc: 'System design, DSA, behavioral, databases · diagrams included',
    color: 'var(--cam-gold-leaf)',
    cta: 'Start studying',
    Anim: PrepareAnim,
    icon: Glyph(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  },
  {
    key: 'practice', label: 'Practice', href: '/capra/practice',
    headline: `${STATS.problems} problems with AI feedback`,
    desc: 'Coding, DSA, MCQ, SQL · 50+ domains · AI scoring',
    color: 'var(--cam-primary-dk)',
    cta: 'Browse problems',
    Anim: PracticeAnim,
    icon: Glyph(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></>),
  },
  {
    key: 'attend', label: 'Attend', href: '/lumora',
    headline: 'Real-time AI in the room',
    desc: 'Voice → instant AI answers · diagrams, code, STAR',
    color: 'var(--cam-primary-lt)',
    cta: 'Try live AI',
    Anim: AttendAnim,
    icon: Glyph(<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>),
  },
];



const LOGO_TOKEN = 'pk_VzK1OM-OQSCUuysDpOCzKw';
const COMPANY_LOGOS = [
  'google', 'amazon', 'meta', 'apple', 'netflix', 'microsoft',
  'uber', 'stripe', 'airbnb', 'nvidia', 'spotify', 'salesforce',
  'adobe', 'oracle', 'intel', 'ibm', 'twitter', 'linkedin',
  'tesla', 'paypal', 'shopify', 'atlassian', 'databricks', 'snowflake',
];

const FEATURES = [
  {
    label: 'Live AI',
    title: 'Real-time AI during sessions',
    bullets: ['Live voice capture + instant answers', 'Architecture diagrams in seconds', 'Works during actual interviews'],
    stat: STATS.latency,
    statLabel: 'avg answer latency',
  },
  {
    label: 'Job Matching',
    title: 'AI-powered job discovery',
    bullets: [`${STATS.roles} roles matched to your skills`, 'Auto-generate resume + cover letter', 'One-click application tracking'],
    stat: STATS.roles,
    statLabel: 'matched roles',
  },
  {
    label: 'Prep',
    title: `${STATS.topics} topics with diagrams`,
    bullets: ['System design, DSA, behavioral, databases', 'AI explanations + architecture diagrams', 'Company-specific study paths'],
    stat: STATS.topics,
    statLabel: 'study topics',
  },
  {
    label: 'Mock Interviews',
    title: 'AI-scored practice sessions',
    bullets: ['Timed sessions with instant feedback', 'Scored: communication, code, design', 'Pinpoints exactly where you lost points'],
    stat: '50+',
    statLabel: 'domains scored',
  },
  {
    label: 'Playground',
    title: 'Real terminals. Real Docker. Real Kubernetes.',
    bullets: ['Ubuntu, Docker, Kubernetes: live in browser', 'No VM, no setup, ready in 5 seconds', 'Build real muscle memory before the screen'],
    stat: STATS.envReady,
    statLabel: 'env ready time',
  },
  {
    label: 'Practice',
    title: `${STATS.problems} problems with AI feedback`,
    bullets: ['DSA, SQL, MCQ, system design, coding', 'AI explains why your approach was wrong', '50+ domains, difficulty-graduated'],
    stat: STATS.problems,
    statLabel: 'problems',
  },
];

const SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++', 'SQL',
  'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'System Design', 'DSA', 'Behavioral',
];

const HIGHLIGHTS = [
  '50+ Languages',
  'Architecture Diagrams',
  'Company-Specific Prep',
  'Stealth Desktop App',
  'Voice Filtering',
  'Live Terminal Playground',
  'Cara AI Guide',
];

const HERO_STATS = [
  { value: STATS.roles, label: 'Matched roles' },
  { value: STATS.topics, label: 'Topics' },
  { value: STATS.problems, label: 'Problems' },
  { value: STATS.latency, label: 'AI latency' },
];

// Alternating large/small bento rhythm instead of six identical clones. Each
// row pairs one span-2 feature (big stat + bullets, horizontal) with one span-1
// supporting card; 2+1 per row × 3 rows tiles the 3-col grid with no gaps. The
// large slots land on the three hero capabilities (Live AI, Prep, Playground).
const FEATURE_SPANS = [2, 1, 2, 1, 2, 1];

/* ── Hooks ────────────────────────────────────────────── */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.28, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    document.title = 'Camora — Apply, Prepare, Practice & Attend';
    return () => { document.title = 'Camora'; };
  }, []);

  // Both branches route to /capra/prepare — the Prepare surface is
  // freely browseable without auth or onboarding (see ProtectedRoute's
  // isOnboardingExempt list), so dropping logged-out users straight
  // into the catalog removes one click of friction. Signup is still
  // one tap away in SiteNav and any paywalled action will prompt for
  // it. Label stays auth-aware so the affordance still reads as a CTA
  // for new visitors.
  const heroCta = isAuthenticated ? 'Open dashboard' : 'Get started free';
  const heroCtaHref = '/capra/prepare';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
      <SEO path="/" />
      <CardAnimationStyles />
      <SiteNav />

      {/* ═══════════ HERO ═══════════ */}
      <section
        className="relative overflow-hidden bg-[var(--bg-surface)]"
      >
        {/* Topographic grid overlay — subtle blue */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(54,131,220,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(54,131,220,0.11) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        {/* Bottom border */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(54,131,220,0.35) 35%, rgba(201,162,39,0.22) 58%, transparent 95%)' }}
        />

        <Container className="relative pt-12 pb-12 md:pt-16 md:pb-16">
          {/* Centered headline block */}
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
              <Pill tone="accent" withDot>
                The career platform for engineers
              </Pill>
            </motion.div>

            <motion.h1
              className="mt-4 w-full max-w-5xl font-display text-[26px] sm:text-[48px] md:text-[64px] lg:text-[78px] font-bold tracking-[-0.028em] leading-[1.02]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="block whitespace-nowrap text-[var(--text-primary)]">Apply, prep, practice.</span>
              <span className="block whitespace-nowrap text-[var(--cam-primary)]">Land the offer.</span>
            </motion.h1>

            <motion.div
              className="mt-7 flex flex-wrap justify-center items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              <MagneticCTA strength={6}>
                <CTAButton to={heroCtaHref} variant="primary" size="lg" trailingArrow>
                  {heroCta}
                </CTAButton>
              </MagneticCTA>
            </motion.div>

            <motion.div
              className="mt-7 grid grid-cols-4 gap-px w-full max-w-2xl bg-[var(--border)] rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="bg-[var(--bg-surface)] flex flex-col items-center justify-center py-3.5 px-1.5 sm:px-3">
                  <span className="font-display text-[20px] sm:text-[28px] font-bold tracking-tight text-[var(--cam-primary)] leading-none">{stat.value}</span>
                  <span className="mt-1 text-center font-mono text-[12px] sm:text-[12px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] text-[var(--text-muted)]">{stat.label}</span>
                </div>
              ))}
            </motion.div>

            <motion.div className="flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24, delay: 0.30, ease: [0.23, 1, 0.32, 1] }}>
              <VisitorCountLine />
            </motion.div>
          </div>

        </Container>
      </section>

      {/* ═══════════ LOGO STRIP ═══════════ */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)] py-6">
        <Container>
          <p className="text-center font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Trusted by engineers at
          </p>
          <div className="relative mt-6 overflow-hidden">
            <div className="absolute left-0 inset-y-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-[var(--bg-surface)] to-transparent" />
            <div className="absolute right-0 inset-y-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-[var(--bg-surface)] to-transparent" />
            <div className="cam-logo-scroll flex" style={{ animation: 'scroll-logos 36s linear infinite', width: 'max-content' }}>
              {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((c, i) => (
                <img
                  key={`${c}-${i}`}
                  src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
                  alt={c}
                  className="h-6 mx-7 shrink-0 object-contain"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes scroll-logos { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            @media (prefers-reduced-motion: reduce) { .cam-logo-scroll { animation: none !important; } }
          `}</style>
        </Container>
      </section>

      {/* ═══════════ APPA — THE PROCESS ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container>
          <Reveal>
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="px-6 pt-6 pb-8 md:px-10 md:pt-8">
                {/* Header */}
                <div className="mb-5">
                  <p className="text-[12px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--accent)', fontFamily: 'var(--font-code)' }}>
                    The process
                  </p>
                  <h2 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    First application to final offer.
                  </h2>
                </div>

                {/* 4-column horizontal steps */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                  {APPA.map((step, i) => (
                    <Link
                      key={step.key}
                      to={step.href}
                      className="group relative flex flex-col gap-3 px-5 py-6 transition-colors duration-200 hover:bg-[var(--accent-subtle)]"
                      style={{
                        borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                        borderTop: `3px solid ${step.color}`,
                      }}
                    >
                      <span
                        className="text-[52px] font-bold leading-none select-none"
                        style={{ color: step.color, opacity: 0.38, fontFamily: 'var(--font-code)', letterSpacing: '-0.04em' }}
                      >
                        0{i + 1}
                      </span>

                      <div>
                        <p className="text-[12px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: step.color, fontFamily: 'var(--font-code)' }}>
                          {step.label}
                        </p>
                        <p className="text-[17px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {step.headline}
                        </p>
                      </div>

                      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {step.desc}
                      </p>

                      <span
                        className="text-[12px] font-bold inline-flex items-center gap-1 mt-auto transition-colors duration-150"
                        style={{ color: step.color, fontFamily: 'var(--font-code)', letterSpacing: '0.04em' }}
                      >
                        {step.cta}
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
                          <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ═══════════ CAPABILITY DECK + JOB URL ANALYSIS — single row ═══════════ */}
      <Section tone="surface" spacing="md" className="border-b border-[var(--border)]">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* One tool. Every session. */}
            <div className="flex flex-col gap-6">
              <Reveal>
                <SectionHeading
                  title={<>One tool.<br /><span className="text-[var(--cam-primary)]">Every session.</span></>}
                  lead="Voice, code, system design, diagrams, and scoring — every interview format in one tool."
                />
                <div className="mt-7 flex items-center gap-4">
                  <CTAButton to="/lumora" variant="primary" size="md" trailingArrow>
                    Try live AI
                  </CTAButton>
                </div>
              </Reveal>
              <Reveal delay={0.12} className="w-full">
                <CapabilityDeck />
              </Reveal>
            </div>
            {/* Paste a job URL. Get a prep plan. */}
            <div className="flex flex-col gap-6">
              <Reveal delay={0.12}>
                <SectionHeading
                  title={<>Paste a job URL.<br /><span className="text-[var(--cam-primary)]">Get a prep plan.</span></>}
                />
                <div className="mt-7">
                  <CTAButton to="/jobs" variant="primary" trailingArrow>
                    Try job analysis
                  </CTAButton>
                </div>
              </Reveal>
              <Reveal delay={0.24} className="w-full">
                <JobUrlAnalysisDemo />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ═══════════ FEATURES — Bento grid ═══════════ */}
      <Section tone="surface" spacing="md" className="border-b border-[var(--border)]">
        <Container>
          <Reveal>
            <SectionHeading
              title="Features that set us apart."
              lead="Everything you need from first prep to final offer."
            />
          </Reveal>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const span = FEATURE_SPANS[i];
              const isLarge = span === 2;
              return (
                <Reveal key={f.title} delay={i * 0.06} className={isLarge ? 'md:col-span-2' : ''}>
                  <SurfaceCard interactive padding="none" className="h-full group border-t-2 border-[var(--accent)]">
                    {isLarge ? (
                      <div className="flex flex-col sm:flex-row gap-6 p-7">
                        <div className="shrink-0 flex flex-col items-start sm:items-center sm:justify-start sm:pt-1 min-w-[80px]">
                          <span className="font-display text-[52px] font-bold leading-none tracking-tight text-[var(--cam-primary)]">{f.stat}</span>
                          <span className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mt-1 whitespace-nowrap">{f.statLabel}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Eyebrow tone="accent">{f.label}</Eyebrow>
                          <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">{f.title}</h3>
                          <ul className="mt-3 space-y-1.5">
                            {f.bullets.map((b) => (
                              <li key={b} className="flex items-start gap-2 text-base text-[var(--text-secondary)]">
                                <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="p-7">
                        <div className="flex items-center justify-between gap-2">
                          <Eyebrow tone="accent">{f.label}</Eyebrow>
                          <span className="font-mono text-[12px] font-bold tracking-[0.14em] text-[var(--cam-primary)] whitespace-nowrap">{f.stat} {f.statLabel}</span>
                        </div>
                        <h3 className="mt-3 font-display text-[22px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">{f.title}</h3>
                        <ul className="mt-3 space-y-1.5">
                          {f.bullets.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-base text-[var(--text-secondary)]">
                              <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SurfaceCard>
                </Reveal>
              );
            })}
          </div>

          {/* Highlights — flat divided list */}
          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center justify-center">
              {HIGHLIGHTS.map((f, i) => (
                <span key={f} className="flex items-center">
                  {i > 0 && <span className="mx-5 h-3 w-px bg-[var(--border)]" aria-hidden="true" />}
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{f}</span>
                </span>
              ))}
            </div>
          </Reveal>

          {/* Skills — drift marquee so the row reads as alive vs static. */}
          <Reveal className="mt-10 text-center">
            <Eyebrow>Skills you'll master</Eyebrow>
            <SkillDrift skills={SKILLS} />
          </Reveal>
        </Container>
      </Section>


      {/* ═══════════ FINAL CTA ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container>
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-14 md:px-14 md:py-16"
            style={{
              background: 'linear-gradient(140deg, var(--cam-primary-dk) 0%, var(--cam-primary) 55%, color-mix(in oklab, var(--cam-primary) 85%, var(--cam-primary-lt)) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Subtle dot grid */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '54px 54px',
              }}
            />
            {/* Right-side ambient glow */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-2/3 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 70% 80% at 85% 50%, rgba(255,255,255,0.07), transparent 70%)' }}
            />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <Eyebrow tone="inverse">Ready when you are</Eyebrow>
                <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-white">
                  Start free.
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MagneticCTA strength={6}>
                  <CTAButton to={heroCtaHref} variant="inverse-primary" size="lg" trailingArrow>
                    {heroCta}
                  </CTAButton>
                </MagneticCTA>
                <MagneticCTA strength={4}>
                  <CTAButton to="/pricing" variant="inverse-secondary" size="lg">
                    See pricing
                  </CTAButton>
                </MagneticCTA>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <SiteFooter />
    </div>
  );
}

