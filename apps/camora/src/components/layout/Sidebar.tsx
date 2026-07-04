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

/* ─── Custom category-specific SVG icons ─────────────────────── */

const S = { width: 16, height: 16, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const icons = {
  /* Jobs — briefcase with handle, divider, clasp */
  briefcase: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="2" y="7" width="16" height="11" rx="2"/>
      <path d="M7 7V5.5A1.5 1.5 0 018.5 4h3A1.5 1.5 0 0113 5.5V7"/>
      <path d="M2 12h16"/>
      <rect x="8.5" y="11" width="3" height="2" rx="0.5"/>
    </svg>
  ),
  /* Overview — dashboard panels */
  home: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="2" y="2" width="7" height="9" rx="1.5"/>
      <rect x="11" y="2" width="7" height="4" rx="1.5"/>
      <rect x="11" y="8" width="7" height="3" rx="1.5"/>
      <rect x="2" y="13" width="7" height="5" rx="1.5"/>
      <rect x="11" y="13" width="7" height="5" rx="1.5"/>
    </svg>
  ),
  /* DSA — binary tree (root, 2 children, 4 leaves) */
  dsa: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="10" cy="3" r="2"/>
      <circle cx="5" cy="9" r="1.8"/>
      <circle cx="15" cy="9" r="1.8"/>
      <path d="M8.6 4.7L6.4 7.4M11.4 4.7L13.6 7.4"/>
      <circle cx="3" cy="15" r="1.5"/>
      <circle cx="7" cy="15" r="1.5"/>
      <circle cx="13" cy="15" r="1.5"/>
      <circle cx="17" cy="15" r="1.5"/>
      <path d="M4.2 10.5L3.3 13.5M5.8 10.5L6.7 13.5M14.2 10.5L13.3 13.5M15.8 10.5L16.7 13.5"/>
    </svg>
  ),
  /* System Design — 3 servers connected (distributed arch) */
  systemDesign: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="7" y="1" width="6" height="4.5" rx="1"/>
      <rect x="1" y="14" width="6" height="4.5" rx="1"/>
      <rect x="13" y="14" width="6" height="4.5" rx="1"/>
      <path d="M10 5.5v4M10 9.5L4 14M10 9.5L16 14"/>
      <circle cx="10" cy="9.5" r="1.2"/>
    </svg>
  ),
  /* Behavioral — person + speech bubble */
  behavioral: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="7" cy="6.5" r="3"/>
      <path d="M2 18c0-3.3 2.2-5.5 5-5.5"/>
      <path d="M13 8h5a1 1 0 011 1v4a1 1 0 01-1 1h-1.5L14 16v-2h-1a1 1 0 01-1-1V9a1 1 0 011-1z"/>
      <path d="M15 10h1M15 12h1"/>
    </svg>
  ),
  /* Low Level Design — gear with teeth and center ring */
  lowLevel: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3"/>
      <circle cx="10" cy="10" r="1.2"/>
      <path d="M10 3.5V2M10 18v-1.5M3.5 10H2M18 10h-1.5"/>
      <path d="M5.4 5.4L4.3 4.3M15.7 15.7l-1.1-1.1M5.4 14.6L4.3 15.7M15.7 4.3l-1.1 1.1"/>
      <path d="M8 2.5h4M8 17.5h4M2.5 8v4M17.5 8v4"/>
    </svg>
  ),
  /* Microservices — hub-and-spoke service mesh */
  microservices: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="2.5"/>
      <circle cx="3.5" cy="5" r="1.8"/>
      <circle cx="16.5" cy="5" r="1.8"/>
      <circle cx="3.5" cy="15" r="1.8"/>
      <circle cx="16.5" cy="15" r="1.8"/>
      <circle cx="10" cy="2" r="1.8"/>
      <path d="M8.1 8.6L5.1 6.4M11.9 8.6L14.9 6.4M8.1 11.4L5.1 13.6M11.9 11.4L14.9 13.6M10 7.5V3.8"/>
    </svg>
  ),
  /* DevOps — CI/CD cycle with deploy arrow */
  devops: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M5 10a5 5 0 015-5c1.8 0 3.3.9 4.2 2.2"/>
      <path d="M15 10a5 5 0 01-5 5c-1.8 0-3.3-.9-4.2-2.2"/>
      <path d="M14.5 4.5L16.5 7.5l-3 .5"/>
      <path d="M5.5 15.5L3.5 12.5l3-.5"/>
      <path d="M10 7v4M8.5 9.5L10 7l1.5 2.5"/>
    </svg>
  ),
  /* SRE — shield with heartbeat/pulse line */
  sre: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M10 2L3 5v5c0 4.4 3 8.1 7 9.8C14 18.1 17 14.4 17 10V5L10 2z"/>
      <path d="M5.5 10.5H7l1.5-2.5 2 5 1.5-2.5H14.5"/>
    </svg>
  ),
  /* Databases — 3-tier cylinder stack */
  database: (
    <svg {...S} viewBox="0 0 20 20">
      <ellipse cx="10" cy="3.5" rx="6.5" ry="2"/>
      <path d="M3.5 3.5v3.5c0 1.1 2.9 2 6.5 2s6.5-.9 6.5-2V3.5"/>
      <path d="M3.5 7v3.5c0 1.1 2.9 2 6.5 2s6.5-.9 6.5-2V7"/>
      <path d="M3.5 10.5V14c0 1.1 2.9 2 6.5 2s6.5-.9 6.5-2v-3.5"/>
    </svg>
  ),
  /* Projects — folder with </> code tag inside */
  folder: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M2 5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"/>
      <path d="M7.5 11l-2 2 2 2M12.5 11l2 2-2 2M11 10l-2 4"/>
    </svg>
  ),
  /* Roadmaps — winding path with milestone flags */
  roadmap: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M3 17C3 14 5 12 8 11s4-3 4-6"/>
      <circle cx="3" cy="17" r="1.5"/>
      <circle cx="8" cy="11" r="1.5"/>
      <circle cx="12" cy="5" r="1.5"/>
      <path d="M12 5h4.5v3H12"/>
      <path d="M8 11h3v2.5H8"/>
    </svg>
  ),
  /* Eng Blogs — document with text lines + angle bracket */
  blog: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M5 2h8l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <path d="M13 2v3h3"/>
      <path d="M7 8h6M7 11h4"/>
      <path d="M7 14l-1.5 1.5L7 17M10 14l1.5 1.5L10 17"/>
    </svg>
  ),
  /* Practice — terminal prompt >_ */
  terminal: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="2" y="3" width="16" height="14" rx="2"/>
      <path d="M5.5 8L8 10.5 5.5 13"/>
      <path d="M10 13h4.5"/>
    </svg>
  ),
  /* Problem Library — stack of books on shelf */
  library: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="2" y="3" width="3.5" height="13" rx="1"/>
      <rect x="7" y="5" width="3.5" height="11" rx="1"/>
      <rect x="12" y="2" width="3.5" height="14" rx="1"/>
      <path d="M1 17h18"/>
    </svg>
  ),
  /* Blind 75 — hexagon badge */
  badge: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M10 2L17.3 6.5v9L10 20 2.7 15.5v-9L10 2z"/>
      <path d="M7 9.5h2.5L8 13h3"/>
      <path d="M12.5 8.5v1.5c0 1-.5 2.5-2 2.5"/>
    </svg>
  ),
  /* Python — official blue/yellow gradient logo */
  python: (
    <svg viewBox="0 0 110 110" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pyNavBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5A9FD4"/><stop offset="100%" stopColor="#306998"/></linearGradient>
        <linearGradient id="pyNavYellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFE052"/><stop offset="100%" stopColor="#FFC331"/></linearGradient>
      </defs>
      <path fill="url(#pyNavBlue)" d="M54.9 5C33.3 5 34.7 14.1 34.7 14.1l0 9.4h20.6v2.8H22.2S5 24.1 5 45.9c0 21.8 12.1 21 12.1 21h7.2v-10.1s-.4-12.1 11.9-12.1h20.5s11.5.2 11.5-11.1V16.3S70 5 54.9 5zm-11.4 6.6c2.1 0 3.7 1.7 3.7 3.7 0 2.1-1.7 3.7-3.7 3.7-2.1 0-3.7-1.7-3.7-3.7 0-2.1 1.7-3.7 3.7-3.7z"/>
      <path fill="url(#pyNavYellow)" d="M55.5 105c21.6 0 20.2-9.1 20.2-9.1l0-9.4H55.1v-2.8h33.1S105 86 105 64.1C105 42.3 92.9 43.1 92.9 43.1h-7.2v10.1s.4 12.1-11.9 12.1H53.3S41.8 65.1 41.8 76.4v27.3S40.4 105 55.5 105zm11.4-6.6c-2.1 0-3.7-1.7-3.7-3.7 0-2.1 1.7-3.7 3.7-3.7 2.1 0 3.7 1.7 3.7 3.7 0 2.1-1.7 3.7-3.7 3.7z"/>
    </svg>
  ),
  /* Live Session — mic with audio wave arcs */
  mic: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="7" y="2" width="6" height="9" rx="3"/>
      <path d="M4 10a6 6 0 0012 0"/>
      <path d="M10 16v2.5"/>
      <path d="M7 19h6"/>
      <path d="M2.5 7.5a8 8 0 000 5"/>
      <path d="M17.5 7.5a8 8 0 010 5"/>
    </svg>
  ),
  /* Code Solver — terminal window with </> brackets */
  codeSolver: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="2" y="3" width="16" height="14" rx="2"/>
      <path d="M2 7h16"/>
      <circle cx="5" cy="5" r="0.8" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="5" r="0.8" fill="currentColor" stroke="none"/>
      <path d="M7.5 10.5L5.5 12.5l2 2M12.5 10.5l2 2-2 2M11 10l-2 5"/>
    </svg>
  ),
  /* Design Solver — bezier pen tool with vector curve */
  designSolver: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M3 16C3 16 6 9 10 9S17 4 17 4"/>
      <circle cx="3" cy="16" r="2"/>
      <circle cx="17" cy="4" r="2"/>
      <circle cx="7" cy="11.5" r="1.5"/>
      <circle cx="13" cy="6.5" r="1.5"/>
      <path d="M3 16L5 14M17 4L15 6"/>
    </svg>
  ),
  /* Achievements — trophy with star */
  trophy: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M6 2h8v7a4 4 0 01-8 0V2z"/>
      <path d="M6 5H3.5a1.5 1.5 0 000 3H6"/>
      <path d="M14 5h2.5a1.5 1.5 0 010 3H14"/>
      <path d="M10 13v2"/>
      <path d="M6.5 17h7"/>
      <path d="M10 4l.6 1.8H12.5L10.9 7l.6 1.8L10 7.6l-1.5 1.2.6-1.8L7.5 5.8H9.4z"/>
    </svg>
  ),
  /* Cloud / AWS — cloud outline */
  cloud: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M5 14a4 4 0 01-.5-7.9A5 5 0 0114.5 8H15a3 3 0 010 6H5z"/>
    </svg>
  ),
  /* Linux — terminal with $ prompt */
  linux: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="2" y="3" width="16" height="13" rx="2"/>
      <path d="M2 7h16"/>
      <path d="M5.5 11L8 13.5M5.5 13.5L8 11"/>
      <path d="M10 13h4.5"/>
    </svg>
  ),
  /* Networking — three nodes connected */
  networking: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="10" cy="4" r="2"/>
      <circle cx="3.5" cy="15" r="2"/>
      <circle cx="16.5" cy="15" r="2"/>
      <path d="M10 6v3M10 9L4.8 13.4M10 9L15.2 13.4"/>
    </svg>
  ),
  /* Troubleshooting — magnifying glass + crosshair */
  troubleshoot: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="8.5" cy="8.5" r="5"/>
      <path d="M12.5 12.5L17 17"/>
      <path d="M6 8.5h5M8.5 6v5"/>
    </svg>
  ),
  /* War Stories — lightning bolt (incident) */
  warStories: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M10.5 2L4 11h6.5l-1 7 7.5-9.5H10.5z"/>
    </svg>
  ),
  /* This vs That — two panels with divider */
  comparisons: (
    <svg {...S} viewBox="0 0 20 20">
      <rect x="1.5" y="4" width="7" height="12" rx="1.5"/>
      <rect x="11.5" y="4" width="7" height="12" rx="1.5"/>
      <path d="M10 4v12"/>
      <path d="M3.5 8h3M3.5 11h3M13.5 8h3M13.5 11h3"/>
    </svg>
  ),
  /* CodeSignal — lightning bolt */
  bolt: (
    <svg {...S} viewBox="0 0 20 20">
      <path d="M11 2L4 11h7l-2 7 9-10h-7z"/>
    </svg>
  ),
  /* Must Do — checkmark circle */
  check: (
    <svg {...S} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7"/>
      <path d="M7 10l2.5 2.5L13 8"/>
    </svg>
  ),
  /* Chevron — keep for section toggles */
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
      { label: 'DSA', path: '/capra/prepare/coding', icon: icons.dsa },
      { label: 'System Design', path: '/capra/prepare/system-design', icon: icons.systemDesign },
      { label: 'Behavioral', path: '/capra/prepare/behavioral', icon: icons.behavioral },
      { label: 'Low Level Design', path: '/capra/prepare/low-level-design', icon: icons.lowLevel },
      { label: 'Microservices', path: '/capra/prepare/microservices', icon: icons.microservices },
      { label: 'DevOps', path: '/capra/prepare/devops', icon: icons.devops },
      { label: 'SRE', path: '/capra/prepare/sre', icon: icons.sre },
      { label: 'Cloud / AWS', path: '/capra/prepare/cloud', icon: icons.cloud },
      { label: 'Linux', path: '/capra/prepare/linux', icon: icons.linux },
      { label: 'Networking', path: '/capra/prepare/networking', icon: icons.networking },
      { label: 'Troubleshooting', path: '/capra/prepare/troubleshooting', icon: icons.troubleshoot },
      { label: 'War Stories', path: '/capra/prepare/war-stories', icon: icons.warStories },
      { label: 'This vs That', path: '/capra/prepare/comparisons', icon: icons.comparisons },
      { label: 'Databases & SQL', path: '/capra/prepare/databases', icon: icons.database },
      { label: 'Projects', path: '/capra/prepare/projects', icon: icons.folder },
      { label: 'Roadmaps', path: '/capra/prepare/roadmaps', icon: icons.roadmap },
      { label: 'Eng Blogs', path: '/capra/prepare/eng-blogs', icon: icons.blog },
    ],
  },
  {
    title: 'Practice',
    items: [
      { label: 'Practice', path: '/capra/practice', icon: icons.terminal },
      { label: 'Problem Library', path: '/capra/library', icon: icons.library },
    ],
  },
  {
    title: 'Learn',
    items: [
      { label: 'Python', path: '/capra/learn/python', icon: icons.python },
      { label: 'CodeSignal', path: '/capra/learn/codesignal', icon: icons.bolt },
      { label: 'Programiz', path: '/capra/learn/programiz', icon: icons.python },
    ],
  },
  {
    title: 'Attend',
    items: [
      { label: 'Live Session', path: '/lumora', icon: icons.mic },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Code Solver', path: '/capra/coding', icon: icons.codeSolver },
      { label: 'Design Solver', path: '/capra/design', icon: icons.designSolver },
    ],
  },
  {
    title: 'Profile',
    items: [
      { label: 'Achievements', path: '/profile?tab=achievements', icon: icons.trophy },
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
  // Temporary reveal — toggled by right-clicking the collapsed rail (never by
  // hover). Collapses again when the cursor leaves the sidebar unless pinned.
  const [revealed, setRevealed] = useState(false);

  // Collapse when navigating to a different page
  useEffect(() => {
    setPinned(false);
    setRevealed(false);
  }, [pathname]);

  const expanded = pinned || revealed;
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
        onContextMenu={(e) => { e.preventDefault(); setRevealed((r) => !r); }}
        onMouseLeave={() => setRevealed(false)}
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
