import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import CamoraLogo from './CamoraLogo';
import UserDropdown from './UserDropdown';
import { HourMeterChip } from './ui/HourMeterChip';
import { NAV_LINKS, CHALLENGE_END } from '../../lib/constants';
const TICKER_HEIGHT = 28;
const TICKER_ITEMS = [
  { text: 'The Camora Challenge', highlight: '$21,812 in prizes', color: 'var(--cam-primary)' },
  { text: 'Find bugs, build features', highlight: 'join the founding team', color: 'var(--cam-primary-lt)' },
  { text: '5 Founding Engineer', highlight: '+ 10 Core Engineer positions', color: 'var(--cam-primary)' },
  { text: 'Bug Bounty:', highlight: 'Critical = 10 pts, Security = 8 pts', color: 'var(--cam-primary-lt)' },
  { text: 'Open to all developers worldwide', highlight: 'remote-first', color: 'var(--cam-primary)' },
];

export default function SiteNav({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const { isAuthenticated, logout, onboardingCompleted } = useAuth();
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
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

  // Honor the user's global theme choice instead of the static `variant` prop —
  // header chrome must match the body theme so the page reads as one surface.
  // The `variant` prop is preserved for back-compat but no longer drives colors.
  void variant;
  const isLight = theme === 'light';
  // LeetCode-style chrome: neutral charcoal that sits dark on every page
  // background (light mode whites, dark mode navies). Navy is reserved for
  // accents per project memory ("Charcoal + Navy Accent"). Gold-leaf is
  // demoted from a heavy 3px underline to a thin 1px brand line so the
  // chrome reads as enterprise-grade rather than marketing-banner.
  const navBg = '#1A1D24';
  const navShadow = '0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.28)';
  const borderClass = '';
  const textColor = '#FFFFFF';
  const textMuted = 'rgba(255,255,255,0.78)';
  const activeBg = 'var(--cam-gold-leaf)';
  const activeColor = '#020617';

  const nav = (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 ${borderClass}`}
      style={{
        background: navBg,
        boxShadow: navShadow,
        borderBottom: '1px solid rgba(201,162,39,0.35)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="w-full lg:max-w-[70%] mx-auto flex items-center px-4 sm:px-6 h-14">
        {/* Logo — always visible on every breakpoint so users can return
            to the landing page from any Camora screen. */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="Camora — home">
          <CamoraLogo size={32} />
        </Link>

        {/* Desktop links — sit immediately after the logo (no big gap) */}
        <div className="hidden md:flex items-center gap-1 ml-6 lg:ml-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="px-3.5 py-1.5 text-sm rounded-full transition-colors"
              style={{
                color: isActive(link.href) ? activeColor : textMuted,
                fontWeight: 700,
                background: isActive(link.href) ? activeBg : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth + theme toggle — ml-auto pushes this group to the right */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 transition-all hover:bg-white/15"
            style={{
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
            }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </button>
          {isAuthenticated && <HourMeterChip variant="dark" />}
          {isAuthenticated ? (
            <UserDropdown variant="dark" />
          ) : (
            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-[13px] font-bold transition-colors" style={{ color: textColor }}>Sign in</Link>
          )}
        </div>

        {/* Mobile burger — pinned to the right end of the nav so the
            position matches across SiteNav, TopBar, and the Lumora
            shell. ml-auto pushes it past the (hidden) desktop links. */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="md:hidden flex items-center justify-center w-10 h-10 -mr-2 ml-auto rounded-md transition-colors"
          style={{ color: textColor }}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 4h14M2 9h14M2 14h14" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown — drops down directly under the nav from the
          hamburger on the right. Tap-outside backdrop dismisses. */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 z-40 cursor-default"
            style={{ background: 'rgba(0,0,0,0.35)', top: navHeight }}
          />
          <div
            className="md:hidden absolute right-0 z-50 w-[260px] max-w-[90vw]"
            style={{
              top: navHeight,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderBottomLeftRadius: 12,
              boxShadow: '0 12px 28px rgba(0,0,0,0.20)',
            }}
            role="menu"
            aria-label="Site menu"
          >
            <div className="px-4 py-3 space-y-0.5 max-h-[70vh] overflow-y-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-[14px] font-semibold"
                  style={{ color: isActive(link.href) ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                {isAuthenticated ? (
                  <>
                    <Link to="/account/team" onClick={() => setOpen(false)} className="flex items-center justify-between py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <span>AI hours</span>
                      <span><HourMeterChip variant="light" /></span>
                    </Link>
                    <Link to="/capra/prepare" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</Link>
                    <Link to="/profile" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</Link>
                    {onboardingCompleted === false && (
                      <Link to="/capra/onboarding" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Onboarding</Link>
                    )}
                    <Link to="/profile?tab=referrals" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Refer a Friend</Link>
                    <button type="button" onClick={() => { toggleTheme(); setOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button type="button" onClick={() => { logout(); setOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold" style={{ color: 'var(--danger)' }}>Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign in</Link>
                    <button type="button" onClick={() => { toggleTheme(); setOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Challenge Campaign Ticker — gold band so the scrolling text
          jumps out below the dark navy nav (was a near-invisible navy
          gradient that blurred into the chrome above). */}
      {new Date() < CHALLENGE_END && (
        <Link to="/challenge" className="block overflow-hidden" style={{
          background: 'linear-gradient(90deg, var(--cam-gold-leaf-dk) 0%, var(--cam-gold-leaf) 50%, var(--cam-gold-leaf-dk) 100%)',
          height: TICKER_HEIGHT,
          borderTop: '1px solid rgba(0,0,0,0.18)',
          borderBottom: '1px solid rgba(0,0,0,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
        }}>
          <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 overflow-hidden h-full">
            <div className="challenge-ticker flex items-center h-full whitespace-nowrap">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center px-6 text-[11px] font-bold tracking-wide" style={{ color: '#020617' }}>
                  {item.text}{' '}
                  <span className="ml-1 font-extrabold" style={{ color: '#020617' }}>{item.highlight}</span>
                  <span className="mx-5 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(2,6,23,0.55)' }} />
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
