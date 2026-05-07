import { memo, type CSSProperties } from 'react';

/**
 * Slow horizontal drift marquee for the skill pill row. Same dual-copy
 * pattern as the company-logo strip in the landing page — duplicates the
 * list and translates by -50% so the loop seam is invisible. CSS-only,
 * GPU-accelerated via transform, paused on hover so users can read.
 */
type Props = {
  skills: readonly string[];
  /** Seconds for one full loop. Larger = slower. */
  duration?: number;
};

function SkillDriftImpl({ skills, duration = 48 }: Props) {
  const style: CSSProperties = {
    animation: `skill-drift ${duration}s linear infinite`,
    width: 'max-content',
  };
  return (
    <div className="relative mt-4 mx-auto max-w-3xl overflow-hidden">
      {/* Edge fades so pills appear to enter and leave the viewport
          rather than getting clipped by a hard edge. */}
      <div className="pointer-events-none absolute left-0 inset-y-0 w-12 z-10 bg-gradient-to-r from-[var(--bg-surface)] to-transparent" />
      <div className="pointer-events-none absolute right-0 inset-y-0 w-12 z-10 bg-gradient-to-l from-[var(--bg-surface)] to-transparent" />
      <div className="flex gap-2 group" style={style}>
        {[...skills, ...skills].map((s, i) => (
          <span
            key={`${s}-${i}`}
            className="shrink-0 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 font-mono text-[11px] font-semibold tracking-wide text-[var(--text-primary)] transition-colors hover:border-[var(--cam-primary)] hover:text-[var(--cam-primary)]"
          >
            {s}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes skill-drift {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .group:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}

export const SkillDrift = memo(SkillDriftImpl);
export default SkillDrift;
