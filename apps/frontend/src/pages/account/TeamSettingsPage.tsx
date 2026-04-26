import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';
import { dialogConfirm, dialogAlert } from '../../components/shared/Dialog';

const API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface MemberRow {
  user_id: number;
  role: 'owner' | 'member';
  email: string;
  name: string | null;
  avatar?: string | null;
  joined_at: string;
}

interface InviteRow {
  id: number;
  email: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
}

interface TeamData {
  id: number;
  owner_user_id: number;
  name: string | null;
  plan_type: string;
  seat_limit: number;
  hours_pool_total: number | null;
  hours_pool_period_start: string;
  payg_rate_cents: number | null;
  members: MemberRow[];
  pending_invites: InviteRow[];
}

interface UsageMember {
  user_id: number;
  email: string;
  name: string | null;
  hours_used: number;
  calls: number;
}

interface UsageData {
  pool_hours: number;
  used_hours: number;
  remaining_hours: number;
  period_start: string;
  members: UsageMember[];
}

function formatHours(h: number) {
  if (h < 0.01) return '0';
  if (h < 1) return `${(h * 60).toFixed(0)} min`;
  return `${h.toFixed(1)} hr`;
}

function planLabel(planType: string) {
  return ({
    pro_monthly: 'Pro · monthly',
    pro_yearly: 'Pro · yearly',
    pro_max_monthly: 'Pro Max · monthly',
    pro_max_yearly: 'Pro Max · yearly',
    business_starter: 'Business Starter',
    business_desktop_lifetime: 'Business Desktop · 10 seats',
  } as Record<string, string>)[planType] || planType;
}

