import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import CamoraLogo from '../components/shared/CamoraLogo';

/* ── Nav links ─────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

/* ── APPA steps data ───────────────────────────────────── */
const APPA = [
  { num: '01', label: 'Apply', desc: 'Discover engineering roles matched to your skills, experience, and salary goals across 1 000+ companies.', href: '/jobs', color: '#34d399' },
  { num: '02', label: 'Prepare', desc: 'Study 300+ curated topics spanning system design, DSA, behavioral, databases, and cloud architecture.', href: '/capra/prepare', color: '#818cf8' },
  { num: '03', label: 'Practice', desc: 'Solve problems with AI explanations, run mock interviews, and build confidence before the real thing.', href: '/capra/practice', color: '#38bdf8' },
  { num: '04', label: 'Attend', desc: 'Get real-time AI answers during your live technical interview — system design, coding, and behavioral.', href: '/lumora', color: '#fbbf24' },
];

/* ── APPA process steps (for accordion) ────────────────── */
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

/* ── APPA Icons (custom SVGs) ──────────────────────────── */
const AppaIcons = {
  apply: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /><path d="M16 2v4M8 2v4" />
    </svg>
  ),
  prepare: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  practice: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" />
    </svg>
  ),
  attend: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /><path d="M8 22h8" />
    </svg>
  ),
  lumora: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  capra: (color: string) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><path d="M8 7h6M8 11h8M8 15h4" />
    </svg>
  ),
};

/* ── Logo Mark — now uses shared CamoraLogo from import ── */

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
                  animate={{ backgroundColor: isActive ? `${step.color}20` : '#f3f4f6', color: isActive ? step.color : '#9ca3af' }}
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
          <div className="px-4 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-400 font-code">
            {url}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Prep Showcase (animated donut + topic cards) ──────── */
function PrepShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const TOPIC_CATEGORIES = [
    { name: 'DSA & Algorithms', count: 57, color: '#34d399' },
    { name: 'System Design', count: 163, color: '#06b6d4' },
    { name: 'Microservices', count: 12, color: '#818cf8' },
    { name: 'Database Internals', count: 12, color: '#f97316' },
    { name: 'SQL for Interviews', count: 8, color: '#fbbf24' },
    { name: 'Low-Level Design', count: 106, color: '#a78bfa' },
    { name: 'Behavioral', count: 57, color: '#f472b6' },
  ];
  const TOTAL = 415;
  const RADIUS = 72;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const donutSegments = (() => {
    let accumulated = 0;
    return TOPIC_CATEGORIES.map((cat) => {
      const fraction = cat.count / TOTAL;
      const dash = fraction * CIRCUMFERENCE;
      const gap = CIRCUMFERENCE - dash;
      const offset = -(accumulated * CIRCUMFERENCE) + CIRCUMFERENCE * 0.25;
      accumulated += fraction;
      return { ...cat, dash, gap, offset };
    });
  })();

  return (
    <div ref={ref}>
      {/* Donut chart + Legend */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 mb-10"
        style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease', transitionDelay: '200ms' }}>
        <div className="relative flex-shrink-0" style={{ width: 220, height: 220 }}>
          <svg viewBox="0 0 200 200" width="220" height="220" className="w-[180px] h-[180px] md:w-[220px] md:h-[220px]">
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="18" />
            {donutSegments.map((seg, i) => (
              <circle key={seg.name} cx="100" cy="100" r={RADIUS} fill="none" stroke={seg.color} strokeWidth="18"
                strokeDasharray={`${inView ? seg.dash : 0} ${inView ? seg.gap : CIRCUMFERENCE}`}
                strokeDashoffset={seg.offset} strokeLinecap="butt"
                style={{ transition: `stroke-dasharray 1.2s ease ${i * 100 + 300}ms` }} />
            ))}
            <text x="100" y="93" textAnchor="middle" fill="#111827" fontSize="28" fontWeight="bold" fontFamily="inherit">415+</text>
            <text x="100" y="116" textAnchor="middle" fill="#9ca3af" fontSize="12" fontWeight="500" fontFamily="inherit">Total Topics</text>
          </svg>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {TOPIC_CATEGORIES.map((cat, i) => (
            <div key={cat.name} className="flex items-center gap-2.5"
              style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(12px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease', transitionDelay: `${i * 80 + 500}ms` }}>
              <span className="flex-shrink-0 w-3 h-3 rounded-full" style={{ background: cat.color }} />
              <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{cat.name}</span>
              <span className="text-sm text-gray-500 font-code font-semibold">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'URL Shortener', category: 'System Design', difficulty: 'Medium', topics: 8, color: '#06b6d4', img: '/images/categories/system-design.svg' },
          { name: 'Rate Limiter', category: 'System Design', difficulty: 'Medium', topics: 6, color: '#06b6d4', img: '/images/categories/system-design.svg' },
          { name: 'Two Sum', category: 'DSA', difficulty: 'Easy', topics: 3, color: '#818cf8', img: '/images/categories/dsa.svg' },
          { name: 'LRU Cache', category: 'DSA', difficulty: 'Hard', topics: 5, color: '#818cf8', img: '/images/categories/dsa.svg' },
          { name: 'API Gateway', category: 'Microservices', difficulty: 'Medium', topics: 7, color: '#34d399', img: '/images/categories/microservices.svg' },
          { name: 'SOLID Principles', category: 'Low-Level Design', difficulty: 'Medium', topics: 12, color: '#a78bfa', img: '/images/categories/lld.svg' },
          { name: 'ACID vs BASE', category: 'Database', difficulty: 'Medium', topics: 4, color: '#fbbf24', img: '/images/categories/database.svg' },
          { name: 'STAR Method', category: 'Behavioral', difficulty: 'Easy', topics: 8, color: '#fb923c', img: '/images/categories/behavioral.svg' },
        ].map((item, i) => (
          <div key={item.name}
            className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-gray-100/50 hover:border-gray-300 transition-all duration-300"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease, border-color 0.3s ease, box-shadow 0.3s ease',
              transitionDelay: `${i * 80 + 500}ms` }}>
            <div className="h-28 flex items-center justify-center" style={{ background: `${item.color}08` }}>
              <img src={item.img} alt={item.category} className="h-20 w-auto" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-code font-semibold" style={{ color: item.color, background: `${item.color}15` }}>{item.category}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-code font-semibold ${
                  item.difficulty === 'Easy' ? 'text-emerald-500 bg-emerald-50' :
                  item.difficulty === 'Hard' ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50'}`}>
                  {item.difficulty}
                </span>
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">{item.name}</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{item.topics} subtopics</span>
                <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: inView ? `${30 + i * 12}%` : '0%', background: item.color }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── What Sets Camora Apart — feature groups ───────────── */
const FEATURE_GROUPS = [
  {
    groupTitle: 'Live Interview AI', accent: '#34d399',
    features: [
      { title: 'Real-Time Voice Transcription', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg> },
      { title: '3-Approach Coding Solutions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></svg> },
      { title: 'Auto-Generated Architecture Diagrams', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg> },
      { title: 'STAR Format Behavioral Coaching', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
      { title: 'Emergency Blank Screen (Cmd+B)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="2" y1="3" x2="22" y2="17" /></svg> },
      { title: 'Speaker Voice Filtering', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="1" y1="1" x2="23" y2="23" /></svg> },
    ],
  },
  {
    groupTitle: 'Platform Compatibility', accent: '#06b6d4',
    features: [
      { title: 'LeetCode, HackerRank, CoderPad, CodeSignal', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg> },
      { title: 'Zoom, Google Meet, MS Teams', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.5v-1z" /><rect x="2" y="7" width="14" height="10" rx="2" /></svg> },
      { title: '50+ Programming Languages', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg> },
      { title: 'Auto-Fix and Debug', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg> },
    ],
  },
  {
    groupTitle: 'Interview Preparation', accent: '#818cf8',
    features: [
      { title: 'Job URL AI Analysis', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" /><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" /></svg> },
      { title: 'Role-Filtered Study Paths', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg> },
      { title: '415+ Study Topics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
      { title: 'Company-Specific Prep', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg> },
      { title: 'Mock Interview Simulator', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
      { title: 'AI-Powered Explanations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    ],
  },
  {
    groupTitle: 'Tools & Playground', accent: '#f59e0b',
    features: [
      { title: 'Coding Playground', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8l4 4-4 4" /><line x1="13" y1="16" x2="17" y2="16" /></svg> },
      { title: 'Design Playground', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
      { title: 'Resume-Personalized Answers', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
      { title: 'Screenshot Problem Extraction', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> },
    ],
  },
];

/* ── Competitor bar chart data ──────────────────────────── */
const COMP_BARS = [
  { name: 'Camora', count: 42, color: '#34d399', suffix: '+' },
  { name: 'LockedIn', count: 22, color: '#6b7280', suffix: '' },
  { name: 'Final Round', count: 18, color: '#6b7280', suffix: '' },
  { name: 'Sensei', count: 15, color: '#6b7280', suffix: '' },
  { name: 'Solver', count: 12, color: '#6b7280', suffix: '' },
];

/* ════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated, logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const compRef = useRef<HTMLDivElement>(null);
  const compInView = useInView(compRef, { once: true, margin: '-80px' });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen text-gray-900 overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

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
        .shimmer-btn { position: relative; z-index: 1; overflow: visible; }
        .shimmer-btn::before {
          content: ''; position: absolute; inset: -2px; border-radius: inherit;
          background: linear-gradient(90deg, #34d399, #06b6d4, #818cf8, #f59e0b, #34d399);
          background-size: 300% 100%; animation: shimmer 4s ease-in-out infinite;
          z-index: -2; opacity: 0; transition: opacity 0.3s ease;
        }
        .shimmer-btn:hover::before { opacity: 1; }
        .shimmer-btn::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: inherit; z-index: -1; }
        .gradient-text {
          background: linear-gradient(135deg, #2563eb, #7c3aed, #c026d3, #2563eb);
          background-size: 200% 200%; -webkit-background-clip: text; background-clip: text;
          color: transparent; animation: gradient-text 6s ease-in-out infinite;
        }
        .font-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .font-code { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      {/* ── Subtle background gradient ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[60vh]"
             style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
      </div>

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <CamoraLogo size={40} />
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
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
                <Link to="/capra/prepare" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  {user?.image ? (
                    <img src={user.image} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {user?.name?.[0] || '?'}
                    </div>
                  )}
                  <span className="text-sm text-gray-700 font-medium">{user?.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">Sign out</button>
              </>
            ) : (
              <Link to="/login" className="text-[15px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Sign in</Link>
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
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }} className="lg:hidden border-t border-gray-100 bg-white overflow-hidden">
              <div className="px-6 py-4 space-y-1">
                {NAV_LINKS.map(link => (
                  <Link key={link.label} to={link.href} className="block py-2.5 text-base text-gray-600 font-medium hover:text-gray-900"
                        onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
                ))}
                {isAuthenticated ? (
                  <>
                    <Link to="/capra/prepare" className="block py-2.5 text-base text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                    <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="block py-2.5 text-base text-red-500 font-medium w-full text-left">Sign out</button>
                  </>
                ) : (
                  <Link to="/login" className="block py-2.5 text-base text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-10 md:pt-32 md:pb-14 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200/60 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-700 tracking-wide">APPA — Apply · Prepare · Practice · Attend</span>
            </div>
          </motion.div>
          <motion.h1 className="font-display font-extrabold tracking-[-0.04em]"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <span className="block text-4xl sm:text-5xl md:text-6xl leading-[1.1]">Application to <span className="gradient-text">Offer.</span></span>
          </motion.h1>
          <motion.div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to="/signup" className="shimmer-btn px-6 py-3 text-base font-semibold rounded-xl text-white transition-colors" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)' }}>
              Get Started Free
            </Link>
            <a href="#process" className="px-6 py-3 text-base font-semibold text-gray-600 rounded-xl hover:bg-white/50 transition-colors border border-gray-300">
              See How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── PROCESS — Accordion (MetAntz-style) ── */}
      <section id="process" className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-stretch">
            <FadeIn>
              <span className="gradient-text text-sm font-bold tracking-[0.2em] uppercase">Our Process</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-4 leading-[1.1]">Your path to the offer</h2>
              <p className="text-lg text-gray-400 mt-5 leading-relaxed">A streamlined process designed for engineers who want to land their dream role.</p>
              <ProcessAccordion />
            </FadeIn>
            <FadeIn delay={0.2} className="hidden lg:flex">
              <div className="h-full flex flex-col">
                <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-lg shadow-gray-100/50 flex-1 flex flex-col justify-center">
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
                            <div className="w-[2px] h-10 my-1" style={{ background: `linear-gradient(to bottom, ${step.color}40, ${PROCESS_STEPS[i + 1].color}40)` }} />
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

      {/* ── DEMO — Videos ── */}
      <section className="px-6 pb-10 md:pb-16" style={{ zIndex: 1 }}>
        <FadeIn className="max-w-5xl mx-auto">
          <BrowserChrome url="camora.cariara.com/lumora">
            <div className="aspect-video bg-gray-100">
              <video src="/demo-lumora.mp4" autoPlay loop muted playsInline title="Lumora live interview demo" className="w-full h-full object-cover" />
            </div>
          </BrowserChrome>
        </FadeIn>
        <div className="max-w-5xl mx-auto mt-6 grid md:grid-cols-3 gap-4">
          {[
            { url: 'camora.cariara.com/capra', src: '/demo-capra.mp4', label: 'Dashboard' },
            { url: 'camora.cariara.com/capra/prepare', src: '/demo-capra-topic.mp4', label: 'Study Topics' },
            { url: 'camora.cariara.com/lumora/design', src: '/demo-design.mp4', label: 'Design Mode' },
          ].map((demo, i) => (
            <FadeIn key={demo.url} delay={0.1 * (i + 1)}>
              <div className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-gray-100 transition-shadow">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 border-b border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate font-code">{demo.url}</span>
                </div>
                <div className="aspect-[4/3] bg-gray-100 relative">
                  <video src={demo.src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                    <span className="text-xs font-semibold text-white">{demo.label}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── PREPARATION AT SCALE — Donut + Topic Cards ── */}
      <section className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-10">
            <span className="gradient-text text-sm font-bold tracking-[0.2em] uppercase">Preparation at Scale</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-4">Everything you need to prepare.</h2>
          </FadeIn>
          <PrepShowcase />
        </div>
      </section>


      {/* ── JOB URL ANALYSIS — Highlighted Feature ── */}
      <section className="px-6 py-12 md:py-16" style={{ zIndex: 1, background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 50%, #faf5ff 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.15em] uppercase px-5 py-2 rounded-full border border-emerald-300 bg-white text-emerald-700 shadow-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              NEW FEATURE
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-6">
              Confused where to start preparing?
            </h2>
            <p className="mt-4 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Paste any job URL. Get an AI-powered prep plan with coding, system design, and behavioral questions tailored to <em>that exact role</em>.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-100/60 overflow-hidden">
              {/* Mock URL input */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
                  <svg width="18" height="18" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" /></svg>
                  <span className="text-sm text-gray-400 font-code">https://nvidia.wd5.myworkdayjobs.com/...Senior-DevOps-Engineer</span>
                  <span className="ml-auto px-4 py-1.5 text-xs font-bold text-white bg-emerald-500 rounded-lg">Analyze</span>
                </div>
              </div>
              {/* Results preview */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-600 tracking-wide uppercase font-code">AI Analysis Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Coding Focus', items: ['Graph Algorithms', 'Scripting', 'Automation'], color: '#10b981', bg: '#ecfdf5' },
                    { label: 'System Design', items: ['CI/CD Pipeline', 'Container Orchestration', 'Monitoring'], color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Behavioral', items: ['Leadership', 'Incident Mgmt', 'Cross-Team'], color: '#f59e0b', bg: '#fffbeb' },
                  ].map(col => (
                    <div key={col.label} className="rounded-xl p-3" style={{ background: col.bg }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: col.color }}>{col.label}</p>
                      <div className="flex flex-col gap-1">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium text-gray-700 px-2 py-1 rounded bg-white border border-gray-100">{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.25} className="text-center mt-10">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/jobs" className="shimmer-btn px-8 py-3.5 text-base font-semibold rounded-xl transition-colors" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)', color: '#ffffff' }}>
                Try It Now — Paste a Job URL
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn &amp; more
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── WHAT SETS CAMORA APART — Feature Groups ── */}
      <section className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-20">
            <span className="inline-block text-sm font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">ONLY ON CAMORA</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-6">What no other interview tool can do.</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURE_GROUPS.map((group, gi) => (
              <FadeIn key={group.groupTitle} delay={gi * 0.1}>
                <div className="rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between" style={{ background: `${group.accent}06` }}>
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: group.accent }} />
                      <h3 className="text-base font-bold text-gray-900 font-display">{group.groupTitle}</h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: group.accent, background: `${group.accent}12` }}>{group.features.length} features</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {group.features.map(f => (
                        <div key={f.title} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${group.accent}10`, color: group.accent }}>{f.icon}</div>
                          <span className="text-sm font-medium text-gray-700 leading-tight">{f.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAMORA VS COMPETITORS — Bar Chart ── */}
      <section ref={compRef} className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-10">
            <span className="gradient-text text-sm font-bold tracking-[0.2em] uppercase">Head-to-Head</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-4">See why engineers switch to Camora.</h2>
          </FadeIn>
          <FadeIn className="max-w-2xl mx-auto">
            {COMP_BARS.map((bar, i) => (
              <div key={bar.name} className="flex items-center gap-3 mb-3"
                style={{ opacity: compInView ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: `${i * 100 + 300}ms` }}>
                <span className={`text-sm font-semibold w-24 text-right flex-shrink-0 ${i === 0 ? 'text-emerald-500' : 'text-gray-400'}`}>{bar.name}</span>
                <div className="flex-1 h-7 rounded-lg bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-lg flex items-center justify-end pr-2.5"
                    style={{ width: compInView ? `${(bar.count / 45) * 100}%` : '0%', background: bar.color, transition: `width 1s ease ${i * 100 + 400}ms` }}>
                    <span className="text-xs font-bold font-code text-white whitespace-nowrap">{bar.count}{bar.suffix}</span>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-center text-xs text-gray-400 mt-4 font-code tracking-wide">FEATURES COMPARISON</p>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-28 md:py-36" style={{ zIndex: 1 }}>
        <FadeIn className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight whitespace-nowrap">
            Your next interview <span className="gradient-text">starts here.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-gray-400 whitespace-nowrap">Apply, Prepare, Practice, Attend.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/lumora" className="shimmer-btn px-8 py-4 text-lg font-semibold text-white bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">Start Free — No Credit Card</Link>
            <Link to="/pricing" className="px-8 py-4 text-lg font-semibold text-gray-600 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-200">View Pricing</Link>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 px-6 py-16" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <CamoraLogo size={36} />
              <div>
                <span className="text-base font-bold" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
                <span className="block text-xs text-gray-400 mt-0.5">Apply · Prepare · Practice · Attend</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {NAV_LINKS.map(link => (
                <Link key={link.label} to={link.href} className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">{link.label}</Link>
              ))}
              <a href="mailto:support@cariara.com" className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">Support</a>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300">&copy; {new Date().getFullYear()} Camora by Cariara</p>
            <p className="text-sm text-gray-300">Built for engineers, by engineers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
