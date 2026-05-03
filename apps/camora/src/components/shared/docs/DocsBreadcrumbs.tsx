import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

export interface DocsBreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Whether to render a leading Home icon link to "/". Default true. */
  showHome?: boolean;
}

/**
 * NVIDIA-style breadcrumb strip:  🏠 › Section › Subsection › Page
 * Last item is the current page (no link, slightly bolder).
 */
export default function DocsBreadcrumbs({
  items,
  showHome = true,
}: DocsBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] flex-wrap"
    >
      {showHome && (
        <>
          <Link
            to="/"
            aria-label="Home"
            className="flex items-center hover:text-[var(--accent)] transition-colors"
          >
            <HomeIcon />
          </Link>
          {items.length > 0 && <Chevron />}
        </>
      )}

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="hover:text-[var(--accent)] transition-colors"
              >
                {item.label}
              </Link>
            ) : item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-[var(--accent)] transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={isLast ? 'text-[var(--text-primary)] font-semibold' : ''}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <Chevron />}
          </span>
        );
      })}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12 12 3l9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-[var(--text-muted)] opacity-60"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
