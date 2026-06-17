import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function TopupsDocsPage() {
  return (
    <DocsPageLayout
      title="Top-ups & AI hours"
      description="How AI hours work, what counts against your pool, when to buy a top-up, and how auto top-up keeps long sessions flowing."
      path="/docs/topups"
      breadcrumbs={[{ label: 'Top-ups & AI hours' }]}
      onThisPage={[
        { id: 'how-hours-work', label: 'How AI hours work' },
        { id: 'what-counts', label: 'What counts as an hour' },
        { id: 'when-to-buy', label: 'When to buy a top-up' },
        { id: 'pack-sizes', label: 'Pack sizes & expiry' },
        { id: 'auto-topup', label: 'Auto top-up' },
        { id: 'failed-charges', label: 'Failed charges', depth: 1 },
      ]}
    >
      <section id="how-hours-work" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How AI hours work</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          AI hours are Camora's unit of LLM consumption. Every interaction that uses AI — live session
          transcription, Sona answers, prep doc generation, system design generation, coding helper —
          consumes seconds against your pool.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Your pool is whatever your plan provides for the current period:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Free trial</strong>: 1 hr, expires 7 days from signup</li>
          <li><strong>Monthly ($19/mo)</strong>: 2 hrs/cycle, refreshed each month</li>
          <li><strong>Yearly ($99/yr)</strong>: 5 hrs/cycle, refreshed each year</li>
          <li><strong>Team</strong>: ⌈seats × 0.7⌉ hrs/cycle pooled across the team (e.g. 10 seats → 7 hrs)</li>
          <li><strong>Top-ups ($15/hr)</strong>: stack on any plan and <strong>never expire</strong></li>
        </ul>
      </section>

      <section id="what-counts" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">What counts as an hour</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Wall-clock seconds for streaming surfaces (live transcription, inference). Token-based
          equivalence for one-shot generations: ~20 seconds per 1K output tokens. Roughly:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>30-minute live session</strong> ≈ 30 minutes of pool</li>
          <li><strong>Coding helper solve</strong> ≈ 30 seconds</li>
          <li><strong>System design (detailed)</strong> ≈ 90 seconds</li>
          <li><strong>Full company prep doc</strong> ≈ 2 minutes</li>
        </ul>
      </section>

      <section id="when-to-buy" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">When to buy a top-up</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The hour-meter chip in the top nav shows your remaining hours with a colored dot — green is
          plenty, amber is 80%+ used, red is exhausted. Pool-low emails fire automatically at 80% and 95%.
          Most users top up once they see the amber state during an interview-prep week.
        </p>
      </section>

      <section id="pack-sizes" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Pricing &amp; expiry</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          One flat rate, $15 per AI hour. Pick any quantity from 1 to 50 in a single Stripe checkout
          ($15 × quantity total). Hours <strong>never expire</strong> &mdash; they sit on your
          account until used, regardless of subscription state.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Top-ups stack on top of your subscription pool. Buy from the
          <Link to="/pricing" className="text-[var(--accent)] underline ml-1">pricing page</Link> or
          whenever the AI Hours gate prompts. Top-ups are gated to active subscribers &mdash; start
          with Monthly or Yearly first.
        </p>
      </section>

      <section id="auto-topup" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Auto top-up</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          When your pool runs out mid-session, Camora can auto-charge a top-up so calls keep flowing.
          <strong> Off by default.</strong> Enable on
          <Link to="/account/team" className="text-[var(--accent)] underline ml-1">/account/team</Link>
          and set a monthly cap. Each auto-trigger adds <strong>1 hour</strong> ($15); the cap is
          the hard ceiling on how many auto-charges can happen in a calendar month and is required.
        </p>
        <DocsCallout variant="warning">
          Monthly cap protects you. Camora will <em>never</em> charge more than your cap in a calendar month —
          beyond that, the gate falls back to its normal "buy a pack" prompt.
        </DocsCallout>

        <h3 id="failed-charges" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Failed charges</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          If an off-session charge fails (3DS timeout, expired card, decline), Camora automatically disables
          auto top-up and emails you. Buy any pack manually — that updates your default card via Stripe
          Checkout — then re-enable.
        </p>
      </section>
    </DocsPageLayout>
  );
}
