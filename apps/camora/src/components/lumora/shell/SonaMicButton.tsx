/**
 * SonaMicButton — voice capture for the Sona follow-ups sidebar.
 *
 * Two modes:
 *   manual (default) — click to start, click to stop. Same as before.
 *   auto  (autoMode) — starts recording immediately, uses AnalyserNode
 *     VAD to auto-stop after SILENCE_DURATION of silence, then calls
 *     onText + onDone. Parent handles re-triggering for continuous loop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';
import { Icon } from '@/components/shared/Icons';

interface SonaMicButtonProps {
  onText: (text: string) => void;
  /** Called after transcription completes (whether or not text was returned). */
  onDone?: () => void;
  disabled?: boolean;
  /** Increment to toggle mic on/off (driven by Cmd+M keyboard shortcut). */
  toggleTrigger?: number;
  /** When true: auto-starts, uses VAD silence detection to stop, no manual stop UI. */
  autoMode?: boolean;
}

type State = 'idle' | 'recording' | 'transcribing';

const RECORDER_MIME = 'audio/webm;codecs=opus';
const MAX_DURATION_MS = 90_000;
// VAD params for auto mode
const SILENCE_THRESHOLD = 0.012; // RMS below this = silence
const SILENCE_DURATION_MS = 1400; // ms of silence before auto-stop
const MIN_SPEECH_MS = 400; // ignore clips shorter than this

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

