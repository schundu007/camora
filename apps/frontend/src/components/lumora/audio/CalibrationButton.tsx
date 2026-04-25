import { useCalibration } from './hooks/useCalibration';
import { useInterviewStore } from '@/stores/interview-store';

interface CalibrationButtonProps {
  deviceId?: string | null;
  disabled?: boolean;
  variant?: 'dark' | 'light';
}

export function CalibrationButton({ deviceId, disabled, variant = 'dark' }: CalibrationButtonProps) {
  const isLight = variant === 'light';
  const { setThreshold, setStatus, vadThreshold } = useInterviewStore();

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
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCalibrate}
        disabled={isCalibrating || disabled}
        className="flex items-center justify-center gap-2 font-bold rounded-lg transition-all shrink-0"
        style={isLight ? {
          fontSize: '13px',
          padding: '10px 16px',
          color: '#ffffff',
          background: isCalibrating ? '#000000' : 'var(--cam-primary)',
          border: '1px solid var(--border)',
        } : {
          fontSize: '11px',
          padding: '4px 8px',
          color: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        title="Calibrate VAD threshold based on ambient noise"
      >
        {isCalibrating ? (
          <>
            <Spinner />
            <span>Calibrating...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <span>{isLight ? 'Calibrate Now' : <span className="hidden xl:inline">Calibrate</span>}</span>
          </>
        )}
      </button>
      {isLight && vadThreshold > 0 && (
        <span className="text-xs font-medium" style={{ color: 'var(--cam-primary)' }}>
          Current threshold: {vadThreshold.toFixed(4)}
        </span>
      )}
      {error && <span className="text-xs" style={{ color: '#FF0000' }}>{isLight ? error : '!'}</span>}
    </div>
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
