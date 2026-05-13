import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: number;
  name: string;
  summary: string;
  preview: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  multiple_mcq: 'Multi-MCQ',
  code: 'Coding',
  database: 'Database',
  fullstack: 'Full Stack',
  coderepo_task: 'Code Repo',
  sudorank: 'SudoRank',
  whiteboard: 'Whiteboard',
  code_review: 'Code Review',
  prompt_engineering: 'Prompt Eng',
  approx: 'Approx',
  complete: 'Completion',
  design: 'Design',
  textAns: 'Written',
  diagram: 'Diagram',
};

const TYPE_COLORS: Record<string, string> = {
  code:              '#4d8ce8',
  database:          '#10b981',
  fullstack:         '#a78bfa',
  coderepo_task:     '#60a5fa',
  mcq:               '#c9a227',
  multiple_mcq:      '#c9a227',
  sudorank:          '#f87171',
  whiteboard:        '#fbbf24',
  code_review:       '#93c5fd',
  prompt_engineering:'#c084fc',
};

const DIFF_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  Easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  Hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
};

const PAGE_LIMIT = 30;
const ALL_TYPES = ['code', 'mcq', 'database', 'fullstack', 'coderepo_task', 'multiple_mcq', 'sudorank', 'whiteboard', 'code_review', 'prompt_engineering'];

