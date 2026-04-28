import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useInterviewerCapture } from './hooks/useInterviewerCapture';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';
import { useInterviewStore } from '@/stores/interview-store';
import { loadAudioPrefs, type AudioPreferences } from '@/lib/audio-preferences';

/* ──────────────────────────────────────────────────────────────────────────
 * Interviewer-audio architecture
 *
 * The interviewer's voice is captured from a separate stream — either a
 * shared browser tab (Zoom/Meet/Teams web client) or, on the Electron
 * desktop app, system-loopback audio routed through the same
 * getDisplayMedia API.
 *
 * Design contract:
 *   • This stream IS the interviewer. No speaker diarization runs on it.
 *   • Transcription always sends `filter_user_voice: false`.
 *   • The candidate's mic is captured separately by AudioCapture and is
 *     the candidate by definition.
 *
 * One capture instance is shared between the setup gate (which prompts
 * the user at session start) and the topbar status pill, so the user
 * only has to share once. ── */

type Ctx = {
  active: boolean;
  isSupported: boolean;
  level: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
};

const InterviewerAudioContext = createContext<Ctx | null>(null);

export function InterviewerAudioProvider({
  onTranscription,
  children,
}: {
  onTranscription?: (text: string) => void;
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  const { setInterviewerAudio, setStatus } = useInterviewStore();
  const onTranscriptionRef = useRef(onTranscription);
  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  }, [onTranscription]);

  const handleAudioData = useCallback(
    async (blob: Blob) => {
      if (!token || blob.size < 200) return;
      try {
        const result = await transcriptionAPI.transcribe(token, blob, 'interviewer.webm', false);
        const text = result.text?.trim();
        if (text && !result.skipped) {
          onTranscriptionRef.current?.(text);
        }
      } catch (err) {
        console.error('[InterviewerAudio] transcription failed', err);
      }
    },
    [token],
  );

  const handleAudioLevel = useCallback(
    (level: number) => {
      setInterviewerAudio({ level });
    },
    [setInterviewerAudio],
  );

  // Reactively read audio prefs — wizard writes via patchAudioPrefs and
  // dispatches `lumora:audio-prefs-updated` so the provider picks up the
  // user's chosen method/device without a reload.
  const [prefs, setPrefs] = useState<AudioPreferences>(loadAudioPrefs);
  useEffect(() => {
    const refresh = () => setPrefs(loadAudioPrefs());
    window.addEventListener('storage', refresh);
    window.addEventListener('lumora:audio-prefs-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('lumora:audio-prefs-updated', refresh);
    };
  }, []);

  const {
    isCapturing,
    isSupported,
    error,
    audioLevel,
    startCapture,
    stopCapture,
  } = useInterviewerCapture({
    method: prefs.captureMethod,
    virtualMicDeviceId: prefs.virtualMicDeviceId,
    onAudioData: handleAudioData,
    onAudioLevel: handleAudioLevel,
    silenceThreshold: 0.012,
    silenceDuration: 1200,
    minSpeechDuration: 400,
    maxRecordingDuration: 12000,
  });

  useEffect(() => {
    setInterviewerAudio({ active: isCapturing, error });
    if (isCapturing) {
      setInterviewerAudio({ everConnected: true });
      setStatus('listen', 'Interviewer audio live');
    }
  }, [isCapturing, error, setInterviewerAudio, setStatus]);

  const stop = useCallback(() => {
    stopCapture();
    setInterviewerAudio({ active: false, level: 0 });
    setStatus('ready', 'Interviewer audio stopped');
  }, [stopCapture, setInterviewerAudio, setStatus]);

  const value = useMemo<Ctx>(
    () => ({
      active: isCapturing,
      isSupported,
      level: audioLevel,
      error,
      start: startCapture,
      stop,
    }),
    [isCapturing, isSupported, audioLevel, error, startCapture, stop],
  );

  return (
    <InterviewerAudioContext.Provider value={value}>{children}</InterviewerAudioContext.Provider>
  );
}

export function useInterviewerAudio(): Ctx {
  const ctx = useContext(InterviewerAudioContext);
  if (!ctx) {
    // Fall back to a stub so components rendered outside the provider
    // (e.g. legacy DesignLayout / CodingLayout entry points) don't crash.
    return { active: false, isSupported: false, level: 0, error: null, start: async () => {}, stop: () => {} };
  }
  return ctx;
}

/* ── Topbar pill ─────────────────────────────────────────────────────── */

