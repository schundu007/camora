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
  //   anywhere else            → close
  useEffect(() => {
    if (activeTab === 'behavioral') {
      const q = new URLSearchParams(location.search).get('q') || undefined;
      setCopilotQuestion(q);
      setCopilotFullscreen(true);
    } else {
      setCopilotFullscreen(false);
      setCopilotQuestion(undefined);
    }
  }, [activeTab, location.search]);

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
    <>
    {/* Invisible mode overlay — covers everything but audio keeps running underneath */}
    {blanked && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer select-none" style={{ background: '#000' }} onClick={() => setBlanked(false)}>
        <div className="text-center">
          <div className="opacity-5 mb-4"><CamoraLogo size={24} /></div>
          <p className="text-[10px] opacity-10 text-white">Press ⌘B or click to return</p>
        </div>
      </div>
    )}
    <div className="fixed inset-0 w-full flex overflow-hidden" style={{ background: '#F0F7FF' }}>
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
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        {/* Top bar — single row: audio controls (left) + tab pills (right) */}
        <div className="flex items-center justify-center h-11 px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          {/* Audio controls — left side, only on coding/design */}
          {(activeTab === 'coding' || activeTab === 'design') && !copilotFullscreen && (
            <div className="mr-auto">
              <LumoraTopBar activeTab={activeTab} onTranscription={handleTranscription} onCapturedProblem={handleCapturedProblem} inline />
            </div>
          )}

          {/* Tab pills — centered (hidden on mobile where the bottom nav owns tab switching) */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {[
              { id: 'interview', label: 'Home', path: '/lumora' },
              { id: 'coding', label: 'Coding', path: '/lumora/coding' },
              { id: 'design', label: 'Design', path: '/lumora/design' },
              { id: 'behavioral', label: 'Behavioral', path: '/lumora/behavioral' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Link key={tab.id} to={tab.path}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                  style={isActive ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}>
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Go Invisible button — icon-only on mobile to save horizontal room */}
          <button onClick={() => setBlanked(true)} className="ml-auto p-2 md:px-3 md:py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#0F172A] hover:text-white flex items-center gap-1.5" style={{ color: '#64748B', border: '1px solid #E2E8F0' }} title="Go invisible (⌘B) — hides UI, audio keeps running" aria-label="Go invisible">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span className="hidden md:inline">Invisible</span>
          </button>
        </div>

        {/* Settings hint for uncalibrated users */}
        {showSettingsHint && (
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'rgba(59,54,220,0.08)', borderBottom: '1px solid rgba(59,54,220,0.15)' }}>
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
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0">
              <LumoraDocsPanel />
            </div>
          )}

          {/* Calendar tab */}
          {activeTab === 'calendar' && (
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0" style={{ background: '#FFFFFF' }}>
              <LumoraCalendar onClose={() => navigate('/lumora')} />
            </div>
          )}

          {/* Sessions page */}
          {activeTab === 'sessions' && (
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: '#FFFFFF' }}>
              <div className="max-w-3xl mx-auto px-6 py-8 w-full">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Sessions</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your interview session history — {history.length} saved.</p>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={async () => {
                        const ok = await dialogConfirm({ title: 'Clear all sessions?', message: 'This will permanently remove every saved session.', confirmLabel: 'Clear all', tone: 'danger' });
                        if (ok) clearHistory();
                      }}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
                      style={{ color: '#DC2626', border: '1px solid #FCA5A5', background: '#FFFFFF' }}
                    >Clear all</button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <p className="text-sm font-medium">No sessions yet</p>
                    <p className="text-xs mt-1">Start an interview to see your history here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice().reverse().map((entry: any, revIdx: number) => {
                      const realIdx = history.length - 1 - revIdx;
                      return (
                        <div
                          key={realIdx}
                          role="button"
                          tabIndex={0}
                          onClick={() => { setFocusedEntry(realIdx); navigate('/lumora'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusedEntry(realIdx); navigate('/lumora'); } }}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                        >
                          <span className="flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-bold shrink-0"
                            style={{ background: 'rgba(59,54,220,0.08)', color: 'var(--cam-primary)', fontFamily: 'var(--font-code)' }}>
                            {realIdx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: '#0F172A' }}>{entry.question}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{new Date(entry.timestamp).toLocaleString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFocusedEntry(realIdx); navigate('/lumora'); }}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors shrink-0"
                            style={{ color: 'var(--cam-primary-dk)', background: '#CFFAFE', border: '1px solid #A5F3FC' }}
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
                            style={{ color: '#94A3B8', border: '1px solid #E2E8F0' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
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
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: '#FFFFFF' }}>
              <AssistantsPage />
            </div>
          )}

          {/* Profile page */}
          {activeTab === 'profile' && (
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: '#FFFFFF' }}>
              <LumoraProfilePage />
            </div>
          )}

          {/* Credits page */}
          {activeTab === 'credits' && (
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: '#FFFFFF' }}>
              <div className="max-w-2xl mx-auto px-6 py-8 w-full">
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Credits & Usage</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Track your AI usage and remaining credits.</p>
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
            <div className="flex-1 flex flex-col min-h-0 absolute inset-0 overflow-auto" style={{ background: '#FFFFFF' }}>
              <div className="max-w-3xl mx-auto px-6 py-8 w-full">
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Pricing</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Manage your subscription and top-ups.</p>
                <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
                  <SharedPricingCards />
                </Suspense>
              </div>
            </div>
          )}

          {/* AI Assistant — fullscreen mode (behavioral / ask questions) */}
          {copilotFullscreen && (
            <div className="absolute inset-0 z-20 flex flex-col" style={{ background: '#FFFFFF' }}>
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
        style={{ background: 'var(--cam-primary)', borderTop: '1px solid rgba(255,255,255,0.2)', height: 'calc(64px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
              <span className="text-[11px] font-bold">{tab.label}</span>
              {isActive && <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b" style={{ background: '#FFFFFF' }} />}
            </Link>
          );
        })}
        {/* More — opens a bottom sheet with secondary destinations */}
        <button type="button" onClick={() => setMobileMoreOpen(true)} className="relative flex flex-col items-center justify-center gap-1 flex-1 py-1"
          style={{ color: ['calendar','assistants','profile','credits','pricing','sessions'].includes(activeTab) ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}
          aria-label="More" aria-haspopup="menu" aria-expanded={mobileMoreOpen}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          <span className="text-[11px] font-bold">More</span>
          {['calendar','assistants','profile','credits','pricing','sessions'].includes(activeTab) && <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b" style={{ background: '#FFFFFF' }} />}
        </button>
      </div>

      {/* Mobile "More" sheet — secondary Lumora destinations (calendar, assistants, profile, credits, sessions, pricing) */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setMobileMoreOpen(false)} role="dialog" aria-modal="true" aria-label="More menu">
          <div className="flex-1" style={{ background: 'rgba(0,0,0,0.35)' }} />
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-t-2xl overflow-hidden animate-slide-in-up" style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -8px 24px rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
              <span className="text-sm font-bold" style={{ color: '#0F172A' }}>More</span>
              <button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#64748B' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="py-2">
              {[
                { id: 'calendar',   label: 'Calendar',   path: '/lumora/calendar' },
                { id: 'sessions',   label: 'Sessions',   path: '/lumora/sessions' },
                { id: 'assistants', label: 'Assistants', path: '/lumora/assistants' },
                { id: 'profile',    label: 'Profile',    path: '/lumora/profile' },
                { id: 'credits',    label: 'Credits',    path: '/lumora/credits' },
                { id: 'pricing',    label: 'Pricing',    path: '/lumora/pricing' },
              ].map(item => (
                <Link key={item.id} to={item.path} onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-[14px] font-semibold active:bg-[#F1F5F9]"
                  style={{ color: activeTab === item.id ? 'var(--cam-primary)' : '#0F172A' }}>
                  <span>{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default LumoraShellPage;
