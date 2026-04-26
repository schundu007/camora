/* ── Rough-style primitives for system-design diagrams ─────────────────
   Hand-drawn aesthetic à la Excalidraw, but rendered as static SVG paths
   so:
     - No DOM mutation (rough's normal SVG output draws into a real <svg>
       node; here we use the deterministic generator API and emit React).
     - Stroke / fill / text colors flow from CSS variables, so a theme
       flip is automatic — no React re-render needed.
     - Boxes have a guaranteed contrasting fill (var(--bg-surface)) so
       labels always sit on a real surface, not the page background.

   Public API matches the original primitives in DiagramSVG.jsx so all
   ~107 templates auto-upgrade by swapping the import.
   ────────────────────────────────────────────────────────────────────── */
import React, { useMemo } from 'react';
import rough from 'roughjs/bundled/rough.esm.js';

const generator = rough.generator();

// Single visual contract used by every shape — keeps the diagram looking
// coherent across templates and matches the editorial / "ink on paper"
// aesthetic of the rest of the design system.
const ROUGH_OPTIONS = {
  roughness: 1.4,           // 0 = ruler-straight, 2.5 = scribbled
  bowing: 1.5,              // how much lines curve as if drawn by hand
  strokeWidth: 1.4,
  // We override stroke + fill on the rendered <path> via currentColor /
  // CSS, so the generator can use any placeholder here.
  stroke: '#000',
  fill: 'none',
  fillStyle: 'solid',
  // Stable seed makes the same shape redraw identically on every render
  // (otherwise Strict Mode + key-collision would shuffle the wobble).
  seed: 1,
};

/** Convert one rough OpSet into an SVG <path d="…"> string. */
function opsToPath(ops: any[]): string {
  let d = '';
  for (const op of ops) {
    const p = op.data;
    switch (op.op) {
      case 'move':  d += `M${p[0]} ${p[1]} `; break;
      case 'lineTo': d += `L${p[0]} ${p[1]} `; break;
      case 'bcurveTo':
        d += `C${p[0]} ${p[1]} ${p[2]} ${p[3]} ${p[4]} ${p[5]} `;
        break;
      // qcurveTo / arc are not produced by the shapes we use here, so
      // we skip them — keep this small + dependency-free.
    }
  }
  return d.trim();
}

interface RoughBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color?: string;
  fontSize?: number;
  /** Per-shape seed — pass a stable value to keep the wobble identical
      across renders. Defaults to a hash of the position so different
      boxes look different even though each is internally stable. */
  seed?: number;
}

export function RoughBox({ x, y, width, height, label, color = 'var(--accent)', fontSize = 11, seed }: RoughBoxProps) {
  const s = seed ?? (Math.abs((x * 73 + y * 31 + width * 11 + height * 7) | 0) || 1);
  const drawable = useMemo(
    () => generator.rectangle(x, y, width, height, { ...ROUGH_OPTIONS, seed: s }),
    [x, y, width, height, s]
  );
  return (
    <g>
      {/* Solid surface fill — drawn first so the rough outline overlays it. */}
      <rect x={x} y={y} width={width} height={height} rx="6" fill="var(--bg-surface)" stroke="none" />
      {/* Rough outline — uses passed `color` so categories can still
          differentiate, but text sits on the guaranteed surface fill. */}
      {drawable.sets.map((set, i) => (
        <path
          key={i}
          d={opsToPath(set.ops)}
          fill="none"
          stroke={color}
          strokeWidth={ROUGH_OPTIONS.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <text
        x={x + width / 2}
        y={y + height / 2 + 5}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize={fontSize + 1}
        fontFamily="'Caveat','Patrick Hand','Comic Sans MS',system-ui,sans-serif"
        fontWeight="700"
      >
        {label}
      </text>
    </g>
  );
}

interface RoughDiamondProps {
  x: number;
  y: number;
  size: number;
  label: string;
  color?: string;
  seed?: number;
}

export function RoughDiamond({ x, y, size, label, color = 'var(--accent)', seed }: RoughDiamondProps) {
  const s = seed ?? (Math.abs((x * 53 + y * 19 + size * 13) | 0) || 1);
  const points: [number, number][] = [
    [x + size / 2, y],
    [x + size, y + size / 2],
    [x + size / 2, y + size],
    [x, y + size / 2],
  ];
  const drawable = useMemo(
    () => generator.polygon(points, { ...ROUGH_OPTIONS, seed: s }),
    [x, y, size, s] // points are derived; deps cover them
  );
  // Solid surface fill via plain SVG polygon so text sits on a real bg.
  const fillPoints = points.map(([px, py]) => `${px},${py}`).join(' ');
  return (
    <g>
      <polygon points={fillPoints} fill="var(--bg-surface)" stroke="none" />
      {drawable.sets.map((set, i) => (
        <path
          key={i}
          d={opsToPath(set.ops)}
          fill="none"
          stroke={color}
          strokeWidth={ROUGH_OPTIONS.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <text
        x={x + size / 2}
        y={y + size / 2 + 5}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="12"
        fontFamily="'Caveat','Patrick Hand','Comic Sans MS',system-ui,sans-serif"
        fontWeight="700"
      >
        {label}
      </text>
    </g>
  );
}

interface RoughArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  seed?: number;
}

export function RoughArrow({ x1, y1, x2, y2, color = 'var(--accent)', seed }: RoughArrowProps) {
  const s = seed ?? (Math.abs((x1 * 41 + y1 * 17 + x2 * 23 + y2 * 13) | 0) || 1);
  const drawable = useMemo(
    () => generator.line(x1, y1, x2, y2, { ...ROUGH_OPTIONS, seed: s, strokeWidth: 1.6 }),
    [x1, y1, x2, y2, s]
  );
  // Hand-drawn arrowhead — two short rough lines fanning back from the tip.
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  const headAngle = Math.PI / 7;
  const hx1 = x2 - headLen * Math.cos(angle - headAngle);
  const hy1 = y2 - headLen * Math.sin(angle - headAngle);
  const hx2 = x2 - headLen * Math.cos(angle + headAngle);
  const hy2 = y2 - headLen * Math.sin(angle + headAngle);
  const head1 = useMemo(
    () => generator.line(x2, y2, hx1, hy1, { ...ROUGH_OPTIONS, seed: s + 1, strokeWidth: 1.6 }),
    [x2, y2, hx1, hy1, s]
  );
  const head2 = useMemo(
    () => generator.line(x2, y2, hx2, hy2, { ...ROUGH_OPTIONS, seed: s + 2, strokeWidth: 1.6 }),
    [x2, y2, hx2, hy2, s]
  );
  return (
    <g>
      {[drawable, head1, head2].flatMap((d, gi) =>
        d.sets.map((set: any, i: number) => (
          <path
            key={`${gi}-${i}`}
            d={opsToPath(set.ops)}
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </g>
  );
}

interface RoughLabelProps {
  x: number;
  y: number;
  text: string;
  color?: string;
  fontSize?: number;
}

export function RoughLabel({ x, y, text, color = 'var(--text-secondary)', fontSize = 10 }: RoughLabelProps) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={fontSize}
      fontFamily="'Caveat','Patrick Hand','Comic Sans MS',system-ui,sans-serif"
      fontStyle="italic"
    >
      {text}
    </text>
  );
}
