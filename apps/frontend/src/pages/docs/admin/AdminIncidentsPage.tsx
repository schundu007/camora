import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminIncidentsPage() {
  return (
    <DocsPageLayout
      title="Incident response"
      description="Common failure modes — when an LLM provider 502s, when Stripe is down, when the pool gate misfires."
      path="/docs/admin/incidents"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', href: '/docs/admin' }, { label: 'Incidents' }]}
      onThisPage={[
        { id: 'llm-down', label: 'LLM provider returns 5xx' },
        { id: 'stripe-down', label: 'Stripe down' },
        { id: 'gate-misfire', label: 'Pool gate misfire' },
        { id: 'auto-topup-runaway', label: 'Auto top-up runaway' },
        { id: 'webhook-delivery', label: 'Webhook delivery issues' },
        { id: 'kill-switches', label: 'Operator kill switches' },
      ]}
    >
      <section id="llm-down" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">LLM provider returns 5xx</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Anthropic or OpenAI returning 502/503/timeout. The route's Sona / Whisper call surfaces the error
          to the frontend; user sees a "try again" message. The metering write does NOT fire (no successful
          response = no usage recorded), so users aren't double-billed.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          What to do:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Check Anthropic status page (<code>status.anthropic.com</code>) and OpenAI's.</li>
          <li>If sustained, post a banner via the admin tools (or hardcode in <code>SiteNav</code> for fastest deploy).</li>
          <li>The auto-fallback (Claude → OpenAI) handles partial failures — see <code>solve.js</code>'s autoSwitch path.</li>
        </ol>
      </section>

      <section id="stripe-down" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Stripe down</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Frontend checkout: 503 from <code>/api/v1/billing/checkout</code> if <code>isStripeConfigured()</code> returns false. UI shows "Payment service unavailable" via dialogAlert.</li>
          <li>Auto top-up: <code>tryAutoTopup</code> returns <code>STRIPE_NOT_CONFIGURED</code> → gate falls through to normal 429.</li>
          <li>Webhooks: queued by Stripe and retried for up to 3 days. The idempotency table prevents double-processing.</li>
        </ul>
      </section>

      <section id="gate-misfire" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Pool gate misfire</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Symptoms: paying users get 429 TEAM_POOL_EXHAUSTED when their pool actually has hours.
          Most likely causes:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Stale Redis cache for team_id lookup. Flush: <code>redis-cli DEL "team:user:v1:*"</code>.</li>
          <li>Period rollover didn't fire (Stripe webhook missed). Manually run: <code>UPDATE teams SET hours_pool_period_start = NOW() WHERE id = X;</code></li>
          <li>Refund marked rows but cache still holds old sum — same flush.</li>
        </ul>
        <DocsCallout variant="tip">
          The gate is fail-open: any internal error during the budget check lets the call through. So
          gate misfires usually mean it actually computed exhaustion correctly. Verify with the database
          query in <a href="/docs/admin/database" className="text-[var(--accent)] underline">Database schema</a>{' '}
          before assuming it's a bug.
        </DocsCallout>
      </section>

      <section id="auto-topup-runaway" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Auto top-up runaway</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Worst-case scenario: an LLM provider bug produces many short calls in rapid succession and
          auto-topup fires repeatedly until the monthly cap is hit. Defenses:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Monthly cap is required at config time</strong> — auto-topup can never exceed it.</li>
          <li><strong>30-day auto-charged total</strong> shown on /admin/teams (red highlight at &gt;$500).</li>
          <li><strong>Operator kill switch</strong> — POST to <code>/api/v1/teams/admin/:teamId/disable-auto-topup</code> or click the red "Disable auto" button per team row.</li>
        </ul>
      </section>

      <section id="webhook-delivery" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Webhook delivery issues</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Stripe Dashboard → Developers → Webhooks → click your endpoint → see delivery attempts.</li>
          <li>Replay a missed event: click the event ID → Resend.</li>
          <li>Manual fallback: query <code>ascend_subscriptions</code> for stale rows; correct via DB.</li>
        </ul>
      </section>

      <section id="kill-switches" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Operator kill switches</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>POST /api/v1/teams/admin/:id/disable-auto-topup</code> — sets auto_topup_pack=NULL.</li>
          <li><code>POST /api/v1/teams/admin/:id/force-cap-member</code> — sets per_member_hour_cap on a runaway member.</li>
          <li>Server-wide AI shutoff: unset <code>ANTHROPIC_API_KEY</code> + <code>OPENAI_API_KEY</code> on Railway → restart. All LLM routes return 503.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
