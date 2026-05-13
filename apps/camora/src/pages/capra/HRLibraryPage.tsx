import { useState, useEffect, useRef } from 'react';
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
  skills_full: string[];
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
  mcq:               'MCQ',
  multiple_mcq:      'Multi-MCQ',
  code:              'Coding',
  database:          'Database',
  fullstack:         'Full Stack',
  coderepo_task:     'Code Repo',
  sudorank:          'SudoRank',
  whiteboard:        'Whiteboard',
  code_review:       'Code Review',
  prompt_engineering:'Prompt Eng',
  approx:            'Approx',
  complete:          'Completion',
  design:            'Design',
  textAns:           'Written',
  diagram:           'Diagram',
};

const DIFF_COLOR: Record<string, string> = {
  Easy:   '#22c55e',
  Medium: '#f59e0b',
  Hard:   '#ef4444',
};

const PAGE_LIMIT = 30;

const ALL_TYPES = [
  'code', 'mcq', 'database', 'fullstack', 'coderepo_task',
  'multiple_mcq', 'sudorank', 'whiteboard', 'code_review', 'prompt_engineering',
  'approx', 'complete', 'design', 'textAns', 'diagram',
];

const DURATION_LABELS: Record<string, string> = {
  quick:    'Quick (≤10m)',
  short:    'Short (11–30m)',
  long:     'Long (31–60m)',
  extended: 'Extended (60m+)',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSkill() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0, opacity: 0.7 }}>
      <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCode() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0, opacity: 0.7 }}>
      <polyline points="5,4 1,8 5,12" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="11,4 15,8 11,12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0, opacity: 0.7 }}>
      <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0, opacity: 0.7 }}>
      <polygon points="8,2 10,6 14,6.5 11,9.5 11.8,14 8,12 4.2,14 5,9.5 2,6.5 6,6"/>
    </svg>
  );
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label, options, selected, onToggle, renderLabel, searchable,
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

  const count   = selected.length;
  const visible = searchable && search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 20,
          border: `1px solid ${count > 0 ? 'var(--border-focus)' : 'var(--border)'}`,
          background: count > 0 ? 'rgba(89,133,182,0.12)' : 'var(--bg-elevated)',
          color: count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {label}
        {count > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 17, height: 17, borderRadius: '50%',
            background: 'var(--cam-gold-leaf)', color: '#000', fontSize: 10, fontWeight: 700,
          }}>{count}</span>
        )}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', opacity: 0.45, flexShrink: 0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
          minWidth: 240, background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 28px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          {searchable && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }}
                  width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="7" r="5"/><path d="M12 12l3 3" strokeLinecap="round"/>
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder={`Search ${label}…`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '5px 8px 5px 26px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'var(--bg-surface)',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}
          <div style={{ maxHeight: 264, overflowY: 'auto', padding: '4px 0' }}>
            {visible.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>No matches</div>
            ) : visible.map(opt => (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
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

// ─── ProblemCard ──────────────────────────────────────────────────────────────

function ProblemCard({ problem, onClick }: { problem: Problem; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const displaySkills = problem.skills_full?.length ? problem.skills_full : problem.skills;
  const firstSkill    = displaySkills[0] ?? null;
  const typeLabel     = TYPE_LABELS[problem.type] || problem.type;
  const diffColor     = problem.difficulty ? DIFF_COLOR[problem.difficulty] : null;
  const description   = problem.preview?.trim() || problem.summary?.trim() || '';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 24,
        padding: '20px 28px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.018)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Line 1: name + dark type pill + colored difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
            color: hovered ? 'var(--cam-gold-leaf)' : 'var(--text-primary)',
            transition: 'color 0.12s',
          }}>
            {problem.name}
          </span>
          {/* Type — dark pill, matches HackerRank "Pro Plan" / "Starter Plan" style */}
          <span style={{
            padding: '2px 10px', borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)',
            fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.02em',
          }}>
            {typeLabel}
          </span>
          {/* Difficulty — plain colored text, no border/pill, matches HackerRank */}
          {diffColor && (
            <span style={{ fontSize: 13, fontWeight: 600, color: diffColor }}>
              {problem.difficulty}
            </span>
          )}
        </div>

        {/* Line 2: description — 2-line natural wrap, not truncated to single line */}
        {description && (
          <p style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxWidth: '90%',
          }}>
            {description}
          </p>
        )}

        {/* Line 3: metadata icons — matches HackerRank's icon row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 20, fontSize: 12, color: 'var(--text-muted)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconSkill /> {firstSkill ?? 'Skill n/a'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconCode /> {typeLabel}
          </span>
          {problem.duration_min != null && problem.duration_min > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconClock /> {problem.duration_min} mins
            </span>
          )}
          {problem.points > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconStar /> {problem.points} score
            </span>
          )}
        </div>
      </div>

      {/* Solve button — always visible on right, like HackerRank's Upgrade */}
      <div style={{ flexShrink: 0, paddingTop: 4, alignSelf: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '5px 16px', borderRadius: 6,
          border: `1px solid ${hovered ? 'var(--cam-gold-leaf)' : 'var(--border)'}`,
          color: hovered ? 'var(--cam-gold-leaf)' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 700,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}>
          Solve →
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ i }: { i: number }) {
  return (
    <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', opacity: 0.28 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ width: `${140 + (i % 5) * 36}px`, height: 15, background: 'var(--bg-elevated)', borderRadius: 4 }}/>
        <div style={{ width: 56, height: 15, background: 'var(--bg-elevated)', borderRadius: 4 }}/>
        <div style={{ width: 36, height: 15, background: 'var(--bg-elevated)', borderRadius: 4 }}/>
      </div>
      <div style={{ width: '70%', height: 12, background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 5 }}/>
      <div style={{ width: '50%', height: 12, background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 12 }}/>
      <div style={{ display: 'flex', gap: 16 }}>
        {[96, 64, 56, 60].map((w, j) => (
          <div key={j} style={{ width: w, height: 11, background: 'var(--bg-elevated)', borderRadius: 4 }}/>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [problems, setProblems]     = useState<Problem[]>([]);
  const [total, setTotal]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(false);
  const [metaTotal, setMetaTotal]   = useState<number | null>(null);
  const [metaSkills, setMetaSkills] = useState<string[]>([]);
  const [metaRoles, setMetaRoles]   = useState<string[]>([]);

  const q              = searchParams.get('q')          || '';
  const selectedRoles  = searchParams.get('role')       ? searchParams.get('role')!.split(',')       : [];
  const selectedTypes  = searchParams.get('type')       ? searchParams.get('type')!.split(',')       : [];
  const selectedDiffs  = searchParams.get('difficulty') ? searchParams.get('difficulty')!.split(',') : [];
  const selectedSkills = searchParams.get('skills')     ? searchParams.get('skills')!.split(',')     : [];
  const selectedDurs   = searchParams.get('duration')   ? searchParams.get('duration')!.split(',')   : [];
  const page           = parseInt(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/library/meta`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setMetaTotal(d.total ?? null);
        setMetaSkills(d.skills ?? []);
        setMetaRoles(d.roles ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q)                     params.set('q',          q);
    if (selectedRoles.length)  params.set('role',       selectedRoles.join(','));
    if (selectedTypes.length)  params.set('type',       selectedTypes.join(','));
    if (selectedDiffs.length)  params.set('difficulty', selectedDiffs.join(','));
    if (selectedSkills.length) params.set('skills',     selectedSkills.join(','));
    if (selectedDurs.length)   params.set('duration',   selectedDurs.join(','));
    params.set('page',  String(page));
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
  }, [q,
    selectedRoles.join(','), selectedTypes.join(','), selectedDiffs.join(','),
    selectedSkills.join(','), selectedDurs.join(','), page]);

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
    if (p.preview?.trim()) parts.push(p.preview.trim());
    if (p.summary?.trim() && p.summary !== p.preview) parts.push(p.summary.trim());
    navigate(`/capra/coding?problem=${encodeURIComponent(parts.join('\n\n'))}&autosolve=0`);
  }

  const activeCount = selectedRoles.length + selectedTypes.length + selectedDiffs.length +
                      selectedSkills.length + selectedDurs.length + (q ? 1 : 0);

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100%', color: 'var(--text-primary)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 28px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px', letterSpacing: '-0.3px' }}>
          Problem Library
        </h1>

        {/* Full-width search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}
            width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="7" cy="7" r="5"/><path d="M12 12l3 3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search problems…"
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 40, paddingRight: 16,
              paddingTop: 11, paddingBottom: 11,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 14, color: 'var(--text-primary)', outline: 'none',
              boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>

        {/* Filter row — pill filters left, count + sort right */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, paddingBottom: 16, flexWrap: 'wrap',
        }}>
          {/* Left pills — Role first (like HackerRank), then Skill, Type, Difficulty, Duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {metaRoles.length > 0 && (
              <FilterDropdown
                label="Role" options={metaRoles} selected={selectedRoles}
                onToggle={v => toggleList('role', v, selectedRoles)} searchable
              />
            )}
            {metaSkills.length > 0 && (
              <FilterDropdown
                label="Skill" options={metaSkills} selected={selectedSkills}
                onToggle={v => toggleList('skills', v, selectedSkills)} searchable
              />
            )}
            <FilterDropdown
              label="Type" options={ALL_TYPES} selected={selectedTypes}
              onToggle={v => toggleList('type', v, selectedTypes)}
              renderLabel={v => <span style={{ fontWeight: 500 }}>{TYPE_LABELS[v] || v}</span>}
            />
            <FilterDropdown
              label="Difficulty" options={['Easy', 'Medium', 'Hard']} selected={selectedDiffs}
              onToggle={v => toggleList('difficulty', v, selectedDiffs)}
              renderLabel={v => <span style={{ color: DIFF_COLOR[v] ?? 'inherit', fontWeight: 600 }}>{v}</span>}
            />
            <FilterDropdown
              label="Duration" options={['quick', 'short', 'long', 'extended']} selected={selectedDurs}
              onToggle={v => toggleList('duration', v, selectedDurs)}
              renderLabel={v => <span>{DURATION_LABELS[v] ?? v}</span>}
            />
            {/* Clear-all filter icon */}
            {activeCount > 0 && (
              <button
                onClick={() => { setSearchInput(''); setSearchParams({}); }}
                title="Clear all filters"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: '50%',
                  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
                </svg>
              </button>
            )}
          </div>

          {/* Right: count | sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {loading ? <span>Loading…</span> : (
              <>
                <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{total.toLocaleString()}</strong>
                <span>Question{total !== 1 ? 's' : ''}</span>
                {metaTotal !== null && total !== metaTotal && (
                  <span style={{ opacity: 0.6 }}>of {metaTotal.toLocaleString()}</span>
                )}
                <span style={{ opacity: 0.25 }}>|</span>
                <span>Sort by <strong style={{ color: 'var(--text-secondary)' }}>Relevance</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }}/>

      {/* ── Problem list — full width, no max-width container ─────────────── */}
      <div>
        {loading ? (
          Array.from({ length: PAGE_LIMIT }).map((_, i) => <SkeletonCard key={i} i={i} />)
        ) : problems.length === 0 ? (
          <div style={{ padding: '80px 28px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No problems found</div>
            <div style={{ fontSize: 13 }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          problems.map(p => (
            <ProblemCard key={p.id} problem={p} onClick={() => openProblem(p)} />
          ))
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6,
          padding: '24px 28px 40px', flexWrap: 'wrap',
        }}>
          <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}
            style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            ← Prev
          </button>
          {(() => {
            const start = Math.max(1, page - 3);
            const end   = Math.min(pages, start + 6);
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
            style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: page >= pages ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page >= pages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
