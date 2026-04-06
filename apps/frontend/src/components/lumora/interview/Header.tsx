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
      {/* Row 1: Nav */}
      <div className="flex items-center h-[44px]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 px-3 border-r border-gray-800/50 h-full shrink-0">
          <CamoraLogo size={24} />
          <div className="hidden sm:block">
            <span className="font-display font-bold text-xs md:text-sm tracking-tight text-white" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
          </div>
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-1.5 md:px-2 h-full shrink-0 border-r border-gray-800/50 overflow-x-auto no-scrollbar">
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
        <div className="hidden md:flex items-center px-1.5 border-r border-gray-800/50 h-full shrink-0">
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
        <div className="hidden md:flex items-center gap-1.5 px-2 border-r border-gray-800/50 h-full shrink-0 max-w-[160px]">
          <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-500' :
            status.state === 'warn' ? 'bg-amber-500' :
            status.state === 'listen' || status.state === 'write' ? 'bg-emerald-400 animate-pulse' :
            'bg-gray-500'
          }`} style={status.state === 'ready' ? { boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)' } : {}} />
          <span className="font-code text-[10px] md:text-xs text-white font-medium truncate whitespace-nowrap">
            {status.message}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Controls */}
        <div className="flex items-center gap-0.5 px-1.5 md:px-2 border-l border-gray-800/50 h-full shrink-0">
          <DocumentUpload />
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

      {/* Row 2: Audio + Input */}
      <div className="flex items-center h-[38px] border-t border-gray-800/50">
        <div className="flex items-center px-1.5 border-r border-gray-800/50 h-full shrink-0 overflow-x-auto no-scrollbar">
          <AudioCapture onTranscription={onTranscription} />
        </div>

        <div className="flex-1 flex items-center px-2 md:px-3 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type or paste question... (⌘K)"
            className="font-display flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-white placeholder:text-gray-400 min-w-0"
          />
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
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 py-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="font-display text-sm font-semibold text-gray-900 truncate">{user.name || 'User'}</p>
              <p className="font-code text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <a href="/pricing" className="block px-3 py-2 text-sm font-display text-gray-700 hover:bg-gray-50">Pricing</a>
            <button
              onClick={() => logout()}
              className="w-full text-left px-3 py-2 text-sm font-display text-red-600 hover:bg-red-50"
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
