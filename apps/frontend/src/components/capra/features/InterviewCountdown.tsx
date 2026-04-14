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
      <div className="bg-gradient-to-br from-white/80 to-indigo-50/30 border border-indigo-200/30 rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-12 bg-gray-100 rounded w-20" />
          <div className="h-3 bg-gray-100 rounded w-48" />
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
          className="w-full bg-gradient-to-br from-white/80 to-indigo-50/30 border border-indigo-200/30 rounded-2xl p-5 text-left hover:border-indigo-300/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Interview Countdown</p>
              <p className="text-[13px] text-gray-500 mt-0.5">Track your prep progress</p>
            </div>
            <span className="text-indigo-600 text-sm font-medium group-hover:translate-x-0.5 transition-transform">
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
    <div className="bg-gradient-to-br from-white/80 to-indigo-50/30 border border-indigo-200/30 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle
              cx="36" cy="36" r={radius}
              fill="none" stroke="#e5e7eb" strokeWidth="5"
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
            <span className="text-lg font-bold text-emerald-600">{days_remaining}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Countdown</p>
          <p className="text-[15px] font-semibold text-gray-900 mt-0.5">
            {days_remaining} {days_remaining === 1 ? 'day' : 'days'} until your {target_company} interview
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">{completion_pct}% prepared</span>
            <Link
              to="/capra/plan"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View plan &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
