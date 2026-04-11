import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { DocumentUpload } from '@/components/lumora/documents/DocumentUpload';
import CamoraLogo from '../../shared/CamoraLogo';

export type TabType = 'interview' | 'coding' | 'design';

interface HeaderProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onTranscription?: (text: string) => void;
  showInputBar?: boolean;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
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

export function Header({ inputValue, onInputChange, onSubmit, onTranscription, showInputBar = true, activeTab, onTabChange }: HeaderProps) {
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
        if (confirm('Clear all history?')) clearHistory();
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
    <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 z-50 shrink-0">
      {/* Row 1: Nav + Audio + Controls — single row */}
      <div className="flex items-center h-[44px]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 px-3 border-r border-gray-800/50 h-full shrink-0">
          <CamoraLogo size={24} />
          <span className="hidden sm:block font-display font-bold text-xs md:text-sm tracking-tight text-white" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-1.5 md:px-2 h-full shrink-0 border-r border-gray-800/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`font-display flex items-center gap-1.5 px-2 md:px-3 py-1 text-xs font-bold rounded-xl transition-all duration-150 ${
                currentTab === tab.id
                  ? 'text-white shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
              style={currentTab === tab.id ? { background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' } : {}}
            >
              <span className="hidden md:inline">{TAB_ICONS[tab.id]}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Platform Selector */}
        <div className="hidden lg:flex items-center px-1.5 border-r border-gray-800/50 h-full shrink-0">
          <select
            className="font-display bg-white/10 text-white font-bold text-[10px] border border-gray-700/50 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer backdrop-blur-sm"
            defaultValue="general"
          >
            <option value="general">General</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Google Meet</option>
            <option value="teams">MS Teams</option>
            <option value="hackerrank">HackerRank</option>
            <option value="coderpad">CoderPad</option>
            <option value="codility">Codility</option>
          </select>
        </div>

        {/* Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 border-r border-gray-800/50 h-full shrink-0 max-w-[120px]">
          <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-500' :
            status.state === 'warn' ? 'bg-amber-500' :
            status.state === 'listen' || status.state === 'write' ? 'bg-emerald-400 animate-pulse' :
            'bg-gray-500'
          }`} style={status.state === 'ready' ? { boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)' } : {}} />
          <span className="font-code text-[10px] text-white font-medium truncate whitespace-nowrap">
            {status.message}
          </span>
        </div>

        {/* Audio controls + Docs — always in row 1, scrollable if needed */}
        <div className="flex items-center gap-1 px-1 h-full flex-1 min-w-0 overflow-x-auto no-scrollbar">
          <AudioCapture onTranscription={onTranscription} />
          <DocumentUpload />
        </div>

        {/* Controls — Search, Reset */}
        <div className="flex items-center gap-0.5 px-1.5 md:px-2 border-l border-gray-800/50 h-full shrink-0">
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              useSearch
                ? 'text-white shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
            style={useSearch ? { background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' } : {}}
            title="Toggle web search (⌘S)"
          >
            <SearchIcon />
          </button>
          <button
            className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-all duration-150"
            onClick={() => clearHistory()}
            title="Reset (⌘⌫)"
          >
            <ResetIcon />
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-1.5 px-2 border-l border-gray-800/50 h-full shrink-0">
          <UserBadge />
        </div>
      </div>

      {/* Row 2: Input bar — always its own row */}
      <div className="flex items-center h-[36px] border-t border-gray-800/50">
        <div className="flex-1 flex items-center px-3 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type or paste question... (⌘K)"
            className="font-display flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500 min-w-0"
          />
          <button
            onClick={toggleExpand}
            className={`p-1.5 rounded-lg transition-all duration-150 ml-1 shrink-0 ${
              isExpanded ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title={isExpanded ? 'Collapse textarea' : 'Expand for multi-line input'}
          >
            <ExpandIcon expanded={isExpanded} />
          </button>
          {inputValue && (
            <button
              onClick={onSubmit}
              className="font-display flex items-center gap-1.5 px-3 py-1 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all ml-2"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Ask
            </button>
          )}
        </div>
      </div>

      {/* Expandable textarea for multi-line problem input */}
      {isExpanded && (
        <div className="border-t border-gray-700/50 bg-gray-950/90 backdrop-blur-xl px-4 py-3">
          <div className="flex gap-2 items-end max-w-full">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Paste a coding problem or system design prompt... (Cmd+Enter to send)"
              rows={4}
              className="font-code flex-1 bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 resize-y outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 min-h-[80px] max-h-[300px]"
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={handleTextareaSubmit}
                disabled={!inputValue}
                className="font-display flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
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
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
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
          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 rounded-2xl shadow-xl border border-white/10 z-50 py-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10">
              <p className="font-display text-sm font-semibold text-white truncate">{user.name || 'User'}</p>
              <p className="font-code text-xs text-white/50 truncate">{user.email}</p>
            </div>
            <Link to="/pricing" className="block px-3 py-2 text-sm font-display text-white/70 hover:bg-white/5">Pricing</Link>
            <button
              onClick={() => logout()}
              className="w-full text-left px-3 py-2 text-sm font-display text-red-400 hover:bg-red-500/10"
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
