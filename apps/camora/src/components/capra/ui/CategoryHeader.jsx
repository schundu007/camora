import { Icon } from '../../shared/Icons.jsx';

/**
 * CategoryHeader — navy-strip + gold-leaf-border + glassy-pill-capsule
 * sub-header used for grouping category cards inside a SectionHero block.
 *
 * Same chrome as SectionCard's header but inline with topic grids — pairs
 * with the page-level SectionHero so every nesting level reads as one
 * surface.
 *
 * Props:
 *   icon:       optional Icon name (rendered in glassy capsule on the left)
 *   title:      category name (uppercase / tracked for navy-strip vibe)
 *   count:      optional number (rendered as glassy pill capsule)
 *   countLabel: optional label after count (e.g., "problems", "patterns")
 *   progress:   optional { done, total } — renders a glass progress bar
 *               instead of a plain count
 *   actions:    optional right-aligned ReactNode
 *   className:  passthrough for the wrapping strip
 */
export default function CategoryHeader({
  icon,
  title,
  count,
  countLabel,
  progress,
  actions,
  className = '',
}) {
  return (
    <div
      className={`px-4 py-2 flex items-center gap-2.5 ${className}`}
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}
    >
      {icon && (
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <Icon name={icon} size={12} style={{ color: 'var(--cam-gold-leaf-lt)' }} />
        </div>
      )}
      <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-white whitespace-nowrap landing-display min-w-0 truncate">
        {title}
      </h3>
      {count !== undefined && count !== null && !progress && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {count}
          {countLabel ? ` ${countLabel}` : ''}
        </span>
      )}
      {progress && (
        <>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 999,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {progress.done}/{progress.total}
          </span>
          <div
            className="h-1.5 rounded-full overflow-hidden flex-1 max-w-[120px]"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <div
              className="h-full rounded-full transition-colors duration-500"
              style={{
                width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                background: 'var(--cam-gold-leaf-lt)',
              }}
            />
          </div>
        </>
      )}
      {actions && <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">{actions}</div>}
    </div>
  );
}
