import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/shared/Icons.jsx';

/* ──────────────────────────────── Data ──────────────────────────────── */

const SECTIONS = [
  {
    key: 'system-design',
    title: 'System Design',
    icon: 'systemDesign',
    color: '#10b981',        // emerald
    border: 'border-emerald-200',
    bg: 'hover:bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    items: [
      { label: 'URL Shortener', desc: 'Design a scalable URL shortening service', icon: 'link', slug: 'url-shortener' },
      { label: 'Rate Limiter', desc: 'Build a distributed rate limiting system', icon: 'shield', slug: 'rate-limiter' },
      { label: 'Notification System', desc: 'Design a multi-channel notification service', icon: 'bell', slug: 'notification-system' },
      { label: 'Chat Application', desc: 'Real-time messaging with WebSocket architecture', icon: 'messageSquare', slug: 'chat-application' },
      { label: 'Distributed Cache', desc: 'Design a high-throughput caching layer', icon: 'layers', slug: 'distributed-cache' },
      { label: 'Payment Gateway', desc: 'Build a reliable payment processing system', icon: 'creditCard', slug: 'payment-gateway' },
    ],
  },
  {
    key: 'technical',
    title: 'Technical',
    icon: 'settings',
    color: '#06b6d4',        // cyan
    border: 'border-cyan-200',
    bg: 'hover:bg-cyan-50',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-600',
    cols: 'grid-cols-1 sm:grid-cols-2',
    items: [
      { label: 'K8s Networking', desc: 'Container networking, services, and ingress', icon: 'cloud', slug: 'k8s-networking' },
      { label: 'CI/CD Pipeline', desc: 'Build and deploy automation strategies', icon: 'rocket', slug: 'cicd-pipeline' },
      { label: 'Microservices', desc: 'Service decomposition and communication patterns', icon: 'package', slug: 'microservices' },
      { label: 'Database Sharding', desc: 'Horizontal partitioning and data distribution', icon: 'database', slug: 'database-sharding' },
    ],
  },
  {
    key: 'behavioral',
    title: 'Behavioral',
    icon: 'behavioral',
    color: '#f59e0b',        // amber
    border: 'border-amber-200',
    bg: 'hover:bg-amber-50',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    cols: 'grid-cols-1 sm:grid-cols-2',
    items: [
      { label: 'About Yourself', desc: 'Craft a compelling personal narrative', icon: 'user', slug: 'about-yourself' },
      { label: 'Technical Challenge', desc: 'Walk through a difficult engineering problem', icon: 'target', slug: 'technical-challenge' },
      { label: 'Production Incidents', desc: 'Handling outages and post-mortems', icon: 'alertTriangle', slug: 'production-incidents' },
      { label: 'Leadership Style', desc: 'Influence, mentorship, and team dynamics', icon: 'users', slug: 'leadership-style' },
    ],
  },
  {
    key: 'ai-ml',
    title: 'AI / ML',
    icon: 'ml',
    color: '#f43f5e',        // rose
    border: 'border-rose-200',
    bg: 'hover:bg-rose-50',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    cols: 'grid-cols-1 sm:grid-cols-3',
    items: [
      { label: 'Transformer Architecture', desc: 'Attention mechanisms and modern LLM design', icon: 'brain', slug: 'transformer-architecture' },
      { label: 'Model Training Pipeline', desc: 'Data prep, training loops, and evaluation', icon: 'activity', slug: 'model-training-pipeline' },
      { label: 'Feature Engineering', desc: 'Feature selection, encoding, and scaling', icon: 'filter', slug: 'feature-engineering' },
    ],
  },
  {
    key: 'full-stack',
    title: 'Full Stack',
    icon: 'fullstack',
    color: '#3b82f6',        // blue
    border: 'border-blue-200',
    bg: 'hover:bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    cols: 'grid-cols-1 sm:grid-cols-3',
    items: [
      { label: 'REST vs GraphQL', desc: 'API design trade-offs and best practices', icon: 'code', slug: 'rest-vs-graphql' },
      { label: 'Auth & JWT', desc: 'Authentication flows, tokens, and session management', icon: 'lock', slug: 'auth-jwt' },
      { label: 'Cloud & DevOps', desc: 'Infrastructure, containers, and deployment', icon: 'cloudArchitect', slug: 'cloud-devops' },
    ],
  },
  {
    key: 'data',
    title: 'Data',
    icon: 'data',
    color: '#14b8a6',        // teal
    border: 'border-teal-200',
    bg: 'hover:bg-teal-50',
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-600',
    cols: 'grid-cols-1 sm:grid-cols-3',
    items: [
      { label: 'SQL & Data Modeling', desc: 'Schema design, normalization, and queries', icon: 'database', slug: 'sql-data-modeling' },
      { label: 'ETL & Pipelines', desc: 'Data ingestion, transformation, and orchestration', icon: 'signal', slug: 'etl-pipelines' },
      { label: 'A/B Testing & Stats', desc: 'Experiment design, significance, and analysis', icon: 'chartBar', slug: 'ab-testing-stats' },
    ],
  },
  {
    key: 'coding',
    title: 'Practice Coding',
    icon: 'code',
    color: '#8b5cf6',        // violet
    border: 'border-violet-200',
    bg: 'hover:bg-violet-50',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    items: [
      { label: 'Two Sum', desc: 'Hash map lookup pattern', icon: 'algorithm', slug: 'two-sum' },
      { label: 'LRU Cache', desc: 'Linked list + hash map design', icon: 'layers', slug: 'lru-cache' },
      { label: 'Merge Intervals', desc: 'Sorting and interval merging', icon: 'activity', slug: 'merge-intervals' },
      { label: 'Binary Tree BFS', desc: 'Level-order traversal technique', icon: 'systemDesign', slug: 'binary-tree-bfs' },
      { label: 'Linked List', desc: 'Pointer manipulation essentials', icon: 'link', slug: 'linked-list' },
      { label: 'Valid Parens', desc: 'Stack-based matching', icon: 'code', slug: 'valid-parens' },
      { label: 'Max Subarray', desc: "Kadane's algorithm", icon: 'chartLine', slug: 'max-subarray' },
      { label: 'Group Anagrams', desc: 'Hash-based grouping', icon: 'filter', slug: 'group-anagrams' },
    ],
  },
];

