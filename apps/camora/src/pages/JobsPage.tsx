import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/shared/Icons';
import { HeroBand, HeroAccent } from '../components/capra/ui';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';

/* ──────────────────────────── Company Logo Mapping ──────────────────────────── */

const COMPANY_LOGO_MAP: Record<string, string> = {
  // Tech giants
  google: '/logos/google.png', alphabet: '/logos/google.png', 'google cloud': '/logos/gcp.png',
  amazon: '/logos/amazon.png', 'amazon web services': '/logos/aws.png', aws: '/logos/aws.png',
  meta: '/logos/meta.png', facebook: '/logos/facebook.png', instagram: '/logos/instagram.png', whatsapp: '/logos/whatsapp.png',
  microsoft: '/logos/microsoft.png', github: '/logos/github.png', linkedin: '/logos/linkedin.png', azure: '/logos/azure.png',
  apple: '/logos/apple.png', netflix: '/logos/netflix.png', uber: '/logos/uber.png', airbnb: '/logos/airbnb.png',
  nvidia: '/logos/nvidia.png', oracle: '/logos/oracle.png', ibm: '/logos/ibm.png', intel: '/logos/intel.png',
  samsung: '/logos/samsung.png', adobe: '/logos/adobe.png', cisco: '/logos/cisco.png', vmware: '/logos/vmware.png',
  salesforce: '/logos/salesforce.png', tesla: '/logos/tesla.png', spacex: '/logos/spacex.png',
  // Payments & fintech
  stripe: '/logos/stripe.png', paypal: '/logos/paypal.png', shopify: '/logos/shopify.png', block: '/logos/block.png',
  square: '/logos/square.png', coinbase: '/logos/coinbase.png', robinhood: '/logos/robinhood.png',
  visa: '/logos/visa.png', mastercard: '/logos/mastercard.png', 'american express': '/logos/amex.png', amex: '/logos/amex.png',
  // Social & media
  spotify: '/logos/spotify.png', discord: '/logos/discord.png', slack: '/logos/slack.png',
  twitter: '/logos/twitter.png', 'x corp': '/logos/twitter.png', x: '/logos/twitter.png',
  zoom: '/logos/zoom.png', tiktok: '/logos/tiktok.png', bytedance: '/logos/bytedance.png',
  reddit: '/logos/reddit.png', twitch: '/logos/twitch.png', pinterest: '/logos/pinterest.png',
  snap: '/logos/snap.png', snapchat: '/logos/snap.png', lyft: '/logos/lyft.png',
  doordash: '/logos/doordash.png', tinder: '/logos/tinder.png', ticketmaster: '/logos/ticketmaster.png',
  youtube: '/logos/youtube.png', gmail: '/logos/gmail.png',
  // Cloud & DevOps
  docker: '/logos/docker.png', vercel: '/logos/vercel.png', railway: '/logos/railway.png',
  terraform: '/logos/terraform.png', sentry: '/logos/sentry.png', figma: '/logos/figma.png',
  dropbox: '/logos/dropbox.png', openai: '/logos/openai.png', anthropic: '/logos/anthropic.png',
  cloudflare: '/logos/cloudflare.png', datadog: '/logos/datadog.png', hashicorp: '/logos/hashicorp.png',
  snowflake: '/logos/snowflake.png', databricks: '/logos/databricks.png', elastic: '/logos/elastic.png',
  splunk: '/logos/splunk.png', pagerduty: '/logos/pagerduty.png', crowdstrike: '/logos/crowdstrike.png',
  supabase: '/logos/supabase.png', netlify: '/logos/netlify.png', digitalocean: '/logos/digitalocean.png',
  mongodb: '/logos/mongodb.png', atlassian: '/logos/atlassian.png', twilio: '/logos/twilio.png',
  palantir: '/logos/palantir.png', okta: '/logos/okta.png',
  // SaaS & productivity
  workday: '/logos/workday.png', servicenow: '/logos/servicenow.png',
  notion: '/logos/notion.png', asana: '/logos/asana.png', monday: '/logos/monday.png',
  hubspot: '/logos/hubspot.png', zendesk: '/logos/zendesk.png', freshworks: '/logos/freshworks.png',
  canva: '/logos/canva.png', grammarly: '/logos/grammarly.png',
  // Finance
  'jpmorgan': '/logos/jpmorgan.png', 'jp morgan': '/logos/jpmorgan.png', 'j.p. morgan': '/logos/jpmorgan.png',
  'goldman sachs': '/logos/goldman.png', goldman: '/logos/goldman.png',
  'morgan stanley': '/logos/morgan-stanley.png', 'capital one': '/logos/capital-one.png',
  'wells fargo': '/logos/wells-fargo.png', 'bank of america': '/logos/bank-of-america.png',
  citi: '/logos/citi.png', citigroup: '/logos/citi.png', citibank: '/logos/citi.png',
  bloomberg: '/logos/bloomberg.png',
  // Consulting
  accenture: '/logos/accenture.png', deloitte: '/logos/deloitte.png', mckinsey: '/logos/mckinsey.png',
  // Retail
  walmart: '/logos/walmart.png', target: '/logos/target.png',
  // Gaming
  roblox: '/logos/roblox.png', unity: '/logos/unity.png', 'epic games': '/logos/epic.png',
  ea: '/logos/ea.png', 'electronic arts': '/logos/ea.png', activision: '/logos/activision.png',
  // Hardware
  qualcomm: '/logos/qualcomm.png', amd: '/logos/amd.png', dell: '/logos/dell.png', hp: '/logos/hp.png',
};

