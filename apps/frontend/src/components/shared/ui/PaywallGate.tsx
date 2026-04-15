import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PaywallGateProps {
  children: React.ReactNode;
  requiredPlan?: 'pro' | 'lifetime' | 'any_paid';
  feature?: string;
}

/**
 * Wraps a page or section that requires a paid plan.
 * Free users see an upgrade prompt instead of the content.
 */
export function PaywallGate({ children, requiredPlan = 'any_paid', feature = 'this feature' }: PaywallGateProps) {
  const { subscription, subscriptionLoading } = useAuth();

  if (subscriptionLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check access
  // Plans set by Lumora billing webhook: 'pro' (unlimited $79/mo) or 'lifetime' (8-pack $99)
  const hasAccess = subscription?.plan && subscription.plan !== 'free';

  if (hasAccess) {
    return <>{children}</>;
  }

  // Upgrade prompt
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">Upgrade to Access {feature}</h2>
        <p className="text-[var(--text-muted)] mb-6">
          This feature is available on Unlimited and 8-Pack plans. Upgrade to unlock unlimited AI questions, 3-approach coding solutions, system audio capture, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/pricing"
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all"
          >
            View Plans
          </Link>
          <Link
            to="/capra/practice"
            className="px-6 py-3 bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-sm rounded-xl hover:bg-[var(--border)] transition-all"
          >
            Continue Free
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">Free trial: 1 session (60 min), all AI features included</p>
      </div>
    </div>
  );
}
