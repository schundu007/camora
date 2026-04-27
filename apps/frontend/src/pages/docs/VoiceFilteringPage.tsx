import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';

export default function VoiceFilteringDocsPage() {
  return (
    <DocsPageLayout
      title="Voice filtering"
      description="Speaker verification — Camora records your voiceprint once, then transcribes only the interviewer's voice during a live session."
      path="/docs/voice-filtering"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Voice filtering' }]}
      onThisPage={[
        { id: 'why', label: 'Why this exists' },
        { id: 'enrollment', label: 'Voice enrollment' },
        { id: 'how-it-works', label: 'How it works' },
        { id: 'when-to-disable', label: 'When to disable it' },
      ]}
    >
      <section id="why" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Why this exists</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          When Camora captures audio from your microphone, it picks up everything you say too. Without
          filtering, Sona would respond to your own answers — defeating the point. Voice filtering uses
          speaker verification to drop your voice from the transcription stream before it reaches Sona.
        </p>
      </section>

      <section id="enrollment" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Voice enrollment</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Open Camora, click the <strong>Voice Enrollment</strong> button in the top bar.</li>
          <li>Read the prompted sentence aloud once. About 5 seconds of audio is enough.</li>
          <li>Camora extracts a voiceprint embedding (a numeric fingerprint, never raw audio storage) and saves it to your account.</li>
          <li>Click <strong>Voice filter on</strong> to enable filtering for this session.</li>
        </ol>
        <DocsCallout variant="tip">
          Re-enroll if you have a cold or you've changed mics — embedding similarity drops when input
          characteristics change.
        </DocsCallout>
      </section>

      <section id="how-it-works" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">How it works</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          For each audio chunk Camora captures, the AI services backend:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Computes a speaker embedding for the chunk.</li>
          <li>Compares cosine similarity to your enrolled voiceprint.</li>
          <li>If similarity is above the threshold (≥ 0.85), the chunk is yours — drop it.</li>
          <li>Otherwise, it's the interviewer — pass it to Whisper for transcription, then to Sona.</li>
        </ol>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          For sessions with multiple speakers (panel interview), Camora also runs diarization to separate
          two distinct non-you voices. The interviewer:candidate ratio is logged so you can review who
          spoke when in the post-call session view.
        </p>
      </section>

      <section id="when-to-disable" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">When to disable it</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>System audio capture</strong> — system audio doesn't include your mic, so filtering is unnecessary.</li>
          <li><strong>You're practicing alone</strong> — if you want Sona to respond to <em>your</em> questions for solo prep, turn the filter off.</li>
          <li><strong>Heavy accents / cold</strong> — if the model isn't recognizing your voice well, disable + re-enroll later.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
