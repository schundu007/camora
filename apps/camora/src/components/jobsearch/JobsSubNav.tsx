import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Sub-navigation for the "Apply" section — ties the job feed, the application
 * tracker, and the job-seeker profile together so they're discoverable from
 * one another instead of being isolated URL-only pages.
 *
 * Rendered directly under <SiteNav /> on /jobs, /jobsearch/applications, and
 * /jobsearch/profile. Only shown to signed-in users (the tracker/profile are
 * auth-gated); it stays out of the way for anonymous visitors browsing /jobs.
 */

const TABS = [
  { label: 'Browse jobs', href: '/jobs' },
  { label: 'My applications', href: '/jobs/applications' },
  { label: 'Job profile', href: '/jobs/profile' },
];

export default function JobsSubNav() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  if (!isAuthenticated) return null;

  const isActive = (href: string) => {
    if (href === '/jobs') {
      // Feed + job detail (/jobs/:id/*), but NOT the sibling sub-pages.
      return pathname === '/jobs'
        || (pathname.startsWith('/jobs/')
            && !pathname.startsWith('/jobs/applications')
            && !pathname.startsWith('/jobs/profile'));
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto"
        aria-label="Jobs sections"
      >
        {TABS.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              to={t.href}
              className="flex items-center whitespace-nowrap px-3 h-11 text-[13px] font-semibold no-underline transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