export default function TeamSettingsPage() {
  const { token, user, subscription } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastInviteDelivery, setLastInviteDelivery] = useState<'email' | 'manual' | null>(null);
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Team — Camora';
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [teamRes, usageRes] = await Promise.all([
        fetch(`${API}/api/v1/teams/me`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/teams/me/usage`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const teamJson = await teamRes.json();
      const usageJson = await usageRes.json();
      setTeam(teamJson.team || null);
      setUsage(usageJson.usage || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const planType = subscription?.plan || 'free';
  const teamEligiblePlan = ['pro_max_monthly', 'pro_max_yearly', 'business_starter', 'business_desktop_lifetime'].includes(planType);

  // ── Create team (only if user holds an eligible sub but no team yet) ──
  async function handleCreateTeam() {
    if (!token) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/v1/teams`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'My team' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');
      setTeam(data.team);
      await fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create team';
      await dialogAlert({ title: 'Could not create team', message: msg, tone: 'danger' });
    }
    setCreating(false);
  }

  // ── Invite ───────────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !team || !inviteEmail.includes('@')) return;
    setInviting(true);
    setLastInviteUrl(null);
    try {
      const res = await fetch(`${API}/api/v1/teams/${team.id}/invite`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'SEAT_LIMIT') {
          await dialogAlert({ title: 'Seat limit reached', message: `Your team is full (${team.seat_limit} seats max). Remove a member or upgrade your plan.`, tone: 'danger' });
        } else {
          await dialogAlert({ title: 'Invite failed', message: data.error || 'Please try again', tone: 'danger' });
        }
      } else {
        setLastInviteUrl(data.invite_url);
        setLastInviteDelivery(data.delivery === 'email' ? 'email' : 'manual');
        setLastInviteEmail(inviteEmail.trim());
        setInviteEmail('');
        await fetchAll();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      await dialogAlert({ title: 'Invite failed', message: msg, tone: 'danger' });
    }
    setInviting(false);
  }

  async function copyInviteLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      await dialogAlert({ title: 'Copied', message: 'Invite link copied to your clipboard.' });
    } catch {
      // Older browsers — show the URL in the alert so the owner can copy manually.
      await dialogAlert({ title: 'Invite link', message: url });
    }
  }

  async function cancelInvite(token2: string) {
    if (!token) return;
    if (!(await dialogConfirm({ title: 'Cancel this invite?', message: 'The recipient will no longer be able to join with this link.', confirmLabel: 'Cancel invite', tone: 'danger' }))) return;
    try {
      const res = await fetch(`${API}/api/v1/teams/invites/${token2}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchAll();
    } catch { /* swallow */ }
  }

  async function removeMember(memberId: number, memberEmail: string) {
    if (!token || !team) return;
    if (!(await dialogConfirm({ title: 'Remove member?', message: `${memberEmail} will lose access immediately.`, confirmLabel: 'Remove', tone: 'danger' }))) return;
    try {
      const res = await fetch(`${API}/api/v1/teams/${team.id}/members/${memberId}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchAll();
      else { const data = await res.json(); await dialogAlert({ title: 'Could not remove', message: data.error || 'Try again', tone: 'danger' }); }
    } catch { /* swallow */ }
  }

  const isOwner = !!team && !!user && team.owner_user_id === user.id;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title="Team" description="Manage your Camora team — invite mates, share AI hours, and see per-member usage." path="/account/team" />
      <SiteNav variant="light" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent)' }}>ACCOUNT</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Team sharing</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pool your AI hours with up to {team ? team.seat_limit : 5} mates. Per-member usage is broken out below.
          </p>
        </div>

        {loading && (
          <div className="rounded-xl p-8 flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {error}
          </div>
        )}

        {!loading && !team && !teamEligiblePlan && (
          <div className="rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold mb-2">Team sharing isn't on your plan</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Upgrade to Pro Max (5 seats) or buy a Business Starter pack (10 seats) to invite mates and pool your AI hours.
            </p>
            <Link to="/pricing" className="inline-block px-4 py-2 text-sm font-bold rounded-lg text-white" style={{ background: 'var(--accent)' }}>
              View plans
            </Link>
          </div>
        )}

        {!loading && !team && teamEligiblePlan && (
          <div className="rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold mb-2">Create your team</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              You're on {planLabel(planType)} — eligible for team sharing. Create a team to start inviting.
            </p>
            <button
              onClick={handleCreateTeam}
              disabled={creating}
              className="px-4 py-2 text-sm font-bold rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {creating ? 'Creating…' : 'Create team'}
            </button>
          </div>
        )}

        {!loading && team && (
          <div className="space-y-8">
            {/* Plan + pool summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Plan</p>
                <p className="text-base font-bold">{planLabel(team.plan_type)}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Seats</p>
                <p className="text-base font-bold">{team.members.length} <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>/ {team.seat_limit}</span></p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>AI hours used</p>
                <p className="text-base font-bold">
                  {formatHours(usage?.used_hours || 0)} <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>/ {formatHours(team.hours_pool_total || 0)}</span>
                </p>
              </div>
            </div>

            {/* Invite (owner only) */}
            {isOwner && (
              <section className="rounded-xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <h2 className="text-base font-bold mb-3">Invite a mate</h2>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={inviting || team.members.length >= team.seat_limit}
                    className="px-4 py-2 text-sm font-bold rounded-lg text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {inviting ? 'Sending…' : 'Create invite'}
                  </button>
                </form>
                {lastInviteUrl && (
                  <div className="mt-3 space-y-2">
                    {lastInviteDelivery === 'email' && (
                      <p className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M13 4L6 11L3 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Email sent to <strong>{lastInviteEmail}</strong> — link below as backup.
                      </p>
                    )}
                    {lastInviteDelivery === 'manual' && (
                      <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        Email delivery isn't configured — share this link with <strong>{lastInviteEmail}</strong> manually:
                      </p>
                    )}
                    <div className="p-3 rounded-lg flex items-center justify-between gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <code className="text-[11px] truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{lastInviteUrl}</code>
                      <button
                        onClick={() => copyInviteLink(lastInviteUrl)}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-md text-white shrink-0"
                        style={{ background: 'var(--accent)' }}
                      >
                        Copy link
                      </button>
                    </div>
                  </div>
                )}
                {team.members.length >= team.seat_limit && (
                  <p className="mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    You're at the {team.seat_limit}-seat limit. Remove a member or upgrade your plan to invite more.
                  </p>
                )}
              </section>
            )}

            {/* Pending invites */}
            {isOwner && team.pending_invites.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Pending invites</h2>
                <div className="rounded-xl divide-y" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {team.pending_invites.map((inv) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{inv.email}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => cancelInvite(inv.invite_token)}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-md"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Members + per-member usage */}
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Members &amp; usage</h2>
              <div className="rounded-xl divide-y" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {team.members.map((m) => {
                  const memberUsage = usage?.members.find((mu) => mu.user_id === m.user_id);
                  return (
                    <div key={m.user_id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        {m.avatar && <img src={m.avatar} alt="" className="w-8 h-8 rounded-full" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {m.name || m.email}
                            {m.role === 'owner' && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>OWNER</span>}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatHours(memberUsage?.hours_used || 0)}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{memberUsage?.calls || 0} calls</p>
                        </div>
                        {isOwner && m.role !== 'owner' && (
                          <button
                            onClick={() => removeMember(m.user_id, m.email)}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded-md"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      <SiteFooter variant="light" />
    </div>
  );
}
