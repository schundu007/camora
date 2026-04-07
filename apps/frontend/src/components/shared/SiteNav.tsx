import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CamoraLogo from './CamoraLogo';

const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Challenge', href: '/challenge' },
];

const CHALLENGE_END = new Date('2026-10-07T23:59:59Z');
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)' }}>
      <div className="w-full lg:max-w-[70%] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <CamoraLogo size={36} />
          <span className="text-sm font-bold tracking-tight text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`px-3 py-1.5 text-[13px] transition-colors ${
                isActive(link.href) ? 'text-emerald-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
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
              <Link to="/capra/prepare" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/40 transition-colors">
                {user?.image ? (
                  <img src={user.image} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{user?.name?.[0] || '?'}</div>
                )}
                <span className="text-[13px] text-gray-700 font-medium">{user?.name?.split(' ')[0] || 'Dashboard'}</span>
              </Link>
              <button onClick={logout} className="text-[13px] text-gray-400 hover:text-red-500 transition-colors font-medium">Sign out</button>
            </>
          ) : (
            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Sign in</Link>
          )}
        </div>

        {/* Mobile burger — 44px touch target */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-3 -mr-2 text-gray-600 hover:text-gray-900" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/30 px-6 py-3 space-y-1" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', zIndex: 50 }} role="menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setOpen(false)}
              className={`block py-2 text-sm font-medium ${isActive(link.href) ? 'text-emerald-600' : 'text-gray-600'}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100">
            {isAuthenticated ? (
              <>
                <Link to="/capra/prepare" onClick={() => setOpen(false)} className="block py-2 text-sm text-gray-600 font-medium">Dashboard</Link>
                <button onClick={() => { logout(); setOpen(false); }} className="block py-2 text-sm text-red-500 font-medium">Sign out</button>
              </>
            ) : (
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} onClick={() => setOpen(false)} className="block py-2 text-sm text-emerald-600 font-medium">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Challenge Campaign Ticker (renders below nav on every page) ── */
const TICKER_HEIGHT = 26;

export function ChallengeTicker() {
  const location = useLocation();
  const show = new Date() < CHALLENGE_END && location.pathname !== '/challenge';
  if (!show) return null;

  return (
    <Link
      to="/challenge"
      className="fixed left-0 right-0 z-40 block overflow-hidden cursor-pointer"
      style={{ top: 56, height: TICKER_HEIGHT, background: 'linear-gradient(90deg, #10b981, #6366f1, #0ea5e9, #f59e0b)' }}
    >
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
  );
}
