import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import JobUrlAnalysisDemo from '../components/shared/JobUrlAnalysisDemo';
import { ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles, FeatureLiveAIAnim, FeatureJobMatchAnim, FeaturePrepAnim, FeatureMockInterviewAnim } from '../components/landing/CardAnimations';
import LiveAIDemoCard from '../components/landing/LiveAIDemoCard';
import CapabilityDeck from '../components/landing/CapabilityDeck';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE
   ══════════════════════════════════════════════════════════════ */

const F = {
  display: "'Source Sans 3', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'Source Code Pro', monospace",
};

const accent = '#29B5E8';

/* ── APPA Steps ───────────────────────────────────────── */
const APPA = [
  {
    key: 'apply', label: 'APPLY', href: '/jobs',
    headline: 'Discover roles matched to your skills',
    desc: 'Browse 1,000+ engineering roles with AI-powered matching. Auto-generate tailored resumes and cover letters.',
    Anim: ApplyAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></svg>,
  },
  {
    key: 'prepare', label: 'PREPARE', href: '/capra/prepare',
    headline: 'Study 800+ curated interview topics',
    desc: 'System design, DSA, behavioral, databases, and low-level design with AI-powered explanations and architecture diagrams.',
    Anim: PrepareAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  },
  {
    key: 'practice', label: 'PRACTICE', href: '/capra/practice',
    headline: 'Solve 1,850+ problems with AI feedback',
    desc: 'Real interview problems with multi-approach solutions. Timed mock interviews scored on communication and accuracy.',
    Anim: PracticeAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg>,
  },
  {
    key: 'attend', label: 'ATTEND', href: '/lumora',
    headline: 'Real-time AI during your live interview',
    desc: 'Voice transcription captures the question. AI generates instant answers — system design diagrams, coding solutions, and STAR coaching.',
    Anim: AttendAnim,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
  },
];

