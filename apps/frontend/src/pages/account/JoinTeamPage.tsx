import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';

const API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

type Status = 'pending' | 'accepting' | 'success' | 'error';

const ERROR_COPY: Record<string, string> = {
  INVITE_NOT_FOUND: "We couldn't find that invite. The link may be wrong or the invite was cancelled.",
  INVITE_USED: 'This invite has already been used.',
  INVITE_EXPIRED: 'This invite has expired. Ask the team owner for a fresh one.',
  ALREADY_IN_TEAM: 'You are already in another team. Leave that team before joining a new one.',
  SEAT_LIMIT: 'This team is full. The owner needs to remove a member or upgrade their plan.',
};

export default function JoinTeamPage() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const { token: authToken, isAuthenticated, isLoading, refreshTeam } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('pending');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Join team — Camora';
  }, []);

  useEffect(() => {
    // Wait for auth to settle. If not authenticated, redirect to login with
    // a returnTo so the user lands back here after signing in.
    if (isLoading) return;
    if (!isAuthenticated || !authToken) {
      const returnTo = encodeURIComponent(`/teams/join/${inviteToken}`);
      navigate(`/login?returnTo=${returnTo}`, { replace: true });
      return;
    }
    if (!inviteToken) { setStatus('error'); setErrorCode('INVITE_NOT_FOUND'); return; }

    let cancelled = false;
    (async () => {
      setStatus('accepting');
      try {
        const res = await fetch(`${API}/api/v1/teams/invites/${inviteToken}/accept`, {
          credentials: 'include',
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setStatus('success');
          // Refresh AuthContext team state so PaywallGate unlocks for this user.
          refreshTeam?.();
          // Land them on the team settings page after a brief celebratory pause.
          setTimeout(() => navigate('/account/team', { replace: true }), 1500);
        } else {
          setStatus('error');
          setErrorCode(data.code || 'UNKNOWN');
          setErrorMsg(data.error || null);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');
        setErrorCode('NETWORK');
        setErrorMsg(err instanceof Error ? err.message : 'Network error');
      }
    })();
    return () => { cancelled = true; };
  }, [inviteToken, authToken, isAuthenticated, isLoading, navigate, refreshTeam]);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'linear-gradient(180deg, var(--cam-primary-dk) 0%, var(--cam-primary) 60%, var(--cam-primary-dk) 100%)', color: '#FFFFFF' }}>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
      <SEO title="Join team" description="Accept your invite to join a Camora team." path={`/teams/join/${inviteToken}`} />
      <SiteNav variant="light" />

      <main className="relative flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          {(status === 'pending' || status === 'accepting' || isLoading) && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Joining team…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5}>
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">You're in!</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Welcome to the team. Taking you to your team page…
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" strokeLinecap="round" />
                  <path d="M12 16h.01" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">Couldn't join the team</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {(errorCode && ERROR_COPY[errorCode]) || errorMsg || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/account/team" className="px-5 py-2.5 text-sm font-bold rounded-lg text-white" style={{ background: 'var(--accent)' }}>Go to my team</Link>
                <Link to="/" className="px-5 py-2.5 text-sm font-bold rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Back to home</Link>
              </div>
            </>
          )}
        </div>
      </main>

      <SiteFooter variant="light" />
    </div>
  );
}
