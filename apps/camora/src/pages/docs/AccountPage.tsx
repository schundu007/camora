import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function AccountDocsPage() {
  return (
    <DocsPageLayout
      title="Account & billing"
      description="Plans, payment methods, cancellation, resume, refunds — everything about the money side of Camora."
      path="/docs/account"
      breadcrumbs={[{ label: 'Account & billing' }]}
      onThisPage={[
        { id: 'plans', label: 'Plans' },
        { id: 'payment-method', label: 'Payment method' },
        { id: 'cancel', label: 'Cancelling' },
        { id: 'resume', label: 'Resuming a cancellation', depth: 1 },
        { id: 'refunds', label: 'Refunds' },
        { id: 'invoices', label: 'Invoices' },
      ]}
    >
      <section id="plans" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Plans</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Two solo subscriptions, one Team plan, plus pay-as-you-go top-ups. Full breakdown on the
          <Link to="/pricing" className="text-[var(--accent)] underline ml-1">pricing page</Link>:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Free trial</strong> — 1 hour of AI hours, expires 7 days after sign-up. No card required.</li>
          <li><strong>Monthly</strong> — $19/month, includes 2 hours/month of AI hours.</li>
          <li><strong>Yearly</strong> — $99/year, includes 5 hours/month of AI hours (best value).</li>
          <li><strong>Team</strong> — dynamic pricing: 5&ndash;50 seats, <code>seats × $20 − $1</code>/month,
            includes <code>⌈seats × 0.7⌉</code> hours/month pooled across the team. Example: 10 seats =
            $199/month, 7 hours pooled.</li>
          <li><strong>Top-ups</strong> — $15 per AI hour, buy 1&ndash;50 in one transaction. Top-up
            hours <strong>never expire</strong>.</li>
        </ul>
        <DocsCallout variant="note">
          Top-ups stack on top of your subscription pool and only require an active subscription to
          purchase. The subscription pool refills monthly; top-ups stay on your account until used.
        </DocsCallout>
      </section>

      <section id="payment-method" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Payment method</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Camora uses Stripe Checkout, so payment-method updates go through Stripe&apos;s hosted flow.
          Open <Link to="/account/team" className="text-[var(--accent)] underline">/account/team</Link> and
          start any top-up &mdash; Stripe Checkout opens, lets you update your default card, and the new
          card becomes the one used for future renewals and auto top-up off-session charges.
        </p>
      </section>

      <section id="cancel" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Cancelling</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Click <strong>Cancel subscription</strong> on the Subscription card on
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">/account/team</Link>.
          Cancellation is at the end of your current billing period &mdash; you keep all access until
          then, then drop to free.
        </p>
        <DocsCallout variant="note">
          Cancellation only affects the recurring subscription. Top-up hours already in your account
          stay on your balance permanently and are not affected by subscription state.
        </DocsCallout>

        <h3 id="resume" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Resuming a cancellation</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Changed your mind before the period ends? The Subscription card on /account/team flips to
          &ldquo;Cancellation scheduled&rdquo; with a <strong>Resume subscription</strong> button. Click
          it and Camora calls Stripe to uncancel &mdash; billing resumes normally on the next renewal.
        </p>
      </section>

      <section id="refunds" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Refunds</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Top-up packs are refundable for the full amount via admin review. Open the Recent top-ups
          section on <Link to="/account/team" className="text-[var(--accent)] underline">/account/team</Link>,
          click <strong>Request refund</strong>, and a Camora admin reviews within 1&ndash;2 business
          days. Once approved, Stripe issues the refund and the hours stop counting toward your pool
          immediately.
        </p>
        <DocsCallout variant="warning">
          A pending request doesn&apos;t suspend your hours &mdash; they remain usable while the admin
          reviews. If the admin denies the request, the hours stay on your account.
        </DocsCallout>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          Subscription refunds are case-by-case via support. Email <a href="mailto:hi@cariara.com" className="text-[var(--accent)] underline">hi@cariara.com</a> with your situation.
        </p>
      </section>

      <section id="invoices" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Invoices</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Stripe emails an invoice for every charge to the email on your account. To get an itemized
          history, log into Stripe&apos;s Customer Portal &mdash; the link is in any invoice email
          &mdash; or email support and we&apos;ll send a CSV.
        </p>
      </section>
    </DocsPageLayout>
  );
}
