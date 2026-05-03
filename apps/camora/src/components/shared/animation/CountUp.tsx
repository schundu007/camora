import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — tweens a number from 0 → `value` once it scrolls into view.
 * Pure rAF + IntersectionObserver, no animation library. Honors
 * prefers-reduced-motion by jumping straight to the target.
 *
 * Format-friendly: pass a `format` fn for currency, suffixes ("+"), etc.
 *
 * Usage:
 *   <CountUp value={21812} prefix="$" />
 *   <CountUp value={1850} suffix="+" />
 *   <CountUp value={1000} suffix="+" duration={1500} />
 */
export function CountUp({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  format,
  className,
  style,
}: {
  value: number;
  /** Tween duration in ms */
  duration?: number;
  prefix?: string;
  suffix?: string;
  /** Custom formatter for the integer portion (defaults to en-US locale) */
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              // ease-out cubic — fast at first, lands soft
              const eased = 1 - Math.pow(1 - t, 3);
              setShown(Math.round(value * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  const formatted = format ? format(shown) : shown.toLocaleString('en-US');
  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default CountUp;
