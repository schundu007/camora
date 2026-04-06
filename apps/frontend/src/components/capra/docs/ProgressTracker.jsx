import { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'coding', name: 'DSA', total: 57, color: '#10b981' },
  { id: 'system-design', name: 'System Design', total: 163, color: '#06b6d4' },
  { id: 'microservices', name: 'Microservices', total: 12, color: '#818cf8' },
  { id: 'databases', name: 'Databases', total: 12, color: '#f97316' },
  { id: 'sql', name: 'SQL', total: 8, color: '#fbbf24' },
  { id: 'low-level', name: 'LLD', total: 106, color: '#a78bfa' },
  { id: 'behavioral', name: 'Behavioral', total: 57, color: '#f472b6' },
];

const TOTAL = CATEGORIES.reduce((s, c) => s + c.total, 0);
const R = 24, STROKE = 4;
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Compact header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Mini ring */}
        <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
          <svg width={52} height={52} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={26} cy={26} r={R} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
            <circle cx={26} cy={26} r={R} fill="none" stroke="#10b981" strokeWidth={STROKE}
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-900">{pct}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900">Your Progress</span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{completed}/{TOTAL}</span>
          </div>
          {/* Stacked progress bar */}
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
            {CATEGORIES.map(cat => {
              const catDone = Object.keys(done).filter(k => done[k]).length;
              const w = cat.total / TOTAL * 100;
              return <div key={cat.id} className="h-full" style={{ width: `${w}%`, background: catDone > 0 ? cat.color : `${cat.color}30`, transition: 'all 0.4s ease' }} />;
            })}
          </div>
        </div>
      </div>

      {/* Category chips — single horizontal row */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-t border-gray-100 bg-gray-50/50 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <span key={cat.id} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-gray-600 whitespace-nowrap shrink-0" style={{ background: `${cat.color}10` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
            {cat.name}
            <span className="font-mono text-gray-400">{cat.total}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
