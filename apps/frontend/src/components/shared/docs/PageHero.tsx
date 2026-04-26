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

/**
 * Databricks-style hero — eyebrow label, large display heading, supporting
 * paragraph, optional CTAs, optional right-side visual. Generous vertical
 * whitespace; the heading itself does the heavy lifting visually.
 *
 * Sized for marketing/overview pages (`lg`) and internal section headers
 * (`md`). Stays single-column under 768px; splits 60/40 above.
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
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-[var(--page-max,1280px)] mx-auto">
        <div className={visual ? 'grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:gap-12 items-center' : ''}>
          <div>
            {eyebrow && (
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4"
                style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
              >
                {eyebrow}
              </p>
            )}
            <h1
              className={`font-bold tracking-tight ${titleSize} ${titleLeading}`}
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-5 text-base md:text-lg max-w-2xl"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
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
