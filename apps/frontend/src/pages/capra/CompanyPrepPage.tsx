import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '../../components/shared/Icons.jsx';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';

/* ──────────────────────────────── Types ──────────────────────────────── */

interface Question {
  q: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

interface Section {
  title: string;
  icon: 'code' | 'architecture' | 'behavioral';
  questions: Question[];
}

interface CompanyData {
  name: string;
  logo: string;
  color: string;
  description: string;
  stats: {
    avgSalary: string;
    rounds: string;
    difficulty: string;
    duration: string;
  };
  sections: Section[];
}

/* ──────────────────────────────── Data ──────────────────────────────── */

const COMPANIES: Record<string, CompanyData> = {
  google: {
    name: 'Google',
    logo: 'G',
    color: '#4285F4',
    description:
      'Google interviews focus on algorithmic problem-solving, system design at scale, and behavioral leadership principles (Googleyness).',
    stats: { avgSalary: '$189K - $350K', rounds: '5-7', difficulty: 'Hard', duration: '6-8 weeks' },
    sections: [
      {
        title: 'Coding Interview Questions',
        icon: 'code',
        questions: [
          { q: 'Design an algorithm to find the shortest path in a weighted graph', difficulty: 'Hard', topic: 'Graphs' },
          { q: 'Implement an LRU Cache with O(1) operations', difficulty: 'Medium', topic: 'Data Structures' },
          { q: 'Find the median of two sorted arrays', difficulty: 'Hard', topic: 'Binary Search' },
          { q: 'Design a function to serialize and deserialize a binary tree', difficulty: 'Hard', topic: 'Trees' },
          { q: 'Implement a rate limiter using sliding window', difficulty: 'Medium', topic: 'Design' },
        ],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture',
        questions: [
          { q: 'Design Google Search', difficulty: 'Hard', topic: 'Search' },
          { q: 'Design YouTube', difficulty: 'Hard', topic: 'Video Streaming' },
          { q: 'Design Google Maps', difficulty: 'Hard', topic: 'Geospatial' },
          { q: 'Design Gmail', difficulty: 'Medium', topic: 'Email' },
          { q: 'Design Google Drive', difficulty: 'Hard', topic: 'Storage' },
        ],
      },
      {
        title: 'Behavioral Questions (Googleyness)',
        icon: 'behavioral',
        questions: [
          { q: 'Tell me about a time you had to work with ambiguity', difficulty: 'Medium', topic: 'Leadership' },
          { q: 'Describe a situation where you had to push back on a decision', difficulty: 'Medium', topic: 'Communication' },
          { q: 'How do you handle disagreements with team members?', difficulty: 'Easy', topic: 'Teamwork' },
          { q: 'Tell me about a project that failed and what you learned', difficulty: 'Medium', topic: 'Growth' },
        ],
      },
    ],
  },
  amazon: {
    name: 'Amazon',
    logo: 'A',
    color: '#FF9900',
    description:
      'Amazon interviews are structured around 16 Leadership Principles. Every answer should reference a specific LP. System design focuses on AWS services.',
    stats: { avgSalary: '$165K - $320K', rounds: '4-6', difficulty: 'Hard', duration: '4-6 weeks' },
    sections: [
      {
        title: 'Coding Questions',
        icon: 'code',
        questions: [
          { q: 'Design an algorithm for optimal delivery routing', difficulty: 'Hard', topic: 'Graphs' },
          { q: 'Implement a priority queue for order processing', difficulty: 'Medium', topic: 'Heap' },
          { q: 'Find the most frequently purchased items together', difficulty: 'Medium', topic: 'Hash Map' },
          { q: 'Design a system to detect duplicate product listings', difficulty: 'Hard', topic: 'String Matching' },
        ],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture',
        questions: [
          { q: 'Design Amazon Product Search', difficulty: 'Hard', topic: 'Search' },
          { q: 'Design the Amazon Recommendation Engine', difficulty: 'Hard', topic: 'ML System' },
          { q: 'Design AWS S3', difficulty: 'Hard', topic: 'Storage' },
          { q: 'Design the Amazon Order Processing Pipeline', difficulty: 'Hard', topic: 'Queue' },
        ],
      },
      {
        title: 'Leadership Principles Questions',
        icon: 'behavioral',
        questions: [
          { q: 'Customer Obsession: Tell me about a time you went above and beyond for a customer', difficulty: 'Medium', topic: 'LP' },
          { q: 'Ownership: Describe a time you took on something outside your area of responsibility', difficulty: 'Medium', topic: 'LP' },
          { q: 'Dive Deep: Tell me about a time you had to get to the root cause of a problem', difficulty: 'Medium', topic: 'LP' },
          { q: 'Bias for Action: Describe a situation where you had to make a decision without complete data', difficulty: 'Medium', topic: 'LP' },
        ],
      },
    ],
  },
  meta: {
    name: 'Meta',
    logo: 'M',
    color: '#0668E1',
    description:
      'Meta interviews emphasize coding speed, system design for billion-user scale, and behavioral questions about impact and collaboration.',
    stats: { avgSalary: '$185K - $380K', rounds: '4-5', difficulty: 'Hard', duration: '4-6 weeks' },
    sections: [
      {
        title: 'Coding Questions',
        icon: 'code',
        questions: [
          { q: 'Implement a News Feed ranking algorithm', difficulty: 'Hard', topic: 'Sorting' },
          { q: 'Design a data structure for autocomplete search', difficulty: 'Medium', topic: 'Trie' },
          { q: 'Find all valid combinations of parentheses', difficulty: 'Medium', topic: 'Backtracking' },
          { q: 'Implement a thread-safe bounded queue', difficulty: 'Hard', topic: 'Concurrency' },
        ],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture',
        questions: [
          { q: 'Design Facebook News Feed', difficulty: 'Hard', topic: 'Feed' },
          { q: 'Design Instagram Stories', difficulty: 'Hard', topic: 'Media' },
          { q: 'Design Facebook Messenger', difficulty: 'Hard', topic: 'Chat' },
          { q: 'Design the Facebook Live Video System', difficulty: 'Hard', topic: 'Streaming' },
        ],
      },
      {
        title: 'Behavioral Questions',
        icon: 'behavioral',
        questions: [
          { q: 'Tell me about a time you had the biggest impact', difficulty: 'Medium', topic: 'Impact' },
          { q: 'Describe how you handle working on a fast-moving team', difficulty: 'Easy', topic: 'Pace' },
          { q: 'How do you prioritize competing projects?', difficulty: 'Medium', topic: 'Prioritization' },
        ],
      },
    ],
  },
  apple: {
    name: 'Apple',
    logo: 'A',
    color: '#555555',
    description:
      'Apple interviews focus on deep technical knowledge, attention to detail, and passion for the product. Questions often involve real-world Apple product scenarios.',
    stats: { avgSalary: '$175K - $340K', rounds: '4-6', difficulty: 'Hard', duration: '4-8 weeks' },
    sections: [
      {
        title: 'Coding Questions',
        icon: 'code',
        questions: [
          { q: 'Implement a memory-efficient image cache', difficulty: 'Hard', topic: 'Cache' },
          { q: 'Design an algorithm for gesture recognition', difficulty: 'Hard', topic: 'ML' },
          { q: 'Optimize battery usage for background processes', difficulty: 'Hard', topic: 'System' },
        ],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture',
        questions: [
          { q: 'Design iCloud Sync', difficulty: 'Hard', topic: 'Sync' },
          { q: 'Design the App Store Review System', difficulty: 'Medium', topic: 'Pipeline' },
          { q: 'Design Apple Pay', difficulty: 'Hard', topic: 'Payments' },
        ],
      },
      {
        title: 'Behavioral Questions',
        icon: 'behavioral',
        questions: [
          { q: 'Why Apple? What Apple product do you admire most and why?', difficulty: 'Easy', topic: 'Passion' },
          { q: 'Tell me about a time you sweated the details', difficulty: 'Medium', topic: 'Quality' },
          { q: 'How do you balance perfection with shipping on time?', difficulty: 'Medium', topic: 'Tradeoffs' },
        ],
      },
    ],
  },
  microsoft: {
    name: 'Microsoft',
    logo: 'M',
    color: '#00A4EF',
    description:
      'Microsoft interviews assess problem-solving, system design with Azure services, and growth mindset culture fit.',
    stats: { avgSalary: '$160K - $310K', rounds: '4-5', difficulty: 'Medium-Hard', duration: '3-5 weeks' },
    sections: [
      {
        title: 'Coding Questions',
        icon: 'code',
        questions: [
          { q: 'Design a thread-safe singleton pattern', difficulty: 'Medium', topic: 'OOP' },
          { q: 'Implement a distributed lock mechanism', difficulty: 'Hard', topic: 'Distributed' },
          { q: 'Find the longest increasing subsequence', difficulty: 'Medium', topic: 'DP' },
        ],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture',
        questions: [
          { q: 'Design Microsoft Teams', difficulty: 'Hard', topic: 'Real-time' },
          { q: 'Design Azure Blob Storage', difficulty: 'Hard', topic: 'Storage' },
          { q: 'Design the Windows Update System', difficulty: 'Hard', topic: 'Distribution' },
        ],
      },
      {
        title: 'Behavioral Questions',
        icon: 'behavioral',
        questions: [
          { q: 'Tell me about a time you demonstrated a growth mindset', difficulty: 'Easy', topic: 'Growth' },
          { q: 'How do you learn from failure?', difficulty: 'Medium', topic: 'Resilience' },
          { q: 'Describe a time you helped a teammate grow', difficulty: 'Medium', topic: 'Mentoring' },
        ],
      },
    ],
  },
  netflix: {
    name: 'Netflix',
    logo: 'N',
    color: '#E50914',
    description:
      'Netflix values freedom and responsibility. Interviews focus on senior-level system design, cultural fit, and independent decision-making.',
    stats: { avgSalary: '$200K - $450K', rounds: '4-6', difficulty: 'Hard', duration: '4-6 weeks' },
    sections: [
      {
        title: 'Coding Questions',
        icon: 'code',
        questions: [
          { q: 'Design a video recommendation algorithm', difficulty: 'Hard', topic: 'ML' },
          { q: 'Implement adaptive bitrate streaming logic', difficulty: 'Hard', topic: 'Streaming' },
          { q: 'Build a content delivery optimization system', difficulty: 'Hard', topic: 'CDN' },
        ],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture',
        questions: [
          { q: 'Design Netflix Video Streaming', difficulty: 'Hard', topic: 'Streaming' },
          { q: 'Design the Netflix Recommendation Engine', difficulty: 'Hard', topic: 'ML System' },
          { q: 'Design Netflix Content Delivery Network', difficulty: 'Hard', topic: 'CDN' },
        ],
      },
      {
        title: 'Culture Fit Questions',
        icon: 'behavioral',
        questions: [
          { q: 'How do you make decisions without consensus?', difficulty: 'Medium', topic: 'Independence' },
          { q: 'Tell me about a time you challenged the status quo', difficulty: 'Medium', topic: 'Innovation' },
          { q: 'How do you handle radical candor/feedback?', difficulty: 'Medium', topic: 'Communication' },
        ],
      },
    ],
  },
};


/* ──────────────────────────────── Helpers ────────────────────────────── */

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: '#F8FAFC', text: 'var(--accent)', border: '#95B0CD' },
  Medium: { bg: '#fffbeb', text: '#D9B543', border: '#F8FAFC' },
  Hard: { bg: '#fef2f2', text: '#0B5CFF', border: '#fecaca' },
  'Medium-Hard': { bg: '#fff7ed', text: 'var(--text-muted)', border: '#BFDBFE' },
};

