import { useState, useCallback, useRef } from 'react';
import TerminalPane from './TerminalPane';

const DEFAULT_TERM_H = 220;
const MIN_TERM_H = 80;
const MAX_TERM_H = 480;

export default function IdePane({ ideUrl, wsUrl }) {
  const [loaded, setLoaded] = useState(false);
  const [termH, setTermH] = useState(DEFAULT_TERM_H);
  const [termKey, setTermKey] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = termH;
    const onMove = (mv) => setTermH(Math.max(MIN_TERM_H, Math.min(MAX_TERM_H, startH + (startY - mv.clientY))));
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    setDragging(true);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [termH]);

  if (!ideUrl) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#1e1e1e' }}>

      {/* VS Code iframe */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
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
        {dragging && <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'ns-resize' }} />}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onDividerMouseDown}
        style={{ flexShrink: 0, height: 5, background: 'rgba(255,255,255,0.06)', cursor: 'ns-resize', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      >
        <div style={{ width: 32, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
      </div>

      {/* Integrated terminal panel */}
      <div style={{ flexShrink: 0, height: termH, display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
        <div style={{
          flexShrink: 0, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px', background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Terminal</span>
          <button
            type="button" onClick={() => setTermKey(k => k + 1)} title="Reconnect"
            style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
          >↻ reconnect</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {wsUrl
            ? <TerminalPane key={termKey} wsUrl={wsUrl} initialFontSize={12} />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Terminal unavailable</div>
          }
        </div>
      </div>
    </div>
  );
}
