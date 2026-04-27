import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraLivePage() {
  return (
    <DocsPageLayout
      title="Live Interview"
      description="How to set up and use Camora during a real interview — audio capture, the three answer modes, screen-share safety, sessions, and troubleshooting."
      path="/docs/lumora-live"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Live Interview' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'before', label: 'Before the call' },
        { id: 'audio', label: 'Audio setup' },
        { id: 'audio-system', label: 'Tab audio (recommended)', depth: 1 },
        { id: 'audio-mic', label: 'Microphone + voice filter', depth: 1 },
        { id: 'tabs', label: 'The three answer tabs' },
        { id: 'using-sona', label: 'Using Sona during the interview' },
        { id: 'safety', label: 'Screen-share safety' },
        { id: 'after', label: 'After the call' },
        { id: 'troubleshooting', label: 'Troubleshooting' },
      ]}
    >
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          Camora listens to your interviewer through your computer's audio, transcribes their
          questions in real time, and streams a structured answer from <strong>Sona</strong> — your
          AI interview helper — into a side panel only you can see. You read it, internalize the
          structure, then answer in your own voice.
        </p>
        <p className={bodyP} style={bodyColor}>
          Three answer modes are tuned for different interview types:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-2" style={bodyColor}>
          <li><strong>Coding</strong> — three approaches with complexity analysis and a working code snippet you can adapt.</li>
          <li><strong>Design</strong> — capacity estimates, requirements, an architecture diagram, data model, and deep-dives.</li>
          <li><strong>Behavioral</strong> — STAR-format response personalized from your resume.</li>
        </ul>
      </section>

      <section id="before" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Before the call</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Open <Link to="/lumora" className="text-[var(--accent)] underline">/lumora</Link> in a browser tab <em>separate</em> from your video call.</li>
          <li>Click <strong>Audio Check</strong>. The modal verifies microphone and tab-audio permissions. Don't skip this — a permission popup mid-interview is distracting.</li>
          <li>Pick the right tab — Coding, Design, or Behavioral — based on what's coming.</li>
          <li>Open your resume / job context pane so Sona can reference it during answers (especially behavioral ones).</li>
          <li>If you're using microphone capture, finish <Link to="/docs/voice-filtering" className="text-[var(--accent)] underline">Voice enrollment</Link> first — it takes ten seconds and prevents Camora from transcribing your own voice.</li>
        </ol>
        <DocsCallout variant="tip">
          Doing all four of these <strong>fifteen minutes before</strong> the call leaves time to
          fix any setting that's wrong without panicking.
        </DocsCallout>
      </section>

      <section id="audio" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Audio setup</h2>
        <p className={bodyP} style={bodyColor}>
          Camora has two ways to hear your interviewer. Pick one — they're not used together.
        </p>

        <h3 id="audio-system" className={sectionH3}>Tab audio (recommended)</h3>
        <p className={bodyP} style={bodyColor}>
          The cleanest path. Click the <strong>System Audio</strong> button in the Camora top bar.
          Chrome opens its share-tab picker — choose your Zoom / Meet / Teams window and check{' '}
          <strong>Share tab audio</strong>. From that point Camora hears only your interviewer's
          voice, not yours, so there's nothing to filter and no risk of transcribing your own
          answers back into the panel.
        </p>
        <DocsCallout variant="warning" label="Browser support">
          Tab audio capture requires Chrome (or Chromium-based browsers like Edge / Brave / Arc).
          Firefox and Safari don't support it. On those browsers — or if you simply prefer a
          single mic source — use the microphone path below, or install the{' '}
          <Link to="/docs/desktop" className="text-[var(--accent)] underline">Camora Desktop app</Link>{' '}
          which works on all platforms.
        </DocsCallout>

        <h3 id="audio-mic" className={sectionH3}>Microphone + voice filter</h3>
        <p className={bodyP} style={bodyColor}>
          If you can't use tab audio, point Camora at your microphone and turn on{' '}
          <strong>Voice filtering</strong>. You record ten seconds of your voice once during
          enrollment; from then on, Camora skips any audio that matches your voiceprint and only
          transcribes the other speaker(s) — i.e. the interviewer.
        </p>
        <p className={bodyP} style={bodyColor}>
          Full setup walkthrough at{' '}
          <Link to="/docs/voice-filtering" className="text-[var(--accent)] underline">
            /docs/voice-filtering
          </Link>.
        </p>
      </section>

      <section id="tabs" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>The three answer tabs</h2>
        <p className={bodyP} style={bodyColor}>
          Switch tabs <em>before</em> the question lands so the right prompt is loaded. Sona auto-routes
          when the question wording is unambiguous, but a deliberate tab pick is more reliable.
        </p>
        <DocsTable
          columns={[
            { key: 'tab', header: 'Tab' },
            { key: 'when', header: 'When to use it' },
            { key: 'what', header: 'What you get' },
          ]}
          rows={[
            { tab: 'Coding', when: 'A specific algorithm / data structure problem ("two-sum-style", "LRU cache").', what: 'Three approaches (brute / better / optimal) with complexity, narration, trace, and per-line code explanations. Switch language without re-solving.' },
            { tab: 'Design', when: 'A "design X" or "scale Y" question ("design Twitter", "build a rate limiter", "design WhatsApp").', what: 'Headline, requirements, capacity estimates, architecture overview with a generated diagram, data model, API, deep-dives.' },
            { tab: 'Behavioral', when: 'STAR-style or motivational questions ("tell me about a time", "why this company").', what: 'Situation / Task / Action / Result with details pulled from your resume — read aloud as a script.' },
          ]}
        />
      </section>

      <section id="using-sona" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Using Sona during the interview</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            Sona's answer streams in token-by-token. You don't need to wait for the whole thing —
            start reading the headline as it appears.
          </li>
          <li>
            <strong>Cmd+B</strong> (Ctrl+B on Windows / Linux) instantly blanks the screen. Use it
            the moment the interviewer asks you to share — Camora keeps running underneath, so when
            you toggle back nothing has been lost.
          </li>
          <li>
            <strong>Bookmark</strong> a particularly good answer with the star icon — it's saved to{' '}
            <Link to="/lumora/sessions" className="text-[var(--accent)] underline">/lumora/sessions</Link>{' '}
            for review later.
          </li>
          <li>
            If Sona misroutes (e.g. interprets a behavioral question as design), switch the tab and
            click <strong>Re-answer</strong> instead of waiting for a fresh question.
          </li>
        </ul>
        <DocsCallout variant="tip">
          Sona is a thinking partner, not a script reader. Use her output as scaffolding — read it,
          internalize the structure, then answer in your own voice. Recruiters notice when
          candidates read AI text verbatim, so don't.
        </DocsCallout>
      </section>

      <section id="safety" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Screen-share safety</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>
            Camora runs in a separate browser tab. When the interviewer asks you to share, share
            your <em>specific window</em> (e.g. CoderPad, your IDE) — never the full desktop.
          </li>
          <li>
            If you're forced into a full-screen share, hit <strong>Cmd+B</strong> immediately —
            Camora goes black instantly, audio capture continues, and you can toggle it back when
            the share ends.
          </li>
          <li>
            For maximum safety use the{' '}
            <Link to="/docs/desktop" className="text-[var(--accent)] underline">
              Camora Desktop app
            </Link>{' '}
            — its window is invisible to screen capture by design, even on full-screen share.
          </li>
        </ul>
      </section>

      <section id="after" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>After the call</h2>
        <p className={bodyP} style={bodyColor}>
          Every conversation is saved to{' '}
          <Link to="/lumora/sessions" className="text-[var(--accent)] underline">/lumora/sessions</Link>.
          Review the questions you struggled with, bookmark answers worth re-reading, and feed
          them into your <Link to="/capra/prepare" className="text-[var(--accent)] underline">
          Prepare
          </Link>{' '}
          notes so the gaps surface in your next study session.
        </p>
        <p className={bodyP} style={bodyColor}>
          You can clear individual sessions or the whole history from the same page — there are
          explicit Delete and Clear all buttons; nothing is hover-only.
        </p>
      </section>

      <section id="troubleshooting" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>Troubleshooting</h2>
        <DocsTable
          columns={[
            { key: 's', header: 'Symptom' },
            { key: 'c', header: 'Likely cause' },
            { key: 'f', header: 'Fix' },
          ]}
          rows={[
            { s: '"No audio detected" message stays on after the call starts.', c: 'You picked the wrong tab in the share-tab dialog, or forgot to tick "Share tab audio".', f: 'Click the System Audio button again and re-pick — make sure the audio checkbox is ticked.' },
            { s: 'Camora is transcribing your own voice back at you.', c: 'You\'re on the microphone path without voice filtering enabled.', f: 'Enable Voice filtering in the Camora top bar, or switch to tab audio. See /docs/voice-filtering.' },
            { s: 'No answer streams in after a question.', c: 'Sona didn\'t hear a complete question — the gating heuristic is conservative.', f: 'Click Re-answer to force submission, or wait until the interviewer finishes the next sentence.' },
            { s: 'Sona answered in coding format but the question was design.', c: 'Auto-routing misclassified the question.', f: 'Switch to the Design tab and click Re-answer. The question text is preserved.' },
            { s: 'Architecture diagram never appears on a design answer.', c: 'Generated code tripped the sanitizer or the renderer hit its 60s timeout.', f: 'The prose answer is unaffected. Rephrase the question more concretely (specific cloud, specific components) and resubmit.' },
            { s: '"Daily limit reached" before the interview is over.', c: 'Free-tier daily quota.', f: 'Upgrade to a paid plan from /pricing — the cap lifts immediately.' },
            { s: 'Cmd+B blanks the screen but doesn\'t unblank.', c: 'Focus is in another window when you press the shortcut a second time.', f: 'Click the Camora window first, then press Cmd+B again.' },
          ]}
        />
      </section>
    </DocsPageLayout>
  );
}
