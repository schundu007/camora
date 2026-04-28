import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTabAudioCapture } from './hooks/useTabAudioCapture';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';
import { useInterviewStore } from '@/stores/interview-store';

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

  const {
    isCapturing,
    isSupported,
    error,
    audioLevel,
    startCapture,
    stopCapture,
  } = useTabAudioCapture({
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

/* ── Setup gate (modal) ──────────────────────────────────────────────── */

function detectBrowser(): { supported: boolean; name: string } {
  if (typeof navigator === 'undefined') return { supported: false, name: 'unknown' };
  const ua = navigator.userAgent;
  // Electron — desktop app routes getDisplayMedia through native loopback.
  if (/Electron/i.test(ua)) return { supported: true, name: 'Camora desktop' };
  // Edge before Chrome since Edge UA contains Chrome.
  if (/Edg\//i.test(ua)) return { supported: true, name: 'Edge' };
  if (/OPR\//i.test(ua)) return { supported: true, name: 'Opera' };
  if (/Chrome\//i.test(ua) && !/Chromium-derived browser without DisplayMedia/.test(ua)) {
    return { supported: true, name: 'Chrome' };
  }
  if (/Firefox\//i.test(ua)) return { supported: false, name: 'Firefox' };
  if (/Safari\//i.test(ua)) return { supported: false, name: 'Safari' };
  return { supported: false, name: 'this browser' };
}

const SESSION_KEY = 'lumora_interviewer_setup_dismissed';

export function InterviewerSetupGate() {
  const { active, isSupported, level, error, start } = useInterviewerAudio();
  const everConnected = useInterviewStore((s) => s.interviewerAudio.everConnected);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [starting, setStarting] = useState(false);
  const browser = useMemo(detectBrowser, []);

  // Open if interviewer audio has never been connected this session and user
  // hasn't explicitly dismissed.
  const shouldOpen = !everConnected && !dismissed;

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {}
    setDismissed(true);
  }, []);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await start();
    } finally {
      setStarting(false);
    }
  }, [start]);

  // Auto-close once we've been live for ~1.5s (lets the user see the level
  // meter spike before the modal disappears).
  const liveSinceRef = useRef<number | null>(null);
  useEffect(() => {
    if (active && !liveSinceRef.current) {
      liveSinceRef.current = Date.now();
    }
    if (!active) {
      liveSinceRef.current = null;
      return;
    }
    const t = setTimeout(() => {
      if (liveSinceRef.current && Date.now() - liveSinceRef.current >= 1500) {
        dismiss();
      }
    }, 1600);
    return () => clearTimeout(t);
  }, [active, dismiss]);

  if (!shouldOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect interviewer audio"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}
      >
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Connect interviewer audio
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Camora can't hear the interviewer through your microphone alone — interviewer voice has to come from the call's audio stream.
              </p>
            </div>
          </div>
        </div>

        {!browser.supported ? (
          <div className="px-6 py-5">
            <div
              className="rounded-lg p-4 mb-4 text-sm"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}
            >
              <strong>{browser.name}</strong> can't share tab audio. Use Chrome, Edge, or download the Camora desktop app — it
              captures system audio natively without any extra setup.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={dismiss}
                className="px-3 py-1.5 text-xs font-bold rounded-lg"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Continue without audio
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-4">
              <ol className="space-y-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>1.</span>
                  <span>Click <strong>Share interviewer audio</strong> below.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>2.</span>
                  <span>
                    In the picker, choose the <strong>Chrome tab</strong> running your interview (Zoom Web, Google Meet, Teams).
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      The native Zoom desktop client can't share its audio — open Zoom in a browser tab, or install our desktop
                      app.
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>3.</span>
                  <span>
                    Check the <strong>"Share tab audio"</strong> box at the bottom of the picker. Without it, we get video only.
                  </span>
                </li>
              </ol>

              {/* Live level meter — proof the interviewer's voice is reaching us */}
              <div className="mt-5 rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Interviewer level
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: active ? 'var(--accent)' : 'var(--text-dimmed)' }}>
                    {active ? (level > 0.012 ? 'voice detected' : 'connected, waiting…') : 'not connected'}
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-6">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const t = i / 24;
                    const lit = active && level > t * 0.5;
                    return (
                      <span
                        key={i}
                        className="flex-1 rounded-sm transition-all duration-75"
                        style={{
                          height: `${20 + t * 80}%`,
                          background: lit ? 'var(--accent)' : 'var(--border)',
                          opacity: lit ? 1 : 0.55,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {error && (
                <div
                  className="mt-3 rounded-lg p-3 text-xs"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}
                >
                  {error}
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={dismiss}
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
                title="Continue without interviewer audio — Sona will only hear what your microphone picks up."
              >
                Skip for this session
              </button>
              <div className="flex items-center gap-2">
                {active ? (
                  <button
                    onClick={dismiss}
                    className="px-4 py-2 text-xs font-bold rounded-lg"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Looks good — start interview
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-60"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {starting ? 'Waiting for picker…' : 'Share interviewer audio'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
