import { useState, useMemo } from 'react';

const CATEGORIES = [
  {
    id: 'languages',
    label: 'Languages',
    color: 'var(--success)',
    tools: [
      { id: 'node', label: 'Node.js 20', desc: 'JavaScript runtime' },
      { id: 'go', label: 'Go 1.22', desc: 'Go language' },
      { id: 'rust', label: 'Rust', desc: 'Systems language' },
      { id: 'java', label: 'Java 17', desc: 'OpenJDK 17' },
      { id: 'ruby', label: 'Ruby', desc: 'Ruby language' },
      { id: 'php', label: 'PHP 8', desc: 'PHP web language' },
    ],
  },
  {
    id: 'devops',
    label: 'DevOps',
    color: 'var(--accent)',
    tools: [
      { id: 'kubectl', label: 'kubectl', desc: 'Kubernetes CLI' },
      { id: 'helm', label: 'Helm', desc: 'K8s package manager' },
      { id: 'terraform', label: 'Terraform', desc: 'Infrastructure as code' },
      { id: 'ansible', label: 'Ansible', desc: 'Configuration mgmt' },
      { id: 'k9s', label: 'k9s', desc: 'Kubernetes TUI' },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud CLIs',
    color: 'var(--warning)',
    tools: [
      { id: 'aws', label: 'AWS CLI', desc: 'Amazon Web Services' },
      { id: 'azure', label: 'Azure CLI', desc: 'Microsoft Azure' },
      { id: 'gcp', label: 'gcloud CLI', desc: 'Google Cloud' },
    ],
  },
  {
    id: 'databases',
    label: 'Database Clients',
    color: '#7c3aed',
    tools: [
      { id: 'pg-client', label: 'psql', desc: 'PostgreSQL client' },
      { id: 'mysql-client', label: 'MySQL', desc: 'MySQL client' },
      { id: 'redis-cli', label: 'redis-cli', desc: 'Redis client' },
      { id: 'mongosh', label: 'mongosh', desc: 'MongoDB shell' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    color: '#0ea5e9',
    tools: [
      { id: 'gh', label: 'GitHub CLI', desc: 'gh command' },
      { id: 'yq', label: 'yq', desc: 'YAML processor' },
      { id: 'bat', label: 'bat', desc: 'Better cat' },
      { id: 'fd', label: 'fd', desc: 'Better find' },
      { id: 'zsh', label: 'zsh + omz', desc: 'Z shell + oh-my-zsh' },
    ],
  },
];

function pg(tool, label, status) {
  return `echo '##PG##${JSON.stringify({ tool, label, status })}'`;
}

function toolBlock(id, label, checkCmd, installLines) {
  return [
    pg(id, label, 'checking'),
    `if ! ${checkCmd}; then`,
    `  ${pg(id, label, 'installing')}`,
    ...installLines.map(l => `  ${l}`),
    `  ${pg(id, label, 'done')}`,
    'else',
    `  ${pg(id, label, 'skipped')}`,
    'fi',
    '',
  ];
}

function generateSetupScript(selected) {
  if (!selected.size) return '';
  const lines = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'has() { command -v "$1" &>/dev/null; }',
    'ARCH=$(dpkg --print-architecture)',
    'export DEBIAN_FRONTEND=noninteractive',
    'apt-get update -qq 2>/dev/null',
    '',
  ];

  if (selected.has('node')) lines.push(...toolBlock('node', 'Node.js 20', 'has node', [
    'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null',
    'apt-get install -y nodejs -qq',
  ]));

  if (selected.has('go')) lines.push(...toolBlock('go', 'Go 1.22', 'has go', [
    'wget -q "https://go.dev/dl/go1.22.1.linux-${ARCH}.tar.gz" -O /tmp/go.tar.gz',
    'tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz',
    "echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh",
  ]));

  if (selected.has('rust')) lines.push(...toolBlock('rust', 'Rust', 'has rustc', [
    "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --quiet",
    'echo \'source "$HOME/.cargo/env"\' > /etc/profile.d/rust.sh',
  ]));

  if (selected.has('java')) lines.push(...toolBlock('java', 'Java 17', 'has java', [
    'apt-get install -y openjdk-17-jdk -qq',
  ]));

  if (selected.has('ruby')) lines.push(...toolBlock('ruby', 'Ruby', 'has ruby', [
    'apt-get install -y ruby-full -qq',
  ]));

  if (selected.has('php')) lines.push(...toolBlock('php', 'PHP 8', 'has php', [
    'apt-get install -y php php-cli php-common -qq',
  ]));

  if (selected.has('kubectl')) lines.push(...toolBlock('kubectl', 'kubectl', 'has kubectl', [
    'mkdir -p /etc/apt/keyrings',
    'curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes.gpg',
    'echo "deb [signed-by=/etc/apt/keyrings/kubernetes.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list >/dev/null',
    'apt-get update -qq && apt-get install -y kubectl -qq',
  ]));

  if (selected.has('helm')) lines.push(...toolBlock('helm', 'Helm', 'has helm', [
    'curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash 2>/dev/null',
  ]));

  if (selected.has('terraform')) lines.push(...toolBlock('terraform', 'Terraform', 'has terraform', [
    'TF_VER=1.7.5',
    'wget -q "https://releases.hashicorp.com/terraform/${TF_VER}/terraform_${TF_VER}_linux_${ARCH}.zip" -O /tmp/tf.zip',
    'unzip -o /tmp/tf.zip -d /usr/local/bin/ && rm /tmp/tf.zip',
  ]));

  if (selected.has('ansible')) lines.push(...toolBlock('ansible', 'Ansible', 'has ansible', [
    'apt-get install -y ansible -qq',
  ]));

  if (selected.has('k9s')) lines.push(...toolBlock('k9s', 'k9s', 'has k9s', [
    'K9S_VER=v0.32.4',
    'wget -q "https://github.com/derailed/k9s/releases/download/${K9S_VER}/k9s_Linux_${ARCH}.tar.gz" -O /tmp/k9s.tar.gz',
    'tar -xzf /tmp/k9s.tar.gz -C /usr/local/bin k9s && rm /tmp/k9s.tar.gz',
  ]));

  if (selected.has('aws')) lines.push(...toolBlock('aws', 'AWS CLI', 'has aws', [
    'curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/aws.zip',
    'unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install && rm -rf /tmp/aws.zip /tmp/aws',
  ]));

  if (selected.has('azure')) lines.push(...toolBlock('azure', 'Azure CLI', 'has az', [
    'curl -sL https://aka.ms/InstallAzureCLIDeb | bash',
  ]));

  if (selected.has('gcp')) lines.push(...toolBlock('gcp', 'gcloud CLI', 'has gcloud', [
    'curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg',
    'echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null',
    'apt-get update -qq && apt-get install -y google-cloud-cli -qq',
  ]));

  if (selected.has('pg-client')) lines.push(...toolBlock('pg-client', 'psql', 'has psql', [
    'apt-get install -y postgresql-client -qq',
  ]));

  if (selected.has('mysql-client')) lines.push(...toolBlock('mysql-client', 'MySQL client', 'has mysql', [
    'apt-get install -y mysql-client -qq 2>/dev/null || apt-get install -y default-mysql-client -qq',
  ]));

  if (selected.has('redis-cli')) lines.push(...toolBlock('redis-cli', 'redis-cli', 'has redis-cli', [
    'apt-get install -y redis-tools -qq',
  ]));

  if (selected.has('mongosh')) lines.push(...toolBlock('mongosh', 'mongosh', 'has mongosh', [
    'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /etc/apt/keyrings/mongodb.gpg',
    'echo "deb [signed-by=/etc/apt/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null',
    'apt-get update -qq && apt-get install -y mongodb-mongosh -qq',
  ]));

  if (selected.has('gh')) lines.push(...toolBlock('gh', 'GitHub CLI', 'has gh', [
    'curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg',
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list >/dev/null',
    'apt-get update -qq && apt-get install -y gh -qq',
  ]));

  if (selected.has('yq')) lines.push(...toolBlock('yq', 'yq', 'has yq', [
    'wget -q "https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${ARCH}" -O /usr/local/bin/yq',
    'chmod +x /usr/local/bin/yq',
  ]));

  if (selected.has('bat')) lines.push(
    pg('bat', 'bat', 'checking'),
    'if ! has bat && ! has batcat; then',
    `  ${pg('bat', 'bat', 'installing')}`,
    '  apt-get install -y bat -qq 2>/dev/null || apt-get install -y batcat -qq',
    '  [[ -f /usr/bin/batcat ]] && ln -sf /usr/bin/batcat /usr/local/bin/bat || true',
    `  ${pg('bat', 'bat', 'done')}`,
    'else',
    `  ${pg('bat', 'bat', 'skipped')}`,
    'fi', '',
  );

  if (selected.has('fd')) lines.push(
    pg('fd', 'fd', 'checking'),
    'if ! has fd && ! has fdfind; then',
    `  ${pg('fd', 'fd', 'installing')}`,
    '  apt-get install -y fd-find -qq',
    '  ln -sf "$(which fdfind)" /usr/local/bin/fd 2>/dev/null || true',
    `  ${pg('fd', 'fd', 'done')}`,
    'else',
    `  ${pg('fd', 'fd', 'skipped')}`,
    'fi', '',
  );

  if (selected.has('zsh')) lines.push(
    pg('zsh', 'zsh + oh-my-zsh', 'checking'),
    'if ! has zsh; then',
    `  ${pg('zsh', 'zsh + oh-my-zsh', 'installing')}`,
    '  apt-get install -y zsh -qq',
    'fi',
    'if [[ ! -d "$HOME/.oh-my-zsh" ]]; then',
    '  RUNZSH=no CHSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"',
    'fi',
    pg('zsh', 'zsh + oh-my-zsh', 'done'),
    '',
  );

  lines.push(`echo '##PG##${JSON.stringify({ tool: '__done__', label: 'Setup complete', status: 'done' })}'`);
  return lines.join('\n');
}

export { generateSetupScript };

export default function ToolPickerPanel({ open, onClose, onStart, disabled }) {
  const [selected, setSelected] = useState(new Set());
  const [scriptVisible, setScriptVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const script = useMemo(() => generateSetupScript(selected), [selected]);

  const toggle = (toolId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    onStart(selected.size > 0 ? script : null);
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 100, backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 520,
        background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 101, display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Custom Setup</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Pick tools to pre-install on your Ubuntu VM
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
              fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Core tools notice */}
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 20,
            background: 'rgba(43,181,52,0.07)', border: '1px solid rgba(43,181,52,0.2)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Core Tools — Always Included
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['bash', 'git', 'curl', 'wget', 'vim', 'nano', 'python3', 'jq', 'tmux', 'htop', 'fzf'].map(t => (
                <span key={t} style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(43,181,52,0.15)', color: 'var(--success)',
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Tool categories */}
          {CATEGORIES.map(cat => (
            <div key={cat.id} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: cat.color, marginBottom: 10,
              }}>
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cat.tools.map(tool => {
                  const active = selected.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggle(tool.id)}
                      data-tip={tool.desc}
                      style={{
                        padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                        border: active ? `1px solid ${cat.color}` : '1px solid rgba(255,255,255,0.1)',
                        background: active ? `${cat.color}22` : 'rgba(255,255,255,0.03)',
                        color: active ? cat.color : 'rgba(255,255,255,0.55)',
                        fontSize: 12, fontWeight: active ? 700 : 500,
                        transition: 'all 0.12s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {active && <span style={{ fontSize: 12, color: cat.color }}>✓</span>}
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Script preview */}
          {selected.size > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setScriptVisible(v => !v)}
                style={{
                  width: '100%', padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>Preview setup.sh</span>
                <span style={{ fontSize: 12 }}>{scriptVisible ? '▲' : '▼'}</span>
              </button>
              {scriptVisible && (
                <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', background: '#161b22',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>setup.sh</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                        color: copied ? 'var(--success)' : 'rgba(255,255,255,0.45)', cursor: 'pointer',
                      }}
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre style={{
                    margin: 0, padding: '12px', maxHeight: 260, overflowY: 'auto',
                    fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'var(--font-mono)', background: '#090d13',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>
                    {script}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0a0f1a',
        }}>
          <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {selected.size === 0
              ? 'No extra tools — starts as base Ubuntu'
              : `${selected.size} tool${selected.size === 1 ? '' : 's'} selected · installs after boot`}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleStart}
            style={{
              padding: '8px 20px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
              border: 'none', background: disabled ? 'rgba(255,153,0,0.4)' : 'var(--cam-gold-leaf)',
              color: '#1a1200', fontSize: 12, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              opacity: disabled ? 0.7 : 1,
            }}
          >
            Start Playground
          </button>
        </div>
      </div>
    </>
  );
}
