import { forwardRef, type ReactNode, type ElementType, type HTMLAttributes, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

/* ══════════════════════════════════════════════════════════════
   MARKETING PRIMITIVES
   Composable building blocks for the public/marketing surface.
   No inline styles, no broken cva dependency — just Tailwind +
   the design tokens already declared in globals.css.
   ══════════════════════════════════════════════════════════════ */

/* ── Container — caps width, gutters at every breakpoint ───── */
type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'prose';
};
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'lg', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mx-auto w-full px-5 sm:px-6 lg:px-8',
        size === 'sm' && 'max-w-3xl',
        size === 'md' && 'max-w-5xl',
        size === 'lg' && 'max-w-6xl',
        size === 'xl' && 'max-w-7xl',
        size === 'prose' && 'max-w-2xl',
        className,
      )}
      {...props}
    />
  ),
);
Container.displayName = 'Container';

/* ── Section — vertical rhythm + tone surfaces ─────────────── */
type SectionProps = HTMLAttributes<HTMLElement> & {
  tone?: 'surface' | 'muted' | 'ink';
  spacing?: 'sm' | 'md' | 'lg';
  as?: ElementType;
};
export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, tone = 'surface', spacing = 'lg', as, ...props }, ref) => {
    const Tag = (as || 'section') as ElementType;
    return (
      <Tag
        ref={ref as never}
        className={cn(
          'relative w-full',
          spacing === 'sm' && 'py-12 md:py-16',
          spacing === 'md' && 'py-16 md:py-20',
          spacing === 'lg' && 'py-20 md:py-28',
          tone === 'surface' && 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
          tone === 'muted' && 'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
          tone === 'ink' && 'bg-[var(--cam-void)] text-white',
          className,
        )}
        {...props}
      />
    );
  },
);
Section.displayName = 'Section';

/* ── Eyebrow — tiny uppercase mono label above a heading ───── */
type EyebrowProps = HTMLAttributes<HTMLSpanElement> & { tone?: 'muted' | 'accent' | 'inverse' };
export function Eyebrow({ className, tone = 'muted', ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        'font-mono text-[12px] font-bold uppercase tracking-[0.22em]',
        tone === 'muted' && 'text-[var(--text-muted)]',
        tone === 'accent' && 'text-[var(--cam-primary)]',
        tone === 'inverse' && 'text-white/60',
        className,
      )}
      {...props}
    />
  );
}

