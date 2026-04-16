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
import { StreamingAnswer } from '../../components/lumora/interview/StreamingAnswer';
import { AnswerBlocks } from '../../components/lumora/interview/AnswerBlocks';
import { useLumoraTour } from '../../hooks/useLumoraTour';
import CamoraLogo from '../../components/shared/CamoraLogo';

type TabType = 'interview' | 'coding' | 'design';

/* ═══════════════════════════════════════════════════════════════
   LEFT NAV — Zoom-style icon rail
   ═══════════════════════════════════════════════════════════════ */
function LeftNav({ currentTab, sidebarOpen, onToggleSidebar }: { currentTab: TabType; sidebarOpen: boolean; onToggleSidebar: () => void }) {
  const [showMore, setShowMore] = useState(false);

  const navItems: { id: string; label: string; path: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'interview', label: 'Home', path: '/lumora',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { id: 'history', label: 'Sessions', path: '#',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { id: 'coding', label: 'Coding', path: '/lumora/coding',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg> },
    { id: 'design', label: 'Design', path: '/lumora/design',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> },
  ];

  const moreItems = [
    { label: 'Prepare', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, path: '/capra/prepare' },
    { label: 'Practice', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>, path: '/capra/practice' },
    { label: 'Jobs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>, path: '/jobs' },
    { label: 'Handbook', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>, path: '/handbook' },
    { label: 'Pricing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>, path: '/pricing' },
    { label: 'Analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>, path: '/analytics' },
  ];

  return (
    <nav className="hidden md:flex flex-col items-center w-[68px] shrink-0 py-3 gap-0.5" style={{ background: '#0c0b15', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <Link to="/" className="flex items-center justify-center w-full h-10 mb-3" title="Camora">
        <CamoraLogo size={26} />
      </Link>

      {navItems.map((item) => {
        const isActive = item.id === currentTab || (item.id === 'history' && sidebarOpen);
        const isHistory = item.id === 'history';
        const El = isHistory ? 'button' : Link;
        const props = isHistory
          ? { onClick: onToggleSidebar } as any
          : { to: item.path } as any;

        return (
          <El key={item.id} {...props}
            className="flex flex-col items-center justify-center w-[58px] h-[52px] rounded-xl transition-all group relative"
            style={isActive ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8' } : { color: 'rgba(255,255,255,0.45)' }}
            title={item.label}>
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />}
            <span className="transition-colors group-hover:text-white/80">{item.icon}</span>
            <span className="text-[9px] font-semibold mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>{item.label}</span>
          </El>
        );
      })}

      {/* More button with popover */}
      <div className="relative">
        <button onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center justify-center w-[58px] h-[52px] rounded-xl transition-all group"
          style={showMore ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8' } : { color: 'rgba(255,255,255,0.45)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
          <span className="text-[9px] font-semibold mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>More</span>
        </button>

        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <div className="absolute left-full top-0 ml-2 w-[200px] rounded-xl shadow-2xl z-50 p-3 grid grid-cols-3 gap-1" style={{ background: '#1a1926', border: '1px solid rgba(255,255,255,0.1)' }}>
              {moreItems.map(mi => (
                <Link key={mi.label} to={mi.path} onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-white/50 hover:text-white/80">
                  {mi.icon}
                  <span className="text-[9px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>{mi.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Settings */}
      <Link to="/capra/prepare" className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.3)' }} title="Dashboard">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
      </Link>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOP BAR — search + user
   ═══════════════════════════════════════════════════════════════ */
function TopBar({ onTranscription }: { onTranscription?: (text: string) => void }) {
  const { user, logout } = useAuth();
  const { status, useSearch, setUseSearch, clearHistory } = useInterviewStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center h-12 px-4 shrink-0 z-30" style={{ background: '#0e0d16', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Left: brand */}
      <div className="flex items-center gap-2 w-40">
        <span className="text-[13px] font-bold text-white/90" style={{ fontFamily: 'var(--font-sans)' }}>Lumora</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold">LIVE</span>
      </div>

      {/* Center: audio strip (Zoom search bar equivalent) */}
      <div className="flex-1 flex items-center justify-center">
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
      <div className="flex items-center gap-2 w-40 justify-end">
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className={`w-1.5 h-1.5 rounded-full ${status.state === 'ready' ? 'bg-emerald-400' : status.state === 'error' ? 'bg-red-400' : (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}
            style={status.state === 'ready' ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
          <span className="text-[10px] font-medium text-white/40" style={{ fontFamily: 'var(--font-sans)' }}>{status.message}</span>
        </div>

        <button onClick={() => setUseSearch(!useSearch)} className="p-1.5 rounded-lg transition-all hover:bg-white/5"
          style={useSearch ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: 'rgba(255,255,255,0.3)' }} title="Search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        </button>

        <button onClick={() => { if (confirm('Clear all history?')) clearHistory(); }} className="p-1.5 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.3)' }} title="Reset">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
        </button>

        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-indigo-400/30 transition-all" title={user?.email || ''}>
            {user?.image ? <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>{initials}</div>}
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: '#1a1926', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-white/40 truncate mt-0.5">{user?.email}</p>
                </div>
                <Link to="/pricing" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-white/60 hover:bg-white/5">Pricing</Link>
                <Link to="/capra/prepare" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-white/60 hover:bg-white/5">Dashboard</Link>
                <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">Sign Out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RIGHT PANEL — AI Companion (Zoom-style)
   ═══════════════════════════════════════════════════════════════ */
function AICompanionPanel({ inputValue, setInputValue, onSubmit, isStreaming, onAskQuestion }: {
  inputValue: string; setInputValue: (v: string) => void; onSubmit: () => void; isStreaming: boolean; onAskQuestion: (q: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, question, streamChunks, isDesignQuestion, isCodingQuestion, parsedBlocks } = useInterviewStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-scroll when streaming
  useEffect(() => {
    if (panelRef.current && isStreaming) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [streamChunks, isStreaming]);

  const hasContent = isStreaming || parsedBlocks.length > 0 || history.length > 0;

  const SUGGESTIONS = [
    { text: 'What are some tips for system design interviews?' },
    { text: 'Practice a coding problem with me' },
    { text: 'Help me answer behavioral questions' },
    { text: 'Tell me what I can do with AI Companion' },
  ];

  return (
    <div className="hidden lg:flex flex-col w-[340px] shrink-0 h-full" style={{ background: '#0e0d16', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header — matches Zoom "AI Companion" */}
      <div className="flex items-center justify-between h-12 px-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          {/* Sparkle icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-[13px] font-semibold text-white/80" style={{ fontFamily: 'var(--font-sans)' }}>AI Companion</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }} title="Notifications">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }} title="Pop out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div ref={panelRef} className="flex-1 overflow-auto p-4">
        {!hasContent ? (
          /* Empty state — sparkle + suggestions (like Zoom) */
          <div className="flex flex-col items-center justify-center h-full">
            {/* Animated AI sparkle */}
            <div className="relative w-16 h-16 mb-6">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="animate-[spin_8s_linear_infinite]">
                <path d="M32 4L36.5 24.5L52 16L43.5 36.5L64 32L43.5 36.5L52 52L36.5 43.5L32 64L27.5 43.5L12 52L20.5 36.5L0 32L20.5 27.5L12 12L27.5 20.5L32 4Z" fill="url(#sparkle)" fillOpacity="0.6" />
                <defs><linearGradient id="sparkle" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#818cf8" /><stop offset="1" stopColor="#6366f1" /></linearGradient></defs>
              </svg>
            </div>

            {/* Suggestion cards — 2×2 grid */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {SUGGESTIONS.map((s) => (
                <button key={s.text} onClick={() => onAskQuestion(s.text)}
                  className="text-left px-3 py-3 rounded-xl text-[12px] leading-snug text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-sans)' }}>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active: show current Q&A */
          <div className="flex flex-col gap-3">
            {/* Current/last question */}
            {(isStreaming && question) && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <p className="text-sm text-white/80 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>{question}</p>
              </div>
            )}
            {isStreaming && <StreamingAnswer chunks={streamChunks} isDesign={isDesignQuestion} isCoding={isCodingQuestion} />}

            {!isStreaming && history.length > 0 && (() => {
              const last = history[history.length - 1];
              const blocks = Array.isArray(last.blocks) ? last.blocks : [];
              return (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>{last.question}</p>
                  </div>
                  <AnswerBlocks blocks={blocks} isDesign={false} isCoding={false} question={last.question} />
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* "Try on the web" link */}
      <div className="px-4 py-2 text-right shrink-0">
        <Link to="/capra/prepare" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
          Open in Prepare →
        </Link>
      </div>

      {/* Bottom input — like Zoom's "Write a message or type / for more" */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 px-3 h-10 rounded-xl transition-all focus-within:ring-1 focus-within:ring-indigo-400/40"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {isStreaming && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />}
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
            placeholder="Write a message or type / for more"
            className="flex-1 bg-transparent text-white/80 text-[13px] placeholder:text-white/25 focus:outline-none min-w-0"
            style={{ fontFamily: 'var(--font-sans)' }} disabled={isStreaming} />
          {inputValue.trim() && !isStreaming && (
            <button onClick={onSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-white/15 mt-1.5 text-center" style={{ fontFamily: 'var(--font-sans)' }}>AI can make mistakes. Review for accuracy.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
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
    location.pathname?.includes('/design') ? 'design' : 'interview';

  useEffect(() => { document.title = 'Live Interview | Camora'; return () => { document.title = 'Camora'; }; }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        const el = e.target as HTMLElement;
        if (el.closest('.monaco-editor') || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault(); setBlanked(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleInputSubmit = useCallback(() => {
    if (inputValue.trim()) { handleSubmit(inputValue); setInputValue(''); }
  }, [inputValue, handleSubmit]);

  const handleTranscription = useCallback((text: string) => {
    if (text.trim()) handleSubmit(text);
  }, [handleSubmit]);

  if (blanked) {
    return <div className="h-screen w-full flex items-center justify-center cursor-pointer" style={{ background: '#000' }} onClick={() => setBlanked(false)}><div className="opacity-10"><CamoraLogo size={24} /></div></div>;
  }

  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ background: 'var(--bg-app, #0D0C14)' }}>
      {/* Left icon nav */}
      <LeftNav currentTab={currentTab} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      {/* History sidebar */}
      <SessionSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onSelectEntry={(idx) => setFocusedEntry(idx)} />

      {/* Center main area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <TopBar onTranscription={handleTranscription} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <ErrorBoundary>
            <InterviewPanel
              onAskQuestion={handleSubmit}
              focusedEntry={focusedEntry}
              onClearFocus={() => setFocusedEntry(null)}
              onSwitchToCoding={(p) => navigate(p ? `/lumora/coding?problem=${encodeURIComponent(p)}` : '/lumora/coding')}
              onSwitchToDesign={(p) => navigate(p ? `/lumora/design?problem=${encodeURIComponent(p)}` : '/lumora/design')}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Right panel — AI Companion */}
      <AICompanionPanel
        inputValue={inputValue} setInputValue={setInputValue}
        onSubmit={handleInputSubmit} isStreaming={isStreaming}
        onAskQuestion={handleSubmit}
      />
    </div>
  );
}

export default InterviewPage;
