import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 relative" style={{ background: 'var(--cam-hero-bg)' }}>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
      <div className="relative w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--cam-gold-leaf-lt)' }} />
      <p className="relative text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Setting up your referral...</p>
    </div>
  );
}
