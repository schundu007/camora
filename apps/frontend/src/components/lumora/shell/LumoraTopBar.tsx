import { useState } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { LumoraSettings } from './LumoraSettings';
import ScreenCaptureButton from '@/components/lumora/shared/ScreenCaptureButton';
import { useTheme } from '@/hooks/useTheme';
import { HourMeterChip } from '@/components/shared/ui/HourMeterChip';
import { ContextBadge } from './ContextBadge';
import type { LumoraTab } from './LumoraIconRail';

function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  // Use CSS variables so the button reads correctly on whatever background
  // the theme is using. Previous version was hardcoded white-on-white,
  // which made the toggle invisible in light mode.
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center justify-center w-9 h-9 transition-all"
      style={{
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        background: 'var(--bg-elevated)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-subtle)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
      )}
    </button>
  );
}

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
          {canCapture && onCapturedProblem && (
            <>
              <div className="w-px h-5 mx-1" style={{ background: C.border }} />
              <ScreenCaptureButton kind={captureKind} onCaptured={onCapturedProblem} variant="label" label="Capture problem" />
            </>
          )}
        </div>
        <VoiceEnrollment disabled={false} />
        <ContextBadge variant="light" />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: C.elevated, border: `1px solid ${C.border}`, color: C.muted }}>
          {status === 'recording' ? <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />Recording</> : 'Ready to assist'}
        </div>
        <ThemeToggleButton />
        <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: C.muted }} title="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
        </button>
        <LumoraSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <header className="flex items-center h-14 px-3 sm:px-4 md:px-6 shrink-0 z-30" style={{ background: 'var(--cam-hero-strip)', borderBottom: '3px solid var(--cam-gold-leaf)', boxShadow: '0 6px 22px rgba(0,0,0,0.45)' }}>
      {/* Left: spacer (tab label removed — sidebar shows active tab) */}
      <div className="min-w-[20px]" />

      {/* Center: core audio controls — LeetCode-style sharp pill toolbar */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center overflow-x-auto">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          <AudioCapture onTranscription={onTranscription} />
          {canCapture && onCapturedProblem && (
            <>
              <div className="w-px h-5" style={{ background: 'rgba(201,162,39,0.35)' }} />
              <ScreenCaptureButton kind={captureKind} onCaptured={onCapturedProblem} variant="label" label="Capture problem" />
            </>
          )}
        </div>
      </div>

      {/* Right: voice + status + settings */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        {/* What context Sona has loaded — green when JD/Resume connected,
            amber when missing. Tooltip lists exactly what's loaded. */}
        <ContextBadge variant="dark" />

        {/* Voice enrollment / filter toggle */}
        <VoiceEnrollment disabled={false} />

        {/* Status pill — LeetCode-style sharp pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
          title={status.message}
        >
          <div className={`w-2 h-2 rounded-full ${
            status.state === 'ready' ? 'bg-[var(--cam-gold-leaf-lt)]' :
            status.state === 'error' ? 'bg-red-400' :
            status.state === 'warn' ? 'bg-amber-400' :
            (status.state === 'listen' || status.state === 'write') ? 'bg-[var(--cam-gold-leaf-lt)] animate-pulse' :
            ''
          }`} />
          <span className="hidden lg:inline text-xs font-bold" style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.92)' }}>{status.message}</span>
        </div>

        {/* AI hour budget chip — shown during live interview when running
            low matters most. Always uses dark variant since LumoraTopBar
            is fixed dark navy regardless of theme. */}
        <HourMeterChip variant="dark" />

        <ThemeToggleButton />

        {/* Settings gear */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center justify-center w-9 h-9 transition-all hover:bg-white/10"
          style={{
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
          }}
          title="Settings"
        >
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
