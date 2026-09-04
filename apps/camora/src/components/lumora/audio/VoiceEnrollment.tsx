import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useAuth } from '@/contexts/AuthContext';
import { speakerAPI } from '@/lib/api-client';

const LS_KEY = 'camora-voice-enrolled';
// Module-level flag: true once the filter has been enabled in this page session.
// Prevents the mount effect from re-enabling the filter on every tab switch
// after the user has deliberately toggled it off.
let filterRestoredThisSession = false;

// Module-level, deliberately: VoiceEnrollment can be mounted more than once at
// the same time (behavioral toolbar + settings panel), so an external start
// event reaches every instance. The store's isEnrolling flag cannot gate that —
// it is async state, and all listeners pass its guard within the same tick.
let lastExternalEnrollAt = 0;

interface VoiceEnrollmentProps {
  disabled?: boolean;
  variant?: 'dark' | 'light';
  /** Collapse the "Enroll My Voice" chip to a single human+voice icon (toolbar use). */
  iconOnly?: boolean;
}

export const VoiceEnrollment = ({ disabled, variant = 'dark', iconOnly = false }: VoiceEnrollmentProps) => {
  const isLight = variant === 'light';
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
  } = useSessionStore();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const tokenRef = useRef<string | null>(null);
  const mimeTypeRef = useRef<string>('');

  useEffect(() => { tokenRef.current = token; }, [token]);

  const RECORDING_DURATION = 5000;

  // Restore enrollment from localStorage for an instant paint, then RECONCILE
  // against the server — the voice print lives on ai-services, not here.
  //
  // localStorage alone was a lie waiting to happen, and it happened: the print
  // is a file under /data/embeddings in the ai-services container, so any
  // restart or redeploy loses it, while this flag persisted forever. The UI
  // then showed "Filter On / Remove Enrollment" while /speaker/diarize, finding
  // no embedding, returned should_transcribe:true with interviewer_ratio 1.0 —
  // indistinguishable from a healthy "it's all interviewer" verdict. Net effect:
  // the candidate's own voice was transcribed and answered back at them in
  // behavioral, with nothing anywhere reporting the mismatch.
  //
  // speakerAPI.getStatus() had been written for exactly this and never called.
  //
  // Only enable the filter once per page session (not on every tab-switch
  // remount) so a deliberate user toggle of "Filter Off" survives navigation.
  useEffect(() => {
    const cached = localStorage.getItem(LS_KEY) === 'true';
    setVoiceEnrolled(cached);
    if (cached && !filterRestoredThisSession) {
      filterRestoredThisSession = true;
      setVoiceFilterEnabled(true);
    }
    // Clear any stuck isEnrolling flag from a previous interrupted session
    if (useSessionStore.getState().isEnrolling) setIsEnrolling(false);

    if (!token) return;
    let cancelled = false;
    speakerAPI.getStatus(token)
      .then((res) => {
        if (cancelled) return;
        const enrolled = res?.enrolled === true;
        // The route reports `service_unavailable` when it cannot reach
        // ai-services and degrades to enrolled:false. Do NOT clear a real
        // enrollment on an outage — that would nag the user into re-recording
        // during an interview over a transient blip. Leave the flag alone and
        // let the filter's own status line carry the problem.
        if ((res as { service_unavailable?: boolean })?.service_unavailable) return;
        if (enrolled === cached) return;
        localStorage.setItem(LS_KEY, String(enrolled));
        setVoiceEnrolled(enrolled);
        if (!enrolled) {
          setVoiceFilterEnabled(false);
          setStatus('warn', 'Voice print not found on the server — re-enroll to filter your voice');
        }
      })
      .catch(() => { /* offline / aborted — keep the cached value */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    // Stop mic tracks so the browser mic-in-use indicator clears on unmount.
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
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
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      mimeTypeRef.current = mimeType;

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

        const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
        chunksRef.current = [];

        (async () => {
          try {
            await speakerAPI.enroll(tokenRef.current ?? '', audioBlob, 'enrollment.webm');
          } catch (enrollErr: any) {
            setError(enrollErr.message || 'Failed to save voice profile');
            setIsEnrolling(false);
            setStatus('error', 'Enrollment failed');
            return;
          }
          localStorage.setItem(LS_KEY, 'true');
          setVoiceEnrolled(true);
          setVoiceFilterEnabled(true);
          setStatus('ready', 'Voice enrolled');
          setIsEnrolling(false);
        })();
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
      // Ensure mic stream is released if getUserMedia succeeded but MediaRecorder failed.
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setError(err.message || 'Microphone access failed');
      setIsEnrolling(false);
      setIsRecording(false);
      setStatus('error', 'Microphone access failed');
    }
  }, [isEnrolling, disabled, selectedDeviceId, setIsEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setStatus]);

  // Lets a prompt elsewhere in the shell start enrollment without duplicating
  // any of the mic / upload / store logic above — it calls the exact function
  // the chip calls, with the same guards. Purely additive: when nothing
  // dispatches the event, this component behaves as it always has.
  useEffect(() => {
    const onExternalStart = () => {
      const now = Date.now();
      if (now - lastExternalEnrollAt < 2000) return; // see lastExternalEnrollAt
      lastExternalEnrollAt = now;
      void handleEnroll();
    };
    window.addEventListener('lumora:start-voice-enrollment', onExternalStart);
    return () => window.removeEventListener('lumora:start-voice-enrollment', onExternalStart);
  }, [handleEnroll]);

  // Clear the print on the SERVER, not just the local flag. This used to be
  // localStorage-only, which was survivable while nothing ever asked the server
  // — but the mount effect now reconciles against it, so a server-side print
  // left behind would report enrolled:true and silently undo the removal on the
  // next mount. Local state clears immediately either way: the user pressed
  // Remove and must see it removed, even if the call fails.
  const handleUnenroll = useCallback(() => {
    if (isEnrolling) return;
    localStorage.removeItem(LS_KEY);
    setVoiceEnrolled(false);
    setVoiceFilterEnabled(false);
    setStatus('ready', 'Voice enrollment cleared');
    const t = tokenRef.current;
    if (!t) return;
    speakerAPI.unenroll(t).catch(() => {
      setStatus('warn', 'Voice print cleared here, but the server copy could not be removed');
    });
  }, [isEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setStatus]);

  const handleToggleFilter = useCallback(() => {
    setVoiceFilterEnabled(!voiceFilterEnabled);
    setStatus('ready', voiceFilterEnabled ? 'Voice filter disabled' : 'Voice filter enabled');
  }, [voiceFilterEnabled, setVoiceFilterEnabled, setStatus]);

  if (!voiceEnrolled) {
    const enrollTip = isRecording
      ? `Recording your voice... ${Math.round(recordingProgress)}%`
      : isEnrolling
        ? 'Processing your voice profile...'
        : 'Enroll My Voice — record 5 s so the app can filter it during sessions';
    return (
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={handleEnroll}
          disabled={isEnrolling || disabled}
          aria-label={isRecording ? 'Recording voice' : isEnrolling ? 'Processing voice' : 'Enroll my voice'}
          className="lum-tool-chip"
          style={iconOnly ? { width: 32, padding: 0 } : undefined}
          data-tip={enrollTip}
        >
          {isRecording ? (
            <>
              <RecordingIcon />
              {!iconOnly && <span>Recording... {Math.round(recordingProgress)}%</span>}
            </>
          ) : isEnrolling ? (
            <>
              <Spinner />
              {!iconOnly && <span>Processing...</span>}
            </>
          ) : (
            <>
              <PersonVoiceIcon />
              {!iconOnly && <span>Enroll My Voice</span>}
            </>
          )}
        </button>
        {isRecording && (
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'var(--border)' : 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${recordingProgress}%`, background: 'var(--danger)' }} />
          </div>
        )}
        {error && <span className="text-xs max-w-full truncate" style={{ color: 'var(--danger)' }} data-tip={error}>{error}</span>}
      </div>
    );
  }

  return (
    <div className={isLight ? 'flex flex-row items-center gap-2 shrink-0 flex-wrap' : 'flex items-center gap-1 shrink-0'}>
      {error && <span className="text-xs max-w-[180px] truncate" style={{ color: 'var(--danger)' }} data-tip={error}>{error}</span>}
      {/* A toggle, so it says what it does and which way it currently is.
          It was a solid navy button that outweighed Ask — the control you
          actually press mid-interview — for a setting you touch once a
          session. On is now a tint, not a fill. */}
      <button
        onClick={handleToggleFilter}
        disabled={disabled}
        role="switch"
        aria-checked={voiceFilterEnabled}
        className={`lum-tool-chip ${voiceFilterEnabled ? 'is-on' : ''}`}
        data-tip={voiceFilterEnabled
          ? 'On — your own voice is filtered out, so only the interviewer is transcribed. Click to turn off.'
          : 'Off — everything the mic hears is transcribed, including you. Click to filter your voice out.'}
      >
        <FilterIcon active={voiceFilterEnabled} />
        <span>{voiceFilterEnabled ? 'Filter on' : 'Filter off'}</span>
      </button>
      <button
        onClick={handleUnenroll}
        disabled={isEnrolling || disabled}
        /* Destructive AND rare. At rest it was a red-outlined button — the
           loudest thing in a toolbar you use during a live interview, for an
           action you take roughly never. It stays fully visible (never a
           hover-reveal), but earns its red on hover and focus instead of
           claiming it permanently. */
        className="lum-tool-chip is-danger"
        data-tip="Delete your voice print. You'll need to record it again to filter your voice."
      >
        {isLight ? (
          <>
            <PersonMinusIcon />
            <span>Remove enrollment</span>
          </>
        ) : <PersonMinusIcon />}
      </button>
    </div>
  );
}

// Human + voice: a person's head/shoulders with sound waves radiating out —
// signals "enroll YOUR voice" in a single glyph for the compact toolbar chip.
const PersonVoiceIcon = () => {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M17.5 9a4 4 0 0 1 0 6" />
      <path d="M20 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

/* A funnel with a voice passing through it.
   This control used to wear a filled microphone, which at 14px collapsed
   into an opaque blob that said "microphone", not "filter" — and it sat two
   chips away from Ask, which is also a microphone. A funnel is the one
   shape that means filter on sight; the wave entering it is the voice being
   sorted. Filled throat when on, hollow when off, so state survives even if
   you can't resolve the colour. */
const FilterIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" className="shrink-0"
  >
    <path d="M3 5h18l-7 8v6l-4 2v-8z" fill={active ? 'currentColor' : 'none'} />
  </svg>
);

/* A person with a minus — "take this voice off the account". Reads as
   removal without the shouting a red outline does. */
const PersonMinusIcon = () => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" className="shrink-0"
  >
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M17 12h5" />
  </svg>
);

const RecordingIcon = () => {
  return (
    <svg className="w-3.5 h-3.5 animate-pulse text-[var(--danger)]" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

const Spinner = () => {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
