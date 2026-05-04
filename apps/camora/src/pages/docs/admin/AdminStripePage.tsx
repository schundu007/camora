import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminStripePage() {
  return (
    <DocsPageLayout
      title="Stripe configuration"
      description="Price IDs to create, webhook events to subscribe to, test mode walkthrough."
      path="/docs/admin/stripe"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Stripe' }]}
      onThisPage={[
        { id: 'price-ids', label: 'Price IDs' },
        { id: 'live-mappings', label: 'Live mappings', depth: 1 },
        { id: 'team-product', label: 'Team product (dynamic)' },
        { id: 'webhook', label: 'Webhook configuration' },
        { id: 'test-mode', label: 'Test mode walkthrough' },
      ]}
    >
      <section id="price-ids" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Price IDs</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Pricing v3 collapses the catalog to three flat options. Set the matching env vars on the
          ascend-backend Railway service. Without these, <code>/api/v1/billing/prices</code> returns null
          for the missing SKUs and checkout 400s with <code>INVALID_PRICE</code>.
        </p>

        <h3 id="live-mappings" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Live mappings</h3>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Env var</th>
                <th className="text-left px-4 py-2.5 font-semibold">Stripe price ID</th>
                <th className="text-left px-4 py-2.5 font-semibold">Amount</th>
                <th className="text-left px-4 py-2.5 font-semibold">What it buys</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5"><code>STRIPE_PRICE_PRO_MONTHLY</code></td>
                <td className="px-4 py-2.5"><code>price_1TSWQmITUCNxtMxlMbwkDtLD</code></td>
                <td className="px-4 py-2.5">$19</td>
                <td className="px-4 py-2.5">Camora Monthly · full access</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5"><code>STRIPE_PRICE_PRO_YEARLY</code></td>
                <td className="px-4 py-2.5"><code>price_1TSWOtITUCNxtMxlyIxVzRIi</code></td>
                <td className="px-4 py-2.5">$99</td>
                <td className="px-4 py-2.5">Camora Yearly · full access, ~57% off vs monthly × 12</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5"><code>STRIPE_PRICE_TOPUP_1H</code></td>
                <td className="px-4 py-2.5"><code>price_1THiagITUCNxtMxlG8idH0Cz</code></td>
                <td className="px-4 py-2.5">$15</td>
                <td className="px-4 py-2.5">Camora Hr Rate · 1 AI hour, never expires, supports quantity 1&ndash;50</td>
              </tr>
            </tbody>
          </table>
        </div>

        <DocsCallout variant="note">
          The frontend uses the price keys <code>pro_monthly</code> / <code>pro_yearly</code> /
          <code>topup_1h</code> as stable internal IDs. The Stripe Dashboard prices behind them
          can be re-pointed at any time by changing the env vars &mdash; no code deploy needed.
        </DocsCallout>
      </section>

      <section id="team-product" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Team product (dynamic price)</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The Team plan is dynamic-priced (5&ndash;50 seats), so it&apos;s a single Stripe
          <strong> Product</strong> &mdash; not a fixed Price &mdash; with the unit amount computed
          per checkout via <code>price_data</code>.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>STRIPE_PRODUCT_TEAM</code> &mdash; the Stripe product ID. Required for team
            checkout; without it, <code>POST /api/v1/billing/checkout</code> with
            <code> &#123; plan: &apos;team&apos;, seats: N &#125;</code> returns 503.</li>
          <li>Per-checkout amount: <code>seats × $20 &minus; $1</code> per month
            (e.g. 10 seats &rarr; $199/mo).</li>
          <li>Per-checkout included hours: <code>⌈seats × 0.7⌉</code> per month
            (e.g. 10 seats &rarr; 7 hrs).</li>
        </ul>
      </section>

      <section id="webhook" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Webhook configuration</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Webhook endpoint: <code>https://caprab.cariara.com/api/billing/webhook</code>. Subscribe to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>checkout.session.completed</code> — activates plan, auto-creates teams, credits top-ups</li>
          <li><code>invoice.paid</code> — period rollover, hour pool reset</li>
          <li><code>invoice.payment_failed</code> — marks subscription past_due</li>
          <li><code>customer.subscription.updated</code> — plan change, cancel_at_period_end mirror</li>
          <li><code>customer.subscription.deleted</code> — drop to free plan</li>
          <li><code>payment_intent.payment_failed</code> — async auto-topup failure (Phase 8)</li>
        </ul>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          Set <code>STRIPE_WEBHOOK_SECRET</code> from the webhook's signing secret. Without this, the
          handler returns 503 — webhook signature can't be verified.
        </p>
        <DocsCallout variant="warning">
          The webhook route uses <code>express.raw()</code> body parsing, mounted BEFORE
          <code>express.json()</code>. If you ever rewrite the webhook handler, keep this order — Stripe's
          signature verifies against the raw bytes, not parsed JSON.
        </DocsCallout>
      </section>

      <section id="test-mode" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Test mode walkthrough</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora doesn&apos;t run a Railway staging environment, so test against your local backend:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Toggle Stripe Dashboard to test mode. Create the same set of products + prices.</li>
          <li>In your local <code>.env</code> for ascend-backend, set
            <code className="mx-1">STRIPE_SECRET_KEY</code>,
            <code className="mx-1">STRIPE_PRICE_PRO_MONTHLY</code>,
            <code className="mx-1">STRIPE_PRICE_PRO_YEARLY</code>,
            <code className="mx-1">STRIPE_PRICE_TOPUP_1H</code>,
            <code className="mx-1">STRIPE_PRODUCT_TEAM</code> to the test-mode IDs.</li>
          <li>Run <code>pnpm dev:ascend</code>. Use Stripe&apos;s test cards (e.g.
            <code className="mx-1">4242 4242 4242 4242</code> with any future expiry / CVC) to run
            end-to-end.</li>
          <li>Use the Stripe CLI to forward webhooks to your local server:
            <code className="ml-1">stripe listen --forward-to localhost:3009/api/billing/webhook</code>.
            Set <code className="mx-1">STRIPE_WEBHOOK_SECRET</code> from <code>stripe listen</code>&apos;s
            output.</li>
        </ol>
      </section>
    </DocsPageLayout>
  );
}
