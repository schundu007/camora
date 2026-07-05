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
  { label: 'My applications', href: '/jobsearch/applications' },
  { label: 'Job profile', href: '/profile?tab=job-profile' },
];

export default function JobsSubNav() {
  const { isAuthenticated } = useAuth();
  const { pathname, search } = useLocation();

  if (!isAuthenticated) return null;

  // Path-only links match by prefix (/jobs also covers /jobs/:id/*). Links
  // with a ?tab= (the Job Profile tab inside /profile) match path + tab.
  const isActive = (href: string) => {
    const [path, qs] = href.split('?');
    if (qs) {
      const want = new URLSearchParams(qs).get('tab');
      return pathname === path && new URLSearchParams(search).get('tab') === want;
    }
    return pathname === path || pathname.startsWith(path + '/');
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
