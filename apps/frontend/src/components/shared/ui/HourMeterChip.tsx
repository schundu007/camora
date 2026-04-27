import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface BudgetData {
  source: 'team' | 'personal';
  pool_hours: number;
  used_hours: number;
  remaining_hours: number;
  exhausted: boolean;
}

function formatHours(h: number): string {
  if (h <= 0) return '0';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

/**
 * Compact AI-hour budget chip for SiteNav. Shows remaining hours with a
 * color-coded dot (green/amber/red) so users notice when their pool is
 * running low without opening the full team settings page.
 *
 * Renders nothing for unauthenticated users or while budget is loading —
 * the chip should only show when there's something useful to display.
 *
 * Variant matches SiteNav's light/dark theme.
 */
export function HourMeterChip({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { token, isAuthenticated } = useAuth();
  const [budget, setBudget] = useState<BudgetData | null>(null);

  useEffect(() => {
    if (!token || !isAuthenticated) { setBudget(null); return; }
    let cancelled = false;
    fetch(`${API}/api/v1/teams/me/budget`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setBudget(data);
      })
      .catch(() => { /* silent — chip is optional */ });
    return () => { cancelled = true; };
  }, [token, isAuthenticated]);

  if (!budget) return null;
  // Hide for free tier with 0 hours used — would just show "30m / 30m" which is noise.
  if (budget.source === 'personal' && budget.pool_hours === 0) return null;

  const pct = budget.pool_hours > 0 ? budget.used_hours / budget.pool_hours : 0;
  const isLow = pct >= 0.8 && !budget.exhausted;
  const isExhausted = budget.exhausted;

  // Dot color per state
  const dotColor = isExhausted ? '#dc2626' : isLow ? '#d97706' : '#059669';
  const isLight = variant === 'light';
  const bgColor = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLight ? 'var(--text-primary)' : '#FFFFFF';
  const mutedColor = isLight ? 'var(--text-muted)' : 'rgba(255, 255, 255, 0.7)';

  return (
    <Link
      to="/account/team"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all hover:opacity-80"
      style={{ background: bgColor }}
      title={`${formatHours(budget.remaining_hours)} of AI hours remaining${isExhausted ? ' — buy a top-up to keep going' : ''}`}
      aria-label={`${formatHours(budget.remaining_hours)} AI hours remaining`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} aria-hidden="true" />
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: textColor }}>
        {formatHours(budget.remaining_hours)}
      </span>
      <span className="text-[10px] tabular-nums" style={{ color: mutedColor }}>left</span>
    </Link>
  );
}

export default HourMeterChip;
