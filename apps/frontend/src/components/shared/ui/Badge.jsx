import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

const badgeVariants = cva(
  ['inline-flex items-center justify-center gap-1', 'font-medium', 'rounded-full', 'transition-colors duration-150', 'whitespace-nowrap'],
  {
    variants: {
      variant: {
        default: ['bg-gray-200 text-gray-900'],
        primary: ['bg-brand-400/10 text-brand-400'],
        secondary: ['bg-gray-200 text-gray-800'],
        success: ['bg-success-500/10 text-success-400'],
        warning: ['bg-warning-500/10 text-warning-400'],
        error: ['bg-error-500/10 text-error-400'],
        info: ['bg-info-500/10 text-info-400'],
        outline: ['bg-transparent border border-gray-200 text-gray-900'],
        'outline-primary': ['bg-transparent border border-brand-400/30 text-brand-400'],
        'outline-success': ['bg-transparent border border-success-500/30 text-success-400'],
        'outline-warning': ['bg-transparent border border-warning-500/30 text-warning-400'],
        'outline-error': ['bg-transparent border border-error-500/30 text-error-400'],
        ghost: ['bg-transparent text-gray-600'],
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
        variant === 'success' && 'bg-success-500',
        variant === 'warning' && 'bg-warning-500',
        variant === 'error' && 'bg-error-500',
        variant === 'info' && 'bg-info-500',
        variant === 'primary' && 'bg-brand-500',
        (!variant || variant === 'default' || variant === 'secondary') && 'bg-gray-300',
      )} />
    )}
    {leftIcon && <span className="flex-shrink-0 -ml-0.5">{leftIcon}</span>}
    {children}
    {rightIcon && <span className="flex-shrink-0 -mr-0.5">{rightIcon}</span>}
    {removable && (
      <button
        type="button"
        onClick={onRemove}
        className={cn('flex-shrink-0 -mr-1 ml-0.5', 'w-3.5 h-3.5 rounded-full', 'inline-flex items-center justify-center', 'hover:bg-black/10 dark:hover:bg-white/10', 'transition-colors duration-150', 'focus:outline-none')}
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
