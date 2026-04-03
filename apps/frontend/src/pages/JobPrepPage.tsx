import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  { key: 'techstack', label: 'Tech Stack Analysis', description: 'Technology-specific questions and deep dives', icon: '🔧' },
  { key: 'hr', label: 'HR Questions', description: 'Salary negotiation, availability, culture fit', icon: '🤝' },
  { key: 'hiring-manager', label: 'Hiring Manager Questions', description: 'Role-specific technical and behavioral questions', icon: '👔' },
  { key: 'coding', label: 'Coding Questions', description: 'Likely coding problems based on the tech stack', icon: '💻' },
  { key: 'system-design', label: 'System Design Questions', description: 'System design scenarios based on job requirements', icon: '🏗' },
  { key: 'behavioral', label: 'Behavioral Questions', description: 'STAR-format questions tailored to the role', icon: '⭐' },
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

const CODING_TOPICS = [
  { label: 'Arrays & Hashing', href: '/capra/prepare/coding?topic=arrays-hashing' },
  { label: 'Trees & Graphs', href: '/capra/prepare/coding?topic=trees-graphs' },
  { label: 'Dynamic Programming', href: '/capra/prepare/coding?topic=dp' },
];

const SYSTEM_DESIGN_TOPICS = [
  { label: 'Scalability Fundamentals', href: '/capra/prepare/system-design' },
  { label: 'Database Design', href: '/capra/prepare/databases' },
];

const BEHAVIORAL_TOPICS = [
  { label: 'STAR Method', href: '/capra/prepare/behavioral' },
  { label: 'Company Culture Fit', href: '/capra/prepare/behavioral' },
];

/* ──────────────────────────────── Helpers ──────────────────────────────── */

function matchTechStack(techStack: string[]): { category: string; topic: string; href: string; tech: string }[] {
  const matched: { category: string; topic: string; href: string; tech: string }[] = [];
  const seen = new Set<string>();

  for (const tech of techStack) {
    const key = tech.toLowerCase().trim();
    const match = TECH_TO_TOPICS[key];
    if (match && !seen.has(match.topic)) {
      seen.add(match.topic);
      matched.push({ ...match, tech });
    }
  }

  return matched;
}

