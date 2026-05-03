import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/* ─── Types ──────────────────────────────────────────────────── */

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** External link (opens in new tab) */
  external?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ─── 16px inline SVG icons ──────────────────────────────────── */

const icons = {
  home: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6.5L8 2l6 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" />
      <path d="M6 14V9h4v5" />
    </svg>
  ),
  cpu: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="8" height="8" rx="1" />
      <path d="M6 1v3M10 1v3M6 12v3M10 12v3M1 6h3M1 10h3M12 6h3M12 10h3" />
    </svg>
  ),
  layers: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L1 5l7 4 7-4-7-4z" />
      <path d="M1 8l7 4 7-4" />
      <path d="M1 11l7 4 7-4" />
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  database: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="8" cy="4" rx="6" ry="2.5" />
      <path d="M2 4v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V4" />
      <path d="M2 8v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V8" />
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4L1 8l4 4" />
      <path d="M11 4l4 4-4 4" />
      <path d="M9 2L7 14" />
    </svg>
  ),
  folder: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4a1 1 0 011-1h3.5l2 2H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
    </svg>
  ),
  map: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3l5 2v9l-5-2V3z" />
      <path d="M6 5l5-2v9l-5 2V5z" />
      <path d="M11 3l4-1v9l-4 1V3z" />
    </svg>
  ),
  book: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h4.5a2 2 0 012 2v10a1.5 1.5 0 00-1.5-1.5H2V2z" />
      <path d="M14 2H9.5a2 2 0 00-2 2v10a1.5 1.5 0 011.5-1.5H14V2z" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 14c0-2.5 2.24-4 5-4s5 1.5 5 4" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12.5 10c1.5.2 2.5 1.2 2.5 4" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4,2 14,8 4,14" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1l2.12 4.3L15 5.96l-3.5 3.41.83 4.82L8 12l-4.33 2.19.83-4.82L1 5.96l4.88-.66L8 1z" />
    </svg>
  ),
  trophy: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h6v5a3 3 0 01-6 0V2z" />
      <path d="M5 4H3a1 1 0 00-1 1v1a2 2 0 002 2h1" />
      <path d="M11 4h2a1 1 0 011 1v1a2 2 0 01-2 2h-1" />
      <path d="M8 10v2" />
      <path d="M5 14h6" />
    </svg>
  ),
  mic: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="1" width="5" height="8" rx="2.5" />
      <path d="M3 7a5 5 0 0010 0" />
      <path d="M8 12v3" />
    </svg>
  ),
  briefcase: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="14" height="9" rx="1" />
      <path d="M5 5V3a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),
  layout: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <path d="M1 6h14" />
      <path d="M6 6v9" />
    </svg>
  ),
  pricing: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7" />
      <path d="M8 4v8" />
      <path d="M10 5.5H6.5a1.5 1.5 0 000 3h3a1.5 1.5 0 010 3H6" />
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2l4 4-4 4" />
    </svg>
  ),
};

/* ─── Navigation sections ────────────────────────────────────── */

const sections: NavSection[] = [
  {
    title: 'Apply',
    items: [
      { label: 'Jobs', path: '/jobs', icon: icons.briefcase },
    ],
  },
  {
    title: 'Prepare',
    items: [
      { label: 'Overview', path: '/capra/prepare', icon: icons.home },
      { label: 'DSA', path: '/capra/prepare/coding', icon: icons.cpu },
      { label: 'System Design', path: '/capra/prepare/system-design', icon: icons.layers },
      { label: 'Behavioral', path: '/capra/prepare/behavioral', icon: icons.users },
      { label: 'Low Level Design', path: '/capra/prepare/low-level-design', icon: icons.code },
      { label: 'Microservices', path: '/capra/prepare/microservices', icon: icons.grid },
      { label: 'Databases & SQL', path: '/capra/prepare/databases', icon: icons.database },
      { label: 'Projects', path: '/capra/prepare/projects', icon: icons.folder },
      { label: 'Roadmaps', path: '/capra/prepare/roadmaps', icon: icons.map },
      { label: 'Eng Blogs', path: '/capra/prepare/eng-blogs', icon: icons.book },
    ],
  },
  {
    title: 'Practice',
    items: [
      { label: 'Practice', path: '/capra/practice', icon: icons.play },
      { label: 'Blind 75', path: '/handbook', icon: icons.star },
      { label: 'Achievements', path: '/profile?tab=achievements', icon: icons.trophy },
    ],
  },
  {
    title: 'Attend',
    items: [
      { label: 'Live Interview', path: '/lumora', icon: icons.mic },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Code Solver', path: '/capra', icon: icons.layout },
      { label: 'Design Solver', path: '/capra/design', icon: icons.layers },
    ],
  },
];

/* ─── Collapsible Section ────────────────────────────────────── */

