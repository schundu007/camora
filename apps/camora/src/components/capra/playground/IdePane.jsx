import { useState } from 'react';

export default function IdePane({ ideUrl }) {
  const [loaded, setLoaded] = useState(false);

  if (!ideUrl) return null;

  return (
    <div style={{ width: '100%', height: '100%', background: '#1e1e1e', position: 'relative' }}>
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#1e1e1e',
        }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)',
            animation: 'spin 1s linear infinite', marginBottom: 14,
          }} />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Loading IDE...</p>
        </div>
      )}
      <iframe
        src={ideUrl}
        title="Camora IDE"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
      />
    </div>
  );
}
