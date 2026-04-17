import { useCallback, useEffect, useRef, useState } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { speakerAPI } from '@/lib/api-client';
import { useAudioDevices } from './hooks/useAudioDevices';

interface VoiceEnrollmentProps {
  disabled?: boolean;
}

export function VoiceEnrollment({ disabled }: VoiceEnrollmentProps) {
  const { token } = useAuth();
  const { selectedDeviceId } = useAudioDevices();
  const {
    voiceEnrolled,
    voiceFilterEnabled,
    isEnrolling,
    setVoiceEnrolled,
    setVoiceFilterEnabled,
    setIsEnrolling,
    setStatus,
  } = useInterviewStore();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);

  const RECORDING_DURATION = 5000; // 5 seconds

  // Check enrollment status on mount - gracefully handles ai-services being unavailable
  useEffect(() => {
    if (token) {
      speakerAPI.getStatus(token).then((result) => {
        setVoiceEnrolled(result.enrolled);
      }).catch(() => {
        // Speaker service unavailable (404/502/etc) - silently assume not enrolled.
        // This is expected when ai-services is not running.
        setVoiceEnrolled(false);
      });
    }
  }, [token, setVoiceEnrolled]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingProgress(0);
  }, []);

  const handleEnroll = useCallback(async () => {
    if (isEnrolling || disabled) return;
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setError(null);
    setIsEnrolling(true);
    setIsRecording(true);
    setStatus('idle', 'Recording your voice - speak for 5 seconds...');

    try {
      // Use the selected microphone device
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);

        if (chunksRef.current.length === 0) {
          setError('No audio recorded - check your microphone settings');
          setIsEnrolling(false);
          setStatus('error', 'No audio captured');
          return;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        if (blob.size < 1000) {
          setError('Recording too short - please try again');
          setIsEnrolling(false);
          setStatus('error', 'Recording too short');
          chunksRef.current = [];
          return;
        }

        setStatus('transcribe', 'Processing voice sample...');

        try {
          const result = await speakerAPI.enroll(token, blob, 'enrollment.webm');
          if (result.success) {
            setVoiceEnrolled(true);
            setVoiceFilterEnabled(true);
            setStatus('ready', 'Voice enrolled - interviewer mode active');
            setError(null);
          } else {
            setError('Enrollment failed - speak clearly and try again');
            setStatus('error', 'Enrollment failed');
          }
        } catch (err: any) {
          const status = err?.status;
          let userMsg: string;
          if (status === 404 || status === 500 || status === 502 || status === 503) {
            userMsg = 'Voice service unavailable. Try again later.';
          } else if (err?.name === 'AbortError' || status === 408) {
            userMsg = 'Voice enrollment timed out. Try again.';
          } else {
            userMsg = err.message || 'Enrollment failed';
          }
          console.error('Voice enrollment error:', err.message || err, 'status:', status);
          setError(userMsg);
          setStatus('error', userMsg);
        }

        setIsEnrolling(false);
        chunksRef.current = [];
      };

      // Start with timeslice to collect data periodically
      mediaRecorder.start(500);

      // Progress indicator
      const startTime = Date.now();
      progressRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingProgress(Math.min(100, (elapsed / RECORDING_DURATION) * 100));
      }, 100);

      // Stop after duration
      timerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
      }, RECORDING_DURATION);

    } catch (err: any) {
      setError(err.message || 'Failed to access microphone');
      setIsEnrolling(false);
      setIsRecording(false);
      setStatus('error', 'Microphone access failed');
    }
  }, [token, isEnrolling, disabled, selectedDeviceId, setIsEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setStatus]);

  const handleUnenroll = useCallback(async () => {
    if (!token || isEnrolling) return;

    try {
      await speakerAPI.unenroll(token);
      setVoiceEnrolled(false);
      setVoiceFilterEnabled(false);
      setStatus('ready', 'Voice enrollment removed');
    } catch (err: any) {
      setError(err.message || 'Failed to unenroll');
    }
  }, [token, isEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setStatus]);

  const handleToggleFilter = useCallback(() => {
    setVoiceFilterEnabled(!voiceFilterEnabled);
    setStatus('ready', voiceFilterEnabled ? 'Voice filter disabled' : 'Voice filter enabled');
  }, [voiceFilterEnabled, setVoiceFilterEnabled, setStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (!voiceEnrolled) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleEnroll}
          disabled={isEnrolling || disabled}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0"
          style={{ color: isRecording ? '#fff' : 'rgba(255,255,255,0.6)', background: isRecording ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}
          title="Enroll your voice so the app can filter it out during interviews"
        >
          {isRecording ? (
            <>
              <RecordingIcon />
              <span className="hidden xl:inline">{Math.round(recordingProgress)}%</span>
            </>
          ) : isEnrolling ? (
            <>
              <Spinner />
              <span className="hidden xl:inline">Processing...</span>
            </>
          ) : (
            <>
              <VoiceIcon />
              <span className="hidden xl:inline">My Voice</span>
            </>
          )}
        </button>
        {error && <span className="text-xs text-rose-light max-w-[200px] truncate" title={error}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={handleToggleFilter}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0"
        style={{ color: voiceFilterEnabled ? '#a5b4fc' : 'rgba(255,255,255,0.6)', background: voiceFilterEnabled ? 'rgba(99,102,241,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}
        title={voiceFilterEnabled ? 'Voice filter active - only interviewer is transcribed' : 'Voice filter disabled'}
      >
        <VoiceIcon filled={voiceFilterEnabled} />
        <span className="hidden xl:inline">{voiceFilterEnabled ? 'Filter On' : 'Filter Off'}</span>
      </button>
      <button
        onClick={handleUnenroll}
        disabled={isEnrolling || disabled}
        className="px-1.5 py-1 text-xs font-bold text-white/80 hover:text-rose-400 border border-gray-500 rounded transition-colors"
        title="Remove voice enrollment"
      >
        <XIcon />
      </button>
    </div>
  );
}

function VoiceIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      {filled && <circle cx="12" cy="12" r="2" />}
    </svg>
  );
}

function RecordingIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-pulse text-rose-light" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
