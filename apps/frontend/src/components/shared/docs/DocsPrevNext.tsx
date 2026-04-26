import { Link } from 'react-router-dom';

export interface DocsPrevNextLink {
  label: string;
  to: string;
  /** Optional eyebrow (e.g. "Previous", "Next") — auto-set if omitted. */
  eyebrow?: string;
}

export interface DocsPrevNextProps {
  prev?: DocsPrevNextLink;
  next?: DocsPrevNextLink;
}

/**
 * NVIDIA-style bottom prev/next nav row. Two side-by-side panels with
 * chevron arrows and the eyebrow label above the page title.
 */
export default function DocsPrevNext({ prev, next }: DocsPrevNextProps) {
  if (!prev && !next) return null;
  return (
    <nav
      aria-label="Page navigation"
      className="mt-12 pt-6 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {prev ? (
        <Link
          to={prev.to}
          className="group flex items-center gap-3 px-4 py-3 border border-[var(--border)] rounded-md hover:border-[var(--accent)] transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-[var(--text-muted)] group-hover:text-[var(--accent)] flex-shrink-0"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {prev.eyebrow ?? 'Previous'}
            </div>
            <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {prev.label}
            </div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          to={next.to}
          className="group flex items-center gap-3 px-4 py-3 border border-[var(--border)] rounded-md hover:border-[var(--accent)] transition-colors text-right justify-end"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {next.eyebrow ?? 'Next'}
            </div>
            <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {next.label}
            </div>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-[var(--text-muted)] group-hover:text-[var(--accent)] flex-shrink-0"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
