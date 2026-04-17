import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAuthHeaders } from '../../../utils/authHeaders.js';
import InterviewSetupModal from './InterviewSetupModal';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface CountdownData {
  interview_date: string;
  target_company: string;
  target_role: string;
  days_remaining: number;
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
}

export default function InterviewCountdown() {
  const [data, setData] = useState<CountdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const fetchCountdown = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/interview/countdown`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) {
        // 404 means no plan set — that's fine
        if (res.status === 404) {
          setData(null);
          return;
        }
        throw new Error('Failed to load countdown');
      }
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCountdown();
  }, [fetchCountdown]);

  function handleSetupComplete() {
    setShowSetup(false);
    setLoading(true);
    fetchCountdown();
  }

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-5 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[var(--bg-elevated)] rounded w-32" />
          <div className="h-12 bg-[var(--bg-elevated)] rounded w-20" />
          <div className="h-3 bg-[var(--bg-elevated)] rounded w-48" />
        </div>
      </div>
    );
  }

  // No interview set — show CTA
  if (!data) {
    return (
      <>
        <button
          onClick={() => setShowSetup(true)}
          className="w-full bg-[var(--bg-surface)] border-0 rounded-2xl p-5 text-left shadow-[0_4px_24px_rgba(118,185,0,0.12)] hover:shadow-[0_20px_60px_rgba(118,185,0,0.28)] transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Interview Countdown</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Track your prep progress</p>
            </div>
            <span className="text-emerald-600 text-sm font-medium group-hover:translate-x-0.5 transition-transform">
              Set your interview date &rarr;
            </span>
          </div>
        </button>

        <InterviewSetupModal
          isOpen={showSetup}
          onClose={() => setShowSetup(false)}
          onSetup={handleSetupComplete}
        />
      </>
    );
  }

  // Interview set — show countdown + progress
  const { days_remaining, target_company, completion_pct } = data;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completion_pct / 100) * circumference;

  return (
    <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-5 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle
              cx="36" cy="36" r={radius}
              fill="none" stroke="var(--border)" strokeWidth="5"
            />
            <circle
              cx="36" cy="36" r={radius}
              fill="none" stroke="#10b981" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 36 36)"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--accent)]">{days_remaining}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Countdown</p>
          <p className="text-[15px] font-semibold text-[var(--text-primary)] mt-0.5">
            {days_remaining} {days_remaining === 1 ? 'day' : 'days'} until your {target_company} interview
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[var(--text-muted)]">{completion_pct}% prepared</span>
            <Link
              to="/capra/plan"
              className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              View plan &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
