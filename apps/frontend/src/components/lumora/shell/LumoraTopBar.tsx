import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { AudioCapture, SystemAudioButton } from '@/components/lumora/audio/AudioCapture';
import { LumoraSettings } from './LumoraSettings';
import type { LumoraTab } from './LumoraIconRail';

/* ── Color tokens (standardized) ── */
const C = {
  base: '#000000',
  surface: '#111111',
  elevated: '#76B900',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.5)',
  accent: '#76B900',
  accentBg: 'rgba(118,185,0,0.15)',
  border: '#333333',
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
  const [showSettings, setShowSettings] = useState(false);
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center h-14 px-5 shrink-0 z-30" style={{ background: '#000000', borderBottom: '1px solid #333' }}>
      {/* Left: spacer (tab label removed — sidebar shows active tab) */}
      <div className="min-w-[20px]" />

      {/* Center: core audio controls (compact) */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Live recording controls */}
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

      {/* Right: status + settings + user */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        {/* Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`w-2 h-2 rounded-full ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' :
            ''
          }`} />
          <span className="text-[10px] font-semibold" style={{ fontFamily: "'Satoshi', sans-serif", color: C.muted }}>{status.message}</span>
        </div>

        {/* Settings gear */}
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: C.muted }} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {/* User */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full overflow-hidden transition-all" title={`${user?.name || 'User'}\n${user?.email || ''}`}>
            {user?.image ? <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#76B900', color: C.text }}>{initials}</div>}
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: '#111111', border: '1px solid #333', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
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

      {/* Settings modal */}
      <LumoraSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  );
}
