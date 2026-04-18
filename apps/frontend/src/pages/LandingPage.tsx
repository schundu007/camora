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
  bg: '#FFFFFF', surface: '#F7F8FA', elevated: '#EEF0F4',
  border: '#E2E5EB', text: '#1A1D23', secondary: '#4A5568',
  muted: '#8C95A6', dimmed: '#C8CDD6',
  gradient: 'linear-gradient(135deg, #2D8CFF 0%, #0B5CFF 100%)',
  primary: '#2D8CFF', emerald: '#2D8CFF', radius: '12px',
  glow: '0 0 60px rgba(45,140,255,0.08)',
  glowStrong: '0 0 80px rgba(45,140,255,0.15)',
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


/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const visitorCount = useVisitorCount();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = 'Camora — Apply, Prepare, Practice & Attend'; return () => { document.title = 'Camora'; }; }, []);

  return (
    <div className="min-h-screen relative" style={{ fontFamily: F.body, color: L.text, background: L.bg }}>
      <SEO path="/" />
      {/* Zoom-style: clean, no decorative tracks or grid dots */}
      <style>{`
        .cm-gradient-text { background: ${L.gradient}; -webkit-background-clip: text; background-clip: text; color: transparent; }
        .cm-gradient-btn { background: ${L.gradient}; transition: filter 0.2s ease, box-shadow 0.2s ease; }
        .cm-gradient-btn:hover { filter: brightness(1.15); box-shadow: 0 0 30px rgba(45,140,255,0.2); }
        .cm-outline-btn { border: 1.5px solid ${L.border}; color: ${L.text}; transition: border-color 0.2s, background 0.2s; }
        .cm-outline-btn:hover { border-color: #2D8CFF; background: rgba(45,140,255,0.04); color: #2D8CFF; }
        .cm-glass { background: #FFFFFF; border: 1px solid ${L.border}; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .cm-glass:hover { border-color: #2D8CFF; box-shadow: 0 4px 12px rgba(45,140,255,0.08); }
        @keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      <SiteNav variant="light" />

      {/* ── 1. HERO — Forest road background ── */}
      <section className="relative pt-24 pb-10 md:pt-32 md:pb-14 px-6 overflow-hidden">

        {/* Hero background — dark with subtle image overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/hero-forest.jpg" alt="" className="w-full h-full object-cover object-center" style={{ opacity: 0.15 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.75) 50%, #FFFFFF 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(118,185,0,0.04) 0%, transparent 40%)' }} />
        </div>
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none z-[1]" style={{ background: 'radial-gradient(ellipse at center, rgba(45,140,255,0.08) 0%, transparent 70%)' }} />
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
            <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-[1.08] cm-gradient-text">Cleared for takeoff.</span>
          </motion.h1>

          <motion.p className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: L.secondary }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Job discovery. Interview prep. Mock practice. Live AI assistance.
          </motion.p>

          <motion.div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="cm-gradient-btn px-7 py-3.5 text-[15px] font-semibold text-white" style={{ borderRadius: L.radius }}>
              {isAuthenticated ? 'Enter Cockpit' : 'Get Your Boarding Pass'}
            </Link>
            <Link to="/download" className="cm-outline-btn px-7 py-3.5 text-[15px] font-semibold" style={{ borderRadius: L.radius }}>
              Download Cockpit App
            </Link>
          </motion.div>

          {visitorCount !== null && visitorCount > 0 && (
            <motion.div className="mt-6 flex items-center justify-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}>
              <div className="flex -space-x-1.5">
                {[L.primary, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full" style={{ background: c, border: `2px solid ${L.bg}` }} />
                ))}
              </div>
              <span className="text-sm" style={{ color: L.secondary }}>
                <span className="font-bold" style={{ color: L.text }}>{visitorCount.toLocaleString()}+</span> passengers aboard
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── 2. COMPANY LOGOS — "Prepare for interviews at" ── */}
      <section className="relative px-6 py-8 overflow-hidden">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <p className="text-center text-sm font-medium mb-4" style={{ color: L.secondary }}>
            85% of our users land offers at these companies
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
      <section className="px-6 py-10 md:py-14 relative">
        <div className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
              Your flight plan to the offer.
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
                          style={{ borderRadius: '6px', background: 'rgba(45,140,255,0.08)', color: L.primary, fontFamily: F.mono }}>
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
                          Board {step.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </Link>
                      </div>
                      <div className="lg:w-[55%] p-6 cm-glass" style={{ borderRadius: '16px' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-9 h-9 flex items-center justify-center" style={{ borderRadius: L.radius, background: 'rgba(45,140,255,0.1)', color: L.primary }}>{step.icon}</div>
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
            <div className="cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
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
              style={{ borderRadius: '999px', background: L.primary, border: 'none', color: '#FFFFFF', fontFamily: F.mono }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
              Cockpit AI
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight mt-5" style={{ fontFamily: F.display }}>
              Your co-pilot in the cockpit.
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="cm-glass" style={{ borderRadius: '16px', boxShadow: L.glow }}>
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
                  <span className="w-2 h-2 rounded-full" style={{ background: L.emerald }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: L.emerald, fontFamily: F.mono }}>AI Response</span>
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
              style={{ borderRadius: '999px', background: L.primary, border: 'none', color: '#FFFFFF', fontFamily: F.mono }}>Club Members Only</span>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold tracking-tight" style={{ fontFamily: F.display }}>First-class features. No turbulence.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UNIQUE_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <div className="p-6 h-full cm-glass" style={{ borderRadius: '16px' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: L.radius, background: 'rgba(0,0,0,0.03)', color: L.secondary }}>{f.icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1" style={{ borderRadius: '6px', background: 'rgba(45,140,255,0.06)', color: L.primary, fontFamily: F.mono }}>{f.tag}</span>
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[2px]" style={{ background: L.gradient }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, rgba(118,185,0,0.04) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight" style={{ fontFamily: F.display }}>
                Ready for <span className="cm-gradient-text">liftoff?</span>
              </h2>
              <p className="mt-5 text-base md:text-lg" style={{ color: L.secondary }}>Apply. Prepare. Practice. Attend. Your mission control for interviews.</p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="cm-gradient-btn px-8 py-4 text-base font-semibold text-white" style={{ borderRadius: L.radius }}>
                  {isAuthenticated ? 'Enter Cockpit' : 'Board Free — No Credit Card'}
                </Link>
                <Link to="/pricing" className="cm-outline-btn px-8 py-4 text-base font-semibold" style={{ borderRadius: L.radius }}>View Tickets</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}
