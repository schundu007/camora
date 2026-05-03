import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraDesignDocsPage() {
  return (
    <DocsPageLayout
      title="System Design"
      description="How to use the System Design tab — asking design questions, reading the structured answer, the architecture diagram, and tips for live design interviews."
      path="/docs/lumora-design"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'System Design' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'asking', label: 'Asking design questions' },
        { id: 'reading', label: 'Reading the answer' },
        { id: 'sections', label: 'Sections you\'ll see', depth: 1 },
        { id: 'diagram', label: 'The architecture diagram' },
        { id: 'cloud-provider', label: 'Cloud provider and detail level' },
        { id: 'tips', label: 'Tips for live interviews' },
      ]}
    >
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          The System Design tab takes a "design X" or "scale Y" question and returns a structured
          answer with capacity estimates, functional and non-functional requirements, an
          architecture overview, a data model, an API shape, and deep-dives on the hardest
          questions. Where it makes sense, an architecture diagram renders alongside the prose.
        </p>
      </section>

      <section id="asking" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Asking design questions</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            Phrase the question with a recognised verb — <strong>design</strong> X,{' '}
            <strong>build</strong> X, how would you <strong>scale</strong> X. The phrasing nudges
            Camora into design mode rather than the general inference path.
          </li>
          <li>
            Include constraints up front. Read-heavy or write-heavy. Latency target. Region count.
            The capacity estimate uses whatever you give it; vague inputs produce vague numbers.
          </li>
          <li>
            Pick a cloud provider before submitting if you want a specific icon set. Default is
            AWS.
          </li>
        </ul>
      </section>

      <section id="reading" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Reading the answer</h2>
        <p className={bodyP} style={bodyColor}>
          The answer streams back in seven labelled sections. Each one renders as its own card and
          fills in token-by-token, so you can start reading the headline before the deep-dives
          finish.
        </p>

        <h3 id="sections" className={sectionH3}>Sections you'll see</h3>
        <DocsTable
          columns={[
            { key: 's', header: 'Section' },
            { key: 'role', header: 'Role' },
          ]}
          rows={[
            { s: 'Headline', role: 'A one-sentence elevator framing of the system being designed.' },
            { s: 'Requirements', role: 'Functional and non-functional requirements split into two columns. Non-functional usually includes latency, availability, consistency, and scale targets.' },
            { s: 'Capacity', role: 'Back-of-envelope numbers — DAU, QPS, storage, bandwidth. Treat as anchor estimates and adjust on the fly.' },
            { s: 'Architecture', role: 'Component overview — clients, gateways, services, queues, stores. Renders alongside the architecture diagram.' },
            { s: 'Data model', role: 'Tables / collections with primary key, columns, indexes. One block per table, with example rows.' },
            { s: 'API', role: 'External API endpoints with verbs, paths, params, response shape.' },
            { s: 'Deep-dives', role: 'Two or three of the hardest design questions answered in detail. Where most of the points are scored in a real interview.' },
          ]}
        />
      </section>

      <section id="diagram" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>The architecture diagram</h2>
        <p className={bodyP} style={bodyColor}>
          A rendered architecture diagram appears below the prose, typically a few seconds after
          first tokens arrive. It's purely visual — every component shown is also listed in the
          prose, so the answer is complete with or without the image.
        </p>
        <p className={bodyP} style={bodyColor}>
          Diagrams are cached. The first reader on a fresh question pays the generation cost; every
          subsequent visitor sees the same image instantly.
        </p>
        <DocsCallout variant="note" label="If the diagram doesn't show up">
          A small fraction of design questions don't yield a clean diagram — usually because the
          generated code tripped the safety check or the renderer hit its time budget. The prose
          answer is unaffected. Rephrase more concretely (specific components, specific cloud) and
          resubmit.
        </DocsCallout>
      </section>

      <section id="cloud-provider" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Cloud provider and detail level</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            <strong>Cloud provider</strong> — pick AWS, GCP, or Azure. Determines which icon set
            the diagram uses. Default AWS.
          </li>
          <li>
            <strong>Detail level</strong> — Overview shows the headline components, Detailed adds
            the supporting services (caches, queues, observability). Pick Overview for a 30-second
            sanity check; Detailed for a 5-minute deep dive.
          </li>
        </ul>
      </section>

      <section id="tips" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>Tips for live interviews</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            Submit the moment you've heard the question. The architecture diagram needs a few
            seconds to render — early submission means it's ready when you start drawing.
          </li>
          <li>
            Talk through the requirements section first. Interviewers love candidates who clarify
            scope before diving into components.
          </li>
          <li>
            Use the capacity numbers as anchors, not facts. Phrase as "let's assume around X" so
            the interviewer can correct you if their scenario is different.
          </li>
          <li>
            The deep-dive section is where most of the points are scored. Use it as the script for
            "tell me more about how X works" follow-ups.
          </li>
        </ul>
        <p className={bodyP} style={bodyColor}>
          Live interview setup, audio capture, and Cmd+B safety are documented in{' '}
          <Link to="/docs/lumora-live" className="text-[var(--accent)] underline">
            Live Interview
          </Link>.
        </p>
      </section>
    </DocsPageLayout>
  );
}
