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
  base: '#0C0515',
  surface: '#150D25',
  elevated: '#7C3AED',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.7)',
  accent: '#34d399',
  accentBg: 'rgba(52,211,153,0.15)',
  border: 'rgba(255,255,255,0.12)',
};

interface LumoraTopBarProps {
  activeTab: LumoraTab;
  onTranscription?: (text: string) => void;
  onToggleSessions?: () => void;
  sessionsOpen?: boolean;
}

export function LumoraTopBar({ activeTab, onTranscription, onToggleSessions, sessionsOpen }: LumoraTopBarProps) {
  const { user, logout } = useAuth();
  const { status } = useInterviewStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  const tabLabel = activeTab === 'coding' ? 'Coding' : activeTab === 'design' ? 'System Design' : 'Interview';

  return (
    <header className="flex items-center h-14 px-5 shrink-0 z-30" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>
      {/* Left: spacer (tab label removed — sidebar shows active tab) */}
      <div className="min-w-[20px]" />

      {/* Center: audio controls */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
          {/* Mic selector */}
          <MicrophoneSelector disabled={false} />
          <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* Platform selector — next to mic */}
          <select id="platform-select" name="platform" className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md cursor-pointer focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: C.muted, border: `1px solid rgba(255,255,255,0.1)` }} defaultValue="general">
            <option value="general">General</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Meet</option>
            <option value="teams">Teams</option>
            <option value="hackerrank">HackerRank</option>
            <option value="coderpad">CoderPad</option>
          </select>
          <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* Audio controls */}
          <AudioCapture onTranscription={onTranscription} />
          <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />

          {/* Sessions toggle */}
          {onToggleSessions && (
            <>
              <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <button onClick={onToggleSessions} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={sessionsOpen ? { background: C.accentBg, color: C.accent } : { color: C.muted }}
                title="Q&A History">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span className="hidden xl:inline">Sessions</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-3 min-w-[120px] justify-end">
        {/* Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`w-2 h-2 rounded-full ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' :
            ''
          }`} />
          <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--font-sans)', color: C.muted }}>{status.message}</span>
        </div>

        {/* User */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full overflow-hidden transition-all" title={`${user?.name || 'User'}\n${user?.email || ''}`}>
            {user?.image ? <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#6366f1', color: C.text }}>{initials}</div>}
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: 'linear-gradient(180deg, #7C3AED 0%, #150D25 100%)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
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
