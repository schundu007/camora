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
      title="Live Session"
      description="How to set up and use Camora during a real interview — audio capture, the four answer surfaces, hotkeys, sessions, and troubleshooting."
      path="/docs/lumora-live"
      breadcrumbs={[{ label: 'Live Session' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'before', label: 'Before the call' },
        { id: 'audio', label: 'Audio setup' },
        { id: 'tabs', label: 'The four tabs' },
        { id: 'using-sona', label: 'Using Sona during the interview' },
        { id: 'hotkeys', label: 'Hotkeys' },
        { id: 'safety', label: 'Screen-share safety' },
        { id: 'after', label: 'After the call' },
        { id: 'troubleshooting', label: 'Troubleshooting' },
      ]}
    >
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          Camora listens to your interviewer&apos;s audio, transcribes their questions in real time,
          and streams a structured answer from <strong>Sona</strong> &mdash; your AI interview helper
          &mdash; into a side panel only you can see. You read it, internalize the structure, then
          answer in your own voice.
        </p>
        <p className={bodyP} style={bodyColor}>
          Four answer surfaces, each tuned for a different interview type:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-2" style={bodyColor}>
          <li><strong>Home</strong> &mdash; the live session surface. Sona answers questions in real
            time as the interviewer asks them.</li>
          <li><strong>Coding</strong> &mdash; multi-language playground with three approaches (brute /
            optimized / most optimal), narration, complexity analysis, auto-run, and a follow-up Sona
            sidebar.</li>
          <li><strong>Design</strong> &mdash; capacity estimates with an interactive Scale Calculator,
            requirements, scalability tiers (clickable drill-downs), architecture diagram, trade-offs,
            and edge cases.</li>
          <li><strong>Behavioral</strong> &mdash; STAR-format response personalized from your resume
            and job context.</li>
        </ul>
      </section>

      <section id="before" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Before the call</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Open <Link to="/lumora" className="text-[var(--accent)] underline">/lumora</Link> in
            a browser tab <em>separate</em> from your video call.</li>
          <li>Run the <strong>Audio Setup Wizard</strong> &mdash; it appears automatically the first
            time. Pick the capture method that matches your environment (Desktop loopback / tab share
            / virtual loopback / room mic / mic-only). Full guide at
            <Link to="/docs/audio-setup" className="text-[var(--accent)] underline ml-1">/docs/audio-setup</Link>.</li>
          <li>Run <strong>Audio Check</strong> from the icon-rail menu. The modal verifies mic
            permission and lets you confirm the capture path with a live level meter. It&apos;s a
            quicker test than the full wizard &mdash; do it 15 minutes before the call.</li>
          <li>If you&apos;re using room-mic or mic-only capture, finish
            <Link to="/docs/voice-filtering" className="text-[var(--accent)] underline ml-1">Voice enrollment</Link>
            first &mdash; it takes ~5 seconds and prevents Camora from transcribing your own voice
            into Sona.</li>
        </ol>
      </section>

      <section id="audio" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Audio setup</h2>
        <p className={bodyP} style={bodyColor}>
          Camora supports five capture methods, picked in the Audio Setup Wizard. The wizard
          auto-selects based on your environment and saves your choice to your account so it follows
          you across devices. Quick reference:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li><strong>Desktop loopback</strong> &mdash; Camora desktop app captures system audio
            natively (any meeting client, no virtual cables).</li>
          <li><strong>Tab share</strong> &mdash; share a Chrome tab with &ldquo;Share tab audio&rdquo;
            checked. Works for Zoom Web, Meet, Teams Web. Chrome / Edge only.</li>
          <li><strong>Virtual loopback</strong> &mdash; BlackHole (macOS) or VoiceMeeter (Windows)
            for capturing native Zoom / Teams desktop clients.</li>
          <li><strong>Room mic</strong> &mdash; for in-person interviews or phone-on-speaker /
            Bluetooth setups. Requires voice enrollment.</li>
          <li><strong>Mic-only fallback</strong> &mdash; lossy, speaker diarization filters your
            voice from the stream. Use only when nothing else works.</li>
        </ul>
        <DocsCallout variant="tip">
          Full walkthrough for each method, with troubleshooting, lives at
          <Link to="/docs/audio-setup" className="text-[var(--accent)] underline ml-1">/docs/audio-setup</Link>.
        </DocsCallout>
      </section>

      <section id="tabs" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>The four tabs</h2>
        <p className={bodyP} style={bodyColor}>
          Switch tabs <em>before</em> the question lands so the right surface is loaded. The Home
          tab is where the live-interview Sona stream lives; Coding / Design / Behavioral are
          standalone surfaces with their own input boxes you can drive directly (typed, voice, image
          drop, or fetch-from-URL).
        </p>
        <DocsTable
          columns={[
            { key: 'tab', header: 'Tab' },
            { key: 'when', header: 'When to use it' },
            { key: 'what', header: 'What you get' },
          ]}
          rows={[
            { tab: 'Home', when: 'Default — Sona answers the interviewer\'s questions live as your audio capture streams.', what: 'Streaming answers in a side panel, screenshot capture, session history.' },
            { tab: 'Coding', when: 'A specific algorithm / data-structure problem. Useful before the call to drill, or to manually drive Sona.', what: 'Three approaches with complexity, auto-run, voice-input, drag-drop image, fetch-from-URL, follow-up Sona sidebar.' },
            { tab: 'Design', when: 'A "design X" or "scale Y" question. Drive it manually or let Sona auto-route from Home.', what: 'Requirements, Scale Calculator, scalability tiers (clickable drill-downs), architecture diagram, trade-offs, edge cases.' },
            { tab: 'Behavioral', when: 'STAR-style or motivational questions.', what: 'Situation / Task / Action / Result, personalized from your resume and target company.' },
          ]}
        />
      </section>

      <section id="using-sona" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Using Sona during the interview</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Sona&apos;s answer streams in token-by-token. Start reading as it appears &mdash; you
            don&apos;t need to wait for the full response.</li>
          <li>Sona answers in <strong>first person</strong> as the candidate (&ldquo;I&apos;m a
            backend engineer...&rdquo;), so you can read it aloud as a script if you want to.</li>
          <li><strong>Auto-mode toggle</strong> + <strong>one-shot mic</strong> are the two explicit
            buttons for capture. Auto-mode lets Sona fire on every detected question; one-shot is
            press-to-listen for a single question.</li>
          <li>The <strong>question filter</strong> gates auto-submit so Sona only fires on real
            questions &mdash; not on filler chatter, partial sentences, or your own utterances. If
            Sona misses a question, switch tab and resubmit manually rather than waiting.</li>
          <li>For follow-ups on a coding or design answer, use the <strong>Sona sidebar</strong> on
            the Coding / Design tabs &mdash; it&apos;s a focused Q&amp;A pane that knows the active
            problem context.</li>
        </ul>
        <DocsCallout variant="tip">
          Sona is a thinking partner, not a script reader. Use her output as scaffolding &mdash;
          read it, internalize the structure, then answer in your own voice. Recruiters notice when
          candidates read AI text verbatim, so don&apos;t.
        </DocsCallout>
      </section>

      <section id="hotkeys" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Hotkeys</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li><strong>Cmd+B</strong> (Ctrl+B on Windows / Linux) &mdash; instantly blanks the screen.
            Camora keeps capturing audio underneath; toggle back when the share ends.</li>
          <li><strong>Cmd+S</strong> &mdash; toggle web search assistance on / off. When on, Sona can
            ground answers with web context.</li>
          <li><strong>Cmd+Backspace</strong> &mdash; clear all session history (with confirm dialog).</li>
        </ul>
      </section>

      <section id="safety" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Screen-share safety</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] mb-3" style={bodyColor}>
          <li>Camora runs in a separate browser tab (or desktop window). When the interviewer asks
            you to share, share your <em>specific window</em> (CoderPad, IDE, doc) &mdash; never the
            full desktop.</li>
          <li>If you&apos;re forced into a full-screen share, hit <strong>Cmd+B</strong> immediately
            &mdash; Camora goes black, audio capture continues, and you can toggle it back when the
            share ends.</li>
          <li>The desktop app is <em>not</em> hidden from screen-capture APIs. Treat the web app and
            desktop app as visually identical for safety: tab-share-only is your discipline either
            way.</li>
        </ul>
      </section>

      <section id="after" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>After the call</h2>
        <p className={bodyP} style={bodyColor}>
          Every conversation is saved to
          <Link to="/lumora/sessions" className="text-[var(--accent)] underline ml-1">/lumora/sessions</Link>.
          Review the questions you struggled with and feed them into your
          <Link to="/capra/prepare" className="text-[var(--accent)] underline ml-1">Prepare</Link>
          notes so the gaps surface in your next study session.
        </p>
        <p className={bodyP} style={bodyColor}>
          You can delete individual sessions or clear the whole history from the sessions page
          &mdash; explicit Delete and Clear-all buttons, nothing hover-only. Cmd+Backspace also
          clears all sessions globally with a confirm dialog.
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
            { s: '"No audio detected" stays on after the call starts.', c: 'Audio Setup Wizard method picked the wrong path, or Chrome share-tab dialog was missing the "Share tab audio" checkbox.', f: 'Open the wizard, click Disconnect, pick the right method card, click Connect again.' },
            { s: 'Camora is transcribing your own voice back at you.', c: 'You\'re on room-mic or mic-only capture without voice filtering enabled.', f: 'Open Settings → Enroll My Voice. Filter enables automatically once enrollment finishes. See /docs/voice-filtering.' },
            { s: 'No answer streams in after a question.', c: 'Question filter classified the audio as not-a-question.', f: 'Switch tab and submit manually, or wait for the next clearly-formed question.' },
            { s: 'Sona answered in coding format but the question was design.', c: 'Auto-routing misclassified.', f: 'Switch to the Design tab and re-paste the question in the Design input box.' },
            { s: 'Architecture diagram never appears on a design answer.', c: 'Generated code tripped the sanitizer or the renderer hit a timeout.', f: 'The prose answer is unaffected. Click Regenerate to bypass the cache and try again.' },
            { s: '"AI hours exhausted" mid-call.', c: 'Pool ran out and auto-topup is off.', f: 'Buy a top-up from /pricing, or enable auto-topup before the call so this never happens.' },
            { s: 'Cmd+B blanks the screen but doesn\'t unblank.', c: 'Focus is in another window.', f: 'Click the Camora window first, then press Cmd+B again.' },
          ]}
        />
      </section>
    </DocsPageLayout>
  );
}
