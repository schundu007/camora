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
        const res = await fetch(`${API_URL}/api/gamification/badges`, { headers: { ...getAuthHeaders() } });
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
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 rounded w-24" style={{ background: 'var(--bg-elevated)' }} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const earned = badges.filter(b => b.earned);
  const unearned = badges.filter(b => !b.earned);

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Badges</h3>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{earned.length}/{badges.length}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Earned badges first */}
        {earned.map(badge => (
          <div key={badge.key} className="rounded-lg p-3 transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="text-2xl mb-2">{badge.icon}</div>
            <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{badge.title}</div>
            <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--text-muted)' }}>{badge.desc}</div>
            {badge.earned_at && (
              <div className="text-[9px] font-mono mt-2" style={{ color: 'var(--accent)' }}>
                {new Date(badge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        ))}

        {/* Unearned badges — muted */}
        {unearned.map(badge => (
          <div key={badge.key} className="rounded-lg p-3 relative overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="text-2xl mb-2 grayscale opacity-30">{badge.icon}</div>
            <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-muted)' }}>{badge.title}</div>
            <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--text-dimmed)' }}>{badge.desc}</div>
            {/* Lock icon */}
            <div className="absolute top-2 right-2">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="var(--text-dimmed)">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
