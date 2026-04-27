import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminDatabasePage() {
  return (
    <DocsPageLayout
      title="Database schema"
      description="Tables, idempotent migrations, when to manually intervene, common ops queries."
      path="/docs/admin/database"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Database' }]}
      onThisPage={[
        { id: 'tables', label: 'Tables' },
        { id: 'migrations', label: 'How migrations work' },
        { id: 'common-queries', label: 'Common ops queries' },
        { id: 'manual-fixes', label: 'Manual fixes' },
      ]}
    >
      <section id="tables" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Tables</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Single Postgres database shared across both backends. Key tables:
        </p>
        <h3 className="text-base font-bold mt-4 mb-2">User &amp; auth</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>users</code> — id, email, name, plan_type (free/pro_monthly/pro_max_yearly/etc), provider (google), avatar.</li>
          <li><code>ascend_subscriptions</code> — Stripe customer/sub IDs, period boundaries, cancel_at_period_end, auto_topup_pack, auto_topup_monthly_cap_cents.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Hour metering</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>ai_hours_usage</code> — every LLM call. surface, seconds, tokens_in/out, model, plan_at_charge, team_id.</li>
          <li><code>ai_hour_topups</code> — purchased + auto-charged top-ups. user_id, team_id (nullable), hours, amount_cents, expires_at, refunded_at, auto_charged.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Team feature</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>teams</code> — owner_user_id, plan_type, seat_limit, hours_pool_total, hours_pool_period_start, auto_topup_*, pool_reminder_*_sent_at.</li>
          <li><code>team_members</code> — UNIQUE (user_id) → one team per user. Stores role + per_member_hour_cap.</li>
          <li><code>team_invites</code> — token, email, expires_at, accepted_at.</li>
          <li><code>topup_refund_requests</code> — admin-approved refund queue. status pending/approved/denied.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Lumora content</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>lumora_conversations</code>, <code>lumora_messages</code> — conversation history.</li>
          <li><code>lumora_usage_logs</code> — per-call latency + tokens (legacy, parallels ai_hours_usage).</li>
          <li><code>ascend_diagram_cache</code> — system design diagrams keyed by problem hash.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Misc</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>ascend_stripe_events</code> — webhook idempotency.</li>
          <li><code>ascend_topic_reads</code> — per-user topic read tracking for free-tier gating.</li>
          <li><code>ascend_referrals</code>, <code>ascend_badges</code>, <code>ascend_score_cards</code> — gamification.</li>
        </ul>
      </section>

      <section id="migrations" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How migrations work</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          There's no formal migration tool. Both backends call <code>runMigrations()</code> on boot —
          a sequence of <code>CREATE TABLE IF NOT EXISTS</code> and <code>ALTER TABLE ADD COLUMN IF NOT EXISTS</code> statements.
          Whichever service boots first wins; the other's run is a no-op.
        </p>
        <DocsCallout variant="warning">
          Adding a column? Edit the relevant <code>runMigrations</code> function. Deploying the new code
          runs the ALTER on next boot. <strong>Never</strong> drop a column in code — that breaks rollbacks.
          For destructive changes, run the SQL manually via Railway's Postgres console + adjust code in a
          follow-up commit.
        </DocsCallout>
      </section>

      <section id="common-queries" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Common ops queries</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Run these via Railway's Postgres console or a psql session.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-1">Total AI hours used in the last 7 days, fleet-wide:</p>
            <pre className="text-[12px] p-3 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
{`SELECT SUM(seconds) / 3600.0 AS hours
FROM ai_hours_usage
WHERE created_at > NOW() - INTERVAL '7 days';`}
            </pre>
          </div>
          <div>
            <p className="text-[13px] font-semibold mb-1">Top 10 paying customers by current-period usage:</p>
            <pre className="text-[12px] p-3 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
{`SELECT u.email, s.plan_type, SUM(au.seconds)/3600.0 AS hours
FROM ai_hours_usage au
JOIN ascend_subscriptions s ON s.user_id = au.user_id
JOIN users u ON u.id = au.user_id
WHERE au.created_at >= s.current_period_start
GROUP BY u.email, s.plan_type
ORDER BY hours DESC LIMIT 10;`}
            </pre>
          </div>
          <div>
            <p className="text-[13px] font-semibold mb-1">All teams currently over 80% pool:</p>
            <pre className="text-[12px] p-3 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
{`SELECT t.id, u.email AS owner, t.plan_type,
  t.hours_pool_total AS pool,
  COALESCE((SELECT SUM(seconds)/3600.0 FROM ai_hours_usage
    WHERE team_id = t.id AND created_at >= t.hours_pool_period_start), 0) AS used
FROM teams t JOIN users u ON u.id = t.owner_user_id
WHERE t.hours_pool_total > 0
ORDER BY used / NULLIF(t.hours_pool_total, 0) DESC;`}
            </pre>
          </div>
        </div>
      </section>

      <section id="manual-fixes" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Manual fixes</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Grant a user free hours</strong>: <code>INSERT INTO ai_hour_topups (user_id, hours, amount_cents, expires_at) VALUES (X, 5, 0, NOW() + INTERVAL '90 days');</code></li>
          <li><strong>Force-cancel a stuck subscription</strong>: <code>UPDATE ascend_subscriptions SET status = 'cancelled', cancel_at_period_end = true WHERE user_id = X;</code> (don't forget Stripe).</li>
          <li><strong>Reset a team's pool mid-period</strong>: <code>UPDATE teams SET hours_pool_period_start = NOW() WHERE id = X;</code></li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
