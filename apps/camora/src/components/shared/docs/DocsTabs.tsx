import { ReactNode, useState, useId } from 'react';

export interface DocsTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface DocsTabsProps {
  tabs: DocsTab[];
  /** ID of the initially active tab. Defaults to the first tab. */
  defaultId?: string;
  /** Border the active panel like NVIDIA's nested platform tabs. Default true. */
  bordered?: boolean;
  /** Compact (small) or default (medium) tab heights. Default "default". */
  size?: 'compact' | 'default';
  className?: string;
}

/**
 * NVIDIA-style tabs: tabs sit on top, active tab has accent underline + bold,
 * the active panel (when `bordered`) sits inside a thin accent border.
 *
 * Nestable — pass another <DocsTabs> as a tab's content to get the
 * x86/Jetson → US-CDN/China-CDN nesting from the NVIDIA docs.
 */
export default function DocsTabs({
  tabs,
  defaultId,
  bordered = true,
  size = 'default',
  className = '',
}: DocsTabsProps) {
  const [activeId, setActiveId] = useState<string>(defaultId ?? tabs[0]?.id);
  const baseId = useId();
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const tabPad = size === 'compact' ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2 text-[13.5px]';

  return (
    <div className={className}>
      <div role="tablist" className="flex flex-wrap gap-x-1 gap-y-0 -mb-px relative z-[1]">
        {tabs.map((tab) => {
          const isActive = tab.id === active.id;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
              className={`${tabPad} font-semibold transition-colors border-b-2 ${
                isActive
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className={
          bordered
            ? 'border-t border-[var(--border)] -mt-px pt-4'
            : 'pt-3'
        }
      >
        {active.content}
      </div>
    </div>
  );
}
