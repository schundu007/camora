import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface PaywallGateProps {
  children: React.ReactNode;
  requiredPlan?: 'pro' | 'lifetime' | 'any_paid';
  feature?: string;
}

/**
 * Wraps a page or section that requires a paid plan.
 * Free users see an upgrade prompt instead of the content.
 * Handles post-checkout polling to wait for webhook sync.
 */
export function PaywallGate({ children, requiredPlan = 'any_paid', feature = 'this feature' }: PaywallGateProps) {
  const { token, subscription, subscriptionLoading, refreshSubscription } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  // Round-trip token: gated URL → /pricing?returnTo= → Stripe → back here.
  const returnTo = encodeURIComponent(location.pathname + location.search);

  const isCheckoutReturn = searchParams.get('checkout') === 'success';

  // Use AuthContext subscription (already fetched on mount)
  const plan = subscription?.plan || 'free';
  const hasAccess = plan !== 'free' && plan !== null && plan !== undefined && plan !== '';

  // After checkout success, poll for subscription activation (webhook may take a few seconds)
  const pollSubscription = useCallback(async () => {
    if (!token || !isCheckoutReturn || hasAccess || pollCount > 15) return;
    setPolling(true);
    try {
      const resp = await fetch(`${API_URL}/api/v1/billing/subscription`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        const newPlan = data.plan || 'free';
        if (newPlan !== 'free') {
          // Subscription activated — refresh auth context and stop polling
          refreshSubscription?.();
          setPolling(false);
          return;
        }
      }
    } catch { /* retry */ }
    setPollCount(c => c + 1);
  }, [token, isCheckoutReturn, hasAccess, pollCount, refreshSubscription]);

  useEffect(() => {
    if (!isCheckoutReturn || hasAccess) return;
    // Poll every 2 seconds for up to 30 seconds
    const timer = setInterval(pollSubscription, 2000);
    pollSubscription(); // immediate first check
    return () => clearInterval(timer);
  }, [isCheckoutReturn, hasAccess, pollSubscription]);

  // Loading states
  if (subscriptionLoading || (isCheckoutReturn && !hasAccess && pollCount <= 15)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        {isCheckoutReturn && (
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Activating your subscription...</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">This usually takes a few seconds</p>
          </div>
        )}
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Upgrade prompt
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--accent)] flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>Upgrade to Access {feature}</h2>
        <p className="text-[var(--text-muted)] mb-6 text-sm">
          This feature is available on paid plans. Upgrade to unlock unlimited AI questions, 3-approach coding solutions, system audio capture, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/pricing?returnTo=${returnTo}`}
            className="px-6 py-3 bg-[var(--accent)] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all"
          >
            View Plans
          </Link>
          <Link
            to="/capra/prepare"
            className="px-6 py-3 bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-sm rounded-xl hover:bg-[var(--border)] transition-all"
          >
            Continue Free
          </Link>
        </div>
        {pollCount > 15 && isCheckoutReturn && (
          <p className="mt-4 text-xs text-amber-500">Payment received but activation is delayed. Please refresh in a moment.</p>
        )}
      </div>
    </div>
  );
}
