import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface GamificationProfile {
  xp: number;
  level: number;
  nextLevelXP: number;
  prevLevelXP: number;
  progressPct: number;
  problems_solved: number;
  current_streak: number;
  longest_streak: number;
}

interface Badge {
  key: string;
  title: string;
  desc: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

export default function GamificationWidget() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, badgesRes] = await Promise.all([
          fetch(`${API_URL}/api/gamification/profile`, { headers: { ...getAuthHeaders() } }),
          fetch(`${API_URL}/api/gamification/badges`, { headers: { ...getAuthHeaders() } }),
        ]);
        if (!profileRes.ok) throw new Error('Failed to load gamification data');
        setProfile(await profileRes.json());
        if (badgesRes.ok) {
          const json = await badgesRes.json();
          setBadges((json.badges || []).filter((b: Badge) => b.earned).sort((a: Badge, b: Badge) => {
            return (b.earned_at ? new Date(b.earned_at).getTime() : 0) - (a.earned_at ? new Date(a.earned_at).getTime() : 0);
          }).slice(0, 3));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 rounded w-24" style={{ background: 'var(--bg-elevated)' }} />
            <div className="h-2 rounded w-full" style={{ background: 'var(--bg-elevated)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) return null;

  const xpInLevel = profile.xp - profile.prevLevelXP;
  const xpNeeded = profile.nextLevelXP - profile.prevLevelXP;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (profile.progressPct / 100) * circumference;

  const stats = [
    { value: profile.current_streak, label: 'Streak', suffix: 'd', color: '#f59e0b' },
    { value: profile.problems_solved, label: 'Solved', suffix: '', color: '#818cf8' },
    { value: profile.xp, label: 'Total XP', suffix: '', color: '#6366f1' },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center flex-wrap gap-6 px-5 py-4">
        {/* Level ring */}
        <div className="flex items-center gap-4">
          <div className="relative" style={{ width: 56, height: 56 }}>
            <svg width="56" height="56" viewBox="0 0 56 56" className="transform -rotate-90">
              <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="4" />
              <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--accent)" strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {profile.level}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Level {profile.level}</div>
            <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-10" style={{ background: 'var(--border)' }} />

        {/* Stats */}
        <div className="flex gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-bold tabular-nums" style={{ color: s.color }}>
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}{s.suffix}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent badges */}
        {badges.length > 0 && (
          <>
            <div className="hidden sm:block w-px h-10" style={{ background: 'var(--border)' }} />
            <div className="flex gap-2">
              {badges.map(badge => (
                <div key={badge.key} title={badge.desc}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--accent-hover)' }}>
                  <span className="text-sm">{badge.icon}</span>
                  {badge.title}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
