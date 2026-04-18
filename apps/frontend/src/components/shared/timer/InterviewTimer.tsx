import { useState, useEffect, useRef, useCallback } from 'react';

interface InterviewTimerProps {
  /** Total duration in seconds */
  duration: number;
  /** Called when the timer reaches zero */
  onExpire?: () => void;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Show pause/resume controls */
  showControls?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/** Format seconds as MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Reusable interview timer component.
 *
 * Displays a countdown in MM:SS format with color-coded urgency:
 *   - Green  when > 50% time remains
 *   - Amber  when 20-50% remains
 *   - Red    when < 20% remains
 *
 * Optionally renders pause/resume controls via `showControls`.
 */
export function InterviewTimer({
  duration,
  onExpire,
  isRunning,
  showControls = false,
  className = '',
}: InterviewTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);

  // Keep callback ref in sync so the interval always calls the latest version
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset when duration changes
  useEffect(() => {
    setSecondsLeft(duration);
    setPaused(false);
  }, [duration]);

  // Core countdown interval
  useEffect(() => {
    if (!isRunning || paused) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, paused]);

  // Derived values
  const percent = duration > 0 ? (secondsLeft / duration) * 100 : 0;
  const colorClass =
    percent > 50
      ? 'text-[var(--accent)]'
      : percent > 20
        ? 'text-amber-500'
        : 'text-red-500';
  const bgClass =
    percent > 50
      ? 'bg-[rgba(45,140,255,0.08)] border-[rgba(45,140,255,0.3)]'
      : percent > 20
        ? 'bg-amber-50 border-amber-200'
        : 'bg-red-50 border-red-200';
  const ringStroke =
    percent > 50 ? '#2D8CFF' : percent > 20 ? '#f59e0b' : '#ef4444';

  const togglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${bgClass} ${colorClass} ${className}`}
    >
      {/* Mini circular progress */}
      <div className="relative w-4 h-4 flex-shrink-0">
        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.2"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke={ringStroke}
            strokeWidth="2"
            strokeDasharray={`${percent * 0.5} 50`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Time display */}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(secondsLeft)}
      </span>

      {/* Optional pause / resume controls */}
      {showControls && isRunning && secondsLeft > 0 && (
        <button
          onClick={togglePause}
          className="ml-1 hover:opacity-70 transition-opacity"
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            // Play icon
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            // Pause icon
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
