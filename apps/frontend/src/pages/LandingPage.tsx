import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE — Snowflake-inspired clean design
   ══════════════════════════════════════════════════════════════ */

const F = {
  display: "'Clash Display', sans-serif",
  body: "'Satoshi', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const accent = '#29B5E8';

/* ── APPA Steps ───────────────────────────────────────── */
const APPA = [
  {
    key: 'apply', label: 'APPLY', href: '/jobs',
    headline: 'Discover roles matched to your skills',
    desc: 'Browse 1,000+ engineering roles with AI-powered matching. Auto-generate tailored resumes and cover letters.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></svg>,
  },
  {
    key: 'prepare', label: 'PREPARE', href: '/capra/prepare',
    headline: 'Study 800+ curated interview topics',
    desc: 'System design, DSA, behavioral, databases, and low-level design with AI-powered explanations and architecture diagrams.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  },
  {
    key: 'practice', label: 'PRACTICE', href: '/capra/practice',
    headline: 'Solve 1,850+ problems with AI feedback',
    desc: 'Real interview problems with multi-approach solutions. Timed mock interviews scored on communication and accuracy.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg>,
  },
  {
    key: 'attend', label: 'ATTEND', href: '/lumora',
    headline: 'Real-time AI during your live interview',
    desc: 'Voice transcription captures the question. AI generates instant answers — system design diagrams, coding solutions, and STAR coaching.',
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

/* ── Company logos (logo.dev) ───────────────────── */
const LOGO_TOKEN = 'pk_VzK1OM-OQSCUuysDpOCzKw';
const COMPANIES = [
  'google', 'amazon', 'meta', 'apple', 'netflix', 'microsoft',
  'uber', 'stripe', 'airbnb', 'nvidia', 'spotify', 'salesforce',
];

/* ── Top 4 Features ─────────────────────────────────── */
const FEATURES = [
  {
    label: 'LIVE AI',
    title: 'Real-time AI during interviews',
    desc: 'Voice transcription captures the question. AI generates instant answers in seconds — no other tool does this.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" /></svg>,
  },
  {
    label: 'JOB MATCHING',
    title: 'AI-powered job discovery',
    desc: '1,000+ roles matched to your skills. Auto-generate tailored resumes and cover letters for every application.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  },
  {
    label: 'PREP',
    title: '800+ topics with diagrams',
    desc: 'System design, DSA, behavioral, databases — each with AI explanations, architecture diagrams, and company-specific prep.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  },
  {
    label: 'MOCK INTERVIEWS',
    title: 'AI-scored practice sessions',
    desc: 'Timed mock interviews with instant feedback. Scored on communication, accuracy, and code quality.',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  },
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
            <span className="block text-[48px] sm:text-[60px] md:text-[72px] font-bold leading-[1.05] tracking-tight uppercase">
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

      {/* ═══════════ 2. COMPANY LOGOS ═══════════ */}
      <section className="px-6 py-16" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {COMPANIES.map((c) => (
              <img key={c} src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=60&format=png`}
                alt={c} className="h-8 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 3. STATS ═══════════ */}
      <section className="px-6 py-24" style={{ background: '#F8FAFC' }}>
        <div className="max-w-5xl mx-auto">
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
                <Link to={step.href} className="block p-8 rounded-lg h-full transition-all hover:border-[#29B5E8] group"
                  style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div className="mb-5">{step.icon}</div>
                  <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: accent, fontFamily: F.mono }}>{step.label}</span>
                  <h3 className="mt-2 text-lg font-bold tracking-tight" style={{ fontFamily: F.display }}>{step.headline}</h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: '#64748B' }}>{step.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-5 text-xs font-bold uppercase tracking-wider group-hover:gap-2 transition-all" style={{ color: accent }}>
                    Explore &rsaquo;
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 5. LIVE AI DEMO — Split Layout ═══════════ */}
      <section className="px-6 py-28" style={{ background: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: text */}
            <div className="lg:w-[45%]">
              <Reveal>
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>LIVE AI ASSISTANT</span>
                <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
                  AI THAT WORKS<br /><span style={{ color: accent }}>IN REAL TIME.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed" style={{ color: '#475569' }}>
                  Voice transcription captures the interviewer's question. AI generates instant answers — system design diagrams, multi-approach coding solutions, and STAR behavioral coaching — in seconds.
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

            {/* Right: demo card */}
            <div className="lg:w-[55%]">
              <Reveal delay={0.12}>
                <div className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                  <div className="px-6 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#EF4444', fontFamily: F.mono }}>Transcribing</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#0F172A' }}>
                      "Design a distributed rate limiter that can handle millions of requests per second across multiple data centers..."
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent, fontFamily: F.mono }}>AI Response</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Architecture', items: ['Token Bucket', 'Redis Cluster', 'Sliding Window'] },
                        { label: 'Components', items: ['API Gateway', 'Rate Limiter', 'Config Store'] },
                        { label: 'Trade-offs', items: ['Consistency', 'Memory', 'Latency'] },
                      ].map(col => (
                        <div key={col.label}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94A3B8', fontFamily: F.mono }}>{col.label}</p>
                          <div className="flex flex-col gap-1">
                            {col.items.map(item => (
                              <span key={item} className="text-xs px-2.5 py-1.5 rounded-md" style={{ color: '#475569', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>{item}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
                <div className="p-8 rounded-lg h-full" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div className="mb-5">{f.icon}</div>
                  <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: accent, fontFamily: F.mono }}>{f.label}</span>
                  <h3 className="mt-2 text-base font-bold" style={{ fontFamily: F.display }}>{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: '#64748B' }}>{f.desc}</p>
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
        </div>
      </section>

      {/* ═══════════ 7. JOB URL ANALYSIS ═══════════ */}
      <section className="px-6 py-28" style={{ background: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: demo */}
            <div className="lg:w-[55%]">
              <Reveal>
                <div className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                  <div className="px-6 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <svg width="14" height="14" fill="none" stroke="#94A3B8" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" /></svg>
                      <span className="text-sm truncate flex-1" style={{ color: '#94A3B8', fontFamily: F.mono }}>nvidia.wd5.myworkdayjobs.com/.../Senior-DevOps</span>
                      <span className="px-4 py-1.5 text-xs font-bold text-white rounded-md" style={{ background: accent }}>Analyze</span>
                    </div>
                  </div>
                  <div className="px-6 py-5">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Coding', items: ['Graph Algorithms', 'Scripting', 'Automation'] },
                        { label: 'System Design', items: ['CI/CD Pipeline', 'Containers', 'Monitoring'] },
                        { label: 'Behavioral', items: ['Leadership', 'Incident Mgmt', 'Cross-Team'] },
                      ].map(col => (
                        <div key={col.label}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94A3B8', fontFamily: F.mono }}>{col.label}</p>
                          <div className="flex flex-col gap-1">
                            {col.items.map(item => (
                              <span key={item} className="text-xs px-2.5 py-1.5 rounded-md" style={{ color: '#475569', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>{item}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
