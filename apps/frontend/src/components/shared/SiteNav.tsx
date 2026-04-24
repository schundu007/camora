import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CamoraLogo from './CamoraLogo';
import UserDropdown from './UserDropdown';
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
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on Escape or when the route changes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const showTicker = new Date() < CHALLENGE_END;
  const navHeight = showTicker ? 56 + TICKER_HEIGHT : 56;

  const isLight = variant === 'light';
  // Solid surfaces (no blur) so SiteNav visually matches the app-shell TopBar
  const navBg = isLight ? '#FFFFFF' : '#0B1120';
  const borderClass = isLight ? 'border-b border-[var(--border)]' : 'border-b border-white/[0.08]';
  const textColor = isLight ? 'var(--text-primary)' : '#FFFFFF';
  const textMuted = isLight ? 'var(--text-secondary)' : 'rgba(255,255,255,0.75)';
  const activeBg = isLight ? 'var(--accent-subtle)' : 'rgba(41,181,232,0.18)';
  const activeColor = isLight ? 'var(--accent)' : '#FFFFFF';

  const nav = (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${borderClass}`} style={{ background: navBg, fontFamily: 'var(--font-sans)' }}>
      <div className="w-full lg:max-w-[70%] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <CamoraLogo size={32} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="px-3 py-1.5 text-[13px] rounded-lg transition-colors"
              style={{
                color: isActive(link.href) ? activeColor : textMuted,
                fontWeight: isActive(link.href) ? 700 : 600,
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
            <UserDropdown variant={isLight ? 'light' : 'dark'} />
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
        <>
          {/* Tap-outside backdrop — sits below the menu, covers the rest of the viewport */}
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="md:hidden fixed inset-0 z-40 cursor-default" style={{ background: 'rgba(0,0,0,0.25)', top: 56 }} />
        <div className="md:hidden relative z-50 px-6 py-3 space-y-1" style={{ background: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}` }} role="menu">
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
        </>
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
