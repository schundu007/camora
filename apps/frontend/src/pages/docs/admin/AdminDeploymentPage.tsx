import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminDeploymentPage() {
  return (
    <DocsPageLayout
      title="Deployment runbook"
      description="How each service deploys, where to look when a deploy fails, cache busting, rollbacks."
      path="/docs/admin/deployment"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Deployment' }]}
      onThisPage={[
        { id: 'auto-deploy', label: 'Auto-deploy on main' },
        { id: 'frontend', label: 'Frontend (Vercel)' },
        { id: 'backends', label: 'Backends (Railway)' },
        { id: 'ai-services', label: 'AI services (Docker)' },
        { id: 'image-sizes', label: 'Image sizes & build optimization' },
        { id: 'rollbacks', label: 'Rollbacks' },
        { id: 'cache-busting', label: 'Cache busting' },
      ]}
    >
      <section id="auto-deploy" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Auto-deploy on main</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Every push to <code>main</code> on <code>github.com/schundu007/camora</code> triggers all four
          services. There is no staging environment — preview branches on Vercel for the frontend, branch
          deploys on Railway for the backends.
        </p>
      </section>

      <section id="frontend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Frontend (Vercel)</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Build command: <code>pnpm build:frontend</code></li>
          <li>Output: <code>apps/frontend/dist</code></li>
          <li>SPA rewrite rule sends every path to <code>index.html</code></li>
          <li>Failed builds: check Vercel dashboard, almost always TypeScript errors or missing imports</li>
        </ul>
        <DocsCallout variant="warning" label="The HourMeterChip incident">
          A common pattern that bit us: file added to git index but not committed. Local builds pass (file
          is on disk), Vercel checks out the bare commit and fails to resolve the import. Always
          <code>git status</code> before pushing — anything in the staged area but not committed will
          break Vercel even though local works.
        </DocsCallout>
      </section>

      <section id="backends" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Backends (Railway)</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Both backends now use a custom <code>Dockerfile</code> (we migrated off Nixpacks because Nixpacks bakes Railway service variables into <code>ARG</code>/<code>ENV</code> at build time, leaking secrets into image layers).</li>
          <li><code>lumora-backend</code> base: <code>node:20-bookworm-slim</code> + <code>ffmpeg</code> + interpreters/compilers for the multi-language code-runner (Python, Ruby, Java/openjdk-17, Go, Rust, PHP, Perl, Lua, R, Haskell, Scala, Clojure, Mono, OCaml, Elixir, Julia).</li>
          <li><code>ascend-backend</code> base: similar Node base + <code>graphviz</code> + <code>python3</code>.</li>
          <li>Healthcheck endpoint: <code>/health</code> on each service.</li>
          <li>Migrations run automatically on boot (<code>runMigrations()</code> in <code>index.js</code>).</li>
          <li>Failed deploys: check Railway logs, usually missing env var, schema migration conflict, or a native module that didn't compile (see <a href="/docs/admin/incidents#sharp-boot-crash" className="text-[var(--accent)] underline">Incidents → sharp boot crash</a>).</li>
        </ul>
      </section>

      <section id="ai-services" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">AI services (Docker)</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Python FastAPI in a multi-stage Dockerfile (<code>python:3.11-slim</code> base + <code>graphviz</code> + <code>ffmpeg</code> at runtime). Hosts speaker verification (<code>resemblyzer</code> → <code>torch</code>), diagram rendering (<code>diagrams</code> + Graphviz), and Anthropic-backed helpers.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The Dockerfile pulls torch from the CPU-only PyTorch wheel index, not PyPI's default (which ships
          the CUDA bundle). Multi-stage means the compiler toolchain (<code>gcc</code>, <code>build-essential</code>,
          <code>python3-dev</code>, <code>graphviz-dev</code>) lives only in the builder stage.
        </p>
      </section>

      <section id="image-sizes" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Image sizes &amp; build optimization</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Container size matters because Railway image-pull time is part of every deploy. A 3 GB image
          adds ~30–60 s of cold-pull on every node restart vs ~5–10 s for a 800 MB image. Audit and
          mitigation history below.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">ai-services: 3 GB → 1.2 GB (commit <code>9a223829</code>)</h3>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          <strong>Symptoms:</strong> ai-services Docker image was 3.0 GB on Railway while ascend-backend
          (Node, similar feature surface area) was 800 MB.
        </p>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          <strong>Root cause (in order of size):</strong>
        </p>
        <ul className="list-disc pl-6 space-y-1 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>~1.4 GB</strong> — <code>resemblyzer</code> pulls <code>torch</code>, and PyPI's default torch wheel ships with the CUDA runtime. Railway has no GPU; we never invoke CUDA at all.</li>
          <li><strong>~600 MB</strong> — <code>build-essential</code>, <code>gcc</code>, <code>python3-dev</code>, and <code>graphviz-dev</code> shipped in the runtime image because there was no multi-stage split. These are needed at <code>pip install</code> time, never at runtime.</li>
          <li><strong>~500 MB</strong> — <code>librosa</code> + <code>scipy</code> + <code>numba</code> (resemblyzer's transitive audio-math chain). Genuinely needed.</li>
          <li><strong>~150 MB</strong> — app code + everything else.</li>
        </ul>
        <p className="text-[15px] leading-relaxed mt-3 mb-2" style={{ color: 'var(--text-secondary)' }}>
          <strong>Mitigation:</strong> rewrote the Dockerfile to (1) install torch from
          <code>https://download.pytorch.org/whl/cpu</code> <em>before</em> resemblyzer so the transitive
          dep resolves to the CPU wheel (~200 MB instead of ~1.4 GB), and (2) use a two-stage build
          (<code>builder</code> → <code>runtime</code>) so the toolchain stays in the throwaway builder
          and only installed site-packages ship to runtime. Functional behavior unchanged.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">lumora-backend: 1.4 GB</h3>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          <strong>Why it's large:</strong> the multi-language code-runner (<code>services/codeRunner.js</code>)
          installs interpreters/compilers for ~20 languages so users can hit <strong>Run</strong> on any
          generated solution. The heaviest contributors:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>GHC (Haskell) — ~800 MB</li>
          <li>OpenJDK 17 + Scala + Clojure (JVM family) — ~600 MB</li>
          <li>R (<code>r-base-core</code>) — ~400 MB</li>
          <li>Mono (.NET runtime) — ~300 MB</li>
          <li>Go — ~300 MB</li>
          <li>Julia (via juliaup) — ~200 MB</li>
          <li>Rust + Cargo — ~150 MB</li>
          <li>OCaml, Elixir, Erlang, TCL — ~200 MB combined</li>
        </ul>
        <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
          <strong>Trade-off:</strong> dropping a language disables the <strong>Run</strong> button for
          problems in it (the LLM still <em>generates</em> the code). Pending decision: which low-usage
          languages to remove. Keeping the always-needed core (Python, Node, Ruby, Java, C/C++, Go, Rust,
          PHP, Perl, Lua, SQL) and dropping GHC, R, Mono, Scala, Clojure, OCaml, Elixir, Julia would
          land the image around ~700 MB.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">General Docker hygiene checklist</h3>
        <ul className="list-disc pl-6 space-y-1 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Multi-stage builds: never ship the compiler toolchain to runtime.</li>
          <li>Always check whether a Python package's transitive deps default to GPU/CUDA wheels — explicitly install the CPU wheel first.</li>
          <li><code>--no-cache-dir</code> on every <code>pip install</code>; <code>npm cache clean --force</code> after every <code>npm install</code>.</li>
          <li>Single <code>RUN apt-get update &amp;&amp; apt-get install ... &amp;&amp; rm -rf /var/lib/apt/lists/*</code> per image so the apt cache doesn't end up in a layer.</li>
          <li>Native Node modules (<code>sharp</code>, <code>better-sqlite3</code>, <code>node-pty</code>) lazy-load + degrade gracefully when binaries are missing — see <a href="/docs/admin/incidents#sharp-boot-crash" className="text-[var(--accent)] underline">sharp boot crash</a>.</li>
        </ul>
      </section>

      <section id="rollbacks" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Rollbacks</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Vercel</strong>: Deployments tab → click any prior deploy → "Promote to Production".</li>
          <li><strong>Railway</strong>: Deployments tab → click prior version → "Rollback to this".</li>
          <li><strong>Database</strong>: schema migrations are additive and idempotent. Rolling back code without rolling back schema is safe — the new columns just go unused.</li>
          <li><strong>Git</strong>: prefer reverting via <code>git revert</code> over <code>reset --hard</code> so the Stripe webhook + DB state stays consistent with the deployed code.</li>
        </ul>
      </section>

      <section id="cache-busting" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Cache busting</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Vite hashes asset filenames — frontend cache invalidates automatically per deploy.</li>
          <li>Service worker: not currently used. If you ever add one, version-bump on every deploy.</li>
          <li>Redis answer cache: 30-day TTL on solve answers. Manual flush via the Redis CLI: <code>redis-cli DEL "solve:answer:v1:*"</code>.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
