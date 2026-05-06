/**
 * SonaMicButton — one-shot voice capture for the Sona follow-ups
 * sidebar. Click to start recording, click again to stop. The audio
 * blob is POSTed to /api/v1/transcribe and the resulting text is
 * appended to the sidebar's input field via `onText`.
 *
 * Why isolated (not the existing AudioCapture):
 *   - The bottom-bar AudioCapture owns continuous-mode state,
 *     localStorage, voice-enrollment filtering, and the Auto / MIC
 *     UX. Mounting two of them shares state in confusing ways.
 *   - This button is intentionally dumb: no auto-fire, no keep-alive,
 *     no question-detection — record-on-press, stop-on-press, transcribe,
 *     append. Matches the project's "explicit click-once buttons only" rule.
 *
 * Routing isolation:
 *   - Audio captured here NEVER lands in the design/coding problem
 *     field. The bottom bar (problem) and this button (sidebar) are
 *     two physically distinct UI controls — no toggle to mis-set.
 *
 * Safety:
 *   - Max recording duration (MAX_DURATION_MS) auto-stops to prevent
 *     a forgotten recording from running indefinitely.
 *   - Mic stream is released on stop, on unmount, and on permission /
 *     fetch errors so the OS recording indicator never lingers.
 *   - Honors prefers-reduced-motion: the transcribing indicator
 *     becomes static instead of animated.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';
import { Icon } from '@/components/shared/Icons';

interface SonaMicButtonProps {
  /** Receives the transcribed text. Sidebar typically appends to its
   *  input state so the user can edit before pressing "Ask Sona". */
  onText: (text: string) => void;
  /** When true (e.g. while a Sona answer is streaming), the mic is
   *  visually disabled and clicks no-op. */
  disabled?: boolean;
}

type State = 'idle' | 'recording' | 'transcribing';

const RECORDER_MIME = 'audio/webm;codecs=opus';
// Cap a single recording at 90 s. Long enough for a multi-sentence
// follow-up, short enough that a forgotten click stops automatically.
const MAX_DURATION_MS = 90_000;

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60).toString().padStart(1, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function SonaMicButton({ onText, disabled = false }: SonaMicButtonProps) {
  const { token } = useAuth();
  const reducedMotion = usePrefersReducedMotion();

  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorId = useRef(`sona-mic-error-${Math.random().toString(36).slice(2, 8)}`).current;

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (safetyStopRef.current) { clearTimeout(safetyStopRef.current); safetyStopRef.current = null; }
  }, []);

  // Hard cleanup on unmount — guarantees the OS mic indicator goes
  // away even if the user navigates mid-recording.
  useEffect(() => () => {
    clearTimers();
    try { recorderRef.current?.stop(); } catch { /* noop */ }
    recorderRef.current = null;
    releaseStream();
  }, [clearTimers, releaseStream]);

  const stopRecorder = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* onstop still fires */ }
  }, []);

  const startRecording = useCallback(async () => {
    if (!token) { setError('Sign in to use voice'); return; }
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported(RECORDER_MIME) ? RECORDER_MIME : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        clearTimers();
        // Release the mic immediately on stop so the OS recording
        // indicator goes away even if transcription is slow.
        releaseStream();
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size === 0) { setState('idle'); setElapsedMs(0); return; }
        setState('transcribing');
        try {
          const result = await transcriptionAPI.transcribe(token, blob, 'sona-followup.webm', false);
          const text = (result?.text || '').trim();
          if (text) onText(text);
        } catch (err: any) {
          setError(err?.message || 'Transcription failed');
        } finally {
          setState('idle');
          setElapsedMs(0);
        }
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);
      safetyStopRef.current = setTimeout(() => {
        // Auto-stop after MAX_DURATION_MS so a forgotten click
        // doesn't burn the user's mic + bandwidth indefinitely.
        stopRecorder();
      }, MAX_DURATION_MS);
      setState('recording');
    } catch (err: any) {
      setError(
        err?.name === 'NotAllowedError' ? 'Mic permission denied'
          : err?.name === 'NotFoundError' ? 'No microphone found'
          : (err?.message || 'Mic unavailable'),
      );
      releaseStream();
      setState('idle');
    }
  }, [token, onText, releaseStream, clearTimers, stopRecorder]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecorder();
    // 'transcribing' state is non-interactive
  }, [disabled, state, startRecording, stopRecorder]);

  const isRecording = state === 'recording';
  const isBusy = state === 'transcribing';
  const elapsedLabel = formatElapsed(elapsedMs);
  const remainingSecs = Math.max(0, Math.ceil((MAX_DURATION_MS - elapsedMs) / 1000));
  const aboutToTimeout = isRecording && remainingSecs <= 10;

  // Aria label is dynamic so screen readers narrate state transitions.
  const ariaLabel =
    isRecording ? `Stop recording (${elapsedLabel} of ${formatElapsed(MAX_DURATION_MS)})`
    : isBusy ? 'Transcribing audio'
    : 'Record voice question';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isBusy}
          title={ariaLabel}
          aria-label={ariaLabel}
          aria-pressed={isRecording}
          aria-describedby={error ? errorId : undefined}
          className="flex items-center justify-center w-8 h-8 rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]"
          style={{
            background: isRecording
              ? 'color-mix(in oklab, var(--danger) 14%, transparent)'
              : 'var(--bg-elevated)',
            border: `1px solid ${isRecording
              ? 'color-mix(in oklab, var(--danger) 45%, transparent)'
              : 'var(--border)'}`,
            color: isRecording ? 'var(--danger)' : 'var(--text-secondary)',
            transition: 'background-color 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out',
            ['--tw-ring-color' as any]: 'var(--danger)',
          }}
        >
          {isBusy ? (
            // Three dots — text-mode for reduced-motion users so nothing animates;
            // otherwise the same three dots with a staggered opacity pulse.
            <span aria-hidden="true" className="inline-flex items-center gap-[3px] leading-none">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: 'currentColor',
                    animation: reducedMotion
                      ? undefined
                      : `sona-mic-dot-pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                    opacity: reducedMotion ? 0.6 : undefined,
                  }}
                />
              ))}
            </span>
          ) : isRecording ? (
            <Icon name="stop" size={12} aria-hidden="true" />
          ) : (
            <Icon name="microphone" size={14} aria-hidden="true" />
          )}
        </button>

        {/* Recording timer — only visible while recording. Turns warning
            color in the last 10 s so the user knows the safety auto-stop
            is approaching. tabular-nums prevents jitter as digits change. */}
        {isRecording && (
          <span
            className="text-[10px] tabular-nums select-none"
            style={{
              fontFamily: 'var(--font-mono)',
              color: aboutToTimeout ? 'var(--danger)' : 'var(--text-muted)',
              transition: 'color 0.15s ease-out',
            }}
            aria-live="polite"
          >
            {elapsedLabel}
          </span>
        )}
      </div>

      {/* Inline error — visible, not hover-only. Dismisses on next
          successful interaction (start/stop/transcribe). */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[10px] leading-tight"
          style={{
            color: 'var(--danger)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {error}
        </p>
      )}

      {/* Local keyframes for the transcribing-dots pulse. Scoped to
          this component so we don't pollute global CSS. */}
      <style>{`
        @keyframes sona-mic-dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
