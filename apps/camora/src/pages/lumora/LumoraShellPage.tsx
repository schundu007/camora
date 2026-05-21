import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CodingSonaSidebar, CodingSonaSidebarToggle } from '../../components/lumora/shell/CodingSonaSidebar';
import { AICompanionPanel } from '../../components/lumora/shell/AICompanionPanel';
import { dispatchTranscript } from '../../lib/voice-router';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { SessionSidebar } from '../../components/lumora/interview/SessionSidebar';
import { LumoraDocsPanel } from '../../components/lumora/shell/LumoraDocsPanel';
import { LumoraCalendar } from '../../components/lumora/shell/LumoraCalendar';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';
import { useLumoraTour } from '../../hooks/useLumoraTour';
import CamoraLogo from '../../components/shared/CamoraLogo';
// UserDropdown moved to sidebar
import { LumoraIconRail } from '../../components/lumora/shell/LumoraIconRail';
import type { LumoraTab } from '../../components/lumora/shell/LumoraIconRail';
import { requestAudioSetup } from '../../lib/audio-preferences';
import { InterviewerAudioProvider } from '../../components/lumora/audio/InterviewerAudio';
import { AudioSetupWizard } from '../../components/lumora/audio/AudioSetupWizard';
import { SilentStreamBanner } from '../../components/lumora/audio/SilentStreamBanner';
import { useTheme } from '../../hooks/useTheme';
import { dialogConfirm } from '../../components/shared/Dialog';
import { isQuestion } from '../../lib/questionDetector';
import { LumoraProfilePage, AssistantsPage } from './lumora-shell/profile-and-assistants';
import { HistoryAnswerViewer, TabLoading } from './lumora-shell/history-viewer';
import { ScreenshotStrip, type ScreenshotEntry } from '../../components/lumora/shell/ScreenshotStrip';
import CompanyContextPicker from '../../components/lumora/shell/CompanyContextPicker';

// Lazy load heavy layouts — only mounted on first tab activation
const CodingLayout = lazy(() => import('../../components/lumora/coding/CodingLayout').then(m => ({ default: m.CodingLayout })));
const DesignLayout = lazy(() => import('../../components/lumora/design/DesignLayout').then(m => ({ default: m.DesignLayout })));
const CoFixLayout = lazy(() => import('../../components/lumora/cofix/CoFixLayout').then(m => ({ default: m.CoFixLayout })));

