import { useSearchParams } from 'react-router-dom';
import ResumeOptimizer from '../../components/capra/features/ResumeOptimizer';

export default function ResumePage() {
  const [params] = useSearchParams();
  const company = params.get('company') || undefined;
  const role = params.get('role') || undefined;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero header */}
      <div style={{ textAlign: 'center', padding: '32px 16px 24px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: 'var(--accent)',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            marginBottom: '16px',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          AI-Powered
        </div>
        <h1
          className="heading-1"
          style={{
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Resume Optimizer
          {company && (
            <span style={{ color: 'var(--accent)' }}> for {company}</span>
          )}
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
          {role
            ? `Tailor your resume for the ${role} position. AI-optimized for ATS systems and hiring managers.`
            : 'Optimize your resume, generate cover letters, and score ATS compatibility — all powered by AI.'}
        </p>

        {/* Quick stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '20px' }}>
          {[
            { label: 'ATS Pass Rate', value: '94%', icon: '🎯' },
            { label: 'Time Saved', value: '2hrs', icon: '⚡' },
            { label: 'Interview Rate', value: '+3x', icon: '📈' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.icon} {stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimizer component */}
      <div className="w-full lg:max-w-[75%] mx-auto px-4 pb-16">
        <ResumeOptimizer
          initialCompany={company}
          initialRole={role}
          initialJobDescription={params.get('jd') || undefined}
          initialJobUrl={params.get('url') || undefined}
        />
      </div>
    </div>
  );
}
