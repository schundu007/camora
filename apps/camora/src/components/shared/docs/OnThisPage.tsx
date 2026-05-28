import { useEffect, useState } from 'react';
import Chip from '@/components/shared/ui/Chip';

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
      // Find the element that most recently scrolled past the offset line.
      // Using "highest (least-negative) top" instead of "last in TOC order"
      // so that DOM sections rendered out of TOC sequence (e.g. implementation
      // block appearing before api-design in the JSX) don't hijack the active
      // state while the user is still viewing the earlier section.
      let current: string | null = null;
      let closestTop = -Infinity;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - offset;
        if (top <= 0 && top > closestTop) {
          closestTop = top;
          current = item.id;
        }
      }
      const next = current ?? items[0].id;
      // Functional updater + equality guard. Without this, an unstable
      // `items` prop would re-attach the listener and call handler() on
      // every render, feeding React error #300 ("Maximum update depth
      // exceeded") on scroll. This makes the leaf setState idempotent.
      setActiveId((prev) => (prev === next ? prev : next));
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
        <Chip variant="default">{title}</Chip>
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
