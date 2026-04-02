import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

function useInView(threshold = 0.15) {
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

const NAV_LINKS = [
  { label: 'Apply', href: 'https://jobs.cariara.com', external: true },
  { label: 'Prepare', href: '/capra/prepare', external: false },
  { label: 'Practice', href: '/capra/practice', external: false },
  { label: 'Attend', href: '/lumora', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const productsRef = useInView(0.1);
  const journeyRef = useInView(0.1);
  const lumoraRef = useInView(0.1);
  const capraRef = useInView(0.1);

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 overflow-hidden">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <span className="text-[10px] font-black text-white tracking-tight">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Camora</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                   className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white transition-colors">
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} to={link.href}
                      className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white transition-colors">
                  {link.label}
                </Link>
              )
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/capra/login" className="text-[13px] text-gray-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/lumora"
                  className="px-4 py-1.5 text-[13px] font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
              Launch App
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              }
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#09090b] px-6 py-4 space-y-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} className="block py-2 text-sm text-gray-400">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="block py-2 text-sm text-gray-400"
                      onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              )
            )}
            <Link to="/capra/login" className="block py-2 text-sm text-gray-400"
                  onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative max-w-3xl mx-auto">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-emerald-500/20 bg-emerald-500/[0.06] mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-400" />
              <span className="text-[11px] font-mono text-emerald-400 tracking-wider uppercase">AI Interview Platform</span>
            </div>
          </div>

          <h1 className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="block text-4xl md:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
              Real-time AI answers
            </span>
            <span className="block text-4xl md:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] text-gray-500 mt-1">
              during your live interview.
            </span>
          </h1>

          <p className={`mt-6 text-base md:text-lg text-gray-500 leading-relaxed max-w-xl transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Camora listens to your interview, transcribes questions in real time,
            and generates expert-level answers for system design, coding, and
            behavioral rounds.
          </p>

          <div className={`mt-10 flex items-center gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Link to="/lumora"
                  className="px-6 py-2.5 text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
              Start Live Interview
            </Link>
            <Link to="/capra/prepare"
                  className="px-6 py-2.5 text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">
              Prepare First
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product Demo ─────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className={`border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Mock window chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-0.5 bg-white/[0.04] text-[11px] font-mono text-gray-500">
                  camora.cariara.com/lumora
                </div>
              </div>
            </div>

            {/* Mock product UI */}
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Transcription */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Live Transcription</span>
                  </div>
                  <div className="border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                      <span className="text-gray-500">Q1</span>{' '}
                      Design a distributed cache system that supports TTL expiration and handles cache invalidation across multiple regions.
                    </p>
                  </div>
                  <div className="border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                      <span className="text-gray-500">Q2</span>{' '}
                      How would you handle consistency between the cache and the database?
                    </p>
                  </div>
                </div>

                {/* Right: AI Response */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-cyan-400" />
                    <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">AI Response</span>
                  </div>
                  <div className="border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-[11px] font-mono text-gray-500 mb-2 uppercase tracking-wider">Architecture</div>
                    <div className="space-y-1.5 text-sm text-gray-400">
                      <p className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">-</span> Write-through cache with async invalidation</p>
                      <p className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">-</span> Consistent hashing for partition assignment</p>
                      <p className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">-</span> Pub/Sub for cross-region invalidation events</p>
                      <p className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">-</span> Lazy TTL eviction with background cleanup</p>
                    </div>
                  </div>
                  <div className="border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-[11px] font-mono text-gray-500 mb-2 uppercase tracking-wider">Scale Estimates</div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-lg font-semibold text-white">100K</div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase">QPS</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">&lt;5ms</div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase">P99 Latency</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">99.99%</div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase">Uptime</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Journey ──────────────────────────────────────────── */}
      <section ref={journeyRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${journeyRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">The Interview Lifecycle</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              One platform, every stage.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
            {[
              { num: '01', label: 'Apply', desc: 'Find engineering roles that match your experience and goals.', href: 'https://jobs.cariara.com', external: true },
              { num: '02', label: 'Prepare', desc: 'Study 300+ topics across system design, DSA, behavioral, and more.', href: '/capra/prepare', external: false },
              { num: '03', label: 'Practice', desc: 'Solve problems with AI-powered explanations and mock interviews.', href: '/capra/practice', external: false },
              { num: '04', label: 'Attend', desc: 'Get real-time AI answers during your live technical interview.', href: '/lumora', external: false },
            ].map((step, i) => {
              const Card = (
                <div
                  key={step.label}
                  className={`group bg-[#09090b] p-6 md:p-8 hover:bg-white/[0.02] transition-all duration-500 ${journeyRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 100 + 200}ms` }}
                >
                  <span className="text-[11px] font-mono text-emerald-400/60">{step.num}</span>
                  <h3 className="mt-3 text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{step.label}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  <div className="mt-4 text-emerald-400/0 group-hover:text-emerald-400/80 transition-all text-sm">
                    &rarr;
                  </div>
                </div>
              );

              return step.external ? (
                <a key={step.label} href={step.href} target="_blank" rel="noopener noreferrer">{Card}</a>
              ) : (
                <Link key={step.label} to={step.href}>{Card}</Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Two Products ─────────────────────────────────────── */}
      <section ref={productsRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Two Products</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Prepare before. Perform during.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.04]">
            {/* Lumora */}
            <Link to="/lumora"
                  className={`group bg-[#09090b] p-8 md:p-10 hover:bg-white/[0.02] transition-all duration-700 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-400">L</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Lumora</span>
                  <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider">Live Interview</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Real-time AI that listens to your interview, transcribes questions,
                and streams expert answers for system design, coding, and behavioral rounds.
              </p>
              <div className="space-y-2">
                {['Voice transcription', 'System design diagrams', 'Code solutions with complexity analysis', 'Speaker verification'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-gray-400">
                    <span className="w-1 h-1 bg-emerald-400/60" />
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-6 text-sm text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Launch Lumora &rarr;
              </div>
            </Link>

            {/* Capra */}
            <Link to="/capra/prepare"
                  className={`group bg-[#09090b] p-8 md:p-10 hover:bg-white/[0.02] transition-all duration-700 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-400">C</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Capra</span>
                  <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider">Preparation</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Study and practice before your interview. 300+ curated topics with
                AI-powered explanations, mock interviews, and coding practice.
              </p>
              <div className="space-y-2">
                {['System design deep dives', 'DSA problems with solutions', 'Behavioral question prep', 'Mock interview simulator'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-gray-400">
                    <span className="w-1 h-1 bg-indigo-400/60" />
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-6 text-sm text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Start Preparing &rarr;
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Lumora Features ──────────────────────────────────── */}
      <section ref={lumoraRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${lumoraRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-emerald-400/60 uppercase tracking-wider">Lumora</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Three modes. Every interview type.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04]">
            {[
              {
                mode: 'General',
                desc: 'Behavioral, situational, and technical Q&A. Transcribes the interviewer and generates structured STAR-format responses.',
                tags: ['Voice Capture', 'Context Memory', 'Streaming'],
              },
              {
                mode: 'System Design',
                desc: 'Auto-generates architecture diagrams, scale estimates, and deep-dive analysis. Covers trade-offs and follow-up questions.',
                tags: ['Architecture', 'Scale Math', 'Tradeoffs'],
              },
              {
                mode: 'Coding',
                desc: 'Paste or speak a problem. Get multiple optimal solutions with time and space complexity analysis and edge cases.',
                tags: ['Multiple Solutions', 'Complexity', 'Edge Cases'],
              },
            ].map((f, i) => (
              <div
                key={f.mode}
                className={`bg-[#09090b] p-6 md:p-8 transition-all duration-700 ${lumoraRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100 + 200}ms` }}
              >
                <h3 className="text-base font-semibold text-white mb-2">{f.mode}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-mono text-gray-500 border border-white/[0.06] uppercase tracking-wider">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── How it Works ─────────────────────────────────────── */}
      <section ref={capraRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${capraRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">How it works</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04]">
            {[
              { num: '01', title: 'Speak or Type', desc: 'Start your mic or paste the question. Whisper transcription processes your audio locally.' },
              { num: '02', title: 'AI Generates', desc: 'Claude analyzes in real-time, streaming structured answers with diagrams and code.' },
              { num: '03', title: 'Deliver the Answer', desc: 'Review organized responses with key points, architecture, code, and follow-up prep.' },
            ].map((s, i) => (
              <div
                key={s.num}
                className={`bg-[#09090b] p-6 md:p-8 transition-all duration-700 ${capraRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100 + 200}ms` }}
              >
                <span className="text-[11px] font-mono text-emerald-400/60">{s.num}</span>
                <h3 className="mt-3 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Built for Engineers ───────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Built for engineers</span>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Interview preparation is broken.
          </h2>
          <p className="mt-4 text-sm md:text-base text-gray-500 leading-relaxed max-w-xl mx-auto">
            You spend weeks studying, then freeze when the interviewer asks something unexpected.
            Camora gives you a safety net — real-time AI that has your back during the actual interview,
            plus the preparation tools to build genuine understanding.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/lumora"
                  className="px-6 py-2.5 text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
              Start Live Interview
            </Link>
            <Link to="/capra/prepare"
                  className="px-6 py-2.5 text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">
              Browse Study Topics
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-emerald-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <span className="text-[8px] font-black text-white">C</span>
              </div>
              <span className="text-sm font-semibold text-white">Camora</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {NAV_LINKS.map((link) =>
                link.external ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                     className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">{link.label}</a>
                ) : (
                  <Link key={link.label} to={link.href}
                        className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">{link.label}</Link>
                )
              )}
              <a href="mailto:support@cariara.com" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">
                Support
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] font-mono text-gray-600">
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
            <p className="text-[12px] text-gray-600">
              Built for engineers, by engineers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
