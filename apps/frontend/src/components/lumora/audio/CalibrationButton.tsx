import { useCalibration } from './hooks/useCalibration';
import { useInterviewStore } from '@/stores/interview-store';

interface CalibrationButtonProps {
  deviceId?: string | null;
  disabled?: boolean;
}

export function CalibrationButton({ deviceId, disabled }: CalibrationButtonProps) {
  const { setThreshold, setStatus } = useInterviewStore();

  const { isCalibrating, error, calibrate } = useCalibration({
    deviceId,
    onComplete: (threshold) => {
      setThreshold(threshold);
      setStatus('ready', `Calibrated - threshold ${threshold.toFixed(4)}`);
    },
  });

  const handleCalibrate = () => {
    if (isCalibrating || disabled) return;
    setStatus('idle', 'Measuring ambient noise...');
    calibrate();
  };

  return (
    <button
      onClick={handleCalibrate}
      disabled={isCalibrating || disabled}
      className="px-2 py-1 text-xs font-bold text-white hover:text-white border border-gray-600 rounded transition-colors"
      title="Calibrate VAD threshold based on ambient noise"
    >
      {isCalibrating ? (
        <>
          <Spinner />
          Cal...
        </>
      ) : (
        'Cal'
      )}
      {error && <span className="text-rose-light ml-1">!</span>}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="w-3 h-3 animate-spin mr-1"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
