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

/* SVG icons for each badge */
const BADGE_ICONS: Record<string, (color: string) => JSX.Element> = {
  snowflake: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
      <path d="M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2M6 12l-2-2M6 12l-2 2M18 12l2-2M18 12l2 2" />
    </svg>
  ),
  compass: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill={c} opacity="0.2" stroke={c} />
    </svg>
  ),
  trophy: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 1012 0V2Z" />
      <path d="M12 12l-1-2 1-1 1 1-1 2z" fill={c} opacity="0.25" />
    </svg>
  ),
  flame: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
      <path d="M12 19a3 3 0 01-3-3c0-1 .5-2.5 3-4 2.5 1.5 3 3 3 4a3 3 0 01-3 3z" fill={c} opacity="0.15" />
    </svg>
  ),
  mountain: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
      <path d="M4.14 15.08L7.5 12l2.5 2.5" />
      <path d="M12 5l-1-2M12 5l1-2M10 3h4" opacity="0.5" />
    </svg>
  ),
  layers: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill={c} opacity="0.1" />
      <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  ),
  aurora: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18c2-4 4-8 8-10s6 2 8-2" /><path d="M4 14c3-3 5-6 8-7s5 1 8-3" opacity="0.6" />
      <path d="M4 22c4-2 6-5 8-5s4 1 8-3" opacity="0.3" />
      <circle cx="18" cy="4" r="1.5" fill={c} opacity="0.4" /><circle cx="20" cy="6" r="0.8" fill={c} opacity="0.25" />
    </svg>
  ),
  mic: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0014 0" /><path d="M12 17v4M8 21h8" />
      <path d="M9 6h6" opacity="0.3" /><path d="M9 9h6" opacity="0.3" />
    </svg>
  ),
  flag: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={c} opacity="0.1" />
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22V2" />
    </svg>
  ),
  users: (c) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
};

/* Fallback icon for unknown badge types */
const fallbackIcon = (c: string) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill={c} opacity="0.1" />
    <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
  </svg>
);

function BadgeIcon({ name, earned }: { name: string; earned: boolean }) {
  const color = earned ? 'var(--accent)' : 'var(--text-dimmed)';
  const renderer = BADGE_ICONS[name] || fallbackIcon;
  return (
    <div
      className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${earned ? '' : 'grayscale opacity-50'}`}
      style={{ background: earned ? 'rgba(230,57,70,0.08)' : 'var(--bg-elevated)' }}
    >
      {renderer(color)}
    </div>
  );
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
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[var(--bg-elevated)] rounded w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-36 bg-[var(--bg-elevated)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Badges</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {badges.filter((b) => b.earned).length} of {badges.length} earned
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {badges.map((badge) => (
          <div
            key={badge.key}
            className={`relative rounded-xl p-4 text-center transition-all ${
              badge.earned
                ? 'border-2 shadow-sm'
                : 'border'
            }`}
            style={badge.earned
              ? { background: 'var(--bg-surface)', borderColor: 'rgba(230,57,70,0.35)', boxShadow: '0 2px 8px rgba(230,57,70,0.1)' }
              : { background: 'var(--bg-elevated)', borderColor: 'var(--border)' }
            }
          >
            {/* Lock overlay for unearned badges */}
            {!badge.earned && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(221,233,247,0.55)' }}>
                <svg className="w-5 h-5" fill="var(--text-dimmed)" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Icon */}
            <BadgeIcon name={badge.icon} earned={badge.earned} />

            {/* Title */}
            <p
              className={`text-[13px] font-bold mt-2.5 ${
                badge.earned ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {badge.title}
            </p>

            {/* Description */}
            <p className="text-[11px] mt-1 leading-tight text-[var(--text-muted)]">
              {badge.desc}
            </p>

            {/* Earned date */}
            {badge.earned && badge.earned_at && (
              <p className="text-[10px] text-[var(--accent)] font-semibold mt-2">
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
