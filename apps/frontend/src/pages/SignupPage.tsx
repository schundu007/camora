import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';

export default function SignupPage() {
  useEffect(() => {
    document.title = 'Sign Up | Camora';
    return () => { document.title = 'Camora'; };
  }, []);
  const googleAuthUrl = `${import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com'}/api/auth/google/login`;

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <SEO title="Sign Up" description="Create your free Camora account. Start preparing for technical interviews with AI." path="/signup" />
      <SiteNav />

      <div className="flex items-center justify-center px-4" style={{ minHeight: '100vh', paddingTop: '80px' }}>
        <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>

          {/* Header */}
          <h1 className="text-xl font-bold tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
          <p className="mt-1 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Get started with Camora — free, no credit card.</p>

          {/* OAuth buttons */}
          <div className="mt-6 space-y-3">
            <a href={googleAuthUrl}
               className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium cursor-not-allowed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub — Coming Soon
            </button>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium cursor-not-allowed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn — Coming Soon
            </button>
          </div>

          {/* What you get */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Free account includes</p>
            <div className="space-y-2">
              {['3 live interview sessions', 'Browse all 415+ prep topics', 'Mock interview practice'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-4 h-4 text-[var(--accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--accent)] hover:opacity-80 font-semibold">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
