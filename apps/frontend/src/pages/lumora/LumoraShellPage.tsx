import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LumoraTopBar } from '../../components/lumora/shell/LumoraTopBar';
import { AICompanionPanel, AICompanionToggle } from '../../components/lumora/shell/AICompanionPanel';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { SessionSidebar } from '../../components/lumora/interview/SessionSidebar';
import { LumoraDocsPanel } from '../../components/lumora/shell/LumoraDocsPanel';
import { LumoraCalendar } from '../../components/lumora/shell/LumoraCalendar';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';
import { useLumoraTour } from '../../hooks/useLumoraTour';
import CamoraLogo from '../../components/shared/CamoraLogo';
import { useAuth } from '../../contexts/AuthContext';
import SharedPricingCards from '../../components/shared/PricingCards';
// UserDropdown moved to sidebar
import { LumoraIconRail } from '../../components/lumora/shell/LumoraIconRail';
import type { LumoraTab } from '../../components/lumora/shell/LumoraIconRail';
import { requestAudioSetup } from '../../lib/audio-preferences';
import { InterviewerAudioProvider } from '../../components/lumora/audio/InterviewerAudio';
import { AudioSetupWizard } from '../../components/lumora/audio/AudioSetupWizard';
import { SilentStreamBanner } from '../../components/lumora/audio/SilentStreamBanner';
import { useTheme } from '../../hooks/useTheme';
import type { ParsedBlock } from '../../types';
import { dialogConfirm } from '../../components/shared/Dialog';
import { LumoraProfilePage, AssistantsPage } from './lumora-shell/profile-and-assistants';
import { HistoryAnswerViewer, TabLoading } from './lumora-shell/history-viewer';

// Lazy load heavy layouts — only mounted on first tab activation
const CodingLayout = lazy(() => import('../../components/lumora/coding/CodingLayout').then(m => ({ default: m.CodingLayout })));
const DesignLayout = lazy(() => import('../../components/lumora/design/DesignLayout').then(m => ({ default: m.DesignLayout })));

