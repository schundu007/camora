/* ── HexBadge ─────────────────────────────────────────────────────────
   LeetCode-style hexagonal icon badge. Pointy-top hex, optional inline
   icon or short label. Color families pull from existing Camora tokens
   only — no new palette. */
import type { ReactNode } from 'react';

export type HexColor =
  | 'navy'        // var(--cam-primary)
  | 'navy-lt'     // var(--cam-primary-lt)
  | 'navy-dk'     // var(--cam-primary-dk)
  | 'gold'        // var(--cam-gold-leaf)
  | 'red'         // var(--danger)
  | 'cream';      // var(--bg-elevated) — neutral

interface HexColorSpec {
  fill: string;
  ring: string;
  fg: string;
}

const COLOR_MAP: Record<HexColor, HexColorSpec> = {
  navy:    { fill: 'var(--cam-primary)',     ring: 'var(--cam-primary-dk)', fg: '#FFFFFF' },
  'navy-lt': { fill: 'var(--cam-primary-lt)', ring: 'var(--cam-primary)',    fg: '#FFFFFF' },
  'navy-dk': { fill: 'var(--cam-primary-dk)', ring: 'var(--cam-primary-900, #051C40)', fg: '#FFFFFF' },
  gold:    { fill: 'var(--cam-gold-leaf)',   ring: 'var(--cam-gold-leaf-dk)', fg: '#FFFFFF' },
  red:     { fill: 'var(--danger)',          ring: '#991B1B', fg: '#FFFFFF' },
  cream:   { fill: 'var(--bg-elevated)',     ring: 'var(--border)',         fg: 'var(--text-primary)' },
};

const HEX_PATH = 'M50 4 L94 28 L94 72 L50 96 L6 72 L6 28 Z';

export interface HexBadgeProps {
  color?: HexColor;
  size?: number;
  icon?: ReactNode;
  label?: string;
  className?: string;
  title?: string;
}

export function HexBadge({
  color = 'navy',
  size = 56,
  icon,
  label,
  className = '',
  title,
}: HexBadgeProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <path
          d={HEX_PATH}
          fill={c.fill}
          stroke={c.ring}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="relative flex items-center justify-center pointer-events-none"
        style={{ color: c.fg }}
      >
        {icon ? (
          icon
        ) : label ? (
          <span
            style={{
              fontSize: Math.round(size * 0.32),
              fontWeight: 800,
              fontFamily: 'var(--font-code, ui-monospace)',
              letterSpacing: '-0.02em',
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ── HexCluster ────────────────────────────────────────────────────────
   2–3 overlapping hex badges, LeetCode "section icon group" pattern. */
export interface HexClusterItem {
  color: HexColor;
  icon?: ReactNode;
  label?: string;
  title?: string;
}

export function HexCluster({
  items,
  size = 64,
  className = '',
}: {
  items: HexClusterItem[];
  size?: number;
  className?: string;
}) {
  // Overlap by ~28% of size — matches LeetCode's tight cluster.
  const overlap = Math.round(size * 0.28);
  return (
    <div className={`flex items-center ${className}`}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: items.length - i,
          }}
        >
          <HexBadge color={it.color} size={size} icon={it.icon} label={it.label} title={it.title} />
        </div>
      ))}
    </div>
  );
}
