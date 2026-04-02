import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

function useCountUp(end: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// Pre-computed particle positions to avoid hydration mismatch
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  w: (((i * 7 + 3) % 6) + 2),
  left: ((i * 37 + 13) % 100),
  top: ((i * 53 + 7) % 100),
  delay: ((i * 3 + 1) % 5),
  dur: ((i * 7 + 5) % 10) + 10,
  color: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'][i % 4],
}));

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 animate-float"
          style={{
            width: `${p.w}px`,
            height: `${p.w}px`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

function GlowOrb({ color, size, top, left, delay }: { color: string; size: number; top: string; left: string; delay: string }) {
  return (
    <div
      className="absolute rounded-full blur-3xl animate-pulse-slow pointer-events-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top,
        left,
        background: color,
        opacity: 0.08,
        animationDelay: delay,
      }}
    />
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const statsSection = useInView(0.3);
  const featuresSection = useInView(0.2);
  const stepsSection = useInView(0.2);
  const productsSection = useInView(0.2);

  useEffect(() => { setMounted(true); window.scrollTo(0, 0); }, []);

  const interviews = useCountUp(50000, 2200, statsSection.inView);
  const successRate = useCountUp(94, 1800, statsSection.inView);
  const latency = useCountUp(200, 1600, statsSection.inView);

  return (
    <div className="min-h-screen text-gray-900 overflow-hidden" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 30%, #ecfeff 60%, #f5f3ff 85%, #ffffff 100%)' }}>

      {/* Floating glow orbs */}
      <GlowOrb color="#10b981" size={400} top="-100px" left="-100px" delay="0s" />
      <GlowOrb color="#06b6d4" size={350} top="200px" left="70%" delay="2s" />
      <GlowOrb color="#8b5cf6" size={300} top="600px" left="20%" delay="4s" />
      <GlowOrb color="#10b981" size={250} top="900px" left="80%" delay="1s" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="font-display font-extrabold text-sm text-white">C</span>
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight text-white">Camora</span>
            <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 -mt-0.5">Interview AI</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="https://jobs.cariara.com" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Apply</a>
          <Link to="/capra/prepare" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Prepare</Link>
          <Link to="/capra/practice" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Practice</Link>
          <Link to="/lumora" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Attend</Link>
          <Link to="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Pricing</Link>
          <Link to="/capra/login" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Sign In</Link>
          <Link
            to="/lumora"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
          >
            Launch App
          </Link>
        </div>
        <Link to="/lumora" className="md:hidden px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-emerald-500/25">
          Launch
        </Link>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-16" />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-16 md:pt-24 md:pb-20">
        <FloatingParticles />

        <div
          className={`inline-flex items-center gap-2 px-5 py-2 border border-emerald-200/50 bg-white/70 backdrop-blur-sm rounded-full mb-6 shadow-sm transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-mono text-emerald-700 tracking-wide">AI-Powered Interview Platform</span>
        </div>

        <h1
          className={`font-display font-extrabold leading-[1.1] tracking-tight max-w-4xl transition-all duration-700 delay-100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="text-4xl md:text-5xl lg:text-6xl text-gray-900">Ace Every </span>
          <span className="text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">Technical </span>
          <span className="text-4xl md:text-5xl lg:text-6xl text-gray-900">Interview</span>
        </h1>

        <p
          className={`mt-5 text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Prepare with Capra. Attend with Lumora. One platform for your entire interview
          journey — from study to real-time AI coaching.
        </p>

        <div
          className={`mt-8 flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link
            to="/capra"
            className="px-8 py-3.5 bg-white border-2 border-gray-200 text-gray-800 font-semibold text-sm rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center gap-2"
          >
            Start Preparing
          </Link>
          <Link
            to="/lumora"
            className="group px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex items-center gap-2"
          >
            Launch Live Interview AI
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </div>
      </section>

      {/* Animated divider */}
      <div className="relative h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-30 animate-pulse" />
      </div>

      {/* Journey Highlighter */}
      <section className="px-6 md:px-12 py-10 md:py-14 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          {/* Connecting line behind cards */}
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-0.5 -translate-y-1/2 bg-gradient-to-r from-emerald-300 via-indigo-300 via-violet-300 to-amber-300 opacity-40 rounded-full" />
            <div className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-0.5 -translate-y-1/2 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 to-indigo-400 rounded-full animate-journey-slide" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {[
              { num: 1, label: 'Apply', desc: 'Find your role', href: 'https://jobs.cariara.com', external: true, icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', borderColor: '#6ee7b7', bgFrom: '#ecfdf5', bgTo: '#d1fae5', numBg: 'linear-gradient(135deg, #059669, #10b981)', iconBg: '#d1fae5', iconColor: '#059669', glowColor: 'rgba(16, 185, 129, 0.15)', shimmer: 'from-emerald-200/0 via-emerald-200/40 to-emerald-200/0' },
              { num: 2, label: 'Prepare', desc: 'Study & review', href: '/capra/prepare', external: false, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', borderColor: '#a5b4fc', bgFrom: '#eef2ff', bgTo: '#e0e7ff', numBg: 'linear-gradient(135deg, #4f46e5, #6366f1)', iconBg: '#e0e7ff', iconColor: '#4f46e5', glowColor: 'rgba(79, 70, 229, 0.15)', shimmer: 'from-indigo-200/0 via-indigo-200/40 to-indigo-200/0' },
              { num: 3, label: 'Practice', desc: 'Solve problems', href: '/capra/practice', external: false, icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', borderColor: '#c4b5fd', bgFrom: '#f5f3ff', bgTo: '#ede9fe', numBg: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', iconBg: '#ede9fe', iconColor: '#7c3aed', glowColor: 'rgba(124, 58, 237, 0.15)', shimmer: 'from-violet-200/0 via-violet-200/40 to-violet-200/0' },
              { num: 4, label: 'Attend', desc: 'Ace the interview', href: '/lumora', external: false, icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', borderColor: '#fcd34d', bgFrom: '#fffbeb', bgTo: '#fef3c7', numBg: 'linear-gradient(135deg, #d97706, #f59e0b)', iconBg: '#fef3c7', iconColor: '#d97706', glowColor: 'rgba(217, 119, 6, 0.15)', shimmer: 'from-amber-200/0 via-amber-200/40 to-amber-200/0' },
            ].map((item) => {
              const cardContent = (
                <>
                  {/* Shimmer sweep effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.shimmer} -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out`} />

                  {/* Corner glow */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" style={{ background: item.glowColor }} />

                  {/* Icon with float animation */}
                  <div
                    className="relative w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-md animate-icon-float"
                    style={{ background: item.iconBg, animationDelay: `${item.num * 0.5}s` }}
                  >
                    <svg className="w-7 h-7 transition-transform duration-500 group-hover:rotate-6" fill="none" stroke={item.iconColor} viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>

                  <span className="relative font-display font-bold text-base text-gray-900">{item.label}</span>
                  <span className="relative text-xs text-gray-500">{item.desc}</span>

                  {/* Bottom gradient line */}
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 scale-x-0 group-hover:scale-x-100" style={{ background: item.numBg }} />
                </>
              );

              const sharedClassName = `group relative flex flex-col items-center gap-3 p-6 md:p-8 rounded-2xl border-2 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;
              const sharedStyle = {
                borderColor: item.borderColor,
                background: `linear-gradient(135deg, ${item.bgFrom} 0%, ${item.bgTo} 100%)`,
                transitionDelay: `${(item.num - 1) * 150 + 400}ms`,
                boxShadow: `0 4px 20px ${item.glowColor}`,
              };

              return item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={sharedClassName}
                  style={sharedStyle}
                >
                  {cardContent}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.href}
                  className={sharedClassName}
                  style={sharedStyle}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two Products */}
      <section ref={productsSection.ref} className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className={`inline-block font-mono text-xs text-emerald-600 tracking-widest uppercase px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 transition-all duration-700 ${productsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Two Products</span>
            <h2 className={`font-display font-bold text-2xl md:text-3xl mt-4 tracking-tight text-gray-900 transition-all duration-700 delay-100 ${productsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Prepare & Perform. <span className="text-gray-400">One Platform.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link
              to="/capra"
              className={`group p-8 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 hover:border-indigo-300 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 ${productsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white font-extrabold text-lg">C</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Capra</h3>
              <p className="mt-2 text-gray-600 leading-relaxed">Before your interview -- study DSA, system design, behavioral topics. 300+ problems with AI explanations.</p>
              <span className="inline-block mt-4 text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Start Preparing &rarr;</span>
            </Link>
            <Link
              to="/lumora"
              className={`group p-8 rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-300 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 ${productsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '350ms' }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white font-extrabold text-lg">L</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Lumora</h3>
              <p className="mt-2 text-gray-600 leading-relaxed">During your interview -- real-time AI answers for system design, coding, and behavioral questions.</p>
              <span className="inline-block mt-4 text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Launch Interview AI &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={featuresSection.ref} className="relative px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className={`inline-block font-mono text-xs text-emerald-600 tracking-widest uppercase px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 transition-all duration-700 ${featuresSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Three Modes</span>
            <h2 className={`font-display font-bold text-2xl md:text-3xl mt-4 tracking-tight text-gray-900 transition-all duration-700 delay-100 ${featuresSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              One Platform. <span className="text-gray-400">Every Interview Type.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'General', desc: 'Behavioral, situational, and technical Q&A with real-time voice transcription.', tags: ['Voice Capture', 'Context Memory', 'Streaming'], icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', color: 'emerald', delay: 0 },
              { title: 'System Design', desc: 'Auto-generated architecture diagrams, scale estimates, and deep analysis.', tags: ['Architecture', 'Scale Math', 'Tradeoffs'], icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'cyan', delay: 100 },
              { title: 'Coding', desc: 'Paste or speak a problem. Get 3 optimal solutions with complexity analysis.', tags: ['3 Approaches', 'Complexity', 'Edge Cases'], icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color: 'violet', delay: 200 },
            ].map((f) => {
              const colors: Record<string, { border: string; bg: string; icon: string; tag: string; glow: string }> = {
                emerald: { border: 'border-emerald-200/50', bg: 'bg-emerald-50', icon: 'text-emerald-500', tag: 'border-emerald-200 text-emerald-600', glow: 'group-hover:shadow-emerald-500/10' },
                cyan: { border: 'border-cyan-200/50', bg: 'bg-cyan-50', icon: 'text-cyan-500', tag: 'border-cyan-200 text-cyan-600', glow: 'group-hover:shadow-cyan-500/10' },
                violet: { border: 'border-violet-200/50', bg: 'bg-violet-50', icon: 'text-violet-500', tag: 'border-violet-200 text-violet-600', glow: 'group-hover:shadow-violet-500/10' },
              };
              const c = colors[f.color];
              return (
                <div
                  key={f.title}
                  className={`group p-5 border ${c.border} rounded-2xl bg-white/70 backdrop-blur-sm hover:bg-white hover:shadow-xl ${c.glow} transition-all duration-500 hover:-translate-y-1 ${featuresSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${f.delay + 200}ms` }}
                >
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <svg className={`w-5 h-5 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="font-display font-semibold text-base mb-1.5 text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{f.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tags.map(t => (
                      <span key={t} className={`text-[10px] font-mono px-2 py-0.5 border ${c.tag} rounded-full`}>{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" ref={stepsSection.ref} className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className={`inline-block font-mono text-xs text-emerald-600 tracking-widest uppercase px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 transition-all duration-700 ${stepsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Workflow</span>
            <h2 className={`font-display font-bold text-2xl md:text-3xl mt-4 tracking-tight text-gray-900 transition-all duration-700 delay-100 ${stepsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Three Steps. <span className="text-gray-400">Zero Friction.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { num: '01', title: 'Speak or Type', desc: 'Start your mic or type your question. Local Whisper transcription — nothing leaves your machine.', color: 'emerald', delay: 0 },
              { num: '02', title: 'AI Generates', desc: 'Claude AI analyzes in real-time, streams structured answers with diagrams and code in under 2 seconds.', color: 'cyan', delay: 150 },
              { num: '03', title: 'Nail the Answer', desc: 'Review organized responses: key points, architecture, code, follow-up prep. Build confidence.', color: 'violet', delay: 300 },
            ].map((s) => (
              <div
                key={s.num}
                className={`group relative p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-gray-200/50 text-center hover:bg-white hover:shadow-xl transition-all duration-500 hover:-translate-y-1 ${stepsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${s.delay + 200}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${
                  s.color === 'emerald' ? 'from-emerald-100 to-teal-100' :
                  s.color === 'cyan' ? 'from-cyan-100 to-blue-100' :
                  'from-violet-100 to-purple-100'
                } mb-3`}>
                  <span className={`font-mono text-lg font-black ${
                    s.color === 'emerald' ? 'text-emerald-500' :
                    s.color === 'cyan' ? 'text-cyan-500' :
                    'text-violet-500'
                  }`}>{s.num}</span>
                </div>
                <h3 className="font-display font-semibold text-base mb-1.5 text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" ref={statsSection.ref} className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { value: `${interviews.toLocaleString()}+`, label: 'Questions Practiced', color: 'from-gray-900 to-gray-700' },
              { value: `${successRate}%`, label: 'User Satisfaction', color: 'from-emerald-600 to-teal-600' },
              { value: `<${latency}ms`, label: 'Response Latency', color: 'from-cyan-600 to-blue-600' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-gray-200/50 transition-all duration-700 ${statsSection.inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className={`font-display font-black text-3xl md:text-4xl bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <p className="mt-2 text-sm text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 md:px-12 py-12">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-gray-400 font-mono tracking-wide uppercase mb-6">Trusted by engineers interviewing at</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-gray-300 font-display font-bold text-lg md:text-xl">
            {['Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Netflix', 'Uber', 'Stripe'].map(co => (
              <span key={co} className="hover:text-gray-500 transition-colors">{co}</span>
            ))}
          </div>
          <div className="mt-8 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { quote: 'Camora helped me nail the system design round at a FAANG company.', name: 'Senior SDE', company: 'Ex-Amazon' },
              { quote: 'Real-time coding solutions saved me during a live HackerRank assessment.', name: 'Full Stack Dev', company: 'Ex-Google' },
              { quote: 'The AI gave me perfect STAR-format answers in real time. Got the offer.', name: 'Eng Manager', company: 'Ex-Meta' },
            ].map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-gray-200/50 text-left">
                <p className="text-sm text-gray-600 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-3 text-xs text-gray-400"><span className="font-semibold text-gray-600">{t.name}</span> &middot; {t.company}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop App Teaser */}
      <section className="px-6 md:px-12 py-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-8 text-center">
          <h3 className="font-display font-bold text-xl text-gray-900 mb-2">Desktop App — Coming Soon</h3>
          <p className="text-sm text-gray-500 mb-4">Invisible overlay during screen share. Completely undetectable.</p>
          <a href="mailto:support@cariara.com?subject=Camora Desktop Waitlist" className="inline-block px-6 py-2.5 bg-violet-100 border border-violet-300 text-violet-700 font-semibold text-sm rounded-xl hover:bg-violet-200 transition-colors">Join Waitlist</a>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 md:px-12 py-16 md:py-20 text-center">
        <div className="relative z-10">
          <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight max-w-2xl mx-auto text-gray-900">
            Your Next Interview{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">Starts Here</span>
          </h2>
          <p className="mt-3 text-sm md:text-base text-gray-500 max-w-lg mx-auto">
            Prepare with Capra. Ace it live with Lumora. System design, coding, behavioral — all covered.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/capra"
              className="px-8 py-3.5 bg-white border-2 border-gray-200 text-gray-800 font-semibold text-sm rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all"
            >
              Start Preparing
            </Link>
            <Link
              to="/lumora"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              Launch Lumora
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* Spacer for fixed footer */}
      <div className="h-16" />

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950 px-6 md:px-12 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center rounded-lg shadow-sm">
              <span className="font-display font-extrabold text-xs text-white">C</span>
            </div>
            <span className="font-display font-bold text-sm text-white">Camora</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <Link to="/capra" className="hover:text-white transition-colors">Capra</Link>
            <Link to="/lumora" className="hover:text-white transition-colors">Lumora</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="https://jobs.cariara.com" className="hover:text-white transition-colors">Jobs</a>
          </div>
          <p className="text-xs text-gray-500 font-mono">
            &copy; {new Date().getFullYear()} Camora
          </p>
        </div>
      </footer>
    </div>
  );
}
