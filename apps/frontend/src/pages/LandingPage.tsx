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

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE
   ══════════════════════════════════════════════════════════════ */

const F = {
  display: 'Clash Display, system-ui, sans-serif',
  body: 'Satoshi, Inter, sans-serif',
  mono: 'JetBrains Mono, monospace',
};

/* ── APPA Steps ───────────────────────────────────────── */
const APPA = [
  {
    key: 'apply', label: 'APPLY', href: '/jobs',
    headline: 'Discover roles matched to your skills',
    desc: 'Browse 1,000+ engineering roles with AI-powered matching. Auto-generate tailored resumes and cover letters.',
    Anim: ApplyAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></svg>,
  },
  {
    key: 'prepare', label: 'PREPARE', href: '/capra/prepare',
    headline: 'Study 800+ curated interview topics',
    desc: 'System design, DSA, behavioral, databases, and low-level design with AI-powered explanations and architecture diagrams.',
    Anim: PrepareAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  },
  {
    key: 'practice', label: 'PRACTICE', href: '/capra/practice',
    headline: 'Solve 1,850+ problems with AI feedback',
    desc: 'Real interview problems with multi-approach solutions. Timed mock interviews scored on communication and accuracy.',
    Anim: PracticeAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg>,
  },
  {
    key: 'attend', label: 'ATTEND', href: '/lumora',
    headline: 'Real-time AI during your live interview',
    desc: 'Voice transcription captures the question. AI generates instant answers — system design diagrams, coding solutions, and STAR coaching.',
    Anim: AttendAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
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

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20 px-6 text-center" style={{ background: 'linear-gradient(180deg, var(--cam-mist) 0%, var(--bg-app) 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>
              THE CAREER PLATFORM
            </span>
          </motion.div>

          <motion.h1 className="mt-6" style={{ fontFamily: F.display }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <span className="block text-[40px] sm:text-[60px] md:text-[80px] lg:text-[96px] font-bold leading-[1.02] tracking-tight uppercase">
              ALL YOUR PREP.
            </span>
            <span className="block text-[48px] sm:text-[64px] md:text-[80px] lg:text-[96px] font-bold leading-[1.02] tracking-tight uppercase" style={{ color: 'var(--cam-primary)' }}>
              ONE TRUSTED PLATFORM.
            </span>
          </motion.h1>

          <motion.p className="mt-7 text-lg md:text-xl max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Job discovery, interview prep, mock practice, and live AI assistance — all in one place.
          </motion.p>

          <motion.div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'}
              className="press px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full transition-all bg-camora-primary text-camora-mist hover:bg-camora-primaryDk">
              {isAuthenticated ? 'GO TO DASHBOARD' : 'GET STARTED FREE'}
            </Link>
            <Link to="/pricing"
              className="press px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full transition-all border border-camora-primaryDk text-camora-primary hover:bg-camora-mist">
              VIEW PRICING &rsaquo;
            </Link>
          </motion.div>

          {visitorCount !== null && visitorCount > 0 && (
            <motion.p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Trusted by <strong style={{ color: 'var(--text-primary)' }}>{visitorCount.toLocaleString()}+</strong> engineers worldwide
            </motion.p>
          )}
        </div>
      </section>

      {/* ═══════════ 2. COMPANY LOGOS — Scrolling ═══════════ */}
      <section className="py-10 overflow-hidden bg-[var(--bg-surface)]">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--text-muted)' }}>Trusted by engineers at</p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 z-10" style={{ background: 'linear-gradient(to right, var(--bg-surface), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 z-10" style={{ background: 'linear-gradient(to left, var(--bg-surface), transparent)' }} />
          <div className="flex" style={{ animation: 'scroll-logos 30s linear infinite', width: 'max-content' }}>
            {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((c, i) => (
              <img key={`${c}-${i}`} src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
                alt={c} className="h-5 object-contain opacity-30 mx-6 shrink-0" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 3. STATS ═══════════ */}
      <section
        className="relative px-6 py-24 overflow-hidden"
        style={{
          // Left-to-right blue → white wash. Replaces the previous grass
          // photo with the gettyimages watermark; matches the brand's blue
          // accents and stays readable behind the dark stat numerals.
          background:
            'linear-gradient(90deg, #2A66AE 0%, #4F86C5 35%, #B7CFE6 70%, #FFFFFF 100%)',
        }}
      >
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="text-center">
                  <p className="text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: F.display, color: 'var(--text-primary)' }}>
                    <CountUp value={s.value} suffix={s.suffix} duration={1400} />
                  </p>
                  <p className="text-xs font-bold mt-3 uppercase tracking-[0.15em] text-camora-primary" style={{ fontFamily: F.mono }}>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 4. APPA — THE PROCESS ═══════════ */}
      <section className="px-6 py-28 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>THE PROCESS</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
              YOUR PATH TO <span style={{ color: 'var(--cam-primary)' }}>THE OFFER.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {APPA.map((step, i) => (
              <Reveal key={step.key} delay={i * 0.06}>
                <Link to={step.href} className="card-lift block rounded-lg h-full bg-[var(--bg-surface)] border border-[var(--border)] group overflow-hidden">
                  <div className="w-full h-40 overflow-hidden relative" style={{ background: 'var(--bg-elevated)' }}>
                    <step.Anim />
                  </div>
                  <div className="p-8">
                    <div className="mb-5">{step.icon}</div>
                    <span className="text-xs font-bold tracking-[0.15em] uppercase text-camora-primary" style={{ fontFamily: F.mono }}>{step.label}</span>
                    <h3 className="mt-2 text-lg font-bold tracking-tight" style={{ fontFamily: F.display }}>{step.headline}</h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-5 text-xs font-bold uppercase tracking-wider group-hover:gap-2 transition-all text-camora-primary">
                      Explore &rsaquo;
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 5. CAPABILITY DECK — Everything Camora does, on loop ═══════════ */}
      <section className="px-6 py-28" style={{ background: 'var(--cam-surface-lt)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: text */}
            <div className="lg:w-[38%]">
              <Reveal>
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>CAMORA · AI COPILOT</span>
                <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
                  ONE TOOL.<br /><span style={{ color: 'var(--cam-primary)' }}>EVERY INTERVIEW.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Live voice assistance. Coding with three approaches and follow-ups. Multi-cloud architecture on AWS, GCP, Azure. Complete design problems — requirements through API. Company-specific prep for the full loop: HR, Hiring Manager, Coding, Design, Behavioral. Mock-interview scoring across every dimension.
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <Link to="/lumora" className="px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] rounded-full bg-camora-primary text-camora-mist hover:bg-camora-primaryDk transition-all">
                    TRY LIVE AI
                  </Link>
                  <Link to="/pricing" className="text-sm font-bold uppercase tracking-wider text-camora-primary hover:text-camora-primaryDk">
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

      {/* ═══════════ 6. FEATURES — Bento grid ═══════════ */}
      <section className="px-6 py-24 md:py-28 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-left max-w-3xl mb-12 md:mb-14">
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--accent)', fontFamily: F.mono }}>ONLY ON CAMORA</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: F.display, lineHeight: 1.1 }}>
              Features that set us apart.
            </h2>
            <p className="mt-4 text-base md:text-lg" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Live transcription. Architecture diagrams. AI-scored mocks. Engineered for the moment that decides the offer.
            </p>
          </Reveal>

          {/* Bento layout: row 1 = LIVE AI (wide) + JOB MATCHING.
              row 2 = PREP + MOCK INTERVIEWS (wide). */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5" style={{ gridAutoFlow: 'dense' }}>
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
                    <div className="mt-4 -mx-1 rounded-lg overflow-hidden h-32 md:h-40 relative" style={{ background: 'var(--bg-elevated)' }}>
                      <f.Anim />
                    </div>
                  </BentoCell>
                </Reveal>
              );
            })}
          </div>

          {/* Feature highlights bar */}
          <Reveal className="mt-12">
            <div className="flex items-center justify-center gap-8 flex-wrap px-8 py-4 rounded-lg bg-camora-primary">
              {['50+ Languages', 'Architecture Diagrams', 'Company-Specific Prep', 'Stealth Desktop App', 'Voice Filtering'].map(f => (
                <span key={f} className="flex items-center gap-2 text-camora-mist text-xs font-bold uppercase tracking-wider">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {f}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Skills covered — what you'll master */}
          <Reveal className="mt-8 text-center">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>
              SKILLS YOU'LL MASTER
            </span>
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap max-w-4xl mx-auto">
              {SKILLS.map((s) => (
                <span
                  key={s}
                  className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 bg-white border border-camora-blue-100"
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

      {/* ═══════════ 7. JOB URL ANALYSIS ═══════════ */}
      <section className="px-6 py-28" style={{ background: 'var(--cam-surface-lt)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: animated demo */}
            <div className="lg:w-[55%] w-full">
              <Reveal>
                <JobUrlAnalysisDemo />
              </Reveal>
            </div>

            {/* Right: text */}
            <div className="lg:w-[45%]">
              <Reveal delay={0.12}>
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>SMART PREP</span>
                <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
                  PASTE A JOB URL.<br /><span style={{ color: 'var(--cam-primary)' }}>GET A PREP PLAN.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  AI analyzes the job description, identifies required skills, and generates a tailored preparation plan with coding topics, system design patterns, and behavioral questions.
                </p>
                <div className="mt-8">
                  <Link to="/jobs" className="px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] rounded-full bg-camora-primary text-camora-mist hover:bg-camora-primaryDk transition-all">
                    TRY JOB ANALYSIS
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 8. FINAL CTA BANNER ═══════════ */}
      <section className="px-6 py-20 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-10 md:px-16 py-12 rounded-2xl" style={{ background: 'var(--cam-void)' }}>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: F.display }}>
                WHERE CAREERS<br /><span style={{ color: 'var(--cam-primary-lt)' }}>TAKE OFF.</span>
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                {['Free to start', 'No credit card required', 'Cancel anytime'].map(t => (
                  <span key={t} className="flex items-center gap-2 text-sm text-white/80">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary-lt)" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to={isAuthenticated ? '/capra/prepare' : '/signup'}
                className="px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full bg-white text-camora-primary hover:bg-camora-mist">
                GET STARTED FREE
              </Link>
              <Link to="/pricing"
                className="px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full text-white border border-white/30 hover:bg-white/10">
                VIEW PRICING
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}
