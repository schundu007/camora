import { isOwner } from '@/lib/owner';
import { useAuth } from '@/contexts/AuthContext';

const ENVIRONMENTS = [
  { id: 'ubuntu', label: 'Ubuntu 24.04', icon: '🖥', plan: 'free', desc: 'Clean Ubuntu shell' },
  { id: 'docker', label: 'Docker', icon: '🐳', plan: 'free', desc: 'Docker + Compose ready' },
  { id: 'agent-sandbox', label: 'AI Agent Sandbox', icon: '🤖', plan: 'pro', desc: 'Claude Code · Codex · Gemini CLI', badge: 'NEW' },
  { id: 'k8s-single', label: 'K8s Single-node', icon: '☸', plan: 'pro', desc: 'Single-node Kubernetes' },
  { id: 'k8s-multi', label: 'K8s Multi-node', icon: '☸', plan: 'pro', desc: 'Multi-node cluster' },
  { id: 'cloud-cli', label: 'Cloud CLI', icon: '☁', plan: 'pro', desc: 'AWS · GCP · Azure CLIs' },
];

const PAID_PLANS = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);

export default function EnvironmentPicker({ selected, onChange, userPlan, disabled }) {
  const { user } = useAuth();
  const isPro = isOwner(user) || PAID_PLANS.has(userPlan);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        Environment
      </p>
      {ENVIRONMENTS.map((env) => {
        const locked = env.plan === 'pro' && !isPro;
        const isSelected = selected === env.id;
        return (
          <button
            key={env.id}
            type="button"
            disabled={disabled || locked}
            onClick={() => { if (!locked && !disabled) onChange(env.id); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-colors"
            style={{
              background: isSelected
                ? 'rgba(212,160,67,0.12)'
                : 'var(--bg-elevated)',
              border: isSelected
                ? '1px solid rgba(212,160,67,0.4)'
                : '1px solid var(--border)',
              cursor: disabled || locked ? 'not-allowed' : 'pointer',
              opacity: locked ? 0.7 : 1,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{env.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                {env.label}
              </span>
              {env.desc && (
                <span className="block text-[10px] leading-tight mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {env.desc}
                </span>
              )}
            </span>
            <span className="flex flex-col items-end gap-1 shrink-0">
              {env.badge && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.35)',
                    color: '#10b981',
                  }}
                >
                  {env.badge}
                </span>
              )}
              {env.plan === 'pro' && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(212,160,67,0.15)',
                    border: '1px solid rgba(212,160,67,0.35)',
                    color: 'var(--cam-gold-leaf-lt)',
                  }}
                >
                  PRO
                </span>
              )}
            </span>
          </button>
        );
      })}
      {!isPro && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Pro environments require a Pro subscription
        </p>
      )}
    </div>
  );
}
