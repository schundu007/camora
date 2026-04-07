import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';

/* ──────────────────────────────── Constants ──────────────────────────────── */

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';


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
  const { token, user, isLoading: authLoading } = useAuth();

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

  const navigate = useNavigate();

  // Job URL analysis state
  const [jobUrl, setJobUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  // Fallback: paste JD text directly
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [jdText, setJdText] = useState('');

  const analyzeJobUrl = async () => {
    if (!jobUrl.trim()) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setShowTextFallback(false);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${CAPRA_API_URL}/api/job-analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.partial) {
          setShowTextFallback(true);
          setAnalyzeError(data.error || 'Could not scrape this URL.');
        } else {
          setAnalyzeError(data.error || 'Failed to analyze job URL');
        }
        return;
      }
      navigateToPrep(data);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeJobText = async () => {
    if (!jdText.trim() || jdText.trim().length < 50) {
      setAnalyzeError('Please paste at least 50 characters of the job description.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${CAPRA_API_URL}/api/job-analyze/text`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: jdText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAnalyzeError(data.error || 'Failed to analyze job description');
        return;
      }
      navigateToPrep(data);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const navigateToPrep = (analysis: any) => {
    // Store full analysis in sessionStorage so the prep page can use it
    sessionStorage.setItem('jobAnalysis', JSON.stringify(analysis));
    // Navigate to the job prep page with 'url' as the ID — JobPrepPage will detect this
    navigate('/jobs/url/prepare');
  };

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
    <div style={{ background: 'transparent', minHeight: '100vh' }}>

      <SiteNav />

      {/* ═══════════════════════ Page Content ═══════════════════════ */}
      <div style={{ paddingTop: '56px' }}>

        {/* ── Hero Section (MetAntz-inspired) ── */}
        <div
          style={{
            background: 'transparent',
          }}
        >
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '24px', paddingBottom: '20px', textAlign: 'center' }}>
            {/* Main heading — compact */}
            <h1 className="heading-1" style={{
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 auto 12px auto',
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
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6" style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>
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

        {/* ── Job URL Analysis Section ── */}
        <div style={{ background: 'transparent' }}>
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
            {!showUrlInput ? (
              <button
                onClick={() => setShowUrlInput(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '0 auto',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  background: '#f9fafb',
                  border: '1px dashed #d1d5db',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" />
                </svg>
                Have a job URL? Paste it to get a personalized prep plan
              </button>
            ) : (
              <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Paste a Job URL
                  </h3>
                  <button
                    onClick={() => { setShowUrlInput(false); setAnalyzeError(null); setShowTextFallback(false); }}
                    style={{ fontSize: '13px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Close
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Paste any job listing URL (Workday, Greenhouse, Lever, LinkedIn, etc.) and we'll analyze it to create a personalized interview prep plan.
                </p>

                {/* URL input row */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="url"
                    placeholder="https://company.jobs/senior-devops-engineer..."
                    value={jobUrl}
                    onChange={(e) => { setJobUrl(e.target.value); setAnalyzeError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !analyzing) analyzeJobUrl(); }}
                    disabled={analyzing}
                    style={{
                      flex: 1,
                      fontSize: '14px',
                      color: '#374151',
                      padding: '10px 14px',
                      border: '1px solid #e3e8ee',
                      borderRadius: '8px',
                      outline: 'none',
                      background: analyzing ? '#f9fafb' : '#ffffff',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e3e8ee'; }}
                  />
                  <button
                    onClick={analyzeJobUrl}
                    disabled={analyzing || !jobUrl.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#ffffff',
                      background: analyzing ? '#6ee7b7' : (!jobUrl.trim() ? '#d1d5db' : '#10b981'),
                      border: 'none',
                      borderRadius: '8px',
                      cursor: analyzing || !jobUrl.trim() ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { if (!analyzing && jobUrl.trim()) e.currentTarget.style.background = '#059669'; }}
                    onMouseLeave={(e) => { if (!analyzing && jobUrl.trim()) e.currentTarget.style.background = '#10b981'; }}
                  >
                    {analyzing ? (
                      <>
                        <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Analyze &amp; Prepare
                      </>
                    )}
                  </button>
                </div>

                {/* Error message */}
                {analyzeError && (
                  <div style={{ fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                    {analyzeError}
                  </div>
                )}

                {/* Text fallback — when URL scraping fails */}
                {showTextFallback && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>
                      Paste the job description text directly instead:
                    </p>
                    <textarea
                      placeholder="Paste the full job description here..."
                      value={jdText}
                      onChange={(e) => { setJdText(e.target.value); setAnalyzeError(null); }}
                      disabled={analyzing}
                      rows={6}
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        color: '#374151',
                        padding: '10px 14px',
                        border: '1px solid #e3e8ee',
                        borderRadius: '8px',
                        outline: 'none',
                        resize: 'vertical',
                        lineHeight: 1.5,
                        marginBottom: '8px',
                      }}
                    />
                    <button
                      onClick={analyzeJobText}
                      disabled={analyzing || jdText.trim().length < 50}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#ffffff',
                        background: analyzing ? '#6ee7b7' : (jdText.trim().length < 50 ? '#d1d5db' : '#10b981'),
                        border: 'none',
                        borderRadius: '8px',
                        cursor: analyzing || jdText.trim().length < 50 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Job Description'}
                    </button>
                  </div>
                )}

                {/* Supported platforms hint */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Supports:</span>
                  {['Workday', 'Greenhouse', 'Lever', 'Ashby', 'LinkedIn', 'Indeed'].map((p) => (
                    <span key={p} style={{ fontSize: '11px', color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{p}</span>
                  ))}
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>& more</span>
                </div>
              </div>
            )}
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
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
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
              <p className="heading-2" style={{ marginBottom: '8px' }}>
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
              <p className="heading-2" style={{ marginBottom: '8px' }}>
                No jobs match your filters
              </p>
              <p style={{ fontSize: '15px', color: '#6b7280' }}>
                Try broadening your search or selecting a different category.
              </p>
            </div>
          ) : (
            /* Job cards grid */
            <div
              style={{ columnGap: '20px' }}
              className="jobs-grid"
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
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'default',
                    }}
                  >
                    {/* Compact colored strip + title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `linear-gradient(135deg, ${color}, ${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CategoryIcon category={category} size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.title}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.company_name}</div>
                      </div>
                      <div className="flex gap-1" style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, color, background: `${color}14`, padding: '2px 8px', borderRadius: '9999px', border: `1px solid ${color}30` }}>{categoryLabel}</span>
                      </div>
                    </div>

                    {/* Expandable details — pushes only cards below in same column */}
                    <div className="jobs-card-details" style={{ maxHeight: '0', overflow: 'hidden', transition: 'max-height 0.35s ease, padding 0.35s ease', padding: '0 16px' }}>
                      {/* Location + Work Type */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '13px', color: '#4b5563' }}>
                        {job.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="13" height="13" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            <span>{job.location}</span>
                          </div>
                        )}
                        <span style={{ fontSize: '11px', fontWeight: 600, color: workType === 'Remote' ? '#059669' : workType === 'Hybrid' ? '#d97706' : '#6b7280', background: workType === 'Remote' ? '#ecfdf5' : workType === 'Hybrid' ? '#fffbeb' : '#f3f4f6', padding: '2px 8px', borderRadius: '9999px' }}>{workType}</span>
                      </div>

                      {/* Salary */}
                      <p style={{ fontSize: '14px', fontWeight: 600, color: (job.salary_min || job.salary_max) ? '#111827' : '#9ca3af', margin: '10px 0 0 0' }}>
                        {salary}
                      </p>

                      {/* Action links */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '12px', paddingBottom: '14px' }}>
                        <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="jobs-action-link" style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Apply Now
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </a>
                        <Link to={`/jobs/${job.id}/prepare`} className="jobs-action-link-gray" style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Prepare
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
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

      <SiteFooter />

      {/* ═══════════════════════ Scoped Styles ═══════════════════════ */}
      <style>{`
        @keyframes jobs-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Hide scrollbar on pills row */
        .jobs-pills-scroll::-webkit-scrollbar {
          display: none;
        }

        /* Card hover — expand only the hovered card */
        .jobs-card {
          transition: box-shadow 0.3s, border-color 0.3s;
          position: relative;
          z-index: 1;
          break-inside: avoid;
          margin-bottom: 20px;
        }
        .jobs-card:hover {
          box-shadow: 0 12px 40px rgba(0,0,0,0.15) !important;
          border-color: #7c8db5 !important;
          z-index: 10;
        }
        .jobs-card:hover .jobs-card-details {
          max-height: 200px !important;
          padding: 0 16px !important;
        }
        .jobs-grid { column-count: 4; }
        @media (max-width: 1280px) {
          .jobs-grid { column-count: 3; }
        }
        @media (max-width: 960px) {
          .jobs-grid { column-count: 2; }
        }
        @media (max-width: 640px) {
          .jobs-grid { column-count: 1; }
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
