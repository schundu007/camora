import { useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { LumoraSettings } from './LumoraSettings';
import { useTheme } from '@/hooks/useTheme';
import { HourMeterChip } from '@/components/shared/ui/HourMeterChip';
import { ContextBadge } from './ContextBadge';

const ThemeToggleButton = () => {
  const { theme, toggle } = useTheme();
  // Use CSS variables so the button reads correctly on whatever background
  // the theme is using. Previous version was hardcoded white-on-white,
  // which made the toggle invisible in light mode.
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center justify-center w-9 h-9 transition-[background-color,color,transform] active:scale-[0.98]"
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
  onTranscription?: (text: string) => void;
  inline?: boolean;
}

export const LumoraTopBar = ({ onTranscription, inline = false }: LumoraTopBarProps) => {
  const { status } = useSessionStore();
  const [showSettings, setShowSettings] = useState(false);
  const { theme } = useTheme();

  if (inline) {
    // Inline mode: just the audio controls, no wrapper header
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <AudioCapture onTranscription={onTranscription} />
        </div>
        <VoiceEnrollment disabled={false} />
        <ContextBadge variant="light" />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: C.elevated, border: `1px solid ${C.border}`, color: C.muted }}>
          {status.state === 'listen' ? <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />Recording</> : 'Ready to assist'}
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
    <header className="flex items-center h-14 px-3 sm:px-4 md:px-6 shrink-0 z-30" style={{ background: 'var(--cam-hero-strip)', borderBottom: 'var(--lumora-topbar-border-width) solid var(--lumora-topbar-border-color)', boxShadow: 'var(--lumora-topbar-shadow)' }}>
      {/* Left: spacer (tab label removed — sidebar shows active tab) */}
      <div className="min-w-[20px]" />

      {/* Center: core audio controls — LeetCode-style sharp pill toolbar */}
      <div data-tour="audio" className="flex-1 flex items-center justify-center overflow-x-auto">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: 'var(--cam-strip-icon-bg)',
            border: '1px solid var(--cam-strip-icon-border)',
            borderRadius: 999,
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          <AudioCapture onTranscription={onTranscription} />
        </div>
      </div>

      {/* Right: voice + status + settings */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        {/* What context Sona has loaded — green when JD/Resume connected,
            amber when missing. Tooltip lists exactly what's loaded. */}
        <ContextBadge variant={theme === 'dark' ? 'dark' : 'light'} />

        {/* Voice enrollment / filter toggle */}
        <VoiceEnrollment disabled={false} />

        {/* Status pill — LeetCode-style sharp pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            background: 'var(--cam-strip-icon-bg)',
            border: '1px solid var(--cam-strip-icon-border)',
            borderRadius: 999,
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
          <span className="hidden lg:inline text-xs font-bold" style={{ fontFamily: "var(--font-sans)", color: 'var(--cam-strip-text)' }}>{status.message}</span>
        </div>

        {/* AI hour budget chip — shown during live interview when running
            low matters most. Always uses dark variant since LumoraTopBar
            is fixed dark navy regardless of theme. */}
        <HourMeterChip variant={theme === 'dark' ? 'dark' : 'light'} />

        <ThemeToggleButton />

        {/* Settings gear */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center justify-center w-9 h-9 transition-[background-color,transform] active:scale-[0.98]"
          style={{
            color: 'var(--cam-strip-heading)',
            border: '1px solid var(--cam-strip-icon-border)',
            borderRadius: 999,
            background: 'var(--cam-strip-icon-bg)',
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
