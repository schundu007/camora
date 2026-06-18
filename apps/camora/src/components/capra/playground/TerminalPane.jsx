import { useEffect, useRef, useState } from 'react';
import { useTerminalResize } from '@/hooks/useTerminalResize';
import 'xterm/css/xterm.css';

export default function TerminalPane({ sessionId, wsUrl, onOutput }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  const [warning, setWarning] = useState(null);
  const [ended, setEnded] = useState(false);

  useTerminalResize(containerRef, fitAddonRef, wsRef);

  useEffect(() => {
    if (!containerRef.current || !wsUrl) return;
    let term;
    let ws;
    let disposed = false;

    async function init() {

      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      const { WebLinksAddon } = await import('xterm-addon-web-links');
      const { SearchAddon } = await import('xterm-addon-search');

      term = new Terminal({
        theme: {
          background: '#0a0a0a',
          foreground: '#e4e4e4',
          cursor: '#10b981',
          selectionBackground: 'rgba(16, 185, 129, 0.3)',
        },
        fontFamily: '"IBM Plex Mono", "Cascadia Code", "Fira Mono", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        scrollback: 5000,
        allowTransparency: false,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(searchAddon);

      if (disposed) { term.dispose(); return; }
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;
      fitAddonRef.current = fitAddon;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'output') {
            term.write(msg.data);
            onOutput?.(msg.data);
          } else if (msg.type === 'warning') {
            const mins = Math.ceil((msg.remaining || 0) / 60);
            setWarning(`Session expires in ${mins} minute${mins !== 1 ? 's' : ''}`);
            setTimeout(() => setWarning(null), 8000);
          } else if (msg.type === 'destroyed') {
            term.write('\r\n\x1b[33m[Session ended]\x1b[0m\r\n');
            setEnded(true);
            ws.close();
          }
        } catch {
          // non-JSON: write raw
          term.write(e.data);
          onOutput?.(e.data);
        }
      };

      ws.onerror = () => {
        term.write('\r\n\x1b[31m[Connection error]\x1b[0m\r\n');
      };

      ws.onclose = () => {
        if (!disposed) {
          term.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
        }
      };

      term.onData((data) => {
        if (!ended && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });
    }

    init();

    return () => {
      disposed = true;
      if (termRef.current) { termRef.current.dispose(); termRef.current = null; }
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      fitAddonRef.current = null;
    };
  }, [wsUrl]);

  return (
    <div className="relative w-full h-full" style={{ background: '#0a0a0a' }}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 0 }} />
      {warning && (
        <div
          className="absolute top-3 right-3 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
          }}
        >
          {warning}
        </div>
      )}
    </div>
  );
}
