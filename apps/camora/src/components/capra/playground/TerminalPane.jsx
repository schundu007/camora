import 'xterm/css/xterm.css';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTerminalResize } from '@/hooks/useTerminalResize';

const TerminalPane = forwardRef(function TerminalPane({ sessionId, wsUrl, onOutput, initialFontSize = 13 }, ref) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  const [warning, setWarning] = useState(null);
  const [ended, setEnded] = useState(false);

  useTerminalResize(containerRef, fitAddonRef, wsRef);

  useImperativeHandle(ref, () => ({
    clear() {
      termRef.current?.clear();
    },
    copyAll() {
      if (!termRef.current) return;
      const buf = termRef.current.buffer.active;
      const lines = [];
      for (let i = 0; i < buf.length; i++) {
        lines.push(buf.getLine(i)?.translateToString(true) ?? '');
      }
      navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    },
    setFontSize(n) {
      if (!termRef.current) return;
      termRef.current.options.fontSize = n;
      fitAddonRef.current?.fit();
    },
    requestFullscreen() {
      const el = containerRef.current?.closest('[data-playground-terminal]');
      el?.requestFullscreen?.();
    },
  }), []);

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
        fontSize: initialFontSize,
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
    <div
      data-playground-terminal
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0a' }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {warning && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            pointerEvents: 'none',
          }}
        >
          {warning}
        </div>
      )}
    </div>
  );
});

export default TerminalPane;
