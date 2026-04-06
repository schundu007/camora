import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/shared/Icons.jsx';
import CamoraLogo from '../../components/shared/CamoraLogo';
import { useContentAccess } from '../../hooks/useContentAccess';
import { interviewCheatsheet, behavioralQuestions } from '../../data/capra/topics/techInterviewHandbook';

/* ──────────────────────────────── Data ──────────────────────────────── */

const SECTIONS = [
  {
    key: 'system-design',
    title: 'System Design',
    icon: 'systemDesign',
    color: '#10b981',
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
    color: '#06b6d4',
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
    color: '#f59e0b',
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
    color: '#f43f5e',
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
    color: '#3b82f6',
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
    color: '#14b8a6',
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
    color: '#8b5cf6',
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
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

const TOTAL_TOPICS = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

/* ────────────────────────────── Component ────────────────────────────── */

export default function PracticePage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { isPaidUser, canReadTopic, markTopicRead, FREE_TOPICS_PER_CATEGORY, getReadCount } = useContentAccess();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Progress tracking
  const [progressPercentage, setProgressPercentage] = useState(0);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ascend_completed_topics');
      if (stored) {
        const parsed = JSON.parse(stored);
        const completed = Object.keys(parsed).filter(k => parsed[k]).length;
        const total = 415; // Total topics across all categories
        setProgressPercentage(total > 0 ? Math.round((completed / total) * 100) : 0);
      }
    } catch {}
  }, []);

  // Mock interview state
  const [mockCategory, setMockCategory] = useState('system-design');
  const [mockActive, setMockActive] = useState(false);
  const [mockQuestion, setMockQuestion] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  /* ── Topic click -> open workspace with problem pre-loaded and auto-solve ── */
  const handleTopicClick = useCallback((item) => {
    if (item.href) {
      navigate(item.href);
    } else if (item.slug) {
      const section = SECTIONS.find(s => s.items.some(i => i.slug === item.slug));
      const problem = encodeURIComponent(`${item.label}: ${item.desc}`);
      const mode = section?.key;

      // Design categories → system design workspace
      if (mode === 'system-design' || mode === 'technical' || mode === 'full-stack' || mode === 'data' || mode === 'ai-ml') {
        navigate(`/capra/design?problem=${problem}&autosolve=true`);
      }
      // Behavioral → prep workspace
      else if (mode === 'behavioral') {
        navigate(`/capra/prep?problem=${problem}`);
      }
      // Coding → coding workspace
      else {
        navigate(`/capra?problem=${problem}&autosolve=true`);
      }
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
    <div className="practice-root" style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* ═══════════════════════ Top Navigation ═══════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)',
          height: '56px',
        }}
      >
        <div className="max-w-[85%] xl:max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <CamoraLogo size={36} />
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', fontFamily: "'Comfortaa', sans-serif" }}>
              Camora
            </span>
          </Link>

          {/* Center: Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = link.label === 'Practice';
              const linkStyle = {
                fontSize: '14px',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: '6px',
                transition: 'color 0.15s, background 0.15s',
                textDecoration: 'none',
                color: isActive ? '#10b981' : '#4b5563',
                borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
                marginBottom: '-1px',
              };

              return link.href.startsWith('http') ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="practice-body nav-link"
                  style={linkStyle}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="practice-body nav-link"
                  style={linkStyle}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: User / Sign in + mobile toggle */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/capra/prepare" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '4px 8px', borderRadius: '8px' }}>
                  {user.image ? (
                    <img src={user.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} referrerPolicy="no-referrer" />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#047857' }}>
                      {user.name?.[0] || '?'}
                    </div>
                  )}
                  <span className="practice-body" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{user.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="practice-body"
                  style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </>
            ) : !loading ? (
              <Link
                to="/login?redirect=/capra/practice"
                className="practice-body"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#4b5563',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
              >
                Sign in
              </Link>
            ) : null}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5"
              style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ Mobile Menu ═══════════════════════ */}
      {mobileMenuOpen && (
        <div
          className="fixed top-14 left-0 right-0 z-50 md:hidden"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e3e8ee',
            padding: '8px 16px',
          }}
        >
          {navLinks.map((link) => {
            const isActive = link.label === 'Practice';
            return link.href.startsWith('http') ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="practice-body"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#10b981' : '#4b5563',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="practice-body"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#10b981' : '#4b5563',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
              >
                {link.label}
              </Link>
            );
          })}
          {user ? (
            <>
              <Link
                to="/capra/prepare"
                onClick={() => setMobileMenuOpen(false)}
                className="practice-body"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#10b981',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  marginTop: '4px',
                }}
              >
                Dashboard
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="practice-body"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </>
          ) : !loading ? (
            <Link
              to="/login?redirect=/capra/practice"
              onClick={() => setMobileMenuOpen(false)}
              className="practice-body"
              style={{
                display: 'block',
                padding: '10px 12px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#10b981',
                textDecoration: 'none',
                borderRadius: '6px',
                marginTop: '4px',
              }}
            >
              Sign in
            </Link>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════ Page Header ═══════════════════════ */}
      <div style={{ paddingTop: '56px' }}>
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e3e8ee',
            padding: '32px 0 28px',
          }}
        >
          <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="practice-body" style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>
              <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }} className="breadcrumb-link">Home</Link>
              <span style={{ margin: '0 6px', color: '#d1d5db' }}>/</span>
              <span style={{ color: '#6b7280' }}>Practice</span>
            </nav>

            {/* Title */}
            <h1 className="practice-display" style={{ fontSize: '30px', fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.2 }}>
              Practice Topics
            </h1>


            {/* Stats row */}
            <div className="practice-body" style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>{SECTIONS.length} categories</span>
              <span style={{ color: '#d1d5db' }}>&middot;</span>
              <span>{TOTAL_TOPICS}+ topics</span>
              <span style={{ color: '#d1d5db' }}>&middot;</span>
              <span>Updated weekly</span>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '8px', borderRadius: '9999px', background: '#e5e7eb', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '9999px',
                    background: '#10b981',
                    width: `${progressPercentage}%`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span className="practice-body" style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {progressPercentage}% complete
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ Main Content ═══════════════════════ */}
        <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '32px', paddingBottom: '80px' }}>

          {/* ── Topic Sections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {SECTIONS.map((section) => (
              <div key={section.key}>
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    paddingLeft: '14px',
                    borderLeft: `4px solid ${section.color}`,
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: section.color + '14',
                      color: section.color,
                    }}
                  >
                    <Icon name={section.icon} size={15} />
                  </div>
                  <h2 className="practice-display" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {section.title}
                  </h2>
                  <span
                    className="practice-body"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#9ca3af',
                      background: '#f3f4f6',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {section.items.length}
                  </span>
                </div>

                {/* Cards grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {section.items.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleTopicClick(item)}
                      className="topic-card"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e3e8ee',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          backgroundColor: section.color + '12',
                          color: section.color,
                        }}
                      >
                        <Icon name={item.icon} size={15} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="practice-body" style={{ fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
                          {item.label}
                        </div>
                        <div className="practice-body" style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Mock Interview Section ── */}
          <div style={{ marginTop: '40px' }}>
            {/* Section header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                paddingLeft: '14px',
                borderLeft: '4px solid #111827',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#111827',
                  color: '#ffffff',
                }}
              >
                <Icon name="timer" size={15} />
              </div>
              <h2 className="practice-display" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Mock Interview
              </h2>
            </div>

            {/* Mock interview card */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e3e8ee',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                padding: '24px',
              }}
            >
              {!mockActive ? (
                /* Inactive state: category pills + start */
                <div>
                  <p className="practice-body" style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 14px', fontWeight: 500 }}>
                    Choose a category and start a timed practice session.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                    {MOCK_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setMockCategory(c.value)}
                        className="practice-body mock-pill"
                        style={{
                          padding: '7px 16px',
                          fontSize: '13px',
                          fontWeight: 500,
                          borderRadius: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          border: mockCategory === c.value ? '1px solid #10b981' : '1px solid #e3e8ee',
                          background: mockCategory === c.value ? '#ecfdf5' : '#ffffff',
                          color: mockCategory === c.value ? '#059669' : '#4b5563',
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={startMock}
                    className="practice-body"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 22px',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Icon name="play" size={14} style={{ color: '#fff' }} />
                    Start Mock Interview
                  </button>
                </div>
              ) : (
                /* Active state: question + timer + controls */
                <div>
                  {/* Timer bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span className="practice-body" style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="timer" size={14} style={{ color: '#10b981' }} />
                      {MOCK_CATEGORIES.find((c) => c.value === mockCategory)?.label}
                    </span>
                    <span className="practice-mono" style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(elapsed)}
                    </span>
                  </div>

                  {/* Question card */}
                  {mockQuestion && (
                    <div
                      style={{
                        padding: '20px',
                        borderRadius: '10px',
                        background: '#f9fafb',
                        border: '1px solid #e3e8ee',
                        marginBottom: '18px',
                      }}
                    >
                      <p className="practice-display" style={{ fontSize: '17px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                        {mockQuestion.label}
                      </p>
                      <p className="practice-body" style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        {mockQuestion.desc}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={nextQuestion}
                      className="practice-body"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        background: '#f3f4f6',
                        color: '#374151',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '8px',
                        border: '1px solid #e3e8ee',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Icon name="refresh" size={14} />
                      Next Question
                    </button>
                    <button
                      onClick={() => {
                        if (mockQuestion) handleTopicClick(mockQuestion);
                        stopMock();
                      }}
                      className="practice-body"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Icon name="arrowRight" size={14} style={{ color: '#fff' }} />
                      Practice This
                    </button>
                    <button
                      onClick={stopMock}
                      className="practice-body"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        marginLeft: 'auto',
                      }}
                    >
                      <Icon name="stop" size={14} />
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Interview Handbook — Free for all users ── */}
          <div style={{ marginTop: '40px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                paddingLeft: '14px',
                borderLeft: '4px solid #818cf8',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#818cf814',
                  color: '#818cf8',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              </div>
              <h2 className="practice-display" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Interview Handbook
              </h2>
              <span
                className="practice-body"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  letterSpacing: '0.02em',
                }}
              >
                FREE
              </span>
            </div>


            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              <Link
                to="/handbook"
                className="handbook-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <strong className="practice-body" style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Blind 75</strong>
                <span className="practice-body" style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>75 essential coding problems with solutions</span>
              </Link>
              <Link
                to="/handbook?tab=algorithms"
                className="handbook-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <strong className="practice-body" style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Algorithm Guides</strong>
                <span className="practice-body" style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>17 topics: Arrays, Trees, Graphs, DP...</span>
              </Link>
              <Link
                to="/handbook?tab=behavioral"
                className="handbook-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <strong className="practice-body" style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Behavioral Questions</strong>
                <span className="practice-body" style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>67 questions for Google, Amazon, Meta...</span>
              </Link>
              <Link
                to="/handbook?tab=cheatsheet"
                className="handbook-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <strong className="practice-body" style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Interview Cheatsheet</strong>
                <span className="practice-body" style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>Before, during, and after your interview</span>
              </Link>
            </div>
          </div>

          {/* ── Interview Cheatsheet Section ── */}
          <div style={{ marginTop: '40px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                paddingLeft: '14px',
                borderLeft: '4px solid #06b6d4',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#06b6d414',
                  color: '#06b6d4',
                }}
              >
                <Icon name="checklist" size={15} />
              </div>
              <h2 className="practice-display" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Interview Cheatsheet
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {[
                { title: 'Before the Interview', items: interviewCheatsheet.before, icon: 'clipboard' },
                { title: 'During the Interview', items: interviewCheatsheet.during, icon: 'play' },
                { title: 'After the Interview', items: interviewCheatsheet.after, icon: 'check' },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e3e8ee',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Icon name={card.icon} size={14} style={{ color: '#06b6d4' }} />
                    <h3 className="practice-display" style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      {card.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {card.items.map((item, idx) => (
                      <label
                        key={idx}
                        className="practice-body"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '13px',
                          color: '#4b5563',
                          lineHeight: 1.5,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginTop: '3px',
                            flexShrink: 0,
                            accentColor: '#06b6d4',
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Behavioral Questions Section ── */}
          <div style={{ marginTop: '40px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                paddingLeft: '14px',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f59e0b14',
                  color: '#f59e0b',
                }}
              >
                <Icon name="behavioral" size={15} />
              </div>
              <h2 className="practice-display" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Behavioral Questions
              </h2>
              <span
                className="practice-body"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#9ca3af',
                  background: '#f3f4f6',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {behavioralQuestions.general.length}
              </span>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e3e8ee',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {behavioralQuestions.general.slice(0, 10).map((q, idx) => (
                  <div
                    key={idx}
                    className="practice-body"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#374151',
                      lineHeight: 1.5,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '12px', flexShrink: 0, minWidth: '20px' }}>
                      {idx + 1}.
                    </span>
                    <span>{typeof q === 'string' ? q : q.q || ''}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link
                  to="/capra/prepare?page=behavioral"
                  className="practice-body"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#f59e0b',
                    textDecoration: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    transition: 'background 0.15s',
                  }}
                >
                  View all {behavioralQuestions.general.length} questions
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════ Footer ═══════════════════════ */}
      <footer
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e3e8ee',
          padding: '24px 0',
        }}
      >
        <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  background: '#10b981',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="ascend" size={11} style={{ color: '#fff' }} />
              </div>
              <span className="practice-display" style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                Camora
              </span>
            </Link>

            {/* Nav links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              {[
                { label: 'Apply', href: '/jobs' },
                { label: 'Prepare', href: '/capra/prepare' },
                { label: 'Practice', href: '/capra/practice' },
                { label: 'Attend', href: '/lumora' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Support', href: 'mailto:support@cariara.com' },
              ].map((link) => (
                link.href.startsWith('http') || link.href.startsWith('mailto:') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="practice-body footer-link"
                    style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="practice-body footer-link"
                    style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>

            {/* Copyright */}
            <p className="practice-body" style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════ Scoped Styles ═══════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');

        .practice-root {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .practice-display {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .practice-body {
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .practice-mono {
          font-family: 'IBM Plex Mono', 'Menlo', monospace;
        }

        html { scroll-behavior: smooth; }

        /* Card hover */
        .topic-card:hover {
          border-color: #d0d5dd !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06) !important;
        }

        /* Nav link hover */
        .nav-link:hover {
          color: #111827 !important;
          background: #f3f4f6;
        }

        /* Breadcrumb link hover */
        .breadcrumb-link:hover {
          color: #6b7280 !important;
        }

        /* Footer link hover */
        .footer-link:hover {
          color: #10b981 !important;
        }

        /* Handbook card hover */
        .handbook-card:hover {
          border-color: #d0d5dd !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06) !important;
        }

        /* Mock pill hover */
        .mock-pill:hover {
          border-color: #d0d5dd !important;
        }

        /* Mock start button hover */
        button[style*="background: #10b981"]:hover,
        button[style*="background: rgb(16, 185, 129)"]:hover {
          filter: brightness(0.93);
        }

        /* Remove button outlines on click */
        button:focus {
          outline: none;
        }
        button:focus-visible {
          outline: 2px solid #10b981;
          outline-offset: 2px;
        }

        /* Responsive grid override for smaller screens */
        @media (max-width: 640px) {
          .topic-card {
            padding: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
