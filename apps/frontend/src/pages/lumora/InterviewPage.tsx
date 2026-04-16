import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { SessionSidebar } from '../../components/lumora/interview/SessionSidebar';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';
import { useAuth } from '../../contexts/AuthContext';
import { AudioCapture, SystemAudioButton } from '../../components/lumora/audio/AudioCapture';
import { MicrophoneSelector } from '../../components/lumora/audio/MicrophoneSelector';
import { DocumentUpload } from '../../components/lumora/documents/DocumentUpload';
import { useLumoraTour } from '../../hooks/useLumoraTour';
import CamoraLogo from '../../components/shared/CamoraLogo';

/* ─── Types ──────────────────────────────────────────────── */
type TabType = 'interview' | 'coding' | 'design';

const TAB_ROUTES: Record<TabType, string> = {
  interview: '/lumora',
  coding: '/lumora/coding',
  design: '/lumora/design',
};

/* ─── Left Sidebar Nav (Zoom-style icon rail) ────────────── */
function LeftNav({ currentTab, sidebarOpen, onToggleSidebar }: { currentTab: TabType; sidebarOpen: boolean; onToggleSidebar: () => void }) {
  const navItems: { id: TabType | 'history'; icon: React.ReactNode; label: string; path?: string }[] = [
    {
      id: 'interview', label: 'Interview', path: '/lumora',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    },
    {
      id: 'coding', label: 'Coding', path: '/lumora/coding',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>,
    },
    {
      id: 'design', label: 'Design', path: '/lumora/design',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
    },
  ];

  return (
    <nav className="flex flex-col items-center w-[68px] shrink-0 py-4 gap-1" style={{ background: '#0a0a12', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <Link to="/" className="flex items-center justify-center w-10 h-10 mb-4 rounded-xl transition-colors hover:bg-white/5" title="Home">
        <CamoraLogo size={28} />
      </Link>

      {/* Nav items */}
      {navItems.map((item) => {
        const isActive = item.id === currentTab;
        return item.path ? (
          <Link
            key={item.id}
            to={item.path}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all group relative"
            style={isActive ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8' } : { color: 'rgba(255,255,255,0.4)' }}
            title={item.label}
          >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />}
            <span className="transition-colors group-hover:text-white/80">{item.icon}</span>
            <span className="text-[9px] font-semibold mt-0.5 tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>{item.label}</span>
          </Link>
        ) : null;
      })}

      {/* Divider */}
      <div className="w-8 h-px bg-white/6 my-2" />

      {/* History toggle */}
      <button
        onClick={onToggleSidebar}
        className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all group"
        style={sidebarOpen ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8' } : { color: 'rgba(255,255,255,0.4)' }}
        title="History"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        <span className="text-[9px] font-semibold mt-0.5 tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>History</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <Link
        to="/capra/prepare"
        className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all group"
        style={{ color: 'rgba(255,255,255,0.3)' }}
        title="Dashboard"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        <span className="text-[9px] font-semibold mt-0.5 tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>Home</span>
      </Link>
    </nav>
  );
}

/* ─── Top Header Bar (Zoom-style) ────────────────────────── */
function TopBar({ onTranscription }: { onTranscription?: (text: string) => void }) {
  const { user, logout } = useAuth();
  const { status, useSearch, setUseSearch, clearHistory } = useInterviewStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center h-12 px-4 shrink-0 z-30" style={{ background: '#0e0d16', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Left: context / breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white/90" style={{ fontFamily: 'var(--font-sans)' }}>Live Interview</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-medium">AI</span>
      </div>

      {/* Center: audio controls strip */}
      <div className="flex-1 flex items-center justify-center gap-1">
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <MicrophoneSelector disabled={false} />
          <div className="w-px h-4 bg-white/8 mx-1" />
          <AudioCapture onTranscription={onTranscription} />
          <div className="w-px h-4 bg-white/8 mx-1" />
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />
          <div className="w-px h-4 bg-white/8 mx-1" />
          <DocumentUpload />
        </div>
      </div>

      {/* Right: status + actions + user */}
      <div className="flex items-center gap-3">
        {/* Status */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' :
            'bg-white/20'
          }`} style={status.state === 'ready' ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
          <span className="text-[11px] font-medium text-white/50" style={{ fontFamily: 'var(--font-sans)' }}>{status.message}</span>
        </div>

        {/* Search */}
        <button onClick={() => setUseSearch(!useSearch)} className="p-2 rounded-lg transition-all hover:bg-white/5"
          style={useSearch ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: 'rgba(255,255,255,0.35)' }} title="Toggle search (⌘S)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        </button>

        {/* Reset */}
        <button onClick={() => { if (confirm('Clear all history?')) clearHistory(); }} className="p-2 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.35)' }} title="Reset (⌘⌫)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
        </button>

        {/* User avatar */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:ring-2 hover:ring-indigo-400/30" title={user?.email || ''}>
            {user?.image ? (
              <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>{initials}</div>
            )}
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: '#1a1926', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-white/40 truncate mt-0.5">{user?.email}</p>
                </div>
                <Link to="/pricing" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 transition-colors">Pricing</Link>
                <Link to="/capra/prepare" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 transition-colors">Dashboard</Link>
                <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">Sign Out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Composer Bar ───────────────────────────────────────── */
function ComposerBar({ inputValue, setInputValue, onSubmit, isStreaming, showEmptyState }: {
  inputValue: string; setInputValue: (v: string) => void; onSubmit: () => void; isStreaming: boolean; showEmptyState: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { history } = useInterviewStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isExpanded) textareaRef.current?.focus();
        else inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded]);

  if (isExpanded) {
    return (
      <div className="shrink-0 px-4 pb-3 pt-1 relative z-20">
        <div className="absolute -top-10 left-0 right-0 h-10 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg-app), transparent)' }} />
        <div className="mx-auto rounded-2xl overflow-hidden" style={{ maxWidth: '800px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(); }}
            placeholder="Paste a coding problem, system design question, or multi-line prompt..."
            className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/25 px-5 py-4 resize-none focus:outline-none"
            style={{ fontFamily: 'var(--font-sans)', minHeight: 100, maxHeight: 240 }}
            autoFocus
          />
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[11px] text-white/25" style={{ fontFamily: 'var(--font-code)' }}>{inputValue.length > 0 ? `${inputValue.length} chars` : '⌘+Enter to send'}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsExpanded(false)} className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">Collapse</button>
              <button onClick={() => { onSubmit(); setIsExpanded(false); }} disabled={!inputValue.trim() || isStreaming}
                className="px-5 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-30 transition-all"
                style={{ background: inputValue.trim() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)', boxShadow: inputValue.trim() ? '0 2px 12px rgba(99,102,241,0.3)' : 'none' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 relative z-20">
      <div className="absolute -top-10 left-0 right-0 h-10 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg-app), transparent)' }} />
      <div className="px-4 pb-3 pt-1">
        <div className="mx-auto" style={{ maxWidth: '800px' }}>
          <div className="flex items-center gap-3 rounded-2xl px-5 h-[52px] transition-all focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_0_24px_rgba(99,102,241,0.08)]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
            {/* Pencil icon like Zoom */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>

            {isStreaming && (
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" style={{ boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
            )}
            <input
              ref={inputRef}
              data-tour="input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
              placeholder={isStreaming ? 'AI is generating...' : showEmptyState ? 'Write a message or type / for more' : 'Ask a follow-up question...'}
              className="flex-1 bg-transparent text-white/90 text-sm placeholder:text-white/30 focus:outline-none min-w-0"
              style={{ fontFamily: 'var(--font-sans)' }}
              disabled={isStreaming}
            />
            <button onClick={() => { setIsExpanded(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors shrink-0" title="Expand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            </button>
            {inputValue.trim() && !isStreaming && (
              <button onClick={onSubmit} className="w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
          {/* Disclaimer like Zoom */}
          <p className="text-center text-[10px] text-white/15 mt-2" style={{ fontFamily: 'var(--font-sans)' }}>AI can make mistakes. Review for accuracy.</p>
        </div>
      </div>

      {/* Status bar */}
      <div className="hidden sm:flex items-center justify-between h-7 px-4" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} style={!isStreaming ? { boxShadow: '0 0 4px rgba(52,211,153,0.4)' } : {}} />
          <span className="text-[10px] font-medium text-white/30" style={{ fontFamily: 'var(--font-code)' }}>{isStreaming ? 'Generating...' : 'Ready'}</span>
        </div>
        {history.length > 0 && (
          <span className="text-[10px] text-white/20" style={{ fontFamily: 'var(--font-code)' }}>{history.length} Q&A</span>
        )}
        <div className="flex items-center gap-3 text-[10px] text-white/20" style={{ fontFamily: 'var(--font-code)' }}>
          <span><kbd className="px-1 py-0.5 rounded border border-white/8 bg-white/3 text-white/30">⌘M</kbd> mic</span>
          <span><kbd className="px-1 py-0.5 rounded border border-white/8 bg-white/3 text-white/30">⌘K</kbd> focus</span>
          <span><kbd className="px-1 py-0.5 rounded border border-white/8 bg-white/3 text-white/30">⌘B</kbd> blank</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export function InterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [blanked, setBlanked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<number | null>(null);
  const { handleSubmit } = useStreamingInterview();
  const { isStreaming, history, question, parsedBlocks } = useInterviewStore();

  useLumoraTour();

  const currentTab: TabType =
    location.pathname?.includes('/coding') ? 'coding' :
    location.pathname?.includes('/design') ? 'design' :
    'interview';

  useEffect(() => {
    document.title = 'Live Interview | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  // Emergency blank: Cmd+B
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        const el = e.target as HTMLElement;
        if (el.closest('.monaco-editor') || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setBlanked(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleInputSubmit = useCallback(() => {
    if (inputValue.trim()) {
      handleSubmit(inputValue);
      setInputValue('');
    }
  }, [inputValue, handleSubmit]);

  const handleTranscription = useCallback((text: string) => {
    if (text.trim()) handleSubmit(text);
  }, [handleSubmit]);

  if (blanked) {
    return (
      <div className="h-screen w-full flex items-center justify-center cursor-pointer" style={{ background: '#000' }} onClick={() => setBlanked(false)}>
        <div className="opacity-10">
          <CamoraLogo size={24} />
        </div>
      </div>
    );
  }

  const showEmptyState = !question && !isStreaming && parsedBlocks.length === 0 && history.length === 0;

  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ background: 'var(--bg-app, #0D0C14)' }}>
      {/* Left icon nav — Zoom-style */}
      <LeftNav currentTab={currentTab} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      {/* History sidebar (slides in) */}
      <SessionSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectEntry={(idx) => setFocusedEntry(idx)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top bar */}
        <TopBar onTranscription={handleTranscription} />

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ErrorBoundary>
            <InterviewPanel
              onAskQuestion={handleSubmit}
              focusedEntry={focusedEntry}
              onClearFocus={() => setFocusedEntry(null)}
              onSwitchToCoding={(problem) => {
                navigate(problem ? `/lumora/coding?problem=${encodeURIComponent(problem)}` : '/lumora/coding');
              }}
              onSwitchToDesign={(problem) => {
                navigate(problem ? `/lumora/design?problem=${encodeURIComponent(problem)}` : '/lumora/design');
              }}
            />
          </ErrorBoundary>

          {/* Composer */}
          <ComposerBar
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSubmit={handleInputSubmit}
            isStreaming={isStreaming}
            showEmptyState={showEmptyState}
          />
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
