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

export function InterviewerAudioPill() {
  const { active, isSupported, level, start, stop } = useInterviewerAudio();

  if (!isSupported) {
    return (
      <span
        className="hidden sm:inline text-[11px] font-bold px-2 py-1 rounded-lg"
        style={{ color: '#fff', background: 'rgba(220,38,38,0.85)' }}
        title="This browser cannot capture interviewer audio. Use Chrome, Edge, or the Camora desktop app."
      >
        Browser unsupported
      </span>
    );
  }

  return (
    <button
      onClick={() => (active ? stop() : start())}
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0"
      style={
        active
          ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)' }
          : { background: 'rgba(220,38,38,0.12)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.45)' }
      }
      title={active ? 'Interviewer audio is live — click to stop' : 'Connect interviewer audio: share the Zoom/Meet/Teams tab and check "Share tab audio"'}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728"
        />
      </svg>
      <span className="hidden xl:inline">{active ? 'Interviewer ON' : 'Interviewer OFF'}</span>
      {active && (
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block w-0.5 rounded-full transition-all duration-75"
              style={{
                height: 4 + i * 2,
                background: level > i * 0.02 ? 'var(--accent)' : 'currentColor',
                opacity: level > i * 0.02 ? 1 : 0.3,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
}