export function LumoraShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // inputValue removed — copilot now manages its own state
  const [blanked, setBlanked] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const { theme: currentTheme, toggle: toggleTheme } = useTheme();
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState<string | undefined>();
  const [copilotFullscreen, setCopilotFullscreen] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<number | null>(null);
  const { handleSubmit, handleCodingSubmit } = useStreamingInterview();
  const { isStreaming, history, question, parsedBlocks, useSearch, setUseSearch, clearHistory, removeHistoryEntry, vadThreshold } = useInterviewStore();
  const [settingsDismissed, setSettingsDismissed] = useState(false);

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
    location.pathname.includes('/behavioral') ? 'behavioral' :
    location.pathname.includes('/prepkit') ? 'prepkit' :
    location.pathname.includes('/calendar') ? 'calendar' :
    location.pathname.includes('/sessions') ? 'sessions' :
    location.pathname.includes('/assistants') ? 'assistants' :
    location.pathname.includes('/profile') ? 'profile' :
    location.pathname.includes('/credits') ? 'credits' :
    location.pathname.includes('/pricing') ? 'pricing' : 'interview';

  const showSettingsHint = !settingsDismissed && typeof vadThreshold === 'number' && vadThreshold <= 0.015 && (activeTab === 'coding' || activeTab === 'design');

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
      if (location.search.includes('q=')) {
        const params = new URLSearchParams(location.search);
        params.delete('q');
        const next = params.toString();
        window.history.replaceState(null, '', location.pathname + (next ? `?${next}` : ''));
      }
    }
  }, [activeTab, location.search, location.pathname]);

  // Trigger Monaco editor resize when switching to coding/design tab
  useEffect(() => {
    if (activeTab === 'coding' || activeTab === 'design') {
      // Monaco needs a resize event to recalculate layout after display:none → flex
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Document title
  useEffect(() => {
    const titles: Record<string, string> = {
      interview: 'Live Interview | Camora',
      coding: 'Coding Interview | Camora',
      design: 'Design Interview | Camora',
      behavioral: 'Behavioral Interview | Camora',
      prepkit: 'Prep Kit | Camora',
      calendar: 'Calendar | Camora',
    };
    document.title = titles[activeTab] || 'Camora';
    return () => { document.title = 'Camora'; };
  }, [activeTab]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const el = e.target as HTMLElement;
      const inEditor = el.closest('.monaco-editor') || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      // Cmd+B: blank screen
      if (isMod && e.key === 'b' && !inEditor) {
        e.preventDefault();
        setBlanked(prev => !prev);
      }
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
  // Separate refs for screenshot captures (review-first, no auto-submit)
  const codingCaptureRef = useRef<((text: string) => void) | null>(null);
  const designCaptureRef = useRef<((text: string) => void) | null>(null);

  const handleTranscription = useCallback((text: string) => {
    if (!text.trim()) return;
    if (activeTab === 'coding' && codingProblemRef.current) {
      codingProblemRef.current(text);
    } else if (activeTab === 'design' && designProblemRef.current) {
      designProblemRef.current(text);
    } else {
      handleSubmit(text);
    }
  }, [handleSubmit, activeTab]);

  const handleCapturedProblem = useCallback((text: string) => {
    if (!text.trim()) return;
    if (activeTab === 'coding' && codingCaptureRef.current) {
      codingCaptureRef.current(text);
    } else if (activeTab === 'design' && designCaptureRef.current) {
      designCaptureRef.current(text);
    }
  }, [activeTab]);

  return (
    <InterviewerAudioProvider onTranscription={handleTranscription}>
    {/* Audio setup wizard — only mounted on live-interview tabs where
        we actually need audio. The wizard auto-opens on first session
        until the user finishes setup, then stays out of the way. */}
    {(activeTab === 'interview' || activeTab === 'behavioral' || activeTab === 'coding' || activeTab === 'design') && <AudioSetupWizard />}
    {(activeTab === 'interview' || activeTab === 'behavioral' || activeTab === 'coding' || activeTab === 'design') && <SilentStreamBanner />}
    {/* Invisible mode overlay — covers everything but audio keeps running underneath */}
    {blanked && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer select-none" style={{ background: '#000000' }} onClick={() => setBlanked(false)}>
        <div className="text-center">
          <div className="opacity-5 mb-4"><CamoraLogo size={24} /></div>
          <p className="text-[10px] opacity-10 text-white">Press ⌘B or click to return</p>
        </div>
      </div>
    )}
    <div className="fixed inset-0 w-full flex overflow-hidden" style={{ background: 'var(--bg-app)' }}>
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
            boxShadow: '0 1px 3px rgba(38,97,156,0.06), 0 4px 16px rgba(38,97,156,0.04)',
          }}
        >
          {/* Mobile-only Camora logo — the desktop LumoraIconRail (which
              hosts the brand mark) is hidden on mobile, so without this
              link users have no way to navigate back to the landing
              page from any /lumora/* screen. */}
          <Link to="/" className="md:hidden flex items-center -ml-1 mr-1" aria-label="Camora — home">
            <CamoraLogo size={26} />
          </Link>

          {/* LEFT — Lumora-specific tab pills. The Camora wordmark used
              to render here too, but the LumoraIconRail already shows
              the brand logo in the corner; rendering it twice on the
              same screen was duplicate brand chrome (per user feedback). */}
          {/* Tab pills — LeetCode treatment: navy hero-strip background
              for the container so the bar pops off the white top
              chrome (the previous bg-elevated tint blended into the
              page), with a thin gold-leaf underline. Active tab
              flips to gold-leaf with dark navy text — same active
              affordance as the SHORT/DETAILED toggle so the
              navigation grammar is consistent across the app. */}
          <div
            className="hidden md:flex items-center gap-1 p-1 rounded-lg shrink-0"
            style={{
              background: 'var(--cam-hero-strip)',
              border: '1px solid var(--cam-primary-dk)',
              boxShadow: 'inset 0 -2px 0 var(--cam-gold-leaf)',
            }}
          >
            {[
              { id: 'interview', label: 'Home', path: '/lumora' },
              { id: 'coding', label: 'Coding', path: '/lumora/coding' },
              { id: 'design', label: 'Design', path: '/lumora/design' },
              { id: 'behavioral', label: 'Behavioral', path: '/lumora/behavioral' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={isActive
                    ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }
                    : { color: 'rgba(255,255,255,0.85)' }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* MIDDLE — page-specific audio controls (only on coding/design).
              Takes the flex grow so it absorbs available space without
              shoving the right-hand controls. */}
          <div className="flex-1 flex items-center min-w-0 justify-center">
            {(activeTab === 'coding' || activeTab === 'design') && !copilotFullscreen && (
              <LumoraTopBar activeTab={activeTab} onTranscription={handleTranscription} onCapturedProblem={handleCapturedProblem} inline />
            )}
          </div>

          {/* RIGHT — Go Invisible always; theme toggle only when the
              inline LumoraTopBar isn't shown (which already has its
              own toggle for coding/design tabs). Avoids the visible
              duplicate user reported. */}
          <div className="flex items-center gap-2 shrink-0">
            {!(activeTab === 'coding' || activeTab === 'design') && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] flex items-center justify-center"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {currentTheme === 'dark' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>
            )}
            {/* Invisible button removed per user request — Cmd+B keyboard
                shortcut and the LumoraIconRail "Go Invisible" menu item
                still trigger the same setBlanked(true) flow. */}

            {/* Mobile hamburger — pinned right, matches SiteNav and TopBar.
                Opens a dropdown with secondary Lumora destinations and
                utilities (theme, audio check). */}
            <button
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
                <strong>Tip:</strong> Open Settings (⚙) to select your microphone and calibrate for best voice detection.
              </span>
            </div>
            <button onClick={() => setSettingsDismissed(true)} className="text-xs font-bold px-2 py-1 rounded hover:opacity-80" style={{ color: 'var(--accent)' }}>Dismiss</button>
          </div>
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
                  <CodingLayout
                    embedded
                    onSubmit={handleCodingSubmit}
                    isLoading={isStreaming}
                    onBack={() => navigate('/lumora')}
                    initialProblem={activeTab === 'coding' ? new URLSearchParams(location.search).get('problem') || '' : ''}
                    onVoiceProblemRef={codingProblemRef}
                    onCapturedProblemRef={codingCaptureRef}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {/* Design tab — lazy mounted, dark theme override */}
          {mountedTabs.has('design') && (
            <div style={{ display: activeTab === 'design' ? 'flex' : 'none' }} className="flex-1 flex flex-col min-h-0 absolute inset-0">
              <ErrorBoundary>
                <Suspense fallback={<TabLoading label="Design" />}>
                  <DesignLayout
                    embedded
                    onBack={() => navigate('/lumora')}
                    initialProblem={activeTab === 'design' ? new URLSearchParams(location.search).get('problem') || '' : ''}
                    onVoiceProblemRef={designProblemRef}
                    onCapturedProblemRef={designCaptureRef}
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
                  borderBottom: '2px solid var(--cam-gold-leaf)',
                }}
              >
                <div className="max-w-3xl mx-auto px-6 py-6 w-full relative">
                  <h2 className="text-3xl font-extrabold mb-2 text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.12)' }}>Sessions</h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Your interview session history — <span className="font-bold" style={{ color: 'var(--cam-gold-leaf-lt)', textShadow: '0 0 14px rgba(217,181,67,0.45)' }}>{history.length}</span> saved.
                  </p>
                </div>
              </div>
              <div className="max-w-3xl mx-auto px-6 py-6 w-full">
                <div className="flex items-end justify-between mb-6">
                  <div>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={async () => {
                        const ok = await dialogConfirm({ title: 'Clear all sessions?', message: 'This will permanently remove every saved session.', confirmLabel: 'Clear all', tone: 'danger' });
                        if (ok) clearHistory();
                      }}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--danger)', border: '1px solid var(--danger)', background: 'var(--bg-surface)' }}
                    >Clear all</button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <div className="relative w-14 h-14 mx-auto mb-3">
                      {/* Outward pulse ring under the icon — invites action */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: 'rgba(38,97,156,0.10)' }}
                      />
                      <svg className="relative w-12 h-12 mx-auto mt-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">No sessions yet</p>
                    <p className="text-xs mt-1">Start an interview to see your history here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {history.slice().reverse().map((entry: any, revIdx: number) => {
                      const realIdx = history.length - 1 - revIdx;
                      return (
                        <div
                          key={realIdx}
                          role="button"
                          tabIndex={0}
                          onClick={() => { setFocusedEntry(realIdx); navigate('/lumora'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusedEntry(realIdx); navigate('/lumora'); } }}
                          className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(38,97,156,0.04) 0%, rgba(34,211,238,0.02) 100%)',
                            border: '1px solid rgba(38,97,156,0.10)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.borderColor = 'rgba(38,97,156,0.32)';
                            e.currentTarget.style.boxShadow = '0 8px 22px rgba(38,97,156,0.16)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(38,97,156,0.10)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <span
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-bold shrink-0"
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
                            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{entry.question}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(entry.timestamp).toLocaleString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFocusedEntry(realIdx); navigate('/lumora'); }}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors shrink-0"
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
                            className="flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors hover:bg-red-50"
                            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dimmed)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                          </button>
                        </div>
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
              <div className="shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '2px solid var(--cam-gold-leaf)' }}>
                <div className="max-w-2xl mx-auto px-6 py-6 w-full">
                  <h2 className="text-3xl font-extrabold mb-2 text-white">Credits & <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Usage</span></h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Track your AI usage and remaining credits.</p>
                </div>
              </div>
              <div className="max-w-2xl mx-auto px-6 py-6 w-full">
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

          {/* Pricing page */}
          {activeTab === 'pricing' && (
            <div className="tab-fade-in flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: 'var(--bg-surface)' }}>
              <div className="shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '2px solid var(--cam-gold-leaf)' }}>
                <div className="max-w-3xl mx-auto px-6 py-6 w-full">
                  <h2 className="text-3xl font-extrabold mb-2 text-white"><span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Pricing</span></h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Manage your subscription and top-ups.</p>
                </div>
              </div>
              <div className="max-w-3xl mx-auto px-6 py-6 w-full">
                <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
                  <SharedPricingCards />
                </Suspense>
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

      {/* AI Copilot — floating popup, hidden when fullscreen behavioral is open */}
      {!copilotFullscreen && (
        <AICompanionPanel
          isOpen={true}
          onClose={() => {}}
        />
      )}

      {/* Mobile bottom navigation — visible only on small screens */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 items-center justify-around"
        style={{ background: 'var(--cam-primary)', borderTop: '1px solid rgba(255,255,255,0.2)', height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { id: 'interview', label: 'Home', path: '/lumora', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
          { id: 'coding', label: 'Code', path: '/lumora/coding', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
          { id: 'design', label: 'Design', path: '/lumora/design', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
          { id: 'prepkit', label: 'Prep', path: '/lumora/prepkit', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Link key={tab.id} to={tab.path} className="relative flex flex-col items-center justify-center gap-1 flex-1 py-1"
              style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>
              {tab.icon}
              <span className="text-[10px] font-bold">{tab.label}</span>
              {isActive && <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b" style={{ background: '#FFFFFF' }} />}
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
            className="absolute right-2 w-[260px] max-w-[90vw] rounded-bl-xl rounded-br-xl"
            style={{ top: 48, background: 'var(--bg-surface)', boxShadow: '0 12px 28px rgba(0,0,0,0.20)', border: '1px solid var(--border)' }}>
            <div className="py-2 max-h-[70vh] overflow-y-auto">
              {[
                { id: 'calendar',   label: 'Calendar',   path: '/lumora/calendar' },
                { id: 'sessions',   label: 'Sessions',   path: '/lumora/sessions' },
                { id: 'assistants', label: 'Assistants', path: '/lumora/assistants' },
                { id: 'profile',    label: 'Profile',    path: '/lumora/profile' },
                { id: 'credits',    label: 'Credits',    path: '/lumora/credits' },
                { id: 'pricing',    label: 'Pricing',    path: '/lumora/pricing' },
              ].map(item => (
                <Link key={item.id} to={item.path} onClick={() => setMobileMoreOpen(false)}
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
