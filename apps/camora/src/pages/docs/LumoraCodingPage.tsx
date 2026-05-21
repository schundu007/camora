import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraCodingDocsPage() {
  return (
    <DocsPageLayout
      title="Coding"
      description="How to use the Coding tab — four input modes (paste / URL / image / voice), three-approach solutions with auto-run, language switching, timer, and the Sona follow-up sidebar."
      path="/docs/lumora-coding"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Coding' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'input-modes', label: 'Input modes' },
        { id: 'reading', label: 'Reading the three solutions' },
        { id: 'languages', label: 'Switching languages' },
        { id: 'run-fix', label: 'Running and fixing code' },
        { id: 'sona-sidebar', label: 'Sona follow-up sidebar' },
        { id: 'timer', label: 'Timer' },
        { id: 'limits', label: 'Daily limits' },
        { id: 'tips', label: 'Tips for live sessions' },
      ]}
    >
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          The Coding tab takes a coding-interview problem and returns three different approaches
          &mdash; <em>Brute</em>, <em>Optimized</em>, and <em>Most Optimal</em> &mdash; each with a
          complete code snippet, time and space complexity, a short narration you can read aloud, a
          step-by-step trace on the first example, per-line explanations, and a pattern tag (Two
          Pointers, Sliding Window, etc.) on the active solution.
        </p>
        <p className={bodyP} style={bodyColor}>
          Solutions <strong>auto-run</strong> against the parsed examples once streaming completes
          &mdash; you don&apos;t have to click Run. Switching between solutions swaps the editor
          contents in place, so you can flip while talking the interviewer through the trade-offs.
        </p>
      </section>

      <section id="input-modes" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Input modes</h2>
        <DocsTable
          columns={[
            { key: 'mode', header: 'Mode' },
            { key: 'when', header: 'When to use it' },
            { key: 'how', header: 'How' },
          ]}
          rows={[
            { mode: 'Paste', when: 'You can copy the problem text from the screen.', how: 'Drop the problem statement into the textarea and click Solve. Fastest path.' },
            { mode: 'URL', when: 'The problem is on a static page like LeetCode, HackerRank, or Codeforces.', how: 'Paste the URL and click Fetch — Camora fetches the problem and auto-solves in a single step.' },
            { mode: 'Image', when: 'The problem is on a CoderPad-style screen where copy-paste is locked, or you only have a screenshot.', how: 'Drag the screenshot into the textarea — Camora extracts the text and auto-solves in one step.' },
            { mode: 'Voice', when: 'You\'re mid-call and want to dictate the problem.', how: 'Use the bottom-bar mic on the Coding tab to speak the problem aloud; transcription populates the textarea.' },
          ]}
        />
        <DocsCallout variant="tip">
          Drag-and-drop image and the URL flow are both <em>one-step solves</em>: extract /
          fetch + Solve fire together so you don&apos;t have to click twice.
        </DocsCallout>
      </section>

      <section id="reading" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Reading the three solutions</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li><strong>Brute</strong> &mdash; easy to explain, slow to run. Good as your opening
            &ldquo;let me start with the obvious approach&rdquo; answer.</li>
          <li><strong>Optimized</strong> &mdash; a meaningful improvement over brute. Often the right
            answer for non-FAANG interviews.</li>
          <li><strong>Most Optimal</strong> &mdash; the approach the interviewer is most likely
            looking for. Usually the one to land on after walking through the first two.</li>
        </ul>
        <p className={bodyP} style={bodyColor}>
          Each solution has a <strong>narration</strong> field &mdash; a first-person summary
          written in the way you&apos;d actually say it. Use it as a thinking-out-loud script, not a
          summary to skim. The active solution also displays a <strong>pattern tag</strong> badge
          (Two Pointers, Sliding Window, DP, etc.) for fast scanning.
        </p>
        <DocsCallout variant="warning" label="Don't read code verbatim">
          The point of three approaches is that you can show your work &mdash; pick the one that
          matches the level of the interview, walk through the trade-offs, and adapt. Reading the
          generated code line-by-line defeats the purpose and recruiters notice.
        </DocsCallout>
      </section>

      <section id="languages" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Switching languages</h2>
        <p className={bodyP} style={bodyColor}>
          The language picker in the editor toolbar swaps the editor&apos;s syntax mode and either
          loads a starter template (if no solution is generated yet) or translates the existing
          three solutions to the new language without re-solving from scratch.
        </p>
        <p className={bodyP} style={bodyColor}>
          Translation is much faster than a full solve and <strong>does not consume a daily-limit
          slot</strong> &mdash; flip languages freely if you&apos;re unsure what the interviewer
          expects. Many languages are supported, including SQL, Bash, and TypeScript.
        </p>
      </section>

      <section id="run-fix" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Running and fixing code</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li><strong>Auto-run</strong> &mdash; once streaming completes, Camora runs the active
            solution against the parsed example test cases automatically. No click needed.</li>
          <li><strong>Run</strong> &mdash; manually re-run after edits. Pass/fail per case shown
            inline.</li>
          <li><strong>Fix</strong> &mdash; appears when one or more test cases fail. Sends the
            failing output and asks Sona to repair the code without losing your edits where
            possible.</li>
          <li><strong>Test cases panel</strong> &mdash; add, edit, or remove test cases inline. Use
            this to verify edge cases the interviewer raises mid-question.</li>
          <li><strong>Regenerate</strong> &mdash; bypass the answer cache and ask for a fresh solve.
            Useful when the cached solution feels off.</li>
        </ul>
      </section>

      <section id="sona-sidebar" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Sona follow-up sidebar</h2>
        <p className={bodyP} style={bodyColor}>
          The right rail on the Coding tab is a <strong>Sona sidebar</strong> &mdash; a focused
          Q&amp;A pane that knows the active problem and active solution. Ask follow-ups like
          &ldquo;why is this O(n log n) not O(n)?&rdquo; or &ldquo;can you walk through this with
          input [1, 2, 3]?&rdquo; without leaving the tab. Different from the live-interview Sona
          stream &mdash; this one is for deliberate, off-mic exploration.
        </p>
      </section>

      <section id="timer" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Timer</h2>
        <p className={bodyP} style={bodyColor}>
          A built-in countdown timer (15 / 30 / 45 / 60 minutes) lets you simulate real interview
          pressure during practice. The ring goes amber as you approach the limit and red when
          time&apos;s up.
        </p>
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
            { plan: 'Free trial', limit: 'Limited', note: 'Coding helper has a free-tier daily cap. Translations and Regenerate don\'t count.' },
            { plan: 'Monthly / Yearly / Team', limit: 'Generous', note: 'Daily cap on subscription tiers is high enough for normal interview-prep use. If you hit it during a real interview, contact support.' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          The limit resets at midnight UTC. Switching languages on an existing solution doesn&apos;t
          consume a slot.
        </p>
      </section>

      <section id="tips" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>Tips for live sessions</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Submit the question early &mdash; the moment you&apos;ve heard the full problem, click
            Solve so the answer is ready by the time you start coding.</li>
          <li>Drag-and-drop a screenshot from CoderPad / HackerRank straight into the textarea
            instead of retyping &mdash; one step, no retyping errors.</li>
          <li>Use the Brute narration to buy yourself time &mdash; talking through the obvious
            approach while reading Most Optimal quietly is a legitimate strategy.</li>
          <li>If the interviewer asks for a specific complexity (&ldquo;can you do it in O(n)?&rdquo;),
            pick the solution whose complexity badge matches.</li>
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
