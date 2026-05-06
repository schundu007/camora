/**
 * SonaMicButton — one-shot voice capture for the Sona follow-ups
 * sidebar. Click to start recording, click again to stop. The audio
 * blob is POSTed to /api/v1/transcribe and the resulting text is
 * appended to the sidebar's input field via `onText`.
 *
 * Why isolated (not the existing AudioCapture):
 *   - The bottom-bar AudioCapture owns continuous-mode state,
 *     localStorage, voice-enrollment filtering, and the Auto / MIC
 *     UX. Mounting two of them shares state in confusing ways
 *     (toggling Auto in one would flip the other).
 *   - This button is intentionally dumb: no auto-fire, no keep-alive,
 *     no question-detection — just record-on-press, stop-on-press,
 *     transcribe, append. Matches the project's "explicit click-once
 *     buttons only" memory.
 *
 * Routing isolation:
 *   - Audio captured here NEVER lands in the design/coding problem
 *     field. The bottom bar (problem) and this button (sidebar) are
 *     two physically distinct UI controls — there is no toggle, no
 *     mode the user can mis-set.
 */
import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';

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

export function SonaMicButton({ onText, disabled = false }: SonaMicButtonProps) {
  const { token } = useAuth();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAndCleanup = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* noop */ }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
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
        // Release the mic immediately on stop so the OS recording
        // indicator goes away even if transcription is slow.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size === 0) { setState('idle'); return; }
        setState('transcribing');
        try {
          const result = await transcriptionAPI.transcribe(token, blob, 'sona-followup.webm', false);
          const text = (result?.text || '').trim();
          if (text) onText(text);
        } catch (err: any) {
          setError(err?.message || 'Transcribe failed');
        } finally {
          setState('idle');
        }
      };

      recorder.start();
      setState('recording');
    } catch (err: any) {
      setError(err?.name === 'NotAllowedError' ? 'Mic permission denied' : (err?.message || 'Mic unavailable'));
      stopAndCleanup();
      setState('idle');
    }
  }, [token, onText, stopAndCleanup]);

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* noop — onstop still fires below */ }
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
    // 'transcribing' state is non-interactive
  }, [disabled, state, startRecording, stopRecording]);

  const isRecording = state === 'recording';
  const isBusy = state === 'transcribing';
  const label =
    isRecording ? 'Stop recording'
    : isBusy ? 'Transcribing...'
    : 'Voice input';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBusy}
      title={error || label}
      aria-label={label}
      aria-pressed={isRecording}
      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: isRecording ? 'rgba(220,38,38,0.15)' : 'var(--bg-elevated)',
        border: `1px solid ${isRecording ? 'rgba(220,38,38,0.45)' : 'var(--border)'}`,
        color: isRecording ? '#dc2626' : 'var(--text-secondary)',
      }}
    >
      {isBusy ? (
        // Three-dot transcribing indicator
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0s" /></circle>
          <circle cx="12" cy="12" r="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.4s" /></circle>
          <circle cx="19" cy="12" r="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.8s" /></circle>
        </svg>
      ) : (
        // Mic glyph (filled red when recording)
        <svg width="13" height="13" viewBox="0 0 24 24" fill={isRecording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" fill="none" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
