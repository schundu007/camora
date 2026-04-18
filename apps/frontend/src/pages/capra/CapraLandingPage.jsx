import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CamoraLogo from '../../components/shared/CamoraLogo';

export default function CapraLandingPage() {
  const { loading } = useAuth();

  useEffect(() => {
    document.title = 'Interview Prep | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  // Wait for auth to initialize before deciding what to show
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[var(--text-secondary)]">Loading...</span>
        </div>
      </div>
    );
  }

  // Capra landing — redirect to dashboard or show sign-in prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-elevated)]">
      <div className="text-center max-w-md px-6">
        <div className="w-12 h-12 bg-[var(--accent)] rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Capra</h1>
        <p className="text-[var(--text-muted)] mb-6">Interview preparation powered by AI</p>
        <Link
          to="/capra/prepare"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm rounded-lg transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
