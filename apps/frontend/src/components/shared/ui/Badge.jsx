import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

const badgeVariants = cva(
  ['inline-flex items-center justify-center gap-1', 'font-medium', 'rounded-full', 'transition-colors duration-150', 'whitespace-nowrap'],
  {
    variants: {
      variant: {
        default: ['bg-[var(--bg-elevated)] text-[var(--text-secondary)]'],
        primary: ['bg-[var(--accent-subtle)] text-[var(--accent-hover)]'],
        secondary: ['bg-[var(--bg-elevated)] text-[var(--text-secondary)]'],
        success: ['bg-[rgba(70,167,88,0.12)] text-[var(--success)]'],
        warning: ['bg-[rgba(255,197,61,0.12)] text-[var(--warning-text)]'],
        error: ['bg-[rgba(229,72,77,0.12)] text-[var(--danger)]'],
        info: ['bg-[var(--accent-subtle)] text-[var(--accent-hover)]'],
        outline: ['bg-transparent border border-[var(--border)] text-[var(--text-secondary)]'],
        'outline-primary': ['bg-transparent border border-[var(--accent)]/30 text-[var(--accent-hover)]'],
        'outline-success': ['bg-transparent border border-[var(--success)]/30 text-[var(--success)]'],
        'outline-warning': ['bg-transparent border border-[var(--warning)]/30 text-[var(--warning-text)]'],
        'outline-error': ['bg-transparent border border-[var(--danger)]/30 text-[var(--danger)]'],
        ghost: ['bg-transparent text-[var(--text-muted)]'],
      },
      size: {
        xs: 'h-4 px-1.5 text-xs',
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

const Badge = forwardRef(({ className, variant, size, dot = false, removable = false, onRemove, leftIcon, rightIcon, children, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props}>
    {dot && (
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        variant === 'success' && 'bg-[var(--success)]',
        variant === 'warning' && 'bg-[var(--warning)]',
        variant === 'error' && 'bg-[var(--danger)]',
        variant === 'info' && 'bg-[var(--accent)]',
        variant === 'primary' && 'bg-[var(--accent)]',
        (!variant || variant === 'default' || variant === 'secondary') && 'bg-[var(--text-muted)]',
      )} />
    )}
    {leftIcon && <span className="flex-shrink-0 -ml-0.5">{leftIcon}</span>}
    {children}
    {rightIcon && <span className="flex-shrink-0 -mr-0.5">{rightIcon}</span>}
    {removable && (
      <button
        type="button"
        onClick={onRemove}
        className={cn('flex-shrink-0 -mr-1 ml-0.5', 'w-3.5 h-3.5 rounded-full', 'inline-flex items-center justify-center', 'hover:bg-white/10', 'transition-colors duration-150', 'focus:outline-none')}
        aria-label="Remove"
      >
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </span>
));
Badge.displayName = 'Badge';

const BadgeGroup = forwardRef(({ className, children, max = 5, ...props }, ref) => {
  const badges = Array.isArray(children) ? children : [children];
  const visibleBadges = badges.slice(0, max);
  const remainingCount = badges.length - max;
  return (
    <div ref={ref} className={cn('flex flex-wrap items-center gap-1.5', className)} {...props}>
      {visibleBadges}
      {remainingCount > 0 && <Badge variant="secondary" size="sm">+{remainingCount}</Badge>}
    </div>
  );
});
BadgeGroup.displayName = 'BadgeGroup';

const StatusBadge = forwardRef(({ className, status = 'default', children, ...props }, ref) => {
  const statusVariantMap = { active: 'success', success: 'success', online: 'success', pending: 'warning', warning: 'warning', away: 'warning', error: 'error', danger: 'error', offline: 'error', inactive: 'default', default: 'default', info: 'info' };
  const variant = statusVariantMap[status] || 'default';
  return <Badge ref={ref} variant={variant} dot className={className} {...props}>{children}</Badge>;
});
StatusBadge.displayName = 'StatusBadge';

const CountBadge = forwardRef(({ className, count = 0, max = 99, showZero = false, variant = 'error', size = 'xs', ...props }, ref) => {
  if (count === 0 && !showZero) return null;
  const displayCount = count > max ? `${max}+` : count;
  return <Badge ref={ref} variant={variant} size={size} className={cn('min-w-[1rem] justify-center', className)} {...props}>{displayCount}</Badge>;
});
CountBadge.displayName = 'CountBadge';

export { Badge, BadgeGroup, StatusBadge, CountBadge, badgeVariants };
export default Badge;
