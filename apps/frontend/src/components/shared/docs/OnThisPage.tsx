import { useEffect, useState } from 'react';

export interface OnThisPageItem {
  /** Element id to scroll to. Must match an `id` rendered in the content. */
  id: string;
  label: string;
  /** Indent depth (0 = top-level h2, 1 = h3, etc.). Default 0. */
  depth?: number;
}

export interface OnThisPageProps {
  items: OnThisPageItem[];
  /** Heading shown above the rail. Default "On this page". */
  title?: string;
  /** Pixel offset added to the scroll trigger (e.g. for sticky headers). Default 80. */
  offset?: number;
}

/**
 * NVIDIA-style right-rail anchor list with active highlighting.
 * Active item: 2px accent left border + bold + accent text.
 * Inactive: thin muted left border, muted text.
 */
export default function OnThisPage({
  items,
  title = 'On this page',
  offset = 80,
}: OnThisPageProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return undefined;

    const handler = () => {
      let current: string | null = null;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) current = item.id;
      }
      setActiveId(current ?? items[0].id);
    };

    handler();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [items, offset]);

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--text-muted)]"
          aria-hidden="true"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          {title}
        </span>
      </div>

      <ul className="border-l border-[var(--border)]">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', `#${item.id}`);
                  }
                }}
                className={`block py-1.5 text-[13px] leading-snug transition-colors -ml-px ${
                  isActive
                    ? 'border-l-2 border-[var(--accent)] text-[var(--accent)] font-semibold'
                    : 'border-l-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                style={{ paddingLeft: 12 + (item.depth ?? 0) * 12 }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
