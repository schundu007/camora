import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function TeamsDocsPage() {
  return (
    <DocsPageLayout
      title="Team sharing"
      description="Pool Camora AI hours with up to 50 teammates, set per-member caps, and configure auto top-up so calls don't get cut off."
      path="/docs/teams"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Team sharing' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'eligibility', label: 'Who can create a team' },
        { id: 'invite-mates', label: 'Invite mates', depth: 1 },
        { id: 'pooled-hours', label: 'Pooled hours', depth: 1 },
        { id: 'per-member-caps', label: 'Per-member caps' },
        { id: 'auto-topup', label: 'Auto top-up' },
        { id: 'cancellation', label: 'Cancellation' },
        { id: 'refunds', label: 'Refunds' },
      ]}
    >
      <section id="overview" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          A Camora team is a single billing scope that shares a pool of AI hours across multiple
          users. The team owner pays the subscription; members get full access to live session,
          coding helper, and prep generation while the pool has hours remaining.
        </p>
        <DocsCallout variant="tip">
          <strong>One person, one team.</strong> Each user can be a member of exactly one team at a
          time. To switch teams you&apos;ll need to be removed from the current team first.
        </DocsCallout>
      </section>

      <section id="eligibility" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-4">Who can create a team</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Only the <strong>Team plan</strong> supports team sharing &mdash; the solo Monthly and Yearly
          plans cannot create or own a team. Team is dynamic-priced from 5 to 50 seats.
        </p>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Seats</th>
                <th className="text-left px-4 py-2.5 font-semibold">Monthly price</th>
                <th className="text-left px-4 py-2.5 font-semibold">Hours pooled / month</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">5 (minimum)</td>
                <td className="px-4 py-2.5">$99</td>
                <td className="px-4 py-2.5">4 hrs</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">10</td>
                <td className="px-4 py-2.5">$199</td>
                <td className="px-4 py-2.5">7 hrs</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">25</td>
                <td className="px-4 py-2.5">$499</td>
                <td className="px-4 py-2.5">18 hrs</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">50 (maximum)</td>
                <td className="px-4 py-2.5">$999</td>
                <td className="px-4 py-2.5">35 hrs</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Pricing formula: <code>seats × $20 − $1</code> per month. Hours formula:
          <code className="mx-1">⌈seats × 0.7⌉</code> per month. Pick any seat count between 5 and 50
          on the <Link to="/pricing" className="text-[var(--accent)] underline">pricing page</Link>;
          the team is created automatically after checkout, and you can manage seats and members at
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">/account/team</Link>.
        </p>

        <h3 id="invite-mates" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Invite mates</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Open <Link to="/account/team" className="text-[var(--accent)] underline">Team settings</Link>.</li>
          <li>Type your friend&apos;s email and click <strong>Create invite</strong>.</li>
          <li>An invite email goes out via Resend, plus you get a copyable join link
            (<code>/teams/join/&lt;token&gt;</code>).</li>
          <li>Once they click the link and sign in, they&apos;re auto-added to your team&apos;s pool.</li>
        </ol>
        <DocsCallout variant="note">
          Invites expire 14 days from creation. Owners can cancel any pending invite from the
          settings page.
        </DocsCallout>

        <h3 id="pooled-hours" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">How pooled hours work</h3>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          All members draw from the same hour bucket. When a member transcribes audio or asks Sona a
          question, the seconds consumed count against the team total. The pool resets at the start
          of each billing period.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Members see only their own usage on the team meter; the owner sees a full per-member
          breakdown plus the team total.
        </p>
      </section>

      <section id="per-member-caps" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-4">Per-member caps</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Owners can set a maximum hours-per-period limit on individual members so a single user
          can&apos;t drain the whole pool. Click <strong>Set cap</strong> next to any member row in
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">Team settings</Link>
          and enter a number of hours. Edit the cap and save with empty input to remove it.
        </p>
        <DocsCallout variant="tip">
          <strong>Cap math:</strong> usage is counted only against calls a member made
          <em> through this team&apos;s pool</em>. Their personal usage on a different team or before
          joining doesn&apos;t count.
        </DocsCallout>
      </section>

      <section id="auto-topup" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-4">Auto top-up</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          When the team pool runs out mid-call, Camora can automatically charge a top-up so the call
          keeps flowing. <strong>Off by default.</strong> Owners enable it in
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">Team settings</Link>
          and pick:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Pack</strong> &mdash; auto-charges add 1 hour each time ($15). This is the only
            top-up pack today; quantity-stacking is available for manual purchases but auto top-up
            charges one hour per trigger.</li>
          <li><strong>Monthly cap</strong> &mdash; hard ceiling on auto-charges in a calendar month.
            Required.</li>
        </ul>
        <DocsCallout variant="warning" label="Cap is required">
          You can&apos;t enable auto top-up without a monthly cap. The cap protects against runaway
          charges if a provider failure produces many short retries in a row.
        </DocsCallout>
        <p className="text-[15px] leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
          Failed off-session charges (3DS timeout, expired card, decline) automatically disable auto
          top-up and email you a &ldquo;card needs updating&rdquo; notice. Buying any pack manually
          updates your default payment method, after which you can re-enable.
        </p>
        <DocsCallout variant="note">
          For team members, the team owner&apos;s auto-topup config takes precedence over any
          individual member&apos;s solo config &mdash; the team pays.
        </DocsCallout>
      </section>

      <section id="cancellation" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-4">Cancellation</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Subscriptions cancel <strong>at the end of the current billing period</strong> &mdash; you
          keep team access until then. To cancel, hit <strong>Cancel subscription</strong> on
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">Team settings</Link>.
          Changed your mind before the period ends? Click <strong>Resume</strong> to undo the
          cancellation.
        </p>
        <DocsCallout variant="note">
          Cancellation only affects the recurring subscription. Top-up hours already on your account
          stay on your balance permanently &mdash; they never expire and aren&apos;t affected by
          subscription state.
        </DocsCallout>
      </section>

      <section id="refunds" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-4">Refunds</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Top-up packs are refundable via admin review &mdash; click <strong>Request refund</strong>
          on the relevant top-up in <Link to="/account/team" className="text-[var(--accent)] underline">Team settings</Link>.
          A Camora admin reviews within 1&ndash;2 business days. On approval, Stripe issues the
          refund and the hours stop counting toward the pool immediately. Pending requests don&apos;t
          suspend hours; if the admin denies, the hours stay on the account.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Subscription refunds are handled case-by-case via support &mdash; email
          <a href="mailto:hi@cariara.com" className="text-[var(--accent)] underline ml-1">hi@cariara.com</a>.
        </p>
      </section>

      <section className="border-t pt-8 mt-12" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-base font-bold mb-3">Related</h2>
        <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li><Link to="/pricing" className="text-[var(--accent)] underline">Pricing & plan comparison</Link></li>
          <li><Link to="/account/team" className="text-[var(--accent)] underline">Team settings</Link></li>
          <li><Link to="/docs/topups" className="text-[var(--accent)] underline">Top-ups & AI hours</Link></li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
