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
  },
  {
    id: 'docker',
    label: 'Docker',
    icon: { logo: 'docker.com' },
    plan: 'free',
    desc: 'Docker + Compose ready',
    category: 'Containers',
    color: '#2563eb',
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
  },
  {
    id: 'k8s-single',
    label: 'K8s Single-node',
    icon: { logo: 'kubernetes.io' },
    plan: 'pro',
    desc: 'Single-node Kubernetes cluster',
    category: 'Kubernetes',
    color: '#0ea5e9',
  },
  {
    id: 'k8s-multi',
    label: 'K8s Multi-node',
    icon: { logo: 'kubernetes.io' },
    plan: 'pro',
    desc: 'Multi-node cluster with kubeadm',
    category: 'Kubernetes',
    color: '#0ea5e9',
  },
  {
    id: 'k8s-etcd',
    label: 'etcd Practice',
    icon: { logo: 'etcd.io' },
    plan: 'pro',
    desc: 'Practice etcd using the real K8s control plane store — watch, leases, transactions',
    category: 'Kubernetes',
    color: '#419EDA',
  },
  {
    id: 'etcd-cluster',
    label: 'etcd Cluster',
    icon: { logo: 'etcd.io' },
    plan: 'pro',
    desc: '3-node etcd cluster — Raft consensus, leader election, fault injection',
    category: 'Kubernetes',
    color: '#419EDA',
    badge: 'NEW',
  },
  {
    id: 'cloud-cli',
    label: 'Cloud CLI',
    icon: { logos: ['amazon.com', 'google.com', 'microsoft.com'] },
    plan: 'pro',
    desc: 'AWS · GCP · Azure · Terraform · K8s',
    category: 'Cloud',
    color: '#f59e0b',
  },
  {
    id: 'custom',
    label: 'Deploy Your Container',
    icon: { emoji: '⚙️' },
    plan: 'free',
    desc: 'Pick languages, DevOps tools, cloud CLIs',
    category: 'Custom',
    color: '#8b5cf6',
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
                  ? `1px solid ${env.color}`
                  : '1px solid var(--border)',
                borderTop: isSelected
                  ? `4px solid ${env.color}`
                  : `4px solid ${env.color}66`,
                background: isSelected
                  ? `${env.color}14`
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
                      fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                      background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981',
                    }}>
                      {env.badge}
                    </span>
                  )}
                  {locked && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                      background: 'var(--accent-secondary-subtle)', border: '1px solid color-mix(in oklab, var(--accent-secondary) 35%, transparent)', color: 'var(--accent-secondary-text)',
                    }}>
                      PRO
                    </span>
                  )}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                {env.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                {env.desc}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                  background: `${env.color}22`, color: env.color,
                }}>
                  {env.category}
                </span>
                {isSelected && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: env.color }}>✓ Selected</span>
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
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 14, textAlign: 'center' }}>
          Pro environments require a paid subscription
        </p>
      )}
    </div>
  );
}