/**
 * The pill is the canonical "is Sona hearing the interviewer?" UI.
 * Four visible states (idle / connecting / live / error), one click
 * always does the right thing for the current state — no need to
 * open the wizard for routine on/off/reconnect.
 *
 *   idle    → click → start() (debounced if multiple clicks)
 *   connecting (waiting on getDisplayMedia picker / system loopback)
 *           → button disabled, spinner, no-op on click
 *   live    → click → stop()
 *   error   → click → retry start()
 *
 * Voice level bars animate during live state so the user has
 * continuous proof that audio is actually flowing — not just a
 * static "ON" indicator that can be lying.
 */
export function InterviewerAudioPill() {
  const { active, isSupported, level, error, start, stop } = useInterviewerAudio();
  const [connecting, setConnecting] = useState(false);

  // Reset connecting once active flips on (or an error fires).
  useEffect(() => {
    if (active || error) setConnecting(false);
  }, [active, error]);

  const onClick = useCallback(async () => {
    if (connecting) return;
    if (active) {
      stop();
      return;
    }
    setConnecting(true);
    try {
      await start();
    } catch {
      // start() resolves; errors land in `error` state.
    } finally {
      // Safety: if start() returned but capture didn't begin (e.g.
      // user cancelled the picker), unstick the connecting flag.
      setTimeout(() => setConnecting(false), 1500);
    }
  }, [active, connecting, start, stop]);

  // Decide visual state and copy
  type State = 'unsupported' | 'idle' | 'connecting' | 'live' | 'error';
  const state: State = !isSupported ? 'unsupported'
    : connecting ? 'connecting'
    : active ? 'live'
    : error ? 'error'
    : 'idle';

  const palette = {
    unsupported: { bg: 'rgba(220,38,38,0.85)', fg: '#fff', border: 'rgba(220,38,38,0.85)', dot: '#fff' },
    idle:        { bg: 'rgba(220,38,38,0.12)', fg: '#dc2626', border: 'rgba(220,38,38,0.45)', dot: '#dc2626' },
    connecting:  { bg: 'rgba(245,158,11,0.14)', fg: '#b45309', border: 'rgba(245,158,11,0.55)', dot: '#f59e0b' },
    live:        { bg: 'var(--accent-subtle)', fg: 'var(--accent)', border: 'var(--accent)', dot: 'var(--accent)' },
    error:       { bg: 'rgba(220,38,38,0.16)', fg: '#dc2626', border: 'rgba(220,38,38,0.65)', dot: '#dc2626' },
  }[state];

  const label = {
    unsupported: 'Browser unsupported',
    idle: 'Connect interviewer',
    connecting: 'Connecting…',
    live: 'Interviewer ON',
    error: 'Reconnect',
  }[state];

  const tooltip = {
    unsupported: 'This browser cannot capture interviewer audio. Use Chrome, Edge, or the Camora desktop app.',
    idle: 'Click to start interviewer audio capture. Picker opens for tab share / system loopback per your setup.',
    connecting: 'Waiting for the share picker or system loopback to come online…',
    live: `Live — Sona is hearing the interviewer. Click to stop. ${level > 0.012 ? 'Voice detected.' : 'Connected, awaiting voice.'}`,
    error: error ? `Last attempt failed: ${error}. Click to retry.` : 'Last attempt failed. Click to retry.',
  }[state];

  // The unsupported state has no click action — just a warning chip.
  if (state === 'unsupported') {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg shrink-0"
        style={{ color: palette.fg, background: palette.bg }}
        title={tooltip}
      >
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: palette.dot }} />
        {label}
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={state === 'connecting'}
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 disabled:cursor-wait"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
      title={tooltip}
      aria-pressed={state === 'live'}
      aria-label={label}
    >
      {state === 'connecting' ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : state === 'live' ? (
        // Solid green dot with subtle glow when voice is detected, faded when waiting.
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full transition-all"
          style={{
            background: palette.dot,
            boxShadow: level > 0.012 ? `0 0 6px ${palette.dot}` : 'none',
            opacity: level > 0.012 ? 1 : 0.6,
          }}
        />
      ) : (
        // idle and error share the broadcast icon — different palette only
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728" />
        </svg>
      )}
      <span className="hidden xl:inline">{label}</span>
      {state === 'live' && (
        <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => {
            const lit = level > i * 0.02;
            return (
              <span
                key={i}
                className="block w-0.5 rounded-full transition-all duration-75"
                style={{
                  height: lit ? 4 + i * 2 : 3,
                  background: palette.dot,
                  opacity: lit ? 1 : 0.3,
                }}
              />
            );
          })}
        </span>
      )}
    </button>
  );
}

