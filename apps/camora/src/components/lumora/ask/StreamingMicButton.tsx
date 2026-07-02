/**
 * StreamingMicButton — live dictation for the Ask Sona composer.
 *
 * Primary path: streams mic audio over a WebSocket to the backend, which
 * bridges to Deepgram realtime STT — interim results type in word-by-word as
 * you talk. Works in web and the Electron desktop app (both just open a WS).
 *
 * Fallback: if the socket can't connect (no Deepgram key, network), it
 * degrades to the Groq near-live path — record continuously and re-transcribe
 * the growing clip ~once/sec via /api/v1/transcribe. Either way, onInterim
 * emits the full dictation-so-far (the composer prepends the pre-dictation
 * text) and onFinal commits it.
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
const GROQ_TICK_MS = 1200;
const WS_BASE = (import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com').replace(/^http/, 'ws');

export const StreamingMicButton = ({ onStart, onInterim, onFinal, disabled = false }: Props) => {
  const { token } = useAuth();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeRef = useRef<string>('audio/webm');
  // WS (Deepgram) path
  const wsRef = useRef<WebSocket | null>(null);
  const committedRef = useRef('');
  const interimRef = useRef('');
  // Groq fallback path
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const seqRef = useRef(0);
  const modeRef = useRef<'ws' | 'groq' | null>(null);

  const releaseMedia = useCallback(() => {
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const fullText = () => (committedRef.current + ' ' + interimRef.current).trim();

  // ── Groq fallback: re-transcribe the growing clip ──────────────────────
  const groqTranscribe = useCallback(async (isFinal: boolean) => {
    if (!token || chunksRef.current.length === 0) return;
    if (!isFinal && inFlightRef.current) return;
    const seq = ++seqRef.current;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    if (blob.size < 1200) return;
    if (!isFinal) inFlightRef.current = true;
    try {
      const { text } = await transcriptionAPI.transcribe(token, blob, 'ask-dictation.webm', false);
      const clean = (text || '').trim();
      if (seq !== seqRef.current && !isFinal) return;
      if (isFinal) onFinal(clean);
      else if (clean) onInterim(clean);
    } catch { /* recover next tick */ }
    finally { if (!isFinal) inFlightRef.current = false; }
  }, [token, onInterim, onFinal]);

  const startGroq = useCallback((stream: MediaStream) => {
    modeRef.current = 'groq';
    chunksRef.current = [];
    seqRef.current = 0;
    inFlightRef.current = false;
    const mime = MediaRecorder.isTypeSupported(RECORDER_MIME) ? RECORDER_MIME : '';
    mimeRef.current = mime || 'audio/webm';
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      setRecording(false); setBusy(true);
      await groqTranscribe(true);
      setBusy(false); chunksRef.current = []; releaseMedia();
    };
    rec.start(1000);
    setRecording(true);
    tickRef.current = window.setInterval(() => { groqTranscribe(false); }, GROQ_TICK_MS);
  }, [groqTranscribe, releaseMedia]);

  // ── Deepgram WS path ───────────────────────────────────────────────────
  const startWs = useCallback((stream: MediaStream, ws: WebSocket) => {
    modeRef.current = 'ws';
    committedRef.current = '';
    interimRef.current = '';
    const mime = MediaRecorder.isTypeSupported(RECORDER_MIME) ? RECORDER_MIME : '';
    mimeRef.current = mime || 'audio/webm';
    chunksRef.current = [];
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = async (e) => {
      if (e.data.size === 0) return;
      // Keep the raw audio for the accurate Whisper final, and stream it to
      // Deepgram for the live interim.
      chunksRef.current.push(e.data);
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(await e.data.arrayBuffer()); } catch {}
      }
    };
    rec.onstop = async () => {
      setRecording(false); setBusy(true);
      try { ws.close(); } catch {}
      // Authoritative final: re-transcribe the whole clip with Whisper (Groq),
      // which is more accurate on technical terms than realtime STT — this
      // corrects the rough live text (e.g. "Kate's" → "Kafka's") on stop.
      await groqTranscribe(true);
      setBusy(false);
      chunksRef.current = [];
      releaseMedia();
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'final' && msg.text) {
          committedRef.current = (committedRef.current + ' ' + msg.text).trim();
          interimRef.current = '';
          onInterim(fullText());
        } else if (msg.type === 'interim' && msg.text) {
          interimRef.current = msg.text;
          onInterim(fullText());
        }
      } catch {}
    };
    rec.start(250); // small chunks → low-latency streaming
    setRecording(true);
  }, [onInterim, onFinal, releaseMedia, groqTranscribe]);

  const start = useCallback(async () => {
    if (!token || disabled) return;
    onStart?.();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch { return; }

    // Try Deepgram WS first; fall back to Groq if it doesn't become ready.
    let settled = false;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${WS_BASE}/api/v1/dictate/live?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
    } catch {
      startGroq(stream); return;
    }
    const fallbackTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws?.close(); } catch {}
      wsRef.current = null;
      startGroq(stream);
    }, 1800);

    ws.onopen = () => { /* wait for server 'ready' (Deepgram connected) */ };
    ws.onmessage = (ev) => {
      if (settled) return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'ready') {
          settled = true;
          clearTimeout(fallbackTimer);
          startWs(stream, ws!);
        } else if (msg.type === 'error') {
          settled = true;
          clearTimeout(fallbackTimer);
          try { ws?.close(); } catch {}
          startGroq(stream);
        }
      } catch {}
    };
    const onFail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      startGroq(stream);
    };
    ws.onerror = onFail;
    ws.onclose = () => { if (!settled) onFail(); };
  }, [token, disabled, onStart, startGroq, startWs]);

  const stop = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { recorderRef.current?.stop(); } catch {}
    // ws is closed inside the recorder's onstop for the WS path.
  }, []);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    try { wsRef.current?.close(); } catch {}
    releaseMedia();
  }, [releaseMedia]);

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
      style={{ background: active ? 'var(--danger, #ef4444)' : 'var(--bg-app)', border: '1px solid var(--cam-gold-leaf-dk)' }}
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
