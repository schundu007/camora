import type { ReactNode } from 'react';

/** The card shell already used throughout PythonLearnPage, extracted so the
 *  new cards stop repeating twelve lines of inline style each. */
export default function SurfaceCard({
  label,
  accent = 'var(--cam-primary)',
  children,
}: { label: string; accent?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div
        className="px-6 py-3"
        style={{
          background: `color-mix(in oklab, ${accent} 8%, var(--bg-surface))`,
          borderBottom: `1px solid color-mix(in oklab, ${accent} 20%, var(--border))`,
        }}
      >
        <span className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
