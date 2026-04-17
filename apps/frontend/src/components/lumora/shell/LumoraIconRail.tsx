import { useState } from 'react';
import { Link } from 'react-router-dom';
import CamoraLogo from '../../shared/CamoraLogo';

export type LumoraTab = 'interview' | 'coding' | 'design' | 'prepkit' | 'docs' | 'calendar';

interface LumoraIconRailProps {
  activeTab: LumoraTab;
  sessionsOpen: boolean;
  onToggleSessions: () => void;
}

/* ── Color tokens (standardized) ── */
const C = {
  base: '#0D0C14',
  surface: '#16141F',
  elevated: '#1E1C28',
  text: '#F2F1F3',
  muted: '#6C6B7B',
  accent: '#818cf8',
  accentBg: 'rgba(99,102,241,0.12)',
  border: 'rgba(255,255,255,0.06)',
};

export function LumoraIconRail({ activeTab, sessionsOpen, onToggleSessions }: LumoraIconRailProps) {
  const [showMore, setShowMore] = useState(false);

  const navItems: { id: string; label: string; path?: string; onClick?: () => void; icon: React.ReactNode }[] = [
    { id: 'interview', label: 'Home', path: '/lumora',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { id: 'coding', label: 'Coding', path: '/lumora/coding',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
    { id: 'design', label: 'Design', path: '/lumora/design',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
    { id: 'prepkit', label: 'Prep Kit', path: '/lumora/prepkit',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { id: 'calendar', label: 'Calendar', path: '/lumora/calendar',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><rect x="8" y="14" width="3" height="3" rx="0.5" /></svg> },
  ];

  const moreItems = [
    { label: 'Prepare', path: '/capra/prepare', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { label: 'Practice', path: '/capra/practice', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg> },
    { label: 'Jobs', path: '/jobs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg> },
    { label: 'Handbook', path: '/handbook', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
    { label: 'Pricing', path: '/pricing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg> },
    { label: 'Analytics', path: '/analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6" /></svg> },
  ];

  return (
    <nav className="hidden md:flex flex-col items-center w-[68px] shrink-0 py-3 gap-0.5" style={{ background: C.base, borderRight: `1px solid ${C.border}` }}>
      <Link to="/" className="flex items-center justify-center w-full h-10 mb-3" title="Camora">
        <CamoraLogo size={26} />
      </Link>

      {navItems.map((item) => {
        const isActive = (item.id === activeTab) || (item.id === 'sessions' && sessionsOpen);
        const isButton = !!item.onClick;
        const content = (
          <>
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: C.accent }} />}
            <span>{item.icon}</span>
            <span className="text-[9px] font-semibold mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>{item.label}</span>
          </>
        );
        const cls = "flex flex-col items-center justify-center w-[58px] h-[52px] rounded-xl transition-all group relative";
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
          <span className="text-[9px] font-semibold mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>More</span>
        </button>
        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <div className="absolute left-full top-0 ml-2 w-[200px] rounded-xl shadow-2xl z-50 p-3 grid grid-cols-3 gap-1" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
              {moreItems.map(mi => (
                <Link key={mi.label} to={mi.path} onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors"
                  style={{ color: C.muted }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.surface; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}>
                  {mi.icon}
                  <span className="text-[9px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>{mi.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />
    </nav>
  );
}
