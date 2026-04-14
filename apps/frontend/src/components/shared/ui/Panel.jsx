import { forwardRef, useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

const panelVariants = cva(
  ['flex flex-col', 'rounded-xl', 'overflow-hidden'],
  {
    variants: {
      variant: {
        default: ['bg-[var(--bg-surface)] border border-[var(--border)]'],
        elevated: ['bg-[var(--bg-surface)] border border-[var(--border)]', 'shadow-[var(--shadow-md)]'],
        filled: ['bg-[var(--bg-elevated)] border-0'],
        glass: ['bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--border)]'],
        ghost: ['bg-transparent border-0'],
        sidebar: ['bg-[var(--bg-surface)] border-r border-[var(--border)]', 'text-[var(--text-primary)]'],
      },
      size: { sm: '', md: '', lg: '', full: 'h-full' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

const Panel = forwardRef(({ className, variant, size, children, ...props }, ref) => (
  <div ref={ref} className={cn(panelVariants({ variant, size }), className)} {...props}>{children}</div>
));
Panel.displayName = 'Panel';

const PanelHeader = forwardRef(({ className, title, subtitle, icon, actions, border = true, size = 'md', children, ...props }, ref) => {
  const sizeClasses = { sm: 'px-3 py-2', md: 'px-4 py-3', lg: 'px-6 py-4' };
  return (
    <div ref={ref} className={cn('flex items-center justify-between gap-4', sizeClasses[size], border && 'border-b border-[var(--border)]', className)} {...props}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="flex-shrink-0 text-[var(--text-secondary)]">{icon}</span>}
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h3>}
          {subtitle && <p className="text-xs text-[var(--text-secondary)] truncate">{subtitle}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
});
PanelHeader.displayName = 'PanelHeader';

const PanelContent = forwardRef(({ className, padding = 'md', scrollable = false, children, ...props }, ref) => {
  const paddingClasses = { none: 'p-0', sm: 'p-3', md: 'p-4', lg: 'p-6' };
  return (
    <div ref={ref} className={cn('flex-1', paddingClasses[padding], scrollable && 'overflow-y-auto', className)} {...props}>{children}</div>
  );
});
PanelContent.displayName = 'PanelContent';

const PanelFooter = forwardRef(({ className, border = true, justify = 'end', size = 'md', children, ...props }, ref) => {
  const sizeClasses = { sm: 'px-3 py-2', md: 'px-4 py-3', lg: 'px-6 py-4' };
  const justifyClasses = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' };
  return (
    <div ref={ref} className={cn('flex items-center gap-2', sizeClasses[size], justifyClasses[justify], border && 'border-t border-[var(--border)]', className)} {...props}>{children}</div>
  );
});
PanelFooter.displayName = 'PanelFooter';

const PanelSection = forwardRef(({ className, title, description, collapsible = false, defaultOpen = true, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div ref={ref} className={cn('border-b border-[var(--border)] last:border-b-0', className)} {...props}>
      {(title || description) && (
        <div className={cn('px-4 py-3', collapsible && 'cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors')} onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}>
          <div className="flex items-center justify-between">
            <div>
              {title && <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h4>}
              {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
            </div>
            {collapsible && (
              <svg className={cn('w-4 h-4 text-[var(--text-muted)] transition-transform duration-200', isOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {(!collapsible || isOpen) && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
});
PanelSection.displayName = 'PanelSection';

const PanelDivider = forwardRef(({ className, ...props }, ref) => (
  <hr ref={ref} className={cn('border-0 border-t border-[var(--border)]', 'mx-4', className)} {...props} />
));
PanelDivider.displayName = 'PanelDivider';

const PanelEmptyState = forwardRef(({ className, icon, title, description, action, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)} {...props}>
    {icon && <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4"><span className="text-[var(--text-muted)]">{icon}</span></div>}
    {title && <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</h3>}
    {description && <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-sm">{description}</p>}
    {action}
  </div>
));
PanelEmptyState.displayName = 'PanelEmptyState';

export { Panel, PanelHeader, PanelContent, PanelFooter, PanelSection, PanelDivider, PanelEmptyState, panelVariants };
export default Panel;
