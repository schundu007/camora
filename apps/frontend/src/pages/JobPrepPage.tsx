import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { detectRoleFromTitle } from '../data/capra/jobRoleTopicMapping';
import CamoraLogo from '../components/shared/CamoraLogo';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import { useContentAccess } from '../hooks/useContentAccess';

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

/* ──────────────────────────────── Constants ──────────────────────────────── */

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const PREP_SECTIONS = [
  { key: 'pitch', label: 'Elevator Pitch', description: 'A personalized 2-3 minute interview pitch', icon: '🎯' },
  { key: 'hr', label: 'HR Questions', description: 'Salary negotiation, availability, culture fit', icon: '🤝' },
  { key: 'hiring-manager', label: 'Hiring Manager Questions', description: 'Role-specific technical and behavioral questions', icon: '👔' },
  { key: 'coding', label: 'Coding Questions', description: 'Likely coding problems based on the tech stack', icon: '💻' },
  { key: 'system-design', label: 'System Design Questions', description: 'System design scenarios based on job requirements', icon: '🏗' },
  { key: 'behavioral', label: 'Behavioral Questions', description: 'STAR-format questions tailored to the role', icon: '⭐' },
  { key: 'techstack', label: 'Tech Stack Analysis', description: 'Technology-specific deep dives', icon: '🔧' },
] as const;

const TECH_TO_TOPICS: Record<string, { category: string; topic: string; href: string }> = {
  'kubernetes': { category: 'System Design', topic: 'Container Orchestration', href: '/capra/prepare?page=microservices' },
  'docker': { category: 'System Design', topic: 'Containerization', href: '/capra/prepare?page=microservices' },
  'aws': { category: 'System Design', topic: 'Cloud Architecture', href: '/capra/prepare?page=system-design' },
  'gcp': { category: 'System Design', topic: 'Cloud Architecture', href: '/capra/prepare?page=system-design' },
  'azure': { category: 'System Design', topic: 'Cloud Architecture', href: '/capra/prepare?page=system-design' },
  'python': { category: 'Coding', topic: 'Python Fundamentals', href: '/capra/prepare?page=coding' },
  'react': { category: 'Coding', topic: 'Frontend Development', href: '/capra/prepare?page=coding' },
  'postgresql': { category: 'Database', topic: 'SQL & PostgreSQL', href: '/capra/prepare?page=sql' },
  'postgres': { category: 'Database', topic: 'SQL & PostgreSQL', href: '/capra/prepare?page=sql' },
  'redis': { category: 'System Design', topic: 'Caching', href: '/capra/prepare?page=system-design' },
  'kafka': { category: 'System Design', topic: 'Message Queues', href: '/capra/prepare?page=system-design' },
  'microservices': { category: 'Architecture', topic: 'Microservices Patterns', href: '/capra/prepare?page=microservices' },
  'golang': { category: 'Coding', topic: 'Go Programming', href: '/capra/prepare?page=coding' },
  'go': { category: 'Coding', topic: 'Go Programming', href: '/capra/prepare?page=coding' },
  'java': { category: 'Coding', topic: 'Java Fundamentals', href: '/capra/prepare?page=coding' },
  'terraform': { category: 'DevOps', topic: 'Infrastructure as Code', href: '/capra/prepare?page=system-design' },
  'ci/cd': { category: 'DevOps', topic: 'CI/CD Pipelines', href: '/capra/prepare?page=system-design' },
  'mongodb': { category: 'Database', topic: 'NoSQL Databases', href: '/capra/prepare?page=databases' },
  'graphql': { category: 'API', topic: 'API Design', href: '/capra/prepare?page=system-design' },
  'rest': { category: 'API', topic: 'REST API Design', href: '/capra/prepare?page=system-design' },
  'typescript': { category: 'Coding', topic: 'TypeScript', href: '/capra/prepare?page=coding' },
  'javascript': { category: 'Coding', topic: 'JavaScript', href: '/capra/prepare?page=coding' },
  'node': { category: 'Coding', topic: 'Node.js', href: '/capra/prepare?page=coding' },
  'node.js': { category: 'Coding', topic: 'Node.js', href: '/capra/prepare?page=coding' },
  'mysql': { category: 'Database', topic: 'SQL & MySQL', href: '/capra/prepare?page=sql' },
  'elasticsearch': { category: 'System Design', topic: 'Search Systems', href: '/capra/prepare?page=system-design' },
  'rabbitmq': { category: 'System Design', topic: 'Message Queues', href: '/capra/prepare?page=system-design' },
  'nginx': { category: 'System Design', topic: 'Load Balancing', href: '/capra/prepare?page=system-design' },
  'rust': { category: 'Coding', topic: 'Rust Programming', href: '/capra/prepare?page=coding' },
  'c++': { category: 'Coding', topic: 'C++ Fundamentals', href: '/capra/prepare?page=coding' },
  'scala': { category: 'Coding', topic: 'Scala / JVM', href: '/capra/prepare?page=coding' },
  'spark': { category: 'Data', topic: 'Apache Spark', href: '/capra/prepare?page=system-design' },
};

interface StudyPathItem {
  label: string;
  href: string;
  reason: string;
}

interface StudyRound {
  title: string;
  icon: string;
  color: string;
  estimate: string;
  items: StudyPathItem[];
}

/**
 * Build a filtered prepare-page URL that includes role context.
 * This lets DocsPage filter topics to only those relevant for the job role.
 */
function buildPrepUrl(page: string, role: string, focus?: string, jobTitle?: string, company?: string): string {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('role', role);
  if (focus) params.set('focus', focus);
  if (jobTitle) params.set('jobTitle', jobTitle);
  if (company) params.set('company', company);
  return `/capra/prepare?${params.toString()}`;
}

