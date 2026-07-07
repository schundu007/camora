import { useProctor } from './ProctorProvider';
import type { Severity } from './types';

const SEV_BADGE: Record<Severity, string> = {
  info: 'badge badge-muted',
  low: 'badge badge-muted',
  medium: 'badge badge-gold',
  high: 'badge badge-danger',
};

const LABEL: Record<string, string> = {
  TAB_HIDDEN: '👁️ Left tab',
  WINDOW_BLUR: '👁️ Window lost focus',
  FULLSCREEN_EXIT: '🖥️ Exited fullscreen',
  COPY: '📋 Copied',
  PASTE: '📋 Pasted',
  MULTI_MONITOR: '🖥️ Second monitor',
  CAMERA_OFF: '📷 Camera off',
  DEVTOOLS: '🛠️ DevTools',
  AUTOMATION: '🤖 Automation',
  UNSUPPORTED: 'ℹ️ Signal unavailable',
};

export const ProctorTimeline = () => {
  const { events, riskScore } = useProctor();
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-eyebrow" style={{ color: 'var(--text-secondary)' }}>Proctor timeline</span>
        <span className={riskScore >= 20 ? 'badge badge-danger' : 'badge badge-muted'}>
          Risk {riskScore}
        </span>
      </div>
      <ul className="space-y-1 max-h-64 overflow-y-auto">
        {events.length === 0 && (
          <li className="text-caption" style={{ color: 'var(--text-secondary)' }}>No events recorded.</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between text-caption" style={{ color: 'var(--text-primary)' }}>
            <span>{LABEL[e.type] ?? e.type}</span>
            <span className={SEV_BADGE[e.severity]}>{e.severity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
