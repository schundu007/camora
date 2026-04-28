import { useCallback, useEffect, useRef, useState } from 'react';

interface AudioCaptureOptions {
  onAudioData?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void;
  onRecordingStop?: () => void;
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
  const chunksRef = useRef<Blob[]>([]);
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
      chunksRef.current = [];
      speechStartTimeRef.current = null;

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

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          if (manualStopRef.current) {
            // Manual stop: always send audio regardless of VAD
            onAudioData?.(blob);
          } else if (speechStartTimeRef.current) {
            // VAD stop: only send if speech was detected and long enough
            const speechDuration = Date.now() - speechStartTimeRef.current;
            if (speechDuration >= minSpeechDuration) {
              onAudioData?.(blob);
            }
          }
        }
        chunksRef.current = [];
        speechStartTimeRef.current = null;
        manualStopRef.current = false;
      };

      mediaRecorder.start();
      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Set max recording duration timer as a safety fallback
      if (maxRecordingDuration > 0) {
        maxRecordingTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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

        // Voice activity detection
        if (rms > silenceThreshold) {
          if (!speechStartTimeRef.current) {
            speechStartTimeRef.current = Date.now();
            console.log(`[VAD] Speech detected, rms=${rms.toFixed(4)}, threshold=${silenceThreshold}`);
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speechStartTimeRef.current && !silenceTimerRef.current) {
          console.log(`[VAD] Silence detected after speech, starting ${silenceDuration}ms countdown`);
          silenceTimerRef.current = window.setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
  }, [state.isSupported, cleanup, onAudioData, onAudioLevel, onRecordingStop, silenceThreshold, silenceDuration, minSpeechDuration, maxRecordingDuration, deviceId]);

  const stopRecording = useCallback(() => {
    manualStopRef.current = true; // Flag: user clicked stop — always send audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // triggers async onstop → creates blob → calls onAudioData
    }
    setState(prev => ({ ...prev, isRecording: false }));
    // Delay cleanup to let onstop fire and process the audio blob first
    setTimeout(() => cleanup(), 500);
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
