import DocsPageLayout from '../_layout';
import DocsCallout from '../../../components/shared/docs/DocsCallout';
import DocsTable from '../../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };
const ic = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 12.5,
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
} as const;
const codeBlock = {
  display: 'block' as const,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '14px 16px',
  fontSize: 12.5,
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
  color: 'var(--text-primary)',
  overflowX: 'auto' as const,
  lineHeight: 1.7,
  marginBottom: 16,
  whiteSpace: 'pre' as const,
};

export default function AdminPlaygroundPage() {
  return (
    <DocsPageLayout
      title="Playground — Engineering Reference"
      description="Admin runbook for the Playground feature: system architecture, session lifecycle, SSH Docker orchestration, WebSocket and IDE proxies, VM save/restore, boot progress protocol, issues faced and resolved, and design decisions."
      path="/docs/admin/playground"
      eyebrow="ADMIN RUNBOOK"
      breadcrumbs={[{ label: 'Admin', to: '/docs/admin' }, { label: 'Playground' }]}
      onThisPage={[
        { id: 'overview', label: 'Overview' },
        { id: 'components', label: 'System components' },
        { id: 'session-lifecycle', label: 'Session lifecycle' },
        { id: 'ssh-docker', label: 'SSH Docker orchestration' },
        { id: 'ws-proxy', label: 'WebSocket proxy (ttyd)' },
        { id: 'ide-proxy', label: 'IDE proxy (code-server)' },
        { id: 'boot-progress', label: 'Boot progress & SSE' },
        { id: 'save-restore', label: 'VM save/restore (R2)' },
        { id: 'custom-env', label: 'Custom environment builder' },
        { id: 'frontend', label: 'Frontend architecture' },
        { id: 'issues', label: 'Issues faced & solutions' },
        { id: 'design-decisions', label: 'Design decisions' },
        { id: 'env-vars', label: 'Environment variables' },
        { id: 'key-files', label: 'Key files' },
      ]}
    >
      {/* ─── Overview ─────────────────────────────────────────────────── */}
      <section id="overview" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Overview</h2>
        <p className={bodyP} style={bodyColor}>
          The Playground is a three-tab product at <span style={ic}>/playground</span>:
          a Container tab (disposable Linux VMs with browser terminal + VS Code IDE), a Coding
          tab (static server-side code execution), and a SQL tab (browser SQL sandbox). The
          Container tab is the primary feature and the most complex.
        </p>
        <p className={bodyP} style={bodyColor}>
          The entire Container tab is served by a dedicated Express 5 backend service
          (<span style={ic}>playground-backend</span>, port 3010) deployed on Railway.
          It orchestrates Docker containers on a single Linode worker node over SSH, proxies
          WebSocket traffic to <span style={ic}>ttyd</span> (terminal), and reverse-proxies
          HTTP/WS to <span style={ic}>code-server</span> (VS Code IDE).
        </p>
        <p className={bodyP} style={bodyColor}>
          The Coding tab&apos;s code execution endpoints (<span style={ic}>/run</span>,{' '}
          <span style={ic}>/lint</span>, <span style={ic}>/format</span>,{' '}
          <span style={ic}>/explain</span>) are also served by playground-backend and run
          code directly on the Railway process — not in a container VM.
        </p>
        <DocsCallout variant="warning">
          Despite the filename, <strong>nomadClient.js contains zero Nomad API calls</strong>. The
          implementation was rewritten to use direct SSH/Docker. The "Nomad" name is a historical
          artifact from an earlier design that was never shipped.
        </DocsCallout>
      </section>

      {/* ─── System components ────────────────────────────────────────── */}
      <section id="components" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>System components</h2>
        <DocsTable
          columns={[
            { key: 'component', header: 'Component' },
            { key: 'tech', header: 'Technology' },
            { key: 'role', header: 'Role' },
          ]}
          rows={[
            { component: 'playground-backend', tech: 'Express 5, Node.js, ESM', role: 'API server: session management, WebSocket proxy to ttyd, HTTP proxy to code-server, code execution, VM saves.' },
            { component: 'Worker node', tech: 'Linode VPS, Docker Engine', role: 'Runs all container sessions. One fixed host. Managed via SSH from playground-backend.' },
            { component: 'Container images', tech: 'Docker Hub (chundubabu/pg-*)', role: 'One image per environment. Entrypoint emits progress markers parsed by backend SSE.' },
            { component: 'ttyd', tech: 'ttyd binary, port 7681', role: 'Browser terminal server running inside each container. Binary WebSocket protocol.' },
            { component: 'code-server', tech: 'VS Code in browser, port 8080', role: 'VS Code web IDE running inside each container. Proxied through /pg-ide.' },
            { component: 'Cloudflare R2', tech: 'S3-compatible object storage', role: 'VM snapshot storage. Data streams directly worker→R2 via presigned PUT — never through backend.' },
            { component: 'Redis', tech: 'ioredis (in-memory fallback)', role: 'Session TTL keys. Optional — cleanup cron uses Postgres as source of truth.' },
            { component: 'PostgreSQL', tech: 'pg pool, shared-db pattern', role: 'playground_sessions and playground_saved_vms tables. Source of truth for all session state.' },
          ]}
        />

        <h3 className={sectionH3}>Container image catalog</h3>
        <DocsTable
          columns={[
            { key: 'id', header: 'Environment ID' },
            { key: 'image', header: 'Docker image' },
            { key: 'plan', header: 'Plan' },
            { key: 'mem', header: 'Memory' },
          ]}
          rows={[
            { id: 'ubuntu', image: 'chundubabu/pg-ubuntu:latest', plan: 'Free', mem: '512 MB' },
            { id: 'docker', image: 'chundubabu/pg-docker:latest', plan: 'Free', mem: '1 GB' },
            { id: 'custom', image: 'chundubabu/pg-ubuntu:latest', plan: 'Free', mem: '512 MB + setup script' },
            { id: 'etcd-single', image: 'chundubabu/pg-etcd-single:latest', plan: 'Free', mem: '512 MB' },
            { id: 'agent-sandbox', image: 'chundubabu/pg-agent-sandbox:latest', plan: 'Pro', mem: '1.5 GB' },
            { id: 'k8s-single', image: 'chundubabu/pg-k8s-single:latest', plan: 'Pro', mem: '2 GB' },
            { id: 'k8s-multi', image: 'chundubabu/pg-k8s-multi:latest', plan: 'Pro', mem: '4 GB' },
            { id: 'cloud-cli', image: 'chundubabu/pg-cloud-cli:latest', plan: 'Pro', mem: '1.5 GB' },
            { id: 'etcd-cluster', image: 'chundubabu/pg-etcd-cluster:latest', plan: 'Pro', mem: '1 GB (×3 nodes)' },
          ]}
        />

        <h3 className={sectionH3}>Cluster environments (etcd-cluster)</h3>
        <p className={bodyP} style={bodyColor}>
          The <span style={ic}>etcd-cluster</span> environment is a multi-container session: one
          coordinator container (the user&apos;s shell) and three etcd node containers, all on a
          shared Docker bridge network <span style={ic}>etcd-cluster-&lt;sessionId&gt;</span>.
          The coordinator gets a ttyd terminal and code-server IDE; etcd nodes are headless. The
          backend creates all four containers via SSH and stores node container IDs in a
          <span style={ic}>playground_cluster_nodes</span> table for cleanup.
        </p>
      </section>

      {/* ─── Session lifecycle ────────────────────────────────────────── */}
      <section id="session-lifecycle" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Session lifecycle</h2>

        <h3 className={sectionH3}>Create — single-node (<span style={ic}>POST /api/v1/playground/sessions</span>)</h3>
        <code style={codeBlock}>{`jwtAuth → resolve userId + plan_type from ascend_subscriptions
  ↓
sessionManager.createSession()
  ├─ isOwner(email) — OWNER_EMAILS env bypass (unlimited)
  ├─ Free tier: only ubuntu/docker/custom/etcd-single allowed
  ├─ Free tier: max 1 session per 24 hours
  ├─ scheduleJob(sessionId, environment) → SSH: docker run -d --rm --pull=always \\
  │     --memory=<MB>m -p 0:7681 -p 0:8080 chundubabu/pg-<env>:latest
  │     → returns containerId (12+ char hex)
  ├─ getTaskAddress(containerId) → poll docker port <id> 7681/8080 every 500ms
  │     up to 60s timeout → { host, ttydPort, codeServerPort }
  ├─ INSERT INTO playground_sessions (status='provisioning')
  ├─ UPDATE status='ready'
  └─ setTTL(sessionId, 3600) → Redis playground:session:<id>:ttl
Response: { sessionId, wsUrl, expiresAt, environment }`}</code>

        <h3 className={sectionH3}>Create — cluster (etcd-cluster)</h3>
        <code style={codeBlock}>{`createClusterSession(userId, 'etcd-cluster')
  ├─ SSH: docker network create etcd-cluster-<sessionId>
  ├─ For each of 3 nodes: docker run --name etcd-<sessionId>-N --network ...
  ├─ For coordinator: docker run --network ... -p 0:7681 -p 0:8080 chundubabu/pg-etcd-cluster
  ├─ INSERT INTO playground_sessions + INSERT INTO playground_cluster_nodes (×3)
  └─ Response includes per-node addresses for monitoring`}</code>

        <h3 className={sectionH3}>Boot progress (<span style={ic}>GET /sessions/:id/events</span>)</h3>
        <p className={bodyP} style={bodyColor}>
          SSE stream. Backend SSHes to the worker and tails{' '}
          <span style={ic}>docker logs -f &lt;containerId&gt;</span>. Container entrypoint
          emits <span style={ic}>__PROGRESS__:&lt;json&gt;</span> lines. Synthetic sub-steps fire
          at 2 s, 8 s, 18 s, 32 s, 52 s. A hard 90-second deadline fires{' '}
          <span style={ic}>{'{ type: "ready" }'}</span> regardless.
        </p>

        <h3 className={sectionH3}>Status state machine</h3>
        <code style={codeBlock}>{`provisioning → ready → active → destroyed
                          ↑
                    (extend: status='active', extended=true)`}</code>

        <h3 className={sectionH3}>Destroy</h3>
        <p className={bodyP} style={bodyColor}>
          Explicit: <span style={ic}>DELETE /api/v1/playground/sessions/:id</span> →
          SSH <span style={ic}>docker stop &lt;id&gt;</span> + network removal for clusters →
          status=&apos;destroyed&apos; → clear Redis TTL.
        </p>
        <p className={bodyP} style={bodyColor}>
          Automatic: A <span style={ic}>setInterval</span> every 5 minutes queries Postgres for
          sessions where <span style={ic}>expires_at &lt; NOW() - INTERVAL &apos;2 minutes&apos;</span>.
          The 2-minute grace prevents clock-skew races.
        </p>
      </section>

      {/* ─── SSH Docker orchestration ─────────────────────────────────── */}
      <section id="ssh-docker" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>SSH Docker orchestration</h2>
        <p className={bodyP} style={bodyColor}>
          All container operations are remote Docker commands executed over SSH via the{' '}
          <span style={ic}>ssh2</span> library. No connection pooling — every command opens
          a fresh SSH connection, runs one command, and closes.
        </p>

        <DocsTable
          columns={[
            { key: 'param', header: 'Parameter' },
            { key: 'env', header: 'Env var' },
            { key: 'default', header: 'Default' },
          ]}
          rows={[
            { param: 'Host', env: 'WORKER_HOST', default: '172.104.210.63' },
            { param: 'Port', env: 'WORKER_SSH_PORT', default: '20022' },
            { param: 'User', env: 'WORKER_USER', default: 'pgrunner' },
            { param: 'Private key', env: 'WORKER_SSH_KEY_B64', default: '(required) base64-encoded PEM' },
          ]}
        />

        <h3 className={sectionH3}>Key SSH commands</h3>
        <code style={codeBlock}>{`# Start single container
docker run -d --rm --pull=always --memory=<MB>m \\
  --hostname playground-<env> -e SESSION_ID=<userId>-<hex> \\
  -p 0:7681 -p 0:8080 chundubabu/pg-<environment>:latest

# Poll for assigned ports (retries every 500ms, up to 60s)
docker port <containerId> 7681
docker port <containerId> 8080

# Stop container
docker stop <containerId>

# Stream logs for SSE boot progress
docker logs -f <containerId>

# Save VM snapshot to R2 (streams entirely worker→R2)
docker export <containerId> | curl -sf -X PUT -T - "<R2 presigned URL>"

# Restore snapshot and launch
curl "<R2 presigned GET URL>" | docker import - "camora-saved-<saveId>:latest"
docker run -d --rm --memory=<MB>m ... camora-saved-<saveId>:latest`}</code>

        <DocsCallout variant="warning">
          The worker is a single fixed host — there is no multi-node scheduling, load balancing,
          or failover. All sessions run on one Linode VPS. This is a known scale constraint.
        </DocsCallout>

        <h3 className={sectionH3}>Shell injection protection</h3>
        <p className={bodyP} style={bodyColor}>
          <span style={ic}>vmSaver.js</span> validates all values interpolated into SSH commands
          through a strict allowlist regex:{' '}
          <span style={ic}>{'/^[a-zA-Z0-9][a-zA-Z0-9_.\\-:/]*$/'}</span>. Covers containerId,
          r2Key, and imageTag. <span style={ic}>nomadClient.js</span> interpolates sessionId and
          environment from validated DB values (low risk, but ideally both should use the validator).
        </p>
      </section>

      {/* ─── WebSocket proxy ──────────────────────────────────────────── */}
      <section id="ws-proxy" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>WebSocket proxy (ttyd terminal)</h2>
        <p className={bodyP} style={bodyColor}>
          Upgrade path:{' '}
          <span style={ic}>server.on(&apos;upgrade&apos;)</span> → matches{' '}
          <span style={ic}>/playground/ws/&lt;uuid&gt;</span> →{' '}
          <span style={ic}>wss.handleUpgrade</span> → JWT auth + session lookup →{' '}
          <span style={ic}>createTtydProxy()</span> in <span style={ic}>wsProxy.js</span>.
        </p>

        <h3 className={sectionH3}>ttyd binary protocol</h3>
        <DocsTable
          columns={[
            { key: 'direction', header: 'Direction' },
            { key: 'byte', header: 'Byte[0]' },
            { key: 'meaning', header: 'Meaning' },
          ]}
          rows={[
            { direction: 'Receive', byte: '0x30 ("0")', meaning: 'Terminal output — remaining bytes written to xterm' },
            { direction: 'Receive', byte: '0x31 ("1")', meaning: 'Window title — ignored' },
            { direction: 'Receive', byte: '0x32 ("2")', meaning: 'Preferences — ignored' },
            { direction: 'Send on open', byte: '—', meaning: 'Text JSON: { "AuthToken": "", "columns": N, "rows": N }' },
            { direction: 'Send keystrokes', byte: '0x30', meaning: 'Prefix + UTF-8 encoded keystroke bytes' },
            { direction: 'Send resize', byte: '0x31', meaning: 'Prefix + JSON { "columns": N, "rows": N }' },
          ]}
        />

        <h3 className={sectionH3}>Retry logic</h3>
        <p className={bodyP} style={bodyColor}>
          If ttyd closes the connection within 600 ms of open (container still initializing), the
          proxy retries up to 10 times with 1200 ms delay. This handles the race between port
          availability and ttyd readiness.
        </p>

        <h3 className={sectionH3}>Keepalive</h3>
        <p className={bodyP} style={bodyColor}>
          Both sides (browser WS and ttyd WS) receive a <span style={ic}>ping()</span> every
          30 seconds. Closing either side terminates the other and clears the keepalive interval.
        </p>
      </section>

      {/* ─── IDE proxy ────────────────────────────────────────────────── */}
      <section id="ide-proxy" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>IDE proxy (code-server)</h2>
        <p className={bodyP} style={bodyColor}>
          The <span style={ic}>/pg-ide/*</span> route is an inline HTTP reverse proxy to
          code-server on port 8080 of the container.
        </p>

        <h3 className={sectionH3}>Auth flow</h3>
        <p className={bodyP} style={bodyColor}>
          First request: <span style={ic}>_t</span> or <span style={ic}>token</span> query param
          (JWT) OR <span style={ic}>cariara_sso</span> cookie. Sets a{' '}
          <span style={ic}>pg_ide</span> cookie (httpOnly, maxAge 3600, sameSite none, secure) to
          identify the session for subsequent asset requests. Subsequent requests (workbench.js,
          extensions, sub-resources) accepted with <span style={ic}>userId = -1</span> if the
          cookie is present, without re-validating the JWT.
        </p>

        <h3 className={sectionH3}>Header manipulation</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[15px] mb-4" style={bodyColor}>
          <li>Strips hop-by-hop headers in both directions (<span style={ic}>Connection</span>, <span style={ic}>Transfer-Encoding</span>, <span style={ic}>Keep-Alive</span>, etc.).</li>
          <li>Removes <span style={ic}>content-security-policy</span> and <span style={ic}>x-frame-options</span> from upstream (code-server sets DENY, blocking iframe embedding).</li>
          <li>Injects permissive CSP with <span style={ic}>frame-ancestors</span> limited to Camora origins.</li>
          <li>Forces <span style={ic}>accept-encoding: gzip</span> and <span style={ic}>connection: close</span> on proxied requests.</li>
        </ul>

        <h3 className={sectionH3}>WebSocket upgrade for IDE</h3>
        <p className={bodyP} style={bodyColor}>
          IDE WebSocket upgrades use raw <span style={ic}>net.connect()</span> — not through the
          WebSocketServer. The backend manually reconstructs the HTTP upgrade handshake and pipes
          both directions. This avoids WebSocket framing overhead that would interfere with
          code-server&apos;s own WS protocol.
        </p>
      </section>

      {/* ─── Boot progress ────────────────────────────────────────────── */}
      <section id="boot-progress" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Boot progress &amp; SSE protocol</h2>

        <h3 className={sectionH3}>Container entrypoint markers</h3>
        <p className={bodyP} style={bodyColor}>
          Container images emit <span style={ic}>__PROGRESS__:&lt;json&gt;</span> to stdout.
          Backend tails via <span style={ic}>docker logs -f</span> and converts to SSE events.
          Steps: <span style={ic}>container_ready</span>, <span style={ic}>env_setup</span>,{' '}
          <span style={ic}>ide_start</span>, <span style={ic}>terminal_ready</span>.
        </p>

        <h3 className={sectionH3}>##PG## tool marker protocol (Deploy Your Container)</h3>
        <code style={codeBlock}>{`echo '##PG##{"tool":"node","label":"Node.js","status":"checking"}'
command -v node && echo '##PG##{"tool":"node","label":"Node.js","status":"skipped"}' \\
  || { echo '##PG##{"tool":"node","label":"Node.js","status":"installing"}'; install...; \\
       echo '##PG##{"tool":"node","label":"Node.js","status":"done"}'; }

# Final sentinel
echo '##PG##{"tool":"__done__","label":"Setup complete","status":"done"}'`}</code>
        <p className={bodyP} style={bodyColor}>
          Backend parses <span style={ic}>##PG##</span> lines and emits them as{' '}
          <span style={ic}>tool_*</span> SSE events. BootProgress renders them as individual
          tool rows.
        </p>

        <h3 className={sectionH3}>Synthetic fallback timers</h3>
        <p className={bodyP} style={bodyColor}>
          Sub-step events fire at 2 s, 8 s, 18 s, 32 s, 52 s under the{' '}
          <span style={ic}>env_setup</span> step. A 90-second hard deadline fires{' '}
          <span style={ic}>{'{ type: "ready" }'}</span> as final fallback.
        </p>
      </section>

      {/* ─── Save/restore ─────────────────────────────────────────────── */}
      <section id="save-restore" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>VM save/restore (R2 direct streaming)</h2>
        <p className={bodyP} style={bodyColor}>
          Container filesystem data <em>never flows through the Railway backend</em>. The worker
          node streams data directly to R2 using a presigned PUT URL.
        </p>

        <h3 className={sectionH3}>Save flow</h3>
        <code style={codeBlock}>{`POST /api/v1/playground/saves
  → Plan check (paid only; slotsMax = 0 for free)
  → presignPut(r2Key, 7200)  — 2-hour upload window
  → SSH: docker export <containerId> | curl -sf -X PUT -T - "<presignedUrl>"
  → headObject(r2Key) → sizeBytes
  → INSERT INTO playground_saved_vms WHERE (SELECT COUNT(*)) < slots
     0 rows inserted → slot limit → delete R2 object → 429`}</code>

        <h3 className={sectionH3}>Restore flow</h3>
        <code style={codeBlock}>{`POST /api/v1/playground/saves/:id/restore
  → Check no active session (409 if found)
  → presignGet(r2Key, 3600)
  → SSH: curl "<presignedUrl>" | docker import - "camora-saved-<saveId>:latest"
  → SSH: docker run -d --rm --memory=<MB>m ... camora-saved-<saveId>:latest
  → getTaskAddress() — port polling
  → createSessionRecord() + updateSessionStatus('ready') + setTTL(3600)
  → UPDATE playground_saved_vms SET last_restored_at=NOW()
  → deleteVmImage(imageTag) — fire-and-forget local image cleanup`}</code>

        <h3 className={sectionH3}>Atomic slot enforcement</h3>
        <p className={bodyP} style={bodyColor}>
          The INSERT uses a subquery to count existing saves atomically:{' '}
          <span style={ic}>INSERT ... WHERE (SELECT COUNT(*)) &lt; slots</span>. Prevents TOCTOU
          race when two save requests arrive simultaneously for a user at their slot limit.
        </p>
      </section>

      {/* ─── Custom environment builder ───────────────────────────────── */}
      <section id="custom-env" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Custom environment builder (Deploy Your Container)</h2>
        <p className={bodyP} style={bodyColor}>
          <strong>ToolPickerPanel</strong> generates a Bash setup script from the user&apos;s
          tool selection. The script is passed as <span style={ic}>SCENARIO_ID</span> environment
          variable to the container, which the entrypoint runs post-boot. If no tools are
          selected, <span style={ic}>setupScript</span> is null and the session starts as a plain
          Ubuntu session.
        </p>
        <p className={bodyP} style={bodyColor}>
          Each tool block follows this pattern:
        </p>
        <code style={codeBlock}>{`pg() { echo "##PG##$1"; }
set -euo pipefail

pg '{"tool":"node","label":"Node.js","status":"checking"}'
if ! command -v node &>/dev/null; then
  pg '{"tool":"node","label":"Node.js","status":"installing"}'
  # ... install commands ...
  pg '{"tool":"node","label":"Node.js","status":"done"}'
else
  pg '{"tool":"node","label":"Node.js","status":"skipped"}'
fi

pg '{"tool":"__done__","label":"Setup complete","status":"done"}'`}</code>
      </section>

      {/* ─── Frontend architecture ────────────────────────────────────── */}
      <section id="frontend" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Frontend architecture</h2>

        <h3 className={sectionH3}>Component hierarchy</h3>
        <code style={codeBlock}>{`PlaygroundPage  (/playground?tab=vm|code|sql)
├── tab=vm   → PlaygroundShell (all container session state)
│              ├── usePlaygroundSession (hook — all API calls, timers, SSE)
│              ├── EnvironmentPicker (9-card grid, plan gating, owner bypass)
│              ├── BootProgress (SSE event visualizer)
│              ├── IdePane (code-server iframe)
│              ├── TerminalPane (xterm.js + ttyd WebSocket)
│              ├── ToolPickerPanel (custom setup drawer + script generator)
│              └── SavedVmsPanel (VM snapshot list, hidden for free tier)
├── tab=code → PlaygroundLayout (Monaco editor + server-side execution)
└── tab=sql  → SQLPlayground (browser SQL sandbox)`}</code>

        <h3 className={sectionH3}>PlaygroundShell state machine</h3>
        <DocsTable
          columns={[
            { key: 'condition', header: 'Condition' },
            { key: 'renders', header: 'What renders' },
          ]}
          rows={[
            { condition: 'isLoading (creating or booting)', renders: 'Dark title bar with spinner + BootProgress component' },
            { condition: 'showTerminal (active, not minimized)', renders: 'Dark title bar + tab bar + IdePane/TerminalPane; Save VM overlay if open' },
            { condition: 'showIdle (idle, error, or minimized)', renders: 'Light two-column layout: left panel (env preview) + right panel (EnvironmentPicker + SavedVmsPanel + Start button)' },
            { condition: 'Always', renders: 'ToolPickerPanel (rendered always, visibility via open prop)' },
          ]}
        />

        <h3 className={sectionH3}>usePlaygroundSession hook</h3>
        <ul className="list-disc pl-6 space-y-1.5 text-[15px] mb-4" style={bodyColor}>
          <li><strong>Session persistence:</strong> saves <span style={ic}>{`{sessionId, environment, expiresAt}`}</span> to <span style={ic}>camora_pg_session</span> localStorage. Re-validates on mount.</li>
          <li><strong>SSE boot:</strong> subscribes to <span style={ic}>/sessions/:id/events</span>; upserts steps by key into <span style={ic}>bootSteps[]</span>; aborts on <span style={ic}>type=&apos;ready&apos;</span>.</li>
          <li><strong>Fallback polling:</strong> if SSE fetch fails, polls <span style={ic}>/sessions/:id</span> every 5 seconds for up to 3 minutes.</li>
          <li><strong>Computed URLs:</strong> wsUrl and ideUrl embed the current JWT at render time to avoid stale token issues.</li>
          <li><strong>extendAvailable:</strong> true when under 5 min remain and session not yet extended.</li>
        </ul>

        <h3 className={sectionH3}>Theme integration</h3>
        <DocsTable
          columns={[
            { key: 'area', header: 'Area' },
            { key: 'theme', header: 'Theme approach' },
          ]}
          rows={[
            { area: 'PlaygroundPage header (tab bar)', theme: 'var(--cam-hero-strip) + var(--cam-gold-leaf) border + shared .tab-group classes' },
            { area: 'Idle/picker layout (two-column)', theme: 'CSS variables: var(--bg-base), var(--bg-elevated), var(--border), var(--text-primary), var(--text-secondary)' },
            { area: 'Active terminal chrome', theme: 'Hardcoded dark #0d1117 / #161b22 — always dark regardless of site theme' },
            { area: 'TerminalPane + BootProgress', theme: 'Hardcoded dark #0a0a0a, #0d1117 — terminal emulators are always dark' },
            { area: 'EnvironmentPicker + SavedVmsPanel', theme: 'CSS variables — fully theme-aware' },
            { area: 'ToolPickerPanel', theme: 'Hardcoded dark — consistent with terminal drawer aesthetic' },
          ]}
        />
      </section>

      {/* ─── Issues faced ─────────────────────────────────────────────── */}
      <section id="issues" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Issues faced &amp; how they were solved</h2>

        <h3 className={sectionH3}>1. Railway workspace package resolution</h3>
        <p className={bodyP} style={bodyColor}>
          Railway&apos;s Nixpacks builder cannot resolve pnpm workspace links
          (<span style={ic}>@camora/shared-auth</span>, <span style={ic}>@camora/shared-db</span>)
          for isolated service builds.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Copied minimal DB pool and JWT verify logic into local
          <span style={ic}>src/lib/auth.js</span> and <span style={ic}>src/lib/db.js</span>,
          removing all workspace package references.
        </p>

        <h3 className={sectionH3}>2. WebSocket path routing bug</h3>
        <p className={bodyP} style={bodyColor}>
          The WS upgrade handler was forwarding the full frontend request URL path to ttyd instead
          of connecting to the ttyd root endpoint, causing all WebSocket connections to fail.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> <span style={ic}>wsProxy.js</span> opens a fresh{' '}
          <span style={ic}>ws://host:port</span> connection to ttyd directly, independent of the
          request path.
        </p>

        <h3 className={sectionH3}>3. ttyd immediate-close race condition</h3>
        <p className={bodyP} style={bodyColor}>
          After a container starts, ttyd needs ~100–500 ms to accept WebSocket connections. First
          connection attempt would get closed within 600 ms, showing a disconnected terminal
          immediately after the boot screen.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> <span style={ic}>wsProxy.js</span> detects immediate-close
          (elapsed &lt; 600 ms) and retries up to 10 times with 1200 ms delay.
        </p>

        <h3 className={sectionH3}>4. pg-ide proxy returning 500 (hop-by-hop headers + CSP)</h3>
        <p className={bodyP} style={bodyColor}>
          Proxy was passing through <span style={ic}>Connection</span>,{' '}
          <span style={ic}>Transfer-Encoding</span>, and other hop-by-hop headers, causing
          code-server to reject with 500. Additionally, code-server&apos;s{' '}
          <span style={ic}>X-Frame-Options: DENY</span> blocked iframe embedding.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Defined <span style={ic}>HOP_BY_HOP</span> Set and filtered in
          both directions. Forcibly deleted <span style={ic}>content-security-policy</span> and
          <span style={ic}>x-frame-options</span> from proxied responses. Injected permissive
          <span style={ic}>frame-ancestors</span> CSP. Added <span style={ic}>accept-encoding: gzip</span>.
        </p>

        <h3 className={sectionH3}>5. EnvironmentPicker owner bypass missing</h3>
        <p className={bodyP} style={bodyColor}>
          The <span style={ic}>isPro</span> check was not recognizing the owner email, blocking
          pro environments even for the owner account.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Imported <span style={ic}>isOwner()</span> from{' '}
          <span style={ic}>@/lib/owner</span> and short-circuited:{' '}
          <span style={ic}>const isPro = isOwner(user) || PAID_PLANS.has(userPlan)</span>.
        </p>

        <h3 className={sectionH3}>6. Frozen UI for slow containers</h3>
        <p className={bodyP} style={bodyColor}>
          Container startup could take 30–90 seconds with no visible progress if the entrypoint
          did not emit progress markers (e.g. during first-pull or heavy initialization).
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Synthetic timer sub-steps at 2 s, 8 s, 18 s, 32 s, 52 s.
          90-second hard deadline fires <span style={ic}>ready</span> as final fallback.
        </p>

        <h3 className={sectionH3}>7. Frontend API URL misconfiguration</h3>
        <p className={bodyP} style={bodyColor}>
          Hook initially read only <span style={ic}>VITE_CAPRA_API_URL</span> (ascend-backend on
          port 3009). The playground-backend is a separate service.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Added <span style={ic}>VITE_PLAYGROUND_API_URL</span> env var,
          set in Vercel to point to the Railway playground-backend.
        </p>

        <h3 className={sectionH3}>8. etcd cluster network isolation</h3>
        <p className={bodyP} style={bodyColor}>
          Initial etcd cluster design used host networking, which caused port conflicts between
          concurrent cluster sessions.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Each cluster session gets its own Docker bridge network named{' '}
          <span style={ic}>etcd-cluster-&lt;sessionId&gt;</span>. Node containers communicate
          by container name within the network. The coordinator container joins the same network.
        </p>

        <h3 className={sectionH3}>9. Nomad design abandoned pre-launch</h3>
        <p className={bodyP} style={bodyColor}>
          The original design planned to use HashiCorp Nomad for scheduling containers across
          multiple workers. Nomad was removed before any containers shipped — the API integration
          was never completed. <span style={ic}>nomadClient.js</span> was renamed from a planned
          Nomad client to the SSH/Docker orchestrator without a file rename.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Decision:</strong> Direct SSH/Docker on a single VPS. Sufficient for current
          scale, zero cluster management overhead.
        </p>

        <h3 className={sectionH3}>10. VM save slot TOCTOU race</h3>
        <p className={bodyP} style={bodyColor}>
          Two concurrent save requests from a user at their slot limit could both pass the slot
          check before either INSERT completed, allowing one extra save slot.
        </p>
        <p className={bodyP} style={bodyColor}>
          <strong>Fix:</strong> Atomic conditional INSERT:{' '}
          <span style={ic}>INSERT ... WHERE (SELECT COUNT(*) FROM ...) &lt; slots</span>. Zero
          rows inserted = slot limit reached, triggers 429 + R2 object cleanup.
        </p>
      </section>

      {/* ─── Design decisions ─────────────────────────────────────────── */}
      <section id="design-decisions" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Design decisions &amp; comparisons</h2>

        <h3 className={sectionH3}>SSH/Docker vs Nomad vs Kubernetes</h3>
        <p className={bodyP} style={bodyColor}>
          Direct SSH/Docker chosen over Nomad or Kubernetes because: single VPS with Docker
          installed, zero cluster management, sufficient capacity at current scale. Trade-off:
          SSH-per-call adds ~100–200 ms per operation; no automatic failover to another host.
        </p>

        <h3 className={sectionH3}>R2 direct streaming vs backend relay</h3>
        <p className={bodyP} style={bodyColor}>
          VM snapshots can be 500 MB–5 GB. Routing through Railway would exhaust memory limits.
          Presigned URLs let the worker stream <span style={ic}>docker export</span> output
          directly to R2 — the backend only generates the URL and reads the final size.
        </p>

        <h3 className={sectionH3}>IdePane display:none vs unmount</h3>
        <p className={bodyP} style={bodyColor}>
          Both IDE and terminal panes are mounted while a session is active; CSS{' '}
          <span style={ic}>display: none</span> hides the inactive one. Unmounting the IDE iframe
          on tab switch would lose VS Code session state (open files, editor state, terminal
          history). Display-toggle preserves iframe state across switches.
        </p>

        <h3 className={sectionH3}>Redis optional with in-memory fallback</h3>
        <p className={bodyP} style={bodyColor}>
          Session TTL keys in Redis are hints, not source of truth. The cleanup cron queries
          Postgres directly every 5 minutes, so losing Redis TTL on a restart has no correctness
          impact.
        </p>

        <h3 className={sectionH3}>pg_ide cookie auth bypass</h3>
        <p className={bodyP} style={bodyColor}>
          After the first authenticated request to <span style={ic}>/pg-ide</span>, an httpOnly
          <span style={ic}>pg_ide</span> cookie is set. Subsequent requests (50+ VS Code
          sub-resources) accepted without re-validating the JWT. Intentional — embedding the JWT
          in every asset URL would produce very long URLs and complicate code-server&apos;s
          internal routing.
        </p>

        <h3 className={sectionH3}>Comparison with iximiuz Labs</h3>
        <DocsTable
          columns={[
            { key: 'feature', header: 'Feature' },
            { key: 'camora', header: 'Camora Playground' },
            { key: 'iximiuz', header: 'iximiuz Labs' },
          ]}
          rows={[
            { feature: 'Infrastructure', camora: 'Single Linode VPS, SSH/Docker', iximiuz: 'Multi-node Kubernetes (GKE assumed)' },
            { feature: 'Terminal', camora: 'ttyd in container, WS proxy', iximiuz: 'ttyd or similar, split-view layout' },
            { feature: 'IDE', camora: 'code-server (VS Code) in container', iximiuz: 'VS Code web (code-server or similar)' },
            { feature: 'Node provisioning', camora: 'Static Docker containers, cluster via bridge network', iximiuz: 'Dynamic node add/remove via Firecracker/KVM' },
            { feature: 'VM save/restore', camora: 'docker export/import → R2', iximiuz: 'Not publicly documented' },
            { feature: 'Session duration', camora: '60 min (extendable once)', iximiuz: 'Varies by lab (typically 60–120 min)' },
            { feature: 'Multi-node clusters', camora: 'Docker bridge networks (etcd, future k8s)', iximiuz: 'Full VM-level isolation per node' },
            { feature: 'Boot progress', camora: 'SSE with ##PG## markers + synthetic fallback', iximiuz: 'Loading screen, no step-level progress' },
          ]}
        />
      </section>

      {/* ─── Environment variables ────────────────────────────────────── */}
      <section id="env-vars" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Environment variables</h2>
        <DocsTable
          columns={[
            { key: 'var', header: 'Variable' },
            { key: 'required', header: 'Required' },
            { key: 'default', header: 'Default' },
            { key: 'used', header: 'Used by' },
          ]}
          rows={[
            { var: 'PORT', required: 'No', default: '3010', used: 'index.js — listen port' },
            { var: 'JWT_SECRET / JWT_SECRET_KEY', required: 'Yes (prod)', default: '—', used: 'lib/auth.js — JWT verification' },
            { var: 'DATABASE_URL', required: 'Yes', default: '—', used: 'lib/db.js — PostgreSQL connection' },
            { var: 'REDIS_URL / REDIS_PRIVATE_URL', required: 'No', default: 'in-memory Map', used: 'services/redis.js — session TTL hints' },
            { var: 'WORKER_HOST', required: 'Yes', default: '172.104.210.63', used: 'nomadClient.js, vmSaver.js — SSH target' },
            { var: 'WORKER_SSH_PORT', required: 'No', default: '20022', used: 'All SSH callers' },
            { var: 'WORKER_USER', required: 'No', default: 'pgrunner', used: 'All SSH callers' },
            { var: 'WORKER_SSH_KEY_B64', required: 'Yes', default: '—', used: 'All SSH callers — base64-encoded PEM private key' },
            { var: 'OWNER_EMAILS', required: 'No', default: 'none', used: 'sessionManager.js — bypass daily limit + pro env gate' },
            { var: 'R2_ACCOUNT_ID', required: 'Yes (saves)', default: '—', used: 'r2Client.js' },
            { var: 'R2_ACCESS_KEY_ID', required: 'Yes (saves)', default: '—', used: 'r2Client.js' },
            { var: 'R2_SECRET_ACCESS_KEY', required: 'Yes (saves)', default: '—', used: 'r2Client.js' },
            { var: 'R2_BUCKET', required: 'Yes (saves)', default: '—', used: 'r2Client.js' },
            { var: 'ANTHROPIC_API_KEY', required: 'No', default: '—', used: 'playground.js /explain — fallback provider' },
            { var: 'GEMINI_API_KEY', required: 'No', default: '—', used: 'playground.js /explain — primary provider' },
            { var: 'OPENROUTER_API_KEY', required: 'No', default: '—', used: 'playground.js /explain — last fallback' },
            { var: 'VITE_PLAYGROUND_API_URL', required: 'Yes (frontend)', default: 'localhost:3010', used: 'usePlaygroundSession.js — API base URL' },
          ]}
        />
      </section>

      {/* ─── Key files ────────────────────────────────────────────────── */}
      <section id="key-files" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Key files</h2>
        <h3 className={sectionH3}>Backend</h3>
        <DocsTable
          columns={[
            { key: 'file', header: 'File' },
            { key: 'role', header: 'Role' },
          ]}
          rows={[
            { file: 'apps/playground-backend/src/index.js', role: 'Express server, JWT middleware, /pg-ide HTTP proxy, WS upgrade handler, 5-min cleanup cron, DB migrations' },
            { file: 'src/routes/playgroundSessions.js', role: 'Session CRUD + SSE boot progress stream' },
            { file: 'src/routes/playground.js', role: '/run, /lint, /format, /explain, /share — static code execution' },
            { file: 'src/routes/playgroundSaves.js', role: 'VM snapshot save / list / restore / delete' },
            { file: 'src/services/playground/nomadClient.js', role: 'SSH Docker orchestration: scheduleJob, getTaskAddress, stopJob, cluster network management' },
            { file: 'src/services/playground/wsProxy.js', role: 'ttyd WebSocket bridge with retry loop and keepalive' },
            { file: 'src/services/playground/sessionManager.js', role: 'Plan gating, daily limits, create/destroy/extend/cluster business logic' },
            { file: 'src/services/playground/sessionStore.js', role: 'PostgreSQL session CRUD + Redis TTL helpers + cluster node table' },
            { file: 'src/services/playground/vmSaver.js', role: 'docker export/import via SSH + R2 presigned URL generation, shell injection validation' },
            { file: 'src/services/playground/r2Client.js', role: 'Cloudflare R2 S3-compatible presigned URL factory' },
            { file: 'src/services/playground/logStreamer.js', role: 'docker logs -f over SSH → SSE event stream' },
          ]}
        />
        <h3 className={sectionH3}>Frontend</h3>
        <DocsTable
          columns={[
            { key: 'file', header: 'File' },
            { key: 'role', header: 'Role' },
          ]}
          rows={[
            { file: 'apps/camora/src/pages/PlaygroundPage.jsx', role: 'Tab router (Containers / Coding / SQL), URL param routing' },
            { file: 'src/hooks/usePlaygroundSession.js', role: 'All session state: create/destroy/extend/save/restore, SSE subscription, polling, localStorage persistence' },
            { file: 'src/components/capra/playground/PlaygroundShell.jsx', role: 'Container tab UI: idle picker, boot state, active terminal + IDE, save VM dialog' },
            { file: 'src/components/capra/playground/TerminalPane.jsx', role: 'xterm.js terminal + ttyd binary protocol WebSocket client' },
            { file: 'src/components/capra/playground/IdePane.jsx', role: 'code-server iframe — display:none toggle on tab switch to preserve state' },
            { file: 'src/components/capra/playground/BootProgress.jsx', role: 'Boot progress visualizer: 4 system steps + per-tool steps + synthetic fallback' },
            { file: 'src/components/capra/playground/EnvironmentPicker.jsx', role: '9-environment card grid with plan gating and owner bypass' },
            { file: 'src/components/capra/playground/ToolPickerPanel.jsx', role: 'Custom env picker + Bash setup script generator with ##PG## markers' },
            { file: 'src/components/capra/playground/SavedVmsPanel.jsx', role: 'VM snapshot list with restore / delete; hidden for free-tier users (slotsMax === 0)' },
            { file: 'src/hooks/useTerminalResize.js', role: 'ResizeObserver → FitAddon → ttyd resize frame on container resize' },
          ]}
        />
      </section>
    </DocsPageLayout>
  );
}
