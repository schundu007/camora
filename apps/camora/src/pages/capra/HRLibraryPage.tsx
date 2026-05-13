import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: number;
  name: string;
  summary: string;
  type: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | null;
  skills: string[];
  tags: string[];
  points: number;
  duration_min: number;
}

interface LibraryResponse {
  problems: Problem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface MetaResponse {
  types: string[];
  skills: string[];
  difficulties: string[];
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice',
  multiple_mcq: 'Multi-Select',
  code: 'Coding',
  database: 'Database',
  fullstack: 'Full Stack',
  coderepo_task: 'Code Repo',
  sudorank: 'SudoRank',
  whiteboard: 'Whiteboard',
  code_review: 'Code Review',
  prompt_engineering: 'Prompt Eng.',
  approx: 'Approximation',
  complete: 'Completion',
  design: 'Design',
  textAns: 'Written Answer',
  diagram: 'Diagram',
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  code:              { bg: 'rgba(0,71,171,0.15)',   text: '#4d8ce8',  border: 'rgba(0,71,171,0.35)' },
  database:          { bg: 'rgba(16,185,129,0.13)', text: '#10b981',  border: 'rgba(16,185,129,0.3)' },
  fullstack:         { bg: 'rgba(139,92,246,0.13)', text: '#a78bfa',  border: 'rgba(139,92,246,0.3)' },
  coderepo_task:     { bg: 'rgba(0,71,171,0.12)',   text: '#60a5fa',  border: 'rgba(0,71,171,0.28)' },
  mcq:               { bg: 'rgba(201,162,39,0.13)', text: '#c9a227',  border: 'rgba(201,162,39,0.3)' },
  multiple_mcq:      { bg: 'rgba(201,162,39,0.13)', text: '#c9a227',  border: 'rgba(201,162,39,0.3)' },
  sudorank:          { bg: 'rgba(239,68,68,0.12)',  text: '#f87171',  border: 'rgba(239,68,68,0.28)' },
  whiteboard:        { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24',  border: 'rgba(245,158,11,0.28)' },
  code_review:       { bg: 'rgba(0,71,171,0.10)',   text: '#93c5fd',  border: 'rgba(0,71,171,0.22)' },
  prompt_engineering:{ bg: 'rgba(168,85,247,0.12)', text: '#c084fc',  border: 'rgba(168,85,247,0.28)' },
};

const DIFF_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  Easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  Hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
};

const PAGE_LIMIT = 24;

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || { bg: 'rgba(255,255,255,0.08)', text: 'var(--text-secondary)', border: 'rgba(255,255,255,0.12)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.02em',
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function DiffBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  const s = DIFF_STYLES[difficulty] || DIFF_STYLES.Easy;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {difficulty}
    </span>
  );
}

