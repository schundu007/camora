import { ENVIRONMENTS, EnvIcon } from './EnvironmentPicker';

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SavedVmsPanel({ saves, slotsUsed, slotsMax, onRestore, onDelete, savesLoading, restoringId }) {
  if (slotsMax === 0) return null;

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Saved VMs
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{slotsUsed}/{slotsMax} slots</span>
      </div>

      {savesLoading && saves.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>Loading...</div>
      )}

      {!savesLoading && saves.length === 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: 8, fontSize: 12, textAlign: 'center',
          background: 'var(--bg-surface)', border: '1px dashed var(--border)',
          color: 'var(--text-secondary)',
        }}>
          No saved VMs yet. Use "Save VM" while a session is running.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {saves.map(save => {
          const env = ENVIRONMENTS.find(e => e.id === save.environment) || ENVIRONMENTS[0];
          const isRestoring = restoringId === save.id;
          return (
            <div key={save.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}><EnvIcon icon={env.icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {save.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {env.label} · {fmtSize(save.sizeBytes)} · {fmtDate(save.createdAt)}
                </div>
              </div>
              <button type="button" disabled={isRestoring} onClick={() => onRestore(save.id)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: isRestoring ? 'rgba(212,160,67,0.3)' : 'rgba(212,160,67,0.15)',
                border: '1px solid rgba(212,160,67,0.4)', color: '#d4a043',
                cursor: isRestoring ? 'not-allowed' : 'pointer',
              }}>
                {isRestoring ? 'Restoring...' : '↩ Restore'}
              </button>
              <button type="button" onClick={() => onDelete(save.id)} disabled={isRestoring} style={{
                padding: '4px 8px', borderRadius: 5, fontSize: 12, flexShrink: 0,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', cursor: isRestoring ? 'not-allowed' : 'pointer',
              }} data-tip="Delete saved VM">Del</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
