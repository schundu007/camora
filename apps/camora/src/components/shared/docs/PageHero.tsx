import type { ReactNode } from 'react';

export interface PageHeroProps {
  /** Small uppercase label above the heading (e.g. "PREPARE", "PRICING") */
  eyebrow?: string;
  /** Large display heading */
  title: ReactNode;
  /** One- or two-line supporting paragraph */
  subtitle?: ReactNode;
  /** Optional primary + secondary action area (rendered right of subtitle on desktop) */
  actions?: ReactNode;
  /** Right-side slot for a hero image / illustration / animation */
  visual?: ReactNode;
  /** Tighter vertical rhythm (smaller pad) when used as an internal-page header. */
  size?: 'lg' | 'md';
  className?: string;
}

const NAVY = '#26619C';
const GOLD = '#C9A227';

/**
 * LC-inspired hero — gold→navy gradient accent rail on the left, gold eyebrow
 * with hexagon glyph, navy/gold gradient paper backdrop. Matches the prepkit
 * hero treatment so the whole product reads as one design system.
 */
export default function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  visual,
  size = 'lg',
  className = '',
}: PageHeroProps) {
  const padY = size === 'lg' ? 'py-16 md:py-24' : 'py-10 md:py-14';
  const titleSize =
    size === 'lg'
      ? 'text-4xl md:text-6xl lg:text-7xl'
      : 'text-3xl md:text-4xl lg:text-5xl';
  const titleLeading = size === 'lg' ? 'leading-[1.05]' : 'leading-[1.1]';

  return (
    <section
      className={`relative ${padY} px-6 md:px-10 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${NAVY}10 0%, ${GOLD}08 100%), var(--bg-surface)`,
        borderBottom: `1px solid ${NAVY}30`,
      }}
    >
      {/* Left accent rail — gold→navy */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: `linear-gradient(180deg, ${GOLD} 0%, ${NAVY} 100%)` }}
      />
      <div className="max-w-[var(--page-max,1280px)] mx-auto">
        <div className={visual ? 'grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:gap-12 items-center' : ''}>
          <div>
            {eyebrow && (
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="block flex-shrink-0"
                  style={{
                    width: 10,
                    height: 10,
                    background: GOLD,
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                  }}
                />
                <p
                  className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
                  style={{ color: GOLD, fontFamily: 'var(--font-mono)' }}
                >
                  {eyebrow}
                </p>
              </div>
            )}
            <h1
              className={`font-extrabold tracking-tight ${titleSize} ${titleLeading}`}
              style={{ color: NAVY, fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-5 text-base md:text-lg max-w-2xl"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
              >
                {subtitle}
              </p>
            )}
            {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
          {visual && (
            <div className="relative w-full">
              {visual}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
