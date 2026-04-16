import { Link } from 'react-router-dom';
import CamoraLogo from '../components/shared/CamoraLogo';
import SiteNav from '../components/shared/SiteNav';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100">
      <SiteNav />

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        {/* Subtle grid background */}
        <div className="fixed inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative z-10 text-center max-w-md">
          {/* Hexagonal logo */}
          <div className="flex justify-center mb-10">
            <CamoraLogo size={48} />
          </div>

          {/* 404 */}
          <div className="font-mono text-8xl font-extrabold text-gray-800 mb-4 tracking-tight">404</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-3">Page not found</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-10">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium text-gray-400 border border-white/[0.08] hover:text-white hover:border-white/[0.15] transition-colors"
            >
              Prepare
            </Link>
            <Link
              to="/lumora"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium text-gray-400 border border-white/[0.08] hover:text-white hover:border-white/[0.15] transition-colors"
            >
              Live Interview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
