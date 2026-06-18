import { useEffect } from 'react';

export function useTerminalResize(containerRef, fitAddonRef, wsRef) {
  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!fitAddonRef.current) return;
      try {
        fitAddonRef.current.fit();
        const term = fitAddonRef.current._terminal;
        const ws = wsRef?.current;
        if (!term || !ws) return;

        // Support both raw WebSocket and our wsRef wrapper
        const rawWs = ws._ws || ws;
        if (rawWs.readyState !== WebSocket.OPEN) return;

        // ttyd resize: binary frame, first byte '1', rest = JSON {"columns":N,"rows":N}
        const json = JSON.stringify({ columns: term.cols, rows: term.rows });
        const encoded = new TextEncoder().encode(json);
        const frame = new Uint8Array(1 + encoded.length);
        frame[0] = 0x31; // '1'
        frame.set(encoded, 1);
        rawWs.send(frame);
      } catch {
        // ignore fit errors during teardown
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, fitAddonRef, wsRef]);
}
