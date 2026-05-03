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
import { useMemo } from 'react';

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

  return (
    <div
      className="w-full grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}
      aria-label="Audio controls"
    >
      {/* LEFT — voice-filter status icon + title + hint */}
      <div className="flex items-center gap-2 min-w-0 justify-self-start">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <div className="min-w-0">
          <p className="text-[12px] md:text-[11px] font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <p className="text-[10px] leading-tight truncate" style={{ color: 'var(--text-muted)' }}>{hint}</p>
        </div>
      </div>

      {/* CENTER — MIC + AUTO + meter. Owns its own pill chrome so it
          reads as the primary action even on a tinted banner. */}
      <div
        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl shrink-0 justify-self-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <AudioCapture onTranscription={onTranscription} />
      </div>

      {/* RIGHT — enrollment buttons. Manual route switch removed; voice
          routing is now driven by Sona's open / minimized state. */}
      <div className="flex items-center gap-2 justify-end justify-self-end">
        <VoiceEnrollment disabled={false} variant="light" />
      </div>
    </div>
  );
}
