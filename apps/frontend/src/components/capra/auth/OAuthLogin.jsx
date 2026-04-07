import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../shared/Icons.jsx';
import CamoraLogo from '../../shared/CamoraLogo';
import SiteNav from '../../shared/SiteNav';
import { useAuth } from '../../../contexts/AuthContext';

function useInView(threshold = 0.2) {
  const ref = useRef(null);
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

export default function OAuthLogin() {
  const { user, isLoading: loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen text-gray-900 overflow-hidden landing-root" style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #ede9fe 50%, #e0e7ff 100%)', paddingTop: '56px', paddingBottom: '52px' }}>
      <SiteNav />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-12 pb-12 md:pt-16 md:pb-16">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 border border-emerald-200 bg-emerald-50 rounded-full mb-5 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs landing-mono text-emerald-700 tracking-wide">AI-Powered Interview Prep</span>
        </div>

        <h1 className={`landing-display font-extrabold leading-tight tracking-tight max-w-4xl transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="text-3xl md:text-4xl lg:text-5xl text-gray-900">Your Winning Edge in </span>
          <span className="text-3xl md:text-4xl lg:text-5xl bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Every Interview</span>
        </h1>

        <p className={`mt-4 text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed landing-body transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          AI-powered coding solutions, system design, and live interview assistance. 20+ languages. Invisible to screen share.
        </p>

        <div className={`mt-7 flex flex-col sm:flex-row items-center gap-3 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {user ? (
            <>
              <a href="/capra/prepare" className="px-8 py-3 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors shadow-sm landing-body flex items-center gap-2">
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </a>
              <a href="/pricing" className="px-8 py-3 text-gray-600 font-semibold text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors landing-body">
                View Plans
              </a>
            </>
          ) : (
            <>
              <a href="/login" className="px-8 py-3 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors shadow-sm landing-body flex items-center gap-2">
                Start Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </a>
              <a href="/pricing" className="px-8 py-3 text-gray-600 font-semibold text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors landing-body">
                View Plans
              </a>
            </>
          )}
        </div>
        {/* Auth errors are handled via SSO redirect */}
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

      {/* Journey Highlighter */}
      <section className="px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-6 px-2">
            {[
              { label: 'Apply', href: '/jobs', icon: 'briefcase', desc: 'Find your role', bg: '#ecfdf5', bgEnd: '#d1fae5', border: '#6ee7b7', borderEnd: '#34d399', badge: '#059669', iconColor: '#059669', glowColor: '16,185,129', slideFrom: 'left' },
              { label: 'Prepare', href: '/capra/prepare', icon: 'book', desc: 'Study & review', bg: '#ecfeff', bgEnd: '#cffafe', border: '#67e8f9', borderEnd: '#22d3ee', badge: '#0891b2', iconColor: '#0891b2', glowColor: '8,145,178', slideFrom: 'bottom' },
              { label: 'Practice', href: '/capra/practice', icon: 'code', desc: 'Solve problems', bg: '#f5f3ff', bgEnd: '#ede9fe', border: '#c4b5fd', borderEnd: '#a78bfa', badge: '#7c3aed', iconColor: '#7c3aed', glowColor: '124,58,237', slideFrom: 'bottom' },
              { label: 'Attend', href: '/lumora', icon: 'microphone', desc: 'Ace the interview', bg: '#fffbeb', bgEnd: '#fef3c7', border: '#fcd34d', borderEnd: '#fbbf24', badge: '#d97706', iconColor: '#d97706', glowColor: '217,119,6', slideFrom: 'right' },
            ].map((item, i) => (
              <a key={item.label} href={item.href} className={`journey-card journey-card-${i} group relative flex flex-col items-center gap-3 p-6 rounded-2xl text-center`} style={{ '--card-bg': item.bg, '--card-bg-end': item.bgEnd, '--card-border': item.border, '--card-border-end': item.borderEnd, '--card-glow': item.glowColor, animationDelay: `${i * 0.2}s` }}>
                <div className="journey-border-glow absolute inset-0 rounded-2xl pointer-events-none" style={{ animationDelay: `${i * 0.5}s` }} />
                <div className="journey-badge absolute -top-5 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-base font-black landing-mono text-white z-10" style={{ background: `linear-gradient(135deg, ${item.border}, ${item.badge})`, boxShadow: `0 4px 14px rgba(${item.glowColor},0.4), inset 0 1px 2px rgba(255,255,255,0.3)`, animationDelay: `${i * 0.2 + 0.6}s` }}>{i + 1}</div>
                <div className="journey-icon w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-115 group-hover:rotate-6" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: `0 4px 16px rgba(${item.glowColor},0.2)`, animationDelay: `${i * 0.25}s` }}>
                  <Icon name={item.icon} size={26} style={{ color: item.iconColor }} />
                </div>
                <span className="text-base font-bold text-gray-900 landing-display">{item.label}</span>
                <span className="text-xs text-gray-500 landing-body">{item.desc}</span>
                <div className="journey-shimmer absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" style={{ animationDelay: `${i * 0.8}s` }} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 md:px-12 py-10 md:py-12 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Capabilities</span>
            <h2 className="landing-display font-bold text-2xl md:text-3xl mt-2 tracking-tight text-gray-900">
              Everything You Need. <span className="text-gray-400">Nothing You Don't.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-2.5">
            {[
              { icon: 'microphone', title: 'Live Interview', desc: 'Real-time AI answers during interviews. Completely invisible to screen share.', tags: ['Voice Capture', 'Stealth Mode', 'Streaming'], color: 'emerald', href: '/lumora' },
              { icon: 'code', title: 'Coding Engine', desc: '20+ languages with explanations, auto-fix, and complexity analysis.', tags: ['Multi-Language', 'Auto-Fix', 'Complexity'], color: 'cyan', href: '/capra/prepare/coding' },
              { icon: 'systemDesign', title: 'System Design', desc: 'Architecture diagrams, scalability analysis, and tech justifications.', tags: ['Diagrams', 'Scale Math', 'Tradeoffs'], color: 'violet', href: '/capra/design' },
            ].map((f) => (
              <a key={f.title} href={f.href} className="block p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                <div className={`w-9 h-9 border border-${f.color}-200 bg-${f.color}-50 rounded flex items-center justify-center mb-3`}>
                  <Icon name={f.icon} size={18} className={`text-${f.color}-500`} />
                </div>
                <h3 className="landing-display font-semibold text-base mb-1 text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-snug landing-body">{f.desc}</p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {f.tags.map(t => (
                    <span key={t} className="text-[10px] landing-mono px-2 py-1 border border-gray-200 text-gray-400 rounded">{t}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-2.5 mt-2.5">
            {[
              { icon: 'briefcase', title: 'Company Prep', desc: 'Tailored pitch from your JD + resume.', color: 'amber', href: '/capra/prep' },
              { icon: 'resume', title: 'Resume Builder', desc: 'ATS-optimized with PDF and DOCX export.', color: 'cyan', href: '/capra/prepare/coding' },
              { icon: 'eyeOff', title: 'Stealth Mode', desc: 'Hidden from screen share, dock, and task manager.', color: 'rose', href: '/download' },
            ].map((f) => (
              <a key={f.title} href={f.href} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                <div className={`w-9 h-9 border border-${f.color}-200 bg-${f.color}-50 rounded flex items-center justify-center flex-shrink-0`}>
                  <Icon name={f.icon} size={16} className={`text-${f.color}-500`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 landing-display">{f.title}</div>
                  <div className="text-sm text-gray-500 landing-body">{f.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-10 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Workflow</span>
            <h2 className="landing-display font-bold text-2xl md:text-3xl mt-2 tracking-tight text-gray-900">
              Three Steps. <span className="text-gray-400">Zero Friction.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { step: '01', title: 'Drop Your Problem In', desc: 'Text, screenshot, or LeetCode URL. Paste, snap, or speak it.', color: 'text-emerald-200' },
              { step: '02', title: 'AI Generates', desc: 'Code, explanations, diagrams, and edge cases in seconds.', color: 'text-cyan-200' },
              { step: '03', title: 'Practice & Refine', desc: 'Step-by-step walkthrough with follow-up Q&A. Build confidence.', color: 'text-violet-200' },
            ].map((item, i) => (
              <div key={i} className="group p-4 border border-gray-200 rounded-lg bg-white text-center">
                <span className={`landing-mono text-3xl font-black ${item.color} group-hover:text-gray-300 transition-colors`}>
                  {item.step}
                </span>
                <h3 className="landing-display font-semibold text-sm mt-2 mb-1 text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed landing-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-10 md:py-14 text-center">
        <h2 className="landing-display font-bold text-2xl md:text-3xl tracking-tight max-w-2xl mx-auto text-gray-900">
          Your Next Interview{' '}
          <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Starts Here</span>
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto landing-body">
          Stop memorizing. Start understanding. Practice with AI that thinks like a senior engineer.
        </p>
        <a href="/capra/practice" className="inline-block mt-4 px-8 py-3 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors shadow-sm landing-body">
          Start Practicing
        </a>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 md:px-12 py-3" style={{ background: '#111827' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2">
            <CamoraLogo size={24} />
            <span className="landing-display font-bold text-sm text-white" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
          </a>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label: 'Apply', href: '/jobs' },
              { label: 'Prepare', href: '/capra/prepare' },
              { label: 'Practice', href: '/capra/practice' },
              { label: 'Attend', href: '/lumora' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Support', href: 'mailto:support@cariara.com' },
            ].map((link) => (
              <a key={link.label} href={link.href} className="text-xs text-gray-400 hover:text-emerald-400 transition-colors landing-body font-medium">{link.label}</a>
            ))}
          </div>
          <p className="text-xs text-gray-500 landing-mono">
            &copy; {new Date().getFullYear()} Ascend by Cariara
          </p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        .landing-root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-body { font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-mono { font-family: 'IBM Plex Mono', monospace; }
        html { scroll-behavior: smooth; }
        .journey-card { background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg-end) 50%, var(--card-bg) 100%); background-size: 200% 200%; border: 2px solid var(--card-border); box-shadow: 0 4px 24px rgba(var(--card-glow), 0.12); animation: journeySlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both, journeyGradientShift 6s ease-in-out infinite, journeyFloat 4s ease-in-out 1.5s infinite; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease, border-color 0.4s ease; }
        .journey-card-0 { animation: journeySlideLt 0.7s cubic-bezier(0.16,1,0.3,1) both, journeyGradientShift 6s ease-in-out infinite, journeyFloat 4s ease-in-out 1.2s infinite; }
        .journey-card-1 { animation: journeySlideUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both, journeyGradientShift 7s ease-in-out 0.5s infinite, journeyFloat 4.5s ease-in-out 1.4s infinite; }
        .journey-card-2 { animation: journeySlideUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both, journeyGradientShift 5.5s ease-in-out 1s infinite, journeyFloat 5s ease-in-out 1.6s infinite; }
        .journey-card-3 { animation: journeySlideRt 0.7s cubic-bezier(0.16,1,0.3,1) 0.45s both, journeyGradientShift 6.5s ease-in-out 0.3s infinite, journeyFloat 4.2s ease-in-out 1.8s infinite; }
        @keyframes journeySlideLt { from { opacity: 0; transform: translateX(-60px) scale(0.9); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes journeySlideUp { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes journeySlideRt { from { opacity: 0; transform: translateX(60px) scale(0.9); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes journeyGradientShift { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }
        @keyframes journeyFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .journey-card:hover { animation: journeyGradientShift 3s ease-in-out infinite !important; transform: translateY(-10px) scale(1.04) !important; border-color: var(--card-border-end) !important; box-shadow: 0 12px 40px rgba(var(--card-glow), 0.25), 0 0 20px rgba(var(--card-glow), 0.15) !important; }
        .journey-border-glow { background: conic-gradient(from 0deg, var(--card-border), var(--card-border-end), var(--card-border), var(--card-border-end), var(--card-border)); opacity: 0; animation: borderFadeIn 1s ease-out 0.8s both, borderRotate 4s linear infinite; mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask-composite: exclude; -webkit-mask-composite: xor; padding: 2px; }
        @keyframes borderFadeIn { from { opacity: 0; } to { opacity: 0.5; } }
        @keyframes borderRotate { to { transform: rotate(360deg); } }
        .journey-card:hover .journey-border-glow { opacity: 0.8; }
        .journey-badge { animation: badgePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both, badgePulse 2.5s ease-in-out 1.5s infinite; border: 2px solid rgba(255,255,255,0.5); }
        @keyframes badgePop { from { opacity: 0; transform: scale(0) rotate(-30deg); } 60% { transform: scale(1.2) rotate(5deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes badgePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .journey-icon { animation: iconEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both, iconGlow 3s ease-in-out 1s infinite; }
        @keyframes iconEntrance { from { opacity: 0; transform: scale(0.5) rotate(-10deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes iconGlow { 0%, 100% { box-shadow: 0 4px 16px rgba(var(--card-glow), 0.15); } 50% { box-shadow: 0 6px 28px rgba(var(--card-glow), 0.3); } }
        .journey-card:hover .journey-icon { animation: none; box-shadow: 0 8px 32px rgba(var(--card-glow), 0.35); }
        .journey-shimmer::after { content: ''; position: absolute; top: 0; left: -100%; width: 70%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%); animation: shimmerSweep 4s ease-in-out 1s infinite; }
        @keyframes shimmerSweep { 0% { left: -100%; opacity: 0; } 20% { opacity: 1; } 60% { left: 150%; opacity: 1; } 80% { opacity: 0; } 100% { left: 150%; opacity: 0; } }
      `}</style>
    </div>
  );
}
