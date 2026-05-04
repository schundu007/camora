import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { isOwnerEmail } from '../../../lib/owner';

export interface DocsSidebarLink {
  label: string;
  to: string;
}

export interface DocsSidebarGroup {
  label: string;
  items: DocsSidebarLink[];
}

export const USER_GROUPS: DocsSidebarGroup[] = [
  {
    label: 'Get started',
    items: [
      { label: 'Overview', to: '/docs' },
      { label: 'Getting started', to: '/docs/getting-started' },
      { label: 'Account & billing', to: '/docs/account' },
      { label: 'Top-ups & AI hours', to: '/docs/topups' },
      { label: 'Team sharing', to: '/docs/teams' },
    ],
  },
  {
    label: 'Prep',
    items: [
      { label: 'Prepare', to: '/docs/prepare' },
      { label: 'Practice', to: '/docs/practice' },
    ],
  },
  {
    label: 'Lumora live',
    items: [
      { label: 'Live interview', to: '/docs/lumora-live' },
      { label: 'Coding helper', to: '/docs/lumora-coding' },
      { label: 'System design', to: '/docs/lumora-design' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { label: 'Desktop app', to: '/docs/desktop' },
      { label: 'Audio setup', to: '/docs/audio-setup' },
      { label: 'Voice filtering', to: '/docs/voice-filtering' },
    ],
  },
];

export const ADMIN_GROUPS: DocsSidebarGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Overview', to: '/docs/admin' },
      { label: 'Deployment', to: '/docs/admin/deployment' },
      { label: 'Environment vars', to: '/docs/admin/env-vars' },
      { label: 'Database', to: '/docs/admin/database' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Stripe configuration', to: '/docs/admin/stripe' },
      { label: 'Refund approval', to: '/docs/admin/refunds' },
    ],
  },
  {
    label: 'Lumora internals',
    items: [
      { label: 'Live (admin)', to: '/docs/admin/lumora-live' },
      { label: 'Coding (admin)', to: '/docs/admin/lumora-coding' },
      { label: 'Design (admin)', to: '/docs/admin/lumora-design' },
    ],
  },
  {
    label: 'On-call',
    items: [{ label: 'Incident response', to: '/docs/admin/incidents' }],
  },
];

type Mode = 'user' | 'admin';

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/docs/admin');
}

export default function DocsSidebar() {
  const { user } = useAuth();
  const isOwner = isOwnerEmail(user?.email);
  const location = useLocation();

  const [mode, setMode] = useState<Mode>(() => (isAdminPath(location.pathname) ? 'admin' : 'user'));

  // Keep mode in sync with the route — e.g. clicking an admin sidebar
  // item from user-mode flips the toggle, and back-button works.
  useEffect(() => {
    setMode(isAdminPath(location.pathname) ? 'admin' : 'user');
  }, [location.pathname]);

  // Non-owners can never see Admin mode, even if they manually flipped it.
  const effectiveMode: Mode = isOwner ? mode : 'user';
  const groups = effectiveMode === 'admin' ? ADMIN_GROUPS : USER_GROUPS;

  return (
    <nav
      aria-label="Documentation navigation"
      className="text-[13.5px]"
      style={{ color: 'var(--text-primary)' }}
    >
      {/* Sidebar header — glassy pill capsule labeling the section. */}
      <div className="relative mb-5 pl-3">
        <span
          aria-hidden="true"
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full"
          style={{ background: 'var(--cam-primary)' }}
        />
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.16em]"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--cam-gold-leaf)',
            color: 'var(--cam-gold-leaf-text)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          Documentation
        </span>
      </div>

      {isOwner && (
        <div
          className="mb-5 inline-flex rounded-full p-0.5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--cam-gold-leaf)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <ModeButton active={effectiveMode === 'user'} onClick={() => setMode('user')} label="User" />
          <ModeButton active={effectiveMode === 'admin'} onClick={() => setMode('admin')} label="Admin" />
        </div>
      )}

      <SidebarGroups groups={groups} pathname={location.pathname} />
    </nav>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors"
      style={{
        background: active ? 'var(--cam-primary)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function SidebarGroups({ groups, pathname }: { groups: DocsSidebarGroup[]; pathname: string }) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] mb-2 px-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="block px-2 py-1.5 rounded-md transition-colors"
                    style={{
                      background: active ? 'var(--bg-elevated)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: active ? 600 : 400,
                      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Mobile drawer trigger — used by DocsPageLayout above the breadcrumbs on small screens. */
export function DocsSidebarMobile() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  // Close the drawer when the route changes so tapping a link navigates and dismisses.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold mb-3"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <span aria-hidden>≡</span> Docs menu
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 overflow-y-auto p-6"
            style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mb-4 text-[12px] font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕ Close
            </button>
            <DocsSidebar />
          </div>
        </div>
      )}
    </>
  );
}
