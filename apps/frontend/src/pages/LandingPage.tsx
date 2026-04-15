import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

/* ── APPA steps data ───────────────────────────────────── */
const APPA = [
  { num: '01', label: 'Apply', desc: 'Discover engineering roles matched to your skills, experience, and salary goals across 1 000+ companies.', href: '/jobs', color: '#34d399' },
  { num: '02', label: 'Prepare', desc: 'Study 800+ curated topics spanning system design, DSA, behavioral, databases, and cloud architecture.', href: '/capra/prepare', color: '#818cf8' },
  { num: '03', label: 'Practice', desc: 'Solve 850+ coding problems with AI explanations, run mock interviews, and build confidence before the real thing.', href: '/capra/practice', color: '#38bdf8' },
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
    label: 'Prepare with 800+ Topics',
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
              borderColor: isActive ? `${step.color}50` : 'var(--border)',
              backgroundColor: isActive ? `${step.color}08` : 'transparent',
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  animate={{ backgroundColor: isActive ? `${step.color}20` : 'var(--bg-elevated)', color: isActive ? step.color : 'var(--text-muted)' }}
                  transition={{ duration: 0.3 }}
                >
                  {step.icon}
                </motion.div>
                <span className="text-base font-semibold transition-colors duration-300" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </span>
              </div>
              <motion.div animate={{ rotate: isActive ? 45 : 0 }} transition={{ duration: 0.2 }}>
                <svg className="w-5 h-5" style={{ color: isActive ? step.color : 'var(--text-muted)' }}
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
                    <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">{step.desc}</p>
                    <div className="mt-4 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
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
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{ border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-[6px]">
          <div className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
          <div className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
          <div className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-lg text-xs font-code" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
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
    { name: 'DSA & Algorithms', count: 65, problems: 854, color: '#34d399' },
    { name: 'System Design', count: 420, problems: 318, color: '#06b6d4' },
    { name: 'Microservices', count: 27, problems: 0, color: '#818cf8' },
    { name: 'Database Internals', count: 16, problems: 112, color: '#f97316' },
    { name: 'SQL for Interviews', count: 15, problems: 85, color: '#fbbf24' },
    { name: 'Low-Level Design', count: 112, problems: 268, color: '#a78bfa' },
    { name: 'Behavioral', count: 64, problems: 230, color: '#f472b6' },
  ];
  const TOTAL = 808;
  const TOTAL_PROBLEMS = 1867;
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
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="18" />
            {donutSegments.map((seg, i) => (
              <circle key={seg.name} cx="100" cy="100" r={RADIUS} fill="none" stroke={seg.color} strokeWidth="18"
                strokeDasharray={`${inView ? seg.dash : 0} ${inView ? seg.gap : CIRCUMFERENCE}`}
                strokeDashoffset={seg.offset} strokeLinecap="butt"
                style={{ transition: `stroke-dasharray 1.2s ease ${i * 100 + 300}ms` }} />
            ))}
            <text x="100" y="85" textAnchor="middle" fill="var(--text-primary)" fontSize="26" fontWeight="bold" fontFamily="inherit">800+</text>
            <text x="100" y="104" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500" fontFamily="inherit">Topics</text>
            <text x="100" y="122" textAnchor="middle" fill="var(--accent)" fontSize="16" fontWeight="bold" fontFamily="inherit">1,850+</text>
            <text x="100" y="137" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="500" fontFamily="inherit">Problems</text>
          </svg>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {TOPIC_CATEGORIES.map((cat, i) => (
            <div key={cat.name} className="flex items-center gap-2.5"
              style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(12px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease', transitionDelay: `${i * 80 + 500}ms` }}>
              <span className="flex-shrink-0 w-3 h-3 rounded-full" style={{ background: cat.color }} />
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
              <span className="text-sm font-code font-semibold" style={{ color: 'var(--text-muted)' }}>{cat.count}</span>
              {cat.problems > 0 && <span className="text-xs font-code" style={{ color: 'var(--text-dimmed)' }}>({cat.problems} problems)</span>}
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
            className="card rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease, border-color 0.3s ease, box-shadow 0.3s ease',
              transitionDelay: `${i * 80 + 500}ms`, padding: 0 }}>
            <div className="h-28 flex items-center justify-center transition-colors duration-300" style={{ background: `${item.color}08` }}>
              <img src={item.img} alt={item.category} className="h-20 w-auto transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2.5 py-1 rounded-md text-xs font-code font-semibold" style={{ color: item.color, background: `${item.color}12` }}>{item.category}</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-code font-semibold ${
                  item.difficulty === 'Easy' ? 'badge-easy' :
                  item.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium'}`}>
                  {item.difficulty}
                </span>
              </div>
              <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{item.name}</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.topics} subtopics</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
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
      { title: '800+ Study Topics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
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
function useVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
    // Get unique visitors (deduplicated by IP)
    fetch(`${API}/api/visitors/unique-count`)
      .then(r => r.json())
      .then(d => setCount(d.total))
      .catch(() => {});
  }, []);
  return count;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const compRef = useRef<HTMLDivElement>(null);
  const compInView = useInView(compRef, { once: true, margin: '-80px' });
  const visitorCount = useVisitorCount();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    document.title = 'Camora — Apply, Prepare, Practice & Attend';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: 'var(--text-primary)' }}>
      <SEO path="/" />

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
             style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ── NAV ── */}
      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-10 md:pt-32 md:pb-14 px-6" style={{ zIndex: 1 }}>
        <div className="w-full lg:max-w-[70%] mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-400 tracking-wide">APPA — Apply · Prepare · Practice · Attend</span>
            </div>
          </motion.div>
          <motion.h1 className="font-display font-extrabold tracking-[-0.04em]"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <span className="block text-4xl sm:text-5xl md:text-6xl leading-[1.1]">Application to <span className="gradient-text">Offer.</span></span>
          </motion.h1>
          <motion.div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Link to={isAuthenticated ? "/capra/prepare" : "/signup"} className="shimmer-btn px-6 py-3 text-base font-semibold rounded-xl text-white transition-colors" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)' }}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </Link>
            <a href="#process" className="btn-secondary px-6 py-3 text-base rounded-xl transition-colors">
              See How It Works
            </a>
          </motion.div>

          {/* Visitor Count */}
          {visitorCount !== null && visitorCount > 0 && (
            <motion.div className="mt-8 flex items-center justify-center gap-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}>
              <div className="flex -space-x-1.5">
                {['#34d399','#818cf8','#38bdf8','#fbbf24'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full" style={{ background: c, border: '2px solid var(--bg-app)' }} />
                ))}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{visitorCount.toLocaleString()}+</span> engineers visited
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── APPA STEP CARDS — Visual summary ── */}
      <section className="px-6 py-10 md:py-14" style={{ zIndex: 1 }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APPA.map((step, i) => (
              <FadeIn key={step.label} delay={i * 0.08}>
                <Link to={step.href}
                  className="group card relative rounded-2xl p-6 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                >
                  {/* Accent top bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: step.color }} />
                  {/* Step number */}
                  <span className="text-[40px] md:text-[48px] font-extrabold leading-none font-display opacity-10 absolute top-4 right-5" style={{ color: step.color }}>{step.num}</span>
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                       style={{ background: `${step.color}15`, color: step.color }}>
                    {AppaIcons[step.label.toLowerCase() as keyof typeof AppaIcons]?.(step.color)}
                  </div>
                  <h3 className="text-lg font-bold font-display mb-2" style={{ color: 'var(--text-primary)' }}>{step.label}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold transition-colors duration-200 group-hover:gap-2" style={{ color: step.color }}>
                    <span>Explore</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS — Accordion (MetAntz-style) ── */}
      <section id="process" className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-stretch">
            <FadeIn>
              <span className="section-label gradient-text text-sm font-bold tracking-[0.2em]">Our Process</span>
              <h2 className="heading-1 font-display text-4xl md:text-5xl font-bold tracking-tight mt-4 leading-[1.1]">Your path to the offer</h2>
              <p className="text-body text-lg mt-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>A streamlined process designed for engineers who want to land their dream role.</p>
              <ProcessAccordion />
            </FadeIn>
            <FadeIn delay={0.2} className="hidden lg:flex">
              <div className="h-full flex flex-col">
                <div className="relative rounded-3xl p-10 flex-1 flex flex-col justify-center overflow-hidden"
                     style={{
                       background: 'linear-gradient(145deg, var(--bg-surface) 0%, rgba(52,211,153,0.05) 25%, rgba(99,102,241,0.05) 50%, rgba(139,92,246,0.05) 75%, var(--bg-surface) 100%)',
                       boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 2px 8px rgba(99,102,241,0.1)',
                       border: '1px solid var(--border)',
                     }}>
                  {/* Gradient glow orbs */}
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
                  <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }} />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                      <span className="text-sm font-bold tracking-wider uppercase bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4, #818cf8)' }}>APPA Flow</span>
                    </div>
                    <div className="space-y-1">
                      {PROCESS_STEPS.map((step, i) => (
                        <div key={step.label} className="flex items-start gap-5">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-sm transition-all duration-300 hover:scale-110"
                                 style={{
                                   background: `linear-gradient(135deg, ${step.color}15, ${step.color}08)`,
                                   borderColor: `${step.color}30`,
                                   color: step.color,
                                   boxShadow: `0 4px 12px ${step.color}15`,
                                 }}>
                              {step.icon}
                            </div>
                            {i < PROCESS_STEPS.length - 1 && (
                              <div className="w-[2px] h-10 my-1 rounded-full" style={{ background: `linear-gradient(to bottom, ${step.color}50, ${PROCESS_STEPS[i + 1].color}50)` }} />
                            )}
                          </div>
                          <div className="pt-2.5">
                            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{step.label.split(' ')[0]}</span>
                            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.label.split(' ').slice(1).join(' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── DEMO — Videos ── */}
      <section className="px-6 pb-10 md:pb-16" style={{ zIndex: 1 }}>
        <FadeIn className="w-full lg:max-w-[70%] mx-auto">
          <BrowserChrome url="camora.cariara.com/lumora">
            <div className="aspect-video" style={{ background: 'var(--bg-elevated)' }}>
              <video src="/demo-lumora.mp4" autoPlay loop muted playsInline title="Lumora live interview demo" className="w-full h-full object-cover" />
            </div>
          </BrowserChrome>
        </FadeIn>
        <div className="w-full lg:max-w-[70%] mx-auto mt-6 grid md:grid-cols-3 gap-4">
          {[
            { url: 'camora.cariara.com/capra', src: '/demo-capra.mp4', label: 'Dashboard' },
            { url: 'camora.cariara.com/capra/prepare', src: '/demo-capra-topic.mp4', label: 'Study Topics' },
            { url: 'camora.cariara.com/lumora/design', src: '/demo-design.mp4', label: 'Design Mode' },
          ].map((demo, i) => (
            <FadeIn key={demo.url} delay={0.1 * (i + 1)}>
              <div className="card rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group" style={{ padding: 0 }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#febc2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] truncate font-code" style={{ color: 'var(--text-muted)' }}>{demo.url}</span>
                </div>
                <div className="aspect-[4/3] relative" style={{ background: 'var(--bg-elevated)' }}>
                  <video src={demo.src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                    <span className="text-sm font-semibold text-white">{demo.label}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── JOB URL ANALYSIS — Highlighted Feature ── */}
      <section className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <FadeIn className="text-center mb-10">
            <span className="section-label inline-flex items-center gap-2 text-sm font-bold tracking-[0.15em] px-5 py-2 rounded-full" style={{ border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              NEW FEATURE
            </span>
            <h2 className="heading-1 font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-6">
              Confused where to start preparing?
            </h2>
            <p className="text-body mt-4 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Paste any job URL. Get an AI-powered prep plan with coding, system design, and behavioral questions tailored to <em>that exact role</em>.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="card max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{ padding: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <svg width="18" height="18" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" /></svg>
                  <span className="text-sm font-code truncate" style={{ color: 'var(--text-muted)' }}>https://nvidia.wd5.myworkdayjobs.com/...Senior-DevOps-Engineer</span>
                  <span className="ml-auto px-4 py-1.5 text-xs font-bold text-white rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>Analyze</span>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase font-code">AI Analysis Complete</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Coding Focus', items: ['Graph Algorithms', 'Scripting', 'Automation'], color: '#10b981' },
                    { label: 'System Design', items: ['CI/CD Pipeline', 'Container Orchestration', 'Monitoring'], color: '#3b82f6' },
                    { label: 'Behavioral', items: ['Leadership', 'Incident Mgmt', 'Cross-Team'], color: '#f59e0b' },
                  ].map(col => (
                    <div key={col.label} className="card-sm rounded-xl" style={{ background: `${col.color}08`, border: 'none' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: col.color }}>{col.label}</p>
                      <div className="flex flex-col gap-1.5">
                        {col.items.map(item => (
                          <span key={item} className="text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{item}</span>
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
              <Link to="/jobs" className="btn-primary shimmer-btn px-8 py-3.5 text-base rounded-xl">
                Try It Now — Paste a Job URL
              </Link>
            </div>
            <p className="text-small mt-4">
              Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn &amp; more
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── PREPARATION AT SCALE — Donut + Topic Cards ── */}
      <section className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <FadeIn className="text-center mb-10">
            <span className="section-label gradient-text text-sm font-bold tracking-[0.2em]">Preparation at Scale</span>
            <h2 className="heading-1 font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-4">Everything you need to prepare.</h2>
          </FadeIn>
          <PrepShowcase />
        </div>
      </section>

      {/* ── WHAT SETS CAMORA APART — Feature Groups ── */}
      <section className="px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <FadeIn className="text-center mb-20">
            <span className="section-label inline-block text-sm font-bold tracking-[0.2em] px-4 py-1.5 rounded-full" style={{ border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>ONLY ON CAMORA</span>
            <h2 className="heading-1 font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-6">What no other interview tool can do.</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURE_GROUPS.map((group, gi) => (
              <FadeIn key={group.groupTitle} delay={gi * 0.1}>
                <div className="card rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-300" style={{ padding: 0 }}>
                  <div className="px-6 py-4 flex items-center justify-between" style={{ background: `${group.accent}06`, borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${group.accent}15` }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: group.accent }} />
                      </div>
                      <h3 className="heading-2 text-base font-display">{group.groupTitle}</h3>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: group.accent, background: `${group.accent}12` }}>{group.features.length} features</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.features.map(f => (
                        <div key={f.title} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group/feat" style={{ cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover/feat:scale-110" style={{ background: `${group.accent}10`, color: group.accent }}>{f.icon}</div>
                          <span className="text-sm font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{f.title}</span>
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
        <div className="w-full lg:max-w-[70%] mx-auto">
          <FadeIn className="text-center mb-12">
            <span className="section-label gradient-text text-sm font-bold tracking-[0.2em]">Head-to-Head</span>
            <h2 className="heading-1 font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-4">See why engineers switch to Camora.</h2>
          </FadeIn>
          <FadeIn className="max-w-2xl mx-auto">
            <div className="card rounded-2xl overflow-hidden" style={{ padding: 0 }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <span className="heading-3 font-display">Feature Count by Platform</span>
                <span className="badge-new">2024 DATA</span>
              </div>
              <div className="p-6 space-y-4">
                {COMP_BARS.map((bar, i) => {
                  const isCamora = i === 0;
                  return (
                    <div key={bar.name} className="flex items-center gap-4"
                      style={{ opacity: compInView ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: `${i * 100 + 300}ms` }}>
                      <span className={`text-sm font-semibold w-24 text-right flex-shrink-0`} style={{ color: isCamora ? '#34d399' : 'var(--text-muted)' }}>
                        {isCamora && <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 align-middle" />}
                        {bar.name}
                      </span>
                      <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div className={`h-full rounded-lg flex items-center justify-end pr-3 ${isCamora ? 'shadow-sm' : ''}`}
                          style={{
                            width: compInView ? `${(bar.count / 45) * 100}%` : '0%',
                            background: isCamora ? 'linear-gradient(135deg, #34d399, #10b981)' : 'var(--border)',
                            transition: `width 1s ease ${i * 100 + 400}ms`,
                          }}>
                          <span className="text-xs font-bold font-code whitespace-nowrap" style={{ color: isCamora ? '#fff' : 'var(--text-muted)' }}>{bar.count}{bar.suffix}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <p className="section-label text-center font-code tracking-wide">FEATURES COMPARISON</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-28 md:py-36" style={{ zIndex: 1 }}>
        <FadeIn className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center overflow-hidden"
               style={{
                 background: 'linear-gradient(145deg, rgba(52,211,153,0.06) 0%, rgba(99,102,241,0.06) 50%, rgba(139,92,246,0.06) 100%)',
                 border: '1px solid var(--border)',
               }}>
            {/* Subtle glow orbs */}
            <div className="absolute top-0 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
            <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

            <div className="relative z-10">
              <h2 className="heading-1 font-display text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight">
                Your next interview <span className="gradient-text">starts here.</span>
              </h2>
              <p className="text-body mt-6 text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>Apply, Prepare, Practice, Attend.</p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/lumora" className="btn-primary shimmer-btn px-8 py-4 text-lg rounded-2xl">Start Free — No Credit Card</Link>
                <Link to="/pricing" className="btn-secondary px-8 py-4 text-lg rounded-2xl">View Pricing</Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
