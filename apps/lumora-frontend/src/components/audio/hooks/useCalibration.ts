import { useCallback, useRef, useState } from 'react';

interface CalibrationOptions {
  deviceId?: string | null;
  duration?: number; // ms
  onComplete?: (threshold: number) => void;
}

interface CalibrationState {
  isCalibrating: boolean;
  error: string | null;
}

const DEFAULT_DURATION = 2200; // 2.2 seconds like vassist.py
const MIN_THRESHOLD = 0.006; // Energy floor

export function useCalibration(options: CalibrationOptions = {}) {
  const {
    deviceId = null,
    duration = DEFAULT_DURATION,
    onComplete,
  } = options;

  const [state, setState] = useState<CalibrationState>({
    isCalibrating: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    audioContextRef.current = null;
    streamRef.current = null;
  }, []);

  const calibrate = useCallback(async () => {
    if (state.isCalibrating) return;

    setState({ isCalibrating: true, error: null });

    try {
      cleanup();

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const samples: number[] = [];
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Collect samples for the duration
      const startTime = Date.now();

      const collectSamples = () => {
        if (Date.now() - startTime >= duration) {
          // Calculate threshold from samples
          if (samples.length > 0) {
            // Sort and get 85th percentile
            const sorted = [...samples].sort((a, b) => a - b);
            const p85Index = Math.floor(sorted.length * 0.85);
            const p85Value = sorted[p85Index] || MIN_THRESHOLD;

            // Apply 2.5x multiplier like vassist.py
            const threshold = Math.max(p85Value * 2.5, MIN_THRESHOLD);

            cleanup();
            setState({ isCalibrating: false, error: null });
            onComplete?.(threshold);
          } else {
            cleanup();
            setState({ isCalibrating: false, error: 'No audio samples collected' });
          }
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        samples.push(rms);

        requestAnimationFrame(collectSamples);
      };

      collectSamples();
    } catch (error: any) {
      cleanup();
      setState({
        isCalibrating: false,
        error: error.message || 'Calibration failed',
      });
    }
  }, [state.isCalibrating, deviceId, duration, onComplete, cleanup]);

  return {
    ...state,
    calibrate,
  };
}
