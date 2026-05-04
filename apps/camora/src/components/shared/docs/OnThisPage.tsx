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

    // Capture-phase scroll on document catches scroll events from any
    // element — works whether the page scrolls on window or inside an
    // inner overflow-y:auto container like Capra's #app-scroll-container.
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
    document.addEventListener('scroll', handler, { capture: true, passive: true });
    window.addEventListener('resize', handler);
    return () => {
      document.removeEventListener('scroll', handler, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', handler);
    };
  }, [items, offset]);

  if (items.length === 0) return null;

  return (
    <div>
      {/* Glassy pill capsule label for the rail. */}
      <div className="relative mb-3 pl-3">
        <span
          aria-hidden="true"
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full"
          style={{ background: 'var(--cam-primary)' }}
        />
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.16em]"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--cam-gold-leaf)',
            color: 'var(--cam-gold-leaf-text)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
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
