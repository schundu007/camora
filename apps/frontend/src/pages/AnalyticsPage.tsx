import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

type Tab = 'analytics' | 'users';

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('analytics');
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [granting, setGranting] = useState<number | null>(null);

  async function grantTrial(userId: number, trialDays: number) {
    setGranting(userId);
    try {
      const r = await fetch(`${API}/api/admin/grant-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, days: trialDays }),
      });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, trial_ends_at: d.trial_ends_at } : u));
      }
    } catch {}
    setGranting(null);
  }

  // Fetch analytics
  useEffect(() => {
    if (tab !== 'analytics') return;
    setLoading(true);
    const params = new URLSearchParams({ exclude_emails: EXCLUDE });
    if (days) params.set('days', days);
    fetch(`${API}/api/visitors/pageview-stats?${params}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days, tab]);

  // Fetch users
  useEffect(() => {
    if (tab !== 'users' || users.length > 0) return;
    setUsersLoading(true);
    setUsersError('');
    fetch(`${API}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Admin access required' : 'Failed to load');
        return r.json();
      })
      .then(d => { setUsers(d.users); setUsersLoading(false); })
      .catch(err => { setUsersError(err.message); setUsersLoading(false); });
  }, [tab, token, users.length]);

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <SiteNav />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-400 mb-6">Analytics & user management</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-900 rounded-lg p-1 w-fit">
          {(['analytics', 'users'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <>
            <div className="flex gap-2 mb-8">
              {['', '7', '30', '90'].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    days === d ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {d === '' ? 'All time' : `Last ${d} days`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm">Total Page Views</p>
                    <p className="text-4xl font-bold mt-1">{stats.total_views.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm">Unique Visitors</p>
                    <p className="text-4xl font-bold mt-1 text-emerald-400">{stats.unique_visitors.toLocaleString()}</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold mb-4">By Page</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-sm">
                        <th className="px-5 py-3">Path</th>
                        <th className="px-5 py-3 text-right">Views</th>
                        <th className="px-5 py-3 text-right">Unique Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_path.map(row => (
                        <tr key={row.path} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-5 py-3 font-mono text-sm text-emerald-300">{row.path}</td>
                          <td className="px-5 py-3 text-right">{parseInt(row.views).toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-semibold">{parseInt(row.unique_visitors).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h2 className="text-xl font-semibold mb-4">By Day</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-sm">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Views</th>
                        <th className="px-5 py-3 text-right">Unique Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.by_day.map(row => (
                        <tr key={row.date} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-5 py-3 text-sm">{new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td className="px-5 py-3 text-right">{parseInt(row.views).toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-semibold">{parseInt(row.unique_visitors).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-gray-400">Failed to load analytics. Backend may need redeployment.</p>
            )}
          </>
        )}

        {/* ── Users Tab ── */}
        {tab === 'users' && (
          <>
            {usersLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : usersError ? (
              <p className="text-red-400">{usersError}</p>
            ) : (
              <>
                <p className="text-gray-400 mb-4">{users.length} registered users</p>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
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
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                                  {(u.name || u.email)[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{u.name || '—'}</p>
                                {u.username && <p className="text-gray-500 text-xs">@{u.username}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{u.email}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const hasActiveTrial = u.trial_ends_at && new Date(u.trial_ends_at) > new Date();
                              const isPaid = u.sub_plan === 'quarterly_pro' || u.sub_plan === 'monthly';
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                                    isPaid
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : u.is_challenger
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : hasActiveTrial
                                          ? 'bg-blue-500/20 text-blue-400'
                                          : 'bg-gray-700 text-gray-400'
                                  }`}>
                                    {isPaid ? u.sub_plan : u.is_challenger ? 'Challenger' : hasActiveTrial ? 'Trial' : 'free'}
                                  </span>
                                  {hasActiveTrial && (
                                    <span className="text-[10px] text-blue-400">
                                      ends {new Date(u.trial_ends_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{u.location || '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {u.target_company || u.target_role
                              ? `${u.target_role || ''} ${u.target_company ? `@ ${u.target_company}` : ''}`.trim()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {[3, 7, 14].map(d => (
                                <button
                                  key={d}
                                  onClick={() => grantTrial(u.id, d)}
                                  disabled={granting === u.id}
                                  className="px-2 py-1 rounded text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-all disabled:opacity-50"
                                >
                                  {granting === u.id ? '...' : `${d}d`}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
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
