import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE — Zoom-inspired design
   Custom fonts: Clash Display (headings) + Satoshi (body)
   Signature gradient: emerald → blue (-81deg)
   Border radius: 10px (consistent)
   ══════════════════════════════════════════════════════════════ */

/* ── Camora Design Tokens ─────────────────────────────── */
const T = {
  font: {
    display: "'Clash Display', sans-serif",
    body: "'Satoshi', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  color: {
    blue: '#0B5CFF',
    emerald: '#34d399',
    pink: '#f472b6',
    amber: '#fbbf24',
    cyan: '#06b6d4',
    indigo: '#818cf8',
  },
  gradient: 'linear-gradient(-81deg, #34d399 0%, #0B5CFF 100%)',
  radius: '10px',
};

/* ── APPA Steps ───────────────────────────────────────── */
const APPA_STEPS = [
  {
    key: 'apply', label: 'Apply', color: T.color.emerald, href: '/jobs',
    headline: 'Discover roles matched to your skills',
    desc: 'Browse 1,000+ engineering roles. AI-powered matching by skills, experience, and salary goals. Auto-generate tailored resumes and cover letters.',
    features: ['AI Job Matching', 'Auto Resume & Cover Letter', 'Salary Insights', '1,000+ Companies'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /><path d="M16 2v4M8 2v4" /></svg>,
  },
  {
    key: 'prepare', label: 'Prepare', color: T.color.indigo, href: '/capra/prepare',
    headline: 'Study 389 curated interview topics',
    desc: 'System design, DSA, behavioral, databases, microservices, and low-level design. AI-powered explanations with architecture diagrams.',
    features: ['389 Study Topics', 'Architecture Diagrams', 'AI Explanations', 'Role-Based Paths'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  },
  {
    key: 'practice', label: 'Practice', color: T.color.cyan, href: '/capra/practice',
    headline: 'Solve problems with instant AI feedback',
    desc: 'Real interview problems with multi-approach solutions. Timed mock interviews. Run code in 50+ languages with auto-fix and debugging.',
    features: ['Mock Interviews', '50+ Languages', 'Multi-Approach Solutions', 'Auto-Fix & Debug'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg>,
  },
  {
    key: 'attend', label: 'Attend', color: T.color.amber, href: '/lumora',
    headline: 'Real-time AI during your live interview',
    desc: 'Voice transcription, instant AI answers, architecture diagrams, coding solutions, and STAR behavioral coaching — all in real-time.',
    features: ['Voice Transcription', 'Live AI Answers', 'Architecture Diagrams', 'Stealth Mode'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /><path d="M8 22h8" /></svg>,
  },
];

/* ── Platform Features ────────────────────────────────── */
const PLATFORM_FEATURES = [
  {
    title: 'Works with every interview platform',
    items: [
      { name: 'Zoom, Google Meet, MS Teams', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M15.6 11.6L22 7v10l-6.4-4.5v-1z" /><rect x="2" y="7" width="14" height="10" rx="2" /></svg> },
      { name: 'LeetCode, HackerRank, CoderPad', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg> },
      { name: 'CodeSignal, Codility, Karat', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg> },
    ],
  },
  {
    title: 'Privacy-first design',
    items: [
      { name: 'Emergency Blank Screen (Cmd+B)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="2" y1="3" x2="22" y2="17" /></svg> },
      { name: 'Speaker Voice Filtering', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="1" y1="1" x2="23" y2="23" /></svg> },
      { name: 'Desktop App with Stealth Mode', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
    ],
  },
];

/* ── Stats ─────────────────────────────────────────────── */
const STATS = [
  { value: '389', label: 'Study Topics', suffix: '' },
  { value: '50', label: 'Languages', suffix: '+' },
  { value: '1,000', label: 'Companies', suffix: '+' },
  { value: '6', label: 'Topic Categories', suffix: '' },
];

/* ── Topic Data (real counts) ─────────────────────────── */
const TOPICS = [
  { name: 'System Design', count: 235, color: T.color.cyan },
  { name: 'Behavioral', count: 53, color: T.color.pink },
  { name: 'Low Level Design', count: 46, color: T.color.indigo },
  { name: 'DSA & Algorithms', count: 23, color: T.color.emerald },
  { name: 'Databases & SQL', count: 20, color: '#f97316' },
  { name: 'Microservices', count: 12, color: T.color.blue },
];

/* ── Visitor Count Hook ───────────────────────────────── */
function useVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
    fetch(`${API}/api/visitors/unique-count`)
      .then(r => r.json())
      .then(d => setCount(d.total))
      .catch(() => {});
  }, []);
  return count;
}

/* ── Section Reveal ───────────────────────────────────── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Tabbed Product Showcase (Zoom-style) ─────────────── */
function ProductTabs() {
  const [active, setActive] = useState(0);
  const step = APPA_STEPS[active];

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-12">
      {/* Tab list — vertical on desktop, horizontal scroll on mobile */}
      <div className="flex lg:flex-col gap-1 lg:gap-2 lg:min-w-[240px] overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
        {APPA_STEPS.map((s, i) => {
          const isActive = active === i;
          return (
            <button
              key={s.key}
              onClick={() => setActive(i)}
              className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-4 text-left transition-all whitespace-nowrap flex-shrink-0"
              style={{
                borderRadius: T.radius,
                background: isActive ? `${s.color}12` : 'transparent',
                borderLeft: isActive ? `3px solid ${s.color}` : '3px solid transparent',
                fontFamily: T.font.display,
              }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{
                  borderRadius: T.radius,
                  background: isActive ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                  color: isActive ? s.color : 'var(--text-muted)',
                }}
              >
                {s.icon}
              </div>
              <span
                className="text-sm lg:text-base font-semibold"
                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="p-8 lg:p-10"
              style={{
                borderRadius: '16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1"
                  style={{
                    borderRadius: '6px',
                    background: `${step.color}15`,
                    color: step.color,
                    fontFamily: T.font.mono,
                  }}
                >
                  {step.label}
                </span>
              </div>

              <h3
                className="text-2xl lg:text-3xl font-bold tracking-tight mb-4"
                style={{ fontFamily: T.font.display, color: 'var(--text-primary)' }}
              >
                {step.headline}
              </h3>

              <p
                className="text-base lg:text-lg leading-relaxed mb-8 max-w-xl"
                style={{ fontFamily: T.font.body, color: 'var(--text-secondary)' }}
              >
                {step.desc}
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-8">
                {step.features.map(f => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
                    style={{
                      borderRadius: T.radius,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontFamily: T.font.body,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: step.color }} />
                    {f}
                  </span>
                ))}
              </div>

              <Link
                to={step.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{
                  borderRadius: T.radius,
                  background: T.gradient,
                  fontFamily: T.font.body,
                }}
              >
                Explore {step.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Donut Chart ──────────────────────────────────────── */
function TopicDonut() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const TOTAL = 389;
  const RADIUS = 68;
  const CIRC = 2 * Math.PI * RADIUS;

  const segments = (() => {
    let acc = 0;
    return TOPICS.map(t => {
      const frac = t.count / TOTAL;
      const dash = frac * CIRC;
      const gap = CIRC - dash;
      const offset = -(acc * CIRC) + CIRC * 0.25;
      acc += frac;
      return { ...t, dash, gap, offset };
    });
  })();

  return (
    <div ref={ref} className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-14">
      <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
        <svg viewBox="0 0 200 200" width="200" height="200">
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="16" />
          {segments.map((s, i) => (
            <circle key={s.name} cx="100" cy="100" r={RADIUS} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${inView ? s.dash : 0} ${inView ? s.gap : CIRC}`}
              strokeDashoffset={s.offset} strokeLinecap="butt"
              style={{ transition: `stroke-dasharray 1s ease ${i * 80 + 200}ms` }} />
          ))}
          <text x="100" y="95" textAnchor="middle" fill="var(--text-primary)" fontSize="26" fontWeight="700" fontFamily="'Clash Display', sans-serif">389</text>
          <text x="100" y="115" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500" fontFamily="'Satoshi', sans-serif">Topics</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        {TOPICS.map((t, i) => (
          <div key={t.name} className="flex items-center gap-2.5"
            style={{
              opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateX(10px)',
              transition: `opacity 0.4s ease ${i * 60 + 400}ms, transform 0.4s ease ${i * 60 + 400}ms`,
            }}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)', fontFamily: T.font.body }}>{t.name}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)', fontFamily: T.font.mono }}>{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const visitorCount = useVisitorCount();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    document.title = 'Camora — Apply, Prepare, Practice & Attend';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: T.font.body, color: 'var(--text-primary)' }}>
      <SEO path="/" />

      {/* ── Scoped Styles ── */}
      <style>{`
        .cm-gradient-text {
          background: ${T.gradient};
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .cm-gradient-btn {
          background: ${T.gradient};
          transition: filter 0.2s ease;
        }
        .cm-gradient-btn:hover { filter: brightness(1.12); }
        .cm-outline-btn {
          border: 1px solid rgba(255,255,255,0.15);
          color: var(--text-primary);
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .cm-outline-btn:hover {
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.04);
        }
      `}</style>

      {/* ── NAV ── */}
      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 px-6" style={{ zIndex: 1 }}>
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[50vh]"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(11,92,255,0.06) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase"
              style={{
                borderRadius: '999px',
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.18)',
                color: T.color.emerald,
                fontFamily: T.font.mono,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Apply . Prepare . Practice . Attend
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="mt-8 font-bold tracking-[-0.03em]"
            style={{ fontFamily: T.font.display }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08]">
              From application to
            </span>
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08] cm-gradient-text">
              offer letter.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
            style={{ color: 'var(--text-secondary)', fontFamily: T.font.body }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Whether you're prepping for a FAANG interview or attending one live, Camora helps you
            prepare, practice, and perform — with AI doing the heavy lifting.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link
              to={isAuthenticated ? '/capra/prepare' : '/signup'}
              className="cm-gradient-btn px-7 py-3.5 text-[15px] font-semibold text-white"
              style={{ borderRadius: T.radius, fontFamily: T.font.body }}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </Link>
            <Link
              to="/pricing"
              className="cm-outline-btn px-7 py-3.5 text-[15px] font-semibold"
              style={{ borderRadius: T.radius, fontFamily: T.font.body }}
            >
              View Plans
            </Link>
          </motion.div>

          {/* Social proof */}
          {visitorCount !== null && visitorCount > 0 && (
            <motion.div
              className="mt-10 flex items-center justify-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex -space-x-1.5">
                {[T.color.emerald, T.color.indigo, T.color.cyan, T.color.amber].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full" style={{ background: c, border: '2px solid var(--bg-app)' }} />
                ))}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: T.font.body }}>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{visitorCount.toLocaleString()}+</span> engineers visited
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="px-6 py-10" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 py-8"
            style={{
              borderRadius: '16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold" style={{ fontFamily: T.font.display, color: 'var(--text-primary)' }}>
                    {s.value}<span className="cm-gradient-text">{s.suffix}</span>
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: T.font.body }}>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPA CARDS — Quick overview ── */}
      <section className="px-6 py-14 md:py-20" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: T.font.display }}>
              One platform, four steps to your offer.
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {APPA_STEPS.map((step, i) => (
              <Reveal key={step.key} delay={i * 0.06}>
                <Link
                  to={step.href}
                  className="group relative flex flex-col p-6 h-full transition-all hover:-translate-y-0.5"
                  style={{
                    borderRadius: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-4 right-4 h-[2px]" style={{ background: step.color, borderRadius: '0 0 2px 2px' }} />

                  <div
                    className="w-11 h-11 flex items-center justify-center mb-4"
                    style={{ borderRadius: T.radius, background: `${step.color}12`, color: step.color }}
                  >
                    {step.icon}
                  </div>

                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: T.font.display, color: 'var(--text-primary)' }}>
                    {step.label}
                  </h3>

                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {step.desc.split('.')[0]}.
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: step.color }}>
                    <span>Learn more</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABBED PRODUCT SHOWCASE (Zoom-style) ── */}
      <section className="px-6 py-14 md:py-20" id="process" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <span
              className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 mb-5"
              style={{
                borderRadius: '999px',
                background: `${T.color.blue}12`,
                border: `1px solid ${T.color.blue}30`,
                color: T.color.blue,
                fontFamily: T.font.mono,
              }}
            >
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: T.font.display }}>
              See what Camora can do.
            </h2>
          </Reveal>

          <ProductTabs />
        </div>
      </section>

      {/* ── JOB URL ANALYSIS — Feature Spotlight ── */}
      <section className="px-6 py-14 md:py-20" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase px-4 py-1.5"
              style={{
                borderRadius: '999px',
                background: `${T.color.emerald}08`,
                border: `1px solid ${T.color.emerald}25`,
                color: T.color.emerald,
                fontFamily: T.font.mono,
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              AI-Powered
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight mt-5" style={{ fontFamily: T.font.display }}>
              Paste a job URL. Get a prep plan.
            </h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              AI analyzes the role and creates a personalized study plan with coding, system design, and behavioral focus areas.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div style={{ borderRadius: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {/* URL bar */}
              <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderRadius: T.radius, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" /></svg>
                  <span className="text-sm truncate" style={{ color: 'var(--text-muted)', fontFamily: T.font.mono }}>https://nvidia.wd5.myworkdayjobs.com/...Senior-DevOps-Engineer</span>
                  <span className="ml-auto px-4 py-1.5 text-xs font-bold text-white flex-shrink-0 cm-gradient-btn" style={{ borderRadius: '8px' }}>Analyze</span>
                </div>
              </div>
              {/* Results */}
              <div className="px-6 py-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase" style={{ fontFamily: T.font.mono }}>Analysis Complete</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Coding Focus', items: ['Graph Algorithms', 'Scripting', 'Automation'], color: T.color.emerald },
                    { label: 'System Design', items: ['CI/CD Pipeline', 'Container Orchestration', 'Monitoring'], color: T.color.blue },
                    { label: 'Behavioral', items: ['Leadership', 'Incident Mgmt', 'Cross-Team'], color: T.color.amber },
                  ].map(col => (
                    <div key={col.label} className="p-4" style={{ borderRadius: T.radius, background: `${col.color}06` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: col.color, fontFamily: T.font.mono }}>{col.label}</p>
                      <div className="flex flex-col gap-1.5">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium px-2.5 py-1.5" style={{ borderRadius: '8px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2} className="text-center mt-10">
            <Link to="/jobs" className="cm-gradient-btn inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-semibold text-white" style={{ borderRadius: T.radius }}>
              Try It Now — Paste a Job URL
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn &amp; more
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── PREPARATION AT SCALE — Donut ── */}
      <section className="px-6 py-14 md:py-20" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-12">
            <span
              className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 mb-5"
              style={{
                borderRadius: '999px',
                background: `${T.color.indigo}12`,
                border: `1px solid ${T.color.indigo}30`,
                color: T.color.indigo,
                fontFamily: T.font.mono,
              }}
            >
              Preparation at Scale
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: T.font.display }}>
              Everything you need to prepare.
            </h2>
          </Reveal>
          <TopicDonut />
        </div>
      </section>

      {/* ── PLATFORM COMPATIBILITY ── */}
      <section className="px-6 py-14 md:py-20" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {PLATFORM_FEATURES.map((group, gi) => (
              <Reveal key={group.title} delay={gi * 0.08}>
                <div
                  className="p-7"
                  style={{
                    borderRadius: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <h3 className="text-lg font-bold mb-5" style={{ fontFamily: T.font.display, color: 'var(--text-primary)' }}>
                    {group.title}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {group.items.map(item => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                          style={{ borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                        >
                          {item.icon}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-20 md:py-28" style={{ zIndex: 1 }}>
        <Reveal className="max-w-3xl mx-auto">
          <div
            className="relative px-8 py-16 md:px-16 md:py-20 text-center overflow-hidden"
            style={{
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Subtle gradient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-1" style={{ background: T.gradient, borderRadius: '0 0 4px 4px' }} />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight" style={{ fontFamily: T.font.display }}>
                Your next interview{' '}
                <span className="cm-gradient-text">starts here.</span>
              </h2>
              <p className="mt-5 text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                Apply, Prepare, Practice, Attend.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={isAuthenticated ? '/capra/prepare' : '/signup'}
                  className="cm-gradient-btn px-8 py-4 text-base font-semibold text-white"
                  style={{ borderRadius: T.radius }}
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Start Free — No Credit Card'}
                </Link>
                <Link
                  to="/pricing"
                  className="cm-outline-btn px-8 py-4 text-base font-semibold"
                  style={{ borderRadius: T.radius }}
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