/** Match a free-text company_name to a local logo path */
function getCompanyLogoPath(companyName: string): string | null {
  const name = companyName.toLowerCase().trim();
  // Direct match
  if (COMPANY_LOGO_MAP[name]) return COMPANY_LOGO_MAP[name];
  // Partial match — check if any key is contained in the company name
  for (const [key, path] of Object.entries(COMPANY_LOGO_MAP)) {
    if (name.includes(key) || key.includes(name)) return path;
  }
  return null;
}

/* ──────────────────────────────── Constants ──────────────────────────────── */

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';


const CATEGORIES = [
  { value: 'all', label: 'All' },
  // Core engineering
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  // Infrastructure & Ops
  { value: 'devops', label: 'DevOps' },
  { value: 'sre', label: 'SRE' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'platform', label: 'Platform' },
  { value: 'network', label: 'Network' },
  // Data & AI
  { value: 'data', label: 'Data' },
  { value: 'ml', label: 'ML/AI' },
  // Specialized
  { value: 'security', label: 'Security' },
  { value: 'qa', label: 'QA/Test' },
  { value: 'embedded', label: 'Embedded' },
  { value: 'blockchain', label: 'Web3' },
  { value: 'game_dev', label: 'Gaming' },
  // Leadership
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal' },
  { value: 'em', label: 'Eng Manager' },
  { value: 'architect', label: 'Architect' },
  { value: 'tpm', label: 'TPM' },
  { value: 'product_manager', label: 'Product' },
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
  posted_date?: string;
  date_found?: string;
  ai_tech_stack?: string[];
  ai_summary?: string;
  department?: string;
  company_industry?: string;
  description?: string;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
  companies_count?: number;
  last_updated?: string;
}

interface FilterOption {
  name: string;
  count: number;
}

interface FiltersResponse {
  sources: FilterOption[];
  locations: FilterOption[];
  departments: FilterOption[];
  companies: FilterOption[];
  salary_range: { min: number | null; max: number | null };
}

const WORK_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
];

const EXPERIENCE_LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'intern', label: 'Intern' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal+' },
  { value: 'lead', label: 'Lead / Manager' },
];

const POSTED_WITHIN = [
  { value: '', label: 'Any Time' },
  { value: '1', label: 'Today' },
  { value: '3', label: 'Past 3 Days' },
  { value: '7', label: 'Past Week' },
  { value: '14', label: 'Past 2 Weeks' },
  { value: '30', label: 'Past Month' },
];

