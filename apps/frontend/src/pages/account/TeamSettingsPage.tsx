import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  per_member_hour_cap?: number | null;
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

interface BudgetData {
  source: 'team' | 'personal';
  pool_hours: number;
  used_hours: number;
  remaining_hours: number;
  topup_hours: number;
  exhausted: boolean;
  plan_type?: string;
  period?: string;
  team_id?: number;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const autoTopupFailed = searchParams.get('auto_topup_failed') === '1';
  const [team, setTeam] = useState<TeamData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastInviteDelivery, setLastInviteDelivery] = useState<'email' | 'manual' | null>(null);
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null);
  const [editingCapFor, setEditingCapFor] = useState<number | null>(null);
  const [capInput, setCapInput] = useState('');
  const [autoPack, setAutoPack] = useState<string>('');
  const [autoCapDollars, setAutoCapDollars] = useState<string>('');
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  useEffect(() => {
    document.title = 'Team — Camora';
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [teamRes, usageRes, budgetRes] = await Promise.all([
        fetch(`${API}/api/v1/teams/me`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/teams/me/usage`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/teams/me/budget`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const teamJson = await teamRes.json();
      const usageJson = await usageRes.json();
      const budgetJson = await budgetRes.json();
      setTeam(teamJson.team || null);
      setUsage(usageJson.usage || null);
      setBudget(budgetJson || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load current auto-topup config (team if owner, personal otherwise).
  // Solo users: GET /api/v1/billing/auto-topup
  // Team owners: read from team row directly when /me populates it
  useEffect(() => {
    if (!token || autoLoaded) return;
    const loadAuto = async () => {
      try {
        // Solo users (no team yet): load from billing endpoint.
        if (!team) {
          const res = await fetch(`${API}/api/v1/billing/auto-topup`, {
            credentials: 'include',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setAutoPack(data.pack || '');
            setAutoCapDollars(data.monthly_cap_cents ? String(data.monthly_cap_cents / 100) : '');
          }
          setAutoLoaded(true);
          return;
        }
        // Team users: backend includes auto_topup_pack on team row when owner.
        // Fall back to a separate fetch for solo-mode shape if the field is absent.
        const teamRow = team as TeamData & { auto_topup_pack?: string | null; auto_topup_monthly_cap_cents?: number | null };
        setAutoPack(teamRow.auto_topup_pack || '');
        setAutoCapDollars(teamRow.auto_topup_monthly_cap_cents ? String(teamRow.auto_topup_monthly_cap_cents / 100) : '');
        setAutoLoaded(true);
      } catch { setAutoLoaded(true); }
    };
    loadAuto();
  }, [token, team, autoLoaded]);

  async function saveAutoTopup() {
    if (!token) return;
    setAutoSaving(true);
    const pack = autoPack || null;
    const capCents = autoCapDollars ? Math.round(Number(autoCapDollars) * 100) : null;
    // Disabling: clear both fields so the gate sees NOT_ENABLED.
    const isEnabling = !!pack;
    if (isEnabling && (!capCents || capCents <= 0)) {
      await dialogAlert({
        title: 'Monthly cap required',
        message: 'Set a monthly cap (in dollars) before enabling auto top-up. This protects you from runaway charges.',
        tone: 'danger',
      });
      setAutoSaving(false);
      return;
    }
    const url = team
      ? `${API}/api/v1/teams/${team.id}/auto-topup`
      : `${API}/api/v1/billing/auto-topup`;
    try {
      const res = await fetch(url, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pack: isEnabling ? pack : null, monthly_cap_cents: isEnabling ? capCents : null }),
      });
      const data = await res.json();
      if (!res.ok) {
        await dialogAlert({
          title: 'Could not save',
          message: data.message || data.error || data.reason || 'Try again',
          tone: 'danger',
        });
      } else {
        await dialogAlert({
          title: pack ? 'Auto top-up enabled' : 'Auto top-up disabled',
          message: pack
            ? `When your AI hours run out, we'll automatically charge for a ${pack.replace('topup_', '').replace('h', '-hour')} pack — capped at $${capCents! / 100}/month.`
            : 'You\'ll continue to get a pause prompt when hours run out, with a manual buy-pack button.',
        });
        await fetchAll();
      }
    } catch (err: unknown) {
      await dialogAlert({ title: 'Save failed', message: err instanceof Error ? err.message : 'Network error', tone: 'danger' });
    }
    setAutoSaving(false);
  }

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

  // Save a per-member cap. Empty input = clear the cap (unlimited within pool).
  async function saveCap(memberId: number) {
    if (!token || !team) return;
    const trimmed = capInput.trim();
    const cap = trimmed === '' ? null : Number(trimmed);
    if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
      await dialogAlert({ title: 'Invalid cap', message: 'Enter a non-negative number of hours, or leave blank to remove the cap.', tone: 'danger' });
      return;
    }
    try {
      const res = await fetch(`${API}/api/v1/teams/${team.id}/members/${memberId}`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ per_member_hour_cap: cap }),
      });
      if (res.ok) {
        setEditingCapFor(null);
        setCapInput('');
        await fetchAll();
      } else {
        const data = await res.json();
        await dialogAlert({ title: 'Could not set cap', message: data.error || 'Try again', tone: 'danger' });
      }
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

      {/* LeetCode hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--cam-gold-leaf-lt)' }}>ACCOUNT</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Team <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>sharing</span></h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Pool your AI hours with up to {team ? team.seat_limit : 5} mates. Per-member usage is broken out below.
          </p>
        </div>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute left-0 bottom-0 w-full pointer-events-none" style={{ height: '5vh', display: 'block' }}>
          <polygon fill="var(--bg-surface)" points="0,0 100,100 0,100" />
        </svg>
      </section>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">

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

        {/* Auto-topup failure banner — landed here from a payment_intent.payment_failed
            email. Auto-topup has already been disabled server-side; nudge the user to
            update their card and re-enable. Dismissable via the X. */}
        {autoTopupFailed && (
          <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Auto top-up failed</p>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Your last off-session charge couldn't go through (most often: expired card, declined, or 3DS challenge timed out). We've turned auto top-up off so you don't get charged for failures.
              </p>
              <p className="text-[13px] mt-2" style={{ color: 'var(--text-secondary)' }}>
                <strong>To restore it:</strong> buy any pack (or upgrade) — the checkout flow updates your default card — then re-enable auto top-up below.
              </p>
              <div className="flex gap-2 mt-3">
                <Link to="/pricing" className="px-3 py-1.5 text-[12px] font-bold rounded-md text-white" style={{ background: '#dc2626' }}>Update card via top-up</Link>
                <button
                  onClick={() => { searchParams.delete('auto_topup_failed'); setSearchParams(searchParams, { replace: true }); }}
                  className="px-3 py-1.5 text-[12px] font-semibold rounded-md"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Personal budget meter — shown for solo users (no team).
            Team users see the equivalent breakdown inside the team panel below. */}
        {!loading && !team && budget && budget.source === 'personal' && (
          <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Your AI hours</p>
                <p className="text-base font-bold">
                  {formatHours(budget.used_hours)} <span className="text-[12px] font-normal" style={{ color: 'var(--text-muted)' }}>used / {formatHours(budget.pool_hours)} {budget.period === 'lifetime' ? 'lifetime' : `this ${budget.period === 'yearly' ? 'year' : 'month'}`}</span>
                </p>
                {budget.topup_hours > 0 && (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Includes {formatHours(budget.topup_hours)} from active top-ups (90-day expiry)
                  </p>
                )}
              </div>
              <Link to="/pricing" className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-white" style={{ background: 'var(--accent)' }}>
                {budget.exhausted ? 'Top up now' : 'Buy a top-up'}
              </Link>
            </div>
            {budget.pool_hours > 0 && (
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, (budget.used_hours / budget.pool_hours) * 100))}%`,
                    background: budget.exhausted ? '#dc2626' : (budget.remaining_hours / budget.pool_hours < 0.2 ? 'var(--cam-gold-leaf-lt)' : 'var(--accent)'),
                  }}
                />
              </div>
            )}
            {budget.exhausted && (
              <p className="mt-3 text-[12px]" style={{ color: '#dc2626' }}>
                You've used all of your AI hours for this period. Buy a top-up pack to keep going, or wait for your plan's reset.
              </p>
            )}
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

            {/* Auto top-up (owner-only for teams; everyone else sees the personal version) */}
            {isOwner && (
              <section className="rounded-xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <h2 className="text-base font-bold mb-1">Auto top-up</h2>
                <p className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  When the team pool runs out, automatically charge a top-up pack so calls keep flowing. Off by default. Always capped — your card is never charged more than the monthly limit.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={autoPack}
                    onChange={(e) => setAutoPack(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Off (manual top-ups only)</option>
                    <option value="topup_1h">1 hr · $10/charge</option>
                    <option value="topup_5h">5 hrs · $50/charge</option>
                    <option value="topup_25h">25 hrs · $250/charge</option>
                  </select>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cap $</span>
                    <input
                      type="number"
                      placeholder="50"
                      value={autoCapDollars}
                      onChange={(e) => setAutoCapDollars(e.target.value)}
                      min="0"
                      step="10"
                      className="w-20 px-2 py-2 text-sm rounded-lg"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
                  </div>
                  <button
                    onClick={saveAutoTopup}
                    disabled={autoSaving}
                    className="px-4 py-2 text-sm font-bold rounded-lg text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {autoSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {autoPack && (
                  <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Charged to your saved card. Disable any time. Failed charges fall through to the normal "buy a top-up" prompt.
                  </p>
                )}
              </section>
            )}

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
                    <div key={m.user_id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                      <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:flex-nowrap">
                        <div className="sm:text-right">
                          <p className="text-sm font-semibold">{formatHours(memberUsage?.hours_used || 0)}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {memberUsage?.calls || 0} calls
                            {m.per_member_hour_cap != null && (
                              <span className="ml-1.5">· cap {m.per_member_hour_cap}h</span>
                            )}
                          </p>
                        </div>
                        {isOwner && m.role !== 'owner' && (
                          <div className="flex items-center gap-1.5">
                            {editingCapFor === m.user_id ? (
                              <>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  placeholder="hr"
                                  value={capInput}
                                  onChange={(e) => setCapInput(e.target.value)}
                                  className="w-16 px-2 py-1 text-[11px] rounded-md"
                                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveCap(m.user_id)}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md text-white"
                                  style={{ background: 'var(--accent)' }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditingCapFor(null); setCapInput(''); }}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md"
                                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCapFor(m.user_id);
                                    setCapInput(m.per_member_hour_cap != null ? String(m.per_member_hour_cap) : '');
                                  }}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md"
                                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                  title="Set or clear an hour cap for this member"
                                >
                                  {m.per_member_hour_cap != null ? 'Edit cap' : 'Set cap'}
                                </button>
                                <button
                                  onClick={() => removeMember(m.user_id, m.email)}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md"
                                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
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
