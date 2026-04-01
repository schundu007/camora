import { useEffect, useRef } from 'react';

interface VoiceActivityDetectorProps {
  level: number;
  isActive?: boolean;
  threshold?: number;
  width?: number;
  height?: number;
  listenDuration?: number;
  answerDuration?: number;
}

export function VoiceActivityDetector({
  level,
  threshold = 0.015,
  width = 88,
  height = 26,
}: VoiceActivityDetectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>(new Array(64).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update history
    historyRef.current.shift();
    historyRef.current.push(level);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bars
    const barWidth = width / 64;
    const history = historyRef.current;

    for (let i = 0; i < 64; i++) {
      const value = history[i];
      const barHeight = Math.max(2, value * height * 8);
      const isAboveThreshold = value > threshold;

      ctx.fillStyle = isAboveThreshold
        ? 'rgba(16, 185, 129, 0.7)'  // emerald
        : 'rgba(99, 102, 241, 0.3)'; // indigo

      ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight
      );
    }
  }, [level, threshold, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded border border-border bg-white/[0.02]"
    />
  );
}
