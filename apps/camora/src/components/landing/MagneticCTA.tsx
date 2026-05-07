import { memo, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

type Props = {
  children: ReactNode;
  /**
   * Maximum cursor pull strength in px on each axis. The button itself
   * moves at this strength; the inner content moves at half-strength
   * to create a parallax that reads as physical heft.
   */
  strength?: number;
  className?: string;
};

/**
 * Magnetic wrapper for any CTA-shaped child. Pulls toward cursor on
 * pointer-enter, eases back to origin on leave. Implemented with
 * useMotionValue + useSpring so animation runs OUTSIDE the React
 * render cycle — never triggers re-render of parent. Memoized to
 * fully isolate from the landing-page tree per perf guardrail.
 */
function MagneticCTAImpl({ children, strength = 8, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Spring config tuned for premium weight: low stiffness, high damping
  // — settles in ~250ms without overshoot. Skill spec for spring physics.
  const sx = useSpring(x, { stiffness: 220, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 22, mass: 0.6 });
  // Inner content at half-strength — reads as parallax depth.
  const ix = useTransform(sx, (v) => v * 0.5);
  const iy = useTransform(sy, (v) => v * 0.5);

  return (
    <motion.div
      ref={ref}
      className={className ?? 'inline-block'}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const norm = Math.min(1, Math.hypot(dx, dy) / Math.max(r.width, r.height));
        x.set((dx / Math.max(r.width, r.height)) * strength * 2);
        y.set((dy / Math.max(r.width, r.height)) * strength * 2);
        void norm; // available for future radial easing
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.span style={{ x: ix, y: iy, display: 'inline-block' }}>
        {children}
      </motion.span>
    </motion.div>
  );
}

export const MagneticCTA = memo(MagneticCTAImpl);
export default MagneticCTA;
