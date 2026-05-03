import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function GettingStartedPage() {
  return (
    <DocsPageLayout
      title="Getting started"
      description="Sign up, complete onboarding, and run your first interview prep session in under 5 minutes."
      path="/docs/getting-started"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Getting started' }]}
      onThisPage={[
        { id: 'sign-up', label: 'Sign up' },
        { id: 'onboarding', label: 'Onboarding' },
        { id: 'first-session', label: 'Your first session' },
        { id: 'free-tier', label: 'What the free tier includes' },
        { id: 'next-steps', label: 'Next steps' },
      ]}
    >
      <section id="sign-up" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Sign up</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora uses Google OAuth for authentication — no separate password to remember.
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Visit <Link to="/signup" className="text-[var(--accent)] underline">camora.cariara.com/signup</Link>.</li>
          <li>Click <strong>Continue with Google</strong>, pick the account you'd like to use.</li>
          <li>Camora creates your profile, sets a <code>cariara_sso</code> cookie, and redirects to onboarding.</li>
        </ol>
        <DocsCallout variant="note">
          Sessions persist for 30 days via an httpOnly cookie. Sign out from the user dropdown when on a shared computer.
        </DocsCallout>
      </section>

      <section id="onboarding" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Onboarding</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Onboarding asks for the basics so prep generation is tailored to you:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Job role</strong> — frontend, backend, ML, etc. Picks default topic categories.</li>
          <li><strong>Resume</strong> — paste or upload. Used as context for personalized prep.</li>
          <li><strong>Target company</strong> — optional, drives company-specific prep generation.</li>
          <li><strong>Interview date</strong> — optional, generates a daily countdown plan if set.</li>
        </ul>
        <DocsCallout variant="tip">
          You can change all of these later under <Link to="/profile" className="text-[var(--accent)] underline">Profile</Link>.
          Skipping onboarding lands you on the prep dashboard with sensible defaults.
        </DocsCallout>
      </section>

      <section id="first-session" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Your first session</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Camora has two main surfaces. Try both in your first session to see which fits your prep style:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-1">Prepare</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Browse 800+ topics, do practice problems, generate company-specific prep documents.
              <Link to="/capra/prepare" className="text-[var(--accent)] underline ml-1">Open Prepare</Link>.
            </p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-1">Live Interview</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Real-time AI assistance during a Zoom / Meet / Teams interview. Paid tiers only.
              <Link to="/lumora" className="text-[var(--accent)] underline ml-1">Open Live Interview</Link>.
            </p>
          </div>
        </div>
      </section>

      <section id="free-tier" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">What the free tier includes</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>30 minutes of AI hours, lifetime</strong> — covers ~1 short live session or ~3 prep generations.</li>
          <li><strong>1 topic per category</strong> — browse all 800+ topic titles, deep-read 1 per category (DSA, system design, behavioral).</li>
          <li><strong>Web app only</strong> — Desktop is a paid add-on or part of Pro Max.</li>
        </ul>
        <DocsCallout variant="warning" label="Lifetime, not monthly">
          The 30 free minutes don't reset. Once they're used, you'll need to subscribe or buy a top-up pack.
        </DocsCallout>
      </section>

      <section id="next-steps" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Next steps</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><Link to="/docs/prepare" className="text-[var(--accent)] underline">Prepare</Link> — what's in the topic library.</li>
          <li><Link to="/docs/lumora-live" className="text-[var(--accent)] underline">Live Interview</Link> — connecting audio for a live session.</li>
          <li><Link to="/pricing" className="text-[var(--accent)] underline">Pricing</Link> — pick a plan with more AI hours.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
