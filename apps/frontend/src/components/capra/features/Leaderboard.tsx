import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar: string | null;
  xp_earned: number;
  problems_solved: number;
}

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const token = document.cookie.match(/(^| )cariara_sso=([^;]+)/)?.[2];
        if (token) {
          try { setCurrentUserId(JSON.parse(atob(token.split('.')[1])).sub || null); } catch { /* ignore */ }
        }
        const res = await fetch(`${API_URL}/api/gamification/leaderboard`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error('Failed to load leaderboard');
        const json = await res.json();
        setEntries(json.leaderboard || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 rounded w-32" style={{ background: 'var(--bg-elevated)' }} />
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
              <div className="h-3 rounded flex-1" style={{ background: 'var(--bg-elevated)' }} />
            </div>
          ))}
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

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Leaderboard</h3>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Top performers this week</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No activity yet. Be the first!</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(entry => {
            const isMe = currentUserId && entry.user_id === currentUserId;
            return (
              <div key={entry.user_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: isMe ? 'var(--accent-subtle)' : 'transparent',
                  border: isMe ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                }}
              >
                {/* Rank */}
                <span className="w-6 text-center text-sm font-bold shrink-0" style={{ color: entry.rank <= 3 ? '#f59e0b' : 'var(--text-muted)' }}>
                  {RANK_ICONS[entry.rank] || entry.rank}
                </span>

                {/* Avatar */}
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    {(entry.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block" style={{ color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {entry.name}
                    {isMe && <span className="ml-1 text-[9px] font-bold uppercase" style={{ color: 'var(--accent)' }}>you</span>}
                  </span>
                </div>

                {/* XP */}
                <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>
                  {entry.xp_earned.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
