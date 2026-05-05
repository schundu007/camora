/* ── LumoraBottomBar ─────────────────────────────────────────────────────
   The Coding / Design tabs' single mic surface. Modeled on the
   behavioral panel's bottom voice-filter banner so the audio chrome
   reads consistently across all three live-interview surfaces.

   Layout (single row on ≥sm, three-row stack on phones):
     LEFT   — voice-filter status (mic icon + title + hint)
     CENTER — MIC + AUTO + audio-level meter (the AudioCapture pill)
     RIGHT  — voice-enrollment buttons

   Voice routing is automatic — Sona open ⇒ Sona, Sona minimized ⇒
   problem field. AICompanionPanel keeps the store's voiceRoute in
   sync with its own minimize state, so this bar no longer needs a
   manual route badge. */

import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { useInterviewStore } from '@/stores/interview-store';
import { useEffect, useMemo, useState } from 'react';

interface LumoraBottomBarProps {
  /** Forwarded to AudioCapture — receives `(text, { manual })`. The
      LumoraShellPage routes through dispatchTranscript. */
  onTranscription: (text: string, opts?: { manual?: boolean }) => void;
  /** 'coding' or 'design' — kept for parity with future surface-aware
      hints, even though routing no longer reads it. */
  surface?: 'coding' | 'design';
}

export function LumoraBottomBar({ onTranscription }: LumoraBottomBarProps) {
  const voiceEnrolled = useInterviewStore(s => s.voiceEnrolled);
  const voiceFilterEnabled = useInterviewStore(s => s.voiceFilterEnabled);
  const voiceEnrolledAt = useInterviewStore(s => s.voiceEnrolledAt);
  // Shared dismissal key with AICompanionPanel — same banner copy in
  // both places, so dismissing once should hide everywhere. Wired up
  // via a custom event so dismissing on one surface updates the other
  // sibling's React state immediately without a remount; storage
  // events also pick up cross-tab changes.
  const [dismissed, setDismissedState] = useState<boolean>(() => {
    try { return localStorage.getItem('lumora_voice_banner_dismissed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    const sync = () => {
      try { setDismissedState(localStorage.getItem('lumora_voice_banner_dismissed') === '1'); } catch {}
    };
    window.addEventListener('lumora:voice-banner-dismissed', sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lumora_voice_banner_dismissed') sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('lumora:voice-banner-dismissed', sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const dismiss = () => {
    setDismissedState(true);
    try { localStorage.setItem('lumora_voice_banner_dismissed', '1'); } catch {}
    try { window.dispatchEvent(new Event('lumora:voice-banner-dismissed')); } catch {}
  };

  // Stale enrollment — Resemblyzer embeddings drift with mic / room
  // changes; nudge after ~7 d so the filter stays accurate.
  const enrollmentStale = useMemo(() => {
    if (!voiceEnrolled || !voiceEnrolledAt) return false;
    const ageDays = Math.floor((Date.now() - voiceEnrolledAt) / (1000 * 60 * 60 * 24));
    return ageDays >= 7;
  }, [voiceEnrolled, voiceEnrolledAt]);

  const tone = !voiceEnrolled ? 'red' : (!voiceFilterEnabled || enrollmentStale) ? 'amber' : 'green';
  const bg = tone === 'red' ? 'rgba(220,38,38,0.08)' : tone === 'amber' ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.08)';
  const border = tone === 'red' ? 'rgba(220,38,38,0.35)' : tone === 'amber' ? 'rgba(245,158,11,0.40)' : 'rgba(16,185,129,0.35)';
  const stroke = tone === 'red' ? '#dc2626' : tone === 'amber' ? '#d97706' : '#10b981';
  const title = !voiceEnrolled ? 'Enroll your voice to filter it out' :
                !voiceFilterEnabled ? 'Your voice is being transcribed' :
                enrollmentStale ? 'Refresh your voice profile' :
                'Filter on — only the interviewer is heard';
  const hint = !voiceEnrolled ? 'Sona will answer YOUR voice until you enroll.' :
               !voiceFilterEnabled ? 'Turn Filter On so Sona only answers the interviewer.' :
               enrollmentStale ? 'Voice prints drift over time — re-enroll to keep filtering accurate.' :
               'Sona ignores you and replies only to the interviewer.';

  // When the banner is dismissed, render only the mic so the user
  // can still talk — the warning copy + enrollment buttons collapse
  // out. The mic stays visible because it IS the primary action of
  // this row; without it the whole bottom bar is empty.
  if (dismissed) {
    return (
      <div
        className="w-full flex items-center justify-center px-3 py-2"
        aria-label="Audio controls"
      >
        <div
          className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <AudioCapture onTranscription={onTranscription} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full grid grid-cols-[auto_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}
      aria-label="Audio controls"
    >
      {/* LEFT — voice-filter status icon + title. Hint paragraph hides
          on phones so the banner stays one-row-tall instead of eating
          ~40 vertical px when stacked. */}
      <div className="flex items-center gap-2 min-w-0 justify-self-start col-span-2 sm:col-span-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <div className="min-w-0">
          <p className="text-[12px] md:text-[11px] font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <p className="hidden sm:block text-[10px] leading-tight truncate" style={{ color: 'var(--text-muted)' }}>{hint}</p>
        </div>
      </div>

      {/* CENTER — MIC + AUTO + meter. Owns its own pill chrome so it
          reads as the primary action even on a tinted banner. */}
      <div
        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl shrink-0 justify-self-start sm:justify-self-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <AudioCapture onTranscription={onTranscription} />
      </div>

      {/* RIGHT — enrollment buttons + dismiss X. Banner persists its
          dismissal in localStorage so the same nag isn't shown on
          every page load once the user has seen it. */}
      <div className="flex items-center gap-1 justify-end justify-self-end">
        <VoiceEnrollment disabled={false} variant="light" />
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Dismiss this hint"
          title="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
