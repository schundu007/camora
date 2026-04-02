import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ── Scroll-reveal hook ─────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Nav data ───────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Apply', href: 'https://jobs.cariara.com', external: true },
  { label: 'Prepare', href: '/capra/prepare', external: false },
  { label: 'Practice', href: '/capra/practice', external: false },
  { label: 'Attend', href: '/lumora', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
];

/* ── APPA steps ─────────────────────────────────────────── */
const APPA = [
  { num: '01', letter: 'A', label: 'Apply', desc: 'Discover engineering roles matched to your skills, experience, and salary goals across 1 000+ companies.', href: 'https://jobs.cariara.com', external: true, color: '#34d399' },
  { num: '02', letter: 'P', label: 'Prepare', desc: 'Study 300+ curated topics spanning system design, DSA, behavioral, databases, and cloud architecture.', href: '/capra/prepare', external: false, color: '#818cf8' },
  { num: '03', letter: 'P', label: 'Practice', desc: 'Solve problems with AI explanations, run mock interviews, and build confidence before the real thing.', href: '/capra/practice', external: false, color: '#38bdf8' },
  { num: '04', letter: 'A', label: 'Attend', desc: 'Get real-time AI answers during your live technical interview — system design, coding, and behavioral.', href: '/lumora', external: false, color: '#fbbf24' },
];

