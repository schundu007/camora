import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import JobUrlAnalysisDemo from '../components/shared/JobUrlAnalysisDemo';
import {
  ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles,
  FeatureLiveAIAnim, FeatureJobMatchAnim, FeaturePrepAnim, FeatureMockInterviewAnim,
} from '../components/landing/CardAnimations';
import CapabilityDeck from '../components/landing/CapabilityDeck';
import { Container, Section, Eyebrow, SectionHeading, CTAButton, SurfaceCard, Pill } from '../components/marketing/primitives';
import { cn } from '../utils/cn';

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
};

const Glyph = (path: JSX.Element) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const APPA: Step[] = [
  {
    key: 'apply', label: 'Apply', href: '/jobs',
    headline: 'Roles matched to your skills',
    desc: '1,000+ engineering roles with AI-powered matching. Auto-generate tailored resumes and cover letters.',
    Anim: ApplyAnim,
    icon: Glyph(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></>),
  },
  {
    key: 'prepare', label: 'Prepare', href: '/capra/prepare',
    headline: '1,400+ curated study topics',
    desc: 'System design, DSA, behavioral, databases. Each with AI explanations and architecture diagrams.',
    Anim: PrepareAnim,
    icon: Glyph(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  },
  {
    key: 'practice', label: 'Practice', href: '/capra/practice',
    headline: '3,500+ problems with AI feedback',
    desc: 'Real interview problems, multi-approach solutions, timed mock interviews scored on every dimension.',
    Anim: PracticeAnim,
    icon: Glyph(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></>),
  },
  {
    key: 'attend', label: 'Attend', href: '/lumora',
    headline: 'Real-time AI in the room',
    desc: 'Voice transcription captures the question. AI generates instant answers: diagrams, code, STAR coaching.',
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
    title: 'Real-time AI during interviews',
    desc: 'Voice transcription captures the question. AI generates instant answers in seconds. No other tool does this.',
    Anim: FeatureLiveAIAnim,
  },
  {
    label: 'Job Matching',
    title: 'AI-powered job discovery',
    desc: '1,000+ roles matched to your skills. Auto-generate tailored resumes and cover letters for every application.',
    Anim: FeatureJobMatchAnim,
  },
  {
    label: 'Prep',
    title: '1,400+ topics with diagrams',
    desc: 'System design, DSA, behavioral, databases — each with AI explanations and company-specific prep.',
    Anim: FeaturePrepAnim,
  },
  {
    label: 'Mock Interviews',
    title: 'AI-scored practice sessions',
    desc: 'Timed mock interviews with instant feedback. Scored on communication, accuracy, and code quality.',
    Anim: FeatureMockInterviewAnim,
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
];

/* ── Hooks ────────────────────────────────────────────── */
function useVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
    fetch(`${API}/api/visitors/unique-count`).then(r => r.json()).then(d => setCount(d.total)).catch(() => {});
  }, []);
  return count;
}

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      // emil-design-eng: stronger ease-out (cubic-bezier(0.23, 1, 0.32, 1)) and
      // sub-300ms duration. The previous 0.45s tween with the default soft curve
      // is the recognizable AI/Framer reveal — recognizable means slop.
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
  const visitorCount = useVisitorCount();

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
      <section className="relative overflow-hidden bg-[#0A1228] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 90% at 0% 55%, rgba(255,255,255,0.07), transparent 55%),' +
              'radial-gradient(ellipse 60% 80% at 12% 25%, rgba(201,162,39,0.18), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 92% 65%, rgba(38,97,156,0.28), transparent 60%),' +
              'linear-gradient(135deg, #07112A 0%, #0B1A3D 50%, #0A1228 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 60% 70% at 20% 30%, black, transparent 80%)',
          }}
        />

        <Container className="relative pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] items-center gap-12 lg:gap-16">

            {/* Left: headline + CTAs */}
            <div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
                <Pill tone="inverse" withDot>
                  The career platform for engineers
                </Pill>
              </motion.div>

              <motion.h1
                className="mt-6 font-display text-[40px] sm:text-[52px] md:text-[60px] lg:text-[64px] font-semibold tracking-tight leading-[1.02]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
              >
                <span className="block text-white">All your prep.</span>
                <span className="block text-[var(--cam-gold-leaf)]">
                  One trusted platform.
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 max-w-[520px] text-base md:text-lg leading-relaxed text-white/72"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.10, ease: [0.23, 1, 0.32, 1] }}
              >
                1,000+ matched roles, 1,400+ study topics, 3,500+ practice problems, and a live AI copilot answering the interviewer in real time: everything from first application to final offer.
              </motion.p>

              <motion.div
                className="mt-9 flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.16, ease: [0.23, 1, 0.32, 1] }}
              >
                <CTAButton to={heroCtaHref} variant="inverse-primary" size="lg" trailingArrow>
                  {heroCta}
                </CTAButton>
                <CTAButton to="/pricing" variant="inverse-secondary" size="lg">
                  View pricing
                </CTAButton>
              </motion.div>

              {visitorCount !== null && visitorCount > 0 && (
                <motion.p className="mt-7 text-[13px] text-white/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24, delay: 0.22, ease: [0.23, 1, 0.32, 1] }}>
                  Trusted by <strong className="text-white font-semibold">{visitorCount.toLocaleString()}+</strong> engineers worldwide
                </motion.p>
              )}
            </div>

            {/* Right: live session preview */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.40, delay: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(10,18,40,0.85)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.55)' }} />
                    <span className="text-[10px] font-mono text-white/45 tracking-[0.14em] uppercase">Sona · Live session</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/28">00:03:42</span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="rounded-xl border border-white/[0.08] p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-[9px] font-mono text-white/35 mb-1.5 uppercase tracking-[0.12em]">Interviewer</p>
                    <p className="text-[12.5px] text-white/80 leading-relaxed">Design a rate limiter handling 10M requests per day across multiple data centers.</p>
                  </div>

                  <div className="rounded-xl border p-3" style={{ background: 'rgba(201,162,39,0.07)', borderColor: 'rgba(201,162,39,0.2)' }}>
                    <p className="text-[9px] font-mono mb-1.5 uppercase tracking-[0.12em]" style={{ color: 'rgba(201,162,39,0.65)' }}>Sona</p>
                    <p className="text-[12.5px] text-white/90 leading-relaxed">Token bucket at the API gateway. Redis tracks per-user counters with sliding-window TTL. For multi-DC: replicate via pub/sub with eventual consistency, accept slight over-counting at boundaries.</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-mono text-white/40 rounded-full px-2 py-0.5 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.05)' }}>Architecture</span>
                      <span className="text-[9px] font-mono text-white/40 rounded-full px-2 py-0.5 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.05)' }}>Scalability</span>
                      <span className="text-[9px] font-mono text-white/40 rounded-full px-2 py-0.5 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.05)' }}>Draw diagram</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-[9px] font-mono text-white/28">Voice captured · transcribed in 0.4s</span>
                  <span className="text-[9px] font-mono" style={{ color: 'rgba(74,222,128,0.7)' }}>Answer ready</span>
                </div>
              </div>
            </motion.div>

          </div>
        </Container>
      </section>

      {/* ═══════════ LOGO STRIP ═══════════ */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)] py-10 overflow-hidden">
        <p className="text-center font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Trusted by engineers at
        </p>
        <div className="relative mt-6">
          <div className="absolute left-0 inset-y-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-[var(--bg-surface)] to-transparent" />
          <div className="absolute right-0 inset-y-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-[var(--bg-surface)] to-transparent" />
          <div className="flex" style={{ animation: 'scroll-logos 36s linear infinite', width: 'max-content' }}>
            {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((c, i) => (
              <img
                key={`${c}-${i}`}
                src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
                alt={c}
                className="h-6 mx-7 shrink-0 object-contain"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        </div>
        <style>{`@keyframes scroll-logos { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ═══════════ APPA — THE PROCESS ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="The process"
              title={<>Your path to <span className="text-[var(--cam-primary)]">the offer.</span></>}
              lead="Four surfaces, one continuous workflow: from the first job description to the live interview."
            />
          </Reveal>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5 items-stretch">

            {/* Left: Apply / Prepare / Practice — compact horizontal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-5">
              {APPA.filter(s => s.key !== 'attend').map((step, i) => (
                <Reveal key={step.key} delay={i * 0.06}>
                  <Link
                    to={step.href}
                    className="group flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.16)]"
                  >
                    <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--cam-primary)]">
                      {step.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--cam-primary)]">
                        {step.label}
                      </p>
                      <h3 className="mt-0.5 font-display text-[15px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">
                        {step.headline}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                        {step.desc}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>

            {/* Right: Attend — large feature card */}
            {APPA.filter(s => s.key === 'attend').map(step => (
              <Reveal key={step.key} delay={0.12}>
                <Link
                  to={step.href}
                  className="group flex flex-col h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.16)]"
                >
                  <div className="relative h-48 sm:h-56 overflow-hidden bg-[var(--bg-elevated)] shrink-0">
                    <step.Anim />
                  </div>
                  <div className="flex flex-col flex-1 p-7">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--cam-primary)]">
                      {step.icon}
                    </span>
                    <p className="mt-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--cam-primary)]">
                      {step.label}
                    </p>
                    <h3 className="mt-1.5 font-display text-[24px] md:text-[28px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">
                      {step.headline}
                    </h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      {step.desc}
                    </p>
                    <div className="mt-6">
                      <CTAButton to={step.href} variant="primary" size="md" trailingArrow>
                        Try live AI
                      </CTAButton>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}

          </div>
        </Container>
      </Section>

      {/* ═══════════ CAPABILITY DECK ═══════════ */}
      <Section tone="muted" spacing="lg">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <Reveal>
                <SectionHeading
                  eyebrow="Camora · AI copilot"
                  title={<>One tool.<br /><span className="text-[var(--cam-primary)]">Every interview.</span></>}
                  lead="Live voice assistance. Coding with three approaches and follow-ups. Multi-cloud architecture on AWS, GCP, Azure. Complete design problems: requirements through API. Company-specific prep for the full loop. Mock-interview scoring across every dimension."
                />
                <div className="mt-7 flex items-center gap-4">
                  <CTAButton to="/lumora" variant="primary" size="md" trailingArrow>
                    Try live AI
                  </CTAButton>
                  <CTAButton to="/pricing" variant="ghost" size="md">
                    View pricing →
                  </CTAButton>
                </div>
              </Reveal>
            </div>
            <div className="lg:col-span-7 w-full">
              <Reveal delay={0.12}>
                <CapabilityDeck />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ═══════════ FEATURES — Bento grid ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Only on Camora"
              title="Features that set us apart."
              lead="Live transcription. Architecture diagrams. AI-scored mocks. Built so the live interview goes the way you rehearsed."
            />
          </Reveal>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridAutoFlow: 'dense' }}>
            {FEATURES.map((f, i) => {
              const wide = f.label === 'Live AI' || f.label === 'Mock Interviews';
              return (
                <Reveal key={f.title} delay={i * 0.06} className={wide ? 'md:col-span-2' : ''}>
                  <SurfaceCard interactive padding="lg" className="h-full">
                    <Eyebrow tone="accent">{f.label}</Eyebrow>
                    <h3 className="mt-2 font-display text-[20px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                      {f.desc}
                    </p>
                    <div className="mt-5 -mx-2 h-32 md:h-36 overflow-hidden rounded-xl bg-[var(--bg-elevated)] relative">
                      <f.Anim />
                    </div>
                  </SurfaceCard>
                </Reveal>
              );
            })}
          </div>

          {/* Highlights bar */}
          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-2xl bg-[var(--cam-primary)] px-6 py-4">
              {HIGHLIGHTS.map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Skills — minor visual rhythm */}
          <Reveal className="mt-10 text-center">
            <Eyebrow>Skills you'll master</Eyebrow>
            <div className="mt-4 mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2">
              {SKILLS.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 font-mono text-[11px] font-semibold tracking-wide text-[var(--text-primary)] transition-colors hover:border-[var(--cam-primary)] hover:text-[var(--cam-primary)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ═══════════ JOB URL ANALYSIS ═══════════ */}
      <Section tone="muted" spacing="lg">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 w-full">
              <Reveal>
                <JobUrlAnalysisDemo />
              </Reveal>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={0.12}>
                <SectionHeading
                  eyebrow="Smart prep"
                  title={<>Paste a job URL.<br /><span className="text-[var(--cam-primary)]">Get a prep plan.</span></>}
                  lead="AI analyzes the job description, identifies required skills, and generates a tailored preparation plan with coding topics, system design patterns, and behavioral questions."
                />
                <div className="mt-7">
                  <CTAButton to="/jobs" variant="primary" trailingArrow>
                    Try job analysis
                  </CTAButton>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ═══════════ TWO AUDIENCES ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Built for both sides of the table"
              title={<>One platform. <span className="text-[var(--cam-primary)]">Two audiences.</span></>}
            />
          </Reveal>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AudienceCard
              eyebrow="For engineers"
              title="Roles, practice & live AI"
              body="1,000+ engineering roles matched to your skills, 1,400+ curated study topics with diagrams, and 3,500+ problems with AI feedback. Then live transcription assistance during the interview itself: the moment that decides the offer."
              ctaLabel={isAuthenticated ? 'Open dashboard' : 'Start free'}
              ctaHref="/capra/prepare"
            />
            <AudienceCard
              eyebrow="For recruiters"
              title="Identify top technical talent"
              body="Camora trains engineers, then helps you spot them. Sponsor coding contests, surface candidates ready for the loop, and shorten time-to-hire."
              ctaLabel="Explore partnerships"
              ctaHref="/pricing"
              tone="dark"
            />
          </div>
        </Container>
      </Section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-[#0A1228] px-8 py-14 md:px-14 md:py-16 text-white">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '54px 54px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 30% 30%, black, transparent 75%)',
              }}
            />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <Eyebrow tone="inverse">Ready when you are</Eyebrow>
                <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]">
                  Start free.<br />
                  <span className="text-[var(--cam-gold-leaf-lt)]">Win the offer.</span>
                </h2>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/70">
                  One free hour, no card required. Pick a plan when you're ready — top-ups never expire.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CTAButton to={heroCtaHref} variant="inverse-primary" size="lg" trailingArrow>
                  {heroCta}
                </CTAButton>
                <CTAButton to="/pricing" variant="inverse-secondary" size="lg">
                  See pricing
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

function AudienceCard({
  eyebrow, title, body, ctaLabel, ctaHref, tone = 'light',
}: {
  eyebrow: string; title: string; body: string; ctaLabel: string; ctaHref: string; tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <Reveal>
      <div
        className={cn(
          'relative h-full overflow-hidden rounded-3xl border p-8 md:p-10',
          dark
            ? 'bg-[#0A1228] border-white/10 text-white'
            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)] shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)]',
        )}
      >
        {dark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.14]"
            style={{
              background:
                'radial-gradient(ellipse 60% 70% at 100% 0%, rgba(201,162,39,0.45), transparent 60%)',
            }}
          />
        )}
        <div className="relative">
          <Eyebrow tone={dark ? 'inverse' : 'accent'}>{eyebrow}</Eyebrow>
          <h3 className={cn(
            'mt-3 font-display text-[24px] md:text-[28px] font-semibold tracking-tight leading-tight',
            dark ? 'text-white' : 'text-[var(--text-primary)]',
          )}>
            {title}
          </h3>
          <p className={cn(
            'mt-4 max-w-prose text-[14.5px] leading-relaxed',
            dark ? 'text-white/72' : 'text-[var(--text-secondary)]',
          )}>
            {body}
          </p>
          <div className="mt-7">
            <CTAButton to={ctaHref} variant={dark ? 'inverse-primary' : 'primary'} trailingArrow>
              {ctaLabel}
            </CTAButton>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
