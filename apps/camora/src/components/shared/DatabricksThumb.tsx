/* ── DatabricksThumb ──────────────────────────────────────────────────
   Bold gradient tile in the Databricks-marketing aesthetic — used as a
   prominent thumbnail next to category / mode / topic titles. Reads as
   one cohesive brand mood: navy radial gradient with a soft top-edge
   highlight orb and a 2:1 white glyph centered.

   Generalized from the inline PromptThumb on the Lumora attend home
   page so all surfaces (Lumora home, Prepare overview, Practice modes,
   future) share one primitive. Stays inside the existing Camora token
   palette — no new colors. */
import type { ReactNode, CSSProperties } from 'react';

export type DatabricksColor = 'navy' | 'navy-lt' | 'navy-dk' | 'gold' | 'red';

interface PaletteSpec {
  from: string; mid: string; to: string; shadow: string;
}

const PALETTE: Record<DatabricksColor, PaletteSpec> = {
  'navy':    { from: 'var(--cam-primary-lt)',  mid: 'var(--cam-primary)',     to: 'var(--cam-primary-dk)',         shadow: 'rgba(38,97,156,0.22)' },
  'navy-lt': { from: 'var(--cam-primary)',     mid: 'var(--cam-primary-lt)',  to: 'var(--cam-primary)',            shadow: 'rgba(60,122,171,0.20)' },
  'navy-dk': { from: 'var(--cam-primary)',     mid: 'var(--cam-primary-dk)',  to: 'var(--cam-primary-900,#051C40)', shadow: 'rgba(5,28,64,0.30)' },
  'gold':    { from: 'var(--cam-gold-leaf-lt)', mid: 'var(--cam-gold-leaf)',  to: 'var(--cam-gold-leaf-dk)',       shadow: 'rgba(168,136,23,0.25)' },
  'red':     { from: '#F87171',                mid: 'var(--danger)',          to: '#991B1B',                       shadow: 'rgba(239,68,68,0.25)' },
};

interface DatabricksThumbProps {
  color?: DatabricksColor;
  size?: number;
  icon: ReactNode;
  className?: string;
  title?: string;
  style?: CSSProperties;
}

export function DatabricksThumb({
  color = 'navy',
  size = 64,
  icon,
  className = '',
  title,
  style,
}: DatabricksThumbProps) {
  const palette = PALETTE[color];
  const orbSize = Math.round(size * 0.6);
  const orbOffset = Math.round(size * -0.15);
  const radius = Math.max(8, Math.round(size * 0.18));

  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-center justify-center ${className}`}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `radial-gradient(120% 120% at 0% 0%, ${palette.from} 0%, ${palette.mid} 55%, ${palette.to} 100%)`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px ${palette.shadow}`,
        ...style,
      }}
    >
      {/* Soft top-left orb — Databricks signature highlight */}
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          top: orbOffset,
          left: orbOffset,
          width: orbSize,
          height: orbSize,
          background:
            'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)',
        }}
      />
      <div className="relative" style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
    </div>
  );
}
