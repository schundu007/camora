import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF', color: 'var(--text-primary)' }}>
      <SiteNav variant="light" />

      {/* Content */}
      <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="relative z-10 text-center max-w-md">
          {/* 404 */}
          <div className="font-mono text-8xl font-extrabold text-[var(--text-muted)] mb-4 tracking-tight">404</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-3">Page not found</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-10">
            The page you are looking for does not exist or has been moved.
          </p>

          {/* Navigation links */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors rounded-lg"
            >
              Go Home
            </Link>
            <Link
              to="/capra/prepare"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors rounded-lg"
            >
              Prepare
            </Link>
            <Link
              to="/lumora"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors rounded-lg"
            >
              Live Interview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
