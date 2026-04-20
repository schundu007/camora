import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  bg: '#F0F7FF', surface: '#FFFFFF', elevated: '#DDE9F7',
  border: '#C4D9F2', text: '#0F172A', secondary: '#334155',
  muted: '#7096BF', dimmed: '#B0CBE6',
  gradient: 'linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%)',
  primary: '#22D3EE', accent: '#22D3EE', radius: '12px',
  glow: '0 0 60px rgba(34,211,238,0.08)',
  glowStrong: '0 0 80px rgba(34,211,238,0.15)',
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
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L2 10l7 2.5 2.5 7.5 3.5-5 4.5 3Z" /><path d="M22 2L9 12.5" /></svg>,
    tag: 'Only on Camora',
  },
  {
    title: 'Job Discovery + Auto Apply',
    desc: '1,000+ roles with AI-matched recommendations. Auto-generate tailored resumes and cover letters.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    tag: 'Only on Camora',
  },
  {
    title: 'Company-Specific Prep',
    desc: 'Interview patterns, common questions, salary data, and tech stacks for Google, Amazon, Meta, and 60+ more.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>,
    tag: '60+ Companies',
  },
  {
    title: 'Architecture Diagrams',
    desc: 'Auto-generated system design diagrams for every topic. Visual architecture with component relationships.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
    tag: 'AI-Generated',
  },
  {
    title: 'STAR Behavioral Coaching',
    desc: 'AI structures your behavioral answers using Situation, Task, Action, Result format — coached in real-time.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>,
    tag: 'Real-time',
  },
  {
    title: 'Desktop App + Stealth Mode',
    desc: 'Native app with system tray, global hotkey (Cmd+Shift+C), and emergency blank screen (Cmd+B).',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    tag: 'macOS + Windows',
  },
  {
    title: 'Speaker Voice Filtering',
    desc: 'Enroll your voice, then Camora filters out the interviewer — only your voice triggers transcription.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12a10 10 0 0 1 10-10" /><path d="M2 12a14 14 0 0 0 14 14" /><path d="M6 12a6 6 0 0 1 6-6" /><path d="M6 12a10 10 0 0 0 10 10" /><circle cx="12" cy="12" r="2" /></svg>,
    tag: 'Privacy-First',
  },
  {
    title: 'Mock Interview Simulator',
    desc: 'Timed mock interviews with AI interviewer. Get scored on communication, accuracy, and code quality.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>,
    tag: 'AI-Scored',
  },
  {
    title: 'Multi-Approach Solutions',
    desc: 'Every problem has brute force, optimized, and optimal solutions with time/space complexity analysis.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    tag: '3 Approaches',
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
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}>{children}</motion.div>
  );
}


