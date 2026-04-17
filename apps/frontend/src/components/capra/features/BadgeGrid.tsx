import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface Badge {
  key: string;
  title: string;
  desc: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

export default function BadgeGrid() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch(`${API_URL}/api/gamification/badges`, {
          headers: { ...getAuthHeaders() },
        });
        if (!res.ok) throw new Error('Failed to load badges');
        const json = await res.json();
        setBadges(json.badges || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[var(--bg-elevated)] rounded w-32" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 bg-[var(--bg-elevated)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 space-y-5 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Badges</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {badges.filter((b) => b.earned).length} of {badges.length} earned
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {badges.map((badge) => (
          <div
            key={badge.key}
            className={`relative rounded-xl p-4 text-center transition-all ${
              badge.earned
                ? 'bg-[var(--bg-surface)] border-2 border-[var(--accent)]/40 shadow-sm'
                : 'bg-[var(--bg-elevated)] border border-[var(--border)]'
            }`}
          >
            {/* Lock overlay for unearned badges */}
            {!badge.earned && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)]/60">
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Icon */}
            <span
              className={`text-3xl block ${badge.earned ? '' : 'grayscale opacity-40'}`}
            >
              {badge.icon}
            </span>

            {/* Title */}
            <p
              className={`text-sm font-semibold mt-2 ${
                badge.earned ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              }`}
            >
              {badge.title}
            </p>

            {/* Description */}
            <p
              className={`text-[11px] mt-1 leading-tight ${
                badge.earned ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'
              }`}
            >
              {badge.desc}
            </p>

            {/* Earned date */}
            {badge.earned && badge.earned_at && (
              <p className="text-[10px] text-[var(--accent)] font-medium mt-2">
                {new Date(badge.earned_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
