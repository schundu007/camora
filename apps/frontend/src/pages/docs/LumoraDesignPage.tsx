import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';

export default function LumoraDesignDocsPage() {
  return (
    <DocsPageLayout
      title="Lumora System Design"
      description="Architecture diagrams, scaling drills, and design patterns — Sona walks you through the canonical interview rubric."
      path="/docs/lumora-design"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Lumora Design' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'rubric', label: 'The rubric Sona uses' },
        { id: 'detail-levels', label: 'Detail levels' },
        { id: 'diagrams', label: 'Architecture diagrams' },
      ]}
    >
      <section id="overview" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Overview</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The system design surface at <Link to="/lumora/design" className="text-[var(--accent)] underline">/lumora/design</Link>{' '}
          is a focused canvas for the design portion of an interview. Drop in a prompt ("design Twitter",
          "design a URL shortener at 1B QPS"), pick a detail level, and Sona produces a structured response
          with the canonical rubric: clarify, estimate, draft architecture, deep-dive, trade-offs.
        </p>
      </section>

      <section id="rubric" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">The rubric Sona uses</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Clarify requirements</strong> — functional + non-functional, scale assumptions.</li>
          <li><strong>Capacity estimation</strong> — back-of-envelope QPS / storage / bandwidth.</li>
          <li><strong>API surface</strong> — REST or RPC sketch of key endpoints.</li>
          <li><strong>High-level architecture</strong> — clients → load balancer → app → database with caches and queues where they matter.</li>
          <li><strong>Deep-dive on the hottest component</strong> — usually the data store or the caching layer.</li>
          <li><strong>Trade-offs</strong> — explicit comparison of the chosen design vs alternatives.</li>
        </ol>
      </section>

      <section id="detail-levels" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Detail levels</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The detail-level toggle controls how exhaustive Sona's answer is:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Basic</strong> — high-level architecture only, ~30 seconds of AI hours.</li>
          <li><strong>Detailed</strong> — full rubric with deep-dive, ~90 seconds.</li>
          <li><strong>Full</strong> — adds estimation math + multiple diagrams + alternative architectures, ~3 minutes.</li>
        </ul>
      </section>

      <section id="diagrams" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Architecture diagrams</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Diagrams render via the Python `diagrams` library + Graphviz on the backend. They cache by
          problem hash, so identical or near-identical prompts return the cached PNG instantly without
          consuming AI hours.
        </p>
      </section>
    </DocsPageLayout>
  );
}
