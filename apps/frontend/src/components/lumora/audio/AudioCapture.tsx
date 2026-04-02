import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useInterviewStore } from '@/stores/interview-store';
import { transcriptionAPI } from '@/lib/api-client';
import { MicrophoneSelector } from './MicrophoneSelector';
import { CalibrationButton } from './CalibrationButton';
import { VoiceEnrollment } from './VoiceEnrollment';
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
  const [continuousMode, setContinuousMode] = useState(false); // Default to manual
  const startRecordingRef = useRef<(() => void) | null>(null);
  const continuousModeRef = useRef(continuousMode);

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
    voiceEnrolled,
    voiceFilterEnabled,
  } = useInterviewStore();

  // Get selected audio device
  const { selectedDeviceId } = useAudioDevices();

  const handleAudioData = useCallback(async (blob: Blob) => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    // Use voice filtering if enrolled and enabled
    const shouldFilterVoice = voiceEnrolled && voiceFilterEnabled;

    setStatus('transcribe', shouldFilterVoice ? 'Checking speaker...' : 'Transcribing...');

    try {
      const result = await transcriptionAPI.transcribe(
        token,
        blob,
        'audio.webm',
        shouldFilterVoice
      );

      // Check if transcription was skipped (user voice detected)
      if (result.skipped) {
        setStatus('listen', 'Your voice detected - waiting for interviewer...');
        setShouldRestart(true);
        return;
      }

      if (result.text) {
        onTranscription?.(result.text);
        setStatus('ready', 'Transcription complete');
        // Auto-restart listening after successful transcription
        setShouldRestart(true);
      } else {
        setStatus('ready', "Didn't catch that - try again");
        // Auto-restart even if no text detected
        setShouldRestart(true);
      }
    } catch (error: any) {
      // Provide user-friendly messages based on error type
      const status = error?.status;
      let userMessage: string;
      let statusMessage: string;

      if (status === 500 || status === 506) {
        // Backend transcription service error
        userMessage = 'Transcription service temporarily unavailable. Recording will auto-retry.';
        statusMessage = 'Service unavailable - retrying';
      } else if (status === 404) {
        userMessage = 'Transcription endpoint not found. Check that the AI service is running.';
        statusMessage = 'Service not found';
      } else if (status === 401 || status === 403) {
        userMessage = 'Authentication expired. Please refresh the page.';
        statusMessage = 'Auth error';
      } else if (error?.name === 'TypeError' || error?.message?.includes('fetch')) {
        // Network error - backend is completely unreachable
        userMessage = 'Cannot reach transcription service. Check your connection.';
        statusMessage = 'Network error';
      } else {
        userMessage = error.message || 'Transcription failed. Will retry on next recording.';
        statusMessage = 'Transcription error';
      }

      // For transient service errors (500/506), use status bar only - don't show
      // a persistent error banner that clutters the UI during auto-retry
      if (status === 500 || status === 506) {
        setStatus('warn', statusMessage);
      } else {
        setError(userMessage);
        setStatus('error', statusMessage);
      }
      // Auto-restart in live mode even after errors
      setShouldRestart(true);
    }
  }, [token, setStatus, setError, onTranscription, voiceEnrolled, voiceFilterEnabled]);

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
      }, 500);
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
    silenceThreshold: threshold,
    silenceDuration: 2000, // 2s of silence before stopping
    minSpeechDuration: 500,
    maxRecordingDuration: 90000, // 90s max for lengthy questions
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
      }, 500);
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
      }, 500);
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
    }
  }, [continuousMode, storeIsRecording, startRecording, setIsRecording, startListenTimer, setStatus]);

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
      <div className="text-xs text-rose-light">
        Audio recording not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Audio Level Indicator - audioLevel is 0-1 normalized */}
      <div className="flex items-center gap-0.5 px-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-0.5 transition-all duration-75 ${
              audioLevel > i * 0.15
                ? 'bg-primary'
                : 'bg-gray-600'
            }`}
            style={{ height: `${6 + i * 2}px` }}
          />
        ))}
      </div>

      <MicrophoneSelector disabled={storeIsRecording} />

      {/* Live / Manual Mode Tabs */}
      <div className="flex items-center h-full border border-gray-600 rounded overflow-hidden">
        <button
          onClick={() => { if (!continuousMode) handleModeToggle(); }}
          className={`px-2.5 py-1 text-sm font-mono font-semibold transition-colors ${
            continuousMode
              ? 'bg-red-500 text-white'
              : 'bg-transparent text-white/80 hover:text-white'
          }`}
          title="Live mode - always listening, auto-restarts after each question"
        >
          <span className="flex items-center gap-1">
            <LiveIcon isActive={continuousMode} />
            Live
          </span>
        </button>
        <button
          onClick={() => { if (continuousMode) handleModeToggle(); }}
          className={`px-2.5 py-1 text-sm font-mono font-semibold transition-colors border-l border-gray-600 ${
            !continuousMode
              ? 'bg-emerald-500 text-white'
              : 'bg-transparent text-white/80 hover:text-white'
          }`}
          title="Manual mode - press Cmd+M to start/stop recording"
        >
          Manual
        </button>
      </div>

      {/* Only show Pause/Resume in manual mode */}
      {!continuousMode && (
        <button
          onClick={handleToggle}
          className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${storeIsRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
          title={storeIsRecording ? 'Pause (⌘M)' : 'Resume (⌘M)'}
        >
          <span className="flex items-center gap-1">
            <MicIcon isActive={storeIsRecording} />
            <span className="hidden sm:inline">{storeIsRecording ? 'Pause' : 'Resume'}</span>
          </span>
        </button>
      )}

      {/* Voice Enrollment & Filter - handles both enrollment and toggle */}
      <VoiceEnrollment disabled={storeIsRecording} />

      <div className="hidden xl:block">
        <CalibrationButton deviceId={selectedDeviceId} disabled={storeIsRecording} />
      </div>

      {/* System Audio Capture - captures interviewer voice from Zoom/Meet */}
      <SystemAudioButton onTranscription={onTranscription} disabled={storeIsRecording} />
    </div>
  );
}

function SystemAudioButton({ onTranscription, disabled }: { onTranscription?: (text: string) => void; disabled?: boolean }) {
  const [capturing, setCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const { token } = useAuth();

  const toggleSystemAudio = useCallback(async () => {
    if (capturing) {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCapturing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Check if audio track exists
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        alert('No audio detected. Make sure to check "Share audio" when sharing your screen.');
        return;
      }

      // Stop video track — we only need audio
      stream.getVideoTracks().forEach(t => t.stop());

      // Create audio-only stream
      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;
      setCapturing(true);

      // Record in 5-second chunks and transcribe
      const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && token) {
          try {
            const blob = new Blob([e.data], { type: 'audio/webm' });
            const result = await transcriptionAPI.transcribe(token, blob, 'system-audio.webm');
            if (result.text?.trim()) {
              onTranscription?.(result.text.trim());
            }
          } catch { /* transcription failed, skip chunk */ }
        }
      };

      recorder.start(5000); // 5-second chunks

      // Auto-stop when stream ends (user stops sharing)
      audioTracks[0].onended = () => {
        setCapturing(false);
        streamRef.current = null;
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('System audio capture failed:', err);
      }
    }
  }, [capturing, token, onTranscription]);

  return (
    <button
      onClick={toggleSystemAudio}
      disabled={disabled}
      className={`hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-bold rounded border transition-colors ${
        capturing
          ? 'bg-red-500 text-white border-red-600 animate-pulse'
          : 'text-white/80 hover:text-white border-gray-600 hover:bg-gray-800'
      } disabled:opacity-50`}
      title={capturing ? 'Stop capturing interviewer audio' : 'Capture interviewer audio from Zoom/Meet (screen share)'}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728" />
      </svg>
      <span className="hidden lg:inline">{capturing ? 'Listening' : 'Interviewer'}</span>
    </button>
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
