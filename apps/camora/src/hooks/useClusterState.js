import { useState, useEffect, useRef } from 'react';
import { getStoredToken } from '@/utils/tokenStore';

const API_URL = import.meta.env.VITE_PLAYGROUND_API_URL || import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3010';

export function useClusterState(sessionId, enabled) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const acRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !enabled) {
      setState(null);
      setError(null);
      return;
    }

    const ac = new AbortController();
    acRef.current = ac;

    const token = getStoredToken() || '';
    const url = `${API_URL}/api/v1/playground/sessions/${sessionId}/cluster-state`;

    (async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          credentials: 'include',
          signal: ac.signal,
        });
        if (!res.ok || !res.body) { setError(`HTTP ${res.status}`); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n\n');
          buf = parts.pop();
          for (const part of parts) {
            const line = part.split('\n').find(l => l.startsWith('data: '));
            if (!line) continue;
            try { setState(JSON.parse(line.slice(6))); } catch {}
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      }
    })();

    return () => { ac.abort(); };
  }, [sessionId, enabled]);

  return { state, error };
}
