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
          <li>Both backends use Nixpacks build with <code>nodejs_20</code>, plus extras (ascend gets <code>graphviz + python3 + go + rustc + openjdk17</code>; lumora gets <code>ffmpeg</code> for Whisper preprocessing).</li>
          <li>Healthcheck endpoint: <code>/health</code> on each service.</li>
          <li>Migrations run automatically on boot (<code>runMigrations()</code> in <code>index.js</code>).</li>
          <li>Failed deploys: check Railway logs, usually missing env var or schema migration that conflicts.</li>
        </ul>
      </section>

      <section id="ai-services" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">AI services (Docker)</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Python FastAPI in a Dockerfile (<code>python:3.11-slim + graphviz + ffmpeg</code>). Builds slowly
          due to Whisper model + diarization model downloads on first deploy. Subsequent deploys use
          Railway's layer cache and complete in ~2 minutes.
        </p>
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