export const SonaMicButton = ({ onText, onDone, disabled = false, toggleTrigger, autoMode = false }: SonaMicButtonProps) => {
  const { token } = useAuth();
  const reducedMotion = usePrefersReducedMotion();

  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const speechStartRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const errorId = useRef(`sona-mic-error-${Math.random().toString(36).slice(2, 8)}`).current;

  const releaseStream = useCallback(() => {
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (analyserRef.current) { analyserRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (safetyStopRef.current) { clearTimeout(safetyStopRef.current); safetyStopRef.current = null; }
  }, []);

  useEffect(() => () => {
    clearTimers();
    try { recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    releaseStream();
  }, [clearTimers, releaseStream]);

  useEffect(() => {
    if (!toggleTrigger) return;
    handleClick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleTrigger]);

  const stopRecorder = useCallback(() => {
    try { recorderRef.current?.stop(); } catch {}
  }, []);

  const startRecording = useCallback(async () => {
    if (!token) { setError('Sign in to use voice'); return; }
    setError(null);
    chunksRef.current = [];
    speechStartRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported(RECORDER_MIME) ? RECORDER_MIME : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      // Set up VAD analyser for auto mode
      if (autoMode) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const poll = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArr);
          let sumSq = 0;
          for (let i = 0; i < dataArr.length; i++) sumSq += (dataArr[i] / 255) ** 2;
          const rms = Math.sqrt(sumSq / dataArr.length);
          setAudioLevel(rms);

          if (rms > SILENCE_THRESHOLD) {
            if (!speechStartRef.current) speechStartRef.current = Date.now();
            if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
          } else if (speechStartRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stopRecorder();
            }, SILENCE_DURATION_MS);
          }
          vadRafRef.current = requestAnimationFrame(poll);
        };
        vadRafRef.current = requestAnimationFrame(poll);
      }

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        clearTimers();
        releaseStream();
        setAudioLevel(0);
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];

        // In auto mode, skip clips with no speech or too short
        if (autoMode) {
          const speechDuration = speechStartRef.current ? Date.now() - speechStartRef.current : 0;
          if (blob.size === 0 || !speechStartRef.current || speechDuration < MIN_SPEECH_MS) {
            setState('idle');
            setElapsedMs(0);
            onDone?.();
            return;
          }
        } else if (blob.size === 0) {
          setState('idle');
          setElapsedMs(0);
          return;
        }

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
          onDone?.();
        }
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      tickRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250);
      safetyStopRef.current = setTimeout(() => stopRecorder(), MAX_DURATION_MS);
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
  }, [token, onText, onDone, autoMode, releaseStream, clearTimers, stopRecorder]);

  // Hands-free: arm the mic and RE-arm it after every utterance. This is what
  // makes auto mode automatic — the VAD stop, the transcribe and the send all
  // land back on state 'idle', and without this the loop ended there and the
  // user was back to reaching for a button mid-interview.
  //
  // startRecording is held in a ref: it closes over the parent's onText/onDone,
  // which are inline lambdas, so as a dependency it would re-arm on every
  // render of the sidebar.
  const startRef = useRef(startRecording);
  useEffect(() => { startRef.current = startRecording; }, [startRecording]);
  useEffect(() => {
    // `error` gates the loop deliberately. A denied mic permission leaves state
    // idle, and re-arming on that would call getUserMedia forever; the user
    // re-enables hands-free to retry.
    if (!autoMode || disabled || error || state !== 'idle' || !token) return;
    // A beat between utterances, so the tail of the last one doesn't open the
    // next recording and read as speech.
    const t = setTimeout(() => startRef.current(), 350);
    return () => clearTimeout(t);
  }, [autoMode, disabled, error, state, token]);

  /* eslint-disable react-hooks/preserve-manual-memoization -- compiler can't preserve this manual memo; DOM onClick identity is irrelevant so it's benign */
  const handleClick = useCallback(() => {
    if (disabled || autoMode) return;
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecorder();
  }, [disabled, autoMode, state, startRecording, stopRecorder]);
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const isRecording = state === 'recording';
  const isBusy = state === 'transcribing';
  const elapsedLabel = formatElapsed(elapsedMs);
  const remainingSecs = Math.max(0, Math.ceil((MAX_DURATION_MS - elapsedMs) / 1000));
  const aboutToTimeout = isRecording && remainingSecs <= 10;
  const hasSpeech = !!speechStartRef.current;

  // The ` shortcut is surfaced in the label so the button teaches it — the
  // whole point of the hotkey is not having to find this button mid-interview.
  const ariaLabel =
    isRecording ? `Stop recording (${elapsedLabel}) — or press \``
    : isBusy ? 'Transcribing audio'
    : 'Record voice question (press ` to toggle)';

  // Auto mode: compact status indicator, no clickable button
  if (autoMode) {
    const barCount = 4;
    const levelBars = Array.from({ length: barCount }, (_, i) => {
      const threshold = (i + 1) / barCount;
      return audioLevel > threshold * SILENCE_THRESHOLD * 6;
    });
    return (
      <div className="flex items-center gap-2">
        {isRecording ? (
          <>
            <div className="flex items-end gap-[2px] h-4">
              {levelBars.map((active, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-sm transition-all duration-75"
                  style={{
                    height: active ? `${8 + i * 2}px` : '4px',
                    background: hasSpeech ? 'var(--cam-primary)' : 'var(--cam-strip-icon-bg)',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: hasSpeech ? 'var(--cam-primary)' : 'var(--cam-strip-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {hasSpeech ? 'Speaking…' : 'Listening…'}
            </span>
          </>
        ) : isBusy ? (
          <>
            <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 h-1 rounded-full" style={{ background: 'var(--cam-gold-leaf-lt)', animation: reducedMotion ? undefined : `sona-mic-dot-pulse 1.2s ease-in-out ${i * 0.18}s infinite`, opacity: reducedMotion ? 0.6 : undefined }} />
              ))}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--cam-strip-text-muted)', fontFamily: 'var(--font-mono)' }}>Transcribing…</span>
          </>
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--cam-strip-text-muted)', fontFamily: 'var(--font-mono)' }}>Ready</span>
        )}
        {error && <span className="text-[10px]" style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{error}</span>}
        <style>{`
          @keyframes sona-mic-dot-pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.85); }
            50%      { opacity: 1;   transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // Manual mode: original button UI
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isBusy}
          data-tip={ariaLabel}
          aria-label={ariaLabel}
          aria-pressed={isRecording}
          aria-describedby={error ? errorId : undefined}
          className="flex items-center justify-center w-8 h-8 rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]"
          style={{
            background: isRecording ? 'color-mix(in oklab, var(--danger) 14%, transparent)' : 'var(--bg-elevated)',
            border: `1px solid ${isRecording ? 'color-mix(in oklab, var(--danger) 45%, transparent)' : 'var(--border)'}`,
            color: isRecording ? 'var(--danger)' : 'var(--text-secondary)',
            transition: 'background-color 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out',
            ['--tw-ring-color' as any]: 'var(--danger)',
          }}
        >
          {isBusy ? (
            <span aria-hidden="true" className="inline-flex items-center gap-[3px] leading-none">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 h-1 rounded-full" style={{ background: 'currentColor', animation: reducedMotion ? undefined : `sona-mic-dot-pulse 1.2s ease-in-out ${i * 0.18}s infinite`, opacity: reducedMotion ? 0.6 : undefined }} />
              ))}
            </span>
          ) : isRecording ? (
            <Icon name="stop" size={12} aria-hidden="true" />
          ) : (
            <Icon name="microphone" size={14} aria-hidden="true" />
          )}
        </button>

        {isRecording && (
          <span className="text-[10px] tabular-nums select-none" style={{ fontFamily: 'var(--font-mono)', color: aboutToTimeout ? 'var(--danger)' : 'var(--text-muted)', transition: 'color 0.15s ease-out' }} aria-live="polite">
            {elapsedLabel}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-[10px] leading-tight" style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
          {error}
        </p>
      )}

      <style>{`
        @keyframes sona-mic-dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
