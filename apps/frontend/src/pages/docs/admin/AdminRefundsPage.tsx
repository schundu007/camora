import { Link } from 'react-router-dom';
import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminRefundsPage() {
  return (
    <DocsPageLayout
      title="Refund approval"
      description="Reviewing and approving top-up refund requests via the admin dashboard."
      path="/docs/admin/refunds"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', href: '/docs/admin' }, { label: 'Refunds' }]}
      onThisPage={[
        { id: 'flow', label: 'How the flow works' },
        { id: 'reviewing', label: 'Reviewing a request' },
        { id: 'guidelines', label: 'When to approve / deny' },
        { id: 'after-approval', label: 'What happens after approval' },
        { id: 'sla', label: 'Response SLA' },
      ]}
    >
      <section id="flow" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How the flow works</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>User clicks <strong>Request refund</strong> on a top-up at <Link to="/account/team" className="text-[var(--accent)] underline">/account/team</Link>.</li>
          <li>A row lands in <code>topup_refund_requests</code> with status='pending'.</li>
          <li>Admin sees it in the Pending refund queue at <Link to="/admin/teams" className="text-[var(--accent)] underline">/admin/teams</Link>.</li>
          <li>Admin clicks <strong>Approve &amp; refund</strong> — Camora calls <code>stripe.refunds.create</code> + marks both rows.</li>
          <li>Or admin clicks <strong>Deny</strong> — request flips to denied; user sees "Refund denied" badge.</li>
        </ol>
        <DocsCallout variant="note">
          Hours stay usable for the user while the request is pending. Once approved, the refund row's
          hours immediately stop counting toward the pool.
        </DocsCallout>
      </section>

      <section id="reviewing" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Reviewing a request</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          On <Link to="/admin/teams" className="text-[var(--accent)] underline">/admin/teams</Link>, the
          Pending refund requests panel shows for each request:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Requester (name + email)</li>
          <li>Hours + dollar amount</li>
          <li>AUTO badge if it was an off-session auto top-up charge</li>
          <li>Purchase date + request date</li>
          <li>User-supplied reason (italic, in quotes)</li>
        </ul>
      </section>

      <section id="guidelines" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">When to approve / deny</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Default to approve.</strong> Refund-friendliness is a competitive moat against incumbents
          who fight chargebacks. Keep denial reserved for clear abuse patterns.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Approve</strong> when:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>User's reason is reasonable: "didn't realize auto-topup was on", "duplicate purchase", "interview cancelled".</li>
          <li>Auto top-up charged unexpectedly because the cap was set too high.</li>
          <li>Purchase was &lt; 7 days ago and most hours unused.</li>
        </ul>
        <p className="text-[15px] leading-relaxed mt-3 mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Deny</strong> when:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>User has consumed &gt; 80% of the hours and is now requesting refund.</li>
          <li>Repeated request pattern (multiple refunds in &lt; 30 days).</li>
          <li>Indicates a chargeback threat — escalate to Stripe Dispute Center instead of a unilateral refund.</li>
        </ul>
      </section>

      <section id="after-approval" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">What happens after approval</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Stripe issues the refund to the original payment method (5-10 business days for the user).</li>
          <li><code>ai_hour_topups.refunded_at = NOW()</code> — pool calc immediately excludes those hours.</li>
          <li><code>topup_refund_requests.status = 'approved'</code> + Stripe refund ID stored.</li>
          <li>User's UI badge flips from "pending" to "Refunded".</li>
        </ol>
        <DocsCallout variant="warning">
          If the user has already consumed those hours, the team pool may instantly become "exhausted" and
          gate them. They'll see a 429 on the next call. Use your judgment — sometimes worth pinging them
          via email afterward to explain.
        </DocsCallout>
      </section>

      <section id="sla" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Response SLA</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The user-facing copy promises <strong>1-2 business days</strong>. In practice, target same-day
          response for under-$50 amounts (low-risk, high-trust signal); within 24 hours for larger.
        </p>
      </section>
    </DocsPageLayout>
  );
}
