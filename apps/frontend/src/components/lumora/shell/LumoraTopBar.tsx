import { useState } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { AudioCapture, SystemAudioButton } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { LumoraSettings } from './LumoraSettings';
import ScreenCaptureButton from '@/components/lumora/shared/ScreenCaptureButton';
import type { LumoraTab } from './LumoraIconRail';

/* ── Color tokens (standardized) ── */
const C = {
  base: 'var(--bg-surface)',
  surface: 'var(--bg-elevated)',
  elevated: 'var(--bg-app)',
  text: 'var(--text-primary)',
  muted: 'var(--text-secondary)',
  accent: 'var(--accent)',
  accentBg: 'var(--accent-subtle)',
  border: 'var(--border)',
};

interface LumoraTopBarProps {
  activeTab: LumoraTab;
  onTranscription?: (text: string) => void;
  /** Called when a screenshot capture yields problem text — routed to the
      current tab's problem input WITHOUT auto-submit (user reviews first). */
  onCapturedProblem?: (text: string) => void;
  inline?: boolean;
}

export function LumoraTopBar({ activeTab, onTranscription, onCapturedProblem, inline = false }: LumoraTopBarProps) {
  const { status } = useInterviewStore();
  const [showSettings, setShowSettings] = useState(false);

  const captureKind: 'coding' | 'design' = activeTab === 'design' ? 'design' : 'coding';
  const canCapture = activeTab === 'coding' || activeTab === 'design';

  if (inline) {
    // Inline mode: just the audio controls, no wrapper header
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <AudioCapture onTranscription={onTranscription} />
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />
          {canCapture && onCapturedProblem && (
            <>
              <div className="w-px h-5 mx-1" style={{ background: C.border }} />
              <ScreenCaptureButton kind={captureKind} onCaptured={onCapturedProblem} variant="label" label="Capture problem" />
            </>
          )}
        </div>
        <VoiceEnrollment disabled={false} />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: C.elevated, border: `1px solid ${C.border}`, color: C.muted }}>
          {status === 'recording' ? <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />Recording</> : 'Ready to assist'}
        </div>
        <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: C.muted }} title="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
        </button>
        <LumoraSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <header className="flex items-center h-14 px-3 sm:px-4 md:px-6 shrink-0 z-30" style={{ background: C.base, borderBottom: `1px solid ${C.border}` }}>
      {/* Left: spacer (tab label removed — sidebar shows active tab) */}
      <div className="min-w-[20px]" />

      {/* Center: core audio controls (compact) */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center overflow-x-auto">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          {/* Live recording controls */}
          <AudioCapture onTranscription={onTranscription} />
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          <SystemAudioButton onTranscription={onTranscription} disabled={false} />
          {canCapture && onCapturedProblem && (
            <>
              <div className="w-px h-5 mx-1" style={{ background: C.border }} />
              <ScreenCaptureButton kind={captureKind} onCaptured={onCapturedProblem} variant="label" label="Capture problem" />
            </>
          )}
        </div>
      </div>

      {/* Right: voice + status + settings */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        {/* Voice enrollment / filter toggle */}
        <VoiceEnrollment disabled={false} />

        {/* Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <div className={`w-2 h-2 rounded-full ${
            status.state === 'ready' ? 'bg-[var(--accent)]' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-[var(--accent)] animate-pulse' :
            ''
          }`} />
          <span className="text-xs font-bold" style={{ fontFamily: "'Inter', sans-serif", color: C.muted }}>{status.message}</span>
        </div>

        {/* Settings gear */}
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]" style={{ color: C.muted }} title="Settings">
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
