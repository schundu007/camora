import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS, CHALLENGE_END } from '../../lib/constants';
const TICKER_HEIGHT = 36;
const TICKER_ITEMS = [
  { text: 'The Camora Challenge', highlight: '$21,812 in prizes', color: '#22D3EE' },
  { text: 'Find bugs, build features', highlight: 'join the founding team', color: '#67E8F9' },
  { text: '5 Founding Engineer', highlight: '+ 10 Core Engineer positions', color: '#22D3EE' },
  { text: 'Bug Bounty:', highlight: 'Critical = 10 pts, Security = 8 pts', color: '#67E8F9' },
  { text: 'Open to all developers worldwide', highlight: 'remote-first', color: '#22D3EE' },
];

export default function SiteNav({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const showTicker = new Date() < CHALLENGE_END;
  const navHeight = showTicker ? 56 + TICKER_HEIGHT : 56;

  const isLight = variant === 'light';
  const navBg = isLight
    ? 'rgba(232,241,252,0.88)'
    : 'rgba(11,17,32,0.92)';
  const borderClass = isLight ? 'border-b border-[#C4D9F2]' : 'border-b border-white/[0.12]';
  const textColor = isLight ? '#0F172A' : '#FFFFFF';
  const textMuted = isLight ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)';
  const hoverBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)';
  const activeBg = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.10)';

  const nav = (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${borderClass}`} style={{ background: navBg, fontFamily: "var(--font-sans)" }}>
      <div className="w-full lg:max-w-[70%] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <CamoraLogo size={36} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="px-3 py-1.5 text-[13px] rounded-lg transition-all"
              style={{
                color: isActive(link.href) ? textColor : textMuted,
                fontWeight: isActive(link.href) ? 800 : 700,
                background: isActive(link.href) ? activeBg : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors" style={{ color: textColor }} onMouseEnter={e => e.currentTarget.style.background = hoverBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {user?.image ? (
                  <img src={user.image} alt="" className="w-6 h-6 rounded-full" style={{ boxShadow: `0 0 0 1px ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)'}` }} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold" style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)', color: textColor }}>{user?.name?.[0] || '?'}</div>
                )}
                <span className="text-[13px] font-bold" style={{ color: textColor }}>{user?.name?.split(' ')[0] || 'Account'}</span>
                <svg className={`w-3 h-3 transition-transform ${userMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {/* Dropdown */}
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50" style={{ background: isLight ? '#FFFFFF' : '#1E293B', border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    <div className="px-3 py-2.5 border-b" style={{ borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}>
                      <p className="text-xs font-bold truncate" style={{ color: textColor }}>{user?.name || 'User'}</p>
                      <p className="text-[10px] truncate" style={{ color: textMuted }}>{user?.email}</p>
                    </div>
                    {[
                      { label: 'Dashboard', href: '/capra/prepare', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                      { label: 'Profile', href: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                      { label: 'Onboarding', href: '/capra/onboarding', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                      { label: 'Refer a Friend', href: '/profile?tab=referrals', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
                    ].map(item => (
                      <Link key={item.label} to={item.href} onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors" style={{ color: textColor }} onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: textMuted }}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t" style={{ borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}>
                      <button onClick={() => { logout(); setUserMenu(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-red-500 transition-colors" onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-[13px] font-bold transition-colors" style={{ color: textColor }}>Sign in</Link>
          )}
        </div>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-3 -mr-2 transition-colors" style={{ color: textColor }} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 py-3 space-y-1" style={{ background: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', zIndex: 50, borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}` }} role="menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-bold"
              style={{ color: isActive(link.href) ? textColor : textMuted }}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2" style={{ borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}` }}>
            {isAuthenticated ? (
              <>
                <Link to="/capra/prepare" onClick={() => setOpen(false)} className="block py-2 text-sm font-bold" style={{ color: textColor }}>Dashboard</Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="block py-2 text-sm font-bold" style={{ color: textColor }}>Profile</Link>
                <Link to="/capra/onboarding" onClick={() => setOpen(false)} className="block py-2 text-sm font-bold" style={{ color: textColor }}>Onboarding</Link>
                <Link to="/profile?tab=referrals" onClick={() => setOpen(false)} className="block py-2 text-sm font-bold" style={{ color: textColor }}>Refer a Friend</Link>
                <button onClick={() => { logout(); setOpen(false); }} className="block py-2 text-sm text-red-500 font-bold">Sign out</button>
              </>
            ) : (
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} onClick={() => setOpen(false)} className="block py-2 text-sm font-bold" style={{ color: textColor }}>Sign in</Link>
            )}
          </div>
        </div>
      )}
      {/* Challenge Campaign Ticker */}
      {new Date() < CHALLENGE_END && (
        <Link to="/challenge" className="block overflow-hidden" style={{
          background: isLight
            ? 'linear-gradient(90deg, rgba(34,211,238,0.06) 0%, rgba(103,232,249,0.06) 50%, rgba(34,211,238,0.06) 100%)'
            : 'linear-gradient(90deg, #22D3EE, #67E8F9, #22D3EE, #67E8F9)',
          height: TICKER_HEIGHT,
          borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.15)'}`,
          borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.15)'}`,
        }}>
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 overflow-hidden h-full">
            <div className="challenge-ticker flex items-center h-full whitespace-nowrap">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center px-6 text-[11px] font-bold tracking-wide" style={{ color: isLight ? '#334155' : '#FFFFFF' }}>
                  {item.text}{' '}
                  <span className="ml-1" style={{ color: isLight ? item.color : '#FFFFFF' }}>{item.highlight}</span>
                  <span className="mx-5 w-1.5 h-1.5 rounded-full" style={{ background: isLight ? item.color : 'rgba(255,255,255,0.4)' }} />
                </span>
              ))}
            </div>
          </div>
          <style>{`
            .challenge-ticker { animation: ticker-scroll 28s linear infinite; }
            .challenge-ticker:hover { animation-play-state: paused; }
            @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          `}</style>
        </Link>
      )}
    </nav>
  );

  // Set CSS variable for nav height so sticky elements can reference it
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--nav-h', `${navHeight}px`);
  }

  return (
    <>
      {nav}
      {/* Spacer to push page content below the fixed nav + ticker */}
      <div style={{ height: navHeight }} />
    </>
  );
}
