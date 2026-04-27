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
        { id: 'recurring', label: 'Recurring SKUs', depth: 1 },
        { id: 'one-time', label: 'One-time SKUs', depth: 1 },
        { id: 'webhook', label: 'Webhook configuration' },
        { id: 'test-mode', label: 'Test mode walkthrough' },
      ]}
    >
      <section id="price-ids" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Price IDs</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Create the products + prices in your Stripe Dashboard, then set the matching env vars on the
          ascend-backend Railway service. Without these, <code>/api/v1/billing/prices</code> returns null
          for the missing SKUs and checkout 400s with INVALID_PRICE.
        </p>

        <h3 id="recurring" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Recurring SKUs</h3>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Env var</th>
                <th className="text-left px-4 py-2.5 font-semibold">Amount</th>
                <th className="text-left px-4 py-2.5 font-semibold">Interval</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_PRO_MONTHLY</td><td className="px-4 py-2.5">$29</td><td className="px-4 py-2.5">month</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_PRO_YEARLY</td><td className="px-4 py-2.5">$290</td><td className="px-4 py-2.5">year</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_PRO_MAX_MONTHLY</td><td className="px-4 py-2.5">$79</td><td className="px-4 py-2.5">month</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_PRO_MAX_YEARLY</td><td className="px-4 py-2.5">$790</td><td className="px-4 py-2.5">year</td></tr>
            </tbody>
          </table>
        </div>

        <h3 id="one-time" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">One-time SKUs</h3>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr><th className="text-left px-4 py-2.5 font-semibold">Env var</th><th className="text-left px-4 py-2.5 font-semibold">Amount</th><th className="text-left px-4 py-2.5 font-semibold">What it buys</th></tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_DESKTOP_LIFETIME</td><td className="px-4 py-2.5">$99</td><td className="px-4 py-2.5">Desktop · 1 user · BYOK</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_BUSINESS_DESKTOP_LIFETIME</td><td className="px-4 py-2.5">$999</td><td className="px-4 py-2.5">Desktop · 10 seats</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_BUSINESS_STARTER</td><td className="px-4 py-2.5">$499</td><td className="px-4 py-2.5">75 hrs + 10 team seats</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_TOPUP_1H</td><td className="px-4 py-2.5">$10</td><td className="px-4 py-2.5">1 AI hour, 90-day expiry</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_TOPUP_5H</td><td className="px-4 py-2.5">$50</td><td className="px-4 py-2.5">5 AI hours, 90-day expiry</td></tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}><td className="px-4 py-2.5">STRIPE_PRICE_TOPUP_25H</td><td className="px-4 py-2.5">$250</td><td className="px-4 py-2.5">25 AI hours, 90-day expiry</td></tr>
            </tbody>
          </table>
        </div>
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
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Toggle Stripe Dashboard to test mode. Create the same set of products + prices.</li>
          <li>Set the <code>STRIPE_PRICE_*</code> env vars on a Railway preview environment to the test IDs.</li>
          <li>Use Stripe's test cards (e.g. <code>4242 4242 4242 4242</code> any expiry/CVC) to run end-to-end.</li>
          <li>Use the Stripe CLI to forward webhooks: <code>stripe listen --forward-to localhost:8000/api/billing/webhook</code></li>
        </ol>
      </section>
    </DocsPageLayout>
  );
}
