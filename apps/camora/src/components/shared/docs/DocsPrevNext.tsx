import { Link } from 'react-router-dom';

export interface DocsPrevNextLink {
  label: string;
  /** URL navigation. Provide `to` OR `onClick` — not both. */
  to?: string;
  /** State navigation (e.g. TopicDetail's setSelectedTopic). Provide `to` OR `onClick`. */
  onClick?: () => void;
  /** Optional eyebrow (e.g. "Previous", "Next") — auto-set if omitted. */
  eyebrow?: string;
}

export interface DocsPrevNextProps {
  prev?: DocsPrevNextLink;
  next?: DocsPrevNextLink;
}

/**
 * NVIDIA-style bottom prev/next nav row. Two side-by-side panels with
 * chevron arrows and an eyebrow label above the page title. Accepts
 * either `to` (router Link) or `onClick` (button) per side, so it works
 * for URL-based docs and for state-driven topic browsers (where the
 * selected topic is a component-state ID, not a route).
 */
export default function DocsPrevNext({ prev, next }: DocsPrevNextProps) {
  if (!prev && !next) return null;
  return (
    <nav
      aria-label="Page navigation"
      className="mt-12 pt-6 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {prev ? renderPanel(prev, 'prev') : <div />}
      {next ? renderPanel(next, 'next') : <div />}
    </nav>
  );
}

function renderPanel(link: DocsPrevNextLink, side: 'prev' | 'next') {
  const isPrev = side === 'prev';
  const baseClass =
    'group flex items-center gap-3 px-4 py-3 border border-[var(--border)] rounded-md ' +
    'hover:border-[var(--accent)] transition-colors w-full text-left ' +
    (isPrev ? '' : 'text-right justify-end');
  const eyebrow = link.eyebrow ?? (isPrev ? 'Previous' : 'Next');

  const inner = (
    <>
      {isPrev && <Chevron side="prev" />}
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {eyebrow}
        </div>
        <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
          {link.label}
        </div>
      </div>
      {!isPrev && <Chevron side="next" />}
    </>
  );

  if (link.onClick) {
    return (
      <button type="button" onClick={link.onClick} className={baseClass}>
        {inner}
      </button>
    );
  }
  if (link.to) {
    return (
      <Link to={link.to} className={baseClass}>
        {inner}
      </Link>
    );
  }
  return <div />;
}

function Chevron({ side }: { side: 'prev' | 'next' }) {
  return (
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
      {side === 'prev' ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}
