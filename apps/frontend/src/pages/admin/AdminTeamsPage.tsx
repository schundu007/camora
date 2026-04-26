import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';
import { dialogConfirm, dialogAlert } from '../../components/shared/Dialog';
import { isOwner } from '../../lib/owner';

const API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface AdminTeamRow {
  id: number;
  owner_user_id: number;
  name: string | null;
  plan_type: string;
  seat_limit: number;
  hours_pool_total: number | null;
  auto_topup_pack: string | null;
  auto_topup_monthly_cap_cents: number | null;
  created_at: string;
  owner_email: string;
  owner_name: string | null;
  member_count: string;
  used_seconds_period: string;
  auto_charged_30d_cents: string;
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
function fmtHours(seconds: number) {
  if (seconds <= 0) return '0';
  return `${(seconds / 3600).toFixed(1)} hr`;
}

/**
 * Admin-only operational dashboard for the team feature. Surfaces every
 * team in the system with their current usage, configured auto-topup,
 * and 30-day auto-charge total. Provides kill-switches for runaway charges.
 */
export default function AdminTeamsPage() {
  const { token, user } = useAuth();
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { document.title = 'Teams admin — Camora'; }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/v1/teams/admin/all`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 403) { setError('Admin access required'); setLoading(false); return; }
      const data = await r.json();
      setTeams(data.teams || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function disableAutoTopup(teamId: number, ownerEmail: string) {
    if (!(await dialogConfirm({
      title: 'Force-disable auto top-up?',
      message: `${ownerEmail}'s team will stop auto-charging immediately. They'll need to re-enable it manually.`,
      confirmLabel: 'Force-disable',
      tone: 'danger',
    }))) return;
    try {
      const r = await fetch(`${API}/api/v1/teams/admin/${teamId}/disable-auto-topup`, {
        credentials: 'include',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { await fetchAll(); }
      else { await dialogAlert({ title: 'Failed', message: 'Try again', tone: 'danger' }); }
    } catch { /* swallow */ }
  }

  // Privilege check — short-circuit non-admins clientside even though the
  // API also enforces. Avoids a flash of empty-list UI for non-admins.
  if (user && !isOwner(user)) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
        <SiteNav variant="light" />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Admin only</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This dashboard is restricted to operators.</p>
            <Link to="/" className="inline-block mt-4 px-4 py-2 text-sm font-bold rounded-lg text-white" style={{ background: 'var(--accent)' }}>Back to home</Link>
          </div>
        </main>
        <SiteFooter variant="light" />
      </div>
    );
  }

  const filtered = search
    ? teams.filter((t) =>
        t.owner_email.toLowerCase().includes(search.toLowerCase())
        || t.plan_type.includes(search.toLowerCase())
        || (t.name || '').toLowerCase().includes(search.toLowerCase()))
    : teams;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title="Teams admin" description="Operator dashboard for team accounts." path="/admin/teams" />
      <SiteNav variant="light" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8" style={{ paddingTop: 96 }}>
        <header className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--accent)' }}>OPERATOR</p>
          <h1 className="text-2xl font-bold mb-2">Teams</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Every team in the system with current-period usage, auto-topup config, and 30-day auto-charge total.
          </p>
        </header>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by owner email, plan, or team name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={fetchAll}
            className="px-3 py-2 text-sm font-semibold rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Refresh
          </button>
        </div>

        {loading && <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>}
        {error && <div className="text-sm rounded-lg p-3" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>{error}</div>}

        {!loading && !error && (
          <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg-elevated)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-3 py-2.5 font-semibold">Team / owner</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Plan</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Members</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Used / Pool</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Auto top-up</th>
                  <th className="text-left px-3 py-2.5 font-semibold">30d auto-charged</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const usedHours = Number(t.used_seconds_period) / 3600;
                  const poolHours = Number(t.hours_pool_total || 0);
                  const usePct = poolHours > 0 ? Math.min(100, (usedHours / poolHours) * 100) : 0;
                  const autoCharged = Number(t.auto_charged_30d_cents);
                  return (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-3 py-2.5 align-top">
                        <p className="text-[13px] font-semibold">{t.name || '—'}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{t.owner_email}</p>
                      </td>
                      <td className="px-3 py-2.5 align-top text-[12px]">{t.plan_type}</td>
                      <td className="px-3 py-2.5 align-top text-[12px]">{t.member_count} / {t.seat_limit}</td>
                      <td className="px-3 py-2.5 align-top text-[12px]">
                        {fmtHours(Number(t.used_seconds_period))} / {poolHours.toFixed(0)} hr
                        {poolHours > 0 && (
                          <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="h-full" style={{ width: `${usePct}%`, background: usePct > 95 ? '#dc2626' : usePct > 80 ? '#d97706' : 'var(--accent)' }} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-[12px]">
                        {t.auto_topup_pack ? (
                          <>
                            <p>{t.auto_topup_pack.replace('topup_', '').replace('h', 'h pack')}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>cap {fmtMoney(Number(t.auto_topup_monthly_cap_cents || 0))}/mo</p>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>off</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-[12px]">
                        <span style={{ color: autoCharged > 50000 ? '#dc2626' : 'var(--text-primary)' }}>
                          {fmtMoney(autoCharged)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {t.auto_topup_pack && (
                          <button
                            onClick={() => disableAutoTopup(t.id, t.owner_email)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md"
                            style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
                            title="Force-disable auto top-up"
                          >
                            Disable auto
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>No teams match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <SiteFooter variant="light" />
    </div>
  );
}