function buildStudyPath(job: any): StudyRound[] {
  const techStack: string[] = job.ai_tech_stack || [];
  const title = (job.title || '').toLowerCase();
  const description = (job.job_description || job.ai_summary || job.description || '').toLowerCase();
  const company: string = job.company_name || '';
  const role = detectRoleFromTitle(job.title || '');

  const rounds: StudyRound[] = [];

  // Helper to build filtered href
  const prepUrl = (page: string, focus?: string) =>
    buildPrepUrl(page, role, focus, job.title, company);

  // === CODING ROUND ===
  const codingItems: StudyPathItem[] = [];

  if (title.includes('devops') || title.includes('sre') || title.includes('platform')) {
    codingItems.push({ label: 'Scripting & Automation', href: prepUrl('coding', 'Scripting & Automation'), reason: 'DevOps roles require scripting skills' });
    if (techStack.some(t => ['python','go','golang','bash'].includes(t.toLowerCase()))) {
      const lang = techStack.find(t => ['Python','Go','Golang'].includes(t)) || 'Python';
      codingItems.push({ label: `${lang} Problem Solving`, href: prepUrl('coding', `${lang} Problem Solving`), reason: 'Required in job description' });
    }
  } else if (title.includes('backend') || title.includes('full stack') || title.includes('fullstack')) {
    codingItems.push({ label: 'Data Structures & Algorithms', href: prepUrl('coding', 'Data Structures & Algorithms'), reason: 'Core backend interview topic' });
    codingItems.push({ label: 'API Design Patterns', href: prepUrl('system-design', 'API Design'), reason: 'Backend role requires API expertise' });
  } else if (title.includes('frontend') || title.includes('front end') || title.includes('front-end')) {
    codingItems.push({ label: 'JavaScript & DOM', href: prepUrl('coding', 'JavaScript & DOM'), reason: 'Frontend core skill' });
    codingItems.push({ label: 'React/Component Patterns', href: prepUrl('coding', 'React Component Patterns'), reason: 'Modern frontend patterns' });
  } else if (title.includes('data') || title.includes('ml') || title.includes('machine learning')) {
    codingItems.push({ label: 'Data Processing Algorithms', href: prepUrl('coding', 'Data Processing Algorithms'), reason: 'Data role core skill' });
    codingItems.push({ label: 'SQL & Query Optimization', href: prepUrl('sql', 'SQL & Query Optimization'), reason: 'Data manipulation skills' });
  } else {
    codingItems.push({ label: 'Core Data Structures', href: prepUrl('coding', 'Core Data Structures'), reason: 'Standard coding round preparation' });
  }

  // Add tech-specific coding items from JD
  for (const tech of techStack.slice(0, 3)) {
    const t = tech.toLowerCase();
    if (TECH_TO_TOPICS[t] && TECH_TO_TOPICS[t].category === 'Coding') {
      const page = TECH_TO_TOPICS[t].href.includes('page=sql') ? 'sql' : 'coding';
      codingItems.push({ label: `${tech} Coding Problems`, href: prepUrl(page, `${tech} Coding`), reason: 'Listed in job requirements' });
    }
  }

  if (codingItems.length > 0) {
    rounds.push({
      title: 'Coding Round',
      icon: '\u{1F4BB}',
      color: '#10b981',
      estimate: `estimated ${Math.min(codingItems.length, 3)} problems`,
      items: codingItems.slice(0, 5),
    });
  }

  // === SYSTEM DESIGN ROUND ===
  const designItems: StudyPathItem[] = [];

  if (title.includes('devops') || title.includes('sre') || title.includes('platform')) {
    designItems.push({ label: 'CI/CD Pipeline Architecture', href: prepUrl('system-design', 'CI/CD Pipeline Architecture'), reason: 'Core DevOps design topic' });
    designItems.push({ label: 'Monitoring & Observability', href: prepUrl('system-design', 'Monitoring & Observability'), reason: 'SRE/DevOps essential' });
    if (description.includes('kubernetes') || techStack.some(t => t.toLowerCase() === 'kubernetes')) {
      designItems.push({ label: 'Container Orchestration at Scale', href: prepUrl('microservices', 'Container Orchestration'), reason: 'Kubernetes mentioned in JD' });
    }
  } else if (title.includes('backend') || title.includes('full stack') || title.includes('fullstack')) {
    designItems.push({ label: 'Distributed Systems', href: prepUrl('system-design', 'Distributed Systems'), reason: 'Backend design fundamentals' });
    designItems.push({ label: 'Database Scaling & Sharding', href: prepUrl('databases', 'Database Scaling'), reason: 'Data layer design' });
  } else if (title.includes('frontend') || title.includes('front end') || title.includes('front-end')) {
    designItems.push({ label: 'Frontend Architecture Patterns', href: prepUrl('system-design', 'Frontend Architecture'), reason: 'Frontend system design' });
    designItems.push({ label: 'Performance & Rendering', href: prepUrl('system-design', 'Performance & Rendering'), reason: 'Frontend performance at scale' });
  } else if (title.includes('data') || title.includes('ml') || title.includes('machine learning')) {
    designItems.push({ label: 'Data Pipeline Architecture', href: prepUrl('system-design', 'Data Pipeline Architecture'), reason: 'Data infrastructure design' });
    designItems.push({ label: 'Batch vs Stream Processing', href: prepUrl('system-design', 'Batch vs Stream Processing'), reason: 'Core data engineering topic' });
  } else {
    designItems.push({ label: 'Scalability Fundamentals', href: prepUrl('system-design', 'Scalability Fundamentals'), reason: 'Standard system design preparation' });
    designItems.push({ label: 'Database Design', href: prepUrl('databases', 'Database Design'), reason: 'Common interview topic' });
  }

  // Add tech-specific design topics
  for (const tech of techStack) {
    const t = tech.toLowerCase();
    if (TECH_TO_TOPICS[t] && ['System Design', 'Architecture', 'DevOps'].includes(TECH_TO_TOPICS[t].category)) {
      const page = TECH_TO_TOPICS[t].href.includes('page=microservices') ? 'microservices'
        : TECH_TO_TOPICS[t].href.includes('page=databases') ? 'databases'
        : 'system-design';
      designItems.push({ label: TECH_TO_TOPICS[t].topic, href: prepUrl(page, TECH_TO_TOPICS[t].topic), reason: `${tech} in tech stack` });
    }
  }

  // Company-specific: link to behavioral page with company context (instead of broken /interview-questions/ route)
  designItems.push({
    label: `${company} Architecture Questions`,
    href: prepUrl('system-design', `${company} Architecture`),
    reason: 'Company-specific preparation',
  });

  if (designItems.length > 0) {
    rounds.push({
      title: 'System Design Round',
      icon: '\u{1F3D7}',
      color: '#3b82f6',
      estimate: `${Math.min(designItems.length, 3)} scenarios`,
      items: [...new Map(designItems.map(i => [i.label, i])).values()].slice(0, 5),
    });
  }

  // === BEHAVIORAL ROUND ===
  const behavioralItems: StudyPathItem[] = [];
  behavioralItems.push({ label: 'STAR Method Framework', href: prepUrl('behavioral', 'STAR Method Framework'), reason: 'Standard behavioral format' });

  if (title.includes('lead') || title.includes('senior') || title.includes('staff') || title.includes('principal') || title.includes('manager')) {
    behavioralItems.push({ label: 'Leadership & Mentoring Stories', href: prepUrl('behavioral', 'Leadership & Mentoring'), reason: 'Senior role requires leadership examples' });
    behavioralItems.push({ label: 'Technical Decision Making', href: prepUrl('behavioral', 'Technical Decision Making'), reason: 'Senior roles need decision-making stories' });
  } else {
    behavioralItems.push({ label: 'Teamwork & Collaboration', href: prepUrl('behavioral', 'Teamwork & Collaboration'), reason: 'Common behavioral topic' });
  }

  // Company-specific behavioral — all link to filtered behavioral page now
  if (company.toLowerCase().includes('amazon') || company.toLowerCase() === 'aws') {
    behavioralItems.push({ label: 'Amazon Leadership Principles', href: prepUrl('behavioral', 'Amazon Leadership Principles'), reason: 'Amazon interviews are LP-focused' });
  } else if (company.toLowerCase().includes('google')) {
    behavioralItems.push({ label: 'Googleyness & Culture Fit', href: prepUrl('behavioral', 'Googleyness & Culture Fit'), reason: 'Google values Googleyness' });
  } else if (company.toLowerCase().includes('meta') || company.toLowerCase().includes('facebook')) {
    behavioralItems.push({ label: 'Meta Core Values', href: prepUrl('behavioral', 'Meta Core Values'), reason: 'Meta interviews focus on core values' });
  } else {
    behavioralItems.push({ label: `${company} Culture & Values`, href: prepUrl('behavioral', `${company} Culture & Values`), reason: 'Research company culture' });
  }

  rounds.push({
    title: 'Behavioral Round',
    icon: '\u2B50',
    color: '#f59e0b',
    estimate: '4-6 questions',
    items: behavioralItems.slice(0, 5),
  });

  return rounds;
}

