import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function LumoraCodingDocsPage() {
  return (
    <DocsPageLayout
      title="Lumora Coding Helper"
      description="Multi-language coding playground with three-approach solutions, complexity analysis, and a real Monaco editor."
      path="/docs/lumora-coding"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Lumora Coding' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'languages', label: 'Supported languages' },
        { id: 'three-approaches', label: 'Three-approach answers' },
        { id: 'screenshot-import', label: 'Screenshot → problem text' },
        { id: 'editor-settings', label: 'Editor settings' },
      ]}
    >
      <section id="overview" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Overview</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The coding helper at <Link to="/lumora/coding" className="text-[var(--accent)] underline">/lumora/coding</Link>{' '}
          gives you a Monaco editor (the same one VS Code uses), a problem input panel, and Sona — Camora's
          AI coding assistant. Drop in a problem, pick a language, and Sona produces a solution with three
          alternative approaches.
        </p>
      </section>

      <section id="languages" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Supported languages</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Python, JavaScript, TypeScript, Go, Rust, Java, C++, C#, Ruby, PHP, Swift, Kotlin, Scala. Python
          and JavaScript get the deepest auto-completion; the rest have syntax highlighting and proper
          formatting through the same Monaco engine VS Code ships with.
        </p>
      </section>

      <section id="three-approaches" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Three-approach answers</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          For most non-trivial problems Sona produces three approaches in increasing sophistication:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Brute force</strong> — the obvious solution, usually with a naive complexity. Demonstrates problem understanding.</li>
          <li><strong>Optimal time</strong> — the canonical interview answer (e.g. hash map, two pointers, dynamic programming).</li>
          <li><strong>Optimal space</strong> — when relevant, a variant that trades time for memory or vice versa.</li>
        </ol>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          Each approach includes a verbal pitch (what to say while coding), the actual code with comments,
          and time + space complexity analysis.
        </p>
      </section>

      <section id="screenshot-import" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Screenshot → problem text</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Click <strong>Capture problem</strong> in the top bar. Camora opens the screen-area picker —
          drag a rectangle around the LeetCode / HackerRank problem statement and Camora OCRs the text
          into the problem input. No copy-paste, no lost formatting.
        </p>
        <DocsCallout variant="tip">
          The OCR'd text is <em>not</em> auto-submitted — you review it first, edit if needed, then click
          <strong> Solve</strong>. Common gotcha: examples sometimes get truncated; double-check before
          submitting if your answer fails the example test.
        </DocsCallout>
      </section>

      <section id="editor-settings" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Editor settings</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Click the gear icon in the editor toolbar to configure theme (xcode, github, monokai, solarized
          light/dark, tomorrow night), keybindings (Standard, Vim, Emacs), and tab size (2 / 4 / 8 spaces).
          Settings persist per browser via localStorage.
        </p>
      </section>
    </DocsPageLayout>
  );
}
