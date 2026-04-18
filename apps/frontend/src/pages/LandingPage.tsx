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
  { name: 'Low-Level Design', count: 112, problems: 268, color: '#3B82F6' },
  { name: 'DSA & Algorithms', count: 65, problems: 854, color: '#FFFFFF' },
  { name: 'Behavioral', count: 64, problems: 230, color: '#F59E0B' },
  { name: 'Database & SQL', count: 31, problems: 197, color: '#EC4899' },
  { name: 'Microservices', count: 27, problems: 0, color: '#8B5CF6' },
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
    <div className="min-h-screen relative" style={{ fontFamily: F.body, color: L.text, background: L.bg }}>
      <SEO path="/" />
      {/* ═══ RUNWAY TRACK — thick takeoff road at 25% with airplane + airport nodes ═══ */}
      <div className="absolute top-0 bottom-0 z-[3] pointer-events-none hidden lg:block" style={{ left: 'calc(15% + 18px)' }}>
        {/* Tarmac — wide dark runway strip */}
        <div className="absolute top-0 bottom-0" style={{ left: '-10px', width: '20px', borderRadius: '10px', background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 5%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.05) 95%, transparent 100%)` }} />
        {/* White dashed center line — real runway marking */}
        <div className="absolute left-0 top-0 bottom-0" style={{ width: '2px', background: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 20px, transparent 20px, transparent 36px)` }} />
        {/* Edge markings — solid white */}
        <div className="absolute top-0 bottom-0" style={{ left: '-10px', width: '1px', background: `linear-gradient(to bottom, transparent 3%, rgba(255,255,255,0.15) 8%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 92%, transparent 97%)` }} />
        <div className="absolute top-0 bottom-0" style={{ left: '9px', width: '1px', background: `linear-gradient(to bottom, transparent 3%, rgba(255,255,255,0.15) 8%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 92%, transparent 97%)` }} />
        {/* Glow aura */}
        <div className="absolute top-0 bottom-0" style={{ left: '-18px', width: '36px', background: `linear-gradient(to bottom, transparent 3%, rgba(255,255,255,0.015) 10%, rgba(255,255,255,0.008) 50%, rgba(255,255,255,0.015) 90%, transparent 97%)`, filter: 'blur(10px)' }} />

        {/* ── AIRPLANE flying UP with contrail ── */}
        <div className="absolute" style={{ left: '-26px', animation: 'fp-rocket 64s ease-in-out infinite' }}>
          {/* Contrail below the ascending plane */}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: '3px', height: '100px', borderRadius: '2px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(118,185,0,0.2), transparent)' }} />
          {/* Real airplane image — flying up */}
          <img src="/airplane.png" alt="" width="56" height="56" style={{ filter: 'drop-shadow(0 0 16px rgba(118,185,0,0.6)) drop-shadow(0 -4px 10px rgba(255,255,255,0.2))' }} />
        </div>

        {/* ── Airport nodes — each section is a destination ── */}
        {[
          { pos: 8,  code: 'SFO' },
          { pos: 22, code: 'LAX' },
          { pos: 36, code: 'ORD' },
          { pos: 50, code: 'JFK' },
          { pos: 64, code: 'LHR' },
          { pos: 78, code: 'NRT' },
          { pos: 92, code: 'SIN' },
        ].map((airport, i) => (
          <div key={i} className="absolute" style={{ top: `${airport.pos}%`, left: '-14px' }}>
            {/* Airport marker */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: L.bg, border: '2.5px solid rgba(255,255,255,0.25)', boxShadow: '0 0 14px rgba(255,255,255,0.08), inset 0 0 6px rgba(118,185,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(118,185,0,0.5)' }} />
            </div>
            {/* Airport code label */}
            <div style={{ position: 'absolute', left: '36px', top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '9px', fontFamily: F.mono, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>{airport.code}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Grid dot pattern */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <style>{`
        .cm-gradient-text { background: ${L.gradient}; -webkit-background-clip: text; background-clip: text; color: transparent; }
        .cm-gradient-btn { background: ${L.gradient}; transition: filter 0.2s ease, box-shadow 0.2s ease; }
        .cm-gradient-btn:hover { filter: brightness(1.15); box-shadow: 0 0 30px rgba(118,185,0,0.2); }
        .cm-outline-btn { border: 1px solid rgba(255,255,255,0.12); color: ${L.text}; transition: border-color 0.2s, background 0.2s; backdrop-filter: blur(8px); }
        .cm-outline-btn:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); }
        .cm-glass { background: ${L.surface}; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        .cm-glass:hover { background: ${L.elevated}; border-color: rgba(255,255,255,0.12); }
        @keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        /* Rocket ascends from bottom to top */
        @keyframes fp-rocket {
          0% { top: calc(100% + 50px); opacity: 0; }
          2% { opacity: 1; }
          /* Ascending — pause at each section gate */
          9% { top: 92%; } 12% { top: 92%; }
          20% { top: 78%; } 23% { top: 78%; }
          32% { top: 62%; } 35% { top: 62%; }
          44% { top: 48%; } 47% { top: 48%; }
          56% { top: 35%; } 59% { top: 35%; }
          68% { top: 22%; } 71% { top: 22%; }
          82% { top: 8%; }  85% { top: 8%; }
          95% { opacity: 1; }
          100% { top: -70px; opacity: 0; }
        }
        /* Exhaust flame flicker */
        @keyframes fp-exhaust {
          0% { height: 40px; opacity: 0.4; }
          100% { height: 55px; opacity: 0.7; }
        }
        /* Smoke puffs drift and fade */
        @keyframes fp-smoke {
          0% { transform: translateX(-50%) scale(1); opacity: 0.1; }
          50% { transform: translateX(-50%) scale(1.8); opacity: 0.06; }
          100% { transform: translateX(-50%) scale(2.5); opacity: 0; }
        }
        /* Radar sweep rotation */
        .fp-sweep { transform-origin: 12px 12px; animation: fp-sweep-rotate 3s linear infinite; }
        @keyframes fp-sweep-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* Radar blip pulse */
        .fp-blip { animation: fp-blip-pulse 2s ease-in-out infinite; }
        @keyframes fp-blip-pulse { 0%, 100% { opacity: 0.2; r: 0.8; } 50% { opacity: 0.7; r: 1.4; } }
        /* Afterburner glow */
        .fp-afterburner { animation: fp-afterburner-pulse 0.5s ease-in-out infinite alternate; }
        @keyframes fp-afterburner-pulse { 0% { opacity: 0.2; } 100% { opacity: 0.5; } }
        /* Nozzle glow */
        .fp-nozzle-glow { animation: fp-nozzle 0.35s ease-in-out infinite alternate; }
        @keyframes fp-nozzle { 0% { opacity: 0.3; } 100% { opacity: 0.7; } }
        /* Waypoint radar ping — expanding ring */
        .fp-ping {
          position: absolute; width: 24px; height: 24px; border-radius: 50%;
          border: 1px solid rgba(118,185,0,0.15);
          animation: fp-ping-expand 3s ease-out infinite;
        }
        @keyframes fp-ping-expand {
          0% { transform: scale(0.5); opacity: 0.4; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <SiteNav variant="dark" />

      {/* ── 1. HERO — Forest road background ── */}
      <section className="relative pt-28 pb-14 md:pt-36 md:pb-20 px-6 overflow-hidden">
        {/* Forest background image */}
        <div className="absolute inset-0 z-0">
          <img src="/hero-forest.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(9,9,15,0.65) 0%, rgba(9,9,15,0.8) 50%, rgba(9,9,15,0.95) 85%, #09090F 100%)' }} />
        </div>
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none z-[1]" style={{ background: 'radial-gradient(ellipse at center, rgba(118,185,0,0.08) 0%, transparent 70%)' }} />
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
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08]">Launch your career</span>
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08] cm-gradient-text">into orbit.</span>
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
          <div className="relative overflow-hidden rounded-2xl py-5" style={{ border: `1px solid ${L.border}`, background: L.surface, maskImage: 'linear-gradient(90deg, transparent 2%, black 10%, black 90%, transparent 98%)' }}>
            <div className="flex items-center gap-12 px-4" style={{ animation: 'scroll-logos 30s linear infinite', width: 'max-content' }}>
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

      {/* ── 4. APPA — Flight Path Timeline ── */}
      <section className="px-6 py-14 md:py-20 relative">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Your flight plan to the offer.
            </h2>
            <p className="mt-4 text-lg" style={{ color: L.secondary }}>Four stages. One destination. Cleared for takeoff.</p>
          </Reveal>

          {/* Timeline sections */}
          <div className="relative">
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px hidden md:block" style={{ background: `linear-gradient(to bottom, transparent, ${L.primary}30, ${L.primary}30, transparent)` }} />
            <div className="space-y-10 md:space-y-14">
              {APPA.map((step, i) => (
                <Reveal key={step.key} delay={i * 0.08}>
                  <div className="flex gap-6 md:gap-10 items-start">
                    <div className="hidden md:flex flex-col items-center flex-shrink-0 relative z-10">
                      {/* Aviation icon per stage */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(118,185,0,0.08)', border: '2px solid #76B900', boxShadow: '0 0 16px rgba(118,185,0,0.25)' }}>
                        {i === 0 ? (
                          /* Paper airplane */
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L2 10l7 2.5 2.5 7.5 3.5-5 4.5 3Z" fill="#76B900" stroke="#9AE62C" strokeWidth="0.5" strokeLinejoin="round" />
                            <path d="M22 2L9 12.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                          </svg>
                        ) : i === 1 ? (
                          /* Compass */
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="#76B900" strokeWidth="1.2" />
                            <circle cx="12" cy="12" r="1.8" fill="#76B900" />
                            <polygon points="12,3 13.5,10.5 12,9 10.5,10.5" fill="#76B900" />
                            <polygon points="12,21 10.5,13.5 12,15 13.5,13.5" fill="#5E9400" />
                            <polygon points="3,12 10.5,10.5 9,12 10.5,13.5" fill="#5E9400" />
                            <polygon points="21,12 13.5,13.5 15,12 13.5,10.5" fill="#5E9400" />
                          </svg>
                        ) : i === 2 ? (
                          /* Crosshair */
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="8" stroke="#76B900" strokeWidth="1" />
                            <circle cx="12" cy="12" r="4" stroke="#76B900" strokeWidth="0.8" />
                            <circle cx="12" cy="12" r="1.5" fill="#76B900" />
                            <line x1="12" y1="1" x2="12" y2="6" stroke="#76B900" strokeWidth="1" />
                            <line x1="12" y1="18" x2="12" y2="23" stroke="#76B900" strokeWidth="1" />
                            <line x1="1" y1="12" x2="6" y2="12" stroke="#76B900" strokeWidth="1" />
                            <line x1="18" y1="12" x2="23" y2="12" stroke="#76B900" strokeWidth="1" />
                          </svg>
                        ) : (
                          /* Rocket */
                          <svg width="20" height="24" viewBox="0 0 20 26" fill="none">
                            <path d="M10 0C10 0 6 6 6 10L14 10C14 6 10 0 10 0Z" fill="#76B900" />
                            <path d="M10 0C10 0 8 4 7 7L10 5Z" fill="#9AE62C" opacity="0.5" />
                            <rect x="6" y="10" width="8" height="10" fill="#5E9400" />
                            <rect x="6" y="10" width="3" height="10" fill="#76B900" opacity="0.4" />
                            <circle cx="10" cy="14" r="2" fill="#0a0a0f" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
                            <circle cx="9.5" cy="13.5" r="0.6" fill="rgba(118,185,0,0.4)" />
                            <path d="M6 17 L2 23 L6 20Z" fill="#4A7A00" />
                            <path d="M14 17 L18 23 L14 20Z" fill="#4A7A00" />
                            <rect x="8" y="20" width="4" height="3" rx="0.5" fill="#333" />
                            <rect x="8.5" y="21.5" width="3" height="1.2" rx="0.3" fill="#F59E0B" opacity="0.7" className="fp-nozzle-glow" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-[45%]">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.15em] uppercase px-3 py-1 mb-4"
                          style={{ borderRadius: '6px', background: 'rgba(118,185,0,0.08)', color: L.primary, fontFamily: F.mono }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            {i === 0 && <><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></>}
                            {i === 1 && <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>}
                            {i === 2 && <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>}
                            {i === 3 && <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>}
                          </svg>
                          Stage {i + 1} — {step.label}
                        </span>
                        <h3 className="text-xl lg:text-2xl font-bold tracking-tight mb-3" style={{ fontFamily: F.display }}>{step.headline}</h3>
                        <p className="text-sm leading-relaxed mb-5" style={{ color: L.secondary }}>{step.desc}</p>
                        <Link to={step.href} className="inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-3" style={{ color: L.primary }}>
                          Launch {step.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </Link>
                      </div>
                      <div className="lg:w-[55%] p-6 cm-glass" style={{ borderRadius: '16px' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-9 h-9 flex items-center justify-center" style={{ borderRadius: L.radius, background: 'rgba(118,185,0,0.1)', color: L.primary }}>{step.icon}</div>
                          <span className="text-sm font-bold" style={{ fontFamily: F.display }}>{step.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {step.features.map(f => (
                            <span key={f} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
                              style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: L.secondary }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={L.primary} strokeWidth={3}><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5b. PREPARATION AT SCALE — Donut ── */}
      <section className="px-6 py-14 md:py-20" style={{ background: L.surface, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', margin: '0 3%' }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>Full payload. Zero drag.</h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: L.secondary }}>800+ topics and 1,850+ problems across 7 categories.</p>
          </Reveal>
          <TopicDonut />
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
              Your co-pilot for every interview.
            </h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: L.secondary }}>
              Like a flight engineer in your cockpit. Camora listens, transcribes, and generates answers in real-time.
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
      <section className="px-6 py-14 md:py-20" style={{ background: L.surface, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', margin: '0 3%' }}>
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

      {/* ── 9. UNIQUE FEATURES GRID ── */}
      <section className="px-6 py-14 md:py-20" style={{ background: L.surface, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', margin: '0 3%' }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 mb-5"
              style={{ borderRadius: '999px', background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.15)', color: L.emerald, fontFamily: F.mono }}>Only on Camora</span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>First-class features. No turbulence.</h2>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: L.muted }}>Compatible with all flight platforms</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {INTEGRATIONS.map(name => (
                <span key={name} className="px-4 py-2 text-sm font-medium" style={{ borderRadius: L.radius, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: L.secondary }}>{name}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 12. FINAL CTA ── */}
      <section className="px-6 py-20 md:py-28">
        <Reveal className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center overflow-hidden" style={{ borderRadius: '20px', background: L.surface, border: '1px solid rgba(255,255,255,0.07)', boxShadow: L.glowStrong }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[2px]" style={{ background: L.gradient }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, rgba(118,185,0,0.04) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
                Ready for <span className="cm-gradient-text">liftoff?</span>
              </h2>
              <p className="mt-5 text-base md:text-lg" style={{ color: L.secondary }}>Apply. Prepare. Practice. Attend. Your mission control for interviews.</p>
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
