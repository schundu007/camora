import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/authHeaders';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import ReferralDashboard from '../components/capra/features/ReferralDashboard';
import GamificationWidget from '../components/capra/features/GamificationWidget';
import BadgeGrid from '../components/capra/features/BadgeGrid';
import Leaderboard from '../components/capra/features/Leaderboard';

const BILLING_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'contributions', label: 'Contributions' },
];

/* ── Activity Heatmap ─────────────────────────────────── */
function ActivityHeatmap() {
  const [year, setYear] = useState('current');
  const weeks = 52;
  const days = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Generate placeholder data (will connect to real API later)
  const cells = Array.from({ length: weeks * 7 }, () => Math.random() > 0.85 ? Math.ceil(Math.random() * 4) : 0);
  const streakCurrent = cells.filter((_, i) => i > cells.length - 14).filter(v => v > 0).length;

  const getColor = (v: number) => {
    if (v === 0) return 'var(--bg-elevated)';
    if (v === 1) return 'rgba(38,97,156,0.2)';
    if (v === 2) return 'rgba(38,97,156,0.4)';
    if (v === 3) return 'rgba(38,97,156,0.6)';
    return 'rgba(38,97,156,0.85)';
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Activity</h3>
        <select value={year} onChange={e => setYear(e.target.value)} className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          <option value="current">Current</option>
          <option value="2025">2025</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5 min-w-[700px]">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 pr-2 pt-5">
            {days.map((d, i) => (
              <div key={i} className="h-[11px] text-[9px] text-[var(--text-muted)] leading-[11px]">{d}</div>
            ))}
          </div>
          {/* Weeks */}
          <div className="flex-1">
            {/* Month labels */}
            <div className="flex mb-1">
              {months.map(m => (
                <div key={m} className="flex-1 text-[9px] text-[var(--text-muted)]">{m}</div>
              ))}
            </div>
            <div className="flex gap-[2px]">
              {Array.from({ length: weeks }, (_, w) => (
                <div key={w} className="flex flex-col gap-[2px]">
                  {Array.from({ length: 7 }, (_, d) => {
                    const idx = w * 7 + d;
                    return (
                      <div key={d} className="w-[11px] h-[11px] rounded-[2px]" style={{ background: getColor(cells[idx] || 0) }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button className="text-xs text-[var(--text-muted)] px-3 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors">
          View recent activity
        </button>
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span>Current streak: <strong className="text-[var(--text-primary)]">{streakCurrent}</strong></span>
          <span>Longest streak: <strong className="text-[var(--text-primary)]">0</strong></span>
        </div>
      </div>
    </div>
  );
}

/* ── Subscription Card ────────────────────────────────── */
function SubscriptionCard() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BILLING_API}/api/v1/billing/subscription`, { headers: getAuthHeaders() });
        if (res.ok) setSub(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const openPortal = async () => {
    try {
      const res = await fetch(`${BILLING_API}/api/v1/billing/portal`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'No billing account found') {
          window.location.href = '/pricing';
        }
      }
    } catch { /* ignore */ }
  };

  if (loading) return <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(56,189,248,0.12)' }}><div className="h-5 bg-[var(--bg-elevated)] rounded w-40" /></div>;

  const endDate = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(38,97,156,0.04)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Subscription</h3>
        {endDate && sub?.status === 'active' && (
          <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ color: 'var(--text-muted)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            Your access to premium content will end on {endDate}
          </span>
        )}
      </div>
      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{sub?.plan_type ? sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1) : 'Free'}</span>
        <div className="flex items-center gap-3">
          <button onClick={openPortal} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors font-medium">
            Subscription Details
          </button>
          {sub?.status === 'active' && (
            <button onClick={openPortal} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-200 transition-colors font-medium">
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Profile Settings ─────────────────────────────────── */
function ProfileSettings() {
  const [theme, setTheme] = useState('Light');
  const [language, setLanguage] = useState('Python');

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
      <div className="px-5 py-3" style={{ background: 'rgba(38,97,156,0.04)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Profile settings</h3>
      </div>
      <div className="divide-y divide-[var(--border)]">
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary)]">Theme</span>
          <select value={theme} onChange={e => setTheme(e.target.value)} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] min-w-[180px]">
            <option>Light</option>
            <option>Dark</option>
          </select>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary)]">Language preference</span>
          <select value={language} onChange={e => setLanguage(e.target.value)} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] min-w-[180px]">
            {['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'C#', 'Ruby', 'Swift', 'Kotlin'].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Account ───────────────────────────────────── */
function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const { logout } = useAuth();

  const handleDelete = async () => {
    try {
      const res = await fetch(`${CAPRA_API}/api/v1/auth/account`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) { logout(); window.location.href = '/'; }
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
      <div className="px-5 py-3" style={{ background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
        <h3 className="text-base font-bold text-red-600" style={{ fontFamily: 'var(--font-display)' }}>Delete Account</h3>
      </div>
      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">Once you delete your account, there is no going back.</span>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-200 transition-colors font-medium">
            Delete your account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="text-xs px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">
              Confirm Delete
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] font-medium">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Contributions Tab ────────────────────────────────── */
function ContributionsTab() {
  const [contributions] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
        <div className="px-5 py-3" style={{ background: 'rgba(38,97,156,0.04)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
          <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Problem Contributions</h3>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              Share real interview questions you've encountered to help the community and earn 30% off your next payment per approved contribution.
            </p>
            <Link to="/capra/practice" className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors font-medium whitespace-nowrap">
              Contribute a Question
            </Link>
          </div>
          {/* Table */}
          <div className="rounded-xl overflow-hidden border border-[var(--border)]">
            <div className="grid grid-cols-5 gap-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-elevated)]" style={{ fontFamily: 'var(--font-mono)' }}>
              <div className="px-4 py-2.5">Company</div>
              <div className="px-4 py-2.5">Role Level</div>
              <div className="px-4 py-2.5">Round Type</div>
              <div className="px-4 py-2.5">Status</div>
              <div className="px-4 py-2.5">Submitted</div>
            </div>
            {contributions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                You haven't contributed any questions yet
              </div>
            ) : (
              contributions.map((c, i) => (
                <div key={i} className="grid grid-cols-5 gap-0 text-sm border-t border-[var(--border)]">
                  <div className="px-4 py-2.5 text-[var(--text-primary)]">{c.company}</div>
                  <div className="px-4 py-2.5 text-[var(--text-muted)]">{c.role_level}</div>
                  <div className="px-4 py-2.5 text-[var(--text-muted)]">{c.round_type}</div>
                  <div className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'approved' ? 'bg-green-50 text-green-600' : c.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>{c.status}</span></div>
                  <div className="px-4 py-2.5 text-[var(--text-muted)]">{c.submitted}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const activeTab = params.get('tab') || 'general';

  const setTab = useCallback((tab: string) => {
    setParams(tab === 'general' ? {} : { tab });
  }, [setParams]);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = 'Profile — Camora'; return () => { document.title = 'Camora'; }; }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page, #F0F7FF)' }}>
      <SiteNav variant="light" />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20 flex-1">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8" style={{ fontFamily: 'var(--font-display)' }}>Profile</h1>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8 border-b border-[var(--border)]">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === t.key ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {t.label}
              {activeTab === t.key && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
              <div className="px-5 py-3" style={{ background: 'rgba(38,97,156,0.04)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
                <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Account Information</h3>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Email</span>
                <span className="text-sm text-[var(--text-muted)] px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] min-w-[240px]">{user?.email || '—'}</span>
              </div>
            </div>

            <ActivityHeatmap />
            <SubscriptionCard />
            <ProfileSettings />
            <DeleteAccount />
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <GamificationWidget />
            <BadgeGrid />
            <Leaderboard />
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Invite section */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 1px 4px rgba(56,189,248,0.06)' }}>
              <div className="px-5 py-3" style={{ background: 'rgba(38,97,156,0.04)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
                <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Invite Friends to Get Free Access</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  For each friend that signs up and subscribes to Camora from your invite link, you get 30% off your next invoice and they get 30% off any plan.
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {['Each successful referral gives you 30% off your next invoice', 'Discounts stack across multiple billing cycles', 'Your friends also get 30% off their subscription'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Referral Dashboard (existing component) */}
            <ReferralDashboard />
          </div>
        )}

        {activeTab === 'contributions' && <ContributionsTab />}
      </div>

      <SiteFooter variant="light" />
    </div>
  );
}
