import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CaptureMethod,
  pickAutoMethod,
  isElectron,
  supportsTabShare,
} from '@/lib/audio-preferences';

/**
 * Universal interviewer-audio capture hook. Replaces the
 * `useTabAudioCapture` hook with a multi-method version:
 *
 *   • electron-loopback — getDisplayMedia, intercepted by Electron's
 *     setDisplayMediaRequestHandler to return system loopback audio.
 *     Works for any audio playing on the user's machine, including
 *     the native Zoom/Teams desktop client.
 *
 *   • tab-share — getDisplayMedia in Chromium browsers. The user
 *     picks the meeting tab and checks "Share tab audio".
 *
 *   • virtual-mic — getUserMedia against a virtual loopback device the
 *     user has installed (BlackHole, VoiceMeeter, Loopback). The
 *     deviceId is picked by the AudioSetupWizard. Power-user path.
 *
 *   • mic-only — the candidate's mic is the only stream; we don't
 *     run a second capture. The hook never starts a stream in this
 *     mode — the candidate-mic capture (useAudioCapture) is the
 *     interviewer source via server-side diarization.
 *
 * Inside each non-mic-only method, the same VAD + chunking + transcribe
 * pipeline runs: monitor RMS, detect speech, stop on silence, emit a
 * Blob to the caller, restart for the next utterance.
 */

interface CaptureOptions {
  method: CaptureMethod;
  /** Required when method === 'virtual-mic'. */
  virtualMicDeviceId?: string | null;
  onAudioData?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void;
  onRecordingStop?: () => void;
  onMethodResolved?: (method: Exclude<CaptureMethod, 'auto'>) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
  maxRecordingDuration?: number;
}

interface CaptureState {
  isCapturing: boolean;
  isSupported: boolean;
  error: string | null;
  audioLevel: number;
  /** The actually-running method (resolved from `auto` when capture started). */
  resolvedMethod: Exclude<CaptureMethod, 'auto'> | null;
}

async function acquireStream(
  method: Exclude<CaptureMethod, 'auto' | 'mic-only'>,
  virtualMicDeviceId: string | null,
): Promise<MediaStream> {
  if (method === 'electron-loopback' || method === 'tab-share') {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('This browser cannot capture interviewer audio. Use Chrome, Edge, or the Camora desktop app.');
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      // @ts-ignore — Chrome-specific: auto-check "Share tab audio"
      systemAudio: 'include',
      // @ts-ignore — Chrome-specific: exclude self tab from picker
      selfBrowserSurface: 'exclude',
    });
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(
        method === 'electron-loopback'
          ? 'No system audio detected. Make sure something is playing through your speakers.'
          : 'No audio track. Pick a tab (not a window) and check "Share tab audio".',
      );
    }
    stream.getVideoTracks().forEach((t) => t.stop());
    return new MediaStream(audioTracks);
  }

  if (method === 'virtual-mic') {
    if (!virtualMicDeviceId) throw new Error('No virtual mic selected.');
    return navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: virtualMicDeviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
  }

  throw new Error(`Unsupported method: ${method}`);
}

