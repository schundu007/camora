const ENVIRONMENTS = [
  { id: 'ubuntu', label: 'Ubuntu', icon: '🖥', plan: 'free' },
  { id: 'docker', label: 'Docker', icon: '🐳', plan: 'free' },
  { id: 'k8s-single', label: 'K8s Single-node', icon: '☸', plan: 'pro' },
  { id: 'k8s-multi', label: 'K8s Multi-node', icon: '☸', plan: 'pro' },
  { id: 'cloud-cli', label: 'Cloud CLI', icon: '☁', plan: 'pro' },
];

export default function EnvironmentPicker({ selected, onChange, userPlan, disabled }) {
  const isPro = userPlan === 'pro_monthly' || userPlan === 'pro_yearly' || userPlan === 'team' || userPlan === 'lifetime';

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
            <span style={{ fontSize: 16 }}>{env.icon}</span>
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {env.label}
            </span>
            {env.plan === 'pro' && (
              <span
                className="badge-gold text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(212,160,67,0.15)',
                  border: '1px solid rgba(212,160,67,0.35)',
                  color: 'var(--cam-gold-leaf-lt)',
                }}
              >
                PRO
              </span>
            )}
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
