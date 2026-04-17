import { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'coding', name: 'DSA', total: 57, color: '#10b981' },
  { id: 'system-design', name: 'System Design', total: 163, color: '#06b6d4' },
  { id: 'microservices', name: 'Micro', total: 12, color: '#91C733' },
  { id: 'databases', name: 'DB', total: 12, color: '#f97316' },
  { id: 'sql', name: 'SQL', total: 8, color: '#fbbf24' },
  { id: 'low-level', name: 'LLD', total: 106, color: '#a78bfa' },
  { id: 'behavioral', name: 'Behavioral', total: 57, color: '#f472b6' },
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
    { value: completed, label: 'Done', color: '#10b981' },
    { value: TOTAL, label: 'Total', color: 'var(--text-primary)' },
    { value: CATEGORIES.length, label: 'Categories', color: '#3b82f6' },
    { value: `${pct}%`, label: 'Complete', color: '#91C733' },
  ];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
        <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={22} cy={22} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
          <circle cx={22} cy={22} r={R} fill="none" stroke="#10b981" strokeWidth={STROKE}
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
            <div className="text-lg font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div className="hidden sm:flex flex-col gap-1 w-32 shrink-0">
        <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden flex">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="h-full" style={{ width: `${cat.total / TOTAL * 100}%`, background: `${cat.color}40` }} />
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
