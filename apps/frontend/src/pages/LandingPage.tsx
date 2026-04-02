import { useEffect, useState, useRef, useCallback } from 'react';
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

/* ── APPA Icons (custom SVGs) ──────────────────────────── */
const AppaIcons = {
  apply: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 12h6M9 8h6M9 16h3" />
      <path d="M16 2v4M8 2v4" />
    </svg>
  ),
  prepare: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  practice: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14.5" y1="4" x2="9.5" y2="20" />
    </svg>
  ),
  attend: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <path d="M8 22h8" />
    </svg>
  ),
  lumora: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      <path d="M16 12a4 4 0 0 1-4 4" opacity={0.5} />
    </svg>
  ),
  capra: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6M8 11h8M8 15h4" />
    </svg>
  ),
};

/* ── Camora Logo Mark (custom SVG) ────────────────────── */
function CamoraLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      {/* Outer hexagonal shape */}
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="url(#logo-grad)" opacity={0.15} />
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" stroke="url(#logo-grad)" strokeWidth={1.5} fill="none" />
      {/* Inner flowing path — APPA journey */}
      <circle cx="12" cy="14" r="2.5" fill="#34d399" />
      <circle cx="18" cy="10" r="2.5" fill="#818cf8" />
      <circle cx="24" cy="14" r="2.5" fill="#38bdf8" />
      <circle cx="20" cy="22" r="2.5" fill="#fbbf24" />
      <path d="M12 14 Q15 8 18 10 Q21 12 24 14 Q26 18 20 22" stroke="url(#logo-grad)" strokeWidth={1.2} fill="none" opacity={0.6} />
    </svg>
  );
}

/* ── APPA steps ─────────────────────────────────────────── */
const APPA = [
  { num: '01', icon: 'apply' as const, label: 'Apply', desc: 'Discover engineering roles matched to your skills, experience, and salary goals across 1 000+ companies.', href: 'https://jobs.cariara.com', external: true, color: '#34d399' },
  { num: '02', icon: 'prepare' as const, label: 'Prepare', desc: 'Study 300+ curated topics spanning system design, DSA, behavioral, databases, and cloud architecture.', href: '/capra/prepare', external: false, color: '#818cf8' },
  { num: '03', icon: 'practice' as const, label: 'Practice', desc: 'Solve problems with AI explanations, run mock interviews, and build confidence before the real thing.', href: '/capra/practice', external: false, color: '#38bdf8' },
  { num: '04', icon: 'attend' as const, label: 'Attend', desc: 'Get real-time AI answers during your live technical interview — system design, coding, and behavioral.', href: '/lumora', external: false, color: '#fbbf24' },
];

/* ── Animated Lumora Demo ──────────────────────────────────── */
const DEMO_PAIRS = [
  {
    label: 'System Design',
    question: 'Design a distributed cache that supports TTL expiration and handles cache invalidation across multiple regions.',
    bullets: [
      'Write-through cache with async invalidation',
      'Consistent hashing for partition assignment',
      'Pub/Sub for cross-region invalidation',
      'Lazy TTL eviction with background cleanup',
    ],
    scale: [
      { val: '100K', unit: 'QPS' },
      { val: '<5ms', unit: 'P99' },
      { val: '99.99%', unit: 'Uptime' },
    ],
  },
  {
    label: 'Coding',
    question: 'Find the longest substring without repeating characters. What is the optimal time complexity?',
    bullets: [
      'Sliding window with two pointers',
      'HashSet to track characters in window',
      'Expand right, shrink left on duplicate',
      'Time: O(n), Space: O(min(n, alphabet))',
    ],
    scale: [
      { val: '3', unit: 'Approaches' },
      { val: 'O(n)', unit: 'Optimal' },
      { val: 'All', unit: 'Edge Cases' },
    ],
  },
];

