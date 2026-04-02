import { useAuth } from '../../../contexts/AuthContext';

/**
 * Credit Balance - Slack style
 */
export default function CreditBalance({ onUpgrade, compact = false }) {
  const { isAuthenticated } = useAuth();

  // Credits/subscription not yet wired to AuthContext — hide for now
  if (!isAuthenticated) {
    return null;
  }

  const credits = null;
  const subscription = null;
  const usage = null;

  const balance = credits?.balance ?? 0;
  const planType = subscription?.plan_type ?? 'free';

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className="slack-btn slack-btn-secondary"
        style={{ height: '32px', padding: '0 12px', gap: '8px' }}
      >
        <svg className="w-4 h-4" fill="none" stroke={balance > 0 ? 'var(--accent-green)' : 'var(--accent-red)'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span style={{ color: balance > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>{balance}</span>
        <span style={{ color: 'var(--text-muted)' }}>credits</span>
      </button>
    );
  }

  return (
    <div className="slack-card" style={{ padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-heading">Credits</span>
        {planType !== 'free' && (
          <span className="slack-badge slack-badge-primary">{planType.toUpperCase()}</span>
        )}
      </div>

      <div className="text-center py-4 rounded-lg mb-3" style={{ background: balance > 0 ? 'var(--accent-green-bg)' : 'rgba(224, 30, 90, 0.1)' }}>
        <div className="text-title" style={{ fontSize: '2.25rem', color: balance > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{balance}</div>
        <div className="text-caption">Available</div>
      </div>

      {usage && (
        <div className="mb-3 space-y-2">
          <div className="flex justify-between items-center text-sm"><span style={{ color: '#666' }}>Coding</span><span style={{ color: usage.coding?.remaining > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{usage.coding?.remaining ?? 0} left</span></div>
          <div className="flex justify-between items-center text-sm"><span style={{ color: '#666' }}>System Design</span><span style={{ color: usage.systemDesign?.remaining > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{usage.systemDesign?.remaining ?? 0} left</span></div>
          <div className="flex justify-between items-center text-sm"><span style={{ color: '#666' }}>Company Prep</span><span style={{ color: usage.companyPrep?.remaining > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{usage.companyPrep?.remaining ?? 0} left</span></div>
          <div className="flex justify-between items-center text-sm"><span style={{ color: '#666' }}>Interview</span><span style={{ color: usage.interview?.remaining > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{Math.round((usage.interview?.remaining ?? 0) / 60 * 10) / 10} hrs left</span></div>
        </div>
      )}

      {balance === 0 && !usage && (
        <div className="p-3 rounded-lg mb-3 flex items-center gap-2" style={{ background: 'rgba(224, 30, 90, 0.1)' }}>
          <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-caption" style={{ color: 'var(--accent-red)' }}>No credits remaining</span>
        </div>
      )}

      <button onClick={onUpgrade} className="slack-btn slack-btn-primary w-full">{balance === 0 ? 'Get Credits' : 'Manage Plan'}</button>

      {credits && (
        <div className="mt-3 pt-3 flex justify-between text-tiny" style={{ borderTop: '1px solid var(--border-default)' }}>
          <span>Earned: {credits.lifetime_earned}</span>
          <span>Used: {credits.lifetime_used}</span>
        </div>
      )}
    </div>
  );
}