const MOCK_CATEGORIES = [
  { value: 'system-design', label: 'System Design' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'ai-ml', label: 'ML / AI' },
];

const navLinks = [
  { label: 'Apply', href: 'https://jobs.cariara.com' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

/* ────────────────────────────── Component ────────────────────────────── */

export default function PracticePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mock interview state
  const [mockCategory, setMockCategory] = useState('system-design');
  const [mockActive, setMockActive] = useState(false);
  const [mockQuestion, setMockQuestion] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  /* ── Topic click → navigate to the topic's prepare page ── */
  const handleTopicClick = useCallback((item) => {
    if (item.href) {
      navigate(item.href);
    } else if (item.slug) {
      navigate(`/problems/${item.slug}`);
    }
  }, [navigate]);

  /* ── Nav click handler: external links open in new tab, internal use navigate ── */
  const handleNavClick = useCallback((href) => {
    if (href.startsWith('http') || href.startsWith('mailto:')) {
      window.open(href, '_blank');
    } else {
      navigate(href);
    }
  }, [navigate]);

  /* ── Mock interview helpers ── */
  const getRandomQuestion = useCallback((cat) => {
    const section = SECTIONS.find((s) => s.key === cat);
    if (!section) return null;
    const items = section.items;
    return items[Math.floor(Math.random() * items.length)];
  }, []);

  const startMock = useCallback(() => {
    const q = getRandomQuestion(mockCategory);
    setMockQuestion(q);
    setMockActive(true);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [mockCategory, getRandomQuestion]);

  const nextQuestion = useCallback(() => {
    const q = getRandomQuestion(mockCategory);
    setMockQuestion(q);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [mockCategory, getRandomQuestion]);

  const stopMock = useCallback(() => {
    setMockActive(false);
    setMockQuestion(null);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen text-gray-900 overflow-hidden landing-root" style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #ede9fe 50%, #e0e7ff 100%)', paddingTop: '64px', paddingBottom: '52px' }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4" style={{ background: '#111827' }}>
        <a href="/capra" onClick={(e) => { e.preventDefault(); navigate('/capra'); }} className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Icon name="ascend" size={16} className="text-white" />
          </div>
          <div>
            <span className="landing-display font-bold text-lg tracking-tight text-white">Ascend</span>
            <span className="block text-[10px] landing-mono uppercase tracking-[0.2em] text-emerald-400 -mt-0.5">Interview AI</span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isHighlighted = ['Apply', 'Prepare', 'Practice'].includes(link.label);
            return link.href.startsWith('http') ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={`text-sm font-semibold transition-colors landing-body ${isHighlighted ? '' : 'text-gray-400 hover:text-white'}`} style={isHighlighted ? { background: 'linear-gradient(90deg, #34d399, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}>
                {link.label}
              </a>
            ) : (
              <button key={link.label} onClick={() => navigate(link.href)} className={`text-sm font-semibold transition-colors landing-body ${isHighlighted ? '' : 'text-gray-400 hover:text-white'}`} style={isHighlighted ? { background: 'linear-gradient(90deg, #34d399, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}>
                {link.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <button onClick={() => navigate('/capra/prepare')} className="text-sm text-gray-300 hover:text-white transition-colors landing-body font-medium">Dashboard</button>
          ) : !loading ? (
            <button onClick={() => navigate('/capra/login')} className="text-sm text-gray-300 hover:text-white transition-colors landing-body font-medium">Sign in</button>
          ) : null}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 md:hidden border-b border-gray-100 bg-white px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            link.href.startsWith('http') ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors landing-body">{link.label}</a>
            ) : (
              <button key={link.label} onClick={() => { navigate(link.href); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors landing-body">{link.label}</button>
            )
          ))}
          {user ? (
            <button onClick={() => { navigate('/capra/prepare'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors landing-body">Dashboard</button>
          ) : !loading ? (
            <button onClick={() => { navigate('/capra/login'); setMobileMenuOpen(false); }} className="block w-full mt-2 px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors landing-body text-left">Sign in</button>
          ) : null}
        </div>
      )}

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-10 pb-8 md:pt-14 md:pb-10">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 border border-emerald-200 bg-emerald-50 rounded-full mb-5 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs landing-mono text-emerald-700 tracking-wide">Curated Interview Prep</span>
        </div>

        <h1 className={`landing-display font-extrabold leading-tight tracking-tight max-w-4xl transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="text-3xl md:text-4xl lg:text-5xl text-gray-900">Practice </span>
          <span className="text-3xl md:text-4xl lg:text-5xl bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Topics</span>
        </h1>

        <p className={`mt-4 text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed landing-body transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Prepare for your interviews with curated topics across system design, coding, behavioral, and more.
        </p>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* ── Topic Sections ── */}
        <div className="space-y-8">
          {SECTIONS.map((section, si) => (
            <div
              key={section.key}
              className={`bg-white rounded-xl border ${section.border} shadow-sm overflow-hidden transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${si * 80}ms` }}
            >
              {/* Section header */}
              <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.iconBg}`}>
                  <Icon name={section.icon} size={16} className={section.iconText} />
                </div>
                <h2 className="text-sm font-bold tracking-wide uppercase landing-mono" style={{ color: section.color }}>
                  {section.title}
                </h2>
              </div>

              {/* Cards grid */}
              <div className={`px-5 sm:px-6 pb-5 grid gap-3 ${section.cols}`}>
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleTopicClick(item)}
                    className={`group text-left p-4 rounded-lg border border-gray-100 transition-all duration-200 ${section.bg} hover:border-current hover:shadow-sm`}
                    style={{ '--tw-border-opacity': 0.3 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                        style={{ backgroundColor: section.color + '15', color: section.color }}
                      >
                        <Icon name={item.icon} size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-800 truncate landing-body">
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1 landing-body">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Mock Interview Section ── */}
        <div
          className={`mt-10 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: `${SECTIONS.length * 80}ms` }}
        >
          <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-900">
              <Icon name="timer" size={16} className="text-white" />
            </div>
            <h2 className="text-sm font-bold tracking-wide uppercase text-gray-900 landing-mono">
              Mock Interview
            </h2>
          </div>

          <div className="px-5 sm:px-6 pb-6">
            {!mockActive ? (
              /* Inactive state: category picker + start */
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={mockCategory}
                  onChange={(e) => setMockCategory(e.target.value)}
                  className="flex-1 sm:flex-none sm:w-56 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors landing-body"
                >
                  {MOCK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={startMock}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors landing-body"
                >
                  <Icon name="play" size={14} className="text-white" />
                  Start Mock Interview
                </button>
              </div>
            ) : (
              /* Active state: question + timer + controls */
              <div className="space-y-4">
                {/* Timer bar */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider landing-mono">
                    <Icon name="timer" size={14} className="text-emerald-500" />
                    {MOCK_CATEGORIES.find((c) => c.value === mockCategory)?.label}
                  </span>
                  <span className="landing-mono text-lg font-bold text-gray-900 tabular-nums">
                    {formatTime(elapsed)}
                  </span>
                </div>

                {/* Question card */}
                {mockQuestion && (
                  <div className="p-5 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 landing-display">
                      {mockQuestion.label}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 landing-body">{mockQuestion.desc}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={nextQuestion}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors landing-body"
                  >
                    <Icon name="refresh" size={14} />
                    Next Question
                  </button>
                  <button
                    onClick={() => {
                      if (mockQuestion) handleTopicClick(mockQuestion);
                      stopMock();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors landing-body"
                  >
                    <Icon name="arrowRight" size={14} className="text-white" />
                    Practice This
                  </button>
                  <button
                    onClick={stopMock}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors ml-auto landing-body"
                  >
                    <Icon name="stop" size={14} />
                    Stop
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 md:px-12 py-3" style={{ background: '#111827' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <a href="/capra" onClick={(e) => { e.preventDefault(); navigate('/capra'); }} className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <Icon name="ascend" size={12} className="text-white" />
            </div>
            <span className="landing-display font-bold text-sm text-white">Ascend</span>
          </a>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label: 'Apply', href: 'https://jobs.cariara.com' },
              { label: 'Prepare', href: '/capra/prepare' },
              { label: 'Practice', href: '/capra/practice' },
              { label: 'Attend', href: '/lumora' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Support', href: 'mailto:support@cariara.com' },
            ].map((link) => (
              link.href.startsWith('http') || link.href.startsWith('mailto:') ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-emerald-400 transition-colors landing-body font-medium">{link.label}</a>
              ) : (
                <button key={link.label} onClick={() => navigate(link.href)} className="text-xs text-gray-400 hover:text-emerald-400 transition-colors landing-body font-medium">{link.label}</button>
              )
            ))}
          </div>
          <p className="text-xs text-gray-500 landing-mono">
            &copy; {new Date().getFullYear()} Ascend by Cariara
          </p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');

        .landing-root {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-display {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-body {
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-mono {
          font-family: 'IBM Plex Mono', monospace;
        }

        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
