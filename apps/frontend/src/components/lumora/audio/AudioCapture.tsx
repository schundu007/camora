import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useInterviewStore } from '@/stores/interview-store';
import { transcriptionAPI, speakerAPI } from '@/lib/api-client';
import { MicrophoneSelector } from './MicrophoneSelector';
import { useAuth } from '@/contexts/AuthContext';
import { isQuestion } from '@/lib/questionDetector';
import { InterviewerAudioPill } from './InterviewerAudio';

// Backward-compatible alias for the old SystemAudioButton — the
// implementation now lives in InterviewerAudio.tsx as InterviewerAudioPill,
// which consumes the shared InterviewerAudioProvider.
export const SystemAudioButton = (_props: { onTranscription?: (text: string) => void; disabled?: boolean }) => {
  return <InterviewerAudioPill />;
};

// Keyboard shortcuts — use Cmd/Ctrl+M to avoid conflict with typing
const SHORTCUTS = {
  STOP_MIC: ['Escape'] as string[],
};

interface AudioCaptureProps {
  onTranscription?: (text: string) => void;
  autoStart?: boolean;
}

export function AudioCapture({ onTranscription, autoStart = true }: AudioCaptureProps) {
  // Use centralized auth
  const { token } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [shouldRestart, setShouldRestart] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  // Persist so the user sets Auto ON/OFF once before the interview and
  // never has to click (audible!) during the call. Stored under a
  // dedicated key; read synchronously at mount so there is no flicker.
  const [continuousMode, setContinuousMode] = useState<boolean>(() => {
    try { return localStorage.getItem('lumora_sona_auto') === 'on'; } catch { return false; }
  });
  const startRecordingRef = useRef<(() => void) | null>(null);
  const continuousModeRef = useRef(continuousMode);
  useEffect(() => {
    try { localStorage.setItem('lumora_sona_auto', continuousMode ? 'on' : 'off'); } catch {}
  }, [continuousMode]);

  // Get store values first (must be before any useEffect that uses them)
  const {
    threshold,
    setStatus,
    setAudioLevel,
    isRecording: storeIsRecording,
    setIsRecording,
    setError,
    startListenTimer,
    stopListenTimer,
    voiceMode,
    voiceEnrolled,
    voiceFilterEnabled,
    autoEnrollPending,
    setAutoEnrollPending,
    setVoiceEnrolled,
    setVoiceFilterEnabled,
    setIsEnrolling,
  } = useInterviewStore();

  // Get selected audio device
  const { selectedDeviceId } = useAudioDevices();

  // Accumulated transcription text for Live mode (chunks build up a full question)
  const accumulatedTextRef = useRef('');
  const lastChunkTimeRef = useRef(0);
  const questionCheckTimerRef = useRef<number | null>(null);

  const flushAccumulatedText = useCallback(() => {
    const text = accumulatedTextRef.current.trim();
    if (text.length > 5) {
      console.log('[Live] Flushing accumulated question:', text.slice(0, 100));
      onTranscription?.(text);
      setStatus('ready', 'Question sent');
    }
    accumulatedTextRef.current = '';
    if (questionCheckTimerRef.current) {
      clearTimeout(questionCheckTimerRef.current);
      questionCheckTimerRef.current = null;
    }
  }, [onTranscription, setStatus]);

  const scheduleQuestionCheck = useCallback(() => {
    // After receiving a chunk, wait for "no new chunks" before flushing
    // the accumulated transcript. Punctuation-aware so a single question
    // doesn't get split into two when the speaker pauses mid-sentence:
    //
    //   ends with `?` or `!`  →  900 ms   (done — punctuation is decisive)
    //   ends with `.`         →  1500 ms  (likely done, but speakers often
    //                                       continue with another sentence
    //                                       after a brief breath)
    //   no terminal punct.    →  2800 ms  (mid-sentence pause — wait long
    //                                       enough that any natural breath
    //                                       won't trigger a premature flush)
    //
    // The previous heuristic dropped to 600 ms whenever isQuestion() tripped
    // on the partial text, so "tell me about a time <breath> you triaged a
    // CI failure" would get split — the partial "tell me about a time"
    // alone trips the interview-verb gate.
    if (questionCheckTimerRef.current) clearTimeout(questionCheckTimerRef.current);
    const accumulated = accumulatedTextRef.current.trim();
    const lastChar = accumulated.slice(-1);
    const wait =
      lastChar === '?' || lastChar === '!' ? 900 :
      lastChar === '.' ? 1500 :
      2800;
    questionCheckTimerRef.current = window.setTimeout(() => {
      if (accumulatedTextRef.current.trim().length > 5) {
        flushAccumulatedText();
        setShouldRestart(true);
      }
    }, wait);
  }, [flushAccumulatedText]);

  // Auto-enroll user's voice from first audio chunk in record-interviewer mode
  const autoEnrollRef = useRef(false);
  const handleAutoEnroll = useCallback(async (blob: Blob) => {
    if (autoEnrollRef.current) return; // prevent double-fire
    autoEnrollRef.current = true;
    setIsEnrolling(true);
    setStatus('transcribe', 'Learning your voice...');
    try {
      const result = await speakerAPI.enroll(token!, blob, 'auto-enroll.webm');
      if (result.success) {
        setVoiceEnrolled(true);
        setVoiceFilterEnabled(true);
        setAutoEnrollPending(false);
        setStatus('listen', 'Voice learned — now filtering your voice');
      } else {
        setStatus('warn', 'Voice enrollment failed — transcribing everything');
        setAutoEnrollPending(false);
      }
    } catch (err: any) {
      console.error('[AutoEnroll] Failed:', err.message);
      setStatus('warn', 'Voice service unavailable — transcribing everything');
      setAutoEnrollPending(false);
    } finally {
      setIsEnrolling(false);
    }
  }, [token, setIsEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setAutoEnrollPending, setStatus]);

  const handleAudioData = useCallback(async (blob: Blob) => {
    if (!token) { setError('Not authenticated'); return; }

    // Record Interviewer: auto-enroll user's voice from first chunk
    if (autoEnrollPending && !voiceEnrolled && voiceMode === 'record-interviewer') {
      handleAutoEnroll(blob);
      // Also transcribe this first chunk (no filtering yet)
    }

    const shouldFilterVoice = voiceEnrolled && voiceFilterEnabled;
    const isLiveMode = continuousModeRef.current;

    if (isLiveMode) {
      // LIVE MODE: accumulate chunks, detect question completion
      setStatus('transcribe', shouldFilterVoice ? 'Analyzing speakers...' : 'Transcribing...');
      try {
        const result = await transcriptionAPI.transcribe(token, blob, 'audio.webm', shouldFilterVoice);
        if (result.skipped) {
          if (result.reason === 'hallucination_filtered') {
            // Whisper hallucination — silently restart
            setStatus('listen', 'Listening...');
          } else {
            const ratio = result.interviewer_ratio;
            const msg = ratio !== undefined
              ? `Your voice (${Math.round((1 - ratio) * 100)}%) - filtering...`
              : 'Your voice detected - filtering...';
            setStatus('listen', msg);
          }
          setShouldRestart(true);
          return;
        }
        if (result.text) {
          accumulatedTextRef.current += ' ' + result.text;
          lastChunkTimeRef.current = Date.now();
          setStatus('listen', `Heard: "${accumulatedTextRef.current.trim().slice(-60)}..."`);
          scheduleQuestionCheck();
        }
        setShouldRestart(true);
      } catch (err: any) {
        console.error('[Live] Transcription error:', err.message);
        setStatus('warn', 'Transcription error - retrying');
        setShouldRestart(true);
      }
    } else {
      // MANUAL MODE: send entire recording as one question
      setStatus('transcribe', shouldFilterVoice ? 'Analyzing speakers...' : 'Transcribing...');
      try {
        const result = await transcriptionAPI.transcribe(token, blob, 'audio.webm', shouldFilterVoice);
        if (result.skipped) {
          if (result.reason === 'hallucination_filtered') {
            setStatus('ready', 'No speech detected - try again');
          } else {
            const ratio = result.interviewer_ratio;
            const msg = ratio !== undefined
              ? `Your voice (${Math.round((1 - ratio) * 100)}%) - filtering...`
              : 'Your voice detected - filtering...';
            setStatus('listen', msg);
            setShouldRestart(true);
            return;
          }
        }
        if (result.text) {
          onTranscription?.(result.text);
          setStatus('ready', 'Transcription complete');
        } else {
          setStatus('ready', "Didn't catch that - try again");
        }
      } catch (error: any) {
        const status = error?.status;
        if (status === 500 || status === 506) {
          setStatus('warn', 'Service unavailable - retrying');
        } else {
          setError(error.message || 'Transcription failed');
          setStatus('error', 'Transcription error');
        }
      }
    }
  }, [token, setStatus, setError, onTranscription, voiceEnrolled, voiceFilterEnabled, voiceMode, autoEnrollPending, handleAutoEnroll, scheduleQuestionCheck]);

  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
  }, [setAudioLevel]);

  const handleRecordingStop = useCallback(() => {
    // Sync store state when VAD stops recording
    setIsRecording(false);
    stopListenTimer();
    setStatus('transcribe', 'Processing...');

    // In live mode, immediately restart recording for the next question
    // Use ref to always get latest continuousMode value
    if (continuousModeRef.current) {
      setTimeout(() => {
        startRecordingRef.current?.();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      }, 200);
    }
  }, [setIsRecording, stopListenTimer, startListenTimer, setStatus]);

  const {
    isSupported,
    error,
    audioLevel,
    startRecording,
    stopRecording,
  } = useAudioCapture({
    onAudioData: handleAudioData,
    onAudioLevel: handleAudioLevel,
    onRecordingStop: handleRecordingStop,
    silenceThreshold: Math.max(threshold, 0.003),
    // Live mode shaves the end-of-utterance debounce so Sona can fire
    // faster on each turn — 1500ms felt sluggish in real interviews.
    // Manual (push-to-talk) keeps the longer window because the user is
    // composing a thought and natural pauses are common there.
    silenceDuration: continuousMode ? 800 : 1500,
    minSpeechDuration: 300,
    maxRecordingDuration: continuousMode ? 5000 : 30000, // Live: 5s chunks, Manual: 30s max
    deviceId: selectedDeviceId,
  });

  // Store startRecording in ref for auto-restart
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  // Keep continuousMode ref in sync
  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  // Auto-start recording on mount when token is available
  useEffect(() => {
    if (autoStart && token && !hasAutoStarted && startRecordingRef.current && !storeIsRecording && continuousMode) {
      setHasAutoStarted(true);
      // Delay to ensure everything is ready
      const timer = setTimeout(() => {
        startRecordingRef.current?.();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoStart, token, hasAutoStarted, storeIsRecording, continuousMode, setIsRecording, startListenTimer, setStatus]);

  // "User manually paused mid-Auto" flag — when set, the auto-restart
  // effect honors it instead of yanking the mic back on. Cleared the
  // moment the user manually resumes (or turns Auto off entirely).
  const userPausedRef = useRef(false);

  // Auto-restart recording after transcription
  useEffect(() => {
    if (shouldRestart && startRecordingRef.current) {
      setShouldRestart(false);
      if (!continuousMode) return; // Only auto-restart in live mode
      if (userPausedRef.current) return; // user manually paused — stay paused
      // Small delay before restarting to let state settle
      const timer = setTimeout(() => {
        startRecordingRef.current?.();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [shouldRestart, continuousMode, setIsRecording, startListenTimer, setStatus]);

  const handleToggle = useCallback(() => {
    if (storeIsRecording) {
      stopRecording();
      setIsRecording(false);
      stopListenTimer();
      // If Auto is on, this is a "pause Sona" rather than a one-shot stop
      if (continuousMode) {
        userPausedRef.current = true;
        setStatus('ready', 'Sona paused — click mic or ⌘M to resume');
      } else {
        setStatus('ready', 'Paused - press Cmd+M to resume');
      }
    } else {
      userPausedRef.current = false;
      startRecording();
      setIsRecording(true);
      startListenTimer();
      setStatus('listen', continuousMode ? 'Live - listening...' : 'Listening...');
    }
  }, [storeIsRecording, continuousMode, startRecording, stopRecording, setIsRecording, startListenTimer, stopListenTimer, setStatus]);

  // Keyboard shortcuts — Cmd+M (toggle) + Escape (stop) work regardless
  // of Auto state. The user needs silent, instant mute mid-interview;
  // gating these on continuousMode trapped them when Auto was on.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in any editable element
      const el = e.target as HTMLElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable ||
        el.closest('.monaco-editor') ||
        el.getAttribute('role') === 'textbox'
      ) {
        return;
      }

      // Cmd/Ctrl+M: Toggle mic (no conflict with typing)
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        handleToggle();
      }

      // Backtick (`): one-key mic start/stop. Cheap to reach mid-
      // interview without a chord. The editable-element guard above
      // already prevents conflicts when the user is typing in a
      // textarea/Monaco/contentEditable. Match by code (Backquote)
      // so it works on layouts where shift+` produces ~.
      if ((e.key === '`' || e.code === 'Backquote') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggle();
      }

      // Escape: Stop mic
      if (SHORTCUTS.STOP_MIC.includes(e.key) && storeIsRecording) {
        e.preventDefault();
        stopRecording();
        setIsRecording(false);
        stopListenTimer();
        setStatus('ready', 'Paused - press Cmd+M to resume');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [continuousMode, handleToggle, storeIsRecording, stopRecording, setIsRecording, stopListenTimer, setStatus]);

  // Toggle continuous mode - must be defined before early returns
  const handleModeToggle = useCallback(() => {
    const newMode = !continuousMode;
    setContinuousMode(newMode);
    if (newMode && !storeIsRecording) {
      // Start listening when switching to continuous mode
      startRecording();
      setIsRecording(true);
      startListenTimer();
      setStatus('listen', 'Live - listening...');
    } else if (!newMode && storeIsRecording) {
      // Turning Auto off — stop the live stream so the mic light goes off
      stopRecording();
      setIsRecording(false);
      stopListenTimer();
      setStatus('ready', 'Auto off');
    }
  }, [continuousMode, storeIsRecording, startRecording, stopRecording, setIsRecording, startListenTimer, stopListenTimer, setStatus]);

  // Silent Auto toggle: Cmd/Ctrl+Shift+A works from anywhere on the Lumora
  // page, including while Auto is ON. A keystroke is inaudible to the
  // interviewer where a mouse click isn't, so the user can flip Sona on/off
  // mid-call without raising suspicion. Never fires inside editable fields.
  useEffect(() => {
    const handleAutoShortcut = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;
      if (e.key !== 'A' && e.key !== 'a') return;
      const el = e.target as HTMLElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable ||
        el.closest?.('.monaco-editor') ||
        el.getAttribute?.('role') === 'textbox'
      ) return;
      e.preventDefault();
      handleModeToggle();
    };
    window.addEventListener('keydown', handleAutoShortcut);
    return () => window.removeEventListener('keydown', handleAutoShortcut);
  }, [handleModeToggle]);

  // Hydration: set mounted after all hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show nothing during SSR to prevent hydration mismatch
  if (!mounted) {
    return <div className="flex items-center gap-1 h-6" />;
  }

  if (!isSupported) {
    return (
      <div className="text-xs text-[var(--danger)]">
        Audio recording not supported in this browser
      </div>
    );
  }

  return <UnifiedMicButton
    continuousMode={continuousMode}
    storeIsRecording={storeIsRecording}
    audioLevel={audioLevel}
    handleToggle={handleToggle}
    handleModeToggle={handleModeToggle}
  />;
}

/**
 * Single mic control replacing the old Live/Manual mode selector.
 *
 *   Mic button  → one-shot recording toggle (tap to start, tap to stop)
 *   AUTO pill   → continuous-listening toggle (one click to turn on,
 *                 one click to turn off — Sona keeps listening and fires
 *                 only on real interview questions)
 *
 * No long-press, no hold-to-activate — every action is a single click
 * so it works reliably across mice, trackpads, and touch. */
function UnifiedMicButton({
  continuousMode, storeIsRecording, audioLevel,
  handleToggle, handleModeToggle,
}: {
  continuousMode: boolean;
  storeIsRecording: boolean;
  audioLevel: number;
  handleToggle: () => void;
  handleModeToggle: () => void;
}) {
  const isLive = continuousMode;
  const isRec = !continuousMode && storeIsRecording;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Mic button — always clickable. When Auto is ON, click pauses
          Sona's listening (mute) and another click resumes. Manual
          override is critical mid-interview when the user needs to
          stop Sona on a dime — disabling the button traps the user. */}
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={handleToggle}
          className="relative flex items-center justify-center rounded-full transition-all select-none w-10 h-10 sm:w-8 sm:h-8"
          style={{
            background: isLive || isRec ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
            border: `1px solid ${isLive || isRec ? 'var(--accent)' : 'var(--border)'}`,
            color: isLive || isRec ? 'var(--accent)' : 'var(--text-muted)',
            boxShadow: isLive ? '0 0 0 3px rgba(38,97,156,0.18)' : 'none',
            cursor: 'pointer',
          }}
          aria-pressed={isRec || isLive}
          title={
            isLive
              ? 'Sona is listening — click to pause. Auto stays on; click again to resume.'
              : isRec
                ? 'Recording — click to stop'
                : continuousMode
                  ? 'Sona is paused — click to resume listening.'
                  : 'Click to record one answer'
          }
        >
          {isLive ? (
            // Live: filled sound-wave / auto glyph
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="10" width="2" height="4" rx="1" />
              <rect x="6" y="6" width="2" height="12" rx="1" />
              <rect x="10" y="2" width="2" height="20" rx="1" />
              <rect x="14" y="6" width="2" height="12" rx="1" />
              <rect x="18" y="10" width="2" height="4" rx="1" />
            </svg>
          ) : isRec ? (
            // Recording: filled pause bars
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Idle: outlined mic
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}

          {/* Pulsing halo when actively recording */}
          {(isLive || isRec) && (
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: '1px solid var(--accent)',
                animation: 'mic-pulse 1.4s ease-out infinite',
                opacity: 0.6,
              }}
            />
          )}
        </button>
      </div>

      {/* AUTO toggle — one click turns continuous listening on, one click turns it off */}
      <button
        type="button"
        onClick={handleModeToggle}
        className="text-[10px] sm:text-[9px] font-bold uppercase tracking-[0.16em] px-3 py-2 sm:px-2 sm:py-1 rounded transition-colors"
        style={{
          color: isLive ? 'var(--accent)' : 'var(--text-muted)',
          background: isLive ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
          border: `1px solid ${isLive ? 'var(--accent)' : 'var(--border)'}`,
          fontFamily: 'var(--font-mono)',
        }}
        title={isLive
          ? 'Auto is ON — Sona is listening continuously. Click or press ⌘⇧A to stop. (Setting persists across reloads — set it BEFORE the interview so you don\'t click during the call.)'
          : 'Turn on Auto — Sona will listen continuously and answer each question. Click or press ⌘⇧A. Setting persists across reloads so you only click once before the interview.'}
        aria-pressed={isLive}
      >
        {isLive ? '● AUTO' : 'AUTO'}
      </button>

      {/* Audio-level bars */}
      <div className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-0.5 rounded-full transition-all duration-75"
            style={{
              height: `${6 + i * 2}px`,
              background: audioLevel > i * 0.02 ? 'var(--accent)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes mic-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}


function MicIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function LiveIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${isActive ? 'text-red-500' : ''}`}
      fill={isActive ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" className={isActive ? 'animate-pulse' : ''} />
      {isActive && (
        <>
          <circle cx="12" cy="12" r="6" fill="none" strokeOpacity="0.5" />
          <circle cx="12" cy="12" r="9" fill="none" strokeOpacity="0.3" />
        </>
      )}
    </svg>
  );
}
