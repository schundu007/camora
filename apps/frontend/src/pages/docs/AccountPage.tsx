import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function AccountDocsPage() {
  return (
    <DocsPageLayout
      title="Account & billing"
      description="Plans, payment methods, cancellation, resume, refunds — everything about the money side of Camora."
      path="/docs/account"
      eyebrow="USER GUIDE"
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
          Three personal tiers, two business SKUs, one desktop add-on, three top-up packs. Full breakdown
          on the <Link to="/pricing" className="text-[var(--accent)] underline">pricing page</Link>:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Free</strong> — $0, 30 min lifetime AI hours, 1 topic per category.</li>
          <li><strong>Pro</strong> — $29/mo or $290/yr, 2 hrs/mo (24 hrs/yr).</li>
          <li><strong>Pro Max</strong> — $79/mo or $790/yr, 8 hrs/mo (96 hrs/yr), team sharing up to 5 seats.</li>
          <li><strong>Business Starter</strong> — $499 one-time, 75 hrs + 10 seats.</li>
          <li><strong>Business Desktop Lifetime</strong> — $999 one-time, 10 desktop seats.</li>
        </ul>
      </section>

      <section id="payment-method" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Payment method</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Camora uses Stripe Checkout, so payment method updates go through Stripe's hosted flow. Open
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">/account/team</Link> and click any top-up — Stripe Checkout
          opens, lets you update your default card, and the new card becomes the one used for auto top-up
          off-session charges.
        </p>
      </section>

      <section id="cancel" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Cancelling</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Click <strong>Cancel subscription</strong> on the Subscription card on
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">/account/team</Link>. Cancellation is at the end of
          your current billing period — you keep team access until then, then drop to free.
        </p>
        <DocsCallout variant="note">
          Cancellation only affects the recurring subscription. Top-ups already in your account stay valid
          until their 90-day expiry, regardless of subscription state.
        </DocsCallout>

        <h3 id="resume" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Resuming a cancellation</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Changed your mind before the period ends? Same card on /account/team flips to "Cancellation
          scheduled" with a <strong>Resume subscription</strong> button. Click it and Camora calls Stripe to
          uncancel — billing resumes normally on the next renewal.
        </p>
      </section>

      <section id="refunds" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Refunds</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Top-up packs are refundable for full amount via admin review. Open the Recent top-ups section
          on <Link to="/account/team" className="text-[var(--accent)] underline">/account/team</Link>, click <strong>Request refund</strong>,
          and a Camora admin reviews within 1-2 business days. Once approved, Stripe issues the refund;
          the hours stop counting toward your pool immediately.
        </p>
        <DocsCallout variant="warning">
          A pending request doesn't suspend your hours — they remain usable while the admin reviews. If the
          admin denies the request, the hours stay valid.
        </DocsCallout>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          Subscription refunds are case-by-case via support. Email <a href="mailto:hi@cariara.com" className="text-[var(--accent)] underline">hi@cariara.com</a> with your situation.
        </p>
      </section>

      <section id="invoices" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Invoices</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Stripe emails an invoice for every charge to the email on your account. To get an itemized
          history, log into Stripe's Customer Portal — link is in the invoice emails — or email support
          and we'll send a CSV.
        </p>
      </section>
    </DocsPageLayout>
  );
}
