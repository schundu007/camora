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
import { loadAudioPrefs } from '@/lib/audio-preferences';
import { useSessionStore } from '@/stores/session-store';

interface Props {
  onStart?: () => void;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  disabled?: boolean;
  /** Increment to toggle recording from a parent keyboard shortcut. */
  toggleSignal?: number;
  /**
   * Fired when recording ends because the speaker STOPPED TALKING, immediately
   * before the final transcript is produced. Not fired when the user clicks the
   * button to stop, which stays a deliberate "stop but let me edit first".
   *
   * The parent uses this to send the question automatically, which is the whole
   * point: dictation used to cost three deliberate actions — click mic, click
   * mic again, click send — for one thought.
   */
  onSilenceStop?: () => void;
}

const RECORDER_MIME = 'audio/webm;codecs=opus';
const GROQ_TICK_MS = 1200;
// Quiet gap that ends an utterance. Long enough to survive the pause in the
// middle of a real sentence ("what's the difference between … pull and fetch"),
// short enough that finishing a question doesn't feel like waiting.
const SILENCE_MS = 2000;
// Never heard a word — release the mic instead of recording an empty room
// forever (mic opened by accident, wrong input device, muted hardware).
const NO_SPEECH_TIMEOUT_MS = 12000;
// Hard ceiling on one dictated utterance. SILENCE_MS alone is not a bound: it
// needs 2s where EVERY frame is under SPEECH_RMS, and a room with people still
// talking in it never provides that — so the recording ran on indefinitely,
// swallowing whatever else was said and never auto-sending. Every other capture
// path in the app has this ceiling (45s in useAudioCapture, 12s in
// useSpeakerCapture); this one had none. Ending here counts as a silence stop,
// because speech was heard and there is a real transcript to send.
const MAX_UTTERANCE_MS = 30000;
// RMS above which a frame counts as speech. Well clear of room tone.
const SPEECH_RMS = 0.015;
const VAD_TICK_MS = 100;
const WS_BASE = (import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com').replace(/^http/, 'ws');

export const StreamingMicButton = ({ onStart, onInterim, onFinal, disabled = false, toggleSignal, onSilenceStop }: Props) => {
  const { token } = useAuth();
  /* When the candidate has enrolled a voice print AND switched the filter on,
     that is a standing instruction — "do not turn my own voice into text" —
     and it has to hold on THIS mic too, not just the behavioral one.
     Ask's dictation path hardcoded filter_user_voice:false, so with no
     dedicated interviewer stream to fall back to, Ask happily transcribed the
     candidate while the Filter chip two controls away said it was on.

     The trade is real and belongs to the user, which is why it rides on a
     switch they can see: while the filter is on you cannot dictate your own
     question to Sona here — that is the same voice being removed. Turn the
     filter off to dictate. */
  const filterMyVoice = useSessionStore(
    (s) => s.voiceEnrolled && s.voiceFilterEnabled,
  );
  const filterMyVoiceRef = useRef(filterMyVoice);
  useEffect(() => { filterMyVoiceRef.current = filterMyVoice; }, [filterMyVoice]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recordingRef = useRef(false);
  useEffect(() => { recordingRef.current = recording; }, [recording]);

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

  // ── Voice activity detection ───────────────────────────────────────────
  // Watches the mic level so the button can end the utterance by itself.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const vadActiveRef = useRef(false);
  const heardSpeechRef = useRef(false);
  // stop() is defined below and the VAD loop needs it — a ref keeps the
  // ordering honest without hoisting the whole callback above its own deps.
  const stopRef = useRef<(() => void) | null>(null);

  const stopVad = useCallback(() => {
    vadActiveRef.current = false;
    if (vadTimerRef.current) { clearInterval(vadTimerRef.current); vadTimerRef.current = null; }
    try { void audioCtxRef.current?.close(); } catch { /* already closed */ }
    audioCtxRef.current = null;
  }, []);

  const releaseMedia = useCallback(() => {
    stopVad();
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
    recorderRef.current = null;
  }, [stopVad]);

  const startVad = useCallback((stream: MediaStream) => {
    // setInterval, not requestAnimationFrame: rAF is throttled or paused when
    // the window is backgrounded, which on the desktop app would leave the mic
    // open with no way to notice.
    try {
      const Ctx: typeof AudioContext = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      // Safari (and Chrome under some autoplay policies) hands back a suspended
      // context. A suspended analyser reads pure silence, so the loop would
      // never hear speech and would close the mic on the no-speech timeout
      // while the user was talking into it.
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const startedAt = Date.now();
      let lastVoiceAt = startedAt;
      heardSpeechRef.current = false;
      vadActiveRef.current = true;
      vadTimerRef.current = window.setInterval(() => {
        if (!vadActiveRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        const now = Date.now();
        if (rms > SPEECH_RMS) { heardSpeechRef.current = true; lastVoiceAt = now; }
        // Spoke, then went quiet → that was the question. Stop and let the
        // parent send it.
        if (heardSpeechRef.current && now - lastVoiceAt > SILENCE_MS) {
          vadActiveRef.current = false;
          onSilenceStop?.();
          stopRef.current?.();
          return;
        }
        // Never spoke at all → just stop. Nothing to send, so no onSilenceStop.
        if (!heardSpeechRef.current && now - startedAt > NO_SPEECH_TIMEOUT_MS) {
          vadActiveRef.current = false;
          stopRef.current?.();
          return;
        }
        // Spoke, and the room never went quiet long enough to close the
        // utterance. Close it ourselves and send what we have rather than
        // recording until the user notices nothing was submitted.
        if (heardSpeechRef.current && now - startedAt > MAX_UTTERANCE_MS) {
          vadActiveRef.current = false;
          onSilenceStop?.();
          stopRef.current?.();
        }
      }, VAD_TICK_MS);
    } catch {
      // No AudioContext (or the device refused the graph) — dictation still
      // works, it just needs the click to stop, exactly as it did before.
    }
  }, [onSilenceStop]);

  const fullText = () => (committedRef.current + ' ' + interimRef.current).trim();

  // Deepgram is fed headerless WebM fragments (MediaRecorder only puts the
  // container header in the first chunk), so it intermittently re-decodes audio
  // it already sent us and emits the same utterance as a second `is_final`.
  // Blindly concatenating those turned "What is the difference between pull
  // request" into that phrase three times over. Append only the genuinely new
  // tail: drop exact repeats, and trim any overlap between what we've committed
  // and what just arrived.
  const appendFinal = (prev: string, incoming: string) => {
    const next = incoming.trim();
    if (!next) return prev;
    if (!prev) return next;
    if (prev.toLowerCase().endsWith(next.toLowerCase())) return prev;
    const max = Math.min(prev.length, next.length);
    for (let k = max; k > 8; k--) {
      if (prev.slice(-k).toLowerCase() === next.slice(0, k).toLowerCase()) {
        return prev + next.slice(k);
      }
    }
    return prev + ' ' + next;
  };

  // ── Groq fallback: re-transcribe the growing clip ──────────────────────
  const groqTranscribe = useCallback(async (isFinal: boolean) => {
    if (!token || chunksRef.current.length === 0) return;
    if (!isFinal && inFlightRef.current) return;
    const seq = ++seqRef.current;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    if (blob.size < 1200) return;
    if (!isFinal) inFlightRef.current = true;
    try {
      const filtered = filterMyVoiceRef.current;
      const res = await transcriptionAPI.transcribe(token, blob, 'ask-dictation.webm', filtered);
      // A filtered chunk that was ALL the candidate comes back skipped. That is
      // the filter working, not a failure — drop it rather than committing an
      // empty string over text already in the composer.
      if (res.skipped) { if (!isFinal) return; }
      const clean = (res.text || '').trim();
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
    startVad(stream);
    tickRef.current = window.setInterval(() => { groqTranscribe(false); }, GROQ_TICK_MS);
  }, [groqTranscribe, releaseMedia, startVad]);

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
          committedRef.current = appendFinal(committedRef.current, msg.text).trim();
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
    startVad(stream);
  }, [onInterim, onFinal, releaseMedia, groqTranscribe, startVad]);

  const start = useCallback(async () => {
    if (!token || disabled) return;
    onStart?.();
    let stream: MediaStream;
    try {
      // Record from the mic the user actually chose in the Audio Setup wizard,
      // the same canonical preference useAudioCapture / useCalibration read.
      // `audio: true` took the OS default input instead — and on a machine set
      // up for interviews that default is often a loopback or aggregate device
      // (BlackHole, Multi-Output, VoiceMeeter), so dictation was recording the
      // meeting rather than the person dictating.
      //
      // `ideal`, not `exact`: a device unplugged or re-enumerated after a USB
      // replug falls back to the system default instead of throwing
      // OverconstrainedError mid-interview. Mirrors useAudioCapture.
      const micDeviceId = loadAudioPrefs().micDeviceId;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId ? { deviceId: { ideal: micDeviceId } } : true,
      });
      streamRef.current = stream;
    } catch { return; }

    // The Deepgram socket streams raw audio straight from the browser, so
    // nothing on that path can remove the candidate's voice — the live interim
    // would type out the very words the filter exists to drop. When the filter
    // is on, take the Groq path, which goes through our backend and can.
    if (filterMyVoiceRef.current) { startGroq(stream); return; }

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
    stopVad();
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { recorderRef.current?.stop(); } catch {}
    // ws is closed inside the recorder's onstop for the WS path.
  }, [stopVad]);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  // Toggle from a parent keyboard shortcut (Space in the Ask composer).
  const prevToggleRef = useRef(toggleSignal);
  useEffect(() => {
    if (toggleSignal === undefined || prevToggleRef.current === toggleSignal) return;
    prevToggleRef.current = toggleSignal;
    if (disabled || busy) return;
    if (recordingRef.current) stop(); else start();
  }, [toggleSignal, disabled, busy, start, stop]);

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
      data-tip={active
        ? 'Listening to you — stop talking and it sends by itself. Click or press Space to stop without sending.'
        : filterMyVoice
          ? 'Listening with your voice filtered out — only other voices become text. Turn the voice filter off if you want to dictate your own question.'
          : 'Talk instead of typing (Space) — it sends automatically when you stop.'}
      aria-label={active ? 'Stop dictation' : 'Start dictation'}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 hover:opacity-85"
      style={{ background: active ? 'var(--danger, var(--danger))' : 'var(--bg-app)', border: '1px solid var(--cam-gold-leaf-dk)' }}
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
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--danger, var(--danger))' }} />
      )}
    </button>
  );
};

export default StreamingMicButton;
