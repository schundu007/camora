import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

/**
 * Button Component - Enterprise-grade button with variants
 *
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" size="sm" loading>Loading...</Button>
 * <Button variant="ghost" leftIcon={<Icon />}>With Icon</Button>
 */

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium text-sm',
    'rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--accent)] text-white',
          'hover:bg-[var(--accent-hover)]',
          'active:bg-[var(--accent)]',
        ],
        secondary: [
          'bg-transparent border border-[var(--border)] text-[var(--text-secondary)]',
          'hover:border-[var(--accent)] hover:text-[var(--accent)]',
          'active:border-[var(--accent)]',
        ],
        outline: [
          'bg-transparent border border-[var(--border)] text-[var(--text-secondary)]',
          'hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]',
          'active:bg-[var(--bg-elevated)]',
        ],
        ghost: [
          'bg-transparent text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
          'active:bg-[var(--bg-elevated)]',
        ],
        danger: [
          'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20',
          'hover:bg-[var(--danger)]/20',
          'active:bg-[var(--danger)]/30',
        ],
        success: [
          'bg-[var(--success)]/10 text-[var(--success)]',
          'hover:bg-[var(--success)]/20',
          'active:bg-[var(--success)]/30',
        ],
        link: [
          'bg-transparent text-[var(--accent)] underline-offset-4',
          'hover:underline hover:text-[var(--accent-hover)]',
          'p-0 h-auto',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs gap-1 touch:h-10 touch:px-3',
        sm: 'h-8 px-3 text-sm gap-1.5 touch:h-10',
        md: 'h-9 px-4 text-sm gap-2 touch:h-11',
        lg: 'h-10 px-5 text-base gap-2 touch:h-11',
        xl: 'h-12 px-6 text-base gap-2.5',
        icon: 'h-9 w-9 p-0 touch:h-11 touch:w-11',
        'icon-sm': 'h-8 w-8 p-0 touch:h-10 touch:w-10',
        'icon-lg': 'h-10 w-10 p-0 touch:h-11 touch:w-11',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const Button = forwardRef(({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  asChild = false,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="w-4 h-4" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// Spinner component for loading state
const Spinner = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Button Group component
const ButtonGroup = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex rounded-lg',
      '[&>button]:rounded-none',
      '[&>button:first-child]:rounded-l-lg',
      '[&>button:last-child]:rounded-r-lg',
      '[&>button:not(:first-child)]:-ml-px',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

ButtonGroup.displayName = 'ButtonGroup';

// Icon Button component
const IconButton = forwardRef(({
  className,
  variant = 'ghost',
  size = 'icon',
  'aria-label': ariaLabel,
  children,
  ...props
}, ref) => (
  <Button
    ref={ref}
    variant={variant}
    size={size}
    className={className}
    aria-label={ariaLabel}
    {...props}
  >
    {children}
  </Button>
));

IconButton.displayName = 'IconButton';

export { Button, ButtonGroup, IconButton, buttonVariants };
export default Button;
