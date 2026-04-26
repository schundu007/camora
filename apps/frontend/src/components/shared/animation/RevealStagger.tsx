import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * RevealStagger — wraps a list of children so each one slides up + fades in
 * with a small per-child delay. The first paint feels like the page is
 * unfolding rather than landing all at once.
 *
 * Honors prefers-reduced-motion: framer-motion already drops to a no-op
 * transition when the OS setting is on, so no extra guard is needed here.
 *
 * Usage:
 *   <RevealStagger>
 *     <h1>...</h1>
 *     <p>...</p>
 *     <button>...</button>
 *   </RevealStagger>
 */
export function RevealStagger({
  children,
  className = '',
  delay = 0,
  step = 0.08,
  distance = 12,
  duration = 0.45,
}: {
  children: ReactNode;
  className?: string;
  /** Delay before the first child starts animating (s) */
  delay?: number;
  /** Per-child stagger interval (s) */
  step?: number;
  /** Vertical distance each child travels (px) */
  distance?: number;
  /** Per-child animation duration (s) */
  duration?: number;
}) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: distance },
            visible: { opacity: 1, y: 0, transition: { duration, ease: [0.25, 0.46, 0.45, 0.94] } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default RevealStagger;
