import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ──────────────────────────────── Constants ──────────────────────────────── */

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';

const navLinks = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'devops', label: 'DevOps' },
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'data', label: 'Data' },
  { value: 'ml', label: 'ML/AI' },
  { value: 'sre', label: 'SRE' },
  { value: 'platform', label: 'Platform' },
  { value: 'cloud', label: 'Cloud' },
];

const CATEGORY_COLORS: Record<string, string> = {
  devops: '#06b6d4',
  backend: '#10b981',
  frontend: '#8b5cf6',
  fullstack: '#3b82f6',
  data: '#f59e0b',
  ml: '#ec4899',
  sre: '#ef4444',
  platform: '#14b8a6',
  cloud: '#6366f1',
};

const DEFAULT_COLOR = '#6b7280';

/* ──────────────────────────────── Types ──────────────────────────────── */

interface Job {
  id: string;
  company_name: string;
  title: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  job_url: string;
  source?: string;
  posted_at?: string;
  ai_tech_stack?: string[];
  description?: string;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
  companies_count?: number;
}

/* ──────────────────────────────── Helpers ──────────────────────────────── */

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Salary: Not disclosed';
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Salary: Not disclosed';
}

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('devops') || t.includes('dev ops')) return 'devops';
  if (t.includes('sre') || t.includes('site reliability')) return 'sre';
  if (t.includes('ml') || t.includes('machine learning') || t.includes('ai ') || t.includes('artificial intelligence') || t.includes('deep learning') || t.includes('nlp')) return 'ml';
  if (t.includes('data') || t.includes('analytics') || t.includes('etl')) return 'data';
  if (t.includes('full stack') || t.includes('fullstack') || t.includes('full-stack')) return 'fullstack';
  if (t.includes('frontend') || t.includes('front-end') || t.includes('front end') || t.includes('react') || t.includes('vue') || t.includes('angular') || t.includes('ui engineer')) return 'frontend';
  if (t.includes('backend') || t.includes('back-end') || t.includes('back end') || t.includes('server') || t.includes('api engineer')) return 'backend';
  if (t.includes('platform')) return 'platform';
  if (t.includes('cloud') || t.includes('aws') || t.includes('azure') || t.includes('gcp') || t.includes('infrastructure')) return 'cloud';
  return 'backend'; // default fallback
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

function getCategoryLabel(category: string): string {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? found.label : 'Engineering';
}

function detectWorkType(location?: string): string {
  if (!location) return 'Onsite';
  const l = location.toLowerCase();
  if (l.includes('remote')) return 'Remote';
  if (l.includes('hybrid')) return 'Hybrid';
  return 'Onsite';
}

/* ──────────────────────────────── SVG Icons ──────────────────────────────── */

