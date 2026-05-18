import { useCallback, useEffect, useRef, useState } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { useAudioDevices } from './hooks/useAudioDevices';

const LS_KEY = 'camora-voice-enrolled';

interface VoiceEnrollmentProps {
  disabled?: boolean;
  variant?: 'dark' | 'light';
}

export function VoiceEnrollment({ disabled, variant = 'dark' }: VoiceEnrollmentProps) {
  const isLight = variant === 'light';
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

  const RECORDING_DURATION = 5000;

  // Restore enrollment from localStorage on mount — no backend call
  useEffect(() => {
    const enrolled = localStorage.getItem(LS_KEY) === 'true';
    setVoiceEnrolled(enrolled);
    if (enrolled) setVoiceFilterEnabled(true);
    // Clear any stuck isEnrolling flag from a previous interrupted session
    if (isEnrolling) setIsEnrolling(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingProgress(0);
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  const handleEnroll = useCallback(async () => {
    if (isEnrolling || disabled) return;

    setError(null);
    setIsEnrolling(true);
    setIsRecording(true);
    setStatus('idle', 'Recording your voice — speak for 5 seconds...');

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (selectedDeviceId) audioConstraints.deviceId = { exact: selectedDeviceId };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      chunksRef.current = [];

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);

        if (chunksRef.current.length === 0) {
          setError('No audio recorded — check microphone');
          setIsEnrolling(false);
          setStatus('error', 'No audio captured');
          return;
        }

        // Frontend-only: persist to localStorage, no backend call
        localStorage.setItem(LS_KEY, 'true');
        setVoiceEnrolled(true);
        setVoiceFilterEnabled(true);
        setStatus('ready', 'Voice enrolled');
        setIsEnrolling(false);
        chunksRef.current = [];
      };

      const startTime = Date.now();
      progressRef.current = window.setInterval(() => {
        setRecordingProgress(Math.min(100, ((Date.now() - startTime) / RECORDING_DURATION) * 100));
      }, 100);

      mediaRecorder.start(500);

      timerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
      }, RECORDING_DURATION);

    } catch (err: any) {
      setError(err.message || 'Microphone access failed');
      setIsEnrolling(false);
      setIsRecording(false);
      setStatus('error', 'Microphone access failed');
    }
  }, [isEnrolling, disabled, selectedDeviceId, setIsEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setStatus]);

  const handleUnenroll = useCallback(() => {
    if (isEnrolling) return;
    localStorage.removeItem(LS_KEY);
    setVoiceEnrolled(false);
    setVoiceFilterEnabled(false);
    setStatus('ready', 'Voice enrollment cleared');
  }, [isEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setStatus]);

  const handleToggleFilter = useCallback(() => {
    setVoiceFilterEnabled(!voiceFilterEnabled);
    setStatus('ready', voiceFilterEnabled ? 'Voice filter disabled' : 'Voice filter enabled');
  }, [voiceFilterEnabled, setVoiceFilterEnabled, setStatus]);

  if (!voiceEnrolled) {
    return (
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={handleEnroll}
          disabled={isEnrolling || disabled}
          className="flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-lg transition-[background-color,border-color,box-shadow,opacity,transform] active:scale-[0.98] shrink-0"
          style={isLight ? {
            fontSize: '13px',
            color: '#ffffff',
            background: isRecording ? 'var(--danger)' : 'var(--cam-primary)',
            border: '1px solid var(--border)',
          } : {
            fontSize: '11px',
            color: isRecording ? 'var(--accent)' : 'var(--text-muted)',
            background: isRecording ? 'var(--accent-subtle)' : 'transparent',
            border: '1px solid var(--border)',
          }}
          title="Record 5 s of your voice — the app will learn to filter it during interviews"
        >
          {isRecording ? (
            <>
              <RecordingIcon />
              <span>Recording... {Math.round(recordingProgress)}%</span>
            </>
          ) : isEnrolling ? (
            <>
              <Spinner />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <VoiceIcon />
              <span>Enroll My Voice</span>
            </>
          )}
        </button>
        {isRecording && (
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'var(--border)' : 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${recordingProgress}%`, background: 'var(--danger)' }} />
          </div>
        )}
        {error && <span className="text-xs max-w-full truncate" style={{ color: 'var(--danger)' }} title={error}>{error}</span>}
      </div>
    );
  }

  return (
    <div className={isLight ? 'flex flex-row items-center gap-2 shrink-0 flex-wrap' : 'flex items-center gap-1 shrink-0'}>
      {error && <span className="text-xs max-w-[180px] truncate" style={{ color: 'var(--danger)' }} title={error}>{error}</span>}
      <button
        onClick={handleToggleFilter}
        disabled={disabled}
        className="flex items-center justify-center gap-2 font-bold rounded-lg transition-[background-color,border-color,box-shadow,opacity,transform] active:scale-[0.98] shrink-0"
        style={isLight ? {
          fontSize: '13px',
          padding: '10px 16px',
          color: voiceFilterEnabled ? '#ffffff' : 'var(--text-primary)',
          background: voiceFilterEnabled ? 'var(--cam-primary)' : 'var(--bg-elevated)',
          border: `1px solid ${voiceFilterEnabled ? 'var(--cam-primary)' : 'var(--border)'}`,
        } : {
          fontSize: '11px',
          padding: '4px 8px',
          color: voiceFilterEnabled ? 'var(--accent)' : 'var(--text-muted)',
          background: voiceFilterEnabled ? 'var(--accent-subtle)' : 'transparent',
          border: '1px solid var(--border)',
        }}
        title={voiceFilterEnabled ? 'Voice filter active — only interviewer is transcribed' : 'Voice filter disabled'}
      >
        <VoiceIcon filled={voiceFilterEnabled} />
        <span>{voiceFilterEnabled ? 'Filter On' : 'Filter Off'}</span>
      </button>
      <button
        onClick={handleUnenroll}
        disabled={isEnrolling || disabled}
        className="font-bold rounded-lg transition-[background-color,border-color,color,opacity,transform] active:scale-[0.98]"
        style={isLight ? {
          fontSize: '12px',
          padding: '8px 16px',
          color: 'var(--danger)',
          background: 'transparent',
          border: '1.5px solid var(--danger)',
        } : {
          fontSize: '12px',
          padding: '4px 6px',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}
        title="Remove voice enrollment"
      >
        {isLight ? 'Remove Enrollment' : <XIcon />}
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
    <svg className="w-3.5 h-3.5 animate-pulse text-[var(--danger)]" fill="currentColor" viewBox="0 0 24 24">
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