/* ════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const journeyRef = useInView(0.08);
  const productsRef = useInView(0.08);
  const featuresRef = useInView(0.08);
  const howRef = useInView(0.08);

  useEffect(() => { setMounted(true); window.scrollTo(0, 0); }, []);

  return (
    <div className="landing-page min-h-screen text-white overflow-hidden" style={{ background: '#06070a' }}>
      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .landing-page { font-family: 'DM Sans', system-ui, sans-serif; }
        .font-display { font-family: 'Instrument Sans', 'DM Sans', system-ui, sans-serif; }
        .font-code { font-family: 'JetBrains Mono', monospace; }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes hero-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-glow { animation: glow-pulse 4s ease-in-out infinite; }
        .animate-hero-gradient {
          background-size: 200% 200%;
          animation: hero-gradient 6s ease-in-out infinite;
        }
        .glow-btn {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.1);
          transition: all 0.3s ease;
        }
        .glow-btn:hover {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), 0 0 80px rgba(16, 185, 129, 0.2);
          transform: translateY(-2px);
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(6,7,10,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <span className="text-xs font-black text-white">C</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Camora</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                   className="px-4 py-2 text-[15px] text-gray-400 hover:text-white transition-colors font-medium">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href}
                      className="px-4 py-2 text-[15px] text-gray-400 hover:text-white transition-colors font-medium">{link.label}</Link>
              )
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/capra" className="text-[15px] text-gray-400 hover:text-white transition-colors font-medium">Dashboard</Link>
            ) : (
              <Link to="/capra/login" className="text-[15px] text-gray-400 hover:text-white transition-colors font-medium">Sign in</Link>
            )}
            <Link to="/lumora" className="glow-btn px-5 py-2.5 text-[15px] font-semibold text-white bg-emerald-500 rounded-lg">
              Launch App
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/[0.06] px-6 py-5 space-y-2" style={{ background: 'rgba(6,7,10,0.95)' }}>
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} className="block py-2.5 text-base text-gray-300 font-medium">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="block py-2.5 text-base text-gray-300 font-medium"
                      onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              )
            )}
            {isAuthenticated ? (
              <Link to="/capra" className="block py-2.5 text-base text-gray-300 font-medium"
                    onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            ) : (
              <Link to="/capra/login" className="block py-2.5 text-base text-gray-400 font-medium"
                    onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            )}
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 md:pt-48 md:pb-32 px-6 lg:px-8">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full animate-glow pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* APPA Badge */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] mb-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="font-code text-sm text-emerald-300 tracking-wide font-medium">
                APPA — Apply. Prepare. Practice. Attend.
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className={`font-display font-bold tracking-[-0.03em] transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="block text-5xl md:text-7xl lg:text-[82px] leading-[1.05] text-white">
              Ace every{' '}
              <span className="animate-hero-gradient bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4, #818cf8, #34d399)' }}>
                technical
              </span>
            </span>
            <span className="block text-5xl md:text-7xl lg:text-[82px] leading-[1.05] text-white mt-1">
              interview.
            </span>
          </h1>

          {/* Subheading */}
          <p className={`mt-8 text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Real-time AI that listens to your interview, transcribes questions, and generates
            expert-level answers for system design, coding, and behavioral rounds.
          </p>

          {/* CTAs */}
          <div className={`mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link to="/lumora" className="glow-btn px-8 py-4 text-base font-semibold text-white bg-emerald-500 rounded-lg">
              Start Free — No Credit Card
            </Link>
            <a href="#appa" className="px-8 py-4 text-base font-semibold text-gray-300 border border-white/15 rounded-lg hover:border-white/30 hover:text-white transition-all">
              See How It Works
            </a>
          </div>

          {/* Trust line */}
          <p className={`mt-10 text-sm text-gray-600 transition-all duration-700 delay-400 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Trusted by engineers interviewing at Google, Amazon, Meta, Apple, and Microsoft
          </p>
        </div>
      </section>

      {/* ── PRODUCT DEMO ─────────────────────────────────── */}
      <section className="px-6 lg:px-8 pb-28">
        <div className="max-w-6xl mx-auto">
          <div className={`rounded-2xl border border-white/[0.08] overflow-hidden transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
               style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.03) 0%, rgba(6,7,10,1) 100%)' }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-white/[0.04] font-code text-sm text-gray-500">
                  camora.cariara.com/lumora
                </div>
              </div>
            </div>

            {/* Product mockup */}
            <div className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Transcription */}
                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-code text-sm text-emerald-400 font-medium tracking-wide">LIVE TRANSCRIPTION</span>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-code text-xs text-emerald-400 font-semibold">Q1</span>
                        <span className="text-xs text-gray-600">System Design</span>
                      </div>
                      <p className="text-base text-gray-200 leading-relaxed">
                        Design a distributed cache system that supports TTL expiration and handles cache invalidation across multiple regions.
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-code text-xs text-cyan-400 font-semibold">Q2</span>
                        <span className="text-xs text-gray-600">Follow-up</span>
                      </div>
                      <p className="text-base text-gray-200 leading-relaxed">
                        How would you handle consistency between the cache and the database?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: AI Response */}
                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="font-code text-sm text-cyan-400 font-medium tracking-wide">AI RESPONSE</span>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="font-code text-xs text-gray-500 mb-3 font-semibold tracking-wider">ARCHITECTURE</div>
                      <div className="space-y-2.5">
                        {[
                          'Write-through cache with async invalidation',
                          'Consistent hashing for partition assignment',
                          'Pub/Sub for cross-region invalidation events',
                          'Lazy TTL eviction with background cleanup',
                        ].map((p) => (
                          <p key={p} className="flex items-start gap-3 text-base text-gray-300">
                            <span className="text-emerald-400 mt-1 text-lg leading-none">&#8250;</span> {p}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="font-code text-xs text-gray-500 mb-4 font-semibold tracking-wider">SCALE ESTIMATES</div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                          { val: '100K', unit: 'QPS' },
                          { val: '<5ms', unit: 'P99 Latency' },
                          { val: '99.99%', unit: 'Uptime SLA' },
                        ].map((s) => (
                          <div key={s.unit}>
                            <div className="text-2xl font-bold text-white">{s.val}</div>
                            <div className="font-code text-xs text-gray-500 mt-1">{s.unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APPA JOURNEY ────────────────────────────────── */}
      <section id="appa" ref={journeyRef.ref} className="px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${journeyRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-emerald-400 tracking-wider font-semibold">THE APPA FRAMEWORK</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-4">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>Apply. Prepare. Practice. Attend.</span>
            </h2>
            <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">
              The complete interview lifecycle in one platform. No other tool covers all four stages.
            </p>
          </div>

          {/* Connecting line */}
          <div className="hidden lg:block relative mb-8">
            <div className="absolute top-1/2 left-[8%] right-[8%] h-[2px] -translate-y-1/2"
                 style={{ background: 'linear-gradient(90deg, #34d399, #818cf8, #38bdf8, #fbbf24)' }} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {APPA.map((step, i) => {
              const inner = (
                <div
                  key={step.label}
                  className={`group relative rounded-2xl border border-white/[0.08] p-7 transition-all duration-700 hover:border-white/20 ${journeyRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    transitionDelay: `${i * 120 + 200}ms`,
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                       style={{ background: `radial-gradient(ellipse at center, ${step.color}08 0%, transparent 70%)` }} />

                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border border-white/[0.08]"
                         style={{ background: `${step.color}10` }}>
                      <span className="font-display text-2xl font-bold" style={{ color: step.color }}>{step.letter}</span>
                    </div>
                    <div className="font-code text-xs text-gray-500 mb-1 font-medium">{step.num}</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-display">{step.label}</h3>
                    <p className="text-base text-gray-400 leading-relaxed">{step.desc}</p>
                    <div className="mt-5 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: step.color }}>
                      Explore &rarr;
                    </div>
                  </div>
                </div>
              );

              return step.external ? (
                <a key={step.label} href={step.href} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <Link key={step.label} to={step.href}>{inner}</Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TWO PRODUCTS ─────────────────────────────────── */}
      <section ref={productsRef.ref} className="px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-gray-500 tracking-wider font-semibold">TWO PRODUCTS, ONE PLATFORM</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white mt-4">
              Prepare before. Perform during.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Lumora */}
            <Link to="/lumora"
                  className={`group relative rounded-2xl border border-emerald-500/20 p-8 md:p-10 transition-all duration-700 hover:border-emerald-500/40 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: '200ms', background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,7,10,1) 100%)' }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-400">L</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-white font-display">Lumora</span>
                  <span className="block font-code text-xs text-emerald-400 font-medium">LIVE INTERVIEW AI</span>
                </div>
              </div>
              <p className="text-base text-gray-400 leading-relaxed mb-8">
                Real-time AI that listens to your interview, transcribes questions,
                and streams expert answers for system design, coding, and behavioral rounds.
              </p>
              <div className="space-y-3">
                {['Voice transcription with speaker filtering', 'Auto-generated system design diagrams', 'Multi-approach coding solutions', 'Behavioral STAR-format responses'].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-[15px] text-gray-300">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-8 text-base text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Launch Lumora &rarr;
              </div>
            </Link>

            {/* Capra */}
            <Link to="/capra/prepare"
                  className={`group relative rounded-2xl border border-indigo-500/20 p-8 md:p-10 transition-all duration-700 hover:border-indigo-500/40 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: '350ms', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(6,7,10,1) 100%)' }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-indigo-400">C</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-white font-display">Capra</span>
                  <span className="block font-code text-xs text-indigo-400 font-medium">INTERVIEW PREPARATION</span>
                </div>
              </div>
              <p className="text-base text-gray-400 leading-relaxed mb-8">
                Study and practice before your interview. 300+ curated topics with
                AI-powered explanations, mock interviews, and coding practice.
              </p>
              <div className="space-y-3">
                {['System design deep dives with diagrams', 'DSA problems with multiple solutions', 'Behavioral question frameworks', 'Timed mock interview simulator'].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-[15px] text-gray-300">
                    <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-8 text-base text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Start Preparing &rarr;
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES (3 modes) ───────────────────────────── */}
      <section ref={featuresRef.ref} className="px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-emerald-400 tracking-wider font-semibold">THREE INTERVIEW MODES</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white mt-4">
              System Design. Coding. Behavioral.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                mode: 'General',
                desc: 'Behavioral, situational, and technical Q&A with real-time voice transcription. Generates structured STAR-format responses.',
                tags: ['Voice Capture', 'Context Memory', 'STAR Format', 'Streaming'],
                color: '#34d399',
                border: 'border-emerald-500/15',
              },
              {
                mode: 'System Design',
                desc: 'Auto-generated architecture diagrams, scale estimates, and deep-dive analysis with trade-off comparisons.',
                tags: ['Architecture', 'Diagrams', 'Scale Math', 'Tradeoffs'],
                color: '#06b6d4',
                border: 'border-cyan-500/15',
              },
              {
                mode: 'Coding',
                desc: 'Paste or speak a problem. Get multiple optimal solutions with time and space complexity analysis and edge cases.',
                tags: ['Multi-Solution', 'Complexity', 'Edge Cases', 'All Languages'],
                color: '#818cf8',
                border: 'border-indigo-500/15',
              },
            ].map((f, i) => (
              <div
                key={f.mode}
                className={`rounded-2xl border ${f.border} p-8 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 120 + 200}ms`, background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: `${f.color}15` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: f.color }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-display">{f.mode}</h3>
                <p className="text-base text-gray-400 leading-relaxed mb-6">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-md font-code text-xs font-medium border border-white/[0.08]"
                          style={{ color: f.color, background: `${f.color}08` }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section ref={howRef.ref} className="px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${howRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-gray-500 tracking-wider font-semibold">HOW IT WORKS</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white mt-4">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Speak or Type', desc: 'Start your mic or paste the interview question. AI-powered transcription captures everything in real time.', color: '#34d399' },
              { num: '02', title: 'AI Generates', desc: 'Claude analyzes instantly, streaming structured answers with architecture diagrams, code solutions, and key talking points.', color: '#06b6d4' },
              { num: '03', title: 'Deliver Confidently', desc: 'Review organized responses with clear sections. Key points, architecture, code, complexity analysis, and follow-up prep.', color: '#818cf8' },
            ].map((s, i) => (
              <div
                key={s.num}
                className={`rounded-2xl border border-white/[0.08] p-8 transition-all duration-700 ${howRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 120 + 200}ms`, background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="font-display text-5xl font-black mb-5" style={{ color: `${s.color}25` }}>{s.num}</div>
                <h3 className="text-xl font-bold text-white mb-3 font-display">{s.title}</h3>
                <p className="text-base text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="px-6 lg:px-8 py-28 md:py-36 relative">
        {/* Background glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="font-code text-sm text-emerald-400 tracking-wider font-semibold">START YOUR APPA JOURNEY</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mt-5">
            Your next interview<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>starts here.</span>
          </h2>
          <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto">
            Apply, Prepare, Practice, Attend — the complete interview pipeline, powered by AI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link to="/lumora" className="glow-btn px-8 py-4 text-base font-semibold text-white bg-emerald-500 rounded-lg">
              Start Free — No Credit Card
            </Link>
            <Link to="/pricing" className="px-8 py-4 text-base font-semibold text-gray-300 border border-white/15 rounded-lg hover:border-white/30 hover:text-white transition-all">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <span className="text-[10px] font-black text-white">C</span>
              </div>
              <div>
                <span className="text-base font-bold text-white font-display">Camora</span>
                <span className="block font-code text-xs text-gray-500">Apply. Prepare. Practice. Attend.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {NAV_LINKS.map((link) =>
                link.external ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                     className="text-[15px] text-gray-500 hover:text-white transition-colors font-medium">{link.label}</a>
                ) : (
                  <Link key={link.label} to={link.href}
                        className="text-[15px] text-gray-500 hover:text-white transition-colors font-medium">{link.label}</Link>
                )
              )}
              <a href="mailto:support@cariara.com" className="text-[15px] text-gray-500 hover:text-white transition-colors font-medium">
                Support
              </a>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-code text-sm text-gray-600">
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
            <p className="text-sm text-gray-600">
              Built for engineers, by engineers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
