import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

const spinnerVariants = cva(
  'animate-spin',
  {
    variants: {
      size: { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' },
      color: { default: 'text-gray-500', primary: 'text-brand-400', white: 'text-gray-900', current: 'text-current' },
    },
    defaultVariants: { size: 'md', color: 'default' },
  }
);

const Spinner = forwardRef(({ className, size, color, ...props }, ref) => (
  <svg ref={ref} className={cn(spinnerVariants({ size, color }), className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
));
Spinner.displayName = 'Spinner';

const DotsLoader = forwardRef(({ className, size = 'md', color = 'default', ...props }, ref) => {
  const sizeClasses = { xs: 'gap-0.5', sm: 'gap-1', md: 'gap-1.5', lg: 'gap-2', xl: 'gap-2.5' };
  const dotSizeClasses = { xs: 'w-1 h-1', sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5', xl: 'w-3 h-3' };
  const colorClasses = { default: 'bg-gray-300', primary: 'bg-brand-400', white: 'bg-white', current: 'bg-current' };
  return (
    <div ref={ref} className={cn('flex items-center', sizeClasses[size], className)} {...props}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn('rounded-full animate-pulse', dotSizeClasses[size], colorClasses[color])} style={{ animationDelay: `${i * 150}ms`, animationDuration: '600ms' }} />
      ))}
    </div>
  );
});
DotsLoader.displayName = 'DotsLoader';

const PulseLoader = forwardRef(({ className, size = 'md', color = 'primary', ...props }, ref) => {
  const sizeClasses = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  const colorClasses = { default: 'bg-gray-300', primary: 'bg-brand-400', white: 'bg-white' };
  return (
    <div ref={ref} className={cn('relative flex items-center justify-center', sizeClasses[size], className)} {...props}>
      <span className={cn('absolute rounded-full animate-ping opacity-75', sizeClasses[size], colorClasses[color])} />
      <span className={cn('relative rounded-full w-3/4 h-3/4', colorClasses[color])} />
    </div>
  );
});
PulseLoader.displayName = 'PulseLoader';

const Skeleton = forwardRef(({ className, variant = 'text', lines = 1, width, height, circle = false, ...props }, ref) => {
  const variantClasses = { text: 'h-4 rounded', title: 'h-6 rounded', avatar: 'w-10 h-10 rounded-full', thumbnail: 'w-16 h-16 rounded-lg', card: 'w-full h-32 rounded-lg', button: 'h-9 w-24 rounded-lg' };
  if (lines > 1) {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={cn('animate-pulse bg-gray-200 rounded', 'h-4', i === lines - 1 && 'w-3/4')} />
        ))}
      </div>
    );
  }
  return <div ref={ref} className={cn('animate-pulse bg-gray-200', circle && 'rounded-full', variantClasses[variant], className)} style={{ width, height }} {...props} />;
});
Skeleton.displayName = 'Skeleton';

const LoadingOverlay = forwardRef(({ className, children, loading = true, spinnerSize = 'lg', blur = true, text, ...props }, ref) => (
  <div ref={ref} className={cn('relative', className)} {...props}>
    {children}
    {loading && (
      <div className={cn('absolute inset-0 flex flex-col items-center justify-center gap-3', 'bg-gray-100/80', blur && 'backdrop-blur-sm', 'z-50')}>
        <Spinner size={spinnerSize} color="primary" />
        {text && <p className="text-sm font-medium text-gray-600">{text}</p>}
      </div>
    )}
  </div>
));
LoadingOverlay.displayName = 'LoadingOverlay';

const Progress = forwardRef(({ className, value = 0, max = 100, indeterminate = false, size = 'md', color = 'primary', showValue = false, ...props }, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const sizeClasses = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3', xl: 'h-4' };
  const colorClasses = { primary: 'bg-brand-500', success: 'bg-success-500', warning: 'bg-warning-500', error: 'bg-error-500', info: 'bg-info-500' };
  return (
    <div className={cn('w-full', className)}>
      <div ref={ref} role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={max} className={cn('w-full overflow-hidden rounded-full', 'bg-gray-200', sizeClasses[size])} {...props}>
        <div className={cn('h-full rounded-full transition-all duration-300 ease-out', colorClasses[color], indeterminate && 'animate-[progress-indeterminate_1.5s_ease-in-out_infinite] w-1/3')} style={indeterminate ? undefined : { width: `${percentage}%` }} />
      </div>
      {showValue && !indeterminate && <p className="mt-1 text-xs text-gray-600 text-right">{Math.round(percentage)}%</p>}
    </div>
  );
});
Progress.displayName = 'Progress';

export { Spinner, DotsLoader, PulseLoader, Skeleton, LoadingOverlay, Progress, spinnerVariants };
export default Spinner;
