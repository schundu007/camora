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

const RANK_STYLES: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '🥇' },
  2: { bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-muted)]', icon: '🥈' },
  3: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: '🥉' },
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Decode user_id from JWT for highlighting
        const token = document.cookie.match(/(^| )cariara_sso=([^;]+)/)?.[2];
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUserId(payload.sub || null);
          } catch {
            // ignore decode errors
          }
        }

        const res = await fetch(`${API_URL}/api/gamification/leaderboard`, {
          headers: { ...getAuthHeaders() },
        });
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
      <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(45,140,255,0.12)]">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[var(--bg-elevated)] rounded w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 bg-[var(--bg-elevated)] rounded-full" />
              <div className="h-4 bg-[var(--bg-elevated)] rounded flex-1" />
              <div className="h-4 bg-[var(--bg-elevated)] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(45,140,255,0.12)]">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(45,140,255,0.12)]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Weekly Leaderboard</h3>
        <p className="text-sm text-[var(--text-muted)] mt-2">No activity this week yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border-0 rounded-2xl p-6 space-y-5 shadow-[0_4px_24px_rgba(45,140,255,0.12)]">
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Weekly Leaderboard</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">Top performers this week</p>
      </div>

      <div className="rounded-lg overflow-hidden border border-[var(--border)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              <th className="px-4 py-3 w-14">Rank</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">XP</th>
              <th className="px-4 py-3 text-right">Solved</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const isCurrentUser = currentUserId && entry.user_id === currentUserId;
              const rankStyle = RANK_STYLES[entry.rank];

              return (
                <tr
                  key={entry.user_id}
                  className={`border-t border-[var(--border)] transition-colors ${
                    isCurrentUser
                      ? 'bg-[var(--accent)]/10'
                      : idx % 2 === 0
                        ? 'bg-[var(--bg-surface)]'
                        : 'bg-[var(--bg-elevated)]/50'
                  }`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    {rankStyle ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${rankStyle.bg} ${rankStyle.text}`}>
                        {rankStyle.icon}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold text-[var(--text-muted)] bg-[var(--bg-elevated)]">
                        {entry.rank}
                      </span>
                    )}
                  </td>

                  {/* Avatar + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                          {(entry.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`text-sm font-medium ${isCurrentUser ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                        {entry.name}
                        {isCurrentUser && (
                          <span className="ml-1.5 text-[10px] font-bold text-[var(--accent)] uppercase">You</span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* XP */}
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${rankStyle ? rankStyle.text : 'text-[var(--text-secondary)]'}`}>
                      {entry.xp_earned.toLocaleString()}
                    </span>
                  </td>

                  {/* Problems Solved */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {entry.problems_solved}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
