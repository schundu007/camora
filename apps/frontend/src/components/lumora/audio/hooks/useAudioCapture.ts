import { useCallback, useEffect, useRef, useState } from 'react';

// Debug logging for the auto-mic state machine. Off by default so
// production console stays clean. Flip it on in DevTools when the mic
// misbehaves: `localStorage.setItem('lumora_mic_debug', 'on')` then
// reload (matches the AudioCapture-side `dlog` flag).
function micDebug(...args: unknown[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('lumora_mic_debug') !== 'on') return;
    // eslint-disable-next-line no-console
    console.log('[mic]', ...args);
  } catch { /* ignore */ }
}

interface AudioCaptureOptions {
  onAudioData?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void;
  onRecordingStop?: () => void;
  onRecorderError?: (msg: string) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
  maxRecordingDuration?: number;
  deviceId?: string | null;
}

interface AudioCaptureState {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  audioLevel: number;
}

export function useAudioCapture(options: AudioCaptureOptions = {}) {
  const {
    onAudioData,
    onAudioLevel,
    onRecordingStop,
    onRecorderError,
    silenceThreshold = 0.01,
    silenceDuration = 1200, // ms of silence before stopping
    minSpeechDuration = 400, // ms minimum speech
    maxRecordingDuration = 45000, // max 45s recording as safety fallback
    deviceId = null,
  } = options;

  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    isSupported: typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    error: null,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // NOTE: per-recording chunk buffers used to live on a shared `chunksRef`
  // here. That caused a silent audio loss: when Auto mode chained two
  // restarts back-to-back (handleRecordingStop + a transcription-driven
  // restart), the second startRecording() ran cleanup() on the prior
  // recorder AND zeroed the shared array before the prior recorder's
  // async `onstop` had a chance to read it — so the in-flight blob came
  // out empty and was dropped. Each MediaRecorder now closes over its
  // own local array (see startRecording below) so cleanups are safe.
  const silenceTimerRef = useRef<number | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const manualStopRef = useRef(false); // When true, always send audio (skip VAD check)
  const animationFrameRef = useRef<number | null>(null);
  const maxRecordingTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Audio recording not supported' }));
      return;
    }

    try {
      cleanup();
      speechStartTimeRef.current = null;
      // Defensive: clear any stale silence-timer ref left over from
      // a previous recording. cleanup() above clears the timer ID, but
      // doesn't null the ref. Without this, the new recording's
      // !silenceTimerRef.current guard inside monitorAudioLevel never
      // lets a fresh silence timer arm — recordings would roll to the
      // maxRecordingDuration ceiling instead of stopping on VAD silence.
      silenceTimerRef.current = null;

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      // Use specific device if provided. `ideal` (not `exact`) so a
      // stale/missing saved device falls back to the system default
      // instead of throwing OverconstrainedError — that error used to
      // re-trigger the auto-start effect on every render and produced
      // the AudioContext-error spam in the console.
      if (deviceId) {
        audioConstraints.deviceId = { ideal: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;

      // If the system audio input is unplugged or revoked, the track
      // ends silently. Surface it instead of leaving the recorder in a
      // ghost state.
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.onended = () => {
          micDebug('track ended (device unplug / permission revoked)');
          onRecorderError?.('Mic input ended — please reconnect or re-grant access.');
          setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));
        };
      }

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      // Some browsers create the context in `suspended` until a user
      // gesture or visibility resume. Resume immediately so the RAF
      // analyser actually pumps frames.
      if (audioContext.state === 'suspended') {
        try { await audioContext.resume(); } catch { /* ignore */ }
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder. Each recorder closes over its OWN chunk
      // array — see the comment above the (removed) chunksRef. That
      // makes a stale recorder's onstop safe to fire after a new
      // startRecording() has already run cleanup; the old recorder still
      // owns its own data.
      const localChunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      // Snapshot the speechStartTime that is RELEVANT to this recording.
      // If a later startRecording() resets speechStartTimeRef to null,
      // this closure still has the correct moment for VAD-vs-min-speech
      // length checks.
      const startedAt = Date.now();
      micDebug('recorder created', { startedAt, deviceId });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          localChunks.push(event.data);
        }
      };

      mediaRecorder.onerror = (event: Event) => {
        const err = (event as unknown as { error?: { message?: string } }).error;
        const msg = err?.message || 'MediaRecorder error';
        micDebug('recorder onerror', msg);
        onRecorderError?.(msg);
        setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));
        try { onRecordingStop?.(); } catch { /* ignore */ }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(localChunks, { type: 'audio/webm' });
        const wasManual = manualStopRef.current;
        // The shared speechStartTimeRef can be null already if a sibling
        // restart cleared it. Fall back to this recorder's own start
        // time so we don't drop a perfectly good recording just because
        // the next cycle has begun.
        const localSpeechStart = speechStartTimeRef.current ?? startedAt;
        micDebug('recorder onstop', {
          bytes: blob.size,
          manual: wasManual,
          speechMs: Date.now() - localSpeechStart,
        });
        if (blob.size > 0) {
          if (wasManual) {
            // Manual stop: always send audio regardless of VAD
            onAudioData?.(blob);
          } else if (speechStartTimeRef.current) {
            // VAD stop: only send if speech was detected and long enough
            const speechDuration = Date.now() - speechStartTimeRef.current;
            if (speechDuration >= minSpeechDuration) {
              onAudioData?.(blob);
            } else {
              micDebug('VAD stop but speech too short — dropped', { speechDuration, minSpeechDuration });
            }
          }
        }
        // Don't clear shared refs here — they may belong to a newer
        // recording that already started. localChunks is GC'd with the
        // closure.
        if (manualStopRef.current) manualStopRef.current = false;
      };

      mediaRecorder.start();
      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Set max recording duration timer as a safety fallback
      if (maxRecordingDuration > 0) {
        maxRecordingTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            micDebug('maxRecordingDuration ceiling hit, stopping');
            // Force set speech start if not set, so audio data is processed
            if (!speechStartTimeRef.current) {
              speechStartTimeRef.current = Date.now() - minSpeechDuration - 100;
            }
            mediaRecorderRef.current.stop();
            setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));
            onRecordingStop?.();
            // Cleanup
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close();
              audioContextRef.current = null;
            }
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
          }
        }, maxRecordingDuration);
      }

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        setState(prev => ({ ...prev, audioLevel: rms }));
        onAudioLevel?.(rms);

        // Voice activity detection. silenceDuration <= 0 disables the
        // silence-driven auto-stop entirely — caller wants a hard
        // toggle (mic stays on until explicit stopRecording). Used by
        // manual mic mode where natural pauses shouldn't kill the
        // recording mid-question.
        if (rms > silenceThreshold) {
          if (!speechStartTimeRef.current) {
            speechStartTimeRef.current = Date.now();
            micDebug(`speech detected, rms=${rms.toFixed(4)}, threshold=${silenceThreshold}`);
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (silenceDuration > 0 && speechStartTimeRef.current && !silenceTimerRef.current) {
          micDebug(`silence detected after speech, ${silenceDuration}ms countdown`);
          silenceTimerRef.current = window.setTimeout(() => {
            // Null the ref the moment the timer fires — the next
            // recording cycle's `!silenceTimerRef.current` guard would
            // otherwise stay false until the speech-detected branch
            // happens to clear it, which can never fire if the user is
            // too quiet to cross threshold on the new recording.
            silenceTimerRef.current = null;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              micDebug('VAD silence-stop firing');
              mediaRecorderRef.current.stop();
              setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));
              onRecordingStop?.();
              // Clean up audio resources after VAD stops
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
              }
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
              }
            }
          }, silenceDuration);
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };

      monitorAudioLevel();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to start recording',
        isRecording: false,
      }));
    }
  }, [state.isSupported, cleanup, onAudioData, onAudioLevel, onRecordingStop, onRecorderError, silenceThreshold, silenceDuration, minSpeechDuration, maxRecordingDuration, deviceId]);

  const stopRecording = useCallback(() => {
    manualStopRef.current = true; // Flag: user clicked stop — always send audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // triggers async onstop → creates blob → calls onAudioData
    }
    setState(prev => ({ ...prev, isRecording: false }));
    // Delay cleanup to let onstop fire and process the audio blob first
    setTimeout(() => cleanup(), 500);
  }, [cleanup]);

  // Health probe used by the Auto-mode heartbeat. Ground truth — the
  // store's isRecording flag can drift; this checks the actual
  // MediaRecorder + AudioContext + track state.
  const isRecorderHealthy = useCallback((): boolean => {
    const rec = mediaRecorderRef.current;
    const ctx = audioContextRef.current;
    const stream = streamRef.current;
    if (!rec || !ctx || !stream) return false;
    if (rec.state !== 'recording') return false;
    if (ctx.state === 'closed') return false;
    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState === 'ended' || !track.enabled) return false;
    return true;
  }, []);

  // Chrome auto-suspends an AudioContext when the tab is backgrounded;
  // RAF stops, VAD freezes. The visibility listener in AudioCapture
  // calls this on focus return. Safe to call when already running.
  const resumeContext = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); micDebug('audioContext resumed'); } catch { /* ignore */ }
    }
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    isRecorderHealthy,
    resumeContext,
  };
}
