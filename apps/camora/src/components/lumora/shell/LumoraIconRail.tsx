import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveCompanyKey, ASSISTANT_UPDATED_EVENT } from '../../../lib/companyContext';
import { useTheme } from '@/hooks/useTheme';
import CamoraLogo from '../../shared/CamoraLogo';
import UserDropdown from '../../shared/UserDropdown';
import { dialogAlert } from '../../shared/Dialog';
import { AudioCheckModal } from './AudioCheckModal';

export type LumoraTab = 'session' | 'coding' | 'design' | 'cofix' | 'behavioral' | 'practice' | 'prepkit' | 'docs' | 'calendar' | 'sessions' | 'assistants' | 'profile' | 'credits';

interface LumoraIconRailProps {
  activeTab: LumoraTab;
  sessionsOpen: boolean;
  onToggleSessions: () => void;
  /** Meeting + coding platform selectors, relocated here from the top bar as
      their own "Tools" group below Practice. Collapsed rail shows just the
      icons; hover-expand reveals the selects. */
  meetingPlatform?: string;
  onMeetingPlatformChange?: (v: string) => void;
  codingPlatform?: string;
  onCodingPlatformChange?: (v: string) => void;
  /** Back navigation — the Back button now lives at the top of the rail,
      above Home (moved out of the shell header). */
  onBack?: () => void;
  /** Opens the interview-context drawer — the AMD-style company chip lives in
      the rail, below the Tools group. */
  onOpenContext?: () => void;
}

