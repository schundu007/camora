import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function PrepareDocsPage() {
  return (
    <DocsPageLayout
      title="Prepare"
      description="Browse 800+ interview prep topics, generate company-specific prep documents, and track your progress."
      path="/docs/prepare"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Prepare' }]}
      onThisPage={[
        { id: 'topic-library', label: 'Topic library' },
        { id: 'categories', label: 'Categories', depth: 1 },
        { id: 'free-vs-paid', label: 'Free vs paid access' },
        { id: 'company-prep', label: 'Company-specific prep' },
        { id: 'architecture-diagrams', label: 'Architecture diagrams' },
        { id: 'progress-tracking', label: 'Progress tracking' },
      ]}
    >
      <section id="topic-library" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Topic library</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora ships with 800+ curated interview topics covering DSA, system design, low-level design,
          behavioral STAR stories, and language-specific deep dives. Each topic has a written explanation,
          worked examples, and (where relevant) cached architecture diagrams.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Open <Link to="/capra/prepare" className="text-[var(--accent)] underline">Prepare</Link> from
          the main nav. The dashboard surfaces the four core categories.
        </p>

        <h3 id="categories" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Categories</h3>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>DSA</strong> — algorithms, data structures, common patterns (sliding window, two pointers, dynamic programming).</li>
          <li><strong>System design</strong> — high-level architecture, scaling, trade-offs, with diagrams.</li>
          <li><strong>Low-level design</strong> — OOP modelling, design patterns, system component design.</li>
          <li><strong>Behavioral</strong> — STAR-format stories tied to leadership principles and competency rubrics.</li>
          <li><strong>Project deep-dives</strong> — language- and framework-specific (React 19, Postgres, Kubernetes, etc.).</li>
        </ul>
      </section>

      <section id="free-vs-paid" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Free vs paid access</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Topic browsing (titles, summaries) is always free. Deep reading is gated for the free tier:
        </p>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Plan</th>
                <th className="text-left px-4 py-2.5 font-semibold">Topic deep-reads</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Free</td>
                <td className="px-4 py-2.5">1 topic per category (lifetime)</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Pro / Pro Max / Business</td>
                <td className="px-4 py-2.5">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
        <DocsCallout variant="tip">
          The free tier is generous enough to evaluate quality on every category before subscribing.
          Pick one DSA topic, one system design, one behavioral — that's three sample reads.
        </DocsCallout>
      </section>

      <section id="company-prep" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Company-specific prep</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          For Pro Max and Business plans, Camora can generate a multi-section prep document tailored to a
          target company's known interview format and culture. Open the <strong>Generate prep</strong> button on
          the prepare dashboard, enter the company + role, and Camora produces:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Likely DSA topics with rationale</li>
          <li>System design exercises matching the team's domain</li>
          <li>Company-specific behavioral story prompts</li>
          <li>Recent interview-loop format (rounds, expected duration)</li>
        </ul>
        <DocsCallout variant="warning" label="Uses AI hours">
          Each generated prep doc consumes around 2 minutes of AI hours. Check{' '}
          <Link to="/docs/topups" className="text-[var(--accent)] underline">Top-ups & AI hours</Link> if you want
          to know how the budget works.
        </DocsCallout>
      </section>

      <section id="architecture-diagrams" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Architecture diagrams</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          System design topics include rendered architecture diagrams generated by the Python `diagrams`
          library + Graphviz. Diagrams are cached in the database after first generation, so subsequent
          views are instant and don't consume AI hours.
        </p>
      </section>

      <section id="progress-tracking" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Progress tracking</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora tracks read topics, completion status, and bookmarks per user. Topics show a checkmark when
          you've read them; the prepare dashboard shows your category-level completion percentage.
        </p>
      </section>
    </DocsPageLayout>
  );
}
