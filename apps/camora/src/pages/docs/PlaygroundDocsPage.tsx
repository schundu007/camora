import DocsPageLayout from './_layout';
import DocsCallout from '../../components/shared/docs/DocsCallout';
import DocsTable from '../../components/shared/docs/DocsTable';

const sectionH2 = 'text-2xl font-bold mb-3 mt-2';
const sectionH3 = 'text-xl font-bold mt-7 mb-2 scroll-mt-24';
const bodyP = 'text-[15px] leading-relaxed mb-3';
const bodyColor = { color: 'var(--text-secondary)' };
const inlineCode = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 12.5,
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
};

export default function PlaygroundDocsPage() {
  return (
    <DocsPageLayout
      title="Playground"
      description="Disposable Linux containers with a browser terminal and VS Code IDE — start a session in seconds, run any language or tool, and save your environment to restore it later."
      path="/docs/playground"
      eyebrow="USER GUIDE"
      breadcrumbs={[{ label: 'Playground' }]}
      onThisPage={[
        { id: 'what-it-does', label: 'What it does' },
        { id: 'environments', label: 'Available environments' },
        { id: 'starting', label: 'Starting a session' },
        { id: 'boot', label: 'Boot progress' },
        { id: 'terminal', label: 'Using the terminal' },
        { id: 'ide', label: 'VS Code IDE' },
        { id: 'custom-setup', label: 'Custom environment setup' },
        { id: 'save-restore', label: 'Save & restore VMs' },
        { id: 'coding-tab', label: 'Coding tab' },
        { id: 'sql-tab', label: 'SQL tab' },
        { id: 'limits', label: 'Session limits & plans' },
      ]}
    >
      {/* ─── What it does ─────────────────────────────────────────────── */}
      <section id="what-it-does" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>What it does</h2>
        <p className={bodyP} style={bodyColor}>
          The Playground gives you a real disposable Linux VM in seconds — no local setup, no
          Docker installed on your machine, no lingering state. Each session runs in an isolated
          container on a cloud worker node. When the session ends or times out, the container is
          destroyed automatically.
        </p>
        <p className={bodyP} style={bodyColor}>
          Every container session includes a full browser terminal (powered by{' '}
          <span style={inlineCode}>xterm.js</span> +{' '}
          <span style={inlineCode}>ttyd</span>) and a VS Code IDE (code-server) accessible from
          the same tab — no installation required on your end.
        </p>
        <p className={bodyP} style={bodyColor}>
          The Playground tab also hosts a static code execution sandbox (Coding tab) and a SQL
          sandbox (SQL tab). These run on Camora servers rather than in a full VM and are available
          without starting a container session.
        </p>
      </section>

      {/* ─── Available environments ───────────────────────────────────── */}
      <section id="environments" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Available environments</h2>
        <p className={bodyP} style={bodyColor}>
          Choose an environment before clicking Start. Each environment is a different Docker image
          pre-loaded with the relevant tools.
        </p>
        <DocsTable
          columns={[
            { key: 'env', header: 'Environment' },
            { key: 'plan', header: 'Plan' },
            { key: 'memory', header: 'Memory' },
            { key: 'desc', header: 'Includes' },
          ]}
          rows={[
            { env: 'Ubuntu 24.04', plan: 'Free', memory: '512 MB', desc: 'Clean Ubuntu shell — bash, git, curl, wget. Good starting point for any Linux task.' },
            { env: 'Docker', plan: 'Free', memory: '1 GB', desc: 'Docker Engine + Docker Compose pre-installed. Run multi-container apps inside the VM.' },
            { env: 'Deploy Your Container', plan: 'Free', memory: '512 MB', desc: 'Ubuntu base with a custom tool picker — choose languages, DevOps tools, cloud CLIs, and DB clients before launch.' },
            { env: 'AI Agent Sandbox', plan: 'Pro', memory: '1.5 GB', desc: 'Claude Code, Codex CLI, and Gemini CLI pre-installed. Run AI coding agents directly in the terminal.' },
            { env: 'K8s Single-node', plan: 'Pro', memory: '2 GB', desc: 'Single-node Kubernetes cluster with kubeadm. kubectl and helm included.' },
            { env: 'K8s Multi-node', plan: 'Pro', memory: '4 GB', desc: '3-node Kubernetes cluster with kubeadm. Simulate real multi-node topologies.' },
            { env: 'Cloud CLI', plan: 'Pro', memory: '1.5 GB', desc: 'AWS CLI, Azure CLI, gcloud, Terraform, kubectl, helm pre-installed.' },
          ]}
        />
        <DocsCallout variant="info">
          Free-tier users can start one container session per day. Pro users have no daily session
          limit.
        </DocsCallout>
      </section>

      {/* ─── Starting a session ───────────────────────────────────────── */}
      <section id="starting" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Starting a session</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] mb-4" style={bodyColor}>
          <li>Go to <strong>/playground</strong> and select the <strong>Containers</strong> tab.</li>
          <li>Click the environment card you want (Ubuntu 24.04 is selected by default).</li>
          <li>Click <strong>Start Playground</strong>.</li>
          <li>Watch the boot progress panel — provisioning typically takes 10–30 seconds.</li>
          <li>The terminal opens automatically when the environment is ready.</li>
        </ol>
        <DocsCallout variant="tip">
          If you have a saved VM snapshot, click <strong>Restore</strong> on it instead of starting
          fresh — your saved container state is restored exactly as you left it, faster than a
          new session.
        </DocsCallout>
      </section>

      {/* ─── Boot progress ────────────────────────────────────────────── */}
      <section id="boot" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Boot progress</h2>
        <p className={bodyP} style={bodyColor}>
          After clicking Start, the boot progress panel shows four steps:
        </p>
        <DocsTable
          columns={[{ key: 'step', header: 'Step' }, { key: 'what', header: 'What happens' }]}
          rows={[
            { step: 'Container ready', what: 'Docker container is created on the worker node.' },
            { step: 'Environment setup', what: 'Container entrypoint configures the runtime. An elapsed timer shows how long this step takes.' },
            { step: 'IDE start', what: 'VS Code (code-server) starts inside the container.' },
            { step: 'Terminal ready', what: 'ttyd terminal process is ready. The terminal opens.' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          For <strong>Deploy Your Container</strong> sessions with tools selected, a second Setup
          section appears below the four system steps, showing each tool being installed in real
          time (checking, installing, done, or skipped if already present).
        </p>
        <p className={bodyP} style={bodyColor}>
          If a step takes longer than 60 seconds the elapsed timer turns red — this usually means
          the container image is being pulled for the first time and will be faster on subsequent
          starts.
        </p>
      </section>

      {/* ─── Terminal ─────────────────────────────────────────────────── */}
      <section id="terminal" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Using the terminal</h2>
        <p className={bodyP} style={bodyColor}>
          The terminal is a full <span style={inlineCode}>xterm.js</span> emulator connected to a{' '}
          <span style={inlineCode}>ttyd</span> process running inside the container. You have a
          real root shell — everything works the same as a local terminal.
        </p>

        <h3 className={sectionH3}>Controls</h3>
        <DocsTable
          columns={[{ key: 'action', header: 'Action' }, { key: 'how', header: 'How' }]}
          rows={[
            { action: 'Increase font size', how: 'Click A+ in the title bar (only visible on the terminal tab).' },
            { action: 'Decrease font size', how: 'Click A− in the title bar.' },
            { action: 'Reconnect terminal', how: 'Click ↻ next to the terminal tab label. Opens a fresh connection — useful if the WebSocket drops.' },
            { action: 'Extend session (+15 min)', how: 'Click +15m in the title bar. Appears only when under 5 minutes remain. One extension per session.' },
            { action: 'Minimize to picker', how: 'Click ← Exit. The session keeps running in the background; click Resume Session to return.' },
            { action: 'End session', how: 'Click ⏻ in the title bar, or type exit / logout in the shell.' },
          ]}
        />

        <h3 className={sectionH3}>Session timer</h3>
        <p className={bodyP} style={bodyColor}>
          The timer in the title bar shows time remaining. It turns amber when under 5 minutes
          remain and red (with a pulse animation) when under 1 minute. At zero the container is
          automatically destroyed by the server.
        </p>
        <DocsCallout variant="warning">
          Typing <code style={inlineCode}>exit</code> or{' '}
          <code style={inlineCode}>logout</code> in the shell ends the session immediately. The
          container is destroyed — save your work first or use Save VM.
        </DocsCallout>
      </section>

      {/* ─── IDE ──────────────────────────────────────────────────────── */}
      <section id="ide" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>VS Code IDE</h2>
        <p className={bodyP} style={bodyColor}>
          Switch to the <strong>IDE</strong> tab (next to the terminal tab in the active session)
          to open VS Code in the browser. This is code-server — a full VS Code experience with
          file editing, the integrated terminal, and extension support, running inside your
          container.
        </p>
        <p className={bodyP} style={bodyColor}>
          The IDE and terminal share the same container filesystem. Files you create in the terminal
          appear immediately in the IDE file explorer, and vice versa.
        </p>
        <DocsCallout variant="info">
          The IDE stays mounted when you switch back to the terminal tab — it does not reload. You
          can freely switch between terminal and IDE without losing unsaved work.
        </DocsCallout>
      </section>

      {/* ─── Custom setup ─────────────────────────────────────────────── */}
      <section id="custom-setup" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Custom environment setup</h2>
        <p className={bodyP} style={bodyColor}>
          Selecting <strong>Deploy Your Container</strong> opens a tool picker panel before launch.
          Choose any combination of tools across 5 categories:
        </p>
        <DocsTable
          columns={[{ key: 'cat', header: 'Category' }, { key: 'tools', header: 'Available tools' }]}
          rows={[
            { cat: 'Languages', tools: 'Node.js, Go, Rust, Java, Ruby, PHP' },
            { cat: 'DevOps', tools: 'kubectl, Helm, Terraform, Ansible, k9s' },
            { cat: 'Cloud CLIs', tools: 'AWS CLI, Azure CLI, gcloud' },
            { cat: 'Database clients', tools: 'psql (PostgreSQL), mysql-client, redis-cli, mongosh' },
            { cat: 'Utilities', tools: 'GitHub CLI (gh), yq, bat, fd, Zsh + Oh My Zsh' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          Core tools — bash, git, curl, wget, vim, nano, Python 3, jq, tmux, htop, fzf — are
          always included regardless of your selection.
        </p>
        <p className={bodyP} style={bodyColor}>
          Selected tools are installed by a setup script after the container boots. The boot
          progress panel shows each tool's status in real time. If a tool is already in the base
          image it is marked <em>skipped</em> (not reinstalled), so setup is fast for common
          combinations.
        </p>
        <DocsCallout variant="tip">
          If you regularly use the same set of tools, save the resulting VM as a snapshot (Pro).
          Restoring the snapshot is faster than re-running the tool installer every session.
        </DocsCallout>
      </section>

      {/* ─── Save & restore ───────────────────────────────────────────── */}
      <section id="save-restore" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Save &amp; restore VMs</h2>
        <p className={bodyP} style={bodyColor}>
          Pro users can save up to 3 VM snapshots. A snapshot exports the entire container
          filesystem to cloud storage. Restoring a snapshot launches a new container from that
          saved state — your installed tools, files, and directory structure are preserved exactly.
        </p>

        <h3 className={sectionH3}>Saving</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] mb-4" style={bodyColor}>
          <li>While a session is active, click <strong>Save VM</strong> in the title bar.</li>
          <li>Enter a name for the snapshot (e.g. &ldquo;My Go setup&rdquo;).</li>
          <li>Click Save VM. The export takes 1–3 minutes. You can continue using the terminal while it runs.</li>
          <li>The snapshot appears in the Saved VMs panel on the Containers tab.</li>
        </ol>

        <h3 className={sectionH3}>Restoring</h3>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] mb-4" style={bodyColor}>
          <li>On the Containers tab (idle / picker state), find your snapshot in the Saved VMs panel.</li>
          <li>Click <strong>Restore</strong>. A new container launches from the snapshot immediately.</li>
          <li>No boot progress wait — the terminal opens as soon as the container is running.</li>
        </ol>

        <DocsCallout variant="info">
          Snapshots save filesystem state only — running processes, open terminals, and in-memory
          state are not preserved.
        </DocsCallout>
        <DocsCallout variant="warning">
          You can only have one active session at a time. If a session is running, you cannot
          restore a snapshot until you end the current session.
        </DocsCallout>
      </section>

      {/* ─── Coding tab ───────────────────────────────────────────────── */}
      <section id="coding-tab" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Coding tab</h2>
        <p className={bodyP} style={bodyColor}>
          The Coding tab executes code on Camora servers — no container session needed. Paste code
          into the editor and click Run.
        </p>
        <DocsTable
          columns={[{ key: 'lang', header: 'Language' }, { key: 'notes', header: 'Notes' }]}
          rows={[
            { lang: 'Python 3', notes: 'Missing packages are auto-installed via pip on first run (up to 5 retry attempts).' },
            { lang: 'Bash', notes: 'Runs in a sandboxed shell on the server.' },
            { lang: 'Dockerfile', notes: 'Linted with hadolint. Build is not run.' },
            { lang: 'Terraform', notes: 'Runs terraform init + validate + plan against the pasted configuration.' },
          ]}
        />
        <p className={bodyP} style={bodyColor}>
          Click <strong>Explain line</strong> next to any line of code for an AI plain-English
          explanation. Explanations are cached per (code, line) pair — repeated requests for the
          same line are instant.
        </p>
      </section>

      {/* ─── SQL tab ──────────────────────────────────────────────────── */}
      <section id="sql-tab" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>SQL tab</h2>
        <p className={bodyP} style={bodyColor}>
          The SQL tab is a browser-based SQL sandbox. Write and run SQL queries in the editor.
          Results display in a formatted table. The editor is fully theme-aware (light and dark
          mode).
        </p>
      </section>

      {/* ─── Limits & plans ───────────────────────────────────────────── */}
      <section id="limits" className="mb-12 scroll-mt-24">
        <h2 className={sectionH2}>Session limits &amp; plans</h2>
        <DocsTable
          columns={[
            { key: 'feature', header: 'Feature' },
            { key: 'free', header: 'Free' },
            { key: 'pro', header: 'Pro' },
          ]}
          rows={[
            { feature: 'Container environments', free: 'Ubuntu 24.04, Docker, Deploy Your Container', pro: 'All 7 environments' },
            { feature: 'Daily container sessions', free: '1 per day', pro: 'Unlimited' },
            { feature: 'Session duration', free: '60 minutes', pro: '60 minutes' },
            { feature: 'Session extension', free: '+15 min (once)', pro: '+15 min (once)' },
            { feature: 'VM snapshot saves', free: 'None', pro: '3 slots' },
            { feature: 'Coding tab', free: 'Yes', pro: 'Yes' },
            { feature: 'SQL tab', free: 'Yes', pro: 'Yes' },
          ]}
        />
        <DocsCallout variant="tip">
          Use the +15m extension before time runs out — it appears in the title bar when under 5
          minutes remain. Each session can only be extended once.
        </DocsCallout>
      </section>
    </DocsPageLayout>
  );
}
