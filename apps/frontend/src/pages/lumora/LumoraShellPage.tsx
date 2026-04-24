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

// Lazy load heavy layouts — only mounted on first tab activation
const CodingLayout = lazy(() => import('../../components/lumora/coding/CodingLayout').then(m => ({ default: m.CodingLayout })));
const DesignLayout = lazy(() => import('../../components/lumora/design/DesignLayout').then(m => ({ default: m.DesignLayout })));

export function LumoraShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // inputValue removed — copilot now manages its own state
  const [blanked, setBlanked] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState<string | undefined>();
  const [copilotFullscreen, setCopilotFullscreen] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<number | null>(null);
  const { handleSubmit, handleCodingSubmit } = useStreamingInterview();
  const { isStreaming, history, question, parsedBlocks, useSearch, setUseSearch, clearHistory, vadThreshold } = useInterviewStore();
  const [settingsDismissed, setSettingsDismissed] = useState(false);
  const showSettingsHint = !settingsDismissed && vadThreshold <= 0.015 && (activeTab === 'coding' || activeTab === 'design');

  // Track which tabs have been activated (for lazy mounting)
  const [mountedTabs, setMountedTabs] = useState<Set<LumoraTab>>(new Set(['interview']));

  useLumoraTour();

  // Derive active tab from URL
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

  // Lazy-mount tabs on first activation
  useEffect(() => {
    if (!mountedTabs.has(activeTab)) {
      setMountedTabs(prev => new Set(prev).add(activeTab));
    }
  }, [activeTab, mountedTabs]);

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
        if (confirm('Clear all history?')) clearHistory();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [useSearch, setUseSearch, clearHistory]);

  // Refs for coding/design problem setters — set by child layouts
  const codingProblemRef = useRef<((text: string) => void) | null>(null);
  const designProblemRef = useRef<((text: string) => void) | null>(null);

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

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-16 md:pb-0">
        {/* Top bar — single row: audio controls (left) + tab pills (right) */}
        <div className="flex items-center justify-center h-11 px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          {/* Audio controls — left side, only on coding/design */}
          {(activeTab === 'coding' || activeTab === 'design') && !copilotFullscreen && (
            <div className="mr-auto">
              <LumoraTopBar activeTab={activeTab} onTranscription={handleTranscription} inline />
            </div>
          )}

          {/* Tab pills — centered */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
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

          {/* Go Invisible button */}
          <button onClick={() => setBlanked(true)} className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#0F172A] hover:text-white flex items-center gap-1.5" style={{ color: '#64748B', border: '1px solid #E2E8F0' }} title="Go invisible (⌘B) — hides UI, audio keeps running">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            Invisible
          </button>
        </div>

        {/* Settings hint for uncalibrated users */}
        {showSettingsHint && (
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'rgba(34,211,238,0.08)', borderBottom: '1px solid rgba(34,211,238,0.15)' }}>
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
                focusedEntry={focusedEntry}
                onClearFocus={() => setFocusedEntry(null)}
                onSwitchToCoding={(p) => navigate(p ? `/lumora/coding?problem=${encodeURIComponent(p)}` : '/lumora/coding')}
                onSwitchToDesign={(p) => navigate(p ? `/lumora/design?problem=${encodeURIComponent(p)}` : '/lumora/design')}
                onViewAnswer={() => { setCopilotOpen(true); }}
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
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Sessions</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Your interview session history.</p>
                {history.length === 0 ? (
                  <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <p className="text-sm font-medium">No sessions yet</p>
                    <p className="text-xs mt-1">Start an interview to see your history here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice().reverse().map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{entry.question}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(entry.timestamp).toLocaleString()}</p>
                        </div>
                        <button onClick={() => { setFocusedEntry(history.length - 1 - idx); navigate('/lumora'); }} className="text-xs px-3 py-1 rounded-lg" style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}>View</button>
                      </div>
                    ))}
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
                          <span className="truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{e.question}</span>
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

          {/* Icicle AI — fullscreen mode (behavioral / ask questions) */}
          {copilotFullscreen && (
            <div className="absolute inset-0 z-20 flex flex-col" style={{ background: '#FFFFFF' }}>
              <AICompanionPanel isOpen={true} onClose={() => navigate('/lumora')} initialQuestion={copilotQuestion} embedded />
            </div>
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
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 items-center justify-around"
        style={{ background: '#22D3EE', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        {[
          { id: 'interview', label: 'Home', path: '/lumora', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
          { id: 'coding', label: 'Code', path: '/lumora/coding', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
          { id: 'design', label: 'Design', path: '/lumora/design', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
          { id: 'prepkit', label: 'Prep', path: '/lumora/prepkit', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
          { id: 'calendar', label: 'Cal', path: '/lumora/calendar', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Link key={tab.id} to={tab.path} className="flex flex-col items-center justify-center gap-1 flex-1 py-1"
              style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>
              {tab.icon}
              <span className="text-[11px] font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
    </>
  );
}

/* ── Format plain text into readable HTML ── */
function FormatTextPreview({ text, label }: { text: string; label: string }) {
  if (!text) return null;
  // Clean up and parse text into structured sections
  const raw = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s*\|\s*/g, '\n').replace(/\t+/g, '\n');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Group lines into sections
  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } = { title: '', items: [] };

  lines.forEach(line => {
    const isHeader = (line === line.toUpperCase() && line.length < 80 && line.length > 2 && /[A-Z]{2}/.test(line))
      || (line.endsWith(':') && line.length < 50)
      || /^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|PROJECTS|CERTIFICATIONS|ABOUT|REQUIREMENTS|RESPONSIBILITIES|QUALIFICATIONS|BENEFITS|DESCRIPTION|OVERVIEW)/i.test(line);
    if (isHeader) {
      if (currentSection.title || currentSection.items.length) sections.push(currentSection);
      currentSection = { title: line.replace(/:$/, ''), items: [] };
    } else {
      currentSection.items.push(line);
    }
  });
  if (currentSection.title || currentSection.items.length) sections.push(currentSection);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #F8FAFC, #EFF6FF)', borderBottom: '1px solid #E2E8F0' }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{label}</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: '#E0F2FE', color: '#0284C7' }}>{lines.length} lines</span>
      </div>
      <div className="px-4 py-3 max-h-[500px] overflow-auto text-[13px] leading-[1.8]" style={{ color: '#334155' }}>
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.title && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ background: '#22D3EE' }} />
                <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#0F172A' }}>{section.title}</h4>
              </div>
            )}
            {section.items.map((item, ii) => {
              const isBullet = /^[-•●○▪▸►✓✔★]/.test(item) || /^\d+[.)]/.test(item);
              const kvMatch = item.match(/^([A-Za-z\s&/,()]+?):\s+(.+)$/);
              const cleaned = item.replace(/^[-•●○▪▸►✓✔★]\s*/, '').replace(/^\d+[.)]\s*/, '');

              if (isBullet) return (
                <div key={ii} className="flex gap-2 ml-3 mb-1">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#22D3EE' }} />
                  <span>{cleaned}</span>
                </div>
              );
              if (kvMatch && kvMatch[1].length < 30) return (
                <div key={ii} className="mb-1 ml-3">
                  <span className="font-semibold" style={{ color: '#0F172A' }}>{kvMatch[1]}:</span>
                  <span className="ml-1">{kvMatch[2]}</span>
                </div>
              );
              // Regular paragraph — check if it looks like a job title or company
              const isTitle = item.length < 60 && /\b(Engineer|Manager|Developer|Director|Lead|Senior|Junior|Intern|Analyst|Designer|Architect)\b/i.test(item);
              if (isTitle) return <p key={ii} className="font-semibold mt-2 mb-0.5" style={{ color: '#0F172A' }}>{item}</p>;
              return <p key={ii} className="mb-1">{item}</p>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Editable text field with preview toggle ── */
function TextFieldWithPreview({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [previewing, setPreviewing] = useState(false);
  const iS: React.CSSProperties = { border: '1px solid #E2E8F0', outline: 'none', background: '#fff' };
  return previewing && value ? (
    <div>
      <button onClick={() => setPreviewing(false)} className="text-[9px] font-semibold mb-1 px-2 py-0.5 rounded" style={{ color: '#29B5E8', border: '1px solid #E2E8F0' }}>Edit</button>
      <FormatTextPreview text={value} label={label} />
    </div>
  ) : (
    <div>
      {value && <button onClick={() => setPreviewing(true)} className="text-[9px] font-semibold mb-1 px-2 py-0.5 rounded" style={{ color: '#29B5E8', border: '1px solid #E2E8F0' }}>Preview</button>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} className="w-full px-3 py-2 rounded-lg text-sm" style={{ ...iS, resize: 'vertical' as const }} />
    </div>
  );
}

/* ── File text extractor — handles .txt, .docx, .pdf ── */
async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt')) {
    return (await file.text()).trim();
  }
  if (name.endsWith('.docx')) {
    // DOCX = ZIP containing word/document.xml with <w:p> paragraphs and <w:t> text runs
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const docXml = await zip.file('word/document.xml')?.async('text');
    if (!docXml) throw new Error('Invalid DOCX');
    // Extract text preserving paragraph structure
    const paragraphs: string[] = [];
    // Split on paragraph tags <w:p ...> ... </w:p>
    const pMatches = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
    for (const p of pMatches) {
      // Extract all <w:t> text content within this paragraph
      const texts: string[] = [];
      const tMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      for (const t of tMatches) {
        const content = t.replace(/<[^>]+>/g, '');
        if (content) texts.push(content);
      }
      const line = texts.join('').trim();
      if (line) paragraphs.push(line);
    }
    // Decode HTML entities
    return paragraphs.join('\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
  if (name.endsWith('.pdf')) {
    // PDF: read as text and strip non-printable chars (basic extraction)
    const raw = await file.text();
    return raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return (await file.text()).trim();
}

/* ── Lumora Profile Page ── */
function LumoraProfilePage() {
  const { user, subscription, logout } = useAuth();
  const plan = subscription?.plan || 'free';
  const planLabel = plan === 'free' ? 'Free' : plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 w-full">
      {/* User header */}
      <div className="flex items-center gap-4 mb-8">
        {user?.image ? (
          <img src={user.image} alt="" className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white" style={{ background: '#22D3EE' }}>
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>{user?.name || 'User'}</h2>
          <p className="text-sm" style={{ color: '#64748B' }}>{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Account */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Account</div>
          <div className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Email</span>
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Name</span>
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>{user?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Plan</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: plan === 'free' ? '#F1F5F9' : 'rgba(34,211,238,0.1)', color: plan === 'free' ? '#64748B' : '#22D3EE' }}>{planLabel}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Status</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>{subscription?.status || 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Preferences</div>
          <div className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-medium block" style={{ color: '#0F172A' }}>AI Model</span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>Model used for real-time answers</span>
              </div>
              <select className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
                <option>Auto (Recommended)</option>
                <option>Claude Sonnet 4</option>
                <option>Claude Opus 4</option>
                <option>Claude Haiku</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-medium block" style={{ color: '#0F172A' }}>Answer Mode</span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>Short for live interviews, detailed for practice</span>
              </div>
              <select className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
                <option>Short</option>
                <option>Detailed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Quick Links</div>
          <div className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            <Link to="/lumora/pricing" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>Manage Subscription</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
            <Link to="/lumora/credits" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>Credits & Usage</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
            <Link to="/lumora/assistants" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>Interview Assistants</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={logout} className="w-full text-center py-3 text-xs font-semibold rounded-xl transition-colors hover:bg-red-50" style={{ color: '#EF4444', border: '1px solid #FEE2E2' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ── Assistants Page — Role + Resume + JD based ── */
interface Assistant {
  id: string;
  name: string;
  role: string;
  company: string;
  model: string;
  resume: string;
  jobDescription: string;
  stories?: import('../../lib/lumora-assistant').LumoraStory[];
  storyParseStatus?: 'idle' | 'parsing' | 'done' | 'failed';
  createdAt: string;
}

const AI_MODELS = [
  { value: 'claude-sonnet', label: 'Claude Sonnet 4', provider: 'Anthropic', color: '#D97706' },
  { value: 'claude-opus', label: 'Claude Opus 4', provider: 'Anthropic', color: '#D97706' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', color: '#10B981' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI', color: '#10B981' },
  { value: 'o3-mini', label: 'o3-mini', provider: 'OpenAI', color: '#10B981' },
];

function AssistantsPage() {
  const { token } = useAuth();
  const LUMORA_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
  const [assistants, setAssistants] = useState<Assistant[]>(() => {
    try { return JSON.parse(localStorage.getItem('lumora_assistants') || '[]'); } catch { return []; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', company: '', model: 'claude-sonnet', resume: '', jobDescription: '' });
  const save = (list: Assistant[]) => { setAssistants(list); localStorage.setItem('lumora_assistants', JSON.stringify(list)); };

  /** Kick off resume → Story Bank extraction in the background. Updates the
   *  assistant row's storyParseStatus + stories when done. */
  const parseStories = async (assistantId: string, resume: string) => {
    if (!resume.trim() || !token) return;
    // Mark as parsing first — let UI show a spinner
    setAssistants(prev => {
      const next = prev.map(a => a.id === assistantId ? { ...a, storyParseStatus: 'parsing' as const } : a);
      localStorage.setItem('lumora_assistants', JSON.stringify(next));
      return next;
    });
    try {
      const r = await fetch(`${LUMORA_API}/api/v1/stories/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resume }),
      });
      const data = await r.json();
      setAssistants(prev => {
        const next = prev.map(a => a.id === assistantId
          ? { ...a, stories: Array.isArray(data?.stories) ? data.stories : [], storyParseStatus: (r.ok ? 'done' : 'failed') as 'done' | 'failed' }
          : a);
        localStorage.setItem('lumora_assistants', JSON.stringify(next));
        return next;
      });
    } catch {
      setAssistants(prev => {
        const next = prev.map(a => a.id === assistantId ? { ...a, storyParseStatus: 'failed' as const } : a);
        localStorage.setItem('lumora_assistants', JSON.stringify(next));
        return next;
      });
    }
  };

  const create = () => {
    if (!form.company.trim() && !form.role.trim()) return;
    const id = Date.now().toString();
    const newAssistant: Assistant = {
      id,
      name: form.name.trim() || (form.company || 'Interview') + ' — ' + (form.role || 'General'),
      role: form.role.trim(),
      company: form.company.trim(),
      model: form.model,
      resume: form.resume.trim(),
      jobDescription: form.jobDescription.trim(),
      createdAt: new Date().toISOString(),
      storyParseStatus: form.resume.trim() ? 'parsing' : 'idle',
    };
    save([newAssistant, ...assistants]);
    setForm({ name: '', role: '', company: '', model: 'claude-sonnet', resume: '', jobDescription: '' });
    setShowCreate(false);
    // Fire-and-forget story extraction
    if (newAssistant.resume) parseStories(id, newAssistant.resume);
  };
  const remove = (id: string) => { if (confirm('Delete this assistant?')) save(assistants.filter(a => a.id !== id)); };
  const iS: React.CSSProperties = { border: '1px solid #E2E8F0', outline: 'none', background: '#fff' };
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Interview Assistants</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg" style={{ background: '#29B5E8' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          New
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: '#64748B' }}>Add your resume and job description so AI personalizes answers to your background during live interviews.</p>
      {showCreate && (
        <div className="mb-6 p-5 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" className="px-3 py-2 rounded-lg text-sm" style={iS} />
            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" className="px-3 py-2 rounded-lg text-sm" style={iS} />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (auto)" className="px-3 py-2 rounded-lg text-sm" style={iS} />
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>AI Model</label>
            <div className="flex gap-2">{AI_MODELS.map(m => (
              <button key={m.value} onClick={() => setForm(f => ({ ...f, model: m.value }))} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ border: form.model === m.value ? '2px solid ' + m.color : '1px solid #E2E8F0', color: form.model === m.value ? m.color : '#64748B', background: form.model === m.value ? m.color + '08' : '#fff' }}>{m.label}</button>
            ))}</div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Your Resume</label>
              <label className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors hover:bg-[#F1F5F9]" style={{ color: '#29B5E8', border: '1px solid #E2E8F0' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                Upload
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const text = await extractTextFromFile(file);
                    setForm(f => ({ ...f, resume: text }));
                  } catch { alert('Could not read file. Please paste text directly.'); }
                  e.target.value = '';
                }} />
              </label>
            </div>
            <TextFieldWithPreview value={form.resume} onChange={v => setForm(f => ({ ...f, resume: v }))} placeholder="Paste resume text or upload a file. AI will reference your experience to craft personalized answers." label="Resume Preview" />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Job Description</label>
              <label className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors hover:bg-[#F1F5F9]" style={{ color: '#29B5E8', border: '1px solid #E2E8F0' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                Upload
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const text = await extractTextFromFile(file);
                    setForm(f => ({ ...f, jobDescription: text }));
                  } catch { alert('Could not read file. Please paste text directly.'); }
                  e.target.value = '';
                }} />
              </label>
            </div>
            <TextFieldWithPreview value={form.jobDescription} onChange={v => setForm(f => ({ ...f, jobDescription: v }))} placeholder="Paste the JD or upload a file. AI will tailor answers to match role requirements." label="Job Description Preview" />
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={!form.company.trim() && !form.role.trim()} className="px-5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: '#29B5E8' }}>Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-semibold rounded-lg" style={{ color: '#64748B', border: '1px solid #E2E8F0' }}>Cancel</button>
          </div>
        </div>
      )}
      {assistants.length === 0 && !showCreate ? (
        <div className="text-center py-16 rounded-xl" style={{ border: '2px dashed #E2E8F0' }}>
          <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No assistants yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#94A3B8' }}>Add your resume + job description for personalized AI answers.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-xs font-semibold text-white rounded-lg" style={{ background: '#29B5E8' }}>Create Your First Assistant</button>
        </div>
      ) : (
        <div className="space-y-3">{assistants.map(a => {
          const mi = AI_MODELS.find(m => m.value === a.model);
          return (
            <div key={a.id} className="p-4 rounded-xl hover:shadow-sm transition-all" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(41,181,232,0.1)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{a.name}</p>
                    <p className="text-[11px]" style={{ color: '#94A3B8' }}>{a.company}{a.company && a.role ? ' · ' : ''}{a.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: (mi?.color || '#29B5E8') + '10', color: mi?.color || '#29B5E8' }}>{mi?.label || a.model}</span>
                  <Link to="/lumora" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: '#29B5E8' }}>Launch</Link>
                  <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: '#94A3B8' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></button>
                </div>
              </div>
              {(a.resume || a.jobDescription) && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                {a.resume && <FormatTextPreview text={a.resume} label="Resume" />}
                {a.jobDescription && <FormatTextPreview text={a.jobDescription} label="Job Description" />}
              </div>}

              {a.resume && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#0E7490' }}>Story Bank</span>
                    {a.storyParseStatus === 'parsing' && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: '#64748B' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22D3EE' }} />
                        Parsing resume…
                      </span>
                    )}
                    {a.storyParseStatus === 'failed' && (
                      <button onClick={() => parseStories(a.id, a.resume)} className="text-[10px] font-semibold underline" style={{ color: '#B91C1C' }}>
                        Parse failed — retry
                      </button>
                    )}
                    {a.storyParseStatus === 'done' && a.stories && (
                      <span className="text-[10px]" style={{ color: '#64748B' }}>· {a.stories.length} stories extracted</span>
                    )}
                  </div>
                  {a.stories && a.stories.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {a.stories.map(s => (
                        <div key={s.id} className="flex items-start gap-2 text-[11px]">
                          <div className="flex flex-wrap gap-0.5 shrink-0 pt-0.5">
                            {s.archetypes.map(t => (
                              <span key={t} className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: '#22D3EE', color: '#FFFFFF' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold" style={{ color: '#0F172A' }}>{s.title}</p>
                            <p className="text-[10px]" style={{ color: '#64748B' }}>{s.summary}{s.impact ? <span style={{ color: '#0E7490' }}> · {s.impact}</span> : null}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.storyParseStatus !== 'parsing' && (!a.stories || a.stories.length === 0) && a.storyParseStatus !== 'failed' && (
                    <button onClick={() => parseStories(a.id, a.resume)} className="text-[10px] font-semibold underline" style={{ color: '#22D3EE' }}>
                      Extract stories from resume
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}</div>
      )}
    </div>
  );
}

function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400" style={{ fontFamily: 'var(--font-sans)' }}>Loading {label}...</span>
      </div>
    </div>
  );
}

export default LumoraShellPage;
