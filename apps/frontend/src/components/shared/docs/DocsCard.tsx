import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const NAVY = '#26619C';
const GOLD = '#C9A227';

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
 * LC-inspired card: navy-tinted paper background, hexagon eyebrow, gold→navy
 * gradient on hover, subtle lift transform. No grey walls.
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

  const baseClass =
    `block rounded-xl ${padding} transition-all ` +
    `${interactive ? 'cursor-pointer hover:scale-[1.01]' : ''} ` +
    className;

  const baseStyle = {
    background: `linear-gradient(180deg, ${NAVY}08 0%, ${NAVY}03 100%)`,
    border: `1px solid ${NAVY}30`,
    boxShadow: `0 1px 0 ${NAVY}10`,
  } as const;

  const hoverStyle = interactive
    ? ({
        ['--card-hover-border' as any]: `${GOLD}60`,
      } as const)
    : {};

  const inner = (
    <>
      {eyebrow && (
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="block flex-shrink-0"
            style={{
              width: 8,
              height: 8,
              background: GOLD,
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
          />
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
            {eyebrow}
          </div>
        </div>
      )}
      {title && (
        <div className="text-[15.5px] font-bold mb-1.5 leading-snug" style={{ color: NAVY }}>
          {title}
        </div>
      )}
      <div className="text-[14px] leading-[1.65]" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>
      {interactive && (
        <div className="mt-3 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>
          <span>Read more</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h6M6 3l3 3-3 3" />
          </svg>
        </div>
      )}
    </>
  );

  const combinedStyle = { ...baseStyle, ...hoverStyle };

  if (to) {
    return (
      <Link to={to} className={baseClass} style={combinedStyle}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass} style={combinedStyle}>
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} text-left w-full`} style={combinedStyle}>
        {inner}
      </button>
    );
  }
  return <div className={baseClass} style={combinedStyle}>{inner}</div>;
}

/**
 * Grid wrapper for DocsCard — responsive 1/2/3-column layout with tight gutters.
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