function SidebarSection({
  section,
  pathname,
  collapsed,
  onItemClick,
}: {
  section: NavSection;
  pathname: string;
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-3 first:mt-0">
      {/* Section header — hidden when collapsed.
          Uses design tokens so the label flips between cream-on-dark and
          slate-on-light cleanly with [data-theme]. The "border around a
          collapsible label" pattern was a leftover from the lapis-bg
          era; on the new --bg-elevated surface a plain text label reads
          better and sits flat in the panel. */}
      {!collapsed && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full mb-1 px-2 cursor-pointer select-none group"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
          }}
        >
          <span>{section.title}</span>
          <span
            className="transition-transform duration-150"
            style={{
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--text-muted)',
            }}
          >
            {icons.chevron}
          </span>
        </button>
      )}

      {/* Items — always visible when collapsed (no toggle) */}
      {(collapsed || open) && (
        <ul className="list-none m-0 p-0">
          {section.items.map((item) => {
            const active = isActive(item.path, pathname);

            const linkStyles: React.CSSProperties = collapsed ? {
              height: '36px',
              width: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '2px auto',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent-subtle)' : 'transparent',
              borderRadius: '8px',
              transition: 'background 0.12s, color 0.12s',
            } : {
              height: '32px',
              fontSize: '13px',
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent-subtle)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: '6px',
              transition: 'background 0.12s, color 0.12s',
            };

            const iconEl = (
              <span className="flex-shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
            );

            if (item.external) {
              return (
                <li key={item.path}>
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onItemClick}
                    className={collapsed ? 'flex rounded-md no-underline sidebar-item' : 'flex items-center gap-2.5 px-2.5 rounded-md no-underline sidebar-item'}
                    style={linkStyles}
                    title={collapsed ? item.label : undefined}
                  >
                    {iconEl}
                    {!collapsed && item.label}
                  </a>
                </li>
              );
            }

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onItemClick}
                  className={collapsed ? 'flex rounded-md no-underline sidebar-item' : 'flex items-center gap-2.5 px-2.5 rounded-md no-underline sidebar-item'}
                  style={linkStyles}
                  title={collapsed ? item.label : undefined}
                >
                  {iconEl}
                  {!collapsed && item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Active check ───────────────────────────────────────────── */

function isActive(itemPath: string, currentPath: string): boolean {
  // Exact match for non-prepare paths and Overview
  if (itemPath === '/capra/prepare') {
    return currentPath === '/capra/prepare';
  }
  if (itemPath === '/capra') {
    return currentPath === '/capra';
  }
  // For sub-paths, check startsWith
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

/* ─── Main Sidebar ───────────────────────────────────────────── */

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Collapse when navigating to a different page
  useEffect(() => {
    setPinned(false);
  }, [pathname]);

  const expanded = pinned || hovered;
  const sidebarWidth = expanded ? '240px' : '56px';

  const renderSidebarContent = (isCollapsed: boolean, onItemClick?: () => void) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable nav */}
      <nav className={`flex-1 min-h-0 overflow-y-auto ${isCollapsed ? 'px-1.5' : 'px-3'} py-3 no-scrollbar`}>
        {sections.map((section) => (
          <SidebarSection
            key={section.title}
            section={section}
            pathname={pathname}
            collapsed={isCollapsed}
            onItemClick={onItemClick}
          />
        ))}
      </nav>

      {/* Bottom section — always visible */}
      <div
        className={`${isCollapsed ? 'px-1.5' : 'px-3'} py-3 flex flex-col gap-2 items-center shrink-0`}
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Pin/Unpin toggle — desktop only */}
        {!onItemClick && !isCollapsed && (
          <button
            onClick={() => setPinned(p => !p)}
            className="sidebar-item flex items-center justify-center gap-2 rounded-md"
            style={{
              width: '100%',
              height: '32px',
              color: pinned ? 'var(--accent)' : 'var(--text-secondary)',
              background: pinned ? 'var(--accent-subtle)' : 'none',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: pinned ? 'rotate(0deg)' : 'rotate(45deg)', transition: 'transform 0.2s' }}>
              <path d="M12 17v5M9 2h6l-1 7h4l-7 8 1-5H8l1-10z" />
            </svg>
            <span>{pinned ? 'Pinned' : 'Pin Open'}</span>
          </button>
        )}
        {!isCollapsed && (
          <span className="px-2.5 block" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            &copy; 2026 Cariara
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────
          Background switched from var(--cam-primary) (lapis) to
          var(--bg-elevated) so the sidebar reads as part of the same
          surface system as topbar / cards / panels rather than an
          out-of-place solid-blue strip. Border uses var(--border) for
          the same reason — flips light/dark with the rest of the chrome. */}
      <aside
        className="hidden md:flex flex-col shrink-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: sidebarWidth,
          height: '100%',
          transition: 'width 0.2s ease-out',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {renderSidebarContent(!expanded)}
      </aside>

      {/* ── Mobile overlay ──────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'var(--bg-overlay, rgba(0,0,0,0.6))' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer — always expanded with labels on mobile */}
          <aside
            className="fixed top-0 left-0 z-50 flex flex-col md:hidden"
            style={{
              width: '280px',
              height: '100vh',
              paddingTop: 'var(--topbar-height, 56px)',
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border)',
              boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
            }}
          >
            {renderSidebarContent(false, onClose)}
          </aside>
        </>
      )}

      {/* ── Hover styles (injected once) ──────────────────────
          Sidebar panel sits on --bg-surface (matches every other
          sidebar in the app — ShellSidebar, LumoraIconRail,
          SessionSidebar). Hover items raise to --bg-elevated so they
          read as one layer above the panel in either theme. */}
      <style>{`
        .sidebar-item:hover {
          background: var(--bg-elevated) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </>
  );
}
