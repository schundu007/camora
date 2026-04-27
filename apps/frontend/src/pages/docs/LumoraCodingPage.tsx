import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraCodingDocsPage() {
  return (
    <DocsPageLayout
      title="Coding"
      description="How to use the Coding tab — three input modes (paste / URL / image), three-approach solutions with complexity analysis, language switching, and run/fix/translate."
      path="/docs/lumora-coding"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Coding' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'input-modes', label: 'Three input modes' },
        { id: 'reading', label: 'Reading the three solutions' },
        { id: 'languages', label: 'Switching languages' },
        { id: 'run-fix', label: 'Running and fixing code' },
        { id: 'limits', label: 'Daily limits' },
        { id: 'tips', label: 'Tips for live interviews' },
      ]}
    >
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          The Coding tab takes a coding-interview problem and returns three different approaches —
          usually <em>brute-force</em>, <em>better</em>, and <em>optimal</em> — each with a
          complete code snippet, time and space complexity, a short narration you can read aloud,
          a step-by-step trace of how the algorithm runs on the first example, and per-line
          explanations.
        </p>
        <p className={bodyP} style={bodyColor}>
          The result renders as three cards backed by a live editor. Switching between solutions
          swaps the editor contents in place, so you can flip between approaches while talking the
          interviewer through the trade-offs.
        </p>
      </section>

      <section id="input-modes" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Three input modes</h2>
        <DocsTable
          columns={[
            { key: 'mode', header: 'Mode' },
            { key: 'when', header: 'When to use it' },
            { key: 'how', header: 'How' },
          ]}
          rows={[
            { mode: 'Paste', when: 'You can copy the problem text from the screen.', how: 'Drop the problem statement into the textarea and click Generate. Fastest path.' },
            { mode: 'URL', when: 'The problem is on a static page like LeetCode, HackerRank, or Codeforces.', how: 'Paste the URL and click Fetch. Works best on static pages — JS-rendered pages may need the Image path.' },
            { mode: 'Image', when: 'The problem is on a CoderPad-style screen where copy-paste is locked, or you only have a screenshot.', how: 'Drag the screenshot into the textarea, or use the Image tab. Vision extraction takes a second or two.' },
          ]}
        />
        <DocsCallout variant="tip">
          You can drag an image directly into the Paste textarea — Camora detects it and routes
          through the Image path automatically.
        </DocsCallout>
      </section>

      <section id="reading" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Reading the three solutions</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            <strong>Solution 1 — brute-force.</strong> Easy to explain, slow to run. Good as your
            opening "let me start with the obvious approach" answer.
          </li>
          <li>
            <strong>Solution 2 — better.</strong> A meaningful improvement over brute-force. Often
            the right answer for non-FAANG interviews.
          </li>
          <li>
            <strong>Solution 3 — optimal.</strong> The approach the interviewer is most likely
            looking for. Usually the one to land on after walking through the first two.
          </li>
        </ul>
        <p className={bodyP} style={bodyColor}>
          Each solution has a <strong>narration</strong> field — a first-person 4–6 sentence
          summary written in the way you'd actually say it. Use this as a thinking-out-loud script,
          not a summary to skim.
        </p>
        <DocsCallout variant="warning" label="Don't read code verbatim">
          The whole point of three approaches is that you can show your work — pick the one that
          matches the level of the interview, walk through the trade-offs, and adapt. Reading the
          generated code line-by-line defeats the purpose and recruiters notice.
        </DocsCallout>
      </section>

      <section id="languages" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Switching languages</h2>
        <p className={bodyP} style={bodyColor}>
          The language picker in the editor toolbar swaps the editor's syntax mode and either
          loads a starter template (if no solution is generated yet) or translates the existing
          three solutions to the new language without re-solving from scratch.
        </p>
        <p className={bodyP} style={bodyColor}>
          Translation is much faster than a full solve and <strong>does not consume a daily-limit
          slot</strong> — flip languages freely if you're unsure what the interviewer expects.
          Around fifty languages are supported, including SQL, Bash, and TypeScript.
        </p>
      </section>

      <section id="run-fix" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Running and fixing code</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            <strong>Run</strong> — executes the current solution against the parsed example test
            cases. Shows pass/fail for each.
          </li>
          <li>
            <strong>Fix</strong> — appears when one or more test cases fail. Sends the failing
            output and asks Camora to repair the code without losing your edits where possible.
          </li>
          <li>
            <strong>Custom test</strong> — paste a custom input/output pair to verify edge cases
            the interviewer raises mid-question.
          </li>
        </ul>
      </section>

      <section id="limits" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Daily limits</h2>
        <DocsTable
          columns={[
            { key: 'plan', header: 'Plan' },
            { key: 'limit', header: 'Daily solves' },
            { key: 'note', header: 'Notes' },
          ]}
          rows={[
            { plan: 'Free', limit: '2 / day', note: 'Counts only fresh solves. Translations don\'t consume a slot.' },
            { plan: 'Pro / Pro Max / Business', limit: '20 / day', note: 'Generous cap. If you hit it during a real interview, contact support — we can lift it.' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          The limit resets at midnight UTC. Switching languages on an existing solution doesn't
          consume a slot.
        </p>
      </section>

      <section id="tips" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>Tips for live interviews</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            Submit the question early — the moment you've heard the full problem, hit Generate so
            the answer is ready by the time you start coding.
          </li>
          <li>
            Switch tabs <em>before</em> the question lands. The Coding tab uses a different prompt
            than Design or Behavioral; if you're on the wrong tab, the answer shape is wrong.
          </li>
          <li>
            Use Solution 1's narration to buy yourself time — talking through the brute-force
            while reading Solution 3 quietly is a legitimate strategy.
          </li>
          <li>
            If the interviewer asks for a specific complexity ("can you do it in O(n)?"), pick the
            solution whose complexity badge matches. The badge is colour-coded for fast scanning.
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
