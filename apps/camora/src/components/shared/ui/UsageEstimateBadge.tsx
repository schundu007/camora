import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface EstimateData {
  surface: string;
  estimate_seconds: number;
  sample_size: number;
  source: 'user_median' | 'fleet_median' | 'fallback';
  remaining_seconds: number;
  remaining_hours: number;
  would_exceed: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `~${minutes < 2 ? minutes.toFixed(1) : Math.round(minutes)}m`;
  return `~${(minutes / 60).toFixed(1)}h`;
}

/**
 * Pre-call estimate badge — small inline pill that previews how much AI
 * time a generation is expected to consume and whether the user's pool
 * has room. Render near submit buttons for long generations (prep doc,
 * design, full job analysis).
 *
 * Subtle by default (just text); flips to amber if the estimate is more
 * than 50% of remaining, red if it would exceed.
 */
export function UsageEstimateBadge({ surface, className = '' }: { surface: string; className?: string }) {
  const { token, isAuthenticated } = useAuth();
  const [data, setData] = useState<EstimateData | null>(null);

  useEffect(() => {
    if (!token || !isAuthenticated || !surface) { setData(null); return; }
    let cancelled = false;
    fetch(`${API}/api/v1/teams/me/estimate?surface=${encodeURIComponent(surface)}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled && json) setData(json); })
      .catch(() => { /* silent — estimate is optional */ });
    return () => { cancelled = true; };
  }, [token, isAuthenticated, surface]);

  if (!data) return null;

  const usePct = data.remaining_seconds > 0
    ? data.estimate_seconds / data.remaining_seconds
    : 1;
  const isWarn = usePct >= 0.5 && !data.would_exceed;
  const isExceed = data.would_exceed;

  const dotColor = isExceed ? '#dc2626' : isWarn ? '#d97706' : 'var(--accent)';
  const message = isExceed
    ? `~${formatDuration(data.estimate_seconds)} needed · only ${formatDuration(data.remaining_seconds)} left in pool`
    : `Will use about ${formatDuration(data.estimate_seconds)} of your AI hours`;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] ${className}`} style={{ color: 'var(--text-muted)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} aria-hidden="true" />
      <span>{message}</span>
    </span>
  );
}

export default UsageEstimateBadge;
