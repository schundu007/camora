import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS, CHALLENGE_END } from '../../lib/constants';
const TICKER_HEIGHT = 26;
const TICKER_ITEMS = [
  'The Camora Challenge — $21,812 in prizes',
  'Find bugs, build features, join the founding team',
  '5 Founding Engineer + 10 Core Engineer positions',
  'Bug Bounty: Critical bugs = 10 pts, Security = 8 pts',
  'Open to all developers worldwide — remote-first',
];

export default function SiteNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const showTicker = new Date() < CHALLENGE_END;
  const navHeight = showTicker ? 56 + TICKER_HEIGHT : 56;

  const nav = (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(10,10,15,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-full lg:max-w-[70%] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <CamoraLogo size={36} />
          <span className="text-sm font-bold tracking-tight text-white" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                isActive(link.href) ? 'text-white font-bold bg-white/10' : 'text-white/50 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/capra/prepare" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                {user?.image ? (
                  <img src={user.image} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">{user?.name?.[0] || '?'}</div>
                )}
                <span className="text-[13px] text-white/70 font-medium">{user?.name?.split(' ')[0] || 'Dashboard'}</span>
              </Link>
              <button onClick={logout} className="text-[13px] text-white/30 hover:text-red-400 transition-colors font-medium">Sign out</button>
            </>
          ) : (
            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Sign in</Link>
          )}
        </div>

        {/* Mobile burger — 44px touch target */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-3 -mr-2 text-white/60 hover:text-white" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 px-6 py-3 space-y-1" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', zIndex: 50 }} role="menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setOpen(false)}
              className={`block py-2 text-sm font-medium ${isActive(link.href) ? 'text-emerald-400' : 'text-white/60'}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10">
            {isAuthenticated ? (
              <>
                <Link to="/capra/prepare" onClick={() => setOpen(false)} className="block py-2 text-sm text-white/60 font-medium">Dashboard</Link>
                <button onClick={() => { logout(); setOpen(false); }} className="block py-2 text-sm text-red-400 font-medium">Sign out</button>
              </>
            ) : (
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} onClick={() => setOpen(false)} className="block py-2 text-sm text-emerald-400 font-medium">Sign in</Link>
            )}
          </div>
        </div>
      )}
      {/* Challenge Campaign Ticker — all pages including /challenge */}
      {new Date() < CHALLENGE_END && (
        <Link to="/challenge" className="block overflow-hidden" style={{ background: 'linear-gradient(90deg, #10b981, #6366f1, #0ea5e9, #f59e0b)', height: TICKER_HEIGHT }}>
          <div className="challenge-ticker flex items-center h-full whitespace-nowrap">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center px-6 text-[10px] font-bold text-white tracking-wide">
                {item}
                <span className="mx-5 w-1 h-1 rounded-full bg-white/40" />
              </span>
            ))}
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
