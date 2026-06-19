import { useState, useRef } from 'react';
import TerminalPane from './TerminalPane';

export default function ClusterView({ session, onClose }) {
  const nodes = session?.nodes ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [termKeys, setTermKeys] = useState(() => nodes.map(() => 0));
  const termRefs = useRef([]);

  const activeNode = nodes[activeIndex];

  const handleReconnect = () => {
    setTermKeys(prev => prev.map((k, i) => (i === activeIndex ? k + 1 : k)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0a0a' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Node tab bar */}
      <div style={{
        flexShrink: 0, height: 36,
        display: 'flex', alignItems: 'center', padding: '0 8px', gap: 3,
        background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {nodes.map((node, i) => {
          const isActive = i === activeIndex;
          const isReady = node.status === 'ready';
          return (
            <button
              key={node.nodeIndex}
              type="button"
              onClick={() => setActiveIndex(i)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 6,
                background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? 'rgba(65,158,218,0.5)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 12, fontWeight: 600,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                fontFamily: '"IBM Plex Mono", monospace',
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isReady ? '#10b981' : 'rgba(255,255,255,0.2)',
                boxShadow: isReady ? '0 0 4px #10b981' : 'none',
                display: 'inline-block',
              }} />
              <span>{node.nodeName}</span>
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Reconnect button for active node */}
        <button
          type="button"
          onClick={handleReconnect}
          title="Reconnect terminal"
          style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
          }}
        >
          ↻ reconnect
        </button>

        {/* Cluster badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#419EDA', display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
            etcd cluster · {nodes.length} nodes
          </span>
        </div>
      </div>

      {/* Terminal pane for active node — mount all, show only active (keeps WebSocket alive) */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {nodes.map((node, i) => (
          <div
            key={node.nodeIndex}
            style={{
              position: 'absolute', inset: 0,
              display: i === activeIndex ? 'block' : 'none',
              background: '#0a0a0a',
            }}
          >
            {node.wsUrl ? (
              <TerminalPane
                key={termKeys[i]}
                ref={el => { termRefs.current[i] = el; }}
                wsUrl={node.wsUrl}
                initialFontSize={13}
              />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: 'rgba(255,255,255,0.2)', fontSize: 11,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                {node.status === 'provisioning' ? 'Node provisioning...' : 'Terminal unavailable'}
              </div>
            )}
          </div>
        ))}

        {nodes.length === 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'rgba(255,255,255,0.2)', fontSize: 11,
          }}>
            No cluster nodes available
          </div>
        )}
      </div>
    </div>
  );
}
