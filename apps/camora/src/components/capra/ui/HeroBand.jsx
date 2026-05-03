/**
 * HeroBand — top-of-page hero strip used across Capra surfaces.
 *
 * Renders the canonical Camora navy gradient (`var(--cam-hero-strip)`)
 * with a 2px gold-leaf bottom border (`var(--cam-gold-leaf)`). Same
 * grammar as SectionCard's header, scaled up for page-level heroes.
 *
 * Supports an optional eyebrow chip (e.g. "A · Apply"), a title with
 * gold-leaf accent on a chosen word, a subtitle, and a right-aligned
 * actions slot (typically a CTA button).
 *
 * Props:
 *   eyebrow:       optional small uppercase chip above the title
 *   title:         main heading (the WHOLE title — pass JSX with
 *                  highlightWord wrapped if you want gold-leaf accent)
 *   subtitle:      optional paragraph text under title
 *   actions:       optional right-aligned ReactNode (CTA, status pill)
 *   maxWidth:      Tailwind max-width class (default: 'lg:max-w-[85%]')
 *   padding:       'normal' (32px) or 'compact' (20px) vertical padding
 */
export default function HeroBand({
  eyebrow,
  title,
  subtitle,
  actions,
  maxWidth = 'lg:max-w-[85%]',
  padding = 'normal',
  className = '',
}) {
  const py = padding === 'compact' ? 'py-5' : 'py-8';
  return (
    <div
      className={className}
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}
    >
      <div className={`w-full ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 ${py}`}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            {eyebrow && (
              <div
                className="inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--cam-gold-leaf-lt)',
                    boxShadow: '0 0 8px rgba(217,181,67,0.55)',
                  }}
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
                  {eyebrow}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-white tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-sm sm:text-[15px] max-w-2xl"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="hidden sm:flex items-center gap-3 flex-shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Small wrapper for the gold-leaf accented word inside a HeroBand title.
 * Usage: <HeroBand title={<>Find your <HeroAccent>next role</HeroAccent></>} />
 */
export function HeroAccent({ children }) {
  return (
    <span
      style={{
        color: 'var(--cam-gold-leaf-lt)',
        textShadow: '0 0 16px rgba(217,181,67,0.45)',
      }}
    >
      {children}
    </span>
  );
}
