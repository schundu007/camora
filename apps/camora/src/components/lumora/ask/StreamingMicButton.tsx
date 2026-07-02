/**
 * StreamingMicButton — near-live dictation for the Ask Sona composer.
 *
 * Unlike SonaMicButton (records → transcribes once on stop), this records
 * continuously and re-transcribes the growing clip every ~1.2s, emitting the
 * partial transcript via onInterim so the text types in *while you talk*.
 * On stop it does one final, authoritative transcription via onFinal.
 *
 * It reuses the existing /api/v1/transcribe REST endpoint (Whisper/Deepgram),
 * so it behaves identically in the web app and the Electron desktop app —
 * both are just clients of the same backend. No browser SpeechRecognition
 * (which is unavailable in Electron).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';

interface Props {
  onStart?: () => void;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  disabled?: boolean;
}

const RECORDER_MIME = 'audio/webm;codecs=opus';
const TICK_MS = 1200; // how often we re-transcribe the growing clip

export const StreamingMicButton = ({ onStart, onInterim, onFinal, disabled = false }: Props) => {
  const { token } = useAuth();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false); // final transcription in flight

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>('audio/webm');
  const tickRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const seqRef = useRef(0); // guards out-of-order interim results

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const transcribeCurrent = useCallback(async (isFinal: boolean) => {
    if (!token || chunksRef.current.length === 0) return;
    if (!isFinal && inFlightRef.current) return; // skip overlapping interim calls
    const seq = ++seqRef.current;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    if (blob.size < 1200) return; // too little audio yet
    if (!isFinal) inFlightRef.current = true;
    try {
      const { text } = await transcriptionAPI.transcribe(token, blob, 'ask-dictation.webm', false);
      const clean = (text || '').trim();
      // Ignore a stale interim that resolved after a newer one.
      if (seq !== seqRef.current && !isFinal) return;
      if (isFinal) onFinal(clean);
      else if (clean) onInterim(clean);
    } catch {
      /* transient — next tick or the final pass will recover */
    } finally {
      if (!isFinal) inFlightRef.current = false;
    }
  }, [token, onInterim, onFinal]);

  const stop = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { recorderRef.current?.stop(); } catch {}
  }, []);

  const start = useCallback(async () => {
    if (!token || disabled) return;
    chunksRef.current = [];
    seqRef.current = 0;
    inFlightRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported(RECORDER_MIME) ? RECORDER_MIME : '';
      mimeRef.current = mime || 'audio/webm';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        setRecording(false);
        setBusy(true);
        await transcribeCurrent(true);
        setBusy(false);
        chunksRef.current = [];
        cleanup();
      };

      recorder.start(1000); // emit a chunk every 1s
      setRecording(true);
      onStart?.();
      tickRef.current = window.setInterval(() => { transcribeCurrent(false); }, TICK_MS);
    } catch {
      cleanup();
      setRecording(false);
    }
  }, [token, disabled, transcribeCurrent, cleanup, onStart]);

  const onClick = () => { if (recording) stop(); else start(); };

  const active = recording;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={active ? 'Stop dictation' : 'Dictate — text types in as you talk'}
      aria-label={active ? 'Stop dictation' : 'Start dictation'}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 hover:opacity-85"
      style={{
        background: active ? 'var(--danger, #ef4444)' : 'var(--bg-app)',
        border: '1px solid var(--cam-gold-leaf-dk)',
      }}
    >
      {busy ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--text-muted)' }} />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'var(--cam-gold-leaf)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
      {active && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--danger, #ef4444)' }} />
      )}
    </button>
  );
};

export default StreamingMicButton;
