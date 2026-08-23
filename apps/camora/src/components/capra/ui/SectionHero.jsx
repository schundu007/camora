/**
 * SectionHero — mid-page section heading with navy-strip chrome.
 *
 * Same grammar as HeroBand (navy gradient + gold-leaf bottom border +
 * glassy pill eyebrow) but contained, rounded, and sized for inline
 * use between content sections — i.e. the "Low Level Design" /
 * "Distributed System Patterns" page-level dividers.
 *
 * Use this anywhere the previous pattern was an eyebrow + <h2> + subtitle
 * stacked on plain background.
 *
 * Props:
 *   eyebrow:   small uppercase chip above the title (renders as glassy pill)
 *   title:     main heading
 *   subtitle:  optional paragraph text under title
 *   actions:   optional right-aligned ReactNode
 *   className: passthrough
 */
export default function SectionHero({
  eyebrow,
  title,
  subtitle,
  actions = null,
  className = '',
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}
    >
      <div className="px-5 py-4 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <div
              className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-full"
              style={{
                background: 'var(--cam-strip-icon-bg)',
                border: '1px solid var(--cam-strip-icon-border)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--cam-gold-leaf-lt)',
                  boxShadow: '0 0 8px rgba(217,181,67,0.55)',
                }}
              />
              <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--cam-strip-text)' }}>
                {eyebrow}
              </span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight" style={{ color: 'var(--cam-strip-heading)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm mt-1.5" style={{ color: 'var(--cam-strip-text)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
