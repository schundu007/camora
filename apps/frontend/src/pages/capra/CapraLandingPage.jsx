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
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'linear-gradient(180deg, var(--cam-primary-dk) 0%, var(--cam-primary) 60%, var(--cam-primary-dk) 100%)' }}>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
      <div className="relative text-center max-w-md px-6">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--cam-gold-leaf)', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--cam-primary-dk)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Capra</h1>
        <p className="mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>Interview preparation powered by AI</p>
        <Link
          to="/capra/prepare"
          className="inline-flex items-center gap-2 px-7 py-3 font-bold uppercase tracking-[0.06em] text-sm rounded-full transition-all hover:scale-[1.02]"
          style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
