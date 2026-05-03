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
          credentials: 'include',
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
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[var(--bg-elevated)] rounded w-40" />
          <div className="h-10 bg-[var(--bg-elevated)] rounded" />
          <div className="flex gap-4">
            <div className="h-20 bg-[var(--bg-elevated)] rounded flex-1" />
            <div className="h-20 bg-[var(--bg-elevated)] rounded flex-1" />
            <div className="h-20 bg-[var(--bg-elevated)] rounded flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl p-6 space-y-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Refer Friends, Earn Credits</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">Share your link and earn credits when friends sign up.</p>
      </div>

      {/* Referral Link */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-secondary)] font-mono truncate">
          {data.link}
        </div>
        <button
          onClick={handleCopyLink}
          className="shrink-0 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Share Buttons */}
      <ShareButtons link={data.link} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.08)' }}>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{data.total_invited}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Invited</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,189,248,0.08)' }}>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{data.total_rewarded}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Rewarded</p>
        </div>
        <div className="bg-[var(--accent)]/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--accent)]">{data.rewards_earned}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Credits Earned</p>
        </div>
      </div>

      {/* Referral List */}
      {data.referrals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Your Referrals</h4>
          <div className="space-y-2">
            {data.referrals.map((ref, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 bg-[var(--bg-elevated)] rounded-lg">
                {/* Avatar */}
                {ref.avatar ? (
                  <img src={ref.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                    {(ref.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{ref.name || 'Anonymous'}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Status Badge */}
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  ref.status === 'rewarded'
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
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
