import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function LumoraLivePage() {
  return (
    <DocsPageLayout
      title="Lumora Live Interview"
      description="Real-time AI assistance during a live Zoom / Meet / Teams interview — transcription, smart answers, and architecture diagrams as the interviewer asks questions."
      path="/docs/lumora-live"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Lumora Live' }]}
      onThisPage={[
        { id: 'before-the-call', label: 'Before the call' },
        { id: 'audio-setup', label: 'Audio setup' },
        { id: 'system-audio', label: 'System audio capture', depth: 1 },
        { id: 'voice-filter', label: 'Voice filtering', depth: 1 },
        { id: 'using-sona', label: 'Using Sona during the interview' },
        { id: 'screen-share-safety', label: 'Screen-share safety' },
        { id: 'after-the-call', label: 'After the call' },
      ]}
    >
      <section id="before-the-call" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Before the call</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Open <Link to="/lumora" className="text-[var(--accent)] underline">/lumora</Link> in a separate browser tab from your video call.</li>
          <li>Click <strong>Audio Check</strong> to verify mic + system audio permissions are granted.</li>
          <li>Pick the right tab — coding, system design, or behavioral — based on the interview type.</li>
          <li>Open your resume / job context pane so Sona can reference it during answers.</li>
        </ol>
      </section>

      <section id="audio-setup" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Audio setup</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Lumora needs to hear what your interviewer is saying. There are two ways to capture that audio:
        </p>

        <h3 id="system-audio" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">System audio capture</h3>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The cleanest path. Click the <strong>System Audio</strong> button in the Lumora top bar —
          Chrome will ask which tab/window to share audio from. Pick your Zoom / Meet / Teams window.
          Lumora transcribes only the interviewer's voice, never your microphone, so you don't echo back.
        </p>
        <DocsCallout variant="warning" label="Browser support">
          System audio capture requires Chrome (or Chromium-based browsers like Edge / Brave). Firefox and
          Safari don't support tab-audio capture as of 2026. The Camora Desktop app provides equivalent
          functionality on those platforms.
        </DocsCallout>

        <h3 id="voice-filter" className="text-xl font-bold mt-6 mb-3 scroll-mt-24">Voice filtering</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          For mic-based capture (no system audio), enable <strong>Voice filtering</strong>. Lumora records your
          voice once during enrollment, then only transcribes audio that <em>doesn't</em> match your voiceprint.
          See <Link to="/docs/voice-filtering" className="text-[var(--accent)] underline">Voice filtering</Link>{' '}
          for the full setup.
        </p>
      </section>

      <section id="using-sona" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Using Sona during the interview</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Sona is Camora's AI interviewer-helper. As the interviewer asks questions, Lumora transcribes
          them in the left panel; Sona's answer streams in the right panel. You can:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Coding tab</strong> — Sona produces a 3-approach solution with complexity analysis.</li>
          <li><strong>Design tab</strong> — Sona drafts the architecture, often with a generated diagram.</li>
          <li><strong>Behavioral tab</strong> — Sona writes a STAR-format response based on your resume.</li>
          <li><strong>Cmd+B</strong> — instantly blank the screen. Useful if the interviewer asks you to share.</li>
        </ul>
        <DocsCallout variant="tip">
          Sona is a thinking partner, not a robotic script reader. Use her output as a starting point — read
          it, internalize the structure, then answer in your own voice. Recruiters notice when candidates
          read AI text verbatim.
        </DocsCallout>
      </section>

      <section id="screen-share-safety" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Screen-share safety</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Lumora runs in a separate browser tab — share your <em>specific window</em> (e.g. CoderPad), not the full screen.</li>
          <li>If you're forced into full-screen share, hit <strong>Cmd+B</strong> to blank Lumora instantly.</li>
          <li>For maximum safety, use the <Link to="/docs/desktop" className="text-[var(--accent)] underline">Camora Desktop app</Link> — its window is invisible to screen capture by design.</li>
        </ul>
      </section>

      <section id="after-the-call" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">After the call</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Conversations are saved to <Link to="/lumora/sessions" className="text-[var(--accent)] underline">/lumora/sessions</Link>{' '}
          — review questions you struggled with, bookmark good answers, and feed them into your prep
          notes for next time.
        </p>
      </section>
    </DocsPageLayout>
  );
}
