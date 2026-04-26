import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/capra/prepare', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Profile', href: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Onboarding', href: '/capra/onboarding', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { label: 'Achievements', href: '/profile?tab=achievements', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { label: 'Refer a Friend', href: '/profile?tab=referrals', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
];

interface UserDropdownProps {
  /** 'light' = white dropdown on light bg, 'dark' = white dropdown on dark bg (just affects trigger text) */
  variant?: 'light' | 'dark';
  /** Show name next to avatar */
  showName?: boolean;
  /** Compact mode (icon-only trigger, no name) */
  compact?: boolean;
  /** Where the dropdown opens relative to trigger */
  position?: 'below-right' | 'below-left' | 'above-left' | 'above-right' | 'right-bottom';
}

export default function UserDropdown({ variant = 'light', showName = true, compact = false, position = 'below-right' }: UserDropdownProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isDark = variant === 'dark';
  // Hardcode high-contrast values so the username/email read clearly on
  // any surface — bypassing data-theme cascade that was occasionally
  // flipping --text-primary to a light value on the white nav.
  const textColor = isDark ? '#FFFFFF' : '#020617';
  const mutedColor = isDark ? 'rgba(255,255,255,0.7)' : '#475569';
  const hoverBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(2,6,23,0.06)';

  const positionStyles: Record<string, string> = {
    'below-right': 'right-0 top-full mt-2',
    'below-left': 'left-0 top-full mt-2',
    'above-left': 'left-0 bottom-full mb-2',
    'above-right': 'right-0 bottom-full mb-2',
    'right-bottom': 'left-full bottom-0 ml-2',
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg transition-colors px-1.5 py-1"
        style={{ color: textColor }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {user.image ? (
          <img src={user.image} alt="" className={`${compact ? 'w-8 h-8' : 'w-7 h-7'} rounded-full object-cover`} style={{ boxShadow: `0 0 0 1px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` }} referrerPolicy="no-referrer" />
        ) : (
          <div className={`${compact ? 'w-8 h-8' : 'w-7 h-7'} rounded-full flex items-center justify-center text-[11px] font-bold`} style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'var(--accent)', color: isDark ? '#fff' : '#fff' }}>
            {initials}
          </div>
        )}
        {showName && !compact && (
          <span className="text-sm font-bold truncate max-w-[140px] hidden md:inline" style={{ color: textColor }}>
            {user.name?.split(' ')[0] || 'Account'}
          </span>
        )}
        {!compact && (
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ color: mutedColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" aria-label="Account menu" className={`absolute ${positionStyles[position]} w-52 rounded-xl overflow-hidden z-50`} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            {/* User info header */}
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-bold truncate" style={{ color: '#0F172A' }}>{user.name || 'User'}</p>
              <p className="text-[10px] truncate" style={{ color: '#64748B' }}>{user.email}</p>
            </div>

            {/* Menu items */}
            {MENU_ITEMS.map(item => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--text-dimmed)" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            ))}

            {/* Sign out */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
