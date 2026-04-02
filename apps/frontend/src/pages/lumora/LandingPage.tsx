import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
  { label: 'Apply', href: '/jobs', external: false },
  { label: 'Prepare', href: '/capra/prepare', external: false },
  { label: 'Practice', href: '/capra/practice', external: false },
  { label: 'Attend', href: '/lumora', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
];

export function LandingPage() {
  const { isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const featuresRef = useInView(0.1);
  const stepsRef = useInView(0.1);
  const statsRef = useInView(0.1);

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 overflow-hidden">

      {/* -- Nav -------------------------------------------------- */}
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
            {isAuthenticated ? (
              <>
                <Link to="/capra" className="text-[13px] text-gray-400 hover:text-white transition-colors">Dashboard</Link>
                <button onClick={logout} className="text-[13px] text-red-400 hover:text-red-300 transition-colors font-medium">Sign out</button>
              </>
            ) : (
              <Link to="/capra/login" className="text-[13px] text-gray-400 hover:text-white transition-colors">
                Sign in
              </Link>
            )}
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
            {isAuthenticated ? (
              <>
                <Link to="/capra" className="block py-2 text-sm text-gray-400"
                      onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }}
                        className="block py-2 text-sm text-red-400 font-medium">Sign out</button>
              </>
            ) : (
              <Link to="/capra/login" className="block py-2 text-sm text-gray-400"
                    onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            )}
          </div>
        )}
      </nav>

      {/* -- Hero ------------------------------------------------- */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6">
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative max-w-3xl mx-auto">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-emerald-500/20 bg-emerald-500/[0.06] mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-400" />
              <span className="text-[11px] font-mono text-emerald-400 tracking-wider uppercase">AI-Powered Interview Coaching</span>
            </div>
          </div>

          <h1 className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="block text-4xl md:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
              Ace every technical
            </span>
            <span className="block text-4xl md:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] text-gray-500 mt-1">
              interview.
            </span>
          </h1>

          <p className={`mt-6 text-base md:text-lg text-gray-500 leading-relaxed max-w-xl transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Real-time AI that listens, transcribes, and generates expert-level
            answers for system design, coding, and behavioral interviews.
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

      {/* -- Divider ---------------------------------------------- */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* -- Journey ---------------------------------------------- */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">The Interview Lifecycle</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              One platform, every stage.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
            {[
              { num: '01', label: 'Apply', desc: 'Find engineering roles that match your experience and goals.', href: '/jobs', external: false },
              { num: '02', label: 'Prepare', desc: 'Study 300+ topics across system design, DSA, behavioral, and more.', href: '/capra/prepare', external: false },
              { num: '03', label: 'Practice', desc: 'Solve problems with AI-powered explanations and mock interviews.', href: '/capra/practice', external: false },
              { num: '04', label: 'Attend', desc: 'Get real-time AI answers during your live technical interview.', href: '/lumora', external: false },
            ].map((step, i) => {
              const cardContent = (
                <div
                  className={`group bg-[#09090b] p-6 md:p-8 hover:bg-white/[0.02] transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 100 + 400}ms` }}
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
                <a key={step.label} href={step.href} target="_blank" rel="noopener noreferrer">{cardContent}</a>
              ) : (
                <Link key={step.label} to={step.href}>{cardContent}</Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* -- Divider ---------------------------------------------- */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* -- Features --------------------------------------------- */}
      <section ref={featuresRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-emerald-400/60 uppercase tracking-wider">Three Modes</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              One platform. Every interview type.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04]">
            {[
              {
                title: 'General',
                desc: 'Behavioral, situational, and technical Q&A with real-time voice transcription and structured STAR-format responses.',
                tags: ['Voice Capture', 'Context Memory', 'Streaming'],
              },
              {
                title: 'System Design',
                desc: 'Auto-generated architecture diagrams, scale estimates, and deep analysis. Covers trade-offs and follow-up questions.',
                tags: ['Architecture', 'Scale Math', 'Tradeoffs'],
              },
              {
                title: 'Coding',
                desc: 'Paste or speak a problem. Get 3 optimal solutions with time and space complexity analysis and edge cases.',
                tags: ['3 Approaches', 'Complexity', 'Edge Cases'],
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`bg-[#09090b] p-6 md:p-8 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100 + 200}ms` }}
              >
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
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

      {/* -- Divider ---------------------------------------------- */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* -- How it Works ----------------------------------------- */}
      <section ref={stepsRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className={`mb-12 transition-all duration-700 ${stepsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Workflow</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04]">
            {[
              { num: '01', title: 'Speak or Type', desc: 'Start your mic or type your question. Local Whisper transcription -- nothing leaves your machine.' },
              { num: '02', title: 'AI Generates', desc: 'Claude AI analyzes in real-time, streams structured answers with diagrams and code in under 2 seconds.' },
              { num: '03', title: 'Nail the Answer', desc: 'Review organized responses: key points, architecture, code, follow-up prep. Build confidence.' },
            ].map((s, i) => (
              <div
                key={s.num}
                className={`bg-[#09090b] p-6 md:p-8 transition-all duration-700 ${stepsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
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

      {/* -- Divider ---------------------------------------------- */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* -- Stats ------------------------------------------------ */}
      <section ref={statsRef.ref} className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-px bg-white/[0.04]">
            {[
              { value: '50,000+', label: 'Questions Practiced' },
              { value: '94%', label: 'User Satisfaction' },
              { value: '<200ms', label: 'Response Latency' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-[#09090b] p-8 text-center transition-all duration-700 ${statsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100 + 200}ms` }}
              >
                <div className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                  {stat.value}
                </div>
                <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Divider ---------------------------------------------- */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* -- CTA -------------------------------------------------- */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Get started</span>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Your next interview starts here.
          </h2>
          <p className="mt-4 text-sm md:text-base text-gray-500 leading-relaxed max-w-xl mx-auto">
            Real-time AI answers during your live interview. System design, coding, behavioral.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/lumora"
                  className="px-6 py-2.5 text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
              Launch Lumora
            </Link>
            <Link to="/pricing"
                  className="px-6 py-2.5 text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* -- Footer ----------------------------------------------- */}
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
              &copy; {new Date().getFullYear()} Lumora by Cariara
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

export default LandingPage;
