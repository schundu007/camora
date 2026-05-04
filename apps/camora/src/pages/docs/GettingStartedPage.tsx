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
        { id: 'free-tier', label: 'What the free trial includes' },
        { id: 'next-steps', label: 'Next steps' },
      ]}
    >
      <section id="sign-up" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Sign up</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora uses Google OAuth for authentication &mdash; no separate password to remember.
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Visit <Link to="/signup" className="text-[var(--accent)] underline">camora.cariara.com/signup</Link>.</li>
          <li>Click <strong>Continue with Google</strong>, pick the account you&apos;d like to use.</li>
          <li>Camora creates your profile, sets a <code>cariara_sso</code> cookie, and redirects to
            onboarding.</li>
        </ol>
        <DocsCallout variant="note">
          Sessions persist for 30 days via an httpOnly cookie. Sign out from the user dropdown when
          on a shared computer.
        </DocsCallout>
      </section>

      <section id="onboarding" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Onboarding</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Onboarding is two steps and takes about 30 seconds:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Pick one or more job roles</strong> &mdash; e.g. Backend, Frontend, Full-stack,
            ML, Data, SRE. Ten primary roles plus a &ldquo;More roles&rdquo; expansion with another
            20+ specialized roles. Required &mdash; you can&apos;t continue past this step without
            picking at least one.</li>
          <li><strong>Add your resume</strong> &mdash; upload a PDF / DOCX / TXT (up to 5 MB) or
            paste the text. Camora extracts it server-side and uses it as context for personalized
            prep generation, behavioral story creation, and resume-tailored answers in Sona. This
            step has a <em>Skip for now</em> button if you want to land on the dashboard fast.</li>
        </ol>
        <DocsCallout variant="tip">
          You can change roles and resume at any time under
          <Link to="/profile" className="text-[var(--accent)] underline ml-1">Profile</Link>. Target
          company and interview date aren&apos;t collected at sign-up &mdash; you&apos;ll set them
          per-job inside Job Prep / Company Prep when you need them.
        </DocsCallout>
      </section>

      <section id="first-session" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Your first session</h2>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Camora&apos;s flow follows the <strong>APPA</strong> framework &mdash; Apply, Prepare,
          Practice, Attend. The four main surfaces:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-1">Prepare</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Topic library across 9 categories, SQL playground, resume optimizer, company-specific
              prep generation.
              <Link to="/capra/prepare" className="text-[var(--accent)] underline ml-1">Open Prepare</Link>.
            </p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-1">Practice</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Timed mock interviews (Quick Fire / Deep Dive / Mock), per-company filtering, AI
              graded on a 5-dimension rubric.
              <Link to="/capra/practice" className="text-[var(--accent)] underline ml-1">Open Practice</Link>.
            </p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-1">Live Interview</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Real-time AI assistance during a Zoom / Meet / Teams interview. Paid tiers.
              <Link to="/lumora" className="text-[var(--accent)] underline ml-1">Open Lumora</Link>.
            </p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-1">Jobs</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Curated job listings tailored to your roles and resume.
              <Link to="/jobs" className="text-[var(--accent)] underline ml-1">Open Jobs</Link>.
            </p>
          </div>
        </div>
      </section>

      <section id="free-tier" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">What the free trial includes</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>1 hour of AI hours</strong>, valid for 7 days from sign-up. Covers a short
            live session or a handful of prep / coding generations.</li>
          <li><strong>Topic browsing</strong> &mdash; you can browse all 800+ topic titles for free
            on the Prepare surface.</li>
          <li><strong>Web app only</strong> for the trial period. Desktop is for paid users.</li>
        </ul>
        <DocsCallout variant="warning" label="Trial is time-limited">
          The 1-hour trial expires 7 days after sign-up regardless of how much you used. Once
          expired, you&apos;ll need a Monthly / Yearly / Team subscription, or a top-up purchased
          alongside one.
        </DocsCallout>
      </section>

      <section id="next-steps" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Next steps</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><Link to="/docs/prepare" className="text-[var(--accent)] underline">Prepare</Link> &mdash; what&apos;s in the topic library.</li>
          <li><Link to="/docs/practice" className="text-[var(--accent)] underline">Practice</Link> &mdash; timed mock interviews and AI grading.</li>
          <li><Link to="/docs/lumora-live" className="text-[var(--accent)] underline">Live Interview</Link> &mdash; connecting audio for a live session.</li>
          <li><Link to="/pricing" className="text-[var(--accent)] underline">Pricing</Link> &mdash; pick a plan with more AI hours.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
