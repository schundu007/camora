import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { dialogConfirm, dialogAlert } from '../components/shared/Dialog';

const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const EXCLUDE = 'chundubabu@gmail.com,babuchundu@gmail.com';

interface PathRow { path: string; views: string; unique_visitors: string }
interface DayRow { date: string; views: string; unique_visitors: string }
interface Stats {
  total_views: number;
  unique_visitors: number;
  by_path: PathRow[];
  by_day: DayRow[];
}

interface User {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  is_active: boolean;
  onboarding_completed: boolean;
  plan_type: string;
  plan_status: string;
  created_at: string;
  username: string | null;
  target_company: string | null;
  target_role: string | null;
  location: string | null;
  last_login_at: string | null;
  trial_ends_at: string | null;
  sub_plan: string | null;
  is_challenger: boolean | null;
}

interface Email {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string;
}

type Tab = 'analytics' | 'users' | 'emails';

function RefreshBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-all disabled:opacity-50 flex items-center gap-1.5">
      <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  );
}

export default function AnalyticsPage() {
  const { token, user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    document.title = 'Analytics | Camora';
    return () => { document.title = 'Camora'; };
  }, []);
  const validTabs: Tab[] = ['analytics', 'users', 'emails'];
  const tabParam = searchParams.get('tab') as Tab;
  const tab: Tab = validTabs.includes(tabParam) ? tabParam : 'analytics';
  const setTab = (t: Tab) => setSearchParams({ tab: t }, { replace: true });

  // Analytics state
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState('');
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [search, setSearch] = useState('');
  const [granting, setGranting] = useState<number | null>(null);
  const [trialError, setTrialError] = useState('');

  // Emails state
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsLoaded, setEmailsLoaded] = useState(false);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState('');

  // Admin check — hide page for non-admins
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/admin/users`, {
        credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setIsAdmin(r.ok); return r.ok ? r.json() : null; })
      .then(d => { if (d) { setUsers(d.users); setUsersLoaded(true); } })
      .catch(() => setIsAdmin(false));
  }, [token]);

  // Fetch analytics with abort controller to prevent race conditions
  const fetchAnalytics = useCallback(() => {
    if (!token) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const params = new URLSearchParams({ exclude_emails: EXCLUDE });
    if (days) params.set('days', days);
    fetch(`${API}/api/visitors/pageview-stats?${params}`, {
      credentials: 'include',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) { setStats(d); setLoading(false); } })
      .catch(err => { if (err.name !== 'AbortError') setLoading(false); });
  }, [days, token]);

  useEffect(() => {
    if (tab === 'analytics') fetchAnalytics();
    return () => abortRef.current?.abort();
  }, [tab, fetchAnalytics]);

  // Fetch users
  const fetchUsers = useCallback(() => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError('');
    fetch(`${API}/api/admin/users`, {
        credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(d => { setUsers(d.users); setUsersLoaded(true); setUsersLoading(false); })
      .catch(err => { setUsersError(err.message); setUsersLoading(false); });
  }, [token]);

  useEffect(() => {
    if (tab === 'users' && !usersLoaded) fetchUsers();
  }, [tab, usersLoaded, fetchUsers]);

  // Fetch emails
  const fetchEmails = useCallback(() => {
    if (!token) return;
    setEmailsLoading(true);
    setEmailsError('');
    fetch(`${API}/api/admin/emails?limit=100`, {
        credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(d => { setEmails(d.emails); setEmailsLoaded(true); setEmailsLoading(false); })
      .catch(err => { setEmailsError(err.message); setEmailsLoading(false); });
  }, [token]);

  useEffect(() => {
    if (tab === 'emails' && !emailsLoaded) fetchEmails();
  }, [tab, emailsLoaded, fetchEmails]);

  // Grant trial with confirmation + error handling
  async function grantTrial(userId: number, trialDays: number) {
    const user = users.find(u => u.id === userId);
    if (!(await dialogConfirm({ title: 'Grant trial?', message: `Grant ${trialDays}-day trial to ${user?.name || user?.email}?`, confirmLabel: 'Grant trial' }))) return;

    setGranting(userId);
    setTrialError('');
    try {
      const r = await fetch(`${API}/api/admin/grant-trial`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, days: trialDays }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to grant trial');
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, trial_ends_at: d.trial_ends_at } : u));
      }
    } catch (err: any) {
      setTrialError(`Failed for ${user?.email}: ${err.message}`);
    }
    setGranting(null);
  }

  // Delete user with confirmation
  async function deleteUser(userId: number) {
    const user = users.find(u => u.id === userId);
    if (!(await dialogConfirm({ title: `Delete ${user?.name || user?.email}?`, message: 'This will permanently remove the user and ALL their data. This cannot be undone.', confirmLabel: 'Continue', tone: 'danger' }))) return;
    if (!(await dialogConfirm({ title: 'Final confirmation', message: `Delete ${user?.email}? This action is irreversible.`, confirmLabel: 'Delete user', tone: 'danger' }))) return;

    try {
      const r = await fetch(`${API}/api/admin/delete-user/${userId}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to delete user');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      dialogAlert({ title: 'Delete failed', message: `Failed to delete user: ${err.message}`, tone: 'danger' });
    }
  }

  // Plan filter from summary cards
  const [planFilter, setPlanFilter] = useState<string>('');

  // Helper: determine user's effective plan category
  function getUserPlanCategory(u: User) {
    const isPaid = u.sub_plan === 'pro_monthly' || u.sub_plan === 'pro_yearly'
                || u.sub_plan === 'pro_max_monthly' || u.sub_plan === 'pro_max_yearly';
    if (isPaid) return 'paid';
    if (u.is_challenger) return 'challenger';
    if (u.trial_ends_at && new Date(u.trial_ends_at) > new Date()) return 'trial';
    return 'free';
  }

  // Filter users by search + plan filter
  let filteredUsers = users;
  if (planFilter) {
    filteredUsers = filteredUsers.filter(u => getUserPlanCategory(u) === planFilter);
  }
  if (search) {
    filteredUsers = filteredUsers.filter(u =>
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.target_company || '').toLowerCase().includes(search.toLowerCase())
    );
  }

  // User summary stats
  const totalUsers = users.length;
  const paidUsers = users.filter(u => getUserPlanCategory(u) === 'paid').length;
  const trialUsers = users.filter(u => getUserPlanCategory(u) === 'trial').length;
  const challengerUsers = users.filter(u => getUserPlanCategory(u) === 'challenger').length;
  const freeUsers = users.filter(u => getUserPlanCategory(u) === 'free').length;

  // Loading admin check
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="flex items-center justify-center py-32">
          <p className="text-[var(--text-muted)] text-lg">You don't have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="lg:max-w-[85%] mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Analytics, user management & emails</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 rounded-lg p-1 w-fit" style={{ background: 'var(--bg-elevated)' }}>
          {(['analytics', 'users', 'emails'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'users' ? `Users (${totalUsers})` : t === 'emails' ? `Emails (${emails.length})` : t}
            </button>
          ))}
        </div>

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <>
            <div className="flex items-center gap-2 mb-8">
              {['', '7', '30', '90'].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    days === d ? 'bg-[var(--accent)] text-[var(--text-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {d === '' ? 'All time' : `Last ${d} days`}
                </button>
              ))}
              <RefreshBtn onClick={fetchAnalytics} loading={loading} />
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
                    <p className="text-[var(--text-muted)] text-sm">Total Page Views</p>
                    <p className="text-4xl font-bold mt-1">{stats.total_views.toLocaleString()}</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
                    <p className="text-[var(--text-muted)] text-sm">Unique Visitors</p>
                    <p className="text-4xl font-bold mt-1 text-[var(--accent)]">{stats.unique_visitors.toLocaleString()}</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold mb-4">By Page</h2>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden mb-10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-sm">
                        <th className="px-5 py-3">Path</th>
                        <th className="px-5 py-3 text-right">Views</th>
                        <th className="px-5 py-3 text-right">Unique Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_path.map(row => (
                        <tr key={row.path} className="border-b border-[var(--border)]/50 hover:bg-[var(--border)]/30">
                          <td className="px-5 py-3 font-mono text-sm text-[var(--accent)]">{row.path}</td>
                          <td className="px-5 py-3 text-right">{parseInt(row.views).toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-semibold">{parseInt(row.unique_visitors).toLocaleString()}</td>
                        </tr>
                      ))}
                      {stats.by_path.length === 0 && (
                        <tr><td colSpan={3} className="px-5 py-8 text-center text-[var(--text-muted)]">No data yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <h2 className="text-xl font-semibold mb-4">By Day</h2>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-sm">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Views</th>
                        <th className="px-5 py-3 text-right">Unique Visitors</th>
                        <th className="px-5 py-3 text-right w-48">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_day.map(row => {
                        const maxViews = Math.max(...stats.by_day.map(d => parseInt(d.views)));
                        const pct = maxViews > 0 ? (parseInt(row.views) / maxViews) * 100 : 0;
                        return (
                          <tr key={row.date} className="border-b border-[var(--border)]/50 hover:bg-[var(--border)]/30">
                            <td className="px-5 py-3 text-sm">{new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                            <td className="px-5 py-3 text-right">{parseInt(row.views).toLocaleString()}</td>
                            <td className="px-5 py-3 text-right font-semibold">{parseInt(row.unique_visitors).toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2">
                                <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {stats.by_day.length === 0 && (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-[var(--text-muted)]">No data yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-[var(--text-muted)]">Failed to load analytics. Backend may need redeployment.</p>
            )}
          </>
        )}

        {/* ── Users Tab ── */}
        {tab === 'users' && (
          <>
            {/* Summary cards */}
            {usersLoaded && (
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[
                  { label: 'Total Users', value: totalUsers, color: 'text-[var(--text-primary)]', filter: '' },
                  { label: 'Paid', value: paidUsers, color: 'text-[var(--accent)]', filter: 'paid' },
                  { label: 'Trial', value: trialUsers, color: 'text-[var(--accent)]', filter: 'trial' },
                  { label: 'Challenger', value: challengerUsers, color: 'text-[var(--accent)]', filter: 'challenger' },
                  { label: 'Free', value: freeUsers, color: 'text-[var(--text-muted)]', filter: 'free' },
                ].map(c => (
                  <button key={c.label} onClick={() => setPlanFilter(planFilter === c.filter ? '' : c.filter)}
                    className={`bg-[var(--bg-surface)] border rounded-xl p-4 text-left transition-all ${
                      planFilter === c.filter ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30' : 'border-[var(--border)] hover:border-[var(--border)]'
                    }`}>
                    <p className="text-[var(--text-muted)] text-xs">{c.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Search + Refresh */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, location, company..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <RefreshBtn onClick={() => { setUsersLoaded(false); fetchUsers(); }} loading={usersLoading} />
            </div>

            {trialError && (
              <p className="text-red-400 text-sm mb-3">{trialError}</p>
            )}

            {usersLoading && !usersLoaded ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : usersError ? (
              <p className="text-red-400">{usersError}</p>
            ) : (
              <>
                <p className="text-[var(--text-muted)] text-xs mb-2">{filteredUsers.length} of {users.length} users{search && ` matching "${search}"`}</p>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Last Login</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--border)]/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold">
                                  {(u.name || u.email)[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{u.name || '—'}</p>
                                {u.username && <p className="text-[var(--text-muted)] text-xs">@{u.username}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const cat = getUserPlanCategory(u);
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                                    cat === 'paid' ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                                      : cat === 'challenger' ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                                      : cat === 'trial' ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                                  }`}>
                                    {cat === 'paid' ? u.sub_plan : cat}
                                  </span>
                                  {cat === 'trial' && (
                                    <span className="text-[10px] text-[var(--accent)]">
                                      ends {new Date(u.trial_ends_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{u.location || '—'}</td>
                          <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                            {u.target_company || u.target_role
                              ? `${u.target_role || ''} ${u.target_company ? `@ ${u.target_company}` : ''}`.trim()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                            {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 items-center">
                              {[3, 7, 14].map(d => (
                                <button
                                  key={d}
                                  onClick={() => grantTrial(u.id, d)}
                                  disabled={granting === u.id}
                                  className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/40 transition-all disabled:opacity-50"
                                >
                                  {granting === u.id ? '...' : `${d}d`}
                                </button>
                              ))}
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="px-2 py-1 rounded text-[11px] font-medium text-red-500 hover:bg-red-50 transition-all ml-1"
                                title={`Delete ${u.email}`}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">
                          {search ? `No users matching "${search}"` : 'No users found'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Emails Tab ── */}
        {tab === 'emails' && (
          <>
            <div className="flex items-center mb-4">
              <RefreshBtn onClick={() => { setEmailsLoaded(false); fetchEmails(); }} loading={emailsLoading} />
            </div>
            {emailsLoading && !emailsLoaded ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : emailsError ? (
              <p className="text-red-400">{emailsError}</p>
            ) : (
              <>
                <p className="text-[var(--text-muted)] text-xs mb-2">{emails.length} emails sent</p>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                        <th className="px-4 py-3">To</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map(e => (
                        <tr key={e.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--border)]/30">
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{e.to.join(', ')}</td>
                          <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{e.subject}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              e.last_event === 'delivered' ? 'bg-[var(--success)]/20 text-[var(--success)]'
                                : e.last_event === 'opened' ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                                : e.last_event === 'clicked' ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                                : e.last_event === 'bounced' ? 'bg-[var(--danger)]/20 text-[var(--danger)]'
                                : e.last_event === 'complained' ? 'bg-[var(--warning)]/20 text-[var(--warning-text)]'
                                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                            }`}>
                              {e.last_event || 'sent'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                            {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                      {emails.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No emails sent yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
