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

/* ── Sidebar items, ordered by priority ──
   Home (hub) → Interview (live surfaces) → Setup (context + tools) →
   Prep (study) → Library (history/assistants) → account/utilities. */
const MAIN_ITEMS = [
  { id: 'dashboard', label: 'Home', path: '/lumora', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
];

/* Library group — review history + manage assistants (lower priority). */
const LIBRARY_ITEMS = [
  { id: 'sessions', label: 'Sessions', path: '/lumora/sessions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
  { id: 'assistants', label: 'Assistants', path: '/lumora/assistants', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
];

/* Prep group — Prep Kit + Practice + Prepare, grouped together in their own
   section, kept separate from the meeting/coding Tools group. */
const PREP_ITEMS = [
  { id: 'documents', label: 'Prep Kit', path: '/lumora/prepkit', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
];

/* Out of Lumora entirely. Prepare and Practice used to sit in the rail, which
   put two studying destinations inside a surface used during a live interview —
   and neither is something you open with someone watching. The one exit that IS
   wanted is the way out, so that is what the rail carries. */
const SITE_ITEM = { id: 'site', label: 'Camora Home', path: '/', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 001 1h3.5v-5.5h5V21H18a1 1 0 001-1V9.5" /></svg> };

const MORE_ITEMS = [
  { id: 'profile', label: 'Profile', path: '/lumora/profile' },
  { id: 'credits', label: 'Credits', path: '/lumora/credits' },
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

  const [accountOpen, setAccountOpen] = useState(false);

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
      {(onOpenContext || onMeetingPlatformChange || onCodingPlatformChange) && (
        <>
          <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
          <div className="px-1.5">
            {expanded && <p className="px-3 mb-1 text-[12px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Setup</p>}
            {onOpenContext && (
              <button
                type="button"
                onClick={onOpenContext}
                data-tip={companyKey ? `Interview: ${companyKey}` : 'Set interview context'}
                aria-label={companyKey ? `Interview: ${companyKey} — change` : 'Set interview context'}
                className={`flex items-center w-full ${expanded ? 'gap-2 px-3 justify-start' : 'justify-center px-0'} py-2 mb-0.5 rounded-lg text-[13px] font-bold transition-[background-color,color,transform] active:scale-[0.98]`}
                style={companyKey
                  ? { background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-border-strong)' }
                  : { background: 'var(--lum-surface)', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
                {expanded && <span className="truncate">{companyKey ?? '+ Context'}</span>}
              </button>
            )}
            {/* The meeting and coding pickers moved INTO the context drawer the
                button above opens. They were two more icons to find, and both
                were native <select>s — whose menus open in a separate OS window
                that content protection cannot hide, so the list stayed on
                screen in a share. Choosing the workspace, the meeting tool and
                the coding platform is one decision about what this interview
                is, so it is now one window. */}
          </div>
        </>
      )}

        {/* Prep — study before interviews (Prep Kit + Practice + Prepare). */}
        <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
        <div className="px-1.5">
          {expanded && <p className="px-3 mb-1 text-[12px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Prep</p>}
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
          {/* The way out. An external <a>, not a Link: Lumora and the marketing
              site are different shells, and routing between them in-app leaves
              the interview chrome half-torn-down behind the landing page. */}
          <a
            href={SITE_ITEM.path}
            className={`flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] hover:bg-[var(--bg-elevated)]`}
            style={itemStyle(false)}
            data-tip={expanded ? undefined : SITE_ITEM.label}
          >
            {SITE_ITEM.icon}
            {expanded && <span className="whitespace-nowrap">{SITE_ITEM.label}</span>}
          </a>
        </div>

        {/* Library — history + assistants (lower priority). */}
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

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />

      {/* More section */}
      <div className="px-1.5">
        {expanded && <p className="px-3 mb-1 text-[12px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>More</p>}
        {/* Account dropdown */}
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className={`flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} w-full py-2 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] hover:bg-[var(--bg-elevated)]`}
          style={{ color: 'var(--text-secondary)' }}
          data-tip={expanded ? undefined : 'Account'}
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
