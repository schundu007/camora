import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

/* ── Nav links ─────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

/* ── APPA process steps ────────────────────────────────── */
const PROCESS_STEPS = [
  {
    label: 'Apply for Opportunities',
    desc: 'Discover engineering roles matched to your skills, experience, and salary goals. One application reaches 1,000+ companies worldwide.',
    color: '#34d399',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" />
      </svg>
    ),
  },
  {
    label: 'Prepare with 415+ Topics',
    desc: 'Study system design, DSA, microservices, databases, SQL, low-level design, and behavioral topics with AI-powered explanations and architecture diagrams.',
    color: '#818cf8',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: 'Practice with Mock Interviews',
    desc: 'Solve real interview problems with multi-approach solutions, run timed mock interviews, and get instant AI feedback on your performance.',
    color: '#38bdf8',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" />
      </svg>
    ),
  },
  {
    label: 'Attend with Live AI',
    desc: 'Get real-time AI answers during your interview — voice transcription, architecture diagrams, multi-approach coding solutions, and STAR-format behavioral coaching.',
    color: '#fbbf24',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
];

/* ── Features ──────────────────────────────────────────── */
const FEATURES = [
  { title: 'Real-Time Transcription', desc: 'Whisper-powered voice capture transcribes your interviewer instantly. Speaker filtering removes your own voice automatically.', color: '#34d399' },
  { title: 'Architecture Diagrams', desc: 'Auto-generated AWS, Azure, GCP cloud diagrams with real service icons — not boxes and arrows.', color: '#06b6d4' },
  { title: '3-Approach Solutions', desc: 'Every coding problem solved three ways: brute force, optimized, and most optimal — with full complexity analysis.', color: '#818cf8' },
  { title: 'Platform Compatible', desc: 'Generated code runs directly on LeetCode, HackerRank, CoderPad, CodeSignal, and Glider. Zero reformatting.', color: '#f59e0b' },
  { title: 'Resume-Personalized', desc: 'Upload your resume and every answer references your real experience, projects, and metrics.', color: '#f472b6' },
  { title: 'Emergency Blank Screen', desc: 'One keystroke (Cmd+B) hides everything instantly. Toggle back just as fast. Full control.', color: '#ef4444' },
];

/* ── Logo Mark ─────────────────────────────────────────── */
function CamoraLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" /><stop offset="50%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="url(#lg)" opacity={0.15} />
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" stroke="url(#lg)" strokeWidth={1.5} fill="none" />
      <circle cx="12" cy="14" r="2.5" fill="#34d399" /><circle cx="18" cy="10" r="2.5" fill="#818cf8" />
      <circle cx="24" cy="14" r="2.5" fill="#38bdf8" /><circle cx="20" cy="22" r="2.5" fill="#fbbf24" />
      <path d="M12 14 Q15 8 18 10 Q21 12 24 14 Q26 18 20 22" stroke="url(#lg)" strokeWidth={1.2} fill="none" opacity={0.6} />
    </svg>
  );
}

