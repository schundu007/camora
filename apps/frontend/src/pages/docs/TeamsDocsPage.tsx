import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';
import DocsShell from '../../components/shared/docs/DocsShell';
import OnThisPage from '../../components/shared/docs/OnThisPage';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsBreadcrumbs from '../../components/shared/docs/DocsBreadcrumbs';

/**
 * NVIDIA-style docs page for team / business sharing. Uses the existing
 * docs primitives (DocsShell + OnThisPage + DocsCallout) so it reads
 * the same as the rest of the documentation surface.
 */
export default function TeamsDocsPage() {
  useEffect(() => { document.title = 'Team sharing — Camora docs'; }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title="Team sharing" description="How to invite mates, share AI hours, set per-member caps, and configure auto top-up on Camora." path="/docs/teams" />
      <SiteNav variant="light" />

      <div style={{ paddingTop: 80 }}>
        <DocsShell
          breadcrumbs={
            <DocsBreadcrumbs items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Team sharing' },
            ]} />
          }
          onThisPage={
            <OnThisPage items={[
              { id: 'overview', label: 'Overview' },
              { id: 'who-can-create-a-team', label: 'Who can create a team' },
              { id: 'invite-mates', label: 'Invite mates', depth: 1 },
              { id: 'pooled-hours', label: 'Pooled hours', depth: 1 },
              { id: 'per-member-caps', label: 'Per-member caps' },
              { id: 'auto-topup', label: 'Auto top-up' },
              { id: 'cancellation', label: 'Cancellation' },
              { id: 'refunds', label: 'Refunds' },
              { id: 'business-pack', label: 'Business Starter pack' },
            ]} />
          }
        >
          <header className="mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent)' }}>BILLING &amp; ACCOUNT</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Team sharing</h1>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Pool your Camora AI hours with up to 10 team mates, set per-person caps, and enable auto top-up
              for uninterrupted live interview sessions.
            </p>
          </header>

          <section id="overview" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              A Camora team is a single billing scope that shares a pool of AI hours across multiple users.
              The team owner pays the subscription; members get full access to Lumora live interview, coding
              helper, and prep generation while the pool has hours remaining.
            </p>
            <DocsCallout variant="tip">
              <strong>One person, one team.</strong> Each user can be a member of exactly one team at a time.
              To switch teams you'll need to be removed from the current team first.
            </DocsCallout>
          </section>

          <section id="who-can-create-a-team" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Who can create a team</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Team sharing is available on the following plans:
            </p>
            <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--bg-elevated)' }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Plan</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Seats</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Hours pool</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2.5">Pro Max monthly</td>
                    <td className="px-4 py-2.5">5</td>
                    <td className="px-4 py-2.5">8 hrs / month</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2.5">Pro Max yearly</td>
                    <td className="px-4 py-2.5">5</td>
                    <td className="px-4 py-2.5">96 hrs / year</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2.5">Business Starter</td>
                    <td className="px-4 py-2.5">10</td>
                    <td className="px-4 py-2.5">75 hrs (one-time)</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2.5">Business Desktop Lifetime</td>
                    <td className="px-4 py-2.5">10</td>
                    <td className="px-4 py-2.5">— (BYOK desktop)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              On Pro / Pro Yearly the team feature is solo-only. After purchasing an eligible plan, your team
              is automatically created — visit <Link to="/account/team" className="text-[var(--accent)] underline">/account/team</Link> to start inviting.
            </p>

            <h3 id="invite-mates" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Invite mates</h3>
            <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              <li>Open <Link to="/account/team" className="text-[var(--accent)] underline">Team settings</Link>.</li>
              <li>Type your friend's email and click <strong>Create invite</strong>.</li>
              <li>An email goes out (when Resend is configured), or you'll see a copyable join link.</li>
              <li>Once they click the link and sign in, they're auto-added to your team's pool.</li>
            </ol>
            <DocsCallout variant="note">
              Invites expire 14 days from creation. Owners can cancel any pending invite from the settings page.
            </DocsCallout>

            <h3 id="pooled-hours" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">How pooled hours work</h3>
            <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              All members draw from the same hour bucket. When a member transcribes audio or asks Lumora a
              question, the seconds consumed count against the team total. The pool resets at the start of
              each billing period for monthly / yearly plans, or stays fixed (no reset) for one-time packs
              like Business Starter.
            </p>
          </section>

          <section id="per-member-caps" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Per-member caps</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Owners can set a maximum hours-per-period limit on individual members so a single user can't
              drain the whole pool. Click <strong>Set cap</strong> next to any member row in
              <Link to="/account/team" className="text-[var(--accent)] underline ml-1">Team settings</Link> and enter
              a number of hours. Leave blank or click <strong>Edit cap</strong> → save with empty input to remove.
            </p>
            <DocsCallout variant="tip">
              <strong>Cap math:</strong> usage is counted only against calls a member made <em>through this team's pool</em>.
              Their personal usage on a different team or before joining doesn't count.
            </DocsCallout>
          </section>

          <section id="auto-topup" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Auto top-up</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              When the team pool runs out mid-call, Camora can automatically charge a top-up pack so the call
              keeps flowing. <strong>Off by default.</strong> Owners enable it in
              <Link to="/account/team" className="text-[var(--accent)] underline ml-1">Team settings</Link> and pick:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Pack size</strong> — 1 / 5 / 25 hours per auto-charge</li>
              <li><strong>Monthly cap</strong> — hard ceiling on auto-charges in a calendar month. Required.</li>
            </ul>
            <DocsCallout variant="warning" label="Cap is required">
              You can't enable auto top-up without a monthly cap. The cap protects against runaway charges if
              an LLM provider fails in a way that produces many short calls in a row.
            </DocsCallout>
            <p className="text-[15px] leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
              Failed off-session charges (3DS timeout, expired card, decline) automatically disable auto top-up
              and email you a "card needs updating" notice. Buying any pack manually updates your default
              payment method, after which you can re-enable.
            </p>
          </section>

          <section id="cancellation" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Cancellation</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Subscriptions cancel <strong>at the end of the current billing period</strong> — you keep team access
              until then. To cancel, hit the <strong>Cancel subscription</strong> button on
              <Link to="/account/team" className="text-[var(--accent)] underline ml-1">Team settings</Link>. Changed your
              mind before the period ends? Click <strong>Resume</strong> to undo the cancellation.
            </p>
            <DocsCallout variant="note">
              Cancellation only affects the recurring subscription. Already-purchased top-up packs remain valid
              until their 90-day expiry.
            </DocsCallout>
          </section>

          <section id="refunds" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Refunds</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Top-up packs are refundable for a full amount via Stripe. The buyer can request a refund from their
              billing history; the refunded hours immediately stop counting toward the pool. Subscription refunds
              are handled case-by-case via support — open a ticket from any settings page.
            </p>
          </section>

          <section id="business-pack" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Business Starter pack</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              For bootcamps, recruiting teams, and cohorts — a one-time $499 purchase that includes <strong>75 AI hours
              and 10 seats</strong>. Effective rate: $6.65/hr. Pay-as-you-go after the pack runs out costs $8/hr (vs $10
              consumer PAYG).
            </p>
            <DocsCallout variant="tip" label="No subscription">
              Business Starter is procurement-friendly: one invoice, one purchase order, no recurring billing.
              When the pack runs out, buy another. Larger orders (50+ seats) →
              <a href="mailto:business@cariara.com" className="text-[var(--accent)] underline ml-1">business@cariara.com</a>.
            </DocsCallout>
          </section>

          <section className="border-t pt-8 mt-12" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold mb-3">Related</h2>
            <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li><Link to="/pricing" className="text-[var(--accent)] underline">Pricing &amp; plan comparison</Link></li>
              <li><Link to="/account/team" className="text-[var(--accent)] underline">Team settings</Link></li>
              <li><Link to="/download" className="text-[var(--accent)] underline">Camora Desktop download</Link></li>
            </ul>
          </section>
        </DocsShell>
      </div>

      <SiteFooter variant="light" />
    </div>
  );
}
