import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

/** Generate a deterministic color from company name for the initial fallback */
function getCompanyColor(name: string): string {
  const colors = ['var(--accent)', 'var(--accent)', '#3b82f6', '#06b6d4', '#ec4899', 'var(--accent)', 'var(--success)', 'var(--danger)', 'var(--warning)', '#a855f7'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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

const CATEGORY_COLORS: Record<string, string> = {
  devops: '#06b6d4',
  backend: 'var(--success)',
  frontend: 'var(--accent)',
  fullstack: '#3b82f6',
  data: 'var(--warning)',
  ml: '#ec4899',
  security: 'var(--danger)',
  mobile: 'var(--accent)',
  ios: '#a855f7',
  android: '#22c55e',
  qa: '#84cc16',
  sre: '#e11d48',
  platform: '#14b8a6',
  cloud: 'var(--accent)',
  network: '#0ea5e9',
  blockchain: 'var(--warning)',
  game_dev: '#f43f5e',
  tech_lead: 'var(--accent)',
  staff: '#7c3aed',
  principal: '#6d28d9',
  em: '#0891b2',
  architect: '#2563eb',
  tpm: '#0d9488',
  product_manager: '#d946ef',
  embedded: '#a855f7',
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

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  // Order matters — more specific categories first
  if (t.includes('devops') || t.includes('dev ops') || t.includes('devsecops') || t.includes('release engineer') || t.includes('build engineer') || t.includes('ci/cd')) return 'devops';
  if (t.includes('sre') || t.includes('site reliability') || t.includes('production engineer') || t.includes('observability')) return 'sre';
  if (t.includes('security') || t.includes('appsec') || t.includes('infosec') || t.includes('cybersecurity') || t.includes('penetration') || t.includes('threat') || t.includes('vulnerability') || t.includes('soc analyst') || t.includes('security engineer')) return 'security';
  if (t.includes('machine learning') || t.includes('ml ') || t.includes('ml ops') || t.includes('deep learning') || t.includes('nlp') || t.includes('natural language') || t.includes('artificial intelligence') || t.includes('ai engineer') || t.includes('ai research') || t.includes('computer vision') || t.includes('generative ai') || t.includes('applied scientist') || t.includes('research scientist') || t.includes('research engineer')) return 'ml';
  if (t.includes('data engineer') || t.includes('data scientist') || t.includes('data analyst') || t.includes('analytics') || t.includes('etl') || t.includes('data platform') || t.includes('data architect') || t.includes('database') || t.includes('dba') || t.includes('data warehouse') || t.includes('business intelligence') || t.includes('bi ')) return 'data';
  if (t.includes('mobile') || t.includes('ios') || t.includes('android') || t.includes('swift') || t.includes('kotlin') || t.includes('react native') || t.includes('flutter')) return 'mobile';
  if (t.includes('qa') || t.includes('quality assurance') || t.includes('test engineer') || t.includes('sdet') || t.includes('automation test') || t.includes('test automation') || t.includes('quality engineer')) return 'qa';
  if (t.includes('embedded') || t.includes('firmware') || t.includes('hardware') || t.includes('fpga') || t.includes('rtos') || t.includes('iot engineer') || t.includes('robotics')) return 'embedded';
  if (t.includes('full stack') || t.includes('fullstack') || t.includes('full-stack')) return 'fullstack';
  if (t.includes('frontend') || t.includes('front-end') || t.includes('front end') || t.includes('ui engineer') || t.includes('ui developer') || t.includes('ux engineer') || t.includes('javascript engineer') || t.includes('typescript engineer') || t.includes('web engineer')) return 'frontend';
  if (t.includes('platform engineer') || t.includes('platform architect') || t.includes('developer experience') || t.includes('developer tools') || t.includes('dx engineer') || t.includes('internal tools')) return 'platform';
  if (t.includes('cloud engineer') || t.includes('cloud architect') || t.includes('infrastructure engineer') || t.includes('infra engineer') || t.includes('network engineer') || t.includes('solutions architect')) return 'cloud';
  if (t.includes('backend') || t.includes('back-end') || t.includes('back end') || t.includes('server engineer') || t.includes('api engineer') || t.includes('distributed systems') || t.includes('systems engineer')) return 'backend';
  if (t.includes('software engineer') || t.includes('software developer') || t.includes('application engineer') || t.includes('web developer')) return 'fullstack';
  return 'fullstack';
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

  useEffect(() => {
    document.title = 'Job Board | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  // Map user's onboarding role to job filter category
  // Covers all 30 roles from OnboardingPage (JOB_ROLES + MORE_ROLES)
  const getUserCategory = (): string => {
    const roles = user?.job_roles;
    if (!roles || roles.length === 0) return 'all';
    const r = (Array.isArray(roles) ? roles[0] : roles).toLowerCase();
    // Direct ID matches from onboarding
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
    if (roleMap[r]) return roleMap[r];
    // Fuzzy fallback for free-text roles
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
    return 'all';
  };

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [roleInitialized, setRoleInitialized] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [postedWithinFilter, setPostedWithinFilter] = useState('');
  const [salaryMinFilter, setSalaryMinFilter] = useState('');
  const [salaryMaxFilter, setSalaryMaxFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter options from API
  const [availableSources, setAvailableSources] = useState<FilterOption[]>([]);
  const [availableLocations, setAvailableLocations] = useState<FilterOption[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<FilterOption[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<FilterOption[]>([]);
  const [salaryRange, setSalaryRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
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
    if (role !== 'all') params.set('role', role);
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
  }, [search, role, locationFilter, sourceFilter, workTypeFilter, departmentFilter, companyFilter, experienceFilter, postedWithinFilter, salaryMinFilter, salaryMaxFilter]);

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

  const activeFilterCount = [locationFilter, sourceFilter, workTypeFilter, departmentFilter, companyFilter, experienceFilter, postedWithinFilter, salaryMinFilter, salaryMaxFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    setLocationFilter(''); setSourceFilter(''); setWorkTypeFilter('');
    setDepartmentFilter(''); setCompanyFilter(''); setExperienceFilter('');
    setPostedWithinFilter(''); setSalaryMinFilter(''); setSalaryMaxFilter('');
  };

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

  /* ── Jobs from API — backend handles category filtering ── */
  const filteredJobs = jobs;

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* ═══════════════════════ Page Content ═══════════════════════ */}
      <div>

        {/* ── Hero Section (MetAntz-inspired) ── */}
        <div
          style={{
            background: 'transparent',
          }}
        >
          <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '24px', paddingBottom: '20px', textAlign: 'center' }}>
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
                  background: 'var(--bg-surface)',
                  borderRadius: '9999px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  padding: '4px 4px 4px 20px',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                {/* Filter icon */}
                <svg width="20" height="20" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" strokeWidth={1.8} style={{ flexShrink: 0, marginRight: '12px' }}>
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
                    color: 'var(--text-primary)',
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
                    background: 'var(--accent)',
                    borderRadius: '9999px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
                  aria-label="Search"
                >
                  <svg width="18" height="18" fill="none" stroke="#ffffff" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" fill="none" stroke="var(--accent)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> active jobs
              </span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span>
                {lastUpdated
                  ? `Updated ${new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`
                  : `Updated ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Job URL Analysis Section ── */}
        <div style={{ background: 'transparent' }}>
          <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
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
                  <div style={{ fontSize: '13px', color: '#0B5CFF', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
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

        {/* ── Category Pills (Etched-inspired) ── */}
        <div
          className="sticky z-30"
          style={{
            top: 'var(--nav-h, 56px)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8">
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
                const pillColor = cat.value === 'all' ? 'var(--accent)' : (CATEGORY_COLORS[cat.value] || DEFAULT_COLOR);
                return (
                  <button
                    key={cat.value}
                    onClick={() => setRole(cat.value)}
                    style={{
                      fontSize: '14px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      background: 'none',
                      border: '1px solid var(--border)',
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

        {/* ── Advanced Filter Bar ── */}
        <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '12px' }}>
          {/* Toggle + active pills row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                background: activeFilterCount > 0 ? 'rgba(45,140,255,0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${activeFilterCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Active filter pills */}
            {[
              { val: locationFilter, set: setLocationFilter, label: locationFilter, color: 'var(--accent)' },
              { val: sourceFilter, set: setSourceFilter, label: sourceFilter, color: 'var(--success)' },
              { val: workTypeFilter, set: setWorkTypeFilter, label: WORK_TYPES.find(w => w.value === workTypeFilter)?.label, color: 'var(--warning)' },
              { val: departmentFilter, set: setDepartmentFilter, label: departmentFilter, color: 'var(--accent)' },
              { val: companyFilter, set: setCompanyFilter, label: companyFilter, color: '#3b82f6' },
              { val: experienceFilter, set: setExperienceFilter, label: EXPERIENCE_LEVELS.find(e => e.value === experienceFilter)?.label, color: '#ec4899' },
              { val: postedWithinFilter, set: setPostedWithinFilter, label: POSTED_WITHIN.find(p => p.value === postedWithinFilter)?.label, color: '#06b6d4' },
              { val: salaryMinFilter, set: setSalaryMinFilter, label: `Min $${Math.round(Number(salaryMinFilter) / 1000)}K`, color: '#14b8a6' },
              { val: salaryMaxFilter, set: setSalaryMaxFilter, label: `Max $${Math.round(Number(salaryMaxFilter) / 1000)}K`, color: '#14b8a6' },
            ].filter(f => f.val).map((f, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, color: f.color, background: `${f.color}15`, borderRadius: '6px', border: `1px solid ${f.color}30` }}>
                {f.label}
                <button onClick={() => f.set('')} style={{ background: 'none', border: '1px solid var(--border)', color: f.color, cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1 }}>&times;</button>
              </span>
            ))}
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 8px' }}>
                Clear all
              </button>
            )}
          </div>

          {/* Expandable advanced filter panel */}
          {showFilters && (
            <div style={{
              marginTop: '12px',
              padding: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}>
              {/* Row 1: Location, Work Type, Experience, Posted */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="jobs-filter-label">Location</label>
                  <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="jobs-filter-select">
                    <option value="">All Locations</option>
                    {availableLocations.map((l) => (
                      <option key={l.name} value={l.name}>{l.name} ({l.count})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="jobs-filter-label">Work Type</label>
                  <select value={workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value)} className="jobs-filter-select">
                    {WORK_TYPES.map((wt) => <option key={wt.value} value={wt.value}>{wt.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="jobs-filter-label">Experience Level</label>
                  <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className="jobs-filter-select">
                    {EXPERIENCE_LEVELS.map((el) => <option key={el.value} value={el.value}>{el.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="jobs-filter-label">Date Posted</label>
                  <select value={postedWithinFilter} onChange={(e) => setPostedWithinFilter(e.target.value)} className="jobs-filter-select">
                    {POSTED_WITHIN.map((pw) => <option key={pw.value} value={pw.value}>{pw.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Platform, Department, Company */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="jobs-filter-label">Job Platform</label>
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="jobs-filter-select">
                    <option value="">All Platforms</option>
                    {availableSources.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
                  </select>
                </div>

                <div>
                  <label className="jobs-filter-label">Department</label>
                  <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="jobs-filter-select">
                    <option value="">All Departments</option>
                    {availableDepartments.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
                  </select>
                </div>

                <div>
                  <label className="jobs-filter-label">Company</label>
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    list="company-options"
                    className="jobs-filter-input"
                  />
                  <datalist id="company-options">
                    {availableCompanies.map((c) => <option key={c.name} value={c.name}>{`${c.name} (${c.count})`}</option>)}
                  </datalist>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="jobs-filter-label">
                    Salary Range
                    {salaryRange.min != null && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (${Math.round(salaryRange.min / 1000)}K–${Math.round((salaryRange.max || 0) / 1000)}K)</span>}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={salaryMinFilter}
                      onChange={(e) => setSalaryMinFilter(e.target.value)}
                      className="jobs-filter-input"
                      style={{ width: '50%' }}
                      step={10000}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={salaryMaxFilter}
                      onChange={(e) => setSalaryMaxFilter(e.target.value)}
                      className="jobs-filter-input"
                      style={{ width: '50%' }}
                      step={10000}
                    />
                  </div>
                </div>
              </div>

              {/* Result count + clear */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {total} job{total !== 1 ? 's' : ''} found
                </span>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '4px 8px' }}>
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Job Cards Grid ── */}
        <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
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
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: '80px', background: 'var(--bg-elevated)', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                  <div style={{ padding: '20px' }}>
                    <div style={{ width: '75%', height: '16px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '12px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    <div style={{ width: '55%', height: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '10px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    <div style={{ width: '40%', height: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '16px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                    <div className="flex gap-2">
                      <div style={{ width: '60px', height: '24px', background: 'var(--bg-elevated)', borderRadius: '12px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
                      <div style={{ width: '60px', height: '24px', background: 'var(--bg-elevated)', borderRadius: '12px', animation: 'jobs-pulse 2s ease-in-out infinite' }} />
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
                const category = detectCategory(job.title);
                const color = getCategoryColor(category);
                const categoryLabel = getCategoryLabel(category);
                const workType = detectWorkType(job.location);
                const salary = formatSalary(job.salary_min, job.salary_max);

                return (
                  <div
                    key={job.id}
                    className="jobs-card card-glow"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'default',
                      boxShadow: 'none',
                      '--glow-hover': '0 20px 60px rgba(45,140,255,0.22)',
                    } as React.CSSProperties}
                  >
                    {/* Compact colored strip + title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      {(() => {
                        const logoPath = getCompanyLogoPath(job.company_name);
                        if (logoPath) {
                          return (
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                              <img src={logoPath} alt={job.company_name} width={26} height={26} style={{ objectFit: 'contain', borderRadius: 4 }} loading="lazy" />
                            </div>
                          );
                        }
                        // Dynamic logo via logo.dev API
                        const domain = job.company_name.toLowerCase()
                          .replace(/\s+(inc|corp|ltd|llc|co|group|technologies|labs|systems|platform|platforms|solutions)\.?$/i, '')
                          .replace(/[^a-z0-9]/g, '') + '.com';
                        const logoDevUrl = `https://img.logo.dev/${domain}?token=pk_WTNVbqXXTuqc9alm89LirQ&size=64&format=png`;
                        return (
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                            <img
                              src={logoDevUrl}
                              alt={job.company_name}
                              width={26} height={26}
                              style={{ objectFit: 'contain', borderRadius: 4 }}
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `<span style="color: var(--text-primary); font-size: 16px; font-weight: 800;">${job.company_name.charAt(0).toUpperCase()}</span>`;
                              }}
                            />
                          </div>
                        );
                      })()}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.title}
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.company_name}</div>
                      </div>
                      <div className="flex gap-1" style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, color, background: `${color}14`, padding: '2px 8px', borderRadius: '9999px', border: `1px solid ${color}30` }}>{categoryLabel}</span>
                      </div>
                    </div>

                    {/* Card details */}
                    <div style={{ padding: '12px 16px 0' }}>
                      {/* Location + Work Type + Posted */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {job.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <svg width="12" height="12" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            {job.location.length > 35 ? job.location.slice(0, 35) + '...' : job.location}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', fontWeight: 600, color: workType === 'Remote' ? 'var(--accent)' : workType === 'Hybrid' ? '#d97706' : 'var(--text-muted)', background: workType === 'Remote' ? 'rgba(45,140,255,0.1)' : workType === 'Hybrid' ? 'rgba(217,119,6,0.1)' : 'var(--bg-elevated)', padding: '2px 7px', borderRadius: '9999px' }}>{workType}</span>
                      </div>

                      {/* Salary + Posted date row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        {salary ? (
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{salary}</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Salary not listed</span>
                        )}
                        {timeAgo(job.posted_date || job.date_found) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(job.posted_date || job.date_found)}</span>
                        )}
                      </div>

                      {/* Department + Source */}
                      {(job.department || job.source) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {job.department && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: '4px' }}>
                              {job.department.length > 25 ? job.department.slice(0, 25) + '...' : job.department}
                            </span>
                          )}
                          {job.source && (
                            <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>
                              via {job.source}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tech stack tags */}
                      {job.ai_tech_stack && job.ai_tech_stack.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {(Array.isArray(job.ai_tech_stack) ? job.ai_tech_stack : []).slice(0, 5).map((tech) => (
                            <span key={tech} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', background: 'rgba(45,140,255,0.08)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(45,140,255,0.15)' }}>
                              {tech}
                            </span>
                          ))}
                          {job.ai_tech_stack.length > 5 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{job.ai_tech_stack.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action links */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', padding: '10px 16px', marginTop: '10px' }}>
                      <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="jobs-action-link" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Apply
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                      </a>
                      <Link to={`/capra/resume?company=${encodeURIComponent(job.company_name)}&role=${encodeURIComponent(job.title)}&url=${encodeURIComponent(job.job_url)}`} className="jobs-action-link-resume" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Resume
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      </Link>
                      <Link to={`/jobs/${job.id}/prepare`} className="jobs-action-link-gray" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Prepare
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </Link>
                    </div>
                  </div>
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
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
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
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.12) !important;
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
    </div>
  );
}
