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
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: 16, padding: 20 }}>
        <div className="animate-pulse" style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.05)', width: '60%' }} />
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) return null;

  const xpInLevel = profile.xp - profile.prevLevelXP;
  const xpNeeded = profile.nextLevelXP - profile.prevLevelXP;

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: 16, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Level badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{profile.level}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Level {profile.level}</div>
            <div style={{ width: 120, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #10b981, #34d399)', width: `${profile.progressPct}%`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.06)' }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { value: profile.current_streak, label: 'Streak', color: '#f59e0b', svgPath: 'M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z' },
            { value: profile.problems_solved, label: 'Solved', color: '#818cf8', svgPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', stroke: true },
            { value: profile.xp.toLocaleString(), label: 'Total XP', color: '#34d399', svgPath: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" style={{ flexShrink: 0 }}
                  {...(s.stroke ? { fill: 'none', stroke: s.color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const } : { fill: s.color })}>
                  <path d={s.svgPath} />
                </svg>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{s.value}</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {badges.map(badge => (
                <div key={badge.key} title={badge.desc}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>{badge.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6ee7b7' }}>{badge.title}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
