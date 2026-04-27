import { Link } from 'react-router-dom';
import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminOverviewPage() {
  return (
    <DocsPageLayout
      title="Operations overview"
      description="Service map, deployment topology, what runs where, and how the pieces connect."
      path="/docs/admin"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Overview' }]}
      onThisPage={[
        { id: 'service-map', label: 'Service map' },
        { id: 'data-flow', label: 'Data flow' },
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
                <td className="px-4 py-2.5">apps/frontend</td><td className="px-4 py-2.5">Vercel</td>
                <td className="px-4 py-2.5">camora.cariara.com</td><td className="px-4 py-2.5">React 19 + Vite 8 + Tailwind 4</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/ascend-backend</td><td className="px-4 py-2.5">Railway</td>
                <td className="px-4 py-2.5">caprab.cariara.com</td><td className="px-4 py-2.5">Node 20 + Express 5</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/lumora-backend</td><td className="px-4 py-2.5">Railway</td>
                <td className="px-4 py-2.5">lumorab.cariara.com</td><td className="px-4 py-2.5">Node 20 + Express 5</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/ai-services</td><td className="px-4 py-2.5">Railway (Docker)</td>
                <td className="px-4 py-2.5">internal only</td><td className="px-4 py-2.5">FastAPI + Whisper + diarization</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5">apps/desktop</td><td className="px-4 py-2.5">GitHub Releases</td>
                <td className="px-4 py-2.5">github.com/schundu007/camora</td><td className="px-4 py-2.5">Electron shell, embeds web frontend</td>
              </tr>
            </tbody>
          </table>
        </div>
        <DocsCallout variant="note">
          The Postgres database is shared across both backends — `@camora/shared-db` workspace package.
          Both services run their own `runMigrations()` on startup; whichever boots first wins, the other
          is a no-op due to <code>CREATE TABLE IF NOT EXISTS</code>.
        </DocsCallout>
      </section>

      <section id="data-flow" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Data flow</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          A typical Lumora live request:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li>Browser → ascend-backend `/api/v1/transcribe` with audio chunk + auth.</li>
          <li>ascend-backend → ai-services FastAPI for speaker diarization (drops user voice).</li>
          <li>ascend-backend → OpenAI Whisper for speech-to-text.</li>
          <li>Frontend posts the resulting question to `/api/v1/inference/stream`.</li>
          <li>ascend-backend → Anthropic Claude with prompt cache + streaming response.</li>
          <li>Every step records seconds + tokens to `ai_hours_usage` for budget tracking.</li>
        </ol>
      </section>

      <section id="admin-access" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Admin access</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Admins are configured via the <code>ADMIN_EMAILS</code> env var on ascend-backend (comma-separated).
          Default: <code>chundubabu@gmail.com,babuchundu@gmail.com</code>.
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
