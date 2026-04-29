import DocsPageLayout from '../_layout';

export default function AdminEnvVarsPage() {
  return (
    <DocsPageLayout
      title="Environment variables"
      description="Every env var across frontend, ascend-backend, lumora-backend, ai-services. What it does, default value, where to set it."
      path="/docs/admin/env-vars"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Env vars' }]}
      onThisPage={[
        { id: 'frontend', label: 'Frontend (Vite)' },
        { id: 'ascend-backend', label: 'Ascend backend' },
        { id: 'lumora-backend', label: 'Lumora backend' },
        { id: 'ai-services', label: 'AI services' },
      ]}
    >
      <section id="frontend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Frontend (Vite)</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          Vite vars must be prefixed <code>VITE_</code>. Set them in Vercel project settings:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>VITE_LUMORA_API_URL</code> — base URL for Lumora API calls. Default: <code>https://lumorab.cariara.com</code>.</li>
          <li><code>VITE_CAPRA_API_URL</code> — base URL for Capra API calls. Default: <code>https://caprab.cariara.com</code>.</li>
          <li><code>VITE_OAUTH_URL</code> — Google OAuth redirect endpoint.</li>
          <li><code>VITE_OWNER_EMAILS</code> — comma-separated emails that bypass paywalls (defense in depth).</li>
        </ul>
      </section>

      <section id="ascend-backend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Ascend backend</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The primary backend. Set in Railway service variables:
        </p>
        <h3 className="text-base font-bold mt-4 mb-2">Core</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>DATABASE_URL</code> — Postgres connection string.</li>
          <li><code>REDIS_URL</code> — Redis (used for problem cache, daily limit, team-id lookup cache).</li>
          <li><code>JWT_SECRET</code> / <code>JWT_SECRET_KEY</code> — JWT signing key.</li>
          <li><code>ANTHROPIC_API_KEY</code> — Claude.</li>
          <li><code>OPENAI_API_KEY</code> — Whisper + GPT fallback.</li>
          <li><code>AI_SERVICES_URL</code> — internal FastAPI service. Default: <code>http://localhost:8001</code>.</li>
          <li><code>FRONTEND_URL</code> — used in invite + reminder + auto-topup-failure email links. Default: <code>https://camora.cariara.com</code>.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Auth + admin</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> — OAuth.</li>
          <li><code>ADMIN_EMAILS</code> — comma-separated, default: <code>chundubabu@gmail.com,babuchundu@gmail.com</code>.</li>
          <li><code>INTERNAL_API_KEY</code> — used by jobs.cariara.com for cross-service subscription verification.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Stripe</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>STRIPE_SECRET_KEY</code></li>
          <li><code>STRIPE_WEBHOOK_SECRET</code></li>
          <li>10 × <code>STRIPE_PRICE_*</code> — see the <a href="/docs/admin/stripe" className="text-[var(--accent)] underline">Stripe configuration</a> page.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Email (Resend)</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>RESEND_API_KEY</code> — without it, emails are skipped (silent fallback).</li>
          <li><code>EMAIL_FROM</code> — sender address. Default: <code>Camora &lt;noreply@cariara.com&gt;</code>.</li>
        </ul>
        <h3 className="text-base font-bold mt-4 mb-2">Tunables</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>AI_HOURS_SEC_PER_1K_OUT</code> — token-to-seconds conversion. Default: <code>20</code>.</li>
          <li><code>AI_HOURS_SEC_PER_1K_IN</code> — Default: <code>2</code>.</li>
          <li><code>CLAUDE_MODEL</code> — free-tier model. Default: <code>claude-haiku-4-5-20251001</code>.</li>
          <li><code>CLAUDE_MODEL_PAID</code> — paid-tier model. Default: <code>claude-sonnet-4-6</code>.</li>
        </ul>
      </section>

      <section id="lumora-backend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Lumora backend</h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Standalone deployment uses the same env vars as ascend-backend (database, Redis, Stripe, Resend,
          OpenAI, Anthropic). In the current production setup, lumorab.cariara.com points at the ascend
          service so most lumora-backend env vars are dormant.
        </p>
      </section>

      <section id="ai-services" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">AI services (FastAPI)</h2>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>ANTHROPIC_API_KEY</code> — used by the Python diagram engine.</li>
          <li><code>SPEAKER_VERIFICATION_THRESHOLD</code> — cosine similarity cutoff for voice filtering. Default: <code>0.85</code>.</li>
          <li><code>WHISPER_MODEL</code> — Whisper model size. Default: <code>whisper-1</code>.</li>
        </ul>
      </section>
    </DocsPageLayout>
  );
}
