import { Link } from 'react-router-dom';
import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminOverviewPage() {
  return (
    <DocsPageLayout
      title="Operations overview"
      description="Service map, deployment topology, what runs where, and how the pieces connect."
      path="/docs/admin"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Overview' }]}
      onThisPage={[
        { id: 'service-map', label: 'Service map' },
        { id: 'data-flow', label: 'Data flow' },
        { id: 'architecture-deep-dives', label: 'Architecture deep-dives' },
        { id: 'admin-access', label: 'Admin access' },
        { id: 'common-tasks', label: 'Common admin tasks' },
      ]}
    >
      <section id="service-map" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Service map</h2>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Service</th>
                <th className="text-left px-4 py-2.5 font-semibold">Hosted on</th>
                <th className="text-left px-4 py-2.5 font-semibold">Domain</th>
                <th className="text-left px-4 py-2.5 font-semibold">Stack</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/camora</td><td className="px-4 py-2.5">Vercel</td>
                <td className="px-4 py-2.5">camora.cariara.com</td><td className="px-4 py-2.5">React 19 + Vite 8 + Tailwind 4</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/ascend-backend</td><td className="px-4 py-2.5">Railway (Dockerfile)</td>
                <td className="px-4 py-2.5">caprab.cariara.com + lumorab.cariara.com (Lumora data plane)</td><td className="px-4 py-2.5">Node 20 + Express 5</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/lumora-backend</td><td className="px-4 py-2.5">Railway (Dockerfile)</td>
                <td className="px-4 py-2.5">lumorab.cariara.com (legacy / fallback)</td><td className="px-4 py-2.5">Node 20 + Express 5</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/ai-services</td><td className="px-4 py-2.5">Railway (Docker)</td>
                <td className="px-4 py-2.5">internal only</td><td className="px-4 py-2.5">FastAPI + resemblyzer (speaker diarization) + Graphviz (diagrams)</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/desktop</td><td className="px-4 py-2.5">DMG (manual)</td>
                <td className="px-4 py-2.5">loads camora.cariara.com</td><td className="px-4 py-2.5">Electron 41, macOS arm64 only</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/mobile</td><td className="px-4 py-2.5">Expo (App Store / Play)</td>
                <td className="px-4 py-2.5">loads ascend-backend APIs</td><td className="px-4 py-2.5">Expo / React Native (iOS + Android)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <DocsCallout variant="note">
          <strong>Architecture shift:</strong> ascend-backend now hosts the canonical Lumora data
          plane via <code>apps/ascend-backend/src/lumora/</code> — <code>/api/v1/transcribe</code>,
          <code>/api/v1/inference</code>, <code>/api/v1/stream</code>, <code>/api/v1/coding/*</code>,
          <code>/api/v1/conversations</code>, <code>/api/v1/speaker</code>,
          <code>/api/v1/diagram</code>. The standalone lumora-backend remains as a fallback /
          legacy host but production frontends call ascend.
        </DocsCallout>
        <DocsCallout variant="note">
          Postgres is shared via <code>@camora/shared-db</code>. Ascend-backend now owns the
          canonical migration sequence and additionally provisions the lumora-side tables
          (<code>lumora_conversations</code>, <code>lumora_messages</code>, <code>lumora_usage_logs</code>,
          <code>lumora_bookmarks</code>, <code>lumora_quotas</code>, <code>coding_usage</code>) on
          boot. Lumora-backend&apos;s own <code>runMigrations()</code> is largely vestigial.
        </DocsCallout>
      </section>

      <section id="data-flow" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Data flow</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          A typical Lumora live request, end-to-end:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Browser &rarr; ascend-backend <code>/api/v1/transcribe</code> with audio chunk + auth.</li>
          <li>ascend-backend &rarr; ai-services FastAPI for speaker diarization (drops user voice).</li>
          <li>ascend-backend &rarr; OpenAI Whisper for speech-to-text. Deepgram is a configured
            alternative provider when <code>DEEPGRAM_API_KEY</code> is set.</li>
          <li>Frontend posts the resulting question to <code>/api/v1/stream</code> (or
            <code>/api/v1/inference/conversations/:id/stream</code> for follow-ups in the same
            conversation).</li>
          <li>ascend-backend &rarr; Anthropic Claude (Sonnet 4.6 / Haiku 4.5) with Anthropic prompt
            cache + Redis-backed answer cache + SSE streaming.</li>
          <li>Every step records seconds + tokens to <code>ai_hours_usage</code> for budget tracking.</li>
        </ol>
      </section>

      <section id="architecture-deep-dives" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Architecture deep-dives</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Per-feature HLD / LLD / DDD references with diagrams. These are the internal
          architecture pages — for end-user how-to-use-it documentation, see the user guides under{' '}
          <Link to="/docs" className="text-[var(--accent)] underline">/docs</Link>.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><Link to="/docs/admin/lumora-live" className="text-[var(--accent)] underline">Live Session architecture</Link> — audio capture, transcription, Sona stream, voice filter, diagrams, bounded contexts.</li>
          <li><Link to="/docs/admin/lumora-coding" className="text-[var(--accent)] underline">Coding architecture</Link> — solver pipeline, system prompt + JSON contract, 3-pass reliability, JSON extraction.</li>
          <li><Link to="/docs/admin/lumora-design" className="text-[var(--accent)] underline">System Design architecture</Link> — tagged-text answer rendering, diagram generation pipeline, three-tier cache, code sanitizer.</li>
        </ul>
      </section>

      <section id="admin-access" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Admin access</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Admins are configured via the <code>OWNER_EMAILS</code> / <code>ADMIN_EMAILS</code> env
          vars on ascend-backend (comma-separated). <strong>No hardcoded fallback in source</strong>
          &mdash; if the env is unset, no one is admin. The frontend mirrors this via
          <code className="ml-1">VITE_OWNER_EMAILS</code> for UI gating; the backend always
          enforces the real check.
        </p>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Admin surfaces:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><Link to="/admin/teams" className="text-[var(--accent)] underline">/admin/teams</Link> — every team + pending refund queue + auto-topup kill switches.</li>
          <li><Link to="/analytics" className="text-[var(--accent)] underline">/analytics</Link> — page views, user list, grant trial.</li>
          <li><code>/api/v1/teams/admin/*</code> — REST surface for the admin dashboard.</li>
        </ul>
      </section>

      <section id="common-tasks" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Common admin tasks</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><Link to="/docs/admin/refunds" className="text-[var(--accent)] underline">Approve a refund request</Link></li>
          <li><Link to="/docs/admin/incidents" className="text-[var(--accent)] underline">Force-disable runaway auto-topup</Link></li>
          <li><Link to="/docs/admin/stripe" className="text-[var(--accent)] underline">Set up new Stripe price IDs</Link></li>
          <li><Link to="/docs/admin/database" className="text-[var(--accent)] underline">Manually adjust a user's pool</Link></li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
