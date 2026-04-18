import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LumoraIconRail } from '../../components/lumora/shell/LumoraIconRail';
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
  // copilotViewIdx removed — copilot now manages its own state
  const [focusedEntry, setFocusedEntry] = useState<number | null>(null);
  const { handleSubmit, handleCodingSubmit } = useStreamingInterview();
  const { isStreaming, history, question, parsedBlocks, useSearch, setUseSearch, clearHistory } = useInterviewStore();

  // Track which tabs have been activated (for lazy mounting)
  const [mountedTabs, setMountedTabs] = useState<Set<LumoraTab>>(new Set(['interview']));

  useLumoraTour();

  // Derive active tab from URL
  const activeTab: LumoraTab =
    location.pathname.includes('/coding') ? 'coding' :
    location.pathname.includes('/design') ? 'design' :
    location.pathname.includes('/prepkit') ? 'prepkit' :
    location.pathname.includes('/calendar') ? 'calendar' : 'interview';

  // Lazy-mount tabs on first activation
  useEffect(() => {
    if (!mountedTabs.has(activeTab)) {
      setMountedTabs(prev => new Set(prev).add(activeTab));
    }
  }, [activeTab, mountedTabs]);

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

  // Blank screen (Cmd+B)
  if (blanked) {
    return (
      <div className="h-screen w-full flex items-center justify-center cursor-pointer" style={{ background: '#000' }} onClick={() => setBlanked(false)}>
        <div className="opacity-10"><CamoraLogo size={24} /></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ background: '#FFFFFF' }}>
      {/* Left icon rail */}
      <LumoraIconRail
        activeTab={activeTab}
        sessionsOpen={sessionsOpen}
        onToggleSessions={() => setSessionsOpen(prev => !prev)}
      />

      {/* Sessions sidebar */}
      <SessionSidebar
        isOpen={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        onSelectEntry={(idx) => setFocusedEntry(idx)}
      />


      {/* Center main area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-16 md:pb-0">
        {/* Top bar with audio controls — only visible on coding and design tabs */}
        {(activeTab === 'coding' || activeTab === 'design') && (
          <LumoraTopBar activeTab={activeTab} onTranscription={handleTranscription} />
        )}

        {/* Tab content — display toggling preserves state */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* Interview tab */}
          <div style={{ display: activeTab === 'interview' ? 'flex' : 'none' }} className="flex-1 flex flex-col min-h-0 absolute inset-0">
            <ErrorBoundary>
              <InterviewPanel
                onAskQuestion={handleSubmit}
                focusedEntry={focusedEntry}
                onClearFocus={() => setFocusedEntry(null)}
                onSwitchToCoding={(p) => navigate(p ? `/lumora/coding?problem=${encodeURIComponent(p)}` : '/lumora/coding')}
                onSwitchToDesign={(p) => navigate(p ? `/lumora/design?problem=${encodeURIComponent(p)}` : '/lumora/design')}
                onViewAnswer={(idx) => { setCopilotViewIdx(idx); setCopilotOpen(true); }}
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
        </div>
      </div>

      {/* AI Copilot — always-visible right sidebar (like Zoom AI Companion) */}
      <AICompanionPanel
        isOpen={true}
        onClose={() => {}}
      />

      {/* Mobile bottom navigation — visible only on small screens */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 items-center justify-around"
        style={{ background: '#2D8CFF', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
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
              style={{ color: isActive ? '#76B900' : 'rgba(255,255,255,0.4)' }}>
              {tab.icon}
              <span className="text-[11px] font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
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
