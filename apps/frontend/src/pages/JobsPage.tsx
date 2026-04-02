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

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
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

const LOCATION_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'remote', label: 'Remote' },
  { value: 'us', label: 'US' },
  { value: 'san-francisco', label: 'San Francisco' },
  { value: 'new-york', label: 'New York' },
  { value: 'seattle', label: 'Seattle' },
  { value: 'europe', label: 'Europe' },
];

const SALARY_OPTIONS = [
  { value: '', label: 'Any Salary' },
  { value: '50000', label: '$50K+' },
  { value: '100000', label: '$100K+' },
  { value: '150000', label: '$150K+' },
  { value: '200000', label: '$200K+' },
  { value: '250000', label: '$250K+' },
  { value: '300000', label: '$300K+' },
];

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

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function JobsPage() {
  const { token, user, isLoading: authLoading, logout } = useAuth();

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [location, setLocation] = useState('all');
  const [minSalary, setMinSalary] = useState('');

  // Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);
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
      if (location !== 'all') params.set('location', location);
      if (minSalary) params.set('min_salary', minSalary);
      params.set('limit', '50');

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/v1/jobs?${params}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch jobs (${res.status})`);
      const data: JobsResponse = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setCompaniesCount(data.companies_count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [search, role, location, minSalary, token]);

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

  /* ── Select styling helper ── */
  const selectStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    background: '#ffffff',
    border: '1px solid #e3e8ee',
    borderRadius: '8px',
    padding: '8px 32px 8px 12px',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '140px',
  };

  return (
    <div style={{ background: '#f7f8f9', minHeight: '100vh' }}>

      {/* ═══════════════════════ Top Navigation ═══════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e3e8ee',
          height: '56px',
        }}
      >
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
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
                    transition: 'opacity 0.15s',
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
                    transition: 'opacity 0.15s',
                  }}
                >
                  Sign out
                </button>
              </>
            ) : !authLoading ? (
              <Link
                to="/capra/login"
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

        {/* ── Page Header ── */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4" style={{ fontSize: '13px', color: '#9ca3af' }}>
              <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Home</Link>
              <span>/</span>
              <span style={{ color: '#374151' }}>Jobs</span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.02em',
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>
              Find Your Next Role
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginTop: '8px',
              lineHeight: 1.6,
              maxWidth: '640px',
            }}>
              AI-matched engineering jobs from 1000+ companies. Part of the APPA pipeline — Apply, then Prepare.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 mt-4" style={{ fontSize: '14px', color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" fill="none" stroke="#10b981" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <strong style={{ color: '#111827' }}>{total}</strong> active jobs
              </span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" fill="none" stroke="#10b981" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <strong style={{ color: '#111827' }}>{companiesCount || '1,000+'}</strong> companies
              </span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span>Updated daily</span>
            </div>
          </div>
        </div>

        {/* ── Filter Bar (sticky) ── */}
        <div
          className="sticky z-30"
          style={{
            top: '56px',
            background: '#ffffff',
            borderBottom: '1px solid #e3e8ee',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                <svg
                  width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={2}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs, companies, tech..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    color: '#374151',
                    background: '#f7f8f9',
                    border: '1px solid #e3e8ee',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 36px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e3e8ee'; }}
                />
              </div>

              {/* Role dropdown */}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={selectStyle}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Location dropdown */}
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={selectStyle}
              >
                {LOCATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Salary dropdown */}
              <select
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                style={selectStyle}
              >
                {SALARY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Job Cards Grid ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {loading ? (
            /* Loading skeleton */
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e3e8ee',
                    borderRadius: '12px',
                    padding: '24px',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                >
                  <div style={{ width: '60%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ width: '80%', height: '18px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ width: '40%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '16px' }} />
                  <div className="flex gap-2">
                    <div style={{ width: '50px', height: '24px', background: '#e5e7eb', borderRadius: '12px' }} />
                    <div style={{ width: '50px', height: '24px', background: '#e5e7eb', borderRadius: '12px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error state */
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              background: '#ffffff',
              border: '1px solid #e3e8ee',
              borderRadius: '12px',
            }}>
              <svg width="48" height="48" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                Something went wrong
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
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
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
              >
                Try again
              </button>
            </div>
          ) : jobs.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              background: '#ffffff',
              border: '1px solid #e3e8ee',
              borderRadius: '12px',
            }}>
              <svg width="48" height="48" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                No jobs match your filters
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Try broadening your search.
              </p>
            </div>
          ) : (
            /* Job cards grid */
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
            >
              {jobs.map((job) => {
                const salary = formatSalary(job.salary_min, job.salary_max);
                const posted = timeAgo(job.posted_at);
                const techStack = job.ai_tech_stack || [];

                return (
                  <div
                    key={job.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e3e8ee',
                      borderRadius: '12px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e3e8ee';
                    }}
                  >
                    {/* Company + Location */}
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                        {job.company_name}
                      </span>
                      {job.location && (
                        <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {job.location}
                        </span>
                      )}
                    </div>

                    {/* Job title */}
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#111827',
                      margin: 0,
                      lineHeight: 1.3,
                      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    }}>
                      {job.title}
                    </h3>

                    {/* Salary + Source */}
                    <div className="flex items-center flex-wrap gap-2">
                      {salary && (
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#10b981',
                        }}>
                          {salary}
                        </span>
                      )}
                      {job.source && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#6b7280',
                          background: '#f3f4f6',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          textTransform: 'capitalize',
                        }}>
                          {job.source}
                        </span>
                      )}
                      {posted && (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {posted}
                        </span>
                      )}
                    </div>

                    {/* Tech stack tags */}
                    {techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {techStack.slice(0, 6).map((tech) => (
                          <span
                            key={tech}
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#065f46',
                              background: '#ecfdf5',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                        {techStack.length > 6 && (
                          <span style={{ fontSize: '11px', color: '#9ca3af', padding: '2px 4px' }}>
                            +{techStack.length - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Spacer to push buttons to bottom */}
                    <div style={{ flex: 1 }} />

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#374151',
                          background: '#ffffff',
                          border: '1px solid #e3e8ee',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e3e8ee';
                        }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        View Job
                      </a>
                      <Link
                        to={`/lumora?company=${encodeURIComponent(job.company_name)}&role=${encodeURIComponent(job.title)}`}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ffffff',
                          background: '#10b981',
                          border: '1px solid #10b981',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                        Prepare
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Pulse animation for loading skeleton ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
