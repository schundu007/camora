import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'questions' | 'sessions' | 'diagrams';
  used: number;
  limit: number;
  plan: string;
}

const TOP_UP_PACKS = [
  { id: 'topup_20q', label: '20 Questions', price: '$5', description: 'Quick top-up' },
  { id: 'topup_50q', label: '50 Questions', price: '$10', description: 'Best value' },
  { id: 'topup_5s', label: '5 Sessions', price: '$15', description: 'Full sessions' },
];

const TYPE_LABELS: Record<string, string> = {
  questions: 'questions',
  sessions: 'sessions',
  diagrams: 'diagrams',
};

const NEXT_PLAN: Record<string, { name: string; benefits: string[] }> = {
  free: {
    name: 'Pro',
    benefits: ['Unlimited AI questions', '3-approach coding solutions', 'Architecture diagrams', 'Priority support'],
  },
  pro: {
    name: 'Lifetime',
    benefits: ['Everything in Pro', 'Lifetime access', 'No monthly fees', 'All future features'],
  },
  lifetime: {
    name: 'Lifetime',
    benefits: ['You have the best plan!'],
  },
};

export function UsageLimitModal({ isOpen, onClose, type, used, limit, plan }: UsageLimitModalProps) {
  const { token } = useAuth();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 100;
  const typeLabel = TYPE_LABELS[type] || type;
  const upgrade = NEXT_PLAN[plan] || NEXT_PLAN['free'];

  async function handleBuy(packId: string) {
    if (!token) return;
    setBuyingId(packId);
    try {
      const res = await fetch(`${API_URL}/api/v1/usage/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pack_id: packId,
          success_url: window.location.href,
          cancel_url: window.location.href,
        }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl animate-[scaleIn_200ms_ease-out] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Usage bar at top */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{typeLabel} used</span>
            <span className="text-sm font-bold text-red-600">{used}/{limit}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Heading */}
        <div className="px-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900 font-display">
            You've reached your monthly limit
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You've used all {limit} {typeLabel} included in your <span className="font-semibold capitalize">{plan}</span> plan this month.
            Upgrade or grab a top-up to keep going.
          </p>
        </div>

        {/* Two-column options */}
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upgrade card */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm font-bold text-emerald-800">Upgrade your plan</span>
            </div>
            <p className="text-xs text-emerald-700 mb-2 font-semibold">
              {upgrade.name} plan includes:
            </p>
            <ul className="text-xs text-emerald-600 space-y-1 mb-4 flex-1">
              {upgrade.benefits.map((b) => (
                <li key={b} className="flex items-start gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              onClick={onClose}
              className="block w-full text-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              View Plans
            </Link>
          </div>

          {/* Top-up card */}
          <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50/50 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-bold text-cyan-800">Top up</span>
            </div>
            <div className="space-y-2 flex-1">
              {TOP_UP_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between rounded-lg border border-cyan-200 bg-white px-3 py-2 hover:border-cyan-400 transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-800">{pack.label}</p>
                    <p className="text-[11px] text-gray-400">{pack.description}</p>
                  </div>
                  <button
                    onClick={() => handleBuy(pack.id)}
                    disabled={buyingId === pack.id}
                    className="px-3 py-1 text-xs font-bold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {buyingId === pack.id ? (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        ...
                      </span>
                    ) : (
                      <>{pack.price}</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
