import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, var(--cam-primary-dk) 0%, var(--cam-primary) 60%, var(--cam-primary-dk) 100%)', color: '#FFFFFF' }}>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
      <SiteNav variant="light" />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="relative z-10 text-center max-w-md">
          {/* 404 */}
          <div className="font-mono text-8xl font-extrabold mb-4 tracking-tight" style={{ color: 'var(--cam-gold-leaf-lt)' }}>404</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-3">Page not found</h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.8)' }}>
            The page you are looking for does not exist or has been moved.
          </p>

          {/* Navigation links — single gold CTA + two outlined */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] transition-all rounded-full"
              style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
            >
              Go Home
            </Link>
            <Link
              to="/capra/prepare"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium transition-colors rounded-full"
              style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)' }}
            >
              Prepare
            </Link>
            <Link
              to="/lumora"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium transition-colors rounded-full"
              style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)' }}
            >
              Live Interview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
