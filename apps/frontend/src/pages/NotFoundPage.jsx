import { useState } from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Apply', href: '/jobs', external: false },
  { label: 'Prepare', href: '/capra/prepare', external: false },
  { label: 'Practice', href: '/capra/practice', external: false },
  { label: 'Attend', href: '/lumora', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
];

export default function NotFoundPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <span className="text-[10px] font-black text-white tracking-tight">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Camora</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white transition-colors">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-white transition-colors">{link.label}</Link>
              )
            )}
          </div>
          <Link to="/lumora" className="hidden md:inline-block px-4 py-1.5 text-[13px] font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
            Launch App
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              }
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#09090b] px-6 py-4 space-y-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} className="block py-2 text-sm text-gray-400">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="block py-2 text-sm text-gray-400"
                      onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              )
            )}
            <Link to="/lumora" className="block py-2 text-sm text-emerald-400 font-medium"
                  onClick={() => setMobileMenuOpen(false)}>Launch App</Link>
          </div>
        )}
      </nav>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-14">
        {/* Subtle grid background */}
        <div className="fixed inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative z-10 text-center max-w-md">
          {/* Hexagonal logo */}
          <div className="flex justify-center mb-10">
            <div className="w-14 h-14 bg-emerald-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <span className="text-lg font-black text-white tracking-tight">C</span>
            </div>
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
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
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