/* ── Sidebar items ── */
const MAIN_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/lumora', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { id: 'assistants', label: 'Assistants', path: '/lumora/assistants', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
  { id: 'sessions', label: 'Sessions', path: '/lumora/sessions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
  { id: 'documents', label: 'Documents', path: '/lumora/prepkit', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
  { id: 'practice', label: 'Practice', path: '/lumora/practice', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /></svg> },
];

const MORE_ITEMS = [
  { id: 'profile', label: 'Profile', path: '/lumora/profile' },
  { id: 'credits', label: 'Credits', path: '/lumora/credits' },
];

/* Interview tool switchers — compact icon-only quick-switch between the live
   surfaces (replaces the old header tab pills). Home is the Dashboard item. */
const TOOL_ITEMS = [
  { id: 'coding', label: 'Coding', path: '/lumora/coding', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
  { id: 'design', label: 'Design', path: '/lumora/design', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
  { id: 'behavioral', label: 'Behavioral', path: '/lumora/behavioral', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg> },
  { id: 'cofix', label: 'CoFix', path: '/lumora/fix', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" /></svg> },
];

export const LumoraIconRail = ({ activeTab, sessionsOpen: _sessionsOpen, onToggleSessions: _onToggleSessions, meetingPlatform, onMeetingPlatformChange, codingPlatform, onCodingPlatformChange, onBack, onOpenContext }: LumoraIconRailProps) => {
  const [accountOpen, setAccountOpen] = useState(false);
  // Active interview/company key drives the context chip label (below Tools).
  const [companyKey, setCompanyKey] = useState<string | null>(() => getActiveCompanyKey());
  useEffect(() => {
    const update = () => setCompanyKey(getActiveCompanyKey());
    window.addEventListener(ASSISTANT_UPDATED_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(ASSISTANT_UPDATED_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const isActive = (id: string) => {
    if (id === 'dashboard') return activeTab === 'session';
    if (id === 'assistants') return activeTab === 'assistants';
    if (id === 'sessions') return activeTab === 'sessions';
    if (id === 'documents') return activeTab === 'prepkit';
    if (id === 'practice') return activeTab === 'practice';
    return false;
  };

  // Active = solid gold-leaf fill with dark text (matches PillToggle).
  // Inactive = subtle capsule sitting on the charcoal rail — themed
  // borders/hover so the rail reads as neutral chrome with navy + gold
  // reserved for accents (matches the global Charcoal + Navy Accent rule).
  const itemStyle = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--cam-chip-active-text)' : 'var(--text-secondary)',
    background: active ? 'var(--cam-chip-active-bg)' : 'transparent',
    border: active ? '1px solid var(--cam-chip-active-bg)' : '1px solid transparent',
    borderRadius: 999,
    boxShadow: active
      ? '0 0 0 1px rgba(217,181,67,0.55), 0 4px 14px rgba(217,181,67,0.32), inset 0 1px 0 rgba(255,255,255,0.18)'
      : 'none',
    fontWeight: active ? 700 : 500,
    transition: 'background-color 200ms, color 200ms, box-shadow 200ms, transform 150ms',
  });

  const [expanded, setExpanded] = useState(false);
  const [audioCheckOpen, setAudioCheckOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // The Electron desktop build uses titleBarStyle: 'hiddenInset' on macOS,
  // which keeps the red/yellow/green traffic-light buttons at (14, 14) over
  // the page. That offset is now applied on the shared parent in
  // LumoraShellPage so the icon rail AND the right column shift together —
  // a per-rail spacer here would push the wordmark band 20px below the
  // right shell topbar.

  return (
    <nav
      className="hidden md:flex flex-col shrink-0 transition-all duration-200 relative"
      style={{
        width: expanded ? 200 : 60,
        // Charcoal chrome — navy is reserved for ACCENT strips only
        // (the wordmark band below + the gold-leaf right rail). The body
        // of the sidebar inherits the neutral surface so it doesn't read
        // as a lapis column next to the charcoal app shell.
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--cam-gold-leaf)',
        boxShadow: 'inset -8px 0 32px rgba(217,181,67,0.04), 4px 0 24px rgba(0,0,0,0.18)',
        paddingTop: 0,
        // No bottom padding — the right column's bottom audio bar sits flush
        // against the viewport, so leaving 12px of empty bg below the
        // UserDropdown band made the two columns end at different y values.
        paddingBottom: 0,
      }}
      onClick={(e) => {
        // Expand/collapse on click (no hover). Clicking a nav item
        // (link/button/select/input) keeps its own behavior and does not
        // toggle; clicking the rail background toggles the width.
        if ((e.target as HTMLElement).closest('a,button,select,input')) return;
        setExpanded(prev => !prev);
      }}
    >
      {/* Wordmark — sole navy strip on the rail, same chrome grammar as
          every other Camora header (cam-hero-strip + 2px gold-leaf bottom
          border). Height locked to h-12 to match the LumoraShell topbar
          immediately to the right so the two strips read as one continuous
          band of chrome instead of staggered boxes. */}
      <Link
        to="/"
        className={`h-11 flex items-center ${expanded ? 'gap-2.5 px-4' : 'justify-center px-1'} mb-4 shrink-0`}
        style={{
          background: 'var(--cam-hero-strip)',
          borderBottom: '1px solid var(--cam-gold-leaf)',
        }}
        title="Camora home"
      >
        <CamoraLogo size={expanded ? 22 : 20} />
        {expanded && <span className="text-sm font-bold whitespace-nowrap" style={{ fontFamily: "var(--font-sans)", color: 'var(--cam-strip-heading)' }}>Camora</span>}
      </Link>

      {/* Back — moved here from the shell header, placed ABOVE Home. Chevron
          icon collapsed; "Back" label when expanded. */}
      {onBack && (
        <div className="px-1.5 mb-2">
          <button
            type="button"
            onClick={onBack}
            title="Back"
            aria-label="Back"
            className={`flex items-center w-full ${expanded ? 'gap-3 px-3 justify-start' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] active:scale-[0.98] hover:bg-[var(--bg-elevated)]`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            {expanded && <span className="whitespace-nowrap">Back</span>}
          </button>
        </div>
      )}

      {/* Interview tool switchers — quick-switch between live surfaces
          (Coding / Design / Behavioral / CoFix), icon-only when collapsed. */}
      <div className="flex flex-col gap-0.5 px-1.5 mb-1">
        {TOOL_ITEMS.map(item => {
          const active = activeTab === item.id;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-1.5 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${active ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
              style={itemStyle(active)}
              title={expanded ? undefined : item.label}
            >
              {item.icon}
              {expanded && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Divider between tools and the rest of the nav */}
      <div className="mx-4 mb-2 h-px" style={{ background: 'var(--border)' }} />

      {/* Main nav */}
      <div className="flex flex-col gap-0.5 px-1.5">
        {MAIN_ITEMS.map(item => {
          const active = isActive(item.id);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${active ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
              style={itemStyle(active)}
              title={expanded ? undefined : item.label}
            >
              {item.icon}
              {expanded && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Tools group — meeting + coding platform selectors, their own set
          directly below Practice. Icons only when collapsed; hover-expand
          reveals the selects so the interview's meeting app + coding platform
          are always pickable from the rail. */}
      {(onMeetingPlatformChange || onCodingPlatformChange) && (
        <>
          <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
          <div className="px-1.5">
            {expanded && <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tools</p>}
            {onMeetingPlatformChange && (
              <div className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg`} style={{ color: 'var(--text-secondary)' }} title={expanded ? undefined : `Meeting: ${meetingPlatform}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 10l4.553-2.37A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
                {expanded && (
                  <select value={meetingPlatform} onChange={e => onMeetingPlatformChange(e.target.value)}
                    className="bg-transparent border-none outline-none cursor-pointer text-[13px] font-medium flex-1" style={{ color: 'inherit' }}
                    aria-label="Meeting platform">
                    <option value="zoom">Zoom</option>
                    <option value="teams">Teams</option>
                    <option value="meet">Google Meet</option>
                    <option value="other">Other</option>
                  </select>
                )}
              </div>
            )}
            {onCodingPlatformChange && (
              <div className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg`} style={{ color: 'var(--text-secondary)' }} title={expanded ? undefined : `Coding: ${codingPlatform}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                {expanded && (
                  <select value={codingPlatform} onChange={e => onCodingPlatformChange(e.target.value)}
                    className="bg-transparent border-none outline-none cursor-pointer text-[13px] font-medium flex-1" style={{ color: 'inherit' }}
                    aria-label="Coding platform">
                    <option value="auto">Auto-detect</option>
                    <option value="none">Disabled</option>
                    <option value="hackerrank">HackerRank</option>
                    <option value="leetcode">LeetCode</option>
                    <option value="coderpad">CoderPad</option>
                    <option value="codesignal">CodeSignal</option>
                    <option value="glider">Glider</option>
                  </select>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Interview-context chip — the AMD-style company chip, placed BELOW the
          Tools group. Briefcase icon collapsed; company name + gold highlight
          when a context is active. */}
      {onOpenContext && (
        <div className="px-1.5 mt-1">
          <button
            type="button"
            onClick={onOpenContext}
            title={companyKey ? `Interview: ${companyKey}` : 'Set interview context'}
            aria-label={companyKey ? `Interview: ${companyKey} — change` : 'Set interview context'}
            className={`flex items-center w-full ${expanded ? 'gap-2 px-3 justify-start' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-bold transition-[background-color,color,transform] active:scale-[0.98]`}
            style={companyKey
              ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)', border: '1px solid rgba(201,162,39,0.40)' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
            {expanded && <span className="truncate">{companyKey ?? '+ Context'}</span>}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />

      {/* More section */}
      <div className="px-1.5">
        {expanded && <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>More</p>}
        {/* Account dropdown */}
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className={`flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} w-full py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] hover:bg-[var(--bg-elevated)]`}
          style={{ color: 'var(--text-secondary)' }}
          title={expanded ? undefined : 'Account'}
        >
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            {expanded && 'Account'}
          </div>
          {expanded && <svg className={`w-3.5 h-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>}
        </button>
        {accountOpen && expanded && (
          <div className="ml-5 flex flex-col gap-0.5">
            {MORE_ITEMS.map(item => (
              <Link
                key={item.id}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-[background-color,color,transform] hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-muted)' }}
              >
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
          { label: 'Audio Check', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
            onClick: () => setAudioCheckOpen(true) },
{ label: theme === 'dark' ? 'Light mode' : 'Dark mode',
            icon: theme === 'dark'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>,
            onClick: toggleTheme },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium hover:bg-[var(--bg-elevated)] transition-[background-color,color,transform] text-left w-full`}
            style={{ color: 'var(--text-secondary)' }}
            title={expanded ? undefined : item.label}
          >
            {item.icon}
            {expanded && <span className="whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </div>

      {/* User — navy-strip + gold-leaf chrome, mirrors the wordmark band
          at the top of the rail so the column is bookended by two strips
          of the same grammar (cam-hero-strip + 2px gold-leaf border,
          h-12 fixed). UserDropdown forced to `dark` variant so the
          trigger glass-pill reads on the navy strip regardless of the
          page theme. */}
      <div
        className={`h-11 flex items-center shrink-0 ${expanded ? 'px-2' : 'justify-center px-1'}`}
        style={{
          background: 'var(--cam-hero-strip)',
          borderTop: '1px solid var(--cam-gold-leaf)',
        }}
      >
        <UserDropdown variant={theme === 'dark' ? 'dark' : 'light'} showName={expanded} compact={!expanded} position="above-left" />
      </div>

      <AudioCheckModal isOpen={audioCheckOpen} onClose={() => setAudioCheckOpen(false)} />
    </nav>
  );
}
