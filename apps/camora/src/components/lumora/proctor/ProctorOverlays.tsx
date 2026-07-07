import { useProctor } from './ProctorProvider';

export const ProctorOverlays = () => {
  const { paused, blocked, resolveBlock } = useProctor();

  const returnToFullscreen = async () => {
    try { await document.documentElement.requestFullscreen(); } catch { /* user may deny */ }
    resolveBlock();
  };

  if (paused) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <div className="rounded-xl p-6 text-center" style={{ maxWidth: '24rem', background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--text-primary)' }}>
          <div className="text-lg font-semibold mb-2">📷 Session paused</div>
          <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>Your camera is off. Re-enable it to resume the session.</p>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <div className="rounded-xl p-6 text-center" style={{ maxWidth: '24rem', background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--text-primary)' }}>
          <div className="text-lg font-semibold mb-2">🖥️ Return to fullscreen</div>
          <p className="text-caption mb-4" style={{ color: 'var(--text-secondary)' }}>The assessment must stay in fullscreen.</p>
          <button className="btn-primary" onClick={returnToFullscreen}>Return to fullscreen</button>
        </div>
      </div>
    );
  }

  return null;
};