/* ── Stats ─────────────────────────────────────────────── */
const STATS = [
  { value: '800+', label: 'Study Topics' },
  { value: '1,850+', label: 'Problems' },
  { value: '1,000+', label: 'Companies' },
  { value: '50+', label: 'Languages' },
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
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" /></svg>,
    Anim: FeatureLiveAIAnim,
  },
  {
    label: 'JOB MATCHING',
    title: 'AI-powered job discovery',
    desc: '1,000+ roles matched to your skills. Auto-generate tailored resumes and cover letters for every application.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    Anim: FeatureJobMatchAnim,
  },
  {
    label: 'PREP',
    title: '800+ topics with diagrams',
    desc: 'System design, DSA, behavioral, databases — each with AI explanations, architecture diagrams, and company-specific prep.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
    Anim: FeaturePrepAnim,
  },
  {
    label: 'MOCK INTERVIEWS',
    title: 'AI-scored practice sessions',
    desc: 'Timed mock interviews with instant feedback. Scored on communication, accuracy, and code quality.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
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
    <div className="min-h-screen flex flex-col" style={{ fontFamily: F.body, color: '#0F172A', background: '#FFFFFF' }}>
      <SEO path="/" />

      <style>{`@keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <CardAnimationStyles />
      <SiteNav variant="light" />

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-6 text-center" style={{ background: 'linear-gradient(180deg, #EBF8FF 0%, #FFFFFF 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>
              THE CAREER PLATFORM
            </span>
          </motion.div>

          <motion.h1 className="mt-6" style={{ fontFamily: F.display }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <span className="block text-[36px] sm:text-[52px] md:text-[72px] font-bold leading-[1.05] tracking-tight uppercase">
              ALL YOUR PREP.
            </span>
            <span className="block text-[48px] sm:text-[60px] md:text-[72px] font-bold leading-[1.05] tracking-tight uppercase" style={{ color: accent }}>
              ONE TRUSTED PLATFORM.
            </span>
          </motion.h1>

          <motion.p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto" style={{ color: '#475569' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Job discovery, interview prep, mock practice, and live AI assistance — all in one place.
          </motion.p>

          <motion.div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'}
              className="px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white rounded-full transition-all hover:opacity-90"
              style={{ background: accent }}>
              {isAuthenticated ? 'GO TO DASHBOARD' : 'GET STARTED FREE'}
            </Link>
            <Link to="/pricing"
              className="px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full transition-all hover:bg-gray-50"
              style={{ color: '#0F172A', border: '1.5px solid #CBD5E1' }}>
              VIEW PRICING &rsaquo;
            </Link>
          </motion.div>

          {visitorCount !== null && visitorCount > 0 && (
            <motion.p className="mt-8 text-sm" style={{ color: '#94A3B8' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Trusted by <strong style={{ color: '#0F172A' }}>{visitorCount.toLocaleString()}+</strong> engineers worldwide
            </motion.p>
          )}
        </div>
      </section>

      {/* ═══════════ 2. COMPANY LOGOS — Scrolling ═══════════ */}
      <section className="py-10 overflow-hidden" style={{ background: '#FFFFFF' }}>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#94A3B8' }}>Trusted by frost engineers at</p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10" style={{ background: 'linear-gradient(to right, #FFFFFF, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10" style={{ background: 'linear-gradient(to left, #FFFFFF, transparent)' }} />
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
      <section className="relative px-6 py-24 overflow-hidden" style={{ background: '#F8FAFC' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/grass-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18 }} />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="text-center">
                  <p className="text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: F.display, color: '#0F172A' }}>{s.value}</p>
                  <p className="text-xs font-bold mt-3 uppercase tracking-[0.15em]" style={{ color: accent, fontFamily: F.mono }}>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 4. APPA — THE PROCESS ═══════════ */}
      <section className="px-6 py-28" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>THE PROCESS</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
              YOUR PATH TO <span style={{ color: accent }}>THE OFFER.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {APPA.map((step, i) => (
              <Reveal key={step.key} delay={i * 0.06}>
                <Link to={step.href} className="block rounded-lg h-full transition-all hover:border-[#29B5E8] group overflow-hidden"
                  style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div className="w-full h-40 overflow-hidden relative" style={{ background: '#F1F5F9' }}>
                    <step.Anim />
                  </div>
                  <div className="p-8">
                    <div className="mb-5">{step.icon}</div>
                    <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: accent, fontFamily: F.mono }}>{step.label}</span>
                    <h3 className="mt-2 text-lg font-bold tracking-tight" style={{ fontFamily: F.display }}>{step.headline}</h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: '#64748B' }}>{step.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-5 text-xs font-bold uppercase tracking-wider group-hover:gap-2 transition-all" style={{ color: accent }}>
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
      <section className="px-6 py-28" style={{ background: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: text */}
            <div className="lg:w-[38%]">
              <Reveal>
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>CAMORA · AI COPILOT</span>
                <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
                  ONE TOOL.<br /><span style={{ color: accent }}>EVERY INTERVIEW.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed" style={{ color: '#475569' }}>
                  Live voice assistance. Coding with three approaches and follow-ups. Multi-cloud architecture on AWS, GCP, Azure. Complete design problems — requirements through API. Company-specific prep for the full loop: HR, Hiring Manager, Coding, Design, Behavioral. Mock-interview scoring across every dimension.
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <Link to="/lumora" className="px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white rounded-full" style={{ background: accent }}>
                    TRY LIVE AI
                  </Link>
                  <Link to="/pricing" className="text-sm font-bold uppercase tracking-wider" style={{ color: accent }}>
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

      {/* ═══════════ 6. FEATURES — 4 CARDS ═══════════ */}
      <section className="px-6 py-28" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>ONLY ON CAMORA</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
              FEATURES THAT <span style={{ color: accent }}>SET US APART.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="rounded-lg h-full overflow-hidden flex flex-col" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div className="w-full h-40 overflow-hidden relative" style={{ background: '#F1F5F9' }}>
                    <f.Anim />
                  </div>
                  <div className="p-8 flex-1">
                    <div className="mb-5">{f.icon}</div>
                    <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: accent, fontFamily: F.mono }}>{f.label}</span>
                    <h3 className="mt-2 text-base font-bold" style={{ fontFamily: F.display }}>{f.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: '#64748B' }}>{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Feature highlights bar */}
          <Reveal className="mt-12">
            <div className="flex items-center justify-center gap-8 flex-wrap px-8 py-4 rounded-lg" style={{ background: accent }}>
              {['50+ Languages', 'Architecture Diagrams', 'Company-Specific Prep', 'Stealth Desktop App', 'Voice Filtering'].map(f => (
                <span key={f} className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {f}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Skills covered — what you'll master */}
          <Reveal className="mt-8 text-center">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>
              SKILLS YOU'LL MASTER
            </span>
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap max-w-4xl mx-auto">
              {SKILLS.map((s) => (
                <span
                  key={s}
                  className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    fontFamily: F.mono,
                    background: '#FFFFFF',
                    color: '#0F172A',
                    border: `1px solid ${accent}44`,
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
      <section className="px-6 py-28" style={{ background: '#F8FAFC' }}>
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
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>SMART PREP</span>
                <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
                  PASTE A JOB URL.<br /><span style={{ color: accent }}>GET A PREP PLAN.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed" style={{ color: '#475569' }}>
                  AI analyzes the job description, identifies required skills, and generates a tailored preparation plan with coding topics, system design patterns, and behavioral questions.
                </p>
                <div className="mt-8">
                  <Link to="/jobs" className="px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white rounded-full" style={{ background: accent }}>
                    TRY JOB ANALYSIS
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 8. FINAL CTA BANNER ═══════════ */}
      <section className="px-6 py-20" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-10 md:px-16 py-12 rounded-2xl" style={{ background: '#0F172A' }}>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: F.display }}>
                WHERE CAREERS<br /><span style={{ color: accent }}>TAKE OFF.</span>
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                {['Free to start', 'No credit card required', 'Cancel anytime'].map(t => (
                  <span key={t} className="flex items-center gap-2 text-sm text-white/80">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to={isAuthenticated ? '/capra/prepare' : '/signup'}
                className="px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full"
                style={{ background: '#FFFFFF', color: '#0F172A' }}>
                GET STARTED FREE
              </Link>
              <Link to="/pricing"
                className="px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full"
                style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: '#FFFFFF' }}>
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
