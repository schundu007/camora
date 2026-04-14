import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

/**
 * Card Component - Enterprise-grade card with variants
 */

const cardVariants = cva(
  [
    'rounded-xl',
    'transition-all duration-200',
    'overflow-hidden',
  ],
  {
    variants: {
      variant: {
        default: ['bg-[var(--bg-surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]'],
        elevated: ['bg-[var(--bg-surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]', 'hover:border-[var(--border-hover)]'],
        outlined: ['bg-transparent border border-[var(--border)]'],
        filled: ['bg-[var(--bg-elevated)]'],
        glass: ['bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--border)]'],
        interactive: ['bg-[var(--bg-surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]', 'hover:border-[var(--border-hover)]', 'hover:-translate-y-0.5', 'cursor-pointer'],
        ghost: ['bg-transparent border-0'],
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  }
);

const Card = forwardRef(({ className, variant, padding, children, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props}>{children}</div>
));
Card.displayName = 'Card';

const CardHeader = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-1.5 p-4 pb-0', className)} {...props}>{children}</div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className, children, as: Component = 'h3', ...props }, ref) => (
  <Component ref={ref} className={cn('text-lg font-semibold text-[var(--text-primary)] leading-tight', className)} {...props}>{children}</Component>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-[var(--text-secondary)]', className)} {...props}>{children}</p>
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('p-4', className)} {...props}>{children}</div>
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-2 p-4 pt-0', className)} {...props}>{children}</div>
));
CardFooter.displayName = 'CardFooter';

const CardDivider = forwardRef(({ className, ...props }, ref) => (
  <hr ref={ref} className={cn('border-0 border-t border-[var(--border)]', className)} {...props} />
));
CardDivider.displayName = 'CardDivider';

const CardImage = forwardRef(({ className, src, alt, aspectRatio = '16/9', ...props }, ref) => (
  <div ref={ref} className={cn('relative overflow-hidden', className)} style={{ aspectRatio }} {...props}>
    <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
  </div>
));
CardImage.displayName = 'CardImage';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardDivider, CardImage, cardVariants };
export default Card;
