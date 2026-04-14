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
      { label: 'DSA', path: '/capra/prepare/coding', icon: icons.cpu },
      { label: 'System Design', path: '/capra/prepare/system-design', icon: icons.layers },
      { label: 'Microservices', path: '/capra/prepare/microservices', icon: icons.grid },
      { label: 'Databases', path: '/capra/prepare/databases', icon: icons.database },
      { label: 'SQL', path: '/capra/prepare/sql', icon: icons.database },
      { label: 'Low-Level', path: '/capra/prepare/low-level-design', icon: icons.code },
      { label: 'Projects', path: '/capra/prepare/projects', icon: icons.folder },
      { label: 'Roadmaps', path: '/capra/prepare/roadmaps', icon: icons.map },
      { label: 'Eng Blogs', path: '/capra/prepare/eng-blogs', icon: icons.book },
      { label: 'Behavioral', path: '/capra/prepare/behavioral', icon: icons.users },
    ],
  },
  {
    title: 'Practice',
    items: [
      { label: 'Practice', path: '/capra/practice', icon: icons.play },
      { label: 'Blind 75', path: '/handbook', icon: icons.star },
      { label: 'My Plan', path: '/capra/plan', icon: icons.map },
      { label: 'Analytics', path: '/analytics', icon: icons.cpu },
      { label: 'Achievements', path: '/capra/achievements', icon: icons.trophy },
    ],
  },
  {
    title: 'Attend',
    items: [
      { label: 'Live Interview', path: '/lumora', icon: icons.mic },
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
}: {
  section: NavSection;
  pathname: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-3 first:mt-0">
      {/* Section header — hidden when collapsed */}
      {!collapsed && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full mb-1 px-2 cursor-pointer select-none group"
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
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
              color: 'var(--text-dimmed)',
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
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              background: active ? 'var(--accent-subtle)' : 'transparent',
              borderRadius: '8px',
              transition: 'background 0.12s, color 0.12s',
            } : {
              height: '32px',
              fontSize: '13px',
              fontWeight: 500,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('camora-sidebar-collapsed') !== 'false';
    }
    return true; // collapsed by default
  });

  useEffect(() => {
    localStorage.setItem('camora-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const sidebarWidth = collapsed ? '56px' : '240px';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Scrollable nav */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-1.5' : 'px-3'} py-3 no-scrollbar`}>
        {/* Overview — standalone item */}
        {(() => {
          const active = pathname === '/capra/prepare';
          const style: React.CSSProperties = collapsed ? {
            height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '2px auto', color: active ? 'var(--accent)' : 'var(--text-muted)',
            background: active ? 'var(--accent-subtle)' : 'transparent', borderRadius: '8px', transition: 'background 0.12s, color 0.12s',
          } : {
            height: '32px', fontSize: '13px', fontWeight: 500,
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: active ? 'var(--accent-subtle)' : 'transparent',
            borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
            borderRadius: '6px', transition: 'background 0.12s, color 0.12s',
          };
          return (
            <div className="mb-2">
              <Link
                to="/capra/prepare"
                className={collapsed ? 'flex rounded-md no-underline sidebar-item' : 'flex items-center gap-2.5 px-2.5 rounded-md no-underline sidebar-item'}
                style={style}
                title={collapsed ? 'Overview' : undefined}
              >
                <span className="flex-shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{icons.home}</span>
                {!collapsed && 'Overview'}
              </Link>
            </div>
          );
        })()}
        {sections.map((section) => (
          <SidebarSection
            key={section.title}
            section={section}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div
        className={`${collapsed ? 'px-1.5' : 'px-3'} py-3 flex flex-col gap-2 items-center`}
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Expand/Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="sidebar-item flex items-center justify-center rounded-md"
          style={{
            width: collapsed ? '36px' : '100%',
            height: '32px',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
            <path d="M6 3l5 5-5 5" />
          </svg>
          {!collapsed && <span className="ml-2">Collapse</span>}
        </button>
        {!collapsed && (
          <span className="px-2.5 block" style={{ fontSize: '10px', color: 'var(--text-dimmed)' }}>
            &copy; 2026 Cariara
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{
          width: sidebarWidth,
          transition: 'width 0.2s ease-out',
          height: 'calc(100vh - var(--topbar-height, 48px))',
          position: 'sticky',
          top: 'var(--topbar-height, 48px)',
          background: 'var(--bg-app)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {sidebarContent}
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

          {/* Drawer */}
          <aside
            className="fixed top-0 left-0 z-50 flex flex-col md:hidden"
            style={{
              width: '280px',
              height: '100vh',
              paddingTop: 'var(--topbar-height, 48px)',
              background: 'var(--bg-app)',
              borderRight: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* ── Hover styles (injected once) ────────────────────── */}
      <style>{`
        .sidebar-item:hover {
          background: var(--bg-elevated) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </>
  );
}