/* ── Detailed Ice Shard SVGs — faceted crystals with internal structure ── */
const SHARDS: { vb: string; outer: string; facets: string[]; highlight: string }[] = [
  { // Tall jagged crystal
    vb: '0 0 40 80',
    outer: 'M20 2L10 18L4 38L8 58L20 78L28 62L36 38L30 18Z',
    facets: ['M20 2L10 18L20 28Z', 'M20 2L30 18L20 28Z', 'M10 18L4 38L14 34L20 28Z', 'M30 18L36 38L26 34L20 28Z', 'M4 38L8 58L14 34Z', 'M36 38L28 62L26 34Z', 'M8 58L20 78L14 34Z', 'M28 62L20 78L26 34Z', 'M14 34L20 50L26 34Z'],
    highlight: 'M20 2L10 18M20 28L4 38M20 28L36 38M14 34L20 50L26 34',
  },
  { // Wide faceted gem
    vb: '0 0 50 70',
    outer: 'M25 2L8 20L2 42L14 62L25 68L36 62L48 42L42 20Z',
    facets: ['M25 2L8 20L25 30Z', 'M25 2L42 20L25 30Z', 'M8 20L2 42L18 36L25 30Z', 'M42 20L48 42L32 36L25 30Z', 'M2 42L14 62L18 36Z', 'M48 42L36 62L32 36Z', 'M14 62L25 68L18 36Z', 'M36 62L25 68L32 36Z', 'M18 36L25 52L32 36Z'],
    highlight: 'M25 2L8 20M25 2L42 20M25 30L2 42M25 30L48 42M18 36L25 52L32 36',
  },
  { // Small sharp diamond
    vb: '0 0 36 56',
    outer: 'M18 2L6 18L2 34L10 50L18 54L26 50L34 34L30 18Z',
    facets: ['M18 2L6 18L18 24Z', 'M18 2L30 18L18 24Z', 'M6 18L2 34L12 30L18 24Z', 'M30 18L34 34L24 30L18 24Z', 'M2 34L10 50L12 30Z', 'M34 34L26 50L24 30Z', 'M10 50L18 54L12 30Z', 'M26 50L18 54L24 30Z'],
    highlight: 'M18 2L6 18M18 24L2 34M18 24L34 34M12 30L18 42L24 30',
  },
  { // Irregular chunk
    vb: '0 0 44 64',
    outer: 'M22 2L8 14L2 32L6 50L18 62L32 58L42 40L38 22L30 8Z',
    facets: ['M22 2L8 14L20 22L30 8Z', 'M8 14L2 32L14 28L20 22Z', 'M30 8L38 22L28 26L20 22Z', 'M2 32L6 50L14 28Z', 'M38 22L42 40L28 26Z', 'M6 50L18 62L22 40L14 28Z', 'M42 40L32 58L22 40L28 26Z', 'M18 62L32 58L22 40Z', 'M14 28L22 40L28 26Z'],
    highlight: 'M22 2L8 14M30 8L38 22M20 22L2 32M20 22L38 22M14 28L22 40L28 26',
  },
  { // Thin elongated spike
    vb: '0 0 28 72',
    outer: 'M14 2L6 20L2 42L6 58L14 70L20 60L26 42L22 20Z',
    facets: ['M14 2L6 20L14 26Z', 'M14 2L22 20L14 26Z', 'M6 20L2 42L10 36L14 26Z', 'M22 20L26 42L18 36L14 26Z', 'M2 42L6 58L10 36Z', 'M26 42L20 60L18 36Z', 'M6 58L14 70L10 36Z', 'M20 60L14 70L18 36Z', 'M10 36L14 52L18 36Z'],
    highlight: 'M14 2L6 20M14 26L2 42M14 26L26 42M10 36L14 52L18 36',
  },
  { // Stubby crystal cluster
    vb: '0 0 48 60',
    outer: 'M16 2L4 16L2 36L12 54L24 58L36 52L46 34L40 14L28 4Z',
    facets: ['M16 2L4 16L16 20L28 4Z', 'M28 4L40 14L24 22L16 20Z', 'M4 16L2 36L14 30L16 20Z', 'M40 14L46 34L30 28L24 22Z', 'M2 36L12 54L14 30Z', 'M46 34L36 52L30 28Z', 'M12 54L24 58L20 38L14 30Z', 'M36 52L24 58L28 38L30 28Z', 'M14 30L20 38L24 22Z', 'M30 28L28 38L24 22Z'],
    highlight: 'M16 2L4 16M28 4L40 14M16 20L2 36M24 22L46 34M14 30L20 38L28 38L30 28',
  },
  { // Needle shard
    vb: '0 0 20 68',
    outer: 'M10 2L4 22L2 44L6 58L10 66L14 58L18 44L16 22Z',
    facets: ['M10 2L4 22L10 18Z', 'M10 2L16 22L10 18Z', 'M4 22L2 44L8 36L10 18Z', 'M16 22L18 44L12 36L10 18Z', 'M2 44L6 58L8 36Z', 'M18 44L14 58L12 36Z', 'M6 58L10 66L8 36Z', 'M14 58L10 66L12 36Z'],
    highlight: 'M10 2L4 22M10 18L2 44M10 18L18 44M8 36L10 52L12 36',
  },
];

