import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ASK_SURFACES, ASK_GROUP } from '../shared/askSurfaces';
import { getActiveCompanyKey, ASSISTANT_UPDATED_EVENT } from '../../../lib/companyContext';
import { useTheme } from '@/hooks/useTheme';
import CamoraLogo from '../../shared/CamoraLogo';
import UserDropdown from '../../shared/UserDropdown';
import { requestAudioSetup } from '@/lib/audio-preferences';
import { useStealth, useSyncStealthOnLaunch } from '../../../lib/stealth';

export type LumoraTab = 'session' | 'coding' | 'design' | 'cofix' | 'behavioral' | 'claude' | 'gemini' | 'ask' | 'practice' | 'prepkit' | 'docs' | 'calendar' | 'sessions' | 'assistants' | 'profile' | 'credits';

interface LumoraIconRailProps {
  activeTab: LumoraTab;
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


/* Home. */
const MAIN_ITEMS = [
  { id: 'dashboard', label: 'Home', path: '/lumora', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
];

const LIBRARY_ITEMS = [
  { id: 'sessions', label: 'Sessions', path: '/lumora/sessions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
];

const PREP_ITEMS = [
  { id: 'documents', label: 'Prep Kit', path: '/lumora/prepkit', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
];

/* The tools that are genuinely their own thing — an editor, a canvas, a
   diff — and keep their own chip. */
const TOOL_ITEMS = [
  { id: 'coding', label: 'Coding', path: '/lumora/coding', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
  { id: 'design', label: 'Design', path: '/lumora/design', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
  { id: 'cofix', label: 'CoFix', path: '/lumora/fix', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" /></svg> },
];

export const LumoraIconRail = ({ activeTab, meetingPlatform, onMeetingPlatformChange, codingPlatform, onCodingPlatformChange, onBack, onOpenContext }: LumoraIconRailProps) => {
  // The rail is identical on every tab. It used to trim itself on behavioral
  // to keep the eye still during a call, which is a real concern — but chips
  // vanishing with no way to get them back reads as breakage, and having to
  // relearn the rail per tab costs more attention than the extra icons it
  // saved. Same rail everywhere, so muscle memory holds.


  // One chip for the four Q&A surfaces. It navigates to whichever you were last
  // on; switching BETWEEN them happens on the strip above the composer, where
  // you are already looking. The rail tried to own that and got it wrong twice
  // — four near-identical chips, then a group that auto-opened into five rows.
  const askActive = ASK_SURFACES.some(i => i.id === activeTab);
  // Where the chip GOES is still the surface you were last on; what it SAYS is
  // the group. Borrowing the active surface's label meant that with nothing
  // active it fell through to the first one and called itself "Behavioral"
  // while standing for all three.
  const askCurrent = ASK_SURFACES.find(i => i.id === activeTab) ?? ASK_SURFACES[0];
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

  // Active = accent-tinted capsule with an accent border and accent icon.
  //
  // It used to fill with --lum-accent-bg, which in the dark theme is #001129
  // sitting on a --lum-surface rail of #161d26: two near-black navies about
  // one step apart. The selected tab was, in practice, not marked at all —
  // you clicked Ask Sona and nothing on the rail changed, which is the whole
  // "chips are not highlighted when clicked" report. The icon did shift to
  // --lum-accent-sm, but that is a hairline colour change on an 18px stroke
  // glyph and reads as nothing.
  //
  // A tint plus a border carries at a glance and matches the interview
  // toolbar's on-state (.lum-tool-chip.is-on), so selection looks the same
  // wherever it appears in the shell.
  const itemStyle = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--lum-accent)' : 'var(--lum-text-2)',
    background: active
      ? 'color-mix(in oklab, var(--lum-accent) 18%, transparent)'
      : 'transparent',
    border: `1px solid ${active ? 'color-mix(in oklab, var(--lum-accent) 55%, transparent)' : 'transparent'}`,
    borderRadius: 'var(--lum-radius)',
    boxShadow: 'none',
    fontWeight: active ? 700 : 500,
    transition: 'background-color 200ms, color 200ms, border-color 200ms, transform 150ms',
  });

  const [expanded, setExpanded] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  // Global stealth (screen-share invisibility) — reachable from EVERY Lumora tab,
  // not just the coding/design strip. Reconcile the persisted choice with the
  // desktop window's actual content protection once on mount.
  const { isStealthActive, available: stealthAvailable, toggleStealth } = useStealth();
  useSyncStealthOnLaunch();

  // The Electron desktop build uses titleBarStyle: 'hiddenInset' on macOS,
  // which keeps the red/yellow/green traffic-light buttons at (14, 14) over
  // the page. That offset is now applied on the shared parent in
  // LumoraShellPage so the icon rail AND the right column shift together —
  // a per-rail spacer here would push the wordmark band 20px below the
  // right shell topbar.

  return (
    <nav
      className="hidden md:flex flex-col shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-200 relative"
      style={{
        width: expanded ? 200 : 60,
        // Charcoal chrome — navy is reserved for ACCENT strips only
        // (the wordmark band below + the gold-leaf right rail). The body
        // of the sidebar inherits the neutral surface so it doesn't read
        // as a lapis column next to the charcoal app shell.
        background: 'var(--lum-surface)',
        borderRight: '1px solid var(--lum-border)',
        boxShadow: 'none',
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
          every other Lumora surface (--lum-surface + a --lum-border bottom
          border). Height locked to h-12 to match the LumoraShell topbar
          immediately to the right so the two strips read as one continuous
          band of chrome instead of staggered boxes. */}
      <Link
        to="/"
        className={`h-11 flex items-center ${expanded ? 'gap-2.5 px-4' : 'justify-center px-1'} mb-4 shrink-0`}
        style={{
          background: 'var(--lum-surface)',
          borderBottom: '1px solid var(--lum-border)',
        }}
        data-tip="Camora home"
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
            data-tip="Back"
            aria-label="Back"
            className={`flex items-center w-full ${expanded ? 'gap-3 px-3 justify-start' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] active:scale-[0.98] hover:bg-[var(--bg-elevated)]`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            {expanded && <span className="whitespace-nowrap">Back</span>}
          </button>
        </div>
      )}

      {/* Home — primary hub (top priority). */}
      <div className="flex flex-col gap-0.5 px-1.5">
        {MAIN_ITEMS.map(item => {
          const active = isActive(item.id);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${active ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
              style={itemStyle(active)}
              aria-current={active ? "page" : undefined}
              data-tip={expanded ? undefined : item.label}
            >
              {item.icon}
              {expanded && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Interview — the live surfaces (highest daily-use priority). */}
      <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
      <div className="px-1.5">
        {expanded && <p className="px-3 mb-1 text-[12px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Interview</p>}

        {/* Ask — the entry point to the Q&A surfaces, wearing whichever one
            you are on. The four-way switch lives above the composer. */}
        <Link
          to={askCurrent.path}
          className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-1.5 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${askActive ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
          style={itemStyle(askActive)}
          aria-current={askActive ? 'page' : undefined}
          data-tip={expanded ? undefined : ASK_GROUP.label}
        >
          {ASK_GROUP.icon}
          {expanded && <span className="whitespace-nowrap">{ASK_GROUP.label}</span>}
        </Link>

        {TOOL_ITEMS.map(item => {
          const active = activeTab === item.id;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-1.5 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${active ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
              style={itemStyle(active)}
              aria-current={active ? "page" : undefined}
              data-tip={expanded ? undefined : item.label}
            >
              {item.icon}
              {expanded && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Setup — interview context + meeting/coding platform. Configured per
          interview, so it sits right under the live surfaces. */}
      {/* No SETUP section. Choosing the interview and working on it were two
          rail entries for one job, so the context now lives at the top of the
          Prep Kit page — above the very materials it selects between. One
          destination, and one less chip in a rail read mid-interview. */}

      {/* Prep — study before interviews (Prep Kit + Practice + Prepare). */}
        <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
        <div className="px-1.5">
          {expanded && <p className="px-3 mb-1 text-[12px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Interview</p>}
          {PREP_ITEMS.map(item => {
            const active = isActive(item.id);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${active ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
                style={itemStyle(active)}
              aria-current={active ? "page" : undefined}
                data-tip={expanded ? undefined : item.label}
              >
                {item.icon}
                {expanded && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Library — session history. Assistants is hidden; see LIBRARY_ITEMS. */}
        <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
        <div className="px-1.5">
          {expanded && <p className="px-3 mb-1 text-[12px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Library</p>}
          {LIBRARY_ITEMS.map(item => {
            const active = isActive(item.id);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] ${active ? '' : 'hover:bg-[var(--bg-elevated)]'}`}
                style={itemStyle(active)}
              aria-current={active ? "page" : undefined}
                data-tip={expanded ? undefined : item.label}
              >
                {item.icon}
                {expanded && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </div>

      {/* No More/Account section. Profile and Credits are account settings, and
          Capra already owns them — the same two links, one screen away. A rail
          used during a live interview is the wrong place to keep a second copy
          of a billing page. Both routes still exist and still work. */}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col gap-0.5 px-2">
        {/* Global Stealth toggle — hides the WHOLE Camora window (every tab,
            incl. the embedded Claude webview) from screen share. Active = gold
            with a live "on" dot; reachable from any tab. Desktop only. */}
        {stealthAvailable && (
          <button
            onClick={toggleStealth}
            data-tip={isStealthActive ? 'Stealth ON — Camora is hidden from screen share. Click to disable.' : 'Stealth OFF — Camora is visible to screen share. Auto re-enables after 30 min; click to re-enable now.'}
            aria-label={isStealthActive ? 'Stealth on, click to disable' : 'Stealth off, click to enable'}
            aria-pressed={isStealthActive}
            className={`relative flex items-center ${expanded ? 'gap-3 px-3 justify-start' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] active:scale-[0.98] ${isStealthActive ? '' : 'hover:bg-[var(--bg-elevated)]'} text-left w-full`}
            style={itemStyle(isStealthActive)}
          >
            <span className="relative flex items-center justify-center">
              {isStealthActive
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="4.5" y1="4.5" x2="19.5" y2="19.5" /></svg>}
              {/* Live state dot on the collapsed icon so status reads at a glance. */}
              {!expanded && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: isStealthActive ? 'var(--success)' : 'var(--text-muted)', boxShadow: '0 0 0 1.5px var(--bg-surface)' }} />
              )}
            </span>
            {expanded && <span className="whitespace-nowrap flex items-center gap-2">Stealth<span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: isStealthActive ? 'inherit' : 'var(--text-muted)' }}>{isStealthActive ? 'On' : 'Off'}</span></span>}
          </button>
        )}
        {[
          { label: 'Audio Check', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
            onClick: () => requestAudioSetup() },
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
            data-tip={expanded ? undefined : item.label}
          >
            {item.icon}
            {expanded && <span className="whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </div>

      {/* User — navy-strip + gold-leaf chrome, mirrors the wordmark band
          at the top of the rail so the column is bookended by two strips
          of the same grammar (--lum-surface + a --lum-border edge,
          h-12 fixed). UserDropdown forced to `dark` variant so the
          trigger glass-pill reads on the navy strip regardless of the
          page theme. */}
      <div
        className={`h-11 flex items-center shrink-0 ${expanded ? 'px-2' : 'justify-center px-1'}`}
        style={{
          background: 'var(--lum-surface)',
          borderTop: '1px solid var(--lum-border)',
        }}
      >
        <UserDropdown variant={theme === 'dark' ? 'dark' : 'light'} showName={expanded} compact={!expanded} position="above-left" />
      </div>
    </nav>
  );
}