function LumoraDemo() {
  const [pairIdx, setPairIdx] = useState(0);
  const [typedLen, setTypedLen] = useState(0);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [showScale, setShowScale] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pair = DEMO_PAIRS[pairIdx];

  // Reset when pairIdx changes
  const resetAndType = useCallback(() => {
    setTypedLen(0);
    setVisibleBullets(0);
    setShowScale(false);
    setIsTyping(true);
  }, []);

  useEffect(() => {
    resetAndType();
  }, [pairIdx, resetAndType]);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping) return;
    if (typedLen >= pair.question.length) {
      setIsTyping(false);
      return;
    }
    const timer = setTimeout(() => {
      setTypedLen((prev) => prev + 1);
    }, 30);
    return () => clearTimeout(timer);
  }, [typedLen, isTyping, pair.question.length]);

  // Bullet fade-in after typing finishes
  useEffect(() => {
    if (isTyping) return;
    if (visibleBullets >= pair.bullets.length) return;
    const timer = setTimeout(() => {
      setVisibleBullets((prev) => prev + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [isTyping, visibleBullets, pair.bullets.length]);

  // Scale fade-in after all bullets
  useEffect(() => {
    if (visibleBullets < pair.bullets.length) return;
    const timer = setTimeout(() => {
      setShowScale(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [visibleBullets, pair.bullets.length]);

  // Cycle to next pair after scale is shown
  useEffect(() => {
    if (!showScale) return;
    cycleTimer.current = setTimeout(() => {
      setPairIdx((prev) => (prev + 1) % DEMO_PAIRS.length);
    }, 3000);
    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [showScale]);

  return (
    <div className="p-8 md:p-12" style={{ willChange: 'transform' }}>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Live Transcription */}
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-code text-sm text-emerald-400 font-semibold tracking-wide">LIVE TRANSCRIPTION</span>
          </div>
          <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)', minHeight: '140px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-code text-sm text-emerald-400 font-semibold">Q{pairIdx + 1}</span>
              <span className="text-sm text-gray-500">{pair.label}</span>
            </div>
            <p className="text-base text-gray-200 leading-relaxed">
              <span>{pair.question.slice(0, typedLen)}</span>
              {isTyping && <span className="caret-blink" />}
            </p>
          </div>
        </div>

        {/* Right: AI Response */}
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="font-code text-sm text-cyan-400 font-semibold tracking-wide">AI RESPONSE</span>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)', minHeight: '160px' }}>
              <div className="font-code text-sm text-gray-500 mb-3 font-semibold tracking-wider">ARCHITECTURE</div>
              <div className="space-y-2.5">
                {pair.bullets.map((b, i) => (
                  <p
                    key={`${pairIdx}-${i}`}
                    className="flex items-start gap-3 text-base text-gray-300"
                    style={{
                      opacity: i < visibleBullets ? 1 : 0,
                      transform: i < visibleBullets ? 'translateY(0)' : 'translateY(12px)',
                      transition: 'opacity 0.4s ease, transform 0.4s ease',
                      willChange: 'opacity, transform',
                    }}
                  >
                    <span className="text-emerald-400 mt-0.5 text-lg leading-none">&#8250;</span> {b}
                  </p>
                ))}
              </div>
            </div>
            <div
              className="rounded-xl border border-white/[0.08] p-5"
              style={{
                background: 'rgba(255,255,255,0.02)',
                opacity: showScale ? 1 : 0,
                transform: showScale ? 'scale(1)' : 'scale(0.92)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                willChange: 'opacity, transform',
              }}
            >
              <div className="font-code text-sm text-gray-500 mb-4 font-semibold tracking-wider">SCALE ESTIMATES</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {pair.scale.map((s) => (
                  <div key={s.unit}>
                    <div className="text-2xl font-bold text-white">{s.val}</div>
                    <div className="font-code text-sm text-gray-500 mt-1">{s.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Prep Showcase (animated stats + mock cards) ──────────── */
const PREP_STATS = [
  { target: 300, suffix: '+', label: 'Study Topics', color: '#34d399' },
  { target: 50, suffix: '+', label: 'System Design Problems', color: '#818cf8' },
  { target: 200, suffix: '+', label: 'DSA Problems', color: '#06b6d4' },
  { target: 100, suffix: '+', label: 'Behavioral Questions', color: '#fbbf24' },
];

function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    setCount(0);
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span>{count}{suffix}</span>;
}

function PrepShowcase({ inView }: { inView: boolean }) {
  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {PREP_STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="text-center"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
              transitionDelay: `${i * 100 + 200}ms`,
            }}
          >
            <div className="text-4xl md:text-5xl font-bold font-display" style={{ color: stat.color }}>
              <AnimatedCounter target={stat.target} suffix={stat.suffix} inView={inView} />
            </div>
            <div className="mt-2 text-sm md:text-base text-gray-400 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Capra Sidebar Mockup + Topic Cards */}
      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        {/* Left: Sidebar mockup (like the real Capra sidebar) */}
        <div
          className="card-base rounded-2xl p-5"
          style={{
            borderColor: 'rgba(16,185,129,0.15)',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
            transitionDelay: '400ms',
          }}
        >
          <div className="font-code text-xs text-gray-500 font-semibold tracking-wider uppercase mb-4">Prepare</div>
          <div className="space-y-1">
            {[
              { name: 'Dashboard', icon: '◫', active: false },
              { name: 'DSA and Algorithms', icon: '⟨/⟩', active: false },
              { name: 'System Design', icon: '⬡', active: true },
              { name: 'Microservices', icon: '⊞', active: false },
              { name: 'Database Internals', icon: '⊟', active: false },
              { name: 'SQL for Interviews', icon: '⊡', active: false },
              { name: 'Low-Level Design', icon: '⊠', active: false },
              { name: 'Behavioral', icon: '◉', active: false },
            ].map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-base w-5 text-center opacity-60">{item.icon}</span>
                {item.name}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Topic cards grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { name: 'URL Shortener', category: 'System Design', difficulty: 'Medium', topics: 8, color: '#06b6d4' },
            { name: 'Rate Limiter', category: 'System Design', difficulty: 'Medium', topics: 6, color: '#06b6d4' },
            { name: 'Two Sum', category: 'DSA', difficulty: 'Easy', topics: 3, color: '#818cf8' },
            { name: 'LRU Cache', category: 'DSA', difficulty: 'Hard', topics: 5, color: '#818cf8' },
            { name: 'API Gateway Pattern', category: 'Microservices', difficulty: 'Medium', topics: 7, color: '#34d399' },
            { name: 'ACID vs BASE', category: 'Database', difficulty: 'Medium', topics: 4, color: '#fbbf24' },
          ].map((item, i) => (
            <div
              key={item.name}
              className="card-base rounded-xl p-5 group hover:scale-[1.02] transition-all"
              style={{
                borderColor: `${item.color}20`,
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease, border-color 0.3s ease',
                transitionDelay: `${i * 80 + 500}ms`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-code font-semibold" style={{ color: item.color, background: `${item.color}15` }}>
                  {item.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-code font-semibold ${
                  item.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-400/10' :
                  item.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10' :
                  'text-amber-400 bg-amber-400/10'
                }`}>
                  {item.difficulty}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">{item.name}</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{item.topics} subtopics</span>
                <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: inView ? `${30 + i * 12}%` : '0%', background: item.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </>
  );
}

/* ════════════════════════════════════════════════════════════
   LANDING PAGE — The APPA Journey
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const demoRef = useInView(0.08);
  const journeyRef = useInView(0.08);
  const productsRef = useInView(0.08);
  const prepRef = useInView(0.08);
  const featuresRef = useInView(0.08);
  const howRef = useInView(0.08);
  const ctaRef = useInView(0.08);

  useEffect(() => { setMounted(true); window.scrollTo(0, 0); }, []);

  return (
    <div className="landing-page min-h-screen text-white overflow-hidden" style={{ background: '#0a0b14' }}>
      {/* ── Styles ──────────────────────────────────────── */}
      <style>{`
        .landing-page {
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .font-display {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .font-code {
          font-family: 'IBM Plex Mono', monospace;
        }

        @keyframes hero-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(52,211,153,0.2); }
          50% { border-color: rgba(56,189,248,0.35); }
        }
        @keyframes ping-dot {
          0% { transform: scale(1); opacity: 0.75; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes blinkCaret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .caret-blink::after {
          content: '|';
          animation: blinkCaret 0.7s step-end infinite;
          color: #34d399;
          font-weight: 300;
          margin-left: 1px;
        }

        .animate-hero-gradient {
          background-size: 200% 200%;
          animation: hero-gradient 6s ease-in-out infinite;
        }
        .animate-border-glow {
          animation: border-glow 4s ease-in-out infinite;
        }

        .glow-btn {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.4), 0 0 80px rgba(16, 185, 129, 0.15);
          transition: all 0.3s ease;
        }
        .glow-btn:hover {
          box-shadow: 0 0 40px rgba(16, 185, 129, 0.55), 0 0 100px rgba(16, 185, 129, 0.25);
          transform: translateY(-2px);
        }

        /* Noise texture overlay */
        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
        }

        /* Card hover effects */
        .card-base {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(4px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-base:hover {
          border-color: rgba(255,255,255,0.15);
          transform: scale(1.01);
        }

        /* Fade-up animation utility */
        .fade-up {
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .fade-up.hidden {
          opacity: 0;
          transform: translateY(24px);
        }
      `}</style>

      {/* ── NOISE TEXTURE OVERLAY (entire page) ────────── */}
      <div className="fixed inset-0 pointer-events-none noise-overlay" style={{ zIndex: 1, opacity: 0.5 }} />

      {/* ── APPA TIMELINE (left side, desktop only) ─────── */}
      <div className="hidden lg:block fixed left-[10%] top-0 bottom-0 pointer-events-none" style={{ zIndex: 2 }}>
        <div className="absolute inset-0 w-[2px]" style={{
          background: 'linear-gradient(to bottom, #34d399 0%, #818cf8 33%, #38bdf8 66%, #fbbf24 100%)',
          opacity: 0.25,
        }} />
        {/* Timeline dots for each section */}
        <div className="absolute w-2 h-2 rounded-full -left-[3px]" style={{ top: '15%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
        <div className="absolute w-2 h-2 rounded-full -left-[3px]" style={{ top: '38%', background: '#818cf8', boxShadow: '0 0 8px rgba(129,140,248,0.5)' }} />
        <div className="absolute w-2 h-2 rounded-full -left-[3px]" style={{ top: '62%', background: '#38bdf8', boxShadow: '0 0 8px rgba(56,189,248,0.5)' }} />
        <div className="absolute w-2 h-2 rounded-full -left-[3px]" style={{ top: '85%', background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.5)' }} />
      </div>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06]" style={{ background: 'rgba(10,11,20,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 h-16">
          <Link to="/" className="flex items-center gap-2">
            <CamoraLogo size={34} />
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
            <Link to="/lumora" className="glow-btn px-5 py-2.5 text-[15px] font-semibold text-white bg-emerald-500 rounded-xl">
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

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/[0.06] px-6 py-5 space-y-2" style={{ background: 'rgba(10,11,20,0.95)' }}>
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                   className="block py-2.5 text-base text-gray-300 font-medium">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="block py-2.5 text-base text-gray-300 font-medium"
                      onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              )
            )}
            {isAuthenticated ? (
              <Link to="/capra" className="block py-2.5 text-base text-gray-300 font-medium"
                    onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            ) : (
              <Link to="/capra/login" className="block py-2.5 text-base text-gray-300 font-medium"
                    onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            )}
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════
          SECTION 1 — HERO
         ═══════════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-24 md:pt-48 md:pb-32 px-6 lg:px-8" style={{ zIndex: 2 }}>
        {/* Faint emerald radial gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(52,211,153,0.08) 0%, transparent 70%)',
        }} />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* APPA Badge */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] mb-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400" style={{ animation: 'ping-dot 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="font-code text-sm text-emerald-400 tracking-wide font-semibold">
                APPA — Apply. Prepare. Practice. Attend.
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className={`font-display font-extrabold tracking-[-0.04em] transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="block text-6xl md:text-7xl lg:text-[84px] leading-[1.05] text-white">
              Ace every
            </span>
            <span className="block text-6xl md:text-7xl lg:text-[84px] leading-[1.05] mt-1">
              <span className="animate-hero-gradient bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #38bdf8, #818cf8, #34d399)' }}>
                technical
              </span>
              <span className="text-white"> interview.</span>
            </span>
          </h1>

          {/* Subtext */}
          <p className={`mt-8 text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Real-time AI that listens to your interview, transcribes questions, and generates
            expert-level answers for system design, coding, and behavioral rounds.
          </p>

          {/* CTAs */}
          <div className={`mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link to="/lumora" className="glow-btn px-8 py-4 text-lg font-semibold text-white bg-emerald-500 rounded-xl">
              Start Free — No Credit Card
            </Link>
            <a href="#appa" className="px-8 py-4 text-lg font-semibold text-white border border-white/20 rounded-xl hover:border-white/40 transition-all">
              See How It Works
            </a>
          </div>

          {/* Trust line */}
          <p className={`mt-10 text-sm text-gray-500 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Trusted by engineers interviewing at Google, Amazon, Meta, Apple, and Microsoft
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 2 — PRODUCT DEMO (Browser Mockup)
         ═══════════════════════════════════════════════════ */}
      <section ref={demoRef.ref} className="px-6 lg:px-8 pb-28" style={{ zIndex: 2 }}>
        <div className="max-w-6xl mx-auto">
          <div className={`rounded-2xl animate-border-glow border overflow-hidden transition-all duration-1000 ${demoRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
               style={{
                 background: 'linear-gradient(180deg, rgba(52,211,153,0.04) 0%, rgba(10,11,20,0.95) 100%)',
                 boxShadow: '0 0 100px rgba(16,185,129,0.08)',
               }}>
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

            {/* Animated product demo */}
            <LumoraDemo />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 3 — APPA JOURNEY
         ═══════════════════════════════════════════════════ */}
      <section id="appa" ref={journeyRef.ref} className="relative px-6 lg:px-8 py-24 md:py-32" style={{ zIndex: 2 }}>
        {/* Faint indigo radial gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(129,140,248,0.07) 0%, transparent 70%)',
        }} />

        <div className="relative max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${journeyRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-indigo-400 tracking-wider font-semibold">THE APPA FRAMEWORK</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-4">
              <span style={{ color: '#34d399' }}>Apply.</span>{' '}
              <span style={{ color: '#818cf8' }}>Prepare.</span>{' '}
              <span style={{ color: '#38bdf8' }}>Practice.</span>{' '}
              <span style={{ color: '#fbbf24' }}>Attend.</span>
            </h2>
            <p className="mt-5 text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
              The complete interview lifecycle in one platform. No other tool covers all four stages.
            </p>
          </div>

          {/* Horizontal connecting line (desktop) */}
          <div className="hidden lg:block relative mb-8">
            <div className="absolute top-1/2 left-[8%] right-[8%] h-[2px] -translate-y-1/2"
                 style={{ background: 'linear-gradient(90deg, #34d399, #818cf8, #38bdf8, #fbbf24)' }} />
          </div>

          {/* APPA cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {APPA.map((step, i) => {
              const card = (
                <div
                  className={`group relative card-base rounded-2xl p-8 md:p-10 transition-all duration-700 ${journeyRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    transitionDelay: `${i * 120 + 200}ms`,
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                       style={{ boxShadow: `0 4px 30px rgba(0,0,0,0.3), 0 0 40px ${step.color}10` }} />

                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border border-white/[0.08]"
                         style={{ background: `${step.color}1a` }}>
                      {AppaIcons[step.icon](step.color)}
                    </div>
                    <div className="font-code text-sm text-gray-500 mb-1 font-semibold">{step.num}</div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 font-display">{step.label}</h3>
                    <p className="text-base md:text-lg text-gray-300 leading-relaxed">{step.desc}</p>
                    <div className="mt-5 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: step.color }}>
                      Explore &rarr;
                    </div>
                  </div>
                </div>
              );

              return step.external ? (
                <a key={step.label} href={step.href} target="_blank" rel="noopener noreferrer">{card}</a>
              ) : (
                <Link key={step.label} to={step.href}>{card}</Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 4 — TWO PRODUCTS (Lumora + Capra)
         ═══════════════════════════════════════════════════ */}
      <section ref={productsRef.ref} className="relative px-6 lg:px-8 py-24 md:py-32" style={{ zIndex: 2 }}>
        {/* Faint cyan radial gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(56,189,248,0.06) 0%, transparent 70%)',
        }} />

        <div className="relative max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-cyan-400 tracking-wider font-semibold">TWO PRODUCTS, ONE PLATFORM</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mt-4">
              Prepare before. Perform during.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Lumora */}
            <Link to="/lumora"
                  className={`group relative rounded-2xl border border-emerald-500/20 p-8 md:p-10 transition-all duration-700 hover:border-emerald-500/40 hover:scale-[1.01] ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    transitionDelay: '200ms',
                    background: 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(10,11,20,1) 100%)',
                    backdropFilter: 'blur(4px)',
                  }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  {AppaIcons.lumora('#34d399')}
                </div>
                <div>
                  <span className="text-xl md:text-2xl font-bold text-white font-display">Lumora</span>
                  <span className="block font-code text-sm text-emerald-400 font-semibold">LIVE INTERVIEW AI</span>
                </div>
              </div>
              <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
                Real-time AI that listens to your interview, transcribes questions,
                and streams expert answers for system design, coding, and behavioral rounds.
              </p>
              <div className="space-y-3">
                {['Voice transcription with speaker filtering', 'Auto-generated system design diagrams', 'Multi-approach coding solutions', 'Behavioral STAR-format responses'].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-base text-gray-300">
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
                  className={`group relative rounded-2xl border border-indigo-500/20 p-8 md:p-10 transition-all duration-700 hover:border-indigo-500/40 hover:scale-[1.01] ${productsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    transitionDelay: '350ms',
                    background: 'linear-gradient(135deg, rgba(129,140,248,0.06) 0%, rgba(10,11,20,1) 100%)',
                    backdropFilter: 'blur(4px)',
                  }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  {AppaIcons.capra('#818cf8')}
                </div>
                <div>
                  <span className="text-xl md:text-2xl font-bold text-white font-display">Capra</span>
                  <span className="block font-code text-sm text-indigo-400 font-semibold">INTERVIEW PREPARATION</span>
                </div>
              </div>
              <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
                Study and practice before your interview. 300+ curated topics with
                AI-powered explanations, mock interviews, and coding practice.
              </p>
              <div className="space-y-3">
                {['System design deep dives with diagrams', 'DSA problems with multiple solutions', 'Behavioral question frameworks', 'Timed mock interview simulator'].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-base text-gray-300">
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

      {/* ═══════════════════════════════════════════════════
          SECTION 4B — PREPARATION AT SCALE
         ═══════════════════════════════════════════════════ */}
      <section ref={prepRef.ref} className="relative px-6 lg:px-8 py-24 md:py-32" style={{ zIndex: 2 }}>
        {/* Faint emerald radial gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(52,211,153,0.06) 0%, transparent 70%)',
        }} />

        <div className="relative max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${prepRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-emerald-400 tracking-wider font-semibold">PREPARATION AT SCALE</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mt-4">
              Everything you need to prepare.
            </h2>
            <p className="mt-5 text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
              Comprehensive study material and practice problems covering every angle of the technical interview.
            </p>
          </div>

          <PrepShowcase inView={prepRef.inView} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 5 — FEATURES (Three Interview Modes)
         ═══════════════════════════════════════════════════ */}
      <section ref={featuresRef.ref} className="relative px-6 lg:px-8 py-24 md:py-32" style={{ zIndex: 2 }}>
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-cyan-400 tracking-wider font-semibold">THREE INTERVIEW MODES</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mt-4">
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
                borderClass: 'border-emerald-500/15',
                icon: (c: string) => (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M8 10h.01M12 10h.01M16 10h.01" />
                  </svg>
                ),
              },
              {
                mode: 'System Design',
                desc: 'Auto-generated architecture diagrams, scale estimates, and deep-dive analysis with trade-off comparisons.',
                tags: ['Architecture', 'Diagrams', 'Scale Math', 'Tradeoffs'],
                color: '#38bdf8',
                borderClass: 'border-cyan-500/15',
                icon: (c: string) => (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                    <path d="M7 8h2v5H7zM11 7h2v6h-2zM15 9h2v4h-2z" />
                  </svg>
                ),
              },
              {
                mode: 'Coding',
                desc: 'Paste or speak a problem. Get multiple optimal solutions with time and space complexity analysis and edge cases.',
                tags: ['Multi-Solution', 'Complexity', 'Edge Cases', 'All Languages'],
                color: '#818cf8',
                borderClass: 'border-indigo-500/15',
                icon: (c: string) => (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                    <line x1="14" y1="4" x2="10" y2="20" />
                  </svg>
                ),
              },
            ].map((f, i) => (
              <div
                key={f.mode}
                className={`card-base rounded-2xl ${f.borderClass} p-8 md:p-10 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 120 + 200}ms` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-white/[0.08]" style={{ background: `${f.color}15` }}>
                  {f.icon(f.color)}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 font-display">{f.mode}</h3>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-6">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-md font-code text-sm font-medium border border-white/[0.08]"
                          style={{ color: f.color, background: `${f.color}14` }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 6 — HOW IT WORKS
         ═══════════════════════════════════════════════════ */}
      <section ref={howRef.ref} className="relative px-6 lg:px-8 py-24 md:py-32" style={{ zIndex: 2 }}>
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${howRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-code text-sm text-gray-400 tracking-wider font-semibold">HOW IT WORKS</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mt-4">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Speak or Type', desc: 'Start your mic or paste the interview question. AI-powered transcription captures everything in real time.', color: '#34d399' },
              { num: '02', title: 'AI Generates', desc: 'Claude analyzes instantly, streaming structured answers with architecture diagrams, code solutions, and key talking points.', color: '#38bdf8' },
              { num: '03', title: 'Deliver Confidently', desc: 'Review organized responses with clear sections. Key points, architecture, code, complexity analysis, and follow-up prep.', color: '#818cf8' },
            ].map((s, i) => (
              <div
                key={s.num}
                className={`card-base rounded-2xl p-8 md:p-10 transition-all duration-700 ${howRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 120 + 200}ms` }}
              >
                <div className="font-display text-6xl font-black mb-5" style={{ color: `${s.color}20` }}>{s.num}</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 font-display">{s.title}</h3>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 7 — FINAL CTA
         ═══════════════════════════════════════════════════ */}
      <section ref={ctaRef.ref} className="relative px-6 lg:px-8 py-28 md:py-36" style={{ zIndex: 2 }}>
        {/* Faint amber radial gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(251,191,36,0.08) 0%, transparent 70%)',
        }} />

        <div className={`relative max-w-3xl mx-auto text-center transition-all duration-700 ${ctaRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="font-code text-sm text-amber-400 tracking-wider font-semibold">START YOUR APPA JOURNEY</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white mt-5">
            Your next interview<br />
            <span className="animate-hero-gradient bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #38bdf8, #818cf8, #fbbf24, #34d399)' }}>
              starts here.
            </span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-gray-300 max-w-xl mx-auto">
            Apply, Prepare, Practice, Attend — the complete interview pipeline, powered by AI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link to="/lumora" className="glow-btn px-8 py-4 text-lg font-semibold text-white bg-emerald-500 rounded-xl">
              Start Free — No Credit Card
            </Link>
            <Link to="/pricing" className="px-8 py-4 text-lg font-semibold text-white border border-white/20 rounded-xl hover:border-white/40 transition-all">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 8 — FOOTER
         ═══════════════════════════════════════════════════ */}
      <footer className="relative border-t border-white/[0.06] px-6 lg:px-8 py-12" style={{ zIndex: 2 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <CamoraLogo size={30} />
              <div>
                <span className="text-base font-bold text-white font-display">Camora</span>
                <span className="block font-code text-sm text-gray-500">Apply. Prepare. Practice. Attend.</span>
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
            <p className="font-code text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
            <p className="text-sm text-gray-500">
              Built for engineers, by engineers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
