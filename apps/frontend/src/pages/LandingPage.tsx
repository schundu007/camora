import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE — Railway-inspired dark theme
   ══════════════════════════════════════════════════════════════ */

const F = {
  display: "'Clash Display', sans-serif",
  body: "'Satoshi', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const L = {
  bg: '#09090F', surface: '#111118', elevated: '#19192A',
  border: 'rgba(255,255,255,0.07)', text: '#FFFFFF', secondary: 'rgba(255,255,255,0.65)',
  muted: 'rgba(255,255,255,0.35)', dimmed: 'rgba(255,255,255,0.15)',
  gradient: 'linear-gradient(135deg, #76B900 0%, #5E9400 100%)',
  primary: '#76B900', emerald: '#76B900', radius: '12px',
  glow: '0 0 60px rgba(118,185,0,0.06)',
  glowStrong: '0 0 80px rgba(118,185,0,0.12)',
};

/* ── APPA Steps ───────────────────────────────────────── */
const APPA = [
  {
    key: 'apply', label: 'Apply', href: '/jobs',
    headline: 'Discover roles matched to your skills',
    desc: 'Browse 1,000+ engineering roles. AI-powered matching by skills, experience, and salary goals. Auto-generate tailored resumes and cover letters for every application.',
    features: ['AI Job Matching', 'Auto Resume & Cover Letter', 'Salary Insights', '1,000+ Companies', 'Auto Apply'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /><path d="M16 2v4M8 2v4" /></svg>,
  },
  {
    key: 'prepare', label: 'Prepare', href: '/capra/prepare',
    headline: 'Study 800+ curated interview topics',
    desc: 'System design, DSA, behavioral, databases, microservices, and low-level design with AI-powered explanations, architecture diagrams, and company-specific prep for 60+ companies.',
    features: ['800+ Topics', '60+ Company Prep', 'Architecture Diagrams', 'AI Explanations', 'Role-Based Paths'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  },
  {
    key: 'practice', label: 'Practice', href: '/capra/practice',
    headline: 'Solve 1,850+ problems with instant AI feedback',
    desc: 'Real interview problems with multi-approach solutions. Timed mock interviews with AI feedback. Run code in 50+ languages with auto-fix, debugging, and complexity analysis.',
    features: ['1,850+ Problems', '50+ Languages', 'Mock Interviews', 'Auto-Fix & Debug', 'Complexity Analysis'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg>,
  },
  {
    key: 'attend', label: 'Attend', href: '/lumora',
    headline: 'Real-time AI during your live interview',
    desc: 'Voice transcription captures the question. AI generates instant answers — system design diagrams, multi-approach coding solutions, and STAR behavioral coaching — in seconds.',
    features: ['Voice Transcription', 'Live AI Answers', 'Architecture Diagrams', 'STAR Coaching', 'Stealth Mode'],
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /><path d="M8 22h8" /></svg>,
  },
];

/* ── Stats ─────────────────────────────────────────────── */
const STATS = [
  { value: '800+', label: 'Study Topics' },
  { value: '1,850+', label: 'Problems' },
  { value: '1,000+', label: 'Companies' },
  { value: '50+', label: 'Languages' },
];

/* ── Topic Data ───────────────────────────────────────── */
const TOPICS = [
  { name: 'System Design', count: 420, problems: 318, color: '#76B900' },
  { name: 'Low-Level Design', count: 112, problems: 268, color: '#4ADE80' },
  { name: 'DSA & Algorithms', count: 65, problems: 854, color: '#FFFFFF' },
  { name: 'Behavioral', count: 64, problems: 230, color: 'rgba(255,255,255,0.6)' },
  { name: 'Database & SQL', count: 31, problems: 197, color: 'rgba(255,255,255,0.35)' },
  { name: 'Microservices', count: 27, problems: 0, color: 'rgba(255,255,255,0.15)' },
];

/* ── Company logos (logo.dev) ───────────────────── */
const LOGO_TOKEN = 'pk_VzK1OM-OQSCUuysDpOCzKw';
const COMPANIES = [
  'google', 'amazon', 'meta', 'apple', 'netflix', 'microsoft',
  'uber', 'stripe', 'airbnb', 'nvidia', 'spotify', 'salesforce',
];

/* ── Unique Features (only on Camora) ─────────────────── */
const UNIQUE_FEATURES = [
  {
    title: 'Live AI During Interview',
    desc: 'Real-time voice transcription + instant AI answers while you interview. No other tool does this.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
    tag: 'Only on Camora',
  },
  {
    title: 'Job Discovery + Auto Apply',
    desc: '1,000+ roles with AI-matched recommendations. Auto-generate tailored resumes and cover letters.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></svg>,
    tag: 'Only on Camora',
  },
  {
    title: 'Company-Specific Prep',
    desc: 'Interview patterns, common questions, salary data, and tech stacks for Google, Amazon, Meta, and 60+ more.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>,
    tag: '60+ Companies',
  },
  {
    title: 'Architecture Diagrams',
    desc: 'Auto-generated system design diagrams for every topic. Visual architecture with component relationships.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>,
    tag: 'AI-Generated',
  },
  {
    title: 'STAR Behavioral Coaching',
    desc: 'AI structures your behavioral answers using Situation, Task, Action, Result format — coached in real-time.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    tag: 'Real-time',
  },
  {
    title: 'Desktop App + Stealth Mode',
    desc: 'Native app with system tray, global hotkey (Cmd+Shift+C), and emergency blank screen (Cmd+B).',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
    tag: 'macOS + Windows',
  },
  {
    title: 'Speaker Voice Filtering',
    desc: 'Enroll your voice, then Camora filters out the interviewer — only your voice triggers transcription.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
    tag: 'Privacy-First',
  },
  {
    title: 'Mock Interview Simulator',
    desc: 'Timed mock interviews with AI interviewer. Get scored on communication, accuracy, and code quality.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    tag: 'AI-Scored',
  },
  {
    title: 'Multi-Approach Solutions',
    desc: 'Every problem has brute force, optimized, and optimal solutions with time/space complexity analysis.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg>,
    tag: '3 Approaches',
  },
];

/* ── Platform Integrations ────────────────────────────── */
const INTEGRATIONS = [
  'Zoom', 'Google Meet', 'MS Teams', 'LeetCode', 'HackerRank',
  'CoderPad', 'CodeSignal', 'Codility', 'Karat',
];

/* ── Pricing Preview ──────────────────────────────────── */
const PLANS = [
  { name: 'Free', price: '$0', period: '', features: ['3 Live Sessions', '300+ Topics', 'Basic Practice'], cta: 'Start Free' },
  { name: 'Pro', price: '$49', period: '/mo', features: ['Unlimited Sessions', 'Job Discovery', 'Desktop App', 'All Features'], cta: 'Go Pro', popular: true },
  { name: 'Annual', price: '$19', period: '/mo', features: ['Everything in Pro', '61% Savings', 'Priority Support', 'Billed $228/yr'], cta: 'Best Value' },
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
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}>{children}</motion.div>
  );
}

/* ── Product Tabs ─────────────────────────────────────── */
function ProductTabs() {
  const [active, setActive] = useState(0);
  const step = APPA[active];

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % APPA.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-10">
      <div className="flex lg:flex-col gap-1 lg:gap-1 lg:min-w-[220px] overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
        {APPA.map((s, i) => {
          const isActive = active === i;
          return (
            <button key={s.key} onClick={() => setActive(i)}
              className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-4 text-left transition-all whitespace-nowrap flex-shrink-0 relative"
              style={{ borderRadius: L.radius, background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent', border: isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent', fontFamily: F.display }}>
              {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: L.gradient }} />}
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: L.radius, background: isActive ? 'rgba(118,185,0,0.1)' : 'rgba(255,255,255,0.04)', color: isActive ? L.primary : L.muted }}>
                {s.icon}
              </div>
              <span className="text-sm lg:text-base font-semibold" style={{ color: isActive ? L.text : L.muted }}>{s.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={step.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
            <div className="p-8 lg:p-10 cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
              <h3 className="text-2xl lg:text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: F.display, color: L.text }}>{step.headline}</h3>
              <p className="text-base lg:text-lg leading-relaxed mb-8 max-w-xl" style={{ fontFamily: F.body, color: L.secondary }}>{step.desc}</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {step.features.map(f => (
                  <span key={f} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
                    style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: L.secondary, fontFamily: F.body }}>{f}</span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Link to={step.href} className="cm-gradient-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white" style={{ borderRadius: L.radius }}>
                  Explore {step.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
                {/* Progress bar for auto-rotate */}
                <div className="hidden lg:block flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: L.elevated }}>
                  <motion.div className="h-full rounded-full" style={{ background: L.gradient }}
                    initial={{ width: '0%' }} animate={{ width: '100%' }}
                    transition={{ duration: 6, ease: 'linear' }} key={`prog-${active}`} />
                </div>
              </div>
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
  const TOTAL = 808;
  const R = 68, CIRC = 2 * Math.PI * R;
  const segs = (() => {
    let a = 0;
    return TOPICS.map(t => { const f = t.count / TOTAL, d = f * CIRC; const o = -(a * CIRC) + CIRC * 0.25; a += f; return { ...t, d, g: CIRC - d, o }; });
  })();

  return (
    <div ref={ref} className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-14">
      <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
        <svg viewBox="0 0 200 200" width="200" height="200">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
          {segs.map((s, i) => (
            <circle key={s.name} cx="100" cy="100" r={R} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${inView ? s.d : 0} ${inView ? s.g : CIRC}`} strokeDashoffset={s.o}
              style={{ transition: `stroke-dasharray 1s ease ${i * 80 + 200}ms` }} />
          ))}
          <text x="100" y="88" textAnchor="middle" fill={L.text} fontSize="26" fontWeight="700" fontFamily={F.display}>800+</text>
          <text x="100" y="106" textAnchor="middle" fill={L.muted} fontSize="10" fontWeight="500" fontFamily={F.body}>Topics</text>
          <text x="100" y="122" textAnchor="middle" fill={L.primary} fontSize="14" fontWeight="700" fontFamily={F.display}>1,850+</text>
          <text x="100" y="135" textAnchor="middle" fill={L.muted} fontSize="9" fontWeight="500" fontFamily={F.body}>Problems</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        {TOPICS.map((t, i) => (
          <div key={t.name} className="flex items-center gap-2.5"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateX(10px)', transition: `opacity 0.4s ease ${i * 60 + 400}ms, transform 0.4s ease ${i * 60 + 400}ms` }}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: L.secondary }}>{t.name}</span>
            <span className="text-sm font-semibold" style={{ color: L.muted, fontFamily: F.mono }}>{t.count}</span>
            {t.problems > 0 && <span className="text-xs" style={{ color: L.dimmed, fontFamily: F.mono }}>({t.problems})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const visitorCount = useVisitorCount();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = 'Camora — Apply, Prepare, Practice & Attend'; return () => { document.title = 'Camora'; }; }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: F.body, color: L.text, background: L.bg }}>
      <SEO path="/" />
      <style>{`
        .cm-gradient-text { background: ${L.gradient}; -webkit-background-clip: text; background-clip: text; color: transparent; }
        .cm-gradient-btn { background: ${L.gradient}; transition: filter 0.2s ease, box-shadow 0.2s ease; }
        .cm-gradient-btn:hover { filter: brightness(1.15); box-shadow: 0 0 30px rgba(118,185,0,0.2); }
        .cm-outline-btn { border: 1px solid rgba(255,255,255,0.12); color: ${L.text}; transition: border-color 0.2s, background 0.2s; backdrop-filter: blur(8px); }
        .cm-outline-btn:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); }
        .cm-glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(12px); }
        .cm-glass:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
        @keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      <SiteNav variant="dark" />

      {/* ── 1. HERO ── */}
      <section className="relative pt-28 pb-14 md:pt-36 md:pb-20 px-6 overflow-hidden">
        {/* Radial glow behind hero */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(118,185,0,0.06) 0%, transparent 70%)' }} />
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase"
              style={{ borderRadius: '999px', background: L.surface, border: `1px solid ${L.border}`, color: L.secondary, fontFamily: F.mono }}>
              <span className="w-2 h-2 rounded-full" style={{ background: L.emerald }} />
              Apply . Prepare . Practice . Attend
            </span>
          </motion.div>

          <motion.h1 className="mt-8 font-bold tracking-[-0.03em]" style={{ fontFamily: F.display }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08]">From application to</span>
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08] cm-gradient-text">offer letter.</span>
          </motion.h1>

          <motion.p className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: L.secondary }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            The only platform that combines job discovery, interview prep, mock practice, and live AI assistance — all in one place.
          </motion.p>

          <motion.div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="cm-gradient-btn px-7 py-3.5 text-[15px] font-semibold text-white" style={{ borderRadius: L.radius }}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </Link>
            <Link to="/download" className="cm-outline-btn px-7 py-3.5 text-[15px] font-semibold" style={{ borderRadius: L.radius }}>
              Download Desktop App
            </Link>
          </motion.div>

          {visitorCount !== null && visitorCount > 0 && (
            <motion.div className="mt-10 flex items-center justify-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}>
              <div className="flex -space-x-1.5">
                {[L.primary, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full" style={{ background: c, border: `2px solid ${L.bg}` }} />
                ))}
              </div>
              <span className="text-sm" style={{ color: L.secondary }}>
                <span className="font-bold" style={{ color: L.text }}>{visitorCount.toLocaleString()}+</span> engineers visited
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── 2. COMPANY LOGOS — "Prepare for interviews at" ── */}
      <section className="px-6 py-8 overflow-hidden">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: L.muted }}>Prepare for interviews at</p>
          <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)' }}>
            <div className="flex items-center gap-12" style={{ animation: 'scroll-logos 30s linear infinite', width: 'max-content' }}>
              {[...COMPANIES, ...COMPANIES].map((c, i) => (
                <img key={`${c}-${i}`} src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=80&format=png`}
                  alt={c} className="h-7 object-contain" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. STATS BAR ── */}
      <section className="px-6 py-10">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 py-8 cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold" style={{ fontFamily: F.display }}>{s.value}</p>
                  <p className="text-sm mt-1" style={{ color: L.muted }}>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. APPA CARDS ── */}
      <section className="px-6 py-14 md:py-20">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
              One platform, four steps to your offer.
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {APPA.map((step, i) => (
              <Reveal key={step.key} delay={i * 0.06}>
                <Link to={step.href} className="group relative flex flex-col p-6 h-full transition-all hover:-translate-y-0.5 cm-glass"
                  style={{ borderRadius: '16px' }}>
                  <div className="w-11 h-11 flex items-center justify-center mb-4" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.04)', color: L.secondary }}>{step.icon}</div>
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: F.display }}>{step.label}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: L.secondary }}>{step.desc.split('.')[0]}.</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: L.primary }}>
                    <span>Learn more</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. TABBED PRODUCT SHOWCASE ── */}
      <section className="px-6 py-14 md:py-20" id="process" style={{ background: L.surface, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 mb-5"
              style={{ borderRadius: '999px', background: `${L.primary}0A`, border: `1px solid ${L.primary}20`, color: L.primary, fontFamily: F.mono }}>How it works</span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>See what Camora can do.</h2>
          </Reveal>
          <ProductTabs />
        </div>
      </section>

      {/* ── 6. LIVE AI DEMO — Simulated Q&A ── */}
      <section className="px-6 py-14 md:py-20">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase px-4 py-1.5"
              style={{ borderRadius: '999px', background: L.surface, border: `1px solid ${L.border}`, color: L.secondary, fontFamily: F.mono }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
              Live Interview AI
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight mt-5" style={{ fontFamily: F.display }}>
              Your interviewer speaks. AI answers.
            </h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: L.secondary }}>
              Camora listens to the interview question via voice transcription and generates a structured answer in seconds.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
              {/* Simulated transcript */}
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#ef4444', fontFamily: F.mono }}>Transcribing</span>
                </div>
                <p className="text-base leading-relaxed" style={{ color: L.text, fontFamily: F.body }}>
                  "Design a distributed rate limiter that can handle millions of requests per second across multiple data centers..."
                </p>
              </div>
              {/* AI response preview */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full" style={{ background: L.emerald }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: L.emerald, fontFamily: F.mono }}>AI Response</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Architecture', items: ['Token Bucket Algorithm', 'Redis Cluster', 'Sliding Window Counter'] },
                    { label: 'Components', items: ['API Gateway', 'Rate Limiter Service', 'Config Store'] },
                    { label: 'Trade-offs', items: ['Consistency vs Availability', 'Memory vs Accuracy', 'Latency vs Precision'] },
                  ].map(col => (
                    <div key={col.label} className="p-4" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: L.muted, fontFamily: F.mono }}>{col.label}</p>
                      <div className="flex flex-col gap-1.5">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium px-2.5 py-1.5" style={{ borderRadius: '8px', color: L.secondary, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 7. JOB URL ANALYSIS ── */}
      <section className="px-6 py-14 md:py-20" style={{ background: L.surface, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Paste a job URL. Get a prep plan.
            </h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: L.secondary }}>
              AI analyzes the role and creates a personalized study plan tailored to that exact position.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <svg width="16" height="16" fill="none" stroke={L.muted} viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" /></svg>
                  <span className="text-sm truncate" style={{ color: L.muted, fontFamily: F.mono }}>https://nvidia.wd5.myworkdayjobs.com/...Senior-DevOps-Engineer</span>
                  <span className="ml-auto px-4 py-1.5 text-xs font-bold text-white flex-shrink-0 cm-gradient-btn" style={{ borderRadius: '8px' }}>Analyze</span>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full" style={{ background: L.primary }} />
                  <span className="text-[11px] font-bold tracking-wider uppercase" style={{ fontFamily: F.mono, color: L.primary }}>Analysis Complete</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Coding Focus', items: ['Graph Algorithms', 'Scripting', 'Automation'] },
                    { label: 'System Design', items: ['CI/CD Pipeline', 'Container Orchestration', 'Monitoring'] },
                    { label: 'Behavioral', items: ['Leadership', 'Incident Mgmt', 'Cross-Team'] },
                  ].map(col => (
                    <div key={col.label} className="p-4" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: L.muted, fontFamily: F.mono }}>{col.label}</p>
                      <div className="flex flex-col gap-1.5">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium px-2.5 py-1.5" style={{ borderRadius: '8px', color: L.secondary, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2} className="text-center mt-10">
            <Link to="/jobs" className="cm-gradient-btn inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-semibold text-white" style={{ borderRadius: L.radius }}>
              Try It Now — Paste a Job URL
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <p className="text-xs mt-4" style={{ color: L.muted }}>Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn &amp; more</p>
          </Reveal>
        </div>
      </section>

      {/* ── 8. PREPARATION AT SCALE — Donut ── */}
      <section className="px-6 py-14 md:py-20">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>Everything you need to prepare.</h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: L.secondary }}>800+ topics and 1,850+ problems across 7 categories.</p>
          </Reveal>
          <TopicDonut />
        </div>
      </section>

      {/* ── 9. UNIQUE FEATURES GRID ── */}
      <section className="px-6 py-14 md:py-20" style={{ background: L.surface, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 mb-5"
              style={{ borderRadius: '999px', background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.15)', color: L.emerald, fontFamily: F.mono }}>Only on Camora</span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>What no other tool can do.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UNIQUE_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <div className="p-6 h-full cm-glass" style={{ borderRadius: '16px' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.04)', color: L.secondary }}>{f.icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1" style={{ borderRadius: '6px', background: 'rgba(118,185,0,0.06)', color: L.primary, fontFamily: F.mono }}>{f.tag}</span>
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ fontFamily: F.display }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: L.secondary }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. INTEGRATIONS BAR ── */}
      <section className="px-6 py-14 md:py-16">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto text-center">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: L.muted }}>Works seamlessly with</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {INTEGRATIONS.map(name => (
                <span key={name} className="px-4 py-2 text-sm font-medium" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: L.secondary }}>{name}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 11. PRICING PREVIEW ── */}
      <section className="px-6 py-14 md:py-20" style={{ background: L.surface, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>Simple, transparent pricing.</h2>
            <p className="mt-4 text-lg" style={{ color: L.secondary }}>Start free. Upgrade when you're ready.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.06}>
                <div className="relative p-7 h-full flex flex-col" style={{
                  borderRadius: '16px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)',
                  border: plan.popular ? `2px solid ${L.primary}` : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: plan.popular ? L.glowStrong : 'none',
                }}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 text-white cm-gradient-btn"
                      style={{ borderRadius: '999px' }}>Most Popular</span>
                  )}
                  <h3 className="text-lg font-bold" style={{ fontFamily: F.display }}>{plan.name}</h3>
                  <div className="mt-3 mb-5">
                    <span className="text-4xl font-bold" style={{ fontFamily: F.display }}>{plan.price}</span>
                    {plan.period && <span className="text-sm" style={{ color: L.muted }}>{plan.period}</span>}
                  </div>
                  <div className="flex flex-col gap-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={L.emerald} strokeWidth={2.5}><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-sm" style={{ color: L.secondary }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/pricing" className={plan.popular ? 'cm-gradient-btn text-white' : 'cm-outline-btn'}
                    style={{ borderRadius: L.radius, display: 'block', textAlign: 'center', padding: '10px 0', fontWeight: 600, fontSize: '14px' }}>
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. FINAL CTA ── */}
      <section className="px-6 py-20 md:py-28">
        <Reveal className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center overflow-hidden" style={{ borderRadius: '20px', background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[2px]" style={{ background: L.gradient }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
                Your next interview <span className="cm-gradient-text">starts here.</span>
              </h2>
              <p className="mt-5 text-base md:text-lg" style={{ color: L.secondary }}>Apply, Prepare, Practice, Attend.</p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="cm-gradient-btn px-8 py-4 text-base font-semibold text-white" style={{ borderRadius: L.radius }}>
                  {isAuthenticated ? 'Go to Dashboard' : 'Start Free — No Credit Card'}
                </Link>
                <Link to="/pricing" className="cm-outline-btn px-8 py-4 text-base font-semibold" style={{ borderRadius: L.radius }}>View Pricing</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter variant="dark" />
    </div>
  );
}
