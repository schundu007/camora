import { useCallback, useEffect, useState } from 'react';

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

const STORAGE_KEY = 'vassist-selected-microphone';

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

      // Restore previously selected device
      const savedDeviceId = localStorage.getItem(STORAGE_KEY);
      if (savedDeviceId && audioInputs.some(d => d.deviceId === savedDeviceId)) {
        setSelectedDeviceIdState(savedDeviceId);
      } else if (audioInputs.length > 0) {
        // Default to first device (usually "default" or system default)
        setSelectedDeviceIdState(audioInputs[0].deviceId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enumerate audio devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedDeviceId = useCallback((deviceId: string) => {
    setSelectedDeviceIdState(deviceId);
    localStorage.setItem(STORAGE_KEY, deviceId);
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

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isLoading,
    error,
    refreshDevices: enumerateDevices,
  };
}
