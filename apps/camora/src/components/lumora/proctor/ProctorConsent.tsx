interface ProctorConsentProps {
  onStart: () => void;
  starting?: boolean;
}

export const ProctorConsent = ({ onStart, starting = false }: ProctorConsentProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-6" style={{ background: 'var(--bg-surface)' }}>
      <div
        className="rounded-xl p-8 text-center"
        style={{ maxWidth: '28rem', background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--text-primary)' }}
      >
        <div className="text-xl font-semibold mb-3">Proctored coding session</div>
        <p className="text-caption mb-4" style={{ color: 'var(--text-secondary)' }}>
          When you begin, this session enters fullscreen and monitors:
        </p>
        <ul className="text-caption text-left inline-block mb-6 space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li>📷 Webcam presence (your camera must stay on)</li>
          <li>👁️ Tab / window focus changes</li>
          <li>🖥️ Exiting fullscreen or a second monitor</li>
          <li>📋 Copy &amp; paste</li>
          <li>🛠️ Developer tools / automation</li>
        </ul>
        <button className="btn-primary w-full" onClick={onStart} disabled={starting}>
          {starting ? 'Starting…' : 'Start proctored session'}
        </button>
        <p className="text-caption mt-3" style={{ color: 'var(--text-secondary)' }}>
          Nothing is monitored until you start.
        </p>
      </div>
    </div>
  );
};
