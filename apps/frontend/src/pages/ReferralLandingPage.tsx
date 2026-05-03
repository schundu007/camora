import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';

/**
 * ReferralLandingPage — captures a referral code from /r/:code, stashes it
 * for sign-up attribution, and redirects to the login flow. The visible
 * surface is a brief loading state on the dark hero substrate so the
 * brand chrome stays consistent with the rest of the marketing pages.
 */
export default function ReferralLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Refer Friends | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  useEffect(() => {
    if (code) {
      localStorage.setItem('camora_referral_code', code);
    }
    navigate('/login?redirect=/capra/prepare', { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A1228] text-white font-sans">
      <SiteNav />
      <div className="relative flex-1 flex flex-col items-center justify-center gap-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.10), transparent 60%),' +
              'radial-gradient(ellipse 55% 60% at 12% 30%, rgba(201,162,39,0.18), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 88% 70%, rgba(38,97,156,0.30), transparent 60%)',
          }}
        />
        <div
          className="relative h-12 w-12 animate-spin rounded-full border-4 border-white/15"
          style={{ borderTopColor: 'var(--cam-gold-leaf-lt)' }}
          aria-hidden="true"
        />
        <p className="relative font-mono text-[12px] uppercase tracking-[0.18em] text-white/70">
          Setting up your referral
        </p>
      </div>
    </div>
  );
}