function ProblemCard({ problem, onClick }: { problem: Problem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '16px 18px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        width: '100%',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,71,171,0.45)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-1)';
      }}
    >
      {/* badges row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <TypeBadge type={problem.type} />
        <DiffBadge difficulty={problem.difficulty} />
        {problem.duration_min && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', alignSelf: 'center', marginLeft: 'auto' }}>
            {problem.duration_min} min
          </span>
        )}
      </div>

      {/* name */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
        {problem.name}
      </div>

      {/* summary */}
      {problem.summary && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {problem.summary}
        </div>
      )}

      {/* skills */}
      {problem.skills.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
          {problem.skills.slice(0, 3).map(s => (
            <span key={s} style={{
              fontSize: 11,
              padding: '1px 7px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-tertiary)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}>
              {s}
            </span>
          ))}
          {problem.skills.length > 3 && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>+{problem.skills.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  // Filters from URL
  const q = searchParams.get('q') || '';
  const selectedTypes = searchParams.get('type') ? searchParams.get('type')!.split(',') : [];
  const selectedDiffs = searchParams.get('difficulty') ? searchParams.get('difficulty')!.split(',') : [];
  const page = parseInt(searchParams.get('page') || '1');

  // Search input state (local, debounced to URL)
  const [searchInput, setSearchInput] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load meta once
  useEffect(() => {
    fetch(`${API}/api/library/meta`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setMeta)
      .catch(console.error);
  }, []);

  // Fetch problems when filters/page change
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedTypes.length) params.set('type', selectedTypes.join(','));
    if (selectedDiffs.length) params.set('difficulty', selectedDiffs.join(','));
    params.set('page', String(page));
    params.set('limit', String(PAGE_LIMIT));

    setLoading(true);
    fetch(`${API}/api/library?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: LibraryResponse) => {
        setProblems(data.problems || []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, selectedTypes.join(','), selectedDiffs.join(','), page]);

  function updateParam(key: string, value: string | null) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  function toggleFilter(key: string, value: string, current: string[]) {
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateParam(key, next.length ? next.join(',') : null);
  }

  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam('q', val || null), 350);
  }

  function openProblem(p: Problem) {
    navigate(`/capra/coding?problem=${encodeURIComponent(p.name)}&autosolve=0`);
  }

  const activeFiltersCount = selectedTypes.length + selectedDiffs.length + (q ? 1 : 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border-subtle)',
        padding: '28px 32px 20px',
        background: 'var(--surface-0)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Problem Library</h1>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {meta ? `${meta.total.toLocaleString()} problems` : '…'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            HackerRank assessment library — MCQ, coding, database, full-stack &amp; more
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 32px',
        background: 'var(--surface-0)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 280px' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="7" cy="7" r="5" /><path d="M12 12l3 3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search problems…"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 32,
                paddingRight: 10,
                paddingTop: 7,
                paddingBottom: 7,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 7,
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Difficulty pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['Easy', 'Medium', 'Hard'].map(d => {
              const s = DIFF_STYLES[d];
              const active = selectedDiffs.includes(d);
              return (
                <button key={d} onClick={() => toggleFilter('difficulty', d, selectedDiffs)} style={{
                  padding: '5px 12px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${active ? s.border : 'var(--border-subtle)'}`,
                  background: active ? s.bg : 'transparent',
                  color: active ? s.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}>
                  {d}
                </button>
              );
            })}
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['code', 'mcq', 'database', 'fullstack', 'coderepo_task', 'multiple_mcq', 'sudorank'].map(t => {
              const active = selectedTypes.includes(t);
              const c = TYPE_COLORS[t] || { bg: 'rgba(255,255,255,0.08)', text: 'var(--text-secondary)', border: 'rgba(255,255,255,0.12)' };
              return (
                <button key={t} onClick={() => toggleFilter('type', t, selectedTypes)} style={{
                  padding: '5px 10px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1px solid ${active ? c.border : 'var(--border-subtle)'}`,
                  background: active ? c.bg : 'transparent',
                  color: active ? c.text : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}>
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>

          {/* Clear */}
          {activeFiltersCount > 0 && (
            <button onClick={() => { setSearchInput(''); setSearchParams({}); }} style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}>
              Clear filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px' }}>
        {/* Count */}
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
          {loading ? 'Loading…' : `${total.toLocaleString()} problem${total !== 1 ? 's' : ''}`}
          {activeFiltersCount > 0 && !loading && ` matching filters`}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
              <div key={i} style={{
                height: 140,
                borderRadius: 10,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                opacity: 0.5,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : problems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No problems found</div>
            <div style={{ fontSize: 13 }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {problems.map(p => (
              <ProblemCard key={p.id} problem={p} onClick={() => openProblem(p)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
            <button
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-1)',
                color: page <= 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >
              ← Prev
            </button>

            {/* Page window */}
            {(() => {
              const start = Math.max(1, page - 3);
              const end = Math.min(pages, start + 6);
              return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p2 => (
                <button key={p2} onClick={() => updateParam('page', String(p2))} style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${p2 === page ? 'rgba(0,71,171,0.5)' : 'var(--border-subtle)'}`,
                  background: p2 === page ? 'rgba(0,71,171,0.15)' : 'var(--surface-1)',
                  color: p2 === page ? '#4d8ce8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: p2 === page ? 700 : 400,
                }}>
                  {p2}
                </button>
              ));
            })()}

            <button
              disabled={page >= pages}
              onClick={() => updateParam('page', String(page + 1))}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-1)',
                color: page >= pages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: page >= pages ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
