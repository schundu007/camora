import 'xterm/css/xterm.css';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTerminalResize } from '@/hooks/useTerminalResize';

// ttyd binary protocol (frames passed through raw by wsProxy):
//   Recv: binary frame, byte[0]='0'(0x30) output, '1' title, '2' prefs
//   Send on open: text JSON {"AuthToken":"","columns":N,"rows":N}
//   Send input:   binary, byte[0]=0x30, rest=keystrokes
//   Send resize:  binary, byte[0]=0x31, rest=JSON {"columns":N,"rows":N}

const TerminalPane = forwardRef(function TerminalPane({ wsUrl, onOutput, onExit, initialFontSize = 13 }, ref) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);

  useTerminalResize(containerRef, fitAddonRef, wsRef);

  useImperativeHandle(ref, () => ({
    clear() { termRef.current?.clear(); },
    copyAll() {
      if (!termRef.current) return;
      const buf = termRef.current.buffer.active;
      const lines = [];
      for (let i = 0; i < buf.length; i++) lines.push(buf.getLine(i)?.translateToString(true) ?? '');
      navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    },
    setFontSize(n) {
      if (!termRef.current) return;
      termRef.current.options.fontSize = n;
      fitAddonRef.current?.fit();
    },
    requestFullscreen() {
      containerRef.current?.closest('[data-playground-terminal]')?.requestFullscreen?.();
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current || !wsUrl) return;
    let disposed = false;

    async function init() {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      const { WebLinksAddon } = await import('xterm-addon-web-links');

      const term = new Terminal({
        theme: { background: '#0a0a0a', foreground: '#e4e4e4', cursor: '#2bb534', selectionBackground: 'rgba(43,181,52,0.3)' },
        fontFamily: 'var(--font-mono)',
        fontSize: initialFontSize,
        lineHeight: 1.4,
        cursorBlink: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      if (disposed) { term.dispose(); return; }
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;
      fitAddonRef.current = fitAddon;

      term.write('\x1b[90mConnecting to terminal...\x1b[0m\r\n');

      const ws = new WebSocket(wsUrl, ['tty']);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ AuthToken: '', columns: term.cols, rows: term.rows }));
        term.write('\x1b[90mHandshaking...\x1b[0m\r\n');
      };

      ws.onmessage = (e) => {
        const buf = e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : new TextEncoder().encode(e.data);
        if (buf[0] === 0x30) { // '0' = terminal output
          term.write(buf.slice(1));
          onOutput?.(new TextDecoder().decode(buf.slice(1)));
        }
        // 0x31='1' title, 0x32='2' prefs — ignore
      };

      ws.onerror = (e) => {
        const msg = e.message || 'WebSocket error';
        term.write(`\r\n\x1b[31m[Error: ${msg}]\x1b[0m\r\n`);
        console.error('[TerminalPane] ws error', e);
      };

      ws.onclose = (e) => {
        if (disposed) return;
        console.warn('[TerminalPane] ws closed', e.code, e.reason);
        // Code 1000 = clean shell exit (user typed `exit`/`logout`)
        if (e.code === 1000) {
          onExit?.();
          return;
        }
        const reason = e.reason ? ` (${e.reason})` : '';
        term.write(`\r\n\x1b[33m[Disconnected: code ${e.code}${reason}]\x1b[0m\r\n`);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          const enc = new TextEncoder().encode(data);
          const frame = new Uint8Array(1 + enc.length);
          frame[0] = 0x30; // '0' = input
          frame.set(enc, 1);
          ws.send(frame);
        }
      });
    }

    init();
    return () => {
      disposed = true;
      termRef.current?.dispose(); termRef.current = null;
      wsRef.current?.close(); wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [wsUrl]);

  return (
    <div data-playground-terminal style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0a' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
});

export default TerminalPane;