function isAmazon(companyName: string): boolean {
  const lower = companyName.toLowerCase();
  return lower.includes('amazon') || lower === 'aws';
}

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
  const { token } = useAuth();

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
          sections: ['hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack'],
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
                  window.location.href = '/pricing';
                  return;
                }
                if (event.authRequired) {
                  window.location.href = '/login';
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

  useEffect(() => {
    if (!id) return;

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
      <div style={{ background: '#f7f8f9', minHeight: '100vh' }}>
        <nav style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', height: '56px' }}>
          <div className="max-w-4xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div style={{ width: '28px', height: '28px', background: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>C</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Camora</span>
            </Link>
          </div>
        </nav>
        <div style={{ paddingTop: '56px' }} className="flex items-center justify-center" >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div style={{ width: '48px', height: '48px', border: '4px solid #d1fae5', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Loading preparation plan...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found state ── */
  if (error === 'not-found') {
    return (
      <div style={{ background: '#f7f8f9', minHeight: '100vh' }}>
        <nav style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', height: '56px' }}>
          <div className="max-w-4xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div style={{ width: '28px', height: '28px', background: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>C</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Camora</span>
            </Link>
          </div>
        </nav>
        <div style={{ paddingTop: '56px' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <svg width="48" height="48" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Job not found</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>This job listing may have been removed or the link is incorrect.</p>
            <Link to="/jobs" style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', textDecoration: 'none' }}>
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !job) {
    return (
      <div style={{ background: '#f7f8f9', minHeight: '100vh' }}>
        <nav style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', height: '56px' }}>
          <div className="max-w-4xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div style={{ width: '28px', height: '28px', background: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>C</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Camora</span>
            </Link>
          </div>
        </nav>
        <div style={{ paddingTop: '56px' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <svg width="48" height="48" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Something went wrong</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>{error}</p>
            <Link to="/jobs" style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', textDecoration: 'none' }}>
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  const techStack = job.ai_tech_stack || [];
  const matchedTopics = matchTechStack(techStack);
  const companySlug = slugifyCompany(job.company_name);
  const showAmazonLP = isAmazon(job.company_name);

  // Group matched topics by category
  const topicsByCategory: Record<string, { topic: string; href: string; tech: string }[]> = {};
  for (const m of matchedTopics) {
    if (!topicsByCategory[m.category]) topicsByCategory[m.category] = [];
    topicsByCategory[m.category].push(m);
  }

  // Determine cloud-specific topics from matches
  const cloudTopics = matchedTopics.filter(m =>
    m.topic.includes('Cloud') || m.topic.includes('Container') || m.topic.includes('Infrastructure')
  );

  return (
    <div style={{ background: '#f7f8f9', minHeight: '100vh' }}>

      {/* ── Navigation ── */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', height: '56px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="max-w-4xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div style={{ width: '28px', height: '28px', background: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>C</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Camora</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {[
              { label: 'Apply', href: '/jobs' },
              { label: 'Prepare', href: '/capra/prepare' },
              { label: 'Practice', href: '/capra/practice' },
              { label: 'Attend', href: '/lumora' },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.href}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: link.label === 'Prepare' ? '#10b981' : '#4b5563',
                  borderBottom: link.label === 'Prepare' ? '2px solid #10b981' : '2px solid transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div style={{ paddingTop: '56px' }}>

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

          {/* ── Recommended Study Path ── */}
          <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Recommended Study Path
            </h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 24px' }}>
              A personalized checklist based on typical interview rounds
            </p>

            {/* ── Coding Round ── */}
            <div style={{ marginBottom: '28px' }}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: '28px', height: '28px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" fill="none" stroke="#1d4ed8" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  Coding Round
                </h3>
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>(estimated 2-3 problems)</span>
              </div>
              <div style={{ marginLeft: '14px', borderLeft: '2px solid #e5e7eb', paddingLeft: '20px' }}>
                {CODING_TOPICS.map((t) => (
                  <StudyItem key={t.label} label={t.label} href={t.href} />
                ))}
                {topicsByCategory['Coding']?.map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#1d4ed8" />
                ))}
              </div>
            </div>

            {/* ── System Design Round ── */}
            <div style={{ marginBottom: '28px' }}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: '28px', height: '28px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" fill="none" stroke="#92400e" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  System Design Round
                </h3>
              </div>
              <div style={{ marginLeft: '14px', borderLeft: '2px solid #e5e7eb', paddingLeft: '20px' }}>
                {SYSTEM_DESIGN_TOPICS.map((t) => (
                  <StudyItem key={t.label} label={t.label} href={t.href} />
                ))}
                {cloudTopics.map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#92400e" />
                ))}
                {topicsByCategory['System Design']?.filter(t =>
                  !cloudTopics.some(c => c.topic === t.topic) && !SYSTEM_DESIGN_TOPICS.some(s => s.label === t.topic)
                ).map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#92400e" />
                ))}
                {topicsByCategory['Database']?.map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#065f46" />
                ))}
                {topicsByCategory['Architecture']?.map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#9d174d" />
                ))}
                {topicsByCategory['DevOps']?.map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#6b21a8" />
                ))}
                {topicsByCategory['API']?.map((t) => (
                  <StudyItem key={t.topic} label={t.topic} href={t.href} badge={t.tech} badgeColor="#9a3412" />
                ))}
                <StudyItem
                  label={`Company-specific: ${job.company_name} interview questions`}
                  href={`/interview-questions/${companySlug}`}
                />
              </div>
            </div>

            {/* ── Behavioral Round ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: '28px', height: '28px', background: '#fce7f3', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" fill="none" stroke="#9d174d" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  Behavioral Round
                </h3>
              </div>
              <div style={{ marginLeft: '14px', borderLeft: '2px solid #e5e7eb', paddingLeft: '20px' }}>
                {BEHAVIORAL_TOPICS.map((t) => (
                  <StudyItem key={t.label} label={t.label} href={t.href} />
                ))}
                {showAmazonLP && (
                  <StudyItem
                    label="Amazon Leadership Principles"
                    href={`/interview-questions/${companySlug}`}
                    badge="Amazon"
                    badgeColor="#9d174d"
                  />
                )}
              </div>
            </div>
          </section>

          {/* ── AI-Generated Interview Preparation ── */}
          <section style={{ background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div className="flex items-start justify-between mb-1">
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                AI-Generated Interview Preparation
              </h2>
              {Object.keys(generatedSections).length > 0 && !generating && (
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  {Object.keys(generatedSections).length} / {PREP_SECTIONS.length} sections
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 20px' }}>
              Generate personalized prep material using AI based on this job's description and requirements
            </p>

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
                Generate Prep Material
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
    </div>
  );
}

/* ──────────────────────────────── StudyItem sub-component ──────────────────────────────── */

function StudyItem({ label, href, badge, badgeColor }: { label: string; href: string; badge?: string; badgeColor?: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <Link
        to={href}
        className="group"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
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
        <svg width="16" height="16" fill="none" stroke="#d1d5db" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0 }}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
        </svg>
        <span>{label}</span>
        {badge && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: badgeColor || '#6b7280',
            background: `${badgeColor || '#6b7280'}14`,
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {badge}
          </span>
        )}
        {/* Arrow */}
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ opacity: 0.3, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  );
}

/* ──────────────────────────────── PrepSectionContent sub-component ──────────────────────────────── */

