/**
 * SectionCard — single source of truth for the answer-section chrome
 * across the Capra panels (system design, coding, behavioral).
 *
 * Header uses the cam-hero-strip background + gold-leaf bottom border
 * pattern (same as the Cloud Architecture toolbar and the Lumora design
 * Input Tab Header at DesignLayout.tsx:695). Body is a plain card.
 *
 * Use this for every section heading inside the answer surfaces so the
 * pages read as one consistent surface instead of dozens of differently-
 * styled `<h4>` blocks.
 *
 * Props:
 *   - title:    string heading shown in the strip (uppercase by default)
 *   - count:    optional number/string rendered as a glassy pill next to title
 *   - accent:   optional CSS color for a left vertical accent bar
 *   - actions:  optional right-aligned ReactNode (toggle pills, buttons)
 *   - bodyClassName / className: passthroughs for layout overrides
 */
export default function SectionCard({
  title,
  count,
  accent,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4',
}) {
  return (
    <div
      className={`rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm overflow-hidden ${className}`}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: 'var(--cam-hero-strip)',
          borderBottom: '2px solid var(--cam-gold-leaf)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {accent && (
            <span
              className="w-1 h-3.5 rounded-full flex-shrink-0"
              style={{ background: accent }}
            />
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white whitespace-nowrap">
            {title}
          </span>
          {count !== undefined && count !== null && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 999,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {count}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
