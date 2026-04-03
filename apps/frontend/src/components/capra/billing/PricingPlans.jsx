import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

export default function PricingPlans({ isOpen, onClose }) {
  const { token: authToken, user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    const timer = setTimeout(() => { dialogRef.current?.focus(); }, 0);
    return () => { clearTimeout(timer); previousFocusRef.current?.focus(); };
  }, [isOpen]);

  const handleFocusTrap = useCallback((e) => {
    if (!dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  if (!isOpen) return null;

  const plans = [
    { id: 'monthly', name: 'Interview Ready', price: '$29', period: '/mo', popular: false, features: ['All 300+ DSA topics', '15 system design problems', '100 AI questions/day', '5 mock interviews/month', '3 company preps'] },
    { id: 'quarterly_pro', name: 'FAANG Track', price: '$59', period: '/mo', popular: true, features: ['Everything in Interview Ready', 'Unlimited system design + diagrams', 'Unlimited AI questions', 'All company preps', '3 Lumora live sessions'] },
    { id: 'desktop_lifetime', name: 'Elite', price: '$99', period: '/mo', popular: false, isDesktop: true, features: ['Everything in FAANG Track', '5 Lumora live sessions', 'Custom weekly study plan', 'AI resume review', 'Priority support', 'Desktop app early access'] },
  ];

  const handleSubscribe = async (planId) => {
    if (!user) { window.location.href = '/login'; return; }
    setLoading(planId);
    setError('');
    try {
      const token = authToken;
      if (!token) throw new Error('Please sign in first');
      const pricesRes = await fetch(`${API_URL}/api/billing/prices`);
      const prices = await pricesRes.json();
      const priceId = prices[planId]?.priceId;
      if (!priceId) throw new Error('Invalid plan');
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceId, successUrl: `${window.location.origin}?checkout=success&plan=${planId}`, cancelUrl: `${window.location.origin}?checkout=canceled` }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to create checkout'); }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) { setError(err.message); setLoading(null); }
  };

  const handleManageSubscription = async () => {
    setLoading('portal');
    setError('');
    try {
      const token = authToken;
      if (!token) throw new Error('Please sign in first');
      const res = await fetch(`${API_URL}/api/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to open portal'); }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) { setError(err.message); setLoading(null); }
  };

  const hasActiveSubscription = false; // TODO: wire up subscription status from backend

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} aria-hidden="true">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pricing-dialog-title" tabIndex={-1} onKeyDown={handleFocusTrap} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg focus:outline-none" style={{ background: '#ffffff', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', border: '1px solid #e5e5e5' }}>
        <button onClick={onClose} aria-label="Close pricing dialog" className="absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10" style={{ color: '#666', background: '#f5f5f5' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e5e5'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: '#10b981' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h2 id="pricing-dialog-title" className="text-xl font-bold" style={{ color: '#000' }}>Crack Interview with Pro Plans</h2>
          </div>

          {hasActiveSubscription && (
            <div className="mb-5 p-4 rounded-lg flex items-center justify-between" style={{ background: '#f0fdf4', border: '1px solid #10b981' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
                  <svg className="w-4 h-4" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#059669' }}>Active {subscription.plan_type}</p>
                  <p className="text-xs" style={{ color: '#666' }}>{subscription.cancel_at_period_end ? 'Cancels at period end' : `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}</p>
                </div>
              </div>
              <button onClick={handleManageSubscription} disabled={loading === 'portal'} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#fff', color: '#000', border: '1px solid #e5e5e5' }}>{loading === 'portal' ? '...' : 'Manage'}</button>
            </div>
          )}

          {!hasActiveSubscription && (
            <div className="grid md:grid-cols-3 gap-4 mb-5">
              {plans.map((plan) => (
                <div key={plan.id} className="relative rounded-lg p-5" style={{ background: plan.popular ? '#fafafa' : plan.isDesktop ? '#f5f3ff' : '#fff', border: plan.popular ? '2px solid #10b981' : plan.isDesktop ? '2px solid #8b5cf6' : '1px solid #e5e5e5' }}>
                  {plan.popular && <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: '#10b981', color: 'white' }}>POPULAR</div>}
                  {plan.isDesktop && <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: '#8b5cf6', color: 'white' }}>PREMIUM</div>}
                  <h3 className="font-bold mb-2" style={{ color: '#000' }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3"><span className="text-3xl font-bold" style={{ color: '#000' }}>{plan.price}</span><span className="text-sm" style={{ color: '#666' }}>{plan.period}</span></div>
                  <div className="space-y-1 mb-4 text-sm" style={{ color: '#333' }}>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" style={{ color: plan.isDesktop ? '#8b5cf6' : '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleSubscribe(plan.id)} disabled={loading !== null} className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ background: plan.popular ? '#10b981' : plan.isDesktop ? '#8b5cf6' : '#fff', color: plan.popular || plan.isDesktop ? '#fff' : '#000', border: plan.popular || plan.isDesktop ? 'none' : '1px solid #e5e5e5' }}>
                    {loading === plan.id ? 'Processing...' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-lg text-center" style={{ background: '#fafafa', border: '1px solid #e5e5e5' }}>
            <p className="text-sm font-medium" style={{ color: '#333' }}>30-day money-back guarantee on all plans</p>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg flex items-center gap-2" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <svg className="w-4 h-4" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <p className="mt-4 text-center text-xs" style={{ color: '#999' }}>Secure payment via Stripe. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
