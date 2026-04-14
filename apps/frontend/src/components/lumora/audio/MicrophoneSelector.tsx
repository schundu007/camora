import { useAudioDevices } from './hooks/useAudioDevices';

interface MicrophoneSelectorProps {
  disabled?: boolean;
  onDeviceChange?: (deviceId: string) => void;
}

export function MicrophoneSelector({ disabled, onDeviceChange }: MicrophoneSelectorProps) {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isLoading,
    error,
  } = useAudioDevices();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDeviceId(deviceId);
    onDeviceChange?.(deviceId);
  };

  if (error) {
    return (
      <div className="text-xs text-rose-light">
        {error}
      </div>
    );
  }

  return (
    <select
      value={selectedDeviceId || ''}
      onChange={handleChange}
      disabled={disabled || isLoading}
      className="appearance-none bg-gray-800 border border-gray-600 text-white font-bold text-sm px-1.5 py-1 w-[100px] sm:w-[120px] truncate focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer rounded"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' fill='none'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 4px center',
        paddingRight: '18px',
      }}
      title={devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Select microphone'}
    >
      {isLoading ? (
        <option value="" className="bg-white text-gray-900">Loading...</option>
      ) : devices.length === 0 ? (
        <option value="" className="bg-white text-gray-900">No mic</option>
      ) : (
        devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId} className="bg-white text-gray-900">
            {formatDeviceName(device.label)}
          </option>
        ))
      )}
    </select>
  );
}

function formatDeviceName(name: string): string {
  if (!name || name === 'default') return 'Default Mic';

  // Shorten common device names for display
  const replacements: [RegExp, string][] = [
    [/^Default - /, ''],
    [/\s*\(Built-in\)$/i, ''],
    [/MacBook Pro Microphone/i, 'MacBook Mic'],
    [/MacBook Air Microphone/i, 'MacBook Mic'],
    [/Microphone Array/i, 'Mic Array'],
    [/USB Audio Device/i, 'USB Audio'],
    [/Jabra\s+/i, 'Jabra '],
    [/Logitech\s+/i, 'Logitech '],
    [/^Microphone\s+\d+$/i, 'Mic'],
  ];

  let result = name;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Truncate if still too long
  if (result.length > 25) {
    result = result.slice(0, 22) + '...';
  }

  return result;
}

function MicIcon() {
  return (
    <svg
      className="w-3 h-3 text-indigo flex-shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}
