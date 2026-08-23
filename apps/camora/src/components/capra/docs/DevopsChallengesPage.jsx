import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DevopsChallengeDetail from './DevopsChallengeDetail.jsx';
import Chip from '@/components/shared/ui/Chip';

// ─── Constants ──────────────────────────────────────────────────────────────

const SKILL_COLORS = {
  Docker:                '#2496ED',
  AWS:                   '#FF9900',
  Kubernetes:            '#326CE5',
  Git:                   '#F05032',
  Ansible:               '#EE0000',
  Linux:                 '#FCC624',
  Terraform:             '#7B42BC',
  Puppet:                '#FFAE1A',
  Chef:                  '#F09820',
  StatefulSet:           '#326CE5',
  RBAC:                  '#326CE5',
  Ingress:               '#326CE5',
  HPA:                   '#326CE5',
  ConfigMap:             '#326CE5',
  Secret:                '#326CE5',
  Kubeconfig:            '#326CE5',
  'Resource Management': '#326CE5',
};

const DIFFICULTY_STYLES = {
  Easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  Hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const LEVELS       = ['Basic', 'Intermediate', 'Advanced'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useOutsideClick(ref, handler) {
  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        handler();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [ref, handler]);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DifficultyPill({ difficulty }) {
  return <Chip variant={difficulty.toLowerCase()}>{difficulty}</Chip>;
}

function SkillBadge({ skill }) {
  const color = SKILL_COLORS[skill] || '#6b7280';
  return (
    <Chip variant="default">
      <span className="inline-block w-[6px] h-[6px] rounded-full shrink-0 mr-1" style={{ background: color }} />
      {skill}
    </Chip>
  );
}

// ─── Filter Dropdown ─────────────────────────────────────────────────────────

function FilterDropdown({ label, options, activeSet, onToggle, renderOption }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef(null);
  const close                 = useCallback(() => setOpen(false), []);

  useOutsideClick(containerRef, close);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = activeSet.size;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 8,
          border: `1px solid ${open ? 'var(--border-hover)' : 'var(--border)'}`,
          background: activeCount > 0 ? 'var(--cam-gold-leaf-50)' : 'var(--bg-surface)',
          color: activeCount > 0 ? 'var(--cam-gold-leaf-text)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (activeCount === 0) e.currentTarget.style.borderColor = 'var(--border-hover)';
        }}
        onMouseLeave={e => {
          if (activeCount === 0) e.currentTarget.style.borderColor = open ? 'var(--border-hover)' : 'var(--border)';
        }}
      >
        {label}
        {activeCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--cam-gold-leaf)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {activeCount}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            opacity: 0.6,
          }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            minWidth: 220,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                No results
              </div>
            ) : (
              filtered.map(opt => {
                const checked = activeSet.has(opt);
                return (
                  <label
                    key={opt}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      transition: 'background 0.1s',
                      background: checked ? 'rgba(0,0,0,0.04)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = checked ? 'rgba(0,0,0,0.04)' : 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(opt)}
                      style={{ accentColor: 'var(--cam-gold-leaf)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    {renderOption ? renderOption(opt) : opt}
                  </label>
                );
              })
            )}
          </div>
          {activeSet.size > 0 && (
            <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { onToggle(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  padding: '2px 4px',
                  borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Problem Card ─────────────────────────────────────────────────────────────

function ChallengeCard({ challenge, onClick }) {
  const [hovered, setHovered] = useState(false);
  const skillColor = SKILL_COLORS[challenge.skill] || '#6b7280';

  return (
    <div
      onClick={() => onClick(challenge)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderLeft: `4px solid ${skillColor}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--card-shadow)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        userSelect: 'none',
        minHeight: 120,
      }}
    >
      {/* Title */}
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          margin: '0 0 10px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {challenge.title}
      </p>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <SkillBadge skill={challenge.skill} />
        <DifficultyPill difficulty={challenge.difficulty} />
      </div>

      {/* Footer row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
          paddingTop: 10,
        }}
      >
        <span>{challenge.timeMinutes} mins</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{challenge.score} pts</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEVOPS_MCQ_DOMAINS = [
  { label: 'Docker',     color: '#2496ED', domain: 'Docker' },
  { label: 'Kubernetes', color: '#326CE5', domain: 'Kubernetes' },
  { label: 'Ansible',    color: '#EE0000', domain: 'Ansible' },
  { label: 'Terraform',  color: '#7B42BC', domain: 'Terraform' },
  { label: 'AWS',        color: '#FF9900', domain: 'AWS' },
  { label: 'Linux',      color: '#FCC624', domain: 'Linux Administration' },
  { label: 'Git',        color: '#F05032', domain: 'Git' },
  { label: 'Jenkins',    color: '#D33833', domain: 'Jenkins / Nexus' },
  { label: 'GCP',        color: '#4285F4', domain: 'GCP' },
  { label: 'Bash',       color: '#4EAA25', domain: 'Bash' },
];

const ALL_DEVOPS_DOMAINS = DEVOPS_MCQ_DOMAINS.map(d => d.domain).join(',');

export default function DevopsChallengesPage({ challenges = [] }) {
  const navigate = useNavigate();
  const [activeSkills,       setActiveSkills]       = useState(new Set());
  const [activeDifficulties, setActiveDifficulties] = useState(new Set());
  const [activeLevels,       setActiveLevels]       = useState(new Set());
  const [selectedChallenge,  setSelectedChallenge]  = useState(null);

  // Derive unique skill options from data
  const skillOptions = [...new Set(challenges.map(c => c.skill))].sort();

  function toggleSet(setter, value) {
    if (value === null) {
      setter(new Set());
      return;
    }
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const filtered = challenges.filter(c => {
    const skillOk  = activeSkills.size === 0       || activeSkills.has(c.skill);
    const diffOk   = activeDifficulties.size === 0 || activeDifficulties.has(c.difficulty);
    const levelOk  = activeLevels.size === 0       || activeLevels.has(c.skillLevel);
    return skillOk && diffOk && levelOk;
  });

  if (selectedChallenge) {
    return (
      <DevopsChallengeDetail
        challenge={selectedChallenge}
        onBack={() => setSelectedChallenge(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── DevOps Q&A Quiz section ─────────────────────────────────────────── */}
      <div style={{
        marginBottom: 24,
        padding: '18px 20px',
        borderRadius: 10,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
              Interview Q&amp;A
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AI-generated MCQ quiz across 10 DevOps domains — test your knowledge
            </div>
          </div>
          <button
            onClick={() => navigate(`/capra/quiz/session?domain=${encodeURIComponent(ALL_DEVOPS_DOMAINS)}&count=10`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: 'var(--cam-gold-leaf, #d4af37)',
              border: 'none', color: '#000',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="8" cy="8" r="6"/><path d="M6 10l2-4 2 4M7 8.5h2"/>
            </svg>
            Start Mixed Quiz
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DEVOPS_MCQ_DOMAINS.map(({ label, color, domain }) => (
            <button
              key={domain}
              onClick={() => navigate(`/capra/quiz/session?domain=${encodeURIComponent(domain)}&count=10`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                background: `${color}18`,
                border: `1px solid ${color}40`,
                color,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <FilterDropdown
          label="Skills"
          options={skillOptions}
          activeSet={activeSkills}
          onToggle={v => toggleSet(setActiveSkills, v)}
          renderOption={skill => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: SKILL_COLORS[skill] || '#6b7280',
                  flexShrink: 0,
                }}
              />
              <span>{skill}</span>
            </span>
          )}
        />
        <FilterDropdown
          label="Difficulty"
          options={DIFFICULTIES}
          activeSet={activeDifficulties}
          onToggle={v => toggleSet(setActiveDifficulties, v)}
          renderOption={diff => {
            const s = DIFFICULTY_STYLES[diff] || DIFFICULTY_STYLES.Easy;
            return (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: s.color, fontWeight: 600 }}>{diff}</span>
              </span>
            );
          }}
        />
        <FilterDropdown
          label="Level"
          options={LEVELS}
          activeSet={activeLevels}
          onToggle={v => toggleSet(setActiveLevels, v)}
        />

        {/* Result count */}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {filtered.length} of {challenges.length} question{challenges.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '48px 0',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          No challenges match the selected filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
          className="devops-challenges-grid"
        >
          {filtered.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClick={setSelectedChallenge}
            />
          ))}
        </div>
      )}

      {/* Responsive grid overrides via injected style tag */}
      <style>{`
        @media (max-width: 1024px) {
          .devops-challenges-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .devops-challenges-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
