import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ReferralLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem('camora_referral_code', code);
    }
    navigate('/signup', { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Setting up your referral...</p>
    </div>
  );
}