const DURATION_LABELS: Record<string, string> = {
  quick:    'Quick (≤10m)',
  short:    'Short (11–30m)',
  long:     'Long (31–60m)',
  extended: 'Extended (60m+)',
};

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
  searchable,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string | null) => void;
  renderLabel?: (v: string) => React.ReactNode;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const count = selected.length;
  const visible = searchable && search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 7,
          border: `1px solid ${count > 0 ? 'var(--border-focus)' : 'var(--border)'}`,
          background: count > 0 ? 'rgba(89,133,182,0.12)' : 'var(--bg-surface)',
          color: count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {count > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--cam-gold-leaf)', color: '#000',
            fontSize: 10, fontWeight: 700,
          }}>{count}</span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', opacity: 0.5 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          minWidth: 220, background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}>
          {searchable && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input
                autoFocus
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '5px 8px', borderRadius: 5,
                  border: '1px solid var(--border)', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
            {visible.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>No matches</div>
            ) : visible.map(opt => (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px', cursor: 'pointer', fontSize: 13,
                color: 'var(--text-secondary)',
              }}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                  style={{ accentColor: 'var(--cam-gold-leaf)', cursor: 'pointer', flexShrink: 0 }}
                />
                {renderLabel ? renderLabel(opt) : opt}
              </label>
            ))}
          </div>
          {count > 0 && (
            <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => onToggle(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--text-muted)', padding: '2px 4px',
              }}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ProblemRow({ problem, index, onClick }: { problem: Problem; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const typeColor = TYPE_COLORS[problem.type] || 'var(--text-muted)';
  const diffStyle = problem.difficulty ? DIFF_STYLES[problem.difficulty] : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 90px 90px 56px',
        alignItems: 'center',
        padding: '11px 16px',
        cursor: 'pointer',
        background: hovered ? 'var(--bg-elevated)' : index % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s',
        gap: 8,
      }}
    >
      {/* Index */}
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
        {index + 1}
      </span>

      {/* Name + skills */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: hovered ? 'var(--cam-gold-leaf)' : 'var(--text-primary)',
          transition: 'color 0.1s',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 3,
        }}>
          {problem.name}
        </div>
        {problem.skills.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
            {problem.skills.slice(0, 3).map(s => (
              <span key={s} style={{
                fontSize: 11, padding: '1px 6px', borderRadius: 3,
                background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>{s}</span>
            ))}
            {problem.skills.length > 3 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{problem.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Difficulty */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {diffStyle ? (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
            color: diffStyle.color, background: diffStyle.bg, border: `1px solid ${diffStyle.border}`,
            whiteSpace: 'nowrap',
          }}>
            {problem.difficulty}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
        )}
      </div>

      {/* Type */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          color: typeColor,
          background: `${typeColor}18`,
          border: `1px solid ${typeColor}40`,
          whiteSpace: 'nowrap',
        }}>
          {TYPE_LABELS[problem.type] || problem.type}
        </span>
      </div>

      {/* Duration */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {problem.duration_min ? `${problem.duration_min}m` : '—'}
        </span>
      </div>
    </div>
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
  const [metaTotal, setMetaTotal] = useState<number | null>(null);
  const [metaSkills, setMetaSkills] = useState<string[]>([]);

  const q = searchParams.get('q') || '';
  const selectedTypes = searchParams.get('type') ? searchParams.get('type')!.split(',') : [];
  const selectedDiffs = searchParams.get('difficulty') ? searchParams.get('difficulty')!.split(',') : [];
  const selectedSkills = searchParams.get('skills') ? searchParams.get('skills')!.split(',') : [];
  const selectedDurations = searchParams.get('duration') ? searchParams.get('duration')!.split(',') : [];
  const page = parseInt(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/library/meta`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setMetaTotal(d.total ?? null);
        setMetaSkills(d.skills ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedTypes.length) params.set('type', selectedTypes.join(','));
    if (selectedDiffs.length) params.set('difficulty', selectedDiffs.join(','));
    if (selectedSkills.length) params.set('skills', selectedSkills.join(','));
    if (selectedDurations.length) params.set('duration', selectedDurations.join(','));
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
      .catch(() => { setProblems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [q, selectedTypes.join(','), selectedDiffs.join(','), selectedSkills.join(','), selectedDurations.join(','), page]);

  function updateParam(key: string, value: string | null) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  function toggleList(key: string, value: string | null, current: string[]) {
    if (value === null) { updateParam(key, null); return; }
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateParam(key, next.length ? next.join(',') : null);
  }

  function handleSearch(val: string) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam('q', val || null), 350);
  }

  function openProblem(p: Problem) {
    const parts = [p.name];
    if (p.preview && p.preview.trim()) parts.push(p.preview.trim());
    if (p.summary && p.summary.trim() && p.summary !== p.preview) parts.push(p.summary.trim());
    navigate(`/capra/coding?problem=${encodeURIComponent(parts.join('\n\n'))}&autosolve=0`);
  }

  const activeCount = selectedTypes.length + selectedDiffs.length + selectedSkills.length + selectedDurations.length + (q ? 1 : 0);

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100%', color: 'var(--text-primary)' }}>
      {/* Page header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Problem Library</h1>
          {metaTotal !== null && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {metaTotal.toLocaleString()} problems
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
          HackerRank assessment library — MCQ, coding, database, full-stack &amp; more
        </p>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 240px' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }}
              width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="7" cy="7" r="5" /><path d="M12 12l3 3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search problems…"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Difficulty */}
          <FilterDropdown
            label="Difficulty"
            options={['Easy', 'Medium', 'Hard']}
            selected={selectedDiffs}
            onToggle={v => toggleList('difficulty', v, selectedDiffs)}
            renderLabel={v => {
              const s = DIFF_STYLES[v];
              return <span style={{ color: s?.color ?? 'inherit', fontWeight: 600 }}>{v}</span>;
            }}
          />

          {/* Type */}
          <FilterDropdown
            label="Type"
            options={ALL_TYPES}
            selected={selectedTypes}
            onToggle={v => toggleList('type', v, selectedTypes)}
            renderLabel={v => (
              <span style={{ color: TYPE_COLORS[v] || 'var(--text-secondary)', fontWeight: 600 }}>
                {TYPE_LABELS[v] || v}
              </span>
            )}
          />

          {/* Skills */}
          {metaSkills.length > 0 && (
            <FilterDropdown
              label="Skills"
              options={metaSkills}
              selected={selectedSkills}
              onToggle={v => toggleList('skills', v, selectedSkills)}
              searchable
            />
          )}

          {/* Duration */}
          <FilterDropdown
            label="Duration"
            options={['quick', 'short', 'long', 'extended']}
            selected={selectedDurations}
            onToggle={v => toggleList('duration', v, selectedDurations)}
            renderLabel={v => <span>{DURATION_LABELS[v] ?? v}</span>}
          />

          {activeCount > 0 && (
            <button onClick={() => { setSearchInput(''); setSearchParams({}); }} style={{
              fontSize: 12, color: 'var(--text-muted)', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0',
            }}>
              Clear ({activeCount})
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 90px 90px 56px',
        gap: 8,
        padding: '7px 16px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-base)',
      }}>
        {['#', 'Problem', 'Difficulty', 'Type', 'Time'].map((h, i) => (
          <span key={h} style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            textAlign: i === 0 ? 'center' : i >= 2 ? 'center' : 'left',
          }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div>
        {loading ? (
          Array.from({ length: PAGE_LIMIT }).map((_, i) => (
            <div key={i} style={{
              height: 52, borderBottom: '1px solid var(--border)',
              background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
              opacity: 0.4,
            }} />
          ))
        ) : problems.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No problems found</div>
            <div style={{ fontSize: 13 }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          problems.map((p, i) => (
            <ProblemRow
              key={p.id}
              problem={p}
              index={(page - 1) * PAGE_LIMIT + i}
              onClick={() => openProblem(p)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '20px 0 32px', flexWrap: 'wrap' }}>
          <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            ← Prev
          </button>
          {(() => {
            const start = Math.max(1, page - 3);
            const end = Math.min(pages, start + 6);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p2 => (
              <button key={p2} onClick={() => updateParam('page', String(p2))} style={{
                padding: '5px 10px', borderRadius: 6,
                border: `1px solid ${p2 === page ? 'var(--border-focus)' : 'var(--border)'}`,
                background: p2 === page ? 'rgba(89,133,182,0.15)' : 'var(--bg-surface)',
                color: p2 === page ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, fontWeight: p2 === page ? 700 : 400,
              }}>{p2}</button>
            ));
          })()}
          <button disabled={page >= pages} onClick={() => updateParam('page', String(page + 1))}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: page >= pages ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page >= pages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