function PrepSectionContent({ sectionKey, data }: { sectionKey: string; data: any }) {
  if (!data) return null;

  // If data is a plain string, render it directly
  if (typeof data === 'string') {
    return (
      <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {data}
      </div>
    );
  }

  // Elevator Pitch — formatted text block
  if (sectionKey === 'techstack') {
    const pitch = data.pitch || data.content || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
    return (
      <div>
        {data.title && (
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {data.title}
          </h4>
        )}
        <div style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '16px 20px',
          borderLeft: '3px solid #10b981',
        }}>
          {pitch}
        </div>
        {data.tips && Array.isArray(data.tips) && (
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tips</h5>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {data.tips.map((tip: string, i: number) => (
                <li key={i} style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, marginBottom: '4px' }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Q&A-based sections (HR, Hiring Manager, Behavioral)
  if (['hr', 'hiring-manager', 'behavioral'].includes(sectionKey)) {
    const questions = data.questions || data.items || (Array.isArray(data) ? data : []);
    if (!Array.isArray(questions) || questions.length === 0) {
      return <div style={{ fontSize: '14px', color: '#6b7280' }}>No questions generated.</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {questions.map((q: any, i: number) => (
          <div key={i} style={{ borderBottom: i < questions.length - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: i < questions.length - 1 ? '16px' : '0' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px', display: 'flex', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>Q{i + 1}.</span>
              <span>{q.question || q.q || (typeof q === 'string' ? q : '')}</span>
            </div>
            {(q.answer || q.a || q.suggested_answer || q.sampleAnswer) && (
              <div style={{
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: 1.7,
                marginLeft: '32px',
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '12px 16px',
                whiteSpace: 'pre-wrap',
              }}>
                {q.answer || q.a || q.suggested_answer || q.sampleAnswer}
              </div>
            )}
            {sectionKey === 'behavioral' && (q.situation || q.task || q.action || q.result) && (
              <div style={{ marginLeft: '32px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {q.situation && (
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>S</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>ituation: </span>
                    {q.situation}
                  </div>
                )}
                {q.task && (
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>T</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>ask: </span>
                    {q.task}
                  </div>
                )}
                {q.action && (
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>A</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>ction: </span>
                    {q.action}
                  </div>
                )}
                {q.result && (
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>R</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>esult: </span>
                    {q.result}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Coding Questions — list of problems with hints
  if (sectionKey === 'coding') {
    const problems = data.problems || data.questions || data.items || (Array.isArray(data) ? data : []);
    if (!Array.isArray(problems) || problems.length === 0) {
      return <div style={{ fontSize: '14px', color: '#6b7280' }}>No coding questions generated.</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {problems.map((p: any, i: number) => (
          <div key={i} style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #f3f4f6',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: (p.difficulty || '').toLowerCase() === 'hard' ? '#dc2626' : (p.difficulty || '').toLowerCase() === 'medium' ? '#d97706' : '#059669',
                background: (p.difficulty || '').toLowerCase() === 'hard' ? '#fef2f2' : (p.difficulty || '').toLowerCase() === 'medium' ? '#fffbeb' : '#ecfdf5',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {p.difficulty || 'Medium'}
              </span>
              <span>{p.title || p.name || p.question || `Problem ${i + 1}`}</span>
            </div>
            {(p.description || p.problem) && (
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.7, marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                {p.description || p.problem}
              </div>
            )}
            {(p.hint || p.hints) && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                <span style={{ fontWeight: 600, color: '#9ca3af' }}>Hint: </span>
                {typeof p.hints === 'string' ? p.hints : Array.isArray(p.hints) ? p.hints.join(' | ') : p.hint}
              </div>
            )}
            {p.topics && Array.isArray(p.topics) && (
              <div className="flex flex-wrap gap-1" style={{ marginTop: '8px' }}>
                {p.topics.map((t: string, ti: number) => (
                  <span key={ti} style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#1d4ed8',
                    background: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // System Design Questions — list of design scenarios
  if (sectionKey === 'system-design') {
    const scenarios = data.scenarios || data.questions || data.items || (Array.isArray(data) ? data : []);
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return <div style={{ fontSize: '14px', color: '#6b7280' }}>No system design questions generated.</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {scenarios.map((s: any, i: number) => (
          <div key={i} style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #f3f4f6',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              {s.title || s.name || s.question || `Scenario ${i + 1}`}
            </div>
            {(s.description || s.prompt || s.scenario) && (
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.7, marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                {s.description || s.prompt || s.scenario}
              </div>
            )}
            {(s.requirements || s.considerations) && (
              <div style={{ marginTop: '8px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Considerations
                </h5>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {(s.requirements || s.considerations || []).map((r: string, ri: number) => (
                    <li key={ri} style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6, marginBottom: '4px' }}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {s.approach && (
              <div style={{
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: 1.7,
                marginTop: '10px',
                background: '#ffffff',
                borderRadius: '6px',
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                whiteSpace: 'pre-wrap',
              }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Approach: </span>
                {s.approach}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Fallback — render as formatted JSON or text
  if (typeof data === 'object') {
    return (
      <pre style={{
        fontSize: '13px',
        color: '#374151',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: '#f9fafb',
        borderRadius: '8px',
        padding: '16px',
        margin: 0,
        overflow: 'auto',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
      {String(data)}
    </div>
  );
}
