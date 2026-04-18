import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CamoraLogo from '../../shared/CamoraLogo';

export type LumoraTab = 'interview' | 'coding' | 'design' | 'prepkit' | 'docs' | 'calendar';

interface LumoraIconRailProps {
  activeTab: LumoraTab;
  sessionsOpen: boolean;
  onToggleSessions: () => void;
}

/* ── Color tokens (standardized) ── */
const C = {
  base: '#000000',
  surface: '#111111',
  elevated: '#2D8CFF',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.75)',
  accent: '#2D8CFF',
  accentBg: 'rgba(45,140,255,0.15)',
  border: '#333333',
};

function UserAvatarMenu() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  if (!user) return null;

  const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="relative mb-2">
      <button onClick={() => setShowMenu(!showMenu)}
        className="w-10 h-10 rounded-full overflow-hidden mx-auto flex items-center justify-center transition-all hover:ring-2 hover:ring-white/20"
        title={`${user.name || 'User'}\n${user.email || ''}`}>
        {user.image ? (
          <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: C.accent, color: '#fff' }}>{initials}</div>
        )}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute left-full bottom-0 ml-2 w-52 rounded-xl z-50 overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold truncate" style={{ color: '#f8fafc', fontFamily: "'Satoshi', sans-serif" }}>{user.name || 'User'}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{user.email}</p>
            </div>
            <Link to="/pricing" onClick={() => setShowMenu(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.65)' }}>Pricing</Link>
            <Link to="/capra/prepare" onClick={() => setShowMenu(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.65)' }}>Dashboard</Link>
            <Link to="/analytics" onClick={() => setShowMenu(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.65)' }}>Analytics</Link>
            <button onClick={() => { logout(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">Sign Out</button>
          </div>
        </>
      )}
    </div>
  );
}

export function LumoraIconRail({ activeTab, sessionsOpen, onToggleSessions }: LumoraIconRailProps) {
  const [showMore, setShowMore] = useState(false);

  const navItems: { id: string; label: string; path?: string; onClick?: () => void; icon: React.ReactNode }[] = [
    { id: 'interview', label: 'Home', path: '/lumora',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { id: 'coding', label: 'Coding', path: '/lumora/coding',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
    { id: 'design', label: 'Design', path: '/lumora/design',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
    { id: 'prepkit', label: 'Prep Kit', path: '/lumora/prepkit',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { id: 'calendar', label: 'Calendar', path: '/lumora/calendar',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><rect x="8" y="14" width="3" height="3" rx="0.5" /></svg> },
  ];

  const moreItems: { label: string; path?: string; onClick?: () => void; icon: React.ReactNode }[] = [
    { label: 'Sessions', onClick: onToggleSessions, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: 'Prepare', path: '/capra/prepare', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { label: 'Practice', path: '/capra/practice', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg> },
    { label: 'Jobs', path: '/jobs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg> },
    { label: 'Handbook', path: '/handbook', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
    { label: 'Pricing', path: '/pricing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg> },
    { label: 'Analytics', path: '/analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6" /></svg> },
  ];

  return (
    <nav className="hidden md:flex flex-col items-center w-[80px] shrink-0 py-3 gap-1" style={{ background: '#000000', borderRight: '1px solid #333' }}>
      <Link to="/" className="flex items-center justify-center w-full h-12 mb-3" title="Camora">
        <CamoraLogo size={32} />
      </Link>

      {navItems.map((item) => {
        const isActive = (item.id === activeTab) || (item.id === 'sessions' && sessionsOpen);
        const isButton = !!item.onClick;
        const content = (
          <>
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: C.accent }} />}
            <span>{item.icon}</span>
            <span className="text-[10px] font-bold mt-0.5" style={{ fontFamily: "'Satoshi', sans-serif" }}>{item.label}</span>
          </>
        );
        const cls = "flex flex-col items-center justify-center w-[66px] h-[56px] rounded-xl transition-all group relative";
        const sty = isActive ? { background: C.accentBg, color: C.accent } : { color: C.muted };

        return isButton ? (
          <button key={item.id} onClick={item.onClick} className={cls} style={sty} title={item.label}>{content}</button>
        ) : (
          <Link key={item.id} to={item.path!} className={cls} style={sty} title={item.label}>{content}</Link>
        );
      })}

      <div className="relative">
        <button onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center justify-center w-[58px] h-[52px] rounded-xl transition-all group"
          style={showMore ? { background: C.accentBg, color: C.accent } : { color: C.muted }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
          <span className="text-[9px] font-semibold mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>More</span>
        </button>
        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <div className="absolute left-full top-0 ml-2 w-[200px] rounded-xl shadow-2xl z-50 p-3 grid grid-cols-3 gap-1" style={{ background: '#111111', border: '1px solid #333', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              {moreItems.map(mi => {
                const cls = "flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors";
                const sty = mi.label === 'Sessions' && sessionsOpen ? { color: C.accent, background: C.accentBg } : { color: C.muted };
                const hover = {
                  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.surface; },
                  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = sty.color; e.currentTarget.style.background = sty.background || 'transparent'; },
                };
                return mi.onClick ? (
                  <button key={mi.label} onClick={() => { mi.onClick!(); setShowMore(false); }} className={cls} style={sty} {...hover}>
                    {mi.icon}
                    <span className="text-[9px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>{mi.label}</span>
                  </button>
                ) : (
                  <Link key={mi.label} to={mi.path!} onClick={() => setShowMore(false)} className={cls} style={sty} {...hover}>
                    {mi.icon}
                    <span className="text-[9px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>{mi.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* User avatar + menu at bottom */}
      <UserAvatarMenu />
    </nav>
  );
}
