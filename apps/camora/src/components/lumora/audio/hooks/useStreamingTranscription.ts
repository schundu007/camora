/**
 * Live streaming transcription over a WebSocket.
 *
 * WHY THIS EXISTS: the chunk-upload path cannot be made fast. Its shape is
 *   interviewer speaks → WAIT for them to stop → upload → transcribe → answer
 * so transcription cannot even BEGIN until the question is over. Swapping in a
 * faster model only shrinks one segment of a serial chain. Streaming changes
 * the shape: partial transcripts arrive WHILE they are talking, so the question
 * is complete the instant they stop and transcription latency effectively
 * disappears rather than shrinking.
 *
 * The socket talks straight to Deepgram — relaying frames through our backend
 * would add a hop in both directions on the exact path we are making instant.
 * The long-lived key never reaches the browser: the backend mints a token that
 * lives for seconds.
 *
 * Deliberately additive. It reports `unavailable` and does nothing when the
 * feature is off or the token call fails, so the existing chunk-upload path
 * stays in charge and a live interview cannot be broken by this being enabled.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'unavailable' | 'error';

export interface StreamingTranscriptionOptions {
  /** Final, endpointed utterance — this is what should reach the question gate. */
  onUtterance: (text: string) => void;
  /** Interim text, updated as they speak. For display only; never submit this. */
  onInterim?: (text: string) => void;
  token: string | null | undefined;
}

export interface StreamingTranscription {
  status: StreamStatus;
  error: string | null;
  /** Begin streaming the given audio track. Safe to call twice. */
  start: (stream: MediaStream) => Promise<void>;
  stop: () => void;
}

export function useStreamingTranscription({ onUtterance, onInterim, token }: StreamingTranscriptionOptions): StreamingTranscription {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // Deepgram emits is_final segments as it goes; an utterance is the run of
  // them up to UtteranceEnd. Buffer here so callers get whole questions, not
  // fragments — the same job the 1.2s coalescing timer did, but driven by a
  // real end-of-speech signal instead of a guess.
  const utteranceRef = useRef<string>('');

  const onUtteranceRef = useRef(onUtterance);
  const onInterimRef = useRef(onInterim);
  useEffect(() => { onUtteranceRef.current = onUtterance; }, [onUtterance]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  const stop = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* already stopped */ }
    recorderRef.current = null;
    const sock = socketRef.current;
    socketRef.current = null;
    if (sock && sock.readyState === WebSocket.OPEN) {
      // Tell Deepgram we're done so it flushes any final transcript instead of
      // us dropping the tail of the last question.
      try { sock.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* closing anyway */ }
      try { sock.close(); } catch { /* already closing */ }
    }
    utteranceRef.current = '';
    setStatus('idle');
  }, []);

  const flushUtterance = useCallback(() => {
    const text = utteranceRef.current.trim();
    utteranceRef.current = '';
    if (text) onUtteranceRef.current(text);
  }, []);

  const start = useCallback(async (stream: MediaStream) => {
    if (socketRef.current) return; // already streaming
    if (!token) { setStatus('unavailable'); return; }
    setError(null);
    setStatus('connecting');

    let cfg: any;
    try {
      const resp = await fetch(`${API_URL}/api/v1/transcribe/stream-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!resp.ok) {
        // 404 = feature off. Anything else = a real failure. Either way the
        // caller keeps using chunk upload, so this is not fatal.
        setStatus('unavailable');
        return;
      }
      cfg = await resp.json();
    } catch {
      setStatus('unavailable');
      return;
    }

    const qs = new URLSearchParams({ ...(cfg.params || {}) }).toString();
    let sock: WebSocket;
    try {
      // Deepgram accepts the token as a subprotocol, which keeps it out of the
      // URL (and therefore out of proxy logs and browser history).
      sock = new WebSocket(`${cfg.url}?${qs}`, ['token', cfg.token]);
    } catch (err: any) {
      setError(err?.message || 'Could not open the streaming socket.');
      setStatus('error');
      return;
    }
    socketRef.current = sock;

    sock.onopen = () => {
      setStatus('live');
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0 && sock.readyState === WebSocket.OPEN) sock.send(e.data);
      };
      // 250ms frames: small enough that interim results feel live, large enough
      // that we are not paying per-message overhead on every packet.
      rec.start(250);
    };

    sock.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'UtteranceEnd') {
        // The real end-of-speech signal. This is what replaces the timer.
        flushUtterance();
        return;
      }
      if (msg.type !== 'Results') return;

      const alt = msg.channel?.alternatives?.[0];
      const text = typeof alt?.transcript === 'string' ? alt.transcript.trim() : '';
      if (!text) return;

      if (msg.is_final) {
        utteranceRef.current = utteranceRef.current ? `${utteranceRef.current} ${text}` : text;
        // speech_final means Deepgram detected the end of speech within this
        // message; UtteranceEnd may not follow, so flush here too.
        if (msg.speech_final) flushUtterance();
      } else {
        onInterimRef.current?.(`${utteranceRef.current} ${text}`.trim());
      }
    };

    sock.onerror = () => {
      setError('Streaming transcription dropped.');
      setStatus('error');
    };

    sock.onclose = () => {
      // Flush whatever was mid-utterance so the last question is not lost when
      // the socket dies mid-interview.
      flushUtterance();
      if (socketRef.current === sock) socketRef.current = null;
      setStatus(prev => (prev === 'error' ? 'error' : 'idle'));
    };
  }, [token, flushUtterance]);

  useEffect(() => () => stop(), [stop]);

  return { status, error, start, stop };
}
