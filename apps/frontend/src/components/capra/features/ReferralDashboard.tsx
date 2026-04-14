import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../../utils/authHeaders.js';
import ShareButtons from './ShareButtons';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface Referral {
  name: string;
  avatar?: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  code: string;
  link: string;
  total_invited: number;
  total_rewarded: number;
  rewards_earned: number;
  referrals: Referral[];
}

export default function ReferralDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`${API_URL}/api/referral/dashboard`, {
          headers: { ...getAuthHeaders() },
        });
        if (!res.ok) throw new Error('Failed to load referral data');
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  function handleCopyLink() {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="bg-white border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-100 rounded w-40" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="flex gap-4">
            <div className="h-20 bg-gray-100 rounded flex-1" />
            <div className="h-20 bg-gray-100 rounded flex-1" />
            <div className="h-20 bg-gray-100 rounded flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-0 rounded-2xl p-6 shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border-0 rounded-2xl p-6 space-y-6 shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Refer Friends, Earn Credits</h3>
        <p className="text-sm text-gray-500 mt-1">Share your link and earn credits when friends sign up.</p>
      </div>

      {/* Referral Link */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-mono truncate">
          {data.link}
        </div>
        <button
          onClick={handleCopyLink}
          className="shrink-0 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Share Buttons */}
      <ShareButtons link={data.link} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.total_invited}</p>
          <p className="text-xs text-gray-500 mt-1">Invited</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.total_rewarded}</p>
          <p className="text-xs text-gray-500 mt-1">Rewarded</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{data.rewards_earned}</p>
          <p className="text-xs text-gray-500 mt-1">Credits Earned</p>
        </div>
      </div>

      {/* Referral List */}
      {data.referrals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Referrals</h4>
          <div className="space-y-2">
            {data.referrals.map((ref, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 bg-gray-50 rounded-lg">
                {/* Avatar */}
                {ref.avatar ? (
                  <img src={ref.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">
                    {(ref.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ref.name || 'Anonymous'}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Status Badge */}
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  ref.status === 'rewarded'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {ref.status === 'rewarded' ? 'Rewarded' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
