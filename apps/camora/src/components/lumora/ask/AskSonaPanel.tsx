/**
 * AskSonaPanel — AskLayout plus its access gate.
 *
 * Lifted out of the Capra Practice page when Ask Sona moved to Lumora
 * (/lumora/ask), so the surface owns its own paywall instead of the host page
 * carrying credit state for it. Owners and paid plans go straight through;
 * free users need AI-hour credits, which are fetched once on mount.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isOwner } from '../../../lib/owner';
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const AskLayout = lazy(() => import('./AskLayout').then(m => ({ default: m.AskLayout })));

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const Spinner = () => (
  <div className="flex-1 flex items-center justify-center h-full">
    <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AskSonaPanel = () => {
  const { user, subscription } = useAuth() as any;
  const [credits, setCredits] = useState<number | null>(null);

  const privileged = isOwner(user) || !!(subscription?.plan && subscription.plan !== 'free');

  useEffect(() => {
    if (privileged || !user) return;
    setCredits(null);
    fetch(`${API_URL}/api/credits`, { headers: { ...getAuthHeaders() } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => setCredits(typeof data.balance === 'number' ? data.balance : 0))
      .catch(() => setCredits(0));
  }, [privileged, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  if (privileged || (credits !== null && credits > 0)) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<Spinner />}>
          <AskLayout />
        </Suspense>
      </div>
    );
  }

  // Credits still in flight — don't flash the upsell at someone who has hours.
  if (credits === null) return <div className="flex-1 min-h-0 overflow-hidden"><Spinner /></div>;

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center px-6 py-16" style={{ background: 'var(--bg-surface)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.25)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cam-gold-leaf-lt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ask Sona</h2>
        <p className="text-sm mb-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Get instant AI answers to any interview question. AI hours are consumed per conversation.
        </p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
          You have {credits !== null ? credits.toFixed(1) : '0'} AI hours remaining
        </p>
        <a
          href="/pricing#ai-hours"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--cam-gold-leaf)', color: '#020617' }}
        >
          Buy AI Hours
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </a>
      </div>
    </div>
  );
};

export default AskSonaPanel;