function CategoryIcon({ category, size = 28 }: { category: string; size?: number }) {
  const props = { width: size, height: size, fill: 'none', stroke: '#ffffff', strokeWidth: 1.8, viewBox: '0 0 24 24', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (category) {
    case 'devops':
      return (
        <svg {...props}>
          <path d="M18.178 8c5.096 5.096-2.066 12.258-7.178 7.996C5.89 20.258-1.272 13.096 3.822 8 8.918 2.904 13.082 2.904 18.178 8z" />
          <path d="M11 12a1 1 0 102 0 1 1 0 00-2 0" />
        </svg>
      );
    case 'backend':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="6" rx="1" />
          <rect x="3" y="14" width="18" height="6" rx="1" />
          <circle cx="7" cy="7" r="1" fill="#ffffff" stroke="none" />
          <circle cx="7" cy="17" r="1" fill="#ffffff" stroke="none" />
        </svg>
      );
    case 'frontend':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case 'fullstack':
      return (
        <svg {...props}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'data':
      return (
        <svg {...props}>
          <rect x="3" y="12" width="4" height="9" rx="0.5" />
          <rect x="10" y="7" width="4" height="14" rx="0.5" />
          <rect x="17" y="3" width="4" height="18" rx="0.5" />
        </svg>
      );
    case 'ml':
      return (
        <svg {...props}>
          <path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5" />
          <path d="M12 2a4 4 0 00-4 4c0 1.5.8 2.8 2 3.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 15v4M8 20h8" />
          <path d="M9 9.5L6 12M15 9.5l3 2.5" />
        </svg>
      );
    case 'sre':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'platform':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'cloud':
      return (
        <svg {...props}>
          <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      );
  }
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function JobsPage() {
  const { token, user, isLoading: authLoading, logout } = useAuth();

  // Map user's onboarding role to job filter category
  const getUserCategory = (): string => {
    const roles = user?.job_roles;
    if (!roles || roles.length === 0) return 'all';
    const r = (Array.isArray(roles) ? roles[0] : roles).toLowerCase();
    if (r.includes('devops') || r.includes('dev ops')) return 'devops';
    if (r.includes('sre') || r.includes('site reliability')) return 'sre';
    if (r.includes('ml') || r.includes('ai')) return 'ml';
    if (r.includes('data')) return 'data';
    if (r.includes('full stack') || r.includes('fullstack')) return 'fullstack';
    if (r.includes('frontend') || r.includes('front')) return 'frontend';
    if (r.includes('backend') || r.includes('back')) return 'backend';
    if (r.includes('platform')) return 'platform';
    if (r.includes('cloud') || r.includes('infrastructure')) return 'cloud';
    return 'all';
  };

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [roleInitialized, setRoleInitialized] = useState(false);

  // Set role from user profile once auth loads
  useEffect(() => {
    if (!authLoading && user && !roleInitialized) {
      const cat = getUserCategory();
      if (cat !== 'all') setRole(cat);
      setRoleInitialized(true);
    }
  }, [authLoading, user, roleInitialized]);

  // Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ── Fetch jobs ── */
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role !== 'all') params.set('role', role);
      params.set('limit', '50');

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/v1/jobs?${params}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch jobs (${res.status})`);
      const data: JobsResponse = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [search, role, token]);

  /* ── Debounced fetch on filter change ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  /* ── Scroll to top on mount ── */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* ── Filtered jobs by selected category pill ── */
  const filteredJobs = role === 'all'
    ? jobs
    : jobs.filter((job) => detectCategory(job.title) === role);

  return (
    <div style={{ background: '#f7f8f9', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', 'Work Sans', system-ui, sans-serif" }}>

      {/* ═══════════════════════ Top Navigation ═══════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e3e8ee',
          height: '56px',
        }}
      >
        <div className="max-w-[85%] xl:max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="flex items-center justify-center"
              style={{
                width: '28px',
                height: '28px',
                background: '#10b981',
                borderRadius: '8px',
              }}
            >
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>C</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Camora
            </span>
          </Link>

          {/* Center: Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = link.label === 'Apply';
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className="jobs-nav-link"
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    transition: 'color 0.15s, background 0.15s',
                    textDecoration: 'none',
                    color: isActive ? '#10b981' : '#4b5563',
                    borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
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
                <Link
                  to="/capra/prepare"
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#10b981',
                    textDecoration: 'none',
                  }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#dc2626',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </>
            ) : !authLoading ? (
              <Link
                to="/login"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#4b5563',
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            ) : null}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5"
              style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ Mobile Menu ═══════════════════════ */}
      {mobileMenuOpen && (
        <div
          className="fixed top-14 left-0 right-0 z-40 md:hidden"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e3e8ee',
            padding: '8px 16px',
          }}
        >
          {navLinks.map((link) => {
            const isActive = link.label === 'Apply';
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#10b981' : '#4b5563',
                  textDecoration: 'none',
                  borderRadius: '6px',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════ Page Content ═══════════════════════ */}
      <div style={{ paddingTop: '56px' }}>

        {/* ── Hero Section (MetAntz-inspired) ── */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf9 100%)',
            borderBottom: '1px solid #e3e8ee',
          }}
        >
          <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '56px', paddingBottom: '48px', textAlign: 'center' }}>
            {/* Accent subtitle */}
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#10b981',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 16px 0',
            }}>
              Your APPA journey starts here
            </p>

            {/* Main heading */}
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 auto 16px auto',
              maxWidth: '700px',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>
              Find the right job — without searching
            </h1>

            {/* Search bar */}
            <div style={{
              maxWidth: '640px',
              margin: '0 auto',
              position: 'relative',
            }}>
              <div
                className="jobs-search-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  borderRadius: '9999px',
                  border: '1px solid #e3e8ee',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  padding: '4px 4px 4px 20px',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                {/* Filter icon */}
                <svg width="20" height="20" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.8} style={{ flexShrink: 0, marginRight: '12px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs, companies, technologies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    color: '#374151',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '12px 0',
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  }}
                />
                <button
                  onClick={fetchJobs}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    background: '#10b981',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
                  aria-label="Search"
                >
                  <svg width="18" height="18" fill="none" stroke="#ffffff" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6" style={{ marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" fill="none" stroke="#10b981" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <strong style={{ color: '#111827' }}>{total}</strong> active jobs
              </span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span>Updated daily</span>
            </div>
          </div>
        </div>

        {/* ── Category Pills (Etched-inspired) ── */}
        <div
          className="sticky z-30"
          style={{
            top: '56px',
            background: '#ffffff',
            borderBottom: '1px solid #e3e8ee',
          }}
        >
          <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="jobs-pills-scroll"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                overflowX: 'auto',
                paddingTop: '12px',
                paddingBottom: '0',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = role === cat.value;
                const pillColor = cat.value === 'all' ? '#10b981' : (CATEGORY_COLORS[cat.value] || DEFAULT_COLOR);
                return (
                  <button
                    key={cat.value}
                    onClick={() => setRole(cat.value)}
                    style={{
                      fontSize: '14px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#111827' : '#6b7280',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? `3px solid ${pillColor}` : '3px solid transparent',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s, border-color 0.15s',
                      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Job Cards Grid ── */}
        <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {loading ? (
            /* Loading skeleton */
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="jobs-skeleton-card"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e3e8ee',
                    borderRadius: '16px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: '80px', background: '#e5e7eb', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                  <div style={{ padding: '20px' }}>
                    <div style={{ width: '75%', height: '16px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '12px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    <div style={{ width: '55%', height: '12px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '10px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    <div style={{ width: '40%', height: '12px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '16px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    <div className="flex gap-2">
                      <div style={{ width: '60px', height: '24px', background: '#e5e7eb', borderRadius: '12px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                      <div style={{ width: '60px', height: '24px', background: '#e5e7eb', borderRadius: '12px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error state */
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: '#ffffff',
              border: '1px solid #e3e8ee',
              borderRadius: '16px',
            }}>
              <svg width="48" height="48" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Something went wrong
              </p>
              <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px' }}>
                {error}
              </p>
              <button
                onClick={fetchJobs}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '12px 32px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
              >
                Try again
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: '#ffffff',
              border: '1px solid #e3e8ee',
              borderRadius: '16px',
            }}>
              <svg width="48" height="48" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                No jobs match your filters
              </p>
              <p style={{ fontSize: '15px', color: '#6b7280' }}>
                Try broadening your search or selecting a different category.
              </p>
            </div>
          ) : (
            /* Job cards grid */
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {filteredJobs.map((job) => {
                const category = detectCategory(job.title);
                const color = getCategoryColor(category);
                const categoryLabel = getCategoryLabel(category);
                const workType = detectWorkType(job.location);
                const salary = formatSalary(job.salary_min, job.salary_max);

                return (
                  <div
                    key={job.id}
                    className="jobs-card"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e3e8ee',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'box-shadow 0.25s, transform 0.25s, border-color 0.25s',
                      cursor: 'default',
                    }}
                  >
                    {/* Colored header */}
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                        height: '80px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Decorative dots */}
                      <div style={{ position: 'absolute', top: '12px', right: '14px', display: 'flex', gap: '4px', opacity: 0.3 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                      </div>
                      {/* Icon circle */}
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <CategoryIcon category={category} size={26} />
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                      {/* Title */}
                      <h3 style={{
                        fontSize: '17px',
                        fontWeight: 700,
                        color: '#111827',
                        margin: 0,
                        lineHeight: 1.35,
                        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                      }}>
                        {job.title}
                      </h3>

                      {/* Company */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#4b5563' }}>
                        <svg width="14" height="14" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                        <span style={{ fontWeight: 500 }}>{job.company_name}</span>
                      </div>

                      {/* Location */}
                      {job.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                          <svg width="13" height="13" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span>{job.location}</span>
                        </div>
                      )}

                      {/* Tags row */}
                      <div className="flex flex-wrap gap-1.5" style={{ marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: color,
                            background: `${color}14`,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            border: `1px solid ${color}30`,
                          }}
                        >
                          {categoryLabel}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: workType === 'Remote' ? '#059669' : workType === 'Hybrid' ? '#d97706' : '#6b7280',
                            background: workType === 'Remote' ? '#ecfdf5' : workType === 'Hybrid' ? '#fffbeb' : '#f3f4f6',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            border: `1px solid ${workType === 'Remote' ? '#a7f3d0' : workType === 'Hybrid' ? '#fde68a' : '#e5e7eb'}`,
                          }}
                        >
                          {workType}
                        </span>
                      </div>

                      {/* Salary */}
                      <p style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: (job.salary_min || job.salary_max) ? '#111827' : '#9ca3af',
                        margin: '4px 0 0 0',
                      }}>
                        {salary}
                      </p>

                      {/* Spacer */}
                      <div style={{ flex: 1 }} />

                      {/* Action links */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '14px', marginTop: '6px' }}>
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jobs-action-link"
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#10b981',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'color 0.15s',
                          }}
                        >
                          Apply Now
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </a>
                        <Link
                          to={`/jobs/${job.id}/prepare`}
                          className="jobs-action-link-gray"
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#6b7280',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'color 0.15s',
                          }}
                        >
                          Prepare
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>C</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
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
                link.href.startsWith('mailto:') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="jobs-footer-link"
                    style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="jobs-footer-link"
                    style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>

            {/* Copyright */}
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════ Scoped Styles ═══════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700&display=swap');

        @keyframes jobs-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Hide scrollbar on pills row */
        .jobs-pills-scroll::-webkit-scrollbar {
          display: none;
        }

        /* Card hover */
        .jobs-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.08) !important;
          border-color: #d1d5db !important;
          transform: translateY(-2px);
        }

        /* Search bar focus-within */
        .jobs-search-bar:focus-within {
          border-color: #10b981 !important;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.12) !important;
        }

        /* Nav link hover */
        .jobs-nav-link:hover {
          color: #111827 !important;
          background: #f3f4f6;
        }

        /* Action link hovers */
        .jobs-action-link:hover {
          color: #059669 !important;
        }
        .jobs-action-link-gray:hover {
          color: #374151 !important;
        }

        /* Footer link hover */
        .jobs-footer-link:hover {
          color: #10b981 !important;
        }

        /* Remove button outlines on click */
        button:focus {
          outline: none;
        }
        button:focus-visible {
          outline: 2px solid #10b981;
          outline-offset: 2px;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .jobs-card {
            border-radius: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
