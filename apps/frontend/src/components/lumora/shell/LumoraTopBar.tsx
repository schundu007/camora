import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { AudioCapture, SystemAudioButton } from '@/components/lumora/audio/AudioCapture';
import { MicrophoneSelector } from '@/components/lumora/audio/MicrophoneSelector';
import { DocumentUpload } from '@/components/lumora/documents/DocumentUpload';
import type { LumoraTab } from './LumoraIconRail';

/* ── Color tokens (standardized) ── */
const C = {
  base: '#0D0C14',
  surface: '#16141F',
  elevated: '#1E1C28',
  text: '#F2F1F3',
  muted: '#6C6B7B',
  accent: '#818cf8',
  accentBg: 'rgba(99,102,241,0.12)',
  border: 'rgba(255,255,255,0.06)',
};

interface LumoraTopBarProps {
  activeTab: LumoraTab;
  onTranscription?: (text: string) => void;
}

export function LumoraTopBar({ activeTab, onTranscription }: LumoraTopBarProps) {
  const { user, logout } = useAuth();
  const { status, useSearch, setUseSearch, clearHistory } = useInterviewStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  const tabLabel = activeTab === 'coding' ? 'Coding' : activeTab === 'design' ? 'System Design' : 'Interview';

  return (
    <header className="flex items-center h-12 px-4 shrink-0 z-30" style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      {/* Left: brand */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-[13px] font-bold" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>Lumora</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: C.accentBg, color: C.accent }}>{tabLabel.toUpperCase()}</span>
      </div>

      {/* Center: audio controls */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <MicrophoneSelector disabled={false} />
          <div className="w-px h-4 mx-1" style={{ background: C.border }} />
          <AudioCapture onTranscription={onTranscription} />
          <div className="w-px h-4 mx-1" style={{ background: C.border }} />
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />
          <div className="w-px h-4 mx-1" style={{ background: C.border }} />
          <DocumentUpload />
        </div>
      </div>

      {/* Right: status + actions + user */}
      <div className="flex items-center gap-2 min-w-[140px] justify-end">
        {/* Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: C.elevated }}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' :
            ''
          }`} style={!(status.state === 'listen' || status.state === 'write') ? {} : {}} />
          <span className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-sans)', color: C.muted }}>{status.message}</span>
        </div>

        {/* Platform */}
        <div data-tour="platform" className="hidden xl:flex items-center">
          <select className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-md cursor-pointer focus:outline-none"
            style={{ background: C.elevated, color: C.muted, border: `1px solid ${C.border}` }} defaultValue="general">
            <option value="general">General</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Meet</option>
            <option value="teams">Teams</option>
            <option value="hackerrank">HackerRank</option>
            <option value="coderpad">CoderPad</option>
            <option value="codility">Codility</option>
          </select>
        </div>

        {/* Search */}
        <button onClick={() => setUseSearch(!useSearch)} className="p-1.5 rounded-lg transition-all"
          style={useSearch ? { background: C.accentBg, color: C.accent } : { color: C.muted }} title="Web Search (⌘S)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        </button>

        {/* Reset */}
        <button onClick={() => { if (confirm('Clear all history?')) clearHistory(); }} className="p-1.5 rounded-lg transition-all" style={{ color: C.muted }} title="Reset (⌘⌫)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
        </button>

        {/* User */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full overflow-hidden transition-all" title={user?.email || ''}>
            {user?.image ? <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#6366f1', color: C.text }}>{initials}</div>}
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{user?.name || 'User'}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>{user?.email}</p>
                </div>
                <Link to="/pricing" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm transition-colors" style={{ color: C.muted }}>Pricing</Link>
                <Link to="/capra/prepare" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm transition-colors" style={{ color: C.muted }}>Dashboard</Link>
                <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 transition-colors">Sign Out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
