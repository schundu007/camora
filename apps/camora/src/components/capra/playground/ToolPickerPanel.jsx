import { useState, useMemo } from 'react';

const CATEGORIES = [
  {
    id: 'languages',
    label: 'Languages',
    color: '#10b981',
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
    color: '#2563eb',
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
    color: '#f59e0b',
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

function generateSetupScript(selected) {
  if (!selected.size) return '';
  const lines = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'has() { command -v "$1" &>/dev/null; }',
    'log() { echo "[SETUP] $*"; }',
    'ARCH=$(dpkg --print-architecture)',
    'export DEBIAN_FRONTEND=noninteractive',
    'apt-get update -qq 2>/dev/null',
    '',
  ];

  if (selected.has('node')) lines.push(
    '# Node.js 20',
    'if ! has node; then',
    '  log "Installing Node.js 20..."',
    '  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null',
    '  apt-get install -y nodejs -qq',
    'fi', '',
  );

  if (selected.has('go')) lines.push(
    '# Go 1.22',
    'if ! has go; then',
    '  log "Installing Go 1.22..."',
    '  wget -q "https://go.dev/dl/go1.22.1.linux-${ARCH}.tar.gz" -O /tmp/go.tar.gz',
    '  tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz',
    '  echo \'export PATH=$PATH:/usr/local/go/bin\' > /etc/profile.d/go.sh',
    'fi', '',
  );

  if (selected.has('rust')) lines.push(
    '# Rust',
    'if ! has rustc; then',
    '  log "Installing Rust..."',
    '  curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --quiet',
    '  echo \'source "$HOME/.cargo/env"\' > /etc/profile.d/rust.sh',
    'fi', '',
  );

  if (selected.has('java')) lines.push(
    '# Java 17',
    'if ! has java; then',
    '  log "Installing Java 17..."',
    '  apt-get install -y openjdk-17-jdk -qq',
    'fi', '',
  );

  if (selected.has('ruby')) lines.push(
    '# Ruby',
    'if ! has ruby; then',
    '  log "Installing Ruby..."',
    '  apt-get install -y ruby-full -qq',
    'fi', '',
  );

  if (selected.has('php')) lines.push(
    '# PHP 8',
    'if ! has php; then',
    '  log "Installing PHP 8..."',
    '  apt-get install -y php php-cli php-common -qq',
    'fi', '',
  );

  if (selected.has('kubectl')) lines.push(
    '# kubectl',
    'if ! has kubectl; then',
    '  log "Installing kubectl..."',
    '  mkdir -p /etc/apt/keyrings',
    '  curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes.gpg',
    '  echo "deb [signed-by=/etc/apt/keyrings/kubernetes.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list >/dev/null',
    '  apt-get update -qq && apt-get install -y kubectl -qq',
    'fi', '',
  );

  if (selected.has('helm')) lines.push(
    '# Helm',
    'if ! has helm; then',
    '  log "Installing Helm..."',
    '  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash 2>/dev/null',
    'fi', '',
  );

  if (selected.has('terraform')) lines.push(
    '# Terraform',
    'if ! has terraform; then',
    '  log "Installing Terraform 1.7.5..."',
    '  TF_VER=1.7.5',
    '  wget -q "https://releases.hashicorp.com/terraform/${TF_VER}/terraform_${TF_VER}_linux_${ARCH}.zip" -O /tmp/tf.zip',
    '  unzip -o /tmp/tf.zip -d /usr/local/bin/ && rm /tmp/tf.zip',
    'fi', '',
  );

  if (selected.has('ansible')) lines.push(
    '# Ansible',
    'if ! has ansible; then',
    '  log "Installing Ansible..."',
    '  apt-get install -y ansible -qq',
    'fi', '',
  );

  if (selected.has('k9s')) lines.push(
    '# k9s',
    'if ! has k9s; then',
    '  log "Installing k9s..."',
    '  K9S_VER=v0.32.4',
    '  wget -q "https://github.com/derailed/k9s/releases/download/${K9S_VER}/k9s_Linux_${ARCH}.tar.gz" -O /tmp/k9s.tar.gz',
    '  tar -xzf /tmp/k9s.tar.gz -C /usr/local/bin k9s && rm /tmp/k9s.tar.gz',
    'fi', '',
  );

  if (selected.has('aws')) lines.push(
    '# AWS CLI v2',
    'if ! has aws; then',
    '  log "Installing AWS CLI..."',
    '  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/aws.zip',
    '  unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install && rm -rf /tmp/aws.zip /tmp/aws',
    'fi', '',
  );

  if (selected.has('azure')) lines.push(
    '# Azure CLI',
    'if ! has az; then',
    '  log "Installing Azure CLI..."',
    '  curl -sL https://aka.ms/InstallAzureCLIDeb | bash',
    'fi', '',
  );

  if (selected.has('gcp')) lines.push(
    '# gcloud CLI',
    'if ! has gcloud; then',
    '  log "Installing gcloud CLI..."',
    '  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg',
    '  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null',
    '  apt-get update -qq && apt-get install -y google-cloud-cli -qq',
    'fi', '',
  );

  if (selected.has('pg-client')) lines.push(
    '# PostgreSQL client',
    'if ! has psql; then',
    '  log "Installing psql..."',
    '  apt-get install -y postgresql-client -qq',
    'fi', '',
  );

  if (selected.has('mysql-client')) lines.push(
    '# MySQL client',
    'if ! has mysql; then',
    '  log "Installing MySQL client..."',
    '  apt-get install -y mysql-client -qq 2>/dev/null || apt-get install -y default-mysql-client -qq',
    'fi', '',
  );

  if (selected.has('redis-cli')) lines.push(
    '# Redis CLI',
    'if ! has redis-cli; then',
    '  log "Installing redis-cli..."',
    '  apt-get install -y redis-tools -qq',
    'fi', '',
  );

  if (selected.has('mongosh')) lines.push(
    '# mongosh',
    'if ! has mongosh; then',
    '  log "Installing mongosh..."',
    '  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /etc/apt/keyrings/mongodb.gpg',
    '  echo "deb [signed-by=/etc/apt/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null',
    '  apt-get update -qq && apt-get install -y mongodb-mongosh -qq',
    'fi', '',
  );

  if (selected.has('gh')) lines.push(
    '# GitHub CLI',
    'if ! has gh; then',
    '  log "Installing GitHub CLI..."',
    '  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg',
    '  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list >/dev/null',
    '  apt-get update -qq && apt-get install -y gh -qq',
    'fi', '',
  );

  if (selected.has('yq')) lines.push(
    '# yq',
    'if ! has yq; then',
    '  log "Installing yq..."',
    '  wget -q "https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${ARCH}" -O /usr/local/bin/yq',
    '  chmod +x /usr/local/bin/yq',
    'fi', '',
  );

  if (selected.has('bat')) lines.push(
    '# bat',
    'if ! has bat && ! has batcat; then',
    '  log "Installing bat..."',
    '  apt-get install -y bat -qq 2>/dev/null || apt-get install -y batcat -qq',
    '  [[ -f /usr/bin/batcat ]] && ln -sf /usr/bin/batcat /usr/local/bin/bat || true',
    'fi', '',
  );

  if (selected.has('fd')) lines.push(
    '# fd-find',
    'if ! has fd && ! has fdfind; then',
    '  log "Installing fd..."',
    '  apt-get install -y fd-find -qq',
    '  ln -sf "$(which fdfind)" /usr/local/bin/fd 2>/dev/null || true',
    'fi', '',
  );

  if (selected.has('zsh')) lines.push(
    '# zsh + oh-my-zsh',
    'if ! has zsh; then',
    '  log "Installing zsh..."',
    '  apt-get install -y zsh -qq',
    'fi',
    'if [[ ! -d "$HOME/.oh-my-zsh" ]]; then',
    '  log "Installing oh-my-zsh..."',
    '  RUNZSH=no CHSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"',
    'fi', '',
  );

  lines.push('log "Custom setup complete."');
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
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
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
            background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Core Tools — Always Included
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['bash', 'git', 'curl', 'wget', 'vim', 'nano', 'python3', 'jq', 'tmux', 'htop', 'fzf'].map(t => (
                <span key={t} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(16,185,129,0.15)', color: '#10b981',
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Tool categories */}
          {CATEGORIES.map(cat => (
            <div key={cat.id} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
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
                      title={tool.desc}
                      style={{
                        padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                        border: active ? `1px solid ${cat.color}` : '1px solid rgba(255,255,255,0.1)',
                        background: active ? `${cat.color}22` : 'rgba(255,255,255,0.03)',
                        color: active ? cat.color : 'rgba(255,255,255,0.55)',
                        fontSize: 11, fontWeight: active ? 700 : 500,
                        transition: 'all 0.12s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {active && <span style={{ fontSize: 9, color: cat.color }}>✓</span>}
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
                  color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>Preview setup.sh</span>
                <span style={{ fontSize: 10 }}>{scriptVisible ? '▲' : '▼'}</span>
              </button>
              {scriptVisible && (
                <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', background: '#161b22',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: '"IBM Plex Mono", monospace' }}>setup.sh</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                        color: copied ? '#10b981' : 'rgba(255,255,255,0.45)', cursor: 'pointer',
                      }}
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre style={{
                    margin: 0, padding: '12px', maxHeight: 260, overflowY: 'auto',
                    fontSize: 10, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)',
                    fontFamily: '"IBM Plex Mono", monospace', background: '#090d13',
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
          <div style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
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
              border: 'none', background: disabled ? 'rgba(212,160,67,0.4)' : '#d4a043',
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
