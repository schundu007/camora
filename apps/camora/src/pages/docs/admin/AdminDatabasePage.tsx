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
          <li><code>users</code> &mdash; id, email, name, plan_type
            (<code>free</code> / <code>pro_monthly</code> / <code>pro_yearly</code> / <code>team</code> / <code>lifetime</code>),
            provider (google), avatar.</li>
          <li><code>ascend_subscriptions</code> &mdash; Stripe customer / sub IDs, period
            boundaries, cancel_at_period_end, auto_topup_pack, auto_topup_monthly_cap_cents,
            challenger-feature columns (is_challenger, challenger_qualified_at,
            challenger_quiz_score, challenger_credits_remaining).</li>
        </ul>
        <DocsCallout variant="warning" label="Bootstrap hazard">
          The billing-side tables &mdash; <code>ascend_subscriptions</code>,
          <code>ascend_credits</code>, <code>ascend_stripe_events</code>,
          <code>ascend_credit_transactions</code>, <code>ascend_free_usage</code> &mdash; are
          referenced via <code>ALTER TABLE</code> in the in-code migration sequence but their
          original <code>CREATE TABLE</code> statements no longer live in source. Bootstrapping a
          brand-new database from current code alone <strong>will not</strong> create them &mdash;
          they need to be created manually before the backend will fully boot.
        </DocsCallout>
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
          <li><code>lumora_conversations</code>, <code>lumora_messages</code> &mdash; conversation
            history.</li>
          <li><code>lumora_usage_logs</code> &mdash; per-call latency + tokens (legacy, parallels
            ai_hours_usage).</li>
          <li><code>lumora_bookmarks</code>, <code>lumora_quotas</code>, <code>coding_usage</code> &mdash;
            user-state tables.</li>
          <li><code>lumora_audio_preferences</code> &mdash; persisted audio-setup-wizard choices
            (capture method, mic, speaker, etc.) so users get the same setup across devices.</li>
          <li><code>lumora_company_context</code> &mdash; per-user / per-job target-company context
            for personalized answers.</li>
          <li><code>lumora_prep_state</code> &mdash; persisted prep-flow state.</li>
          <li><code>lumora_completion_marks</code> &mdash; topic / problem completion markers.</li>
          <li><code>ascend_diagram_cache</code> &mdash; system design diagrams keyed by problem
            hash (L2 cache; the in-memory LRU is L1).</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Engagement / gamification</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>ascend_certificates</code>, <code>ascend_challenger_activity</code>,
            <code>ascend_weekly_leaderboard</code> &mdash; challenger / leaderboard feature.</li>
          <li><code>ascend_prep_plans</code>, <code>ascend_prep_progress</code> &mdash; user prep
            plans and progress.</li>
          <li><code>ascend_referrals</code>, <code>ascend_badges</code>,
            <code>ascend_score_cards</code> &mdash; gamification.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Telemetry</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>active_sessions</code>, <code>usage_tracking</code>, <code>page_views</code>,
            <code>site_visitors</code> &mdash; analytics tables.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Misc</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>ascend_stripe_events</code> &mdash; webhook idempotency.</li>
          <li><code>ascend_topic_reads</code> &mdash; per-user topic read tracking.</li>
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
          <li><strong>Grant a user free hours</strong>:
            <code className="ml-1">INSERT INTO ai_hour_topups (user_id, hours, amount_cents, expires_at, source) VALUES (X, 5, 0, NULL, 'admin_grant');</code>
            (paid top-ups never expire &mdash; <code>expires_at</code> is nullable; the
            <code>source</code> column distinguishes admin grants from real purchases.)</li>
          <li><strong>Force-cancel a stuck subscription</strong>: <code>UPDATE ascend_subscriptions SET status = 'cancelled', cancel_at_period_end = true WHERE user_id = X;</code> (don't forget Stripe).</li>
          <li><strong>Reset a team's pool mid-period</strong>: <code>UPDATE teams SET hours_pool_period_start = NOW() WHERE id = X;</code></li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
