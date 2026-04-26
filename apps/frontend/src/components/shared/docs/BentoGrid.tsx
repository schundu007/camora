import type { ReactNode } from 'react';

export type BentoSize = 'sm' | 'md' | 'lg' | 'wide' | 'tall';

export interface BentoCellProps {
  /** Visual size — controls grid-column / grid-row spans on desktop */
  size?: BentoSize;
  /** Small uppercase label above the title (e.g. "DSA", "PREPARE") */
  eyebrow?: string;
  /** Card title */
  title: ReactNode;
  /** Body / description */
  description?: ReactNode;
  /** Optional rich content slot below description (lists, mini stats, etc.) */
  children?: ReactNode;
  /** Optional footer slot (CTA, link) */
  footer?: ReactNode;
  /** Wrap the entire cell in a link if provided */
  href?: string;
  /** Click handler for non-link cells */
  onClick?: () => void;
  className?: string;
}

/**
 * Databricks/Stripe-style mixed-size grid card. Pair with <BentoGrid>.
 * Sizes:
 *   sm   1×1
 *   md   1×1 (alias of sm with denser typography)
 *   lg   2×1 (spans two columns)
 *   wide 2×1 (alias of lg)
 *   tall 1×2 (spans two rows)
 */
export function BentoCell({
  size = 'sm',
  eyebrow,
  title,
  description,
  children,
  footer,
  href,
  onClick,
  className = '',
}: BentoCellProps) {
  const span =
    size === 'lg' || size === 'wide'
      ? 'md:col-span-2'
      : size === 'tall'
      ? 'md:row-span-2'
      : '';
  const minH =
    size === 'tall' ? 'min-h-[280px] md:min-h-[400px]' :
    size === 'lg' || size === 'wide' ? 'min-h-[180px]' :
    'min-h-[160px]';

  const Wrapper: React.ElementType = href ? 'a' : (onClick ? 'button' : 'div');
  const wrapperProps = href ? { href } : (onClick ? { onClick, type: 'button' as const } : {});

  return (
    <Wrapper
      {...wrapperProps}
      className={`card-lift relative ${span} ${minH} flex flex-col text-left rounded-xl p-5 md:p-6 ${className}`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        cursor: href || onClick ? 'pointer' : 'default',
      }}
    >
      {eyebrow && (
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
        >
          {eyebrow}
        </p>
      )}
      <h3
        className="text-xl md:text-2xl font-bold tracking-tight mb-2"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {children && <div className="flex-1">{children}</div>}
      {footer && <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>{footer}</div>}
    </Wrapper>
  );
}

export interface BentoGridProps {
  children: ReactNode;
  /** Number of columns on desktop (default 3). Cells with size="lg"/"wide" span 2. */
  cols?: 2 | 3 | 4;
  className?: string;
}

/**
 * Bento grid container. Cells flow auto-fill across the column count
 * specified, with size="lg" / "tall" cells claiming extra cells.
 */
export default function BentoGrid({ children, cols = 3, className = '' }: BentoGridProps) {
  const gridCols =
    cols === 2 ? 'md:grid-cols-2' :
    cols === 3 ? 'md:grid-cols-3' :
    'md:grid-cols-4';

  return (
    <div
      className={`grid grid-cols-1 ${gridCols} gap-4 md:gap-5 ${className}`}
      style={{ gridAutoFlow: 'dense' }}
    >
      {children}
    </div>
  );
}
