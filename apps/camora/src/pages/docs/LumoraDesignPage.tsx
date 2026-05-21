import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraDesignDocsPage() {
  return (
    <DocsPageLayout
      title="System Design"
      description="How to use the System Design tab — asking design questions, the interactive Scale Calculator, scalability tier drill-downs, the architecture diagram, and tips for live design interviews."
      path="/docs/lumora-design"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'System Design' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'asking', label: 'Asking design questions' },
        { id: 'sections', label: 'Sections you\'ll see' },
        { id: 'scale-calc', label: 'Scale Calculator' },
        { id: 'tiers', label: 'Scalability tier drill-downs' },
        { id: 'diagram', label: 'The architecture diagram' },
        { id: 'detail-level', label: 'Detail level' },
        { id: 'sona-sidebar', label: 'Sona follow-up sidebar' },
        { id: 'tips', label: 'Tips for live sessions' },
      ]}
    >
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          The System Design tab takes a &ldquo;design X&rdquo; or &ldquo;scale Y&rdquo; question and
          returns a structured answer with capacity estimates, functional + non-functional
          requirements, scalability tiers, an architecture diagram, trade-offs, edge cases, and
          deep-dives. The Scale Calculator lets you adjust DAU / QPS inline; scalability tiers are
          clickable drill-downs that re-stream a focused answer for any specific component
          (Cassandra, Kafka, Redis, etc.).
        </p>
      </section>

      <section id="asking" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Asking design questions</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Phrase the question with a recognised verb &mdash; <strong>design</strong> X,
            <strong> build</strong> X, how would you <strong>scale</strong> X. The phrasing nudges
            Camora into design mode rather than the general inference path.</li>
          <li>Include constraints up front: read-heavy or write-heavy, latency target, region count.
            The capacity estimate uses whatever you give it; vague inputs produce vague numbers
            (which you can then refine with the Scale Calculator).</li>
          <li>The Design tab accepts the same multi-input modes as Coding: paste, fetch from URL,
            drag-drop screenshot, or voice via the bottom-bar mic.</li>
        </ul>
      </section>

      <section id="sections" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Sections you&apos;ll see</h2>
        <p className={bodyP} style={bodyColor}>
          The answer streams back as a sequence of cards. Each one renders independently and fills
          in token-by-token, so you can start reading early sections before the deep-dives finish.
        </p>
        <DocsTable
          columns={[
            { key: 's', header: 'Section' },
            { key: 'role', header: 'Role' },
          ]}
          rows={[
            { s: 'Overview', role: 'One-paragraph framing of the system being designed.' },
            { s: 'Explanation', role: 'A pitch / walkthrough — how you\'d talk through this on a whiteboard, in order.' },
            { s: 'Functional + Non-Functional Requirements', role: 'Two side-by-side cards. Non-functional usually covers latency, availability, consistency, scale targets.' },
            { s: 'Scale Estimates + Scale Calculator', role: 'Back-of-envelope DAU, QPS, storage, bandwidth — with an interactive calculator that lets you tweak the inputs and recompute.' },
            { s: 'Scalability Tiers', role: 'Each tier is a clickable card — click to re-stream a focused answer for that specific tier (e.g. "tell me more about Cassandra here").' },
            { s: 'Tradeoffs', role: 'Hard decisions and the rationale behind them — the kind of content interviewers grill you on.' },
            { s: 'Edge Cases', role: 'Failure modes, races, retry storms, partial outages.' },
            { s: 'Deep-dives', role: 'Two or three of the hardest sub-problems answered in detail. Where most of the points are scored in a real interview.' },
          ]}
        />
      </section>

      <section id="scale-calc" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Scale Calculator</h2>
        <p className={bodyP} style={bodyColor}>
          Inside the Scale Estimates card you&apos;ll find the <strong>Scale Calculator</strong>
          &mdash; sliders / inputs for daily active users, requests per second, payload size, and
          retention. Adjust any of them and the downstream numbers (storage, bandwidth, server
          count) recompute live. Use this to react to interviewer questions like &ldquo;what if it
          was 10x bigger?&rdquo; in real time without re-asking Sona.
        </p>
      </section>

      <section id="tiers" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Scalability tier drill-downs</h2>
        <p className={bodyP} style={bodyColor}>
          The Scalability Tiers card lists the components that scale your system &mdash; database
          tier, cache tier, queue tier, etc. <strong>Click any tier</strong> and Camora re-streams a
          focused answer for just that component (Cassandra vs DynamoDB vs CockroachDB, with the
          trade-offs for your scenario). Useful when an interviewer drills into one piece without
          asking you to redesign the whole system.
        </p>
      </section>

      <section id="diagram" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>The architecture diagram</h2>
        <p className={bodyP} style={bodyColor}>
          A rendered architecture diagram appears below the prose, typically a few seconds after
          first tokens arrive. It&apos;s purely visual &mdash; every component shown is also listed
          in the prose, so the answer is complete with or without the image.
        </p>
        <p className={bodyP} style={bodyColor}>
          Diagrams are cached at the problem level. The first reader on a fresh question pays the
          generation cost; every subsequent visitor sees the same image instantly. Click
          <strong> Regenerate</strong> on the design header to bypass the cache and ask for a fresh
          answer.
        </p>
        <DocsCallout variant="note" label="If the diagram doesn't show up">
          A small fraction of design questions don&apos;t yield a clean diagram &mdash; usually
          because the generated code tripped the safety check or the renderer hit its time budget.
          The prose answer is unaffected. Rephrase more concretely (specific components, specific
          cloud) and resubmit.
        </DocsCallout>
      </section>

      <section id="detail-level" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Detail level</h2>
        <p className={bodyP} style={bodyColor}>
          Toggle between <strong>Basic</strong> and <strong>Full</strong> in the design header.
          Basic shows the headline components and reasoning; Full adds supporting services (caches,
          queues, observability) and longer deep-dives. Pick Basic for a 30-second sanity check,
          Full for a 5-minute deep dive.
        </p>
        <p className={bodyP} style={bodyColor}>
          The cloud-provider icon set used in the diagram is configured globally in Settings (not
          per-question) &mdash; Camora picks AWS by default; switch to GCP or Azure in Settings if
          you prefer those icons.
        </p>
      </section>

      <section id="sona-sidebar" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Sona follow-up sidebar</h2>
        <p className={bodyP} style={bodyColor}>
          The right rail on the Design tab is a <strong>Sona sidebar</strong> &mdash; a focused
          Q&amp;A pane that knows the active design context. Ask follow-ups like &ldquo;why
          Cassandra not DynamoDB here?&rdquo; or &ldquo;how would you handle a cross-region
          failover?&rdquo; without leaving the tab. Different from the live-interview Sona stream
          &mdash; this one is for deliberate exploration.
        </p>
      </section>

      <section id="tips" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>Tips for live sessions</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Submit the moment you&apos;ve heard the question. The architecture diagram needs a
            few seconds to render &mdash; early submission means it&apos;s ready when you start
            drawing on your own whiteboard.</li>
          <li>Talk through the Functional Requirements card first. Interviewers love candidates who
            clarify scope before diving into components.</li>
          <li>Use the Scale Calculator live during the call &mdash; if the interviewer says
            &ldquo;what if DAU went up 10x?&rdquo;, change the input and the storage / bandwidth /
            server-count numbers update under your eyes.</li>
          <li>The Tradeoffs and Deep-dives sections are where most of the points are scored. Use
            them as the script for &ldquo;tell me more about how X works&rdquo; follow-ups.</li>
          <li>If the interviewer drills into one tier, click that tier&apos;s card to get a focused
            answer instead of re-asking the whole question.</li>
        </ul>
        <p className={bodyP} style={bodyColor}>
          Live session setup, audio capture, and Cmd+B safety are documented in
          <Link to="/docs/lumora-live" className="text-[var(--accent)] underline ml-1">
            Live Session
          </Link>.
        </p>
      </section>
    </DocsPageLayout>
  );
}
