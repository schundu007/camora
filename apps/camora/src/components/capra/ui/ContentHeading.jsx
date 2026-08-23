/**
 * ContentHeading — compact navy-strip + gold-leaf-border + glassy-pill
 * heading for inline content section labels inside a topic body.
 *
 * Smaller sibling of SectionHero. Use for the dozens of "Overview",
 * "Key Concepts", "Common Mistakes", "Practice Problems" mid-content
 * dividers per topic detail page so every level of the surface reads
 * with the same chrome grammar.
 *
 * Props:
 *   title:    heading text (required)
 *   pills:    optional array of pill strings/numbers/ReactNodes — rendered
 *             right of the title as glassy capsules
 *   accent:   optional CSS color for a left vertical accent bar
 *   actions:  optional right-aligned ReactNode (buttons, links)
 *   children: free-form right-aligned ReactNode if `pills`/`actions` aren't
 *             enough (rare — most headings only need pills)
 *   className: passthrough for the wrapping strip
 */
export default function ContentHeading({
  title,
  pills,
  accent,
  actions,
  children,
  eyebrow,
  className = '',
}) {
    return (
    <div
      className={`content-heading mb-6 px-4 py-2.5 rounded-md flex items-center gap-2.5 ${className}`}
    >
      {accent && (
        <span
          className="w-1 h-4 rounded-full flex-shrink-0"
          style={{ background: accent }}
        />
      )}
      {eyebrow && (
        <span
          className="content-heading-eyebrow text-[12px] font-bold landing-mono tabular-nums tracking-[0.18em] px-2 py-0.5 rounded flex-shrink-0"
        >
          {eyebrow}
        </span>
      )}
      <h3 className="content-heading-title text-[15px] font-bold landing-display tracking-tight min-w-0 leading-snug">
        {title}
      </h3>
      {pills && pills.length > 0 && (
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {pills.map((p, i) => (
            <span
              key={i}
              className="text-[12px] font-semibold tracking-wider px-2 py-0.5"
              style={{
                background: 'var(--cam-strip-icon-bg)',
                border: '1px solid var(--cam-strip-icon-border)',
                borderRadius: 999,
                color: 'var(--cam-strip-text)',
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}
      {children && <div className="min-w-0 flex items-center gap-1.5">{children}</div>}
      {actions && <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">{actions}</div>}
    </div>
  );
}
