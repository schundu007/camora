import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';
import DocsDiagram from '../../components/shared/docs/DocsDiagram';

const codeBlockStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '14px 16px',
  fontSize: 12.5,
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
  color: 'var(--text-primary)',
  overflowX: 'auto' as const,
  lineHeight: 1.55,
};

const inlineCodeStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 12.5,
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
};

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const sectionH4 = 'text-[15px] font-bold mt-5 mb-1.5 uppercase tracking-wide';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraLivePage() {
  return (
    <DocsPageLayout
      title="Lumora Live Interview"
      description="Architecture and operational reference for Lumora Live — the real-time AI interview assistant. Covers system design (HLD), component internals (LLD), domain model (DDD), and end-user setup."
      path="/docs/lumora-live"
      eyebrow="ARCHITECTURE & USER GUIDE"
      breadcrumbs={[{ label: 'Lumora Live' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'hld', label: 'High-Level Design' },
        { id: 'hld-context', label: 'System context', depth: 1 },
        { id: 'hld-components', label: 'Components', depth: 1 },
        { id: 'hld-request-flow', label: 'End-to-end request flow', depth: 1 },
        { id: 'hld-deployment', label: 'Deployment topology', depth: 1 },
        { id: 'lld', label: 'Low-Level Design' },
        { id: 'lld-audio', label: 'Audio capture pipeline', depth: 1 },
        { id: 'lld-vad', label: 'VAD and chunking', depth: 1 },
        { id: 'lld-voice-filter', label: 'Voice filtering', depth: 1 },
        { id: 'lld-transcription', label: 'Transcription service', depth: 1 },
        { id: 'lld-sona-stream', label: 'Sona answer stream', depth: 1 },
        { id: 'lld-diagram', label: 'Diagram generation', depth: 1 },
        { id: 'lld-blank', label: 'Blank-screen safety', depth: 1 },
        { id: 'ddd', label: 'Domain-Driven Design' },
        { id: 'ddd-contexts', label: 'Bounded contexts', depth: 1 },
        { id: 'ddd-aggregates', label: 'Aggregates and entities', depth: 1 },
        { id: 'ddd-events', label: 'Domain events', depth: 1 },
        { id: 'ddd-language', label: 'Ubiquitous language', depth: 1 },
        { id: 'data-model', label: 'Data model' },
        { id: 'ops', label: 'Operational notes' },
        { id: 'user-guide', label: 'User guide' },
      ]}
    >
      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="overview" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Overview</h2>
        <p className={bodyP} style={bodyColor}>
          Lumora Live is the real-time interview-assistance surface of Camora. While a candidate is on
          a Zoom / Meet / Teams call, Lumora captures the interviewer's audio, transcribes it, and
          streams a structured answer from <strong>Sona</strong> — Camora's interview-helper LLM
          persona — with sub-second perceived latency. Three answer modes are supported: coding,
          system design, and behavioral.
        </p>
        <p className={bodyP} style={bodyColor}>
          The product is paywalled — every Lumora route is wrapped in <code style={inlineCodeStyle}>PaidRoute</code>{' '}
          rather than the standard <code style={inlineCodeStyle}>ShellRoute</code>, so the Capra app shell does not
          render and the screen real estate is reserved entirely for the interview UI. The single
          page component <code style={inlineCodeStyle}>LumoraShellPage</code> handles all sub-routes;
          tab state is preserved across navigation by keeping each layout permanently mounted under{' '}
          <code style={inlineCodeStyle}>display: none</code> after first activation.
        </p>
        <DocsCallout variant="note" label="Audience for this page">
          The first three sections (HLD, LLD, DDD) target engineers and architects working on
          Lumora. The <Link to="#user-guide" className="text-[var(--accent)] underline">User guide</Link>{' '}
          at the bottom is the operator-facing how-to-use-it section.
        </DocsCallout>
      </section>

      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="hld" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>High-Level Design</h2>

        <h3 id="hld-context" className={sectionH3}>System context</h3>
        <p className={bodyP} style={bodyColor}>
          Lumora is a four-tier system. The browser hosts the capture and rendering surface. The
          Lumora backend (Express 5, Node 20) terminates auth, persists conversations, fronts
          transcription, and streams Sona's answer tokens over Server-Sent Events. A Python
          FastAPI service (<em>ai-services</em>) hosts speaker verification and architecture-diagram
          generation. External providers — Anthropic for answer streaming, OpenAI for Whisper
          transcription — sit behind the Lumora backend.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-live/system-context.png"
          alt="System context diagram showing the candidate's browser connecting to the Lumora frontend on Vercel and the Lumora backend on Railway, which calls AI services, Postgres, Anthropic, OpenAI, Stripe, and Google OAuth."
          label="Figure 1 — System context"
          caption="Camora-owned services (blue) sit inside the solid rounded boundary; external providers (Anthropic, OpenAI, Stripe, Google OAuth) sit in the dashed boundary. Each edge is labeled with the concrete protocol or route that crosses it."
        />
        <p className={bodyP} style={bodyColor}>
          Auth is shared with the Capra prep platform via the <code style={inlineCodeStyle}>cariara_sso</code> cookie
          (domain <code style={inlineCodeStyle}>.cariara.com</code>, 30-day TTL). The Lumora backend
          also accepts a Bearer token. On first request from a Capra-issued JWT it auto-creates the
          row in <code style={inlineCodeStyle}>users</code> with{' '}
          <code style={inlineCodeStyle}>provider=&apos;ascend_sso&apos;</code>, so a user who paid through
          ascend-backend can immediately use Lumora without a second sign-up.
        </p>

        <h3 id="hld-components" className={sectionH3}>Components</h3>
        <DocsTable
          columns={[
            { key: 'name', header: 'Component' },
            { key: 'tech', header: 'Stack' },
            { key: 'role', header: 'Responsibility' },
          ]}
          rows={[
            {
              name: 'Lumora Frontend',
              tech: 'React 19 + Vite 8 + Zustand + Tailwind 4',
              role: 'Audio capture (getUserMedia / getDisplayMedia), VAD chunking, multipart upload of audio chunks, SSE consumer for token streaming, conversation history rendering, Cmd+B blank-screen safety.',
            },
            {
              name: 'Lumora Backend',
              tech: 'Express 5 / Node 20 / pg pool',
              role: 'JWT auth, rate limiting, conversation + message persistence, transcription proxy with hallucination filter, Anthropic streaming with prompt-cache control, per-user quota and ai_hours metering.',
            },
            {
              name: 'AI Services',
              tech: 'FastAPI / Python 3.11 / resemblyzer + diagrams',
              role: 'Voice enrollment via resemblyzer (256-dim embeddings on disk), sliding-window diarization, Anthropic-driven Python diagram code generation, sandboxed subprocess execution to render PNG.',
            },
            {
              name: 'Anthropic API',
              tech: 'Claude Sonnet 4 / Haiku 4.5',
              role: 'Streaming answer generation. System prompt sent with cache_control: ephemeral so the 5-minute Anthropic prompt cache reduces TTFT on repeat questions.',
            },
            {
              name: 'OpenAI API',
              tech: 'whisper-1',
              role: 'Audio chunk → text transcription. Seeded with a technical-vocabulary prompt to reduce errors on terms like Kafka, Kubernetes, BFS.',
            },
            {
              name: 'Postgres',
              tech: 'shared via @camora/shared-db, SSL on Railway',
              role: 'lumora_conversations, lumora_messages, lumora_usage_logs, lumora_bookmarks, lumora_quotas, coding_usage, ai_hours_usage. Schema is migrated by inline CREATE TABLE IF NOT EXISTS on backend boot.',
            },
          ]}
        />

        <h3 id="hld-request-flow" className={sectionH3}>End-to-end request flow</h3>
        <p className={bodyP} style={bodyColor}>
          The hot path during a live interview is a continuous loop of <em>capture → transcribe →
          decide-to-answer → stream</em>. Each iteration takes between 0.8 s (cache-warm) and 3 s
          (cold), which is short enough that the candidate sees the answer flowing in while the
          interviewer is still talking.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-live/request-flow.png"
          alt="Five-phase request flow: capture in the browser, transcription on the Lumora backend with optional speaker diarization, debounced question gating in the browser, Sona answer streaming over SSE from the backend through Anthropic, and persistence + metering writes to Postgres."
          label="Figure 2 — End-to-end request flow"
          caption="The five phases each map to a distinct service boundary. Edges carry the actual protocol or library call that crosses the boundary — multipart upload, speaker diarization, ffmpeg + Whisper, debounced isQuestion, prompt-cached Anthropic stream, and the SSE token / answer events."
        />

        <h3 id="hld-deployment" className={sectionH3}>Deployment topology</h3>
        <DocsDiagram
          src="/diagrams/docs/lumora-live/deployment-topology.png"
          alt="Deployment topology with Vercel hosting the static frontend, three Railway services (lumora-backend, ascend-backend, ai-services), a managed Postgres instance, and external providers Anthropic, OpenAI, Stripe, Google OAuth."
          label="Figure 3 — Deployment topology"
          caption="Each Railway service lists its build runtime, listening port, and healthcheck path. The browser establishes HTTPS connections to Vercel and to both backends; Lumora-backend talks to ai-services over Railway's private network and to OpenAI / Anthropic over public HTTPS."
        />
        <DocsTable
          columns={[
            { key: 'svc', header: 'Service' },
            { key: 'host', header: 'Host' },
            { key: 'build', header: 'Build / runtime' },
            { key: 'health', header: 'Healthcheck' },
          ]}
          rows={[
            { svc: 'Frontend', host: 'Vercel (auto SPA)', build: 'Vite production build, static rewrite to /index.html', health: 'Vercel platform' },
            { svc: 'Lumora Backend', host: 'Railway', build: 'Nixpacks: nodejs_20 + ffmpeg', health: 'GET /health' },
            { svc: 'Ascend Backend', host: 'Railway', build: 'Nixpacks: nodejs_20 + python3 + graphviz + go + rustc + openjdk17', health: 'GET /health' },
            { svc: 'AI Services', host: 'Railway (Docker)', build: 'python:3.11-slim + graphviz + ffmpeg', health: 'GET /health' },
          ]}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="lld" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Low-Level Design</h2>

        <h3 id="lld-audio" className={sectionH3}>Audio capture pipeline</h3>
        <p className={bodyP} style={bodyColor}>
          Two capture paths exist; both produce <code style={inlineCodeStyle}>audio/webm;codecs=opus</code> via{' '}
          <code style={inlineCodeStyle}>MediaRecorder</code>. The implementation lives in{' '}
          <code style={inlineCodeStyle}>apps/frontend/src/components/lumora/audio/AudioCapture.tsx</code>{' '}
          and the hook <code style={inlineCodeStyle}>hooks/useAudioCapture.ts</code>.
        </p>
        <h4 className={sectionH4}>Path A — System audio (preferred)</h4>
        <p className={bodyP} style={bodyColor}>
          Calls <code style={inlineCodeStyle}>navigator.mediaDevices.getDisplayMedia(&#123; audio: &#123; suppressLocalAudioPlayback: false &#125;, systemAudio: &apos;include&apos; &#125;)</code>.
          Chrome shows the tab/window picker; the candidate selects their Zoom/Meet/Teams window.
          Only the interviewer's voice is captured — the candidate's own mic is not part of the
          stream, which eliminates self-echo and removes the need for voice filtering on this path.
        </p>
        <h4 className={sectionH4}>Path B — Microphone</h4>
        <p className={bodyP} style={bodyColor}>
          Falls back to <code style={inlineCodeStyle}>getUserMedia(&#123; audio: &#123; echoCancellation: true, noiseSuppression: true, autoGainControl: true &#125; &#125;)</code>{' '}
          for browsers that cannot capture tab audio (Firefox, Safari) or when the candidate prefers
          a single-input setup. This path requires <Link to="#lld-voice-filter" className="text-[var(--accent)] underline">voice filtering</Link>{' '}
          to avoid transcribing the candidate's own speech.
        </p>

        <h3 id="lld-vad" className={sectionH3}>VAD and chunking</h3>
        <p className={bodyP} style={bodyColor}>
          A Web Audio <code style={inlineCodeStyle}>AnalyserNode</code> with <code style={inlineCodeStyle}>fftSize = 256</code>{' '}
          computes RMS energy across frequency bins on a 100 ms loop. The state machine has three
          parameters configurable through the Zustand store:
        </p>
        <DocsTable
          columns={[
            { key: 'param', header: 'Parameter' },
            { key: 'def', header: 'Default' },
            { key: 'role', header: 'What it gates' },
          ]}
          rows={[
            { param: 'silenceThreshold', def: '0.015 (live), clamped ≥ 0.003', role: 'RMS below this counts as silence. Below 0.003 the threshold is too low to ever leave silence on a noisy mic.' },
            { param: 'minSpeechDuration', def: '300 ms (live)', role: 'Speech must stay above threshold this long before the chunk is considered "real" — avoids triggering on a cough.' },
            { param: 'silenceTimeout', def: '800 ms (live), 1500 ms (manual)', role: 'After speech, this much silence ends the chunk and triggers upload.' },
            { param: 'maxChunkDuration', def: '5000 ms (live), 30000 ms (manual)', role: 'Hard cap so a long monologue is sliced into Whisper-friendly pieces.' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          When a chunk closes, it is uploaded as <code style={inlineCodeStyle}>multipart/form-data</code>{' '}
          to <code style={inlineCodeStyle}>POST /api/v1/transcribe</code> with two fields:{' '}
          <code style={inlineCodeStyle}>file</code> (the Blob) and{' '}
          <code style={inlineCodeStyle}>filter_user_voice</code> (string <code style={inlineCodeStyle}>&quot;true&quot;</code>{' '}
          or <code style={inlineCodeStyle}>&quot;false&quot;</code>). No WebSocket, no SSE — a plain
          POST per chunk. Continuous-mode transcription accumulates chunk text in a ref; a debounce
          calls <code style={inlineCodeStyle}>isQuestion()</code> from{' '}
          <code style={inlineCodeStyle}>src/lib/questionDetector.ts</code> and only flushes to
          the LLM when the buffer looks like a complete question. This is the gate that prevents
          half-sentences from burning Anthropic tokens.
        </p>

        <h3 id="lld-voice-filter" className={sectionH3}>Voice filtering</h3>
        <p className={bodyP} style={bodyColor}>
          Path B (mic capture) needs to skip transcribing the candidate's own voice. The flow has
          two phases: a one-time enrollment, then per-chunk filtering on every upload.
        </p>
        <h4 className={sectionH4}>Enrollment</h4>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>Candidate records 5–10 seconds of speech.</li>
          <li>
            Frontend posts the blob to{' '}
            <code style={inlineCodeStyle}>POST /api/v1/speaker/enroll</code> on the Lumora backend.
          </li>
          <li>
            Backend <code style={inlineCodeStyle}>routes/speaker.js</code> ffmpeg-converts the blob to 16 kHz mono WAV
            and proxies to <code style={inlineCodeStyle}>POST &#123;AI_SERVICES_URL&#125;/speaker/enroll</code>.
          </li>
          <li>
            <code style={inlineCodeStyle}>ai-services/speaker.py</code> calls{' '}
            <code style={inlineCodeStyle}>VoiceEncoder().embed_utterance(wav)</code> from{' '}
            <code style={inlineCodeStyle}>resemblyzer</code> — a 256-dim float32 embedding — and saves
            it to <code style={inlineCodeStyle}>/data/embeddings/&#123;user_id&#125;.npy</code>.
          </li>
        </ol>
        <h4 className={sectionH4}>Per-chunk diarization</h4>
        <p className={bodyP} style={bodyColor}>
          When <code style={inlineCodeStyle}>filter_user_voice=true</code>, the transcription route
          calls <code style={inlineCodeStyle}>diarizeSpeaker()</code> before hitting Whisper.
          The diarizer slides a 1.6 s window across the chunk with a 0.8 s hop, computes cosine
          similarity against the stored embedding for each window, and labels each window{' '}
          <code style={inlineCodeStyle}>candidate</code> (similarity ≥ 0.70) or{' '}
          <code style={inlineCodeStyle}>interviewer</code> (similarity &lt; 0.70). It returns{' '}
          <code style={inlineCodeStyle}>&#123; should_transcribe, interviewer_ratio, segments &#125;</code>.
          The chunk is forwarded to Whisper only when{' '}
          <code style={inlineCodeStyle}>interviewer_ratio &gt; 0.15</code> — i.e. at least 15% of the
          windows didn't match the candidate's voice.
        </p>
        <DocsCallout variant="warning" label="Threshold trade-off">
          Tightening the 0.15 ratio reduces false-positive transcription of the candidate but starts
          dropping interjections from the interviewer that overlap with the candidate's speech.
          The current value was tuned for one-on-one interviews with minimal cross-talk; panel
          interviews with multiple voices need a different threshold or a multi-speaker enrollment.
        </DocsCallout>

        <h3 id="lld-transcription" className={sectionH3}>Transcription service</h3>
        <p className={bodyP} style={bodyColor}>
          <code style={inlineCodeStyle}>POST /api/v1/transcribe</code> middleware chain:{' '}
          <code style={inlineCodeStyle}>authenticate → multer.single(&apos;file&apos;) (10 MB, memoryStorage) → handler</code>.
          Handler steps:
        </p>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            <code style={inlineCodeStyle}>checkLimit(userId, &apos;questions&apos;)</code> — quota gate against{' '}
            <code style={inlineCodeStyle}>lumora_quotas</code>.
          </li>
          <li>
            If filtering is enabled, dispatch to ai-services diarization with a 10-second{' '}
            <code style={inlineCodeStyle}>AbortSignal</code> timeout.
          </li>
          <li>
            <code style={inlineCodeStyle}>transcribe(file.buffer, filename)</code> — writes the buffer to{' '}
            <code style={inlineCodeStyle}>tempfile</code>, runs{' '}
            <code style={inlineCodeStyle}>ffmpeg -ar 16000 -ac 1 -f wav</code>, then calls{' '}
            <code style={inlineCodeStyle}>openai.audio.transcriptions.create(&#123; model: &apos;whisper-1&apos;, language: &apos;en&apos;, prompt: TECHNICAL_PROMPT &#125;)</code>.
            The technical prompt seeds Whisper with vocabulary like Kafka, Kubernetes, BFS, p99 to
            reduce errors on technical terms.
          </li>
          <li>
            Hallucination filter — strips Whisper's known phantom phrases ("thank you for watching",
            "subscribe to my channel", etc.) before returning.
          </li>
          <li>
            Returns <code style={inlineCodeStyle}>&#123; text, latency_ms, skipped, reason &#125;</code>.{' '}
            <code style={inlineCodeStyle}>skipped: true</code> happens when diarization concluded the
            chunk was the candidate's own voice.
          </li>
        </ol>

        <h3 id="lld-sona-stream" className={sectionH3}>Sona answer stream</h3>
        <p className={bodyP} style={bodyColor}>
          Two endpoints both serve Sona: <code style={inlineCodeStyle}>POST /api/v1/stream</code> (start a new
          conversation) and <code style={inlineCodeStyle}>POST /api/v1/inference/conversations/:id/stream</code>{' '}
          (continue an existing one). The shape is Server-Sent Events with named events.
        </p>
        <h4 className={sectionH4}>Backend lifecycle</h4>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            <code style={inlineCodeStyle}>checkUsage(&apos;questions&apos;)</code> middleware. Free-tier users additionally
            pass <code style={inlineCodeStyle}>checkDailyFreeLimit</code>.
          </li>
          <li>
            On the continue path, load the last 12 messages from{' '}
            <code style={inlineCodeStyle}>lumora_messages</code> for context.
          </li>
          <li>
            Set SSE headers — including{' '}
            <code style={inlineCodeStyle}>X-Accel-Buffering: no</code> so Railway's nginx-style proxy
            does not buffer the stream.
          </li>
          <li>
            Pick a model. Behavioral and free-tier requests get{' '}
            <code style={inlineCodeStyle}>claude-haiku-4-5-20251001</code>; paid coding/design requests get{' '}
            <code style={inlineCodeStyle}>claude-sonnet-4-20250514</code>. Quick mode caps at{' '}
            <code style={inlineCodeStyle}>MAX_TOKENS_QUICK = 2000</code>; design mode raises that to{' '}
            <code style={inlineCodeStyle}>MAX_TOKENS_DESIGN = 12000</code>; the copilot sidebar with
            the <code style={inlineCodeStyle}>[SHORT]</code> prefix caps at 1200.
          </li>
          <li>
            The system prompt is sent as a content block with{' '}
            <code style={inlineCodeStyle}>cache_control: &#123; type: &apos;ephemeral&apos; &#125;</code>{' '}
            — it persists in Anthropic's prompt cache for 5 minutes, so the second question of an
            interview pays a fraction of the first request's input tokens and arrives much faster.
          </li>
          <li>
            For each Anthropic <code style={inlineCodeStyle}>text_delta</code> the backend writes one
            SSE frame: <code style={inlineCodeStyle}>event: token</code> /{' '}
            <code style={inlineCodeStyle}>data: &#123; t: &quot;...&quot; &#125;</code>. Sequence:{' '}
            <code style={inlineCodeStyle}>status</code> →{' '}
            <code style={inlineCodeStyle}>stream_start</code> →{' '}
            <code style={inlineCodeStyle}>token*</code> →{' '}
            <code style={inlineCodeStyle}>answer</code> (full parsed payload) →{' '}
            <code style={inlineCodeStyle}>message_saved</code> →{' '}
            <code style={inlineCodeStyle}>done</code>.
          </li>
          <li>
            On the <code style={inlineCodeStyle}>answer</code> event the backend persists both the
            user message and the assistant message to <code style={inlineCodeStyle}>lumora_messages</code>,
            inserts a row into <code style={inlineCodeStyle}>lumora_usage_logs</code>, and calls{' '}
            <code style={inlineCodeStyle}>aiHoursMeter.recordTokens(...)</code> to write to{' '}
            <code style={inlineCodeStyle}>ai_hours_usage</code> — the surface used by the billing dashboard.
          </li>
          <li>
            If the client disconnects mid-stream, the route's{' '}
            <code style={inlineCodeStyle}>req.on(&apos;close&apos;)</code> handler fires the{' '}
            <code style={inlineCodeStyle}>AbortController</code> passed into the Anthropic stream,
            stopping further token billing immediately.
          </li>
        </ol>
        <h4 className={sectionH4}>Frontend SSE consumer</h4>
        <p className={bodyP} style={bodyColor}>
          The browser-side parser is hand-rolled in <code style={inlineCodeStyle}>src/lib/sse-client.ts</code>{' '}
          using <code style={inlineCodeStyle}>fetch + response.body.getReader()</code>. There is
          deliberately no <code style={inlineCodeStyle}>EventSource</code> object, because{' '}
          <code style={inlineCodeStyle}>EventSource</code> cannot send a POST body — Lumora needs to
          ship the question text in the request, so it parses the SSE protocol itself: split on{' '}
          <code style={inlineCodeStyle}>\n</code>, accumulate <code style={inlineCodeStyle}>event:</code>{' '}
          and <code style={inlineCodeStyle}>data:</code> lines, fire the named callback on a blank-line
          boundary. The Zustand store (<code style={inlineCodeStyle}>src/stores/interview-store.ts</code>){' '}
          maintains both a <code style={inlineCodeStyle}>streamChunks: string[]</code> array (for
          progressive parsing of <code style={inlineCodeStyle}>[HEADLINE] / [ANSWER] / [CODE]</code>{' '}
          tagged sections) and a flat <code style={inlineCodeStyle}>streamText</code> accumulator
          (for the simple sidebar render).
        </p>

        <h3 id="lld-diagram" className={sectionH3}>Diagram generation</h3>
        <p className={bodyP} style={bodyColor}>
          <code style={inlineCodeStyle}>POST /api/v1/diagram/generate</code> on the Lumora backend
          fronts an in-memory LRU (200 entries, 24 h TTL) before delegating to{' '}
          <code style={inlineCodeStyle}>ai-services/diagram.py</code>. The Python service:
        </p>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            Builds a prompt with provider-scoped imports (e.g.{' '}
            <code style={inlineCodeStyle}>from diagrams.aws.compute import EC2, ECS</code>).
          </li>
          <li>
            Calls Anthropic (<code style={inlineCodeStyle}>claude-sonnet-4-20250514</code>, 4096 max
            tokens) to generate Python code that uses the{' '}
            <code style={inlineCodeStyle}>diagrams</code> library.
          </li>
          <li>
            Runs the code through a sanitizer that blocks dangerous tokens. The matcher uses
            string-stripping + word-boundary regex so legitimate node labels like{' '}
            <code style={inlineCodeStyle}>&quot;WebSocket connections&quot;</code> don't false-positive against
            a bare <code style={inlineCodeStyle}>socket</code> substring.
          </li>
          <li>
            Executes the code in a <code style={inlineCodeStyle}>tempfile.TemporaryDirectory()</code>{' '}
            via <code style={inlineCodeStyle}>subprocess.run([sys.executable, script_path])</code>{' '}
            with a 60-second timeout. Graphviz renders the PNG.
          </li>
          <li>
            Returns <code style={inlineCodeStyle}>&#123; image: base64(png), code: str &#125;</code>{' '}
            so the cache can be served by the Lumora backend without round-tripping the subprocess
            for repeat questions.
          </li>
        </ol>
        <DocsCallout variant="caution" label="Hard rule on diagrams">
          Architecture diagrams are <strong>always</strong> Graphviz-rendered PNGs from the cache.
          Lumora and Capra never hand-code SVG box-and-arrow diagrams and never use Mermaid.js for
          live diagram rendering — those approaches were tried and rejected for visual fidelity.
        </DocsCallout>

        <h3 id="lld-blank" className={sectionH3}>Blank-screen safety</h3>
        <p className={bodyP} style={bodyColor}>
          <code style={inlineCodeStyle}>LumoraShellPage</code> registers a window-level{' '}
          <code style={inlineCodeStyle}>keydown</code> listener for <code style={inlineCodeStyle}>metaKey + b</code>{' '}
          (and Ctrl+B on Windows/Linux). Toggling sets <code style={inlineCodeStyle}>blanked</code>{' '}
          state, which renders a <code style={inlineCodeStyle}>fixed inset-0 z-[9999]</code> black
          overlay over the entire shell. Audio capture and SSE streaming continue under the
          overlay — only the visual layer is hidden — so when the candidate toggles back, no
          context has been lost. The desktop Electron build adds a stronger guarantee: the window
          itself is invisible to screen capture by design, so even a full-screen share never reveals
          Lumora.
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="ddd" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Domain-Driven Design</h2>

        <h3 id="ddd-contexts" className={sectionH3}>Bounded contexts</h3>
        <p className={bodyP} style={bodyColor}>
          Lumora Live is best understood as six bounded contexts, each owning its own data and
          publishing events the others consume. The boundaries are reflected in the code structure
          — every context maps cleanly to a directory under{' '}
          <code style={inlineCodeStyle}>apps/lumora-backend/src</code> or a hook under{' '}
          <code style={inlineCodeStyle}>apps/frontend/src</code>.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-live/bounded-contexts.png"
          alt="Six bounded contexts — Capture, Voice Identity, Transcription, Inference, Conversation, Metering — connected by named domain events showing the direction of communication and the payload schema on each event."
          label="Figure 4 — Bounded contexts and domain events"
          caption="Each context is color-coded by domain (Capture in blue, Voice Identity in violet, Transcription in green, Inference in amber, Conversation in light blue, Metering in gold). Solid color is the context surface; dashed arrows are domain events with their payload contract. Note the back-pressure path — Metering can publish QuotaExceeded which short-circuits Inference and Transcription with a 429."
        />
        <DocsTable
          columns={[
            { key: 'ctx', header: 'Context' },
            { key: 'owns', header: 'Owns' },
            { key: 'pub', header: 'Publishes' },
            { key: 'sub', header: 'Subscribes to' },
          ]}
          rows={[
            {
              ctx: 'Capture',
              owns: 'getUserMedia / getDisplayMedia stream, MediaRecorder, VAD state machine, accumulated transcript ref',
              pub: 'AudioChunkProduced, ChunkBoundaryDetected, QuestionLikelyComplete',
              sub: '— (root context)',
            },
            {
              ctx: 'Transcription',
              owns: 'Multipart upload, ffmpeg normalization, Whisper invocation, hallucination filter',
              pub: 'ChunkTranscribed (with text + latency_ms + skipped flag)',
              sub: 'AudioChunkProduced',
            },
            {
              ctx: 'Voice Identity',
              owns: 'resemblyzer embedding storage, enrollment lifecycle, sliding-window diarization',
              pub: 'VoiceEnrolled, VoiceUnenrolled, ChunkClassified',
              sub: 'AudioChunkProduced (when filter is on)',
            },
            {
              ctx: 'Inference',
              owns: 'Model selection, system prompt + cache_control, Anthropic streaming generator, AbortController',
              pub: 'AnswerStarted, TokenStreamed, AnswerCompleted, AnswerAborted',
              sub: 'QuestionLikelyComplete',
            },
            {
              ctx: 'Conversation',
              owns: 'lumora_conversations + lumora_messages, last-12 context loader, bookmarks, archive flag',
              pub: 'MessagePersisted, ConversationArchived, BookmarkCreated',
              sub: 'AnswerCompleted',
            },
            {
              ctx: 'Metering',
              owns: 'lumora_quotas, lumora_usage_logs, ai_hours_usage, free-tier daily limit, monthly token + request limits',
              pub: 'QuotaExceeded, UsageRecorded',
              sub: 'AnswerCompleted, ChunkTranscribed',
            },
          ]}
        />

        <h3 id="ddd-aggregates" className={sectionH3}>Aggregates and entities</h3>
        <p className={bodyP} style={bodyColor}>
          The <strong>Conversation</strong> aggregate is the only one that crosses tables. A
          <code style={inlineCodeStyle}> Conversation</code> entity owns an ordered list of{' '}
          <code style={inlineCodeStyle}>Message</code> entities and a small set of derived
          read-models (latest-12 cache, last-activity timestamp). The aggregate root enforces two
          invariants: every message must alternate{' '}
          <code style={inlineCodeStyle}>role: &apos;user&apos; | &apos;assistant&apos;</code> in
          insertion order, and the conversation cannot accept new messages once{' '}
          <code style={inlineCodeStyle}>is_archived = true</code>.
        </p>
        <DocsTable
          columns={[
            { key: 'agg', header: 'Aggregate' },
            { key: 'root', header: 'Root entity' },
            { key: 'parts', header: 'Parts / value objects' },
            { key: 'inv', header: 'Invariants' },
          ]}
          rows={[
            {
              agg: 'Conversation',
              root: 'Conversation (lumora_conversations.id)',
              parts: 'Message[] (lumora_messages), Bookmark[] (lumora_bookmarks), MessageMetadata (parsed, tokens, latency)',
              inv: 'Roles alternate user/assistant in order; archive disallows new messages; bookmark.message_id must reference a message in the same conversation.',
            },
            {
              agg: 'VoiceProfile',
              root: 'VoiceProfile (per user_id)',
              parts: 'Embedding (256-dim float32, on-disk .npy), enrollment timestamp',
              inv: 'At most one embedding per user; embedding is opaque — never returned to the client; ffmpeg-normalized 16 kHz mono WAV is the only enrollment format.',
            },
            {
              agg: 'UsageQuota',
              root: 'UsageQuota (lumora_quotas, one row per user)',
              parts: 'monthly_tokens_used, monthly_tokens_limit, monthly_requests_used, monthly_requests_limit, reset_date',
              inv: 'Counters never decrement except at reset_date; checkLimit() is the only writer; reset_date advances exactly one calendar month at a time.',
            },
            {
              agg: 'TranscriptChunk',
              root: 'TranscriptChunk (in-memory only)',
              parts: 'audio Blob, capture window [start, end], filter_user_voice flag, diarization result',
              inv: 'Lifetime is bounded by a single HTTP request; never persisted; audio buffer is freed after Whisper call.',
            },
          ]}
        />

        <h3 id="ddd-events" className={sectionH3}>Domain events</h3>
        <p className={bodyP} style={bodyColor}>
          Lumora's events are not yet on a message bus — they are in-process callbacks today. The
          discipline of naming and emitting them is what keeps the contexts decoupled and is what
          will let the system grow into Kafka or a similar substrate later without rewiring the
          domain.
        </p>
        <DocsTable
          columns={[
            { key: 'evt', header: 'Event' },
            { key: 'src', header: 'Emitter' },
            { key: 'cons', header: 'Consumer(s)' },
            { key: 'payload', header: 'Payload (essential fields)' },
          ]}
          rows={[
            { evt: 'AudioChunkProduced', src: 'Capture (browser MediaRecorder ondataavailable)', cons: 'Transcription, Voice Identity', payload: '{ blob, chunkId, capturedAt, durationMs, filterUserVoice }' },
            { evt: 'ChunkClassified', src: 'Voice Identity (ai-services /speaker/diarize)', cons: 'Transcription gate', payload: '{ chunkId, interviewerRatio, segments[], shouldTranscribe }' },
            { evt: 'ChunkTranscribed', src: 'Transcription (Whisper)', cons: 'Capture (accumulator), Inference gate', payload: '{ chunkId, text, latencyMs, skipped, reason? }' },
            { evt: 'QuestionLikelyComplete', src: 'Capture (debounced isQuestion check)', cons: 'Inference', payload: '{ accumulatedText, mode: coding | design | behavioral }' },
            { evt: 'AnswerStarted', src: 'Inference', cons: 'UI (StreamingAnswer), Metering (start clock)', payload: '{ conversationId, mode, model, promptCached: bool }' },
            { evt: 'TokenStreamed', src: 'Inference (per Anthropic text_delta)', cons: 'UI (appendStreamChunk)', payload: '{ t: string }' },
            { evt: 'AnswerCompleted', src: 'Inference', cons: 'Conversation (persist), Metering (record tokens + ai_hours)', payload: '{ conversationId, fullAnswer, parsedSections, inputTokens, outputTokens, latencyMs }' },
            { evt: 'AnswerAborted', src: 'Inference (req.on close)', cons: 'Metering (record partial usage), UI (stop spinner)', payload: '{ conversationId, partialText, reason: client_disconnect }' },
            { evt: 'QuotaExceeded', src: 'Metering', cons: 'API gateway (block subsequent requests with 429)', payload: '{ userId, dimension: tokens | requests, limit, used }' },
            { evt: 'BookmarkCreated', src: 'Conversation', cons: 'UI (sessions panel), Metering (no-op)', payload: '{ bookmarkId, conversationId, messageId, note }' },
          ]}
        />

        <h3 id="ddd-language" className={sectionH3}>Ubiquitous language</h3>
        <DocsTable
          columns={[
            { key: 'term', header: 'Term' },
            { key: 'meaning', header: 'Meaning in Lumora' },
            { key: 'do-not', header: 'Don’t confuse with' },
          ]}
          rows={[
            { term: 'Sona', meaning: 'The AI interviewer-helper persona. Renders with the SonaAvatar component everywhere.', 'do-not': '"Assistant", "Icicle", a generic star icon. The brand name is Sona.' },
            { term: 'Candidate', meaning: 'The Lumora user being interviewed. The voiceprint enrollment subject.', 'do-not': 'Whoever happens to be talking — that’s "speaker".' },
            { term: 'Interviewer', meaning: 'Anyone whose voice is NOT the candidate’s during the interview.', 'do-not': 'A formally-modelled user — Lumora has no interviewer account.' },
            { term: 'Voiceprint / Embedding', meaning: 'The 256-dim resemblyzer vector stored on disk. Opaque to clients.', 'do-not': 'The raw enrollment audio (which is not retained after embedding).' },
            { term: 'Chunk', meaning: 'A single VAD-bounded audio slice. The atomic unit of transcription.', 'do-not': 'A "message" — a chunk produces text but the chunk itself is never persisted.' },
            { term: 'Question', meaning: 'A complete utterance from the interviewer that warrants an LLM call.', 'do-not': 'A single chunk’s text — most chunks are mid-question fragments.' },
            { term: 'Answer', meaning: 'Sona’s structured response: HEADLINE + ANSWER + CODE/DIAGRAM + complexity.', 'do-not': 'A single token — answers are accumulated from many TokenStreamed events.' },
            { term: 'Conversation', meaning: 'The persisted thread of question/answer pairs. One per session, per mode.', 'do-not': 'A "session" — sessions are unauth’d UI state, conversations are the auth’d row.' },
            { term: 'Quota', meaning: 'Monthly hard limits on tokens and requests held in lumora_quotas.', 'do-not': 'The free-tier daily limit, which is a per-day soft gate enforced separately.' },
            { term: 'AI Hours', meaning: 'A normalized usage unit recorded to ai_hours_usage for billing.', 'do-not': '"Tokens" — AI Hours are the customer-facing unit; tokens are the input.' },
          ]}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="data-model" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Data model</h2>
        <p className={bodyP} style={bodyColor}>
          All Lumora tables are migrated by inline{' '}
          <code style={inlineCodeStyle}>CREATE TABLE IF NOT EXISTS</code> in{' '}
          <code style={inlineCodeStyle}>apps/lumora-backend/src/index.js</code> on every boot.
          There is no migration tool; new columns ship as{' '}
          <code style={inlineCodeStyle}>ALTER TABLE … ADD COLUMN IF NOT EXISTS</code>.
        </p>
        <h4 className={sectionH4}>lumora_conversations</h4>
        <DocsTable
          columns={[
            { key: 'col', header: 'Column' },
            { key: 'type', header: 'Type' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { col: 'id', type: 'UUID PK', notes: 'gen_random_uuid()' },
            { col: 'user_id', type: 'INTEGER', notes: 'FK → users(id) ON DELETE CASCADE' },
            { col: 'title', type: 'VARCHAR(500)', notes: 'Auto-derived from the first user message' },
            { col: 'is_archived', type: 'BOOLEAN', notes: 'Default false; archived conversations cannot accept new messages' },
            { col: 'created_at / updated_at', type: 'TIMESTAMPTZ', notes: 'updated_at advances on every new message' },
            { col: 'idx_lumora_conversations_user', type: 'INDEX', notes: 'on (user_id) — list view query' },
          ]}
        />
        <h4 className={sectionH4}>lumora_messages</h4>
        <DocsTable
          columns={[
            { key: 'col', header: 'Column' },
            { key: 'type', header: 'Type' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { col: 'id', type: 'UUID PK', notes: '' },
            { col: 'conversation_id', type: 'UUID', notes: 'FK → lumora_conversations ON DELETE CASCADE' },
            { col: 'role', type: 'VARCHAR(20)', notes: "'user' | 'assistant'" },
            { col: 'content', type: 'TEXT', notes: 'Raw user text or full Sona answer' },
            { col: 'metadata', type: 'JSONB', notes: '{ parsed, is_design, is_coding, input_tokens, output_tokens, latency_ms }' },
            { col: 'created_at', type: 'TIMESTAMPTZ', notes: '' },
            { col: 'idx_lumora_messages_conv', type: 'INDEX', notes: 'on (conversation_id) — context-load query' },
          ]}
        />
        <h4 className={sectionH4}>lumora_quotas</h4>
        <DocsTable
          columns={[
            { key: 'col', header: 'Column' },
            { key: 'type', header: 'Type' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { col: 'id', type: 'UUID PK', notes: '' },
            { col: 'user_id', type: 'INTEGER UNIQUE', notes: 'One row per user' },
            { col: 'monthly_tokens_limit', type: 'INTEGER', notes: 'Default 100000' },
            { col: 'monthly_tokens_used', type: 'INTEGER', notes: 'Reset on reset_date' },
            { col: 'monthly_requests_limit', type: 'INTEGER', notes: 'Default 500' },
            { col: 'monthly_requests_used', type: 'INTEGER', notes: 'Reset on reset_date' },
            { col: 'reset_date', type: 'TIMESTAMPTZ', notes: 'Advances exactly one calendar month at a time' },
          ]}
        />
        <h4 className={sectionH4}>lumora_usage_logs / lumora_bookmarks / coding_usage / ai_hours_usage</h4>
        <DocsTable
          columns={[
            { key: 't', header: 'Table' },
            { key: 'cols', header: 'Columns' },
            { key: 'idx', header: 'Indexes' },
            { key: 'use', header: 'Used by' },
          ]}
          rows={[
            { t: 'lumora_usage_logs', cols: 'id UUID, user_id, endpoint, question_type, tokens_used, latency_ms, success, error_message, created_at', idx: '(user_id), (created_at)', use: 'Audit + per-endpoint analytics' },
            { t: 'lumora_bookmarks', cols: 'id UUID, user_id, conversation_id, message_id, note, created_at', idx: '(user_id)', use: 'Saved-answer surface in /lumora/sessions' },
            { t: 'coding_usage', cols: 'id UUID, user_id, language, input_tokens, output_tokens, latency_ms, created_at', idx: '(user_id, created_at)', use: 'Coding-tab daily usage chart' },
            { t: 'ai_hours_usage', cols: 'user_id, surface, started_at, ended_at, seconds, tokens_in, tokens_out, model, plan_at_charge, metered_to_stripe, team_id', idx: '(user_id, surface)', use: 'Cross-product billing rollup; surface enum includes lumora_transcribe and lumora_inference' },
          ]}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="ops" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Operational notes</h2>
        <h4 className={sectionH4}>Rate limits (per IP)</h4>
        <DocsTable
          columns={[
            { key: 'tier', header: 'Tier' },
            { key: 'limit', header: 'Limit' },
            { key: 'applies', header: 'Applies to' },
          ]}
          rows={[
            { tier: 'authLimiter', limit: '10 / 15 min', applies: '/api/v1/auth/*' },
            { tier: 'apiLimiter', limit: '60 / min', applies: '/api/v1/conversations, /api/v1/documents' },
            { tier: 'aiLimiter', limit: '20 / min', applies: '/api/v1/inference, /api/v1/stream, /api/v1/coding, /api/v1/transcribe, /api/v1/speaker, /api/v1/diagram' },
            { tier: 'paymentLimiter', limit: '20 / hr', applies: '/api/v1/billing' },
          ]}
        />
        <h4 className={sectionH4}>Resilience</h4>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            <strong>aiServiceProxy</strong> wraps all calls to ai-services with a 30 s{' '}
            <code style={inlineCodeStyle}>AbortSignal.timeout</code>, two exponential-backoff retries
            on 5xx, and a circuit breaker that opens after 5 consecutive failures and stays open for
            30 seconds.
          </li>
          <li>
            <strong>Transcription</strong> bypasses the proxy and calls ai-services directly with a
            10-second timeout for diarization — the budget for the synchronous critical path.
          </li>
          <li>
            <strong>Anthropic stream</strong> uses an <code style={inlineCodeStyle}>AbortController</code>{' '}
            tied to <code style={inlineCodeStyle}>req.on(&apos;close&apos;)</code>, so a client navigating away
            stops the upstream stream within milliseconds.
          </li>
          <li>
            <strong>Diagram subprocess</strong> runs with a 60-second wall-clock timeout in a fresh
            <code style={inlineCodeStyle}> tempfile.TemporaryDirectory()</code>; the LRU cache absorbs
            repeats so the subprocess only fires on first miss.
          </li>
        </ul>
        <h4 className={sectionH4}>Observability</h4>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            <code style={inlineCodeStyle}>lumora_usage_logs</code> records every inference call with{' '}
            <code style={inlineCodeStyle}>endpoint</code>, <code style={inlineCodeStyle}>question_type</code>,{' '}
            <code style={inlineCodeStyle}>tokens_used</code>, <code style={inlineCodeStyle}>latency_ms</code>,{' '}
            <code style={inlineCodeStyle}>success</code>, <code style={inlineCodeStyle}>error_message</code>.
          </li>
          <li>
            <code style={inlineCodeStyle}>requestLogger</code> middleware emits a per-request structured log
            with method, path, status, duration, and userId.
          </li>
          <li>
            Whisper hallucinations are observable as a non-empty{' '}
            <code style={inlineCodeStyle}>reason</code> field on the transcribe response and a
            specific marker in the usage log.
          </li>
        </ul>
      </section>

      {/* ─────────────────────────────────────────────────────────────── */}
      <section id="user-guide" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>User guide</h2>
        <p className={bodyP} style={bodyColor}>
          Everything below is the operator-facing how-to for candidates using Lumora during a real
          interview. Read the architecture sections above if you want to know <em>how</em> any of
          this works under the hood.
        </p>
        <h3 id="user-before" className={sectionH3}>Before the call</h3>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px]" style={bodyColor}>
          <li>Open <Link to="/lumora" className="text-[var(--accent)] underline">/lumora</Link> in a separate browser tab from your video call.</li>
          <li>Click <strong>Audio Check</strong> to verify mic and system-audio permissions are granted.</li>
          <li>Pick the right tab — coding, system design, or behavioral — based on the interview type.</li>
          <li>Open your resume / job context pane so Sona can reference it during answers.</li>
          <li>If you plan to use the mic-only path, complete <strong>Voice enrollment</strong> at <Link to="/docs/voice-filtering" className="text-[var(--accent)] underline">/docs/voice-filtering</Link> first.</li>
        </ol>

        <h3 id="user-audio" className={sectionH3}>Audio setup</h3>
        <p className={bodyP} style={bodyColor}>
          Pick one of the two paths described in <Link to="#lld-audio" className="text-[var(--accent)] underline">Audio capture pipeline</Link>:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            <strong>System audio capture (preferred):</strong> click the <strong>System Audio</strong>{' '}
            button — Chrome will ask which tab/window to share audio from. Pick your Zoom / Meet /
            Teams window. Lumora transcribes only the interviewer's voice; your mic is never part
            of the stream so there is nothing to filter.
          </li>
          <li>
            <strong>Voice filtering:</strong> for mic-based capture, enable <strong>Voice filtering</strong>.
            Lumora records your voice once during enrollment and only transcribes audio that doesn't
            match your voiceprint.
          </li>
        </ul>
        <DocsCallout variant="warning" label="Browser support">
          System audio capture requires Chrome (or Chromium-based browsers like Edge / Brave).
          Firefox and Safari don't support tab-audio capture as of 2026. The Camora Desktop app
          provides equivalent functionality on those platforms.
        </DocsCallout>

        <h3 id="user-during" className={sectionH3}>Using Sona during the interview</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px]" style={bodyColor}>
          <li><strong>Coding tab</strong> — Sona produces a 3-approach solution with complexity analysis.</li>
          <li><strong>Design tab</strong> — Sona drafts the architecture, often with a generated diagram (PNG, served from cache).</li>
          <li><strong>Behavioral tab</strong> — Sona writes a STAR-format response based on your resume.</li>
          <li><strong>Cmd+B</strong> (Ctrl+B on Windows/Linux) — instantly blank the screen. Useful if the interviewer asks you to share.</li>
        </ul>
        <DocsCallout variant="tip">
          Sona is a thinking partner, not a robotic script reader. Use her output as a starting
          point — read it, internalize the structure, then answer in your own voice. Recruiters
          notice when candidates read AI text verbatim.
        </DocsCallout>

        <h3 id="user-share" className={sectionH3}>Screen-share safety</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px]" style={bodyColor}>
          <li>Lumora runs in a separate browser tab — share your <em>specific window</em> (e.g. CoderPad), not the full screen.</li>
          <li>If you're forced into full-screen share, hit <strong>Cmd+B</strong> to blank Lumora instantly.</li>
          <li>For maximum safety, use the <Link to="/docs/desktop" className="text-[var(--accent)] underline">Camora Desktop app</Link> — its window is invisible to screen capture by design.</li>
        </ul>

        <h3 id="user-after" className={sectionH3}>After the call</h3>
        <p className={bodyP} style={bodyColor}>
          Conversations are saved to <Link to="/lumora/sessions" className="text-[var(--accent)] underline">/lumora/sessions</Link>{' '}
          — review questions you struggled with, bookmark good answers, and feed them into your
          prep notes for next time.
        </p>
      </section>
    </DocsPageLayout>
  );
}
