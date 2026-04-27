import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';
import DocsDiagram from '../../components/shared/docs/DocsDiagram';

const inlineCode = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 12.5,
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
};

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function LumoraDesignDocsPage() {
  return (
    <DocsPageLayout
      title="Lumora Design"
      description="Architecture and operational reference for Lumora's system-design tab — tagged-text answer rendering, the architecture-diagram generation pipeline, and the multi-tier cache that keeps diagrams fast."
      path="/docs/lumora-design"
      eyebrow="ARCHITECTURE & USER GUIDE"
      breadcrumbs={[{ label: 'Lumora Design' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'hld', label: 'High-Level Design' },
        { id: 'hld-flow', label: 'Solver pipeline', depth: 1 },
        { id: 'hld-routing', label: 'Routing decisions', depth: 1 },
        { id: 'lld', label: 'Low-Level Design' },
        { id: 'lld-prompt', label: 'Design prompt and tagged sections', depth: 1 },
        { id: 'lld-diagram', label: 'Diagram generation pipeline', depth: 1 },
        { id: 'lld-cache', label: 'Three-tier cache hierarchy', depth: 1 },
        { id: 'lld-sanitizer', label: 'Code sanitizer', depth: 1 },
        { id: 'ddd', label: 'Domain-Driven Design' },
        { id: 'ddd-contexts', label: 'Bounded contexts', depth: 1 },
        { id: 'ddd-language', label: 'Ubiquitous language', depth: 1 },
        { id: 'data-model', label: 'Data model' },
        { id: 'ops', label: 'Operational notes' },
        { id: 'user-guide', label: 'User guide' },
      ]}
    >
      <section id="overview" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Overview</h2>
        <p className={bodyP} style={bodyColor}>
          Lumora Design is the system-design surface inside Lumora. The candidate types or pastes
          a design question — "design Twitter timelines", "design WhatsApp", "scale a write-heavy
          analytics service" — and Sona returns a structured answer with capacity estimates,
          functional and non-functional requirements, an architecture overview, data model, API
          shape, and deep-dive sections. Where it makes sense, an architecture diagram renders
          alongside the prose, generated as a Graphviz PNG via the{' '}
          <code style={inlineCode}>diagrams</code> Python library.
        </p>
        <p className={bodyP} style={bodyColor}>
          Unlike the coding tab, design answers come back as <em>tagged-text blocks</em> —{' '}
          <code style={inlineCode}>[HEADLINE]</code>, <code style={inlineCode}>[REQUIREMENTS]</code>,{' '}
          <code style={inlineCode}>[CAPACITY]</code>, <code style={inlineCode}>[ARCHITECTURE]</code>,{' '}
          <code style={inlineCode}>[DATA_MODEL]</code>, <code style={inlineCode}>[API]</code>,{' '}
          <code style={inlineCode}>[DEEP_DIVES]</code> — that the frontend parses progressively as
          tokens stream in. The architecture diagram is fetched separately so the prose isn't
          blocked on Graphviz.
        </p>
        <DocsCallout variant="note" label="Relationship to Lumora Live">
          Lumora Design is a <em>mode</em> of Lumora Live's general inference endpoint. It uses the
          same <code style={inlineCode}>POST /api/v1/stream</code> route, the same SSE protocol,
          the same Conversation context. What's different: a design-specific system prompt, a
          higher max-tokens budget (12,000), and the secondary call to{' '}
          <code style={inlineCode}>POST /api/v1/diagram/generate</code> for the visual.
        </DocsCallout>
      </section>

      <section id="hld" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>High-Level Design</h2>

        <h3 id="hld-flow" className={sectionH3}>Solver pipeline</h3>
        <p className={bodyP} style={bodyColor}>
          The design solver is two parallel pipelines that converge in the UI: the prose answer
          streams from the inference route, and an architecture diagram is fetched on a second
          request when the answer contains an <code style={inlineCode}>[ARCHITECTURE]</code> block.
          Splitting the diagram off keeps the prose latency bounded by the LLM stream alone — the
          slower Graphviz subprocess never blocks first-token latency.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-design/solver-flow.png"
          alt="Lumora Design solver pipeline. Inputs (text, URL, image) flow through the design system prompt with cache_control: ephemeral and MAX_TOKENS_DESIGN 12000, then through Anthropic streaming, then through parseAnswer producing tagged-text blocks rendered as cards. In parallel, the UI fires POST /api/v1/diagram/generate which checks the in-memory LRU cache, falls through to ai-services on miss, and renders the returned base64 PNG inline."
          label="Figure 1 — Design solver pipeline"
          caption="The diagram request is fired from the UI, not the backend, so prose renders first and the architecture image streams in when ready. Cache hits return in under a millisecond."
        />

        <h3 id="hld-routing" className={sectionH3}>Routing decisions</h3>
        <p className={bodyP} style={bodyColor}>
          The decision of "is this a design question?" is made in{' '}
          <code style={inlineCode}>services/claude.js</code> by keyword matching against{' '}
          <code style={inlineCode}>DESIGN_KEYWORDS</code> (design, architect, build a, scale,
          system for, how would you design, how would you build, ...). When matched,{' '}
          <code style={inlineCode}>maxTokens</code> is raised to{' '}
          <code style={inlineCode}>MAX_TOKENS_DESIGN</code> (12,000) and a design-specific system
          prompt is selected.
        </p>
        <DocsTable
          columns={[
            { key: 'k', header: 'Decision' },
            { key: 'v', header: 'Value' },
            { key: 'why', header: 'Why' },
          ]}
          rows={[
            { k: 'Endpoint', v: 'POST /api/v1/stream (shared with general inference)', why: 'Design is a mode of inference, not its own service. The mode is detected by keyword in the prompt builder.' },
            { k: 'Model (paid)', v: 'claude-sonnet-4-20250514', why: 'Sonnet handles capacity estimates and trade-off reasoning materially better than Haiku.' },
            { k: 'Model (free)', v: 'claude-haiku-4-5-20251001', why: 'Same as general inference for free tier — design answers are still useful at Haiku quality, just less detailed.' },
            { k: 'max_tokens', v: '12,000 (MAX_TOKENS_DESIGN)', why: 'Tagged-text design answers run long: requirements + capacity + architecture + data model + API + deep-dives. 12K leaves headroom for all sections.' },
            { k: 'Prompt cache', v: 'Enabled (cache_control: ephemeral)', why: 'Design system prompt is large and stable; the 5-minute Anthropic prompt cache makes follow-up questions in the same session much faster.' },
            { k: 'Diagram fetch', v: 'Separate POST /api/v1/diagram/generate', why: 'Decouples slow Graphviz subprocess from streaming prose. Prose renders without waiting on the image.' },
          ]}
        />
      </section>

      <section id="lld" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Low-Level Design</h2>

        <h3 id="lld-prompt" className={sectionH3}>Design prompt and tagged sections</h3>
        <p className={bodyP} style={bodyColor}>
          The design system prompt asks Sona to emit a fixed sequence of tagged sections in
          order. Each block opens with <code style={inlineCode}>[NAME]</code> and closes with{' '}
          <code style={inlineCode}>[/NAME]</code>. The frontend's{' '}
          <code style={inlineCode}>parseAnswer()</code> walks the accumulated token stream and
          progressively populates a Map keyed by section name; UI cards subscribe to that map and
          render incrementally.
        </p>
        <DocsTable
          columns={[
            { key: 'tag', header: 'Tag' },
            { key: 'role', header: 'Role' },
            { key: 'shape', header: 'Typical shape' },
          ]}
          rows={[
            { tag: '[HEADLINE]', role: 'A one-sentence elevator framing of the system being designed.', shape: 'plain text, ≤ 25 words' },
            { tag: '[REQUIREMENTS]', role: 'Functional and non-functional requirements split into two columns.', shape: 'two bullet lists; non-functional includes latency / availability / consistency / scale targets' },
            { tag: '[CAPACITY]', role: 'Back-of-envelope numbers — DAU, QPS, storage, bandwidth.', shape: 'a small key-value table or compact bullets' },
            { tag: '[ARCHITECTURE]', role: 'Component overview — clients, gateways, services, queues, stores.', shape: 'short prose plus the architecture diagram (separate fetch)' },
            { tag: '[DATA_MODEL]', role: 'Tables / collections with primary key, columns, indexes.', shape: 'one block per table; example rows included' },
            { tag: '[API]', role: 'External API endpoints with verbs, paths, params, response shape.', shape: 'method-prefixed bullets' },
            { tag: '[DEEP_DIVES]', role: 'Two or three of the hardest design questions answered in detail.', shape: 'each deep-dive has a question + 4–6 sentence answer' },
          ]}
        />

        <h3 id="lld-diagram" className={sectionH3}>Diagram generation pipeline</h3>
        <p className={bodyP} style={bodyColor}>
          When the streaming answer contains an <code style={inlineCode}>[ARCHITECTURE]</code>{' '}
          block, the UI fires a second request to{' '}
          <code style={inlineCode}>POST /api/v1/diagram/generate</code> with{' '}
          <code style={inlineCode}>{`{ question, cloud_provider, detail_level }`}</code>. The
          backend layers a fast in-memory cache, then a Postgres cache, then on full miss
          generates fresh — Anthropic produces Python code that uses the{' '}
          <code style={inlineCode}>diagrams</code> library, the code is sanitized, and a
          subprocess executes it under Graphviz to render a PNG.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-design/diagram-pipeline.png"
          alt="Diagram generation pipeline. Browser POST /api/v1/diagram/generate hits Lumora backend authenticate + checkUsage. The in-memory LRU (200 entries × 24h TTL, key = hash(question, provider, detail)) is checked first; on miss the request is forwarded via proxyToAIService (30s timeout, 2 retries with backoff, 5/30s circuit breaker) to ai-services. ai-services checks ascend_diagram_cache in Postgres; on DB miss it builds a prompt with provider-scoped imports, calls Anthropic Sonnet 4 (4096 max_tokens), sanitizes the generated Python (string-strip + word-boundary blocking os.system, eval, exec, import socket, urllib, shutil), executes in a tempfile.TemporaryDirectory subprocess with a 60s timeout that runs Graphviz, and returns base64 PNG plus the source code."
          label="Figure 2 — Diagram generation pipeline"
          caption="Three independent guards on the subprocess: word-boundary code sanitizer, fresh tempfile working directory per call, and a 60-second wall-clock timeout enforced via subprocess.run."
        />

        <h3 id="lld-cache" className={sectionH3}>Three-tier cache hierarchy</h3>
        <p className={bodyP} style={bodyColor}>
          The same diagram is requested over and over — every visitor reading the same docs page
          asks for the same architecture image. Three tiers absorb that:
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-design/cache-hierarchy.png"
          alt="Three cache tiers for diagrams. L1 is Lumora in-memory LRU at 200 entries × 24h TTL with sub-millisecond latency, lost on process restart. L2 is the Postgres ascend_diagram_cache table keyed by SHA-256 of question + provider + detail with 5–20ms latency, surviving restart and redeploy. L3 is fresh generation in ai-services using Anthropic and Graphviz subprocess, with 8–25 second latency and one LLM call plus CPU. Hits at L2 warm L1; fresh generation at L3 stores into both L2 and L1."
          label="Figure 3 — Diagram cache hierarchy"
          caption="The first request from a fresh deploy pays L3 latency, but every subsequent reader gets the same answer from L1 in under a millisecond. The Postgres cache is the durable backbone — process churn doesn't cost a re-render."
        />

        <h3 id="lld-sanitizer" className={sectionH3}>Code sanitizer</h3>
        <p className={bodyP} style={bodyColor}>
          The diagram engine asks Anthropic to emit Python — and then executes it. That's a
          dangerous shape unless the input is locked down. The sanitizer in{' '}
          <code style={inlineCode}>apps/ascend-backend/src/services/diagram_engine.py</code> uses
          two techniques to make false positives rare and bypasses hard:
        </p>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>
            Before pattern-matching, all string literals are stripped from the source via a regex
            that handles single-quote, double-quote, and triple-quote forms. This means a
            legitimate node label like <code style={inlineCode}>Custom("WebSocket connections")</code>{' '}
            never trips the bare-substring check for <code style={inlineCode}>socket</code>.
          </li>
          <li>
            Each blocked pattern is paired with a word-boundary regex. <code style={inlineCode}>socket</code>{' '}
            matches <code style={inlineCode}>import socket</code> or{' '}
            <code style={inlineCode}>socket.create_connection(...)</code> but not <em>"WebSocket"</em>{' '}
            inside an identifier.
          </li>
        </ol>
        <p className={bodyP} style={bodyColor}>
          The blocked list covers <code style={inlineCode}>os.system</code>,{' '}
          <code style={inlineCode}>__import__</code>, <code style={inlineCode}>eval(</code>,{' '}
          <code style={inlineCode}>exec(</code>, and module imports of{' '}
          <code style={inlineCode}>shutil</code>, <code style={inlineCode}>importlib</code>,{' '}
          <code style={inlineCode}>requests.</code>, <code style={inlineCode}>urllib</code>,{' '}
          <code style={inlineCode}>socket</code>, <code style={inlineCode}>http.client</code>. A
          violation raises before the subprocess ever runs.
        </p>
        <DocsCallout variant="warning" label="Defence in depth, not the only defence">
          The sanitizer is one layer. The subprocess also runs in a fresh{' '}
          <code style={inlineCode}>tempfile.TemporaryDirectory</code>, has a 60-second wall-clock
          timeout, and lives on the ai-services container — which has no privileged access to the
          rest of the platform. Treat the sanitizer as the cheap fast check, not the security
          boundary.
        </DocsCallout>
      </section>

      <section id="ddd" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Domain-Driven Design</h2>

        <h3 id="ddd-contexts" className={sectionH3}>Bounded contexts</h3>
        <p className={bodyP} style={bodyColor}>
          Design adds two contexts to the Lumora Live model: <strong>Diagram Generation</strong>{' '}
          (the diagram pipeline + cache hierarchy) and a slightly different shape of{' '}
          <strong>Inference</strong> for the design prompt. Conversation, Metering, and Problem
          Input are inherited.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-design/bounded-contexts.png"
          alt="Six bounded contexts for Lumora Design: Problem Input, Inference (Design prompt + 12K max tokens), Diagram Generation (LRU + DB cache + sandboxed subprocess), Presentation, Conversation, Metering. Inference publishes AnswerStreamed events to Presentation; Presentation publishes DiagramRequested to Diagram Generation; Diagram Generation publishes DiagramReady back to Presentation; both Inference and Diagram Generation publish UsageRecorded to Metering, which can publish QuotaExceeded back as 429."
          label="Figure 4 — Design bounded contexts and domain events"
          caption="Diagram Generation is the only context with its own external dependency (ai-services + Graphviz). Everything else lives inside the Lumora process."
        />

        <h3 id="ddd-language" className={sectionH3}>Ubiquitous language</h3>
        <DocsTable
          columns={[
            { key: 't', header: 'Term' },
            { key: 'm', header: 'Meaning' },
            { key: 'n', header: 'Notes' },
          ]}
          rows={[
            { t: 'Architecture diagram', m: 'A Graphviz-rendered PNG that visualizes the components in an [ARCHITECTURE] block.', n: 'Always Graphviz output, never Mermaid or hand-coded SVG.' },
            { t: 'Cloud provider', m: 'aws | gcp | azure. Selects which icon set the diagrams library imports.', n: 'Default aws. Carried in the diagram request body and the cache key.' },
            { t: 'Detail level', m: 'low | medium | high. Controls how many components and how much labeling end up in the diagram.', n: 'Mapped from frontend "overview" / "detailed" via DETAIL_LEVEL_MAP.' },
            { t: 'Tagged section', m: 'A [NAME]…[/NAME] block in the streamed prose answer.', n: 'Seven canonical tags: HEADLINE, REQUIREMENTS, CAPACITY, ARCHITECTURE, DATA_MODEL, API, DEEP_DIVES.' },
            { t: 'Cache hit', m: 'Diagram returned from L1 (in-process LRU) or L2 (Postgres).', n: 'L1 hit is sub-millisecond; L2 hit is single-digit milliseconds.' },
            { t: 'Fresh generation', m: 'Diagram produced by Anthropic + Graphviz subprocess on the current request.', n: '8–25s latency. The path Lumora is trying to avoid for any repeat-visited diagram.' },
            { t: 'Sanitizer block', m: 'A pattern that, if matched in the generated Python, refuses to execute the code.', n: 'Word-boundary regex on stripped-string source — see Code sanitizer.' },
          ]}
        />
      </section>

      <section id="data-model" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Data model</h2>
        <p className={bodyP} style={bodyColor}>
          Design uses the same <code style={inlineCode}>lumora_conversations</code> /{' '}
          <code style={inlineCode}>lumora_messages</code> tables as Lumora Live; the assistant
          message has <code style={inlineCode}>metadata.is_design = true</code>. The diagram
          pipeline owns its own table on the ascend backend:
        </p>
        <DocsTable
          columns={[
            { key: 'col', header: 'Column' },
            { key: 'type', header: 'Type' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { col: 'id', type: 'UUID PK', notes: '' },
            { col: 'cache_key', type: 'TEXT UNIQUE', notes: 'SHA-256 of question + cloud_provider + detail_level' },
            { col: 'question', type: 'TEXT', notes: 'Raw question for cache observability' },
            { col: 'cloud_provider', type: 'VARCHAR(16)', notes: 'aws | gcp | azure' },
            { col: 'detail_level', type: 'VARCHAR(16)', notes: 'low | medium | high' },
            { col: 'image_base64', type: 'TEXT', notes: 'The PNG, base64-encoded' },
            { col: 'python_source', type: 'TEXT', notes: 'The diagrams-library Python that generated it (for transparency / re-render).' },
            { col: 'created_at', type: 'TIMESTAMPTZ', notes: '' },
            { col: 'idx_diagram_cache_key', type: 'INDEX', notes: 'on (cache_key) — primary lookup path' },
          ]}
        />
      </section>

      <section id="ops" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Operational notes</h2>
        <DocsTable
          columns={[
            { key: 'k', header: 'Setting' },
            { key: 'v', header: 'Value' },
            { key: 'why', header: 'Why' },
          ]}
          rows={[
            { k: 'L1 cache size', v: '200 entries', why: 'Fits common interview-prep questions in memory; evicts oldest first when full.' },
            { k: 'L1 cache TTL', v: '24 h', why: 'Diagrams change rarely; a day balances freshness against cost.' },
            { k: 'L2 cache TTL', v: 'unbounded', why: 'Postgres rows are durable; freshness is achieved by deleting on demand, not expiry.' },
            { k: 'Subprocess timeout', v: '60 s wall-clock', why: 'Graphviz on a small diagram is < 2s; the timeout exists to bound runaway pathological code.' },
            { k: 'Anthropic max_tokens (diagram)', v: '4096', why: 'Generated Python rarely exceeds ~120 lines; 4096 is generous.' },
            { k: 'Inference max_tokens (design prose)', v: '12,000', why: 'Tagged-text answers with seven sections fit comfortably under 12K with headroom.' },
            { k: 'Rate limit tier', v: 'aiLimiter — 20 / minute / IP', why: 'Same as transcription, inference, coding.' },
          ]}
        />
      </section>

      <section id="user-guide" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>User guide</h2>
        <h3 className={sectionH3}>Asking design questions</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>Phrase the question with a recognised verb — "<em>design</em> X", "<em>build</em> X", "how would you <em>scale</em> X". Sona uses keyword detection to route the request to the design prompt.</li>
          <li>Include constraints up front. Read-heavy or write-heavy. Latency target. Region count. Sona's capacity estimate uses whatever you give it; vague inputs produce vague numbers.</li>
          <li>Pick a cloud provider before submitting if you want a specific icon set. Default is AWS.</li>
        </ul>

        <h3 className={sectionH3}>Reading the answer</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>The headline gives the elevator pitch. If your interviewer pushes "what is this system?", read the headline first.</li>
          <li>Capacity numbers are <em>approximate</em>. Don't quote them as if they were measured; treat them as anchor estimates and adjust on the fly.</li>
          <li>The architecture diagram shows up below the prose when ready — typically a few seconds after first tokens. It's purely visual; the components are also listed in the prose.</li>
          <li>The deep-dive section is where most of the points are scored in a real interview. Use it as the script for "tell me more about how X works".</li>
        </ul>

        <h3 className={sectionH3}>If the diagram doesn't show up</h3>
        <p className={bodyP} style={bodyColor}>
          A small fraction of design questions don't yield a clean diagram — usually because the
          generated Python tripped the sanitizer or the Graphviz subprocess hit the 60-second
          timeout. The prose answer is unaffected. If you need the visual, rephrase the question
          to be more concrete (specific components, specific cloud) and resubmit.
        </p>
      </section>
    </DocsPageLayout>
  );
}
