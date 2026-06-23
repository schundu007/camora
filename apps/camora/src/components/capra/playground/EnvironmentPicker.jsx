import { isOwner } from '@/lib/owner';
import { useAuth } from '@/contexts/AuthContext';

const LOGO_TOKEN = 'pk_VzK1OM-OQSCUuysDpOCzKw';

export function EnvIcon({ icon }) {
  if (!icon) return null;
  if (icon.emoji) {
    return <span style={{ fontSize: 22, lineHeight: 1 }}>{icon.emoji}</span>;
  }
  if (icon.logos) {
    return (
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        {icon.logos.map((d) => (
          <img
            key={d}
            src={`https://img.logo.dev/${d}?token=${LOGO_TOKEN}&size=40&format=png`}
            width={16}
            height={16}
            alt={d}
            style={{ objectFit: 'contain', borderRadius: 2 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ))}
      </div>
    );
  }
  return (
    <img
      src={`https://img.logo.dev/${icon.logo}?token=${LOGO_TOKEN}&size=40&format=png`}
      width={28}
      height={28}
      alt={icon.logo}
      style={{ objectFit: 'contain', borderRadius: 4 }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

export const ENVIRONMENTS = [
  {
    id: 'ubuntu',
    label: 'Ubuntu 24.04',
    icon: { logo: 'ubuntu.com' },
    plan: 'free',
    desc: 'Clean Ubuntu shell',
    category: 'Linux',
    color: '#10b981',
    nodes: [
      { name: 'ubuntu', role: 'Shell', mem: '512 MB', tools: ['Terminal', 'IDE'] },
    ],
    specs: { totalMem: '512 MB', bootTime: '~5s' },
    features: ['bash', 'vim', 'curl', 'wget', 'git', 'python3', 'node.js'],
  },
  {
    id: 'docker',
    label: 'Docker',
    icon: { logo: 'docker.com' },
    plan: 'free',
    desc: 'Docker + Compose ready',
    category: 'Containers',
    color: '#2563eb',
    nodes: [
      { name: 'docker', role: 'Host', mem: '1 GB', tools: ['Terminal', 'IDE'] },
    ],
    specs: { totalMem: '1 GB', bootTime: '~8s' },
    features: ['Docker 26', 'Compose v2', 'BuildKit', 'bash', 'git'],
  },
  {
    id: 'agent-sandbox',
    label: 'AI Agent Sandbox',
    icon: { logo: 'anthropic.com' },
    plan: 'pro',
    desc: 'Claude Code · Codex · Gemini CLI',
    category: 'AI · Programming',
    color: '#7c3aed',
    badge: 'NEW',
    nodes: [
      { name: 'sandbox', role: 'Dev Environment', mem: '2 GB', tools: ['Terminal', 'IDE'] },
    ],
    specs: { totalMem: '2 GB', bootTime: '~15s' },
    features: ['Claude Code', 'Gemini CLI', 'Codex CLI', 'Python', 'Node.js', 'Go', 'git'],
  },
  {
    id: 'k8s-single',
    label: 'K8s Single-node',
    icon: { logo: 'kubernetes.io' },
    plan: 'pro',
    desc: 'K8s v1.34 · containerd v2.1 · 1 control-plane node · practice bootstrapping, RBAC, networking',
    category: 'Kubernetes',
    color: '#0ea5e9',
    nodes: [
      { name: 'k8s-node', role: 'Control Plane', mem: '2 GB', tools: ['Terminal', 'IDE', 'Radar'] },
    ],
    specs: { totalMem: '2 GB', bootTime: '~30s' },
    features: ['K8s v1.34', 'containerd v2.1', 'kubectl', 'etcdctl', 'RBAC', 'Radar'],
  },
  {
    id: 'k8s-multi',
    label: 'K8s Multi-node',
    icon: { logo: 'kubernetes.io' },
    plan: 'pro',
    desc: 'K8s v1.34 · kubeadm · 1 control-plane + 2 workers · Flannel CNI · practice scheduling & draining',
    category: 'Kubernetes',
    color: '#0ea5e9',
    nodes: [
      { name: 'server', role: 'Control Plane', mem: '2 GB', tools: ['Terminal', 'IDE', 'Radar'] },
      { name: 'agent-1', role: 'Worker', mem: '1 GB', tools: ['Terminal'] },
      { name: 'agent-2', role: 'Worker', mem: '1 GB', tools: ['Terminal'] },
    ],
    specs: { totalMem: '4 GB', bootTime: '~60s' },
    features: ['K8s v1.34', 'kubeadm', 'Flannel CNI', 'kubectl', 'etcdctl', 'Radar'],
  },
  {
    id: 'k8s-etcd',
    label: 'etcd Practice',
    icon: { logo: 'etcd.io' },
    plan: 'pro',
    desc: 'etcd v3.6 embedded in K8s · practice watch, leases, transactions, compaction, defrag',
    category: 'Kubernetes',
    color: '#419EDA',
    nodes: [
      { name: 'k8s-etcd', role: 'Control Plane', mem: '2 GB', tools: ['Terminal', 'IDE', 'Radar'] },
    ],
    specs: { totalMem: '2 GB', bootTime: '~30s' },
    features: ['etcd v3.6', 'etcdctl', 'K8s v1.34', 'watch API', 'leases', 'transactions'],
  },
  {
    id: 'etcd-cluster',
    label: 'etcd Cluster',
    icon: { logo: 'etcd.io' },
    plan: 'pro',
    desc: 'etcd v3.6 · 3-node Raft cluster · leader election, fault injection, snapshot restore',
    category: 'Kubernetes',
    color: '#419EDA',
    badge: 'NEW',
    nodes: [
      { name: 'etcd1', role: 'Primary', mem: '512 MB', tools: ['Terminal', 'IDE'] },
      { name: 'etcd2', role: 'Member', mem: '512 MB', tools: ['Terminal'] },
      { name: 'etcd3', role: 'Member', mem: '512 MB', tools: ['Terminal'] },
    ],
    specs: { totalMem: '1.5 GB', bootTime: '~20s' },
    features: ['etcd v3.6', 'etcdctl', 'Raft consensus', 'leader election', 'snapshots', 'fault injection'],
  },
  {
    id: 'cloud-cli',
    label: 'Cloud CLI',
    icon: { logos: ['amazon.com', 'google.com', 'microsoft.com'] },
    plan: 'pro',
    desc: 'AWS · GCP · Azure · Terraform · K8s',
    category: 'Cloud',
    color: '#f59e0b',
    nodes: [
      { name: 'cloud-cli', role: 'CLI Workstation', mem: '1 GB', tools: ['Terminal', 'IDE'] },
    ],
    specs: { totalMem: '1 GB', bootTime: '~10s' },
    features: ['AWS CLI v2', 'gcloud', 'az CLI', 'Terraform', 'kubectl', 'Helm'],
  },
  {
    id: 'custom',
    label: 'Deploy Your Container',
    icon: { emoji: '⚙️' },
    plan: 'free',
    desc: 'Pick languages, DevOps tools, cloud CLIs',
    category: 'Custom',
    color: '#8b5cf6',
    nodes: [
      { name: 'custom', role: 'Custom', mem: '1 GB', tools: ['Terminal', 'IDE'] },
    ],
    specs: { totalMem: '1 GB', bootTime: '~15s' },
    features: ['Choose your tools', 'Languages', 'DevOps CLIs', 'Cloud SDKs'],
  },
];

const PAID_PLANS = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);

export default function EnvironmentPicker({ selected, onChange, userPlan, disabled }) {
  const { user } = useAuth();
  const isPro = isOwner(user) || PAID_PLANS.has(userPlan);

  return (
    <div style={{ padding: '24px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>
        Choose Environment
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ENVIRONMENTS.map((env) => {
          const locked = env.plan === 'pro' && !isPro;
          const isSelected = selected === env.id;
          return (
            <button
              key={env.id}
              type="button"
              disabled={disabled || locked}
              onClick={() => { if (!locked && !disabled) onChange(env.id); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 14px 12px',
                borderRadius: 10,
                border: isSelected
                  ? '1px solid var(--cam-gold-leaf)'
                  : '1px solid var(--border)',
                borderTop: isSelected
                  ? '3px solid var(--cam-gold-leaf)'
                  : '3px solid var(--border)',
                background: isSelected
                  ? 'color-mix(in oklab, var(--cam-gold-leaf) 7%, var(--bg-elevated))'
                  : 'var(--bg-elevated)',
                cursor: disabled || locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.55 : 1,
                textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
                position: 'relative',
                outline: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                <span style={{ fontSize: 22, lineHeight: 1, display: 'flex', alignItems: 'center', minHeight: 28 }}>
                <EnvIcon icon={env.icon} />
              </span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {env.badge && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                      background: 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)',
                      color: 'var(--cam-gold-leaf-lt)',
                    }}>
                      {env.badge}
                    </span>
                  )}
                  {locked && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                      background: 'var(--accent-secondary-subtle)', border: '1px solid color-mix(in oklab, var(--accent-secondary) 35%, transparent)', color: 'var(--accent-secondary-text)',
                    }}>
                      PRO
                    </span>
                  )}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                {env.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                {env.desc}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                  background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                }}>
                  {env.category}
                </span>
                {isSelected && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cam-gold-leaf-lt)' }}>✓ Selected</span>
                )}
                {locked && (
                  <span style={{ fontSize: 10 }}>🔒</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {!isPro && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 14, textAlign: 'center' }}>
          Pro environments require a paid subscription
        </p>
      )}
    </div>
  );
}
