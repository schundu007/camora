import { ReactNode } from 'react';

/**
 * NVIDIA-docs-style 3-column reading shell.
 *
 * Layout:
 *   [ left TOC slot — supplied by caller (e.g. ShellSidebar) ]
 *   [ centered content column, max-width ~860px ]
 *   [ right "On this page" anchor rail — sticky, ~200px ]
 *
 * The left column is intentionally not rendered here — Capra already mounts
 * `ShellSidebar` via `AppShell`, so DocsShell is meant to live inside that
 * shell's main content area and only manage the center + right columns.
 */
export interface DocsShellProps {
  children: ReactNode;
  /** Right-rail "On this page" content. If omitted, the rail is hidden and the
   *  content column gets the full width. */
  onThisPage?: ReactNode;
  /** Optional breadcrumbs row rendered above the content column. */
  breadcrumbs?: ReactNode;
  /** Optional className for the outer wrapper. */
  className?: string;
}

export default function DocsShell({
  children,
  onThisPage,
  breadcrumbs,
  className = '',
}: DocsShellProps) {
  return (
    <div className={`w-full mx-auto px-6 lg:px-10 ${className}`} style={{ maxWidth: 1280 }}>
      <div className="flex gap-10">
        <main className="flex-1 min-w-0 py-8" style={{ maxWidth: 860 }}>
          {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}
          {children}
        </main>

        {onThisPage && (
          <aside
            className="hidden xl:block flex-shrink-0 py-8"
            style={{ width: 220 }}
            aria-label="On this page"
          >
            <div className="sticky top-6">{onThisPage}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
