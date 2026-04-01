import { useCallback, useEffect, useRef, useState } from 'react';

interface TabAudioCaptureOptions {
  onAudioData?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void;
  onRecordingStop?: () => void;
  silenceThreshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
  maxRecordingDuration?: number;
}

interface TabAudioCaptureState {
  isCapturing: boolean;
  isSupported: boolean;
  error: string | null;
  audioLevel: number;
}

export function useTabAudioCapture(options: TabAudioCaptureOptions = {}) {
  const {
    onAudioData,
    onAudioLevel,
    onRecordingStop,
    silenceThreshold = 0.01,
    silenceDuration = 5000,
    minSpeechDuration = 500,
    maxRecordingDuration = 90000,
  } = options;

  const [state, setState] = useState<TabAudioCaptureState>({
    isCapturing: false,
    isSupported: typeof window !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia,
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
  const animationFrameRef = useRef<number | null>(null);
  const maxRecordingTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current);
      maxRecordingTimerRef.current = null;
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

  const startCapture = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Tab audio capture not supported' }));
      return;
    }

    try {
      cleanup();
      chunksRef.current = [];
      speechStartTimeRef.current = null;

      // Request screen/tab share with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required, but we'll ignore video
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Check if audio track exists
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        setState(prev => ({
          ...prev,
          error: 'No audio track. Make sure to check "Share tab audio" when sharing.'
        }));
        return;
      }

      // Stop video track - we only need audio
      stream.getVideoTracks().forEach(track => track.stop());

      // Create audio-only stream
      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(audioStream, {
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
        if (blob.size > 0 && speechStartTimeRef.current) {
          const speechDuration = Date.now() - speechStartTimeRef.current;
          if (speechDuration >= minSpeechDuration) {
            onAudioData?.(blob);
          }
        }
        chunksRef.current = [];
        speechStartTimeRef.current = null;
      };

      // Handle track ending (user stops sharing)
      audioTracks[0].onended = () => {
        setState(prev => ({ ...prev, isCapturing: false, audioLevel: 0 }));
        cleanup();
        onRecordingStop?.();
      };

      mediaRecorder.start();
      setState(prev => ({ ...prev, isCapturing: true, error: null }));

      // Max recording duration
      if (maxRecordingDuration > 0) {
        maxRecordingTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            if (!speechStartTimeRef.current) {
              speechStartTimeRef.current = Date.now() - minSpeechDuration - 100;
            }
            mediaRecorderRef.current.stop();
            setState(prev => ({ ...prev, isCapturing: false, audioLevel: 0 }));
            onRecordingStop?.();
            // Restart recording for continuous capture
            setTimeout(() => {
              if (streamRef.current && streamRef.current.active) {
                chunksRef.current = [];
                speechStartTimeRef.current = null;
                mediaRecorderRef.current?.start();
                setState(prev => ({ ...prev, isCapturing: true }));
              }
            }, 100);
          }
        }, maxRecordingDuration);
      }

      // Audio level monitoring with VAD
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

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
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speechStartTimeRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = window.setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
              onRecordingStop?.();
              // Restart for continuous capture
              setTimeout(() => {
                if (streamRef.current && streamRef.current.active) {
                  chunksRef.current = [];
                  speechStartTimeRef.current = null;
                  mediaRecorderRef.current?.start();
                }
              }, 100);
            }
          }, silenceDuration);
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };

      monitorAudioLevel();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to capture tab audio',
        isCapturing: false,
      }));
    }
  }, [state.isSupported, cleanup, onAudioData, onAudioLevel, onRecordingStop, silenceThreshold, silenceDuration, minSpeechDuration, maxRecordingDuration]);

  const stopCapture = useCallback(() => {
    cleanup();
    setState(prev => ({ ...prev, isCapturing: false, audioLevel: 0 }));
  }, [cleanup]);

  return {
    ...state,
    startCapture,
    stopCapture,
  };
}
