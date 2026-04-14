import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

const inputVariants = cva(
  ['flex w-full', 'text-sm', 'transition-all duration-200', 'placeholder:text-[var(--text-muted)]', 'focus:outline-none', 'disabled:cursor-not-allowed disabled:opacity-50', 'file:border-0 file:bg-transparent file:text-sm file:font-medium'],
  {
    variants: {
      variant: {
        default: ['bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)]', 'hover:border-[var(--border-hover)]', 'focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'],
        filled: ['bg-[var(--bg-elevated)] border-2 border-transparent text-[var(--text-primary)]', 'hover:bg-[var(--bg-elevated)]', 'focus:border-[var(--accent)]'],
        ghost: ['bg-transparent border-0 text-[var(--text-primary)]', 'hover:bg-[var(--bg-elevated)]', 'focus:bg-[var(--bg-elevated)]'],
        underline: ['bg-transparent border-0 border-b-2 border-[var(--border)] rounded-none text-[var(--text-primary)]', 'hover:border-[var(--border-hover)]', 'focus:border-[var(--accent)]', 'px-0'],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-9 px-3 text-sm rounded-lg',
        lg: 'h-10 px-4 text-sm rounded-lg',
        xl: 'h-12 px-4 text-base rounded-lg',
      },
      hasError: {
        true: ['border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20'],
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

const Input = forwardRef(({ className, variant, size, type = 'text', leftIcon, rightIcon, error, hint, label, required, ...props }, ref) => {
  const hasError = !!error;
  const id = props.id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className={cn('block text-sm font-medium mb-1.5', 'text-[var(--text-primary)]', hasError && 'text-[var(--danger)]')}>
          {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{leftIcon}</span>}
        <input ref={ref} id={id} type={type} className={cn(inputVariants({ variant, size, hasError }), leftIcon && 'pl-9', rightIcon && 'pr-9', className)} {...props} />
        {rightIcon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{rightIcon}</span>}
      </div>
      {(error || hint) && <p className={cn('mt-1.5 text-xs', hasError ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]')}>{error || hint}</p>}
    </div>
  );
});
Input.displayName = 'Input';

const Textarea = forwardRef(({ className, variant = 'default', error, hint, label, required, rows = 4, resize = 'vertical', ...props }, ref) => {
  const hasError = !!error;
  const id = props.id || props.name;
  const resizeClass = { none: 'resize-none', vertical: 'resize-y', horizontal: 'resize-x', both: 'resize' };
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className={cn('block text-sm font-medium mb-1.5', 'text-[var(--text-primary)]', hasError && 'text-[var(--danger)]')}>
          {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      <textarea ref={ref} id={id} rows={rows} className={cn(inputVariants({ variant, hasError }), 'min-h-[80px] py-2', resizeClass[resize], className)} {...props} />
      {(error || hint) && <p className={cn('mt-1.5 text-xs', hasError ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]')}>{error || hint}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

const SearchInput = forwardRef(({ className, onClear, value, ...props }, ref) => (
  <Input
    ref={ref}
    type="search"
    value={value}
    leftIcon={
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    rightIcon={
      value && onClear ? (
        <button type="button" onClick={onClear} className="hover:text-[var(--text-primary)] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null
    }
    className={className}
    {...props}
  />
));
SearchInput.displayName = 'SearchInput';

export { Input, Textarea, SearchInput, inputVariants };
export default Input;