/* ──────────────────────────────── Helpers ──────────────────────────────── */

function slugifyCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ──────────────────────────────── Styles ──────────────────────────────── */

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Coding': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'System Design': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Database': { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  'Architecture': { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  'DevOps': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  'API': { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  'Data': { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

function getCategoryStyle(category: string) {
  return categoryColors[category] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function JobPrepPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isPaidUser } = useContentAccess();
  const [showPaywall, setShowPaywall] = useState(false);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Interview Prep state
  const [generating, setGenerating] = useState(false);
  const [generatedSections, setGeneratedSections] = useState<Record<string, any>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);

  const generatePrep = async () => {
    if (!job) return;
    // Gate: free users can't generate prep material
    if (!isPaidUser) {
      setShowPaywall(true);
      return;
    }
    setGenerating(true);
    setPrepError(null);
    setGeneratedSections({});

    try {
      const response = await fetch(`${CAPRA_API_URL}/api/ascend/prep/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          jobDescription: job.job_description || job.ai_summary || job.description || '',
          resume: 'User resume placeholder', // TODO: get from user profile
          sections: ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack'],
          provider: 'claude',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              // Check for auth/subscription errors in stream
              if (event.error) {
                if (event.subscriptionRequired || event.freeTrialExhausted) {
                  navigate('/pricing');
                  return;
                }
                if (event.authRequired) {
                  navigate('/login');
                  return;
                }
                throw new Error(event.error);
              }
              if (event.section && event.status === 'completed' && event.result) {
                setGeneratedSections(prev => ({
                  ...prev,
                  [event.section]: event.result,
                }));
              }
            } catch (parseErr: any) {
              if (parseErr.message && parseErr.message !== 'Failed to generate interview prep material. Please try again.') {
                throw parseErr; // Re-throw real errors, not JSON parse errors
              }
            }
          }
        }
      }
    } catch (err: any) {
      setPrepError(err.message || 'Failed to generate interview prep material. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // AI analysis from URL/text (stored in sessionStorage by JobsPage)
  const [urlAnalysis, setUrlAnalysis] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    // Special case: job analyzed from a pasted URL/text (no database record)
    if (id === 'url') {
      try {
        const stored = sessionStorage.getItem('jobAnalysis');
        if (stored) {
          const analysis = JSON.parse(stored);
          setUrlAnalysis(analysis);
          // Build a synthetic Job object from the analysis
          setJob({
            id: 'url',
            company_name: analysis.company || 'Unknown Company',
            title: analysis.title || 'Software Engineer',
            location: analysis.location || '',
            job_url: analysis.source_url || '',
            ai_tech_stack: analysis.tech_stack || [],
            description: analysis.summary || '',
          });
          setLoading(false);
          return;
        }
      } catch { /* ignore parse errors */ }
      setError('not-found');
      setLoading(false);
      return;
    }

    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`, { headers });
        if (res.status === 404) {
          setError('not-found');
          return;
        }
        if (!res.ok) throw new Error(`Failed to fetch job (${res.status})`);
        const data = await res.json();
        setJob(data);
      } catch (err: any) {
        if (error !== 'not-found') {
          setError(err.message || 'Failed to load job details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, token]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <SiteNav />
        <div className="flex items-center justify-center">
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 py-16 text-center">
            <div style={{ width: '48px', height: '48px', border: '4px solid #d1fae5', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Loading preparation plan...</p>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  /* ── Not found state ── */
  if (error === 'not-found') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <SiteNav />
        <div>
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 py-16 text-center">
            <svg width="48" height="48" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <h2 className="heading-2" style={{ marginBottom: '8px' }}>Job not found</h2>
            <p className="text-body" style={{ marginBottom: '24px' }}>This job listing may have been removed or the link is incorrect.</p>
            <Link to="/jobs" style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', textDecoration: 'none' }}>Back to Jobs</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !job) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <SiteNav />
        <div>
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 py-16 text-center">
            <svg width="48" height="48" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h2 className="heading-2" style={{ marginBottom: '8px' }}>Something went wrong</h2>
            <p className="text-body" style={{ marginBottom: '24px' }}>{error}</p>
            <Link to="/jobs" style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', textDecoration: 'none' }}>Back to Jobs</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  /* ── Main render ── */
  const techStack = job.ai_tech_stack || [];
  const studyRounds = buildStudyPath(job);

  return (
    <div style={{ minHeight: '100vh' }}>
      <SiteNav />

      {/* ── Page Content ── */}
      <div>

        {/* ── Header ── */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 flex-wrap mb-4" style={{ fontSize: '13px', color: '#9ca3af' }}>
              <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Home</Link>
              <span>/</span>
              <Link to="/jobs" style={{ color: '#9ca3af', textDecoration: 'none' }}>Jobs</Link>
              <span>/</span>
              <span style={{ color: '#6b7280' }}>{job.company_name}</span>
              <span>/</span>
              <span style={{ color: '#374151' }}>Prepare</span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.02em',
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>
              {job.company_name} &mdash; {job.title}
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginTop: '8px',
              lineHeight: 1.6,
              maxWidth: '640px',
            }}>
              This preparation plan is based on the job requirements and tech stack.
            </p>
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Tech Stack Extracted ── */}
          {techStack.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Tech Stack Extracted
              </h2>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>
                Technologies identified from the job listing
              </p>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => {
                  const key = tech.toLowerCase().trim();
                  const match = TECH_TO_TOPICS[key];
                  const style = match ? getCategoryStyle(match.category) : { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
                  return match ? (
                    <Link
                      key={tech}
                      to={match.href}
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: style.text,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        borderRadius: '8px',
                        padding: '6px 12px',
                        textDecoration: 'none',
                        transition: 'opacity 0.15s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{tech}</span>
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ opacity: 0.5 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </Link>
                  ) : (
                    <span
                      key={tech}
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: style.text,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        borderRadius: '8px',
                        padding: '6px 12px',
                      }}
                    >
                      {tech}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── AI Analysis Insights (shown for URL-analyzed jobs) ── */}
          {urlAnalysis && (
            <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: '28px', height: '28px', background: '#10b98118', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" fill="none" stroke="#10b981" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  AI Analysis
                </h2>
              </div>
              {urlAnalysis.summary && (
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 16px' }}>{urlAnalysis.summary}</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {urlAnalysis.coding_focus?.length > 0 && (
                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Coding Focus</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {urlAnalysis.coding_focus.map((t: string) => (
                        <span key={t} style={{ fontSize: '12px', color: '#065f46', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {urlAnalysis.system_design_focus?.length > 0 && (
                  <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>System Design Focus</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {urlAnalysis.system_design_focus.map((t: string) => (
                        <span key={t} style={{ fontSize: '12px', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {urlAnalysis.behavioral_focus?.length > 0 && (
                  <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Behavioral Focus</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {urlAnalysis.behavioral_focus.map((t: string) => (
                        <span key={t} style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {urlAnalysis.key_requirements?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Key Requirements</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                    {urlAnalysis.key_requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── Recommended Study Path ── */}
          <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Recommended Study Path
            </h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 24px' }}>
              Personalized for <strong style={{ color: '#374151' }}>{job.title}</strong> at <strong style={{ color: '#374151' }}>{job.company_name}</strong>
            </p>

            {studyRounds.map((round, roundIdx) => (
              <div key={round.title} style={{ marginBottom: roundIdx < studyRounds.length - 1 ? '28px' : 0 }}>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{
                    width: '28px',
                    height: '28px',
                    background: `${round.color}18`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}>
                    {round.icon}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {round.title}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>({round.estimate})</span>
                </div>
                <div style={{ marginLeft: '14px', borderLeft: `2px solid ${round.color}40`, paddingLeft: '20px' }}>
                  {round.items.map((item) => (
                    <StudyItem key={item.label} label={item.label} href={item.href} reason={item.reason} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* ── JD based Interview Preparation ── */}
          <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div className="flex items-start justify-between mb-1">
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                JD based Interview Preparation
              </h2>
              {Object.keys(generatedSections).length > 0 && !generating && (
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  {Object.keys(generatedSections).length} / {PREP_SECTIONS.length} sections
                </span>
              )}
            </div>

            {/* Generate button */}
            {Object.keys(generatedSections).length === 0 && !generating && (
              <button
                onClick={generatePrep}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                Prepare Material
              </button>
            )}

            {/* Generating state — button disabled with spinner */}
            {generating && Object.keys(generatedSections).length === 0 && (
              <button
                disabled
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#6ee7b7',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  cursor: 'not-allowed',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2.5px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                  }}
                  className="animate-spin"
                />
                Generating...
              </button>
            )}

            {/* Error state */}
            {prepError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '16px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" fill="none" stroke="#dc2626" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span style={{ fontSize: '13px', color: '#991b1b' }}>
                    {prepError}
                  </span>
                </div>
                <button
                  onClick={() => { setPrepError(null); generatePrep(); }}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#dc2626',
                    background: 'transparent',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Section progress + expandable cards */}
            {(generating || Object.keys(generatedSections).length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: generating && Object.keys(generatedSections).length === 0 ? '0' : '4px' }}>
                {PREP_SECTIONS.map((sec) => {
                  const isDone = !!generatedSections[sec.key];
                  const isGenerating = generating && !isDone;
                  const isExpanded = expandedSection === sec.key;
                  const isPending = !generating && !isDone;

                  // Determine status indicator
                  const currentlyGenerating = generating && !isDone && !Object.keys(generatedSections).includes(sec.key);
                  // Find the first non-completed section to mark as "active"
                  const firstPendingKey = PREP_SECTIONS.find(s => !generatedSections[s.key])?.key;
                  const isActive = generating && sec.key === firstPendingKey;

                  return (
                    <div key={sec.key}>
                      <button
                        onClick={() => {
                          if (isDone) setExpandedSection(isExpanded ? null : sec.key);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 16px',
                          background: isDone ? '#ffffff' : '#f9fafb',
                          border: `1px solid ${isDone ? '#e3e8ee' : '#f3f4f6'}`,
                          borderRadius: isExpanded ? '10px 10px 0 0' : '10px',
                          cursor: isDone ? 'pointer' : 'default',
                          textAlign: 'left',
                          transition: 'border-color 0.15s, background 0.15s',
                          ...(isDone ? {} : { opacity: isPending ? 0.5 : 1 }),
                        }}
                        onMouseEnter={(e) => { if (isDone) { (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; } }}
                        onMouseLeave={(e) => { if (isDone) { (e.currentTarget as HTMLElement).style.borderColor = '#e3e8ee'; } }}
                      >
                        {/* Status indicator */}
                        {isDone ? (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#d1fae5',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <svg width="14" height="14" fill="none" stroke="#059669" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                        ) : isActive ? (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '2.5px solid #d1fae5',
                              borderTopColor: '#10b981',
                              borderRadius: '50%',
                              flexShrink: 0,
                            }}
                            className="animate-spin"
                          />
                        ) : (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#f3f4f6',
                            borderRadius: '50%',
                            border: '2px solid #e5e7eb',
                            flexShrink: 0,
                          }} />
                        )}

                        {/* Label + description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: isDone ? '#111827' : '#6b7280',
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                          }}>
                            {sec.label}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            {sec.description}
                          </div>
                        </div>

                        {/* Chevron for completed sections */}
                        {isDone && (
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="#9ca3af"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            style={{
                              flexShrink: 0,
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        )}
                      </button>

                      {/* Expanded content */}
                      {isDone && isExpanded && (
                        <div style={{
                          padding: '20px',
                          background: '#ffffff',
                          border: '1px solid #e3e8ee',
                          borderTop: 'none',
                          borderRadius: '0 0 10px 10px',
                        }}>
                          <PrepSectionContent sectionKey={sec.key} data={generatedSections[sec.key]} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Regenerate button after generation is complete */}
                {!generating && Object.keys(generatedSections).length > 0 && (
                  <button
                    onClick={generatePrep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#6b7280',
                      background: 'transparent',
                      border: '1px solid #e3e8ee',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      marginTop: '4px',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#f9fafb'; el.style.borderColor = '#d1d5db'; el.style.color = '#374151'; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderColor = '#e3e8ee'; el.style.color = '#6b7280'; }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.99 14.359v4.992" />
                    </svg>
                    Regenerate All Sections
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Bottom CTAs ── */}
          <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Ready to start?
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/lumora?company=${encodeURIComponent(job.company_name)}&role=${encodeURIComponent(job.title)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Start Practicing
              </Link>
              <Link
                to="/capra/prepare"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  background: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  textDecoration: 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f9fafb'; (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#ffffff'; (e.currentTarget as HTMLElement).style.borderColor = '#e3e8ee'; }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                View All Topics
              </Link>
              <a
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  background: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  textDecoration: 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f9fafb'; (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#ffffff'; (e.currentTarget as HTMLElement).style.borderColor = '#e3e8ee'; }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View Job Listing
              </a>
            </div>
          </section>

        </div>
      </div>
      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPaywall(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 p-8" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Upgrade to Generate Prep Material</h3>
              <p className="text-sm text-gray-500">AI-powered interview prep tailored to this specific job</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { name: 'Starter', price: '$29', period: '/mo', features: ['Unlimited prep & practice', '10 live sessions/mo', 'AI explanations', 'System design diagrams'], priceId: 'price_1THhzGITUCNxtMxll78umJSX' },
                { name: 'Pro', price: '$49', period: '/mo', features: ['Everything in Starter', 'Unlimited live sessions', 'Job matching & auto apply', 'Company-specific prep'], popular: true, priceId: 'price_1THhzhITUCNxtMxl1QSxi4Kj' },
                { name: 'Annual', price: '$19', period: '/mo', features: ['Everything in Pro', 'Save 61% vs monthly', 'Locked-in pricing', 'Priority support'], best: true, priceId: 'price_1THiBUITUCNxtMxlAHUvPut7' },
              ].map(plan => (
                <div key={plan.name} className="rounded-2xl p-4 flex flex-col" style={{
                  border: plan.popular ? '2px solid #10b981' : plan.best ? '2px solid #f59e0b' : '1.5px solid #e3e8ee',
                  background: 'white',
                }}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">{plan.name}</h4>
                    {plan.popular && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white uppercase" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>Popular</span>}
                    {plan.best && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white uppercase" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Best Value</span>}
                  </div>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={async () => {
                      try {
                        const API = import.meta.env.VITE_CAMORA_API_URL || import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
                        const authToken = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('cariara_sso='))?.split('=')[1];
                        if (!authToken) { navigate('/login'); return; }
                        const resp = await fetch(`${API}/api/v1/billing/checkout`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                          body: JSON.stringify({ price_id: plan.priceId, success_url: window.location.href, cancel_url: window.location.href }),
                        });
                        if (!resp.ok) { navigate('/pricing'); return; }
                        const data = await resp.json();
                        if (data.url) window.location.href = data.url;
                        else navigate('/pricing');
                      } catch { navigate('/pricing'); }
                    }}
                    className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${plan.popular ? 'text-white' : plan.best ? 'text-white' : 'text-gray-700 border border-gray-300 hover:border-gray-400'}`}
                    style={plan.popular ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)' } : plan.best ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}
                  >
                    Get {plan.name}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPaywall(false)} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Continue with free plan
            </button>
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}

/* ──────────────────────────────── StudyItem sub-component ──────────────────────────────── */

function StudyItem({ label, href, reason }: { label: string; href: string; reason?: string }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <Link
        to={href}
        className="group"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          textDecoration: 'none',
          padding: '6px 0',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#10b981'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#374151'; }}
      >
        {/* Checkbox icon */}
        <svg width="16" height="16" fill="none" stroke="#d1d5db" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span>{label}</span>
          {reason && (
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400, marginTop: '1px' }}>
              {reason}
            </div>
          )}
        </div>
        {/* Chevron */}
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ opacity: 0.3, flexShrink: 0, marginTop: '4px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  );
}

/* ──────────────────────────────── Styled helpers for book-style prep content ──────────────────────────────── */

const S = {
  h2: { fontSize: '18px', fontWeight: 700 as const, color: '#000', margin: '0 0 12px', borderBottom: '2px solid #d1fae5', paddingBottom: '6px' },
  h3: { fontSize: '15px', fontWeight: 700 as const, color: '#111827', margin: '20px 0 8px', paddingLeft: '10px', borderLeft: '3px solid #6ee7b7' },
  h4: { fontSize: '12px', fontWeight: 600 as const, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '14px 0 6px 20px' },
  p: { fontSize: '14px', color: '#1f2937', lineHeight: 1.8, margin: '0 0 8px 20px', whiteSpace: 'pre-wrap' as const },
  li: { fontSize: '14px', color: '#1f2937', lineHeight: 1.7, marginBottom: '4px' },
  ul: { margin: '0 0 8px', paddingLeft: '38px' },
  callout: (color: string) => ({ background: color === 'green' ? '#f0fdf4' : color === 'blue' ? '#eff6ff' : color === 'amber' ? '#fffbeb' : color === 'red' ? '#fef2f2' : '#f5f3ff', borderLeft: `3px solid ${color === 'green' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : color === 'red' ? '#ef4444' : '#8b5cf6'}`, borderRadius: '6px', padding: '12px 16px', margin: '8px 0 12px 20px' }),
  divider: { borderBottom: '1px solid #e5e7eb', margin: '16px 0' },
  code: { fontSize: '13px', background: '#0d1117', color: '#c9d1d9', borderRadius: '8px', padding: '14px 16px', overflow: 'auto' as const, margin: '8px 0 12px 20px', fontFamily: "'IBM Plex Mono', monospace" },
  badge: (color: string) => ({ fontSize: '11px', fontWeight: 700 as const, color, background: color === '#dc2626' ? '#fef2f2' : color === '#d97706' ? '#fffbeb' : '#ecfdf5', padding: '2px 10px', borderRadius: '4px', textTransform: 'uppercase' as const }),
};

/* ──────────────────────────────── PrepSectionContent sub-component ──────────────────────────────── */

function PrepSectionContent({ sectionKey, data }: { sectionKey: string; data: any }) {
  if (!data) return null;

  // If data is a plain string, render it directly
  if (typeof data === 'string') {
    return <div style={S.p}>{data}</div>;
  }

  // ═══════════════════════ ELEVATOR PITCH ═══════════════════════
  if (sectionKey === 'pitch') {
    const sections = data.pitchSections || data.sections;
    if (Array.isArray(sections)) {
      return (
        <div>
          {sections.map((sec: any, i: number) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <h3 style={S.h3}>
                {sec.title}
                {sec.duration && <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '10px' }}>({sec.duration})</span>}
              </h3>
              {sec.context && <p style={{ ...S.p, fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>{sec.context}</p>}
              {sec.bullets && (
                <ul style={S.ul}>
                  {sec.bullets.map((b: string, j: number) => <li key={j} style={S.li}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
          {data.talkingPoints && Array.isArray(data.talkingPoints) && (
            <div>
              <h4 style={S.h4}>Key Talking Points</h4>
              <ul style={S.ul}>{data.talkingPoints.map((t: string, i: number) => <li key={i} style={S.li}>{t}</li>)}</ul>
            </div>
          )}
          {data.tips && (
            <div style={S.callout('amber')}>
              <h4 style={{ ...S.h4, margin: '0 0 6px 0', color: '#92400e' }}>Delivery Tips</h4>
              <p style={{ ...S.p, margin: 0 }}>{typeof data.tips === 'string' ? data.tips : Array.isArray(data.tips) ? data.tips.join('\n') : ''}</p>
            </div>
          )}
          {data.techStack && Array.isArray(data.techStack) && (
            <div>
              <h4 style={S.h4}>Tech Stack to Highlight</h4>
              <ul style={S.ul}>{data.techStack.map((t: any, i: number) => <li key={i} style={S.li}><strong>{t.technology}</strong> — {t.relevance || t.experience}</li>)}</ul>
            </div>
          )}
        </div>
      );
    }
    const pitch = data.pitch || data.content || data.text || '';
    if (pitch) return <div style={S.callout('green')}><p style={{ ...S.p, margin: 0 }}>{pitch}</p></div>;
  }

  // ═══════════════════════ HR / HIRING MANAGER / BEHAVIORAL ═══════════════════════
  if (['hr', 'hiring-manager', 'behavioral'].includes(sectionKey)) {
    const questions = data.questions || data.items || (Array.isArray(data) ? data : []);
    return (
      <div>
        {data.summary && typeof data.summary === 'string' && (
          <div style={S.callout('blue')}>
            <h4 style={{ ...S.h4, margin: '0 0 6px 0', color: '#1e40af' }}>Overview</h4>
            <p style={{ ...S.p, margin: 0 }}>{data.summary}</p>
          </div>
        )}
        {data.companyInsights && typeof data.companyInsights === 'object' && (
          <div style={S.callout('violet')}>
            <h4 style={{ ...S.h4, margin: '0 0 8px 0', color: '#5b21b6' }}>Company Insights</h4>
            {data.companyInsights.interviewFormat && <p style={{ ...S.p, margin: '0 0 4px' }}><strong>Interview Format:</strong> {data.companyInsights.interviewFormat}</p>}
            {data.companyInsights.culture && <p style={{ ...S.p, margin: '0 0 4px' }}><strong>Culture:</strong> {data.companyInsights.culture}</p>}
            {data.companyInsights.values && Array.isArray(data.companyInsights.values) && <p style={{ ...S.p, margin: 0 }}><strong>Values:</strong> {data.companyInsights.values.join(' · ')}</p>}
            {data.companyInsights.recentNews && <p style={{ ...S.p, margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{data.companyInsights.recentNews}</p>}
          </div>
        )}

        {Array.isArray(questions) && questions.length > 0 && questions.map((q: any, i: number) => (
          <div key={i} style={{ marginBottom: '24px' }}>
            <h3 style={S.h3}>
              <span style={{ color: '#059669', marginRight: '6px' }}>Q{i + 1}.</span>
              {q.question || q.q || (typeof q === 'string' ? q : '')}
            </h3>
            {q.whyTheyAsk && <p style={{ ...S.p, fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Why they ask this: {q.whyTheyAsk}</p>}
            {(q.suggestedAnswer || q.answer || q.a || q.sampleAnswer) && (
              <div style={S.callout('green')}>
                <h4 style={{ ...S.h4, margin: '0 0 6px 0', color: '#065f46' }}>Suggested Answer</h4>
                <p style={{ ...S.p, margin: 0 }}>{q.suggestedAnswer || q.answer || q.a || q.sampleAnswer}</p>
              </div>
            )}
            {q.tips && <p style={{ ...S.p, fontSize: '13px', color: '#6b7280' }}>Tip: {q.tips}</p>}
            {sectionKey === 'behavioral' && (q.situation || q.task || q.action || q.result) && (
              <div style={{ marginLeft: '20px', marginTop: '10px' }}>
                <h4 style={{ ...S.h4, margin: '0 0 8px 0' }}>STAR Framework</h4>
                {q.situation && <p style={S.p}><strong style={{ color: '#059669' }}>Situation:</strong> {q.situation}</p>}
                {q.task && <p style={S.p}><strong style={{ color: '#059669' }}>Task:</strong> {q.task}</p>}
                {q.action && <p style={S.p}><strong style={{ color: '#059669' }}>Action:</strong> {q.action}</p>}
                {q.result && <p style={S.p}><strong style={{ color: '#059669' }}>Result:</strong> {q.result}</p>}
              </div>
            )}
            {i < questions.length - 1 && <div style={S.divider} />}
          </div>
        ))}

        {data.salaryNegotiation && typeof data.salaryNegotiation === 'object' && (
          <div style={S.callout('amber')}>
            <h4 style={{ ...S.h4, margin: '0 0 8px 0', color: '#92400e' }}>Salary Negotiation</h4>
            {data.salaryNegotiation.rangeEstimate && <p style={{ ...S.p, margin: '0 0 4px' }}><strong>Expected Range:</strong> {data.salaryNegotiation.rangeEstimate}</p>}
            {data.salaryNegotiation.companyContext && <p style={{ ...S.p, margin: '0 0 4px' }}>{data.salaryNegotiation.companyContext}</p>}
            {data.salaryNegotiation.negotiationTips && <p style={{ ...S.p, margin: 0 }}><strong>Tips:</strong> {data.salaryNegotiation.negotiationTips}</p>}
          </div>
        )}
        {data.questionsToAsk && Array.isArray(data.questionsToAsk) && (
          <div>
            <h3 style={S.h3}>Questions You Should Ask</h3>
            <ul style={S.ul}>{data.questionsToAsk.map((q: string, i: number) => <li key={i} style={S.li}>{q}</li>)}</ul>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════ CODING QUESTIONS ═══════════════════════
  if (sectionKey === 'coding') {
    const problems = data.questions || data.problems || data.items || (Array.isArray(data) ? data : []);
    return (
      <div>
        {data.summary && <div style={S.callout('violet')}><p style={{ ...S.p, margin: 0 }}>{data.summary}</p></div>}
        {data.companyInsights && <div style={S.callout('blue')}><h4 style={{ ...S.h4, margin: '0 0 6px 0', color: '#1e40af' }}>Company-Specific Notes</h4><p style={{ ...S.p, margin: 0 }}>{typeof data.companyInsights === 'string' ? data.companyInsights : ''}</p></div>}
        {data.keyTopics && Array.isArray(data.keyTopics) && (
          <div>
            <h3 style={S.h3}>Key Topics to Prepare</h3>
            <ul style={S.ul}>
              {data.keyTopics.map((t: any, i: number) => (
                <li key={i} style={S.li}>
                  <strong>{t.topic || t}</strong>
                  {t.frequency && <span style={{ color: '#6b7280' }}> — {t.frequency}</span>}
                  {t.whyImportant && <span style={{ color: '#6b7280' }}> — {t.whyImportant}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(problems) && problems.map((p: any, i: number) => (
          <div key={i} style={{ marginBottom: '28px' }}>
            <h3 style={S.h3}>
              <span style={S.badge((p.difficulty || '').toLowerCase() === 'hard' ? '#dc2626' : (p.difficulty || '').toLowerCase() === 'medium' ? '#d97706' : '#059669')}>{p.difficulty || 'Medium'}</span>
              <span style={{ marginLeft: '8px' }}>{p.title || p.name || `Problem ${i + 1}`}</span>
              {p.frequency && <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>({p.frequency})</span>}
            </h3>
            {p.problemStatement && <p style={S.p}>{p.problemStatement}</p>}
            {p.examples && Array.isArray(p.examples) && (
              <div>
                <h4 style={S.h4}>Examples</h4>
                {p.examples.map((ex: any, j: number) => (
                  <pre key={j} style={{ ...S.code, fontSize: '12px' }}>
                    <code>Input:  {typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input)}{'\n'}Output: {typeof ex.output === 'string' ? ex.output : JSON.stringify(ex.output)}{ex.explanation ? `\n// ${ex.explanation}` : ''}</code>
                  </pre>
                ))}
              </div>
            )}
            {p.approaches && Array.isArray(p.approaches) && p.approaches.map((a: any, j: number) => (
              <div key={j} style={{ marginLeft: '20px', marginTop: '14px' }}>
                <h4 style={{ ...S.h4, margin: '0 0 6px 0' }}>
                  Approach {j + 1}: {a.name}
                  <span style={{ fontWeight: 400, fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>
                    Time: O({a.timeComplexity}) · Space: O({a.spaceComplexity})
                  </span>
                </h4>
                {a.code && <pre style={S.code}><code>{a.code}</code></pre>}
                {a.lineByLine && Array.isArray(a.lineByLine) && (
                  <div style={{ marginLeft: '20px' }}>
                    <h4 style={{ ...S.h4, fontSize: '11px' }}>Line-by-Line Explanation</h4>
                    {a.lineByLine.map((l: any, k: number) => (
                      <p key={k} style={{ ...S.p, fontSize: '12px', margin: '0 0 3px' }}><code style={{ color: '#059669' }}>{l.line}</code> — {l.explanation}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {p.edgeCases && Array.isArray(p.edgeCases) && (
              <div><h4 style={S.h4}>Edge Cases</h4><ul style={S.ul}>{p.edgeCases.map((e: any, j: number) => <li key={j} style={S.li}><strong>{e.case || e}:</strong> {e.explanation || ''}</li>)}</ul></div>
            )}
            {p.commonMistakes && Array.isArray(p.commonMistakes) && (
              <div style={S.callout('red')}>
                <h4 style={{ ...S.h4, margin: '0 0 6px 0', color: '#991b1b' }}>Common Mistakes</h4>
                <ul style={{ ...S.ul, paddingLeft: '18px' }}>{p.commonMistakes.map((m: string, j: number) => <li key={j} style={{ ...S.li, color: '#991b1b' }}>{m}</li>)}</ul>
              </div>
            )}
            {p.followUpQuestions && Array.isArray(p.followUpQuestions) && (
              <div><h4 style={S.h4}>Follow-up Questions</h4><ul style={S.ul}>{p.followUpQuestions.map((f: string, j: number) => <li key={j} style={S.li}>{f}</li>)}</ul></div>
            )}
            {i < problems.length - 1 && <div style={S.divider} />}
          </div>
        ))}
        {data.practiceRecommendations && Array.isArray(data.practiceRecommendations) && (
          <div>
            <h3 style={S.h3}>Practice Recommendations</h3>
            {data.practiceRecommendations.map((r: any, i: number) => (
              <div key={i} style={{ marginBottom: '10px', marginLeft: '20px' }}>
                <p style={S.p}><strong>{r.platform}:</strong> {r.reason}</p>
                {r.problems && Array.isArray(r.problems) && <ul style={S.ul}>{r.problems.map((p: string, j: number) => <li key={j} style={S.li}>{p}</li>)}</ul>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════ SYSTEM DESIGN ═══════════════════════
  if (sectionKey === 'system-design') {
    const questions = data.questions || data.scenarios || data.items || (Array.isArray(data) ? data : []);
    return (
      <div>
        {data.summary && <div style={S.callout('blue')}><p style={{ ...S.p, margin: 0 }}>{data.summary}</p></div>}
        {data.companyContext && <div style={S.callout('violet')}><h4 style={{ ...S.h4, margin: '0 0 6px 0', color: '#5b21b6' }}>Company Context</h4><p style={{ ...S.p, margin: 0 }}>{data.companyContext}</p></div>}
        {data.ascendFramework && (
          <div style={S.callout('green')}>
            <h4 style={{ ...S.h4, margin: '0 0 8px 0', color: '#065f46' }}>Interview Framework</h4>
            {data.ascendFramework.timeAllocation && (
              <p style={{ ...S.p, margin: '0 0 6px', fontSize: '13px' }}>
                <strong>Time:</strong> Requirements ({data.ascendFramework.timeAllocation.requirements}) → High Level ({data.ascendFramework.timeAllocation.highLevel}) → Deep Dive ({data.ascendFramework.timeAllocation.deepDive}) → Wrap Up ({data.ascendFramework.timeAllocation.wrapUp})
              </p>
            )}
            {data.ascendFramework.whatTheyLookFor && <ul style={{ ...S.ul, margin: 0 }}>{data.ascendFramework.whatTheyLookFor.map((w: string, i: number) => <li key={i} style={S.li}>{w}</li>)}</ul>}
          </div>
        )}
        {Array.isArray(questions) && questions.map((q: any, i: number) => (
          <div key={i} style={{ marginBottom: '30px' }}>
            <h3 style={{ ...S.h3, fontSize: '16px' }}>
              {q.title || `Design Scenario ${i + 1}`}
              {q.frequency && <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>({q.frequency})</span>}
              {q.timeLimit && <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>{q.timeLimit}</span>}
            </h3>
            {q.clarifyingQuestions && Array.isArray(q.clarifyingQuestions) && (
              <div><h4 style={S.h4}>Clarifying Questions to Ask</h4><ul style={S.ul}>{q.clarifyingQuestions.map((c: string, j: number) => <li key={j} style={S.li}>{c}</li>)}</ul></div>
            )}
            {q.requirements && (
              <div>
                {q.requirements.functional && (<><h4 style={S.h4}>Functional Requirements</h4><ul style={S.ul}>{q.requirements.functional.map((r: string, j: number) => <li key={j} style={S.li}>{r}</li>)}</ul></>)}
                {q.requirements.nonFunctional && (<><h4 style={S.h4}>Non-Functional Requirements</h4><ul style={S.ul}>{q.requirements.nonFunctional.map((r: string, j: number) => <li key={j} style={S.li}>{r}</li>)}</ul></>)}
              </div>
            )}
            {q.capacityEstimation && (
              <div>
                <h4 style={S.h4}>Capacity Estimation</h4>
                {q.capacityEstimation.assumptions && Array.isArray(q.capacityEstimation.assumptions) && (
                  <ul style={S.ul}>{q.capacityEstimation.assumptions.map((a: string, j: number) => <li key={j} style={{ ...S.li, fontSize: '13px', color: '#6b7280' }}>{a}</li>)}</ul>
                )}
                {q.capacityEstimation.calculations && (
                  <div style={{ margin: '8px 20px', overflow: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                      <thead><tr style={{ background: '#f0fdf4' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#065f46', borderBottom: '2px solid #a7f3d0' }}>Metric</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#065f46', borderBottom: '2px solid #a7f3d0' }}>Result</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#065f46', borderBottom: '2px solid #a7f3d0' }}>Calculation</th>
                      </tr></thead>
                      <tbody>{q.capacityEstimation.calculations.map((c: any, j: number) => (
                        <tr key={j} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '6px 12px', fontWeight: 600, color: '#111827' }}>{c.metric}</td>
                          <td style={{ padding: '6px 12px', fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>{c.result}</td>
                          <td style={{ padding: '6px 12px', color: '#6b7280' }}>{c.calculation}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {q.architecture && q.architecture.components && (
              <div>
                <h4 style={S.h4}>Architecture Components</h4>
                {q.architecture.diagramDescription && <p style={{ ...S.p, fontSize: '13px', fontStyle: 'italic', color: '#6b7280' }}>{q.architecture.diagramDescription}</p>}
                {q.architecture.components.map((c: any, j: number) => (
                  <div key={j} style={{ marginLeft: '20px', marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid #d1fae5' }}>
                    <p style={{ ...S.p, margin: '0 0 2px' }}><strong>{c.name}</strong> <span style={{ color: '#6b7280' }}>({c.technology})</span></p>
                    <p style={{ ...S.p, margin: 0, fontSize: '13px', color: '#4b5563' }}>{c.responsibility}{c.whyThisChoice ? ` — ${c.whyThisChoice}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
            {q.databaseDesign && q.databaseDesign.schema && (
              <div>
                <h4 style={S.h4}>Database Design</h4>
                {q.databaseDesign.schema.map((t: any, j: number) => (
                  <div key={j} style={{ marginBottom: '10px' }}>
                    <p style={{ ...S.p, fontWeight: 700, marginBottom: '4px' }}>{t.table}</p>
                    {t.columns && <pre style={{ ...S.code, fontSize: '12px' }}><code>{t.columns.map((col: any) => `${col.name}: ${col.type}${col.constraint ? ` (${col.constraint})` : ''}`).join('\n')}</code></pre>}
                  </div>
                ))}
                {q.databaseDesign.indexStrategy && <p style={{ ...S.p, fontSize: '13px' }}><strong>Index Strategy:</strong> {q.databaseDesign.indexStrategy}</p>}
              </div>
            )}
            {q.apiDesign && Array.isArray(q.apiDesign) && (
              <div>
                <h4 style={S.h4}>API Design</h4>
                {q.apiDesign.map((a: any, j: number) => (
                  <div key={j} style={{ marginLeft: '20px', marginBottom: '6px' }}>
                    <code style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{a.endpoint}</code>
                    {a.notes && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>— {a.notes}</span>}
                  </div>
                ))}
              </div>
            )}
            {q.scalabilityConsiderations && Array.isArray(q.scalabilityConsiderations) && (
              <div>
                <h4 style={S.h4}>Scalability Considerations</h4>
                <ul style={S.ul}>{q.scalabilityConsiderations.map((s: any, j: number) => <li key={j} style={S.li}><strong>{s.challenge}:</strong> {s.solution}</li>)}</ul>
              </div>
            )}
            {q.diagramUrl && <div style={{ margin: '12px 20px' }}><img src={q.diagramUrl} alt="Architecture Diagram" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }} /></div>}
            {i < questions.length - 1 && <div style={S.divider} />}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════ TECH STACK ═══════════════════════
  if (sectionKey === 'techstack') {
    const topics = data.technologies || data.topics || data.items || data.techStack || (Array.isArray(data) ? data : []);
    return (
      <div>
        {data.summary && <div style={S.callout('amber')}><p style={{ ...S.p, margin: 0 }}>{data.summary}</p></div>}
        {Array.isArray(topics) && topics.map((t: any, i: number) => (
          <div key={i} style={{ marginBottom: '24px' }}>
            <h3 style={S.h3}>
              {t.technology || t.name || t.topic || (typeof t === 'string' ? t : `Topic ${i + 1}`)}
              {t.category && <span style={{ fontSize: '11px', fontWeight: 400, color: '#6b7280', marginLeft: '10px', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{t.category}</span>}
            </h3>
            {(t.description || t.detail || t.overview) && <p style={S.p}>{t.description || t.detail || t.overview}</p>}
            {t.keyConceptsToReview && Array.isArray(t.keyConceptsToReview) && (
              <div><h4 style={S.h4}>Key Concepts to Review</h4><ul style={S.ul}>{t.keyConceptsToReview.map((c: string, j: number) => <li key={j} style={S.li}>{c}</li>)}</ul></div>
            )}
            {t.interviewQuestions && Array.isArray(t.interviewQuestions) && (
              <div>
                <h4 style={S.h4}>Likely Interview Questions</h4>
                {t.interviewQuestions.map((q: any, j: number) => (
                  <div key={j} style={{ marginBottom: '12px', marginLeft: '20px' }}>
                    <p style={{ ...S.p, fontWeight: 600, margin: '0 0 4px' }}>{typeof q === 'string' ? q : q.question}</p>
                    {q.answer && <div style={S.callout('green')}><p style={{ ...S.p, margin: 0, fontSize: '13px' }}>{q.answer}</p></div>}
                  </div>
                ))}
              </div>
            )}
            {i < topics.length - 1 && <div style={S.divider} />}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════ FALLBACK ═══════════════════════
  if (typeof data === 'object') {
    return <div>{renderObject(data)}</div>;
  }
  return <div style={S.p}>{String(data)}</div>;
}

/* ── Recursively render any JSON as readable tree ── */
function renderObject(obj: any, depth = 0): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return <span style={{ fontSize: '14px', color: '#1f2937', lineHeight: 1.8 }}>{String(obj)}</span>;
  }
  if (Array.isArray(obj)) {
    return (
      <ul style={{ margin: '4px 0', paddingLeft: '24px' }}>
        {obj.map((item, i) => (
          <li key={i} style={{ fontSize: '14px', color: '#1f2937', lineHeight: 1.7, marginBottom: '4px' }}>
            {typeof item === 'object' ? renderObject(item, depth + 1) : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div style={{ marginLeft: depth > 0 ? '16px' : '0', marginTop: '4px' }}>
      {Object.entries(obj).map(([key, val]) => {
        const humanKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        return (
          <div key={key} style={{ marginBottom: '8px' }}>
            <strong style={{ fontSize: '13px', color: '#000', textTransform: 'capitalize' }}>{humanKey}: </strong>
            {typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
              ? <span style={{ fontSize: '14px', color: '#1f2937' }}>{String(val)}</span>
              : renderObject(val, depth + 1)
            }
          </div>
        );
      })}
    </div>
  );
}
