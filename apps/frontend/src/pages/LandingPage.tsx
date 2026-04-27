import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import JobUrlAnalysisDemo from '../components/shared/JobUrlAnalysisDemo';
import { ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles, FeatureLiveAIAnim, FeatureJobMatchAnim, FeaturePrepAnim, FeatureMockInterviewAnim } from '../components/landing/CardAnimations';
import CapabilityDeck from '../components/landing/CapabilityDeck';
import CountUp from '../components/shared/animation/CountUp';
import { BentoCell } from '../components/shared/docs';
import { HexBadge, type HexColor } from '../components/shared/HexBadge';
import { StrengthsRow } from '../components/landing/StrengthsRow';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE
   ══════════════════════════════════════════════════════════════ */

const F = {
  display: 'Clash Display, system-ui, sans-serif',
  body: 'Satoshi, Inter, sans-serif',
  mono: 'JetBrains Mono, monospace',
};

/* ── APPA Steps ───────────────────────────────────────── */
type AppaStep = {
  key: string;
  label: string;
  href: string;
  headline: string;
  desc: string;
  Anim: () => JSX.Element;
  hexColor: HexColor;
  glyph: JSX.Element;
};
// White-stroke glyphs render inside HexBadge (badge fill provides the colour).
const G = (path: JSX.Element) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
const APPA: AppaStep[] = [
  {
    key: 'apply', label: 'APPLY', href: '/jobs',
    headline: 'Discover roles matched to your skills',
    desc: 'Browse 1,000+ engineering roles with AI-powered matching. Auto-generate tailored resumes and cover letters.',
    Anim: ApplyAnim,
    hexColor: 'navy-lt',
    glyph: G(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></>),
  },
  {
    key: 'prepare', label: 'PREPARE', href: '/capra/prepare',
    headline: 'Study 800+ curated interview topics',
    desc: 'System design, DSA, behavioral, databases, and low-level design with AI-powered explanations and architecture diagrams.',
    Anim: PrepareAnim,
    hexColor: 'navy',
    glyph: G(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  },
  {
    key: 'practice', label: 'PRACTICE', href: '/capra/practice',
    headline: 'Solve 1,850+ problems with AI feedback',
    desc: 'Real interview problems with multi-approach solutions. Timed mock interviews scored on communication and accuracy.',
    Anim: PracticeAnim,
    hexColor: 'gold',
    glyph: G(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></>),
  },
  {
    key: 'attend', label: 'ATTEND', href: '/lumora',
    headline: 'Real-time AI during your live interview',
    desc: 'Voice transcription captures the question. AI generates instant answers — system design diagrams, coding solutions, and STAR coaching.',
    Anim: AttendAnim,
    hexColor: 'navy-dk',
    glyph: G(<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>),
  },
];

/* ── Stats ─────────────────────────────────────────────── */
const STATS: { value: number; suffix: string; label: string }[] = [
  { value: 800,   suffix: '+', label: 'Study Topics' },
  { value: 1850,  suffix: '+', label: 'Problems' },
  { value: 1000,  suffix: '+', label: 'Companies' },
  { value: 50,    suffix: '+', label: 'Languages' },
];

/* ── Company logos ───────────────────── */
const LOGO_TOKEN = 'pk_VzK1OM-OQSCUuysDpOCzKw';
const COMPANY_LOGOS = [
  'google', 'amazon', 'meta', 'apple', 'netflix', 'microsoft',
  'uber', 'stripe', 'airbnb', 'nvidia', 'spotify', 'salesforce',
  'adobe', 'oracle', 'intel', 'ibm', 'twitter', 'linkedin',
  'tesla', 'paypal', 'shopify', 'atlassian', 'databricks', 'snowflake',
];

/* ── Top 4 Features ─────────────────────────────────── */
const FEATURES = [
  {
    label: 'LIVE AI',
    title: 'Real-time AI during interviews',
    desc: 'Voice transcription captures the question. AI generates instant answers in seconds — no other tool does this.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" /></svg>,
    Anim: FeatureLiveAIAnim,
  },
  {
    label: 'JOB MATCHING',
    title: 'AI-powered job discovery',
    desc: '1,000+ roles matched to your skills. Auto-generate tailored resumes and cover letters for every application.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    Anim: FeatureJobMatchAnim,
  },
  {
    label: 'PREP',
    title: '800+ topics with diagrams',
    desc: 'System design, DSA, behavioral, databases — each with AI explanations, architecture diagrams, and company-specific prep.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
    Anim: FeaturePrepAnim,
  },
  {
    label: 'MOCK INTERVIEWS',
    title: 'AI-scored practice sessions',
    desc: 'Timed mock interviews with instant feedback. Scored on communication, accuracy, and code quality.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    Anim: FeatureMockInterviewAnim,
  },
];

/* ── Skills covered (shown beneath feature cards) ─────── */
const SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++', 'SQL',
  'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'System Design', 'DSA', 'Behavioral',
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

/* ── Reveal ───────────────────────────────────────────── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}>{children}</motion.div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const visitorCount = useVisitorCount();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = 'Camora — Apply, Prepare, Practice & Attend'; return () => { document.title = 'Camora'; }; }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: F.body, color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
      <SEO path="/" />

      <style>{`@keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <CardAnimationStyles />
      <SiteNav variant="light" />

      {/* ═══════════ 1. HERO — dark band w/ embedded stat strip ═══════════ */}
      <section
        className="relative pt-20 pb-12 md:pt-24 md:pb-16 px-6 text-center overflow-hidden"
        style={{
          background:
            'var(--cam-hero-bg)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,255,255,0.07), transparent 70%)',
          }}
        />

        <div className="relative max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: F.mono }}>
              THE CAREER PLATFORM
            </span>
          </motion.div>

          <motion.h1 className="mt-5" style={{ fontFamily: F.display }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
            <span className="block text-[36px] sm:text-[48px] md:text-[60px] lg:text-[68px] font-bold leading-[1.05] tracking-tight uppercase text-white">
              ALL YOUR PREP.
            </span>
            <span className="block text-[36px] sm:text-[48px] md:text-[60px] lg:text-[68px] font-bold leading-[1.05] tracking-tight uppercase" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
              ONE TRUSTED PLATFORM.
            </span>
          </motion.h1>

          <motion.p className="mt-5 text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}>
            Job discovery, interview prep, mock practice, and live AI assistance — all in one place.
          </motion.p>

          <motion.div className="mt-7 flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}>
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'}
              className="press inline-flex items-center gap-2 px-7 py-3 text-[13px] font-bold uppercase tracking-[0.08em] rounded-full transition-all hover:scale-[1.02]"
              style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', boxShadow: '0 6px 18px rgba(0,0,0,0.22)' }}>
              {isAuthenticated ? 'GO TO DASHBOARD' : 'GET STARTED FREE'}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </Link>
            <Link to="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3 text-[13px] font-bold uppercase tracking-[0.08em] rounded-full transition-all"
              style={{ color: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.22)' }}>
              VIEW PRICING
            </Link>
          </motion.div>

          {visitorCount !== null && visitorCount > 0 && (
            <motion.p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Trusted by <strong className="text-white">{visitorCount.toLocaleString()}+</strong> engineers worldwide
            </motion.p>
          )}

          {/* Stat strip embedded in hero — replaces the standalone STATS section */}
          <motion.div
            className="mt-12 md:mt-14 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.36 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '2rem' }}
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[34px] md:text-[40px] font-bold tracking-tight leading-none text-white" style={{ fontFamily: F.display }}>
                  <CountUp value={s.value} suffix={s.suffix} duration={1400} />
                </p>
                <p className="text-[10px] font-bold mt-2 uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: F.mono }}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 2. COMPANY LOGOS — Scrolling, tight band ═══════════ */}
      <section className="py-8 overflow-hidden border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] mb-5" style={{ color: 'var(--text-muted)' }}>Trusted by engineers at</p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 z-10" style={{ background: 'linear-gradient(to right, var(--bg-surface), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 z-10" style={{ background: 'linear-gradient(to left, var(--bg-surface), transparent)' }} />
          <div className="flex" style={{ animation: 'scroll-logos 36s linear infinite', width: 'max-content' }}>
            {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((c, i) => (
              <img key={`${c}-${i}`} src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
                alt={c} className="h-5 object-contain opacity-40 mx-6 shrink-0" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 3. APPA — THE PROCESS ═══════════ */}
      <section className="px-6 py-16 md:py-20 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-10 md:mb-12">
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>THE PROCESS</span>
            <h2 className="mt-3 text-[28px] md:text-[36px] font-bold tracking-tight uppercase" style={{ fontFamily: F.display, lineHeight: 1.1 }}>
              YOUR PATH TO <span style={{ color: 'var(--cam-primary)' }}>THE OFFER.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {APPA.map((step, i) => (
              <Reveal key={step.key} delay={i * 0.06}>
                <Link to={step.href} className="card-lift block rounded-lg h-full bg-[var(--bg-surface)] border border-[var(--border)] group overflow-hidden">
                  <div className="w-full h-32 overflow-hidden relative" style={{ background: 'var(--bg-elevated)' }}>
                    <step.Anim />
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <HexBadge color={step.hexColor} size={44} icon={step.glyph} />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-camora-primary" style={{ fontFamily: F.mono }}>{step.label}</span>
                    <h3 className="mt-1.5 text-[15px] md:text-base font-bold tracking-tight" style={{ fontFamily: F.display, lineHeight: 1.25 }}>{step.headline}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-4 text-[11px] font-bold uppercase tracking-wider group-hover:gap-2 transition-all text-camora-primary">
                      Explore &rsaquo;
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 4. CAPABILITY DECK — Everything Camora does, on loop ═══════════ */}
      <section className="px-6 py-16 md:py-20" style={{ background: 'var(--cam-surface-lt)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: text */}
            <div className="lg:w-[38%]">
              <Reveal>
                <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>CAMORA · AI COPILOT</span>
                <h2 className="mt-3 text-[28px] md:text-[36px] font-bold tracking-tight uppercase" style={{ fontFamily: F.display, lineHeight: 1.1 }}>
                  ONE TOOL.<br /><span style={{ color: 'var(--cam-primary)' }}>EVERY INTERVIEW.</span>
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Live voice assistance. Coding with three approaches and follow-ups. Multi-cloud architecture on AWS, GCP, Azure. Complete design problems — requirements through API. Company-specific prep for the full loop: HR, Hiring Manager, Coding, Design, Behavioral. Mock-interview scoring across every dimension.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <Link to="/lumora" className="px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] rounded-full bg-camora-primary text-camora-mist hover:bg-camora-primaryDk transition-all">
                    TRY LIVE AI
                  </Link>
                  <Link to="/pricing" className="text-[12px] font-bold uppercase tracking-wider text-camora-primary hover:text-camora-primaryDk">
                    VIEW PRICING &rsaquo;
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right: capability deck */}
            <div className="lg:w-[62%] w-full">
              <Reveal delay={0.12}>
                <CapabilityDeck />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 5. FEATURES — Bento grid ═══════════ */}
      <section className="px-6 py-16 md:py-20 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-left max-w-3xl mb-10">
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--accent)', fontFamily: F.mono }}>ONLY ON CAMORA</span>
            <h2 className="mt-3 text-[28px] md:text-[36px] font-bold tracking-tight" style={{ fontFamily: F.display, lineHeight: 1.1 }}>
              Features that set us apart.
            </h2>
            <p className="mt-3 text-[15px] md:text-base" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Live transcription. Architecture diagrams. AI-scored mocks. Engineered for the moment that decides the offer.
            </p>
          </Reveal>

          {/* Bento layout: row 1 = LIVE AI (wide) + JOB MATCHING.
              row 2 = PREP + MOCK INTERVIEWS (wide). */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridAutoFlow: 'dense' }}>
            {FEATURES.map((f, i) => {
              const wide = f.label === 'LIVE AI' || f.label === 'MOCK INTERVIEWS';
              return (
                <Reveal key={f.title} delay={i * 0.06} className={wide ? 'md:col-span-2' : ''}>
                  <BentoCell
                    size={wide ? 'lg' : 'sm'}
                    eyebrow={f.label}
                    title={f.title}
                    description={f.desc}
                    className="h-full"
                  >
                    <div className="mt-3 -mx-1 rounded-lg overflow-hidden h-28 md:h-32 relative" style={{ background: 'var(--bg-elevated)' }}>
                      <f.Anim />
                    </div>
                  </BentoCell>
                </Reveal>
              );
            })}
          </div>

          {/* Feature highlights bar — tighter, single row */}
          <Reveal className="mt-8">
            <div className="flex items-center justify-center gap-6 md:gap-8 flex-wrap px-6 py-3 rounded-lg bg-camora-primary">
              {['50+ Languages', 'Architecture Diagrams', 'Company-Specific Prep', 'Stealth Desktop App', 'Voice Filtering'].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-camora-mist text-[11px] font-bold uppercase tracking-wider">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {f}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Skills covered — what you'll master */}
          <Reveal className="mt-8 text-center">
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>
              SKILLS YOU'LL MASTER
            </span>
            <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap max-w-4xl mx-auto">
              {SKILLS.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all hover:scale-105 bg-white border border-camora-blue-100"
                  style={{
                    fontFamily: F.mono,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ 6. JOB URL ANALYSIS ═══════════ */}
      <section className="px-6 py-16 md:py-20" style={{ background: 'var(--cam-surface-lt)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: animated demo */}
            <div className="lg:w-[55%] w-full">
              <Reveal>
                <JobUrlAnalysisDemo />
              </Reveal>
            </div>

            {/* Right: text */}
            <div className="lg:w-[45%]">
              <Reveal delay={0.12}>
                <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>SMART PREP</span>
                <h2 className="mt-3 text-[28px] md:text-[36px] font-bold tracking-tight uppercase" style={{ fontFamily: F.display, lineHeight: 1.1 }}>
                  PASTE A JOB URL.<br /><span style={{ color: 'var(--cam-primary)' }}>GET A PREP PLAN.</span>
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  AI analyzes the job description, identifies required skills, and generates a tailored preparation plan with coding topics, system design patterns, and behavioral questions.
                </p>
                <div className="mt-6">
                  <Link to="/jobs" className="px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] rounded-full bg-camora-primary text-camora-mist hover:bg-camora-primaryDk transition-all">
                    TRY JOB ANALYSIS
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 7. STRENGTHS — "Both sides of the table" ═══════════ */}
      <section className="px-6 py-16 md:py-20 bg-[var(--bg-surface)]">
        <Reveal className="text-center mb-10 max-w-3xl mx-auto">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>
            BUILT FOR BOTH SIDES OF THE TABLE
          </span>
          <h2 className="mt-3 text-[26px] md:text-[32px] font-bold tracking-tight" style={{ fontFamily: F.display, lineHeight: 1.15 }}>
            One platform.<br /><span style={{ color: 'var(--cam-primary)' }}>Two audiences.</span>
          </h2>
        </Reveal>

        <StrengthsRow
          columns={[
            {
              hexes: [
                { color: 'navy-lt', icon: G(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></>) },
                { color: 'navy', icon: G(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>) },
                { color: 'gold', icon: G(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>) },
              ],
              heading: 'Roles, Practice & Live AI',
              headingColor: 'navy',
              body: (
                <>
                  1,000+ engineering roles matched to your skills, 800+ curated study topics
                  with diagrams, and 1,850+ problems with AI feedback. Then live transcription
                  assistance during the interview itself — the moment that decides the offer.
                </>
              ),
              linkText: 'Start free',
              linkHref: isAuthenticated ? '/capra/prepare' : '/signup',
            },
            {
              hexes: [
                { color: 'gold', icon: G(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>) },
                { color: 'navy-dk', icon: G(<><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" /></>) },
              ],
              heading: 'Identify Top Technical Talent',
              headingColor: 'gold',
              body: (
                <>
                  Camora trains engineers — sponsor coding contests, surface candidates ready
                  for the loop, and shorten time-to-hire. The same platform that shapes the
                  candidate is the one that helps you spot them.
                </>
              ),
              linkText: 'Partnerships',
              linkHref: '/pricing',
            },
          ]}
        />
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}
