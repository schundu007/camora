import { useState } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { AudioCapture, SystemAudioButton } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { LumoraSettings } from './LumoraSettings';
import type { LumoraTab } from './LumoraIconRail';

/* ── Color tokens (standardized) ── */
const C = {
  base: '#000000',
  surface: '#111111',
  elevated: '#F97316',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.75)',
  accent: '#F97316',
  accentBg: 'rgba(249,115,22,0.15)',
  border: '#333333',
};

interface LumoraTopBarProps {
  activeTab: LumoraTab;
  onTranscription?: (text: string) => void;
}

export function LumoraTopBar({ activeTab, onTranscription }: LumoraTopBarProps) {
  const { status } = useInterviewStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="flex items-center h-16 px-3 sm:px-4 md:px-6 shrink-0 z-30" style={{ background: '#000000', borderBottom: '1px solid #333' }}>
      {/* Left: spacer (tab label removed — sidebar shows active tab) */}
      <div className="min-w-[20px]" />

      {/* Center: core audio controls (compact) */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Live recording controls */}
          <AudioCapture onTranscription={onTranscription} />
          <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />
        </div>
      </div>

      {/* Right: voice + status + settings */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        {/* Voice enrollment / filter toggle */}
        <VoiceEnrollment disabled={false} />

        {/* Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`w-2 h-2 rounded-full ${
            status.state === 'ready' ? 'bg-emerald-400' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-emerald-400 animate-pulse' :
            ''
          }`} />
          <span className="text-xs font-bold" style={{ fontFamily: "'Satoshi', sans-serif", color: C.muted }}>{status.message}</span>
        </div>

        {/* Settings gear */}
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: C.muted }} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

      </div>

      {/* Settings modal */}
      <LumoraSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  );
}