/* ── Scroll-triggered fade-in wrapper ──────────────────── */
function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Process Accordion (MetAntz-inspired) ──────────────── */
function ProcessAccordion() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive(p => (p + 1) % PROCESS_STEPS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3 mt-10">
      {PROCESS_STEPS.map((step, i) => {
        const isActive = active === i;
        return (
          <motion.div
            key={step.label}
            onClick={() => setActive(i)}
            className="cursor-pointer rounded-2xl border overflow-hidden"
            animate={{
              borderColor: isActive ? `${step.color}50` : '#e5e7eb',
              backgroundColor: isActive ? `${step.color}08` : 'rgba(255,255,255,0)',
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  animate={{
                    backgroundColor: isActive ? `${step.color}20` : '#f3f4f6',
                    color: isActive ? step.color : '#9ca3af',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {step.icon}
                </motion.div>
                <span className={`text-base font-semibold transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              <motion.div animate={{ rotate: isActive ? 45 : 0 }} transition={{ duration: 0.2 }}>
                <svg className="w-5 h-5" style={{ color: isActive ? step.color : '#d1d5db' }}
                     fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="px-6 pb-6 pl-20">
                    <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                    {/* Progress bar */}
                    <div className="mt-4 h-[3px] rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: step.color }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 5, ease: 'linear' }}
                        key={`progress-${active}`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Browser Chrome wrapper ────────────────────────────── */
function BrowserChrome({ url, children, className = '' }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 overflow-hidden shadow-2xl shadow-gray-200/50 ${className}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
        <div className="flex gap-[6px]">
          <div className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
          <div className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
          <div className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {url}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Styles ── */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradient-text {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .shimmer-btn {
          position: relative;
          z-index: 1;
          overflow: visible;
        }
        .shimmer-btn::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          background: linear-gradient(90deg, #34d399, #06b6d4, #818cf8, #f59e0b, #34d399);
          background-size: 300% 100%;
          animation: shimmer 4s ease-in-out infinite;
          z-index: -2;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .shimmer-btn:hover::before { opacity: 1; }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: inherit;
          z-index: -1;
        }
        .gradient-text {
          background: linear-gradient(135deg, #059669, #0891b2, #6366f1, #059669);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradient-text 6s ease-in-out infinite;
        }
        .font-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      {/* ── Subtle background gradient ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[60vh]"
             style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
      </div>

      {/* ══════════════════════════════════════════════════════
          NAV
         ══════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100" style={{ position: 'fixed' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <CamoraLogo size={32} />
            <span className="font-display text-lg font-bold tracking-tight">Camora</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link key={link.label} to={link.href}
                    className="px-4 py-2 text-[15px] text-gray-500 hover:text-gray-900 transition-colors font-medium rounded-lg hover:bg-gray-50">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/capra" className="text-[15px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Dashboard</Link>
                <button onClick={logout} className="text-[15px] text-red-500 hover:text-red-600 transition-colors font-medium">Sign out</button>
              </>
            ) : (
              <Link to="/capra/login" className="text-[15px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Sign in</Link>
            )}
            <Link to="/lumora" className="shimmer-btn px-5 py-2.5 text-[15px] font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors">
              Launch App
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-500 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />}
            </svg>
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="px-6 py-4 space-y-1">
                {NAV_LINKS.map(link => (
                  <Link key={link.label} to={link.href}
                        className="block py-2.5 text-base text-gray-600 font-medium hover:text-gray-900"
                        onClick={() => setMobileMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated ? (
                  <>
                    <Link to="/capra" className="block py-2.5 text-base text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                    <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="block py-2.5 text-base text-red-500 font-medium w-full text-left">Sign out</button>
                  </>
                ) : (
                  <Link to="/capra/login" className="block py-2.5 text-base text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══════════════════════════════════════════════════════
          HERO
         ══════════════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-16 md:pt-48 md:pb-24 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto text-center">
          {/* APPA badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-200/60 mb-10">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">
                APPA — Apply · Prepare · Practice · Attend
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-display font-extrabold tracking-[-0.04em]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[84px] leading-[1.05]">
              Ace every
            </span>
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[84px] leading-[1.05] mt-1">
              <span className="gradient-text">technical</span> interview.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="mt-8 text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Real-time AI that listens to your interview, transcribes questions, and generates
            expert-level answers for system design, coding, and behavioral rounds.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/lumora"
                  className="shimmer-btn px-8 py-4 text-lg font-semibold text-white bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">
              Start Free — No Credit Card
            </Link>
            <a href="#process"
               className="px-8 py-4 text-lg font-semibold text-gray-600 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-200">
              See How It Works
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.p
            className="mt-16 text-sm text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Trusted by engineers interviewing at Google, Amazon, Meta, Apple, and Microsoft
          </motion.p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          DEMO — Primary video
         ══════════════════════════════════════════════════════ */}
      <section className="px-6 pb-20 md:pb-32" style={{ zIndex: 1 }}>
        <FadeIn className="max-w-5xl mx-auto">
          <BrowserChrome url="camora.cariara.com/lumora">
            <div className="aspect-video bg-gray-100">
              <video src="/demo-lumora.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
            </div>
          </BrowserChrome>
        </FadeIn>

        {/* Secondary demos */}
        <div className="max-w-5xl mx-auto mt-6 grid md:grid-cols-3 gap-4">
          {[
            { url: 'camora.cariara.com/capra', src: '/demo-capra.mp4', label: 'Dashboard' },
            { url: 'camora.cariara.com/capra/prepare', src: '/demo-capra-topic.mp4', label: 'Study Topics' },
            { url: 'camora.cariara.com/lumora/design', src: '/demo-design.mp4', label: 'Design Mode' },
          ].map((demo, i) => (
            <FadeIn key={demo.label} delay={0.1 * (i + 1)}>
              <div className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-gray-100 transition-shadow">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 border-b border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                    <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                    <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{demo.url}</span>
                </div>
                <div className="aspect-[4/3] bg-gray-100">
                  <video src={demo.src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PROCESS — APPA Accordion
         ══════════════════════════════════════════════════════ */}
      <section id="process" className="px-6 py-28 md:py-36" style={{ zIndex: 1, background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left: header + accordion */}
            <FadeIn>
              <span className="gradient-text text-sm font-bold tracking-[0.2em] uppercase">Our Process</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-4 leading-[1.1]">
                Your path to the offer
              </h2>
              <p className="text-lg text-gray-400 mt-5 leading-relaxed">
                A streamlined process designed for engineers who want to land their dream role. No other tool covers all four stages.
              </p>
              <ProcessAccordion />
            </FadeIn>

            {/* Right: visual flow */}
            <FadeIn delay={0.2} className="hidden lg:block">
              <div className="sticky top-32">
                <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-lg shadow-gray-100/50">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-semibold text-gray-300 tracking-wider uppercase">APPA Flow</span>
                  </div>

                  <div className="space-y-1">
                    {PROCESS_STEPS.map((step, i) => (
                      <div key={step.label} className="flex items-start gap-5">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                               style={{ background: `${step.color}10`, borderColor: `${step.color}30`, color: step.color }}>
                            {step.icon}
                          </div>
                          {i < PROCESS_STEPS.length - 1 && (
                            <div className="w-[2px] h-10 my-1" style={{
                              background: `linear-gradient(to bottom, ${step.color}40, ${PROCESS_STEPS[i + 1].color}40)`
                            }} />
                          )}
                        </div>
                        <div className="pt-2.5">
                          <span className="text-base font-semibold text-gray-900">{step.label.split(' ')[0]}</span>
                          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{step.label.split(' ').slice(1).join(' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PRODUCTS — Lumora + Capra
         ══════════════════════════════════════════════════════ */}
      <section className="px-6 py-28 md:py-36" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-20">
            <span className="gradient-text text-sm font-bold tracking-[0.2em] uppercase">Two Products</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-4">
              Prepare before. Perform during.
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Lumora */}
            <FadeIn>
              <Link to="/lumora"
                    className="group block h-full rounded-3xl border border-gray-200 p-8 md:p-10 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-50/50 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-display">Lumora</h3>
                    <span className="text-sm font-semibold text-emerald-600">Live Interview AI</span>
                  </div>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                  Real-time AI that listens, transcribes, and generates expert answers during your live interview.
                </p>
                <div className="space-y-3">
                  {['Voice transcription with speaker filtering', 'Auto-generated architecture diagrams', 'Multi-approach coding solutions', 'STAR-format behavioral responses'].map(f => (
                    <div key={f} className="flex items-center gap-3 text-[15px] text-gray-500">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-emerald-500 font-semibold group-hover:translate-x-1 transition-transform duration-200">
                  Launch Lumora →
                </div>
              </Link>
            </FadeIn>

            {/* Capra */}
            <FadeIn delay={0.12}>
              <Link to="/capra/prepare"
                    className="group block h-full rounded-3xl border border-gray-200 p-8 md:p-10 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                      <path d="M8 7h6M8 11h8M8 15h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-display">Capra</h3>
                    <span className="text-sm font-semibold text-indigo-600">Interview Preparation</span>
                  </div>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                  Study and practice with 415+ curated topics, AI explanations, and timed mock interviews.
                </p>
                <div className="space-y-3">
                  {['System design deep dives with diagrams', 'DSA problems with multiple solutions', 'Behavioral question frameworks', 'Timed mock interview simulator'].map(f => (
                    <div key={f} className="flex items-center gap-3 text-[15px] text-gray-500">
                      <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-indigo-500 font-semibold group-hover:translate-x-1 transition-transform duration-200">
                  Start Preparing →
                </div>
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS
         ══════════════════════════════════════════════════════ */}
      <section className="px-6 py-20 border-y border-gray-100" style={{ zIndex: 1 }}>
        <FadeIn className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '40+', label: 'Features', color: '#34d399' },
              { value: '415+', label: 'Study Topics', color: '#818cf8' },
              { value: '50+', label: 'Languages', color: '#06b6d4' },
              { value: '7', label: 'Categories', color: '#fbbf24' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-extrabold font-display" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES
         ══════════════════════════════════════════════════════ */}
      <section className="px-6 py-28 md:py-36" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-20">
            <span className="gradient-text text-sm font-bold tracking-[0.2em] uppercase">Why Camora</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-4">
              What no other tool can do
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-gray-200 p-7 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                       style={{ background: `${f.color}12` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: f.color }} />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-2">{f.title}</h3>
                  <p className="text-[15px] text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA
         ══════════════════════════════════════════════════════ */}
      <section className="px-6 py-28 md:py-36" style={{ zIndex: 1 }}>
        <FadeIn className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Your next interview<br />
            <span className="gradient-text">starts here.</span>
          </h2>
          <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto">
            Apply, Prepare, Practice, Attend — the complete interview pipeline, powered by AI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/lumora"
                  className="shimmer-btn px-8 py-4 text-lg font-semibold text-white bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">
              Start Free — No Credit Card
            </Link>
            <Link to="/pricing"
                  className="px-8 py-4 text-lg font-semibold text-gray-600 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-200">
              View Pricing
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 px-6 py-16" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <CamoraLogo size={28} />
              <div>
                <span className="font-display text-base font-bold">Camora</span>
                <span className="block text-xs text-gray-400 mt-0.5">Apply · Prepare · Practice · Attend</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {NAV_LINKS.map(link => (
                <Link key={link.label} to={link.href} className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">
                  {link.label}
                </Link>
              ))}
              <a href="mailto:support@cariara.com" className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">
                Support
              </a>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300">
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
            <p className="text-sm text-gray-300">
              Built for engineers, by engineers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
