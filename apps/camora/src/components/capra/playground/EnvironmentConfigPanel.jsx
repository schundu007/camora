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

const EnvironmentConfigPanel = ({ env }) => {
  if (!env) return null;

  const nodes = env.nodes || [{ name: env.id, role: 'Node', mem: '512 MB', tools: ['Terminal', 'IDE'] }];
  const features = env.features || [];
  const specs = env.specs || {};
  const previewCmd = TERMINAL_PREVIEWS[env.id] || '$ bash';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Terminal preview */}
      <div style={{ margin: '0 16px 14px', flexShrink: 0 }}>
        <div style={{
          height: 78, borderRadius: 8, background: '#0a0a0a',
          border: '1px solid var(--border)', borderTop: '3px solid var(--cam-gold-leaf)',
          overflow: 'hidden', padding: '7px 10px',
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#e4e4e4',
        }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div style={{ color: '#10b981' }}>{previewCmd}<span style={{ animation: 'pulse 1.2s step-end infinite' }}>▊</span></div>
          <div style={{ color: 'rgba(255,255,255,0.25)', marginTop: 4, fontSize: 11 }}>
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {env.category}
          </div>
        </div>
      </div>

      {/* Env name + badges */}
      <div style={{ padding: '0 16px', marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <EnvIcon icon={env.icon} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{env.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {env.category.split(' · ').map((cat) => (
            <span key={cat} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
              background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
            }}>{cat}</span>
          ))}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
            background: env.plan === 'free'
              ? 'color-mix(in oklab, var(--accent) 10%, transparent)'
              : 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)',
            color: env.plan === 'free' ? 'var(--accent)' : 'var(--cam-gold-leaf-lt)',
          }}>
            {env.plan === 'free' ? 'Free' : 'Pro'}
          </span>
          {env.badge && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
              background: 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)',
              border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)',
              color: 'var(--cam-gold-leaf-lt)',
            }}>{env.badge}</span>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 16px 10px', flexShrink: 0 }} />

      {/* Node topology */}
      <div style={{ padding: '0 16px', flexShrink: 0 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-secondary)', marginBottom: 8,
        }}>
          Topology · {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {nodes.map((node, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 8px', borderRadius: 6,
              background: 'var(--bg-base)', border: '1px solid var(--border)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}>{node.name}</span>
                  <span style={{
                    fontSize: 11, padding: '1px 4px', borderRadius: 2,
                    background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600,
                  }}>{node.role}</span>
                </div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {node.tools.map((t) => (
                    <span key={t} style={{
                      fontSize: 11, padding: '1px 4px', borderRadius: 2, fontWeight: 600,
                      background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              <span style={{
                fontSize: 11, color: 'var(--text-secondary)',
                fontFamily: '"IBM Plex Mono", monospace', flexShrink: 0,
              }}>{node.mem}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 16px 10px', flexShrink: 0 }} />
          <div style={{ padding: '0 16px', flexShrink: 0 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>Features</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {features.map((f) => (
                <span key={f} style={{
                  fontSize: 11, padding: '2px 6px', borderRadius: 3,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}>{f}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Specs footer */}
      <div style={{ marginTop: 'auto', padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Duration</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"IBM Plex Mono", monospace' }}>60 min</span>
          </div>
          {specs.totalMem && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Memory</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"IBM Plex Mono", monospace' }}>{specs.totalMem}</span>
            </div>
          )}
          {specs.bootTime && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Boot time</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"IBM Plex Mono", monospace' }}>{specs.bootTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentConfigPanel;
