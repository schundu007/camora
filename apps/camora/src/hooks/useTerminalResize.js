import { useEffect } from 'react';

export function useTerminalResize(containerRef, fitAddonRef, wsRef) {
  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!fitAddonRef.current) return;
      try {
        fitAddonRef.current.fit();
        const term = fitAddonRef.current._terminal;
        if (term && wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }));
        }
      } catch {
        // ignore fit errors during teardown
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, fitAddonRef, wsRef]);
}
