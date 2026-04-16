import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { AudioCapture, SystemAudioButton } from '@/components/lumora/audio/AudioCapture';
import { MicrophoneSelector } from '@/components/lumora/audio/MicrophoneSelector';
import { DocumentUpload } from '@/components/lumora/documents/DocumentUpload';
import type { LumoraTab } from './LumoraIconRail';

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
    <header className="flex items-center h-12 px-4 shrink-0 z-30" style={{ background: '#0e0d16', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Left: brand + active tab label */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-[13px] font-bold text-white/90" style={{ fontFamily: 'var(--font-sans)' }}>Lumora</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold">{tabLabel.toUpperCase()}</span>
      </div>

      {/* Center: audio controls strip */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center">
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

      {/* Right: status + search + reset + platform + user */}
      <div className="flex items-center gap-2 min-w-[140px] justify-end">
        {/* Status dot */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' :
            'bg-white/20'
          }`} style={status.state === 'ready' ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
          <span className="text-[10px] font-medium text-white/40" style={{ fontFamily: 'var(--font-sans)' }}>{status.message}</span>
        </div>

        {/* Platform selector */}
        <div data-tour="platform" className="hidden xl:flex items-center">
          <select className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-md cursor-pointer focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }} defaultValue="general">
            <option value="general">General</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Meet</option>
            <option value="teams">Teams</option>
            <option value="hackerrank">HackerRank</option>
            <option value="coderpad">CoderPad</option>
            <option value="codility">Codility</option>
          </select>
        </div>

        {/* Search toggle */}
        <button onClick={() => setUseSearch(!useSearch)} className="p-1.5 rounded-lg transition-all hover:bg-white/5"
          style={useSearch ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: 'rgba(255,255,255,0.3)' }} title="Web Search (⌘S)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        </button>

        {/* Reset */}
        <button onClick={() => { if (confirm('Clear all history?')) clearHistory(); }} className="p-1.5 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.3)' }} title="Reset (⌘⌫)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
        </button>

        {/* User avatar */}
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