/* ──────────────────────────────── Helpers ──────────────────────────────── */

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function timeAgo(dateStr?: string): string | null {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return null;
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return 'Just now';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function detectWorkType(location?: string): string {
  if (!location) return 'Onsite';
  const l = location.toLowerCase();
  if (l.includes('remote')) return 'Remote';
  if (l.includes('hybrid')) return 'Hybrid';
  return 'Onsite';
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function JobsPage() {
  const { token, user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    document.title = 'Job Board | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  // Map all onboarding roles to job filter categories (multi-role aware)
  const getUserCategories = (): string[] => {
    const userRoles = user?.job_roles;
    if (!userRoles || userRoles.length === 0) return [];
    const roleMap: Record<string, string> = {
      backend: 'backend', frontend: 'frontend', fullstack: 'fullstack',
      devops: 'devops', data: 'data', ml: 'ml', mobile: 'mobile',
      qa: 'qa', em: 'em', architect: 'architect',
      cloud: 'cloud', platform: 'platform', security: 'security',
      sre: 'sre', data_scientist: 'data', data_analyst: 'data',
      tech_lead: 'tech_lead', staff: 'staff', principal: 'principal',
      tpm: 'tpm', product_manager: 'product_manager',
      ios: 'ios', android: 'android', blockchain: 'blockchain',
      game_dev: 'game_dev', embedded: 'embedded', dba: 'data',
      network: 'network', ai_researcher: 'ml', devsecops: 'devops',
    };
    const mapOne = (r: string): string => {
      if (roleMap[r]) return roleMap[r];
      if (r.includes('devops') || r.includes('dev ops')) return 'devops';
      if (r.includes('sre') || r.includes('site reliability')) return 'sre';
      if (r.includes('security')) return 'security';
      if (r.includes('ml') || r.includes('ai') || r.includes('machine learning')) return 'ml';
      if (r.includes('data')) return 'data';
      if (r.includes('ios')) return 'ios';
      if (r.includes('android')) return 'android';
      if (r.includes('mobile')) return 'mobile';
      if (r.includes('qa') || r.includes('test')) return 'qa';
      if (r.includes('embedded') || r.includes('firmware')) return 'embedded';
      if (r.includes('fullstack') || r.includes('full stack')) return 'fullstack';
      if (r.includes('frontend') || r.includes('front')) return 'frontend';
      if (r.includes('backend') || r.includes('back')) return 'backend';
      if (r.includes('platform')) return 'platform';
      if (r.includes('cloud') || r.includes('infrastructure')) return 'cloud';
      if (r.includes('manager')) return 'em';
      if (r.includes('lead')) return 'tech_lead';
      if (r.includes('architect')) return 'architect';
      if (r.includes('blockchain') || r.includes('web3')) return 'blockchain';
      if (r.includes('game')) return 'game_dev';
      return '';
    };
    const list = Array.isArray(userRoles) ? userRoles : [userRoles];
    const result: string[] = [];
    for (const r of list) {
      const cat = mapOne(String(r).toLowerCase());
      if (cat && !result.includes(cat)) result.push(cat);
    }
    return result;
  };

  // Filters
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInitialized, setRoleInitialized] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [locCountry, setLocCountry] = useState('');
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locationAutoDetected, setLocationAutoDetected] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [postedWithinFilter, setPostedWithinFilter] = useState('3');
  const [salaryMinFilter, setSalaryMinFilter] = useState('');
  const [salaryMaxFilter, setSalaryMaxFilter] = useState('');
  const [excludeVisaRestrictions, setExcludeVisaRestrictions] = useState(false);

  // Filter options from API
  const [availableSources, setAvailableSources] = useState<FilterOption[]>([]);
  const [availableLocations, setAvailableLocations] = useState<FilterOption[]>([]);
  const [, setAvailableDepartments] = useState<FilterOption[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<FilterOption[]>([]);
  const [, setSalaryRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Parse availableLocations into Country → State → City hierarchy
  const parsedLocations = useMemo(() => {
    const countryCounts = new Map<string, number>();
    const stateMap = new Map<string, Map<string, number>>();
    const cityMap = new Map<string, Map<string, number>>();
    let hasRemote = false;

    for (const loc of availableLocations) {
      const name = loc.name.trim();
      if (/remote/i.test(name)) { hasRemote = true; continue; }

      const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
      let country = '', state = '', city = '';

      if (parts.length >= 3) {
        city = parts[0]; state = parts[1]; country = parts.slice(2).join(', ');
      } else if (parts.length === 2) {
        if (/^[A-Z]{2}$/.test(parts[1])) {
          city = parts[0]; state = parts[1]; country = 'United States';
        } else {
          state = parts[0]; country = parts[1];
        }
      } else if (parts.length === 1) {
        country = parts[0];
      }

      if (!country) continue;
      countryCounts.set(country, (countryCounts.get(country) || 0) + loc.count);
      if (state) {
        if (!stateMap.has(country)) stateMap.set(country, new Map());
        const sm = stateMap.get(country)!;
        sm.set(state, (sm.get(state) || 0) + loc.count);
        if (city) {
          if (!cityMap.has(state)) cityMap.set(state, new Map());
          const cm = cityMap.get(state)!;
          cm.set(city, (cm.get(city) || 0) + loc.count);
        }
      }
    }

    const sortDesc = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    const statesByCountry = new Map<string, { name: string; count: number }[]>();
    for (const [c, sm] of stateMap) statesByCountry.set(c, sortDesc(sm));

    const citiesByState = new Map<string, { name: string; count: number }[]>();
    for (const [s, cm] of cityMap) citiesByState.set(s, sortDesc(cm));

    return { countries: sortDesc(countryCounts), statesByCountry, citiesByState, hasRemote };
  }, [availableLocations]);

  // Auto-detect USA from browser timezone — pre-select country dropdown only.
  // We do NOT set locationFilter here because the backend ILIKE '%United States%'
  // won't match locations stored as "San Francisco, CA". The dropdown pre-selection
  // lets the user drill into a state/city which DOES match.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.startsWith('America/')) {
        setLocCountry('United States');
        setLocationAutoDetected(true);
      }
    } catch {
      // ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-select all user profile categories once auth loads
  useEffect(() => {
    if (!authLoading && user && !roleInitialized) {
      const cats = getUserCategories();
      if (cats.length > 0) setRoles(cats);
      setRoleInitialized(true);
    }
  }, [authLoading, user, roleInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [, setLastUpdated] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (!data.success) {
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
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (!data.success) {
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

  const PAGE_SIZE = 50;

  /* ── Build common query params for all job fetches ── */
  const buildJobParams = useCallback((extraOffset?: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roles.length > 0) params.set('role', roles.join(','));
    if (locationFilter) params.set('location', locationFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (workTypeFilter) params.set('work_type', workTypeFilter);
    if (departmentFilter) params.set('department', departmentFilter);
    if (companyFilter) params.set('company', companyFilter);
    if (experienceFilter) params.set('experience', experienceFilter);
    if (postedWithinFilter) params.set('posted_within', postedWithinFilter);
    if (salaryMinFilter) params.set('min_salary', salaryMinFilter);
    if (salaryMaxFilter) params.set('max_salary', salaryMaxFilter);
    params.set('limit', String(PAGE_SIZE));
    if (extraOffset) params.set('offset', String(extraOffset));
    return params;
  }, [search, roles, locationFilter, sourceFilter, workTypeFilter, departmentFilter, companyFilter, experienceFilter, postedWithinFilter, salaryMinFilter, salaryMaxFilter]);

  /* ── Fetch filter options on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/api/v1/jobs/filters`, { headers });
        if (!res.ok) return;
        const data: FiltersResponse = await res.json();
        setAvailableSources(data.sources || []);
        setAvailableLocations(data.locations || []);
        setAvailableDepartments(data.departments || []);
        setAvailableCompanies(data.companies || []);
        if (data.salary_range) setSalaryRange(data.salary_range);
      } catch {
        // filter options are optional — fail silently
      }
    })();
  }, [token]);

  /* ── Fetch jobs ── */
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffset(0);
    setHasMore(true);
    // Don't clear jobs — show stale data during fetch for perceived speed
    try {
      const params = buildJobParams();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/v1/jobs?${params}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch jobs (${res.status})`);
      const data: JobsResponse = await res.json();
      const fetched = data.jobs || [];
      setJobs(fetched);
      setTotal(data.total || 0);
      setOffset(fetched.length);
      setHasMore(fetched.length < (data.total || 0));
      setLastUpdated(data.last_updated || new Date().toISOString());
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [buildJobParams, token]);

  /* ── Load more jobs ── */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = buildJobParams(offset);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/v1/jobs?${params}`, { headers });
      if (!res.ok) throw new Error(`Failed to load more jobs`);
      const data: JobsResponse = await res.json();
      const fetched = data.jobs || [];
      const newTotal = data.total || 0;
      setTotal(newTotal);
      setJobs((prev) => {
        const next = [...prev, ...fetched];
        setHasMore(next.length < newTotal);
        return next;
      });
      setOffset((prev) => prev + fetched.length);
    } catch {
      // silently fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [buildJobParams, token, offset, loadingMore, hasMore]);

  const activeFilterCount = [locationFilter, sourceFilter, workTypeFilter, departmentFilter, companyFilter, experienceFilter, postedWithinFilter, salaryMinFilter, salaryMaxFilter].filter(Boolean).length + (excludeVisaRestrictions ? 1 : 0);

  const clearAllFilters = () => {
    setLocationFilter(''); setLocCountry(''); setLocState(''); setLocCity('');
    setLocationAutoDetected(false);
    setRoles([]);
    setSourceFilter(''); setWorkTypeFilter('');
    setDepartmentFilter(''); setCompanyFilter(''); setExperienceFilter('');
    setPostedWithinFilter('7'); setSalaryMinFilter(''); setSalaryMaxFilter('');
    setExcludeVisaRestrictions(false);
  };

  /* ── Fetch on filter change — debounce search text, instant for category clicks ── */
  const prevRolesRef = useRef(roles);
  useEffect(() => {
    const prev = [...prevRolesRef.current].sort().join(',');
    const curr = [...roles].sort().join(',');
    const isRoleChange = prev !== curr;
    prevRolesRef.current = roles;
    if (isRoleChange) {
      // Category click — fetch immediately, no debounce
      fetchJobs();
    } else {
      // Text/filter change — debounce 300ms
      const timer = setTimeout(() => fetchJobs(), 300);
      return () => clearTimeout(timer);
    }
  }, [fetchJobs, search, roles, locationFilter, sourceFilter, workTypeFilter, departmentFilter, companyFilter, experienceFilter, postedWithinFilter, salaryMinFilter, salaryMaxFilter]);

  /* ── Scroll to top on mount ── */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const USC_GC_RE = /\b(us\s*citizen|u\.s\.\s*citizen|usc\s+only|must\s+be\s+(a\s+)?(us|u\.s\.)\s+citizen|green\s*card|permanent\s+resident|gc\s+required|gc\s+holder|requires?\s+citizenship|security\s+clearance|active\s+clearance|secret\s+clearance|top\s+secret|ts\s*\/\s*sci)\b/i;

  /* ── Jobs from API — client-side visa filter applied on top ── */
  const filteredJobs = excludeVisaRestrictions
    ? jobs.filter((j) => {
        const text = [j.title, j.description, j.ai_summary].filter(Boolean).join(' ');
        return !USC_GC_RE.test(text);
      })
    : jobs;

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100vh' }}>
      <SiteNav />

      {/* ═══════════════════════ Page Content ═══════════════════════ */}
      <div>

        {/* Hero band — single source of truth via shared HeroBand
            primitive. Stats line uses live `total` so it reflects the
            current filter set, not a stale marketing number. */}
        <HeroBand
          eyebrow="A · Apply"
          title={<>Find your <HeroAccent>next role</HeroAccent></>}
          subtitle={
            total > 0 ? (
              <><strong className="text-white font-bold">{total.toLocaleString()}</strong>{' '}open roles</>
            ) : undefined
          }
          actions={
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-white/85">Live feeds</span>
              </div>
              <button
                onClick={() => setShowUrlInput(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                style={{ background: 'var(--cam-gold-leaf)', color: '#1a1a1a' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" />
                </svg>
                Paste job URL
              </button>
            </>
          }
        />

        {/* ── Job URL Analysis Section (kept; Camora-specific feature
             that has no Google Careers analogue. Stays as a small
             dismissible banner at the top so it doesn't crowd the
             list view.) ── */}
        <div style={{ background: 'transparent' }}>
          <div className="page-wrap" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
            {/* Mobile-only fallback CTA. Desktop has the gold "Paste job URL"
                pill in the hero band; that's hidden on mobile via
                `hidden sm:flex`, so this stays for narrow viewports. */}
            {!showUrlInput ? (
              <button
                onClick={() => setShowUrlInput(true)}
                className="sm:hidden"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '0 auto',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-elevated)',
                  border: '1px dashed var(--border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" />
                </svg>
                Have a job URL? Paste it to get a personalized prep plan
              </button>
            ) : (
              <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Paste a Job URL
                  </h3>
                  <button
                    onClick={() => { setShowUrlInput(false); setAnalyzeError(null); setShowTextFallback(false); }}
                    style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Close
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Paste any job listing URL (Workday, Greenhouse, Lever, LinkedIn, etc.) and we'll analyze it to create a personalized prep plan.
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
                      color: 'var(--text-primary)',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: analyzing ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
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
                      background: analyzing ? 'var(--accent-hover)' : (!jobUrl.trim() ? 'var(--text-muted)' : 'var(--accent)'),
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: analyzing || !jobUrl.trim() ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { if (!analyzing && jobUrl.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                    onMouseLeave={(e) => { if (!analyzing && jobUrl.trim()) e.currentTarget.style.background = 'var(--accent)'; }}
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
                  <div style={{ fontSize: '13px', color: 'var(--danger)', background: 'var(--bg-elevated)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                    {analyzeError}
                  </div>
                )}

                {/* Text fallback — when URL scraping fails */}
                {showTextFallback && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
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
                        color: 'var(--text-primary)',
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
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
                        background: analyzing ? 'var(--accent-hover)' : (jdText.trim().length < 50 ? 'var(--text-muted)' : 'var(--accent)'),
                        border: '1px solid var(--border)',
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
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supports:</span>
                  {['Workday', 'Greenhouse', 'Lever', 'Ashby', 'LinkedIn', 'Indeed'].map((p) => (
                    <span key={p} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{p}</span>
                  ))}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>& more</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Layout: filter sidebar (Google Careers exact pattern) +
             single-column job list. No hero, no category chip strip,
             no horizontal filter toolbar — all filtering moved into
             the left sidebar with collapsible <details> sections.
             Camora's color tokens are preserved per user request. */}
        <div className="page-wrap" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
          <div className="jobs-layout" style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

            {/* ── Sidebar — filter rail ── */}
            <aside
              className="jobs-sidebar"
              style={{
                width: '280px',
                flexShrink: 0,
                position: 'sticky',
                top: '88px',
                maxHeight: 'calc(100vh - 100px)',
                overflowY: 'auto',
                paddingRight: '8px',
              }}
            >
              {/* Result count + clear */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px' }}>
                    <strong style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '15px' }}>{total.toLocaleString()}</strong>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>jobs matched</span>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Clear filters
                    </button>
                  )}
                </div>
                {locationAutoDetected && !locationFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🇺🇸 United States detected · pick a state below</span>
                  </div>
                )}
              </div>

              {/* What do you want to do? — Google's primary search input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  What do you want to do?
                </label>
                <input
                  type="text"
                  placeholder="Software engineering, Design, etc."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchJobs(); }}
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '2px solid var(--accent)',
                    padding: '8px 0',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Locations — Country → State → City cascade */}
              <details className="jobs-filter-group" open>
                <summary>Location</summary>
                <div className="jobs-filter-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Remote shortcut */}
                  {parsedLocations.hasRemote && (
                    <label className="jobs-filter-radio">
                      <input
                        type="radio"
                        name="loc_type"
                        checked={locationFilter === 'remote'}
                        onChange={() => { setLocCountry(''); setLocState(''); setLocCity(''); setLocationFilter('remote'); }}
                      />
                      <span>Remote</span>
                    </label>
                  )}
                  {/* Country */}
                  {parsedLocations.countries.length > 0 && (
                    <select
                      value={locationFilter === 'remote' ? '' : locCountry}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocCountry(v); setLocState(''); setLocCity('');
                        setLocationFilter(v);
                      }}
                      className="jobs-sidebar-input"
                    >
                      <option value="">Country</option>
                      {parsedLocations.countries.map((c) => (
                        <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                      ))}
                    </select>
                  )}
                  {/* State / Province */}
                  {locCountry && parsedLocations.statesByCountry.has(locCountry) && (
                    <select
                      value={locState}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocState(v); setLocCity('');
                        setLocationFilter(v || locCountry);
                      }}
                      className="jobs-sidebar-input"
                    >
                      <option value="">State / Province</option>
                      {(parsedLocations.statesByCountry.get(locCountry) || []).map((s) => (
                        <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
                      ))}
                    </select>
                  )}
                  {/* City */}
                  {locState && parsedLocations.citiesByState.has(locState) && (
                    <select
                      value={locCity}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocCity(v);
                        setLocationFilter(v ? `${v}, ${locState}` : locState);
                      }}
                      className="jobs-sidebar-input"
                    >
                      <option value="">City</option>
                      {(parsedLocations.citiesByState.get(locState) || []).map((c) => (
                        <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                      ))}
                    </select>
                  )}
                  {locationFilter && (
                    <button
                      onClick={() => { setLocationFilter(''); setLocCountry(''); setLocState(''); setLocCity(''); }}
                      style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      Clear location
                    </button>
                  )}
                </div>
              </details>

              {/* Job category — multi-select checkboxes */}
              <details className="jobs-filter-group">
                <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Job category</span>
                  {roles.length > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: '999px', padding: '1px 7px', marginRight: '6px' }}>
                      {roles.length}
                    </span>
                  )}
                </summary>
                <div className="jobs-filter-body">
                  <label className="jobs-filter-radio">
                    <input type="checkbox" checked={roles.length === 0} onChange={() => setRoles([])} />
                    <span>All</span>
                  </label>
                  {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                    <label key={cat.value} className="jobs-filter-radio">
                      <input
                        type="checkbox"
                        checked={roles.includes(cat.value)}
                        onChange={() => setRoles(prev =>
                          prev.includes(cat.value)
                            ? prev.filter(r => r !== cat.value)
                            : [...prev, cat.value]
                        )}
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Experience */}
              <details className="jobs-filter-group">
                <summary>Experience</summary>
                <div className="jobs-filter-body">
                  {EXPERIENCE_LEVELS.map((el) => (
                    <label key={el.value} className="jobs-filter-radio">
                      <input
                        type="radio"
                        name="experience"
                        checked={experienceFilter === el.value}
                        onChange={() => setExperienceFilter(el.value)}
                      />
                      <span>{el.label}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Job types (work type) */}
              <details className="jobs-filter-group">
                <summary>Job types</summary>
                <div className="jobs-filter-body">
                  {WORK_TYPES.map((wt) => (
                    <label key={wt.value} className="jobs-filter-radio">
                      <input
                        type="radio"
                        name="workType"
                        checked={workTypeFilter === wt.value}
                        onChange={() => setWorkTypeFilter(wt.value)}
                      />
                      <span>{wt.label}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Visa / work auth */}
              <div className="jobs-filter-group" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    H1B friendly only
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>
                      Excludes USC / Green Card / clearance required
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={excludeVisaRestrictions}
                    onClick={() => setExcludeVisaRestrictions((v) => !v)}
                    style={{
                      flexShrink: 0,
                      width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: excludeVisaRestrictions ? 'var(--cam-gold-leaf)' : 'var(--bg-elevated)',
                      transition: 'background 0.2s',
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: excludeVisaRestrictions ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: excludeVisaRestrictions ? 'var(--cam-primary-dk)' : 'var(--text-muted)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </label>
              </div>

              {/* Date posted */}
              <details className="jobs-filter-group">
                <summary>Date posted</summary>
                <div className="jobs-filter-body">
                  {POSTED_WITHIN.map((pw) => (
                    <label key={pw.value} className="jobs-filter-radio">
                      <input
                        type="radio"
                        name="posted"
                        checked={postedWithinFilter === pw.value}
                        onChange={() => setPostedWithinFilter(pw.value)}
                      />
                      <span>{pw.label}</span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Job platform */}
              <details className="jobs-filter-group">
                <summary>Job platform</summary>
                <div className="jobs-filter-body">
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="jobs-sidebar-input">
                    <option value="">All platforms</option>
                    {availableSources.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
                  </select>
                </div>
              </details>

              {/* Companies */}
              <details className="jobs-filter-group">
                <summary>Companies</summary>
                <div className="jobs-filter-body">
                  <input
                    type="text"
                    placeholder="Search companies"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    list="company-options"
                    className="jobs-sidebar-input"
                  />
                  <datalist id="company-options">
                    {availableCompanies.map((c) => <option key={c.name} value={c.name}>{`${c.name} (${c.count})`}</option>)}
                  </datalist>
                </div>
              </details>

              {/* Salary range */}
              <details className="jobs-filter-group">
                <summary>Salary range</summary>
                <div className="jobs-filter-body" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={salaryMinFilter}
                    onChange={(e) => setSalaryMinFilter(e.target.value)}
                    className="jobs-sidebar-input"
                    style={{ width: '50%' }}
                    step={10000}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={salaryMaxFilter}
                    onChange={(e) => setSalaryMaxFilter(e.target.value)}
                    className="jobs-sidebar-input"
                    style={{ width: '50%' }}
                    step={10000}
                  />
                </div>
              </details>
            </aside>

            {/* ── Main — single-column card list ── */}
            <main style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            /* Loading skeleton — single column to match the new card list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="jobs-skeleton-card"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                  }}
                >
                  <div style={{ width: '60%', height: '20px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '14px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                  <div style={{ width: '45%', height: '13px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '20px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                  <div style={{ width: '120px', height: '32px', background: 'var(--bg-elevated)', borderRadius: '9999px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error state */
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}>
              <svg width="48" height="48" fill="none" stroke="var(--danger)" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="heading-2" style={{ marginBottom: '8px' }}>
                Something went wrong
              </p>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                {error}
              </p>
              <button
                onClick={fetchJobs}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'var(--accent)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  padding: '12px 32px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                Try again
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}>
              <svg width="48" height="48" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <p className="heading-2" style={{ marginBottom: '8px' }}>
                No jobs match your filters
              </p>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
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
                const workType = detectWorkType(job.location);
                const salary = formatSalary(job.salary_min, job.salary_max);
                const posted = timeAgo(job.posted_date || job.date_found);
                const postedDaysAgo = (() => {
                  const d = job.posted_date || job.date_found;
                  if (!d) return null;
                  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
                })();
                const isStale = postedDaysAgo !== null && postedDaysAgo > 7;

                // Experience-level badge — LeetCode-difficulty analog
                // mapped to navy/gold combinations:
                //   Early   = light gold bg + gold text  (≈ Easy)
                //   Mid     = gold-leaf bg + dark gold text  (≈ Medium)
                //   Senior+ = navy bg + white text  (≈ Hard)
                const expRaw = (job.title || '').toLowerCase();
                const expLevel = /\b(intern|early|junior|associate)\b/.test(expRaw) ? 'Early'
                  : /\b(senior|staff|principal|lead|director|head|vp)\b/.test(expRaw) ? 'Senior'
                  : 'Mid';
                const expStyle = expLevel === 'Early'
                  ? { bg: 'var(--cam-gold-leaf-50)', color: 'var(--cam-gold-leaf-text)', border: 'var(--cam-gold-leaf-50)' }
                  : expLevel === 'Mid'
                    ? { bg: 'var(--cam-gold-leaf-50)', color: 'var(--cam-gold-leaf-dk)', border: 'var(--cam-gold-leaf)' }
                    : { bg: 'var(--accent-subtle)', color: 'var(--accent)', border: 'var(--accent)' };

                const renderLogo = () => {
                  const logoPath = getCompanyLogoPath(job.company_name);
                  if (logoPath) {
                    return <img src={logoPath} alt={job.company_name} width={16} height={16} style={{ objectFit: 'contain', borderRadius: 2 }} loading="lazy" />;
                  }
                  const domain = job.company_name.toLowerCase()
                    .replace(/\s+(inc|corp|ltd|llc|co|group|technologies|labs|systems|platform|platforms|solutions)\.?$/i, '')
                    .replace(/[^a-z0-9]/g, '') + '.com';
                  return (
                    <img
                      src={`https://img.logo.dev/${domain}?token=pk_WTNVbqXXTuqc9alm89LirQ&size=32&format=png`}
                      alt={job.company_name}
                      width={16} height={16}
                      style={{ objectFit: 'contain', borderRadius: 2 }}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  );
                };

                return (
                  <article
                    key={job.id}
                    className="jobs-card"
                    style={{
                      background: 'var(--bg-surface)',
                      border: isStale ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '20px 24px',
                      transition: 'border-color 0.15s, background 0.15s',
                    } as React.CSSProperties}
                  >
                    {/* Title row — title left, share/bookmark icons right */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                      <h3 style={{
                        fontSize: '17px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                        lineHeight: 1.35,
                        letterSpacing: '-0.01em',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        {job.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          aria-label="Share job"
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard?.writeText(`${window.location.origin}/jobs/${job.id}/prepare`).catch(() => {});
                          }}
                          className="jobs-card-iconbtn"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
                        >
                          <Icon name="share" size={16} />
                        </button>
                        <button
                          aria-label="Save job"
                          onClick={(e) => e.preventDefault()}
                          className="jobs-card-iconbtn"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
                        >
                          <Icon name="bookmark" size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Compact metadata row — icon + value, separated by gaps.
                        Mirrors Google Careers' "Google · Sunnyvale, CA · Mid"
                        rhythm. Uses neutral text-secondary for the row. */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 18px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {renderLogo()}
                        <span style={{ fontWeight: 500 }}>{job.company_name}</span>
                      </span>
                      {job.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="mapPin" size={14} />
                          {job.location.length > 60 ? job.location.slice(0, 60) + '…' : job.location}
                        </span>
                      )}
                      {workType && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="briefcase" size={14} />
                          {workType}
                        </span>
                      )}
                      {isStale ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontSize: 11, fontWeight: 700 }}>
                          ⚠ {postedDaysAgo}d ago — may be filled
                        </span>
                      ) : posted && (
                        <span style={{ color: 'var(--text-muted)' }}>{posted}</span>
                      )}
                      {salary && (
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{salary}</span>
                      )}
                      {/* LeetCode-style difficulty badge — navy/gold variants */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 9px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: expStyle.color,
                        background: expStyle.bg,
                        border: `1px solid ${expStyle.border}`,
                        borderRadius: '9999px',
                        letterSpacing: '0.02em',
                      }}>
                        {expLevel}
                      </span>
                    </div>

                    {/* Description snippet — 4-5 lines of context */}
                    {(job.ai_summary || job.description) && (() => {
                      const raw = (job.ai_summary || job.description || '').replace(/\s+/g, ' ').trim();
                      const snippet = raw.length > 320 ? raw.slice(0, 320) + '…' : raw;
                      return (
                        <p style={{
                          margin: '0 0 18px',
                          fontSize: '13px',
                          lineHeight: '1.65',
                          color: 'var(--text-muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {snippet}
                        </p>
                      );
                    })()}

                    {/* Footer CTA — outlined "Learn more" pill button +
                        secondary text links for Apply / Resume. Mirrors
                        Google Careers' single-pill CTA pattern. */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/jobs/${job.id}/prepare`}
                        className="jobs-card-cta"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--accent)',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '9999px',
                          textDecoration: 'none',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        Learn more
                        <Icon name="arrowRight" size={14} />
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          Apply
                        </a>
                        <Link
                          to={`/capra/resume?company=${encodeURIComponent(job.company_name)}&role=${encodeURIComponent(job.title)}&url=${encodeURIComponent(job.job_url)}`}
                          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          Resume
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Load more button */}
          {!loading && hasMore && filteredJobs.length > 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: '12px 32px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--accent)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  cursor: loadingMore ? 'wait' : 'pointer',
                  opacity: loadingMore ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!loadingMore) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {loadingMore ? 'Loading...' : `Load more jobs (${filteredJobs.length} of ${total})`}
              </button>
            </div>
          )}
            </main>
          </div>
        </div>
      </div>

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

        /* Card hover — LeetCode row-style tint + navy border + a 1px
           gold-leaf left rail. Subtle and tasteful, no drop shadow. */
        .jobs-card {
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .jobs-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--cam-gold-leaf);
          opacity: 0;
          border-radius: 8px 0 0 8px;
          transition: opacity 0.15s;
        }
        .jobs-card:hover {
          border-color: var(--accent);
          background: var(--bg-elevated);
        }
        .jobs-card:hover::before {
          opacity: 1;
        }
        /* Card top-right icon buttons — hover tints navy, click fills gold */
        .jobs-card-iconbtn:hover {
          background: var(--bg-elevated) !important;
          color: var(--accent) !important;
        }
        .jobs-card-iconbtn:active {
          /* Defensive contrast: gold-leaf-text (7.6:1 on bg-elevated)
             vs the bright gold-leaf token (3.6:1, passes UI threshold
             by a hair). Same hue family, materially safer. */
          color: var(--cam-gold-leaf-text) !important;
        }
        /* "Learn more" pill button hover */
        .jobs-card-cta:hover {
          background: var(--bg-elevated);
          border-color: var(--accent) !important;
        }
        /* Single-column list — cards stack vertically with breathing room */
        .jobs-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        /* Sidebar filter <details> groups — Google Careers' collapsible
           filter sections. Native disclosure widget gives free
           keyboard a11y + stable scroll positions. */
        .jobs-filter-group {
          border-bottom: 1px solid var(--border);
          padding: 12px 0;
        }
        .jobs-filter-group:last-of-type {
          border-bottom: none;
        }
        .jobs-filter-group > summary {
          list-style: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          padding: 4px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .jobs-filter-group > summary::-webkit-details-marker {
          display: none;
        }
        .jobs-filter-group > summary::after {
          content: "";
          width: 10px;
          height: 10px;
          border-right: 2px solid var(--text-muted);
          border-bottom: 2px solid var(--text-muted);
          transform: rotate(45deg);
          transition: transform 0.15s;
          margin-right: 4px;
        }
        .jobs-filter-group[open] > summary::after {
          transform: rotate(-135deg);
          margin-bottom: -4px;
        }
        .jobs-filter-body {
          margin-top: 10px;
        }
        /* Filter row gets navy text + gold-leaf left rail when its
           radio is checked — completes the navy+gold accent pattern
           used on the cards. The :has() selector lights up the row
           directly from the radio's checked state, no JS plumbing
           needed. */
        .jobs-filter-radio {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 8px;
          margin: 0 -8px;
          font-size: 14px;
          color: var(--text-primary);
          cursor: pointer;
          line-height: 1.4;
          border-radius: 6px;
          border-left: 2px solid transparent;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }
        .jobs-filter-radio:hover {
          color: var(--accent);
          background: var(--bg-elevated);
        }
        .jobs-filter-radio:has(input[type="radio"]:checked),
        .jobs-filter-radio:has(input[type="checkbox"]:checked) {
          color: var(--accent);
          font-weight: 600;
          background: var(--bg-elevated);
          border-left-color: var(--cam-gold-leaf);
        }
        .jobs-filter-radio input[type="radio"],
        .jobs-filter-radio input[type="checkbox"] {
          accent-color: var(--accent);
          margin: 0;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
        }
        .jobs-sidebar-input {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          color: var(--text-primary);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          outline: none;
          transition: border-color 0.15s;
        }
        .jobs-sidebar-input:hover,
        .jobs-sidebar-input:focus {
          border-color: var(--accent);
        }

        /* Mobile: collapse sidebar above main as full-width section */
        @media (max-width: 880px) {
          .jobs-layout {
            flex-direction: column;
            gap: 16px !important;
          }
          .jobs-sidebar {
            width: 100% !important;
            position: static !important;
            max-height: none !important;
            padding-right: 0 !important;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px !important;
          }
        }

        /* Filter form controls */
        .jobs-filter-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .jobs-filter-input,
        .jobs-filter-select {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          color: var(--text-primary);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          outline: none;
          transition: border-color 0.15s;
        }
        .jobs-filter-input:focus,
        .jobs-filter-select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-subtle);
        }
        .jobs-filter-select {
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 32px;
        }
        .jobs-filter-input::placeholder {
          color: var(--text-muted);
          opacity: 0.6;
        }
        /* Remove number input spinners */
        .jobs-filter-input[type="number"]::-webkit-inner-spin-button,
        .jobs-filter-input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .jobs-filter-input[type="number"] {
          -moz-appearance: textfield;
        }

        /* Search bar focus-within */
        .jobs-search-bar:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 4px 20px var(--accent-subtle) !important;
        }

        /* Nav link hover */
        .jobs-nav-link:hover {
          color: var(--text-primary) !important;
          background: var(--bg-elevated);
        }

        /* Action link hovers */
        .jobs-action-link:hover {
          color: var(--accent-hover) !important;
        }
        .jobs-action-link-gray:hover {
          color: var(--text-primary) !important;
        }
        .jobs-action-link-resume:hover {
          color: var(--accent-hover) !important;
        }

        /* Footer link hover */
        .jobs-footer-link:hover {
          color: var(--accent) !important;
        }

        /* Remove button outlines on click */
        button:focus {
          outline: none;
        }
        button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .jobs-card {
            border-radius: 12px !important;
          }
        }
      `}</style>
      <SiteFooter />
    </div>
  );
}