function IceShard({ style, size = 48, variant = 0, flip = false }: { style: React.CSSProperties; size?: number; variant?: number; flip?: boolean }) {
  const s = SHARDS[variant % SHARDS.length];
  const uid = `ice${variant}${size}`;
  return (
    <div className="ice-shard" style={{ width: size, height: size * 1.8, transform: flip ? 'scaleX(-1)' : undefined, ...style }}>
      <svg viewBox={s.vb} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="40%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id={`${uid}b`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CFFAFE" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Outer crystal body */}
        <path d={s.outer} fill={`url(#${uid}a)`} opacity="0.7" />
        {/* Internal facets — each face slightly different shade */}
        {s.facets.map((f, i) => (
          <path key={i} d={f} fill={i % 2 === 0 ? `url(#${uid}b)` : 'rgba(34,211,238,0.15)'} stroke="rgba(165,243,252,0.5)" strokeWidth="0.4" />
        ))}
        {/* Bright edge highlights */}
        <path d={s.highlight} fill="none" stroke="#CFFAFE" strokeWidth="0.7" opacity="0.9" strokeLinecap="round" />
        {/* Outer glow edge */}
        <path d={s.outer} fill="none" stroke="#67E8F9" strokeWidth="0.5" opacity="0.6" />
      </svg>
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
    <div className="min-h-screen relative overflow-x-hidden" style={{ fontFamily: F.body, color: L.text, background: L.bg }}>
      <SEO path="/" />
      {/* Zoom-style: clean, no decorative tracks or grid dots */}
      <style>{`
        .cm-gradient-text { background: ${L.gradient}; -webkit-background-clip: text; background-clip: text; color: transparent; }
        .cm-gradient-btn { background: ${L.gradient}; transition: filter 0.2s ease, box-shadow 0.2s ease; }
        .cm-gradient-btn:hover { filter: brightness(1.15); box-shadow: 0 0 30px rgba(34,211,238,0.2); }
        .cm-outline-btn { border: 1.5px solid ${L.border}; color: ${L.text}; transition: border-color 0.2s, background 0.2s; }
        .cm-outline-btn:hover { border-color: #22D3EE; background: rgba(34,211,238,0.04); color: #22D3EE; }
        .cm-glass { background: #FFFFFF; border: 1px solid ${L.border}; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .cm-glass:hover { border-color: #22D3EE; box-shadow: 0 4px 12px rgba(34,211,238,0.08); }
        @keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ice-shard { position: absolute; pointer-events: none; z-index: 2; opacity: 0.55; filter: drop-shadow(0 0 14px rgba(34,211,238,0.5)) drop-shadow(0 0 30px rgba(34,211,238,0.25)); }
      `}</style>

      <SiteNav variant="light" />

      {/* ── 1. HERO — Frost crystal background ── */}
      <section className="relative pt-24 pb-10 md:pt-32 md:pb-14 px-6 overflow-hidden">

        {/* Hero background — frost crystal blended overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/hero-frost.png" alt="" className="w-full h-full object-cover object-center" style={{ opacity: 0.35 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.45) 60%, #FFFFFF 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.04) 0%, transparent 50%)' }} />
        </div>
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none z-[1]" style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)' }} />
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase"
              style={{ borderRadius: '999px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: L.secondary, fontFamily: F.mono }}>
              <span className="w-2 h-2 rounded-full" style={{ background: L.primary }} />
              Apply . Prepare . Practice . Attend
            </span>
          </motion.div>

          <motion.h1 className="mt-8 font-bold tracking-[-0.03em]" style={{ fontFamily: F.display }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08]">Your career,</span>
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08] cm-gradient-text">Cold as ice, sharp as frost.</span>
          </motion.h1>

          <motion.p className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: L.secondary }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Job discovery. Interview prep. Mock practice. Live AI assistance.
          </motion.p>

          <motion.div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="cm-gradient-btn px-7 py-3.5 text-[15px] font-semibold text-white" style={{ borderRadius: L.radius }}>
              {isAuthenticated ? 'Enter the Blizzard' : 'Start Your Avalanche'}
            </Link>
            <Link to="/download" className="cm-outline-btn px-7 py-3.5 text-[15px] font-semibold" style={{ borderRadius: L.radius }}>
              Download Desktop App
            </Link>
          </motion.div>

          {visitorCount !== null && visitorCount > 0 && (
            <motion.div className="mt-6 flex items-center justify-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}>
              <div className="flex -space-x-1.5">
                {[L.primary, '#F97316', '#8B5CF6', '#10B981'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full" style={{ background: c, border: `2px solid ${L.bg}` }} />
                ))}
              </div>
              <span className="text-sm" style={{ color: L.secondary }}>
                <span className="font-bold" style={{ color: L.text }}>{visitorCount.toLocaleString()}+</span> explorers in the storm
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── 2. COMPANY LOGOS — "Prepare for interviews at" ── */}
      <section className="relative px-6 py-8 overflow-hidden">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <p className="text-center text-sm font-medium mb-4" style={{ color: L.secondary }}>
            85% of our users conquer offers at these companies
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${L.border}`, background: L.surface }}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
              {COMPANIES.map((c) => (
                <div key={c} className="flex items-center justify-center py-6 px-4 transition-all hover:bg-black/[0.02]" style={{ borderRight: `1px solid ${L.border}`, borderBottom: `1px solid ${L.border}` }}>
                  <img src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=80&format=png`}
                    alt={c} className="h-8 object-contain" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. STATS BAR ── */}
      <section className="relative px-6 py-10">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 px-8 py-8 cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
            <IceShard style={{ top: -14, left: -10, rotate: '-15deg' }} size={30} variant={0} />
            <IceShard style={{ top: -10, right: '25%', rotate: '32deg' }} size={20} variant={6} />
            <IceShard style={{ bottom: -12, right: -8, rotate: '25deg' }} size={26} variant={2} flip />
            <IceShard style={{ bottom: -8, left: '30%', rotate: '-20deg' }} size={18} variant={5} flip />
            <IceShard style={{ top: '35%', left: -12, rotate: '40deg' }} size={22} variant={3} />
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
      <section className="px-6 py-10 md:py-14 relative">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Your frostbite formula to the offer.
            </h2>
          </Reveal>

          {/* Timeline sections */}
          <div className="relative">
            <div className="space-y-8 md:space-y-10">
              {APPA.map((step, i) => (
                <Reveal key={step.key} delay={i * 0.08}>
                  <div className="flex gap-6 md:gap-10 items-start">
                    <div className="hidden md:flex flex-col items-center flex-shrink-0 relative z-10">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: L.primary }}>{i + 1}</div>
                    </div>
                    <div className="flex-1 flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-[45%]">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.15em] uppercase px-3 py-1 mb-4"
                          style={{ borderRadius: '6px', background: 'rgba(34,211,238,0.08)', color: L.primary, fontFamily: F.mono }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            {i === 0 && <><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></>}
                            {i === 1 && <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>}
                            {i === 2 && <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>}
                            {i === 3 && <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>}
                          </svg>
                          {step.label}
                        </span>
                        <h3 className="text-xl lg:text-2xl font-bold tracking-tight mb-3" style={{ fontFamily: F.display }}>{step.headline}</h3>
                        <p className="text-sm leading-relaxed mb-5" style={{ color: L.secondary }}>{step.desc}</p>
                        <Link to={step.href} className="inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-3" style={{ color: L.primary }}>
                          Explore {step.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </Link>
                      </div>
                      <div className="lg:w-[55%] p-6 cm-glass relative" style={{ borderRadius: '16px' }}>
                        <IceShard style={{ top: -12, right: -8, rotate: `${(i * 37 + 15) % 60 - 30}deg` }} size={24} variant={i % 7} flip={i % 2 === 0} />
                        <IceShard style={{ top: -8, left: '40%', rotate: `${(i * 19 + 50) % 50 - 25}deg` }} size={16} variant={(i + 4) % 7} />
                        <IceShard style={{ bottom: -10, left: -8, rotate: `${(i * 23 + 40) % 60 - 30}deg` }} size={20} variant={(i + 2) % 7} />
                        <IceShard style={{ top: '40%', right: -10, rotate: `${(i * 41 + 20) % 50 - 25}deg` }} size={18} variant={(i + 5) % 7} flip />
                        <IceShard style={{ bottom: -6, right: '30%', rotate: `${(i * 29 + 35) % 60 - 30}deg` }} size={14} variant={(i + 6) % 7} />
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-9 h-9 flex items-center justify-center" style={{ borderRadius: L.radius, background: 'rgba(34,211,238,0.1)', color: L.primary }}>{step.icon}</div>
                          <span className="text-sm font-bold" style={{ fontFamily: F.display }}>{step.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {step.features.map(f => (
                            <span key={f} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
                              style={{ borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', color: L.secondary }}>
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


      {/* ── 6. JOB URL ANALYSIS ── */}
      <section className="relative px-6 py-10 md:py-14" style={{ background: L.surface }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Craft your next move.
            </h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: L.secondary }}>
              Paste any job URL. Get a tailored prep plan.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="cm-glass relative" style={{ borderRadius: '16px', boxShadow: L.glow }}>
              <IceShard style={{ top: -14, left: -10, rotate: '20deg' }} size={28} variant={1} />
              <IceShard style={{ top: -8, right: '30%', rotate: '-18deg' }} size={18} variant={6} />
              <IceShard style={{ top: '40%', right: -12, rotate: '-30deg' }} size={24} variant={3} flip />
              <IceShard style={{ bottom: -12, left: -8, rotate: '35deg' }} size={22} variant={5} />
              <IceShard style={{ bottom: -10, right: '20%', rotate: '40deg' }} size={20} variant={4} />
              <IceShard style={{ top: '60%', left: -10, rotate: '-15deg' }} size={16} variant={0} flip />
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderRadius: L.radius, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
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
                    <div key={col.label} className="p-4" style={{ borderRadius: L.radius, background: 'rgba(0,0,0,0.02)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: L.muted, fontFamily: F.mono }}>{col.label}</p>
                      <div className="flex flex-col gap-1.5">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium px-2.5 py-1.5" style={{ borderRadius: '8px', color: L.secondary, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>{item}</span>
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

      {/* ── 7. LIVE AI DEMO — Simulated Q&A ── */}
      <section className="relative px-6 py-10 md:py-14" style={{ background: L.surface }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase px-4 py-1.5"
              style={{ borderRadius: '999px', background: L.primary, border: '1px solid var(--border)', color: '#FFFFFF', fontFamily: F.mono }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
              Frost AI
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight mt-5" style={{ fontFamily: F.display }}>
              Your ice breaker in the storm.
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="cm-glass relative" style={{ borderRadius: '16px', boxShadow: L.glow }}>
              <IceShard style={{ top: -12, right: -8, rotate: '-20deg' }} size={26} variant={0} />
              <IceShard style={{ top: -8, left: '20%', rotate: '28deg' }} size={16} variant={5} />
              <IceShard style={{ bottom: -12, left: -8, rotate: '35deg' }} size={24} variant={2} flip />
              <IceShard style={{ bottom: -8, right: '25%', rotate: '-22deg' }} size={18} variant={6} />
              <IceShard style={{ top: '50%', left: -12, rotate: '10deg' }} size={20} variant={4} />
              <IceShard style={{ top: '30%', right: -10, rotate: '-35deg' }} size={22} variant={1} flip />
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#ef4444', fontFamily: F.mono }}>Transcribing</span>
                </div>
                <p className="text-base leading-relaxed" style={{ color: L.text, fontFamily: F.body }}>
                  "Design a distributed rate limiter that can handle millions of requests per second across multiple data centers..."
                </p>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full" style={{ background: L.accent }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: L.accent, fontFamily: F.mono }}>AI Response</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Architecture', items: ['Token Bucket Algorithm', 'Redis Cluster', 'Sliding Window Counter'] },
                    { label: 'Components', items: ['API Gateway', 'Rate Limiter Service', 'Config Store'] },
                    { label: 'Trade-offs', items: ['Consistency vs Availability', 'Memory vs Accuracy', 'Latency vs Precision'] },
                  ].map(col => (
                    <div key={col.label} className="p-4" style={{ borderRadius: L.radius, background: 'rgba(0,0,0,0.02)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: L.muted, fontFamily: F.mono }}>{col.label}</p>
                      <div className="flex flex-col gap-1.5">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium px-2.5 py-1.5" style={{ borderRadius: '8px', color: L.secondary, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>{item}</span>
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

      {/* ── 9. UNIQUE FEATURES GRID ── */}
      <section className="relative px-6 py-10 md:py-14" style={{ background: L.surface }}>
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 mb-5"
              style={{ borderRadius: '999px', background: L.primary, border: '1px solid var(--border)', color: '#FFFFFF', fontFamily: F.mono }}>Avalanche Makers Only</span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>Arctic-grade features. Zero meltdown.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UNIQUE_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <div className="p-6 h-full cm-glass relative" style={{ borderRadius: '16px' }}>
                  <IceShard style={{ top: -10, right: -6, rotate: `${(i * 31 + 10) % 50 - 25}deg` }} size={22} variant={i % 7} flip={i % 3 === 0} />
                  <IceShard style={{ bottom: -8, left: -4, rotate: `${(i * 43 + 25) % 60 - 30}deg` }} size={16} variant={(i + 3) % 7} flip={i % 2 === 1} />
                  {i % 2 === 0 && <IceShard style={{ top: '40%', left: -8, rotate: `${(i * 17 + 5) % 40 - 20}deg` }} size={14} variant={(i + 5) % 7} />}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: L.radius, background: 'rgba(0,0,0,0.03)', color: L.secondary }}>{f.icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1" style={{ borderRadius: '6px', background: 'rgba(34,211,238,0.06)', color: L.primary, fontFamily: F.mono }}>{f.tag}</span>
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ fontFamily: F.display }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: L.secondary }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ── 12. FINAL CTA ── */}
      <section className="relative px-6 py-14 md:py-20">
        <Reveal className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <div className="relative px-8 py-12 md:px-14 md:py-16 text-center overflow-hidden" style={{ borderRadius: '20px', background: L.surface, border: '1px solid rgba(0,0,0,0.05)', boxShadow: L.glowStrong }}>
            <IceShard style={{ top: -14, left: -8, rotate: '20deg' }} size={30} variant={1} />
            <IceShard style={{ top: -10, left: '25%', rotate: '-32deg' }} size={18} variant={6} />
            <IceShard style={{ top: '30%', right: -12, rotate: '-25deg' }} size={26} variant={3} flip />
            <IceShard style={{ top: -8, right: '20%', rotate: '15deg' }} size={16} variant={5} />
            <IceShard style={{ bottom: -10, left: '30%', rotate: '35deg' }} size={22} variant={0} />
            <IceShard style={{ bottom: -12, right: -8, rotate: '-15deg' }} size={28} variant={4} />
            <IceShard style={{ top: '60%', left: -10, rotate: '42deg' }} size={20} variant={2} flip />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[2px]" style={{ background: L.gradient }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, rgba(34,211,238,0.04) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
                Ready to <span className="cm-gradient-text">freeze the competition?</span>
              </h2>
              <p className="mt-5 text-base md:text-lg" style={{ color: L.secondary }}>Apply. Prepare. Practice. Attend. Your mission control for interviews.</p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="cm-gradient-btn px-8 py-4 text-base font-semibold text-white" style={{ borderRadius: L.radius }}>
                  {isAuthenticated ? 'Enter the Blizzard' : 'Start Free — No Credit Card'}
                </Link>
                <Link to="/pricing" className="cm-outline-btn px-8 py-4 text-base font-semibold" style={{ borderRadius: L.radius }}>View Snow Passes</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}