export function useInterviewerCapture(options: CaptureOptions) {
  const {
    method,
    virtualMicDeviceId = null,
    onAudioData,
    onAudioLevel,
    onRecordingStop,
    onMethodResolved,
    silenceThreshold = 0.012,
    silenceDuration = 1200,
    minSpeechDuration = 400,
    maxRecordingDuration = 12000,
  } = options;

  const [state, setState] = useState<CaptureState>({
    isCapturing: false,
    isSupported: isElectron() || supportsTabShare() || true /* virtual-mic always available where getUserMedia is */,
    error: null,
    audioLevel: 0,
    resolvedMethod: null,
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
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    animationFrameRef.current = null;
    silenceTimerRef.current = null;
    maxRecordingTimerRef.current = null;
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startCapture = useCallback(async () => {
    try {
      cleanup();
      chunksRef.current = [];
      speechStartTimeRef.current = null;

      // Mic-only doesn't acquire a separate stream — the candidate-mic
      // AudioCapture is the source. Just mark "ready" so the wizard
      // can proceed.
      if (method === 'mic-only') {
        setState((p) => ({ ...p, resolvedMethod: 'mic-only', isCapturing: false, error: null }));
        onMethodResolved?.('mic-only');
        return;
      }

      // Resolve `auto` to a concrete method based on the runtime.
      // Auto resolution that needs a virtual mic device list is
      // expected to happen in the wizard before calling start; here we
      // just fall back to tab-share if no virtualMicDeviceId is set.
      let resolved: Exclude<CaptureMethod, 'auto'>;
      if (method === 'auto') {
        // Without an enumerated device list we conservatively pick:
        // electron > virtual-mic-if-id > tab-share.
        if (isElectron()) resolved = 'electron-loopback';
        else if (virtualMicDeviceId) resolved = 'virtual-mic';
        else if (supportsTabShare()) resolved = 'tab-share';
        else resolved = 'mic-only';
      } else {
        resolved = method;
      }

      onMethodResolved?.(resolved);
      setState((p) => ({ ...p, resolvedMethod: resolved, error: null }));

      if (resolved === 'mic-only') {
        setState((p) => ({ ...p, isCapturing: false }));
        return;
      }

      const audioStream = await acquireStream(resolved, virtualMicDeviceId);
      streamRef.current = audioStream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0 && speechStartTimeRef.current) {
          const speechDuration = Date.now() - speechStartTimeRef.current;
          if (speechDuration >= minSpeechDuration) onAudioData?.(blob);
        }
        chunksRef.current = [];
        speechStartTimeRef.current = null;
      };

      audioStream.getAudioTracks()[0].onended = () => {
        setState((p) => ({ ...p, isCapturing: false, audioLevel: 0 }));
        cleanup();
        onRecordingStop?.();
      };

      mediaRecorder.start();
      setState((p) => ({ ...p, isCapturing: true, error: null }));

      if (maxRecordingDuration > 0) {
        maxRecordingTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            if (!speechStartTimeRef.current) {
              speechStartTimeRef.current = Date.now() - minSpeechDuration - 100;
            }
            mediaRecorderRef.current.stop();
            setTimeout(() => {
              if (streamRef.current?.active) {
                chunksRef.current = [];
                speechStartTimeRef.current = null;
                mediaRecorderRef.current?.start();
                setState((p) => ({ ...p, isCapturing: true }));
              }
            }, 100);
          }
        }, maxRecordingDuration);
      }

      const monitor = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 255;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setState((p) => ({ ...p, audioLevel: rms }));
        onAudioLevel?.(rms);

        if (rms > silenceThreshold) {
          if (!speechStartTimeRef.current) speechStartTimeRef.current = Date.now();
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speechStartTimeRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = window.setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              onRecordingStop?.();
              setTimeout(() => {
                if (streamRef.current?.active) {
                  chunksRef.current = [];
                  speechStartTimeRef.current = null;
                  mediaRecorderRef.current?.start();
                }
              }, 100);
            }
          }, silenceDuration);
        }

        animationFrameRef.current = requestAnimationFrame(monitor);
      };
      monitor();
    } catch (err: any) {
      cleanup();
      setState((p) => ({ ...p, isCapturing: false, audioLevel: 0, error: err.message || 'Capture failed' }));
    }
  }, [
    method,
    virtualMicDeviceId,
    cleanup,
    onAudioData,
    onAudioLevel,
    onRecordingStop,
    onMethodResolved,
    silenceThreshold,
    silenceDuration,
    minSpeechDuration,
    maxRecordingDuration,
  ]);

  const stopCapture = useCallback(() => {
    cleanup();
    setState((p) => ({ ...p, isCapturing: false, audioLevel: 0 }));
  }, [cleanup]);

  return {
    ...state,
    startCapture,
    stopCapture,
  };
}

/** Convenience: derive the pickAutoMethod value once devices are known. */
export { pickAutoMethod };