/* ── SectionHeading — eyebrow + display heading + lead copy ── */
type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'left' | 'center';
  inverse?: boolean;
  className?: string;
};
export function SectionHeading({ eyebrow, title, lead, align = 'left', inverse = false, className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 max-w-2xl',
        align === 'center' && 'mx-auto text-center items-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={inverse ? 'inverse' : 'muted'}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          'font-display text-3xl md:text-4xl lg:text-[44px] font-semibold tracking-tight leading-[1.08]',
          inverse ? 'text-white' : 'text-[var(--text-primary)]',
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            'text-lg md:text-xl leading-relaxed max-w-2xl',
            inverse ? 'text-white/72' : 'text-[var(--text-secondary)]',
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

/* ── CTAButton — single source of truth for marketing CTAs ──
   Renders as React Router <Link>, plain <a>, or <button> based
   on the props passed. Variants chosen to match enterprise SaaS:
     primary  — solid lapis on light, gold on ink
     secondary — outlined, theme-aware
     ghost    — flat link with arrow
*/
type CTAVariant = 'primary' | 'secondary' | 'ghost' | 'inverse-primary' | 'inverse-secondary';
type CTASize = 'md' | 'lg';
type CTACommon = {
  variant?: CTAVariant;
  size?: CTASize;
  trailingArrow?: boolean;
  children: ReactNode;
  className?: string;
};
type CTAAsLink = CTACommon & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'className'>;
type CTAAsAnchor = CTACommon & { href: string; to?: undefined } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'className'>;
type CTAAsButton = CTACommon & { to?: undefined; href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;
type CTAProps = CTAAsLink | CTAAsAnchor | CTAAsButton;

const ctaBase =
  'group inline-flex items-center justify-center gap-2 font-semibold tracking-tight rounded-full transition-[transform,background-color,border-color,box-shadow,color] duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cam-primary)] focus-visible:ring-offset-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed';

const ctaSize = {
  md: 'h-10 px-5 text-[13px]',
  lg: 'h-12 px-7 text-[14px]',
} as const;

const ctaVariant = {
  primary:
    'bg-[var(--cam-primary)] text-white shadow-[0_4px_14px_-4px_rgba(30,77,120,0.45)] hover:bg-[var(--cam-primary-dk)] hover:shadow-[0_8px_22px_-6px_rgba(30,77,120,0.55)]',
  secondary:
    'bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--cam-primary)] hover:text-[var(--cam-primary)]',
  ghost:
    'bg-transparent text-[var(--cam-primary)] hover:text-[var(--cam-primary-dk)] px-2',
  'inverse-primary':
    'bg-white text-[var(--cam-primary-dk)] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.45)] hover:bg-[var(--cam-gold-leaf)] hover:text-[var(--cam-primary-dk)]',
  'inverse-secondary':
    'bg-transparent text-white border border-white/30 hover:border-white/60 hover:bg-white/10',
} as const;

export function CTAButton(props: CTAProps) {
  const { variant = 'primary', size = 'md', trailingArrow = false, children, className } = props;
  const cls = cn(ctaBase, ctaSize[size], ctaVariant[variant], className);
  const inner = (
    <>
      {children}
      {trailingArrow && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="13 6 19 12 13 18" />
        </svg>
      )}
    </>
  );

  if ('to' in props && props.to !== undefined) {
    const { to, variant: _v, size: _s, trailingArrow: _t, children: _c, className: _cn, ...rest } = props;
    void _v; void _s; void _t; void _c; void _cn;
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  if ('href' in props && props.href !== undefined) {
    const { href, variant: _v, size: _s, trailingArrow: _t, children: _c, className: _cn, ...rest } = props;
    void _v; void _s; void _t; void _c; void _cn;
    return (
      <a href={href} className={cls} {...rest}>
        {inner}
      </a>
    );
  }
  const { variant: _v, size: _s, trailingArrow: _t, children: _c, className: _cn, ...rest } = props as CTAAsButton;
  void _v; void _s; void _t; void _c; void _cn;
  return (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  );
}

/* ── SurfaceCard — neutral card with optional hover lift ───── */
type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};
export const SurfaceCard = forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, interactive = false, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-[0_1px_2px_rgba(11,13,17,0.04),0_8px_24px_-12px_rgba(11,13,17,0.08)]',
        interactive && 'transition-[transform,border-color,box-shadow] duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-[0_4px_8px_rgba(11,13,17,0.06),0_16px_32px_-12px_rgba(11,13,17,0.16)]',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-6',
        padding === 'lg' && 'p-8',
        className,
      )}
      {...props}
    />
  ),
);
SurfaceCard.displayName = 'SurfaceCard';

/* ── Pill — subtle status / category chip ──────────────────── */
type PillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'gold' | 'success' | 'inverse';
  withDot?: boolean;
};
export function Pill({ className, tone = 'neutral', withDot = false, children, ...props }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-mono text-[12px] font-bold uppercase tracking-[0.18em] px-2.5 py-1',
        tone === 'neutral' && 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]',
        tone === 'accent' && 'bg-[var(--accent-subtle)] text-[var(--cam-primary-dk)] border border-[var(--cam-primary)]/20',
        tone === 'gold' && 'bg-[rgba(255,153,0,0.12)] text-[var(--cam-gold-leaf-text)] border border-[var(--cam-gold-leaf)]/30',
        tone === 'success' && 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/25',
        tone === 'inverse' && 'bg-white/8 text-white/80 border border-white/15',
        className,
      )}
      {...props}
    >
      {withDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'accent' && 'bg-[var(--cam-primary)]',
            tone === 'gold' && 'bg-[var(--cam-gold-leaf)]',
            tone === 'success' && 'bg-[var(--success)]',
            tone === 'inverse' && 'bg-[var(--cam-gold-leaf-lt)]',
            tone === 'neutral' && 'bg-[var(--text-muted)]',
          )}
        />
      )}
      {children}
    </span>
  );
}
