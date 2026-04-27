import { Link } from 'react-router-dom';
import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';
import DocsTable from '../../../components/shared/docs/DocsTable';
import DocsDiagram from '../../../components/shared/docs/DocsDiagram';

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
const sectionH4 = 'text-[15px] font-bold mt-5 mb-1.5 uppercase tracking-wide';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };

export default function AdminLumoraCodingPage() {
  return (
    <DocsPageLayout
      title="Coding — Architecture"
      description="Internal architecture reference for the Coding tab: HLD (solver pipeline, endpoints), LLD (input modes, system prompt + JSON contract, 3-pass reliability, JSON extraction, rendering), DDD (bounded contexts), data model, and operational notes."
      path="/docs/admin/lumora-coding"
      eyebrow="ADMIN · ARCHITECTURE"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Coding' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'hld', label: 'High-Level Design' },
        { id: 'hld-solver', label: 'Solver pipeline', depth: 1 },
        { id: 'hld-routes', label: 'Endpoint surface', depth: 1 },
        { id: 'lld', label: 'Low-Level Design' },
        { id: 'lld-inputs', label: 'Three input modes', depth: 1 },
        { id: 'lld-prompt', label: 'System prompt and JSON contract', depth: 1 },
        { id: 'lld-3pass', label: '3-pass reliability', depth: 1 },
        { id: 'lld-extract', label: 'JSON extraction', depth: 1 },
        { id: 'lld-render', label: 'Rendering 3 solutions', depth: 1 },
        { id: 'ddd', label: 'Domain-Driven Design' },
        { id: 'ddd-contexts', label: 'Bounded contexts', depth: 1 },
        { id: 'ddd-language', label: 'Ubiquitous language', depth: 1 },
        { id: 'data-model', label: 'Data model' },
        { id: 'ops', label: 'Operational notes' },
        { id: 'user-guide', label: 'User guide' },
      ]}
    >
      {/* ─── Overview ─────────────────────────────────────────────────── */}
      <section id="overview" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Overview</h2>
        <p className={bodyP} style={bodyColor}>
          Lumora Coding is the dedicated coding-interview surface inside Lumora. The candidate
          pastes a problem, fetches it from a URL, or extracts it from a screenshot, and Sona
          returns three different approaches — usually brute-force, better, optimal — each with a
          complete code snippet, time and space complexity, a first-person narration, a 4–10 step
          dry-run trace, and per-line explanations. The result renders as three structured cards
          backed by a live Monaco editor; switching solutions swaps the editor contents in place.
        </p>
        <p className={bodyP} style={bodyColor}>
          The endpoint surface, prompting, and response shape are intentionally different from the
          general Lumora Live inference path. Coding answers must parse as strict JSON and render
          as structured UI, so the backend invests in retries and fallback models to make the
          three-solution payload reliable even when the model occasionally truncates or returns
          slightly malformed output.
        </p>
        <DocsCallout variant="note" label="Relationship to Lumora Live">
          Lumora Coding shares Lumora Live's auth, audio capture, billing, and Sona persona, but it
          uses a separate backend route (<code style={inlineCode}>POST /api/v1/coding/solve</code>),
          a separate system prompt, a different SSE answer payload shape (structured JSON, not
          tagged text), and a separate quota table (<code style={inlineCode}>coding_usage</code>).
          See the <Link to="/docs/lumora-live" className="text-[var(--accent)] underline">Lumora Live</Link>{' '}
          page for the shared system context, deployment topology, and bounded-context map.
        </DocsCallout>
      </section>

      {/* ─── HLD ──────────────────────────────────────────────────────── */}
      <section id="hld" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>High-Level Design</h2>

        <h3 id="hld-solver" className={sectionH3}>Solver pipeline</h3>
        <p className={bodyP} style={bodyColor}>
          A coding request flows from one of three input modes through quota gating, the coding
          system prompt, the 3-pass reliability machinery, and into a tolerant JSON parser before
          rendering as three structured cards. The same flow records a usage row to{' '}
          <code style={inlineCode}>coding_usage</code> and a token-level row to{' '}
          <code style={inlineCode}>ai_hours_usage</code>.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-coding/solver-flow.png"
          alt="Lumora Coding solver flow with three input modes (paste, URL fetch via /api/v1/coding/fetch-problem, screenshot OCR via /api/v1/coding/capture using Anthropic vision), quota check against coding_usage with tier-aware daily limits, model selection, buildCodingSystemPrompt, the 3-pass reliability machinery, Anthropic call with MAX_TOKENS_CODING 16000, four-strategy extractJsonFromText, the SSE answer event, three-solution card render, and writes to lumora_messages, coding_usage, ai_hours_usage."
          label="Figure 1 — Coding solver pipeline"
          caption="Each input mode lands on the same /api/v1/coding/solve endpoint. The 3-pass reliability layer is what guarantees a parseable structured response — see Figure 3 for the state machine."
        />

        <h3 id="hld-routes" className={sectionH3}>Endpoint surface</h3>
        <p className={bodyP} style={bodyColor}>
          Lumora-backend exposes seven coding routes. All require auth and are mounted under{' '}
          <code style={inlineCode}>/api/v1/coding</code> with the{' '}
          <code style={inlineCode}>aiLimiter</code> rate-limit tier (20 / minute / IP).
        </p>
        <DocsTable
          columns={[
            { key: 'route', header: 'Route' },
            { key: 'method', header: 'Method' },
            { key: 'purpose', header: 'Purpose' },
          ]}
          rows={[
            { route: '/api/v1/coding/solve', method: 'POST', purpose: 'Primary SSE endpoint. Streams the 3-solution JSON answer.' },
            { route: '/api/v1/coding/stream', method: 'POST', purpose: 'Alias to /solve — kept for backward compatibility.' },
            { route: '/api/v1/coding/execute', method: 'POST', purpose: 'Run a code string against test cases. Used by the Run button.' },
            { route: '/api/v1/coding/fix', method: 'POST', purpose: 'Auto-repair code that failed the candidate\'s tests.' },
            { route: '/api/v1/coding/translate', method: 'POST', purpose: 'Translate the current solution to another language without re-solving.' },
            { route: '/api/v1/coding/fetch-problem', method: 'POST', purpose: 'Fetch a URL, strip HTML, ask Haiku to extract the problem text.' },
            { route: '/api/v1/coding/capture', method: 'POST', purpose: 'Anthropic vision call on a base64 screenshot to extract the problem.' },
          ]}
        />
      </section>

      {/* ─── LLD ──────────────────────────────────────────────────────── */}
      <section id="lld" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Low-Level Design</h2>

        <h3 id="lld-inputs" className={sectionH3}>Three input modes</h3>
        <p className={bodyP} style={bodyColor}>
          <code style={inlineCode}>CodingLayout.tsx</code> exposes three input tabs that all
          ultimately produce a <code style={inlineCode}>problemText</code> string fed into{' '}
          <code style={inlineCode}>handleCodingSubmit()</code>:
        </p>
        <DocsTable
          columns={[
            { key: 'mode', header: 'Mode' },
            { key: 'how', header: 'How it lands as problemText' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { mode: 'Paste', how: 'Direct <textarea> binding. Drag-and-drop of an image file in the textarea routes through the screenshot OCR path.', notes: 'Fastest path — no backend round-trip before solving.' },
            { mode: 'URL', how: 'POST /api/v1/coding/fetch-problem. The backend does a raw fetch(), strips HTML tags via regex, then asks Claude Haiku to extract the problem statement from the first 5,000 characters.', notes: 'No headless browser. JS-rendered pages may yield empty or partial text — fall back to screenshot OCR for those.' },
            { mode: 'Image / Screenshot', how: 'POST /api/v1/coding/capture with a base64 data URL. The backend invokes the Anthropic vision API directly with { type: "image", source: { type: "base64", media_type, data } } and a prompt that preserves example formatting.', notes: 'Returns 422 NO_PROBLEM_FOUND if vision can\'t identify a problem in the image.' },
          ]}
        />

        <h3 id="lld-prompt" className={sectionH3}>System prompt and JSON contract</h3>
        <p className={bodyP} style={bodyColor}>
          <code style={inlineCode}>buildCodingSystemPrompt(language, systemContext)</code> in{' '}
          <code style={inlineCode}>routes/coding.js</code> assembles a multi-section system prompt
          that enforces six hard rules — correctness, minimal code, exact output, no fake data,
          complete templates, function-based structure — and demands exactly three solutions
          conforming to a strict JSON schema. The schema is the contract between the model and the
          UI; if it doesn't parse, the rendering fails.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-coding/json-schema.png"
          alt="JSON schema for the AscendCodingResponse: top-level pitch, language, examples, and solutions array of length 3. Each Solution has name, patternTag enum from 27 canonical patterns, approach prose, complete code, complexity, narration, trace step array, and per-line explanations."
          label="Figure 2 — Solution JSON schema"
          caption="The model is told the patternTag must be one of 27 canonical interview patterns (two-pointer, sliding-window, BFS, DP-on-subsequence, etc.). This keeps the UI's pattern badge stable across runs."
        />

        <h3 id="lld-3pass" className={sectionH3}>3-pass reliability</h3>
        <p className={bodyP} style={bodyColor}>
          A single Anthropic call sometimes returns slightly invalid JSON — most commonly because
          the model truncates a long string mid-token, or because it adds prose around the JSON
          object. Coding answers can't tolerate that, so{' '}
          <code style={inlineCode}>routes/coding.js</code> implements three sequential passes that
          escalate from fast streaming to slower-but-more-reliable retries with a different model.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-coding/three-pass-reliability.png"
          alt="State machine for the 3-pass reliability strategy: Pass 1 streams from the tier model with up to 2 transport-layer retries on transient 5xx and 429 errors. On parse failure, Pass 2 retries non-streaming with a STRICT_JSON_REMINDER prompt. On still-invalid output, Pass 3 retries non-streaming with the opposite-tier fallback model. Success at any pass emits the answer event with recovery_pass; total failure emits the error event."
          label="Figure 3 — 3-pass reliability state machine"
          caption="The recovery_pass field on the answer event lets observability dashboards measure how often each pass actually fires. In practice Pass 1 succeeds for the vast majority of requests."
        />

        <h3 id="lld-extract" className={sectionH3}>JSON extraction</h3>
        <p className={bodyP} style={bodyColor}>
          <code style={inlineCode}>extractJsonFromText()</code> tries four strategies in sequence
          before declaring a parse failure:
        </p>
        <ol className="list-decimal pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li><strong>Strip markdown fences</strong> — <code style={inlineCode}>```json … ```</code> blocks become the candidate.</li>
          <li><strong>Find the first <code style={inlineCode}>{`{`}</code></strong> — slice from there to the matching closing brace.</li>
          <li><strong>Balanced-brace extraction</strong> — character-by-character bracket counting, tolerant of strings and escapes.</li>
          <li><strong>Brace-stitching repair</strong> — for streams truncated by max_tokens, append synthetic <code style={inlineCode}>"</code>, <code style={inlineCode}>]</code>, <code style={inlineCode}>{`}`}</code> closers in the right order to make the partial JSON valid, then re-parse.</li>
        </ol>
        <p className={bodyP} style={bodyColor}>
          The same algorithm is mirrored in the browser as a defensive repair pass — if the SSE
          stream ends but the answer event never carried a parsed JSON object, the frontend
          re-attempts brace-stitching on the accumulated raw token text. This recovers responses
          where the SSE answer event was lost but the tokens themselves were complete enough to
          parse.
        </p>

        <h3 id="lld-render" className={sectionH3}>Rendering 3 solutions</h3>
        <p className={bodyP} style={bodyColor}>
          Once the parsed JSON is in hand, the UI renders three solution cards plus a Monaco
          editor that mirrors whichever solution is currently active. Each card shows the approach
          name, a coloured complexity badge (computed by{' '}
          <code style={inlineCode}>getComplexityColor</code>), a pattern tag, narration, the
          step-by-step trace, and per-line explanations folded under a collapsible disclosure.
          Switching solution tabs swaps the Monaco contents in place; switching <em>language</em>{' '}
          tabs hits <code style={inlineCode}>POST /api/v1/coding/translate</code> rather than
          re-solving from scratch — much faster and avoids burning a quota slot.
        </p>
      </section>

      {/* ─── DDD ──────────────────────────────────────────────────────── */}
      <section id="ddd" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Domain-Driven Design</h2>

        <h3 id="ddd-contexts" className={sectionH3}>Bounded contexts</h3>
        <p className={bodyP} style={bodyColor}>
          Lumora Coding has five contexts, narrower than Lumora Live because there is no audio
          capture and no live transcription on the coding tab — the inputs are textual.
        </p>
        <DocsDiagram
          src="/diagrams/docs/lumora-coding/bounded-contexts.png"
          alt="Five bounded contexts for Lumora Coding: Problem Input, Language, Solver, Presentation, Metering. Domain events ProblemSubmitted and LanguageSelected flow into Solver; SolutionsGenerated and TranslationRequested flow into Presentation; SolveCompleted goes to Metering. Metering can publish DailyLimitExceeded back to Solver as a 429."
          label="Figure 4 — Coding bounded contexts and domain events"
          caption="The Solver context is where the 3-pass reliability and JSON extraction live; everything else is purely UI or persistence."
        />
        <DocsTable
          columns={[
            { key: 'ctx', header: 'Context' },
            { key: 'owns', header: 'Owns' },
            { key: 'pub', header: 'Publishes' },
            { key: 'sub', header: 'Subscribes to' },
          ]}
          rows={[
            { ctx: 'Problem Input', owns: 'Three input modes (paste, URL, image), URL fetcher, vision OCR', pub: 'ProblemSubmitted { problem, language }', sub: '— (root)' },
            { ctx: 'Language', owns: 'LANGUAGES catalog (~50 languages), Monaco language ID mapping, starter templates, translate-to-language path', pub: 'LanguageSelected, TranslationRequested', sub: '—' },
            { ctx: 'Solver', owns: 'buildCodingSystemPrompt, 3-pass reliability, extractJsonFromText, fallbackModelFor', pub: 'SolutionsGenerated { json, recoveryPass, modelUsed, latencyMs }', sub: 'ProblemSubmitted, LanguageSelected, DailyLimitExceeded' },
            { ctx: 'Presentation', owns: 'Three solution cards, complexity badge colors, Monaco editor sync, trace + per-line rendering', pub: '—', sub: 'SolutionsGenerated, TranslationRequested' },
            { ctx: 'Metering', owns: 'coding_usage table, daily-limit query, ai_hours_usage row writes', pub: 'SolveCompleted, DailyLimitExceeded → 429', sub: 'SolutionsGenerated' },
          ]}
        />

        <h3 id="ddd-language" className={sectionH3}>Ubiquitous language</h3>
        <DocsTable
          columns={[
            { key: 'term', header: 'Term' },
            { key: 'meaning', header: 'Meaning' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { term: 'Problem', meaning: 'The coding question text — paste, URL, or vision-extracted.', notes: 'Always a string by the time it reaches the Solver context.' },
            { term: 'Solution', meaning: 'One of three approaches in the response. Has its own code, complexity, narration, trace.', notes: 'Three is the canonical count — the prompt enforces it and the UI renders three cards.' },
            { term: 'patternTag', meaning: 'One of 27 canonical interview patterns (two-pointer, sliding-window, BFS, DP-on-subsequence, etc.).', notes: 'Drives the colored badge on each solution card.' },
            { term: 'Narration', meaning: 'A first-person spoken-style explanation of the approach, 4–6 sentences.', notes: 'Designed to be read aloud by the candidate, not summarized into bullet points.' },
            { term: 'Trace', meaning: 'A 4–10 step dry-run of the algorithm on the first example.', notes: 'Each step has a label and a detail string — renders as a numbered timeline.' },
            { term: 'Recovery pass', meaning: 'Which of the 3 reliability passes produced the final answer (1, 2, or 3).', notes: 'Surfaced on the answer event and observable for ops.' },
            { term: 'Translate', meaning: 'Re-emit an existing solution in a different language without re-solving.', notes: 'POST /api/v1/coding/translate — does not consume a daily-limit slot.' },
          ]}
        />
      </section>

      {/* ─── Data model ───────────────────────────────────────────────── */}
      <section id="data-model" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Data model</h2>
        <h4 className={sectionH4}>coding_usage</h4>
        <DocsTable
          columns={[
            { key: 'col', header: 'Column' },
            { key: 'type', header: 'Type' },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={[
            { col: 'id', type: 'UUID PK', notes: '' },
            { col: 'user_id', type: 'INTEGER', notes: 'FK → users(id)' },
            { col: 'language', type: 'VARCHAR(50)', notes: 'Lowercase language id from the LANGUAGES catalog (e.g. python, typescript, sql).' },
            { col: 'input_tokens', type: 'INTEGER', notes: 'Anthropic input usage for the winning pass' },
            { col: 'output_tokens', type: 'INTEGER', notes: 'Anthropic output usage for the winning pass' },
            { col: 'latency_ms', type: 'INTEGER', notes: 'End-to-end time from solve POST to answer event' },
            { col: 'created_at', type: 'TIMESTAMPTZ', notes: 'Implicit; queried as `WHERE created_at >= CURRENT_DATE` for the daily limit check' },
            { col: 'idx_coding_usage_user_date', type: 'INDEX', notes: 'on (user_id, created_at) — supports the daily count query in O(log n)' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          Lumora Coding also writes to the same{' '}
          <code style={inlineCode}>lumora_conversations</code> /{' '}
          <code style={inlineCode}>lumora_messages</code> tables as Lumora Live (with{' '}
          <code style={inlineCode}>metadata.is_coding = true</code>) and to{' '}
          <code style={inlineCode}>ai_hours_usage</code> with{' '}
          <code style={inlineCode}>surface = &apos;lumora_coding&apos;</code>. See the{' '}
          <Link to="/docs/lumora-live#data-model" className="text-[var(--accent)] underline">Lumora Live data model</Link>{' '}
          for those table shapes.
        </p>
      </section>

      {/* ─── Ops ──────────────────────────────────────────────────────── */}
      <section id="ops" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Operational notes</h2>
        <DocsTable
          columns={[
            { key: 'k', header: 'Setting' },
            { key: 'v', header: 'Value' },
            { key: 'why', header: 'Why' },
          ]}
          rows={[
            { k: 'MAX_TOKENS_CODING', v: '16,000', why: '8K truncated 3-solution JSON mid-field on long languages like Java; 16K is the practical headroom for three full solutions plus narration and trace.' },
            { k: 'Free tier daily limit', v: '2 solves / day', why: 'Anti-abuse cap. Counted via SELECT COUNT(*) FROM coding_usage WHERE user_id = $1 AND created_at >= CURRENT_DATE.' },
            { k: 'Paid tier daily limit', v: '20 solves / day', why: 'Owner email bypass via OWNER_EMAILS env (default chundubabu@gmail.com).' },
            { k: 'Pass 1 transport retries', v: '2 attempts, 500ms / 1500ms backoff', why: 'Triggered on 529, 503, 502, 504, 429 only. Parse failures skip directly to Pass 2.' },
            { k: 'Prompt cache', v: 'Disabled', why: 'Coding system prompt is too large and too rarely repeated to benefit from the 5-minute Anthropic cache TTL.' },
            { k: 'Rate limit tier', v: 'aiLimiter — 20 / minute / IP', why: 'Same tier as transcription, inference, diagram. Burst protection rather than abuse cap.' },
          ]}
        />
        <DocsCallout variant="tip" label="Observability hook">
          The <code style={inlineCode}>recovery_pass</code> field on every answer event is the
          single best signal for "is the model healthy?" — a sustained increase in pass-2 or pass-3
          rates means the upstream model is degrading on JSON output.
        </DocsCallout>
      </section>

      {/* ─── User guide ───────────────────────────────────────────────── */}
      <section id="user-guide" className="mb-10 scroll-mt-24">
        <h2 className={sectionH2}>User guide</h2>
        <h3 className={sectionH3}>Pick your input mode</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li><strong>Paste</strong> — fastest. Drop the problem statement into the textarea and hit Generate.</li>
          <li><strong>URL</strong> — paste a LeetCode / HackerRank / Codeforces URL and click Fetch. Works best on static pages.</li>
          <li><strong>Image</strong> — drag a screenshot of the problem into the textarea or use the Image tab. Useful for CoderPad-style sessions where copy-paste is restricted.</li>
        </ul>

        <h3 className={sectionH3}>Switching languages</h3>
        <p className={bodyP} style={bodyColor}>
          The language picker in the editor toolbar swaps the Monaco language and either re-loads
          the starter template (if no solution is generated yet) or hits{' '}
          <code style={inlineCode}>POST /api/v1/coding/translate</code> to convert the existing
          three solutions to the new language. Translation does not consume a daily-limit slot.
        </p>

        <h3 className={sectionH3}>Reading the three solutions</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14.5px] mb-3" style={bodyColor}>
          <li>The first card is usually the brute-force baseline — easy to explain, slow to run.</li>
          <li>The second card is a meaningful improvement (better complexity).</li>
          <li>The third is the optimal approach Sona thinks the interviewer is looking for.</li>
          <li>The <strong>narration</strong> field is intentionally written to be read aloud — use it as a thinking-out-loud script, not a summary.</li>
        </ul>
        <DocsCallout variant="warning" label="Don't read code verbatim">
          The whole point of three approaches is that you can show your work — pick the one that
          matches the level of the interview, walk through the trade-offs, and adapt. Reading the
          generated code verbatim defeats the purpose and recruiters notice.
        </DocsCallout>
      </section>
    </DocsPageLayout>
  );
}
