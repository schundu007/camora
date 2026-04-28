import { useCallback, useEffect, useState } from 'react';
import { loadAudioPrefs, patchAudioPrefs } from '@/lib/audio-preferences';

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface UseAudioDevicesReturn {
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  setSelectedDeviceId: (deviceId: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshDevices: () => Promise<void>;
}

// Legacy localStorage key — only read for one-time migration. The
// canonical mic device is now lumora_audio_prefs_v1.micDeviceId, set
// by the AudioSetupWizard. Two competing keys silently picked
// different mics during interviews.
const LEGACY_KEY = 'vassist-selected-microphone';

export function useAudioDevices(): UseAudioDevicesReturn {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enumerateDevices = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setError('Audio device enumeration not supported');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request permission first to get device labels
      let permissionGranted = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        permissionGranted = true;
      } catch {
        // Permission denied or no devices - continue to enumerate anyway
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter(device => device.kind === 'audioinput')
        .map((device, index) => {
          let label = device.label;
          if (!label) {
            // No label means permission not granted or device issue
            if (device.deviceId === 'default') {
              label = 'Default Microphone';
            } else {
              label = `Microphone ${index + 1}`;
            }
          }
          return {
            deviceId: device.deviceId,
            label,
            groupId: device.groupId,
          };
        });

      setDevices(audioInputs);

      // Resolve which device to use, in priority order:
      //   1. lumora_audio_prefs_v1.micDeviceId (canonical, set by wizard)
      //   2. legacy `vassist-selected-microphone` — migrate into prefs
      //   3. first enumerated device
      const prefs = loadAudioPrefs();
      let resolved: string | null = null;
      if (prefs.micDeviceId && audioInputs.some(d => d.deviceId === prefs.micDeviceId)) {
        resolved = prefs.micDeviceId;
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy && audioInputs.some(d => d.deviceId === legacy)) {
          resolved = legacy;
          // One-time migration so future reads come from the canonical key.
          patchAudioPrefs({ micDeviceId: legacy });
        } else if (audioInputs.length > 0) {
          resolved = audioInputs[0].deviceId;
        }
      }
      setSelectedDeviceIdState(resolved);
    } catch (err: any) {
      setError(err.message || 'Failed to enumerate audio devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedDeviceId = useCallback((deviceId: string) => {
    setSelectedDeviceIdState(deviceId);
    // Canonical store: lumora_audio_prefs_v1.micDeviceId. Also write
    // the legacy key so any straggler reader stays in sync until the
    // legacy code path is fully removed.
    patchAudioPrefs({ micDeviceId: deviceId });
    try { localStorage.setItem(LEGACY_KEY, deviceId); } catch {}
  }, []);

  // Initial enumeration
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  // React to wizard updates — when the user picks a mic in the
  // AudioSetupWizard, the AudioCapture should switch to it without
  // needing a reload.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => {
      const prefs = loadAudioPrefs();
      if (prefs.micDeviceId) setSelectedDeviceIdState(prefs.micDeviceId);
    };
    window.addEventListener('lumora:audio-prefs-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('lumora:audio-prefs-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isLoading,
    error,
    refreshDevices: enumerateDevices,
  };
}
