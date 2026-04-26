import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { AudioCapture, SystemAudioButton } from '@/components/lumora/audio/AudioCapture';
import { MicrophoneSelector } from '@/components/lumora/audio/MicrophoneSelector';
import { DocumentUpload } from '@/components/lumora/documents/DocumentUpload';
import CamoraLogo from '../../shared/CamoraLogo';
import { dialogConfirm } from '@/components/shared/Dialog';

export type TabType = 'interview' | 'coding' | 'design';

interface HeaderProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onTranscription?: (text: string) => void;
  showInputBar?: boolean;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const TAB_ROUTES: Record<TabType, string> = {
  interview: '/lumora',
  coding: '/lumora/coding',
  design: '/lumora/design',
};

const TABS: { id: TabType; label: string }[] = [
  { id: 'interview', label: 'Interview' },
  { id: 'coding', label: 'Coding' },
  { id: 'design', label: 'Design' },
];

export function Header({ inputValue, onInputChange, onSubmit, onTranscription, showInputBar = true, activeTab, onTabChange, onToggleSidebar, sidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, useSearch, setUseSearch, isRecording, history, clearHistory } = useInterviewStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Derive active tab from URL if not explicitly provided
  const currentTab: TabType = activeTab ?? (
    location.pathname?.includes('/coding') ? 'coding' :
    location.pathname?.includes('/design') ? 'design' :
    'interview'
  );

  const handleTabClick = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      navigate(TAB_ROUTES[tab]);
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K: Focus input
      if (isMod && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Cmd/Ctrl + S: Toggle search (skip if in code editor)
      const el = e.target as HTMLElement;
      if (isMod && e.key === 's' && !el.closest('.monaco-editor')) {
        e.preventDefault();
        setUseSearch(!useSearch);
      }

      // Cmd/Ctrl + Backspace: Reset history (with confirmation)
      if (isMod && e.key === 'Backspace' && !el.closest('.monaco-editor')) {
        e.preventDefault();
        dialogConfirm({ title: 'Clear all history?', message: 'This will permanently remove every saved session.', confirmLabel: 'Clear all', tone: 'danger' }).then(ok => { if (ok) clearHistory(); });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useSearch, setUseSearch, clearHistory]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSubmit();
      setIsExpanded(false);
    }
  };

  const handleTextareaSubmit = () => {
    onSubmit();
    setIsExpanded(false);
  };

  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) {
      // Focus textarea after expansion renders
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const TAB_ICONS: Record<TabType, React.ReactNode> = {
    interview: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    coding: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    design: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  };

  return (
    <header className="z-50 shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', fontFamily: "'Inter', sans-serif" }}>
      {/* Row 1: Nav + Audio + Controls — horizontally scrollable */}
      <div className="flex items-center h-[42px] overflow-x-auto no-scrollbar">
        {/* Sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-10 h-full shrink-0 transition-colors"
            style={{ color: sidebarOpen ? 'var(--text-primary)' : 'var(--text-muted)', borderRight: '1px solid var(--border)' }}
            onMouseEnter={(e) => { if (!sidebarOpen) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={(e) => { if (!sidebarOpen) e.currentTarget.style.color = 'var(--text-muted)'; }}
            title={sidebarOpen ? 'Close history' : 'Open history'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        )}

        {/* Logo — brand identity, Comfortaa font */}
        <Link to="/" className="flex items-center gap-2 px-4 h-full shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
          <CamoraLogo size={24} />
        </Link>

        {/* Navigation — pill tabs with icon+label, Jakarta Sans bold */}
        <div data-tour="tabs" className="flex items-center h-full shrink-0 px-1" style={{ borderRight: '1px solid var(--border)' }}>
          <Link to="/capra/prepare" className="flex items-center gap-1 px-2 py-1 mx-0.5 rounded-md text-[11px] transition-all" style={{ color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", fontWeight: 700 }} title="Prepare">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden xl:inline">Prepare</span>
          </Link>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => handleTabClick(tab.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 mx-0.5 rounded-md text-[11px] font-bold transition-all"
              style={currentTab === tab.id
                ? { background: 'var(--accent-subtle)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", boxShadow: 'inset 0 0 0 1px var(--border)' }
                : { color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
              <span className="hidden md:inline">{TAB_ICONS[tab.id]}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Mic Selector — between tabs and platform */}
        <div className="flex items-center px-1.5 h-full shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
          <MicrophoneSelector disabled={false} />
        </div>

        {/* Platform — monospace badge style */}
        <div data-tour="platform" className="hidden lg:flex items-center px-2 h-full shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
          <select id="platform-select" name="platform" className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-md cursor-pointer focus:outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }} defaultValue="general">
            <option value="general">General</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Meet</option>
            <option value="teams">Teams</option>
            <option value="hackerrank">HackerRank</option>
            <option value="coderpad">CoderPad</option>
            <option value="codility">Codility</option>
          </select>
        </div>

        {/* Interviewer — between General and Audio */}
        <div className="flex items-center px-1.5 h-full shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />
        </div>

        {/* Audio Controls — grouped with a subtle translucent surface */}
        <div data-tour="audio" className="flex items-center gap-1.5 px-2 h-full shrink-0" style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
          <AudioCapture onTranscription={onTranscription} />
          <DocumentUpload />
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Status — monospace, right-aligned with glow dot */}
        <div className="hidden lg:flex items-center gap-2 px-3 h-full shrink-0" style={{ borderLeft: '1px solid var(--border)' }}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            status.state === 'ready' ? 'bg-[var(--accent)]' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            status.state === 'listen' || status.state === 'write' ? 'bg-[var(--accent)] animate-pulse' :
            'bg-white/20'
          }`} style={status.state === 'ready' ? { boxShadow: '0 0 6px rgba(255,255,255,0.4)' } : {}} />
          <span className="text-[10px] font-mono font-medium tracking-wide truncate max-w-[90px]" style={{ color: 'var(--text-muted)' }}>
            {status.message}
          </span>
        </div>

        {/* Actions — icon-only, subtle */}
        <div className="flex items-center gap-0.5 px-1.5 h-full shrink-0" style={{ borderLeft: '1px solid var(--border)' }}>
          <button onClick={() => setUseSearch(!useSearch)} className="p-1.5 rounded-md transition-all"
            style={useSearch ? { background: 'var(--accent-subtle)', color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }} title="Search (⌘S)">
            <SearchIcon />
          </button>
          <button className="p-1.5 rounded-md transition-all" style={{ color: 'var(--text-muted)' }} onClick={() => clearHistory()} title="Reset (⌘⌫)">
            <ResetIcon />
          </button>
        </div>

        {/* User — avatar pill */}
        <div className="flex items-center px-2 h-full shrink-0" style={{ borderLeft: '1px solid var(--border)' }}>
          <UserBadge />
        </div>
      </div>

      {/* Row 2: Input bar — hidden when showInputBar=false (composer moved to page bottom) */}
      {showInputBar && <div data-tour="input" className="flex items-center h-[36px]" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <div className="flex-1 flex items-center justify-center px-3 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type or paste question... (⌘K)"
            className="font-display w-full max-w-2xl bg-transparent border-none outline-none text-sm text-center placeholder:text-white/25 min-w-0"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={toggleExpand}
            className="p-1.5 rounded-lg transition-all duration-200 ml-1 shrink-0"
            style={isExpanded ? { color: 'var(--text-primary)', background: 'var(--accent-subtle)' } : { color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { if (!isExpanded) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}}
            onMouseLeave={(e) => { if (!isExpanded) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}}
            title={isExpanded ? 'Collapse textarea' : 'Expand for multi-line input'}
          >
            <ExpandIcon expanded={isExpanded} />
          </button>
          {inputValue && (
            <button
              onClick={onSubmit}
              className="font-display flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all ml-2"
              style={{ background: 'linear-gradient(135deg, var(--cam-primary-lt), var(--cam-primary-dk))', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Ask
            </button>
          )}
        </div>
      </div>

      }

      {/* Expandable textarea for multi-line problem input */}
      {showInputBar && isExpanded && (
        <div className="border-t border-gray-700/50 bg-gray-950/90 backdrop-blur-xl px-4 py-3">
          <div className="flex gap-2 items-end max-w-full">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Paste a coding problem or system design prompt... (Cmd+Enter to send)"
              rows={4}
              className="font-code flex-1 bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 resize-y outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 min-h-[80px] max-h-[300px]"
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={handleTextareaSubmit}
                disabled={!inputValue}
                className="font-display flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--cam-primary-lt), var(--cam-primary-dk))', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Send
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="font-display flex items-center justify-center px-4 py-2 text-gray-400 text-xs font-medium rounded-xl hover:bg-white/5 hover:text-white transition-all"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function UserBadge() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
        title={user.email || ''}
      >
        {user.image ? (
          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg, var(--cam-primary-lt), var(--cam-primary-dk))' }}>
            {initials}
          </div>
        )}
        <span className="hidden lg:inline font-display text-[11px] text-white font-medium truncate max-w-[80px]">
          {user.name || user.email?.split('@')[0]}
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl shadow-xl border z-50 py-1 overflow-hidden" style={{ background: 'linear-gradient(180deg, var(--cam-primary-lt) 0%, var(--cam-primary-dk) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="px-3 py-2 border-b border-white/10">
              <p className="font-display text-sm font-semibold text-white truncate">{user.name || 'User'}</p>
              <p className="font-code text-xs text-white/85 truncate">{user.email}</p>
            </div>
            <Link to="/pricing" className="block px-3 py-2 text-sm font-display text-white/90 hover:bg-white/5">Pricing</Link>
            <button
              onClick={() => logout()}
              className="w-full text-left px-3 py-2 text-sm font-display hover:bg-white/10"
              style={{ color: 'var(--danger)' }}
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 14h6v6M20 10h-6V4M4 14l6-6M20 10l-6 6" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  );
}
