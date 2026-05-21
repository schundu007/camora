import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const DIFFICULTY_STYLES = {
  Easy:         { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  Medium:       { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  Hard:         { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
};

const SKILL_COLORS = {
  Docker:              '#2496ED',
  AWS:                 '#FF9900',
  Kubernetes:          '#326CE5',
  Git:                 '#F05032',
  Ansible:             '#EE0000',
  Linux:               '#FCC624',
  Terraform:           '#7B42BC',
  Puppet:              '#FFAE1A',
  Chef:                '#F09820',
  StatefulSet:         '#326CE5',
  RBAC:                '#326CE5',
  Ingress:             '#326CE5',
  HPA:                 '#326CE5',
  ConfigMap:           '#326CE5',
  Secret:              '#326CE5',
  Kubeconfig:          '#326CE5',
  'Resource Management': '#326CE5',
};

function DifficultyPill({ difficulty }) {
  const s = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.Easy;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: 12,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        letterSpacing: '0.01em',
      }}
    >
      {difficulty}
    </span>
  );
}

function SkillBadge({ skill }) {
  const color = SKILL_COLORS[skill] || '#6b7280';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `${color}1A`,
        border: `1px solid ${color}40`,
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {skill}
    </span>
  );
}

function SectionDivider() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--border)',
        margin: '28px 0',
      }}
    />
  );
}

function SectionHeading({ children }) {
  return (
    <h2
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.005em',
        marginBottom: 12,
        marginTop: 0,
      }}
    >
      {children}
    </h2>
  );
}

export default function DevopsChallengeDetail({ challenge, onBack }) {
  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: '0 0 64px',
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: '12px 0',
          marginBottom: 16,
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 14,
          fontWeight: 500,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Challenges
      </button>

      {/* Title */}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.018em',
          lineHeight: 1.25,
          marginBottom: 16,
          marginTop: 0,
        }}
      >
        {challenge.title}
      </h1>

      {/* Meta row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginBottom: 32,
        }}
      >
        <DifficultyPill difficulty={challenge.difficulty} />
        <SkillBadge skill={challenge.skill} />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {challenge.timeMinutes} mins
        </span>
        <span style={{ color: 'var(--border)', fontSize: 13 }}>·</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {challenge.score} pts
        </span>
        {challenge.hackerrankUrl && (
          <a
            href={challenge.hackerrankUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginLeft: 4,
              padding: '5px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#00EA64',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Practice on HackerRank
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 10.5L10.5 2.5M10.5 2.5H5M10.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>

      <SectionDivider />

      {/* Problem description */}
      <section>
        <SectionHeading>Problem</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(challenge.description || '').split('\n\n').map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: 15,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Key Concepts */}
      {challenge.keyConcepts && challenge.keyConcepts.length > 0 && (
        <>
          <section>
            <SectionHeading>Key Concepts</SectionHeading>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {challenge.keyConcepts.map((concept, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      marginTop: 3,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  />
                  {concept}
                </li>
              ))}
            </ul>
          </section>
          <SectionDivider />
        </>
      )}

      {/* Solution */}
      {challenge.solution && (
        <>
          <section>
            <SectionHeading>Solution</SectionHeading>
            <div
              style={{
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <SyntaxHighlighter
                language={challenge.solutionLang || 'bash'}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.65,
                  padding: '18px 20px',
                }}
                showLineNumbers={false}
              >
                {challenge.solution}
              </SyntaxHighlighter>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* Approach */}
      {challenge.approach && challenge.approach.length > 0 && (
        <section>
          <SectionHeading>Approach</SectionHeading>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {challenge.approach.map((step, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 24,
                    height: 24,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono, monospace)',
                    flexShrink: 0,
                    marginTop: 1,
                    background: 'var(--cam-gold-leaf-50)',
                    color: 'var(--cam-gold-leaf-text)',
                    border: '1px solid var(--cam-gold-leaf)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