function getDifficultyStyle(difficulty: string) {
  return DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS['Medium'];
}

function getSectionIcon(icon: string) {
  switch (icon) {
    case 'code':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'architecture':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="6" height="6" rx="1" />
          <rect x="16" y="2" width="6" height="6" rx="1" />
          <rect x="9" y="16" width="6" height="6" rx="1" />
          <path d="M5 8v3a1 1 0 001 1h12a1 1 0 001-1V8" />
          <path d="M12 12v4" />
        </svg>
      );
    case 'behavioral':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

/* ──────────────────────────────── Stat icons ─────────────────────────── */

function StatIcon({ type }: { type: string }) {
  const style = { width: 20, height: 20, strokeWidth: 1.5, fill: 'none', stroke: 'currentColor' };
  switch (type) {
    case 'salary':
      return (
        <svg {...style} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case 'rounds':
      return (
        <svg {...style} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'difficulty':
      return (
        <svg {...style} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'duration':
      return (
        <svg {...style} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return null;
  }
}

/* ──────────────────────────────── Component ──────────────────────────── */

export default function CompanyPrepPage() {
  const { company } = useParams<{ company: string }>();

  useEffect(() => {
    document.title = 'Company Prep | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const companyData = company ? COMPANIES[company.toLowerCase()] : undefined;

  /* ── Unknown company: show generic interview prep with useful links ── */
  if (!companyData) {
    const displayName = company
      ? company.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'this company';

    const genericSections = [
      {
        title: 'Coding Interview Questions',
        icon: 'code' as const,
        color: 'var(--success)',
        description: 'Practice data structures, algorithms, and problem-solving patterns commonly asked in technical interviews.',
        link: '/capra/prepare?page=coding',
        linkLabel: 'Study DSA Topics',
        practiceLink: '/capra/practice',
        practiceLabel: 'Practice Coding',
        topics: ['Arrays & Hashing', 'Trees & Graphs', 'Dynamic Programming', 'Binary Search', 'Sliding Window'],
      },
      {
        title: 'System Design Questions',
        icon: 'architecture' as const,
        color: 'var(--accent)',
        description: 'Learn to design scalable distributed systems, from fundamentals to real-world architectures.',
        link: '/capra/prepare?page=system-design',
        linkLabel: 'Study System Design',
        practiceLink: '/capra/practice',
        practiceLabel: 'Practice Design',
        topics: ['Scalability Fundamentals', 'Database Design', 'Caching Strategies', 'API Design', 'Load Balancing'],
      },
      {
        title: 'Behavioral Interview Questions',
        icon: 'behavioral' as const,
        color: 'var(--warning)',
        description: 'Prepare compelling STAR-format stories for leadership, teamwork, and problem-solving questions.',
        link: '/capra/prepare?page=behavioral',
        linkLabel: 'Study Behavioral',
        practiceLink: '/capra/practice',
        practiceLabel: 'Practice Stories',
        topics: ['STAR Method', 'Leadership Stories', 'Conflict Resolution', 'Problem Solving', 'Cross-Team Collaboration'],
      },
    ];

    return (
      <div style={{ background: 'var(--bg-surface)', minHeight: '100vh' }}>
        <SiteNav variant="light" />

        <div>
          {/* Header */}
          <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex items-center gap-2 mb-4" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
                <span>/</span>
                <Link to="/jobs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Jobs</Link>
                <span>/</span>
                <span style={{ color: 'var(--text-secondary)' }}>{displayName}</span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-muted)' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="practice-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    {displayName} Interview Prep
                  </h1>
                  <p className="practice-body" style={{ fontSize: 15, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Prepare for your interview with curated coding, system design, and behavioral topics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {genericSections.map((section) => (
                <div key={section.title} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${section.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getSectionIcon(section.icon)}
                      </div>
                      <h2 className="practice-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {section.title}
                      </h2>
                    </div>
                    <p className="practice-body" style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                      {section.description}
                    </p>
                  </div>
                  <div style={{ padding: '16px 24px' }}>
                    <p className="practice-body" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                      Key Topics to Focus On
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {section.topics.map((topic) => (
                        <span key={topic} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px' }}>
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={section.link}
                        className="practice-body"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: section.color, color: '#fff', fontSize: 13, fontWeight: 600, borderRadius: 8, textDecoration: 'none' }}
                      >
                        {section.linkLabel}
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </Link>
                      <Link
                        to={section.practiceLink}
                        className="practice-body"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', color: 'var(--text-secondary)', background: '#f3f4f6', fontSize: 13, fontWeight: 600, borderRadius: 8, textDecoration: 'none', border: '1px solid #e5e7eb' }}
                      >
                        {section.practiceLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Jobs CTA */}
            <div style={{ marginTop: 24, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <h3 className="practice-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Looking for {displayName} jobs?
              </h3>
              <p className="practice-body" style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                Browse open positions and prepare with tailored study plans.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/jobs"
                  className="practice-body"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 8, textDecoration: 'none' }}
                >
                  Browse Jobs
                </Link>
                <Link
                  to="/capra/prepare"
                  className="practice-body"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', color: 'var(--text-secondary)', background: '#f3f4f6', fontSize: 14, fontWeight: 600, borderRadius: 8, textDecoration: 'none', border: '1px solid #e5e7eb' }}
                >
                  All Prep Topics
                </Link>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          body { margin: 0; }
          .practice-display { font-family: 'Inter', system-ui, sans-serif; }
          .practice-body { font-family: 'Inter', system-ui, sans-serif; }
        `}</style>
      </div>
    );
  }

  const totalQuestions = companyData.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const diffStyle = getDifficultyStyle(companyData.stats.difficulty);

  return (
    <div className="company-prep-root" style={{ background: 'var(--bg-surface)', minHeight: '100vh' }}>

      <SiteNav variant="light" />

      {/* ═══════════════════════ Main Content ═══════════════════════ */}
      <main>
        <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Breadcrumb ── */}
          <div style={{ padding: '16px 0 0' }}>
            <nav className="practice-body" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Link to="/" className="breadcrumb-link" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}>Home</Link>
              <span style={{ color: '#d1d5db' }}>/</span>
              <Link to="/capra/practice" className="breadcrumb-link" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}>Interview Questions</Link>
              <span style={{ color: '#d1d5db' }}>/</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{companyData.name}</span>
            </nav>
          </div>

          {/* ── Company Header ── */}
          <div style={{ padding: '32px 0 24px' }}>
            {/* Accent bar */}
            <div style={{ width: 48, height: 4, borderRadius: 2, background: companyData.color, marginBottom: 20 }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              {/* Logo circle */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: companyData.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {companyData.logo}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  className="practice-display"
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {companyData.name} Interview Questions
                </h1>
                <p className="practice-body" style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
                  {companyData.description}
                </p>
                <p className="practice-body" style={{ fontSize: 13, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                  {totalQuestions} curated questions across {companyData.sections.length} categories
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 32,
            }}
          >
            {[
              { label: 'Avg. Salary', value: companyData.stats.avgSalary, icon: 'salary' },
              { label: 'Interview Rounds', value: companyData.stats.rounds, icon: 'rounds' },
              { label: 'Difficulty', value: companyData.stats.difficulty, icon: 'difficulty' },
              { label: 'Timeline', value: companyData.stats.duration, icon: 'duration' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <StatIcon type={stat.icon} />
                  <span className="practice-body" style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    {stat.label}
                  </span>
                </div>
                <span
                  className="practice-display"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Question Sections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>
            {companyData.sections.map((section, sIdx) => (
              <div
                key={sIdx}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Section header */}
                <div
                  style={{
                    padding: '18px 22px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ color: companyData.color, display: 'flex', alignItems: 'center' }}>
                    {getSectionIcon(section.icon)}
                  </div>
                  <h2 className="practice-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {section.title}
                  </h2>
                  <span className="practice-body" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 'auto' }}>
                    {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Questions list */}
                <div>
                  {section.questions.map((question, qIdx) => {
                    const dStyle = getDifficultyStyle(question.difficulty);
                    return (
                      <div
                        key={qIdx}
                        className="question-row"
                        style={{
                          padding: '14px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          borderBottom: qIdx < section.questions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Question number */}
                        <span
                          className="practice-mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#d1d5db',
                            minWidth: 24,
                            textAlign: 'right',
                            flexShrink: 0,
                          }}
                        >
                          {String(qIdx + 1).padStart(2, '0')}
                        </span>

                        {/* Question text */}
                        <span className="practice-body" style={{ fontSize: 14, color: 'var(--text-secondary)', flex: 1, lineHeight: 1.5 }}>
                          {question.q}
                        </span>

                        {/* Topic tag */}
                        <span
                          className="practice-body hidden sm:inline-block"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'var(--text-muted)',
                            background: '#f3f4f6',
                            padding: '3px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {question.topic}
                        </span>

                        {/* Difficulty badge */}
                        <span
                          className="practice-body"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: dStyle.text,
                            background: dStyle.bg,
                            border: `1px solid ${dStyle.border}`,
                            padding: '2px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {question.difficulty}
                        </span>

                        {/* Practice link */}
                        <Link
                          to="/lumora"
                          className="practice-link practice-body"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          Practice
                          <span style={{ marginLeft: 4, fontSize: 10 }}>&rarr;</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── Bottom CTA ── */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '40px 32px',
              textAlign: 'center',
              marginBottom: 48,
            }}
          >
            <h2 className="practice-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Start preparing for {companyData.name} interviews
            </h2>
            <p className="practice-body" style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Practice with AI-powered mock interviews, get real-time feedback, and track your progress.
            </p>
            <Link
              to="/lumora"
              className="cta-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                background: 'var(--accent)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'filter 0.15s, transform 0.15s',
                boxShadow: '0 4px 14px rgba(45,140,255,0.25)',
              }}
            >
              Start Practicing
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter variant="light" />

      {/* ═══════════════════════ Scoped Styles ═══════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');

        body {
          margin: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .practice-display {
          font-family: 'Inter', system-ui, sans-serif;
        }

        .practice-body {
          font-family: 'Inter', system-ui, sans-serif;
        }

        .practice-mono {
          font-family: 'Source Code Pro', monospace;
        }

        html { scroll-behavior: smooth; }

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
          color: var(--accent) !important;
        }

        /* Question row hover */
        .question-row:hover {
          background: #fafbfc;
        }

        /* Practice link hover */
        .practice-link:hover {
          opacity: 0.8;
        }

        /* CTA button hover */
        .cta-button:hover {
          filter: brightness(0.93);
          transform: translateY(-1px);
        }

        /* Remove button outlines on click */
        button:focus {
          outline: none;
        }
        button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .question-row {
            flex-wrap: wrap;
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
