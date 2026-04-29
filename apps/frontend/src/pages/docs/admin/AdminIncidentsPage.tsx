import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminIncidentsPage() {
  return (
    <DocsPageLayout
      title="Incident response"
      description="Common failure modes — when an LLM provider 502s, when Stripe is down, when the pool gate misfires."
      path="/docs/admin/incidents"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Incidents' }]}
      onThisPage={[
        { id: 'llm-down', label: 'LLM provider returns 5xx' },
        { id: 'stripe-down', label: 'Stripe down' },
        { id: 'gate-misfire', label: 'Pool gate misfire' },
        { id: 'auto-topup-runaway', label: 'Auto top-up runaway' },
        { id: 'webhook-delivery', label: 'Webhook delivery issues' },
        { id: 'sharp-boot-crash', label: 'Backend boot crash from native module' },
        { id: 'retired-model-id', label: 'Anthropic 400 from retired model ID' },
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

      <section id="sharp-boot-crash" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Backend boot crash from native module (sharp)</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Symptoms:</strong> lumora-backend on Railway crash-looping at boot with{' '}
          <code>Error: Could not load the "sharp" module using the linux-x64 runtime</code>. All Sona /
          coding / behavioral routes return errors because the process never finishes starting. Frontend
          shows generic "Error: Something went wrong" bubbles.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Root cause:</strong> <code>sharp</code> is a native Node module that ships
          platform-specific prebuilt binaries. The lockfile committed from a Mac dev machine pinned the
          darwin-arm64 binary, so on Railway's linux-x64 runtime the require fails. Because{' '}
          <code>routes/coding.js</code> imported sharp at top-of-file, the failure happened at module
          evaluation and crashed the process before Express could bind a port.
        </p>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          <strong>Mitigation (commit <code>2b0f915a</code>):</strong>
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Lazy-load sharp with a <code>loadSharp()</code> async helper called only from the function that uses it (<code>ensureImageWithinAnthropicLimit</code>).</li>
          <li>Wrap the import in try/catch. On failure log a warning <em>once</em> and set a module-level flag so subsequent calls skip the import attempt.</li>
          <li>The function returns the original base64 unchanged when sharp is unavailable — Anthropic decides whether the image is too large per request, instead of the entire backend going down.</li>
        </ul>
        <DocsCallout variant="tip">
          Apply the same lazy-load pattern to any future native Node module (<code>better-sqlite3</code>,
          <code>node-pty</code>, <code>canvas</code>, etc.). Top-of-file requires for native modules are
          always a deploy hazard.
        </DocsCallout>
      </section>

      <section id="retired-model-id" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Anthropic 400 from retired model ID</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Symptoms:</strong> Sona behavioral / inference paths return{' '}
          <code>{`Error: 400 {"type":"error","error":{"type":"invalid_request_error",…}}`}</code> with no
          successful answers. Coding works (it was on Haiku, behavioral paid users were on the retired ID).
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Root cause:</strong> hardcoded model IDs went stale. <code>claude-sonnet-4-20250514</code>{' '}
          (Sonnet 4.0) and <code>claude-sonnet-4-5-20250929</code> (Sonnet 4.5) were retired by Anthropic.
          Every request using those IDs returns 400 <code>invalid_request_error</code>.
        </p>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          <strong>Mitigation (commit <code>1389fc8d</code>):</strong>
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Repo-wide sweep: replaced both retired IDs with <code>claude-sonnet-4-6</code> across 22 files (lumora-backend, ascend-backend, ai-services, frontend data, admin docs).</li>
          <li>Verified Railway env vars: if <code>CLAUDE_MODEL_PAID</code> is set there, the env wins over the code default — must also be updated to a current ID.</li>
        </ul>
        <DocsCallout variant="warning">
          Hardcoded model IDs across the codebase is a recurring tax. The model picker in Lumora Settings
          (in progress) will let users override per-surface so future model bumps only require updating
          the central registry in <code>apps/frontend/src/lib/claude-models.ts</code> plus any backend
          fallback constants.
        </DocsCallout>
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
