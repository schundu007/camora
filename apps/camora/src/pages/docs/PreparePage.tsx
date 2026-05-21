import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function PrepareDocsPage() {
  return (
    <DocsPageLayout
      title="Prepare"
      description="Browse 1,400+ prep topics across 9 categories, generate company-specific prep, and use the SQL Playground and Resume Optimizer."
      path="/docs/prepare"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Prepare' }]}
      onThisPage={[
        { id: 'topic-library', label: 'Topic library' },
        { id: 'categories', label: 'Categories', depth: 1 },
        { id: 'role-personalization', label: 'Role personalization' },
        { id: 'sql-playground', label: 'SQL Playground' },
        { id: 'resume-optimizer', label: 'Resume Optimizer' },
        { id: 'free-vs-paid', label: 'Free vs paid access' },
        { id: 'company-prep', label: 'Company-specific prep' },
        { id: 'architecture-diagrams', label: 'Architecture diagrams' },
      ]}
    >
      <section id="topic-library" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Topic library</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora ships with 1,400+ curated interview topics across 9 category families &mdash; coding,
          system design, microservices patterns, databases, low-level design, project deep-dives,
          roadmaps, engineering blogs, and behavioral. Each topic has a written explanation, worked
          examples, illustrations / diagrams, and topic comments.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Open <Link to="/capra/prepare" className="text-[var(--accent)] underline">Prepare</Link>
          from the main nav. Search and sort the topic list, and the URL captures your current
          state (page, topic, role, focus, jobTitle, company) so you can deep-link or refresh
          without losing context.
        </p>

        <h3 id="categories" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Categories</h3>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Coding</strong> &mdash; algorithms, data structures, patterns (sliding window,
            two pointers, DP), with extra coding-topic packs.</li>
          <li><strong>System design</strong> &mdash; high-level architecture, scaling, trade-offs.
            Plus dedicated System Design Patterns and System Design Tradeoffs banks.</li>
          <li><strong>Microservices patterns</strong> &mdash; saga, CQRS, event sourcing, circuit
            breaker, etc.</li>
          <li><strong>Databases</strong> &mdash; SQL deep-dives, NoSQL trade-offs, indexing,
            transactions, replication.</li>
          <li><strong>Low-level design</strong> &mdash; OOP modelling, design patterns, LLD problems
            (parking lot, splitwise, etc.).</li>
          <li><strong>Project deep-dives</strong> &mdash; language- and framework-specific topics
            (React 19, Postgres, Kubernetes).</li>
          <li><strong>Roadmaps</strong> &mdash; ordered learning paths for specific roles or stacks.</li>
          <li><strong>Engineering blogs</strong> &mdash; curated takeaways from real engineering
            blog posts.</li>
          <li><strong>Behavioral</strong> &mdash; STAR stories tied to leadership principles and
            competency rubrics.</li>
        </ul>
      </section>

      <section id="role-personalization" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Role personalization</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The roles you picked at onboarding (e.g. Backend, Frontend, ML) drive the topic
          recommendations on the Prepare dashboard. Camora maps each role to a default topic-list
          focus so the most relevant topics surface first &mdash; switch roles in
          <Link to="/profile" className="text-[var(--accent)] underline ml-1">Profile</Link> to
          re-bias the dashboard for a different stack.
        </p>
      </section>

      <section id="sql-playground" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">SQL Playground</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          An interactive SQL query editor lives inside Prepare for any database / SQL topic. Edit
          and run queries against in-browser sample schemas, see results inline, and iterate
          without leaving the page.
        </p>
      </section>

      <section id="resume-optimizer" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Resume Optimizer</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Surfaced inside Prepare for users who&apos;ve uploaded a resume during onboarding &mdash;
          Camora analyzes your resume against a target role / job description and suggests
          rewrites, missing keywords, and structural improvements.
        </p>
      </section>

      <section id="free-vs-paid" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Free vs paid access</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Topic browsing &mdash; titles, summaries, and full topic content &mdash; is free for
          everyone. AI-generated features (company prep, coding helper, design helper) are gated
          per feature with a small free allowance, then require a subscription.
        </p>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Feature</th>
                <th className="text-left px-4 py-2.5 font-semibold">Free allowance</th>
                <th className="text-left px-4 py-2.5 font-semibold">Paid plans</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Topic reading</td>
                <td className="px-4 py-2.5">Unlimited</td>
                <td className="px-4 py-2.5">Unlimited</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Coding helper</td>
                <td className="px-4 py-2.5">Small daily allowance</td>
                <td className="px-4 py-2.5">Generous daily cap</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Design helper</td>
                <td className="px-4 py-2.5">Small daily allowance</td>
                <td className="px-4 py-2.5">Generous daily cap</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Company-specific prep</td>
                <td className="px-4 py-2.5">1 doc (lifetime)</td>
                <td className="px-4 py-2.5">Unlimited</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">Live interview (Lumora)</td>
                <td className="px-4 py-2.5">1 hr (7-day trial)</td>
                <td className="px-4 py-2.5">2&ndash;5+ hrs/month, top-ups available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="company-prep" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Company-specific prep</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          On any subscription plan, Camora can generate a multi-section prep document tailored to a
          target company&apos;s interview format and culture. Click <strong>Generate prep</strong>
          on the Prepare dashboard, enter the company + role, and Camora produces:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Likely DSA topics with rationale</li>
          <li>System design exercises matching the team&apos;s domain</li>
          <li>Company-specific behavioral story prompts</li>
          <li>Recent interview-loop format (rounds, expected duration)</li>
        </ul>
        <DocsCallout variant="note">
          The free tier gets one company-prep generation lifetime so you can evaluate quality before
          subscribing. Paid plans get unlimited generations.
        </DocsCallout>
      </section>

      <section id="architecture-diagrams" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Architecture diagrams</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          System design topics include rendered architecture diagrams generated by the Python
          <code className="mx-1 px-1.5 py-0.5 text-[12px]" style={{ background: 'var(--bg-elevated)', borderRadius: 4 }}>diagrams</code>
          library + Graphviz. Diagrams are cached in the database after first generation, so
          subsequent views are instant and don&apos;t re-run generation.
        </p>
      </section>
    </DocsPageLayout>
  );
}
