import { EnvIcon } from './EnvironmentPicker';

const TERMINAL_PREVIEWS = {
  ubuntu: '$ ls -la',
  docker: '$ docker ps',
  'agent-sandbox': '$ claude -p "fix the bug"',
  'k8s-single': '$ kubectl get nodes',
  'k8s-multi': '$ kubectl get nodes -o wide',
  'k8s-etcd': '$ etcdctl endpoint health',
  'etcd-cluster': '$ etcdctl member list',
  'cloud-cli': '$ aws s3 ls',
  custom: '$ bash setup.sh',
};

const Section = ({ label, children }) => (
  <div style={{ padding: '12px 16px 0' }}>
    <p className="text-eyebrow" style={{ marginBottom: 8 }}>{label}</p>
    {children}
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: 'var(--border)', margin: '12px 16px 0' }} />
);

const EnvironmentConfigPanel = ({ env }) => {
  if (!env) return null;

  const nodes = env.nodes || [{ name: env.id, role: 'Node', mem: '512 MB', tools: ['Terminal', 'IDE'] }];
  const features = env.features || [];
  const specs = env.specs || {};
  const previewCmd = TERMINAL_PREVIEWS[env.id] || '$ bash';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Terminal preview */}
      <div style={{ margin: '0 16px 4px' }}>
        <div style={{
          height: 76, borderRadius: 8,
          background: '#0d0d0d',
          border: '1px solid var(--border)',
          borderTop: '2px solid var(--cam-gold-leaf)',
          overflow: 'hidden', padding: '8px 12px',
          fontFamily: 'var(--font-mono)', fontSize: 12,
        }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', opacity: 0.8 }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', opacity: 0.8 }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', opacity: 0.8 }} />
          </div>
          <div style={{ color: 'var(--success)', fontWeight: 500 }}>
            {previewCmd}
            <span style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--success)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'pulse 1.2s step-end infinite', opacity: 0.9 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', marginTop: 4, fontSize: 12 }}>
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {env.category}
          </div>
        </div>
      </div>

      {/* Env name + badges */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <EnvIcon icon={env.icon} />
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{env.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {env.category.split(' · ').map((cat) => (
            <span key={cat} className="chip">{cat}</span>
          ))}
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: env.plan === 'free'
              ? 'color-mix(in oklab, var(--accent) 12%, transparent)'
              : 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)',
            border: `1px solid ${env.plan === 'free' ? 'color-mix(in oklab, var(--accent) 35%, transparent)' : 'color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)'}`,
            color: env.plan === 'free' ? 'var(--accent)' : 'var(--cam-gold-leaf-lt)',
          }}>
            {env.plan === 'free' ? 'Free' : 'Pro'}
          </span>
          {env.badge && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
              background: 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)',
              border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)',
              color: 'var(--cam-gold-leaf-lt)',
            }}>{env.badge}</span>
          )}
        </div>
      </div>

      <Divider />

      {/* Node topology */}
      <Section label={`Topology · ${nodes.length} node${nodes.length !== 1 ? 's' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
          {nodes.map((node, i) => (
            <div key={i} style={{
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, boxShadow: '0 0 4px var(--accent)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{node.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{node.role}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{node.mem}</span>
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {node.tools.map((t) => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {features.length > 0 && (
        <>
          <Divider />
          <Section label="Features">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingBottom: 4 }}>
              {features.map((f) => (
                <span key={f} className="chip">{f}</span>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Specs */}
      <Divider />
      <div style={{ padding: '12px 16px 16px' }}>
        <p className="text-eyebrow" style={{ marginBottom: 8 }}>Specs</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-caption">Duration</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>60 min</span>
          </div>
          {specs.totalMem && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-caption">Memory</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{specs.totalMem}</span>
            </div>
          )}
          {specs.bootTime && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-caption">Boot time</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{specs.bootTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentConfigPanel;
