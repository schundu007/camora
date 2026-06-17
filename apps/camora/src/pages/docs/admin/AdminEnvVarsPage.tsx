import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';

export default function AdminEnvVarsPage() {
  return (
    <DocsPageLayout
      title="Environment variables"
      description="Every env var across frontend, ascend-backend, lumora-backend, ai-services. What it does, default value, where to set it."
      path="/docs/admin/env-vars"
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
          <li><code>VITE_LUMORA_API_URL</code> &mdash; base URL for Lumora API calls. Default
            <code className="mx-1">https://lumorab.cariara.com</code>.</li>
          <li><code>VITE_CAPRA_API_URL</code> &mdash; base URL for Capra / Ascend API calls.
            Default <code className="mx-1">https://caprab.cariara.com</code>.</li>
          <li><code>VITE_OAUTH_URL</code> &mdash; Google OAuth redirect endpoint.</li>
          <li><code>VITE_OWNER_EMAILS</code> &mdash; comma-separated emails that bypass paywalls
            (UI defense in depth; backend enforces the real check).</li>
          <li><code>VITE_REQUIRE_AUTH</code> &mdash; toggles auth-required behavior in dev.</li>
          <li><code>VITE_WS_URL</code> &mdash; websocket base URL when WS-backed surfaces are
            enabled.</li>
        </ul>
      </section>

      <section id="ascend-backend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Ascend backend</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The primary backend. Hosts both the Capra (prep) and Lumora (live) data planes. Set in
          Railway service variables:
        </p>

        <h3 className="text-base font-bold mt-4 mb-2">Core</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>DATABASE_URL</code> &mdash; Postgres connection string (shared DB).</li>
          <li><code>JOBS_DATABASE_URL</code> &mdash; separate jobs-DB connection string.</li>
          <li><code>REDIS_URL</code> &mdash; Redis (problem cache, daily-limit cache, team-id
            lookup cache, Lumora answer cache).</li>
          <li><code>JWT_SECRET</code> &mdash; canonical JWT signing key. <code>JWT_SECRET_KEY</code>
            is read as a fallback for backward compat.</li>
          <li><code>JWT_ALGORITHM</code> &mdash; defaults to HS256.</li>
          <li><code>ANTHROPIC_API_KEY</code> &mdash; Claude.</li>
          <li><code>OPENAI_API_KEY</code> &mdash; Whisper + GPT fallback.</li>
          <li><code>DEEPGRAM_API_KEY</code> &mdash; alternative transcription provider, used by
            <code className="mx-1">services/deepgram.js</code> when set.</li>
          <li><code>AI_SERVICES_URL</code> &mdash; FastAPI service base URL. Default
            <code className="mx-1">http://localhost:8001</code>.</li>
          <li><code>AI_SERVICES_API_KEY</code> &mdash; shared secret. Required &mdash; ai-services
            rejects all non-<code>/health</code> requests without a matching <code>X-API-Key</code>
            header.</li>
          <li><code>AI_SERVICES_TIMEOUT_MS</code>, <code>AI_SERVICES_RETRIES</code> &mdash; tunables
            for the proxy.</li>
          <li><code>FRONTEND_URL</code> &mdash; used in invite / reminder / auto-topup-failure
            email links. Default <code className="mx-1">https://camora.cariara.com</code>.</li>
          <li><code>BACKEND_URL</code> &mdash; canonical backend URL referenced in webhooks /
            callbacks.</li>
          <li><code>COOKIE_DOMAIN</code> &mdash; SSO cookie domain. Default
            <code className="mx-1">.cariara.com</code> in prod.</li>
          <li><code>ALLOWED_ORIGINS</code> &mdash; CORS whitelist (comma-separated).</li>
          <li><code>LOG_LEVEL</code> &mdash; <code>info</code> / <code>debug</code> / etc.</li>
          <li><code>DATA_DIR</code>, <code>DIAGRAM_OUTPUT_DIR</code> &mdash; on-disk paths for
            generated artifacts.</li>
        </ul>

        <h3 className="text-base font-bold mt-4 mb-2">Auth + admin</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> &mdash; OAuth.</li>
          <li><code>GOOGLE_REDIRECT_URI</code> &mdash; OAuth callback URL.</li>
          <li><code>OWNER_EMAILS</code> / <code>ADMIN_EMAILS</code> &mdash; comma-separated.
            <strong> No hardcoded fallback in source</strong>; if unset, no one is admin.</li>
          <li><code>INTERNAL_API_KEY</code> &mdash; used by external services (jobs.cariara.com)
            to verify subscriptions; required on the verify-subscription endpoint.</li>
          <li><code>ADMIN_SECRET</code> &mdash; auxiliary admin gate.</li>
          <li><code>ALLOWED_EXTENSION_IDS</code> &mdash; for browser-extension surfaces.</li>
        </ul>

        <h3 className="text-base font-bold mt-4 mb-2">Stripe</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>STRIPE_SECRET_KEY</code></li>
          <li><code>STRIPE_WEBHOOK_SECRET</code></li>
          <li><code>STRIPE_PRICE_PRO_MONTHLY</code> &mdash; price ID for the $19/mo plan.</li>
          <li><code>STRIPE_PRICE_PRO_YEARLY</code> &mdash; price ID for the $99/yr plan.</li>
          <li><code>STRIPE_PRICE_TOPUP_1H</code> &mdash; price ID for the $15/hr top-up.</li>
          <li><code>STRIPE_PRODUCT_TEAM</code> &mdash; product ID for the dynamic team plan
            (price computed per checkout).</li>
          <li><code>STRIPE_AUTOMATIC_TAX</code> &mdash; enables automatic tax in checkout.</li>
        </ul>

        <h3 className="text-base font-bold mt-4 mb-2">Email (Resend)</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>RESEND_API_KEY</code> &mdash; without it, emails are skipped (silent fallback).</li>
          <li><code>EMAIL_FROM</code> &mdash; sender address. Default
            <code className="mx-1">Camora &lt;noreply@cariara.com&gt;</code>.</li>
        </ul>

        <h3 className="text-base font-bold mt-4 mb-2">Tunables</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>MAX_TOKENS_QUICK</code> &mdash; default 2000 (live answer + sidebar quick mode).</li>
          <li><code>MAX_TOKENS_DESIGN</code> &mdash; default 12000 (system design).</li>
          <li><code>MAX_TOKENS_CODING</code> &mdash; default 16000 (coding helper).</li>
          <li><code>FREE_CODING_DAILY_LIMIT</code> &mdash; per-user free-tier coding solves /day.</li>
          <li><code>DAILY_FREE_LIMIT</code> &mdash; general per-user free-tier daily cap.</li>
          <li><code>CONTEXT_TURNS</code> &mdash; conversation context window depth.</li>
          <li><code>ANSWER_CACHE_TTL_SECONDS</code> &mdash; Redis answer-cache TTL.</li>
          <li><code>AI_HOURS_SEC_PER_1K_OUT</code> &mdash; token-to-seconds conversion. Default 20.</li>
          <li><code>AI_HOURS_SEC_PER_1K_IN</code> &mdash; default 2.</li>
          <li><code>CLAUDE_MODEL</code> &mdash; free-tier model. Default
            <code className="mx-1">claude-haiku-4-5-20251001</code>.</li>
          <li><code>CLAUDE_MODEL_PAID</code> &mdash; paid-tier model. Default
            <code className="mx-1">claude-sonnet-4-6</code>.</li>
        </ul>

        <h3 className="text-base font-bold mt-4 mb-2">Misc / 3rd-party</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>GITHUB_TOKEN</code> &mdash; for repo / engineering-blog scraping features.</li>
          <li><code>ERASER_API_KEY</code> &mdash; if Eraser.io diagrams are configured (alongside
            Graphviz).</li>
          <li><code>ELECTRON_RUN_AS_NODE</code> &mdash; Electron build helper.</li>
        </ul>
      </section>

      <section id="lumora-backend" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">Lumora backend</h2>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          The standalone Lumora deployment is now legacy &mdash; production frontends call
          ascend-backend for the Lumora data plane. The Lumora-backend env vars are largely a
          subset of ascend-backend&apos;s: <code>DATABASE_URL</code>, <code>REDIS_URL</code>,
          <code>JWT_SECRET</code>, <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>,
          <code>DEEPGRAM_API_KEY</code>, <code>AI_SERVICES_URL</code>,
          <code>AI_SERVICES_API_KEY</code>, <code>JOBS_DATABASE_URL</code>,
          <code>GITHUB_TOKEN</code>, <code>ALLOWED_ORIGINS</code>, <code>LOG_LEVEL</code>, plus the
          <code>MAX_TOKENS_*</code> / <code>FREE_CODING_DAILY_LIMIT</code> / <code>DAILY_FREE_LIMIT</code> /
          <code>CONTEXT_TURNS</code> tunables.
        </p>
      </section>

      <section id="ai-services" className="mb-10 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-3">AI services (FastAPI)</h2>
        <ul className="list-disc pl-6 space-y-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          <li><code>ANTHROPIC_API_KEY</code> &mdash; used by the Python diagram engine.</li>
          <li><code>AI_SERVICES_API_KEY</code> &mdash; <strong>required</strong>. Every non-<code>/health</code>
            request must carry a matching <code>X-API-Key</code> header or it&apos;s rejected. Generate
            with <code>openssl rand -hex 32</code>; set the same value on
            ascend-backend / lumora-backend so they can call ai-services.</li>
          <li><code>AI_SERVICES_CORS_ORIGINS</code> &mdash; comma-separated CORS whitelist.</li>
          <li><code>AI_SERVICES_DEV_OPEN</code> &mdash; dev-only flag to relax the API-key gate.
            Never set in prod.</li>
          <li><code>PORT</code> &mdash; bound port (default <code>8001</code>).</li>
        </ul>
        <DocsCallout variant="warning">
          The speaker similarity threshold is <strong>not</strong> env-tuned. Diarization uses
          <code className="mx-1">0.55</code> (sliding-window) and the verify endpoint uses
          <code className="mx-1">0.75</code>, both hard-coded in
          <code className="mx-1">apps/ai-services/speaker.py</code>. Whisper is invoked from the
          Node backends, not from ai-services &mdash; there is no <code>WHISPER_MODEL</code> env var.
        </DocsCallout>
      </section>
    </DocsPageLayout>
  );
}
