import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import CamoraLogo from '../../shared/CamoraLogo';
import UserDropdown from '../../shared/UserDropdown';
import { dialogAlert } from '../../shared/Dialog';
import { AudioCheckModal } from './AudioCheckModal';

export type LumoraTab = 'interview' | 'coding' | 'design' | 'behavioral' | 'prepkit' | 'docs' | 'calendar' | 'sessions' | 'assistants' | 'profile' | 'credits' | 'pricing';

interface LumoraIconRailProps {
  activeTab: LumoraTab;
  sessionsOpen: boolean;
  onToggleSessions: () => void;
}

/* ── Sidebar items ── */
const MAIN_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/lumora', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { id: 'assistants', label: 'Assistants', path: '/lumora/assistants', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
  { id: 'sessions', label: 'Sessions', path: '/lumora/sessions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
  { id: 'documents', label: 'Documents', path: '/lumora/prepkit', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
];

const MORE_ITEMS = [
  { id: 'profile', label: 'Profile', path: '/lumora/profile' },
  { id: 'credits', label: 'Credits', path: '/lumora/credits' },
  { id: 'pricing', label: 'Pricing', path: '/lumora/pricing' },
];

const BOTTOM_ITEMS = [
  { id: 'audio-check', label: 'Audio Check', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg> },
  { id: 'help', label: 'Help', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
];

export function LumoraIconRail({ activeTab, sessionsOpen, onToggleSessions }: LumoraIconRailProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();

  const isActive = (id: string) => {
    if (id === 'dashboard') return activeTab === 'interview';
    if (id === 'assistants') return activeTab === 'assistants';
    if (id === 'sessions') return activeTab === 'sessions';
    if (id === 'documents') return activeTab === 'prepkit';
    return false;
  };

  const itemStyle = (active: boolean) => ({
    color: active ? 'var(--cam-primary-dk)' : 'rgba(255,255,255,0.85)',
    background: active ? 'var(--cam-gold-leaf)' : 'transparent',
  });

  const [expanded, setExpanded] = useState(false);
  const [audioCheckOpen, setAudioCheckOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // The Electron desktop build uses titleBarStyle: 'hiddenInset' on macOS,
  // which keeps the red/yellow/green traffic-light buttons at (14, 14) over
  // the page. The icon rail's logo otherwise lives in that exact spot.
  // Reserve ~28px of top padding when running inside Electron on macOS so
  // the wordmark sits below the controls.
  const camo = typeof window !== 'undefined' ? (window as any).camo : undefined;
  const needsMacChromeOffset = !!camo?.isDesktop && camo?.platform === 'darwin';

  return (
    <nav
      className="hidden md:flex flex-col shrink-0 transition-all duration-200"
      style={{
        width: expanded ? 200 : 60,
        background: 'linear-gradient(180deg, var(--cam-primary-dk) 0%, var(--cam-primary) 50%, var(--cam-primary-dk) 100%)',
        borderRight: '2px solid var(--cam-gold-leaf)',
        paddingTop: needsMacChromeOffset ? 32 : 12,
        paddingBottom: 12,
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onTouchStart={() => setExpanded(prev => !prev)}
    >
      {/* Logo — points to landing page (per consistent app-wide rule).
          Camora landing is the canonical "home" target for the wordmark. */}
      <Link to="/" className={`flex items-center ${expanded ? 'gap-2.5 px-4' : 'justify-center px-1'} mb-5`} title="Camora home">
        <CamoraLogo size={expanded ? 28 : 24} />
        {expanded && <span className="text-sm font-bold whitespace-nowrap text-white" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Camora</span>}
      </Link>

      {/* Main nav */}
      <div className="flex flex-col gap-0.5 px-1.5">
        {MAIN_ITEMS.map(item => {
          const active = isActive(item.id);
          return (
            <Link key={item.id} to={item.path} className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-all`} style={itemStyle(active)} title={expanded ? undefined : item.label}>
              {item.icon}
              {expanded && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ background: 'rgba(255,255,255,0.18)' }} />

      {/* More section */}
      <div className="px-1.5">
        {expanded && <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>More</p>}
        {/* Account dropdown */}
        <button onClick={() => setAccountOpen(!accountOpen)} className={`flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} w-full py-2 rounded-lg text-[13px] font-medium transition-all hover:bg-white/10`} style={{ color: 'rgba(255,255,255,0.85)' }} title={expanded ? undefined : 'Account'}>
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            {expanded && 'Account'}
          </div>
          {expanded && <svg className={`w-3.5 h-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>}
        </button>
        {accountOpen && expanded && (
          <div className="ml-5 flex flex-col gap-0.5">
            {MORE_ITEMS.map(item => (
              <Link key={item.id} to={item.path} className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col gap-0.5 px-2">
        {[
          { label: 'Go Invisible', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
            onClick: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true })) },
          { label: 'Audio Check', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
            onClick: () => setAudioCheckOpen(true) },
          { label: 'Help', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
            onClick: () => dialogAlert({ title: 'Keyboard shortcuts', message: '⌘K — focus search\n⌘M — toggle mic\n⌘B — go invisible (hide overlay)\n⌘S — search' }) },
          { label: theme === 'dark' ? 'Light mode' : 'Dark mode',
            icon: theme === 'dark'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>,
            onClick: toggleTheme },
        ].map(item => (
          <button key={item.label} onClick={item.onClick} className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium hover:bg-white/10 transition-all text-left w-full`} style={{ color: 'rgba(255,255,255,0.85)' }} title={expanded ? undefined : item.label}>
            {item.icon}
            {expanded && <span className="whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </div>

      {/* User */}
      <div className="px-1.5 pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
        <UserDropdown variant={theme === 'dark' ? 'dark' : 'light'} showName={expanded} compact={!expanded} position="above-left" />
      </div>

      {/* Audio check modal */}
      <AudioCheckModal isOpen={audioCheckOpen} onClose={() => setAudioCheckOpen(false)} />
    </nav>
  );
}
