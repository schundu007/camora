import { useState, useEffect, useRef, useCallback } from 'react';

interface TOCItem {
  id: string;
  label: string;
}

interface TOCProps {
  items: TOCItem[];
}

export default function TableOfContents({ items }: TOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const headingElementsRef = useRef<Record<string, IntersectionObserverEntry>>({});

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update active immediately on click for responsiveness
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    headingElementsRef.current = {};

    const callback: IntersectionObserverCallback = (entries) => {
      // Store all entry states
      entries.forEach((entry) => {
        headingElementsRef.current[entry.target.id] = entry;
      });

      // Find the first visible section
      const visibleIds = Object.keys(headingElementsRef.current).filter(
        (id) => headingElementsRef.current[id]?.isIntersecting
      );

      if (visibleIds.length > 0) {
        // Pick the one that appears first in the items list
        const firstVisible = items.find((item) => visibleIds.includes(item.id));
        if (firstVisible) {
          setActiveId(firstVisible.id);
        }
      }
    };

    observerRef.current = new IntersectionObserver(callback, {
      // Observe when sections enter the top portion of the viewport
      rootMargin: '-64px 0px -60% 0px',
      threshold: 0,
    });

    // Observe all section elements
    const timeoutId = setTimeout(() => {
      items.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) {
          observerRef.current?.observe(el);
        }
      });
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      observerRef.current?.disconnect();
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      className="sticky top-4"
      style={{ maxHeight: 'calc(100vh - 100px)' }}
      aria-label="Table of contents"
    >
      <p
        className="uppercase font-semibold mb-3 tracking-wider"
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
        }}
      >
        On this page
      </p>

      <ul className="list-none m-0 p-0 space-y-0.5">
        {items.map(({ id, label }) => {
          const isActive = activeId === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                className={`
                  block py-1 px-3 text-[13px] no-underline transition-colors duration-150
                  ${isActive ? 'font-medium border-l-2' : 'border-l-2 border-transparent'}
                `}
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderColor: isActive ? 'var(--accent)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      {/* Divider */}
      <div
        className="my-4"
        style={{
          height: '1px',
          background: 'var(--border)',
        }}
      />

      {/* Placeholder: Ask AI button */}
      <button
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer"
        style={{
          color: 'var(--text-secondary)',
          background: 'var(--accent-subtle)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
        type="button"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
          <line x1="10" y1="22" x2="14" y2="22" />
        </svg>
        Ask AI about this topic
      </button>
    </nav>
  );
}
