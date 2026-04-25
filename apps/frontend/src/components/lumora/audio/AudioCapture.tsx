import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useInterviewStore } from '@/stores/interview-store';
import { transcriptionAPI, speakerAPI } from '@/lib/api-client';
import { MicrophoneSelector } from './MicrophoneSelector';
import { useAuth } from '@/contexts/AuthContext';

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
    // After receiving a chunk, wait 2 seconds of no new chunks → question is complete
    if (questionCheckTimerRef.current) clearTimeout(questionCheckTimerRef.current);
    questionCheckTimerRef.current = window.setTimeout(() => {
      if (accumulatedTextRef.current.trim().length > 5) {
        flushAccumulatedText();
        setShouldRestart(true);
      }
    }, 2000);
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
    silenceDuration: 1500,
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

  // Auto-restart recording after transcription
  useEffect(() => {
    if (shouldRestart && startRecordingRef.current) {
      setShouldRestart(false);
      if (!continuousMode) return; // Only auto-restart in live mode
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
      setStatus('ready', 'Paused - press Cmd+M to resume');
    } else {
      startRecording();
      setIsRecording(true);
      startListenTimer();
      setStatus('listen', 'Listening...');
    }
  }, [storeIsRecording, startRecording, stopRecording, setIsRecording, startListenTimer, stopListenTimer, setStatus]);

  // Keyboard shortcuts - only in manual mode
  useEffect(() => {
    if (continuousMode) return; // Skip shortcuts in continuous mode

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
      {/* Mic button — single click toggles one-shot recording */}
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={handleToggle}
          disabled={continuousMode}
          className="relative flex items-center justify-center rounded-full transition-all select-none w-10 h-10 sm:w-8 sm:h-8"
          style={{
            background: isLive || isRec ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
            border: `1px solid ${isLive || isRec ? 'var(--accent)' : 'var(--border)'}`,
            color: isLive || isRec ? 'var(--accent)' : 'var(--text-muted)',
            boxShadow: isLive ? '0 0 0 3px rgba(59,54,220,0.18)' : 'none',
            opacity: continuousMode ? 0.5 : 1,
            cursor: continuousMode ? 'not-allowed' : 'pointer',
          }}
          aria-pressed={isRec}
          title={
            isLive
              ? 'Auto is on — mic is controlled by Sona. Click AUTO to turn off.'
              : isRec
                ? 'Recording — click to stop'
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
              background: audioLevel > i * 0.02 ? 'var(--accent)' : 'rgba(148,163,184,0.25)',
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

export function SystemAudioButton({ onTranscription, disabled }: { onTranscription?: (text: string) => void; disabled?: boolean }) {
  const [capturing, setCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const { token } = useAuth();
  const { voiceEnrolled, voiceFilterEnabled, setStatus } = useInterviewStore();

  const toggleSystemAudio = useCallback(async () => {
    if (capturing) {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCapturing(false);
      setStatusMsg('');
      return;
    }

    try {
      setStatusMsg('Select a browser tab and check "Share tab audio"');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        // @ts-ignore — Chrome: auto-check "Share system audio"
        systemAudio: 'include',
        // @ts-ignore — Chrome: exclude self tab from picker
        selfBrowserSurface: 'exclude',
      });

      // Check if audio track exists
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        setStatusMsg('No audio — select a tab (not window) and check "Share tab audio"');
        setStatus('error', 'No audio detected. Share a browser tab with audio enabled.');
        setTimeout(() => setStatusMsg(''), 5000);
        return;
      }

      // Stop video track — we only need audio
      stream.getVideoTracks().forEach(t => t.stop());

      // Create audio-only stream
      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;
      setCapturing(true);
      setStatusMsg('');
      setStatus('listening', 'Capturing interviewer audio...');

      // Record in 5-second chunks and transcribe
      const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && token) {
          try {
            const blob = new Blob([e.data], { type: 'audio/webm' });
            const shouldFilter = voiceEnrolled && voiceFilterEnabled;
            const result = await transcriptionAPI.transcribe(token, blob, 'system-audio.webm', shouldFilter);
            if (result.text?.trim() && !result.skipped) {
              onTranscription?.(result.text.trim());
            }
          } catch { /* transcription failed, skip chunk */ }
        }
      };

      recorder.start(5000); // 5-second chunks

      // Auto-stop when stream ends (user stops sharing)
      audioTracks[0].onended = () => {
        setCapturing(false);
        setStatusMsg('');
        streamRef.current = null;
        setStatus('ready', 'Interviewer audio stopped');
      };
    } catch (err: any) {
      setStatusMsg('');
      if (err.name !== 'NotAllowedError') {
        console.error('System audio capture failed:', err);
        setStatus('error', 'System audio capture failed');
      }
    }
  }, [capturing, token, onTranscription, voiceEnrolled, voiceFilterEnabled, setStatus]);

  return (
    <div className="relative">
      <button
        onClick={toggleSystemAudio}
        disabled={disabled}
        className="hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 disabled:opacity-50"
        style={capturing
          ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)' }
          : { color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        title={capturing ? 'Stop capturing interviewer audio' : 'Capture interviewer audio — share a browser tab with Zoom/Meet'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728" />
        </svg>
        <span className="hidden xl:inline">{capturing ? 'Listening' : 'Interviewer'}</span>
      </button>
      {statusMsg && (
        <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-900 text-amber-300 text-[10px] rounded shadow-lg whitespace-nowrap z-50 border border-gray-700">
          {statusMsg}
        </div>
      )}
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
