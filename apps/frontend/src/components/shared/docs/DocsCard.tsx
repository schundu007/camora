import { ReactNode, ElementType } from 'react';
import { Link } from 'react-router-dom';

export interface DocsCardProps {
  children: ReactNode;
  /** Optional title rendered above children. */
  title?: ReactNode;
  /** Optional eyebrow label above the title (uppercase, small). */
  eyebrow?: string;
  /** If set, the whole card becomes a clickable link. */
  to?: string;
  /** External href — renders as <a target="_blank">. */
  href?: string;
  /** onClick handler. Mutually exclusive with `to` / `href`. */
  onClick?: () => void;
  /** Pad and spacing density. Default "compact". */
  density?: 'compact' | 'roomy';
  className?: string;
}

/**
 * NVIDIA-style flat card: 1px border, no shadow, navy border-color shift on hover.
 * Replaces the heavier shadowed/gradient cards used previously.
 */
export default function DocsCard({
  children,
  title,
  eyebrow,
  to,
  href,
  onClick,
  density = 'compact',
  className = '',
}: DocsCardProps) {
  const interactive = Boolean(to || href || onClick);
  const padding = density === 'compact' ? 'p-4' : 'p-6';

  const base =
    `block bg-[var(--bg-surface)] border border-[var(--border)] rounded-md ${padding} ` +
    `transition-colors ${interactive ? 'hover:border-[var(--accent)] cursor-pointer' : ''} ` +
    className;

  const inner = (
    <>
      {eyebrow && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1.5">
          {eyebrow}
        </div>
      )}
      {title && (
        <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5 leading-snug">
          {title}
        </div>
      )}
      <div className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={base}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={base}
      >
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} text-left w-full`}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

/**
 * Grid wrapper for DocsCard — responsive 1/2/3-column layout with tight gutters
 * matching NVIDIA's compact card grids.
 */
export function DocsCardGrid({
  children,
  columns = 2,
  className = '',
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const cols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  return <div className={`grid ${cols[columns]} gap-3 ${className}`}>{children}</div>;
}
