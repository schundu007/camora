import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function VoiceFilteringDocsPage() {
  return (
    <DocsPageLayout
      title="Voice filtering"
      description="Speaker verification — Camora records your voiceprint once, then transcribes only the interviewer's voice during a live session."
      path="/docs/voice-filtering"
      breadcrumbs={[{ label: 'Voice filtering' }]}
      onThisPage={[
        { id: 'why', label: 'Why this exists' },
        { id: 'enrollment', label: 'Enroll your voice' },
        { id: 'how-it-works', label: 'How it works' },
        { id: 'when-to-disable', label: 'When to disable it' },
        { id: 'troubleshooting', label: 'Troubleshooting' },
      ]}
    >
      <section id="why" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Why this exists</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          When Camora captures audio from your microphone (or a room mic that hears both of you),
          it picks up everything <em>you</em> say too. Without filtering, Sona would respond to
          your own answers &mdash; defeating the point. Voice filtering uses speaker verification
          to drop your voice from the transcription stream before it reaches Sona.
        </p>
      </section>

      <section id="enrollment" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Enroll your voice</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Open the Lumora settings panel and click <strong>Enroll My Voice</strong>. (The
            button is also surfaced in the AI Companion panel and in older session UIs.)</li>
          <li>Read the prompted sentence aloud once. About <strong>5 seconds</strong> of audio is
            enough &mdash; recording starts automatically and stops itself when finished.</li>
          <li>Camora extracts a 256-dimension voiceprint embedding (a numeric fingerprint &mdash;
            no raw audio is stored long-term) and saves it to your account.</li>
          <li>Filtering is enabled automatically once enrollment finishes &mdash; you don&apos;t have
            to flip a separate switch. The button now reads <strong>Filter On</strong>; click it to
            toggle off.</li>
        </ol>
        <DocsCallout variant="tip">
          Re-enroll if you have a cold or you&apos;ve changed mics &mdash; embedding similarity drops
          when input characteristics change. Click <strong>Remove Enrollment</strong>, then enroll
          again with the new mic.
        </DocsCallout>
        <DocsCallout variant="note">
          On the &ldquo;Room mic / any speaker&rdquo; capture method, voice enrollment + filter are
          required &mdash; without them, Sona would treat your own voice as the interviewer.
        </DocsCallout>
      </section>

      <section id="how-it-works" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How it works</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          For each audio chunk Camora captures, the speaker service:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Computes a speaker embedding for the chunk via <code>resemblyzer</code>.</li>
          <li>Compares cosine similarity to your enrolled voiceprint.</li>
          <li>For full-clip verification, similarity <strong>&gt; 0.75</strong> means the audio is
            yours &mdash; drop it. Otherwise it&apos;s the interviewer and gets transcribed.</li>
          <li>For longer clips with both speakers, Camora runs sliding-window diarization at
            similarity threshold <strong>0.55</strong> to label which segments are yours vs the
            interviewer, then drops the user-labelled segments before transcription.</li>
        </ol>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          For panel interviews with multiple non-you speakers, all of them get bucketed as
          &ldquo;interviewer&rdquo; &mdash; Camora doesn&apos;t separate panelists individually
          today.
        </p>
      </section>

      <section id="when-to-disable" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">When to disable it</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Pure system-audio capture</strong> &mdash; if Camora is only listening to system
            audio (Zoom loopback, tab share, virtual loopback), your mic isn&apos;t in the stream
            anyway, so filtering does nothing.</li>
          <li><strong>Solo practice</strong> &mdash; if you want Sona to respond to <em>your</em>
            questions for self-prep, turn the filter off.</li>
          <li><strong>Mismatch / cold</strong> &mdash; if Sona keeps missing the interviewer because
            your voiceprint is matching too aggressively, remove enrollment and re-enroll fresh.</li>
        </ul>
      </section>

      <section id="troubleshooting" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Troubleshooting</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>&ldquo;Sona is answering my voice&rdquo;</strong> &mdash; your voiceprint matched
            too loosely. Re-enroll with the same mic you&apos;re using for the live call.</li>
          <li><strong>&ldquo;Sona keeps missing the interviewer&rdquo;</strong> &mdash; your voiceprint
            is dropping too much. Try removing enrollment and using a clearer 5-second sample.</li>
          <li><strong>Filter auto-disables mid-call</strong> &mdash; after a long run of consecutive
            drops, Camora pauses the filter to keep the call moving. Re-enable from Settings if you
            still want it on.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
