import { useState, useRef, useEffect } from 'react';
import { useUsage } from '@/hooks/useUsage';

function getBarColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getTextColor(pct: number): string {
  if (pct > 80) return 'text-red-400';
  if (pct > 60) return 'text-amber-400';
  return 'text-emerald-400';
}

interface BucketRowProps {
  label: string;
  used: number;
  limit: number;
}

function BucketRow({ label, used, limit }: BucketRowProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-300 capitalize">{label}</span>
        <span className={`text-xs font-bold ${getTextColor(pct)}`}>
          {used}/{limit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColor(pct)} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageBar() {
  const { usage, loading } = useUsage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  if (loading || !usage) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
        <div className="w-16 h-2 bg-gray-700 rounded-full animate-pulse" />
      </div>
    );
  }

  const q = usage.questions;
  const pct = q.limit > 0 ? Math.min((q.used / q.limit) * 100, 100) : 0;

  return (
    <div ref={ref} className="relative">
      {/* Compact bar */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 transition-colors cursor-pointer"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold tabular-nums ${getTextColor(pct)}`}>
            {q.used}/{q.limit}
          </span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">questions</span>
        </div>
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getBarColor(pct)} transition-all duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-[fadeIn_150ms_ease-out]">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <p className="text-xs font-bold text-gray-300">Usage this month</p>
            <p className="text-[11px] text-gray-500 capitalize">{usage.plan} plan</p>
          </div>
          <div className="divide-y divide-gray-800">
            <BucketRow label="questions" used={usage.questions.used} limit={usage.questions.limit} />
            <BucketRow label="sessions" used={usage.sessions.used} limit={usage.sessions.limit} />
            <BucketRow label="diagrams" used={usage.diagrams.used} limit={usage.diagrams.limit} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
