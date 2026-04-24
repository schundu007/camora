import { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'coding', name: 'DSA', total: 57, color: 'var(--text-primary)' },
  { id: 'system-design', name: 'System Design', total: 163, color: 'var(--text-primary)' },
  { id: 'microservices', name: 'Micro', total: 12, color: 'var(--text-primary)' },
  { id: 'databases', name: 'DB', total: 12, color: 'var(--text-primary)' },
  { id: 'sql', name: 'SQL', total: 8, color: 'var(--text-primary)' },
  { id: 'low-level', name: 'LLD', total: 106, color: 'var(--text-primary)' },
  { id: 'behavioral', name: 'Behavioral', total: 57, color: 'var(--text-primary)' },
];

const TOTAL = CATEGORIES.reduce((s, c) => s + c.total, 0);
const R = 20, STROKE = 3.5;
const C = 2 * Math.PI * R;

export default function ProgressTracker() {
  const [done, setDone] = useState({});

  useEffect(() => {
    try {
      const s = localStorage.getItem('ascend_completed_topics');
      if (s) setDone(JSON.parse(s));
    } catch {}
  }, []);

  const completed = Object.keys(done).filter(k => done[k]).length;
  const pct = TOTAL > 0 ? Math.round((completed / TOTAL) * 100) : 0;
  const offset = C - (pct / 100) * C;

  const stats = [
    { value: completed, label: 'Done', color: 'var(--text-primary)' },
    { value: TOTAL, label: 'Total', color: 'var(--text-primary)' },
    { value: CATEGORIES.length, label: 'Categories', color: 'var(--text-primary)' },
    { value: `${pct}%`, label: 'Complete', color: 'var(--text-primary)' },
  ];

  return (
    <div className="flex items-center gap-4 rounded border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
        <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={22} cy={22} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
          <circle cx={22} cy={22} r={R} fill="none" stroke="var(--accent)" strokeWidth={STROKE}
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-[var(--text-primary)]">{pct}%</span>
        </div>
      </div>

      {/* Stats inline */}
      <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto no-scrollbar">
        {stats.map(s => (
          <div key={s.label} className="shrink-0">
            <div className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div className="hidden sm:flex flex-col gap-1 w-32 shrink-0">
        <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden flex">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="h-full" style={{ width: `${cat.total / TOTAL * 100}%`, background: 'var(--bg-elevated)' }} />
          ))}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <span key={cat.id} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} title={`${cat.name}: ${cat.total}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
