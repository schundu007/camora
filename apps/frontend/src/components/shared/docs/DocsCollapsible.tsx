import { ReactNode, useState } from 'react';

export interface DocsCollapsibleProps {
  title: ReactNode;
  children: ReactNode;
  /** Whether the section is open by default. */
  defaultOpen?: boolean;
  /** Optional eyebrow / category label rendered above the title. */
  eyebrow?: string;
}

/**
 * NVIDIA-style "see more" collapsible row: gray bg, single-line title,
 * chevron-right that rotates on open. Used to fight scroll fatigue on
 * dense topic pages (Customizing the Docker Image, Sensors, Isaac Sim).
 */
export default function DocsCollapsible({
  title,
  children,
  defaultOpen = false,
  eyebrow,
}: DocsCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-colors text-left"
      >
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-0.5">
              {eyebrow}
            </div>
          )}
          <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
            {title}
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
          className={`flex-shrink-0 text-[var(--text-muted)] transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-4 text-[13.5px] leading-relaxed text-[var(--text-secondary)] border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  );
}
