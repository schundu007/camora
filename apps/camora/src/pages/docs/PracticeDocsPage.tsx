import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function PracticeDocsPage() {
  return (
    <DocsPageLayout
      title="Practice"
      description="Timed practice sessions — three modes (Quick Fire, Deep Dive, Mock), per-company filtering, AI grading on a 5-dimension rubric."
      path="/docs/practice"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Practice' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'modes', label: 'Three timed modes' },
        { id: 'company-filter', label: 'Per-company filtering' },
        { id: 'problem-banks', label: 'Problem banks' },
        { id: 'whiteboard', label: 'System design whiteboard' },
        { id: 'grading', label: 'How grading works' },
        { id: 'stats', label: 'Readiness score & stats' },
        { id: 'blind-75', label: 'Blind 75 handbook' },
      ]}
    >
      <section id="overview" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Overview</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Practice complements
          <Link to="/docs/prepare" className="text-[var(--accent)] underline ml-1">Prepare</Link>
          &mdash; instead of reading topics, you solve problems under time pressure.
          <Link to="/capra/practice" className="text-[var(--accent)] underline ml-1">/capra/practice</Link>
          is the timed mock-interview surface; for free-form coding without a timer, use the Coding
          tab inside Lumora.
        </p>
      </section>

      <section id="modes" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Three timed modes</h2>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Mode</th>
                <th className="text-left px-4 py-2.5 font-semibold">Questions</th>
                <th className="text-left px-4 py-2.5 font-semibold">Time</th>
                <th className="text-left px-4 py-2.5 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5"><strong>Quick Fire</strong></td>
                <td className="px-4 py-2.5">5</td>
                <td className="px-4 py-2.5">5 min</td>
                <td className="px-4 py-2.5">Pattern recognition / warm-up.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5"><strong>Deep Dive</strong></td>
                <td className="px-4 py-2.5">3</td>
                <td className="px-4 py-2.5">15 min</td>
                <td className="px-4 py-2.5">Working through harder problems with breathing room.</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5"><strong>Mock</strong></td>
                <td className="px-4 py-2.5">8</td>
                <td className="px-4 py-2.5">45 min</td>
                <td className="px-4 py-2.5">Full mock-interview simulation.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Pick a mode + difficulty (easy / medium / hard) + category, then start. The timer is
          deliberate &mdash; under-pressure performance is what you&apos;re training for.
        </p>
      </section>

      <section id="company-filter" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Per-company filtering</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Filter the problem pool by target company &mdash; Google, Meta, Amazon, Apple, Microsoft,
          Netflix &mdash; so the questions in your mock match what the company is known to ask.
          Useful in the final week of prep when you want to drill on the actual format.
        </p>
      </section>

      <section id="problem-banks" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Problem banks</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Practice draws from three problem banks:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Coding</strong> &mdash; 20 algorithm / data-structure problems covering arrays,
            strings, hash maps, two pointers, sliding window, binary search, trees, graphs, DP,
            backtracking, greedy.</li>
          <li><strong>System design</strong> &mdash; 12 design exercises with a guided rubric:
            clarify requirements, estimate scale, draw the high-level architecture, deep-dive on
            the hardest piece, discuss trade-offs.</li>
          <li><strong>Behavioral STAR</strong> &mdash; 12 behavioral prompts covering common rubric
            dimensions (leadership, conflict, ambiguity, ownership). Write the story; AI grades it.</li>
        </ul>
      </section>

      <section id="whiteboard" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">System design whiteboard</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          System-design problems include an Excalidraw-based whiteboard so you can sketch your
          architecture as you talk through it &mdash; closer to a real on-site interview than a
          text-only answer.
        </p>
      </section>

      <section id="grading" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How grading works</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Camora grades each session with AI rather than test-case execution. The grader scores your
          response on a <strong>5-dimension rubric</strong>:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Problem solving</strong> &mdash; did you decompose the problem clearly?</li>
          <li><strong>System design</strong> &mdash; for design problems, is the architecture sound?</li>
          <li><strong>Data structures</strong> &mdash; did you pick the right tools?</li>
          <li><strong>Communication</strong> &mdash; is the explanation legible to a grader?</li>
          <li><strong>Time management</strong> &mdash; did you finish within the timer?</li>
        </ul>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          Each dimension scores 0&ndash;5; a session score plus per-dimension feedback comes back
          in seconds.
        </p>
        <DocsCallout variant="note">
          Practice grading uses your free / paid AI feature allowance &mdash; coding and design
          attempts share the same per-feature budget as the Lumora helpers. See
          <Link to="/docs/topups" className="text-[var(--accent)] underline ml-1">Top-ups & AI hours</Link>
          for budget mechanics.
        </DocsCallout>
      </section>

      <section id="stats" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Readiness score & stats</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Camora rolls each completed session into a <strong>readiness score</strong> &mdash; a
          single number that tracks how prepared you are based on recent grades, dimension trends,
          and session count. Stats are persisted locally per device so you can track progress over
          time without an account dependency.
        </p>
      </section>

      <section id="blind-75" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Blind 75 handbook</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The canonical Blind 75 list is hosted as a separate guided handbook at
          <Link to="/handbook" className="text-[var(--accent)] underline ml-1">/handbook</Link>
          &mdash; topics ordered by category and difficulty, each with practice and solution
          surfaces. Use it for systematic pattern coverage rather than timed mocks.
        </p>
      </section>
    </DocsPageLayout>
  );
}
