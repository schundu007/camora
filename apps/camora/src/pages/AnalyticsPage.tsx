import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { dialogConfirm, dialogAlert } from '../components/shared/Dialog';
import SiteNav from '../components/shared/SiteNav';

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
  image: string | null;
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
  is_admin: boolean | null;
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
      className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-[background-color,color,opacity,transform] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5">
      <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
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

  // Visitor detail state
  const [visitors, setVisitors] = useState<any[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorsLoaded, setVisitorsLoaded] = useState(false);

  const fetchVisitors = useCallback(async () => {
    if (!token) return;
    setVisitorsLoading(true);
    const params = new URLSearchParams({ exclude_emails: EXCLUDE });
    if (days) params.set('days', days);
    try {
      const r = await fetch(`${API}/api/visitors/visitors-detail?${params}`, {
        credentials: 'include', headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setVisitors(d.visitors || []);
      setVisitorsLoaded(true);
    } catch {}
    setVisitorsLoading(false);
  }, [token, days]);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [search, setSearch] = useState('');
  const [granting, setGranting] = useState<number | null>(null);
  const [trialError, setTrialError] = useState('');
  const [togglingAdmin, setTogglingAdmin] = useState<number | null>(null);

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
    if (tab === 'analytics') { fetchAnalytics(); setVisitorsLoaded(false); setVisitors([]); }
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

  async function toggleAdmin(userId: number, makeAdmin: boolean) {
    const user = users.find(u => u.id === userId);
    const action = makeAdmin ? 'Grant admin to' : 'Revoke admin from';
    if (!(await dialogConfirm({ title: `${action} ${user?.name || user?.email}?`, message: makeAdmin ? 'This user will have full admin access to the platform.' : 'This user will lose all admin privileges.', confirmLabel: makeAdmin ? 'Grant admin' : 'Revoke admin', tone: makeAdmin ? 'default' : 'danger' }))) return;
    setTogglingAdmin(userId);
    try {
      const r = await fetch(`${API}/api/admin/set-admin`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, isAdmin: makeAdmin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: d.is_admin } : u));
    } catch (err: any) {
      dialogAlert({ title: 'Failed', message: err.message, tone: 'danger' });
    }
    setTogglingAdmin(null);
  }

  // Plan filter from summary cards
  const [planFilter, setPlanFilter] = useState<string>('');

  // Helper: determine user's effective plan category
  function getUserPlanCategory(u: User) {
    const isPaid = u.sub_plan === 'pro_monthly' || u.sub_plan === 'pro_yearly' || u.sub_plan === 'team';
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
        <div className="w-8 h-8 border-2 border-[var(--cam-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="flex items-center justify-center py-32">
          <p className="text-[var(--text-muted)] text-lg">You don't have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-sans)", background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <SiteNav variant="dark" />
      {/* LeetCode hero band */}
      <section className="relative overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
        <div className="relative page-wrap pt-12 pb-16">
          <h1 className="text-3xl font-bold text-white">Admin <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Dashboard</span></h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Analytics, user management & emails</p>
        </div>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute left-0 bottom-0 w-full pointer-events-none" style={{ height: '5vh', display: 'block' }}>
          <polygon fill="var(--bg-app)" points="0,0 100,100 0,100" />
        </svg>
      </section>
      <div className="page-wrap py-8">

        {/* Tabs */}
        <div className="tab-group mb-8">
          {(['analytics', 'users', 'emails'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-group-item capitalize${tab === t ? ' tab-group-item-active' : ''}`}
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
                  className={`chip${days === d ? ' chip-active' : ''}`}
                >
                  {d === '' ? 'All time' : `Last ${d} days`}
                </button>
              ))}
              <RefreshBtn onClick={fetchAnalytics} loading={loading} />
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--cam-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <>
                <div className="flex gap-6 mb-10">
                  <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-6 py-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--cam-primary)] opacity-70 mb-2">Total Page Views</p>
                    <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">{stats.total_views.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-6 py-5"
                    style={{ borderColor: 'color-mix(in oklab, var(--cam-gold-leaf) 40%, var(--border))' }}>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--cam-gold-leaf)] opacity-80 mb-2">Unique Visitors</p>
                    <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--cam-gold-leaf)' }}>{stats.unique_visitors.toLocaleString()}</p>
                  </div>
                </div>

                <h2 className="text-base font-semibold mb-3 text-[var(--text-primary)]">By Page</h2>
                <div className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-x-auto mb-10">
                  <table className="w-full min-w-full text-left">
                    <thead>
                      <tr style={{ background: 'color-mix(in oklab, var(--cam-primary) 6%, var(--bg-surface))' }}
                        className="border-b border-[var(--border)]">
                        {['Path', 'Views', 'Unique Visitors'].map((h, i) => (
                          <th key={h} className={`px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--cam-primary)] opacity-80 ${i === 0 ? 'w-full' : 'whitespace-nowrap text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_path.map((row, i) => (
                        <tr key={row.path}
                          className="border-b border-[var(--border)]/40 transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 5%, var(--bg-surface))')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-5 py-3 font-mono text-xs text-[var(--cam-primary)]">{row.path}</td>
                          <td className="px-5 py-3 text-right text-sm text-[var(--text-secondary)]">{parseInt(row.views).toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">{parseInt(row.unique_visitors).toLocaleString()}</td>
                        </tr>
                      ))}
                      {stats.by_path.length === 0 && (
                        <tr><td colSpan={3} className="px-5 py-10 text-center text-[var(--text-muted)] text-sm">No data yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <h2 className="text-base font-semibold mb-3 text-[var(--text-primary)]">By Day</h2>
                <div className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-x-auto">
                  <table className="w-full min-w-full text-left">
                    <thead>
                      <tr style={{ background: 'color-mix(in oklab, var(--cam-primary) 6%, var(--bg-surface))' }}
                        className="border-b border-[var(--border)]">
                        {['Date', 'Views', 'Unique Visitors', 'Trend'].map((h, i) => (
                          <th key={h} className={`px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--cam-primary)] opacity-80 ${i === 0 ? 'w-full' : ''} ${i === 1 || i === 2 ? 'whitespace-nowrap text-right' : ''} ${i === 3 ? 'w-40' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_day.map((row) => {
                        const maxViews = Math.max(...stats.by_day.map(d => parseInt(d.views)));
                        const pct = maxViews > 0 ? (parseInt(row.views) / maxViews) * 100 : 0;
                        return (
                          <tr key={row.date}
                            className="border-b border-[var(--border)]/40 transition-colors"
                            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 5%, var(--bg-surface))')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">{new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                            <td className="px-5 py-3 text-right text-sm text-[var(--text-secondary)]">{parseInt(row.views).toLocaleString()}</td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">{parseInt(row.unique_visitors).toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5">
                                <div className="h-1.5 rounded-full transition-[width]"
                                  style={{ width: `${pct}%`, background: 'var(--cam-primary)' }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {stats.by_day.length === 0 && (
                        <tr><td colSpan={4} className="px-5 py-10 text-center text-[var(--text-muted)] text-sm">No data yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Unique Visitors breakdown */}
                <div className="mt-10">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      Who are they? <span className="text-[var(--text-muted)] text-sm font-normal ml-1">{stats.unique_visitors} unique visitors</span>
                    </h2>
                    {!visitorsLoaded && (
                      <button
                        onClick={fetchVisitors}
                        disabled={visitorsLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        style={{ background: 'var(--cam-gold-leaf)', color: '#020617' }}
                      >
                        {visitorsLoading ? 'Loading…' : 'Load visitors'}
                      </button>
                    )}
                    {visitorsLoaded && (
                      <button onClick={fetchVisitors} disabled={visitorsLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors disabled:opacity-50">
                        {visitorsLoading ? 'Refreshing…' : 'Refresh'}
                      </button>
                    )}
                  </div>
                  {visitorsLoaded && (
                    <div className="bg-[var(--bg-surface)] border rounded-xl overflow-x-auto" style={{ borderColor: 'color-mix(in oklab, var(--cam-gold-leaf) 30%, var(--border))' }}>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]" style={{ background: 'color-mix(in oklab, var(--cam-gold-leaf) 6%, var(--bg-surface))' }}>
                            {['Location', 'IP', 'Browser / OS', 'Pages', 'Top Page', 'Referrer', 'Last Seen'].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-gold-leaf-dk)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visitors.map((v, i) => {
                            const ua = v.user_agent || '';
                            const browser = ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other';
                            const os = ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Android') ? 'Android' : ua.includes('Mac') ? 'macOS' : ua.includes('Windows') ? 'Windows' : ua.includes('Linux') ? 'Linux' : '—';
                            const geo = v.geo;
                            const location = geo ? `${geo.city ? geo.city + ', ' : ''}${geo.country || ''}` : '—';
                            const flag = geo?.countryCode ? String.fromCodePoint(...[...geo.countryCode].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';
                            const maskedIp = v.ip?.startsWith('seed-') ? 'synthetic' : (v.ip || '').replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.×.×');
                            const referrer = v.referrer ? (() => { try { return new URL(v.referrer).hostname.replace('www.', ''); } catch { return v.referrer.slice(0, 30); } })() : 'direct';
                            const topPage = v.paths?.[0] || '—';
                            return (
                              <tr key={i} className="border-b border-[var(--border)]/40 hover:bg-[var(--bg-elevated)]/50 transition-colors">
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  <span className="text-base mr-1.5">{flag}</span>
                                  <span className="text-xs text-[var(--text-secondary)]">{location || '—'}</span>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">{maskedIp}</td>
                                <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">{browser} / {os}</td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)]">{v.views} views · {v.pages_count} pages</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--cam-gold-leaf-dk)] max-w-[180px] truncate">{topPage}</td>
                                <td className="px-4 py-2.5 text-[11px] text-[var(--text-muted)] max-w-[140px] truncate">{referrer}</td>
                                <td className="px-4 py-2.5 text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                                  {new Date(v.last_seen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </td>
                              </tr>
                            );
                          })}
                          {visitors.length === 0 && (
                            <tr><td colSpan={7} className="px-5 py-8 text-center text-[var(--text-muted)] text-sm">No visitor data found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
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
            {/* Metric strip */}
            {usersLoaded && (
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[
                  { label: 'Total Users', value: totalUsers, numColor: 'var(--text-primary)', accent: 'var(--cam-primary)', filter: '' },
                  { label: 'Paid', value: paidUsers, numColor: 'var(--cam-gold-leaf)', accent: 'var(--cam-gold-leaf)', filter: 'paid' },
                  { label: 'Trial', value: trialUsers, numColor: 'var(--cam-primary)', accent: 'var(--cam-primary)', filter: 'trial' },
                  { label: 'Challenger', value: challengerUsers, numColor: 'var(--cam-primary)', accent: 'var(--cam-primary)', filter: 'challenger' },
                  { label: 'Free', value: freeUsers, numColor: 'var(--text-muted)', accent: 'var(--border)', filter: 'free' },
                ].map(c => (
                  <button key={c.label} onClick={() => setPlanFilter(planFilter === c.filter ? '' : c.filter)}
                    className={`relative overflow-hidden bg-[var(--bg-surface)] border rounded-xl pt-5 px-5 pb-4 text-center transition-[border-color,transform] active:scale-[0.98] ${
                      planFilter === c.filter
                        ? 'border-[var(--cam-primary)] ring-1 ring-[var(--cam-primary)]/15'
                        : 'border-[var(--border)] hover:border-[var(--cam-primary)]/30'
                    }`}>
                    <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: c.accent }} />
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">{c.label}</p>
                    <p className="text-[2rem] font-bold leading-none tabular-nums" style={{ color: c.numColor }}>{c.value}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text"
                  placeholder="Search by name, email, location, company..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cam-primary)] focus:ring-1 focus:ring-[var(--cam-primary)]/20 transition-[border-color,box-shadow]" />
              </div>
              {usersLoaded && (
                <span className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap tabular-nums">{filteredUsers.length} / {users.length}</span>
              )}
              <RefreshBtn onClick={() => { setUsersLoaded(false); fetchUsers(); }} loading={usersLoading} />
            </div>

            {trialError && <p className="text-[var(--danger)] text-sm mb-3">{trialError}</p>}

            {usersLoading && !usersLoaded ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--cam-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : usersError ? (
              <p className="text-[var(--danger)]">{usersError}</p>
            ) : (
              <div className="border border-[var(--border)] rounded-xl overflow-x-auto" style={{ background: 'var(--bg-surface)' }}>
                <table className="w-full text-left" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr className="border-b border-[var(--border)]"
                      style={{ background: 'color-mix(in oklab, var(--cam-primary) 7%, var(--bg-surface))' }}>
                      {['User', 'Email', 'Plan', 'Location', 'Target', 'Last Login', 'Joined', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] whitespace-nowrap"
                          style={{ color: 'var(--cam-primary)', opacity: 0.85 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => {
                      const rowBase = i % 2 !== 0 ? 'var(--bg-elevated)' : 'var(--bg-surface)';
                      return (
                        <tr key={u.id}
                          className="border-b border-[var(--border)]/40 transition-colors duration-75"
                          style={{ background: rowBase }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 9%, var(--bg-elevated))')}
                          onMouseLeave={e => (e.currentTarget.style.background = rowBase)}>

                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {u.image ? (
                                <img src={u.image} alt={u.name || u.email}
                                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                                  style={{ boxShadow: '0 0 0 2px color-mix(in oklab, var(--cam-primary) 30%, transparent)' }}
                                  referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                                  style={{ background: 'color-mix(in oklab, var(--cam-primary) 18%, var(--bg-elevated))', color: 'var(--cam-primary)' }}>
                                  {(u.name || u.email)[0].toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-[var(--text-primary)] truncate leading-snug">{u.name || '—'}</p>
                                {u.username && <p className="font-mono text-[10px] text-[var(--text-muted)] truncate">@{u.username}</p>}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                            <span className="truncate block max-w-[200px]">{u.email}</span>
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {(() => {
                              const cat = getUserPlanCategory(u);
                              const badgeStyle = cat === 'paid'
                                ? { background: 'color-mix(in oklab, var(--cam-gold-leaf) 14%, var(--bg-surface))', color: 'var(--cam-gold-leaf)' }
                                : cat === 'trial' || cat === 'challenger'
                                ? { background: 'color-mix(in oklab, var(--cam-primary) 11%, var(--bg-surface))', color: 'var(--cam-primary)' }
                                : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' };
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wide" style={badgeStyle}>
                                    {cat === 'paid' ? (u.sub_plan || 'paid').replace(/_/g, ' ') : cat}
                                  </span>
                                  {cat === 'trial' && u.trial_ends_at && (
                                    <span className="font-mono text-[10px]" style={{ color: 'var(--cam-primary)', opacity: 0.5 }}>
                                      · {new Date(u.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          <td className="px-4 py-2.5 text-xs max-w-[130px]">
                            <span className="truncate block text-[var(--text-muted)]">
                              {u.location || <span style={{ opacity: 0.3 }}>—</span>}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-xs max-w-[130px]">
                            <span className="truncate block text-[var(--text-muted)]">
                              {u.target_company || u.target_role
                                ? `${u.target_role || ''} ${u.target_company ? `@ ${u.target_company}` : ''}`.trim()
                                : <span style={{ opacity: 0.3 }}>—</span>}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : <span style={{ opacity: 0.3 }}>—</span>}
                          </td>

                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {/* Trial days — connected button group */}
                              <div className="flex overflow-hidden rounded border"
                                style={{ borderColor: 'color-mix(in oklab, var(--cam-primary) 22%, var(--border))' }}>
                                {[3, 7, 14].map((d, idx) => (
                                  <button key={d}
                                    onClick={() => grantTrial(u.id, d)}
                                    disabled={granting === u.id}
                                    className="px-2.5 py-[3px] font-mono text-[11px] font-bold disabled:opacity-50 active:scale-95 transition-colors duration-75"
                                    style={{
                                      color: 'var(--cam-primary)',
                                      background: 'color-mix(in oklab, var(--cam-primary) 6%, var(--bg-surface))',
                                      ...(idx > 0 ? { borderLeft: '1px solid color-mix(in oklab, var(--cam-primary) 18%, var(--border))' } : {}),
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 20%, var(--bg-surface))')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 6%, var(--bg-surface))')}>
                                    {granting === u.id ? '…' : `${d}d`}
                                  </button>
                                ))}
                              </div>

                              {/* Admin toggle */}
                              <button
                                onClick={() => toggleAdmin(u.id, !u.is_admin)}
                                disabled={togglingAdmin === u.id}
                                className="px-2.5 py-[3px] rounded font-mono text-[11px] font-bold disabled:opacity-50 active:scale-95 transition-colors duration-75"
                                style={u.is_admin ? {
                                  background: 'color-mix(in oklab, var(--cam-gold-leaf) 16%, var(--bg-surface))',
                                  color: 'var(--cam-gold-leaf)',
                                  border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 28%, transparent)',
                                } : {
                                  background: 'var(--bg-elevated)',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border)',
                                }}
                                onMouseEnter={e => {
                                  if (u.is_admin) { e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-gold-leaf) 28%, var(--bg-surface))'; }
                                  else { e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 10%, var(--bg-surface))'; (e.currentTarget as HTMLElement).style.color = 'var(--cam-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklab, var(--cam-primary) 28%, transparent)'; }
                                }}
                                onMouseLeave={e => {
                                  if (u.is_admin) { e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-gold-leaf) 16%, var(--bg-surface))'; }
                                  else { e.currentTarget.style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }
                                }}
                                title={u.is_admin ? 'Revoke admin' : 'Grant admin'}>
                                {togglingAdmin === u.id ? '…' : u.is_admin ? 'Admin ✓' : 'Admin'}
                              </button>

                              {/* Delete */}
                              {!u.is_admin && (
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="w-[26px] h-[26px] flex items-center justify-center rounded transition-colors duration-75 active:scale-95"
                                  style={{ color: 'var(--text-muted)', background: 'transparent' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in oklab, var(--danger) 12%, var(--bg-surface))'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                                  title={`Delete ${u.email}`}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-14 text-center text-sm text-[var(--text-muted)]">
                          {search ? `No users matching "${search}"` : 'No users found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                <div className="w-8 h-8 border-2 border-[var(--cam-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : emailsError ? (
              <p className="text-red-400">{emailsError}</p>
            ) : (
              <>
                <p className="text-[var(--text-muted)] text-xs mb-2">{emails.length} emails sent</p>
                <div className="border border-[var(--border)] rounded-xl overflow-x-auto" style={{ background: 'var(--bg-surface)', fontSize: '13px' }}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)]"
                        style={{ background: 'color-mix(in oklab, var(--cam-primary) 7%, var(--bg-surface))' }}>
                        {['To', 'Subject', 'Status', 'Sent'].map(h => (
                          <th key={h} className="px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em]"
                            style={{ color: 'var(--cam-primary)', opacity: 0.85 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((e, i) => {
                        const rowBase = i % 2 !== 0
                          ? 'color-mix(in oklab, var(--cam-primary) 2%, var(--bg-surface))'
                          : 'var(--bg-surface)';
                        return (
                          <tr key={e.id} className="border-b border-[var(--border)]/30 transition-colors duration-75"
                            style={{ background: rowBase }}
                            onMouseEnter={ev => (ev.currentTarget.style.background = 'color-mix(in oklab, var(--cam-primary) 6%, var(--bg-surface))')}
                            onMouseLeave={ev => (ev.currentTarget.style.background = rowBase)}>
                            <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{e.to.join(', ')}</td>
                            <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium max-w-[300px] truncate">{e.subject}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wide" style={
                                e.last_event === 'delivered' ? { background: 'color-mix(in oklab, var(--success) 14%, var(--bg-surface))', color: 'var(--success)' }
                                : e.last_event === 'opened' || e.last_event === 'clicked' ? { background: 'color-mix(in oklab, var(--cam-primary) 11%, var(--bg-surface))', color: 'var(--cam-primary)' }
                                : e.last_event === 'bounced' ? { background: 'color-mix(in oklab, var(--danger) 12%, var(--bg-surface))', color: 'var(--danger)' }
                                : e.last_event === 'complained' ? { background: 'color-mix(in oklab, var(--cam-gold-leaf) 12%, var(--bg-surface))', color: 'var(--cam-gold-leaf)' }
                                : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                              }>
                                {e.last_event || 'sent'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                              {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                      {emails.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">No emails sent yet</td></tr>
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
