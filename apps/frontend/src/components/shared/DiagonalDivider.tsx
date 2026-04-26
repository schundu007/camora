/* ── DiagonalDivider ──────────────────────────────────────────────────
   LeetCode-signature angled section transition. Sits absolutely at the
   top or bottom of a section and paints a triangular "bite" in the
   neighbouring section's color, visually carving the section edge into
   a diagonal.

   Place it INSIDE a `position: relative` parent (e.g. a <section>).

   `slope` controls the diagonal direction:
     - 'tl-to-br'  → line runs upper-left → lower-right of the wedge
     - 'tr-to-bl'  → line runs upper-right → lower-left of the wedge

   `position` controls which edge it carves:
     - 'bottom' (most common) → fill paints the lower triangle so the
       NEXT section appears to rise up into this one.
     - 'top' → fill paints the upper triangle so the PREVIOUS section
       appears to sag down into this one.

   `fill` is the neighbouring section's background color. */

export type Slope = 'tl-to-br' | 'tr-to-bl';

interface DiagonalDividerProps {
  fill: string;
  slope: Slope;
  position: 'top' | 'bottom';
  height?: string;
  className?: string;
}

export function DiagonalDivider({
  fill,
  slope,
  position,
  height = '7vh',
  className = '',
}: DiagonalDividerProps) {
  // viewBox: 0 0 100 100. Polygon points define the FILLED region.
  const points =
    position === 'bottom'
      ? slope === 'tl-to-br'
        ? '0,0 100,100 0,100'      // fills lower-left triangle
        : '100,0 100,100 0,100'    // fills lower-right triangle
      : slope === 'tl-to-br'
        ? '0,0 100,0 100,100'      // fills upper-right triangle
        : '0,0 100,0 0,100';       // fills upper-left triangle

  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      className={`absolute left-0 w-full pointer-events-none ${
        position === 'top' ? 'top-0' : 'bottom-0'
      } ${className}`}
      style={{ height, display: 'block', zIndex: 1 }}
    >
      <polygon fill={fill} points={points} />
    </svg>
  );
}
