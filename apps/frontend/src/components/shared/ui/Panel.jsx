import { forwardRef, useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../utils/cn';

const panelVariants = cva(
  ['flex flex-col', 'rounded-lg', 'overflow-hidden'],
  {
    variants: {
      variant: {
        default: ['bg-white border border-gray-200'],
        elevated: ['bg-white border border-gray-200', 'shadow-lg'],
        filled: ['bg-gray-100 border-0'],
        glass: ['bg-gray-100/80 backdrop-blur-md border border-gray-200/30'],
        ghost: ['bg-transparent border-0'],
        sidebar: ['bg-white border-r border-gray-200', 'text-gray-900'],
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
    <div ref={ref} className={cn('flex items-center justify-between gap-4', sizeClasses[size], border && 'border-b border-gray-200', className)} {...props}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="flex-shrink-0 text-gray-600">{icon}</span>}
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-600 truncate">{subtitle}</p>}
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
    <div ref={ref} className={cn('flex items-center gap-2', sizeClasses[size], justifyClasses[justify], border && 'border-t border-gray-200', className)} {...props}>{children}</div>
  );
});
PanelFooter.displayName = 'PanelFooter';

const PanelSection = forwardRef(({ className, title, description, collapsible = false, defaultOpen = true, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div ref={ref} className={cn('border-b border-gray-200 last:border-b-0', className)} {...props}>
      {(title || description) && (
        <div className={cn('px-4 py-3', collapsible && 'cursor-pointer hover:bg-gray-100 transition-colors')} onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}>
          <div className="flex items-center justify-between">
            <div>
              {title && <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</h4>}
              {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
            {collapsible && (
              <svg className={cn('w-4 h-4 text-gray-600 transition-transform duration-200', isOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  <hr ref={ref} className={cn('border-0 border-t border-gray-200', 'mx-4', className)} {...props} />
));
PanelDivider.displayName = 'PanelDivider';

const PanelEmptyState = forwardRef(({ className, icon, title, description, action, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)} {...props}>
    {icon && <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4"><span className="text-gray-500">{icon}</span></div>}
    {title && <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>}
    {description && <p className="text-sm text-gray-600 mb-4 max-w-sm">{description}</p>}
    {action}
  </div>
));
PanelEmptyState.displayName = 'PanelEmptyState';

export { Panel, PanelHeader, PanelContent, PanelFooter, PanelSection, PanelDivider, PanelEmptyState, panelVariants };
export default Panel;