export const LumoraShellPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // inputValue removed — copilot now manages its own state
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const { theme: currentTheme, toggle: toggleTheme } = useTheme();
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState<string | undefined>();
  const [copilotFullscreen, setCopilotFullscreen] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<number | null>(null);
  const [pendingHackerrankCapture, setPendingHackerrankCapture] = useState<string | null>(null);
  const [pendingHackerrankText, setPendingHackerrankText] = useState<string | null>(null);
  const [pendingHackerrankStarterCode, setPendingHackerrankStarterCode] = useState<string | null>(null);
  const [pendingHackerrankDataUrls, setPendingHackerrankDataUrls] = useState<string[] | null>(null);

  // Global screenshot strip state
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  // Per-layout refs: set by each layout to receive screenshot OCR text
  const codingScreenshotRef = useRef<((text: string) => void) | null>(null);
  const designScreenshotRef = useRef<((text: string) => void) | null>(null);
  const cofixScreenshotRef = useRef<((text: string) => void) | null>(null);

  // Input mode state lifted to shell so the global strip can own the pills
  const [codingInputMode, setCodingInputMode] = useState<'paste' | 'url' | 'image'>('paste');
  const [designInputMode, setDesignInputMode] = useState<'text' | 'url' | 'image'>('text');

  // Tool selection — persisted per device so users don't repick every session.
  const [meetingPlatform, setMeetingPlatform] = useState<string>(() => {
    try { return localStorage.getItem('lumora_meeting_platform') || 'teams'; } catch { return 'teams'; }
  });
  const [codingPlatform, setCodingPlatform] = useState<string>(() => {
    try { return localStorage.getItem('lumora_coding_platform') || 'auto'; } catch { return 'auto'; }
  });

  // Sync coding platform to desktop main process and persist to localStorage.
  // Run immediately on mount to push the persisted value into main.js,
  // then again whenever the user changes the dropdown.
  useEffect(() => {
    try { localStorage.setItem('lumora_coding_platform', codingPlatform); } catch {}
    (window as any).camo?.setCodingPlatform?.(codingPlatform);
  }, [codingPlatform]);
  useEffect(() => {
    try { localStorage.setItem('lumora_meeting_platform', meetingPlatform); } catch {}
  }, [meetingPlatform]);
  const { handleSubmit, handleCodingSubmit } = useStreamingInterview();
  const { isStreaming, history, useSearch, setUseSearch, clearHistory, removeHistoryEntry, threshold: vadThreshold } = useInterviewStore();
  // Persist the Settings-tip dismissal so it's a true one-time hint,
  // not a banner that re-appears on every page load and re-eats
  // ~40 vertical px on phones. Once dismissed, never shown again on
  // this device until the user clears localStorage.
  const [settingsDismissed, setSettingsDismissedState] = useState<boolean>(() => {
    try { return localStorage.getItem('lumora_settings_tip_dismissed') === '1'; } catch { return false; }
  });
  const setSettingsDismissed = (val: boolean) => {
    setSettingsDismissedState(val);
    try { localStorage.setItem('lumora_settings_tip_dismissed', val ? '1' : '0'); } catch {}
  };

  // Sona sidebar (Coding / Design tabs only). Persisted per-surface
  // so the user's preference survives reloads. Default closed so we
  // don't shrink the solver area unless the user wants Sona.
  const [sonaSidebarOpen, setSonaSidebarOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('lumora_sona_sidebar_open') === 'on'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('lumora_sona_sidebar_open', sonaSidebarOpen ? 'on' : 'off'); } catch {}
  }, [sonaSidebarOpen]);

  // Incremented each time a coding generation stream ends so the Sona
  // sidebar auto-opens and its mic auto-starts to capture interviewer follow-ups.
  // NOTE: declared here as state but the effect that reads activeTab is placed
  // AFTER the activeTab const below to avoid TDZ (const has a dead zone).
  const [sonaListenTrigger, setSonaListenTrigger] = useState(0);
  const prevIsStreamingRef = useRef(false);

  // Track which tabs have been activated (for lazy mounting)
  const [mountedTabs, setMountedTabs] = useState<Set<LumoraTab>>(new Set(['interview']));

  useLumoraTour();

  // Derive active tab from URL (must be declared before any reader below —
  // `const` has TDZ, so moving the showSettingsHint line down fixes a runtime
  // 'Cannot access M before initialization' crash when vadThreshold rehydrates
  // from persisted localStorage as a number ≤ 0.015 and the && stops short-circuiting).
  const activeTab: LumoraTab =
    location.pathname.includes('/coding') ? 'coding' :
    location.pathname.includes('/design') ? 'design' :
    location.pathname.includes('/fix') ? 'cofix' :
    location.pathname.includes('/behavioral') ? 'behavioral' :
    location.pathname.includes('/prepkit') ? 'prepkit' :
    location.pathname.includes('/calendar') ? 'calendar' :
    location.pathname.includes('/sessions') ? 'sessions' :
    location.pathname.includes('/assistants') ? 'assistants' :
    location.pathname.includes('/profile') ? 'profile' :
    location.pathname.includes('/credits') ? 'credits' : 'interview';

  // handleInputModeChange declared AFTER activeTab to avoid TDZ (const has a dead zone)
  const handleInputModeChange = useCallback((mode: string) => {
    if (activeTab === 'coding') setCodingInputMode(mode as 'paste' | 'url' | 'image');
    else if (activeTab === 'design') setDesignInputMode(mode as 'text' | 'url' | 'image');
  }, [activeTab]);

  const showSettingsHint = !settingsDismissed && typeof vadThreshold === 'number' && vadThreshold <= 0.015 && (activeTab === 'coding' || activeTab === 'design');

  // activeTab is now in scope — safe to reference in deps array.
  useEffect(() => {
    const prev = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;
    if (prev && !isStreaming && activeTab === 'coding' && useInterviewStore.getState().liveSolveContext) {
      setSonaSidebarOpen(true);
      setSonaListenTrigger(n => n + 1);
    }
  }, [isStreaming, activeTab]);

  // Lazy-mount tabs on first activation
  useEffect(() => {
    if (!mountedTabs.has(activeTab)) {
      setMountedTabs(prev => new Set(prev).add(activeTab));
    }
  }, [activeTab, mountedTabs]);

  // Close the mobile More sheet on Escape and whenever the route changes
  useEffect(() => {
    if (!mobileMoreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMoreOpen]);
  useEffect(() => { setMobileMoreOpen(false); }, [location.pathname]);
  // Return focus to hamburger when mobile menu closes (keyboard a11y)
  const prevMobileMoreOpen = useRef(false);
  useEffect(() => {
    if (prevMobileMoreOpen.current && !mobileMoreOpen) {
      hamburgerRef.current?.focus();
    }
    prevMobileMoreOpen.current = mobileMoreOpen;
  }, [mobileMoreOpen]);

  // Sync behavioral fullscreen to URL:
  //   /lumora/behavioral       → open (starter question if none set)
  //   /lumora/behavioral?q=... → open with that question
  //   anywhere else            → close + scrub the ?q= so a stale question
  //                              doesn't reappear when the user comes back.
  useEffect(() => {
    if (activeTab === 'behavioral') {
      const q = new URLSearchParams(location.search).get('q') || undefined;
      setCopilotQuestion(q);
      setCopilotFullscreen(true);
    } else {
      setCopilotFullscreen(false);
      setCopilotQuestion(undefined);
      // Substring check `includes('q=')` was matching `?question=` /
      // `?fq=true` / etc. and firing replaceState on every render where
      // those happened to be in the URL. Use URLSearchParams.has so
      // only an actual `q` query param triggers the rewrite.
      const params = new URLSearchParams(location.search);
      if (params.has('q')) {
        params.delete('q');
        const next = params.toString();
        window.history.replaceState(null, '', location.pathname + (next ? `?${next}` : ''));
      }
    }
  }, [activeTab, location.search, location.pathname]);

  // Trigger Monaco editor resize when switching to coding/design tab
  useEffect(() => {
    if (activeTab === 'coding' || activeTab === 'design' || activeTab === 'cofix') {
      // Monaco needs a resize event to recalculate layout after display:none → flex
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Document title.
  //
  // No cleanup — RouteTitle in App.tsx already sets a sane fallback on
  // every route change, and the destination page's own useEffect runs
  // on mount to set its own title. The previous `return () => {
  // document.title = 'Camora'; }` raced with the next page's mount
  // effect (React 19 cleanup ordering vs new-mount effect), so
  // /lumora/* → /pricing would briefly land on "Camora" instead of
  // "Pricing — Camora".
  useEffect(() => {
    const titles: Record<string, string> = {
      interview: 'Live Interview | Camora',
      coding: 'Coding Interview | Camora',
      design: 'Design Interview | Camora',
      cofix: 'CoFix | Camora',
      behavioral: 'Behavioral Interview | Camora',
      prepkit: 'Prep Kit | Camora',
      calendar: 'Calendar | Camora',
    };
    document.title = titles[activeTab] || 'Camora';
  }, [activeTab]);

  // Cmd+Shift+H global shortcut (Electron): silently capture the HackerRank
  // browser window → navigate to Coding tab → auto-solve. Zero cursor movement.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.onHackerrankCapture) return;
    camo.onHackerrankCapture((data: { dataUrl?: string; dataUrls?: string[]; text?: string; starterCode?: string; error?: string }) => {
      if (data.text) {
        navigate('/lumora/coding');
        setPendingHackerrankText(data.text);
        if (data.starterCode) setPendingHackerrankStarterCode(data.starterCode);
      } else if (data.dataUrls) {
        navigate('/lumora/coding');
        setPendingHackerrankDataUrls(data.dataUrls);
      } else if (data.dataUrl) {
        navigate('/lumora/coding');
        setPendingHackerrankCapture(data.dataUrl);
      }
    });
    return () => { camo.offHackerrankCapture?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const el = e.target as HTMLElement;
      const inEditor = el.closest('.monaco-editor') || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      // Cmd+S: toggle search
      if (isMod && e.key === 's' && !el.closest('.monaco-editor')) {
        e.preventDefault();
        setUseSearch(!useSearch);
      }
      // Cmd+Backspace: clear history
      if (isMod && e.key === 'Backspace' && !el.closest('.monaco-editor')) {
        e.preventDefault();
        (async () => { if (await dialogConfirm({ title: 'Clear all history?', message: 'This will permanently remove every saved session across all tabs.', confirmLabel: 'Clear all', tone: 'danger' })) clearHistory(); })();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [useSearch, setUseSearch, clearHistory]);

  // Refs for coding/design problem setters — set by child layouts
  const codingProblemRef = useRef<((text: string) => void) | null>(null);
  const designProblemRef = useRef<((text: string) => void) | null>(null);

  const handleCodingSubmitRouted = useCallback((problem: string, language?: string, options?: { bypassCache?: boolean; starterCode?: string }) => {
    return handleCodingSubmit(problem, language as any, options);
  }, [handleCodingSubmit]);

  const handleTranscription = useCallback((text: string, opts?: { manual?: boolean }) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (activeTab === 'coding' || activeTab === 'design') {
      // Routed: voice-router decides between the problem setter and Sona
      // based on voiceRoute state. Manual presses always go to Sona.
      dispatchTranscript({
        text: trimmed,
        opts,
        activeTab,
        codingProblemRef,
        designProblemRef,
      });
      return;
    }
    if (activeTab === 'behavioral') {
      // Behavioral fullscreen renders the embedded AICompanionPanel — the
      // InterviewPage UI is hidden, so routing through useStreamingInterview
      // would stream the answer to a surface no one can see. Forward the
      // interviewer's question to the panel via a custom event instead.
      // Gate on isQuestion() so background chatter doesn't fire Sona,
      // unless the press was manual (intent overrides heuristic).
      if (!opts?.manual && !isQuestion(trimmed)) return;
      window.dispatchEvent(new CustomEvent('lumora:behavioral-question', { detail: { text: trimmed } }));
      return;
    }
    // Interview tab: gate on isQuestion() so background noise doesn't fire the LLM.
    if (!opts?.manual && !isQuestion(trimmed)) return;
    handleSubmit(text);
  }, [handleSubmit, activeTab]);

  const handleSnapped = useCallback((entry: ScreenshotEntry) => {
    setScreenshots(prev => {
      const existing = prev.findIndex(s => s.id === entry.id);
      if (existing >= 0) { const next = [...prev]; next[existing] = entry; return next; }
      return [...prev, entry];
    });
    if (!entry.text) return;
    if (activeTab === 'coding') codingScreenshotRef.current?.(entry.text);
    else if (activeTab === 'design') designScreenshotRef.current?.(entry.text);
    else if (activeTab === 'cofix') cofixScreenshotRef.current?.(entry.text);
  }, [activeTab]);

  const handleRemoveScreenshot = useCallback((id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <InterviewerAudioProvider onTranscription={handleTranscription}>
    {/* Audio setup wizard — only mounted on live-interview tabs where
        we actually need audio. The wizard auto-opens on first session
        until the user finishes setup, then stays out of the way. */}
    {(activeTab === 'interview' || activeTab === 'behavioral' || activeTab === 'coding' || activeTab === 'design') && <AudioSetupWizard />}
    {(activeTab === 'interview' || activeTab === 'behavioral' || activeTab === 'coding' || activeTab === 'design') && <SilentStreamBanner />}
    <div
      className="fixed inset-0 w-full flex overflow-hidden"
      style={{
        background: 'var(--bg-app)',
        // Electron desktop on macOS uses titleBarStyle: 'hiddenInset', which
        // floats the red/yellow/green traffic lights at (14, 14) over the
        // page. Push BOTH the icon rail and the right column down by 20px so
        // the sidebar's wordmark band and the right shell topbar share the
        // same y baseline (and same at the bottom — see paddingBottom: 0 on
        // the rail). Lifting the offset to this shared parent is what keeps
        // the two columns aligned; if it lives only on the rail, the right
        // header floats 20px above the wordmark.
        paddingTop:
          typeof window !== 'undefined' &&
          (window as any).camo?.isDesktop &&
          (window as any).camo?.platform === 'darwin'
            ? 20
            : 0,
      }}
    >
      {/* Left icon rail */}
      <LumoraIconRail
        activeTab={activeTab}
        sessionsOpen={sessionsOpen}
        onToggleSessions={() => setSessionsOpen(prev => !prev)}
      />

      {/* Sessions sidebar — only when on interview tab */}
      {activeTab === 'interview' && sessionsOpen && (
        <SessionSidebar
          isOpen={true}
          onClose={() => setSessionsOpen(false)}
          onSelectEntry={(idx) => setFocusedEntry(idx)}
        />
      )}

      {/* Main area — bottom padding accounts for fixed mobile nav + iOS home indicator */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        {/* Top bar — matches the Capra TopBar layout: tabs on the LEFT
            (immediately after the icon-rail logo), page-specific
            controls in the middle grow region, utility buttons on the
            RIGHT. Same horizontal anchor across every shell so users
            always find Home/Coding/Design/Behavioral at the same spot.
            Gradient + shadow give the header a high-fidelity modern
            feel in both themes via design tokens. */}
        <div
          className="flex items-center h-12 px-4 shrink-0 lumora-shell-topbar gap-3"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
            boxShadow: 'var(--shadow-primary-xs)',
          }}
        >
          {/* Mobile-only Camora logo — the desktop LumoraIconRail (which
              hosts the brand mark) is hidden on mobile, so without this
              link users have no way to navigate back to the landing
              page from any /lumora/* screen. */}
          <Link to="/" className="md:hidden flex items-center -ml-1 mr-1" aria-label="Camora — home">
            <CamoraLogo size={26} />
          </Link>

          {/* Back — the Electron desktop build has no browser chrome and the
              IconRail's Camora mark goes to /, so without this button the
              only way back from a /lumora/* screen is to detour through the
              landing page. navigate(-1) preserves the user's actual prior
              location; falls back to / when there's no history (e.g. cold
              desktop launch). */}
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/'); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-[background-color,opacity] hover:opacity-80 active:scale-[0.97] shrink-0"
            style={{
              background: 'var(--lumora-chrome-bg)',
              border: '1px solid var(--lumora-chrome-border)',
              color: 'var(--lumora-chrome-text)',
              boxShadow: 'var(--lumora-chrome-shadow)',
            }}
            title="Back"
            aria-label="Back"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Cross-section quick links + tool pickers — lg+ only so 5-tab
              cluster fits cleanly at the md (768px) tablet breakpoint. */}
          <div className="hidden lg:flex items-center gap-1 p-0.5 rounded-md shrink-0"
            style={{ background: 'var(--lumora-chrome-bg)', border: '1px solid var(--lumora-chrome-border)', boxShadow: 'var(--lumora-chrome-shadow)' }}>
            <Link to="/capra/prepare"
              className="lumora-chrome-link px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-[background-color,color]"
              style={{ color: 'var(--lumora-chrome-text)' }}
            >Prepare</Link>
            <Link to="/pricing"
              className="lumora-chrome-link px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-[background-color,color]"
              style={{ color: 'var(--lumora-chrome-text)' }}
            >Pricing</Link>
            {/* Separator */}
            <div className="w-px h-4 mx-0.5" style={{ background: 'var(--lumora-chrome-border)' }} />
            {/* Meeting platform */}
            <div className="lumora-chrome-link flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-[background-color]"
              style={{ color: 'var(--lumora-chrome-text)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 10l4.553-2.37A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
              <select
                value={meetingPlatform}
                onChange={e => setMeetingPlatform(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-[11px] font-bold"
                style={{ color: 'inherit', appearance: 'none', WebkitAppearance: 'none' }}
                title="Meeting platform"
                aria-label="Meeting platform"
              >
                <option value="zoom">Zoom</option>
                <option value="teams">Teams</option>
                <option value="meet">Google Meet</option>
                <option value="other">Other</option>
              </select>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {/* Coding platform */}
            <div className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-[background-color]"
              style={codingPlatform !== 'none'
                ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', borderRadius: '0.25rem', boxShadow: '0 0 0 2px rgba(201,162,39,0.30)' }
                : { color: 'var(--lumora-chrome-text)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <select
                value={codingPlatform}
                onChange={e => setCodingPlatform(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-[11px] font-bold"
                style={{ color: 'inherit', appearance: 'none', WebkitAppearance: 'none' }}
                title="Coding platform — Camora auto-detects this tab"
                aria-label="Coding platform"
              >
                <option value="auto">Auto-detect</option>
                <option value="none">Disabled</option>
                <option value="hackerrank">HackerRank</option>
                <option value="leetcode">LeetCode</option>
                <option value="coderpad">CoderPad</option>
              </select>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>

          {/* LEFT spacer — pushes the tab pills toward the centre of the
              top bar instead of letting them sit flush against the
              logo. Paired with the matching spacer after the tab cluster
              so the cluster stays visually centred regardless of how much
              chrome lives on the right. */}
          <div className="hidden md:block flex-1" />

          {/* CENTRE — Lumora-specific tab pills. LeetCode treatment:
              navy hero-strip background, gold-leaf underline, active
              tab flips to gold-leaf with dark navy text — same active
              affordance as the SHORT/DETAILED toggle for consistency
              across the app. */}
          <div
            className="hidden md:flex items-center gap-1 p-1.5 rounded-lg shrink-0"
            style={{
              background: 'var(--lumora-chrome-bg)',
              border: '1px solid var(--lumora-chrome-border)',
              boxShadow: 'var(--lumora-chrome-shadow)',
            }}
          >
            {[
              { id: 'interview', label: 'Home', path: '/lumora', title: 'Interview assistant home' },
              { id: 'coding', label: 'Coding', path: '/lumora/coding', title: 'Coding interview assistant' },
              { id: 'design', label: 'Design', path: '/lumora/design', title: 'System design assistant' },
              { id: 'behavioral', label: 'Behavioral', path: '/lumora/behavioral', title: 'Behavioral interview assistant' },
              { id: 'cofix', label: 'CoFix', path: '/lumora/fix', title: 'Fix & debug code' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  title={tab.title}
                  viewTransition
                  data-active={isActive ? 'true' : 'false'}
                  className="lumora-tab-pill px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-[background-color,color,transform]"
                  style={isActive
                    ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }
                    : { color: 'var(--lumora-chrome-text)' }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* RIGHT spacer — symmetric with the left flex-1 above so the
              tab cluster stays centred. The right-hand chrome still
              renders at the very edge thanks to its own shrink-0. */}
          <div className="hidden md:block flex-1" />


          {/* RIGHT — utility chrome. Theme toggle lives in the IconRail's
              bottom utilities section (alongside Audio Check / Help) so
              we don't render a duplicate here; mobile users still get it
              from the hamburger sheet below. */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Company context — visible on all Lumora AI tabs */}
            <div className="hidden md:block">
              <CompanyContextPicker />
            </div>

            {/* Mobile hamburger — pinned right, matches SiteNav and TopBar.
                Opens a dropdown with secondary Lumora destinations and
                utilities (theme, audio check). */}
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMobileMoreOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-md transition-colors"
              style={{ color: 'var(--text-primary)' }}
              aria-label={mobileMoreOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMoreOpen}
            >
              {mobileMoreOpen ? (
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
        </div>

        {/* Settings hint for uncalibrated users */}
        {showSettingsHint && (
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                <strong>Tip:</strong> Mic sensitivity is very low — quiet questions may not be heard. Open Settings (⚙) to adjust.
              </span>
            </div>
            <button onClick={() => setSettingsDismissed(true)} className="text-xs font-bold px-2 py-1 rounded hover:opacity-80" style={{ color: 'var(--accent)' }}>Dismiss</button>
          </div>
        )}

        {/* Global screenshot strip — shown on AI tabs only */}
        {(activeTab === 'coding' || activeTab === 'design' || activeTab === 'behavioral') && (
          <ScreenshotStrip
            surface={activeTab as 'coding' | 'design' | 'behavioral'}
            screenshots={screenshots}
            onSnapped={handleSnapped}
            onRemove={handleRemoveScreenshot}
            inputMode={activeTab === 'coding' ? codingInputMode : activeTab === 'design' ? designInputMode : undefined}
            onInputModeChange={handleInputModeChange}
            showInputModeSelector={activeTab === 'coding' || activeTab === 'design'}
            onTranscription={handleTranscription}
            isTabActive={true}
            codingPlatform={activeTab === 'coding' ? codingPlatform : undefined}
          />
        )}

        {/* Tab content — display toggling preserves state */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* Interview tab */}
          <div style={{ display: activeTab === 'interview' ? 'flex' : 'none' }} className="flex-1 flex flex-col min-h-0 absolute inset-0">
            <ErrorBoundary>
              <InterviewPanel
                onAskQuestion={(q) => navigate(q ? `/lumora/behavioral?q=${encodeURIComponent(q)}` : '/lumora/behavioral')}
                onSwitchToCoding={(p) => navigate(p ? `/lumora/coding?problem=${encodeURIComponent(p)}` : '/lumora/coding')}
                onSwitchToDesign={(p) => navigate(p ? `/lumora/design?problem=${encodeURIComponent(p)}` : '/lumora/design')}
              />
            </ErrorBoundary>
          </div>

          {/* Coding tab — lazy mounted, dark theme override */}
          {mountedTabs.has('coding') && (
            <div style={{ display: activeTab === 'coding' ? 'flex' : 'none' }} className="flex-1 flex flex-col min-h-0 absolute inset-0">
              <ErrorBoundary>
                <Suspense fallback={<TabLoading label="Coding" />}>
                  <div className="flex-1 min-h-0 flex">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <CodingLayout
                        embedded
                        onSubmit={handleCodingSubmitRouted}
                        isLoading={isStreaming}
                        onBack={() => navigate('/lumora')}
                        initialProblem={activeTab === 'coding' ? (location.state as any)?.cofixCode || new URLSearchParams(location.search).get('problem') || '' : ''}
                        onVoiceProblemRef={codingProblemRef}
                        pendingHackerrankCapture={pendingHackerrankCapture}
                        onHackerrankCaptureConsumed={() => setPendingHackerrankCapture(null)}
                        pendingHackerrankText={pendingHackerrankText}
                        onHackerrankTextConsumed={() => setPendingHackerrankText(null)}
                        pendingHackerrankStarterCode={pendingHackerrankStarterCode}
                        onHackerrankStarterCodeConsumed={() => setPendingHackerrankStarterCode(null)}
                        pendingHackerrankDataUrls={pendingHackerrankDataUrls}
                        onHackerrankDataUrlsConsumed={() => setPendingHackerrankDataUrls(null)}
                        codingPlatform={codingPlatform}
                        onEmbeddedTranscription={handleTranscription}
                        isTabActive={activeTab === 'coding'}
                        onScreenshotAppendRef={codingScreenshotRef}
                        onNewProblemCallback={() => setScreenshots([])}
                        externalInputMode={codingInputMode}
                        onExternalInputModeChange={(m) => setCodingInputMode(m as 'paste' | 'url' | 'image')}
                      />
                    </div>
                    {/* Sona Q&A sidebar — independent state, follow-up
                        questions only. Single source of truth: types
                        in, asks Sona with live solve context, renders
                        answers. Doesn't share voice routing. */}
                    <CodingSonaSidebar
                      surface="coding"
                      open={sonaSidebarOpen}
                      onClose={() => setSonaSidebarOpen(false)}
                    />
                  </div>
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {/* Design tab — lazy mounted, dark theme override */}
          {mountedTabs.has('design') && (
            <div style={{ display: activeTab === 'design' ? 'flex' : 'none' }} className="flex-1 flex flex-col min-h-0 absolute inset-0">
              <ErrorBoundary>
                <Suspense fallback={<TabLoading label="Design" />}>
                  <div className="flex-1 min-h-0 flex">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <DesignLayout
                        embedded
                        onBack={() => navigate('/lumora')}
                        initialProblem={activeTab === 'design' ? new URLSearchParams(location.search).get('problem') || '' : ''}
                        onVoiceProblemRef={designProblemRef}
                        onEmbeddedTranscription={handleTranscription}
                        isTabActive={activeTab === 'design'}
                        onScreenshotAppendRef={designScreenshotRef}
                        externalInputTab={designInputMode}
                        onExternalInputTabChange={(m) => setDesignInputMode(m as 'text' | 'url' | 'image')}
                      />
                    </div>
                    <CodingSonaSidebar
                      surface="design"
                      open={sonaSidebarOpen}
                      onClose={() => setSonaSidebarOpen(false)}
                    />
                  </div>
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {/* CoFix tab — lazy mounted */}
          {mountedTabs.has('cofix') && (
            <div style={{ display: activeTab === 'cofix' ? 'flex' : 'none' }} className="flex-1 flex flex-col min-h-0 absolute inset-0">
              <ErrorBoundary>
                <Suspense fallback={<TabLoading label="CoFix" />}>
                  <CoFixLayout
                    onScreenshotAppendRef={cofixScreenshotRef}
                    screenshots={screenshots}
                    onSnapped={handleSnapped}
                    onRemove={handleRemoveScreenshot}
                    onTranscription={handleTranscription}
                    isTabActive={activeTab === 'cofix'}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {/* Docs tab */}
          {activeTab === 'prepkit' && (
            <div className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0">
              <LumoraDocsPanel />
            </div>
          )}

          {/* Calendar tab */}
          {activeTab === 'calendar' && (
            <div className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0" style={{ background: 'var(--bg-surface)' }}>
              <LumoraCalendar onClose={() => navigate('/lumora')} />
            </div>
          )}

          {/* Sessions page */}
          {activeTab === 'sessions' && (
            <div
              className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto"
              style={{
                background:
                  'radial-gradient(ellipse 50% 40% at 0% 0%, rgba(38,97,156,0.06), transparent 70%),' +
                  'radial-gradient(ellipse 60% 40% at 100% 100%, rgba(34,211,238,0.04), transparent 70%),' +
                  'var(--bg-surface)',
              }}
            >
              {/* Atmospheric navy hero w/ cyan inner glow + gold underline */}
              <div
                className="shrink-0 relative"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 100% at 100% 0%, rgba(34,211,238,0.14), transparent 60%),' +
                    'var(--cam-hero-strip)',
                  borderBottom: '1px solid var(--cam-gold-leaf)',
                }}
              >
                <div className="max-w-3xl mx-auto px-6 py-8 w-full relative">
                  <h2 className="text-4xl font-extrabold mb-2 text-white" style={{ textShadow: '0 0 28px rgba(255,255,255,0.14)' }}>Sessions</h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Your interview session history — <span className="font-bold" style={{ color: 'var(--cam-gold-leaf-lt)', textShadow: '0 0 14px rgba(217,181,67,0.45)' }}>{history.length}</span> saved.
                  </p>
                </div>
              </div>
              <div className="max-w-3xl mx-auto px-6 pt-5 pb-10 w-full">
                {history.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={async () => {
                        const ok = await dialogConfirm({ title: 'Clear all sessions?', message: 'This will permanently remove every saved session.', confirmLabel: 'Clear all', tone: 'danger' });
                        if (ok) clearHistory();
                      }}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--danger)', border: '1px solid var(--danger)', background: 'var(--bg-surface)' }}
                    >Clear all</button>
                  </div>
                )}
                {history.length === 0 ? (
                  <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <div className="relative w-14 h-14 mx-auto mb-3">
                      {/* Outward pulse ring under the icon — invites action */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: 'rgba(38,97,156,0.10)' }}
                      />
                      <svg className="relative w-16 h-16 mx-auto mt-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold">No sessions yet</p>
                    <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Sessions and transcripts will appear here after your first interview.</p>
                    <Link
                      to="/lumora"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-[opacity,transform] hover:opacity-90 active:scale-[0.96]"
                      style={{ background: 'var(--cam-gold-leaf)', color: '#020617' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Start interview
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice().reverse().map((entry: any, revIdx: number) => {
                      const realIdx = history.length - 1 - revIdx;
                      return (
                        <button
                          key={realIdx}
                          type="button"
                          onClick={() => { setFocusedEntry(realIdx); navigate('/lumora'); }}
                          className="session-row session-row-enter flex items-center gap-3 p-3.5 rounded-xl w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cam-primary)]/40"
                          style={{ animationDelay: `${Math.min(revIdx * 30, 210)}ms`,
                            background:
                              'linear-gradient(135deg, rgba(38,97,156,0.04) 0%, rgba(34,211,238,0.02) 100%)',
                            border: '1px solid rgba(38,97,156,0.10)',
                          }}
                        >
                          <span
                            className="session-badge-num flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-bold shrink-0"
                            style={{
                              background:
                                'linear-gradient(135deg, var(--cam-primary) 0%, var(--cam-primary-dk) 100%)',
                              color: '#FFFFFF',
                              fontFamily: 'var(--font-code)',
                              boxShadow: '0 2px 6px rgba(38,97,156,0.32), inset 0 1px 0 rgba(255,255,255,0.16)',
                            }}
                          >
                            {realIdx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{entry.question}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(entry.timestamp).toLocaleString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFocusedEntry(realIdx); navigate('/lumora'); }}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-[background-color,color] active:scale-[0.98] shrink-0"
                            style={{ color: 'var(--cam-primary-dk)', background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}
                          >View</button>
                          <button
                            type="button"
                            aria-label="Delete session"
                            title="Delete session"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await dialogConfirm({ title: 'Delete session?', message: 'This will permanently remove the question and its stored answer from your history.', confirmLabel: 'Delete', tone: 'danger' });
                              if (ok) removeHistoryEntry(realIdx);
                            }}
                            className="session-delete-btn flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-[color,border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/40"
                            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                          </button>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assistants page */}
          {activeTab === 'assistants' && (
            <div className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: 'var(--bg-surface)' }}>
              <AssistantsPage />
            </div>
          )}

          {/* Profile page */}
          {activeTab === 'profile' && (
            <div className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: 'var(--bg-surface)' }}>
              <LumoraProfilePage />
            </div>
          )}

          {/* Credits page */}
          {activeTab === 'credits' && (
            <div className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: 'var(--bg-surface)' }}>
              <div className="shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                <div className="max-w-2xl mx-auto px-6 py-8 w-full">
                  <h2 className="text-4xl font-extrabold mb-2 text-white">Credits & <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Usage</span></h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Track your AI usage and remaining credits.</p>
                </div>
              </div>
              <div className="max-w-2xl mx-auto px-6 pt-5 pb-10 w-full">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Sessions Used', value: String(history.length), sub: 'this month' },
                    { label: 'AI Questions', value: String(history.filter((e: any) => e.question).length), sub: 'total asked' },
                    { label: 'Plan', value: 'Active', sub: 'subscription' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--border)' }}>
                      <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{s.value}</div>
                      <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{s.label}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Usage</h3>
                  {history.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No usage yet. Start an interview to see activity.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {history.slice(-10).reverse().map((e: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: '1px solid var(--border)' }}>
                          <span className="truncate min-w-0 flex-1" style={{ color: 'var(--text-primary)' }}>{e.question}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Assistant — fullscreen mode (behavioral / ask questions) */}
          {copilotFullscreen && (
            <div className="absolute inset-0 z-20 flex flex-col" style={{ background: 'var(--bg-surface)' }}>
              <AICompanionPanel isOpen={true} onClose={() => navigate('/lumora')} initialQuestion={copilotQuestion} embedded />
            </div>
          )}

          {/* History answer viewer — overlays when user clicks a past question on Home */}
          {focusedEntry !== null && activeTab === 'interview' && history[focusedEntry] && (
            <HistoryAnswerViewer
              entry={history[focusedEntry]}
              onClose={() => { setFocusedEntry(null); setCopilotOpen(false); }}
            />
          )}
        </div>
      </div>

      {/* AI Copilot — floating popup. Hidden on Coding / Design tabs
          per user request: those surfaces have their own solver and
          don't benefit from a co-resident Sona panel. Sona stays
          available on the Home (interview) and Behavioral tabs. */}
      {!copilotFullscreen && activeTab !== 'coding' && activeTab !== 'design' && (
        <AICompanionPanel
          isOpen={true}
          onClose={() => {}}
        />
      )}

      {/* Sidebar toggle FAB — only on coding/design when sidebar is
          closed. Uses the live solve context as a "context ready"
          indicator so the user knows asking Sona right now will hit
          a grounded prompt. */}
      {(activeTab === 'coding' || activeTab === 'design') && (
        <CodingSonaSidebarToggle
          open={sonaSidebarOpen}
          onToggle={() => setSonaSidebarOpen(true)}
          hasSolve={!!useInterviewStore.getState().liveSolveContext}
        />
      )}

      {/* Mobile bottom navigation — visible only on small screens.
          Charcoal chrome with a 2px gold-leaf top rail (the canonical
          Camora navy-strip / gold-leaf grammar) instead of the solid
          lapis fill it used to have. Active tab uses the gold-leaf
          accent; inactive is theme-aware muted text so it stays
          legible in both light and dark modes. */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 items-center justify-around"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '2px solid var(--cam-gold-leaf)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.18)',
          height: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {[
          { id: 'interview', label: 'Home', path: '/lumora', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
          { id: 'coding', label: 'Code', path: '/lumora/coding', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
          { id: 'design', label: 'Design', path: '/lumora/design', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
          { id: 'prepkit', label: 'Prep', path: '/lumora/prepkit', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              viewTransition
              className="relative flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-colors"
              style={{
                color: isActive ? 'var(--cam-gold-leaf)' : 'var(--text-muted)',
                background: isActive ? 'rgba(201,162,39,0.10)' : 'transparent',
              }}
            >
              {tab.icon}
              <span className="text-[10px] font-bold">{tab.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b"
                  style={{ background: 'var(--cam-gold-leaf)', boxShadow: '0 0 8px rgba(201,162,39,0.50)' }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile dropdown — drops down from the right hamburger in the
          Lumora topbar (which lives below the icon-rail-less mobile
          chrome). Holds secondary Lumora destinations + utilities. */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileMoreOpen(false)} role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
          <div onClick={e => e.stopPropagation()}
            className="lumora-mobile-sheet absolute right-2 w-[260px] max-w-[90vw] rounded-bl-xl rounded-br-xl"
            style={{ top: 48, background: 'var(--bg-surface)', boxShadow: '0 12px 28px rgba(0,0,0,0.20)', border: '1px solid var(--border)' }}>
            <div className="py-2 max-h-[70vh] overflow-y-auto">
              {[
                { id: 'behavioral', label: 'Behavioral', path: '/lumora/behavioral' },
                { id: 'cofix',      label: 'CoFix',      path: '/lumora/fix' },
                { id: 'calendar',   label: 'Calendar',   path: '/lumora/calendar' },
                { id: 'sessions',   label: 'Sessions',   path: '/lumora/sessions' },
                { id: 'assistants', label: 'Assistants', path: '/lumora/assistants' },
                { id: 'profile',    label: 'Profile',    path: '/lumora/profile' },
                { id: 'credits',    label: 'Credits',    path: '/lumora/credits' },
                { id: 'pricing',    label: 'Pricing',    path: '/pricing' },
              ].map(item => (
                <Link key={item.id} to={item.path} viewTransition onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-[14px] font-semibold active:bg-black/5"
                  style={{ color: activeTab === item.id ? 'var(--cam-primary)' : 'var(--text-primary)' }}>
                  <span>{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
              {/* Utilities — desktop reaches these from the icon rail bottom; mobile gets them here. */}
              <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                <button type="button"
                  onClick={() => { setMobileMoreOpen(false); requestAudioSetup(); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold active:bg-black/5"
                  style={{ color: 'var(--text-primary)' }}>
                  <span>Audio check</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                </button>
                <button type="button"
                  onClick={() => { toggleTheme(); setMobileMoreOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold active:bg-black/5"
                  style={{ color: 'var(--text-primary)' }}>
                  <span>{currentTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  {currentTheme === 'dark' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </InterviewerAudioProvider>
  );
}

export default LumoraShellPage;
