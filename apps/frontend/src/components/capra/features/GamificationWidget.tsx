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
          fetch(`${API_URL}/api/gamification/profile`, {
            headers: { ...getAuthHeaders() },
          }),
          fetch(`${API_URL}/api/gamification/badges`, {
            headers: { ...getAuthHeaders() },
          }),
        ]);

        if (!profileRes.ok) throw new Error('Failed to load gamification data');
        const profileJson = await profileRes.json();
        setProfile(profileJson);

        if (badgesRes.ok) {
          const badgesJson = await badgesRes.json();
          const earned = (badgesJson.badges || [])
            .filter((b: Badge) => b.earned)
            .sort((a: Badge, b: Badge) => {
              const aTime = a.earned_at ? new Date(a.earned_at).getTime() : 0;
              const bTime = b.earned_at ? new Date(b.earned_at).getTime() : 0;
              return bTime - aTime;
            })
            .slice(0, 3);
          setBadges(earned);
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
      <div className="bg-white border border-[#e3e8ee] rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded flex-1" />
          </div>
          <div className="flex gap-3">
            <div className="h-16 bg-gray-100 rounded flex-1" />
            <div className="h-16 bg-gray-100 rounded flex-1" />
            <div className="h-16 bg-gray-100 rounded flex-1" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e3e8ee] rounded-2xl p-5">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  const xpInLevel = profile.xp - profile.prevLevelXP;
  const xpNeeded = profile.nextLevelXP - profile.prevLevelXP;

  return (
    <div className="bg-white border border-[#e3e8ee] rounded-2xl p-5 space-y-4">
      {/* Top row: Level badge + XP bar */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
          </svg>
          Level {profile.level}
        </span>
        <div className="flex-1">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${profile.progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Middle row: 3 stat boxes */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="bg-amber-50 rounded-xl px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            <span className="text-lg font-bold text-amber-700">{profile.current_streak}</span>
          </div>
          <p className="text-[11px] text-amber-600 mt-0.5">Streak</p>
        </div>

        {/* Solved */}
        <div className="bg-blue-50 rounded-xl px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-lg font-bold text-blue-700">{profile.problems_solved}</span>
          </div>
          <p className="text-[11px] text-blue-600 mt-0.5">Solved</p>
        </div>

        {/* XP */}
        <div className="bg-emerald-50 rounded-xl px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
            <span className="text-lg font-bold text-emerald-700">{profile.xp.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Total XP</p>
        </div>
      </div>

      {/* Bottom row: Recent badges */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Recent Badges</p>
        {badges.length > 0 ? (
          <div className="flex items-center gap-2">
            {badges.map((badge) => (
              <div
                key={badge.key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                title={badge.desc}
              >
                <span className="text-base">{badge.icon}</span>
                <span className="text-xs font-medium text-emerald-700">{badge.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No badges yet -- keep solving!</p>
        )}
      </div>
    </div>
  );
}
